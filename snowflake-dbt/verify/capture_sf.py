#!/usr/bin/env python3
"""Record what dbt-snowflake sends to Snowflake, with no Snowflake account.

dbt-snowflake is run for real on the Brewline project. Its connection is replaced by a stand-in (verify/stand_in)
that writes down every statement dbt sends and answers dbt's metadata questions from a small state file.
Nothing runs on Snowflake, so the statements are exactly what dbt generates, and every result is a placeholder.

Writes snowflake-dbt/js/real.js: the Snowflake project files, the recorded statements per scenario, and a few facts
read from the adapter itself (version numbers, the credential fields it accepts).

Usage:   python3 snowflake-dbt/verify/capture_sf.py --dbt PATH-TO-dbt [--out snowflake-dbt/js/real.js] [--keep]
Needs:   a Python environment with dbt-core and dbt-snowflake (the stand-in replaces the connector's connect(),
         so no account and no network are needed), and git for `dbt deps`.
"""
import argparse, json, os, pathlib, re, shutil, subprocess, sys, tempfile

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
SRC = ROOT / 'dbt' / 'verify' / 'project'
STAND_IN = HERE / 'stand_in'
IGNORE = shutil.ignore_patterns('target', 'logs', 'dbt_packages', '*.duckdb', '*.duckdb.wal', 'state', 'package-lock.yml', '__pycache__', '.user.yml')

ap = argparse.ArgumentParser()
ap.add_argument('--dbt', required=True)
ap.add_argument('--out', default=str(HERE.parent / 'js' / 'real.js'))
ap.add_argument('--keep', action='store_true')
ap.add_argument('--json')
args = ap.parse_args()
PY = str(pathlib.Path(args.dbt).with_name('python'))

WORK = pathlib.Path(tempfile.mkdtemp(prefix='sfdbt-capture-'))
OUT = {'meta': {}, 'files': {}, 'stmts': {}, 'text': {}, 'conns': {}}

# ----------------------------------------------------------------------------- the Snowflake project
PROFILES = """brewline:
  target: dev
  outputs:
    dev:
      type: snowflake
      account: "{{ env_var('SNOWFLAKE_ACCOUNT') }}"
      user: "{{ env_var('SNOWFLAKE_USER') }}"
      private_key_path: "{{ env_var('SNOWFLAKE_PRIVATE_KEY_PATH') }}"
      role: TRANSFORMER
      warehouse: WH_TRANSFORM_DEV
      database: BREWLINE_DEV
      schema: DEV_ALICE
      threads: 4
    ci:
      type: snowflake
      account: "{{ env_var('SNOWFLAKE_ACCOUNT') }}"
      user: "{{ env_var('SNOWFLAKE_USER') }}"
      private_key_path: "{{ env_var('SNOWFLAKE_PRIVATE_KEY_PATH') }}"
      role: CI_DEPLOYER
      warehouse: WH_CI
      database: BREWLINE_CI
      schema: "PR_{{ env_var('PR_NUMBER', '0') }}"
      threads: 4
    prod:
      type: snowflake
      account: "{{ env_var('SNOWFLAKE_ACCOUNT') }}"
      user: "{{ env_var('SNOWFLAKE_USER') }}"
      private_key_path: "{{ env_var('SNOWFLAKE_PRIVATE_KEY_PATH') }}"
      role: TRANSFORMER
      warehouse: WH_TRANSFORM
      database: BREWLINE
      schema: ANALYTICS
      threads: 8
      query_tag: dbt_brewline_prod
"""

GSN = """{% macro generate_schema_name(custom_schema_name, node) -%}
    {%- set default_schema = target.schema -%}
    {%- if target.name == 'prod' and custom_schema_name is not none -%}
        {{ custom_schema_name | trim }}
    {%- else -%}
        {{ default_schema }}
    {%- endif -%}
{%- endmacro %}
"""

# ----------------------------------------------------------------------------- helpers
def private_key(path):
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    path.write_bytes(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))


