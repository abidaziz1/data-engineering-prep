"""The three engines with the Brewline data loaded, shared by capture_sq.py (the recorder) and verify_sq.py (the verifier).

open_world starts a throw-away PostgreSQL server (or uses SQ_PG_DSN), opens DuckDB, SQLite and PostgreSQL, loads the mini data on all three,
loads the big tables for the plan lessons, and records the data tables and their sizes in the Rec that it is given. The caller stops the
server with the object that comes back.
"""
import brewdata
import engines as E


def open_world(rec):
    pgs = E.PgServer()
    dsn = pgs.start()
    try:
        admin = E.PgEngine(dsn)
        admin.run('DROP DATABASE IF EXISTS sq_course WITH (FORCE)')
        admin.run('CREATE DATABASE sq_course')
        base = dsn.split(' dbname=')[0] if ' dbname=' in dsn else dsn
        rec.dsn = base + ' dbname=sq_course'
        rec.eng['duckdb'] = E.DuckEngine()
        rec.eng['sqlite'] = E.SqliteEngine()
        rec.eng['postgres'] = E.PgEngine(rec.dsn)
        # ---- the data
        mini = brewdata.mini_script()
        rec.file('data/mini.sql', mini)
        for e in E.ENGINES:
            for st in E.split_statements(mini):
                rec.eng[e].run(st)
        for e in E.ENGINES:
            big = brewdata.big_script(e)
            rec.file('data/big.%s.sql' % e, big)
            for st in E.split_statements(big):
                rec.eng[e].run(st)
        rec.run('postgres', 'ALTER TABLE big_orders SET (autovacuum_enabled = false)')
        rec.run('postgres', 'ALTER TABLE big_items SET (autovacuum_enabled = false)')
        rec.run('postgres', 'ALTER TABLE big_customers SET (autovacuum_enabled = false)')
        rec.run('postgres', 'SET default_statistics_target = 1000')
        rec.run('postgres', 'ANALYZE')
        # the mini tables as the lessons show them: DuckDB's own output, in the order of the first column
        for name in brewdata.ORDER:
            t = brewdata.T[name]
            order = ', '.join(str(i + 1) for i in range(min(2, len(t['cols']))))
            rec.result_table('data.' + name, rec.run('duckdb', 'SELECT * FROM %s ORDER BY %s' % (name, order)))
        rec.counts('data.sizes', {
            'mini': {n: len(brewdata.T[n]['rows']) for n in brewdata.ORDER},
            'big': {n: rec.scalar('duckdb', 'SELECT count(*) FROM ' + n) for n in ('big_customers', 'big_orders', 'big_items')},
            'big_agree': {n: [rec.scalar(e, 'SELECT count(*) FROM ' + n) for e in E.ENGINES] for n in ('big_customers', 'big_orders', 'big_items')},
        })
    except BaseException:
        pgs.stop()
        raise
    return pgs
