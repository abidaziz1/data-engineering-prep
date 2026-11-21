#!/usr/bin/env python3
"""Check the code and the recorded output of the ELT project walkthrough.

 1. The files of the recording are the files of projects/brewline-elt, and every code screen shows its file exactly.
 2. Every Python snippet of the lessons is parsed by Python, which checks the syntax and nothing else. The tests of the project (pytest) pass.
 3. The four bug hunts are run on the real project, next to their fixes: the bad snippet replaces the file of the project, the pipeline runs with dlt and dbt, and the result must be what the lesson says.
    The fix of each hunt is the file as it ships.
 4. The lab data: check_widgets.js works the numbers out again with model.js, which shares nothing with the lab, and fourteen changes to the recording must make it fail.
 5. The lint of the walkthrough (dev/lint-content.js).
 6. With --recapture the whole recording is made again (the DAG runs five times through Airflow, about 2 minutes) and compared with js/real.js. Nothing is timed. The only allowance is the date.
 7. With --browser the run lab is driven in Chromium (e2e_labs.js), and six changes to the lab code must make that test fail.

What this cannot show: a cloud warehouse, a deployed Airflow, an alert channel or a CI run. Those screens carry the "From documentation" tag.

Run:   ELT_INGEST_PY=.. ELT_DBT=.. ELT_AIRFLOW=.. ELT_TEST_PY=.. python3 project-elt/verify/verify_elt.py [--recapture] [--browser] [--verbose]
Needs: see project-elt/verify/requirements.txt. A check whose tool is missing says so and is skipped.
"""
import argparse
import ast
import json
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
sys.path.insert(0, str(HERE))
import eltlib                                        # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--recapture', action='store_true', help='record everything again (the DAG runs five times, about 2 minutes) and compare with js/real.js')
ap.add_argument('--browser', action='store_true', help='also drive the run lab in Chromium (project-elt/verify/e2e_labs.js) and its controls')
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
    tick('controls')
    try:
        if refused():
            return
    except Exception:      # noqa: BLE001
        return
    bad('control "%s": the checker accepted a broken input' % label)


def runp(cmd, **kw):
    return subprocess.run([str(c) for c in cmd], capture_output=True, text=True, **kw)


def load_real(path):
    txt = pathlib.Path(path).read_text()
    return json.loads(txt[txt.index('LAB.real = ') + len('LAB.real = '):].rstrip().rstrip(';'))


TOOLS = all(os.environ.get(k) for k in ('ELT_INGEST_PY', 'ELT_DBT', 'ELT_TEST_PY'))
AIRFLOW = bool(os.environ.get('ELT_AIRFLOW'))
REAL = load_real(ROOT / 'project-elt' / 'js' / 'real.js')
r = runp(['node', HERE / 'dump_elt.js'], cwd=ROOT)
if r.returncode:
    print('PROBLEM: the walkthrough does not load: ' + (r.stdout + r.stderr)[-600:])
    sys.exit(1)
DUMP = json.loads(r.stdout)
BUG = {b['id']: b for b in DUMP['bugs']}
F = REAL['files']

# ----------------------------------------------------------------------------------------------------------------------
# 1 and 2. The files, and the syntax of every snippet
# ----------------------------------------------------------------------------------------------------------------------
JUNK = ('warehouse/', 'published/', '__pycache__', '/target/', '/logs/', '.pytest_cache', '.user.yml')
repo = eltlib.REPO
disk = {str(p.relative_to(repo)): p.read_text() for p in sorted(repo.rglob('*')) if p.is_file() and (p.suffix in ('.py', '.sql', '.yml', '.csv', '.md', '.txt') or p.name in ('Makefile', '.gitignore')) and not any(j in str(p.relative_to(repo)) for j in JUNK)}
expect(set(disk) == set(F), 'the recording holds the files of projects/brewline-elt and no others: %s' % sorted(set(disk) ^ set(F)), 'files')
for k in sorted(set(disk) & set(F)):
    expect(disk[k] == F[k], 'the recorded file %s is the file on disk' % k, 'files')
for sc in DUMP['code']:
    if sc['type'] == 'code' and sc['file']:
        match = [k for k in F if k.endswith('/' + sc['file']) or k == sc['file']]
        expect(len(match) == 1, 'code screen %s names a file of the project: %s' % (sc['id'], sc['file']), 'code screens')
        if len(match) == 1:
            expect(sc['code'].rstrip('\n') == F[match[0]].rstrip('\n'), 'code screen %s shows %s exactly as the file that ran' % (sc['id'], match[0]), 'code screens')
