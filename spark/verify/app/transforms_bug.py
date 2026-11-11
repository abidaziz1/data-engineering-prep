"""A copy of transforms.py with a bug that a reviewer could miss: refunded orders are left out."""
from pyspark.sql import DataFrame
from pyspark.sql import functions as F


def daily_revenue(orders: DataFrame) -> DataFrame:
    return (orders.filter(F.col('status') == 'PAID')
            .groupBy('store_id', F.to_date('order_ts').alias('day'))
            .agg(F.count('*').alias('orders'), F.sum('total_cents').alias('revenue_cents')))


def guest_share(orders: DataFrame) -> DataFrame:
    return orders.agg((F.sum(F.when(F.col('customer_id').isNull(), 1).otherwise(0)) / F.count('*')).alias('guest_share'))
