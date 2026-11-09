window.LAB = window.LAB || {};
LAB.real = {
 "counts": {
  "delta.conflicts": {
   "append_append": {
    "a": "committed",
    "b": "committed",
    "history": [
     "v0 WRITE",
     "v1 WRITE",
     "v2 WRITE"
    ],
    "rows": 5
   },
   "update_append": {
    "a": "ConcurrentAppendException",
    "b": "committed",
    "history": [
     "v0 WRITE",
     "v1 WRITE"
    ],
    "retry": "committed",
    "rows": 4,
    "rows_after_retry": 2
   },
   "update_append_partitioned": {
    "a": "committed",
    "b": "committed",
    "history": [
     "v0 WRITE",
     "v1 WRITE",
     "v2 UPDATE"
    ],
    "rows": 4
   },
   "update_update": {
    "a": "ConcurrentAppendException",
    "b": "committed",
    "history": [
     "v0 WRITE",
     "v1 UPDATE"
    ],
    "rows": 3
   }
  },
  "delta.constraint_properties": {
   "delta.constraints.positive_total": "total_usd > 0"
  },
  "delta.dv_off_files": {
   "files_in_folder": 2,
   "rows_after": 2
  },
  "delta.dv_on_files": {
   "files_in_folder": 1,
   "rows_after": 2
  },
  "delta.orders_v0": {
   "clusteringColumns": [],
   "format": "delta",
   "minReaderVersion": 1,
   "minWriterVersion": 2,
   "numFiles": 1,
   "partitionColumns": [],
   "properties": {},
   "sizeInBytes": 1878,
   "tableFeatures": [
    "appendOnly",
    "invariants"
   ]
  },
  "delta.orders_v5": {
   "clusteringColumns": [],
   "format": "delta",
   "minReaderVersion": 1,
   "minWriterVersion": 2,
   "numFiles": 1,
   "partitionColumns": [],
   "properties": {},
   "sizeInBytes": 2085,
   "tableFeatures": [
    "appendOnly",
    "invariants"
   ]
  },
  "delta.restore": {
   "num_of_files_after_restore": "2",
   "num_removed_files": "1",
   "num_restored_files": "2",
   "removed_files_size": "2085",
   "restored_files_size": "3664",
   "table_size_after_restore": "3664"
  },
  "delta.shallow_clone": {
   "copied_files_size": "0",
   "num_copied_files": "0",
   "num_removed_files": "0",
   "parquet_files_in_clone_folder": 0,
   "removed_files_size": "0",
   "source_num_of_files": "2",
   "source_table_size": "3664"
  },
  "layout.liquid_after": {
   "clusteringColumns": [
    "customer_id"
   ],
   "format": "delta",
   "minReaderVersion": 1,
   "minWriterVersion": 7,
   "numFiles": 2,
   "partitionColumns": [],
   "properties": {},
   "sizeInBytes": 2712491,
   "tableFeatures": [
    "appendOnly",
    "clustering",
    "domainMetadata",
    "invariants"
   ]
  },
  "layout.liquid_before": {
   "clusteringColumns": [
    "customer_id"
   ],
   "format": "delta",
   "minReaderVersion": 1,
   "minWriterVersion": 7,
   "numFiles": 16,
   "partitionColumns": [],
   "properties": {},
   "sizeInBytes": 2883763,
   "tableFeatures": [
    "appendOnly",
    "clustering",
    "domainMetadata",
    "invariants"
   ]
  },
  "layout.liquid_files": {
   "clusteringColumns": [
    "customer_id"
   ],
   "format": "delta",
   "minReaderVersion": 1,
   "minWriterVersion": 7,
   "numFiles": 2,
   "partitionColumns": [],
   "properties": {},
   "sizeInBytes": 2712491,
   "tableFeatures": [
    "appendOnly",
    "clustering",
    "domainMetadata",
    "invariants"
   ]
  },
  "layout.liquid_optimize": {
   "numFilesAdded": 2,
   "numFilesRemoved": 16
  },
  "layout.liquid_scan": {
   "predicate": "customer_id = 'C-0420'",
   "scan_files": 1,
   "total_files": 2
  },
  "layout.part_bucket3": {
   "clusteringColumns": [],
   "format": "delta",
   "minReaderVersion": 1,
   "minWriterVersion": 2,
   "numFiles": 3,
   "partitionColumns": [
    "bucket3"
   ],
   "properties": {},
   "sizeInBytes": 754801,
   "tableFeatures": [
    "appendOnly",
    "invariants"
   ]
  },
  "layout.part_cust100": {
   "clusteringColumns": [],
   "format": "delta",
   "minReaderVersion": 1,
   "minWriterVersion": 2,
   "numFiles": 100,
   "partitionColumns": [
    "cust100"
   ],
   "properties": {},
   "sizeInBytes": 917471,
   "tableFeatures": [
    "appendOnly",
    "invariants"
   ]
  },
  "layout.part_none": {
   "clusteringColumns": [],
   "format": "delta",
   "minReaderVersion": 1,
   "minWriterVersion": 2,
   "numFiles": 1,
   "partitionColumns": [],
   "properties": {},
   "sizeInBytes": 740394,
   "tableFeatures": [
    "appendOnly",
    "invariants"
   ]
  },
  "layout.partitioning": {
   "bucket3": {
    "avg_file_bytes": 251600,
    "numFiles": 3,
    "partition_values": 3,
    "sizeInBytes": 754801
   },
   "cust100": {
    "avg_file_bytes": 9174,
    "numFiles": 100,
    "partition_values": 100,
    "sizeInBytes": 917471
   },
   "none": {
    "avg_file_bytes": 740394,
    "numFiles": 1,
    "partition_values": 1,
    "sizeInBytes": 740394
   }
  },
  "layout.small_after": {
   "clusteringColumns": [],
   "format": "delta",
   "minReaderVersion": 1,
   "minWriterVersion": 2,
   "numFiles": 1,
   "partitionColumns": [],
   "properties": {},
   "sizeInBytes": 10878,
   "tableFeatures": [
    "appendOnly",
    "invariants"
   ]
  },
  "layout.small_before": {
   "clusteringColumns": [],
   "format": "delta",
   "minReaderVersion": 1,
   "minWriterVersion": 2,
   "numFiles": 40,
   "partitionColumns": [],
   "properties": {},
   "sizeInBytes": 65499,
   "tableFeatures": [
    "appendOnly",
    "invariants"
   ]
  },
  "layout.small_operations": {
   "OPTIMIZE": 1,
   "WRITE": 40
  },
  "layout.small_optimize": {
   "filesAdded": {
    "max": 10878,
    "min": 10878,
    "totalFiles": 1,
    "totalSize": 10878
   },
   "filesRemoved": {
    "max": 1655,
    "min": 1624,
    "totalFiles": 40,
    "totalSize": 65499
   },
   "numFilesAdded": 1,
   "numFilesRemoved": 40
  },
  "layout.time_travel_after_vacuum": {
   "error_class": "SparkException"
  },
  "layout.vacuum_after": {
   "files_in_folder": 1,
   "files_in_snapshot": 1
  },
  "layout.vacuum_before": {
   "files_in_folder": 3,
   "files_in_snapshot": 1,
   "versions": 3
  },
  "layout.vacuum_detail": {
   "clusteringColumns": [],
   "format": "delta",
   "minReaderVersion": 1,
   "minWriterVersion": 2,
   "numFiles": 1,
   "partitionColumns": [],
   "properties": {},
   "sizeInBytes": 1428,
   "tableFeatures": [
    "appendOnly",
    "invariants"
   ]
  },
  "layout.vacuum_detail_after": {
   "clusteringColumns": [],
   "format": "delta",
   "minReaderVersion": 1,
   "minWriterVersion": 2,
   "numFiles": 1,
   "partitionColumns": [],
   "properties": {},
   "sizeInBytes": 1428,
   "tableFeatures": [
    "appendOnly",
    "invariants"
   ]
  },
  "layout.vacuum_dry_default_retention": {
   "files_to_delete": 0,
   "retention_hours": 168
  },
  "layout.vacuum_dry_zero_retention": {
   "rows_returned": 2
  },
  "layout.zorder": {
   "files_after": [
    {
     "bytes": 929598,
     "file": "part-0017.snappy.parquet",
     "max": "C-0609",
     "min": "C-0000",
     "rows": 122043
    },
    {
     "bytes": 1016810,
     "file": "part-0018.snappy.parquet",
     "max": "C-1278",
     "min": "C-0607",
     "rows": 133475
    },
    {
     "bytes": 1099755,
     "file": "part-0019.snappy.parquet",
     "max": "C-1999",
     "min": "C-1277",
     "rows": 144482
    }
   ],
   "files_before": [
    {
     "bytes": 203040,
     "file": "part-0001.snappy.parquet",
     "max": "C-1999",
     "min": "C-0000",
     "rows": 25000
    },
    {
     "bytes": 203101,
     "file": "part-0002.snappy.parquet",
     "max": "C-1999",
     "min": "C-0000",
     "rows": 25000
    },
    {
     "bytes": 202895,
     "file": "part-0003.snappy.parquet",
     "max": "C-1999",
     "min": "C-0000",
     "rows": 25000
    },
    {
     "bytes": 203029,
     "file": "part-0004.snappy.parquet",
     "max": "C-1999",
     "min": "C-0000",
     "rows": 25000
    },
    {
     "bytes": 202896,
     "file": "part-0005.snappy.parquet",
     "max": "C-1999",
     "min": "C-0000",
     "rows": 25000
    },
    {
     "bytes": 202963,
     "file": "part-0006.snappy.parquet",
     "max": "C-1999",
     "min": "C-0000",
     "rows": 25000
    },
    {
     "bytes": 203121,
     "file": "part-0007.snappy.parquet",
     "max": "C-1999",
     "min": "C-0000",
     "rows": 25000
    },
    {
     "bytes": 202915,
     "file": "part-0008.snappy.parquet",
     "max": "C-1999",
     "min": "C-0000",
     "rows": 25000
    },
    {
     "bytes": 203104,
     "file": "part-0009.snappy.parquet",
     "max": "C-1999",
     "min": "C-0000",
     "rows": 25000
    },
    {
     "bytes": 202905,
     "file": "part-0010.snappy.parquet",
     "max": "C-1999",
     "min": "C-0000",
     "rows": 25000
    },
    {
     "bytes": 203104,
     "file": "part-0011.snappy.parquet",
     "max": "C-1999",
     "min": "C-0000",
     "rows": 25000
    },
    {
     "bytes": 202760,
     "file": "part-0012.snappy.parquet",
     "max": "C-1999",
     "min": "C-0000",
     "rows": 25000
    },
    {
     "bytes": 203097,
     "file": "part-0013.snappy.parquet",
     "max": "C-1999",
     "min": "C-0000",
     "rows": 25000
    },
    {
     "bytes": 202910,
     "file": "part-0014.snappy.parquet",
     "max": "C-1999",
     "min": "C-0000",
     "rows": 25000
    },
    {
     "bytes": 202910,
     "file": "part-0015.snappy.parquet",
     "max": "C-1999",
     "min": "C-0000",
     "rows": 25000
    },
    {
     "bytes": 202974,
     "file": "part-0016.snappy.parquet",
     "max": "C-1999",
     "min": "C-0000",
     "rows": 25000
    }
   ],
   "numFilesAdded": 3,
   "numFilesRemoved": 16,
   "predicate": "customer_id = 'C-0420'",
   "rows_matching": 184,
   "scan_files_after": 1,
   "scan_files_before": 16,
   "total_files_after": 3,
   "total_files_before": 16,
   "zOrderBy": "customer_id"
  },
  "spark.aqe": {
   "shuffle_partitions_configured": 8
  },
  "spark.defaults": {
   "spark.sql.adaptive.advisoryPartitionSizeInBytes": "67108864b",
   "spark.sql.adaptive.coalescePartitions.enabled": "true",
   "spark.sql.adaptive.enabled": "true",
   "spark.sql.adaptive.skewJoin.enabled": "true",
   "spark.sql.adaptive.skewJoin.skewedPartitionFactor": "5.0",
   "spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes": "268435456b",
   "spark.sql.autoBroadcastJoinThreshold": "10485760b",
   "spark.sql.files.maxPartitionBytes": "134217728b",
   "spark.sql.shuffle.partitions": "200"
  },
  "spark.lazy": {
   "jobs_after_action": 1,
   "jobs_after_transformations": 0,
   "jobs_before": 0
  },
  "spark.partitions": {
   "after_groupby_shuffle_partitions_200": 200,
   "after_groupby_shuffle_partitions_8": 8,
   "coalesce_2": 2,
   "csv_files_read": 1,
   "range_8": 8,
   "repartition_3": 3
  },
  "spark.shuffle_200": {
   "files": 200
  },
  "spark.shuffle_200_aqe": {
   "files": 1
  },
  "spark.shuffle_8": {
   "files": 8
  },
  "spark.skew_partition_sizes": {
   "by_key": [
    247345,
    6125,
    2448,
    8572,
    9795,
    14695,
    3673,
    7347
   ],
   "salted_32": [
    30459,
    52085,
    53106,
    37541,
    14006,
    37308,
    44764,
    30731
   ]
  },
  "stream.bronze_runs": [
   {
    "bronze_orders": 3,
    "bronze_rows": 5,
    "label": "first arrival",
    "landed": [
     {
      "file": "orders_20260314.json",
      "rows": 5
     }
    ],
    "progress": [
     {
      "batchId": 0,
      "endOffset": "{\"logOffset\": 0}",
      "numInputRows": 5,
      "startOffset": "null"
     }
    ]
   },
   {
    "bronze_orders": 5,
    "bronze_rows": 7,
    "label": "second arrival",
    "landed": [
     {
      "file": "orders_20260315.json",
      "rows": 2
     }
    ],
    "progress": [
     {
      "batchId": 1,
      "endOffset": "{\"logOffset\": 1}",
      "numInputRows": 2,
      "startOffset": "{\"logOffset\": 0}"
     }
    ]
   },
   {
    "bronze_orders": 5,
    "bronze_rows": 7,
    "label": "nothing new",
    "landed": [],
    "progress": [
     {
      "batchId": 2,
      "endOffset": "{\"logOffset\": 1}",
      "numInputRows": 0,
      "startOffset": "{\"logOffset\": 1}"
     }
    ]
   },
   {
    "bronze_orders": 10,
    "bronze_rows": 14,
    "label": "third arrival and a resend",
    "landed": [
     {
      "file": "orders_20260316_17.json",
      "rows": 5
     },
     {
      "file": "orders_20260315_resend.json",
      "rows": 2
     }
    ],
    "progress": [
     {
      "batchId": 2,
      "endOffset": "{\"logOffset\": 2}",
      "numInputRows": 7,
      "startOffset": "{\"logOffset\": 1}"
     }
    ]
   }
  ],
  "stream.silver_run_1": {
   "progress": [
    {
     "batchId": 0,
     "endOffset": "{\"sourceVersion\": 1, \"reservoirId\": \"06a81835-4c29-46ef-97bd-4752428be28d\", \"reservoirVersion\": 2, \"index\": -1, \"isStartingVersion\": false}",
     "numInputRows": 7,
     "startOffset": "null"
    }
   ],
   "silver_rows": 5
  },
  "stream.silver_run_2": {
   "progress": [
    {
     "batchId": 1,
     "endOffset": "{\"sourceVersion\": 1, \"reservoirId\": \"06a81835-4c29-46ef-97bd-4752428be28d\", \"reservoirVersion\": 3, \"index\": -1, \"isStartingVersion\": false}",
     "numInputRows": 7,
     "startOffset": "{\"sourceVersion\": 1, \"reservoirId\": \"06a81835-4c29-46ef-97bd-4752428be28d\", \"reservoirVersion\": 2, \"index\": -1, \"isStartingVersion\": false}"
    }
   ],
   "silver_rows": 10
  },
  "stream.watermark_runs": [
   {
    "dropped_by_watermark": 0,
    "emitted": [],
    "event_times": [
     "09:00",
     "09:03",
     "09:07"
    ],
    "label": "file 1",
    "rows_in": 3,
    "watermark": "2026-03-18T08:57:00.000Z"
   },
   {
    "dropped_by_watermark": 0,
    "emitted": [
     {
      "batch": 3,
      "orders": 3,
      "window_end": "2026-03-18 09:10:00",
      "window_start": "2026-03-18 09:00:00"
     }
    ],
    "event_times": [
     "09:12",
     "09:25"
    ],
    "label": "file 2",
    "rows_in": 2,
    "watermark": "2026-03-18T09:15:00.000Z"
   },
   {
    "dropped_by_watermark": 1,
    "emitted": [
     {
      "batch": 5,
      "orders": 1,
      "window_end": "2026-03-18 09:20:00",
      "window_start": "2026-03-18 09:10:00"
     }
    ],
    "event_times": [
     "09:04",
     "09:31"
    ],
    "label": "file 3, with a late event at 09:04",
    "rows_in": 2,
    "watermark": "2026-03-18T09:21:00.000Z"
   }
  ],
  "test.fail": {
   "returncode": 1
  },
  "test.pass": {
   "returncode": 0
  }
 },
 "files": {
  "delta/merge.sql": "MERGE INTO orders AS t\nUSING updates AS s\nON t.order_id = s.order_id\nWHEN MATCHED AND s._loaded_at > t._loaded_at THEN UPDATE SET *\nWHEN NOT MATCHED THEN INSERT *\n",
  "pipeline/scd2.py": "changes = spark.createDataFrame(\n    [(\"C-42\", \"Ava Martin\", \"gold\", datetime.datetime(2026, 3, 16, 8, 0)),\n     (\"C-55\", \"Mia Rossi\", \"standard\", datetime.datetime(2026, 3, 16, 8, 0))],\n    \"customer_id string, full_name string, tier string, effective_at timestamp\")\n\ndim = DeltaTable.forPath(spark, dim_path)\ncurrent = dim.toDF().filter(\"is_current\")\n\nnew_versions = (changes.alias(\"s\").join(current.alias(\"t\"), \"customer_id\")\n    .where(\"s.tier <> t.tier\")\n    .selectExpr(\"CAST(NULL AS STRING) AS merge_key\", \"s.customer_id\", \"s.full_name\", \"s.tier\", \"s.effective_at\"))\n\nstaged = new_versions.unionByName(\n    changes.selectExpr(\"customer_id AS merge_key\", \"customer_id\", \"full_name\", \"tier\", \"effective_at\"))\n\n(dim.alias(\"t\")\n    .merge(staged.alias(\"s\"), \"t.customer_id = s.merge_key AND t.is_current\")\n    .whenMatchedUpdate(condition=\"t.tier <> s.tier\", set={\"is_current\": \"false\", \"valid_to\": \"s.effective_at\"})\n    .whenNotMatchedInsert(values={\"customer_id\": \"s.customer_id\", \"full_name\": \"s.full_name\", \"tier\": \"s.tier\",\n                                  \"valid_from\": \"s.effective_at\", \"valid_to\": \"NULL\", \"is_current\": \"true\"})\n    .execute())\n",
  "stream/bronze.py": "bronze_stream = (spark.readStream\n    .format(\"json\")\n    .schema(orders_schema)\n    .load(landing)\n    .select(\"*\", F.col(\"_metadata.file_name\").alias(\"_source_file\"), F.current_timestamp().alias(\"_ingested_at\")))\n\nquery = (bronze_stream.writeStream\n    .format(\"delta\")\n    .option(\"checkpointLocation\", ckpt_bronze)\n    .trigger(availableNow=True)\n    .start(bronze))\nquery.awaitTermination()\n",
  "stream/gold.py": "gold_df = (spark.read.format(\"delta\").load(silver)\n    .filter(\"status <> 'CANCELLED'\")\n    .groupBy(F.to_date(\"order_ts\").alias(\"order_date\"))\n    .agg(F.count(\"*\").alias(\"orders\"), F.sum(\"total_usd\").alias(\"revenue_usd\")))\ngold_df.write.format(\"delta\").mode(\"overwrite\").save(gold)\n",
  "stream/silver.py": "def upsert_orders(batch_df, batch_id):\n    newest = (batch_df\n        .withColumn(\"rn\", F.row_number().over(Window.partitionBy(\"order_id\").orderBy(F.col(\"_loaded_at\").desc())))\n        .filter(\"rn = 1\").drop(\"rn\"))\n    (DeltaTable.forPath(spark, silver).alias(\"t\")\n        .merge(newest.alias(\"s\"), \"t.order_id = s.order_id\")\n        .whenMatchedUpdateAll(condition=\"s._loaded_at > t._loaded_at\")\n        .whenNotMatchedInsertAll()\n        .execute())\n\nquery = (spark.readStream.format(\"delta\").load(bronze)\n    .writeStream.foreachBatch(upsert_orders)\n    .option(\"checkpointLocation\", ckpt_silver)\n    .trigger(availableNow=True)\n    .start())\nquery.awaitTermination()\n",
  "stream/watermark.py": "events = (spark.readStream.format(\"json\").schema(\"event_time timestamp, order_id string\").load(events_dir))\n\nwindows = (events.withWatermark(\"event_time\", \"10 minutes\")\n    .groupBy(F.window(\"event_time\", \"10 minutes\"))\n    .agg(F.count(\"*\").alias(\"orders\")))\n\ndef collect_batch(batch_df, batch_id):\n    for r in batch_df.collect():\n        emitted.append({\"batch\": batch_id, \"window_start\": str(r[\"window\"][\"start\"]), \"window_end\": str(r[\"window\"][\"end\"]), \"orders\": r[\"orders\"]})\n\nquery = (windows.writeStream.outputMode(\"append\")\n    .foreachBatch(collect_batch)\n    .option(\"checkpointLocation\", ckpt_events)\n    .trigger(availableNow=True)\n    .start())\nquery.awaitTermination()\n",
  "test/conftest.py": "import pytest\nfrom pyspark.sql import SparkSession\n\n\n@pytest.fixture(scope=\"session\")\ndef spark():\n    session = (SparkSession.builder.master(\"local[2]\").appName(\"tests\")\n               .config(\"spark.sql.shuffle.partitions\", \"2\").config(\"spark.ui.enabled\", \"false\").getOrCreate())\n    yield session\n    session.stop()\n",
  "test/tests/test_transforms.py": "import datetime\nfrom decimal import Decimal\n\nfrom transforms import daily_revenue, latest_per_key\n\nSCHEMA = \"order_id string, status string, order_ts timestamp, total_usd decimal(12,2), loaded_at timestamp\"\n\n\ndef orders(spark, rows):\n    return spark.createDataFrame(rows, SCHEMA)\n\n\ndef test_latest_per_key_keeps_the_newest_version(spark):\n    df = orders(spark, [\n        (\"O-1\", \"PLACED\", datetime.datetime(2026, 3, 14, 9), Decimal(\"10.00\"), datetime.datetime(2026, 3, 14, 9, 30)),\n        (\"O-1\", \"SHIPPED\", datetime.datetime(2026, 3, 14, 9), Decimal(\"10.00\"), datetime.datetime(2026, 3, 14, 10, 30)),\n    ])\n    result = latest_per_key(df, \"order_id\", \"loaded_at\").collect()\n    assert [(r.order_id, r.status) for r in result] == [(\"O-1\", \"SHIPPED\")]\n\n\ndef test_daily_revenue_ignores_cancelled_orders(spark):\n    df = orders(spark, [\n        (\"O-1\", \"SHIPPED\", datetime.datetime(2026, 3, 14, 9), Decimal(\"10.00\"), datetime.datetime(2026, 3, 14, 10)),\n        (\"O-2\", \"CANCELLED\", datetime.datetime(2026, 3, 14, 11), Decimal(\"99.00\"), datetime.datetime(2026, 3, 14, 12)),\n    ])\n    result = daily_revenue(df).collect()\n    assert [(r.orders, r.revenue_usd) for r in result] == [(1, Decimal(\"10.00\"))]\n\n\ndef test_daily_revenue_groups_by_date(spark):\n    df = orders(spark, [\n        (\"O-1\", \"SHIPPED\", datetime.datetime(2026, 3, 14, 9), Decimal(\"10.00\"), datetime.datetime(2026, 3, 14, 10)),\n        (\"O-2\", \"SHIPPED\", datetime.datetime(2026, 3, 15, 9), Decimal(\"5.50\"), datetime.datetime(2026, 3, 15, 10)),\n    ])\n    result = {str(r.order_date): r.revenue_usd for r in daily_revenue(df).collect()}\n    assert result == {\"2026-03-14\": Decimal(\"10.00\"), \"2026-03-15\": Decimal(\"5.50\")}\n",
  "test/transforms.py": "from pyspark.sql import DataFrame, Window, functions as F\n\n\ndef latest_per_key(df: DataFrame, key: str, ts: str) -> DataFrame:\n    \"\"\"Keep the newest row for each key.\"\"\"\n    w = Window.partitionBy(key).orderBy(F.col(ts).desc())\n    return df.withColumn(\"_rn\", F.row_number().over(w)).filter(\"_rn = 1\").drop(\"_rn\")\n\n\ndef daily_revenue(orders: DataFrame) -> DataFrame:\n    \"\"\"Revenue and order count per day, without cancelled orders.\"\"\"\n    return (orders.filter(F.col(\"status\") != \"CANCELLED\")\n            .groupBy(F.to_date(\"order_ts\").alias(\"order_date\"))\n            .agg(F.count(\"*\").alias(\"orders\"), F.sum(\"total_usd\").alias(\"revenue_usd\")))\n",
  "test/transforms_bug.py": "from pyspark.sql import DataFrame, Window, functions as F\n\n\ndef latest_per_key(df: DataFrame, key: str, ts: str) -> DataFrame:\n    \"\"\"Keep the newest row for each key.\"\"\"\n    w = Window.partitionBy(key).orderBy(F.col(ts).desc())\n    return df.withColumn(\"_rn\", F.row_number().over(w)).filter(\"_rn = 1\").drop(\"_rn\")\n\n\ndef daily_revenue(orders: DataFrame) -> DataFrame:\n    \"\"\"Revenue and order count per day, without cancelled orders.\"\"\"\n    return (orders.filter(F.col(\"status\") != \"CANCELED\")\n            .groupBy(F.to_date(\"order_ts\").alias(\"order_date\"))\n            .agg(F.count(\"*\").alias(\"orders\"), F.sum(\"total_usd\").alias(\"revenue_usd\")))\n"
 },
 "history": {
  "delta.dv_off": [
   {
    "isBlindAppend": true,
    "operation": "WRITE",
    "operationMetrics": {
     "numFiles": "1",
     "numOutputBytes": "1878",
     "numOutputRows": "3"
    },
    "operationParameters": {
     "mode": "ErrorIfExists",
     "partitionBy": "[]"
    },
    "version": 0
   },
   {
    "isBlindAppend": false,
    "operation": "DELETE",
    "operationMetrics": {
     "numAddedBytes": "1775",
     "numAddedChangeFiles": "0",
     "numAddedFiles": "1",
     "numCopiedRows": "2",
     "numDeletedRows": "1",
     "numDeletionVectorsAdded": "0",
     "numDeletionVectorsRemoved": "0",
     "numDeletionVectorsUpdated": "0",
     "numRemovedBytes": "1878",
     "numRemovedFiles": "1"
    },
    "operationParameters": {
     "predicate": "[\"(order_id = O-5003)\"]"
    },
    "version": 1
   }
  ],
  "delta.dv_on": [
   {
    "isBlindAppend": true,
    "operation": "WRITE",
    "operationMetrics": {
     "numFiles": "1",
     "numOutputBytes": "1878",
     "numOutputRows": "3"
    },
    "operationParameters": {
     "mode": "ErrorIfExists",
     "partitionBy": "[]"
    },
    "version": 0
   },
   {
    "isBlindAppend": false,
    "operation": "DELETE",
    "operationMetrics": {
     "numAddedBytes": "0",
     "numAddedChangeFiles": "0",
     "numAddedFiles": "0",
     "numCopiedRows": "0",
     "numDeletedRows": "1",
     "numDeletionVectorsAdded": "1",
     "numDeletionVectorsRemoved": "0",
     "numDeletionVectorsUpdated": "0",
     "numRemovedBytes": "0",
     "numRemovedFiles": "0"
    },
    "operationParameters": {
     "predicate": "[\"(order_id = O-5003)\"]"
    },
    "version": 1
   }
  ],
  "delta.orders": [
   {
    "isBlindAppend": true,
    "operation": "WRITE",
    "operationMetrics": {
     "numFiles": "1",
     "numOutputBytes": "1878",
     "numOutputRows": "3"
    },
    "operationParameters": {
     "mode": "ErrorIfExists",
     "partitionBy": "[]"
    },
    "version": 0
   },
   {
    "isBlindAppend": true,
    "operation": "WRITE",
    "operationMetrics": {
     "numFiles": "1",
     "numOutputBytes": "1786",
     "numOutputRows": "2"
    },
    "operationParameters": {
     "mode": "Append",
     "partitionBy": "[]"
    },
    "version": 1
   },
   {
    "isBlindAppend": false,
    "operation": "UPDATE",
    "operationMetrics": {
     "numAddedBytes": "1886",
     "numAddedChangeFiles": "0",
     "numAddedFiles": "1",
     "numCopiedRows": "2",
     "numDeletionVectorsAdded": "0",
     "numDeletionVectorsRemoved": "0",
     "numDeletionVectorsUpdated": "0",
     "numRemovedBytes": "1878",
     "numRemovedFiles": "1",
     "numUpdatedRows": "1"
    },
    "operationParameters": {
     "predicate": "[\"(order_id = O-5002)\"]"
    },
    "version": 2
   },
   {
    "isBlindAppend": false,
    "operation": "DELETE",
    "operationMetrics": {
     "numAddedBytes": "1892",
     "numAddedChangeFiles": "0",
     "numAddedFiles": "1",
     "numCopiedRows": "1",
     "numDeletedRows": "1",
     "numDeletionVectorsAdded": "0",
     "numDeletionVectorsRemoved": "0",
     "numDeletionVectorsUpdated": "0",
     "numRemovedBytes": "1786",
     "numRemovedFiles": "1"
    },
    "operationParameters": {
     "predicate": "[\"(status = CANCELLED)\"]"
    },
    "version": 3
   },
   {
    "isBlindAppend": false,
    "operation": "MERGE",
    "operationMetrics": {
     "numOutputRows": "5",
     "numSourceRows": "5",
     "numTargetBytesAdded": "5635",
     "numTargetBytesRemoved": "0",
     "numTargetChangeFilesAdded": "0",
     "numTargetDeletionVectorsAdded": "0",
     "numTargetDeletionVectorsRemoved": "0",
     "numTargetDeletionVectorsUpdated": "0",
     "numTargetFilesAdded": "3",
     "numTargetFilesRemoved": "0",
     "numTargetRowsCopied": "0",
     "numTargetRowsDeleted": "0",
     "numTargetRowsInserted": "5",
     "numTargetRowsMatchedDeleted": "0",
     "numTargetRowsMatchedUpdated": "0",
     "numTargetRowsNotMatchedBySourceDeleted": "0",
     "numTargetRowsNotMatchedBySourceUpdated": "0",
     "numTargetRowsUpdated": "0"
    },
    "operationParameters": {
     "matchedPredicates": "[{\"predicate\":\"(_loaded_at > _loaded_at)\",\"actionType\":\"update\"}]",
     "notMatchedBySourcePredicates": "[]",
     "notMatchedPredicates": "[{\"actionType\":\"insert\"}]",
     "predicate": "[\"(order_id = order_id)\"]"
    },
    "version": 4
   },
   {
    "isBlindAppend": false,
    "operation": "OPTIMIZE",
    "operationMetrics": {
     "maxFileSize": "2085",
     "minFileSize": "2085",
     "numAddedBytes": "2085",
     "numAddedFiles": "1",
     "numDeletionVectorsRemoved": "0",
     "numRemovedBytes": "9413",
     "numRemovedFiles": "5",
     "p25FileSize": "2085",
     "p50FileSize": "2085",
     "p75FileSize": "2085"
    },
    "operationParameters": {
     "auto": "false",
     "clusterBy": "[]",
     "predicate": "[]",
     "zOrderBy": "[]"
    },
    "version": 5
   }
  ],
  "delta.orders_after_restore": [
   {
    "isBlindAppend": true,
    "operation": "WRITE",
    "operationMetrics": {
     "numFiles": "1",
     "numOutputBytes": "1878",
     "numOutputRows": "3"
    },
    "operationParameters": {
     "mode": "ErrorIfExists",
     "partitionBy": "[]"
    },
    "version": 0
   },
   {
    "isBlindAppend": true,
    "operation": "WRITE",
    "operationMetrics": {
     "numFiles": "1",
     "numOutputBytes": "1786",
     "numOutputRows": "2"
    },
    "operationParameters": {
     "mode": "Append",
     "partitionBy": "[]"
    },
    "version": 1
   },
   {
    "isBlindAppend": false,
    "operation": "UPDATE",
    "operationMetrics": {
     "numAddedBytes": "1886",
     "numAddedChangeFiles": "0",
     "numAddedFiles": "1",
     "numCopiedRows": "2",
     "numDeletionVectorsAdded": "0",
     "numDeletionVectorsRemoved": "0",
     "numDeletionVectorsUpdated": "0",
     "numRemovedBytes": "1878",
     "numRemovedFiles": "1",
     "numUpdatedRows": "1"
    },
    "operationParameters": {
     "predicate": "[\"(order_id = O-5002)\"]"
    },
    "version": 2
   },
   {
    "isBlindAppend": false,
    "operation": "DELETE",
    "operationMetrics": {
     "numAddedBytes": "1892",
     "numAddedChangeFiles": "0",
     "numAddedFiles": "1",
     "numCopiedRows": "1",
     "numDeletedRows": "1",
     "numDeletionVectorsAdded": "0",
     "numDeletionVectorsRemoved": "0",
     "numDeletionVectorsUpdated": "0",
     "numRemovedBytes": "1786",
     "numRemovedFiles": "1"
    },
    "operationParameters": {
     "predicate": "[\"(status = CANCELLED)\"]"
    },
    "version": 3
   },
   {
    "isBlindAppend": false,
    "operation": "MERGE",
    "operationMetrics": {
     "numOutputRows": "5",
     "numSourceRows": "5",
     "numTargetBytesAdded": "5635",
     "numTargetBytesRemoved": "0",
     "numTargetChangeFilesAdded": "0",
     "numTargetDeletionVectorsAdded": "0",
     "numTargetDeletionVectorsRemoved": "0",
     "numTargetDeletionVectorsUpdated": "0",
     "numTargetFilesAdded": "3",
     "numTargetFilesRemoved": "0",
     "numTargetRowsCopied": "0",
     "numTargetRowsDeleted": "0",
     "numTargetRowsInserted": "5",
     "numTargetRowsMatchedDeleted": "0",
     "numTargetRowsMatchedUpdated": "0",
     "numTargetRowsNotMatchedBySourceDeleted": "0",
     "numTargetRowsNotMatchedBySourceUpdated": "0",
     "numTargetRowsUpdated": "0"
    },
    "operationParameters": {
     "matchedPredicates": "[{\"predicate\":\"(_loaded_at > _loaded_at)\",\"actionType\":\"update\"}]",
     "notMatchedBySourcePredicates": "[]",
     "notMatchedPredicates": "[{\"actionType\":\"insert\"}]",
     "predicate": "[\"(order_id = order_id)\"]"
    },
    "version": 4
   },
   {
    "isBlindAppend": false,
    "operation": "OPTIMIZE",
    "operationMetrics": {
     "maxFileSize": "2085",
     "minFileSize": "2085",
     "numAddedBytes": "2085",
     "numAddedFiles": "1",
     "numDeletionVectorsRemoved": "0",
     "numRemovedBytes": "9413",
     "numRemovedFiles": "5",
     "p25FileSize": "2085",
     "p50FileSize": "2085",
     "p75FileSize": "2085"
    },
    "operationParameters": {
     "auto": "false",
     "clusterBy": "[]",
     "predicate": "[]",
     "zOrderBy": "[]"
    },
    "version": 5
   },
   {
    "isBlindAppend": false,
    "operation": "RESTORE",
    "operationMetrics": {
     "numOfFilesAfterRestore": "2",
     "numRemovedFiles": "1",
     "numRestoredFiles": "2",
     "removedFilesSize": "2085",
     "restoredFilesSize": "3664",
     "tableSizeAfterRestore": "3664"
    },
    "operationParameters": {
     "timestamp": null,
     "version": "1"
    },
    "version": 6
   }
  ],
  "layout.small_history": [
   {
    "isBlindAppend": true,
    "operation": "WRITE",
    "operationMetrics": {
     "numFiles": "1",
     "numOutputBytes": "1639",
     "numOutputRows": "50"
    },
    "operationParameters": {
     "mode": "Append",
     "partitionBy": "[]"
    },
    "version": 39
   },
   {
    "isBlindAppend": false,
    "operation": "OPTIMIZE",
    "operationMetrics": {
     "maxFileSize": "10878",
     "minFileSize": "10878",
     "numAddedBytes": "10878",
     "numAddedFiles": "1",
     "numDeletionVectorsRemoved": "0",
     "numRemovedBytes": "65499",
     "numRemovedFiles": "40",
     "p25FileSize": "10878",
     "p50FileSize": "10878",
     "p75FileSize": "10878"
    },
    "operationParameters": {
     "auto": "false",
     "clusterBy": "[]",
     "predicate": "[]",
     "zOrderBy": "[]"
    },
    "version": 40
   }
  ],
  "layout.vacuum": [
   {
    "isBlindAppend": true,
    "operation": "VACUUM START",
    "operationMetrics": {
     "numFilesToDelete": "2",
     "sizeOfDataToDelete": "8594"
    },
    "operationParameters": {
     "defaultRetentionMillis": "604800000",
     "retentionCheckEnabled": "false",
     "specifiedRetentionMillis": "0"
    },
    "version": 3
   },
   {
    "isBlindAppend": true,
    "operation": "VACUUM END",
    "operationMetrics": {
     "numDeletedFiles": "2",
     "numVacuumedDirectories": "1"
    },
    "operationParameters": {
     "status": "COMPLETED"
    },
    "version": 4
   }
  ],
  "layout.zorder": [
   {
    "isBlindAppend": false,
    "operation": "OPTIMIZE",
    "operationMetrics": {
     "maxFileSize": "1099755",
     "minFileSize": "929598",
     "numAddedBytes": "3046163",
     "numAddedFiles": "3",
     "numDeletionVectorsRemoved": "0",
     "numRemovedBytes": "3247724",
     "numRemovedFiles": "16",
     "p25FileSize": "929598",
     "p50FileSize": "1016810",
     "p75FileSize": "1099755"
    },
    "operationParameters": {
     "auto": "false",
     "clusterBy": "[]",
     "predicate": "[]",
     "zOrderBy": "[\"customer_id\"]"
    },
    "version": 1
   }
  ],
  "pipeline.dim_history": [
   {
    "isBlindAppend": true,
    "operation": "WRITE",
    "operationMetrics": {
     "numFiles": "1",
     "numOutputBytes": "1802",
     "numOutputRows": "4"
    },
    "operationParameters": {
     "mode": "ErrorIfExists",
     "partitionBy": "[]"
    },
    "version": 0
   },
   {
    "isBlindAppend": false,
    "operation": "MERGE",
    "operationMetrics": {
     "numOutputRows": "6",
     "numSourceRows": "3",
     "numTargetBytesAdded": "7162",
     "numTargetBytesRemoved": "1802",
     "numTargetChangeFilesAdded": "0",
     "numTargetDeletionVectorsAdded": "0",
     "numTargetDeletionVectorsRemoved": "0",
     "numTargetDeletionVectorsUpdated": "0",
     "numTargetFilesAdded": "4",
     "numTargetFilesRemoved": "1",
     "numTargetRowsCopied": "3",
     "numTargetRowsDeleted": "0",
     "numTargetRowsInserted": "2",
     "numTargetRowsMatchedDeleted": "0",
     "numTargetRowsMatchedUpdated": "1",
     "numTargetRowsNotMatchedBySourceDeleted": "0",
     "numTargetRowsNotMatchedBySourceUpdated": "0",
     "numTargetRowsUpdated": "1"
    },
    "operationParameters": {
     "matchedPredicates": "[{\"predicate\":\"NOT (tier = tier)\",\"actionType\":\"update\"}]",
     "notMatchedBySourcePredicates": "[]",
     "notMatchedPredicates": "[{\"actionType\":\"insert\"}]",
     "predicate": "[\"((customer_id = merge_key) AND is_current)\"]"
    },
    "version": 1
   }
  ],
  "stream.bronze_history": [
   {
    "isBlindAppend": true,
    "operation": "STREAMING UPDATE",
    "operationMetrics": {
     "numAddedFiles": "1",
     "numOutputBytes": "2660",
     "numOutputRows": "5",
     "numRemovedFiles": "0"
    },
    "operationParameters": {
     "epochId": "0",
     "outputMode": "Append",
     "queryId": "b047779d-02d2-4689-add1-3d810bdbc4bf"
    },
    "version": 0
   },
   {
    "isBlindAppend": true,
    "operation": "STREAMING UPDATE",
    "operationMetrics": {
     "numAddedFiles": "1",
     "numOutputBytes": "2492",
     "numOutputRows": "2",
     "numRemovedFiles": "0"
    },
    "operationParameters": {
     "epochId": "1",
     "outputMode": "Append",
     "queryId": "b047779d-02d2-4689-add1-3d810bdbc4bf"
    },
    "version": 1
   },
   {
    "isBlindAppend": true,
    "operation": "STREAMING UPDATE",
    "operationMetrics": {
     "numAddedFiles": "2",
     "numOutputBytes": "5226",
     "numOutputRows": "7",
     "numRemovedFiles": "0"
    },
    "operationParameters": {
     "epochId": "2",
     "outputMode": "Append",
     "queryId": "b047779d-02d2-4689-add1-3d810bdbc4bf"
    },
    "version": 2
   }
  ],
  "stream.silver_history": [
   {
    "isBlindAppend": true,
    "operation": "WRITE",
    "operationMetrics": {
     "numFiles": "1",
     "numOutputBytes": "977",
     "numOutputRows": "0"
    },
    "operationParameters": {
     "mode": "ErrorIfExists",
     "partitionBy": "[]"
    },
    "version": 0
   },
   {
    "isBlindAppend": false,
    "operation": "MERGE",
    "operationMetrics": {
     "numOutputRows": "5",
     "numSourceRows": "5",
     "numTargetBytesAdded": "12826",
     "numTargetBytesRemoved": "0",
     "numTargetChangeFilesAdded": "0",
     "numTargetDeletionVectorsAdded": "0",
     "numTargetDeletionVectorsRemoved": "0",
     "numTargetDeletionVectorsUpdated": "0",
     "numTargetFilesAdded": "5",
     "numTargetFilesRemoved": "0",
     "numTargetRowsCopied": "0",
     "numTargetRowsDeleted": "0",
     "numTargetRowsInserted": "5",
     "numTargetRowsMatchedDeleted": "0",
     "numTargetRowsMatchedUpdated": "0",
     "numTargetRowsNotMatchedBySourceDeleted": "0",
     "numTargetRowsNotMatchedBySourceUpdated": "0",
     "numTargetRowsUpdated": "0"
    },
    "operationParameters": {
     "matchedPredicates": "[{\"predicate\":\"(_loaded_at > _loaded_at)\",\"actionType\":\"update\"}]",
     "notMatchedBySourcePredicates": "[]",
     "notMatchedPredicates": "[{\"actionType\":\"insert\"}]",
     "predicate": "[\"(order_id = order_id)\"]"
    },
    "version": 1
   },
   {
    "isBlindAppend": false,
    "operation": "MERGE",
    "operationMetrics": {
     "numOutputRows": "7",
     "numSourceRows": "7",
     "numTargetBytesAdded": "10116",
     "numTargetBytesRemoved": "5140",
     "numTargetChangeFilesAdded": "0",
     "numTargetDeletionVectorsAdded": "0",
     "numTargetDeletionVectorsRemoved": "0",
     "numTargetDeletionVectorsUpdated": "0",
     "numTargetFilesAdded": "4",
     "numTargetFilesRemoved": "2",
     "numTargetRowsCopied": "2",
     "numTargetRowsDeleted": "0",
     "numTargetRowsInserted": "5",
     "numTargetRowsMatchedDeleted": "0",
     "numTargetRowsMatchedUpdated": "0",
     "numTargetRowsNotMatchedBySourceDeleted": "0",
     "numTargetRowsNotMatchedBySourceUpdated": "0",
     "numTargetRowsUpdated": "0"
    },
    "operationParameters": {
     "matchedPredicates": "[{\"predicate\":\"(_loaded_at > _loaded_at)\",\"actionType\":\"update\"}]",
     "notMatchedBySourcePredicates": "[]",
     "notMatchedPredicates": "[{\"actionType\":\"insert\"}]",
     "predicate": "[\"(order_id = order_id)\"]"
    },
    "version": 2
   }
  ]
 },
 "listing": {
  "delta.after_v0": {
   "files": [
    "part-0001.snappy.parquet"
   ],
   "log": [
    "00000000000000000000.crc",
    "00000000000000000000.json",
    "_staged_commits"
   ]
  },
  "delta.after_v5": {
   "files": [
    "part-0001.snappy.parquet",
    "part-0002.snappy.parquet",
    "part-0003.snappy.parquet",
    "part-0004.snappy.parquet",
    "part-0005.snappy.parquet",
    "part-0006.snappy.parquet",
    "part-0007.snappy.parquet",
    "part-0008.snappy.parquet",
    "part-0009.snappy.parquet"
   ],
   "log": [
    "00000000000000000000.crc",
    "00000000000000000000.json",
    "00000000000000000001.crc",
    "00000000000000000001.json",
    "00000000000000000002.crc",
    "00000000000000000002.json",
    "00000000000000000003.crc",
    "00000000000000000003.json",
    "00000000000000000004.crc",
    "00000000000000000004.json",
    "00000000000000000005.crc",
    "00000000000000000005.json",
    "_staged_commits"
   ]
  },
  "stream.checkpoint_bronze": {
   "commits": [
    "0"
   ],
   "entries": [
    "commits",
    "metadata",
    "offsets",
    "sources"
   ],
   "offset_0_last_line": "{\"logOffset\":0}",
   "offsets": [
    "0"
   ]
  }
 },
 "logs": {
  "delta.clone": [
   {
    "actions": [
     {
      "body": {
       "engineInfo": "Apache-Spark/4.2.0 Delta-Lake/4.4.1",
       "isBlindAppend": false,
       "isolationLevel": "Serializable",
       "operation": "CLONE",
       "operationMetrics": {
        "copiedFilesSize": "0",
        "numCopiedFiles": "0",
        "numRemovedFiles": "0",
        "removedFilesSize": "0",
        "sourceNumOfFiles": "2",
        "sourceTableSize": "3664"
       },
       "operationParameters": {
        "source": "delta.`file:/tmp/db-capture-f23vdx9f/delta/orders`",
        "sourceVersion": 6
       },
       "readVersion": -1,
       "timestamp": 1773478800000
      },
      "kind": "commitInfo"
     },
     {
      "body": {
       "configuration": {},
       "createdTime": 1773478800000,
       "format": {
        "options": {},
        "provider": "parquet"
       },
       "id": "<table id>",
       "partitionColumns": [],
       "schemaString": "{\"type\":\"struct\",\"fields\":[{\"name\":\"order_id\",\"type\":\"string\",\"nullable\":true,\"metadata\":{}},{\"name\":\"customer_id\",\"type\":\"string\",\"nullable\":true,\"metadata\":{}},{\"name\":\"order_ts\",\"type\":\"timestamp\",\"nullable\":true,\"metadata\":{}},{\"name\":\"status\",\"type\":\"string\",\"nullable\":true,\"metadata\":{}},{\"name\":\"total_usd\",\"type\":\"decimal(12,2)\",\"nullable\":true,\"metadata\":{}},{\"name\":\"_loaded_at\",\"type\":\"timestamp\",\"nullable\":true,\"metadata\":{}}]}"
      },
      "kind": "metaData"
     },
     {
      "body": {
       "dataChange": true,
       "modificationTime": 1773478800000,
       "partitionValues": {},
       "path": "part-0001.snappy.parquet",
       "size": 1786,
       "stats": "{\"numRecords\":2,\"minValues\":{\"order_id\":\"O-5004\",\"customer_id\":\"C-12\",\"order_ts\":\"2026-03-15T11:20:00.000Z\",\"status\":\"CANCELLED\",\"total_usd\":29.00,\"_loaded_at\":\"2026-03-15T12:00:05.000Z\"},\"maxValues\":{\"order_id\":\"O-5005\",\"customer_id\":\"C-91\",\"order_ts\":\"2026-03-15T14:05:00.000Z\",\"status\":\"SHIPPED\",\"total_usd\":55.00,\"_loaded_at\":\"2026-03-15T15:00:11.000Z\"},\"nullCount\":{\"order_id\":0,\"customer_id\":0,\"order_ts\":0,\"status\":0,\"total_usd\":0,\"_loaded_at\":0}}"
      },
      "kind": "add"
     },
     {
      "body": {
       "dataChange": true,
       "modificationTime": 1773478800000,
       "partitionValues": {},
       "path": "part-0002.snappy.parquet",
       "size": 1878,
       "stats": "{\"numRecords\":3,\"minValues\":{\"order_id\":\"O-5001\",\"customer_id\":\"C-42\",\"order_ts\":\"2026-03-14T09:12:00.000Z\",\"status\":\"PLACED\",\"total_usd\":12.50,\"_loaded_at\":\"2026-03-14T09:31:07.000Z\"},\"maxValues\":{\"order_id\":\"O-5003\",\"customer_id\":\"C-77\",\"order_ts\":\"2026-03-14T10:02:00.000Z\",\"status\":\"SHIPPED\",\"total_usd\":67.00,\"_loaded_at\":\"2026-03-14T11:31:20.000Z\"},\"nullCount\":{\"order_id\":0,\"customer_id\":0,\"order_ts\":0,\"status\":0,\"total_usd\":0,\"_loaded_at\":0}}"
      },
      "kind": "add"
     },
     {
      "body": {
       "minReaderVersion": 1,
       "minWriterVersion": 2
      },
      "kind": "protocol"
     }
    ],
    "version": 0
   }
  ],
  "delta.dv_off_delete": {
   "actions": [
    {
     "body": {
      "engineInfo": "Apache-Spark/4.2.0 Delta-Lake/4.4.1",
      "isBlindAppend": false,
      "isolationLevel": "Serializable",
      "operation": "DELETE",
      "operationMetrics": {
       "numAddedBytes": "1775",
       "numAddedChangeFiles": "0",
       "numAddedFiles": "1",
       "numCopiedRows": "2",
       "numDeletedRows": "1",
       "numDeletionVectorsAdded": "0",
       "numDeletionVectorsRemoved": "0",
       "numDeletionVectorsUpdated": "0",
       "numRemovedBytes": "1878",
       "numRemovedFiles": "1"
      },
      "operationParameters": {
       "predicate": "[\"(order_id#23647 = O-5003)\"]"
      },
      "readVersion": 0,
      "timestamp": 1773478860000
     },
     "kind": "commitInfo"
    },
    {
     "body": {
      "dataChange": true,
      "deletionTimestamp": 1773478860000,
      "extendedFileMetadata": true,
      "partitionValues": {},
      "path": "part-0001.snappy.parquet",
      "size": 1878
     },
     "kind": "remove"
    },
    {
     "body": {
      "dataChange": true,
      "modificationTime": 1773478860000,
      "partitionValues": {},
      "path": "part-0002.snappy.parquet",
      "size": 1775,
      "stats": "{\"numRecords\":2,\"minValues\":{\"order_id\":\"O-5001\",\"customer_id\":\"C-42\",\"order_ts\":\"2026-03-14T09:12:00.000Z\",\"status\":\"PLACED\",\"total_usd\":12.50,\"_loaded_at\":\"2026-03-14T09:31:07.000Z\"},\"maxValues\":{\"order_id\":\"O-5002\",\"customer_id\":\"C-77\",\"order_ts\":\"2026-03-14T09:15:00.000Z\",\"status\":\"SHIPPED\",\"total_usd\":67.00,\"_loaded_at\":\"2026-03-14T10:31:44.000Z\"},\"nullCount\":{\"order_id\":0,\"customer_id\":0,\"order_ts\":0,\"status\":0,\"total_usd\":0,\"_loaded_at\":0}}"
     },
     "kind": "add"
    }
   ],
   "version": 1
  },
  "delta.dv_on_delete": {
   "actions": [
    {
     "body": {
      "engineInfo": "Apache-Spark/4.2.0 Delta-Lake/4.4.1",
      "isBlindAppend": false,
      "isolationLevel": "Serializable",
      "operation": "DELETE",
      "operationMetrics": {
       "numAddedBytes": "0",
       "numAddedChangeFiles": "0",
       "numAddedFiles": "0",
       "numCopiedRows": "0",
       "numDeletedRows": "1",
       "numDeletionVectorsAdded": "1",
       "numDeletionVectorsRemoved": "0",
       "numDeletionVectorsUpdated": "0",
       "numRemovedBytes": "0",
       "numRemovedFiles": "0"
      },
      "operationParameters": {
       "predicate": "[\"(order_id#25479 = O-5003)\"]"
      },
      "readVersion": 0,
      "timestamp": 1773478860000
     },
     "kind": "commitInfo"
    },
    {
     "body": {
      "dataChange": true,
      "deletionVector": {
       "cardinality": 1,
       "offset": 1,
       "pathOrInlineDv": "<encoded>",
       "sizeInBytes": 34,
       "storageType": "u"
      },
      "modificationTime": 1773478860000,
      "partitionValues": {},
      "path": "part-0001.snappy.parquet",
      "size": 1878,
      "stats": "{\"numRecords\":3,\"minValues\":{\"order_id\":\"O-5001\",\"customer_id\":\"C-42\",\"order_ts\":\"2026-03-14T09:12:00.000Z\",\"status\":\"PLACED\",\"total_usd\":12.50,\"_loaded_at\":\"2026-03-14T09:31:07.000Z\"},\"maxValues\":{\"order_id\":\"O-5003\",\"customer_id\":\"C-77\",\"order_ts\":\"2026-03-14T10:02:00.000Z\",\"status\":\"SHIPPED\",\"total_usd\":67.00,\"_loaded_at\":\"2026-03-14T11:31:20.000Z\"},\"nullCount\":{\"order_id\":0,\"customer_id\":0,\"order_ts\":0,\"status\":0,\"total_usd\":0,\"_loaded_at\":0},\"tightBounds\":false}"
     },
     "kind": "add"
    },
    {
     "body": {
      "dataChange": true,
      "deletionTimestamp": 1773478860000,
      "extendedFileMetadata": true,
      "partitionValues": {},
      "path": "part-0001.snappy.parquet",
      "size": 1878,
      "stats": "{\"numRecords\":3}"
     },
     "kind": "remove"
    }
   ],
   "version": 1
  },
  "delta.orders": [
   {
    "actions": [
     {
      "body": {
       "engineInfo": "Apache-Spark/4.2.0 Delta-Lake/4.4.1",
       "isBlindAppend": true,
       "isolationLevel": "Serializable",
       "operation": "WRITE",
       "operationMetrics": {
        "numFiles": "1",
        "numOutputBytes": "1878",
        "numOutputRows": "3"
       },
       "operationParameters": {
        "mode": "ErrorIfExists",
        "partitionBy": "[]"
       },
       "timestamp": 1773478800000
      },
      "kind": "commitInfo"
     },
     {
      "body": {
       "configuration": {},
       "createdTime": 1773478800000,
       "format": {
        "options": {},
        "provider": "parquet"
       },
       "id": "<table id>",
       "partitionColumns": [],
       "schemaString": "{\"type\":\"struct\",\"fields\":[{\"name\":\"order_id\",\"type\":\"string\",\"nullable\":true,\"metadata\":{}},{\"name\":\"customer_id\",\"type\":\"string\",\"nullable\":true,\"metadata\":{}},{\"name\":\"order_ts\",\"type\":\"timestamp\",\"nullable\":true,\"metadata\":{}},{\"name\":\"status\",\"type\":\"string\",\"nullable\":true,\"metadata\":{}},{\"name\":\"total_usd\",\"type\":\"decimal(12,2)\",\"nullable\":true,\"metadata\":{}},{\"name\":\"_loaded_at\",\"type\":\"timestamp\",\"nullable\":true,\"metadata\":{}}]}"
      },
      "kind": "metaData"
     },
     {
      "body": {
       "minReaderVersion": 1,
       "minWriterVersion": 2
      },
      "kind": "protocol"
     },
     {
      "body": {
       "dataChange": true,
       "modificationTime": 1773478800000,
       "partitionValues": {},
       "path": "part-0001.snappy.parquet",
       "size": 1878,
       "stats": "{\"numRecords\":3,\"minValues\":{\"order_id\":\"O-5001\",\"customer_id\":\"C-42\",\"order_ts\":\"2026-03-14T09:12:00.000Z\",\"status\":\"PLACED\",\"total_usd\":12.50,\"_loaded_at\":\"2026-03-14T09:31:07.000Z\"},\"maxValues\":{\"order_id\":\"O-5003\",\"customer_id\":\"C-77\",\"order_ts\":\"2026-03-14T10:02:00.000Z\",\"status\":\"SHIPPED\",\"total_usd\":67.00,\"_loaded_at\":\"2026-03-14T11:31:20.000Z\"},\"nullCount\":{\"order_id\":0,\"customer_id\":0,\"order_ts\":0,\"status\":0,\"total_usd\":0,\"_loaded_at\":0}}"
      },
      "kind": "add"
     }
    ],
    "version": 0
   },
   {
    "actions": [
     {
      "body": {
       "engineInfo": "Apache-Spark/4.2.0 Delta-Lake/4.4.1",
       "isBlindAppend": true,
       "isolationLevel": "Serializable",
       "operation": "WRITE",
       "operationMetrics": {
        "numFiles": "1",
        "numOutputBytes": "1786",
        "numOutputRows": "2"
       },
       "operationParameters": {
        "mode": "Append",
        "partitionBy": "[]"
       },
       "readVersion": 0,
       "timestamp": 1773478860000
      },
      "kind": "commitInfo"
     },
     {
      "body": {
       "dataChange": true,
       "modificationTime": 1773478860000,
       "partitionValues": {},
       "path": "part-0002.snappy.parquet",
       "size": 1786,
       "stats": "{\"numRecords\":2,\"minValues\":{\"order_id\":\"O-5004\",\"customer_id\":\"C-12\",\"order_ts\":\"2026-03-15T11:20:00.000Z\",\"status\":\"CANCELLED\",\"total_usd\":29.00,\"_loaded_at\":\"2026-03-15T12:00:05.000Z\"},\"maxValues\":{\"order_id\":\"O-5005\",\"customer_id\":\"C-91\",\"order_ts\":\"2026-03-15T14:05:00.000Z\",\"status\":\"SHIPPED\",\"total_usd\":55.00,\"_loaded_at\":\"2026-03-15T15:00:11.000Z\"},\"nullCount\":{\"order_id\":0,\"customer_id\":0,\"order_ts\":0,\"status\":0,\"total_usd\":0,\"_loaded_at\":0}}"
      },
      "kind": "add"
     }
    ],
    "version": 1
   },
   {
    "actions": [
     {
      "body": {
       "engineInfo": "Apache-Spark/4.2.0 Delta-Lake/4.4.1",
       "isBlindAppend": false,
       "isolationLevel": "Serializable",
       "operation": "UPDATE",
       "operationMetrics": {
        "numAddedBytes": "1886",
        "numAddedChangeFiles": "0",
        "numAddedFiles": "1",
        "numCopiedRows": "2",
        "numDeletionVectorsAdded": "0",
        "numDeletionVectorsRemoved": "0",
        "numDeletionVectorsUpdated": "0",
        "numRemovedBytes": "1878",
        "numRemovedFiles": "1",
        "numUpdatedRows": "1"
       },
       "operationParameters": {
        "predicate": "[\"(order_id#1702 = O-5002)\"]"
       },
       "readVersion": 1,
       "timestamp": 1773478920000
      },
      "kind": "commitInfo"
     },
     {
      "body": {
       "dataChange": true,
       "modificationTime": 1773478920000,
       "partitionValues": {},
       "path": "part-0003.snappy.parquet",
       "size": 1886,
       "stats": "{\"numRecords\":3,\"minValues\":{\"order_id\":\"O-5001\",\"customer_id\":\"C-42\",\"order_ts\":\"2026-03-14T09:12:00.000Z\",\"status\":\"SHIPPED\",\"total_usd\":12.50,\"_loaded_at\":\"2026-03-14T09:31:07.000Z\"},\"maxValues\":{\"order_id\":\"O-5003\",\"customer_id\":\"C-77\",\"order_ts\":\"2026-03-14T10:02:00.000Z\",\"status\":\"SHIPPED\",\"total_usd\":67.00,\"_loaded_at\":\"2026-03-14T11:31:20.000Z\"},\"nullCount\":{\"order_id\":0,\"customer_id\":0,\"order_ts\":0,\"status\":0,\"total_usd\":0,\"_loaded_at\":0}}"
      },
      "kind": "add"
     },
     {
      "body": {
       "dataChange": true,
       "deletionTimestamp": 1773478920000,
       "extendedFileMetadata": true,
       "partitionValues": {},
       "path": "part-0001.snappy.parquet",
       "size": 1878
      },
      "kind": "remove"
     }
    ],
    "version": 2
   },
   {
    "actions": [
     {
      "body": {
       "engineInfo": "Apache-Spark/4.2.0 Delta-Lake/4.4.1",
       "isBlindAppend": false,
       "isolationLevel": "Serializable",
       "operation": "DELETE",
       "operationMetrics": {
        "numAddedBytes": "1892",
        "numAddedChangeFiles": "0",
        "numAddedFiles": "1",
        "numCopiedRows": "1",
        "numDeletedRows": "1",
        "numDeletionVectorsAdded": "0",
        "numDeletionVectorsRemoved": "0",
        "numDeletionVectorsUpdated": "0",
        "numRemovedBytes": "1786",
        "numRemovedFiles": "1"
       },
       "operationParameters": {
        "predicate": "[\"(status#2942 = CANCELLED)\"]"
       },
       "readVersion": 2,
       "timestamp": 1773478980000
      },
      "kind": "commitInfo"
     },
     {
      "body": {
       "dataChange": true,
       "deletionTimestamp": 1773478980000,
       "extendedFileMetadata": true,
       "partitionValues": {},
       "path": "part-0002.snappy.parquet",
       "size": 1786
      },
      "kind": "remove"
     },
     {
      "body": {
       "dataChange": true,
       "modificationTime": 1773478980000,
       "partitionValues": {},
       "path": "part-0004.snappy.parquet",
       "size": 1892,
       "stats": "{\"numRecords\":1,\"minValues\":{\"order_id\":\"O-5004\",\"customer_id\":\"C-91\",\"order_ts\":\"2026-03-15T11:20:00.000Z\",\"status\":\"SHIPPED\",\"total_usd\":55.00,\"_loaded_at\":\"2026-03-15T12:00:05.000Z\"},\"maxValues\":{\"order_id\":\"O-5004\",\"customer_id\":\"C-91\",\"order_ts\":\"2026-03-15T11:20:00.000Z\",\"status\":\"SHIPPED\",\"total_usd\":55.00,\"_loaded_at\":\"2026-03-15T12:00:05.000Z\"},\"nullCount\":{\"order_id\":0,\"customer_id\":0,\"order_ts\":0,\"status\":0,\"total_usd\":0,\"_loaded_at\":0}}"
      },
      "kind": "add"
     }
    ],
    "version": 3
   },
   {
    "actions": [
     {
      "body": {
       "engineInfo": "Apache-Spark/4.2.0 Delta-Lake/4.4.1",
       "isBlindAppend": false,
       "isolationLevel": "Serializable",
       "operation": "MERGE",
       "operationMetrics": {
        "numOutputRows": "5",
        "numSourceRows": "5",
        "numTargetBytesAdded": "5635",
        "numTargetBytesRemoved": "0",
        "numTargetChangeFilesAdded": "0",
        "numTargetDeletionVectorsAdded": "0",
        "numTargetDeletionVectorsRemoved": "0",
        "numTargetDeletionVectorsUpdated": "0",
        "numTargetFilesAdded": "3",
        "numTargetFilesRemoved": "0",
        "numTargetRowsCopied": "0",
        "numTargetRowsDeleted": "0",
        "numTargetRowsInserted": "5",
        "numTargetRowsMatchedDeleted": "0",
        "numTargetRowsMatchedUpdated": "0",
        "numTargetRowsNotMatchedBySourceDeleted": "0",
        "numTargetRowsNotMatchedBySourceUpdated": "0",
        "numTargetRowsUpdated": "0"
       },
       "operationParameters": {
        "matchedPredicates": "[{\"predicate\":\"(_loaded_at#389 > _loaded_at#4190)\",\"actionType\":\"update\"}]",
        "notMatchedBySourcePredicates": "[]",
        "notMatchedPredicates": "[{\"actionType\":\"insert\"}]",
        "predicate": "[\"(order_id#4185 = order_id#384)\"]"
       },
       "readVersion": 3,
       "timestamp": 1773479040000
      },
      "kind": "commitInfo"
     },
     {
      "body": {
       "dataChange": true,
       "modificationTime": 1773479040000,
       "partitionValues": {},
       "path": "part-0005.snappy.parquet",
       "size": 1858,
       "stats": "{\"numRecords\":3,\"minValues\":{\"order_id\":\"O-5006\",\"customer_id\":\"C-42\",\"order_ts\":\"2026-03-16T08:40:00.000Z\",\"status\":\"SHIPPED\",\"total_usd\":16.00,\"_loaded_at\":\"2026-03-16T09:30:02.000Z\"},\"maxValues\":{\"order_id\":\"O-5008\",\"customer_id\":\"C-91\",\"order_ts\":\"2026-03-17T12:30:00.000Z\",\"status\":\"SHIPPED\",\"total_usd\":44.50,\"_loaded_at\":\"2026-03-17T20:00:00.000Z\"},\"nullCount\":{\"order_id\":0,\"customer_id\":0,\"order_ts\":0,\"status\":0,\"total_usd\":0,\"_loaded_at\":0}}"
      },
      "kind": "add"
     },
     {
      "body": {
       "dataChange": true,
       "modificationTime": 1773479040000,
       "partitionValues": {},
       "path": "part-0006.snappy.parquet",
       "size": 1884,
       "stats": "{\"numRecords\":1,\"minValues\":{\"order_id\":\"O-5010\",\"customer_id\":\"C-77\",\"order_ts\":\"2026-03-17T16:20:00.000Z\",\"status\":\"PLACED\",\"total_usd\":20.00,\"_loaded_at\":\"2026-03-17T17:00:03.000Z\"},\"maxValues\":{\"order_id\":\"O-5010\",\"customer_id\":\"C-77\",\"order_ts\":\"2026-03-17T16:20:00.000Z\",\"status\":\"PLACED\",\"total_usd\":20.00,\"_loaded_at\":\"2026-03-17T17:00:03.000Z\"},\"nullCount\":{\"order_id\":0,\"customer_id\":0,\"order_ts\":0,\"status\":0,\"total_usd\":0,\"_loaded_at\":0}}"
      },
      "kind": "add"
     },
     {
      "body": {
       "dataChange": true,
       "modificationTime": 1773479040000,
       "partitionValues": {},
       "path": "part-0007.snappy.parquet",
       "size": 1893,
       "stats": "{\"numRecords\":1,\"minValues\":{\"order_id\":\"O-5009\",\"customer_id\":\"C-12\",\"order_ts\":\"2026-03-17T15:00:00.000Z\",\"status\":\"SHIPPED\",\"total_usd\":30.00,\"_loaded_at\":\"2026-03-17T16:00:17.000Z\"},\"maxValues\":{\"order_id\":\"O-5009\",\"customer_id\":\"C-12\",\"order_ts\":\"2026-03-17T15:00:00.000Z\",\"status\":\"SHIPPED\",\"total_usd\":30.00,\"_loaded_at\":\"2026-03-17T16:00:17.000Z\"},\"nullCount\":{\"order_id\":0,\"customer_id\":0,\"order_ts\":0,\"status\":0,\"total_usd\":0,\"_loaded_at\":0}}"
      },
      "kind": "add"
     }
    ],
    "version": 4
   },
   {
    "actions": [
     {
      "body": {
       "engineInfo": "Apache-Spark/4.2.0 Delta-Lake/4.4.1",
       "isBlindAppend": false,
       "isolationLevel": "SnapshotIsolation",
       "operation": "OPTIMIZE",
       "operationMetrics": {
        "maxFileSize": "2085",
        "minFileSize": "2085",
        "numAddedBytes": "2085",
        "numAddedFiles": "1",
        "numDeletionVectorsRemoved": "0",
        "numRemovedBytes": "9413",
        "numRemovedFiles": "5",
        "p25FileSize": "2085",
        "p50FileSize": "2085",
        "p75FileSize": "2085"
       },
       "operationParameters": {
        "auto": false,
        "clusterBy": "[]",
        "predicate": "[]",
        "zOrderBy": "[]"
       },
       "readVersion": 4,
       "timestamp": 1773479100000
      },
      "kind": "commitInfo"
     },
     {
      "body": {
       "dataChange": false,
       "modificationTime": 1773479100000,
       "partitionValues": {},
       "path": "part-0008.snappy.parquet",
       "size": 2085,
       "stats": "{\"numRecords\":9,\"minValues\":{\"order_id\":\"O-5001\",\"customer_id\":\"C-12\",\"order_ts\":\"2026-03-14T09:12:00.000Z\",\"status\":\"PLACED\",\"total_usd\":12.50,\"_loaded_at\":\"2026-03-14T09:31:07.000Z\"},\"maxValues\":{\"order_id\":\"O-5010\",\"customer_id\":\"C-91\",\"order_ts\":\"2026-03-17T16:20:00.000Z\",\"status\":\"SHIPPED\",\"total_usd\":67.00,\"_loaded_at\":\"2026-03-17T20:00:00.000Z\"},\"nullCount\":{\"order_id\":0,\"customer_id\":0,\"order_ts\":0,\"status\":0,\"total_usd\":0,\"_loaded_at\":0}}"
      },
      "kind": "add"
     },
     {
      "body": {
       "dataChange": false,
       "deletionTimestamp": 1773479100000,
       "extendedFileMetadata": true,
       "partitionValues": {},
       "path": "part-0005.snappy.parquet",
       "size": 1858,
       "stats": "{\"numRecords\":3}"
      },
      "kind": "remove"
     },
     {
      "body": {
       "dataChange": false,
       "deletionTimestamp": 1773479100000,
       "extendedFileMetadata": true,
       "partitionValues": {},
       "path": "part-0006.snappy.parquet",
       "size": 1884,
       "stats": "{\"numRecords\":1}"
      },
      "kind": "remove"
     },
     {
      "body": {
       "dataChange": false,
       "deletionTimestamp": 1773479100000,
       "extendedFileMetadata": true,
       "partitionValues": {},
       "path": "part-0003.snappy.parquet",
       "size": 1886,
       "stats": "{\"numRecords\":3}"
      },
      "kind": "remove"
     },
     {
      "body": {
       "dataChange": false,
       "deletionTimestamp": 1773479100000,
       "extendedFileMetadata": true,
       "partitionValues": {},
       "path": "part-0004.snappy.parquet",
       "size": 1892,
       "stats": "{\"numRecords\":1}"
      },
      "kind": "remove"
     },
     {
      "body": {
       "dataChange": false,
       "deletionTimestamp": 1773479100000,
       "extendedFileMetadata": true,
       "partitionValues": {},
       "path": "part-0007.snappy.parquet",
       "size": 1893,
       "stats": "{\"numRecords\":1}"
      },
      "kind": "remove"
     }
    ],
    "version": 5
   }
  ],
  "layout.liquid": [
   {
    "actions": [
     {
      "body": {
       "engineInfo": "Apache-Spark/4.2.0 Delta-Lake/4.4.1",
       "isBlindAppend": true,
       "isolationLevel": "Serializable",
       "operation": "CREATE TABLE",
       "operationMetrics": {},
       "operationParameters": {
        "clusterBy": "[\"customer_id\"]",
        "description": null,
        "isManaged": "true",
        "partitionBy": "[]",
        "properties": "{}"
       },
       "timestamp": 1773478800000
      },
      "kind": "commitInfo"
     },
     {
      "body": {
       "configuration": {},
       "createdTime": 1773478800000,
       "format": {
        "options": {},
        "provider": "parquet"
       },
       "id": "<table id>",
       "partitionColumns": [],
       "schemaString": "{\"type\":\"struct\",\"fields\":[{\"name\":\"order_id\",\"type\":\"long\",\"nullable\":true,\"metadata\":{}},{\"name\":\"customer_id\",\"type\":\"string\",\"nullable\":true,\"metadata\":{}},{\"name\":\"qty\",\"type\":\"integer\",\"nullable\":true,\"metadata\":{}}]}"
      },
      "kind": "metaData"
     },
     {
      "body": {
       "minReaderVersion": 1,
       "minWriterVersion": 7,
       "writerFeatures": [
        "domainMetadata",
        "clustering",
        "invariants",
        "appendOnly"
       ]
      },
      "kind": "protocol"
     },
     {
      "body": {
       "configuration": "{\"clusteringColumns\":[[\"customer_id\"]],\"domainName\":\"delta.clustering\"}",
       "domain": "delta.clustering",
       "removed": false
      },
      "kind": "domainMetadata"
     }
    ],
    "version": 0
   },
   {
    "actions": [
     {
      "body": {
       "engineInfo": "Apache-Spark/4.2.0 Delta-Lake/4.4.1",
       "isBlindAppend": false,
       "isolationLevel": "SnapshotIsolation",
       "operation": "OPTIMIZE",
       "operationMetrics": {
        "maxFileSize": "1458036",
        "minFileSize": "1254455",
        "numAddedBytes": "2712491",
        "numAddedFiles": "2",
        "numDeletionVectorsRemoved": "0",
        "numRemovedBytes": "2883763",
        "numRemovedFiles": "16",
        "p25FileSize": "1254455",
        "p50FileSize": "1458036",
        "p75FileSize": "1458036"
       },
       "operationParameters": {
        "auto": false,
        "clusterBy": "[\"customer_id\"]",
        "isFull": false,
        "predicate": "[]",
        "zOrderBy": "[]"
       },
       "readVersion": 1,
       "timestamp": 1773478920000
      },
      "kind": "commitInfo"
     }
    ],
    "version": 2
   }
  ]
 },
 "meta": {
  "delta": "4.4.1",
  "java": "21.0.12.1",
  "note": "Recorded by databricks/verify/capture_db.py from open-source Apache Spark and Delta Lake on one machine. Nothing ran on Databricks.",
  "pyspark": "4.2.0",
  "python": "3.13.18",
  "spark": "4.2.0"
 },
 "tables": {
  "delta.after_merge_schema": {
   "cols": [
    "order_id",
    "status",
    "channel"
   ],
   "rows": [
    [
     "O-5001",
     "SHIPPED",
     "NULL"
    ],
    [
     "O-5002",
     "PLACED",
     "NULL"
    ],
    [
     "O-5003",
     "SHIPPED",
     "NULL"
    ],
    [
     "O-5004",
     "SHIPPED",
     "web"
    ],
    [
     "O-5005",
     "CANCELLED",
     "web"
    ]
   ]
  },
  "delta.after_restore": {
   "cols": [
    "order_id",
    "status",
    "total_usd"
   ],
   "rows": [
    [
     "O-5001",
     "SHIPPED",
     "67.00"
    ],
    [
     "O-5002",
     "PLACED",
     "12.50"
    ],
    [
     "O-5003",
     "SHIPPED",
     "28.00"
    ],
    [
     "O-5004",
     "SHIPPED",
     "55.00"
    ],
    [
     "O-5005",
     "CANCELLED",
     "29.00"
    ]
   ]
  },
  "delta.change_feed": {
   "cols": [
    "order_id",
    "status",
    "_change_type",
    "_commit_version"
   ],
   "rows": [
    [
     "O-5001",
     "SHIPPED",
     "insert",
     "0"
    ],
    [
     "O-5002",
     "PLACED",
     "insert",
     "0"
    ],
    [
     "O-5003",
     "SHIPPED",
     "insert",
     "0"
    ],
    [
     "O-5002",
     "SHIPPED",
     "update_postimage",
     "1"
    ],
    [
     "O-5002",
     "PLACED",
     "update_preimage",
     "1"
    ],
    [
     "O-5003",
     "SHIPPED",
     "delete",
     "2"
    ],
    [
     "O-5004",
     "SHIPPED",
     "insert",
     "3"
    ],
    [
     "O-5005",
     "CANCELLED",
     "insert",
     "3"
    ]
   ]
  },
  "delta.version_0": {
   "cols": [
    "order_id",
    "status",
    "total_usd"
   ],
   "rows": [
    [
     "O-5001",
     "SHIPPED",
     "67.00"
    ],
    [
     "O-5002",
     "PLACED",
     "12.50"
    ],
    [
     "O-5003",
     "SHIPPED",
     "28.00"
    ]
   ]
  },
  "delta.version_1": {
   "cols": [
    "order_id",
    "status",
    "total_usd"
   ],
   "rows": [
    [
     "O-5001",
     "SHIPPED",
     "67.00"
    ],
    [
     "O-5002",
     "PLACED",
     "12.50"
    ],
    [
     "O-5003",
     "SHIPPED",
     "28.00"
    ],
    [
     "O-5004",
     "SHIPPED",
     "55.00"
    ],
    [
     "O-5005",
     "CANCELLED",
     "29.00"
    ]
   ]
  },
  "delta.version_2": {
   "cols": [
    "order_id",
    "status",
    "total_usd"
   ],
   "rows": [
    [
     "O-5001",
     "SHIPPED",
     "67.00"
    ],
    [
     "O-5002",
     "SHIPPED",
     "12.50"
    ],
    [
     "O-5003",
     "SHIPPED",
     "28.00"
    ],
    [
     "O-5004",
     "SHIPPED",
     "55.00"
    ],
    [
     "O-5005",
     "CANCELLED",
     "29.00"
    ]
   ]
  },
  "delta.version_3": {
   "cols": [
    "order_id",
    "status",
    "total_usd"
   ],
   "rows": [
    [
     "O-5001",
     "SHIPPED",
     "67.00"
    ],
    [
     "O-5002",
     "SHIPPED",
     "12.50"
    ],
    [
     "O-5003",
     "SHIPPED",
     "28.00"
    ],
    [
     "O-5004",
     "SHIPPED",
     "55.00"
    ]
   ]
  },
  "delta.version_4": {
   "cols": [
    "order_id",
    "status",
    "total_usd"
   ],
   "rows": [
    [
     "O-5001",
     "SHIPPED",
     "67.00"
    ],
    [
     "O-5002",
     "SHIPPED",
     "12.50"
    ],
    [
     "O-5003",
     "SHIPPED",
     "28.00"
    ],
    [
     "O-5004",
     "SHIPPED",
     "55.00"
    ],
    [
     "O-5006",
     "SHIPPED",
     "44.50"
    ],
    [
     "O-5007",
     "SHIPPED",
     "16.00"
    ],
    [
     "O-5008",
     "SHIPPED",
     "39.00"
    ],
    [
     "O-5009",
     "SHIPPED",
     "30.00"
    ],
    [
     "O-5010",
     "PLACED",
     "20.00"
    ]
   ]
  },
  "delta.version_5": {
   "cols": [
    "order_id",
    "status",
    "total_usd"
   ],
   "rows": [
    [
     "O-5001",
     "SHIPPED",
     "67.00"
    ],
    [
     "O-5002",
     "SHIPPED",
     "12.50"
    ],
    [
     "O-5003",
     "SHIPPED",
     "28.00"
    ],
    [
     "O-5004",
     "SHIPPED",
     "55.00"
    ],
    [
     "O-5006",
     "SHIPPED",
     "44.50"
    ],
    [
     "O-5007",
     "SHIPPED",
     "16.00"
    ],
    [
     "O-5008",
     "SHIPPED",
     "39.00"
    ],
    [
     "O-5009",
     "SHIPPED",
     "30.00"
    ],
    [
     "O-5010",
     "PLACED",
     "20.00"
    ]
   ]
  },
  "pipeline.dim_after": {
   "cols": [
    "customer_id",
    "tier",
    "valid_from",
    "valid_to",
    "is_current"
   ],
   "rows": [
    [
     "C-12",
     "standard",
     "2026-03-14 06:00:00",
     "NULL",
     "true"
    ],
    [
     "C-42",
     "standard",
     "2026-03-14 06:00:00",
     "2026-03-16 08:00:00",
     "false"
    ],
    [
     "C-42",
     "gold",
     "2026-03-16 08:00:00",
     "NULL",
     "true"
    ],
    [
     "C-55",
     "standard",
     "2026-03-16 08:00:00",
     "NULL",
     "true"
    ],
    [
     "C-77",
     "standard",
     "2026-03-14 06:00:00",
     "NULL",
     "true"
    ],
    [
     "C-91",
     "gold",
     "2026-03-14 06:00:00",
     "NULL",
     "true"
    ]
   ]
  },
  "pipeline.dim_before": {
   "cols": [
    "customer_id",
    "tier",
    "valid_from",
    "valid_to",
    "is_current"
   ],
   "rows": [
    [
     "C-12",
     "standard",
     "2026-03-14 06:00:00",
     "NULL",
     "true"
    ],
    [
     "C-42",
     "standard",
     "2026-03-14 06:00:00",
     "NULL",
     "true"
    ],
    [
     "C-77",
     "standard",
     "2026-03-14 06:00:00",
     "NULL",
     "true"
    ],
    [
     "C-91",
     "gold",
     "2026-03-14 06:00:00",
     "NULL",
     "true"
    ]
   ]
  },
  "spark.orders_head": {
   "cols": [
    "order_id",
    "customer_id",
    "status",
    "total_usd",
    "_loaded_at"
   ],
   "rows": [
    [
     "O-5001",
     "C-42",
     "PLACED",
     "67.00",
     "2026-03-14 09:31:07"
    ],
    [
     "O-5001",
     "C-42",
     "SHIPPED",
     "67.00",
     "2026-03-14 10:31:44"
    ],
    [
     "O-5002",
     "C-77",
     "PLACED",
     "12.50",
     "2026-03-14 09:31:07"
    ],
    [
     "O-5003",
     "C-42",
     "PLACED",
     "28.00",
     "2026-03-14 10:31:44"
    ],
    [
     "O-5003",
     "C-42",
     "SHIPPED",
     "28.00",
     "2026-03-14 11:31:20"
    ],
    [
     "O-5004",
     "C-91",
     "SHIPPED",
     "55.00",
     "2026-03-15 12:00:05"
    ],
    [
     "O-5005",
     "C-12",
     "CANCELLED",
     "29.00",
     "2026-03-15 15:00:11"
    ],
    [
     "O-5006",
     "C-77",
     "SHIPPED",
     "44.50",
     "2026-03-16 09:30:02"
    ],
    [
     "O-5007",
     "C-42",
     "PLACED",
     "16.00",
     "2026-03-16 18:30:09"
    ],
    [
     "O-5008",
     "C-91",
     "SHIPPED",
     "39.00",
     "2026-03-17 13:00:41"
    ],
    [
     "O-5009",
     "C-12",
     "SHIPPED",
     "30.00",
     "2026-03-17 16:00:17"
    ],
    [
     "O-5010",
     "C-77",
     "PLACED",
     "20.00",
     "2026-03-17 17:00:03"
    ]
   ]
  },
  "spark.skew_top_keys": {
   "cols": [
    "k",
    "count"
   ],
   "rows": [
    [
     "K-0",
     "240000"
    ],
    [
     "K-30",
     "1226"
    ],
    [
     "K-11",
     "1226"
    ]
   ]
  },
  "spark.status_counts": {
   "cols": [
    "status",
    "orders",
    "revenue"
   ],
   "rows": [
    [
     "CANCELLED",
     "1",
     "29.00"
    ],
    [
     "PLACED",
     "5",
     "143.50"
    ],
    [
     "SHIPPED",
     "6",
     "263.50"
    ]
   ]
  },
  "stream.bronze_duplicates": {
   "cols": [
    "order_id",
    "status",
    "count"
   ],
   "rows": [
    [
     "O-5004",
     "SHIPPED",
     "2"
    ],
    [
     "O-5005",
     "CANCELLED",
     "2"
    ]
   ]
  },
  "stream.bronze_sample": {
   "cols": [
    "order_id",
    "status",
    "_loaded_at",
    "_source_file"
   ],
   "rows": [
    [
     "O-5004",
     "SHIPPED",
     "2026-03-15 12:00:05",
     "orders_20260315.json"
    ],
    [
     "O-5004",
     "SHIPPED",
     "2026-03-15 12:00:05",
     "orders_20260315_resend.json"
    ]
   ]
  },
  "stream.gold_rows": {
   "cols": [
    "order_date",
    "orders",
    "revenue_usd"
   ],
   "rows": [
    [
     "2026-03-14",
     "3",
     "107.50"
    ],
    [
     "2026-03-15",
     "1",
     "55.00"
    ],
    [
     "2026-03-16",
     "2",
     "60.50"
    ],
    [
     "2026-03-17",
     "3",
     "89.00"
    ]
   ]
  },
  "stream.silver_rows": {
   "cols": [
    "order_id",
    "status",
    "total_usd",
    "_loaded_at"
   ],
   "rows": [
    [
     "O-5001",
     "SHIPPED",
     "67.00",
     "2026-03-14 10:31:44"
    ],
    [
     "O-5002",
     "PLACED",
     "12.50",
     "2026-03-14 09:31:07"
    ],
    [
     "O-5003",
     "SHIPPED",
     "28.00",
     "2026-03-14 11:31:20"
    ],
    [
     "O-5004",
     "SHIPPED",
     "55.00",
     "2026-03-15 12:00:05"
    ],
    [
     "O-5005",
     "CANCELLED",
     "29.00",
     "2026-03-15 15:00:11"
    ],
    [
     "O-5006",
     "SHIPPED",
     "44.50",
     "2026-03-16 09:30:02"
    ],
    [
     "O-5007",
     "PLACED",
     "16.00",
     "2026-03-16 18:30:09"
    ],
    [
     "O-5008",
     "SHIPPED",
     "39.00",
     "2026-03-17 13:00:41"
    ],
    [
     "O-5009",
     "SHIPPED",
     "30.00",
     "2026-03-17 16:00:17"
    ],
    [
     "O-5010",
     "PLACED",
     "20.00",
     "2026-03-17 17:00:03"
    ]
   ]
  },
  "stream.watermark_batch_counts": {
   "cols": [
    "window_start",
    "window_end",
    "orders"
   ],
   "rows": [
    [
     "2026-03-18 09:00:00",
     "2026-03-18 09:10:00",
     "4"
    ],
    [
     "2026-03-18 09:10:00",
     "2026-03-18 09:20:00",
     "1"
    ],
    [
     "2026-03-18 09:20:00",
     "2026-03-18 09:30:00",
     "1"
    ],
    [
     "2026-03-18 09:30:00",
     "2026-03-18 09:40:00",
     "1"
    ]
   ]
  }
 },
 "text": {
  "delta.conflict_update_append": "[DELTA_CONCURRENT_APPEND.WITHOUT_HINT] Transaction conflict detected. a concurrent WRITE added data to table delta.`file:/... committed at version 1. The concurrent operation modified data that should have been read by this operation. Please retry the operation.",
  "delta.conflict_update_update": "[DELTA_CONCURRENT_APPEND.WITHOUT_HINT] Transaction conflict detected. a concurrent UPDATE added data to table delta.`file:/... committed at version 1. The concurrent operation modified data that should have been read by this operation. Please retry the operation.",
  "delta.err_constraint": "[DELTA_VIOLATE_CONSTRAINT_WITH_VALUES] CHECK constraint positive_total (total_usd > 0) violated by row with values:\n - total_usd : -5.00",
  "delta.err_constraint_existing_rows": "[DELTA_NEW_CHECK_CONSTRAINT_VIOLATION] 3 rows in delta.`file:/... violate the new CHECK constraint (total_usd > 100)",
  "delta.err_extra_column": "[DELTA_METADATA_MISMATCH] A metadata mismatch was detected when writing to the Delta table.\n- A schema mismatch detected when writing to the Delta table (Table ID: <table id>).\nTo enable schema migration using DataFrameWriter or DataStreamWriter, please set: '.option(\"mergeSchema\", \"true\")'.\nFor other operations, set the session configuration spark.databricks.delta.schema.autoMerge.enabled to \"true\". See the documentation specific to the operation for details.\n\nTable schema:\nroot\n |-- order_id: string (nullable = true)\n |-- customer_id: string (nullable = true)\n |-- order_ts: timestamp (nullable = true)\n |-- status: string (nullable = true)\n |-- total_usd: decimal(12,2) (nullable = true)\n |-- _loaded_at: timestamp (nullable = true)\n\n\nData schema:\nroot\n |-- order_id: string (nullable = true)\n |-- customer_id: string (nullable = true)\n |-- order_ts: timestamp (nullable = true)\n |-- status: string (nullable = true)\n |-- total_usd: decimal(12,2) (nullable = true)\n |-- _loaded_at: timestamp (nullable = true)\n |-- channel: string (nullable = true)",
  "delta.err_merge_duplicates": "[DELTA_MULTIPLE_SOURCE_ROW_MATCHING_TARGET_ROW_IN_MERGE] Cannot perform Merge as multiple source rows matched and attempted to modify the same\ntarget row in the Delta table in possibly conflicting ways. By SQL semantics of Merge,\nwhen multiple source rows match on the same target row, the result may be ambiguous\nas it is unclear which source row should be used to update or delete the matching\ntarget row. You can preprocess the source table to eliminate the possibility of\nmultiple matches. Please refer to\nhttps://docs.delta.io/latest/delta-update.html#upsert-into-a-table-using-merge",
  "delta.err_type": "[DELTA_FAILED_TO_MERGE_FIELDS] Failed to merge fields 'total_usd' and 'total_usd'",
  "delta.schema_after_merge": "root\n |-- order_id: string (nullable = true)\n |-- customer_id: string (nullable = true)\n |-- order_ts: timestamp (nullable = true)\n |-- status: string (nullable = true)\n |-- total_usd: decimal(12,2) (nullable = true)\n |-- _loaded_at: timestamp (nullable = true)\n |-- channel: string (nullable = true)",
  "layout.err_time_travel_after_vacuum": "[FAILED_READ_FILE.FILE_NOT_EXIST] Encountered error while reading file file:/... File does not exist. It is possible the underlying files have been updated.\nYou can explicitly invalidate the cache in Spark by running 'REFRESH TABLE tableName' command in SQL or by recreating the Dataset/DataFrame involved. SQLSTATE: KD001",
  "layout.err_vacuum_retention": "[DELTA_VACUUM_RETENTION_PERIOD_TOO_SHORT] The specified VACUUM retention period is too low and may corrupt this Delta table if any writes are in progress.\n\nIf no operations (insert, upsert, delete, optimize) are running, you can disable this safety check by setting:\ndelta.retentionDurationCheck.enabled = false\n\nOtherwise, use a retention period of at least 168 hours.",
  "plan.aqe_after": "== Physical Plan ==\nAdaptiveSparkPlan isFinalPlan=true\n+- == Final Plan ==\n   ResultQueryStage 1\n   +- *(2) HashAggregate(keys=[customer_id#N], functions=[sum(qty#N)])\n      +- AQEShuffleRead coalesced\n         +- ShuffleQueryStage 0\n            +- Exchange hashpartitioning(customer_id#N, 8), ENSURE_REQUIREMENTS, \n               +- *(1) HashAggregate(keys=[customer_id#N], functions=[partial_sum(qty#N)])\n                  +- *(1) Project [concat(C-, cast((id#N % 5000) as string)) AS customer_id#N, ((id#N % 97) + 1) AS qty#N]\n                     +- *(1) Range (0, 200000, step=1, splits=4)\n+- == Initial Plan ==\n   HashAggregate(keys=[customer_id#N], functions=[sum(qty#N)])\n   +- Exchange hashpartitioning(customer_id#N, 8), ENSURE_REQUIREMENTS, \n      +- HashAggregate(keys=[customer_id#N], functions=[partial_sum(qty#N)])\n         +- Project [concat(C-, cast((id#N % 5000) as string)) AS customer_id#N, ((id#N % 97) + 1) AS qty#N]\n            +- Range (0, 200000, step=1, splits=4)",
  "plan.aqe_before": "== Physical Plan ==\nAdaptiveSparkPlan isFinalPlan=false\n+- HashAggregate(keys=[customer_id#N], functions=[sum(qty#N)])\n   +- Exchange hashpartitioning(customer_id#N, 8), ENSURE_REQUIREMENTS, \n      +- HashAggregate(keys=[customer_id#N], functions=[partial_sum(qty#N)])\n         +- Project [concat(C-, cast((id#N % 5000) as string)) AS customer_id#N, ((id#N % 97) + 1) AS qty#N]\n            +- Range (0, 200000, step=1, splits=4)",
  "plan.builtin": "== Physical Plan ==\n*(1) Project [lower(status#N) AS s#N]\n+- FileScan csv [status#N] Batched: false, DataFilters: [], Format: CSV, Location: InMemoryFileIndex(1 paths)[file:/...], PartitionFilters: [], PushedFilters: [], ReadSchema: struct<status:string>",
  "plan.cached": "== Physical Plan ==\n*(2) HashAggregate(keys=[product_id#N], functions=[count(1)])\n+- Exchange hashpartitioning(product_id#N, 8), ENSURE_REQUIREMENTS, \n   +- *(1) HashAggregate(keys=[product_id#N], functions=[partial_count(1)])\n      +- InMemoryTableScan [product_id#N]\n            +- InMemoryRelation [order_id#N, customer_id#N, product_id#N, qty#N], StorageLevel(disk, memory, deserialized, 1 replicas)\n                  +- *(1) Project [concat(O-, cast(id#N as string)) AS order_id#N, concat(C-, cast((id#N % 5000) as string)) AS customer_id#N, element_at([P-10,P-11,P-12,P-22,P-30,P-31], (cast((id#N % 6) as int) + 1), None, true) AS product_id#N, ((id#N % 97) + 1) AS qty#N]\n                     +- *(1) Filter (((id#N % 97) + 1) > 50)\n                        +- *(1) Range (0, 200000, step=1, splits=4)",
  "plan.groupby": "== Physical Plan ==\n*(2) HashAggregate(keys=[status#N], functions=[count(1), sum(total_usd#N)])\n+- Exchange hashpartitioning(status#N, 8), ENSURE_REQUIREMENTS, \n   +- *(1) HashAggregate(keys=[status#N], functions=[partial_count(1), partial_sum(total_usd#N)])\n      +- FileScan csv [status#N,total_usd#N] Batched: false, DataFilters: [], Format: CSV, Location: InMemoryFileIndex(1 paths)[file:/...], PartitionFilters: [], PushedFilters: [], ReadSchema: struct<status:string,total_usd:decimal(12,2)>",
  "plan.groupby_formatted": "== Physical Plan ==\n* HashAggregate (4)\n+- Exchange (3)\n   +- * HashAggregate (2)\n      +- Scan csv  (1)\n\n\n(1) Scan csv \nOutput [2]: [status#N, total_usd#N]\nBatched: false\nLocation: InMemoryFileIndex [file:/...]\nReadSchema: struct<status:string,total_usd:decimal(12,2)>\n\n(2) HashAggregate [codegen id : 1]\nInput [2]: [status#N, total_usd#N]\nKeys [1]: [status#N]\nFunctions [2]: [partial_count(1), partial_sum(total_usd#N)]\nAggregate Attributes [3]: [count#N, sum#N, isEmpty#N]\nResults [4]: [status#N, count#N, sum#N, isEmpty#N]\n\n(3) Exchange\nInput [4]: [status#N, count#N, sum#N, isEmpty#N]\nArguments: hashpartitioning(status#N, 8), ENSURE_REQUIREMENTS, \n\n(4) HashAggregate [codegen id : 2]\nInput [4]: [status#N, count#N, sum#N, isEmpty#N]\nKeys [1]: [status#N]\nFunctions [2]: [count(1), sum(total_usd#N)]\nAggregate Attributes [2]: [count(1)#N, sum(total_usd#N)#N]\nResults [3]: [status#N, count(1)#N AS orders#N, sum(total_usd#N)#N AS revenue#N]",
  "plan.join_default": "== Physical Plan ==\n*(2) Project [product_id#N, order_id#N, customer_id#N, qty#N, name#N]\n+- *(2) BroadcastHashJoin [product_id#N], [product_id#N], Inner, BuildRight, false, false\n   :- *(2) Project [concat(O-, cast(id#N as string)) AS order_id#N, concat(C-, cast((id#N % 5000) as string)) AS customer_id#N, element_at([P-10,P-11,P-12,P-22,P-30,P-31], (cast((id#N % 6) as int) + 1), None, true) AS product_id#N, ((id#N % 97) + 1) AS qty#N]\n   :  +- *(2) Range (0, 200000, step=1, splits=4)\n   +- BroadcastExchange HashedRelationBroadcastMode(List(input[0, string, false]),false), \n      +- *(1) Filter isnotnull(product_id#N)\n         +- FileScan csv [product_id#N,name#N] Batched: false, DataFilters: [isnotnull(product_id#N)], Format: CSV, Location: InMemoryFileIndex(1 paths)[file:/...], PartitionFilters: [], PushedFilters: [IsNotNull(product_id)], ReadSchema: struct<product_id:string,name:string>",
  "plan.join_hint_broadcast": "== Physical Plan ==\n*(2) Project [product_id#N, order_id#N, customer_id#N, qty#N, name#N]\n+- *(2) BroadcastHashJoin [product_id#N], [product_id#N], Inner, BuildRight, false, false\n   :- *(2) Project [concat(O-, cast(id#N as string)) AS order_id#N, concat(C-, cast((id#N % 5000) as string)) AS customer_id#N, element_at([P-10,P-11,P-12,P-22,P-30,P-31], (cast((id#N % 6) as int) + 1), None, true) AS product_id#N, ((id#N % 97) + 1) AS qty#N]\n   :  +- *(2) Range (0, 200000, step=1, splits=4)\n   +- BroadcastExchange HashedRelationBroadcastMode(List(input[0, string, false]),false), \n      +- *(1) Filter isnotnull(product_id#N)\n         +- FileScan csv [product_id#N,name#N] Batched: false, DataFilters: [isnotnull(product_id#N)], Format: CSV, Location: InMemoryFileIndex(1 paths)[file:/...], PartitionFilters: [], PushedFilters: [IsNotNull(product_id)], ReadSchema: struct<product_id:string,name:string>",
  "plan.join_hint_merge": "== Physical Plan ==\n*(5) Project [product_id#N, order_id#N, customer_id#N, qty#N, name#N]\n+- *(5) SortMergeJoin [product_id#N], [product_id#N], Inner\n   :- *(2) Sort [product_id#N ASC NULLS FIRST], false, 0\n   :  +- Exchange hashpartitioning(product_id#N, 8), ENSURE_REQUIREMENTS, \n   :     +- *(1) Project [concat(O-, cast(id#N as string)) AS order_id#N, concat(C-, cast((id#N % 5000) as string)) AS customer_id#N, element_at([P-10,P-11,P-12,P-22,P-30,P-31], (cast((id#N % 6) as int) + 1), None, true) AS product_id#N, ((id#N % 97) + 1) AS qty#N]\n   :        +- *(1) Range (0, 200000, step=1, splits=4)\n   +- *(4) Sort [product_id#N ASC NULLS FIRST], false, 0\n      +- Exchange hashpartitioning(product_id#N, 8), ENSURE_REQUIREMENTS, \n         +- *(3) Filter isnotnull(product_id#N)\n            +- FileScan csv [product_id#N,name#N] Batched: false, DataFilters: [isnotnull(product_id#N)], Format: CSV, Location: InMemoryFileIndex(1 paths)[file:/...], PartitionFilters: [], PushedFilters: [IsNotNull(product_id)], ReadSchema: struct<product_id:string,name:string>",
  "plan.join_hint_shuffle_hash": "== Physical Plan ==\n*(3) Project [product_id#N, order_id#N, customer_id#N, qty#N, name#N]\n+- *(3) ShuffledHashJoin [product_id#N], [product_id#N], Inner, BuildRight\n   :- Exchange hashpartitioning(product_id#N, 8), ENSURE_REQUIREMENTS, \n   :  +- *(1) Project [concat(O-, cast(id#N as string)) AS order_id#N, concat(C-, cast((id#N % 5000) as string)) AS customer_id#N, element_at([P-10,P-11,P-12,P-22,P-30,P-31], (cast((id#N % 6) as int) + 1), None, true) AS product_id#N, ((id#N % 97) + 1) AS qty#N]\n   :     +- *(1) Range (0, 200000, step=1, splits=4)\n   +- Exchange hashpartitioning(product_id#N, 8), ENSURE_REQUIREMENTS, \n      +- *(2) Filter isnotnull(product_id#N)\n         +- FileScan csv [product_id#N,name#N] Batched: false, DataFilters: [isnotnull(product_id#N)], Format: CSV, Location: InMemoryFileIndex(1 paths)[file:/...], PartitionFilters: [], PushedFilters: [IsNotNull(product_id)], ReadSchema: struct<product_id:string,name:string>",
  "plan.join_no_broadcast": "== Physical Plan ==\n*(5) Project [product_id#N, order_id#N, customer_id#N, qty#N, name#N]\n+- *(5) SortMergeJoin [product_id#N], [product_id#N], Inner\n   :- *(2) Sort [product_id#N ASC NULLS FIRST], false, 0\n   :  +- Exchange hashpartitioning(product_id#N, 8), ENSURE_REQUIREMENTS, \n   :     +- *(1) Project [concat(O-, cast(id#N as string)) AS order_id#N, concat(C-, cast((id#N % 5000) as string)) AS customer_id#N, element_at([P-10,P-11,P-12,P-22,P-30,P-31], (cast((id#N % 6) as int) + 1), None, true) AS product_id#N, ((id#N % 97) + 1) AS qty#N]\n   :        +- *(1) Range (0, 200000, step=1, splits=4)\n   +- *(4) Sort [product_id#N ASC NULLS FIRST], false, 0\n      +- Exchange hashpartitioning(product_id#N, 8), ENSURE_REQUIREMENTS, \n         +- *(3) Filter isnotnull(product_id#N)\n            +- FileScan csv [product_id#N,name#N] Batched: false, DataFilters: [isnotnull(product_id#N)], Format: CSV, Location: InMemoryFileIndex(1 paths)[file:/...], PartitionFilters: [], PushedFilters: [IsNotNull(product_id)], ReadSchema: struct<product_id:string,name:string>",
  "plan.join_two_big_no_broadcast": "== Physical Plan ==\n*(5) Project [order_id#N, customer_id#N, product_id#N, qty#N, line_no#N, unit_price#N]\n+- *(5) SortMergeJoin [order_id#N], [order_id#N], Inner\n   :- *(2) Sort [order_id#N ASC NULLS FIRST], false, 0\n   :  +- Exchange hashpartitioning(order_id#N, 8), ENSURE_REQUIREMENTS, \n   :     +- *(1) Project [concat(O-, cast(id#N as string)) AS order_id#N, concat(C-, cast((id#N % 5000) as string)) AS customer_id#N, element_at([P-10,P-11,P-12,P-22,P-30,P-31], (cast((id#N % 6) as int) + 1), None, true) AS product_id#N, ((id#N % 97) + 1) AS qty#N]\n   :        +- *(1) Range (0, 200000, step=1, splits=4)\n   +- *(4) Sort [order_id#N ASC NULLS FIRST], false, 0\n      +- Exchange hashpartitioning(order_id#N, 8), ENSURE_REQUIREMENTS, \n         +- *(3) Project [concat(O-, cast((id#N % 200000) as string)) AS order_id#N, cast((cast(id#N as double) / 200000.0) as int) AS line_no#N, (id#N % 7) AS unit_price#N]\n            +- *(3) Filter isnotnull(concat(O-, cast((id#N % 200000) as string)))\n               +- *(3) Range (0, 600000, step=1, splits=4)",
  "plan.narrow": "== Physical Plan ==\n*(1) Project [order_id#N, total_usd#N]\n+- *(1) Filter (isnotnull(status#N) AND (status#N = SHIPPED))\n   +- FileScan csv [order_id#N,status#N,total_usd#N] Batched: false, DataFilters: [isnotnull(status#N), (status#N = SHIPPED)], Format: CSV, Location: InMemoryFileIndex(1 paths)[file:/...], PartitionFilters: [], PushedFilters: [IsNotNull(status), EqualTo(status,SHIPPED)], ReadSchema: struct<order_id:string,status:string,total_usd:decimal(12,2)>",
  "plan.skew_off": "== Physical Plan ==\nAdaptiveSparkPlan isFinalPlan=true\n+- == Final Plan ==\n   ResultQueryStage 2\n   +- *(5) Project [k#N, v#N, dim_id#N]\n      +- *(5) SortMergeJoin [k#N], [k#N], Inner\n         :- *(3) Sort [k#N ASC NULLS FIRST], false, 0\n         :  +- AQEShuffleRead coalesced\n         :     +- ShuffleQueryStage 0\n         :        +- Exchange hashpartitioning(k#N, 8), ENSURE_REQUIREMENTS, \n         :           +- *(1) Project [CASE WHEN ((id#N % 10) < 8) THEN K-0 ELSE concat(K-, cast(((id#N % 49) + 1) as string)) END AS k#N, id#N AS v#N]\n         :              +- *(1) Filter CASE WHEN ((id#N % 10) < 8) THEN true ELSE isnotnull(concat(K-, cast(((id#N % 49) + 1) as string))) END\n         :                 +- *(1) Range (0, 300000, step=1, splits=4)\n         +- *(4) Sort [k#N ASC NULLS FIRST], false, 0\n            +- AQEShuffleRead coalesced\n               +- ShuffleQueryStage 1\n                  +- Exchange hashpartitioning(k#N, 8), ENSURE_REQUIREMENTS, \n                     +- *(2) Project [concat(K-, cast(id#N as string)) AS k#N, id#N AS dim_id#N]\n                        +- *(2) Range (0, 50, step=1, splits=4)\n+- == Initial Plan ==\n   Project [k#N, v#N, dim_id#N]\n   +- SortMergeJoin [k#N], [k#N], Inner\n      :- Sort [k#N ASC NULLS FIRST], false, 0\n      :  +- Exchange hashpartitioning(k#N, 8), ENSURE_REQUIREMENTS, \n      :     +- Project [CASE WHEN ((id#N % 10) < 8) THEN K-0 ELSE concat(K-, cast(((id#N % 49) + 1) as string)) END AS k#N, id#N AS v#N]\n      :        +- Filter CASE WHEN ((id#N % 10) < 8) THEN true ELSE isnotnull(concat(K-, cast(((id#N % 49) + 1) as string))) END\n      :           +- Range (0, 300000, step=1, splits=4)\n      +- Sort [k#N ASC NULLS FIRST], false, 0\n         +- Exchange hashpartitioning(k#N, 8), ENSURE_REQUIREMENTS, \n            +- Project [concat(K-, cast(id#N as string)) AS k#N, id#N AS dim_id#N]\n               +- Range (0, 50, step=1, splits=4)",
  "plan.skew_on": "== Physical Plan ==\nAdaptiveSparkPlan isFinalPlan=true\n+- == Final Plan ==\n   ResultQueryStage 2\n   +- *(5) Project [k#N, v#N, dim_id#N]\n      +- *(5) SortMergeJoin(skew=true) [k#N], [k#N], Inner\n         :- *(3) Sort [k#N ASC NULLS FIRST], false, 0\n         :  +- AQEShuffleRead skewed\n         :     +- ShuffleQueryStage 0\n         :        +- Exchange hashpartitioning(k#N, 8), ENSURE_REQUIREMENTS, \n         :           +- *(1) Project [CASE WHEN ((id#N % 10) < 8) THEN K-0 ELSE concat(K-, cast(((id#N % 49) + 1) as string)) END AS k#N, id#N AS v#N]\n         :              +- *(1) Filter CASE WHEN ((id#N % 10) < 8) THEN true ELSE isnotnull(concat(K-, cast(((id#N % 49) + 1) as string))) END\n         :                 +- *(1) Range (0, 300000, step=1, splits=4)\n         +- *(4) Sort [k#N ASC NULLS FIRST], false, 0\n            +- AQEShuffleRead\n               +- ShuffleQueryStage 1\n                  +- Exchange hashpartitioning(k#N, 8), ENSURE_REQUIREMENTS, \n                     +- *(2) Project [concat(K-, cast(id#N as string)) AS k#N, id#N AS dim_id#N]\n                        +- *(2) Range (0, 50, step=1, splits=4)\n+- == Initial Plan ==\n   Project [k#N, v#N, dim_id#N]\n   +- SortMergeJoin [k#N], [k#N], Inner\n      :- Sort [k#N ASC NULLS FIRST], false, 0\n      :  +- Exchange hashpartitioning(k#N, 8), ENSURE_REQUIREMENTS, \n      :     +- Project [CASE WHEN ((id#N % 10) < 8) THEN K-0 ELSE concat(K-, cast(((id#N % 49) + 1) as string)) END AS k#N, id#N AS v#N]\n      :        +- Filter CASE WHEN ((id#N % 10) < 8) THEN true ELSE isnotnull(concat(K-, cast(((id#N % 49) + 1) as string))) END\n      :           +- Range (0, 300000, step=1, splits=4)\n      +- Sort [k#N ASC NULLS FIRST], false, 0\n         +- Exchange hashpartitioning(k#N, 8), ENSURE_REQUIREMENTS, \n            +- Project [concat(K-, cast(id#N as string)) AS k#N, id#N AS dim_id#N]\n               +- Range (0, 50, step=1, splits=4)",
  "plan.udf": "== Physical Plan ==\n*(1) Project [pythonUDF0#N AS s#N]\n+- ArrowEvalPython [<lambda>(status#N)#N], [pythonUDF0#N], 101\n   +- FileScan csv [status#N] Batched: false, DataFilters: [], Format: CSV, Location: InMemoryFileIndex(1 paths)[file:/...], PartitionFilters: [], PushedFilters: [], ReadSchema: struct<status:string>",
  "spark.schema_orders": "root\n |-- order_id: string (nullable = true)\n |-- customer_id: string (nullable = true)\n |-- order_ts: timestamp (nullable = true)\n |-- status: string (nullable = true)\n |-- total_usd: decimal(12,2) (nullable = true)\n |-- _loaded_at: timestamp (nullable = true)",
  "test.pytest_fail": ".F.                                                                      [100%]\n=================================== FAILURES ===================================\n_________________ test_daily_revenue_ignores_cancelled_orders __________________\ntests/test_transforms.py:28: in test_daily_revenue_ignores_cancelled_orders\n    assert [(r.orders, r.revenue_usd) for r in result] == [(1, Decimal(\"10.00\"))]\nE   AssertionError: assert [(2, Decimal('109.00'))] == [(1, Decimal('10.00'))]\nE     \nE     At index 0 diff: (2, Decimal('109.00')) != (1, Decimal('10.00'))\nE     Use -v to get more diff\n=========================== short test summary info ============================\nFAILED tests/test_transforms.py::test_daily_revenue_ignores_cancelled_orders\n1 failed, 2 passed in N s",
  "test.pytest_pass": "...                                                                      [100%]\n3 passed in N s"
 }
};
