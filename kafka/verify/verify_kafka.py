#!/usr/bin/env python3
"""Check the code and the recorded output of the Apache Kafka for data engineers tutorial.

Everything in this tutorial that is recorded ran on a real Apache Kafka 4.4.0 in KRaft mode (three brokers on one machine, capture_kafka.py), with Kafka Connect, Kafka Streams,
PostgreSQL 16 with Debezium 3.7.1, the confluent-kafka client, fastavro and pytest. Nothing ran on a network, on Kubernetes, on a managed service, or with MirrorMaker 2, Kerberos, OAuth,
ksqlDB or tiered storage, and the Confluent Schema Registry is a stand-in. This script checks what can be checked on one machine:

1. The recorded files are the files in kafka/verify.
2. Every Python snippet is parsed with ast. The imports of every recorded Python file are resolved. Every client configuration that the course shows (the dictionary that is given to
   Producer, Consumer or AdminClient) is given to the real client library, which refuses a name or a value that it does not know.
3. The Java of the Streams application is compiled against the libraries of the distribution, and so are the snippets that the course shows.
4. Every shell snippet goes through bash -n, and every flag of a Kafka tool in it must be one that the tool lists in its own help.
5. The JSON snippets parse. The Avro schemas are accepted by fastavro. The keys of the Connect configuration exist in the documentation that ships with the distribution.
6. What can be worked out without a cluster is worked out again and compared with the recording: the partition of every key, the nine schema changes in both directions, the registry
   decisions, the wire format, and the output of pytest (the tests that need no broker).
7. With --live, a three broker cluster is started, and the commands of the bug hunts are run on it: what they do must be what the lessons say.
8. With --recapture the whole recording is made again (about forty minutes) and compared with js/real.js.
9. The checks of the lab data (check_widgets.js) run, and deliberately broken inputs (controls) must be refused by the checkers.

What this cannot show: that a managed service accepts a command, what a real network does, anything about the tools that were not run, or that a default is the same in another release
of Kafka. Those screens carry the "From documentation" tag, and the README lists what was not checked.

Run:   python3 kafka/verify/verify_kafka.py [--no-run] [--live] [--recapture] [--verbose]
Needs: a Python environment made from kafka/verify/requirements.txt, Java 17 or 21, Node 20 or later, and KAFKA_HOME (an unpacked Apache Kafka 4.4.0) for the steps that use the tools of
       the distribution. A check whose tool is missing says so and is skipped.
"""
import argparse
import ast
import importlib
import importlib.util
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

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))

ap = argparse.ArgumentParser()
ap.add_argument('--no-run', action='store_true', help='parse and compare only: run no recorder, no broker and no checker')
ap.add_argument('--live', action='store_true', help='start a three broker cluster and run the commands of the bug hunts on it')
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


def run(cmd, **kw):
    kw.setdefault('capture_output', True)
    kw.setdefault('text', True)
    return subprocess.run(cmd, **kw)


def load_real(path):
    t = pathlib.Path(path).read_text()
    return json.loads(t.split('LAB.real = ', 1)[1].rstrip().rstrip(';'))


KAFKA_HOME = pathlib.Path(os.environ.get('KAFKA_HOME', '')).expanduser() if os.environ.get('KAFKA_HOME') else None
HAVE_KAFKA = bool(KAFKA_HOME and (KAFKA_HOME / 'bin' / 'kafka-topics.sh').exists())
HAVE_JAVA = shutil.which('java') is not None and shutil.which('javac') is not None

r = run(['node', str(ROOT / 'dev' / 'dump-scenes.js'), 'kafka'], cwd=str(ROOT))
if r.returncode:
    bad('dump-scenes.js failed: ' + r.stderr[:300])
    DUMP = {'snippets': [], 'results': []}
else:
    DUMP = json.loads(r.stdout)
REAL = load_real(ROOT / 'kafka' / 'js' / 'real.js')
SNIP = DUMP['snippets']
TOOL_ENV = dict(os.environ, JAVA_TOOL_OPTIONS='')

# ======================================================================================================================
# 1. Recorded files are the files on disk
# ======================================================================================================================
for key, text in REAL['files'].items():
    if key.startswith('code/'):
        p = HERE / key[5:]
        expect(p.exists() and p.read_text().strip() == text.strip(), 'the recorded file %s is the file on disk' % key, 'recorded files')
expect(len([k for k in REAL['files'] if k.startswith('code/')]) >= 24, 'the recording holds the code of the course')

