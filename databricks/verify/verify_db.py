#!/usr/bin/env python3
"""Check the code and the recorded output of the Databricks tutorial.

Nothing in this tutorial ran on Databricks or on Azure. The Spark and Delta Lake output was recorded from the open-source
engines (capture_db.py). This script checks what can be checked without a Databricks workspace:

1. Every code snippet in the lessons is sorted into one group:
   - taken from the recording: a recorded file, a recorded text, or a commit that was printed from the recorded Delta log.
   - executed here on open-source Spark and Delta Lake, and compared with the recording: the Spark snippets must print the
     same plans as the recorded ones, the Delta SQL must give the recorded versions, rows, file counts and error classes.
   - checked against a published schema or SDK: the bundle files against the JSON schema of the Databricks CLI (a pinned
     release), the GitHub workflow against the SchemaStore workflow schema, the job and cluster JSON and the SDK calls
     against the Databricks Python SDK (every field name and every enum value).
   - checked for syntax only: Python with ast, SQL with sqlglot in the Databricks dialect (statements that sqlglot reads as a
     bare command are matched against the documented form and counted separately), shell with `bash -n`.
2. The logic of the lab widgets is checked against the recording and against arithmetic done by hand
   (node databricks/verify/check_widgets.js).
3. The content lint runs, which also fails when a lesson quotes a number that the recording no longer shows.
4. With --recapture, the whole recording is made again and compared with js/real.js. Byte sizes, ids, clock values and the
   order of parallel output are ignored. Anything else is reported.

What this cannot show: that Databricks accepts a statement, what Unity Catalog, Auto Loader, expectations, AUTO CDC, jobs, Photon or
serverless compute do, what anything costs, or that a command line flag of the Azure or Databricks CLI exists. Those screens carry the
"From documentation" tag, and the README lists the pages they come from.

Run:  python3 databricks/verify/verify_db.py [--no-run] [--offline] [--recapture]
Needs: pip install pyspark==4.2.0 delta-spark==4.4.1 pytest pandas pyarrow sqlglot pyyaml jsonschema regex databricks-sdk,
       Java 17 or 21, Node 20 or later, bash, curl (to download the two JSON schemas once).
"""
import argparse, ast, contextlib, datetime, decimal, importlib, inspect, io, json, logging, os, pathlib, re, shutil, subprocess, sys, tempfile

import sqlglot, yaml
from sqlglot import errors, exp

logging.getLogger('sqlglot').setLevel(logging.ERROR)

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
CACHE = HERE / '.cache'
CLI_VERSION = 'v1.25.0'
BUNDLE_SCHEMA_URL = 'https://raw.githubusercontent.com/databricks/cli/%s/bundle/schema/jsonschema.json' % CLI_VERSION
WORKFLOW_SCHEMA_URL = 'https://raw.githubusercontent.com/SchemaStore/schemastore/master/src/schemas/json/github-workflow.json'

ap = argparse.ArgumentParser()
ap.add_argument('--no-run', action='store_true', help='skip the runs on local Spark and Delta Lake')
ap.add_argument('--offline', action='store_true', help='do not download the JSON schemas (the schema checks are skipped)')
ap.add_argument('--recapture', action='store_true', help='record everything again and compare with js/real.js')
ap.add_argument('--reuse', action='store_true', help='with --recapture: compare the recording kept in verify/.cache from the last --recapture instead of recording again')
ap.add_argument('--verbose', action='store_true')
args = ap.parse_args()

problems = 0


def bad(msg):
    global problems
    problems += 1
    print('PROBLEM:', msg)


def load_real(path):
    text = pathlib.Path(path).read_text()
    return json.loads(text[text.index('LAB.real = ') + len('LAB.real = '):].rstrip().rstrip(';'))


real = load_real(ROOT / 'databricks' / 'js' / 'real.js')
dump = json.loads(subprocess.check_output(['node', str(ROOT / 'dev' / 'dump-scenes.js'), 'databricks']))
SN = {}                                                          # (id, kind) -> snippet
for s in dump['snippets']:
    SN[(s['id'], s['kind'])] = s
RES = {(r['id'], r['kind']): r for r in dump['results']}


def squeeze(s):
    return re.sub(r'\s+', ' ', s).strip().rstrip(';').strip()


def norm_plan(s):                                                # the same normalisation as capture_db.py
    s = re.sub(r'#\d+L?', '#N', s)
    s = re.sub(r'file:/[^\s,\]\)]*/(wh|warehouse|data|tables)/', 'file:/.../', s)
    s = re.sub(r'file:/[^\s,\]\)]+', 'file:/...', s)
    s = re.sub(r'plan_id=\d+', 'plan_id=N', s)
    s = re.sub(r'\[plan_id=N\]', '', s)
    s = re.sub(r'\bid=\d+\b', 'id=N', s)
    return s.strip()


def cell(v):                                                     # the same formatting as capture_db.py
    if v is None:
        return 'NULL'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, (datetime.datetime, datetime.date, decimal.Decimal)):
        return str(v)
    return str(v)


files_and_text = {v.strip() for v in real['files'].values()} | {v.strip() for v in real['text'].values() if isinstance(v, str)}
LOG_JSON = re.compile(r'^\{\n  "(commitInfo|metaData|protocol|add|remove|domainMetadata)"')


def from_recording(code):
    c = code.strip()
    return c in files_and_text or bool(LOG_JSON.match(c))


