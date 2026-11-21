#!/usr/bin/env python3
"""Check the code and the recorded output of the Microsoft Fabric course.

 1. The files of the recording are the files of fabric/verify/project, and every code screen that names such a file shows it exactly.
 2. Every Python snippet is parsed. Every SQL text of the lessons (the project files and the statements of the terminal replays) goes through the SQL parser of Apache Spark with
    the Delta Lake extension. The T-SQL (the Warehouse file and the bug hunt) is parsed by the T-SQL dialect of sqlglot, which checks the syntax and nothing else.
 3. The notebook files of the project are run on a local Spark session in a lakehouse-shaped folder: five daily files are landed, cleaned and merged, gold is built, and the counts
    must be the recorded ones (bronze 10,157 lines in 5 commits, silver 10,000 orders and 17 rejects, eight merge runs with the recorded inserts and updates, gold 60 rows).
 4. Seven bug hunts are run next to their fixes: schema inference, a merge with no condition, a typo with mergeSchema, files removed by hand, a clock date, the .platform logical
    id and the Warehouse trigger (which can only be parsed).
 5. The lab data: check_widgets.js recomputes the rules from the rules of the data, and ten changes to the recording must make it fail.
 6. The lint of the course (dev/lint-content.js).
 7. With --recapture the whole recording is made again on this machine (about 3 minutes) and compared with js/real.js. Nothing is timed, so everything must repeat. The only allowance
    is the date of the recording.
 8. With --browser the six labs are driven in Chromium (e2e_labs.js), and six changes to the widget code must make that test fail.

What this cannot show: how Microsoft Fabric itself behaves. The capacity and its throttling, OneLake, the Warehouse and the SQL analytics endpoint, pipelines, Dataflows Gen2, Direct
Lake, Git integration and security did not run. Those screens carry the "From documentation" tag, and the README lists what to check again.

Run:   fabric-env/bin/python fabric/verify/verify_fabric.py [--recapture] [--browser] [--verbose]
Needs: see fabric/verify/requirements.txt. A check whose tool is missing says so and is skipped.
"""
import argparse
import ast
import json
import logging
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

sys.dont_write_bytecode = True
HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
PROJECT = HERE / 'project'
sys.path.insert(0, str(HERE))

logging.getLogger('sqlglot').setLevel(logging.ERROR)      # a trigger is parsed as a Command, which the bug hunt expects
ap = argparse.ArgumentParser()
ap.add_argument('--recapture', action='store_true', help='record everything again on this machine and compare with js/real.js (about 3 minutes)')
ap.add_argument('--browser', action='store_true', help='also drive the six labs in Chromium (fabric/verify/e2e_labs.js) and its controls')
ap.add_argument('--verbose', '-v', action='store_true')
args = ap.parse_args()

problems, counts, skips = [], {}, []


def bad(msg):
    problems.append(msg)
    print('PROBLEM:', msg)


def tick(group, k=1):
    counts[group] = counts.get(group, 0) + k


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


REAL = load_real(ROOT / 'fabric' / 'js' / 'real.js')
r = runp(['node', str(HERE / 'dump_fabric.js')], cwd=str(ROOT))
if r.returncode:
    print('PROBLEM: the course does not load: ' + (r.stderr or r.stdout)[-600:])
    sys.exit(1)
DUMP = json.loads(r.stdout)
CODE = {c['id']: c for c in DUMP['code']}
F = REAL['files']

try:
    import sqlglot
except ImportError:
    sqlglot = None
    skipped('T-SQL parsing', 'sqlglot is not installed')
try:
    import fablib
    from pyspark.sql import functions as SF      # noqa: F401
    HAVE_SPARK = True
except ImportError:
    HAVE_SPARK = False
    skipped('the Spark checks', 'pyspark and delta-spark are not installed (see requirements.txt)')

# ----------------------------------------------------------------------------------------------------------------------
# 1. The files of the recording and the code screens
# ----------------------------------------------------------------------------------------------------------------------
for f in sorted(p for p in PROJECT.iterdir() if p.is_file()):
    expect(F.get(f.name) == f.read_text(), 'the recording holds %s as it is on disk' % f.name, 'recorded files')
