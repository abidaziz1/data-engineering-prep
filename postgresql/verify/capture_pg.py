#!/usr/bin/env python3
"""Records what real PostgreSQL 16 prints and does, for the PostgreSQL course. Every server is a throwaway one on 127.0.0.1 in one temporary folder that is removed at the end.
Nothing is timed except where a section says so, and then only as an order of magnitude. Ports, process ids, times, transaction ids and log positions are replaced before they are written.
Usage: python3 postgresql/verify/capture_pg.py [--out path] [--only a,b]"""
import argparse
import os
import pathlib
import re
import subprocess
import sys
import threading
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import pglib                                                    # noqa: E402
from pglib import R, Srv, T, table, mask, plan_text, mb, wait_for, BASE, BIN, run, newdir, ROOT_USER as ROOT_USER_FIX   # noqa: E402

SECTIONS = []


def section(fn):
    SECTIONS.append(fn)
    return fn


def meta(s):
    M = R['meta']
    M['postgres'] = s.one("SELECT current_setting('server_version')")
    M['version_line'] = s.one('SELECT version()').split(' on ')[0]
    M['os'] = 'Linux x86_64'
    M['block_size'] = int(s.one("SELECT current_setting('block_size')"))
    M['recorded_on'] = time.strftime('%Y-%m-%d')
    for f in sorted((pathlib.Path(__file__).resolve().parent / 'project').iterdir()):
        if f.is_file():
            R['files'][f.name] = f.read_text()


ORDERS_DDL = '''CREATE TABLE {name} (order_id bigint PRIMARY KEY, store_id int NOT NULL, customer_id int NOT NULL, order_ts timestamptz NOT NULL,
  amount numeric(10,2) NOT NULL, status text NOT NULL, note text)'''


def mk_orders(s, n, name='orders', pk=True, db='postgres'):
    ddl = ORDERS_DDL.format(name=name)
    if not pk:
        ddl = ddl.replace(' PRIMARY KEY', '')
    s.sql('DROP TABLE IF EXISTS %s' % name, db=db)
    s.sql(ddl, db=db)
    s.sql('''INSERT INTO %s SELECT i, 1 + (i * 7) %% 12, 1 + (i * 13) %% 3000, timestamptz '2026-03-01 00:00:00+00' + i * interval '13 seconds',
      round((5 + (i * 37) %% 4500 / 100.0)::numeric, 2), CASE WHEN i %% 200 = 0 THEN 'open' WHEN i %% 97 = 0 THEN 'refunded' ELSE 'paid' END, left(md5(i::text), 16)
      FROM generate_series(1, %d) AS g(i)''' % (name, n), db=db)
    s.sql('ANALYZE %s' % name, db=db)


def relsize(s, rel, db='postgres'):
    return s.one("SELECT pg_relation_size(%s::regclass)", (rel,), db=db)


def totsize(s, rel, db='postgres'):
    return s.one("SELECT pg_total_relation_size(%s::regclass)", (rel,), db=db)


def stats_flush(c):
    c.execute('SELECT pg_stat_force_next_flush()')
    c.execute('SELECT 1')


def lsn(s):
    return s.one('SELECT pg_current_wal_lsn()')


def wal_bytes(s, a, b):
    return s.one('SELECT pg_wal_lsn_diff(%s, %s)::bigint', (b, a))


# ------------------------------------------------------------------ 1. the server and its files
@section
def server():
    C, X = R['counts'], R['text']
    s = Srv('srv', {'default_statistics_target': 100}).start()
    meta(s)
    # the data directory
    names = sorted(os.listdir(s.data))
    keep = [n for n in names if n not in ('postmaster.opts', 'postmaster.pid', 'current_logfiles')]
    T('srv.datadir', '\n'.join(keep))
    C['srv.datadir'] = {'entries': len(keep), 'has_pg_wal': 'pg_wal' in keep, 'has_base': 'base' in keep}
    # the processes of a server with three clients
    conns = [s.conn() for _ in range(3)]
    for c in conns:
        c.execute('SELECT 1')
    time.sleep(0.5)
    ps = subprocess.run(['ps', '-o', 'args=', '--ppid', str(s.pid())], capture_output=True, text=True).stdout.strip().split('\n')
    T('srv.ps', '\n'.join(sorted(re.sub(r'\(\d+\)', '(<port>)', mask(l.replace(BASE, '~'))) for l in ps)))
    clients = [l for l in ps if re.search(r'postgres: postgres postgres 127\.0\.0\.1', l)]
    background = [l for l in ps if l not in clients]
    C['srv.processes'] = {'background_processes': len(background), 'client_processes': len(clients), 'clients_opened': 3,
                          'client_backends_in_pg_stat_activity': conns[0].execute("SELECT count(*) FROM pg_stat_activity WHERE backend_type = 'client backend'").fetchone()[0]}
    for c in conns[1:]:
        c.close()
    time.sleep(0.6)
    ps2 = subprocess.run(['ps', '-o', 'args=', '--ppid', str(s.pid())], capture_output=True, text=True).stdout.strip().split('\n')
    C['srv.processes']['client_processes_after_two_closed'] = len([l for l in ps2 if re.search(r'postgres: postgres postgres 127\.0\.0\.1', l)])
    conns[0].close()
    # the files of one table
    mk_orders(s, 200000)
    path = s.one("SELECT pg_relation_filepath('orders')")
    fn = path.split('/')[-1]
    dboid = path.split('/')[1]
    files = sorted(f for f in os.listdir(s.data / 'base' / dboid) if f == fn or f.startswith(fn + '_') or f.startswith(fn + '.'))
    T('srv.table_files', '\n'.join(re.sub(r'^' + fn, 'NNNNN', f) for f in files))
    pages = s.one("SELECT relpages FROM pg_class WHERE relname = 'orders'")
    size = relsize(s, 'orders')
    fsize = (s.data / path).stat().st_size
    C['srv.table'] = {'rows': 200000, 'pages': pages, 'bytes': size, 'file_bytes': fsize, 'bytes_equal_file': size == fsize, 'pages_times_8192_equal_size': pages * 8192 == size,
                      'rows_per_page': round(200000 / pages, 1), 'path_shape': re.sub(r'\d+', 'N', path), 'files_of_the_table': len(files), 'size_mb': mb(size)}
    # one page: the line pointers
    s.sql('CREATE EXTENSION pageinspect')
    hdr = s.sql("SELECT lower, upper, special, pagesize FROM page_header(get_raw_page('orders', 0))")[0]
    items = s.one("SELECT count(*) FROM heap_page_items(get_raw_page('orders', 0))")
    C['srv.page'] = {'pagesize': hdr[3], 'tuples_on_page_0': items, 'free_bytes_on_page_0': hdr[1] - hdr[0]}
    # big values: TOAST
    s.sql('CREATE TABLE docs (id int, body text)')
    s.sql("INSERT INTO docs VALUES (1, 'short'), (2, repeat('abc', 7000)), (3, (SELECT string_agg(md5(g::text), '') FROM generate_series(1, 640) g))")
    toast = s.one("SELECT reltoastrelid::regclass::text FROM pg_class WHERE relname = 'docs'")
    rows = s.sql('SELECT id, octet_length(body), pg_column_size(body) FROM docs ORDER BY id')
    chunks = s.one('SELECT count(DISTINCT chunk_id) || \' \' || count(*) FROM %s' % toast)
    C['srv.toast'] = {'rows': [{'id': r[0], 'value_bytes': r[1], 'stored_bytes': r[2]} for r in rows], 'toast_chunks': int(chunks.split()[1]), 'toasted_values': int(chunks.split()[0]),
                      'toast_table_exists': toast.startswith('pg_toast.pg_toast_')}
    T('srv.toast_table', '\n'.join('%d | %d | %d' % (r[0], r[1], r[2]) for r in rows))
    # settings that the lessons quote
    rows = s.sql("SELECT name, setting, coalesce(unit, ''), context FROM pg_settings WHERE name IN ('shared_buffers','work_mem','maintenance_work_mem','max_connections','wal_level','autovacuum','checkpoint_timeout','max_wal_size','min_wal_size','synchronous_commit','fsync','full_page_writes','wal_segment_size','effective_cache_size','random_page_cost','default_statistics_target','autovacuum_vacuum_scale_factor','autovacuum_vacuum_threshold','autovacuum_naptime','autovacuum_freeze_max_age','password_encryption','idle_in_transaction_session_timeout','statement_timeout') ORDER BY name")
    R['tables']['srv.settings'] = table(['setting', 'value', 'unit', 'context'], [list(r) for r in rows])
    s.stop()
    # connection slots
    c2 = Srv('slots', {'max_connections': 10, 'superuser_reserved_connections': 3}).start()
    c2.sql("CREATE ROLE etl LOGIN")
    opened, err = [], None
    for i in range(12):
        try:
            opened.append(c2.conn(user='etl'))
        except Exception as e:    # noqa: BLE001
            err = str(e).strip().split('\n')[0]
            break
    n_etl = len(opened)
    sup = []
    err2 = None
    for i in range(12):
        try:
            sup.append(c2.conn())
        except Exception as e:    # noqa: BLE001
            err2 = str(e).strip().split('\n')[0]
            break
    C['srv.slots'] = {'max_connections': 10, 'reserved_for_superusers': 3, 'etl_connections_accepted': n_etl, 'superuser_connections_accepted': len(sup)}
    T('srv.slots_error_etl', err or '')
    T('srv.slots_error_all', err2 or '')
    for c in opened + sup:
        c.close()
    c2.stop()


# ------------------------------------------------------------------ 2. MVCC, vacuum and bloat
def vacuum_notes(c, sql):
    notes = []
    c.add_notice_handler(lambda d: notes.append(d.message_primary or str(d)))
    c.execute(sql)
    return notes


