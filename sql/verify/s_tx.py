"""Mission 10: transactions, isolation and locks, recorded on a real PostgreSQL server with two client sessions (plus DuckDB and SQLite for contrast).

Each scene is a script: a list of (session, statement). The sessions are real connections to the temporary PostgreSQL server, and every statement
runs for real, in the order written. The recording keeps what each statement returned: rows, a status such as COMMIT, or the error text and its
SQLSTATE code. Process numbers and transaction ids are never recorded, because they change from run to run."""
import os
import tempfile
import threading
import time

import psycopg

import engines as E

ISO = ('read committed', 'repeatable read', 'serializable')
ACCT = ["DROP TABLE IF EXISTS acct", "CREATE TABLE acct (id INTEGER PRIMARY KEY, owner TEXT, balance INTEGER CHECK (balance >= 0))",
        "INSERT INTO acct VALUES (1, 'Ana', 100), (2, 'Ben', 50)"]
ONCALL = ["DROP TABLE IF EXISTS oncall", "CREATE TABLE oncall (name TEXT PRIMARY KEY, on_call BOOLEAN)", "INSERT INTO oncall VALUES ('Ana', true), ('Ben', true)"]


class Sess:
    def __init__(self, dsn):
        self.con = psycopg.connect(dsn, autocommit=True)
        self.con.execute("SET deadlock_timeout = '300ms'")

    def run(self, sql):
        try:
            cur = self.con.execute(sql)
            if cur.description:
                rows = [[E.fmt(c) for c in r] for r in cur.fetchall()]
                return {'rows': rows, 'cols': [d.name for d in cur.description]}
            return {'status': cur.statusmessage}
        except psycopg.Error as ex:
            return {'error': E.error_text(ex), 'code': ex.sqlstate}

    def close(self):
        self.con.close()


def show(out):
    """One short text for a result: a single value, a short row list, a status or an error."""
    if 'error' in out:
        return 'ERROR: %s (%s)' % (out['error'], out['code'])
    if 'rows' in out:
        rows = out['rows']
        if len(rows) == 1 and len(rows[0]) == 1:
            return rows[0][0]
        return '; '.join(', '.join(r) for r in rows) if rows else '0 rows'
    return out['status']


def admin(dsn, sqls):
    con = psycopg.connect(dsn, autocommit=True)
    try:
        for q in sqls:
            con.execute(q)
    finally:
        con.close()


def final_value(dsn, sql):
    con = psycopg.connect(dsn, autocommit=True)
    try:
        return [[E.fmt(c) for c in r] for r in con.execute(sql).fetchall()]
    finally:
        con.close()


def play(dsn, setup, steps, final_sql, teardown):
    admin(dsn, setup)
    sess = {'A': Sess(dsn), 'B': Sess(dsn)}
    log = []
    try:
        for who, sql in steps:
            log.append({'who': who, 'sql': sql, 'out': show(sess[who].run(sql))})
        for s in sess.values():
            s.run('ROLLBACK')               # nothing stays open, whatever the script did
        final = final_value(dsn, final_sql)
    finally:
        for s in sess.values():
            s.close()
        admin(dsn, teardown)
    return log, final