expect(set(F) == {f.name for f in PROJECT.iterdir() if f.is_file()}, 'the recording holds the files of the project and nothing else', 'recorded files')
SCREENS = {'m3-code': '01_bronze.py', 'm4-code': '02_silver.py', 'm4-changed': '02b_changed_only.py', 'm4-gold': '03_gold.sql', 'm5-maint': '04_maintenance.py', 'm6-tsql': 'gold_daily.tsql',
           'm7-once': '01b_land_once.py', 'm8-platform': 'platform_example.json'}
for sid, fn in SCREENS.items():
    expect(CODE[sid]['code'].rstrip('\n') == F[fn].rstrip('\n'), 'the code screen %s shows %s exactly' % (sid, fn), 'code screens that show a recorded file')

# ----------------------------------------------------------------------------------------------------------------------
# 2. Parsing
# ----------------------------------------------------------------------------------------------------------------------
for c in DUMP['code']:
    if c['lang'] == 'python':
        try:
            ast.parse(c['code'])
            tick('Python snippets parsed')
        except SyntaxError as e:
            bad('the Python of %s does not compile: %s' % (c['id'], e))
    elif c['lang'] == 'json':
        try:
            json.loads(c['code'])
            tick('JSON files parsed')
        except ValueError as e:
            bad('the JSON of %s does not parse: %s' % (c['id'], e))
    elif c['lang'] == 'tsql' and sqlglot:
        try:
            sqlglot.parse(c['code'], read='tsql')
            tick('T-SQL texts parsed by sqlglot')
        except Exception as e:      # noqa: BLE001
            bad('sqlglot cannot parse the T-SQL of %s: %s' % (c['id'], str(e)[:100]))
for fn in PROJECT.glob('*.py'):
    ast.parse(fn.read_text())
    tick('project files parsed')
if sqlglot:
    control('T-SQL with a misspelt keyword, given to sqlglot', lambda: sqlglot.parse('SELEC 1 FROM t WHERE', read='tsql') is None)
control('Python with a syntax error', lambda: ast.parse('def f(:\n') is None)
control('JSON with a trailing comma', lambda: json.loads('{"a": 1,}') is None)

# ----------------------------------------------------------------------------------------------------------------------
# 3 to 4. The project and the bug hunts, run on local Spark
# ----------------------------------------------------------------------------------------------------------------------
SQL_START = re.compile(r'^(SELECT|OPTIMIZE|VACUUM|DESCRIBE|RESTORE|ALTER|INSERT|MERGE|DROP|CREATE|SET|DELETE)\b', re.I)


def sql_statements_of(cmd):
    c = re.sub(r'\s+--.*$', '', cmd.strip(), flags=re.M)
    if re.search(r'\.\.\.|<[^>]*>', c):
        return []
    return [s.strip() for s in c.split(';') if SQL_START.match(s.strip())]


