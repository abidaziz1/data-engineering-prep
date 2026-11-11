"""Mission 14: failures that really happen, with the messages that Spark really gives. Each function triggers one failure and returns the first lines of the message."""
import os

from pyspark.sql import functions as F
from pyspark.sql.functions import udf
from pyspark.sql.types import IntegerType


def lines_of(e):
    return [l.strip() for l in str(e).split('\n') if l.strip()]


def head(e, n=1, width=240):
    return [l[:width] for l in lines_of(e)][:n]


def pick(e, *needles, width=300):
    """The first line of the message that holds one of the needles. Spark and Py4J wrap the real message in a generic first line."""
    for l in lines_of(e):
        if any(x in l for x in needles):
            return l[:width]
    return head(e, 1, width)[0]


def unresolved_column(spark, path):
    try:
        spark.read.parquet(path).select('total_cent').collect()
    except Exception as e:  # noqa: BLE001
        return [pick(e, 'UNRESOLVED_COLUMN', width=300)]


def result_too_big(run, path):
    """collect() brings every row to the driver. With a small spark.driver.maxResultSize the job is stopped before the driver runs out of memory."""
    spark = run.spark
    try:
        spark.read.parquet(path).collect()
    except Exception as e:  # noqa: BLE001
        return [pick(e, 'maxResultSize', width=330)]


def python_error_in_udf(spark):
    f = udf(lambda x: 10 // x, IntegerType())
    try:
        spark.createDataFrame([(5,), (0,)], 'x int').select(f('x')).collect()
    except Exception as e:  # noqa: BLE001
        return [pick(e, 'ZeroDivisionError')]


def type_mismatch_on_read(spark, out):
    """Two files of one dataset disagree on a type: one has order_id as a number and one as text."""
    a = spark.createDataFrame([(1, 100)], 'order_id long, total_cents int')
    b = spark.createDataFrame([('2', 200)], 'order_id string, total_cents int')
    a.write.mode('overwrite').parquet(os.path.join(out, 'mix', 'a'))
    b.write.mode('overwrite').parquet(os.path.join(out, 'mix', 'b'))
    try:
        spark.read.schema('order_id long, total_cents int').parquet(os.path.join(out, 'mix', 'a'), os.path.join(out, 'mix', 'b')).collect()
    except Exception as e:  # noqa: BLE001
        return [pick(e, 'FAILED_READ_FILE', 'cannot be converted', width=330)]


def corrupt_file(spark, out):
    """One file in the folder is not Parquet. By default the read fails. With ignoreCorruptFiles it is skipped, silently."""
    path = os.path.join(out, 'corrupt')
    spark.createDataFrame([(i, 100 + i) for i in range(1000)], 'order_id long, total_cents int').coalesce(2).write.mode('overwrite').parquet(path)
    with open(os.path.join(path, 'part-99999-garbage.snappy.parquet'), 'wb') as f:
        f.write(b'this is not a parquet file')
    res = {}
    try:
        res['default'] = spark.read.parquet(path).count()
    except Exception as e:  # noqa: BLE001
        res['default'] = pick(e, 'Parquet', 'footer', 'corrupt', width=240)
    spark.conf.set('spark.sql.files.ignoreCorruptFiles', 'true')
    res['ignoreCorruptFiles=true'] = spark.read.parquet(path).count()
    spark.conf.unset('spark.sql.files.ignoreCorruptFiles')
    return res


def flaky_task(run, marker_dir):
    """A task that fails on its first attempt and works on the second. With spark.task.maxFailures at 4 (the cluster default) Spark runs it again and the job succeeds.
    In local mode the default is 1, so the same job fails, unless the master is written local[2,4]. Returns the first line of the error, or None when the job succeeded."""
    spark = run.spark
    if os.path.exists(marker_dir):
        for f in os.listdir(marker_dir):
            os.remove(os.path.join(marker_dir, f))
    os.makedirs(marker_dir, exist_ok=True)

    def flaky(x):
        marker = os.path.join(marker_dir, 'tried-once')
        if not os.path.exists(marker):
            open(marker, 'w').close()
            raise RuntimeError('the first attempt fails')
        return x

    f = udf(flaky, IntegerType())
    spark.sparkContext.setJobGroup('flaky', 'flaky task')
    try:
        spark.range(0, 100, 1, 1).select(f(F.col('id').cast('int'))).collect()
        return None
    except Exception as e:  # noqa: BLE001
        return [pick(e, 'RuntimeError: ')]
