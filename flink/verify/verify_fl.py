#!/usr/bin/env python3
"""Check the code and the recorded output of the Apache Flink for data engineers tutorial.

Everything in this tutorial that is recorded ran on a real Apache Flink 2.2.1 (a standalone cluster of one JobManager and two TaskManagers on one machine, capture_flink.py), with its SQL client
and its `flink` tool, the Kafka connector 5.0.0-2.2, the Flink CDC PostgreSQL connector 3.7.0-2.2, Apache Kafka 4.4.0, PostgreSQL 16 and a Java job that is compiled here. Nothing ran on Kubernetes, on
YARN, on a managed service, with high availability, or on lake tables, and nothing ran on a network. This script checks what can be checked on one machine:

 1. The recorded files are the files in flink/verify, and every code screen shows a recorded script or a Java file.
 2. The JSON of the course parses and is the plan that Flink returned.
 3. Java: the five Java files compile against the jars of the distribution and the Kafka connector, the two Java snippets of the bug hunts compile as fragments, and the coding round that the
    course shows is the file that is compiled and run.
 4. Shell: every command that the course shows goes through `bash -n`, and every flag of `flink`, `javac` and `sql-client.sh` is looked up in the help of the real tool.
 5. Configuration: every key in a SET statement, in a table option and in the text of a lesson is looked up in the documentation that ships with the release (FLINK_DOCS: the source release of
    Flink holds the generated configuration pages) and, for connectors, in the option classes of the connector jars. Without FLINK_DOCS the option classes of the jars of the distribution are read.
 6. SQL: a real cluster is started, and every SQL script of the course goes through the real SQL client. Scripts that read a file or a generated source are run and their result is compared with the
    recording. Scripts that need Kafka or a database are planned with EXPLAIN against the real planner. The bug hunts are run: the planner must refuse the broken script for the reason that the lesson
    gives, and accept the fix.
 7. Coding rounds: the SQL round and the DataStream round are run again, and what they print is compared with the recording and with a plain Python computation.
 8. With a Kafka broker: the Java job StoreWatch is run on 600 orders and its totals are compared with the truth.
 9. The checks of the lab data (check_widgets.js) run, and deliberately broken inputs (controls) must be refused by the checkers. With --browser the labs are driven in Chromium (e2e_labs.js).
10. The lint of the course (dev/lint-content.js).
11. With --recapture the whole recording is made again (about forty minutes) and compared with js/real.js, with the allowances that are stated below.

What this cannot show: that a managed service accepts a command, what a real network does, anything about Kubernetes, YARN, high availability or lake tables, or that a default is the same in another
release of Flink. Those screens carry the "From documentation" tag, and the README lists what was not checked.

Run:   python3 flink/verify/verify_fl.py [--no-run] [--no-live] [--browser] [--recapture] [--only world,sql,...] [--verbose]
Needs: Python 3.11 or later, Node 20 or later, and for the steps that use the real thing: Java 17 or 21 with javac, FLINK_HOME (an unpacked Apache Flink 2.2.1 binary distribution),
       FLINK_KAFKA_JAR (flink-sql-connector-kafka-5.0.0-2.2.jar), FLINK_CDC_JAR (flink-sql-connector-postgres-cdc-3.7.0-2.2.jar), FLINK_DOCS (the docs folder of the Flink 2.2.1 source release),
       KAFKA_HOME (an unpacked Apache Kafka 4.4.0) and a Python environment with confluent-kafka (flink/verify/requirements.txt). A check whose tool is missing says so and is skipped.
"""
import argparse
import ast
import html
import json
import os
import pathlib
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
import textwrap
import zipfile

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(ROOT / 'kafka' / 'verify'))

ap = argparse.ArgumentParser()
ap.add_argument('--no-run', action='store_true', help='parse and compare only: start no cluster and run no checker')
ap.add_argument('--no-live', action='store_true', help='start no Kafka broker (the StoreWatch run is skipped)')
ap.add_argument('--browser', action='store_true', help='also drive the eight labs in Chromium (flink/verify/e2e_labs.js)')
ap.add_argument('--recapture', action='store_true', help='make the whole recording again and compare it with js/real.js')
ap.add_argument('--only', help='with --recapture: record only these sections (for example world,sql) and compare only their items')
ap.add_argument('--verbose', '-v', action='store_true')
args = ap.parse_args()

problems, counts, notes, skips = [], {}, [], []


def bad(msg):
    problems.append(msg)
    print('PROBLEM:', msg, flush=True)


def tick(group, n=1):
    counts[group] = counts.get(group, 0) + n


def skipped(what, why):
    skips.append('%s: %s' % (what, why))
    print('skipped:', what, '(' + why + ')', flush=True)


def expect(cond, msg, group='checks'):
    tick(group)
    if not cond:
        bad(msg)
    elif args.verbose:
        print('ok:', msg.splitlines()[0][:200] if msg else msg)


def control(label, refused):
    """A control feeds a broken input to a checker. refused() returns True (or raises) when the checker caught it."""
    tick('controls')
    try:
        if refused():
            return
    except Exception:  # noqa: BLE001
        return
    bad('control "%s": the checker accepted a broken input' % label)


def have(mod):
    import importlib.util
    try:
        return importlib.util.find_spec(mod.split('.')[0]) is not None
    except (ImportError, ValueError):
        return False


def run(cmd, **kw):
    kw.setdefault('capture_output', True)
    kw.setdefault('text', True)
    return subprocess.run(cmd, **kw)


def clean_err(text):
    return '\n'.join(l for l in text.splitlines() if not l.startswith('Picked up')).strip()


def load_real(path):
    t = pathlib.Path(path).read_text()
    return json.loads(t.split('LAB.real = ', 1)[1].rstrip().rstrip(';'))


def env_path(name):
    v = os.environ.get(name)
    return pathlib.Path(v).expanduser() if v else None


FLINK_HOME, KAFKA_HOME = env_path('FLINK_HOME'), env_path('KAFKA_HOME')
FLINK_DOCS, KAFKA_JAR, CDC_JAR = env_path('FLINK_DOCS'), env_path('FLINK_KAFKA_JAR'), env_path('FLINK_CDC_JAR')
HAVE_FLINK = bool(FLINK_HOME and (FLINK_HOME / 'bin' / 'flink').exists())
HAVE_KAFKA = bool(KAFKA_HOME and (KAFKA_HOME / 'bin' / 'kafka-server-start.sh').exists())
HAVE_DOCS = bool(FLINK_DOCS and (FLINK_DOCS / 'layouts' / 'shortcodes' / 'generated').exists())
HAVE_KJAR, HAVE_CDC = bool(KAFKA_JAR and KAFKA_JAR.exists()), bool(CDC_JAR and CDC_JAR.exists())
HAVE_JAVA = shutil.which('java') is not None and shutil.which('javac') is not None
HAVE_NODE = shutil.which('node') is not None
TOOL_ENV = dict(os.environ, JAVA_TOOL_OPTIONS='')
RUN = not args.no_run

if not HAVE_FLINK:
    skipped('everything that uses Flink', 'FLINK_HOME is not set to an unpacked Apache Flink binary distribution')
if not HAVE_DOCS:
    skipped('the documentation of the release', 'FLINK_DOCS is not set to the docs folder of the Flink source release: configuration keys are looked up in the option classes of the jars instead')
if not HAVE_KAFKA:
    skipped('Kafka', 'KAFKA_HOME is not set: the DataStream job that reads Kafka is not run')
if not HAVE_JAVA:
    skipped('Java', 'java and javac are not installed')

# ---- what the course shows ---------------------------------------------------------------------------------------------------------------------------------
if not HAVE_NODE:
    sys.exit('node is needed to read the course (dev/dump-scenes.js)')
