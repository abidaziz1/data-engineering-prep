# Notebook cell 1: land one day's file in the bronze table, exactly as it came. A notebook with a default lakehouse attached reads "Files/..." relative to it.
from pyspark.sql import functions as F


def land(day, table="bronze_orders"):
    path = f"Files/landing/orders_{day}.csv"
    df = (
        spark.read.option("header", True)        # every column stays a string in bronze
        .csv(path)
        .withColumn("_source_file", F.lit(path))
    )
    df.write.format("delta").mode("append").saveAsTable(table)
    return df.count()
