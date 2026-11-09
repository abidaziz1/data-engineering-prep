#!/usr/bin/env python3
"""Run the Brewline dbt project for real and record what happened.

Writes dbt/js/real.js: the project files, the command logs, the compiled SQL, the result tables and the
selector results that the dbt tutorial shows. Nothing in that file is typed by hand, so a lesson cannot
drift away from what dbt really printed.

Usage:   python3 dbt/verify/capture.py [--dbt PATH] [--out dbt/js/real.js] [--keep]
Needs:   dbt-core, dbt-duckdb and duckdb (see dev/requirements.txt), git, and network access for `dbt deps`.
Scenario folders are created in a temporary directory and removed afterwards (--keep leaves them).
Clock times inside logs are shifted so that every log starts at 06:00:00. Durations are real.
"""
import argparse, datetime, decimal, json, os, pathlib, re, shutil, subprocess, sys, tempfile

HERE = pathlib.Path(__file__).resolve().parent
PROJECT = HERE / 'project'
IGNORE = shutil.ignore_patterns('target', 'logs', 'dbt_packages', '*.duckdb', '*.duckdb.wal', 'state', 'package-lock.yml', '__pycache__')

ap = argparse.ArgumentParser()
ap.add_argument('--dbt', default=shutil.which('dbt') or str(pathlib.Path(sys.executable).with_name('dbt')))
ap.add_argument('--out', default=str(HERE.parent / 'js' / 'real.js'))
ap.add_argument('--keep', action='store_true')
ap.add_argument('--json', help='also write the raw capture as plain JSON to this path')
args = ap.parse_args()

import duckdb  # noqa: E402

WORK = pathlib.Path(tempfile.mkdtemp(prefix='brewline-capture-'))
SHOWN_ROOT = '/workspace/brewline'
ANSI = re.compile(r'\x1b\[[0-9;]*[A-Za-z]')
STAMP = re.compile(r'^(\d\d):(\d\d):(\d\d)(?=\s)')
TMP = re.compile(r'__dbt_tmp_?\d{20,28}')
BASE_SECONDS = 6 * 3600

OUT = {'meta': {}, 'files': {}, 'cmds': {}, 'logs': {}, 'sql': {}, 'tables': {}, 'ls': {}, 'dag': {}, 'text': {}}


# ----------------------------------------------------------------------------- helpers
def clean(text, dirs):
    text = ANSI.sub('', text)
    for d in dirs:
        for form in {str(d), str(d.resolve())}:
            text = text.replace(form, SHOWN_ROOT)
    text = text.replace(str(WORK), '/tmp/work')
    text = re.sub(r'\S*/venv/bin/python3?', '/home/me/.venv/bin/python3', text)
    text = TMP.sub('__dbt_tmp20260318090000000000', text)
    lines, t0, out = text.rstrip().split('\n'), None, []
    for ln in lines:
        m = STAMP.match(ln)
        if m:
            s = int(m[1]) * 3600 + int(m[2]) * 60 + int(m[3])
            t0 = s if t0 is None else t0
            d = (s - t0) % 86400 + BASE_SECONDS
            ln = '%02d:%02d:%02d' % (d // 3600 % 24, d // 60 % 60, d % 60) + ln[8:]
        out.append(ln.rstrip())
    return '\n'.join(out)


def cell(v):
    if v is None:
        return 'NULL'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, datetime.datetime):
        return v.strftime('%Y-%m-%d %H:%M:%S')
    if isinstance(v, datetime.date):
        return v.isoformat()
    if isinstance(v, decimal.Decimal):
        return format(v, 'f')
    return str(v)


class Sc:
    """One scenario: a private copy of the project folder and its own DuckDB file."""

    def __init__(self, name, src=None, raw=True):
        self.name = name
        self.dir = WORK / name
        shutil.copytree(src or BASE, self.dir)
        if raw and not (self.dir / 'brewline.duckdb').exists():
            self.sh([sys.executable, str(HERE / 'setup_raw.py'), 'brewline.duckdb'])

    def clone(self, name):
        return Sc(name, src=self.dir, raw=False)

    def sh(self, cmd):
        return subprocess.run(cmd, cwd=self.dir, capture_output=True, text=True)

    def path(self, rel):
        return self.dir / rel

    def read(self, rel):
        return self.path(rel).read_text()

    def write(self, rel, text):
        p = self.path(rel)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text)

    def patch(self, rel, old, new):
        t = self.read(rel)
        assert old in t, 'patch target not found in %s: %r' % (rel, old)
        self.write(rel, t.replace(old, new, 1))

    def dbt(self, *a, key=None, target='prod', show=None):
        argv = [args.dbt, '--no-use-colors'] + list(a) + (['--target', target] if target else [])
        env = dict(os.environ, DBT_PROFILES_DIR=str(self.dir), DBT_SEND_ANONYMOUS_USAGE_STATS='False', NO_COLOR='1', DO_NOT_TRACK='1')
        p = subprocess.run(argv, cwd=self.dir, env=env, capture_output=True, text=True)
        text = clean(p.stdout + p.stderr, [self.dir])
        if key:
            OUT['logs'][key] = text
            OUT['cmds'][key] = show or ' '.join(['dbt'] + list(a) + (['--target', target] if target else []))
        return p.returncode, text

    def q(self, sql):
        con = duckdb.connect(str(self.dir / 'brewline.duckdb'), read_only=True)
        try:
            cur = con.execute(sql)
            cols = [d[0] for d in cur.description]
            rows = [[cell(v) for v in r] for r in cur.fetchall()]
        finally:
            con.close()
        return cols, rows

    def exec(self, sql):
        con = duckdb.connect(str(self.dir / 'brewline.duckdb'))
        try:
            con.execute(sql)
        finally:
            con.close()

    def table(self, key, sql):
        cols, rows = self.q(sql)
        OUT['tables'][key] = {'cols': cols, 'rows': rows}
        return rows

    def day2(self):
        self.sh([sys.executable, str(HERE / 'day2.py'), 'brewline.duckdb'])

    def sql_of(self, key, kind, rel):
        """kind is 'compiled' or 'run'; rel is the model path under the project, e.g. models/marts/core/fct_orders.sql"""
        p = self.dir / 'target' / kind / 'brewline' / rel
        if p.exists():
            OUT['sql'][key] = TMP.sub('__dbt_tmp20260318090000000000', p.read_text().strip('\n'))
        return OUT['sql'].get(key)