r = run(['node', str(ROOT / 'dev' / 'dump-scenes.js'), 'flink'], cwd=str(ROOT))
if r.returncode:
    bad('dev/dump-scenes.js failed: ' + clean_err(r.stderr)[:300])
    DUMP = {'snippets': [], 'results': []}
else:
    DUMP = json.loads(r.stdout)
r = run(['node', str(HERE / 'dump_fl.js')], cwd=str(ROOT))
if r.returncode:
    bad('dump_fl.js failed: ' + clean_err(r.stderr)[:300])
    FL = {'strings': [], 'terms': [], 'scenes': [], 'widgets': [], 'chapters': []}
else:
    FL = json.loads(r.stdout)
REAL = load_real(ROOT / 'flink' / 'js' / 'real.js')
SNIP = DUMP['snippets']
SNIPS = {(s['id'], s['kind']): s for s in SNIP}

# ======================================================================================================================
# 1. Recorded files are the files on disk, and the code screens show recorded files
# ======================================================================================================================
for key, text in REAL['files'].items():
    if key.startswith('code/'):
        p = HERE / key[5:]
        expect(p.exists() and p.read_text().strip() == text.strip(), 'the recorded file %s is the file on disk' % key, 'recorded files')
expect(len([k for k in REAL['files'] if k.startswith('code/')]) >= 5, 'the recording holds the Java code of the course')
sql_files = {k[4:]: v for k, v in REAL['files'].items() if k.startswith('sql/')}
code_texts = {s['code'].strip() for s in SNIP if s['lang'] == 'sql' and s['kind'] == 'code'}
for sid in [s['id'] for s in SNIP if s['lang'] == 'sql' and s['kind'] == 'code' and s['id'] not in ('m1-bug', 'm2-bug', 'm3-bug', 'm4-bug', 'm5-bug', 'm6-bug')]:
    expect(SNIPS[(sid, 'code')]['code'].strip() in {v.strip() for v in sql_files.values()}, '%s shows a script that the recorder ran' % sid, 'code screens that show a recorded script')

# ======================================================================================================================
# 2. JSON
# ======================================================================================================================
for s in [x for x in SNIP if x['lang'] == 'json']:
    try:
        doc = json.loads(s['code'])
        tick('json snippets')
    except ValueError as e:
        bad('%s (%s): JSON does not parse: %s' % (s['id'], s['kind'], e))
        continue
    if s['id'] == 'm1-json':
        want = json.loads(REAL['text']['world.plan_json'])
        expect(doc == want, 'm1-json is the plan that the REST interface returned', 'json compared with the recording')
control('JSON that does not parse', lambda: json.loads('{"a": }'))

# ======================================================================================================================
# 3. Java
# ======================================================================================================================
JAVA_FILES = ['StoreWatch.java', 'KeyGroups.java', 'Pipe.java', 'MaxParallelism.java', 'PassThousand.java']
FRAG = textwrap.dedent('''\
    package brewline;
    import org.apache.flink.api.common.functions.RichMapFunction;
    import org.apache.flink.streaming.api.datastream.DataStream;
    import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
    import org.apache.flink.streaming.api.functions.sink.v2.DiscardingSink;
    import org.apache.flink.util.Collector;
    import org.apache.flink.util.ParameterTool;
    class Frag {
        public static class Event { public String storeId; public int totalCents; }
        static class CountPerStore extends KeyedProcessFunction<String, Event, String> { @Override public void processElement(Event e, Context c, Collector<String> o) {} }
        static class SlowLookup extends RichMapFunction<Event, Event> { @Override public Event map(Event e) { return e; } }
        void f(DataStream<Event> events, ParameterTool p) throws Exception {
    %s
        }
    }
    ''')


def javac(files, out, extra_cp=()):
    cp = ':'.join([str(FLINK_HOME / 'lib' / '*')] + ([str(KAFKA_JAR)] if HAVE_KJAR else []) + [str(x) for x in extra_cp])
    return run(['javac', '-proc:none', '--release', '17', '-cp', cp, '-d', str(out)] + [str(f) for f in files], env=TOOL_ENV)


if HAVE_FLINK and HAVE_JAVA and HAVE_KJAR and RUN:
    out = pathlib.Path(tempfile.mkdtemp(prefix='flink-javac-'))
    for name in JAVA_FILES:
        r = javac([HERE / 'app' / name], out)
        expect(r.returncode == 0, '%s compiles against the jars of the distribution and the Kafka connector: %s' % (name, clean_err(r.stderr)[:300]), 'java files compiled')
    for sid in ('m7-bug', 'm8-bug'):
        for kind in ('code', 'fix'):
            s = SNIPS.get((sid, kind))
            if not s:
                continue
            (out / 'Frag.java').write_text(FRAG % textwrap.indent(s['code'], '        '))
            r = javac([out / 'Frag.java'], out)
            expect(r.returncode == 0, '%s (%s): the Java fragment compiles: %s' % (sid, kind, clean_err(r.stderr)[:300]), 'java fragments compiled')
    # the long Java screens show the recorded files
    for sid, name in (('m7-code', 'StoreWatch.java'), ('m8-code', 'Pipe.java')):
        expect(SNIPS[(sid, 'code')]['code'].strip() == (HERE / 'app' / name).read_text().strip(), '%s shows %s exactly' % (sid, name), 'java screens equal their files')
    ch2 = SNIPS.get(('m9-ch2', 'sol'))
    expect(ch2 is not None and ch2['code'].strip() == (HERE / 'app' / 'PassThousand.java').read_text().strip(), 'the DataStream coding round shows PassThousand.java exactly', 'java screens equal their files')
    # controls: the two things that changed between Flink 1 and Flink 2 and that the lesson names
    (out / 'Old.java').write_text((HERE / 'app' / 'StoreWatch.java').read_text().replace('org.apache.flink.util.ParameterTool', 'org.apache.flink.api.java.utils.ParameterTool'))
    control('Java that imports ParameterTool from its Flink 1 package', lambda: javac([out / 'Old.java'], out).returncode != 0)
    (out / 'Old2.java').write_text((HERE / 'app' / 'StoreWatch.java').read_text().replace('public void open(OpenContext ctx)', 'public void open(org.apache.flink.configuration.Configuration ctx)'))
    control('Java that overrides open(Configuration), which Flink 2 removed', lambda: javac([out / 'Old2.java'], out).returncode != 0)
    shutil.rmtree(out, ignore_errors=True)
else:
    skipped('Java', 'FLINK_HOME, FLINK_KAFKA_JAR, javac or a run is not available')

# ======================================================================================================================
# 4. Shell: bash -n, and the flags against the help of each tool
# ======================================================================================================================
cmds = []                      # (where, command)
for t in FL['terms']:
    if t['c'] == 'cmd' and t['t'].startswith('$ '):
        cmds.append((t['id'], t['t'][2:]))
for path, s in FL['strings']:
    for m in re.finditer(r'`([^`]+)`|<code>([^<]+)</code>', s):
        c = m.group(1) or m.group(2)
        if re.match(r'^(bin/)?flink (run|stop|list|cancel|savepoint)\b', c) or c.startswith('sql-client.sh'):
            cmds.append((path, c))
cmds = [(w, c) for w, c in cmds if not c.startswith('grep ') and not c.startswith('INSERT')]
HELP = {}


def tool_help(*argv):
    key = ' '.join(argv)
    if key not in HELP:
        exe = [str(FLINK_HOME / 'bin' / argv[0])] + list(argv[1:]) + ['--help']
        r = run(exe, env=TOOL_ENV)
        HELP[key] = r.stdout + r.stderr
    return HELP[key]


