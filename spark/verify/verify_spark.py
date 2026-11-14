#!/usr/bin/env python3
"""Check the code and the recorded output of the Apache Spark for data engineers tutorial.

Everything in this tutorial that is recorded ran on a real Apache Spark 4.0.1 in local mode on one machine (capture_spark.py), with Delta Lake 4.0.1, pytest and the
spark-submit of the same release. Nothing ran on a cluster, on YARN, on Kubernetes, on a managed service, with Kafka, or with Iceberg or Hudi. This script checks what
can be checked on one machine:

1. The recorded files are the files in spark/verify.
2. Every Python snippet is parsed with ast. Imports are resolved against the installed PySpark, every F.name and Window.name must exist, and the keyword arguments of
   every call whose function can be found are checked against its signature.
3. SQL snippets are parsed with sqlglot (the Spark dialect). The queries that show a result on screen are run again in Spark, on the same small tables, and must give
   that result. The query that Spark 4.0.1 cannot parse (QUALIFY) must still be refused. The solution of the SQL coding round runs on the table that is shown.
4. The shell snippet goes through bash -n, and every flag of spark-submit in it must be one that the installed spark-submit lists in its help.
5. The recording is made again and compared with js/real.js: a part of it by default, all of it with --recapture.
6. The checks of the lab data (check_widgets.js) run, and deliberately broken inputs (controls) must be refused by the checkers.

What this cannot show: that a cluster manager accepts a command, what a real cluster does under load, anything about Kafka, Iceberg or Hudi, or that a default is the
same in another release of Spark. Those screens carry the "From documentation" tag, and the README lists what was not checked.

Run:  python3 spark/verify/verify_spark.py [--no-run] [--recapture] [--verbose]
Needs: a Python environment made from spark/verify/requirements.txt (PySpark 4.0.1, Delta Lake 4.0.1, pandas 2, pytest, sqlglot), Java 17 or 21, Node 20 or later.
       A check whose tool is missing says so and is skipped.
"""
import argparse
import ast
import importlib
import importlib.util
import inspect
import json
import logging
import os
import pathlib
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
import textwrap

logging.disable(logging.WARNING)
HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))


# ======================================================================================================================
# Resolving names in Python snippets
# ======================================================================================================================
def chain(node):
    out = []
    while isinstance(node, ast.Attribute):
        out.append(node.attr)
        node = node.value
    if isinstance(node, ast.Name):
        out.append(node.id)
    return list(reversed(out))


def import_object(path):
    parts = path.split('.')
    for i in range(len(parts), 0, -1):
        try:
            obj = importlib.import_module('.'.join(parts[:i]))
        except Exception:
            continue
        try:
            for a in parts[i:]:
                obj = getattr(obj, a)
            return obj
        except AttributeError:
            return None
    return None


def allowed_keywords(obj):
    """The keyword names that a call may use, or None when the callee takes any (**kwargs with nothing to check them against)."""
    names, any_kw = set(), False
    targets = [obj]
    if inspect.isclass(obj):
        targets = [c.__init__ for c in obj.__mro__ if c is not object and '__init__' in vars(c)] or [obj]
    found = False
    for t in targets:
        try:
            sg = inspect.signature(t)
        except (TypeError, ValueError):
            continue
        found = True
        for p in sg.parameters.values():
            if p.kind == p.VAR_KEYWORD:
                any_kw = True
            elif p.kind != p.VAR_POSITIONAL:
                names.add(p.name)
    if not found or (any_kw and not inspect.isclass(obj)):
        return None
    return names


DEFAULT_ALIASES = {'F': 'pyspark.sql.functions', 'Window': 'pyspark.sql.Window', 'SparkSession': 'pyspark.sql.SparkSession'}