if HAVE_SPARK:
    spark = fablib.start_spark()
    sql = spark.sql
    LH = fablib.LH
    parser = spark._jsparkSession.sessionState().sqlParser()

    def spark_parses(stmt):
        parser.parsePlan(stmt)
        return True

    # SQL texts of the lessons through the parser of Spark with the Delta extension
    n_sql = 0
    for fn in sorted(PROJECT.glob('*.sql')):
        for stmt in [s.strip() for s in re.sub(r'^--.*$', '', fn.read_text(), flags=re.M).split(';') if s.strip()]:
            try:
                spark_parses(stmt)
                tick('SQL statements of the project parsed by Spark')
            except Exception as e:      # noqa: BLE001
                bad('Spark cannot parse a statement of %s: %s' % (fn.name, str(e)[:100]))
    for c in DUMP['commands']:
        for stmt in sql_statements_of(c['cmd']):
            n_sql += 1
            try:
                spark_parses(stmt)
                tick('statements of the terminal replays parsed by Spark')
            except Exception as e:      # noqa: BLE001
                bad('%s: Spark cannot parse "%s": %s' % (c['id'], stmt[:80], str(e).split('\n')[0][:80]))
    expect(n_sql >= 15, 'the replays hold at least 15 SQL statements that can be parsed (found %d)' % n_sql, 'statements')
    control('a statement with a misspelt keyword, given to the parser of Spark', lambda: spark_parses('SELEC 1') is None)
    control('OPTIMIZE with no table, given to the parser of Spark with Delta', lambda: spark_parses('OPTIMIZE') is None)

    def ns_run(name, **ns):
        g = {'spark': spark}
        g.update(ns)
        exec(compile((PROJECT / name).read_text(), name, 'exec'), g)
        return g

    def hist(name):
        return [dict(version=r['version'], operation=r['operation'], m=dict(r['operationMetrics'] or {})) for r in sql('DESCRIBE HISTORY ' + name).orderBy('version').collect()]

    def n_rows(name):
        return sql('SELECT count(*) FROM ' + name).collect()[0][0]

    def fails(fn):
        try:
            fn()
        except Exception as e:      # noqa: BLE001
            return str(e)
        return None

    for d in range(1, 6):
        fablib.write_day(d)
    for stmt in [s.strip() for s in re.sub(r'^--.*$', '', F['00_tables.sql'], flags=re.M).split(';') if s.strip()]:
        sql(stmt)
    g1 = ns_run('01_bronze.py')
    g2 = ns_run('02_silver.py')
    land, to_silver = g1['land'], g2['to_silver']
    day = lambda d: '2026-03-%02d' % d      # noqa: E731
    for d in range(1, 6):
        land(day(d))
    RUNS = REAL['tables']['silver.merge_runs']['rows']
    got = []
    for d in [1, 2, 3, 4, 5, 5, 4, 5]:
        to_silver(day(d))
        h = hist('silver_orders')[-1]
        got.append([h['m'].get('numTargetRowsInserted', '0'), h['m'].get('numTargetRowsUpdated', '0'), h['version'], n_rows('silver_orders')])
    want = [[str(r[2]), str(r[3]), r[4], r[5]] for r in RUNS]
    expect([[str(x[0]), str(x[1]), x[2], x[3]] for x in got] == want, 'the eight merge runs on this machine insert, update and count what the recording says: %s against %s' % (got, want), 'project runs')
    BR = REAL['counts']['bronze.log']
    expect((n_rows('bronze_orders'), len(hist('bronze_orders'))) == (BR['rows'], BR['commits']), 'bronze holds the recorded %d lines in %d commits' % (BR['rows'], BR['commits']), 'project runs')
    # the repeats add the same rejected lines again, so the distinct lines are counted
    expect(sql("SELECT count(*) FROM (SELECT DISTINCT _source_file, _reason, order_id, amount FROM silver_rejects)").collect()[0][0] == REAL['counts']['silver.merge']['rejects'] - 11, 'the rejected lines are the recorded ones (the 12 lines without an id are one distinct line, and 5 have an amount that is not a number)', 'project runs')
    run_sql = lambda name: [sql(s.strip()) for s in re.sub(r'^--.*$', '', F[name], flags=re.M).split(';') if s.strip()]      # noqa: E731
    run_sql('03_gold.sql')
    G_ = REAL['counts']['gold.table']
    expect((n_rows('gold_daily_revenue'), float(sql('SELECT sum(revenue) FROM gold_daily_revenue').collect()[0][0])) == (G_['rows'], G_['revenue']), 'gold has the recorded %d rows and revenue %s' % (G_['rows'], G_['revenue']), 'project runs')
    # the later cells: the merge of changed lines only, and the landing step that is safe to repeat
    ns_c = ns_run('02b_changed_only.py', DeltaTable=g2['DeltaTable'], prepare=g2['prepare'])
    sql('CREATE TABLE v_changed USING DELTA AS SELECT * FROM silver_orders')
    v0 = hist('v_changed')[-1]['version']
    ns_c['to_silver_changed'](day(5), 'v_changed')
    expect(hist('v_changed')[-1]['version'] == v0, 'a merge of the changed lines only makes no commit when nothing changed', 'project runs')
    once = ns_run('01b_land_once.py')['land_once']
    for _ in range(3):
        once(day(5), 'v_once')
    expect(n_rows('v_once') == REAL['counts']['bronze.retry']['rows_in_file'], 'three runs of the landing step that is safe to repeat leave one copy of the file', 'project runs')
    # maintenance on the tables of this run
    before = {t: sql('DESCRIBE DETAIL ' + t).collect()[0]['numFiles'] for t in ['bronze_orders', 'silver_orders', 'gold_daily_revenue']}
    ns_run('04_maintenance.py')
    after = {t: sql('DESCRIBE DETAIL ' + t).collect()[0]['numFiles'] for t in before}
    expect(all(after[t] == 1 and before[t] >= 1 for t in before) and after['silver_orders'] < before['silver_orders'], 'the maintenance notebook compacts every table to one file: %s -> %s' % (before, after), 'project runs')

    # ---- the bug hunts -------------------------------------------------------------------------------------------------------------------
    def patch(code, **rep):
        for k, v in rep.items():
            assert k in code, 'the text "%s" is not in the code that is patched' % k
            code = code.replace(k, v)
        return code

    # m3: schema inference
    ns3 = {'spark': spark}
    exec(CODE['m3-bug']['code'], ns3)
    ns3['land'](day(1))
    err = fails(lambda: ns3['land'](day(3)))
    expect(err is not None and 'DELTA_FAILED_TO_MERGE_FIELDS' in err, 'm3: schema inference makes the append of day 3 fail with a merge of fields', 'bug hunts run')
    ns3f = {'spark': spark, 'F': SF}
    exec(patch(CODE['m3-bug:fix']['code'], bronze_orders='bh_text'), ns3f)
    for d in (1, 3):
        ns3f['land'](day(d))
    expect(n_rows('bh_text') == 2000 + 2005, 'm3: the fix, with every column as text, takes both days', 'bug hunts run')
    # m4: a merge with no condition against the fix, each on a copy of silver
    for tname in ('bh_nocond', 'bh_cond'):
        sql('CREATE TABLE %s USING DELTA AS SELECT * FROM silver_orders' % tname)
    good = g2['prepare'](day(5))
    nsb = {'spark': spark, 'DeltaTable': g2['DeltaTable'], 'good': good}
    exec(patch(CODE['m4-bug']['code'], silver_orders='bh_nocond'), nsb)
    exec(patch(CODE['m4-bug:fix']['code'], silver_orders='bh_cond'), nsb)
    ub, uf = int(hist('bh_nocond')[-1]['m'].get('numTargetRowsUpdated', 0)), int(hist('bh_cond')[-1]['m'].get('numTargetRowsUpdated', 0))
    expect(ub == 2040 and uf == 0, 'm4: the merge with no condition updates all %d matched rows of a file that holds nothing new, and the one with the condition updates %d' % (ub, uf), 'bug hunts run')
    # m5: a typo with mergeSchema
    sql('CREATE TABLE bh_typo USING DELTA AS SELECT * FROM silver_orders')
    ns5 = {'spark': spark, 'good': good}
    exec(patch(CODE['m5-bug']['code'], silver_orders='bh_typo'), ns5)
    expect('custmer_id' in spark.table('bh_typo').columns, 'm5: with mergeSchema the typo becomes a new column', 'bug hunts run')
    sql('CREATE TABLE bh_typo2 USING DELTA AS SELECT * FROM silver_orders')
    err = fails(lambda: exec(patch(CODE['m5-bug']['code'], silver_orders='bh_typo2', **{'    .option("mergeSchema", "true")\n': ''}), {'spark': spark, 'good': good}))
    expect(err is not None and 'custmer_id' not in spark.table('bh_typo2').columns, 'm5: without mergeSchema the same write is refused and adds no column', 'bug hunts run')
    sql('CREATE TABLE bh_ok USING DELTA AS SELECT * FROM silver_orders')
    exec(patch(CODE['m5-bug:fix']['code'], silver_orders='bh_ok'), {'spark': spark, 'good': good})
    expect(spark.table('bh_ok').columns == spark.table('silver_orders').columns, 'm5: the fix writes with the schema of the table and adds no column', 'bug hunts run')
    # m2: data files removed by hand
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='fabric-clean-'))
    shutil.copytree(LH / 'Tables' / 'bronze_orders', tmp / 'bronze_orders')
    sql("CREATE TABLE bh_clean USING DELTA LOCATION '%s'" % (tmp / 'bronze_orders'))
    sql_ok = fails(lambda: spark.read.format('delta').load(str(tmp / 'bronze_orders')).select(SF.max(SF.length('amount'))).collect())
    expect(sql_ok is None, 'm2: the copy of bronze reads before the cleanup', 'bug hunts run')
    exec(patch(CODE['m2-bug']['code'], **{'/lakehouse/default/Tables': str(tmp)}), {})
    err = fails(lambda: spark.read.format('delta').load(str(tmp / 'bronze_orders')).select(SF.max(SF.length('amount'))).collect())
    expect(err is not None and ('FILE_NOT_EXIST' in err or 'does not exist' in err.lower()), 'm2: after the files were removed by hand the table cannot be read', 'bug hunts run')
    exec(CODE['m2-bug:fix']['code'], {'spark': spark})
    expect(n_rows('bronze_orders') == BR['rows'], 'm2: the fix, a plain VACUUM, leaves the tables readable', 'bug hunts run')
    shutil.rmtree(tmp, ignore_errors=True)
    # m7: the clock
    import datetime
    nsd = {'land': lambda d: d}
    exec(CODE['m7-bug']['code'], nsd)
    expect(nsd['day'] == datetime.date.today().isoformat(), 'm7: the day comes from the clock, so a rerun on another day loads that day', 'bug hunts run')
    ns7 = {'land_once': lambda d: d}
    exec(CODE['m7-bug:fix']['code'], ns7)
    expect(ns7['day'] == '2026-03-02', 'm7: the fix takes the day from a parameter', 'bug hunts run')
    # m8: the logical id, and m6: the trigger
    a, b = json.loads(CODE['m8-bug']['code']), json.loads(CODE['m8-bug:fix']['code'])
    expect(a['config']['logicalId'] == json.loads(F['platform_example.json'])['config']['logicalId'] and b['config']['logicalId'] != a['config']['logicalId'], 'm8: the copy keeps the logical id of the original, and the fix has its own', 'bug hunts run')
    expect(re.search(r'^CREATE TRIGGER', CODE['m6-bug']['code'], re.M) is not None and 'TRIGGER' not in CODE['m6-bug:fix']['code'], 'm6: the bug hunt has a trigger and the fix has none (the Warehouse itself did not run)', 'bug hunts run')
    if sqlglot:
        sqlglot.parse(CODE['m6-bug:fix']['code'], read='tsql')
        tick('T-SQL texts parsed by sqlglot')


