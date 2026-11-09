#!/usr/bin/env python3
"""Check the SQL in a tutorial.

1. Every SQL snippet is parsed with sqlglot in the Snowflake dialect (syntax only).
2. If <tutorial>/verify/duckdb_checks.py exists, its checks run the worksheet queries in DuckDB
   and compare the rows with the result tables shown in the lessons.

Run:  python3 dev/verify_sql.py snowflake
Needs: pip install sqlglot duckdb
"""
import importlib.util, json, logging, pathlib, re, subprocess, sys

import sqlglot
from sqlglot import errors, exp

logging.getLogger('sqlglot').setLevel(logging.ERROR)  # the 'falling back to Command' notices are counted below

ROOT = pathlib.Path(__file__).resolve().parent.parent
name = sys.argv[1] if len(sys.argv) > 1 else 'snowflake'
data = json.loads(subprocess.check_output(['node', str(ROOT / 'dev' / 'dump-scenes.js'), name]))

problems = 0


def bad(msg):
    global problems
    problems += 1
    print('PROBLEM:', msg)


# ---- 1. syntax of every SQL snippet --------------------------------------------------------
n_stmt = n_opaque = 0
for sn in data['snippets']:
    if sn['lang'] not in ('sql', 'jinja') or sn['kind'] == 'starter':   # starters are deliberately incomplete
        continue
    code = sn['code']
    # split on semicolons that end a line, so one bad statement is reported on its own
    parts = [p.strip() for p in re.split(r';\s*(?:\n|$)', code) if p.strip()]
    for p in parts:
        body = re.sub(r'--[^\n]*', '', p).strip()
        if not body:
            continue
        n_stmt += 1
        try:
            tree = sqlglot.parse_one(body, read='snowflake', error_level=errors.ErrorLevel.RAISE)
            if isinstance(tree, exp.Command):
                n_opaque += 1          # parsed only as an opaque command: syntax is NOT validated
        except errors.SqlglotError as e:
            bad('%s (%s): %s\n    %s' % (sn['id'], sn['kind'], str(e).splitlines()[0][:150], body.splitlines()[0][:120]))
print('syntax: %d statements. %d parsed fully by sqlglot (snowflake dialect). %d are Snowflake-specific statements that sqlglot only accepts as opaque commands, so their syntax was reviewed by hand, not by a parser.' % (n_stmt, n_stmt - n_opaque, n_opaque))

# ---- 2. results re-run in DuckDB ------------------------------------------------------------
chk = ROOT / name / 'verify' / 'duckdb_checks.py'
if chk.exists():
    spec = importlib.util.spec_from_file_location('duckdb_checks', chk)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    shown = {r['id']: r for r in data['results']}

    def norm(v):
        if v is None:
            return 'NULL'
        s = str(v).strip()
        s = re.sub(r'(\.0+)?( \+0000)?$', '', s) if re.match(r'^\d{4}-\d{2}-\d{2} ', s) else s
        try:
            return round(float(s.replace(',', '')), 2)
        except ValueError:
            return s

    ok = 0
    checks = {k: v for k, v in mod.run().items() if not k.startswith('_')}
    for cid, (cols, rows) in checks.items():
        exp = shown.get(cid)
        if not exp:
            bad('check %s has no result table in the lessons' % cid)
            continue
        got = [[norm(c) for c in r] for r in rows]
        want = [[norm(c) for c in r] for r in exp['rows']]
        if [c.lower() for c in cols] != [c.lower() for c in exp['cols']]:
            bad('%s: columns differ. DuckDB %s, lessons %s' % (cid, cols, exp['cols']))
        elif got != want:
            bad('%s: rows differ.\n   DuckDB : %s\n   lesson : %s' % (cid, got, want))
        else:
            ok += 1
    print('results: %d of %d checked result tables match DuckDB' % (ok, len(checks)))
print('%d problem(s)' % problems if problems else 'sql verification clean')
sys.exit(1 if problems else 0)