def has_flag(helptext, flag):
    if flag.startswith('--'):
        return re.search(r'(^|[\s,])' + re.escape(flag) + r'(\s|$|<|=)', helptext, re.M) is not None
    return re.search(r'(^|\s)' + re.escape(flag) + r'(,|\s|$)', helptext, re.M) is not None


def check_flink_command(cmd, where):
    words = shlex.split(cmd.replace('<savepoint>', 'SP'))
    words[0] = re.sub(r'^bin/', '', words[0])
    if words[0] == 'flink' and len(words) > 1 and words[1] in ('run', 'stop', 'list', 'cancel', 'savepoint'):
        h = tool_help('flink', words[1])
        expect(len(h) > 150, '%s: the help of flink %s was read' % (where, words[1]), 'tool helps read')
        # flags of the action: leave the arguments of the user's program alone (everything after the jar)
        rest = words[2:]
        if words[1] == 'run':
            jar = next((i for i, w in enumerate(rest) if w.endswith('.jar')), len(rest))
            rest = rest[:jar]
        for w in rest:
            if re.match(r'^-{1,2}[A-Za-z]', w):
                tick('tool flags checked')
                if not has_flag(h, w):
                    bad('%s: flink %s has no flag %s' % (where, words[1], w))
    elif words[0] == 'sql-client.sh':
        h = tool_help('sql-client.sh')
        for w in words[1:]:
            if re.match(r'^-{1,2}[A-Za-z]', w):
                tick('tool flags checked')
                if not has_flag(h, w):
                    bad('%s: sql-client.sh has no flag %s' % (where, w))


def check_javac_command(cmd, where):
    words = shlex.split(cmd)
    if words[0] != 'javac':
        return
    h = run(['javac', '--help'], env=TOOL_ENV)
    h = h.stdout + h.stderr
    for w in words[1:]:
        if w.startswith('-') and not w.startswith('-J'):
            tick('tool flags checked')
            if w not in h and w.lstrip('-') not in h:
                bad('%s: javac has no flag %s' % (where, w))


for where, c in cmds:
    r = run(['bash', '-n'], input=c)
    expect(r.returncode == 0, '%s: bash does not parse "%s": %s' % (where, c[:60], r.stderr[:100]), 'shell commands parsed')
    if HAVE_FLINK and RUN:
        check_flink_command(c, where)
    if HAVE_JAVA and RUN:
        check_javac_command(c, where)
if HAVE_FLINK and RUN:
    # the flags that the recorder gives to the SQL client
    h = tool_help('sql-client.sh')
    for fl in ('-f', '-j', '-i'):
        tick('tool flags checked')
        expect(has_flag(h, fl), 'sql-client.sh has the flag %s that the recorder uses' % fl)
    control('a shell command that does not parse', lambda: run(['bash', '-n'], input='for x in a; do\n  echo $x\n').returncode != 0)
    control('a flag that flink run does not have', lambda: not has_flag(tool_help('flink', 'run'), '--no-such-flag'))
    control('a flag that belongs to another action (--savepointPath is a flag of flink stop, not of flink run)', lambda: not has_flag(tool_help('flink', 'run'), '--savepointPath'))
    expect(has_flag(tool_help('flink', 'stop'), '--savepointPath') and has_flag(tool_help('flink', 'run'), '--allowNonRestoredState') and has_flag(tool_help('flink', 'run'), '-s'),
           'flink stop --savepointPath, flink run -s and --allowNonRestoredState exist')
else:
    skipped('flags of the tools', 'FLINK_HOME is not set, or a run is not wanted')

# ======================================================================================================================
# 5. Configuration keys and table options
# ======================================================================================================================
DOC_KEYS, DOC_TEXT = set(), ''
if HAVE_DOCS:
    for f in (FLINK_DOCS / 'layouts' / 'shortcodes' / 'generated').glob('*.html'):
        for m in re.finditer(r'<td><h5>([^<]+)</h5>', f.read_text(errors='ignore')):
            DOC_KEYS.add(m.group(1).strip())
    for sub in ('connectors/table', 'dev/table/concepts', 'dev/table/sql'):
        for f in (FLINK_DOCS / 'content' / 'docs' / sub).rglob('*.md'):
            DOC_TEXT += f.read_text(errors='ignore')


def jar_strings(jar, pattern):
    """The names that the option classes of a jar hold: every text of the constant pool of the classes whose name matches the pattern."""
    out = set()
    if not jar or not pathlib.Path(jar).exists():
        return out
    with zipfile.ZipFile(jar) as z:
        for n in z.namelist():
            if n.endswith('.class') and re.search(pattern, n):
                for m in re.finditer(rb'[a-z][a-z0-9.\-]{2,90}', z.read(n)):
                    out.add(m.group(0).decode())
    return out


CONNECTOR_KEYS = set()
if HAVE_KJAR:
    CONNECTOR_KEYS |= jar_strings(KAFKA_JAR, r'(KafkaConnectorOptions|UpsertKafka|KafkaDynamicTableFactory|KafkaSourceOptions|DeliveryGuarantee)')
if HAVE_CDC:
    CONNECTOR_KEYS |= jar_strings(CDC_JAR, r'(PostgresSourceOptions|JdbcSourceOptions|SourceOptions|PostgreSQLTableFactory|PostgreSQLSource)')
JAR_KEYS = set()
if HAVE_FLINK and not HAVE_DOCS and RUN:
    for jar in (FLINK_HOME / 'lib').glob('flink-dist-*.jar'):
        JAR_KEYS |= jar_strings(jar, r'Options')
    for jar in (FLINK_HOME / 'lib').glob('flink-table-api-java-uber-*.jar'):
        JAR_KEYS |= jar_strings(jar, r'(ExecutionConfigOptions|OptimizerConfigOptions|TableConfigOptions)')
GENERIC = {'connector', 'format', 'path', 'topic', 'key.format', 'value.format', 'hostname', 'port', 'username', 'password', 'database-name', 'schema-name', 'table-name', 'rows-per-second'}
PASS_THROUGH = ('properties.', 'fields.', 'json.', 'csv.', 'key.', 'value.', 'debezium-json.', 'sink.', 'scan.', 'decoding.', 'slot.', 'debezium.')


def norm_option(k):
    return re.sub(r'^fields\.[A-Za-z0-9_]+\.', 'fields.#.', k)


def known_config(k):
    if DOC_KEYS:
        return k in DOC_KEYS
    return k in JAR_KEYS


def known_option(k):
    k = norm_option(k)
    if k in GENERIC or k in CONNECTOR_KEYS:
        return True
    if k.startswith('properties.'):
        return True                                           # given to the Kafka client unchanged
    if DOC_TEXT and (('<h5>' + k + '</h5>') in DOC_TEXT or ("'" + k + "'") in DOC_TEXT or ('`' + k + '`') in DOC_TEXT):
        return True
    return False


CONFIG_PREFIX = re.compile(r'^(table\.|execution\.|pipeline\.|state\.|restart-strategy\.|taskmanager\.|jobmanager\.|heartbeat\.|parallelism\.|sql-client\.|rest\.|slot\.|env\.(java|log|pid|yarn|ssh)\.|metrics\.|io\.)')
OPTION_PREFIX = re.compile(r'^(scan|sink|properties|key|value|json|csv|fields|lookup|changelog|decoding|slot|debezium)[.\-]')
config_seen, option_seen = set(), set()
all_sql = [s['code'] for s in SNIP if s['lang'] == 'sql'] + list(sql_files.values())
for text in all_sql:
    for m in re.finditer(r"SET\s+'([^']+)'\s*=", text):
        config_seen.add(m.group(1))
    for stmt in re.findall(r'WITH\s*\((.*?)\)\s*;?\s*$|WITH\s*\((.*?)\)\s*;', text, re.S | re.M):
        for pair in re.finditer(r"'([^']+)'\s*=\s*'", ''.join(stmt)):
            option_seen.add(pair.group(1))
