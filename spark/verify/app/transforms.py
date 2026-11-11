"""The Brewline transformations that the tests of mission 12 check."""
from pyspark.sql import DataFrame
from pyspark.sql import functions as F


def daily_revenue(orders: DataFrame) -> DataFrame:
    """Orders and revenue for each store and day. Paid and refunded orders count, because a refund is revenue that was booked first. New and cancelled orders do not."""
    return (orders.filter(F.col('status').isin('PAID', 'REFUNDED'))
            .groupBy('store_id', F.to_date('order_ts').alias('day'))
            .agg(F.count('*').alias('orders'), F.sum('total_cents').alias('revenue_cents')))


def guest_share(orders: DataFrame) -> DataFrame:
    """The share of orders that have no customer id."""
    return orders.agg((F.sum(F.when(F.col('customer_id').isNull(), 1).otherwise(0)) / F.count('*')).alias('guest_share'))
