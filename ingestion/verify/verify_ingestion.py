#!/usr/bin/env python3
"""Check the code and the recorded output of the ingestion course.

 1. The files of the recording are the files of ingestion/verify/project, and every code screen that names such a file shows it exactly.
 2. Every Python snippet of the lessons (code screens, bug hunts and their fixes, the solution of the coding round) is parsed by Python, which checks the syntax and nothing else.
 3. All ten bug hunts are run next to their fixes: eight with dlt and DuckDB (two of them are SQL), two with the Airbyte connector. The bad snippet must show the failure that the lesson claims and the fix must not.
 4. The solution of the coding round is run with dlt on the pretend shop and compared with the rows that the rules of the data give (100, 20, 7 and 0 rows written, and 117 orders in the end).
    Four wrong solutions must be caught.
 5. The lab data: check_widgets.js works the numbers out again with model.js, which shares nothing with the widgets, and fifteen changes to the recording must make it fail.
 6. The lint of the course (dev/lint-content.js).
 7. With --recapture the whole recording is made again on this machine (about 2 minutes) and compared with js/real.js. Nothing is timed. The only allowance is the date.
 8. With --browser the three labs are driven in Chromium (e2e_labs.js), and six changes to the widget code must make that test fail.

What this cannot show: how Fivetran, the Airbyte platform, Meltano or a log-based capture tool behave. Those screens carry the "From documentation" tag.

Run:   ing-env/bin/python ingestion/verify/verify_ingestion.py [--recapture] [--browser] [--verbose]
Needs: see ingestion/verify/requirements.txt. The interpreter that runs this script must have dlt and DuckDB (it is DLT_PY). AIRBYTE_PY must point at an interpreter that has PyAirbyte
       (Python 3.11 or 3.12). A check whose tool is missing says so and is skipped.
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
PROJECT = HERE / 'project'

ap = argparse.ArgumentParser()
ap.add_argument('--recapture', action='store_true', help='record everything again on this machine and compare with js/real.js (about 2 minutes)')
ap.add_argument('--browser', action='store_true', help='also drive the three labs in Chromium (ingestion/verify/e2e_labs.js) and its controls')
ap.add_argument('--verbose', '-v', action='store_true')
args = ap.parse_args()

problems, counts, skips = [], {}, []
DLT_PY = os.environ.get('DLT_PY', sys.executable)
AIRBYTE_PY = os.environ.get('AIRBYTE_PY', '')


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


def has_module(py, mod):
    return bool(py) and runp([py, '-c', 'import ' + mod]).returncode == 0


def load_real(path):
    txt = pathlib.Path(path).read_text()
    return json.loads(txt[txt.index('LAB.real = ') + len('LAB.real = '):].rstrip().rstrip(';'))


HAVE_DLT = has_module(DLT_PY, 'dlt') and has_module(DLT_PY, 'duckdb')
HAVE_AB = has_module(AIRBYTE_PY, 'airbyte')
REAL = load_real(ROOT / 'ingestion' / 'js' / 'real.js')
r = runp(['node', HERE / 'dump_ingestion.js'], cwd=ROOT)
if r.returncode:
    print('PROBLEM: the course does not load: ' + (r.stdout + r.stderr)[-600:])
    sys.exit(1)
DUMP = json.loads(r.stdout)
CODE = {c['id']: c for c in DUMP['code']}
BUG = {b['id']: b for b in DUMP['bugs']}
F = REAL['files']

# ----------------------------------------------------------------------------------------------------------------------
# 1 and 2. The files, and the syntax of every snippet
# ----------------------------------------------------------------------------------------------------------------------
disk = {str(p.relative_to(PROJECT)): p.read_text() for p in sorted(PROJECT.rglob('*.py'))}
expect(set(disk) == set(F), 'the recording holds the files of verify/project and no others: %s' % sorted(set(disk) ^ set(F)), 'files')
for k in sorted(set(disk) & set(F)):
    expect(disk[k] == F[k], 'the recorded file %s is the file on disk' % k, 'files')
for sc in DUMP['code']:
    if sc['type'] == 'code' and sc['file'] in F:
        expect(sc['code'].rstrip('\n') == F[sc['file']].rstrip('\n'), 'code screen %s shows %s exactly as the file that ran' % (sc['id'], sc['file']), 'code screens')
shown = {sc['file'] for sc in DUMP['code'] if sc['type'] == 'code'}
expect({'shop_pipeline.py', 'strategies.py', 'drift.py', 'protocol.py', 'sync_modes.py', 'state.py'} <= shown, 'the lessons show the main files of the project', 'code screens')
sol = CODE['m6-ch:sol']['code'].rstrip('\n')
expect(sol in F['challenge.py'], 'the solution of the coding round is a piece of challenge.py, the file that ran', 'code screens')
for c in DUMP['commands']:
    for f in re.findall(r'\b(\w+\.py)\b', c['cmd']):
        expect(f in F, 'the command of %s names %s, which is a file of the project' % (c['id'], f), 'commands')


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
    expect(parses(text), 'the project file %s parses' % k, 'python snippets parsed')
for label, text in [('a missing colon', 'for x in range(3)\n    print(x)'), ('an unclosed bracket', 'orders = [{"id": 1}'), ('a bad indent', 'def f():\nreturn 1')]:
    control('Python with ' + label + ' is refused by the parser', lambda text=text: not parses(text))

# ----------------------------------------------------------------------------------------------------------------------
# 3. The bug hunts, run next to their fixes
# ----------------------------------------------------------------------------------------------------------------------
hunts = pathlib.Path(tempfile.mkdtemp(prefix='ingestion-hunts-')) / 'hunts.json'
hunts.write_text(json.dumps({b['id']: {'code': b['code'], 'fix': b['fix']} for b in DUMP['bugs']}))
if not HAVE_DLT:
    skipped('the bug hunts with dlt', 'no interpreter with dlt and duckdb: set DLT_PY')
else:
    env = dict(os.environ, PYTHONWARNINGS='ignore', DO_NOT_TRACK='1', RUNTIME__DLTHUB_TELEMETRY='false', PYTHONDONTWRITEBYTECODE='1')
    r = runp([DLT_PY, '-B', HERE / 'hunts_dlt.py', hunts], cwd=tempfile.mkdtemp(prefix='ingestion-run-'), env=env)
    if r.returncode:
        bad('hunts_dlt.py failed: ' + (r.stdout + r.stderr)[-900:])
    else:
        H = json.loads(r.stdout.strip().split('\n')[-1])
        c, f = lambda k: H[k]['code'], lambda k: H[k]['fix']      # noqa: E731
        expect(c('m1-bug') == [[200]] and f('m1-bug') == [[100]], 'bug hunt m1-bug: a count over a join to the lines gives 200 and the distinct count gives 100: %s %s' % (c('m1-bug'), f('m1-bug')), 'bug hunts run')
        expect(c('m1-bug2')['totals'] == [50, 50] and f('m1-bug2')['totals'] == [100, 100], 'bug hunt m1-bug2: reading only the first page loads 50 orders, and every page 100', 'bug hunts run')
        expect(c('m2-bug')['totals'] == [200, 100] and f('m2-bug')['totals'] == [100, 100], 'bug hunt m2-bug: append twice gives 200 rows for 100 orders, and merge 100', 'bug hunts run')
        expect(c('m2-bug2')['order12'] == [['PLACED']] and f('m2-bug2')['order12'] == [['SHIPPED']] and f('m2-bug2')['wrote'] == [100, 109] and c('m2-bug2')['wrote'] == [100, 20],
               'bug hunt m2-bug2: the cursor wrote 20 rows and left order 12 PLACED, and a lag of one day wrote 109 and made it SHIPPED', 'bug hunts run')
        expect(c('m3-bug') == [[1116]] and f('m3-bug') == [[2233]], 'bug hunt m3-bug: the sum of the number column is 1116 and with the variant column 2233', 'bug hunts run')
        expect(c('m3-bug2')['totals'] == [112, 112] and f('m3-bug2')['totals'] == [117, 117], 'bug hunt m3-bug2: discard_row left 112 orders and evolve 117', 'bug hunts run')
        expect(c('m5-bug')['totals'] == [140, 110] and f('m5-bug')['totals'] == [110, 110] and c('m5-bug')['wrote'] == [20, 20], 'bug hunt m5-bug: a window loaded twice gives 140 rows with append and 110 with merge', 'bug hunts run')
        expect(c('m5-bug2')['totals'] == [20, 20] and f('m5-bug2')['totals'] == [109, 109], 'bug hunt m5-bug2: a cursor that starts on day 2 loads 20 orders and one that starts at the beginning loads 109', 'bug hunts run')
if not HAVE_AB:
    skipped('the bug hunts with the Airbyte connector', 'no interpreter with PyAirbyte: set AIRBYTE_PY (Python 3.11 or 3.12, pip install airbyte)')
else:
    env = dict(os.environ, PYTHONWARNINGS='ignore', AIRBYTE_OFFLINE_MODE='1', PYTHONDONTWRITEBYTECODE='1')
    r = runp([AIRBYTE_PY, '-B', HERE / 'hunts_airbyte.py', hunts], cwd=tempfile.mkdtemp(prefix='ingestion-run-'), env=env)
    if r.returncode:
        bad('hunts_airbyte.py failed: ' + (r.stdout + r.stderr)[-900:])
    else:
        H = json.loads(r.stdout.strip().split('\n')[-1])
        expect(H['m4-bug']['code'] == {'rows': 40, 'distinct': 20} and H['m4-bug']['fix'] == {'rows': 20, 'distinct': 20}, 'bug hunt m4-bug: a full refresh with append leaves 40 rows for 20 users, and a merge 20', 'bug hunts run')
        expect(H['m4-bug2']['code']['printed'] == '20' and H['m4-bug2']['fix']['printed'] == '0', 'bug hunt m4-bug2: a read without --state gives 20 records, and with it 0', 'bug hunts run')
tick('bug hunts in the course', len(DUMP['bugs']))
expect(set(BUG) == {'m1-bug', 'm1-bug2', 'm2-bug', 'm2-bug2', 'm3-bug', 'm3-bug2', 'm4-bug', 'm4-bug2', 'm5-bug', 'm5-bug2'}, 'the course has the ten bug hunts that this script runs: %s' % sorted(BUG), 'bug hunts run')
shutil.rmtree(hunts.parent, ignore_errors=True)

# ----------------------------------------------------------------------------------------------------------------------
# 4. The coding round, run, and wrong solutions that must be caught
# ----------------------------------------------------------------------------------------------------------------------
EXPECTED_DAYS = [[1, 100, 100, 100], [2, 20, 110, 110], [3, 7, 117, 117], [3, 0, 117, 117]]


def run_solution(text):
    """The file challenge.py of the project with the answer replaced by `text`. Returns the days that it printed."""
    src = F['challenge.py']
    a, b = src.index('# --- your answer starts here ---\n') + len('# --- your answer starts here ---\n'), src.index('# --- your answer ends here ---')
    d = pathlib.Path(tempfile.mkdtemp(prefix='ingestion-challenge-'))
    for name, body in F.items():
        (d / name).write_text(body)
    (d / 'challenge.py').write_text(src[:a] + text.rstrip('\n') + '\n' + src[b:])
    env = dict(os.environ, PYTHONPATH=str(d), PYTHONWARNINGS='ignore', DO_NOT_TRACK='1', RUNTIME__DLTHUB_TELEMETRY='false', PYTHONDONTWRITEBYTECODE='1')
    r_ = runp([DLT_PY, '-B', d / 'challenge.py'], cwd=d, env=env)
    shutil.rmtree(d, ignore_errors=True)
    if r_.returncode:
        raise RuntimeError(r_.stderr[-300:])
    return [[int(x) for x in m.groups()] for m in re.finditer(r'day (\d): wrote (\d+), destination holds (\d+) rows \((\d+) distinct orders\)', r_.stdout)]


if not HAVE_DLT:
    skipped('the coding round', 'no interpreter with dlt and duckdb')
else:
    got = run_solution(sol)
    expect(got == EXPECTED_DAYS, 'the solution of the coding round writes 100, 20, 7 and 0 rows, and ends with 117 orders: %s' % got, 'coding round')
    expect(REAL['tables']['challenge.days']['rows'] == EXPECTED_DAYS, 'the recorded coding round is the same', 'coding round')
    for label, old, new in [('a solution that appends', "write_disposition='merge', primary_key='id'", "write_disposition='append'"), ('a solution without a cursor', "def orders(updated=dlt.sources.incremental('updated_at', initial_value=START)):\n    for page in source.get_orders(day[0], since=updated.last_value):", "def orders():\n    for page in source.get_orders(day[0]):"),
                            ('a solution that reads only the first page', 'for page in source.get_orders(day[0], since=updated.last_value):\n        yield page', 'yield next(source.get_orders(day[0], since=updated.last_value))'),
                            ('a solution that looks back a day', "initial_value=START)", "initial_value=START, lag=86400)")]:
        wrong = sol.replace(old, new)
        expect(wrong != sol, 'the control "%s" changes the solution' % label, 'coding round')
        control(label + ' is caught by the expected rows', lambda wrong=wrong: run_solution(wrong) != EXPECTED_DAYS)


# ----------------------------------------------------------------------------------------------------------------------
# 5. The lab data, and controls for its checker
# ----------------------------------------------------------------------------------------------------------------------
def widget_checker(real=None):
    env = None
    if real is not None:
        p = pathlib.Path(tempfile.mkdtemp(prefix='ingestion-control-')) / 'real.js'
        p.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(real) + ';\n')
        env = dict(os.environ, INGESTION_REAL_JS=str(p))
    return runp(['node', HERE / 'check_widgets.js'], cwd=ROOT, env=env)


r = widget_checker()
m = re.search(r'(\d+) checks passed', r.stdout)
expect(r.returncode == 0 and m, 'check_widgets.js passes: ' + r.stdout.strip()[-200:], 'lab checks')
tick('lab data checks', int(m.group(1)) if m else 0)


def mut(fn):
    d = json.loads(json.dumps(REAL))
    fn(d)
    return d


def cell(d, table, row, col, v):
    d['tables'][table]['rows'][row][col] = v


MUTATIONS = [
    ('an append that left 101 distinct orders', lambda d: cell(d, 'strategies.cases', 0, 3, 101)),
    ('a replace that left 101 rows', lambda d: cell(d, 'strategies.cases', 1, 2, 101)),
    ('a merge with a cursor that wrote 21 rows on day 2', lambda d: cell(d, 'strategies.cases', 5, 1, '100, 21')),
    ('an append with a cursor that left 120 rows', lambda d: cell(d, 'strategies.cases', 4, 2, 120)),
    ('a deleted order that left the destination', lambda d: d['counts']['strategies'].__setitem__('order11_in_destination', False)),
    ('a silent update that was seen', lambda d: d['counts']['strategies'].__setitem__('order12_destination', 'SHIPPED')),
    ('a lookback that did not catch order 12', lambda d: cell(d, 'boundary.cases', 3, 3, 'PLACED')),
    ('a key at the boundary that wrote 21 rows', lambda d: cell(d, 'boundary.cases', 1, 1, '100, 21')),
    ('a discard_row that kept 113 orders', lambda d: cell(d, 'drift.modes', 2, 2, 113)),
    ('a frozen column that let the load through', lambda d: cell(d, 'drift.modes', 1, 1, 'loaded 7')),
    ('a default load that added five columns', lambda d: cell(d, 'drift.modes', 0, 3, d['tables']['drift.modes']['rows'][0][3] + ', extra')),
    ('a fresh working folder that wrote 5 rows', lambda d: d['counts']['state'].__setitem__('fresh_wrote', 5)),
    ('a window loaded twice that left 120 rows with merge', lambda d: d['counts']['state']['window']['merge'].__setitem__(1, 120)),
    ('a repeated day in the coding round that wrote a row', lambda d: cell(d, 'challenge.days', 3, 1, 1)),
    ('an honest cursor that read 5 records on the second sync', lambda d: cell(d, 'sync.cases', 4, 1, '20, 5')),
    ('a read with the saved state that gave 3 records', lambda d: d['counts']['protocol'].__setitem__('again', 3)),
    ('a first load with 201 lines', lambda d: d['counts']['first'].__setitem__('lines', 201)),
]
for label, fn in MUTATIONS:
    data = mut(fn)
    control(label + ': the widget checker fails', lambda data=data: widget_checker(data).returncode != 0)

# ----------------------------------------------------------------------------------------------------------------------
# 6. The lint
# ----------------------------------------------------------------------------------------------------------------------
r = runp(['node', ROOT / 'dev' / 'lint-content.js', 'ingestion'], cwd=ROOT)
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
    skipped('recapture', 'run with --recapture (about 2 minutes, needs dlt, PyAirbyte and PyPI for the connector)')
elif not (HAVE_DLT and HAVE_AB):
    skipped('recapture', 'needs both interpreters: DLT_PY and AIRBYTE_PY')
else:
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='ingestion-recapture-')) / 'real.js'
    r = runp([DLT_PY, '-B', HERE / 'capture_ingestion.py', '--out', tmp], env=dict(os.environ, DLT_PY=DLT_PY, AIRBYTE_PY=AIRBYTE_PY))
    if r.returncode or not tmp.exists():
        bad('capture_ingestion.py failed: ' + (r.stdout + r.stderr)[-800:])
    else:
        again = load_real(tmp)
        diff = differing(REAL, again)
        tick('recaptured items', len(flatten(again)))
        for k in diff:
            bad('the recapture differs from js/real.js in %s' % k)
        print('recapture: %d items, %d differ' % (len(flatten(again)), len(diff)))
        ch = mut(lambda d: d['counts']['first'].__setitem__('orders', 101))
        control('a recording with one number changed, given to the comparison', lambda: differing(REAL, ch) == ['counts:first.orders'])
        ch = mut(lambda d: d['text'].__setitem__('drift.run', d['text']['drift.run'].replace('loaded 7', 'loaded 8')))
        control('a recording with one word changed in a printed text, given to the comparison', lambda: differing(REAL, ch) == ['text:drift.run'])
        ch = mut(lambda d: d['tables']['strategies.cases']['rows'][2].__setitem__(2, 101))
        control('a recording with one cell of a table changed, given to the comparison', lambda: differing(REAL, ch) == ['tables:strategies.cases.rows[2][2]'])
        ch = mut(lambda d: d['meta'].__setitem__('recorded_on', '2030-01-01'))
        expect(differing(REAL, ch) == [], 'another date is inside the allowance', 'recapture allowances')
    shutil.rmtree(tmp.parent, ignore_errors=True)


# ----------------------------------------------------------------------------------------------------------------------
# 8. The labs in a browser, and controls for that test
# ----------------------------------------------------------------------------------------------------------------------
def labs_e2e(script_):
    r_ = runp(['node', script_], cwd=script_.parent.parent.parent)
    return r_, re.search(r'(\d+) lab checks passed', r_.stdout)


if not args.browser:
    skipped('the labs in a browser', 'run with --browser (needs Playwright and Chromium)')
else:
    r, m = labs_e2e(HERE / 'e2e_labs.js')
    expect(r.returncode == 0 and m, 'e2e_labs.js passes: ' + (r.stdout + r.stderr).strip()[-300:], 'browser lab tests')
    tick('browser lab checks', int(m.group(1)) if m else 0)
    W = 'ingestion/js/widgets.js'
    BROWSER = [
        ('the load lab draws the bar against twice the orders of the shop', W, "bar('rows in the destination', r[2], Math.max(r[2], r[4]),", "bar('rows in the destination', r[2], r[4] * 2,"),
        ('the load lab colours every row count as good', W, "[n(r[2]), 'rows in the destination', r[2] === r[4] ? 'good' : r[2] === r[3] ? 'warn' : 'bad']", "[n(r[2]), 'rows in the destination', 'good']"),
        ('the drift lab opens on another contract', W, "A.local.dl || (A.local.dl = { k: 0 })", "A.local.dl || (A.local.dl = { k: 1 })"),
        ('the drift lab colours the discard of rows as a warning', W, "var kinds = ['warn', 'tip', 'bad', 'warn', 'tip'];", "var kinds = ['warn', 'tip', 'warn', 'warn', 'tip'];"),
        ('the sync lab shows the first read as the second', W, "[read[1], 'records read, sync 2', read[1] === '0' ? 'good' : '']", "[read[0], 'records read, sync 2', read[1] === '0' ? 'good' : '']"),
        ('the sync lab opens on another case', W, "A.local.sl || (A.local.sl = { k: 4 })", "A.local.sl || (A.local.sl = { k: 3 })"),
    ]
    for label, rel, old, new in BROWSER:
        copy = pathlib.Path(tempfile.mkdtemp(prefix='ingestion-mutation-'))
        for part in ('shared', 'ingestion'):
            shutil.copytree(ROOT / part, copy / part, ignore=shutil.ignore_patterns('__pycache__', '.cache', 'node_modules', '.git'))
        target = copy / rel
        src = target.read_text()
        if src.count(old) != 1:
            bad('control cannot be set up: "%s" is not in %s exactly once (%d)' % (old[:70], rel, src.count(old)))
            shutil.rmtree(copy, ignore_errors=True)
            continue
        target.write_text(src.replace(old, new))
        r2, _ = labs_e2e(copy / 'ingestion' / 'verify' / 'e2e_labs.js')
        control('the lab test fails when ' + label, lambda r2=r2: r2.returncode != 0)
        shutil.rmtree(copy, ignore_errors=True)

print()
print('checked: ' + ', '.join('%d %s' % (v, k) for k, v in sorted(counts.items())))
for sk in skips:
    print('skipped: ' + sk)
if problems:
    print('%d PROBLEM(S)' % len(problems))
    sys.exit(1)
print('verify_ingestion: all checks passed')
