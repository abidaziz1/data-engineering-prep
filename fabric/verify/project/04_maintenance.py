# Notebook cell 4, scheduled once a week: compact the small files, then remove the files that no version of the last 7 days needs.
for table in ["bronze_orders", "silver_orders", "gold_daily_revenue"]:
    spark.sql(f"OPTIMIZE {table}")
    spark.sql(f"VACUUM {table}")            # the default retention is 7 days (168 hours)
