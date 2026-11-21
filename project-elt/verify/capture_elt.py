#!/usr/bin/env python3
"""Record what the real ELT project does, for the walkthrough.

The project projects/brewline-elt is copied to a temporary folder and run with its three tools: pytest, then the DAG brewline_daily through `airflow dags test` for three days of the pretend shop
(dlt loads into DuckDB, dbt builds and tests, a quality gate compares the warehouse with the shop, and the marts are published as Parquet), the failure of day 3, its fix, and a backfill of day 2.
It also runs the quality gate as it was first written, which failed a backfill for a bad reason. Nothing is timed.

Not recorded: a cloud warehouse, a real source, a deployed Airflow (a scheduler, a worker and the UI), alerts, a CI run.

Usage:   ELT_INGEST_PY=.. ELT_DBT=.. ELT_AIRFLOW=.. ELT_TEST_PY=.. python3 project-elt/verify/capture_elt.py [--out project-elt/js/real.js]
"""
import argparse
import datetime
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.dont_write_bytecode = True
import eltlib                                           # noqa: E402
from eltlib import R, T, REPO, tool                     # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--out', default=str(HERE.parent / 'js' / 'real.js'))
args = ap.parse_args()

for f in sorted(REPO.rglob('*')):
    rel = str(f.relative_to(REPO))
    if f.is_file() and (f.suffix in ('.py', '.sql', '.yml', '.csv', '.md', '.txt') or f.name in ('Makefile', '.gitignore')) and not any(p in rel for p in ('warehouse/', 'published/', '__pycache__', '/target/', '/logs/', '.pytest_cache', '.user.yml')):
        R['files'][rel] = f.read_text()


def version(py_or_bin, args_):
    return eltlib.sh([py_or_bin, *args_]).stdout.strip()


R['meta'].update({'dlt': eltlib.sh([tool('ELT_INGEST_PY'), '-c', 'import dlt,duckdb;print(dlt.__version__)']).stdout.strip(), 'duckdb': eltlib.sh([tool('ELT_INGEST_PY'), '-c', 'import duckdb;print(duckdb.__version__)']).stdout.strip(),
                  'dbt': re.search(r'installed:\s*(\S+)', eltlib.sh([tool('ELT_DBT'), '--version']).stdout).group(1), 'airflow': version(tool('ELT_AIRFLOW'), ['version']).split('\n')[-1],
                  'recorded_on': datetime.date.today().isoformat(), 'note': 'Recorded by project-elt/verify/capture_elt.py: the real project in a temporary copy, with dlt, dbt-duckdb and Airflow (airflow dags test).'})
R['meta']['dbt_duckdb'] = re.search(r'duckdb:\s*(\S+)', eltlib.sh([tool('ELT_DBT'), '--version']).stdout).group(1)

P = eltlib.Project()
r = eltlib.sh([tool('ELT_TEST_PY'), '-m', 'pytest', '-q', 'tests'], cwd=P.home, env=P.env)
assert r.returncode == 0, r.stdout[-400:]
T('tests.run', 'pytest -q tests\n' + re.sub(r' in [\d.]+s', '', r.stdout.strip().split('\n')[-1]))
R['counts']['tests'] = {'passed': int(re.search(r'(\d+) passed', r.stdout).group(1))}

RUNS = []
STAGES = {'extract_load': 'load', 'dbt_build': 'dbt', 'quality_gate': 'gate', 'publish': 'publish'}


def record(key, label, date, expect_ok):
    code, run = P.dag_test(date)
    assert (code == 0) == expect_ok, '%s: exit code %d, state %s' % (key, code, run['state'])
    out = run['out']
    load = [l for l in out.get('extract_load', []) if l.startswith('loaded day')]
    dbt_sum, dbt_fail, dbt_skip = eltlib.dbt_summary(out.get('dbt_build', []))
    gate = eltlib.gate_lines(out.get('quality_gate', []))
    pub = [l for l in out.get('publish', []) if l.startswith('published')]
    states = dict(run['tasks'])
    RUNS.append({'key': key, 'label': label, 'date': date, 'state': run['state'], 'tasks': {t: states.get(t, 'not run') for t in STAGES}, 'load': load[0] if load else '', 'dbt': dbt_sum, 'dbt_fail': dbt_fail, 'dbt_skip': dbt_skip,
                 'gate': gate, 'publish': pub})
    T('run.' + key, 'airflow dags test brewline_daily %s\n' % date + '\n'.join(['DAG run: ' + run['state']] + ['  %-13s %s' % (t, states.get(t, 'not run')) for t in STAGES] + (['  ' + load[0]] if load else []) +
      (['  dbt: PASS=%(PASS)d ERROR=%(ERROR)d SKIP=%(SKIP)d of %(TOTAL)d' % dbt_sum] if dbt_sum else []) + ['  failed test: ' + f for f in dbt_fail] + ['  ' + g for g in gate] + ['  ' + p for p in pub]))
    return run