# ------------------------------------------------------------------------------------------------------ the four anomalies of the lab
def scenarios():
    def begin(level):
        return 'BEGIN ISOLATION LEVEL ' + level.upper()
    return [
        {'id': 'nonrep', 'title': 'Non-repeatable read', 'setup': ACCT, 'final': 'SELECT balance FROM acct WHERE id = 1', 'teardown': ['DROP TABLE acct'],
         'question': 'Does Ana\'s balance change between two reads of the same transaction?',
         'steps': lambda l: [('A', begin(l)), ('A', 'SELECT balance FROM acct WHERE id = 1'), ('B', 'UPDATE acct SET balance = 150 WHERE id = 1'),
                             ('A', 'SELECT balance FROM acct WHERE id = 1'), ('A', 'COMMIT')],
         'anomaly': lambda log, final: log[1]['out'] != log[3]['out']},
        {'id': 'phantom', 'title': 'Phantom read', 'setup': ACCT, 'final': 'SELECT count(*) FROM acct WHERE balance >= 50', 'teardown': ['DROP TABLE acct'],
         'question': 'Does a new row appear between two counts of the same transaction?',
         'steps': lambda l: [('A', begin(l)), ('A', 'SELECT count(*) FROM acct WHERE balance >= 50'), ('B', "INSERT INTO acct VALUES (3, 'Cai', 80)"),
                             ('A', 'SELECT count(*) FROM acct WHERE balance >= 50'), ('A', 'COMMIT')],
         'anomaly': lambda log, final: log[1]['out'] != log[3]['out']},
        {'id': 'lost', 'title': 'Lost update', 'setup': ACCT, 'final': 'SELECT balance FROM acct WHERE id = 1', 'teardown': ['DROP TABLE acct'],
         'question': 'Two sessions read 100 and each adds to it in the application. Is one addition lost?',
         'steps': lambda l: [('A', begin(l)), ('A', 'SELECT balance FROM acct WHERE id = 1'), ('B', begin(l)), ('B', 'SELECT balance FROM acct WHERE id = 1'),
                             ('A', 'UPDATE acct SET balance = 110 WHERE id = 1'), ('A', 'COMMIT'),
                             ('B', 'UPDATE acct SET balance = 120 WHERE id = 1'), ('B', 'COMMIT')],
         'anomaly': lambda log, final: final[0][0] == '120'},
        {'id': 'skew', 'title': 'Write skew', 'setup': ONCALL, 'final': 'SELECT count(*) FROM oncall WHERE on_call', 'teardown': ['DROP TABLE oncall'],
         'question': 'Two doctors each check that two are on call, then each goes off call. Is anybody left?',
         'steps': lambda l: [('A', begin(l)), ('A', 'SELECT count(*) FROM oncall WHERE on_call'), ('B', begin(l)), ('B', 'SELECT count(*) FROM oncall WHERE on_call'),
                             ('A', "UPDATE oncall SET on_call = false WHERE name = 'Ana'"), ('A', 'COMMIT'),
                             ('B', "UPDATE oncall SET on_call = false WHERE name = 'Ben'"), ('B', 'COMMIT')],
         'anomaly': lambda log, final: final[0][0] == '0'},
    ]