# ----------------------------------------------------------------------------------------------------------------------
# 5. The lab data, and controls for its checker
# ----------------------------------------------------------------------------------------------------------------------
def widget_checker(real=None):
    env = None
    if real is not None:
        p = pathlib.Path(tempfile.mkdtemp(prefix='fabric-control-')) / 'real.js'
        p.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(real) + ';\n')
        env = dict(os.environ, FABRIC_REAL_JS=str(p))
    return runp(['node', str(HERE / 'check_widgets.js')], cwd=str(ROOT), env=env)


r = widget_checker()
m = re.search(r'(\d+) checks passed', r.stdout)
expect(r.returncode == 0 and m, 'check_widgets.js passes: ' + r.stdout.strip()[-200:], 'lab checks')
tick('lab data checks', int(m.group(1)) if m else 0)


def cell(d, table, row, col, v):
    d['tables'][table]['rows'][row][col] = v


MUTATIONS = [
    ('a day 5 merge that updated 41 rows', lambda d: cell(d, 'silver.merge_runs', 4, 3, 41)),
    ('a table that is not the sum of the rows inserted', lambda d: cell(d, 'silver.merge_runs', 3, 5, 8001)),
    ('cancelled orders that did not fall back after the replay of day 4', lambda d: cell(d, 'silver.merge_runs', 6, 7, 40)),
    ('a repeat that wrote three files and removed four', lambda d: cell(d, 'silver.merge_runs', 5, 9, 3)),
    ('a gold revenue that is one dollar off the rules', lambda d: d['counts']['gold.table'].__setitem__('revenue', d['counts']['gold.table']['revenue'] + 1)),
    ('a partition layout with more files than partitions', lambda d: cell(d, 'partition.layout', 1, 2, 6)),
    ('an OPTIMIZE that removed 39 files of 40', lambda d: d['counts']['files.optimize'].__setitem__('files_removed', 39)),
    ('a retry of a plain append that did not double the lines', lambda d: d['counts']['bronze.retry'].__setitem__('plain_rows_after_two_runs', 2040)),
    ('a table of 40 commits that has no checkpoint at version 20', lambda d: d['counts']['files.small']['checkpoints'].remove('00000000000000000020.checkpoint.parquet')),
    ('a merge with the condition that updated 5 rows on a repeat', lambda d: d['counts']['silver.variants']['with the condition'].__setitem__('rerun_updated', 5)),
]
for label, mutate in MUTATIONS:
    data = json.loads(json.dumps(REAL))
    mutate(data)
    control(label + ': the widget checker fails', lambda data=data: widget_checker(data).returncode != 0)

