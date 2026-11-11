#!/usr/bin/env python3
"""Run the Brewline lakehouse steps in a local Spark session with Delta Lake, and print what happened as JSON on the last line.

Used by capture_az.py (section "lakehouse") for mission 6 of the Azure tutorial. Nothing here runs on Azure, Databricks, Synapse or Fabric:
it is Apache Spark and open-source Delta Lake on one machine, writing to the local disk. The files are laid out as they are in a lake.
What is recorded: the three layers (bronze, silver, gold) of a small orders load, the transaction log that Delta writes for each commit,
history and time travel, OPTIMIZE and VACUUM, a refused write (schema enforcement), a cast that fails in Spark 4 (ANSI mode), and the physical
plans of a filter on a partitioned table and of two kinds of join.

Needs:   pip install pyspark==4.0.1 delta-spark==4.0.1      and a Java 17 or 21 runtime
Usage:   python3 spark_job.py WORKDIR                       (capture_az.py calls it with the Python of an environment that has pyspark)
Delta jars: if ~/.ivy2*/jars has the io.delta jars (an earlier run downloaded them), they are used, so that no network is needed.
            Otherwise delta-spark downloads them from Maven Central.
Ids in file names and the clock in the log are replaced by fixed placeholders, so that the recording is the same on every run.
"""
import contextlib
import glob
import importlib.metadata as md
import io
import json
import os
import pathlib
import re
import sys

WORK = pathlib.Path(sys.argv[1]).resolve()
WORK.mkdir(parents=True, exist_ok=True)
LAKE = WORK / 'lake'
LAKE.mkdir(parents=True, exist_ok=True)
os.chdir(LAKE)   # the lesson shows relative paths such as silver/orders, so the code that runs uses the same ones

from delta.tables import DeltaTable
from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql import Window

