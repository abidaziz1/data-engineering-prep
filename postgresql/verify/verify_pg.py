#!/usr/bin/env python3
"""Check the code and the recorded output of the PostgreSQL course.

 1. The files of the recording are the files of postgresql/verify/project, and every code screen that names such a file shows it.
 2. Every SQL text of the lessons (code screens, bug hunts and their fixes, the solution of the coding round, and every statement of the terminal replays) goes through
    pglast, which is the parser of PostgreSQL itself. The shell and Python snippets are parsed. The pg_hba.conf and the postgresql.conf of the project are loaded by a real server.
 3. The project is run: schema, loader (four runs), indexes, roles, migration and partitions, on a throwaway server.
 4. Twelve bug hunts are run next to their fixes on throwaway servers, and each one must do what the lesson says: a plain upsert rewrites every row, the GIN index is not used
    by ->>, the BRIN index is ignored on shuffled rows, the function on the partition key reads every partition, a delete writes the log that a drop does not, a DDL on the
    publisher stalls the subscriber, a table without a key refuses an update, a restore over production loses the day, a grant does not cover tomorrow, a migration without a
    lock timeout queues the readers behind it, and a type change rewrites the table, and VACUUM FULL makes a new file where VACUUM does not.
 5. The tools of the replays (pg_restore, pg_verifybackup, pg_checksums, pg_ctl, psql, pg_basebackup, pg_dump) are checked against their --help.
 6. The lab data: check_widgets.js recomputes the rules from the recording, and ten changes to the recording must make it fail.
 7. The lint of the course (dev/lint-content.js).
 8. With --recapture the whole recording is made again on this machine (about 90 seconds) and compared with js/real.js. Counts, plans and texts must repeat. Seconds, and the
    handful of background flushes of the log, may differ, and the allowances are listed below.
 9. With --browser the six labs are driven in Chromium (e2e_labs.js), and six changes to the widget code must make that test fail.

What this cannot show: how a managed service (Amazon RDS and Aurora, Cloud SQL, Azure), a connection pooler or an extension outside the contrib set behaves. Those screens carry the
"From documentation" tag, and the README lists what to check again.

Run:   python3 postgresql/verify/verify_pg.py [--recapture] [--browser] [--verbose]
Needs: the PostgreSQL 16 server programs (see requirements.txt), Python 3.11 or later with psycopg and pglast, and Node 20 or later. A check whose tool is missing says so and is skipped.
"""
import argparse
import ast
import json
import os
import pathlib
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
import threading
import time

sys.dont_write_bytecode = True
HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
PROJECT = HERE / 'project'
sys.path.insert(0, str(HERE))
import pglib                                        # noqa: E402
from pglib import Srv, BIN, run, newdir, wait_for   # noqa: E402
import capture_pg as cap                            # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--recapture', action='store_true', help='record everything again on this machine and compare with js/real.js (about 90 seconds)')
ap.add_argument('--browser', action='store_true', help='also drive the six labs in Chromium (postgresql/verify/e2e_labs.js) and its controls')
ap.add_argument('--verbose', '-v', action='store_true')
args = ap.parse_args()

problems, counts, skips = [], {}, []


def bad(msg):
    problems.append(msg)
    print('PROBLEM:', msg)


def tick(group, n=1):
    counts[group] = counts.get(group, 0) + n


def skipped(what, why):
    skips.append('%s: %s' % (what, why))
    print('skipped:', what, '(' + why + ')')


def expect(cond, msg, group='checks'):
    tick(group)
    if not cond:
        bad(msg)
    elif args.verbose:
        print('ok:', msg)


def control(label, refused):
    """A control feeds a broken input to a checker. refused() returns True (or raises) when the checker caught it."""
    tick('controls')
    try:
        if refused():
            return
    except Exception:      # noqa: BLE001
        return
    bad('control "%s": the checker accepted a broken input' % label)


