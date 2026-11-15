window.LAB = window.LAB || {};
LAB.real = {
 "counts": {
  "bk.archive": {
   "archived_at_least_2": true,
   "failed": 0,
   "segments_in_archive": 6
  },
  "bk.basebackup": {
   "damaged_detected": true,
   "has_backup_label": true,
   "label_says_streamed": true,
   "manifest_present": true,
   "size_mb": 81.5,
   "verified_ok": true
  },
  "bk.checksums": {
   "clean_check_zero_bad": true,
   "damaged_check_found_one": true,
   "data_checksums_on": true,
   "default_off_on_initdb": true,
   "query_refused": true
  },
  "bk.dump": {
   "custom_bytes": 2388101,
   "custom_smaller_than_plain": true,
   "directory_bytes": 2385168,
   "password_is_a_hash": true,
   "plain_bytes": 6371425,
   "plain_over_custom": 2.7,
   "roles_in_database_dump": false,
   "roles_in_globals_dump": true,
   "rows_after_table_only_restore": 100000,
   "rows_original": 100000,
   "rows_restored": 100000,
   "sum_equal": true,
   "table_total_bytes": 10739712
  },
  "bk.pitr": {
   "history_file": true,
   "later_work_gone": true,
   "orders_rows": 100000,
   "recovered_to_restore_point": true,
   "rows_back": 12,
   "table_back": true,
   "timeline_after": 2
  },
  "crash": {
   "committed_before_crash": 2000,
   "log_says_ready": true,
   "log_says_recovery": true,
   "log_says_redo": true,
   "paid_after_clean_restart": 1000,
   "paid_after_crash": 2000,
   "uncommitted_before_crash": 500,
   "uncommitted_rows_after_crash": 0,
   "unlogged_after_clean_restart": 1000,
   "unlogged_after_crash": 0
  },
  "idx.brin": {
   "brin_kb": 24,
   "brin_plan_has_bitmap": true,
   "btree_mb": 21.4,
   "btree_over_brin": 915,
   "btree_plan_uses_index": true,
   "correlation_in_order": 1.0,
   "correlation_shuffled": -0.0,
   "recheck_removed": 16000,
   "rows_matching": 28800,
   "shuffled_plan_first_line": "->  Seq Scan on events_shuffled  (cost=0.00..29336.00 rows=2",
   "shuffled_plan_uses_brin": false,
   "table_mb": 111.6
  },
  "idx.index_only": {
   "all_visible_pages_after": 14286,
   "all_visible_pages_before": 0,
   "heap_fetches_after": 0,
   "heap_fetches_before": null,
   "index_only_scan_before": false,
   "pages": 14286,
   "rows_returned": 20
  },
  "idx.jsonb": {
   "arrow_plan_is_seq_scan": true,
   "arrow_rows": 10000,
   "arrow_uses_gin": false,
   "contain_rows": 3334,
   "contain_uses_gin": true,
   "expr_uses_index": true,
   "gin_mb": 5.4
  },
  "idx.partial": {
   "full_mb": 7.4,
   "partial_kb": 16,
   "plan_uses_partial": true,
   "purchases": 1000,
   "times_smaller": 475
  },
  "idx.stats": {
   "actual": 333,
   "estimate_after": 293,
   "estimate_before": 76,
   "off_by_before": 4.4
  },
  "idx.table": {
   "rows": 1000000,
   "table_mb": 111.6
  },
  "idx.usage": {
   "listed": 12,
   "never_used": 6
  },
  "idx.write_cost": {
   "five": 28017048,
   "five_over_none": 3.1,
   "none": 8929728,
   "two": 15852728
  },
  "load.analyze": {
   "actual": 167,
   "estimate_after": 44,
   "estimate_before": 2,
   "reltuples_after": 100000.0,
   "reltuples_before": -1.0
  },
  "load.copy_error": {
   "names_the_column": true,
   "names_the_line": true,
   "rows_in_table_after_error": 0,
   "rows_sent_before_the_bad_one": 4
  },
  "load.dup": {
   "merge_refused": true,
   "upsert_refused": true
  },
  "load.methods": {
   "COPY": {
    "commits": 1,
    "rows": 20000,
    "seconds": 0.03,
    "statements": 1,
    "wal_bytes": 2574500,
    "wal_flushes": 1
   },
   "INSERT of 1,000 rows at a time, one transaction": {
    "commits": 1,
    "rows": 20000,
    "seconds": 0.27,
    "statements": 20,
    "wal_bytes": 3481693,
    "wal_flushes": 3
   },
   "one INSERT per row, all in one transaction": {
    "commits": 1,
    "rows": 20000,
    "seconds": 1.25,
    "statements": 20000,
    "wal_bytes": 3481634,
    "wal_flushes": 7
   },
   "one INSERT per row, each committed": {
    "commits": 20000,
    "rows": 20000,
    "seconds": 4.51,
    "statements": 20000,
    "wal_bytes": 4161600,
    "wal_flushes": 20000
   }
  },
  "load.methods_summary": {
   "all_loaded_20000": true,
   "autocommit_flushes": 20000,
   "copy_faster_than_autocommit_by_at_least": 150,
   "one_tx_flushes": 7
  },
  "load.upsert": {
   "changed_status": "INSERT 0 1000",
   "changed_updated": 1000,
   "distinct_size_unchanged": true,
   "distinct_status": "INSERT 0 0",
   "distinct_updated": 0,
   "first_status": "INSERT 0 100000",
   "merge_changed_status": "MERGE 500",
   "merge_changed_updated": 500,
   "merge_same_file_status": "MERGE 0",
   "merge_same_updated": 0,
   "plain_second_status": "INSERT 0 100000",
   "plain_second_updated": 100000,
   "table_doubled_by_plain_rerun": true
  },
  "load.wal": {
   "index_after_mb": 7.9,
   "logged_mb": 12.3,
   "unlogged_mb": 0.0,
   "unlogged_much_smaller": true
  },
  "mvcc.autovacuum": {
   "dead_after_run": 0,
   "dead_counted_below": true,
   "formula": "50 + 0.2 * 10,000",
   "insert_vacuum_runs": 1,
   "ran_above_threshold": true,
   "ran_below_threshold": false,
   "threshold": 2050.0
  },
  "mvcc.bloat": {
   "dead_after_3": 100045,
   "dead_after_vacuum": 0,
   "ratio_after_3": 4.0,
   "size_after_1": 15319040,
   "size_after_3": 30621696,
   "size_after_vacuum": 30621696,
   "size_after_vacuum_full": 7659520,
   "size_start": 7659520,
   "vacuum_full_shrinks": true,
   "vacuum_shrinks": false
  },
  "mvcc.held": {
   "not_yet_removable_after_commit": 0,
   "not_yet_removable_while_held": 10000,
   "removed_after_commit": 10000,
   "removed_while_held": 0,
   "updated_rows": 10000
  },
  "mvcc.hot": {
   "fillfactor_all_pct": 45,
   "full_page_pct": 0,
   "indexed_pct": 0,
   "quarter_fillfactor_pct": 100,
   "quarter_full_pct": 0
  },
  "mvcc.versions": {
   "ctid_after": "(0,4)",
   "ctid_before": "(0,1)",
   "old_version_xmax_is_update_xid": true,
   "other_rows_same_ctid": true,
   "versions_on_page_after_update": 4,
   "visible_rows_after_update": 3,
   "xmin_after": 1,
   "xmin_before": 0
  },
  "ops.hba": {
   "no_entry_refused": true,
   "no_password_refused": true,
   "password_encryption": "scram-sha-256",
   "right_password_ok": true,
   "rules": 4,
   "wrong_password_refused": true
  },
  "ops.migration_timeout": {
   "reader_not_blocked": true,
   "refused": true
  },
  "ops.pgss": {
   "one_row_per_normalized_query": true,
   "placeholder_in_text": true,
   "point_lookup_calls": 200,
   "preload_required": true
  },
  "ops.privileges": {
   "create_in_public_refused": true,
   "default_privileges_cover_new": true,
   "denied_without_grant": true,
   "granted_columns_work": true,
   "granted_works": true,
   "new_table_denied": true,
   "old_table_still_denied": true,
   "star_denied_by_column_grant": true
  },
  "ops.queue": {
   "b_blocked_by_a": true,
   "b_waited_at_least_1s": true,
   "c_blocked_by_b": true,
   "c_waited_at_least_1s": true
  },
  "ops.rewrites": {
   "ADD COLUMN c1 int": "no",
   "ADD COLUMN c2 int DEFAULT 0": "no",
   "ADD COLUMN c3 timestamptz DEFAULT clock_timestamp()": "yes",
   "ADD COLUMN c4 text NOT NULL DEFAULT 'x'": "no",
   "ALTER COLUMN amount TYPE numeric(12,2)": "no",
   "ALTER COLUMN note TYPE varchar(40)": "yes",
   "ALTER COLUMN store_id TYPE bigint": "yes"
  },
  "ops.rls": {
   "expected_store_5": 16667,
   "no_policy_rows": 0,
   "policy_rows": 16667,
   "superuser_rows": 200000
  },
  "ops.settings": {
   "shared_buffers_context": "postmaster",
   "shared_buffers_pending": true,
   "shared_buffers_value_unchanged": true,
   "work_mem_applied": true,
   "work_mem_context": "user",
   "work_mem_pending": false
  },
  "ops.sort": {
   "default_work_mem": "4MB",
   "disk_kb": 12344,
   "in_memory_after": true,
   "memory_kb": 21785,
   "spilled": true
  },
  "ops.timeouts": {
   "idle": true,
   "lock": true,
   "statement": true
  },
  "part.errors": {
   "default_blocks_new_partition": true,
   "no_partition_error": true,
   "pk_error_names_the_rule": true
  },
  "part.pruning": {
   "partitions": 6,
   "partitions_scanned_with_function": 6,
   "partitions_scanned_with_range": 1,
   "prepared_subplans_removed": 5,
   "range_rows": 3323
  },
  "part.retention": {
   "april_dropped_bytes": 9191424,
   "april_rows": 99693,
   "dead_rows_after_delete": 103015,
   "delete_keeps_the_space": true,
   "delete_wal_bytes": 5785840,
   "delete_wal_mb": 5.5,
   "drop_wal_bytes": 7536,
   "march_rows": 103015,
   "march_size_after_delete": 6209536,
   "march_size_before": 6209536,
   "times_less_wal": 768
  },
  "part.sizes": {
   "partitions": 6,
   "total_rows": 600000
  },
  "project.load": {
   "changed_amount": "77.00",
   "first_run": 5000,
   "fourth_run_file_with_a_duplicate_row": 0,
   "rows_in_table": 5000,
   "second_run_same_file": 0,
   "third_run_one_row_changed": 1
  },
  "project.sql": {
   "column_added": 1,
   "indexes_created": 5,
   "partitions": 2,
   "policy": 1
  },
  "repl.conflict": {
   "off_canceled": true,
   "off_message_ok": true,
   "off_removed": 10000,
   "on_canceled": false,
   "on_not_yet_removable": 10000,
   "on_removed": 0,
   "standby_conflicts_counted": 1
  },
  "repl.ddl": {
   "after_fix_subscriber_rows": 2005,
   "error_names_column": true,
   "stalled_primary_rows": 2005,
   "stalled_subscriber_rows": 2004
  },
  "repl.decoded": {
   "changes": 10,
   "has_delete": true,
   "has_insert": true,
   "has_update": true,
   "old_key_in_delete": true
  },
  "repl.identity": {
   "update_refused": true,
   "works_with_full": true
  },
  "repl.lag": {
   "behind_bytes_while_paused": true,
   "primary_rows": 2000,
   "standby_rows_after_resume": 2000,
   "standby_rows_while_paused": 1000
  },
  "repl.logical": {
   "after_changes_primary": 2004,
   "after_changes_subscriber": 2004,
   "delete_replicated": 0,
   "initial_copy_rows": 2000,
   "initial_synced": true,
   "update_replicated": "refunded"
  },
  "repl.sequence": {
   "publisher_last_value": 100,
   "rows_on_subscriber": 100,
   "subscriber_is_called": false,
   "subscriber_last_value": 1
  },
  "repl.slots": {
   "error_says_invalidated": true,
   "forgotten_active": false,
   "forgotten_retained_mb": 69,
   "forgotten_status": "reserved",
   "status_after_limit": "lost",
   "subscription_retained_mb": 23,
   "wal_files_after_drop": 5,
   "wal_files_after_limit": 5,
   "wal_files_before": 2,
   "wal_files_with_slot": 5
  },
  "repl.standby": {
   "is_in_recovery": true,
   "primary_in_recovery": false,
   "rows_on_standby": 1000,
   "state": "streaming",
   "sync_state": "async",
   "write_refused": true
  },
  "srv.datadir": {
   "entries": 22,
   "has_base": true,
   "has_pg_wal": true
  },
  "srv.page": {
   "free_bytes_on_page_0": 12,
   "pagesize": 8192,
   "tuples_on_page_0": 97
  },
  "srv.processes": {
   "background_processes": 5,
   "client_backends_in_pg_stat_activity": 3,
   "client_processes": 3,
   "client_processes_after_two_closed": 1,
   "clients_opened": 3
  },
  "srv.slots": {
   "etl_connections_accepted": 7,
   "max_connections": 10,
   "reserved_for_superusers": 3,
   "superuser_connections_accepted": 3
  },
  "srv.table": {
   "bytes": 16891904,
   "bytes_equal_file": true,
   "file_bytes": 16891904,
   "files_of_the_table": 2,
   "pages": 2062,
   "pages_times_8192_equal_size": true,
   "path_shape": "base/N/N",
   "rows": 200000,
   "rows_per_page": 97.0,
   "size_mb": 16.1
  },
  "srv.toast": {
   "rows": [
    {
     "id": 1,
     "stored_bytes": 6,
     "value_bytes": 5
    },
    {
     "id": 2,
     "stored_bytes": 252,
     "value_bytes": 21000
    },
    {
     "id": 3,
     "stored_bytes": 20480,
     "value_bytes": 20480
    }
   ],
   "toast_chunks": 11,
   "toast_table_exists": true,
   "toasted_values": 1
  },
  "wal.checkpoint": {
   "manual_counts_as_requested": true,
   "req_after": 2,
   "req_before": 1,
   "timed_after": 0,
   "timed_before": 0
  },
  "wal.commits": {
   "off": {
    "commits": 1000,
    "seconds": 0.08,
    "wal_records": 2000,
    "wal_syncs": 3
   },
   "on": {
    "commits": 1000,
    "seconds": 0.34,
    "wal_records": 2000,
    "wal_syncs": 1000
   },
   "one_transaction": {
    "commits": 1,
    "seconds": 0.06,
    "wal_syncs": 1
   }
  },
  "wal.fpi": {
   "every_statement_ends_with_commit": true,
   "first_update_fpi_bytes": 8124,
   "first_update_record_bytes": 8183,
   "second_update_fpi_bytes": 0,
   "second_update_record_bytes": 71
  },
  "wal.segment": {
   "name_chars": 24,
   "segment_bytes": 16777216,
   "segments_in_pg_wal": 1
  },
  "wal.wal_level": {
   "default": "replica",
   "logical_slot_refused": true
  }
 },
 "files": {
  "backup.sh": "#!/bin/sh\n# A logical dump, a physical backup, and a restore to a named point in time.\nset -e\npg_dump -Fc -f brewline.dump brewline\npg_basebackup -D /backup/base -X stream -c fast\npg_verifybackup /backup/base\n# To recover: copy /backup/base to a new data directory, then in postgresql.conf\n#   restore_command = 'cp /archive/%f %p'\n#   recovery_target_name = 'before_mistake'\n#   recovery_target_action = 'promote'\n# create an empty file called recovery.signal, and start the server.\n",
  "indexes.sql": "-- Indexes for the events table (one row for each page view, click or purchase).\n-- A BRIN index for a column that grows with the file: a few kilobytes instead of tens of megabytes.\nCREATE INDEX events_ts_brin ON events USING brin (event_ts);\n-- A partial index for the rare rows that you look up.\nCREATE INDEX events_user_purchase ON events (user_id) WHERE kind = 'purchase';\n-- A covering index, so that the query can be answered from the index alone.\nCREATE INDEX events_user_inc ON events (user_id) INCLUDE (event_ts);\n-- GIN for containment on JSONB, and an expression index for one key that is read with ->>.\nCREATE INDEX events_payload_gin ON events USING gin (payload jsonb_path_ops);\nCREATE INDEX events_n_expr ON events ((payload->>'n'));\n",
  "load_orders.py": "\"\"\"Load a file of orders into PostgreSQL: COPY into a temporary table, then one upsert that touches only the rows that changed.\"\"\"\nimport pathlib\nimport sys\n\nimport psycopg\n\nUPSERT = pathlib.Path(__file__).with_name('upsert.sql').read_text()\n\n\ndef load(dsn, csv_path):\n    with psycopg.connect(dsn) as con:\n        with con.transaction():\n            con.execute('CREATE TEMP TABLE stg (LIKE orders) ON COMMIT DROP')\n            with con.cursor().copy('COPY stg FROM STDIN (FORMAT csv, HEADER true)') as copy:\n                with open(csv_path, 'rb') as f:\n                    while chunk := f.read(65536):\n                        copy.write(chunk)\n            return con.execute(UPSERT).rowcount\n\n\nif __name__ == '__main__':\n    print(load(sys.argv[1], sys.argv[2]))\n",
  "migrate.sql": "-- A migration that cannot hold up the traffic: give up after three seconds, and run it again later.\nSET lock_timeout = '3s';\nALTER TABLE orders ADD COLUMN channel text;\n",
  "partitions.sql": "-- Events, one partition for each month. The primary key must contain the partition key.\nCREATE TABLE ev (\n    event_id bigint      NOT NULL,\n    event_ts timestamptz NOT NULL,\n    user_id  int,\n    kind     text,\n    PRIMARY KEY (event_id, event_ts)\n) PARTITION BY RANGE (event_ts);\n\nCREATE TABLE ev_2026_03 PARTITION OF ev FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');\nCREATE TABLE ev_2026_04 PARTITION OF ev FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');\nCREATE TABLE ev_default PARTITION OF ev DEFAULT;\n\n-- Retention: detach, then drop. No DELETE, no dead rows.\nALTER TABLE ev DETACH PARTITION ev_2026_03;\nDROP TABLE ev_2026_03;\n",
  "pg_hba.conf": "# TYPE  DATABASE   USER       ADDRESS         METHOD\nlocal   all        postgres                   peer\nhost    all        analyst    10.0.0.0/16     scram-sha-256\nhost    brewline   etl        10.0.1.0/24     scram-sha-256\nhost    replication replicator 10.0.2.0/24    scram-sha-256\n",
  "postgresql.conf": "# The settings that the course changes or reads. Everything else stays at its default.\nwal_level = replica               # logical when a subscriber or Debezium reads the changes\nmax_wal_size = 1GB\narchive_mode = on\narchive_command = 'cp %p /archive/%f'\nmax_slot_wal_keep_size = 50GB     # a slot that nobody reads cannot fill the disk\nhot_standby_feedback = off\nidle_in_transaction_session_timeout = '10min'\nlog_min_duration_statement = '1s'\nshared_preload_libraries = 'pg_stat_statements'\n",
  "roles.sql": "-- A read-only role for analysts, and what a new table needs.\nCREATE ROLE analyst LOGIN PASSWORD 'change-me';\nGRANT SELECT ON ALL TABLES IN SCHEMA public TO analyst;\nALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO analyst;\n\n-- Row level security: an analyst sees one store.\nALTER TABLE orders ENABLE ROW LEVEL SECURITY;\nCREATE POLICY store_five ON orders FOR SELECT TO analyst USING (store_id = 5);\n",
  "schema.sql": "-- The Brewline orders table. One row for each order, loaded every night.\nCREATE TABLE orders (\n    order_id    bigint        PRIMARY KEY,\n    store_id    int           NOT NULL,\n    customer_id int           NOT NULL,\n    order_ts    timestamptz   NOT NULL,\n    amount      numeric(10,2) NOT NULL,\n    status      text          NOT NULL,\n    note        text\n);\n",
  "upsert.sql": "INSERT INTO orders (order_id, store_id, customer_id, order_ts, amount, status, note)\nSELECT DISTINCT ON (order_id) order_id, store_id, customer_id, order_ts, amount, status, note\nFROM stg\nORDER BY order_id, order_ts DESC\nON CONFLICT (order_id) DO UPDATE\nSET store_id = EXCLUDED.store_id, customer_id = EXCLUDED.customer_id, order_ts = EXCLUDED.order_ts,\n    amount = EXCLUDED.amount, status = EXCLUDED.status, note = EXCLUDED.note\nWHERE (orders.store_id, orders.customer_id, orders.order_ts, orders.amount, orders.status, orders.note)\n      IS DISTINCT FROM (EXCLUDED.store_id, EXCLUDED.customer_id, EXCLUDED.order_ts, EXCLUDED.amount, EXCLUDED.status, EXCLUDED.note);\n"
 },
 "meta": {
  "block_size": 8192,
  "os": "Linux x86_64",
  "postgres": "16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)",
  "recorded_on": "2026-11-15",
  "version_line": "PostgreSQL 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1)"
 },
 "tables": {
  "bk.dump_sizes": {
   "cols": [
    "format",
    "command",
    "bytes",
    "files"
   ],
   "rows": [
    [
     "plain SQL",
     "pg_dump -Fp",
     6371425,
     1
    ],
    [
     "custom",
     "pg_dump -Fc",
     2388101,
     1
    ],
    [
     "directory, 2 jobs",
     "pg_dump -Fd -j 2",
     2385168,
     2
    ]
   ]
  },
  "idx.usage": {
   "cols": [
    "table",
    "index",
    "times used",
    "size bytes"
   ],
   "rows": [
    [
     "events",
     "events_n_expr",
     2,
     6979584
    ],
    [
     "events",
     "events_payload_gin",
     2,
     5611520
    ],
    [
     "events",
     "events_ts_brin",
     2,
     24576
    ],
    [
     "events",
     "events_user_inc",
     3,
     31563776
    ],
    [
     "events",
     "events_user_purchase",
     3,
     16384
    ],
    [
     "ix5",
     "ix5_0",
     0,
     409600
    ],
    [
     "ix5",
     "ix5_1",
     0,
     573440
    ],
    [
     "ix5",
     "ix5_2",
     0,
     1138688
    ],
    [
     "ix5",
     "ix5_3",
     0,
     1220608
    ],
    [
     "ix5",
     "ix5_4",
     0,
     2523136
    ],
    [
     "ix5",
     "ix5_pkey",
     0,
     1138688
    ],
    [
     "orders",
     "orders_pkey",
     4,
     4513792
    ]
   ]
  },
  "idx.write_cost": {
   "cols": [
    "indexes besides the primary key",
    "WAL bytes for 50,000 inserted rows",
    "times the WAL of none"
   ],
   "rows": [
    [
     0,
     8929728,
     1.0
    ],
    [
     2,
     15852728,
     1.8
    ],
    [
     5,
     28017048,
     3.1
    ]
   ]
  },
  "load.csv_nulls": {
   "cols": [
    "a",
    "b is NULL",
    "b",
    "c"
   ],
   "rows": [
    [
     "1",
     true,
     null,
     ""
    ],
    [
     "2",
     false,
     "x,y",
     "z"
    ],
    [
     "3",
     false,
     "NULL",
     "q\"r"
    ]
   ]
  },
  "load.methods": {
   "cols": [
    "method",
    "statements sent",
    "commits",
    "WAL bytes",
    "WAL flushes",
    "seconds on this machine",
    "rows loaded"
   ],
   "rows": [
    [
     "one INSERT per row, each committed",
     20000,
     20000,
     4161600,
     20000,
     4.51,
     20000
    ],
    [
     "one INSERT per row, all in one transaction",
     20000,
     1,
     3481634,
     7,
     1.25,
     20000
    ],
    [
     "INSERT of 1,000 rows at a time, one transaction",
     20,
     1,
     3481693,
     3,
     0.27,
     20000
    ],
    [
     "COPY",
     1,
     1,
     2574500,
     1,
     0.03,
     20000
    ]
   ]
  },
  "load.upsert": {
   "cols": [
    "run",
    "command tag",
    "rows inserted",
    "rows updated",
    "table bytes"
   ],
   "rows": [
    [
     "first load of 100,000 rows",
     "INSERT 0 100000",
     100000,
     0,
     8445952
    ],
    [
     "the same file again, plain DO UPDATE",
     "INSERT 0 100000",
     0,
     100000,
     16891904
    ],
    [
     "the same file again, DO UPDATE ... WHERE the row differs",
     "INSERT 0 0",
     0,
     0,
     16891904
    ],
    [
     "1,000 rows changed, DO UPDATE ... WHERE the row differs",
     "INSERT 0 1000",
     0,
     1000,
     16982016
    ],
    [
     "the same file again with MERGE",
     "MERGE 0",
     0,
     0,
     16982016
    ],
    [
     "500 other rows changed, MERGE",
     "MERGE 500",
     0,
     500,
     16982016
    ]
   ]
  },
  "load.wal": {
   "cols": [
    "100,000 rows by COPY into",
    "WAL bytes",
    "table bytes",
    "primary key bytes"
   ],
   "rows": [
    [
     "logged table with a primary key",
     12874595,
     8585216,
     2260992
    ],
    [
     "logged table, key added after the load",
     8305585,
     8585216,
     2260992
    ],
    [
     "unlogged table with a primary key",
     34,
     8585216,
     2260992
    ]
   ]
  },
  "mvcc.autovacuum": {
   "cols": [
    "step",
    "dead rows made so far",
    "dead rows counted now",
    "autovacuum runs"
   ],
   "rows": [
    [
     "10,000 rows inserted, nothing updated",
     0,
     0,
     1
    ],
    [
     "1,500 rows updated",
     1500,
     1500,
     1
    ],
    [
     "1,000 more rows updated (2,500 in all)",
     2500,
     0,
     2
    ]
   ]
  },
  "mvcc.bloat": {
   "cols": [
    "step",
    "table bytes",
    "table MB",
    "live rows",
    "dead rows",
    "dead %",
    "free space %",
    "primary key index bytes"
   ],
   "rows": [
    [
     "100,000 rows loaded",
     7659520,
     7.3,
     100000,
     0,
     0.0,
     0.4,
     2260992
    ],
    [
     "after 1 update of every row",
     15319040,
     14.6,
     100000,
     100000,
     43.7,
     0.4,
     4513792
    ],
    [
     "after 2 updates of every row",
     22970368,
     21.9,
     100000,
     100000,
     29.2,
     31.7,
     4513792
    ],
    [
     "after 3 updates of every row",
     30621696,
     29.2,
     100000,
     100045,
     21.9,
     47.4,
     4931584
    ],
    [
     "after VACUUM",
     30621696,
     29.2,
     100000,
     0,
     0.0,
     74.8,
     4931584
    ],
    [
     "after one more update",
     30621696,
     29.2,
     100000,
     100000,
     21.9,
     50.0,
     4931584
    ],
    [
     "after VACUUM FULL",
     7659520,
     7.3,
     100000,
     0,
     0.0,
     0.4,
     2260992
    ]
   ]
  },
  "mvcc.hot": {
   "cols": [
    "case",
    "rows updated",
    "HOT updates",
    "HOT %",
    "table bytes"
   ],
   "rows": [
    [
     "every row, an indexed column",
     20000,
     0,
     0,
     2736128
    ],
    [
     "every row, a column without an index, fillfactor 100",
     20000,
     0,
     0,
     2736128
    ],
    [
     "every row, a column without an index, fillfactor 70",
     20000,
     8917,
     45,
     3072000
    ],
    [
     "a quarter of the rows, fillfactor 100",
     5000,
     0,
     0,
     1712128
    ],
    [
     "a quarter of the rows, fillfactor 70",
     5000,
     5000,
     100,
     1974272
    ]
   ]
  },
  "mvcc.page": {
   "cols": [
    "step",
    "line pointer",
    "state",
    "xmin (relative)",
    "xmax (relative)",
    "ctid"
   ],
   "rows": [
    [
     "3 rows inserted",
     1,
     "normal",
     0,
     0,
     "(0,1)"
    ],
    [
     "3 rows inserted",
     2,
     "normal",
     0,
     0,
     "(0,2)"
    ],
    [
     "3 rows inserted",
     3,
     "normal",
     0,
     0,
     "(0,3)"
    ],
    [
     "row 1 updated",
     1,
     "normal",
     0,
     1,
     "(0,4)"
    ],
    [
     "row 1 updated",
     2,
     "normal",
     0,
     0,
     "(0,2)"
    ],
    [
     "row 1 updated",
     3,
     "normal",
     0,
     0,
     "(0,3)"
    ],
    [
     "row 1 updated",
     4,
     "normal",
     1,
     0,
     "(0,4)"
    ],
    [
     "an insert rolled back",
     1,
     "normal",
     0,
     1,
     "(0,4)"
    ],
    [
     "an insert rolled back",
     2,
     "normal",
     0,
     0,
     "(0,2)"
    ],
    [
     "an insert rolled back",
     3,
     "normal",
     0,
     0,
     "(0,3)"
    ],
    [
     "an insert rolled back",
     4,
     "normal",
     1,
     0,
     "(0,4)"
    ],
    [
     "an insert rolled back",
     5,
     "normal",
     2,
     0,
     "(0,5)"
    ],
    [
     "after VACUUM",
     1,
     "redirect",
     null,
     0,
     null
    ],
    [
     "after VACUUM",
     2,
     "normal",
     0,
     0,
     "(0,2)"
    ],
    [
     "after VACUUM",
     3,
     "normal",
     0,
     0,
     "(0,3)"
    ],
    [
     "after VACUUM",
     4,
     "normal",
     1,
     0,
     "(0,4)"
    ]
   ]
  },
  "ops.hba": {
   "cols": [
    "line",
    "type",
    "database",
    "user",
    "address",
    "method"
   ],
   "rows": [
    [
     1,
     "local",
     "all",
     "all",
     "",
     "trust"
    ],
    [
     2,
     "host",
     "all",
     "postgres",
     "127.0.0.1",
     "trust"
    ],
    [
     3,
     "host",
     "replication",
     "all",
     "127.0.0.1",
     "trust"
    ],
    [
     4,
     "host",
     "all",
     "analyst",
     "127.0.0.1",
     "scram-sha-256"
    ]
   ]
  },
  "ops.pgss": {
   "cols": [
    "normalized query",
    "calls",
    "rows returned in all"
   ],
   "rows": [
    [
     "SELECT * FROM orders WHERE order_id = $1",
     200,
     200
    ],
    [
     "SELECT store_id, count(*) FROM orders WHERE status = $1 GROUP BY store_id",
     30,
     360
    ],
    [
     "SELECT * FROM orders ORDER BY note LIMIT $1",
     3,
     15
    ]
   ]
  },
  "ops.privileges": {
   "cols": [
    "step",
    "result"
   ],
   "rows": [
    [
     "analyst: SELECT count(*) FROM orders",
     "refused: permission denied for table orders"
    ],
    [
     "analyst: CREATE TABLE scratch (x int)",
     "refused: permission denied for schema public"
    ],
    [
     "after GRANT SELECT ON orders TO analyst: the same SELECT",
     "allowed"
    ],
    [
     "a new table orders_q2 made by the owner: analyst reads it",
     "refused: permission denied for table orders_q2"
    ],
    [
     "after ALTER DEFAULT PRIVILEGES, a newer table orders_q3: analyst reads it",
     "allowed"
    ],
    [
     "the older table orders_q2 again",
     "refused: permission denied for table orders_q2"
    ],
    [
     "reporting: SELECT * FROM orders",
     "refused: permission denied for table orders"
    ],
    [
     "reporting: SELECT order_id, amount FROM orders",
     "allowed"
    ]
   ]
  },
  "ops.queue": {
   "cols": [
    "session",
    "doing",
    "state",
    "waiting for",
    "blocked by"
   ],
   "rows": [
    [
     "A",
     "a transaction that read the table and is still open",
     "idle in transaction",
     "Client / ClientRead",
     "-"
    ],
    [
     "B",
     "ALTER TABLE orders ADD COLUMN migrated int",
     "active",
     "Lock / relation",
     "A"
    ],
    [
     "C",
     "SELECT 1 FROM orders LIMIT 1",
     "active",
     "Lock / relation",
     "B"
    ]
   ]
  },
  "ops.rewrites": {
   "cols": [
    "statement on a table of 200,000 rows",
    "table rewritten (new file)"
   ],
   "rows": [
    [
     "ADD COLUMN c1 int",
     "no"
    ],
    [
     "ADD COLUMN c2 int DEFAULT 0",
     "no"
    ],
    [
     "ADD COLUMN c3 timestamptz DEFAULT clock_timestamp()",
     "yes"
    ],
    [
     "ALTER COLUMN store_id TYPE bigint",
     "yes"
    ],
    [
     "ALTER COLUMN note TYPE varchar(40)",
     "yes"
    ],
    [
     "ALTER COLUMN amount TYPE numeric(12,2)",
     "no"
    ],
    [
     "ADD COLUMN c4 text NOT NULL DEFAULT 'x'",
     "no"
    ]
   ]
  },
  "ops.rls": {
   "cols": [
    "who",
    "state of the table",
    "rows seen"
   ],
   "rows": [
    [
     "analyst",
     "row level security on, no policy",
     0
    ],
    [
     "analyst",
     "policy: store_id = 5",
     16667
    ],
    [
     "postgres (a superuser)",
     "the same table",
     200000
    ]
   ]
  },
  "ops.settings": {
   "cols": [
    "moment",
    "setting",
    "value",
    "unit",
    "context",
    "source",
    "pending restart"
   ],
   "rows": [
    [
     "before",
     "max_connections",
     "100",
     "",
     "postmaster",
     "configuration file",
     false
    ],
    [
     "before",
     "shared_buffers",
     "16384",
     "8kB",
     "postmaster",
     "configuration file",
     false
    ],
    [
     "before",
     "work_mem",
     "4096",
     "kB",
     "user",
     "default",
     false
    ],
    [
     "after ALTER SYSTEM and a reload",
     "max_connections",
     "100",
     "",
     "postmaster",
     "configuration file",
     true
    ],
    [
     "after ALTER SYSTEM and a reload",
     "shared_buffers",
     "16384",
     "8kB",
     "postmaster",
     "configuration file",
     true
    ],
    [
     "after ALTER SYSTEM and a reload",
     "work_mem",
     "8192",
     "kB",
     "user",
     "configuration file",
     false
    ]
   ]
  },
  "part.retention": {
   "cols": [
    "remove one month",
    "rows removed",
    "WAL bytes",
    "table bytes afterwards",
    "dead rows left behind"
   ],
   "rows": [
    [
     "DELETE ... WHERE event_ts in March",
     103015,
     5785840,
     6209536,
     103015
    ],
    [
     "DETACH PARTITION and DROP TABLE for April",
     99693,
     7536,
     0,
     0
    ]
   ]
  },
  "part.sizes": {
   "cols": [
    "partition",
    "rows",
    "bytes"
   ],
   "rows": [
    [
     "ev_2026_01",
     103015,
     6209536
    ],
    [
     "ev_2026_02",
     93046,
     5611520
    ],
    [
     "ev_2026_03",
     103015,
     6209536
    ],
    [
     "ev_2026_04",
     99693,
     6012928
    ],
    [
     "ev_2026_05",
     103015,
     6209536
    ],
    [
     "ev_2026_06",
     98216,
     5922816
    ]
   ]
  },
  "repl.lag": {
   "cols": [
    "moment",
    "rows on the primary",
    "rows on the standby"
   ],
   "rows": [
    [
     "replay paused, 1,000 rows inserted on the primary",
     2000,
     1000
    ],
    [
     "replay resumed",
     2000,
     2000
    ]
   ]
  },
  "repl.slots": {
   "cols": [
    "slot",
    "in use",
    "wal_status",
    "WAL kept for it, MB"
   ],
   "rows": [
    [
     "forgotten",
     false,
     "reserved",
     69
    ],
    [
     "brewline_sub",
     true,
     "reserved",
     23
    ],
    [
     "forgotten, after max_slot_wal_keep_size = 16MB and a checkpoint",
     false,
     "lost",
     "-"
    ]
   ]
  },
  "repl.stat": {
   "cols": [
    "application_name",
    "state",
    "sync_state",
    "bytes the standby is behind"
   ],
   "rows": [
    [
     "walreceiver",
     "streaming",
     "async",
     0
    ]
   ]
  },
  "srv.settings": {
   "cols": [
    "setting",
    "value",
    "unit",
    "context"
   ],
   "rows": [
    [
     "autovacuum",
     "on",
     "",
     "sighup"
    ],
    [
     "autovacuum_freeze_max_age",
     "200000000",
     "",
     "postmaster"
    ],
    [
     "autovacuum_naptime",
     "60",
     "s",
     "sighup"
    ],
    [
     "autovacuum_vacuum_scale_factor",
     "0.2",
     "",
     "sighup"
    ],
    [
     "autovacuum_vacuum_threshold",
     "50",
     "",
     "sighup"
    ],
    [
     "checkpoint_timeout",
     "300",
     "s",
     "sighup"
    ],
    [
     "default_statistics_target",
     "100",
     "",
     "user"
    ],
    [
     "effective_cache_size",
     "524288",
     "8kB",
     "user"
    ],
    [
     "fsync",
     "on",
     "",
     "sighup"
    ],
    [
     "full_page_writes",
     "on",
     "",
     "sighup"
    ],
    [
     "idle_in_transaction_session_timeout",
     "0",
     "ms",
     "user"
    ],
    [
     "maintenance_work_mem",
     "65536",
     "kB",
     "user"
    ],
    [
     "max_connections",
     "100",
     "",
     "postmaster"
    ],
    [
     "max_wal_size",
     "1024",
     "MB",
     "sighup"
    ],
    [
     "min_wal_size",
     "80",
     "MB",
     "sighup"
    ],
    [
     "password_encryption",
     "scram-sha-256",
     "",
     "user"
    ],
    [
     "random_page_cost",
     "4",
     "",
     "user"
    ],
    [
     "shared_buffers",
     "16384",
     "8kB",
     "postmaster"
    ],
    [
     "statement_timeout",
     "0",
     "ms",
     "user"
    ],
    [
     "synchronous_commit",
     "on",
     "",
     "user"
    ],
    [
     "wal_level",
     "replica",
     "",
     "postmaster"
    ],
    [
     "wal_segment_size",
     "16777216",
     "B",
     "internal"
    ],
    [
     "work_mem",
     "4096",
     "kB",
     "user"
    ]
   ]
  },
  "wal.commits": {
   "cols": [
    "1,000 single-row inserts",
    "commits",
    "WAL flushes to disk",
    "seconds on this machine"
   ],
   "rows": [
    [
     "one transaction each, synchronous_commit on",
     1000,
     1000,
     0.34
    ],
    [
     "one transaction each, synchronous_commit off",
     1000,
     3,
     0.08
    ],
    [
     "all in one transaction",
     1,
     1,
     0.06
    ]
   ]
  },
  "wal.records": {
   "cols": [
    "statement",
    "resource manager",
    "record type",
    "record bytes",
    "full page image bytes"
   ],
   "rows": [
    [
     "first update after a checkpoint",
     "Heap",
     "LOCK",
     8183,
     8124
    ],
    [
     "first update after a checkpoint",
     "Heap",
     "UPDATE",
     2997,
     2924
    ],
    [
     "first update after a checkpoint",
     "Btree",
     "INSERT_LEAF",
     7453,
     7400
    ],
    [
     "first update after a checkpoint",
     "Transaction",
     "COMMIT",
     34,
     0
    ],
    [
     "second update on the same page",
     "Heap2",
     "PRUNE",
     57,
     0
    ],
    [
     "second update on the same page",
     "Heap",
     "HOT_UPDATE",
     71,
     0
    ],
    [
     "second update on the same page",
     "Transaction",
     "COMMIT",
     34,
     0
    ],
    [
     "delete one row",
     "Heap2",
     "PRUNE",
     59,
     0
    ],
    [
     "delete one row",
     "Heap",
     "DELETE",
     54,
     0
    ],
    [
     "delete one row",
     "Transaction",
     "COMMIT",
     34,
     0
    ],
    [
     "insert one row",
     "Heap",
     "INSERT",
     65,
     0
    ],
    [
     "insert one row",
     "Btree",
     "INSERT_LEAF",
     5473,
     5420
    ],
    [
     "insert one row",
     "Transaction",
     "COMMIT",
     34,
     0
    ]
   ]
  }
 },
 "text": {
  "bk.backup_label": "START WAL LOCATION: 0/<lsn> (file <wal file>)\nCHECKPOINT LOCATION: 0/<lsn>\nBACKUP METHOD: streamed\nBACKUP FROM: primary\nSTART TIME: <time>\nLABEL: pg_basebackup base backup\nSTART TIMELINE: 1",
  "bk.checksum_error": "SELECT count(*) FROM t;\nWARNING: page verification failed, calculated checksum N but expected N\nERROR: invalid page in block 0 of relation base/N/N",
  "bk.checksums_bad": "pg_checksums --check -D <data directory>   -- after one byte of the table file was changed\nBad checksums:  1\npg_checksums: error: checksum verification failed in file \"base/N/N\", block 0: calculated checksum N but block contains N",
  "bk.checksums_ok": "pg_checksums --check -D <data directory>\nChecksum operation completed\nBad checksums:  0",
  "bk.globals": "CREATE ROLE analyst;\nALTER ROLE analyst WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS PASSWORD '<scram hash>';",
  "bk.history_file": "1\t0/<lsn>\tat restore point \"before_mistake\"",
  "bk.pitr_log": "LOG:  starting point-in-time recovery to \"before_mistake\"\nLOG:  restored log file \"<wal file>\" from archive\nLOG:  restored log file \"<wal file>\" from archive\nLOG:  consistent recovery state reached at 0/<lsn>\nLOG:  database system is ready to accept read-only connections\nLOG:  recovery stopping at restore point \"before_mistake\", time <time>\nLOG:  redo done at 0/<lsn>\nLOG:  selected new timeline ID: 2\nLOG:  archive recovery complete\nLOG:  database system is ready to accept connections",
  "bk.schema_only": "CREATE TABLE public.orders (\n    order_id bigint NOT NULL,\n    store_id integer NOT NULL,\n    customer_id integer NOT NULL,\n    order_ts timestamp with time zone NOT NULL,\n    amount numeric(10,2) NOT NULL,\n    status text NOT NULL,\n    note text\n);\nALTER TABLE public.orders OWNER TO postgres;\nALTER TABLE ONLY public.orders\n    ADD CONSTRAINT orders_pkey PRIMARY KEY (order_id);",
  "bk.toc": "N; N N TABLE public orders postgres\nN; N N TABLE DATA public orders postgres\nN; N N CONSTRAINT public orders orders_pkey postgres",
  "bk.verify_bad": "pg_verifybackup <damaged copy>\npg_verifybackup: error: \"base/N/N\" has size 8445953 on disk but size 8445952 in the manifest",
  "bk.verify_ok": "pg_verifybackup <backup directory>\nbackup successfully verified",
  "crash.log": "LOG:  database system was interrupted; last known up at <time>\nLOG:  database system was not properly shut down; automatic recovery in progress\nLOG:  redo starts at 0/<lsn>\nLOG:  redo done at 0/<lsn>\nLOG:  checkpoint starting: end-of-recovery immediate wait\nLOG:  database system is ready to accept connections",
  "idx.plan_brin": "SELECT count(*) FROM events WHERE event_ts >= '2026-01-10 00:00:00+00' AND event_ts < '2026-01-11 00:00:00+00'\nAggregate  (cost=14911.77..14911.78 rows=1 width=8) (actual rows=1 loops=1)\n  ->  Bitmap Heap Scan on events  (cost=19.21..14840.92 rows=28340 width=0) (actual rows=28800 loops=1)\n        Recheck Cond: ((event_ts >= '2026-01-10 00:00:00+00'::timestamp with time zone) AND (event_ts < '2026-01-11 00:00:00+00'::timestamp with time zone))\n        Rows Removed by Index Recheck: 16000\n        Heap Blocks: lossy=640\n        ->  Bitmap Index Scan on events_ts_brin  (cost=0.00..12.13 rows=35714 width=0) (actual rows=6400 loops=1)\n              Index Cond: ((event_ts >= '2026-01-10 00:00:00+00'::timestamp with time zone) AND (event_ts < '2026-01-11 00:00:00+00'::timestamp with time zone))",
  "idx.plan_brin_shuffled": "SELECT count(*) FROM events_shuffled WHERE event_ts >= '2026-01-10 00:00:00+00' AND event_ts < '2026-01-11 00:00:00+00'\nAggregate  (cost=29406.43..29406.44 rows=1 width=8) (actual rows=1 loops=1)\n  ->  Seq Scan on events_shuffled  (cost=0.00..29336.00 rows=28172 width=0) (actual rows=28800 loops=1)\n        Filter: ((event_ts >= '2026-01-10 00:00:00+00'::timestamp with time zone) AND (event_ts < '2026-01-11 00:00:00+00'::timestamp with time zone))\n        Rows Removed by Filter: 971200",
  "idx.plan_btree": "SELECT count(*) FROM events WHERE event_ts >= '2026-01-10 00:00:00+00' AND event_ts < '2026-01-11 00:00:00+00'\nAggregate  (cost=1358.08..1358.09 rows=1 width=8) (actual rows=1 loops=1)\n  ->  Index Only Scan using events_ts_btree on events  (cost=0.42..1287.23 rows=28340 width=0) (actual rows=28800 loops=1)\n        Index Cond: ((event_ts >= '2026-01-10 00:00:00+00'::timestamp with time zone) AND (event_ts < '2026-01-11 00:00:00+00'::timestamp with time zone))\n        Heap Fetches: 28800",
  "idx.plan_gin": "SELECT count(*) FROM events WHERE payload @> '{\"country\": \"DE\", \"device\": \"ios\", \"n\": 42}'\nAggregate  (cost=13873.54..13873.55 rows=1 width=8) (actual rows=1 loops=1)\n  ->  Bitmap Heap Scan on events  (cost=143.53..13848.81 rows=9889 width=0) (actual rows=3334 loops=1)\n        Recheck Cond: (payload @> '{\"n\": 42, \"device\": \"ios\", \"country\": \"DE\"}'::jsonb)\n        Heap Blocks: exact=3334\n        ->  Bitmap Index Scan on events_payload_gin  (cost=0.00..141.06 rows=9889 width=0) (actual rows=3334 loops=1)\n              Index Cond: (payload @> '{\"n\": 42, \"device\": \"ios\", \"country\": \"DE\"}'::jsonb)",
  "idx.plan_ios_after": "VACUUM events;\nSELECT user_id, event_ts FROM events WHERE user_id = 12345\nIndex Only Scan using events_user_inc on events  (cost=0.42..4.78 rows=20 width=12) (actual rows=20 loops=1)\n  Index Cond: (user_id = 12345)\n  Heap Fetches: 0",
  "idx.plan_ios_before": "SELECT user_id, event_ts FROM events WHERE user_id = 12345\nBitmap Heap Scan on events  (cost=4.58..82.59 rows=20 width=12) (actual rows=20 loops=1)\n  Recheck Cond: (user_id = 12345)\n  Heap Blocks: exact=20\n  ->  Bitmap Index Scan on events_user_inc  (cost=0.00..4.58 rows=20 width=0) (actual rows=20 loops=1)\n        Index Cond: (user_id = 12345)",
  "idx.plan_jsonb_arrow": "SELECT count(*) FROM events WHERE payload->>'n' = '42'\nAggregate  (cost=29298.50..29298.51 rows=1 width=8) (actual rows=1 loops=1)\n  ->  Seq Scan on events  (cost=0.00..29286.00 rows=5000 width=0) (actual rows=10000 loops=1)\n        Filter: ((payload ->> 'n'::text) = '42'::text)\n        Rows Removed by Filter: 990000",
  "idx.plan_jsonb_expr": "CREATE INDEX events_n_expr ON events ((payload->>'n'));\nSELECT count(*) FROM events WHERE payload->>'n' = '42'\nAggregate  (cost=10201.71..10201.72 rows=1 width=8) (actual rows=1 loops=1)\n  ->  Bitmap Heap Scan on events  (cost=59.17..10189.21 rows=5000 width=0) (actual rows=10000 loops=1)\n        Recheck Cond: ((payload ->> 'n'::text) = '42'::text)\n        Heap Blocks: exact=10000\n        ->  Bitmap Index Scan on events_n_expr  (cost=0.00..57.92 rows=5000 width=0) (actual rows=10000 loops=1)\n              Index Cond: ((payload ->> 'n'::text) = '42'::text)",
  "idx.plan_partial": "SELECT count(*) FROM events WHERE kind = 'purchase' AND user_id = 7919\nAggregate  (cost=8.17..8.18 rows=1 width=8) (actual rows=1 loops=1)\n  ->  Index Only Scan using events_user_purchase on events  (cost=0.15..8.17 rows=1 width=0) (actual rows=0 loops=1)\n        Index Cond: (user_id = 7919)\n        Heap Fetches: 0",
  "idx.plan_stats_after": "CREATE STATISTICS orders_open_store (mcv) ON status, store_id FROM orders;\nANALYZE orders;\nSELECT count(*) FROM orders WHERE status = 'open' AND store_id = 5\nAggregate  (cost=5062.73..5062.74 rows=1 width=8) (actual rows=1 loops=1)\n  ->  Seq Scan on orders  (cost=0.00..5062.00 rows=293 width=0) (actual rows=333 loops=1)\n        Filter: ((status = 'open'::text) AND (store_id = 5))\n        Rows Removed by Filter: 199667",
  "idx.plan_stats_before": "SELECT count(*) FROM orders WHERE status = 'open' AND store_id = 5\nAggregate  (cost=5062.19..5062.20 rows=1 width=8) (actual rows=1 loops=1)\n  ->  Seq Scan on orders  (cost=0.00..5062.00 rows=76 width=0) (actual rows=333 loops=1)\n        Filter: ((status = 'open'::text) AND (store_id = 5))\n        Rows Removed by Filter: 199667",
  "load.copy_error": "COPY orders_c FROM STDIN (FORMAT csv)   -- six rows, the fifth has \"abc\" as customer_id\ninvalid input syntax for type integer: \"abc\"\nCONTEXT:  COPY orders_c, line 5, column customer_id: \"abc\"",
  "load.dup_merge": "MERGE   -- the same staging table\nMERGE command cannot affect row a second time\nHINT:  Ensure that not more than one source row matches any one target row.",
  "load.dup_upsert": "INSERT ... ON CONFLICT DO UPDATE   -- the staging table holds order 1 twice\nON CONFLICT DO UPDATE command cannot affect row a second time\nHINT:  Ensure that no rows proposed for insertion within the same command have duplicate constrained values.",
  "load.plan_after_analyze": "SELECT count(*) FROM orders_s WHERE status = 'open' AND store_id = 5\nAggregate  (cost=2548.11..2548.12 rows=1 width=8) (actual rows=1 loops=1)\n  ->  Seq Scan on orders_s  (cost=0.00..2548.00 rows=44 width=0) (actual rows=167 loops=1)\n        Filter: ((status = 'open'::text) AND (store_id = 5))\n        Rows Removed by Filter: 99833",
  "load.plan_before_analyze": "SELECT count(*) FROM orders_s WHERE status = 'open' AND store_id = 5\nAggregate  (cost=2006.93..2006.94 rows=1 width=8) (actual rows=1 loops=1)\n  ->  Seq Scan on orders_s  (cost=0.00..2006.92 rows=2 width=0) (actual rows=167 loops=1)\n        Filter: ((status = 'open'::text) AND (store_id = 5))\n        Rows Removed by Filter: 99833",
  "mvcc.vacuum_held": "VACUUM (VERBOSE) held   -- while another session has an open snapshot\ntuples: 0 removed, 30000 remain, 10000 are dead but not yet removable\n\nVACUUM (VERBOSE) held   -- after that session committed\ntuples: 10000 removed, 16748 remain, 0 are dead but not yet removable",
  "ops.hba_results": "analyst, no password:       connection to server at \"127.0.0.1\", port <port> failed: fe_sendauth: no password supplied\nanalyst, wrong password:    connection to server at \"127.0.0.1\", port <port> failed: FATAL:  password authentication failed for user \"analyst\"\nanalyst, right password:    connected\netl, any password:          connection to server at \"127.0.0.1\", port <port> failed: FATAL:  no pg_hba.conf entry for host \"127.0.0.1\", user \"etl\", database \"postgres\", no encryption",
  "ops.migration_timeout": "SET lock_timeout = '300ms'; ALTER TABLE orders ADD COLUMN migrated2 int;   -- while session A still has the table open\ncanceling statement due to lock timeout",
  "ops.pgss_not_loaded": "CREATE EXTENSION pg_stat_statements;\nSELECT count(*) FROM pg_stat_statements;\npg_stat_statements must be loaded via shared_preload_libraries",
  "ops.sort_spill": "SHOW work_mem;  -- 4MB\nSELECT * FROM orders ORDER BY note\nSort Method: external merge  Disk: 12344kB\n\nSET work_mem = '64MB';\nSELECT * FROM orders ORDER BY note\nSort Method: quicksort  Memory: 21785kB",
  "ops.timeouts": "SET statement_timeout = '100ms'; SELECT pg_sleep(2);\ncanceling statement due to statement timeout\n\nSET idle_in_transaction_session_timeout = '300ms'; BEGIN; SELECT 1; -- wait one second; SELECT 2;\nterminating connection due to idle-in-transaction timeout\n\n-- another session holds LOCK TABLE orders_q2 IN ACCESS EXCLUSIVE MODE\nSET lock_timeout = '200ms'; SELECT count(*) FROM orders_q2;\ncanceling statement due to lock timeout",
  "part.default_conflict": "-- the default partition holds a row of January 2027\nCREATE TABLE ev_2027_01 PARTITION OF ev FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');\nupdated partition constraint for default partition \"ev_default\" would be violated by some row",
  "part.no_partition": "INSERT INTO ev VALUES (999999999, '2027-01-01 00:00:00+00', 1, 'view');\nno partition of relation \"ev\" found for row\nDETAIL:  Partition key of the failing row contains (event_ts) = (2027-01-01 00:00:00+00).",
  "part.pk_error": "CREATE TABLE ev_bad (event_id bigint PRIMARY KEY, event_ts timestamptz NOT NULL) PARTITION BY RANGE (event_ts);\nunique constraint on partitioned table must include all partitioning columns\nDETAIL:  PRIMARY KEY constraint on table \"ev_bad\" lacks column \"event_ts\" which is part of the partition key.",
  "part.plan_not_pruned": "SELECT count(*) FROM ev WHERE date_trunc('day', event_ts) = '2026-03-05 00:00:00+00'\nAggregate  (cost=13438.49..13438.50 rows=1 width=8) (actual rows=1 loops=1)\n  ->  Append  (cost=0.00..13431.00 rows=2999 width=0) (actual rows=3323 loops=1)\n        ->  Seq Scan on ev_2026_01 ev_1  (cost=0.00..2303.22 rows=515 width=0) (actual rows=0 loops=1)\n              Filter: (date_trunc('day'::text, event_ts) = '2026-03-05 00:00:00+00'::timestamp with time zone)\n              Rows Removed by Filter: 103015\n        ->  Seq Scan on ev_2026_02 ev_2  (cost=0.00..2080.69 rows=465 width=0) (actual rows=0 loops=1)\n              Filter: (date_trunc('day'::text, event_ts) = '2026-03-05 00:00:00+00'::timestamp with time zone)\n              Rows Removed by Filter: 93046\n        ->  Seq Scan on ev_2026_03 ev_3  (cost=0.00..2303.22 rows=515 width=0) (actual rows=3323 loops=1)\n              Filter: (date_trunc('day'::text, event_ts) = '2026-03-05 00:00:00+00'::timestamp with time zone)\n              Rows Removed by Filter: 99692\n        ->  Seq Scan on ev_2026_04 ev_4  (cost=0.00..2229.39 rows=498 width=0) (actual rows=0 loops=1)\n              Filter: (date_trunc('day'::text, event_ts) = '2026-03-05 00:00:00+00'::timestamp with time zone)\n              Rows Removed by Filter: 99693\n        ->  Seq Scan on ev_2026_05 ev_5  (cost=0.00..2303.22 rows=515 width=0) (actual rows=0 loops=1)\n              Filter: (date_trunc('day'::text, event_ts) = '2026-03-05 00:00:00+00'::timestamp with time zone)\n              Rows Removed by Filter: 103015\n        ->  Seq Scan on ev_2026_06 ev_6  (cost=0.00..2196.24 rows=491 width=0) (actual rows=0 loops=1)\n              Filter: (date_trunc('day'::text, event_ts) = '2026-03-05 00:00:00+00'::timestamp with time zone)\n              Rows Removed by Filter: 98216",
  "part.plan_prepared": "PREPARE q (timestamptz, timestamptz) AS SELECT count(*) FROM ev WHERE event_ts >= $1 AND event_ts < $2;\nEXECUTE q('2026-03-05', '2026-03-06');\nAggregate  (cost=13438.49..13438.50 rows=1 width=8) (actual rows=1 loops=1)\n  ->  Append  (cost=0.00..13431.00 rows=2999 width=0) (actual rows=3323 loops=1)\n        Subplans Removed: 5\n        ->  Seq Scan on ev_2026_03 ev_1  (cost=0.00..2303.22 rows=515 width=0) (actual rows=3323 loops=1)\n              Filter: ((event_ts >= $1) AND (event_ts < $2))\n              Rows Removed by Filter: 99692",
  "part.plan_pruned": "SELECT count(*) FROM ev WHERE event_ts >= '2026-03-05 00:00:00+00' AND event_ts < '2026-03-06 00:00:00+00'\nAggregate  (cost=2311.70..2311.72 rows=1 width=8) (actual rows=1 loops=1)\n  ->  Seq Scan on ev_2026_03 ev  (cost=0.00..2303.22 rows=3392 width=0) (actual rows=3323 loops=1)\n        Filter: ((event_ts >= '2026-03-05 00:00:00+00'::timestamp with time zone) AND (event_ts < '2026-03-06 00:00:00+00'::timestamp with time zone))\n        Rows Removed by Filter: 99692",
  "repl.conflict_off": "-- standby: hot_standby_feedback = off, a repeatable read transaction is open on big_off\n-- primary: DELETE of 10,000 rows, then VACUUM (VERBOSE) big_off\ntuples: 10000 removed, 10000 remain, 0 are dead but not yet removable\n-- standby, next statement of the open transaction:\nterminating connection due to conflict with recovery\nDETAIL:  User query might have needed to see row versions that must be removed.\nHINT:  In a moment you should be able to reconnect to the database and repeat your command.",
  "repl.conflict_on": "-- standby: hot_standby_feedback = on, a repeatable read transaction is open on big_on\n-- primary: DELETE of 10,000 rows, then VACUUM (VERBOSE) big_on\ntuples: 0 removed, 20000 remain, 10000 are dead but not yet removable\n-- standby, next statement of the open transaction:\nthe query ran: 20000 rows",
  "repl.decoded": "BEGIN <xid>\ntable public.d: INSERT: id[integer]:1 v[text]:'a'\ntable public.d: INSERT: id[integer]:2 v[text]:'b'\nCOMMIT <xid>\nBEGIN <xid>\ntable public.d: UPDATE: id[integer]:1 v[text]:'c'\nCOMMIT <xid>\nBEGIN <xid>\ntable public.d: DELETE: id[integer]:2\nCOMMIT <xid>",
  "repl.missing_column": "ALTER TABLE orders ADD COLUMN channel text;   -- on the publisher only\n-- the subscriber log:\nERROR:  logical replication target relation \"public.orders\" is missing replicated column: \"channel\"",
  "repl.no_identity": "UPDATE tags SET label = 'b';   -- tags has no primary key and is in a publication\ncannot update table \"tags\" because it does not have a replica identity and publishes updates\nHINT:  To enable updating the table, set REPLICA IDENTITY using ALTER TABLE.",
  "repl.slot_lost": "SELECT * FROM pg_logical_slot_get_changes('forgotten', NULL, NULL);\ncan no longer get changes from replication slot \"forgotten\"\nDETAIL:  This slot has been invalidated because it exceeded the maximum reserved size.",
  "repl.standby_write": "INSERT INTO orders VALUES (-1, 1, 1, now(), 1, 'x', 'y');   -- on the standby\ncannot execute INSERT in a read-only transaction",
  "srv.datadir": "PG_VERSION\nbase\nglobal\npg_commit_ts\npg_dynshmem\npg_hba.conf\npg_ident.conf\npg_logical\npg_multixact\npg_notify\npg_replslot\npg_serial\npg_snapshots\npg_stat\npg_stat_tmp\npg_subtrans\npg_tblspc\npg_twophase\npg_wal\npg_xact\npostgresql.auto.conf\npostgresql.conf",
  "srv.ps": "postgres: autovacuum launcher\npostgres: background writer\npostgres: checkpointer\npostgres: logical replication launcher\npostgres: postgres postgres 127.0.0.1(<port>) idle\npostgres: postgres postgres 127.0.0.1(<port>) idle\npostgres: postgres postgres 127.0.0.1(<port>) idle\npostgres: walwriter",
  "srv.slots_error_all": "connection failed: connection to server at \"127.0.0.1\", port <port> failed: FATAL:  sorry, too many clients already",
  "srv.slots_error_etl": "connection failed: connection to server at \"127.0.0.1\", port <port> failed: FATAL:  remaining connection slots are reserved for roles with the SUPERUSER attribute",
  "srv.table_files": "NNNNN\nNNNNN_fsm",
  "srv.toast_table": "1 | 5 | 6\n2 | 21000 | 252\n3 | 20480 | 20480",
  "wal.checkpoint_log": "LOG:  checkpoint starting: immediate force wait\nLOG:  checkpoint complete: wrote N buffers (P%); N WAL file(s) added, N removed, N recycled; write=X s, sync=X s, total=X s; sync files=N, longest=X s, average=X s; distance=N kB, estimate=N kB; lsn=0/<lsn>, redo lsn=0/<lsn>",
  "wal.dir": "000000010000000000000001\narchive_status",
  "wal.logical_needs_level": "SELECT pg_create_logical_replication_slot('s1', 'test_decoding');\nlogical decoding requires wal_level >= logical"
 }
};