def tidy(sql):
    """Remove blank lines and trailing spaces. The words and the order are exactly what dbt sent."""
    lines = [ln.rstrip() for ln in sql.split('\n')]
    lines = [ln for ln in lines if ln.strip()]
    text = '\n'.join(lines).strip().rstrip(';').strip()
    text = re.sub(r'(create or replace)\s+((?:transient |temporary |secure )?(?:view|table|dynamic table))', r'\1 \2', text)
    text = re.sub(r'__dbt_tmp_?\d{14,28}', '__dbt_tmp', text)
    return text


# dbt adds a query comment to every statement: /* {"app": "dbt", ...} */. It sits at the end, sometimes before a semicolon.
COMMENT = re.compile(r'/\*\s*(\{"app": "dbt".*?\})\s*\*/', re.S)


def split_comment(sql):
    """(statement without dbt's query comment, the comment's JSON text or None)"""
    found = COMMENT.findall(sql)
    return COMMENT.sub('', sql), (found[0] if found else None)


def bare(sql):
    """The statement without `--` comment lines, lower case, for deciding whether it is only begin or commit."""
    keep = [ln for ln in sql.split('\n') if not ln.strip().startswith('--')]
    return '\n'.join(keep).strip().rstrip(';').strip().lower()


def kind_of(sql):
    w = re.sub(r'^\W+', '', sql.lower()).split(None, 1)[0] if sql.strip() else ''
    if w in ('show', 'describe', 'desc'):
        return 'meta'
    if w in ('create', 'drop', 'alter', 'use', 'grant', 'revoke', 'comment', 'undrop'):
        return 'ddl'
    if w in ('merge', 'insert', 'delete', 'update', 'copy', 'call', 'truncate'):
        return 'dml'
    if w in ('begin', 'commit', 'rollback'):
        return 'txn'
    return 'query'


class Sc:
    def __init__(self, name, src=None):
        self.name = name
        self.dir = WORK / name
        shutil.copytree(src or BASE, self.dir)
        self.state = self.dir / 'state.json'
        self.log = self.dir / 'statements.jsonl'
        self.key = WORK / 'key.pem'

    def write(self, rel, text):
        p = self.dir / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text)

    def read(self, rel):
        return (self.dir / rel).read_text()

    def patch(self, rel, old, new):
        t = self.read(rel)
        assert old in t, 'patch target not found in %s: %r' % (rel, old)
        self.write(rel, t.replace(old, new, 1))

    def prime(self, schemas=(), relations=(), columns=None, grants=None):
        """Tell the stand-in which schemas and relations already exist, as dbt would find them in a real account."""
        st = {'schemas': [s.upper() for s in schemas], 'relations': {}, 'columns': {k.upper(): v for k, v in (columns or {}).items()},
              'grants': {k.upper(): v for k, v in (grants or {}).items()}}
        for r in relations:
            db, sch, name, kind = [x.upper() for x in r]
            st['relations'].setdefault(db + '.' + sch, {})[name] = {'kind': kind, 'dynamic': False}
        self.state.write_text(json.dumps(st))

    def dbt(self, *a, key=None, target='dev', env=None):
        e = dict(os.environ, DBT_PROFILES_DIR=str(self.dir), DBT_SEND_ANONYMOUS_USAGE_STATS='False', NO_COLOR='1', DO_NOT_TRACK='1',
                 PYTHONPATH=str(STAND_IN), FAKE_SF_LOG=str(self.log), FAKE_SF_STATE=str(self.state),
                 SNOWFLAKE_ACCOUNT='acme-brewline', SNOWFLAKE_USER='DBT_SERVICE', SNOWFLAKE_PRIVATE_KEY_PATH=str(self.key), PR_NUMBER='123')
        e.update(env or {})
        if not self.state.exists():
            self.state.write_text(json.dumps({'schemas': [], 'relations': {}, 'columns': {}}))
        if self.log.exists():
            self.log.unlink()
        argv = [args.dbt, '--no-use-colors'] + list(a) + (['--target', target] if target else [])
        p = subprocess.run(argv, cwd=self.dir, env=e, capture_output=True, text=True)
        stmts, connects = [], []
        if self.log.exists():
            for ln in self.log.read_text().splitlines():
                sql = json.loads(ln)['sql']
                if sql.startswith('-- connect'):
                    connects.append(json.loads(sql[len('-- connect'):]))
                    continue
                body, comment = split_comment(sql)
                word = bare(body)
                if word == '':
                    continue
                if word in ('begin', 'commit', 'rollback'):   # dbt's `-- back compat` comment line goes with the begin
                    stmts.append({'kind': 'txn', 'sql': word, 'comment': comment})
                    continue
                body = tidy(body)
                stmts.append({'kind': kind_of(body), 'sql': body, 'comment': comment})
        if key:
            OUT['stmts'][key] = stmts
            OUT['conns'][key] = len(connects)
            if connects:
                OUT['text']['connect_' + key] = json.dumps(connects[0], indent=2, sort_keys=True)
        return p.returncode, p.stdout + p.stderr, stmts