def download(url, name):
    CACHE.mkdir(exist_ok=True)
    path = CACHE / name
    if not path.exists():
        r = subprocess.run(['curl', '-sSfL', '-m', '180', '-o', str(path), url], capture_output=True, text=True)
        if r.returncode != 0:
            path.unlink(missing_ok=True)
            return None
    return path


# ---- 1. the sort: what each snippet is, and how it is checked -------------------------------------
RUN_PY = {('m2-lazy', 'code'), ('m2-narrow', 'code'), ('m2-wide', 'code'), ('m2-aqe step 2', 'step'), ('m2-salt', 'code'), ('m2-udf', 'code'),
          ('m2-cache', 'code'), ('m2-ch', 'sol'), ('m3-schema', 'code'), ('m4-ttfail', 'code'), ('m13-ch', 'sol')}
RUN_SQL = {('m3-history', 'code'), ('m3-tt', 'code'), ('m3-restore', 'code'), ('m3-merge', 'code'), ('m3-constraint', 'code'), ('m3-clone', 'code'),
           ('m4-small', 'code'), ('m4-zorder', 'code'), ('m4-liquid', 'code'), ('m4-vacuum', 'code')}

# Statements that Databricks documents and sqlglot reads only as a bare command. Each pattern is the documented form.
DOCUMENTED = [
    (re.compile(r'^(optimize [\w.]+( zorder by \([\w, ]+\))?|vacuum [\w.]+( dry run| retain \d+ hours)?)$', re.I), 'optimize and vacuum'),
    (re.compile(r'^describe (detail|history) [\w.]+( limit \d+)?$', re.I), 'describe detail and history'),
    (re.compile(r'^grant [\w ,]+ on (catalog|schema|table|external location) [\w.]+ to `[^`]+`$', re.I), 'grants'),
    (re.compile(r'^alter schema [\w.]+ set owner to `[^`]+`$', re.I), 'set owner'),
    (re.compile(r'^show grants on (catalog|schema|table) [\w.]+$', re.I), 'show grants'),
    (re.compile(r'^alter table [\w.]+ alter column \w+ set mask [\w.]+$', re.I), 'column mask'),
    (re.compile(r'^alter table [\w.]+ set row filter [\w.]+ on \(\w+\)$', re.I), 'row filter'),
    (re.compile(r"^create external location \w+ url '[^']+' with \(storage credential \w+\)$", re.I), 'external location'),
    (re.compile(r'^create flow \w+ as auto cdc into \w+ from stream\(\w+\) keys \(\w+\) sequence by \w+ stored as scd type [12]$', re.I), 'auto cdc flow'),
]
parsed = pattern = 0
pattern_kinds = {}


def check_sql(code):
    global parsed, pattern
    for part in [p for p in re.split(r';\s*(?:\n|$)', code) if p.strip()]:
        body = re.sub(r'--[^\n]*', '', part).strip()
        if not body:
            continue
        try:
            tree = sqlglot.parse_one(body, read='databricks', error_level=errors.ErrorLevel.RAISE)
        except errors.SqlglotError:
            tree = None
        if tree is not None and not isinstance(tree, exp.Command):
            parsed += 1
            continue
        flat = squeeze(body)
        for rx, kind in DOCUMENTED:
            if rx.match(flat):
                pattern += 1
                pattern_kinds[kind] = pattern_kinds.get(kind, 0) + 1
                break
        else:
            raise ValueError('no syntax tree and no documented pattern for: ' + flat[:90])


sdk_checked = {'json': 0, 'calls': 0}


def sdk_types():
    from databricks.sdk.service import compute, jobs
    return jobs, compute


def roundtrip(cls, doc, where):
    """A dict survives from_dict and as_dict only when every key and every enum value is known to the SDK."""
    back = cls.from_dict(doc).as_dict()

    def diff(a, b, path=''):
        out = []
        if isinstance(a, dict):
            for k in a:
                if not isinstance(b, dict) or k not in b:
                    out.append(path + '/' + k + ' is not known to the SDK')
                else:
                    out += diff(a[k], b[k], path + '/' + k)
        elif isinstance(a, list):
            for i, x in enumerate(a):
                out += diff(x, b[i] if isinstance(b, list) and i < len(b) else None, path + '[%d]' % i) if isinstance(x, (dict, list)) else ([] if isinstance(b, list) and i < len(b) and b[i] == x else [path + '[%d] changed' % i])
        elif a != b:
            out.append('%s: %r became %r' % (path, a, b))
        return out
    problems_here = diff(doc, back)
    if problems_here:
        raise ValueError('; '.join(problems_here[:3]))
    sdk_checked['json'] += 1


def check_sdk_python(code):
    jobs, _ = sdk_types()
    from databricks.sdk.service.jobs import JobsAPI
    tree = ast.parse(code)
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        chain, f = [], node.func
        while isinstance(f, ast.Attribute):
            chain.append(f.attr)
            f = f.value
        if isinstance(f, ast.Name):
            chain.append(f.id)
        chain = chain[::-1]
        kws = [k.arg for k in node.keywords if k.arg]
        if len(chain) == 2 and chain[0] == 'jobs':                      # jobs.Task(...), jobs.CronSchedule(...)
            cls = getattr(jobs, chain[1], None)
            if cls is None:
                raise ValueError('jobs.%s does not exist in the SDK' % chain[1])
            names = {x.name for x in __import__('dataclasses').fields(cls)}
            for k in kws:
                if k not in names:
                    raise ValueError('jobs.%s has no field %s' % (chain[1], k))
            sdk_checked['calls'] += 1
        elif len(chain) == 3 and chain[0] == 'w' and chain[1] == 'jobs':   # w.jobs.create(...), run_now, repair_run
            fn = getattr(JobsAPI, chain[2], None)
            if fn is None:
                raise ValueError('JobsAPI has no method %s' % chain[2])
            params = set(inspect.signature(fn).parameters)
            for k in kws:
                if k not in params:
                    raise ValueError('JobsAPI.%s has no parameter %s' % (chain[2], k))
            sdk_checked['calls'] += 1