def resolve_snippets(snippets):
    """For every Python snippet: unresolved imports, F.name and Window.name that do not exist, and keyword arguments that the callee does not take."""
    out = {'bad': [], 'imports_ok': 0, 'imports_missing': [], 'calls_checked': 0, 'calls_unresolved': 0, 'keywords_checked': 0, 'names_checked': 0}
    for s in snippets:
        try:
            tree = ast.parse(textwrap.dedent(s['code']))
        except SyntaxError:
            continue
        alias = {}
        for n in ast.walk(tree):
            if isinstance(n, ast.Import):
                for a in n.names:
                    alias[(a.asname or a.name).split('.')[0]] = a.name if a.asname else a.name.split('.')[0]
                    if importlib.util.find_spec(a.name.split('.')[0]) is None:
                        out['imports_missing'].append([s['id'], a.name])
                    else:
                        out['imports_ok'] += 1
            elif isinstance(n, ast.ImportFrom):
                mod = n.module or ''
                missing_root = bool(mod) and importlib.util.find_spec(mod.split('.')[0]) is None
                for a in n.names:
                    alias[a.asname or a.name] = mod + '.' + a.name
                    if missing_root:
                        out['imports_missing'].append([s['id'], mod])
                        continue
                    if import_object(mod + '.' + a.name) is None:
                        out['bad'].append('%s: cannot import %s from %s' % (s['id'], a.name, mod))
                    else:
                        out['imports_ok'] += 1
        used = {n.id for n in ast.walk(tree) if isinstance(n, ast.Name)}
        for short, full in DEFAULT_ALIASES.items():           # the course writes F, Window and SparkSession in the usual way, even where a short snippet has no import line
            if short in used and short not in alias:
                alias[short] = full
        # F.name and Window.name: the name must exist in the module or class that the alias stands for
        for n in ast.walk(tree):
            if isinstance(n, ast.Attribute) and isinstance(n.value, ast.Name) and n.value.id in alias and alias[n.value.id] in ('pyspark.sql.functions', 'pyspark.sql.Window', 'pyspark.sql.window.Window', 'pyspark.sql.types'):
                target = import_object(alias[n.value.id])
                if target is None:
                    continue
                out['names_checked'] += 1
                if not hasattr(target, n.attr):
                    out['bad'].append('%s: %s.%s does not exist in %s' % (s['id'], n.value.id, n.attr, alias[n.value.id]))
        for n in ast.walk(tree):
            if not isinstance(n, ast.Call) or not n.keywords:
                continue
            c = chain(n.func)
            if not c or c[0] not in alias:
                continue
            obj = import_object('.'.join([alias[c[0]]] + c[1:]))
            if obj is None or not callable(obj):
                out['calls_unresolved'] += 1
                continue
            names = allowed_keywords(obj)
            out['calls_checked'] += 1
            if names is None:
                continue
            for kw in n.keywords:
                if kw.arg:
                    out['keywords_checked'] += 1
                    if kw.arg not in names:
                        out['bad'].append('%s: %s has no keyword %s' % (s['id'], '.'.join(c), kw.arg))
    return out


if len(sys.argv) == 3 and sys.argv[1] == '--resolve':
    print(json.dumps(resolve_snippets(json.loads(pathlib.Path(sys.argv[2]).read_text()))))
    sys.exit(0)

ap = argparse.ArgumentParser()
ap.add_argument('--no-run', action='store_true', help='parse and compare only: run no recorder, no Spark and no checker')
ap.add_argument('--recapture', action='store_true', help='make the whole recording again and compare it with js/real.js')
ap.add_argument('--verbose', '-v', action='store_true')
args = ap.parse_args()

problems, counts, notes, skips = [], {}, [], []


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
    except Exception:
        return
    bad('control "%s": the checker accepted a broken input' % label)


def have(mod):
    try:
        return importlib.util.find_spec(mod.split('.')[0]) is not None
    except (ImportError, ValueError):
        return False


def load_real(path):
    t = pathlib.Path(path).read_text()
    return json.loads(t.split('LAB.real = ', 1)[1].rstrip().rstrip(';'))


def run(cmd, **kw):
    kw.setdefault('capture_output', True)
    kw.setdefault('text', True)
    return subprocess.run(cmd, **kw)