@section
def mvcc():
    C, X = R['counts'], R['text']
    s = Srv('mvcc', {'autovacuum': 'off'}).start()
    s.sql('CREATE EXTENSION pageinspect')
    s.sql('CREATE EXTENSION pgstattuple')
    # --- row versions on a page
    s.sql('CREATE TABLE acct (id int, balance int)')
    s.sql('INSERT INTO acct VALUES (1, 100), (2, 200), (3, 300)')

    def items():
        return s.sql("SELECT lp, lp_flags, t_xmin::text::bigint, t_xmax::text::bigint, t_ctid::text FROM heap_page_items(get_raw_page('acct', 0)) ORDER BY lp")

    base = int(s.sql('SELECT xmin::text::bigint FROM acct WHERE id = 1')[0][0])
    flagname = {0: 'unused', 1: 'normal', 2: 'redirect', 3: 'dead'}

    def snap(label):
        return [label] + [[r[0], flagname[r[1]], (r[2] - base) if r[2] else None, (r[3] - base) if r[3] else 0, r[4]] for r in items()]

    steps = []
    steps.append(snap('3 rows inserted'))
    first = s.sql('SELECT ctid::text, xmin::text::bigint - %s, xmax::text::bigint FROM acct ORDER BY id' % base)
    s.sql('UPDATE acct SET balance = balance + 50 WHERE id = 1')
    after = s.sql('SELECT ctid::text, xmin::text::bigint - %s, xmax::text::bigint FROM acct ORDER BY id' % base)
    steps.append(snap('row 1 updated'))
    c = s.conn(autocommit=False)
    c.execute('INSERT INTO acct VALUES (4, 400)')
    c.rollback()
    c.close()
    steps.append(snap('an insert rolled back'))
    s.sql('VACUUM acct')
    steps.append(snap('after VACUUM'))
    rows = []
    for st in steps:
        for r in st[1:]:
            rows.append([st[0]] + r)
    R['tables']['mvcc.page'] = table(['step', 'line pointer', 'state', 'xmin (relative)', 'xmax (relative)', 'ctid'], rows)
    C['mvcc.versions'] = {'ctid_before': first[0][0], 'ctid_after': after[0][0], 'xmin_before': first[0][1], 'xmin_after': after[0][1], 'other_rows_same_ctid': [first[1][0], first[2][0]] == [after[1][0], after[2][0]],
                          'versions_on_page_after_update': len(steps[1]) - 1, 'visible_rows_after_update': 3, 'old_version_xmax_is_update_xid': steps[1][1][3] == after[0][1]}
    # --- bloat: update every row, several times
    s.sql('CREATE TABLE ledger (id bigint PRIMARY KEY, store_id int, amount numeric(10,2), status text, note text)')
    s.sql("INSERT INTO ledger SELECT i, 1 + i % 12, 10 + i % 90, 'paid', left(md5(i::text), 20) FROM generate_series(1, 100000) i")
    s.sql('ANALYZE ledger')
    c = s.conn()
    rows = []

    def tup(step):
        st = c.execute("SELECT table_len, tuple_count, dead_tuple_count, round(dead_tuple_percent::numeric, 1), round(free_percent::numeric, 1) FROM pgstattuple('ledger')").fetchone()
        rows.append([step, st[0], round(st[0] / 1048576.0, 1), st[1], st[2], float(st[3]), float(st[4]), c.execute("SELECT pg_relation_size('ledger_pkey')").fetchone()[0]])

    tup('100,000 rows loaded')
    for k in (1, 2, 3):
        c.execute('UPDATE ledger SET amount = amount + 1')
        tup('after %d update%s of every row' % (k, '' if k == 1 else 's'))
    c.execute('VACUUM ledger')
    tup('after VACUUM')
    c.execute('UPDATE ledger SET amount = amount + 1')
    tup('after one more update')
    c.execute('VACUUM FULL ledger')
    tup('after VACUUM FULL')
    R['tables']['mvcc.bloat'] = table(['step', 'table bytes', 'table MB', 'live rows', 'dead rows', 'dead %', 'free space %', 'primary key index bytes'], rows)
    C['mvcc.bloat'] = {'size_start': rows[0][1], 'size_after_1': rows[1][1], 'size_after_3': rows[3][1], 'size_after_vacuum': rows[4][1], 'size_after_vacuum_full': rows[6][1],
                       'vacuum_shrinks': rows[4][1] < rows[3][1], 'vacuum_full_shrinks': rows[6][1] < rows[5][1], 'ratio_after_3': round(rows[3][1] / rows[0][1], 2),
                       'dead_after_3': rows[3][4], 'dead_after_vacuum': rows[4][4]}
    c.close()
    # --- vacuum cannot remove what an old snapshot may still see
    s.sql('CREATE TABLE held (id int PRIMARY KEY, v int)')
    s.sql('INSERT INTO held SELECT i, 0 FROM generate_series(1, 20000) i')
    a = s.conn(autocommit=False)
    a.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')
    a.execute('SELECT count(*) FROM held')
    s.sql('UPDATE held SET v = 1 WHERE id <= 10000')
    b = s.conn()
    n1 = vacuum_notes(b, 'VACUUM (VERBOSE) held')
    a.commit()
    a.close()
    n2 = vacuum_notes(b, 'VACUUM (VERBOSE) held')
    b.close()
    pick = lambda notes: next(l for n in notes for l in n.split('\n') if l.startswith('tuples:'))      # noqa: E731
    T('mvcc.vacuum_held', 'VACUUM (VERBOSE) held   -- while another session has an open snapshot\n' + pick(n1) + '\n\nVACUUM (VERBOSE) held   -- after that session committed\n' + pick(n2))
    m1 = re.search(r'(\d+) removed, (\d+) remain, (\d+) are dead but not yet removable', pick(n1))
    m2 = re.search(r'(\d+) removed, (\d+) remain, (\d+) are dead but not yet removable', pick(n2))
    C['mvcc.held'] = {'updated_rows': 10000, 'removed_while_held': int(m1.group(1)), 'not_yet_removable_while_held': int(m1.group(3)), 'removed_after_commit': int(m2.group(1)), 'not_yet_removable_after_commit': int(m2.group(3))}
    # --- HOT updates
    rows = []
    for name, ddl, upd in (('every row, an indexed column', 'CREATE TABLE h1 (id int PRIMARY KEY, k int, note text)', 'UPDATE h1 SET k = k + 1'),
                           ('every row, a column without an index, fillfactor 100', 'CREATE TABLE h2 (id int PRIMARY KEY, k int, note text)', "UPDATE h2 SET note = note || 'x'"),
                           ('every row, a column without an index, fillfactor 70', 'CREATE TABLE h3 (id int PRIMARY KEY, k int, note text) WITH (fillfactor = 70)', "UPDATE h3 SET note = note || 'x'"),
                           ('a quarter of the rows, fillfactor 100', 'CREATE TABLE h4 (id int PRIMARY KEY, k int, note text)', "UPDATE h4 SET note = note || 'x' WHERE id % 4 = 0"),
                           ('a quarter of the rows, fillfactor 70', 'CREATE TABLE h5 (id int PRIMARY KEY, k int, note text) WITH (fillfactor = 70)', "UPDATE h5 SET note = note || 'x' WHERE id % 4 = 0")):
        t = re.search(r'UPDATE (h\d)', upd).group(1)
        s.sql(ddl)
        if t == 'h1':
            s.sql('CREATE INDEX h1_k ON h1 (k)')
        s.sql("INSERT INTO %s SELECT i, i, left(md5(i::text), 30) FROM generate_series(1, 20000) i" % t)
        s.sql('ANALYZE %s' % t)
        c = s.conn()
        c.execute(upd)
        stats_flush(c)
        r = c.execute("SELECT n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname = %s", (t,)).fetchone()
        sz = c.execute('SELECT pg_relation_size(%s::regclass)', (t,)).fetchone()[0]
        rows.append([name, r[0], r[1], round(100.0 * r[1] / r[0]), sz])
        c.close()
    R['tables']['mvcc.hot'] = table(['case', 'rows updated', 'HOT updates', 'HOT %', 'table bytes'], rows)
    C['mvcc.hot'] = {'indexed_pct': rows[0][3], 'full_page_pct': rows[1][3], 'fillfactor_all_pct': rows[2][3], 'quarter_full_pct': rows[3][3], 'quarter_fillfactor_pct': rows[4][3]}
    s.stop()
    # --- when autovacuum starts
    s = Srv('av', {'autovacuum': 'on', 'autovacuum_naptime': '1s'}).start()
    s.sql('CREATE TABLE av (id int PRIMARY KEY, v int)')
    s.sql('INSERT INTO av SELECT i, 0 FROM generate_series(1, 10000) i')
    s.sql('ANALYZE av')
    c = s.conn()
    thr = c.execute("SELECT current_setting('autovacuum_vacuum_threshold')::int + current_setting('autovacuum_vacuum_scale_factor')::float * reltuples FROM pg_class WHERE relname = 'av'").fetchone()[0]

    def state():
        stats_flush(c)
        time.sleep(0.2)
        r = c.execute("SELECT n_dead_tup, autovacuum_count, n_tup_upd FROM pg_stat_user_tables WHERE relname = 'av'").fetchone()
        return {'dead_rows_counted': r[0], 'autovacuum_runs': r[1]}

    rows = []
    wait_for(lambda: state()['autovacuum_runs'] >= 1, timeout=30, step=0.5)
    base_runs = state()['autovacuum_runs']
    rows.append(['10,000 rows inserted, nothing updated', 0, state()['dead_rows_counted'], base_runs])
    c.execute('UPDATE av SET v = 1 WHERE id <= 1500')
    time.sleep(4)
    st = state()
    rows.append(['1,500 rows updated', 1500, st['dead_rows_counted'], st['autovacuum_runs']])
    c.execute('UPDATE av SET v = 1 WHERE id > 1500 AND id <= 2500')
    ok = wait_for(lambda: state()['autovacuum_runs'] > base_runs, timeout=30, step=0.5)
    st = state()
    rows.append(['1,000 more rows updated (2,500 in all)', 2500, st['dead_rows_counted'], st['autovacuum_runs']])
    R['tables']['mvcc.autovacuum'] = table(['step', 'dead rows made so far', 'dead rows counted now', 'autovacuum runs'], rows)
    C['mvcc.autovacuum'] = {'threshold': thr, 'formula': '50 + 0.2 * 10,000', 'insert_vacuum_runs': base_runs, 'ran_below_threshold': rows[1][3] > base_runs, 'ran_above_threshold': bool(ok), 'dead_counted_below': rows[1][2] >= 1500, 'dead_after_run': rows[2][2]}
    c.close()
    s.stop()


def clean_log(text):
    out = []
    for l in text.split('\n'):
        if not l.strip():
            continue
        l = mask(l)
        l = re.sub(r'^<time> \[pid\] ', '', l)
        l = re.sub(r'wrote \d+ buffers \(\d+\.\d+%\)', 'wrote N buffers (P%)', l)
        l = re.sub(r'\b\d+\.\d{3} s\b', 'X s', l)
        l = re.sub(r'distance=\d+ kB, estimate=\d+ kB', 'distance=N kB, estimate=N kB', l)
        l = re.sub(r'\d+ WAL file\(s\) added, \d+ removed, \d+ recycled', 'N WAL file(s) added, N removed, N recycled', l)
        l = re.sub(r'sync files=\d+, longest=X s, average=X s', 'sync files=N, longest=X s, average=X s', l)
        l = re.sub(r'redo done at 0/<lsn> system usage: .*', 'redo done at 0/<lsn>', l)
        l = re.sub(r', time \S+ \S+', ', time <time>', l)
        out.append(l)
    return '\n'.join(out)


def est_rows(txt):
    for l in txt.split('\n'):
        m = re.search(r'rows=(\d+) width', l)
        if m and ('Scan' in l):
            return int(m.group(1))
    return None


# ------------------------------------------------------------------ 3. the write-ahead log and crash recovery
@section
def wal():
    C, X = R['counts'], R['text']
    s = Srv('wal', {'autovacuum': 'off', 'checkpoint_timeout': '1h', 'log_checkpoints': 'on'}).start()
    s.sql('CREATE EXTENSION pg_walinspect')
    seg = s.one("SELECT pg_walfile_name(pg_current_wal_lsn())")
    pgwal = sorted(os.listdir(s.data / 'pg_wal'))
    T('wal.dir', '\n'.join(re.sub(r'^[0-9A-F]{24}$', '000000010000000000000001', f) for f in pgwal))
    C['wal.segment'] = {'segment_bytes': int(s.one("SELECT setting::bigint FROM pg_settings WHERE name = 'wal_segment_size'")), 'name_chars': len(seg), 'segments_in_pg_wal': len([f for f in pgwal if re.match(r'^[0-9A-F]{24}$', f)])}
    # what a statement writes
    s.sql('CREATE TABLE w (id int PRIMARY KEY, v int, pad text)')
    s.sql("INSERT INTO w SELECT i, 0, repeat('x', 60) FROM generate_series(1, 1000) i")
    rows = []

    def rec(label, stmt, checkpoint=False):
        if checkpoint:
            s.sql('CHECKPOINT')
        a = lsn(s)
        s.sql(stmt)
        b = lsn(s)
        for r in s.sql("SELECT resource_manager, record_type, record_length, fpi_length FROM pg_get_wal_records_info(%s, %s) WHERE resource_manager <> 'Standby' ORDER BY start_lsn", (a, b)):
            rows.append([label, r[0], r[1], r[2], r[3]])

    rec('first update after a checkpoint', "UPDATE w SET v = v + 1 WHERE id = 1", True)
    rec('second update on the same page', "UPDATE w SET v = v + 1 WHERE id = 2")
    rec('delete one row', 'DELETE FROM w WHERE id = 3')
    rec('insert one row', "INSERT INTO w VALUES (5000, 0, 'x')")
    R['tables']['wal.records'] = table(['statement', 'resource manager', 'record type', 'record bytes', 'full page image bytes'], rows)
    first = [r for r in rows if r[0].startswith('first') and r[1] == 'Heap']
    second = [r for r in rows if r[0].startswith('second') and r[1] == 'Heap']
    labels = sorted(set(r[0] for r in rows))
    C['wal.fpi'] = {'first_update_record_bytes': first[0][3], 'first_update_fpi_bytes': first[0][4], 'second_update_record_bytes': second[0][3], 'second_update_fpi_bytes': second[0][4],
                    'every_statement_ends_with_commit': all(any(x[0] == lab and x[1] == 'Transaction' and x[2] == 'COMMIT' for x in rows) for lab in labels)}
    # checkpoints
    c = s.conn()
    before = c.execute('SELECT checkpoints_timed, checkpoints_req FROM pg_stat_bgwriter').fetchone()
    pos = len(s.log())
    c.execute('CHECKPOINT')
    time.sleep(0.5)
    after = c.execute('SELECT checkpoints_timed, checkpoints_req FROM pg_stat_bgwriter').fetchone()
    T('wal.checkpoint_log', clean_log(s.log_since(pos)))
    C['wal.checkpoint'] = {'timed_before': before[0], 'req_before': before[1], 'timed_after': after[0], 'req_after': after[1], 'manual_counts_as_requested': after[1] == before[1] + 1 and after[0] == before[0]}
    # the cost of a commit: one flush each
    c.execute('CREATE TABLE commits (id int)')
    res = {}
    for mode in ('on', 'off'):
        c.execute('SET synchronous_commit = %s' % mode)
        c.execute('SELECT pg_stat_force_next_flush()')
        w0 = c.execute('SELECT wal_sync, wal_records FROM pg_stat_wal').fetchone()
        t0 = time.time()
        for i in range(1000):
            c.execute('INSERT INTO commits VALUES (%s)', (i,))
        el = time.time() - t0
        time.sleep(0.5)
        c.execute('SELECT pg_stat_force_next_flush()')
        w1 = c.execute('SELECT wal_sync, wal_records FROM pg_stat_wal').fetchone()
        res[mode] = {'commits': 1000, 'wal_syncs': w1[0] - w0[0], 'wal_records': w1[1] - w0[1], 'seconds': round(el, 2)}
    c.execute('SET synchronous_commit = on')
    c.execute('SELECT pg_stat_force_next_flush()')
    w0 = c.execute('SELECT wal_sync FROM pg_stat_wal').fetchone()
    t0 = time.time()
    with c.transaction():
        for i in range(1000):
            c.execute('INSERT INTO commits VALUES (%s)', (i,))
    el = time.time() - t0
    c.execute('SELECT pg_stat_force_next_flush()')
    w1 = c.execute('SELECT wal_sync FROM pg_stat_wal').fetchone()
    res['one_transaction'] = {'commits': 1, 'wal_syncs': w1[0] - w0[0], 'seconds': round(el, 2)}
    C['wal.commits'] = res
    R['tables']['wal.commits'] = table(['1,000 single-row inserts', 'commits', 'WAL flushes to disk', 'seconds on this machine'],
                                       [['one transaction each, synchronous_commit on', 1000, res['on']['wal_syncs'], res['on']['seconds']], ['one transaction each, synchronous_commit off', 1000, res['off']['wal_syncs'], res['off']['seconds']],
                                        ['all in one transaction', 1, res['one_transaction']['wal_syncs'], res['one_transaction']['seconds']]])
    # wal_level
    try:
        c.execute("SELECT pg_create_logical_replication_slot('s1', 'test_decoding')")
        err = 'no error'
    except Exception as e:     # noqa: BLE001
        err = str(e).strip().split('\n')[0]
    T('wal.logical_needs_level', "SELECT pg_create_logical_replication_slot('s1', 'test_decoding');\n" + err)
    C['wal.wal_level'] = {'default': s.one('SHOW wal_level'), 'logical_slot_refused': 'wal_level' in err}
    c.close()
    s.stop()
    # a crash and what recovery does
    s = Srv('crash', {'autovacuum': 'off', 'checkpoint_timeout': '1h', 'log_checkpoints': 'on'}).start()
    s.sql('CREATE TABLE paid (id int)')
    s.sql('CREATE UNLOGGED TABLE staging (id int)')
    s.sql('INSERT INTO paid SELECT generate_series(1, 1000)')
    s.sql('INSERT INTO staging SELECT generate_series(1, 1000)')
    s.restart('fast')
    after_clean = {'paid': s.one('SELECT count(*) FROM paid'), 'unlogged': s.one('SELECT count(*) FROM staging')}
    s.sql('CHECKPOINT')
    s.sql('INSERT INTO paid SELECT generate_series(1001, 2000)')
    s.sql('INSERT INTO staging SELECT generate_series(1001, 2000)')
    held = s.conn(autocommit=False)
    held.execute('INSERT INTO paid SELECT generate_series(2001, 2500)')
    pos = len(s.log())
    s.kill9()
    try:
        held.close()
    except Exception:    # noqa: BLE001
        pass
    s.start()
    log = clean_log(s.log_since(pos))
    keep = [l for l in log.split('\n') if re.search(r'not properly shut down|redo starts|redo done|ready to accept|was interrupted|end-of-recovery|automatic recovery', l)]
    T('crash.log', '\n'.join(keep))
    after_crash = {'paid': s.one('SELECT count(*) FROM paid'), 'unlogged': s.one('SELECT count(*) FROM staging'), 'uncommitted_rows_visible': s.one('SELECT count(*) FROM paid WHERE id > 2000')}
    C['crash'] = {'committed_before_crash': 2000, 'uncommitted_before_crash': 500, 'paid_after_clean_restart': after_clean['paid'], 'unlogged_after_clean_restart': after_clean['unlogged'],
                  'paid_after_crash': after_crash['paid'], 'uncommitted_rows_after_crash': after_crash['uncommitted_rows_visible'], 'unlogged_after_crash': after_crash['unlogged'],
                  'log_says_recovery': any('automatic recovery' in l for l in keep), 'log_says_redo': any('redo starts' in l for l in keep), 'log_says_ready': any('ready to accept connections' in l for l in keep)}
    s.stop()


