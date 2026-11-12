#!/usr/bin/env python3
"""Record what DuckDB, PostgreSQL and SQLite do with the Brewline data, for the SQL tutorial.

Everything here ran. The recording comes from:
  DuckDB       an embedded analytical engine (the version is in the recording)
  PostgreSQL   a real server on 127.0.0.1 in a temporary directory, with two client sessions for the transaction lessons
  SQLite       the version that ships with Python's sqlite3 module
  sqlglot      a parser and translator. It only rewrites text: a query that sqlglot translates for Snowflake, BigQuery, Redshift,
               MySQL, SQL Server or Oracle was NOT run there, and the lessons say "translated, not run".
Nothing ran on a cloud warehouse. Plans, row counts and result tables are real. Times are not recorded, because they change from run to run.

Usage:   python3 sql/verify/capture_sq.py [--out sql/js/real.js] [--json FILE]
Needs:   pip install duckdb sqlglot "psycopg[binary]" pyarrow     and PostgreSQL 16 server programs (apt install postgresql-16), or SQ_PG_DSN
         set to a running server (the script then creates and drops a database called sq_course there).
"""
import argparse
import importlib
import json
import os
import pathlib
import platform
import sqlite3
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import brewdata  # noqa: E402
import engines as E  # noqa: E402
import rec as R  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--out', default=str(HERE.parent / 'js' / 'real.js'))
ap.add_argument('--json')
args = ap.parse_args()

SECTIONS = ['s_map', 's_nulls', 's_joins', 's_agg', 's_sub', 's_windows', 's_dates', 's_patterns', 's_changing', 's_tx', 's_plans', 's_model', 's_dialects']


def main():
    import duckdb
    import sqlglot
    import psycopg
    rec = R.Rec()
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
        o = rec.out['meta']
        o.update({'duckdb': rec.eng['duckdb'].version, 'postgres': rec.eng['postgres'].version, 'sqlite': rec.eng['sqlite'].version,
                  'sqlglot': sqlglot.__version__, 'psycopg': psycopg.__version__, 'python': platform.python_version(),
                  'note': 'Recorded by sql/verify/capture_sq.py: DuckDB, PostgreSQL and SQLite ran every query on this machine with made-up Brewline data. '
                          'sqlglot translated some queries for other dialects, and those were not run. Nothing ran on a cloud warehouse.'})
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
        # ---- the .sql files, in order
        for f in sorted((HERE / 'q').glob('*.sql')):
            R.run_file(rec, f)
        # ---- the sections written in Python
        for name in SECTIONS:
            if (HERE / (name + '.py')).exists():
                mod = importlib.import_module(name)
                mod.run(rec)
        # ---- write
        body = 'window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(rec.out, indent=1, ensure_ascii=False, sort_keys=True) + ';\n'
        pathlib.Path(args.out).write_text(body)
        if args.json:
            pathlib.Path(args.json).write_text(json.dumps(rec.out, indent=1, ensure_ascii=False, sort_keys=True))
        print('wrote', args.out, '(%d bytes)' % len(body), {k: len(v) for k, v in rec.out.items()}, 'blocks:', rec.blocks, 'statements:', rec.statements)
    finally:
        pgs.stop()


main()