shown = {sc['file'] for sc in DUMP['code'] if sc['type'] == 'code'}
expect({'shop_api.py', 'load_orders.py', 'fct_orders.sql', 'brewline_daily.py', 'source_vs_warehouse.py'} <= shown, 'the lessons show the main files of the project', 'code screens')
for c in DUMP['commands']:
    expect(re.match(r'^(airflow dags test brewline_daily \d{4}-\d\d-\d\d|pytest -q tests|python quality/source_vs_warehouse\.py --day \d)', c['cmd']) is not None, 'the command of %s is a command of the project: %s' % (c['id'], c['cmd']), 'commands')


def parses(text):
    for wrap in (lambda s: s, lambda s: 'def f():\n' + '\n'.join('    ' + l for l in s.split('\n'))):
        try:
            ast.parse(wrap(text))
            return True
        except SyntaxError:
            continue
    return False


for c in DUMP['code']:
    if c['lang'] == 'python':
        expect(parses(c['code']), 'the Python snippet %s parses' % c['id'], 'python snippets parsed')
for k, text in F.items():
    if k.endswith('.py'):
        expect(parses(text), 'the project file %s parses' % k, 'python snippets parsed')
for label, text in [('a missing colon', 'for x in range(3)\n    print(x)'), ('an unclosed bracket', 'orders = [{"id": 1}'), ('a bad indent', 'def f():\nreturn 1')]:
    control('Python with ' + label + ' is refused by the parser', lambda text=text: not parses(text))

# ----------------------------------------------------------------------------------------------------------------------
# 3. The tests of the project, and the four bug hunts
# ----------------------------------------------------------------------------------------------------------------------
if not TOOLS:
    skipped('the tests and the bug hunts', 'set ELT_INGEST_PY, ELT_DBT and ELT_TEST_PY (see requirements.txt)')