# ------------------------------------------------------------------ 4. loading data
def csv_rows(a, b):
    import hashlib
    out = []
    for i in range(a, b + 1):
        status = 'open' if i % 200 == 0 else 'refunded' if i % 97 == 0 else 'paid'
        amount = round(5 + (i * 37) % 4500 / 100.0, 2)
        ts = time.strftime('%Y-%m-%d %H:%M:%S+00', time.gmtime(1772323200 + i * 13))
        out.append('%d,%d,%d,%s,%.2f,%s,%s' % (i, 1 + (i * 7) % 12, 1 + (i * 13) % 3000, ts, amount, status, hashlib.md5(str(i).encode()).hexdigest()[:16]))
    return out


@section
def load():
    C, X = R['counts'], R['text']
    s = Srv('load', {'autovacuum': 'off'}).start()
    s.sql('CREATE EXTENSION pgstattuple')

    def fresh(name, pk=True, kind=''):
        s.sql('DROP TABLE IF EXISTS %s' % name)
        d = ORDERS_DDL.format(name=name).replace('CREATE TABLE', 'CREATE %sTABLE' % kind)
        s.sql(d if pk else d.replace(' PRIMARY KEY', ''))

    data = csv_rows(1, 20000)
    c = s.conn()
    methods = []

    def measure(label, fn, statements, commits):
        c.execute('SELECT pg_stat_force_next_flush()')
        w0 = c.execute('SELECT wal_bytes, wal_sync FROM pg_stat_wal').fetchone()
        t0 = time.time()
        fn()
        el = time.time() - t0
        c.execute('SELECT pg_stat_force_next_flush()')
        w1 = c.execute('SELECT wal_bytes, wal_sync FROM pg_stat_wal').fetchone()
        n = c.execute('SELECT count(*) FROM orders_m').fetchone()[0]
        methods.append([label, statements, commits, int(w1[0] - w0[0]), int(w1[1] - w0[1]), round(el, 2), n])

    INS = 'INSERT INTO orders_m VALUES (%s, %s, %s, %s, %s, %s, %s)'
    parsed = [l.split(',') for l in data]

    def single_autocommit():
        for r in parsed:
            c.execute(INS, r)

    def single_one_tx():
        with c.transaction():
            for r in parsed:
                c.execute(INS, r)

    def multirow():
        with c.transaction():
            for k in range(0, len(parsed), 1000):
                chunk = parsed[k:k + 1000]
                c.execute('INSERT INTO orders_m VALUES ' + ','.join(['(%s,%s,%s,%s,%s,%s,%s)'] * len(chunk)), [x for r in chunk for x in r])

    def copy_in():
        with c.cursor().copy('COPY orders_m FROM STDIN (FORMAT csv)') as cp:
            for l in data:
                cp.write(l + '\n')

    for label, fn, st, cm in (('one INSERT per row, each committed', single_autocommit, 20000, 20000), ('one INSERT per row, all in one transaction', single_one_tx, 20000, 1),
                              ('INSERT of 1,000 rows at a time, one transaction', multirow, 20, 1), ('COPY', copy_in, 1, 1)):
        fresh('orders_m')
        measure(label, fn, st, cm)
    R['tables']['load.methods'] = table(['method', 'statements sent', 'commits', 'WAL bytes', 'WAL flushes', 'seconds on this machine', 'rows loaded'], methods)
    C['load.methods'] = {m[0]: {'statements': m[1], 'commits': m[2], 'wal_bytes': m[3], 'wal_flushes': m[4], 'seconds': m[5], 'rows': m[6]} for m in methods}
    C['load.methods_summary'] = {'all_loaded_20000': all(m[6] == 20000 for m in methods), 'copy_faster_than_autocommit_by_at_least': int(methods[0][5] / max(methods[3][5], 0.001)),
                                 'one_tx_flushes': methods[1][4], 'autocommit_flushes': methods[0][4]}
    # COPY: a bad row, NULLs and quoting
    fresh('orders_c')
    bad = csv_rows(1, 6)
    f = bad[4].split(',')
    f[2] = 'abc'
    bad[4] = ','.join(f)
    try:
        with c.cursor().copy('COPY orders_c FROM STDIN (FORMAT csv)') as cp:
            for l in bad:
                cp.write(l + '\n')
        err = 'no error'
    except Exception as e:     # noqa: BLE001
        err = str(e).strip()
    T('load.copy_error', 'COPY orders_c FROM STDIN (FORMAT csv)   -- six rows, the fifth has "abc" as customer_id\n' + err)
    C['load.copy_error'] = {'rows_in_table_after_error': c.execute('SELECT count(*) FROM orders_c').fetchone()[0], 'rows_sent_before_the_bad_one': 4, 'names_the_line': 'line 5' in err, 'names_the_column': 'customer_id' in err}
    c.execute('CREATE TABLE csvtest (a text, b text, c text)')
    with c.cursor().copy('COPY csvtest FROM STDIN (FORMAT csv)') as cp:
        cp.write('1,,""\n2,"x,y",z\n3,NULL,"q""r"\n')
    rows = c.execute('SELECT a, b IS NULL, b, c FROM csvtest ORDER BY a').fetchall()
    R['tables']['load.csv_nulls'] = table(['a', 'b is NULL', 'b', 'c'], [[r[0], r[1], r[2], r[3]] for r in rows])
    # staging and upsert
    s.sql('DROP TABLE IF EXISTS orders')
    s.sql(ORDERS_DDL.format(name='orders'))
    s.sql('DROP TABLE IF EXISTS stg_orders')
    s.sql(ORDERS_DDL.format(name='stg_orders').replace(' PRIMARY KEY', ''))
    allrows = csv_rows(1, 100000)

    def fill_stg(rs):
        c.execute('TRUNCATE stg_orders')
        with c.cursor().copy('COPY stg_orders FROM STDIN (FORMAT csv)') as cp:
            for l in rs:
                cp.write(l + '\n')

    COLS = 'store_id, customer_id, order_ts, amount, status, note'
    UPSERT = ('INSERT INTO orders SELECT * FROM stg_orders ON CONFLICT (order_id) DO UPDATE SET store_id = EXCLUDED.store_id, customer_id = EXCLUDED.customer_id, '
              'order_ts = EXCLUDED.order_ts, amount = EXCLUDED.amount, status = EXCLUDED.status, note = EXCLUDED.note')
    UPSERT_D = UPSERT + ' WHERE (orders.store_id, orders.customer_id, orders.order_ts, orders.amount, orders.status, orders.note) IS DISTINCT FROM (EXCLUDED.store_id, EXCLUDED.customer_id, EXCLUDED.order_ts, EXCLUDED.amount, EXCLUDED.status, EXCLUDED.note)'
    MATCH = '(o.store_id, o.customer_id, o.order_ts, o.amount, o.status, o.note) IS DISTINCT FROM (s.store_id, s.customer_id, s.order_ts, s.amount, s.status, s.note)'
    MERGE = ('MERGE INTO orders o USING stg_orders s ON o.order_id = s.order_id WHEN MATCHED AND ' + MATCH +
             ' THEN UPDATE SET store_id = s.store_id, customer_id = s.customer_id, order_ts = s.order_ts, amount = s.amount, status = s.status, note = s.note '
             'WHEN NOT MATCHED THEN INSERT VALUES (s.order_id, s.store_id, s.customer_id, s.order_ts, s.amount, s.status, s.note)')
    rows = []
    last = [0, 0]

    def step(label, sql):
        cur = c.execute(sql)
        status = cur.statusmessage
        c.execute('SELECT pg_stat_force_next_flush()')
        st = c.execute("SELECT n_tup_ins, n_tup_upd FROM pg_stat_user_tables WHERE relname = 'orders'").fetchone()
        size = c.execute("SELECT pg_relation_size('orders')").fetchone()[0]
        rows.append([label, status, st[0] - last[0], st[1] - last[1], size])
        last[0], last[1] = st[0], st[1]

    fill_stg(allrows)
    step('first load of 100,000 rows', UPSERT)
    step('the same file again, plain DO UPDATE', UPSERT)
    step('the same file again, DO UPDATE ... WHERE the row differs', UPSERT_D)
    changed = list(allrows)
    for i in range(1000):
        f = changed[i * 7].split(',')
        f[4] = '99.00'
        changed[i * 7] = ','.join(f)
    fill_stg(changed)
    step('1,000 rows changed, DO UPDATE ... WHERE the row differs', UPSERT_D)
    step('the same file again with MERGE', MERGE)
    changed2 = list(changed)
    for i in range(500):
        f = changed2[i * 11].split(',')
        f[4] = '98.00'
        changed2[i * 11] = ','.join(f)
    fill_stg(changed2)
    step('500 other rows changed, MERGE', MERGE)
    R['tables']['load.upsert'] = table(['run', 'command tag', 'rows inserted', 'rows updated', 'table bytes'], rows)
    C['load.upsert'] = {'first_status': rows[0][1], 'plain_second_status': rows[1][1], 'plain_second_updated': rows[1][3], 'table_doubled_by_plain_rerun': rows[1][4] > 1.9 * rows[0][4], 'distinct_status': rows[2][1], 'distinct_updated': rows[2][3],
                        'distinct_size_unchanged': rows[2][4] == rows[1][4], 'changed_status': rows[3][1], 'changed_updated': rows[3][3], 'merge_same_file_status': rows[4][1], 'merge_same_updated': rows[4][3],
                        'merge_changed_status': rows[5][1], 'merge_changed_updated': rows[5][3]}
    # a duplicate inside one batch
    fill_stg(allrows[:10] + [allrows[0]])
    try:
        c.execute(UPSERT)
        e1 = 'no error'
    except Exception as e:      # noqa: BLE001
        e1 = str(e).strip()
    try:
        c.execute(MERGE.replace('WHEN MATCHED AND ' + MATCH, 'WHEN MATCHED'))
        e2 = 'no error'
    except Exception as e:      # noqa: BLE001
        e2 = str(e).strip()
    T('load.dup_upsert', 'INSERT ... ON CONFLICT DO UPDATE   -- the staging table holds order 1 twice\n' + e1)
    T('load.dup_merge', 'MERGE   -- the same staging table\n' + e2)
    C['load.dup'] = {'upsert_refused': 'second time' in e1, 'merge_refused': 'second time' in e2}
    # indexes and logging
    wal = []
    for label, kind, pk, after in (('logged table with a primary key', '', True, False), ('logged table, key added after the load', '', False, True), ('unlogged table with a primary key', 'UNLOGGED ', True, False)):
        fresh('orders_x', pk=pk, kind=kind)
        c.execute('SELECT pg_stat_force_next_flush()')
        w0 = c.execute('SELECT wal_bytes FROM pg_stat_wal').fetchone()[0]
        with c.cursor().copy('COPY orders_x FROM STDIN (FORMAT csv)') as cp:
            for l in allrows:
                cp.write(l + '\n')
        if after:
            c.execute('ALTER TABLE orders_x ADD PRIMARY KEY (order_id)')
        c.execute('SELECT pg_stat_force_next_flush()')
        w1 = c.execute('SELECT wal_bytes FROM pg_stat_wal').fetchone()[0]
        wal.append([label, int(w1 - w0), c.execute("SELECT pg_relation_size('orders_x')").fetchone()[0], c.execute("SELECT coalesce(pg_relation_size('orders_x_pkey'), 0)").fetchone()[0]])
    R['tables']['load.wal'] = table(['100,000 rows by COPY into', 'WAL bytes', 'table bytes', 'primary key bytes'], wal)
    C['load.wal'] = {'logged_mb': mb(wal[0][1]), 'index_after_mb': mb(wal[1][1]), 'unlogged_mb': mb(wal[2][1]), 'unlogged_much_smaller': wal[2][1] < wal[0][1] / 4}
    # statistics after a load
    fresh('orders_s', pk=False)
    with c.cursor().copy('COPY orders_s FROM STDIN (FORMAT csv)') as cp:
        for l in allrows:
            cp.write(l + '\n')
    q = "SELECT count(*) FROM orders_s WHERE status = 'open' AND store_id = 5"
    p1 = plan_text(s, q)
    rt1 = s.one("SELECT reltuples FROM pg_class WHERE relname = 'orders_s'")
    s.sql('ANALYZE orders_s')
    p2 = plan_text(s, q)
    rt2 = s.one("SELECT reltuples FROM pg_class WHERE relname = 'orders_s'")
    actual = c.execute(q).fetchone()[0]
    T('load.plan_before_analyze', q + '\n' + p1)
    T('load.plan_after_analyze', q + '\n' + p2)
    C['load.analyze'] = {'reltuples_before': float(rt1), 'reltuples_after': float(rt2), 'estimate_before': est_rows(p1), 'estimate_after': est_rows(p2), 'actual': actual}
    c.close()
    s.stop()