for path, s in FL['strings']:
    for m in re.finditer(r'`([^`]+)`|<code>([^<]+)</code>', s):
        c = (m.group(1) or m.group(2)).strip()
        mm = re.match(r"^SET '([^']+)'", c)
        if mm:
            config_seen.add(mm.group(1))
        elif re.match(r'^[a-z][a-z0-9\-]*(\.[a-z0-9\-]+)+$', c):
            if CONFIG_PREFIX.match(c):
                config_seen.add(c)
            elif OPTION_PREFIX.match(c):
                option_seen.add(c)                 # anything else with a dot in it is Java (env.execute) or a file name
option_seen -= {'connector'}
if (DOC_KEYS or JAR_KEYS) and RUN:
    for k in sorted(config_seen):
        tick('configuration keys looked up')
        if not known_config(k):
            bad('the configuration key %s is not in the %s' % (k, 'documentation of the release' if DOC_KEYS else 'option classes of the jars'))
    control('a configuration key that does not exist', lambda: not known_config('table.exec.state.ttll'))
    control('a configuration key with the wrong prefix', lambda: not known_config('execution.checkpointing.intervall'))
    expect(counts.get('configuration keys looked up', 0) >= 15, 'the key check reached a useful number of keys (%d)' % counts.get('configuration keys looked up', 0))
else:
    skipped('configuration keys', 'FLINK_DOCS and FLINK_HOME are not set, or a run is not wanted')
if (CONNECTOR_KEYS or DOC_TEXT) and RUN:
    for k in sorted(option_seen):
        tick('table options looked up')
        if not known_option(k):
            bad('the table option %s is not in the connector jars or in the connector documentation' % k)
    control('a table option that does not exist', lambda: not known_option('scan.startup.modee'))
    expect(counts.get('table options looked up', 0) >= 15, 'the option check reached a useful number of options (%d)' % counts.get('table options looked up', 0))
else:
    skipped('table options', 'the connector jars and the documentation are not available, or a run is not wanted')

# ======================================================================================================================
# 6, 7 and 8. A real cluster: SQL scripts, the bug hunts, the coding rounds and the Java job
# ======================================================================================================================
def tables_equal(a, b, ordered):
    if a['cols'] != b['cols']:
        return False
    ra, rb = [list(map(str, r)) for r in a['rows']], [list(map(str, r)) for r in b['rows']]
    return ra == rb if ordered else sorted(ra) == sorted(rb)


# the scripts that read a file or a generated source and finish by themselves: run, and compare the result with the recording
RUNS = [('sql_stream', 'sql.stream_group', True), ('sql_two', 'sql.two_level', True), ('sql_batch', 'sql.batch_group', False), ('sql_append', 'sql.append_only', True),
        ('time_tumble_0', 'time.tumble_0', True), ('time_tumble_10', 'time.tumble_10', True), ('time_tumble_30', 'time.tumble_30', True), ('time_tumble_75', 'time.tumble_75', True),
        ('time_tumble_200', 'time.tumble_200', True), ('time_hop', 'time.hop', False), ('time_cumulate', 'time.cumulate', False), ('time_session', 'time.session', False),
        ('joins_dedup_first', 'joins.dedup_first', True), ('joins_dedup_last', 'joins.dedup_last', True)]
# the scripts that need a broker, a database or a long run: planned with EXPLAIN against the real planner
PLANNED = ['world_p1', 'world_p2', 'world_p4', 'world_p5', 'state_a', 'state_b', 'copy_eo', 'copy_alo', 'sp_1', 'sp_2', 'sp_3', 'sp_4', 'connect_earliest-offset', 'connect_latest-offset', 'connect_timestamp',
           'connect_specific-offsets', 'connect_meta', 'connect_upsert', 'connect_files', 'time_idle_without', 'time_idle_with', 'joins_regular', 'joins_interval', 'joins_ttl', 'backend_hashmapfalse',
           'backend_rocksdbfalse', 'backend_rocksdbtrue', 'sql_print', 'sql_minibatch', 'cdc_direct_full', 'cdc_direct_default', 'cdc_direct_upsert']
DATA = {}                                    # file name -> text, rebuilt from the recording


def data_files():
    ev = REAL['text']['time.events_file']
    ord12 = REAL['text']['sql.orders_file']
    dup = '\n'.join(json.dumps({'order_id': r[1], 'store_id': r[2], 'total_cents': r[3], 'status': r[4]}, separators=(',', ':')) for r in REAL['tables']['joins.dup_input']['rows'])
    return {'orders12.jsonl': ord12, 'events14.jsonl': ev, 'dup8.jsonl': dup}


def explain_version(script):
    """The same script with its last statement planned and not run."""
    stmts = [s for s in re.split(r';\s*\n|;\s*$', script) if s.strip()]
    last = stmts[-1].lstrip()
    if re.match(r'(INSERT|SELECT|WITH)\b', last, re.I):
        stmts[-1] = 'EXPLAIN ' + last
    return ';\n'.join(stmts) + ';\n'


def sql_ok(out):
    o = out.replace('\x1b', '')
    return '[ERROR]' not in o and 'Exception' not in o


def sql_error(out):
    """The message of the first error of a SQL client run, on one line (empty when there was none)."""
    m = re.search(r'\[ERROR\][^\n]*\n(.*)', out)
    return re.sub(r'\s+', ' ', m.group(1))[:300] if m else ''


class Cluster:
    """The real cluster of the checks: one JobManager and two TaskManagers on this machine, with the Kafka connector in its lib folder."""

    def __init__(self):
        import fcluster as F
        import fx
        self.F, self.fx = F, fx
        self.f = F.Flink(jars=[KAFKA_JAR] if HAVE_KJAR else [])

    def start(self):
        self.f.start()
        for name, text in data_files().items():
            p = self.f.work / 'data' / name
            p.parent.mkdir(exist_ok=True)
            p.write_text(text + '\n')
        return self

    def prepare(self, script):
        return script.replace('file:///data/', 'file://%s/data/' % self.f.work).replace('<work>', str(self.f.work))

    def sql(self, script, name, jars=()):
        rc, out, err = self.f.sql(self.prepare(script), name=name, jars=jars)
        return rc, self.F.strip_ansi(out), err

    def close(self):
        self.f.close()


