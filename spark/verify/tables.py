"""Mission 11: what a table format adds to Parquet files. Delta Lake (delta-spark 4.0.1) runs here for real. Iceberg and Hudi were not run."""
import glob
import json
import os

from pyspark.sql import functions as F


def delta_session_conf():
    return {'spark__jars__packages': 'io.delta:delta-spark_2.13:4.0.1', 'spark__sql__extensions': 'io.delta.sql.DeltaSparkSessionExtension',
            'spark__sql__catalog__spark_catalog': 'org.apache.spark.sql.delta.catalog.DeltaCatalog'}


def log_names(table):
    """The files of the transaction log, without the checksum files."""
    return sorted(f for f in os.listdir(os.path.join(table, '_delta_log')) if f.endswith('.json'))


def parquet_count(table):
    return len([f for f in os.listdir(table) if f.endswith('.parquet')])


def build(spark, paths, table):
    """Commit 0: create the table from the PAID orders of three days."""
    o = spark.read.parquet(paths['orders']).filter("status = 'PAID' AND dt <= '2026-11-03'").select('order_id', 'store_id', 'status', 'total_cents', 'dt')
    o.repartition(6).write.format('delta').mode('overwrite').save(table)
    return o.count()


def merge(spark, table):
    """Commit 1: a MERGE that updates changed totals, deletes refunded orders and inserts new ones, and the numbers that Delta reports for it."""
    from delta.tables import DeltaTable
    t = DeltaTable.forPath(spark, table)
    changes = (spark.range(0, 3000).select((F.col('id') * 7 + 1).alias('order_id'), F.lit('s01').alias('store_id'), F.when(F.col('id') % 3 == 0, 'REFUNDED').otherwise('PAID').alias('status'),
                                           (F.lit(999)).alias('total_cents'), F.lit('2026-11-03').cast('date').alias('dt')))
    changes = changes.union(spark.range(0, 100).select((F.col('id') + 9_000_001).alias('order_id'), F.lit('s02').alias('store_id'), F.lit('PAID').alias('status'),
                                                      F.lit(500).alias('total_cents'), F.lit('2026-11-03').cast('date').alias('dt')))
    (t.alias('t').merge(changes.alias('c'), 't.order_id = c.order_id')
     .whenMatchedDelete(condition="c.status = 'REFUNDED'").whenMatchedUpdate(set={'total_cents': 'c.total_cents'}).whenNotMatchedInsertAll().execute())
    metrics = spark.sql('DESCRIBE HISTORY delta.`%s` LIMIT 1' % table).select('operationMetrics').collect()[0][0]
    return {k: int(v) for k, v in metrics.items() if k in ('numTargetRowsInserted', 'numTargetRowsUpdated', 'numTargetRowsDeleted', 'numSourceRows', 'numOutputRows')}


def history(spark, table):
    return [(r['version'], r['operation']) for r in spark.sql('DESCRIBE HISTORY delta.`%s`' % table).select('version', 'operation').orderBy('version').collect()]


def time_travel(spark, table):
    return {'version 0': spark.read.format('delta').option('versionAsOf', 0).load(table).count(), 'latest': spark.read.format('delta').load(table).count()}


def schema_enforcement(spark, table):
    """An append with a column that the table does not have is refused. mergeSchema lets it through."""
    from datetime import date
    extra = spark.createDataFrame([(1, 's01', 'PAID', 100, date(2026, 11, 1), 'app')], 'order_id long, store_id string, status string, total_cents int, dt date, channel string')
    try:
        extra.write.format('delta').mode('append').save(table)
        return None
    except Exception as e:  # noqa: BLE001
        lines = [l.strip() for l in str(e).split('\n') if l.strip()]
        return [l for l in lines if 'schema mismatch' in l.lower() or 'DELTA_' in l][0][:200]


def files(spark, table):
    detail = spark.sql('DESCRIBE DETAIL delta.`%s`' % table).collect()[0]
    return parquet_count(table), detail['numFiles']


def small_files(spark, base):
    """Twenty small appends make twenty small files. OPTIMIZE rewrites them as one file, and the old files stay on disk until VACUUM. VACUUM refuses a retention of zero hours
    unless the check is turned off, and after it ran the old version cannot be read any more."""
    table = os.path.join(base, 'delta-small')
    for i in range(20):
        spark.range(i * 500, (i + 1) * 500).select('id', (F.col('id') % 12).alias('store')).coalesce(1).write.format('delta').mode('append').save(table)
    out = {'appends': 20}
    out['files_on_disk_before'], out['files_in_the_version_before'] = files(spark, table)
    out['version_before_optimize'] = spark.sql('DESCRIBE HISTORY delta.`%s`' % table).agg(F.max('version')).collect()[0][0]
    spark.sql('OPTIMIZE delta.`%s`' % table)
    out['files_on_disk_after_optimize'], out['files_in_the_version_after_optimize'] = files(spark, table)
    try:
        spark.sql('VACUUM delta.`%s` RETAIN 0 HOURS' % table)
        out['vacuum_zero_hours'] = 'accepted'
    except Exception as e:  # noqa: BLE001
        out['vacuum_zero_hours'] = [l.strip() for l in str(e).split('\n') if 'Are you sure' in l][0][:150]
    spark.conf.set('spark.databricks.delta.retentionDurationCheck.enabled', 'false')
    spark.sql('VACUUM delta.`%s` RETAIN 0 HOURS' % table)
    spark.conf.set('spark.databricks.delta.retentionDurationCheck.enabled', 'true')
    out['files_on_disk_after_vacuum'], out['files_in_the_version_after_vacuum'] = files(spark, table)
    out['rows_now'] = spark.read.format('delta').load(table).count()
    try:
        spark.read.format('delta').option('versionAsOf', out['version_before_optimize']).load(table).agg(F.sum('id')).collect()      # count(*) alone can be answered from the log
        out['old_version_after_vacuum'] = 'still readable'
    except Exception as e:  # noqa: BLE001
        lines = [l.strip() for l in str(e).split('\n') if l.strip()]
        out['old_version_after_vacuum'] = [l for l in lines if 'FileNotFound' in l or 'does not exist' in l or 'DELTA_' in l or 'No such file' in l][0][:200]
    return out


def log_peek(table):
    """What the first commit file records, reduced to the kinds of action that it holds."""
    kinds = {}
    f = os.path.join(table, '_delta_log', '00000000000000000000.json')
    for line in open(f):
        k = list(json.loads(line))[0]
        kinds[k] = kinds.get(k, 0) + 1
    return kinds