OUT = {'meta': {}, 'files': {}, 'text': {}, 'tables': {}, 'counts': {}}
FIXED_MS = 1773478200000  # 2026-03-14 09:30:00 UTC, used in place of every clock value in the log
UUID = re.compile(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')
IDS = {}          # table folder name -> {random id: placeholder}


# ---------------------------------------------------------------------------------------------------------------------------
# the code that is shown in the lessons is the code that runs: it lives in strings, is written to the recording, and is executed
# ---------------------------------------------------------------------------------------------------------------------------
MEDALLION = '''\
from pyspark.sql import functions as F, Window

def to_bronze(spark, folder):
    # keep every column as text, and remember which file each row came from
    return (spark.read.option("header", True).option("sep", ";").csv(folder)
            .select("*", F.col("_metadata.file_name").alias("source_file")))

def to_silver(bronze):
    cleaned = (bronze
        .withColumn("status", F.upper(F.trim("status")))
        .withColumn("total_eur", F.expr("try_cast(replace(total, ',', '.') as decimal(10,2))"))
        .withColumn("placed_at", F.to_timestamp("placed_at", "dd/MM/yyyy HH:mm"))
        .withColumn("order_date", F.to_date("placed_at")))
    newest_first = Window.partitionBy("order_id").orderBy(F.col("source_file").desc())
    good = (cleaned.filter("total_eur IS NOT NULL")
            .withColumn("rn", F.row_number().over(newest_first)).filter("rn = 1")
            .select("order_id", "status", "total_eur", "placed_at", "order_date", "country", "source_file"))
    bad = (cleaned.filter("total_eur IS NULL").withColumn("reason", F.lit("total is not a number"))
           .select("order_id", "total", "reason", "source_file"))
    return good, bad

def to_gold(silver):
    return (silver.filter("status = 'COMPLETED'")
            .groupBy("order_date", "country")
            .agg(F.count("*").alias("orders"), F.sum("total_eur").alias("revenue_eur"))
            .orderBy("order_date", "country"))
'''

MERGE = '''\
from delta.tables import DeltaTable

silver = DeltaTable.forPath(spark, "silver/orders")
(silver.alias("t")
    .merge(new_rows.alias("s"), "t.order_id = s.order_id")
    .whenMatchedUpdateAll()
    .whenNotMatchedInsertAll()
    .execute())
'''

OPS = {
    'optimize': 'OPTIMIZE delta.`{path}`',
    'vacuum_short': 'VACUUM delta.`{path}` RETAIN 0 HOURS',
    'vacuum_dry': 'VACUUM delta.`{path}` RETAIN 0 HOURS DRY RUN',
    'history': 'DESCRIBE HISTORY delta.`{path}`',
    'detail': 'DESCRIBE DETAIL delta.`{path}`',
}

BRONZE_FILES = {
    'orders_20260314_0600.csv': 'order_id;status;total;placed_at;country\n'
                                'O1;completed ;10,50;14/03/2026 08:30;NL\n'
                                'O2;PENDING;12,00;14/03/2026 08:45;DE\n'
                                'O3;Completed;8,25;14/03/2026 08:58;NL\n'
                                'O4;COMPLETED;n/a;14/03/2026 09:10;FR\n',
    'orders_20260314_1200.csv': 'order_id;status;total;placed_at;country\n'
                                'O2;COMPLETED;12,00;14/03/2026 08:45;DE\n'
                                'O5;COMPLETED;20,00;15/03/2026 07:20;DE\n'
                                'O6;COMPLETED;7,75;15/03/2026 07:40;NL\n',
}
LATE_FILE = ('orders_20260315_0600.csv', 'order_id;status;total;placed_at;country\n'
                                          'O3;CANCELLED;8,25;14/03/2026 08:58;NL\n'
                                          'O7;COMPLETED;11,00;16/03/2026 10:05;NL\n')


# ---------------------------------------------------------------------------------------------------------------------------
def start_spark():
    b = (SparkSession.builder.master('local[2]').appName('brewline-lakehouse')
         .config('spark.ui.enabled', 'false')
         .config('spark.driver.bindAddress', '127.0.0.1').config('spark.driver.host', '127.0.0.1')
         .config('spark.sql.shuffle.partitions', '4')
         .config('spark.sql.session.timeZone', 'UTC')
         .config('spark.sql.adaptive.enabled', 'false')
         .config('spark.sql.extensions', 'io.delta.sql.DeltaSparkSessionExtension')
         .config('spark.sql.catalog.spark_catalog', 'org.apache.spark.sql.delta.catalog.DeltaCatalog'))
    jars = os.environ.get('DELTA_JARS') or ','.join(sorted(glob.glob(os.path.expanduser('~/.ivy2*/jars/io.delta_*.jar'))))
    if jars:
        spark = b.config('spark.jars', jars).getOrCreate()
    else:
        from delta import configure_spark_with_delta_pip
        spark = configure_spark_with_delta_pip(b).getOrCreate()
    spark.sparkContext.setLogLevel('ERROR')
    return spark


def val(v):
    if v is None:
        return 'NULL'
    if hasattr(v, 'strftime'):
        return v.strftime('%Y-%m-%d %H:%M') if hasattr(v, 'hour') else v.strftime('%Y-%m-%d')
    return str(v)


def rows_of(df, order_by=None):
    d = df.orderBy(*order_by) if order_by else df
    return {'cols': d.columns, 'rows': [[val(x) for x in r] for r in d.collect()]}


def register(names, scope):
    """give each new random id a placeholder, in an order that does not depend on the ids: by directory, then by part number"""
    ids = IDS.setdefault(scope, {})
    new = []
    for n in names:
        for u in UUID.findall(n):
            if u not in ids and (n, u) not in new:
                new.append((n, u))

    def key(t):
        n = t[0]
        m = re.search(r'part-(\d+)-', n)
        return (os.path.dirname(n), int(m.group(1)) if m else 0)
    for n, u in sorted(new, key=key):
        if u not in ids:
            ids[u] = '<uuid%d>' % (len(ids) + 1)


def norm(s, scope):
    ids = IDS.setdefault(scope, {})

    def rep(m):
        if m.group(0) not in ids:
            raise SystemExit('an id was not registered: ' + m.group(0))
        return ids[m.group(0)]
    return UUID.sub(rep, s)


def files_under(path):
    scope = os.path.basename(path.rstrip('/'))
    out = []
    for root, dirs, fs in os.walk(path):
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != '_staged_commits']
        for f in fs:
            if not f.startswith('.'):
                out.append(os.path.relpath(os.path.join(root, f), path))
    register(out, scope)
    return sorted(norm(x, scope) for x in out)


