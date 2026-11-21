#!/usr/bin/env python3
"""Check the code and the recorded output of the Java course. Standard library only.

 1. The files of the recording are the files of java/verify/project, and every code screen that names such a file shows it exactly.
 2. Every Java snippet of the lessons (code screens, bug hunts and their fixes, the solution of the coding round) goes through the parser of javac, and every XML snippet through an XML
    parser. That checks the syntax and nothing else.
 3. The solution of the coding round is compiled and run against cases that Python worked out with exact decimals.
 4. Thirteen bug hunts are compiled and run, each snippet next to its fix, in a small harness: the bad one must show the failure that the lesson claims and the fix must not.
    One of them (the shared SimpleDateFormat) is a race, and it is reported as not reproduced when this machine does not show it.
 5. The lab data: check_widgets.js recomputes the rules from the rules of the data, and changes to the recording must make it fail.
 6. The lint of the course (dev/lint-content.js).
 7. With --recapture the whole recording is made again on this machine (about 1 minute with the Maven cache warm) and compared with js/real.js. Nothing is timed. The allowances are the date, the number of
    CPUs, and the verdicts of the race (whether a plain counter lost an update in a run of three is luck, but it must lose one at least once).
 8. With --browser the five labs are driven in Chromium (e2e_labs.js), and changes to the widget code must make that test fail.

What this cannot show: how Spark, Kafka, a database server, a connection pool, another JDK or another garbage collector behave. Those screens carry the "From documentation" tag.

Run:   python3 java/verify/verify_java.py [--recapture] [--browser] [--verbose]
Needs: JDK 21 or later, Maven 3.9 (for --recapture), Node 20 or later, and the H2 jar in ~/.m2 (the recorder downloads it). A check whose tool is missing says so and is skipped.
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
import xml.etree.ElementTree as ET
from decimal import Decimal

sys.dont_write_bytecode = True
HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
PROJECT = HERE / 'project'

ap = argparse.ArgumentParser()
ap.add_argument('--recapture', action='store_true', help='record everything again on this machine and compare with js/real.js (about 1 minute with the Maven cache warm)')
ap.add_argument('--browser', action='store_true', help='also drive the five labs in Chromium (java/verify/e2e_labs.js) and its controls')
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


have_java = bool(shutil.which('java')) and bool(shutil.which('javac'))
have_node = bool(shutil.which('node'))
if not have_node:
    print('PROBLEM: node is needed to load the course')
    sys.exit(1)
REAL = load_real(ROOT / 'java' / 'js' / 'real.js')
r = runp(['node', HERE / 'dump_java.js'], cwd=ROOT)
if r.returncode:
    print('PROBLEM: the course does not load: ' + (r.stderr or r.stdout)[-600:])
    sys.exit(1)
DUMP = json.loads(r.stdout)
CODE = {c['id']: c for c in DUMP['code']}
F = REAL['files']
if not have_java:
    skipped('everything that runs Java', 'java and javac are not on the path')

# ----------------------------------------------------------------------------------------------------------------------
# 1. The files of the recording and the code screens
# ----------------------------------------------------------------------------------------------------------------------
disk = {str(p.relative_to(PROJECT)): p.read_text() for p in sorted(PROJECT.rglob('*')) if p.is_file() and 'target' not in p.parts}
expect(set(disk) == set(F), 'the recording holds the files of verify/project and no others: %s' % sorted(set(disk) ^ set(F)), 'files')
for k in sorted(set(disk) & set(F)):
    expect(disk[k] == F[k], 'the recorded file %s is the file on disk' % k, 'files')
by_base = {}
for k in F:
    by_base.setdefault(pathlib.PurePosixPath(k).name, []).append(F[k].rstrip('\n'))
for sc in DUMP['code']:
    if sc['type'] != 'code' or not sc['file']:
        continue
    cands = by_base.get(sc['file'])
    if not cands:
        continue
    expect(sc['code'].rstrip('\n') in cands, 'code screen %s shows %s exactly as the file that ran' % (sc['id'], sc['file']), 'code screens')
shown = {sc['file'] for sc in DUMP['code'] if sc['type'] == 'code'}
expect({'Orders.java', 'Streams.java', 'Numbers.java', 'Times.java', 'Memory.java', 'Jdbc.java', 'Race.java', 'Ser.java', 'Loader.java', 'LoaderTest.java', 'pom.xml'} <= shown, 'the lessons show the main files of the project', 'code screens')
sol = CODE['m7-ch:sol']['code'].rstrip('\n')
expect(sol in F['Challenge.java'], 'the solution of the coding round is a piece of Challenge.java, the file that ran', 'code screens')
for c in DUMP['commands']:
    for f in re.findall(r'\b([A-Z]\w*\.java)\b', c['cmd']):
        expect(f in F, 'the command of %s names %s, which is a file of the project' % (c['id'], f), 'commands')

# ----------------------------------------------------------------------------------------------------------------------
# 2. Parsing
# ----------------------------------------------------------------------------------------------------------------------
WRAPS = [lambda s: s, lambda s: 'class W {\n' + s + '\n}\n', lambda s: 'class W { void f() throws Exception {\n' + s + '\n} }\n']


def parse_java(snippets):
    """snippets: {name: text}. Returns {name: True/False}. A snippet is accepted when it is a file, a list of members or a list of statements."""
    out = {}
    if not have_java:
        return out
    d = pathlib.Path(tempfile.mkdtemp(prefix='java-parse-'))
    try:
        names = []
        for name, text in snippets.items():
            for i, w in enumerate(WRAPS):
                (d / ('%s.v%d.java' % (name, i))).write_text(w(text))
                names.append('%s.v%d.java' % (name, i))
        r_ = runp(['java', HERE / 'ParseCheck.java'] + names, cwd=d)
        res = {}
        for line in clean(r_.stdout).split('\n'):
            m = re.match(r'(\S+)\.v(\d)\.java (OK|\d+)', line)
            if m:
                res.setdefault(m.group(1), []).append(m.group(3) == 'OK')
        for name in snippets:
            out[name] = any(res.get(name, [False]))
    finally:
        shutil.rmtree(d, ignore_errors=True)
    return out


java_snips = {c['id'].replace(':', '_'): c['code'] for c in DUMP['code'] if c['lang'] == 'java'}
for k, text in F.items():
    if k.endswith('.java'):
        java_snips['file_' + re.sub(r'\W', '_', k)] = text
if have_java:
    res = parse_java(java_snips)
    for name, text in java_snips.items():
        expect(res.get(name), 'the Java snippet %s parses' % name, 'java snippets parsed')
    control('a Java statement with a missing value', lambda: not parse_java({'broken': 'int x = ;'})['broken'])
    control('a Java class with an unclosed brace', lambda: not parse_java({'broken': 'class A { void f() { }'})['broken'])
    control('a Java snippet with a misspelt keyword', lambda: not parse_java({'broken': 'pubic static void main(String[] a) { }'})['broken'])
xml_snips = {c['id']: c['code'] for c in DUMP['code'] if c['lang'] == 'xml'}
for name, text in xml_snips.items():
    try:
        ET.fromstring('<root>' + text.replace('<project xmlns="http://maven.apache.org/POM/4.0.0">', '<project>') + '</root>')
        expect(True, '', 'xml snippets parsed')
    except ET.ParseError as e:
        bad('the XML snippet %s does not parse: %s' % (name, e))
for k, text in F.items():
    if k.endswith('pom.xml'):
        try:
            ET.fromstring(text)
            expect(True, '', 'xml snippets parsed')
        except ET.ParseError as e:
            bad('%s does not parse: %s' % (k, e))


def xml_ok(t):
    try:
        ET.fromstring('<root>' + t + '</root>')
        return True
    except ET.ParseError:
        return False


control('an XML snippet with a tag that is not closed', lambda: not xml_ok('<dependency><groupId>a</dependency>'))


def norm(x):
    return re.sub(r'\s+', '', x)


# the dependency bug hunt is the pom of the conflict project that ran
bug1 = next(b for b in DUMP['bugs'] if b['id'] == 'm1-bug')
conflict_pom = norm(re.sub(r'<!--.*?-->', '', F['maven-conflict/pom.xml'], flags=re.S))
expect(norm(bug1['code']) in conflict_pom, 'the dependencies of the first bug hunt are the dependencies of the conflict project that ran (commons-csv, then commons-io pinned to 2.4)', 'bug hunts')
expect(norm(bug1['fix']) in norm(F['maven/pom.xml']) or '<artifactId>commons-csv</artifactId>' in bug1['fix'] and 'commons-io' not in bug1['fix'], 'the fix of the first bug hunt removes the pin', 'bug hunts')
expect('2.4' in bug1['code'] and ('2.4' in F['maven-conflict/pom.xml']), 'the pin is 2.4 in both', 'bug hunts')

# ----------------------------------------------------------------------------------------------------------------------
# 3 and 4. The coding round and the bug hunts, compiled and run
# ----------------------------------------------------------------------------------------------------------------------
M2 = pathlib.Path.home() / '.m2' / 'repository'
H2 = next(iter(sorted(M2.glob('com/h2database/h2/*/h2-*.jar'))), None) if M2.exists() else None
WORK = pathlib.Path(tempfile.mkdtemp(prefix='java-verify-'))
RUNS = [0]


def run_java(source, name='Harness', opts=(), prog_args=(), cp=None, timeout=240):
    RUNS[0] += 1
    d = WORK / ('run-%d' % RUNS[0])
    d.mkdir()
    (d / (name + '.java')).write_text(source)
    cmd = ['java'] + list(opts) + (['-cp', str(cp)] if cp else []) + [name + '.java'] + [str(a) for a in prog_args]
    r_ = runp(cmd, cwd=d, timeout=timeout)
    return r_.returncode, clean(r_.stdout + ('\n' if r_.stdout.strip() and r_.stderr.strip() else '') + r_.stderr)


def exact_cents(rows):
    by = {}
    for store, amount in rows:
        by[store] = by.get(store, 0) + int(Decimal(amount) * 100)
    return by


if have_java:
    # the coding round: the solution, as shown, against cases worked out with exact decimals
    rows = [(2, '12.50'), (1, '5.00'), (2, '3.25'), (1, '0.99'), (3, '100'), (2, '7.10'), (7, '0.10'), (7, '0.20'), (7, '1234567.89'), (4, '0'), (9, '12345678901234567.89')]
    prog = ('import java.math.*; import java.util.*; import java.util.stream.*;\npublic class Round {\n' + sol + '\n    public static void main(String[] a) {\n'
            '        String h = "order_id,store_id,status,amount";\n        List<String> l = new ArrayList<>(List.of(h));\n'
            + ''.join('        l.add("O-%d,%d,PLACED,%s");\n' % (i, s, v) for i, (s, v) in enumerate(rows))
            + '        System.out.println(centsByStore(l.stream()));\n'
            '        System.out.println(centsByStore(Stream.of(h)));\n'
            '        for (String bad : new String[] {"1.234", "0.001", "12.505"}) { try { centsByStore(Stream.of(h, "O-9,1,PLACED," + bad)); System.out.println("accepted " + bad); } catch (ArithmeticException e) { System.out.println("refused " + bad); } }\n'
            '        long sum = 0; for (int i = 0; i < 100000; i++) sum += parseCents("0.10"); System.out.println(sum);\n    }\n}\n')
    rc, out = run_java(prog, 'Round')
    by = exact_cents(rows)
    want = '{' + ', '.join('%d=%d' % (k, by[k]) for k in sorted(by)) + '}\n{}\nrefused 1.234\nrefused 0.001\nrefused 12.505\n1000000'
    expect(rc == 0 and out == want, 'the solution of the coding round gives the cents that Python worked out, refuses a third decimal, and adds 100,000 times 0.10 to exactly 1,000,000 cents: %s' % out[-300:], 'coding round')
    wrong = prog.replace('RoundingMode.UNNECESSARY', 'RoundingMode.HALF_UP')
    rc2, out2 = run_java(wrong, 'Round')
    control('a solution that rounds instead of refusing is caught by the cases', lambda: out2 != want)
    wrong = prog.replace('new BigDecimal(amount)', 'BigDecimal.valueOf(Double.parseDouble(amount))')
    rc2, out2 = run_java(wrong, 'Round')
    control('a solution that parses through a double is caught by the cases', lambda: out2 != want)

    # ----- the bug hunts: one harness for the snippet and one for its fix
    BUG = {b['id']: b for b in DUMP['bugs']}
    expected_cases = 0

    def harness(bid, tpl_bad, tpl_fix=None, opts=(), prog_args=(), cp=None, timeout=240):
        b = BUG[bid]
        return (run_java(tpl_bad.replace('%S%', b['code']), opts=opts, prog_args=prog_args, cp=cp, timeout=timeout),
                run_java((tpl_fix or tpl_bad).replace('%S%', b['fix']), opts=opts, prog_args=prog_args, cp=cp, timeout=timeout))

    def hunt(bid, bad_ok, fix_ok, got):
        (rb, ob), (rf, of) = got
        expect(bad_ok(rb, ob), 'bug hunt %s: the bad snippet shows the failure of the lesson: %s' % (bid, ob[-200:]), 'bug hunts run')
        expect(fix_ok(rf, of), 'bug hunt %s: the fix works: %s' % (bid, of[-200:]), 'bug hunts run')
        return got

    # m2-bug: toMap with a duplicate key
    t = ('import java.util.*; import java.util.stream.*;\npublic class Harness {\n  record Line(String sku, int qty) {}\n  static String run(List<Line> lines) {\n    try {\n      %S%\n'
         '      return new TreeMap<>(qty).toString();\n    } catch (RuntimeException e) { return e.getClass().getSimpleName() + ": " + e.getMessage(); }\n  }\n'
         '  public static void main(String[] a) { System.out.println(run(List.of(new Line("MUG", 1), new Line("BEANS", 2), new Line("BEANS", 5)))); }\n}\n')
    g = hunt('m2-bug', lambda r_, o: o == 'IllegalStateException: Duplicate key BEANS (attempted merging values 2 and 5)', lambda r_, o: o == '{BEANS=7, MUG=1}', harness('m2-bug', t))
    control('a fix that does not merge is caught by the toMap expectation', lambda: g[0][1] != '{BEANS=7, MUG=1}')
    # m2-bug2: List.of is immutable
    t = ('import java.util.*;\npublic class Harness {\n  enum Status { PLACED }\n  record Order(String id, int store, Status status, double amount) {}\n  static String run() {\n    try {\n'
         '      Order a = new Order("O-1", 1, Status.PLACED, 1.0), b = new Order("O-2", 1, Status.PLACED, 2.0), c = new Order("O-3", 2, Status.PLACED, 3.0);\n      %S%\n'
         '      return "added, " + orders.size() + " orders";\n    } catch (UnsupportedOperationException e) { return "UnsupportedOperationException"; }\n  }\n  public static void main(String[] a) { System.out.println(run()); }\n}\n')
    hunt('m2-bug2', lambda r_, o: o == 'UnsupportedOperationException', lambda r_, o: o == 'added, 4 orders', harness('m2-bug2', t))
    # m3-bug: a double total against a BigDecimal total
    t_bad = ('import java.math.*; import java.util.*;\npublic class Harness {\n  record Line(double price, int qty) {}\n  public static void main(String[] a) {\n    List<Line> lines = List.of(new Line(0.1, 1), new Line(0.2, 1));\n    %S%\n  }\n}\n')
    t_fix = ('import java.math.*; import java.util.*;\npublic class Harness {\n  record Line(BigDecimal price, int qty) {}\n  public static void main(String[] a) {\n'
             '    List<Line> lines = List.of(new Line(new BigDecimal("0.1"), 1), new Line(new BigDecimal("0.2"), 1));\n    %S%\n  }\n}\n')
    hunt('m3-bug', lambda r_, o: o == '0.30000000000000004', lambda r_, o: o == '0.3', harness('m3-bug', t_bad, t_fix))
    # m3-bug2: new BigDecimal(double)
    t = 'import java.math.*;\npublic class Harness {\n  public static void main(String[] a) {\n    %S%\n  }\n}\n'
    hunt('m3-bug2', lambda r_, o: o == '0.1000000000000000055511151231257827021181583404541015625', lambda r_, o: o == '0.1', harness('m3-bug2', t))
    # m3-bug3: a local time that does not exist
    t_bad = ('import java.time.*;\npublic class Harness {\n  public static void main(String[] a) {\n    %S%\n    System.out.println("asked " + local + ", got " + when);\n  }\n}\n')
    t_fix = ('import java.time.*;\npublic class Harness {\n  public static void main(String[] a) {\n    %S%\n    System.out.println(shown);\n  }\n}\n')
    hunt('m3-bug3', lambda r_, o: o == 'asked 2026-03-08T02:30, got 2026-03-08T03:30-04:00[America/New_York]', lambda r_, o: o == '2026-03-08T03:30-04:00[America/New_York]', harness('m3-bug3', t_bad, t_fix))

    # m4-bug: readAllLines against a small heap
    big = WORK / 'orders.csv'
    total = 0
    with open(big, 'w') as f:
        f.write('order_id,store_id,customer_id,order_ts,status,amount\n')
        for i in range(1, 300_001):
            c = (5 + (i * 17) % 80) * 100 + (i * 5) % 100
            total += c
            f.write('O-%07d,%d,C-%03d,2026-03-%02d %02d:%02d:00,PLACED,%d.%02d\n' % (i, 1 + (i * 7) % 12, 1 + (i * 13) % 400, 1 + i % 28, i % 24, (i * 11) % 60, c // 100, c % 100))
    t = ('import java.io.*; import java.math.*; import java.nio.file.*; import java.util.*;\npublic class Harness {\n  public static void main(String[] args) throws Exception {\n    %S%\n'
         '    System.out.println(cents);\n  }\n}\n')
    hunt('m4-bug', lambda r_, o: r_ != 0 and 'OutOfMemoryError: Java heap space' in o, lambda r_, o: r_ == 0 and o == str(total), harness('m4-bug', t, opts=['-Xmx16m'], prog_args=[big]))
    big.unlink()
    # m4-bug2: Files.lines keeps the file open until the stream is closed (counted in /proc/self/fd)
    if pathlib.Path('/proc/self/fd').is_dir():
        t = ('import java.io.*; import java.nio.file.*; import java.util.*; import java.util.stream.*;\npublic class Harness {\n'
             '  static long open(List<Path> files) throws IOException {\n    Set<String> names = files.stream().map(p -> p.toAbsolutePath().toString()).collect(Collectors.toSet());\n    long n = 0;\n'
             '    try (var s = Files.list(Path.of("/proc/self/fd"))) { for (Path f : (Iterable<Path>) s::iterator) { try { if (names.contains(Files.readSymbolicLink(f).toString())) n++; } catch (IOException e) { } } }\n    return n;\n  }\n'
             '  public static void main(String[] a) throws Exception {\n    List<Path> files = new ArrayList<>();\n    for (int i = 0; i < 20; i++) { Path p = Files.createTempFile("f", ".txt"); Files.writeString(p, "a\\nb\\n"); files.add(p); }\n'
             '    %S%\n    System.out.println("total " + total + ", still open " + open(files));\n    for (Path p : files) Files.delete(p);\n  }\n}\n')
        hunt('m4-bug2', lambda r_, o: o == 'total 40, still open 20', lambda r_, o: o == 'total 40, still open 0', harness('m4-bug2', t))
    else:
        skipped('bug hunt m4-bug2', '/proc/self/fd is not there')

    if H2 is None:
        skipped('the JDBC bug hunts', 'the H2 jar is not in ~/.m2 (the recorder downloads it)')
    else:
        # m5-bug: SQL injection
        t = ('import java.sql.*;\npublic class Harness {\n  static class Req { String getParameter(String k) { return "x\' OR \'1\'=\'1"; } }\n  static Connection c;\n  static Req request = new Req();\n  static long run() throws Exception {\n    %S%\n  }\n'
             '  public static void main(String[] a) throws Exception {\n    c = DriverManager.getConnection("jdbc:h2:mem:t");\n    c.createStatement().execute("CREATE TABLE orders (order_id VARCHAR(20) PRIMARY KEY, status VARCHAR(10))");\n'
             '    for (int i = 1; i <= 1000; i++) c.createStatement().execute("INSERT INTO orders VALUES (\'O-" + i + "\', \'" + (i % 10 == 0 ? "REFUNDED" : "PLACED") + "\')");\n    System.out.println(run());\n  }\n}\n')
        hunt('m5-bug', lambda r_, o: o == '1000', lambda r_, o: o == '0', harness('m5-bug', t, cp=H2))
        # m5-bug2: a row at a time and a batch load the same rows
        t = ('import java.sql.*; import java.util.*;\npublic class Harness {\n  record Order(String id, int store, long cents) {}\n  public static void main(String[] a) throws Exception {\n'
             '    List<Order> orders = new ArrayList<>();\n    for (int i = 1; i <= 1000; i++) orders.add(new Order("O-" + i, 1 + i % 12, 500 + i));\n    try (Connection c = DriverManager.getConnection("jdbc:h2:mem:t2")) {\n'
             '      c.createStatement().execute("CREATE TABLE orders (id VARCHAR(20) PRIMARY KEY, store INT, cents BIGINT)");\n      %S%\n'
             '      try (ResultSet rs = c.createStatement().executeQuery("SELECT count(*), sum(cents) FROM orders")) { rs.next(); System.out.println(rs.getLong(1) + " rows, " + rs.getLong(2) + " cents"); }\n    }\n  }\n}\n')
        want_rows = '1000 rows, %d cents' % sum(500 + i for i in range(1, 1001))
        hunt('m5-bug2', lambda r_, o: o == want_rows, lambda r_, o: o == want_rows, harness('m5-bug2', t, cp=H2))
        # m5-bug3: with autocommit on, a failed second statement leaves the first one in place
        t = ('import java.sql.*;\npublic class Harness {\n  public static void main(String[] a) throws Exception {\n    try (Connection c = DriverManager.getConnection("jdbc:h2:mem:t3")) {\n'
             '      c.createStatement().execute("CREATE TABLE acct (id INT PRIMARY KEY, bal INT)");\n      c.createStatement().execute("INSERT INTO acct VALUES (1, 100), (2, 0)");\n'
             '      PreparedStatement debit = c.prepareStatement("UPDATE acct SET bal = bal - 50 WHERE id = 1");\n      PreparedStatement credit = c.prepareStatement("INSERT INTO acct VALUES (2, 50)");\n'
             '      try {\n        %S%\n      } catch (SQLException e) { System.out.println("failed " + e.getSQLState()); }\n'
             '      try (ResultSet rs = c.createStatement().executeQuery("SELECT bal FROM acct WHERE id = 1")) { rs.next(); System.out.println("balance " + rs.getInt(1)); }\n    }\n  }\n}\n')
        hunt('m5-bug3', lambda r_, o: o == 'failed 23505\nbalance 50', lambda r_, o: o == 'failed 23505\nbalance 100', harness('m5-bug3', t, cp=H2))
        # m6-bug2: a record that holds a connection cannot be serialized
        t_bad = ('import java.io.*; import java.sql.*;\npublic class Harness {\n  %S%\n  public static void main(String[] a) throws Exception {\n    try (Connection c = DriverManager.getConnection("jdbc:h2:mem:s");\n'
                 '         ObjectOutputStream out = new ObjectOutputStream(new ByteArrayOutputStream())) {\n      out.writeObject(new Task("load", c));\n      System.out.println("serialized");\n'
                 '    } catch (NotSerializableException e) { System.out.println("failed: " + e.getClass().getSimpleName()); }\n  }\n}\n')
        t_fix = ('import java.io.*; import java.sql.*;\npublic class Harness {\n  %S%\n  public static void main(String[] a) throws Exception {\n    ByteArrayOutputStream bytes = new ByteArrayOutputStream();\n'
                 '    try (ObjectOutputStream out = new ObjectOutputStream(bytes)) { out.writeObject(new Task("load", "jdbc:h2:mem:s")); }\n'
                 '    Task back = (Task) new ObjectInputStream(new ByteArrayInputStream(bytes.toByteArray())).readObject();\n    try (Connection c = back.open()) { System.out.println("serialized, and opened its own connection: " + !c.isClosed()); }\n  }\n}\n')
        hunt('m6-bug2', lambda r_, o: o == 'failed: NotSerializableException', lambda r_, o: o == 'serialized, and opened its own connection: true', harness('m6-bug2', t_bad, t_fix, cp=H2))

    # m6-bug: a parallel stream that changes a shared variable
    t = ('import java.util.stream.*;\npublic class Harness {\n  static void once() {\n    %S%\n  }\n  public static void main(String[] a) { for (int i = 0; i < 30; i++) once(); }\n}\n')
    exact = str(sum(range(1_000_000)))
    (rb, ob), (rf, of) = harness('m6-bug', t)
    lines_bad, lines_fix = ob.split('\n'), of.split('\n')
    if (os.cpu_count() or 1) < 2:
        skipped('bug hunt m6-bug', 'one CPU: a parallel stream cannot race')
    else:
        expect(rb == 0 and len(lines_bad) == 30 and any(x != exact for x in lines_bad), 'bug hunt m6-bug: the shared variable gave a wrong total in %d of 30 runs' % sum(x != exact for x in lines_bad), 'bug hunts run')
    expect(rf == 0 and lines_fix == [exact] * 30, 'bug hunt m6-bug: the reduce gave %s in all 30 runs' % exact, 'bug hunts run')
    # m6-bug3: a SimpleDateFormat shared by threads (a race: reported as not reproduced when it does not show)
    t = ('import java.text.*; import java.time.*; import java.time.format.*; import java.util.*;\npublic class Harness {\n  %S%\n  public static void main(String[] a) throws Exception {\n'
         '    final int[] wrong = {0};\n    List<Thread> ts = new ArrayList<>();\n    for (int k = 0; k < 8; k++) { Thread t = new Thread(() -> { for (int i = 0; i < 20000; i++) { try { String s = String.valueOf(parse("01/02/2026")); if (!s.contains("2026")'
         ' || s.contains("2027") || s.contains("2025") || s.contains("Jan") || s.contains("Mar")) synchronized (wrong) { wrong[0]++; } } catch (Exception e) { synchronized (wrong) { wrong[0]++; } } } }); ts.add(t); t.start(); }\n'
         '    for (Thread t : ts) t.join();\n    System.out.println(wrong[0] > 0 ? "wrong results" : "no wrong result");\n  }\n}\n')
    (rb, ob), (rf, of) = harness('m6-bug3', t)
    if ob.endswith('wrong results'):
        expect(True, '', 'bug hunts run')
    else:
        skipped('the race of m6-bug3', 'the shared SimpleDateFormat gave no wrong result on this machine in this run (a race is luck), so the lesson keeps its "from documentation" tag')
    expect(rf == 0 and of.endswith('no wrong result'), 'bug hunt m6-bug3: the fix (DateTimeFormatter) gave a wrong result in no run: %s' % of[-120:], 'bug hunts run')

# ----------------------------------------------------------------------------------------------------------------------
# 5. The lab data, and controls for its checker
# ----------------------------------------------------------------------------------------------------------------------
def widget_checker(real=None):
    env = None
    if real is not None:
        p = pathlib.Path(tempfile.mkdtemp(prefix='java-control-')) / 'real.js'
        p.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(real) + ';\n')
        env = dict(os.environ, JAVA_REAL_JS=str(p))
    return runp(['node', HERE / 'check_widgets.js'], cwd=ROOT, env=env)


r = widget_checker()
m = re.search(r'(\d+) checks passed', r.stdout)
expect(r.returncode == 0 and m, 'check_widgets.js passes: ' + r.stdout.strip()[-200:], 'lab checks')
tick('lab data checks', int(m.group(1)) if m else 0)


def mut(fn):
    d = json.loads(json.dumps(REAL))
    fn(d)
    return d


MUTATIONS = [
    ('a total that is one cent off the rule of the file', lambda d: d['counts']['mem'].__setitem__('sum_output', '1000000 rows, 4497500001 cents')),
    ('a file size that is one megabyte off', lambda d: d['counts']['mem'].__setitem__('file_mb', d['counts']['mem']['file_mb'] + 1)),
    ('a heap of 64 MB that ended with exit code 0', lambda d: d['counts']['mem'].__setitem__('oom_exit', 0)),
    ('a sum of a million additions of 0.10 that is exact in a double', lambda d: d['counts']['num.sums'].__setitem__('double_sum', '100000.0')),
    ('a rollback that leaves 916 rows', lambda d: d['text'].__setitem__('jdbc.run', d['text']['jdbc.run'].replace('after the rollback: 1000', 'after the rollback: 916'))),
    ('a delete of store 1 that left 920 rows', lambda d: d['text'].__setitem__('jdbc.run', d['text']['jdbc.run'].replace('inside the transaction: 917', 'inside the transaction: 920'))),
    ('a bound parameter that matched a row', lambda d: d['text'].__setitem__('jdbc.run', d['text']['jdbc.run'].replace('bound as a parameter: 0 rows', 'bound as a parameter: 1 rows'))),
    ('a pool of 4 that summed the squares to 384', lambda d: d['counts']['conc'].__setitem__('pool_sum', 384)),
    ('an atomic counter that was short in a run', lambda d: d['counts']['conc']['atomic_exact_in_runs'].__setitem__(1, False)),
    ('a plain counter that was exact in all three runs', lambda d: d['counts']['conc'].__setitem__('plain_short_in_runs', [False, False, False])),
    ('a coding round that sums store 2 wrongly', lambda d: d['counts']['challenge'].__setitem__('output', '{1=599, 2=2286, 3=10000}')),
    ('a coding round that accepts a third decimal', lambda d: d['counts']['challenge'].__setitem__('refused', 'accepted')),
    ('a shaded jar that printed another total', lambda d: d['counts']['maven.run'].__setitem__('shaded_output', '50 orders, 226676 cents')),
    ('a Maven build that ran three tests', lambda d: d['counts']['maven.package'].__setitem__('tests_run', 3)),
    ('a conflict that picked 2.16.1 over the pin', lambda d: d['counts']['maven.conflict'].__setitem__('chosen_io_version', '2.16.1')),
    ('a replay of the time zone test that does not skip the gap', lambda d: d['text'].__setitem__('num.times', d['text']['num.times'].replace('2026-03-08T03:30-04:00', '2026-03-08T02:30-04:00'))),
    ('a heap replay whose second command used 128 MB', lambda d: d['text'].__setitem__('mem.stream', d['text']['mem.stream'].replace('-Xmx64m Memory.java stream', '-Xmx128m Memory.java stream'))),
]
for label, fn in MUTATIONS:
    data = mut(fn)
    control(label + ': the widget checker fails', lambda data=data: widget_checker(data).returncode != 0)

# ----------------------------------------------------------------------------------------------------------------------
# 6. The lint
# ----------------------------------------------------------------------------------------------------------------------
r = runp(['node', ROOT / 'dev' / 'lint-content.js', 'java'], cwd=ROOT)
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


def normalise(real):
    """The parts of a recording that are luck or machine: the date, the CPUs, and which of three runs of a race lost an update (it must be at least one)."""
    d = json.loads(json.dumps(real))
    d['meta']['recorded_on'] = ''
    d['counts']['conc']['cpus'] = 0
    d['counts']['conc']['plain_short_in_runs'] = any(d['counts']['conc']['plain_short_in_runs'])
    d['text']['conc.race'] = re.sub(r'plain int (short|exact)', 'plain int <short or exact>', d['text']['conc.race'])
    return d


def differing(a, b):
    fa, fb = flatten(normalise(a)), flatten(normalise(b))
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
        if k not in fa or k not in fb:
            out.append(k)
        else:
            out += walk(fa[k], fb[k], '', k)
    return out


if not args.recapture:
    skipped('recapture', 'run with --recapture (about 1 minute, needs Maven and the network once)')
elif not (have_java and shutil.which('mvn')):
    skipped('recapture', 'java and mvn are needed')
else:
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='java-recapture-')) / 'real.js'
    r = runp([sys.executable, HERE / 'capture_java.py', '--out', tmp])
    if r.returncode or not tmp.exists():
        bad('capture_java.py failed: ' + (r.stdout + r.stderr)[-800:])
    else:
        again = load_real(tmp)
        diff = differing(REAL, again)
        tick('recaptured items', len(flatten(again)))
        for k in diff:
            bad('the recapture differs from js/real.js in %s' % k)
        print('recapture: %d items, %d differ' % (len(flatten(again)), len(diff)))
        ch = mut(lambda d: d['counts']['mem'].__setitem__('lines', 1000002))
        control('a recording with one number changed, given to the comparison', lambda: differing(REAL, ch) == ['counts:mem.lines'])
        ch = mut(lambda d: d['text'].__setitem__('jdbc.run', d['text']['jdbc.run'].replace('23505', '23506')))
        control('a recording with one word changed in a printed text, given to the comparison', lambda: differing(REAL, ch) == ['text:jdbc.run'])
        ch = mut(lambda d: d['files'].__setitem__('Hello.java', d['files']['Hello.java'] + ' '))
        control('a recording with one changed file, given to the comparison', lambda: differing(REAL, ch) == ['files:Hello.java'])
        ch = mut(lambda d: (d['meta'].__setitem__('recorded_on', '2030-01-01'), d['counts']['conc'].__setitem__('cpus', 64), d['counts']['conc'].__setitem__('plain_short_in_runs', [True, False, True])))
        expect(differing(REAL, ch) == [], 'another date, another number of CPUs and another luck of the race are inside the allowance', 'recapture allowances')
        ch = mut(lambda d: d['counts']['conc'].__setitem__('atomic_exact_in_runs', [True, False, True]))
        control('an atomic counter that lost an update, given to the comparison', lambda: differing(REAL, ch) == ['counts:conc.atomic_exact_in_runs[1]'])
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
    W = 'java/js/widgets.js'
    BROWSER = [
        ('the heap lab draws the 2 GB bar against 1,024 MB', W, "bar('heap against file', c.heap, 2048,", "bar('heap against file', c.heap, 1024,"),
        ('the heap lab colours a failed run as good', W, "out += bar('heap against file', c.heap, 2048, n(c.heap) + ' MB', c.exit ? 'bad' : 'good');", "out += bar('heap against file', c.heap, 2048, n(c.heap) + ' MB', 'good');"),
        ('the dependency lab shows the exit code of the wrong case', W, "[c.exit, 'exit code', c.exit ? 'bad' : 'good']]);\n        out += pre(c.out, c.exit ? 'err' : '');", "[0, 'exit code', c.exit ? 'bad' : 'good']]);\n        out += pre(c.out, c.exit ? 'err' : '');"),
        ('the money lab reports the error of the double against 100,001', W, "var err = (parseFloat(NS.double_sum) - 100000);", "var err = (parseFloat(NS.double_sum) - 100001);"),
        ('the JDBC lab swaps the colours of the two rows found', W, "[n(+inj[1]), 'rows found', 'bad'], [n(+inj[2]), 'rows found with a parameter', 'good']", "[n(+inj[1]), 'rows found', 'good'], [n(+inj[2]), 'rows found with a parameter', 'bad']"),
        ('the race lab shows the sum of the squares one too high', W, "nums: [[K.pool_sum, 'sum of the squares of 1 to 10']]", "nums: [[K.pool_sum + 1, 'sum of the squares of 1 to 10']]"),
        ('the race lab counts the exact runs one too low', W, "exact3 = K.atomic_exact_in_runs.filter(Boolean).length", "exact3 = K.atomic_exact_in_runs.filter(Boolean).length - 1"),
    ]
    for label, rel, old, new in BROWSER:
        copy = pathlib.Path(tempfile.mkdtemp(prefix='java-mutation-'))
        for part in ('shared', 'java'):
            shutil.copytree(ROOT / part, copy / part, ignore=shutil.ignore_patterns('__pycache__', '.cache', 'node_modules', '.git', 'target'))
        target = copy / rel
        src = target.read_text()
        if src.count(old) != 1:
            bad('control cannot be set up: "%s" is not in %s exactly once (%d)' % (old[:70], rel, src.count(old)))
            shutil.rmtree(copy, ignore_errors=True)
            continue
        target.write_text(src.replace(old, new))
        r2, _ = labs_e2e(copy / 'java' / 'verify' / 'e2e_labs.js')
        control('the lab test fails when ' + label, lambda r2=r2: r2.returncode != 0)
        shutil.rmtree(copy, ignore_errors=True)

shutil.rmtree(WORK, ignore_errors=True)
print()
print('checked: ' + ', '.join('%d %s' % (v, k) for k, v in sorted(counts.items())))
for sk in skips:
    print('skipped: ' + sk)
if problems:
    print('%d PROBLEM(S)' % len(problems))
    sys.exit(1)
print('verify_java: all checks passed')
