#!/usr/bin/env python3
"""Check the code and the recorded output of the BI course (Power BI, Tableau and Looker for data engineers).

Power BI, Tableau Desktop, Tableau Server and Looker did not run for this course, and this script cannot check them. It checks what a laptop can check:

 1. Every code screen that claims to show a file shows that file, as it is on disk and as it is in the recording.
 2. SQL: every SQL text of the course is parsed by DuckDB. The queries are run again on a freshly built Brewline world, and the result that a screen
    shows is compared with the new result. The bug hunts are run: the broken query gives the wrong number that the lesson quotes, and the fix gives
    the right one.
 3. LookML: every LookML text is parsed with lkml. The broken view must fail, and its fix must parse.
 4. Python compiles, the Tableau data source is well-formed XML, the body of the refresh request is JSON.
 5. The whole recording is made again (capture_bi.py takes a few seconds) and compared with js/real.js, item by item. Nothing is allowed to differ:
    the data comes from a fixed rule and nothing is timed.
 6. The checks of the lab data (check_widgets.js) run, and deliberately broken inputs (controls) must be refused by the checkers.
 7. The lint of the course (dev/lint-content.js).
 8. With --browser the six labs are driven in Chromium (e2e_labs.js), and three changes to the widget code must make that test fail.

What this cannot show: that a DAX measure, a Tableau calculation, a TMDL file or a LookML model is accepted by its product, what a product does at
refresh time, or any limit of a licence. Those screens carry the "From documentation" tag, and the README lists what to check again.

Run:   python3 bi/verify/verify_bi.py [--no-run] [--browser] [--verbose]
Needs: Python 3.11 or later, Node 20 or later, and pip install -r bi/verify/requirements.txt. A check whose tool is missing says so and is skipped.
"""
import argparse
import json
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))

ap = argparse.ArgumentParser()
ap.add_argument('--no-run', action='store_true', help='parse and compare only: build no data and record nothing')
ap.add_argument('--browser', action='store_true', help='also drive the six labs in Chromium (bi/verify/e2e_labs.js) and its controls')
ap.add_argument('--verbose', '-v', action='store_true')
args = ap.parse_args()

problems, counts, skips = [], {}, []


def bad(msg):
    problems.append(msg)
    print('PROBLEM:', msg)


def tick(group, n=1):
    counts[group] = counts.get(group, 0) + n


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


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def have(mod):
    try:
        __import__(mod)
        return True
    except Exception:      # noqa: BLE001
        return False


def load_real(path):
    txt = pathlib.Path(path).read_text()
    return json.loads(txt[txt.index('LAB.real = ') + len('LAB.real = '):].rstrip().rstrip(';'))


REAL = load_real(ROOT / 'bi' / 'js' / 'real.js')
r = run(['node', str(HERE / 'dump_bi.js')], cwd=str(ROOT))
if r.returncode:
    print('PROBLEM: the course does not load: ' + (r.stderr or r.stdout)[-600:])
    sys.exit(1)
DUMP = json.loads(r.stdout)
CODE = DUMP['code']
by_id = {c['id']: c for c in CODE}

# ----------------------------------------------------------------------------------------------------------------------
# 1. Screens that show a file show that file
# ----------------------------------------------------------------------------------------------------------------------
disk = {str(p.relative_to(HERE)): p.read_text() for p in HERE.rglob('*') if p.is_file() and p.suffix in ('.sql', '.lkml', '.tds', '.tmdl') or p.name in ('build_extract.py', 'switch_connection.py')}
for rel, txt in REAL['files'].items():
    if rel == 'hyper/tile.sql':
        continue                                              # a query string of the recorder, not a file
    expect(disk.get(rel) == txt, 'the recorded file %s is the file on disk' % rel, 'recorded files')
