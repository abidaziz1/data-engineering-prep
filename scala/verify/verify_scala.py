#!/usr/bin/env python3
"""Check the code and the recorded output of the Scala course.

 1. The files of the recording are the files of scala/verify/project, and every code screen that names such a file shows it exactly.
 2. Every Scala snippet of the lessons (code screens, bug hunts and their fixes, the solution of the coding round) goes through the parser of the Scala compiler (it stops after the parser:
    that checks the syntax and nothing else), and the project files are compiled by the recorder.
 3. The solution of the coding round is compiled and run against cases that Python worked out with exact decimals.
 4. Thirteen of the fourteen bug hunts are run next to their fixes: ten in small Scala programs and three on a local Spark 4.0.1 session. The bad snippet must show the failure that the lesson claims,
    and the fix must not. The fourteenth (a build.sbt) is checked as text, because sbt did not run.
 5. The lab data: check_widgets.js recomputes the rules from the rules of the data, and changes to the recording must make it fail.
 6. The lint of the course (dev/lint-content.js).
 7. With --recapture the whole recording is made again on this machine (about 1 minute) and compared with js/real.js. Nothing is timed. The only allowance is the date.
 8. With --browser the four labs are driven in Chromium (e2e_labs.js), and changes to the widget code must make that test fail.

What this cannot show: how Scala 3, sbt, a cluster or Spark Structured Streaming behave. Those screens carry the "From documentation" tag.

Run:   scala-env/bin/python scala/verify/verify_scala.py [--recapture] [--browser] [--verbose]
Needs: see scala/verify/requirements.txt (pyspark 4.0.1 for the Scala 2.13 compiler and Spark, a JDK 21, Maven and the network once for --recapture). A check whose tool is missing says so and is skipped.
"""
import argparse
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
from decimal import Decimal

sys.dont_write_bytecode = True
HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
PROJECT = HERE / 'project'
sys.path.insert(0, str(HERE))

ap = argparse.ArgumentParser()
ap.add_argument('--recapture', action='store_true', help='record everything again on this machine and compare with js/real.js (about 1 minute)')
ap.add_argument('--browser', action='store_true', help='also drive the four labs in Chromium (scala/verify/e2e_labs.js) and its controls')
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
    return subprocess.run([str(c) for c in cmd], capture_output=True, text=True, **kw)


def clean(s):
    return '\n'.join(l for l in s.split('\n') if not l.startswith('Picked up JAVA_TOOL_OPTIONS')).strip()


def load_real(path):
    txt = pathlib.Path(path).read_text()
    return json.loads(txt[txt.index('LAB.real = ') + len('LAB.real = '):].rstrip().rstrip(';'))


REAL = load_real(ROOT / 'scala' / 'js' / 'real.js')
r = runp(['node', HERE / 'dump_scala.js'], cwd=ROOT)
if r.returncode:
    print('PROBLEM: the course does not load: ' + (r.stdout + r.stderr)[-600:])
    sys.exit(1)
DUMP = json.loads(r.stdout)
CODE = {c['id']: c for c in DUMP['code']}
F = REAL['files']

try:
    import scalalib
    HAVE = True
except SystemExit as e:
    HAVE = False
    skipped('everything that compiles Scala', str(e))
if HAVE:
    import scalalib

# ----------------------------------------------------------------------------------------------------------------------
# 1. The files of the recording and the code screens
# ----------------------------------------------------------------------------------------------------------------------
disk = {str(p.relative_to(PROJECT)): p.read_text() for p in sorted(PROJECT.rglob('*')) if p.is_file() and 'out' not in p.parts}
expect(set(disk) == set(F), 'the recording holds the files of verify/project and no others: %s' % sorted(set(disk) ^ set(F)), 'files')
for k in sorted(set(disk) & set(F)):
    expect(disk[k] == F[k], 'the recorded file %s is the file on disk' % k, 'files')
