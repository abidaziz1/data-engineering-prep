"""Mission 5: connectors. Kafka as a source and a sink, a table that follows a key, files that are committed by a checkpoint, and change data capture from a real PostgreSQL.

Everything is read from the real thing: the Kafka connector 5.0.0-2.2 on a real Kafka broker, the filesystem connector, the Flink CDC PostgreSQL connector 3.7.0-2.2 and a PostgreSQL 16 server.
"""
import json
import os
import pathlib
import re
import time

import fcluster as F
import fx
import kx

SETUP = """SET 'parallelism.default' = '1';
SET 'sql-client.execution.result-mode' = 'tableau';
SET 'execution.runtime-mode' = 'streaming';
"""
FULL_COLS = "order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, channel STRING"


def kafka_ddl(name, topic, boot, cols, extra=None, group='connect'):
    opts = {'connector': 'kafka', 'topic': topic, 'properties.bootstrap.servers': boot, 'properties.group.id': group, 'format': 'json', 'scan.bounded.mode': 'latest-offset'}
    opts.update(extra or {})
    return 'CREATE TEMPORARY TABLE %s (%s) WITH (%s);\n' % (name, cols, ', '.join("'%s' = '%s'" % kv for kv in opts.items()))


def select(f, script, name):
    rc, out, err = f.sql(SETUP + script, name=name)
    ts = fx.tables(out)
    if rc or not ts:
        raise RuntimeError('%s:\n%s\n%s' % (name, F.strip_ansi(out)[-3000:], err[-1500:]))
    return ts[-1]


def record_startup(f, kc, rec):
    boot = kc.bootstrap
    fx.fresh_topic(kx, boot, 'orders_c', partitions=2, config={'retention.ms': '-1'})      # the made-up times are in the past: keep the records
    p = kx.producer(boot)
    sent, placed = kx.send(p, 'orders_c', 12)              # twelve orders, with the event times of the Kafka course: one second apart
    per = {}
    for part, off in placed:
        per[part] = per.get(part, 0) + 1
    rec.counts('connect.topic', {'orders': 12, 'partitions': 2, 'orders_per_partition': {str(k): v for k, v in sorted(per.items())}})
    t_ms = kx.T0 + 6 * 1000          # the time of order 7
    modes = [('earliest-offset', {}), ('latest-offset', {}), ('timestamp', {'scan.startup.timestamp-millis': str(t_ms)}),
             ('specific-offsets', {'scan.startup.specific-offsets': 'partition:0,offset:%d;partition:1,offset:%d' % (per.get(0, 0) - 2, per.get(1, 0) - 2)})]
    rows = []
    for mode, extra in modes:
        t = select(f, kafka_ddl('orders', 'orders_c', boot, FULL_COLS, dict(extra, **{'scan.startup.mode': mode})) + 'SELECT COUNT(*) AS rows_read FROM orders;', 'connect_' + mode)
        what = {'earliest-offset': 'from the first record of every partition', 'latest-offset': 'from the end of every partition: only records that arrive later',
                'timestamp': 'from the first record at or after 00:00:06 on every partition (the time of order 7)', 'specific-offsets': 'from the second to last record of each partition'}[mode]
        rows.append([mode, what, int(t['rows'][-1][1]) if t['rows'] else 0])         # a streaming COUNT(*) prints nothing at all when no row arrived
    rec.table('connect.startup_modes', ['scan.startup.mode', 'where the source starts', 'rows a query reads'], rows)
    # the metadata of a record: partition, offset and the time that the producer gave it
    t = select(f, kafka_ddl('orders', 'orders_c', boot, FULL_COLS + ", part INT METADATA FROM 'partition' VIRTUAL, off BIGINT METADATA FROM 'offset' VIRTUAL, kts TIMESTAMP_LTZ(3) METADATA FROM 'timestamp' VIRTUAL",
                                      {'scan.startup.mode': 'earliest-offset'}) + "SET 'table.local-time-zone' = 'UTC';\nSELECT order_id, store_id, part, off, kts FROM orders WHERE order_id <= 6;", 'connect_meta')
    rec.table('connect.metadata', ['order_id', 'store_id', 'partition', 'offset', 'Kafka timestamp'], sorted([r[1:] for r in t['rows']], key=lambda r: int(r[0])))


