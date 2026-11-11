window.LAB = window.LAB || {};
LAB.real = {
 "counts": {
  "af.dags": {
   "brewline_daily": {
    "bq_template_fields": [
     "configuration",
     "job_id",
     "gcp_conn_id",
     "impersonation_chain",
     "project_id"
    ],
    "catchup": false,
    "edges": [
     [
      "start",
      [
       "merge_orders"
      ]
     ],
     [
      "merge_orders",
      [
       "check_rows"
      ]
     ],
     [
      "check_rows",
      []
     ]
    ],
    "retries": {
     "check_rows": 2,
     "merge_orders": 2,
     "start": 2
    },
    "schedule": "0 2 * * *",
    "tasks": [
     "start",
     "merge_orders",
     "check_rows"
    ]
   },
   "dags": [
    "brewline_daily",
    "flaky_demo",
    "heavy_top_level"
   ],
   "import_errors": {
    "broken_import.py": "ModuleNotFoundError: No module named 'airflow.providers.google.cloud.operators.bigqeury'"
   }
  },
  "af.flaky": {
   "state": "success",
   "tasks": [
    {
     "state": "success",
     "task": "extract",
     "tries": 3
    },
    {
     "state": "success",
     "task": "load",
     "tries": 1
    }
   ]
  },
  "af.parse": {
   "sleep_at_top_seconds": 2,
   "slower_by_at_least_1_9": true,
   "slower_by_seconds": 2.0
  },
  "beam.bigquery_write_methods": {
   "methods": [
    "DEFAULT",
    "FILE_LOADS",
    "STORAGE_WRITE_API",
    "STREAMING_INSERTS"
   ]
  },
  "beam.dead_letter": {
   "dead": 3,
   "dead_records": [
    {
     "error": "JSONDecodeError: Expecting value: line 1 column 1 (char 0)",
     "line": "not json"
    },
    {
     "error": "ValueError: no order_id",
     "line": "{\"store_id\": \"s02\"}"
    },
    {
     "error": "ValueError: no order_id",
     "line": "[1, 2]"
    }
   ],
   "lines_in": 6,
   "ok": 3
  },
  "beam.dedupe": {
   "delivered": 42,
   "kept_with_300s_windows": 40,
   "kept_with_60s_windows": 41,
   "second_duplicate_gap_seconds": 100,
   "unique_events": 40
  },
  "beam.late": {
   "early_late_accumulating": {
    "dropped": 1,
    "events_in_the_output": 5,
    "events_sent": 6,
    "label": "early + on time + late, accumulating",
    "panes": 5,
    "timings": [
     "EARLY",
     "LATE",
     "ON_TIME"
    ]
   },
   "late_accumulating": {
    "dropped": 1,
    "events_in_the_output": 5,
    "events_sent": 6,
    "label": "lateness 120 s, late firing, accumulating",
    "panes": 3,
    "timings": [
     "LATE",
     "ON_TIME"
    ]
   },
   "late_discarding": {
    "dropped": 1,
    "events_in_the_output": 5,
    "events_sent": 6,
    "label": "lateness 120 s, late firing, discarding",
    "panes": 3,
    "timings": [
     "LATE",
     "ON_TIME"
    ]
   },
   "no_lateness": {
    "dropped": 2,
    "events_in_the_output": 4,
    "events_sent": 6,
    "label": "allowed lateness 0, discarding",
    "panes": 2,
    "timings": [
     "ON_TIME"
    ]
   }
  },
  "beam.options": {
   "labels": [
    "pipeline=orders-stream",
    "env=dev"
   ],
   "machine_type": "n2-standard-2",
   "max_num_workers": 10,
   "project": "brewline-dev",
   "region": "asia-southeast1",
   "runner": "DataflowRunner",
   "service_account_email": "sa-pipeline@brewline-dev.iam.gserviceaccount.com",
   "staging_location": "gs://brewline-tmp-dev/staging",
   "streaming": true,
   "subnetwork": "regions/asia-southeast1/subnetworks/data",
   "temp_location": "gs://brewline-tmp-dev/tmp",
   "use_public_ips": false
  },
  "beam.typo": {
   "flag_given": "--max_num_worker=10",
   "options_kept": [
    "project",
    "runner"
   ],
   "warning": "Discarding unparseable args: ['--max_num_worker=10']",
   "worker_limit_kept": false
  },
  "bq.dispositions": {
   "create": [
    "CREATE_IF_NEEDED",
    "CREATE_NEVER"
   ],
   "schema_update": [
    "ALLOW_FIELD_ADDITION",
    "ALLOW_FIELD_RELAXATION"
   ],
   "source_format_names_exist": true,
   "source_formats": [
    "AVRO",
    "PARQUET",
    "ORC",
    "CSV",
    "NEWLINE_DELIMITED_JSON"
   ],
   "write": [
    "WRITE_APPEND",
    "WRITE_EMPTY",
    "WRITE_TRUNCATE",
    "WRITE_TRUNCATE_DATA"
   ]
  },
  "bq.summary": {
   "clustering": [
    "store_id",
    "status"
   ],
   "dataset_billing_model": "PHYSICAL",
   "dataset_location": "asia-southeast1",
   "dataset_time_travel_hours": 48,
   "dry_run_flag": true,
   "external_hive": {
    "mode": "AUTO",
    "sourceUriPrefix": "gs://brewline-landing-dev/orders/"
   },
   "load": {
    "createDisposition": "CREATE_NEVER",
    "schemaUpdateOptions": [
     "ALLOW_FIELD_ADDITION"
    ],
    "sourceFormat": "PARQUET",
    "writeDisposition": "WRITE_APPEND"
   },
   "partitioning": {
    "expirationMs": "34560000000",
    "field": "order_ts",
    "type": "DAY"
   },
   "policy_tag_names": [
    "projects/brewline-dev/locations/asia-southeast1/taxonomies/1234567890/policyTags/9876543210"
   ],
   "query_labels": {
    "env": "dev",
    "pipeline": "daily_orders"
   },
   "query_max_bytes_billed": "10737418240",
   "query_priority": "BATCH",
   "require_partition_filter": true
  },
  "ci.summary": {
   "cloudbuild": {
    "step_ids": [
     "unit-tests",
     "sql-compile",
     "terraform-checks",
     "deploy-dags"
    ],
    "timeout": "900s"
   },
   "cloudbuild_bad": {
    "exit_code": 1
   },
   "cloudbuild_ok": {
    "exit_code": 0
   },
   "deploy": {
    "permissions": {
     "contents": "read",
     "id-token": "write"
    },
    "steps": [
     "actions/checkout@v4",
     "google-github-actions/auth@v3",
     "google-github-actions/setup-gcloud@v3",
     "run"
    ],
    "uses_a_key_file": false
   },
   "deploy_bad": {
    "exit_code": 1
   },
   "deploy_ok": {
    "exit_code": 0
   }
  },
  "cli.summary": {
   "commands_checked": 24,
   "flags_not_found": []
  },
  "df.bigquery_options": {
   "incremental": {
    "clusterBy": [
     "store_id"
    ],
    "partitionBy": "DATE(order_ts)",
    "requirePartitionFilter": true
   },
   "unique_key": [
    "order_id"
   ]
  },
  "df.compile": {
   "assertion_names": [
    "curated_orders_assertions_rowConditions",
    "curated_orders_assertions_uniqueKey_0"
   ],
   "assertions": 2,
   "declarations": 1,
   "errors": 0,
   "tables": 3
  },
  "df.compile_error": {
   "errors": 2,
   "file": [
    "definitions/curated/orders.sqlx"
   ],
   "messages": [
    "Could not resolve \"stg_ordrs\"",
    "Missing dependency detected: Action \"brewline-dev.curated.orders\" depends on \"{\"name\":\"stg_ordrs\",\"includeDependentAssertions\":false}\" which does not exist"
   ],
   "typo": "ref(\"stg_ordrs\")"
  },
  "fn.summary": {
   "bug": {
    "failed": 1,
    "passed": 3,
    "target": "main_bug"
   },
   "clean": {
    "failed": 0,
    "passed": 4,
    "target": "main"
   }
  },
  "formats.column_read": {
   "column_chunk_bytes": {
    "channel": 25608,
    "customer_id": 135111,
    "order_id": 595979,
    "order_ts": 893595,
    "status": 25732,
    "store_id": 50661,
    "total_cents": 142694
   },
   "columns": 7,
   "file_bytes": 1871747,
   "row_groups": 2,
   "rows": 100000,
   "two_columns": [
    "store_id",
    "total_cents"
   ],
   "two_columns_bytes": 193355,
   "two_columns_share": 0.103
  },
  "formats.stats": {
   "order_id_max": 50000,
   "order_id_min": 1,
   "rows_in_first_group": 50000
  },
  "gcs.generations": {
   "generation_digits": 19,
   "overwrite_makes_a_new_generation": true,
   "size_after": 23
  },
  "gcs.hashes": {
   "bytes": 33,
   "crc32c": "90dfqw==",
   "crc32c_matches_own": true,
   "md5": "kzOQ+Hrp2qyZc6ngE967vA==",
   "md5_matches_own": true
  },
  "gcs.operations": {
   "compose_size_equals_sum": true,
   "copy_name": "archive/part-0001.json",
   "deleted_then_missing": true
  },
  "gcs.precondition": {
   "emulator_error": null,
   "emulator_location_answered": "US",
   "emulator_location_asked": "asia-southeast1",
   "emulator_refused": false,
   "real_service_answer": "documentation: HTTP 412 Precondition Failed",
   "sent_parameter": "ifGenerationMatch=0"
  },
  "gcs.signed": {
   "algorithm": "GOOG4-RSA-SHA256",
   "date": "20261110T020000Z",
   "expires_seconds": 900,
   "longer_expiry_verifies": false,
   "network_used": false,
   "other_object_name_verifies": false,
   "signature_hex_chars": 512,
   "signed_headers": "host",
   "verified_with_public_key": true
  },
  "idem.world": {
   "batch_rows": 1402,
   "changed": 15,
   "new": 12,
   "vanished": 8
  },
  "pubsub.defaults": {
   "publisher_batch": {
    "max_bytes": 1000000,
    "max_latency_seconds": 0.01,
    "max_messages": 100
   },
   "subscriber_flow_control": {
    "max_bytes": 104857600,
    "max_duration_per_lease_extension": 0,
    "max_lease_duration_seconds": 3600,
    "max_messages": 1000,
    "min_duration_per_lease_extension": 0
   }
  },
  "pubsub.message": {
   "attributes": {
    "source": "pos",
    "store_id": "s01"
   },
   "data_bytes": 15,
   "enable_message_ordering": true,
   "ordering_key": "s01"
  },
  "pubsub.model_settings": {
   "deadline long enough": {
    "ack_deadline": 60,
    "story": "The same slow order, with a deadline of 60."
   },
   "healthy": {
    "ack_deadline": 10,
    "story": "Three orders, each handled in 2 seconds, deadline 10."
   },
   "ordering key blocks": {
    "ack_deadline": 10,
    "horizon": 60,
    "ordered": true,
    "story": "Orders for store s01 must arrive in order. The first one always fails. Store s02 has no problem. No dead letter."
   },
   "ordering key, dead letter after 5": {
    "ack_deadline": 10,
    "horizon": 60,
    "max_attempts": 5,
    "ordered": true,
    "story": "The same, with max delivery attempts 5."
   },
   "poison, dead letter after 5": {
    "ack_deadline": 10,
    "max_attempts": 5,
    "story": "The same, with max delivery attempts 5."
   },
   "poison, no dead letter": {
    "ack_deadline": 10,
    "story": "One order always fails. Nothing limits the attempts. The model stops after 60 seconds."
   },
   "slow handler": {
    "ack_deadline": 10,
    "horizon": 100,
    "story": "One order takes 35 seconds to handle. The deadline is 10 and nothing extends it (a push endpoint behaves like this)."
   }
  },
  "pubsub.subscription": {
   "ack_deadline_seconds": 60,
   "dead_letter_policy": {
    "dead_letter_topic": "projects/brewline-dev/topics/pos-orders-dead",
    "max_delivery_attempts": 5
   },
   "detached": false,
   "enable_exactly_once_delivery": false,
   "enable_message_ordering": true,
   "expiration_policy": {
    "ttl": "0s"
   },
   "filter": "",
   "labels": {},
   "message_retention_duration": "604800s",
   "message_transforms": [],
   "name": "projects/brewline-dev/subscriptions/orders-to-bq",
   "retain_acked_messages": false,
   "retry_policy": {
    "maximum_backoff": "600s",
    "minimum_backoff": "10s"
   },
   "state": 0,
   "tags": {},
   "topic": "projects/brewline-dev/topics/pos-orders"
  },
  "spark.join": {
   "default_threshold_bytes": 10485760,
   "small_table_join": "BroadcastHashJoin",
   "threshold_off_join": "SortMergeJoin"
  },
  "spark.pruning": {
   "all_days": {
    "PartitionFilters": "none",
    "ReadSchema": "struct<store_id:string,total_cents:int>"
   },
   "one_day": {
    "PartitionFilters": "[isnotnull(dt), (dt = 2026-11-03)]",
    "ReadSchema": "struct<store_id:string,total_cents:int>"
   }
  },
  "spark.shuffle": {
   "shuffle_partitions_setting": 200,
   "tasks_per_stage_with_aqe": [
    2,
    2,
    1
   ],
   "tasks_per_stage_without_aqe": [
    200,
    2
   ]
  },
  "spark.skew": {
   "by_store": {
    "largest": 24088,
    "largest_over_median": 3.36,
    "median": 7162,
    "partitions_with_rows": 7,
    "smallest": 3597
   },
   "by_store_and_salt": {
    "largest": 12361,
    "largest_over_median": 1.76,
    "median": 7028,
    "partitions_with_rows": 8,
    "smallest": 3553
   },
   "share_of_s01": 0.342
  },
  "spark.written": {
   "files": 20,
   "partitions": 10
  },
  "sql.cost_world": {
   "billed_bytes_per_job": {
    "analysts, SELECT *": 43308285952,
    "daily_orders": 817889280,
    "dashboard_refresh": 8400142336
   },
   "days": 7,
   "example_price_per_tib_usd": 6.25,
   "jobs": 763,
   "ran_on": "a made-up table named jobs_log with the columns that the query reads: INFORMATION_SCHEMA itself does not exist outside BigQuery",
   "runs_per_day": {
    "analysts, SELECT *": 12,
    "daily_orders": 1,
    "dashboard_refresh": 96
   },
   "window": "2026-11-04 to 2026-11-10"
  },
  "sql.ddl_parse": {
   "columns": [
    "order_id",
    "store_id",
    "customer_id",
    "order_ts",
    "status",
    "total_cents",
    "items"
   ],
   "parsed_as": "Create",
   "properties": [
    [
     "PartitionedByProperty",
     "PARTITION BY DATE(order_ts)"
    ],
    [
     "ClusterProperty",
     "CLUSTER BY store_id, status"
    ],
    [
     "Property",
     "partition_expiration_days=400"
    ],
    [
     "Property",
     "require_partition_filter=TRUE"
    ]
   ]
  },
  "sql.dedup": {
   "after_qualify": 20000,
   "distinct_ids": 20000,
   "ids_delivered_twice": 600,
   "new_became_paid_on_second_delivery": 45,
   "raw_rows": 20600
  },
  "sql.estimate_detail": {
   "LIMIT 10": {
    "billed_bytes": 43308285952,
    "columns": [
     "order_id",
     "store_id",
     "customer_id",
     "order_ts",
     "status",
     "channel",
     "total_cents",
     "items.sku",
     "items.qty",
     "items.unit_cents"
    ],
    "example_usd": 0.2462,
    "logical_bytes": 43307360000,
    "logical_bytes_sample": 2165368,
    "partitions_read": 14,
    "partitions_total": 14,
    "scale": 20000,
    "sql": "SELECT * FROM `brewline-dev.curated.orders` LIMIT 10"
   },
   "SELECT *": {
    "billed_bytes": 43308285952,
    "columns": [
     "order_id",
     "store_id",
     "customer_id",
     "order_ts",
     "status",
     "channel",
     "total_cents",
     "items.sku",
     "items.qty",
     "items.unit_cents"
    ],
    "example_usd": 0.2462,
    "logical_bytes": 43307360000,
    "logical_bytes_sample": 2165368,
    "partitions_read": 14,
    "partitions_total": 14,
    "scale": 20000,
    "sql": "SELECT * FROM `brewline-dev.curated.orders`"
   },
   "SELECT * EXCEPT (items), one day": {
    "billed_bytes": 1304428544,
    "columns": [
     "order_id",
     "store_id",
     "customer_id",
     "order_ts",
     "status",
     "channel",
     "total_cents"
    ],
    "example_usd": 0.0074,
    "logical_bytes": 1303460000,
    "logical_bytes_sample": 65173,
    "partitions_read": 1,
    "partitions_total": 14,
    "scale": 20000,
    "sql": "SELECT * EXCEPT (items) FROM `brewline-dev.curated.orders` WHERE DATE(order_ts) = DATE '2026-11-03'"
   },
   "bound from a subquery": {
    "billed_bytes": 6400507904,
    "columns": [
     "order_id",
     "order_ts"
    ],
    "example_usd": 0.0364,
    "logical_bytes": 6400000000,
    "logical_bytes_sample": 320000,
    "partitions_read": 14,
    "partitions_total": 14,
    "scale": 20000,
    "sql": "SELECT order_id FROM `brewline-dev.curated.orders` WHERE order_ts > (SELECT MAX(order_ts) FROM `brewline-dev.curated.orders`)"
   },
   "filter on store only": {
    "billed_bytes": 8400142336,
    "columns": [
     "order_id",
     "store_id",
     "total_cents"
    ],
    "example_usd": 0.0477,
    "logical_bytes": 8400000000,
    "logical_bytes_sample": 420000,
    "partitions_read": 14,
    "partitions_total": 14,
    "scale": 20000,
    "sql": "SELECT order_id, total_cents FROM `brewline-dev.curated.orders` WHERE store_id = 's01'"
   },
   "item lines, one day": {
    "billed_bytes": 2198863872,
    "columns": [
     "order_id",
     "order_ts",
     "items.sku",
     "items.qty",
     "items.unit_cents"
    ],
    "example_usd": 0.0125,
    "logical_bytes": 2197920000,
    "logical_bytes_sample": 109896,
    "partitions_read": 1,
    "partitions_total": 14,
    "scale": 20000,
    "sql": "SELECT o.order_id, i.sku, i.qty FROM `brewline-dev.curated.orders` AS o, UNNEST(o.items) AS i WHERE DATE(o.order_ts) = DATE '2026-11-03'"
   },
   "one Singapore day, filtered with DATE(ts, zone)": {
    "billed_bytes": 11600396288,
    "columns": [
     "order_id",
     "store_id",
     "order_ts",
     "total_cents"
    ],
    "example_usd": 0.0659,
    "logical_bytes": 11600000000,
    "logical_bytes_sample": 580000,
    "partitions_read": 14,
    "partitions_total": 14,
    "scale": 20000,
    "sql": "SELECT order_id, store_id, total_cents FROM `brewline-dev.curated.orders` WHERE DATE(order_ts, 'Asia/Singapore') = DATE '2026-11-05'"
   },
   "one Singapore day, filtered with two bounds": {
    "billed_bytes": 1717567488,
    "columns": [
     "order_id",
     "store_id",
     "order_ts",
     "total_cents"
    ],
    "example_usd": 0.0098,
    "logical_bytes": 1716800000,
    "logical_bytes_sample": 85840,
    "partitions_read": 2,
    "partitions_total": 14,
    "scale": 20000,
    "sql": "SELECT order_id, store_id, total_cents FROM `brewline-dev.curated.orders` WHERE order_ts >= TIMESTAMP '2026-11-04 16:00:00+00' AND order_ts < TIMESTAMP '2026-11-05 16:00:00+00'"
   },
   "three columns": {
    "billed_bytes": 8400142336,
    "columns": [
     "order_id",
     "store_id",
     "total_cents"
    ],
    "example_usd": 0.0477,
    "logical_bytes": 8400000000,
    "logical_bytes_sample": 420000,
    "partitions_read": 14,
    "partitions_total": 14,
    "scale": 20000,
    "sql": "SELECT order_id, store_id, total_cents FROM `brewline-dev.curated.orders`"
   },
   "three columns and a filter, one UTC day": {
    "billed_bytes": 817889280,
    "columns": [
     "order_id",
     "store_id",
     "order_ts",
     "total_cents"
    ],
    "example_usd": 0.0046,
    "logical_bytes": 817220000,
    "logical_bytes_sample": 40861,
    "partitions_read": 1,
    "partitions_total": 14,
    "scale": 20000,
    "sql": "SELECT order_id, store_id, total_cents FROM `brewline-dev.curated.orders` WHERE DATE(order_ts) = DATE '2026-11-03'"
   },
   "three columns and a filter, seven UTC days": {
    "billed_bytes": 5821693952,
    "columns": [
     "order_id",
     "store_id",
     "order_ts",
     "total_cents"
    ],
    "example_usd": 0.0331,
    "logical_bytes": 5821460000,
    "logical_bytes_sample": 291073,
    "partitions_read": 7,
    "partitions_total": 14,
    "scale": 20000,
    "sql": "SELECT order_id, store_id, total_cents FROM `brewline-dev.curated.orders` WHERE order_ts >= TIMESTAMP '2026-11-03' AND order_ts < TIMESTAMP '2026-11-10'"
   }
  },
  "sql.estimate_rules": {
   "billing_rounding": "rounded up to a whole MiB, at least 10 MiB per table (documentation)",
   "clustering_not_modelled": true,
   "example_price_per_tib_usd": 6.25,
   "scale": 20000
  },
  "sql.leak": {
   "corr_clean_feature": 0.01,
   "corr_leaky_feature": 0.307,
   "customers": 2000,
   "cutoff": "2026-11-06",
   "label_rate": 0.88,
   "label_window": "2026-11-06 to 2026-11-09"
  },
  "sql.null_trap": {
   "customers": 2000,
   "not_exists_rows": 767,
   "not_in_rows": 0,
   "refunded_orders_without_customer": 618
  },
  "sql.row_policy": {
   "orders": 20000,
   "orders_visible_to_a_manager_of_s01": 6825,
   "store": "s01",
   "stores_in_the_table": 12
  },
  "sql.scd2": {
   "rows_after_first": 5,
   "rows_after_second": 5,
   "second_run_changes_nothing": true
  },
  "sql.split": {
   "by_customer": {
    "test": {
     "customers": 397,
     "orders": 2982
    },
    "train": {
     "customers": 1603,
     "orders": 11993
    }
   },
   "by_order": {
    "test": {
     "customers": 1535,
     "orders": 2933
    },
    "train": {
     "customers": 2000,
     "orders": 12042
    }
   },
   "customers_in_both_when_split_by_customer": 0,
   "customers_in_both_when_split_by_order": 1535,
   "note": "farm_fingerprint here is a stand-in hash: stable per key, but not the numbers BigQuery gives"
  },
  "sql.storage": {
   "days": 14,
   "fixed_rules": {
    "BOOL": 1,
    "DATE": 8,
    "DATETIME": 8,
    "FLOAT64": 8,
    "INT64": 8,
    "NUMERIC": 16,
    "TIME": 8,
    "TIMESTAMP": 8
   },
   "null_rule": "a NULL is 0 bytes",
   "sample_logical_bytes": 2165368,
   "scale": 20000,
   "scaled_gib": 40.3,
   "scaled_logical_bytes": 43307360000,
   "string_rule": "2 bytes plus the UTF-8 length"
  },
  "sql.world": {
   "customers": 2000,
   "days": 14,
   "duplicate_deliveries": 600,
   "guest_share": 0.251,
   "orders": 20000,
   "raw_deliveries": 20600,
   "s01_share": 0.341,
   "scale": 20000,
   "scaled_orders": 400000000,
   "stores": 12
  },
  "tf.checkov": {
   "all_fixed": {
    "failed": [],
    "failed_count": 0,
    "passed": 15
   },
   "baseline": {
    "failed": [
     "CKV_GCP_114 google_storage_bucket.landing",
     "CKV_GCP_117 google_project_iam_member.pipeline_role",
     "CKV_GCP_121 google_bigquery_table.orders",
     "CKV_GCP_15 google_bigquery_dataset.raw",
     "CKV_GCP_29 google_storage_bucket.landing",
     "CKV_GCP_49 google_project_iam_member.pipeline_role",
     "CKV_GCP_62 google_storage_bucket.landing",
     "CKV_GCP_78 google_storage_bucket.landing",
     "CKV_GCP_80 google_bigquery_table.orders",
     "CKV_GCP_81 google_bigquery_dataset.raw",
     "CKV_GCP_83 google_pubsub_topic.orders"
    ],
    "failed_count": 11,
    "passed": 3
   },
   "fix_bucket": {
    "failed": [
     "CKV_GCP_117 google_project_iam_member.pipeline_role",
     "CKV_GCP_121 google_bigquery_table.orders",
     "CKV_GCP_15 google_bigquery_dataset.raw",
     "CKV_GCP_49 google_project_iam_member.pipeline_role",
     "CKV_GCP_80 google_bigquery_table.orders",
     "CKV_GCP_81 google_bigquery_dataset.raw",
     "CKV_GCP_83 google_pubsub_topic.orders"
    ],
    "failed_count": 7,
    "passed": 8
   },
   "fix_dataset": {
    "failed": [
     "CKV_GCP_114 google_storage_bucket.landing",
     "CKV_GCP_117 google_project_iam_member.pipeline_role",
     "CKV_GCP_121 google_bigquery_table.orders",
     "CKV_GCP_29 google_storage_bucket.landing",
     "CKV_GCP_49 google_project_iam_member.pipeline_role",
     "CKV_GCP_62 google_storage_bucket.landing",
     "CKV_GCP_78 google_storage_bucket.landing",
     "CKV_GCP_80 google_bigquery_table.orders",
     "CKV_GCP_83 google_pubsub_topic.orders"
    ],
    "failed_count": 9,
    "passed": 5
   },
   "fix_iam": {
    "failed": [
     "CKV_GCP_114 google_storage_bucket.landing",
     "CKV_GCP_121 google_bigquery_table.orders",
     "CKV_GCP_15 google_bigquery_dataset.raw",
     "CKV_GCP_29 google_storage_bucket.landing",
     "CKV_GCP_62 google_storage_bucket.landing",
     "CKV_GCP_78 google_storage_bucket.landing",
     "CKV_GCP_80 google_bigquery_table.orders",
     "CKV_GCP_81 google_bigquery_dataset.raw",
     "CKV_GCP_83 google_pubsub_topic.orders"
    ],
    "failed_count": 9,
    "passed": 5
   },
   "fix_table": {
    "failed": [
     "CKV_GCP_114 google_storage_bucket.landing",
     "CKV_GCP_117 google_project_iam_member.pipeline_role",
     "CKV_GCP_15 google_bigquery_dataset.raw",
     "CKV_GCP_29 google_storage_bucket.landing",
     "CKV_GCP_49 google_project_iam_member.pipeline_role",
     "CKV_GCP_62 google_storage_bucket.landing",
     "CKV_GCP_78 google_storage_bucket.landing",
     "CKV_GCP_81 google_bigquery_dataset.raw",
     "CKV_GCP_83 google_pubsub_topic.orders"
    ],
    "failed_count": 9,
    "passed": 5
   },
   "fix_topic": {
    "failed": [
     "CKV_GCP_114 google_storage_bucket.landing",
     "CKV_GCP_117 google_project_iam_member.pipeline_role",
     "CKV_GCP_121 google_bigquery_table.orders",
     "CKV_GCP_15 google_bigquery_dataset.raw",
     "CKV_GCP_29 google_storage_bucket.landing",
     "CKV_GCP_49 google_project_iam_member.pipeline_role",
     "CKV_GCP_62 google_storage_bucket.landing",
     "CKV_GCP_78 google_storage_bucket.landing",
     "CKV_GCP_80 google_bigquery_table.orders",
     "CKV_GCP_81 google_bigquery_dataset.raw"
    ],
    "failed_count": 10,
    "passed": 4
   }
  },
  "tf.parse": {
   "resources": [
    "google_bigquery_dataset.raw",
    "google_bigquery_table.orders",
    "google_project_iam_member.pipeline_role",
    "google_pubsub_topic.orders",
    "google_service_account.pipeline",
    "google_storage_bucket.landing"
   ],
   "variables": [
    "project"
   ]
  }
 },
 "files": {
  "bq/dataset.json": "{\n \"datasetReference\": {\n  \"projectId\": \"brewline-dev\",\n  \"datasetId\": \"raw\"\n },\n \"labels\": {\n  \"layer\": \"raw\"\n },\n \"location\": \"asia-southeast1\",\n \"defaultTableExpirationMs\": \"2592000000\",\n \"maxTimeTravelHours\": 48,\n \"storageBillingModel\": \"PHYSICAL\",\n \"access\": [\n  {\n   \"groupByEmail\": \"analysts@example.com\",\n   \"role\": \"READER\"\n  },\n  {\n   \"userByEmail\": \"etl@brewline-dev.iam.gserviceaccount.com\",\n   \"role\": \"WRITER\"\n  }\n ]\n}",
  "bq/dry_run.json": "{\n \"query\": {\n  \"maximumBytesBilled\": \"10737418240\",\n  \"priority\": \"BATCH\",\n  \"useQueryCache\": false,\n  \"defaultDataset\": {\n   \"projectId\": \"brewline-dev\",\n   \"datasetId\": \"curated\"\n  },\n  \"queryParameters\": [\n   {\n    \"parameterType\": {\n     \"type\": \"DATE\"\n    },\n    \"parameterValue\": {\n     \"value\": \"2026-11-10\"\n    },\n    \"name\": \"day\"\n   }\n  ],\n  \"parameterMode\": \"NAMED\"\n },\n \"labels\": {\n  \"pipeline\": \"daily_orders\",\n  \"env\": \"dev\"\n },\n \"dryRun\": true\n}",
  "bq/external.json": "{\n \"tableReference\": {\n  \"projectId\": \"brewline-dev\",\n  \"datasetId\": \"raw\",\n  \"tableId\": \"orders_ext\"\n },\n \"labels\": {},\n \"externalDataConfiguration\": {\n  \"sourceFormat\": \"PARQUET\",\n  \"sourceUris\": [\n   \"gs://brewline-landing-dev/orders/*\"\n  ],\n  \"autodetect\": true,\n  \"hivePartitioningOptions\": {\n   \"mode\": \"AUTO\",\n   \"sourceUriPrefix\": \"gs://brewline-landing-dev/orders/\"\n  }\n }\n}",
  "bq/load.json": "{\n \"load\": {\n  \"sourceFormat\": \"PARQUET\",\n  \"writeDisposition\": \"WRITE_APPEND\",\n  \"createDisposition\": \"CREATE_NEVER\",\n  \"schemaUpdateOptions\": [\n   \"ALLOW_FIELD_ADDITION\"\n  ]\n }\n}",
  "bq/policy_tag_field.json": "{\n \"name\": \"email\",\n \"type\": \"STRING\",\n \"mode\": \"NULLABLE\",\n \"policyTags\": {\n  \"names\": [\n   \"projects/brewline-dev/locations/asia-southeast1/taxonomies/1234567890/policyTags/9876543210\"\n  ]\n }\n}",
  "bq/query.json": "{\n \"query\": {\n  \"maximumBytesBilled\": \"10737418240\",\n  \"priority\": \"BATCH\",\n  \"useQueryCache\": false,\n  \"defaultDataset\": {\n   \"projectId\": \"brewline-dev\",\n   \"datasetId\": \"curated\"\n  },\n  \"queryParameters\": [\n   {\n    \"parameterType\": {\n     \"type\": \"DATE\"\n    },\n    \"parameterValue\": {\n     \"value\": \"2026-11-10\"\n    },\n    \"name\": \"day\"\n   }\n  ],\n  \"parameterMode\": \"NAMED\"\n },\n \"labels\": {\n  \"pipeline\": \"daily_orders\",\n  \"env\": \"dev\"\n }\n}",
  "bq/table.json": "{\n \"tableReference\": {\n  \"projectId\": \"brewline-dev\",\n  \"datasetId\": \"curated\",\n  \"tableId\": \"orders\"\n },\n \"labels\": {\n  \"team\": \"data\",\n  \"layer\": \"curated\"\n },\n \"schema\": {\n  \"fields\": [\n   {\n    \"name\": \"order_id\",\n    \"type\": \"INT64\",\n    \"mode\": \"REQUIRED\"\n   },\n   {\n    \"name\": \"store_id\",\n    \"type\": \"STRING\",\n    \"mode\": \"REQUIRED\"\n   },\n   {\n    \"name\": \"customer_id\",\n    \"type\": \"STRING\",\n    \"mode\": \"NULLABLE\"\n   },\n   {\n    \"name\": \"order_ts\",\n    \"type\": \"TIMESTAMP\",\n    \"mode\": \"REQUIRED\"\n   },\n   {\n    \"name\": \"status\",\n    \"type\": \"STRING\",\n    \"mode\": \"NULLABLE\"\n   },\n   {\n    \"name\": \"items\",\n    \"type\": \"RECORD\",\n    \"mode\": \"REPEATED\",\n    \"fields\": [\n     {\n      \"name\": \"sku\",\n      \"type\": \"STRING\",\n      \"mode\": \"NULLABLE\"\n     },\n     {\n      \"name\": \"qty\",\n      \"type\": \"INT64\",\n      \"mode\": \"NULLABLE\"\n     },\n     {\n      \"name\": \"unit_cents\",\n      \"type\": \"INT64\",\n      \"mode\": \"NULLABLE\"\n     }\n    ]\n   }\n  ]\n },\n \"timePartitioning\": {\n  \"type\": \"DAY\",\n  \"field\": \"order_ts\",\n  \"expirationMs\": \"34560000000\"\n },\n \"clustering\": {\n  \"fields\": [\n   \"store_id\",\n   \"status\"\n  ]\n },\n \"requirePartitionFilter\": true\n}",
  "ci/cloudbuild.yaml": "# Cloud Build: check the pipeline code, then deploy the DAGs to the Composer bucket. The service account of the build needs only those two jobs.\nsteps:\n  - id: unit-tests\n    name: python:3.12\n    entrypoint: bash\n    args: ['-c', 'pip install -r requirements.txt && pytest -q']\n  - id: sql-compile\n    name: node:22\n    entrypoint: bash\n    args: ['-c', 'npx --yes @dataform/cli compile dataform']\n  - id: terraform-checks\n    name: python:3.12\n    entrypoint: bash\n    args: ['-c', 'pip install checkov && checkov -d iac --framework terraform --quiet']\n  - id: deploy-dags\n    name: gcr.io/google.com/cloudsdktool/cloud-sdk\n    entrypoint: gcloud\n    args: ['storage', 'rsync', '--recursive', 'dags', 'gs://${_COMPOSER_BUCKET}/dags']\nsubstitutions:\n  _COMPOSER_BUCKET: composer-bucket-dev\noptions:\n  logging: CLOUD_LOGGING_ONLY\ntimeout: 900s",
  "ci/deploy.yml": "# GitHub Actions: deploy to Google Cloud without a key file. The job proves who it is with a short-lived token from GitHub (workload identity federation).\nname: deploy-data-platform\non:\n  push:\n    branches: [main]\npermissions:\n  contents: read\n  id-token: write\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - id: auth\n        uses: google-github-actions/auth@v3\n        with:\n          workload_identity_provider: projects/123456789/locations/global/workloadIdentityPools/github/providers/brewline\n          service_account: sa-deploy@brewline-dev.iam.gserviceaccount.com\n      - uses: google-github-actions/setup-gcloud@v3\n      - run: gcloud storage rsync --recursive dags gs://composer-bucket-dev/dags",
  "ci/validate_cloudbuild_bad.txt": "Schema validation errors were encountered.\n  cloudbuild.yaml::$: 'steps' is a required property\nexit code: 1",
  "ci/validate_cloudbuild_ok.txt": "ok -- validation done\nexit code: 0",
  "ci/validate_deploy_bad.txt": "Schema validation errors were encountered.\n  deploy.yml::$.jobs.deploy: {...} is not valid under any of the given schemas\n  Underlying errors caused this.\n  Best Match:\n    $.jobs.deploy: 'runs-on' is a required property\n  3 other errors were produced. Use '--verbose' to see all errors.\nexit code: 1",
  "ci/validate_deploy_ok.txt": "ok -- validation done\nexit code: 0",
  "code/beam_jobs.py": "\"\"\"Apache Beam pipelines for the Dataflow lessons. They run on Beam's own local runners (pure Python), which use the same model of windows, triggers and watermarks as Dataflow.\nThe runners are named in the code on purpose: the default \"DirectRunner\" may fetch and start a separate program (Prism) for some batch pipelines, and these lessons run Python only.\n\nWhat is real: the Beam SDK, its windowing, its triggers and its panes. What is not: the Dataflow service (autoscaling, Streaming Engine, billing, drain, update).\nA TestStream replays events with a watermark that YOU move, so a late event is late on purpose and the result is the same on every run.\n\"\"\"\nimport json\nimport os\nimport tempfile\n\nimport apache_beam as beam\nfrom apache_beam.runners.direct.direct_runner import BundleBasedDirectRunner\nfrom apache_beam.runners.portability.fn_api_runner.fn_runner import FnApiRunner\nfrom apache_beam.options.pipeline_options import PipelineOptions, StandardOptions\nfrom apache_beam.testing.test_stream import TestStream\nfrom apache_beam.transforms.trigger import AccumulationMode, AfterCount, AfterProcessingTime, AfterWatermark\nfrom apache_beam.transforms.window import FixedWindows, Sessions, TimestampedValue\n\nTIMING = {0: 'EARLY', 1: 'ON_TIME', 2: 'LATE'}\n\n\nclass LogPane(beam.DoFn):\n    \"\"\"Write one line per pane (one firing of a window) to a file, so that the result can be read after the pipeline ends.\"\"\"\n\n    def __init__(self, path):\n        self.path = path\n\n    def process(self, kv, window=beam.DoFn.WindowParam, pane=beam.DoFn.PaneInfoParam):\n        with open(self.path, 'a') as f:\n            f.write(json.dumps({'key': kv[0], 'value': kv[1], 'window': [int(window.start), int(window.end)], 'timing': TIMING.get(int(pane.timing), str(pane.timing)),\n                                'index': pane.index}) + '\\n')\n        yield kv\n\n\ndef _streaming():\n    opts = PipelineOptions(['--runner=DirectRunner'])\n    opts.view_as(StandardOptions).streaming = True\n    return opts\n\n\ndef _read(path):\n    return [json.loads(line) for line in open(path)]\n\n\ndef late_data(allowed_lateness, late_trigger, accumulation, early=False):\n    \"\"\"Count sales per store in one minute windows. Four events are on time, one is late by a few seconds, one is late by minutes.\n\n    On time: store s01 at seconds 5, 20 and 55, store s02 at second 30. The watermark then moves to 70, so the first window closes at 60.\n    Then an event stamped second 40 arrives (late, but inside the allowed lateness if you gave any), then the watermark moves to 200, then an event stamped second 10 arrives.\n    \"\"\"\n    path = os.path.join(tempfile.mkdtemp(prefix='beam-'), 'panes.jsonl')\n    open(path, 'w').close()\n    stream = TestStream().advance_watermark_to(0)\n    stream = stream.add_elements([TimestampedValue(('s01', 1), 5), TimestampedValue(('s01', 1), 20), TimestampedValue(('s02', 1), 30)])\n    if early:\n        stream = stream.advance_processing_time(30)\n    stream = (stream.advance_watermark_to(50).add_elements([TimestampedValue(('s01', 1), 55)]).advance_watermark_to(70)\n              .add_elements([TimestampedValue(('s01', 1), 40)]).advance_watermark_to(200).add_elements([TimestampedValue(('s01', 1), 10)]).advance_watermark_to_infinity())\n    trigger = AfterWatermark(early=AfterProcessingTime(20) if early else None, late=late_trigger)\n    with beam.Pipeline(runner=BundleBasedDirectRunner(), options=_streaming()) as p:\n        (p | stream\n           | beam.WindowInto(FixedWindows(60), trigger=trigger, accumulation_mode=accumulation, allowed_lateness=allowed_lateness)\n           | beam.CombinePerKey(sum)\n           | beam.ParDo(LogPane(path)))\n    return sorted(_read(path), key=lambda r: (r['window'], r['key'], r['index']))\n\n\ndef sessions(gap):\n    \"\"\"One customer opens the app at seconds 0, 20 and 45, then again at 200 and 215. A session is a run of events with no gap longer than `gap`.\"\"\"\n    path = os.path.join(tempfile.mkdtemp(prefix='beam-'), 'panes.jsonl')\n    open(path, 'w').close()\n    seconds = [0, 20, 45, 200, 215]\n    with beam.Pipeline(runner=FnApiRunner()) as p:\n        (p | beam.Create(seconds)\n           | beam.Map(lambda t: TimestampedValue(('c0007', 1), t))\n           | beam.WindowInto(Sessions(gap))\n           | beam.CombinePerKey(sum)\n           | beam.ParDo(LogPane(path)))\n    return sorted(_read(path), key=lambda r: r['window'])\n\n\nclass ParseLine(beam.DoFn):\n    \"\"\"Parse a JSON line. A line that cannot be parsed goes to a second output instead of failing the whole bundle.\"\"\"\n    DEAD = 'dead'\n\n    def process(self, line):\n        try:\n            ev = json.loads(line)\n            if not isinstance(ev, dict) or 'order_id' not in ev:\n                raise ValueError('no order_id')\n            yield ev\n        except Exception as err:\n            yield beam.pvalue.TaggedOutput(self.DEAD, {'line': line, 'error': type(err).__name__ + ': ' + str(err)[:60]})\n\n\ndef dead_letter(lines):\n    d = tempfile.mkdtemp(prefix='beam-')\n    ok_path, dead_path = os.path.join(d, 'ok.jsonl'), os.path.join(d, 'dead.jsonl')\n    with beam.Pipeline(runner=FnApiRunner()) as p:\n        res = p | beam.Create(lines) | beam.ParDo(ParseLine()).with_outputs(ParseLine.DEAD, main='ok')\n        res.ok | 'OkJson' >> beam.Map(json.dumps) | 'WriteOk' >> beam.io.WriteToText(ok_path, shard_name_template='', num_shards=1)\n        res[ParseLine.DEAD] | 'Json' >> beam.Map(json.dumps) | 'WriteDead' >> beam.io.WriteToText(dead_path, shard_name_template='', num_shards=1)\n    ok = _read(ok_path) if os.path.exists(ok_path) else []\n    dead = _read(dead_path) if os.path.exists(dead_path) else []\n    return ok, dead\n\n\nclass KeepFirst(beam.DoFn):\n    def process(self, kv, window=beam.DoFn.WindowParam):\n        yield kv[1][0]\n\n\ndef dedupe(events, size):\n    \"\"\"Remove events that were delivered twice. The key is the event id; the window is `size` seconds. Duplicates in different windows are not seen as duplicates.\"\"\"\n    d = tempfile.mkdtemp(prefix='beam-')\n    out = os.path.join(d, 'out.jsonl')\n    with beam.Pipeline(runner=FnApiRunner()) as p:\n        (p | beam.Create(events)\n           | beam.Map(lambda e: TimestampedValue(e, e['event_ts']))\n           | beam.WindowInto(FixedWindows(size))\n           | beam.Map(lambda e: (e['event_id'], e))\n           | beam.GroupByKey()\n           | beam.ParDo(KeepFirst())\n           | beam.Map(json.dumps)\n           | beam.io.WriteToText(out, shard_name_template='', num_shards=1))\n    return _read(out)\n\n\nDATAFLOW_FLAGS = ['--runner=DataflowRunner', '--project=brewline-dev', '--region=asia-southeast1', '--temp_location=gs://brewline-tmp-dev/tmp',\n                  '--staging_location=gs://brewline-tmp-dev/staging', '--service_account_email=sa-pipeline@brewline-dev.iam.gserviceaccount.com',\n                  '--subnetwork=regions/asia-southeast1/subnetworks/data', '--no_use_public_ips', '--max_num_workers=10', '--machine_type=n2-standard-2', '--streaming',\n                  '--labels=pipeline=orders-stream', '--labels=env=dev']",
  "code/bq_jobs.py": "\"\"\"What the BigQuery client library would send. Nothing here calls Google: to_api_repr() shows the request body that the library builds.\n\nRun it to print the bodies. They are the same JSON that the REST API of BigQuery receives, so this is a safe way to see what each setting does.\n\"\"\"\nimport json\n\nfrom google.cloud import bigquery\n\nS = bigquery.SchemaField\n\n\ndef orders_table():\n    schema = [\n        S('order_id', 'INT64', mode='REQUIRED'),\n        S('store_id', 'STRING', mode='REQUIRED'),\n        S('customer_id', 'STRING'),\n        S('order_ts', 'TIMESTAMP', mode='REQUIRED'),\n        S('status', 'STRING'),\n        S('items', 'RECORD', mode='REPEATED', fields=[S('sku', 'STRING'), S('qty', 'INT64'), S('unit_cents', 'INT64')]),\n    ]\n    table = bigquery.Table('brewline-dev.curated.orders', schema=schema)\n    table.time_partitioning = bigquery.TimePartitioning(type_=bigquery.TimePartitioningType.DAY, field='order_ts', expiration_ms=400 * 24 * 3600 * 1000)\n    table.clustering_fields = ['store_id', 'status']\n    table.require_partition_filter = True\n    table.labels = {'team': 'data', 'layer': 'curated'}\n    return table\n\n\ndef raw_dataset():\n    ds = bigquery.Dataset('brewline-dev.raw')\n    ds.location = 'asia-southeast1'\n    ds.default_table_expiration_ms = 30 * 24 * 3600 * 1000\n    ds.max_time_travel_hours = 48\n    ds.storage_billing_model = 'PHYSICAL'\n    ds.labels = {'layer': 'raw'}\n    ds.access_entries = [bigquery.AccessEntry('READER', 'groupByEmail', 'analysts@example.com'),\n                         bigquery.AccessEntry('WRITER', 'userByEmail', 'etl@brewline-dev.iam.gserviceaccount.com')]\n    return ds\n\n\ndef append_load():\n    \"\"\"A load job that appends Parquet files, may add columns, and never creates the table by itself.\"\"\"\n    return bigquery.LoadJobConfig(\n        source_format=bigquery.SourceFormat.PARQUET,\n        write_disposition=bigquery.WriteDisposition.WRITE_APPEND,\n        create_disposition=bigquery.CreateDisposition.CREATE_NEVER,\n        schema_update_options=[bigquery.SchemaUpdateOption.ALLOW_FIELD_ADDITION],\n    )\n\n\ndef guarded_query():\n    \"\"\"A query that cannot bill more than 10 GiB, runs as a batch job, and carries labels that show up in the billing export.\"\"\"\n    return bigquery.QueryJobConfig(\n        maximum_bytes_billed=10 * 1024 ** 3,\n        priority=bigquery.QueryPriority.BATCH,\n        use_query_cache=False,\n        labels={'pipeline': 'daily_orders', 'env': 'dev'},\n        default_dataset='brewline-dev.curated',\n        query_parameters=[bigquery.ScalarQueryParameter('day', 'DATE', '2026-11-10')],\n    )\n\n\ndef dry_run_query():\n    cfg = guarded_query()\n    cfg.dry_run = True\n    return cfg\n\n\ndef external_parquet():\n    \"\"\"A table that reads Parquet files in Cloud Storage in place, with Hive style folders (dt=2026-11-10/) treated as a partition column.\"\"\"\n    ext = bigquery.ExternalConfig('PARQUET')\n    ext.source_uris = ['gs://brewline-landing-dev/orders/*']\n    ext.autodetect = True\n    hp = bigquery.HivePartitioningOptions()\n    hp.mode = 'AUTO'\n    hp.source_uri_prefix = 'gs://brewline-landing-dev/orders/'\n    ext.hive_partitioning = hp\n    table = bigquery.Table('brewline-dev.raw.orders_ext')\n    table.external_data_configuration = ext\n    return table\n\n\ndef tagged_field():\n    \"\"\"A column that carries a policy tag. Who may read it, or read it masked, is decided by roles on the tag (mission 12).\"\"\"\n    tag = 'projects/brewline-dev/locations/asia-southeast1/taxonomies/1234567890/policyTags/9876543210'\n    return S('email', 'STRING', mode='NULLABLE', policy_tags=bigquery.PolicyTagList(names=[tag]))\n\n\ndef bodies():\n    return {\n        'table': orders_table().to_api_repr(),\n        'dataset': raw_dataset().to_api_repr(),\n        'load': append_load().to_api_repr(),\n        'query': guarded_query().to_api_repr(),\n        'dry_run': dry_run_query().to_api_repr(),\n        'external': external_parquet().to_api_repr(),\n        'policy_tag_field': tagged_field().to_api_repr(),\n    }\n\n\nif __name__ == '__main__':\n    print(json.dumps(bodies(), indent=1))",
  "code/gcs_demo.py": "\"\"\"Cloud Storage with the real client library, on an emulator that runs on this machine, and a signed URL that is made without any network.\n\nThe emulator (gcp-storage-emulator) is a small Python program that speaks the JSON API of Cloud Storage. It is not Cloud Storage. It ignores bucket locations\nand it does not enforce preconditions. The lesson shows both, because an emulator that says yes to everything is the main way to be surprised later.\nA signed URL needs no network: the library signs a text with a private key, and Cloud Storage checks the signature when someone uses the URL.\n\"\"\"\nimport datetime\nimport hashlib\nimport urllib.parse\n\nfrom cryptography.hazmat.primitives import hashes, serialization\nfrom cryptography.hazmat.primitives.asymmetric import padding, rsa\nfrom google.auth.credentials import AnonymousCredentials\nfrom google.cloud import storage\nfrom google.oauth2 import service_account\n\n\ndef anonymous_client(project='brewline-dev'):\n    \"\"\"A client that talks to the emulator (STORAGE_EMULATOR_HOST is set) and sends no credentials.\"\"\"\n    return storage.Client(project=project, credentials=AnonymousCredentials())\n\n\ndef land_files(client, bucket_name):\n    \"\"\"Three files in a Hive style layout: orders/dt=2026-11-10/part-0000.json and so on.\"\"\"\n    bucket = client.create_bucket(bucket_name, location='asia-southeast1')\n    for dt, parts in (('2026-11-09', 2), ('2026-11-10', 3)):\n        for i in range(parts):\n            bucket.blob('orders/dt=%s/part-%04d.json' % (dt, i)).upload_from_string(('{\"order_id\": %d}\\n' % (i + 1)).encode(), content_type='application/json')\n    bucket.blob('exports/week-45/report.csv').upload_from_string(b'store_id,total\\ns01,450\\n', content_type='text/csv')\n    return bucket\n\n\ndef list_like_folders(client, bucket_name, prefix, delimiter='/'):\n    \"\"\"There are no folders in a bucket: a name is one string. prefix and delimiter make the names look like a tree.\"\"\"\n    it = client.list_blobs(bucket_name, prefix=prefix, delimiter=delimiter)\n    names = [b.name for b in it]\n    return {'prefix': prefix, 'delimiter': delimiter, 'objects': names, 'prefixes': sorted(it.prefixes)}\n\n\ndef lifecycle_rules():\n    \"\"\"Move to a cheaper class after 30 days, delete after a year, and delete old versions after 3 newer ones exist. Returned as the JSON the API takes.\"\"\"\n    b = storage.Bucket(storage.Client(project='brewline-dev', credentials=AnonymousCredentials()), 'brewline-landing-dev')\n    b.add_lifecycle_set_storage_class_rule('NEARLINE', age=30, matches_storage_class=['STANDARD'])\n    b.add_lifecycle_delete_rule(age=365)\n    b.add_lifecycle_delete_rule(number_of_newer_versions=3, is_live=False)\n    return list(b.lifecycle_rules)\n\n\ndef throwaway_credentials():\n    \"\"\"A service account key made on the spot. It belongs to no project and works nowhere: it only lets the library sign.\"\"\"\n    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)\n    pem = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode()\n    info = {'type': 'service_account', 'project_id': 'brewline-dev', 'private_key_id': 'k1', 'private_key': pem,\n            'client_email': 'reader@brewline-dev.iam.gserviceaccount.com', 'client_id': '1', 'token_uri': 'https://oauth2.googleapis.com/token'}\n    return service_account.Credentials.from_service_account_info(info), key.public_key()\n\n\ndef signed_url(creds, bucket, name, minutes=15):\n    client = storage.Client(project='brewline-dev', credentials=creds)\n    blob = client.bucket(bucket).blob(name)\n    return blob.generate_signed_url(version='v4', expiration=datetime.timedelta(minutes=minutes), method='GET', credentials=creds)\n\n\ndef check_signature(url, public_key, object_name=None):\n    \"\"\"Rebuild the text that was signed, from the URL alone, and check the signature with the public key. Returns True or False.\"\"\"\n    u = urllib.parse.urlsplit(url)\n    q = {k: v[0] for k, v in urllib.parse.parse_qs(u.query).items()}\n    sig = bytes.fromhex(q.pop('X-Goog-Signature'))\n    path = u.path if object_name is None else '/' + urllib.parse.quote(object_name, safe='/')\n    query = '&'.join('%s=%s' % (urllib.parse.quote(k, safe=''), urllib.parse.quote(q[k], safe='')) for k in sorted(q))\n    canonical = '\\n'.join(['GET', path, query, 'host:' + u.netloc + '\\n', q['X-Goog-SignedHeaders'], 'UNSIGNED-PAYLOAD'])\n    scope = q['X-Goog-Credential'].split('/', 1)[1]\n    to_sign = '\\n'.join(['GOOG4-RSA-SHA256', q['X-Goog-Date'], scope, hashlib.sha256(canonical.encode()).hexdigest()])\n    try:\n        public_key.verify(sig, to_sign.encode(), padding.PKCS1v15(), hashes.SHA256())\n        return True, canonical, to_sign\n    except Exception:\n        return False, canonical, to_sign",
  "code/loads.py": "\"\"\"Five ways to load one day of orders into a table, written in BigQuery SQL. Which of them can you run twice without harm?\n\nThe SQL is BigQuery SQL. It was translated by sqlglot and run in DuckDB (see warehouse.py), because BigQuery was not reachable. The set logic is the same.\nThe experiment: load the batch of one day, load it again (a retry after a timeout), then load a corrected batch for the same day in which\n15 orders changed status, 8 orders disappeared at the source and 12 orders are new. After each step the table is compared with what it should hold.\n\"\"\"\nimport datetime as dt\n\nimport brewdata\nimport warehouse as W\n\nDAY = '2026-11-10'\nCOLS = 'order_id, store_id, status, order_ts, total_cents'\n\nAPPEND = \"\"\"\nINSERT INTO `brewline-dev.curated.orders_t` (order_id, store_id, status, order_ts, total_cents)\nSELECT order_id, store_id, status, order_ts, total_cents FROM `brewline-dev.staging.batch`\n\"\"\"\n\nMERGE = \"\"\"\nMERGE `brewline-dev.curated.orders_t` AS t\nUSING `brewline-dev.staging.batch` AS s\nON t.order_id = s.order_id\nWHEN MATCHED AND t.status != s.status THEN UPDATE SET status = s.status\nWHEN NOT MATCHED THEN INSERT (order_id, store_id, status, order_ts, total_cents) VALUES (s.order_id, s.store_id, s.status, s.order_ts, s.total_cents)\n\"\"\"\n\nMERGE_AND_DELETE = \"\"\"\nMERGE `brewline-dev.curated.orders_t` AS t\nUSING `brewline-dev.staging.batch` AS s\nON t.order_id = s.order_id\nWHEN MATCHED AND t.status != s.status THEN UPDATE SET status = s.status\nWHEN NOT MATCHED BY TARGET THEN INSERT (order_id, store_id, status, order_ts, total_cents) VALUES (s.order_id, s.store_id, s.status, s.order_ts, s.total_cents)\nWHEN NOT MATCHED BY SOURCE AND DATE(t.order_ts) = DATE '2026-11-10' THEN DELETE\n\"\"\"\n\nOVERWRITE_PARTITION = \"\"\"\nBEGIN TRANSACTION;\nDELETE FROM `brewline-dev.curated.orders_t` WHERE DATE(order_ts) = DATE '2026-11-10';\nINSERT INTO `brewline-dev.curated.orders_t` (order_id, store_id, status, order_ts, total_cents)\nSELECT order_id, store_id, status, order_ts, total_cents FROM `brewline-dev.staging.batch`;\nCOMMIT TRANSACTION;\n\"\"\"\n\nRELOAD_ALL = \"\"\"\nCREATE OR REPLACE TABLE `brewline-dev.curated.orders_t` AS\nSELECT order_id, store_id, status, order_ts, total_cents FROM `brewline-dev.staging.everything`\n\"\"\"\n\nMETHODS = [('append', APPEND), ('merge', MERGE), ('merge_and_delete', MERGE_AND_DELETE), ('overwrite_partition', OVERWRITE_PARTITION), ('reload_all', RELOAD_ALL)]\n\nDEDUPE = \"\"\"\nSELECT order_id, store_id, status, order_ts, total_cents\nFROM `brewline-dev.raw.orders_raw`\nQUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY ingest_ts DESC) = 1\n\"\"\"\n\n\ndef build_world(wh):\n    \"\"\"The raw layer, the clean history up to the day before, the batch of the day, the corrected batch, and the truth after the correction.\"\"\"\n    rows = brewdata.orders()\n    wh.load('raw', 'orders_raw', brewdata.raw_orders(rows))\n    wh.run(\"CREATE OR REPLACE TABLE `brewline-dev.staging.clean` AS \" + DEDUPE)\n    day_rows = wh.run(\"SELECT %s FROM `brewline-dev.staging.clean` WHERE DATE(order_ts) = DATE '%s' ORDER BY order_id\" % (COLS, DAY))[1]\n    ids = [r[0] for r in day_rows]\n    changed, vanished = ids[:15], ids[15:23]\n    wh.run(\"CREATE OR REPLACE TABLE `brewline-dev.staging.batch` AS SELECT %s FROM `brewline-dev.staging.clean` WHERE DATE(order_ts) = DATE '%s'\" % (COLS, DAY))\n    wh.run(\"CREATE OR REPLACE TABLE `brewline-dev.staging.batch2` AS SELECT order_id, store_id, \"\n           \"CASE WHEN order_id IN (%s) THEN 'REFUNDED_X' ELSE status END AS status, order_ts, total_cents FROM `brewline-dev.staging.batch` WHERE order_id NOT IN (%s)\"\n           % (','.join(map(str, changed)), ','.join(map(str, vanished))))\n    wh.run(\"UPDATE `brewline-dev.staging.batch2` SET status = 'REFUNDED' WHERE status = 'REFUNDED_X'\")\n    new_rows = [\"(%d, 's01', 'PAID', TIMESTAMP '%s 0%d:15:00', 520)\" % (900001 + i, DAY, i % 9) for i in range(12)]\n    wh.run(\"INSERT INTO `brewline-dev.staging.batch2` VALUES \" + ','.join(new_rows))\n    wh.run(\"CREATE OR REPLACE TABLE `brewline-dev.staging.history` AS SELECT %s FROM `brewline-dev.staging.clean` WHERE DATE(order_ts) < DATE '%s'\" % (COLS, DAY))\n    wh.run(\"CREATE OR REPLACE TABLE `brewline-dev.staging.truth1` AS SELECT * FROM `brewline-dev.staging.history` UNION ALL SELECT * FROM `brewline-dev.staging.batch`\")\n    wh.run(\"CREATE OR REPLACE TABLE `brewline-dev.staging.truth2` AS SELECT * FROM `brewline-dev.staging.history` UNION ALL SELECT * FROM `brewline-dev.staging.batch2`\")\n    return {'changed': len(changed), 'vanished': len(vanished), 'new': len(new_rows), 'batch_rows': len(day_rows)}\n\n\nWRONG = \"\"\"\nSELECT COUNT(*) FROM (\n  SELECT order_id, store_id, status, order_ts, total_cents, COUNT(*) AS n FROM `brewline-dev.curated.orders_t` GROUP BY ALL\n) AS a\nFULL OUTER JOIN (\n  SELECT order_id, store_id, status, order_ts, total_cents, COUNT(*) AS n FROM `brewline-dev.staging.%s` GROUP BY ALL\n) AS b USING (order_id, store_id, status, order_ts, total_cents)\nWHERE IFNULL(a.n, 0) != IFNULL(b.n, 0)\n\"\"\"\n\n\ndef wrong_rows(wh, truth):\n    \"\"\"How many distinct rows differ from the truth, missing, extra, changed or repeated? Zero means the table is exactly right.\"\"\"\n    return wh.scalar(WRONG % truth)\n\n\ndef run_methods():\n    wh = W.Warehouse()\n    world = build_world(wh)\n    out = []\n    for name, sql in METHODS:\n        wh.run(\"CREATE OR REPLACE TABLE `brewline-dev.curated.orders_t` AS SELECT * FROM `brewline-dev.staging.history`\")\n        steps = []\n\n        def step(label, batch, truth):\n            if name == 'reload_all':\n                wh.run(\"CREATE OR REPLACE TABLE `brewline-dev.staging.everything` AS SELECT * FROM `brewline-dev.staging.%s`\" % truth)\n                text = sql\n            else:\n                text = sql.replace('staging.batch', 'staging.' + batch)\n            wh.run(text)\n            steps.append({'step': label, 'rows': wh.scalar(\"SELECT COUNT(*) FROM `brewline-dev.curated.orders_t`\"), 'expected': wh.scalar(\"SELECT COUNT(*) FROM `brewline-dev.staging.%s`\" % truth),\n                          'wrong': wrong_rows(wh, truth)})\n        step('first run', 'batch', 'truth1')\n        step('the same batch again', 'batch', 'truth1')\n        step('corrected batch', 'batch2', 'truth2')\n        out.append({'method': name, 'steps': steps})\n    return world, out\n\n\nif __name__ == '__main__':\n    print(run_methods())",
  "code/pubsub_demo.py": "\"\"\"Pub/Sub, in two parts.\n\nPart 1 is the real client library, used offline: it shows the settings of a subscription and the defaults of the publisher and the subscriber.\nPart 2 is a MODEL, written for these lessons from the documentation: a few rules (ack deadline, redelivery, dead letter after N attempts, order by key) that you can run\nand count. The model is not Google's service. It has no backoff, no batching and no flow control, and it never loses a message. Real Pub/Sub will differ in detail.\n\"\"\"\nfrom google.cloud import pubsub_v1\nfrom google.cloud.pubsub_v1 import types\n\n\ndef client_objects():\n    \"\"\"The settings that decide how a subscription behaves, as the library holds them.\"\"\"\n    sub = types.Subscription(\n        name='projects/brewline-dev/subscriptions/orders-to-bq',\n        topic='projects/brewline-dev/topics/pos-orders',\n        ack_deadline_seconds=60,\n        enable_message_ordering=True,\n        enable_exactly_once_delivery=False,\n        message_retention_duration={'seconds': 7 * 24 * 3600},\n        retain_acked_messages=False,\n        dead_letter_policy={'dead_letter_topic': 'projects/brewline-dev/topics/pos-orders-dead', 'max_delivery_attempts': 5},\n        retry_policy={'minimum_backoff': {'seconds': 10}, 'maximum_backoff': {'seconds': 600}},\n        expiration_policy={'ttl': {'seconds': 0}},\n    )\n    return types.Subscription.to_dict(sub)\n\n\ndef library_defaults():\n    b = types.BatchSettings()\n    f = types.FlowControl()\n    return {'publisher_batch': {'max_bytes': b.max_bytes, 'max_latency_seconds': b.max_latency, 'max_messages': b.max_messages},\n            'subscriber_flow_control': {'max_messages': f.max_messages, 'max_bytes': f.max_bytes, 'max_lease_duration_seconds': f.max_lease_duration,\n                                        'min_duration_per_lease_extension': f.min_duration_per_lease_extension, 'max_duration_per_lease_extension': f.max_duration_per_lease_extension}}\n\n\ndef one_message():\n    m = types.PubsubMessage(data=b'{\"order_id\": 7}', attributes={'store_id': 's01', 'source': 'pos'}, ordering_key='s01')\n    return {'data_bytes': len(m.data), 'attributes': dict(m.attributes), 'ordering_key': m.ordering_key}\n\n\ndef publisher_with_ordering_options():\n    \"\"\"The publisher must be told that ordering is wanted, or a message with an ordering key is refused.\"\"\"\n    opts = pubsub_v1.types.PublisherOptions(enable_message_ordering=True)\n    return {'enable_message_ordering': opts.enable_message_ordering}\n\n\n# ---------------------------------------------------------------------------------------------------------------------------------------------------\n# The model\n# ---------------------------------------------------------------------------------------------------------------------------------------------------\nclass Msg:\n    def __init__(self, mid, key=None, work=1, fails=0):\n        self.id, self.key, self.work, self.fails = mid, key, work, fails     # work: seconds the handler needs. fails: how many deliveries fail first (-1 = always)\n        self.deliveries = 0\n        self.done_runs = 0\n        self.state = 'pending'                                              # pending, acked, dead\n        self.delivered_at = []\n\n\ndef simulate(messages, ack_deadline, max_attempts=None, ordered=False, extend_deadline=False, horizon=60):\n    \"\"\"Deliver the messages to one subscriber that can run any number of handlers at once. Time moves in whole seconds.\n\n    A delivery starts a handler, which needs `work` seconds, or 1 second if it is going to fail. A handler that succeeds acks the message, if it is still waiting.\n    A handler that fails nacks, and the message is delivered again at once. If the ack deadline runs out before the handler is done (and nothing extends it),\n    the message is delivered again while the old handler runs on, so its side effect happens twice. After `max_attempts` deliveries a message is moved to the\n    dead letter topic. With `ordered`, a message waits while an earlier message with the same key is still waiting.\n    \"\"\"\n    for m in messages:\n        m.deliveries, m.done_runs, m.state, m.delivered_at, m.next_at = 0, 0, 'pending', [], 0\n    running = []                                        # (finish time, message, fails)\n    for t in range(horizon + 1):\n        for fin, m, fails in [r for r in running if r[0] == t]:\n            running.remove((fin, m, fails))\n            if fails:\n                if m.state == 'pending':\n                    m.next_at = t                         # a nack: deliver again at once\n            else:\n                m.done_runs += 1                          # the side effect happened\n                if m.state == 'pending':\n                    m.state, m.next_at = 'acked', None\n        for i, m in enumerate(messages):\n            if m.state != 'pending' or m.next_at != t:\n                continue\n            if ordered and m.key is not None and any(x.key == m.key and x.state == 'pending' for x in messages[:i]):\n                m.next_at = t + 1                         # blocked behind an earlier message with the same key\n                continue\n            if max_attempts is not None and m.deliveries >= max_attempts:\n                m.state, m.next_at = 'dead', None\n                continue\n            m.deliveries += 1\n            m.delivered_at.append(t)\n            fails = m.fails == -1 or m.deliveries <= m.fails\n            running.append((t + (1 if fails else m.work), m, fails))\n            if fails:\n                m.next_at = None                          # the nack will say when\n            elif m.work > ack_deadline and not extend_deadline:\n                m.next_at = t + ack_deadline              # the deadline runs out first: delivered again\n            else:\n                m.next_at = None                          # the ack will come in time\n    return [{'id': m.id, 'key': m.key, 'deliveries': m.deliveries, 'side_effects': m.done_runs, 'state': m.state, 'first_delivery': (m.delivered_at or [None])[0]} for m in messages]\n\n\ndef scenarios():\n    \"\"\"Six situations, each with a short story. The numbers come from simulate().\"\"\"\n    out = []\n\n    def add(name, story, msgs, **kw):\n        res = simulate(msgs, **kw)\n        out.append({'name': name, 'story': story, 'settings': kw, 'result': res})\n    add('healthy', 'Three orders, each handled in 2 seconds, deadline 10.', [Msg('m1', work=2), Msg('m2', work=2), Msg('m3', work=2)], ack_deadline=10)\n    add('slow handler', 'One order takes 35 seconds to handle. The deadline is 10 and nothing extends it (a push endpoint behaves like this).', [Msg('m1', work=35)], ack_deadline=10, horizon=100)\n    add('deadline long enough', 'The same slow order, with a deadline of 60.', [Msg('m1', work=35)], ack_deadline=60)\n    add('poison, no dead letter', 'One order always fails. Nothing limits the attempts. The model stops after 60 seconds.', [Msg('m1', fails=-1), Msg('m2', work=1)], ack_deadline=10)\n    add('poison, dead letter after 5', 'The same, with max delivery attempts 5.', [Msg('m1', fails=-1), Msg('m2', work=1)], ack_deadline=10, max_attempts=5)\n    add('ordering key blocks', 'Orders for store s01 must arrive in order. The first one always fails. Store s02 has no problem. No dead letter.',\n        [Msg('a1', key='s01', fails=-1), Msg('a2', key='s01'), Msg('a3', key='s01'), Msg('b1', key='s02'), Msg('b2', key='s02')], ack_deadline=10, ordered=True, horizon=60)\n    add('ordering key, dead letter after 5', 'The same, with max delivery attempts 5.',\n        [Msg('a1', key='s01', fails=-1), Msg('a2', key='s01'), Msg('a3', key='s01'), Msg('b1', key='s02'), Msg('b2', key='s02')], ack_deadline=10, ordered=True, max_attempts=5, horizon=60)\n    return out",
  "code/spark_job.py": "\"\"\"A small Spark job on this machine (local mode), for the Dataproc lessons: what the plan reads, how many tasks a shuffle makes, small files, skew, and a join.\n\nDataproc runs the same Spark. What is not here: a cluster, YARN, Google Cloud Storage, the BigQuery connector, autoscaling, and the cost of any of them.\nRun: python spark_job.py   (needs pyspark and Java 17 or 21; the recorder calls it with the interpreter named by GCP_SPARK_PYTHON). Prints one line that starts with RESULT.\n\"\"\"\nimport contextlib\nimport glob\nimport io\nimport json\nimport os\nimport re\nimport shutil\nimport statistics\nimport tempfile\n\nfrom pyspark.sql import SparkSession, functions as F\n\nwork = tempfile.mkdtemp(prefix='spark-gcp-')\nspark = (SparkSession.builder.master('local[2]').appName('brewline').config('spark.ui.enabled', 'false').config('spark.sql.shuffle.partitions', '200')\n         .config('spark.driver.memory', '1g').config('spark.sql.adaptive.enabled', 'false').config('spark.ui.showConsoleProgress', 'false').getOrCreate())\nspark.sparkContext.setLogLevel('ERROR')\nsc = spark.sparkContext\n\n\ndef plan_text(df):\n    buf = io.StringIO()\n    with contextlib.redirect_stdout(buf):\n        df.explain(mode='formatted')\n    return buf.getvalue()\n\n\ndef stage_tasks(label, action):\n    \"\"\"Run an action in its own job group and report how many tasks each of its stages had.\"\"\"\n    sc.setJobGroup(label, label)\n    action()\n    tr = sc.statusTracker()\n    tasks = []\n    for job in tr.getJobIdsForGroup(label):\n        for sid in tr.getJobInfo(job).stageIds:\n            info = tr.getStageInfo(sid)\n            tasks.append(info.numTasks)\n    return sorted(tasks, reverse=True)\n\n\n# 60,000 orders over 10 days. Store s01 sells about a third of them: that is the skew.\nn = 60000\norders = (spark.range(n).withColumnRenamed('id', 'order_id').withColumn('r', F.rand(7)).withColumn('r2', F.rand(11))\n          .withColumn('store_id', F.when(F.col('r') < 0.34, F.lit('s01')).otherwise(F.format_string('s%02d', (F.floor(F.col('r2') * 11) + 2).cast('int'))))\n          .withColumn('dt', F.date_format(F.expr('date_add(DATE\\'2026-11-01\\', cast(order_id % 10 as int))'), 'yyyy-MM-dd'))\n          .withColumn('total_cents', (F.col('order_id') * 7 % 2700 + 300).cast('int')).drop('r', 'r2'))\npath = os.path.join(work, 'orders')\norders.write.partitionBy('dt').parquet(path)\nout = {'spark_version': spark.version, 'files_written': len(glob.glob(path + '/dt=*/*.parquet')), 'partitions_written': len(glob.glob(path + '/dt=*'))}\n\n# 1. What the plan reads\no = spark.read.parquet(path)\nspark.conf.set('spark.sql.shuffle.partitions', '8')\nfull = plan_text(o.groupBy('store_id').agg(F.sum('total_cents')))\none_day = plan_text(o.where(\"dt = '2026-11-03'\").groupBy('store_id').agg(F.sum('total_cents')))\ngrab = lambda t, key: (re.search(key + r': (.*)', t) or [None, 'none'])[1].strip()\nout['pruning'] = {'all_days': {'PartitionFilters': re.sub(r'#\\d+', '', grab(full, 'PartitionFilters')), 'ReadSchema': grab(full, 'ReadSchema')},\n                  'one_day': {'PartitionFilters': re.sub(r'#\\d+', '', grab(one_day, 'PartitionFilters')), 'ReadSchema': grab(one_day, 'ReadSchema')}}\n\n# 2. How many tasks a shuffle makes, without and with adaptive query execution\nspark.conf.set('spark.sql.shuffle.partitions', '200')\nagg = lambda: o.groupBy('store_id').agg(F.sum('total_cents').alias('t')).collect()\nno_aqe = stage_tasks('no_aqe', agg)\nspark.conf.set('spark.sql.adaptive.enabled', 'true')\naqe = stage_tasks('aqe', agg)\nspark.conf.set('spark.sql.adaptive.enabled', 'false')\nout['shuffle'] = {'shuffle_partitions_setting': 200, 'tasks_per_stage_without_aqe': no_aqe, 'tasks_per_stage_with_aqe': aqe}\n\n# 3. Small files: how many files does a write make?\nfiles = []\nfor label, df in (('repartition(200)', o.repartition(200)), ('repartition(4)', o.repartition(4)), ('coalesce(1)', o.coalesce(1))):\n    dest = os.path.join(work, 'out_' + re.sub(r'\\W', '', label))\n    df.write.parquet(dest)\n    fs = glob.glob(dest + '/*.parquet')\n    files.append({'write': label, 'files': len(fs), 'bytes': sum(os.path.getsize(f) for f in fs), 'bytes_per_file': sum(os.path.getsize(f) for f in fs) // len(fs)})\nout['small_files'] = files\n\n# 4. Skew: rows in each of 8 partitions when the data is split by store, and when it is split by store plus a salt\ndef spread(df):\n    rows = [r['n'] for r in df.groupBy(F.spark_partition_id().alias('p')).agg(F.count('*').alias('n')).collect()]\n    rows.sort(reverse=True)\n    return {'partitions_with_rows': len(rows), 'largest': rows[0], 'median': int(statistics.median(rows)), 'smallest': rows[-1], 'largest_over_median': round(rows[0] / statistics.median(rows), 2)}\nspark.conf.set('spark.sql.shuffle.partitions', '8')\nby_store = o.repartition(8, 'store_id')\nsalted = o.withColumn('salt', F.pmod(F.hash('order_id'), F.lit(4))).repartition(8, 'store_id', 'salt')\nout['skew'] = {'by_store': spread(by_store), 'by_store_and_salt': spread(salted), 'share_of_s01': round(o.where(\"store_id = 's01'\").count() / n, 3)}\n\n# 5. A join with a small table: broadcast or sort-merge?\nstores = spark.createDataFrame([('s%02d' % i, 'city%d' % i) for i in range(1, 13)], ['store_id', 'city'])\njoined = o.join(stores, 'store_id')\nbroadcast_plan = plan_text(joined)\nspark.conf.set('spark.sql.autoBroadcastJoinThreshold', '-1')\nmerge_plan = plan_text(o.join(stores, 'store_id'))\nspark.conf.set('spark.sql.autoBroadcastJoinThreshold', '10485760')\nout['join'] = {'default_threshold_bytes': 10485760, 'small_table_join': 'BroadcastHashJoin' if 'BroadcastHashJoin' in broadcast_plan else 'other',\n               'threshold_off_join': 'SortMergeJoin' if 'SortMergeJoin' in merge_plan else 'other'}\nspark.stop()\nshutil.rmtree(work, ignore_errors=True)\nprint('RESULT' + json.dumps(out))",
  "code/warehouse.py": "\"\"\"A small stand-in for BigQuery, for the lessons. BigQuery itself was not reachable where this ran.\n\nWhat is real here: sqlglot reads the BigQuery SQL and writes DuckDB SQL, and DuckDB runs it. The SQL logic (QUALIFY, MERGE, UNNEST, windows) behaves the same.\nWhat is not BigQuery: the engine, the time it takes, the plan, the slots, and the bytes. Bytes are an ESTIMATE made by estimate() below from the sizes\nthat the BigQuery documentation gives for each data type. Only a dry run in BigQuery gives the number that you will be billed.\n\"\"\"\nimport datetime as dt\nimport hashlib\n\nimport duckdb\nimport pyarrow as pa\nimport sqlglot\nfrom sqlglot import exp\n\nPROJECT = 'brewline-dev'\nFIXED_SIZES = {'INT64': 8, 'FLOAT64': 8, 'NUMERIC': 16, 'BOOL': 1, 'DATE': 8, 'DATETIME': 8, 'TIME': 8, 'TIMESTAMP': 8}   # logical bytes per value, from the pricing page\nMIB = 1024 * 1024\nTIB = 1024 ** 4\nEXAMPLE_PRICE_PER_TIB = 6.25          # an example rate in US dollars, not a quote\n\n\ndef _fingerprint(s):\n    \"\"\"A STAND-IN for FARM_FINGERPRINT: stable per key, a signed 64 bit integer, but not the same numbers that BigQuery gives.\"\"\"\n    if s is None:\n        return None\n    h = int.from_bytes(hashlib.blake2b(s.encode('utf-8'), digest_size=8).digest(), 'big', signed=True)\n    return h\n\n\nclass Warehouse:\n    def __init__(self):\n        self.con = duckdb.connect()\n        self.con.execute(\"SET TimeZone = 'UTC'\")\n        self.con.execute('ATTACH \\':memory:\\' AS \"%s\"' % PROJECT)\n        for ds in ('raw', 'staging', 'curated'):\n            self.con.execute('CREATE SCHEMA \"%s\".%s' % (PROJECT, ds))\n        self.con.execute('USE \"%s\".curated' % PROJECT)\n        self.con.create_function('farm_fingerprint', _fingerprint, [duckdb.sqltypes.VARCHAR], duckdb.sqltypes.BIGINT, null_handling='special')\n\n    def load(self, dataset, name, rows):\n        \"\"\"Create dataset.name from a list of dicts (datetimes are UTC timestamps, lists of dicts become ARRAY<STRUCT>).\"\"\"\n        tbl = pa.Table.from_pylist(rows)\n        fields = []\n        for f in tbl.schema:\n            if pa.types.is_timestamp(f.type):\n                f = pa.field(f.name, pa.timestamp('us', tz='UTC'))\n            fields.append(f)\n        tbl = pa.Table.from_pylist(rows, schema=pa.schema(fields))\n        self.con.register('_tmp_load', tbl)\n        self.con.execute('CREATE OR REPLACE TABLE \"%s\".%s.%s AS SELECT * FROM _tmp_load' % (PROJECT, dataset, name))\n        self.con.unregister('_tmp_load')\n\n    @staticmethod\n    def translate(sql):\n        \"\"\"BigQuery SQL in, DuckDB SQL out (one string per statement).\"\"\"\n        return sqlglot.transpile(sql, read='bigquery', write='duckdb')\n\n    def run(self, sql):\n        \"\"\"Run every statement; return (columns, rows) of the last one that gives rows, or (['rows_affected'], [[n]]).\"\"\"\n        last = (['rows_affected'], [[0]])\n        for stmt in self.translate(sql):\n            cur = self.con.execute(stmt)\n            if cur.description:\n                last = ([d[0] for d in cur.description], [list(r) for r in cur.fetchall()])\n            else:\n                last = (['rows_affected'], [[0]])\n        return last\n\n    def scalar(self, sql):\n        return self.run(sql)[1][0][0]\n\n\n# ---------------------------------------------------------------------------------------------------------------------------------------------------\n# An estimate of the bytes that a query reads, with the sizes of the data types from the documentation\n# ---------------------------------------------------------------------------------------------------------------------------------------------------\nORDERS_SCHEMA = [('order_id', 'INT64'), ('store_id', 'STRING'), ('customer_id', 'STRING'), ('order_ts', 'TIMESTAMP'), ('status', 'STRING'), ('channel', 'STRING'),\n                 ('total_cents', 'INT64'), ('items.sku', 'STRING'), ('items.qty', 'INT64'), ('items.unit_cents', 'INT64')]\n\n\ndef leaf_size_sql(col, typ):\n    \"\"\"SQL that adds up the logical bytes of one column in DuckDB: a NULL is 0 bytes, a STRING is 2 bytes plus its UTF-8 length, the rest is fixed.\"\"\"\n    if col.startswith('items.'):\n        leaf = col.split('.', 1)[1]\n        if typ == 'STRING':\n            return 'COALESCE(list_sum(list_transform(items, lambda x: 2 + strlen(x.%s))), 0)' % leaf\n        return 'COALESCE(list_sum(list_transform(items, lambda x: %d)), 0)' % FIXED_SIZES[typ]\n    if typ == 'STRING':\n        return 'CASE WHEN %s IS NULL THEN 0 ELSE 2 + strlen(%s) END' % (col, col)\n    return 'CASE WHEN %s IS NULL THEN 0 ELSE %d END' % (col, FIXED_SIZES[typ])\n\n\ndef column_sizes(wh, table, schema, part_col='order_ts'):\n    \"\"\"{day: {column: logical bytes}} for a table partitioned by DATE(part_col).\"\"\"\n    sel = ', '.join('SUM(%s) AS \"%s\"' % (leaf_size_sql(c, t), c) for c, t in schema)\n    res = wh.con.execute('SELECT CAST(%s AS DATE) AS d, %s FROM %s GROUP BY 1 ORDER BY 1' % (part_col, sel, table)).fetchall()\n    return {r[0]: {c: int(r[i + 1]) for i, (c, _) in enumerate(schema)} for r in res}\n\n\ndef referenced_columns(sql, schema, alias_table='orders'):\n    \"\"\"Which leaf columns of the table does the query touch? SELECT * means all of them; SELECT * EXCEPT (...) means all but those.\"\"\"\n    tree = sqlglot.parse_one(sql, read='bigquery')\n    names = [c for c, _ in schema]\n    unnest_alias = {}\n    for u in tree.find_all(exp.Unnest):\n        alias = u.args.get('alias')\n        arg = u.expressions[0] if u.expressions else None\n        if alias is not None and isinstance(arg, exp.Column):\n            unnest_alias[alias.name if hasattr(alias, 'name') else str(alias)] = arg.name\n    used = set()\n    star = [s for s in tree.find_all(exp.Star)]\n    for s in star:\n        except_cols = {c.name for c in (s.args.get('except_') or s.args.get('except') or [])}\n        used.update(n for n in names if n.split('.')[0] not in except_cols and n not in except_cols)\n    for col in tree.find_all(exp.Column):\n        if isinstance(col.this, exp.Star):\n            continue\n        table = col.table\n        if table in unnest_alias:\n            leaf = unnest_alias[table] + '.' + col.name\n            if leaf in names:\n                used.add(leaf)\n        elif col.name in names:\n            used.add(col.name)\n        elif table == '' and col.name in unnest_alias:\n            pass\n    for u in tree.find_all(exp.Unnest):                 # UNNEST(o.items) alone reads the whole array\n        arg = u.expressions[0] if u.expressions else None\n        if isinstance(arg, exp.Column) and not any(l.startswith(arg.name + '.') for l in used):\n            used.update(n for n in names if n.startswith(arg.name + '.'))\n    return sorted(used, key=names.index)\n\n\ndef partitions_read(wh, sql, table, part_col='order_ts'):\n    \"\"\"Which day partitions can the WHERE clause not rule out? Only the parts of the filter that talk about the partition column are used.\"\"\"\n    tree = sqlglot.parse_one(sql, read='bigquery')\n    where = tree.args.get('where')\n    all_days = [r[0] for r in wh.con.execute('SELECT DISTINCT CAST(%s AS DATE) FROM %s ORDER BY 1' % (part_col, table)).fetchall()]\n    if where is None:\n        return all_days\n    conj = []\n\n    def split(node):\n        if isinstance(node, exp.And):\n            split(node.left)\n            split(node.right)\n        else:\n            conj.append(node)\n    split(where.this)\n    ok_sides = {part_col, 'DATE(%s)' % part_col}                 # the filter must name the partition column itself, or DATE() of it, and compare it with constants\n\n    def bare(node):\n        \"\"\"The same expression without table names in front of the columns (o.order_ts becomes order_ts).\"\"\"\n        node = node.copy()\n        for col in node.find_all(exp.Column):\n            col.set('table', None)\n        return node\n\n    def prunable(c):\n        c = bare(c)\n        if isinstance(c, (exp.EQ, exp.GT, exp.GTE, exp.LT, exp.LTE)):\n            left, right = c.left, c.right\n            return (left.sql('bigquery') in ok_sides and not list(right.find_all(exp.Column))) or (right.sql('bigquery') in ok_sides and not list(left.find_all(exp.Column)))\n        if isinstance(c, exp.Between):\n            return c.this.sql('bigquery') in ok_sides and not any(list(x.find_all(exp.Column)) for x in (c.args['low'], c.args['high']))\n        return False\n    usable = [bare(c) for c in conj if prunable(c)]\n    if not usable:\n        return all_days\n    cond = ' AND '.join(sqlglot.transpile(c.sql(dialect='bigquery'), read='bigquery', write='duckdb')[0] for c in usable)\n    return [r[0] for r in wh.con.execute('SELECT DISTINCT CAST(%s AS DATE) FROM %s WHERE %s ORDER BY 1' % (part_col, table, cond)).fetchall()]\n\n\ndef estimate(wh, sql, table, sizes, schema=ORDERS_SCHEMA, scale=1):\n    \"\"\"Logical bytes of the columns and partitions that the query reads. scale says how many times bigger the real table is than the sample (rows and bytes).\"\"\"\n    cols = referenced_columns(sql, schema)\n    days = partitions_read(wh, sql, table)\n    logical = sum(sizes[d][c] for d in days for c in cols)\n    at_scale = logical * scale\n    billed = 0 if at_scale == 0 else max(10 * MIB, -(-at_scale // MIB) * MIB)          # rounded up to a whole MiB, at least 10 MiB\n    return {'columns': cols, 'partitions_read': len(days), 'partitions_total': len(sizes), 'logical_bytes_sample': logical, 'scale': scale,\n            'logical_bytes': at_scale, 'billed_bytes': billed, 'example_usd': round(billed / TIB * EXAMPLE_PRICE_PER_TIB, 4)}",
  "dags/brewline_daily.py": "\"\"\"The daily orders DAG of Brewline. It runs at 02:00 Singapore time, merges yesterday's staged orders into the table, then checks the result.\n\nComposer runs Airflow, so this is an ordinary Airflow DAG. Nothing heavy happens when the file is read: the work is in the tasks.\n\"\"\"\nimport pendulum\nfrom airflow.providers.google.cloud.operators.bigquery import BigQueryInsertJobOperator\nfrom airflow.providers.standard.operators.empty import EmptyOperator\nfrom airflow.sdk import DAG, task\n\nwith DAG(\n    dag_id=\"brewline_daily\",\n    schedule=\"0 2 * * *\",\n    start_date=pendulum.datetime(2026, 11, 1, tz=\"Asia/Singapore\"),\n    catchup=False,\n    default_args={\"retries\": 2},\n    tags=[\"brewline\", \"orders\"],\n) as dag:\n    start = EmptyOperator(task_id=\"start\")\n\n    merge_orders = BigQueryInsertJobOperator(\n        task_id=\"merge_orders\",\n        location=\"asia-southeast1\",\n        project_id=\"brewline-dev\",\n        configuration={\n            \"query\": {\n                \"query\": \"MERGE `brewline-dev.curated.orders` AS t USING `brewline-dev.staging.orders_{{ ds_nodash }}` AS s ON t.order_id = s.order_id \"\n                         \"WHEN MATCHED THEN UPDATE SET status = s.status WHEN NOT MATCHED THEN INSERT ROW\",\n                \"useLegacySql\": False,\n            }\n        },\n    )\n\n    @task\n    def check_rows(ds=None):\n        return \"checked \" + ds\n\n    start >> merge_orders >> check_rows()",
  "dags/broken_import.py": "\"\"\"A DAG file with a typo in an import. Airflow lists it as an import error and shows no DAG from this file.\"\"\"\nimport pendulum\nfrom airflow.sdk import DAG\nfrom airflow.providers.google.cloud.operators.bigqeury import BigQueryInsertJobOperator   # the typo is in \"bigqeury\"\n\nwith DAG(dag_id=\"broken_import\", schedule=None, start_date=pendulum.datetime(2026, 11, 1, tz=\"UTC\")):\n    BigQueryInsertJobOperator(task_id=\"x\", configuration={})",
  "dags/flaky_demo.py": "\"\"\"A task that fails twice and then works, to show what retries do. The counter lives in a file so that it survives between tries.\"\"\"\nimport datetime\nimport os\n\nimport pendulum\nfrom airflow.sdk import DAG, task\n\nCOUNT_FILE = os.environ.get(\"FLAKY_COUNT_FILE\", \"/tmp/flaky_count\")\n\nwith DAG(dag_id=\"flaky_demo\", schedule=None, start_date=pendulum.datetime(2026, 11, 1, tz=\"UTC\"), catchup=False) as dag:\n\n    @task(retries=2, retry_delay=datetime.timedelta(seconds=1))\n    def extract():\n        tries = int(open(COUNT_FILE).read()) if os.path.exists(COUNT_FILE) else 0\n        open(COUNT_FILE, \"w\").write(str(tries + 1))\n        if tries < 2:\n            raise RuntimeError(\"source not ready (try %d)\" % (tries + 1))\n        return \"rows=10\"\n\n    @task\n    def load(value):\n        return value\n\n    load(extract())",
  "dags/heavy_top_level.py": "\"\"\"A DAG file that does slow work when it is READ. The scheduler reads every DAG file again and again, so slow work here slows everything.\"\"\"\nimport time\n\nimport pendulum\nfrom airflow.providers.standard.operators.empty import EmptyOperator\nfrom airflow.sdk import DAG\n\ntime.sleep(2)                                   # imagine a call to an API or a database here, at the top of the file\n\nwith DAG(dag_id=\"heavy_top_level\", schedule=None, start_date=pendulum.datetime(2026, 11, 1, tz=\"UTC\")):\n    EmptyOperator(task_id=\"start\")",
  "dataform/constants.js": "// A JavaScript include. Every file in includes/ is available in the SQLX files under the name of the file: ${constants.SALE_STATUSES}.\nconst SALE_STATUSES = \"'PAID', 'REFUNDED'\";\nmodule.exports = { SALE_STATUSES };",
  "dataform/daily_sales.sqlx": "config {\n  type: \"table\",\n  schema: \"curated\",\n  bigquery: { partitionBy: \"sale_date\", clusterBy: [\"store_id\"] },\n  tags: [\"daily\"]\n}\n\nSELECT\n  DATE(order_ts, \"Asia/Singapore\") AS sale_date,\n  store_id,\n  COUNT(*) AS orders,\n  SUM(total_cents) AS revenue_cents\nFROM ${ref(\"orders\")}\nWHERE order_ts >= TIMESTAMP(\"2026-10-01\") AND status IN (${constants.SALE_STATUSES})\nGROUP BY sale_date, store_id",
  "dataform/orders.sqlx": "config {\n  type: \"incremental\",\n  schema: \"curated\",\n  uniqueKey: [\"order_id\"],\n  bigquery: {\n    partitionBy: \"DATE(order_ts)\",\n    clusterBy: [\"store_id\"],\n    requirePartitionFilter: true\n  },\n  assertions: {\n    uniqueKey: [\"order_id\"],\n    nonNull: [\"order_id\", \"order_ts\", \"store_id\"],\n    rowConditions: [\"total_cents >= 0\"]\n  }\n}\n\nSELECT order_id, store_id, customer_id, order_ts, status, total_cents\nFROM ${ref(\"stg_orders\")}\n${when(incremental(), `WHERE order_ts > (SELECT MAX(order_ts) FROM ${self()})`)}",
  "dataform/orders_raw.sqlx": "config {\n  type: \"declaration\",\n  schema: \"raw\",\n  name: \"orders_raw\",\n  description: \"Orders as they land: one row per delivery, so an order can appear twice.\"\n}",
  "dataform/stg_orders.sqlx": "config {\n  type: \"view\",\n  schema: \"staging\",\n  description: \"One row per order: the latest delivery wins.\"\n}\n\nSELECT order_id, store_id, customer_id, order_ts, status, total_cents\nFROM ${ref(\"raw\", \"orders_raw\")}\nQUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY ingest_ts DESC) = 1",
  "dataform/workflow_settings.yaml": "defaultProject: brewline-dev\ndefaultLocation: asia-southeast1\ndefaultDataset: staging\ndefaultAssertionDataset: dataform_assertions\ndataformCoreVersion: 3.0.0",
  "fn/main.py": "\"\"\"A Cloud Run function (2nd generation) that receives an order from Pub/Sub, wrapped in a CloudEvent, and stores it once.\n\nPub/Sub delivers at least once, so the same message can arrive twice. The function therefore keys the write on the order id: the second delivery changes nothing.\nA message that cannot be read raises an error. The error makes the platform answer 500, and Pub/Sub delivers the message again (and, with a dead letter topic, gives up after N tries).\n\"\"\"\nimport base64\nimport json\n\nimport functions_framework\n\nORDERS = {}                                  # stands in for a table keyed on order_id (BigQuery would use MERGE)\n\n\n@functions_framework.cloud_event\ndef on_order(cloud_event):\n    message = cloud_event.data[\"message\"]\n    order = json.loads(base64.b64decode(message[\"data\"]).decode(\"utf-8\"))\n    if \"order_id\" not in order:\n        raise ValueError(\"message %s has no order_id\" % message[\"messageId\"])\n    ORDERS[order[\"order_id\"]] = order        # same key, same row: running it twice is the same as running it once",
  "fn/main_bug.py": "\"\"\"The same function with a bug: it appends on every delivery, so a second delivery of the same message stores the order twice.\"\"\"\nimport base64\nimport json\n\nimport functions_framework\n\nORDERS = []\n\n\n@functions_framework.cloud_event\ndef on_order(cloud_event):\n    message = cloud_event.data[\"message\"]\n    order = json.loads(base64.b64decode(message[\"data\"]).decode(\"utf-8\"))\n    if \"order_id\" not in order:\n        raise ValueError(\"message %s has no order_id\" % message[\"messageId\"])\n    ORDERS.append(order)",
  "fn/pytest_bug.txt": ".F..                                                                     [100%]\n=================================== FAILURES ===================================\nE   AssertionError: assert 2 == 1\n     +  where 2 = len([{'order_id': 7, 'store_id': 's01'}, {'order_id': 7, 'store_id': 's01'}])\n     +    where [{'order_id': 7, 'store_id': 's01'}, {'order_id': 7, 'store_id': 's01'}] = target.ORDERS\ntest_main.py:48: AssertionError: assert 2 == 1\n=========================== short test summary info ============================\nFAILED test_main.py::test_the_same_message_twice_stores_one_order - Assertion...\n1 failed, 3 passed",
  "fn/pytest_clean.txt": "....                                                                     [100%]\n4 passed",
  "fn/test_main.py": "\"\"\"Tests for the order function.\nThe HTTP tests send real CloudEvents through the Functions Framework, the same wrapper that Cloud Run runs. The idempotency test calls the function itself, twice,\nwith the same message. Set FN_TARGET=main_bug to run the same tests against the copy with the bug.\"\"\"\nimport base64\nimport importlib\nimport json\nimport os\n\nimport functions_framework\nimport pytest\nfrom cloudevents.http import CloudEvent\n\ntarget = importlib.import_module(os.environ.get(\"FN_TARGET\", \"main\"))\n\n\ndef event_parts(order, message_id=\"m-1\"):\n    data = {\"message\": {\"data\": base64.b64encode(json.dumps(order).encode()).decode(), \"messageId\": message_id, \"attributes\": {}, \"publishTime\": \"2026-11-10T02:00:00Z\"},\n            \"subscription\": \"projects/brewline-dev/subscriptions/orders-to-fn\"}\n    attrs = {\"specversion\": \"1.0\", \"type\": \"google.cloud.pubsub.topic.v1.messagePublished\", \"source\": \"//pubsub.googleapis.com/projects/brewline-dev/topics/pos-orders\", \"id\": message_id}\n    return attrs, data\n\n\ndef as_body(order, message_id=\"m-1\"):\n    attrs, data = event_parts(order, message_id)\n    return json.dumps(dict(attrs, datacontenttype=\"application/json\", data=data))\n\n\n@pytest.fixture()\ndef client():\n    target.ORDERS.clear()\n    app = functions_framework.create_app(target=\"on_order\", source=target.__file__, signature_type=\"cloudevent\")\n    return app.test_client()\n\n\ndef post(client, payload):\n    return client.post(\"/\", headers={\"Content-Type\": \"application/cloudevents+json\"}, data=payload)\n\n\ndef test_a_pubsub_message_is_accepted(client):\n    assert post(client, as_body({\"order_id\": 7, \"store_id\": \"s01\"})).status_code == 200\n\n\ndef test_the_same_message_twice_stores_one_order():\n    target.ORDERS.clear()\n    event = CloudEvent(*event_parts({\"order_id\": 7, \"store_id\": \"s01\"}))\n    target.on_order(event)\n    target.on_order(event)\n    assert len(target.ORDERS) == 1\n\n\ndef test_a_message_without_an_order_id_is_an_error_so_that_it_is_retried(client):\n    response = post(client, as_body({\"store_id\": \"s01\"}, \"m-2\"))\n    assert response.status_code == 500\n\n\ndef test_a_plain_json_post_is_refused(client):\n    assert client.post(\"/\", headers={\"Content-Type\": \"application/json\"}, data=json.dumps({\"order_id\": 1})).status_code == 400",
  "iac/main.tf": "# Brewline data platform, first version. It works, and it has the gaps that a review catches.\nvariable \"project\" {\n  type    = string\n  default = \"brewline-dev\"\n}\n\nresource \"google_storage_bucket\" \"landing\" {\n  name     = \"brewline-landing-dev\"\n  location = \"asia-southeast1\"\n}\n\nresource \"google_bigquery_dataset\" \"raw\" {\n  dataset_id = \"raw\"\n  location   = \"asia-southeast1\"\n\n  access {\n    role          = \"READER\"\n    special_group = \"allAuthenticatedUsers\"\n  }\n}\n\nresource \"google_bigquery_table\" \"orders\" {\n  dataset_id = google_bigquery_dataset.raw.dataset_id\n  table_id   = \"orders\"\n\n  time_partitioning {\n    type  = \"DAY\"\n    field = \"order_ts\"\n  }\n  clustering = [\"store_id\"]\n}\n\nresource \"google_service_account\" \"pipeline\" {\n  account_id = \"sa-pipeline\"\n}\n\nresource \"google_project_iam_member\" \"pipeline_role\" {\n  project = var.project\n  role    = \"roles/owner\"\n  member  = \"serviceAccount:${google_service_account.pipeline.email}\"\n}\n\nresource \"google_pubsub_topic\" \"orders\" {\n  name = \"pos-orders\"\n}",
  "iac/main_fixed.tf": "# Brewline data platform, after the review. The same resources, with the gaps closed.\nvariable \"project\" {\n  type    = string\n  default = \"brewline-dev\"\n}\n\nresource \"google_storage_bucket\" \"landing\" {\n  name                        = \"brewline-landing-dev\"\n  location                    = \"asia-southeast1\"\n  uniform_bucket_level_access = true\n  public_access_prevention    = \"enforced\"\n\n  versioning {\n    enabled = true\n  }\n\n  logging {\n    log_bucket = \"brewline-logs-dev\"\n  }\n}\n\nresource \"google_bigquery_dataset\" \"raw\" {\n  dataset_id = \"raw\"\n  location   = \"asia-southeast1\"\n\n  default_encryption_configuration {\n    kms_key_name = \"projects/brewline-dev/locations/asia-southeast1/keyRings/data/cryptoKeys/bigquery\"\n  }\n}\n\nresource \"google_bigquery_table\" \"orders\" {\n  dataset_id          = google_bigquery_dataset.raw.dataset_id\n  table_id            = \"orders\"\n  deletion_protection = true\n\n  time_partitioning {\n    type  = \"DAY\"\n    field = \"order_ts\"\n  }\n  clustering = [\"store_id\"]\n\n  encryption_configuration {\n    kms_key_name = \"projects/brewline-dev/locations/asia-southeast1/keyRings/data/cryptoKeys/bigquery\"\n  }\n}\n\nresource \"google_service_account\" \"pipeline\" {\n  account_id = \"sa-pipeline\"\n}\n\nresource \"google_project_iam_member\" \"pipeline_role\" {\n  project = var.project\n  role    = \"roles/bigquery.dataEditor\"\n  member  = \"serviceAccount:${google_service_account.pipeline.email}\"\n}\n\nresource \"google_pubsub_topic\" \"orders\" {\n  name         = \"pos-orders\"\n  kms_key_name = \"projects/brewline-dev/locations/asia-southeast1/keyRings/data/cryptoKeys/pubsub\"\n}",
  "sql/cost_by_label.sql": "WITH jobs AS (\n  SELECT\n    total_bytes_billed,\n    IFNULL((SELECT l.value FROM UNNEST(labels) AS l WHERE l.key = 'pipeline'), '(no label)') AS pipeline\n  FROM `region-asia-southeast1`.INFORMATION_SCHEMA.JOBS_BY_PROJECT\n  WHERE creation_time >= TIMESTAMP '2026-11-04 00:00:00+00'\n    AND job_type = 'QUERY'\n    AND state = 'DONE'\n)\nSELECT\n  pipeline,\n  COUNT(*) AS jobs,\n  ROUND(SUM(total_bytes_billed) / POW(1024, 4), 2) AS tib_billed,\n  ROUND(SUM(total_bytes_billed) / POW(1024, 4) * 6.25, 2) AS example_usd\nFROM jobs\nGROUP BY pipeline\nORDER BY example_usd DESC",
  "sql/leak.sql": "SELECT COUNT(*) AS customers, AVG(label) AS label_rate, CORR(n_before, label) AS corr_clean, CORR(n_through_the_label_window, label) AS corr_leaky\nFROM (\n  SELECT c.customer_id, IFNULL(b.n, 0) AS n_before, IFNULL(a.n, 0) AS n_through_the_label_window, IF(IFNULL(f.n, 0) > 0, 1, 0) AS label\n  FROM `brewline-dev.curated.customers` AS c\n  LEFT JOIN (SELECT customer_id, COUNT(*) AS n FROM `brewline-dev.curated.orders` WHERE order_ts < TIMESTAMP '2026-11-06 00:00:00+00' GROUP BY customer_id) AS b USING (customer_id)\n  LEFT JOIN (SELECT customer_id, COUNT(*) AS n FROM `brewline-dev.curated.orders` WHERE order_ts >= TIMESTAMP '2026-11-06 00:00:00+00' AND order_ts < TIMESTAMP '2026-11-10 00:00:00+00' GROUP BY customer_id) AS f USING (customer_id)\n  LEFT JOIN (SELECT customer_id, COUNT(*) AS n FROM `brewline-dev.curated.orders` WHERE order_ts < TIMESTAMP '2026-11-10 00:00:00+00' GROUP BY customer_id) AS a USING (customer_id)\n)",
  "sql/orders_ddl.sql": "CREATE OR REPLACE TABLE `brewline-dev.curated.orders` (\n  order_id INT64 NOT NULL,\n  store_id STRING NOT NULL,\n  customer_id STRING,\n  order_ts TIMESTAMP NOT NULL,\n  status STRING,\n  total_cents INT64,\n  items ARRAY<STRUCT<sku STRING, qty INT64, unit_cents INT64>>\n)\nPARTITION BY DATE(order_ts)\nCLUSTER BY store_id, status\nOPTIONS (\n  partition_expiration_days=400,\n  require_partition_filter=TRUE\n)",
  "sql/scd2.sql": "MERGE `brewline-dev.curated.dim_customer` AS t\nUSING (\n  SELECT f.customer_id AS merge_key, f.customer_id, f.loyalty_tier FROM `brewline-dev.staging.customer_feed` AS f\n  UNION ALL\n  SELECT NULL AS merge_key, f.customer_id, f.loyalty_tier FROM `brewline-dev.staging.customer_feed` AS f\n    JOIN `brewline-dev.curated.dim_customer` AS d ON d.customer_id = f.customer_id AND d.is_current AND d.loyalty_tier != f.loyalty_tier\n) AS s\nON t.customer_id = s.merge_key AND t.is_current\nWHEN MATCHED AND t.loyalty_tier != s.loyalty_tier THEN UPDATE SET is_current = FALSE, valid_to = DATE '2026-11-10'\nWHEN NOT MATCHED THEN INSERT (customer_id, loyalty_tier, valid_from, valid_to, is_current) VALUES (s.customer_id, s.loyalty_tier, DATE '2026-11-10', DATE '9999-12-31', TRUE)"
 },
 "meta": {
  "apache-airflow": "3.4.0",
  "apache-beam": "2.77.0",
  "bq": "2.1.32",
  "check-jsonschema": "0.39.0",
  "checkov": "3.4.3",
  "company": "Brewline",
  "cryptography": "50.0.2",
  "dataform-cli": "3.1.5",
  "duckdb": "2.0.0",
  "fastavro": "1.13.1",
  "functions-framework": "3.10.2",
  "gcloud": "570.0.0",
  "gcp-storage-emulator": "2026.7.19",
  "google-cloud-bigquery": "3.47.0",
  "google-cloud-pubsub": "2.43.0",
  "google-cloud-storage": "3.17.1",
  "note": "Recorded by gcp/verify/capture_gcp.py with real open-source tools on one machine. Nothing ran on Google Cloud: Cloud Storage is an emulator, BigQuery SQL runs in DuckDB, Beam runs on its local runners, and the Pub/Sub delivery rules are a model.",
  "pyarrow": "25.0.1",
  "pyspark": "4.0.1",
  "pytest": "9.2.0",
  "python": "3.12.3",
  "python-hcl2": "8.2.0",
  "sqlglot": "30.31.0"
 },
 "tables": {
  "beam.panes.early_late_accumulating": {
   "cols": [
    "store",
    "window (s)",
    "pane",
    "timing",
    "value"
   ],
   "rows": [
    [
     "s01",
     "0 to 60",
     0,
     "EARLY",
     2
    ],
    [
     "s01",
     "0 to 60",
     1,
     "ON_TIME",
     3
    ],
    [
     "s01",
     "0 to 60",
     2,
     "LATE",
     4
    ],
    [
     "s02",
     "0 to 60",
     0,
     "EARLY",
     1
    ],
    [
     "s02",
     "0 to 60",
     1,
     "ON_TIME",
     1
    ]
   ]
  },
  "beam.panes.late_accumulating": {
   "cols": [
    "store",
    "window (s)",
    "pane",
    "timing",
    "value"
   ],
   "rows": [
    [
     "s01",
     "0 to 60",
     0,
     "ON_TIME",
     3
    ],
    [
     "s01",
     "0 to 60",
     1,
     "LATE",
     4
    ],
    [
     "s02",
     "0 to 60",
     0,
     "ON_TIME",
     1
    ]
   ]
  },
  "beam.panes.late_discarding": {
   "cols": [
    "store",
    "window (s)",
    "pane",
    "timing",
    "value"
   ],
   "rows": [
    [
     "s01",
     "0 to 60",
     0,
     "ON_TIME",
     3
    ],
    [
     "s01",
     "0 to 60",
     1,
     "LATE",
     1
    ],
    [
     "s02",
     "0 to 60",
     0,
     "ON_TIME",
     1
    ]
   ]
  },
  "beam.panes.no_lateness": {
   "cols": [
    "store",
    "window (s)",
    "pane",
    "timing",
    "value"
   ],
   "rows": [
    [
     "s01",
     "0 to 60",
     0,
     "ON_TIME",
     3
    ],
    [
     "s02",
     "0 to 60",
     0,
     "ON_TIME",
     1
    ]
   ]
  },
  "beam.sessions_10": {
   "cols": [
    "customer",
    "session window (s)",
    "events"
   ],
   "rows": [
    [
     "c0007",
     "0 to 10",
     1
    ],
    [
     "c0007",
     "20 to 30",
     1
    ],
    [
     "c0007",
     "45 to 55",
     1
    ],
    [
     "c0007",
     "200 to 210",
     1
    ],
    [
     "c0007",
     "215 to 225",
     1
    ]
   ]
  },
  "beam.sessions_60": {
   "cols": [
    "customer",
    "session window (s)",
    "events"
   ],
   "rows": [
    [
     "c0007",
     "0 to 105",
     3
    ],
    [
     "c0007",
     "200 to 275",
     2
    ]
   ]
  },
  "bq.schema": {
   "cols": [
    "column",
    "type",
    "mode"
   ],
   "rows": [
    [
     "order_id",
     "INT64",
     "REQUIRED"
    ],
    [
     "store_id",
     "STRING",
     "REQUIRED"
    ],
    [
     "customer_id",
     "STRING",
     "NULLABLE"
    ],
    [
     "order_ts",
     "TIMESTAMP",
     "REQUIRED"
    ],
    [
     "status",
     "STRING",
     "NULLABLE"
    ],
    [
     "items",
     "RECORD",
     "REPEATED"
    ]
   ]
  },
  "cli.flags": {
   "cols": [
    "command",
    "flags found",
    "flags not found"
   ],
   "rows": [
    [
     "gcloud pubsub subscriptions create",
     "--ack-deadline --dead-letter-topic --max-delivery-attempts --enable-exactly-once-delivery --enable-message-ordering --message-retention-duration --min-retry-delay --max-retry-delay --bigquery-table --use-table-schema --cloud-storage-bucket --push-endpoint --expiration-period --message-filter",
     "-"
    ],
    [
     "gcloud pubsub topics create",
     "--message-retention-duration --schema --message-encoding --topic-encryption-key",
     "-"
    ],
    [
     "gcloud storage buckets create",
     "--location --uniform-bucket-level-access --public-access-prevention --soft-delete-duration --enable-hierarchical-namespace --default-storage-class --retention-period",
     "-"
    ],
    [
     "gcloud storage rsync",
     "--recursive --delete-unmatched-destination-objects",
     "-"
    ],
    [
     "gcloud dataflow flex-template run",
     "--template-file-gcs-location --region --parameters --service-account-email --max-workers --num-workers --subnetwork --disable-public-ips --staging-location --additional-experiments",
     "-"
    ],
    [
     "gcloud composer environments create",
     "--image-version --environment-size --service-account --airflow-configs --env-variables",
     "-"
    ],
    [
     "gcloud dataproc clusters create",
     "--region --num-workers --num-secondary-workers --autoscaling-policy --delete-max-idle --image-version --properties --initialization-actions",
     "-"
    ],
    [
     "gcloud dataproc batches submit pyspark",
     "--region --deps-bucket --service-account --subnet --properties --version",
     "-"
    ],
    [
     "gcloud datastream streams create",
     "--source --destination --display-name --backfill-all --backfill-none --location --postgresql-source-config --mysql-source-config --oracle-source-config --bigquery-destination-config --gcs-destination-config",
     "-"
    ],
    [
     "gcloud transfer jobs create",
     "--source-agent-pool --include-prefixes --overwrite-when --delete-from --schedule-repeats-every",
     "-"
    ],
    [
     "gcloud dataplex datascans create data-quality",
     "--data-quality-spec-file --data-source-resource --location",
     "-"
    ],
    [
     "gcloud iam workload-identity-pools providers create-oidc",
     "--issuer-uri --attribute-mapping --attribute-condition --workload-identity-pool --location",
     "-"
    ],
    [
     "gcloud iam service-accounts add-iam-policy-binding",
     "--member --role",
     "-"
    ],
    [
     "gcloud projects add-iam-policy-binding",
     "--member --role --condition",
     "-"
    ],
    [
     "gcloud scheduler jobs create http",
     "--schedule --time-zone --uri --oidc-service-account-email",
     "-"
    ],
    [
     "gcloud workflows deploy",
     "--source --service-account --location",
     "-"
    ],
    [
     "gcloud functions deploy",
     "--gen2 --runtime --trigger-topic --entry-point --region --service-account",
     "-"
    ],
    [
     "gcloud eventarc triggers create",
     "--event-filters --destination-run-service --location --service-account",
     "-"
    ],
    [
     "gcloud logging metrics create",
     "--log-filter --description",
     "-"
    ],
    [
     "gcloud billing budgets create",
     "--billing-account --display-name --budget-amount --threshold-rule --filter-projects --notifications-rule-pubsub-topic",
     "-"
    ],
    [
     "gcloud monitoring policies create",
     "--policy-from-file --notification-channels",
     "-"
    ],
    [
     "bq mk",
     "--time_partitioning_field --time_partitioning_type --time_partitioning_expiration --clustering_fields --require_partition_filter --range_partitioning --dataset --table --location --default_table_expiration --description --label --external_table_definition --view --materialized_view",
     "-"
    ],
    [
     "bq load",
     "--source_format --autodetect --schema_update_option --replace --time_partitioning_field --hive_partitioning_mode --hive_partitioning_source_uri_prefix --max_bad_records --ignore_unknown_values --parquet_enable_list_inference",
     "-"
    ],
    [
     "bq query",
     "--dry_run --use_legacy_sql --maximum_bytes_billed --parameter --batch --destination_table --label --use_cache",
     "-"
    ]
   ]
  },
  "df.actions": {
   "cols": [
    "action",
    "type",
    "depends on"
   ],
   "rows": [
    [
     "curated.daily_sales",
     "table",
     "curated.orders"
    ],
    [
     "curated.orders",
     "incremental",
     "staging.stg_orders"
    ],
    [
     "staging.stg_orders",
     "view",
     "raw.orders_raw"
    ]
   ]
  },
  "formats.sizes": {
   "cols": [
    "format",
    "bytes",
    "share of the CSV",
    "what it is"
   ],
   "rows": [
    [
     "CSV",
     6395898,
     1.0,
     "text, no types, no schema"
    ],
    [
     "CSV, gzip",
     1432904,
     0.224,
     "gzip cannot be split: one reader per file"
    ],
    [
     "JSON lines",
     15495562,
     2.423,
     "text, names repeated on every row"
    ],
    [
     "JSON lines, gzip",
     1739473,
     0.272,
     "gzip cannot be split"
    ],
    [
     "Avro (no compression)",
     3248309,
     0.508,
     "rows, with the schema inside"
    ],
    [
     "Avro (deflate)",
     1468312,
     0.23,
     "rows, with the schema inside"
    ],
    [
     "Parquet (no compression)",
     2385537,
     0.373,
     "columns, with the schema and statistics inside"
    ],
    [
     "Parquet (snappy)",
     1871747,
     0.293,
     "columns, with the schema and statistics inside"
    ],
    [
     "Parquet (zstd)",
     1418745,
     0.222,
     "columns, with the schema and statistics inside"
    ],
    [
     "ORC (zstd)",
     869786,
     0.136,
     "columns, with the schema inside"
    ]
   ]
  },
  "gcs.listing": {
   "cols": [
    "prefix",
    "delimiter",
    "objects",
    "object names",
    "prefixes (\"folders\")"
   ],
   "rows": [
    [
     "(empty)",
     "/",
     0,
     "-",
     "exports/, orders/"
    ],
    [
     "orders/",
     "/",
     0,
     "-",
     "orders/dt=2026-11-09/, orders/dt=2026-11-10/"
    ],
    [
     "orders/dt=2026-11-10/",
     "/",
     3,
     "orders/dt=2026-11-10/part-0000.json, orders/dt=2026-11-10/part-0001.json, orders/dt=2026-11-10/part-0002.json",
     "-"
    ],
    [
     "orders/",
     "(none)",
     5,
     "orders/dt=2026-11-09/part-0000.json, orders/dt=2026-11-09/part-0001.json, orders/dt=2026-11-10/part-0000.json, orders/dt=2026-11-10/part-0001.json, orders/dt=2026-11-10/part-0002.json",
     "-"
    ]
   ]
  },
  "gcs.signed_params": {
   "cols": [
    "Query parameter",
    "Value",
    "What it says"
   ],
   "rows": [
    [
     "X-Goog-Algorithm",
     "GOOG4-RSA-SHA256",
     "how it was signed"
    ],
    [
     "X-Goog-Credential",
     "reader@brewline-dev.iam.gserviceaccount.com/20261110/auto/storage/goog4_request",
     "who signed it, the day, and the scope"
    ],
    [
     "X-Goog-Date",
     "20261110T020000Z",
     "when the URL was made (UTC)"
    ],
    [
     "X-Goog-Expires",
     "900",
     "seconds the URL works after that date"
    ],
    [
     "X-Goog-SignedHeaders",
     "host",
     "headers the caller must send as signed"
    ],
    [
     "X-Goog-Signature",
     "(512 hex characters)",
     "the signature itself"
    ]
   ]
  },
  "idem.runs": {
   "cols": [
    "method",
    "step",
    "rows in table",
    "rows expected",
    "rows wrong"
   ],
   "rows": [
    [
     "append",
     "first run",
     20000,
     20000,
     0
    ],
    [
     "append",
     "the same batch again",
     21402,
     20000,
     1402
    ],
    [
     "append",
     "corrected batch",
     22808,
     20004,
     1402
    ],
    [
     "merge",
     "first run",
     20000,
     20000,
     0
    ],
    [
     "merge",
     "the same batch again",
     20000,
     20000,
     0
    ],
    [
     "merge",
     "corrected batch",
     20012,
     20004,
     8
    ],
    [
     "merge_and_delete",
     "first run",
     20000,
     20000,
     0
    ],
    [
     "merge_and_delete",
     "the same batch again",
     20000,
     20000,
     0
    ],
    [
     "merge_and_delete",
     "corrected batch",
     20004,
     20004,
     0
    ],
    [
     "overwrite_partition",
     "first run",
     20000,
     20000,
     0
    ],
    [
     "overwrite_partition",
     "the same batch again",
     20000,
     20000,
     0
    ],
    [
     "overwrite_partition",
     "corrected batch",
     20004,
     20004,
     0
    ],
    [
     "reload_all",
     "first run",
     20000,
     20000,
     0
    ],
    [
     "reload_all",
     "the same batch again",
     20000,
     20000,
     0
    ],
    [
     "reload_all",
     "corrected batch",
     20004,
     20004,
     0
    ]
   ]
  },
  "pubsub.model": {
   "cols": [
    "situation",
    "message",
    "key",
    "deliveries",
    "handler ran to the end",
    "final state"
   ],
   "rows": [
    [
     "healthy",
     "m1",
     "-",
     1,
     1,
     "acked"
    ],
    [
     "healthy",
     "m2",
     "-",
     1,
     1,
     "acked"
    ],
    [
     "healthy",
     "m3",
     "-",
     1,
     1,
     "acked"
    ],
    [
     "slow handler",
     "m1",
     "-",
     4,
     4,
     "acked"
    ],
    [
     "deadline long enough",
     "m1",
     "-",
     1,
     1,
     "acked"
    ],
    [
     "poison, no dead letter",
     "m1",
     "-",
     61,
     0,
     "pending"
    ],
    [
     "poison, no dead letter",
     "m2",
     "-",
     1,
     1,
     "acked"
    ],
    [
     "poison, dead letter after 5",
     "m1",
     "-",
     5,
     0,
     "dead"
    ],
    [
     "poison, dead letter after 5",
     "m2",
     "-",
     1,
     1,
     "acked"
    ],
    [
     "ordering key blocks",
     "a1",
     "s01",
     61,
     0,
     "pending"
    ],
    [
     "ordering key blocks",
     "a2",
     "s01",
     0,
     0,
     "pending"
    ],
    [
     "ordering key blocks",
     "a3",
     "s01",
     0,
     0,
     "pending"
    ],
    [
     "ordering key blocks",
     "b1",
     "s02",
     1,
     1,
     "acked"
    ],
    [
     "ordering key blocks",
     "b2",
     "s02",
     1,
     1,
     "acked"
    ],
    [
     "ordering key, dead letter after 5",
     "a1",
     "s01",
     5,
     0,
     "dead"
    ],
    [
     "ordering key, dead letter after 5",
     "a2",
     "s01",
     1,
     1,
     "acked"
    ],
    [
     "ordering key, dead letter after 5",
     "a3",
     "s01",
     1,
     1,
     "acked"
    ],
    [
     "ordering key, dead letter after 5",
     "b1",
     "s02",
     1,
     1,
     "acked"
    ],
    [
     "ordering key, dead letter after 5",
     "b2",
     "s02",
     1,
     1,
     "acked"
    ]
   ]
  },
  "spark.small_files": {
   "cols": [
    "write",
    "files",
    "total KB",
    "KB per file"
   ],
   "rows": [
    [
     "repartition(200)",
     200,
     849,
     4.2
    ],
    [
     "repartition(4)",
     4,
     448,
     112.0
    ],
    [
     "coalesce(1)",
     1,
     299,
     298.5
    ]
   ]
  },
  "sql.checks": {
   "cols": [
    "check",
    "rows returned",
    "verdict"
   ],
   "rows": [
    [
     "no duplicate order ids",
     0,
     "pass"
    ],
    [
     "no null keys",
     0,
     "pass"
    ],
    [
     "every store exists",
     0,
     "pass"
    ],
    [
     "totals are not negative",
     0,
     "pass"
    ],
    [
     "the raw layer holds repeats (that is why we dedupe)",
     600,
     "as expected"
    ]
   ]
  },
  "sql.column_sizes": {
   "cols": [
    "column",
    "type",
    "bytes in the sample",
    "share"
   ],
   "rows": [
    [
     "order_id",
     "INT64",
     160000,
     0.074
    ],
    [
     "store_id",
     "STRING",
     100000,
     0.046
    ],
    [
     "customer_id",
     "STRING",
     104825,
     0.048
    ],
    [
     "order_ts",
     "TIMESTAMP",
     160000,
     0.074
    ],
    [
     "status",
     "STRING",
     139960,
     0.065
    ],
    [
     "channel",
     "STRING",
     100000,
     0.046
    ],
    [
     "total_cents",
     "INT64",
     160000,
     0.074
    ],
    [
     "items.sku",
     "STRING",
     441239,
     0.204
    ],
    [
     "items.qty",
     "INT64",
     399672,
     0.185
    ],
    [
     "items.unit_cents",
     "INT64",
     399672,
     0.185
    ]
   ]
  },
  "sql.cost_by_label": {
   "cols": [
    "pipeline label",
    "jobs",
    "TiB billed",
    "example USD"
   ],
   "rows": [
    [
     "dashboard_refresh",
     672,
     5.13,
     32.09
    ],
    [
     "(no label)",
     84,
     3.31,
     20.68
    ],
    [
     "daily_orders",
     7,
     0.01,
     0.03
    ]
   ]
  },
  "sql.days": {
   "cols": [
    "UTC day",
    "Singapore day",
    "orders"
   ],
   "rows": [
    [
     "2026-11-04",
     "2026-11-05",
     453
    ],
    [
     "2026-11-05",
     "2026-11-05",
     1007
    ],
    [
     "2026-11-05",
     "2026-11-06",
     483
    ]
   ]
  },
  "sql.estimates": {
   "cols": [
    "query",
    "columns read",
    "partitions read",
    "logical bytes (x scale)",
    "billed bytes (x scale)",
    "example USD"
   ],
   "rows": [
    [
     "SELECT *",
     "10 of 10 columns",
     "14 of 14",
     43307360000,
     43308285952,
     0.2462
    ],
    [
     "three columns",
     "order_id, store_id, total_cents",
     "14 of 14",
     8400000000,
     8400142336,
     0.0477
    ],
    [
     "three columns and a filter, one UTC day",
     "order_id, store_id, order_ts, total_cents",
     "1 of 14",
     817220000,
     817889280,
     0.0046
    ],
    [
     "three columns and a filter, seven UTC days",
     "order_id, store_id, order_ts, total_cents",
     "7 of 14",
     5821460000,
     5821693952,
     0.0331
    ],
    [
     "one Singapore day, filtered with DATE(ts, zone)",
     "order_id, store_id, order_ts, total_cents",
     "14 of 14",
     11600000000,
     11600396288,
     0.0659
    ],
    [
     "one Singapore day, filtered with two bounds",
     "order_id, store_id, order_ts, total_cents",
     "2 of 14",
     1716800000,
     1717567488,
     0.0098
    ],
    [
     "LIMIT 10",
     "10 of 10 columns",
     "14 of 14",
     43307360000,
     43308285952,
     0.2462
    ],
    [
     "filter on store only",
     "order_id, store_id, total_cents",
     "14 of 14",
     8400000000,
     8400142336,
     0.0477
    ],
    [
     "bound from a subquery",
     "order_id, order_ts",
     "14 of 14",
     6400000000,
     6400507904,
     0.0364
    ],
    [
     "item lines, one day",
     "order_id, order_ts, items.sku, items.qty, items.unit_cents",
     "1 of 14",
     2197920000,
     2198863872,
     0.0125
    ],
    [
     "SELECT * EXCEPT (items), one day",
     "7 of 10 columns",
     "1 of 14",
     1303460000,
     1304428544,
     0.0074
    ]
   ]
  },
  "sql.gaps": {
   "cols": [
    "day with no orders from store s12",
    "orders"
   ],
   "rows": [
    [
     "2026-11-06",
     0
    ]
   ]
  },
  "sql.lineage": {
   "cols": [
    "column of the daily table",
    "comes from"
   ],
   "rows": [
    [
     "sale_date",
     "orders.order_ts"
    ],
    [
     "store_id",
     "orders.store_id"
    ],
    [
     "orders",
     "(a count of rows: no source column)"
    ],
    [
     "revenue_cents",
     "orders.total_cents"
    ]
   ]
  },
  "sql.pii_scan": {
   "cols": [
    "column",
    "values checked",
    "share that look like an e-mail address",
    "share that look like a phone number"
   ],
   "rows": [
    [
     "customers.customer_id",
     2000,
     0.0,
     0.0
    ],
    [
     "customers.email",
     2000,
     1.0,
     0.0
    ],
    [
     "customers.phone",
     2000,
     0.0,
     1.0
    ],
    [
     "customers.loyalty_tier",
     2000,
     0.0,
     0.0
    ],
    [
     "orders.store_id",
     20000,
     0.0,
     0.0
    ],
    [
     "orders.customer_id",
     14975,
     0.0,
     0.0
    ],
    [
     "orders.status",
     20000,
     0.0,
     0.0
    ],
    [
     "orders.channel",
     20000,
     0.0,
     0.0
    ]
   ]
  },
  "sql.redelivered": {
   "cols": [
    "order_id",
    "deliveries",
    "statuses in order of arrival"
   ],
   "rows": [
    [
     6,
     2,
     "CANCELLED then CANCELLED"
    ],
    [
     9,
     2,
     "PAID then PAID"
    ],
    [
     41,
     2,
     "PAID then PAID"
    ],
    [
     52,
     2,
     "PAID then PAID"
    ],
    [
     70,
     2,
     "PAID then PAID"
    ]
   ]
  },
  "sql.scd2_first": {
   "cols": [
    "customer_id",
    "loyalty_tier",
    "valid_from",
    "valid_to",
    "is_current"
   ],
   "rows": [
    [
     "c0001",
     "none",
     "2026-01-01",
     "2026-11-10",
     false
    ],
    [
     "c0001",
     "silver",
     "2026-11-10",
     "9999-12-31",
     true
    ],
    [
     "c0002",
     "silver",
     "2026-01-01",
     "9999-12-31",
     true
    ],
    [
     "c0003",
     "gold",
     "2026-01-01",
     "9999-12-31",
     true
    ],
    [
     "c0004",
     "none",
     "2026-11-10",
     "9999-12-31",
     true
    ]
   ]
  },
  "sql.top_store": {
   "cols": [
    "country",
    "store_id",
    "revenue_cents",
    "rank"
   ],
   "rows": [
    [
     "SG",
     "s01",
     12856000,
     1
    ],
    [
     "MY",
     "s12",
     2398910,
     1
    ],
    [
     "VN",
     "s09",
     2347440,
     1
    ],
    [
     "PH",
     "s11",
     2312340,
     1
    ],
    [
     "ID",
     "s06",
     2309280,
     1
    ],
    [
     "TH",
     "s08",
     2237630,
     1
    ]
   ]
  },
  "sql.translations": {
   "cols": [
    "BigQuery SQL",
    "DuckDB SQL that ran"
   ],
   "rows": [
    [
     "SELECT * EXCEPT (ingest_ts) FROM `brewline-dev.raw.orders_raw` QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY ingest_ts DESC) = 1",
     "SELECT * EXCLUDE (ingest_ts) FROM \"brewline-dev\".\"raw\".\"orders_raw\" QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY ingest_ts DESC) = 1"
    ],
    [
     "SELECT COUNTIF(status = 'PAID') AS paid, SAFE_DIVIDE(COUNTIF(status = 'PAID'), COUNT(*)) AS share FROM `brewline-dev.curated.orders`",
     "SELECT COUNT_IF(status = 'PAID') AS paid, CASE WHEN COUNT(*) <> 0 THEN COUNT_IF(status = 'PAID') / COUNT(*) ELSE NULL END AS share FROM \"brewline-dev\".\"curated\".\"orders\""
    ],
    [
     "SELECT d FROM UNNEST(GENERATE_DATE_ARRAY(DATE '2026-11-08', DATE '2026-11-11')) AS d",
     "SELECT d FROM UNNEST(CAST(GENERATE_SERIES(CAST('2026-11-08' AS DATE), CAST('2026-11-11' AS DATE), INTERVAL '1' DAY) AS DATE[])) AS _t0(d)"
    ],
    [
     "SELECT order_id FROM `brewline-dev.curated.orders` ORDER BY order_id LIMIT 3",
     "SELECT order_id FROM \"brewline-dev\".\"curated\".\"orders\" ORDER BY order_id NULLS FIRST LIMIT 3"
    ]
   ]
  },
  "sql.unnest": {
   "cols": [
    "sku",
    "units",
    "revenue_cents"
   ],
   "rows": [
    [
     "beans_250g",
     5275,
     9758750
    ],
    [
     "mug",
     5113,
     7413850
    ],
    [
     "cold_brew",
     5404,
     3026240
    ],
    [
     "mocha",
     5117,
     2967860
    ],
    [
     "flat_white",
     5079,
     2742660
    ]
   ]
  },
  "tf.checks": {
   "cols": [
    "check",
    "what it asks"
   ],
   "rows": [
    [
     "CKV_GCP_114",
     "Ensure public access prevention is enforced on Cloud Storage bucket"
    ],
    [
     "CKV_GCP_117",
     "Ensure basic roles are not used at project level."
    ],
    [
     "CKV_GCP_121",
     "Ensure BigQuery tables have deletion protection enabled"
    ],
    [
     "CKV_GCP_15",
     "Ensure that BigQuery datasets are not anonymously or publicly accessible"
    ],
    [
     "CKV_GCP_29",
     "Ensure that Cloud Storage buckets have uniform bucket-level access enabled"
    ],
    [
     "CKV_GCP_49",
     "Ensure roles do not impersonate or manage Service Accounts used at project level"
    ],
    [
     "CKV_GCP_62",
     "Bucket should log access"
    ],
    [
     "CKV_GCP_78",
     "Ensure Cloud storage has versioning enabled"
    ],
    [
     "CKV_GCP_80",
     "Ensure Big Query Tables are encrypted with Customer Supplied Encryption Keys (CSEK)"
    ],
    [
     "CKV_GCP_81",
     "Ensure Big Query Datasets are encrypted with Customer Supplied Encryption Keys (CSEK)"
    ],
    [
     "CKV_GCP_83",
     "Ensure PubSub Topics are encrypted with Customer Supplied Encryption Keys (CSEK)"
    ]
   ]
  }
 },
 "text": {
  "af.render": "{'query': {'query': 'MERGE `brewline-dev.curated.orders` AS t USING `brewline-dev.staging.orders_20261110` AS s ON t.order_id = s.order_id WHEN MATCHED THEN UPDATE SET status = s.status WHEN NOT MATCHED THEN INSERT ROW', 'useLegacySql': False}}",
  "df.daily_sales": "SELECT\n  DATE(order_ts, \"Asia/Singapore\") AS sale_date,\n  store_id,\n  COUNT(*) AS orders,\n  SUM(total_cents) AS revenue_cents\nFROM `brewline-dev.curated.orders`\nWHERE order_ts >= TIMESTAMP(\"2026-10-01\") AND status IN ('PAID', 'REFUNDED')\nGROUP BY sale_date, store_id",
  "df.incremental_first": "SELECT order_id, store_id, customer_id, order_ts, status, total_cents\nFROM `brewline-dev.staging.stg_orders`",
  "df.incremental_next": "SELECT order_id, store_id, customer_id, order_ts, status, total_cents\nFROM `brewline-dev.staging.stg_orders`\nWHERE order_ts > (SELECT MAX(order_ts) FROM `brewline-dev.curated.orders`)",
  "gcs.lifecycle": "[\n {\n  \"action\": {\n   \"type\": \"SetStorageClass\",\n   \"storageClass\": \"NEARLINE\"\n  },\n  \"condition\": {\n   \"age\": 30,\n   \"matchesStorageClass\": [\n    \"STANDARD\"\n   ]\n  }\n },\n {\n  \"action\": {\n   \"type\": \"Delete\"\n  },\n  \"condition\": {\n   \"age\": 365\n  }\n },\n {\n  \"action\": {\n   \"type\": \"Delete\"\n  },\n  \"condition\": {\n   \"isLive\": false,\n   \"numNewerVersions\": 3\n  }\n }\n]",
  "gcs.signed_canonical": "GET\n/brewline-landing-dev/exports/week%2045/report.csv\nX-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=reader%40...%2F20261110%2Fauto%2Fstorage%2Fgoog4_request&X-Goog-Date=20261110T020000Z&X-Goog-Expires=900&X-Goog-SignedHeaders=host\nhost:storage.googleapis.com\n\nhost\nUNSIGNED-PAYLOAD",
  "gcs.signed_host_path": "storage.googleapis.com/brewline-landing-dev/exports/week%2045/report.csv",
  "gcs.signed_to_sign": "GOOG4-RSA-SHA256\n20261110T020000Z\n20261110/auto/storage/goog4_request\n87ac88f79a0a464d34dacaebac6b0457e907c12bdd2ae3fd2cd4453d1736f046",
  "idem.sql.append": "INSERT INTO `brewline-dev.curated.orders_t` (order_id, store_id, status, order_ts, total_cents)\nSELECT order_id, store_id, status, order_ts, total_cents FROM `brewline-dev.staging.batch`",
  "idem.sql.merge": "MERGE `brewline-dev.curated.orders_t` AS t\nUSING `brewline-dev.staging.batch` AS s\nON t.order_id = s.order_id\nWHEN MATCHED AND t.status != s.status THEN UPDATE SET status = s.status\nWHEN NOT MATCHED THEN INSERT (order_id, store_id, status, order_ts, total_cents) VALUES (s.order_id, s.store_id, s.status, s.order_ts, s.total_cents)",
  "idem.sql.merge_and_delete": "MERGE `brewline-dev.curated.orders_t` AS t\nUSING `brewline-dev.staging.batch` AS s\nON t.order_id = s.order_id\nWHEN MATCHED AND t.status != s.status THEN UPDATE SET status = s.status\nWHEN NOT MATCHED BY TARGET THEN INSERT (order_id, store_id, status, order_ts, total_cents) VALUES (s.order_id, s.store_id, s.status, s.order_ts, s.total_cents)\nWHEN NOT MATCHED BY SOURCE AND DATE(t.order_ts) = DATE '2026-11-10' THEN DELETE",
  "idem.sql.overwrite_partition": "BEGIN TRANSACTION;\nDELETE FROM `brewline-dev.curated.orders_t` WHERE DATE(order_ts) = DATE '2026-11-10';\nINSERT INTO `brewline-dev.curated.orders_t` (order_id, store_id, status, order_ts, total_cents)\nSELECT order_id, store_id, status, order_ts, total_cents FROM `brewline-dev.staging.batch`;\nCOMMIT TRANSACTION;",
  "idem.sql.reload_all": "CREATE OR REPLACE TABLE `brewline-dev.curated.orders_t` AS\nSELECT order_id, store_id, status, order_ts, total_cents FROM `brewline-dev.staging.everything`"
 }
};