else:
    P = eltlib.Project(need_airflow=False)
    r = runp([os.environ['ELT_TEST_PY'], '-m', 'pytest', '-q', 'tests'], cwd=P.home, env=P.env)
    expect(r.returncode == 0 and '5 passed' in r.stdout, 'the five pytest tests of the project pass: ' + r.stdout.strip()[-120:], 'pytest')

    def fresh(day_loads=()):
        p = eltlib.Project(need_airflow=False)
        for d in day_loads:
            rc, out = p.load(d)
            assert rc == 0, out
        return p

    ORDERS_BLOCK = F['ingestion/load_orders.py']
    block_start = ORDERS_BLOCK.index("    @dlt.resource(name='orders'")
    ORIG_BLOCK = '\n'.join(ORDERS_BLOCK[block_start:].split('\n')[:4])

    def hunt_append(code):
        p = fresh()
        p.replace_in('ingestion/load_orders.py', ORIG_BLOCK, code.rstrip('\n'))
        p.load(1)
        p.load(1)
        return p.query('select count(*), count(distinct id) from raw.orders')[0]

    b = BUG['m1-bug']
    expect(b['fix'].rstrip('\n') == ORIG_BLOCK, 'the fix of m1-bug is the orders resource as it ships', 'bug hunts run')
    expect(hunt_append(b['code']) == [209, 200] and hunt_append(b['fix']) == [200, 200], 'bug hunt m1-bug: append leaves 209 rows for 200 orders after a second load, and merge 200', 'bug hunts run')

    def hunt_model(path, code, loads, builds):
        p = fresh(loads)
        (p.home / path).write_text(code)
        res = None
        for _ in range(builds):
            res = p.dbt_build()
        return p, res

    b = BUG['m1-bug2']
    expect(b['fix'].rstrip('\n') == F['dbt/models/marts/fct_orders.sql'].rstrip('\n'), 'the fix of m1-bug2 is fct_orders.sql as it ships', 'bug hunts run')
    p, (rc, lines) = hunt_model('dbt/models/marts/fct_orders.sql', b['code'], [1], 1)
    summary, fails, _ = eltlib.dbt_summary(lines)
    expect(rc != 0 and summary.get('ERROR') == 2 and fails == ['assert_order_totals_match_lines', 'unique_fct_orders_order_id'] and p.query('select count(*), count(distinct order_id) from main.fct_orders')[0] == [401, 200]
           and any('FAIL 134 unique_fct_orders_order_id' in l for l in lines) and any('FAIL 335 assert_order_totals_match_lines' in l for l in lines),
           'bug hunt m1-bug2: the join to the lines gives 401 rows for 200 orders, two tests fail with 134 and 335 rows: %s %s' % (summary, fails), 'bug hunts run')
    p, (rc, lines) = hunt_model('dbt/models/marts/fct_orders.sql', b['fix'], [1], 1)
    expect(rc == 0 and eltlib.dbt_summary(lines)[0].get('ERROR') == 0 and p.query('select count(*) from main.fct_orders')[0][0] == 200, 'bug hunt m1-bug2: the model as it ships gives 200 rows and passes', 'bug hunts run')

    b = BUG['m3-bug']
    expect(b['fix'].rstrip('\n') == F['dbt/models/marts/orders_daily.sql'].rstrip('\n'), 'the fix of m3-bug is orders_daily.sql as it ships', 'bug hunts run')
    p, _ = hunt_model('dbt/models/marts/orders_daily.sql', b['code'], [1, 2], 2)
    dup = 'select count(*), (select count(*) from (select updated_date, region from main.orders_daily group by 1, 2 having count(*) > 1)) from main.orders_daily'
    got_bad = p.query(dup)[0]
    p, _ = hunt_model('dbt/models/marts/orders_daily.sql', b['fix'], [1, 2], 2)
    got_fix = p.query(dup)[0]
    expect(got_bad == [12, 6] and got_fix == [6, 0], 'bug hunt m3-bug: an incremental model with no key gives 12 rows with 6 repeated pairs after a rerun, and with the key 6 rows: %s %s' % (got_bad, got_fix), 'bug hunts run')

    GATE = F['quality/source_vs_warehouse.py']
    g0 = GATE.index('def run(day, warehouse):')
    ORIG_HEADER = '\n'.join(GATE[g0:].split('\n')[:4])
    b = BUG['m2-bug']
    expect(b['fix'].rstrip('\n') == ORIG_HEADER, 'the fix of m2-bug is the start of run() as it ships', 'bug hunts run')

    def hunt_gate(code):
        p = fresh([1, 2, 3])
        (p.home / 'dbt' / 'seeds' / 'product_prices.csv').write_text((p.home / 'dbt' / 'seeds' / 'product_prices.csv').read_text().rstrip('\n') + '\nCAPSULE-10,1200\n')
        rc, _ = p.dbt_build()
        assert rc == 0
        p.replace_in('quality/source_vs_warehouse.py', ORIG_HEADER, code.rstrip('\n'))
        code_, out = p.run_script(['quality/source_vs_warehouse.py', '--day', '2', '--warehouse', str(p.warehouse)])
        return code_, [l for l in out.split('\n') if l.startswith(('PASS', 'FAIL'))]

    rc_bad, lines_bad = hunt_gate(b['code'])
    rc_fix, lines_fix = hunt_gate(b['fix'])
    expect(rc_bad == 1 and sum(1 for l in lines_bad if l.startswith('FAIL')) == 4 and rc_fix == 0 and len(lines_fix) == 6 and all(l.startswith('PASS') for l in lines_fix),
           'bug hunt m2-bug: the first gate fails 4 of 6 checks on a backfill of day 2, and the shipped gate passes all 6: %s %s' % (rc_bad, rc_fix), 'bug hunts run')
tick('bug hunts in the course', len(DUMP['bugs']))
expect(set(BUG) == {'m1-bug', 'm1-bug2', 'm2-bug', 'm3-bug'}, 'the course has the four bug hunts that this script runs: %s' % sorted(BUG), 'bug hunts run')


# ----------------------------------------------------------------------------------------------------------------------
# 4. The lab data, and controls for its checker
# ----------------------------------------------------------------------------------------------------------------------
def widget_checker(real=None):
    env = None
    if real is not None:
        p = pathlib.Path(tempfile.mkdtemp(prefix='elt-control-')) / 'real.js'
        p.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(real) + ';\n')
        env = dict(os.environ, ELT_REAL_JS=str(p))
    return runp(['node', HERE / 'check_widgets.js'], cwd=ROOT, env=env)


r = widget_checker()
m = re.search(r'(\d+) checks passed', r.stdout)
expect(r.returncode == 0 and m, 'check_widgets.js passes: ' + r.stdout.strip()[-200:], 'lab checks')
tick('lab data checks', int(m.group(1)) if m else 0)


def mut(fn):
    d = json.loads(json.dumps(REAL))
    fn(d)
    return d


def run_(d, k):
    return d['counts']['runs'][k]


