#!/usr/bin/env python3
"""Record what real Apache Spark and Delta Lake do, for the Databricks tutorial.

Databricks Runtime is built on Apache Spark and Delta Lake. This script runs the open-source versions of both on this
machine, on the Brewline data, and writes everything a lesson shows into databricks/js/real.js: result tables, query
plans, Delta transaction log entries, DESCRIBE HISTORY rows, error messages and file counts.

It records the open-source engines. It does not record Databricks itself: Unity Catalog, Auto Loader, declarative
pipelines, Workflows, Photon, serverless compute and the Azure integration are not here. The lessons say which is which.

Usage:   python3 databricks/verify/capture_db.py [--out databricks/js/real.js] [--only spark,delta,conflict,layout,stream,pipeline,test] [--json FILE]
Needs:   pip install pyspark==4.2.0 delta-spark==4.4.1 pandas pyarrow pytest   and Java 17 or 21.
         The first run downloads the Delta jar from Maven Central.
"""
import argparse, datetime, decimal, glob, json, os, pathlib, re, shutil, subprocess, sys, tempfile, textwrap

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
RAW = ROOT / 'dbt' / 'verify' / 'raw'          # the Brewline raw files used by the other tutorials

ap = argparse.ArgumentParser()
ap.add_argument('--out', default=str(HERE.parent / 'js' / 'real.js'))
ap.add_argument('--only', default='spark,delta,conflict,layout,stream,pipeline,test')
ap.add_argument('--json')
args = ap.parse_args()
ONLY = set(args.only.split(','))

from pyspark.sql import SparkSession, functions as F, types as T
from delta import configure_spark_with_delta_pip
import importlib.metadata as md

WORK = pathlib.Path(tempfile.mkdtemp(prefix='db-capture-'))
OUT = {'meta': {}, 'files': {}, 'text': {}, 'tables': {}, 'logs': {}, 'history': {}, 'counts': {}, 'listing': {}}

builder = (SparkSession.builder.master('local[4]').appName('brewline')
           .config('spark.sql.extensions', 'io.delta.sql.DeltaSparkSessionExtension')
           .config('spark.sql.catalog.spark_catalog', 'org.apache.spark.sql.delta.catalog.DeltaCatalog')
           .config('spark.ui.enabled', 'false').config('spark.ui.showConsoleProgress', 'false')
           .config('spark.sql.warehouse.dir', str(WORK / 'warehouse')).config('spark.driver.memory', '3g')
           .config('spark.sql.session.timeZone', 'UTC').config('spark.sql.shuffle.partitions', '8')
           .config('spark.sql.adaptive.enabled', 'false'))
spark = configure_spark_with_delta_pip(builder).getOrCreate()
spark.sparkContext.setLogLevel('OFF')
sql = spark.sql

OUT['meta'].update({'spark': spark.version, 'delta': md.version('delta-spark'), 'python': sys.version.split()[0],
                    'java': re.search(r'version "([^"]+)"', subprocess.run(['java', '-version'], capture_output=True, text=True).stderr).group(1),
                    'pyspark': md.version('pyspark'),
                    'note': 'Recorded by databricks/verify/capture_db.py from open-source Apache Spark and Delta Lake on one machine. Nothing ran on Databricks.'})


# ----------------------------------------------------------------------------- helpers
def cell(v):
    if v is None:
        return 'NULL'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, (datetime.datetime, datetime.date)):
        return str(v)
    if isinstance(v, decimal.Decimal):
        return str(v)
    if isinstance(v, float):
        return repr(round(v, 4))
    if isinstance(v, (list, tuple)):
        return '[' + ', '.join(cell(x) for x in v) + ']'
    if isinstance(v, dict):
        return '{' + ', '.join('%s: %s' % (k, cell(x)) for k, x in v.items()) + '}'
    if hasattr(v, 'asDict'):
        return cell(v.asDict(recursive=True))
    return str(v)


def table(key, df, order=None):
    d = df.orderBy(*order) if order else df
    OUT['tables'][key] = {'cols': d.columns, 'rows': [[cell(v) for v in r] for r in d.collect()]}
    return OUT['tables'][key]


def text(key, s):
    OUT['text'][key] = s.strip('\n') if isinstance(s, str) else s


def plan_text(df, mode='simple'):
    """The physical plan as printed by explain(), without the volatile parts (ids, local paths)."""
    import io, contextlib
    buf = io.StringIO()
    jdf = df._jdf
    s = jdf.queryExecution().explainString(spark._jvm.org.apache.spark.sql.execution.ExplainMode.fromString(mode))
    return norm_plan(s)


def norm_plan(s):
    s = re.sub(r'#\d+L?', '#N', s)                                   # expression ids
    s = re.sub(r'file:/[^\s,\]\)]*/(wh|warehouse|data|tables)/', 'file:/.../', s)
    s = re.sub(r'file:/[^\s,\]\)]+', 'file:/...', s)
    s = re.sub(r'plan_id=\d+', 'plan_id=N', s)
    s = re.sub(r'\[plan_id=N\]', '', s)
    s = re.sub(r'\bid=\d+\b', 'id=N', s)
    return s.strip()


def clean_msg(msg):
    msg = re.sub(r'\n\s+at [^\n]+', '', msg)
    msg = re.sub(r'file:/[^\s,\]\)\']+', 'file:/...', msg)
    msg = re.sub(r'#\d+L?', '', msg)
    msg = re.sub(r'Table ID: [0-9a-f-]{36}', 'Table ID: <table id>', msg)
    msg = re.sub(r'o\d+\.sql', 'sql', msg)
    return msg.strip()


def java_cause(e):
    """The most specific Delta or Spark exception inside a Py4J error."""
    je = getattr(e, 'java_exception', None)
    best = None
    while je is not None:
        name = je.getClass().getName()
        if 'delta' in name.lower():
            return je
        best = best or je
        je = je.getCause()
    return best


def exc(fn):
    """The error a call raises, as (class, message) with the volatile parts removed."""
    try:
        fn()
    except Exception as e:                                           # noqa: BLE001
        je = java_cause(e)
        if je is not None:
            return je.getClass().getSimpleName(), clean_msg(je.getMessage() or '')
        return type(e).__name__, clean_msg(str(e))
    return None, None


TS0 = datetime.datetime(2026, 3, 14, 9, 0, 0, tzinfo=datetime.timezone.utc)


class Norm:
    """Make a Delta log comparable and readable: file names become part-0001, part-0002, in order of first use, so that
    the same file has the same name in every commit. Clock values become a fixed start time plus one minute per commit."""
    def __init__(self):
        self.files = {}

    def path(self, p):
        base = os.path.basename(p)
        if base not in self.files:
            self.files[base] = 'part-%04d.snappy.parquet' % (len(self.files) + 1)
        return self.files[base]

    def ms(self, version, bump=0):
        return int((TS0 + datetime.timedelta(minutes=version, seconds=bump)).timestamp() * 1000)