def listing(path, title):
    names = files_under(path)
    return title + '/\n' + '\n'.join('    ' + n for n in names)


def read_commit(path, version):
    p = pathlib.Path(path) / '_delta_log' / ('%020d.json' % version)
    acts = [json.loads(l) for l in p.read_text().splitlines() if l.strip()]
    register([a[k]['path'] for a in acts for k in ('add', 'remove') if k in a], os.path.basename(path.rstrip('/')))
    return acts


KEEP_METRICS = ('numFiles', 'numOutputRows', 'numOutputBytes', 'numSourceRows', 'numTargetRowsInserted', 'numTargetRowsUpdated',
                'numTargetRowsDeleted', 'numTargetRowsCopied', 'numTargetFilesAdded', 'numTargetFilesRemoved')


def abridge(a):
    """one action of the log in the form that is shown: clock values and ids fixed, timings and long statistics shortened"""
    a = json.loads(json.dumps(a))
    if 'commitInfo' in a:
        ci = a['commitInfo']
        ci['timestamp'] = FIXED_MS
        for k in ('txnId', 'engineInfo', 'isolationLevel', 'isBlindAppend'):
            ci.pop(k, None)
        if 'operationMetrics' in ci:
            ci['operationMetrics'] = {k: v for k, v in ci['operationMetrics'].items() if k in KEEP_METRICS}
        if 'predicate' in ci.get('operationParameters', {}):
            ci['operationParameters']['predicate'] = re.sub(r'#\d+', '', ci['operationParameters']['predicate'])
    if 'metaData' in a:
        a['metaData']['id'] = '<table-id>'
        a['metaData']['createdTime'] = FIXED_MS
        fields = json.loads(a['metaData']['schemaString'])['fields']
        a['metaData']['schemaString'] = ', '.join('%s %s' % (f['name'], f['type']) for f in fields)
    for k in ('add', 'remove'):
        if k in a:
            for t in ('modificationTime', 'deletionTimestamp'):
                if t in a[k]:
                    a[k][t] = FIXED_MS
            st = a[k].get('stats')
            if isinstance(st, str):
                st = json.loads(st)
            if st:
                short = {'numRecords': st['numRecords']}
                if 'minValues' in st:
                    short['minValues'] = {c: st['minValues'][c] for c in ('order_id', 'total_eur') if c in st['minValues']}
                    short['maxValues'] = {c: st['maxValues'][c] for c in ('order_id', 'total_eur') if c in st['maxValues']}
                a[k]['stats'] = '@@' + json.dumps(short) + '@@'
    return a


def pretty(actions, path):
    text = '\n'.join(json.dumps(abridge(a), indent=2) for a in actions)
    text = re.sub(r'"@@(.*?)@@"', lambda m: m.group(1).replace('\\"', '"'), text)
    return norm(text, os.path.basename(path.rstrip('/')))


def strip_ids(s):
    s = re.sub(r'#\d+L?', '', s)
    s = re.sub(r'\[plan_id=\d+\]', '', s)
    s = re.sub(r'Location: PreparedDeltaFileIndex\s*\(1 paths\)\s*\[[^\n]*?(?=, PartitionFilters)', 'Location: PreparedDeltaFileIndex(1 paths)[<table folder>]', s)
    s = re.sub(r'Location: PreparedDeltaFileIndex\s*\[[^\n]*', 'Location: PreparedDeltaFileIndex [<table folder>]', s)
    s = re.sub(r'file:/[^\s,\]\)]+', '<path>', s)
    s = re.sub(r', *$', '', s, flags=re.M)
    s = re.sub(r'[ \t]+$', '', s, flags=re.M)
    return s