# ----------------------------------------------------------------------------- base project
BASE = WORK / 'base'
shutil.copytree(SRC, BASE, ignore=IGNORE)
private_key(WORK / 'key.pem')
(BASE / 'profiles.yml').write_text(PROFILES)
(BASE / 'macros' / 'generate_schema_name.sql').write_text(GSN)
src_yml = BASE / 'models' / 'staging' / 'brewline' / '_brewline__sources.yml'
src_yml.write_text(src_yml.read_text().replace('    schema: raw\n', '    database: BREWLINE\n    schema: raw\n', 1))

base = Sc.__new__(Sc)
base.name, base.dir = 'base', BASE
base.state, base.log, base.key = BASE / 'state.json', BASE / 'statements.jsonl', WORK / 'key.pem'
code, text, _ = base.dbt('deps', target=None)
assert code == 0, text

# facts read from the installed adapter, not typed by hand
facts = json.loads(subprocess.check_output([PY, '-c', '''
import json, importlib.metadata as md
from dbt.adapters.snowflake.connections import SnowflakeCredentials
print(json.dumps({"versions": {p: md.version(p) for p in ["dbt-core", "dbt-snowflake", "snowflake-connector-python"]},
                  "fields": sorted(SnowflakeCredentials.__dataclass_fields__.keys())}))
''']))
src_file = subprocess.check_output([PY, '-c', 'import dbt.adapters.snowflake.connections as c; print(c.__file__)'], text=True).strip()
auth = []
for ln in pathlib.Path(src_file).read_text().splitlines():
    if re.search(r'authenticator (==|!=|not in)|authenticator.lower\(\) ==|Cannot specify both|result\["authenticator"\]|QUERY_TAG', ln):
        auth.append(ln.strip())
OUT['text']['auth_source'] = '\n'.join(auth)
OUT['meta'].update(facts['versions'])
OUT['text']['credential_fields'] = json.dumps(facts['fields'])
for rel in ['profiles.yml', 'dbt_project.yml', 'macros/generate_schema_name.sql', 'models/staging/brewline/_brewline__sources.yml',
            'models/marts/core/fct_orders.sql', 'models/marts/core/dim_customers.sql', 'models/marts/finance/fct_daily_revenue.sql',
            'models/marts/_marts__models.yml', 'snapshots/snap_customers.yml', 'seeds/country_names.csv']:
    OUT['files'][rel] = (BASE / rel).read_text()

FCT_COLS = [['ORDER_ID', 'VARCHAR(16777216)'], ['CUSTOMER_ID', 'VARCHAR(16777216)'], ['ORDERED_AT', 'TIMESTAMP_NTZ(9)'], ['ORDER_STATUS', 'VARCHAR(16777216)'],
            ['ORDER_TOTAL_USD', 'NUMBER(12,2)'], ['ITEMS_TOTAL_USD', 'NUMBER(38,2)'], ['IS_RECONCILED', 'BOOLEAN'], ['LOADED_AT', 'TIMESTAMP_NTZ(9)']]
SNAP_COLS = [['CUSTOMER_ID', 'VARCHAR(16777216)'], ['FULL_NAME', 'VARCHAR(16777216)'], ['EMAIL', 'VARCHAR(16777216)'], ['COUNTRY', 'VARCHAR(16777216)'], ['TIER', 'VARCHAR(16777216)'],
             ['_LOADED_AT', 'TIMESTAMP_NTZ(9)'], ['DBT_SCD_ID', 'VARCHAR(32)'], ['DBT_UPDATED_AT', 'TIMESTAMP_NTZ(9)'], ['DBT_VALID_FROM', 'TIMESTAMP_NTZ(9)'], ['DBT_VALID_TO', 'TIMESTAMP_NTZ(9)']]