r = run(['node', str(ROOT / 'dev' / 'dump-scenes.js'), 'spark'], cwd=str(ROOT))
if r.returncode:
    bad('dump-scenes.js failed: ' + r.stderr[:300])
    DUMP = {'snippets': [], 'results': []}
else:
    DUMP = json.loads(r.stdout)
REAL = load_real(ROOT / 'spark' / 'js' / 'real.js')
SNIP = DUMP['snippets']

# ======================================================================================================================
# 1. Recorded files are the files on disk
# ======================================================================================================================
for key, text in REAL['files'].items():
    if key.startswith('code/'):
        p = HERE / key[5:]
        expect(p.exists() and p.read_text().strip() == text.strip(), 'the recorded file %s is the file on disk' % key, 'recorded files')
expect(len([k for k in REAL['files'] if k.startswith('code/')]) >= 14, 'the recording holds the code of the course')

# ======================================================================================================================
# 2. Python snippets
# ======================================================================================================================
py_snips = [s for s in SNIP if s['lang'] == 'python' and s['kind'] != 'starter']
for s in py_snips:
    try:
        ast.parse(textwrap.dedent(s['code']))
        tick('python snippets')
    except SyntaxError as e:
        bad('%s (%s): Python does not parse: %s' % (s['id'], s['kind'], e))

def file_imports(code):
    """The import lines of the recorded file that this snippet was cut from, or an empty string."""
    first = next((l.strip() for l in code.splitlines() if l.strip()), '')
    for key, text in REAL['files'].items():
        if key.startswith('code/') and first and first in text and key.endswith('.py'):
            return '\n'.join(l for l in text.splitlines() if re.match(r'(import|from) \S+', l) and 'sys.path' not in l and not l.startswith('from __future__')) + '\n'
    return ''


if have('pyspark'):
    res = resolve_snippets([dict(s, code=file_imports(s['code']) + textwrap.dedent(s['code'])) if s['kind'] == 'code' else s for s in py_snips])
    for m in res['imports_missing']:
        notes.append('%s: %s is not installed in this interpreter, so its import was not resolved' % (m[0], m[1]))
    for b in res['bad']:
        bad(b)
    tick('imports resolved', res['imports_ok'])
    tick('names checked in functions, Window and types', res['names_checked'])
    tick('keywords checked', res['keywords_checked'])
    tick('calls checked', res['calls_checked'])
    expect(res['names_checked'] >= 20 and res['imports_ok'] >= 30 and res['calls_checked'] >= 3, 'the name check reached a useful number of names (%d names, %d calls with keywords, %d imports)' % (res['names_checked'], res['calls_checked'], res['imports_ok']))
    control('a function that pyspark.sql.functions does not have', lambda: bool(resolve_snippets([{'id': 'c', 'code': 'from pyspark.sql import functions as F\nF.not_a_function("x")'}])['bad']))
    control('a keyword that the function does not take', lambda: bool(resolve_snippets([{'id': 'c', 'code': 'from pyspark.sql import functions as F\nF.window("t", "10 minutes", nonsense=1)'}])['bad']))
    control('an import that does not exist', lambda: bool(resolve_snippets([{'id': 'c', 'code': 'from pyspark.sql.types import NoSuchType'}])['bad']))
else:
    skipped('python snippet names', 'pyspark is not installed in this interpreter')
control('Python that does not parse', lambda: ast.parse('def f(:\n  pass'))

# ======================================================================================================================
# 3. SQL: parse, and run again in Spark
# ======================================================================================================================
def norm(x):
    s = 'NULL' if x is None or x == '' else str(x).replace(',', '')
    try:
        return round(float(s), 4)
    except ValueError:
        return s


def same_rows(got, want):
    return [[norm(x) for x in r] for r in got] == [[norm(x) for x in r] for r in want]


