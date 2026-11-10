window.LAB = window.LAB || {};
LAB.real = {
 "counts": {
  "adf.check": {
   "activity_types": 40,
   "checker": "adf_check.py on the classes of azure-mgmt-datafactory 9.3.0",
   "dependency_conditions": [
    "Completed",
    "Failed",
    "Skipped",
    "Succeeded"
   ],
   "files": {
    "pl_dependency_typo.json": {
     "findings": [
      {
       "code": "UNKNOWN_DEPENDENCY",
       "message": "depends on 'CopyOrder', which is not an activity of this pipeline",
       "where": "AdvanceWatermark"
      },
      {
       "code": "INVALID_CONDITION",
       "message": "'Success' is not a dependency condition. Use one of Completed, Failed, Skipped, Succeeded",
       "where": "AdvanceWatermark"
      }
     ],
     "valid": false
    },
    "pl_expression_brace.json": {
     "findings": [
      {
       "code": "EXPRESSION_SYNTAX",
       "message": "the expression has braces, parentheses or quotes that do not close: SELECT * FROM dbo.orders WHERE modified_at > '@{activity('GetWatermark",
       "where": "activities[1].typeProperties.source.sqlReaderQuery"
      }
     ],
     "valid": false
    },
    "pl_missing_sink.json": {
     "findings": [
      {
       "code": "MISSING_PROPERTY",
       "message": "'typeProperties.sink' is required for CopyActivity",
       "where": "CopyOrders"
      }
     ],
     "valid": false
    },
    "pl_orders_daily.json": {
     "findings": [],
     "valid": true
    },
    "pl_unknown_activity.json": {
     "findings": [
      {
       "code": "UNKNOWN_ACTIVITY_TYPE",
       "message": "'CopyData' is not an activity type of the Data Factory API",
       "where": "CopyOrders"
      }
     ],
     "valid": false
    }
   },
   "sink_types": 46,
   "source_types": 104
  },
  "adf.watermark": {
   "runs": [
    "2026-03-14 09:00:00",
    "2026-03-14 09:10:00.150",
    "2026-03-14 10:00:00"
   ],
   "source": [
    {
     "committed_at": "2026-03-14 08:30:00",
     "modified_at": "2026-03-14 08:30:00",
     "order_id": "O1"
    },
    {
     "committed_at": "2026-03-14 08:45:00",
     "modified_at": "2026-03-14 08:45:00",
     "order_id": "O2"
    },
    {
     "committed_at": "2026-03-14 09:03:00",
     "modified_at": "2026-03-14 08:58:00",
     "order_id": "O3"
    },
    {
     "committed_at": "2026-03-14 09:10:00.100",
     "modified_at": "2026-03-14 09:10:00.000",
     "order_id": "O4"
    },
    {
     "committed_at": "2026-03-14 09:10:00.200",
     "modified_at": "2026-03-14 09:10:00.000",
     "order_id": "O5"
    },
    {
     "committed_at": "2026-03-14 09:30:00",
     "modified_at": "2026-03-14 09:30:00",
     "order_id": "O6"
    }
   ],
   "strategies": {
    "A": {
     "final": [
      "O1",
      "O2",
      "O3",
      "O4",
      "O6"
     ],
     "missing": [
      "O5"
     ],
     "rows_read_in_total": 5,
     "rule": "The watermark is the largest modified_at that was loaded. The next run reads modified_at > watermark.",
     "runs": [
      {
       "reads": [
        "O1",
        "O2"
       ],
       "run_at": "2026-03-14 09:00:00",
       "watermark_after": "2026-03-14 08:45:00.000000"
      },
      {
       "reads": [
        "O3",
        "O4"
       ],
       "run_at": "2026-03-14 09:10:00.150",
       "watermark_after": "2026-03-14 09:10:00.000000"
      },
      {
       "reads": [
        "O6"
       ],
       "run_at": "2026-03-14 10:00:00",
       "watermark_after": "2026-03-14 09:30:00.000000"
      }
     ]
    },
    "B": {
     "final": [
      "O1",
      "O2",
      "O4",
      "O6"
     ],
     "missing": [
      "O3",
      "O5"
     ],
     "rows_read_in_total": 4,
     "rule": "The watermark is the time the run started. The next run reads modified_at > watermark and <= its own start. Most first pipelines do this.",
     "runs": [
      {
       "reads": [
        "O1",
        "O2"
       ],
       "run_at": "2026-03-14 09:00:00",
       "watermark_after": "2026-03-14 09:00:00"
      },
      {
       "reads": [
        "O4"
       ],
       "run_at": "2026-03-14 09:10:00.150",
       "watermark_after": "2026-03-14 09:10:00.150"
      },
      {
       "reads": [
        "O6"
       ],
       "run_at": "2026-03-14 10:00:00",
       "watermark_after": "2026-03-14 10:00:00"
      }
     ]
    },
    "C": {
     "final": [
      "O1",
      "O2",
      "O3",
      "O4",
      "O5",
      "O6"
     ],
     "missing": [],
     "rows_read_in_total": 9,
     "rule": "The watermark is the time the run started, but the next run starts 15 minutes earlier and upserts by order_id.",
     "runs": [
      {
       "reads": [
        "O1",
        "O2"
       ],
       "run_at": "2026-03-14 09:00:00",
       "watermark_after": "2026-03-14 09:00:00"
      },
      {
       "reads": [
        "O2",
        "O3",
        "O4"
       ],
       "run_at": "2026-03-14 09:10:00.150",
       "watermark_after": "2026-03-14 09:10:00.150"
      },
      {
       "reads": [
        "O3",
        "O4",
        "O5",
        "O6"
       ],
       "run_at": "2026-03-14 10:00:00",
       "watermark_after": "2026-03-14 10:00:00"
      }
     ]
    }
   }
  },
  "blob.blocks": {
   "blob_exists_before_commit": false,
   "blocks": [
    {
     "decoded": "000000",
     "id": "MDAwMDAw",
     "size": 5
    },
    {
     "decoded": "000001",
     "id": "MDAwMDAx",
     "size": 5
    },
    {
     "decoded": "000002",
     "id": "MDAwMDAy",
     "size": 3
    }
   ],
   "commit_returns_etag": true,
   "committed_after": [
    "MDAwMDAw",
    "MDAwMDAx",
    "MDAwMDAy"
   ],
   "committed_before": [],
   "get_before_commit": {
    "code": "BlobNotFound",
    "message": "Operation returned an invalid status 'The specified blob does not exist.'",
    "status": 404
   },
   "size_after": 13,
   "smallest_block_bytes": 3,
   "uncommitted_after": [],
   "uncommitted_before": [
    "MDAwMDAw",
    "MDAwMDAx",
    "MDAwMDAy"
   ]
  },
  "blob.conditional": {
   "header_sent_by_overwrite_false": {
    "If-None-Match": "*"
   },
   "overwrite_false": {
    "code": "BlobAlreadyExists",
    "message": "The specified blob already exists.",
    "status": 409
   },
   "same_bytes_twice_same_etag": false,
   "sdk_default_service_version": "2026-10-06",
   "stale_etag": {
    "code": "ConditionNotMet",
    "message": "The condition specified using HTTP conditional header(s) is not met.",
    "status": 412
   }
  },
  "blob.errors": {
   "create_bad_name": {
    "code": "InvalidResourceName",
    "message": "The specified resource name contains invalid characters.",
    "status": 400
   },
   "create_existing_container": {
    "code": "ContainerAlreadyExists",
    "message": "The specified container already exists.",
    "status": 409
   },
   "get_missing_blob": {
    "code": "BlobNotFound",
    "message": "The specified blob does not exist.",
    "status": 404
   },
   "get_missing_container": {
    "code": "ContainerNotFound",
    "message": "The specified container does not exist.",
    "status": 404
   },
   "overwrite_false": {
    "code": "BlobAlreadyExists",
    "message": "The specified blob already exists.",
    "status": 409
   },
   "wrong_account_key": {
    "code": "AuthorizationFailure",
    "message": "Operation returned an invalid status 'Server failed to authenticate the request. Make sure the value of the Authorization header is formed correctly including the signature.'",
    "status": 403
   }
  },
  "blob.keys": {
   "container": "raw",
   "keys": [
    {
     "name": "README.txt",
     "size": 220
    },
    {
     "name": "_manifests/2026-03-14.json",
     "size": 540
    },
    {
     "name": "events/dt=2026-03-14/part-0000.json",
     "size": 720
    },
    {
     "name": "events/dt=2026-03-15/part-0000.json",
     "size": 720
    },
    {
     "name": "orders/dt=2026-03-14/_SUCCESS",
     "size": 600
    },
    {
     "name": "orders/dt=2026-03-14/orders-0001.json",
     "size": 760
    },
    {
     "name": "orders/dt=2026-03-14/orders-0002.json",
     "size": 760
    },
    {
     "name": "orders/dt=2026-03-15/orders-0001.json",
     "size": 760
    },
    {
     "name": "orders/dt=2026-03-15/orders-0002.json",
     "size": 760
    },
    {
     "name": "orders/dt=2026-03-16/orders-0001.json",
     "size": 760
    }
   ]
  },
  "blob.lease": {
   "delete_without_id": {
    "code": "LeaseIdMissing",
    "message": "There is currently a lease on the blob and no lease ID was specified in the request.",
    "status": 412
   },
   "second_acquire": {
    "code": "LeaseAlreadyPresent",
    "message": "There is already a lease present.",
    "status": 409
   },
   "steps": [
    {
     "duration": null,
     "state": "available",
     "status": "unlocked",
     "step": "before"
    },
    {
     "duration": "fixed",
     "state": "leased",
     "status": "locked",
     "step": "acquire 15 s"
    },
    {
     "duration": null,
     "state": "available",
     "status": "unlocked",
     "step": "release"
    }
   ],
   "write_with_id_worked": true,
   "write_without_id": {
    "code": "LeaseIdMissing",
    "message": "There is currently a lease on the blob and no lease ID was specified in the request.",
    "status": 412
   }
  },
  "blob.listing": [
   {
    "common_prefixes": [],
    "delimiter": "",
    "key_count": 10,
    "keys": [
     "README.txt",
     "_manifests/2026-03-14.json",
     "events/dt=2026-03-14/part-0000.json",
     "events/dt=2026-03-15/part-0000.json",
     "orders/dt=2026-03-14/_SUCCESS",
     "orders/dt=2026-03-14/orders-0001.json",
     "orders/dt=2026-03-14/orders-0002.json",
     "orders/dt=2026-03-15/orders-0001.json",
     "orders/dt=2026-03-15/orders-0002.json",
     "orders/dt=2026-03-16/orders-0001.json"
    ],
    "prefix": ""
   },
   {
    "common_prefixes": [
     "_manifests/",
     "events/",
     "orders/"
    ],
    "delimiter": "/",
    "key_count": 4,
    "keys": [
     "README.txt"
    ],
    "prefix": ""
   },
   {
    "common_prefixes": [],
    "delimiter": "",
    "key_count": 6,
    "keys": [
     "orders/dt=2026-03-14/_SUCCESS",
     "orders/dt=2026-03-14/orders-0001.json",
     "orders/dt=2026-03-14/orders-0002.json",
     "orders/dt=2026-03-15/orders-0001.json",
     "orders/dt=2026-03-15/orders-0002.json",
     "orders/dt=2026-03-16/orders-0001.json"
    ],
    "prefix": "orders/"
   },
   {
    "common_prefixes": [
     "orders/dt=2026-03-14/",
     "orders/dt=2026-03-15/",
     "orders/dt=2026-03-16/"
    ],
    "delimiter": "/",
    "key_count": 3,
    "keys": [],
    "prefix": "orders/"
   },
   {
    "common_prefixes": [],
    "delimiter": "",
    "key_count": 3,
    "keys": [
     "orders/dt=2026-03-14/_SUCCESS",
     "orders/dt=2026-03-14/orders-0001.json",
     "orders/dt=2026-03-14/orders-0002.json"
    ],
    "prefix": "orders/dt=2026-03-14/"
   },
   {
    "common_prefixes": [],
    "delimiter": "/",
    "key_count": 3,
    "keys": [
     "orders/dt=2026-03-14/_SUCCESS",
     "orders/dt=2026-03-14/orders-0001.json",
     "orders/dt=2026-03-14/orders-0002.json"
    ],
    "prefix": "orders/dt=2026-03-14/"
   },
   {
    "common_prefixes": [],
    "delimiter": "",
    "key_count": 6,
    "keys": [
     "orders/dt=2026-03-14/_SUCCESS",
     "orders/dt=2026-03-14/orders-0001.json",
     "orders/dt=2026-03-14/orders-0002.json",
     "orders/dt=2026-03-15/orders-0001.json",
     "orders/dt=2026-03-15/orders-0002.json",
     "orders/dt=2026-03-16/orders-0001.json"
    ],
    "prefix": "ord"
   },
   {
    "common_prefixes": [
     "orders/"
    ],
    "delimiter": "/",
    "key_count": 1,
    "keys": [],
    "prefix": "ord"
   },
   {
    "common_prefixes": [],
    "delimiter": "",
    "key_count": 2,
    "keys": [
     "events/dt=2026-03-14/part-0000.json",
     "events/dt=2026-03-15/part-0000.json"
    ],
    "prefix": "events/"
   },
   {
    "common_prefixes": [
     "events/dt=2026-03-14/",
     "events/dt=2026-03-15/"
    ],
    "delimiter": "/",
    "key_count": 2,
    "keys": [],
    "prefix": "events/"
   },
   {
    "common_prefixes": [],
    "delimiter": "",
    "key_count": 6,
    "keys": [
     "orders/dt=2026-03-14/_SUCCESS",
     "orders/dt=2026-03-14/orders-0001.json",
     "orders/dt=2026-03-14/orders-0002.json",
     "orders/dt=2026-03-15/orders-0001.json",
     "orders/dt=2026-03-15/orders-0002.json",
     "orders/dt=2026-03-16/orders-0001.json"
    ],
    "prefix": "orders/dt=2026-03-1"
   },
   {
    "common_prefixes": [
     "orders/dt=2026-03-14/",
     "orders/dt=2026-03-15/",
     "orders/dt=2026-03-16/"
    ],
    "delimiter": "/",
    "key_count": 3,
    "keys": [],
    "prefix": "orders/dt=2026-03-1"
   }
  ],
  "blob.pages": {
   "pages": [
    {
     "has_continuation_token": true,
     "keys": [
      "README.txt",
      "_manifests/2026-03-14.json",
      "events/dt=2026-03-14/part-0000.json",
      "events/dt=2026-03-15/part-0000.json"
     ]
    },
    {
     "has_continuation_token": true,
     "keys": [
      "orders/dt=2026-03-14/_SUCCESS",
      "orders/dt=2026-03-14/orders-0001.json",
      "orders/dt=2026-03-14/orders-0002.json",
      "orders/dt=2026-03-15/orders-0001.json"
     ]
    },
    {
     "has_continuation_token": false,
     "keys": [
      "orders/dt=2026-03-15/orders-0002.json",
      "orders/dt=2026-03-16/orders-0001.json"
     ]
    }
   ],
   "results_per_page": 4
  },
  "blob.tags_snapshots": {
   "delete_with_snapshot": {
    "code": "SnapshotsPresent",
    "message": "This operation is not permitted while the blob has snapshots.",
    "status": 409
   },
   "find_blobs_by_tags": [
    "tags/orders.json"
   ],
   "snapshot_listed": [
    [
     "tags/orders.json",
     false
    ],
    [
     "tags/orders.json",
     true
    ]
   ],
   "snapshot_taken": true,
   "tags": {
    "pii": "no",
    "zone": "raw"
   }
  },
  "blob.tier": {
   "archive": {
    "inferred": false,
    "tier": "Archive"
   },
   "cool": {
    "inferred": false,
    "tier": "Cool"
   },
   "default": {
    "inferred": true,
    "tier": "Hot"
   },
   "read_archived": {
    "code": "BlobArchived",
    "message": "This operation is not permitted on an archived blob.",
    "status": 409
   }
  },
  "blob.types": {
   "append_blob_size": 29,
   "append_blob_type": "BlobType.APPENDBLOB",
   "append_blocks": 3,
   "block_blob_type": "BlobType.BLOCKBLOB",
   "copied_size_equals_source": true,
   "copy_has_id": true,
   "copy_status": "success",
   "copy_status_after": "success"
  },
  "dedicated.distribution": {
   "by_column": {
    "channel": {
     "avg": 10000.0,
     "buckets": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      239919,
      0,
      0,
      0,
      0,
      0,
      269911,
      0,
      0,
      0,
      0,
      0,
      0,
      90170,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
     ],
     "busiest_value_rows": 269911,
     "distinct": 3,
     "empty": 57,
     "max": 269911,
     "min": 0,
     "skew": 26.99
    },
    "customer_id": {
     "avg": 10000.0,
     "buckets": [
      10396,
      8207,
      10815,
      8981,
      12402,
      10676,
      10914,
      10872,
      7610,
      9904,
      8471,
      11274,
      8810,
      8721,
      11911,
      10272,
      9661,
      11856,
      18618,
      10096,
      10845,
      10362,
      10660,
      10156,
      8151,
      11516,
      11202,
      10264,
      10433,
      11814,
      9523,
      8520,
      8776,
      8546,
      9517,
      9215,
      10244,
      9669,
      9583,
      11038,
      9487,
      9664,
      8377,
      8922,
      12298,
      8983,
      9118,
      8935,
      8680,
      9081,
      8295,
      9650,
      9587,
      9514,
      9700,
      9223,
      10039,
      11108,
      7508,
      11330
     ],
     "busiest_value_rows": 8526,
     "distinct": 12000,
     "empty": 0,
     "max": 18618,
     "min": 7508,
     "skew": 1.86
    },
    "order_date": {
     "avg": 10000.0,
     "buckets": [
      20012,
      20093,
      9873,
      0,
      0,
      10119,
      0,
      10005,
      10057,
      0,
      0,
      40164,
      20057,
      0,
      0,
      9984,
      19911,
      9964,
      0,
      10224,
      9931,
      0,
      0,
      10052,
      0,
      9919,
      0,
      29920,
      9874,
      10114,
      0,
      9998,
      9957,
      9712,
      10022,
      19916,
      9891,
      9946,
      10042,
      10152,
      20192,
      0,
      9889,
      0,
      9876,
      0,
      20199,
      10048,
      0,
      0,
      10045,
      10064,
      29994,
      30118,
      0,
      20307,
      19875,
      9875,
      19631,
      9978
     ],
     "busiest_value_rows": 10224,
     "distinct": 60,
     "empty": 19,
     "max": 40164,
     "min": 0,
     "skew": 4.02
    },
    "order_id": {
     "avg": 10000.0,
     "buckets": [
      10079,
      9959,
      9894,
      9903,
      9975,
      10065,
      9897,
      10022,
      9868,
      9955,
      10082,
      9968,
      10049,
      9971,
      10053,
      9887,
      9993,
      9980,
      9764,
      9939,
      10152,
      9996,
      10063,
      9941,
      10045,
      9900,
      9843,
      9897,
      10129,
      9998,
      10014,
      10057,
      9942,
      10095,
      10104,
      10126,
      9978,
      10150,
      9813,
      9961,
      10156,
      9984,
      10088,
      10003,
      9970,
      9960,
      9978,
      10027,
      10051,
      10013,
      9853,
      10172,
      9961,
      9964,
      10168,
      10088,
      10033,
      10113,
      9948,
      9963
     ],
     "busiest_value_rows": 1,
     "distinct": 600000,
     "empty": 0,
     "max": 10172,
     "min": 9764,
     "skew": 1.02
    },
    "product_id": {
     "avg": 10000.0,
     "buckets": [
      0,
      0,
      0,
      15153,
      14836,
      14960,
      0,
      15077,
      15039,
      0,
      29982,
      14973,
      15129,
      0,
      15015,
      15357,
      15115,
      0,
      0,
      14958,
      30015,
      0,
      14965,
      15062,
      14940,
      0,
      0,
      15044,
      44931,
      0,
      0,
      0,
      0,
      15068,
      0,
      15082,
      0,
      0,
      14928,
      0,
      0,
      0,
      29834,
      0,
      14902,
      30148,
      29929,
      14872,
      14852,
      0,
      0,
      0,
      15150,
      14952,
      14975,
      44757,
      0,
      0,
      0,
      0
     ],
     "busiest_value_rows": 15357,
     "distinct": 40,
     "empty": 29,
     "max": 44931,
     "min": 0,
     "skew": 4.49
    },
    "status": {
     "avg": 10000.0,
     "buckets": [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      528355,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      35949,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      23692,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      12004,
      0
     ],
     "busiest_value_rows": 528355,
     "distinct": 4,
     "empty": 56,
     "max": 528355,
     "min": 0,
     "skew": 52.84
    },
    "store_id": {
     "avg": 10000.0,
     "buckets": [
      0,
      0,
      49524,
      0,
      0,
      0,
      50175,
      50163,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      99938,
      50091,
      0,
      0,
      50238,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      49783,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      49891,
      50271,
      0,
      0,
      0,
      0,
      50049,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      49877
     ],
     "busiest_value_rows": 50271,
     "distinct": 12,
     "empty": 49,
     "max": 99938,
     "min": 0,
     "skew": 9.99
    }
   },
   "customers": 12000,
   "distributions": 60,
   "rows": 600000,
   "stand_in_hash": "MD5 of the value as text, as an integer, modulo 60. Synapse does not publish its hash function.",
   "top_customers": [
    {
     "id": "C-00001",
     "orders": 8526
    },
    {
     "id": "C-00002",
     "orders": 3108
    },
    {
     "id": "C-00003",
     "orders": 2296
    }
   ]
  },
  "delta.commit0": {
   "actions": [
    "commitInfo",
    "metaData",
    "protocol",
    "add"
   ]
  },
  "delta.commit1": {
   "actions": [
    "commitInfo",
    "add",
    "add",
    "add",
    "add",
    "remove"
   ]
  },
  "delta.optimize": {
   "added": 1,
   "files_after": 1,
   "files_before": 20,
   "parquet_files_on_disk_after": 21,
   "removed": 20,
   "rows": 2000
  },
  "delta.schema": {
   "after": [
    "order_id",
    "status",
    "total_eur",
    "placed_at",
    "order_date",
    "country",
    "source_file",
    "channel"
   ],
   "before": [
    "order_id",
    "status",
    "total_eur",
    "placed_at",
    "order_date",
    "country",
    "source_file"
   ],
   "error_class": "_LEGACY_ERROR_TEMP_DELTA_0007"
  },
  "delta.time_travel": {
   "o3_v0": "COMPLETED",
   "o3_v1": "CANCELLED",
   "v0_rows": 5,
   "v1_rows": 6
  },
  "delta.vacuum": {
   "default_retention_hours": 168,
   "dry_run_files": 20
  },
  "emulator.gaps": {
   "not_probed": [
    "versioning",
    "lifecycle management rules",
    "ADLS Gen2 hierarchical namespace and the dfs endpoint",
    "user delegation SAS (needs Microsoft Entra ID)",
    "object replication",
    "change feed"
   ],
   "probes": [
    {
     "feature": "soft delete",
     "kept_after_delete": [],
     "undelete": {
      "code": "APINotImplemented",
      "message": "Current API is not implemented yet. Please vote your wanted features to https://github.com/azure/azurite/issues",
      "status": 501
     }
    }
   ]
  },
  "eventgrid.parse": {
   "api": "PutBlob",
   "cloud_event": {
    "has_subject": true,
    "source_ends_with": "stbrewlinelakeprod",
    "type": "Microsoft.Storage.BlobCreated"
   },
   "content_length": 524288,
   "data_keys": [
    "api",
    "clientRequestId",
    "requestId",
    "eTag",
    "contentType",
    "contentLength",
    "blobType",
    "url",
    "sequencer",
    "storageDiagnostics"
   ],
   "data_version": "",
   "event_type": "Microsoft.Storage.BlobCreated",
   "metadata_version": "1",
   "storage_event_types": [
    "Microsoft.Storage.AsyncOperationInitiated",
    "Microsoft.Storage.BlobCreated",
    "Microsoft.Storage.BlobDeleted",
    "Microsoft.Storage.BlobInventoryPolicyCompleted",
    "Microsoft.Storage.BlobRenamed",
    "Microsoft.Storage.BlobTierChanged",
    "Microsoft.Storage.DirectoryCreated",
    "Microsoft.Storage.DirectoryDeleted",
    "Microsoft.Storage.DirectoryRenamed",
    "Microsoft.Storage.LifecyclePolicyCompleted",
    "Microsoft.Storage.StorageTaskAssignmentCompleted",
    "Microsoft.Storage.StorageTaskAssignmentQueued",
    "Microsoft.Storage.StorageTaskCompleted",
    "Microsoft.Storage.StorageTaskQueued"
   ],
   "subject": "/blobServices/default/containers/raw/blobs/orders/dt=2026-03-14/orders-0001.json",
   "subject_has_container_and_blob": true,
   "topic_ends_with": "stbrewlinelakeprod"
  },
  "eventhubs.batch": {
   "class": "azure.eventhub.EventDataBatch",
   "limits": [
    262144,
    1048576
   ],
   "no_connection_needed": true,
   "partition_key_travels_as": {
    "x-opt-partition-key": "C-0001"
   },
   "rows": [
    {
     "batch_bytes": 262130,
     "error": "EventDataBatch has reached its size limit: 262144",
     "events_in_batch": 2383,
     "events_with_key": 1669,
     "limit_bytes": 262144,
     "overhead_each_later_event_bytes": 10.0,
     "overhead_first_event_bytes": 10,
     "payload_bytes": 100
    },
    {
     "batch_bytes": 262128,
     "error": "EventDataBatch has reached its size limit: 262144",
     "events_in_batch": 258,
     "events_with_key": 246,
     "limit_bytes": 262144,
     "overhead_each_later_event_bytes": 16.0,
     "overhead_first_event_bytes": 16,
     "payload_bytes": 1000
    },
    {
     "batch_bytes": 260416,
     "error": "EventDataBatch has reached its size limit: 262144",
     "events_in_batch": 26,
     "events_with_key": 26,
     "limit_bytes": 262144,
     "overhead_each_later_event_bytes": 16.0,
     "overhead_first_event_bytes": 16,
     "payload_bytes": 10000
    },
    {
     "batch_bytes": 200032,
     "error": "EventDataBatch has reached its size limit: 262144",
     "events_in_batch": 2,
     "events_with_key": 2,
     "limit_bytes": 262144,
     "overhead_each_later_event_bytes": 16.0,
     "overhead_first_event_bytes": 16,
     "payload_bytes": 100000
    },
    {
     "batch_bytes": 240016,
     "error": "EventDataBatch has reached its size limit: 262144",
     "events_in_batch": 1,
     "events_with_key": 1,
     "limit_bytes": 262144,
     "overhead_each_later_event_bytes": null,
     "overhead_first_event_bytes": 16,
     "payload_bytes": 240000
    },
    {
     "batch_bytes": 0,
     "error": "EventDataBatch has reached its size limit: 262144",
     "events_in_batch": 0,
     "events_with_key": 0,
     "limit_bytes": 262144,
     "overhead_each_later_event_bytes": null,
     "overhead_first_event_bytes": null,
     "payload_bytes": 300000
    },
    {
     "batch_bytes": 1048520,
     "error": "EventDataBatch has reached its size limit: 1048576",
     "events_in_batch": 9532,
     "events_with_key": 6678,
     "limit_bytes": 1048576,
     "overhead_each_later_event_bytes": 10.0,
     "overhead_first_event_bytes": 10,
     "payload_bytes": 100
    },
    {
     "batch_bytes": 1048512,
     "error": "EventDataBatch has reached its size limit: 1048576",
     "events_in_batch": 1032,
     "events_with_key": 986,
     "limit_bytes": 1048576,
     "overhead_each_later_event_bytes": 16.0,
     "overhead_first_event_bytes": 16,
     "payload_bytes": 1000
    },
    {
     "batch_bytes": 1041664,
     "error": "EventDataBatch has reached its size limit: 1048576",
     "events_in_batch": 104,
     "events_with_key": 104,
     "limit_bytes": 1048576,
     "overhead_each_later_event_bytes": 16.0,
     "overhead_first_event_bytes": 16,
     "payload_bytes": 10000
    },
    {
     "batch_bytes": 1000160,
     "error": "EventDataBatch has reached its size limit: 1048576",
     "events_in_batch": 10,
     "events_with_key": 10,
     "limit_bytes": 1048576,
     "overhead_each_later_event_bytes": 16.0,
     "overhead_first_event_bytes": 16,
     "payload_bytes": 100000
    },
    {
     "batch_bytes": 960064,
     "error": "EventDataBatch has reached its size limit: 1048576",
     "events_in_batch": 4,
     "events_with_key": 4,
     "limit_bytes": 1048576,
     "overhead_each_later_event_bytes": 16.0,
     "overhead_first_event_bytes": 16,
     "payload_bytes": 240000
    },
    {
     "batch_bytes": 900048,
     "error": "EventDataBatch has reached its size limit: 1048576",
     "events_in_batch": 3,
     "events_with_key": 3,
     "limit_bytes": 1048576,
     "overhead_each_later_event_bytes": 16.0,
     "overhead_first_event_bytes": 16,
     "payload_bytes": 300000
    }
   ],
   "with_partition_key_events": 6678,
   "without_partition_key_events": 9532
  },
  "eventhubs.checkpoints": {
   "blobs": [
    {
     "metadata": {
      "offset": "8192",
      "sequencenumber": "83"
     },
     "name": "<namespace>/orders/$default/checkpoint/0"
    },
    {
     "metadata": {
      "ownerid": "worker-A"
     },
     "name": "<namespace>/orders/$default/ownership/0"
    },
    {
     "metadata": {
      "ownerid": "worker-B"
     },
     "name": "<namespace>/orders/$default/ownership/1"
    },
    {
     "metadata": {
      "ownerid": "worker-A"
     },
     "name": "<namespace>/orders/$default/ownership/2"
    },
    {
     "metadata": {
      "ownerid": "worker-A"
     },
     "name": "<namespace>/orders/$default/ownership/3"
    }
   ],
   "checkpoints": [
    {
     "offset": "8192",
     "partition_id": "0",
     "sequence_number": 83
    }
   ],
   "claimed_by_worker_a": [
    "0",
    "1",
    "2",
    "3"
   ],
   "container": "checkpoints",
   "etag_is_opaque": true,
   "right_etag_claim_returned": [
    [
     "1",
     "worker-B"
    ]
   ],
   "stale_etag_claim_returned": [],
   "store": "BlobCheckpointStore"
  },
  "functions.run": {
   "first": {
    "blob": "orders/dt=2026-03-14/orders-0001.json",
    "orders": 3,
    "revenue_eur": 19.5,
    "status": "written"
   },
   "second": {
    "blob": "orders/dt=2026-03-14/orders-0001.json",
    "orders": 3,
    "revenue_eur": 19.5,
    "status": "already done"
   },
   "split_subject": {
    "blob": "orders/dt=2026-03-14/orders-0001.json",
    "container": "rawrun"
   },
   "summary_blob": "order_summaries/orders_dt=2026-03-14_orders-0001.json.json"
  },
  "identity.chain": {
   "all_failed_without_a_login": true,
   "each_failure_first_words": {
    "AzureCliCredential": "Azure CLI not found on path",
    "AzureDeveloperCliCredential": "Azure Developer CLI could not be found. Please visit https://aka.ms/azure-dev for installa",
    "AzurePowerShellCredential": "PowerShell is not installed",
    "BrokerCredential": "InteractiveBrowserBrokerCredential unavailable. The 'azure-identity-broker' package is req",
    "EnvironmentCredential": "EnvironmentCredential authentication unavailable. Environment variables are not fully conf",
    "ManagedIdentityCredential": "ManagedIdentityCredential authentication unavailable.",
    "SharedTokenCacheCredential": "SharedTokenCacheCredential authentication unavailable. No accounts were found in the cache",
    "VisualStudioCodeCredential": "VisualStudioCodeCredential requires the 'azure-identity-broker' package to be installed. Y",
    "WorkloadIdentityCredential": "WorkloadIdentityCredential authentication unavailable. The workload options are not fully "
   },
   "order": [
    "EnvironmentCredential",
    "WorkloadIdentityCredential",
    "ManagedIdentityCredential",
    "SharedTokenCacheCredential",
    "VisualStudioCodeCredential",
    "AzureCliCredential",
    "AzurePowerShellCredential",
    "AzureDeveloperCliCredential",
    "BrokerCredential"
   ]
  },
  "identity.managed_identity_requests": {
   "cases": [
    {
     "case": "a function app or an App Service app (system-assigned)",
     "ok": true,
     "requests": [
      {
       "headers": {
        "Metadata": "true",
        "X-IDENTITY-HEADER": "<secret>"
       },
       "method": "GET",
       "path": "/msi/token",
       "query": {
        "api-version": "2019-08-01",
        "resource": "https://storage.azure.com"
       }
      }
     ]
    },
    {
     "case": "a function app with a user-assigned identity",
     "ok": true,
     "requests": [
      {
       "headers": {
        "Metadata": "true",
        "X-IDENTITY-HEADER": "<secret>"
       },
       "method": "GET",
       "path": "/msi/token",
       "query": {
        "api-version": "2019-08-01",
        "client_id": "22222222-3333-4444-5555-666666666666",
        "resource": "https://storage.azure.com"
       }
      }
     ]
    },
    {
     "case": "a virtual machine (the instance metadata service)",
     "ok": true,
     "requests": [
      {
       "headers": {
        "Metadata": "true"
       },
       "method": "GET",
       "path": "/metadata/identity/oauth2/token",
       "query": {
        "api-version": "2018-02-01",
        "resource": "https://storage.azure.com"
       }
      }
     ]
    }
   ]
  },
  "identity.token_claims": {
   "claims": {
    "aud": "https://storage.azure.com",
    "exp": 1773561600,
    "iat": 1773475200,
    "idtyp": "app",
    "iss": "https://sts.windows.net/11111111-2222-3333-4444-555555555555/",
    "nbf": 1773475200,
    "oid": "99999999-8888-7777-6666-555555555555",
    "sub": "99999999-8888-7777-6666-555555555555",
    "tid": "11111111-2222-3333-4444-555555555555",
    "ver": "1.0",
    "xms_mirid": "/subscriptions/00000000-0000-0000-0000-000000000000/resourcegroups/rg-brewline-data-prod/providers/Microsoft.ManagedIdentity/userAssignedIdentities/id-brewline-adf"
   },
   "made_up": true,
   "order": [
    "aud",
    "iss",
    "iat",
    "nbf",
    "exp",
    "idtyp",
    "oid",
    "sub",
    "tid",
    "ver",
    "xms_mirid"
   ]
  },
  "kql.parse": {
   "broken": {
    "errors": [
     "Expected: )"
    ],
    "valid": false
   },
   "checks": "syntax only, with the Kusto language service of Microsoft (no table schemas)",
   "good": {
    "errors": [],
    "valid": true
   }
  },
  "queue.delete": {
   "received_again_after_timeout": false
  },
  "queue.errors": {
   "dequeue_counts_seen": [
    1,
    2
   ],
   "message_limit_chars_sent": 70000,
   "missing_queue": {
    "code": "QueueNotFound",
    "message": "The specified queue does not exist.",
    "status": 404
   },
   "same_id_on_redelivery": true,
   "stale_pop_receipt": {
    "code": "PopReceiptMismatch",
    "message": "The specified pop receipt did not match the pop receipt for a dequeued message.",
    "status": 400
   },
   "too_large": {
    "code": "RequestBodyTooLarge",
    "message": "The request body is too large and exceeds the maximum permissible limit.",
    "status": 413
   }
  },
  "queue.redrive": {
   "main_queue_after": 0,
   "max_dequeue_count": 3,
   "poison_body": "order-7001",
   "poison_queue_after": 1,
   "timeline": [
    {
     "action": "crashed before delete_message",
     "dequeue_count": 1,
     "received": true,
     "second_reader_got_it": false,
     "t": 0.0
    },
    {
     "action": "crashed before delete_message",
     "dequeue_count": 2,
     "received": true,
     "second_reader_got_it": false,
     "t": 1.25
    },
    {
     "action": "crashed before delete_message",
     "dequeue_count": 3,
     "received": true,
     "second_reader_got_it": false,
     "t": 2.5
    },
    {
     "action": "moved to the poison queue and deleted",
     "dequeue_count": 4,
     "received": true,
     "second_reader_got_it": false,
     "t": 3.75
    }
   ],
   "visibility_timeout_seconds": 1
  },
  "sas.account_fields": {
   "fields": {
    "se": "2026-03-14T08:55:00Z",
    "sp": "rl",
    "srt": "sco",
    "ss": "b",
    "sv": "2026-10-06"
   }
  },
  "sas.fields": {
   "fields": {
    "se": "2026-03-14T08:55:00Z",
    "sig": "Zf4B4iiVtwmLngqUx4nOCCCcIVLzbj0zkZzJpiTFCO8=",
    "sp": "r",
    "spr": "https",
    "sr": "b",
    "st": "2026-03-14T07:55:00Z",
    "sv": "2026-10-06"
   },
   "order": [
    "st",
    "se",
    "sp",
    "spr",
    "sv",
    "sr",
    "sig"
   ],
   "signature_covers": "the permissions, the start and expiry times, the resource, the protocol and the version, all as signed text"
  },
  "sas.matrix": {
   "cases": [
    {
     "fields": {
      "se": "2099-01-01T00:00:00Z",
      "sp": "r",
      "sr": "b",
      "sv": "2026-10-06"
     },
     "results": [
      {
       "code": null,
       "op": "GET the blob",
       "status": 200
      },
      {
       "code": "AuthorizationPermissionMismatch",
       "op": "PUT the blob",
       "status": 403
      },
      {
       "code": "AuthorizationPermissionMismatch",
       "op": "DELETE the blob",
       "status": 403
      },
      {
       "code": "AuthorizationFailure",
       "op": "GET the other blob",
       "status": 403
      },
      {
       "code": "AuthorizationFailure",
       "op": "LIST the container",
       "status": 403
      }
     ],
     "sas": "read this blob"
    },
    {
     "fields": {
      "se": "2099-01-01T00:00:00Z",
      "sp": "rw",
      "sr": "b",
      "sv": "2026-10-06"
     },
     "results": [
      {
       "code": null,
       "op": "GET the blob",
       "status": 200
      },
      {
       "code": null,
       "op": "PUT the blob",
       "status": 201
      },
      {
       "code": "AuthorizationPermissionMismatch",
       "op": "DELETE the blob",
       "status": 403
      },
      {
       "code": "AuthorizationFailure",
       "op": "GET the other blob",
       "status": 403
      },
      {
       "code": "AuthorizationFailure",
       "op": "LIST the container",
       "status": 403
      }
     ],
     "sas": "read and write this blob"
    },
    {
     "fields": {
      "se": "2099-01-01T00:00:00Z",
      "sp": "rl",
      "sr": "c",
      "sv": "2026-10-06"
     },
     "results": [
      {
       "code": null,
       "op": "GET the blob",
       "status": 200
      },
      {
       "code": "AuthorizationPermissionMismatch",
       "op": "PUT the blob",
       "status": 403
      },
      {
       "code": "AuthorizationPermissionMismatch",
       "op": "DELETE the blob",
       "status": 403
      },
      {
       "code": null,
       "op": "GET the other blob",
       "status": 200
      },
      {
       "code": null,
       "op": "LIST the container",
       "status": 200
      }
     ],
     "sas": "read the container"
    },
    {
     "fields": {
      "se": "2020-01-01T00:00:00Z",
      "sp": "r",
      "sr": "b",
      "sv": "2026-10-06"
     },
     "results": [
      {
       "code": "AuthorizationFailure",
       "op": "GET the blob",
       "status": 403
      },
      {
       "code": "AuthorizationFailure",
       "op": "PUT the blob",
       "status": 403
      },
      {
       "code": "AuthorizationFailure",
       "op": "DELETE the blob",
       "status": 403
      },
      {
       "code": "AuthorizationFailure",
       "op": "GET the other blob",
       "status": 403
      },
      {
       "code": "AuthorizationFailure",
       "op": "LIST the container",
       "status": 403
      }
     ],
     "sas": "read, but expired"
    },
    {
     "fields": {
      "se": "2099-01-01T00:00:00Z",
      "sp": "rw",
      "sr": "b",
      "sv": "2026-10-06"
     },
     "results": [
      {
       "code": "AuthorizationFailure",
       "op": "GET the blob",
       "status": 403
      },
      {
       "code": "AuthorizationFailure",
       "op": "PUT the blob",
       "status": 403
      },
      {
       "code": "AuthorizationFailure",
       "op": "DELETE the blob",
       "status": 403
      },
      {
       "code": "AuthorizationFailure",
       "op": "GET the other blob",
       "status": 403
      },
      {
       "code": "AuthorizationFailure",
       "op": "LIST the container",
       "status": 403
      }
     ],
     "sas": "read, edited to write"
    }
   ],
   "ops": [
    "GET the blob",
    "PUT the blob",
    "DELETE the blob",
    "GET the other blob",
    "LIST the container"
   ]
  },
  "spark.ansi": {
   "cast_with_ansi_off": [
    "10.50",
    "NULL"
   ],
   "default_in_this_version": "true",
   "try_cast": [
    "10.50",
    "NULL"
   ]
  },
  "spark.join": {
   "broadcast_default_bytes": 10485760
  },
  "spark.layers": {
   "bronze_files": 2,
   "bronze_rows": 7,
   "gold_rows": 4,
   "quarantine_rows": 1,
   "silver_rows": 5
  },
  "spark.ops": {
   "detail": "DESCRIBE DETAIL delta.`{path}`",
   "history": "DESCRIBE HISTORY delta.`{path}`",
   "optimize": "OPTIMIZE delta.`{path}`",
   "vacuum_dry": "VACUUM delta.`{path}` RETAIN 0 HOURS DRY RUN",
   "vacuum_short": "VACUUM delta.`{path}` RETAIN 0 HOURS"
  },
  "spark.prune": {
   "partitions_in_table": 3,
   "scan_with_filter": [
    {
     "numFiles": 2,
     "numOutputRows": 2,
     "numPartitions": 1
    }
   ],
   "scan_without_filter": [
    {
     "numFiles": 5,
     "numOutputRows": 7,
     "numPartitions": 3
    }
   ]
  },
  "synapse.columns": {
   "bytes_by_column": {
    "channel": 153138,
    "customer_id": 1396230,
    "order_date": 737,
    "order_id": 2540035,
    "order_ts": 3963520,
    "product_id": 453705,
    "qty": 152798,
    "status": 105946,
    "store_id": 302999,
    "total_eur": 606091,
    "unit_price_eur": 453837
   },
   "file": "orders_one/orders.parquet",
   "row_groups": 6
  },
  "synapse.layouts": {
   "avg_day_file_bytes": 193659,
   "days": 60,
   "first_day": "2026-01-14",
   "flat": {
    "bytes": 11619556,
    "example": "orders_flat/orders_2026-03-14.parquet",
    "files": 60
   },
   "hive": {
    "bytes": 11619556,
    "example": "orders_hive/year=2026/month=03/day=14/part-0.parquet",
    "files": 60
   },
   "last_day": "2026-03-14",
   "one": {
    "bytes": 10238879,
    "example": "orders_one/orders.parquet",
    "files": 1,
    "row_groups": 6
   },
   "rows": 600000,
   "rows_in_busiest_day": 10224,
   "rows_in_quietest_day": 9712
  },
  "synapse.prune": {
   "cases": [
    {
     "bytes_of_files": 11619556,
     "bytes_of_two_columns": 648701,
     "filepath_values": {
      "1": [
       "2026"
      ],
      "2": [
       "01",
       "02",
       "03"
      ],
      "3": [
       "01",
       "02",
       "03",
       "04",
       "05",
       "06",
       "07",
       "08",
       "09",
       "10",
       "11",
       "12",
       "13",
       "14",
       "15",
       "16",
       "17",
       "18",
       "19",
       "20",
       "21",
       "22",
       "23",
       "24",
       "25",
       "26",
       "27",
       "28",
       "29",
       "30",
       "31"
      ],
      "4": [
       "part-0"
      ]
     },
     "files": 60,
     "filter": null,
     "first_files": [
      "orders_hive/year=2026/month=01/day=14/part-0.parquet",
      "orders_hive/year=2026/month=01/day=15/part-0.parquet"
     ],
     "id": "p1",
     "label": "all the day folders, no filter",
     "pattern": "orders_hive/year=*/month=*/day=*/*.parquet",
     "rows": 600000,
     "wildcards": 4
    },
    {
     "bytes_of_files": 2702427,
     "bytes_of_two_columns": 150826,
     "filepath_values": {
      "1": [
       "2026"
      ],
      "2": [
       "03"
      ],
      "3": [
       "01",
       "02",
       "03",
       "04",
       "05",
       "06",
       "07",
       "08",
       "09",
       "10",
       "11",
       "12",
       "13",
       "14"
      ],
      "4": [
       "part-0"
      ]
     },
     "files": 14,
     "filter": {
      "function": "filepath",
      "n": 2,
      "value": "03"
     },
     "first_files": [
      "orders_hive/year=2026/month=03/day=01/part-0.parquet",
      "orders_hive/year=2026/month=03/day=02/part-0.parquet"
     ],
     "id": "p2",
     "label": "all the day folders, WHERE r.filepath(2) = '03'",
     "pattern": "orders_hive/year=*/month=*/day=*/*.parquet",
     "rows": 139566,
     "wildcards": 4
    },
    {
     "bytes_of_files": 2702427,
     "bytes_of_two_columns": 150826,
     "filepath_values": {
      "1": [
       "01",
       "02",
       "03",
       "04",
       "05",
       "06",
       "07",
       "08",
       "09",
       "10",
       "11",
       "12",
       "13",
       "14"
      ],
      "2": [
       "part-0"
      ]
     },
     "files": 14,
     "filter": null,
     "first_files": [
      "orders_hive/year=2026/month=03/day=01/part-0.parquet",
      "orders_hive/year=2026/month=03/day=02/part-0.parquet"
     ],
     "id": "p3",
     "label": "the folder of March, in the path",
     "pattern": "orders_hive/year=2026/month=03/day=*/*.parquet",
     "rows": 139566,
     "wildcards": 2
    },
    {
     "bytes_of_files": 583852,
     "bytes_of_two_columns": 32836,
     "filepath_values": {
      "1": [
       "2026"
      ],
      "2": [
       "01",
       "02",
       "03"
      ],
      "3": [
       "part-0"
      ]
     },
     "files": 3,
     "filter": null,
     "first_files": [
      "orders_hive/year=2026/month=01/day=14/part-0.parquet",
      "orders_hive/year=2026/month=02/day=14/part-0.parquet"
     ],
     "id": "p4",
     "label": "the 14th of every month",
     "pattern": "orders_hive/year=*/month=*/day=14/*.parquet",
     "rows": 30084,
     "wildcards": 3
    },
    {
     "bytes_of_files": 194275,
     "bytes_of_two_columns": 10946,
     "filepath_values": {
      "1": [
       "part-0"
      ]
     },
     "files": 1,
     "filter": null,
     "first_files": [
      "orders_hive/year=2026/month=03/day=14/part-0.parquet"
     ],
     "id": "p5",
     "label": "one day, in the path",
     "pattern": "orders_hive/year=2026/month=03/day=14/*.parquet",
     "rows": 10014,
     "wildcards": 1
    },
    {
     "bytes_of_files": 2702427,
     "bytes_of_two_columns": 150826,
     "filepath_values": {
      "1": [
       "01",
       "02",
       "03",
       "04",
       "05",
       "06",
       "07",
       "08",
       "09",
       "10",
       "11",
       "12",
       "13",
       "14"
      ]
     },
     "files": 14,
     "filter": null,
     "first_files": [
      "orders_flat/orders_2026-03-01.parquet",
      "orders_flat/orders_2026-03-02.parquet"
     ],
     "id": "p6",
     "label": "one folder of daily files, March in the name",
     "pattern": "orders_flat/orders_2026-03-*.parquet",
     "rows": 139566,
     "wildcards": 1
    },
    {
     "bytes_of_files": 2702427,
     "bytes_of_two_columns": 150826,
     "filepath_values": {
      "1": [
       "orders_2026-03-01",
       "orders_2026-03-02",
       "orders_2026-03-03",
       "orders_2026-03-04",
       "orders_2026-03-05",
       "orders_2026-03-06",
       "orders_2026-03-07",
       "orders_2026-03-08",
       "orders_2026-03-09",
       "orders_2026-03-10",
       "orders_2026-03-11",
       "orders_2026-03-12",
       "orders_2026-03-13",
       "orders_2026-03-14"
      ]
     },
     "files": 14,
     "filter": {
      "function": "filename",
      "n": null,
      "value": "orders_2026-03-"
     },
     "first_files": [
      "orders_flat/orders_2026-03-01.parquet",
      "orders_flat/orders_2026-03-02.parquet"
     ],
     "id": "p7",
     "label": "one folder of daily files, WHERE r.filename() LIKE 'orders_2026-03-%'",
     "pattern": "orders_flat/*.parquet",
     "rows": 139566,
     "wildcards": 1
    },
    {
     "bytes_of_files": 10238879,
     "bytes_of_two_columns": 606828,
     "filepath_values": {},
     "files": 1,
     "filter": null,
     "first_files": [
      "orders_one/orders.parquet"
     ],
     "id": "p8",
     "label": "one sorted file with every day",
     "pattern": "orders_one/orders.parquet",
     "rows": 600000,
     "wildcards": 0
    }
   ]
  },
  "test.summary": {
   "bug": {
    "failed": 1,
    "passed": 2,
    "rc": 1
   },
   "failing": [
    "test_the_blob_name_keeps_its_folders"
   ],
   "good": {
    "failed": 0,
    "passed": 3,
    "rc": 0
   }
  }
 },
 "files": {
  "adf/pl_dependency_typo.json": "{\n  \"name\": \"pl_dependency_typo\",\n  \"properties\": {\n    \"description\": \"Copy the orders that changed since the last run from Azure SQL into the raw zone of the lake as Parquet, then move the watermark.\",\n    \"parameters\": {\n      \"run_date\": {\n        \"type\": \"String\",\n        \"defaultValue\": \"2026-03-14\"\n      }\n    },\n    \"activities\": [\n      {\n        \"name\": \"GetWatermark\",\n        \"type\": \"Lookup\",\n        \"typeProperties\": {\n          \"source\": {\n            \"type\": \"AzureSqlSource\",\n            \"sqlReaderQuery\": \"SELECT last_value FROM etl.watermark WHERE table_name = 'orders'\"\n          },\n          \"dataset\": {\n            \"referenceName\": \"ds_sql_meta\",\n            \"type\": \"DatasetReference\"\n          },\n          \"firstRowOnly\": true\n        },\n        \"policy\": {\n          \"timeout\": \"0.00:10:00\",\n          \"retry\": 1,\n          \"retryIntervalInSeconds\": 30\n        }\n      },\n      {\n        \"name\": \"CopyOrders\",\n        \"type\": \"Copy\",\n        \"dependsOn\": [\n          {\n            \"activity\": \"GetWatermark\",\n            \"dependencyConditions\": [\n              \"Succeeded\"\n            ]\n          }\n        ],\n        \"typeProperties\": {\n          \"source\": {\n            \"type\": \"AzureSqlSource\",\n            \"sqlReaderQuery\": {\n              \"value\": \"SELECT * FROM dbo.orders WHERE modified_at > '@{activity('GetWatermark').output.firstRow.last_value}' AND modified_at <= '@{pipeline().TriggerTime}'\",\n              \"type\": \"Expression\"\n            }\n          },\n          \"sink\": {\n            \"type\": \"ParquetSink\",\n            \"storeSettings\": {\n              \"type\": \"AzureBlobFSWriteSettings\"\n            }\n          },\n          \"dataIntegrationUnits\": 4\n        },\n        \"inputs\": [\n          {\n            \"referenceName\": \"ds_sql_orders\",\n            \"type\": \"DatasetReference\"\n          }\n        ],\n        \"outputs\": [\n          {\n            \"referenceName\": \"ds_lake_raw_orders\",\n            \"type\": \"DatasetReference\",\n            \"parameters\": {\n              \"run_date\": \"@pipeline().parameters.run_date\"\n            }\n          }\n        ],\n        \"policy\": {\n          \"timeout\": \"0.01:00:00\",\n          \"retry\": 2,\n          \"retryIntervalInSeconds\": 60\n        }\n      },\n      {\n        \"name\": \"AdvanceWatermark\",\n        \"type\": \"SqlServerStoredProcedure\",\n        \"dependsOn\": [\n          {\n            \"activity\": \"CopyOrder\",\n            \"dependencyConditions\": [\n              \"Success\"\n            ]\n          }\n        ],\n        \"typeProperties\": {\n          \"storedProcedureName\": \"etl.set_watermark\",\n          \"storedProcedureParameters\": {\n            \"table_name\": {\n              \"value\": \"orders\",\n              \"type\": \"String\"\n            },\n            \"new_value\": {\n              \"value\": {\n                \"value\": \"@pipeline().TriggerTime\",\n                \"type\": \"Expression\"\n              },\n              \"type\": \"DateTime\"\n            }\n          }\n        },\n        \"linkedServiceName\": {\n          \"referenceName\": \"ls_sql_meta\",\n          \"type\": \"LinkedServiceReference\"\n        }\n      }\n    ]\n  }\n}",
  "adf/pl_expression_brace.json": "{\n  \"name\": \"pl_expression_brace\",\n  \"properties\": {\n    \"description\": \"Copy the orders that changed since the last run from Azure SQL into the raw zone of the lake as Parquet, then move the watermark.\",\n    \"parameters\": {\n      \"run_date\": {\n        \"type\": \"String\",\n        \"defaultValue\": \"2026-03-14\"\n      }\n    },\n    \"activities\": [\n      {\n        \"name\": \"GetWatermark\",\n        \"type\": \"Lookup\",\n        \"typeProperties\": {\n          \"source\": {\n            \"type\": \"AzureSqlSource\",\n            \"sqlReaderQuery\": \"SELECT last_value FROM etl.watermark WHERE table_name = 'orders'\"\n          },\n          \"dataset\": {\n            \"referenceName\": \"ds_sql_meta\",\n            \"type\": \"DatasetReference\"\n          },\n          \"firstRowOnly\": true\n        },\n        \"policy\": {\n          \"timeout\": \"0.00:10:00\",\n          \"retry\": 1,\n          \"retryIntervalInSeconds\": 30\n        }\n      },\n      {\n        \"name\": \"CopyOrders\",\n        \"type\": \"Copy\",\n        \"dependsOn\": [\n          {\n            \"activity\": \"GetWatermark\",\n            \"dependencyConditions\": [\n              \"Succeeded\"\n            ]\n          }\n        ],\n        \"typeProperties\": {\n          \"source\": {\n            \"type\": \"AzureSqlSource\",\n            \"sqlReaderQuery\": {\n              \"value\": \"SELECT * FROM dbo.orders WHERE modified_at > '@{activity('GetWatermark').output.firstRow.last_value' AND modified_at <= '@{pipeline().TriggerTime}'\",\n              \"type\": \"Expression\"\n            }\n          },\n          \"sink\": {\n            \"type\": \"ParquetSink\",\n            \"storeSettings\": {\n              \"type\": \"AzureBlobFSWriteSettings\"\n            }\n          },\n          \"dataIntegrationUnits\": 4\n        },\n        \"inputs\": [\n          {\n            \"referenceName\": \"ds_sql_orders\",\n            \"type\": \"DatasetReference\"\n          }\n        ],\n        \"outputs\": [\n          {\n            \"referenceName\": \"ds_lake_raw_orders\",\n            \"type\": \"DatasetReference\",\n            \"parameters\": {\n              \"run_date\": \"@pipeline().parameters.run_date\"\n            }\n          }\n        ],\n        \"policy\": {\n          \"timeout\": \"0.01:00:00\",\n          \"retry\": 2,\n          \"retryIntervalInSeconds\": 60\n        }\n      },\n      {\n        \"name\": \"AdvanceWatermark\",\n        \"type\": \"SqlServerStoredProcedure\",\n        \"dependsOn\": [\n          {\n            \"activity\": \"CopyOrders\",\n            \"dependencyConditions\": [\n              \"Succeeded\"\n            ]\n          }\n        ],\n        \"typeProperties\": {\n          \"storedProcedureName\": \"etl.set_watermark\",\n          \"storedProcedureParameters\": {\n            \"table_name\": {\n              \"value\": \"orders\",\n              \"type\": \"String\"\n            },\n            \"new_value\": {\n              \"value\": {\n                \"value\": \"@pipeline().TriggerTime\",\n                \"type\": \"Expression\"\n              },\n              \"type\": \"DateTime\"\n            }\n          }\n        },\n        \"linkedServiceName\": {\n          \"referenceName\": \"ls_sql_meta\",\n          \"type\": \"LinkedServiceReference\"\n        }\n      }\n    ]\n  }\n}",
  "adf/pl_missing_sink.json": "{\n  \"name\": \"pl_missing_sink\",\n  \"properties\": {\n    \"description\": \"Copy the orders that changed since the last run from Azure SQL into the raw zone of the lake as Parquet, then move the watermark.\",\n    \"parameters\": {\n      \"run_date\": {\n        \"type\": \"String\",\n        \"defaultValue\": \"2026-03-14\"\n      }\n    },\n    \"activities\": [\n      {\n        \"name\": \"GetWatermark\",\n        \"type\": \"Lookup\",\n        \"typeProperties\": {\n          \"source\": {\n            \"type\": \"AzureSqlSource\",\n            \"sqlReaderQuery\": \"SELECT last_value FROM etl.watermark WHERE table_name = 'orders'\"\n          },\n          \"dataset\": {\n            \"referenceName\": \"ds_sql_meta\",\n            \"type\": \"DatasetReference\"\n          },\n          \"firstRowOnly\": true\n        },\n        \"policy\": {\n          \"timeout\": \"0.00:10:00\",\n          \"retry\": 1,\n          \"retryIntervalInSeconds\": 30\n        }\n      },\n      {\n        \"name\": \"CopyOrders\",\n        \"type\": \"Copy\",\n        \"dependsOn\": [\n          {\n            \"activity\": \"GetWatermark\",\n            \"dependencyConditions\": [\n              \"Succeeded\"\n            ]\n          }\n        ],\n        \"typeProperties\": {\n          \"source\": {\n            \"type\": \"AzureSqlSource\",\n            \"sqlReaderQuery\": {\n              \"value\": \"SELECT * FROM dbo.orders WHERE modified_at > '@{activity('GetWatermark').output.firstRow.last_value}' AND modified_at <= '@{pipeline().TriggerTime}'\",\n              \"type\": \"Expression\"\n            }\n          },\n          \"dataIntegrationUnits\": 4\n        },\n        \"inputs\": [\n          {\n            \"referenceName\": \"ds_sql_orders\",\n            \"type\": \"DatasetReference\"\n          }\n        ],\n        \"outputs\": [\n          {\n            \"referenceName\": \"ds_lake_raw_orders\",\n            \"type\": \"DatasetReference\",\n            \"parameters\": {\n              \"run_date\": \"@pipeline().parameters.run_date\"\n            }\n          }\n        ],\n        \"policy\": {\n          \"timeout\": \"0.01:00:00\",\n          \"retry\": 2,\n          \"retryIntervalInSeconds\": 60\n        }\n      },\n      {\n        \"name\": \"AdvanceWatermark\",\n        \"type\": \"SqlServerStoredProcedure\",\n        \"dependsOn\": [\n          {\n            \"activity\": \"CopyOrders\",\n            \"dependencyConditions\": [\n              \"Succeeded\"\n            ]\n          }\n        ],\n        \"typeProperties\": {\n          \"storedProcedureName\": \"etl.set_watermark\",\n          \"storedProcedureParameters\": {\n            \"table_name\": {\n              \"value\": \"orders\",\n              \"type\": \"String\"\n            },\n            \"new_value\": {\n              \"value\": {\n                \"value\": \"@pipeline().TriggerTime\",\n                \"type\": \"Expression\"\n              },\n              \"type\": \"DateTime\"\n            }\n          }\n        },\n        \"linkedServiceName\": {\n          \"referenceName\": \"ls_sql_meta\",\n          \"type\": \"LinkedServiceReference\"\n        }\n      }\n    ]\n  }\n}",
  "adf/pl_orders_daily.json": "{\n  \"name\": \"pl_orders_daily\",\n  \"properties\": {\n    \"description\": \"Copy the orders that changed since the last run from Azure SQL into the raw zone of the lake as Parquet, then move the watermark.\",\n    \"parameters\": {\n      \"run_date\": { \"type\": \"String\", \"defaultValue\": \"2026-03-14\" }\n    },\n    \"activities\": [\n      {\n        \"name\": \"GetWatermark\",\n        \"type\": \"Lookup\",\n        \"typeProperties\": {\n          \"source\": {\n            \"type\": \"AzureSqlSource\",\n            \"sqlReaderQuery\": \"SELECT last_value FROM etl.watermark WHERE table_name = 'orders'\"\n          },\n          \"dataset\": { \"referenceName\": \"ds_sql_meta\", \"type\": \"DatasetReference\" },\n          \"firstRowOnly\": true\n        },\n        \"policy\": { \"timeout\": \"0.00:10:00\", \"retry\": 1, \"retryIntervalInSeconds\": 30 }\n      },\n      {\n        \"name\": \"CopyOrders\",\n        \"type\": \"Copy\",\n        \"dependsOn\": [ { \"activity\": \"GetWatermark\", \"dependencyConditions\": [ \"Succeeded\" ] } ],\n        \"typeProperties\": {\n          \"source\": {\n            \"type\": \"AzureSqlSource\",\n            \"sqlReaderQuery\": {\n              \"value\": \"SELECT * FROM dbo.orders WHERE modified_at > '@{activity('GetWatermark').output.firstRow.last_value}' AND modified_at <= '@{pipeline().TriggerTime}'\",\n              \"type\": \"Expression\"\n            }\n          },\n          \"sink\": {\n            \"type\": \"ParquetSink\",\n            \"storeSettings\": { \"type\": \"AzureBlobFSWriteSettings\" }\n          },\n          \"dataIntegrationUnits\": 4\n        },\n        \"inputs\": [ { \"referenceName\": \"ds_sql_orders\", \"type\": \"DatasetReference\" } ],\n        \"outputs\": [ { \"referenceName\": \"ds_lake_raw_orders\", \"type\": \"DatasetReference\", \"parameters\": { \"run_date\": \"@pipeline().parameters.run_date\" } } ],\n        \"policy\": { \"timeout\": \"0.01:00:00\", \"retry\": 2, \"retryIntervalInSeconds\": 60 }\n      },\n      {\n        \"name\": \"AdvanceWatermark\",\n        \"type\": \"SqlServerStoredProcedure\",\n        \"dependsOn\": [ { \"activity\": \"CopyOrders\", \"dependencyConditions\": [ \"Succeeded\" ] } ],\n        \"typeProperties\": {\n          \"storedProcedureName\": \"etl.set_watermark\",\n          \"storedProcedureParameters\": {\n            \"table_name\": { \"value\": \"orders\", \"type\": \"String\" },\n            \"new_value\": { \"value\": { \"value\": \"@pipeline().TriggerTime\", \"type\": \"Expression\" }, \"type\": \"DateTime\" }\n          }\n        },\n        \"linkedServiceName\": { \"referenceName\": \"ls_sql_meta\", \"type\": \"LinkedServiceReference\" }\n      }\n    ]\n  }\n}",
  "adf/pl_unknown_activity.json": "{\n  \"name\": \"pl_unknown_activity\",\n  \"properties\": {\n    \"description\": \"Copy the orders that changed since the last run from Azure SQL into the raw zone of the lake as Parquet, then move the watermark.\",\n    \"parameters\": {\n      \"run_date\": {\n        \"type\": \"String\",\n        \"defaultValue\": \"2026-03-14\"\n      }\n    },\n    \"activities\": [\n      {\n        \"name\": \"GetWatermark\",\n        \"type\": \"Lookup\",\n        \"typeProperties\": {\n          \"source\": {\n            \"type\": \"AzureSqlSource\",\n            \"sqlReaderQuery\": \"SELECT last_value FROM etl.watermark WHERE table_name = 'orders'\"\n          },\n          \"dataset\": {\n            \"referenceName\": \"ds_sql_meta\",\n            \"type\": \"DatasetReference\"\n          },\n          \"firstRowOnly\": true\n        },\n        \"policy\": {\n          \"timeout\": \"0.00:10:00\",\n          \"retry\": 1,\n          \"retryIntervalInSeconds\": 30\n        }\n      },\n      {\n        \"name\": \"CopyOrders\",\n        \"type\": \"CopyData\",\n        \"dependsOn\": [\n          {\n            \"activity\": \"GetWatermark\",\n            \"dependencyConditions\": [\n              \"Succeeded\"\n            ]\n          }\n        ],\n        \"typeProperties\": {\n          \"source\": {\n            \"type\": \"AzureSqlSource\",\n            \"sqlReaderQuery\": {\n              \"value\": \"SELECT * FROM dbo.orders WHERE modified_at > '@{activity('GetWatermark').output.firstRow.last_value}' AND modified_at <= '@{pipeline().TriggerTime}'\",\n              \"type\": \"Expression\"\n            }\n          },\n          \"sink\": {\n            \"type\": \"ParquetSink\",\n            \"storeSettings\": {\n              \"type\": \"AzureBlobFSWriteSettings\"\n            }\n          },\n          \"dataIntegrationUnits\": 4\n        },\n        \"inputs\": [\n          {\n            \"referenceName\": \"ds_sql_orders\",\n            \"type\": \"DatasetReference\"\n          }\n        ],\n        \"outputs\": [\n          {\n            \"referenceName\": \"ds_lake_raw_orders\",\n            \"type\": \"DatasetReference\",\n            \"parameters\": {\n              \"run_date\": \"@pipeline().parameters.run_date\"\n            }\n          }\n        ],\n        \"policy\": {\n          \"timeout\": \"0.01:00:00\",\n          \"retry\": 2,\n          \"retryIntervalInSeconds\": 60\n        }\n      },\n      {\n        \"name\": \"AdvanceWatermark\",\n        \"type\": \"SqlServerStoredProcedure\",\n        \"dependsOn\": [\n          {\n            \"activity\": \"CopyOrders\",\n            \"dependencyConditions\": [\n              \"Succeeded\"\n            ]\n          }\n        ],\n        \"typeProperties\": {\n          \"storedProcedureName\": \"etl.set_watermark\",\n          \"storedProcedureParameters\": {\n            \"table_name\": {\n              \"value\": \"orders\",\n              \"type\": \"String\"\n            },\n            \"new_value\": {\n              \"value\": {\n                \"value\": \"@pipeline().TriggerTime\",\n                \"type\": \"Expression\"\n              },\n              \"type\": \"DateTime\"\n            }\n          }\n        },\n        \"linkedServiceName\": {\n          \"referenceName\": \"ls_sql_meta\",\n          \"type\": \"LinkedServiceReference\"\n        }\n      }\n    ]\n  }\n}",
  "delta/00000000000000000000.json": "{\n  \"commitInfo\": {\n    \"timestamp\": 1773478200000,\n    \"operation\": \"WRITE\",\n    \"operationParameters\": {\n      \"mode\": \"ErrorIfExists\",\n      \"partitionBy\": \"[]\"\n    },\n    \"operationMetrics\": {\n      \"numFiles\": \"1\",\n      \"numOutputRows\": \"5\",\n      \"numOutputBytes\": \"2414\"\n    }\n  }\n}\n{\n  \"metaData\": {\n    \"id\": \"<table-id>\",\n    \"format\": {\n      \"provider\": \"parquet\",\n      \"options\": {}\n    },\n    \"schemaString\": \"order_id string, status string, total_eur decimal(10,2), placed_at timestamp, order_date date, country string, source_file string\",\n    \"partitionColumns\": [],\n    \"configuration\": {},\n    \"createdTime\": 1773478200000\n  }\n}\n{\n  \"protocol\": {\n    \"minReaderVersion\": 1,\n    \"minWriterVersion\": 2\n  }\n}\n{\n  \"add\": {\n    \"path\": \"part-00000-<uuid1>-c000.snappy.parquet\",\n    \"partitionValues\": {},\n    \"size\": 2414,\n    \"modificationTime\": 1773478200000,\n    \"dataChange\": true,\n    \"stats\": {\"numRecords\": 5, \"minValues\": {\"order_id\": \"O1\", \"total_eur\": 7.75}, \"maxValues\": {\"order_id\": \"O6\", \"total_eur\": 20.0}}\n  }\n}",
  "delta/00000000000000000001.json": "{\n  \"commitInfo\": {\n    \"timestamp\": 1773478200000,\n    \"operation\": \"MERGE\",\n    \"operationParameters\": {\n      \"predicate\": \"[\\\"(order_id = order_id)\\\"]\",\n      \"matchedPredicates\": \"[{\\\"actionType\\\":\\\"update\\\"}]\",\n      \"notMatchedPredicates\": \"[{\\\"actionType\\\":\\\"insert\\\"}]\",\n      \"notMatchedBySourcePredicates\": \"[]\"\n    },\n    \"readVersion\": 0,\n    \"operationMetrics\": {\n      \"numTargetRowsCopied\": \"4\",\n      \"numTargetRowsDeleted\": \"0\",\n      \"numTargetRowsUpdated\": \"1\",\n      \"numTargetFilesAdded\": \"4\",\n      \"numTargetRowsInserted\": \"1\",\n      \"numOutputRows\": \"6\",\n      \"numSourceRows\": \"2\",\n      \"numTargetFilesRemoved\": \"1\"\n    }\n  }\n}\n{\n  \"add\": {\n    \"path\": \"part-00000-<uuid2>-c000.snappy.parquet\",\n    \"partitionValues\": {},\n    \"size\": 2303,\n    \"modificationTime\": 1773478200000,\n    \"dataChange\": true,\n    \"stats\": {\"numRecords\": 1, \"minValues\": {\"order_id\": \"O6\", \"total_eur\": 7.75}, \"maxValues\": {\"order_id\": \"O6\", \"total_eur\": 7.75}}\n  }\n}\n{\n  \"add\": {\n    \"path\": \"part-00001-<uuid3>-c000.snappy.parquet\",\n    \"partitionValues\": {},\n    \"size\": 2303,\n    \"modificationTime\": 1773478200000,\n    \"dataChange\": true,\n    \"stats\": {\"numRecords\": 1, \"minValues\": {\"order_id\": \"O5\", \"total_eur\": 20.0}, \"maxValues\": {\"order_id\": \"O5\", \"total_eur\": 20.0}}\n  }\n}\n{\n  \"add\": {\n    \"path\": \"part-00002-<uuid4>-c000.snappy.parquet\",\n    \"partitionValues\": {},\n    \"size\": 2348,\n    \"modificationTime\": 1773478200000,\n    \"dataChange\": true,\n    \"stats\": {\"numRecords\": 3, \"minValues\": {\"order_id\": \"O1\", \"total_eur\": 10.5}, \"maxValues\": {\"order_id\": \"O7\", \"total_eur\": 12.0}}\n  }\n}\n{\n  \"add\": {\n    \"path\": \"part-00003-<uuid5>-c000.snappy.parquet\",\n    \"partitionValues\": {},\n    \"size\": 2301,\n    \"modificationTime\": 1773478200000,\n    \"dataChange\": true,\n    \"stats\": {\"numRecords\": 1, \"minValues\": {\"order_id\": \"O3\", \"total_eur\": 8.25}, \"maxValues\": {\"order_id\": \"O3\", \"total_eur\": 8.25}}\n  }\n}\n{\n  \"remove\": {\n    \"path\": \"part-00000-<uuid1>-c000.snappy.parquet\",\n    \"deletionTimestamp\": 1773478200000,\n    \"dataChange\": true,\n    \"extendedFileMetadata\": true,\n    \"partitionValues\": {},\n    \"size\": 2414,\n    \"stats\": {\"numRecords\": 5}\n  }\n}",
  "eventgrid/blob_created.json": "{\n  \"topic\": \"/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-brewline-data-prod/providers/Microsoft.Storage/storageAccounts/stbrewlinelakeprod\",\n  \"subject\": \"/blobServices/default/containers/raw/blobs/orders/dt=2026-03-14/orders-0001.json\",\n  \"eventType\": \"Microsoft.Storage.BlobCreated\",\n  \"id\": \"831e1650-001e-001b-66ab-eeb76e069631\",\n  \"data\": {\n    \"api\": \"PutBlob\",\n    \"clientRequestId\": \"6d79dbfb-0e37-4fc4-981f-442c9ca65760\",\n    \"requestId\": \"831e1650-001e-001b-66ab-eeb76e000000\",\n    \"eTag\": \"\\\"0x8DC4A1B2C3D4E5F\\\"\",\n    \"contentType\": \"application/json\",\n    \"contentLength\": 524288,\n    \"blobType\": \"BlockBlob\",\n    \"url\": \"https://stbrewlinelakeprod.blob.core.windows.net/raw/orders/dt=2026-03-14/orders-0001.json\",\n    \"sequencer\": \"00000000000004420000000000028963\",\n    \"storageDiagnostics\": {\n      \"batchId\": \"b68529f3-68cd-4744-baa4-3c0498ec19f0\"\n    }\n  },\n  \"dataVersion\": \"\",\n  \"metadataVersion\": \"1\",\n  \"eventTime\": \"2026-03-14T09:00:05.1234567Z\"\n}",
  "func/conftest.py": "import importlib\nimport os\nimport uuid\n\nimport pytest\nfrom azure.storage.blob import BlobServiceClient\n\nCONNECTION = os.environ[\"LAKE_CONNECTION\"]       # set by the recorder: the storage emulator\n\n\n@pytest.fixture()\ndef lake(monkeypatch):\n    \"\"\"Two fresh containers in the emulator, and the handler module pointed at them.\"\"\"\n    suffix = uuid.uuid4().hex[:8]\n    svc = BlobServiceClient.from_connection_string(CONNECTION)\n    raw, curated = \"raw\" + suffix, \"curated\" + suffix\n    svc.create_container(raw)\n    svc.create_container(curated)\n    monkeypatch.setenv(\"SUMMARY_CONTAINER\", curated)\n    import handler\n    importlib.reload(handler)\n    handler.svc, handler.RAW, handler.CURATED = svc, raw, curated\n    yield handler\n",
  "func/event.json": "[\n  {\n    \"topic\": \"/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-brewline-data-prod/providers/Microsoft.Storage/storageAccounts/stbrewlinelakeprod\",\n    \"subject\": \"/blobServices/default/containers/raw/blobs/orders/dt=2026-03-14/orders-0001.json\",\n    \"eventType\": \"Microsoft.Storage.BlobCreated\",\n    \"id\": \"831e1650-001e-001b-66ab-eeb76e069631\",\n    \"data\": {\n      \"api\": \"PutBlob\",\n      \"clientRequestId\": \"6d79dbfb-0e37-4fc4-981f-442c9ca65760\",\n      \"requestId\": \"831e1650-001e-001b-66ab-eeb76e000000\",\n      \"eTag\": \"\\\"0x8DC4A1B2C3D4E5F\\\"\",\n      \"contentType\": \"application/json\",\n      \"contentLength\": 524288,\n      \"blobType\": \"BlockBlob\",\n      \"url\": \"https://stbrewlinelakeprod.blob.core.windows.net/raw/orders/dt=2026-03-14/orders-0001.json\",\n      \"sequencer\": \"00000000000004420000000000028963\",\n      \"storageDiagnostics\": { \"batchId\": \"b68529f3-68cd-4744-baa4-3c0498ec19f0\" }\n    },\n    \"dataVersion\": \"\",\n    \"metadataVersion\": \"1\",\n    \"eventTime\": \"2026-03-14T09:00:05.1234567Z\"\n  }\n]\n",
  "func/handler.py": "\"\"\"Brewline: when a raw order file lands in Blob Storage, write a small summary next to the curated data.\n\nRuns as an Event Grid triggered Azure Function. Two details matter in production:\n  1. The event names the blob in its subject, for example\n     /blobServices/default/containers/raw/blobs/orders/dt=2026-03-14/orders-0001.json\n     The blob name is everything after /blobs/, and it contains slashes.\n  2. Event Grid delivers each event at least once, so the write must be safe to repeat.\n\"\"\"\nimport json\nimport os\n\nimport azure.functions as func\nfrom azure.core.exceptions import ResourceExistsError\nfrom azure.identity import DefaultAzureCredential\nfrom azure.storage.blob import BlobServiceClient\n\nOUT_CONTAINER = os.environ.get(\"SUMMARY_CONTAINER\", \"curated\")\n\n\ndef lake():\n    \"\"\"One client for the lake. In Azure it signs in as the managed identity of the function app.\n    The tests set LAKE_CONNECTION and talk to the storage emulator instead.\"\"\"\n    conn = os.environ.get(\"LAKE_CONNECTION\")\n    if conn:\n        return BlobServiceClient.from_connection_string(conn)\n    return BlobServiceClient(os.environ[\"LAKE_URL\"], credential=DefaultAzureCredential())\n\n\ndef summarize(lines):\n    orders = [json.loads(line) for line in lines if line.strip()]\n    kept = [o for o in orders if o[\"status\"] != \"CANCELLED\"]\n    return {\"orders\": len(orders), \"revenue_eur\": round(sum(o[\"total_eur\"] for o in kept), 2)}\n\n\ndef split_subject(subject):\n    head, _, name = subject.partition(\"/blobs/\")\n    return head.rsplit(\"/\", 1)[-1], name\n\n\ndef process(event):\n    container, name = split_subject(event.subject)\n    svc = lake()\n    body = svc.get_blob_client(container, name).download_blob().readall().decode()\n    summary = summarize(body.splitlines())\n    out = svc.get_blob_client(OUT_CONTAINER, \"order_summaries/\" + name.replace(\"/\", \"_\") + \".json\")\n    try:\n        out.upload_blob(json.dumps(summary), overwrite=False)\n        status = \"written\"\n    except ResourceExistsError:\n        status = \"already done\"\n    return {\"blob\": name, \"status\": status, **summary}\n\n\napp = func.FunctionApp()\n\n\n@app.event_grid_trigger(arg_name=\"event\")\ndef on_raw_order_file(event: func.EventGridEvent):\n    process(event)\n",
  "func/handler_bug.py": "\"\"\"Brewline: when a raw order file lands in Blob Storage, write a small summary next to the curated data.\n\nRuns as an Event Grid triggered Azure Function. Two details matter in production:\n  1. The event names the blob in its subject, for example\n     /blobServices/default/containers/raw/blobs/orders/dt=2026-03-14/orders-0001.json\n     The blob name is everything after /blobs/, and it contains slashes.\n  2. Event Grid delivers each event at least once, so the write must be safe to repeat.\n\"\"\"\nimport json\nimport os\n\nimport azure.functions as func\nfrom azure.core.exceptions import ResourceExistsError\nfrom azure.identity import DefaultAzureCredential\nfrom azure.storage.blob import BlobServiceClient\n\nOUT_CONTAINER = os.environ.get(\"SUMMARY_CONTAINER\", \"curated\")\n\n\ndef lake():\n    \"\"\"One client for the lake. In Azure it signs in as the managed identity of the function app.\n    The tests set LAKE_CONNECTION and talk to the storage emulator instead.\"\"\"\n    conn = os.environ.get(\"LAKE_CONNECTION\")\n    if conn:\n        return BlobServiceClient.from_connection_string(conn)\n    return BlobServiceClient(os.environ[\"LAKE_URL\"], credential=DefaultAzureCredential())\n\n\ndef summarize(lines):\n    orders = [json.loads(line) for line in lines if line.strip()]\n    kept = [o for o in orders if o[\"status\"] != \"CANCELLED\"]\n    return {\"orders\": len(orders), \"revenue_eur\": round(sum(o[\"total_eur\"] for o in kept), 2)}\n\n\ndef split_subject(subject):\n    parts = subject.split(\"/\")\n    return parts[4], parts[-1]\n\n\ndef process(event):\n    container, name = split_subject(event.subject)\n    svc = lake()\n    body = svc.get_blob_client(container, name).download_blob().readall().decode()\n    summary = summarize(body.splitlines())\n    out = svc.get_blob_client(OUT_CONTAINER, \"order_summaries/\" + name.replace(\"/\", \"_\") + \".json\")\n    try:\n        out.upload_blob(json.dumps(summary), overwrite=False)\n        status = \"written\"\n    except ResourceExistsError:\n        status = \"already done\"\n    return {\"blob\": name, \"status\": status, **summary}\n\n\napp = func.FunctionApp()\n\n\n@app.event_grid_trigger(arg_name=\"event\")\ndef on_raw_order_file(event: func.EventGridEvent):\n    process(event)\n",
  "func/test_handler.py": "import datetime\nimport json\n\nimport azure.functions as func\n\nORDERS = [\n    {\"order_id\": \"O-5001\", \"status\": \"COMPLETED\", \"total_eur\": 11.5},\n    {\"order_id\": \"O-5002\", \"status\": \"COMPLETED\", \"total_eur\": 8.0},\n    {\"order_id\": \"O-5003\", \"status\": \"CANCELLED\", \"total_eur\": 30.0},\n]\n\n\ndef blob_created(container, name):\n    \"\"\"The part of an Event Grid BlobCreated event that the handler reads: the subject.\"\"\"\n    return func.EventGridEvent(\n        id=\"831e1650-001e-001b-66ab-eeb76e069631\",\n        data={\"api\": \"PutBlob\", \"contentType\": \"application/json\", \"blobType\": \"BlockBlob\"},\n        topic=\"/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-brewline-data-prod/providers/Microsoft.Storage/storageAccounts/stbrewlinelakeprod\",\n        subject=\"/blobServices/default/containers/\" + container + \"/blobs/\" + name,\n        event_type=\"Microsoft.Storage.BlobCreated\",\n        event_time=datetime.datetime(2026, 3, 14, 9, 0, 5, tzinfo=datetime.timezone.utc),\n        data_version=\"\",\n    )\n\n\ndef put_orders(lake, name):\n    body = \"\\n\".join(json.dumps(o) for o in ORDERS)\n    lake.svc.get_blob_client(lake.RAW, name).upload_blob(body, overwrite=True)\n\n\ndef test_summary_skips_cancelled_orders(lake):\n    put_orders(lake, \"orders-0001.json\")\n    out = lake.process(blob_created(lake.RAW, \"orders-0001.json\"))\n    assert out[\"orders\"] == 3\n    assert out[\"revenue_eur\"] == 19.5\n\n\ndef test_a_repeated_event_writes_nothing_twice(lake):\n    put_orders(lake, \"orders-0001.json\")\n    event = blob_created(lake.RAW, \"orders-0001.json\")\n    first = lake.process(event)[\"status\"]\n    second = lake.process(event)[\"status\"]\n    assert (first, second) == (\"written\", \"already done\")\n\n\ndef test_the_blob_name_keeps_its_folders(lake):\n    put_orders(lake, \"orders/dt=2026-03-14/orders-0002.json\")\n    out = lake.process(blob_created(lake.RAW, \"orders/dt=2026-03-14/orders-0002.json\"))\n    assert out[\"blob\"] == \"orders/dt=2026-03-14/orders-0002.json\"\n",
  "spark/bronze_orders_0600.csv": "order_id;status;total;placed_at;country\nO1;completed ;10,50;14/03/2026 08:30;NL\nO2;PENDING;12,00;14/03/2026 08:45;DE\nO3;Completed;8,25;14/03/2026 08:58;NL\nO4;COMPLETED;n/a;14/03/2026 09:10;FR\n",
  "spark/bronze_orders_1200.csv": "order_id;status;total;placed_at;country\nO2;COMPLETED;12,00;14/03/2026 08:45;DE\nO5;COMPLETED;20,00;15/03/2026 07:20;DE\nO6;COMPLETED;7,75;15/03/2026 07:40;NL\n",
  "spark/bronze_orders_late.csv": "order_id;status;total;placed_at;country\nO3;CANCELLED;8,25;14/03/2026 08:58;NL\nO7;COMPLETED;11,00;16/03/2026 10:05;NL\n",
  "spark/medallion.py": "from pyspark.sql import functions as F, Window\n\ndef to_bronze(spark, folder):\n    # keep every column as text, and remember which file each row came from\n    return (spark.read.option(\"header\", True).option(\"sep\", \";\").csv(folder)\n            .select(\"*\", F.col(\"_metadata.file_name\").alias(\"source_file\")))\n\ndef to_silver(bronze):\n    cleaned = (bronze\n        .withColumn(\"status\", F.upper(F.trim(\"status\")))\n        .withColumn(\"total_eur\", F.expr(\"try_cast(replace(total, ',', '.') as decimal(10,2))\"))\n        .withColumn(\"placed_at\", F.to_timestamp(\"placed_at\", \"dd/MM/yyyy HH:mm\"))\n        .withColumn(\"order_date\", F.to_date(\"placed_at\")))\n    newest_first = Window.partitionBy(\"order_id\").orderBy(F.col(\"source_file\").desc())\n    good = (cleaned.filter(\"total_eur IS NOT NULL\")\n            .withColumn(\"rn\", F.row_number().over(newest_first)).filter(\"rn = 1\")\n            .select(\"order_id\", \"status\", \"total_eur\", \"placed_at\", \"order_date\", \"country\", \"source_file\"))\n    bad = (cleaned.filter(\"total_eur IS NULL\").withColumn(\"reason\", F.lit(\"total is not a number\"))\n           .select(\"order_id\", \"total\", \"reason\", \"source_file\"))\n    return good, bad\n\ndef to_gold(silver):\n    return (silver.filter(\"status = 'COMPLETED'\")\n            .groupBy(\"order_date\", \"country\")\n            .agg(F.count(\"*\").alias(\"orders\"), F.sum(\"total_eur\").alias(\"revenue_eur\"))\n            .orderBy(\"order_date\", \"country\"))\n",
  "spark/merge.py": "from delta.tables import DeltaTable\n\nsilver = DeltaTable.forPath(spark, \"silver/orders\")\n(silver.alias(\"t\")\n    .merge(new_rows.alias(\"s\"), \"t.order_id = s.order_id\")\n    .whenMatchedUpdateAll()\n    .whenNotMatchedInsertAll()\n    .execute())\n"
 },
 "meta": {
  "account": "stbrewlinelakeprod",
  "ansi_default": "true",
  "azure-core": "1.41.0",
  "azure-eventgrid": "4.22.1",
  "azure-eventhub": "5.15.1",
  "azure-eventhub-checkpointstoreblob": "1.2.0",
  "azure-functions": "2.3.0",
  "azure-identity": "1.27.0",
  "azure-mgmt-datafactory": "9.3.0",
  "azure-storage-blob": "12.31.1",
  "azure-storage-queue": "12.18.1",
  "azurite": "3.37.0",
  "delta-spark": "4.0.1",
  "duckdb": "2.0.0",
  "java": "21.0.12.1",
  "kusto_language_service": "12.4.1",
  "node": "22.23.4",
  "note": "Recorded by azure/verify/capture_az.py with the Azure SDK for Python against Azurite (a storage emulator), azure-identity, DuckDB, pyarrow and pytest on one machine. Nothing ran on Azure.",
  "pyarrow": "26.0.1",
  "pyspark": "4.0.1",
  "pytest": "9.2.0",
  "python": "3.13.18",
  "region": "westeurope",
  "spark": "4.0.1",
  "sqlglot": "30.30.0"
 },
 "tables": {
  "delta.at_v0": {
   "cols": [
    "order_id",
    "status",
    "total_eur",
    "placed_at",
    "order_date",
    "country",
    "source_file"
   ],
   "rows": [
    [
     "O1",
     "COMPLETED",
     "10.50",
     "2026-03-14 08:30",
     "2026-03-14",
     "NL",
     "orders_20260314_0600.csv"
    ],
    [
     "O2",
     "COMPLETED",
     "12.00",
     "2026-03-14 08:45",
     "2026-03-14",
     "DE",
     "orders_20260314_1200.csv"
    ],
    [
     "O3",
     "COMPLETED",
     "8.25",
     "2026-03-14 08:58",
     "2026-03-14",
     "NL",
     "orders_20260314_0600.csv"
    ],
    [
     "O5",
     "COMPLETED",
     "20.00",
     "2026-03-15 07:20",
     "2026-03-15",
     "DE",
     "orders_20260314_1200.csv"
    ],
    [
     "O6",
     "COMPLETED",
     "7.75",
     "2026-03-15 07:40",
     "2026-03-15",
     "NL",
     "orders_20260314_1200.csv"
    ]
   ]
  },
  "delta.at_v1": {
   "cols": [
    "order_id",
    "status",
    "total_eur",
    "placed_at",
    "order_date",
    "country",
    "source_file"
   ],
   "rows": [
    [
     "O1",
     "COMPLETED",
     "10.50",
     "2026-03-14 08:30",
     "2026-03-14",
     "NL",
     "orders_20260314_0600.csv"
    ],
    [
     "O2",
     "COMPLETED",
     "12.00",
     "2026-03-14 08:45",
     "2026-03-14",
     "DE",
     "orders_20260314_1200.csv"
    ],
    [
     "O3",
     "CANCELLED",
     "8.25",
     "2026-03-14 08:58",
     "2026-03-14",
     "NL",
     "orders_20260315_0600.csv"
    ],
    [
     "O5",
     "COMPLETED",
     "20.00",
     "2026-03-15 07:20",
     "2026-03-15",
     "DE",
     "orders_20260314_1200.csv"
    ],
    [
     "O6",
     "COMPLETED",
     "7.75",
     "2026-03-15 07:40",
     "2026-03-15",
     "NL",
     "orders_20260314_1200.csv"
    ],
    [
     "O7",
     "COMPLETED",
     "11.00",
     "2026-03-16 10:05",
     "2026-03-16",
     "NL",
     "orders_20260315_0600.csv"
    ]
   ]
  },
  "delta.history": {
   "cols": [
    "version",
    "operation",
    "mode",
    "metrics"
   ],
   "rows": [
    [
     "0",
     "WRITE",
     "ErrorIfExists",
     "numOutputRows 5, numFiles 1"
    ],
    [
     "1",
     "MERGE",
     "",
     "numOutputRows 6, numTargetRowsInserted 1, numTargetRowsUpdated 1, numTargetFilesAdded 4, numTargetFilesRemoved 1"
    ],
    [
     "2",
     "WRITE",
     "Append",
     "numOutputRows 1, numFiles 1"
    ]
   ]
  },
  "spark.bronze": {
   "cols": [
    "order_id",
    "status",
    "total",
    "placed_at",
    "country",
    "source_file"
   ],
   "rows": [
    [
     "O1",
     "completed ",
     "10,50",
     "14/03/2026 08:30",
     "NL",
     "orders_20260314_0600.csv"
    ],
    [
     "O2",
     "PENDING",
     "12,00",
     "14/03/2026 08:45",
     "DE",
     "orders_20260314_0600.csv"
    ],
    [
     "O3",
     "Completed",
     "8,25",
     "14/03/2026 08:58",
     "NL",
     "orders_20260314_0600.csv"
    ],
    [
     "O4",
     "COMPLETED",
     "n/a",
     "14/03/2026 09:10",
     "FR",
     "orders_20260314_0600.csv"
    ],
    [
     "O2",
     "COMPLETED",
     "12,00",
     "14/03/2026 08:45",
     "DE",
     "orders_20260314_1200.csv"
    ],
    [
     "O5",
     "COMPLETED",
     "20,00",
     "15/03/2026 07:20",
     "DE",
     "orders_20260314_1200.csv"
    ],
    [
     "O6",
     "COMPLETED",
     "7,75",
     "15/03/2026 07:40",
     "NL",
     "orders_20260314_1200.csv"
    ]
   ]
  },
  "spark.gold": {
   "cols": [
    "order_date",
    "country",
    "orders",
    "revenue_eur"
   ],
   "rows": [
    [
     "2026-03-14",
     "DE",
     "1",
     "12.00"
    ],
    [
     "2026-03-14",
     "NL",
     "2",
     "18.75"
    ],
    [
     "2026-03-15",
     "DE",
     "1",
     "20.00"
    ],
    [
     "2026-03-15",
     "NL",
     "1",
     "7.75"
    ]
   ]
  },
  "spark.quarantine": {
   "cols": [
    "order_id",
    "total",
    "reason",
    "source_file"
   ],
   "rows": [
    [
     "O4",
     "n/a",
     "total is not a number",
     "orders_20260314_0600.csv"
    ]
   ]
  },
  "spark.silver": {
   "cols": [
    "order_id",
    "status",
    "total_eur",
    "placed_at",
    "order_date",
    "country",
    "source_file"
   ],
   "rows": [
    [
     "O1",
     "COMPLETED",
     "10.50",
     "2026-03-14 08:30",
     "2026-03-14",
     "NL",
     "orders_20260314_0600.csv"
    ],
    [
     "O2",
     "COMPLETED",
     "12.00",
     "2026-03-14 08:45",
     "2026-03-14",
     "DE",
     "orders_20260314_1200.csv"
    ],
    [
     "O3",
     "COMPLETED",
     "8.25",
     "2026-03-14 08:58",
     "2026-03-14",
     "NL",
     "orders_20260314_0600.csv"
    ],
    [
     "O5",
     "COMPLETED",
     "20.00",
     "2026-03-15 07:20",
     "2026-03-15",
     "DE",
     "orders_20260314_1200.csv"
    ],
    [
     "O6",
     "COMPLETED",
     "7.75",
     "2026-03-15 07:40",
     "2026-03-15",
     "NL",
     "orders_20260314_1200.csv"
    ]
   ]
  },
  "synapse.by_month": {
   "cols": [
    "month",
    "orders",
    "revenue_eur"
   ],
   "rows": [
    [
     "2026-01",
     179653,
     1984087.5
    ],
    [
     "2026-02",
     280781,
     3094470.1
    ],
    [
     "2026-03",
     139566,
     1540735.7
    ]
   ]
  }
 },
 "text": {
  "delta.listing_by_day": "silver/orders_by_day/\n    _delta_log/00000000000000000000.crc\n    _delta_log/00000000000000000000.json\n    order_date=2026-03-14/part-00000-<uuid1>.c000.snappy.parquet\n    order_date=2026-03-14/part-00001-<uuid2>.c000.snappy.parquet\n    order_date=2026-03-15/part-00000-<uuid3>.c000.snappy.parquet\n    order_date=2026-03-15/part-00001-<uuid4>.c000.snappy.parquet\n    order_date=2026-03-16/part-00000-<uuid5>.c000.snappy.parquet",
  "delta.listing_v0": "silver/orders/\n    _delta_log/00000000000000000000.crc\n    _delta_log/00000000000000000000.json\n    part-00000-<uuid1>-c000.snappy.parquet",
  "delta.listing_v1": "silver/orders/\n    _delta_log/00000000000000000000.crc\n    _delta_log/00000000000000000000.json\n    _delta_log/00000000000000000001.crc\n    _delta_log/00000000000000000001.json\n    part-00000-<uuid1>-c000.snappy.parquet\n    part-00000-<uuid2>-c000.snappy.parquet\n    part-00001-<uuid3>-c000.snappy.parquet\n    part-00002-<uuid4>-c000.snappy.parquet\n    part-00003-<uuid5>-c000.snappy.parquet",
  "delta.schema_error": "[_LEGACY_ERROR_TEMP_DELTA_0007] A schema mismatch detected when writing to the Delta table (Table ID: <table-id>).\nTo enable schema migration using DataFrameWriter or DataStreamWriter, please set:\n'.option(\"mergeSchema\", \"true\")'.\nFor other operations, set the session configuration\nspark.databricks.delta.schema.autoMerge.enabled to \"true\". See the documentation\nspecific to the operation for details.\n\nTable schema:\nroot\n-- order_id: string (nullable = true)\n-- status: string (nullable = true)\n-- total_eur: decimal(10,2) (nullable = true)\n-- placed_at: timestamp (nullable = true)\n-- order_date: date (nullable = true)\n-- country: string (nullable = true)\n-- source_file: string (nullable = true)\n\n\nData schema:\nroot\n-- order_id: string (nullable = true)\n-- status: string (nullable = true)\n-- total_eur: decimal(10,2) (nullable = true)\n-- placed_at: timestamp (nullable = true)\n-- order_date: date (nullable = true)\n-- country: string (nullable = true)\n-- source_file: string (nullable = true)\n-- channel: string (nullable = true)",
  "delta.vacuum_error": "requirement failed: Are you sure you would like to vacuum files with such a low retention period? If you have\nwriters that are currently writing to this table, there is a risk that you may corrupt the\nstate of your Delta table.\n\nIf you are certain that there are no operations being performed on this table, such as\ninsert/upsert/delete/optimize, then you may turn off this check by setting:\nspark.databricks.delta.retentionDurationCheck.enabled = false\n\nIf you are not sure, please use a value not less than \"168 hours\".",
  "identity.chain": "DefaultAzureCredential failed to retrieve a token from the included credentials.\nAttempted credentials:\n\tEnvironmentCredential: EnvironmentCredential authentication unavailable. Environment variables are not fully configured.\nVisit https://aka.ms/azsdk/python/identity/environmentcredential/troubleshoot to troubleshoot this issue.\n\tWorkloadIdentityCredential: WorkloadIdentityCredential authentication unavailable. The workload options are not fully configured. See the troubleshooting guide for more information: https://aka.ms/azsdk/python/identity/workloadidentitycredential/troubleshoot. Missing required arguments: 'tenant_id', 'client_id', 'token_file_path'.\n\tManagedIdentityCredential: ManagedIdentityCredential authentication unavailable.\n\tSharedTokenCacheCredential: SharedTokenCacheCredential authentication unavailable. No accounts were found in the cache.\n\tVisualStudioCodeCredential: VisualStudioCodeCredential requires the 'azure-identity-broker' package to be installed. You must also ensure you have the Azure Resources extension installed and have signed in to Azure via Visual Studio Code.\n\tAzureCliCredential: Azure CLI not found on path\n\tAzurePowerShellCredential: PowerShell is not installed\n\tAzureDeveloperCliCredential: Azure Developer CLI could not be found. Please visit https://aka.ms/azure-dev for installation instructions and then,once installed, authenticate to your Azure account using 'azd auth login'.\n\tBrokerCredential: InteractiveBrowserBrokerCredential unavailable. The 'azure-identity-broker' package is required to use brokered authentication.\nTo mitigate this issue, please refer to the troubleshooting guidelines here at https://aka.ms/azsdk/python/identity/defaultazurecredential/troubleshoot.",
  "sas.url": "https://stbrewlinelakeprod.blob.core.windows.net/raw/orders/dt=2026-03-14/orders-0001.json?st=2026-03-14T07%3A55%3A00Z&se=2026-03-14T08%3A55%3A00Z&sp=r&spr=https&sv=2026-10-06&sr=b&sig=Zf4B4iiVtwmLngqUx4nOCCCcIVLzbj0zkZzJpiTFCO8%3D",
  "spark.ansi_error": "[CAST_INVALID_INPUT] The value 'n/a' of the type \"STRING\" cannot be cast to \"DECIMAL(10,2)\" because it is malformed. Correct the value as per the syntax, or change its target type. Use `try_cast` to tolerate malformed input and return NULL instead. SQLSTATE: 22018",
  "spark.plan_join_default": "== Physical Plan ==\n*(2) Project [order_id, country_name]\n+- *(2) BroadcastHashJoin [country], [country], Inner, BuildLeft, false\n   :- BroadcastExchange HashedRelationBroadcastMode(List(input[1, string, false]),false)\n   :  +- *(1) Filter isnotnull(country)\n   :     +- *(1) ColumnarToRow\n   :        +- FileScan parquet [order_id,country] ...\n   +- *(2) Filter isnotnull(country)\n      +- *(2) Scan ExistingRDD[country,country_name]",
  "spark.plan_join_no_broadcast": "== Physical Plan ==\n*(5) Project [order_id, country_name]\n+- *(5) SortMergeJoin [country], [country], Inner\n   :- *(2) Sort [country ASC NULLS FIRST], false, 0\n   :  +- Exchange hashpartitioning(country, 4), ENSURE_REQUIREMENTS\n   :     +- *(1) Filter isnotnull(country)\n   :        +- *(1) ColumnarToRow\n   :           +- FileScan parquet [order_id,country] ...\n   +- *(4) Sort [country ASC NULLS FIRST], false, 0\n      +- Exchange hashpartitioning(country, 4), ENSURE_REQUIREMENTS\n         +- *(3) Filter isnotnull(country)\n            +- *(3) Scan ExistingRDD[country,country_name]",
  "spark.plan_prune": "== Physical Plan ==\n* Project (3)\n+- * ColumnarToRow (2)\n   +- Scan parquet  (1)\n\n\n(1) Scan parquet\nOutput [3]: [order_id, total_eur, order_date]\nBatched: true\nLocation: PreparedDeltaFileIndex [<table folder>]\nPartitionFilters: [isnotnull(order_date), (order_date = 2026-03-15)]\nReadSchema: struct<order_id:string,total_eur:decimal(10,2)>\n\n(2) ColumnarToRow [codegen id : 1]\nInput [3]: [order_id, total_eur, order_date]\n\n(3) Project [codegen id : 1]\nOutput [2]: [order_id, total_eur]\nInput [3]: [order_id, total_eur, order_date]",
  "synapse.layout_tree": "orders_hive/year=2026/month=01/day=14/part-0.parquet\norders_hive/year=2026/month=01/day=15/part-0.parquet\norders_hive/year=2026/month=01/day=16/part-0.parquet\n...\norders_hive/year=2026/month=03/day=14/part-0.parquet",
  "test.fail": "..F                                                                      [100%]\n== FAILURES ==\n_____________________ test_the_blob_name_keeps_its_folders _____________________\n\nlake = <module 'handler' from 'funcproj/handler.py'>\n\n    def test_the_blob_name_keeps_its_folders(lake):\n        put_orders(lake, \"orders/dt=2026-03-14/orders-0002.json\")\n>       out = lake.process(blob_created(lake.RAW, \"orders/dt=2026-03-14/orders-0002.json\"))\n              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n\ntests/test_handler.py:48: \n_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ \nhandler.py:43: in process\n    body = svc.get_blob_client(container, name).download_blob().readall().decode()\n           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n    return func(*args, **kwargs)\n           ^^^^^^^^^^^^^^^^^^^^^\n    return StorageStreamDownloader(**options)\n           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n    self._response = self._initial_request()\n                     ^^^^^^^^^^^^^^^^^^^^^^^\n    process_storage_error(error)\n    raise error from None\n    self._clients.blob.download(\n    return func(*args, **kwargs)\n           ^^^^^^^^^^^^^^^^^^^^^\n    map_error(status_code=response.status_code, response=response, error_map=error_map)\n_ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ \n\nstatus_code = 404\nresponse = <HttpResponse: 404 The specified blob does not exist., Content-Type: application/xml>\nerror_map = {401: <class 'azure.core.exceptions.ClientAuthenticationError'>, 404: <class 'azure.core.exceptions.ResourceNotFoundEr...09: <class 'azure.core.exceptions.ResourceExistsError'>, 304: <class 'azure.core.exceptions.ResourceNotModifiedError'>}\n\n    def map_error(\n        status_code: int,\n        response: _HttpResponseCommonAPI,\n        error_map: Mapping[int, Type[HttpResponseError]],\n    ) -> None:\n        if not error_map:\n            return\n        error_type = error_map.get(status_code)\n        if not error_type:\n            return\n        error = error_type(response=response)\n>       raise error\nE       azure.core.exceptions.ResourceNotFoundError: The specified blob does not exist.\nE       RequestId:<id>\nE       Time:<time>\nE       ErrorCode:BlobNotFound\nE       Content: <?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\nE       <Error>\nE         <Code>BlobNotFound</Code>\nE         <Message>The specified blob does not exist.\nE       RequestId:<id>\nE       Time:<time></Message>\nE       </Error>\n\n== PASSES ==\n== short test summary info ==\nPASSED tests/test_handler.py::test_summary_skips_cancelled_orders\nPASSED tests/test_handler.py::test_a_repeated_event_writes_nothing_twice\nFAILED tests/test_handler.py::test_the_blob_name_keeps_its_folders - azure.co...\n1 failed, 2 passed",
  "test.pass": "...                                                                      [100%]\n== PASSES ==\n== short test summary info ==\nPASSED tests/test_handler.py::test_summary_skips_cancelled_orders\nPASSED tests/test_handler.py::test_a_repeated_event_writes_nothing_twice\nPASSED tests/test_handler.py::test_the_blob_name_keeps_its_folders\n3 passed"
 }
};
