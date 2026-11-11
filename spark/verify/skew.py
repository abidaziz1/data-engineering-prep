"""Mission 5: skew, adaptive execution and salting. The numbers are the records that each task of a stage read, taken from the event log."""
from pyspark.sql import Window
from pyspark.sql import functions as F

import session as S


def hot_partition(run, path):
    """A window over each store: every row of a store must reach one task, and nothing can be added up first, so the hot store makes a hot task."""
    spark = run.spark
    spark.conf.set('spark.sql.adaptive.enabled', 'false')
    spark.conf.set('spark.sql.shuffle.partitions', '12')
    spark.sparkContext.setJobGroup('window-by-store', 'window by store')
    w = Window.partitionBy('store_id')
    spark.read.parquet(path).withColumn('store_total', F.sum('total_cents').over(w)).agg(F.sum('store_total')).collect()
    spark.conf.set('spark.sql.adaptive.enabled', 'true')
    spark.conf.set('spark.sql.shuffle.partitions', '8')


def counting_is_safe(run, path):
    """A plain count by store shuffles one small row for each store and each map task, because Spark adds up inside each task first. The hot store does no harm."""
    spark = run.spark
    spark.conf.set('spark.sql.adaptive.enabled', 'false')
    spark.conf.set('spark.sql.shuffle.partitions', '12')
    spark.sparkContext.setJobGroup('count-by-store', 'count by store')
    spark.read.parquet(path).groupBy('store_id').count().collect()
    spark.conf.set('spark.sql.adaptive.enabled', 'true')
    spark.conf.set('spark.sql.shuffle.partitions', '8')


def lowered_settings(spark, skew_join):
    """The limits are lowered so that 400,000 rows behave the way that 400 million would: a partition is skewed when it is 3 times the median and over 200 KB."""
    spark.conf.set('spark.sql.autoBroadcastJoinThreshold', '-1')
    spark.conf.set('spark.sql.adaptive.autoBroadcastJoinThreshold', '-1')
    spark.conf.set('spark.sql.shuffle.partitions', '12')
    spark.conf.set('spark.sql.adaptive.enabled', 'true')
    spark.conf.set('spark.sql.adaptive.coalescePartitions.enabled', 'false')
    spark.conf.set('spark.sql.adaptive.skewJoin.enabled', 'true' if skew_join else 'false')
    spark.conf.set('spark.sql.adaptive.skewJoin.skewedPartitionFactor', '3')
    spark.conf.set('spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes', '200k')
    spark.conf.set('spark.sql.adaptive.advisoryPartitionSizeInBytes', '300k')


def reset(spark):
    for k in ('spark.sql.autoBroadcastJoinThreshold', 'spark.sql.adaptive.autoBroadcastJoinThreshold', 'spark.sql.adaptive.coalescePartitions.enabled', 'spark.sql.adaptive.skewJoin.enabled',
              'spark.sql.adaptive.skewJoin.skewedPartitionFactor', 'spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes', 'spark.sql.adaptive.advisoryPartitionSizeInBytes'):
        spark.conf.unset(k)
    spark.conf.set('spark.sql.shuffle.partitions', '8')


def join_three_ways(run, paths):
    """The orders joined to the stores, with broadcast switched off so that both sides are shuffled by store. Plain, with the adaptive skew join, and with a salt."""
    spark = run.spark
    o, s = spark.read.parquet(paths['orders']), spark.read.parquet(paths['stores'])
    plans = {}
    for mode in ('plain', 'adaptive', 'salted'):
        lowered_settings(spark, skew_join=(mode == 'adaptive'))
        spark.sparkContext.setJobGroup('join-' + mode, 'join ' + mode)
        if mode == 'salted':
            k = 4
            left = o.withColumn('salt', (F.abs(F.xxhash64('order_id')) % k).cast('int'))
            right = s.withColumn('salt', F.explode(F.array(*[F.lit(i) for i in range(k)])))
            q = left.join(right, ['store_id', 'salt'])
        else:
            q = o.join(s, 'store_id')
        n = len(q.collect())
        plans[mode] = (n, S.plan_text(q, 'simple'))
        reset(spark)
    return plans