for sc in DUMP['code']:
    if sc['type'] != 'code' or not sc['file']:
        continue
    if sc['file'] in F:
        expect(sc['code'].rstrip('\n') == F[sc['file']].rstrip('\n'), 'code screen %s shows %s exactly as the file that ran' % (sc['id'], sc['file']), 'code screens')
shown = {sc['file'] for sc in DUMP['code'] if sc['type'] == 'code'}
expect({'Orders.scala', 'Partial.scala', 'Collections.scala', 'Errors.scala', 'SparkApp.scala', 'Totals.scala'} <= shown, 'the lessons show the main files of the project', 'code screens')
sol = CODE['m6-ch:sol']['code'].rstrip('\n')
expect(sol in F['Challenge.scala'], 'the solution of the coding round is a piece of Challenge.scala, the file that ran', 'code screens')
for c in DUMP['commands']:
    for f in re.findall(r'\b([A-Z]\w*\.scala)\b', c['cmd']):
        expect(f in F, 'the command of %s names %s, which is a file of the project' % (c['id'], f), 'commands')

if not HAVE:
    print('\nchecked: ' + ', '.join('%d %s' % (v, k) for k, v in sorted(counts.items())))
    for sk in skips:
        print('skipped: ' + sk)
    sys.exit(1 if problems else 0)

WORK = scalalib.WORK
RUNS = [0]


def fresh():
    RUNS[0] += 1
    d = WORK / ('v%d' % RUNS[0])
    d.mkdir()
    return d


def compile_run(files, main=None, spark=False, name_out='out', run_args=(), cp_extra=None):
    """Compile the given {name: source} with the Scala 2.13 compiler, and run `main` on the JVM (or with spark-submit). Returns (compile_rc, compile_output, run_rc, run_output)."""
    d = fresh()
    paths = []
    for name, text in files.items():
        (d / name).write_text(text)
        paths.append(d / name)
    rc, out = scalalib.scalac(paths, d / name_out, cwd=d, spark=spark, cp=cp_extra)
    if rc or not main:
        return rc, out, None, None
    if spark:
        jar = d / 'app.jar'
        scalalib.run(['jar', '--create', '--file', jar, '-C', d / name_out, '.'], cwd=d)
        rc2, out2 = scalalib.run([scalalib.SPARK_HOME / 'bin' / 'spark-submit', '--master', 'local[2]', '--class', main, '--conf', 'spark.ui.enabled=false', jar] + list(run_args), cwd=d,
                                 env={'SPARK_HOME': str(scalalib.SPARK_HOME)}, timeout=600, stdout_only=True)
    else:
        rc2, out2 = scalalib.run(['java', '-cp', '%s:%s' % (d / name_out, scalalib.SCALA_LIB), main] + list(run_args), cwd=d)
    return rc, out, rc2, clean(out2)


# ----------------------------------------------------------------------------------------------------------------------
# 2. Parsing: every snippet through the parser of the Scala compiler
# ----------------------------------------------------------------------------------------------------------------------
WRAPS = [lambda s: s, lambda s: 'object W {\n' + s + '\n}\n', lambda s: 'object W { def f(): Unit = {\n' + s + '\n} }\n']


def parse_scala(snippets):
    d = fresh()
    names = []
    for name, text in snippets.items():
        for i, w in enumerate(WRAPS):
            (d / ('%s_v%d.scala' % (name, i))).write_text(w(text))
            names.append('%s_v%d.scala' % (name, i))
    cmd = ['java', '-Xss4m', '-cp', scalalib.COMPILER_CP, 'scala.tools.nsc.Main', '-usejavacp', '-Ystop-after:parser', '-d', str(d)] + names
    r_ = runp(cmd, cwd=d, timeout=600)
    failing = set(re.findall(r'^(\S+_v\d\.scala):\d+: error', r_.stdout + r_.stderr, re.M))
    return {name: any('%s_v%d.scala' % (name, i) not in failing for i in range(3)) for name in snippets}