def runp(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def load_real(path):
    txt = pathlib.Path(path).read_text()
    return json.loads(txt[txt.index('LAB.real = ') + len('LAB.real = '):].rstrip().rstrip(';'))


REAL = load_real(ROOT / 'postgresql' / 'js' / 'real.js')
r = runp(['node', str(HERE / 'dump_pg.js')], cwd=str(ROOT))
if r.returncode:
    print('PROBLEM: the course does not load: ' + (r.stderr or r.stdout)[-600:])
    sys.exit(1)
DUMP = json.loads(r.stdout)
CODE = {c['id']: c for c in DUMP['code']}
F, X = REAL['files'], REAL['text']

try:
    import pglast
except ImportError:
    pglast = None
    skipped('SQL parsing', 'pglast is not installed (python3 -m pip install pglast)')
if not pathlib.Path(BIN, 'initdb').exists():
    print('PROBLEM: the PostgreSQL 16 server programs were not found')
    sys.exit(1)

# ----------------------------------------------------------------------------------------------------------------------
# 1. The files of the recording and the code screens
# ----------------------------------------------------------------------------------------------------------------------
for f in sorted(p_ for p_ in PROJECT.iterdir() if p_.is_file()):
    expect(F.get(f.name) == f.read_text(), 'the recording holds %s as it is on disk' % f.name, 'recorded files')
expect(set(F) == {f.name for f in PROJECT.iterdir() if f.is_file()}, 'the recording holds the files of the project and nothing else', 'recorded files')
SCREENS = {'m4-sql': 'upsert.sql', 'm4-py': 'load_orders.py', 'm5-code': 'indexes.sql', 'm6-code': 'partitions.sql', 'm7-conf': 'postgresql.conf', 'm8-code': 'backup.sh', 'm9-mig': 'migrate.sql',
           'm9-roles': 'roles.sql', 'm9-hbafile': 'pg_hba.conf', 'm10-ch:sol': 'upsert.sql'}
for sid, fn in SCREENS.items():
    expect(CODE[sid]['code'].rstrip('\n') == F[fn].rstrip('\n'), 'the code screen %s shows %s exactly' % (sid, fn), 'code screens that show a recorded file')

# ----------------------------------------------------------------------------------------------------------------------
# 2. Every SQL text goes through the parser of PostgreSQL. Shell and Python are parsed.
# ----------------------------------------------------------------------------------------------------------------------
def pg_parse(sql):
    return pglast.parse_sql(sql)


n_sql = 0
for c in DUMP['code']:
    if c['lang'] == 'sql':
        n_sql += 1
        if pglast:
            try:
                pg_parse(c['code'])
                tick('SQL texts parsed by the parser of PostgreSQL')
            except Exception as e:      # noqa: BLE001
                bad('pglast cannot parse %s: %s' % (c['id'], str(e)[:100]))
    elif c['lang'] == 'bash':
        o = runp(['bash', '-n'], input=c['code'])
        expect(o.returncode == 0, 'the shell syntax of %s is valid: %s' % (c['id'], o.stderr.strip()[:100]), 'shell syntax')
    elif c['lang'] == 'python':
        try:
            ast.parse(c['code'])
            tick('Python snippets parsed')
        except SyntaxError as e:
            bad('the Python of %s does not compile: %s' % (c['id'], e))
expect(n_sql >= 20, 'the lessons hold at least 20 SQL texts (found %d)' % n_sql, 'SQL texts')
if pglast:
    control('SQL with a misspelt keyword, given to the parser of PostgreSQL', lambda: pg_parse('SELEC 1') is None)
    control('an upsert without a target, given to the parser', lambda: pg_parse('INSERT INTO orders SELECT * FROM stg ON CONFLICT (order_id) DO UPDATE') is None)
    control('a shell script with an unclosed if', lambda: runp(['bash', '-n'], input='if true; then\n').returncode != 0)
    control('Python with a syntax error', lambda: ast.parse('def f(:\n') is None)


def sql_of(cmd):
    """The SQL in a command of a terminal replay, or None when it is not SQL or has a placeholder."""
    c = re.sub(r'\s+--.*$', '', cmd.strip())
    if re.search(r'\.\.\.|<[^>]*>|\$[A-Z_]+|\bX \+|\\', c):
        return None
    if re.match(r'^(SELECT|EXPLAIN|CREATE|ALTER|INSERT|UPDATE|DELETE|SET|SHOW|VACUUM|ANALYZE|CHECKPOINT|DROP|COPY|MERGE|EXECUTE|PREPARE|LOCK|GRANT)\b', c):
        return c
    m = re.match(r'^psql\b.*?\s-c\s+("([^"]*)"|\'([^\']*)\')', c)
    if m:
        return m.group(2) or m.group(3)
    return None


n_stmt = 0
for c in DUMP['commands']:
    q = sql_of(c['cmd'])
    if q and pglast:
        n_stmt += 1
        try:
            pg_parse(q)
            tick('statements of the terminal replays parsed by the parser of PostgreSQL')
        except Exception as e:      # noqa: BLE001
            bad('%s: pglast cannot parse "%s": %s' % (c['id'], q[:90], str(e)[:80]))
if pglast:
    expect(n_stmt >= 80, 'the replays hold at least 80 SQL statements that can be parsed (found %d)' % n_stmt, 'statements')

# ----------------------------------------------------------------------------------------------------------------------
# 3. The configuration files are loaded by a real server
# ----------------------------------------------------------------------------------------------------------------------
srv = Srv('conf', {'autovacuum': 'off'})
(srv.data / 'pg_hba.conf').write_text('local all all trust\nhost all all 127.0.0.1/32 trust\n' + F['pg_hba.conf'])
conf_inc = srv.data / 'project.conf'
conf_inc.write_text(F['postgresql.conf'].replace("archive_command = 'cp %p /archive/%f'", "archive_command = '/bin/true'"))
with open(srv.data / 'postgresql.conf', 'a') as fh:
    fh.write("\ninclude 'project.conf'\n")
srv.start()
rules = srv.sql('SELECT line_number, error FROM pg_hba_file_rules')
expect(len(rules) == 2 + 4 and all(r_[1] is None for r_ in rules), 'the server reads all four lines of the pg_hba.conf of the project without an error: %s' % rules, 'configuration files')
exp = {'wal_level': 'replica', 'max_wal_size': '1024', 'archive_mode': 'on', 'max_slot_wal_keep_size': '51200', 'hot_standby_feedback': 'off', 'idle_in_transaction_session_timeout': '600000', 'log_min_duration_statement': '1000', 'shared_preload_libraries': 'pg_stat_statements'}
got = {r_[0]: r_[1] for r_ in srv.sql("SELECT name, setting FROM pg_settings WHERE name IN (%s)" % ','.join("'%s'" % k for k in exp))}
expect(got == exp, 'the server reads every setting of the postgresql.conf of the project as the lesson says: %s' % got, 'configuration files')
srv.stop()
srv = Srv('confbad', {'autovacuum': 'off'})
(srv.data / 'pg_hba.conf').write_text('local all all trust\nhost all all 127.0.0.1/32 trust\n')
srv.start()
with open(srv.data / 'pg_hba.conf', 'a') as fh:
    fh.write('host all all 10.0.0.0/8 frobnicate\n')
srv.sql('SELECT pg_reload_conf()')
time.sleep(1)
control('a pg_hba.conf line with a method that does not exist: the server reports an error for it', lambda: any(r_[1] for r_ in srv.sql('SELECT line_number, error FROM pg_hba_file_rules')))
srv.stop()

# ----------------------------------------------------------------------------------------------------------------------
# 4. The project, run
# ----------------------------------------------------------------------------------------------------------------------
_sc = [0]


def fresh(name, conf=None, **kw):
    _sc[0] += 1
    return Srv('%s%d' % (name, _sc[0]), dict({'autovacuum': 'off'}, **(conf or {})), **kw).start()


sys.path.insert(0, str(PROJECT))
import importlib                                    # noqa: E402
lo = importlib.import_module('load_orders')
s = fresh('proj')
s.sql(F['schema.sql'])
csvf = pathlib.Path(pglib.BASE) / 'v_orders.csv'
head = 'order_id,store_id,customer_id,order_ts,amount,status,note\n'
rows = cap.csv_rows(1, 3000)
csvf.write_text(head + '\n'.join(rows) + '\n')
os.chmod(csvf, 0o644)
runs = [lo.load(s.dsn(), str(csvf))]
runs.append(lo.load(s.dsn(), str(csvf)))
f_ = rows[4].split(',')
f_[4] = '88.00'
rows[4] = ','.join(f_)
csvf.write_text(head + '\n'.join(rows) + '\n')
runs.append(lo.load(s.dsn(), str(csvf)))
csvf.write_text(head + '\n'.join(rows + [rows[1]]) + '\n')
runs.append(lo.load(s.dsn(), str(csvf)))
expect(runs == [3000, 0, 1, 0], 'the project loader writes 3,000, 0, 1 and 0 rows in four runs: %s' % runs, 'project runs')
expect(s.one('SELECT count(*) FROM orders') == 3000 and str(s.one('SELECT amount FROM orders WHERE order_id = 5')) == '88.00', 'the loader left 3,000 rows and the changed amount', 'project runs')
s.sql('CREATE TABLE events (event_id bigint, event_ts timestamptz NOT NULL, user_id int, kind text, payload jsonb)')
for fn in ('indexes.sql', 'roles.sql', 'migrate.sql', 'partitions.sql'):
    try:
        s.sql(F[fn])
        tick('project SQL files that run on a real server')
    except Exception as e:      # noqa: BLE001
        bad('%s does not run: %s' % (fn, str(e)[:120]))
expect(s.one("SELECT count(*) FROM pg_indexes WHERE tablename = 'events'") == 5 and s.one("SELECT count(*) FROM pg_policies WHERE tablename = 'orders'") == 1, 'the indexes and the policy of the project exist', 'project runs')
s.stop()


# ----------------------------------------------------------------------------------------------------------------------
# 5. The bug hunts, run next to their fixes
# ----------------------------------------------------------------------------------------------------------------------
def plan_of(srv, sql, db='postgres'):
    return '\n'.join(r_[0] for r_ in srv.sql('EXPLAIN (ANALYZE, TIMING OFF, SUMMARY OFF) ' + sql, db=db))


def statements(sql):
    out = []
    for st in pglast.parse_sql(sql):
        text = sql[st.stmt_location:st.stmt_location + (st.stmt_len or len(sql))].strip().rstrip(';')
        out.append(text)
    return out


if pglast:
    # m4: a plain upsert rewrites every row, the guarded one writes nothing
    s = fresh('b4')
    s.sql(F['schema.sql'])
    s.sql('CREATE TABLE stg (LIKE orders)')
    s.sql("INSERT INTO stg SELECT i, 1 + i % 12, 1 + i % 3000, now(), 10 + i % 90, 'paid', 'x' FROM generate_series(1, 2000) i")
    with s.conn() as con:
        first = con.execute(CODE['m4-bug']['code']).rowcount
        second = con.execute(CODE['m4-bug']['code']).rowcount
        con.execute('TRUNCATE orders')
        f1 = con.execute(CODE['m4-bug:fix']['code']).rowcount
        f2 = con.execute(CODE['m4-bug:fix']['code']).rowcount
    expect([first, second, f1, f2] == [2000, 2000, 2000, 0], 'm4: the plain upsert wrote %d rows the second time, the guarded one %d (first runs %d and %d)' % (second, f2, first, f1), 'bug hunts run')
    s.stop()
    # m5: GIN and ->>, BRIN on a random column
    s = fresh('b5', {'default_statistics_target': 10000})
    s.sql('CREATE TABLE events (event_id bigint, event_ts timestamptz NOT NULL, user_id int, kind text, payload jsonb)')
    s.sql("INSERT INTO events SELECT i, timestamptz '2026-01-01' + i * interval '3 seconds', (i::bigint * 7919) % 50000, 'view', jsonb_build_object('n', i % 1000) FROM generate_series(1, 200000) i")
    bug, fix = CODE['m5-bug']['code'], CODE['m5-bug:fix']['code']
    st_b, st_f = statements(bug), statements(fix)
    s.sql(st_b[0])
    s.sql('ANALYZE events')
    pb, pf = plan_of(s, st_b[1]), plan_of(s, st_f[1])
    expect('events_payload_gin' not in pb and 'Seq Scan on events' in pb and 'events_payload_gin' in pf, 'm5: ->> scans the table although the GIN index exists, and @> uses it', 'bug hunts run')
    bug, fix = CODE['m5-bug2']['code'], CODE['m5-bug2:fix']['code']
    st_b, st_f = statements(bug), statements(fix)
    s.sql(st_b[0])
    s.sql('ANALYZE events')
    pb = plan_of(s, st_b[1])
    s.sql('DROP INDEX events_user_brin')
    s.sql(st_f[0])
    s.sql('ANALYZE events')
    pf = plan_of(s, st_f[1])
    expect('events_user_brin' not in pb and 'events_user_idx' in pf, 'm5: the BRIN index on a column in a random order is ignored, and a btree is used', 'bug hunts run')
    s.stop()
    # m6: pruning, and delete against drop
    s = fresh('b6')
    s.sql('CREATE TABLE ev (event_id bigint NOT NULL, event_ts timestamptz NOT NULL, user_id int, kind text, PRIMARY KEY (event_id, event_ts)) PARTITION BY RANGE (event_ts)')
    for m in range(1, 7):
        s.sql("CREATE TABLE ev_2026_%02d PARTITION OF ev FOR VALUES FROM ('2026-%02d-01') TO ('%s')" % (m, m, '2026-%02d-01' % (m + 1)))
    s.sql("INSERT INTO ev SELECT i, timestamptz '2026-01-01' + i * interval '130 seconds', i % 1000, 'view' FROM generate_series(1, 120000) i")
    s.sql('ANALYZE ev')
    sc_ = lambda t: len(re.findall(r'Scan on ev_', t))      # noqa: E731
    pb = plan_of(s, CODE['m6-bug']['code'].strip().rstrip(';'))
    pf = plan_of(s, CODE['m6-bug:fix']['code'].strip().rstrip(';'))
    expect(sc_(pb) == 6 and sc_(pf) == 1, 'm6: the function on the key reads %d partitions and the range reads %d' % (sc_(pb), sc_(pf)), 'bug hunts run')
    a = cap.lsn(s)
    for stt in statements(CODE['m6-bug2:fix']['code']):
        s.sql(stt)
    w_fix = cap.wal_bytes(s, a, cap.lsn(s))
    a = cap.lsn(s)
    for stt in statements(CODE['m6-bug2']['code']):
        s.sql(stt)
    w_bug = cap.wal_bytes(s, a, cap.lsn(s))
    expect(w_bug > 50 * w_fix and w_fix < 20000, 'm6: the delete wrote %d bytes of log, the detach and drop %d' % (w_bug, w_fix), 'bug hunts run')
    s.stop()
    # m2: VACUUM FULL rewrites the table, VACUUM does not
    s = fresh('b2')
    s.sql(F['schema.sql'])
    s.sql("INSERT INTO orders SELECT i, 1, 1, now(), 1, 'paid', 'x' FROM generate_series(1, 5000) i")
    fn = lambda: s.one("SELECT relfilenode FROM pg_class WHERE relname = 'orders'")      # noqa: E731
    f0 = fn()
    for stt in statements(CODE['m2-bug:fix']['code']):
        s.sql(stt)
    f1 = fn()
    for stt in statements(CODE['m2-bug']['code']):
        s.sql(stt)
    f2 = fn()
    expect(f0 == f1 and f1 != f2, 'm2: VACUUM (ANALYZE) keeps the file of the table and VACUUM FULL makes a new one', 'bug hunts run')
    # m9: a type change rewrites the table, an added column does not
    s.sql('ALTER TABLE orders ADD COLUMN store_id_big bigint')
    f3 = fn()
    s.sql(CODE['m9-bug3']['code'].split('\n', 1)[1].strip().rstrip(';'))
    f4 = fn()
    expect(f2 == f3 and f3 != f4, 'm9: a new column keeps the file, the change of type makes a new one', 'bug hunts run')
    # m9: the grant that does not cover tomorrow
    s.sql("CREATE ROLE analyst LOGIN")
    for stt in statements(CODE['m9-bug']['code']):
        s.sql(stt)
    try:
        s.sql('SELECT count(*) FROM orders_q2', user='analyst')
        denied = False
    except Exception as e:      # noqa: BLE001
        denied = 'permission denied' in str(e)
    s.sql('DROP TABLE orders_q2')
    for stt in statements(CODE['m9-bug:fix']['code']):
        s.sql(stt)
    try:
        s.sql('SELECT count(*) FROM orders_q2', user='analyst')
        allowed = True
    except Exception:      # noqa: BLE001
        allowed = False
    expect(denied and allowed, 'm9: a table made after the grant is refused to the analyst, and allowed after ALTER DEFAULT PRIVILEGES', 'bug hunts run')
    # m9: a migration without a lock timeout queues the readers behind it
    def queue(sql_lines, hold=6.0):
        a1 = s.conn(autocommit=False)
        a1.execute('SELECT count(*) FROM orders')
        res = {}

        def mig():
            c1 = s.conn()
            t0 = time.time()
            try:
                for stt in statements(sql_lines):
                    c1.execute(stt)
                res['b'] = 'ran'
            except Exception as e:      # noqa: BLE001
                res['b'] = str(e).strip().split('\n')[0]
            res['b_t'] = time.time() - t0

        def rd():
            c1 = s.conn()
            t0 = time.time()
            c1.execute('SELECT 1 FROM orders LIMIT 1')
            res['c_t'] = time.time() - t0

        tb = threading.Thread(target=mig)
        tb.start()
        time.sleep(0.7)
        tc = threading.Thread(target=rd)
        tc.start()
        time.sleep(hold)
        res['c_done_while_a_open'] = 'c_t' in res
        a1.commit()
        a1.close()
        tb.join()
        tc.join()
        return res
    r_bug = queue(CODE['m9-bug2']['code'].replace('ADD COLUMN channel', 'ADD COLUMN channel_a'))
    r_fix = queue(CODE['m9-bug2:fix']['code'].replace('ADD COLUMN channel', 'ADD COLUMN channel_b'))
    expect(r_bug['c_done_while_a_open'] is False and r_fix['c_done_while_a_open'] is True and 'lock timeout' in r_fix['b'], 'm9: without a lock timeout the reader waits behind the migration while A is open, with one the migration is refused (%s) and the reader runs after %.1f s' % (r_fix['b'], r_fix.get('c_t', -1)), 'bug hunts run')
    s.stop()
    # m7: DDL on the publisher only, and a table without a key
    pri = fresh('b7p', {'wal_level': 'logical'})
    sub = fresh('b7s')
    for x in (pri, sub):
        x.sql(F['schema.sql'])
    pri.sql("INSERT INTO orders SELECT i, 1, 1, now(), 1, 'paid', 'x' FROM generate_series(1, 100) i")
    pri.sql('CREATE PUBLICATION p FOR TABLE orders')
    sub.sql("CREATE SUBSCRIPTION s1 CONNECTION 'host=127.0.0.1 port=%d dbname=postgres user=postgres' PUBLICATION p" % pri.port)
    wait_for(lambda: sub.one('SELECT count(*) FROM orders') == 100, timeout=30)
    pos = len(sub.log())
    for stt in statements(CODE['m7-bug']['code']):
        pri.sql(stt)
    pri.sql("INSERT INTO orders (order_id, store_id, customer_id, order_ts, amount, status, note, channel) VALUES (101, 1, 1, now(), 1, 'paid', 'x', 'app')")
    stalled = wait_for(lambda: 'missing replicated column' in sub.log_since(pos), timeout=30)
    c_sub = sub.one('SELECT count(*) FROM orders')
    for stt in statements(CODE['m7-bug:fix']['code'])[:1]:
        sub.sql(stt)
    caught = wait_for(lambda: sub.one('SELECT count(*) FROM orders') == 101, timeout=40)
    expect(bool(stalled) and c_sub == 100 and bool(caught), 'm7: a column added on the publisher only stalls the subscriber at 100 of 101 rows, and adding it there brings it to 101', 'bug hunts run')
    try:
        sub.sql('ALTER SUBSCRIPTION s1 DISABLE')
        sub.sql('ALTER SUBSCRIPTION s1 SET (slot_name = NONE)')
        sub.sql('DROP SUBSCRIPTION s1')
    except Exception:      # noqa: BLE001
        pass
    def key_case(code):
        for stt in statements(code)[:-1]:
            pri.sql(stt.replace('CREATE PUBLICATION p ', 'CREATE PUBLICATION p%d ' % _sc[0]))
        pri.sql("INSERT INTO tags VALUES (1, 'a')")
        try:
            pri.sql(statements(code)[-1])
            return 'ok'
        except Exception as e:      # noqa: BLE001
            return str(e).strip().split('\n')[0]
    e1 = key_case(CODE['m7-bug2']['code'])
    pri.sql('DROP TABLE tags')
    _sc[0] += 1
    pri.sql("SELECT 1")
    e2 = key_case(CODE['m7-bug2:fix']['code'])
    expect('replica identity' in e1 and e2 == 'ok', 'm7: an update of a published table without a key is refused (%s) and works with a primary key' % e1, 'bug hunts run')
    pri.stop()
    sub.stop()
    # m8: a restore over production loses the day, a restore beside it does not
    s = fresh('b8')
    s.sql('CREATE DATABASE brewline')
    s.sql(F['schema.sql'], db='brewline')
    s.sql('CREATE TABLE daily_totals AS SELECT 1 AS store_id, 10 AS n', db='brewline')
    s.sql("INSERT INTO orders SELECT i, 1, 1, now(), 1, 'paid', 'x' FROM generate_series(1, 50) i", db='brewline')
    work = newdir('v8')
    env = ['env', 'PGHOST=127.0.0.1', 'PGPORT=%d' % s.port, 'PGUSER=postgres', 'PGDATABASE=postgres']
    run(env + [BIN + '/pg_dump', '-Fc', '-f', work / 'yesterday.dump', 'brewline'])
    s.sql("INSERT INTO orders SELECT i, 1, 1, now(), 1, 'paid', 'today' FROM generate_series(51, 80) i", db='brewline')
    s.sql('INSERT INTO daily_totals VALUES (2, 20)', db='brewline')
    fixlines = [ln for ln in CODE['m8-bug:fix']['code'].split('\n') if ln.strip() and not ln.startswith('#')]
    script = 'export PATH=%s:$PATH\n' % BIN + '\n'.join(ln for ln in fixlines)
    o = run(env + ['sh', '-c', 'cd %s && %s' % (work, script)], check=False)
    beside = (s.one('SELECT count(*) FROM orders', db='brewline'), s.one('SELECT count(*) FROM daily_totals', db='brewline_restored') if o.returncode == 0 else None)
    run(env + ['sh', '-c', 'cd %s && export PATH=%s:$PATH && %s' % (work, BIN, CODE['m8-bug']['code'].replace('\n', ' && ').rstrip(' && '))], check=False)
    over = (s.one('SELECT count(*) FROM orders', db='brewline'), s.one('SELECT count(*) FROM daily_totals', db='brewline'))
    expect(o.returncode == 0 and beside == (80, 1) and over == (50, 1), 'm8: restoring beside production left 80 orders there and one row in the restored totals %s, restoring over it left %s' % (beside, over), 'bug hunts run')
    s.stop()


# ----------------------------------------------------------------------------------------------------------------------
# 6. The tools of the replays against their --help
# ----------------------------------------------------------------------------------------------------------------------
_help = {}


def tool_help(tool):
    if tool not in _help:
        o = runp([BIN + '/' + tool, '--help'])
        _help[tool] = o.stdout + o.stderr
    return _help[tool]


def check_tool(cmd):
    cmd = re.split(r';|\s--\s', cmd.split('#')[0].strip())[0]
    try:
        toks = shlex.split(cmd)
    except ValueError:
        return []
    if not toks or toks[0] not in ('pg_restore', 'pg_dump', 'pg_dumpall', 'pg_basebackup', 'pg_verifybackup', 'pg_checksums', 'pg_ctl', 'psql'):
        return []
    tool, out = toks[0], []
    h = tool_help(tool)
    for t in toks[1:]:
        if t.startswith('--'):
            name = t.split('=')[0]
            if not re.search(r'(?<![\w-])' + re.escape(name) + r'(?![\w-])', h):
                out.append('%s has no option %s' % (tool, name))
        elif re.match(r'^-[A-Za-z]', t):
            name = t[:2]      # -Fc is -F with the argument c
            if not re.search(r'(?<![\w-])' + re.escape(name) + r'(?![\w-])', h):
                out.append('%s has no option %s' % (tool, name))
    return out


n_tool = 0
for c in DUMP['commands']:
    if re.match(r'^(pg_restore|pg_dump|pg_dumpall|pg_basebackup|pg_verifybackup|pg_checksums|pg_ctl|psql)\b', c['cmd']):
        n_tool += 1
        for p_ in check_tool(c['cmd']):
            bad('%s: %s (in "%s")' % (c['id'], p_, c['cmd'][:90]))
for line in F['backup.sh'].split('\n'):
    if re.match(r'^(pg_dump|pg_basebackup|pg_verifybackup)\b', line):
        n_tool += 1
        for p_ in check_tool(line):
            bad('backup.sh: %s (in "%s")' % (p_, line))
tick('commands of the tools checked against --help', n_tool)
expect(n_tool >= 12, 'the lessons and the script hold at least 12 commands of the PostgreSQL tools (found %d)' % n_tool, 'tool help')
control('a pg_restore option that does not exist', lambda: check_tool('pg_restore --not-an-option dump') != [])
control('a pg_dump option that does not exist', lambda: check_tool('pg_dump -Z9x --frobnicate db') != [])
control('a pg_basebackup short option that does not exist', lambda: check_tool('pg_basebackup -Q dir') != [])
expect(check_tool('pg_restore -l brewline.dump') == [] and check_tool('pg_basebackup -D base -X stream -c fast') == [] and check_tool('pg_verifybackup base') == [], 'the checker accepts valid options', 'tool help')


# ----------------------------------------------------------------------------------------------------------------------
# 7. The recording made again, and compared
# ----------------------------------------------------------------------------------------------------------------------
def flatten(real):
    out = {}
    for kind in ('meta', 'counts', 'tables', 'text', 'files'):
        for k, v in real[kind].items():
            out[kind + ':' + k] = v
    return out


SKIP = {'meta:recorded_on': 'the date'}


def few(n):
    """A handful of background flushes of the log (0 to 20) counts as the same, a larger count must match."""
    return 'a few' if n <= 20 else n


def fold(key, v):
    """Reduce a value to what must be equal between two recordings: seconds are left out here and compared by ratio in timings(), a handful of flushes becomes 'a few'."""
    if key == 'counts:load.methods':
        return {m: dict(d, seconds=0, wal_flushes=few(d['wal_flushes'])) for m, d in v.items()}
    if key == 'counts:load.methods_summary':
        return dict(v, copy_faster_than_autocommit_by_at_least=v['copy_faster_than_autocommit_by_at_least'] >= 20, one_tx_flushes=few(v['one_tx_flushes']))
    if key == 'tables:load.methods':
        return {'cols': v['cols'], 'rows': [[r[0], r[1], r[2], r[3], few(r[4]), 0, r[6]] for r in v['rows']]}
    if key == 'counts:wal.commits':
        return {k: dict(d, seconds=0, wal_syncs=few(d['wal_syncs'])) for k, d in v.items()}
    if key == 'tables:wal.commits':
        return {'cols': v['cols'], 'rows': [[r[0], r[1], few(r[2]), 0] for r in v['rows']]}
    return v


def timings(real):
    c = real['counts']
    return [('load.methods.' + m, c['load.methods'][m]['seconds']) for m in sorted(c['load.methods'])] + [('wal.commits.' + k, c['wal.commits'][k]['seconds']) for k in sorted(c['wal.commits'])]


def slower(x, y):
    """True when two durations differ by more than a factor of 3 (durations under 20 ms are not compared: they are the noise of the clock)."""
    return max(x, y) > 0.02 and max(x, y) > 3 * max(min(x, y), 0.005)


def differing(a, b):
    fa, fb = flatten(a), flatten(b)
    out = []

    def walk(x, y, p, key):
        if isinstance(x, dict) and isinstance(y, dict):
            if set(x) != set(y):
                return [key + p]
            return sum((walk(x[k], y[k], p + '.' + k, key) for k in x), [])
        if isinstance(x, list) and isinstance(y, list):
            if len(x) != len(y):
                return [key + p]
            return sum((walk(u, v, p + '[%d]' % i, key) for i, (u, v) in enumerate(zip(x, y))), [])
        return [] if x == y else [key + p]

    for k in sorted(set(fa) | set(fb)):
        if k in SKIP:
            continue
        if k not in fa or k not in fb:
            out.append(k)
        else:
            out += walk(fold(k, fa[k]), fold(k, fb[k]), '', k)
    out += ['seconds:' + k1 for (k1, v1), (_, v2) in zip(timings(a), timings(b)) if slower(v1, v2)]
    return out


if not args.recapture:
    skipped('recapture', 'run with --recapture (about 90 seconds)')
else:
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='pg-recapture-')) / 'real.js'
    r = runp([sys.executable, str(HERE / 'capture_pg.py'), '--out', str(tmp)])
    if r.returncode or not tmp.exists():
        bad('capture_pg.py failed: ' + (r.stdout + r.stderr)[-800:])
    else:
        again = load_real(tmp)
        diff = differing(REAL, again)
        tick('recaptured items', len(flatten(again)))
        for k in diff:
            bad('the recapture differs from js/real.js in %s' % k)
        print('recapture: %d items, %d differ' % (len(flatten(again)), len(diff)))
        ch = json.loads(json.dumps(REAL))
        ch['counts']['mvcc.bloat']['size_after_3'] += 8192
        control('a recording with one number changed, given to the comparison', lambda: differing(REAL, ch) == ['counts:mvcc.bloat.size_after_3'])
        ch = json.loads(json.dumps(REAL))
        ch['text']['load.copy_error'] = ch['text']['load.copy_error'].replace('line 5', 'line 6')
        control('a recording with one word changed in a printed text, given to the comparison', lambda: differing(REAL, ch) == ['text:load.copy_error'])
        ch = json.loads(json.dumps(REAL))
        ch['tables']['idx.write_cost']['rows'][1][1] += 1
        control('a recording with one cell of a table changed, given to the comparison', lambda: differing(REAL, ch) == ['tables:idx.write_cost.rows[1][1]'])
        ch = json.loads(json.dumps(REAL))
        ch['counts']['load.methods']['COPY']['seconds'] = ch['counts']['load.methods']['COPY']['seconds'] * 1.4
        ch['counts']['wal.commits']['on']['seconds'] = ch['counts']['wal.commits']['on']['seconds'] * 1.3
        ch['meta']['recorded_on'] = '2030-01-01'
        expect(differing(REAL, ch) == [], 'seconds that differ by a factor of 1.4, and another date, are inside the allowance', 'recapture allowances')
        ch = json.loads(json.dumps(REAL))
        ch['counts']['load.methods']['COPY']['seconds'] = max(5.0, REAL['counts']['load.methods']['COPY']['seconds'] * 100)
        control('a COPY that took 100 times longer, given to the comparison', lambda: differing(REAL, ch) == ['seconds:load.methods.COPY'])
    shutil.rmtree(tmp.parent, ignore_errors=True)