DROP_METRICS = re.compile(r'TimeMs$|^executionTime|Duration')


NORMS = {}


def norm_for(path):
    return NORMS.setdefault(str(path), Norm())


def listing(path):
    """The parquet files in a table folder with normalized names, and what the log folder holds."""
    n = norm_for(path)
    log = sorted(f for f in os.listdir(os.path.join(path, '_delta_log')) if not f.startswith('.'))
    return {'files': sorted(n.path(f) for f in os.listdir(path) if f.endswith('.parquet')), 'log': log}


def read_log(path, key=None, include_checkpoint=False):
    """All commits of a Delta table as [{version, actions:[{kind, ...}]}], normalized."""
    n = norm_for(path)
    commits = []
    for f in sorted(glob.glob(os.path.join(path, '_delta_log', '*.json'))):
        v = int(os.path.basename(f).split('.')[0])
        acts = []
        for ln in pathlib.Path(f).read_text().splitlines():
            if not ln.strip():
                continue
            raw = json.loads(ln)
            (kind, body), = raw.items()
            if kind in ('add', 'remove'):
                body['path'] = n.path(body['path'])
                if 'modificationTime' in body:
                    body['modificationTime'] = n.ms(v)
                if 'deletionTimestamp' in body:
                    body['deletionTimestamp'] = n.ms(v)
                if body.get('deletionVector'):
                    dv = body['deletionVector']
                    dv.pop('pathOrInlineDv', None)
                    dv['pathOrInlineDv'] = '<encoded>'
                body.pop('tags', None) if not body.get('tags') else None
            if kind == 'metaData':
                body['id'] = '<table id>'
                body['createdTime'] = n.ms(v)
            if kind == 'commitInfo':
                body['timestamp'] = n.ms(v)
                body.pop('txnId', None)
                body.pop('userName', None)
                body.pop('notebook', None)
                if 'operationMetrics' in body:
                    body['operationMetrics'] = {k: x for k, x in body['operationMetrics'].items() if not DROP_METRICS.search(k)}
                body = {k: body[k] for k in sorted(body)}
            if kind == 'domainMetadata':
                pass
            acts.append({'kind': kind, 'body': body})
        commits.append({'version': v, 'actions': acts})
    if key:
        OUT['logs'][key] = commits
    return commits


def history(name_or_path, key, path=True):
    q = 'describe history delta.`%s`' % name_or_path if path else 'describe history %s' % name_or_path
    rows = []
    for r in sql(q).orderBy('version').collect():
        m = {k: v for k, v in (r['operationMetrics'] or {}).items() if not DROP_METRICS.search(k)}
        rows.append({'version': r['version'], 'operation': r['operation'], 'operationParameters': {k: re.sub(r'#\d+L?', '', v) if isinstance(v, str) else v for k, v in (r['operationParameters'] or {}).items()},
                     'operationMetrics': dict(sorted(m.items())), 'isBlindAppend': r['isBlindAppend']})
    OUT['history'][key] = rows
    return rows


def detail(name_or_path, key, path=True):
    q = 'describe detail delta.`%s`' % name_or_path if path else 'describe detail %s' % name_or_path
    r = sql(q).collect()[0].asDict(recursive=True)
    d = {k: r[k] for k in ('format', 'partitionColumns', 'clusteringColumns', 'numFiles', 'sizeInBytes', 'properties', 'minReaderVersion', 'minWriterVersion', 'tableFeatures') if k in r}
    OUT['counts'][key] = d
    return d


def files_of(path):
    return sorted(os.path.basename(f) for f in glob.glob(os.path.join(path, '*.parquet')))


def reset_conf():
    for k, v in {'spark.sql.adaptive.enabled': 'false', 'spark.sql.autoBroadcastJoinThreshold': '10485760', 'spark.sql.shuffle.partitions': '8',
                 'spark.sql.adaptive.skewJoin.enabled': 'true', 'spark.sql.adaptive.coalescePartitions.enabled': 'true'}.items():
        spark.conf.set(k, v)


def read_csv(name, schema_ddl):
    return spark.read.option('header', True).schema(schema_ddl).csv(str(RAW / (name + '.csv')))


ORDERS_DDL = 'order_id string, customer_id string, order_ts timestamp, status string, total_usd decimal(12,2), _loaded_at timestamp'
ITEMS_DDL = 'order_id string, line_no int, product_id string, qty int, unit_price decimal(12,2), _loaded_at timestamp'
CUST_DDL = 'customer_id string, full_name string, email string, country string, tier string, _loaded_at timestamp'
PROD_DDL = 'product_id string, name string, category string, price_usd decimal(12,2), _loaded_at timestamp'