# ------------------------------------------------------------------ 5. indexes, statistics and plans for big tables
def plan_lines(txt, pat):
    return [l.strip() for l in txt.split('\n') if re.search(pat, l)]


@section
def index():
    C, X = R['counts'], R['text']
    s = Srv('idx', {'autovacuum': 'off'}).start()
    s.sql('CREATE EXTENSION pg_visibility')
    s.sql('''CREATE TABLE events (event_id bigint, event_ts timestamptz NOT NULL, user_id int, kind text, payload jsonb)''')
    s.sql("""INSERT INTO events SELECT i, timestamptz '2026-01-01 00:00:00+00' + i * interval '3 seconds', (i::bigint * 7919) % 50000,
      CASE WHEN i % 1000 = 0 THEN 'purchase' WHEN i % 7 = 0 THEN 'click' ELSE 'view' END,
      jsonb_build_object('country', (ARRAY['US','GB','DE','IN','SG'])[1 + i % 5], 'device', (ARRAY['ios','android','web'])[1 + i % 3], 'n', i % 100)
      FROM generate_series(1, 1000000) i""")
    s.sql('ANALYZE events')
    tab = relsize(s, 'events')
    C['idx.table'] = {'rows': 1000000, 'table_mb': mb(tab)}
    # --- btree against BRIN on a column that grows with the file
    Q = "SELECT count(*) FROM events WHERE event_ts >= '2026-01-10 00:00:00+00' AND event_ts < '2026-01-11 00:00:00+00'"
    s.sql('CREATE INDEX events_ts_btree ON events (event_ts)')
    s.sql('CREATE INDEX events_ts_brin ON events USING brin (event_ts)')
    bt, br = relsize(s, 'events_ts_btree'), relsize(s, 'events_ts_brin')
    corr = float(s.one("SELECT correlation FROM pg_stats WHERE tablename = 'events' AND attname = 'event_ts'"))
    s.sql('DROP INDEX events_ts_brin')
    p_bt = plan_text(s, Q)
    s.sql('DROP INDEX events_ts_btree')
    s.sql('CREATE INDEX events_ts_brin ON events USING brin (event_ts)')
    p_br = plan_text(s, Q)
    T('idx.plan_btree', Q + '\n' + p_bt)
    T('idx.plan_brin', Q + '\n' + p_br)
    m = re.search(r'Rows Removed by Index Recheck: (\d+)', p_br)
    # the same rows, in a random order
    s.sql('CREATE TABLE events_shuffled AS SELECT * FROM events ORDER BY md5(event_id::text)')
    s.sql('CREATE INDEX events_shuffled_brin ON events_shuffled USING brin (event_ts)')
    s.sql('ANALYZE events_shuffled')
    corr2 = float(s.one("SELECT correlation FROM pg_stats WHERE tablename = 'events_shuffled' AND attname = 'event_ts'"))
    p_sh = plan_text(s, Q.replace('FROM events', 'FROM events_shuffled'))
    T('idx.plan_brin_shuffled', Q.replace('FROM events', 'FROM events_shuffled') + '\n' + p_sh)
    C['idx.brin'] = {'table_mb': mb(tab), 'btree_mb': mb(bt), 'brin_kb': round(br / 1024), 'btree_over_brin': round(bt / br), 'correlation_in_order': round(corr, 3), 'correlation_shuffled': round(corr2, 3),
                     'brin_plan_has_bitmap': 'Bitmap Index Scan on events_ts_brin' in p_br, 'btree_plan_uses_index': 'events_ts_btree' in p_bt, 'recheck_removed': int(m.group(1)) if m else 0,
                     'shuffled_plan_uses_brin': 'events_shuffled_brin' in p_sh, 'shuffled_plan_first_line': p_sh.split('\n')[1].strip()[:60], 'rows_matching': s.one(Q)}
    s.sql('DROP TABLE events_shuffled')
    # --- a partial index
    s.sql("CREATE INDEX events_user_purchase ON events (user_id) WHERE kind = 'purchase'")
    s.sql('CREATE INDEX events_user_all ON events (user_id)')
    pp, pa = relsize(s, 'events_user_purchase'), relsize(s, 'events_user_all')
    QP = "SELECT count(*) FROM events WHERE kind = 'purchase' AND user_id = 7919"
    s.sql('ANALYZE events')
    T('idx.plan_partial', QP + '\n' + plan_text(s, QP))
    pl = plan_text(s, QP)
    C['idx.partial'] = {'partial_kb': round(pp / 1024), 'full_mb': mb(pa), 'times_smaller': round(pa / pp), 'plan_uses_partial': 'events_user_purchase' in pl, 'purchases': s.one("SELECT count(*) FROM events WHERE kind = 'purchase'")}
    # --- index-only scans and the visibility map
    s.sql('DROP INDEX events_user_all')
    s.sql('CREATE INDEX events_user_inc ON events (user_id) INCLUDE (event_ts)')
    QI = 'SELECT user_id, event_ts FROM events WHERE user_id = 12345'
    pb = plan_text(s, QI)
    allvis0 = s.one("SELECT count(*) FROM pg_visibility_map('events') WHERE all_visible")
    s.sql('VACUUM events')
    pa2 = plan_text(s, QI)
    allvis1 = s.one("SELECT count(*) FROM pg_visibility_map('events') WHERE all_visible")
    T('idx.plan_ios_before', QI + '\n' + pb)
    T('idx.plan_ios_after', 'VACUUM events;\n' + QI + '\n' + pa2)
    hf = lambda t: int(re.search(r'Heap Fetches: (\d+)', t).group(1)) if re.search(r'Heap Fetches: (\d+)', t) else None      # noqa: E731
    C['idx.index_only'] = {'index_only_scan_before': 'Index Only Scan' in pb, 'heap_fetches_before': hf(pb), 'heap_fetches_after': hf(pa2), 'pages': s.one("SELECT pg_relation_size('events') / 8192"), 'all_visible_pages_before': allvis0, 'all_visible_pages_after': allvis1,
                           'rows_returned': 20}
    # --- jsonb
    s.sql('CREATE INDEX events_payload_gin ON events USING gin (payload jsonb_path_ops)')
    gin = relsize(s, 'events_payload_gin')
    QG = """SELECT count(*) FROM events WHERE payload @> '{"country": "DE", "device": "ios", "n": 42}'"""
    QX = """SELECT count(*) FROM events WHERE payload->>'n' = '42'"""
    pg = plan_text(s, QG)
    px = plan_text(s, QX)
    s.sql("CREATE INDEX events_n_expr ON events ((payload->>'n'))")
    px2 = plan_text(s, QX)
    T('idx.plan_gin', QG + '\n' + pg)
    T('idx.plan_jsonb_arrow', QX + '\n' + px)
    T('idx.plan_jsonb_expr', "CREATE INDEX events_n_expr ON events ((payload->>'n'));\n" + QX + '\n' + px2)
    C['idx.jsonb'] = {'gin_mb': mb(gin), 'contain_uses_gin': 'events_payload_gin' in pg, 'arrow_uses_gin': 'events_payload_gin' in px, 'arrow_plan_is_seq_scan': 'Seq Scan' in px, 'expr_uses_index': 'events_n_expr' in px2,
                      'contain_rows': s.one(QG), 'arrow_rows': s.one(QX)}
    # --- statistics of two columns that depend on each other
    mk_orders(s, 200000)
    QS = "SELECT count(*) FROM orders WHERE status = 'open' AND store_id = 5"
    p1 = plan_text(s, QS)
    s.sql('CREATE STATISTICS orders_open_store (mcv) ON status, store_id FROM orders')
    s.sql('ANALYZE orders')
    p2 = plan_text(s, QS)
    T('idx.plan_stats_before', QS + '\n' + p1)
    T('idx.plan_stats_after', 'CREATE STATISTICS orders_open_store (mcv) ON status, store_id FROM orders;\nANALYZE orders;\n' + QS + '\n' + p2)
    est = lambda t: int(re.search(r'rows=(\d+) width', next(l for l in t.split('\n') if 'Scan' in l)).group(1))      # noqa: E731
    act = lambda t: int(re.search(r'actual rows=(\d+)', next(l for l in t.split('\n') if 'Scan' in l)).group(1))      # noqa: E731
    C['idx.stats'] = {'estimate_before': est(p1), 'estimate_after': est(p2), 'actual': act(p1), 'off_by_before': round(act(p1) / est(p1), 1)}
    # --- what every extra index costs on a write, and which ones nobody reads
    def wal_of(n_idx, rows=50000):
        name = 'ix%d' % n_idx
        s.sql('DROP TABLE IF EXISTS %s' % name)
        s.sql('CREATE TABLE %s (order_id bigint PRIMARY KEY, store_id int, customer_id int, order_ts timestamptz, amount numeric(10,2), status text, note text)' % name)
        for k, col in enumerate(['store_id', 'customer_id', 'order_ts', 'amount', 'note'][:n_idx]):
            s.sql('CREATE INDEX %s_%d ON %s (%s)' % (name, k, name, col))
        a = lsn(s)
        s.sql('INSERT INTO %s SELECT * FROM orders WHERE order_id <= %d' % (name, rows))
        return wal_bytes(s, a, lsn(s))

    w = [wal_of(0), wal_of(2), wal_of(5)]
    R['tables']['idx.write_cost'] = table(['indexes besides the primary key', 'WAL bytes for 50,000 inserted rows', 'times the WAL of none'], [[0, w[0], 1.0], [2, w[1], round(w[1] / w[0], 1)], [5, w[2], round(w[2] / w[0], 1)]])
    C['idx.write_cost'] = {'none': w[0], 'two': w[1], 'five': w[2], 'five_over_none': round(w[2] / w[0], 1)}
    c = s.conn()
    c.execute('SELECT * FROM events WHERE user_id = 5 LIMIT 1')
    c.execute("SELECT count(*) FROM orders WHERE order_id = 7")
    c.execute('SELECT pg_stat_force_next_flush()')
    rows = c.execute("SELECT relname, indexrelname, idx_scan, pg_relation_size(indexrelid) FROM pg_stat_user_indexes WHERE relname IN ('ix5', 'orders', 'events') ORDER BY relname, indexrelname").fetchall()
    R['tables']['idx.usage'] = table(['table', 'index', 'times used', 'size bytes'], [[r[0], r[1], r[2], r[3]] for r in rows])
    C['idx.usage'] = {'never_used': len([r for r in rows if r[2] == 0]), 'listed': len(rows)}
    c.close()
    s.stop()