def record_upsert(f, kc, rec):
    """A changelog written to a topic with a key: updates replace, a delete is a record with no value."""
    boot = kc.bootstrap
    path = fx.write_jsonl(f.work / 'data' / 'orders12.jsonl', [fx.order(i) for i in range(12)])
    fx.fresh_topic(kx, boot, 'stores_per_count', partitions=1)
    script = (SETUP + "CREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, channel STRING) WITH ('connector' = 'filesystem', 'path' = 'file://%s', 'format' = 'json');\n" % path
              + "CREATE TEMPORARY TABLE stores_per_count (n BIGINT, stores BIGINT, PRIMARY KEY (n) NOT ENFORCED) WITH ('connector' = 'upsert-kafka', 'topic' = 'stores_per_count', "
              "'properties.bootstrap.servers' = '%s', 'key.format' = 'json', 'value.format' = 'json');\n" % boot
              + "INSERT INTO stores_per_count SELECT n, COUNT(*) AS stores FROM (SELECT store_id, COUNT(*) AS n FROM orders GROUP BY store_id) GROUP BY n;")
    jid, out = fx.submit(f, script, name='connect_upsert')
    f.wait_state(jid, 'FINISHED')
    time.sleep(2)
    rows = kx.read_all(boot, 'stores_per_count', timeout=15)
    out_rows = [[o, json.loads(k)['n'] if k else None, v if v is not None else 'null (a tombstone)'] for _, o, k, v, _ in rows]
    rec.table('connect.upsert_topic', ['offset', 'key', 'value'], out_rows)
    changelog = 25            # the rows of the changelog of this query in the SQL mission: 6 +I, 8 -U, 8 +U, 3 -D
    rec.counts('connect.upsert_summary', {'records_in_the_topic': len(rows), 'tombstones': sum(1 for r in rows if r[3] is None), 'changelog_rows_of_the_query': changelog,
                                          'retractions_not_written': changelog - len(rows)})


def record_files(f, kc, rec):
    """A filesystem sink: files are written as hidden in-progress files and become visible when a checkpoint completes."""
    out_dir = f.work / 'data' / 'out'
    script = (SETUP.replace("'parallelism.default' = '1'", "'parallelism.default' = '1'") + "SET 'execution.checkpointing.interval' = '8 s';\n"
              "CREATE TEMPORARY TABLE src (order_id BIGINT, store_id STRING, total_cents INT) WITH ('connector' = 'datagen', 'rows-per-second' = '20', 'fields.order_id.min' = '1', 'fields.order_id.max' = '1000000', "
              "'fields.store_id.length' = '2', 'fields.total_cents.min' = '300', 'fields.total_cents.max' = '800');\n"
              "CREATE TEMPORARY TABLE sink (order_id BIGINT, store_id STRING, total_cents INT) WITH ('connector' = 'filesystem', 'path' = 'file://%s', 'format' = 'csv');\n" % out_dir
              + "INSERT INTO sink SELECT * FROM src;")
    jid, out = fx.submit(f, script, name='connect_files')
    f.wait_state(jid, 'RUNNING')

    def listing():
        return sorted([x.name for x in out_dir.rglob('*') if x.is_file()]) if out_dir.exists() else []

    def norm(names):
        return [re.sub(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '<uuid>', n) for n in names]
    t0 = time.time()
    before = []
    while time.time() - t0 < 6:                                   # before the first checkpoint completes
        before = listing()
        if before:
            break
        time.sleep(0.3)
    n_cp0 = f.checkpoints(jid)['counts']['completed']
    f.wait_checkpoints(jid, 2)
    time.sleep(1)
    after = listing()
    rec.counts('connect.files', {'before_the_first_checkpoint': norm(before), 'after_checkpoints': norm(after), 'checkpoints_completed_at_the_first_look': n_cp0, 'checkpoint_interval_seconds': 8,
                                 'hidden_before': all(n.startswith('.') for n in before) if before else None, 'visible_after': any(not n.startswith('.') for n in after)})
    rows = sum(1 for n in after if not n.startswith('.') for _ in open(out_dir / n))
    rec.counts('connect.files_rows', {'rows_in_visible_files': rows})
    f.cancel(jid)


def record_connect(f, kc, rec):
    f.cancel_all()
    f.wait_idle()
    only = os.environ.get('CONNECT_ONLY', 'startup,upsert,files,cdc').split(',')
    if 'startup' in only:
        record_startup(f, kc, rec)
    if 'upsert' in only:
        record_upsert(f, kc, rec)
    if 'files' in only:
        record_files(f, kc, rec)
    if 'cdc' in only:
        record_cdc(f, kc, rec)


# ---- change data capture ------------------------------------------------------------------------------------------------------------------------------
CDC_JAR = pathlib.Path(os.environ.get('FLINK_CDC_JAR', '')) if os.environ.get('FLINK_CDC_JAR') else None
DBZ = os.environ.get('DEBEZIUM_PLUGINS', '')


