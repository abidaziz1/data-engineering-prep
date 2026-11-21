"""The quality gate: silver must agree with the database that the events came from.

Unlike a gate that compares layers with each other, this one reads the source itself, so a
message that never reached Kafka makes it fail.
"""

from functools import reduce

from pyspark.sql import functions as F

from . import bronze, config

COLUMNS = ['store_id', 'status', 'amount_cents']


def source_orders(spark):
    return spark.read.jdbc(config.PG_URL, 'orders', properties=config.PG_PROPERTIES)


def gate(spark):
    checks = []
    silver = spark.read.format('delta').load(config.SILVER)
    live = silver.where(~F.col('is_deleted'))
    source = source_orders(spark)

    def check(name, got, want):
        checks.append((name, got == want, got, want))

    check('every message of the topic is in bronze', bronze.count(spark), bronze.topic_size(spark))
    ids = silver.select('id').distinct().count()
    check('silver has one row for each order', silver.count(), ids)
    check('the live orders of silver equal the orders of the source', live.count(), source.count())
    revenue = live.agg(F.sum('amount_cents')).collect()[0][0]
    check('the revenue of silver equals the revenue of the source', revenue, total(source))
    joined = source.alias('p').join(live.alias('s'), 'id', 'full_outer')
    same = reduce(lambda a, b: a & b, [F.col('p.' + c) == F.col('s.' + c) for c in COLUMNS])
    differ = joined.where(~F.coalesce(same, F.lit(False))).count()
    check('every live order of silver equals its row in the source', differ, 0)
    return checks


def total(source):
    return source.agg(F.sum('amount_cents')).collect()[0][0]