def live_checks():
    cl = Cluster().start()
    f, F, fx = cl.f, cl.F, cl.fx
    try:
        expect(f.rest('/overview')['slots-total'] == 4, 'the check cluster has four slots', 'cluster starts')
        # ---- every script that finishes by itself: the result is the recorded result
        for name, key, ordered in RUNS:
            script = sql_files.get('%s.sql' % name)
            if script is None:
                bad('the recording has no script %s' % name)
                continue
            rc, out, err = cl.sql(script, 'v_' + name)
            ts = fx.tables(out)
            if not sql_ok(out) or not ts:
                bad('%s: the SQL client did not give a result: %s' % (name, sql_error(out)))
                continue
            want = REAL['tables'][key]
            expect(tables_equal(ts[-1], want, ordered), '%s: the SQL client gives the recorded table %s%s' % (name, key, '' if ordered else ' (same rows, any order)'), 'sql results compared with the recording')
        # ---- the scripts that need a broker or a database, and the long runs: planned
        for name in PLANNED:
            script = sql_files.get('%s.sql' % name)
            if script is None:
                bad('the recording has no script %s' % name)
                continue
            jars = [CDC_JAR] if name.startswith('cdc_') and HAVE_CDC else []
            if name.startswith('cdc_') and not HAVE_CDC:
                skipped(name, 'FLINK_CDC_JAR is not set')
                continue
            rc, out, err = cl.sql(explain_version(script), 'p_' + name, jars=jars)
            expect(sql_ok(out) and 'Optimized Physical Plan' in out, '%s: the planner accepts the script: %s' % (name, sql_error(out)), 'sql scripts planned')
        # ---- EXPLAIN scripts: the plan is the recorded plan
        for name, key in (('world_explain', 'world.explain'),):
            rc, out, err = cl.sql(sql_files['%s.sql' % name], 'v_' + name)
            plan = out[out.index('== Optimized Execution Plan =='):].split('\n |')[0].strip() if '== Optimized Execution Plan ==' in out else ''
            expect(fx.norm(plan) == REAL['text'][key], '%s: the plan is the recorded plan' % name, 'sql results compared with the recording')
        for name, key in (('joins_ex1', 'joins.plan_regular'), ('joins_ex2', 'joins.plan_interval'), ('joins_ex3', 'joins.plan_plain_timestamp')):
            script = sql_files.get('%s.sql' % name)
            if script is None:
                skipped(name, 'not in the recording')
                continue
            rc, out, err = cl.sql(script, 'v_' + name)
            phys = out[out.index('== Optimized Physical Plan =='):].split('== Optimized Execution Plan ==')[0]
            line = next((l for l in phys.splitlines() if 'Join(' in l), '')
            expect(re.sub(r'\s+', ' ', line.strip()) == REAL['text'][key], '%s: the first join operator of the plan is the recorded one' % name, 'sql results compared with the recording')

        # ---- the bug hunts: the planner must refuse the broken script for the reason that the lesson gives, and accept the fix
        PRE = "SET 'sql-client.execution.result-mode' = 'tableau';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, total_cents INT) WITH ('connector' = 'datagen');\n"
        # m1: parallelism 6 on four slots fails at once; 4 runs
        for kind, running in (('code', False), ('fix', True)):
            script = SNIPS[('m1-bug', kind)]['code']
            jid = None
            rc, out, err = cl.sql(script, 'bug_m1_' + kind)
            ids = fx.job_ids(out)
            expect(bool(ids), 'm1-bug (%s): the script submits a job: %s' % (kind, sql_error(out)), 'bug hunts run')
            if ids:
                jid = ids[-1]
                try:
                    st = f.wait_state(jid, 'RUNNING,FAILED', timeout=40)
                except RuntimeError as e:
                    st = 'FAILED'
                expect((st == 'RUNNING') == running, 'm1-bug (%s): the job is %s (parallelism %s on four slots)' % (kind, 'RUNNING' if running else 'FAILED', '4' if running else '6'), 'bug hunts run')
                if not running:
                    ex = json.dumps(f.rest('/jobs/%s/exceptions' % jid))
                    expect('NoResourceAvailableException' in ex, 'm1-bug (code): the exception is NoResourceAvailableException', 'bug hunts run')
                f.cancel(jid)
                f.wait_idle()
        # m2: an aggregate into a plain file cannot be planned; an upsert sink can
        rc, out, err = cl.sql(PRE + 'CREATE TEMPORARY TABLE x (a INT) WITH (\'connector\' = \'blackhole\');\n' + explain_version(SNIPS[('m2-bug', 'code')]['code']), 'bug_m2_code')
        expect(not sql_ok(out) and "doesn't support consuming update changes" in out, 'm2-bug (code): the planner refuses an aggregate for a file sink: %s' % sql_error(out), 'bug hunts run')
        rc, out, err = cl.sql(PRE + explain_version(SNIPS[('m2-bug', 'fix')]['code']), 'bug_m2_fix')
        expect(sql_ok(out) and 'Optimized Physical Plan' in out, 'm2-bug (fix): the planner accepts the upsert sink: %s' % sql_error(out), 'bug hunts run')
        # m3: a window on a column that is not a time attribute is refused; with a watermark it is accepted
        win = "SELECT window_start, COUNT(*) FROM TABLE(TUMBLE(TABLE orders, DESCRIPTOR(ts), INTERVAL '1' MINUTE)) GROUP BY window_start, window_end;\n"
        for kind in ('code', 'fix'):
            rc, out, err = cl.sql("SET 'sql-client.execution.result-mode' = 'tableau';\n" + SNIPS[('m3-bug', kind)]['code'].replace("'connector' = 'kafka', 'topic' = 'orders', 'format' = 'json'", "'connector' = 'datagen'").replace('CREATE TABLE', 'CREATE TEMPORARY TABLE') + ';\nEXPLAIN ' + win, 'bug_m3_' + kind)
            if kind == 'code':
                expect(not sql_ok(out) and 'time attribute' in out, 'm3-bug (code): a window on a column with no watermark is refused: %s' % sql_error(out), 'bug hunts run')
            else:
                expect(sql_ok(out) and 'Optimized Physical Plan' in out, 'm3-bug (fix): with the watermark the window is accepted: %s' % sql_error(out), 'bug hunts run')
        # m4: the script has no checkpoint interval; the fix has one (the loss of a TaskManager under it was recorded in mission 4)
        expect('checkpointing.interval' not in SNIPS[('m4-bug', 'code')]['code'] and 'checkpointing.interval' in SNIPS[('m4-bug', 'fix')]['code'], 'm4-bug: the fix adds the checkpoint interval', 'bug hunts run')
        for kind in ('code', 'fix'):
            rc, out, err = cl.sql(explain_version(SNIPS[('m4-bug', kind)]['code']), 'bug_m4_' + kind)
            expect(sql_ok(out) and 'Optimized Physical Plan' in out, 'm4-bug (%s): the planner accepts the script: %s' % (kind, sql_error(out)), 'bug hunts run')
        # m5: an upsert-kafka table with no primary key is refused when it is used
        rc, out, err = cl.sql(PRE + SNIPS[('m5-bug', 'code')]['code'] + ';\nEXPLAIN INSERT INTO counts SELECT store_id, COUNT(*) FROM orders GROUP BY store_id;', 'bug_m5_code')
        expect(not sql_ok(out) and 'PRIMARY KEY' in out, 'm5-bug (code): upsert-kafka without a primary key is refused: %s' % sql_error(out), 'bug hunts run')
        rc, out, err = cl.sql(PRE + SNIPS[('m5-bug', 'fix')]['code'] + ';\nEXPLAIN INSERT INTO counts SELECT store_id, COUNT(*) FROM orders GROUP BY store_id;', 'bug_m5_fix')
        expect(sql_ok(out) and 'Optimized Physical Plan' in out, 'm5-bug (fix): with the primary key the sink is accepted: %s' % sql_error(out), 'bug hunts run')
        # m6: the join with no time bound is a plain Join that keeps both sides; the fix is an IntervalJoin when the two time columns are time attributes, and a plain Join when they are not
        pre6 = ("CREATE TEMPORARY TABLE paid_orders (order_id INT, total_cents INT, how_paid STRING) WITH ('connector' = 'blackhole');\n"
                "CREATE TEMPORARY TABLE orders (order_id INT, total_cents INT, ts TIMESTAMP(3)%(wm1)s) WITH ('connector' = 'datagen');\n"
                "CREATE TEMPORARY TABLE payments (order_id INT, how_paid STRING, ts TIMESTAMP(3)%(wm2)s) WITH ('connector' = 'datagen');\n")
        wm = {'wm1': ", WATERMARK FOR ts AS ts - INTERVAL '5' SECOND", 'wm2': ", WATERMARK FOR ts AS ts - INTERVAL '5' SECOND"}
        for label, kind, pre, op in (('code', 'code', wm, 'Join('), ('fix, time columns with a watermark', 'fix', wm, 'IntervalJoin('), ('fix, plain timestamp columns', 'fix', {'wm1': '', 'wm2': ''}, 'Join(')):
            rc, out, err = cl.sql(pre6 % pre + explain_version(SNIPS[('m6-bug', kind)]['code']), 'bug_m6_' + kind + str(len(pre['wm1'])))
            phys = out[out.index('== Optimized Physical Plan =='):].split('== Optimized Execution Plan ==')[0] if 'Optimized Physical Plan' in out else out
            joins = [l.strip() for l in phys.splitlines() if re.search(r'\b(Interval)?Join\(', l)]
            if op == 'Join(':
                expect(sql_ok(out) and joins and 'NoUniqueKey' in joins[0] and 'IntervalJoin' not in joins[0], 'm6-bug (%s): the plan is a plain Join that keeps both sides: %s' % (label, sql_error(out)), 'bug hunts run')
            else:
                expect(sql_ok(out) and joins and joins[0].startswith('+- IntervalJoin('), 'm6-bug (%s): the plan is an IntervalJoin: %s' % (label, sql_error(out)), 'bug hunts run')
        # a column called "method" is a reserved word: the scripts of the course must not use one (this is the control that found it)
        rc, out, err = cl.sql("CREATE TEMPORARY TABLE payments (order_id INT, method STRING) WITH ('connector' = 'datagen');", 'control_reserved')
        control('a column named method, which is a reserved word of Flink SQL', lambda: not sql_ok(out))
        rc, out, err = cl.sql('SELEC 1;', 'control_syntax')
        control('SQL that does not parse', lambda: not sql_ok(out))
        rc, out, err = cl.sql(PRE + 'CREATE TEMPORARY TABLE ev (ts TIMESTAMP(3), n INT) WITH (\'connector\' = \'datagen\');\nSELECT window_start, COUNT(*) FROM TABLE(TUMBLE(TABLE ev, DESCRIPTOR(ts), INTERVAL \'1\' MINUTE)) GROUP BY window_start, window_end;', 'control_timecol')
        control('a window on a column that is not a time attribute', lambda: not sql_ok(out))
        # a table with one cell changed must not equal the recording
        changed = json.loads(json.dumps(REAL['tables']['sql.stream_group']))
        changed['rows'][4][3] = str(int(changed['rows'][4][3]) + 1)
        control('a result table with one number changed', lambda: not tables_equal(changed, REAL['tables']['sql.stream_group'], True))

        # ---- the SQL coding round, run again: the solution of the course, against the file of fourteen orders
        sol = SNIPS[('m9-ch', 'sol')]['code']
        script = "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\n" + sol.rstrip().rstrip(';') + ';\n'
        rc, out, err = cl.sql(script.replace('file:///data/events14.jsonl', 'file:///data/events14.jsonl'), 'round_sql')
        ts = fx.tables(out)
        expect(bool(ts) and tables_equal(ts[-1], REAL['tables']['time.tumble_10'], True), 'the SQL coding round: the solution prints the recorded windows (a delay of 10 seconds)', 'coding rounds run')
        want = {}
        ev = [(r[1], r[3], r[4]) for r in REAL['tables']['time.events']['rows']]
        # plain Python: the windows of a watermark that waits 10 seconds, counting an order late when the watermark before it had passed the end of its window
        wm_now, win = None, {}
        for oid, cents, at in ev:
            h, m, s = map(int, at.split(':'))
            t = h * 3600 + m * 60 + s
            start = t - t % 60
            if wm_now is None or wm_now < start + 60:
                a = win.setdefault(start, [0, 0])
                a[0] += 1
                a[1] += cents
            wm_now = t - 10 if wm_now is None else max(wm_now, t - 10)
        expect([[r[3], r[4]] for r in ts[-1]['rows']] == [[str(v[0]), str(v[1])] for k, v in sorted(win.items())] if ts else False, 'the SQL coding round: the windows equal a plain Python computation', 'coding rounds run')

        # ---- the DataStream coding round, run again: the Java of the course is compiled, run on the cluster, and its output compared with the recording and with plain Python
        if HAVE_JAVA and HAVE_KJAR:
            import s_datastream as D
            work = f.work / 'round'
            work.mkdir(exist_ok=True)
            (work / 'PassThousand.java').write_text(SNIPS[('m9-ch2', 'sol')]['code'] + '\n')
            classes = work / 'classes'
            classes.mkdir(exist_ok=True)
            r = javac([work / 'PassThousand.java'], classes)
            expect(r.returncode == 0, 'the DataStream coding round: the Java of the course compiles: %s' % clean_err(r.stderr)[:300], 'coding rounds run')
            if r.returncode == 0:
                jar = work / 'round.jar'
                run(['jar', 'cf', str(jar), '-C', str(classes), '.'], env=TOOL_ENV)
                mark = f.out_mark()
                rc, out, err = f.cli('run', '-d', '-p', '2', '-c', 'brewline.PassThousand', str(jar))
                m = re.search(r'JobID (\w{32})', out + err)
                expect(m is not None, 'the DataStream coding round: flink run submitted the job: %s' % (out + err)[:200], 'coding rounds run')
                if m:
                    f.wait_state(m.group(1), 'FINISHED', timeout=90)
                    import time
                    time.sleep(2)
                    lines = sorted(re.sub(r'^\d+> ', '', l) for l in f.out_since(mark).splitlines() if ' passed ' in l)
                    expect(lines == D.round_truth(), 'the DataStream coding round: the job prints what a plain Python computation gives: %s' % lines, 'coding rounds run')
                    expect(lines == [r[0] for r in REAL['tables']['datastream.round_output']['rows']], 'the DataStream coding round: the job prints the recorded lines', 'coding rounds run')
        else:
            skipped('the DataStream coding round', 'javac or the Kafka connector jar is not available')
        # a changelog replayed gives the batch table of the recording, and a changelog with one number changed does not (the rule that mission 2 teaches)
        import s_sql as S
        batch = sorted([list(map(str, r)) for r in REAL['tables']['sql.batch_group']['rows']])
        chg = [(r[0], tuple(r[1:])) for r in REAL['tables']['sql.stream_group']['rows']]
        replayed = lambda c: sorted([list(map(str, row)) for row in S.replay(c).values()])      # noqa: E731
        expect(replayed(chg) == batch, 'replaying the recorded changelog gives the recorded batch table', 'sql results compared with the recording')
        chg_bad = list(chg)
        op, row = chg_bad[-1]
        chg_bad[-1] = (op, row[:2] + (str(int(row[2]) + 1),))
        control('a changelog with one number changed', lambda: replayed(chg_bad) != batch)
        # the plans that the lessons describe: deduplication, a Top-N for another rank, the STATE_TTL hint, and the CDC source in the two changelog modes
        dd = ("CREATE TEMPORARY TABLE orders (order_id INT, total_cents INT, ts AS PROCTIME()) WITH ('connector' = 'datagen');\n"
              "CREATE TEMPORARY TABLE sink (order_id INT, total_cents INT) WITH ('connector' = 'blackhole');\n")
        for rn, want in ((1, 'Deduplicate('), (2, 'Rank(')):
            rc, out, err = cl.sql(dd + 'EXPLAIN INSERT INTO sink SELECT order_id, total_cents FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY ts) AS rn FROM orders) WHERE rn = %d;' % rn, 'plan_rn%d' % rn)
            expect(sql_ok(out) and want in out, 'ROW_NUMBER with rn = %d runs as %s: %s' % (rn, want[:-1], sql_error(out)), 'sql scripts planned')
        rc, out, err = cl.sql(PRE + "CREATE TEMPORARY TABLE payments (order_id INT, how_paid STRING) WITH ('connector' = 'datagen');\nCREATE TEMPORARY TABLE sink (order_id INT, how_paid STRING) WITH ('connector' = 'blackhole');\n"
                              "EXPLAIN INSERT INTO sink SELECT /*+ STATE_TTL('o' = '3d', 'p' = '1d') */ o.order_id, p.how_paid FROM orders o JOIN payments p ON o.order_id = p.order_id;", 'plan_ttl_hint')
        expect(sql_ok(out) and 'Optimized Physical Plan' in out, 'the STATE_TTL hint on a join is accepted: %s' % sql_error(out), 'sql scripts planned')
        if HAVE_CDC:
            for name, key in (('cdc_explain_full', 'cdc.plan_full'), ('cdc_explain_upsert', 'cdc.plan_upsert')):
                script = sql_files.get('%s.sql' % name)
                if script is None:
                    skipped(name, 'not in the recording')
                    continue
                rc, out, err = cl.sql(script, 'v_' + name, jars=[CDC_JAR])
                phys = out[out.index('== Optimized Physical Plan =='):].split('== Optimized Execution Plan ==')[0] if 'Optimized Physical Plan' in out else out
                got = fx.norm('\n'.join(l.rstrip() for l in phys.splitlines()[1:] if l.strip()), f)
                expect(got == REAL['text'][key], '%s: the plan of the CDC source is the recorded plan' % name, 'sql results compared with the recording')
    finally:
        cl.close()


