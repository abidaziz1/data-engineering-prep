#!/usr/bin/env python3
"""Check the code and the recorded output of the lakehouse project walkthrough.

 1. The files of the recording are the files of projects/brewline-lakehouse, and every code screen shows its file exactly.
 2. Every Python snippet of the lessons is parsed by Python, which checks the syntax and nothing else. The tests of the project (pytest, 7 of them) pass.
 3. The five bug hunts are run on the real project, next to their fixes: the bad snippet replaces its lines in the file of the project, a small scenario runs on Spark and Delta Lake, and the result
    must be what the lesson says. The fix of each hunt is the code as it ships. The test of the rules must fail on the broken rules. The solution of the coding round is run on real events, and
    two wrong solutions must be refused.
 4. The lab data: check_widgets.js works the numbers out again with model.js, which shares nothing with the lab, and sixteen changes to the recording must make it fail.
 5. The lint of the walkthrough (dev/lint-content.js).
 6. With --recapture the whole recording is made again (pytest and three days of the pipeline, about 8 minutes) and compared with js/real.js. Nothing is timed. The only allowance is the date.
 7. With --browser the run lab is driven in Chromium (e2e_labs.js), and seven changes to the lab code must make that test fail.

What this cannot show: cloud storage, a cluster, streaming, table maintenance, a Docker build or a CI run. Those screens carry the "From documentation" tag.

Run:   LAKE_PY=<python with pyspark, delta-spark and pytest> python3 project-lakehouse/verify/verify_lakehouse.py [--recapture] [--browser] [--verbose]
Needs: see project-lakehouse/verify/requirements.txt. A check whose tool is missing says so and is skipped.
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
import lakelib                                      # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--recapture', action='store_true', help='record everything again (about 8 minutes) and compare with js/real.js')
ap.add_argument('--browser', action='store_true', help='also drive the run lab in Chromium (project-lakehouse/verify/e2e_labs.js) and its controls')
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


TOOLS = bool(os.environ.get('LAKE_PY'))
REAL = load_real(ROOT / 'project-lakehouse' / 'js' / 'real.js')
r = runp(['node', HERE / 'dump_lakehouse.js'], cwd=ROOT)
if r.returncode:
    print('PROBLEM: the walkthrough does not load: ' + (r.stdout + r.stderr)[-600:])
    sys.exit(1)
DUMP = json.loads(r.stdout)
BUG = {b['id']: b for b in DUMP['bugs']}
F = REAL['files']

# ----------------------------------------------------------------------------------------------------------------------
# 1 and 2. The files, and the syntax of every snippet
# ----------------------------------------------------------------------------------------------------------------------
JUNK = ('lakehouse_data', '__pycache__', '.pytest_cache', 'spark-warehouse', 'metastore_db', 'derby.log', '.venv')
repo = lakelib.REPO
disk = {str(p.relative_to(repo)): p.read_text() for p in sorted(repo.rglob('*')) if p.is_file() and (p.suffix in ('.py', '.md', '.txt', '.yml') or p.name in ('Makefile', 'Dockerfile', '.gitignore')) and not any(j in str(p.relative_to(repo)) for j in JUNK)}
expect(set(disk) == set(F), 'the recording holds the files of projects/brewline-lakehouse and no others: %s' % sorted(set(disk) ^ set(F)), 'files')
for k in sorted(set(disk) & set(F)):
    expect(disk[k] == F[k], 'the recorded file %s is the file on disk' % k, 'files')
for sc in DUMP['code']:
    if sc['type'] == 'code' and sc['file']:
        match = [k for k in F if k.endswith('/' + sc['file']) or k == sc['file']]
        expect(len(match) == 1, 'code screen %s names a file of the project: %s' % (sc['id'], sc['file']), 'code screens')
        if len(match) == 1:
            expect(sc['code'].rstrip('\n') == F[match[0]].rstrip('\n'), 'code screen %s shows %s exactly as the file that ran' % (sc['id'], match[0]), 'code screens')
shown = {sc['file'] for sc in DUMP['code'] if sc['type'] == 'code'}
expect({'landing.py', 'bronze.py', 'rules.py', 'silver.py', 'gold.py', 'quality.py'} <= shown, 'the lessons show the six main files of the project', 'code screens')
for c in DUMP['commands']:
    expect(re.match(r'^(python -m lakehouse\.run --day \d|python -m lakehouse\.tour|pytest -q tests)$', c['cmd']) is not None, 'the command of %s is a command of the project: %s' % (c['id'], c['cmd']), 'commands')


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
# 3. The tests of the project, and the bug hunts
# ----------------------------------------------------------------------------------------------------------------------
REASONS_REAL = [None, 'bad_amount', 'bad_status', 'unknown_store', 'bad_type', 'parse_error']
if not TOOLS:
    skipped('the tests and the bug hunts', 'set LAKE_PY (see requirements.txt)')
else:
    L = lakelib.Lake()
    rc, out, err = L.module(['pytest', '-q', 'tests'])
    expect(rc == 0 and '7 passed' in out, 'the seven pytest tests of the project pass: ' + out.strip()[-120:], 'pytest')

    def hunt_on(rel, bug, name, *extra):
        """Puts the lines of a bug hunt in a copy of the project, runs the hunt, and returns what it printed. The fix is the code as it ships."""
        text = F[rel]
        fix = bug['fix'].rstrip('\n')
        expect(text.count(fix) == 1, 'the fix of %s is code that is in %s exactly once, as it ships' % (bug['id'], rel), 'bug hunts run')
        copy = lakelib.Lake()
        copy.replace_in(rel, fix, bug['code'].rstrip('\n'))
        res_bad = copy.hunt(name, *extra)
        res_fix = lakelib.Lake().hunt(name, *extra)
        return res_bad, res_fix

    # m1-bug: the rules
    b = BUG['m1-bug']
    got_bad, got_fix = hunt_on('lakehouse/rules.py', b, 'reason')
    expect(got_bad['reasons'] == [None, 'bad_amount', 'bad_status', 'unknown_store', 'bad_amount', 'missing_order_id'] and got_fix['reasons'] == REASONS_REAL,
           'bug hunt m1-bug: a null-struct check names the cut line missing_order_id and the text amount bad_amount, and the shipped rules name parse_error and bad_type: %s %s' % (got_bad, got_fix), 'bug hunts run')
    copy = lakelib.Lake()
    copy.replace_in('lakehouse/rules.py', b['fix'].rstrip('\n'), b['code'].rstrip('\n'))
    rc, out, _ = copy.module(['pytest', '-q', 'tests/test_rules.py'])
    expect(rc != 0 and 'test_every_rule_names_its_reason' in out, 'bug hunt m1-bug: the test of the rules fails on the broken rules', 'bug hunts run')

    # m2-bug: the merge condition
    b = BUG['m2-bug']
    got_bad, got_fix = hunt_on('lakehouse/silver.py', b, 'merge')
    expect(got_bad == {'status': 'PLACED'} and got_fix == {'status': 'SHIPPED'}, 'bug hunt m2-bug: a merge without the time condition lets an old event turn SHIPPED back into PLACED, and the shipped merge keeps SHIPPED: %s %s' % (got_bad, got_fix), 'bug hunts run')

    # m2-bug2: one event for each order
    b = BUG['m2-bug2']
    got_bad, got_fix = hunt_on('lakehouse/silver.py', b, 'dedupe')
    expect(got_bad['ok'] is False and 'FAIL silver has one row for each order: 301 (expected 300)' in got_bad['gate'] and got_fix['ok'] is True and len(got_fix['gate']) == 4 and all(l.startswith('PASS') for l in got_fix['gate']),
           'bug hunt m2-bug2: no window gives 301 silver rows for 300 orders and the gate fails, and the shipped code passes all 4 checks: %s %s' % (got_bad, got_fix), 'bug hunts run')

    # m2-bug3: the days that gold recomputes
    b = BUG['m2-bug3']
    got_bad, got_fix = hunt_on('lakehouse/silver.py', b, 'gold')
    fail = [c for c in got_bad['checks'] if not c[1]]
    expect([c[0] for c in fail] == ['gold revenue equals silver revenue without the refunded orders', 'gold orders equal silver orders without the refunded ones'] and [c[2:] for c in fail] == [[1457550, 1455033], [300, 299]] and got_bad['dates'] == ['2026-03-02']
           and all(c[1] for c in got_fix['checks']) and got_fix['dates'] == ['2026-03-01'] and [c[2:] for c in got_fix['checks'][2:]] == [[1455033, 1455033], [299, 299]],
           'bug hunt m2-bug3: the dates of the events leave gold at 300 orders and 1,457,550 cents against 299 and 1,455,033, and the order dates of silver pass: %s %s' % (got_bad, got_fix), 'bug hunts run')
    tick('bug hunts in the course', len(DUMP['bugs']))

    # the coding round: the solution on real events, and two wrong solutions
    ch = [c for c in DUMP['code'] if c['type'] == 'sol']
    expect(len(ch) == 1, 'the course has one coding round with a solution', 'bug hunts run')
    SOLS = {'the solution': ch[0]['code'],
            'a window that keeps the earliest event': ch[0]['code'].replace('F.col(\'event_time\').desc()', 'F.col(\'event_time\').asc()'),
            'no window at all': 'batch = good\nprint(batch.count())\n'}
    outs = {}
    for label, code in SOLS.items():
        tmp = pathlib.Path(tempfile.mkdtemp(prefix='lake-solution-')) / 'solution.py'
        tmp.write_text(code)
        outs[label] = lakelib.Lake().hunt('solve', str(tmp))
    s = outs['the solution']
    expect(s['day1']['valid'] == 301 and s['day1']['rows'] == 300 and s['day1']['printed'] == '300' and s['day1']['right'] and s['days12']['right'], 'the solution of the coding round keeps 300 of 301 valid events of day 1, and the latest event of every order on days 1 and 2: %s' % s, 'bug hunts run')
    control('a window that keeps the earliest event is refused by the checker of the coding round', lambda: outs['a window that keeps the earliest event']['days12']['right'] is False)
    control('no window at all is refused by the checker of the coding round', lambda: outs['no window at all']['day1']['rows'] != 300 and outs['no window at all']['days12']['right'] is False)
expect(set(BUG) == {'m1-bug', 'm2-bug', 'm2-bug2', 'm2-bug3'}, 'the course has the four bug hunts that this script runs (and the coding round): %s' % sorted(BUG), 'bug hunts run')


# ----------------------------------------------------------------------------------------------------------------------
# 4. The lab data, and controls for its checker
# ----------------------------------------------------------------------------------------------------------------------
def widget_checker(real=None):
    env = None
    if real is not None:
        p = pathlib.Path(tempfile.mkdtemp(prefix='lake-control-')) / 'real.js'
        p.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(real) + ';\n')
        env = dict(os.environ, LAKE_REAL_JS=str(p))
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
    ('a merge on day 2 that inserted 117 orders', lambda d: run_(d, 'day2').__setitem__('inserted', 117)),
    ('a replay that left 260 events alone', lambda d: run_(d, 'day2').__setitem__('left', 260)),
    ('a late event that was not left alone', lambda d: run_(d, 'day3').__setitem__('left', 0)),
    ('a day 3 with no warning about the new field', lambda d: run_(d, 'day3').__setitem__('warning', '')),
    ('a day 3 with three quarantined rows', lambda d: run_(d, 'day3').__setitem__('quarantined', 3)),
    ('a rerun that read one file', lambda d: run_(d, 'day3_again').__setitem__('files', 1)),
    ('silver with 497 orders after day 3', lambda d: d['counts']['after_day3'].__setitem__('silver', 497)),
    ('a silver with a duplicated order', lambda d: d['counts']['after_day1'].__setitem__('silver_distinct', 299)),
    ('gold that counts the refunded order', lambda d: d['counts']['after_day2'].__setitem__('gold_orders', 416)),
    ('a day 2 without the refund', lambda d: d['counts']['after_day2'].__setitem__('refunded', 0)),
    ('order 5 shipped after day 1', lambda d: d['counts']['after_day1'].__setitem__('order5', 'SHIPPED')),
    ('a gate of day 2 with a revenue off by one cent', lambda d: run_(d, 'day2')['gate'].__setitem__(2, 'PASS gold revenue equals silver revenue without the refunded orders: 2082884')),
    ('a printed text of day 2 with another count', lambda d: d['text'].__setitem__('run.day2', d['text']['run.day2'].replace('left 259 alone', 'left 260 alone'))),
    ('a history where version 2 inserted 115 orders', lambda d: d['tables']['history']['rows'][2].__setitem__(2, 115)),
    ('a quarantine with three rows for one reason', lambda d: d['tables']['quarantine']['rows'][0].__setitem__(1, 3)),
    ('six pytest tests', lambda d: d['counts']['tests'].__setitem__('passed', 6)),
]
for label, fn in MUTATIONS:
    data = mut(fn)
    control(label + ': the widget checker fails', lambda data=data: widget_checker(data).returncode != 0)

# ----------------------------------------------------------------------------------------------------------------------
# 5. The lint
# ----------------------------------------------------------------------------------------------------------------------
r = runp(['node', ROOT / 'dev' / 'lint-content.js', 'project-lakehouse'], cwd=ROOT)
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
    skipped('recapture', 'run with --recapture (about 8 minutes, needs LAKE_PY)')
elif not TOOLS:
    skipped('recapture', 'needs LAKE_PY')
else:
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='lake-recapture-')) / 'real.js'
    r = runp([os.environ['LAKE_PY'], HERE / 'capture_lakehouse.py', '--out', tmp])
    if r.returncode or not tmp.exists():
        bad('capture_lakehouse.py failed: ' + (r.stdout + r.stderr)[-800:])
    else:
        again = load_real(tmp)
        diff = differing(REAL, again)
        tick('recaptured items', len(flatten(again)))
        for k in diff:
            bad('the recapture differs from js/real.js in %s' % k)
        print('recapture: %d items, %d differ' % (len(flatten(again)), len(diff)))
        ch = mut(lambda d: d['counts']['after_day1'].__setitem__('silver', 301))
        control('a recording with one number changed, given to the comparison', lambda: differing(REAL, ch) == ['counts:after_day1.silver'])
        ch = mut(lambda d: d['text'].__setitem__('run.day3', d['text']['run.day3'].replace('coupon', 'discount')))
        control('a recording with one word changed in a printed text, given to the comparison', lambda: differing(REAL, ch) == ['text:run.day3'])
        ch = mut(lambda d: d['tables']['versions']['rows'][1].__setitem__(1, 299))
        control('a recording with one cell of a table changed, given to the comparison', lambda: differing(REAL, ch) == ['tables:versions.rows[1][1]'])
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
    W = 'project-lakehouse/js/widgets.js'
    BROWSER = [
        ('the run lab colours day 3 as good', W, "var kinds = { day1: 'good', day2: 'good', day3: 'warn',", "var kinds = { day1: 'good', day2: 'good', day3: 'good',"),
        ('the run lab opens on another run', W, "A.local.lk || (A.local.lk = { k: 1 })", "A.local.lk || (A.local.lk = { k: 2 })"),
        ('the run lab colours the orders in silver as bad', W, "a.silver === a.silver_distinct ? 'good' : 'bad'", "'bad'"),
        ('the run lab does not mark quarantined rows', W, "run.quarantined ? 'warn' : ''", "''"),
        ('the run lab swaps the inserted and the left alone', W, "run.inserted + ' / ' + run.updated + ' / ' + run.left", "run.left + ' / ' + run.updated + ' / ' + run.inserted"),
        ('the run lab shows one new file for the run that does nothing', W, "big([['0', 'new files', 'good']", "big([['1', 'new files', 'good']"),
        ('the run lab says that day 2 left the updated events alone', W, "and **left ' + R2.left + ' alone**", "and **left ' + R2.updated + ' alone**"),
    ]
    for label, rel, old, new in BROWSER:
        copy = pathlib.Path(tempfile.mkdtemp(prefix='lake-mutation-'))
        for part in ('shared', 'project-lakehouse'):
            shutil.copytree(ROOT / part, copy / part, ignore=shutil.ignore_patterns('__pycache__', '.cache', 'node_modules', '.git'))
        target = copy / rel
        src = target.read_text()
        if src.count(old) != 1:
            bad('control cannot be set up: "%s" is not in %s exactly once (%d)' % (old[:70], rel, src.count(old)))
            shutil.rmtree(copy, ignore_errors=True)
            continue
        target.write_text(src.replace(old, new))
        r2, _ = labs_e2e(copy / 'project-lakehouse' / 'verify' / 'e2e_labs.js')
        control('the lab test fails when ' + label, lambda r2=r2: r2.returncode != 0)
        shutil.rmtree(copy, ignore_errors=True)

print()
print('checked: ' + ', '.join('%d %s' % (v, k) for k, v in sorted(counts.items())))
for sk in skips:
    print('skipped: ' + sk)
if problems:
    print('%d PROBLEM(S)' % len(problems))
    sys.exit(1)
print('verify_lakehouse: all checks passed')