# ============================================================================= 1. SPARK CORE
if 'spark' in ONLY:
    reset_conf()
    sc = spark.sparkContext
    orders = read_csv('orders', ORDERS_DDL)
    products = read_csv('products', PROD_DDL)
    text('spark.schema_orders', orders._jdf.schema().treeString())
    table('spark.orders_head', orders.select('order_id', 'customer_id', 'status', 'total_usd', '_loaded_at'), order=['order_id', '_loaded_at'])

    # lazy evaluation: transformations start no job, an action starts one
    sc.setJobGroup('lazy', 'lazy demo')
    jobs = lambda: len(sc.statusTracker().getJobIdsForGroup('lazy'))
    j0 = jobs()
    q = orders.filter("status <> 'CANCELLED'").groupBy('customer_id').agg(F.sum('total_usd').alias('revenue'))
    j1 = jobs()
    q.collect()
    j2 = jobs()
    OUT['counts']['spark.lazy'] = {'jobs_before': j0, 'jobs_after_transformations': j1, 'jobs_after_action': j2}
    sc.setJobGroup('', '')

    # narrow and wide transformations
    narrow = orders.filter("status = 'SHIPPED'").select('order_id', 'total_usd')
    text('plan.narrow', plan_text(narrow))
    wide = orders.groupBy('status').agg(F.count('*').alias('orders'), F.sum('total_usd').alias('revenue'))
    text('plan.groupby', plan_text(wide))
    text('plan.groupby_formatted', plan_text(wide, 'formatted'))
    table('spark.status_counts', wide, order=['status'])

    # partitions
    base = spark.range(0, 100000, 1, 8)
    OUT['counts']['spark.partitions'] = {
        'range_8': base.rdd.getNumPartitions(), 'repartition_3': base.repartition(3).rdd.getNumPartitions(),
        'coalesce_2': base.coalesce(2).rdd.getNumPartitions(),
        'after_groupby_shuffle_partitions_8': base.groupBy((F.col('id') % 10).alias('k')).count().rdd.getNumPartitions(),
        'csv_files_read': orders.rdd.getNumPartitions()}
    spark.conf.set('spark.sql.shuffle.partitions', '200')
    OUT['counts']['spark.partitions']['after_groupby_shuffle_partitions_200'] = base.groupBy((F.col('id') % 10).alias('k')).count().rdd.getNumPartitions()
    reset_conf()

    # bigger synthetic Brewline data for joins and skew
    pids = [r[0] for r in products.select('product_id').orderBy('product_id').collect()]
    arr = F.array(*[F.lit(p) for p in pids])
    N = 200000
    orders_big = spark.range(0, N).select(F.concat(F.lit('O-'), F.col('id').cast('string')).alias('order_id'),
                                          F.concat(F.lit('C-'), (F.col('id') % 5000).cast('string')).alias('customer_id'),
                                          F.element_at(arr, (F.col('id') % len(pids)).cast('int') + 1).alias('product_id'),
                                          ((F.col('id') % 97) + 1).alias('qty'))
    items_big = spark.range(0, N * 3).select(F.concat(F.lit('O-'), (F.col('id') % N).cast('string')).alias('order_id'),
                                             (F.col('id') / N).cast('int').alias('line_no'), (F.col('id') % 7).alias('unit_price'))
    mk_small = lambda: orders_big.join(products.select('product_id', 'name'), 'product_id')     # a new DataFrame each time: a plan is fixed when it is first made
    text('plan.join_default', plan_text(mk_small()))
    spark.conf.set('spark.sql.autoBroadcastJoinThreshold', '-1')
    text('plan.join_no_broadcast', plan_text(mk_small()))
    text('plan.join_two_big_no_broadcast', plan_text(orders_big.join(items_big, 'order_id')))
    reset_conf()
    text('plan.join_hint_shuffle_hash', plan_text(orders_big.join(products.select('product_id', 'name').hint('shuffle_hash'), 'product_id')))
    text('plan.join_hint_merge', plan_text(orders_big.join(products.select('product_id', 'name').hint('merge'), 'product_id')))
    spark.conf.set('spark.sql.autoBroadcastJoinThreshold', '-1')
    text('plan.join_hint_broadcast', plan_text(orders_big.join(products.select('product_id', 'name').hint('broadcast'), 'product_id')))
    reset_conf()

    # adaptive query execution: shuffle partitions are merged after the shuffle, once the real sizes are known
    spark.conf.set('spark.sql.adaptive.enabled', 'true')
    g = orders_big.groupBy('customer_id').agg(F.sum('qty').alias('units'))
    text('plan.aqe_before', plan_text(g))
    g.collect()
    text('plan.aqe_after', plan_text(g))
    OUT['counts']['spark.aqe'] = {'shuffle_partitions_configured': 8}
    reset_conf()

    # skew
    skew = spark.range(0, 300000).select(F.when(F.col('id') % 10 < 8, F.lit('K-0')).otherwise(F.concat(F.lit('K-'), (F.col('id') % 49 + 1).cast('string'))).alias('k'), F.col('id').alias('v'))
    dim = spark.range(0, 50).select(F.concat(F.lit('K-'), F.col('id').cast('string')).alias('k'), F.col('id').alias('dim_id'))
    sizes = lambda df: [r['n'] for r in df.groupBy(F.spark_partition_id().alias('p')).agg(F.count('*').alias('n')).orderBy('p').collect()]
    OUT['counts']['spark.skew_partition_sizes'] = {
        'by_key': sizes(skew.repartition(8, 'k')),
        'salted_32': sizes(skew.withColumn('salt', F.pmod(F.col('v'), F.lit(32))).repartition(8, 'k', 'salt'))}
    top = skew.groupBy('k').count().orderBy(F.col('count').desc()).limit(3)
    table('spark.skew_top_keys', top)
    spark.conf.set('spark.sql.autoBroadcastJoinThreshold', '-1')
    spark.conf.set('spark.sql.adaptive.enabled', 'true')
    spark.conf.set('spark.sql.adaptive.skewJoin.enabled', 'false')
    sj = skew.join(dim, 'k'); sj.collect(); text('plan.skew_off', plan_text(sj))
    spark.conf.set('spark.sql.adaptive.skewJoin.enabled', 'true')
    spark.conf.set('spark.sql.adaptive.skewJoin.skewedPartitionFactor', '2')
    spark.conf.set('spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes', '1024')
    spark.conf.set('spark.sql.adaptive.advisoryPartitionSizeInBytes', '65536')
    spark.conf.set('spark.sql.adaptive.coalescePartitions.enabled', 'false')
    sj2 = skew.join(dim, 'k'); sj2.collect(); text('plan.skew_on', plan_text(sj2))
    reset_conf()
    for k in ('spark.sql.adaptive.skewJoin.skewedPartitionFactor', 'spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes', 'spark.sql.adaptive.advisoryPartitionSizeInBytes'):
        spark.conf.unset(k)

    # Python function against a built-in function
    py_lower = F.udf(lambda s: s.lower() if s else s, 'string')
    text('plan.udf', plan_text(orders.select(py_lower('status').alias('s'))))
    text('plan.builtin', plan_text(orders.select(F.lower('status').alias('s'))))

    # cache
    cached = orders_big.filter('qty > 50').cache()
    cached.count()
    text('plan.cached', plan_text(cached.groupBy('product_id').count()))
    cached.unpersist()

    # how many files a shuffle writes
    out = WORK / 'shuffle_files'
    for label, n, aqe in (('shuffle_200', 200, 'false'), ('shuffle_8', 8, 'false'), ('shuffle_200_aqe', 200, 'true')):
        spark.conf.set('spark.sql.shuffle.partitions', str(n)); spark.conf.set('spark.sql.adaptive.enabled', aqe)
        pth = str(out / label)
        orders_big.groupBy('customer_id').agg(F.sum('qty').alias('units')).write.mode('overwrite').parquet(pth)
        OUT['counts']['spark.' + label] = {'files': len(files_of(pth))}
    reset_conf()
    # the defaults of the settings the lessons quote, read in a fresh process: this session changes several of them
    probe = (
        "from pyspark.sql import SparkSession\n"
        "import json\n"
        "s = SparkSession.builder.master('local[1]').config('spark.ui.enabled','false').getOrCreate()\n"
        "s.sparkContext.setLogLevel('OFF')\n"
        "keys = ['spark.sql.shuffle.partitions','spark.sql.adaptive.enabled','spark.sql.autoBroadcastJoinThreshold','spark.sql.adaptive.skewJoin.enabled',"
        "'spark.sql.adaptive.skewJoin.skewedPartitionFactor','spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes',"
        "'spark.sql.adaptive.advisoryPartitionSizeInBytes','spark.sql.files.maxPartitionBytes','spark.sql.adaptive.coalescePartitions.enabled']\n"
        "print('JSON' + json.dumps({k: s.conf.get(k) for k in keys}))\n")
    res = subprocess.run([sys.executable, '-c', probe], capture_output=True, text=True)
    OUT['counts']['spark.defaults'] = json.loads(re.search(r'JSON(\{.*\})', res.stdout).group(1))
    print('spark group done')