def ls(sc, sel, key):
    """dbt ls for a selector, models/seeds/snapshots/sources/exposures only. Stores short node names."""
    a = ['ls', '-s', sel, '--output', 'json', '--output-keys', 'name', 'resource_type']
    for r in ['model', 'seed', 'snapshot', 'source', 'exposure']:
        a += ['--resource-type', r]
    code, text = sc.dbt(*a, target='prod')
    names = []
    for ln in text.split('\n'):
        if ln.startswith('{'):
            o = json.loads(ln)
            names.append(('source:' if o['resource_type'] == 'source' else '') + o['name'])
    OUT['ls'][key] = names
    return names


# ----------------------------------------------------------------------------- base project
BASE = WORK / 'base'
shutil.copytree(PROJECT, BASE, ignore=IGNORE)
base_sc = Sc.__new__(Sc)
base_sc.name, base_sc.dir = 'base', BASE
code, text = base_sc.dbt('deps', key='deps', target=None)
assert code == 0, text

SKIP_DIRS = {'target', 'logs', 'dbt_packages', 'state', '__pycache__'}
for p in sorted(PROJECT.rglob('*')):
    rel = p.relative_to(PROJECT)
    if not p.is_file() or SKIP_DIRS & set(rel.parts) or p.name.endswith(('.duckdb', '.wal')) or p.name == 'package-lock.yml':
        continue
    OUT['files'][str(rel)] = p.read_text()
for name in ['raw/orders.csv', 'raw/order_items.csv', 'raw/customers.csv', 'raw/products.csv']:
    OUT['files']['verify/' + name] = (HERE / name).read_text()

# ----------------------------------------------------------------------------- main line: day 1
main = Sc('main')
code, text = main.dbt('--version', key='version', target=None, show='dbt --version')
OUT['meta']['dbt'] = re.search(r'installed:\s+([\d.]+)', text).group(1)
OUT['meta']['adapter'] = 'dbt-duckdb ' + re.search(r'duckdb:\s+([\d.]+)', text).group(1)
OUT['meta']['duckdb'] = duckdb.__version__

main.table('raw_orders', 'select order_id, customer_id, order_ts, status, total_usd, _loaded_at from raw.orders order by order_id, _loaded_at')
main.table('raw_order_items', 'select order_id, line_no, product_id, qty, unit_price from raw.order_items order by order_id, line_no')
main.table('raw_customers', 'select customer_id, full_name, email, country, tier from raw.customers order by customer_id')
main.table('raw_products', 'select product_id, name, category, price_usd from raw.products order by product_id')

main.dbt('debug', key='debug')
main.dbt('compile', key='compile_all')
for rel in ['staging/brewline/stg_brewline__orders', 'staging/brewline/stg_brewline__customers', 'intermediate/int_orders__with_items',
            'marts/core/dim_customers', 'marts/core/fct_orders', 'marts/finance/fct_daily_revenue', 'marts/core/dim_products_v2']:
    main.sql_of('compiled/day1/' + rel.split('/')[-1], 'compiled', 'models/%s.sql' % rel)
main.sql_of('compiled/day1/assert_order_total_matches_lines', 'compiled', 'tests/assert_order_total_matches_lines.sql')

SELECTORS = {
    'model': 'stg_brewline__orders', 'up': '+fct_orders', 'down': 'stg_brewline__orders+', 'both': '+fct_daily_revenue',
    'one_up': '1+fct_orders', 'plus_at': '@stg_brewline__customers', 'tag_pii': 'tag:pii', 'tag_daily': 'tag:daily',
    'path_staging': 'path:models/staging', 'path_core': 'models/marts/core', 'source_down': 'source:brewline+',
    'source_orders_down': 'source:brewline.orders+', 'seed': 'resource_type:seed', 'incremental': 'config.materialized:incremental',
    'table': 'config.materialized:table', 'union': 'fct_orders dim_customers', 'intersection': '+fct_orders,+dim_customers',
    'exposure_up': '+exposure:finance_dashboard', 'access_public': 'access:public', 'group_finance': 'group:finance',
    'down_two': 'stg_brewline__orders+2', 'all': 'fqn:*'
}
for k, sel in SELECTORS.items():
    ls(main, sel, k)
OUT['text']['selectors'] = json.dumps(SELECTORS)

# A fresh schema: the unit test on the incremental model cannot read its columns yet, so the first build fails.
fresh = Sc('fresh_build')
fresh.dbt('build', key='build_fresh_fail')
# The fix: create empty shells for fct_orders and everything it reads, then build for real.
main.dbt('run', '-s', '+fct_orders', '--empty', key='empty_shell')
code, text = main.dbt('build', key='build_day1')
assert code == 0, text
rr = json.loads(main.read('target/run_results.json'))
for r in rr['results']:
    if r['unique_id'] == 'model.brewline.fct_orders':
        keep = {k: r[k] for k in ['unique_id', 'status', 'execution_time', 'adapter_response', 'message', 'failures'] if k in r}
        keep['execution_time'] = round(keep['execution_time'], 2)
        OUT['text']['run_result_fct_orders'] = json.dumps(keep, indent=2)
OUT['text']['run_results_keys'] = json.dumps(sorted(rr.keys()))
man = json.loads(main.read('target/manifest.json'))
n = man['nodes']['model.brewline.fct_orders']
OUT['text']['manifest_fct_orders'] = json.dumps({
    'unique_id': n['unique_id'], 'resource_type': n['resource_type'], 'path': n['path'],
    'config': {k: n['config'][k] for k in ['materialized', 'unique_key', 'on_schema_change', 'tags']},
    'depends_on': n['depends_on'], 'checksum': {'name': n['checksum']['name'], 'checksum': n['checksum']['checksum'][:12] + '...'}
}, indent=2)
OUT['text']['manifest_keys'] = json.dumps(sorted(man.keys()))

# the DAG, straight from the manifest: models, seeds, snapshots, sources, exposures
nodes, edges = {}, []
def short(uid):
    t, parts = uid.split('.')[0], uid.split('.')
    return ('source:' + parts[-1]) if t == 'source' else parts[2]
for uid, nd in list(man['nodes'].items()) + list(man['sources'].items()) + list(man['exposures'].items()):
    if nd['resource_type'] in ('model', 'seed', 'snapshot', 'source', 'exposure'):
        nodes[uid] = {'name': short(uid), 'type': nd['resource_type'], 'materialized': nd.get('config', {}).get('materialized', '')}