recorded_texts = {t.rstrip('\n') for t in REAL['files'].values()} | {REAL['text']['powerbi.refresh_request']}
for c in CODE:
    if c['type'] in ('code', 'sql', 'sol') or (c['type'] == 'bug' and c['lang'] == 'lookml'):
        expect(c['code'].rstrip('\n') in recorded_texts, 'the screen %s shows a recorded file' % c['id'], 'code screens that show a recorded file')

# ----------------------------------------------------------------------------------------------------------------------
# 2. SQL: parse everything, run what can run, compare with what the screens show
# ----------------------------------------------------------------------------------------------------------------------
SQL = [c for c in CODE if c['lang'] == 'sql']
if not have('duckdb'):
    skipped('SQL parse and runs', 'pip install duckdb')
else:
    import duckdb

    def parses(sql):
        try:
            return len(duckdb.extract_statements(sql)) >= 1
        except Exception:      # noqa: BLE001
            return False

    for c in SQL:
        expect(parses(c['code']), 'DuckDB parses the SQL of %s' % c['id'], 'sql texts parsed')
    control('SQL with a missing parenthesis', lambda: not parses('SELECT sum(line_amount FROM fact_order_lines'))
    control('SQL with a misspelled keyword', lambda: not parses('SELEKT 1'))

    if args.no_run or not have('pyarrow'):
        skipped('SQL runs', '--no-run was given' if args.no_run else 'pip install pyarrow')
    else:
        from world import build_world

        def fresh():
            con = duckdb.connect()
            build_world(con)
            return con

        def rows_of(con, sql, params=None):
            cur = con.execute(sql, params or {})
            cols = [d[0] for d in cur.description] if cur.description else []
            out = []
            for row in cur.fetchall():
                out.append([round(float(v), 2) if isinstance(v, float) or hasattr(v, 'quantize') else (str(v) if hasattr(v, 'isoformat') else v) for v in row])
            return cols, out

        def norm(rows):
            return [[round(float(v), 2) if isinstance(v, (int, float)) and not isinstance(v, bool) else v for v in row] for row in rows]

        con = fresh()
        con.execute(by_id['m6-build']['code'])                 # the aggregate table, for the screens that read it
        compared = 0
        for c in SQL:
            if c['type'] not in ('sql', 'sol') or c['id'] in ('m6-build', 'm7-sql'):
                continue
            cols, rows = rows_of(con, c['code'])
            shown = c['result']
            if shown and [x.lower() for x in shown['cols']] == [x.lower() for x in cols]:
                expect(norm(shown['rows']) == norm(rows), 'the result on the screen %s is what the query returns now' % c['id'], 'sql results compared with the screens')
                compared += 1
            else:
                tick('sql screens that show a summary (covered by the recapture)')
        control('a result table with one number changed', lambda: norm([[1, 2.0]]) != norm([[1, 2.01]]))
        # the row-level security screen: one run for each of the five people
        shown = {r_[0]: r_[1:] for r_ in by_id['m7-sql']['result']['rows']}
        for user, want in shown.items():
            got = con.execute(by_id['m7-sql']['code'], {'email': user + '@brewline.example'}).fetchone()
            expect([got[0], round(float(got[1] or 0), 2)] == [want[0], round(float(want[1]), 2)], 'row-level security for %s gives the rows and the revenue on the screen' % user, 'row-level security runs')
        # the bug hunts: the broken query gives the wrong number that the lesson quotes, the fix gives the right one
        F, A = REAL['counts']['model.fanout'], REAL['counts']['perf.agg']
        b = rows_of(con, by_id['m2-bug']['code'])[1]
        f = rows_of(con, by_id['m2-bug:fix']['code'])[1]
        expect(round(sum(r_[2] for r_ in b), 2) == F['shipping_wrong'], 'bug hunt m2: the broken query adds up to the inflated shipping total', 'bug hunts run')
        expect(round(sum(r_[2] for r_ in f), 2) == F['shipping_right'] and round(sum(r_[1] for r_ in f), 2) == F['revenue_total'], 'bug hunt m2: the fix gives the right shipping total and the same revenue', 'bug hunts run')
        expect(round(sum(r_[1] for r_ in b), 2) == F['revenue_total'], 'bug hunt m2: revenue is right in the broken query too, as the lesson says', 'bug hunts run')
        b = rows_of(con, by_id['m6-bug']['code'])[1]
        f = rows_of(con, by_id['m6-bug:fix']['code'])[1]
        expect(b[0][2] == A['customers_march_summed_from_agg'], 'bug hunt m6: the broken query gives the summed customer count of the lesson', 'bug hunts run')
        expect(f[0][1] == A['customers_march_true'], 'bug hunt m6: the fix gives the true customer count', 'bug hunts run')
        # bug hunt m4 reads a table of daily ratios for each store. Build it, and check that the two queries disagree and that the fix is revenue / orders.
        con.execute("CREATE TABLE store_daily_stats AS SELECT o.order_date, o.store_id, sum(l.line_amount) AS revenue, count(DISTINCT o.order_id) AS orders, "
                    "sum(l.line_amount) / count(DISTINCT o.order_id) AS average_order_value FROM fact_order_lines l JOIN fact_orders o ON o.order_id = l.order_id GROUP BY 1, 2")
        b = dict((r_[0], r_[1]) for r_ in rows_of(con, by_id['m4-bug']['code'])[1])
        f = dict((r_[0], r_[1]) for r_ in rows_of(con, by_id['m4-bug:fix']['code'])[1])
        truth = dict((r_[0], r_[1]) for r_ in rows_of(con, "SELECT s.region, sum(l.line_amount) / count(DISTINCT o.order_id) FROM fact_order_lines l JOIN fact_orders o ON o.order_id = l.order_id "
                                                           "JOIN dim_store s ON s.store_id = o.store_id WHERE o.order_date >= DATE '2026-03-01' GROUP BY 1")[1])
        expect(f == truth, 'bug hunt m4: the fix gives revenue divided by orders for each region', 'bug hunts run')
        expect(all(b[k] != f[k] for k in f), 'bug hunt m4: the average of daily ratios differs from the ratio of sums in every region', 'bug hunts run')

