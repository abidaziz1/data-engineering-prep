from pyspark import pipelines as dp
from pyspark.sql import Window, functions as F

COLUMNS = ["order_id", "customer_id", "order_ts", "status", "total_usd", "_loaded_at"]


@dp.materialized_view(name="silver_orders", comment="One row for each order, the newest version")
def silver_orders():
    newest = Window.partitionBy("order_id").orderBy(F.col("_loaded_at").desc())
    ranked = spark.read.table("bronze_orders").select(*COLUMNS, F.row_number().over(newest).alias("rn"))
    return ranked.where(F.col("rn") == 1).select(*COLUMNS)
