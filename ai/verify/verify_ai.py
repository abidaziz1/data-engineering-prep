#!/usr/bin/env python3
"""Check the code and the recorded output of the AI data engineering and agentic AI tutorial.

No language model and no embedding model was used for this tutorial, and nothing in it ran on a cloud or a model provider. The recording
(capture_ai.py) comes from real open-source tools on one machine: parsers, MinHash, FAISS, hnswlib, PostgreSQL with pgvector, BM25, the Anthropic
and OpenAI client libraries against a local stand-in server, LangGraph with a scripted model, an MCP server and client, sqlglot with DuckDB,
OpenTelemetry, pytest and check-jsonschema. This script checks what can be checked without a model or a provider:

1. Every Python snippet in the lessons is parsed with ast. The imports that can be resolved are resolved, and the keyword arguments of the calls of
   a few library functions (the messages and completions calls of the two model SDKs, with_options, add_conditional_edges, start_as_current_span)
   are checked against the signature of the installed library.
2. JSON, JSON lines and YAML documents are parsed. The release workflow goes through check-jsonschema, and a copy with a typo must be refused.
3. SQL: the pgvector statements and the SQL of the bug hunt are parsed with sqlglot. The solution of the SQL coding round runs in DuckDB on the
   table that is shown on screen, and must give the table that is shown on screen.
4. The recorded modules are run again on small inputs: the SQL guard on every statement of the recording that is shown in full, ingestion
   (a second run must embed nothing, an edit must embed one chunk, a label change none), the cheap answer checks, the refund guard, and the tests
   of the agent with pytest, on the real agent and on the two broken copies (each must fail the one test that the lesson says).
5. The logic of the lab widgets (check_widgets.js) and the content lint run.
6. Controls: deliberately broken inputs are fed to the checkers, which must refuse them.
7. With --recapture, the whole recording is made again and compared with js/real.js. The keys under pg.* and the numbers that name seconds may
   differ a little between runs and are only counted.

What this cannot show: what a real model or a real embedding model would do, that a provider accepts a call, how a hosted vector database behaves,
or that a feature, limit or price is current. Those screens carry the "From documentation" tag, and the README lists what was not checked.

Run:  python3 ai/verify/verify_ai.py [--no-run] [--recapture] [--verbose]
Needs: pip install -r dev/requirements.txt (the AI block), Node 20 or later. A check whose tool is missing says so and is skipped.
"""
import argparse
import ast
import contextlib
import importlib
import importlib.util
import inspect
import io
import json
import os
import pathlib
import re
import subprocess
import sys
import tempfile
import textwrap

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))

ap = argparse.ArgumentParser()
ap.add_argument('--no-run', action='store_true', help='parse only, run nothing')
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


def control(label, fn):
    """A control feeds a broken input to a checker. The checker must refuse it."""
    tick('controls')
    try:
        fn()
    except Exception:
        return
    bad('control "%s": the checker accepted a broken input' % label)


def have(mod):
    try:
        return importlib.util.find_spec(mod.split('.')[0]) is not None
    except (ImportError, ValueError):
        return False


def scenes():
    r = subprocess.run(['node', str(ROOT / 'dev' / 'dump-scenes.js'), 'ai'], capture_output=True, text=True, cwd=str(ROOT))
    if r.returncode:
        bad('dump-scenes.js failed: ' + r.stderr[:200])
        return {'snippets': [], 'results': []}
    return json.loads(r.stdout)


def load_real(path):
    t = pathlib.Path(path).read_text()
    return json.loads(t.split('LAB.real = ', 1)[1].rstrip().rstrip(';'))


REAL = load_real(ROOT / 'ai' / 'js' / 'real.js')
DUMP = scenes()