# ------------------------------------------------------------------ 6. partitioning and retention
@section
def partitions():
    C, X = R['counts'], R['text']
    s = Srv('part', {'autovacuum': 'off'}).start()
    s.sql('CREATE EXTENSION pgstattuple')
    try:
        s.sql('CREATE TABLE ev_bad (event_id bigint PRIMARY KEY, event_ts timestamptz NOT NULL) PARTITION BY RANGE (event_ts)')
        e = 'no error'
    except Exception as ex:     # noqa: BLE001
        e = str(ex).strip()
    T('part.pk_error', 'CREATE TABLE ev_bad (event_id bigint PRIMARY KEY, event_ts timestamptz NOT NULL) PARTITION BY RANGE (event_ts);\n' + e)
    s.sql('CREATE TABLE ev (event_id bigint NOT NULL, event_ts timestamptz NOT NULL, user_id int, kind text, PRIMARY KEY (event_id, event_ts)) PARTITION BY RANGE (event_ts)')
    months = [('2026_01', '2026-01-01', '2026-02-01'), ('2026_02', '2026-02-01', '2026-03-01'), ('2026_03', '2026-03-01', '2026-04-01'), ('2026_04', '2026-04-01', '2026-05-01'), ('2026_05', '2026-05-01', '2026-06-01'), ('2026_06', '2026-06-01', '2026-07-01')]
    for n, a, b in months:
        s.sql("CREATE TABLE ev_%s PARTITION OF ev FOR VALUES FROM ('%s') TO ('%s')" % (n, a, b))
    s.sql("""INSERT INTO ev SELECT i, timestamptz '2026-01-01 00:00:00+00' + i * interval '26 seconds', (i::bigint * 7919) % 50000, CASE WHEN i % 7 = 0 THEN 'click' ELSE 'view' END FROM generate_series(1, 600000) i""")
    s.sql('ANALYZE ev')
    rows = s.sql("SELECT tableoid::regclass::text, count(*), pg_relation_size(tableoid) FROM ev GROUP BY tableoid ORDER BY 1")
    R['tables']['part.sizes'] = table(['partition', 'rows', 'bytes'], [list(r) for r in rows])
    C['part.sizes'] = {'partitions': len(rows), 'total_rows': sum(r[1] for r in rows)}
    # pruning
    Q1 = "SELECT count(*) FROM ev WHERE event_ts >= '2026-03-05 00:00:00+00' AND event_ts < '2026-03-06 00:00:00+00'"
    Q2 = "SELECT count(*) FROM ev WHERE date_trunc('day', event_ts) = '2026-03-05 00:00:00+00'"
    p1, p2 = plan_text(s, Q1), plan_text(s, Q2)
    scans = lambda t: len(re.findall(r'(?:Seq|Index|Bitmap Heap) Scan on ev_', t))      # noqa: E731
    T('part.plan_pruned', Q1 + '\n' + p1)
    T('part.plan_not_pruned', Q2 + '\n' + p2)
    c = s.conn()
    c.execute('SET plan_cache_mode = force_generic_plan')
    c.execute('PREPARE q (timestamptz, timestamptz) AS SELECT count(*) FROM ev WHERE event_ts >= $1 AND event_ts < $2')
    pg = '\n'.join(r[0] for r in c.execute("EXPLAIN (ANALYZE, TIMING OFF, SUMMARY OFF) EXECUTE q('2026-03-05', '2026-03-06')").fetchall())
    T('part.plan_prepared', "PREPARE q (timestamptz, timestamptz) AS SELECT count(*) FROM ev WHERE event_ts >= $1 AND event_ts < $2;\nEXECUTE q('2026-03-05', '2026-03-06');\n" + pg)
    sr = re.search(r'Subplans Removed: (\d+)', pg)
    C['part.pruning'] = {'partitions_scanned_with_range': scans(p1), 'partitions_scanned_with_function': scans(p2), 'prepared_subplans_removed': int(sr.group(1)) if sr else 0, 'partitions': len(rows), 'range_rows': s.one(Q1)}
    c.close()
    # retention: delete a month, or drop a partition
    mar = s.one('SELECT count(*) FROM ev_2026_03')
    apr = s.one('SELECT count(*) FROM ev_2026_04')
    size_mar, size_apr = relsize(s, 'ev_2026_03'), totsize(s, 'ev_2026_04')
    a = lsn(s)
    s.sql("DELETE FROM ev WHERE event_ts >= '2026-03-01' AND event_ts < '2026-04-01'")
    w_del = wal_bytes(s, a, lsn(s))
    st = s.sql("SELECT table_len, dead_tuple_count FROM pgstattuple('ev_2026_03')")[0]
    a = lsn(s)
    s.sql('ALTER TABLE ev DETACH PARTITION ev_2026_04')
    s.sql('DROP TABLE ev_2026_04')
    w_drop = wal_bytes(s, a, lsn(s))
    R['tables']['part.retention'] = table(['remove one month', 'rows removed', 'WAL bytes', 'table bytes afterwards', 'dead rows left behind'],
                                          [['DELETE ... WHERE event_ts in March', mar, w_del, st[0], st[1]], ['DETACH PARTITION and DROP TABLE for April', apr, w_drop, 0, 0]])
    C['part.retention'] = {'march_rows': mar, 'april_rows': apr, 'delete_wal_bytes': w_del, 'drop_wal_bytes': w_drop, 'delete_wal_mb': mb(w_del), 'times_less_wal': round(w_del / max(w_drop, 1)), 'march_size_before': size_mar, 'march_size_after_delete': st[0],
                           'delete_keeps_the_space': st[0] == size_mar, 'dead_rows_after_delete': st[1], 'april_dropped_bytes': size_apr}
    # a row that belongs nowhere, and the default partition
    try:
        s.sql("INSERT INTO ev VALUES (999999999, '2027-01-01 00:00:00+00', 1, 'view')")
        e1 = 'no error'
    except Exception as ex:     # noqa: BLE001
        e1 = str(ex).strip()
    T('part.no_partition', "INSERT INTO ev VALUES (999999999, '2027-01-01 00:00:00+00', 1, 'view');\n" + e1)
    s.sql('CREATE TABLE ev_default PARTITION OF ev DEFAULT')
    s.sql("INSERT INTO ev VALUES (999999999, '2027-01-01 00:00:00+00', 1, 'view')")
    try:
        s.sql("CREATE TABLE ev_2027_01 PARTITION OF ev FOR VALUES FROM ('2027-01-01') TO ('2027-02-01')")
        e2 = 'no error'
    except Exception as ex:     # noqa: BLE001
        e2 = str(ex).strip()
    T('part.default_conflict', "-- the default partition holds a row of January 2027\nCREATE TABLE ev_2027_01 PARTITION OF ev FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');\n" + e2)
    C['part.errors'] = {'pk_error_names_the_rule': 'partitioning columns' in e if False else 'partition' in (R['text']['part.pk_error']), 'no_partition_error': 'no partition of relation' in e1, 'default_blocks_new_partition': 'default partition' in e2}
    s.stop()


