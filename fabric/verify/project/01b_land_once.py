# A later cell: the same landing step, safe to run again. It replaces the rows of this source file instead of adding to them, so a retry leaves bronze as it was.
from pyspark.sql import functions as F


def land_once(day, table="bronze_orders"):
    path = f"Files/landing/orders_{day}.csv"
    df = (
        spark.read.option("header", True)
        .csv(path)
        .withColumn("_source_file", F.lit(path))
    )
    (
        df.write.format("delta")
        .mode("overwrite")
        .option("replaceWhere", f"_source_file = '{path}'")      # only the rows of this file are replaced
        .saveAsTable(table)
    )
    return df.count()