for child, parents in man['parent_map'].items():
    if child in nodes:
        for par in parents:
            if par in nodes:
                edges.append([nodes[par]['name'], nodes[child]['name']])
uniq = {}
for nd in nodes.values():
    uniq[nd['name']] = nd
OUT['dag'] = {'nodes': sorted(uniq.values(), key=lambda x: (x['type'], x['name'])), 'edges': sorted(map(list, set(map(tuple, edges))))}

main.table('fanout_rows', "select o.order_id, o.order_total_usd, i.line_no, i.line_total_usd from analytics_staging.stg_brewline__orders o join analytics_staging.stg_brewline__order_items i on i.order_id = o.order_id where o.order_id = 'O-5001' order by i.line_no")
main.table('fanout_naive', "select cast(o.ordered_at as date) as order_date, sum(o.order_total_usd) as revenue_usd from analytics_staging.stg_brewline__orders o join analytics_staging.stg_brewline__order_items i on i.order_id = o.order_id where o.order_status <> 'CANCELLED' group by 1 order by 1")
main.table('fanout_right', "select cast(ordered_at as date) as order_date, sum(order_total_usd) as revenue_usd from analytics_staging.stg_brewline__orders where order_status <> 'CANCELLED' group by 1 order by 1")

def tree(root):
    out = [root.name + '/']
    def walk(d, pre):
        items = sorted([x for x in d.iterdir() if not (SKIP_DIRS & {x.name}) and not x.name.endswith(('.duckdb', '.wal')) and x.name not in ('package-lock.yml', '.user.yml')], key=lambda x: (x.is_file(), x.name))
        for i, x in enumerate(items):
            last = i == len(items) - 1
            out.append(pre + ('└── ' if last else '├── ') + x.name + ('/' if x.is_dir() else ''))
            if x.is_dir():
                walk(x, pre + ('    ' if last else '│   '))
    walk(root, '')
    return '\n'.join(out)
OUT['text']['tree'] = tree(PROJECT).replace(PROJECT.name + '/', 'brewline/', 1)

code, text = main.dbt('ls', '--resource-type', 'test', '-s', 'stg_brewline__orders', key='ls_tests_orders')
code, text = main.dbt('ls', '--resource-type', 'unit_test', key='ls_unit_tests')

main.dbt('show', '-s', 'fct_daily_revenue', key='show')
main.dbt('docs', 'generate', key='docs_generate')
main.dbt('test', '--select', 'test_type:unit', key='unit_pass')
main.dbt('source', 'freshness', key='freshness_stale', show='dbt source freshness')

for rel in ['staging/brewline/stg_brewline__orders', 'marts/core/fct_orders', 'marts/core/dim_customers', 'staging/brewline/stg_brewline__customers']:
    main.sql_of('run/day1/' + rel.split('/')[-1], 'run', 'models/%s.sql' % rel)

main.table('stg_orders', 'select * from analytics_staging.stg_brewline__orders order by order_id')
main.table('stg_order_items', 'select * from analytics_staging.stg_brewline__order_items order by order_id, line_no')
main.table('stg_customers', 'select * from analytics_staging.stg_brewline__customers order by customer_id')
main.table('stg_products', 'select * from analytics_staging.stg_brewline__products order by product_id')
main.table('int_orders', 'select * from analytics_intermediate.int_orders__with_items order by order_id')
main.table('dim_customers', 'select * from analytics_marts.dim_customers order by customer_id')
main.table('dim_products_v1', 'select * from analytics_marts.dim_products_v1 order by product_id')
main.table('dim_products_v2', 'select * from analytics_marts.dim_products_v2 order by product_id')
main.table('fct_orders_day1', 'select * from analytics_marts.fct_orders order by order_id')
main.table('fct_daily_revenue_day1', 'select * from analytics_marts.fct_daily_revenue order by order_date')
main.table('snap_day1', 'select customer_id, tier, country, dbt_valid_from, dbt_valid_to from analytics_snapshots.snap_customers order by customer_id, dbt_valid_from')
main.table('snap_columns', "select column_name from information_schema.columns where table_schema = 'analytics_snapshots' and table_name = 'snap_customers' order by ordinal_position")
main.table('schemas_default', "select schema_name from information_schema.schemata where schema_name like 'analytics%' order by 1")
main.table('country_names', 'select * from analytics_reference.country_names order by 1')
main.table('assert_rows', open(main.path('target/compiled/brewline/tests/assert_order_total_matches_lines.sql')).read())

after_day1 = main.clone('after_day1')

# ----------------------------------------------------------------------------- main line: day 2
main.day2()
code, text = main.dbt('build', key='build_day2')
assert code == 0, text
main.sql_of('run/day2/fct_orders', 'run', 'models/marts/core/fct_orders.sql')
main.sql_of('compiled/day2/fct_orders', 'compiled', 'models/marts/core/fct_orders.sql')
main.table('raw_customers_day2', 'select customer_id, full_name, country, tier, _loaded_at from raw.customers order by customer_id')
main.table('asof_orders', "select o.order_id, o.ordered_at, o.customer_id, s.tier, s.country from analytics_marts.fct_orders o join analytics_snapshots.snap_customers s on s.customer_id = o.customer_id and o.ordered_at >= s.dbt_valid_from and o.ordered_at < coalesce(s.dbt_valid_to, timestamp '9999-12-31') where o.customer_id in ('C-42', 'C-77') order by o.ordered_at")
main.table('asof_wrong', "select o.order_id, o.ordered_at, o.customer_id, c.tier, c.country from analytics_marts.fct_orders o join raw.customers c on c.customer_id = o.customer_id where o.customer_id in ('C-42', 'C-77') order by o.ordered_at")
main.table('fct_orders_day2', 'select * from analytics_marts.fct_orders order by order_id')
main.table('fct_daily_revenue_day2', 'select * from analytics_marts.fct_daily_revenue order by order_date')
main.table('snap_day2_full', 'select customer_id, full_name, country, tier, _loaded_at, dbt_updated_at, dbt_valid_from, dbt_valid_to from analytics_snapshots.snap_customers order by customer_id, dbt_valid_from')
main.table('snap_day2', 'select customer_id, tier, country, dbt_valid_from, dbt_valid_to from analytics_snapshots.snap_customers order by customer_id, dbt_valid_from')
main.table('snap_asof', "select customer_id, tier, country from analytics_snapshots.snap_customers where dbt_valid_from <= (select min(dbt_valid_to) from analytics_snapshots.snap_customers) and coalesce(dbt_valid_to, timestamp '2999-01-01') > (select min(dbt_valid_from) from analytics_snapshots.snap_customers) order by 1")
(main.path('state')).mkdir(exist_ok=True)
shutil.copy(main.path('target/manifest.json'), main.path('state/manifest.json'))
after_day2 = main.clone('after_day2')