def kafka_checks():
    """The Java job StoreWatch on 600 orders, with a Kafka broker of its own: its totals are the truth."""
    import cluster as C
    import fcluster as F
    import fx
    import kx
    import s_datastream as D
    import time
    with C.Cluster(nodes=1, heap='512m', base_port=19192) as kc, F.Flink(jars=[KAFKA_JAR], rest_port=18181) as f:
        work = f.work / 'build'
        jar, classes, cp = D.compile_jar(f, work)
        boot = kc.bootstrap
        fx.fresh_topic(kx, boot, 'orders_v', partitions=2)
        p = kx.producer(boot, **{'linger.ms': 5})
        for i in range(600):
            o = kx.order(i)
            p.produce('orders_v', key=o['store_id'], value=json.dumps({k: o[k] for k in ('order_id', 'store_id', 'total_cents')}, separators=(',', ':')))
        p.flush(60)
        mark = f.out_mark()
        rc, out, err = f.cli('run', '-d', '-p', '2', '-c', 'brewline.StoreWatch', str(jar), '--bootstrap', boot, '--topic', 'orders_v', '--idle-seconds', '5')
        jid = re.search(r'JobID (\w{32})', out + err).group(1)
        f.wait_state(jid, 'RUNNING')
        t0 = time.time()
        while time.time() - t0 < 90:
            printed = f.out_since(mark)
            idle = sorted(re.findall(r'idle (s\d\d) orders=(\d+) cents=(\d+)', printed))
            if len(idle) >= 12:
                break
            time.sleep(1)
        want = fx.expected_totals(kx, 600)
        expect({k: (int(a), int(b)) for k, a, b in idle} == {k: tuple(v) for k, v in want.items()}, 'StoreWatch on 600 orders prints the totals of the truth for all 12 stores', 'java job runs')
        subtasks = D.subtasks(printed)
        kg = {r[0]: r[2] for r in REAL['tables']['datastream.key_groups']['rows']}
        expect(len(subtasks) == 12 and all(subtasks[k] == kg[k] for k in subtasks), 'every store is held by the task that KeyGroupRangeAssignment names at parallelism 2', 'java job runs')
        f.cancel(jid)