record('day1', 'Day 1', '2026-03-01', True)
R['counts']['after_day1'] = {'raw_orders': P.query('select count(*) from raw.orders')[0][0], 'fct_orders': P.query('select count(*) from main.fct_orders')[0][0]}
record('day2', 'Day 2', '2026-03-02', True)
R['counts']['after_day2'] = {'raw_orders': P.query('select count(*) from raw.orders')[0][0], 'fct_orders': P.query('select count(*) from main.fct_orders')[0][0], 'orders_daily': P.query('select count(*) from main.orders_daily')[0][0]}
record('day3_fail', 'Day 3', '2026-03-03', False)
R['counts']['after_failed_day3'] = {'raw_orders': P.query('select count(*) from raw.orders')[0][0], 'fct_orders': P.query('select count(*) from main.fct_orders')[0][0], 'orders_daily': P.query('select count(*) from main.orders_daily')[0][0],
                                    'unpriced_lines': P.query("select count(*) from main.stg_order_lines where sku not in (select sku from main.product_prices)")[0][0],
                                    'unpriced_sku': P.query("select distinct sku from main.stg_order_lines where sku not in (select sku from main.product_prices)")[0][0]}
seed = P.home / 'dbt' / 'seeds' / 'product_prices.csv'
seed.write_text(seed.read_text().rstrip('\n') + '\nCAPSULE-10,1200\n')
record('day3_fix', 'Day 3 again', '2026-03-03', True)
snap = P.query("select store_id, store_name, dbt_valid_to is null from snapshots.stores_snapshot where store_id = 4 order by dbt_valid_from")
R['tables']['snapshot.store4'] = {'cols': ['store', 'name', 'current'], 'rows': [[a, b, bool(c)] for a, b, c in snap]}
R['tables']['orders_daily'] = {'cols': ['date', 'region', 'orders', 'revenue_cents'], 'rows': [[str(a), b, c, d] for a, b, c, d in P.query('select * from main.orders_daily order by 1, 2')]}
R['counts']['after_day3'] = {'raw_orders': P.query('select count(*) from raw.orders')[0][0], 'fct_orders': P.query('select count(*) from main.fct_orders')[0][0], 'orders_daily': P.query('select count(*) from main.orders_daily')[0][0],
                             'revenue_cents': P.query('select sum(total_cents) from main.fct_orders')[0][0], 'lines': P.query('select count(*) from raw.orders__lines')[0][0]}

# the quality gate as it was first written: it compares with the shop of the day of the run, and the warehouse is already at day 3
gate_py = P.home / 'quality' / 'source_vs_warehouse.py'
first_version = gate_py.read_text().replace('    day = max(day, latest_day(con))\n', '')
assert first_version != gate_py.read_text()
bad = P.home / 'quality' / 'gate_first_version.py'
bad.write_text(first_version)
code, out = P.run_script([str(bad), '--day', '2', '--warehouse', str(P.warehouse)])
R['counts']['first_gate'] = {'exit': code, 'lines': [l for l in out.split('\n') if l.startswith(('PASS', 'FAIL'))]}
T('gate.first', 'python quality/source_vs_warehouse.py --day 2        # the first version\n' + out)
bad.unlink()
record('backfill2', 'Backfill of day 2', '2026-03-02', True)
R['counts']['after_backfill'] = {'raw_orders': P.query('select count(*) from raw.orders')[0][0], 'distinct': P.query('select count(distinct id) from raw.orders')[0][0], 'fct_orders': P.query('select count(*) from main.fct_orders')[0][0],
                                'orders_daily': P.query('select count(*) from main.orders_daily')[0][0]}

R['tables']['runs'] = {'cols': ['run', 'date', 'dag', 'load', 'dbt', 'gate', 'publish'],
                       'rows': [[x['label'], x['date'], x['state'], x['tasks']['extract_load'], x['tasks']['dbt_build'], x['tasks']['quality_gate'], x['tasks']['publish']] for x in RUNS]}
R['counts']['runs'] = {x['key']: {'state': x['state'], 'tasks': x['tasks'], 'load': x['load'], 'dbt': x['dbt'], 'dbt_fail': x['dbt_fail'], 'dbt_skip': x['dbt_skip'], 'gate': x['gate'], 'publish': x['publish']} for x in RUNS}
T('tool.versions', 'dlt %(dlt)s with DuckDB %(duckdb)s, dbt %(dbt)s with dbt-duckdb %(dbt_duckdb)s, Airflow %(airflow)s' % R['meta'])
eltlib.write_real(args.out)
print('wrote %s: %d files, %d texts, %d tables, %d sets of counts' % (args.out, len(R['files']), len(R['text']), len(R['tables']), len(R['counts'])))
