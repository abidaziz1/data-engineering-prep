"""Gold: revenue and orders for each day and store, without the refunded orders.

A day is the date when the order was placed. Only the days of the orders that a run touched
are recomputed (a refund restates the day of its order), and each day is replaced as a
whole, so a repeat changes nothing.
"""

from pyspark.sql import functions as F

from . import config


def refresh(spark, dates):
    """Recomputes the given days (a list of 'YYYY-MM-DD') from silver.

    Returns the number of rows written.
    """
    if not dates:
        return 0
    silver = spark.read.format('delta').load(config.SILVER)
    live = silver.where(F.col('order_date').isin(dates) & (F.col('status') != 'REFUNDED'))
    orders, revenue = F.count('*').alias('orders'), F.sum('amount_cents').alias('revenue_cents')
    daily = live.groupBy('order_date', 'store_id').agg(orders, revenue)
    predicate = 'order_date IN (%s)' % ', '.join("'%s'" % d for d in dates)
    writer = daily.write.format('delta').mode('overwrite')
    writer.option('replaceWhere', predicate).save(config.GOLD)
    return daily.count()
