"""Mission 2: lazy evaluation and the plans that Spark builds. Every function runs real Spark and returns facts that the lessons quote."""
from pyspark.sql import functions as F

import session as S


def count_jobs(spark, steps):
    """Run each (label, function) in its own job group and count the jobs that it started. A transformation starts none, an action starts at least one."""
    sc = spark.sparkContext
    out = []
    for i, (label, fn) in enumerate(steps):
        group = 'step-%d' % i
        sc.setJobGroup(group, label)
        fn()
        out.append((label, len(sc.statusTracker().getJobIdsForGroup(group))))
    sc.setJobGroup('', '')
    return out


def lazy_steps(spark, path):
    """A pipeline written one line at a time. Nothing reads data until an action is called."""
    state = {}

    def read():
        state['o'] = spark.read.parquet(path)

    def keep_paid():
        state['p'] = state['o'].filter(F.col('status') == 'PAID')

    def pick_columns():
        state['c'] = state['p'].select('store_id', 'total_cents')

    def group():
        state['g'] = state['c'].groupBy('store_id').agg(F.sum('total_cents').alias('revenue'))

    return count_jobs(spark, [
        ('spark.read.parquet(path)', read),
        ('.filter(status == "PAID")', keep_paid),
        ('.select("store_id", "total_cents")', pick_columns),
        ('.groupBy("store_id").agg(sum(total_cents))', group),
        ('.explain()', lambda: state['g'].explain()),
        ('.columns', lambda: state['g'].columns),
        ('.count()', lambda: state['g'].count()),
        ('.collect()', lambda: state['g'].collect()),
        ('.show(3)', lambda: state['g'].show(3)),
        ('.write.mode("overwrite").parquet(out)', lambda: state['g'].write.mode('overwrite').parquet(path + '_revenue')),
    ])


def plans_of(spark, path):
    """The four plans of one query: parsed, analyzed, optimized and physical. The same query goes through all four."""
    o = spark.read.parquet(path)
    q = (o.filter(F.col('status') == 'PAID').filter(F.col('dt') >= '2026-11-05')
         .select('store_id', 'total_cents').groupBy('store_id').agg(F.sum('total_cents').alias('revenue')))
    return q, S.plan_text(q, 'extended'), S.plan_text(q, 'formatted')


def sql_and_dataframe(spark, path):
    """The same question asked in SQL and in the DataFrame API. Both give the same optimized plan."""
    spark.read.parquet(path).createOrReplaceTempView('orders')
    sql = spark.sql("SELECT store_id, SUM(total_cents) AS revenue FROM orders WHERE status = 'PAID' GROUP BY store_id")
    api = spark.table('orders').where("status = 'PAID'").groupBy('store_id').agg(F.sum('total_cents').alias('revenue'))
    return sql, api


def optimizer_example(spark):
    """Constant folding, and filters that move: the optimized plan is not the plan that you wrote."""
    df = spark.range(10).withColumn('x', F.col('id') * (F.lit(2) + F.lit(3))).filter(F.col('x') > 10).filter(F.col('id') < 9)
    return df