scala_snips = {c['id'].replace(':', '_').replace('-', '_'): c['code'] for c in DUMP['code'] if c['lang'] == 'scala'}
for k, text in F.items():
    if k.endswith('.scala'):
        scala_snips['file_' + re.sub(r'\W', '_', k)] = text
res = parse_scala(scala_snips)
for name in scala_snips:
    expect(res.get(name), 'the Scala snippet %s parses' % name, 'scala snippets parsed')
broken = parse_scala({'a': 'val x: Int = ', 'b': 'object A { def f( = 1 }', 'c': 'case class (x: Int)', 'd': 'val s = "unterminated'})
for k in 'abcd':
    control('a Scala snippet with a syntax error (%s) is refused by the parser' % k, lambda k=k: not broken[k])

# ----------------------------------------------------------------------------------------------------------------------
# 3. The coding round: the solution, as shown, against cases worked out with exact decimals
# ----------------------------------------------------------------------------------------------------------------------
rows = [(2, '12.50'), (1, '5.00'), (2, '3.25'), (1, '0.99'), (3, '100'), (2, '7.10'), (7, '0.10'), (7, '0.20'), (7, '1234567.89'), (4, '0'), (9, '12345678901234567.89')]
by = {}
for s_, a_ in rows:
    by[s_] = by.get(s_, 0) + int(Decimal(a_) * 100)
prog = ('import scala.collection.immutable.SortedMap\nobject Round {\n' + sol + '\n  def main(args: Array[String]): Unit = {\n    val h = "order_id,store_id,status,amount"\n'
        '    val rows = List(' + ', '.join('"O-%d,%d,PLACED,%s"' % (i, s_, a_) for i, (s_, a_) in enumerate(rows)) + ')\n'
        '    println(centsByStore((h :: rows).iterator))\n    println(centsByStore(Iterator(h)))\n'
        '    for (b <- List("1.234", "0.001", "12.505", "abc", "")) println(centsByStore(Iterator(h, "O-9,1,PLACED," + b)))\n'
        '    println(centsByStore(Iterator(h, "O-9,1,PLACED")))\n'
        '    println((1 to 100000).map(_ => parseCents("0.10").toOption.get).sum)\n  }\n}\n')
want = ('Right(TreeMap(' + ', '.join('%d -> %d' % (k, by[k]) for k in sorted(by)) + '))\nRight(TreeMap())\n'
        + '\n'.join("Left(List(line 2: %s))" % m for m in ["more than two decimals: '1.234'", "more than two decimals: '0.001'", "more than two decimals: '12.505'", "not a number: 'abc'", "not a number: ''"])
        + '\nLeft(List(line 2: expected 4 fields but got 3))\n1000000')
rc, o, rc2, out = compile_run({'Round.scala': prog}, 'Round')
expect(rc == 0 and rc2 == 0 and out == want, 'the solution of the coding round gives the cents that Python worked out, names each bad line, refuses a third decimal, and adds 100,000 times 0.10 to exactly 1,000,000 cents: %s %s' % (o[-200:], (out or '')[-300:]), 'coding round')
for label, old, new in [('a solution that rounds a third decimal instead of refusing it', 'if (d.scale > 2) Left(s"more than two decimals: \'$amount\'") else Right((d * 100).toLongExact)', 'Right((d * 100).setScale(0, BigDecimal.RoundingMode.HALF_UP).toLong)'),
                        ('a solution that parses through a double', 'BigDecimal(amount)', 'BigDecimal(amount.toDouble)')]:
    wrong = prog.replace(old, new)
    expect(wrong != prog, 'the control "%s" changes the program' % label, 'coding round')
    rc_w, o_w, rc2_w, out_w = compile_run({'Round.scala': wrong}, 'Round')
    control(label + ' is caught by the cases', lambda out_w=out_w: out_w != want)