# ============================================================================= 2. DELTA LAKE CORE
if 'delta' in ONLY:
    reset_conf()
    from delta.tables import DeltaTable
    from pyspark.sql import Window
    D = WORK / 'delta'
    base = read_csv('orders', ORDERS_DDL)
    cols = ['order_id', 'customer_id', 'order_ts', 'status', 'total_usd', '_loaded_at']
    latest = lambda df: df.withColumn('rn', F.row_number().over(Window.partitionBy('order_id').orderBy(F.col('_loaded_at').desc()))).filter('rn = 1').drop('rn')
    day = lambda d: base.filter(F.to_date('_loaded_at') == F.lit(d).cast('date'))
    show_cols = ['order_id', 'status', 'total_usd']

    p = str(D / 'orders')
    latest(day('2026-03-14')).select(cols).coalesce(1).write.format('delta').save(p)                       # version 0
    detail(p, 'delta.orders_v0')
    OUT['listing']['delta.after_v0'] = listing(p)
    latest(day('2026-03-15')).select(cols).coalesce(1).write.format('delta').mode('append').save(p)        # version 1
    sql("update delta.`%s` set status = 'SHIPPED' where order_id = 'O-5002'" % p)                            # version 2
    sql("delete from delta.`%s` where status = 'CANCELLED'" % p)                                             # version 3
    late = spark.createDataFrame([('O-5007', 'C-42', datetime.datetime(2026, 3, 16, 17, 55), 'SHIPPED', decimal.Decimal('16.00'), datetime.datetime(2026, 3, 17, 20, 0))],
                                 'order_id string, customer_id string, order_ts timestamp, status string, total_usd decimal(12,2), _loaded_at timestamp')
    updates = latest(day('2026-03-16').unionByName(day('2026-03-17')).unionByName(late)).select(cols)
    updates.createOrReplaceTempView('updates')
    MERGE_SQL = textwrap.dedent("""\
        MERGE INTO orders AS t
        USING updates AS s
        ON t.order_id = s.order_id
        WHEN MATCHED AND s._loaded_at > t._loaded_at THEN UPDATE SET *
        WHEN NOT MATCHED THEN INSERT *""")
    OUT['files']['delta/merge.sql'] = MERGE_SQL + '\n'
    spark.read.format('delta').load(p).createOrReplaceTempView('orders_view')
    sql(MERGE_SQL.replace('MERGE INTO orders AS t', 'MERGE INTO delta.`%s` AS t' % p))                      # version 4
    sql('optimize delta.`%s`' % p)                                                                           # version 5
    for v in range(0, 6):
        table('delta.version_%d' % v, spark.read.format('delta').option('versionAsOf', v).load(p).select(show_cols), order=['order_id'])
    history(p, 'delta.orders')
    read_log(p, 'delta.orders')
    detail(p, 'delta.orders_v5')
    OUT['listing']['delta.after_v5'] = listing(p)
    # restore, with its own history row
    r = sql('restore table delta.`%s` to version as of 1' % p).collect()[0].asDict()
    OUT['counts']['delta.restore'] = {k: cell(v) for k, v in r.items()}
    table('delta.after_restore', spark.read.format('delta').load(p).select(show_cols), order=['order_id'])
    history(p, 'delta.orders_after_restore')

    # schema enforcement and evolution on a copy of day one
    ps = str(D / 'schema')
    latest(day('2026-03-14')).select(cols).coalesce(1).write.format('delta').save(ps)
    extra = latest(day('2026-03-15')).select(cols).withColumn('channel', F.lit('web'))
    cls, msg = exc(lambda: extra.write.format('delta').mode('append').save(ps))
    text('delta.err_extra_column', msg)
    bad = spark.createDataFrame([('O-9001', 'C-1', datetime.datetime(2026, 3, 18, 8, 0), 'PLACED', 'abc', datetime.datetime(2026, 3, 18, 9, 0))],
                                'order_id string, customer_id string, order_ts timestamp, status string, total_usd string, _loaded_at timestamp')
    cls, msg = exc(lambda: bad.write.format('delta').mode('append').save(ps))
    text('delta.err_type', msg)
    extra.write.format('delta').mode('append').option('mergeSchema', 'true').save(ps)
    table('delta.after_merge_schema', spark.read.format('delta').load(ps).select('order_id', 'status', 'channel'), order=['order_id'])
    text('delta.schema_after_merge', spark.read.format('delta').load(ps)._jdf.schema().treeString())

    # constraints
    pc = str(D / 'constraint')
    latest(day('2026-03-14')).select(cols).write.format('delta').save(pc)
    sql('alter table delta.`%s` add constraint positive_total check (total_usd > 0)' % pc)
    cls, msg = exc(lambda: sql("insert into delta.`%s` values ('O-9002', 'C-1', timestamp'2026-03-18 08:00:00', 'PLACED', -5.00, timestamp'2026-03-18 09:00:00')" % pc))
    text('delta.err_constraint', msg)
    cls, msg = exc(lambda: sql("alter table delta.`%s` add constraint never_free check (total_usd > 100)" % pc))
    text('delta.err_constraint_existing_rows', msg)
    OUT['counts']['delta.constraint_properties'] = {k: v for k, v in sql('describe detail delta.`%s`' % pc).collect()[0].asDict()['properties'].items()}

    # change data feed
    pf = str(D / 'cdf')
    latest(day('2026-03-14')).select(cols).write.format('delta').option('delta.enableChangeDataFeed', 'true').save(pf)
    sql("update delta.`%s` set status = 'SHIPPED' where order_id = 'O-5002'" % pf)
    sql("delete from delta.`%s` where order_id = 'O-5003'" % pf)
    latest(day('2026-03-15')).select(cols).write.format('delta').mode('append').save(pf)
    feed = spark.read.format('delta').option('readChangeFeed', 'true').option('startingVersion', 0).load(pf)
    table('delta.change_feed', feed.select('order_id', 'status', '_change_type', '_commit_version'), order=['_commit_version', 'order_id', '_change_type'])

    # deletion vectors: delete one row with and without them
    for label, dv in (('dv_off', 'false'), ('dv_on', 'true')):
        pd = str(D / label)
        latest(day('2026-03-14')).select(cols).coalesce(1).write.format('delta').option('delta.enableDeletionVectors', dv).save(pd)
        sql("delete from delta.`%s` where order_id = 'O-5003'" % pd)
        last = read_log(pd)[-1]
        OUT['logs']['delta.' + label + '_delete'] = last
        h = history(pd, 'delta.' + label)
        OUT['counts']['delta.' + label + '_files'] = {'files_in_folder': len(files_of(pd)), 'rows_after': spark.read.format('delta').load(pd).count()}

    # a merge whose source holds two rows for one key
    pm = str(D / 'merge_dupes')
    latest(day('2026-03-14')).select(cols).coalesce(1).write.format('delta').save(pm)
    dupes = spark.createDataFrame(
        [('O-5002', 'C-77', datetime.datetime(2026, 3, 14, 9, 12), 'SHIPPED', decimal.Decimal('12.50'), datetime.datetime(2026, 3, 15, 9, 0)),
         ('O-5002', 'C-77', datetime.datetime(2026, 3, 14, 9, 12), 'CANCELLED', decimal.Decimal('12.50'), datetime.datetime(2026, 3, 15, 10, 0))],
        'order_id string, customer_id string, order_ts timestamp, status string, total_usd decimal(12,2), _loaded_at timestamp')
    dupes.createOrReplaceTempView('dupes')
    cls, msg = exc(lambda: sql('merge into delta.`%s` as t using dupes as s on t.order_id = s.order_id when matched then update set * when not matched then insert *' % pm))
    text('delta.err_merge_duplicates', msg)

    # shallow clone
    pcl = str(D / 'clone')
    r = sql('create table delta.`%s` shallow clone delta.`%s`' % (pcl, p)).collect()[0].asDict()
    OUT['counts']['delta.shallow_clone'] = {k: cell(v) for k, v in r.items()}
    OUT['counts']['delta.shallow_clone']['parquet_files_in_clone_folder'] = len(files_of(pcl))
    read_log(pcl, 'delta.clone')
    print('delta group done')