MUTATIONS = [
    ('a load that wrote 61 rows on day 2', lambda d: run_(d, 'day2').__setitem__('load', 'loaded day 2: orders 61, order lines 120, stores 12')),
    ('a failed run that passed 15 checks', lambda d: run_(d, 'day3_fail')['dbt'].__setitem__('PASS', 15)),
    ('a failed run where the gate ran', lambda d: run_(d, 'day3_fail')['tasks'].__setitem__('quality_gate', 'success')),
    ('a failed run where dbt skipped 6 nodes', lambda d: run_(d, 'day3_fail')['dbt'].__setitem__('SKIP', 6)),
    ('a failed run that published a file', lambda d: run_(d, 'day3_fail').__setitem__('publish', ['published orders_daily: 6 rows'])),
    ('marts of 255 orders after the failed run', lambda d: d['counts']['after_failed_day3'].__setitem__('fct_orders', 255)),
    ('a raw table of 256 orders after the failed run', lambda d: d['counts']['after_failed_day3'].__setitem__('raw_orders', 256)),
    ('a daily mart of 10 rows after the fix', lambda d: d['counts']['after_day3'].__setitem__('orders_daily', 10)),
    ('a backfill that wrote 5 rows', lambda d: run_(d, 'backfill2').__setitem__('load', 'loaded day 2: orders 5, order lines 10, stores 12')),
    ('a snapshot with one version of store 4', lambda d: d['tables']['snapshot.store4']['rows'].pop(0)),
    ('a gate of day 2 with a revenue off by one cent', lambda d: run_(d, 'day2')['gate'].__setitem__(2, 'PASS raw.orders: revenue equals the revenue of the shop: 1825001')),
    ('a first gate that failed 3 checks', lambda d: d['counts']['first_gate']['lines'].__setitem__(1, 'PASS raw.orders: orders equal the orders of the shop: 255')),
    ('a daily mart with one order too many', lambda d: d['tables']['orders_daily']['rows'][0].__setitem__(2, 59)),
    ('four pytest tests', lambda d: d['counts']['tests'].__setitem__('passed', 4)),
]
for label, fn in MUTATIONS:
    data = mut(fn)
    control(label + ': the widget checker fails', lambda data=data: widget_checker(data).returncode != 0)

# ----------------------------------------------------------------------------------------------------------------------
# 5. The lint
# ----------------------------------------------------------------------------------------------------------------------
r = runp(['node', ROOT / 'dev' / 'lint-content.js', 'project-elt'], cwd=ROOT)
expect(r.returncode == 0 and 'lint clean' in r.stdout, 'the lint of the walkthrough is clean: ' + r.stdout.strip()[-200:], 'lint runs')


# ----------------------------------------------------------------------------------------------------------------------
# 6. The recording made again, and compared
# ----------------------------------------------------------------------------------------------------------------------
def flatten(real):
    out = {}
    for kind in ('meta', 'counts', 'tables', 'text', 'files'):
        for k, v in real[kind].items():
            out[kind + ':' + k] = v
    return out


def differing(a, b):
    fa, fb = flatten(a), flatten(b)
    out = []

    def walk(x, y, p, key):
        if isinstance(x, dict) and isinstance(y, dict):
            return [key + p] if set(x) != set(y) else sum((walk(x[k], y[k], p + '.' + k, key) for k in x), [])
        if isinstance(x, list) and isinstance(y, list):
            return [key + p] if len(x) != len(y) else sum((walk(u, v, p + '[%d]' % i, key) for i, (u, v) in enumerate(zip(x, y))), [])
        return [] if x == y else [key + p]

    for k in sorted(set(fa) | set(fb)):
        if k == 'meta:recorded_on':
            continue
        out += [k] if (k not in fa or k not in fb) else walk(fa[k], fb[k], '', k)
    return out


if not args.recapture:
    skipped('recapture', 'run with --recapture (about 2 minutes, needs the four tools: ELT_INGEST_PY, ELT_DBT, ELT_AIRFLOW, ELT_TEST_PY)')
elif not (TOOLS and AIRFLOW):
    skipped('recapture', 'needs ELT_INGEST_PY, ELT_DBT, ELT_AIRFLOW and ELT_TEST_PY')