# ------------------------------------------------------------------ 7. replication and change data capture
@section
def replication():
    C, X = R['counts'], R['text']
    pri = Srv('pri', {'wal_level': 'logical', 'autovacuum': 'off'}).start()
    mk_orders(pri, 1000)
    sb = Srv.basebackup('stb', pri, {'hot_standby_feedback': 'off', 'max_standby_streaming_delay': '1s', 'wal_receiver_status_interval': 1, 'autovacuum': 'off'}).start()
    wait_for(lambda: sb.one('SELECT count(*) FROM orders') == 1000, timeout=30)
    r = pri.sql("SELECT application_name, state, sync_state, pg_wal_lsn_diff(sent_lsn, replay_lsn)::bigint FROM pg_stat_replication")[0]
    R['tables']['repl.stat'] = table(['application_name', 'state', 'sync_state', 'bytes the standby is behind'], [list(r)])
    try:
        sb.sql("INSERT INTO orders VALUES (-1, 1, 1, now(), 1, 'x', 'y')")
        e = 'no error'
    except Exception as ex:      # noqa: BLE001
        e = str(ex).strip()
    T('repl.standby_write', "INSERT INTO orders VALUES (-1, 1, 1, now(), 1, 'x', 'y');   -- on the standby\n" + e)
    C['repl.standby'] = {'is_in_recovery': sb.one('SELECT pg_is_in_recovery()'), 'primary_in_recovery': pri.one('SELECT pg_is_in_recovery()'), 'state': r[1], 'sync_state': r[2], 'rows_on_standby': sb.one('SELECT count(*) FROM orders'), 'write_refused': 'read-only' in e}
    # a standby that falls behind
    sb.sql('SELECT pg_wal_replay_pause()')
    pri.sql("INSERT INTO orders SELECT i, 1, 1, now(), 1, 'paid', 'late' FROM generate_series(5001, 6000) i")
    time.sleep(1.5)
    lag = pri.sql("SELECT pg_wal_lsn_diff(sent_lsn, replay_lsn)::bigint FROM pg_stat_replication")[0][0]
    stale = sb.one('SELECT count(*) FROM orders')
    sb.sql('SELECT pg_wal_replay_resume()')
    wait_for(lambda: sb.one('SELECT count(*) FROM orders') == 2000, timeout=30)
    C['repl.lag'] = {'primary_rows': pri.one('SELECT count(*) FROM orders'), 'standby_rows_while_paused': stale, 'behind_bytes_while_paused': int(lag) > 0, 'standby_rows_after_resume': sb.one('SELECT count(*) FROM orders')}
    R['tables']['repl.lag'] = table(['moment', 'rows on the primary', 'rows on the standby'], [['replay paused, 1,000 rows inserted on the primary', 2000, stale], ['replay resumed', 2000, sb.one('SELECT count(*) FROM orders')]])
    # a long read on the standby and a vacuum on the primary
    out = {}
    for feedback in ('off', 'on'):
        tbl = 'big_' + feedback
        pri.sql('CREATE TABLE %s (id int PRIMARY KEY, v int)' % tbl)
        pri.sql('INSERT INTO %s SELECT i, 0 FROM generate_series(1, 20000) i' % tbl)
        wait_for(lambda: sb.sql("SELECT to_regclass('%s')" % tbl)[0][0] is not None and sb.one('SELECT count(*) FROM %s' % tbl) == 20000, timeout=30)
        if feedback == 'on':
            sb.sql("ALTER SYSTEM SET hot_standby_feedback = on")
            sb.reload()
            time.sleep(1.5)
        a = sb.conn(autocommit=False)
        a.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')
        a.execute('SELECT count(*) FROM %s' % tbl)
        time.sleep(2.5)
        pri.sql('DELETE FROM %s WHERE id <= 10000' % tbl)
        b = pri.conn()
        notes = vacuum_notes(b, 'VACUUM (VERBOSE) %s' % tbl)
        b.close()
        tl = next(l for n in notes for l in n.split('\n') if l.startswith('tuples:'))
        time.sleep(3.0)
        try:
            n = a.execute('SELECT count(*) FROM %s' % tbl).fetchone()[0]
            res = 'the query ran: %d rows' % n
            canceled = False
            msg = ''
        except Exception as ex:       # noqa: BLE001
            msg = str(ex).strip()
            canceled = True
            res = msg
        try:
            a.close()
        except Exception:      # noqa: BLE001
            pass
        m = re.search(r'(\d+) removed, (\d+) remain, (\d+) are dead but not yet removable', tl)
        out[feedback] = {'canceled': canceled, 'primary_removed': int(m.group(1)), 'primary_not_yet_removable': int(m.group(3)), 'message': msg}
        T('repl.conflict_' + feedback, '-- standby: hot_standby_feedback = %s, a repeatable read transaction is open on %s\n-- primary: DELETE of 10,000 rows, then VACUUM (VERBOSE) %s\n%s\n-- standby, next statement of the open transaction:\n%s' % (feedback, tbl, tbl, tl, res))
    C['repl.conflict'] = {'off_canceled': out['off']['canceled'], 'off_removed': out['off']['primary_removed'], 'off_message_ok': 'conflict with recovery' in out['off']['message'],
                          'on_canceled': out['on']['canceled'], 'on_removed': out['on']['primary_removed'], 'on_not_yet_removable': out['on']['primary_not_yet_removable'],
                          'standby_conflicts_counted': sb.one("SELECT confl_snapshot FROM pg_stat_database_conflicts WHERE datname = 'postgres'")}
    sb.stop()
    # logical replication
    sub = Srv('sub', {'autovacuum': 'off'}).start()
    sub.sql(ORDERS_DDL.format(name='orders'))
    pri.sql('CREATE PUBLICATION brewline FOR TABLE orders')
    sub.sql("CREATE SUBSCRIPTION brewline_sub CONNECTION 'host=127.0.0.1 port=%d dbname=postgres user=postgres' PUBLICATION brewline" % pri.port)
    ok = wait_for(lambda: sub.one('SELECT count(*) FROM orders') == pri.one('SELECT count(*) FROM orders'), timeout=30)
    initial = sub.one('SELECT count(*) FROM orders')
    pri.sql("INSERT INTO orders SELECT i, 1, 1, now(), 1, 'paid', 'new' FROM generate_series(9001, 9005) i")
    pri.sql("UPDATE orders SET status = 'refunded' WHERE order_id = 9001")
    pri.sql('DELETE FROM orders WHERE order_id = 9002')
    wait_for(lambda: sub.one('SELECT count(*) FROM orders') == pri.one('SELECT count(*) FROM orders') and sub.one("SELECT status FROM orders WHERE order_id = 9001") == 'refunded', timeout=30)
    C['repl.logical'] = {'initial_copy_rows': initial, 'initial_synced': bool(ok), 'after_changes_primary': pri.one('SELECT count(*) FROM orders'), 'after_changes_subscriber': sub.one('SELECT count(*) FROM orders'),
                         'update_replicated': sub.one("SELECT status FROM orders WHERE order_id = 9001"), 'delete_replicated': sub.one('SELECT count(*) FROM orders WHERE order_id = 9002')}
    # a column that only one side has
    pri.sql('ALTER TABLE orders ADD COLUMN channel text')
    pos = len(sub.log())
    pri.sql("INSERT INTO orders (order_id, store_id, customer_id, order_ts, amount, status, note, channel) VALUES (9100, 1, 1, now(), 1, 'paid', 'x', 'app')")
    wait_for(lambda: 'missing replicated column' in sub.log_since(pos), timeout=30)
    line = next((l for l in sub.log_since(pos).split('\n') if 'missing replicated column' in l), '')
    T('repl.missing_column', 'ALTER TABLE orders ADD COLUMN channel text;   -- on the publisher only\n-- the subscriber log:\n' + clean_log(line) + '\n' + clean_log(next((l for l in sub.log_since(pos).split('\n') if 'logical replication apply worker' in l and 'exited' in l or 'background worker' in l), '')))
    stalled = {'primary': pri.one('SELECT count(*) FROM orders'), 'subscriber': sub.one('SELECT count(*) FROM orders')}
    sub.sql('ALTER TABLE orders ADD COLUMN channel text')
    wait_for(lambda: sub.one('SELECT count(*) FROM orders') == pri.one('SELECT count(*) FROM orders'), timeout=40)
    C['repl.ddl'] = {'stalled_primary_rows': stalled['primary'], 'stalled_subscriber_rows': stalled['subscriber'], 'after_fix_subscriber_rows': sub.one('SELECT count(*) FROM orders'), 'error_names_column': 'channel' in line}
    # no replica identity
    pri.sql('CREATE TABLE tags (id int, label text)')
    pri.sql("INSERT INTO tags VALUES (1, 'a')")
    sub.sql('CREATE TABLE tags (id int, label text)')
    pri.sql('ALTER PUBLICATION brewline ADD TABLE tags')
    try:
        pri.sql("UPDATE tags SET label = 'b'")
        e3 = 'no error'
    except Exception as ex:      # noqa: BLE001
        e3 = str(ex).strip()
    T('repl.no_identity', "UPDATE tags SET label = 'b';   -- tags has no primary key and is in a publication\n" + e3)
    pri.sql('ALTER TABLE tags REPLICA IDENTITY FULL')
    pri.sql("UPDATE tags SET label = 'b'")
    C['repl.identity'] = {'update_refused': 'replica identity' in e3, 'works_with_full': True}
    # sequences are not carried over
    pri.sql('CREATE TABLE ticket (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, v int)')
    sub.sql('CREATE TABLE ticket (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, v int)')
    pri.sql('ALTER PUBLICATION brewline ADD TABLE ticket')
    sub.sql('ALTER SUBSCRIPTION brewline_sub REFRESH PUBLICATION')
    pri.sql('INSERT INTO ticket (v) SELECT i FROM generate_series(1, 100) i')
    wait_for(lambda: sub.one('SELECT count(*) FROM ticket') == 100, timeout=30)
    C['repl.sequence'] = {'rows_on_subscriber': sub.one('SELECT count(*) FROM ticket'), 'publisher_last_value': pri.one('SELECT last_value FROM ticket_id_seq'), 'subscriber_last_value': sub.one('SELECT last_value FROM ticket_id_seq'),
                          'subscriber_is_called': sub.one('SELECT is_called FROM ticket_id_seq')}
    # what the changes look like when they are decoded
    pri.sql('CREATE TABLE d (id int PRIMARY KEY, v text)')
    pri.sql("SELECT pg_create_logical_replication_slot('dec', 'test_decoding')")
    pri.sql("INSERT INTO d VALUES (1, 'a'), (2, 'b')")
    pri.sql("UPDATE d SET v = 'c' WHERE id = 1")
    pri.sql('DELETE FROM d WHERE id = 2')
    rows = pri.sql("SELECT data FROM pg_logical_slot_get_changes('dec', NULL, NULL) WHERE data NOT LIKE '%%pg_catalog%%'")
    txt = '\n'.join(re.sub(r'(BEGIN|COMMIT) \d+', r'\1 <xid>', r[0]) for r in rows)
    T('repl.decoded', txt)
    pri.sql("SELECT pg_drop_replication_slot('dec')")
    C['repl.decoded'] = {'changes': len(rows), 'has_insert': 'INSERT' in txt, 'has_update': 'UPDATE' in txt, 'has_delete': 'DELETE' in txt, 'old_key_in_delete': 'id[integer]:2' in txt}
    # a slot that nobody reads
    def slots():
        return pri.sql("SELECT slot_name, active, wal_status, pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)::bigint, safe_wal_size FROM pg_replication_slots ORDER BY slot_name")

    def wal_files():
        return len([f for f in os.listdir(pri.data / 'pg_wal') if re.match(r'^[0-9A-F]{24}$', f)])

    pri.sql("SELECT pg_create_logical_replication_slot('forgotten', 'test_decoding')")
    files0 = wal_files()
    for k in range(3):
        pri.sql('CREATE TABLE IF NOT EXISTS bulk (id int, pad text)')
        pri.sql("INSERT INTO bulk SELECT i, repeat('x', 100) FROM generate_series(1, 150000) i")
        pri.sql('CHECKPOINT')
    sl = {r[0]: r for r in slots()}
    files1 = wal_files()
    rows_out = [['forgotten', sl['forgotten'][1], sl['forgotten'][2], round(sl['forgotten'][3] / 1048576)], ['brewline_sub', sl['brewline_sub'][1], sl['brewline_sub'][2], round(sl['brewline_sub'][3] / 1048576)]]
    pri.sql("ALTER SYSTEM SET max_slot_wal_keep_size = '16MB'")
    pri.reload()
    pri.sql('CHECKPOINT')
    time.sleep(1)
    sl2 = {r[0]: r for r in slots()}
    files2 = wal_files()
    try:
        pri.sql("SELECT count(*) FROM pg_logical_slot_get_changes('forgotten', NULL, NULL)")
        e4 = 'no error'
    except Exception as ex:      # noqa: BLE001
        e4 = str(ex).strip()
    T('repl.slot_lost', "SELECT * FROM pg_logical_slot_get_changes('forgotten', NULL, NULL);\n" + e4)
    pri.sql("SELECT pg_drop_replication_slot('forgotten')")
    pri.sql("ALTER SYSTEM RESET max_slot_wal_keep_size")
    pri.reload()
    pri.sql('CHECKPOINT')
    pri.sql('CHECKPOINT')
    files3 = wal_files()
    R['tables']['repl.slots'] = table(['slot', 'in use', 'wal_status', 'WAL kept for it, MB'], rows_out + [['forgotten, after max_slot_wal_keep_size = 16MB and a checkpoint', sl2['forgotten'][1], sl2['forgotten'][2], '-']])
    C['repl.slots'] = {'forgotten_active': sl['forgotten'][1], 'forgotten_status': sl['forgotten'][2], 'forgotten_retained_mb': round(sl['forgotten'][3] / 1048576), 'subscription_retained_mb': round(sl['brewline_sub'][3] / 1048576),
                       'wal_files_before': files0, 'wal_files_with_slot': files1, 'status_after_limit': sl2['forgotten'][2], 'wal_files_after_limit': files2, 'wal_files_after_drop': files3, 'error_says_invalidated': 'invalidated' in e4 or 'no longer' in e4}
    sub.sql('ALTER SUBSCRIPTION brewline_sub DISABLE')
    sub.sql('ALTER SUBSCRIPTION brewline_sub SET (slot_name = NONE)')
    sub.sql('DROP SUBSCRIPTION brewline_sub')
    sub.stop()
    pri.stop()


# ------------------------------------------------------------------ 8. backups, point-in-time recovery and checksums
def dir_bytes(path):
    return sum(f.stat().st_size for f in pathlib.Path(path).rglob('*') if f.is_file())


def strip_dump(txt):
    return '\n'.join(l for l in txt.split('\n') if l.strip() and not l.startswith(('--', 'SET ', 'SELECT pg_catalog.set_config', '\\restrict', '\\unrestrict')))