DEV = 'BREWLINE_DEV'
DEVS = DEV + '.DEV_ALICE'   # the override puts every model of a developer into one schema


def primed_fct(sc):
    sc.prime(schemas=[DEVS], relations=[(DEV, 'DEV_ALICE', 'FCT_ORDERS', 'TABLE')], columns={DEVS + '.FCT_ORDERS': FCT_COLS})


# ----------------------------------------------------------------------------- 0. signing in: dbt debug, and the arguments each kind of profile hands to the connector
ALT = """    pw:
      type: snowflake
      account: "{{ env_var('SNOWFLAKE_ACCOUNT') }}"
      user: "{{ env_var('SNOWFLAKE_USER') }}"
      password: "{{ env_var('SNOWFLAKE_PASSWORD') }}"
      role: TRANSFORMER
      warehouse: WH_TRANSFORM_DEV
      database: BREWLINE_DEV
      schema: DEV_ALICE
      threads: 4
    sso:
      type: snowflake
      account: "{{ env_var('SNOWFLAKE_ACCOUNT') }}"
      user: alice@brewline.example
      authenticator: externalbrowser
      role: TRANSFORMER
      warehouse: WH_TRANSFORM_DEV
      database: BREWLINE_DEV
      schema: DEV_ALICE
      threads: 4
"""
OUT['files']['scenario/profiles_other_sign_in.yml'] = ALT
sc = Sc('auth')
sc.write('profiles.yml', sc.read('profiles.yml').rstrip('\n') + '\n' + ALT)
for key, tgt in [('debug_dev', 'dev'), ('debug_pw', 'pw'), ('debug_sso', 'sso')]:
    code, text, _ = sc.dbt('debug', key=key, target=tgt, env={'SNOWFLAKE_PASSWORD': 'not-a-real-password'})
    text = text.replace(str(sc.dir), '~/brewline').replace(str(WORK), '~/tmp')
    text = re.sub(r'(python path: ).*', r'\1~/venv/bin/python3', text)
    text = re.sub(r'(os info: ).*', r'\1Linux', text)
    OUT['text'][key] = text
    assert code == 0, text

# ----------------------------------------------------------------------------- 1. a first run in a developer schema
sc = Sc('first_run')
sc.dbt('run', key='run_all_dev')
sc.dbt('seed', key='seed_dev')
sc.dbt('snapshot', key='snapshot_first')

# ----------------------------------------------------------------------------- 2. the same run in the other targets (schema names)
sc = Sc('prod_names')
sc.dbt('run', '-s', 'stg_brewline__customers', 'dim_customers', key='run_two_prod', target='prod')
sc = Sc('ci_names')
sc.dbt('run', '-s', 'stg_brewline__customers', 'dim_customers', key='run_two_ci', target='ci')

# ----------------------------------------------------------------------------- 3. incremental strategies
FCT = 'models/marts/core/fct_orders.sql'
OLD_CFG = "unique_key='order_id',"
for name, cfg in [('merge', None),
                  ('delete_insert', "incremental_strategy='delete+insert',"),
                  ('append', "incremental_strategy='append',"),
                  ('predicates', "incremental_predicates=[\"DBT_INTERNAL_DEST.ordered_at >= dateadd(day, -7, current_date)\"],"),
                  ('merge_columns', "merge_update_columns=['order_status', 'order_total_usd', 'loaded_at'],")]:
    sc = Sc('incr_' + name)
    if cfg:
        sc.patch(FCT, OLD_CFG, "unique_key='order_id',\n        " + cfg)
    OUT['files']['scenario/fct_orders_' + name + '.sql'] = sc.read(FCT)
    primed_fct(sc)
    sc.dbt('run', '-s', 'fct_orders', key='incr_' + name)