# ----------------------------------------------------------------------------------------------------------------------
# 8. The lab data, and controls for its checker
# ----------------------------------------------------------------------------------------------------------------------
def widget_checker(real=None):
    env = None
    if real is not None:
        p = pathlib.Path(tempfile.mkdtemp(prefix='pg-control-')) / 'real.js'
        p.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(real) + ';\n')
        env = dict(os.environ, PG_REAL_JS=str(p))
    return runp(['node', str(HERE / 'check_widgets.js')], cwd=str(ROOT), env=env)


r = widget_checker()
m = re.search(r'(\d+) checks passed', r.stdout)
expect(r.returncode == 0 and m, 'check_widgets.js passes: ' + r.stdout.strip()[-200:], 'lab checks')
tick('lab data checks', int(m.group(1)) if m else 0)


def set_cell(d, table, row, col, v):
    d['tables'][table]['rows'][row][col] = v


for label, mutate in (
    ('a table that is not four times its start after three updates', lambda d: set_cell(d, 'mvcc.bloat', 3, 1, 22970368)),
    ('a vacuum that shrank the file', lambda d: set_cell(d, 'mvcc.bloat', 4, 1, 15319040)),
    ('a HOT percentage that is not the share of HOT updates', lambda d: set_cell(d, 'mvcc.hot', 2, 3, 80)),
    ('an autovacuum that ran below its threshold', lambda d: set_cell(d, 'mvcc.autovacuum', 1, 3, 2)),
    ('a first update that wrote as little log as the second', lambda d: set_cell(d, 'wal.records', 0, 3, 71)),
    ('a plain rerun of an upsert that did not double the table', lambda d: set_cell(d, 'load.upsert', 1, 4, 8445952)),
    ('a store 5 that is not the count of the rule', lambda d: d['counts']['ops.rls'].__setitem__('policy_rows', 16000)),
    ('a function that read five partitions', lambda d: d['counts']['part.pruning'].__setitem__('partitions_scanned_with_function', 5)),
    ('a slot that was reserved after the limit', lambda d: set_cell(d, 'repl.slots', 2, 2, 'reserved')),
    ('a migration that was blocked by the reader and not by the other migration', lambda d: set_cell(d, 'ops.queue', 2, 4, 'A')),
):
    data = json.loads(json.dumps(REAL))
    mutate(data)
    control(label + ': the widget checker fails', lambda data=data: widget_checker(data).returncode != 0)