# ----------------------------------------------------------------------------------------------------------------------
# 6. The lint
# ----------------------------------------------------------------------------------------------------------------------
r = runp(['node', str(ROOT / 'dev' / 'lint-content.js'), 'fabric'], cwd=str(ROOT))
expect(r.returncode == 0 and 'lint clean' in r.stdout, 'the lint of the course is clean: ' + r.stdout.strip()[-200:], 'lint runs')


# ----------------------------------------------------------------------------------------------------------------------
# 7. The recording made again, and compared
# ----------------------------------------------------------------------------------------------------------------------
def flatten(real):
    out = {}
    for kind in ('meta', 'counts', 'tables', 'text', 'files'):
        for k, v in real[kind].items():
            out[kind + ':' + k] = v
    return out


SKIP = {'meta:recorded_on': 'the date'}      # and bytes_after of a compaction, within 10 percent (see differing)


def differing(a, b):
    fa, fb = flatten(a), flatten(b)
    out = []

    def walk(x, y, p, key):
        if p.endswith('.bytes_after') and key in ('counts:files.optimize', 'counts:maint') and isinstance(x, int) and isinstance(y, int):
            return [] if abs(x - y) <= 0.1 * max(x, y) else [key + p]      # the size of a file that OPTIMIZE writes depends on the order of its rows, and that order is not fixed
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
            out += walk(fa[k], fb[k], '', k)
    return out


