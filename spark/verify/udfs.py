"""Mission 9: Python UDFs, pandas UDFs and the built-in functions. Plans and counts are real. Nothing is timed, because times are not stable."""
import pandas as pd
from pyspark import StorageLevel  # noqa: F401
from pyspark.sql import functions as F
from pyspark.sql.functions import pandas_udf, udf
from pyspark.sql.types import IntegerType, StringType

import session as S


def label_python(status):
    return {'PAID': 'ok', 'REFUNDED': 'check'}.get(status, 'other')


@pandas_udf(StringType())
def label_pandas(status: pd.Series) -> pd.Series:
    return status.map({'PAID': 'ok', 'REFUNDED': 'check'}).fillna('other')


def plans(spark, path):
    """The same label computed three ways. Only the node that runs the function differs."""
    o = spark.read.parquet(path).select('order_id', 'status')
    builtin = o.withColumn('label', F.when(F.col('status') == 'PAID', 'ok').when(F.col('status') == 'REFUNDED', 'check').otherwise('other'))
    py = o.withColumn('label', udf(label_python, StringType())('status'))
    pd_ = o.withColumn('label', label_pandas('status'))
    arrow = o.withColumn('label', udf(label_python, StringType(), useArrow=True)('status'))
    return {k: S.plan_text(v, 'simple') for k, v in (('built-in functions', builtin), ('Python UDF', py), ('pandas UDF', pd_), ('Python UDF with Arrow', arrow))}


def same_answers(spark, path):
    """The three versions agree. A UDF is not wrong, only more expensive, and it hides the logic from the optimizer."""
    o = spark.read.parquet(path).select('status')
    a = o.withColumn('label', F.when(F.col('status') == 'PAID', 'ok').when(F.col('status') == 'REFUNDED', 'check').otherwise('other')).groupBy('label').count().orderBy('label').collect()
    b = o.withColumn('label', udf(label_python, StringType())('status')).groupBy('label').count().orderBy('label').collect()
    c = o.withColumn('label', label_pandas('status')).groupBy('label').count().orderBy('label').collect()
    return [(r['label'], r['count']) for r in a], a == b == c


def wrong_return_type(spark):
    """A UDF that is declared to return an integer and returns a string does not fail: it returns NULL for every row."""
    bad = udf(lambda s: s.upper(), IntegerType())
    df = spark.createDataFrame([('paid',), ('new',)], 'status string').withColumn('v', bad('status'))
    return [list(r) for r in df.collect()]


def null_handling(spark):
    """A UDF is called with None for a NULL. Written without a check, it fails for the first guest order."""
    f = udf(lambda s: len(s), IntegerType())
    df = spark.createDataFrame([('c00001',), (None,)], 'customer_id string')
    try:
        df.withColumn('n', f('customer_id')).collect()
        return 'no error'
    except Exception as e:  # noqa: BLE001
        text = str(e)
        return [l.strip() for l in text.splitlines() if 'TypeError' in l][:1] or [text[:150]]


def runs_more_than_once(spark, path, tally):
    """Each call of the function appends one byte to a file, which counts the calls from outside Spark. A non-deterministic function is not allowed to be run
    more often than the rows need, and a deterministic one may be."""
    import os

    def counted(x):
        with open(tally, 'ab') as f:
            f.write(b'x')
        return x * 2

    def calls():
        return os.path.getsize(tally) if os.path.exists(tally) else 0

    o = spark.read.parquet(path).select('total_cents').limit(1000)
    out = {'rows': 1000}
    for label, det in (('deterministic', True), ('non-deterministic', False)):
        for shape, build in (('result used once', lambda d: d.select('d')),
                             ('result used twice', lambda d: d.select('d', (F.col('d') + 1).alias('d1'))),
                             ('result filtered, then used twice', lambda d: d.filter(F.col('d') > 1000).select('d', (F.col('d') + 1).alias('d1')))):
            f = udf(counted, IntegerType())
            if not det:
                f = f.asNondeterministic()
            before = calls()
            build(o.withColumn('d', f('total_cents'))).collect()
            out['%s, %s' % (label, shape)] = calls() - before
    return out


def arrow_batches(spark, path, tally):
    """A pandas UDF is called once for each batch of rows (10,000 by default), not once for each row."""
    import os

    @pandas_udf(IntegerType())
    def batch_counter(x: pd.Series) -> pd.Series:
        with open(tally, 'ab') as f:
            f.write(b'x')
        return x

    if os.path.exists(tally):
        os.remove(tally)
    spark.read.parquet(path).select(batch_counter('total_cents').alias('v')).agg(F.sum('v')).collect()
    return {'rows': 400000, 'maxRecordsPerBatch': int(spark.conf.get('spark.sql.execution.arrow.maxRecordsPerBatch')), 'calls': os.path.getsize(tally)}
