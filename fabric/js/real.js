window.LAB = window.LAB || {};
LAB.real = {
 "counts": {
  "bronze.detail": {
   "format": "delta",
   "minReaderVersion": 1,
   "minWriterVersion": 2,
   "numFiles": 5,
   "partitionColumns": [],
   "sizeInBytes": 79320
  },
  "bronze.infer": {
   "amount_type_day1": "double",
   "amount_type_day3": "string",
   "class": "AnalysisException",
   "condition": "DELTA_FAILED_TO_MERGE_FIELDS",
   "rows_after_failed_append": 2000
  },
  "bronze.log": {
   "all_strings": true,
   "columns": [
    "order_id",
    "store_id",
    "customer_id",
    "order_ts",
    "status",
    "amount",
    "_source_file"
   ],
   "commits": 5,
   "crc_files": 5,
   "kinds_in_first_commit": [
    "commitInfo",
    "metaData",
    "protocol",
    "add"
   ],
   "log_files": 11,
   "parquet_files": 5,
   "rows": 10157
  },
  "bronze.retry": {
   "once_operations": [
    "WRITE",
    "WRITE",
    "WRITE"
   ],
   "once_rows_after_three_runs": 2040,
   "once_versions_after_first": 1,
   "plain_distinct_lines": 2040,
   "plain_rows_after_two_runs": 4080,
   "rows_in_file": 2040
  },
  "cdf": {
   "change_types": [
    "delete",
    "insert",
    "update_postimage",
    "update_preimage"
   ],
   "delete_rows": 1,
   "has_enable_property": true,
   "versions": 6
  },
  "drop": {
   "external_folder_after": true,
   "external_folder_before": true,
   "external_rows_still_readable": 100,
   "managed_folder_after": false,
   "managed_folder_before": true
  },
  "files.optimize": {
   "blind_append": false,
   "bytes_after": 17796,
   "data_change": false,
   "files_added": 1,
   "files_after": 1,
   "files_removed": 40,
   "min_reader": 1,
   "operation": "OPTIMIZE",
   "parquet_files_in_folder": 41,
   "rows_after": 4000,
   "version": 41
  },
  "files.properties": {
   "has_retention_property": false,
   "properties": [
    "delta.minReaderVersion",
    "delta.minWriterVersion"
   ]
  },
  "files.small": {
   "avg_bytes_per_file": 1650,
   "bytes": 66029,
   "checkpoints": [
    "00000000000000000010.checkpoint.parquet",
    "00000000000000000020.checkpoint.parquet",
    "00000000000000000030.checkpoint.parquet",
    "00000000000000000040.checkpoint.parquet",
    "_last_checkpoint"
   ],
   "commits": 41,
   "files": 40,
   "has_last_checkpoint": true,
   "json_commits": 41,
   "rows": 4000
  },
  "files.timetravel_error": {
   "class": "SparkException",
   "condition": "FAILED_READ_FILE.FILE_NOT_EXIST",
   "latest_still_works": true,
   "optimize_version_reads": true
  },
  "files.vacuum": {
   "checkpoint_files": 5,
   "json_commits_after": 44,
   "parquet_files_after": 1,
   "rows_after": 4000
  },
  "files.vacuum_check": {
   "class": "IllegalArgumentException",
   "condition": "",
   "files_after_refusal": 41
  },
  "files.vacuum_dry": {
   "message": "",
   "rows": 0
  },
  "gold.pinned": {
   "dates_latest": "2026-03-06",
   "dates_pinned": "2026-03-05",
   "latest_version": 1,
   "pinned_equals_earlier": true,
   "pinned_version": 0,
   "revenue_latest": 519155.25,
   "revenue_pinned": 432635.25,
   "rows_latest": 72,
   "rows_pinned": 60
  },
  "gold.table": {
   "equal": true,
   "operation": "CREATE OR REPLACE TABLE AS SELECT",
   "orders": 9602,
   "revenue": 432635.25,
   "rows": 60,
   "silver_revenue": 432635.25,
   "version": 0
  },
  "lake.after": {
   "every_table_has_a_log": true,
   "tables": [
    "bronze_infer",
    "bronze_once",
    "bronze_orders",
    "bronze_retry",
    "events_small",
    "gold_daily_revenue",
    "silver_by_customer_id",
    "silver_by_none",
    "silver_by_order_date",
    "silver_by_store_id",
    "silver_cdf",
    "silver_chk",
    "silver_evo",
    "silver_orders",
    "silver_plain",
    "silver_rejects",
    "silver_rejects_variants",
    "silver_rst",
    "silver_v_changed",
    "silver_v_cond",
    "silver_v_none"
   ]
  },
  "lake.landing": {
   "bytes": [
    100863,
    101370,
    101103,
    105903,
    102990
   ],
   "files": 5,
   "rows_in_files": [
    2000,
    2012,
    2005,
    2100,
    2040
   ],
   "total_rows": 10157
  },
  "maint": {
   "bronze_orders": {
    "bytes_after": 60401,
    "bytes_before": 94816,
    "files_after": 1,
    "files_before": 6,
    "folder_after": 7,
    "folder_before": 6,
    "last_operations": [
     "OPTIMIZE",
     "VACUUM START",
     "VACUUM END"
    ],
    "optimized": true,
    "rows": 12157,
    "versions_after": 9,
    "versions_before": 6
   },
   "gold_daily_revenue": {
    "bytes_after": 1782,
    "bytes_before": 6229,
    "files_after": 1,
    "files_before": 4,
    "folder_after": 9,
    "folder_before": 8,
    "last_operations": [
     "OPTIMIZE",
     "VACUUM START",
     "VACUUM END"
    ],
    "optimized": true,
    "rows": 72,
    "versions_after": 5,
    "versions_before": 2
   },
   "silver_orders": {
    "bytes_after": 103341,
    "bytes_before": 176607,
    "files_after": 1,
    "files_before": 16,
    "folder_after": 38,
    "folder_before": 37,
    "last_operations": [
     "OPTIMIZE",
     "VACUUM START",
     "VACUUM END"
    ],
    "optimized": true,
    "rows": 12000,
    "versions_after": 13,
    "versions_before": 10
   }
  },
  "partition.layout": {
   "by_customer_files": 400,
   "by_date_files": 5,
   "none_files": 1,
   "rows": 10000
  },
  "partition.pruning": {
   "files_total": 5,
   "plan_has_partition_filter": true,
   "rows_for_the_day": 2000
  },
  "restore": {
   "operations": [
    "CREATE TABLE AS SELECT",
    "CREATE OR REPLACE TABLE AS SELECT",
    "RESTORE"
   ],
   "removed_files": 1,
   "restore_is_a_new_version": true,
   "restored_files": 2,
   "rows_after_bad_overwrite": 500,
   "rows_after_restore": 10000,
   "rows_before": 10000
  },
  "schema.constraints": {
   "check_class": "DeltaInvariantViolationException",
   "check_condition": "DELTA_VIOLATE_CONSTRAINT_WITH_VALUES",
   "not_null_condition": "DELTA_NOT_NULL_CONSTRAINT_VIOLATED",
   "not_null_refused": true,
   "protocol_after_check": 3,
   "protocol_before": 2,
   "rows_after_failed_insert": 10000
  },
  "schema.evolve": {
   "columns_after": [
    "order_id",
    "store_id",
    "customer_id",
    "order_ts",
    "status",
    "amount",
    "channel"
   ],
   "columns_before": [
    "order_id",
    "store_id",
    "customer_id",
    "order_ts",
    "status",
    "amount"
   ],
   "new_rows": 3,
   "old_rows_have_null_channel": 10000,
   "rows_after": 10003
  },
  "schema.mismatch": {
   "class": "AnalysisException",
   "columns_before": [
    "order_id",
    "store_id",
    "customer_id",
    "order_ts",
    "status",
    "amount"
   ],
   "condition": "_LEGACY_ERROR_TEMP_DELTA_0007",
   "rows_after_failed_append": 10000
  },
  "schema.type_error": {
   "class": "AnalysisException",
   "condition": "DELTA_FAILED_TO_MERGE_FIELDS",
   "rows_after": 10000
  },
  "silver.detail": {
   "format": "delta",
   "minReaderVersion": 1,
   "minWriterVersion": 2,
   "numFiles": 12,
   "partitionColumns": [],
   "sizeInBytes": 142313
  },
  "silver.dup_error": {
   "class": "UnsupportedOperationException",
   "condition": "DELTA_MULTIPLE_SOURCE_ROW_MATCHING_TARGET_ROW_IN_MERGE",
   "rows_unchanged": true
  },
  "silver.merge": {
   "cancelled": 40,
   "cancelled_after_day5": 40,
   "cancelled_after_replay": 0,
   "cancelled_after_replay_back": 40,
   "day4_rows_matched": 100,
   "distinct_ids": 10000,
   "rejects": 17,
   "rejects_amount": 5,
   "rejects_no_id": 12,
   "replay_back_updated": 40,
   "replay_inserted": 0,
   "replay_updated": 40,
   "rerun_inserted": 0,
   "rerun_made_a_commit": true,
   "rerun_updated": 0,
   "rows": 10000
  },
  "silver.plain_append": {
   "distinct_ids": 2100,
   "rows_after_two_appends": 4200,
   "rows_in_file": 2100
  },
  "silver.variants": {
   "changed lines only": {
    "day5_inserted": 2000,
    "day5_updated": 40,
    "rerun_change_rows": 0,
    "rerun_commit": false,
    "rerun_files_removed": 0,
    "rerun_files_written": 0,
    "rerun_inserted": 0,
    "rerun_updated": 0,
    "rows": 10000
   },
   "with no condition": {
    "day5_inserted": 2000,
    "day5_updated": 40,
    "rerun_change_rows": 4080,
    "rerun_commit": true,
    "rerun_files_removed": 4,
    "rerun_files_written": 4,
    "rerun_inserted": 0,
    "rerun_updated": 2040,
    "rows": 10000
   },
   "with the condition": {
    "day5_inserted": 2000,
    "day5_updated": 40,
    "rerun_change_rows": 0,
    "rerun_commit": true,
    "rerun_files_removed": 4,
    "rerun_files_written": 4,
    "rerun_inserted": 0,
    "rerun_updated": 0,
    "rows": 10000
   }
  }
 },
 "files": {
  "00_tables.sql": "-- Run once in a notebook cell (Spark SQL) or in the SQL view of the lakehouse. Fabric lakehouse tables are Delta tables.\nCREATE TABLE IF NOT EXISTS silver_orders (\n  order_id    STRING NOT NULL,\n  store_id    INT,\n  customer_id STRING,\n  order_ts    TIMESTAMP,\n  status      STRING,\n  amount      DECIMAL(10, 2)\n) USING DELTA;\n\nCREATE TABLE IF NOT EXISTS silver_rejects (\n  order_id     STRING,\n  store_id     STRING,\n  customer_id  STRING,\n  order_ts     STRING,\n  status       STRING,\n  amount       STRING,\n  _source_file STRING,\n  _reason      STRING\n) USING DELTA;\n",
  "01_bronze.py": "# Notebook cell 1: land one day's file in the bronze table, exactly as it came. A notebook with a default lakehouse attached reads \"Files/...\" relative to it.\nfrom pyspark.sql import functions as F\n\n\ndef land(day, table=\"bronze_orders\"):\n    path = f\"Files/landing/orders_{day}.csv\"\n    df = (\n        spark.read.option(\"header\", True)        # every column stays a string in bronze\n        .csv(path)\n        .withColumn(\"_source_file\", F.lit(path))\n    )\n    df.write.format(\"delta\").mode(\"append\").saveAsTable(table)\n    return df.count()\n",
  "01b_land_once.py": "# A later cell: the same landing step, safe to run again. It replaces the rows of this source file instead of adding to them, so a retry leaves bronze as it was.\nfrom pyspark.sql import functions as F\n\n\ndef land_once(day, table=\"bronze_orders\"):\n    path = f\"Files/landing/orders_{day}.csv\"\n    df = (\n        spark.read.option(\"header\", True)\n        .csv(path)\n        .withColumn(\"_source_file\", F.lit(path))\n    )\n    (\n        df.write.format(\"delta\")\n        .mode(\"overwrite\")\n        .option(\"replaceWhere\", f\"_source_file = '{path}'\")      # only the rows of this file are replaced\n        .saveAsTable(table)\n    )\n    return df.count()\n",
  "02_silver.py": "# Notebook cell 2: clean one day of bronze and merge it into silver. Run it twice and nothing changes.\nfrom delta.tables import DeltaTable\nfrom pyspark.sql import functions as F\n\n\ndef prepare(day):\n    \"\"\"One day of bronze, typed. Lines that cannot be loaded go to the rejects table, and the good lines come back.\"\"\"\n    path = f\"Files/landing/orders_{day}.csv\"\n    typed = (\n        spark.table(\"bronze_orders\")\n        .where(F.col(\"_source_file\") == path)\n        .withColumn(\"store_n\", F.expr(\"try_cast(store_id AS INT)\"))\n        .withColumn(\"ts\", F.expr(\"try_cast(order_ts AS TIMESTAMP)\"))\n        .withColumn(\"amount_n\", F.expr(\"try_cast(amount AS DECIMAL(10, 2))\"))\n    )\n    is_bad = F.col(\"order_id\").isNull() | F.col(\"amount_n\").isNull()\n\n    # lines that cannot be loaded go to a table of their own, with the reason\n    (\n        typed.where(is_bad)\n        .withColumn(\"_reason\", F.when(F.col(\"order_id\").isNull(), \"no order_id\").otherwise(\"amount is not a number\"))\n        .select(\"order_id\", \"store_id\", \"customer_id\", \"order_ts\", \"status\", \"amount\", \"_source_file\", \"_reason\")\n        .write.format(\"delta\").mode(\"append\").saveAsTable(\"silver_rejects\")\n    )\n\n    return (\n        typed.where(~is_bad)\n        .select(\n            \"order_id\",\n            F.col(\"store_n\").alias(\"store_id\"),\n            \"customer_id\",\n            F.col(\"ts\").alias(\"order_ts\"),\n            \"status\",\n            F.col(\"amount_n\").alias(\"amount\"),\n        )\n        .dropDuplicates([\"order_id\"])           # one row for each key, or the merge refuses\n    )\n\n\ndef to_silver(day, target=\"silver_orders\"):\n    good = prepare(day)\n    (\n        DeltaTable.forName(spark, target).alias(\"t\")\n        .merge(good.alias(\"s\"), \"t.order_id = s.order_id\")\n        .whenMatchedUpdateAll(condition=\"t.status <> s.status OR t.amount <> s.amount\")\n        .whenNotMatchedInsertAll()\n        .execute()\n    )\n",
  "02b_changed_only.py": "# A later cell of the same notebook: merge only the lines that are new or different. A merge rewrites every file that holds a matching row, so a source that is\n# filtered first leaves the files of unchanged rows alone.\nfrom pyspark.sql import functions as F\n\n\ndef to_silver_changed(day, target=\"silver_orders\"):\n    good = prepare(day)\n    same = (\n        (F.col(\"s.order_id\") == F.col(\"t.order_id\"))\n        & F.col(\"s.status\").eqNullSafe(F.col(\"t.status\"))\n        & F.col(\"s.amount\").eqNullSafe(F.col(\"t.amount\"))\n    )\n    changed = good.alias(\"s\").join(spark.table(target).alias(\"t\"), same, \"left_anti\")    # new or different lines only\n    (\n        DeltaTable.forName(spark, target).alias(\"t\")\n        .merge(changed.alias(\"s\"), \"t.order_id = s.order_id\")\n        .whenMatchedUpdateAll()\n        .whenNotMatchedInsertAll()\n        .execute()\n    )\n",
  "03_gold.sql": "-- Notebook cell 3 (Spark SQL): the gold table that the report reads. One row for each store and day.\nCREATE OR REPLACE TABLE gold_daily_revenue AS\nSELECT CAST(order_ts AS DATE) AS order_date,\n       store_id,\n       COUNT(*)               AS orders,\n       SUM(amount)            AS revenue\nFROM silver_orders\nWHERE status <> 'REFUNDED'\nGROUP BY CAST(order_ts AS DATE), store_id;\n",
  "04_maintenance.py": "# Notebook cell 4, scheduled once a week: compact the small files, then remove the files that no version of the last 7 days needs.\nfor table in [\"bronze_orders\", \"silver_orders\", \"gold_daily_revenue\"]:\n    spark.sql(f\"OPTIMIZE {table}\")\n    spark.sql(f\"VACUUM {table}\")            # the default retention is 7 days (168 hours)\n",
  "gold_daily.tsql": "-- The same gold table made in a Fabric Warehouse with T-SQL. The lakehouse is read through a three-part name, in the same workspace.\nCREATE TABLE dbo.gold_daily_revenue\nAS\nSELECT CAST(order_ts AS date) AS order_date,\n       store_id,\n       COUNT(*)               AS orders,\n       SUM(amount)            AS revenue\nFROM BrewlineLakehouse.dbo.silver_orders\nWHERE status <> 'REFUNDED'\nGROUP BY CAST(order_ts AS date), store_id;\n",
  "platform_example.json": "{\n  \"metadata\": {\n    \"type\": \"Notebook\",\n    \"displayName\": \"02_silver\",\n    \"description\": \"Clean one day of bronze and merge it into silver\"\n  },\n  \"config\": {\n    \"version\": \"2.0\",\n    \"logicalId\": \"00000000-0000-0000-0000-000000000000\"\n  }\n}\n"
 },
 "meta": {
  "delta": "4.0.1",
  "java": "21.0.12.1",
  "note": "Recorded by fabric/verify/capture_fabric.py from open-source Apache Spark and Delta Lake on one machine. Nothing ran on Microsoft Fabric.",
  "pyspark": "4.0.1",
  "python": "3.13.18",
  "recorded_on": "2026-11-21",
  "spark": "4.0.1"
 },
 "tables": {
  "bronze.history": {
   "cols": [
    "version",
    "operation",
    "files added",
    "rows written"
   ],
   "rows": [
    [
     0,
     "CREATE TABLE AS SELECT",
     1,
     2000
    ],
    [
     1,
     "WRITE",
     1,
     2012
    ],
    [
     2,
     "WRITE",
     1,
     2005
    ],
    [
     3,
     "WRITE",
     1,
     2100
    ],
    [
     4,
     "WRITE",
     1,
     2040
    ]
   ]
  },
  "bronze.timetravel": {
   "cols": [
    "VERSION AS OF",
    "rows"
   ],
   "rows": [
    [
     0,
     2000
    ],
    [
     1,
     4012
    ],
    [
     2,
     6017
    ],
    [
     3,
     8117
    ],
    [
     4,
     10157
    ]
   ]
  },
  "cdf.changes": {
   "cols": [
    "_change_type",
    "rows"
   ],
   "rows": [
    [
     "delete",
     "1"
    ],
    [
     "insert",
     "10000"
    ],
    [
     "update_postimage",
     "40"
    ],
    [
     "update_preimage",
     "40"
    ]
   ]
  },
  "cdf.update_sample": {
   "cols": [
    "order_id",
    "status",
    "_change_type",
    "_commit_version"
   ],
   "rows": [
    [
     "O-40000",
     "CANCELLED",
     "update_postimage",
     "5"
    ],
    [
     "O-40000",
     "REFUNDED",
     "update_preimage",
     "5"
    ],
    [
     "O-40001",
     "CANCELLED",
     "update_postimage",
     "5"
    ],
    [
     "O-40001",
     "PLACED",
     "update_preimage",
     "5"
    ]
   ]
  },
  "files.lifecycle": {
   "cols": [
    "step",
    "files in the table",
    "parquet files in the folder"
   ],
   "rows": [
    [
     "40 inserts of 100 rows",
     40,
     40
    ],
    [
     "OPTIMIZE",
     1,
     41
    ],
    [
     "VACUUM RETAIN 0 HOURS",
     1,
     1
    ]
   ]
  },
  "gold.pinned": {
   "cols": [
    "reader",
    "delta version",
    "last date",
    "rows",
    "revenue"
   ],
   "rows": [
    [
     "pinned to the first gold table",
     0,
     "2026-03-05",
     60,
     "432635.25"
    ],
    [
     "reads the latest",
     1,
     "2026-03-06",
     72,
     "519155.25"
    ]
   ]
  },
  "gold.sample": {
   "cols": [
    "order_date",
    "store_id",
    "orders",
    "revenue"
   ],
   "rows": [
    [
     "2026-03-01",
     "1",
     "160",
     "6930.60"
    ],
    [
     "2026-03-01",
     "2",
     "160",
     "7358.80"
    ],
    [
     "2026-03-01",
     "3",
     "160",
     "7311.80"
    ],
    [
     "2026-03-01",
     "4",
     "160",
     "7081.20"
    ],
    [
     "2026-03-01",
     "5",
     "160",
     "7027.00"
    ],
    [
     "2026-03-01",
     "6",
     "160",
     "7478.80"
    ]
   ]
  },
  "lake.landing": {
   "cols": [
    "file",
    "rows",
    "bytes"
   ],
   "rows": [
    [
     "orders_2026-03-01.csv",
     2000,
     100863
    ],
    [
     "orders_2026-03-02.csv",
     2012,
     101370
    ],
    [
     "orders_2026-03-03.csv",
     2005,
     101103
    ],
    [
     "orders_2026-03-04.csv",
     2100,
     105903
    ],
    [
     "orders_2026-03-05.csv",
     2040,
     102990
    ]
   ]
  },
  "maint": {
   "cols": [
    "table",
    "files before",
    "files after",
    "parquet files in the folder after",
    "rows"
   ],
   "rows": [
    [
     "bronze_orders",
     6,
     1,
     7,
     12157
    ],
    [
     "silver_orders",
     16,
     1,
     38,
     12000
    ],
    [
     "gold_daily_revenue",
     4,
     1,
     9,
     72
    ]
   ]
  },
  "partition.layout": {
   "cols": [
    "partitioned by",
    "partitions",
    "files",
    "bytes in all",
    "bytes per file"
   ],
   "rows": [
    [
     "no partition",
     1,
     1,
     87505,
     87505
    ],
    [
     "order_date",
     5,
     5,
     107357,
     21471
    ],
    [
     "store_id",
     12,
     12,
     121125,
     10093
    ],
    [
     "customer_id",
     400,
     400,
     950002,
     2375
    ]
   ]
  },
  "restore.history": {
   "cols": [
    "version",
    "operation",
    "rows after"
   ],
   "rows": [
    [
     0,
     "CREATE TABLE AS SELECT",
     10000
    ],
    [
     1,
     "CREATE OR REPLACE TABLE AS SELECT",
     500
    ],
    [
     2,
     "RESTORE",
     10000
    ]
   ]
  },
  "silver.merge_runs": {
   "cols": [
    "run",
    "rows in the file",
    "inserted",
    "updated",
    "table version",
    "rows in the table",
    "made a commit",
    "cancelled orders",
    "files written",
    "files removed"
   ],
   "rows": [
    [
     "day 1",
     2000,
     2000,
     0,
     1,
     2000,
     true,
     0,
     4,
     0
    ],
    [
     "day 2",
     2012,
     2000,
     0,
     2,
     4000,
     true,
     0,
     4,
     0
    ],
    [
     "day 3",
     2005,
     2000,
     0,
     3,
     6000,
     true,
     0,
     4,
     0
    ],
    [
     "day 4",
     2100,
     2000,
     0,
     4,
     8000,
     true,
     0,
     4,
     4
    ],
    [
     "day 5",
     2040,
     2000,
     40,
     5,
     10000,
     true,
     40,
     4,
     4
    ],
    [
     "day 5 again",
     2040,
     0,
     0,
     6,
     10000,
     true,
     40,
     4,
     4
    ],
    [
     "day 4 replayed",
     2100,
     0,
     40,
     7,
     10000,
     true,
     0,
     4,
     4
    ],
    [
     "day 5 replayed",
     2040,
     0,
     40,
     8,
     10000,
     true,
     40,
     4,
     4
    ]
   ]
  },
  "silver.rejects": {
   "cols": [
    "_reason",
    "rows",
    "first_file"
   ],
   "rows": [
    [
     "amount is not a number",
     "5",
     "Files/landing/orders_2026-03-03.csv"
    ],
    [
     "no order_id",
     "12",
     "Files/landing/orders_2026-03-02.csv"
    ]
   ]
  },
  "silver.variants": {
   "cols": [
    "merge",
    "rows updated by the rerun",
    "files rewritten by the rerun",
    "change records of the rerun",
    "made a commit"
   ],
   "rows": [
    [
     "with the condition",
     0,
     4,
     0,
     true
    ],
    [
     "with no condition",
     2040,
     4,
     4080,
     true
    ],
    [
     "changed lines only",
     0,
     0,
     0,
     false
    ]
   ]
  }
 },
 "text": {
  "bronze.commit0": "{\"commitInfo\": {\"isBlindAppend\": true, \"operation\": \"CREATE TABLE AS SELECT\", \"operationParameters\": {\"clusterBy\": \"[]\", \"description\": null, \"isManaged\": \"true\", \"partitionBy\": \"[]\", \"properties\": \"{}\"}}}\n{\"metaData\": {\"format\": {\"options\": {}, \"provider\": \"parquet\"}, \"partitionColumns\": [], \"schema\": [\"order_id string\", \"store_id string\", \"customer_id string\", \"order_ts string\", \"status string\", \"amount string\", \"_source_file string\"]}}\n{\"protocol\": {\"minReaderVersion\": 1, \"minWriterVersion\": 2}}\n{\"add\": {\"dataChange\": true, \"path\": \"part-0001.snappy.parquet\", \"size\": 15492, \"stats\": {\"maxValues.order_id\": \"O-11999\", \"minValues.order_id\": \"O-10000\", \"numRecords\": 2000}}}",
  "bronze.infer_error": "spark.read.option(\"header\", True).option(\"inferSchema\", True).csv(\"Files/landing/orders_2026-03-03.csv\")\n    .write.format(\"delta\").mode(\"append\").saveAsTable(\"bronze_infer\")\n[DELTA_FAILED_TO_MERGE_FIELDS] Failed to merge fields 'amount' and 'amount'",
  "bronze.sample": "SELECT order_id, store_id, order_ts, status, amount FROM bronze_orders WHERE order_id IS NOT NULL LIMIT 3;\nO-10000 | 1 | 2026-03-01 00:00:00 | REFUNDED | 5.00\nO-10001 | 8 | 2026-03-01 13:11:00 | PLACED | 22.05\nO-10002 | 3 | 2026-03-01 02:22:00 | PLACED | 39.10",
  "bronze.tree": "Tables/bronze_orders/\n  part-0001.snappy.parquet\n  part-0002.snappy.parquet\n  part-0003.snappy.parquet\n  part-0004.snappy.parquet\n  part-0005.snappy.parquet\n  _delta_log/\n    00000000000000000000.json\n    00000000000000000001.json\n    00000000000000000002.json\n    00000000000000000003.json\n    00000000000000000004.json",
  "files.timetravel_error": "SELECT sum(event_id) FROM events_small VERSION AS OF 5;\n[FAILED_READ_FILE.FILE_NOT_EXIST] Encountered error while reading file file:~/BrewlineLakehouse/Tables/events_small/part-00000-<id>-c000.snappy.parquet. File does not exist. It is possible the underlying files have been updated.\nYou can explicitly invalidate the cache in Spark by running 'REFRESH TABLE tableName' command in SQL or by recreating the Dataset/DataFrame involved. SQLSTATE: KD001",
  "files.vacuum_check": "VACUUM events_small RETAIN 0 HOURS;\nrequirement failed: Are you sure you would like to vacuum files with such a low retention period? If you have\nwriters that are currently writing to this table, there is a risk that you may corrupt the\nstate of your Delta table.",
  "lake.csv_head": "Files/landing/orders_2026-03-01.csv\norder_id,store_id,customer_id,order_ts,status,amount\nO-10000,1,C-006,2026-03-01 00:00:00,REFUNDED,5.00\nO-10001,8,C-019,2026-03-01 13:11:00,PLACED,22.05\nO-10002,3,C-032,2026-03-01 02:22:00,PLACED,39.10",
  "lake.tree_after": "BrewlineLakehouse/\n  Files/\n    landing/ (6 files)\n    exports/ext_orders/ (a Delta table that the lakehouse does not manage)\n  Tables/\n    bronze_infer/\n    bronze_once/\n    bronze_orders/\n    bronze_retry/\n    events_small/\n    gold_daily_revenue/\n    silver_by_customer_id/\n    silver_by_none/\n    silver_by_order_date/\n    silver_by_store_id/\n    silver_cdf/\n    silver_chk/\n    silver_evo/\n    silver_orders/\n    silver_plain/\n    silver_rejects/\n    silver_rejects_variants/\n    silver_rst/\n    silver_v_changed/\n    silver_v_cond/\n    silver_v_none/",
  "lake.tree_before": "BrewlineLakehouse/\n  Files/\n    landing/\n      orders_2026-03-01.csv\n      orders_2026-03-02.csv\n      orders_2026-03-03.csv\n      orders_2026-03-04.csv\n      orders_2026-03-05.csv\n  Tables/",
  "partition.plan": "SELECT count(*) FROM silver_by_order_date WHERE order_date = DATE'2026-03-02'\n+- Scan parquet spark_catalog.default.silver_by_order_date (1)\n(1) Scan parquet spark_catalog.default.silver_by_order_date\nPartitionFilters: [isnotnull(order_date), (order_date = 2026-03-02)]",
  "schema.check_error": "ALTER TABLE silver_chk ADD CONSTRAINT amount_positive CHECK (amount > 0);\nINSERT INTO silver_chk VALUES ('O-BAD', 1, 'C-001', timestamp'2026-03-09 10:00:00', 'PLACED', -5.00);\n[DELTA_VIOLATE_CONSTRAINT_WITH_VALUES] CHECK constraint amount_positive (amount > 0) violated by row with values:\n - amount : -5.00",
  "schema.mismatch": "df.write.format(\"delta\").mode(\"append\").saveAsTable(\"silver_evo\")   # df has a new column, channel\n[_LEGACY_ERROR_TEMP_DELTA_0007] A schema mismatch detected when writing to the Delta table (Table ID: <id>).\nTo enable schema migration using DataFrameWriter or DataStreamWriter, please set:\n'.option(\"mergeSchema\", \"true\")'.\nFor other operations, set the session configuration\nspark.databricks.delta.schema.autoMerge.enabled to \"true\". See the documentation\nspecific to the operation for details.",
  "schema.type_error": "df.write.format(\"delta\").mode(\"append\").saveAsTable(\"silver_orders\")   # amount is the text \"free\"\n[DELTA_FAILED_TO_MERGE_FIELDS] Failed to merge fields 'amount' and 'amount'",
  "silver.dup_error": "MERGE INTO silver_orders t USING dup_src s ON t.order_id = s.order_id\nWHEN MATCHED THEN UPDATE SET t.amount = s.amount;\n[DELTA_MULTIPLE_SOURCE_ROW_MATCHING_TARGET_ROW_IN_MERGE] Cannot perform Merge as multiple source rows matched and attempted to modify the same\ntarget row in the Delta table in possibly conflicting ways. By SQL semantics of Merge,\nwhen multiple source rows match on the same target row, the result may be ambiguous"
 }
};