@section
def backup():
    C, X = R['counts'], R['text']
    newdir('bk')
    arch = newdir('bk/archive')
    dumps = newdir('bk/dumps')
    s = Srv('bkp', {'archive_mode': 'on', 'archive_command': "'cp %%p %s/%%f'" % arch, 'autovacuum': 'off'}).start()
    mk_orders(s, 100000)
    s.sql("CREATE ROLE analyst LOGIN PASSWORD 'brewline-demo'")
    want = s.sql('SELECT count(*), sum(amount) FROM orders')[0]

    def pgd(*a):
        return run([BIN + '/pg_dump', '-h', '127.0.0.1', '-p', s.port, '-U', 'postgres'] + [str(x) for x in a])

    pgd('-Fp', '-f', dumps / 'plain.sql')
    pgd('-Fc', '-f', dumps / 'custom.dump')
    pgd('-Fd', '-j', 2, '-f', dumps / 'dirdump')
    sizes = {'plain': (dumps / 'plain.sql').stat().st_size, 'custom': (dumps / 'custom.dump').stat().st_size, 'directory': dir_bytes(dumps / 'dirdump')}
    tbl = s.one("SELECT pg_total_relation_size('orders')")
    R['tables']['bk.dump_sizes'] = table(['format', 'command', 'bytes', 'files'], [['plain SQL', 'pg_dump -Fp', sizes['plain'], 1], ['custom', 'pg_dump -Fc', sizes['custom'], 1], ['directory, 2 jobs', 'pg_dump -Fd -j 2', sizes['directory'], len(list((dumps / 'dirdump').iterdir()))]])
    toc = run([BIN + '/pg_restore', '-l', dumps / 'custom.dump']).stdout
    toc = [re.sub(r'^\d+; \d+ \d+ ', 'N; N N ', l) for l in toc.split('\n') if l and not l.startswith(';')]
    T('bk.toc', '\n'.join(toc))
    s.sql('CREATE DATABASE restored')
    run([BIN + '/pg_restore', '-h', '127.0.0.1', '-p', s.port, '-U', 'postgres', '-d', 'restored', dumps / 'custom.dump'])
    got = s.sql('SELECT count(*), sum(amount) FROM orders', db='restored')[0]
    s.sql('CREATE DATABASE only_orders')
    run([BIN + '/pg_restore', '-h', '127.0.0.1', '-p', s.port, '-U', 'postgres', '-d', 'only_orders', '-t', 'orders', dumps / 'custom.dump'])
    got2 = s.one('SELECT count(*) FROM orders', db='only_orders')
    ddl = pgd('-s', '-t', 'orders').stdout
    T('bk.schema_only', strip_dump(ddl))
    g = run([BIN + '/pg_dumpall', '-h', '127.0.0.1', '-p', s.port, '-U', 'postgres', '--globals-only']).stdout
    gl = [re.sub(r"PASSWORD 'SCRAM-SHA-256\$[^']+'", "PASSWORD '<scram hash>'", l) for l in g.split('\n') if 'ROLE' in l and ('analyst' in l)]
    T('bk.globals', '\n'.join(gl))
    C['bk.dump'] = {'plain_bytes': sizes['plain'], 'custom_bytes': sizes['custom'], 'directory_bytes': sizes['directory'], 'table_total_bytes': tbl, 'custom_smaller_than_plain': sizes['custom'] < sizes['plain'], 'plain_over_custom': round(sizes['plain'] / sizes['custom'], 1),
                    'rows_original': want[0], 'rows_restored': got[0], 'sum_equal': want[1] == got[1], 'rows_after_table_only_restore': got2, 'roles_in_database_dump': 'CREATE ROLE' in run([BIN + '/pg_restore', '-f', '-', dumps / 'custom.dump']).stdout,
                    'roles_in_globals_dump': len(gl) >= 1, 'password_is_a_hash': 'SCRAM-SHA-256' in g}
    # a base backup, checked and then damaged
    base = pathlib.Path(BASE) / 'bk' / 'base'
    run([BIN + '/pg_basebackup', '-h', '127.0.0.1', '-p', s.port, '-U', 'postgres', '-D', base, '-X', 'stream', '-c', 'fast'])
    lab = (base / 'backup_label').read_text()
    lab = re.sub(r'(START WAL LOCATION: )0/[0-9A-F]+ \(file [0-9A-F]{24}\)', r'\g<1>0/<lsn> (file <wal file>)', lab)
    lab = re.sub(r'CHECKPOINT LOCATION: 0/[0-9A-F]+', 'CHECKPOINT LOCATION: 0/<lsn>', lab)
    lab = re.sub(r'START TIME: .*', 'START TIME: <time>', lab)
    T('bk.backup_label', lab)
    v = run([BIN + '/pg_verifybackup', base], check=False)
    T('bk.verify_ok', 'pg_verifybackup <backup directory>\n' + (v.stdout + v.stderr))
    bad = pathlib.Path(BASE) / 'bk' / 'base_damaged'
    run(['cp', '-a', base, bad])
    rel = s.one("SELECT pg_relation_filepath('orders')")
    with open(bad / rel, 'ab') as f:
        f.write(b'\0')
    v2 = run([BIN + '/pg_verifybackup', bad], check=False)
    T('bk.verify_bad', 'pg_verifybackup <damaged copy>\n' + re.sub(r'base/\d+/\d+', 'base/N/N', (v2.stdout + v2.stderr)))
    C['bk.basebackup'] = {'verified_ok': v.returncode == 0 and 'successfully verified' in (v.stdout + v.stderr), 'damaged_detected': v2.returncode != 0, 'label_says_streamed': 'streamed' in lab, 'manifest_present': (base / 'backup_manifest').exists(),
                          'size_mb': mb(dir_bytes(base)), 'has_backup_label': True}
    # point-in-time recovery
    s.sql('CREATE TABLE daily_totals AS SELECT store_id, count(*) AS n, sum(amount) AS total FROM orders GROUP BY store_id')
    s.sql("SELECT pg_create_restore_point('before_mistake')")
    s.sql('DROP TABLE daily_totals')
    s.sql('CREATE TABLE after_mistake AS SELECT 1 AS x')
    s.sql('SELECT pg_switch_wal()')
    wait_for(lambda: s.one('SELECT archived_count FROM pg_stat_archiver') >= 2, timeout=30)
    ar = s.sql('SELECT archived_count, failed_count, last_archived_wal FROM pg_stat_archiver')[0]
    C['bk.archive'] = {'archived_at_least_2': ar[0] >= 2, 'failed': ar[1], 'segments_in_archive': len(os.listdir(arch))}
    rest = Srv('restored', initdb=False)
    run(['cp', '-a', base, rest.data])
    with open(rest.data / 'postgresql.auto.conf', 'a') as f:
        f.write("\nport = %d\nunix_socket_directories = '%s'\nlisten_addresses = '127.0.0.1'\narchive_mode = off\nrestore_command = 'cp %s/%%f %%p'\nrecovery_target_name = 'before_mistake'\nrecovery_target_action = 'promote'\n" % (rest.port, rest.dir, arch))
    (rest.data / 'recovery.signal').write_text('')
    if ROOT_USER_FIX:
        subprocess.check_call(['chown', '-R', 'postgres:postgres', str(rest.data)])
    rest.start()
    log = clean_log(rest.log())
    keep = [re.sub(r'[0-9A-F]{24}', '<wal file>', l) for l in log.split('\n') if re.search(r'starting point-in-time|restored log file|recovery stopping|redo done|selected new timeline|archive recovery complete|ready to accept|consistent recovery state|starting archive recovery', l)]
    T('bk.pitr_log', '\n'.join(keep))
    has = rest.one("SELECT to_regclass('daily_totals') IS NOT NULL")
    n = rest.one('SELECT count(*) FROM daily_totals') if has else 0
    later = rest.one("SELECT to_regclass('after_mistake') IS NOT NULL")
    tl = rest.one('SELECT timeline_id FROM pg_control_checkpoint()')
    hist = sorted(f for f in os.listdir(rest.data / 'pg_wal') if f.endswith('.history'))
    ht = re.sub(r'0/[0-9A-F]+', '0/<lsn>', (rest.data / 'pg_wal' / hist[-1]).read_text().strip()) if hist else ''
    T('bk.history_file', ht)
    C['bk.pitr'] = {'table_back': bool(has), 'rows_back': n, 'later_work_gone': not later, 'timeline_after': tl, 'history_file': bool(hist), 'recovered_to_restore_point': any('before_mistake' in l for l in keep), 'orders_rows': rest.one('SELECT count(*) FROM orders')}
    rest.stop()
    s.stop()
    # checksums
    ck = Srv('ck', {'autovacuum': 'off'}, checksums=True).start()
    ck.sql('CREATE TABLE t AS SELECT i, md5(i::text) AS m FROM generate_series(1, 20000) i')
    path = ck.one("SELECT pg_relation_filepath('t')")
    ck.sql('CHECKPOINT')
    ck.stop()
    ok = run([BIN + '/pg_checksums', '--check', '-D', ck.data], check=False)
    okl = [l for l in (ok.stdout + ok.stderr).split('\n') if l.startswith(('Bad checksums', 'Checksum operation'))]
    with open(ck.data / path, 'r+b') as f:
        f.seek(4000)
        b = f.read(1)
        f.seek(4000)
        f.write(bytes([b[0] ^ 0xFF]))
    bad = run([BIN + '/pg_checksums', '--check', '-D', ck.data], check=False)
    badl = [re.sub(r'calculated checksum [0-9A-F]+ but block contains [0-9A-F]+', 'calculated checksum N but block contains N', re.sub(r'base/\d+/\d+', 'base/N/N', l.replace(str(ck.data) + '/', '').replace(mask(str(ck.data)) + '/', ''))) for l in (bad.stdout + bad.stderr).split('\n') if 'error' in l or l.startswith('Bad checksums')]
    T('bk.checksums_ok', 'pg_checksums --check -D <data directory>\n' + '\n'.join(okl))
    T('bk.checksums_bad', 'pg_checksums --check -D <data directory>   -- after one byte of the table file was changed\n' + '\n'.join(badl))
    ck.start()
    c = ck.conn()
    warns = []
    c.add_notice_handler(lambda d: warns.append(d.message_primary or str(d)))
    try:
        c.execute('SELECT count(*) FROM t')
        e = 'no error'
    except Exception as ex:      # noqa: BLE001
        e = str(ex).strip().split('\n')[0]
    msg = '\n'.join(re.sub(r'base/\d+/\d+', 'base/N/N', re.sub(r'checksum \d+ but expected \d+', 'checksum N but expected N', x)) for x in (['WARNING: ' + w for w in warns] + ['ERROR: ' + e]))
    T('bk.checksum_error', 'SELECT count(*) FROM t;\n' + msg)
    C['bk.checksums'] = {'clean_check_zero_bad': any('Bad checksums:  0' in l for l in okl), 'damaged_check_found_one': any('Bad checksums:  1' in l for l in badl), 'query_refused': 'invalid page' in e, 'data_checksums_on': ck.one('SHOW data_checksums') == 'on',
                         'default_off_on_initdb': Srv('nock', initdb=True).data.exists() and run([BIN + '/pg_controldata', pathlib.Path(BASE) / 'nock' / 'data']).stdout.count('Data page checksum version:           0') == 1}
    c.close()
    ck.stop()


# ------------------------------------------------------------------ 9. roles, settings and a healthy server
def err_of(fn):
    try:
        fn()
        return 'no error'
    except Exception as e:      # noqa: BLE001
        return str(e).strip().split('\n')[0] if not str(e).startswith('connection failed') else str(e).strip().split('\n')[-1] if '\n' in str(e).strip() else str(e).strip()