# ============================================================================= 2b. CONCURRENT WRITERS
if 'conflict' in ONLY:
    import threading, time
    reset_conf()
    D = WORK / 'conflict'
    spark.udf.register('slow_id', lambda s: (time.sleep(6), s)[1], 'string')          # makes writer A slow on purpose
    SCH = 'order_id string, status string, region string'
    BASE = [('O-1', 'PLACED', 'a'), ('O-2', 'PLACED', 'a'), ('O-3', 'SHIPPED', 'b')]

    def make(p, partitioned=False):
        w = spark.createDataFrame(BASE, SCH).coalesce(1).write.format('delta')
        (w.partitionBy('region') if partitioned else w).save(p)

    def append(p, rows, slow=False):
        df = spark.createDataFrame(rows, SCH)
        if slow:
            df = df.withColumn('order_id', F.expr('slow_id(order_id)'))
        df.write.format('delta').mode('append').save(p)

    def race(label, partitioned, a, b, delay=3.0):
        """Writer A starts first and is slow. Writer B commits while A is still reading the table."""
        p = str(D / label)
        make(p, partitioned)
        res = {}
        t = threading.Thread(target=lambda: res.__setitem__('a', exc(lambda: a(p))))
        t.start()
        time.sleep(delay)
        res['b'] = exc(lambda: b(p))
        t.join()
        ops = [(int(r['version']), r['operation']) for r in sql('describe history delta.`%s`' % p).orderBy('version').collect()]
        out = {'a': res['a'][0] or 'committed', 'b': res['b'][0] or 'committed', 'history': ['v%d %s' % o for o in ops],
               'rows': spark.read.format('delta').load(p).count()}
        if res['a'][1]:
            msg = res['a'][1]
            msg = re.sub(r'\s*Refer to https?://\S+ for more information\.?', '', msg)
            msg = re.sub(r'\s*for more information\.?$', '', msg)
            text('delta.conflict_' + label, msg)
        return out, p

    upd = lambda cond, new: (lambda p: sql("update delta.`%s` set status = '%s' where %s" % (p, new, cond)))
    C = {}
    C['append_append'], _ = race('append_append', False, lambda p: append(p, [('O-9', 'PLACED', 'a')], slow=True), lambda p: append(p, [('O-10', 'PLACED', 'a')]))
    C['update_append'], pu = race('update_append', False, upd("slow_id(order_id) = 'O-1'", 'SHIPPED'), lambda p: append(p, [('O-4', 'PLACED', 'a')]))
    sql("update delta.`%s` set status = 'SHIPPED' where order_id = 'O-1'" % pu)                    # the retry of writer A, now without a competitor
    C['update_append']['retry'] = 'committed'
    C['update_append']['rows_after_retry'] = spark.read.format('delta').load(pu).where("status = 'SHIPPED'").count()
    C['update_append_partitioned'], _ = race('update_append_partitioned', True, upd("region = 'a' and slow_id(order_id) = 'O-1'", 'SHIPPED'), lambda p: append(p, [('O-5', 'PLACED', 'b')]))
    C['update_update'], _ = race('update_update', False, upd("slow_id(order_id) = 'O-1'", 'SHIPPED'), upd("order_id = 'O-2'", 'CANCELLED'))
    OUT['counts']['delta.conflicts'] = C
    print('conflict group done')


# ============================================================================= 3. DELTA LAYOUT AND MAINTENANCE
def scan_files(df):
    """How many files the scan of a DataFrame reads, as Spark reports it after the query ran (after Delta's data skipping)."""
    df.collect()
    plan = df._jdf.queryExecution().executedPlan()
    leaves = plan.collectLeaves()
    out = []
    for i in range(leaves.size()):
        m = leaves.apply(i).metrics()
        if m.contains('numFiles'):
            out.append(int(m.apply('numFiles').value()))
    return sum(out)


def live_files(path, column):
    """The files of the latest snapshot with their row counts and the min and max of one column, from the Delta log stats."""
    n = norm_for(path)
    live = {}
    for f in sorted(glob.glob(os.path.join(path, '_delta_log', '*.json'))):
        for ln in pathlib.Path(f).read_text().splitlines():
            if not ln.strip():
                continue
            raw = json.loads(ln)
            if 'add' in raw:
                live[raw['add']['path']] = raw['add']
            if 'remove' in raw:
                live.pop(raw['remove']['path'], None)
    out = []
    for pth, a in live.items():
        st = json.loads(a.get('stats') or '{}')
        out.append({'file': n.path(pth), 'rows': st.get('numRecords'), 'min': (st.get('minValues') or {}).get(column), 'max': (st.get('maxValues') or {}).get(column), 'bytes': a['size']})
    return sorted(out, key=lambda x: x['file'])