# ----------------------------------------------------------------------------------------------------------------------
# 4. The bug hunts, run next to their fixes
# ----------------------------------------------------------------------------------------------------------------------
BUG = {b['id']: b for b in DUMP['bugs']}


def indent(s, n=4):
    return '\n'.join((' ' * n + l) if l else l for l in s.strip('\n').split('\n'))


def stmts(snippet, wrap=None):
    body = snippet if wrap is None else wrap.replace('%S%', indent(snippet))
    return 'object H {\n  def main(args: Array[String]): Unit = {\n%s\n  }\n}\n' % (indent(snippet) if wrap is None else body)


def hunt(bid, make, main='H', bad_ok=None, fix_ok=None, files=None, spark=False, cp_extra=None):
    b = BUG[bid]
    res_ = []
    for which, snippet in (('bad', b['code']), ('fix', b['fix'])):
        src = {'H.scala': make(snippet)}
        src.update(files or {})
        res_.append(compile_run(src, main, spark=spark, cp_extra=cp_extra))
    (rcb, ob, rrb, outb), (rcf, of, rrf, outf) = res_
    expect(bad_ok(rcb, ob, rrb, outb), 'bug hunt %s: the bad snippet shows the failure of the lesson: %s | %s' % (bid, ob[-150:], (outb or '')[-150:]), 'bug hunts run')
    expect(fix_ok(rcf, of, rrf, outf), 'bug hunt %s: the fix works: %s | %s' % (bid, of[-150:], (outf or '')[-150:]), 'bug hunts run')
    return res_


# m1-bug: a build.sbt that names a Scala version by hand. Only the text can be checked here: sbt did not run.
b1 = BUG['m1-bug']
expect('spark-sql_2.12' in b1['code'] and '%%' not in b1['code'] and '2.13' in b1['code'] and '%%' in b1['fix'] and '_2.12' not in b1['fix'], 'bug hunt m1-bug: the bad build names _2.12 by hand against scalaVersion 2.13, and the fix uses %% (text only: sbt did not run)', 'bug hunts run')
# m1-bug2: a type mismatch
hunt('m1-bug2', lambda s: s, main='BadTypes', bad_ok=lambda rc, o, rr, out: rc != 0 and 'type mismatch' in o and 'found   : String("12")' in o, fix_ok=lambda rc, o, rr, out: rc == 0 and out == '12')
# m2: a match that leaves a case out, == against eq, a var in a hash key
ORD = {'Orders.scala': F['Orders.scala']}
hunt('m2-bug', lambda s: 'object H {\n%s\n  def main(args: Array[String]): Unit = {\n    println(fee(Placed))\n    try println(fee(Refunded)) catch { case e: MatchError => println("MatchError: " + e.getMessage) }\n  }\n}\n' % indent(s, 2),
     files=ORD, bad_ok=lambda rc, o, rr, out: rc == 0 and 'match may not be exhaustive' in o and 'Refunded' in o and out == '0\nMatchError: Refunded (of class Refunded$)',
     fix_ok=lambda rc, o, rr, out: rc == 0 and 'warning' not in o and out == '0\n0')