# ----------------------------------------------------------------------------------------------------------------------
# 3. LookML
# ----------------------------------------------------------------------------------------------------------------------
if not have('lkml'):
    skipped('LookML parse', 'pip install lkml')
else:
    import lkml

    def lk_ok(txt):
        try:
            lkml.load(txt)
            return True
        except Exception:      # noqa: BLE001
            return False

    for c in CODE:
        if c['lang'] != 'lookml':
            continue
        if c['type'] == 'bug':
            expect(not lk_ok(c['code']), 'the parser refuses the broken LookML of %s' % c['id'], 'lookml texts parsed')
        else:
            expect(lk_ok(c['code']), 'the parser reads the LookML of %s' % c['id'], 'lookml texts parsed')
    control('LookML with a missing brace', lambda: not lk_ok('view: x {\n  dimension: a {\n    type: number\n}'))
    # the references ${view.field} in the model must name fields that the views define
    fields = {(r_[0], r_[2]) for r_ in REAL['tables']['lookml.fields']['rows']}
    model = REAL['files']['lookml/brewline.model.lkml']
    for view, field in re.findall(r'\$\{(\w+)\.(\w+)\}', model):
        expect((view, field) in fields, 'the model refers to %s.%s, which a view defines' % (view, field), 'lookml references resolved')
    control('a reference to a field that no view defines', lambda: ('orders', 'no_such_field') not in fields)

# ----------------------------------------------------------------------------------------------------------------------
# 4. Python, XML, JSON
# ----------------------------------------------------------------------------------------------------------------------
def compiles(src):
    try:
        compile(src, '<lesson>', 'exec')
        return True
    except SyntaxError:
        return False


def xml_ok(txt):
    try:
        ET.fromstring(txt)
        return True
    except ET.ParseError:
        return False