HAVE_SQLGLOT = have('sqlglot')
if HAVE_SQLGLOT:
    import sqlglot
    sql_snips = [s for s in SNIP if s['lang'] == 'sql' and s['kind'] != 'starter']
    for s in sql_snips:
        text = re.sub(r'^--.*$', '', s['code'], flags=re.M)
        parts = [p for p in re.split(r'\n\s*\n', text) if p.strip()]
        for p in parts:
            if s['id'] == 'm8-qualify' and 'QUALIFY' in p:
                continue                                     # Spark 4.0.1 refuses this on purpose: it is run below and must fail
            try:
                sqlglot.parse(p, read='spark')
                tick('sql parsed')
            except Exception as e:  # noqa: BLE001
                bad('%s (%s): SQL does not parse in the Spark dialect: %s' % (s['id'], s['kind'], str(e)[:100]))
    control('SQL that does not parse', lambda: sqlglot.parse('SELECT FROM WHERE', read='spark') and False)
else:
    skipped('SQL parsing', 'sqlglot is not installed')

HAVE_SPARK = have('pyspark') and shutil.which('java') is not None
if HAVE_SPARK and not args.no_run:
    import session as S
    import sqlfun as Q
    work = tempfile.mkdtemp(prefix='spark-verify-')
    run_ = S.Run('verify', work)
    sp = run_.spark
    Q.windows(sp)
    Q.groupings(sp)
    Q.arrays(sp)
    code = {s['id']: s['code'] for s in SNIP if s['kind'] == 'code'}
    shown = {}
    for x in DUMP['results']:
        shown.setdefault(x['id'], {})[x['kind']] = x
    for sid in ('m8-windows', 'm8-ties', 'm8-rollup', 'm8-pivot', 'm8-arrays'):
        got = [[('NULL' if v is None else str(v)) for v in row] for row in sp.sql(code[sid]).collect()]
        want = shown[sid]['result']['rows']
        expect(same_rows(got, want), '%s: the query gives the table that the lesson shows (got %s, shown %s)' % (sid, got[:2], want[:2]), 'sql runs')
        expect(len(got) == len(want), '%s: the same number of rows' % sid, 'sql runs')
    got = [[str(v) for v in row] for row in sp.sql(code['m8-explode']).collect()]
    expect(same_rows(got, shown['m8-explode']['result']['rows']), 'm8-explode: the query gives the rows that the lesson shows', 'sql runs')
    outer = [[('NULL' if v is None else str(v)) for v in row] for row in sp.sql(code['m8-explode'].replace('LATERAL VIEW explode', 'LATERAL VIEW OUTER explode')).collect()]
    expect(len(outer) == len(got) + 1 and outer[-1][1] == 'NULL', 'm8-explode: with OUTER the empty array keeps one row with NULL', 'sql runs')
    # the bug of mission 8: a running total with the default frame merges the tied rows, and the fix does not
    bug_rows = [[int(v) for v in r_] for r_ in sp.sql(code['m8-bug']).collect()]
    fix_rows = [[int(v) for v in r_] for r_ in sp.sql([s for s in SNIP if s['id'] == 'm8-bug' and s['kind'] == 'fix'][0]['code']).collect()]
    expect(sorted(r_[2] for r_ in bug_rows if r_[1] == 150) == [490, 490] and sorted(r_[2] for r_ in fix_rows if r_[1] == 150) == [340, 490], 'm8-bug: the default frame gives 490 for both tied rows, the ROWS frame gives 340 and 490', 'sql runs')
    # QUALIFY is refused by Spark 4.0.1, and the subquery form works
    qual = code['m8-qualify']
    first = [p for p in re.split(r'\n\s*\n', qual) if 'QUALIFY' in p][0].strip()
    sp.createDataFrame([('s01', 5), ('s01', 9), ('s02', 4)], 'store_id string, total_cents int').createOrReplaceTempView('orders')
    try:
        sp.sql(first)
        refused = False
    except Exception as e:  # noqa: BLE001
        refused = 'PARSE_SYNTAX_ERROR' in str(e)
    expect(refused, 'm8-qualify: Spark 4.0.1 refuses QUALIFY with a syntax error', 'sql runs')
    second = qual.split('-- the way that works, in Spark 4.0.1')[1].strip()
    expect(sorted([tuple(r_) for r_ in sp.sql(second).collect()]) == [('s01', 1), ('s02', 1)], 'm8-qualify: the subquery form gives the first row of each store', 'sql runs')
    # the coding round: the solution runs on the table that is shown, and gives the result that is shown
    ch = [x for x in SNIP if x['id'] == 'm15-ch' and x['kind'] == 'sol'][0]['code']
    data = shown['m15-ch']['data']['rows']
    sp.createDataFrame([(a, int(str(b).replace(',', ''))) for a, b in data], 'store_id string, orders long').createOrReplaceTempView('store_orders')
    got = [[('NULL' if v is None else str(v)) for v in row] for row in sp.sql(ch).collect()]
    expect(same_rows(got, shown['m15-ch']['res']['rows']), 'm15-ch: the solution gives the table that the lesson shows (got %s)' % got[:2], 'sql runs')
    control('a result with one number changed', lambda: not same_rows([['a', 1]], [['a', 2]]))
    control('SQL that Spark does not parse', lambda: sp.sql('SELEC 1') and False)
    run_.stop()
    shutil.rmtree(work, ignore_errors=True)