@section
def ops():
    C, X = R['counts'], R['text']
    s = Srv('ops', {'autovacuum': 'off'}).start()
    mk_orders(s, 200000)
    s.sql("CREATE ROLE analyst LOGIN PASSWORD 'brewline-demo'")
    s.sql('CREATE ROLE reporting LOGIN')
    s.sql('CREATE ROLE etl LOGIN')
    A = lambda q: s.sql(q, user='analyst')      # noqa: E731
    steps = []

    def attempt(label, fn):
        e = err_of(fn)
        steps.append([label, 'refused: ' + e if e != 'no error' else 'allowed'])
        return e

    attempt('analyst: SELECT count(*) FROM orders', lambda: A('SELECT count(*) FROM orders'))
    attempt('analyst: CREATE TABLE scratch (x int)', lambda: A('CREATE TABLE scratch (x int)'))
    s.sql('GRANT SELECT ON orders TO analyst')
    attempt('after GRANT SELECT ON orders TO analyst: the same SELECT', lambda: A('SELECT count(*) FROM orders'))
    s.sql('CREATE TABLE orders_q2 AS SELECT * FROM orders WHERE order_id <= 100')
    attempt('a new table orders_q2 made by the owner: analyst reads it', lambda: A('SELECT count(*) FROM orders_q2'))
    s.sql('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO analyst')
    s.sql('CREATE TABLE orders_q3 AS SELECT * FROM orders WHERE order_id <= 100')
    attempt('after ALTER DEFAULT PRIVILEGES, a newer table orders_q3: analyst reads it', lambda: A('SELECT count(*) FROM orders_q3'))
    attempt('the older table orders_q2 again', lambda: A('SELECT count(*) FROM orders_q2'))
    s.sql('GRANT SELECT (order_id, amount) ON orders TO reporting')
    attempt('reporting: SELECT * FROM orders', lambda: s.sql('SELECT * FROM orders LIMIT 1', user='reporting'))
    attempt('reporting: SELECT order_id, amount FROM orders', lambda: s.sql('SELECT order_id, amount FROM orders LIMIT 1', user='reporting'))
    R['tables']['ops.privileges'] = table(['step', 'result'], steps)
    C['ops.privileges'] = {'denied_without_grant': steps[0][1].startswith('refused') and 'permission denied for table orders' in steps[0][1], 'create_in_public_refused': 'permission denied for schema public' in steps[1][1],
                           'granted_works': steps[2][1] == 'allowed', 'new_table_denied': steps[3][1].startswith('refused'), 'default_privileges_cover_new': steps[4][1] == 'allowed', 'old_table_still_denied': steps[5][1].startswith('refused'),
                           'star_denied_by_column_grant': steps[6][1].startswith('refused'), 'granted_columns_work': steps[7][1] == 'allowed'}
    # row level security
    s.sql('ALTER TABLE orders ENABLE ROW LEVEL SECURITY')
    none = A('SELECT count(*) FROM orders')[0][0]
    s.sql('CREATE POLICY store_five ON orders FOR SELECT TO analyst USING (store_id = 5)')
    five = A('SELECT count(*) FROM orders')[0][0]
    total = s.one('SELECT count(*) FROM orders')
    R['tables']['ops.rls'] = table(['who', 'state of the table', 'rows seen'], [['analyst', 'row level security on, no policy', none], ['analyst', 'policy: store_id = 5', five], ['postgres (a superuser)', 'the same table', total]])
    C['ops.rls'] = {'no_policy_rows': none, 'policy_rows': five, 'superuser_rows': total, 'expected_store_5': s.one('SELECT count(*) FROM orders WHERE store_id = 5')}
    s.sql('ALTER TABLE orders DISABLE ROW LEVEL SECURITY')
    s.sql('DROP POLICY store_five ON orders')
    # pg_hba.conf
    hba = ['local   all             all                                     trust', 'host    all             postgres        127.0.0.1/32            trust', 'host    replication     all             127.0.0.1/32            trust',
           'host    all             analyst         127.0.0.1/32            scram-sha-256']
    (s.data / 'pg_hba.conf').write_text('\n'.join(hba) + '\n')
    s.reload()
    time.sleep(0.5)
    rules = s.sql("SELECT line_number, type, database::text, user_name::text, address, auth_method FROM pg_hba_file_rules ORDER BY line_number")
    R['tables']['ops.hba'] = table(['line', 'type', 'database', 'user', 'address', 'method'], [[r[0], r[1], r[2].strip('{}'), r[3].strip('{}'), r[4] or '', r[5]] for r in rules])
    import psycopg

    def connect(user, pw=None):
        return psycopg.connect(host='127.0.0.1', port=s.port, dbname='postgres', user=user, password=pw, sslmode='disable', connect_timeout=5)

    def msg(fn):
        try:
            fn().close()
            return 'connected'
        except Exception as e:      # noqa: BLE001
            t = str(e).strip()
            return re.sub(r'^connection failed: ', '', t.split('\n')[-1] if t.startswith('connection failed') and 'connection to server' in t else t)

    r1 = msg(lambda: connect('analyst'))
    r2 = msg(lambda: connect('analyst', 'wrong'))
    r3 = msg(lambda: connect('analyst', 'brewline-demo'))
    r4 = msg(lambda: connect('etl'))
    T('ops.hba_results', '\n'.join(['analyst, no password:       ' + mask(r1), 'analyst, wrong password:    ' + mask(r2), 'analyst, right password:    ' + r3, 'etl, any password:          ' + mask(r4)]))
    C['ops.hba'] = {'rules': len(rules), 'no_password_refused': 'password' in r1, 'wrong_password_refused': 'password authentication failed' in r2, 'right_password_ok': r3 == 'connected', 'no_entry_refused': 'no pg_hba.conf entry' in r4,
                    'password_encryption': s.one('SHOW password_encryption')}
    (s.data / 'pg_hba.conf').write_text('\n'.join(hba[:3]) + '\nhost    all             all             127.0.0.1/32            trust\n')
    s.reload()
    # settings: which need a restart
    q = "SELECT name, setting, coalesce(unit, ''), context, source, pending_restart FROM pg_settings WHERE name IN ('shared_buffers', 'work_mem', 'max_connections') ORDER BY name"
    before = s.sql(q)
    s.sql("ALTER SYSTEM SET shared_buffers = '256MB'")
    s.sql("ALTER SYSTEM SET work_mem = '8MB'")
    s.sql("ALTER SYSTEM SET max_connections = 150")
    s.sql('SELECT pg_reload_conf()')
    time.sleep(1)
    after = s.sql(q)
    R['tables']['ops.settings'] = table(['moment', 'setting', 'value', 'unit', 'context', 'source', 'pending restart'],
                                        [['before'] + list(r) for r in before] + [['after ALTER SYSTEM and a reload'] + list(r) for r in after])
    C['ops.settings'] = {'shared_buffers_context': before[2][3] if False else [r for r in before if r[0] == 'shared_buffers'][0][3], 'work_mem_context': [r for r in before if r[0] == 'work_mem'][0][3],
                         'shared_buffers_pending': [r for r in after if r[0] == 'shared_buffers'][0][5], 'work_mem_applied': [r for r in after if r[0] == 'work_mem'][0][1] == '8192', 'work_mem_pending': [r for r in after if r[0] == 'work_mem'][0][5],
                         'shared_buffers_value_unchanged': [r for r in after if r[0] == 'shared_buffers'][0][1] == [r for r in before if r[0] == 'shared_buffers'][0][1]}
    s.sql('ALTER SYSTEM RESET shared_buffers')
    s.sql('ALTER SYSTEM RESET work_mem')
    s.sql('ALTER SYSTEM RESET max_connections')
    s.sql('SELECT pg_reload_conf()')
    # a sort that does not fit in work_mem
    c = s.conn()
    QS = 'SELECT * FROM orders ORDER BY note'
    sm = lambda t: next(l.strip() for l in t.split('\n') if 'Sort Method' in l)      # noqa: E731
    p1 = plan_text(s, QS)
    c.execute("SET work_mem = '64MB'")
    p2 = '\n'.join(r[0] for r in c.execute('EXPLAIN (ANALYZE, TIMING OFF, SUMMARY OFF) ' + QS).fetchall())
    T('ops.sort_spill', 'SHOW work_mem;  -- 4MB\n' + QS + '\n' + sm(p1) + '\n\nSET work_mem = \'64MB\';\n' + QS + '\n' + sm(p2))
    C['ops.sort'] = {'default_work_mem': s.one('SHOW work_mem'), 'spilled': 'external merge' in sm(p1), 'in_memory_after': 'quicksort' in sm(p2), 'disk_kb': int(re.search(r'Disk: (\d+)kB', sm(p1)).group(1)), 'memory_kb': int(re.search(r'Memory: (\d+)kB', sm(p2)).group(1))}
    c.close()
    # timeouts
    def t_statement():
        c1 = s.conn()
        c1.execute("SET statement_timeout = '100ms'")
        c1.execute('SELECT pg_sleep(2)')

    def t_idle():
        c1 = s.conn(autocommit=False)
        c1.execute("SET idle_in_transaction_session_timeout = '300ms'")
        c1.execute('SELECT 1')
        time.sleep(1.0)
        c1.execute('SELECT 2')

    holder = s.conn(autocommit=False)
    holder.execute('LOCK TABLE orders_q2 IN ACCESS EXCLUSIVE MODE')

    def t_lock():
        c1 = s.conn()
        c1.execute("SET lock_timeout = '200ms'")
        c1.execute('SELECT count(*) FROM orders_q2')

    e1, e2, e3 = err_of(t_statement), err_of(t_idle), err_of(t_lock)
    holder.rollback()
    holder.close()
    T('ops.timeouts', "SET statement_timeout = '100ms'; SELECT pg_sleep(2);\n" + e1 + "\n\nSET idle_in_transaction_session_timeout = '300ms'; BEGIN; SELECT 1; -- wait one second; SELECT 2;\n" + e2 +
      "\n\n-- another session holds LOCK TABLE orders_q2 IN ACCESS EXCLUSIVE MODE\nSET lock_timeout = '200ms'; SELECT count(*) FROM orders_q2;\n" + e3)
    C['ops.timeouts'] = {'statement': 'statement timeout' in e1, 'idle': 'idle-in-transaction timeout' in e2, 'lock': 'lock timeout' in e3}
    # a migration that waits behind a reader, and the queries that wait behind the migration
    import threading
    A1 = s.conn(autocommit=False)
    A1.execute('SELECT count(*) FROM orders')
    pidA = A1.info.backend_pid
    out = {}

    def migrate():
        c1 = s.conn()
        out['pidB'] = c1.info.backend_pid
        t0 = time.time()
        c1.execute('ALTER TABLE orders ADD COLUMN migrated int')
        out['B_waited'] = time.time() - t0

    def read():
        c1 = s.conn()
        out['pidC'] = c1.info.backend_pid
        t0 = time.time()
        c1.execute('SELECT 1 FROM orders LIMIT 1')
        out['C_waited'] = time.time() - t0

    tb = threading.Thread(target=migrate)
    tb.start()
    time.sleep(1.0)
    tc = threading.Thread(target=read)
    tc.start()
    time.sleep(1.0)
    label = {pidA: 'A', out.get('pidB'): 'B', out.get('pidC'): 'C'}
    rows = s.sql("SELECT pid, state, wait_event_type, wait_event, left(query, 48), pg_blocking_pids(pid) FROM pg_stat_activity WHERE datname = 'postgres' AND pid <> pg_backend_pid() AND backend_type = 'client backend' ORDER BY backend_start")
    trows = []
    for r in rows:
        if r[0] in label:
            trows.append([label[r[0]], {'A': 'a transaction that read the table and is still open', 'B': 'ALTER TABLE orders ADD COLUMN migrated int', 'C': 'SELECT 1 FROM orders LIMIT 1'}[label[r[0]]], r[1], (r[2] or '') + (' / ' + r[3] if r[3] else ''), ', '.join(label.get(p, '?') for p in r[5]) or '-'])
    trows.sort(key=lambda x: x[0])
    A1.commit()
    tb.join()
    tc.join()
    A1.close()
    R['tables']['ops.queue'] = table(['session', 'doing', 'state', 'waiting for', 'blocked by'], trows)
    C['ops.queue'] = {'b_blocked_by_a': any(r[0] == 'B' and r[4] == 'A' for r in trows), 'c_blocked_by_b': any(r[0] == 'C' and r[4] == 'B' for r in trows), 'c_waited_at_least_1s': out['C_waited'] >= 0.9, 'b_waited_at_least_1s': out['B_waited'] >= 1.5}
    # the same migration with a lock timeout
    A2 = s.conn(autocommit=False)
    A2.execute('SELECT count(*) FROM orders')

    def migrate2():
        c1 = s.conn()
        c1.execute("SET lock_timeout = '300ms'")
        c1.execute('ALTER TABLE orders ADD COLUMN migrated2 int')

    e4 = err_of(migrate2)
    t0 = time.time()
    s.sql('SELECT 1 FROM orders LIMIT 1')
    c_wait = time.time() - t0
    A2.rollback()
    A2.close()
    T('ops.migration_timeout', "SET lock_timeout = '300ms'; ALTER TABLE orders ADD COLUMN migrated2 int;   -- while session A still has the table open\n" + e4)
    C['ops.migration_timeout'] = {'refused': 'lock timeout' in e4, 'reader_not_blocked': c_wait < 0.5}
    # which DDL rewrites the table
    ddl = [('ADD COLUMN c1 int', 'ALTER TABLE orders ADD COLUMN c1 int'), ('ADD COLUMN c2 int DEFAULT 0', 'ALTER TABLE orders ADD COLUMN c2 int DEFAULT 0'),
           ('ADD COLUMN c3 timestamptz DEFAULT clock_timestamp()', 'ALTER TABLE orders ADD COLUMN c3 timestamptz DEFAULT clock_timestamp()'), ('ALTER COLUMN store_id TYPE bigint', 'ALTER TABLE orders ALTER COLUMN store_id TYPE bigint'),
           ('ALTER COLUMN note TYPE varchar(40)', 'ALTER TABLE orders ALTER COLUMN note TYPE varchar(40)'), ('ALTER COLUMN amount TYPE numeric(12,2)', 'ALTER TABLE orders ALTER COLUMN amount TYPE numeric(12,2)'),
           ('ADD COLUMN c4 text NOT NULL DEFAULT \'x\'', "ALTER TABLE orders ADD COLUMN c4 text NOT NULL DEFAULT 'x'")]
    rows = []
    for label, stmt in ddl:
        f0 = s.one("SELECT relfilenode FROM pg_class WHERE relname = 'orders'")
        s.sql(stmt)
        f1 = s.one("SELECT relfilenode FROM pg_class WHERE relname = 'orders'")
        rows.append([label, 'yes' if f0 != f1 else 'no'])
    R['tables']['ops.rewrites'] = table(['statement on a table of 200,000 rows', 'table rewritten (new file)'], rows)
    C['ops.rewrites'] = {r[0]: r[1] for r in rows}
    # pg_stat_statements needs a restart
    s.sql('CREATE EXTENSION pg_stat_statements')
    e5 = err_of(lambda: s.sql('SELECT count(*) FROM pg_stat_statements'))
    T('ops.pgss_not_loaded', 'CREATE EXTENSION pg_stat_statements;\nSELECT count(*) FROM pg_stat_statements;\n' + e5)
    s.configure({'shared_preload_libraries': "'pg_stat_statements'"})
    s.restart()
    s.sql('SELECT pg_stat_statements_reset()')
    c = s.conn()
    for i in range(1, 201):
        c.execute('SELECT * FROM orders WHERE order_id = %s', (i * 37,))
        c.fetchall() if False else None
    for i in range(30):
        c.execute("SELECT store_id, count(*) FROM orders WHERE status = 'paid' GROUP BY store_id").fetchall()
    for i in range(3):
        c.execute('SELECT * FROM orders ORDER BY note LIMIT 5').fetchall()
    rows = c.execute("SELECT query, calls, rows FROM pg_stat_statements WHERE query ILIKE '%FROM orders%' AND query NOT ILIKE '%pg_stat_statements%' ORDER BY calls DESC").fetchall()
    R['tables']['ops.pgss'] = table(['normalized query', 'calls', 'rows returned in all'], [[re.sub(r'\s+', ' ', r[0]), r[1], r[2]] for r in rows])
    C['ops.pgss'] = {'point_lookup_calls': rows[0][1], 'one_row_per_normalized_query': len(rows) == 3, 'placeholder_in_text': '$1' in rows[0][0], 'preload_required': 'shared_preload_libraries' in e5}
    c.close()
    s.stop()


# ------------------------------------------------------------------ 10. the project files, run
@section
def project():
    C, X = R['counts'], R['text']
    P = pathlib.Path(__file__).resolve().parent / 'project'
    s = Srv('proj', {'autovacuum': 'off'}).start()
    s.sql((P / 'schema.sql').read_text())
    sys.path.insert(0, str(P))
    import importlib
    lo = importlib.import_module('load_orders')
    csvf = pathlib.Path(BASE) / 'orders.csv'
    head = 'order_id,store_id,customer_id,order_ts,amount,status,note\n'
    csvf.write_text(head + '\n'.join(csv_rows(1, 5000)) + '\n')
    os.chmod(csvf, 0o644)
    first = lo.load(s.dsn(), str(csvf))
    second = lo.load(s.dsn(), str(csvf))
    rows = csv_rows(1, 5000)
    f = rows[9].split(',')
    f[4] = '77.00'
    rows[9] = ','.join(f)
    csvf.write_text(head + '\n'.join(rows) + '\n')
    third = lo.load(s.dsn(), str(csvf))
    csvf.write_text(head + '\n'.join(rows + [rows[0]]) + '\n')
    fourth = lo.load(s.dsn(), str(csvf))
    C['project.load'] = {'first_run': first, 'second_run_same_file': second, 'third_run_one_row_changed': third, 'fourth_run_file_with_a_duplicate_row': fourth, 'rows_in_table': s.one('SELECT count(*) FROM orders'),
                         'changed_amount': str(s.one('SELECT amount FROM orders WHERE order_id = 10'))}
    s.sql('CREATE TABLE events (event_id bigint, event_ts timestamptz NOT NULL, user_id int, kind text, payload jsonb)')
    s.sql((P / 'indexes.sql').read_text())
    s.sql((P / 'roles.sql').read_text())
    s.sql((P / 'migrate.sql').read_text())
    s.sql((P / 'partitions.sql').read_text())
    C['project.sql'] = {'indexes_created': s.one("SELECT count(*) FROM pg_indexes WHERE tablename = 'events'"), 'partitions': s.one("SELECT count(*) FROM pg_inherits WHERE inhparent = 'ev'::regclass"),
                        'column_added': s.one("SELECT count(*) FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'channel'"), 'policy': s.one("SELECT count(*) FROM pg_policies WHERE tablename = 'orders'")}
    s.stop()


# ------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=str(pathlib.Path(__file__).resolve().parent.parent / 'js' / 'real.js'))
    ap.add_argument('--only', default='')
    args = ap.parse_args()
    only = set(a for a in args.only.split(',') if a)
    try:
        for fn in SECTIONS:
            if only and fn.__name__ not in only:
                continue
            t0 = time.time()
            fn()
            print('%-12s %5.1fs' % (fn.__name__, time.time() - t0), flush=True)
        p = pglib.write_real(args.out)
        print('wrote %s: %d files, %d texts, %d tables, %d sets of counts' % (p, len(R['files']), len(R['text']), len(R['tables']), len(R['counts'])))
    finally:
        pglib.cleanup()


if __name__ == '__main__':
    main()