# ======================================================================================================================
# 1. Python snippets
# ======================================================================================================================
def sig_of(path):
    mod, _, attr = path.rpartition('.')
    parts = path.split('.')
    for i in range(len(parts) - 1, 0, -1):
        try:
            obj = importlib.import_module('.'.join(parts[:i]))
        except Exception:
            continue
        try:
            for a in parts[i:]:
                obj = getattr(obj, a)
            return inspect.signature(obj)
        except Exception:
            return None
    return None


SIGS = {}
CALLS = {'messages.create': 'anthropic.resources.messages.Messages.create', 'completions.create': 'openai.resources.chat.completions.Completions.create',
         'with_options': 'anthropic.Anthropic.with_options', 'add_conditional_edges': 'langgraph.graph.StateGraph.add_conditional_edges',
         'start_as_current_span': 'opentelemetry.trace.Tracer.start_as_current_span'}


def chain(node):
    out = []
    while isinstance(node, ast.Attribute):
        out.append(node.attr)
        node = node.value
    return '.'.join(reversed(out))


def check_python(sid, kind, code):
    try:
        tree = ast.parse(textwrap.dedent(code))                # an excerpt of a nested function is indented
    except SyntaxError as e:
        bad('%s (%s): Python does not parse: %s' % (sid, kind, e))
        return
    tick('python snippets')
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            mods = [a.name for a in node.names] if isinstance(node, ast.Import) else [node.module or '']
            for m in mods:
                if not m or not have(m):
                    if m and m.split('.')[0] not in ('os', 'json'):
                        notes.append('%s: %s is not installed here, so its import was not resolved' % (sid, m))
                    continue
                try:
                    obj = importlib.import_module(m)
                except Exception as e:
                    bad('%s: cannot import %s: %s' % (sid, m, e))
                    continue
                if isinstance(node, ast.ImportFrom):
                    for a in node.names:
                        if a.name != '*' and not hasattr(obj, a.name):
                            try:
                                importlib.import_module(m + '.' + a.name)
                            except Exception:
                                bad('%s: %s has no name %s' % (sid, m, a.name))
                tick('imports resolved')
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
            c = chain(node.func)
            for suffix, path in CALLS.items():
                if c == suffix or c.endswith('.' + suffix):
                    if path not in SIGS:
                        SIGS[path] = sig_of(path) if have(path.split('.')[0]) else None
                    sg = SIGS[path]
                    if sg is None:
                        continue
                    names = set(sg.parameters)
                    takes_any = any(p.kind == p.VAR_KEYWORD for p in sg.parameters.values())
                    for kw in node.keywords:
                        if kw.arg and kw.arg not in names and not takes_any:
                            bad('%s: %s has no keyword %s' % (sid, path, kw.arg))
                        tick('keywords checked')


for s in DUMP['snippets']:
    if s['lang'] == 'python' and s['kind'] != 'starter':
        check_python(s['id'], s['kind'], s['code'])


# ======================================================================================================================
# 2. JSON, JSON lines and YAML
# ======================================================================================================================
def check_json(sid, code):
    try:
        json.loads(code)
        tick('json documents')
        return
    except ValueError:
        pass
    lines = [l for l in code.splitlines() if l.strip()]
    for l in lines:
        try:
            json.loads(l)
        except ValueError as e:
            bad('%s: JSON does not parse: %s' % (sid, e))
            return
    tick('json documents')


for s in DUMP['snippets']:
    if s['lang'] == 'json':
        check_json(s['id'], s['code'])
    if s['lang'] == 'yaml':
        if have('yaml'):
            import yaml
            try:
                yaml.safe_load(s['code'])
                tick('yaml documents')
            except Exception as e:
                bad('%s: YAML does not parse: %s' % (s['id'], e))
        else:
            skipped('YAML parse', 'pyyaml is not installed')

# the recorded JSON documents of the recording are valid too
for k, v in REAL['files'].items():
    if k.endswith('.json'):
        check_json('recorded ' + k, v)
    if k.endswith('.jsonl'):
        check_json('recorded ' + k, v)


