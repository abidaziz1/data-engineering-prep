#!/usr/bin/env python3
"""Check the code and the recorded output of the MongoDB course.

 1. The files of the recording are the files of mongodb/verify/project, and every code screen that names such a file shows it exactly.
 2. Every Python snippet of the lessons (code screens, bug hunts and their fixes, the solution of the coding round) is parsed by Python, which checks the syntax and nothing else.
 3. Eight of the nine bug hunts are run against a real mongod 8.0 next to their fixes (a replica set of one member in a Docker container): the bad snippet must show the failure that
    the lesson claims and the fix must not. The ninth (a change stream consumer, tagged From documentation) is checked as text, and its claim is run in a small experiment.
 4. The solution of the coding round is run on the server and compared with the three best stores worked out in Python.
 5. The lab data: check_widgets.js rebuilds the 20,000 orders from the rule that made them, and fifteen changes to the recording must make it fail.
 6. The lint of the course (dev/lint-content.js).
 7. With --recapture the whole recording is made again on this machine (about 10 seconds) and compared with js/real.js. Nothing is timed. The only allowance is the date.
 8. With --browser the three labs are driven in Chromium (e2e_labs.js), and six changes to the widget code must make that test fail.

What this cannot show: how a sharded cluster, Atlas, Atlas Search or the Kafka connector behave. Those screens carry the "From documentation" tag.

Run:   mongo-env/bin/python mongodb/verify/verify_mongodb.py [--recapture] [--browser] [--verbose]
Needs: see mongodb/verify/requirements.txt (pymongo, Docker with the image mongo:8.0, Node 20). A check whose tool is missing says so and is skipped.
"""
import argparse
import ast
import contextlib
import io
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
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(PROJECT))

ap = argparse.ArgumentParser()
ap.add_argument('--recapture', action='store_true', help='record everything again on this machine and compare with js/real.js (about 10 seconds)')
ap.add_argument('--browser', action='store_true', help='also drive the three labs in Chromium (mongodb/verify/e2e_labs.js) and its controls')
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


REAL = load_real(ROOT / 'mongodb' / 'js' / 'real.js')
r = runp(['node', HERE / 'dump_mongodb.js'], cwd=ROOT)
if r.returncode:
    print('PROBLEM: the course does not load: ' + (r.stdout + r.stderr)[-600:])
    sys.exit(1)
DUMP = json.loads(r.stdout)
CODE = {c['id']: c for c in DUMP['code']}
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
expect({'shapes.py', 'pipelines.py', 'indexes.py', 'design.py', 'streams.py'} <= shown, 'the lessons show the main files of the project', 'code screens')
sol = CODE['m5-ch:sol']['code'].rstrip('\n')
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
for label, text in [('a missing colon', 'for x in range(3)\n    print(x)'), ('an unclosed bracket', 'pipeline = [{"$match": {"a": 1}'), ('a bad indent', 'def f():\nreturn 1')]:
    control('Python with ' + label + ' is refused by the parser', lambda text=text: not parses(text))

# ----------------------------------------------------------------------------------------------------------------------
# 3 and 4. The bug hunts and the coding round, run on a real server
# ----------------------------------------------------------------------------------------------------------------------
BUG = {b['id']: b for b in DUMP['bugs']}
HAVE = bool(shutil.which('docker')) or bool(os.environ.get('MONGO_URI'))
try:
    import pymongo
    from pymongo import errors
    import mongolib
    import rules
except ImportError:
    HAVE = False
    skipped('everything that runs MongoDB', 'pymongo is not installed')
if not HAVE:
    skipped('everything that runs MongoDB', 'neither docker nor MONGO_URI is available')