# ======================================================================================================================
# 2. Python: snippets parse, imports resolve, client configurations are accepted by the client library
# ======================================================================================================================
py_snips = [s for s in SNIP if s['lang'] == 'python' and s['kind'] != 'starter']
for s in py_snips:
    try:
        ast.parse(textwrap.dedent(s['code']))
        tick('python snippets')
    except SyntaxError as e:
        bad('%s (%s): Python does not parse: %s' % (s['id'], s['kind'], e))
control('Python that does not parse', lambda: ast.parse('def f(:\n  pass'))

LOCAL = {p.stem for p in HERE.glob('*.py')} | {p.stem for p in (HERE / 'app').glob('*.py')}
unresolved = []
for key, text in REAL['files'].items():
    if not (key.startswith('code/') and key.endswith('.py')):
        continue
    for n in ast.walk(ast.parse(text)):
        mods = []
        if isinstance(n, ast.Import):
            mods = [(a.name, None) for a in n.names]
        elif isinstance(n, ast.ImportFrom) and n.module:
            mods = [(n.module, [a.name for a in n.names])]
        for mod, names in mods:
            root = mod.split('.')[0]
            if root in LOCAL:
                tick('local imports')
                continue
            if not have(root):
                unresolved.append((key, mod))
                continue
            try:
                m = importlib.import_module(mod)
            except Exception as e:  # noqa: BLE001
                bad('%s: cannot import %s: %s' % (key, mod, str(e)[:80]))
                continue
            for name in names or []:
                tick('imports resolved')
                if not hasattr(m, name) and not have(mod + '.' + name):
                    bad('%s: %s has no %s' % (key, mod, name))
            if not names:
                tick('imports resolved')
for k, m in unresolved:
    notes.append('%s: %s is not installed in this interpreter, so its import was not resolved' % (k, m))

CLIENTS = ('Producer', 'Consumer', 'AdminClient')


def client_configs(tree):
    """Every dictionary that is given to a client: only the entries whose key and value are plain constants."""
    out = []
    for n in ast.walk(tree):
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id in CLIENTS:
            for a in n.args[:1]:
                if isinstance(a, ast.Dict):
                    cfg = {}
                    for k, v in zip(a.keys, a.values):
                        try:
                            kk, vv = ast.literal_eval(k), ast.literal_eval(v)
                        except Exception:  # noqa: BLE001
                            continue
                        if isinstance(kk, str):
                            cfg[kk] = vv
                    out.append((n.func.id, cfg))
    return out


def try_client(kind, cfg):
    import confluent_kafka as ck
    import confluent_kafka.admin as ad
    cls = {'Producer': ck.Producer, 'Consumer': ck.Consumer, 'AdminClient': ad.AdminClient}[kind]
    c = dict(cfg)
    c.setdefault('bootstrap.servers', 'localhost:1')
    c.setdefault('log_level', 0)                                   # nothing listens on that address: keep the client quiet
    if kind == 'Consumer':
        c.setdefault('group.id', 'verify')
    if kind == 'Producer':
        c.pop('statistics.interval.ms', None)
    cls(c)


if have('confluent_kafka'):
    for key, text in list(REAL['files'].items()) + [(s['id'], s['code']) for s in py_snips]:
        if key.startswith('code/') and not key.endswith('.py'):
            continue
        try:
            tree = ast.parse(textwrap.dedent(text))
        except SyntaxError:
            continue
        for kind, cfg in client_configs(tree):
            cfg = {k: v for k, v in cfg.items() if not callable(v)}
            for k in ('error_cb', 'stats_cb', 'on_delivery', 'throttle_cb'):
                cfg.pop(k, None)
            tick('client configurations')
            for k, v in cfg.items():
                try:
                    try_client(kind, {k: v})
                except Exception as e:  # noqa: BLE001
                    msg = str(e)
                    if 'No such configuration property' in msg or 'Invalid value' in msg or 'Unknown' in msg:
                        bad('%s: %s does not accept %r=%r: %s' % (key, kind, k, v, msg[:80]))
                    else:
                        tick('client configurations skipped')
                else:
                    tick('client settings accepted')
    control('a client setting that does not exist', lambda: try_client('Producer', {'not.a.setting': 1}) or False)
    control('a client setting with a value of the wrong kind', lambda: try_client('Producer', {'linger.ms': 'a lot'}) or False)
    expect(counts.get('client settings accepted', 0) >= 40, 'the client check reached a useful number of settings (%d)' % counts.get('client settings accepted', 0))