if not args.recapture:
    skipped('recapture', 'run with --recapture (about 3 minutes)')
elif not HAVE_SPARK:
    skipped('recapture', 'pyspark is not installed')
else:
    fablib.cleanup()      # the session of this run is stopped, so that the recorder has the machine to itself
    HAVE_SPARK = False
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='fabric-recapture-')) / 'real.js'
    r = runp([sys.executable, str(HERE / 'capture_fabric.py'), '--out', str(tmp)])
    if r.returncode or not tmp.exists():
        bad('capture_fabric.py failed: ' + (r.stdout + r.stderr)[-800:])
    else:
        again = load_real(tmp)
        diff = differing(REAL, again)
        tick('recaptured items', len(flatten(again)))
        for k in diff:
            bad('the recapture differs from js/real.js in %s' % k)
        print('recapture: %d items, %d differ' % (len(flatten(again)), len(diff)))
        ch = json.loads(json.dumps(REAL))
        ch['counts']['silver.merge']['rows'] += 1
        control('a recording with one number changed, given to the comparison', lambda: differing(REAL, ch) == ['counts:silver.merge.rows'])
        ch = json.loads(json.dumps(REAL))
        ch['text']['files.timetravel_error'] = ch['text']['files.timetravel_error'].replace('FILE_NOT_EXIST', 'FILE_EXISTS')
        control('a recording with one word changed in a printed text, given to the comparison', lambda: differing(REAL, ch) == ['text:files.timetravel_error'])
        ch = json.loads(json.dumps(REAL))
        ch['tables']['partition.layout']['rows'][2][3] += 1
        control('a recording with one cell of a table changed, given to the comparison', lambda: differing(REAL, ch) == ['tables:partition.layout.rows[2][3]'])
        ch = json.loads(json.dumps(REAL))
        ch['meta']['recorded_on'] = '2030-01-01'
        ch['counts']['files.optimize']['bytes_after'] = int(ch['counts']['files.optimize']['bytes_after'] * 1.05)
        expect(differing(REAL, ch) == [], 'another date, and a compacted file that is 5 percent larger, are inside the allowance', 'recapture allowances')
        ch = json.loads(json.dumps(REAL))
        ch['counts']['files.optimize']['bytes_after'] *= 2
        control('a compacted file that is twice as large, given to the comparison', lambda: differing(REAL, ch) == ['counts:files.optimize.bytes_after'])
    shutil.rmtree(tmp.parent, ignore_errors=True)

