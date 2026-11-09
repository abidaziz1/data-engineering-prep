from pyspark import pipelines as dp
from pyspark.sql import functions as F

ORDERS = ("order_id string, customer_id string, order_ts timestamp, "
          "status string, total_usd decimal(12,2), _loaded_at timestamp")


@dp.table(name="bronze_orders", comment="Orders as they arrived")
def bronze_orders():
    return (spark.readStream.format("json")
            .schema(ORDERS)
            .load(spark.conf.get("brewline.landing"))
            .select("*", F.col("_metadata.file_name").alias("_source_file")))
