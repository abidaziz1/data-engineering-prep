#!/usr/bin/env python3
"""Check the code and the recorded output of the Google Cloud for data engineers tutorial.

Nothing in this tutorial ran on Google Cloud. The recording (capture_gcp.py) comes from real open-source tools on one machine: the Cloud Storage client on an
emulator, the BigQuery client (request bodies only), BigQuery SQL translated by sqlglot and run in DuckDB, Apache Beam on its local runners, a small model of
Pub/Sub delivery, local PySpark, Airflow, the Dataform compiler, Checkov, check-jsonschema, functions-framework with pytest, and the gcloud and bq help pages.
This script checks what can be checked without a Google Cloud project:

1. The recorded files are the files in gcp/verify, and the request bodies of the BigQuery client are built again and compared.
2. Every Python snippet is parsed with ast. Imports are resolved, and the keyword arguments of every call whose function can be found are checked against its
   signature (Airflow and PySpark are checked in their own interpreters, named by GCP_AIRFLOW_PYTHON and GCP_SPARK_PYTHON).
3. JSON, YAML and Terraform snippets are parsed. The Cloud Build file and the GitHub workflow go through check-jsonschema.
4. BigQuery SQL is parsed with sqlglot. The queries that show a result on screen are run again in DuckDB on the made-up orders and must give that result, and the
   solution of the SQL coding round runs on the table that is shown.
5. Shell snippets go through bash -n, and every flag of every gcloud and bq command in them must be one that the recording found in the help page.
6. The recording is made again and compared with js/real.js: a part of it by default, all of it with --recapture. Keys that name seconds may differ a little.
7. The checks of the lab data (check_widgets.js) run, and deliberately broken inputs (controls) must be refused by the checkers.

What this cannot show: that a service accepts a call, what BigQuery bills, how Dataflow or Pub/Sub behave under load, or that a name, limit or price is current.
Those screens carry the "From documentation" tag, and the README lists what was not checked.

Run:  python3 gcp/verify/verify_gcp.py [--no-run] [--recapture] [--verbose]
Needs: pip install -r dev/requirements.txt (the GCP block), Node 20 or later. A check whose tool is missing says so and is skipped.
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
import subprocess
import sys
import tempfile
import textwrap

logging.disable(logging.WARNING)                                       # sqlglot and the Google libraries warn about things the checks already count
HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(HERE))


# ======================================================================================================================
# Resolving calls: used here, and by the other interpreters through --resolve (Airflow and PySpark live in their own environments)
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
        names |= set(getattr(obj, '__annotations__', {}))                      # attrs and dataclasses
        names |= {n for n in dir(obj) if not n.startswith('_')}                # configuration objects that set attributes
        if hasattr(obj, 'meta') and hasattr(obj.meta, 'fields'):               # proto-plus messages
            names |= set(obj.meta.fields)
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
        return None                                                              # a built-in with no signature, or a callee that takes any keyword
    return names


METHODS = {'generate_signed_url': 'google.cloud.storage.blob.Blob.generate_signed_url', 'create_bucket': 'google.cloud.storage.client.Client.create_bucket',
           'list_blobs': 'google.cloud.storage.client.Client.list_blobs', 'load_table_from_uri': 'google.cloud.bigquery.client.Client.load_table_from_uri',
           'add_lifecycle_delete_rule': 'google.cloud.storage.bucket.Bucket.add_lifecycle_delete_rule',
           'add_lifecycle_set_storage_class_rule': 'google.cloud.storage.bucket.Bucket.add_lifecycle_set_storage_class_rule'}


def resolve_snippets(snippets):
    """For every Python snippet: unresolved imports, and keyword arguments that the callee does not take. Pure standard library."""
    out = {'bad': [], 'imports_ok': 0, 'imports_missing': [], 'calls_checked': 0, 'calls_unresolved': 0, 'keywords_checked': 0}
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
                    obj = import_object(mod + '.' + a.name)
                    if obj is None:
                        out['bad'].append('%s: cannot import %s from %s' % (s['id'], a.name, mod))
                    else:
                        out['imports_ok'] += 1
        for n in ast.walk(tree):
            if not isinstance(n, ast.Call) or not n.keywords:
                continue
            c = chain(n.func)
            if not c:
                continue
            if c[0] in alias:
                obj = import_object('.'.join([alias[c[0]]] + c[1:]))
            elif len(c) > 1 and c[-1] in METHODS:
                obj = import_object(METHODS[c[-1]])
            else:
                continue
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
ap.add_argument('--no-run', action='store_true', help='parse and compare only: run no recorder and no checker')
ap.add_argument('--recapture', action='store_true', help='make the whole recording again (Airflow and Spark too) and compare it with js/real.js')
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


r = run(['node', str(ROOT / 'dev' / 'dump-scenes.js'), 'gcp'], cwd=str(ROOT))
if r.returncode:
    bad('dump-scenes.js failed: ' + r.stderr[:300])
    DUMP = {'snippets': [], 'results': []}
else:
    DUMP = json.loads(r.stdout)
REAL = load_real(ROOT / 'gcp' / 'js' / 'real.js')
SNIP = DUMP['snippets']


# ======================================================================================================================
# 1. Recorded files are the files on disk, and the request bodies of the BigQuery client are built again
# ======================================================================================================================
DF = {'dataform/constants.js': 'dataform/includes/constants.js', 'dataform/daily_sales.sqlx': 'dataform/definitions/curated/daily_sales.sqlx',
      'dataform/orders.sqlx': 'dataform/definitions/curated/orders.sqlx', 'dataform/orders_raw.sqlx': 'dataform/definitions/sources/orders_raw.sqlx',
      'dataform/stg_orders.sqlx': 'dataform/definitions/staging/stg_orders.sqlx', 'dataform/workflow_settings.yaml': 'dataform/workflow_settings.yaml'}


def disk_path(key):
    if key.startswith('code/'):
        return HERE / key[5:]
    if key in DF:
        return HERE / DF[key]
    if key.startswith(('ci/', 'dags/', 'fn/', 'iac/')) and not key.endswith('.txt'):
        return HERE / key
    return None


for key, text in REAL['files'].items():
    p = disk_path(key)
    if p is not None:
        expect(p.exists() and p.read_text().strip() == text.strip(), 'the recorded file %s is the file on disk' % key, 'recorded files')

if have('google.cloud.bigquery'):
    import bq_jobs
    for k, v in bq_jobs.bodies().items():
        key = 'bq/%s.json' % k
        expect(json.loads(REAL['files'][key]) == json.loads(json.dumps(v)), 'the request body %s that the BigQuery client builds is the recorded one' % key, 'request bodies')
else:
    skipped('request bodies', 'google-cloud-bigquery is not installed')


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


def merge(res, part):
    for k in ('imports_ok', 'calls_checked', 'calls_unresolved', 'keywords_checked'):
        res[k] = res.get(k, 0) + part[k]
    res.setdefault('bad', []).extend(part['bad'])
    res.setdefault('missing', []).extend(part['imports_missing'])


main_res = resolve_snippets(py_snips)
tot = {}
merge(tot, main_res)
other = {'airflow': os.environ.get('GCP_AIRFLOW_PYTHON'), 'pyspark': os.environ.get('GCP_SPARK_PYTHON')}
unresolved = {}
for mod_root in ('airflow', 'pyspark'):
    snips = [s for s in py_snips if re.search(r'^\s*(from|import)\s+' + mod_root + r'\b', s['code'], re.M)]
    if not snips:
        continue
    py = other[mod_root]
    if not py or not os.path.exists(py):
        skipped('%s snippets' % mod_root, 'set %s' % ('GCP_AIRFLOW_PYTHON' if mod_root == 'airflow' else 'GCP_SPARK_PYTHON'))
        continue
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
        json.dump(snips, f)
    r = run([py, str(pathlib.Path(__file__).resolve()), '--resolve', f.name])
    os.unlink(f.name)
    if r.returncode:
        bad('resolving the %s snippets failed: %s' % (mod_root, r.stderr[-300:]))
        continue
    part = json.loads(r.stdout)
    unresolved[mod_root] = part
    tot['bad'].extend(part['bad'])
    for k in ('imports_ok', 'calls_checked', 'calls_unresolved', 'keywords_checked'):
        tot[k] += part[k]
handled = set(unresolved)
for m in tot['missing']:
    root = m[1].split('.')[0]
    if root in handled or (root == 'pendulum' and 'airflow' in handled):
        continue
    notes.append('%s: %s is not installed in this interpreter, so its import was not resolved' % (m[0], m[1]))
for b in tot['bad']:
    bad(b)
tick('imports resolved', tot['imports_ok'])
tick('keywords checked', tot['keywords_checked'])
tick('calls checked', tot['calls_checked'])
expect(tot['calls_checked'] >= 20 and tot['keywords_checked'] >= 60, 'the keyword check reached a useful number of calls (%d calls, %d keywords)' % (tot['calls_checked'], tot['keywords_checked']))
control('a keyword that the function does not take', lambda: bool(resolve_snippets([{'id': 'c', 'code': 'import textwrap\ntextwrap.dedent("x", nonsense=1)'}])['bad']))
control('a method call with a keyword that it does not take', lambda: not have('google.cloud.storage') or bool(resolve_snippets([{'id': 'c', 'code': 'client.list_blobs("b", nonsense=1)'}])['bad']))
control('Python that does not parse', lambda: ast.parse('def f(:\n  pass'))


# ======================================================================================================================
# 3. JSON, YAML and Terraform
# ======================================================================================================================
def snippets(lang, kinds=('code', 'fix')):
    return [s for s in SNIP if s['lang'] == lang and s['kind'] in kinds]


for s in snippets('json'):
    try:
        doc = json.loads(s['code'])
        tick('json snippets')
        if isinstance(doc, dict) and 'conditions' in doc:
            expect({'displayName', 'combiner', 'conditions'} <= set(doc) and all('conditionThreshold' in c for c in doc['conditions']), '%s: the alert policy has the fields of an AlertPolicy' % s['id'])
    except ValueError as e:
        bad('%s: JSON does not parse: %s' % (s['id'], e))
if have('yaml'):
    import yaml
    for s in snippets('yaml'):
        try:
            yaml.safe_load(re.split(r'^# definitions/', s['code'], flags=re.M)[0])      # a Dataform config block may follow the settings
            tick('yaml snippets')
        except yaml.YAMLError as e:
            bad('%s: YAML does not parse: %s' % (s['id'], e))
    control('YAML that does not parse', lambda: yaml.safe_load('a: [1, 2'))
else:
    skipped('YAML', 'pyyaml is not installed')
if have('hcl2'):
    import hcl2
    for s in snippets('hcl') + [{'id': k, 'code': v} for k, v in REAL['files'].items() if k.endswith('.tf')]:
        try:
            hcl2.loads(s['code'])
            tick('terraform snippets')
        except Exception as e:
            bad('%s: Terraform does not parse: %s' % (s['id'], str(e)[:120]))
    control('Terraform that does not parse', lambda: hcl2.loads('resource "a" "b" {'))
else:
    skipped('Terraform', 'python-hcl2 is not installed')


def schema(name, filename, text):
    with tempfile.TemporaryDirectory() as d:
        pathlib.Path(d, filename).write_text(text)
        r = run([sys.executable, '-m', 'check_jsonschema', '--builtin-schema', name, filename], cwd=d)
    return r.returncode


if have('check_jsonschema'):
    cb, gh = REAL['files']['ci/cloudbuild.yaml'], REAL['files']['ci/deploy.yml']
    expect(schema('vendor.cloudbuild', 'cloudbuild.yaml', cb) == 0, 'the Cloud Build file passes the schema', 'schema checks')
    expect(schema('vendor.github-workflows', 'deploy.yml', gh) == 0, 'the GitHub workflow passes the schema', 'schema checks')
    for s in SNIP:
        if s['id'] in ('m14-bug', 'm14-bug') and s['kind'] in ('code', 'fix'):
            expect(schema('vendor.cloudbuild', 'cloudbuild.yaml', s['code']) == 0, '%s (%s): the build step passes the schema, so only a person can see what is wrong with it' % (s['id'], s['kind']), 'schema checks')
    control('a Cloud Build file with step for steps', lambda: schema('vendor.cloudbuild', 'cloudbuild.yaml', cb.replace('\nsteps:', '\nstep:', 1)) != 0)
    control('a workflow with run-on for runs-on', lambda: schema('vendor.github-workflows', 'deploy.yml', gh.replace('runs-on:', 'run-on:')) != 0)
else:
    skipped('schema checks', 'check-jsonschema is not installed')


# ======================================================================================================================
# 4. SQL: parse, run again in DuckDB, and compare with the screen
# ======================================================================================================================
HAVE_SQL = have('sqlglot') and have('duckdb')


def sql_chunks(code):
    """A snippet is parsed whole when it can be. Some show several statements without semicolons, or a WHERE clause on its own: those are parsed piece by piece."""
    import sqlglot
    try:
        sqlglot.parse(code, read='bigquery')
        return [code]
    except sqlglot.errors.SqlglotError:
        pass
    out = []
    for piece in re.split(r'\n\s*\n', code):
        body = '\n'.join(l for l in piece.splitlines() if not l.strip().startswith('--')).strip()
        if re.match(r'(WHERE|AND|ORDER BY|GROUP BY|HAVING)\b', body, re.I):
            piece = 'SELECT 1 FROM t\n' + piece
        out.append(piece)
    return out
GENERIC = []
if HAVE_SQL:
    import sqlglot
    from sqlglot import exp
    for s in snippets('sql', ('code', 'fix', 'sol')):
        if re.match(r'\s*config\s*\{', s['code']):
            continue                                                              # Dataform files: compiled by the recorder
        for chunk in sql_chunks(s['code']):
            try:
                for st in sqlglot.parse(chunk, read='bigquery'):
                    if st is None:
                        continue
                    tick('sql statements')
                    if isinstance(st, exp.Command):
                        GENERIC.append('%s: %s' % (s['id'], st.sql('bigquery')[:48].replace('\n', ' ')))
            except sqlglot.errors.SqlglotError as e:
                bad('%s: BigQuery SQL does not parse: %s' % (s['id'], str(e)[:120]))
    expect(len(GENERIC) <= 14, 'few statements were read only as generic commands (%d)' % len(GENERIC))
    notes.append('%d statements use syntax that sqlglot does not know and were read as generic commands, so their syntax is from documentation: %s' % (len(GENERIC), '; '.join(GENERIC)))
    control('SQL that does not parse', lambda: sqlglot.parse('SELECT FROM WHERE', read='bigquery') and False)
else:
    skipped('SQL', 'sqlglot or duckdb is not installed')


def norm(v):
    s = str(v).replace(',', '').replace('$', '').strip()
    try:
        return round(float(s), 4)
    except ValueError:
        return s


def same_rows(got, want):
    return [[norm(x) for x in r] for r in got] == [[norm(x) for x in r] for r in want]


if HAVE_SQL and not args.no_run:
    import brewdata
    import warehouse as W
    wh = W.Warehouse()
    rows = brewdata.orders()
    wh.load('curated', 'orders', rows)
    wh.load('raw', 'orders_raw', brewdata.raw_orders(rows))
    wh.load('curated', 'customers', brewdata.customers())
    wh.load('curated', 'stores', brewdata.stores())
    wh.run("CREATE OR REPLACE TABLE `brewline-dev.staging.s12_orders` AS SELECT * FROM `brewline-dev.curated.orders` WHERE store_id = 's12' AND DATE(order_ts) != DATE '2026-11-06'")
    code = {s['id']: s['code'] for s in SNIP if s['kind'] == 'code'}
    shown = {}
    for x in DUMP['results']:
        shown.setdefault(x['id'], {})[x['kind']] = x
    # the jobs log of mission 14 is rebuilt from the recorded recipe, and not from the recorder's code
    import datetime as dt
    CW = REAL['counts']['sql.cost_world']
    day0 = dt.datetime(2026, 11, 4, tzinfo=dt.timezone.utc)
    SA = '@brewline-dev.iam.gserviceaccount.com'
    log = []
    for d in range(7):
        base = day0 + dt.timedelta(days=d)
        log.append({'creation_time': base + dt.timedelta(hours=2), 'user_email': 'sa-pipeline' + SA, 'job_type': 'QUERY', 'state': 'DONE', 'total_bytes_billed': CW['billed_bytes_per_job']['daily_orders'], 'labels': [{'key': 'pipeline', 'value': 'daily_orders'}]})
        for k in range(CW['runs_per_day']['dashboard_refresh']):
            log.append({'creation_time': base + dt.timedelta(minutes=15 * k), 'user_email': 'sa-dashboard' + SA, 'job_type': 'QUERY', 'state': 'DONE', 'total_bytes_billed': CW['billed_bytes_per_job']['dashboard_refresh'], 'labels': [{'key': 'pipeline', 'value': 'dashboard_refresh'}]})
        for k in range(CW['runs_per_day']['analysts, SELECT *']):
            log.append({'creation_time': base + dt.timedelta(hours=9, minutes=40 * k), 'user_email': 'analyst%d@example.com' % (k % 4 + 1), 'job_type': 'QUERY', 'state': 'DONE', 'total_bytes_billed': CW['billed_bytes_per_job']['analysts, SELECT *'], 'labels': []})
    wh.load('curated', 'jobs_log', log)
    for sid in ('m6-unnest', 'm6-window', 'm6-gaps', 'm14-cost-sql'):
        sql = code[sid].replace('`region-asia-southeast1`.INFORMATION_SCHEMA.JOBS_BY_PROJECT', '`brewline-dev.curated.jobs_log`')
        got = wh.run(sql)[1]
        want = shown[sid]['result']['rows']
        expect(same_rows(got, want), '%s: the query gives the table that the lesson shows (got %s, shown %s)' % (sid, got[:2], want[:2]), 'sql runs')
        expect(len(got) == len(want), '%s: the same number of rows' % sid, 'sql runs')
    # the dedup scene shows counts: they are recomputed with other queries
    wh.run(code['m6-dedup'])
    DD = shown['m6-dedup']['result']['rows']
    scalar = {'raw': wh.scalar('SELECT COUNT(*) FROM `brewline-dev.raw.orders_raw`'), 'kept': wh.scalar('SELECT COUNT(*) FROM `brewline-dev.staging.orders_dedup`'),
              'twice': wh.scalar('SELECT COUNT(*) FROM (SELECT order_id FROM `brewline-dev.raw.orders_raw` GROUP BY order_id HAVING COUNT(*) > 1)'),
              'paid': wh.scalar("SELECT COUNT(*) FROM (SELECT order_id FROM `brewline-dev.raw.orders_raw` GROUP BY order_id HAVING COUNT(*) > 1 AND ARRAY_AGG(status ORDER BY ingest_ts)[OFFSET(0)] = 'NEW' AND ARRAY_AGG(status ORDER BY ingest_ts)[OFFSET(1)] = 'PAID')")}
    expect([norm(r[1]) for r in DD] == [scalar['raw'], scalar['kept'], scalar['twice'], scalar['paid']], 'm6-dedup: the four counts of the lesson are recomputed (%s)' % scalar, 'sql runs')
    expect(scalar['raw'] - scalar['kept'] == REAL['counts']['sql.world']['duplicate_deliveries'], 'm6-dedup: raw minus kept is the number of repeats', 'sql runs')
    # the coding round: the solution runs in DuckDB on the table that is shown, and gives the result that is shown
    import duckdb
    ch = [x for x in SNIP if x['id'] == 'm15-ch' and x['kind'] == 'sol'][0]['code']
    con = duckdb.connect()
    con.execute('CREATE TABLE estimates (query VARCHAR, billed_bytes BIGINT)')
    for q, b in shown['m15-ch']['data']['rows']:
        con.execute('INSERT INTO estimates VALUES (?, ?)', [q, int(str(b).replace(',', ''))])
    got = [list(r) for r in con.execute(ch).fetchall()]
    expect(same_rows(got, shown['m15-ch']['res']['rows']), 'm15-ch: the solution gives the table that the lesson shows (got %s)' % got[:2], 'sql runs')
    control('a result with one number changed', lambda: not same_rows([['a', 1]], [['a', 2]]))
elif not HAVE_SQL:
    pass


# ======================================================================================================================
# 5. Shell snippets: syntax, and every flag must be one that the recording found in a help page
# ======================================================================================================================
FLAGS = {r[0]: set(r[1].split()) for r in REAL['tables']['cli.flags']['rows']}
GLOBAL = {'--project', '--format', '--quiet', '--verbosity', '--impersonate-service-account', '--billing-project', '--location', '--help'}


def commands(code):
    text = re.sub(r'\\\n\s*', ' ', code)
    buf = ''
    for line in text.splitlines():
        buf = (buf + ' ' + line) if buf else line
        try:
            toks = shlex.split(buf, comments=True)
        except ValueError:
            continue                                                                # a quote is still open: add the next line
        buf = ''
        if toks:
            yield toks


def flag_issues(code, where):
    """(the number of flags checked, a list of problems)"""
    n, issues = 0, []
    for toks in commands(code):
        if toks[0] not in ('gcloud', 'bq'):
            continue
        words = [t for t in toks[1:] if not t.startswith('-')]
        best = None
        for name in FLAGS:
            parts = name.split()
            if parts[0] == toks[0] and words[:len(parts) - 1] == parts[1:] and (best is None or len(parts) > len(best.split())):
                best = name
        if best is None:
            issues.append('%s: the command "%s %s" is not in the recorded help-page check' % (where, toks[0], ' '.join(words[:4])))
            continue
        for f in [t.split('=')[0] for t in toks[1:] if t.startswith('--')]:
            n += 1
            if f not in FLAGS[best] and f not in GLOBAL:
                issues.append('%s: %s is not a flag that the recording found for "%s"' % (where, f, best))
    return n, issues


for s in [s for s in SNIP if s['lang'] == 'bash']:
    r = run(['bash', '-n'], input=s['code'])
    expect(r.returncode == 0, '%s (%s): shell syntax (%s)' % (s['id'], s['kind'], r.stderr.strip()[:80]), 'shell snippets')
    n, issues = flag_issues(s['code'], s['id'])
    tick('flags checked against the help pages', n)
    for i in issues:
        bad(i)
control('a flag that no help page has', lambda: bool(flag_issues('gcloud pubsub topics create t --no-such-flag=1', 'control')[1]))
control('a command that was not checked', lambda: bool(flag_issues('gcloud compute instances create x', 'control')[1]))
control('shell that does not parse', lambda: run(['bash', '-n'], input='if then fi (').returncode != 0)


# ======================================================================================================================
# 6. The recording is made again and compared with js/real.js
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
    seconds = [k for k in diff if 'second' in k.lower()]
    return [k for k in diff if k not in seconds], seconds, len(new)


if not args.no_run:
    sections = 'gcs,formats,bqapi,sql,idem,beam,pubsub,fn,dataform,tf,ci,cli' + (',airflow,spark' if args.recapture else '')
    with tempfile.TemporaryDirectory() as d:
        out = pathlib.Path(d, 'real.js')
        r = run([sys.executable, str(HERE / 'capture_gcp.py'), '--only', sections, '--out', str(out)], cwd=str(ROOT))
        if r.returncode or not out.exists():
            bad('capture_gcp.py failed: ' + (r.stderr or r.stdout)[-400:])
        else:
            fresh = load_real(out)
            diff, seconds, n = compare(fresh, args.recapture)
            tick('recorded items compared', n)
            for k in diff[:12]:
                bad('the recording differs from js/real.js at %s' % k)
            if len(diff) > 12:
                bad('... and %d more differences' % (len(diff) - 12))
            notes.append('recapture (%s): %d items compared, %d differ, %d tolerated (names that say seconds)' % (sections, n, len(diff), len(seconds)))
    r = run(['node', str(HERE / 'check_widgets.js')], cwd=str(ROOT))
    last = (r.stdout.strip().splitlines() or [''])[-1]
    expect(r.returncode == 0, 'check_widgets.js: %s %s' % (last, r.stdout[-300:] if r.returncode else ''), 'widget data checks')
    m = re.match(r'(\d+) checks', last)
    tick('lab data checks', int(m.group(1)) if m else 0)


# ======================================================================================================================
print()
for n in notes:
    print('note:', n)
for sk in skips:
    print('skipped:', sk)
print('\nchecked:', json.dumps(counts, sort_keys=True))
print('%d problem(s)' % len(problems) if problems else 'all checks passed')
sys.exit(1 if problems else 0)
