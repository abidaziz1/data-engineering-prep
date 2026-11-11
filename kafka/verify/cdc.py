"""Mission 10: change data capture. PostgreSQL 16 with logical decoding, the Debezium PostgreSQL connector on the Kafka Connect worker of the distribution, and a topic of change events.

What is real: the database, the replication slot, the connector (Debezium 3.7.1.Final from Maven Central), the events in the topics, the WAL that the slot holds back.
What is a stand-in: nothing in the data path. The database is small and made up, and nothing is timed.
"""
import json
import os
import pathlib
import re
import signal
import time

import cluster as C
import kx
from connect import Worker, wait_count
from postgres import Pg

DBZ = os.environ.get('DEBEZIUM_PLUGINS', '')          # the folder that holds debezium-connector-postgres/
FLAT_MSG = 'io.debezium.transforms.ExtractNewRecordState'


def connector_config(pg, prefix, slot, extra=None):
    cfg = {'connector.class': 'io.debezium.connector.postgresql.PostgresConnector', 'tasks.max': '1',
           'database.hostname': 'localhost', 'database.port': str(pg.port), 'database.user': 'debezium', 'database.password': 'not-a-real-password', 'database.dbname': 'brewline',
           'topic.prefix': prefix, 'table.include.list': 'public.customers,public.orders', 'plugin.name': 'pgoutput', 'slot.name': slot,
           'publication.name': 'dbz_publication', 'publication.autocreate.mode': 'disabled', 'snapshot.mode': 'initial',
           'key.converter': 'org.apache.kafka.connect.json.JsonConverter', 'key.converter.schemas.enable': 'false',
           'value.converter': 'org.apache.kafka.connect.json.JsonConverter', 'value.converter.schemas.enable': 'false'}
    cfg.update(extra or {})
    return cfg


def clean_event(raw):
    """A change event as a Python value, with the numbers that differ from run to run replaced by a marker."""
    if raw is None:
        return None
    ev = json.loads(raw)
    src = ev.get('source') or {}
    for k in ('ts_ms', 'ts_us', 'ts_ns', 'lsn', 'txId', 'sequence', 'xmin'):
        if k in src:
            src[k] = '<' + k + '>'
    for k in ('ts_ms', 'ts_us', 'ts_ns'):
        if k in ev:
            ev[k] = '<' + k + '>'
    if 'transaction' in ev:
        ev.pop('transaction')
    return ev


def events(c, topic, n, timeout=60):
    msgs = wait_count(c, topic, n, timeout)
    return [(m[2], m[3]) for m in msgs]


def pretty(ev):
    return json.dumps(ev, indent=2, sort_keys=False)


def slot_row(pg):
    r = pg.psql("select slot_name, plugin, active, wal_status from pg_replication_slots order by slot_name;")
    return [x.split('|') for x in r.splitlines()]


def retained_bytes(pg, slot):
    """The WAL that the slot forces PostgreSQL to keep: from the oldest position that it may still need (restart_lsn) to the end of the log."""
    return int(pg.psql("select pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)::bigint from pg_replication_slots where slot_name='%s';" % slot))


def backlog_bytes(pg, slot):
    """The changes that the connector has not confirmed yet: from confirmed_flush_lsn to the end of the log."""
    return int(pg.psql("select pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)::bigint from pg_replication_slots where slot_name='%s';" % slot))


def record_cdc(c, rec):
    assert DBZ and pathlib.Path(DBZ, 'debezium-connector-postgres').exists(), 'set DEBEZIUM_PLUGINS to the folder that holds debezium-connector-postgres/'
    kx.delete_topics(c.bootstrap, ['connect-offsets', 'connect-configs', 'connect-status'])
    pg = Pg().start()
    plugin_path = str(C.check_home() / 'libs' / ('connect-file-%s.jar' % C.version())) + ',' + DBZ
    w = Worker(c, name='cdc', group='cdc-demo', extra={'plugin.path': plugin_path, 'offset.flush.interval.ms': 2000}).start()
    try:
        run(c, rec, pg, w)
    finally:
        w.stop()
        pg.stop()