sc = Sc('incr_nokey')
sc.patch(FCT, OLD_CFG, "incremental_strategy='merge',")
OUT['files']['scenario/fct_orders_merge_nokey.sql'] = sc.read(FCT)
primed_fct(sc)
sc.dbt('run', '-s', 'fct_orders', key='incr_merge_nokey')

sc = Sc('incr_schema')
sc.prime(schemas=[DEVS], relations=[(DEV, 'DEV_ALICE', 'FCT_ORDERS', 'TABLE')],
         columns={DEVS + '.FCT_ORDERS': FCT_COLS, DEVS + '.FCT_ORDERS__DBT_TMP': FCT_COLS + [['IS_CANCELLED', 'BOOLEAN']]})
sc.dbt('run', '-s', 'fct_orders', key='incr_schema_append')

sc = Sc('incr_first')
sc.dbt('run', '-s', 'fct_orders', key='incr_first_run')
sc = Sc('incr_full_refresh')
primed_fct(sc)
sc.dbt('run', '-s', 'fct_orders', '--full-refresh', key='incr_full_refresh')

sc = Sc('incr_microbatch')
sc.write(FCT, """{{
    config(
        materialized='incremental',
        incremental_strategy='microbatch',
        event_time='ordered_at',
        batch_size='day',
        begin='2026-03-14',
        lookback=1
    )
}}

select
    order_id,
    customer_id,
    ordered_at,
    order_status,
    order_total_usd,
    items_total_usd,
    order_total_usd = items_total_usd as is_reconciled,
    loaded_at
from {{ ref('int_orders__with_items') }}
""")
sc.write('models/intermediate/_intermediate__models.yml', 'models:\n  - name: int_orders__with_items\n    config:\n      event_time: ordered_at\n')
OUT['files']['scenario/_intermediate__models_event_time.yml'] = sc.read('models/intermediate/_intermediate__models.yml')
OUT['files']['scenario/fct_orders_microbatch.sql'] = sc.read(FCT)
primed_fct(sc)
sc.dbt('run', '-s', 'fct_orders', '--event-time-start', '2026-03-17', '--event-time-end', '2026-03-19', key='incr_microbatch')

# ----------------------------------------------------------------------------- 4. Snowflake settings on one small model
SCRATCH = 'models/scratch/cfg_demo.sql'
BODY = "select customer_id, full_name, email, tier\nfrom {{ ref('stg_brewline__customers') }}\n"
CFGS = {
    'baseline': "{{ config(materialized='table') }}",
    'transient_false': "{{ config(materialized='table', transient=false) }}",
    'copy_grants': "{{ config(materialized='table', copy_grants=true) }}",
    'cluster_by': "{{ config(materialized='table', cluster_by=['tier']) }}",
    'warehouse': "{{ config(materialized='table', snowflake_warehouse='WH_TRANSFORM_XL') }}",
    'query_tag': "{{ config(materialized='table', query_tag='dbt_brewline_' ~ target.name) }}",
    'secure_view': "{{ config(materialized='view', secure=true) }}",
    'grants': "{{ config(materialized='table', grants={'select': ['REPORTER', 'ANALYST']}) }}",
    'dynamic_table': "{{ config(materialized='dynamic_table', target_lag='1 hour', snowflake_warehouse='WH_TRANSFORM', refresh_mode='AUTO') }}",
    'post_hook': "{{ config(materialized='table', post_hook=\"alter table {{ this }} modify column email set masking policy BREWLINE.GOVERNANCE.EMAIL_MASK\") }}",
}
STG_OK = [(DEV, 'DEV_ALICE', 'STG_BREWLINE__CUSTOMERS', 'VIEW'), (DEV, 'DEV_ALICE', 'STG_BREWLINE__ORDERS', 'VIEW')]
for k, head in CFGS.items():
    sc = Sc('cfg_' + k)
    body = BODY
    sc.write(SCRATCH, head + '\n\n' + body)
    OUT['files']['scenario/cfg_' + k + '.sql'] = head + '\n\n' + body
    sc.prime(schemas=[DEVS], relations=STG_OK)
    sc.dbt('run', '-s', 'cfg_demo', key='cfg_' + k)