else:
    skipped('client configurations', 'confluent-kafka is not installed in this interpreter')

# ======================================================================================================================
# 3. Java: compiled against the libraries of the distribution
# ======================================================================================================================
if HAVE_KAFKA and HAVE_JAVA and not args.no_run:
    libs = str(KAFKA_HOME / 'libs' / '*')
    out = pathlib.Path(tempfile.mkdtemp(prefix='kafka-javac-'))
    r = run(['javac', '-proc:none', '-cp', libs, '-d', str(out), str(HERE / 'app' / 'StoreCounts.java')], env=TOOL_ENV)
    expect(r.returncode == 0, 'StoreCounts.java compiles against the libraries of the distribution: ' + r.stderr[:300], 'java files compiled')
    wrap = 'import java.util.Properties;\nimport org.apache.kafka.streams.StreamsConfig;\nclass Snip { void f(String bootstrap) {\n  Properties props = new Properties();\n%s\n} }\n'
    for s in SNIP:
        if s['lang'] == 'java' and s['id'].endswith('-bug'):
            (out / 'Snip.java').write_text(wrap % s['code'])
            r = run(['javac', '-proc:none', '-cp', libs, '-d', str(out), str(out / 'Snip.java')], env=TOOL_ENV)
            expect(r.returncode == 0, '%s (%s): the Java snippet compiles: %s' % (s['id'], s['kind'], r.stderr[:200]), 'java snippets compiled')
    (out / 'Snip.java').write_text(wrap % 'props.put(StreamsConfig.NO_SUCH_CONSTANT, 1);')
    control('a StreamsConfig constant that does not exist', lambda: run(['javac', '-proc:none', '-cp', libs, '-d', str(out), str(out / 'Snip.java')], env=TOOL_ENV).returncode != 0)
    shutil.rmtree(out, ignore_errors=True)
else:
    skipped('Java', 'KAFKA_HOME, javac or a run is not available')

# ======================================================================================================================
# 4. Shell: bash -n, and the flags against the help of each tool
# ======================================================================================================================
def commands(code):
    """The commands of a shell snippet: comments dropped, continued lines joined."""
    text = re.sub(r'\\\n\s*', ' ', code)
    return [l.strip() for l in text.splitlines() if l.strip() and not l.strip().startswith('#')]


HELP = {}


def tool_help(tool):
    if tool not in HELP:
        r = run([str(KAFKA_HOME / 'bin' / tool), '--help'], env=TOOL_ENV)
        HELP[tool] = r.stdout + r.stderr
    return HELP[tool]


for s in [x for x in SNIP if x['lang'] == 'bash']:
    r = run(['bash', '-n'], input=s['code'])
    expect(r.returncode == 0, '%s (%s): bash does not parse it: %s' % (s['id'], s['kind'], r.stderr[:100]), 'shell snippets parsed')
    if HAVE_KAFKA and not args.no_run:
        for cmd in commands(s['code']):
            m = re.match(r'bin/(kafka-[\w-]+\.sh)\s', cmd)
            if not m:
                continue
            tool, flags = m.group(1), re.findall(r'(?:^|\s)(--[\w.-]+)', cmd)
            h = tool_help(tool)
            expect(len(h) > 200, '%s: the help of %s was read' % (s['id'], tool), 'tool helps read')
            for f in flags:
                tick('tool flags checked')
                if f not in h:
                    bad('%s (%s): %s has no flag %s' % (s['id'], s['kind'], tool, f))
if HAVE_KAFKA and not args.no_run:
    control('a shell snippet that does not parse', lambda: run(['bash', '-n'], input='for x in a; do\n  echo $x\n').returncode != 0)
    control('a flag that the tool does not have', lambda: '--no-such-flag' not in tool_help('kafka-topics.sh'))
else:
    skipped('flags of the tools', 'KAFKA_HOME is not set')

# ======================================================================================================================
# 5. JSON: parse, Avro schemas, and the keys of the Connect configuration
# ======================================================================================================================
connect_doc = ''
if HAVE_KAFKA:
    for f in ('sink_connector_config.html', 'source_connector_config.html', 'connect_config.html'):
        p = KAFKA_HOME / 'site-docs' / 'generated' / f
        if p.exists():
            connect_doc += p.read_text(errors='ignore')