def explain_text(df, mode='simple'):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        df.explain(mode)
    return strip_ids(buf.getvalue()).strip()


def short_scan(text):
    """cut the long details of a file scan, and keep the operator and its columns"""
    return re.sub(r'(FileScan parquet \[[^\]]*\]) [^\n]*', r'\1 ...', text)


def scan_metrics(df):
    """run the query, then read the metrics of the file scan from the physical plan that ran"""
    df.collect()
    plan = df._jdf.queryExecution().executedPlan()
    leaves = plan.collectLeaves()
    out = []
    for i in range(leaves.size()):
        leaf = leaves.apply(i)
        ms = leaf.metrics()
        d = {}
        for k in ('numFiles', 'numPartitions', 'numOutputRows'):
            if ms.contains(k):
                d[k] = int(ms.apply(k).value())
        if d:
            out.append(d)
    return out


# ---------------------------------------------------------------------------------------------------------------------------
def main():
    spark = start_spark()
    ns = {}
    exec(MEDALLION, ns)
    to_bronze, to_silver, to_gold = ns['to_bronze'], ns['to_silver'], ns['to_gold']
    OUT['meta'].update({'pyspark': md.version('pyspark'), 'delta-spark': md.version('delta-spark'), 'spark': spark.version,
                        'java': spark.sparkContext._jvm.System.getProperty('java.version'),
                        'ansi_default': spark.conf.get('spark.sql.ansi.enabled')})
    OUT['files']['spark/medallion.py'] = MEDALLION
    OUT['files']['spark/merge.py'] = MERGE
    OUT['counts']['spark.ops'] = OPS

    # ---- bronze: the files exactly as they arrived ---------------------------------------------------------------------------
    bronze_dir = LAKE / 'bronze' / 'orders'
    bronze_dir.mkdir(parents=True)
    for name, body in BRONZE_FILES.items():
        (bronze_dir / name).write_text(body)
    OUT['files']['spark/bronze_orders_0600.csv'] = BRONZE_FILES['orders_20260314_0600.csv']
    OUT['files']['spark/bronze_orders_1200.csv'] = BRONZE_FILES['orders_20260314_1200.csv']
    bronze = to_bronze(spark, str(bronze_dir))
    OUT['tables']['spark.bronze'] = rows_of(bronze, ['source_file', 'order_id'])

    # ---- silver and quarantine -----------------------------------------------------------------------------------------------
    good, bad = to_silver(bronze)
    OUT['tables']['spark.silver'] = rows_of(good, ['order_id'])
    OUT['tables']['spark.quarantine'] = rows_of(bad, ['order_id'])
    silver_path = str(LAKE / 'silver' / 'orders')
    good.coalesce(1).write.format('delta').save(silver_path)                           # version 0
    gold_path = str(LAKE / 'gold' / 'daily_revenue')
    to_gold(spark.read.format('delta').load(silver_path)).coalesce(1).write.format('delta').save(gold_path)
    OUT['tables']['spark.gold'] = rows_of(spark.read.format('delta').load(gold_path), ['order_date', 'country'])
    OUT['counts']['spark.layers'] = {'bronze_rows': bronze.count(), 'silver_rows': good.count(), 'quarantine_rows': bad.count(),
                                     'gold_rows': spark.read.format('delta').load(gold_path).count(), 'bronze_files': len(BRONZE_FILES)}

    # ---- the transaction log -------------------------------------------------------------------------------------------------
    OUT['text']['delta.listing_v0'] = listing(silver_path, 'silver/orders')
    c0 = read_commit(silver_path, 0)
    OUT['files']['delta/00000000000000000000.json'] = pretty(c0, silver_path)
    OUT['counts']['delta.commit0'] = {'actions': [list(a.keys())[0] for a in c0]}

    # ---- a late file, and a merge --------------------------------------------------------------------------------------------
    (bronze_dir / LATE_FILE[0]).write_text(LATE_FILE[1])
    OUT['files']['spark/bronze_orders_late.csv'] = LATE_FILE[1]
    new_rows = to_silver(spark.read.option('header', True).option('sep', ';').csv(str(bronze_dir / LATE_FILE[0]))
                         .select('*', F.col('_metadata.file_name').alias('source_file')))[0]
    ns2 = {'spark': spark, 'new_rows': new_rows}
    exec(MERGE, ns2)                                                                    # version 1
    c1 = read_commit(silver_path, 1)
    OUT['files']['delta/00000000000000000001.json'] = pretty(c1, silver_path)
    OUT['counts']['delta.commit1'] = {'actions': [list(a.keys())[0] for a in c1]}
    OUT['text']['delta.listing_v1'] = listing(silver_path, 'silver/orders')

    def at(v):
        return spark.read.format('delta').option('versionAsOf', v).load(silver_path)
    OUT['tables']['delta.at_v0'] = rows_of(at(0), ['order_id'])
    OUT['tables']['delta.at_v1'] = rows_of(at(1), ['order_id'])
    OUT['counts']['delta.time_travel'] = {'v0_rows': at(0).count(), 'v1_rows': at(1).count(),
                                          'o3_v0': at(0).filter("order_id = 'O3'").first()['status'],
                                          'o3_v1': at(1).filter("order_id = 'O3'").first()['status']}

    # ---- schema enforcement ---------------------------------------------------------------------------------------------------
    extra = spark.sql("SELECT 'O8' AS order_id, 'COMPLETED' AS status, CAST(6.40 AS DECIMAL(10,2)) AS total_eur, "
                      "TIMESTAMP'2026-03-16 11:15:00' AS placed_at, DATE'2026-03-16' AS order_date, 'FR' AS country, "
                      "'orders_20260316_0600.csv' AS source_file, 'app' AS channel")
    try:
        extra.write.format('delta').mode('append').save(silver_path)
        refused = None
    except Exception as e:
        refused = str(e)
    if refused is None:
        raise SystemExit('the append with an extra column was not refused')
    OUT['text']['delta.schema_error'] = re.sub(r'\(Table ID: [^)]*\)', '(Table ID: <table-id>)', strip_ids(refused)).strip()
    cols_before = spark.read.format('delta').load(silver_path).columns
    extra.write.format('delta').mode('append').option('mergeSchema', 'true').save(silver_path)   # version 2
    OUT['counts']['delta.schema'] = {'before': cols_before, 'after': spark.read.format('delta').load(silver_path).columns,
                                     'error_class': (re.search(r'\[([A-Z_0-9]+)\]', refused) or [None, None])[1]}

    hist = spark.sql(OPS['history'].format(path=silver_path)).orderBy('version').collect()
    hrows = []
    for h in hist:
        m = h['operationMetrics']
        hrows.append([str(h['version']), h['operation'], h['operationParameters'].get('mode', ''), ', '.join('%s %s' % (k, m[k]) for k in (
            'numOutputRows', 'numFiles', 'numTargetRowsInserted', 'numTargetRowsUpdated', 'numTargetFilesAdded', 'numTargetFilesRemoved') if k in m)])
    OUT['tables']['delta.history'] = {'cols': ['version', 'operation', 'mode', 'metrics'], 'rows': hrows}

    # ---- small files, OPTIMIZE and VACUUM -------------------------------------------------------------------------------------
    clicks = str(LAKE / 'bronze' / 'clicks_demo')
    (spark.range(2000).withColumn('page', F.concat(F.lit('/p'), (F.col('id') % 7).cast('string')))
         .repartition(20).write.format('delta').save(clicks))
    det0 = spark.sql(OPS['detail'].format(path=clicks)).first()
    opt = spark.sql(OPS['optimize'].format(path=clicks)).first()
    met = opt['metrics']
    det1 = spark.sql(OPS['detail'].format(path=clicks)).first()
    on_disk = len([n for n in files_under(clicks) if n.endswith('.parquet')])
    OUT['counts']['delta.optimize'] = {'files_before': det0['numFiles'], 'files_after': det1['numFiles'], 'removed': met['numFilesRemoved'],
                                       'added': met['numFilesAdded'], 'parquet_files_on_disk_after': on_disk, 'rows': 2000}
    try:
        spark.sql(OPS['vacuum_short'].format(path=clicks)).collect()
        short = None
    except Exception as e:
        short = str(e)
    if short is None:
        raise SystemExit('vacuum with a short retention was not refused')
    OUT['text']['delta.vacuum_error'] = strip_ids(short).strip()
    spark.conf.set('spark.databricks.delta.retentionDurationCheck.enabled', 'false')
    dry = spark.sql(OPS['vacuum_dry'].format(path=clicks)).collect()
    spark.conf.set('spark.databricks.delta.retentionDurationCheck.enabled', 'true')
    OUT['counts']['delta.vacuum'] = {'dry_run_files': len(re.findall(r'\.parquet', dry[0][0] if len(dry) == 1 else ' '.join(str(r[0]) for r in dry))) if dry else 0,
                                     'default_retention_hours': 168}

    # ---- a cast that fails in Spark 4 ------------------------------------------------------------------------------------------
    messy = spark.createDataFrame([('O1', '10.50'), ('O4', 'n/a')], ['order_id', 'total'])
    spark.conf.set('spark.sql.ansi.enabled', 'true')
    try:
        messy.select(F.col('total').cast('decimal(10,2)')).collect()
        err = None
    except Exception as e:
        err = str(e)
    if err is None:
        raise SystemExit('the cast did not fail with ANSI mode on')
    OUT['text']['spark.ansi_error'] = strip_ids(err).split('\n== DataFrame ==')[0].strip()
    ok_try = [val(r[0]) for r in messy.select(F.expr('try_cast(total as decimal(10,2))')).collect()]
    spark.conf.set('spark.sql.ansi.enabled', 'false')
    ok_off = [val(r[0]) for r in messy.select(F.col('total').cast('decimal(10,2)')).collect()]
    spark.conf.set('spark.sql.ansi.enabled', 'true')
    OUT['counts']['spark.ansi'] = {'default_in_this_version': OUT['meta']['ansi_default'], 'try_cast': ok_try, 'cast_with_ansi_off': ok_off}

    # ---- plans: a filter on a partitioned table, and two joins -----------------------------------------------------------------
    by_day = str(LAKE / 'silver' / 'orders_by_day')
    (spark.read.format('delta').load(silver_path).select('order_id', 'status', 'total_eur', 'order_date', 'country')
        .write.format('delta').partitionBy('order_date').save(by_day))
    pruned = spark.read.format('delta').load(by_day).filter("order_date = '2026-03-15'").select('order_id', 'total_eur')
    allday = spark.read.format('delta').load(by_day).select('order_id', 'total_eur')
    OUT['text']['spark.plan_prune'] = explain_text(pruned, 'formatted')
    OUT['text']['delta.listing_by_day'] = listing(by_day, 'silver/orders_by_day')
    OUT['counts']['spark.prune'] = {'partitions_in_table': len(list(pathlib.Path(by_day).glob('order_date=*'))),
                                    'scan_with_filter': scan_metrics(pruned), 'scan_without_filter': scan_metrics(allday)}
    orders = spark.read.format('delta').load(silver_path)
    countries = spark.createDataFrame([('NL', 'Netherlands'), ('DE', 'Germany'), ('FR', 'France')], ['country', 'country_name'])
    j = orders.join(countries, 'country').select('order_id', 'country_name')
    OUT['text']['spark.plan_join_default'] = short_scan(explain_text(j))
    spark.conf.set('spark.sql.autoBroadcastJoinThreshold', '-1')
    OUT['text']['spark.plan_join_no_broadcast'] = short_scan(explain_text(orders.join(countries, 'country').select('order_id', 'country_name')))
    spark.conf.set('spark.sql.autoBroadcastJoinThreshold', '10485760')
    OUT['counts']['spark.join'] = {'broadcast_default_bytes': 10485760}

    spark.stop()
    print(json.dumps(OUT, sort_keys=True))


if __name__ == '__main__':
    main()