elif not args.no_run:
    skipped('the SQL runs', 'pyspark or java is missing')

# ======================================================================================================================
# 4. Shell snippets: syntax, and every flag must be one that spark-submit lists
# ======================================================================================================================
def spark_submit():
    cand = pathlib.Path(sys.executable).parent / 'spark-submit'
    if cand.exists():
        return str(cand)
    if have('pyspark'):
        import pyspark
        p = pathlib.Path(pyspark.__file__).parent / 'bin' / 'spark-submit'
        if p.exists():
            return str(p)
    return shutil.which('spark-submit')


def submit_flags(code):
    text = re.sub(r'\\\n\s*', ' ', code)
    out = []
    for line in text.splitlines():
        try:
            toks = shlex.split(line, comments=True)
        except ValueError:
            continue
        if toks and toks[0] == 'spark-submit':
            app = next((i for i, t in enumerate(toks) if t.endswith('.py') or t.endswith('.jar')), len(toks))
            out.extend(t.split('=')[0] for t in toks[1:app] if t.startswith('--'))
    return out


SUBMIT = spark_submit()
HELP = ''
if SUBMIT and not args.no_run:
    h = run([SUBMIT, '--help'])
    HELP = h.stdout + h.stderr
elif not args.no_run:
    skipped('spark-submit flags', 'spark-submit was not found')
RECORDED_FLAGS = {r_[0] for r_ in REAL['tables']['submit.flags']['rows']}
for s in [s for s in SNIP if s['lang'] == 'bash']:
    r = run(['bash', '-n'], input=s['code'])
    expect(r.returncode == 0, '%s (%s): shell syntax (%s)' % (s['id'], s['kind'], r.stderr.strip()[:80]), 'shell snippets')
    flags = submit_flags(s['code'])
    tick('flags checked against the recorded help', len(flags))
    for f in flags:
        expect(f in RECORDED_FLAGS, '%s: %s is a flag that the recording found in spark-submit --help' % (s['id'], f), 'flag checks')
        if HELP:
            expect(re.search(r'(^|[\s,\[])' + re.escape(f) + r'([=\s,\]]|$)', HELP, re.M) is not None, '%s: %s is in the help of the installed spark-submit' % (s['id'], f), 'flag checks')
control('a flag that spark-submit does not have', lambda: '--no-such-flag' not in RECORDED_FLAGS and (not HELP or re.search(r'--no-such-flag', HELP) is None))
control('shell that does not parse', lambda: run(['bash', '-n'], input='if then fi (').returncode != 0)

# ======================================================================================================================
# 5. The recording is made again and compared with js/real.js
# ======================================================================================================================
def flat(o, prefix=''):
    if isinstance(o, dict):
        for k in sorted(o):
            yield from flat(o[k], prefix + '/' + k)
    else:
        yield prefix, json.dumps(o, sort_keys=True)