POLICY_TYPES = {'fixed', 'allowlist', 'blocklist', 'range', 'regex', 'unlimited', 'forbidden'}
POLICY_KEYS = {'type', 'value', 'values', 'maxValue', 'minValue', 'defaultValue', 'hidden', 'isOptional', 'pattern'}
cli_checked = 0


def check_json(sid, kind, code):
    jobs, compute = sdk_types()
    if sid == 'm9-json':
        roundtrip(jobs.JobSettings, json.loads(code), sid)
    elif sid == 'm9-cond':
        for t in json.loads('[' + code + ']'):
            roundtrip(jobs.Task, t, sid)
    elif sid == 'm9-bug':
        roundtrip(jobs.Task, json.loads(code), sid)
    elif sid == 'm10-spot':
        roundtrip(compute.ClusterSpec, json.loads('{' + code + '}')['new_cluster'], sid)
    elif sid == 'm10-bug':
        roundtrip(compute.ClusterSpec, json.loads(code), sid)
    elif sid == 'm10-policy':
        doc = json.loads(code)
        for k, v in doc.items():
            assert v.get('type') in POLICY_TYPES, '%s: unknown policy type %r' % (k, v.get('type'))
            assert set(v) <= POLICY_KEYS, '%s: unknown policy key %s' % (k, sorted(set(v) - POLICY_KEYS))
    else:
        json.loads(code)


VAL = r'(?:[^\s<]|<[^>]+>)+'                                          # a value that may hold a placeholder such as <subscription id>
DOCUMENTED_CLI = [
    re.compile(r'^databricks bundle (validate|deploy|run|destroy)( [\w_]+)? -t \w+$'),
    re.compile(r'^databricks secrets create-scope --scope [\w-]+ --scope-backend-type AZURE_KEYVAULT --resource-id %s --dns-name \S+$' % VAL),
    re.compile(r'^az storage account create --resource-group \S+ --name \w+ --location \w+ --sku \w+ --kind \w+ --enable-hierarchical-namespace true$'),
    re.compile(r'^az role assignment create --assignee-object-id %s --assignee-principal-type ServicePrincipal --role "[^"]+" --scope %s$' % (r'<[^>]+>', VAL)),
]


def check_bash(code):
    global cli_checked
    r = subprocess.run(['bash', '-n'], input=code, capture_output=True, text=True)
    assert r.returncode == 0, r.stderr.strip()
    flat = re.sub(r'\\\n\s*', ' ', code)
    for line in [l.strip() for l in flat.splitlines() if l.strip() and not l.strip().startswith('#')]:
        line = re.sub(r'\s+', ' ', line)
        assert any(rx.match(line) for rx in DOCUMENTED_CLI), 'a command that matches no documented form: ' + line[:100]
        cli_checked += 1


def controls():
    """A check that cannot fail proves nothing. Feed each checker one broken input and make sure it complains."""
    jobs, compute = sdk_types()
    broken = {
        'SQL with an open parenthesis': lambda: check_sql('select count( from orders'),
        'SQL that is neither parsed nor a documented command': lambda: check_sql('vacuum all the things now'),
        'a job setting that the SDK does not know': lambda: roundtrip(jobs.JobSettings, {'name': 'x', 'max_concurent_runs': 1}, 'control'),
        'an enum value that the SDK does not know': lambda: roundtrip(jobs.Task, {'task_key': 'a', 'run_if': 'ALL_DONE_TYPO'}, 'control'),
        'a cluster setting that the SDK does not know': lambda: roundtrip(compute.ClusterSpec, {'num_workers': 2, 'node_type': 'Standard_DS3_v2'}, 'control'),
        'an SDK call with a parameter that does not exist': lambda: check_sdk_python("w.jobs.create(name='x', tasksz=[])"),
        'an SDK class that does not exist': lambda: check_sdk_python("jobs.Taskk(task_key='a')"),
        'a cluster policy with a rule type that does not exist': lambda: check_json('m10-policy', 'code', '{"num_workers": {"type": "fixd", "value": 2}}'),
        'shell with a syntax error': lambda: check_bash('if true; then echo a'),
        'a CLI line with a flag that is not in the documented form': lambda: check_bash('databricks bundle deploy --target prod'),
        'Python with a syntax error': lambda: ast.parse('def f(:\n  pass'),
    }
    for label, fn in broken.items():
        try:
            fn()
        except Exception:                                          # noqa: BLE001
            continue
        bad('the check accepted ' + label)
    return len(broken)


n_controls = controls()
parsed = pattern = cli_checked = 0                                 # the controls above must not count as checked statements
pattern_kinds.clear()
sdk_checked.update(json=0, calls=0)
copied = outputs = syntax = 0
by_lang = {}
for (sid, kind), sn in SN.items():
    code, lang = sn['code'], (sn['lang'] or '').lower()
    if (sid, kind) in RUN_PY or (sid, kind) in RUN_SQL:
        continue
    if kind == 'step' and lang == 'text' or lang == 'text':
        outputs += 1
        continue
    if from_recording(code):
        copied += 1
        continue
    where = '%s (%s, %s)' % (sid, kind, lang)
    by_lang[lang] = by_lang.get(lang, 0) + 1
    try:
        if lang == 'python':
            ast.parse(code)
            if sid == 'm9-sdk':
                check_sdk_python(code)
        elif lang == 'sql':
            check_sql(code)
        elif lang == 'json':
            check_json(sid, kind, code)
        elif lang in ('bash', 'sh'):
            check_bash(code)
        elif lang in ('yaml', 'yml'):
            yaml.safe_load(code)
        syntax += 1
    except Exception as e:                                         # noqa: BLE001
        bad('%s: %s' % (where, str(e).splitlines()[0][:220]))