else:
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='elt-recapture-')) / 'real.js'
    r = runp([sys.executable, HERE / 'capture_elt.py', '--out', tmp])
    if r.returncode or not tmp.exists():
        bad('capture_elt.py failed: ' + (r.stdout + r.stderr)[-800:])
    else:
        again = load_real(tmp)
        diff = differing(REAL, again)
        tick('recaptured items', len(flatten(again)))
        for k in diff:
            bad('the recapture differs from js/real.js in %s' % k)
        print('recapture: %d items, %d differ' % (len(flatten(again)), len(diff)))
        ch = mut(lambda d: d['counts']['after_day1'].__setitem__('raw_orders', 201))
        control('a recording with one number changed, given to the comparison', lambda: differing(REAL, ch) == ['counts:after_day1.raw_orders'])
        ch = mut(lambda d: d['text'].__setitem__('run.day3_fail', d['text']['run.day3_fail'].replace('failed', 'passed')))
        control('a recording with one word changed in a printed text, given to the comparison', lambda: differing(REAL, ch) == ['text:run.day3_fail'])
        ch = mut(lambda d: d['tables']['orders_daily']['rows'][0].__setitem__(2, 59))
        control('a recording with one cell of a table changed, given to the comparison', lambda: differing(REAL, ch) == ['tables:orders_daily.rows[0][2]'])
        ch = mut(lambda d: d['meta'].__setitem__('recorded_on', '2030-01-01'))
        expect(differing(REAL, ch) == [], 'another date is inside the allowance', 'recapture allowances')
    shutil.rmtree(tmp.parent, ignore_errors=True)


# ----------------------------------------------------------------------------------------------------------------------
# 7. The lab in a browser, and controls for that test
# ----------------------------------------------------------------------------------------------------------------------
def labs_e2e(script_):
    r_ = runp(['node', script_], cwd=script_.parent.parent.parent)
    return r_, re.search(r'(\d+) lab checks passed', r_.stdout)


if not args.browser:
    skipped('the lab in a browser', 'run with --browser (needs Playwright and Chromium)')
else:
    r, m = labs_e2e(HERE / 'e2e_labs.js')
    expect(r.returncode == 0 and m, 'e2e_labs.js passes: ' + (r.stdout + r.stderr).strip()[-300:], 'browser lab tests')
    tick('browser lab checks', int(m.group(1)) if m else 0)
    W = 'project-elt/js/widgets.js'
    BROWSER = [
        ('the run lab colours the failed run as good', W, "var kinds = { day1: 'good', day2: 'good', day3_fail: 'bad',", "var kinds = { day1: 'good', day2: 'good', day3_fail: 'good',"),
        ('the run lab opens on another run', W, "A.local.rl || (A.local.rl = { k: 2 })", "A.local.rl || (A.local.rl = { k: 3 })"),
        ('the run lab does not colour a successful step', W, "return v === 'success' ? 'good' : v === 'failed' ? 'bad' : '';", "return v === 'failed' ? 'bad' : '';"),
        ('the run lab colours the marts as good when they are behind', W, "a.fct_orders === a.raw_orders ? 'good' : 'bad'", "'good'"),
        ('the run lab swaps the passed and the total of the dbt checks', W, "run.dbt.PASS + ' / ' + run.dbt.TOTAL", "run.dbt.TOTAL + ' / ' + run.dbt.PASS"),
        ('the run lab does not show a failed run as an error', W, "run.state === 'failed' ? 'err' : ''", "''"),
    ]
    for label, rel, old, new in BROWSER:
        copy = pathlib.Path(tempfile.mkdtemp(prefix='elt-mutation-'))
        for part in ('shared', 'project-elt'):
            shutil.copytree(ROOT / part, copy / part, ignore=shutil.ignore_patterns('__pycache__', '.cache', 'node_modules', '.git'))
        target = copy / rel
        src = target.read_text()
        if src.count(old) != 1:
            bad('control cannot be set up: "%s" is not in %s exactly once (%d)' % (old[:70], rel, src.count(old)))
            shutil.rmtree(copy, ignore_errors=True)
            continue
        target.write_text(src.replace(old, new))
        r2, _ = labs_e2e(copy / 'project-elt' / 'verify' / 'e2e_labs.js')
        control('the lab test fails when ' + label, lambda r2=r2: r2.returncode != 0)
        shutil.rmtree(copy, ignore_errors=True)

print()
print('checked: ' + ', '.join('%d %s' % (v, k) for k, v in sorted(counts.items())))
for sk in skips:
    print('skipped: ' + sk)
if problems:
    print('%d PROBLEM(S)' % len(problems))
    sys.exit(1)
print('verify_elt: all checks passed')
