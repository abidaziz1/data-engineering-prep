"""Mission 3: partitions, tasks and shuffles. Counts come from the event log, which is what the Spark UI is drawn from."""
from pyspark.sql import functions as F

import session as S


def read_partitions(spark, path, sizes):
    """How many partitions Spark makes when it reads the orders, for different values of maxPartitionBytes."""
    out = []
    for label, b in sizes:
        spark.conf.set('spark.sql.files.maxPartitionBytes', str(b))
        out.append((label, spark.read.parquet(path).rdd.getNumPartitions()))
    spark.conf.unset('spark.sql.files.maxPartitionBytes')
    return out


def partition_sizes(df):
    """Rows in each partition, by partition number."""
    rows = df.groupBy(F.spark_partition_id().alias('p')).count().orderBy('p').collect()
    return [r['count'] for r in rows]


def repartition_demo(spark, path):
    """repartition shuffles to even sizes. coalesce only merges neighbours and does not shuffle, so sizes can stay uneven."""
    o = spark.read.parquet(path).repartition(14, 'dt')
    return {'start': partition_sizes(o), 'coalesce_3': partition_sizes(o.coalesce(3)), 'repartition_3': partition_sizes(o.repartition(3)),
            'plan_coalesce': S.plan_text(o.coalesce(3), 'simple'), 'plan_repartition': S.plan_text(o.repartition(3), 'simple'),
            'plan_repartition_by': S.plan_text(o.repartition(6, 'store_id'), 'simple')}


def operations(spark, path, stores):
    """What each kind of operation costs in stages and in shuffles (Exchange nodes in the physical plan)."""
    o = spark.read.parquet(path)
    s = spark.read.parquet(stores)
    spark.conf.set('spark.sql.adaptive.enabled', 'false')
    spark.conf.set('spark.sql.autoBroadcastJoinThreshold', '-1')
    cases = [('filter and select', o.filter('status = "PAID"').select('store_id', 'total_cents')),
             ('groupBy and sum', o.groupBy('store_id').agg(F.sum('total_cents'))),
             ('distinct customers', o.select('customer_id').distinct()),
             ('orderBy', o.orderBy('order_ts')),
             ('join to stores (no broadcast)', o.join(s, 'store_id')),
             ('window by store', o.withColumn('r', F.row_number().over(__import__('pyspark.sql.window', fromlist=['Window']).Window.partitionBy('store_id').orderBy('order_ts'))))]
    out = []
    for label, df in cases:
        plan = S.plan_text(df, 'simple')
        out.append((label, plan.count('Exchange'), plan.count('Sort ')))
    spark.conf.unset('spark.sql.adaptive.enabled')
    spark.conf.unset('spark.sql.autoBroadcastJoinThreshold')
    return out


def shuffle_settings(run, path):
    """The same aggregation with 200 shuffle partitions, with 8, and with adaptive execution on. The stage after the shuffle shows how many tasks it ran."""
    spark = run.spark
    results = []
    for label, parts, aqe in (('200 partitions, adaptive off', 200, 'false'), ('8 partitions, adaptive off', 8, 'false'), ('200 partitions, adaptive on', 200, 'true')):
        spark.conf.set('spark.sql.shuffle.partitions', str(parts))
        spark.conf.set('spark.sql.adaptive.enabled', aqe)
        spark.sparkContext.setJobGroup(label, label)
        spark.read.parquet(path).groupBy('store_id').agg(F.sum('total_cents')).collect()
        results.append(label)
    spark.conf.set('spark.sql.shuffle.partitions', '8')
    spark.conf.set('spark.sql.adaptive.enabled', 'true')
    return results