def run(rec):
    dsn = rec.dsn
    pg_version = rec.eng['postgres'].version
    rec.counts('m10.default_level', {'postgres': rec.scalar('postgres', 'SHOW default_transaction_isolation')})
    rec.counts('m10.deadlock_default', {'postgres': rec.scalar('postgres', 'SHOW deadlock_timeout')})
    # ---- the lab: 4 problems x 3 isolation levels
    runs, meta = {}, []
    for sc in scenarios():
        meta.append({'id': sc['id'], 'title': sc['title'], 'question': sc['question'], 'final_sql': sc['final']})
        for lvl in ISO:
            log, final = play(dsn, sc['setup'], sc['steps'](lvl), sc['final'], sc['teardown'])
            runs['%s|%s' % (sc['id'], lvl)] = {'steps': log, 'final': final[0][0], 'anomaly': bool(sc['anomaly'](log, final))}
    rec.counts('m10.lab', {'levels': list(ISO), 'scenarios': meta, 'runs': runs, 'postgres': pg_version})

    # ---- atomicity: a transfer of 150 from Ana (100) to Ben (50), with and without a transaction
    plain = [('A', 'UPDATE acct SET balance = balance + 150 WHERE id = 2'), ('A', 'UPDATE acct SET balance = balance - 150 WHERE id = 1')]
    log1, fin1 = play(dsn, ACCT, plain, 'SELECT sum(balance) FROM acct', ['DROP TABLE acct'])
    tx = [('A', 'BEGIN'), ('A', 'UPDATE acct SET balance = balance + 150 WHERE id = 2'), ('A', 'UPDATE acct SET balance = balance - 150 WHERE id = 1'),
          ('A', 'SELECT sum(balance) FROM acct'), ('A', 'COMMIT')]
    log2, fin2 = play(dsn, ACCT, tx, 'SELECT sum(balance) FROM acct', ['DROP TABLE acct'])
    rec.counts('m10.transfer', {'before': '150', 'autocommit': {'steps': log1, 'total_after': fin1[0][0]}, 'transaction': {'steps': log2, 'total_after': fin2[0][0]}})

    # ---- a dirty read is not possible on PostgreSQL, even when you ask for READ UNCOMMITTED
    dirty = [('A', 'BEGIN ISOLATION LEVEL READ UNCOMMITTED'), ('A', 'SHOW transaction_isolation'), ('B', 'BEGIN'), ('B', 'UPDATE acct SET balance = 999 WHERE id = 1'),
             ('A', 'SELECT balance FROM acct WHERE id = 1'), ('B', 'ROLLBACK'), ('A', 'COMMIT')]
    log, fin = play(dsn, ACCT, dirty, 'SELECT balance FROM acct WHERE id = 1', ['DROP TABLE acct'])
    rec.counts('m10.dirty', {'steps': log, 'final': fin[0][0]})

    # ---- readers do not see half a change: delete and insert inside one transaction
    swap = [('B', 'SELECT count(*) FROM acct'), ('A', 'BEGIN'), ('A', 'DELETE FROM acct'), ('A', "INSERT INTO acct VALUES (7, 'Dee', 10), (8, 'Eve', 20), (9, 'Fay', 30)"),
            ('B', 'SELECT count(*) FROM acct'), ('A', 'COMMIT'), ('B', 'SELECT count(*) FROM acct')]
    log, fin = play(dsn, ACCT, swap, 'SELECT count(*) FROM acct', ['DROP TABLE acct'])
    rec.counts('m10.replace', {'steps': log})

    # ---- a savepoint keeps the work before a failed statement
    sp = [('A', 'BEGIN'), ('A', "INSERT INTO acct VALUES (3, 'Cai', 80)"), ('A', 'SAVEPOINT s1'), ('A', "INSERT INTO acct VALUES (1, 'Ana again', 5)"),
          ('A', 'ROLLBACK TO SAVEPOINT s1'), ('A', "INSERT INTO acct VALUES (4, 'Dee', 40)"), ('A', 'COMMIT')]
    log, fin = play(dsn, ACCT, sp, 'SELECT count(*) FROM acct', ['DROP TABLE acct'])
    rec.counts('m10.savepoint', {'steps': log, 'rows_after': fin[0][0]})

    # ---- lock behaviour: wait, NOWAIT, SKIP LOCKED and lock_timeout
    jobs = ["DROP TABLE IF EXISTS jobs", "CREATE TABLE jobs (id INTEGER PRIMARY KEY, state TEXT)", "INSERT INTO jobs VALUES (1, 'pending'), (2, 'pending'), (3, 'pending')"]
    locks = [('A', 'BEGIN'), ('A', 'SELECT id FROM jobs WHERE id = 1 FOR UPDATE'), ('B', 'BEGIN'),
             ('B', 'SELECT id FROM jobs WHERE id = 1 FOR UPDATE NOWAIT'), ('B', 'ROLLBACK'), ('B', 'BEGIN'),
             ('B', "SELECT id FROM jobs WHERE state = 'pending' ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED"), ('B', 'ROLLBACK'), ('B', 'BEGIN'),
             ('B', "SET LOCAL lock_timeout = '300ms'"), ('B', "UPDATE jobs SET state = 'done' WHERE id = 1"), ('B', 'ROLLBACK'), ('A', 'COMMIT')]
    log, fin = play(dsn, jobs, locks, 'SELECT count(*) FROM jobs', ['DROP TABLE jobs'])
    rec.counts('m10.locks', {'steps': log})

    # ---- a queue: two workers each take a different job with SKIP LOCKED
    queue = [('A', 'BEGIN'), ('A', "SELECT id FROM jobs WHERE state = 'pending' ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED"), ('B', 'BEGIN'),
             ('B', "SELECT id FROM jobs WHERE state = 'pending' ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED"), ('A', "UPDATE jobs SET state = 'done' WHERE id = 1"),
             ('B', "UPDATE jobs SET state = 'done' WHERE id = 2"), ('A', 'COMMIT'), ('B', 'COMMIT')]
    log, fin = play(dsn, jobs, queue, "SELECT id, state FROM jobs ORDER BY id", ['DROP TABLE jobs'])
    rec.counts('m10.queue', {'steps': log, 'final': [', '.join(r) for r in fin]})

    # ---- a deadlock: each session holds one row and wants the other
    admin(dsn, ACCT)
    a, b = Sess(dsn), Sess(dsn)
    watcher = psycopg.connect(dsn, autocommit=True)
    steps = []
    steps.append({'who': 'A', 'sql': 'BEGIN', 'out': show(a.run('BEGIN'))})
    steps.append({'who': 'A', 'sql': 'UPDATE acct SET balance = balance + 1 WHERE id = 1', 'out': show(a.run('UPDATE acct SET balance = balance + 1 WHERE id = 1'))})
    steps.append({'who': 'B', 'sql': 'BEGIN', 'out': show(b.run('BEGIN'))})
    steps.append({'who': 'B', 'sql': 'UPDATE acct SET balance = balance + 1 WHERE id = 2', 'out': show(b.run('UPDATE acct SET balance = balance + 1 WHERE id = 2'))})
    res = {}

    def a_wants_row2():
        out = a.run('UPDATE acct SET balance = balance + 1 WHERE id = 2')
        res['A'] = out
        if 'error' in out:
            res['A_rollback'] = a.run('ROLLBACK')
    t = threading.Thread(target=a_wants_row2)
    t.start()
    for _ in range(200):                                    # wait until A is really waiting for the lock
        n = watcher.execute("SELECT count(*) FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND datname = current_database()").fetchone()[0]
        if n:
            break
        time.sleep(0.02)
    res['B'] = b.run('UPDATE acct SET balance = balance + 1 WHERE id = 1')
    if 'error' in res['B']:
        res['B_rollback'] = b.run('ROLLBACK')
    t.join()
    victim = 'A' if 'error' in res['A'] else 'B' if 'error' in res['B'] else None
    if victim is None:
        raise RuntimeError('no deadlock was detected')
    steps.append({'who': 'A', 'sql': 'UPDATE acct SET balance = balance + 1 WHERE id = 2', 'out': 'waits for B, then: ' + show(res['A'])})
    steps.append({'who': 'B', 'sql': 'UPDATE acct SET balance = balance + 1 WHERE id = 1', 'out': show(res['B'])})
    survivor = 'B' if victim == 'A' else 'A'
    steps.append({'who': victim, 'sql': 'ROLLBACK', 'out': show(res[victim + '_rollback'])})
    steps.append({'who': survivor, 'sql': 'COMMIT', 'out': show((a if survivor == 'A' else b).run('COMMIT'))})
    final = final_value(dsn, 'SELECT id, balance FROM acct ORDER BY id')
    for s in (a, b):
        s.close()
    watcher.close()
    admin(dsn, ['DROP TABLE acct'])
    rec.counts('m10.deadlock', {'steps': steps, 'victim': victim, 'final': [', '.join(r) for r in final]})

    # ---- lost update, fixed in two ways. The atomic UPDATE needs no read. FOR UPDATE makes the second reader wait for the first writer.
    log, fin = play(dsn, ACCT, [('A', 'BEGIN'), ('A', 'UPDATE acct SET balance = balance + 10 WHERE id = 1'), ('B', 'BEGIN'),
                                ('A', 'COMMIT'), ('B', 'UPDATE acct SET balance = balance + 20 WHERE id = 1'), ('B', 'COMMIT')],
                    'SELECT balance FROM acct WHERE id = 1', ['DROP TABLE acct'])
    atomic = {'steps': log, 'final': fin[0][0]}
    admin(dsn, ACCT)
    a, b = Sess(dsn), Sess(dsn)
    watcher = psycopg.connect(dsn, autocommit=True)
    steps = []

    def step(sess, who, sql):
        out = show(sess.run(sql))
        steps.append({'who': who, 'sql': sql, 'out': out})
        return out
    step(a, 'A', 'BEGIN')
    step(a, 'A', 'SELECT balance FROM acct WHERE id = 1 FOR UPDATE')
    step(b, 'B', 'BEGIN')
    holder = {}
    t = threading.Thread(target=lambda: holder.update(out=b.run('SELECT balance FROM acct WHERE id = 1 FOR UPDATE')))
    t.start()
    for _ in range(200):
        n = watcher.execute("SELECT count(*) FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND datname = current_database()").fetchone()[0]
        if n:
            break
        time.sleep(0.02)
    step(a, 'A', 'UPDATE acct SET balance = 110 WHERE id = 1')
    step(a, 'A', 'COMMIT')
    t.join()
    steps.append({'who': 'B', 'sql': 'SELECT balance FROM acct WHERE id = 1 FOR UPDATE', 'out': 'waited for A, then: ' + show(holder['out'])})
    step(b, 'B', 'UPDATE acct SET balance = 130 WHERE id = 1')
    step(b, 'B', 'COMMIT')
    fin = final_value(dsn, 'SELECT balance FROM acct WHERE id = 1')
    a.close(); b.close(); watcher.close()
    admin(dsn, ['DROP TABLE acct'])
    rec.counts('m10.lost_fixes', {'atomic': atomic, 'forupdate': {'steps': steps, 'final': fin[0][0]}})

    # ---- after a serialization failure the application retries, and the retry sees the committed change
    retry = [('A', 'BEGIN ISOLATION LEVEL SERIALIZABLE'), ('A', 'SELECT count(*) FROM oncall WHERE on_call'), ('B', 'BEGIN ISOLATION LEVEL SERIALIZABLE'),
             ('B', 'SELECT count(*) FROM oncall WHERE on_call'), ('A', "UPDATE oncall SET on_call = false WHERE name = 'Ana'"), ('A', 'COMMIT'),
             ('B', "UPDATE oncall SET on_call = false WHERE name = 'Ben'"), ('B', 'ROLLBACK'),
             ('B', 'BEGIN ISOLATION LEVEL SERIALIZABLE'), ('B', 'SELECT count(*) FROM oncall WHERE on_call'), ('B', 'COMMIT')]
    log, fin = play(dsn, ONCALL, retry, 'SELECT count(*) FROM oncall WHERE on_call', ['DROP TABLE oncall'])
    rec.counts('m10.skew_retry', {'steps': log, 'final': fin[0][0]})

    # ---- other engines, for contrast: DuckDB (two connections to one database) and SQLite (two connections to one file)
    import duckdb
    d = duckdb.connect()
    d.execute('CREATE TABLE acct (id INTEGER PRIMARY KEY, balance INTEGER)')
    d.execute('INSERT INTO acct VALUES (1, 100)')
    c1, c2 = d.cursor(), d.cursor()
    out = []
    c1.execute('BEGIN')
    c1.execute('UPDATE acct SET balance = 110 WHERE id = 1')
    out.append({'who': 'A', 'sql': 'UPDATE acct SET balance = 110 WHERE id = 1', 'out': 'UPDATE'})
    c2.execute('BEGIN')
    try:
        c2.execute('UPDATE acct SET balance = 120 WHERE id = 1')
        out.append({'who': 'B', 'sql': 'UPDATE acct SET balance = 120 WHERE id = 1', 'out': 'UPDATE'})
    except Exception as ex:
        out.append({'who': 'B', 'sql': 'UPDATE acct SET balance = 120 WHERE id = 1', 'out': 'ERROR: ' + E.error_text(ex)})
    c1.execute('COMMIT')
    try:
        c2.execute('ROLLBACK')
    except Exception:
        pass
    rec.counts('m10.duckdb_conflict', {'steps': out, 'version': duckdb.__version__})
    import sqlite3
    tmp = tempfile.mkdtemp(prefix='sq_lock_')
    path = os.path.join(tmp, 'lock.db')
    s1 = sqlite3.connect(path, timeout=0, isolation_level=None)
    s2 = sqlite3.connect(path, timeout=0, isolation_level=None)
    s1.execute('CREATE TABLE acct (id INTEGER PRIMARY KEY, balance INTEGER)')
    s1.execute('INSERT INTO acct VALUES (1, 100)')
    out = []
    s1.execute('BEGIN IMMEDIATE')
    out.append({'who': 'A', 'sql': 'BEGIN IMMEDIATE', 'out': 'BEGIN'})
    try:
        s2.execute('BEGIN IMMEDIATE')
        out.append({'who': 'B', 'sql': 'BEGIN IMMEDIATE', 'out': 'BEGIN'})
    except Exception as ex:
        out.append({'who': 'B', 'sql': 'BEGIN IMMEDIATE', 'out': 'ERROR: ' + E.error_text(ex)})
    s1.execute('COMMIT')
    s1.close()
    s2.close()
    rec.counts('m10.sqlite_locked', {'steps': out, 'version': sqlite3.sqlite_version})