# ----------------------------------------------------------------------------------------------------------------------
# 8. The labs in a browser, and controls for that test
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
    W = 'fabric/js/widgets.js'
    BROWSER = [
        ('the merge lab colours a replay that reverts rows as a warning and not as bad', W, "r[3] ? (replay ? 'bad' : 'warn') : 'good'", "r[3] ? (replay ? 'warn' : 'warn') : 'good'"),
        ('the log lab counts one file too few', W, "for (j = 0; j <= k; j++) files += h.rows[j][2];", "for (j = 0; j < k; j++) files += h.rows[j][2];"),
        ('the files lab says that version 5 still reads after the vacuum', W, "var can = st.k < 2;", "var can = st.k < 3;"),
        ('the partition lab marks a file of 2,375 bytes as a good size', W, "r[4] < 5000 ? 'bad' : 'good'", "r[4] < 500 ? 'bad' : 'good'"),
        ('the framing lab swaps the colour of the revenue bar', W, "n(+r[4]), st.k ? 'good' : 'warn');\n        out += callout(", "n(+r[4]), st.k ? 'warn' : 'good');\n        out += callout("),
        ('the capacity lab ends interactive delay at 20 minutes', W, "if (min <= 60) return ['warn'", "if (min <= 20) return ['warn'"),
    ]
    for label, rel, old, new in BROWSER:
        copy = pathlib.Path(tempfile.mkdtemp(prefix='fabric-mutation-'))
        for part in ('shared', 'fabric'):
            shutil.copytree(ROOT / part, copy / part, ignore=shutil.ignore_patterns('__pycache__', '.cache', 'node_modules', '.git'))
        target = copy / rel
        src = target.read_text()
        if src.count(old) != 1:
            bad('control cannot be set up: "%s" is not in %s exactly once (%d)' % (old[:70], rel, src.count(old)))
            shutil.rmtree(copy, ignore_errors=True)
            continue
        target.write_text(src.replace(old, new))
        r2, _ = labs_e2e(copy / 'fabric' / 'verify' / 'e2e_labs.js')
        control('the lab test fails when ' + label, lambda r2=r2: r2.returncode != 0)
        shutil.rmtree(copy, ignore_errors=True)

if HAVE_SPARK:
    fablib.cleanup()
print()
print('checked: ' + ', '.join('%d %s' % (v, k) for k, v in sorted(counts.items())))
for sk in skips:
    print('skipped: ' + sk)
if problems:
    print('%d PROBLEM(S)' % len(problems))
    sys.exit(1)
print('verify_fabric: all checks passed')