hunt('m2-bug2', stmts, files=ORD, bad_ok=lambda rc, o, rr, out: rc == 0 and out == 'false', fix_ok=lambda rc, o, rr, out: rc == 0 and out == 'true')
hunt('m2-bug3', stmts, bad_ok=lambda rc, o, rr, out: rc == 0 and out == 'false', fix_ok=lambda rc, o, rr, out: rc == 0 and out == 'true')
# m3: toMap on a repeated key, apply on a missing key, an iterator used twice
hunt('m3-bug', stmts, bad_ok=lambda rc, o, rr, out: rc == 0 and out == '5', fix_ok=lambda rc, o, rr, out: rc == 0 and out == '7')
hunt('m3-bug2', lambda s: stmts('try {\n' + indent(s) + '\n} catch { case e: NoSuchElementException => println("threw: " + e.getMessage) }'), bad_ok=lambda rc, o, rr, out: rc == 0 and out == 'threw: key not found: TEA', fix_ok=lambda rc, o, rr, out: rc == 0 and out == '0')
hunt('m3-bug3', stmts, bad_ok=lambda rc, o, rr, out: rc == 0 and out == '3 lines', fix_ok=lambda rc, o, rr, out: rc == 0 and out == '3 lines\na\nb\nc')
# m4: Option.get, a Try that drops a bad line, a for over Either that stops at the first Left
hunt('m4-bug', lambda s: stmts('try {\n' + indent(s) + '\n} catch { case e: NoSuchElementException => println("threw: " + e.getMessage) }'), bad_ok=lambda rc, o, rr, out: rc == 0 and out == 'threw: None.get', fix_ok=lambda rc, o, rr, out: rc == 0 and out == 'unknown')
hunt('m4-bug2', stmts, bad_ok=lambda rc, o, rr, out: rc == 0 and out == '12', fix_ok=lambda rc, o, rr, out: rc == 0 and out == '12 from 2 lines, rejected: List(x)')
hunt('m4-bug3', stmts, bad_ok=lambda rc, o, rr, out: rc == 0 and out == "Left(not a number: 'x')", fix_ok=lambda rc, o, rr, out: rc == 0 and out == "List(not a number: 'x', not a number: 'y')")

# m5: three hunts on a local Spark session
SPARK_T = ('import org.apache.spark.sql.{Dataset, SparkSession}\nimport org.apache.spark.sql.functions.col\ncase class Order(orderId: String, storeId: Int, status: String, cents: Long)\nclass Settings(val minCents: Long)\n'
           'object H {\n  def main(args: Array[String]): Unit = {\n    val spark = SparkSession.builder().master("local[2]").config("spark.ui.enabled", "false").config("spark.sql.shuffle.partitions", "2").getOrCreate()\n'
           '    spark.sparkContext.setLogLevel("ERROR")\n    import spark.implicits._\n    val orders: Dataset[Order] = spark.range(1, 1001).map { i => Order(s"O-$i", (1 + i % 12).toInt, if (i % 10 == 0) "REFUNDED" else "PLACED", 500 + i) }\n'
           '    try {\n%S%\n    } catch { case e: Exception => println("failed: " + e.getMessage.split("\\n").head) }\n    spark.stop()\n  }\n}\n')


def spark_make(s):
    return SPARK_T.replace('%S%', indent(s, 6))


hunt('m5-bug', spark_make, spark=True, bad_ok=lambda rc, o, rr, out: rc == 0 and out == 'failed: Task not serializable', fix_ok=lambda rc, o, rr, out: rc == 0 and out == '901')
hunt('m5-bug2', spark_make, spark=True, bad_ok=lambda rc, o, rr, out: rc == 0 and out.startswith('failed: [UNRESOLVED_COLUMN.WITH_SUGGESTION]'), fix_ok=lambda rc, o, rr, out: rc == 0 and out == '900')
total_cents = sum(500 + i for i in range(1, 1001))
hunt('m5-bug3', spark_make, spark=True, bad_ok=lambda rc, o, rr, out: rc == 0 and out == str(total_cents), fix_ok=lambda rc, o, rr, out: rc == 0 and out == str(total_cents))
# a control for the harness: the fix of one hunt must fail the check of the bad one (the fix is run through the check of the bad snippet)
res_fix = compile_run({'H.scala': stmts(BUG['m3-bug']['fix'])}, 'H')
control('the check for the bad snippet of m3-bug refuses the fix', lambda: not (res_fix[0] == 0 and res_fix[3] == '5'))