code, text = main.dbt('run', '-s', 'fct_orders', '--full-refresh', key='full_refresh')
main.sql_of('run/full_refresh/fct_orders', 'run', 'models/marts/core/fct_orders.sql')

first = Sc('first_run')
first.dbt('run', '-s', '+fct_orders', key='first_run')
first.sql_of('run/first/fct_orders', 'run', 'models/marts/core/fct_orders.sql')
first.sql_of('run/first/stg_brewline__orders', 'run', 'models/staging/brewline/stg_brewline__orders.sql')
first.sql_of('run/first/int_orders__with_items', 'run', 'models/intermediate/int_orders__with_items.sql')
first.day2()
first.dbt('compile', '-s', 'fct_orders', key=None)
first.sql_of('compiled/second/fct_orders', 'compiled', 'models/marts/core/fct_orders.sql')

# ----------------------------------------------------------------------------- failures
sc = after_day2.clone('fail_accepted')
sc.exec("insert into raw.orders values ('O-5002','C-77','2026-03-14 09:15:00','REFUNDED',12.50,'2026-03-19 08:00:00')")
sc.dbt('test', '-s', 'stg_brewline__orders', key='test_fail')
p = next((sc.dir / 'target/compiled/brewline/models/staging/brewline').rglob('accepted_values_stg_brewline__*.sql'), None)
if p:
    OUT['sql']['compiled/test/accepted_values'] = p.read_text().strip('\n')
sc.dbt('test', '-s', 'stg_brewline__orders', '--store-failures', key='test_store_failures')
tabs = sc.table('store_failures_tables', "select table_schema, table_name from information_schema.tables where table_schema like '%audit%' order by 2")
tbl = next(r for r in tabs if r[1].startswith('accepted_values'))
sc.table('store_failures_rows', 'select * from "%s"."%s"' % (tbl[0], tbl[1]))

sc = after_day2.clone('fail_many')
sc.exec("insert into raw.orders values ('O-5002','C-77','2026-03-14 09:15:00','REFUNDED',12.50,'2026-03-19 08:00:00'), ('O-5090',NULL,'2026-03-19 09:00:00','PLACED',10.00,'2026-03-19 09:05:00'), ('O-5091','C-99','2026-03-19 09:10:00','PLACED',10.00,'2026-03-19 09:15:00'), ('O-5092','C-12','2026-03-19 09:20:00','PLACED',-5.00,'2026-03-19 09:25:00')")
sc.dbt('test', '-s', 'stg_brewline__orders', key='test_fail_many')

sc = Sc('snap_check')
sc.write('snapshots/snap_customers.yml', "snapshots:\n  - name: snap_customers\n    relation: source('brewline', 'customers')\n    config:\n      schema: snapshots\n      unique_key: customer_id\n      strategy: check\n      check_cols: [tier, country]\n")
OUT['files']['scenario/snap_customers_check.yml'] = sc.read('snapshots/snap_customers.yml')
sc.dbt('snapshot', key='snap_check_run1')
sc.day2()
sc.dbt('snapshot', key='snap_check_run2')
sc.table('snap_check_day2', 'select customer_id, tier, country, dbt_valid_from, dbt_valid_to from analytics_snapshots.snap_customers order by customer_id, dbt_valid_from')

sc = after_day2.clone('fail_unit')
sc.patch('models/staging/brewline/stg_brewline__orders.sql', 'order by _loaded_at desc', 'order by _loaded_at asc')
OUT['files']['scenario/stg_orders_unit_bug.sql'] = sc.read('models/staging/brewline/stg_brewline__orders.sql')
sc.dbt('test', '--select', 'test_type:unit', key='unit_fail')

sc = after_day2.clone('fail_contract')
sc.patch('models/marts/finance/fct_daily_revenue.sql', 'sum(order_total_usd) as revenue_usd', 'sum(order_total_usd) as revenue')
OUT['files']['scenario/fct_daily_revenue_contract_bug.sql'] = sc.read('models/marts/finance/fct_daily_revenue.sql')
sc.dbt('run', '-s', 'fct_daily_revenue', key='contract_fail')

sc = after_day2.clone('fail_access')
sc.write('models/intermediate/_intermediate__models.yml', 'models:\n  - name: int_orders__with_items\n    config:\n      group: core\n      access: private\n')
sc.write('models/marts/_groups.yml', sc.read('models/marts/_groups.yml') + '  - name: core\n    owner:\n      name: Data Platform\n      email: data-platform@brewline.example\n')
sc.patch('models/marts/_marts__models.yml', "    config:\n      tags: [daily]\n    columns:\n      - name: order_id", "    config:\n      tags: [daily]\n      group: core\n    columns:\n      - name: order_id")
sc.write('models/marts/finance/fct_finance_orders.sql', "{{ config(group='finance') }}\n\nselect order_id, order_total_usd\nfrom {{ ref('int_orders__with_items') }}\n")
OUT['files']['scenario/int_orders_private.yml'] = sc.read('models/intermediate/_intermediate__models.yml')
OUT['files']['scenario/fct_finance_orders.sql'] = sc.read('models/marts/finance/fct_finance_orders.sql')
sc.dbt('parse', key='access_fail')

sc = after_day2.clone('fail_dag')
sc.patch('models/marts/core/dim_customers.sql', 'n.country_name,', 'n.country_title,')
sc.dbt('build', key='build_fail')
sc.table('after_failure_tables', "select table_schema, table_name from information_schema.tables where table_schema like 'analytics_marts' order by 2")
sc.patch('models/marts/core/dim_customers.sql', 'n.country_title,', 'n.country_name,')
sc.dbt('retry', key='retry', show='dbt retry')