# ----------------------------------------------------------------------------- 4b. grants: dbt removes the ones it does not know
sc = Sc('grants_revoke')
GR = "{{ config(materialized='incremental', unique_key='customer_id', grants={'select': ['REPORTER', 'ANALYST']}) }}"
GR_BODY = BODY
sc.write(SCRATCH, GR + '\n\n' + GR_BODY)
OUT['files']['scenario/grants_revoke.sql'] = GR + '\n\n' + GR_BODY
CFG_COLS = [['CUSTOMER_ID', 'VARCHAR(16777216)'], ['FULL_NAME', 'VARCHAR(16777216)'], ['EMAIL', 'VARCHAR(16777216)'], ['TIER', 'VARCHAR(16777216)']]
sc.prime(schemas=[DEVS], relations=STG_OK + [(DEV, 'DEV_ALICE', 'CFG_DEMO', 'TABLE')], columns={DEVS + '.CFG_DEMO': CFG_COLS},
         grants={DEVS + '.CFG_DEMO': [['SELECT', 'ROLE', 'REPORTER'], ['SELECT', 'ROLE', 'OLD_ANALYST'], ['OWNERSHIP', 'ROLE', 'TRANSFORMER']]})
sc.dbt('run', '-s', 'cfg_demo', key='grants_revoke')

# ----------------------------------------------------------------------------- 4c. snapshots are transient by default; a setting makes them permanent
sc = Sc('snap_permanent')
SNAP_CFG = "snapshots:\n  brewline:\n    +transient: false\n"
sc.write('dbt_project.yml', sc.read('dbt_project.yml') + '\n' + SNAP_CFG)
OUT['files']['scenario/project_snapshots_permanent.yml'] = SNAP_CFG
sc.dbt('snapshot', key='snapshot_permanent')

# ----------------------------------------------------------------------------- 4d. a hook that grants usage on every schema a run touched
sc = Sc('hooks')
HOOK = "on-run-end:\n  - \"{% for s in schemas %}grant usage on schema {{ target.database }}.{{ s }} to role REPORTER{% if not loop.last %};{% endif %}{% endfor %}\"\n"
sc.write('dbt_project.yml', sc.read('dbt_project.yml') + '\n' + HOOK)
OUT['files']['scenario/project_on_run_end.yml'] = HOOK
sc.write(SCRATCH, CFGS['baseline'] + '\n\n' + BODY)
sc.prime(schemas=[DEVS], relations=STG_OK)
sc.dbt('run', '-s', 'cfg_demo', key='hook_grants')

# ----------------------------------------------------------------------------- 5. a snapshot, second run
sc = Sc('snap_second')
TMP_COLS = SNAP_COLS + [['DBT_CHANGE_TYPE', 'VARCHAR(6)'], ['DBT_UNIQUE_KEY', 'VARCHAR(16777216)']]   # what dbt would find in its staging table
sc.prime(schemas=[DEVS], relations=[(DEV, 'DEV_ALICE', 'SNAP_CUSTOMERS', 'TABLE')],
         columns={DEVS + '.SNAP_CUSTOMERS': SNAP_COLS, DEVS + '.SNAP_CUSTOMERS__DBT_TMP': TMP_COLS})
sc.dbt('snapshot', key='snapshot_second')

# ----------------------------------------------------------------------------- 6. tests, freshness, docs, empty
sc = Sc('checks')
sc.prime(schemas=[DEVS], relations=STG_OK)
sc.dbt('test', '-s', 'stg_brewline__orders,test_type:generic', key='tests_generic')
sc.dbt('source', 'freshness', '-s', 'source:brewline.orders', key='freshness')
sc.dbt('docs', 'generate', key='docs_generate')
sc.dbt('run', '-s', 'stg_brewline__orders', '--empty', key='empty_run')

# ----------------------------------------------------------------------------- 7. clone for CI
sc = Sc('clone')
sc.dbt('parse', target='prod')
(sc.dir / 'state').mkdir()
shutil.copy(sc.dir / 'target' / 'manifest.json', sc.dir / 'state' / 'manifest.json')
sc.prime(schemas=['BREWLINE.STAGING', 'BREWLINE.MARTS', 'BREWLINE.INTERMEDIATE'],
         relations=[('BREWLINE', 'MARTS', 'FCT_ORDERS', 'TABLE'), ('BREWLINE', 'MARTS', 'DIM_CUSTOMERS', 'TABLE'), ('BREWLINE', 'STAGING', 'STG_BREWLINE__ORDERS', 'VIEW')])
