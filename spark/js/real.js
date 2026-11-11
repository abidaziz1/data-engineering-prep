window.LAB = window.LAB || {};
LAB.real = {
 "counts": {
  "conf.session": {
   "default_parallelism_local4": 4,
   "executors_in_local_mode": 1,
   "master": "local[4]",
   "reserved_memory_mib": 300,
   "storage_fraction": 0.5,
   "unified_memory_fraction": 0.6,
   "version": "4.0.1"
  },
  "delta.build": {
   "first_commit_actions": {
    "add": 6,
    "commitInfo": 1,
    "metaData": 1,
    "protocol": 1
   },
   "log_files": [
    "00000000000000000000.json"
   ],
   "parquet_files": 6,
   "rows": 68374
  },
  "delta.log_after": {
   "log_files": [
    "00000000000000000000.json",
    "00000000000000000001.json"
   ]
  },
  "delta.merge": {
   "numOutputRows": 70799,
   "numSourceRows": 3100,
   "numTargetRowsDeleted": 164,
   "numTargetRowsInserted": 2589,
   "numTargetRowsUpdated": 347
  },
  "delta.small_files": {
   "appends": 20,
   "files_in_the_version_after_optimize": 1,
   "files_in_the_version_after_vacuum": 1,
   "files_in_the_version_before": 20,
   "files_on_disk_after_optimize": 21,
   "files_on_disk_after_vacuum": 1,
   "files_on_disk_before": 20,
   "old_version_after_vacuum": "SparkException: [FAILED_READ_FILE.FILE_NOT_EXIST] Encountered error while reading file <file>.parquet. File does not exist. It is possible the underlying files have been updated.",
   "rows_now": 10000,
   "vacuum_zero_hours": "requirement failed: Are you sure you would like to vacuum files with such a low retention period?",
   "version_before_optimize": 19
  },
  "delta.time_travel": {
   "latest": 70799,
   "version 0": 68374
  },
  "errors.corrupt": {
   "default": "SparkException: [FAILED_READ_FILE.NO_HINT] Encountered error while reading file file:///.../<file>.parquet.  SQLSTATE: KD001",
   "ignoreCorruptFiles=true": 1000
  },
  "errors.retry": {
   "master_local_2_4_error": null,
   "master_local_2_first_attempt_error": [
    "RuntimeError: the first attempt fails"
   ],
   "maxFailures_default_in_local_mode": 1,
   "maxFailures_default_on_a_cluster": 4,
   "task_attempts_with_local_2_4": [
    {
     "attempt": 0,
     "failed": true,
     "reason": "ExceptionFailure"
    },
    {
     "attempt": 1,
     "failed": false,
     "reason": "Success"
    }
   ]
  },
  "eventlog.layout": {
   "files": [
    "eventlog_v2_APP/appstatus_APP",
    "eventlog_v2_APP/events_1_APP"
   ],
   "spark_conf_to_turn_it_on": [
    "spark.eventLog.enabled=true",
    "spark.eventLog.dir=<a folder>"
   ]
  },
  "files.bucketing": {
   "shuffles_when_bucketed": 0,
   "shuffles_without_buckets": 2
  },
  "files.evolution": {
   "columns_by_default": [
    "order_id",
    "total_cents",
    "batch"
   ],
   "columns_with_mergeSchema": [
    "order_id",
    "total_cents",
    "channel",
    "batch"
   ],
   "rows_with_merge": [
    [
     "1",
     "1200",
     "None",
     "1"
    ],
    [
     "2",
     "900",
     "None",
     "1"
    ],
    [
     "3",
     "1500",
     "app",
     "2"
    ],
    [
     "4",
     "700",
     "pos",
     "2"
    ]
   ]
  },
  "files.overwrite": {
   "default_mode": "STATIC",
   "dynamic": {
    "folders_after": [
     "day=0",
     "day=1",
     "day=2"
    ],
    "folders_before": [
     "day=0",
     "day=1",
     "day=2"
    ],
    "rows_after": 25
   },
   "static": {
    "folders_after": [
     "day=1"
    ],
    "folders_before": [
     "day=0",
     "day=1",
     "day=2"
    ],
    "rows_after": 5
   }
  },
  "joins.counts": {
   "customers": 5250,
   "customers_with_orders_semi": 5000,
   "customers_without_orders_anti": 250,
   "inner_to_customers": 300343,
   "inner_to_stores": 400000,
   "inner_to_stores_listed_twice": 800000,
   "left_to_customers": 400000,
   "not_exists_customers_without_orders": 250,
   "not_in_customers_without_orders": 0,
   "null_safe_to_a_null_row": 400000,
   "orders": 400000,
   "orders_without_customer_id": 99657
  },
  "mem.cache": {
   "cached_partitions": 4,
   "disk_bytes": 0,
   "entries_after_unpersist": 0,
   "memory_bytes": 7296968,
   "storage_level": "Disk Memory Deserialized 1x Replicated"
  },
  "mem.spill": {
   "disk_bytes_spilled": 12583134,
   "forced_after_rows": 20000,
   "memory_bytes_spilled": 75497184,
   "rows_sorted": 400000
  },
  "parts.sizes": {
   "after_repartition_14_by_dt_rows_in_each_nonempty_partition": [
    28544,
    57245,
    57398,
    28290,
    28477,
    85762,
    57062,
    28749,
    28473
   ],
   "coalesce_3": [
    114266,
    142525,
    143209
   ],
   "repartition_3": [
    133335,
    133333,
    133332
   ]
  },
  "plans.same": {
   "sql_and_dataframe_have_the_same_plan": true
  },
  "skew.rows_adaptive": {
   "plan_says_skew": true,
   "rows": 400000
  },
  "skew.rows_plain": {
   "plan_says_skew": false,
   "rows": 400000
  },
  "skew.rows_salted": {
   "plan_says_skew": false,
   "rows": 400000
  },
  "sql.explode": {
   "explode": [
    [
     1,
     1
    ],
    [
     1,
     2
    ],
    [
     1,
     3
    ],
    [
     2,
     5
    ],
    [
     2,
     5
    ]
   ],
   "explode_outer": [
    [
     1,
     1
    ],
    [
     1,
     2
    ],
    [
     1,
     3
    ],
    [
     2,
     5
    ],
    [
     2,
     5
    ],
    [
     3,
     "NULL"
    ]
   ]
  },
  "stream.checkpoint": {
   "tree": {
    ".metadata.crc": null,
    "commits": [
     "0",
     "1",
     "2",
     "3",
     "4",
     "5",
     "6"
    ],
    "metadata": null,
    "offsets": [
     "0",
     "1",
     "2",
     "3",
     "4",
     "5",
     "6"
    ],
    "sources": [
     "0"
    ],
    "state": [
     "0"
    ]
   }
  },
  "stream.no_watermark": {
   "append_mode_error": "[STREAMING_OUTPUT_MODE.UNSUPPORTED_OPERATION] Invalid streaming output mode: append. This output mode is not supported for streaming aggregations without watermark on streaming DataFrames/DataSets. SQLSTATE: 42KDE",
   "batch_4_rows_without_watermark": [
    "10:00 s01 3 17"
   ],
   "rows_dropped_as_late_without_watermark": 0
  },
  "stream.restart": {
   "batch_written_twice": [
    4
   ],
   "first_run_batches": [
    0,
    1,
    2,
    3
   ],
   "restart_batches": [
    4,
    5,
    6,
    7
   ],
   "rows_the_sink_got_for_each_batch": {
    "0": 2,
    "1": 2,
    "2": 1,
    "4": 2,
    "6": 1
   },
   "second_run_batches_that_finished": [],
   "second_run_failed": true
  },
  "submit.version": {
   "java": "21.0.12.1",
   "scala": "2.13.16",
   "spark": "4.0.1"
  },
  "test.summary": {
   "bug": {
    "failed": 1,
    "passed": 3,
    "target": "transforms_bug"
   },
   "clean": {
    "failed": 0,
    "passed": 4,
    "target": "transforms"
   }
  },
  "udf.batches": {
   "calls": 42,
   "maxRecordsPerBatch": 10000,
   "rows": 400000
  },
  "udf.calls": {
   "deterministic, result filtered, then used twice": 4000,
   "deterministic, result used once": 1000,
   "deterministic, result used twice": 1000,
   "non-deterministic, result filtered, then used twice": 1000,
   "non-deterministic, result used once": 1000,
   "non-deterministic, result used twice": 1000,
   "rows": 1000
  },
  "udf.same": {
   "all_three_agree": true,
   "labels": [
    [
     "check",
     28076
    ],
    [
     "ok",
     319683
    ],
    [
     "other",
     52241
    ]
   ]
  },
  "world.summary": {
   "busiest_store": "s01",
   "busiest_store_share": 0.338,
   "customers": 5250,
   "days": 14,
   "first_day": "2026-11-01",
   "guest_share": 0.249,
   "new_customers_without_orders": 250,
   "orders": 400000,
   "orders_files": 14,
   "orders_kb": 6650,
   "paid_share": 0.799,
   "stores": 12
  }
 },
 "files": {
  "code/app/app_conf.py": "\"\"\"Prints the value of a few settings, so that spark-submit runs can show which source won. SET_IN_CODE sets one of them in the program.\"\"\"\nimport json\nimport os\n\nfrom pyspark.sql import SparkSession\n\nb = SparkSession.builder.appName('conf-probe')\nif os.environ.get('SET_IN_CODE'):\n    b = b.config('spark.sql.shuffle.partitions', os.environ['SET_IN_CODE'])\nspark = b.getOrCreate()\nspark.sparkContext.setLogLevel('OFF')\nprint('RESULT' + json.dumps({'shuffle_partitions': spark.conf.get('spark.sql.shuffle.partitions'), 'master': spark.sparkContext.master, 'app_name': spark.sparkContext.appName}))\nspark.stop()",
  "code/app/test_transforms.py": "import importlib\nimport os\nfrom datetime import datetime\n\nimport pytest\nfrom pyspark.sql import SparkSession\nfrom pyspark.testing import assertDataFrameEqual, assertSchemaEqual\n\nT = importlib.import_module(os.environ.get('TRANSFORMS', 'transforms'))\nSCHEMA = 'order_id long, store_id string, customer_id string, order_ts timestamp, status string, total_cents int'\n\n\n@pytest.fixture(scope='session')\ndef spark():\n    s = (SparkSession.builder.master('local[2]').appName('tests').config('spark.sql.shuffle.partitions', '2').config('spark.ui.enabled', 'false')\n         .config('spark.driver.bindAddress', '127.0.0.1').config('spark.sql.session.timeZone', 'UTC').config('spark.ui.showConsoleProgress', 'false').getOrCreate())\n    yield s\n    s.stop()\n\n\ndef orders(spark, rows):\n    return spark.createDataFrame(rows, SCHEMA)\n\n\ndef test_paid_and_refunded_orders_count(spark):\n    df = orders(spark, [(1, 's01', 'c1', datetime(2026, 11, 1, 9), 'PAID', 1000), (2, 's01', 'c2', datetime(2026, 11, 1, 10), 'REFUNDED', 500), (3, 's01', 'c3', datetime(2026, 11, 1, 11), 'CANCELLED', 700)])\n    got = T.daily_revenue(df)\n    want = spark.createDataFrame([('s01', datetime(2026, 11, 1).date(), 2, 1500)], 'store_id string, day date, orders long, revenue_cents long')\n    assertDataFrameEqual(got, want)\n\n\ndef test_each_store_and_day_is_its_own_row(spark):\n    df = orders(spark, [(1, 's01', 'c1', datetime(2026, 11, 1, 9), 'PAID', 100), (2, 's02', 'c2', datetime(2026, 11, 1, 9), 'PAID', 200), (3, 's01', 'c3', datetime(2026, 11, 2, 9), 'PAID', 300)])\n    assert T.daily_revenue(df).count() == 3\n\n\ndef test_empty_input_keeps_the_schema(spark):\n    got = T.daily_revenue(orders(spark, []))\n    assert got.count() == 0\n    assertSchemaEqual(got.schema, spark.createDataFrame([], 'store_id string, day date, orders long, revenue_cents long').schema)\n\n\ndef test_guest_orders_are_counted_in_the_share(spark):\n    df = orders(spark, [(1, 's01', None, datetime(2026, 11, 1, 9), 'PAID', 100), (2, 's01', 'c2', datetime(2026, 11, 1, 9), 'PAID', 100), (3, 's01', None, datetime(2026, 11, 1, 9), 'NEW', 100), (4, 's01', 'c4', datetime(2026, 11, 1, 9), 'NEW', 100)])\n    assert T.guest_share(df).collect()[0]['guest_share'] == 0.5",
  "code/app/transforms.py": "\"\"\"The Brewline transformations that the tests of mission 12 check.\"\"\"\nfrom pyspark.sql import DataFrame\nfrom pyspark.sql import functions as F\n\n\ndef daily_revenue(orders: DataFrame) -> DataFrame:\n    \"\"\"Orders and revenue for each store and day. Paid and refunded orders count, because a refund is revenue that was booked first. New and cancelled orders do not.\"\"\"\n    return (orders.filter(F.col('status').isin('PAID', 'REFUNDED'))\n            .groupBy('store_id', F.to_date('order_ts').alias('day'))\n            .agg(F.count('*').alias('orders'), F.sum('total_cents').alias('revenue_cents')))\n\n\ndef guest_share(orders: DataFrame) -> DataFrame:\n    \"\"\"The share of orders that have no customer id.\"\"\"\n    return orders.agg((F.sum(F.when(F.col('customer_id').isNull(), 1).otherwise(0)) / F.count('*')).alias('guest_share'))",
  "code/app/transforms_bug.py": "\"\"\"A copy of transforms.py with a bug that a reviewer could miss: refunded orders are left out.\"\"\"\nfrom pyspark.sql import DataFrame\nfrom pyspark.sql import functions as F\n\n\ndef daily_revenue(orders: DataFrame) -> DataFrame:\n    return (orders.filter(F.col('status') == 'PAID')\n            .groupBy('store_id', F.to_date('order_ts').alias('day'))\n            .agg(F.count('*').alias('orders'), F.sum('total_cents').alias('revenue_cents')))\n\n\ndef guest_share(orders: DataFrame) -> DataFrame:\n    return orders.agg((F.sum(F.when(F.col('customer_id').isNull(), 1).otherwise(0)) / F.count('*')).alias('guest_share'))",
  "code/errors.py": "\"\"\"Mission 14: failures that really happen, with the messages that Spark really gives. Each function triggers one failure and returns the first lines of the message.\"\"\"\nimport os\n\nfrom pyspark.sql import functions as F\nfrom pyspark.sql.functions import udf\nfrom pyspark.sql.types import IntegerType\n\n\ndef lines_of(e):\n    return [l.strip() for l in str(e).split('\\n') if l.strip()]\n\n\ndef head(e, n=1, width=240):\n    return [l[:width] for l in lines_of(e)][:n]\n\n\ndef pick(e, *needles, width=300):\n    \"\"\"The first line of the message that holds one of the needles. Spark and Py4J wrap the real message in a generic first line.\"\"\"\n    for l in lines_of(e):\n        if any(x in l for x in needles):\n            return l[:width]\n    return head(e, 1, width)[0]\n\n\ndef unresolved_column(spark, path):\n    try:\n        spark.read.parquet(path).select('total_cent').collect()\n    except Exception as e:  # noqa: BLE001\n        return [pick(e, 'UNRESOLVED_COLUMN', width=300)]\n\n\ndef result_too_big(run, path):\n    \"\"\"collect() brings every row to the driver. With a small spark.driver.maxResultSize the job is stopped before the driver runs out of memory.\"\"\"\n    spark = run.spark\n    try:\n        spark.read.parquet(path).collect()\n    except Exception as e:  # noqa: BLE001\n        return [pick(e, 'maxResultSize', width=330)]\n\n\ndef python_error_in_udf(spark):\n    f = udf(lambda x: 10 // x, IntegerType())\n    try:\n        spark.createDataFrame([(5,), (0,)], 'x int').select(f('x')).collect()\n    except Exception as e:  # noqa: BLE001\n        return [pick(e, 'ZeroDivisionError')]\n\n\ndef type_mismatch_on_read(spark, out):\n    \"\"\"Two files of one dataset disagree on a type: one has order_id as a number and one as text.\"\"\"\n    a = spark.createDataFrame([(1, 100)], 'order_id long, total_cents int')\n    b = spark.createDataFrame([('2', 200)], 'order_id string, total_cents int')\n    a.write.mode('overwrite').parquet(os.path.join(out, 'mix', 'a'))\n    b.write.mode('overwrite').parquet(os.path.join(out, 'mix', 'b'))\n    try:\n        spark.read.schema('order_id long, total_cents int').parquet(os.path.join(out, 'mix', 'a'), os.path.join(out, 'mix', 'b')).collect()\n    except Exception as e:  # noqa: BLE001\n        return [pick(e, 'FAILED_READ_FILE', 'cannot be converted', width=330)]\n\n\ndef corrupt_file(spark, out):\n    \"\"\"One file in the folder is not Parquet. By default the read fails. With ignoreCorruptFiles it is skipped, silently.\"\"\"\n    path = os.path.join(out, 'corrupt')\n    spark.createDataFrame([(i, 100 + i) for i in range(1000)], 'order_id long, total_cents int').coalesce(2).write.mode('overwrite').parquet(path)\n    with open(os.path.join(path, 'part-99999-garbage.snappy.parquet'), 'wb') as f:\n        f.write(b'this is not a parquet file')\n    res = {}\n    try:\n        res['default'] = spark.read.parquet(path).count()\n    except Exception as e:  # noqa: BLE001\n        res['default'] = pick(e, 'Parquet', 'footer', 'corrupt', width=240)\n    spark.conf.set('spark.sql.files.ignoreCorruptFiles', 'true')\n    res['ignoreCorruptFiles=true'] = spark.read.parquet(path).count()\n    spark.conf.unset('spark.sql.files.ignoreCorruptFiles')\n    return res\n\n\ndef flaky_task(run, marker_dir):\n    \"\"\"A task that fails on its first attempt and works on the second. With spark.task.maxFailures at 4 (the cluster default) Spark runs it again and the job succeeds.\n    In local mode the default is 1, so the same job fails, unless the master is written local[2,4]. Returns the first line of the error, or None when the job succeeded.\"\"\"\n    spark = run.spark\n    if os.path.exists(marker_dir):\n        for f in os.listdir(marker_dir):\n            os.remove(os.path.join(marker_dir, f))\n    os.makedirs(marker_dir, exist_ok=True)\n\n    def flaky(x):\n        marker = os.path.join(marker_dir, 'tried-once')\n        if not os.path.exists(marker):\n            open(marker, 'w').close()\n            raise RuntimeError('the first attempt fails')\n        return x\n\n    f = udf(flaky, IntegerType())\n    spark.sparkContext.setJobGroup('flaky', 'flaky task')\n    try:\n        spark.range(0, 100, 1, 1).select(f(F.col('id').cast('int'))).collect()\n        return None\n    except Exception as e:  # noqa: BLE001\n        return [pick(e, 'RuntimeError: ')]",
  "code/joins.py": "\"\"\"Mission 4: how Spark joins two tables. The plans and the counts are real. The join that Spark picks depends on the size of the tables, the hints, and the settings.\"\"\"\nimport re\n\nfrom pyspark.sql import functions as F\n\nimport session as S\n\nJOIN_LINES = re.compile(r'(BroadcastHashJoin|SortMergeJoin|ShuffledHashJoin|BroadcastNestedLoopJoin|CartesianProduct|BroadcastExchange|Exchange |Sort \\[|AdaptiveSparkPlan)')\n\n\ndef join_lines(plan):\n    \"\"\"Only the lines of a plan that show how the join was done.\"\"\"\n    return '\\n'.join(l.rstrip() for l in plan.splitlines() if JOIN_LINES.search(l))\n\n\ndef scenarios(spark, paths):\n    \"\"\"One join of the orders to a small table, planned five ways.\"\"\"\n    o, s = spark.read.parquet(paths['orders']), spark.read.parquet(paths['stores'])\n    tiers = spark.createDataFrame([(0, 'small'), (1000, 'medium'), (2500, 'large')], 'min_cents int, size string')\n    out = {}\n    spark.conf.set('spark.sql.adaptive.enabled', 'false')\n    out['stores is small: the default'] = S.plan_text(o.join(s, 'store_id'), 'simple')\n    spark.conf.set('spark.sql.autoBroadcastJoinThreshold', '-1')\n    out['broadcast turned off'] = S.plan_text(o.join(s, 'store_id'), 'simple')\n    out['hint: broadcast(stores)'] = S.plan_text(o.join(F.broadcast(s), 'store_id'), 'simple')\n    out['hint: shuffle_hash on stores'] = S.plan_text(o.join(s.hint('shuffle_hash'), 'store_id'), 'simple')\n    out['a range condition, not equality'] = S.plan_text(o.join(F.broadcast(tiers), o.total_cents >= tiers.min_cents), 'simple')\n    spark.conf.set('spark.sql.autoBroadcastJoinThreshold', '10485760')\n    out['a range condition, tiers is small'] = S.plan_text(o.join(tiers, o.total_cents >= tiers.min_cents), 'simple')\n    spark.conf.unset('spark.sql.adaptive.enabled')\n    spark.conf.unset('spark.sql.autoBroadcastJoinThreshold')\n    return out\n\n\ndef adaptive_switch(spark, paths):\n    \"\"\"With broadcast turned off at planning time, adaptive execution can still broadcast at run time, once it knows the real size after a filter.\"\"\"\n    o, c = spark.read.parquet(paths['orders']), spark.read.parquet(paths['customers'])\n    spark.conf.set('spark.sql.autoBroadcastJoinThreshold', '-1')\n    spark.conf.set('spark.sql.adaptive.autoBroadcastJoinThreshold', '10485760')\n    q = o.join(c.filter(\"loyalty_tier = 'gold'\"), 'customer_id')\n    before = S.plan_text(q, 'simple')\n    q.collect()\n    after = S.plan_text(q, 'simple')\n    spark.conf.unset('spark.sql.autoBroadcastJoinThreshold')\n    spark.conf.unset('spark.sql.adaptive.autoBroadcastJoinThreshold')\n    return before, after\n\n\ndef counts(spark, paths):\n    \"\"\"What joins do to the number of rows: repeated keys, missing keys, null keys, and semi and anti joins.\"\"\"\n    o, s, c = spark.read.parquet(paths['orders']), spark.read.parquet(paths['stores']), spark.read.parquet(paths['customers'])\n    stores_twice = s.union(s)\n    one_null = spark.createDataFrame([(None, 'none', 1990)], 'customer_id string, loyalty_tier string, birth_year int')\n    c_with_null = c.union(one_null)\n    o.createOrReplaceTempView('orders_t')\n    c.createOrReplaceTempView('customers_t')\n    return {\n        'orders': o.count(), 'orders_without_customer_id': o.filter(F.col('customer_id').isNull()).count(),\n        'inner_to_stores': o.join(s, 'store_id').count(),\n        'inner_to_stores_listed_twice': o.join(stores_twice, 'store_id').count(),\n        'inner_to_customers': o.join(c, 'customer_id').count(),\n        'left_to_customers': o.join(c, 'customer_id', 'left').count(),\n        'null_safe_to_a_null_row': o.join(c_with_null, o.customer_id.eqNullSafe(c_with_null.customer_id)).count(),\n        'customers': c.count(),\n        'customers_with_orders_semi': c.join(o, 'customer_id', 'left_semi').count(),\n        'customers_without_orders_anti': c.join(o, 'customer_id', 'left_anti').count(),\n        'not_in_customers_without_orders': spark.sql('SELECT count(*) FROM customers_t WHERE customer_id NOT IN (SELECT customer_id FROM orders_t)').collect()[0][0],\n        'not_exists_customers_without_orders': spark.sql('SELECT count(*) FROM customers_t c WHERE NOT EXISTS (SELECT 1 FROM orders_t o WHERE o.customer_id = c.customer_id)').collect()[0][0],\n    }\n\n\ndef filter_goes_down(spark, paths):\n    \"\"\"A filter written after a join is moved below it by the optimizer, so the join sees fewer rows. Only the lines that show where the filter sits are kept.\"\"\"\n    o, s = spark.read.parquet(paths['orders']), spark.read.parquet(paths['stores'])\n    spark.conf.set('spark.sql.adaptive.enabled', 'false')\n    spark.conf.set('spark.sql.autoBroadcastJoinThreshold', '-1')\n    q = o.join(s, 'store_id').filter(F.col('country') == 'SG')\n    optimized = S.plan_text(q, 'extended').split('== Optimized Logical Plan ==')[1].split('== Physical Plan ==')[0]\n    spark.conf.unset('spark.sql.adaptive.enabled')\n    spark.conf.unset('spark.sql.autoBroadcastJoinThreshold')\n    return optimized.strip()",
  "code/layout.py": "\"\"\"Mission 7: files and layout. File counts and sizes are measured on disk, and the bytes a query reads are taken from the event log.\"\"\"\nimport glob\nimport os\n\nfrom pyspark.sql import functions as F\n\n\ndef parquet_files(path):\n    return sorted(glob.glob(os.path.join(path, '**', '*.parquet'), recursive=True))\n\n\ndef size_kb(path):\n    \"\"\"Total size of the Parquet files under path, rounded to 10 KB, because the exact size changes by a few hundred bytes between runs.\"\"\"\n    return int(round(sum(os.path.getsize(f) for f in parquet_files(path)) / 1024, -1))\n\n\ndef write_variants(spark, paths, out):\n    \"\"\"The same 400,000 orders written six ways. The number of files is the number of tasks that wrote, times the number of folders that each task wrote to.\"\"\"\n    o = spark.read.parquet(paths['orders']).drop('dt').withColumn('dt', F.to_date('order_ts'))\n    cases = [\n        ('one task: coalesce(1)', lambda w: o.coalesce(1).write),\n        ('200 tasks: repartition(200)', lambda w: o.repartition(200).write),\n        ('folder for each day, 200 tasks after a shuffle', lambda w: o.repartition(200).write.partitionBy('dt')),\n        ('folder for each day, no shuffle', lambda w: o.write.partitionBy('dt')),\n        ('folder for each day, repartition by day', lambda w: o.repartition(14, 'dt').write.partitionBy('dt')),\n        ('folder for each store and day, no repartition', lambda w: o.write.partitionBy('store_id', 'dt')),\n        ('at most 50,000 rows in a file', lambda w: o.coalesce(1).write.option('maxRecordsPerFile', 50000)),\n    ]\n    rows = []\n    for i, (label, make) in enumerate(cases):\n        target = os.path.join(out, 'variant-%d' % i)\n        make(None).mode('overwrite').parquet(target)\n        n = len(parquet_files(target))\n        kb = size_kb(target)\n        rows.append((label, n, kb, round(kb / n, 1)))\n    return rows\n\n\ndef files_touched(spark, path, condition):\n    \"\"\"How many files a query opens, counted with input_file_name().\"\"\"\n    return spark.read.parquet(path).filter(condition).select(F.input_file_name().alias('f')).distinct().count()\n\n\ndef codecs(spark, paths, out):\n    o = spark.read.parquet(paths['orders']).drop('dt').coalesce(2)\n    rows = []\n    for c in ('none', 'snappy', 'gzip', 'zstd'):\n        target = os.path.join(out, 'codec-' + c)\n        o.write.option('compression', c).mode('overwrite').parquet(target)\n        rows.append((c, size_kb(target)))\n    return rows\n\n\ndef row_group_skipping(run, paths, out):\n    \"\"\"Files written with small row groups, sorted or not. A filter on the sorted column skips row groups, and the bytes read show it.\"\"\"\n    spark = run.spark\n    o = spark.read.parquet(paths['orders']).drop('dt').select('order_id', 'store_id', 'status', 'total_cents', 'order_ts')\n    for label, df in (('sorted', o.orderBy('order_id')), ('shuffled', o.orderBy(F.xxhash64('order_id')))):\n        df.coalesce(1).write.option('parquet.block.size', 262144).mode('overwrite').parquet(os.path.join(out, 'rg-' + label))\n    for label in ('sorted', 'shuffled'):\n        for push in ('true', 'false'):\n            spark.conf.set('spark.sql.parquet.filterPushdown', push)\n            group = 'rg-%s-%s' % (label, push)\n            spark.sparkContext.setJobGroup(group, group)\n            spark.read.parquet(os.path.join(out, 'rg-' + label)).filter('order_id BETWEEN 1000 AND 1999').agg(F.sum('total_cents')).collect()\n    spark.conf.unset('spark.sql.parquet.filterPushdown')\n    spark.sparkContext.setJobGroup('', '')\n\n\ndef schema_evolution(spark, out):\n    \"\"\"Two batches with different columns. By default Spark reads the schema from one file, so the new column can be missing.\"\"\"\n    a = spark.createDataFrame([(1, 1200), (2, 900)], 'order_id long, total_cents int')\n    b = spark.createDataFrame([(3, 1500, 'app'), (4, 700, 'pos')], 'order_id long, total_cents int, channel string')\n    a.write.mode('overwrite').parquet(os.path.join(out, 'evo', 'batch=1'))\n    b.write.mode('overwrite').parquet(os.path.join(out, 'evo', 'batch=2'))\n    plain = spark.read.parquet(os.path.join(out, 'evo'))\n    merged = spark.read.option('mergeSchema', 'true').parquet(os.path.join(out, 'evo'))\n    return plain.columns, merged.columns, merged.orderBy('order_id').collect()\n\n\ndef bucketing(spark, paths):\n    \"\"\"A join of two tables that were both bucketed by customer on write needs no exchange. Without buckets it shuffles both sides.\"\"\"\n    from session import norm  # noqa: F401  (plans are normalised by the caller)\n    o = spark.read.parquet(paths['orders']).drop('dt')\n    c = spark.read.parquet(paths['customers'])\n    spark.conf.set('spark.sql.autoBroadcastJoinThreshold', '-1')\n    spark.conf.set('spark.sql.adaptive.enabled', 'false')\n    o.write.bucketBy(8, 'customer_id').sortBy('customer_id').mode('overwrite').saveAsTable('orders_bucketed')\n    c.write.bucketBy(8, 'customer_id').sortBy('customer_id').mode('overwrite').saveAsTable('customers_bucketed')\n    plain = o.join(c, 'customer_id')\n    bucketed = spark.table('orders_bucketed').join(spark.table('customers_bucketed'), 'customer_id')\n    from session import plan_text\n    out = {'without buckets': plan_text(plain, 'simple').count('Exchange'), 'bucketed on customer_id': plan_text(bucketed, 'simple').count('Exchange'),\n           'bucketed plan': plan_text(bucketed, 'simple')}\n    spark.conf.unset('spark.sql.autoBroadcastJoinThreshold')\n    spark.conf.unset('spark.sql.adaptive.enabled')\n    return out\n\n\ndef overwrite_modes(spark, out):\n    \"\"\"A daily job rewrites one day of a table that holds three days. With the default static mode the whole table is replaced by that one day. With dynamic mode only the day in the data is replaced.\"\"\"\n    result = {'default_mode': spark.conf.get('spark.sql.sources.partitionOverwriteMode')}\n    for mode in ('static', 'dynamic'):\n        target = os.path.join(out, 'overwrite-' + mode)\n        spark.range(30).select('id', (F.col('id') % 3).alias('day')).write.partitionBy('day').mode('overwrite').parquet(target)\n        before = sorted(d for d in os.listdir(target) if d.startswith('day='))\n        spark.conf.set('spark.sql.sources.partitionOverwriteMode', mode)\n        spark.range(100, 105).select('id', F.lit(1).alias('day')).write.partitionBy('day').mode('overwrite').parquet(target)\n        after = sorted(d for d in os.listdir(target) if d.startswith('day='))\n        result[mode] = {'folders_before': before, 'folders_after': after, 'rows_after': spark.read.parquet(target).count()}\n        spark.conf.unset('spark.sql.sources.partitionOverwriteMode')\n    return result",
  "code/memory.py": "\"\"\"Mission 6: memory, caching and spill. Sizes come from the running JVM and from the event log. A forced spill is labelled as forced.\"\"\"\nfrom pyspark.sql import functions as F\n\nimport session as S\n\nRESERVED = 300 * 1024 * 1024\n\n\ndef jvm_memory(spark):\n    \"\"\"What the JVM was given, and what Spark's memory manager reports it can hold for storage: (max heap, reported storage maximum).\"\"\"\n    sc = spark.sparkContext\n    heap = sc._jvm.java.lang.Runtime.getRuntime().maxMemory()\n    status = sc._jsc.sc().getExecutorMemoryStatus()\n    reported = int(status.values().head()._1())\n    return heap, reported\n\n\ndef formula(heap, fraction=0.6):\n    \"\"\"The documented rule: Spark keeps 300 MiB for itself, and shares fraction of the rest between execution and storage.\"\"\"\n    return int((heap - RESERVED) * fraction)\n\n\ndef cache_demo(spark, path):\n    \"\"\"cache() does nothing until an action runs. After that the data sits in memory, and the next query does not read the files.\"\"\"\n    sc = spark.sparkContext\n    df = spark.read.parquet(path).filter(\"status = 'PAID'\")\n    df.cache()\n    sc.setJobGroup('before-cache-action', 'before')\n    plan_before = S.plan_text(df, 'simple')\n    sc.setJobGroup('first-count', 'first count')\n    df.count()\n    sc.setJobGroup('second-count', 'second count')\n    df.count()\n    sc.setJobGroup('', '')\n    info = [(i.storageLevel().description(), i.numCachedPartitions(), i.memSize(), i.diskSize()) for i in sc._jsc.sc().getRDDStorageInfo()]\n    plan_after = S.plan_text(df.groupBy('store_id').count(), 'simple')\n    df.unpersist(True)\n    left = len(sc._jsc.sc().getRDDStorageInfo())\n    return plan_before, plan_after, info, left\n\n\ndef storage_levels(spark, path):\n    \"\"\"The same data held three ways. The size depends on the level: columnar and compressed in memory, or on disk.\"\"\"\n    from pyspark import StorageLevel\n    sc = spark.sparkContext\n    out = []\n    for name, level in (('MEMORY_ONLY', StorageLevel.MEMORY_ONLY), ('MEMORY_AND_DISK', StorageLevel.MEMORY_AND_DISK), ('DISK_ONLY', StorageLevel.DISK_ONLY)):\n        df = spark.read.parquet(path).select('order_id', 'store_id', 'total_cents', 'status')\n        df.persist(level)\n        sc.setJobGroup('', '')\n        df.count()\n        info = [i for i in sc._jsc.sc().getRDDStorageInfo()]\n        out.append((name, sum(i.memSize() for i in info), sum(i.diskSize() for i in info)))\n        df.unpersist(True)\n    return out\n\n\ndef forced_spill(run, path):\n    \"\"\"A sort in a session that was started with spark.shuffle.spill.numElementsForceSpillThreshold=20000, which forces a spill after 20,000 rows held in memory.\n    That setting is read when the session starts, so the caller starts the session with it. The numbers come from the task metrics of the event log.\"\"\"\n    spark = run.spark\n    spark.conf.set('spark.sql.adaptive.enabled', 'false')\n    spark.conf.set('spark.sql.shuffle.partitions', '4')\n    spark.sparkContext.setJobGroup('sort-with-spill', 'sort')\n    spark.read.parquet(path).orderBy('total_cents', 'order_id').write.format('noop').mode('overwrite').save()\n    spark.conf.set('spark.sql.adaptive.enabled', 'true')\n    spark.conf.set('spark.sql.shuffle.partitions', '8')",
  "code/partitions.py": "\"\"\"Mission 3: partitions, tasks and shuffles. Counts come from the event log, which is what the Spark UI is drawn from.\"\"\"\nfrom pyspark.sql import functions as F\n\nimport session as S\n\n\ndef read_partitions(spark, path, sizes):\n    \"\"\"How many partitions Spark makes when it reads the orders, for different values of maxPartitionBytes.\"\"\"\n    out = []\n    for label, b in sizes:\n        spark.conf.set('spark.sql.files.maxPartitionBytes', str(b))\n        out.append((label, spark.read.parquet(path).rdd.getNumPartitions()))\n    spark.conf.unset('spark.sql.files.maxPartitionBytes')\n    return out\n\n\ndef partition_sizes(df):\n    \"\"\"Rows in each partition, by partition number.\"\"\"\n    rows = df.groupBy(F.spark_partition_id().alias('p')).count().orderBy('p').collect()\n    return [r['count'] for r in rows]\n\n\ndef repartition_demo(spark, path):\n    \"\"\"repartition shuffles to even sizes. coalesce only merges neighbours and does not shuffle, so sizes can stay uneven.\"\"\"\n    o = spark.read.parquet(path).repartition(14, 'dt')\n    return {'start': partition_sizes(o), 'coalesce_3': partition_sizes(o.coalesce(3)), 'repartition_3': partition_sizes(o.repartition(3)),\n            'plan_coalesce': S.plan_text(o.coalesce(3), 'simple'), 'plan_repartition': S.plan_text(o.repartition(3), 'simple'),\n            'plan_repartition_by': S.plan_text(o.repartition(6, 'store_id'), 'simple')}\n\n\ndef operations(spark, path, stores):\n    \"\"\"What each kind of operation costs in stages and in shuffles (Exchange nodes in the physical plan).\"\"\"\n    o = spark.read.parquet(path)\n    s = spark.read.parquet(stores)\n    spark.conf.set('spark.sql.adaptive.enabled', 'false')\n    spark.conf.set('spark.sql.autoBroadcastJoinThreshold', '-1')\n    cases = [('filter and select', o.filter('status = \"PAID\"').select('store_id', 'total_cents')),\n             ('groupBy and sum', o.groupBy('store_id').agg(F.sum('total_cents'))),\n             ('distinct customers', o.select('customer_id').distinct()),\n             ('orderBy', o.orderBy('order_ts')),\n             ('join to stores (no broadcast)', o.join(s, 'store_id')),\n             ('window by store', o.withColumn('r', F.row_number().over(__import__('pyspark.sql.window', fromlist=['Window']).Window.partitionBy('store_id').orderBy('order_ts'))))]\n    out = []\n    for label, df in cases:\n        plan = S.plan_text(df, 'simple')\n        out.append((label, plan.count('Exchange'), plan.count('Sort ')))\n    spark.conf.unset('spark.sql.adaptive.enabled')\n    spark.conf.unset('spark.sql.autoBroadcastJoinThreshold')\n    return out\n\n\ndef shuffle_settings(run, path):\n    \"\"\"The same aggregation with 200 shuffle partitions, with 8, and with adaptive execution on. The stage after the shuffle shows how many tasks it ran.\"\"\"\n    spark = run.spark\n    results = []\n    for label, parts, aqe in (('200 partitions, adaptive off', 200, 'false'), ('8 partitions, adaptive off', 8, 'false'), ('200 partitions, adaptive on', 200, 'true')):\n        spark.conf.set('spark.sql.shuffle.partitions', str(parts))\n        spark.conf.set('spark.sql.adaptive.enabled', aqe)\n        spark.sparkContext.setJobGroup(label, label)\n        spark.read.parquet(path).groupBy('store_id').agg(F.sum('total_cents')).collect()\n        results.append(label)\n    spark.conf.set('spark.sql.shuffle.partitions', '8')\n    spark.conf.set('spark.sql.adaptive.enabled', 'true')\n    return results",
  "code/plans.py": "\"\"\"Mission 2: lazy evaluation and the plans that Spark builds. Every function runs real Spark and returns facts that the lessons quote.\"\"\"\nfrom pyspark.sql import functions as F\n\nimport session as S\n\n\ndef count_jobs(spark, steps):\n    \"\"\"Run each (label, function) in its own job group and count the jobs that it started. A transformation starts none, an action starts at least one.\"\"\"\n    sc = spark.sparkContext\n    out = []\n    for i, (label, fn) in enumerate(steps):\n        group = 'step-%d' % i\n        sc.setJobGroup(group, label)\n        fn()\n        out.append((label, len(sc.statusTracker().getJobIdsForGroup(group))))\n    sc.setJobGroup('', '')\n    return out\n\n\ndef lazy_steps(spark, path):\n    \"\"\"A pipeline written one line at a time. Nothing reads data until an action is called.\"\"\"\n    state = {}\n\n    def read():\n        state['o'] = spark.read.parquet(path)\n\n    def keep_paid():\n        state['p'] = state['o'].filter(F.col('status') == 'PAID')\n\n    def pick_columns():\n        state['c'] = state['p'].select('store_id', 'total_cents')\n\n    def group():\n        state['g'] = state['c'].groupBy('store_id').agg(F.sum('total_cents').alias('revenue'))\n\n    return count_jobs(spark, [\n        ('spark.read.parquet(path)', read),\n        ('.filter(status == \"PAID\")', keep_paid),\n        ('.select(\"store_id\", \"total_cents\")', pick_columns),\n        ('.groupBy(\"store_id\").agg(sum(total_cents))', group),\n        ('.explain()', lambda: state['g'].explain()),\n        ('.columns', lambda: state['g'].columns),\n        ('.count()', lambda: state['g'].count()),\n        ('.collect()', lambda: state['g'].collect()),\n        ('.show(3)', lambda: state['g'].show(3)),\n        ('.write.mode(\"overwrite\").parquet(out)', lambda: state['g'].write.mode('overwrite').parquet(path + '_revenue')),\n    ])\n\n\ndef plans_of(spark, path):\n    \"\"\"The four plans of one query: parsed, analyzed, optimized and physical. The same query goes through all four.\"\"\"\n    o = spark.read.parquet(path)\n    q = (o.filter(F.col('status') == 'PAID').filter(F.col('dt') >= '2026-11-05')\n         .select('store_id', 'total_cents').groupBy('store_id').agg(F.sum('total_cents').alias('revenue')))\n    return q, S.plan_text(q, 'extended'), S.plan_text(q, 'formatted')\n\n\ndef sql_and_dataframe(spark, path):\n    \"\"\"The same question asked in SQL and in the DataFrame API. Both give the same optimized plan.\"\"\"\n    spark.read.parquet(path).createOrReplaceTempView('orders')\n    sql = spark.sql(\"SELECT store_id, SUM(total_cents) AS revenue FROM orders WHERE status = 'PAID' GROUP BY store_id\")\n    api = spark.table('orders').where(\"status = 'PAID'\").groupBy('store_id').agg(F.sum('total_cents').alias('revenue'))\n    return sql, api\n\n\ndef optimizer_example(spark):\n    \"\"\"Constant folding, and filters that move: the optimized plan is not the plan that you wrote.\"\"\"\n    df = spark.range(10).withColumn('x', F.col('id') * (F.lit(2) + F.lit(3))).filter(F.col('x') > 10).filter(F.col('id') < 9)\n    return df",
  "code/session.py": "\"\"\"Shared helpers for the Spark course: a local session with an event log, the made-up Brewline data, and two readers (plans and event logs).\n\nEverything here runs the real Apache Spark in local mode. The event log is what the Spark UI is drawn from, so the tables that the lessons show\n(tasks in a stage, bytes read by a shuffle, bytes spilled) are real numbers of real runs. Nothing is timed: times differ between runs and between machines.\n\"\"\"\nimport glob\nimport json\nimport os\nimport re\nimport shutil\nimport statistics\nimport sys\nimport tempfile\n\nfrom pyspark.sql import SparkSession\nfrom pyspark.sql import functions as F\n\nos.environ['PYTHONPATH'] = os.path.dirname(os.path.abspath(__file__)) + os.pathsep + os.environ.get('PYTHONPATH', '')   # Python workers must be able to import the modules that define UDFs\n\nos.environ['PYSPARK_PYTHON'] = sys.executable                                                                                                 # the Python workers use the same interpreter as the driver\n\nBASE = {'spark.ui.enabled': 'false', 'spark.driver.bindAddress': '127.0.0.1', 'spark.driver.host': '127.0.0.1', 'spark.sql.session.timeZone': 'UTC',\n        'spark.sql.shuffle.partitions': '8', 'spark.default.parallelism': '4', 'spark.sql.warehouse.dir': None, 'spark.ui.showConsoleProgress': 'false'}\n\n\nclass Run:\n    \"\"\"A local Spark session that writes an event log, so that a run can be read back like the Spark UI.\"\"\"\n\n    def __init__(self, name, work, cores=4, master=None, **conf):\n        self.work = work\n        self.logdir = os.path.join(work, 'eventlog-' + name)\n        shutil.rmtree(self.logdir, ignore_errors=True)\n        os.makedirs(self.logdir)\n        b = SparkSession.builder.master(master or 'local[%d]' % cores).appName(name)\n        settings = dict(BASE)\n        settings['spark.sql.warehouse.dir'] = os.path.join(work, 'warehouse-' + name)\n        settings.update({'spark.eventLog.enabled': 'true', 'spark.eventLog.dir': 'file://' + self.logdir, 'spark.eventLog.compress': 'false'})\n        settings.update({k.replace('__', '.'): str(v) for k, v in conf.items()})\n        for k, v in settings.items():\n            b = b.config(k, v)\n        self.spark = b.getOrCreate()\n        self.spark.sparkContext.setLogLevel('OFF')\n\n    def stop(self):\n        self.spark.stop()\n\n    def events(self):\n        \"\"\"All events of the log so far (the log is flushed when the session stops, so stop first or call this after stop()).\"\"\"\n        out = []\n        for f in sorted(glob.glob(os.path.join(self.logdir, '*', 'events_*'))):\n            for line in open(f):\n                out.append(json.loads(line))\n        return out\n\n\ndef stages(events):\n    \"\"\"One row for each completed stage: id, name, tasks, and the min, median and max of the records and bytes that its tasks read and wrote.\"\"\"\n    tasks = {}\n    names = {}\n    for e in events:\n        if e['Event'] == 'SparkListenerStageSubmitted':\n            si = e['Stage Info']\n            names[si['Stage ID']] = si['Stage Name']\n        if e['Event'] == 'SparkListenerTaskEnd' and e['Task Info'].get('Failed') is False:\n            m = e.get('Task Metrics') or {}\n            sr, sw, inp = m.get('Shuffle Read Metrics', {}), m.get('Shuffle Write Metrics', {}), m.get('Input Metrics', {})\n            tasks.setdefault((e['Stage ID'], e['Stage Attempt ID']), []).append({\n                'in_bytes': inp.get('Bytes Read', 0), 'in_records': inp.get('Records Read', 0),\n                'sr_bytes': sr.get('Remote Bytes Read', 0) + sr.get('Local Bytes Read', 0), 'sr_records': sr.get('Total Records Read', 0),\n                'sw_bytes': sw.get('Shuffle Bytes Written', 0), 'sw_records': sw.get('Shuffle Records Written', 0),\n                'spill_mem': m.get('Memory Bytes Spilled', 0), 'spill_disk': m.get('Disk Bytes Spilled', 0)})\n    rows = []\n    for (sid, att), ts in sorted(tasks.items()):\n        def agg(key):\n            v = [t[key] for t in ts]\n            return {'min': min(v), 'median': statistics.median(v), 'max': max(v), 'sum': sum(v)}\n        rows.append({'stage': sid, 'attempt': att, 'name': names.get(sid, ''), 'tasks': len(ts), 'input_bytes': agg('in_bytes'), 'input_records': agg('in_records'),\n                     'shuffle_read_bytes': agg('sr_bytes'), 'shuffle_read_records': agg('sr_records'), 'shuffle_write_bytes': agg('sw_bytes'), 'shuffle_write_records': agg('sw_records'),\n                     'spilled_memory': agg('spill_mem')['sum'], 'spilled_disk': agg('spill_disk')['sum']})\n    return rows\n\n\ndef group_stages(events):\n    \"\"\"The completed stages of each job group (setJobGroup), in the order that they ran. This ties a stage of the event log to the line of code that started it.\"\"\"\n    by_stage = {r['stage']: r for r in stages(events)}\n    out = {}\n    for e in events:\n        if e['Event'] == 'SparkListenerJobStart':\n            g = (e.get('Properties') or {}).get('spark.jobGroup.id')\n            if g:\n                out.setdefault(g, []).extend(by_stage[i] for i in sorted(e['Stage IDs']) if i in by_stage)\n    return out\n\n\ndef jobs(events):\n    \"\"\"The jobs of the log: how many stages and tasks each had.\"\"\"\n    out = {}\n    for e in events:\n        if e['Event'] == 'SparkListenerJobStart':\n            out[e['Job ID']] = {'job': e['Job ID'], 'stages': len(e['Stage IDs']), 'tasks': sum(s['Number of Tasks'] for s in e['Stage Infos'])}\n    return [out[k] for k in sorted(out)]\n\n\ndef sql_executions(events):\n    return [e for e in events if e['Event'].endswith('SparkListenerSQLExecutionStart')]\n\n\ndef plan_text(df, mode='formatted'):\n    \"\"\"The plan that explain(mode) prints, as a string. Modes: simple, extended, formatted, cost, codegen.\"\"\"\n    return df._sc._jvm.PythonSQLUtils.explainString(df._jdf.queryExecution(), mode)\n\n\ndef norm(text, work=None):\n    \"\"\"Make a plan the same on every run: expression ids and plan ids are numbered in order of appearance, and the temporary folder is cut from every path.\"\"\"\n    seen = {}\n\n    def ids(m):\n        k = m.group(1)\n        seen.setdefault(k, '#%d' % (len(seen) + 1))\n        return seen[k] + (m.group(2) or '')\n    text = re.sub(r'(#\\d+)(L?)', ids, text)\n    text = re.sub(r'plan_id=\\d+', 'plan_id=N', text)\n    if work:\n        text = text.replace('file:' + work, '').replace(work, '')\n    return text\n\n\n# ---------------------------------------------------------------------------------------------------------------------------------------------------\n# The made-up Brewline data. Everything is computed from the row number with a hash, so every run writes the same files.\n# ---------------------------------------------------------------------------------------------------------------------------------------------------\nSTORES = ['s01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10', 's11', 's12']\nCITY = {'s01': ('Singapore', 'SG'), 's02': ('Singapore', 'SG'), 's03': ('Kuala Lumpur', 'MY'), 's04': ('Kuala Lumpur', 'MY'), 's05': ('Jakarta', 'ID'), 's06': ('Jakarta', 'ID'),\n        's07': ('Surabaya', 'ID'), 's08': ('Bangkok', 'TH'), 's09': ('Ho Chi Minh City', 'VN'), 's10': ('Hanoi', 'VN'), 's11': ('Manila', 'PH'), 's12': ('Penang', 'MY')}\nN_ORDERS = 400_000\nN_CUSTOMERS = 5_000\nNEW_CUSTOMERS = 250                      # signed up, never ordered: they are in the customers table and in no order\nDAYS = 14\n\n\ndef u(col, salt):\n    \"\"\"A number between 0 and 1 that depends on the column and a salt, and on nothing else.\"\"\"\n    return (F.abs(F.xxhash64(col, F.lit(salt))) % F.lit(1_000_000)) / F.lit(1_000_000.0)\n\n\ndef orders_df(spark, n=N_ORDERS):\n    i = F.col('id')\n    r_store = u(i, 11)\n    store = (F.when(r_store < 0.34, 's01').when(r_store < 0.42, 's02').when(r_store < 0.50, 's03').when(r_store < 0.58, 's04').when(r_store < 0.66, 's05').when(r_store < 0.73, 's06')\n             .when(r_store < 0.79, 's07').when(r_store < 0.85, 's08').when(r_store < 0.90, 's09').when(r_store < 0.94, 's10').when(r_store < 0.97, 's11').otherwise('s12'))\n    r_status = u(i, 13)\n    status = F.when(r_status < 0.80, 'PAID').when(r_status < 0.88, 'NEW').when(r_status < 0.95, 'REFUNDED').otherwise('CANCELLED')\n    r_ch = u(i, 17)\n    channel = F.when(r_ch < 0.55, 'app').when(r_ch < 0.80, 'pos').otherwise('web')\n    guest = u(i, 19) < 0.25\n    cust = F.when(guest, F.lit(None)).otherwise(F.concat(F.lit('c'), F.lpad((F.abs(F.xxhash64(i, F.lit(23))) % F.lit(N_CUSTOMERS) + 1).cast('string'), 5, '0')))\n    ts = F.timestamp_seconds(F.lit(1_793_491_200) + (u(i, 29) * F.lit(DAYS * 86400)).cast('long'))\n    total = (F.lit(300) + (u(i, 31) * F.lit(3000)).cast('int')).cast('int')\n    return (spark.range(0, n).select((i + 1).alias('order_id'), store.alias('store_id'), cust.alias('customer_id'), ts.alias('order_ts'), status.alias('status'),\n                                     channel.alias('channel'), total.alias('total_cents')).withColumn('dt', F.to_date('order_ts')))\n\n\ndef stores_df(spark):\n    rows = [(s, CITY[s][0], CITY[s][1]) for s in STORES]\n    return spark.createDataFrame(rows, 'store_id string, city string, country string')\n\n\ndef customers_df(spark, n=N_CUSTOMERS + NEW_CUSTOMERS):\n    i = F.col('id')\n    tier = F.when(u(i, 41) < 0.6, 'none').when(u(i, 41) < 0.85, 'silver').otherwise('gold')\n    return spark.range(1, n + 1).select(F.concat(F.lit('c'), F.lpad(i.cast('string'), 5, '0')).alias('customer_id'), tier.alias('loyalty_tier'),\n                                        (F.lit(1960) + (u(i, 43) * 45).cast('int')).alias('birth_year'))\n\n\ndef write_world(spark, root):\n    \"\"\"Write the three datasets as Parquet under root, and return their paths. Orders are written one folder per day.\"\"\"\n    paths = {k: os.path.join(root, k) for k in ('orders', 'stores', 'customers')}\n    orders_df(spark).repartition(14, 'dt').write.mode('overwrite').partitionBy('dt').parquet(paths['orders'])\n    stores_df(spark).coalesce(1).write.mode('overwrite').parquet(paths['stores'])\n    customers_df(spark).coalesce(1).write.mode('overwrite').parquet(paths['customers'])\n    return paths",
  "code/skew.py": "\"\"\"Mission 5: skew, adaptive execution and salting. The numbers are the records that each task of a stage read, taken from the event log.\"\"\"\nfrom pyspark.sql import Window\nfrom pyspark.sql import functions as F\n\nimport session as S\n\n\ndef hot_partition(run, path):\n    \"\"\"A window over each store: every row of a store must reach one task, and nothing can be added up first, so the hot store makes a hot task.\"\"\"\n    spark = run.spark\n    spark.conf.set('spark.sql.adaptive.enabled', 'false')\n    spark.conf.set('spark.sql.shuffle.partitions', '12')\n    spark.sparkContext.setJobGroup('window-by-store', 'window by store')\n    w = Window.partitionBy('store_id')\n    spark.read.parquet(path).withColumn('store_total', F.sum('total_cents').over(w)).agg(F.sum('store_total')).collect()\n    spark.conf.set('spark.sql.adaptive.enabled', 'true')\n    spark.conf.set('spark.sql.shuffle.partitions', '8')\n\n\ndef counting_is_safe(run, path):\n    \"\"\"A plain count by store shuffles one small row for each store and each map task, because Spark adds up inside each task first. The hot store does no harm.\"\"\"\n    spark = run.spark\n    spark.conf.set('spark.sql.adaptive.enabled', 'false')\n    spark.conf.set('spark.sql.shuffle.partitions', '12')\n    spark.sparkContext.setJobGroup('count-by-store', 'count by store')\n    spark.read.parquet(path).groupBy('store_id').count().collect()\n    spark.conf.set('spark.sql.adaptive.enabled', 'true')\n    spark.conf.set('spark.sql.shuffle.partitions', '8')\n\n\ndef lowered_settings(spark, skew_join):\n    \"\"\"The limits are lowered so that 400,000 rows behave the way that 400 million would: a partition is skewed when it is 3 times the median and over 200 KB.\"\"\"\n    spark.conf.set('spark.sql.autoBroadcastJoinThreshold', '-1')\n    spark.conf.set('spark.sql.adaptive.autoBroadcastJoinThreshold', '-1')\n    spark.conf.set('spark.sql.shuffle.partitions', '12')\n    spark.conf.set('spark.sql.adaptive.enabled', 'true')\n    spark.conf.set('spark.sql.adaptive.coalescePartitions.enabled', 'false')\n    spark.conf.set('spark.sql.adaptive.skewJoin.enabled', 'true' if skew_join else 'false')\n    spark.conf.set('spark.sql.adaptive.skewJoin.skewedPartitionFactor', '3')\n    spark.conf.set('spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes', '200k')\n    spark.conf.set('spark.sql.adaptive.advisoryPartitionSizeInBytes', '300k')\n\n\ndef reset(spark):\n    for k in ('spark.sql.autoBroadcastJoinThreshold', 'spark.sql.adaptive.autoBroadcastJoinThreshold', 'spark.sql.adaptive.coalescePartitions.enabled', 'spark.sql.adaptive.skewJoin.enabled',\n              'spark.sql.adaptive.skewJoin.skewedPartitionFactor', 'spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes', 'spark.sql.adaptive.advisoryPartitionSizeInBytes'):\n        spark.conf.unset(k)\n    spark.conf.set('spark.sql.shuffle.partitions', '8')\n\n\ndef join_three_ways(run, paths):\n    \"\"\"The orders joined to the stores, with broadcast switched off so that both sides are shuffled by store. Plain, with the adaptive skew join, and with a salt.\"\"\"\n    spark = run.spark\n    o, s = spark.read.parquet(paths['orders']), spark.read.parquet(paths['stores'])\n    plans = {}\n    for mode in ('plain', 'adaptive', 'salted'):\n        lowered_settings(spark, skew_join=(mode == 'adaptive'))\n        spark.sparkContext.setJobGroup('join-' + mode, 'join ' + mode)\n        if mode == 'salted':\n            k = 4\n            left = o.withColumn('salt', (F.abs(F.xxhash64('order_id')) % k).cast('int'))\n            right = s.withColumn('salt', F.explode(F.array(*[F.lit(i) for i in range(k)])))\n            q = left.join(right, ['store_id', 'salt'])\n        else:\n            q = o.join(s, 'store_id')\n        n = len(q.collect())\n        plans[mode] = (n, S.plan_text(q, 'simple'))\n        reset(spark)\n    return plans",
  "code/sqlfun.py": "\"\"\"Mission 8: Spark SQL, window functions and ANSI mode. Every result and every error message is real output of Spark 4.0.1.\"\"\"\nfrom pyspark.sql import functions as F\n\nANSI_CASES = [\n    (\"CAST('abc' AS INT)\", \"SELECT CAST('abc' AS INT) AS v\"),\n    ('1 / 0', 'SELECT 1 / 0 AS v'),\n    ('2147483647 + 1 (an INT)', 'SELECT 2147483647 + 1 AS v'),\n    ('CAST(300 AS TINYINT)', 'SELECT CAST(300 AS TINYINT) AS v'),\n    (\"to_date('2026-13-45')\", \"SELECT to_date('2026-13-45') AS v\"),\n    ('element_at(array(1, 2), 5)', 'SELECT element_at(array(1, 2), 5) AS v'),\n    (\"try_cast('abc' AS INT)\", \"SELECT try_cast('abc' AS INT) AS v\"),\n    ('try_divide(1, 0)', 'SELECT try_divide(1, 0) AS v'),\n]\n\n\ndef first_line(e):\n    \"\"\"The first line of an error: the error class and the message, without the long stack.\"\"\"\n    return str(e).strip().split('\\n')[0][:200]\n\n\ndef ansi_table(spark):\n    \"\"\"Each expression, with ANSI mode on (the default in Spark 4) and off: the value, or the error.\"\"\"\n    out = []\n    for label, sql in ANSI_CASES:\n        row = [label]\n        for mode in ('true', 'false'):\n            spark.conf.set('spark.sql.ansi.enabled', mode)\n            try:\n                v = spark.sql(sql).collect()[0]['v']\n                row.append('NULL' if v is None else str(v))\n            except Exception as e:  # noqa: BLE001\n                row.append('error: ' + first_line(e))\n        out.append(row)\n    spark.conf.set('spark.sql.ansi.enabled', 'true')\n    return out\n\n\ndef qualify(spark):\n    \"\"\"QUALIFY is not in Spark 4.0.1: the way to filter on a window is a subquery.\"\"\"\n    try:\n        spark.sql('SELECT store_id, row_number() OVER (PARTITION BY store_id ORDER BY total_cents DESC) AS r FROM orders QUALIFY r = 1').collect()\n        return 'accepted'\n    except Exception as e:  # noqa: BLE001\n        return first_line(e)\n\n\ndef windows(spark):\n    \"\"\"Running totals, rank and lag on a table small enough to read, and the difference between ROWS and RANGE when two rows tie.\"\"\"\n    spark.createDataFrame([('s01', 1, 100), ('s01', 2, 150), ('s01', 3, 150), ('s01', 4, 90), ('s02', 1, 70), ('s02', 2, 80)], 'store string, day int, cents int').createOrReplaceTempView('daily')\n    tbl = [list(r) for r in spark.sql(\"\"\"\n        SELECT store, day, cents,\n               SUM(cents) OVER (PARTITION BY store ORDER BY day) AS running,\n               RANK() OVER (PARTITION BY store ORDER BY cents DESC) AS rnk,\n               LAG(cents) OVER (PARTITION BY store ORDER BY day) AS prev\n        FROM daily ORDER BY store, day\"\"\").collect()]\n    ties = [list(r) for r in spark.sql(\"\"\"\n        SELECT day, cents,\n               SUM(cents) OVER (ORDER BY cents ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS rows_frame,\n               SUM(cents) OVER (ORDER BY cents RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS range_frame\n        FROM daily WHERE store = 's01' ORDER BY cents, day\"\"\").collect()]\n    return tbl, ties\n\n\ndef groupings(spark):\n    spark.createDataFrame([('SG', 'app', 3), ('SG', 'pos', 2), ('MY', 'app', 4), ('MY', 'pos', 1), ('MY', 'pos', 5)], 'country string, channel string, n int').createOrReplaceTempView('sales')\n    rollup = [list(r) for r in spark.sql('SELECT country, channel, SUM(n) AS n, GROUPING(country) AS g_country, GROUPING(channel) AS g_channel FROM sales GROUP BY ROLLUP (country, channel) ORDER BY g_country, country, g_channel, channel').collect()]\n    pivot = [list(r) for r in spark.sql(\"SELECT * FROM sales PIVOT (SUM(n) FOR channel IN ('app', 'pos')) ORDER BY country\").collect()]\n    return rollup, pivot\n\n\ndef arrays(spark):\n    spark.createDataFrame([(1, [3, 1, 2]), (2, [5, 5]), (3, [])], 'id int, xs array<int>').createOrReplaceTempView('t')\n    cols = spark.sql(\"\"\"\n        SELECT id, xs, transform(xs, x -> x * 10) AS times10, filter(xs, x -> x > 1) AS over1, aggregate(xs, 0, (acc, x) -> acc + x) AS total, sort_array(xs) AS sorted\n        FROM t ORDER BY id\"\"\").collect()\n    exploded = [list(r) for r in spark.sql('SELECT id, x FROM t LATERAL VIEW explode(xs) e AS x ORDER BY id, x').collect()]\n    outer = [list(r) for r in spark.sql('SELECT id, x FROM t LATERAL VIEW OUTER explode(xs) e AS x ORDER BY id, x').collect()]\n    return [[str(c) for c in r] for r in cols], exploded, outer\n\n\ndef time_zone_days(spark, path):\n    \"\"\"The same orders counted by day in UTC and in Singapore (8 hours ahead): the orders of the first and last days move.\"\"\"\n    o = spark.read.parquet(path)\n    res = {}\n    for tz in ('UTC', 'Asia/Singapore'):\n        spark.conf.set('spark.sql.session.timeZone', tz)\n        rows = o.groupBy(F.date_format('order_ts', 'yyyy-MM-dd').alias('day')).count().orderBy('day').collect()\n        res[tz] = [(r['day'], r['count']) for r in rows]\n    spark.conf.set('spark.sql.session.timeZone', 'UTC')\n    return res",
  "code/streaming.py": "\"\"\"Mission 10: Structured Streaming with a file source, so that every batch is known in advance and the run is the same every time.\n\nFive small JSON files arrive one at a time. Each micro-batch reads one file (maxFilesPerTrigger=1), and trigger(availableNow=True) ends the query when the files are used up.\nThe progress objects are the real ones that Spark reports for each batch.\n\"\"\"\nimport json\nimport os\n\nfrom pyspark.sql import functions as F\n\n# (store, event time, amount). The file number is the order of arrival. File 4 holds one event that is far older than the others: it arrives after the\n# watermark has passed the end of its window.\nFILES = [\n    [('s01', '10:01', 5), ('s01', '10:04', 3), ('s02', '10:06', 2)],\n    [('s01', '10:12', 4), ('s02', '10:15', 6)],\n    [('s01', '10:25', 7)],\n    [('s02', '10:27', 1)],\n    [('s01', '10:07', 9)],\n    [('s01', '10:41', 2)],\n]\nSCHEMA = 'store_id string, event_time timestamp, amount int'\n\n\ndef write_file(in_dir, n):\n    os.makedirs(in_dir, exist_ok=True)\n    path = os.path.join(in_dir, 'events-%d.json' % n)\n    with open(path, 'w') as f:\n        for store, t, amount in FILES[n]:\n            f.write(json.dumps({'store_id': store, 'event_time': '2026-11-01 %s:00' % t, 'amount': amount}) + '\\n')\n    stamp = 1_793_491_200 + n * 60                       # the file source reads the oldest file first, so each file gets a modification time of its own\n    os.utime(path, (stamp, stamp))\n\n\ndef windowed(spark, in_dir, delay='10 minutes'):\n    \"\"\"Orders per store in 10-minute windows of event time, with a watermark that lets a window close.\"\"\"\n    events = spark.readStream.schema(SCHEMA).option('maxFilesPerTrigger', 1).json(in_dir)\n    if delay is not None:                               # delay=None leaves the watermark out, to show what it is for\n        events = events.withWatermark('event_time', delay)\n    return events.groupBy(F.window('event_time', '10 minutes').alias('w'), 'store_id').agg(F.count('*').alias('n'), F.sum('amount').alias('total'))\n\n\ndef rows_of(df):\n    return sorted([(r['w']['start'].strftime('%H:%M'), r['store_id'], r['n'], r['total']) for r in df.collect()])\n\n\ndef run(spark, in_dir, ck_dir, mode='update', delay='10 minutes', fail_batch=None, sink=None):\n    \"\"\"Run the windowed query until the files are used up. Returns what each batch wrote, and the progress reports. sink is a list that foreachBatch appends to.\"\"\"\n    out = []\n    state = {'failed': False}\n\n    def on_batch(df, batch_id):\n        rows = rows_of(df)\n        if sink is not None:\n            for r in rows:\n                sink.append((batch_id,) + r)\n        if fail_batch is not None and batch_id == fail_batch and not state['failed']:\n            state['failed'] = True\n            raise RuntimeError('the sink fails in batch %d after it wrote' % batch_id)\n        out.append({'batch': batch_id, 'rows': rows})\n\n    q = (windowed(spark, in_dir, delay).writeStream.outputMode(mode).foreachBatch(on_batch).option('checkpointLocation', ck_dir).trigger(availableNow=True).start())\n    try:\n        q.awaitTermination()\n        error = None\n    except Exception as e:  # noqa: BLE001\n        error = str(e).strip().split('\\n')[0][:160]\n    prog = []\n    for p in q.recentProgress:\n        so = (p.get('stateOperators') or [{}])[0]\n        et = p.get('eventTime', {})\n        wm = et.get('watermark', '')\n        prog.append({'batch': p['batchId'], 'input_rows': p['numInputRows'], 'watermark': '' if wm.startswith('1970') else wm[11:16], 'max_event_time': et.get('max', '')[11:16],\n                     'state_rows': so.get('numRowsTotal'), 'dropped_by_watermark': so.get('numRowsDroppedByWatermark')})\n    return out, prog, error\n\n\ndef checkpoint_tree(ck_dir):\n    \"\"\"The folders and the file names of the checkpoint, without the long ids.\"\"\"\n    tree = {}\n    for name in sorted(os.listdir(ck_dir)):\n        p = os.path.join(ck_dir, name)\n        if os.path.isdir(p):\n            files = sorted(os.listdir(p))\n            tree[name] = [f for f in files if not f.startswith('.')][:8]\n        else:\n            tree[name] = None\n    return tree\n\n\ndef append_without_watermark(spark, in_dir, ck_dir):\n    \"\"\"Append mode asks Spark to write a window once, when it is final. Without a watermark Spark cannot know when that is, and it refuses to start.\"\"\"\n    df = windowed(spark, in_dir, delay=None)\n    try:\n        df.writeStream.outputMode('append').format('noop').option('checkpointLocation', ck_dir).trigger(availableNow=True).start()\n        return 'accepted'\n    except Exception as e:  # noqa: BLE001\n        return str(e).strip().split('\\n')[0]",
  "code/tables.py": "\"\"\"Mission 11: what a table format adds to Parquet files. Delta Lake (delta-spark 4.0.1) runs here for real. Iceberg and Hudi were not run.\"\"\"\nimport glob\nimport json\nimport os\nimport re\n\nfrom pyspark.sql import functions as F\n\n\ndef delta_session_conf():\n    return {'spark__jars__packages': 'io.delta:delta-spark_2.13:4.0.1', 'spark__sql__extensions': 'io.delta.sql.DeltaSparkSessionExtension',\n            'spark__sql__catalog__spark_catalog': 'org.apache.spark.sql.delta.catalog.DeltaCatalog'}\n\n\ndef log_names(table):\n    \"\"\"The files of the transaction log, without the checksum files.\"\"\"\n    return sorted(f for f in os.listdir(os.path.join(table, '_delta_log')) if f.endswith('.json'))\n\n\ndef parquet_count(table):\n    return len([f for f in os.listdir(table) if f.endswith('.parquet')])\n\n\ndef build(spark, paths, table):\n    \"\"\"Commit 0: create the table from the PAID orders of three days.\"\"\"\n    o = spark.read.parquet(paths['orders']).filter(\"status = 'PAID' AND dt <= '2026-11-03'\").select('order_id', 'store_id', 'status', 'total_cents', 'dt')\n    o.repartition(6).write.format('delta').mode('overwrite').save(table)\n    return o.count()\n\n\ndef merge(spark, table):\n    \"\"\"Commit 1: a MERGE that updates changed totals, deletes refunded orders and inserts new ones, and the numbers that Delta reports for it.\"\"\"\n    from delta.tables import DeltaTable\n    t = DeltaTable.forPath(spark, table)\n    changes = (spark.range(0, 3000).select((F.col('id') * 7 + 1).alias('order_id'), F.lit('s01').alias('store_id'), F.when(F.col('id') % 3 == 0, 'REFUNDED').otherwise('PAID').alias('status'),\n                                           (F.lit(999)).alias('total_cents'), F.lit('2026-11-03').cast('date').alias('dt')))\n    changes = changes.union(spark.range(0, 100).select((F.col('id') + 9_000_001).alias('order_id'), F.lit('s02').alias('store_id'), F.lit('PAID').alias('status'),\n                                                      F.lit(500).alias('total_cents'), F.lit('2026-11-03').cast('date').alias('dt')))\n    (t.alias('t').merge(changes.alias('c'), 't.order_id = c.order_id')\n     .whenMatchedDelete(condition=\"c.status = 'REFUNDED'\").whenMatchedUpdate(set={'total_cents': 'c.total_cents'}).whenNotMatchedInsertAll().execute())\n    metrics = spark.sql('DESCRIBE HISTORY delta.`%s` LIMIT 1' % table).select('operationMetrics').collect()[0][0]\n    return {k: int(v) for k, v in metrics.items() if k in ('numTargetRowsInserted', 'numTargetRowsUpdated', 'numTargetRowsDeleted', 'numSourceRows', 'numOutputRows')}\n\n\ndef history(spark, table):\n    return [(r['version'], r['operation']) for r in spark.sql('DESCRIBE HISTORY delta.`%s`' % table).select('version', 'operation').orderBy('version').collect()]\n\n\ndef time_travel(spark, table):\n    return {'version 0': spark.read.format('delta').option('versionAsOf', 0).load(table).count(), 'latest': spark.read.format('delta').load(table).count()}\n\n\ndef schema_enforcement(spark, table):\n    \"\"\"An append with a column that the table does not have is refused. mergeSchema lets it through.\"\"\"\n    from datetime import date\n    extra = spark.createDataFrame([(1, 's01', 'PAID', 100, date(2026, 11, 1), 'app')], 'order_id long, store_id string, status string, total_cents int, dt date, channel string')\n    try:\n        extra.write.format('delta').mode('append').save(table)\n        return None\n    except Exception as e:  # noqa: BLE001\n        lines = [l.strip() for l in str(e).split('\\n') if l.strip()]\n        return [l for l in lines if 'schema mismatch' in l.lower() or 'DELTA_' in l][0][:200]\n\n\ndef files(spark, table):\n    detail = spark.sql('DESCRIBE DETAIL delta.`%s`' % table).collect()[0]\n    return parquet_count(table), detail['numFiles']\n\n\ndef small_files(spark, base):\n    \"\"\"Twenty small appends make twenty small files. OPTIMIZE rewrites them as one file, and the old files stay on disk until VACUUM. VACUUM refuses a retention of zero hours\n    unless the check is turned off, and after it ran the old version cannot be read any more.\"\"\"\n    table = os.path.join(base, 'delta-small')\n    for i in range(20):\n        spark.range(i * 500, (i + 1) * 500).select('id', (F.col('id') % 12).alias('store')).coalesce(1).write.format('delta').mode('append').save(table)\n    out = {'appends': 20}\n    out['files_on_disk_before'], out['files_in_the_version_before'] = files(spark, table)\n    out['version_before_optimize'] = spark.sql('DESCRIBE HISTORY delta.`%s`' % table).agg(F.max('version')).collect()[0][0]\n    spark.sql('OPTIMIZE delta.`%s`' % table)\n    out['files_on_disk_after_optimize'], out['files_in_the_version_after_optimize'] = files(spark, table)\n    try:\n        spark.sql('VACUUM delta.`%s` RETAIN 0 HOURS' % table)\n        out['vacuum_zero_hours'] = 'accepted'\n    except Exception as e:  # noqa: BLE001\n        out['vacuum_zero_hours'] = [l.strip() for l in str(e).split('\\n') if 'Are you sure' in l][0].split('?')[0] + '?'\n    spark.conf.set('spark.databricks.delta.retentionDurationCheck.enabled', 'false')\n    spark.sql('VACUUM delta.`%s` RETAIN 0 HOURS' % table)\n    spark.conf.set('spark.databricks.delta.retentionDurationCheck.enabled', 'true')\n    out['files_on_disk_after_vacuum'], out['files_in_the_version_after_vacuum'] = files(spark, table)\n    out['rows_now'] = spark.read.format('delta').load(table).count()\n    try:\n        spark.read.format('delta').option('versionAsOf', out['version_before_optimize']).load(table).agg(F.sum('id')).collect()      # count(*) alone can be answered from the log\n        out['old_version_after_vacuum'] = 'still readable'\n    except Exception as e:  # noqa: BLE001\n        lines = [l.strip() for l in str(e).split('\\n') if l.strip()]\n        line = [l for l in lines if 'FileNotFound' in l or 'does not exist' in l or 'DELTA_' in l or 'No such file' in l][0]\n        out['old_version_after_vacuum'] = re.sub(r'\\S+\\.parquet', '<file>.parquet', line).lstrip(': ').replace('org.apache.spark.', '')[:260]      # no random file name in the lesson\n    return out\n\n\ndef log_peek(table):\n    \"\"\"What the first commit file records, reduced to the kinds of action that it holds.\"\"\"\n    kinds = {}\n    f = os.path.join(table, '_delta_log', '00000000000000000000.json')\n    for line in open(f):\n        k = list(json.loads(line))[0]\n        kinds[k] = kinds.get(k, 0) + 1\n    return kinds",
  "code/udfs.py": "\"\"\"Mission 9: Python UDFs, pandas UDFs and the built-in functions. Plans and counts are real. Nothing is timed, because times are not stable.\"\"\"\nimport pandas as pd\nfrom pyspark import StorageLevel  # noqa: F401\nfrom pyspark.sql import functions as F\nfrom pyspark.sql.functions import pandas_udf, udf\nfrom pyspark.sql.types import IntegerType, StringType\n\nimport session as S\n\n\ndef label_python(status):\n    return {'PAID': 'ok', 'REFUNDED': 'check'}.get(status, 'other')\n\n\n@pandas_udf(StringType())\ndef label_pandas(status: pd.Series) -> pd.Series:\n    return status.map({'PAID': 'ok', 'REFUNDED': 'check'}).fillna('other')\n\n\ndef plans(spark, path):\n    \"\"\"The same label computed three ways. Only the node that runs the function differs.\"\"\"\n    o = spark.read.parquet(path).select('order_id', 'status')\n    builtin = o.withColumn('label', F.when(F.col('status') == 'PAID', 'ok').when(F.col('status') == 'REFUNDED', 'check').otherwise('other'))\n    py = o.withColumn('label', udf(label_python, StringType())('status'))\n    pd_ = o.withColumn('label', label_pandas('status'))\n    arrow = o.withColumn('label', udf(label_python, StringType(), useArrow=True)('status'))\n    return {k: S.plan_text(v, 'simple') for k, v in (('built-in functions', builtin), ('Python UDF', py), ('pandas UDF', pd_), ('Python UDF with Arrow', arrow))}\n\n\ndef same_answers(spark, path):\n    \"\"\"The three versions agree. A UDF is not wrong, only more expensive, and it hides the logic from the optimizer.\"\"\"\n    o = spark.read.parquet(path).select('status')\n    a = o.withColumn('label', F.when(F.col('status') == 'PAID', 'ok').when(F.col('status') == 'REFUNDED', 'check').otherwise('other')).groupBy('label').count().orderBy('label').collect()\n    b = o.withColumn('label', udf(label_python, StringType())('status')).groupBy('label').count().orderBy('label').collect()\n    c = o.withColumn('label', label_pandas('status')).groupBy('label').count().orderBy('label').collect()\n    return [(r['label'], r['count']) for r in a], a == b == c\n\n\ndef wrong_return_type(spark):\n    \"\"\"A UDF that is declared to return an integer and returns a string does not fail: it returns NULL for every row.\"\"\"\n    bad = udf(lambda s: s.upper(), IntegerType())\n    df = spark.createDataFrame([('paid',), ('new',)], 'status string').withColumn('v', bad('status'))\n    return [list(r) for r in df.collect()]\n\n\ndef null_handling(spark):\n    \"\"\"A UDF is called with None for a NULL. Written without a check, it fails for the first guest order.\"\"\"\n    f = udf(lambda s: len(s), IntegerType())\n    df = spark.createDataFrame([('c00001',), (None,)], 'customer_id string')\n    try:\n        df.withColumn('n', f('customer_id')).collect()\n        return 'no error'\n    except Exception as e:  # noqa: BLE001\n        text = str(e)\n        return [l.strip() for l in text.splitlines() if 'TypeError' in l][:1] or [text[:150]]\n\n\ndef runs_more_than_once(spark, path, tally):\n    \"\"\"Each call of the function appends one byte to a file, which counts the calls from outside Spark. A non-deterministic function is not allowed to be run\n    more often than the rows need, and a deterministic one may be.\"\"\"\n    import os\n\n    def counted(x):\n        with open(tally, 'ab') as f:\n            f.write(b'x')\n        return x * 2\n\n    def calls():\n        return os.path.getsize(tally) if os.path.exists(tally) else 0\n\n    o = spark.read.parquet(path).select('total_cents').limit(1000)\n    out = {'rows': 1000}\n    for label, det in (('deterministic', True), ('non-deterministic', False)):\n        for shape, build in (('result used once', lambda d: d.select('d')),\n                             ('result used twice', lambda d: d.select('d', (F.col('d') + 1).alias('d1'))),\n                             ('result filtered, then used twice', lambda d: d.filter(F.col('d') > 1000).select('d', (F.col('d') + 1).alias('d1')))):\n            f = udf(counted, IntegerType())\n            if not det:\n                f = f.asNondeterministic()\n            before = calls()\n            build(o.withColumn('d', f('total_cents'))).collect()\n            out['%s, %s' % (label, shape)] = calls() - before\n    return out\n\n\ndef arrow_batches(spark, path, tally):\n    \"\"\"A pandas UDF is called once for each batch of rows (10,000 by default), not once for each row.\"\"\"\n    import os\n\n    @pandas_udf(IntegerType())\n    def batch_counter(x: pd.Series) -> pd.Series:\n        with open(tally, 'ab') as f:\n            f.write(b'x')\n        return x\n\n    if os.path.exists(tally):\n        os.remove(tally)\n    spark.read.parquet(path).select(batch_counter('total_cents').alias('v')).agg(F.sum('v')).collect()\n    return {'rows': 400000, 'maxRecordsPerBatch': int(spark.conf.get('spark.sql.execution.arrow.maxRecordsPerBatch')), 'calls': os.path.getsize(tally)}"
 },
 "meta": {
  "company": "Brewline",
  "delta-spark": "4.0.1",
  "java": "21.0.12.1",
  "note": "Recorded by spark/verify/capture_spark.py: the real Apache Spark in local mode on made-up data, read back from its event log. No cluster, no web UI, no Kafka.",
  "numpy": "2.5.4",
  "pandas": "2.3.3",
  "pyarrow": "26.0.1",
  "pyspark": "4.0.1",
  "pytest": "9.2.0",
  "python": "3.13.18"
 },
 "tables": {
  "conf.defaults": {
   "cols": [
    "setting",
    "default in Spark 4.0.1",
    "what it controls"
   ],
   "rows": [
    [
     "spark.sql.shuffle.partitions",
     "200",
     "tasks after a shuffle"
    ],
    [
     "spark.sql.adaptive.enabled",
     "true",
     "adaptive query execution"
    ],
    [
     "spark.sql.adaptive.coalescePartitions.enabled",
     "true",
     "merge small shuffle partitions"
    ],
    [
     "spark.sql.adaptive.skewJoin.enabled",
     "true",
     "split skewed join partitions"
    ],
    [
     "spark.sql.adaptive.skewJoin.skewedPartitionFactor",
     "5.0",
     "skew: times the median"
    ],
    [
     "spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes",
     "268435456b",
     "skew: smallest size"
    ],
    [
     "spark.sql.adaptive.advisoryPartitionSizeInBytes",
     "67108864b",
     "target size of a shuffle partition"
    ],
    [
     "spark.sql.autoBroadcastJoinThreshold",
     "10485760b",
     "largest table that is broadcast"
    ],
    [
     "spark.sql.files.maxPartitionBytes",
     "134217728b",
     "largest input partition"
    ],
    [
     "spark.sql.files.openCostInBytes",
     "4194304b",
     "cost of opening a file"
    ],
    [
     "spark.sql.ansi.enabled",
     "true",
     "ANSI SQL rules"
    ],
    [
     "spark.sql.parquet.compression.codec",
     "snappy",
     "Parquet codec"
    ],
    [
     "spark.sql.sources.partitionOverwriteMode",
     "STATIC",
     "overwrite of partitions"
    ],
    [
     "spark.sql.execution.arrow.maxRecordsPerBatch",
     "10000",
     "rows in a pandas UDF batch"
    ],
    [
     "spark.sql.streaming.stateStore.providerClass",
     "org.apache.spark.sql.execution.streaming.state.HDFSBackedStateStoreProvider",
     "where streaming state lives"
    ]
   ]
  },
  "delta.history": {
   "cols": [
    "version",
    "operation"
   ],
   "rows": [
    [
     0,
     "WRITE"
    ],
    [
     1,
     "MERGE"
    ]
   ]
  },
  "errors.messages": {
   "cols": [
    "what went wrong",
    "the first line of the message"
   ],
   "rows": [
    [
     "a column that does not exist",
     "[UNRESOLVED_COLUMN.WITH_SUGGESTION] A column, variable, or function parameter with name `total_cent` cannot be resolved. Did you mean one of the following? [`total_cents`, `channel`, `status`, `dt`, `order_id`]. SQLSTATE: 42703;"
    ],
    [
     "collect() of every order with maxResultSize=1m",
     "SparkException: Job aborted due to stage failure: Total size of serialized results of N tasks (N MiB) is bigger than spark.driver.maxResultSize (1024.0 KiB)"
    ],
    [
     "a Python UDF that divides by zero",
     "ZeroDivisionError: integer division or modulo by zero"
    ],
    [
     "two files that disagree on a type",
     "SparkException: [FAILED_READ_FILE.PARQUET_COLUMN_DATA_TYPE_MISMATCH] Encountered error while reading file file:///.../<file>.parquet. Data type mismatches when reading Parquet column [order_id]. Expected Spark type bigint, ac"
    ]
   ]
  },
  "eventlog.types": {
   "cols": [
    "event",
    "lines in the log",
    "what it tells you"
   ],
   "rows": [
    [
     "SparkListenerApplicationStart",
     1,
     "the application began"
    ],
    [
     "SparkListenerEnvironmentUpdate",
     1,
     "every setting the application ran with"
    ],
    [
     "SparkListenerSQLExecutionStart",
     1,
     "a SQL or DataFrame query began, with its plan"
    ],
    [
     "SparkListenerJobStart",
     3,
     "an action started a job, and which stages it has"
    ],
    [
     "SparkListenerStageSubmitted",
     3,
     "a stage was sent to the scheduler"
    ],
    [
     "SparkListenerTaskStart",
     6,
     "a task began on an executor"
    ],
    [
     "SparkListenerTaskEnd",
     6,
     "a task finished, with its metrics"
    ],
    [
     "SparkListenerStageCompleted",
     3,
     "a stage finished, with its totals"
    ],
    [
     "SparkListenerJobEnd",
     3,
     "a job finished"
    ],
    [
     "SparkListenerSQLExecutionEnd",
     1,
     "the query finished"
    ],
    [
     "SparkListenerApplicationEnd",
     1,
     "the application ended"
    ]
   ]
  },
  "files.codecs": {
   "cols": [
    "compression",
    "total KB"
   ],
   "rows": [
    [
     "none",
     9470
    ],
    [
     "snappy",
     6120
    ],
    [
     "gzip",
     4580
    ],
    [
     "zstd",
     4240
    ]
   ]
  },
  "files.rowgroups": {
   "cols": [
    "the file is",
    "filter pushdown",
    "bytes read",
    "records read"
   ],
   "rows": [
    [
     "sorted by order_id",
     "on",
     260778,
     6049
    ],
    [
     "sorted by order_id",
     "off",
     4535588,
     400000
    ],
    [
     "shuffled by order_id",
     "on",
     4728048,
     400000
    ],
    [
     "shuffled by order_id",
     "off",
     4537592,
     400000
    ]
   ]
  },
  "files.touched": {
   "cols": [
    "filter",
    "files opened",
    "files in the dataset"
   ],
   "rows": [
    [
     "dt = \"2026-11-05\" (a partition column)",
     1,
     14
    ],
    [
     "cast(dt as string) = \"2026-11-05\"",
     1,
     14
    ],
    [
     "store_id = \"s01\" (not a partition column)",
     14,
     14
    ]
   ]
  },
  "files.variants": {
   "cols": [
    "how it was written",
    "files",
    "total KB",
    "KB for each file"
   ],
   "rows": [
    [
     "one task: coalesce(1)",
     1,
     5990,
     5990.0
    ],
    [
     "200 tasks: repartition(200)",
     200,
     9530,
     47.6
    ],
    [
     "folder for each day, 200 tasks after a shuffle",
     2800,
     15270,
     5.5
    ],
    [
     "folder for each day, no shuffle",
     14,
     6650,
     475.0
    ],
    [
     "folder for each day, repartition by day",
     14,
     6650,
     475.0
    ],
    [
     "folder for each store and day, no repartition",
     168,
     8350,
     49.7
    ],
    [
     "at most 50,000 rows in a file",
     8,
     6550,
     818.8
    ]
   ]
  },
  "joins.strategies": {
   "cols": [
    "situation",
    "join that Spark chose",
    "shuffles",
    "broadcasts"
   ],
   "rows": [
    [
     "stores is small: the default",
     "BroadcastHashJoin",
     0,
     1
    ],
    [
     "broadcast turned off",
     "SortMergeJoin",
     2,
     0
    ],
    [
     "hint: broadcast(stores)",
     "BroadcastHashJoin",
     0,
     1
    ],
    [
     "hint: shuffle_hash on stores",
     "ShuffledHashJoin",
     2,
     0
    ],
    [
     "a range condition, not equality",
     "BroadcastNestedLoopJoin",
     0,
     1
    ],
    [
     "a range condition, tiers is small",
     "BroadcastNestedLoopJoin",
     0,
     1
    ]
   ]
  },
  "lazy.steps": {
   "cols": [
    "line",
    "jobs it started"
   ],
   "rows": [
    [
     "spark.read.parquet(path)",
     1
    ],
    [
     ".filter(status == \"PAID\")",
     0
    ],
    [
     ".select(\"store_id\", \"total_cents\")",
     0
    ],
    [
     ".groupBy(\"store_id\").agg(sum(total_cents))",
     0
    ],
    [
     ".explain()",
     0
    ],
    [
     ".columns",
     0
    ],
    [
     ".count()",
     3
    ],
    [
     ".collect()",
     2
    ],
    [
     ".show(3)",
     2
    ],
    [
     ".write.mode(\"overwrite\").parquet(out)",
     2
    ]
   ]
  },
  "mem.cache_reads": {
   "cols": [
    "action",
    "bytes read as input",
    "records read as input"
   ],
   "rows": [
    [
     "the first count (builds the cache)",
     15190577,
     400035
    ],
    [
     "the second count (reads the cache)",
     7296968,
     35
    ]
   ]
  },
  "mem.formula": {
   "cols": [
    "spark.driver.memory",
    "JVM heap (bytes)",
    "storage memory that Spark reports",
    "(heap - 300 MiB) x 0.6",
    "equal"
   ],
   "rows": [
    [
     "512m",
     536870912,
     133378867,
     133378867,
     true
    ],
    [
     "1g",
     1073741824,
     455501414,
     455501414,
     true
    ],
    [
     "2g",
     2147483648,
     1099746508,
     1099746508,
     true
    ]
   ]
  },
  "mem.levels": {
   "cols": [
    "storage level",
    "bytes in memory",
    "bytes on disk"
   ],
   "rows": [
    [
     "MEMORY_ONLY",
     2501276,
     0
    ],
    [
     "MEMORY_AND_DISK",
     2501276,
     0
    ],
    [
     "DISK_ONLY",
     0,
     2501276
    ]
   ]
  },
  "parts.operations": {
   "cols": [
    "operation",
    "shuffles (Exchange)",
    "sorts"
   ],
   "rows": [
    [
     "filter and select",
     0,
     0
    ],
    [
     "groupBy and sum",
     1,
     0
    ],
    [
     "distinct customers",
     1,
     0
    ],
    [
     "orderBy",
     1,
     1
    ],
    [
     "join to stores (no broadcast)",
     2,
     2
    ],
    [
     "window by store",
     1,
     1
    ]
   ]
  },
  "parts.read": {
   "cols": [
    "maxPartitionBytes",
    "partitions of the orders"
   ],
   "rows": [
    [
     "128 MiB (the default)",
     4
    ],
    [
     "1 MiB",
     14
    ],
    [
     "256 KiB",
     28
    ]
   ]
  },
  "parts.shuffle": {
   "cols": [
    "setting",
    "tasks in the stage after the shuffle",
    "fewest records",
    "median",
    "most records",
    "records in all"
   ],
   "rows": [
    [
     "200 partitions, adaptive off",
     200,
     0,
     0,
     12,
     48
    ],
    [
     "8 partitions, adaptive off",
     8,
     0,
     6,
     12,
     48
    ],
    [
     "200 partitions, adaptive on",
     1,
     48,
     48,
     48,
     48
    ]
   ]
  },
  "skew.aggregations": {
   "cols": [
    "query",
    "tasks after the shuffle",
    "fewest records",
    "median",
    "most records"
   ],
   "rows": [
    [
     "a count by store",
     12,
     0,
     4,
     12
    ],
    [
     "a window sum by store",
     12,
     0,
     17949.5,
     163183
    ]
   ]
  },
  "skew.joins": {
   "cols": [
    "join",
    "tasks in the join stage",
    "fewest records",
    "median",
    "most records"
   ],
   "rows": [
    [
     "plain sort-merge join",
     12,
     0,
     17950.5,
     163185
    ],
    [
     "adaptive skew join",
     18,
     0,
     22978,
     46787
    ],
    [
     "join with a salt of 4",
     12,
     3915,
     32753,
     65982
    ]
   ]
  },
  "sql.ansi": {
   "cols": [
    "expression",
    "ANSI mode on (the default)",
    "ANSI mode off"
   ],
   "rows": [
    [
     "CAST('abc' AS INT)",
     "error: [CAST_INVALID_INPUT] The value 'abc' of the type \"STRING\" cannot be cast to \"INT\" because it is malformed. Correct the value as per the syntax, or change its target type. Use `try_cast` to tolerate ma",
     "NULL"
    ],
    [
     "1 / 0",
     "error: [DIVIDE_BY_ZERO] Division by zero. Use `try_divide` to tolerate divisor being 0 and return NULL instead. If necessary set \"spark.sql.ansi.enabled\" to \"false\" to bypass this error. SQLSTATE: 22012",
     "NULL"
    ],
    [
     "2147483647 + 1 (an INT)",
     "error: [ARITHMETIC_OVERFLOW] integer overflow. Use 'try_add' to tolerate overflow and return NULL instead. If necessary set \"spark.sql.ansi.enabled\" to \"false\" to bypass this error. SQLSTATE: 22003",
     "-2147483648"
    ],
    [
     "CAST(300 AS TINYINT)",
     "error: [CAST_OVERFLOW] The value 300 of the type \"INT\" cannot be cast to \"TINYINT\" due to an overflow. Use `try_cast` to tolerate overflow and return NULL instead. SQLSTATE: 22003",
     "44"
    ],
    [
     "to_date('2026-13-45')",
     "error: [CAST_INVALID_INPUT] The value '2026-13-45' of the type \"STRING\" cannot be cast to \"DATE\" because it is malformed. Correct the value as per the syntax, or change its target type. Use `try_cast` to tol",
     "NULL"
    ],
    [
     "element_at(array(1, 2), 5)",
     "error: [INVALID_ARRAY_INDEX_IN_ELEMENT_AT] The index 5 is out of bounds. The array has 2 elements. Use `try_element_at` to tolerate accessing element at invalid index and return NULL instead. SQLSTATE: 22003",
     "NULL"
    ],
    [
     "try_cast('abc' AS INT)",
     "NULL",
     "NULL"
    ],
    [
     "try_divide(1, 0)",
     "NULL",
     "NULL"
    ]
   ]
  },
  "sql.arrays": {
   "cols": [
    "id",
    "xs",
    "transform x*10",
    "filter x>1",
    "aggregate sum",
    "sort_array"
   ],
   "rows": [
    [
     "1",
     "[3, 1, 2]",
     "[30, 10, 20]",
     "[3, 2]",
     "6",
     "[1, 2, 3]"
    ],
    [
     "2",
     "[5, 5]",
     "[50, 50]",
     "[5, 5]",
     "10",
     "[5, 5]"
    ],
    [
     "3",
     "[]",
     "[]",
     "[]",
     "0",
     "[]"
    ]
   ]
  },
  "sql.pivot": {
   "cols": [
    "country",
    "app",
    "pos"
   ],
   "rows": [
    [
     "MY",
     4,
     6
    ],
    [
     "SG",
     3,
     2
    ]
   ]
  },
  "sql.rollup": {
   "cols": [
    "country",
    "channel",
    "n",
    "grouping(country)",
    "grouping(channel)"
   ],
   "rows": [
    [
     "MY",
     "app",
     4,
     0,
     0
    ],
    [
     "MY",
     "pos",
     6,
     0,
     0
    ],
    [
     "MY",
     "NULL",
     10,
     0,
     1
    ],
    [
     "SG",
     "app",
     3,
     0,
     0
    ],
    [
     "SG",
     "pos",
     2,
     0,
     0
    ],
    [
     "SG",
     "NULL",
     5,
     0,
     1
    ],
    [
     "NULL",
     "NULL",
     15,
     1,
     1
    ]
   ]
  },
  "sql.ties": {
   "cols": [
    "day",
    "cents",
    "sum with ROWS",
    "sum with RANGE"
   ],
   "rows": [
    [
     4,
     90,
     90,
     90
    ],
    [
     1,
     100,
     190,
     190
    ],
    [
     2,
     150,
     340,
     490
    ],
    [
     3,
     150,
     490,
     490
    ]
   ]
  },
  "sql.timezone": {
   "cols": [
    "day",
    "orders counted in UTC",
    "orders counted in Singapore"
   ],
   "rows": [
    [
     "2026-11-01",
     28530,
     19005
    ],
    [
     "2026-11-02",
     28577,
     28626
    ],
    [
     "2026-11-03",
     28500,
     28492
    ],
    [
     "2026-11-04",
     28544,
     28441
    ],
    [
     "2026-11-05",
     28290,
     28439
    ],
    [
     "2026-11-06",
     28749,
     28702
    ],
    [
     "2026-11-07",
     28473,
     28400
    ],
    [
     "2026-11-08",
     28745,
     28729
    ],
    [
     "2026-11-09",
     28485,
     28522
    ],
    [
     "2026-11-10",
     28601,
     28652
    ],
    [
     "2026-11-11",
     28650,
     28559
    ],
    [
     "2026-11-12",
     28477,
     28677
    ],
    [
     "2026-11-13",
     28748,
     28494
    ],
    [
     "2026-11-14",
     28631,
     28662
    ],
    [
     "2026-11-15",
     0,
     9600
    ]
   ]
  },
  "sql.windows": {
   "cols": [
    "store",
    "day",
    "cents",
    "running total",
    "rank by cents",
    "cents the day before"
   ],
   "rows": [
    [
     "s01",
     1,
     100,
     100,
     3,
     null
    ],
    [
     "s01",
     2,
     150,
     250,
     1,
     100
    ],
    [
     "s01",
     3,
     150,
     400,
     1,
     150
    ],
    [
     "s01",
     4,
     90,
     490,
     4,
     150
    ],
    [
     "s02",
     1,
     70,
     70,
     2,
     null
    ],
    [
     "s02",
     2,
     80,
     150,
     1,
     70
    ]
   ]
  },
  "stream.append": {
   "cols": [
    "batch",
    "rows written by this batch (window, store, orders, total)"
   ],
   "rows": [
    [
     0,
     "(nothing)"
    ],
    [
     1,
     "(nothing)"
    ],
    [
     2,
     "(nothing)"
    ],
    [
     3,
     "10:00 s01 2 8; 10:00 s02 1 2"
    ],
    [
     4,
     "(nothing)"
    ],
    [
     5,
     "(nothing)"
    ],
    [
     6,
     "10:10 s01 1 4; 10:10 s02 1 6; 10:20 s01 1 7; 10:20 s02 1 1"
    ]
   ]
  },
  "stream.complete": {
   "cols": [
    "batch",
    "rows written by this batch (window, store, orders, total)"
   ],
   "rows": [
    [
     0,
     "10:00 s01 2 8; 10:00 s02 1 2"
    ],
    [
     1,
     "10:00 s01 2 8; 10:00 s02 1 2; 10:10 s01 1 4; 10:10 s02 1 6"
    ],
    [
     2,
     "10:00 s01 2 8; 10:00 s02 1 2; 10:10 s01 1 4; 10:10 s02 1 6; 10:20 s01 1 7"
    ],
    [
     3,
     "10:00 s01 2 8; 10:00 s02 1 2; 10:10 s01 1 4; 10:10 s02 1 6; 10:20 s01 1 7; 10:20 s02 1 1"
    ],
    [
     4,
     "10:00 s01 3 17; 10:00 s02 1 2; 10:10 s01 1 4; 10:10 s02 1 6; 10:20 s01 1 7; 10:20 s02 1 1"
    ],
    [
     5,
     "10:00 s01 3 17; 10:00 s02 1 2; 10:10 s01 1 4; 10:10 s02 1 6; 10:20 s01 1 7; 10:20 s02 1 1; 10:40 s01 1 2"
    ]
   ]
  },
  "stream.files": {
   "cols": [
    "file",
    "arrives as",
    "events (store, event time, amount)"
   ],
   "rows": [
    [
     "events-0.json",
     "file 0",
     "s01 10:01 5; s01 10:04 3; s02 10:06 2"
    ],
    [
     "events-1.json",
     "file 1",
     "s01 10:12 4; s02 10:15 6"
    ],
    [
     "events-2.json",
     "file 2",
     "s01 10:25 7"
    ],
    [
     "events-3.json",
     "file 3",
     "s02 10:27 1"
    ],
    [
     "events-4.json",
     "file 4",
     "s01 10:07 9"
    ],
    [
     "events-5.json",
     "file 5",
     "s01 10:41 2"
    ]
   ]
  },
  "stream.progress": {
   "cols": [
    "batch",
    "rows read",
    "watermark used",
    "latest event time in the batch",
    "rows in state",
    "rows dropped as late"
   ],
   "rows": [
    [
     0,
     3,
     "(none yet)",
     "10:06",
     2,
     0
    ],
    [
     1,
     2,
     "09:56",
     "10:15",
     4,
     0
    ],
    [
     2,
     1,
     "10:05",
     "10:25",
     5,
     0
    ],
    [
     3,
     1,
     "10:15",
     "10:27",
     4,
     0
    ],
    [
     4,
     1,
     "10:17",
     "10:07",
     4,
     1
    ],
    [
     5,
     1,
     "10:17",
     "10:41",
     5,
     0
    ],
    [
     6,
     0,
     "10:31",
     "-",
     1,
     0
    ]
   ]
  },
  "stream.state_growth": {
   "cols": [
    "batch",
    "rows in state with a watermark",
    "rows in state without one"
   ],
   "rows": [
    [
     0,
     2,
     2
    ],
    [
     1,
     4,
     4
    ],
    [
     2,
     5,
     5
    ],
    [
     3,
     4,
     6
    ],
    [
     4,
     4,
     6
    ],
    [
     5,
     5,
     7
    ]
   ]
  },
  "stream.update": {
   "cols": [
    "batch",
    "rows written by this batch (window, store, orders, total)"
   ],
   "rows": [
    [
     0,
     "10:00 s01 2 8; 10:00 s02 1 2"
    ],
    [
     1,
     "10:10 s01 1 4; 10:10 s02 1 6"
    ],
    [
     2,
     "10:20 s01 1 7"
    ],
    [
     3,
     "10:20 s02 1 1"
    ],
    [
     4,
     "(nothing)"
    ],
    [
     5,
     "10:40 s01 1 2"
    ],
    [
     6,
     "(nothing)"
    ]
   ]
  },
  "submit.flags": {
   "cols": [
    "flag",
    "in spark-submit --help"
   ],
   "rows": [
    [
     "--master",
     "yes"
    ],
    [
     "--deploy-mode",
     "yes"
    ],
    [
     "--name",
     "yes"
    ],
    [
     "--conf",
     "yes"
    ],
    [
     "--properties-file",
     "yes"
    ],
    [
     "--driver-memory",
     "yes"
    ],
    [
     "--driver-cores",
     "yes"
    ],
    [
     "--executor-memory",
     "yes"
    ],
    [
     "--executor-cores",
     "yes"
    ],
    [
     "--num-executors",
     "yes"
    ],
    [
     "--total-executor-cores",
     "yes"
    ],
    [
     "--packages",
     "yes"
    ],
    [
     "--jars",
     "yes"
    ],
    [
     "--py-files",
     "yes"
    ],
    [
     "--files",
     "yes"
    ],
    [
     "--archives",
     "yes"
    ],
    [
     "--queue",
     "yes"
    ],
    [
     "--supervise",
     "yes"
    ],
    [
     "--verbose",
     "yes"
    ],
    [
     "--class",
     "yes"
    ],
    [
     "--repositories",
     "yes"
    ],
    [
     "--exclude-packages",
     "yes"
    ]
   ]
  },
  "submit.precedence": {
   "cols": [
    "where the value was set",
    "spark.sql.shuffle.partitions that the program saw"
   ],
   "rows": [
    [
     "nothing set",
     "200"
    ],
    [
     "--conf spark.sql.shuffle.partitions=50",
     "50"
    ],
    [
     "a properties file with 100",
     "100"
    ],
    [
     "the properties file (100) and --conf (50)",
     "50"
    ],
    [
     "--conf (50) and the program sets 20",
     "20"
    ]
   ]
  },
  "udf.wrong_type": {
   "cols": [
    "status",
    "v (declared integer, returned text)"
   ],
   "rows": [
    [
     "paid",
     "NULL"
    ],
    [
     "new",
     "NULL"
    ]
   ]
  },
  "world.anatomy": {
   "cols": [
    "stage",
    "tasks",
    "what it did"
   ],
   "rows": [
    [
     1,
     4,
     "reads files and counts inside each task"
    ],
    [
     2,
     1,
     "adds up what the first stage sent"
    ]
   ]
  },
  "world.stores": {
   "cols": [
    "store_id",
    "orders",
    "share"
   ],
   "rows": [
    [
     "s01",
     135135,
     0.338
    ],
    [
     "s02",
     32136,
     0.08
    ],
    [
     "s03",
     31900,
     0.08
    ],
    [
     "s04",
     32202,
     0.081
    ],
    [
     "s05",
     32340,
     0.081
    ],
    [
     "s06",
     28048,
     0.07
    ],
    [
     "s07",
     24304,
     0.061
    ],
    [
     "s08",
     24125,
     0.06
    ],
    [
     "s09",
     20053,
     0.05
    ],
    [
     "s10",
     15846,
     0.04
    ],
    [
     "s11",
     11875,
     0.03
    ],
    [
     "s12",
     12036,
     0.03
    ]
   ]
  }
 },
 "text": {
  "delta.schema_enforcement": "[_LEGACY_ERROR_TEMP_DELTA_0007] A schema mismatch detected when writing to the Delta table (Table ID: ...).",
  "eventlog.task_end": "{\n \"Event\": \"SparkListenerTaskEnd\",\n \"Task Type\": \"ShuffleMapTask\",\n \"Task End Reason\": {\n  \"Reason\": \"Success\"\n },\n \"Task Info\": {\n  \"Index\": 1,\n  \"Attempt\": 0,\n  \"Executor ID\": \"driver\",\n  \"Locality\": \"PROCESS_LOCAL\",\n  \"Failed\": false\n },\n \"Task Metrics\": {\n  \"Executor Run Time\": \"varies\",\n  \"JVM GC Time\": \"varies\",\n  \"Result Size\": \"varies\",\n  \"Memory Bytes Spilled\": 0,\n  \"Disk Bytes Spilled\": 0,\n  \"Input Metrics\": {\n   \"Bytes Read\": \"varies\",\n   \"Records Read\": 114353\n  },\n  \"Shuffle Write Metrics\": {\n   \"Shuffle Bytes Written\": \"varies\",\n   \"Shuffle Write Time\": \"varies\",\n   \"Shuffle Records Written\": 12\n  }\n }\n}",
  "files.bucketing_plan": "== Physical Plan ==\n*(3) Project [customer_id#1, order_id#2L, store_id#3, order_ts#4, status#5, channel#6, total_cents#7, loyalty_tier#8, birth_year#9]\n+- *(3) SortMergeJoin [customer_id#1], [customer_id#10], Inner\n   :- *(1) Sort [customer_id#1 ASC NULLS FIRST], false, 0\n   :  +- *(1) Filter isnotnull(customer_id#1)\n   :     +- *(1) ColumnarToRow\n   :        +- FileScan parquet spark_catalog.default.orders_bucketed[order_id#2L,store_id#3,customer_id#1,order_ts#4,status#5,channel#6,total_cents#7] Batched: true, Bucketed: true, DataFilters: [isnotnull(customer_id#1)], Format: Parquet, Location: InMemoryFileIndex(1 paths)[/warehouse-layout/orders_bucketed], PartitionFilters: [], PushedFilters: [IsNotNull(customer_id)], ReadSchema: struct<order_id:bigint,store_id:string,customer_id:string,order_ts:timestamp,status:string,channe..., SelectedBucketsCount: 8 out of 8\n   +- *(2) Sort [customer_id#10 ASC NULLS FIRST], false, 0\n      +- *(2) Filter isnotnull(customer_id#10)\n         +- *(2) ColumnarToRow\n            +- FileScan parquet spark_catalog.default.customers_bucketed[customer_id#10,loyalty_tier#8,birth_year#9] Batched: true, Bucketed: true, DataFilters: [isnotnull(customer_id#10)], Format: Parquet, Location: InMemoryFileIndex(1 paths)[/warehouse-layout/customers_bucketed], PartitionFilters: [], PushedFilters: [IsNotNull(customer_id)], ReadSchema: struct<customer_id:string,loyalty_tier:string,birth_year:int>, SelectedBucketsCount: 8 out of 8\n\n",
  "joins.aqe_after": "AdaptiveSparkPlan isFinalPlan=true\n      +- *(3) BroadcastHashJoin [customer_id#1], [customer_id#11], Inner, BuildRight, false\n         :     +- Exchange hashpartitioning(customer_id#1, 8), ENSURE_REQUIREMENTS, [plan_id=N]\n            +- BroadcastExchange HashedRelationBroadcastMode(List(input[0, string, false]),false), [plan_id=N]\n                     +- Exchange hashpartitioning(customer_id#11, 8), ENSURE_REQUIREMENTS, [plan_id=N]\n   +- SortMergeJoin [customer_id#1], [customer_id#11], Inner\n      :- Sort [customer_id#1 ASC NULLS FIRST], false, 0\n      :  +- Exchange hashpartitioning(customer_id#1, 8), ENSURE_REQUIREMENTS, [plan_id=N]\n      +- Sort [customer_id#11 ASC NULLS FIRST], false, 0\n         +- Exchange hashpartitioning(customer_id#11, 8), ENSURE_REQUIREMENTS, [plan_id=N]",
  "joins.aqe_before": "AdaptiveSparkPlan isFinalPlan=false\n   +- SortMergeJoin [customer_id#1], [customer_id#11], Inner\n      :- Sort [customer_id#1 ASC NULLS FIRST], false, 0\n      :  +- Exchange hashpartitioning(customer_id#1, 8), ENSURE_REQUIREMENTS, [plan_id=N]\n      +- Sort [customer_id#11 ASC NULLS FIRST], false, 0\n         +- Exchange hashpartitioning(customer_id#11, 8), ENSURE_REQUIREMENTS, [plan_id=N]",
  "joins.plan.a range condition, not equality": "*(2) BroadcastNestedLoopJoin BuildRight, Inner, (total_cents#1 >= min_cents#2)\n+- BroadcastExchange IdentityBroadcastMode, [plan_id=N]",
  "joins.plan.a range condition, tiers is small": "*(2) BroadcastNestedLoopJoin BuildLeft, Inner, (total_cents#1 >= min_cents#2)\n:- BroadcastExchange IdentityBroadcastMode, [plan_id=N]",
  "joins.plan.broadcast turned off": "+- *(5) SortMergeJoin [store_id#1], [store_id#11], Inner\n   :- *(2) Sort [store_id#1 ASC NULLS FIRST], false, 0\n   :  +- Exchange hashpartitioning(store_id#1, 8), ENSURE_REQUIREMENTS, [plan_id=N]\n   +- *(4) Sort [store_id#11 ASC NULLS FIRST], false, 0\n      +- Exchange hashpartitioning(store_id#11, 8), ENSURE_REQUIREMENTS, [plan_id=N]",
  "joins.plan.hint: broadcast(stores)": "+- *(2) BroadcastHashJoin [store_id#1], [store_id#11], Inner, BuildRight, false\n   +- BroadcastExchange HashedRelationBroadcastMode(List(input[0, string, false]),false), [plan_id=N]",
  "joins.plan.hint: shuffle_hash on stores": "+- *(3) ShuffledHashJoin [store_id#1], [store_id#11], Inner, BuildRight\n   :- Exchange hashpartitioning(store_id#1, 8), ENSURE_REQUIREMENTS, [plan_id=N]\n   +- Exchange hashpartitioning(store_id#11, 8), ENSURE_REQUIREMENTS, [plan_id=N]",
  "joins.plan.stores is small: the default": "+- *(2) BroadcastHashJoin [store_id#1], [store_id#11], Inner, BuildRight, false\n   +- BroadcastExchange HashedRelationBroadcastMode(List(input[0, string, false]),false), [plan_id=N]",
  "joins.pushdown": "Project [store_id#1, order_id#2L, customer_id#3, order_ts#4, status#5, channel#6, total_cents#7, dt#8, city#9, country#10]\n+- Join Inner, (store_id#1 = store_id#11)\n   :- Filter isnotnull(store_id#1)\n   :  +- Relation [order_id#2L,store_id#1,customer_id#3,order_ts#4,status#5,channel#6,total_cents#7,dt#8] parquet\n   +- Filter ((isnotnull(country#10) AND (country#10 = SG)) AND isnotnull(store_id#11))\n      +- Relation [store_id#11,city#9,country#10] parquet",
  "mem.plan_before_action": "== Physical Plan ==\nInMemoryTableScan [order_id#1L, store_id#2, customer_id#3, order_ts#4, status#5, channel#6, total_cents#7, dt#8]\n   +- InMemoryRelation [order_id#1L, store_id#2, customer_id#3, order_ts#4, status#5, channel#6, total_cents#7, dt#8], StorageLevel(disk, memory, deserialized, 1 replicas)\n         +- *(1) Filter (isnotnull(status#5) AND (status#5 = PAID))\n            +- *(1) ColumnarToRow\n               +- FileScan parquet [order_id#1L,store_id#2,customer_id#3,order_ts#4,status#5,channel#6,total_cents#7,dt#8] Batched: true, DataFilters: [isnotnull(status#5), (status#5 = PAID)], Format: Parquet, Location: InMemoryFileIndex(1 paths)[/lake/orders], PartitionFilters: [], PushedFilters: [IsNotNull(status), EqualTo(status,PAID)], ReadSchema: struct<order_id:bigint,store_id:string,customer_id:string,order_ts:timestamp,status:string,channe...\n\n",
  "mem.plan_cached": "== Physical Plan ==\nAdaptiveSparkPlan isFinalPlan=false\n+- HashAggregate(keys=[store_id#1], functions=[count(1)])\n   +- Exchange hashpartitioning(store_id#1, 8), ENSURE_REQUIREMENTS, [plan_id=N]\n      +- HashAggregate(keys=[store_id#1], functions=[partial_count(1)])\n         +- InMemoryTableScan [store_id#1]\n               +- InMemoryRelation [order_id#2L, store_id#1, customer_id#3, order_ts#4, status#5, channel#6, total_cents#7, dt#8], StorageLevel(disk, memory, deserialized, 1 replicas)\n                     +- *(1) Filter (isnotnull(status#5) AND (status#5 = PAID))\n                        +- *(1) ColumnarToRow\n                           +- FileScan parquet [order_id#2L,store_id#1,customer_id#3,order_ts#4,status#5,channel#6,total_cents#7,dt#8] Batched: true, DataFilters: [isnotnull(status#5), (status#5 = PAID)], Format: Parquet, Location: InMemoryFileIndex(1 paths)[/lake/orders], PartitionFilters: [], PushedFilters: [IsNotNull(status), EqualTo(status,PAID)], ReadSchema: struct<order_id:bigint,store_id:string,customer_id:string,order_ts:timestamp,status:string,channe...\n\n",
  "parts.plan_coalesce": "== Physical Plan ==\nAdaptiveSparkPlan isFinalPlan=false\n+- Coalesce 3\n   +- Exchange hashpartitioning(dt#1, 14), REPARTITION_BY_NUM, [plan_id=N]\n      +- FileScan parquet [order_id#2L,store_id#3,customer_id#4,order_ts#5,status#6,channel#7,total_cents#8,dt#1] Batched: true, DataFilters: [], Format: Parquet, Location: InMemoryFileIndex(1 paths)[/lake/orders], PartitionFilters: [], PushedFilters: [], ReadSchema: struct<order_id:bigint,store_id:string,customer_id:string,order_ts:timestamp,status:string,channe...\n\n",
  "parts.plan_repartition": "== Physical Plan ==\nAdaptiveSparkPlan isFinalPlan=false\n+- Exchange RoundRobinPartitioning(3), REPARTITION_BY_NUM, [plan_id=N]\n   +- FileScan parquet [order_id#1L,store_id#2,customer_id#3,order_ts#4,status#5,channel#6,total_cents#7,dt#8] Batched: true, DataFilters: [], Format: Parquet, Location: InMemoryFileIndex(1 paths)[/lake/orders], PartitionFilters: [], PushedFilters: [], ReadSchema: struct<order_id:bigint,store_id:string,customer_id:string,order_ts:timestamp,status:string,channe...\n\n",
  "parts.plan_repartition_by": "== Physical Plan ==\nAdaptiveSparkPlan isFinalPlan=false\n+- Exchange hashpartitioning(store_id#1, 6), REPARTITION_BY_NUM, [plan_id=N]\n   +- FileScan parquet [order_id#2L,store_id#1,customer_id#3,order_ts#4,status#5,channel#6,total_cents#7,dt#8] Batched: true, DataFilters: [], Format: Parquet, Location: InMemoryFileIndex(1 paths)[/lake/orders], PartitionFilters: [], PushedFilters: [], ReadSchema: struct<order_id:bigint,store_id:string,customer_id:string,order_ts:timestamp,status:string,channe...\n\n",
  "plans.analyzed": "store_id: string, revenue: bigint\nAggregate [store_id#1], [store_id#1, sum(total_cents#2) AS revenue#3L]\n+- Project [store_id#1, total_cents#2]\n   +- Filter (dt#4 >= cast(2026-11-05 as date))\n      +- Filter (status#5 = PAID)\n         +- Relation [order_id#6L,store_id#1,customer_id#7,order_ts#8,status#5,channel#9,total_cents#2,dt#4] parquet",
  "plans.fold_after": "Project [id#1L, (id#1L * 5) AS x#2L]\n+- Filter (((id#1L * 5) > 10) AND (id#1L < 9))\n   +- Range (0, 10, step=1, splits=Some(4))",
  "plans.fold_before": "id: bigint, x: bigint\nFilter (id#1L < cast(9 as bigint))\n+- Filter (x#2L > cast(10 as bigint))\n   +- Project [id#1L, (id#1L * cast((2 + 3) as bigint)) AS x#2L]\n      +- Range (0, 10, step=1, splits=Some(4))",
  "plans.formatted": "== Physical Plan ==\nAdaptiveSparkPlan (7)\n+- HashAggregate (6)\n   +- Exchange (5)\n      +- HashAggregate (4)\n         +- Project (3)\n            +- Filter (2)\n               +- Scan parquet  (1)\n\n\n(1) Scan parquet \nOutput [4]: [store_id#1, status#2, total_cents#3, dt#4]\nBatched: true\nLocation: InMemoryFileIndex [/lake/orders]\nPartitionFilters: [isnotnull(dt#4), (dt#4 >= 2026-11-05)]\nPushedFilters: [IsNotNull(status), EqualTo(status,PAID)]\nReadSchema: struct<store_id:string,status:string,total_cents:int>\n\n(2) Filter\nInput [4]: [store_id#1, status#2, total_cents#3, dt#4]\nCondition : (isnotnull(status#2) AND (status#2 = PAID))\n\n(3) Project\nOutput [2]: [store_id#1, total_cents#3]\nInput [4]: [store_id#1, status#2, total_cents#3, dt#4]\n\n(4) HashAggregate\nInput [2]: [store_id#1, total_cents#3]\nKeys [1]: [store_id#1]\nFunctions [1]: [partial_sum(total_cents#3)]\nAggregate Attributes [1]: [sum#5L]\nResults [2]: [store_id#1, sum#6L]\n\n(5) Exchange\nInput [2]: [store_id#1, sum#6L]\nArguments: hashpartitioning(store_id#1, 8), ENSURE_REQUIREMENTS, [plan_id=N]\n\n(6) HashAggregate\nInput [2]: [store_id#1, sum#6L]\nKeys [1]: [store_id#1]\nFunctions [1]: [sum(total_cents#3)]\nAggregate Attributes [1]: [sum(total_cents#3)#7L]\nResults [2]: [store_id#1, sum(total_cents#3)#7L AS revenue#8L]\n\n(7) AdaptiveSparkPlan\nOutput [2]: [store_id#1, revenue#8L]\nArguments: isFinalPlan=false\n\n",
  "plans.optimized": "Aggregate [store_id#1], [store_id#1, sum(total_cents#2) AS revenue#3L]\n+- Project [store_id#1, total_cents#2]\n   +- Filter ((isnotnull(status#4) AND isnotnull(dt#5)) AND ((status#4 = PAID) AND (dt#5 >= 2026-11-05)))\n      +- Relation [order_id#6L,store_id#1,customer_id#7,order_ts#8,status#4,channel#9,total_cents#2,dt#5] parquet",
  "plans.parsed": "'Aggregate ['store_id], ['store_id, 'sum('total_cents) AS revenue#1]\n+- Project [store_id#2, total_cents#3]\n   +- Filter (dt#4 >= cast(2026-11-05 as date))\n      +- Filter (status#5 = PAID)\n         +- Relation [order_id#6L,store_id#2,customer_id#7,order_ts#8,status#5,channel#9,total_cents#3,dt#4] parquet",
  "plans.physical": "AdaptiveSparkPlan isFinalPlan=false\n+- HashAggregate(keys=[store_id#1], functions=[sum(total_cents#2)], output=[store_id#1, revenue#3L])\n   +- Exchange hashpartitioning(store_id#1, 8), ENSURE_REQUIREMENTS, [plan_id=N]\n      +- HashAggregate(keys=[store_id#1], functions=[partial_sum(total_cents#2)], output=[store_id#1, sum#4L])\n         +- Project [store_id#1, total_cents#2]\n            +- Filter (isnotnull(status#5) AND (status#5 = PAID))\n               +- FileScan parquet [store_id#1,status#5,total_cents#2,dt#6] Batched: true, DataFilters: [isnotnull(status#5), (status#5 = PAID)], Format: Parquet, Location: InMemoryFileIndex(1 paths)[/lake/orders], PartitionFilters: [isnotnull(dt#6), (dt#6 >= 2026-11-05)], PushedFilters: [IsNotNull(status), EqualTo(status,PAID)], ReadSchema: struct<store_id:string,status:string,total_cents:int>",
  "skew.plan_adaptive": "AdaptiveSparkPlan isFinalPlan=true\n      +- *(5) SortMergeJoin(skew=true) [store_id#1], [store_id#11], Inner\n         :- *(3) Sort [store_id#1 ASC NULLS FIRST], false, 0\n         :        +- Exchange hashpartitioning(store_id#1, 12), ENSURE_REQUIREMENTS, [plan_id=N]\n         +- *(4) Sort [store_id#11 ASC NULLS FIRST], false, 0\n                  +- Exchange hashpartitioning(store_id#11, 12), ENSURE_REQUIREMENTS, [plan_id=N]\n   +- SortMergeJoin [store_id#1], [store_id#11], Inner\n      :- Sort [store_id#1 ASC NULLS FIRST], false, 0\n      :  +- Exchange hashpartitioning(store_id#1, 12), ENSURE_REQUIREMENTS, [plan_id=N]\n      +- Sort [store_id#11 ASC NULLS FIRST], false, 0\n         +- Exchange hashpartitioning(store_id#11, 12), ENSURE_REQUIREMENTS, [plan_id=N]",
  "skew.plan_salted": "AdaptiveSparkPlan isFinalPlan=true\n      +- *(5) SortMergeJoin [store_id#1, salt#2], [store_id#12, salt#13], Inner\n         :- *(3) Sort [store_id#1 ASC NULLS FIRST, salt#2 ASC NULLS FIRST], false, 0\n         :     +- Exchange hashpartitioning(store_id#1, salt#2, 12), ENSURE_REQUIREMENTS, [plan_id=N]\n         +- *(4) Sort [store_id#12 ASC NULLS FIRST, salt#13 ASC NULLS FIRST], false, 0\n               +- Exchange hashpartitioning(store_id#12, salt#13, 12), ENSURE_REQUIREMENTS, [plan_id=N]\n   +- SortMergeJoin [store_id#1, salt#2], [store_id#12, salt#13], Inner\n      :- Sort [store_id#1 ASC NULLS FIRST, salt#2 ASC NULLS FIRST], false, 0\n      :  +- Exchange hashpartitioning(store_id#1, salt#2, 12), ENSURE_REQUIREMENTS, [plan_id=N]\n      +- Sort [store_id#12 ASC NULLS FIRST, salt#13 ASC NULLS FIRST], false, 0\n         +- Exchange hashpartitioning(store_id#12, salt#13, 12), ENSURE_REQUIREMENTS, [plan_id=N]",
  "sql.qualify": "[PARSE_SYNTAX_ERROR] Syntax error at or near 'r'. SQLSTATE: 42601 (line 1, pos 110)",
  "test.pytest_bug": "F...                                                                     [100%]\n=================================== FAILURES ===================================\n_____________________ test_paid_and_refunded_orders_count ______________________\ntest_transforms.py:29: in test_paid_and_refunded_orders_count\n    assertDataFrameEqual(got, want)\nE   pyspark.errors.exceptions.base.PySparkAssertionError: [DIFFERENT_ROWS] Results do not match: ( 100.00000 % )\nE   *** actual ***\nE   ! Row(store_id='s01', day=datetime.date(2026, 11, 1), orders=1, revenue_cents=1000)\nE   \nE   \nE   *** expected ***\nE   ! Row(store_id='s01', day=datetime.date(2026, 11, 1), orders=2, revenue_cents=1500)\n=========================== short test summary info ============================\nFAILED test_transforms.py::test_paid_and_refunded_orders_count - pyspark.erro...\n1 failed, 3 passed",
  "test.pytest_clean": "....                                                                     [100%]\n4 passed",
  "udf.null": "TypeError: object of type 'NoneType' has no len()",
  "udf.plan.Python UDF": "*(2) Project [order_id#1L, status#2, pythonUDF0#3 AS label#4]\n+- BatchEvalPython [label_python(status#2)#5], [pythonUDF0#3]\n   +- *(1) Project [order_id#1L, status#2]",
  "udf.plan.Python UDF with Arrow": "*(2) Project [order_id#1L, status#2, pythonUDF0#3 AS label#4]\n+- ArrowEvalPython [label_python(status#2)#5], [pythonUDF0#3], 101\n   +- *(1) Project [order_id#1L, status#2]",
  "udf.plan.built-in functions": "*(1) Project [order_id#1L, status#2, CASE WHEN (status#2 = PAID) THEN ok WHEN (status#2 = REFUNDED) THEN check ELSE other END AS label#3]",
  "udf.plan.pandas UDF": "*(2) Project [order_id#1L, status#2, pythonUDF0#3 AS label#4]\n+- ArrowEvalPython [label_pandas(status#2)#5], [pythonUDF0#3], 200\n   +- *(1) Project [order_id#1L, status#2]"
 }
};