# ----------------------------------------------------------------------------- incremental: the classic bug, and the strategies
sc = after_day1.clone('inc_bug')
sc.patch('models/marts/core/fct_orders.sql', "where loaded_at > (select coalesce(max(loaded_at), timestamp '1900-01-01') from {{ this }})", "where ordered_at > (select coalesce(max(ordered_at), timestamp '1900-01-01') from {{ this }})")
OUT['files']['scenario/fct_orders_bug_ordered_at.sql'] = sc.read('models/marts/core/fct_orders.sql')
sc.day2()
sc.dbt('run', '-s', 'fct_orders', key='inc_bug_run')
sc.table('inc_bug_rows', "select order_id, order_status, order_total_usd, loaded_at from analytics_marts.fct_orders where order_id in ('O-5010', 'O-5011') order by 1")
sc.table('inc_bug_all', 'select order_id, order_status, order_total_usd, loaded_at from analytics_marts.fct_orders order by order_id')
sc.table('inc_bug_expected', "select order_id, order_status, order_total_usd, loaded_at from analytics_intermediate.int_orders__with_items where order_id in ('O-5010', 'O-5011') order by 1")

CFG_OLD = "unique_key='order_id',"
for strat in ['append', 'delete+insert', 'merge']:
    key = strat.replace('+', '_')
    sc = after_day1.clone('strat_' + key)
    sc.patch('models/marts/core/fct_orders.sql', CFG_OLD, "unique_key='order_id',\n        incremental_strategy='%s'," % strat)
    sc.day2()
    code, text = sc.dbt('run', '-s', 'fct_orders', key='strategy_' + key)
    sc.sql_of('run/strategy_' + key, 'run', 'models/marts/core/fct_orders.sql')
    sc.table('strategy_%s_counts' % key, 'select count(*) as rows_in_table, count(distinct order_id) as distinct_orders from analytics_marts.fct_orders')
    sc.table('strategy_%s_rows' % key, 'select order_id, order_status, order_total_usd, loaded_at from analytics_marts.fct_orders order by order_id, loaded_at')
    sc.dbt('test', '-s', 'fct_orders', key='strategy_%s_test' % key)