sc.dbt('clone', '--select', 'fct_orders', 'dim_customers', '--state', 'state', key='clone_to_ci', target='ci')

# ----------------------------------------------------------------------------- 7b. a CI run that reads its parents from production
sc = Sc('ci_defer')
sc.dbt('parse', target='prod')
(sc.dir / 'state').mkdir()
shutil.copy(sc.dir / 'target' / 'manifest.json', sc.dir / 'state' / 'manifest.json')
sc.prime(schemas=['BREWLINE_CI.PR_123'])
sc.dbt('run', '--select', 'dim_customers', '--defer', '--state', 'state', key='ci_defer', target='ci')

# ----------------------------------------------------------------------------- 7c. which commands need a connection
sc = Sc('parse_compile')
sc.dbt('parse', key='parse_only')
sc.dbt('compile', '-s', 'fct_orders', key='compile_one')

# ----------------------------------------------------------------------------- 7d. cleaning up a pull request schema, with a guard
sc = Sc('ci_cleanup')
DROP_MACRO = """{% macro drop_pr_schema() %}
    {% if target.name != 'ci' %}
        {{ exceptions.raise_compiler_error('drop_pr_schema runs only on the ci target, not on ' ~ target.name) }}
    {% endif %}
    {% do run_query('drop schema if exists ' ~ target.database ~ '.' ~ target.schema ~ ' cascade') %}
{% endmacro %}
"""
sc.write('macros/drop_pr_schema.sql', DROP_MACRO)
OUT['files']['scenario/drop_pr_schema.sql'] = DROP_MACRO
sc.prime(schemas=['BREWLINE_CI.PR_123'])
sc.dbt('run-operation', 'drop_pr_schema', key='ci_cleanup', target='ci')
code, text, _ = sc.dbt('run-operation', 'drop_pr_schema', key='ci_cleanup_guard', target='prod')
assert code != 0 and not OUT['stmts']['ci_cleanup_guard'], text
OUT['text']['ci_cleanup_guard'] = '\n'.join(ln for ln in text.splitlines() if 'drop_pr_schema runs only' in ln).strip()

# ----------------------------------------------------------------------------- 8. a Python (Snowpark) model
sc = Sc('python')
PYM = """import snowflake.snowpark.functions as F


def model(dbt, session):
    dbt.config(materialized="table")

    orders = dbt.ref("stg_brewline__orders")
    kept = orders.filter(F.col("ORDER_STATUS") != "CANCELLED")

    return kept.group_by("CUSTOMER_ID").agg(
        F.count("ORDER_ID").alias("ORDERS"),
        F.sum("ORDER_TOTAL_USD").alias("REVENUE_USD"),
    )
"""
sc.write('models/scratch/py_customer_revenue.py', PYM)
OUT['files']['scenario/py_customer_revenue.py'] = PYM
sc.prime(schemas=[DEVS], relations=STG_OK)
sc.dbt('run', '-s', 'py_customer_revenue', key='python_model')

# ----------------------------------------------------------------------------- write
OUT['meta']['note'] = 'Recorded by snowflake-dbt/verify/capture_sf.py against a stand-in connection. Nothing ran on Snowflake.'
js = 'window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(OUT, indent=1, ensure_ascii=False, sort_keys=True) + ';\n'
pathlib.Path(args.out).parent.mkdir(parents=True, exist_ok=True)
pathlib.Path(args.out).write_text(js)
if args.json:
    pathlib.Path(args.json).write_text(json.dumps(OUT, indent=1, ensure_ascii=False, sort_keys=True))
print('wrote', args.out, '%d KB' % (len(js) // 1024), '| scenarios', len(OUT['stmts']), '| statements', sum(len(v) for v in OUT['stmts'].values()))
if args.keep:
    print('scenario folders kept in', WORK)
else:
    shutil.rmtree(WORK, ignore_errors=True)