if 'layout' in ONLY:
    reset_conf()
    D = WORK / 'layout'

    # many small writes make many small files, and OPTIMIZE compacts them
    ps = str(D / 'small')
    for i in range(40):
        (spark.range(i * 50, (i + 1) * 50).select(F.concat(F.lit('O-'), F.col('id').cast('string')).alias('order_id'), (F.col('id') % 40).cast('string').alias('customer_id'), (F.col('id') % 97).alias('qty'))
         .coalesce(1).write.format('delta').mode('append').save(ps))
    detail(ps, 'layout.small_before')
    OPT = sql('optimize delta.`%s`' % ps).collect()[0]['metrics'].asDict(recursive=True)
    OUT['counts']['layout.small_optimize'] = {k: OPT[k] for k in ('numFilesAdded', 'numFilesRemoved')}
    OUT['counts']['layout.small_optimize']['filesAdded'] = {k: OPT['filesAdded'][k] for k in ('min', 'max', 'totalFiles', 'totalSize')}
    OUT['counts']['layout.small_optimize']['filesRemoved'] = {k: OPT['filesRemoved'][k] for k in ('min', 'max', 'totalFiles', 'totalSize')}
    detail(ps, 'layout.small_after')
    ops = {}
    for r in history(ps, 'layout.small_history_full'):
        ops[r['operation']] = ops.get(r['operation'], 0) + 1
    OUT['counts']['layout.small_operations'] = ops
    OUT['history']['layout.small_history'] = OUT['history'].pop('layout.small_history_full')[-2:]

    # data skipping: a filter reads only the files whose min and max can match
    pz = str(D / 'zorder')
    n = 400000
    z = spark.range(n).select(F.col('id').alias('order_id'),
                              F.concat(F.lit('C-'), F.format_string('%04d', F.pmod(F.xxhash64('id'), F.lit(2000)))).alias('customer_id'),
                              F.pmod(F.xxhash64('id'), F.lit(90)).alias('day_offset'), (F.col('id') % 97).alias('qty'))
    z.repartition(16).write.format('delta').save(pz)
    target = 'C-0420'
    flt = lambda: spark.read.format('delta').load(pz).filter(F.col('customer_id') == target)
    before = live_files(pz, 'customer_id')
    OUT['counts']['layout.zorder'] = {'predicate': "customer_id = '%s'" % target, 'rows_matching': flt().count(), 'files_before': before,
                                      'scan_files_before': scan_files(flt()), 'total_files_before': len(before)}
    spark.conf.set('spark.databricks.delta.optimize.maxFileSize', str(1024 * 1024))
    ZO = sql('optimize delta.`%s` zorder by (customer_id)' % pz).collect()[0]['metrics'].asDict(recursive=True)
    after = live_files(pz, 'customer_id')
    OUT['counts']['layout.zorder'].update({'files_after': after, 'scan_files_after': scan_files(flt()), 'total_files_after': len(after),
                                           'numFilesAdded': ZO['numFilesAdded'], 'numFilesRemoved': ZO['numFilesRemoved'], 'zOrderBy': 'customer_id'})
    spark.conf.unset('spark.databricks.delta.optimize.maxFileSize')
    OUT['history']['layout.zorder'] = [r for r in history(pz, 'layout.zorder_full') if r['operation'] == 'OPTIMIZE']
    OUT['history'].pop('layout.zorder_full')

    # partitioning by a column with many values writes many small files
    parts = {}
    zz = z.limit(100000).withColumn('cust100', F.pmod(F.xxhash64('order_id'), F.lit(100))).withColumn('bucket3', F.col('qty') % 3)
    for label, col in (('none', None), ('bucket3', 'bucket3'), ('cust100', 'cust100')):
        pp = str(D / ('part_' + label))
        w = zz.write.format('delta')
        (w.partitionBy(col) if col else w).save(pp)
        d = detail(pp, 'layout.part_' + label)
        parts[label] = {'partition_values': 1 if not col else {'bucket3': 3, 'cust100': 100}[col], 'numFiles': d['numFiles'], 'sizeInBytes': d['sizeInBytes'], 'avg_file_bytes': d['sizeInBytes'] // max(d['numFiles'], 1)}
    OUT['counts']['layout.partitioning'] = parts

    # VACUUM and the retention check
    pv = str(D / 'vacuum')
    v0 = spark.range(0, 1000).selectExpr("id as order_id", "cast(id % 40 as string) as customer_id").coalesce(1)
    v0.write.format('delta').save(pv)
    v0.limit(500).write.format('delta').mode('overwrite').save(pv)
    v0.limit(100).write.format('delta').mode('overwrite').save(pv)
    nv = norm_for(pv)
    OUT['counts']['layout.vacuum_before'] = {'files_in_folder': len(files_of(pv)), 'files_in_snapshot': detail(pv, 'layout.vacuum_detail')['numFiles'], 'versions': 3}
    dry = sql('vacuum delta.`%s` dry run' % pv).collect()
    OUT['counts']['layout.vacuum_dry_default_retention'] = {'files_to_delete': len(dry), 'retention_hours': 168}
    cls, msg = exc(lambda: sql('vacuum delta.`%s` retain 0 hours' % pv))
    text('layout.err_vacuum_retention', msg)
    spark.conf.set('spark.databricks.delta.retentionDurationCheck.enabled', 'false')
    dry0 = sql('vacuum delta.`%s` retain 0 hours dry run' % pv).collect()
    OUT['counts']['layout.vacuum_dry_zero_retention'] = {'rows_returned': len(dry0)}
    sql('vacuum delta.`%s` retain 0 hours' % pv).collect()
    OUT['counts']['layout.vacuum_after'] = {'files_in_folder': len(files_of(pv)), 'files_in_snapshot': detail(pv, 'layout.vacuum_detail_after')['numFiles']}
    cls, msg = exc(lambda: spark.read.format('delta').option('versionAsOf', 0).load(pv).collect())
    OUT['counts']['layout.time_travel_after_vacuum'] = {'error_class': cls}
    text('layout.err_time_travel_after_vacuum', msg)
    spark.conf.set('spark.databricks.delta.retentionDurationCheck.enabled', 'true')
    OUT['history']['layout.vacuum'] = [r for r in history(pv, 'layout.vacuum_full') if r['operation'].startswith('VACUUM')]
    OUT['history'].pop('layout.vacuum_full')

    # liquid clustering: declare the columns, OPTIMIZE clusters them
    spark.conf.set('spark.databricks.delta.optimize.maxFileSize', str(1024 * 1024))
    sql('create table lc_orders (order_id bigint, customer_id string, qty int) using delta cluster by (customer_id)')
    z.select('order_id', 'customer_id', F.col('qty').cast('int')).repartition(16).write.format('delta').mode('append').saveAsTable('lc_orders')
    detail('lc_orders', 'layout.liquid_before', path=False)
    lc_opt = sql('optimize lc_orders').collect()[0]['metrics'].asDict(recursive=True)
    OUT['counts']['layout.liquid_optimize'] = {'numFilesAdded': lc_opt['numFilesAdded'], 'numFilesRemoved': lc_opt['numFilesRemoved']}
    detail('lc_orders', 'layout.liquid_after', path=False)
    loc = sql('describe detail lc_orders').collect()[0]['location'].replace('file:', '')
    log = read_log(loc)
    OUT['logs']['layout.liquid'] = [{'version': c['version'], 'actions': [a for a in c['actions'] if a['kind'] in ('metaData', 'domainMetadata', 'commitInfo', 'protocol')]} for c in log[:1] + log[-1:]]
    spark.conf.unset('spark.databricks.delta.optimize.maxFileSize')
    OUT['counts']['layout.liquid_scan'] = {'predicate': "customer_id = '%s'" % target, 'scan_files': scan_files(spark.table('lc_orders').filter(F.col('customer_id') == target)), 'total_files': detail('lc_orders', 'layout.liquid_files', path=False)['numFiles']}
    print('layout group done')


# ============================================================================= 4. STREAMING AND THE MEDALLION PIPELINE
def run_snippet(name, code, ns):
    """Run lesson code for real and keep its text, so a lesson can only show code that ran."""
    code = textwrap.dedent(code).strip('\n') + '\n'
    OUT['files'][name] = code
    exec(compile(code, name, 'exec'), ns)


def progress(q):
    out = []
    for pr in q.recentProgress:
        s = pr['sources'][0] if pr.get('sources') else {}
        out.append({'batchId': pr['batchId'], 'numInputRows': pr['numInputRows'], 'startOffset': s.get('startOffset'), 'endOffset': s.get('endOffset')})
    return out


if 'stream' in ONLY or 'pipeline' in ONLY:
    reset_conf()
    from delta.tables import DeltaTable
    from pyspark.sql import Window
    S = WORK / 'stream'
    (S / 'landing').mkdir(parents=True)
    (S / 'events').mkdir(parents=True)
    base = read_csv('orders', ORDERS_DDL)
    day = lambda d: base.filter(F.to_date('_loaded_at') == F.lit(d).cast('date'))
    ns = dict(spark=spark, F=F, T=T, Window=Window, DeltaTable=DeltaTable, datetime=datetime, orders_schema=ORDERS_DDL,
              landing=str(S / 'landing'), bronze=str(S / 'bronze'), silver=str(S / 'silver'), gold=str(S / 'gold'),
              ckpt_bronze=str(S / '_chk' / 'bronze'), ckpt_silver=str(S / '_chk' / 'silver'), events_dir=str(S / 'events'), ckpt_events=str(S / '_chk' / 'events'),
              dim_path=str(S / 'dim_customers'), emitted=[])

    def land(label, df):
        lines = df.orderBy('_loaded_at', 'order_id').toJSON().collect()
        pathlib.Path(ns['landing'], 'orders_%s.json' % label).write_text('\n'.join(lines) + '\n')
        return {'file': 'orders_%s.json' % label, 'rows': len(lines)}

    BRONZE = """
        bronze_stream = (spark.readStream
            .format("json")
            .schema(orders_schema)
            .load(landing)
            .select("*", F.col("_metadata.file_name").alias("_source_file"), F.current_timestamp().alias("_ingested_at")))

        query = (bronze_stream.writeStream
            .format("delta")
            .option("checkpointLocation", ckpt_bronze)
            .trigger(availableNow=True)
            .start(bronze))
        query.awaitTermination()
    """
    SILVER = """
        def upsert_orders(batch_df, batch_id):
            newest = (batch_df
                .withColumn("rn", F.row_number().over(Window.partitionBy("order_id").orderBy(F.col("_loaded_at").desc())))
                .filter("rn = 1").drop("rn"))
            (DeltaTable.forPath(spark, silver).alias("t")
                .merge(newest.alias("s"), "t.order_id = s.order_id")
                .whenMatchedUpdateAll(condition="s._loaded_at > t._loaded_at")
                .whenNotMatchedInsertAll()
                .execute())

        query = (spark.readStream.format("delta").load(bronze)
            .writeStream.foreachBatch(upsert_orders)
            .option("checkpointLocation", ckpt_silver)
            .trigger(availableNow=True)
            .start())
        query.awaitTermination()
    """
    runs = []

    def bronze_run(label, landed):
        run_snippet('stream/bronze.py', BRONZE, ns)
        rows = spark.read.format('delta').load(ns['bronze'])
        runs.append({'label': label, 'landed': landed, 'progress': progress(ns['query']), 'bronze_rows': rows.count(), 'bronze_orders': rows.select('order_id').distinct().count()})

    a1 = land('20260314', day('2026-03-14'))
    bronze_run('first arrival', [a1])
    vis = lambda d: sorted(f for f in os.listdir(d) if not f.startswith('.'))
    OUT['listing']['stream.checkpoint_bronze'] = {'entries': vis(ns['ckpt_bronze']), 'offsets': vis(ns['ckpt_bronze'] + '/offsets'),
                                                  'commits': vis(ns['ckpt_bronze'] + '/commits'),
                                                  'offset_0_last_line': pathlib.Path(ns['ckpt_bronze'], 'offsets', '0').read_text().strip().splitlines()[-1]}
    a2 = land('20260315', day('2026-03-15'))
    bronze_run('second arrival', [a2])
    bronze_run('nothing new', [])
    spark.read.format('delta').load(ns['bronze']).limit(0).write.format('delta').save(ns['silver'])
    run_snippet('stream/silver.py', SILVER, ns)
    OUT['counts']['stream.silver_run_1'] = {'progress': progress(ns['query']), 'silver_rows': spark.read.format('delta').load(ns['silver']).count()}
    pathlib.Path(ns['landing'], 'orders_20260315_resend.json').write_text(pathlib.Path(ns['landing'], 'orders_20260315.json').read_text())
    a3 = land('20260316_17', day('2026-03-16').unionByName(day('2026-03-17')))
    bronze_run('third arrival and a resend', [a3, {'file': 'orders_20260315_resend.json', 'rows': a2['rows']}])
    run_snippet('stream/silver.py', SILVER, ns)
    OUT['counts']['stream.silver_run_2'] = {'progress': progress(ns['query']), 'silver_rows': spark.read.format('delta').load(ns['silver']).count()}
    OUT['counts']['stream.bronze_runs'] = runs
    table('stream.silver_rows', spark.read.format('delta').load(ns['silver']).select('order_id', 'status', 'total_usd', '_loaded_at'), order=['order_id'])
    table('stream.bronze_duplicates', spark.read.format('delta').load(ns['bronze']).groupBy('order_id', 'status').count().filter('count > 1'), order=['order_id', 'status'])
    table('stream.bronze_sample', spark.read.format('delta').load(ns['bronze']).select('order_id', 'status', '_loaded_at', '_source_file').filter("order_id = 'O-5004'"), order=['_source_file'])
    history(ns['silver'], 'stream.silver_history')
    history(ns['bronze'], 'stream.bronze_history')

    run_snippet('stream/gold.py', """
        gold_df = (spark.read.format("delta").load(silver)
            .filter("status <> 'CANCELLED'")
            .groupBy(F.to_date("order_ts").alias("order_date"))
            .agg(F.count("*").alias("orders"), F.sum("total_usd").alias("revenue_usd")))
        gold_df.write.format("delta").mode("overwrite").save(gold)
    """, ns)
    table('stream.gold_rows', spark.read.format('delta').load(ns['gold']), order=['order_date'])

    cust = read_csv('customers', CUST_DDL)
    cust.select('customer_id', 'full_name', 'tier', F.col('_loaded_at').alias('valid_from'), F.lit(None).cast('timestamp').alias('valid_to'), F.lit(True).alias('is_current')).coalesce(1).write.format('delta').save(ns['dim_path'])
    table('pipeline.dim_before', spark.read.format('delta').load(ns['dim_path']).select('customer_id', 'tier', 'valid_from', 'valid_to', 'is_current'), order=['customer_id'])
    run_snippet('pipeline/scd2.py', """
        changes = spark.createDataFrame(
            [("C-42", "Ava Martin", "gold", datetime.datetime(2026, 3, 16, 8, 0)),
             ("C-55", "Mia Rossi", "standard", datetime.datetime(2026, 3, 16, 8, 0))],
            "customer_id string, full_name string, tier string, effective_at timestamp")

        dim = DeltaTable.forPath(spark, dim_path)
        current = dim.toDF().filter("is_current")

        new_versions = (changes.alias("s").join(current.alias("t"), "customer_id")
            .where("s.tier <> t.tier")
            .selectExpr("CAST(NULL AS STRING) AS merge_key", "s.customer_id", "s.full_name", "s.tier", "s.effective_at"))

        staged = new_versions.unionByName(
            changes.selectExpr("customer_id AS merge_key", "customer_id", "full_name", "tier", "effective_at"))

        (dim.alias("t")
            .merge(staged.alias("s"), "t.customer_id = s.merge_key AND t.is_current")
            .whenMatchedUpdate(condition="t.tier <> s.tier", set={"is_current": "false", "valid_to": "s.effective_at"})
            .whenNotMatchedInsert(values={"customer_id": "s.customer_id", "full_name": "s.full_name", "tier": "s.tier",
                                          "valid_from": "s.effective_at", "valid_to": "NULL", "is_current": "true"})
            .execute())
    """, ns)
    table('pipeline.dim_after', spark.read.format('delta').load(ns['dim_path']).select('customer_id', 'tier', 'valid_from', 'valid_to', 'is_current'), order=['customer_id', 'valid_from'])
    history(ns['dim_path'], 'pipeline.dim_history')

    WM = """
        events = (spark.readStream.format("json").schema("event_time timestamp, order_id string").load(events_dir))

        windows = (events.withWatermark("event_time", "10 minutes")
            .groupBy(F.window("event_time", "10 minutes"))
            .agg(F.count("*").alias("orders")))

        def collect_batch(batch_df, batch_id):
            for r in batch_df.collect():
                emitted.append({"batch": batch_id, "window_start": str(r["window"]["start"]), "window_end": str(r["window"]["end"]), "orders": r["orders"]})

        query = (windows.writeStream.outputMode("append")
            .foreachBatch(collect_batch)
            .option("checkpointLocation", ckpt_events)
            .trigger(availableNow=True)
            .start())
        query.awaitTermination()
    """
    wm_runs = []
    for label, minutes in (('file 1', [0, 3, 7]), ('file 2', [12, 25]), ('file 3, with a late event at 09:04', [4, 31])):
        lines = [json.dumps({'event_time': '2026-03-18T09:%02d:00.000Z' % m, 'order_id': 'E-%d-%d' % (len(wm_runs), k)}) for k, m in enumerate(minutes)]
        pathlib.Path(ns['events_dir'], 'events_%d.json' % len(wm_runs)).write_text('\n'.join(lines) + '\n')
        ns['emitted'].clear()
        run_snippet('stream/watermark.py', WM, ns)
        lp = ns['query'].lastProgress or {}
        dropped = sum(so.get('numRowsDroppedByWatermark', 0) for pr in ns['query'].recentProgress for so in (pr.get('stateOperators') or []))
        wm_runs.append({'label': label, 'event_times': ['09:%02d' % m for m in minutes], 'emitted': list(ns['emitted']), 'watermark': (lp.get('eventTime') or {}).get('watermark'),
                        'rows_in': sum(pr['numInputRows'] for pr in ns['query'].recentProgress), 'dropped_by_watermark': dropped})
    OUT['counts']['stream.watermark_runs'] = wm_runs
    # the same three files read as a batch: the late event exists, and the streaming query dropped it
    batch = (spark.read.schema('event_time timestamp, order_id string').json(ns['events_dir']).groupBy(F.window('event_time', '10 minutes').alias('w'))
             .agg(F.count('*').alias('orders')).select(F.col('w.start').alias('window_start'), F.col('w.end').alias('window_end'), 'orders'))
    table('stream.watermark_batch_counts', batch, order=['window_start'])
    print('stream group done')


# ============================================================================= 5. TESTING PYSPARK CODE
if 'test' in ONLY:
    SRC = HERE / 'testproj'
    P = WORK / 'testproj'
    shutil.copytree(SRC, P, ignore=shutil.ignore_patterns('__pycache__', '.pytest_cache'))
    for rel in ('transforms.py', 'conftest.py', 'tests/test_transforms.py'):
        OUT['files']['test/' + rel] = (P / rel).read_text()

    def pytest_run():
        env = dict(os.environ, PYTHONPATH=str(P), PYTHONDONTWRITEBYTECODE='1')
        r = subprocess.run([sys.executable, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', '--tb=short', '-p', 'no:warnings', 'tests'], cwd=P, env=env, capture_output=True, text=True)
        out = re.sub(r'in \d+\.\d+s', 'in N s', r.stdout)
        out = re.sub(r'(?m)^Picked up .*\n', '', out)
        return r.returncode, out.strip()

    rc, out = pytest_run()
    text('test.pytest_pass', out)
    OUT['counts']['test.pass'] = {'returncode': rc}
    good = (P / 'transforms.py').read_text()
    bug = good.replace('.filter(F.col("status") != "CANCELLED")', '.filter(F.col("status") != "CANCELED")')
    assert bug != good
    OUT['files']['test/transforms_bug.py'] = bug
    (P / 'transforms.py').write_text(bug)
    rc, out = pytest_run()
    text('test.pytest_fail', out)
    OUT['counts']['test.fail'] = {'returncode': rc}
    (P / 'transforms.py').write_text(good)
    print('test group done')


# ============================================================================= write
def finish():
    js = 'window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(OUT, indent=1, ensure_ascii=False, sort_keys=True) + ';\n'
    pathlib.Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    pathlib.Path(args.out).write_text(js)
    if args.json:
        pathlib.Path(args.json).write_text(json.dumps(OUT, indent=1, ensure_ascii=False, sort_keys=True))
    print('wrote', args.out, '%d KB' % (len(js) // 1024), '| tables', len(OUT['tables']), '| text', len(OUT['text']), '| logs', len(OUT['logs']), '| history', len(OUT['history']), '| counts', len(OUT['counts']))
    spark.stop()
    shutil.rmtree(WORK, ignore_errors=True)


if __name__ == '__main__':
    finish()