if HAVE_FLINK and HAVE_JAVA and RUN:
    try:
        live_checks()
    except Exception as e:  # noqa: BLE001
        bad('the live checks stopped: %s: %s' % (type(e).__name__, str(e)[:500]))
else:
    skipped('the real cluster (SQL scripts, bug hunts and coding rounds)', 'FLINK_HOME or Java is not available, or a run is not wanted')
if HAVE_FLINK and HAVE_JAVA and HAVE_KAFKA and HAVE_KJAR and have('confluent_kafka') and RUN and not args.no_live:
    try:
        kafka_checks()
    except Exception as e:  # noqa: BLE001
        bad('the Kafka checks stopped: %s: %s' % (type(e).__name__, str(e)[:500]))
else:
    skipped('the Java job on a Kafka topic', 'KAFKA_HOME, confluent-kafka, the Kafka connector jar or Java is not available, or --no-live was given')

# ======================================================================================================================
# 9. The recording made again
# ======================================================================================================================
# What may differ between two recordings, and why. Everything else must be the same, number for number.
VOLATILE = {                                   # the whole item may differ
    'text:state.savepoint_command': 'the folder of a savepoint is named with random hex digits',
    'files:sql/sp_2.sql': 'the script names the folder of that savepoint, which has a random name',
    'files:sql/sp_4.sql': 'the script names the folder of that savepoint, which has a random name',
    'tables:state.backends': 'the size of the state at a checkpoint depends on how many order ids the job had read when the checkpoint began; the same two sizes appeared in a different order in two recordings. '
                             'check_widgets.js checks what the lessons rely on: the heap and full RocksDB checkpoints write all their state, the incremental one writes less',
    'tables:joins.state_size': 'the size at the first checkpoint depends on how many rows had been read; the step of the join with no bound (88,000 bytes for every checkpoint) is the same, and check_widgets.js checks it',
    'tables:running.metrics_p1': 'milliseconds of each second and the counters of a job that had run for about 30 seconds',
    'tables:running.metrics_p4': 'milliseconds of each second and the counters of a job that had run for about 30 seconds',
}
VOLATILE_FIELDS = {                            # only these fields of the item may differ
    'counts:state.a_result': ['checkpoints_completed', 'checkpoints_failed'],                          # how many checkpoints finished and failed around the kill depends on when it landed
    'counts:state.copy_alo': ['duplicates', 'records_a_read_committed_reader_sees', 'records_in_the_log'],      # the orders written between the checkpoint and the kill: a few seconds' worth
    'counts:state.copy_eo': ['records_in_the_log', 'records_of_aborted_transactions'],                  # the same orders, in the transaction that was aborted
    'counts:state.changed_query': ['message'],                                                          # the two serializers in the message are printed with their hash codes
    'counts:state.backends_summary': ['rocksdb_full_written_6', 'rocksdb_incremental_state_6', 'rocksdb_incremental_written_6'],
    'counts:joins.state_summary': ['regular_first', 'regular_last', 'interval_first', 'interval_last', 'interval_max', 'ttl_last', 'ttl_max', 'ratio_regular_to_interval_last'],
    'counts:running.rate_p1': ['records_per_second', 'records_counted'],                                # a rate measured over 18 seconds: within a few percent of the ceiling of 100
    'counts:running.rate_p4': ['records_per_second', 'records_counted'],
    'counts:running.compare': ['records_per_second_with_1', 'records_per_second_with_4', 'ratio'],
    'counts:connect.files_rows': ['rows_in_visible_files'],                                            # the rows that the finished files hold depend on when the checkpoints completed
}
ORDER_FREE = []                                # tables whose rows may arrive in another order


def flatten(real):
    out = {}
    for kind in ('counts', 'tables', 'text', 'files'):
        for k, v in real[kind].items():
            out[kind + ':' + k] = v
    return out