# ----------------------------------------------------------------------------------------------------------------------
# 5. The lab data, and controls for its checker
# ----------------------------------------------------------------------------------------------------------------------
def widget_checker(real=None):
    env = None
    if real is not None:
        p = pathlib.Path(tempfile.mkdtemp(prefix='scala-control-')) / 'real.js'
        p.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(real) + ';\n')
        env = dict(os.environ, SCALA_REAL_JS=str(p))
    return runp(['node', HERE / 'check_widgets.js'], cwd=ROOT, env=env)


r = widget_checker()
m = re.search(r'(\d+) checks passed', r.stdout)
expect(r.returncode == 0 and m, 'check_widgets.js passes: ' + r.stdout.strip()[-200:], 'lab checks')
tick('lab data checks', int(m.group(1)) if m else 0)


def mut(fn):
    d = json.loads(json.dumps(REAL))
    fn(d)
    return d


def settext(key, old, new):
    return lambda d: d['text'].__setitem__(key, d['text'][key].replace(old, new))


MUTATIONS = [
    ('a parser that accepts a third decimal', settext('err.errors', "Left(more than two decimals: '4.505')", 'Right(Order(O-3,2,451))')),
    ('a summary of 1951 cents', lambda d: d['counts']['err'].__setitem__('cents', 1951)),
    ('a strict list that took 7 steps', lambda d: d['counts']['coll'].__setitem__('strict_steps', 7)),
    ('a view that skipped a map', lambda d: d['counts']['coll'].__setitem__('lazy_trace', 'map 1, filter 10, filter 20')),
    ('a toMap that added the duplicates', lambda d: d['counts']['coll'].__setitem__('duplicate_key_line', 'Map(MUG -> 1, BEANS-250 -> 7, FILTER -> 5)')),
    ('a foldLeft total of 15251', settext('coll.collections', '\n15250\n', '\n15251\n')),
    ('a Dataset with 901 placed orders', lambda d: d['counts']['spark'].__setitem__('placed', 901)),
    ('a copy of the number that counted 900', lambda d: d['counts']['spark'].__setitem__('fixed_count', 900)),
    ('a cause that names Order', lambda d: d['counts']['spark'].__setitem__('cause', 'java.io.NotSerializableException: Order')),
    ('a mixed build that exits with 0', lambda d: d['counts']['build.binary'].__setitem__('mixed_exit', 0)),
    ('a 2.13 build that prints a Map and not a HashMap', lambda d: d['counts']['build.binary'].__setitem__('both213_output', 'Map(s2 -> 7, s1 -> 8)')),
    ('a greeting for another Scala version', lambda d: d['counts']['build.hello'].__setitem__('output', 'Hello, Brewline from Scala 2.12.20 on Java 21')),
    ('a coding round that sums store 2 wrongly', lambda d: d['counts']['challenge'].__setitem__('good_output', 'Right(TreeMap(1 -> 599, 2 -> 2286, 3 -> 10000))')),
    ('a coding round that numbers the bad lines from 0', lambda d: d['counts']['challenge'].__setitem__('bad_output', "Left(List(line 7: bad store id: 'x', line 8: more than two decimals: '12.505'))")),
    ('a MatchError for another status', lambda d: d['counts']['lang'].__setitem__('match_error', 'Shipped (of class Shipped$)')),
    ('a typed typo that compiled', lambda d: d['counts']['spark.errors'].__setitem__('typed_exit', 0)),
]
for label, fn in MUTATIONS:
    data = mut(fn)
    control(label + ': the widget checker fails', lambda data=data: widget_checker(data).returncode != 0)

# ----------------------------------------------------------------------------------------------------------------------
# 6. The lint
# ----------------------------------------------------------------------------------------------------------------------
r = runp(['node', ROOT / 'dev' / 'lint-content.js', 'scala'], cwd=ROOT)
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


SKIP = {'meta:recorded_on': 'the date'}


def differing(a, b):
    fa, fb = flatten(a), flatten(b)
    out = []

    def walk(x, y, p, key):
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
    skipped('recapture', 'run with --recapture (about 1 minute, needs Maven and the network once)')