print('controls: %d deliberately broken inputs were all rejected by the checkers below' % n_controls)
print('snippets: %d in all = %d taken from the recording + %d outputs and plans + %d run on Spark (section 3) + %d hand-written and checked %s'
      % (len(SN), copied, outputs, len(RUN_PY) + len(RUN_SQL), syntax, json.dumps(by_lang, sort_keys=True)))
if copied + outputs + len(RUN_PY) + len(RUN_SQL) + syntax != len(SN):
    bad('the groups do not add up to the %d snippets of the lessons' % len(SN))
print('  SQL: %d statements parsed by sqlglot (Databricks dialect), %d matched a documented form %s' % (parsed, pattern, json.dumps(pattern_kinds, sort_keys=True)))
print('  SDK: %d JSON documents survived a round trip through the Databricks SDK classes, %d SDK calls checked against the signatures' % (sdk_checked['json'], sdk_checked['calls']))
print('  CLI: %d command lines match the documented form (these commands were not run)' % cli_checked)

# ---- 2. the bundle against the schema of the Databricks CLI, the workflow against the GitHub schema ---------
schema_checks = 0
if args.offline:
    print('schemas: skipped (--offline)')
else:
    import jsonschema, jsonschema._keywords as kw, regex
    from jsonschema.exceptions import best_match
    kw.re = regex                                                  # the CLI schema uses \p{L}, which Python's re does not know
    bs = download(BUNDLE_SCHEMA_URL, 'bundle-schema-%s.json' % CLI_VERSION)
    ws = download(WORKFLOW_SCHEMA_URL, 'github-workflow.json')
    if bs is None or ws is None:
        print('schemas: could not be downloaded, skipped')
    else:
        bundle_schema, wf_schema = json.loads(bs.read_text()), json.loads(ws.read_text())
        cfg = yaml.safe_load(SN[('m11-bundle', 'code')]['code'])
        part = yaml.safe_load(SN[('m11-resource', 'code')]['code'])
        cfg['resources'] = part['resources']
        cfg.pop('include', None)
        v = jsonschema.Draft202012Validator(bundle_schema) if bundle_schema.get('$schema', '').endswith('2020-12/schema') else jsonschema.Draft7Validator(bundle_schema)
        err = best_match(v.iter_errors(cfg))
        if err is not None:
            bad('databricks.yml and resources/nightly.yml against the CLI %s schema: %s' % (CLI_VERSION, err.message[:200]))
        schema_checks += 1
        # a check that cannot fail proves nothing: break the bundle four ways and see each one rejected.
        # The schema types `mode` as a plain string, so a misspelled mode is NOT caught by it (the CLI checks that value itself).
        for label, mutate in (('a misspelled job setting', lambda c: c['resources']['jobs']['brewline_nightly'].__setitem__('max_concurent_runs', 1)),
                              ('a misspelled target setting', lambda c: c['targets']['prod'].__setitem__('mod', 'production')),
                              ('a wrong type', lambda c: c['resources']['jobs']['brewline_nightly']['tasks'][0].__setitem__('max_retries', 'two')),
                              ('a wrong enum value', lambda c: c['resources']['jobs']['brewline_nightly']['tasks'][-1].__setitem__('run_if', 'ALL_DONE_TYPO'))):
            broken = json.loads(json.dumps(cfg))
            mutate(broken)
            if not list(v.iter_errors(broken)):
                bad('the bundle schema check did not reject ' + label)
        wf = yaml.safe_load(SN[('m11-ci', 'code')]['code'])
        if True in wf:                                             # YAML 1.1 reads the key `on` as the boolean true
            wf['on'] = wf.pop(True)
        wv = jsonschema.Draft7Validator(wf_schema)
        err = best_match(wv.iter_errors(wf))
        if err is not None:
            bad('the workflow against the GitHub workflow schema: %s' % err.message[:200])
        schema_checks += 1
        broken = json.loads(json.dumps(wf))
        broken['jobs']['test']['runs-on'] = 7
        broken['jobs']['deploy']['stepz'] = []
        if not list(wv.iter_errors(broken)):
            bad('the workflow schema check did not reject a broken workflow')
        print('schemas: databricks.yml and resources/nightly.yml are valid against the Databricks CLI %s schema, and the workflow against the GitHub workflow schema; broken copies are rejected' % CLI_VERSION)

# ---- 3. run the Spark and Delta Lake snippets and compare them with the recording -------------------------
ran = 0
if args.no_run:
    print('runs: skipped (--no-run)')