def pg_orders(pg, replica_full=False):
    pg.psql("""CREATE TABLE orders (order_id int PRIMARY KEY, store_id text NOT NULL, customer_id int, total_cents int NOT NULL, status text NOT NULL);
      INSERT INTO orders VALUES (1, 's01', 1000, 300, 'refunded'), (2, 's02', 1007, 337, 'paid'), (3, 's07', 1014, 374, 'paid'), (4, 's01', NULL, 411, 'paid'), (5, 's04', 1028, 448, 'paid');
      CREATE PUBLICATION dbz_publication FOR TABLE orders;""" + ("\n      ALTER TABLE orders REPLICA IDENTITY FULL;" if replica_full else ''), tuples=False)


def changes(pg):
    pg.psql("INSERT INTO orders VALUES (6, 's03', 1007, 520, 'paid');")
    pg.psql("UPDATE orders SET status = 'refunded' WHERE order_id = 2;")
    pg.psql("DELETE FROM orders WHERE order_id = 3;")


def cdc_run(f, rec, replica_full, tag, upsert=False):
    from postgres import Pg
    pg = Pg().start()
    try:
        pg_orders(pg, replica_full=replica_full)
        ddl = ("CREATE TEMPORARY TABLE pg_orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, PRIMARY KEY (order_id) NOT ENFORCED) WITH ("
               "'connector' = 'postgres-cdc', 'hostname' = 'localhost', 'port' = '%d', 'username' = 'postgres', 'password' = 'not-a-real-password', 'database-name' = 'brewline', "
               "'schema-name' = 'public', 'table-name' = 'orders', 'slot.name' = 'flink_slot', 'decoding.plugin.name' = 'pgoutput', 'scan.incremental.snapshot.enabled' = 'false'%s);\n"
               % (pg.port, ", 'changelog-mode' = 'upsert'" if upsert else ''))
        sink = "CREATE TEMPORARY TABLE shown (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, PRIMARY KEY (order_id) NOT ENFORCED) WITH ('connector' = 'print');\n"
        # the plan of the source, before any change: does the planner add a step that remembers every row?
        rc, out, err = f.sql(SETUP + ddl + "EXPLAIN CHANGELOG_MODE SELECT * FROM pg_orders;", name='cdc_explain_' + tag, jars=[CDC_JAR])
        ex = F.strip_ansi(out)
        phys = ex[ex.index('== Optimized Physical Plan =='):].split('== Optimized Execution Plan ==')[0] if '== Optimized Physical Plan ==' in ex else ex
        rec.text('cdc.plan_' + tag, fx.norm('\n'.join(l.rstrip() for l in phys.splitlines()[1:] if l.strip()).replace(str(pg.port), '5432'), f))
        script = SETUP + "SET 'execution.checkpointing.interval' = '5 s';\n" + ddl + sink + "INSERT INTO shown SELECT * FROM pg_orders;"
        mark = f.out_mark()
        jid, out = fx.submit(f, script, name='cdc_direct_' + tag, jars=[CDC_JAR])
        f.wait_state(jid, 'RUNNING')
        time.sleep(12)                                                           # the snapshot of the five rows
        slot = pg.psql("select slot_name || '  ' || plugin || '  active=' || active from pg_replication_slots order by slot_name;")
        identity = {'d': 'default', 'f': 'full'}[pg.psql("select relreplident from pg_class where relname='orders';")]
        changes(pg)
        time.sleep(10)
        printed = f.out_since(mark).strip()
        lines = printed.splitlines()
        state = f.job(jid)['state']
        err, failures = '', 0
        ex = f.rest('/jobs/%s/exceptions' % jid)['exceptionHistory']['entries']
        if ex:
            failures = len(ex)
            first = ex[0]['stacktrace'].split('\n')[0]
            err = fx.norm(re.sub(r' Please see more in.*$', '', first), f)
        rec.text('cdc.flink_cdc_output_' + tag, printed)
        rec.counts('cdc.flink_cdc_summary_' + tag, {'lines': len(lines), 'kinds': sorted({l.split('[')[0] for l in lines}), 'replica_identity': identity,
                                                    'snapshot_rows': sum(1 for l in lines[:5] if l.startswith('+I')), 'job_state': state, 'slot': slot, 'error': err, 'failures_recorded': failures})
        f.cancel(jid)
        f.wait_idle()
    finally:
        pg.stop()


def record_cdc(f, kc, rec):
    """Flink CDC: the Flink CDC PostgreSQL connector reads the write-ahead log of a real PostgreSQL itself, with no Kafka in between."""
    assert CDC_JAR and CDC_JAR.exists(), 'set FLINK_CDC_JAR to flink-sql-connector-postgres-cdc-3.7.0-2.2.jar'
    f.cancel_all()
    f.wait_idle()
    cdc_run(f, rec, True, 'full')
    cdc_run(f, rec, False, 'default')
    cdc_run(f, rec, False, 'upsert', upsert=True)              # the default replica identity, with the changelog mode that does not need the old row
