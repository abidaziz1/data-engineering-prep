from pyspark.sql import DataFrame, Window, functions as F


def latest_per_key(df: DataFrame, key: str, ts: str) -> DataFrame:
    """Keep the newest row for each key."""
    w = Window.partitionBy(key).orderBy(F.col(ts).desc())
    return df.withColumn("_rn", F.row_number().over(w)).filter("_rn = 1").drop("_rn")


def daily_revenue(orders: DataFrame) -> DataFrame:
    """Revenue and order count per day, without cancelled orders."""
    return (orders.filter(F.col("status") != "CANCELLED")
            .groupBy(F.to_date("order_ts").alias("order_date"))
            .agg(F.count("*").alias("orders"), F.sum("total_usd").alias("revenue_usd")))