else:
    from pyspark.sql import SparkSession, Window, functions as F
    from delta import configure_spark_with_delta_pip
    WORK = pathlib.Path(tempfile.mkdtemp(prefix='db-verify-'))
    RAW = ROOT / 'dbt' / 'verify' / 'raw'
    ORDERS_DDL = 'order_id string, customer_id string, order_ts timestamp, status string, total_usd decimal(12,2), _loaded_at timestamp'
    PROD_DDL = 'product_id string, name string, category string, price_usd decimal(12,2), _loaded_at timestamp'
    builder = (SparkSession.builder.master('local[4]').appName('verify')
               .config('spark.sql.extensions', 'io.delta.sql.DeltaSparkSessionExtension')
               .config('spark.sql.catalog.spark_catalog', 'org.apache.spark.sql.delta.catalog.DeltaCatalog')
               .config('spark.ui.enabled', 'false').config('spark.ui.showConsoleProgress', 'false')
               .config('spark.sql.warehouse.dir', str(WORK / 'warehouse')).config('spark.driver.memory', '3g')
               .config('spark.sql.session.timeZone', 'UTC').config('spark.sql.shuffle.partitions', '8')
               .config('spark.sql.adaptive.enabled', 'false'))
    spark = configure_spark_with_delta_pip(builder).getOrCreate()
    spark.sparkContext.setLogLevel('OFF')
    sql = spark.sql

    def reset_conf():
        for k, v in {'spark.sql.adaptive.enabled': 'false', 'spark.sql.autoBroadcastJoinThreshold': '10485760', 'spark.sql.shuffle.partitions': '8',
                     'spark.sql.adaptive.skewJoin.enabled': 'true', 'spark.sql.adaptive.coalescePartitions.enabled': 'true'}.items():
            spark.conf.set(k, v)

    def read_csv(name, ddl):
        return spark.read.option('header', True).schema(ddl).csv(str(RAW / (name + '.csv')))

    def rows_of(df, cols=None):
        d = df.select(*cols) if cols else df
        return [[cell(v) for v in r] for r in d.collect()]

    def capture(fn):
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            fn()
        return buf.getvalue()

    def plans(code, ns):
        out = capture(lambda: exec(compile(code, 'snippet', 'exec'), ns))
        return [norm_plan(p) for p in re.split(r'(?m)^(?==\= Physical Plan ==)', out) if p.strip()]

    run_failures = [0]

    def same(got, want, what):
        global ran
        ran += 1
        if got != want:
            run_failures[0] += 1
            bad('%s\n   got  %s\n   want %s' % (what, str(got)[:400], str(want)[:400]))

    def error_of(fn):
        try:
            fn()
        except Exception as e:                                       # noqa: BLE001
            m = re.search(r'\[([A-Z_.]+)\]', str(e))
            return m.group(1) if m else type(e).__name__
        return None

    reset_conf()
    orders, products = read_csv('orders', ORDERS_DDL), read_csv('products', PROD_DDL)
    pids = [r[0] for r in products.select('product_id').orderBy('product_id').collect()]
    arr = F.array(*[F.lit(p) for p in pids])
    orders_big = spark.range(0, 200000).select(F.concat(F.lit('O-'), F.col('id').cast('string')).alias('order_id'),
                                               F.concat(F.lit('C-'), (F.col('id') % 5000).cast('string')).alias('customer_id'),
                                               F.element_at(arr, (F.col('id') % len(pids)).cast('int') + 1).alias('product_id'),
                                               ((F.col('id') % 97) + 1).alias('qty'))
    skew = spark.range(0, 300000).select(F.when(F.col('id') % 10 < 8, F.lit('K-0')).otherwise(F.concat(F.lit('K-'), (F.col('id') % 49 + 1).cast('string'))).alias('k'), F.col('id').alias('v'))
    NS = dict(spark=spark, F=F, Window=Window, orders=orders, products=products, orders_big=orders_big, skew=skew)

    def snip(sid, kind):
        return SN[(sid, kind)]['code']

    # ---- Spark: the plans printed by the lesson code are the recorded plans
    same(plans(snip('m2-narrow', 'code'), dict(NS)), [real['text']['plan.narrow']], 'm2-narrow: explain() prints the recorded plan')
    same(plans(snip('m2-wide', 'code'), dict(NS)), [real['text']['plan.groupby']], 'm2-wide: explain() prints the recorded plan')
    same(plans(snip('m2-udf', 'code'), dict(NS)), [real['text']['plan.udf'], real['text']['plan.builtin']], 'm2-udf: the Python function and the built-in function print the recorded plans')
    same(plans(snip('m2-cache', 'code'), dict(NS)), [real['text']['plan.cached']], 'm2-cache: the cached plan')
    ns = dict(NS)
    got = plans(snip('m2-aqe step 2', 'step'), ns)
    reset_conf()
    same(got, [real['text']['plan.aqe_before'], real['text']['plan.aqe_after']], 'm2-aqe: the plans before and after the query ran')

    # ---- Spark: lazy evaluation, as counted by the job tracker
    sc = spark.sparkContext
    sc.setJobGroup('lazy', 'lazy demo')
    jobs_now = lambda: len(sc.statusTracker().getJobIdsForGroup('lazy'))
    body = ast.parse(snip('m2-lazy', 'code')).body
    ns, counts = dict(NS), [jobs_now()]
    for st in body:
        exec(compile(ast.Module([st], []), 'snippet', 'exec'), ns)
        counts.append(jobs_now())
    sc.setJobGroup('', '')
    L = real['counts']['spark.lazy']
    same([counts[0], counts[-2], counts[-1]], [L['jobs_before'], L['jobs_after_transformations'], L['jobs_after_action']], 'm2-lazy: no job before the action, one job after it')

    # ---- Spark: salting changes the partition sizes as recorded
    ns = dict(NS)
    vals = []
    for st in ast.parse(snip('m2-salt', 'code')).body:
        if isinstance(st, ast.Expr):
            vals.append(eval(compile(ast.Expression(st.value), 'snippet', 'eval'), ns))
        else:
            exec(compile(ast.Module([st], []), 'snippet', 'exec'), ns)
    size = lambda df: [r['n'] for r in df.groupBy(F.spark_partition_id().alias('p')).agg(F.count('*').alias('n')).orderBy('p').collect()]
    same([size(v) for v in vals], [real['counts']['spark.skew_partition_sizes']['by_key'], real['counts']['spark.skew_partition_sizes']['salted_32']], 'm2-salt: partition sizes by key and with a salt')

    # ---- coding rounds: the solutions give the results that the lessons show
    ns = dict(NS)
    exec(snip('m2-ch', 'sol'), ns)
    got = sorted(rows_of(ns['latest'], ['order_id', 'status', 'total_usd', '_loaded_at']))
    same(got, sorted(real['tables']['stream.silver_rows']['rows']), 'm2-ch: one row for each order, the newest version, as in the silver table')
    data = RES[('m13-ch', 'data')]
    df = spark.createDataFrame([(r[0], r[1], decimal.Decimal(r[2])) for r in data['rows']], 'order_date string, customer_id string, total_usd decimal(12,2)')
    ns = dict(NS)
    ns['orders'] = df
    exec(snip('m13-ch', 'sol'), ns)
    same(sorted(rows_of(ns['top'])), sorted(RES[('m13-ch', 'res')]['rows']), 'm13-ch: the top customer for each day, with the tie on 16 March')

    # ---- Delta Lake: the lesson SQL gives the recorded history, rows, errors and file counts
    cols = ['order_id', 'customer_id', 'order_ts', 'status', 'total_usd', '_loaded_at']
    latest = lambda df: df.withColumn('rn', F.row_number().over(Window.partitionBy('order_id').orderBy(F.col('_loaded_at').desc()))).filter('rn = 1').drop('rn')
    day = lambda d: orders.filter(F.to_date('_loaded_at') == F.lit(d).cast('date'))
    sql('create database m3')
    sql('use m3')
    # The recorder wrote version 0 to a path, which Delta Lake logs as WRITE. CREATE TABLE AS SELECT would log a different operation name.
    m3_path = str(WORK / 'orders_m3')
    latest(day('2026-03-14')).select(cols).coalesce(1).write.format('delta').save(m3_path)                               # version 0
    sql("create table orders using delta location '%s'" % m3_path)
    latest(day('2026-03-15')).select(cols).coalesce(1).write.format('delta').mode('append').saveAsTable('orders')        # version 1
    sql("update orders set status = 'SHIPPED' where order_id = 'O-5002'")                                                # version 2
    sql("delete from orders where status = 'CANCELLED'")                                                                 # version 3
    late = spark.createDataFrame([('O-5007', 'C-42', datetime.datetime(2026, 3, 16, 17, 55), 'SHIPPED', decimal.Decimal('16.00'), datetime.datetime(2026, 3, 17, 20, 0))],
                                 'order_id string, customer_id string, order_ts timestamp, status string, total_usd decimal(12,2), _loaded_at timestamp')
    latest(day('2026-03-16').unionByName(day('2026-03-17')).unionByName(late)).select(cols).createOrReplaceTempView('updates')
    sql(snip('m3-merge', 'code'))                                                                                        # version 4, the lesson MERGE
    same(snip('m3-merge', 'code').strip(), real['files']['delta/merge.sql'].strip(), 'm3-merge: the lesson shows the recorded merge file')
    sql('optimize orders')                                                                                               # version 5
    hist = [r['operation'] for r in sql(snip('m3-history', 'code')).orderBy('version').collect()]
    same(hist, [h['operation'] for h in real['history']['delta.orders']], 'm3-history: DESCRIBE HISTORY lists the recorded operations')
    t = sql(snip('m3-tt', 'code')).collect()
    same([[cell(v) for v in r] for r in t], real['tables']['delta.version_1']['rows'], 'm3-tt: VERSION AS OF 1 returns the recorded rows')
    sql(snip('m3-restore', 'code'))
    same(sorted(rows_of(spark.table('orders'), ['order_id', 'status', 'total_usd'])), sorted(real['tables']['delta.after_restore']['rows']), 'm3-restore: RESTORE gives the recorded table')
    last = sql('describe history orders').orderBy('version', ascending=False).collect()[0]
    same([last['operation'], last['operationMetrics']['numRestoredFiles']], ['RESTORE', real['counts']['delta.restore']['num_restored_files']], 'm3-restore: the restore is a new commit that restored the recorded number of files')

    # constraints, on a fresh table with the first day of orders
    sql('create database m3c')
    sql('use m3c')
    latest(day('2026-03-14')).select(cols).write.format('delta').saveAsTable('orders')
    stmts = [s for s in re.split(r';\s*(?:\n|$)', snip('m3-constraint', 'code')) if s.strip()]
    sql(stmts[0])
    same(error_of(lambda: sql(stmts[1])), 'DELTA_VIOLATE_CONSTRAINT_WITH_VALUES', 'm3-constraint: a negative total is rejected')
    same(error_of(lambda: sql(stmts[2])), 'DELTA_NEW_CHECK_CONSTRAINT_VIOLATION', 'm3-constraint: a rule that existing rows break is rejected')
    same(real['text']['delta.err_constraint'].startswith('[DELTA_VIOLATE_CONSTRAINT_WITH_VALUES]') and real['text']['delta.err_constraint_existing_rows'].startswith('[DELTA_NEW_CHECK_CONSTRAINT_VIOLATION]'), True, 'm3-constraint: the recorded messages have the same error classes')

    # shallow clone
    sql('create database m3d')
    sql('use m3d')
    latest(day('2026-03-14')).select(cols).write.format('delta').saveAsTable('orders')
    sql(snip('m3-clone', 'code'))
    loc = sql('describe detail orders_dev').collect()[0]['location'].replace('file:', '')
    same([len([f for f in os.listdir(loc) if f.endswith('.parquet')]), real['counts']['delta.shallow_clone']['parquet_files_in_clone_folder']], [0, 0], 'm3-clone: a shallow clone holds no data files')

    # schema enforcement and evolution, with the lesson code
    sql('create database m3s')
    sql('use m3s')
    path = str(WORK / 'schema')
    latest(day('2026-03-14')).select(cols).coalesce(1).write.format('delta').save(path)
    new_orders = latest(day('2026-03-15')).select(cols)
    ns = dict(NS)
    ns.update(new_orders=new_orders, path=path)
    body = ast.parse(snip('m3-schema', 'code')).body
    exec(compile(ast.Module([body[0]], []), 'snippet', 'exec'), ns)
    same(error_of(lambda: exec(compile(ast.Module([body[1]], []), 'snippet', 'exec'), ns)), 'DELTA_METADATA_MISMATCH', 'm3-schema: an extra column is rejected')
    exec(compile(ast.Module(body[2:], []), 'snippet', 'exec'), ns)
    same(sorted(rows_of(spark.read.format('delta').load(path), ['order_id', 'status', 'channel'])), sorted(real['tables']['delta.after_merge_schema']['rows']), 'm3-schema: mergeSchema adds the column, as recorded')

    # layout
    sql('create database m4')
    sql('use m4')
    for i in range(40):
        (spark.range(i * 50, (i + 1) * 50).select(F.concat(F.lit('O-'), F.col('id').cast('string')).alias('order_id'), (F.col('id') % 40).cast('string').alias('customer_id'), (F.col('id') % 97).alias('qty'))
         .coalesce(1).write.format('delta').mode('append').saveAsTable('orders_small'))
    same(sql('describe detail orders_small').collect()[0]['numFiles'], real['counts']['layout.small_before']['numFiles'], 'm4-small: 40 appends leave 40 files')
    sql(snip('m4-small', 'code'))
    same(sql('describe detail orders_small').collect()[0]['numFiles'], real['counts']['layout.small_after']['numFiles'], 'm4-small: OPTIMIZE leaves 1 file')

    big = spark.range(400000).select(F.col('id').alias('order_id'), F.concat(F.lit('C-'), F.format_string('%04d', F.pmod(F.xxhash64('id'), F.lit(2000)))).alias('customer_id'),
                                     F.pmod(F.xxhash64('id'), F.lit(90)).alias('day_offset'), (F.col('id') % 97).alias('qty'))
    big.repartition(16).write.format('delta').saveAsTable('orders_big')
    spark.conf.set('spark.databricks.delta.optimize.maxFileSize', str(1024 * 1024))
    Z = real['counts']['layout.zorder']
    same(sql('describe detail orders_big').collect()[0]['numFiles'], Z['total_files_before'], 'm4-zorder: the table starts with 16 files')
    sql(snip('m4-zorder', 'code'))
    nd = sql('describe detail orders_big').collect()[0]
    same(nd['numFiles'], Z['total_files_after'], 'm4-zorder: OPTIMIZE ZORDER leaves the recorded number of files')
    hist = sql('describe history orders_big').orderBy('version', ascending=False).collect()[0]
    same([hist['operation'], hist['operationParameters']['zOrderBy']], ['OPTIMIZE', '["customer_id"]'], 'm4-zorder: the history records the Z-order column')

    stmts = [s for s in re.split(r';\s*(?:\n|$)', snip('m4-liquid', 'code')) if s.strip()]
    sql(stmts[0])
    big.select('order_id', 'customer_id', F.col('qty').cast('int')).repartition(16).write.format('delta').mode('append').saveAsTable('lc_orders')
    same(sql('describe detail lc_orders').collect()[0]['numFiles'], real['counts']['layout.liquid_before']['numFiles'], 'm4-liquid: 16 files before OPTIMIZE')
    sql(stmts[1])
    d2 = sql('describe detail lc_orders').collect()[0]
    same([d2['numFiles'], list(d2['clusteringColumns'])], [real['counts']['layout.liquid_after']['numFiles'], real['counts']['layout.liquid_after']['clusteringColumns']], 'm4-liquid: OPTIMIZE leaves the recorded files and the clustering column')
    spark.conf.unset('spark.databricks.delta.optimize.maxFileSize')

    v0 = spark.range(0, 1000).selectExpr('id as order_id', 'cast(id % 40 as string) as customer_id').coalesce(1)
    v0.write.format('delta').saveAsTable('orders')
    v0.limit(500).write.format('delta').mode('overwrite').saveAsTable('orders')
    v0.limit(100).write.format('delta').mode('overwrite').saveAsTable('orders')
    stmts = [s for s in re.split(r';\s*(?:\n|$)', snip('m4-vacuum', 'code')) if s.strip()]
    same(len(sql(stmts[0]).collect()), real['counts']['layout.vacuum_dry_default_retention']['files_to_delete'], 'm4-vacuum: a dry run at the default retention finds no file')
    same(error_of(lambda: sql(stmts[1])), 'DELTA_VACUUM_RETENTION_PERIOD_TOO_SHORT', 'm4-vacuum: a retention of 0 hours is refused')
    spark.conf.set('spark.databricks.delta.retentionDurationCheck.enabled', 'false')
    sql(stmts[1])
    spark.conf.set('spark.databricks.delta.retentionDurationCheck.enabled', 'true')
    tt = SN[('m4-ttfail', 'code')]['code']
    ns = dict(NS)
    ns['path'] = sql('describe detail orders').collect()[0]['location']
    same(error_of(lambda: exec(tt, ns)), 'FAILED_READ_FILE.FILE_NOT_EXIST', 'm4-ttfail: time travel after VACUUM fails with the recorded error class')
    spark.stop()
    shutil.rmtree(WORK, ignore_errors=True)
    print('runs: %d comparisons of lesson code against the recording on Spark %s and Delta Lake %s, %d matched%s'
          % (ran, real['meta']['spark'], real['meta']['delta'], ran - run_failures[0], '' if not run_failures[0] else ', %d did not' % run_failures[0]))