for c in CODE:
    if c['lang'] == 'python':
        expect(compiles(c['code']), 'the Python of %s compiles' % c['id'], 'python texts compiled')
    if c['lang'] == 'xml':
        expect(xml_ok(c['code']), 'the XML of %s is well formed' % c['id'], 'xml texts parsed')
    if c['lang'] == 'http':
        head, _, body = c['code'].partition('\n\n')
        try:
            ok = isinstance(json.loads(body), dict) and head.startswith('POST https://')
        except ValueError:
            ok = False
        expect(ok, 'the request of %s has a method, an address and a JSON body' % c['id'], 'http requests parsed')
control('Python with a syntax error', lambda: not compiles('def f(:\n    pass'))
control('XML with an unclosed tag', lambda: not xml_ok('<datasource><connection></datasource>'))
tick('formulas from documentation that no tool here can run (DAX, TMDL, Tableau calculations)', sum(1 for c in CODE if c['lang'] in ('tmdl',)) + sum(
    1 for _, s in DUMP['strings'] for m in re.findall(r'`([^`]+)`', s) if re.search(r'CALCULATE|DIVIDE|DISTINCTCOUNT|TOTALYTD|COUNTD|FIXED|RUNNING_SUM|TOTAL\(|USERPRINCIPALNAME|USERNAME\(\)', m)))

# ----------------------------------------------------------------------------------------------------------------------
# 5. Record everything again and compare
# ----------------------------------------------------------------------------------------------------------------------
def flatten(real):
    out = {}
    for kind in ('meta', 'counts', 'tables', 'text', 'files'):
        for k, v in real[kind].items():
            out[kind + ':' + k] = v
    return out


def differing(a, b):
    fa, fb = flatten(a), flatten(b)
    return sorted(k for k in set(fa) | set(fb) if fa.get(k) != fb.get(k))


needed = ['duckdb', 'pyarrow', 'tableauhyperapi', 'lkml', 'tableaudocumentapi', 'requests']
if args.no_run:
    skipped('recapture', '--no-run was given')
elif not all(have(m) for m in needed):
    skipped('recapture', 'pip install -r bi/verify/requirements.txt (missing: %s)' % ', '.join(m for m in needed if not have(m)))
else:
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='bi-recapture-')) / 'real.js'
    r = run([sys.executable, str(HERE / 'capture_bi.py'), '--out', str(tmp)])
    if r.returncode or not tmp.exists():
        bad('capture_bi.py failed: ' + (r.stdout + r.stderr)[-800:])
    else:
        again = load_real(tmp)
        diff = differing(REAL, again)
        tick('recaptured items', len(flatten(again)))
        for k in diff:
            bad('the recapture differs from js/real.js in %s' % k)
        print('recapture: %d items, %d differ' % (len(flatten(again)), len(diff)))
        changed = json.loads(json.dumps(again))
        changed['counts']['model.fanout']['shipping_wrong'] += 1
        control('a recording with one number changed, given to the comparison', lambda: differing(REAL, changed) == ['counts:model.fanout'])
    shutil.rmtree(tmp.parent, ignore_errors=True)

# ----------------------------------------------------------------------------------------------------------------------
# 6. The lab data, and controls for its checker
# ----------------------------------------------------------------------------------------------------------------------
def widget_checker(real=None):
    env = None
    if real is not None:
        p = pathlib.Path(tempfile.mkdtemp(prefix='bi-control-')) / 'real.js'
        p.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(real) + ';\n')
        import os
        env = dict(os.environ, BI_REAL_JS=str(p))
    return run(['node', str(HERE / 'check_widgets.js')], cwd=str(ROOT), env=env)