def run(c, rec, pg, w):
    # ---- the database ----
    pg.psql("""
      CREATE ROLE debezium WITH LOGIN REPLICATION PASSWORD 'not-a-real-password';
      CREATE TABLE customers (customer_id int PRIMARY KEY, name text NOT NULL, email text);
      CREATE TABLE orders (order_id int PRIMARY KEY, store_id text NOT NULL, customer_id int REFERENCES customers, total_cents int NOT NULL, status text NOT NULL);
      INSERT INTO customers VALUES (1000, 'Ana', 'ana@example.com'), (1007, 'Bo', 'bo@example.com'), (1014, 'Cy', NULL);
      INSERT INTO orders VALUES (1, 's01', 1000, 300, 'refunded'), (2, 's02', 1007, 337, 'paid'), (3, 's07', 1014, 374, 'paid'), (4, 's01', NULL, 411, 'paid'), (5, 's04', 1000, 448, 'paid');
      GRANT SELECT ON ALL TABLES IN SCHEMA public TO debezium;
      CREATE PUBLICATION dbz_publication FOR TABLE customers, orders;""", tuples=False)
    rec.text('cdc.publication', pg.psql("select pubname, tablename from pg_publication_tables order by tablename;").replace('|', '  '))
    rec.counts('cdc.database', {'version': pg.psql('show server_version;').split(' ')[0], 'wal_level': pg.psql('show wal_level;'), 'customers': 3, 'orders': 5,
                                'replica_identity_of_orders': {'d': 'default (primary key)', 'f': 'full', 'n': 'nothing', 'i': 'index'}[pg.psql("select relreplident from pg_class where relname='orders';")]})

    # ---- the connector and the snapshot ----
    code, resp = w.create('orders-cdc', connector_config(pg, 'brewline', 'brewline_slot'))
    assert code == 201, resp
    w.wait_state('orders-cdc')
    snap = events(c, 'brewline.public.orders', 5)
    cust = events(c, 'brewline.public.customers', 3)
    topics = sorted(t for t in kx.admin(c.bootstrap).list_topics(timeout=10).topics if t.startswith('brewline.'))
    rec.counts('cdc.snapshot', {'topics': topics, 'order_events': len(snap), 'customer_events': len(cust), 'ops': sorted({clean_event(v)['op'] for k, v in snap}),
                                'snapshot_flags': sorted({str(clean_event(v)['source']['snapshot']) for k, v in snap}), 'keys': [json.loads(k) for k, v in snap][:2]})
    rec.text('cdc.event_snapshot', pretty(clean_event(snap[0][1])))
    rec.table('cdc.slots', ['slot', 'plugin', 'active', 'wal status'], slot_row(pg))

    # ---- changes ----
    pg.psql("INSERT INTO orders VALUES (6, 's03', 1007, 520, 'paid');")
    pg.psql("UPDATE orders SET status = 'refunded' WHERE order_id = 2;")
    pg.psql("DELETE FROM orders WHERE order_id = 3;")
    ev = events(c, 'brewline.public.orders', 5 + 4)           # insert, update, delete, and the tombstone that follows the delete
    changes = ev[5:]
    rows = []
    sql = ['INSERT order 6', "UPDATE order 2 SET status='refunded'", 'DELETE order 3', '(after the delete)']
    for s, (k, v) in zip(sql, changes):
        e = clean_event(v)
        rows.append([s, json.loads(k)['order_id'], e['op'] if e else 'none: the value is null', json.dumps(e['before']) if e and e.get('before') is not None else 'null',
                     json.dumps(e['after']) if e and e.get('after') is not None else 'null'])
    rec.table('cdc.changes', ['what happened in the database', 'key', 'op', 'before', 'after'], rows)
    rec.text('cdc.event_update', pretty(clean_event(changes[1][1])))
    rec.counts('cdc.delete_tombstone', {'events_for_the_delete': 2, 'second_record_has_the_same_key': changes[3][0] == changes[2][0], 'second_record_value': changes[3][1]})

    # ---- replica identity full: the old row is part of an update ----
    pg.psql("ALTER TABLE orders REPLICA IDENTITY FULL;")
    pg.psql("UPDATE orders SET total_cents = 360 WHERE order_id = 1;")
    ev = events(c, 'brewline.public.orders', 5 + 4 + 1)
    e = clean_event(ev[-1][1])
    rec.counts('cdc.replica_identity_full', {'op': e['op'], 'before': e['before'], 'after': e['after']})

    # ---- the table changes shape ----
    pg.psql("ALTER TABLE orders ADD COLUMN channel text DEFAULT 'app';")
    pg.psql("UPDATE orders SET channel = 'web' WHERE order_id = 4;")
    ev = events(c, 'brewline.public.orders', 5 + 4 + 1 + 1)
    e = clean_event(ev[-1][1])
    rec.counts('cdc.new_column', {'op': e['op'], 'columns_before': sorted(e['before']), 'columns_after': sorted(e['after']), 'new_column_in_after': 'channel' in e['after']})

    # ---- a flat view of the same changes: the unwrap transform ----
    code, resp = w.create('orders-flat', connector_config(pg, 'flat', 'brewline_flat', {
        'transforms': 'unwrap', 'transforms.unwrap.type': FLAT_MSG, 'transforms.unwrap.delete.tombstone.handling.mode': 'rewrite', 'transforms.unwrap.add.fields': 'op,table',
        'table.include.list': 'public.orders'}))
    assert code == 201, resp
    w.wait_state('orders-flat')
    flat = wait_count(c, 'flat.public.orders', 5)
    pg.psql("UPDATE orders SET status = 'paid' WHERE order_id = 2;")
    pg.psql("DELETE FROM orders WHERE order_id = 4;")
    wait_count(c, 'flat.public.orders', 5 + 2)
    time.sleep(4)
    flat = kx.read_all(c.bootstrap, 'flat.public.orders')
    lines = [json.dumps(json.loads(m[3]), separators=(',', ':')) if m[3] else 'null' for m in flat]
    rec.text('cdc.flat_events', '\n'.join(lines[5:]))
    rec.counts('cdc.flat', {'records': len(flat), 'snapshot_records': 5, 'live_records': len(flat) - 5, 'tombstones': sum(1 for m in flat if m[3] is None)})
    rec.table('cdc.slots_two', ['slot', 'plugin', 'active', 'wal status'], slot_row(pg))

    # ---- the replication slot holds back WAL while the connector is not reading ----
    time.sleep(3)
    base = backlog_bytes(pg, 'brewline_slot')
    w.api('PUT', '/connectors/orders-cdc/stop')
    time.sleep(3)
    inactive = pg.psql("select active from pg_replication_slots where slot_name='brewline_slot';")
    pg.psql("INSERT INTO orders SELECT 1000 + g, 's0' || (1 + g % 9), 1000, 300 + g % 500, 'paid', 'app' FROM generate_series(1, 20000) g;", db='brewline')
    pg.psql("UPDATE orders SET total_cents = total_cents + 1 WHERE order_id > 1000;")
    held, backlog = retained_bytes(pg, 'brewline_slot'), backlog_bytes(pg, 'brewline_slot')
    have = len(kx.read_all(c.bootstrap, 'brewline.public.orders'))
    w.api('PUT', '/connectors/orders-cdc/resume')
    w.wait_state('orders-cdc')
    wait_count(c, 'brewline.public.orders', have + 40000, timeout=240)
    t0 = time.time()
    while time.time() - t0 < 90:
        pg.psql("CHECKPOINT;")
        pg.psql("UPDATE customers SET email = email WHERE customer_id = 1000;")          # a little activity lets the slot move its restart position
        time.sleep(4)
        after, backlog_after = retained_bytes(pg, 'brewline_slot'), backlog_bytes(pg, 'brewline_slot')
        if after < 1_000_000:
            break
    rec.counts('cdc.wal_held_back', {'slot_active_while_stopped': inactive, 'backlog_bytes_before_the_stop': base, 'backlog_bytes_while_stopped': backlog, 'bytes_the_slot_forces_postgres_to_keep': held,
                                     'backlog_bytes_after_the_connector_caught_up': backlog_after, 'bytes_kept_after_catching_up': after, 'rows_changed_while_stopped': 40000,
                                     'more_than_1_mb_held': held > 1_000_000, 'backlog_is_small_after_catching_up': backlog_after < 100_000, 'kept_is_small_after_catching_up': after < 1_000_000,
                                     'wal_segment_bytes': 16 * 1024 * 1024})

    # ---- a crash: the connector delivers at least once ----
    # the worker is restarted with a long flush interval (ten minutes, the default is one minute), so that the offsets of what it delivers are not written before it dies
    w.stop()
    extra = dict(w.extra, **{'offset.flush.interval.ms': 600000})
    w1 = Worker(c, name='cdc', group='cdc-demo', extra=extra).start()
    w1.wait_state('orders-cdc', timeout=90)
    time.sleep(3)
    before = len(kx.read_all(c.bootstrap, 'brewline.public.orders'))
    pg.psql("UPDATE orders SET status = 'ready' WHERE order_id IN (1, 2, 5, 6);")
    wait_count(c, 'brewline.public.orders', before + 4)
    os.killpg(w1.proc.pid, signal.SIGKILL)              # the worker dies before it wrote the offsets of those four events
    time.sleep(2)
    w2 = Worker(c, name='cdc', group='cdc-demo', extra=extra).start()
    w.proc = w2.proc
    try:
        w2.wait_state('orders-cdc', timeout=90)
        time.sleep(15)
        allv = kx.read_all(c.bootstrap, 'brewline.public.orders')
        seen = {}
        for m in allv:
            if m[3]:
                e = json.loads(m[3])
                if e['op'] in ('u', 'c', 'd'):
                    seen.setdefault((e['source']['lsn'], m[2]), []).append(m[1])
        dup = {k: v for k, v in seen.items() if len(v) > 1}
        rec.counts('cdc.at_least_once', {'records_before_the_crash': before + 4, 'records_after_the_restart': len(allv), 'events_of_the_last_four_updates': 4,
                                         'events_delivered_twice': len(dup), 'extra_records': len(allv) - (before + 4)})
    finally:
        w2.stop()