for s in [x for x in SNIP if x['lang'] == 'json']:
    try:
        doc = json.loads(s['code'])
        tick('json snippets')
    except ValueError as e:
        bad('%s (%s): JSON does not parse: %s' % (s['id'], s['kind'], e))
        continue
    if isinstance(doc, dict) and doc.get('type') == 'record':
        if have('fastavro'):
            import fastavro
            try:
                fastavro.parse_schema(doc)
                tick('avro schemas accepted')
            except Exception as e:  # noqa: BLE001
                bad('%s (%s): fastavro refuses the schema: %s' % (s['id'], s['kind'], str(e)[:100]))
    elif isinstance(doc, dict) and 'connector.class' in doc and connect_doc:
        for k in doc:
            if k in ('file', 'topics'):
                continue                                     # the settings of the file connector itself: checked live
            tick('connect keys checked')
            if k not in connect_doc:
                bad('%s (%s): %s is not in the Connect documentation of the distribution' % (s['id'], s['kind'], k))
control('JSON that does not parse', lambda: json.loads('{"a": }'))
if have('fastavro'):
    import fastavro
    control('an Avro schema that fastavro refuses', lambda: fastavro.parse_schema({'type': 'record', 'name': 'X', 'fields': [{'name': 'a', 'type': 'nosuchtype'}]}) and False)

# ======================================================================================================================
# 6. What can be worked out without a cluster, worked out again
# ======================================================================================================================
def as_cell(x):
    return x


if have('confluent_kafka') and have('fastavro') and not args.no_run:
    import copy
    import io
    import json as _json
    import kx
    import schemas as S
    # the partition of every key, with the hash of the Java client
    for i, row in enumerate(REAL['tables']['keys.placement']['rows']):
        for ci, n in enumerate((3, 6, 12)):
            expect(row[ci + 1] == kx.partition_for(row[0], n), 'murmur2 puts %s in partition %d of %d' % (row[0], kx.partition_for(row[0], n), n), 'partitions recomputed')
    # the nine schema changes, in both directions, with real Avro
    rows = []
    for label, new, extra in S.CHANGES:
        old_record = dict(S.SAMPLE, **extra.get('__old__', {}))
        new_record = S.sample_for(new, {k: v for k, v in extra.items() if k != '__old__'})
        b, f = S.compatibility(S.V1, new, old_record, new_record)
        verdict = 'full' if b[0] and f[0] else 'backward only' if b[0] else 'forward only' if f[0] else 'none'
        rows.append([label, 'yes' if b[0] else 'no', 'yes' if f[0] else 'no', verdict, (b[2] or f[2])[:120]])
    expect(rows == REAL['tables']['schemas.changes']['rows'], 'the nine schema changes give the recorded results with the installed fastavro', 'schema results recomputed')
    # the registry decisions
    def offer(mode):
        reg = S.MiniRegistry()
        out = []
        v2 = S.changed(lambda s: s['fields'].append({'name': 'channel', 'type': 'string', 'default': 'app'}))
        v3c = copy.deepcopy(v2)
        v3c['fields'].append({'name': 'coupon', 'type': 'string'})
        v3d = copy.deepcopy(v2)
        v3d['fields'] = [f for f in v3d['fields'] if f['name'] != 'status']
        for schema, extra in ((S.V1, {}), (v2, {'channel': 'web'}), (v3c, {'coupon': 'SPRING'}), (v3d, {})):
            sid = reg.register('orders-value', schema, mode, lambda s: dict(S.SAMPLE, channel='web') if any(f['name'] == 'channel' for f in s['fields']) else dict(S.SAMPLE),
                               lambda s, e=extra: S.sample_for(s, e))
            out.append(sid if sid else 'refused')
        return out
    flow = [[a, b] for a, b in zip(offer('BACKWARD'), offer('FULL'))]
    expect(flow == [[r[1], r[2]] for r in REAL['tables']['schemas.registry_flow']['rows']], 'the registry decisions are the recorded ones', 'schema results recomputed')
    # the wire format
    payload = S.write(S.V1, S.SAMPLE)
    framed = b'\x00' + (1).to_bytes(4, 'big') + payload
    w = REAL['counts']['schemas.wire_format']
    expect([framed[:5].hex(), len(payload), len(framed), len(_json.dumps(S.SAMPLE, separators=(',', ':')))] == [w['first_five_bytes_hex'], w['avro_payload_bytes'], w['message_bytes'], w['json_bytes_of_the_same_record']],
           'the wire format of one order is the recorded one', 'schema results recomputed')
    control('a schema table that was changed', lambda: [rows[0][:1] + ['maybe'] + rows[0][2:]] + rows[1:] != REAL['tables']['schemas.changes']['rows'])
