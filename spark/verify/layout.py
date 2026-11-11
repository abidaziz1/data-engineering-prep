"""Mission 7: files and layout. File counts and sizes are measured on disk, and the bytes a query reads are taken from the event log."""
import glob
import os

from pyspark.sql import functions as F


def parquet_files(path):
    return sorted(glob.glob(os.path.join(path, '**', '*.parquet'), recursive=True))


def size_kb(path):
    """Total size of the Parquet files under path, rounded to 10 KB, because the exact size changes by a few hundred bytes between runs."""
    return int(round(sum(os.path.getsize(f) for f in parquet_files(path)) / 1024, -1))


def write_variants(spark, paths, out):
    """The same 400,000 orders written six ways. The number of files is the number of tasks that wrote, times the number of folders that each task wrote to."""
    o = spark.read.parquet(paths['orders']).drop('dt').withColumn('dt', F.to_date('order_ts'))
    cases = [
        ('one task: coalesce(1)', lambda w: o.coalesce(1).write),
        ('200 tasks: repartition(200)', lambda w: o.repartition(200).write),
        ('folder for each day, 200 tasks after a shuffle', lambda w: o.repartition(200).write.partitionBy('dt')),
        ('folder for each day, no shuffle', lambda w: o.write.partitionBy('dt')),
        ('folder for each day, repartition by day', lambda w: o.repartition(14, 'dt').write.partitionBy('dt')),
        ('folder for each store and day, no repartition', lambda w: o.write.partitionBy('store_id', 'dt')),
        ('at most 50,000 rows in a file', lambda w: o.coalesce(1).write.option('maxRecordsPerFile', 50000)),
    ]
    rows = []
    for i, (label, make) in enumerate(cases):
        target = os.path.join(out, 'variant-%d' % i)
        make(None).mode('overwrite').parquet(target)
        n = len(parquet_files(target))
        kb = size_kb(target)
        rows.append((label, n, kb, round(kb / n, 1)))
    return rows


def files_touched(spark, path, condition):
    """How many files a query opens, counted with input_file_name()."""
    return spark.read.parquet(path).filter(condition).select(F.input_file_name().alias('f')).distinct().count()


def codecs(spark, paths, out):
    o = spark.read.parquet(paths['orders']).drop('dt').coalesce(2)
    rows = []
    for c in ('none', 'snappy', 'gzip', 'zstd'):
        target = os.path.join(out, 'codec-' + c)
        o.write.option('compression', c).mode('overwrite').parquet(target)
        rows.append((c, size_kb(target)))
    return rows


def row_group_skipping(run, paths, out):
    """Files written with small row groups, sorted or not. A filter on the sorted column skips row groups, and the bytes read show it."""
    spark = run.spark
    o = spark.read.parquet(paths['orders']).drop('dt').select('order_id', 'store_id', 'status', 'total_cents', 'order_ts')
    for label, df in (('sorted', o.orderBy('order_id')), ('shuffled', o.orderBy(F.xxhash64('order_id')))):
        df.coalesce(1).write.option('parquet.block.size', 262144).mode('overwrite').parquet(os.path.join(out, 'rg-' + label))
    for label in ('sorted', 'shuffled'):
        for push in ('true', 'false'):
            spark.conf.set('spark.sql.parquet.filterPushdown', push)
            group = 'rg-%s-%s' % (label, push)
            spark.sparkContext.setJobGroup(group, group)
            spark.read.parquet(os.path.join(out, 'rg-' + label)).filter('order_id BETWEEN 1000 AND 1999').agg(F.sum('total_cents')).collect()
    spark.conf.unset('spark.sql.parquet.filterPushdown')
    spark.sparkContext.setJobGroup('', '')


def schema_evolution(spark, out):
    """Two batches with different columns. By default Spark reads the schema from one file, so the new column can be missing."""
    a = spark.createDataFrame([(1, 1200), (2, 900)], 'order_id long, total_cents int')
    b = spark.createDataFrame([(3, 1500, 'app'), (4, 700, 'pos')], 'order_id long, total_cents int, channel string')
    a.write.mode('overwrite').parquet(os.path.join(out, 'evo', 'batch=1'))
    b.write.mode('overwrite').parquet(os.path.join(out, 'evo', 'batch=2'))
    plain = spark.read.parquet(os.path.join(out, 'evo'))
    merged = spark.read.option('mergeSchema', 'true').parquet(os.path.join(out, 'evo'))
    return plain.columns, merged.columns, merged.orderBy('order_id').collect()


def bucketing(spark, paths):
    """A join of two tables that were both bucketed by customer on write needs no exchange. Without buckets it shuffles both sides."""
    from session import norm  # noqa: F401  (plans are normalised by the caller)
    o = spark.read.parquet(paths['orders']).drop('dt')
    c = spark.read.parquet(paths['customers'])
    spark.conf.set('spark.sql.autoBroadcastJoinThreshold', '-1')
    spark.conf.set('spark.sql.adaptive.enabled', 'false')
    o.write.bucketBy(8, 'customer_id').sortBy('customer_id').mode('overwrite').saveAsTable('orders_bucketed')
    c.write.bucketBy(8, 'customer_id').sortBy('customer_id').mode('overwrite').saveAsTable('customers_bucketed')
    plain = o.join(c, 'customer_id')
    bucketed = spark.table('orders_bucketed').join(spark.table('customers_bucketed'), 'customer_id')
    from session import plan_text
    out = {'without buckets': plan_text(plain, 'simple').count('Exchange'), 'bucketed on customer_id': plan_text(bucketed, 'simple').count('Exchange'),
           'bucketed plan': plan_text(bucketed, 'simple')}
    spark.conf.unset('spark.sql.autoBroadcastJoinThreshold')
    spark.conf.unset('spark.sql.adaptive.enabled')
    return out
