window.LAB = window.LAB || {};
LAB.real = {
 "counts": {
  "af.assets": {
   "and_consumer_logs": [
    "triggered by customers_raw: 1 event(s)\ntriggered by orders_raw: 3 event(s)\n[info] Done. Returned value was: None"
   ],
   "and_consumer_logs_all": [
    "triggered by customers_raw: 1 event(s)\ntriggered by orders_raw: 3 event(s)\n[info] Done. Returned value was: None",
    "triggered by customers_raw: 1 event(s)\ntriggered by orders_raw: 1 event(s)\n[info] Done. Returned value was: None"
   ],
   "and_consumer_runs_after": 1,
   "and_consumer_runs_before": 0,
   "and_runs_after_extra_customers_event": 1,
   "and_runs_after_extra_orders_event": 2,
   "assets": [
    {
     "name": "customers_raw",
     "uri": "brewline://lake/raw/customers"
    },
    {
     "name": "orders_raw",
     "uri": "brewline://lake/raw/orders"
    }
   ],
   "consumer_logs": [
    "[info] Done. Returned value was: None\ntriggered by orders_raw: 1 event(s)",
    "triggered by orders_raw: 1 event(s)\n[info] Done. Returned value was: None",
    "triggered by orders_raw: 1 event(s)\n[info] Done. Returned value was: None"
   ],
   "consumer_run_types": [
    "asset_triggered"
   ],
   "consumer_runs_after_3_events": 3,
   "events": [
    {
     "asset": "customers_raw",
     "events": 2,
     "source_dag": "brewline_land_customers"
    },
    {
     "asset": "orders_raw",
     "events": 4,
     "source_dag": "brewline_land_orders"
    }
   ],
   "producer_runs": 3
  },
  "af.backfill": {
   "backfill_rows": [
    [
     "brewline_backfill_demo",
     "2026-03-05 00:00:00.000000",
     "2026-03-07 23:59:59.000000",
     2,
     "none"
    ],
    [
     "brewline_backfill_demo",
     "2026-03-05 00:00:00.000000",
     "2026-03-07 23:59:59.000000",
     10,
     "none"
    ],
    [
     "brewline_backfill_demo",
     "2026-03-05 00:00:00.000000",
     "2026-03-07 23:59:59.000000",
     10,
     "completed"
    ]
   ],
   "created": [
    {
     "logical_date": "2026-03-05 00:00:00.000000",
     "run_id": "backfill__2026-03-05T00:00:00+00:00",
     "state": "success",
     "type": "backfill"
    },
    {
     "logical_date": "2026-03-06 00:00:00.000000",
     "run_id": "backfill__2026-03-06T00:00:00+00:00",
     "state": "success",
     "type": "backfill"
    },
    {
     "logical_date": "2026-03-07 00:00:00.000000",
     "run_id": "backfill__2026-03-07T00:00:00+00:00",
     "state": "success",
     "type": "backfill"
    }
   ],
   "runs_after_first_call": 3,
   "runs_after_second_call": 3,
   "second_backfill_while_running": {
    "error": "airflow.models.backfill.AlreadyRunningBackfill: Another backfill is running for Dag brewline_backfill_demo. There can be only one running backfill per Dag.",
    "exit_code": 1
   },
   "tries_after_completed": [
    2,
    2,
    2
   ],
   "tries_after_none": [
    1,
    1,
    1
   ],
   "window": [
    "2026-03-05T00:00:00+00:00",
    "2026-03-07T23:59:59+00:00"
   ]
  },
  "af.backoff": {
   "dag_id": "brewline_backoff",
   "delays_from_formula": [
    1,
    2,
    5,
    10
   ],
   "delays_in_database": [
    1.0,
    2.0,
    5.0,
    10.0
   ],
   "final_state": "failed",
   "logical_date": "2026-03-14 00:00:00+00:00",
   "max_retry_delay_seconds": 10,
   "multiplier": 2.0,
   "retries": 4,
   "retry_delay_seconds": 1,
   "seconds_between_end_and_next_start": [
    1.3,
    2.4,
    5.9,
    11.0
   ],
   "task_id": "call_partner",
   "tries": 5
  },
  "af.branch": {
   "full": {
    "conf": {
     "full_refresh": true
    },
    "printed": [
     "loading everything",
     "building marts"
    ],
    "states": {
     "build_marts": "success",
     "choose": "success",
     "full_load": "success",
     "incremental_load": "skipped"
    }
   },
   "incremental": {
    "conf": {
     "full_refresh": false
    },
    "printed": [
     "loading yesterday",
     "building marts"
    ],
    "states": {
     "build_marts": "success",
     "choose": "success",
     "full_load": "skipped",
     "incremental_load": "success"
    }
   }
  },
  "af.broken": {
   "broken_airflow2.py": {
    "dags": [],
    "import_errors": {
     "broken_airflow2.py": "TypeError: DAG.__init__() got an unexpected keyword argument 'schedule_interval'"
    }
   },
   "broken_cycle.py": {
    "dags": [],
    "import_errors": {
     "broken_cycle.py": "AirflowDagCycleException: Cycle detected in Dag: broken_cycle. Faulty task: check"
    }
   },
   "broken_duplicate.py": {
    "dags": [],
    "import_errors": {
     "broken_duplicate.py": "airflow.sdk.exceptions.DuplicateTaskIdFound: Task id 'load' has already been added to the Dag"
    }
   },
   "broken_import.py": {
    "dags": [],
    "import_errors": {
     "broken_import.py": "ModuleNotFoundError: No module named 'brewline_utils'"
    }
   },
   "old_style.py": {
    "dags": [],
    "import_errors": {
     "old_style.py": "ImportError: cannot import name 'days_ago' from 'airflow.utils.dates' (/usr/local/lib/python3.12/site-packages/airflow/utils/dates.py)"
    }
   },
   "toplevel_slow.py": {
    "dags": [
     "toplevel_slow"
    ],
    "import_errors": {}
   }
  },
  "af.callbacks": {
   "file": [
    "retry task=export try=1",
    "failure task=export try=2"
   ],
   "run_state": "failed",
   "task_retries": 1
  },
  "af.catchup": {
   "start_date": "2026-03-10",
   "today": "2026-03-14",
   "variants": {
    "brewline_catchup_off": {
     "catchup": false,
     "max_active_runs": 16,
     "peak_parallel_runs": 1,
     "run_count": 1,
     "runs": [
      {
       "logical_date": "2026-03-14 00:00:00.000000",
       "run_after": "2026-03-14 00:00:00.000000",
       "run_id": "scheduled__2026-03-14T00:00:00+00:00",
       "state": "success",
       "type": "scheduled"
      }
     ]
    },
    "brewline_catchup_on": {
     "catchup": true,
     "max_active_runs": 2,
     "peak_parallel_runs": 2,
     "run_count": 5,
     "runs": [
      {
       "logical_date": "2026-03-10 00:00:00.000000",
       "run_after": "2026-03-10 00:00:00.000000",
       "run_id": "scheduled__2026-03-10T00:00:00+00:00",
       "state": "success",
       "type": "scheduled"
      },
      {
       "logical_date": "2026-03-11 00:00:00.000000",
       "run_after": "2026-03-11 00:00:00.000000",
       "run_id": "scheduled__2026-03-11T00:00:00+00:00",
       "state": "success",
       "type": "scheduled"
      },
      {
       "logical_date": "2026-03-12 00:00:00.000000",
       "run_after": "2026-03-12 00:00:00.000000",
       "run_id": "scheduled__2026-03-12T00:00:00+00:00",
       "state": "success",
       "type": "scheduled"
      },
      {
       "logical_date": "2026-03-13 00:00:00.000000",
       "run_after": "2026-03-13 00:00:00.000000",
       "run_id": "scheduled__2026-03-13T00:00:00+00:00",
       "state": "success",
       "type": "scheduled"
      },
      {
       "logical_date": "2026-03-14 00:00:00.000000",
       "run_after": "2026-03-14 00:00:00.000000",
       "run_id": "scheduled__2026-03-14T00:00:00+00:00",
       "state": "success",
       "type": "scheduled"
      }
     ]
    },
    "brewline_catchup_serial": {
     "catchup": true,
     "max_active_runs": 1,
     "peak_parallel_runs": 1,
     "run_count": 5,
     "runs": [
      {
       "logical_date": "2026-03-10 00:00:00.000000",
       "run_after": "2026-03-10 00:00:00.000000",
       "run_id": "scheduled__2026-03-10T00:00:00+00:00",
       "state": "success",
       "type": "scheduled"
      },
      {
       "logical_date": "2026-03-11 00:00:00.000000",
       "run_after": "2026-03-11 00:00:00.000000",
       "run_id": "scheduled__2026-03-11T00:00:00+00:00",
       "state": "success",
       "type": "scheduled"
      },
      {
       "logical_date": "2026-03-12 00:00:00.000000",
       "run_after": "2026-03-12 00:00:00.000000",
       "run_id": "scheduled__2026-03-12T00:00:00+00:00",
       "state": "success",
       "type": "scheduled"
      },
      {
       "logical_date": "2026-03-13 00:00:00.000000",
       "run_after": "2026-03-13 00:00:00.000000",
       "run_id": "scheduled__2026-03-13T00:00:00+00:00",
       "state": "success",
       "type": "scheduled"
      },
      {
       "logical_date": "2026-03-14 00:00:00.000000",
       "run_after": "2026-03-14 00:00:00.000000",
       "run_id": "scheduled__2026-03-14T00:00:00+00:00",
       "state": "success",
       "type": "scheduled"
      }
     ]
    }
   }
  },
  "af.config_env": {
   "value_read": "8",
   "variable": "AIRFLOW__CORE__PARALLELISM=8"
  },
  "af.cron": {
   "exprs": {
    "* * * * *": {
     "description": "Every minute",
     "fires": [
      "2026-03-14 10:17:00+00:00",
      "2026-03-14 10:18:00+00:00",
      "2026-03-14 10:19:00+00:00",
      "2026-03-14 10:20:00+00:00",
      "2026-03-14 10:21:00+00:00"
     ]
    },
    "*/10 8-10 * * *": {
     "description": "Every 10 minutes, between 08:00 and 10:59",
     "fires": [
      "2026-03-14 10:20:00+00:00",
      "2026-03-14 10:30:00+00:00",
      "2026-03-14 10:40:00+00:00",
      "2026-03-14 10:50:00+00:00",
      "2026-03-15 08:00:00+00:00"
     ]
    },
    "*/15 * * * *": {
     "description": "Every 15 minutes",
     "fires": [
      "2026-03-14 10:30:00+00:00",
      "2026-03-14 10:45:00+00:00",
      "2026-03-14 11:00:00+00:00",
      "2026-03-14 11:15:00+00:00",
      "2026-03-14 11:30:00+00:00"
     ]
    },
    "0 * * * *": {
     "description": "Every hour",
     "fires": [
      "2026-03-14 11:00:00+00:00",
      "2026-03-14 12:00:00+00:00",
      "2026-03-14 13:00:00+00:00",
      "2026-03-14 14:00:00+00:00",
      "2026-03-14 15:00:00+00:00"
     ]
    },
    "0 */6 * * *": {
     "description": "Every 6 hours",
     "fires": [
      "2026-03-14 12:00:00+00:00",
      "2026-03-14 18:00:00+00:00",
      "2026-03-15 00:00:00+00:00",
      "2026-03-15 06:00:00+00:00",
      "2026-03-15 12:00:00+00:00"
     ]
    },
    "0 0 * * *": {
     "description": "At 00:00",
     "fires": [
      "2026-03-15 00:00:00+00:00",
      "2026-03-16 00:00:00+00:00",
      "2026-03-17 00:00:00+00:00",
      "2026-03-18 00:00:00+00:00",
      "2026-03-19 00:00:00+00:00"
     ]
    },
    "0 0 * * 6,0": {
     "description": "At 00:00, only on Saturday and Sunday",
     "fires": [
      "2026-03-15 00:00:00+00:00",
      "2026-03-21 00:00:00+00:00",
      "2026-03-22 00:00:00+00:00",
      "2026-03-28 00:00:00+00:00",
      "2026-03-29 00:00:00+00:00"
     ]
    },
    "0 0 * * 7": {
     "description": "At 00:00, only on Sunday",
     "fires": [
      "2026-03-15 00:00:00+00:00",
      "2026-03-22 00:00:00+00:00",
      "2026-03-29 00:00:00+00:00",
      "2026-04-05 00:00:00+00:00",
      "2026-04-12 00:00:00+00:00"
     ]
    },
    "0 0 1 * *": {
     "description": "At 00:00, on day 1 of the month",
     "fires": [
      "2026-04-01 00:00:00+00:00",
      "2026-05-01 00:00:00+00:00",
      "2026-06-01 00:00:00+00:00",
      "2026-07-01 00:00:00+00:00",
      "2026-08-01 00:00:00+00:00"
     ]
    },
    "0 0 1 1 *": {
     "description": "At 00:00, on day 1 of the month, only in January",
     "fires": [
      "2027-01-01 00:00:00+00:00",
      "2028-01-01 00:00:00+00:00",
      "2029-01-01 00:00:00+00:00",
      "2030-01-01 00:00:00+00:00",
      "2031-01-01 00:00:00+00:00"
     ]
    },
    "0 0 1 JAN,JUL *": {
     "description": "At 00:00, on day 1 of the month, only in January and July",
     "fires": [
      "2026-07-01 00:00:00+00:00",
      "2027-01-01 00:00:00+00:00",
      "2027-07-01 00:00:00+00:00",
      "2028-01-01 00:00:00+00:00",
      "2028-07-01 00:00:00+00:00"
     ]
    },
    "0 0 1,15 * *": {
     "description": "At 00:00, on day 1 and 15 of the month",
     "fires": [
      "2026-03-15 00:00:00+00:00",
      "2026-04-01 00:00:00+00:00",
      "2026-04-15 00:00:00+00:00",
      "2026-05-01 00:00:00+00:00",
      "2026-05-15 00:00:00+00:00"
     ]
    },
    "0 0 13 * 5": {
     "description": "At 00:00, on day 13 of the month (or) At 00:00, only on Friday",
     "fires": [
      "2026-03-20 00:00:00+00:00",
      "2026-03-27 00:00:00+00:00",
      "2026-04-03 00:00:00+00:00",
      "2026-04-10 00:00:00+00:00",
      "2026-04-13 00:00:00+00:00"
     ]
    },
    "0 0 15 * *": {
     "description": "At 00:00, on day 15 of the month",
     "fires": [
      "2026-03-15 00:00:00+00:00",
      "2026-04-15 00:00:00+00:00",
      "2026-05-15 00:00:00+00:00",
      "2026-06-15 00:00:00+00:00",
      "2026-07-15 00:00:00+00:00"
     ]
    },
    "0 0 29 2 *": {
     "description": "At 00:00, on day 29 of the month, only in February",
     "fires": [
      "2028-02-29 00:00:00+00:00",
      "2032-02-29 00:00:00+00:00",
      "2036-02-29 00:00:00+00:00",
      "2040-02-29 00:00:00+00:00",
      "2044-02-29 00:00:00+00:00"
     ]
    },
    "0 0 31 * *": {
     "description": "At 00:00, on day 31 of the month",
     "fires": [
      "2026-03-31 00:00:00+00:00",
      "2026-05-31 00:00:00+00:00",
      "2026-07-31 00:00:00+00:00",
      "2026-08-31 00:00:00+00:00",
      "2026-10-31 00:00:00+00:00"
     ]
    },
    "0 1 * * 1-3": {
     "description": "At 01:00, Monday through Wednesday",
     "fires": [
      "2026-03-16 01:00:00+00:00",
      "2026-03-17 01:00:00+00:00",
      "2026-03-18 01:00:00+00:00",
      "2026-03-23 01:00:00+00:00",
      "2026-03-24 01:00:00+00:00"
     ]
    },
    "0 12 1-7 * 1": {
     "description": "At 12:00, between day 1 and 7 of the month (or) At 12:00, only on Monday",
     "fires": [
      "2026-03-16 12:00:00+00:00",
      "2026-03-23 12:00:00+00:00",
      "2026-03-30 12:00:00+00:00",
      "2026-04-01 12:00:00+00:00",
      "2026-04-02 12:00:00+00:00"
     ]
    },
    "0 2 * * *": {
     "description": "At 02:00",
     "fires": [
      "2026-03-15 02:00:00+00:00",
      "2026-03-16 02:00:00+00:00",
      "2026-03-17 02:00:00+00:00",
      "2026-03-18 02:00:00+00:00",
      "2026-03-19 02:00:00+00:00"
     ]
    },
    "0 22 * * 1-5": {
     "description": "At 22:00, Monday through Friday",
     "fires": [
      "2026-03-16 22:00:00+00:00",
      "2026-03-17 22:00:00+00:00",
      "2026-03-18 22:00:00+00:00",
      "2026-03-19 22:00:00+00:00",
      "2026-03-20 22:00:00+00:00"
     ]
    },
    "0 6 * * 1,3,5": {
     "description": "At 06:00, only on Monday, Wednesday, and Friday",
     "fires": [
      "2026-03-16 06:00:00+00:00",
      "2026-03-18 06:00:00+00:00",
      "2026-03-20 06:00:00+00:00",
      "2026-03-23 06:00:00+00:00",
      "2026-03-25 06:00:00+00:00"
     ]
    },
    "0 6 * * MON": {
     "description": "At 06:00, only on Monday",
     "fires": [
      "2026-03-16 06:00:00+00:00",
      "2026-03-23 06:00:00+00:00",
      "2026-03-30 06:00:00+00:00",
      "2026-04-06 06:00:00+00:00",
      "2026-04-13 06:00:00+00:00"
     ]
    },
    "0 8 */2 * *": {
     "description": "At 08:00, every 2 days",
     "fires": [
      "2026-03-15 08:00:00+00:00",
      "2026-03-17 08:00:00+00:00",
      "2026-03-19 08:00:00+00:00",
      "2026-03-21 08:00:00+00:00",
      "2026-03-23 08:00:00+00:00"
     ]
    },
    "0 9-17 * * 1-5": {
     "description": "At 0 minutes past the hour, between 09:00 and 17:59, Monday through Friday",
     "fires": [
      "2026-03-16 09:00:00+00:00",
      "2026-03-16 10:00:00+00:00",
      "2026-03-16 11:00:00+00:00",
      "2026-03-16 12:00:00+00:00",
      "2026-03-16 13:00:00+00:00"
     ]
    },
    "15 2,14 * * *": {
     "description": "At 02:15 and 14:15",
     "fires": [
      "2026-03-14 14:15:00+00:00",
      "2026-03-15 02:15:00+00:00",
      "2026-03-15 14:15:00+00:00",
      "2026-03-16 02:15:00+00:00",
      "2026-03-16 14:15:00+00:00"
     ]
    },
    "20,50 * * * *": {
     "description": "At 20 and 50 minutes past the hour",
     "fires": [
      "2026-03-14 10:20:00+00:00",
      "2026-03-14 10:50:00+00:00",
      "2026-03-14 11:20:00+00:00",
      "2026-03-14 11:50:00+00:00",
      "2026-03-14 12:20:00+00:00"
     ]
    },
    "30 3 * * *": {
     "description": "At 03:30",
     "fires": [
      "2026-03-15 03:30:00+00:00",
      "2026-03-16 03:30:00+00:00",
      "2026-03-17 03:30:00+00:00",
      "2026-03-18 03:30:00+00:00",
      "2026-03-19 03:30:00+00:00"
     ]
    },
    "45 23 * * 0": {
     "description": "At 23:45, only on Sunday",
     "fires": [
      "2026-03-15 23:45:00+00:00",
      "2026-03-22 23:45:00+00:00",
      "2026-03-29 23:45:00+00:00",
      "2026-04-05 23:45:00+00:00",
      "2026-04-12 23:45:00+00:00"
     ]
    },
    "5 4 * * sun": {
     "description": "At 04:05, only on Sunday",
     "fires": [
      "2026-03-15 04:05:00+00:00",
      "2026-03-22 04:05:00+00:00",
      "2026-03-29 04:05:00+00:00",
      "2026-04-05 04:05:00+00:00",
      "2026-04-12 04:05:00+00:00"
     ]
    },
    "59 23 L * *": {
     "description": "At 23:59, on the last day of the month",
     "fires": [
      "2026-03-31 23:59:00+00:00",
      "2026-04-30 23:59:00+00:00",
      "2026-05-31 23:59:00+00:00",
      "2026-06-30 23:59:00+00:00",
      "2026-07-31 23:59:00+00:00"
     ]
    },
    "@daily": {
     "description": "At 00:00",
     "fires": [
      "2026-03-15 00:00:00+00:00",
      "2026-03-16 00:00:00+00:00",
      "2026-03-17 00:00:00+00:00",
      "2026-03-18 00:00:00+00:00",
      "2026-03-19 00:00:00+00:00"
     ]
    },
    "@hourly": {
     "description": "Every hour",
     "fires": [
      "2026-03-14 11:00:00+00:00",
      "2026-03-14 12:00:00+00:00",
      "2026-03-14 13:00:00+00:00",
      "2026-03-14 14:00:00+00:00",
      "2026-03-14 15:00:00+00:00"
     ]
    },
    "@midnight": {
     "description": "",
     "fires": [
      "2026-03-15 00:00:00+00:00",
      "2026-03-16 00:00:00+00:00",
      "2026-03-17 00:00:00+00:00",
      "2026-03-18 00:00:00+00:00",
      "2026-03-19 00:00:00+00:00"
     ]
    },
    "@monthly": {
     "description": "At 00:00, on day 1 of the month",
     "fires": [
      "2026-04-01 00:00:00+00:00",
      "2026-05-01 00:00:00+00:00",
      "2026-06-01 00:00:00+00:00",
      "2026-07-01 00:00:00+00:00",
      "2026-08-01 00:00:00+00:00"
     ]
    },
    "@weekly": {
     "description": "At 00:00, only on Sunday",
     "fires": [
      "2026-03-15 00:00:00+00:00",
      "2026-03-22 00:00:00+00:00",
      "2026-03-29 00:00:00+00:00",
      "2026-04-05 00:00:00+00:00",
      "2026-04-12 00:00:00+00:00"
     ]
    },
    "@yearly": {
     "description": "At 00:00, on day 1 of the month, only in January",
     "fires": [
      "2027-01-01 00:00:00+00:00",
      "2028-01-01 00:00:00+00:00",
      "2029-01-01 00:00:00+00:00",
      "2030-01-01 00:00:00+00:00",
      "2031-01-01 00:00:00+00:00"
     ]
    }
   },
   "start": "2026-03-14T10:17:00+00:00",
   "tz": "UTC"
  },
  "af.ctx": {
   "manual": {
    "has_data_interval": false,
    "has_logical_date": false,
    "logical_date": null,
    "run_id": "manual__2026-03-14T09:00:00.000000+00:00",
    "show_log": "run_id = manual__2026-03-14T09:00:00.000000+00:00\nlogical_date = <missing>\ndata_interval_start = <missing>\ndata_interval_end = <missing>\nds = <missing>\nts = <missing>\nrun_type = manual\n[info] Done. Returned value was: None",
    "state": "success",
    "templated_log": "[info] Done. Returned value was: None\nds argument = None"
   },
   "scheduled": {
    "has_data_interval": true,
    "has_logical_date": true,
    "logical_date": "2026-03-14 00:00:00.000000",
    "run_id": "scheduled__2026-03-14T00:00:00+00:00",
    "show_log": "run_id = scheduled__2026-03-14T00:00:00+00:00\nlogical_date = 2026-03-14 00:00:00+00:00\ndata_interval_start = 2026-03-14 00:00:00+00:00\ndata_interval_end = 2026-03-14 00:00:00+00:00\nds = 2026-03-14\nts = 2026-03-14T00:00:00+00:00\nrun_type = scheduled\n[info] Done. Returned value was: None",
    "state": "success",
    "templated_log": "ds argument = 2026-03-14\n[info] Done. Returned value was: None"
   }
  },
  "af.dagbag": {
   "count": 31,
   "dags": {
    "brewline_backoff": {
     "catchup": false,
     "edges": [
      [
       "call_partner",
       []
      ]
     ],
     "file": "brewline_backoff.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "call_partner": "_PythonDecoratedOperator"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "call_partner": 4
     },
     "schedule": "None",
     "tags": [],
     "tasks": [
      "call_partner"
     ],
     "timetable": "NullTimetable",
     "trigger_rules": {
      "call_partner": "all_success"
     }
    },
    "brewline_branch": {
     "catchup": false,
     "edges": [
      [
       "choose",
       [
        "full_load",
        "incremental_load"
       ]
      ],
      [
       "full_load",
       [
        "build_marts"
       ]
      ],
      [
       "incremental_load",
       [
        "build_marts"
       ]
      ],
      [
       "build_marts",
       []
      ]
     ],
     "file": "brewline_branch.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "build_marts": "_PythonDecoratedOperator",
      "choose": "_BranchPythonDecoratedOperator",
      "full_load": "_PythonDecoratedOperator",
      "incremental_load": "_PythonDecoratedOperator"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "build_marts": 0,
      "choose": 0,
      "full_load": 0,
      "incremental_load": 0
     },
     "schedule": "None",
     "tags": [],
     "tasks": [
      "choose",
      "full_load",
      "incremental_load",
      "build_marts"
     ],
     "timetable": "NullTimetable",
     "trigger_rules": {
      "build_marts": "none_failed_min_one_success",
      "choose": "all_success",
      "full_load": "all_success",
      "incremental_load": "all_success"
     }
    },
    "brewline_callbacks": {
     "catchup": false,
     "edges": [
      [
       "export",
       []
      ]
     ],
     "file": "brewline_callbacks.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "export": "_PythonDecoratedOperator"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "export": 1
     },
     "schedule": "None",
     "tags": [],
     "tasks": [
      "export"
     ],
     "timetable": "NullTimetable",
     "trigger_rules": {
      "export": "all_success"
     }
    },
    "brewline_ctx": {
     "catchup": false,
     "edges": [
      [
       "show",
       [
        "templated"
       ]
      ],
      [
       "templated",
       []
      ]
     ],
     "file": "brewline_ctx.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "show": "_PythonDecoratedOperator",
      "templated": "_PythonDecoratedOperator"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "show": 0,
      "templated": 0
     },
     "schedule": "@daily",
     "tags": [],
     "tasks": [
      "show",
      "templated"
     ],
     "timetable": "CronTriggerTimetable",
     "trigger_rules": {
      "show": "all_success",
      "templated": "all_success"
     }
    },
    "brewline_customer_orders": {
     "catchup": false,
     "edges": [
      [
       "build",
       []
      ]
     ],
     "file": "brewline_assets.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "build": "_PythonDecoratedOperator"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "build": 0
     },
     "schedule": "[Asset(name='orders_raw', uri='brewline://lake/raw/orders', group='asset', extra={}, watchers=[], access_control=AssetAccessControl(producer_teams=[], consumer_teams=None, allow_global=True)), Asset(name='customers_raw', uri='brewline://lake/raw/customers', group='asset', extra={}, watchers=[], access_control=AssetAccessControl(producer_teams=[], consumer_teams=None, allow_global=True))]",
     "tags": [],
     "tasks": [
      "build"
     ],
     "timetable": "AssetTriggeredTimetable",
     "trigger_rules": {
      "build": "all_success"
     }
    },
    "brewline_dag_limit": {
     "catchup": false,
     "edges": [
      [
       "load_1",
       []
      ],
      [
       "load_2",
       []
      ],
      [
       "load_3",
       []
      ],
      [
       "load_4",
       []
      ],
      [
       "load_5",
       []
      ],
      [
       "load_6",
       []
      ]
     ],
     "file": "brewline_dag_limit.py",
     "max_active_runs": 16,
     "max_active_tasks": 2,
     "operators": {
      "load_1": "BashOperator",
      "load_2": "BashOperator",
      "load_3": "BashOperator",
      "load_4": "BashOperator",
      "load_5": "BashOperator",
      "load_6": "BashOperator"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "load_1": 0,
      "load_2": 0,
      "load_3": 0,
      "load_4": 0,
      "load_5": 0,
      "load_6": 0
     },
     "schedule": "None",
     "tags": [],
     "tasks": [
      "load_1",
      "load_2",
      "load_3",
      "load_4",
      "load_5",
      "load_6"
     ],
     "timetable": "NullTimetable",
     "trigger_rules": {
      "load_1": "all_success",
      "load_2": "all_success",
      "load_3": "all_success",
      "load_4": "all_success",
      "load_5": "all_success",
      "load_6": "all_success"
     }
    },
    "brewline_db_access": {
     "catchup": false,
     "edges": [
      [
       "count_runs",
       []
      ]
     ],
     "file": "brewline_db_access.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "count_runs": "_PythonDecoratedOperator"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "count_runs": 0
     },
     "schedule": "None",
     "tags": [],
     "tasks": [
      "count_runs"
     ],
     "timetable": "NullTimetable",
     "trigger_rules": {
      "count_runs": "all_success"
     }
    },
    "brewline_deadline": {
     "catchup": false,
     "edges": [
      [
       "slow_load",
       []
      ]
     ],
     "file": "brewline_deadline.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "slow_load": "_PythonDecoratedOperator"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "slow_load": 0
     },
     "schedule": "None",
     "tags": [],
     "tasks": [
      "slow_load"
     ],
     "timetable": "NullTimetable",
     "trigger_rules": {
      "slow_load": "all_success"
     }
    },
    "brewline_first": {
     "catchup": false,
     "edges": [
      [
       "extract",
       [
        "transform"
       ]
      ],
      [
       "transform",
       [
        "load"
       ]
      ],
      [
       "load",
       []
      ]
     ],
     "file": "brewline_first.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "extract": "_PythonDecoratedOperator",
      "load": "_PythonDecoratedOperator",
      "transform": "_PythonDecoratedOperator"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "extract": 0,
      "load": 0,
      "transform": 0
     },
     "schedule": "@daily",
     "tags": [
      "brewline"
     ],
     "tasks": [
      "extract",
      "transform",
      "load"
     ],
     "timetable": "CronTriggerTimetable",
     "trigger_rules": {
      "extract": "all_success",
      "load": "all_success",
      "transform": "all_success"
     }
    },
    "brewline_flaky": {
     "catchup": false,
     "edges": [
      [
       "extract",
       [
        "load"
       ]
      ],
      [
       "load",
       []
      ]
     ],
     "file": "brewline_flaky.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "extract": "_PythonDecoratedOperator",
      "load": "_PythonDecoratedOperator"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "extract": 3,
      "load": 0
     },
     "schedule": "None",
     "tags": [],
     "tasks": [
      "extract",
      "load"
     ],
     "timetable": "NullTimetable",
     "trigger_rules": {
      "extract": "all_success",
      "load": "all_success"
     }
    },
    "brewline_land_customers": {
     "catchup": false,
     "edges": [
      [
       "land",
       []
      ]
     ],
     "file": "brewline_assets.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "land": "_PythonDecoratedOperator"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "land": 0
     },
     "schedule": "None",
     "tags": [],
     "tasks": [
      "land"
     ],
     "timetable": "NullTimetable",
     "trigger_rules": {
      "land": "all_success"
     }
    },
    "brewline_land_orders": {
     "catchup": false,
     "edges": [
      [
       "land",
       []
      ]
     ],
     "file": "brewline_assets.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "land": "_PythonDecoratedOperator"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "land": 0
     },
     "schedule": "None",
     "tags": [],
     "tasks": [
      "land"
     ],
     "timetable": "NullTimetable",
     "trigger_rules": {
      "land": "all_success"
     }
    },
    "brewline_load_append": {
     "catchup": false,
     "edges": [
      [
       "load",
       []
      ]
     ],
     "file": "brewline_load_append.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "load": "_PythonDecoratedOperator"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "load": 0
     },
     "schedule": "@daily",
     "tags": [],
     "tasks": [
      "load"
     ],
     "timetable": "CronTriggerTimetable",
     "trigger_rules": {
      "load": "all_success"
     }
    },
    "brewline_load_replace": {
     "catchup": false,
     "edges": [
      [
       "load",
       []
      ]
     ],
     "file": "brewline_load_replace.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "load": "_PythonDecoratedOperator"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "load": 0
     },
     "schedule": "@daily",
     "tags": [],
     "tasks": [
      "load"
     ],
     "timetable": "CronTriggerTimetable",
     "trigger_rules": {
      "load": "all_success"
     }
    },
    "brewline_load_upsert": {
     "catchup": false,
     "edges": [
      [
       "load",
       []
      ]
     ],
     "file": "brewline_load_upsert.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "load": "_PythonDecoratedOperator"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "load": 0
     },
     "schedule": "@daily",
     "tags": [],
     "tasks": [
      "load"
     ],
     "timetable": "CronTriggerTimetable",
     "trigger_rules": {
      "load": "all_success"
     }
    },
    "brewline_map_big": {
     "catchup": false,
     "edges": [
      [
       "list_stores",
       [
        "load_store"
       ]
      ],
      [
       "load_store",
       []
      ]
     ],
     "file": "brewline_mapping_edge.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "list_stores": "_PythonDecoratedOperator",
      "load_store": "DecoratedMappedOperator"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "list_stores": 0,
      "load_store": 0
     },
     "schedule": "None",
     "tags": [],
     "tasks": [
      "list_stores",
      "load_store"
     ],
     "timetable": "NullTimetable",
     "trigger_rules": {
      "list_stores": "all_success",
      "load_store": "all_success"
     }
    },
    "brewline_map_empty": {
     "catchup": false,
     "edges": [
      [
       "list_stores",
       [
        "load_store"
       ]
      ],
      [
       "load_store",
       [
        "summarize"
       ]
      ],
      [
       "summarize",
       []
      ]
     ],
     "file": "brewline_mapping_edge.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "list_stores": "_PythonDecoratedOperator",
      "load_store": "DecoratedMappedOperator",
      "summarize": "_PythonDecoratedOperator"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "list_stores": 0,
      "load_store": 0,
      "summarize": 0
     },
     "schedule": "None",
     "tags": [],
     "tasks": [
      "list_stores",
      "load_store",
      "summarize"
     ],
     "timetable": "NullTimetable",
     "trigger_rules": {
      "list_stores": "all_success",
      "load_store": "all_success",
      "summarize": "all_done"
     }
    },
    "brewline_mapping": {
     "catchup": false,
     "edges": [
      [
       "list_stores",
       [
        "load_store"
       ]
      ],
      [
       "load_store",
       [
        "summarize"
       ]
      ],
      [
       "summarize",
       []
      ]
     ],
     "file": "brewline_mapping.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "list_stores": "_PythonDecoratedOperator",
      "load_store": "DecoratedMappedOperator",
      "summarize": "_PythonDecoratedOperator"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "list_stores": 0,
      "load_store": 0,
      "summarize": 0
     },
     "schedule": "None",
     "tags": [],
     "tasks": [
      "list_stores",
      "load_store",
      "summarize"
     ],
     "timetable": "NullTimetable",
     "trigger_rules": {
      "list_stores": "all_success",
      "load_store": "all_success",
      "summarize": "all_success"
     }
    },
    "brewline_nightly": {
     "catchup": false,
     "edges": [
      [
       "start",
       [
        "extract_orders"
       ]
      ],
      [
       "extract_orders",
       [
        "validate_orders"
       ]
      ],
      [
       "validate_orders",
       [
        "load_orders"
       ]
      ],
      [
       "load_orders",
       [
        "build_marts"
       ]
      ],
      [
       "build_marts",
       [
        "notify"
       ]
      ],
      [
       "notify",
       []
      ]
     ],
     "file": "brewline_nightly.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "build_marts": "BashOperator",
      "extract_orders": "BashOperator",
      "load_orders": "BashOperator",
      "notify": "BashOperator",
      "start": "EmptyOperator",
      "validate_orders": "PythonOperator"
     },
     "owner": [
      "data-team"
     ],
     "retries": {
      "build_marts": 2,
      "extract_orders": 2,
      "load_orders": 2,
      "notify": 2,
      "start": 2,
      "validate_orders": 2
     },
     "schedule": "0 2 * * *",
     "tags": [
      "brewline",
      "nightly"
     ],
     "tasks": [
      "start",
      "extract_orders",
      "validate_orders",
      "load_orders",
      "build_marts",
      "notify"
     ],
     "timetable": "CronTriggerTimetable",
     "trigger_rules": {
      "build_marts": "all_success",
      "extract_orders": "all_success",
      "load_orders": "all_success",
      "notify": "all_done",
      "start": "all_success",
      "validate_orders": "all_success"
     }
    },
    "brewline_orders_daily": {
     "catchup": false,
     "edges": [
      [
       "build",
       []
      ]
     ],
     "file": "brewline_assets.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "build": "_PythonDecoratedOperator"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "build": 0
     },
     "schedule": "[Asset(name='orders_raw', uri='brewline://lake/raw/orders', group='asset', extra={}, watchers=[], access_control=AssetAccessControl(producer_teams=[], consumer_teams=None, allow_global=True))]",
     "tags": [],
     "tasks": [
      "build"
     ],
     "timetable": "AssetTriggeredTimetable",
     "trigger_rules": {
      "build": "all_success"
     }
    },
    "brewline_pool_priority": {
     "catchup": false,
     "edges": [
      [
       "report_1",
       []
      ],
      [
       "report_2",
       []
      ],
      [
       "report_3",
       []
      ],
      [
       "report_4",
       []
      ],
      [
       "report_5",
       []
      ]
     ],
     "file": "brewline_pools.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "report_1": "BashOperator",
      "report_2": "BashOperator",
      "report_3": "BashOperator",
      "report_4": "BashOperator",
      "report_5": "BashOperator"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "report_1": 0,
      "report_2": 0,
      "report_3": 0,
      "report_4": 0,
      "report_5": 0
     },
     "schedule": "None",
     "tags": [],
     "tasks": [
      "report_1",
      "report_2",
      "report_3",
      "report_4",
      "report_5"
     ],
     "timetable": "NullTimetable",
     "trigger_rules": {
      "report_1": "all_success",
      "report_2": "all_success",
      "report_3": "all_success",
      "report_4": "all_success",
      "report_5": "all_success"
     }
    },
    "brewline_pool_two_slots": {
     "catchup": false,
     "edges": [
      [
       "load_1",
       []
      ],
      [
       "load_2",
       []
      ],
      [
       "load_3",
       []
      ],
      [
       "load_4",
       []
      ],
      [
       "load_5",
       []
      ],
      [
       "load_6",
       []
      ]
     ],
     "file": "brewline_pools.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "load_1": "BashOperator",
      "load_2": "BashOperator",
      "load_3": "BashOperator",
      "load_4": "BashOperator",
      "load_5": "BashOperator",
      "load_6": "BashOperator"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "load_1": 0,
      "load_2": 0,
      "load_3": 0,
      "load_4": 0,
      "load_5": 0,
      "load_6": 0
     },
     "schedule": "None",
     "tags": [],
     "tasks": [
      "load_1",
      "load_2",
      "load_3",
      "load_4",
      "load_5",
      "load_6"
     ],
     "timetable": "NullTimetable",
     "trigger_rules": {
      "load_1": "all_success",
      "load_2": "all_success",
      "load_3": "all_success",
      "load_4": "all_success",
      "load_5": "all_success",
      "load_6": "all_success"
     }
    },
    "brewline_retry_policy": {
     "catchup": false,
     "edges": [
      [
       "call_partner",
       []
      ],
      [
       "read_secret",
       []
      ]
     ],
     "file": "brewline_retry_policy.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "call_partner": "_PythonDecoratedOperator",
      "read_secret": "_PythonDecoratedOperator"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "call_partner": 3,
      "read_secret": 3
     },
     "schedule": "None",
     "tags": [],
     "tasks": [
      "call_partner",
      "read_secret"
     ],
     "timetable": "NullTimetable",
     "trigger_rules": {
      "call_partner": "all_success",
      "read_secret": "all_success"
     }
    },
    "brewline_secrets": {
     "catchup": false,
     "edges": [
      [
       "use_secrets",
       []
      ]
     ],
     "file": "brewline_secrets.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "use_secrets": "_PythonDecoratedOperator"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "use_secrets": 0
     },
     "schedule": "None",
     "tags": [],
     "tasks": [
      "use_secrets"
     ],
     "timetable": "NullTimetable",
     "trigger_rules": {
      "use_secrets": "all_success"
     }
    },
    "brewline_templates": {
     "catchup": false,
     "edges": [
      [
       "dates",
       [
        "partition_path"
       ]
      ],
      [
       "partition_path",
       [
        "previous_day"
       ]
      ],
      [
       "previous_day",
       []
      ]
     ],
     "file": "brewline_templates.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "dates": "BashOperator",
      "partition_path": "BashOperator",
      "previous_day": "BashOperator"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "dates": 0,
      "partition_path": 0,
      "previous_day": 0
     },
     "schedule": "0 2 * * *",
     "tags": [],
     "tasks": [
      "dates",
      "partition_path",
      "previous_day"
     ],
     "timetable": "CronTriggerTimetable",
     "trigger_rules": {
      "dates": "all_success",
      "partition_path": "all_success",
      "previous_day": "all_success"
     }
    },
    "brewline_timeout": {
     "catchup": false,
     "edges": [
      [
       "slow_export",
       []
      ]
     ],
     "file": "brewline_timeout.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "slow_export": "_PythonDecoratedOperator"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "slow_export": 0
     },
     "schedule": "None",
     "tags": [],
     "tasks": [
      "slow_export"
     ],
     "timetable": "NullTimetable",
     "trigger_rules": {
      "slow_export": "all_success"
     }
    },
    "brewline_wait_deferrable": {
     "catchup": false,
     "edges": [
      [
       "wait_1",
       []
      ],
      [
       "wait_2",
       []
      ],
      [
       "wait_3",
       []
      ],
      [
       "wait_4",
       []
      ]
     ],
     "file": "brewline_waiting.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "wait_1": "FileSensor",
      "wait_2": "FileSensor",
      "wait_3": "FileSensor",
      "wait_4": "FileSensor"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "wait_1": 0,
      "wait_2": 0,
      "wait_3": 0,
      "wait_4": 0
     },
     "schedule": "None",
     "tags": [],
     "tasks": [
      "wait_1",
      "wait_2",
      "wait_3",
      "wait_4"
     ],
     "timetable": "NullTimetable",
     "trigger_rules": {
      "wait_1": "all_success",
      "wait_2": "all_success",
      "wait_3": "all_success",
      "wait_4": "all_success"
     }
    },
    "brewline_wait_poke": {
     "catchup": false,
     "edges": [
      [
       "wait_1",
       []
      ],
      [
       "wait_2",
       []
      ],
      [
       "wait_3",
       []
      ],
      [
       "wait_4",
       []
      ]
     ],
     "file": "brewline_waiting.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "wait_1": "PythonSensor",
      "wait_2": "PythonSensor",
      "wait_3": "PythonSensor",
      "wait_4": "PythonSensor"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "wait_1": 0,
      "wait_2": 0,
      "wait_3": 0,
      "wait_4": 0
     },
     "schedule": "None",
     "tags": [],
     "tasks": [
      "wait_1",
      "wait_2",
      "wait_3",
      "wait_4"
     ],
     "timetable": "NullTimetable",
     "trigger_rules": {
      "wait_1": "all_success",
      "wait_2": "all_success",
      "wait_3": "all_success",
      "wait_4": "all_success"
     }
    },
    "brewline_wait_reschedule": {
     "catchup": false,
     "edges": [
      [
       "wait_1",
       []
      ],
      [
       "wait_2",
       []
      ],
      [
       "wait_3",
       []
      ],
      [
       "wait_4",
       []
      ]
     ],
     "file": "brewline_waiting.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "wait_1": "PythonSensor",
      "wait_2": "PythonSensor",
      "wait_3": "PythonSensor",
      "wait_4": "PythonSensor"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "wait_1": 0,
      "wait_2": 0,
      "wait_3": 0,
      "wait_4": 0
     },
     "schedule": "None",
     "tags": [],
     "tasks": [
      "wait_1",
      "wait_2",
      "wait_3",
      "wait_4"
     ],
     "timetable": "NullTimetable",
     "trigger_rules": {
      "wait_1": "all_success",
      "wait_2": "all_success",
      "wait_3": "all_success",
      "wait_4": "all_success"
     }
    },
    "brewline_xcom": {
     "catchup": false,
     "edges": [
      [
       "count_orders",
       [
        "report"
       ]
      ],
      [
       "summarize",
       [
        "report"
       ]
      ],
      [
       "push_extra",
       [
        "report"
       ]
      ],
      [
       "report",
       []
      ]
     ],
     "file": "brewline_xcom.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "count_orders": "_PythonDecoratedOperator",
      "push_extra": "_PythonDecoratedOperator",
      "report": "_PythonDecoratedOperator",
      "summarize": "_PythonDecoratedOperator"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "count_orders": 0,
      "push_extra": 0,
      "report": 0,
      "summarize": 0
     },
     "schedule": "None",
     "tags": [],
     "tasks": [
      "count_orders",
      "summarize",
      "push_extra",
      "report"
     ],
     "timetable": "NullTimetable",
     "trigger_rules": {
      "count_orders": "all_success",
      "push_extra": "all_success",
      "report": "all_success",
      "summarize": "all_success"
     }
    },
    "brewline_xcom_size": {
     "catchup": false,
     "edges": [
      [
       "return_1_kb",
       []
      ],
      [
       "return_100_kb",
       []
      ],
      [
       "return_1_mb",
       []
      ],
      [
       "return_10_mb",
       []
      ]
     ],
     "file": "brewline_xcom_size.py",
     "max_active_runs": 16,
     "max_active_tasks": 16,
     "operators": {
      "return_100_kb": "_PythonDecoratedOperator",
      "return_10_mb": "_PythonDecoratedOperator",
      "return_1_kb": "_PythonDecoratedOperator",
      "return_1_mb": "_PythonDecoratedOperator"
     },
     "owner": [
      "airflow"
     ],
     "retries": {
      "return_100_kb": 0,
      "return_10_mb": 0,
      "return_1_kb": 0,
      "return_1_mb": 0
     },
     "schedule": "None",
     "tags": [],
     "tasks": [
      "return_1_kb",
      "return_100_kb",
      "return_1_mb",
      "return_10_mb"
     ],
     "timetable": "NullTimetable",
     "trigger_rules": {
      "return_100_kb": "all_success",
      "return_10_mb": "all_success",
      "return_1_kb": "all_success",
      "return_1_mb": "all_success"
     }
    }
   },
   "import_errors": {}
  },
  "af.dags_list": {
   "bundles": [
    "dags-folder"
   ],
   "dags": 44,
   "paused": 44
  },
  "af.db_access": {
   "error": "RuntimeError: Direct database access via the ORM is not allowed in Airflow 3.0",
   "state": "failed"
  },
  "af.deadline": {
   "callback_file": [
    "deadline missed"
   ],
   "callback_seen_before_run_end": true,
   "deadline_alert_rows": 1,
   "deadline_rows": 1,
   "deadline_seconds": 5,
   "run_state": "success",
   "task_seconds": 20
  },
  "af.dst": {
   "rows": [
    {
     "expr": "0 2 * * *",
     "runs": [
      {
       "local": "2026-03-06 02:00:00 EST",
       "utc": "2026-03-06 07:00:00+00:00"
      },
      {
       "local": "2026-03-07 02:00:00 EST",
       "utc": "2026-03-07 07:00:00+00:00"
      },
      {
       "local": "2026-03-08 03:00:00 EDT",
       "utc": "2026-03-08 07:00:00+00:00"
      },
      {
       "local": "2026-03-09 02:00:00 EDT",
       "utc": "2026-03-09 06:00:00+00:00"
      },
      {
       "local": "2026-03-10 02:00:00 EDT",
       "utc": "2026-03-10 06:00:00+00:00"
      }
     ],
     "season": "spring",
     "tz": "America/New_York"
    },
    {
     "expr": "30 1 * * *",
     "runs": [
      {
       "local": "2026-03-06 01:30:00 EST",
       "utc": "2026-03-06 06:30:00+00:00"
      },
      {
       "local": "2026-03-07 01:30:00 EST",
       "utc": "2026-03-07 06:30:00+00:00"
      },
      {
       "local": "2026-03-08 01:30:00 EST",
       "utc": "2026-03-08 06:30:00+00:00"
      },
      {
       "local": "2026-03-09 01:30:00 EDT",
       "utc": "2026-03-09 05:30:00+00:00"
      },
      {
       "local": "2026-03-10 01:30:00 EDT",
       "utc": "2026-03-10 05:30:00+00:00"
      }
     ],
     "season": "spring",
     "tz": "America/New_York"
    },
    {
     "expr": "0 3 * * *",
     "runs": [
      {
       "local": "2026-03-06 03:00:00 EST",
       "utc": "2026-03-06 08:00:00+00:00"
      },
      {
       "local": "2026-03-07 03:00:00 EST",
       "utc": "2026-03-07 08:00:00+00:00"
      },
      {
       "local": "2026-03-08 03:00:00 EDT",
       "utc": "2026-03-08 07:00:00+00:00"
      },
      {
       "local": "2026-03-09 03:00:00 EDT",
       "utc": "2026-03-09 07:00:00+00:00"
      },
      {
       "local": "2026-03-10 03:00:00 EDT",
       "utc": "2026-03-10 07:00:00+00:00"
      }
     ],
     "season": "spring",
     "tz": "America/New_York"
    },
    {
     "expr": "0 2 * * *",
     "runs": [
      {
       "local": "2026-10-30 02:00:00 EDT",
       "utc": "2026-10-30 06:00:00+00:00"
      },
      {
       "local": "2026-10-31 02:00:00 EDT",
       "utc": "2026-10-31 06:00:00+00:00"
      },
      {
       "local": "2026-11-01 02:00:00 EST",
       "utc": "2026-11-01 07:00:00+00:00"
      },
      {
       "local": "2026-11-02 02:00:00 EST",
       "utc": "2026-11-02 07:00:00+00:00"
      },
      {
       "local": "2026-11-03 02:00:00 EST",
       "utc": "2026-11-03 07:00:00+00:00"
      }
     ],
     "season": "autumn",
     "tz": "America/New_York"
    },
    {
     "expr": "30 1 * * *",
     "runs": [
      {
       "local": "2026-10-30 01:30:00 EDT",
       "utc": "2026-10-30 05:30:00+00:00"
      },
      {
       "local": "2026-10-31 01:30:00 EDT",
       "utc": "2026-10-31 05:30:00+00:00"
      },
      {
       "local": "2026-11-01 01:30:00 EST",
       "utc": "2026-11-01 06:30:00+00:00"
      },
      {
       "local": "2026-11-02 01:30:00 EST",
       "utc": "2026-11-02 06:30:00+00:00"
      },
      {
       "local": "2026-11-03 01:30:00 EST",
       "utc": "2026-11-03 06:30:00+00:00"
      }
     ],
     "season": "autumn",
     "tz": "America/New_York"
    },
    {
     "expr": "0 3 * * *",
     "runs": [
      {
       "local": "2026-10-30 03:00:00 EDT",
       "utc": "2026-10-30 07:00:00+00:00"
      },
      {
       "local": "2026-10-31 03:00:00 EDT",
       "utc": "2026-10-31 07:00:00+00:00"
      },
      {
       "local": "2026-11-01 03:00:00 EST",
       "utc": "2026-11-01 08:00:00+00:00"
      },
      {
       "local": "2026-11-02 03:00:00 EST",
       "utc": "2026-11-02 08:00:00+00:00"
      },
      {
       "local": "2026-11-03 03:00:00 EST",
       "utc": "2026-11-03 08:00:00+00:00"
      }
     ],
     "season": "autumn",
     "tz": "America/New_York"
    },
    {
     "expr": "0 2 * * *",
     "runs": [
      {
       "local": "2026-03-26 02:00:00 GMT",
       "utc": "2026-03-26 02:00:00+00:00"
      },
      {
       "local": "2026-03-27 02:00:00 GMT",
       "utc": "2026-03-27 02:00:00+00:00"
      },
      {
       "local": "2026-03-28 02:00:00 GMT",
       "utc": "2026-03-28 02:00:00+00:00"
      },
      {
       "local": "2026-03-29 02:00:00 BST",
       "utc": "2026-03-29 01:00:00+00:00"
      },
      {
       "local": "2026-03-30 02:00:00 BST",
       "utc": "2026-03-30 01:00:00+00:00"
      }
     ],
     "season": "london",
     "tz": "Europe/London"
    },
    {
     "expr": "30 1 * * *",
     "runs": [
      {
       "local": "2026-03-26 01:30:00 GMT",
       "utc": "2026-03-26 01:30:00+00:00"
      },
      {
       "local": "2026-03-27 01:30:00 GMT",
       "utc": "2026-03-27 01:30:00+00:00"
      },
      {
       "local": "2026-03-28 01:30:00 GMT",
       "utc": "2026-03-28 01:30:00+00:00"
      },
      {
       "local": "2026-03-29 02:30:00 BST",
       "utc": "2026-03-29 01:30:00+00:00"
      },
      {
       "local": "2026-03-30 01:30:00 BST",
       "utc": "2026-03-30 00:30:00+00:00"
      }
     ],
     "season": "london",
     "tz": "Europe/London"
    },
    {
     "expr": "0 3 * * *",
     "runs": [
      {
       "local": "2026-03-26 03:00:00 GMT",
       "utc": "2026-03-26 03:00:00+00:00"
      },
      {
       "local": "2026-03-27 03:00:00 GMT",
       "utc": "2026-03-27 03:00:00+00:00"
      },
      {
       "local": "2026-03-28 03:00:00 GMT",
       "utc": "2026-03-28 03:00:00+00:00"
      },
      {
       "local": "2026-03-29 03:00:00 BST",
       "utc": "2026-03-29 02:00:00+00:00"
      },
      {
       "local": "2026-03-30 03:00:00 BST",
       "utc": "2026-03-30 02:00:00+00:00"
      }
     ],
     "season": "london",
     "tz": "Europe/London"
    }
   ]
  },
  "af.failed_deps": {
   "dag_limit": {
    "dag_id": "brewline_blocked_limit",
    "failed_deps": "Task instance dependencies not met:\nTask Instance Slots Available: The maximum number of running tasks (1) for this task's DAG 'brewline_blocked_limit' has been reached.",
    "state": "scheduled",
    "task_id": "long_b"
   },
   "depends_on_past": {
    "dag_id": "brewline_blocked_past",
    "failed_deps": "Task instance dependencies not met:\nTask Instance State: Task is in the 'None' state.\nPrevious Dagrun State: depends_on_past is true for this task, but 1 previous task instance(s) are not in a successful state.",
    "state": null,
    "task_id": "load"
   },
   "pool_full": {
    "dag_id": "brewline_blocked",
    "failed_deps": "Task instance dependencies not met:\nPool Slots Available: Not scheduling since there are 0 open slots in pool tiny_pool and require 1 pool slots",
    "state": "scheduled",
    "task_id": "wait_for_slot"
   },
   "upstream_running": {
    "dag_id": "brewline_blocked",
    "failed_deps": "Task instance dependencies not met:\nTrigger Rule: Task's trigger rule 'all_success' requires all upstream tasks to have succeeded, but found 1 non-success(es). upstream_states=_UpstreamTIStates(success=0, skipped=0, failed=0, upstream_failed=0, removed=0, done=0, success_setup=0, skipped_setup=0), upstream_task_ids={'slow_extract'}\nTask Instance State: Task is in the 'None' state.",
    "state": null,
    "task_id": "load_after_extract"
   }
  },
  "af.first_run": {
   "rc": 0,
   "states": [
    "success",
    "success",
    "success"
   ],
   "summary": {
    "orders": 2,
    "total": 20.5
   },
   "summary_file": "summary_2026-03-14.json",
   "tasks": [
    "extract",
    "transform",
    "load"
   ]
  },
  "af.health": {
   "dag_processor": {
    "detailed_status": "healthy",
    "instances": [
     {
      "bundle_names": null,
      "hostname": "vm",
      "latest_dag_processor_heartbeat": "<time>"
     }
    ],
    "latest_dag_processor_heartbeat": "<time>",
    "status": "healthy"
   },
   "metadatabase": {
    "status": "healthy"
   },
   "scheduler": {
    "detailed_status": "healthy",
    "instances": [
     {
      "hostname": "vm",
      "latest_scheduler_heartbeat": "<time>"
     }
    ],
    "latest_scheduler_heartbeat": "<time>",
    "status": "healthy"
   },
   "triggerer": {
    "detailed_status": "healthy",
    "instances": [
     {
      "hostname": "vm",
      "latest_triggerer_heartbeat": "<time>",
      "team_names": []
     }
    ],
    "latest_triggerer_heartbeat": "<time>",
    "status": "healthy"
   }
  },
  "af.idempotent": {
   "brewline_load_append": [
    {
     "day": "2026-03-14",
     "per_day": {
      "2026-03-14": 3
     },
     "rows": 3,
     "step": "first run, day 14"
    },
    {
     "day": "2026-03-14",
     "per_day": {
      "2026-03-14": 6
     },
     "rows": 6,
     "step": "same day again"
    },
    {
     "day": "2026-03-15",
     "per_day": {
      "2026-03-14": 6,
      "2026-03-15": 3
     },
     "rows": 9,
     "step": "day 15"
    },
    {
     "day": "2026-03-14",
     "per_day": {
      "2026-03-14": 9,
      "2026-03-15": 3
     },
     "rows": 12,
     "step": "day 14 once more"
    }
   ],
   "brewline_load_replace": [
    {
     "day": "2026-03-14",
     "per_day": {
      "2026-03-14": 3
     },
     "rows": 3,
     "step": "first run, day 14"
    },
    {
     "day": "2026-03-14",
     "per_day": {
      "2026-03-14": 3
     },
     "rows": 3,
     "step": "same day again"
    },
    {
     "day": "2026-03-15",
     "per_day": {
      "2026-03-14": 3,
      "2026-03-15": 3
     },
     "rows": 6,
     "step": "day 15"
    },
    {
     "day": "2026-03-14",
     "per_day": {
      "2026-03-14": 3,
      "2026-03-15": 3
     },
     "rows": 6,
     "step": "day 14 once more"
    }
   ],
   "brewline_load_upsert": [
    {
     "day": "2026-03-14",
     "per_day": {
      "2026-03-14": 3
     },
     "rows": 3,
     "step": "first run, day 14"
    },
    {
     "day": "2026-03-14",
     "per_day": {
      "2026-03-14": 3
     },
     "rows": 3,
     "step": "same day again"
    },
    {
     "day": "2026-03-15",
     "per_day": {
      "2026-03-14": 3,
      "2026-03-15": 3
     },
     "rows": 6,
     "step": "day 15"
    },
    {
     "day": "2026-03-14",
     "per_day": {
      "2026-03-14": 3,
      "2026-03-15": 3
     },
     "rows": 6,
     "step": "day 14 once more"
    }
   ]
  },
  "af.imports": [
   {
    "error": "",
    "status": "works",
    "stmt": "from airflow import DAG",
    "warnings": []
   },
   {
    "error": "",
    "status": "works",
    "stmt": "from airflow.sdk import DAG, dag, task",
    "warnings": []
   },
   {
    "error": "",
    "status": "works",
    "stmt": "from airflow.decorators import dag, task",
    "warnings": [
     "The `airflow.decorators.dag` attribute is deprecated. Please use `'airflow.sdk.dag'`.",
     "The `airflow.decorators.task` attribute is deprecated. Please use `'airflow.sdk.task'`."
    ]
   },
   {
    "error": "",
    "status": "works",
    "stmt": "from airflow.operators.bash import BashOperator",
    "warnings": [
     "The `airflow.operators.bash.BashOperator` attribute is deprecated. Please use `'airflow.providers.standard.operators.bash.BashOperator'`."
    ]
   },
   {
    "error": "",
    "status": "works",
    "stmt": "from airflow.providers.standard.operators.bash import BashOperator",
    "warnings": []
   },
   {
    "error": "",
    "status": "works",
    "stmt": "from airflow.operators.python import PythonOperator",
    "warnings": [
     "The `airflow.operators.python.PythonOperator` attribute is deprecated. Please use `'airflow.providers.standard.operators.python.PythonOperator'`."
    ]
   },
   {
    "error": "",
    "status": "works",
    "stmt": "from airflow.providers.standard.operators.python import PythonOperator",
    "warnings": []
   },
   {
    "error": "",
    "status": "works",
    "stmt": "from airflow.sensors.filesystem import FileSensor",
    "warnings": [
     "The `airflow.sensors.filesystem.FileSensor` attribute is deprecated. Please use `'airflow.providers.standard.sensors.filesystem.FileSensor'`."
    ]
   },
   {
    "error": "",
    "status": "works",
    "stmt": "from airflow.providers.standard.sensors.filesystem import FileSensor",
    "warnings": []
   },
   {
    "error": "",
    "status": "works",
    "stmt": "from airflow.hooks.base import BaseHook",
    "warnings": [
     "The `airflow.hooks.base.BaseHook` attribute is deprecated. Please use `'airflow.sdk.bases.hook.BaseHook'`."
    ]
   },
   {
    "error": "",
    "status": "works",
    "stmt": "from airflow.sdk import BaseHook",
    "warnings": []
   },
   {
    "error": "",
    "status": "works",
    "stmt": "from airflow.utils.task_group import TaskGroup",
    "warnings": [
     "The `airflow.utils.task_group.TaskGroup` attribute is deprecated. Please use `'airflow.sdk.TaskGroup'`."
    ]
   },
   {
    "error": "",
    "status": "works",
    "stmt": "from airflow.sdk import TaskGroup",
    "warnings": []
   },
   {
    "error": "",
    "status": "works",
    "stmt": "from airflow.models.baseoperator import BaseOperator",
    "warnings": [
     "The `airflow.models.baseoperator.BaseOperator` attribute is deprecated. Please use `'airflow.sdk.bases.operator.BaseOperator'`."
    ]
   },
   {
    "error": "",
    "status": "works",
    "stmt": "from airflow.sdk import BaseOperator",
    "warnings": []
   },
   {
    "error": "",
    "status": "works",
    "stmt": "from airflow.exceptions import AirflowSkipException",
    "warnings": [
     "airflow.exceptions.AirflowSkipException is deprecated and will be removed in a future version. Use airflow.sdk.exceptions.AirflowSkipException instead."
    ]
   },
   {
    "error": "",
    "status": "works",
    "stmt": "from airflow.sdk.exceptions import AirflowSkipException",
    "warnings": []
   },
   {
    "error": "",
    "status": "works",
    "stmt": "from airflow.utils.trigger_rule import TriggerRule",
    "warnings": [
     "The `airflow.utils.trigger_rule.TriggerRule` attribute is deprecated. Please use `'airflow.task.trigger_rule.TriggerRule'`."
    ]
   },
   {
    "error": "",
    "status": "works",
    "stmt": "from airflow.task.trigger_rule import TriggerRule",
    "warnings": []
   },
   {
    "error": "ImportError: cannot import name 'days_ago' from 'airflow.utils.dates'",
    "status": "fails",
    "stmt": "from airflow.utils.dates import days_ago",
    "warnings": []
   },
   {
    "error": "ModuleNotFoundError: No module named 'airflow.datasets'",
    "status": "fails",
    "stmt": "from airflow.datasets import Dataset",
    "warnings": []
   },
   {
    "error": "",
    "status": "works",
    "stmt": "from airflow.sdk import Asset",
    "warnings": []
   },
   {
    "error": "ImportError: cannot import name 'apply_defaults' from 'airflow.utils.decorators'",
    "status": "fails",
    "stmt": "from airflow.utils.decorators import apply_defaults",
    "warnings": []
   }
  ],
  "af.incremental": {
   "late_row": {
    "arrived": "after the run of 14 March",
    "order_id": "O-4",
    "updated_at": "2026-03-14 23:30:00"
   },
   "steps": [
    {
     "brewline_incr_lookback": [
      "O-1",
      "O-2"
     ],
     "brewline_incr_window": [
      "O-1",
      "O-2"
     ],
     "day": "2026-03-14",
     "source": [
      "O-1",
      "O-2"
     ],
     "step": "the run of 14 March"
    },
    {
     "brewline_incr_lookback": [
      "O-1",
      "O-2",
      "O-3",
      "O-4"
     ],
     "brewline_incr_window": [
      "O-1",
      "O-2",
      "O-3"
     ],
     "day": "2026-03-15",
     "source": [
      "O-1",
      "O-2",
      "O-3",
      "O-4"
     ],
     "step": "the run of 15 March, after O-3 and a late O-4 arrived"
    },
    {
     "brewline_incr_lookback": [
      "O-1",
      "O-2",
      "O-3",
      "O-4"
     ],
     "brewline_incr_window": [
      "O-1",
      "O-2",
      "O-3"
     ],
     "day": "2026-03-15",
     "source": [
      "O-1",
      "O-2",
      "O-3",
      "O-4"
     ],
     "step": "the run of 15 March again"
    }
   ]
  },
  "af.loops": {
   "fixed": {
    "dag_id": "brewline_loop_fixed",
    "rc": 0,
    "task_instances": [
     {
      "map_index": 1,
      "state": "success",
      "task_id": "accumulate.increment"
     },
     {
      "map_index": 1,
      "state": "success",
      "task_id": "accumulate.__loop_gate"
     },
     {
      "map_index": 2,
      "state": "success",
      "task_id": "accumulate.increment"
     },
     {
      "map_index": 2,
      "state": "success",
      "task_id": "accumulate.__loop_gate"
     },
     {
      "map_index": 3,
      "state": "success",
      "task_id": "accumulate.increment"
     },
     {
      "map_index": 3,
      "state": "success",
      "task_id": "accumulate.__loop_gate"
     }
    ]
   },
   "until": {
    "dag_id": "brewline_loop_until",
    "rc": 0,
    "task_instances": [
     {
      "map_index": 1,
      "state": "success",
      "task_id": "refine.improve"
     },
     {
      "map_index": 1,
      "state": "success",
      "task_id": "refine.evaluate"
     },
     {
      "map_index": 1,
      "state": "success",
      "task_id": "refine.accurate_enough"
     },
     {
      "map_index": 2,
      "state": "success",
      "task_id": "refine.improve"
     },
     {
      "map_index": 2,
      "state": "success",
      "task_id": "refine.evaluate"
     },
     {
      "map_index": 2,
      "state": "success",
      "task_id": "refine.accurate_enough"
     },
     {
      "map_index": 3,
      "state": "success",
      "task_id": "refine.improve"
     },
     {
      "map_index": 3,
      "state": "success",
      "task_id": "refine.evaluate"
     },
     {
      "map_index": 3,
      "state": "success",
      "task_id": "refine.accurate_enough"
     },
     {
      "map_index": 4,
      "state": "success",
      "task_id": "refine.improve"
     },
     {
      "map_index": 4,
      "state": "success",
      "task_id": "refine.evaluate"
     },
     {
      "map_index": 4,
      "state": "success",
      "task_id": "refine.accurate_enough"
     },
     {
      "map_index": -1,
      "state": "success",
      "task_id": "finished"
     }
    ]
   }
  },
  "af.mapping_edge": {
   "big": {
    "list_stores": "failed",
    "load_store": "upstream_failed"
   },
   "big_error": "{\"reason\": \"unmappable_return_value_length\", \"message\": \"pushed value is too large to map as a downstream\"s dependency\"}",
   "big_list_length": 1100,
   "empty": {
    "list_stores": "success",
    "load_store": "skipped",
    "summarize": "success"
   },
   "max_map_length": "1024"
  },
  "af.metadb": {
   "pools": {
    "cols": [
     "pool",
     "slots"
    ],
    "question": "Which pools exist, and how big are they?",
    "rows": [
     [
      "default_pool",
      "128"
     ],
     [
      "partner_pool",
      "2"
     ],
     [
      "single_pool",
      "1"
     ],
     [
      "tiny_pool",
      "1"
     ],
     [
      "warehouse_pool",
      "2"
     ]
    ],
    "sql": "SELECT pool, slots FROM slot_pool ORDER BY pool"
   },
   "run_types": {
    "cols": [
     "run_type",
     "runs"
    ],
    "question": "How were the runs started?",
    "rows": [
     [
      "asset_triggered",
      "4"
     ],
     [
      "backfill",
      "3"
     ],
     [
      "manual",
      "23"
     ],
     [
      "scheduled",
      "14"
     ]
    ],
    "sql": "SELECT run_type, count(*) AS runs FROM dag_run GROUP BY run_type ORDER BY run_type"
   },
   "runs": {
    "cols": [
     "dag_id",
     "runs",
     "failed"
    ],
    "question": "Which DAGs have failed runs?",
    "rows": [
     [
      "brewline_backoff",
      "1",
      "1"
     ],
     [
      "brewline_blocked_past",
      "2",
      "1"
     ],
     [
      "brewline_callbacks",
      "1",
      "1"
     ],
     [
      "brewline_retry_policy",
      "1",
      "1"
     ],
     [
      "brewline_timeout",
      "1",
      "1"
     ],
     [
      "brewline_wait_reschedule",
      "1",
      "1"
     ]
    ],
    "sql": "SELECT dag_id, count(*) AS runs, sum(CASE WHEN state = 'failed' THEN 1 ELSE 0 END) AS failed FROM dag_run GROUP BY dag_id HAVING failed > 0 ORDER BY failed DESC, dag_id"
   },
   "states": {
    "cols": [
     "state",
     "tasks"
    ],
    "question": "How many task instances are in each state?",
    "rows": [
     [
      "success",
      "75"
     ],
     [
      "failed",
      "6"
     ],
     [
      "None",
      "1"
     ]
    ],
    "sql": "SELECT state, count(*) AS tasks FROM task_instance WHERE working_set = 1 GROUP BY state ORDER BY tasks DESC, state"
   },
   "tries": {
    "cols": [
     "dag_id",
     "task_id",
     "tries"
    ],
    "question": "Which tasks needed more than one try?",
    "rows": [
     [
      "brewline_backoff",
      "call_partner",
      "5"
     ],
     [
      "brewline_flaky",
      "extract",
      "3"
     ],
     [
      "brewline_retry_policy",
      "call_partner",
      "3"
     ],
     [
      "brewline_callbacks",
      "export",
      "2"
     ]
    ],
    "sql": "SELECT dag_id, task_id, max(try_number) AS tries FROM task_instance GROUP BY dag_id, task_id HAVING tries > 1 ORDER BY tries DESC, dag_id, task_id"
   },
   "xcom": {
    "cols": [
     "dag_id",
     "task_id",
     "bytes"
    ],
    "question": "Which XCom values are the largest?",
    "rows": [
     [
      "brewline_first",
      "extract",
      "71"
     ],
     [
      "brewline_first",
      "extract",
      "71"
     ],
     [
      "brewline_first",
      "extract",
      "71"
     ]
    ],
    "sql": "SELECT ti.dag_id, ti.task_id, length(x.value) AS bytes FROM xcom_v2 x JOIN task_instance ti ON ti.id = x.task_instance_id ORDER BY bytes DESC, ti.dag_id LIMIT 3"
   }
  },
  "af.metadb_tables": {
   "count": 61,
   "names": [
    "alembic_version",
    "asset",
    "asset_active",
    "asset_alias",
    "asset_alias_asset",
    "asset_alias_asset_event",
    "asset_dag_run_queue",
    "asset_event",
    "asset_partition_dag_run",
    "asset_state_store",
    "asset_watcher",
    "backfill",
    "backfill_dag_run",
    "callback",
    "connection",
    "connection_test_request",
    "dag",
    "dag_bundle",
    "dag_bundle_team",
    "dag_code",
    "dag_favorite",
    "dag_owner_attributes",
    "dag_priority_parsing_request",
    "dag_run",
    "dag_run_note",
    "dag_schedule_asset_alias_reference",
    "dag_schedule_asset_name_reference",
    "dag_schedule_asset_reference",
    "dag_schedule_asset_uri_reference",
    "dag_tag",
    "dag_version",
    "dag_warning",
    "dagrun_asset_event",
    "deadline",
    "deadline_alert",
    "dynamic_region",
    "hitl_detail",
    "import_error",
    "job",
    "job_team",
    "legacy_task_data_owner",
    "log",
    "log_template",
    "partitioned_asset_key_log",
    "revoked_token",
    "rtif_v1",
    "rtif_v2",
    "serialized_dag",
    "slot_pool",
    "sqlite_sequence",
    "task_inlet_asset_reference",
    "task_instance",
    "task_instance_note",
    "task_outlet_asset_reference",
    "task_reschedule",
    "task_state_store",
    "team",
    "trigger",
    "variable",
    "xcom_v1",
    "xcom_v2"
   ]
  },
  "af.nightly": {
   "order": [
    "start",
    "extract_orders",
    "validate_orders",
    "load_orders",
    "build_marts",
    "notify"
   ],
   "rc": 0
  },
  "af.parse_cost": {
   "hundred_files_seconds": [
    0.1392,
    0.1646,
    0.1673
   ],
   "median_seconds": {
    "light.py": 0.0019,
    "toplevel_slow.py": 2.0027
   },
   "note": "wall time of a fresh DagBag in one process on this machine, including the import of Airflow code",
   "single_file_seconds": {
    "light.py": [
     0.0018,
     0.0018,
     0.0019,
     0.002,
     0.0055
    ],
    "toplevel_slow.py": [
     2.0026,
     2.0026,
     2.0027,
     2.0028,
     2.0059
    ]
   },
   "sleep_at_top_level_seconds": 2
  },
  "af.pools": {
   "brewline_dag_limit": {
    "max_active_tasks": 2,
    "peak_running": 2,
    "seconds_each": 3,
    "start_order": [
     "load_1",
     "load_2",
     "load_4",
     "load_3",
     "load_6",
     "load_5"
    ],
    "tasks": [
     {
      "end": 3.1,
      "priority_weight": 1,
      "start": 0.0,
      "task": "load_1"
     },
     {
      "end": 3.1,
      "priority_weight": 1,
      "start": 0.0,
      "task": "load_2"
     },
     {
      "end": 6.9,
      "priority_weight": 1,
      "start": 3.7,
      "task": "load_4"
     },
     {
      "end": 6.9,
      "priority_weight": 1,
      "start": 3.7,
      "task": "load_3"
     },
     {
      "end": 10.1,
      "priority_weight": 1,
      "start": 6.9,
      "task": "load_6"
     },
     {
      "end": 10.1,
      "priority_weight": 1,
      "start": 7.0,
      "task": "load_5"
     }
    ],
    "tasks_count": 6
   },
   "brewline_pool_priority": {
    "peak_running": 1,
    "pool_slots": 1,
    "seconds_each": 2,
    "start_order": [
     "report_5",
     "report_4",
     "report_3",
     "report_2",
     "report_1"
    ],
    "tasks": [
     {
      "end": 2.1,
      "priority_weight": 5,
      "start": 0.0,
      "task": "report_5"
     },
     {
      "end": 4.3,
      "priority_weight": 4,
      "start": 2.2,
      "task": "report_4"
     },
     {
      "end": 7.4,
      "priority_weight": 3,
      "start": 5.3,
      "task": "report_3"
     },
     {
      "end": 9.5,
      "priority_weight": 2,
      "start": 7.4,
      "task": "report_2"
     },
     {
      "end": 12.1,
      "priority_weight": 1,
      "start": 10.0,
      "task": "report_1"
     }
    ],
    "tasks_count": 5
   },
   "brewline_pool_two_slots": {
    "peak_running": 2,
    "pool_slots": 2,
    "seconds_each": 3,
    "start_order": [
     "load_1",
     "load_2",
     "load_3",
     "load_4",
     "load_6",
     "load_5"
    ],
    "tasks": [
     {
      "end": 3.1,
      "priority_weight": 1,
      "start": 0.0,
      "task": "load_1"
     },
     {
      "end": 3.1,
      "priority_weight": 1,
      "start": 0.0,
      "task": "load_2"
     },
     {
      "end": 6.3,
      "priority_weight": 1,
      "start": 3.2,
      "task": "load_3"
     },
     {
      "end": 6.3,
      "priority_weight": 1,
      "start": 3.2,
      "task": "load_4"
     },
     {
      "end": 9.7,
      "priority_weight": 1,
      "start": 6.5,
      "task": "load_6"
     },
     {
      "end": 9.7,
      "priority_weight": 1,
      "start": 6.5,
      "task": "load_5"
     }
    ],
    "tasks_count": 6
   }
  },
  "af.pytest": {
   "green": {
    "rc": 0,
    "summary": "6 passed in <seconds>s"
   },
   "red": {
    "rc": 1,
    "summary": "3 failed, 3 passed in <seconds>s"
   }
  },
  "af.render": {
   "dates": "echo ds=2026-03-14 nodash=20260314 logical_date=2026-03-14 00:00:00+00:00 start=2026-03-14 00:00:00+00:00 end=2026-03-14 00:00:00+00:00",
   "partition_path": "echo s3://brewline-lake/raw/orders/dt=2026-03-14/region=sg/",
   "previous_day": "echo 2026-03-13"
  },
  "af.retries": {
   "attempt_logs": {
    "1": "[error] Task failed with exception\nRuntimeError: source not ready (try 1)",
    "2": "[error] Task failed with exception\nRuntimeError: source not ready (try 2)",
    "3": "[info] Done. Returned value was: rows=10\n[info] Pushing xcom"
   },
   "final_state": "success",
   "gap_seconds_between_tries": [
    5.9,
    2.8
   ],
   "max_tries": 3,
   "retries": 3,
   "retry_delay_seconds": 2,
   "try_number": 3
  },
  "af.retry_grid": {
   "dag_id": "brewline_backoff",
   "logical_date": "2026-03-14 00:00:00+00:00",
   "rows": [
    {
     "cap": null,
     "delay": 1,
     "mult": 0,
     "waits": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.0
     ]
    },
    {
     "cap": 10,
     "delay": 1,
     "mult": 0,
     "waits": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.0
     ]
    },
    {
     "cap": 60,
     "delay": 1,
     "mult": 0,
     "waits": [
      1.0,
      1.0,
      1.0,
      1.0,
      1.0
     ]
    },
    {
     "cap": null,
     "delay": 1,
     "mult": 2,
     "waits": [
      1.0,
      2.0,
      5.0,
      14.0,
      21.0
     ]
    },
    {
     "cap": 10,
     "delay": 1,
     "mult": 2,
     "waits": [
      1.0,
      2.0,
      5.0,
      10.0,
      10.0
     ]
    },
    {
     "cap": 60,
     "delay": 1,
     "mult": 2,
     "waits": [
      1.0,
      2.0,
      5.0,
      14.0,
      21.0
     ]
    },
    {
     "cap": null,
     "delay": 1,
     "mult": 3,
     "waits": [
      1.0,
      3.0,
      10.0,
      38.0,
      131.0
     ]
    },
    {
     "cap": 10,
     "delay": 1,
     "mult": 3,
     "waits": [
      1.0,
      3.0,
      10.0,
      10.0,
      10.0
     ]
    },
    {
     "cap": 60,
     "delay": 1,
     "mult": 3,
     "waits": [
      1.0,
      3.0,
      10.0,
      38.0,
      60.0
     ]
    },
    {
     "cap": null,
     "delay": 5,
     "mult": 0,
     "waits": [
      5.0,
      5.0,
      5.0,
      5.0,
      5.0
     ]
    },
    {
     "cap": 10,
     "delay": 5,
     "mult": 0,
     "waits": [
      5.0,
      5.0,
      5.0,
      5.0,
      5.0
     ]
    },
    {
     "cap": 60,
     "delay": 5,
     "mult": 0,
     "waits": [
      5.0,
      5.0,
      5.0,
      5.0,
      5.0
     ]
    },
    {
     "cap": null,
     "delay": 5,
     "mult": 2,
     "waits": [
      8.0,
      12.0,
      33.0,
      46.0,
      101.0
     ]
    },
    {
     "cap": 10,
     "delay": 5,
     "mult": 2,
     "waits": [
      8.0,
      10.0,
      10.0,
      10.0,
      10.0
     ]
    },
    {
     "cap": 60,
     "delay": 5,
     "mult": 2,
     "waits": [
      8.0,
      12.0,
      33.0,
      46.0,
      60.0
     ]
    },
    {
     "cap": null,
     "delay": 5,
     "mult": 3,
     "waits": [
      8.0,
      27.0,
      73.0,
      146.0,
      536.0
     ]
    },
    {
     "cap": 10,
     "delay": 5,
     "mult": 3,
     "waits": [
      8.0,
      10.0,
      10.0,
      10.0,
      10.0
     ]
    },
    {
     "cap": 60,
     "delay": 5,
     "mult": 3,
     "waits": [
      8.0,
      27.0,
      60.0,
      60.0,
      60.0
     ]
    },
    {
     "cap": null,
     "delay": 30,
     "mult": 0,
     "waits": [
      30.0,
      30.0,
      30.0,
      30.0,
      30.0
     ]
    },
    {
     "cap": 10,
     "delay": 30,
     "mult": 0,
     "waits": [
      30.0,
      30.0,
      30.0,
      30.0,
      30.0
     ]
    },
    {
     "cap": 60,
     "delay": 30,
     "mult": 0,
     "waits": [
      30.0,
      30.0,
      30.0,
      30.0,
      30.0
     ]
    },
    {
     "cap": null,
     "delay": 30,
     "mult": 2,
     "waits": [
      33.0,
      102.0,
      133.0,
      326.0,
      821.0
     ]
    },
    {
     "cap": 10,
     "delay": 30,
     "mult": 2,
     "waits": [
      10.0,
      10.0,
      10.0,
      10.0,
      10.0
     ]
    },
    {
     "cap": 60,
     "delay": 30,
     "mult": 2,
     "waits": [
      33.0,
      60.0,
      60.0,
      60.0,
      60.0
     ]
    },
    {
     "cap": null,
     "delay": 30,
     "mult": 3,
     "waits": [
      33.0,
      102.0,
      433.0,
      1496.0,
      2561.0
     ]
    },
    {
     "cap": 10,
     "delay": 30,
     "mult": 3,
     "waits": [
      10.0,
      10.0,
      10.0,
      10.0,
      10.0
     ]
    },
    {
     "cap": 60,
     "delay": 30,
     "mult": 3,
     "waits": [
      33.0,
      60.0,
      60.0,
      60.0,
      60.0
     ]
    }
   ],
   "task_id": "call_partner"
  },
  "af.retry_policy": {
   "final": {
    "call_partner": "success",
    "read_secret": "failed"
   },
   "retries": 3,
   "rules": [
    "PermissionError: FAIL",
    "ConnectionError: RETRY after 1 second"
   ],
   "tries": {
    "call_partner": 3,
    "read_secret": 1
   }
  },
  "af.ruff": {
   "findings_old_style": 8,
   "good_dags_clean": true,
   "version": "ruff 0.17.4"
  },
  "af.secrets": {
   "connection_in_database": "brewline_api (password db-s3cret-pass)",
   "connection_in_env": "AIRFLOW_CONN_BREWLINE_API (password env-s3cret-pass)",
   "masked": true,
   "plain_password_visible": false,
   "task_log": "host: api.partner.example login: brewline\npassword: ***\n[warning] Skipping masking for a secret as it's too short (<5 chars)\nregion: sg\napi_secret: ***\nwarehouse host: warehouse.brewline.example\n[info] Done. Returned value was: None",
   "winner_host": "api.partner.example"
  },
  "af.stack": {
   "database": "SQLite",
   "executor": "LocalExecutor",
   "processes": [
    "api-server",
    "scheduler",
    "dag-processor",
    "triggerer"
   ]
  },
  "af.stack_startup": {
   "api-server": [
    "[info] Started server process [6118]",
    "[info] Waiting for application startup.",
    "[info] Application startup complete.",
    "[info] Uvicorn running on http://127.0.0.1:<port> (Press CTRL+C to quit)"
   ],
   "dag-processor": [
    "[info] Starting the Dag Processor Job",
    "[info] Processing files using up to 2 processes at a time",
    "[info] Process each file at most once every 3 seconds",
    "[info] DAG bundles loaded: dags-folder",
    "[info] Added new DAG bundle dags-folder to the database",
    "[info] DAG bundles loaded: dags-folder",
    "[info] Checking for new files in bundle dags-folder every 3 seconds",
    "[info] Refreshing bundle dags-folder",
    "[info] Searching for Dag definitions in dags-folder at /opt/airflow/dags",
    "[info] Found 24 files for bundle dags-folder (dag_discovery_safe_mode=True)"
   ],
   "scheduler": [
    "[info] Loaded executor: :LocalExecutor:",
    "[info] Starting the scheduler",
    "[info] Adopting or resetting orphaned tasks for active dag runs"
   ],
   "triggerer": [
    "[info] Starting the triggerer"
   ]
  },
  "af.timeout": {
   "error": "AirflowTaskTimeout: Timeout, PID: 15806",
   "execution_timeout_seconds": 3,
   "log": "[error] Process timed out\n[error] Task failed with exception\nAirflowTaskTimeout: Timeout, PID: 15806",
   "seconds_until_failed": 3,
   "sleep_seconds": 10,
   "state": "failed"
  },
  "af.timetables": {
   "cron_interval_utc": {
    "description": "At 02:00",
    "kind": "CronDataIntervalTimetable",
    "manual": [
     {
      "interval_end": "2026-03-13 02:00:00+00:00",
      "interval_start": "2026-03-12 02:00:00+00:00",
      "run_after": "2026-03-14T01:30:00+00:00"
     },
     {
      "interval_end": "2026-03-14 02:00:00+00:00",
      "interval_start": "2026-03-13 02:00:00+00:00",
      "run_after": "2026-03-14T15:30:00+00:00"
     },
     {
      "interval_end": "2026-03-14 02:00:00+00:00",
      "interval_start": "2026-03-13 02:00:00+00:00",
      "run_after": "2026-03-14T23:30:00+00:00"
     }
    ],
    "runs": [
     {
      "interval_end": "2026-03-02 02:00:00+00:00",
      "interval_start": "2026-03-01 02:00:00+00:00",
      "logical_date": "2026-03-01 02:00:00+00:00",
      "run_after": "2026-03-02 02:00:00+00:00"
     },
     {
      "interval_end": "2026-03-03 02:00:00+00:00",
      "interval_start": "2026-03-02 02:00:00+00:00",
      "logical_date": "2026-03-02 02:00:00+00:00",
      "run_after": "2026-03-03 02:00:00+00:00"
     },
     {
      "interval_end": "2026-03-04 02:00:00+00:00",
      "interval_start": "2026-03-03 02:00:00+00:00",
      "logical_date": "2026-03-03 02:00:00+00:00",
      "run_after": "2026-03-04 02:00:00+00:00"
     },
     {
      "interval_end": "2026-03-05 02:00:00+00:00",
      "interval_start": "2026-03-04 02:00:00+00:00",
      "logical_date": "2026-03-04 02:00:00+00:00",
      "run_after": "2026-03-05 02:00:00+00:00"
     }
    ],
    "summary": "0 2 * * *"
   },
   "cron_trigger_interval": {
    "description": "At 02:00",
    "kind": "CronTriggerTimetable",
    "manual": [
     {
      "interval_end": "2026-03-14 01:30:00+00:00",
      "interval_start": "2026-03-13 01:30:00+00:00",
      "run_after": "2026-03-14T01:30:00+00:00"
     },
     {
      "interval_end": "2026-03-14 15:30:00+00:00",
      "interval_start": "2026-03-13 15:30:00+00:00",
      "run_after": "2026-03-14T15:30:00+00:00"
     },
     {
      "interval_end": "2026-03-14 23:30:00+00:00",
      "interval_start": "2026-03-13 23:30:00+00:00",
      "run_after": "2026-03-14T23:30:00+00:00"
     }
    ],
    "runs": [
     {
      "interval_end": "2026-03-01 02:00:00+00:00",
      "interval_start": "2026-02-28 02:00:00+00:00",
      "logical_date": "2026-02-28 02:00:00+00:00",
      "run_after": "2026-03-01 02:00:00+00:00"
     },
     {
      "interval_end": "2026-03-02 02:00:00+00:00",
      "interval_start": "2026-03-01 02:00:00+00:00",
      "logical_date": "2026-03-01 02:00:00+00:00",
      "run_after": "2026-03-02 02:00:00+00:00"
     },
     {
      "interval_end": "2026-03-03 02:00:00+00:00",
      "interval_start": "2026-03-02 02:00:00+00:00",
      "logical_date": "2026-03-02 02:00:00+00:00",
      "run_after": "2026-03-03 02:00:00+00:00"
     },
     {
      "interval_end": "2026-03-04 02:00:00+00:00",
      "interval_start": "2026-03-03 02:00:00+00:00",
      "logical_date": "2026-03-03 02:00:00+00:00",
      "run_after": "2026-03-04 02:00:00+00:00"
     }
    ],
    "summary": "0 2 * * *"
   },
   "cron_trigger_utc": {
    "description": "At 02:00",
    "kind": "CronTriggerTimetable",
    "manual": [
     {
      "interval_end": "2026-03-14 01:30:00+00:00",
      "interval_start": "2026-03-14 01:30:00+00:00",
      "run_after": "2026-03-14T01:30:00+00:00"
     },
     {
      "interval_end": "2026-03-14 15:30:00+00:00",
      "interval_start": "2026-03-14 15:30:00+00:00",
      "run_after": "2026-03-14T15:30:00+00:00"
     },
     {
      "interval_end": "2026-03-14 23:30:00+00:00",
      "interval_start": "2026-03-14 23:30:00+00:00",
      "run_after": "2026-03-14T23:30:00+00:00"
     }
    ],
    "runs": [
     {
      "interval_end": "2026-03-01 02:00:00+00:00",
      "interval_start": "2026-03-01 02:00:00+00:00",
      "logical_date": "2026-03-01 02:00:00+00:00",
      "run_after": "2026-03-01 02:00:00+00:00"
     },
     {
      "interval_end": "2026-03-02 02:00:00+00:00",
      "interval_start": "2026-03-02 02:00:00+00:00",
      "logical_date": "2026-03-02 02:00:00+00:00",
      "run_after": "2026-03-02 02:00:00+00:00"
     },
     {
      "interval_end": "2026-03-03 02:00:00+00:00",
      "interval_start": "2026-03-03 02:00:00+00:00",
      "logical_date": "2026-03-03 02:00:00+00:00",
      "run_after": "2026-03-03 02:00:00+00:00"
     },
     {
      "interval_end": "2026-03-04 02:00:00+00:00",
      "interval_start": "2026-03-04 02:00:00+00:00",
      "logical_date": "2026-03-04 02:00:00+00:00",
      "run_after": "2026-03-04 02:00:00+00:00"
     }
    ],
    "summary": "0 2 * * *"
   },
   "daily_interval": {
    "description": "At 00:00",
    "kind": "CronDataIntervalTimetable",
    "manual": [
     {
      "interval_end": "2026-03-14 00:00:00+00:00",
      "interval_start": "2026-03-13 00:00:00+00:00",
      "run_after": "2026-03-14T01:30:00+00:00"
     },
     {
      "interval_end": "2026-03-14 00:00:00+00:00",
      "interval_start": "2026-03-13 00:00:00+00:00",
      "run_after": "2026-03-14T15:30:00+00:00"
     },
     {
      "interval_end": "2026-03-14 00:00:00+00:00",
      "interval_start": "2026-03-13 00:00:00+00:00",
      "run_after": "2026-03-14T23:30:00+00:00"
     }
    ],
    "runs": [
     {
      "interval_end": "2026-03-02 00:00:00+00:00",
      "interval_start": "2026-03-01 00:00:00+00:00",
      "logical_date": "2026-03-01 00:00:00+00:00",
      "run_after": "2026-03-02 00:00:00+00:00"
     },
     {
      "interval_end": "2026-03-03 00:00:00+00:00",
      "interval_start": "2026-03-02 00:00:00+00:00",
      "logical_date": "2026-03-02 00:00:00+00:00",
      "run_after": "2026-03-03 00:00:00+00:00"
     },
     {
      "interval_end": "2026-03-04 00:00:00+00:00",
      "interval_start": "2026-03-03 00:00:00+00:00",
      "logical_date": "2026-03-03 00:00:00+00:00",
      "run_after": "2026-03-04 00:00:00+00:00"
     },
     {
      "interval_end": "2026-03-05 00:00:00+00:00",
      "interval_start": "2026-03-04 00:00:00+00:00",
      "logical_date": "2026-03-04 00:00:00+00:00",
      "run_after": "2026-03-05 00:00:00+00:00"
     }
    ],
    "summary": "0 0 * * *"
   },
   "daily_trigger": {
    "description": "At 00:00",
    "kind": "CronTriggerTimetable",
    "manual": [
     {
      "interval_end": "2026-03-14 01:30:00+00:00",
      "interval_start": "2026-03-14 01:30:00+00:00",
      "run_after": "2026-03-14T01:30:00+00:00"
     },
     {
      "interval_end": "2026-03-14 15:30:00+00:00",
      "interval_start": "2026-03-14 15:30:00+00:00",
      "run_after": "2026-03-14T15:30:00+00:00"
     },
     {
      "interval_end": "2026-03-14 23:30:00+00:00",
      "interval_start": "2026-03-14 23:30:00+00:00",
      "run_after": "2026-03-14T23:30:00+00:00"
     }
    ],
    "runs": [
     {
      "interval_end": "2026-03-01 00:00:00+00:00",
      "interval_start": "2026-03-01 00:00:00+00:00",
      "logical_date": "2026-03-01 00:00:00+00:00",
      "run_after": "2026-03-01 00:00:00+00:00"
     },
     {
      "interval_end": "2026-03-02 00:00:00+00:00",
      "interval_start": "2026-03-02 00:00:00+00:00",
      "logical_date": "2026-03-02 00:00:00+00:00",
      "run_after": "2026-03-02 00:00:00+00:00"
     },
     {
      "interval_end": "2026-03-03 00:00:00+00:00",
      "interval_start": "2026-03-03 00:00:00+00:00",
      "logical_date": "2026-03-03 00:00:00+00:00",
      "run_after": "2026-03-03 00:00:00+00:00"
     },
     {
      "interval_end": "2026-03-04 00:00:00+00:00",
      "interval_start": "2026-03-04 00:00:00+00:00",
      "logical_date": "2026-03-04 00:00:00+00:00",
      "run_after": "2026-03-04 00:00:00+00:00"
     }
    ],
    "summary": "0 0 * * *"
   },
   "delta_interval_6h": {
    "description": "",
    "kind": "DeltaDataIntervalTimetable",
    "manual": [
     {
      "interval_end": "2026-03-14 01:30:00+00:00",
      "interval_start": "2026-03-13 19:30:00+00:00",
      "run_after": "2026-03-14T01:30:00+00:00"
     },
     {
      "interval_end": "2026-03-14 15:30:00+00:00",
      "interval_start": "2026-03-14 09:30:00+00:00",
      "run_after": "2026-03-14T15:30:00+00:00"
     },
     {
      "interval_end": "2026-03-14 23:30:00+00:00",
      "interval_start": "2026-03-14 17:30:00+00:00",
      "run_after": "2026-03-14T23:30:00+00:00"
     }
    ],
    "runs": [
     {
      "interval_end": "2026-03-01 06:00:00+00:00",
      "interval_start": "2026-03-01 00:00:00+00:00",
      "logical_date": "2026-03-01 00:00:00+00:00",
      "run_after": "2026-03-01 06:00:00+00:00"
     },
     {
      "interval_end": "2026-03-01 12:00:00+00:00",
      "interval_start": "2026-03-01 06:00:00+00:00",
      "logical_date": "2026-03-01 06:00:00+00:00",
      "run_after": "2026-03-01 12:00:00+00:00"
     },
     {
      "interval_end": "2026-03-01 18:00:00+00:00",
      "interval_start": "2026-03-01 12:00:00+00:00",
      "logical_date": "2026-03-01 12:00:00+00:00",
      "run_after": "2026-03-01 18:00:00+00:00"
     },
     {
      "interval_end": "2026-03-02 00:00:00+00:00",
      "interval_start": "2026-03-01 18:00:00+00:00",
      "logical_date": "2026-03-01 18:00:00+00:00",
      "run_after": "2026-03-02 00:00:00+00:00"
     }
    ],
    "summary": "6:00:00"
   },
   "delta_trigger_6h": {
    "description": "",
    "kind": "DeltaTriggerTimetable",
    "manual": [
     {
      "interval_end": "2026-03-14 01:30:00+00:00",
      "interval_start": "2026-03-14 01:30:00+00:00",
      "run_after": "2026-03-14T01:30:00+00:00"
     },
     {
      "interval_end": "2026-03-14 15:30:00+00:00",
      "interval_start": "2026-03-14 15:30:00+00:00",
      "run_after": "2026-03-14T15:30:00+00:00"
     },
     {
      "interval_end": "2026-03-14 23:30:00+00:00",
      "interval_start": "2026-03-14 23:30:00+00:00",
      "run_after": "2026-03-14T23:30:00+00:00"
     }
    ],
    "runs": [
     {
      "interval_end": "2026-03-01 00:00:00+00:00",
      "interval_start": "2026-03-01 00:00:00+00:00",
      "logical_date": "2026-03-01 00:00:00+00:00",
      "run_after": "2026-03-01 00:00:00+00:00"
     },
     {
      "interval_end": "2026-03-01 06:00:00+00:00",
      "interval_start": "2026-03-01 06:00:00+00:00",
      "logical_date": "2026-03-01 06:00:00+00:00",
      "run_after": "2026-03-01 06:00:00+00:00"
     },
     {
      "interval_end": "2026-03-01 12:00:00+00:00",
      "interval_start": "2026-03-01 12:00:00+00:00",
      "logical_date": "2026-03-01 12:00:00+00:00",
      "run_after": "2026-03-01 12:00:00+00:00"
     },
     {
      "interval_end": "2026-03-01 18:00:00+00:00",
      "interval_start": "2026-03-01 18:00:00+00:00",
      "logical_date": "2026-03-01 18:00:00+00:00",
      "run_after": "2026-03-01 18:00:00+00:00"
     }
    ],
    "summary": "6:00:00"
   },
   "weekly_interval": {
    "description": "At 06:00, only on Monday",
    "kind": "CronDataIntervalTimetable",
    "manual": [
     {
      "interval_end": "2026-03-09 06:00:00+00:00",
      "interval_start": "2026-03-02 06:00:00+00:00",
      "run_after": "2026-03-14T01:30:00+00:00"
     },
     {
      "interval_end": "2026-03-09 06:00:00+00:00",
      "interval_start": "2026-03-02 06:00:00+00:00",
      "run_after": "2026-03-14T15:30:00+00:00"
     },
     {
      "interval_end": "2026-03-09 06:00:00+00:00",
      "interval_start": "2026-03-02 06:00:00+00:00",
      "run_after": "2026-03-14T23:30:00+00:00"
     }
    ],
    "runs": [
     {
      "interval_end": "2026-03-09 06:00:00+00:00",
      "interval_start": "2026-03-02 06:00:00+00:00",
      "logical_date": "2026-03-02 06:00:00+00:00",
      "run_after": "2026-03-09 06:00:00+00:00"
     },
     {
      "interval_end": "2026-03-16 06:00:00+00:00",
      "interval_start": "2026-03-09 06:00:00+00:00",
      "logical_date": "2026-03-09 06:00:00+00:00",
      "run_after": "2026-03-16 06:00:00+00:00"
     },
     {
      "interval_end": "2026-03-23 06:00:00+00:00",
      "interval_start": "2026-03-16 06:00:00+00:00",
      "logical_date": "2026-03-16 06:00:00+00:00",
      "run_after": "2026-03-23 06:00:00+00:00"
     },
     {
      "interval_end": "2026-03-30 06:00:00+00:00",
      "interval_start": "2026-03-23 06:00:00+00:00",
      "logical_date": "2026-03-23 06:00:00+00:00",
      "run_after": "2026-03-30 06:00:00+00:00"
     }
    ],
    "summary": "0 6 * * 1"
   },
   "weekly_trigger": {
    "description": "At 06:00, only on Monday",
    "kind": "CronTriggerTimetable",
    "manual": [
     {
      "interval_end": "2026-03-14 01:30:00+00:00",
      "interval_start": "2026-03-14 01:30:00+00:00",
      "run_after": "2026-03-14T01:30:00+00:00"
     },
     {
      "interval_end": "2026-03-14 15:30:00+00:00",
      "interval_start": "2026-03-14 15:30:00+00:00",
      "run_after": "2026-03-14T15:30:00+00:00"
     },
     {
      "interval_end": "2026-03-14 23:30:00+00:00",
      "interval_start": "2026-03-14 23:30:00+00:00",
      "run_after": "2026-03-14T23:30:00+00:00"
     }
    ],
    "runs": [
     {
      "interval_end": "2026-03-02 06:00:00+00:00",
      "interval_start": "2026-03-02 06:00:00+00:00",
      "logical_date": "2026-03-02 06:00:00+00:00",
      "run_after": "2026-03-02 06:00:00+00:00"
     },
     {
      "interval_end": "2026-03-09 06:00:00+00:00",
      "interval_start": "2026-03-09 06:00:00+00:00",
      "logical_date": "2026-03-09 06:00:00+00:00",
      "run_after": "2026-03-09 06:00:00+00:00"
     },
     {
      "interval_end": "2026-03-16 06:00:00+00:00",
      "interval_start": "2026-03-16 06:00:00+00:00",
      "logical_date": "2026-03-16 06:00:00+00:00",
      "run_after": "2026-03-16 06:00:00+00:00"
     },
     {
      "interval_end": "2026-03-23 06:00:00+00:00",
      "interval_start": "2026-03-23 06:00:00+00:00",
      "logical_date": "2026-03-23 06:00:00+00:00",
      "run_after": "2026-03-23 06:00:00+00:00"
     }
    ],
    "summary": "0 6 * * 1"
   }
  },
  "af.timetables_more": {
   "events": {
    "description": "3 events between 2026-03-02T09:00:00+00:00 and 2026-03-31T09:00:00+00:00",
    "kind": "EventsTimetable",
    "manual": [],
    "runs": [
     {
      "interval_end": "2026-03-02 09:00:00+00:00",
      "interval_start": "2026-03-02 09:00:00+00:00",
      "logical_date": "2026-03-02 09:00:00+00:00",
      "run_after": "2026-03-02 09:00:00+00:00"
     },
     {
      "interval_end": "2026-03-09 09:00:00+00:00",
      "interval_start": "2026-03-09 09:00:00+00:00",
      "logical_date": "2026-03-09 09:00:00+00:00",
      "run_after": "2026-03-09 09:00:00+00:00"
     },
     {
      "interval_end": "2026-03-31 09:00:00+00:00",
      "interval_start": "2026-03-31 09:00:00+00:00",
      "logical_date": "2026-03-31 09:00:00+00:00",
      "run_after": "2026-03-31 09:00:00+00:00"
     }
    ],
    "summary": "3 events"
   },
   "multiple_cron": {
    "description": "At 01:00, At 13:00, only on Monday",
    "kind": "MultipleCronTriggerTimetable",
    "manual": [],
    "runs": [
     {
      "interval_end": "2026-03-14 01:00:00+00:00",
      "interval_start": "2026-03-14 01:00:00+00:00",
      "logical_date": "2026-03-14 01:00:00+00:00",
      "run_after": "2026-03-14 01:00:00+00:00"
     },
     {
      "interval_end": "2026-03-15 01:00:00+00:00",
      "interval_start": "2026-03-15 01:00:00+00:00",
      "logical_date": "2026-03-15 01:00:00+00:00",
      "run_after": "2026-03-15 01:00:00+00:00"
     },
     {
      "interval_end": "2026-03-16 01:00:00+00:00",
      "interval_start": "2026-03-16 01:00:00+00:00",
      "logical_date": "2026-03-16 01:00:00+00:00",
      "run_after": "2026-03-16 01:00:00+00:00"
     },
     {
      "interval_end": "2026-03-16 13:00:00+00:00",
      "interval_start": "2026-03-16 13:00:00+00:00",
      "logical_date": "2026-03-16 13:00:00+00:00",
      "run_after": "2026-03-16 13:00:00+00:00"
     },
     {
      "interval_end": "2026-03-17 01:00:00+00:00",
      "interval_start": "2026-03-17 01:00:00+00:00",
      "logical_date": "2026-03-17 01:00:00+00:00",
      "run_after": "2026-03-17 01:00:00+00:00"
     },
     {
      "interval_end": "2026-03-18 01:00:00+00:00",
      "interval_start": "2026-03-18 01:00:00+00:00",
      "logical_date": "2026-03-18 01:00:00+00:00",
      "run_after": "2026-03-18 01:00:00+00:00"
     }
    ],
    "summary": "0 1 * * *, 0 13 * * 1"
   }
  },
  "af.trigger_rules": {
   "meaning": "three parents: succeeded, failed, skipped (digits are the counts)",
   "mixes": [
    "300",
    "210",
    "201",
    "120",
    "111",
    "102",
    "030",
    "021",
    "012",
    "003"
   ],
   "results": {
    "all_done": {
     "003": "success",
     "012": "success",
     "021": "success",
     "030": "success",
     "102": "success",
     "111": "success",
     "120": "success",
     "201": "success",
     "210": "success",
     "300": "success"
    },
    "all_done_min_one_success": {
     "003": "skipped",
     "012": "skipped",
     "021": "skipped",
     "030": "upstream_failed",
     "102": "skipped",
     "111": "skipped",
     "120": "success",
     "201": "skipped",
     "210": "success",
     "300": "success"
    },
    "all_done_setup_success": {
     "003": "success",
     "012": "success",
     "021": "success",
     "030": "success",
     "102": "success",
     "111": "success",
     "120": "success",
     "201": "success",
     "210": "success",
     "300": "success"
    },
    "all_failed": {
     "003": "skipped",
     "012": "skipped",
     "021": "skipped",
     "030": "success",
     "102": "skipped",
     "111": "skipped",
     "120": "skipped",
     "201": "skipped",
     "210": "skipped",
     "300": "skipped"
    },
    "all_skipped": {
     "003": "success",
     "012": "skipped",
     "021": "skipped",
     "030": "skipped",
     "102": "skipped",
     "111": "skipped",
     "120": "skipped",
     "201": "skipped",
     "210": "skipped",
     "300": "skipped"
    },
    "all_success": {
     "003": "skipped",
     "012": "upstream_failed",
     "021": "upstream_failed",
     "030": "upstream_failed",
     "102": "skipped",
     "111": "upstream_failed",
     "120": "upstream_failed",
     "201": "skipped",
     "210": "upstream_failed",
     "300": "success"
    },
    "always": {
     "003": "success",
     "012": "success",
     "021": "success",
     "030": "success",
     "102": "success",
     "111": "success",
     "120": "success",
     "201": "success",
     "210": "success",
     "300": "success"
    },
    "none_failed": {
     "003": "success",
     "012": "upstream_failed",
     "021": "upstream_failed",
     "030": "upstream_failed",
     "102": "success",
     "111": "upstream_failed",
     "120": "upstream_failed",
     "201": "success",
     "210": "upstream_failed",
     "300": "success"
    },
    "none_failed_min_one_success": {
     "003": "skipped",
     "012": "upstream_failed",
     "021": "upstream_failed",
     "030": "upstream_failed",
     "102": "success",
     "111": "upstream_failed",
     "120": "upstream_failed",
     "201": "success",
     "210": "upstream_failed",
     "300": "success"
    },
    "none_skipped": {
     "003": "skipped",
     "012": "skipped",
     "021": "skipped",
     "030": "success",
     "102": "skipped",
     "111": "skipped",
     "120": "success",
     "201": "skipped",
     "210": "success",
     "300": "success"
    },
    "one_done": {
     "003": "skipped",
     "012": "success",
     "021": "success",
     "030": "success",
     "102": "success",
     "111": "success",
     "120": "success",
     "201": "success",
     "210": "success",
     "300": "success"
    },
    "one_failed": {
     "003": "skipped",
     "012": "success",
     "021": "success",
     "030": "success",
     "102": "skipped",
     "111": "success",
     "120": "success",
     "201": "skipped",
     "210": "success",
     "300": "skipped"
    },
    "one_success": {
     "003": "skipped",
     "012": "upstream_failed",
     "021": "upstream_failed",
     "030": "upstream_failed",
     "102": "success",
     "111": "success",
     "120": "success",
     "201": "success",
     "210": "success",
     "300": "success"
    }
   },
   "rules": [
    "all_success",
    "all_failed",
    "all_done",
    "all_done_min_one_success",
    "all_done_setup_success",
    "one_success",
    "one_failed",
    "one_done",
    "none_failed",
    "none_skipped",
    "always",
    "none_failed_min_one_success",
    "all_skipped"
   ]
  },
  "af.versions": {
   "change": "a fourth task, audit, was added to the file",
   "runs": [
    {
     "dag_version": 1,
     "run": "first run",
     "tasks": 3
    },
    {
     "dag_version": 2,
     "run": "second run",
     "tasks": 4
    }
   ],
   "versions_after": [
    1,
    2
   ],
   "versions_before": [
    1
   ]
  },
  "af.waiting": {
   "deferrable": {
    "facts": {
     "max_deferred": 4,
     "max_holding_a_slot": 2,
     "max_running": 2,
     "seconds_until_all_done": 16.6,
     "slot_seconds": 1.0
    },
    "files_created_at": 14,
    "poke_interval_seconds": 2,
    "pool_slots": 2,
    "segments": {
     "wait_1": [
      [
       "none",
       0,
       0
      ],
      [
       "running",
       1,
       1
      ],
      [
       "deferred",
       2,
       14
      ],
      [
       "scheduled",
       14,
       15
      ],
      [
       "success",
       16,
       17
      ]
     ],
     "wait_2": [
      [
       "none",
       0,
       0
      ],
      [
       "running",
       1,
       1
      ],
      [
       "deferred",
       2,
       14
      ],
      [
       "scheduled",
       14,
       15
      ],
      [
       "success",
       16,
       17
      ]
     ],
     "wait_3": [
      [
       "none",
       0,
       0
      ],
      [
       "scheduled",
       1,
       2
      ],
      [
       "deferred",
       2,
       15
      ],
      [
       "scheduled",
       16,
       16
      ],
      [
       "success",
       17,
       17
      ]
     ],
     "wait_4": [
      [
       "none",
       0,
       0
      ],
      [
       "scheduled",
       1,
       2
      ],
      [
       "deferred",
       2,
       15
      ],
      [
       "scheduled",
       16,
       16
      ],
      [
       "success",
       17,
       17
      ]
     ]
    },
    "states_seen": [
     "deferred",
     "running",
     "scheduled",
     "success"
    ]
   },
   "poke": {
    "facts": {
     "max_deferred": 0,
     "max_holding_a_slot": 2,
     "max_running": 2,
     "seconds_until_all_done": 16.6,
     "slot_seconds": 28.5
    },
    "files_created_at": 14,
    "poke_interval_seconds": 2,
    "pool_slots": 2,
    "segments": {
     "wait_1": [
      [
       "none",
       0,
       0
      ],
      [
       "running",
       1,
       14
      ],
      [
       "success",
       15,
       17
      ]
     ],
     "wait_2": [
      [
       "none",
       0,
       0
      ],
      [
       "running",
       1,
       14
      ],
      [
       "success",
       15,
       17
      ]
     ],
     "wait_3": [
      [
       "none",
       0,
       0
      ],
      [
       "scheduled",
       1,
       16
      ],
      [
       "running",
       16,
       16
      ],
      [
       "success",
       17,
       17
      ]
     ],
     "wait_4": [
      [
       "none",
       0,
       0
      ],
      [
       "scheduled",
       1,
       16
      ],
      [
       "success",
       16,
       17
      ]
     ]
    },
    "states_seen": [
     "running",
     "scheduled",
     "success"
    ]
   },
   "reschedule": {
    "facts": {
     "max_deferred": 0,
     "max_holding_a_slot": 2,
     "max_running": 2,
     "seconds_until_all_done": 15.1,
     "slot_seconds": 5.0
    },
    "files_created_at": 14,
    "poke_interval_seconds": 2,
    "pool_slots": 2,
    "segments": {
     "wait_1": [
      [
       "none",
       0,
       0
      ],
      [
       "up_for_reschedule",
       1,
       9
      ],
      [
       "running",
       10,
       10
      ],
      [
       "up_for_reschedule",
       10,
       14
      ],
      [
       "running",
       15,
       15
      ],
      [
       "success",
       15,
       15
      ]
     ],
     "wait_2": [
      [
       "none",
       0,
       0
      ],
      [
       "up_for_reschedule",
       1,
       6
      ],
      [
       "running",
       7,
       7
      ],
      [
       "up_for_reschedule",
       8,
       9
      ],
      [
       "running",
       10,
       10
      ],
      [
       "up_for_reschedule",
       10,
       14
      ],
      [
       "running",
       15,
       15
      ],
      [
       "success",
       15,
       15
      ]
     ],
     "wait_3": [
      [
       "none",
       0,
       0
      ],
      [
       "scheduled",
       1,
       2
      ],
      [
       "up_for_reschedule",
       2,
       4
      ],
      [
       "queued",
       4,
       4
      ],
      [
       "up_for_reschedule",
       5,
       14
      ],
      [
       "queued",
       14,
       14
      ],
      [
       "success",
       15,
       15
      ]
     ],
     "wait_4": [
      [
       "none",
       0,
       0
      ],
      [
       "scheduled",
       1,
       2
      ],
      [
       "up_for_reschedule",
       2,
       4
      ],
      [
       "queued",
       4,
       4
      ],
      [
       "up_for_reschedule",
       5,
       8
      ],
      [
       "running",
       8,
       8
      ],
      [
       "up_for_reschedule",
       8,
       14
      ],
      [
       "queued",
       14,
       14
      ],
      [
       "success",
       15,
       15
      ]
     ]
    },
    "states_seen": [
     "queued",
     "running",
     "scheduled",
     "success",
     "up_for_reschedule"
    ]
   }
  },
  "af.xcom_size": {
   "database": "SQLite",
   "rows": [
    {
     "state": "success",
     "stored_bytes": 1002,
     "task": "return_1_kb"
    },
    {
     "state": "success",
     "stored_bytes": 100002,
     "task": "return_100_kb"
    },
    {
     "state": "success",
     "stored_bytes": 1000002,
     "task": "return_1_mb"
    },
    {
     "state": "success",
     "stored_bytes": 10000002,
     "task": "return_10_mb"
    }
   ]
  }
 },
 "files": {
  "dags/brewline_alerts.py": "\"\"\"Functions that the scheduler and the executor import by name. They must be importable from the DAGs folder.\"\"\"\nimport os\n\n\ndef deadline_missed(**kwargs):\n    with open(os.environ.get(\"BREWLINE_DEADLINE_LOG\", \"/tmp/brewline_deadline.log\"), \"a\") as f:\n        f.write(\"deadline missed\\n\")\n",
  "dags/brewline_assets.py": "\"\"\"Assets: a producer task says which asset it updated, and the DAGs that schedule on that asset run when it does.\"\"\"\nimport pendulum\nfrom airflow.sdk import Asset, dag, task, get_current_context\n\norders_raw = Asset(name=\"orders_raw\", uri=\"brewline://lake/raw/orders\")\ncustomers_raw = Asset(name=\"customers_raw\", uri=\"brewline://lake/raw/customers\")\n\n\n@dag(dag_id=\"brewline_land_orders\", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"), catchup=False)\ndef land_orders():\n    @task(outlets=[orders_raw])\n    def land():\n        print(\"landed the orders file\")\n\n    land()\n\n\n@dag(dag_id=\"brewline_land_customers\", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"), catchup=False)\ndef land_customers():\n    @task(outlets=[customers_raw])\n    def land():\n        print(\"landed the customers file\")\n\n    land()\n\n\n@dag(dag_id=\"brewline_orders_daily\", schedule=[orders_raw], start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"), catchup=False)\ndef orders_daily():\n    @task\n    def build():\n        events = get_current_context()[\"triggering_asset_events\"]\n        for asset, evs in events.items():\n            print(f\"triggered by {asset.name}: {len(evs)} event(s)\")\n\n    build()\n\n\n@dag(dag_id=\"brewline_customer_orders\", schedule=[orders_raw, customers_raw], start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"), catchup=False)\ndef customer_orders():\n    @task\n    def build():\n        events = get_current_context()[\"triggering_asset_events\"]\n        for asset, evs in sorted(events.items(), key=lambda kv: kv[0].name):\n            print(f\"triggered by {asset.name}: {len(evs)} event(s)\")\n\n    build()\n\n\nland_orders()\nland_customers()\norders_daily()\ncustomer_orders()\n",
  "dags/brewline_backfill_demo.py": "\"\"\"A daily load without catchup. Old days are filled with a backfill instead.\"\"\"\nimport pendulum\nfrom airflow.sdk import DAG\nfrom airflow.providers.standard.operators.bash import BashOperator\n\nwith DAG(dag_id=\"brewline_backfill_demo\", schedule=\"@daily\", start_date=pendulum.datetime(2026, 3, 2, tz=\"UTC\"), catchup=False) as dag:\n    BashOperator(task_id=\"load\", bash_command=\"echo loading {{ ds }}\")\n",
  "dags/brewline_backoff.py": "\"\"\"A task that always fails, with exponential backoff: how long does Airflow wait before each retry?\"\"\"\nimport datetime\n\nimport pendulum\nfrom airflow.sdk import dag, task\n\n\n@dag(dag_id=\"brewline_backoff\", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"), catchup=False)\ndef brewline_backoff():\n    @task(\n        retries=4,\n        retry_delay=datetime.timedelta(seconds=1),\n        retry_exponential_backoff=2.0,\n        max_retry_delay=datetime.timedelta(seconds=10),\n    )\n    def call_partner():\n        raise ConnectionError(\"the partner API is down\")\n\n    call_partner()\n\n\nbrewline_backoff()\n",
  "dags/brewline_blocked.py": "\"\"\"Four reasons why a task does not start. The recorder asks Airflow while each one is true.\"\"\"\nimport pendulum\nfrom airflow.sdk import DAG\nfrom airflow.providers.standard.operators.bash import BashOperator\n\nSTART = pendulum.datetime(2026, 3, 1, tz=\"UTC\")\n\nwith DAG(dag_id=\"brewline_blocked\", schedule=None, start_date=START, catchup=False) as dag:\n    hold_slot = BashOperator(task_id=\"hold_slot\", bash_command=\"sleep 30\", pool=\"tiny_pool\")\n    wait_for_slot = BashOperator(task_id=\"wait_for_slot\", bash_command=\"echo report\", pool=\"tiny_pool\")\n    slow_extract = BashOperator(task_id=\"slow_extract\", bash_command=\"sleep 30\")\n    load_after_extract = BashOperator(task_id=\"load_after_extract\", bash_command=\"echo load\")\n    slow_extract >> load_after_extract\n\nwith DAG(dag_id=\"brewline_blocked_limit\", schedule=None, start_date=START, catchup=False, max_active_tasks=1) as dag2:\n    BashOperator(task_id=\"long_a\", bash_command=\"sleep 30\")\n    BashOperator(task_id=\"long_b\", bash_command=\"echo b\")\n\nwith DAG(dag_id=\"brewline_blocked_past\", schedule=None, start_date=START, catchup=False, default_args={\"depends_on_past\": True, \"retries\": 0}) as dag3:\n    BashOperator(task_id=\"load\", bash_command=\"test -f /nonexistent_partner_file\")\n",
  "dags/brewline_branch.py": "\"\"\"Branching: pick one path, skip the other, then join with a trigger rule that accepts skipped parents.\"\"\"\nimport pendulum\nfrom airflow.sdk import dag, task\n\n\n@dag(dag_id=\"brewline_branch\", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"), catchup=False, params={\"full_refresh\": False})\ndef brewline_branch():\n    @task.branch\n    def choose(params=None):\n        return \"full_load\" if params[\"full_refresh\"] else \"incremental_load\"\n\n    @task\n    def full_load():\n        print(\"loading everything\")\n\n    @task\n    def incremental_load():\n        print(\"loading yesterday\")\n\n    @task(trigger_rule=\"none_failed_min_one_success\")\n    def build_marts():\n        print(\"building marts\")\n\n    pick = choose()\n    full = full_load()\n    incremental = incremental_load()\n    pick >> [full, incremental] >> build_marts()\n\n\nbrewline_branch()\n",
  "dags/brewline_callbacks.py": "\"\"\"Callbacks: functions that Airflow calls when a task fails, retries or succeeds.\"\"\"\nimport os\n\nimport pendulum\nfrom airflow.sdk import dag, task\n\nLOG = os.environ.get(\"BREWLINE_CALLBACK_LOG\", \"/tmp/brewline_callbacks.log\")\n\n\ndef note(kind):\n    def callback(context):\n        ti = context[\"ti\"]\n        with open(LOG, \"a\") as f:\n            f.write(f\"{kind} task={ti.task_id} try={ti.try_number}\\n\")\n    return callback\n\n\n@dag(dag_id=\"brewline_callbacks\", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"), catchup=False)\ndef brewline_callbacks():\n    @task(retries=1, retry_delay=0, on_failure_callback=note(\"failure\"), on_retry_callback=note(\"retry\"), on_success_callback=note(\"success\"))\n    def export():\n        raise RuntimeError(\"the export service is down\")\n\n    export()\n\n\nbrewline_callbacks()\n",
  "dags/brewline_catchup_off.py": "\"\"\"Catchup: what Airflow does about the days between start_date and today, when the DAG is switched on.\"\"\"\nimport pendulum\nfrom airflow.sdk import DAG\nfrom airflow.providers.standard.operators.bash import BashOperator\n\nwith DAG(\n    dag_id=\"brewline_catchup_off\",\n    schedule=\"@daily\",\n    start_date=pendulum.datetime(2026, 3, 10, tz=\"UTC\"),\n    catchup=False,\n) as dag:\n    BashOperator(task_id=\"load\", bash_command=\"sleep 3; echo loading {{ ds }}\")\n",
  "dags/brewline_catchup_on.py": "\"\"\"Catchup: what Airflow does about the days between start_date and today, when the DAG is switched on.\"\"\"\nimport pendulum\nfrom airflow.sdk import DAG\nfrom airflow.providers.standard.operators.bash import BashOperator\n\nwith DAG(\n    dag_id=\"brewline_catchup_on\",\n    schedule=\"@daily\",\n    start_date=pendulum.datetime(2026, 3, 10, tz=\"UTC\"),\n    catchup=True,\n    max_active_runs=2,\n) as dag:\n    BashOperator(task_id=\"load\", bash_command=\"sleep 3; echo loading {{ ds }}\")\n",
  "dags/brewline_catchup_serial.py": "\"\"\"Catchup: what Airflow does about the days between start_date and today, when the DAG is switched on.\"\"\"\nimport pendulum\nfrom airflow.sdk import DAG\nfrom airflow.providers.standard.operators.bash import BashOperator\n\nwith DAG(\n    dag_id=\"brewline_catchup_serial\",\n    schedule=\"@daily\",\n    start_date=pendulum.datetime(2026, 3, 10, tz=\"UTC\"),\n    catchup=True,\n    max_active_runs=1,\n) as dag:\n    BashOperator(task_id=\"load\", bash_command=\"sleep 3; echo loading {{ ds }}\")\n",
  "dags/brewline_ctx.py": "\"\"\"Which values does a task get? A scheduled run and a manual run without a date answer differently.\"\"\"\nimport pendulum\nfrom airflow.sdk import dag, task, get_current_context\n\n\n@dag(dag_id=\"brewline_ctx\", schedule=\"@daily\", start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"), catchup=False)\ndef brewline_ctx():\n    @task\n    def show():\n        ctx = get_current_context()\n        for key in [\"run_id\", \"logical_date\", \"data_interval_start\", \"data_interval_end\", \"ds\", \"ts\"]:\n            print(key, \"=\", ctx.get(key, \"<missing>\"))\n        print(\"run_type =\", ctx[\"dag_run\"].run_type.value)\n\n    @task\n    def templated(ds=None):\n        print(\"ds argument =\", ds)\n\n    show() >> templated()\n\n\nbrewline_ctx()\n",
  "dags/brewline_dag_limit.py": "\"\"\"Six independent tasks and no pool: the DAG itself allows two tasks at a time.\"\"\"\nimport pendulum\nfrom airflow.sdk import DAG\nfrom airflow.providers.standard.operators.bash import BashOperator\n\nwith DAG(dag_id=\"brewline_dag_limit\", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"), catchup=False, max_active_tasks=2) as dag:\n    for n in range(1, 7):\n        BashOperator(task_id=f\"load_{n}\", bash_command=\"sleep 3\")\n",
  "dags/brewline_db_access.py": "\"\"\"A task that reaches for the metadata database. In Airflow 3 a task talks to the API server, not to the database.\"\"\"\nimport pendulum\nfrom airflow.sdk import dag, task\n\n\n@dag(dag_id=\"brewline_db_access\", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"), catchup=False)\ndef brewline_db_access():\n    @task(retries=0)\n    def count_runs():\n        from airflow.models import DagRun\n        from airflow.utils.session import create_session\n\n        with create_session() as session:\n            print(session.query(DagRun).count())\n\n    count_runs()\n\n\nbrewline_db_access()\n",
  "dags/brewline_deadline.py": "\"\"\"A deadline alert: if the run is not done five seconds after it was queued, Airflow calls a function.\"\"\"\nimport datetime\n\nimport pendulum\nfrom airflow.sdk import DeadlineAlert, DeadlineReference, SyncCallback, dag, task\n\n\n@dag(\n    dag_id=\"brewline_deadline\",\n    schedule=None,\n    start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"),\n    catchup=False,\n    deadline=DeadlineAlert(\n        reference=DeadlineReference.DAGRUN_QUEUED_AT,\n        interval=datetime.timedelta(seconds=5),\n        callback=SyncCallback(\"brewline_alerts.deadline_missed\"),\n    ),\n)\ndef brewline_deadline():\n    @task\n    def slow_load():\n        import time\n\n        time.sleep(20)\n\n    slow_load()\n\n\nbrewline_deadline()\n",
  "dags/brewline_first.py": "\"\"\"The first Brewline DAG: three TaskFlow tasks in a row, run once a day.\"\"\"\nimport json\nimport os\nfrom pathlib import Path\n\nimport pendulum\nfrom airflow.sdk import dag, task\n\nOUT = Path(os.environ.get(\"BREWLINE_OUT\", \"/tmp/brewline\"))\n\n\n@dag(\n    dag_id=\"brewline_first\",\n    schedule=\"@daily\",\n    start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"),\n    catchup=False,\n    tags=[\"brewline\"],\n)\ndef brewline_first():\n    @task\n    def extract(ds=None):\n        orders = [{\"order_id\": \"O-1\", \"total\": 12.5}, {\"order_id\": \"O-2\", \"total\": 8.0}]\n        print(f\"extracted {len(orders)} orders for {ds}\")\n        return orders\n\n    @task\n    def transform(orders):\n        total = sum(o[\"total\"] for o in orders)\n        print(f\"total is {total}\")\n        return {\"orders\": len(orders), \"total\": total}\n\n    @task\n    def load(summary, ds=None):\n        OUT.mkdir(parents=True, exist_ok=True)\n        path = OUT / f\"summary_{ds}.json\"\n        path.write_text(json.dumps(summary))\n        print(f\"wrote {path.name}\")\n\n    load(transform(extract()))\n\n\nbrewline_first()\n",
  "dags/brewline_flaky.py": "\"\"\"A task that fails twice and then works. The counter lives in a file, so it survives between tries.\"\"\"\nimport datetime\nimport os\n\nimport pendulum\nfrom airflow.sdk import dag, task\n\nCOUNT_FILE = os.environ.get(\"FLAKY_COUNT_FILE\", \"/tmp/brewline_flaky_count\")\n\n\n@dag(dag_id=\"brewline_flaky\", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"), catchup=False)\ndef brewline_flaky():\n    @task(retries=3, retry_delay=datetime.timedelta(seconds=2))\n    def extract():\n        tries = int(open(COUNT_FILE).read()) if os.path.exists(COUNT_FILE) else 0\n        open(COUNT_FILE, \"w\").write(str(tries + 1))\n        if tries < 2:\n            raise RuntimeError(f\"source not ready (try {tries + 1})\")\n        return \"rows=10\"\n\n    @task\n    def load(value):\n        print(\"loading\", value)\n\n    load(extract())\n\n\nbrewline_flaky()\n",
  "dags/brewline_incremental.py": "\"\"\"Two incremental loads of the same source. One reads only the day of the run. The other also reads the day before, so it catches rows that arrive late.\"\"\"\nimport os\nimport sqlite3\n\nimport pendulum\nfrom airflow.sdk import dag, task\n\nDB = os.environ.get(\"BREWLINE_DB\", \"/tmp/brewline.db\")\n\n\ndef make(dag_id, table, lookback_days):\n    @dag(dag_id=dag_id, schedule=\"@daily\", start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"), catchup=False)\n    def incremental():\n        @task\n        def load(ds=None):\n            with sqlite3.connect(DB) as con:\n                con.execute(f\"CREATE TABLE IF NOT EXISTS {table} (order_id TEXT PRIMARY KEY, updated_at TEXT, total REAL)\")\n                rows = con.execute(\n                    \"SELECT order_id, updated_at, total FROM source_orders WHERE updated_at >= date(?, ?) AND updated_at < date(?, '+1 day')\",\n                    (ds, f\"-{lookback_days} day\", ds),\n                ).fetchall()\n                con.executemany(\n                    f\"INSERT INTO {table} VALUES (?, ?, ?) ON CONFLICT(order_id) DO UPDATE SET updated_at = excluded.updated_at, total = excluded.total\",\n                    rows,\n                )\n            print(f\"read {len(rows)} source rows for {ds}\")\n\n        load()\n\n    return incremental()\n\n\nbrewline_incr_window = make(\"brewline_incr_window\", \"orders_window\", 0)\nbrewline_incr_lookback = make(\"brewline_incr_lookback\", \"orders_lookback\", 1)\n",
  "dags/brewline_load_append.py": "\"\"\"A load that appends. Run it twice for the same day and the day is in the table twice.\"\"\"\nimport os\nimport sqlite3\n\nimport pendulum\nfrom airflow.sdk import dag, task\n\nDB = os.environ.get(\"BREWLINE_DB\", \"/tmp/brewline.db\")\nORDERS = [(\"O-1\", 12.5), (\"O-2\", 8.0), (\"O-3\", 21.0)]\n\n\n@dag(dag_id=\"brewline_load_append\", schedule=\"@daily\", start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"), catchup=False)\ndef brewline_load_append():\n    @task\n    def load(ds=None):\n        with sqlite3.connect(DB) as con:\n            con.execute(\"CREATE TABLE IF NOT EXISTS orders_append (order_id TEXT, dt TEXT, total REAL)\")\n            con.executemany(\"INSERT INTO orders_append VALUES (?, ?, ?)\", [(i, ds, t) for i, t in ORDERS])\n        print(f\"inserted {len(ORDERS)} rows for {ds}\")\n\n    load()\n\n\nbrewline_load_append()\n",
  "dags/brewline_load_replace.py": "\"\"\"A load that replaces its own day: delete and insert in one transaction. Run it twice and the table is the same.\"\"\"\nimport os\nimport sqlite3\n\nimport pendulum\nfrom airflow.sdk import dag, task\n\nDB = os.environ.get(\"BREWLINE_DB\", \"/tmp/brewline.db\")\nORDERS = [(\"O-1\", 12.5), (\"O-2\", 8.0), (\"O-3\", 21.0)]\n\n\n@dag(dag_id=\"brewline_load_replace\", schedule=\"@daily\", start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"), catchup=False)\ndef brewline_load_replace():\n    @task\n    def load(ds=None):\n        with sqlite3.connect(DB) as con:  # one transaction: both statements commit together or not at all\n            con.execute(\"CREATE TABLE IF NOT EXISTS orders_replace (order_id TEXT, dt TEXT, total REAL)\")\n            con.execute(\"DELETE FROM orders_replace WHERE dt = ?\", (ds,))\n            con.executemany(\"INSERT INTO orders_replace VALUES (?, ?, ?)\", [(i, ds, t) for i, t in ORDERS])\n        print(f\"replaced the rows of {ds}: {len(ORDERS)}\")\n\n    load()\n\n\nbrewline_load_replace()\n",
  "dags/brewline_load_upsert.py": "\"\"\"A load that upserts on the order id. Run it twice and the table is the same, and rows of other days stay.\"\"\"\nimport os\nimport sqlite3\n\nimport pendulum\nfrom airflow.sdk import dag, task\n\nDB = os.environ.get(\"BREWLINE_DB\", \"/tmp/brewline.db\")\nORDERS = [(\"O-1\", 12.5), (\"O-2\", 8.0), (\"O-3\", 21.0)]\n\n\n@dag(dag_id=\"brewline_load_upsert\", schedule=\"@daily\", start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"), catchup=False)\ndef brewline_load_upsert():\n    @task\n    def load(ds=None):\n        with sqlite3.connect(DB) as con:\n            con.execute(\"CREATE TABLE IF NOT EXISTS orders_upsert (order_id TEXT PRIMARY KEY, dt TEXT, total REAL)\")\n            con.executemany(\n                \"INSERT INTO orders_upsert VALUES (?, ?, ?) ON CONFLICT(order_id) DO UPDATE SET dt = excluded.dt, total = excluded.total\",\n                [(f\"{ds}-{i}\", ds, t) for i, t in ORDERS],\n            )\n        print(f\"upserted {len(ORDERS)} rows for {ds}\")\n\n    load()\n\n\nbrewline_load_upsert()\n",
  "dags/brewline_loop.py": "\"\"\"Task loops (new in Airflow 3.4): a task group that repeats. One loop runs a fixed number of times, the other until a condition is met.\"\"\"\nfrom __future__ import annotations\n\nfrom airflow.sdk import LoopDecision, dag, task, task_group\n\n\n@dag(dag_id=\"brewline_loop_fixed\", schedule=None, catchup=False, tags=[\"brewline\"])\ndef loop_fixed():\n    @task_group\n    def accumulate():\n        @task\n        def increment(*, loop):\n            total = (0 if loop.index == 1 else loop.previous) + 1\n            print(f\"iteration {loop.index}: total is {total}\")\n            return total\n\n        increment()\n\n    accumulate.loop(max_iterations=3)\n\n\n@dag(dag_id=\"brewline_loop_until\", schedule=None, catchup=False, tags=[\"brewline\"])\ndef loop_until():\n    @task_group\n    def refine():\n        @task\n        def improve(*, loop):\n            estimate = 1.0 if loop.index == 1 else loop.previous[\"estimate\"]\n            return (estimate + 2.0 / estimate) / 2.0\n\n        @task\n        def evaluate(estimate, *, loop):\n            error = abs(estimate * estimate - 2.0)\n            print(f\"iteration {loop.index}: estimate {estimate:.6f}, error {error:.2g}\")\n            return {\"estimate\": estimate, \"error\": error}\n\n        evaluate(improve())\n\n    def accurate_enough(*, loop):\n        error = loop.result[\"error\"]\n        return LoopDecision(stop=error < 0.000001, reason=f\"error {error:.2g}\")\n\n    @task\n    def finished():\n        print(\"refinement finished\")\n\n    refine.loop(max_iterations=10, until=accurate_enough) >> finished()\n\n\nloop_fixed()\nloop_until()\n",
  "dags/brewline_mapping.py": "\"\"\"Dynamic task mapping: one task definition, one task instance for each store, decided when the DAG runs.\"\"\"\nimport pendulum\nfrom airflow.sdk import dag, task\n\n\n@dag(dag_id=\"brewline_mapping\", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"), catchup=False)\ndef brewline_mapping():\n    @task\n    def list_stores():\n        return [\"SG-01\", \"SG-02\", \"SG-03\", \"SG-04\", \"SG-05\"]\n\n    @task\n    def load_store(store, region):\n        print(f\"loading {store} in {region}\")\n        return {\"store\": store, \"orders\": len(store) * 10}\n\n    @task\n    def summarize(results):\n        results = list(results)\n        print(f\"loaded {len(results)} stores, {sum(r['orders'] for r in results)} orders\")\n\n    summarize(load_store.partial(region=\"sg\").expand(store=list_stores()))\n\n\nbrewline_mapping()\n",
  "dags/brewline_mapping_edge.py": "\"\"\"Dynamic task mapping, two edge cases: an empty list, and a list longer than max_map_length.\"\"\"\nimport pendulum\nfrom airflow.sdk import dag, task\n\n\n@dag(dag_id=\"brewline_map_empty\", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"), catchup=False)\ndef map_empty():\n    @task\n    def list_stores():\n        return []\n\n    @task\n    def load_store(store):\n        print(\"loading\", store)\n\n    @task(trigger_rule=\"all_done\")\n    def summarize():\n        print(\"summarize ran\")\n\n    load_store.expand(store=list_stores()) >> summarize()\n\n\n@dag(dag_id=\"brewline_map_big\", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"), catchup=False)\ndef map_big():\n    @task\n    def list_stores():\n        return list(range(1100))\n\n    @task\n    def load_store(store):\n        return store\n\n    load_store.expand(store=list_stores())\n\n\nmap_empty()\nmap_big()\n",
  "dags/brewline_nightly.py": "\"\"\"The Brewline nightly pipeline, written with classic operators.\n\nFive tasks in a row, then a notification that runs whatever happened. Airflow reads this file to build the DAG.\n\"\"\"\nfrom datetime import timedelta\n\nimport pendulum\nfrom airflow.sdk import DAG\nfrom airflow.providers.standard.operators.bash import BashOperator\nfrom airflow.providers.standard.operators.empty import EmptyOperator\nfrom airflow.providers.standard.operators.python import PythonOperator\n\n\ndef check_order_files(**context):\n    print(\"checking the files of\", context[\"ds\"])\n\n\nwith DAG(\n    dag_id=\"brewline_nightly\",\n    description=\"Nightly orders pipeline\",\n    schedule=\"0 2 * * *\",\n    start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"),\n    catchup=False,\n    default_args={\"owner\": \"data-team\", \"retries\": 2, \"retry_delay\": timedelta(minutes=5)},\n    tags=[\"brewline\", \"nightly\"],\n) as dag:\n    start = EmptyOperator(task_id=\"start\")\n    extract_orders = BashOperator(task_id=\"extract_orders\", bash_command=\"echo extracting {{ ds }}\")\n    validate_orders = PythonOperator(task_id=\"validate_orders\", python_callable=check_order_files)\n    load_orders = BashOperator(task_id=\"load_orders\", bash_command=\"echo loading {{ ds }}\")\n    build_marts = BashOperator(task_id=\"build_marts\", bash_command=\"echo building marts\")\n    notify = BashOperator(task_id=\"notify\", bash_command=\"echo done\", trigger_rule=\"all_done\")\n\n    start >> extract_orders >> validate_orders >> load_orders >> build_marts >> notify\n",
  "dags/brewline_pools.py": "\"\"\"Six tasks that each take three seconds, in a pool with two slots, and five tasks with different priorities in a pool with one slot.\"\"\"\nimport pendulum\nfrom airflow.sdk import DAG\nfrom airflow.providers.standard.operators.bash import BashOperator\n\nwith DAG(dag_id=\"brewline_pool_two_slots\", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"), catchup=False) as dag:\n    for n in range(1, 7):\n        BashOperator(task_id=f\"load_{n}\", bash_command=\"sleep 3\", pool=\"warehouse_pool\")\n\nwith DAG(dag_id=\"brewline_pool_priority\", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"), catchup=False) as dag2:\n    for n in range(1, 6):\n        BashOperator(task_id=f\"report_{n}\", bash_command=\"sleep 2\", pool=\"single_pool\", priority_weight=n)\n",
  "dags/brewline_retry_policy.py": "\"\"\"A retry policy: the exception decides what happens next, not only the number of retries.\"\"\"\nimport datetime\nimport os\n\nimport pendulum\nfrom airflow.sdk import ExceptionRetryPolicy, RetryAction, RetryRule, dag, task\n\nCOUNT_FILE = os.environ.get(\"BREWLINE_POLICY_COUNT\", \"/tmp/brewline_policy_count\")\n\npolicy = ExceptionRetryPolicy(\n    rules=[\n        RetryRule(exception=\"builtins.PermissionError\", action=RetryAction.FAIL, reason=\"A wrong credential does not fix itself\"),\n        RetryRule(exception=\"builtins.ConnectionError\", action=RetryAction.RETRY, retry_delay=datetime.timedelta(seconds=1), reason=\"The partner API may be restarting\"),\n    ]\n)\n\n\n@dag(dag_id=\"brewline_retry_policy\", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"), catchup=False)\ndef brewline_retry_policy():\n    @task(retries=3, retry_policy=policy)\n    def call_partner():\n        tries = int(open(COUNT_FILE).read()) if os.path.exists(COUNT_FILE) else 0\n        open(COUNT_FILE, \"w\").write(str(tries + 1))\n        if tries < 2:\n            raise ConnectionError(f\"partner API refused the connection (try {tries + 1})\")\n        return \"ok\"\n\n    @task(retries=3, retry_policy=policy)\n    def read_secret():\n        raise PermissionError(\"the API key was rejected\")\n\n    call_partner()\n    read_secret()\n\n\nbrewline_retry_policy()\n",
  "dags/brewline_secrets.py": "\"\"\"Connections and variables: where a task finds its secrets, and what the log shows.\"\"\"\nimport pendulum\nfrom airflow.sdk import BaseHook, Variable, dag, task\n\n\n@dag(dag_id=\"brewline_secrets\", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"), catchup=False)\ndef brewline_secrets():\n    @task\n    def use_secrets():\n        conn = BaseHook.get_connection(\"brewline_api\")\n        print(\"host:\", conn.host, \"login:\", conn.login)\n        print(\"password:\", conn.password)\n        print(\"region:\", Variable.get(\"brewline_region\"))\n        print(\"api_secret:\", Variable.get(\"brewline_api_secret\"))\n        print(\"warehouse host:\", BaseHook.get_connection(\"brewline_warehouse\").host)\n\n    use_secrets()\n\n\nbrewline_secrets()\n",
  "dags/brewline_templates.py": "\"\"\"Templates: Airflow fills in {{ ... }} in the fields of an operator just before the task runs.\"\"\"\nimport pendulum\nfrom airflow.sdk import DAG\nfrom airflow.providers.standard.operators.bash import BashOperator\n\nwith DAG(\n    dag_id=\"brewline_templates\",\n    schedule=\"0 2 * * *\",\n    start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"),\n    catchup=False,\n    params={\"region\": \"sg\"},\n) as dag:\n    dates = BashOperator(\n        task_id=\"dates\",\n        bash_command=\"echo ds={{ ds }} nodash={{ ds_nodash }} logical_date={{ logical_date }} start={{ data_interval_start }} end={{ data_interval_end }}\",\n    )\n    partition_path = BashOperator(\n        task_id=\"partition_path\",\n        bash_command=\"echo s3://brewline-lake/raw/orders/dt={{ ds }}/region={{ params.region }}/\",\n    )\n    previous_day = BashOperator(task_id=\"previous_day\", bash_command=\"echo {{ macros.ds_add(ds, -1) }}\")\n    dates >> partition_path >> previous_day\n",
  "dags/brewline_timeout.py": "\"\"\"A task that takes longer than its execution_timeout.\"\"\"\nimport datetime\nimport time\n\nimport pendulum\nfrom airflow.sdk import dag, task\n\n\n@dag(dag_id=\"brewline_timeout\", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"), catchup=False)\ndef brewline_timeout():\n    @task(execution_timeout=datetime.timedelta(seconds=3), retries=0)\n    def slow_export():\n        time.sleep(10)\n\n    slow_export()\n\n\nbrewline_timeout()\n",
  "dags/brewline_waiting.py": "\"\"\"Four sensors wait for a partner file, in three ways. All of them use a pool with two slots.\n\npoke        the sensor keeps its slot for the whole wait and checks every poke_interval seconds\nreschedule  the sensor gives its slot back between checks\ndeferrable  the sensor hands the wait to the triggerer and holds no slot at all\n\"\"\"\nimport os\n\nimport pendulum\nfrom airflow.sdk import DAG\nfrom airflow.providers.standard.sensors.filesystem import FileSensor\nfrom airflow.providers.standard.sensors.python import PythonSensor\n\nWATCH_DIR = os.environ.get(\"BREWLINE_WATCH\", \"/tmp/brewline_watch\")\n\n\ndef file_arrived(path):\n    return os.path.exists(path)\n\n\nfor mode in (\"poke\", \"reschedule\", \"deferrable\"):\n    with DAG(\n        dag_id=f\"brewline_wait_{mode}\",\n        schedule=None,\n        start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"),\n        catchup=False,\n    ) as dag:\n        for n in range(1, 5):\n            path = f\"{WATCH_DIR}/{mode}_partner_{n}.csv\"\n            if mode == \"deferrable\":\n                FileSensor(task_id=f\"wait_{n}\", filepath=path, deferrable=True, poke_interval=2, pool=\"partner_pool\")\n            else:\n                PythonSensor(\n                    task_id=f\"wait_{n}\",\n                    python_callable=file_arrived,\n                    op_args=[path],\n                    mode=mode,\n                    poke_interval=2,\n                    timeout=60,\n                    pool=\"partner_pool\",\n                )\n    globals()[dag.dag_id] = dag\n",
  "dags/brewline_xcom.py": "\"\"\"XCom: a return value is pushed under the key return_value. A task can push other keys too.\"\"\"\nimport pendulum\nfrom airflow.sdk import dag, task, get_current_context\n\n\n@dag(dag_id=\"brewline_xcom\", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"), catchup=False)\ndef brewline_xcom():\n    @task\n    def count_orders():\n        return 3\n\n    @task(multiple_outputs=True)\n    def summarize():\n        return {\"orders\": 3, \"revenue\": 41.5}\n\n    @task\n    def push_extra():\n        ti = get_current_context()[\"ti\"]\n        ti.xcom_push(key=\"source_file\", value=\"orders-2026-03-14.json\")\n\n    @task\n    def report(n, summary):\n        ti = get_current_context()[\"ti\"]\n        name = ti.xcom_pull(task_ids=\"push_extra\", key=\"source_file\")\n        print(f\"{n} orders, revenue {summary['revenue']}, from {name}\")\n\n    n = count_orders()\n    s = summarize()\n    p = push_extra()\n    report(n, s) << p\n\n\nbrewline_xcom()\n",
  "dags/brewline_xcom_size.py": "\"\"\"How big can an XCom be? Four tasks return strings of growing size.\"\"\"\nimport pendulum\nfrom airflow.sdk import dag, task\n\nSIZES = {\"1 KB\": 1_000, \"100 KB\": 100_000, \"1 MB\": 1_000_000, \"10 MB\": 10_000_000}\n\n\n@dag(dag_id=\"brewline_xcom_size\", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"), catchup=False)\ndef xcom_size():\n    for label, n in SIZES.items():\n        @task(task_id=\"return_\" + label.replace(\" \", \"_\").lower())\n        def make(n=n):\n            return \"x\" * n\n\n        make()\n\n\nxcom_size()\n",
  "dags_broken/broken_airflow2.py": "\"\"\"A DAG written for Airflow 2: schedule_interval was removed in Airflow 3.\"\"\"\nimport pendulum\nfrom airflow.sdk import DAG\nfrom airflow.providers.standard.operators.empty import EmptyOperator\n\nwith DAG(dag_id=\"broken_airflow2\", schedule_interval=\"@daily\", start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\")) as dag:\n    EmptyOperator(task_id=\"start\")\n",
  "dags_broken/broken_cycle.py": "\"\"\"A DAG whose tasks wait for each other in a circle.\"\"\"\nimport pendulum\nfrom airflow.sdk import DAG\nfrom airflow.providers.standard.operators.empty import EmptyOperator\n\nwith DAG(dag_id=\"broken_cycle\", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\")) as dag:\n    extract = EmptyOperator(task_id=\"extract\")\n    load = EmptyOperator(task_id=\"load\")\n    check = EmptyOperator(task_id=\"check\")\n    extract >> load >> check >> extract\n",
  "dags_broken/broken_duplicate.py": "\"\"\"Two tasks with the same task_id.\"\"\"\nimport pendulum\nfrom airflow.sdk import DAG\nfrom airflow.providers.standard.operators.empty import EmptyOperator\n\nwith DAG(dag_id=\"broken_duplicate\", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\")) as dag:\n    EmptyOperator(task_id=\"load\")\n    EmptyOperator(task_id=\"load\")\n",
  "dags_broken/broken_import.py": "\"\"\"A DAG file that cannot be imported: it needs a module that is not installed.\"\"\"\nimport pendulum\nfrom airflow.sdk import DAG\nfrom airflow.providers.standard.operators.empty import EmptyOperator\n\nimport brewline_utils  # noqa: F401  (the module lives in another repository and is not installed here)\n\nwith DAG(dag_id=\"broken_import\", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\")) as dag:\n    EmptyOperator(task_id=\"start\")\n",
  "dags_broken/old_style.py": "\"\"\"A DAG written for Airflow 2.x. It still imports in 3.4.0, with warnings, and ruff can find what to change before Airflow 4.\"\"\"\nfrom datetime import datetime\n\nfrom airflow import DAG\nfrom airflow.decorators import task\nfrom airflow.models import Variable\nfrom airflow.operators.bash import BashOperator\nfrom airflow.operators.python import PythonOperator\nfrom airflow.utils.dates import days_ago\nfrom airflow.utils.trigger_rule import TriggerRule\n\n\ndef load(**context):\n    run_day = context[\"execution_date\"]\n    print(\"loading\", run_day, Variable.get(\"region\"))\n\n\nwith DAG(\n    dag_id=\"old_style\",\n    schedule_interval=\"@daily\",\n    start_date=days_ago(2),\n    catchup=False,\n) as dag:\n    extract = BashOperator(task_id=\"extract\", bash_command=\"echo {{ execution_date }}\")\n    load_orders = PythonOperator(task_id=\"load\", python_callable=load, provide_context=True, trigger_rule=TriggerRule.ALL_SUCCESS)\n    extract >> load_orders\n",
  "dags_broken/toplevel_slow.py": "\"\"\"A DAG file that does slow work when it is imported, not when its task runs. Airflow imports every DAG file again and again.\"\"\"\nimport time\n\nimport pendulum\nfrom airflow.sdk import DAG\nfrom airflow.providers.standard.operators.empty import EmptyOperator\n\ntime.sleep(2)  # stands in for a call to an API, a database or a big import at the top of the file\n\nwith DAG(dag_id=\"toplevel_slow\", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\")) as dag:\n    EmptyOperator(task_id=\"start\")\n",
  "gen/trigger_rules_gen.py": "\"\"\"Generates one DAG for each trigger rule. Every DAG has ten children, one for each mix of three parents that succeeded, failed or were skipped.\n\nThe recorder runs each DAG with dag.test() and reads the state of every child. The recording shows what Airflow does, rule by rule.\n\"\"\"\nimport itertools\n\nimport pendulum\nfrom airflow.sdk import DAG, task\nfrom airflow.sdk.exceptions import AirflowSkipException\nfrom airflow.task.trigger_rule import TriggerRule\n\nMIXES = [(3, 0, 0), (2, 1, 0), (2, 0, 1), (1, 2, 0), (1, 1, 1), (1, 0, 2), (0, 3, 0), (0, 2, 1), (0, 1, 2), (0, 0, 3)]\n\n\n@task(retries=0)\ndef succeed():\n    return \"ok\"\n\n\n@task(retries=0)\ndef fail():\n    raise RuntimeError(\"boom\")\n\n\n@task(retries=0)\ndef skip():\n    raise AirflowSkipException(\"not needed\")\n\n\nfor rule in TriggerRule:\n    with DAG(dag_id=f\"trigger_rule_{rule.value}\", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\")) as dag:\n        for s, f, k in MIXES:\n            parents = [succeed.override(task_id=f\"s{i}_{s}{f}{k}\")() for i in range(s)]\n            parents += [fail.override(task_id=f\"f{i}_{s}{f}{k}\")() for i in range(f)]\n            parents += [skip.override(task_id=f\"k{i}_{s}{f}{k}\")() for i in range(k)]\n\n            @task(retries=0, trigger_rule=rule.value, task_id=f\"child_{s}{f}{k}\")\n            def child():\n                return \"ran\"\n\n            parents >> child()\n    globals()[dag.dag_id] = dag\n",
  "project/broken/dags/brewline_orders.py": "import os\nfrom pathlib import Path\n\nimport pendulum\nfrom airflow.sdk import dag, task\n\nfrom orders_logic import normalize_order, revenue_cents\n\nOUT = Path(os.environ.get(\"BREWLINE_OUT\", \"/tmp/brewline\"))\nRAW = [{\"id\": \" o-1 \", \"store\": \"SG-01\", \"total\": \"12.50\"}, {\"id\": \"o-2\", \"store\": \"SG-02\", \"total\": \"8.00\"}]\n\n\n@dag(dag_id=\"brewline_orders\", schedule=\"0 2 * * *\", start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"), catchup=False)\ndef brewline_orders():\n    @task\n    def transform():\n        return [normalize_order(r) for r in RAW]\n\n    @task\n    def load(rows, ds=None):\n        OUT.mkdir(parents=True, exist_ok=True)\n        (OUT / f\"revenue_{ds}.txt\").write_text(str(revenue_cents(rows)))\n\n    load(transform())\n\n\nbrewline_orders()\n",
  "project/broken/dags/orders_logic.py": "def normalize_order(raw):\n    return {\n        \"order_id\": raw[\"id\"].strip().upper(),\n        \"store\": raw[\"store\"].strip(),\n        \"total_cents\": int(float(raw[\"total\"]) * 100),\n    }\n\n\ndef revenue_cents(rows):\n    return sum(r[\"total_cents\"] for r in rows)\n",
  "project/broken/tests/conftest.py": "import sys\nfrom pathlib import Path\n\nDAGS = Path(__file__).resolve().parents[1] / \"dags\"\nsys.path.insert(0, str(DAGS))\n",
  "project/broken/tests/test_dag_integrity.py": "\"\"\"Tests that every DAG file of the project follows the rules of the team. They run in a second, with no Airflow services.\"\"\"\nfrom pathlib import Path\n\nimport pytest\nfrom airflow.dag_processing.dagbag import DagBag\n\nDAGS = Path(__file__).resolve().parents[1] / \"dags\"\n\n\n@pytest.fixture(scope=\"session\")\ndef dagbag():\n    return DagBag(dag_folder=str(DAGS))\n\n\ndef test_no_import_errors(dagbag):\n    assert dagbag.import_errors == {}\n\n\ndef test_every_dag_has_tags_and_an_owner(dagbag):\n    for dag_id, dag in dagbag.dags.items():\n        assert dag.tags, f\"{dag_id} has no tags\"\n        assert all(t.owner != \"airflow\" for t in dag.tasks), f\"{dag_id} still has the default owner\"\n\n\ndef test_every_task_retries(dagbag):\n    for dag_id, dag in dagbag.dags.items():\n        for task in dag.tasks:\n            assert task.retries >= 1, f\"{dag_id}.{task.task_id} does not retry\"\n\n\ndef test_the_dag_runs(dagbag, tmp_path, monkeypatch):\n    monkeypatch.setenv(\"BREWLINE_OUT\", str(tmp_path))\n    import pendulum\n\n    run = dagbag.dags[\"brewline_orders\"].test(logical_date=pendulum.datetime(2026, 3, 14, tz=\"UTC\"))\n    assert run.state == \"success\"\n",
  "project/broken/tests/test_orders.py": "from orders_logic import normalize_order, revenue_cents\n\n\ndef test_normalize_order_cleans_the_id_and_uses_cents():\n    row = normalize_order({\"id\": \" o-1 \", \"store\": \"SG-01\", \"total\": \"19.99\"})\n    assert row == {\"order_id\": \"O-1\", \"store\": \"SG-01\", \"total_cents\": 1999}\n\n\ndef test_revenue_adds_cents():\n    assert revenue_cents([{\"total_cents\": 1250}, {\"total_cents\": 800}]) == 2050\n",
  "project/good/dags/brewline_orders.py": "\"\"\"The orders DAG of the Brewline project: its rules live in orders_logic.py, and its tests live in tests/.\"\"\"\nimport os\nfrom pathlib import Path\n\nimport pendulum\nfrom airflow.sdk import dag, task\n\nfrom orders_logic import normalize_order, revenue_cents\n\nOUT = Path(os.environ.get(\"BREWLINE_OUT\", \"/tmp/brewline\"))\nRAW = [{\"id\": \" o-1 \", \"store\": \"SG-01\", \"total\": \"12.50\"}, {\"id\": \"o-2\", \"store\": \"SG-02\", \"total\": \"8.00\"}]\n\n\n@dag(\n    dag_id=\"brewline_orders\",\n    schedule=\"0 2 * * *\",\n    start_date=pendulum.datetime(2026, 3, 1, tz=\"UTC\"),\n    catchup=False,\n    default_args={\"owner\": \"data-team\", \"retries\": 2},\n    tags=[\"brewline\", \"orders\"],\n)\ndef brewline_orders():\n    @task\n    def transform():\n        return [normalize_order(r) for r in RAW]\n\n    @task\n    def load(rows, ds=None):\n        OUT.mkdir(parents=True, exist_ok=True)\n        (OUT / f\"revenue_{ds}.txt\").write_text(str(revenue_cents(rows)))\n\n    load(transform())\n\n\nbrewline_orders()\n",
  "project/good/dags/orders_logic.py": "\"\"\"The rules of the orders pipeline as plain Python, so that a test can call them without Airflow.\"\"\"\n\n\ndef normalize_order(raw):\n    \"\"\"One raw order from the shop becomes one clean row. Amounts are in cents, so that no float is stored.\"\"\"\n    return {\n        \"order_id\": raw[\"id\"].strip().upper(),\n        \"store\": raw[\"store\"].strip(),\n        \"total_cents\": round(float(raw[\"total\"]) * 100),\n    }\n\n\ndef revenue_cents(rows):\n    return sum(r[\"total_cents\"] for r in rows)\n",
  "project/good/tests/conftest.py": "import sys\nfrom pathlib import Path\n\nDAGS = Path(__file__).resolve().parents[1] / \"dags\"\nsys.path.insert(0, str(DAGS))\n",
  "project/good/tests/test_dag_integrity.py": "\"\"\"Tests that every DAG file of the project follows the rules of the team. They run in a second, with no Airflow services.\"\"\"\nfrom pathlib import Path\n\nimport pytest\nfrom airflow.dag_processing.dagbag import DagBag\n\nDAGS = Path(__file__).resolve().parents[1] / \"dags\"\n\n\n@pytest.fixture(scope=\"session\")\ndef dagbag():\n    return DagBag(dag_folder=str(DAGS))\n\n\ndef test_no_import_errors(dagbag):\n    assert dagbag.import_errors == {}\n\n\ndef test_every_dag_has_tags_and_an_owner(dagbag):\n    for dag_id, dag in dagbag.dags.items():\n        assert dag.tags, f\"{dag_id} has no tags\"\n        assert all(t.owner != \"airflow\" for t in dag.tasks), f\"{dag_id} still has the default owner\"\n\n\ndef test_every_task_retries(dagbag):\n    for dag_id, dag in dagbag.dags.items():\n        for task in dag.tasks:\n            assert task.retries >= 1, f\"{dag_id}.{task.task_id} does not retry\"\n\n\ndef test_the_dag_runs(dagbag, tmp_path, monkeypatch):\n    monkeypatch.setenv(\"BREWLINE_OUT\", str(tmp_path))\n    import pendulum\n\n    run = dagbag.dags[\"brewline_orders\"].test(logical_date=pendulum.datetime(2026, 3, 14, tz=\"UTC\"))\n    assert run.state == \"success\"\n",
  "project/good/tests/test_orders.py": "from orders_logic import normalize_order, revenue_cents\n\n\ndef test_normalize_order_cleans_the_id_and_uses_cents():\n    row = normalize_order({\"id\": \" o-1 \", \"store\": \"SG-01\", \"total\": \"12.50\"})\n    assert row == {\"order_id\": \"O-1\", \"store\": \"SG-01\", \"total_cents\": 1250}\n\n\ndef test_revenue_adds_cents():\n    assert revenue_cents([{\"total_cents\": 1250}, {\"total_cents\": 800}]) == 2050\n"
 },
 "meta": {
  "apache-airflow": "3.4.0",
  "apache-airflow-core": "3.4.0",
  "apache-airflow-providers-common-sql": "2.4.0",
  "apache-airflow-providers-http": "6.3.0",
  "apache-airflow-providers-smtp": "3.2.0",
  "apache-airflow-providers-sqlite": "4.3.4",
  "apache-airflow-providers-standard": "1.21.0",
  "apache-airflow-task-sdk": "1.4.0",
  "croniter": "6.2.4",
  "fastapi": "0.162.0",
  "note": "Recorded by airflow/verify/capture_af.py with Apache Airflow 3.4.0 on one machine. Nothing ran on a managed service.",
  "pendulum": "3.3.0",
  "platform": "Linux",
  "pytest": "9.2.0",
  "python": "3.12.3",
  "recorded_on": "2026-03-14",
  "ruff": "0.17.4",
  "sqlalchemy": "2.0.55",
  "uvicorn": "0.54.0"
 },
 "tables": {
  "af.config": {
   "cols": [
    "setting",
    "default value"
   ],
   "rows": [
    [
     "core.executor",
     "LocalExecutor"
    ],
    [
     "core.parallelism",
     "32"
    ],
    [
     "core.max_active_tasks_per_dag",
     "16"
    ],
    [
     "core.max_active_runs_per_dag",
     "16"
    ],
    [
     "core.max_map_length",
     "1024"
    ],
    [
     "core.default_task_retries",
     "0"
    ],
    [
     "core.dags_are_paused_at_creation",
     "True"
    ],
    [
     "core.default_timezone",
     "utc"
    ],
    [
     "core.dagbag_import_timeout",
     "30.0"
    ],
    [
     "core.dag_file_processor_timeout",
     "50"
    ],
    [
     "core.load_examples",
     "False"
    ],
    [
     "core.dag_run_conf_overrides_params",
     "True"
    ],
    [
     "core.default_pool_task_slot_count",
     "128"
    ],
    [
     "scheduler.catchup_by_default",
     "False"
    ],
    [
     "scheduler.create_cron_data_intervals",
     "False"
    ],
    [
     "scheduler.max_tis_per_query",
     "16"
    ],
    [
     "scheduler.task_instance_heartbeat_timeout",
     "300"
    ],
    [
     "scheduler.scheduler_idle_sleep_time",
     "1"
    ],
    [
     "scheduler.max_dagruns_to_create_per_loop",
     "10"
    ],
    [
     "scheduler.job_heartbeat_sec",
     "5"
    ],
    [
     "scheduler.batch_asset_events",
     "False"
    ],
    [
     "dag_processor.refresh_interval",
     "300"
    ],
    [
     "dag_processor.min_file_process_interval",
     "30"
    ],
    [
     "dag_processor.parsing_processes",
     "2"
    ],
    [
     "dag_processor.dag_file_processor_timeout",
     "50"
    ],
    [
     "triggerer.capacity",
     "1000"
    ],
    [
     "api.port",
     "8080"
    ],
    [
     "logging.remote_logging",
     "False"
    ],
    [
     "secrets.backend",
     "(empty)"
    ],
    [
     "workers.execution_api_retries",
     "5"
    ],
    [
     "database.max_db_retries",
     "3"
    ],
    [
     "metrics.statsd_on",
     "False"
    ],
    [
     "core.default_task_retry_delay",
     "300"
    ],
    [
     "core.max_task_retry_delay",
     "86400"
    ],
    [
     "core.default_task_execution_timeout",
     "(empty)"
    ],
    [
     "core.xcom_backend",
     "airflow.sdk.execution_time.xcom.BaseXCom"
    ],
    [
     "core.max_templated_field_length",
     "4096"
    ],
    [
     "core.default_task_weight_rule",
     "downstream"
    ],
    [
     "core.min_serialized_dag_update_interval",
     "30"
    ],
    [
     "core.dag_ignore_file_syntax",
     "glob"
    ],
    [
     "core.dag_discovery_safe_mode",
     "True"
    ],
    [
     "dag_processor.bundle_refresh_check_interval",
     "5"
    ],
    [
     "dag_processor.stale_dag_threshold",
     "50"
    ],
    [
     "scheduler.orphaned_tasks_check_interval",
     "300.0"
    ],
    [
     "scheduler.task_queued_timeout",
     "600.0"
    ],
    [
     "scheduler.max_dagruns_per_loop_to_schedule",
     "20"
    ]
   ]
  },
  "af.details": {
   "cols": [
    "property",
    "value"
   ],
   "rows": [
    [
     "dag_id",
     "brewline_nightly"
    ],
    [
     "is_paused",
     "True"
    ],
    [
     "bundle_name",
     "dags-folder"
    ],
    [
     "relative_fileloc",
     "brewline_nightly.py"
    ],
    [
     "timetable_summary",
     "0 2 * * *"
    ],
    [
     "timetable_description",
     "At 02:00"
    ],
    [
     "timetable_periodic",
     "True"
    ],
    [
     "max_active_tasks",
     "16"
    ],
    [
     "max_active_runs",
     "16"
    ],
    [
     "max_consecutive_failed_dag_runs",
     "0"
    ],
    [
     "has_task_concurrency_limits",
     "False"
    ],
    [
     "has_import_errors",
     "False"
    ]
   ]
  },
  "af.first_run_ti": {
   "cols": [
    "task_id",
    "map_index",
    "state",
    "try_number",
    "operator"
   ],
   "rows": [
    [
     "extract",
     "-1",
     "success",
     "1",
     "_PythonDecoratedOperator"
    ],
    [
     "transform",
     "-1",
     "success",
     "1",
     "_PythonDecoratedOperator"
    ],
    [
     "load",
     "-1",
     "success",
     "1",
     "_PythonDecoratedOperator"
    ]
   ]
  },
  "af.first_run_xcom": {
   "cols": [
    "task_id",
    "key",
    "value"
   ],
   "rows": [
    [
     "extract",
     "return_value",
     "[{\"order_id\": \"O-1\", \"total\": 12.5}, {\"order_id\": \"O-2\", \"total\": 8.0}]"
    ],
    [
     "transform",
     "return_value",
     "{\"orders\": 2, \"total\": 20.5}"
    ]
   ]
  },
  "af.jobs": {
   "cols": [
    "job_type",
    "state"
   ],
   "rows": [
    [
     "DagProcessorJob",
     "running"
    ],
    [
     "SchedulerJob",
     "running"
    ],
    [
     "TriggererJob",
     "running"
    ]
   ]
  },
  "af.loop_fixed_ti": {
   "cols": [
    "task_id",
    "map_index",
    "state",
    "try_number",
    "operator"
   ],
   "rows": [
    [
     "accumulate.increment",
     "1",
     "success",
     "1",
     "_PythonDecoratedOperator"
    ],
    [
     "accumulate.__loop_gate",
     "1",
     "success",
     "1",
     "LoopGateOperator"
    ],
    [
     "accumulate.increment",
     "2",
     "success",
     "1",
     "_PythonDecoratedOperator"
    ],
    [
     "accumulate.__loop_gate",
     "2",
     "success",
     "1",
     "LoopGateOperator"
    ],
    [
     "accumulate.increment",
     "3",
     "success",
     "1",
     "_PythonDecoratedOperator"
    ],
    [
     "accumulate.__loop_gate",
     "3",
     "success",
     "1",
     "LoopGateOperator"
    ]
   ]
  },
  "af.loop_until_ti": {
   "cols": [
    "task_id",
    "map_index",
    "state",
    "try_number",
    "operator"
   ],
   "rows": [
    [
     "refine.improve",
     "1",
     "success",
     "1",
     "_PythonDecoratedOperator"
    ],
    [
     "refine.evaluate",
     "1",
     "success",
     "1",
     "_PythonDecoratedOperator"
    ],
    [
     "refine.accurate_enough",
     "1",
     "success",
     "1",
     "LoopGateOperator"
    ],
    [
     "refine.improve",
     "2",
     "success",
     "1",
     "_PythonDecoratedOperator"
    ],
    [
     "refine.evaluate",
     "2",
     "success",
     "1",
     "_PythonDecoratedOperator"
    ],
    [
     "refine.accurate_enough",
     "2",
     "success",
     "1",
     "LoopGateOperator"
    ],
    [
     "refine.improve",
     "3",
     "success",
     "1",
     "_PythonDecoratedOperator"
    ],
    [
     "refine.evaluate",
     "3",
     "success",
     "1",
     "_PythonDecoratedOperator"
    ],
    [
     "refine.accurate_enough",
     "3",
     "success",
     "1",
     "LoopGateOperator"
    ],
    [
     "refine.improve",
     "4",
     "success",
     "1",
     "_PythonDecoratedOperator"
    ],
    [
     "refine.evaluate",
     "4",
     "success",
     "1",
     "_PythonDecoratedOperator"
    ],
    [
     "refine.accurate_enough",
     "4",
     "success",
     "1",
     "LoopGateOperator"
    ],
    [
     "finished",
     "-1",
     "success",
     "1",
     "_PythonDecoratedOperator"
    ]
   ]
  },
  "af.mapping_ti": {
   "cols": [
    "task_id",
    "map_index",
    "state",
    "try_number"
   ],
   "rows": [
    [
     "list_stores",
     "-1",
     "success",
     "1"
    ],
    [
     "load_store",
     "0",
     "success",
     "1"
    ],
    [
     "load_store",
     "1",
     "success",
     "1"
    ],
    [
     "load_store",
     "2",
     "success",
     "1"
    ],
    [
     "load_store",
     "3",
     "success",
     "1"
    ],
    [
     "load_store",
     "4",
     "success",
     "1"
    ],
    [
     "summarize",
     "-1",
     "success",
     "1"
    ]
   ]
  },
  "af.mapping_xcom": {
   "cols": [
    "task_id",
    "map_index",
    "key",
    "value"
   ],
   "rows": [
    [
     "list_stores",
     "-1",
     "return_value",
     "[\"SG-01\", \"SG-02\", \"SG-03\", \"SG-04\", \"SG-05\"]"
    ],
    [
     "load_store",
     "0",
     "return_value",
     "{\"store\": \"SG-01\", \"orders\": 50}"
    ],
    [
     "load_store",
     "1",
     "return_value",
     "{\"store\": \"SG-02\", \"orders\": 50}"
    ],
    [
     "load_store",
     "2",
     "return_value",
     "{\"store\": \"SG-03\", \"orders\": 50}"
    ],
    [
     "load_store",
     "3",
     "return_value",
     "{\"store\": \"SG-04\", \"orders\": 50}"
    ],
    [
     "load_store",
     "4",
     "return_value",
     "{\"store\": \"SG-05\", \"orders\": 50}"
    ]
   ]
  },
  "af.nightly_ti": {
   "cols": [
    "task_id",
    "map_index",
    "state",
    "try_number",
    "operator"
   ],
   "rows": [
    [
     "start",
     "-1",
     "success",
     "1",
     "EmptyOperator"
    ],
    [
     "extract_orders",
     "-1",
     "success",
     "1",
     "BashOperator"
    ],
    [
     "validate_orders",
     "-1",
     "success",
     "1",
     "PythonOperator"
    ],
    [
     "load_orders",
     "-1",
     "success",
     "1",
     "BashOperator"
    ],
    [
     "build_marts",
     "-1",
     "success",
     "1",
     "BashOperator"
    ],
    [
     "notify",
     "-1",
     "success",
     "1",
     "BashOperator"
    ]
   ]
  },
  "af.providers": {
   "cols": [
    "package",
    "version"
   ],
   "rows": [
    [
     "apache-airflow-providers-common-compat",
     "1.23.0"
    ],
    [
     "apache-airflow-providers-common-io",
     "1.11.0"
    ],
    [
     "apache-airflow-providers-common-sql",
     "2.4.0"
    ],
    [
     "apache-airflow-providers-http",
     "6.3.0"
    ],
    [
     "apache-airflow-providers-smtp",
     "3.2.0"
    ],
    [
     "apache-airflow-providers-sqlite",
     "4.3.4"
    ],
    [
     "apache-airflow-providers-standard",
     "1.21.0"
    ]
   ]
  },
  "af.retries_rows": {
   "cols": [
    "try_number",
    "state",
    "working_set",
    "archived_reason"
   ],
   "rows": [
    [
     "1",
     "failed",
     "NULL",
     "retry"
    ],
    [
     "2",
     "failed",
     "NULL",
     "retry"
    ],
    [
     "3",
     "success",
     "1",
     "NULL"
    ]
   ]
  },
  "af.retry_policy_rows": {
   "cols": [
    "task_id",
    "try_number",
    "state",
    "working_set",
    "archived_reason",
    "retry_reason"
   ],
   "rows": [
    [
     "call_partner",
     "1",
     "failed",
     "NULL",
     "retry",
     "The partner API may be restarting"
    ],
    [
     "call_partner",
     "2",
     "failed",
     "NULL",
     "retry",
     "The partner API may be restarting"
    ],
    [
     "call_partner",
     "3",
     "success",
     "1",
     "NULL",
     "NULL"
    ],
    [
     "read_secret",
     "1",
     "failed",
     "1",
     "NULL",
     "A wrong credential does not fix itself"
    ]
   ]
  },
  "af.xcom": {
   "cols": [
    "task_id",
    "key",
    "value"
   ],
   "rows": [
    [
     "count_orders",
     "return_value",
     "3"
    ],
    [
     "push_extra",
     "source_file",
     "\"orders-2026-03-14.json\""
    ],
    [
     "summarize",
     "orders",
     "3"
    ],
    [
     "summarize",
     "return_value",
     "{\"orders\": 3, \"revenue\": 41.5}"
    ],
    [
     "summarize",
     "revenue",
     "41.5"
    ]
   ]
  }
 },
 "text": {
  "af.assets_list": "name          | uri                           | group | extra\n==============+===============================+=======+======\ncustomers_raw | brewline://lake/raw/customers | asset | {}   \norders_raw    | brewline://lake/raw/orders    | asset | {}",
  "af.backfill_create": "[info] creating dag run\n[info] Created backfill Dag run.\n[info] creating dag run\n[info] Created backfill Dag run.\n[info] creating dag run\n[info] Created backfill Dag run.",
  "af.backfill_dry_run": "Performing dry run of backfill.\nPrinting params:\n    - dag_id = brewline_backfill_demo\n    - from_date = 2026-03-05 00:00:00+00:00\n    - to_date = 2026-03-07 23:59:59+00:00\n    - max_active_runs = None\n    - reverse = False\n    - dag_run_conf = None\n    - reprocess_behavior = None\n    - run_on_latest_version = True\nRuns to be attempted:\n+---------------------------+-----------------+------------------+\n| logical_date              | partition_key   | partition_date   |\n+===========================+=================+==================+\n| 2026-03-05 00:00:00+00:00 |                 |                  |\n+---------------------------+-----------------+------------------+\n| 2026-03-06 00:00:00+00:00 |                 |                  |\n+---------------------------+-----------------+------------------+\n| 2026-03-07 00:00:00+00:00 |                 |                  |\n+---------------------------+-----------------+------------------+",
  "af.cheat_sheet": "Miscellaneous commands                                                                                 \nairflow api-server                             | Start an Airflow API server instance                  \nairflow cheat-sheet                            | Display cheat sheet                                   \nairflow dag-processor                          | Start a dag processor instance                        \nairflow info                                   | Show information about current Airflow and environment\nairflow kerberos                               | Start a kerberos ticket renewer                       \nairflow plugins                                | Dump information about loaded plugins                 \nairflow rotate-fernet-key                      | Rotate encrypted connection credentials and variables \nairflow scheduler                              | Start a scheduler instance                            \nairflow standalone                             | Run an all-in-one copy of Airflow                     \nairflow triggerer                              | Start a triggerer instance                            \nairflow version                                | Show the version                                      \n                                                                                                       \nManage assets                                                        \nairflow assets details                         | Show asset details  \nairflow assets list                            | List assets         \nairflow assets materialize                     | Materialize an asset\n                                                                     \nManage backfills                                                             \nairflow backfill create                        | Create a backfill for a dag.\n                                                                             \nView configuration                                                                                                                           \nairflow config get-value                       | Print the value of the configuration                                                        \nairflow config lint                            | lint options for the configuration changes while migrating from Airflow 2.x to Airflow 3.0  \nairflow config list                            | List options for the configuration                                                          \nairflow config update                          | update options for the configuration changes while migrating from Airflow 2.x to Airflow 3.0\n                                                                                                                                             \nManage connections                                                                                         \nairflow connections add                        | Add a connection                                          \nairflow connections create-default-connections | Creates all the default connections from all the providers\nairflow connections delete                     | Delete a connection                                       \nairflow connections export                     | Export all connections                                    \nairflow connections get                        | Get a connection                                          \nairflow connections import                     | Import connections from a file                            \nairflow connections list                       | List connections                                          \nairflow connections test                       | Test a connection                                         \n                                                                                                           \nManage DAGs                                                                                                                                           \nairflow dags clear                             | Clear Dag runs selected by run_id, partition_key, or a partition_date window                         \nairflow dags delete                            | Delete all DB records related to the specified DAG                                                   ",
  "af.connections_list": "conn_id            | conn_type\n===================+==========\nbrewline_api       | generic  \nbrewline_warehouse | postgres \n                              \nWarning: This list only includes connections stored in the metadata database. `AIRFLOW_CONN_*` environment variables may also define connections -- including ones that override a database entry with \nthe same ID -- that will not appear here.",
  "af.db_check": "2026-11-12T13:23:23.192906Z [info     ] Connection successful.         [airflow.utils.db] loc=db.py:1579",
  "af.db_clean_dry_run": "Performing dry run for db cleanup.\nData prior to 2026-03-15 00:00:00+00:00 would be purged from tables ['xcom_v1', 'xcom_v2', 'task_reschedule', 'task_instance', 'task_state_store', 'deadline', 'dag_run'] with the following config:\ntable            | recency_column              | dag_id_column                            | keep_last | keep_last_filters           | keep_last_group_by\n=================+=============================+==========================================+===========+=============================+===================\nxcom_v1          | xcom_v1.timestamp           | xcom_v1.dag_id                           | False     | None                        | None\nxcom_v2          | xcom_v2.timestamp           | task_instance_id -> task_instance.dag_id | False     | None                        | None\ntask_reschedule  | task_reschedule.start_date  | ti_id -> task_instance.dag_id            | False     | None                        | None\ntask_instance    | task_instance.start_date    | task_instance.dag_id                     | False     | None                        | None\ntask_state_store | task_state_store.expires_at | task_state_store.dag_id                  | False     | None                        | None\ndeadline         | deadline.deadline_time      | dagrun_id -> dag_run.dag_id              | False     | None                        | None\ndag_run          | dag_run.start_date          | dag_run.dag_id                           | True      | ['run_type != :run_type_1'] | ['dag_id']\nPerforming dry run for table xcom_v1\nChecking table xcom_v1\nFound 0 rows meeting deletion criteria.\nPerforming dry run for table xcom_v2\nChecking table xcom_v2\nFound 46 rows meeting deletion criteria.\nPerforming dry run for table task_reschedule\nChecking table task_reschedule\nFound 18 rows meeting deletion criteria.\nPerforming dry run for table task_instance\nChecking table task_instance\nFound 90 rows meeting deletion criteria.\nPerforming dry run for table task_state_store\nChecking table task_state_store\nFound 0 rows meeting deletion criteria.\nPerforming dry run for table deadline\nChecking table deadline\nFound 1 rows meeting deletion criteria.\nPerforming dry run for table dag_run\nChecking table dag_run\nFound 36 rows meeting deletion criteria.",
  "af.deadline_log": "[info] Callback executed successfully\n[info] Workload finished\n[info] Received executor event with state success for callback <id>",
  "af.details_raw": "property_name                   | property_value                                                                                                                                                        \n================================+=======================================================================================================================================================================\ndag_id                          | brewline_nightly                                                                                                                                                      \ndag_display_name                | brewline_nightly                                                                                                                                                      \nis_paused                       | True                                                                                                                                                                  \nscheduling_state                | paused                                                                                                                                                                \nis_stale                        | False                                                                                                                                                                 \nlast_parsed_time                | 2026-11-12 13:06:29.866313+00:00                                                                                                                                      \nlast_parse_duration             | None                                                                                                                                                                  \nlast_expired                    | None                                                                                                                                                                  \nbundle_name                     | dags-folder                                                                                                                                                           \nbundle_version                  | None                                                                                                                                                                  \nrelative_fileloc                | brewline_nightly.py                                                                                                                                                   \nfileloc                         | /opt/airflow/dags/brewline_nightly.py                                                                                                                     \ndescription                     | Nightly orders pipeline                                                                                                                                               \ntimetable_summary               | 0 2 * * *                                                                                                                                                             \ntimetable_description           | At 02:00                                                                                                                                                              \ntimetable_partitioned           | False                                                                                                                                                                 \ntimetable_periodic              | True                                                                                                                                                                  \ntags                            | {'name': 'brewline', 'dag_id': 'brewline_nightly', 'dag_display_name': 'brewline_nightly'},{'name': 'nightly', 'dag_id': 'brewline_nightly', 'dag_display_name':      \n                                | 'brewline_nightly'}                                                                                                                                                   \nmax_active_tasks                | 16                                                                                                                                                                    \nmax_active_runs                 | 16                                                                                                                                                                    \nmax_consecutive_failed_dag_runs | 0                                                                                                                                                                     \nhas_task_concurrency_limits     | False                                                                                                                                                                 \nhas_import_errors               | False                                                                                                                                                                 \nnext_dagrun_logical_date        | 2026-11-12 02:00:00+00:00                                                                                                                                             \nnext_dagrun_data_interval_start | 2026-11-12 02:00:00+00:00                                                                                                                                             \nnext_dagrun_data_interval_end   | 2026-11-12 02:00:00+00:00                                                                                                                                             \nnext_dagrun_run_after           | 2026-11-12 02:00:00+00:00                                                                                                                                             \nallowed_run_types               | None                                                                                                                                                                  \nowners                          | data-team                                                                                                                                                             \nis_backfillable                 | True                                                                                                                                                                  \nfile_token                      | eyJidW5kbGVfbmFtZSI6ImRhZ3MtZm9sZGVyIiwicmVsYXRpdmVfZmlsZWxvYyI6ImJyZXdsaW5lX25pZ2h0bHkucHkifQ.k7z0-hdqjTK-cwMkKsfplG4g-LM                                            \n                                                                                                                                                                                                        ",
  "af.first_run": "[info] [DAG TEST] starting task_id=extract map_index=-1\n[info] Task started\nextracted 2 orders for 2026-03-14\n[info] Done. Returned value was: [{'order_id': 'O-1', 'total': 12.5}, {'order_id': 'O-2', 'total': 8.0}]\n[info] Pushing xcom\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=extract map_index=-1\n[info] [DAG TEST] starting task_id=transform map_index=-1\n[info] Task started\ntotal is 20.5\n[info] Done. Returned value was: {'orders': 2, 'total': 20.5}\n[info] Pushing xcom\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=transform map_index=-1\n[info] [DAG TEST] starting task_id=load map_index=-1\n[info] Task started\nwrote summary_2026-03-14.json\n[info] Done. Returned value was: None\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=load map_index=-1\n[info] Marking run <DagRun brewline_first @ 2026-03-14 00:00:00+00:00: manual__2026-03-14T09:00:00.000000+00:00, state:running, queued_at: None. run_type: manual> successful\n[info] DagRun Finished: dag_id=brewline_first, logical_date=2026-03-14, state=success, run_type=manual",
  "af.jobs_check": "Found one alive job.",
  "af.jobs_check_triggerer": "Found one alive job.",
  "af.loop_fixed": "[info] [DAG TEST] starting task_id=accumulate.increment map_index=-1\n[info] Task started\niteration 1: total is 1\n[info] Done. Returned value was: 1\n[info] Pushing xcom\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=accumulate.increment map_index=-1\n[info] [DAG TEST] starting task_id=accumulate.__loop_gate map_index=-1\n[info] Task started\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=accumulate.__loop_gate map_index=-1\n[info] [DAG TEST] starting task_id=accumulate.increment map_index=-1\n[info] Task started\niteration 2: total is 2\n[info] Done. Returned value was: 2\n[info] Pushing xcom\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=accumulate.increment map_index=-1\n[info] [DAG TEST] starting task_id=accumulate.__loop_gate map_index=-1\n[info] Task started\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=accumulate.__loop_gate map_index=-1\n[info] [DAG TEST] starting task_id=accumulate.increment map_index=-1\n[info] Task started\niteration 3: total is 3\n[info] Done. Returned value was: 3\n[info] Pushing xcom\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=accumulate.increment map_index=-1\n[info] [DAG TEST] starting task_id=accumulate.__loop_gate map_index=-1\n[info] Task started\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=accumulate.__loop_gate map_index=-1\n[info] Marking run <DagRun brewline_loop_fixed @ 2026-03-14 00:00:00+00:00: manual__2026-03-14T09:00:00.000000+00:00, state:running, queued_at: None. run_type: manual> successful\n[info] DagRun Finished: dag_id=brewline_loop_fixed, logical_date=2026-03-14, state=success, run_type=manual",
  "af.loop_until": "[info] [DAG TEST] starting task_id=refine.improve map_index=-1\n[info] Task started\n[info] Done. Returned value was: 1.5\n[info] Pushing xcom\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=refine.improve map_index=-1\n[info] [DAG TEST] starting task_id=refine.evaluate map_index=-1\n[info] Task started\niteration 1: estimate 1.500000, error 0.25\n[info] Done. Returned value was: {'estimate': 1.5, 'error': 0.25}\n[info] Pushing xcom\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=refine.evaluate map_index=-1\n[info] [DAG TEST] starting task_id=refine.accurate_enough map_index=-1\n[info] Task started\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=refine.accurate_enough map_index=-1\n[info] [DAG TEST] starting task_id=refine.improve map_index=-1\n[info] Task started\n[info] Done. Returned value was: 1.4166666666666665\n[info] Pushing xcom\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=refine.improve map_index=-1\n[info] [DAG TEST] starting task_id=refine.evaluate map_index=-1\n[info] Task started\niteration 2: estimate 1.416667, error 0.0069\n[info] Done. Returned value was: {'estimate': 1.4166666666666665, 'error': 0.006944444444444198}\n[info] Pushing xcom\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=refine.evaluate map_index=-1\n[info] [DAG TEST] starting task_id=refine.accurate_enough map_index=-1\n[info] Task started\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=refine.accurate_enough map_index=-1\n[info] [DAG TEST] starting task_id=refine.improve map_index=-1\n[info] Task started\n[info] Done. Returned value was: 1.4142156862745097\n[info] Pushing xcom\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=refine.improve map_index=-1\n[info] [DAG TEST] starting task_id=refine.evaluate map_index=-1\n[info] Task started\niteration 3: estimate 1.414216, error 6e-06\n[info] Done. Returned value was: {'estimate': 1.4142156862745097, 'error': 6.007304882427178e-06}\n[info] Pushing xcom\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=refine.evaluate map_index=-1\n[info] [DAG TEST] starting task_id=refine.accurate_enough map_index=-1\n[info] Task started\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=refine.accurate_enough map_index=-1\n[info] [DAG TEST] starting task_id=refine.improve map_index=-1\n[info] Task started\n[info] Done. Returned value was: 1.4142135623746899\n[info] Pushing xcom\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=refine.improve map_index=-1\n[info] [DAG TEST] starting task_id=refine.evaluate map_index=-1\n[info] Task started\niteration 4: estimate 1.414214, error 4.5e-12\n[info] Done. Returned value was: {'estimate': 1.4142135623746899, 'error': 4.510614104447086e-12}\n[info] Pushing xcom\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=refine.evaluate map_index=-1\n[info] [DAG TEST] starting task_id=refine.accurate_enough map_index=-1\n[info] Task started\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=refine.accurate_enough map_index=-1\n[info] [DAG TEST] starting task_id=finished map_index=-1\n[info] Task started\nrefinement finished\n[info] Done. Returned value was: None\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=finished map_index=-1\n[info] Marking run <DagRun brewline_loop_until @ 2026-03-14 00:00:00+00:00: manual__2026-03-14T09:00:00.000000+00:00, state:running, queued_at: None. run_type: manual> successful\n[info] DagRun Finished: dag_id=brewline_loop_until, logical_date=2026-03-14, state=success, run_type=manual",
  "af.mapping_run": "loaded 5 stores, 250 orders\nloading SG-01 in sg\nloading SG-02 in sg\nloading SG-03 in sg\nloading SG-04 in sg\nloading SG-05 in sg",
  "af.nightly_run": "[info] [DAG TEST] starting task_id=start map_index=-1\n[info] Task started\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=start map_index=-1\n[info] [DAG TEST] starting task_id=extract_orders map_index=-1\n[info] Task started\n[info] Pushing xcom\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=extract_orders map_index=-1\n[info] [DAG TEST] starting task_id=validate_orders map_index=-1\n[info] Task started\nchecking the files of 2026-03-14\n[info] Done. Returned value was: None\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=validate_orders map_index=-1\n[info] [DAG TEST] starting task_id=load_orders map_index=-1\n[info] Task started\n[info] Pushing xcom\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=load_orders map_index=-1\n[info] [DAG TEST] starting task_id=build_marts map_index=-1\n[info] Task started\n[info] Pushing xcom\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=build_marts map_index=-1\n[info] [DAG TEST] starting task_id=notify map_index=-1\n[info] Task started\n[info] Pushing xcom\n[info] Task instance state updated: new_state=success\n[info] [DAG TEST] end task task_id=notify map_index=-1\n[info] Marking run <DagRun brewline_nightly @ 2026-03-14 00:00:00+00:00: manual__2026-03-14T09:00:00.000000+00:00, state:running, queued_at: None. run_type: manual> successful\n[info] DagRun Finished: dag_id=brewline_nightly, logical_date=2026-03-14, state=success, run_type=manual",
  "af.pools_list": "pool           | slots | description                 | include_deferred | team_name\n===============+=======+=============================+==================+==========\ndefault_pool   | 128   | Default pool                | False            | None     \ntiny_pool      | 1     | one slot                    | False            | None     \npartner_pool   | 2     | two slots for partner files | False            | None     \nwarehouse_pool | 2     | two slots for the warehouse | False            | None     \nsingle_pool    | 1     | one slot                    | False            | None",
  "af.pytest_green": "......                                                                   [100%]\n6 passed in <seconds>s",
  "af.pytest_red": ".FF.F.                                                                   [100%]\n=================================== FAILURES ===================================\n_____________________ test_every_dag_has_tags_and_an_owner _____________________\ntests/test_dag_integrity.py:21: in test_every_dag_has_tags_and_an_owner\n    assert dag.tags, f\"{dag_id} has no tags\"\nE   AssertionError: brewline_orders has no tags\nE   assert set()\nE    +  where set() = <DAG: brewline_orders>.tags\n___________________________ test_every_task_retries ____________________________\ntests/test_dag_integrity.py:28: in test_every_task_retries\n    assert task.retries >= 1, f\"{dag_id}.{task.task_id} does not retry\"\nE   AssertionError: brewline_orders.transform does not retry\nE   assert 0 >= 1\nE    +  where 0 = <Task(_PythonDecoratedOperator): transform>.retries\n______________ test_normalize_order_cleans_the_id_and_uses_cents _______________\ntests/test_orders.py:6: in test_normalize_order_cleans_the_id_and_uses_cents\n    assert row == {\"order_id\": \"O-1\", \"store\": \"SG-01\", \"total_cents\": 1999}\nE   AssertionError: assert {'order_id': ..._cents': 1998} == {'order_id': ..._cents': 1999}\nE     \nE     Omitting 2 identical items, use -vv to show\nE     Differing items:\nE     {'total_cents': 1998} != {'total_cents': 1999}\nE     Use -v to get more diff\n=========================== short test summary info ============================\nFAILED tests/test_dag_integrity.py::test_every_dag_has_tags_and_an_owner - As...\nFAILED tests/test_dag_integrity.py::test_every_task_retries - AssertionError:...\nFAILED tests/test_orders.py::test_normalize_order_cleans_the_id_and_uses_cents\n3 failed, 3 passed in <seconds>s",
  "af.ruff_good": "All checks passed!",
  "af.ruff_old_style": "dags/old_style.py:15:31: AIR311 `airflow.models.Variable` is removed in Airflow 3.0; It still works in Airflow 3.0 but is expected to be removed in a future version.\ndags/old_style.py:18:6: AIR311 `airflow.DAG` is removed in Airflow 3.0; It still works in Airflow 3.0 but is expected to be removed in a future version.\ndags/old_style.py:20:5: AIR301 [*] `schedule_interval` is removed in Airflow 3.0\ndags/old_style.py:21:16: AIR301 `airflow.utils.dates.days_ago` is removed in Airflow 3.0\ndags/old_style.py:24:15: AIR312 `airflow.operators.bash.BashOperator` is deprecated and moved into `standard` provider in Airflow 3.0; It still works in Airflow 3.0 but is expected to be removed in a future version.\ndags/old_style.py:25:5: AIR001 Task variable name should match the `task_id`: \"load\"\ndags/old_style.py:25:19: AIR312 `airflow.operators.python.PythonOperator` is deprecated and moved into `standard` provider in Airflow 3.0; It still works in Airflow 3.0 but is expected to be removed in a future version.\ndags/old_style.py:25:72: AIR301 `provide_context` is removed in Airflow 3.0\nFound 8 errors.\n[*] 1 fixable with `--fix` (4 unsafe fixes available with `--fix --unsafe-fixes`).",
  "af.version": "3.4.0"
 }
};