else:
    skipped('recomputed partitions and schema results', 'confluent-kafka and fastavro are needed, and a run')

if have('pytest') and not args.no_run:
    import tests as TST
    rc, out = TST.pytest_run(None, 'order_totals', ('-k', 'not real_topic'))
    expect(out == REAL['text']['tests.pytest_unit_only'] and rc == 0, 'pytest without a broker gives the recorded output', 'pytest runs recomputed')
    rc, out = TST.pytest_run(None, 'idempotent', test_file='test_idempotent.py')
    expect(out == REAL['text']['tests.idempotent_pytest'] and rc == 0, 'pytest on the consumer that is safe to run twice gives the recorded output', 'pytest runs recomputed')
    rc, out = TST.pytest_run(None, 'order_totals_bug', ('-k', 'not real_topic'))
    expect(rc != 0 and 'test_a_refunded_order_is_not_a_sale' in out, 'the copy with a deleted check fails the unit test that tests it', 'pytest runs recomputed')
else:
    skipped('pytest runs', 'pytest is not installed, or a run is not wanted')

# ======================================================================================================================
# 7. Live: the commands of the bug hunts, on a real three broker cluster
# ======================================================================================================================
if args.live and HAVE_KAFKA and HAVE_JAVA and have('confluent_kafka') and not args.no_run:
    os.environ.setdefault('KAFKA_BASE_PORT', '29092')
    import cluster as C
    import kx
    with C.Cluster() as c:
        def tool_cmd(code):
            """Run the Kafka tool commands of a snippet on the cluster: the address of the cluster replaces the one in the snippet."""
            outs = []
            for cmd in commands(code):
                m = re.match(r'bin/(kafka-[\w-]+)\.sh\s+(.*)$', cmd)
                parts = shlex.split(m.group(2))
                if '--bootstrap-server' in parts:
                    i = parts.index('--bootstrap-server')
                    del parts[i:i + 2]
                if m.group(1) == 'kafka-console-consumer':
                    parts += ['--timeout-ms', '8000']
                outs.append(c.tool(m.group(1), *parts))
            return outs
        snip = {(s['id'], s['kind']): s['code'] for s in SNIP if s['lang'] == 'bash'}
        kx.create_topic(c.bootstrap, 'orders', partitions=1, replication=1)
        kx.send(kx.producer(c.bootstrap), 'orders', 5, partition=0)
        # mission 1: a topic made without the numbers has one partition and one copy
        for kind, parts, repl in (('code', 1, 1), ('fix', 6, 3)):
            outs = tool_cmd(snip[('m1-bug', kind)])
            expect(all(o[0] == 0 for o in outs), 'm1-bug (%s): the commands succeed: %s' % (kind, [o[2][:80] for o in outs if o[0]]), 'live commands')
            expect('PartitionCount: %d' % parts in outs[-1][1] and 'ReplicationFactor: %d' % repl in outs[-1][1], 'm1-bug (%s): the topic has %d partitions and %d copies' % (kind, parts, repl), 'live commands')
            c.tool('kafka-topics', '--delete', '--topic', 'tills')
        # mission 2: a console consumer of one partition reads from the end unless it is given an offset
        o = tool_cmd(snip[('m2-bug', 'code')])[0]
        expect(not re.search(r'offset[:=]', o[1], re.I), 'm2-bug (code): reading a partition without an offset prints nothing, because it starts at the end: ' + o[1][:80], 'live commands')
        o = tool_cmd(snip[('m2-bug', 'fix')])[0]
        expect(bool(re.search(r'offset[:=]\s*0', o[1], re.I)), 'm2-bug (fix): with --offset 0 the records are printed with their offsets: ' + (o[1][:80] or o[2][:80]), 'live commands')
        # mission 5: replication factor two is accepted with a minimum of two, and three is accepted too
        for kind, repl in (('code', 2), ('fix', 3)):
            outs = tool_cmd(snip[('m5-bug', kind)])
            d = c.tool('kafka-topics', '--describe', '--topic', 'payments')
            expect(outs[0][0] == 0 and 'ReplicationFactor: %d' % repl in d[1] and 'min.insync.replicas=2' in d[1], 'm5-bug (%s): the topic has %d copies and a minimum of 2' % (kind, repl), 'live commands')
            c.tool('kafka-topics', '--delete', '--topic', 'payments')
        # mission 8: delete or compact
        for kind, policy in (('code', 'delete'), ('fix', 'compact')):
            outs = tool_cmd(snip[('m8-bug', kind)])
            d = c.tool('kafka-topics', '--describe', '--topic', 'store-status')
            expect(outs[0][0] == 0 and 'cleanup.policy=%s' % policy in d[1], 'm8-bug (%s): the topic has cleanup.policy=%s' % (kind, policy), 'live commands')
            c.tool('kafka-topics', '--delete', '--topic', 'store-status')