def compare(fresh, full):
    old, new = dict(flat(REAL)), dict(flat(fresh))
    diff = []
    for k in sorted(set(new) | (set(old) if full else set())):
        if k.startswith('/meta/'):
            continue
        if old.get(k) != new.get(k):
            diff.append(k)
    return diff, len(new)


if not args.no_run and HAVE_SPARK:
    sections = 'world,conf,plans,sqlfun,udfs,tests,submit,errors,eventlog' if not args.recapture else 'world,conf,plans,partitions,joins,skew,memory,layout,sqlfun,udfs,streaming,tables,tests,submit,errors,eventlog'
    with tempfile.TemporaryDirectory() as d:
        out = pathlib.Path(d, 'real.js')
        r = run([sys.executable, str(HERE / 'capture_spark.py'), '--only', sections, '--out', str(out)], cwd=str(ROOT))
        if r.returncode or not out.exists():
            bad('capture_spark.py failed: ' + (r.stderr or r.stdout)[-400:])
        else:
            fresh = load_real(out)
            diff, n = compare(fresh, args.recapture)
            tick('recorded items compared', n)
            for k in diff[:12]:
                bad('the recording differs from js/real.js at %s' % k)
            if len(diff) > 12:
                bad('... and %d more differences' % (len(diff) - 12))
            notes.append('recapture (%s): %d items compared, %d differ' % (sections, n, len(diff)))
    # ------------------------------------------------------------------------------------------------------------------
    # 6. The lab data checks, and controls for the checker
    # ------------------------------------------------------------------------------------------------------------------
    r = run(['node', str(HERE / 'check_widgets.js')], cwd=str(ROOT))
    last = (r.stdout.strip().splitlines() or [''])[-1]
    expect(r.returncode == 0, 'check_widgets.js: %s %s' % (last, r.stdout[-300:] if r.returncode else ''), 'widget data checks')
    m = re.match(r'(\d+) checks', last)
    tick('lab data checks', int(m.group(1)) if m else 0)

    def checker_refuses(mutate):
        """Copy the checker next to a changed copy of the recording, and run it. It must fail."""
        with tempfile.TemporaryDirectory() as d:
            (pathlib.Path(d) / 'spark' / 'verify').mkdir(parents=True)
            (pathlib.Path(d) / 'spark' / 'js').mkdir(parents=True)
            shutil.copy(HERE / 'check_widgets.js', pathlib.Path(d) / 'spark' / 'verify' / 'check_widgets.js')
            real = load_real(ROOT / 'spark' / 'js' / 'real.js')
            mutate(real)
            (pathlib.Path(d) / 'spark' / 'js' / 'real.js').write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(real) + ';\n')
            return run(['node', str(pathlib.Path(d) / 'spark' / 'verify' / 'check_widgets.js')]).returncode != 0

    control('a recording where a store listed twice no longer doubles the join', lambda: checker_refuses(lambda x: x['counts']['joins.counts'].__setitem__('inner_to_stores_listed_twice', 400001)))
    control('a recording where the memory formula is off by a thousand bytes', lambda: checker_refuses(lambda x: x['tables']['mem.formula']['rows'][1].__setitem__(2, x['tables']['mem.formula']['rows'][1][2] + 1000)))
    control('a recording where the watermark is wrong', lambda: checker_refuses(lambda x: x['tables']['stream.progress']['rows'][2].__setitem__(2, '10:06')))
    control('a recording where the sink got a batch once', lambda: checker_refuses(lambda x: x['counts']['stream.restart'].__setitem__('batch_written_twice', [])))
    control('a recording where a running total is wrong', lambda: checker_refuses(lambda x: x['tables']['sql.windows']['rows'][1].__setitem__(3, 999)))

# ======================================================================================================================
print()
for n in notes:
    print('note:', n)
for sk in skips:
    print('skipped:', sk)
print('\nchecked:', json.dumps(counts, sort_keys=True))
print('%d problem(s)' % len(problems) if problems else 'all checks passed')
sys.exit(1 if problems else 0)