elif not shutil.which('mvn'):
    skipped('recapture', 'mvn is needed for the Scala 2.12 compiler')
else:
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='scala-recapture-')) / 'real.js'
    r = runp([sys.executable, HERE / 'capture_scala.py', '--out', tmp])
    if r.returncode or not tmp.exists():
        bad('capture_scala.py failed: ' + (r.stdout + r.stderr)[-800:])
    else:
        again = load_real(tmp)
        diff = differing(REAL, again)
        tick('recaptured items', len(flatten(again)))
        for k in diff:
            bad('the recapture differs from js/real.js in %s' % k)
        print('recapture: %d items, %d differ' % (len(flatten(again)), len(diff)))
        ch = mut(lambda d: d['counts']['spark'].__setitem__('orders', 1001))
        control('a recording with one number changed, given to the comparison', lambda: differing(REAL, ch) == ['counts:spark.orders'])
        ch = mut(settext('err.errors', 'None.get', 'None.gett'))
        control('a recording with one word changed in a printed text, given to the comparison', lambda: differing(REAL, ch) == ['text:err.errors'])
        ch = mut(lambda d: d['files'].__setitem__('Hello.scala', d['files']['Hello.scala'] + ' '))
        control('a recording with one changed file, given to the comparison', lambda: differing(REAL, ch) == ['files:Hello.scala'])
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
    W = 'scala/js/widgets.js'
    BROWSER = [
        ('the versions lab colours the exit code of a failed build as good', W, "[c.exit, 'exit code', c.exit ? 'bad' : 'good']", "[c.exit, 'exit code', 'good']"),
        ('the match lab does not colour the MatchError', W, "return [x[0], x[1], q === 0 && c.kind === 'bad' ? 'bad' : '']; }));", "return [x[0], x[1], '']; }));"),
        ('the errors lab swaps the colours of Right and Left', W, "[right ? 'Right' : 'Left', 'what parse returned', right ? 'good' : 'warn']", "[right ? 'Right' : 'Left', 'what parse returned', right ? 'warn' : 'good']"),
        ('the errors lab opens on the first line', W, "A.local.el || (A.local.el = { k: 1 })", "A.local.el || (A.local.el = { k: 0 })"),
        ('the Spark lab shows the placed orders as the count after the fix', W, "[n(K.fixed_count), 'orders with 600 cents or more']", "[n(K.placed), 'orders with 600 cents or more']"),
        ('the Spark lab opens on another case', W, "A.local.sk || (A.local.sk = { k: 2 })", "A.local.sk || (A.local.sk = { k: 3 })"),
    ]
    for label, rel, old, new in BROWSER:
        copy = pathlib.Path(tempfile.mkdtemp(prefix='scala-mutation-'))
        for part in ('shared', 'scala'):
            shutil.copytree(ROOT / part, copy / part, ignore=shutil.ignore_patterns('__pycache__', '.cache', 'node_modules', '.git', 'out'))
        target = copy / rel
        src = target.read_text()
        if src.count(old) != 1:
            bad('control cannot be set up: "%s" is not in %s exactly once (%d)' % (old[:70], rel, src.count(old)))
            shutil.rmtree(copy, ignore_errors=True)
            continue
        target.write_text(src.replace(old, new))
        r2, _ = labs_e2e(copy / 'scala' / 'verify' / 'e2e_labs.js')
        control('the lab test fails when ' + label, lambda r2=r2: r2.returncode != 0)
        shutil.rmtree(copy, ignore_errors=True)

scalalib.cleanup()
print()
print('checked: ' + ', '.join('%d %s' % (v, k) for k, v in sorted(counts.items())))
for sk in skips:
    print('skipped: ' + sk)
if problems:
    print('%d PROBLEM(S)' % len(problems))
    sys.exit(1)
print('verify_scala: all checks passed')
