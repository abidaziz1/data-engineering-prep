"""The quality gate: the layers must agree with each other.

It returns the checks, and the run fails when one of them does.
"""

import json

from pyspark.sql import functions as F

from . import config


def unexpected_fields(spark, run_id):
    """Fields in the raw text of this run that are not in the contract.

    A warning, because bronze keeps the raw text and nothing is lost.
    """
    bronze = spark.read.format('delta').load(config.BRONZE).where(F.col('run_id') == run_id)
    seen = set()
    for row in bronze.select('raw').collect():
        try:
            seen |= set(json.loads(row['raw']))
        except (ValueError, TypeError):
            continue
    return sorted(seen - set(config.EXPECTED_FIELDS))


def gate(spark, run_id, stats):
    checks = []
    silver = spark.read.format('delta').load(config.SILVER)
    gold = spark.read.format('delta').load(config.GOLD)
    live = silver.where(F.col('status') != 'REFUNDED')

    def check(name, got, want):
        checks.append((name, got == want, got, want))

    seen = stats['valid'] + stats['quarantined']
    check('every bronze row of the run is valid or quarantined', seen, stats['bronze_rows'])
    ids = silver.select('order_id').distinct().count()
    check('silver has one row for each order', silver.count(), ids)
    revenue = live.agg(F.sum('amount_cents')).collect()[0][0]
    gold_revenue = gold.agg(F.sum('revenue_cents')).collect()[0][0]
    gold_orders = gold.agg(F.sum('orders')).collect()[0][0]
    check('gold revenue equals silver revenue without the refunded orders', gold_revenue, revenue)
    check('gold orders equal silver orders without the refunded ones', gold_orders, live.count())
    return checks