# ---- 4. widgets and lint ----------------------------------------------------------------------------
r = subprocess.run(['node', str(HERE / 'check_widgets.js')], capture_output=True, text=True)
print('widgets:', (r.stdout.strip().splitlines() or ['no output'])[-1])
if r.returncode != 0:
    bad('check_widgets.js failed:\n' + r.stdout[-800:] + r.stderr[-400:])
r = subprocess.run(['node', str(ROOT / 'dev' / 'lint-content.js'), 'databricks'], capture_output=True, text=True)
print('lint:', (r.stdout.strip().splitlines() or ['no output'])[-1])
if r.returncode != 0:
    bad('the content lint failed:\n' + r.stdout[-800:])

# ---- 5. record everything again and compare ----------------------------------------------------------
if args.recapture:
    CACHE.mkdir(exist_ok=True)
    fresh_js, fresh_json = CACHE / 'real_fresh.js', CACHE / 'real_fresh.json'
    if args.reuse and fresh_json.exists():
        r = subprocess.CompletedProcess([], 0, '', '')
    else:
        r = subprocess.run([sys.executable, str(HERE / 'capture_db.py'), '--out', str(fresh_js), '--json', str(fresh_json)], capture_output=True, text=True)
    if r.returncode != 0:
        bad('capture_db.py failed:\n' + (r.stdout + r.stderr)[-1200:])
    else:
        UUID = re.compile(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')
        VOLATILE = re.compile(r'(?i)(bytes|size|files(added|removed)\.(min|max)$)')

        def canon(x, key=''):
            if isinstance(x, dict):
                return {k: canon(v, key + '.' + k if key else k) for k, v in x.items()}
            if isinstance(x, list):
                items = [canon(v, key) for v in x]
                if key.split('.')[-1] in ('log', 'actions'):        # parallel flows queue in any order, and a clone lists files in directory order
                    items = sorted(items, key=lambda v: json.dumps(v, sort_keys=True))
                return items
            if VOLATILE.search(key) and isinstance(x, (int, float, str)) and re.fullmatch(r'\d+', str(x)):
                return 0                                            # a byte count: Parquet footers differ by a few bytes between runs
            if isinstance(x, str):
                x = UUID.sub('<id>', x)
                return re.sub(r'/tmp/db-capture-\w+', '<work>', x)
            return x

        def zsummary(rec):
            """OPTIMIZE ... ZORDER BY splits the data at boundaries that Spark picks by sampling, so the exact ranges and row counts of the
            three new files change from run to run. Compare what the lessons rely on: how many files, how many rows, that the ranges
            are in order, and that no customer sits in more than two files."""
            rec = json.loads(json.dumps(rec))
            z = rec['counts']['layout.zorder']
            after = z['files_after']
            z['files_after'] = {
                'files': len(after), 'rows': sum(f['rows'] for f in after),
                'ordered': all(after[i]['min'] <= after[i + 1]['min'] and after[i]['max'] <= after[i + 1]['max'] for i in range(len(after) - 1)),
                'most_files_for_one_customer': max(sum(1 for f in after if f['min'] <= c <= f['max']) for c in ['C-%04d' % n for n in range(2000)])}
            return rec

        def diffs(a, b, path=''):
            if isinstance(a, dict) and isinstance(b, dict):
                out = []
                for k in sorted(set(a) | set(b)):
                    out += ['added ' + path + '.' + k] if k not in a else ['removed ' + path + '.' + k] if k not in b else diffs(a[k], b[k], path + '.' + k)
                return out
            if isinstance(a, list) and isinstance(b, list):
                if len(a) != len(b):
                    return ['changed %s: %d items before, %d now' % (path, len(a), len(b))]
                return [x for i, (u, v) in enumerate(zip(a, b)) for x in diffs(u, v, '%s[%d]' % (path, i))]
            return [] if a == b else ['changed %s: %s -> %s' % (path, repr(a)[:70], repr(b)[:70])]
        fresh = json.loads(fresh_json.read_text())
        old, new = canon(zsummary(real)), canon(zsummary(fresh))
        d = diffs(old, new)
        if d:
            for x in d[:40]:
                bad('the recording differs: ' + x)
            if len(d) > 40:
                bad('... and %d more differences' % (len(d) - 40))
        else:
            print('recapture: %s were recorded again and match js/real.js, apart from byte sizes, ids and the order of parallel output'
                  % ', '.join('%d %s' % (len(new[k]), k) for k in ('files', 'text', 'tables', 'logs', 'history', 'counts')))

print('verification clean' if not problems else '%d problem(s)' % problems)
sys.exit(1 if problems else 0)