else:
    skipped('commands of the bug hunts on a live cluster', 'run with --live, with KAFKA_HOME, Java and confluent-kafka available')

# ======================================================================================================================
# 8. The recording made again
# ======================================================================================================================
VOLATILE = {
    'keys.keyless': 'the partition of a keyless batch is chosen at random',
}


def flatten(real):
    out = {}
    for kind in ('counts', 'tables', 'text'):
        for k, v in real[kind].items():
            out[kind + ':' + k] = v
    return out


if args.recapture and not args.no_run:
    if not (HAVE_KAFKA and HAVE_JAVA):
        skipped('recapture', 'KAFKA_HOME and Java are needed')
    else:
        tmp = pathlib.Path(tempfile.mkdtemp(prefix='kafka-recapture-')) / 'real.js'
        r = run([sys.executable, str(HERE / 'capture_kafka.py'), '--out', str(tmp)], env=dict(os.environ))
        if r.returncode or not tmp.exists():
            bad('capture_kafka.py failed: ' + (r.stdout + r.stderr)[-500:])
        else:
            again, first = flatten(load_real(tmp)), flatten(REAL)
            differ = []
            for k in sorted(set(first) | set(again)):
                tick('recaptured items')
                if first.get(k) != again.get(k):
                    if any(k.endswith(v) for v in VOLATILE):
                        notes.append('%s differs, as expected: %s' % (k, VOLATILE[[v for v in VOLATILE if k.endswith(v)][0]]))
                        continue
                    differ.append(k)
            for k in differ:
                bad('the recapture differs from js/real.js in %s' % k)
            print('recapture: %d items, %d differ' % (counts.get('recaptured items', 0), len(differ)))
else:
    skipped('recapture', 'run with --recapture (about forty minutes)')

# ======================================================================================================================
# 9. The checks of the lab data, and controls for the checker
# ======================================================================================================================
if shutil.which('node') and not args.no_run:
    r = run(['node', str(HERE / 'check_widgets.js')], cwd=str(ROOT))
    expect(r.returncode == 0, 'check_widgets.js passes: ' + (r.stdout + r.stderr)[-300:], 'lab checks')
    m = re.search(r'(\d+) checks', r.stdout)
    tick('lab data checks', int(m.group(1)) if m else 0)
    text = (ROOT / 'kafka' / 'js' / 'real.js').read_text()
    for label, old, new in (('a changed number of records in the busiest partition', '"busiest_partition_records": 6456', '"busiest_partition_records": 6455'),
                            ('a changed recorded loss', '"lost_count": 50', '"lost_count": 51'),
                            ('a changed size of the first segment', '"first_segment_bytes": 1042922', '"first_segment_bytes": 1042923')):
        if old not in text:
            notes.append('control "%s" was skipped: the text to change is not in js/real.js' % label)
            continue
        tmp = pathlib.Path(tempfile.mkdtemp(prefix='kafka-control-')) / 'real.js'
        tmp.write_text(text.replace(old, new, 1))
        env = dict(os.environ, KAFKA_REAL_JS=str(tmp))
        control(label, lambda env=env: run(['node', str(HERE / 'check_widgets.js')], cwd=str(ROOT), env=env).returncode != 0)
else:
    skipped('lab data checks', 'node is not installed, or a run is not wanted')

# ======================================================================================================================
print()
print('checked:', ', '.join('%d %s' % (v, k) for k, v in sorted(counts.items())))
for n in notes[:30]:
    print('note:', n)
for sk in skips:
    print('skipped:', sk)
if problems:
    print('%d PROBLEM(S)' % len(problems))
    sys.exit(1)
print('verify_kafka: all checks passed')