def same_item(k, a, b):
    """True when the two recordings of one item agree, apart from what is allowed to differ. The second value says what was allowed, or None."""
    if a == b:
        return True, None
    if k in VOLATILE:
        return True, VOLATILE[k]
    if k in VOLATILE_FIELDS and isinstance(a, dict) and isinstance(b, dict):
        keep = VOLATILE_FIELDS[k]
        if {f: v for f, v in a.items() if f not in keep} == {f: v for f, v in b.items() if f not in keep}:
            return True, 'the fields %s vary' % ', '.join(keep)
    if k in ORDER_FREE and isinstance(a, dict) and isinstance(b, dict):
        if a.get('cols') == b.get('cols') and sorted(map(json.dumps, a.get('rows', []))) == sorted(map(json.dumps, b.get('rows', []))):
            return True, 'the same rows in another order'
    return False, None


if args.recapture and RUN:
    if not (HAVE_FLINK and HAVE_JAVA and HAVE_KAFKA and HAVE_KJAR and have('confluent_kafka')):
        skipped('recapture', 'FLINK_HOME, KAFKA_HOME, FLINK_KAFKA_JAR, Java and confluent-kafka are needed')
    else:
        tmp = pathlib.Path(tempfile.mkdtemp(prefix='flink-recapture-')) / 'real.js'
        cmd = [sys.executable, str(HERE / 'capture_flink.py'), '--out', str(tmp)] + (['--only', args.only] if args.only else [])
        r = run(cmd, env=dict(os.environ))
        if r.returncode or not tmp.exists():
            bad('capture_flink.py failed: ' + (r.stdout + r.stderr)[-800:])
        else:
            again, first = flatten(load_real(tmp)), flatten(REAL)
            wanted = {x.strip() for x in args.only.split(',')} if args.only else None
            prefix = lambda k: k.split(':', 1)[1].split('.')[0]          # noqa: E731
            differ = []
            for k in sorted(set(first) | set(again)):
                if wanted is not None and prefix(k) not in wanted:
                    continue
                tick('recaptured items')
                ok, why = same_item(k, first.get(k), again.get(k))
                if not ok:
                    differ.append(k)
                elif why:
                    tick('recaptured items that differ for a stated reason')
                    notes.append('%s differs, as allowed: %s' % (k, why))
            for k in differ:
                bad('the recapture differs from js/real.js in %s' % k)
            print('recapture: %d items, %d differ for a stated reason, %d differ without one' % (counts.get('recaptured items', 0), counts.get('recaptured items that differ for a stated reason', 0), len(differ)))
            if not args.only:
                # the numbers that were allowed to differ must still satisfy every rule that the lessons and the labs rely on
                r = run(['node', str(HERE / 'check_widgets.js')], cwd=str(ROOT), env=dict(os.environ, FLINK_REAL_JS=str(tmp)))
                expect(r.returncode == 0, 'check_widgets.js passes on the new recording: ' + (r.stdout + r.stderr)[-400:], 'recapture checks')
                m = re.search(r'(\d+) checks', r.stdout)
                tick('lab data checks on the new recording', int(m.group(1)) if m else 0)
else:
    skipped('recapture', 'run with --recapture (about forty minutes)')

# ======================================================================================================================
# 10. The checks of the lab data, the lint, and controls for the checkers
# ======================================================================================================================
if RUN:
    r = run(['node', str(HERE / 'check_widgets.js')], cwd=str(ROOT))
    expect(r.returncode == 0, 'check_widgets.js passes: ' + (r.stdout + r.stderr)[-400:], 'lab checks')
    m = re.search(r'(\d+) checks', r.stdout)
    tick('lab data checks', int(m.group(1)) if m else 0)
    text = (ROOT / 'flink' / 'js' / 'real.js').read_text()
    for label, old, new in (('a changed number of dropped orders', '"75": 1', '"75": 2'),
                            ('a changed count of tasks for parallelism 4', '"parallelism": 4,\n    "parallelism": 4', None),
                            ('a changed size of the state of the unbounded join', '"regular_first": ', '"regular_first": 1')):
        if new is None or old not in text:
            if new is not None:
                notes.append('control "%s" was skipped: the text to change is not in js/real.js' % label)
            continue
        tmp = pathlib.Path(tempfile.mkdtemp(prefix='flink-control-')) / 'real.js'
        tmp.write_text(text.replace(old, new, 1))
        env = dict(os.environ, FLINK_REAL_JS=str(tmp))
        control(label, lambda env=env: run(['node', str(HERE / 'check_widgets.js')], cwd=str(ROOT), env=env).returncode != 0)
    # more controls on the recording: change one number in a table and in a count
    data = load_real(ROOT / 'flink' / 'js' / 'real.js')
    mutations = [('the cluster has five slots', lambda d: d['counts']['world.cluster'].__setitem__('slots_total', 5)),
                 ('a changed cell of the changelog of the count for each store', lambda d: d['tables']['sql.stream_group']['rows'][3].__setitem__(3, '9999')),
                 ('a duplicate in the exactly-once run', lambda d: d['counts']['state.copy_eo'].__setitem__('duplicates', 1)),
                 ('a key group that is wrong', lambda d: d['tables']['datastream.key_groups']['rows'][0].__setitem__(1, 5)),
                 ('a rate above the ceiling of the slow step', lambda d: d['counts']['running.rate_p1'].__setitem__('records_per_second', 140)),
                 ('a window count that is wrong', lambda d: d['tables']['time.tumble_10']['rows'][0].__setitem__(3, 5))]
    for label, mutate in mutations:
        d2 = json.loads(json.dumps(data))
        try:
            mutate(d2)
        except (KeyError, IndexError):
            notes.append('control "%s" was skipped: the item is not in js/real.js' % label)
            continue
        tmp = pathlib.Path(tempfile.mkdtemp(prefix='flink-control-')) / 'real.js'
        tmp.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(d2) + ';\n')
        env = dict(os.environ, FLINK_REAL_JS=str(tmp))
        control(label, lambda env=env: run(['node', str(HERE / 'check_widgets.js')], cwd=str(ROOT), env=env).returncode != 0)
    r = run(['node', str(ROOT / 'dev' / 'lint-content.js'), 'flink'], cwd=str(ROOT))
    expect(r.returncode == 0, 'the lint of the course is clean: ' + (r.stdout + r.stderr)[-400:], 'lint runs')
    m = re.search(r'chapters: (\d+) scenes: (\d+)', r.stdout)
    if m:
        notes.append('lint: %s chapters, %s scenes' % (m.group(1), m.group(2)))
    if args.browser:
        if (ROOT / 'flink' / 'verify' / 'e2e_labs.js').exists():
            r = run(['node', str(HERE / 'e2e_labs.js')], cwd=str(ROOT))
            expect(r.returncode == 0, 'e2e_labs.js passes: ' + (r.stdout + r.stderr)[-600:], 'browser lab tests')
            m = re.search(r'(\d+) checks passed', r.stdout)
            tick('browser lab checks', int(m.group(1)) if m else 0)
        else:
            skipped('the labs in a browser', 'flink/verify/e2e_labs.js does not exist')
    else:
        skipped('the labs in a browser', 'run with --browser (needs Playwright and Chromium)')
else:
    skipped('lab data checks, lint', 'a run is not wanted')

# ======================================================================================================================
print()
print('checked:', ', '.join('%d %s' % (v, k) for k, v in sorted(counts.items())))
for n in notes[:40]:
    print('note:', n)
for sk in skips:
    print('skipped:', sk)
if problems:
    print('%d PROBLEM(S)' % len(problems))
    sys.exit(1)
print('verify_fl: all checks passed')
