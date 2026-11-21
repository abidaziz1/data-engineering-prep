#!/usr/bin/env python3
"""Check the code and the recorded output of the CDC project walkthrough.

 1. The files of the recording are the files of projects/brewline-cdc, and every code screen shows its file exactly.
 2. Every Python snippet of the lessons is parsed by Python, the JSON of the connector and of the sample messages by a JSON parser, which checks the syntax and nothing else. The tests of the
    project (pytest, 8 of them) pass.
 3. The four bug hunts are run on the real project, next to their fixes: the bad snippet replaces its lines in the file of the project, a small scenario runs on Spark and Delta Lake, and the
    result must be what the lesson says. The fix of each hunt is the code as it ships. The coding round is run on the log of the recorded day, and two wrong solutions must be refused.
 4. The lab data: check_widgets.js works the numbers out again with model.js, which shares nothing with the lab, and eighteen changes to the recording must make it fail.
 5. The lint of the walkthrough (dev/lint-content.js).
 6. With --recapture the whole recording is made again (PostgreSQL, Kafka, Kafka Connect with Debezium, and Spark: about 10 minutes) and compared with js/real.js. Nothing is timed. The only
    allowance is the date.
 7. With --browser the run lab is driven in Chromium (e2e_labs.js), and seven changes to the lab code must make that test fail.

What this cannot show: a cluster, a schema registry, a managed service, a Docker build or a CI run. Those screens carry the "From documentation" tag.

Run:   CDC_PY=<python with pyspark, delta-spark and pytest> [KAFKA_HOME=.. DEBEZIUM_PLUGINS=..] python3 project-cdc/verify/verify_cdc.py [--recapture] [--browser] [--verbose]
Needs: see project-cdc/verify/requirements.txt. A check whose tool is missing says so and is skipped. The services are needed only for --recapture.
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
import cdclib                                      # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--recapture', action='store_true', help='record everything again (about 10 minutes, needs the services) and compare with js/real.js')
ap.add_argument('--browser', action='store_true', help='also drive the run lab in Chromium (project-cdc/verify/e2e_labs.js) and its controls')
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


TOOLS = bool(os.environ.get('CDC_PY'))
SERVICES = TOOLS and bool(os.environ.get('KAFKA_HOME')) and bool(os.environ.get('DEBEZIUM_PLUGINS'))
REAL = load_real(ROOT / 'project-cdc' / 'js' / 'real.js')
r = runp(['node', HERE / 'dump_cdc.js'], cwd=ROOT)
if r.returncode:
    print('PROBLEM: the walkthrough does not load: ' + (r.stdout + r.stderr)[-600:])
    sys.exit(1)
DUMP = json.loads(r.stdout)
BUG = {b['id']: b for b in DUMP['bugs']}
F = REAL['files']

# ----------------------------------------------------------------------------------------------------------------------
# 1 and 2. The files, and the syntax of every snippet
# ----------------------------------------------------------------------------------------------------------------------
JUNK = cdclib.JUNK
repo = cdclib.REPO
disk = {str(p.relative_to(repo)): p.read_text() for p in sorted(repo.rglob('*')) if p.is_file() and (p.suffix in ('.py', '.md', '.txt', '.yml', '.sql', '.json') or p.name in ('Makefile', '.gitignore')) and not any(j in str(p.relative_to(repo)) for j in JUNK)}
expect(set(disk) == set(F), 'the recording holds the files of projects/brewline-cdc and no others: %s' % sorted(set(disk) ^ set(F)), 'files')
for k in sorted(set(disk) & set(F)):
    expect(disk[k] == F[k], 'the recorded file %s is the file on disk' % k, 'files')
for sc in DUMP['code']:
    if sc['type'] == 'code' and sc['file']:
        match = [k for k in F if k.endswith('/' + sc['file']) or k == sc['file']]
        expect(len(match) == 1, 'code screen %s names a file of the project: %s' % (sc['id'], sc['file']), 'code screens')
        if len(match) == 1:
            expect(sc['code'].rstrip('\n') == F[match[0]].rstrip('\n'), 'code screen %s shows %s exactly as the file that ran' % (sc['id'], match[0]), 'code screens')
shown = {sc['file'] for sc in DUMP['code'] if sc['type'] == 'code'}
expect({'schema.sql', 'orders-connector.json', 'envelope.py', 'bronze.py', 'silver.py', 'stream.py', 'quality.py'} <= shown, 'the lessons show the seven main files of the project', 'code screens')
for c in DUMP['commands']:
    expect(re.match(r'^(python -m cdc\.run( --replay-last-batch)?|pytest -q tests)$', c['cmd']) is not None, 'the command of %s is a command of the project: %s' % (c['id'], c['cmd']), 'commands')


def _json_ok(text):
    try:
        json.loads(text)
        return True
    except ValueError:
        return False


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
    if c['lang'] == 'json':
        try:
            json.loads(c['code'])
            ok_json = True
        except ValueError:
            ok_json = False
        expect(ok_json, 'the JSON snippet %s parses' % c['id'], 'json parsed')
for k, text in REAL['text'].items():
    if k.startswith('event.'):
        try:
            json.loads(text)
            ok_json = True
        except ValueError:
            ok_json = False
        expect(ok_json, 'the sample message %s is JSON' % k, 'json parsed')
expect(json.loads(F['connect/orders-connector.json'])['config']['connector.class'] == 'io.debezium.connector.postgresql.PostgresConnector', 'the connector file names the Debezium PostgreSQL connector', 'json parsed')
control('JSON with a missing quote is refused by the parser', lambda: not _json_ok('{"a": 1,'))
for k, text in F.items():
    if k.endswith('.py'):
        expect(parses(text), 'the project file %s parses' % k, 'python snippets parsed')
for label, text in [('a missing colon', 'for x in range(3)\n    print(x)'), ('an unclosed bracket', 'orders = [{"id": 1}'), ('a bad indent', 'def f():\nreturn 1')]:
    control('Python with ' + label + ' is refused by the parser', lambda text=text: not parses(text))

# ----------------------------------------------------------------------------------------------------------------------
# 3. The tests of the project, and the bug hunts
# ----------------------------------------------------------------------------------------------------------------------
if not TOOLS:
    skipped('the tests and the bug hunts', 'set CDC_PY (see requirements.txt)')
else:
    L = cdclib.Cdc(stack=False)
    rc, out, err = L.module(['pytest', '-q', 'tests'])
    expect(rc == 0 and '8 passed' in out, 'the eight pytest tests of the project pass: ' + out.strip()[-120:], 'pytest')

    def hunt_on(rel, bug, name, *extra):
        """Puts the lines of a bug hunt in a copy of the project, runs the hunt, and returns what it printed. The fix is the code as it ships."""
        text = F[rel]
        fix = bug['fix'].rstrip('\n')
        expect(text.count(fix) == 1, 'the fix of %s is code that is in %s exactly once, as it ships' % (bug['id'], rel), 'bug hunts run')
        copy = cdclib.Cdc(stack=False)
        copy.replace_in(rel, fix, bug['code'].rstrip('\n'))
        res_bad = copy.hunt(name, *extra)
        bad_log = copy.last_stderr
        res_fix = cdclib.Cdc(stack=False).hunt(name, *extra)
        return res_bad, res_fix, bad_log

    # m2-bug: the condition on the position
    got_bad, got_fix, _ = hunt_on('cdc/silver.py', BUG['m2-bug'], 'order')
    expect(got_bad == {'status': 'PLACED', 'lsn': 100} and got_fix == {'status': 'SHIPPED', 'lsn': 200}, 'bug hunt m2-bug: a merge without the position condition lets a message that is delivered again turn SHIPPED into PLACED, and the shipped merge keeps SHIPPED: %s %s' % (got_bad, got_fix), 'bug hunts run')

    # m2-bug2: one event for each row
    got_bad, got_fix, _ = hunt_on('cdc/silver.py', BUG['m2-bug2'], 'dedupe')
    expect(got_bad['error'] == 'DELTA_MULTIPLE_SOURCE_ROW_MATCHING_TARGET_ROW_IN_MERGE' and got_fix == {'error': None, 'status': 'REFUNDED'},
           'bug hunt m2-bug2: two events of one row in a batch stop the merge with DELTA_MULTIPLE_SOURCE_ROW_MATCHING_TARGET_ROW_IN_MERGE, and the shipped code keeps the later one: %s %s' % (got_bad, got_fix), 'bug hunts run')

    # m2-bug3: a delete is a mark
    got_bad, got_fix, _ = hunt_on('cdc/silver.py', BUG['m2-bug3'], 'delete')
    expect(got_bad == {'rows': 1, 'live': 1, 'lsn': 200} and got_fix == {'rows': 1, 'live': 0, 'lsn': 300},
           'bug hunt m2-bug3: a hard delete lets an old update bring the order back as 1 live row, and the mark keeps it deleted at position 300: %s %s' % (got_bad, got_fix), 'bug hunts run')

    # m3-bug: the commit of a batch is two files
    got_bad, got_fix, bad_log = hunt_on('cdc/stream.py', BUG['m3-bug'], 'replay')
    expect(got_bad == {'error': 'StreamingQueryException', 'two_queries': True} and 'Rename destination file' in bad_log and '.crc already exists' in bad_log,
           'bug hunt m3-bug: removing only the commit file makes the replay fail, and the log of Spark says that the .crc file already exists: %s' % got_bad, 'bug hunts run')
    expect(got_fix == {'error': None, 'events': 1, 'inserted': 0, 'updated': 0, 'left': 1}, 'bug hunt m3-bug: the shipped replay runs the last batch again and leaves its row alone: %s' % got_fix, 'bug hunts run')
    tick('bug hunts in the course', len(DUMP['bugs']))

    # the coding round: the solution on the log of the recorded day, and two wrong solutions
    ch = [c for c in DUMP['code'] if c['type'] == 'sol']
    expect(len(ch) == 1, 'the course has one coding round with a solution', 'bug hunts run')
    SOLS = {'the solution': ch[0]['code'],
            'a window that keeps the earliest event': ch[0]['code'].replace("F.col('lsn').desc()", "F.col('lsn').asc()"),
            'no filter of the deletes': ch[0]['code'].replace(".where(\"op != 'd'\")", '')}
    outs = {}
    for label, code in SOLS.items():
        tmp = pathlib.Path(tempfile.mkdtemp(prefix='cdc-solution-')) / 'solution.py'
        tmp.write_text(code)
        outs[label] = cdclib.Cdc(stack=False).hunt('solve', str(tmp))
    s = outs['the solution']
    expect(s == {'printed': '245', 'events': 287, 'rows': 245, 'revenue': REAL['counts']['after_changes']['revenue'], 'right': True}, 'the solution of the coding round gives the 245 live orders of the recorded day, with the recorded revenue, and every status is the one of the log: %s' % s, 'bug hunts run')
    control('a window that keeps the earliest event is refused by the checker of the coding round', lambda: outs['a window that keeps the earliest event']['right'] is False)
    control('no filter of the deletes is refused by the checker of the coding round', lambda: outs['no filter of the deletes']['rows'] == 250 and outs['no filter of the deletes']['right'] is False)
expect(set(BUG) == {'m2-bug', 'm2-bug2', 'm2-bug3', 'm3-bug'}, 'the course has the four bug hunts that this script runs (and the coding round): %s' % sorted(BUG), 'bug hunts run')


# ----------------------------------------------------------------------------------------------------------------------
# 4. The lab data, and controls for its checker
# ----------------------------------------------------------------------------------------------------------------------
def widget_checker(real=None):
    env = None
    if real is not None:
        p = pathlib.Path(tempfile.mkdtemp(prefix='cdc-control-')) / 'real.js'
        p.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(real) + ';\n')
        env = dict(os.environ, CDC_REAL_JS=str(p))
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
    ('a day of changes that inserted 51 orders', lambda d: run_(d, 'changes').__setitem__('inserted', 51)),
    ('a day of changes that updated 35 rows', lambda d: run_(d, 'changes').__setitem__('updated', 35)),
    ('a replay that left 85 rows alone', lambda d: run_(d, 'replay').__setitem__('left', 85)),
    ('a replay that updated one row', lambda d: run_(d, 'replay').__setitem__('updated', 1)),
    ('a snapshot of 199 messages', lambda d: run_(d, 'snapshot').__setitem__('new_messages', 199)),
    ('a backlog that updated 99 orders', lambda d: run_(d, 'backlog').__setitem__('updated', 99)),
    ('silver with 251 rows after the day of changes', lambda d: d['counts']['after_changes'].__setitem__('silver', 251)),
    ('four deleted rows', lambda d: d['counts']['after_changes'].__setitem__('deleted', 4)),
    ('a live row that Postgres does not have', lambda d: d['counts']['after_changes'].__setitem__('live', 246)),
    ('a revenue that differs by one cent', lambda d: d['counts']['after_backlog'].__setitem__('revenue', 1336771)),
    ('a gate of the day of changes with a failed check', lambda d: run_(d, 'changes')['gate'].__setitem__(4, 'FAIL every live order of silver equals its row in the source: 1 (expected 0)')),
    ('a printed text of the replay with another count', lambda d: d['text'].__setitem__('run.replay', d['text']['run.replay'].replace('left 86 alone', 'left 85 alone'))),
    ('a history where the replay inserted one row', lambda d: d['tables']['history']['rows'][3].__setitem__(2, 1)),
    ('a slot that stayed active while the connector was stopped', lambda d: d['counts']['slot'].__setitem__('active_while_stopped', True)),
    ('a topic of 388 messages after the backlog', lambda d: d['counts']['topic'].__setitem__('backlog', 388)),
    ('a delete message with the whole old row', lambda d: d['text'].__setitem__('event.delete', d['text']['event.delete'].replace('"status": ""', '"status": "SHIPPED"'))),
    ('an update message with a before image under the default identity', lambda d: d['text'].__setitem__('event.update', d['text']['event.update'].replace('"before": null', '"before": {"id": 201}'))),
    ('seven pytest tests', lambda d: d['counts']['tests'].__setitem__('passed', 7)),
]
for label, fn in MUTATIONS:
    data = mut(fn)
    control(label + ': the widget checker fails', lambda data=data: widget_checker(data).returncode != 0)

# ----------------------------------------------------------------------------------------------------------------------
# 5. The lint
# ----------------------------------------------------------------------------------------------------------------------
r = runp(['node', ROOT / 'dev' / 'lint-content.js', 'project-cdc'], cwd=ROOT)
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
    skipped('recapture', 'run with --recapture (about 10 minutes, needs CDC_PY, KAFKA_HOME and DEBEZIUM_PLUGINS)')
elif not SERVICES:
    skipped('recapture', 'needs CDC_PY, KAFKA_HOME and DEBEZIUM_PLUGINS')
else:
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='cdc-recapture-')) / 'real.js'
    r = runp([os.environ['CDC_PY'], HERE / 'capture_cdc.py', '--out', tmp])
    if r.returncode or not tmp.exists():
        bad('capture_cdc.py failed: ' + (r.stdout + r.stderr)[-800:])
    else:
        again = load_real(tmp)
        diff = differing(REAL, again)
        tick('recaptured items', len(flatten(again)))
        for k in diff:
            bad('the recapture differs from js/real.js in %s' % k)
        print('recapture: %d items, %d differ' % (len(flatten(again)), len(diff)))
        ch = mut(lambda d: d['counts']['after_snapshot'].__setitem__('silver', 201))
        control('a recording with one number changed, given to the comparison', lambda: differing(REAL, ch) == ['counts:after_snapshot.silver'])
        ch = mut(lambda d: d['text'].__setitem__('run.replay', d['text']['run.replay'].replace('replay', 'reload')))
        control('a recording with one word changed in a printed text, given to the comparison', lambda: differing(REAL, ch) == ['text:run.replay'])
        ch = mut(lambda d: d['tables']['history']['rows'][2].__setitem__(3, 35))
        control('a recording with one cell of a table changed, given to the comparison', lambda: differing(REAL, ch) == ['tables:history.rows[2][3]'])
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
    W = 'project-cdc/js/widgets.js'
    BROWSER = [
        ('the run lab colours the backlog as good', W, "backlog: 'warn', identity: 'good' }", "backlog: 'good', identity: 'good' }"),
        ('the run lab opens on another run', W, "A.local.cd || (A.local.cd = { k: 1 })", "A.local.cd || (A.local.cd = { k: 2 })"),
        ('the run lab colours the rows in silver as bad', W, "a.silver === a.silver_distinct ? 'good' : 'bad'", "'bad'"),
        ('the run lab colours the orders in Postgres as bad', W, "a.live === a.source ? 'good' : 'bad'", "'bad'"),
        ('the run lab swaps the inserted and the left alone', W, "run.inserted + ' / ' + run.updated + ' / ' + run.left", "run.left + ' / ' + run.updated + ' / ' + run.inserted"),
        ('the run lab always says micro-batches', W, "'micro-batch' + (run.batches === 1 ? '' : 'es')", "'micro-batches'"),
        ('the run lab says that the replay left the updated rows alone', W, "and **left ' + R3.left + ' alone**", "and **left ' + R3.updated + ' alone**"),
    ]
    for label, rel, old, new in BROWSER:
        copy = pathlib.Path(tempfile.mkdtemp(prefix='cdc-mutation-'))
        for part in ('shared', 'project-cdc'):
            shutil.copytree(ROOT / part, copy / part, ignore=shutil.ignore_patterns('__pycache__', '.cache', 'node_modules', '.git'))
        target = copy / rel
        src = target.read_text()
        if src.count(old) != 1:
            bad('control cannot be set up: "%s" is not in %s exactly once (%d)' % (old[:70], rel, src.count(old)))
            shutil.rmtree(copy, ignore_errors=True)
            continue
        target.write_text(src.replace(old, new))
        r2, _ = labs_e2e(copy / 'project-cdc' / 'verify' / 'e2e_labs.js')
        control('the lab test fails when ' + label, lambda r2=r2: r2.returncode != 0)
        shutil.rmtree(copy, ignore_errors=True)

print()
print('checked: ' + ', '.join('%d %s' % (v, k) for k, v in sorted(counts.items())))
for sk in skips:
    print('skipped: ' + sk)
if problems:
    print('%d PROBLEM(S)' % len(problems))
    sys.exit(1)
print('verify_cdc: all checks passed')
