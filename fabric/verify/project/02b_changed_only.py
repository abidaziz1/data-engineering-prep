# A later cell of the same notebook: merge only the lines that are new or different. A merge rewrites every file that holds a matching row, so a source that is
# filtered first leaves the files of unchanged rows alone.
from pyspark.sql import functions as F


def to_silver_changed(day, target="silver_orders"):
    good = prepare(day)
    same = (
        (F.col("s.order_id") == F.col("t.order_id"))
        & F.col("s.status").eqNullSafe(F.col("t.status"))
        & F.col("s.amount").eqNullSafe(F.col("t.amount"))
    )
    changed = good.alias("s").join(spark.table(target).alias("t"), same, "left_anti")    # new or different lines only
    (
        DeltaTable.forName(spark, target).alias("t")
        .merge(changed.alias("s"), "t.order_id = s.order_id")
        .whenMatchedUpdateAll()
        .whenNotMatchedInsertAll()
        .execute()
    )