if HAVE:
    uri = mongolib.start_server()
    os.environ['MONGO_URI'] = uri
    os.environ['MONGO_DB'] = 'verify'
    c = pymongo.MongoClient(uri)
    db = c['verify']
    c.drop_database('verify')
    db.orders.insert_many(rules.order(i) for i in range(1, rules.ORDERS + 1))
    db.stores.insert_many(rules.stores())

    def run_snippet(code, ns):
        out = io.StringIO()
        try:
            with contextlib.redirect_stdout(out):
                exec(code, ns)        # noqa: S102 - the snippets of the course, run on a throwaway server
            return out.getvalue().strip(), None
        except Exception as e:        # noqa: BLE001
            return out.getvalue().strip(), e

    def fresh_shapes():
        db.drop_collection('shapes')
        db.shapes.insert_many([{'_id': 'O-1', 'n': 1, 'coupon': None}, {'_id': 'O-2', 'n': 2}, {'_id': 'O-3', 'n': 3, 'coupon': 'SPRING'}, {'_id': 'O-4', 'n': '4'}])
        return db.shapes

    def hunt(bid, bad_ok, fix_ok, ns_factory):
        b = BUG[bid]
        bad_res = run_snippet(b['code'], ns_factory())
        fix_res = run_snippet(b['fix'], ns_factory())
        expect(bad_ok(*bad_res), 'bug hunt %s: the bad snippet shows the failure of the lesson: %s' % (bid, bad_res), 'bug hunts run')
        expect(fix_ok(*fix_res), 'bug hunt %s: the fix works: %s' % (bid, fix_res), 'bug hunts run')
        return bad_res, fix_res

    hunt('m1-bug', lambda o, e: e is None and o == '3 2', lambda o, e: e is None and o == '1 2', lambda: {'shapes': fresh_shapes()})
    hunt('m1-bug2', lambda o, e: e is None and o == '[]', lambda o, e: e is None and o == "['O-4']", lambda: {'shapes': fresh_shapes()})

    # m2-bug: the pipeline of the bad snippet adds the order total once for each line. The fix adds the revenue of the lines.
    real_revenue = {}
    for i in range(1, rules.ORDERS + 1):
        o = rules.order(i)
        real_revenue[o['store_id']] = real_revenue.get(o['store_id'], 0) + o['total_cents']
    bad_p, fix_p = eval(BUG['m2-bug']['code']), eval(BUG['m2-bug']['fix'])       # noqa: S307 - a pipeline literal
    got_bad = {d['_id']: d['revenue'] for d in db.orders.aggregate(bad_p)}
    got_fix = {d['_id']: d['revenue'] for d in db.orders.aggregate(fix_p)}
    expect(got_fix == real_revenue and any(got_bad[s] > real_revenue[s] for s in real_revenue) and any(got_bad[s] == real_revenue[s] for s in real_revenue), 'bug hunt m2-bug: the bad pipeline gives more than the real revenue for stores with several lines (and the right revenue for the others), and the fix gives the real revenue for all', 'bug hunts run')
    expect(set(got_bad) == set(real_revenue) and all(got_bad[s] in (real_revenue[s], 2 * real_revenue[s], 3 * real_revenue[s]) for s in real_revenue) and {got_bad[s] // real_revenue[s] for s in real_revenue} == {1, 2, 3}, 'bug hunt m2-bug: each store is counted one, two or three times', 'bug hunts run')
    bad_p2, fix_p2 = eval(BUG['m2-bug2']['code']), eval(BUG['m2-bug2']['fix'])   # noqa: S307
    expect(len(list(db.orders.aggregate(bad_p2))) == 0 and len(list(db.orders.aggregate(fix_p2))) == 12, 'bug hunt m2-bug2: a $match after a $group returns nothing and the fix returns one document for each of the 12 stores', 'bug hunts run')

    # m3: explain of the queries behind the two index hunts
    def explain(query, sort=None):
        cmd = {'find': 'orders', 'filter': query}
        if sort:
            cmd['sort'] = sort
        e = db.command('explain', cmd, verbosity='executionStats')['executionStats']
        return e['totalKeysExamined'], e['totalDocsExamined'], e['nReturned']

    def with_index(code):
        db.orders.drop_indexes()
        run_snippet(code.split('\n')[0], {'orders': db.orders})
    with_index(BUG['m3-bug']['code'])
    bad_keys = explain({'store_id': 3, 'status': 'PLACED'}, {'placed_at': 1})
    with_index(BUG['m3-bug']['fix'])
    fix_keys = explain({'store_id': 3, 'status': 'PLACED'}, {'placed_at': 1})
    expect(fix_keys[0] == fix_keys[2] and bad_keys[0] > 2 * fix_keys[0], 'bug hunt m3-bug: with the sort field first the server examined %d keys, and with the equality fields first %d for %d returned' % (bad_keys[0], fix_keys[0], fix_keys[2]), 'bug hunts run')
    with_index(BUG['m3-bug2']['code'])
    bad2 = explain({'store_id': 3, 'status': {'$ne': 'REFUNDED'}})
    with_index(BUG['m3-bug2']['fix'])
    fix2 = explain({'store_id': 3, 'status': {'$ne': 'REFUNDED'}})
    expect(bad2[2] == fix2[2] and bad2[0] >= 0.9 * 19200 and fix2[0] <= 2 * fix2[2], 'bug hunt m3-bug2: an index on status alone walked %d keys for %d documents, and the index on (store_id, status) walked %d' % (bad2[0], bad2[2], fix2[0]), 'bug hunts run')
    db.orders.drop_indexes()

    # m4: a reload that cannot be repeated, a stream without a token, and an update event without a document
    def reload_ns():
        db.drop_collection('daily')
        return {'db': db}

    def twice(code):
        ns = reload_ns()
        run_snippet(code, ns)
        return run_snippet(code, ns)
    o1, e1 = twice(BUG['m4-bug']['code'])
    o2, e2 = twice(BUG['m4-bug']['fix'])
    expect(isinstance(e1, errors.BulkWriteError) and e2 is None and o2 == '2', 'bug hunt m4-bug: the second run of insert_many fails with a duplicate key, and the second run of the upsert counts 2 documents', 'bug hunts run')
    b2 = BUG['m4-bug2']
    expect('resume_after' not in b2['code'] and 'resume_after=token' in b2['fix'] and 'save_token' in b2['fix'], 'bug hunt m4-bug2: the bad consumer opens the stream with no token and the fix resumes from a saved one (text)', 'bug hunts run')
    db.drop_collection('vtoken')
    db.create_collection('vtoken')
    vt = db.vtoken
    with vt.watch() as s0:
        vt.insert_one({'_id': 'seed'})
        s0.next()
        token = s0.resume_token
    vt.insert_one({'_id': 'A'})
    with vt.watch() as s1:
        vt.insert_one({'_id': 'B'})
        no_token = [s1.next()['documentKey']['_id']]
    with vt.watch(resume_after=token) as s2:
        with_token = [s2.next()['documentKey']['_id'], s2.next()['documentKey']['_id']]
    expect(no_token == ['B'] and with_token == ['A', 'B'], 'bug hunt m4-bug2: a stream opened with no token missed the change written while it was down (%s), and a stream resumed from a token got it (%s)' % (no_token, with_token), 'bug hunts run')
    db.drop_collection('ev')
    db.create_collection('ev')
    with db.ev.watch(full_document='updateLookup') as st:
        db.ev.insert_one({'_id': 'O-1', 'status': 'PLACED'})
        db.ev.update_one({'_id': 'O-1'}, {'$set': {'status': 'SHIPPED'}})
        db.ev.delete_one({'_id': 'O-1'})
        events = [st.next() for _ in range(3)]
    ob, eb = run_snippet(BUG['m4-bug3']['code'], {'stream': iter(events)})
    of, ef = run_snippet(BUG['m4-bug3']['fix'], {'stream': iter(events)})
    expect(isinstance(eb, TypeError) and ef is None and of == 'SHIPPED', 'bug hunt m4-bug3: the full document of an update is None after a delete (TypeError), and the changed fields give SHIPPED', 'bug hunts run')

    # the coding round
    top_expected = []
    stats = {}
    for i in range(1, rules.ORDERS + 1):
        o = rules.order(i)
        if o['status'] != 'REFUNDED':
            s = stats.setdefault(o['store_id'], [0, 0])
            s[0] += 1
            s[1] += o['total_cents']
    ranked = sorted(stats.items(), key=lambda kv: (-kv[1][1], kv[0]))[:3]
    top_expected = [(k, v[0], v[1], v[1] // v[0]) for k, v in ranked]

    def solve(text):
        ns = {}
        exec(text, ns)       # noqa: S102
        return [(d['_id'], d['orders'], d['revenue'], d['average']) for d in db.orders.aggregate(ns['top_stores'])]
    expect(solve(sol) == top_expected, 'the solution of the coding round returns the three best stores that Python worked out: %s' % solve(sol)[:3], 'coding round')
    for label, old, new in [('a solution that counts the refunded orders', "'$ne': 'REFUNDED'", "'$exists': True"), ('a solution that sorts the lowest revenue first', "'revenue': -1", "'revenue': 1"),
                            ('a solution that keeps two stores', "'$limit': 3", "'$limit': 2"), ('a solution that multiplies instead of dividing', "'$divide'", "'$multiply'")]:
        wrong = sol.replace(old, new)
        expect(wrong != sol, 'the control "%s" changes the solution' % label, 'coding round')
        control(label + ' is caught by the expected stores', lambda wrong=wrong: solve(wrong) != top_expected)
    mongolib.stop_server()

# ----------------------------------------------------------------------------------------------------------------------
# 5. The lab data, and controls for its checker
# ----------------------------------------------------------------------------------------------------------------------
def widget_checker(real=None):
    env = None
    if real is not None:
        p = pathlib.Path(tempfile.mkdtemp(prefix='mongodb-control-')) / 'real.js'
        p.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(real) + ';\n')
        env = dict(os.environ, MONGODB_REAL_JS=str(p))
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
    ('a match that left 19,201 documents', lambda d: d['counts']['pipeline']['stage_counts'].__setitem__(0, 19201)),
    ('an unwind that left 38,401 documents', lambda d: d['counts']['pipeline']['stage_counts'].__setitem__(1, 38401)),
    ('a SKU with one cent too much', lambda d: cell(d, 'pipeline.sku', 0, 2, d['tables']['pipeline.sku']['rows'][0][2] + 1)),
    ('a store with one cent too little', lambda d: cell(d, 'pipeline.store', 1, 2, d['tables']['pipeline.store']['rows'][1][2] - 1)),
    ('a region with 6,401 orders', lambda d: cell(d, 'pipeline.region', 0, 1, 6401)),
    ('a collection scan that examined 19,999 documents', lambda d: cell(d, 'index.cases', 0, 4, 19999)),
    ('a covered query that read a document', lambda d: cell(d, 'index.cases', 4, 4, 1)),
    ('a plan that keeps the sort with the sort field in the index', lambda d: cell(d, 'index.cases', 3, 2, 'SORT > FETCH > IXSCAN')),
    ('a validator that accepted a negative amount', lambda d: cell(d, 'design.validation', 3, 1, 'inserted')),
    ('an upsert that modified a document on the second run', lambda d: d['counts']['design'].__setitem__('upsert_second', [0, 3, 1])),
    ('an abort that left a document', lambda d: d['counts']['design'].__setitem__('after_abort', 1)),
    ('an update event that has its full document', lambda d: d['counts']['streams']['events'].__setitem__(1, "update O-1 changed {'status': 'SHIPPED'} full status=SHIPPED")),
    ('a resumed stream that missed an event', lambda d: d['counts']['streams']['resumed'].pop()),
    ('a coding round that ranks store 2 first', lambda d: d['tables']['challenge.top'].__setitem__('rows', [[2, 1600, 20000000, 12500]] + d['tables']['challenge.top']['rows'][1:])),
    ('a null query that matches only the null document', lambda d: d['counts']['shapes'].__setitem__('null_matches', "['O-1']")),
]
for label, fn in MUTATIONS:
    data = mut(fn)
    control(label + ': the widget checker fails', lambda data=data: widget_checker(data).returncode != 0)

# ----------------------------------------------------------------------------------------------------------------------
# 6. The lint
# ----------------------------------------------------------------------------------------------------------------------
r = runp(['node', ROOT / 'dev' / 'lint-content.js', 'mongodb'], cwd=ROOT)
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
    skipped('recapture', 'run with --recapture (about 10 seconds, needs Docker and the image mongo:8.0)')
elif not HAVE:
    skipped('recapture', 'no server')
else:
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='mongodb-recapture-')) / 'real.js'
    env = {k: v for k, v in os.environ.items() if k not in ('MONGO_URI', 'MONGO_DB')}
    r = runp([sys.executable, HERE / 'capture_mongodb.py', '--out', tmp], env=env)
    if r.returncode or not tmp.exists():
        bad('capture_mongodb.py failed: ' + (r.stdout + r.stderr)[-800:])
    else:
        again = load_real(tmp)
        diff = differing(REAL, again)
        tick('recaptured items', len(flatten(again)))
        for k in diff:
            bad('the recapture differs from js/real.js in %s' % k)
        print('recapture: %d items, %d differ' % (len(flatten(again)), len(diff)))
        ch = mut(lambda d: d['counts']['load'].__setitem__('orders', 20001))
        control('a recording with one number changed, given to the comparison', lambda: differing(REAL, ch) == ['counts:load.orders'])
        ch = mut(lambda d: d['text'].__setitem__('shapes.run', d['text']['shapes.run'].replace('11000', '11001')))
        control('a recording with one word changed in a printed text, given to the comparison', lambda: differing(REAL, ch) == ['text:shapes.run'])
        ch = mut(lambda d: d['tables']['index.cases']['rows'][2].__setitem__(4, 1))
        control('a recording with one cell of a table changed, given to the comparison', lambda: differing(REAL, ch) == ['tables:index.cases.rows[2][4]'])
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
    W = 'mongodb/js/widgets.js'
    BROWSER = [
        ('the pipeline lab shows the orders after $match as the documents after $unwind', W, "[n(P.stage_counts[1]), 'after $unwind']", "[n(P.stage_counts[0]), 'after $unwind']"),
        ('the pipeline lab colours the region join as a tip', W, "{ name: 'revenue by region, with $lookup', kind: 'warn',", "{ name: 'revenue by region, with $lookup', kind: 'tip',"),
        ('the index lab draws the bar against half of the collection', W, "bar('documents examined', r[4], total,", "bar('documents examined', r[4], total / 2,"),
        ('the index lab colours a full scan as good', W, "[n(r[4]), 'documents examined', r[4] > 1000 ? 'bad' : 'good']", "[n(r[4]), 'documents examined', 'good']"),
        ('the write lab opens on another case', W, "A.local.wl || (A.local.wl = { k: 1 })", "A.local.wl || (A.local.wl = { k: 2 })"),
        ('the write lab shows the second run of the upsert as the first', W, "[D.upsert_first.join(' / '), 'upserted / matched / modified, run 1']", "[D.upsert_second.join(' / '), 'upserted / matched / modified, run 1']"),
    ]
    for label, rel, old, new in BROWSER:
        copy = pathlib.Path(tempfile.mkdtemp(prefix='mongodb-mutation-'))
        for part in ('shared', 'mongodb'):
            shutil.copytree(ROOT / part, copy / part, ignore=shutil.ignore_patterns('__pycache__', '.cache', 'node_modules', '.git'))
        target = copy / rel
        src = target.read_text()
        if src.count(old) != 1:
            bad('control cannot be set up: "%s" is not in %s exactly once (%d)' % (old[:70], rel, src.count(old)))
            shutil.rmtree(copy, ignore_errors=True)
            continue
        target.write_text(src.replace(old, new))
        r2, _ = labs_e2e(copy / 'mongodb' / 'verify' / 'e2e_labs.js')
        control('the lab test fails when ' + label, lambda r2=r2: r2.returncode != 0)
        shutil.rmtree(copy, ignore_errors=True)

print()
print('checked: ' + ', '.join('%d %s' % (v, k) for k, v in sorted(counts.items())))
for sk in skips:
    print('skipped: ' + sk)
if problems:
    print('%d PROBLEM(S)' % len(problems))
    sys.exit(1)
print('verify_mongodb: all checks passed')