# ----------------------------------------------------------------------------------------------------------------------
# 9. The lint
# ----------------------------------------------------------------------------------------------------------------------
r = runp(['node', str(ROOT / 'dev' / 'lint-content.js'), 'postgresql'], cwd=str(ROOT))
expect(r.returncode == 0 and 'lint clean' in r.stdout, 'the lint of the course is clean: ' + r.stdout.strip()[-200:], 'lint runs')


# ----------------------------------------------------------------------------------------------------------------------
# 10. The labs in a browser, and controls for that test
# ----------------------------------------------------------------------------------------------------------------------
def labs_e2e(script_):
    r_ = runp(['node', str(script_)], cwd=str(script_.parent.parent.parent))
    return r_, re.search(r'(\d+) lab checks passed', r_.stdout)


if not args.browser:
    skipped('the labs in a browser', 'run with --browser (needs Playwright and Chromium)')
else:
    r, m = labs_e2e(HERE / 'e2e_labs.js')
    expect(r.returncode == 0 and m, 'e2e_labs.js passes: ' + (r.stdout + r.stderr).strip()[-300:], 'browser lab tests')
    tick('browser lab checks', int(m.group(1)) if m else 0)
    W = 'postgresql/js/widgets.js'
    MUTATIONS = [
        ('the bloat lab colours a vacuumed file as bad', W, "bar('the file', r[1], max, mbs(r[1]), r[1] > t.rows[0][1] * 1.5 ? 'bad' : 'good')", "bar('the file', r[1], max, mbs(r[1]), r[1] > t.rows[0][1] * 1.5 ? 'good' : 'bad')"),
        ('the load lab counts the statements as the commits', W, "big([[n(r[1]), 'statements sent', r[1] > 1000 ? 'warn' : 'good'], [n(r[2]), 'commits'", "big([[n(r[1]), 'statements sent', r[1] > 1000 ? 'warn' : 'good'], [n(r[1]), 'commits'"),
        ('the upsert lab marks a rewrite of every row as good', W, "[n(r[3]), 'rows updated', r[3] > 5000 ? 'bad' : r[3] ? 'warn' : 'good']", "[n(r[3]), 'rows updated', r[3] > 5000 ? 'good' : r[3] ? 'warn' : 'bad']"),
        ('the index lab says that ->> uses the GIN index', W, "[js.arrow_uses_gin ? 'used' : 'not used', '->> with GIN', 'bad']", "[js.arrow_uses_gin ? 'not used' : 'used', '->> with GIN', 'bad']"),
        ('the queue lab hides the session that waits behind the migration', W, "if (k === 'ab') return { rows: rows.filter(function (r) { return r[0] !== 'C'; })", "if (k === 'ab') return { rows: rows.filter(function (r) { return r[0] !== 'B'; })"),
        ('the slot lab marks a lost slot as healthy', W, "r[2] === 'reserved' ? 'good' : 'bad'], [mb_ === null", "r[2] === 'reserved' ? 'bad' : 'good'], [mb_ === null"),
    ]
    for label, rel, old, new in MUTATIONS:
        copy = pathlib.Path(tempfile.mkdtemp(prefix='pg-mutation-'))
        for part in ('shared', 'postgresql'):
            shutil.copytree(ROOT / part, copy / part, ignore=shutil.ignore_patterns('__pycache__', '.cache', 'node_modules', '.git'))
        target = copy / rel
        src = target.read_text()
        if src.count(old) != 1:
            bad('control cannot be set up: "%s" is not in %s exactly once (%d)' % (old[:70], rel, src.count(old)))
            shutil.rmtree(copy, ignore_errors=True)
            continue
        target.write_text(src.replace(old, new))
        r2, _ = labs_e2e(copy / 'postgresql' / 'verify' / 'e2e_labs.js')
        control('the lab test fails when ' + label, lambda r2=r2: r2.returncode != 0)
        shutil.rmtree(copy, ignore_errors=True)

pglib.cleanup()
print()
print('checked: ' + ', '.join('%d %s' % (v, k) for k, v in sorted(counts.items())))
for sk in skips:
    print('skipped: ' + sk)
if problems:
    print('%d PROBLEM(S)' % len(problems))
    sys.exit(1)
print('verify_pg: all checks passed')
