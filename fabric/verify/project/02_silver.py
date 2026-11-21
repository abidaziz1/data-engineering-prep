# Notebook cell 2: clean one day of bronze and merge it into silver. Run it twice and nothing changes.
from delta.tables import DeltaTable
from pyspark.sql import functions as F


def prepare(day):
    """One day of bronze, typed. Lines that cannot be loaded go to the rejects table, and the good lines come back."""
    path = f"Files/landing/orders_{day}.csv"
    typed = (
        spark.table("bronze_orders")
        .where(F.col("_source_file") == path)
        .withColumn("store_n", F.expr("try_cast(store_id AS INT)"))
        .withColumn("ts", F.expr("try_cast(order_ts AS TIMESTAMP)"))
        .withColumn("amount_n", F.expr("try_cast(amount AS DECIMAL(10, 2))"))
    )
    is_bad = F.col("order_id").isNull() | F.col("amount_n").isNull()

    # lines that cannot be loaded go to a table of their own, with the reason
    (
        typed.where(is_bad)
        .withColumn("_reason", F.when(F.col("order_id").isNull(), "no order_id").otherwise("amount is not a number"))
        .select("order_id", "store_id", "customer_id", "order_ts", "status", "amount", "_source_file", "_reason")
        .write.format("delta").mode("append").saveAsTable("silver_rejects")
    )

    return (
        typed.where(~is_bad)
        .select(
            "order_id",
            F.col("store_n").alias("store_id"),
            "customer_id",
            F.col("ts").alias("order_ts"),
            "status",
            F.col("amount_n").alias("amount"),
        )
        .dropDuplicates(["order_id"])           # one row for each key, or the merge refuses
    )


def to_silver(day, target="silver_orders"):
    good = prepare(day)
    (
        DeltaTable.forName(spark, target).alias("t")
        .merge(good.alias("s"), "t.order_id = s.order_id")
        .whenMatchedUpdateAll(condition="t.status <> s.status OR t.amount <> s.amount")
        .whenNotMatchedInsertAll()
        .execute()
    )
