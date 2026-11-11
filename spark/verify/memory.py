"""Mission 6: memory, caching and spill. Sizes come from the running JVM and from the event log. A forced spill is labelled as forced."""
from pyspark.sql import functions as F

import session as S

RESERVED = 300 * 1024 * 1024


def jvm_memory(spark):
    """What the JVM was given, and what Spark's memory manager reports it can hold for storage: (max heap, reported storage maximum)."""
    sc = spark.sparkContext
    heap = sc._jvm.java.lang.Runtime.getRuntime().maxMemory()
    status = sc._jsc.sc().getExecutorMemoryStatus()
    reported = int(status.values().head()._1())
    return heap, reported


def formula(heap, fraction=0.6):
    """The documented rule: Spark keeps 300 MiB for itself, and shares fraction of the rest between execution and storage."""
    return int((heap - RESERVED) * fraction)


def cache_demo(spark, path):
    """cache() does nothing until an action runs. After that the data sits in memory, and the next query does not read the files."""
    sc = spark.sparkContext
    df = spark.read.parquet(path).filter("status = 'PAID'")
    df.cache()
    sc.setJobGroup('before-cache-action', 'before')
    plan_before = S.plan_text(df, 'simple')
    sc.setJobGroup('first-count', 'first count')
    df.count()
    sc.setJobGroup('second-count', 'second count')
    df.count()
    sc.setJobGroup('', '')
    info = [(i.storageLevel().description(), i.numCachedPartitions(), i.memSize(), i.diskSize()) for i in sc._jsc.sc().getRDDStorageInfo()]
    plan_after = S.plan_text(df.groupBy('store_id').count(), 'simple')
    df.unpersist(True)
    left = len(sc._jsc.sc().getRDDStorageInfo())
    return plan_before, plan_after, info, left


def storage_levels(spark, path):
    """The same data held three ways. The size depends on the level: columnar and compressed in memory, or on disk."""
    from pyspark import StorageLevel
    sc = spark.sparkContext
    out = []
    for name, level in (('MEMORY_ONLY', StorageLevel.MEMORY_ONLY), ('MEMORY_AND_DISK', StorageLevel.MEMORY_AND_DISK), ('DISK_ONLY', StorageLevel.DISK_ONLY)):
        df = spark.read.parquet(path).select('order_id', 'store_id', 'total_cents', 'status')
        df.persist(level)
        sc.setJobGroup('', '')
        df.count()
        info = [i for i in sc._jsc.sc().getRDDStorageInfo()]
        out.append((name, sum(i.memSize() for i in info), sum(i.diskSize() for i in info)))
        df.unpersist(True)
    return out


def forced_spill(run, path):
    """A sort in a session that was started with spark.shuffle.spill.numElementsForceSpillThreshold=20000, which forces a spill after 20,000 rows held in memory.
    That setting is read when the session starts, so the caller starts the session with it. The numbers come from the task metrics of the event log."""
    spark = run.spark
    spark.conf.set('spark.sql.adaptive.enabled', 'false')
    spark.conf.set('spark.sql.shuffle.partitions', '4')
    spark.sparkContext.setJobGroup('sort-with-spill', 'sort')
    spark.read.parquet(path).orderBy('total_cents', 'order_id').write.format('noop').mode('overwrite').save()
    spark.conf.set('spark.sql.adaptive.enabled', 'true')
    spark.conf.set('spark.sql.shuffle.partitions', '8')