# ======================================================================================================================
# 3. SQL
# ======================================================================================================================
def sql_cell(v):
    if v is None or v == 'NULL':
        return None
    try:
        return round(float(v), 3)
    except (TypeError, ValueError):
        return str(v)


if have('sqlglot'):
    import sqlglot
    for s in DUMP['snippets']:
        if s['lang'] == 'sql' and s['kind'] in ('code', 'fix'):
            code = s['code'].replace('$1::vector', "'[1,2]'::vector").replace('$2::vector', "'[1,2]'::vector").replace('= $1', '= 1')
            try:
                sqlglot.parse(code, read='postgres')
                tick('sql snippets parsed')
            except Exception as e:
                bad('%s: SQL does not parse: %s' % (s['id'], str(e).splitlines()[0]))
    control('a broken SQL statement', lambda: sqlglot.parse('SELEC x FRM y ORDER', read='postgres', error_level=sqlglot.ErrorLevel.RAISE))
else:
    skipped('SQL parse', 'sqlglot is not installed')

if have('duckdb'):
    import duckdb
    for s in DUMP['snippets']:
        if s['kind'] != 'sol' or s['lang'] != 'sql':
            continue
        sid = s['id']
        data = [r for r in DUMP['results'] if r['id'] == sid and r['kind'] == 'data']
        res = [r for r in DUMP['results'] if r['id'] == sid and r['kind'] == 'res']
        if not data or not res:
            continue
        con = duckdb.connect()
        d = data[0]
        con.execute('create table ranks(id varchar, kind varchar, method varchar, rank integer)')
        con.executemany('insert into ranks values (?,?,?,?)', [(r[0], r[1], r[2], None if r[3] == 'NULL' else int(r[3])) for r in d['rows']])
        got = [[sql_cell(c) for c in row] for row in con.execute(s['code']).fetchall()]
        want = [[sql_cell(c) for c in row] for row in res[0]['rows']]
        expect(got == want, '%s: the solution of the SQL coding round gives the table on screen (%d rows)' % (sid, len(want)), 'sql challenges run')
        wrong = [[sql_cell(c) for c in row] for row in con.execute(s['code'].replace('<= 3', '<= 2')).fetchall()]
        control('a SQL solution with the wrong threshold', lambda: differs(wrong, want))
        # the ranks on screen are the recorded ranks
        q = REAL['tables']['search.questions']['rows']
        shown = sorted((r[0], r[2], r[3]) for r in d['rows'])
        recorded = sorted((r[0], m, 'NULL' if r[3 + i] == '-' else r[3 + i]) for r in q for i, m in enumerate(['BM25', 'vector', 'hybrid']))
        expect(shown == recorded, '%s: the table of ranks on screen equals the recorded ranks' % sid, 'sql challenges run')
else:
    skipped('SQL challenge', 'duckdb is not installed')