sc = after_day1.clone('strat_microbatch')
sc.write('models/marts/core/fct_orders.sql', """{{
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
OUT['files']['scenario/fct_orders_microbatch.sql'] = sc.read('models/marts/core/fct_orders.sql')
sc.day2()
code, text = sc.dbt('run', '-s', 'fct_orders', '--event-time-start', '2026-03-17', '--event-time-end', '2026-03-19', key='strategy_microbatch')
sc.sql_of('compiled/strategy_microbatch', 'compiled', 'models/marts/core/fct_orders/fct_orders_2026-03-17.sql')
sc.sql_of('run/strategy_microbatch', 'run', 'models/marts/core/fct_orders/fct_orders_2026-03-17.sql')
sc.table('strategy_microbatch_counts', 'select count(*) as rows_in_table, count(distinct order_id) as distinct_orders from analytics_marts.fct_orders')
sc.table('strategy_microbatch_rows', 'select order_id, order_status, order_total_usd, loaded_at from analytics_marts.fct_orders order by order_id, loaded_at')

# ----------------------------------------------------------------------------- slim CI: state, defer
sc = after_day2.clone('slim_ci')
sc.patch('models/staging/brewline/stg_brewline__customers.sql', 'full_name,', "full_name,\n    split_part(full_name, ' ', 1) as first_name,")
OUT['files']['scenario/stg_customers_change.sql'] = sc.read('models/staging/brewline/stg_brewline__customers.sql')
code, text = sc.dbt('ls', '-s', 'state:modified+', '--state', 'state', '--resource-type', 'model', key='slim_ls')
d1 = sc.clone('slim_nodefer')
d1.dbt('build', '-s', 'state:modified+', '--state', 'state', target='dev', key='slim_nodefer')
d2 = sc.clone('slim_defer')
d2.dbt('build', '-s', 'state:modified+', '--defer', '--state', 'state', target='dev', key='slim_defer')
d2.sql_of('compiled/slim/dim_customers_dev', 'compiled', 'models/marts/core/dim_customers.sql')
d2.table('slim_dev_schemas', "select schema_name from information_schema.schemata where schema_name like 'dev%' order by 1")
d2.table('slim_dev_tables', "select table_schema || '.' || table_name as relation from information_schema.tables where table_schema like 'dev%' order by 1")

# ----------------------------------------------------------------------------- environments: schema names
GSN = """{% macro generate_schema_name(custom_schema_name, node) -%}
    {%- set default_schema = target.schema -%}
    {%- if target.name == 'prod' and custom_schema_name is not none -%}
        {{ custom_schema_name | trim }}
    {%- else -%}
        {{ default_schema }}
    {%- endif -%}
{%- endmacro %}
"""
OUT['files']['scenario/generate_schema_name.sql'] = GSN
for tgt in ['dev', 'prod']:
    sc = after_day2.clone('schema_default_' + tgt)
    sc.dbt('run', '-s', 'stg_brewline__customers', target=tgt, key='schema_default_' + tgt)
    sc = after_day2.clone('schema_custom_' + tgt)
    sc.write('macros/generate_schema_name.sql', GSN)
    sc.dbt('run', '-s', 'stg_brewline__customers', target=tgt, key='schema_custom_' + tgt)

# ----------------------------------------------------------------------------- Jinja demos
sc = after_day2.clone('jinja')
SCRATCH = {
    'orders_by_status': """select
    customer_id,
    {% for s in ['PLACED', 'SHIPPED', 'CANCELLED'] %}
    count(*) filter (where order_status = '{{ s }}') as {{ s | lower }}_orders{{ ',' if not loop.last }}
    {% endfor %}
from {{ ref('stg_brewline__orders') }}
group by customer_id
""",
    'customers_sample': """select customer_id, full_name, tier
from {{ ref('stg_brewline__customers') }}
order by customer_id
{{ limit_in_dev(2) }}
""",
    'cents_demo': """select {{ cents_to_dollars('6700') }} as dollars
""",
    'min_total': """select order_id, order_total_usd
from {{ ref('stg_brewline__orders') }}
where order_total_usd >= {{ var('min_total', 0) }}
order by order_id
""",
    'status_list': """{% set statuses_query %}
    select distinct order_status from {{ ref('stg_brewline__orders') }} order by 1
{% endset %}

{% if execute %}
    {% set statuses = run_query(statuses_query).columns[0].values() %}
{% else %}
    {% set statuses = [] %}
{% endif %}

select
    count(*) as orders
    {% for s in statuses %}
    , count(*) filter (where order_status = '{{ s }}') as {{ s | lower }}
    {% endfor %}
from {{ ref('stg_brewline__orders') }}
"""
}
for k, v in SCRATCH.items():
    sc.write('models/scratch/%s.sql' % k, v)
    OUT['files']['scenario/%s.sql' % k] = v
sc.dbt('run', '-s', 'orders_by_status', 'min_total', 'status_list', 'cents_demo', key='jinja_run')
sc.sql_of('compiled/jinja/orders_by_status', 'compiled', 'models/scratch/orders_by_status.sql')
sc.sql_of('compiled/jinja/cents_demo', 'compiled', 'models/scratch/cents_demo.sql')
sc.sql_of('compiled/jinja/min_total', 'compiled', 'models/scratch/min_total.sql')
sc.sql_of('compiled/jinja/status_list', 'compiled', 'models/scratch/status_list.sql')
sc.table('jinja_orders_by_status', 'select * from analytics.orders_by_status order by customer_id')
sc.table('jinja_cents_demo', 'select * from analytics.cents_demo')
sc.table('jinja_status_list', 'select * from analytics.status_list')
sc.dbt('compile', '-s', 'customers_sample', target='dev', key='jinja_sample_dev')
sc.sql_of('compiled/jinja/customers_sample_dev', 'compiled', 'models/scratch/customers_sample.sql')
sc.dbt('compile', '-s', 'customers_sample', target='prod', key='jinja_sample_prod')
sc.sql_of('compiled/jinja/customers_sample_prod', 'compiled', 'models/scratch/customers_sample.sql')
sc.dbt('compile', '-s', 'min_total', '--vars', '{min_total: 25}', key='jinja_vars')
sc.sql_of('compiled/jinja/min_total_25', 'compiled', 'models/scratch/min_total.sql')
sc.dbt('parse', key='jinja_parse')
sc.dbt('show', '--inline', "select {{ cents_to_dollars('6700') }} as dollars", key='show_inline', show="dbt show --inline \"select {{ cents_to_dollars('6700') }} as dollars\"")

sc.dbt('compile', '--inline', "select * from {{ ref('stg_brewline__orders') }} limit 3", key='compile_inline', show="dbt compile --inline \"select * from {{ ref('stg_brewline__orders') }} limit 3\"")

sc = after_day2.clone('jinja_bug')
BAD = SCRATCH['status_list'].replace("{% if execute %}\n    {% set statuses = run_query(statuses_query).columns[0].values() %}\n{% else %}\n    {% set statuses = [] %}\n{% endif %}", "{% set statuses = run_query(statuses_query).columns[0].values() %}")
assert BAD != SCRATCH['status_list']
sc.write('models/scratch/status_list.sql', BAD)
OUT['files']['scenario/status_list_no_guard.sql'] = BAD
sc.dbt('parse', key='jinja_execute_bug')

sc = after_day2.clone('ephemeral')
sc.patch('dbt_project.yml', '''    intermediate:
      +materialized: view''', '''    intermediate:
      +materialized: ephemeral''')
sc.dbt('compile', '-s', 'fct_orders', key='ephemeral_compile')
sc.sql_of('compiled/ephemeral/fct_orders', 'compiled', 'models/marts/core/fct_orders.sql')

sc = main.clone('slowest')
sc.dbt('build', '-s', '+fct_daily_revenue', key='slowest_build')
code, text = sc.dbt('run-operation', 'nothing', key=None)
SLOW = '''import json
r = json.load(open("target/run_results.json"))["results"]
for x in sorted(r, key=lambda x: -x["execution_time"])[:3]:
    print(f"{x['execution_time']:6.2f}s  {x['unique_id']}")'''
res = sc.sh([sys.executable, '-c', SLOW])
OUT['text']['slowest_code'] = SLOW
OUT['text']['slowest_out'] = clean(res.stdout, [sc.dir])

# ----------------------------------------------------------------------------- mistakes that the tutorial asks you to spot
sc = after_day2.clone('cfg_typo')
sc.patch('dbt_project.yml', '  brewline:\n    staging:', '  brewlin:\n    staging:')
OUT['files']['scenario/dbt_project_typo.yml'] = sc.read('dbt_project.yml')
sc.dbt('parse', key='cfg_typo')

sc = after_day2.clone('hardcoded')
sc.patch('models/intermediate/int_orders__with_items.sql', "{{ ref('stg_brewline__order_items') }}", 'analytics_staging.stg_brewline__order_items')
OUT['files']['scenario/int_orders_hardcoded.sql'] = sc.read('models/intermediate/int_orders__with_items.sql')
ls(sc, '+fct_orders', 'hardcoded_up')

sc = after_day2.clone('raw_direct')
sc.patch('models/staging/brewline/stg_brewline__orders.sql', "{{ source('brewline', 'orders') }}", 'raw.orders')
OUT['files']['scenario/stg_orders_raw_direct.sql'] = sc.read('models/staging/brewline/stg_brewline__orders.sql')
ls(sc, 'source:brewline.orders+', 'raw_direct_down')

for mode in ['append_new_columns', 'fail', 'ignore']:
    sc = after_day2.clone('osc_' + mode)
    sc.patch('models/marts/core/fct_orders.sql', "on_schema_change='append_new_columns'", "on_schema_change='%s'" % mode)
    sc.patch('models/marts/core/fct_orders.sql', '    loaded_at\nfrom', "    loaded_at,\n    order_status = 'CANCELLED' as is_cancelled\nfrom")
    if mode == 'fail':
        OUT['files']['scenario/fct_orders_new_column.sql'] = sc.read('models/marts/core/fct_orders.sql')
    sc.exec("insert into raw.orders values ('O-5012','C-12','2026-03-19 10:00:00','PLACED',9.00,'2026-03-19 10:05:00')")
    sc.dbt('run', '-s', 'fct_orders', key='osc_' + mode)
    sc.table('osc_%s_cols' % mode, "select column_name from information_schema.columns where table_schema = 'analytics_marts' and table_name = 'fct_orders' order by ordinal_position")
    if mode == 'append_new_columns':
        sc.table('osc_rows', 'select order_id, order_status, is_cancelled from analytics_marts.fct_orders where order_id in (\'O-5001\', \'O-5005\', \'O-5012\') order by 1')

sc = after_day2.clone('run_op')
PRINT = """{% macro print_counts(models) %}
    {% for m in models %}
        {% set r = run_query('select count(*) from ' ~ ref(m)) %}
        {{ log(m ~ ': ' ~ r.columns[0].values()[0] ~ ' rows', info=True) }}
    {% endfor %}
{% endmacro %}
"""
sc.write('macros/print_counts.sql', PRINT)
OUT['files']['scenario/print_counts.sql'] = PRINT
sc.dbt('run-operation', 'print_counts', '--args', '{models: [fct_orders, dim_customers]}', key='run_operation', show='dbt run-operation print_counts --args \'{models: [fct_orders, dim_customers]}\'')

# ----------------------------------------------------------------------------- coding problems: every solution is run by dbt
CH = {
    'm2_customers': """select
    c.customer_id,
    c.full_name,
    count(o.order_id) as orders_count,
    min(o.ordered_at) as first_order_at
from {{ ref('stg_brewline__customers') }} as c
left join {{ ref('stg_brewline__orders') }} as o
    on o.customer_id = c.customer_id
group by c.customer_id, c.full_name
order by c.customer_id
""",
    'm3_latest': """with ranked as (

    select
        *,
        row_number() over (partition by order_id order by _loaded_at desc) as rn
    from {{ source('brewline', 'orders') }}

)

select order_id, status, total_usd, _loaded_at
from ranked
where rn = 1
order by order_id
""",
    'm4_category': """select
    cast(o.ordered_at as date) as order_date,
    p.category,
    sum(i.line_total_usd) as revenue_usd
from {{ ref('stg_brewline__order_items') }} as i
join {{ ref('stg_brewline__orders') }} as o on o.order_id = i.order_id
join {{ ref('stg_brewline__products') }} as p on p.product_id = i.product_id
where o.order_status <> 'CANCELLED'
group by 1, 2
order by 1, 2
""",
    'm8_asof': """select
    o.order_id,
    o.ordered_at,
    o.customer_id,
    s.tier,
    s.country
from {{ ref('fct_orders') }} as o
join {{ ref('snap_customers') }} as s
    on s.customer_id = o.customer_id
   and o.ordered_at >= s.dbt_valid_from
   and o.ordered_at < coalesce(s.dbt_valid_to, timestamp '9999-12-31')
where o.customer_id in ('C-42', 'C-77')
order by o.ordered_at
"""
}
sc = after_day2.clone('challenges')
for k, v in CH.items():
    sc.write('models/scratch/ch_%s.sql' % k, v)
    OUT['files']['scenario/ch_%s.sql' % k] = v
UT = """unit_tests:
  - name: test_stg_customers_cleans_email_and_country
    model: stg_brewline__customers
    given:
      - input: source('brewline', 'customers')
        rows:
          - {customer_id: C-1, full_name: Ada Test, email: Ada.Test@Mail.Test, country: us, tier: gold, _loaded_at: '2026-01-01 00:00:00'}
    expect:
      rows:
        - {customer_id: C-1, full_name: Ada Test, email: ada.test@mail.test, country_code: US, tier: gold}
"""
sc.write('models/staging/brewline/_scratch_unit_tests.yml', UT)
OUT['files']['scenario/ch_m6_unit_test.yml'] = UT
sc.dbt('run', '-s', 'path:models/scratch', key='challenges_run')
for k in CH:
    sc.table('ch_' + k, 'select * from analytics.ch_%s order by 1, 2' % k)
sc.dbt('test', '-s', 'test_name:test_stg_customers_cleans_email_and_country', key='unit_challenge')

# ----------------------------------------------------------------------------- versions that passed their deprecation date, hooks, a Python model
sc = after_day2.clone('deprecated')
sc.patch('models/marts/_marts__models.yml', 'deprecation_date: 2027-01-31', 'deprecation_date: 2026-01-31')
sc.write('models/scratch/uses_v1.sql', "select product_id, list_price_usd\nfrom {{ ref('dim_products', v=1) }}\n")
OUT['files']['scenario/uses_v1.sql'] = sc.read('models/scratch/uses_v1.sql')
sc.dbt('run', '-s', 'uses_v1', key='deprecated_v1')

sc = after_day2.clone('hooks')
HOOK = "on-run-end:\n  - \"{{ log('Run finished with ' ~ results | length ~ ' results', info=True) }}\"\n"
sc.write('dbt_project.yml', sc.read('dbt_project.yml') + '\n' + HOOK)
OUT['files']['scenario/on_run_end.yml'] = HOOK
sc.dbt('run', '-s', 'stg_brewline__customers', key='hook_run')

sc = after_day2.clone('python_model')
PY = """def model(dbt, session):
    dbt.config(materialized="table")

    orders = dbt.ref("stg_brewline__orders").df()
    kept = orders[orders["order_status"] != "CANCELLED"]

    return kept.groupby("customer_id", as_index=False).agg(
        orders=("order_id", "count"),
        revenue_usd=("order_total_usd", "sum"),
    )
"""
sc.write('models/scratch/py_customer_revenue.py', PY)
OUT['files']['scenario/py_customer_revenue.py'] = PY
sc.dbt('run', '-s', 'py_customer_revenue', key='python_model')
sc.table('python_model_rows', 'select * from analytics.py_customer_revenue order by customer_id')

# ----------------------------------------------------------------------------- more lessons: severity, wrong values, lookback, hard deletes, versions, nothing to do, dropping a schema
sc = after_day2.clone('sev')
sc.exec("insert into raw.orders values ('O-5092','C-12','2026-03-19 09:20:00','PLACED',-5.00,'2026-03-19 09:25:00')")
SEV = """      - name: order_total_usd
        description: Order total in US dollars, as charged.
        data_tests:
          - positive_value:
              config:
                warn_if: ">0"
                error_if: ">5"
"""
sc.patch('models/staging/brewline/_brewline__models.yml', """      - name: order_total_usd
        description: Order total in US dollars, as charged.
        data_tests:
          - positive_value
""", SEV)
OUT['files']['scenario/severity.yml'] = SEV
sc.dbt('test', '-s', 'stg_brewline__orders,test_name:positive_value', key='severity')

sc = after_day2.clone('bad_values')
BAD = """      - name: order_status
        description: '{{ doc("order_status") }}'
        data_tests:
          - accepted_values:
              arguments:
                values: ['placed', 'shipped', 'cancelled']
"""
sc.patch('models/staging/brewline/_brewline__models.yml', """      - name: order_status
        description: '{{ doc("order_status") }}'
        data_tests:
          - accepted_values:
              arguments:
                values: ['PLACED', 'SHIPPED', 'CANCELLED']
""", BAD)
OUT['files']['scenario/accepted_values_lowercase.yml'] = BAD
sc.dbt('test', '-s', 'stg_brewline__orders,test_name:accepted_values', key='bad_values')

sc = after_day1.clone('lookback')
sc.patch('models/marts/core/fct_orders.sql', "where loaded_at > (select coalesce(max(loaded_at), timestamp '1900-01-01') from {{ this }})", "where loaded_at > (select coalesce(max(loaded_at), timestamp '1900-01-01') - interval 1 day from {{ this }})")
OUT['files']['scenario/fct_orders_lookback.sql'] = sc.read('models/marts/core/fct_orders.sql')
sc.day2()
sc.dbt('run', '-s', 'fct_orders', key='lookback_run')
sc.sql_of('compiled/lookback/fct_orders', 'compiled', 'models/marts/core/fct_orders.sql')
sc.table('lookback_counts', 'select count(*) as rows_in_table, count(distinct order_id) as distinct_orders from analytics_marts.fct_orders')

sc = after_day2.clone('snap_delete')
sc.write('snapshots/snap_customers.yml', sc.read('snapshots/snap_customers.yml') + "      hard_deletes: invalidate\n")
OUT['files']['scenario/snap_customers_hard_deletes.yml'] = sc.read('snapshots/snap_customers.yml')
sc.exec("delete from raw.customers where customer_id = 'C-91'")
sc.dbt('snapshot', key='snap_delete_run')
sc.table('snap_delete_rows', "select customer_id, tier, country, dbt_valid_from, dbt_valid_to from analytics_snapshots.snap_customers where customer_id in ('C-91', 'C-12') order by customer_id, dbt_valid_from")

code, text = after_day2.dbt('ls', '-s', 'dim_products', '--resource-type', 'model', '--output', 'json', '--output-keys', 'name', 'version', 'latest_version', 'access', 'group', key='versions_ls')

sc = after_day2.clone('slim_none')
sc.dbt('build', '-s', 'state:modified+', '--defer', '--state', 'state', target='dev', key='slim_none')

DROP = """{% macro drop_schema(name) %}
    {% do run_query('drop schema if exists ' ~ adapter.quote(name) ~ ' cascade') %}
    {{ log('dropped schema ' ~ name, info=True) }}
{% endmacro %}
"""
d2.write('macros/drop_schema.sql', DROP)
OUT['files']['scenario/drop_schema.sql'] = DROP
d2.dbt('run-operation', 'drop_schema', '--args', '{name: dev_alice_staging}', target='dev', key='drop_schema', show='dbt run-operation drop_schema --args \'{name: dev_alice_staging}\' --target dev')
d2.table('drop_schema_after', "select schema_name from information_schema.schemata where schema_name like 'dev%' order by 1")

# ----------------------------------------------------------------------------- a snapshot that watches a volatile column
sc = Sc('snap_all')
sc.write('snapshots/snap_customers.yml', "snapshots:\n  - name: snap_customers\n    relation: source('brewline', 'customers')\n    config:\n      schema: snapshots\n      unique_key: customer_id\n      strategy: check\n      check_cols: all\n")
OUT['files']['scenario/snap_customers_check_all.yml'] = sc.read('snapshots/snap_customers.yml')
sc.dbt('snapshot', key='snap_all_run1')
sc.exec("update raw.customers set _loaded_at = _loaded_at + interval 1 day")
sc.dbt('snapshot', key='snap_all_run2')
sc.table('snap_all_counts', 'select count(*) as rows_in_snapshot, count(distinct customer_id) as customers from analytics_snapshots.snap_customers')
sc.table('snap_all_rows', "select customer_id, tier, country, _loaded_at, dbt_valid_from, dbt_valid_to from analytics_snapshots.snap_customers where customer_id = 'C-12' order by dbt_valid_from")

# ----------------------------------------------------------------------------- the loader renamed a column
sc = after_day2.clone('source_rename')
sc.exec("alter table raw.orders rename column total_usd to total_amount_usd")
sc.dbt('build', key='source_rename')

# ----------------------------------------------------------------------------- --empty
sc = after_day2.clone('empty')
sc.dbt('run', '-s', 'stg_brewline__orders', '--empty', key='empty_run', target='dev')
sc.sql_of('run/empty/stg_brewline__orders', 'run', 'models/staging/brewline/stg_brewline__orders.sql')

# ----------------------------------------------------------------------------- freshness that warns
sc = after_day2.clone('freshness')
sc.exec("update raw.orders set _loaded_at = cast(now() as timestamp) - interval 14 hour where order_id = 'O-5011'")
sc.dbt('source', 'freshness', '-s', 'source:brewline.orders', key='freshness_warn', show='dbt source freshness --select source:brewline.orders')
sc.exec("update raw.orders set _loaded_at = cast(now() as timestamp) - interval 30 hour where order_id = 'O-5011'")
sc.dbt('source', 'freshness', '-s', 'source:brewline.orders', key='freshness_error', show='dbt source freshness --select source:brewline.orders')

# ----------------------------------------------------------------------------- write
OUT['meta']['note'] = 'Recorded by dbt/verify/capture.py. Log clock times start at 06:00:00; durations are real.'
js = 'window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(OUT, indent=1, ensure_ascii=False, sort_keys=True) + ';\n'
pathlib.Path(args.out).parent.mkdir(parents=True, exist_ok=True)
pathlib.Path(args.out).write_text(js)
if args.json:
    pathlib.Path(args.json).write_text(json.dumps(OUT, indent=1, ensure_ascii=False, sort_keys=True))
print('wrote', args.out, '%d KB' % (len(js) // 1024), '| logs', len(OUT['logs']), '| sql', len(OUT['sql']), '| tables', len(OUT['tables']), '| selectors', len(OUT['ls']))
if args.keep:
    print('scenario folders kept in', WORK)
else:
    shutil.rmtree(WORK, ignore_errors=True)
