window.LAB = window.LAB || {};
LAB.real = {
 "counts": {
  "asl.validate": {
   "pipeline_good.json": {
    "errors": [],
    "valid": true
   },
   "pipeline_next_to_a_missing_state.json": {
    "errors": [
     "MISSING_TRANSITION_TARGET: State CheckRowCount is not reachable",
     "MISSING_TRANSITION_TARGET: Missing 'StartAt'|'Next'|'Default' target: CheckRowCounts"
    ],
    "valid": false
   },
   "pipeline_no_end.json": {
    "errors": [
     "TERMINAL_STATE_WITH_NEXT: State \"CheckRowCount\" MUST contain exactly one of \"End\", \"Next\""
    ],
    "valid": false
   },
   "pipeline_unknown_type.json": {
    "errors": [
     "SCHEMA_VALIDATION_FAILED: /States/Failed/Type is invalid. must be equal to one of the allowed values"
    ],
    "valid": false
   }
  },
  "athena.parquet_columns": {
   "bytes_by_column": {
    "channel": 509612,
    "customer_id": 3648616,
    "order_date": 1601,
    "order_id": 9754800,
    "order_ts": 10863825,
    "product_id": 1511547,
    "qty": 509123,
    "status": 302515,
    "store_id": 1260459,
    "total_usd": 1767219,
    "unit_price_usd": 1511510
   },
   "daily_file_with_the_order": "2026-02-25",
   "row_groups_for_march": [
    10,
    11,
    12,
    13,
    14,
    15,
    16
   ],
   "row_groups_for_one_day": [
    13
   ],
   "row_groups_for_the_order_id": [
    10
   ]
  },
  "athena.scan": {
   "layouts": [
    {
     "k": "csv",
     "name": "One CSV file"
    },
    {
     "k": "csv_gz",
     "name": "One gzip CSV file"
    },
    {
     "k": "csv_by_day",
     "name": "CSV, one folder for each day"
    },
    {
     "k": "parquet",
     "name": "One Parquet file"
    },
    {
     "k": "parquet_by_day",
     "name": "Parquet, one folder for each day"
    }
   ],
   "queries": [
    {
     "bytes": {
      "csv": 166660475,
      "csv_by_day": 144668830,
      "csv_gz": 29513310,
      "parquet": 20143,
      "parquet_by_day": 118440
     },
     "columns": [],
     "id": "q1",
     "needs": "no column, and no filter",
     "sql": "SELECT count(*) FROM orders",
     "title": "Count every order"
    },
    {
     "bytes": {
      "csv": 166660475,
      "csv_by_day": 1607655,
      "csv_gz": 29513310,
      "parquet": 128791,
      "parquet_by_day": 21434
     },
     "columns": [
      "total_usd",
      "order_date"
     ],
     "id": "q2",
     "needs": "2 columns, 1 day out of 90",
     "sql": "SELECT sum(total_usd) FROM orders WHERE order_date = DATE '2026-03-14'",
     "title": "One day of revenue"
    },
    {
     "bytes": {
      "csv": 166660475,
      "csv_by_day": 49830867,
      "csv_gz": 29513310,
      "parquet": 2119946,
      "parquet_by_day": 3392797
     },
     "columns": [
      "customer_id",
      "total_usd",
      "order_date"
     ],
     "id": "q3",
     "needs": "3 columns, 31 days out of 90",
     "sql": "SELECT customer_id, sum(total_usd) AS spend FROM orders WHERE order_date BETWEEN DATE '2026-03-01' AND DATE '2026-03-31' GROUP BY customer_id ORDER BY spend DESC LIMIT 5",
     "title": "Top customers in March"
    },
    {
     "bytes": {
      "csv": 166660475,
      "csv_by_day": 144668830,
      "csv_gz": 29513310,
      "parquet": 1962043,
      "parquet_by_day": 515953
     },
     "columns": [
      "order_id",
      "customer_id",
      "order_ts",
      "product_id",
      "qty",
      "unit_price_usd",
      "total_usd",
      "status",
      "channel",
      "store_id",
      "order_date"
     ],
     "id": "q4",
     "needs": "every column, and no partition filter",
     "sql": "SELECT * FROM orders WHERE order_id = 'O-1234567'",
     "title": "Find one order with SELECT *"
    },
    {
     "bytes": {
      "csv": 166660475,
      "csv_by_day": 144668830,
      "csv_gz": 29513310,
      "parquet": 322658,
      "parquet_by_day": 443378
     },
     "columns": [
      "status"
     ],
     "id": "q5",
     "needs": "1 column, every day",
     "sql": "SELECT status, count(*) FROM orders GROUP BY status",
     "title": "Orders by status"
    }
   ]
  },
  "athena.sizes": {
   "avg_day_csv_bytes": 1607431,
   "avg_day_parquet_bytes": 399710,
   "csv": 166660475,
   "csv_by_day": 144668830,
   "csv_columns": 11,
   "csv_gz": 29513310,
   "days": 90,
   "files_by_day": 90,
   "parquet": 31811874,
   "parquet_by_day": 35973884,
   "parquet_footer_bytes": 20143,
   "parquet_row_group_rows": 122880,
   "parquet_row_groups": 17,
   "rows": 2000000
  },
  "cfn.lint": {
   "bug_rc": 2,
   "findings": [
    {
     "line": 15,
     "message": "Additional properties are not allowed ('VersioningConfig' was unexpected. Did you mean 'VersioningConfiguration'?)",
     "rule": "E3002"
    },
    {
     "line": 25,
     "message": "'aws:kmss' is not one of ['aws:kms', 'AES256', 'aws:kms:dsse']",
     "rule": "E3030"
    },
    {
     "line": 69,
     "message": "'Arnn' is not one of ['Arn', 'DomainName', 'DualStackDomainName', 'RegionalDomainName', 'MetadataTableConfiguration.S3TablesDestination.TableNamespace', 'Metada",
     "rule": "E1010"
    },
    {
     "line": 72,
     "message": "'Command' is a required property",
     "rule": "E3003"
    },
    {
     "line": 77,
     "message": "'five' is not of type 'integer'",
     "rule": "E3012"
    }
   ],
   "good_rc": 0
  },
  "cli.runs": {
   "cli": "AWS CLI 1.46.3 (version 1, installed with pip)",
   "commands": [
    {
     "command": "aws s3 mb s3://brewline-lake",
     "label": "make a bucket",
     "output": "make_bucket: brewline-lake",
     "rc": 0
    },
    {
     "command": "aws s3 cp landing/orders-0001.json s3://brewline-lake/raw/orders/dt=2026-03-14/orders-0001.json",
     "label": "copy one file",
     "output": "upload: landing/orders-0001.json to s3://brewline-lake/raw/orders/dt=2026-03-14/orders-0001.json",
     "rc": 0
    },
    {
     "command": "aws s3 sync landing s3://brewline-lake/raw/orders/dt=2026-03-15/ --dryrun",
     "label": "sync, dry run",
     "output": "(dryrun) upload: landing/orders-0001.json to s3://brewline-lake/raw/orders/dt=2026-03-15/orders-0001.json\n(dryrun) upload: landing/orders-0002.json to s3://brewline-lake/raw/orders/dt=2026-03-15/orders-0002.json\n(dryrun) upload: landing/orders-0003.json to s3://brewline-lake/raw/orders/dt=2026-03-15/orders-0003.json",
     "rc": 0
    },
    {
     "command": "aws s3 sync landing s3://brewline-lake/raw/orders/dt=2026-03-15/",
     "label": "sync",
     "output": "upload: landing/orders-0001.json to s3://brewline-lake/raw/orders/dt=2026-03-15/orders-0001.json\nupload: landing/orders-0003.json to s3://brewline-lake/raw/orders/dt=2026-03-15/orders-0003.json\nupload: landing/orders-0002.json to s3://brewline-lake/raw/orders/dt=2026-03-15/orders-0002.json",
     "rc": 0
    },
    {
     "command": "aws s3 ls s3://brewline-lake/raw/orders/ --recursive --human-readable --summarize",
     "label": "list a prefix",
     "output": "2026-03-14 09:00:00  920 Bytes raw/orders/dt=2026-03-14/orders-0001.json\n2026-03-14 09:00:00  920 Bytes raw/orders/dt=2026-03-15/orders-0001.json\n2026-03-14 09:00:00    1.8 KiB raw/orders/dt=2026-03-15/orders-0002.json\n2026-03-14 09:00:00    2.7 KiB raw/orders/dt=2026-03-15/orders-0003.json\n\nTotal Objects: 4\n   Total Size: 6.3 KiB",
     "rc": 0
    },
    {
     "command": "aws s3api list-objects-v2 --bucket brewline-lake --prefix raw/orders/dt=2026-03-15/ --query 'Contents[].{Key:Key,Size:Size}' --output table",
     "label": "list as a table",
     "output": "-------------------------------------------------------\n|                    ListObjectsV2                    |\n+---------------------------------------------+-------+\n|                     Key                     | Size  |\n+---------------------------------------------+-------+\n|  raw/orders/dt=2026-03-15/orders-0001.json  |  920  |\n|  raw/orders/dt=2026-03-15/orders-0002.json  |  1840 |\n|  raw/orders/dt=2026-03-15/orders-0003.json  |  2760 |\n+---------------------------------------------+-------+",
     "rc": 0
    },
    {
     "command": "aws s3api list-objects-v2 --bucket brewline-lake --prefix raw/orders/ --query 'sum(Contents[].Size)'",
     "label": "sum the sizes",
     "output": "6440",
     "rc": 0
    },
    {
     "command": "aws s3api list-objects-v2 --bucket brewline-lake --prefix raw/orders/dt=2026-03-15/ --max-items 2 --query '{keys: Contents[].Key, next: NextToken}'",
     "label": "two keys at a time",
     "output": "{\n    \"keys\": [\n        \"raw/orders/dt=2026-03-15/orders-0001.json\",\n        \"raw/orders/dt=2026-03-15/orders-0002.json\"\n    ],\n    \"next\": \"eyJDb250aW51YXRpb25Ub2tlbiI6IG51bGwsICJib3RvX3RydW5jYXRlX2Ftb3VudCI6IDJ9\"\n}",
     "rc": 0
    },
    {
     "command": "aws s3api put-bucket-lifecycle-configuration --bucket brewline-lake --lifecycle-configuration file://lifecycle.json",
     "label": "set a lifecycle rule",
     "output": "",
     "rc": 0
    },
    {
     "command": "aws s3api get-bucket-lifecycle-configuration --bucket brewline-lake --query 'Rules[].{id:ID,days:Transitions[0].Days,class:Transitions[0].StorageClass}' --output text",
     "label": "read it back",
     "output": "STANDARD_IA\t30\traw-to-cheaper-storage",
     "rc": 0
    },
    {
     "command": "aws s3 ls s3://no-such-bucket-brewline",
     "label": "a bucket that does not exist",
     "output": "An error occurred (NoSuchBucket) when calling the ListObjectsV2 operation: The specified bucket does not exist",
     "rc": 255
    }
   ]
  },
  "events.patterns": {
   "events": [
    {
     "bucket": "brewline-lake",
     "detail_type": "Object Created",
     "id": "e1",
     "key": "raw/orders/dt=2026-03-14/orders-0001.json",
     "size": 5000
    },
    {
     "bucket": "brewline-lake",
     "detail_type": "Object Created",
     "id": "e2",
     "key": "raw/customers/customers.csv",
     "size": 120
    },
    {
     "bucket": "other-lake",
     "detail_type": "Object Created",
     "id": "e3",
     "key": "raw/orders/dt=2026-03-14/orders-0001.json",
     "size": 5000
    },
    {
     "bucket": "brewline-lake",
     "detail_type": "Object Created",
     "id": "e4",
     "key": "curated/orders/dt=2026-03-14/part-0.parquet",
     "size": 2000000
    },
    {
     "bucket": "brewline-lake",
     "detail_type": "Object Deleted",
     "id": "e5",
     "key": "raw/orders/dt=2026-03-14/orders-0001.json",
     "size": 5000
    },
    {
     "bucket": "brewline-lake",
     "detail_type": "Object Created",
     "id": "e6",
     "key": "raw/orders/_temporary/part-0.json",
     "size": 0
    }
   ],
   "patterns": [
    {
     "agrees": true,
     "documented": [
      "e1",
      "e6"
     ],
     "id": "p1",
     "label": "The bucket and the key prefix",
     "matched": [
      "e1",
      "e6"
     ],
     "pattern": {
      "detail": {
       "bucket": {
        "name": [
         "brewline-lake"
        ]
       },
       "object": {
        "key": [
         {
          "prefix": "raw/orders/"
         }
        ]
       }
      },
      "detail-type": [
       "Object Created"
      ]
     }
    },
    {
     "agrees": true,
     "documented": [
      "e4"
     ],
     "id": "p2",
     "label": "A number above a limit",
     "matched": [
      "e4"
     ],
     "pattern": {
      "detail": {
       "object": {
        "size": [
         {
          "numeric": [
           ">",
           1000000
          ]
         }
        ]
       }
      }
     }
    },
    {
     "agrees": true,
     "documented": [
      "e1",
      "e2",
      "e4",
      "e5",
      "e6"
     ],
     "id": "p3",
     "label": "Anything but one bucket",
     "matched": [
      "e1",
      "e2",
      "e4",
      "e5",
      "e6"
     ],
     "pattern": {
      "detail": {
       "bucket": {
        "name": [
         {
          "anything-but": [
           "other-lake"
          ]
         }
        ]
       }
      }
     }
    },
    {
     "agrees": true,
     "documented": [
      "e1",
      "e2",
      "e5"
     ],
     "id": "p4",
     "label": "Either of two detail types",
     "matched": [
      "e1",
      "e2",
      "e5"
     ],
     "pattern": {
      "detail": {
       "bucket": {
        "name": [
         "brewline-lake"
        ]
       },
       "object": {
        "key": [
         {
          "prefix": "raw/customers/"
         },
         {
          "prefix": "raw/orders/dt="
         }
        ]
       }
      },
      "detail-type": [
       "Object Created",
       "Object Deleted"
      ]
     }
    },
    {
     "agrees": true,
     "documented": [
      "e4"
     ],
     "id": "p5",
     "label": "A key suffix",
     "matched": [
      "e4"
     ],
     "pattern": {
      "detail": {
       "object": {
        "key": [
         {
          "suffix": ".parquet"
         }
        ]
       }
      }
     }
    },
    {
     "agrees": true,
     "documented": [
      "e1",
      "e2",
      "e3",
      "e4",
      "e5",
      "e6"
     ],
     "id": "p6",
     "label": "A field must exist",
     "matched": [
      "e1",
      "e2",
      "e3",
      "e4",
      "e5",
      "e6"
     ],
     "pattern": {
      "detail": {
       "object": {
        "size": [
         {
          "exists": true
         }
        ]
       }
      }
     }
    }
   ]
  },
  "glue.all_partitions": [
   "2026-03-14",
   "2026-03-15",
   "2026-03-16",
   "2026-03-17"
  ],
  "glue.discover": {
   "errors": [],
   "prefixes_found": [
    "curated/orders/dt=2026-03-14/",
    "curated/orders/dt=2026-03-15/",
    "curated/orders/dt=2026-03-16/",
    "curated/orders/dt=2026-03-17/"
   ],
   "registered": 4
  },
  "glue.errors": {
   "duplicate_database": {
    "code": "AlreadyExistsException",
    "message": "Database already exists.",
    "status": 400
   },
   "duplicate_partition": "AlreadyExistsException",
   "missing_table": {
    "code": "EntityNotFoundException",
    "message": "Table nope not found.",
    "status": 400
   }
  },
  "glue.expressions": [
   {
    "expression": "dt = '2026-03-15'",
    "partitions": [
     "2026-03-15"
    ]
   },
   {
    "expression": "dt >= '2026-03-15'",
    "partitions": [
     "2026-03-15",
     "2026-03-16",
     "2026-03-17"
    ]
   },
   {
    "expression": "dt between '2026-03-14' and '2026-03-15'",
    "partitions": [
     "2026-03-14",
     "2026-03-15"
    ]
   },
   {
    "expression": "dt in ('2026-03-14', '2026-03-17')",
    "partitions": [
     "2026-03-14",
     "2026-03-17"
    ]
   },
   {
    "expression": "dt like '2026-03-1%'",
    "partitions": [
     "2026-03-14",
     "2026-03-15",
     "2026-03-16",
     "2026-03-17"
    ]
   },
   {
    "expression": "dt > '2026-03-15' and dt < '2026-03-17'",
    "partitions": [
     "2026-03-16"
    ]
   }
  ],
  "glue.job": {
   "arguments": {
    "--TempDir": "s3://brewline-lake/tmp/",
    "--enable-metrics": "true",
    "--job-bookmark-option": "job-bookmark-enable"
   },
   "dpu_for_workers": 5,
   "glue_version": "5.0",
   "name": "orders-to-parquet",
   "worker_type": "G.1X",
   "workers": 5
  },
  "glue.projection": {
   "parameters": {
    "EXTERNAL": "TRUE",
    "classification": "parquet",
    "projection.dt.format": "yyyy-MM-dd",
    "projection.dt.interval": "1",
    "projection.dt.interval.unit": "DAYS",
    "projection.dt.range": "2026-01-01,NOW",
    "projection.dt.type": "date",
    "projection.enabled": "true",
    "storage.location.template": "s3://brewline-lake/curated/orders/dt=${dt}/"
   },
   "registered_partitions": 0
  },
  "glue.schema_change": {
   "columns_now": [
    "order_id",
    "customer_id",
    "total_usd",
    "status",
    "channel"
   ],
   "partition_still_has_old_columns": [
    "order_id",
    "customer_id",
    "total_usd",
    "status"
   ],
   "versions_after": 2,
   "versions_before": 1
  },
  "iam.assume": {
   "access_key_prefix": "ASIA",
   "assumed_role_user_arn": "arn:aws:sts::123456789012:assumed-role/raw-reader/etl-run-1",
   "credential_fields": [
    "AccessKeyId",
    "Expiration",
    "SecretAccessKey",
    "SessionToken"
   ],
   "expires_in_seconds": 900,
   "has_session_token": true,
   "requested_duration_seconds": 900,
   "response_fields": [
    "AssumedRoleUser",
    "Credentials",
    "PackedPolicySize"
   ],
   "role_arn": "arn:aws:iam::123456789012:role/raw-reader"
  },
  "iam.truth": {
   "rows": [
    {
     "action": "s3:GetObject",
     "code": "",
     "resource": "curated/orders/dt=2026-03-14/part-0.parquet",
     "result": "allow",
     "status": 200,
     "who": "analyst",
     "why": "ReadCurated allows it"
    },
    {
     "action": "s3:GetObject",
     "code": "AccessDenied",
     "resource": "raw/orders/dt=2026-03-14/orders-0001.json",
     "result": "deny",
     "status": 403,
     "who": "analyst",
     "why": "No statement allows it, so the default deny applies"
    },
    {
     "action": "s3:PutObject",
     "code": "AccessDenied",
     "resource": "curated/orders/new.parquet",
     "result": "deny",
     "status": 403,
     "who": "analyst",
     "why": "Read access only. Nothing allows s3:PutObject"
    },
    {
     "action": "s3:GetObject",
     "code": "AccessDenied",
     "resource": "curated/orders/secret/s.parquet",
     "result": "deny",
     "status": 403,
     "who": "analyst",
     "why": "ReadCurated allows it, but NoSecrets denies it, and an explicit deny always wins"
    },
    {
     "action": "s3:ListBucket",
     "code": "",
     "resource": "the bucket brewline-lake",
     "result": "allow",
     "status": 200,
     "who": "analyst",
     "why": "ListTheBucket allows s3:ListBucket on the bucket ARN"
    },
    {
     "action": "s3:ListBucket",
     "code": "AccessDenied",
     "resource": "another bucket",
     "result": "deny",
     "status": 403,
     "who": "analyst",
     "why": "The policy names only brewline-lake"
    },
    {
     "action": "s3:GetObject",
     "code": "AccessDenied",
     "resource": "curated/orders/dt=2026-03-14/part-0.parquet",
     "result": "deny",
     "status": 403,
     "who": "analyst-wrong-arns",
     "why": "The allow is on the bucket ARN. Objects have their own ARN, which ends in /*"
    },
    {
     "action": "s3:ListBucket",
     "code": "AccessDenied",
     "resource": "the bucket brewline-lake",
     "result": "deny",
     "status": 403,
     "who": "analyst-wrong-arns",
     "why": "The allow is on the object ARN. Listing needs the bucket ARN"
    },
    {
     "action": "s3:GetObject",
     "code": "",
     "resource": "raw/orders/dt=2026-03-14/orders-0001.json",
     "result": "allow",
     "status": 200,
     "who": "role raw-reader",
     "why": "The role policy allows raw/*, and the assumed session gets the role permissions"
    },
    {
     "action": "s3:GetObject",
     "code": "AccessDenied",
     "resource": "curated/orders/dt=2026-03-14/part-0.parquet",
     "result": "deny",
     "status": 403,
     "who": "role raw-reader",
     "why": "The role policy does not cover curated/*"
    }
   ],
   "setup_calls": 14
  },
  "kinesis.errors": {
   "unknown_stream": {
    "code": "ResourceNotFoundException",
    "message": "Stream nope under account 123456789012 not found.",
    "status": 400
   }
  },
  "kinesis.mapping": {
   "rows": [
    {
     "key": "C-0001",
     "md5": "916d00dfcedafbac672344e3ed9eaf24",
     "ring_position": 0.5681,
     "shard": "shardId-000000000002"
    },
    {
     "key": "C-0002",
     "md5": "a474d2641a4004272ad307e3763157de",
     "ring_position": 0.6424,
     "shard": "shardId-000000000002"
    },
    {
     "key": "C-0003",
     "md5": "8ff951499fcad9f9f5dc56a9f9706bf3",
     "ring_position": 0.5624,
     "shard": "shardId-000000000002"
    },
    {
     "key": "C-0004",
     "md5": "a286b96721ba5dae864173a299684868",
     "ring_position": 0.6349,
     "shard": "shardId-000000000002"
    },
    {
     "key": "C-0005",
     "md5": "902573a7b7c294d19b74032b5c2b017a",
     "ring_position": 0.5631,
     "shard": "shardId-000000000002"
    },
    {
     "key": "C-0006",
     "md5": "3ac0c6723fd85ca1e6b41744d2ae4b65",
     "ring_position": 0.2295,
     "shard": "shardId-000000000000"
    },
    {
     "key": "C-0007",
     "md5": "07ebe895bd09b27623cd34566f52fad6",
     "ring_position": 0.0309,
     "shard": "shardId-000000000000"
    },
    {
     "key": "C-0008",
     "md5": "3a555143874ec071e7734b91df22ed75",
     "ring_position": 0.2279,
     "shard": "shardId-000000000000"
    },
    {
     "key": "C-1880",
     "md5": "81d33aed5cee5ba81e86a3cd335bba02",
     "ring_position": 0.5071,
     "shard": "shardId-000000000002"
    },
    {
     "key": "C-1884",
     "md5": "da86e8758e9d749b7ec49f8748e3fa79",
     "ring_position": 0.8536,
     "shard": "shardId-000000000003"
    },
    {
     "key": "C-4417",
     "md5": "b69c954dbb77ab7828a8c5b792bbf750",
     "ring_position": 0.7133,
     "shard": "shardId-000000000002"
    },
    {
     "key": "guest",
     "md5": "084e0343a0486ff05530df6c705c8bb4",
     "ring_position": 0.0324,
     "shard": "shardId-000000000000"
    }
   ],
   "rule": "MD5 of the partition key, read as a 128-bit integer, picks the shard whose hash key range holds it"
  },
  "kinesis.shards": {
   "max_hash": "340282366920938463463374607431768211455",
   "shards": [
    {
     "end": "85070591730234615865843651857942052863",
     "id": "shardId-000000000000",
     "share_of_the_ring": 0.25,
     "start": "0"
    },
    {
     "end": "170141183460469231731687303715884105727",
     "id": "shardId-000000000001",
     "share_of_the_ring": 0.25,
     "start": "85070591730234615865843651857942052864"
    },
    {
     "end": "255211775190703847597530955573826158591",
     "id": "shardId-000000000002",
     "share_of_the_ring": 0.25,
     "start": "170141183460469231731687303715884105728"
    },
    {
     "end": "340282366920938463463374607431768211455",
     "id": "shardId-000000000003",
     "share_of_the_ring": 0.25,
     "start": "255211775190703847597530955573826158592"
    }
   ],
   "stream": "orders"
  },
  "kinesis.skew": {
   "busiest_customer": "C-0001",
   "busiest_customer_events": 2967,
   "by_key": {
    "shardId-000000000000": 4583,
    "shardId-000000000001": 2743,
    "shardId-000000000002": 9390,
    "shardId-000000000003": 3284
   },
   "by_key_ratio": 1.88,
   "customers": 500,
   "events": 20000,
   "mean_per_shard": 5000.0,
   "salted_8": {
    "shardId-000000000000": 5205,
    "shardId-000000000001": 5455,
    "shardId-000000000002": 4512,
    "shardId-000000000003": 4828
   },
   "salted_ratio": 1.09
  },
  "kinesis.split": {
   "after": [
    {
     "id": "shardId-000000000000",
     "parent": "",
     "share_of_the_ring": 0.25,
     "state": "open"
    },
    {
     "id": "shardId-000000000001",
     "parent": "",
     "share_of_the_ring": 0.25,
     "state": "open"
    },
    {
     "id": "shardId-000000000002",
     "parent": "",
     "share_of_the_ring": 0.25,
     "state": "closed"
    },
    {
     "id": "shardId-000000000003",
     "parent": "",
     "share_of_the_ring": 0.25,
     "state": "open"
    },
    {
     "id": "shardId-000000000004",
     "parent": "shardId-000000000002",
     "share_of_the_ring": 0.125,
     "state": "open"
    },
    {
     "id": "shardId-000000000005",
     "parent": "shardId-000000000002",
     "share_of_the_ring": 0.125,
     "state": "open"
    }
   ],
   "before": [
    {
     "id": "shardId-000000000000",
     "parent": "",
     "share_of_the_ring": 0.25,
     "state": "open"
    },
    {
     "id": "shardId-000000000001",
     "parent": "",
     "share_of_the_ring": 0.25,
     "state": "open"
    },
    {
     "id": "shardId-000000000002",
     "parent": "",
     "share_of_the_ring": 0.25,
     "state": "open"
    },
    {
     "id": "shardId-000000000003",
     "parent": "",
     "share_of_the_ring": 0.25,
     "state": "open"
    }
   ],
   "split": "shardId-000000000002"
  },
  "kms.envelope": {
   "data_key_bytes": 32,
   "key_has_alias": "alias/brewline-lake",
   "key_spec": "AES_256",
   "key_state": "Enabled",
   "rotation_enabled_by_default": false,
   "round_trip_ok": true,
   "steps": [
    "GenerateDataKey returns the key twice: plaintext and encrypted under the KMS key",
    "encrypt the data locally with the plaintext key (AES-GCM)",
    "store the encrypted data key next to the encrypted data, and drop the plaintext key",
    "later: Decrypt the data key through KMS, then decrypt the data locally"
   ],
   "wrong_encryption_context": {
    "code": "InvalidCiphertextException",
    "message": "",
    "status": 400
   }
  },
  "lambda.run": {
   "event_key": "raw/orders/dt%3D2026-03-14/orders-0001.json",
   "first": {
    "results": [
     {
      "key": "raw/orders/dt=2026-03-14/orders-0001.json",
      "orders": 3,
      "revenue_usd": 19.5,
      "status": "written"
     }
    ]
   },
   "objects_written": [
    "curated/order_summaries/raw_orders_dt=2026-03-14_orders-0001.json.json"
   ],
   "second": {
    "results": [
     {
      "key": "raw/orders/dt=2026-03-14/orders-0001.json",
      "orders": 3,
      "revenue_usd": 19.5,
      "status": "already done"
     }
    ]
   },
   "summary_body": {
    "orders": 3,
    "revenue_usd": 19.5
   }
  },
  "policy.lint": {
   "deny_secret": [],
   "misspelled_action": [
    {
     "detail": "Unknown action s3:GetObjects",
     "issue": "UNKNOWN_ACTION"
    }
   ],
   "read_curated": [],
   "role_raw": [],
   "wildcards": [
    {
     "detail": "Resource is * for actions that accept a resource ARN (145 actions)",
     "issue": "RESOURCE_STAR"
    }
   ],
   "wrong_arns": [
    {
     "detail": "[{'action': 's3:GetObject', 'required_format': 'arn:*:s3:::*/*'}]",
     "issue": "RESOURCE_MISMATCH"
    },
    {
     "detail": "[{'action': 's3:ListBucket', 'required_format': 'arn:*:s3:::*'}]",
     "issue": "RESOURCE_MISMATCH"
    }
   ]
  },
  "s3.conditional_write": {
   "first_status": 200,
   "second": {
    "code": "PreconditionFailed",
    "message": "At least one of the pre-conditions you specified did not hold",
    "status": 412
   }
  },
  "s3.errors": {
   "get_missing_bucket": {
    "code": "NoSuchBucket",
    "message": "The specified bucket does not exist",
    "status": 404
   },
   "get_missing_key": {
    "code": "NoSuchKey",
    "message": "The specified key does not exist.",
    "status": 404
   },
   "head_missing_key": {
    "code": "404",
    "message": "Not Found",
    "status": 404
   }
  },
  "s3.keys": {
   "bucket": "brewline-lake",
   "keys": [
    "README.txt",
    "curated/daily_revenue/part-0.parquet",
    "curated/orders/dt=2026-03-14/part-0.parquet",
    "curated/orders/dt=2026-03-15/part-0.parquet",
    "raw/customers/customers.csv",
    "raw/events/year=2026/month=03/day=14/part-0.json.gz",
    "raw/orders/dt=2026-03-14/orders-0001.json",
    "raw/orders/dt=2026-03-14/orders-0002.json",
    "raw/orders/dt=2026-03-15/orders-0001.json",
    "scripts/etl.py"
   ]
  },
  "s3.lifecycle": {
   "bad_storage_class": null,
   "returned": [
    {
     "Expiration": {
      "Days": 365
     },
     "Filter": {
      "Prefix": "raw/"
     },
     "ID": "raw-to-cheaper-storage",
     "Status": "Enabled",
     "Transitions": [
      {
       "Days": 30,
       "StorageClass": "STANDARD_IA"
      },
      {
       "Days": 90,
       "StorageClass": "GLACIER"
      }
     ]
    },
    {
     "AbortIncompleteMultipartUpload": {
      "DaysAfterInitiation": 7
     },
     "Filter": {
      "Prefix": ""
     },
     "ID": "clean-up-failed-uploads",
     "Status": "Enabled"
    }
   ],
   "sent": [
    {
     "Expiration": {
      "Days": 365
     },
     "Filter": {
      "Prefix": "raw/"
     },
     "ID": "raw-to-cheaper-storage",
     "Status": "Enabled",
     "Transitions": [
      {
       "Days": 30,
       "StorageClass": "STANDARD_IA"
      },
      {
       "Days": 90,
       "StorageClass": "GLACIER"
      }
     ]
    },
    {
     "AbortIncompleteMultipartUpload": {
      "DaysAfterInitiation": 7
     },
     "Filter": {
      "Prefix": ""
     },
     "ID": "clean-up-failed-uploads",
     "Status": "Enabled"
    }
   ]
  },
  "s3.listing": [
   {
    "common_prefixes": [],
    "delimiter": "",
    "is_truncated": false,
    "key_count": 10,
    "keys": [
     "README.txt",
     "curated/daily_revenue/part-0.parquet",
     "curated/orders/dt=2026-03-14/part-0.parquet",
     "curated/orders/dt=2026-03-15/part-0.parquet",
     "raw/customers/customers.csv",
     "raw/events/year=2026/month=03/day=14/part-0.json.gz",
     "raw/orders/dt=2026-03-14/orders-0001.json",
     "raw/orders/dt=2026-03-14/orders-0002.json",
     "raw/orders/dt=2026-03-15/orders-0001.json",
     "scripts/etl.py"
    ],
    "prefix": ""
   },
   {
    "common_prefixes": [
     "curated/",
     "raw/",
     "scripts/"
    ],
    "delimiter": "/",
    "is_truncated": false,
    "key_count": 4,
    "keys": [
     "README.txt"
    ],
    "prefix": ""
   },
   {
    "common_prefixes": [],
    "delimiter": "",
    "is_truncated": false,
    "key_count": 5,
    "keys": [
     "raw/customers/customers.csv",
     "raw/events/year=2026/month=03/day=14/part-0.json.gz",
     "raw/orders/dt=2026-03-14/orders-0001.json",
     "raw/orders/dt=2026-03-14/orders-0002.json",
     "raw/orders/dt=2026-03-15/orders-0001.json"
    ],
    "prefix": "raw/"
   },
   {
    "common_prefixes": [
     "raw/customers/",
     "raw/events/",
     "raw/orders/"
    ],
    "delimiter": "/",
    "is_truncated": false,
    "key_count": 3,
    "keys": [],
    "prefix": "raw/"
   },
   {
    "common_prefixes": [],
    "delimiter": "",
    "is_truncated": false,
    "key_count": 3,
    "keys": [
     "raw/orders/dt=2026-03-14/orders-0001.json",
     "raw/orders/dt=2026-03-14/orders-0002.json",
     "raw/orders/dt=2026-03-15/orders-0001.json"
    ],
    "prefix": "raw/orders/"
   },
   {
    "common_prefixes": [
     "raw/orders/dt=2026-03-14/",
     "raw/orders/dt=2026-03-15/"
    ],
    "delimiter": "/",
    "is_truncated": false,
    "key_count": 2,
    "keys": [],
    "prefix": "raw/orders/"
   },
   {
    "common_prefixes": [],
    "delimiter": "",
    "is_truncated": false,
    "key_count": 2,
    "keys": [
     "raw/orders/dt=2026-03-14/orders-0001.json",
     "raw/orders/dt=2026-03-14/orders-0002.json"
    ],
    "prefix": "raw/orders/dt=2026-03-14/"
   },
   {
    "common_prefixes": [],
    "delimiter": "/",
    "is_truncated": false,
    "key_count": 2,
    "keys": [
     "raw/orders/dt=2026-03-14/orders-0001.json",
     "raw/orders/dt=2026-03-14/orders-0002.json"
    ],
    "prefix": "raw/orders/dt=2026-03-14/"
   },
   {
    "common_prefixes": [],
    "delimiter": "",
    "is_truncated": false,
    "key_count": 3,
    "keys": [
     "raw/orders/dt=2026-03-14/orders-0001.json",
     "raw/orders/dt=2026-03-14/orders-0002.json",
     "raw/orders/dt=2026-03-15/orders-0001.json"
    ],
    "prefix": "raw/ord"
   },
   {
    "common_prefixes": [
     "raw/orders/"
    ],
    "delimiter": "/",
    "is_truncated": false,
    "key_count": 1,
    "keys": [],
    "prefix": "raw/ord"
   },
   {
    "common_prefixes": [],
    "delimiter": "",
    "is_truncated": false,
    "key_count": 3,
    "keys": [
     "curated/daily_revenue/part-0.parquet",
     "curated/orders/dt=2026-03-14/part-0.parquet",
     "curated/orders/dt=2026-03-15/part-0.parquet"
    ],
    "prefix": "curated/"
   },
   {
    "common_prefixes": [
     "curated/daily_revenue/",
     "curated/orders/"
    ],
    "delimiter": "/",
    "is_truncated": false,
    "key_count": 2,
    "keys": [],
    "prefix": "curated/"
   },
   {
    "common_prefixes": [],
    "delimiter": "",
    "is_truncated": false,
    "key_count": 3,
    "keys": [
     "raw/orders/dt=2026-03-14/orders-0001.json",
     "raw/orders/dt=2026-03-14/orders-0002.json",
     "raw/orders/dt=2026-03-15/orders-0001.json"
    ],
    "prefix": "raw/orders/dt=2026-03-1"
   },
   {
    "common_prefixes": [
     "raw/orders/dt=2026-03-14/",
     "raw/orders/dt=2026-03-15/"
    ],
    "delimiter": "/",
    "is_truncated": false,
    "key_count": 2,
    "keys": [],
    "prefix": "raw/orders/dt=2026-03-1"
   }
  ],
  "s3.multipart": {
   "expected_etag": "7f636b2c1182136c010c5860a051b3e8-3",
   "final_etag": "7f636b2c1182136c010c5860a051b3e8-3",
   "matches_the_documented_rule": true,
   "part_etags": [
    "79b281060d337b9b2b84ccf390adcf74",
    "74843a3ab193a389bced899402d99d5f",
    "95d674ce4178cc3ef807606ecb8ec0f5"
   ],
   "part_sizes_bytes": [
    5242880,
    5242880,
    1048576
   ],
   "too_small_error": {
    "code": "EntityTooSmall",
    "message": "Your proposed upload is smaller than the minimum allowed object size.",
    "status": 400
   }
  },
  "s3.pages": {
   "max_keys": 4,
   "pages": [
    {
     "has_next_token": true,
     "is_truncated": true,
     "keys": [
      "README.txt",
      "curated/daily_revenue/part-0.parquet",
      "curated/orders/dt=2026-03-14/part-0.parquet",
      "curated/orders/dt=2026-03-15/part-0.parquet"
     ]
    },
    {
     "has_next_token": true,
     "is_truncated": true,
     "keys": [
      "raw/customers/customers.csv",
      "raw/events/year=2026/month=03/day=14/part-0.json.gz",
      "raw/orders/dt=2026-03-14/orders-0001.json",
      "raw/orders/dt=2026-03-14/orders-0002.json"
     ]
    },
    {
     "has_next_token": false,
     "is_truncated": false,
     "keys": [
      "raw/orders/dt=2026-03-15/orders-0001.json",
      "scripts/etl.py"
     ]
    }
   ],
   "paginator_page_sizes": [
    4,
    4,
    2
   ]
  },
  "s3.param_validation": {
   "error": "ParamValidationError",
   "message": "Unknown parameter in LifecycleConfiguration.Rules[0].Expiration: \"Day\", must be one of: Date, Days, ExpiredObjectDeleteMarker"
  },
  "s3.presign": {
   "expires_seconds": 900,
   "v2_params": [
    "AWSAccessKeyId",
    "Expires",
    "Signature"
   ],
   "v4_params": [
    "X-Amz-Algorithm",
    "X-Amz-Credential",
    "X-Amz-Date",
    "X-Amz-Expires",
    "X-Amz-Signature",
    "X-Amz-SignedHeaders"
   ]
  },
  "s3.versioning": {
   "steps": [
    {
     "call": "put_object report.csv \"total=100\"",
     "read": {
      "body": "total=100",
      "ok": true,
      "version": "v1"
     },
     "result": "new version v1",
     "state": {
      "delete_markers": [],
      "versions": [
       {
        "id": "v1",
        "latest": true
       }
      ]
     }
    },
    {
     "call": "put_object report.csv \"total=120\"",
     "read": {
      "body": "total=120",
      "ok": true,
      "version": "v2"
     },
     "result": "new version v2",
     "state": {
      "delete_markers": [],
      "versions": [
       {
        "id": "v2",
        "latest": true
       },
       {
        "id": "v1",
        "latest": false
       }
      ]
     }
    },
    {
     "call": "delete_object report.csv",
     "read": {
      "code": "NoSuchKey",
      "ok": false,
      "status": 404
     },
     "result": "delete marker dm1 (nothing is removed)",
     "state": {
      "delete_markers": [
       {
        "id": "dm1",
        "latest": true
       }
      ],
      "versions": [
       {
        "id": "v2",
        "latest": false
       },
       {
        "id": "v1",
        "latest": false
       }
      ]
     }
    },
    {
     "call": "delete_object report.csv VersionId=v1",
     "read": {
      "code": "NoSuchKey",
      "ok": false,
      "status": 404
     },
     "result": "version v1 is deleted for good",
     "state": {
      "delete_markers": [
       {
        "id": "dm1",
        "latest": true
       }
      ],
      "versions": [
       {
        "id": "v2",
        "latest": false
       }
      ]
     }
    },
    {
     "call": "delete_object report.csv VersionId=dm1",
     "read": {
      "body": "total=120",
      "ok": true,
      "version": "v2"
     },
     "result": "the delete marker is removed, so v2 is current again",
     "state": {
      "delete_markers": [],
      "versions": [
       {
        "id": "v2",
        "latest": true
       }
      ]
     }
    },
    {
     "call": "delete_object report.csv VersionId=v2",
     "read": {
      "code": "NoSuchKey",
      "ok": false,
      "status": 404
     },
     "result": "the last version is deleted for good",
     "state": {
      "delete_markers": [],
      "versions": []
     }
    }
   ]
  },
  "secrets.versions": {
   "current_password": "v2-password",
   "missing": {
    "code": "ResourceNotFoundException",
    "message": "Secrets Manager can't find the specified secret.",
    "status": 404
   },
   "previous_password": "v1-password",
   "versions": [
    [
     "AWSCURRENT"
    ],
    [
     "AWSPREVIOUS"
    ]
   ]
  },
  "sigv4.keys": {
   "credential_scope": "20130524/us-east-1/s3/aws4_request",
   "doc_signature": "f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
   "kDate": "68896419206d6240ad4cd7dc8ba658efbf3b43b53041950083a10833824fcfbb",
   "kRegion": "0506335cc36b4a971f6beddf0adbd976ee71222cb42c131487e0c12c5c47a025",
   "kService": "05602c14e8b6aad30e7f6dec4b544071f6e4a742934bc5e36415733c47a67d44",
   "kSigning": "dbb893acc010964918f1fd433add87c70e8b0db6be30c1fbeafefa5ec6ba8378",
   "matches_the_documentation": true,
   "payload_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
   "recomputed_by_hand": "f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
   "recomputed_matches": true,
   "signature": "f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41"
  },
  "sns.fanout": {
   "analytics_count": 2,
   "billing_body_is_raw_message": {
    "order_id": "O-5001",
    "status": "COMPLETED"
   },
   "billing_count": 1,
   "envelope_fields": [
    "Message",
    "MessageAttributes",
    "MessageId",
    "Signature",
    "SignatureVersion",
    "SigningCertURL",
    "Timestamp",
    "TopicArn",
    "Type",
    "UnsubscribeURL"
   ],
   "envelope_type": "Notification",
   "filter_policy": {
    "status": [
     "COMPLETED"
    ]
   },
   "inner_message_in_envelope": {
    "order_id": "O-5001",
    "status": "COMPLETED"
   }
  },
  "sqs.delete": {
   "received_again_after_timeout": false,
   "received_first_time": true
  },
  "sqs.errors": {
   "fifo_without_group_id": {
    "code": "MissingParameter",
    "message": "The request must contain the parameter MessageGroupId.",
    "status": 400
   }
  },
  "sqs.fifo": {
   "received_in_order": [
    "order 1",
    "order 2"
   ],
   "sent": 3
  },
  "sqs.redrive": {
   "dlq_message_body": "{\"order_id\": \"O-5001\"}",
   "main_queue_depth_at_end": 0,
   "max_receive_count": 2,
   "timeline": [
    {
     "receive_count": 1,
     "received": true,
     "step": "first receive, the worker starts and then crashes",
     "t": 0.0
    },
    {
     "receive_count": null,
     "received": false,
     "step": "a second worker asks 0.1 seconds later",
     "t": 0.0
    },
    {
     "receive_count": 2,
     "received": true,
     "step": "the visibility timeout (2 s) has passed, the message is back",
     "t": 2.5
    },
    {
     "receive_count": null,
     "received": false,
     "step": "a third attempt, but maxReceiveCount is 2",
     "t": 4.5
    }
   ],
   "visibility_timeout_seconds": 2
  },
  "ssm.parameters": {
   "names": [
    "/brewline/prod/athena/workgroup",
    "/brewline/prod/db/password"
   ],
   "secure_value_without_decryption_is_clear_text": false,
   "types": {
    "/brewline/prod/athena/workgroup": "String",
    "/brewline/prod/db/password": "SecureString"
   }
  },
  "test.summary": {
   "fail_rc": 1,
   "failed_with_bug": true,
   "pass_rc": 0,
   "passed": 3
  }
 },
 "files": {
  "athena/q1.sql": "SELECT count(*) FROM orders\n",
  "athena/q2.sql": "SELECT sum(total_usd) FROM orders WHERE order_date = DATE '2026-03-14'\n",
  "athena/q3.sql": "SELECT customer_id, sum(total_usd) AS spend FROM orders WHERE order_date BETWEEN DATE '2026-03-01' AND DATE '2026-03-31' GROUP BY customer_id ORDER BY spend DESC LIMIT 5\n",
  "athena/q4.sql": "SELECT * FROM orders WHERE order_id = 'O-1234567'\n",
  "athena/q5.sql": "SELECT status, count(*) FROM orders GROUP BY status\n",
  "cfn/lake.yaml": "AWSTemplateFormatVersion: \"2010-09-09\"\nDescription: Brewline data lake bucket, catalog database and the role of the Glue job\nParameters:\n  Env:\n    Type: String\n    AllowedValues: [dev, prod]\n    Default: dev\nResources:\n  LakeBucket:\n    Type: AWS::S3::Bucket\n    DeletionPolicy: Retain\n    UpdateReplacePolicy: Retain\n    Properties:\n      BucketName: !Sub brewline-lake-${Env}-${AWS::AccountId}\n      VersioningConfiguration:\n        Status: Enabled\n      PublicAccessBlockConfiguration:\n        BlockPublicAcls: true\n        BlockPublicPolicy: true\n        IgnorePublicAcls: true\n        RestrictPublicBuckets: true\n      BucketEncryption:\n        ServerSideEncryptionConfiguration:\n          - ServerSideEncryptionByDefault:\n              SSEAlgorithm: aws:kms\n            BucketKeyEnabled: true\n      LifecycleConfiguration:\n        Rules:\n          - Id: raw-to-cheaper-storage\n            Status: Enabled\n            Prefix: raw/\n            Transitions:\n              - StorageClass: STANDARD_IA\n                TransitionInDays: 30\n          - Id: clean-up-failed-uploads\n            Status: Enabled\n            AbortIncompleteMultipartUpload:\n              DaysAfterInitiation: 7\n  CatalogDatabase:\n    Type: AWS::Glue::Database\n    Properties:\n      CatalogId: !Ref AWS::AccountId\n      DatabaseInput:\n        Name: !Sub brewline_lake_${Env}\n  GlueRole:\n    Type: AWS::IAM::Role\n    Properties:\n      AssumeRolePolicyDocument:\n        Version: \"2012-10-17\"\n        Statement:\n          - Effect: Allow\n            Principal:\n              Service: glue.amazonaws.com\n            Action: sts:AssumeRole\n      ManagedPolicyArns:\n        - arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole\n      Policies:\n        - PolicyName: lake-access\n          PolicyDocument:\n            Version: \"2012-10-17\"\n            Statement:\n              - Effect: Allow\n                Action:\n                  - s3:GetObject\n                  - s3:PutObject\n                Resource: !Sub ${LakeBucket.Arn}/*\n              - Effect: Allow\n                Action: s3:ListBucket\n                Resource: !GetAtt LakeBucket.Arn\n  OrdersJob:\n    Type: AWS::Glue::Job\n    Properties:\n      Name: !Sub brewline-orders-to-parquet-${Env}\n      Role: !GetAtt GlueRole.Arn\n      GlueVersion: \"5.0\"\n      WorkerType: G.1X\n      NumberOfWorkers: 5\n      Timeout: 60\n      Command:\n        Name: glueetl\n        PythonVersion: \"3\"\n        ScriptLocation: !Sub s3://${LakeBucket}/scripts/orders_to_parquet.py\n      DefaultArguments:\n        --job-bookmark-option: job-bookmark-enable\n        --enable-metrics: \"true\"\nOutputs:\n  LakeBucketName:\n    Value: !Ref LakeBucket\n",
  "cfn/lake_bug.yaml": "AWSTemplateFormatVersion: \"2010-09-09\"\nDescription: Brewline data lake bucket, catalog database and the role of the Glue job\nParameters:\n  Env:\n    Type: String\n    AllowedValues: [dev, prod]\n    Default: dev\nResources:\n  LakeBucket:\n    Type: AWS::S3::Bucket\n    DeletionPolicy: Retain\n    UpdateReplacePolicy: Retain\n    Properties:\n      BucketName: !Sub brewline-lake-${Env}-${AWS::AccountId}\n      VersioningConfig:\n        Status: Enabled\n      PublicAccessBlockConfiguration:\n        BlockPublicAcls: true\n        BlockPublicPolicy: true\n        IgnorePublicAcls: true\n        RestrictPublicBuckets: true\n      BucketEncryption:\n        ServerSideEncryptionConfiguration:\n          - ServerSideEncryptionByDefault:\n              SSEAlgorithm: aws:kmss\n            BucketKeyEnabled: true\n      LifecycleConfiguration:\n        Rules:\n          - Id: raw-to-cheaper-storage\n            Status: Enabled\n            Prefix: raw/\n            Transitions:\n              - StorageClass: STANDARD_IA\n                TransitionInDays: 30\n          - Id: clean-up-failed-uploads\n            Status: Enabled\n            AbortIncompleteMultipartUpload:\n              DaysAfterInitiation: 7\n  CatalogDatabase:\n    Type: AWS::Glue::Database\n    Properties:\n      CatalogId: !Ref AWS::AccountId\n      DatabaseInput:\n        Name: !Sub brewline_lake_${Env}\n  GlueRole:\n    Type: AWS::IAM::Role\n    Properties:\n      AssumeRolePolicyDocument:\n        Version: \"2012-10-17\"\n        Statement:\n          - Effect: Allow\n            Principal:\n              Service: glue.amazonaws.com\n            Action: sts:AssumeRole\n      ManagedPolicyArns:\n        - arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole\n      Policies:\n        - PolicyName: lake-access\n          PolicyDocument:\n            Version: \"2012-10-17\"\n            Statement:\n              - Effect: Allow\n                Action:\n                  - s3:GetObject\n                  - s3:PutObject\n                Resource: !Sub ${LakeBucket.Arn}/*\n              - Effect: Allow\n                Action: s3:ListBucket\n                Resource: !GetAtt LakeBucket.Arnn\n  OrdersJob:\n    Type: AWS::Glue::Job\n    Properties:\n      Name: !Sub brewline-orders-to-parquet-${Env}\n      Role: !GetAtt GlueRole.Arn\n      GlueVersion: \"5.0\"\n      WorkerType: G.1X\n      NumberOfWorkers: five\n      Timeout: 60\n      DefaultArguments:\n        --job-bookmark-option: job-bookmark-enable\n        --enable-metrics: \"true\"\nOutputs:\n  LakeBucketName:\n    Value: !Ref LakeBucket\n",
  "cfn/pipeline.yaml": "AWSTemplateFormatVersion: \"2010-09-09\"\nDescription: The Brewline nightly orders pipeline as a Step Functions state machine\nResources:\n  PipelineRole:\n    Type: AWS::IAM::Role\n    Properties:\n      AssumeRolePolicyDocument:\n        Version: \"2012-10-17\"\n        Statement:\n          - Effect: Allow\n            Principal:\n              Service: states.amazonaws.com\n            Action: sts:AssumeRole\n  FailureTopic:\n    Type: AWS::SNS::Topic\n  OrdersPipeline:\n    Type: AWS::StepFunctions::StateMachine\n    Properties:\n      StateMachineName: brewline-orders-pipeline\n      RoleArn: !GetAtt PipelineRole.Arn\n      Definition:\n        Comment: Load the day of orders, check it, and tell someone if it fails\n        StartAt: RunGlueJob\n        States:\n          RunGlueJob:\n            Type: Task\n            Resource: arn:aws:states:::glue:startJobRun.sync\n            Parameters:\n              JobName: brewline-orders-to-parquet-prod\n            Retry:\n              - ErrorEquals:\n                  - Glue.ConcurrentRunsExceededException\n                IntervalSeconds: 30\n                BackoffRate: 2.0\n                MaxAttempts: 5\n            Catch:\n              - ErrorEquals:\n                  - States.ALL\n                Next: NotifyFailure\n            Next: CheckRowCount\n          CheckRowCount:\n            Type: Task\n            Resource: arn:aws:states:::athena:startQueryExecution.sync\n            Parameters:\n              QueryString: SELECT count(*) FROM brewline_lake.orders WHERE dt = current_date - interval '1' day\n              WorkGroup: brewline\n            Catch:\n              - ErrorEquals:\n                  - States.ALL\n                Next: NotifyFailure\n            End: true\n          NotifyFailure:\n            Type: Task\n            Resource: arn:aws:states:::sns:publish\n            Parameters:\n              TopicArn: !Ref FailureTopic\n              Message: The nightly orders pipeline failed\n            Next: Failed\n          Failed:\n            Type: Fail\n            Error: PipelineFailed\n            Cause: See the execution history\n",
  "cfn/pipeline_good.json": "{\n  \"Comment\": \"Load the day of orders, check it, and tell someone if it fails\",\n  \"StartAt\": \"RunGlueJob\",\n  \"States\": {\n    \"RunGlueJob\": {\n      \"Type\": \"Task\",\n      \"Resource\": \"arn:aws:states:::glue:startJobRun.sync\",\n      \"Parameters\": {\n        \"JobName\": \"brewline-orders-to-parquet-prod\"\n      },\n      \"Retry\": [\n        {\n          \"ErrorEquals\": [\n            \"Glue.ConcurrentRunsExceededException\"\n          ],\n          \"IntervalSeconds\": 30,\n          \"BackoffRate\": 2.0,\n          \"MaxAttempts\": 5\n        }\n      ],\n      \"Catch\": [\n        {\n          \"ErrorEquals\": [\n            \"States.ALL\"\n          ],\n          \"Next\": \"NotifyFailure\"\n        }\n      ],\n      \"Next\": \"CheckRowCount\"\n    },\n    \"CheckRowCount\": {\n      \"Type\": \"Task\",\n      \"Resource\": \"arn:aws:states:::athena:startQueryExecution.sync\",\n      \"Parameters\": {\n        \"QueryString\": \"SELECT count(*) FROM brewline_lake.orders WHERE dt = current_date - interval '1' day\",\n        \"WorkGroup\": \"brewline\"\n      },\n      \"Catch\": [\n        {\n          \"ErrorEquals\": [\n            \"States.ALL\"\n          ],\n          \"Next\": \"NotifyFailure\"\n        }\n      ],\n      \"End\": true\n    },\n    \"NotifyFailure\": {\n      \"Type\": \"Task\",\n      \"Resource\": \"arn:aws:states:::sns:publish\",\n      \"Parameters\": {\n        \"TopicArn\": \"<Ref>\",\n        \"Message\": \"The nightly orders pipeline failed\"\n      },\n      \"Next\": \"Failed\"\n    },\n    \"Failed\": {\n      \"Type\": \"Fail\",\n      \"Error\": \"PipelineFailed\",\n      \"Cause\": \"See the execution history\"\n    }\n  }\n}\n",
  "cfn/pipeline_next_to_a_missing_state.json": "{\n  \"Comment\": \"Load the day of orders, check it, and tell someone if it fails\",\n  \"StartAt\": \"RunGlueJob\",\n  \"States\": {\n    \"RunGlueJob\": {\n      \"Type\": \"Task\",\n      \"Resource\": \"arn:aws:states:::glue:startJobRun.sync\",\n      \"Parameters\": {\n        \"JobName\": \"brewline-orders-to-parquet-prod\"\n      },\n      \"Retry\": [\n        {\n          \"ErrorEquals\": [\n            \"Glue.ConcurrentRunsExceededException\"\n          ],\n          \"IntervalSeconds\": 30,\n          \"BackoffRate\": 2.0,\n          \"MaxAttempts\": 5\n        }\n      ],\n      \"Catch\": [\n        {\n          \"ErrorEquals\": [\n            \"States.ALL\"\n          ],\n          \"Next\": \"NotifyFailure\"\n        }\n      ],\n      \"Next\": \"CheckRowCounts\"\n    },\n    \"CheckRowCount\": {\n      \"Type\": \"Task\",\n      \"Resource\": \"arn:aws:states:::athena:startQueryExecution.sync\",\n      \"Parameters\": {\n        \"QueryString\": \"SELECT count(*) FROM brewline_lake.orders WHERE dt = current_date - interval '1' day\",\n        \"WorkGroup\": \"brewline\"\n      },\n      \"Catch\": [\n        {\n          \"ErrorEquals\": [\n            \"States.ALL\"\n          ],\n          \"Next\": \"NotifyFailure\"\n        }\n      ],\n      \"End\": true\n    },\n    \"NotifyFailure\": {\n      \"Type\": \"Task\",\n      \"Resource\": \"arn:aws:states:::sns:publish\",\n      \"Parameters\": {\n        \"TopicArn\": \"<Ref>\",\n        \"Message\": \"The nightly orders pipeline failed\"\n      },\n      \"Next\": \"Failed\"\n    },\n    \"Failed\": {\n      \"Type\": \"Fail\",\n      \"Error\": \"PipelineFailed\",\n      \"Cause\": \"See the execution history\"\n    }\n  }\n}\n",
  "cfn/pipeline_no_end.json": "{\n  \"Comment\": \"Load the day of orders, check it, and tell someone if it fails\",\n  \"StartAt\": \"RunGlueJob\",\n  \"States\": {\n    \"RunGlueJob\": {\n      \"Type\": \"Task\",\n      \"Resource\": \"arn:aws:states:::glue:startJobRun.sync\",\n      \"Parameters\": {\n        \"JobName\": \"brewline-orders-to-parquet-prod\"\n      },\n      \"Retry\": [\n        {\n          \"ErrorEquals\": [\n            \"Glue.ConcurrentRunsExceededException\"\n          ],\n          \"IntervalSeconds\": 30,\n          \"BackoffRate\": 2.0,\n          \"MaxAttempts\": 5\n        }\n      ],\n      \"Catch\": [\n        {\n          \"ErrorEquals\": [\n            \"States.ALL\"\n          ],\n          \"Next\": \"NotifyFailure\"\n        }\n      ],\n      \"Next\": \"CheckRowCount\"\n    },\n    \"CheckRowCount\": {\n      \"Type\": \"Task\",\n      \"Resource\": \"arn:aws:states:::athena:startQueryExecution.sync\",\n      \"Parameters\": {\n        \"QueryString\": \"SELECT count(*) FROM brewline_lake.orders WHERE dt = current_date - interval '1' day\",\n        \"WorkGroup\": \"brewline\"\n      },\n      \"Catch\": [\n        {\n          \"ErrorEquals\": [\n            \"States.ALL\"\n          ],\n          \"Next\": \"NotifyFailure\"\n        }\n      ]\n    },\n    \"NotifyFailure\": {\n      \"Type\": \"Task\",\n      \"Resource\": \"arn:aws:states:::sns:publish\",\n      \"Parameters\": {\n        \"TopicArn\": \"<Ref>\",\n        \"Message\": \"The nightly orders pipeline failed\"\n      },\n      \"Next\": \"Failed\"\n    },\n    \"Failed\": {\n      \"Type\": \"Fail\",\n      \"Error\": \"PipelineFailed\",\n      \"Cause\": \"See the execution history\"\n    }\n  }\n}\n",
  "cfn/pipeline_unknown_type.json": "{\n  \"Comment\": \"Load the day of orders, check it, and tell someone if it fails\",\n  \"StartAt\": \"RunGlueJob\",\n  \"States\": {\n    \"RunGlueJob\": {\n      \"Type\": \"Task\",\n      \"Resource\": \"arn:aws:states:::glue:startJobRun.sync\",\n      \"Parameters\": {\n        \"JobName\": \"brewline-orders-to-parquet-prod\"\n      },\n      \"Retry\": [\n        {\n          \"ErrorEquals\": [\n            \"Glue.ConcurrentRunsExceededException\"\n          ],\n          \"IntervalSeconds\": 30,\n          \"BackoffRate\": 2.0,\n          \"MaxAttempts\": 5\n        }\n      ],\n      \"Catch\": [\n        {\n          \"ErrorEquals\": [\n            \"States.ALL\"\n          ],\n          \"Next\": \"NotifyFailure\"\n        }\n      ],\n      \"Next\": \"CheckRowCount\"\n    },\n    \"CheckRowCount\": {\n      \"Type\": \"Task\",\n      \"Resource\": \"arn:aws:states:::athena:startQueryExecution.sync\",\n      \"Parameters\": {\n        \"QueryString\": \"SELECT count(*) FROM brewline_lake.orders WHERE dt = current_date - interval '1' day\",\n        \"WorkGroup\": \"brewline\"\n      },\n      \"Catch\": [\n        {\n          \"ErrorEquals\": [\n            \"States.ALL\"\n          ],\n          \"Next\": \"NotifyFailure\"\n        }\n      ],\n      \"End\": true\n    },\n    \"NotifyFailure\": {\n      \"Type\": \"Task\",\n      \"Resource\": \"arn:aws:states:::sns:publish\",\n      \"Parameters\": {\n        \"TopicArn\": \"<Ref>\",\n        \"Message\": \"The nightly orders pipeline failed\"\n      },\n      \"Next\": \"Failed\"\n    },\n    \"Failed\": {\n      \"Type\": \"Failure\",\n      \"Error\": \"PipelineFailed\",\n      \"Cause\": \"See the execution history\"\n    }\n  }\n}\n",
  "glue/table_input.json": "{\n  \"Name\": \"orders\",\n  \"TableType\": \"EXTERNAL_TABLE\",\n  \"PartitionKeys\": [\n    {\n      \"Name\": \"dt\",\n      \"Type\": \"string\"\n    }\n  ],\n  \"StorageDescriptor\": {\n    \"Columns\": [\n      {\n        \"Name\": \"order_id\",\n        \"Type\": \"string\"\n      },\n      {\n        \"Name\": \"customer_id\",\n        \"Type\": \"string\"\n      },\n      {\n        \"Name\": \"total_usd\",\n        \"Type\": \"decimal(12,2)\"\n      },\n      {\n        \"Name\": \"status\",\n        \"Type\": \"string\"\n      }\n    ],\n    \"Location\": \"s3://brewline-lake/curated/orders/\",\n    \"InputFormat\": \"org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat\",\n    \"OutputFormat\": \"org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat\",\n    \"SerdeInfo\": {\n      \"SerializationLibrary\": \"org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe\",\n      \"Parameters\": {\n        \"serialization.format\": \"1\"\n      }\n    }\n  },\n  \"Parameters\": {\n    \"classification\": \"parquet\",\n    \"EXTERNAL\": \"TRUE\"\n  }\n}\n",
  "glue/table_projection.json": "{\n  \"Name\": \"orders_projected\",\n  \"TableType\": \"EXTERNAL_TABLE\",\n  \"PartitionKeys\": [\n    {\n      \"Name\": \"dt\",\n      \"Type\": \"string\"\n    }\n  ],\n  \"StorageDescriptor\": {\n    \"Columns\": [\n      {\n        \"Name\": \"order_id\",\n        \"Type\": \"string\"\n      },\n      {\n        \"Name\": \"customer_id\",\n        \"Type\": \"string\"\n      },\n      {\n        \"Name\": \"total_usd\",\n        \"Type\": \"decimal(12,2)\"\n      },\n      {\n        \"Name\": \"status\",\n        \"Type\": \"string\"\n      }\n    ],\n    \"Location\": \"s3://brewline-lake/curated/orders/\",\n    \"InputFormat\": \"org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat\",\n    \"OutputFormat\": \"org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat\",\n    \"SerdeInfo\": {\n      \"SerializationLibrary\": \"org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe\",\n      \"Parameters\": {\n        \"serialization.format\": \"1\"\n      }\n    }\n  },\n  \"Parameters\": {\n    \"classification\": \"parquet\",\n    \"EXTERNAL\": \"TRUE\",\n    \"projection.enabled\": \"true\",\n    \"projection.dt.type\": \"date\",\n    \"projection.dt.range\": \"2026-01-01,NOW\",\n    \"projection.dt.format\": \"yyyy-MM-dd\",\n    \"projection.dt.interval\": \"1\",\n    \"projection.dt.interval.unit\": \"DAYS\",\n    \"storage.location.template\": \"s3://brewline-lake/curated/orders/dt=${dt}/\"\n  }\n}\n",
  "iam/deny_secret.json": "{\n  \"Version\": \"2012-10-17\",\n  \"Statement\": [\n    {\n      \"Sid\": \"NoSecrets\",\n      \"Effect\": \"Deny\",\n      \"Action\": \"s3:GetObject\",\n      \"Resource\": \"arn:aws:s3:::brewline-lake/curated/orders/secret/*\"\n    }\n  ]\n}\n",
  "iam/read_curated.json": "{\n  \"Version\": \"2012-10-17\",\n  \"Statement\": [\n    {\n      \"Sid\": \"ReadCurated\",\n      \"Effect\": \"Allow\",\n      \"Action\": \"s3:GetObject\",\n      \"Resource\": \"arn:aws:s3:::brewline-lake/curated/*\"\n    },\n    {\n      \"Sid\": \"ListTheBucket\",\n      \"Effect\": \"Allow\",\n      \"Action\": \"s3:ListBucket\",\n      \"Resource\": \"arn:aws:s3:::brewline-lake\"\n    }\n  ]\n}\n",
  "iam/role_raw.json": "{\n  \"Version\": \"2012-10-17\",\n  \"Statement\": [\n    {\n      \"Sid\": \"ReadRaw\",\n      \"Effect\": \"Allow\",\n      \"Action\": \"s3:GetObject\",\n      \"Resource\": \"arn:aws:s3:::brewline-lake/raw/*\"\n    }\n  ]\n}\n",
  "iam/trust_account.json": "{\n  \"Version\": \"2012-10-17\",\n  \"Statement\": [\n    {\n      \"Effect\": \"Allow\",\n      \"Principal\": {\n        \"AWS\": \"arn:aws:iam::123456789012:root\"\n      },\n      \"Action\": \"sts:AssumeRole\"\n    }\n  ]\n}\n",
  "iam/trust_glue.json": "{\n  \"Version\": \"2012-10-17\",\n  \"Statement\": [\n    {\n      \"Effect\": \"Allow\",\n      \"Principal\": {\n        \"Service\": \"glue.amazonaws.com\"\n      },\n      \"Action\": \"sts:AssumeRole\"\n    }\n  ]\n}\n",
  "iam/wrong_arns.json": "{\n  \"Version\": \"2012-10-17\",\n  \"Statement\": [\n    {\n      \"Sid\": \"ObjectActionOnTheBucketArn\",\n      \"Effect\": \"Allow\",\n      \"Action\": \"s3:GetObject\",\n      \"Resource\": \"arn:aws:s3:::brewline-lake\"\n    },\n    {\n      \"Sid\": \"BucketActionOnTheObjectArn\",\n      \"Effect\": \"Allow\",\n      \"Action\": \"s3:ListBucket\",\n      \"Resource\": \"arn:aws:s3:::brewline-lake/*\"\n    }\n  ]\n}\n",
  "lambda/conftest.py": "import importlib\nimport os\n\nimport pytest\nfrom moto import mock_aws\n\nos.environ.setdefault(\"AWS_ACCESS_KEY_ID\", \"testing\")\nos.environ.setdefault(\"AWS_SECRET_ACCESS_KEY\", \"testing\")\nos.environ.setdefault(\"AWS_DEFAULT_REGION\", \"us-east-1\")\n\nBUCKET = \"brewline-lake\"\n\n\n@pytest.fixture()\ndef lake():\n    \"\"\"An empty bucket in a mocked S3, and the handler module created inside the mock.\"\"\"\n    with mock_aws():\n        import boto3\n\n        boto3.client(\"s3\").create_bucket(Bucket=BUCKET)\n        import handler\n\n        importlib.reload(handler)\n        yield handler\n",
  "lambda/event.json": "{\n  \"Records\": [\n    {\n      \"eventVersion\": \"2.1\",\n      \"eventSource\": \"aws:s3\",\n      \"awsRegion\": \"us-east-1\",\n      \"eventTime\": \"2026-03-14T09:00:05.123Z\",\n      \"eventName\": \"ObjectCreated:Put\",\n      \"userIdentity\": { \"principalId\": \"AWS:AIDAEXAMPLEEXAMPLE\" },\n      \"requestParameters\": { \"sourceIPAddress\": \"203.0.113.10\" },\n      \"responseElements\": {\n        \"x-amz-request-id\": \"EXAMPLE123456789\",\n        \"x-amz-id-2\": \"EXAMPLE123/5678abcdefghijklambdaisawesome/mnopqrstuvwxyzABCDEFGH\"\n      },\n      \"s3\": {\n        \"s3SchemaVersion\": \"1.0\",\n        \"configurationId\": \"raw-orders-created\",\n        \"bucket\": {\n          \"name\": \"brewline-lake\",\n          \"ownerIdentity\": { \"principalId\": \"A3EXAMPLEOWNER\" },\n          \"arn\": \"arn:aws:s3:::brewline-lake\"\n        },\n        \"object\": {\n          \"key\": \"raw/orders/dt%3D2026-03-14/orders-0001.json\",\n          \"size\": 5000,\n          \"eTag\": \"0123456789abcdef0123456789abcdef\",\n          \"sequencer\": \"0A1B2C3D4E5F678901\"\n        }\n      }\n    }\n  ]\n}\n",
  "lambda/handler.py": "\"\"\"Brewline: when a raw order file lands in S3, write a small summary next to the curated data.\n\nRuns as an S3-triggered Lambda function. Two details matter in production:\n  1. S3 sends the object key URL-encoded in the event, so \"dt=2026-03-14\" arrives as \"dt%3D2026-03-14\".\n  2. S3 can deliver the same event more than once, so the write must be safe to repeat.\n\"\"\"\nimport json\nimport os\nimport urllib.parse\n\nimport boto3\nfrom botocore.exceptions import ClientError\n\ns3 = boto3.client(\"s3\")\nSUMMARY_PREFIX = os.environ.get(\"SUMMARY_PREFIX\", \"curated/order_summaries/\")\n\n\ndef summarize(lines):\n    orders = [json.loads(line) for line in lines if line.strip()]\n    kept = [o for o in orders if o[\"status\"] != \"CANCELLED\"]\n    return {\"orders\": len(orders), \"revenue_usd\": round(sum(o[\"total_usd\"] for o in kept), 2)}\n\n\ndef lambda_handler(event, context):\n    results = []\n    for record in event[\"Records\"]:\n        bucket = record[\"s3\"][\"bucket\"][\"name\"]\n        key = urllib.parse.unquote_plus(record[\"s3\"][\"object\"][\"key\"])\n        body = s3.get_object(Bucket=bucket, Key=key)[\"Body\"].read().decode()\n        summary = summarize(body.splitlines())\n        out_key = SUMMARY_PREFIX + key.replace(\"/\", \"_\") + \".json\"\n        try:\n            s3.put_object(Bucket=bucket, Key=out_key, Body=json.dumps(summary).encode(), IfNoneMatch=\"*\")\n            status = \"written\"\n        except ClientError as err:\n            if err.response[\"Error\"][\"Code\"] != \"PreconditionFailed\":\n                raise\n            status = \"already done\"\n        results.append({\"key\": key, \"status\": status, **summary})\n    return {\"results\": results}\n",
  "lambda/handler_bug.py": "\"\"\"Brewline: when a raw order file lands in S3, write a small summary next to the curated data.\n\nRuns as an S3-triggered Lambda function. Two details matter in production:\n  1. S3 sends the object key URL-encoded in the event, so \"dt=2026-03-14\" arrives as \"dt%3D2026-03-14\".\n  2. S3 can deliver the same event more than once, so the write must be safe to repeat.\n\"\"\"\nimport json\nimport os\nimport urllib.parse\n\nimport boto3\nfrom botocore.exceptions import ClientError\n\ns3 = boto3.client(\"s3\")\nSUMMARY_PREFIX = os.environ.get(\"SUMMARY_PREFIX\", \"curated/order_summaries/\")\n\n\ndef summarize(lines):\n    orders = [json.loads(line) for line in lines if line.strip()]\n    kept = [o for o in orders if o[\"status\"] != \"CANCELLED\"]\n    return {\"orders\": len(orders), \"revenue_usd\": round(sum(o[\"total_usd\"] for o in kept), 2)}\n\n\ndef lambda_handler(event, context):\n    results = []\n    for record in event[\"Records\"]:\n        bucket = record[\"s3\"][\"bucket\"][\"name\"]\n        key = record[\"s3\"][\"object\"][\"key\"]\n        body = s3.get_object(Bucket=bucket, Key=key)[\"Body\"].read().decode()\n        summary = summarize(body.splitlines())\n        out_key = SUMMARY_PREFIX + key.replace(\"/\", \"_\") + \".json\"\n        try:\n            s3.put_object(Bucket=bucket, Key=out_key, Body=json.dumps(summary).encode(), IfNoneMatch=\"*\")\n            status = \"written\"\n        except ClientError as err:\n            if err.response[\"Error\"][\"Code\"] != \"PreconditionFailed\":\n                raise\n            status = \"already done\"\n        results.append({\"key\": key, \"status\": status, **summary})\n    return {\"results\": results}\n",
  "lambda/test_handler.py": "import json\n\nimport boto3\n\nfrom conftest import BUCKET\n\nORDERS = [\n    {\"order_id\": \"O-5001\", \"status\": \"COMPLETED\", \"total_usd\": 11.5},\n    {\"order_id\": \"O-5002\", \"status\": \"COMPLETED\", \"total_usd\": 8.0},\n    {\"order_id\": \"O-5003\", \"status\": \"CANCELLED\", \"total_usd\": 30.0},\n]\n\n\ndef s3_event(key):\n    \"\"\"The part of an S3 notification that the handler reads. Note the URL-encoded key.\"\"\"\n    return {\"Records\": [{\"eventSource\": \"aws:s3\", \"eventName\": \"ObjectCreated:Put\",\n                         \"s3\": {\"bucket\": {\"name\": BUCKET}, \"object\": {\"key\": key}}}]}\n\n\ndef put_orders(key):\n    body = \"\\n\".join(json.dumps(o) for o in ORDERS).encode()\n    boto3.client(\"s3\").put_object(Bucket=BUCKET, Key=key, Body=body)\n\n\ndef test_summary_skips_cancelled_orders(lake):\n    put_orders(\"raw/orders/dt=2026-03-14/orders-0001.json\")\n    out = lake.lambda_handler(s3_event(\"raw/orders/dt%3D2026-03-14/orders-0001.json\"), None)\n    assert out[\"results\"][0][\"orders\"] == 3\n    assert out[\"results\"][0][\"revenue_usd\"] == 19.5\n\n\ndef test_a_repeated_event_writes_nothing_twice(lake):\n    put_orders(\"raw/orders/dt=2026-03-14/orders-0001.json\")\n    event = s3_event(\"raw/orders/dt%3D2026-03-14/orders-0001.json\")\n    first = lake.lambda_handler(event, None)[\"results\"][0][\"status\"]\n    second = lake.lambda_handler(event, None)[\"results\"][0][\"status\"]\n    assert (first, second) == (\"written\", \"already done\")\n\n\ndef test_a_key_with_a_space_arrives_with_a_plus(lake):\n    put_orders(\"raw/orders/dt=2026-03-14/orders 0002.json\")\n    out = lake.lambda_handler(s3_event(\"raw/orders/dt%3D2026-03-14/orders+0002.json\"), None)\n    assert out[\"results\"][0][\"key\"] == \"raw/orders/dt=2026-03-14/orders 0002.json\"\n",
  "s3/lifecycle.json": "{\n  \"Rules\": [\n    {\n      \"ID\": \"raw-to-cheaper-storage\",\n      \"Status\": \"Enabled\",\n      \"Filter\": {\n        \"Prefix\": \"raw/\"\n      },\n      \"Transitions\": [\n        {\n          \"Days\": 30,\n          \"StorageClass\": \"STANDARD_IA\"\n        },\n        {\n          \"Days\": 90,\n          \"StorageClass\": \"GLACIER\"\n        }\n      ],\n      \"Expiration\": {\n        \"Days\": 365\n      }\n    },\n    {\n      \"ID\": \"clean-up-failed-uploads\",\n      \"Status\": \"Enabled\",\n      \"Filter\": {\n        \"Prefix\": \"\"\n      },\n      \"AbortIncompleteMultipartUpload\": {\n        \"DaysAfterInitiation\": 7\n      }\n    }\n  ]\n}\n"
 },
 "meta": {
  "account": "123456789012",
  "awscli": "1.46.3",
  "boto3": "1.43.126",
  "botocore": "1.43.126",
  "bucket": "brewline-lake",
  "cfn-lint": "1.60.0",
  "duckdb": "2.0.0",
  "moto": "5.2.5",
  "note": "Recorded by aws/verify/capture_aws.py with boto3 against moto (an AWS emulator), DuckDB, cfn-lint, parliament and pytest on one machine. Nothing ran on AWS.",
  "parliament": "1.6.4",
  "pyarrow": "26.0.1",
  "pytest": "9.2.0",
  "python": "3.13.18",
  "region": "us-east-1"
 },
 "tables": {
  "athena.q1_result": {
   "cols": [
    "orders"
   ],
   "rows": [
    [
     "2000000"
    ]
   ]
  },
  "athena.q2_result": {
   "cols": [
    "revenue_usd"
   ],
   "rows": [
    [
     "438176.25"
    ]
   ]
  },
  "athena.q3_result": {
   "cols": [
    "customer_id",
    "spend"
   ],
   "rows": [
    [
     "C-1884",
     "3708.00"
    ],
    [
     "C-1880",
     "3690.50"
    ],
    [
     "C-4417",
     "3685.50"
    ],
    [
     "C-4837",
     "3635.25"
    ],
    [
     "C-1673",
     "3606.25"
    ]
   ]
  },
  "athena.q4_result": {
   "cols": [
    "order_id",
    "customer_id",
    "order_ts",
    "status",
    "total_usd",
    "order_date"
   ],
   "rows": [
    [
     "O-1234567",
     "C-2433",
     "2026-02-25 13:19:56",
     "COMPLETED",
     "11.50",
     "2026-02-25"
    ]
   ]
  },
  "athena.q5_result": {
   "cols": [
    "status",
    "orders"
   ],
   "rows": [
    [
     "COMPLETED",
     "1800588"
    ],
    [
     "CANCELLED",
     "119640"
    ],
    [
     "REFUNDED",
     "79772"
    ]
   ]
  },
  "iam.truth": {
   "cols": [
    "Who",
    "Action",
    "Resource",
    "Result",
    "Why"
   ],
   "rows": [
    [
     "analyst",
     "s3:GetObject",
     "curated/orders/dt=2026-03-14/part-0.parquet",
     "allow",
     "ReadCurated allows it"
    ],
    [
     "analyst",
     "s3:GetObject",
     "raw/orders/dt=2026-03-14/orders-0001.json",
     "deny",
     "No statement allows it, so the default deny applies"
    ],
    [
     "analyst",
     "s3:PutObject",
     "curated/orders/new.parquet",
     "deny",
     "Read access only. Nothing allows s3:PutObject"
    ],
    [
     "analyst",
     "s3:GetObject",
     "curated/orders/secret/s.parquet",
     "deny",
     "ReadCurated allows it, but NoSecrets denies it, and an explicit deny always wins"
    ],
    [
     "analyst",
     "s3:ListBucket",
     "the bucket brewline-lake",
     "allow",
     "ListTheBucket allows s3:ListBucket on the bucket ARN"
    ],
    [
     "analyst",
     "s3:ListBucket",
     "another bucket",
     "deny",
     "The policy names only brewline-lake"
    ],
    [
     "analyst-wrong-arns",
     "s3:GetObject",
     "curated/orders/dt=2026-03-14/part-0.parquet",
     "deny",
     "The allow is on the bucket ARN. Objects have their own ARN, which ends in /*"
    ],
    [
     "analyst-wrong-arns",
     "s3:ListBucket",
     "the bucket brewline-lake",
     "deny",
     "The allow is on the object ARN. Listing needs the bucket ARN"
    ],
    [
     "role raw-reader",
     "s3:GetObject",
     "raw/orders/dt=2026-03-14/orders-0001.json",
     "allow",
     "The role policy allows raw/*, and the assumed session gets the role permissions"
    ],
    [
     "role raw-reader",
     "s3:GetObject",
     "curated/orders/dt=2026-03-14/part-0.parquet",
     "deny",
     "The role policy does not cover curated/*"
    ]
   ]
  },
  "sigv4.variants": {
   "cols": [
    "Case",
    "What changed",
    "Signature",
    "Same as the documentation"
   ],
   "rows": [
    [
     "The documentation example",
     "bytes=0-9 in us-east-1 on 2013-05-24",
     "f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
     "yes"
    ],
    [
     "One character of the secret key is wrong",
     "The last character of the secret key changed",
     "cf2bc7f3e73c9a122680ff084638e99d9c222bc8da64b1724f41cff483553311",
     "no"
    ],
    [
     "The request is a day late",
     "The date changed from 20130524 to 20130525",
     "617b808c41bf86c08dca3fe393bda31a6228139c25611b4dd8149940e44c540e",
     "no"
    ],
    [
     "Another region",
     "The region in the scope changed to us-west-2",
     "ed968db21dca61c1830aa783aa9f8eb607bdbf6047c137d2a3b4a80ba82656cf",
     "no"
    ],
    [
     "The Range header changed",
     "Range: bytes=0-10 instead of bytes=0-9",
     "1666373ce764212024960e5683245ab3b49228c854423889f280f9e2b8b14885",
     "no"
    ],
    [
     "A signed header is added",
     "x-amz-meta-run: 7 is now signed",
     "abb61691775bc0276caf5365cdea698f71ff55daf54c952672149c66bfedf5db",
     "no"
    ]
   ]
  }
 },
 "text": {
  "athena.layout_tree": "orders.csv\norders.csv.gz\norders.parquet\nparquet_by_day/dt=2026-01-01/data_0.parquet\nparquet_by_day/dt=2026-01-02/data_0.parquet\nparquet_by_day/dt=2026-01-03/data_0.parquet\nparquet_by_day/... (90 folders in all)",
  "cfn.lint_bug": "E3002 Additional properties are not allowed ('VersioningConfig' was unexpected. Did you mean 'VersioningConfiguration'?)\nlake_bug.yaml:15:7\n\nE3030 'aws:kmss' is not one of ['aws:kms', 'AES256', 'aws:kms:dsse']\nlake_bug.yaml:25:15\n\nE1010 'Arnn' is not one of ['Arn', 'DomainName', 'DualStackDomainName', 'RegionalDomainName', 'MetadataTableConfiguration.S3TablesDestination.TableNamespace', 'MetadataTableConfiguration.S3TablesDestination.TableArn', 'MetadataConfiguration.Destination', 'MetadataConfiguration.JournalTableConfiguration.TableName', 'MetadataConfiguration.JournalTableConfiguration.TableArn', 'MetadataConfiguration.InventoryTableConfiguration.TableName', 'MetadataConfiguration.InventoryTableConfiguration.TableArn', 'MetadataConfiguration.AnnotationTableConfiguration.TableName', 'MetadataConfiguration.AnnotationTableConfiguration.TableArn', 'WebsiteURL'] in ['us-east-1']\nlake_bug.yaml:69:17\n\nE3003 'Command' is a required property\nlake_bug.yaml:72:5\n\nE3012 'five' is not of type 'integer'\nlake_bug.yaml:77:7",
  "cfn.lint_good": "no findings (exit code 0)",
  "s3.presign_v2": "https://brewline-lake.s3.amazonaws.com/raw/customers/customers.csv\n?AWSAccessKeyId=AKIAIOSFODNN7EXAMPLE\n&Signature=PHKVkXNTAVKfnO3OIWJCYB9vLbk%3D\n&Expires=1773490500",
  "s3.presign_v4": "https://brewline-lake.s3.amazonaws.com/raw/customers/customers.csv\n?X-Amz-Algorithm=AWS4-HMAC-SHA256\n&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20260314%2Fus-east-1%2Fs3%2Faws4_request\n&X-Amz-Date=20260314T120000Z\n&X-Amz-Expires=900\n&X-Amz-SignedHeaders=host\n&X-Amz-Signature=ab90c365ecbb6347e5d571599d593ff4ddf72f73c940eed7b3dba3383b3dcfde",
  "sigv4.authorization": "AWS4-HMAC-SHA256\n  Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request,\n  SignedHeaders=host;range;x-amz-content-sha256;x-amz-date,\n  Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
  "sigv4.canonical_request": "GET\n/test.txt\n\nhost:examplebucket.s3.amazonaws.com\nrange:bytes=0-9\nx-amz-content-sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\nx-amz-date:20130524T000000Z\n\nhost;range;x-amz-content-sha256;x-amz-date\ne3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "sigv4.string_to_sign": "AWS4-HMAC-SHA256\n20130524T000000Z\n20130524/us-east-1/s3/aws4_request\n7344ae5b7ee6c3e7e6b0fe0640412a37625d1fbfff95c48bbb2dc43964946972",
  "test.fail": "F\n=================================== FAILURES ===================================\n_____________________ test_summary_skips_cancelled_orders ______________________\ntests/test_handler.py:27: in test_summary_skips_cancelled_orders\n    out = lake.lambda_handler(s3_event(\"raw/orders/dt%3D2026-03-14/orders-0001.json\"), None)\n          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\nhandler.py:29: in lambda_handler\n    body = s3.get_object(Bucket=bucket, Key=key)[\"Body\"].read().decode()\n           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\nbotocore/client.py:606: in _api_call\n    return self._make_api_call(operation_name, kwargs)\n           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\nbotocore/context.py:123: in wrapper\n    return func(*args, **kwargs)\n           ^^^^^^^^^^^^^^^^^^^^^\nbotocore/client.py:1094: in _make_api_call\n    raise error_class(parsed_response, operation_name)\nE   botocore.errorfactory.NoSuchKey: An error occurred (NoSuchKey) when calling the GetObject operation: The specified key does not exist.\n=========================== short test summary info ============================\nFAILED tests/test_handler.py::test_summary_skips_cancelled_orders - botocore....\n!!!!!!!!!!!!!!!!!!!!!!!!!! stopping after 1 failures !!!!!!!!!!!!!!!!!!!!!!!!!!!\n1 failed in 0.5s",
  "test.pass": "...                                                                      [100%]\n3 passed in 0.5s"
 }
};