# ======================================================================================================================
# 4. The recorded modules, run again on small inputs
# ======================================================================================================================
def run_modules():
    # 4a. the SQL guard, on every statement of the recording that is shown in full
    if have('sqlglot') and have('duckdb'):
        import sqlguard
        rows = REAL['tables']['sqlguard.decisions']['rows']
        n = 0
        for label, sql, verdict, why, *_ in rows:
            if sql.endswith('...'):
                continue
            try:
                out, notes_ = sqlguard.check(sql)
                got = 'allowed'
                changed = '; '.join(notes_)
            except sqlguard.Refused as e:
                got, changed = 'refused', str(e)
            expect(got == verdict, 'sqlguard: "%s" is %s as recorded (got %s)' % (label, verdict, got), 'guard statements')
            if why and got == verdict:
                expect(changed == why or why.startswith(changed[:20]), 'sqlguard: "%s" says "%s" (got "%s")' % (label, why, changed), 'guard statements')
            n += 1
        expect(n >= 11, 'sqlguard: at least eleven of the fourteen statements are shown in full', 'guard statements')
        control('a drop and a second statement are refused by the guard', lambda: sqlguard.check('SELECT 1; DROP TABLE orders'))
        control('a table that is not on the allow list is refused', lambda: sqlguard.check('SELECT email FROM customers'))
    else:
        skipped('SQL guard', 'sqlglot or duckdb is not installed')

    # 4b. ingestion: a second run embeds nothing, an edit embeds one chunk, a label change embeds nothing
    if have('numpy') and have('sklearn'):
        import ingest
        import ragkit
        docs = [{'doc_id': 'd%d' % i, 'text': t, 'audience': 'all-staff', 'current': True} for i, t in enumerate([
            'Milk must be stored at 5 degrees Celsius or lower. The fridge temperature is logged at open and close.\n\nTill money is counted at the end of each shift.',
            'A customer may return a sealed bag of beans within 14 days of purchase with a receipt.\n\nA refund above EUR 50 needs a second manager.',
            'The espresso machine is descaled every Sunday night. Steam wands are wiped after every use.\n\nGrinders are cleaned every Monday.'])]
        emb = ragkit.LsaEmbedder(2, 1).fit([d['text'] for d in docs] * 2)
        counter = {'n': 0}

        def embed(texts):
            counter['n'] += len(texts)
            return emb.embed(texts)
        st = ingest.Store(':memory:')
        chunker = lambda t: ragkit.chunk_recursive(t, 120)
        r1 = ingest.ingest(st, docs, chunker, embed, 'm1')
        r2 = ingest.ingest(st, docs, chunker, embed, 'm1')
        expect(r1['embedded'] == r1['chunks_added'] > 0 and r2['embedded'] == 0 and r2['chunks_added'] == 0 and r2['documents_skipped'] == 3, 'ingest: the first run embeds every chunk and the second run embeds none', 'ingest runs')
        docs2 = [dict(d) for d in docs]
        docs2[1]['text'] = docs2[1]['text'].replace('14 days', '21 days')
        before = st.count()
        r3 = ingest.ingest(st, docs2, chunker, embed, 'm1')
        expect(r3['embedded'] == 1 and r3['chunks_removed'] == 1 and st.count() == before, 'ingest: one changed sentence embeds exactly one chunk and removes the old one', 'ingest runs')
        docs3 = [dict(d) for d in docs2]
        docs3[0]['audience'] = 'managers'
        r4 = ingest.ingest(st, docs3, chunker, embed, 'm1')
        expect(r4['embedded'] == 0 and r4['label_updates'] == 1, 'ingest: a change of audience costs no embedding', 'ingest runs')
        gone = ingest.delete_document(st, 'd2')
        expect(gone > 0 and not [r for r in st.db.execute("select 1 from chunks where doc_id = 'd2'")], 'ingest: a deleted document leaves no chunk behind', 'ingest runs')
        hits = ingest.search(st, lambda q: emb.embed([q])[0], 'sealed bag of beans', 'm1', k=3, audiences={'all-staff'})
        expect(all(h[0].startswith('d1:') or h[0].startswith('d2:') or h[0].startswith('d0:') for h in hits), 'ingest: the search runs with a filter inside', 'ingest runs')
        only = ingest.search(st, lambda q: emb.embed([q])[0], 'milk fridge', 'm1', k=5, audiences={'managers'})
        expect(all(h[0].startswith('d0:') for h in only), 'ingest: a filter on the audience returns only chunks of that audience', 'ingest runs')
        control('a second run that embeds something would be noticed', lambda: differs(r2['embedded'], 1))
    else:
        skipped('ingestion', 'numpy or scikit-learn is not installed')

    # 4c. the cheap answer checks and the refund guard
    import evalkit
    got = {'c1': 'A customer may return a sealed bag of beans within 14 days of purchase with a receipt.'}
    ok = evalkit.check_answer('Within 14 days.', ['c1'], got, {'c1'})
    expect(ok['ok'], 'evalkit: an answer with the number of its source passes', 'answer checks')
    wrong = evalkit.check_answer('Within 30 days.', ['c1'], got, {'c1'})
    expect(not wrong['ok'] and any('30' in p for p in wrong['problems']), 'evalkit: a number that is not in the source is found', 'answer checks')
    expect(not evalkit.check_answer('Within 14 days.', ['c9'], got, {'c1'})['ok'], 'evalkit: a source that was not retrieved is found', 'answer checks')
    expect(not evalkit.check_answer('Within 14 days.', ['c1'], got, set())['ok'], 'evalkit: a source that may not be read is found', 'answer checks')
    expect(evalkit.check_answer('I cannot find that.', [], got, set())['ok'], 'evalkit: a refusal with no source passes', 'answer checks')
    lo, hi = evalkit.wilson(21, 24)
    expect(abs(lo - 0.69) < 0.005 and abs(hi - 0.957) < 0.005, 'evalkit: the interval for 21 of 24 is 0.69 to 0.957 as recorded', 'answer checks')
    base = {'q%d' % i: {'kind': 'k', 'hit': 1} for i in range(6)}
    cand = dict(base, q0={'kind': 'k', 'hit': 0})
    expect(evalkit.gate(base, cand)['verdict'] == 'fail' and evalkit.gate(base, base)['verdict'] == 'pass', 'evalkit: the gate fails a build that is worse and passes one that is the same', 'answer checks')
    control('an answer with a wrong number is refused by the check', lambda: refused(evalkit.check_answer('Within 30 days.', ['c1'], got, {'c1'})))
    import defences
    calls = []
    g = defences.guard_refund(lambda o, a: calls.append((o, a)) or 'ok', ('ORD-1',), 50)
    for o, a in (('ORD-9999', 500.0), ('ORD-1', 500.0), ('ORD-9999', 10.0)):
        try:
            g(o, a)
            bad('defences: the refund of %s for %s was not refused' % (o, a))
        except ValueError:
            tick('answer checks')
    g('ORD-1', 10.0)
    expect(calls == [('ORD-1', 10.0)], 'defences: the guard lets a good refund through and stops the others', 'answer checks')

    # 4d. the tests of the agent: the real agent passes, and each broken copy fails the one test that the lesson names
    if have('langgraph') and have('pytest'):
        recorded = REAL['counts']['test.summary']
        expected_fail = {'no_limit': 'test_a_loop_stops_at_the_step_limit', 'no_approval': 'test_a_write_waits_for_a_person'}
        for label, brk in (('clean', ''), ('no_limit', 'no_limit'), ('no_approval', 'no_approval')):
            r = subprocess.run([sys.executable, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', '--tb=line', '-rf', 'test_agent.py'], cwd=str(HERE), env=dict(os.environ, AGENT_BREAK=brk, PYTHONDONTWRITEBYTECODE='1'), capture_output=True, text=True)
            out = r.stdout
            failed = re.findall(r'^FAILED test_agent\.py::(\w+)', out, re.M)
            expect(len(failed) == recorded[label]['failed'], 'pytest, %s: %d failed as recorded (got %d)' % (label, recorded[label]['failed'], len(failed)), 'pytest runs')
            if label == 'clean':
                expect(r.returncode == 0 and not failed, 'pytest, clean: the real agent passes all its tests', 'pytest runs')
            else:
                expect(failed == [expected_fail[label]], 'pytest, %s: exactly the test %s fails (got %s)' % (label, expected_fail[label], failed), 'pytest runs')
    else:
        skipped('pytest of the agent', 'langgraph or pytest is not installed')


def differs(got, want):
    if got != want:
        raise AssertionError('differs')


def refused(result):
    if not result['ok']:
        raise ValueError('refused')


if not args.no_run:
    run_modules()
else:
    print('modules were not run (--no-run)')

# the widget logic and the content lint
for label, cmd in (('widget logic', ['node', str(HERE / 'check_widgets.js')]), ('content lint', ['node', str(ROOT / 'dev' / 'lint-content.js'), 'ai'])):
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=str(ROOT))
    expect(r.returncode == 0, '%s: %s' % (label, (r.stdout.strip().splitlines() or [''])[-1] if r.returncode == 0 else r.stdout[-300:]), 'tool runs')

# the workflow of the release screen goes through the schema of GitHub Actions
if have('check_jsonschema'):
    wf = ROOT / 'ai' / 'verify' / 'ci' / 'example-release.yml'
    r = subprocess.run([sys.executable, '-m', 'check_jsonschema', '--builtin-schema', 'vendor.github-workflows', wf.name], cwd=str(wf.parent), capture_output=True, text=True)
    expect(r.returncode == 0, 'the release workflow matches the GitHub Actions schema', 'workflow')
    with tempfile.TemporaryDirectory() as td:
        broken = pathlib.Path(td) / 'w.yml'
        broken.write_text(wf.read_text().replace('runs-on: ubuntu-latest', 'run-on: ubuntu-latest'))
        r2 = subprocess.run([sys.executable, '-m', 'check_jsonschema', '--builtin-schema', 'vendor.github-workflows', broken.name], cwd=td, capture_output=True, text=True)
        expect(r2.returncode == 1, 'control: a workflow with run-on instead of runs-on is refused', 'workflow')
    shown = [s for s in DUMP['snippets'] if s['id'] == 'm13-workflow' and s['kind'] == 'code']
    expect(bool(shown) and shown[0]['code'].strip() == wf.read_text().strip(), 'the workflow on screen is the file that was validated', 'workflow')
else:
    skipped('GitHub workflow schema', 'check-jsonschema is not installed')

# the lessons show the code that ran: each recorded module on screen equals the file on disk
for key in REAL['files']:
    if key.startswith('code/') or key in ('agent/agent_graph.py', 'mcp/mcp_server.py', 'mcp/mcp_tap.py', 'test/test_agent.py'):
        name = key.split('/', 1)[1] if key.startswith('code/') else key.split('/')[-1]
        src = (HERE / name).read_text().rstrip('\n')
        expect(REAL['files'][key] == src, 'the recorded copy of %s equals the file on disk' % name, 'recorded sources')


# ======================================================================================================================
# 7. Recapture
# ======================================================================================================================
def flatten(x, path=''):
    if isinstance(x, dict):
        for k, v in x.items():
            yield from flatten(v, path + '.' + k)
    else:
        yield path, x


if args.recapture:
    out = pathlib.Path(tempfile.mkdtemp()) / 'real.js'
    r = subprocess.run([sys.executable, str(HERE / 'capture_ai.py'), '--out', str(out)], capture_output=True, text=True, cwd=str(ROOT))
    if r.returncode:
        bad('recapture failed: ' + r.stderr[-300:])
    else:
        fresh = load_real(out)
        diffs = tolerated = 0
        for sec in ('meta', 'files', 'tables', 'counts', 'text'):
            a, b = dict(flatten(REAL[sec], sec)), dict(flatten(fresh[sec], sec))
            for k in sorted(set(a) | set(b)):
                if a.get(k) == b.get(k):
                    continue
                if re.search(r'(^|\.)pg\.', k) or 'seconds' in k:
                    tolerated += 1
                    continue
                diffs += 1
                bad('recapture: %s differs: %r against %r' % (k, str(a.get(k))[:60], str(b.get(k))[:60]))
        print('recapture compared %d keys: %d differ, %d tolerated (pg.* and seconds)' % (len(set(dict(flatten(REAL, '')))), diffs, tolerated))
        tick('recaptured keys', 1)

print()
for g in sorted(counts):
    print('%-26s %d' % (g, counts[g]))
for n in notes[:6]:
    print('note:', n)
if skips:
    print('skipped checks:', len(skips))
print('PROBLEMS: %d' % len(problems) if problems else 'all checks passed')
sys.exit(1 if problems else 0)