r = widget_checker()
m = re.search(r'(\d+) checks, (\d+) failed', r.stdout)
expect(r.returncode == 0 and m, 'check_widgets.js passes: ' + r.stdout.strip()[-200:], 'lab checks')
tick('lab data checks', int(m.group(1)) if m else 0)
for label, mutate in (
    ('the inflated shipping total is changed', lambda d: d['counts']['model.fanout'].__setitem__('shipping_wrong', 1.0)),
    ('a cell of the measures lab is changed', lambda d: d['tables']['measures.lab']['rows'][6].__setitem__(2, 1.0)),
    ('the rows of a partition are changed', lambda d: d['tables']['refresh.partitions']['rows'][14].__setitem__(1, 1)),
    ('the revenue that ana may see is changed', lambda d: d['tables']['rls.users']['rows'][0].__setitem__(4, 1.0)),
    ('the rows of the aggregate table are changed', lambda d: d['counts']['perf.agg'].__setitem__('agg_rows', 999999)),
    ('the status of the late order in the extract is changed', lambda d: d['counts']['hyper.append'].__setitem__('late_order_status_in_extract', 'refunded')),
):
    data = json.loads(json.dumps(REAL))
    mutate(data)
    control(label + ': the widget checker fails', lambda data=data: widget_checker(data).returncode != 0)

# ----------------------------------------------------------------------------------------------------------------------
# 7. The lint
# ----------------------------------------------------------------------------------------------------------------------
r = run(['node', str(ROOT / 'dev' / 'lint-content.js'), 'bi'], cwd=str(ROOT))
expect(r.returncode == 0 and 'lint clean' in r.stdout, 'the lint of the course is clean: ' + r.stdout.strip()[-200:], 'lint runs')

# ----------------------------------------------------------------------------------------------------------------------
# 8. The labs in a browser, and controls for that test
# ----------------------------------------------------------------------------------------------------------------------
def labs_e2e(script):
    r_ = run(['node', str(script)], cwd=str(script.parent.parent.parent))
    return r_, re.search(r'(\d+) checks passed', r_.stdout)


if not args.browser:
    skipped('the labs in a browser', 'run with --browser (needs Playwright and Chromium)')
else:
    r, m = labs_e2e(HERE / 'e2e_labs.js')
    expect(r.returncode == 0 and m, 'e2e_labs.js passes: ' + (r.stdout + r.stderr).strip()[-300:], 'browser lab tests')
    tick('browser lab checks', int(m.group(1)) if m else 0)
    MUTATIONS = [
        ('a live page sends five queries for each viewer instead of six', 'bi/js/widgets.js', "return { queries: viewers * P.tiles,", "return { queries: viewers * (P.tiles - 1),"),
        ('the refresh lab keeps eleven months instead of twelve', 'bi/js/widgets.js', "var WINDOWS = [1, 2, 6], KEEP = 12;", "var WINDOWS = [1, 2, 6], KEEP = 11;"),
        ('the fan-out lab marks no repeated rows', 'bi/js/widgets.js', "return again ? 'dup' : '';", "return '';"),
    ]
    for label, rel, old, new in MUTATIONS:
        copy = pathlib.Path(tempfile.mkdtemp(prefix='bi-mutation-'))
        for part in ('shared', 'bi'):
            shutil.copytree(ROOT / part, copy / part, ignore=shutil.ignore_patterns('__pycache__', '.cache', 'node_modules', '.git'))
        target = copy / rel
        src = target.read_text()
        if src.count(old) != 1:
            bad('control cannot be set up: "%s" is not in %s exactly once' % (old, rel))
            continue
        target.write_text(src.replace(old, new))
        r2, _ = labs_e2e(copy / 'bi' / 'verify' / 'e2e_labs.js')
        control('the lab test fails when ' + label, lambda r2=r2: r2.returncode != 0)
        shutil.rmtree(copy, ignore_errors=True)

print()
print('checked: ' + ', '.join('%d %s' % (v, k) for k, v in sorted(counts.items())))
for s in skips:
    print('skipped: ' + s)
if problems:
    print('%d PROBLEM(S)' % len(problems))
    sys.exit(1)
print('verify_bi: all checks passed')
