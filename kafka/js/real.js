window.LAB = window.LAB || {};
LAB.real = {
 "counts": {
  "cdc.at_least_once": {
   "events_delivered_twice": 4,
   "events_of_the_last_four_updates": 4,
   "extra_records": 4,
   "records_after_the_restart": 40022,
   "records_before_the_crash": 40018
  },
  "cdc.database": {
   "customers": 3,
   "orders": 5,
   "replica_identity_of_orders": "default (primary key)",
   "version": "16.15",
   "wal_level": "logical"
  },
  "cdc.delete_tombstone": {
   "events_for_the_delete": 2,
   "second_record_has_the_same_key": true,
   "second_record_value": null
  },
  "cdc.flat": {
   "live_records": 2,
   "records": 7,
   "snapshot_records": 5,
   "tombstones": 0
  },
  "cdc.new_column": {
   "columns_after": [
    "channel",
    "customer_id",
    "order_id",
    "status",
    "store_id",
    "total_cents"
   ],
   "columns_before": [
    "channel",
    "customer_id",
    "order_id",
    "status",
    "store_id",
    "total_cents"
   ],
   "new_column_in_after": true,
   "op": "u"
  },
  "cdc.replica_identity_full": {
   "after": {
    "customer_id": 1000,
    "order_id": 1,
    "status": "refunded",
    "store_id": "s01",
    "total_cents": 360
   },
   "before": {
    "customer_id": 1000,
    "order_id": 1,
    "status": "refunded",
    "store_id": "s01",
    "total_cents": 300
   },
   "op": "u"
  },
  "cdc.snapshot": {
   "customer_events": 3,
   "keys": [
    {
     "order_id": 1
    },
    {
     "order_id": 2
    }
   ],
   "ops": [
    "r"
   ],
   "order_events": 5,
   "snapshot_flags": [
    "first_in_data_collection",
    "last",
    "true"
   ],
   "topics": [
    "brewline.public.customers",
    "brewline.public.orders"
   ]
  },
  "cdc.wal_held_back": {
   "backlog_bytes_after_the_connector_caught_up": 536,
   "backlog_bytes_before_the_stop": 192,
   "backlog_bytes_while_stopped": 8315024,
   "backlog_is_small_after_catching_up": true,
   "bytes_kept_after_catching_up": 536,
   "bytes_the_slot_forces_postgres_to_keep": 8315296,
   "kept_is_small_after_catching_up": true,
   "more_than_1_mb_held": true,
   "rows_changed_while_stopped": 40000,
   "slot_active_while_stopped": "f",
   "wal_segment_bytes": 16777216
  },
  "connect.created": {
   "config_keys": [
    "connector.class",
    "file",
    "name",
    "tasks.max",
    "topic",
    "value.converter"
   ],
   "name": "src-orders",
   "status_code": 201,
   "type": "source"
  },
  "connect.dead_letter": {
   "dead_letter_value": "this line is not JSON",
   "exception_message": "Converting byte[] to Kafka Connect data failed due to serialization error: ",
   "header_names": [
    "__connect.errors.class.name",
    "__connect.errors.connector.name",
    "__connect.errors.exception.class.name",
    "__connect.errors.exception.message",
    "__connect.errors.exception.stacktrace",
    "__connect.errors.offset",
    "__connect.errors.partition",
    "__connect.errors.stage",
    "__connect.errors.task.id",
    "__connect.errors.topic"
   ],
   "lines_written": 10,
   "records_in_the_dead_letter_topic": 1,
   "records_read_by_the_sink": 11,
   "source_offset": "5",
   "source_topic": "bad-lines",
   "stage": "VALUE_CONVERTER",
   "task_state": "RUNNING"
  },
  "connect.failed_task": {
   "connector_state": "RUNNING",
   "first_line_of_the_trace": "org.apache.kafka.connect.errors.ConnectException: Tolerance exceeded in error handler",
   "lines_written_before_it_failed": 0,
   "records_in_the_topic": 11,
   "task_state": "FAILED"
  },
  "connect.offsets_after_20": {
   "file_bytes": 2075,
   "offsets": [
    {
     "offset": {
      "position": 2075
     },
     "partition": {
      "filename": "<file>"
     }
    }
   ],
   "position_equals_file_size": true,
   "status_code": 200
  },
  "connect.restart_and_reset": {
   "lines_in_the_file": 25,
   "records_after_20_lines": 20,
   "records_after_5_more_lines": 25,
   "records_after_a_restart": 25,
   "records_after_delete_and_create_with_the_same_name": 25,
   "records_after_the_offsets_were_reset": 50,
   "reset_message": "The offsets for this connector have been reset successfully",
   "reset_status_code": 200
  },
  "connect.sink_counts": {
   "lines_written_with_transforms": 50,
   "lines_written_without_transforms": 50,
   "records_in_the_topic": 50,
   "transforms": [
    "ReplaceField$Value (drop two fields)",
    "InsertField$Value (add a field)",
    "MaskField$Value (blank a field)"
   ]
  },
  "connect.status": {
   "connector_state": "RUNNING",
   "tasks": [
    {
     "id": 0,
     "state": "RUNNING"
    }
   ],
   "type": "source",
   "worker_id_is_the_worker": true
  },
  "connect.worker": {
   "plugins": 5,
   "rest_port": 8083,
   "status_code": 200,
   "version": "4.4.0"
  },
  "consumers.lag_total": {
   "committed": 3051,
   "lag": 2949,
   "lag_is_end_minus_committed": true,
   "records": 6000
  },
  "consumers.offsets_topic": {
   "group": "g-basic",
   "java_hash": -1694580920,
   "offset_commit_records_for_the_group_found_there": 6,
   "partition_computed": 20,
   "partitions_of_the_topic": 50
  },
  "consumers.rebalance_summary": {
   "cooperative": {
    "A starts": {
     "callbacks_with_no_partitions": 0,
     "partitions_revoked_from_members_that_stay": 0,
     "partitions_revoked_in_all": 0
    },
    "B joins": {
     "callbacks_with_no_partitions": 3,
     "partitions_revoked_from_members_that_stay": 3,
     "partitions_revoked_in_all": 3
    },
    "B leaves": {
     "callbacks_with_no_partitions": 0,
     "partitions_revoked_from_members_that_stay": 0,
     "partitions_revoked_in_all": 2
    },
    "C joins": {
     "callbacks_with_no_partitions": 5,
     "partitions_revoked_from_members_that_stay": 2,
     "partitions_revoked_in_all": 2
    }
   },
   "new_protocol": {
    "A starts": {
     "callbacks_with_no_partitions": 0,
     "partitions_revoked_from_members_that_stay": 0,
     "partitions_revoked_in_all": 0
    },
    "B joins": {
     "callbacks_with_no_partitions": 1,
     "partitions_revoked_from_members_that_stay": 3,
     "partitions_revoked_in_all": 3
    },
    "B leaves": {
     "callbacks_with_no_partitions": 0,
     "partitions_revoked_from_members_that_stay": 0,
     "partitions_revoked_in_all": 2
    },
    "C joins": {
     "callbacks_with_no_partitions": 2,
     "partitions_revoked_from_members_that_stay": 2,
     "partitions_revoked_in_all": 2
    }
   },
   "range": {
    "A starts": {
     "callbacks_with_no_partitions": 0,
     "partitions_revoked_from_members_that_stay": 0,
     "partitions_revoked_in_all": 0
    },
    "B joins": {
     "callbacks_with_no_partitions": 0,
     "partitions_revoked_from_members_that_stay": 6,
     "partitions_revoked_in_all": 6
    },
    "B leaves": {
     "callbacks_with_no_partitions": 0,
     "partitions_revoked_from_members_that_stay": 4,
     "partitions_revoked_in_all": 6
    },
    "C joins": {
     "callbacks_with_no_partitions": 0,
     "partitions_revoked_from_members_that_stay": 6,
     "partitions_revoked_in_all": 6
    }
   }
  },
  "consumers.too_slow": {
   "commit_error": [
    "UNKNOWN_MEMBER_ID",
    "Commit failed: Broker: Unknown member"
   ],
   "events": [
    "assigned",
    "lost",
    "assigned",
    "revoked"
   ],
   "max_poll_interval_ms": 6000,
   "poll_errors": [
    [
     "_MAX_POLL_EXCEEDED",
     "Application maximum poll interval (6000ms) exceeded by 399ms"
    ]
   ],
   "processing_took_seconds": 8.5
  },
  "delivery.tx_after_crash": {
   "batches_committed_before_the_crash": 6,
   "exit_code_of_the_first_run": 137,
   "records_of_the_open_transaction": 10,
   "records_seen_by_a_read_committed_consumer": 60,
   "records_seen_by_a_read_uncommitted_consumer": 70
  },
  "delivery.tx_after_restart": {
   "exit_code_of_the_second_run": 0,
   "orders_seen_twice_by_read_uncommitted": [
    61,
    62,
    63,
    64,
    65,
    66,
    67,
    68,
    69,
    70
   ],
   "read_committed_distinct_orders": 100,
   "read_committed_has_duplicates": false,
   "read_committed_in_order": true,
   "read_committed_records": 100,
   "read_uncommitted_distinct_orders": 100,
   "read_uncommitted_records": 110
  },
  "delivery.tx_markers": {
   "abort": 1,
   "commit": 10,
   "markers_in_the_log": 11,
   "transactions_that_wrote_records": 11
  },
  "keys.adding_summary": {
   "keys": 12,
   "moved": 6,
   "new_partitions": [
    3,
    4,
    5
   ],
   "stayed": 6
  },
  "keys.keyless": {
   "all_counts_are_multiples_of_the_batch_size": false,
   "batch_size": 100,
   "note": "the partition of a keyless batch is chosen at random, so the counts differ from run to run",
   "one_burst_largest_share": 0.744,
   "one_burst_records_per_partition_in_this_run": [
    8922,
    223,
    227,
    222,
    2174,
    232
   ],
   "partitions": 6,
   "records": 12000,
   "steady_stream_largest_share": 0.233,
   "steady_stream_records_per_partition_in_this_run": [
    1601,
    2100,
    2501,
    1300,
    2798,
    1700
   ],
   "steady_stream_smallest_share": 0.108
  },
  "keys.ordering": {
   "every_partition_is_in_order": true,
   "one_store_stays_in_one_partition": true,
   "partition_0_first_order_ids": [
    5,
    10,
    18,
    23,
    28,
    36,
    41,
    46
   ],
   "partition_1_first_order_ids": [
    2,
    3,
    20,
    21,
    38,
    39,
    43,
    56
   ]
  },
  "keys.placement_check": {
   "keys": 12,
   "keys_where_the_two_partitioners_disagree_on_6": 10,
   "my_murmur2_matches_the_broker_placement": true,
   "partition_counts_tried": [
    3,
    6,
    12
   ]
  },
  "keys.skew_summary": {
   "busiest_over_even": 3.23,
   "busiest_partition_records": 6456,
   "busiest_store": "s01",
   "busiest_store_records": 4056,
   "busiest_store_share": 0.338,
   "even_share_records": 2000,
   "partitions": 6,
   "records": 12000
  },
  "log.batch_small": {
   "baseSequence": -1,
   "batches": 1,
   "bytes": 637,
   "compresscodec": "none",
   "magic": 2,
   "producerId": -1,
   "records": 5
  },
  "log.dirs": {
   "brokers_holding_it": [
    1
   ],
   "partition_bytes": 1440934,
   "sum_of_files_bytes": 22414231
  },
  "log.index": {
   "all_entries": [
    [
     199,
     11791
    ],
    [
     299,
     23694
    ],
    [
     399,
     35593
    ],
    [
     499,
     47492
    ],
    [
     599,
     59395
    ],
    [
     699,
     71294
    ],
    [
     799,
     83193
    ],
    [
     899,
     95096
    ],
    [
     999,
     106995
    ],
    [
     1099,
     118895
    ],
    [
     1199,
     130898
    ],
    [
     1299,
     142897
    ],
    [
     1399,
     154896
    ],
    [
     1499,
     166899
    ],
    [
     1599,
     178898
    ],
    [
     1699,
     190897
    ],
    [
     1799,
     202900
    ],
    [
     1899,
     214899
    ],
    [
     1999,
     226898
    ],
    [
     2099,
     238901
    ],
    [
     2199,
     250900
    ],
    [
     2299,
     262899
    ],
    [
     2399,
     274902
    ],
    [
     2499,
     286901
    ],
    [
     2599,
     298900
    ],
    [
     2699,
     310903
    ],
    [
     2799,
     322902
    ],
    [
     2899,
     334901
    ],
    [
     2999,
     346904
    ],
    [
     3099,
     358903
    ],
    [
     3199,
     370902
    ],
    [
     3299,
     382905
    ],
    [
     3399,
     394904
    ],
    [
     3499,
     406903
    ],
    [
     3599,
     418906
    ],
    [
     3699,
     430905
    ],
    [
     3799,
     442904
    ],
    [
     3899,
     454907
    ],
    [
     3999,
     466906
    ],
    [
     4099,
     478905
    ],
    [
     4199,
     490908
    ],
    [
     4299,
     502907
    ],
    [
     4399,
     514906
    ],
    [
     4499,
     526909
    ],
    [
     4599,
     538908
    ],
    [
     4699,
     550907
    ],
    [
     4799,
     562910
    ],
    [
     4899,
     574909
    ],
    [
     4999,
     586908
    ],
    [
     5099,
     598911
    ],
    [
     5199,
     610910
    ],
    [
     5299,
     622909
    ],
    [
     5399,
     634912
    ],
    [
     5499,
     646911
    ],
    [
     5599,
     658910
    ],
    [
     5699,
     670913
    ],
    [
     5799,
     682912
    ],
    [
     5899,
     694911
    ],
    [
     5999,
     706914
    ],
    [
     6099,
     718913
    ],
    [
     6199,
     730912
    ],
    [
     6299,
     742915
    ],
    [
     6399,
     754914
    ],
    [
     6499,
     766913
    ],
    [
     6599,
     778916
    ],
    [
     6699,
     790915
    ],
    [
     6799,
     802914
    ],
    [
     6899,
     814917
    ],
    [
     6999,
     826916
    ],
    [
     7099,
     838915
    ],
    [
     7199,
     850918
    ],
    [
     7299,
     862917
    ],
    [
     7399,
     874916
    ],
    [
     7499,
     886919
    ],
    [
     7599,
     898918
    ],
    [
     7699,
     910917
    ],
    [
     7799,
     922920
    ],
    [
     7899,
     934919
    ],
    [
     7999,
     946918
    ],
    [
     8099,
     958921
    ],
    [
     8199,
     970920
    ],
    [
     8299,
     982919
    ],
    [
     8399,
     994922
    ],
    [
     8499,
     1006921
    ],
    [
     8599,
     1018920
    ],
    [
     8699,
     1030923
    ]
   ],
   "batch_last_offsets": [
    99,
    199,
    299,
    399,
    499,
    599,
    699,
    799,
    899,
    999,
    1099,
    1199,
    1299,
    1399,
    1499,
    1599,
    1699,
    1799,
    1899,
    1999,
    2099,
    2199,
    2299,
    2399,
    2499,
    2599,
    2699,
    2799,
    2899,
    2999,
    3099,
    3199,
    3299,
    3399,
    3499,
    3599,
    3699,
    3799,
    3899,
    3999,
    4099,
    4199,
    4299,
    4399,
    4499,
    4599,
    4699,
    4799,
    4899,
    4999,
    5099,
    5199,
    5299,
    5399,
    5499,
    5599,
    5699,
    5799,
    5899,
    5999,
    6099,
    6199,
    6299,
    6399,
    6499,
    6599,
    6699,
    6799,
    6899,
    6999,
    7099,
    7199,
    7299,
    7399,
    7499,
    7599,
    7699,
    7799,
    7899,
    7999,
    8099,
    8199,
    8299,
    8399,
    8499,
    8599,
    8699
   ],
   "batch_sizes": [
    11791,
    11903,
    11899,
    11899,
    11903,
    11899,
    11899,
    11903,
    11899,
    11900,
    12003,
    11999,
    11999,
    12003,
    11999,
    11999,
    12003,
    11999,
    11999,
    12003,
    11999,
    11999,
    12003,
    11999,
    11999,
    12003,
    11999,
    11999,
    12003,
    11999,
    11999,
    12003,
    11999,
    11999,
    12003,
    11999,
    11999,
    12003,
    11999,
    11999,
    12003,
    11999,
    11999,
    12003,
    11999,
    11999,
    12003,
    11999,
    11999,
    12003,
    11999,
    11999,
    12003,
    11999,
    11999,
    12003,
    11999,
    11999,
    12003,
    11999,
    11999,
    12003,
    11999,
    11999,
    12003,
    11999,
    11999,
    12003,
    11999,
    11999,
    12003,
    11999,
    11999,
    12003,
    11999,
    11999,
    12003,
    11999,
    11999,
    12003,
    11999,
    11999,
    12003,
    11999,
    11999,
    12003,
    11999
   ],
   "batches": 87,
   "bytes_per_entry": 8,
   "entries": 86,
   "first_batch_has_an_entry": false,
   "first_entries": [
    [
     199,
     11791
    ],
    [
     299,
     23694
    ],
    [
     399,
     35593
    ],
    [
     499,
     47492
    ],
    [
     599,
     59395
    ],
    [
     699,
     71294
    ]
   ],
   "index_interval_bytes": 4096,
   "last_entry": [
    8699,
    1030923
   ]
  },
  "log.offsets_by_time": {
   "earliest": 0,
   "first_event_time_ms": 1767225600000,
   "latest": 12000,
   "offset_after_everything": null,
   "offset_at_event_6000s": 6000,
   "offset_before_everything": 0
  },
  "log.overhead": {
   "batch_bytes": 177,
   "batch_header_bytes": 61,
   "bytes_that_are_not_data": 70,
   "key_and_value_bytes": 107,
   "record_overhead_bytes": 9
  },
  "log.roll": {
   "batches_in_first_segment": 87,
   "first_segment_bytes": 1042922,
   "index_bytes_active": 10485760,
   "index_bytes_closed": 688,
   "next_batch_bytes": 11999,
   "records": 12000,
   "second_segment_first_offset": 8700,
   "segment_limit_bytes": 1048576,
   "timeindex_bytes_active": 10485756,
   "timeindex_bytes_closed": 1032,
   "would_not_fit": true
  },
  "log.timeindex": {
   "bytes_per_entry": 12,
   "entries": 86,
   "first_entries": [
    [
     1767225799000,
     199
    ],
    [
     1767225899000,
     299
    ],
    [
     1767225999000,
     399
    ]
   ]
  },
  "ops.metrics_reading": {
   "bean_of_under_replicated": "kafka.server:type=ReplicaManager,name=UnderReplicatedPartitions",
   "leaders_on_brokers_2_and_3_when_broker_1_is_dead": 3.0,
   "offline_when_broker_1_is_dead": 0.0,
   "partitions_with_a_replica_on_broker_1": 3,
   "tool": "kafka-jmx.sh",
   "under_replicated_when_broker_1_is_dead": 3.0,
   "under_replicated_when_healthy": 0.0
  },
  "ops.quota": {
   "burst_the_window_allows_bytes": 2200000,
   "bytes_sent": 6356894,
   "client_with_the_quota_waited_ms_at_most": 9991,
   "client_without_a_quota_waited_ms": 0,
   "quota_bytes_per_second": 200000,
   "seconds_the_quota_forces_at_least": 20.8,
   "sent_more_than_the_burst": true,
   "the_broker_asked_the_client_to_wait": true,
   "the_client_with_the_quota_took_longer": true,
   "window_samples": 11,
   "window_seconds_each": 1
  },
  "ops.reassign_result": {
   "folder_exists_on_broker": {
    "1": false,
    "2": true,
    "3": true,
    "4": true
   },
   "log_bytes_on_the_new_broker_equals_the_others": true,
   "records": 3000,
   "replicas_after": [
    2,
    3,
    4
   ],
   "replicas_before": [
    1,
    2,
    3
   ],
   "throttle_bytes_per_second": 50000000
  },
  "ops.rolling_restart": {
   "acks": "all",
   "brokers_restarted": 3,
   "delivery_reports_ok": 4788,
   "distinct_orders": 4788,
   "duplicates": 0,
   "errors": 0,
   "idempotent_producer": true,
   "lost": 0,
   "min_insync_replicas": 2,
   "orders_sent": 4788,
   "records_in_the_topic": 4788
  },
  "producers.timestamps": {
   "append_time_topic_replaced_it": true,
   "create_time_topic_keeps_the_producers_time": true,
   "days_between_the_two": 315,
   "first_producer_time": 1767225600000
  },
  "replication.caught_up_equal": {
   "records": 1500,
   "same_bytes_on_all_three": true
  },
  "replication.copies_equal": {
   "records": 1000,
   "same_bytes_on_all_three": true,
   "same_crc_of_every_batch": true
  },
  "replication.preferred_election_result": {
   "leader_of_partition_0": 1,
   "preferred_leader": 1
  },
  "replication.unclean_lost": {
   "lost_count": 50,
   "lost_order_ids_first_last": [
    101,
    150
   ],
   "safe_lost_count": 0
  },
  "replication.under_replicated_count": {
   "under_min_isr_partitions": 3,
   "under_replicated_partitions": 3
  },
  "replication.while_one_is_down": {
   "in_sync_replicas": 2,
   "min_insync_replicas": 2,
   "outcomes": {
    "delivered": 500
   },
   "sent_to_partition_0": 500
  },
  "retention.backfill": {
   "age_of_the_records_days": 315,
   "earliest_offset_after": 100,
   "earliest_offset_before": 0,
   "next_offset_after": 100,
   "next_offset_before": 100,
   "records_left": 0,
   "retention_of_the_topic": "the default, seven days",
   "topic_config_lines": [
    "Dynamic configs for topic backfill are:"
   ],
   "written": 100
  },
  "retention.by_size_summary": {
   "bytes_left_in_the_log_files": 3786104,
   "earliest_offset": 8700,
   "next_offset": 40000,
   "records_left": 31300,
   "retention_bytes": 3000000,
   "segment_bytes": 1048576,
   "segments_left": 4,
   "the_active_segment_is_never_deleted": true,
   "written_records": 40000
  },
  "retention.by_time_rule": {
   "deleted_whole_segments_only": true,
   "first_state_earliest": 0,
   "retention_ms": 5000,
   "second_state_earliest": 50,
   "segment_ms": 1000
  },
  "retention.compaction_after": {
   "every_surviving_value_is_the_last_one": true,
   "first_offset": 48,
   "gaps_in_the_offsets": 2,
   "highest_offset_before": 61,
   "last_offset": 62,
   "offsets_are_unchanged": true,
   "records": 13,
   "tombstones_still_there": 2
  },
  "retention.compaction_before": {
   "keys": 12,
   "records": 62,
   "tombstones": 2,
   "topic_config_lines": [
    "Dynamic configs for topic latest are:",
    "cleanup.policy=compact sensitive=false synonyms={DYNAMIC_TOPIC_CONFIG:cleanup.policy=compact, DEFAULT_CONFIG:log.cleanup.policy=delete}"
   ]
  },
  "retention.compaction_tombstones_gone": {
   "deleted_keys_are_gone": true,
   "keys": [
    "s01",
    "s02",
    "s03",
    "s04",
    "s05",
    "s06",
    "s07",
    "s08",
    "s09",
    "s10"
   ],
   "keys_that_were_deleted": [
    "s11",
    "s12"
   ],
   "records": 12
  },
  "retention.delete_records_result": {
   "asked_to_keep_from_offset": 39900,
   "earliest_offset_now": 39900,
   "next_offset_now": 40000
  },
  "schemas.drift": {
   "consumer_with_a_default_total_cents": 1870,
   "orders": 10,
   "renamed_from_order": 6,
   "silently_missing_cents": 2795,
   "strict_consumer_error": "KeyError: 'total_cents' (at order 6)",
   "total_before_it_stopped": 1870,
   "true_total_cents": 4665
  },
  "schemas.registry": {
   "ids_in_the_backward_subject": [
    1,
    2,
    3
   ],
   "real_registry_stores_its_schemas_in": "a compacted topic of its own, from documentation",
   "schemas_stored_in_the_backward_subject": 3,
   "schemas_stored_in_the_full_subject": 2,
   "stand_in": true
  },
  "schemas.wire_format": {
   "avro_payload_bytes": 15,
   "decoded_equals_the_record": true,
   "first_five_bytes_hex": "0000000001",
   "json_bytes_of_the_same_record": 84,
   "magic_byte": 0,
   "message_bytes": 20,
   "schema_id": 1
  },
  "security.listeners": {
   "authorizer": "StandardAuthorizer",
   "listeners": [
    "SASL_PLAINTEXT (SCRAM-SHA-256)",
    "SSL (client certificates required)",
    "CONTROLLER"
   ],
   "principal_of_a_certificate": "User:C=NL,O=Brewline,OU=Brewline,CN=carol",
   "subject_of_the_certificate": "CN=carol,OU=Brewline,O=Brewline,C=NL",
   "super_users": [
    "User:admin",
    "User:ANONYMOUS (only the plaintext controller listener of this one-node recording lets anonymous in)"
   ]
  },
  "streams.channel_counts": {
   "counts": {
    "app": 200,
    "counter": 200,
    "web": 200
   },
   "every_count_is_right": true,
   "value_bytes": 8
  },
  "streams.counts_check": {
   "every_count_is_right": true,
   "expected_windows": 110,
   "minutes_of_event_time": 10,
   "one_update_per_input_record": true,
   "orders_in": 600,
   "records_in_the_output_topic": 600,
   "windows_with_a_count": 110
  },
  "streams.group_and_transactions": {
   "consumer_group_exists": true,
   "transactional_ids": 1
  },
  "streams.late": {
   "count_of_that_window": [
    21,
    22
   ],
   "count_of_the_closed_window": [
    22,
    22
   ],
   "dropped_records_metric": 1.0,
   "grace_seconds": 30,
   "record_20_seconds_late_counted": true,
   "record_in_a_closed_window_counted": false
  },
  "streams.restart": {
   "count_after_the_state_was_deleted_and_one_more_order": 4,
   "count_of_the_window_after_three_new_orders": 3,
   "nothing_was_processed_twice": true,
   "output_records_after_the_restart": 601,
   "output_records_before_the_restart": 601,
   "restoration_log_lines": [
    "StoreChangelogReader: state-updater [store-counts-<id>-StateUpdater-1] Restoration in progress for 1 partitions. {store-counts-orders-per-channel-changelog-2: position=115, end=206, totalRestored=1}",
    "StoreChangelogReader: state-updater [store-counts-<id>-StateUpdater-1] Finished restoring changelog store-counts-orders-per-channel-changelog-2 to store orders-per-channel with a total number of 88 records",
    "StoreChangelogReader: state-updater [store-counts-<id>-StateUpdater-1] Finished restoring changelog store-counts-orders-per-store-minute-changelog-2 to store orders-per-store-minute with a total number of 344 records"
   ],
   "the_count_continued_from_the_rebuilt_state": true
  },
  "streams.state_on_disk": {
   "files_of_note": [
    "store-counts/.lock",
    "store-counts/kafka-streams-process-metadata"
   ],
   "task_folders": [
    "0_0",
    "0_1",
    "0_2",
    "1_0",
    "1_1",
    "1_2"
   ]
  },
  "tests.idempotent_demo": {
   "applied_position": {
    "0": 9
   },
   "bad_in_the_replay": 0,
   "bad_offsets": [
    3
   ],
   "exit_code": 0,
   "first_pass_offsets": [
    0,
    6
   ],
   "replay_offsets": [
    4,
    9
   ],
   "same_as_a_run_without_a_replay": true,
   "state_after_the_first_pass": {
    "0": 100,
    "1": 101,
    "2": 102,
    "4": 104,
    "5": 105,
    "6": 106
   },
   "state_after_the_replay": {
    "0": 100,
    "1": 101,
    "2": 102,
    "4": 104,
    "5": 105,
    "6": 106,
    "7": 107,
    "8": 108,
    "9": 109
   },
   "tests": 4,
   "tests_passed": 4,
   "the_replay_changed_nothing_that_was_applied": true
  },
  "tests.summary": {
   "clean": {
    "exit_code": 0,
    "passed": 4
   },
   "tests": 4,
   "tests_that_need_a_broker": 1,
   "unit_tests_only": {
    "deselected": 1,
    "exit_code": 0,
    "passed": 3
   },
   "with_a_bug": {
    "exit_code": 1,
    "failed": 2,
    "passed": 2
   }
  },
  "world.cluster": {
   "broker_ports": [
    9092,
    9192,
    9292
   ],
   "nodes": 3,
   "roles": "broker,controller",
   "version": "4.4.0",
   "voter_ports": [
    9093,
    9193,
    9293
   ],
   "voters": [
    1,
    2,
    3
   ]
  },
  "world.metadata_records": {
   "kinds_seen": [
    "BEGIN_TRANSACTION_RECORD",
    "BROKER_REGISTRATION_CHANGE_RECORD",
    "CLEAR_ELR_RECORD",
    "CONFIG_RECORD",
    "END_TRANSACTION_RECORD",
    "FEATURE_LEVEL_RECORD",
    "PARTITION_RECORD",
    "PRODUCER_IDS_RECORD",
    "REGISTER_BROKER_RECORD",
    "REGISTER_CONTROLLER_RECORD",
    "TOPIC_RECORD"
   ]
  },
  "world.tools": {
   "named_in_the_course": 37,
   "not_named": [
    "kafka-run-class",
    "kafka-share-consumer-perf-test",
    "kafka-streams-application-reset",
    "kafka-verifiable-consumer",
    "kafka-verifiable-producer",
    "kafka-verifiable-share-consumer",
    "trogdor"
   ],
   "scripts_in_bin": 44
  }
 },
 "files": {
  "code/app/StoreCounts.java": "import java.time.Duration;\nimport java.util.Properties;\n\nimport org.apache.kafka.common.serialization.Serdes;\nimport org.apache.kafka.streams.KafkaStreams;\nimport org.apache.kafka.streams.KeyValue;\nimport org.apache.kafka.streams.StreamsBuilder;\nimport org.apache.kafka.streams.StreamsConfig;\nimport org.apache.kafka.streams.Topology;\nimport org.apache.kafka.streams.kstream.Materialized;\nimport org.apache.kafka.streams.kstream.Produced;\nimport org.apache.kafka.streams.kstream.TimeWindows;\n\n/**\n * Counts orders as they arrive: per store and per minute of event time, and per sales channel.\n *\n * The first count is windowed: a window is one minute of event time, and it stays open for 30 more seconds for records that arrive late.\n * The second count needs a new key (the channel), so Kafka Streams moves the records through a repartition topic first.\n * Processing is exactly-once: the state, the output and the position in the input are committed together.\n */\npublic class StoreCounts {\n    public static void main(String[] args) throws Exception {\n        String bootstrap = args[0];\n        String stateDir = args[1];\n\n        Properties props = new Properties();\n        props.put(StreamsConfig.APPLICATION_ID_CONFIG, \"store-counts\");\n        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrap);\n        props.put(StreamsConfig.STATE_DIR_CONFIG, stateDir);\n        props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG, StreamsConfig.EXACTLY_ONCE_V2);\n        props.put(StreamsConfig.COMMIT_INTERVAL_MS_CONFIG, 300);\n        props.put(StreamsConfig.STATESTORE_CACHE_MAX_BYTES_CONFIG, 0);          // no cache: every update is sent on, so that the lesson can see every step\n        props.put(StreamsConfig.NUM_STREAM_THREADS_CONFIG, 1);\n        props.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, Serdes.StringSerde.class);\n        props.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, Serdes.StringSerde.class);\n        props.put(StreamsConfig.consumerPrefix(\"auto.offset.reset\"), \"earliest\");\n\n        StreamsBuilder builder = new StreamsBuilder();\n        var orders = builder.<String, String>stream(\"orders-s\");\n\n        orders.groupByKey()\n              .windowedBy(TimeWindows.ofSizeAndGrace(Duration.ofMinutes(1), Duration.ofSeconds(30)))\n              .count(Materialized.as(\"orders-per-store-minute\"))\n              .toStream()\n              .map((window, count) -> KeyValue.pair(window.key() + \"@\" + window.window().startTime(), Long.toString(count)))\n              .to(\"order-counts\");\n\n        orders.selectKey((key, json) -> channelOf(json))\n              .groupByKey()\n              .count(Materialized.as(\"orders-per-channel\"))\n              .toStream()\n              .to(\"channel-counts\", Produced.with(Serdes.String(), Serdes.Long()));\n\n        Topology topology = builder.build();\n        System.out.println(\"TOPOLOGY-BEGIN\");\n        System.out.println(topology.describe());\n        System.out.println(\"TOPOLOGY-END\");\n\n        KafkaStreams streams = new KafkaStreams(topology, props);\n        Runtime.getRuntime().addShutdownHook(new Thread(streams::close));\n        streams.setStateListener((now, before) -> System.out.println(\"STATE \" + before + \" -> \" + now));\n        streams.start();\n        Thread reporter = new Thread(() -> {\n            try {\n                while (true) {\n                    Thread.sleep(1000);\n                    double dropped = 0;\n                    for (var entry : streams.metrics().entrySet()) {\n                        if (entry.getKey().name().equals(\"dropped-records-total\") && entry.getKey().group().equals(\"stream-task-metrics\")) {\n                            dropped += ((Number) entry.getValue().metricValue()).doubleValue();       // one value for each task: add them up\n                        }\n                    }\n                    System.out.println(\"METRIC dropped-records-total \" + dropped);\n                }\n            } catch (InterruptedException e) {\n                // the program is closing\n            }\n        });\n        reporter.setDaemon(true);\n        reporter.start();\n        Thread.currentThread().join();\n    }\n\n    /** The sales channel of an order: the text between the quotes after \"channel\":. */\n    static String channelOf(String json) {\n        int start = json.indexOf(\"\\\"channel\\\":\\\"\") + 11;\n        return json.substring(start, json.indexOf('\"', start));\n    }\n}",
  "code/app/conftest.py": "import os\nimport uuid\n\nimport pytest\nfrom confluent_kafka import Producer\nfrom confluent_kafka.admin import AdminClient, NewTopic\n\n\n@pytest.fixture(scope='session')\ndef bootstrap():\n    \"\"\"The tests that need a broker run against the one that KAFKA_BOOTSTRAP names, and are skipped when it is not set.\"\"\"\n    value = os.environ.get('KAFKA_BOOTSTRAP')\n    if not value:\n        pytest.skip('KAFKA_BOOTSTRAP is not set')\n    return value\n\n\n@pytest.fixture\ndef topic(bootstrap):\n    \"\"\"A topic of its own for each test, so that tests do not see each other's records.\"\"\"\n    name = 'test-' + uuid.uuid4().hex[:8]\n    admin = AdminClient({'bootstrap.servers': bootstrap})          # keep the client alive until the topic exists\n    for f in admin.create_topics([NewTopic(name, num_partitions=2, replication_factor=1)]).values():\n        f.result(30)\n    return name\n\n\n@pytest.fixture\ndef send(bootstrap):\n    def _send(topic, items):\n        p = Producer({'bootstrap.servers': bootstrap})\n        for key, value in items:\n            p.produce(topic, key=key, value=value)\n        p.flush(30)\n    return _send",
  "code/app/idempotent.py": "\"\"\"A consumer that is safe to run twice. After a restart, a consumer reads some messages again (at-least-once delivery), so applying a message must be harmless the second time.\nTwo rules do it: skip what was already applied (a position for each partition), and write by key, so that the same order always gives the same row.\"\"\"\nimport json\n\n\ndef apply(batch, state, applied):\n    \"\"\"batch: messages with partition(), offset() and value(), like the messages of confluent-kafka.\n    state: {order_id: total_cents}, the sink. applied: {partition: the highest offset that was applied}.\n    Returns the messages that are not valid orders, so that the caller can set them aside.\"\"\"\n    bad = []\n    for m in batch:\n        if m.offset() <= applied.get(m.partition(), -1):\n            continue                                    # seen before: a replay after a restart\n        try:\n            order = json.loads(m.value())\n            order_id, cents = order['order_id'], order['total_cents']\n        except (ValueError, KeyError, TypeError):\n            bad.append(m)                               # set it aside, and go on with the rest\n        else:\n            state[order_id] = cents                     # write by key: the same order twice gives the same row\n        applied[m.partition()] = m.offset()\n    return bad",
  "code/app/order_totals.py": "\"\"\"Totals of paid orders for each store, from the messages of a topic. The part that decides what a message means is a plain function, so that it can be tested without a broker.\"\"\"\nimport json\nfrom collections import defaultdict\n\nfrom confluent_kafka import Consumer, TopicPartition\n\n\ndef total_by_store(messages):\n    \"\"\"messages: objects with a value() method, like the messages of confluent-kafka. Returns ({store: cents of paid orders}, the messages that are not JSON).\"\"\"\n    totals, bad = defaultdict(int), []\n    for m in messages:\n        try:\n            order = json.loads(m.value())\n        except (ValueError, TypeError):\n            bad.append(m)\n            continue\n        if order.get('status') != 'paid':\n            continue                      # a refunded order is not a sale\n        totals[order['store_id']] += order['total_cents']\n    return dict(totals), bad\n\n\ndef read_topic(bootstrap, topic, group, timeout=20):\n    \"\"\"Read every message of a topic, from the start to the end of each partition.\"\"\"\n    c = Consumer({'bootstrap.servers': bootstrap, 'group.id': group, 'auto.offset.reset': 'earliest', 'enable.auto.commit': False, 'enable.partition.eof': True})\n    parts = sorted(c.list_topics(topic, timeout=10).topics[topic].partitions)\n    c.assign([TopicPartition(topic, p, 0) for p in parts])\n    out, done = [], set()\n    import time\n    t0 = time.time()\n    while len(done) < len(parts) and time.time() - t0 < timeout:\n        m = c.poll(0.5)\n        if m is None:\n            continue\n        if m.error():\n            if m.error().code() == -191:           # the end of a partition\n                done.add(m.partition())\n            continue\n        out.append(m)\n    c.close()\n    return out",
  "code/app/order_totals_bug.py": "\"\"\"Totals of paid orders for each store, from the messages of a topic. The part that decides what a message means is a plain function, so that it can be tested without a broker.\"\"\"\nimport json\nfrom collections import defaultdict\n\nfrom confluent_kafka import Consumer, TopicPartition\n\n\ndef total_by_store(messages):\n    \"\"\"messages: objects with a value() method, like the messages of confluent-kafka. Returns ({store: cents of paid orders}, the messages that are not JSON).\"\"\"\n    totals, bad = defaultdict(int), []\n    for m in messages:\n        try:\n            order = json.loads(m.value())\n        except (ValueError, TypeError):\n            bad.append(m)\n            continue\n        totals[order['store_id']] += order['total_cents']\n    return dict(totals), bad\n\n\ndef read_topic(bootstrap, topic, group, timeout=20):\n    \"\"\"Read every message of a topic, from the start to the end of each partition.\"\"\"\n    c = Consumer({'bootstrap.servers': bootstrap, 'group.id': group, 'auto.offset.reset': 'earliest', 'enable.auto.commit': False, 'enable.partition.eof': True})\n    parts = sorted(c.list_topics(topic, timeout=10).topics[topic].partitions)\n    c.assign([TopicPartition(topic, p, 0) for p in parts])\n    out, done = [], set()\n    import time\n    t0 = time.time()\n    while len(done) < len(parts) and time.time() - t0 < timeout:\n        m = c.poll(0.5)\n        if m is None:\n            continue\n        if m.error():\n            if m.error().code() == -191:           # the end of a partition\n                done.add(m.partition())\n            continue\n        out.append(m)\n    c.close()\n    return out",
  "code/app/pipeline.py": "\"\"\"A consume-transform-produce pipeline that reads orders from one topic and writes them to another, with exactly-once processing.\n\nEach batch of ten orders is one transaction: the outputs and the position of the consumer are committed together, or not at all.\nRun it as a script with --crash-in-batch N to make the process die in the middle of batch N, after its outputs were sent and before the transaction was committed.\n\"\"\"\nimport argparse\nimport json\nimport os\n\nfrom confluent_kafka import Consumer, Producer\n\n\ndef transform(value):\n    \"\"\"The made-up business rule: add the total in euros.\"\"\"\n    o = json.loads(value)\n    o['total_eur'] = o['total_cents'] / 100\n    return json.dumps(o, separators=(',', ':')).encode()\n\n\ndef run_pipeline(bootstrap, crash_in_batch=None, batch_size=10, transactional_id='tx-pipeline-1'):\n    consumer = Consumer({'bootstrap.servers': bootstrap, 'group.id': 'tx-pipeline', 'auto.offset.reset': 'earliest', 'enable.auto.commit': False,\n                         'isolation.level': 'read_committed', 'session.timeout.ms': 6000})\n    producer = Producer({'bootstrap.servers': bootstrap, 'transactional.id': transactional_id, 'transaction.timeout.ms': 20000, 'linger.ms': 0})\n    producer.init_transactions()                 # fences any older producer with the same transactional.id and aborts what it left open\n    consumer.subscribe(['tx-in'])\n    batch_no = 0\n    while True:\n        # the first wait is long: after a crash, the group has to notice that the old member is gone (the session timeout) before it hands out the partition again\n        msgs = [m for m in consumer.consume(num_messages=batch_size, timeout=30 if batch_no == 0 else 5) if not m.error()]\n        if not msgs:\n            break\n        batch_no += 1\n        producer.begin_transaction()\n        for m in msgs:\n            producer.produce('tx-out', key=m.key(), value=transform(m.value()))\n        producer.flush()\n        if crash_in_batch == batch_no:\n            os._exit(137)                        # the process dies here: the outputs are in the topic, the transaction is not finished\n        producer.send_offsets_to_transaction(consumer.position(consumer.assignment()), consumer.consumer_group_metadata())\n        producer.commit_transaction()\n    consumer.close()\n    return batch_no\n\n\nif __name__ == '__main__':\n    ap = argparse.ArgumentParser()\n    ap.add_argument('--bootstrap', required=True)\n    ap.add_argument('--crash-in-batch', type=int)\n    a = ap.parse_args()\n    print('batches committed or crashed in:', run_pipeline(a.bootstrap, a.crash_in_batch))",
  "code/app/test_idempotent.py": "import json\n\nfrom idempotent import apply\n\n\nclass Msg:\n    \"\"\"A stand-in for a message: the function under test only calls partition(), offset() and value().\"\"\"\n\n    def __init__(self, partition, offset, value):\n        self._p, self._o, self._v = partition, offset, value\n\n    def partition(self):\n        return self._p\n\n    def offset(self):\n        return self._o\n\n    def value(self):\n        return self._v\n\n\ndef order(order_id, cents):\n    return json.dumps({'order_id': order_id, 'store_id': 's01', 'total_cents': cents, 'status': 'paid'}).encode()\n\n\ndef batch(first, last, partition=0):\n    return [Msg(partition, o, order(o, 100 + o)) for o in range(first, last + 1)]\n\n\ndef test_the_same_batch_twice_changes_nothing():\n    state, applied = {}, {}\n    apply(batch(0, 4), state, applied)\n    once = dict(state)\n    apply(batch(0, 4), state, applied)\n    assert state == once\n    assert len(state) == 5\n\n\ndef test_a_replay_that_overlaps_gives_the_same_answer_as_no_replay():\n    state, applied = {}, {}\n    apply(batch(0, 6), state, applied)\n    apply(batch(4, 9), state, applied)                  # the consumer restarted and read offsets 4 to 6 again\n    expected, expected_applied = {}, {}\n    apply(batch(0, 9), expected, expected_applied)\n    assert state == expected\n    assert applied == expected_applied == {0: 9}\n\n\ndef test_a_message_that_is_not_an_order_is_returned_and_the_rest_goes_on():\n    state, applied = {}, {}\n    messages = [Msg(0, 0, order(1, 300)), Msg(0, 1, b'not json'), Msg(0, 2, order(2, 450))]\n    bad = apply(messages, state, applied)\n    assert state == {1: 300, 2: 450}\n    assert [m.offset() for m in bad] == [1]\n    assert applied == {0: 2}                            # the bad message is not read again\n\n\ndef test_each_partition_has_its_own_position():\n    state, applied = {}, {}\n    apply(batch(0, 2, partition=0) + batch(0, 2, partition=1), state, applied)\n    assert applied == {0: 2, 1: 2}",
  "code/app/test_order_totals.py": "import json\nimport os\nimport importlib\n\nimport pytest\n\norder_totals = importlib.import_module(os.environ.get('ORDER_TOTALS_MODULE', 'order_totals'))\n\n\nclass Msg:\n    \"\"\"A stand-in for a message: the function under test only calls value().\"\"\"\n\n    def __init__(self, value):\n        self._value = value\n\n    def value(self):\n        return self._value\n\n\ndef order(order_id, store, cents, status='paid'):\n    return json.dumps({'order_id': order_id, 'store_id': store, 'total_cents': cents, 'status': status}).encode()\n\n\ndef test_paid_orders_are_added_up_by_store():\n    totals, bad = order_totals.total_by_store([Msg(order(1, 's01', 300)), Msg(order(2, 's01', 450)), Msg(order(3, 's02', 200))])\n    assert totals == {'s01': 750, 's02': 200}\n    assert bad == []\n\n\ndef test_a_refunded_order_is_not_a_sale():\n    totals, _ = order_totals.total_by_store([Msg(order(1, 's01', 300)), Msg(order(2, 's01', 450, 'refunded'))])\n    assert totals == {'s01': 300}\n\n\ndef test_a_message_that_is_not_json_is_set_aside():\n    totals, bad = order_totals.total_by_store([Msg(order(1, 's01', 300)), Msg(b'not json')])\n    assert totals == {'s01': 300}\n    assert len(bad) == 1\n\n\ndef test_totals_of_a_real_topic_match_the_totals_of_the_sent_orders(bootstrap, topic, send):\n    sent = [(f's0{1 + i % 3}', order(i, f's0{1 + i % 3}', 100 + i, 'refunded' if i % 5 == 0 else 'paid')) for i in range(60)]\n    send(topic, sent)\n    got, bad = order_totals.total_by_store(order_totals.read_topic(bootstrap, topic, 'test-group-' + topic))\n    expected = {}\n    for key, value in sent:\n        o = json.loads(value)\n        if o['status'] == 'paid':\n            expected[o['store_id']] = expected.get(o['store_id'], 0) + o['total_cents']\n    assert got == expected\n    assert bad == []",
  "code/cdc.py": "\"\"\"Mission 10: change data capture. PostgreSQL 16 with logical decoding, the Debezium PostgreSQL connector on the Kafka Connect worker of the distribution, and a topic of change events.\n\nWhat is real: the database, the replication slot, the connector (Debezium 3.7.1.Final from Maven Central), the events in the topics, the WAL that the slot holds back.\nWhat is a stand-in: nothing in the data path. The database is small and made up, and nothing is timed.\n\"\"\"\nimport json\nimport os\nimport pathlib\nimport re\nimport signal\nimport time\n\nimport cluster as C\nimport kx\nfrom connect import Worker, wait_count\nfrom postgres import Pg\n\nDBZ = os.environ.get('DEBEZIUM_PLUGINS', '')          # the folder that holds debezium-connector-postgres/\nFLAT_MSG = 'io.debezium.transforms.ExtractNewRecordState'\n\n\ndef connector_config(pg, prefix, slot, extra=None):\n    cfg = {'connector.class': 'io.debezium.connector.postgresql.PostgresConnector', 'tasks.max': '1',\n           'database.hostname': 'localhost', 'database.port': str(pg.port), 'database.user': 'debezium', 'database.password': 'not-a-real-password', 'database.dbname': 'brewline',\n           'topic.prefix': prefix, 'table.include.list': 'public.customers,public.orders', 'plugin.name': 'pgoutput', 'slot.name': slot,\n           'publication.name': 'dbz_publication', 'publication.autocreate.mode': 'disabled', 'snapshot.mode': 'initial',\n           'key.converter': 'org.apache.kafka.connect.json.JsonConverter', 'key.converter.schemas.enable': 'false',\n           'value.converter': 'org.apache.kafka.connect.json.JsonConverter', 'value.converter.schemas.enable': 'false'}\n    cfg.update(extra or {})\n    return cfg\n\n\ndef clean_event(raw):\n    \"\"\"A change event as a Python value, with the numbers that differ from run to run replaced by a marker.\"\"\"\n    if raw is None:\n        return None\n    ev = json.loads(raw)\n    src = ev.get('source') or {}\n    for k in ('ts_ms', 'ts_us', 'ts_ns', 'lsn', 'txId', 'sequence', 'xmin'):\n        if k in src:\n            src[k] = '<' + k + '>'\n    for k in ('ts_ms', 'ts_us', 'ts_ns'):\n        if k in ev:\n            ev[k] = '<' + k + '>'\n    if 'transaction' in ev:\n        ev.pop('transaction')\n    return ev\n\n\ndef events(c, topic, n, timeout=60):\n    msgs = wait_count(c, topic, n, timeout)\n    return [(m[2], m[3]) for m in msgs]\n\n\ndef pretty(ev):\n    return json.dumps(ev, indent=2, sort_keys=False)\n\n\ndef slot_row(pg):\n    r = pg.psql(\"select slot_name, plugin, active, wal_status from pg_replication_slots order by slot_name;\")\n    return [x.split('|') for x in r.splitlines()]\n\n\ndef retained_bytes(pg, slot):\n    \"\"\"The WAL that the slot forces PostgreSQL to keep: from the oldest position that it may still need (restart_lsn) to the end of the log.\"\"\"\n    return int(pg.psql(\"select pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)::bigint from pg_replication_slots where slot_name='%s';\" % slot))\n\n\ndef backlog_bytes(pg, slot):\n    \"\"\"The changes that the connector has not confirmed yet: from confirmed_flush_lsn to the end of the log.\"\"\"\n    return int(pg.psql(\"select pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)::bigint from pg_replication_slots where slot_name='%s';\" % slot))\n\n\ndef record_cdc(c, rec):\n    assert DBZ and pathlib.Path(DBZ, 'debezium-connector-postgres').exists(), 'set DEBEZIUM_PLUGINS to the folder that holds debezium-connector-postgres/'\n    kx.delete_topics(c.bootstrap, ['connect-offsets', 'connect-configs', 'connect-status'])\n    pg = Pg().start()\n    plugin_path = str(C.check_home() / 'libs' / ('connect-file-%s.jar' % C.version())) + ',' + DBZ\n    w = Worker(c, name='cdc', group='cdc-demo', extra={'plugin.path': plugin_path, 'offset.flush.interval.ms': 2000}).start()\n    try:\n        run(c, rec, pg, w)\n    finally:\n        w.stop()\n        pg.stop()\n\n\ndef run(c, rec, pg, w):\n    # ---- the database ----\n    pg.psql(\"\"\"\n      CREATE ROLE debezium WITH LOGIN REPLICATION PASSWORD 'not-a-real-password';\n      CREATE TABLE customers (customer_id int PRIMARY KEY, name text NOT NULL, email text);\n      CREATE TABLE orders (order_id int PRIMARY KEY, store_id text NOT NULL, customer_id int REFERENCES customers, total_cents int NOT NULL, status text NOT NULL);\n      INSERT INTO customers VALUES (1000, 'Ana', 'ana@example.com'), (1007, 'Bo', 'bo@example.com'), (1014, 'Cy', NULL);\n      INSERT INTO orders VALUES (1, 's01', 1000, 300, 'refunded'), (2, 's02', 1007, 337, 'paid'), (3, 's07', 1014, 374, 'paid'), (4, 's01', NULL, 411, 'paid'), (5, 's04', 1000, 448, 'paid');\n      GRANT SELECT ON ALL TABLES IN SCHEMA public TO debezium;\n      CREATE PUBLICATION dbz_publication FOR TABLE customers, orders;\"\"\", tuples=False)\n    rec.text('cdc.publication', pg.psql(\"select pubname, tablename from pg_publication_tables order by tablename;\").replace('|', '  '))\n    rec.counts('cdc.database', {'version': pg.psql('show server_version;').split(' ')[0], 'wal_level': pg.psql('show wal_level;'), 'customers': 3, 'orders': 5,\n                                'replica_identity_of_orders': {'d': 'default (primary key)', 'f': 'full', 'n': 'nothing', 'i': 'index'}[pg.psql(\"select relreplident from pg_class where relname='orders';\")]})\n\n    # ---- the connector and the snapshot ----\n    code, resp = w.create('orders-cdc', connector_config(pg, 'brewline', 'brewline_slot'))\n    assert code == 201, resp\n    w.wait_state('orders-cdc')\n    snap = events(c, 'brewline.public.orders', 5)\n    cust = events(c, 'brewline.public.customers', 3)\n    topics = sorted(t for t in kx.admin(c.bootstrap).list_topics(timeout=10).topics if t.startswith('brewline.'))\n    rec.counts('cdc.snapshot', {'topics': topics, 'order_events': len(snap), 'customer_events': len(cust), 'ops': sorted({clean_event(v)['op'] for k, v in snap}),\n                                'snapshot_flags': sorted({str(clean_event(v)['source']['snapshot']) for k, v in snap}), 'keys': [json.loads(k) for k, v in snap][:2]})\n    rec.text('cdc.event_snapshot', pretty(clean_event(snap[0][1])))\n    rec.table('cdc.slots', ['slot', 'plugin', 'active', 'wal status'], slot_row(pg))\n\n    # ---- changes ----\n    pg.psql(\"INSERT INTO orders VALUES (6, 's03', 1007, 520, 'paid');\")\n    pg.psql(\"UPDATE orders SET status = 'refunded' WHERE order_id = 2;\")\n    pg.psql(\"DELETE FROM orders WHERE order_id = 3;\")\n    ev = events(c, 'brewline.public.orders', 5 + 4)           # insert, update, delete, and the tombstone that follows the delete\n    changes = ev[5:]\n    rows = []\n    sql = ['INSERT order 6', \"UPDATE order 2 SET status='refunded'\", 'DELETE order 3', '(after the delete)']\n    for s, (k, v) in zip(sql, changes):\n        e = clean_event(v)\n        rows.append([s, json.loads(k)['order_id'], e['op'] if e else 'none: the value is null', json.dumps(e['before']) if e and e.get('before') is not None else 'null',\n                     json.dumps(e['after']) if e and e.get('after') is not None else 'null'])\n    rec.table('cdc.changes', ['what happened in the database', 'key', 'op', 'before', 'after'], rows)\n    rec.text('cdc.event_update', pretty(clean_event(changes[1][1])))\n    rec.counts('cdc.delete_tombstone', {'events_for_the_delete': 2, 'second_record_has_the_same_key': changes[3][0] == changes[2][0], 'second_record_value': changes[3][1]})\n\n    # ---- replica identity full: the old row is part of an update ----\n    pg.psql(\"ALTER TABLE orders REPLICA IDENTITY FULL;\")\n    pg.psql(\"UPDATE orders SET total_cents = 360 WHERE order_id = 1;\")\n    ev = events(c, 'brewline.public.orders', 5 + 4 + 1)\n    e = clean_event(ev[-1][1])\n    rec.counts('cdc.replica_identity_full', {'op': e['op'], 'before': e['before'], 'after': e['after']})\n\n    # ---- the table changes shape ----\n    pg.psql(\"ALTER TABLE orders ADD COLUMN channel text DEFAULT 'app';\")\n    pg.psql(\"UPDATE orders SET channel = 'web' WHERE order_id = 4;\")\n    ev = events(c, 'brewline.public.orders', 5 + 4 + 1 + 1)\n    e = clean_event(ev[-1][1])\n    rec.counts('cdc.new_column', {'op': e['op'], 'columns_before': sorted(e['before']), 'columns_after': sorted(e['after']), 'new_column_in_after': 'channel' in e['after']})\n\n    # ---- a flat view of the same changes: the unwrap transform ----\n    code, resp = w.create('orders-flat', connector_config(pg, 'flat', 'brewline_flat', {\n        'transforms': 'unwrap', 'transforms.unwrap.type': FLAT_MSG, 'transforms.unwrap.delete.tombstone.handling.mode': 'rewrite', 'transforms.unwrap.add.fields': 'op,table',\n        'table.include.list': 'public.orders'}))\n    assert code == 201, resp\n    w.wait_state('orders-flat')\n    flat = wait_count(c, 'flat.public.orders', 5)\n    pg.psql(\"UPDATE orders SET status = 'paid' WHERE order_id = 2;\")\n    pg.psql(\"DELETE FROM orders WHERE order_id = 4;\")\n    wait_count(c, 'flat.public.orders', 5 + 2)\n    time.sleep(4)\n    flat = kx.read_all(c.bootstrap, 'flat.public.orders')\n    lines = [json.dumps(json.loads(m[3]), separators=(',', ':')) if m[3] else 'null' for m in flat]\n    rec.text('cdc.flat_events', '\\n'.join(lines[5:]))\n    rec.counts('cdc.flat', {'records': len(flat), 'snapshot_records': 5, 'live_records': len(flat) - 5, 'tombstones': sum(1 for m in flat if m[3] is None)})\n    rec.table('cdc.slots_two', ['slot', 'plugin', 'active', 'wal status'], slot_row(pg))\n\n    # ---- the replication slot holds back WAL while the connector is not reading ----\n    time.sleep(3)\n    base = backlog_bytes(pg, 'brewline_slot')\n    w.api('PUT', '/connectors/orders-cdc/stop')\n    time.sleep(3)\n    inactive = pg.psql(\"select active from pg_replication_slots where slot_name='brewline_slot';\")\n    pg.psql(\"INSERT INTO orders SELECT 1000 + g, 's0' || (1 + g % 9), 1000, 300 + g % 500, 'paid', 'app' FROM generate_series(1, 20000) g;\", db='brewline')\n    pg.psql(\"UPDATE orders SET total_cents = total_cents + 1 WHERE order_id > 1000;\")\n    held, backlog = retained_bytes(pg, 'brewline_slot'), backlog_bytes(pg, 'brewline_slot')\n    have = len(kx.read_all(c.bootstrap, 'brewline.public.orders'))\n    w.api('PUT', '/connectors/orders-cdc/resume')\n    w.wait_state('orders-cdc')\n    wait_count(c, 'brewline.public.orders', have + 40000, timeout=240)\n    t0 = time.time()\n    while time.time() - t0 < 90:\n        pg.psql(\"CHECKPOINT;\")\n        pg.psql(\"UPDATE customers SET email = email WHERE customer_id = 1000;\")          # a little activity lets the slot move its restart position\n        time.sleep(4)\n        after, backlog_after = retained_bytes(pg, 'brewline_slot'), backlog_bytes(pg, 'brewline_slot')\n        if after < 1_000_000:\n            break\n    rec.counts('cdc.wal_held_back', {'slot_active_while_stopped': inactive, 'backlog_bytes_before_the_stop': base, 'backlog_bytes_while_stopped': backlog, 'bytes_the_slot_forces_postgres_to_keep': held,\n                                     'backlog_bytes_after_the_connector_caught_up': backlog_after, 'bytes_kept_after_catching_up': after, 'rows_changed_while_stopped': 40000,\n                                     'more_than_1_mb_held': held > 1_000_000, 'backlog_is_small_after_catching_up': backlog_after < 100_000, 'kept_is_small_after_catching_up': after < 1_000_000,\n                                     'wal_segment_bytes': 16 * 1024 * 1024})\n\n    # ---- a crash: the connector delivers at least once ----\n    # the worker is restarted with a long flush interval (ten minutes, the default is one minute), so that the offsets of what it delivers are not written before it dies\n    w.stop()\n    extra = dict(w.extra, **{'offset.flush.interval.ms': 600000})\n    w1 = Worker(c, name='cdc', group='cdc-demo', extra=extra).start()\n    w1.wait_state('orders-cdc', timeout=90)\n    time.sleep(3)\n    before = len(kx.read_all(c.bootstrap, 'brewline.public.orders'))\n    pg.psql(\"UPDATE orders SET status = 'ready' WHERE order_id IN (1, 2, 5, 6);\")\n    wait_count(c, 'brewline.public.orders', before + 4)\n    os.killpg(w1.proc.pid, signal.SIGKILL)              # the worker dies before it wrote the offsets of those four events\n    time.sleep(2)\n    w2 = Worker(c, name='cdc', group='cdc-demo', extra=extra).start()\n    w.proc = w2.proc\n    try:\n        w2.wait_state('orders-cdc', timeout=90)\n        time.sleep(15)\n        allv = kx.read_all(c.bootstrap, 'brewline.public.orders')\n        seen = {}\n        for m in allv:\n            if m[3]:\n                e = json.loads(m[3])\n                if e['op'] in ('u', 'c', 'd'):\n                    seen.setdefault((e['source']['lsn'], m[2]), []).append(m[1])\n        dup = {k: v for k, v in seen.items() if len(v) > 1}\n        rec.counts('cdc.at_least_once', {'records_before_the_crash': before + 4, 'records_after_the_restart': len(allv), 'events_of_the_last_four_updates': 4,\n                                         'events_delivered_twice': len(dup), 'extra_records': len(allv) - (before + 4)})\n    finally:\n        w2.stop()",
  "code/cluster.py": "\"\"\"A real Apache Kafka cluster on one machine, for the recorder and for the checks.\n\nEverything that the Kafka tutorial records ran on the brokers that this file starts: the unmodified Apache Kafka distribution (the binary tarball from\ndownloads.apache.org, 2.13 build), in KRaft mode, three combined nodes (each is a broker and a controller) on localhost. There is no network between the nodes, so\nlatency and throughput say nothing about a real cluster. Counts, offsets, file names, sizes of records and the behaviour of the protocol are real.\n\nThe distribution is found through the environment variable KAFKA_HOME (the folder that holds bin/ and libs/). Java 17 or later must be installed.\n\"\"\"\nimport os\nimport pathlib\nimport re\nimport shutil\nimport signal\nimport subprocess\nimport tempfile\nimport time\n\nKAFKA_HOME = pathlib.Path(os.environ.get('KAFKA_HOME', '')).expanduser()\nCOMMAND_CONFIG_TOOLS = {'kafka-topics', 'kafka-configs', 'kafka-acls', 'kafka-consumer-groups', 'kafka-get-offsets', 'kafka-log-dirs', 'kafka-features', 'kafka-leader-election',\n                       'kafka-reassign-partitions', 'kafka-transactions', 'kafka-delete-records', 'kafka-broker-api-versions', 'kafka-groups', 'kafka-cluster'}\nNOISE = re.compile(r'^(Picked up JAVA_TOOL_OPTIONS|WARNING: Using incubator|OpenJDK 64-Bit Server VM warning)')\n\n\ndef clean(text):\n    \"\"\"Drop the lines that the Java launcher and the sandbox add to every tool's output.\"\"\"\n    return '\\n'.join(l for l in text.splitlines() if not NOISE.match(l)).strip('\\n')\n\n\ndef check_home():\n    if not (KAFKA_HOME / 'bin' / 'kafka-server-start.sh').exists():\n        raise SystemExit('Set KAFKA_HOME to the folder of an unpacked Apache Kafka binary distribution (the one with bin/ and libs/).')\n    return KAFKA_HOME\n\n\ndef version():\n    jars = sorted((check_home() / 'libs').glob('kafka-clients-*.jar'))\n    return re.search(r'kafka-clients-(.+)\\.jar', jars[0].name).group(1)\n\n\ndef run_tool(name, *args, input=None, timeout=120, env=None, cwd=None):\n    \"\"\"Run one of the distribution's command line tools. Returns (exit code, stdout, stderr) with the launcher noise removed.\"\"\"\n    e = dict(os.environ)\n    e.update({'KAFKA_HEAP_OPTS': '-Xmx256m -Xms64m', 'KAFKA_LOG4J_OPTS': '-Dlog4j2.configurationFile=' + str(check_home() / 'config' / 'tools-log4j2.yaml')})\n    e.update(env or {})\n    p = subprocess.run([str(check_home() / 'bin' / (name if name.endswith('.sh') else name + '.sh'))] + [str(a) for a in args], input=input, capture_output=True, text=True,\n                       timeout=timeout, env=e, cwd=cwd)\n    return p.returncode, clean(p.stdout), clean(p.stderr)\n\n\nclass Node:\n    def __init__(self, cluster, nid, broker_port, controller_port, role='both'):\n        self.cluster, self.id, self.broker_port, self.controller_port, self.role = cluster, nid, broker_port, controller_port, role\n        self.dir = cluster.work / ('node%d' % nid)\n        self.props = self.dir / 'server.properties'\n        self.log = self.dir / 'server.out'\n        self.proc = None\n        self.directory_id = None\n\n    @property\n    def addr(self):\n        return 'localhost:%d' % (self.broker_port or self.controller_port)\n\n    def running(self):\n        if self.proc is not None:\n            return self.proc.poll() is None\n        try:\n            os.kill(int((self.dir / 'pid').read_text()), 0)\n            return True\n        except (OSError, ValueError):\n            return False\n\n    def pid(self):\n        return self.proc.pid if self.proc is not None else int((self.dir / 'pid').read_text())\n\n\nclass Cluster:\n    \"\"\"Three combined KRaft nodes by default. Use as a context manager: the data lives in a temporary folder that is deleted at the end.\"\"\"\n\n    def __init__(self, nodes=3, props=None, node_props=None, heap='512m', base_port=9092, step=100, work=None, keep=False, listener_extra=None, isolated=False, format_args=None, admin_config=None, node_env=None):\n        \"\"\"nodes is the number of brokers. By default each one is also a controller (\"combined\" mode). With isolated=True there is one controller of its own (node 100)\n        and the brokers are brokers only, so that a broker can be stopped without the cluster losing the quorum of its controllers.\"\"\"\n        self.n = nodes\n        self.isolated = isolated\n        self.format_args = list(format_args or [])            # more arguments for kafka-storage format, for instance --add-scram\n        self.admin_config = admin_config                       # a client properties file for the tools, when the brokers need a login\n        self.node_env = node_env or {}                         # environment variables of single nodes, for instance JMX_PORT\n        base_port = int(os.environ.get('KAFKA_BASE_PORT', base_port))      # lets a second cluster run next to the development one\n        self.props = dict(props or {})\n        self.node_props = node_props or {}\n        self.heap = heap\n        self.keep = keep\n        self.listener_extra = listener_extra or {}\n        self.work = pathlib.Path(work or tempfile.mkdtemp(prefix='kafka-capture-'))\n        self.work.mkdir(parents=True, exist_ok=True)\n        if isolated:\n            self.nodes = [Node(self, 100, None, base_port + 1, 'controller')] + [Node(self, i + 1, base_port + i * step, None, 'broker') for i in range(nodes)]\n        else:\n            self.nodes = [Node(self, i + 1, base_port + i * step, base_port + 1 + i * step) for i in range(nodes)]\n        self.cluster_id = None\n\n    @classmethod\n    def attach(cls, work, nodes=3, **kw):\n        \"\"\"A handle on a cluster that was started earlier (by dev_up.py): the folders and ports are the same, nothing is formatted or started.\"\"\"\n        c = cls(nodes=nodes, work=work, keep=True, **kw)\n        return c\n\n    # ---- lifecycle ----------------------------------------------------------------------------------------------------------------------------------------\n    @property\n    def brokers(self):\n        return [n for n in self.nodes if n.role != 'controller']\n\n    @property\n    def bootstrap(self):\n        return ','.join(n.addr for n in self.brokers)\n\n    def node(self, nid):\n        return next(n for n in self.nodes if n.id == nid)\n\n    def _write_props(self, n):\n        voters = ','.join('localhost:%d' % x.controller_port for x in self.nodes if x.controller_port)\n        k = min(3, self.n)\n        base = {'node.id': n.id, 'controller.quorum.bootstrap.servers': voters, 'controller.listener.names': 'CONTROLLER',\n                'listener.security.protocol.map': 'CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,SSL:SSL,SASL_PLAINTEXT:SASL_PLAINTEXT,SASL_SSL:SASL_SSL',\n                'log.dirs': str(n.dir / 'data'), 'log.retention.check.interval.ms': 1000, 'group.initial.rebalance.delay.ms': 0,\n                'offsets.topic.replication.factor': k, 'transaction.state.log.replication.factor': k, 'transaction.state.log.min.isr': min(2, self.n),\n                'share.coordinator.state.topic.replication.factor': k, 'share.coordinator.state.topic.min.isr': min(2, self.n), 'num.network.threads': 2, 'num.io.threads': 4,\n                'num.recovery.threads.per.data.dir': 1}\n        if n.role == 'controller':\n            base.update({'process.roles': 'controller', 'listeners': 'CONTROLLER://localhost:%d' % n.controller_port})\n        elif n.role == 'broker':\n            base.update({'process.roles': 'broker', 'listeners': 'PLAINTEXT://localhost:%d' % n.broker_port, 'advertised.listeners': 'PLAINTEXT://localhost:%d' % n.broker_port,\n                         'inter.broker.listener.name': 'PLAINTEXT'})\n        else:\n            base.update({'process.roles': 'broker,controller', 'listeners': 'PLAINTEXT://localhost:%d,CONTROLLER://localhost:%d' % (n.broker_port, n.controller_port),\n                         'advertised.listeners': 'PLAINTEXT://localhost:%d' % n.broker_port, 'inter.broker.listener.name': 'PLAINTEXT'})\n        base.update(self.props)\n        base.update(self.node_props.get(n.id, {}))\n        if self.listener_extra:\n            for k2, v in self.listener_extra.items():\n                base[k2] = v(n) if callable(v) else v\n        n.dir.mkdir(parents=True, exist_ok=True)\n        n.props.write_text('\\n'.join('%s=%s' % (k2, v) for k2, v in base.items()) + '\\n')\n\n    def format(self):\n        check_home()\n        self.cluster_id = run_tool('kafka-storage', 'random-uuid')[1].strip()\n        voters = [x for x in self.nodes if x.controller_port]\n        ids = []\n        for n in voters:\n            n.directory_id = run_tool('kafka-storage', 'random-uuid')[1].strip()\n            ids.append('%d@localhost:%d:%s' % (n.id, n.controller_port, n.directory_id))\n        for n in self.nodes:\n            self._write_props(n)\n            args = ['format', '--cluster-id', self.cluster_id, '--config', str(n.props)]\n            if n.controller_port:\n                args += ['--standalone'] if len(voters) == 1 else ['--initial-controllers', ','.join(ids)]\n            args += self.format_args\n            rc, out, err = run_tool('kafka-storage', *args)\n            if rc != 0:\n                raise RuntimeError('format failed on node %d: %s %s' % (n.id, out, err))\n\n    def start_node(self, nid):\n        n = self.node(nid)\n        e = dict(os.environ)\n        e.update({'KAFKA_HEAP_OPTS': '-Xmx%s -Xms%s' % (self.heap, self.heap), 'LOG_DIR': str(n.dir / 'logs'),\n                  'KAFKA_LOG4J_OPTS': '-Dlog4j2.configurationFile=' + str(check_home() / 'config' / 'log4j2.yaml')})\n        e.update({k: str(v) for k, v in self.node_env.get(nid, {}).items()})\n        n.proc = subprocess.Popen([str(check_home() / 'bin' / 'kafka-server-start.sh'), str(n.props)], stdout=open(n.log, 'ab'), stderr=subprocess.STDOUT, env=e,\n                                  start_new_session=True)\n        (n.dir / 'pid').write_text(str(n.proc.pid))\n        return n\n\n    def wait_ready(self, nodes=None, timeout=120):\n        \"\"\"Ready means that the broker answers an API versions request and the cluster has an active controller that knows it.\"\"\"\n        t0 = time.time()\n        for n in (nodes or self.brokers):\n            while True:\n                if not n.running():\n                    raise RuntimeError('node %d stopped while starting:\\n%s' % (n.id, n.log.read_text()[-3000:]))\n                extra = ['--command-config', str(self.admin_config)] if self.admin_config else []\n                rc, out, _ = run_tool('kafka-broker-api-versions', '--bootstrap-server', n.addr, *extra, timeout=60)\n                if rc == 0 and 'id:' in out:\n                    break\n                if time.time() - t0 > timeout:\n                    raise TimeoutError('node %d did not become ready:\\n%s' % (n.id, n.log.read_text()[-3000:]))\n                time.sleep(0.5)\n\n    def start(self):\n        self.format()\n        for n in self.nodes:\n            self.start_node(n.id)\n        self.wait_ready()\n        return self\n\n    def add_broker(self, nid, broker_port):\n        \"\"\"Add a broker to a cluster that is running: a new node that is only a broker. Its data folder is formatted without a controller quorum.\"\"\"\n        n = Node(self, nid, broker_port, None, 'broker')\n        self.nodes.append(n)\n        self._write_props(n)\n        rc, out, err = run_tool('kafka-storage', 'format', '--cluster-id', self.cluster_id, '--config', str(n.props))\n        if rc != 0:\n            raise RuntimeError('format failed on node %d: %s %s' % (nid, out, err))\n        self.start_node(nid)\n        self.wait_ready([n])\n        return n\n\n    def stop_node(self, nid, kill=False, timeout=60):\n        n = self.node(nid)\n        if not n.running():\n            return\n        pid = n.pid()\n        os.killpg(pid, signal.SIGKILL if kill else signal.SIGTERM)\n        t0 = time.time()\n        while n.running():\n            if n.proc is not None:\n                try:\n                    n.proc.wait(timeout=0.2)\n                except subprocess.TimeoutExpired:\n                    pass\n            else:\n                time.sleep(0.2)\n            if time.time() - t0 > timeout:\n                os.killpg(pid, signal.SIGKILL)\n                timeout = 10 ** 6\n\n    def stop(self):\n        for n in self.nodes:\n            self.stop_node(n.id)\n\n    def close(self):\n        self.stop()\n        if not self.keep:\n            shutil.rmtree(self.work, ignore_errors=True)\n\n    def __enter__(self):\n        return self.start()\n\n    def __exit__(self, *exc):\n        self.close()\n\n    # ---- tools ---------------------------------------------------------------------------------------------------------------------------------------------\n    def tool(self, name, *args, bootstrap=None, **kw):\n        \"\"\"Run a tool against the cluster. The tools that take --bootstrap-server get it added, unless the arguments already name a server or a controller.\"\"\"\n        a = list(args)\n        if not any(x.startswith('--bootstrap') for x in a) and name not in ('kafka-dump-log', 'kafka-storage'):\n            a = ['--bootstrap-server', bootstrap or self.bootstrap] + a\n        if self.admin_config and '--command-config' not in a and name in COMMAND_CONFIG_TOOLS:\n            a = ['--command-config', str(self.admin_config)] + a\n        return run_tool(name, *a, **kw)\n\n    def topics(self, *args):\n        return self.tool('kafka-topics', *args)\n\n    def data_dir(self, nid):\n        return self.node(nid).dir / 'data'",
  "code/connect.py": "\"\"\"Mission 9: Kafka Connect. A worker of the distribution, the REST interface, converters, transforms, offsets, and what happens to a record that cannot be converted.\n\nWhat is real: the Connect worker of Apache Kafka 4.4.0 and the connectors that ship with it (FileStream source and sink). What is not run: the connectors that are separate projects (JDBC,\nS3, Elasticsearch, and so on). They are described from documentation. Change data capture with Debezium has a mission of its own.\n\"\"\"\nimport json\nimport os\nimport pathlib\nimport re\nimport subprocess\nimport time\nimport urllib.error\nimport urllib.request\n\nimport cluster as C\nimport kx\nfrom world import norm\n\nCLS = 'org.apache.kafka.connect.file.FileStream'\n\n\nclass Worker:\n    \"\"\"One Connect worker in distributed mode: it keeps its state in three topics of the cluster.\"\"\"\n\n    def __init__(self, c, name='w1', port=8083, group='connect-demo', extra=None):\n        self.c, self.name, self.port, self.group, self.extra = c, name, port, group, extra or {}\n        self.dir = c.work / ('connect-' + name)\n        self.proc = None\n\n    def start(self, timeout=90):\n        self.dir.mkdir(parents=True, exist_ok=True)\n        props = {'bootstrap.servers': self.c.bootstrap, 'group.id': self.group, 'key.converter': 'org.apache.kafka.connect.storage.StringConverter',\n                 'value.converter': 'org.apache.kafka.connect.json.JsonConverter', 'value.converter.schemas.enable': 'false',\n                 'offset.storage.topic': 'connect-offsets', 'offset.storage.replication.factor': 3, 'offset.storage.partitions': 5,\n                 'config.storage.topic': 'connect-configs', 'config.storage.replication.factor': 3,\n                 'status.storage.topic': 'connect-status', 'status.storage.replication.factor': 3, 'status.storage.partitions': 3,\n                 'offset.flush.interval.ms': 2000, 'listeners': 'http://localhost:%d' % self.port,\n                 'plugin.path': str(C.check_home() / 'libs' / ('connect-file-%s.jar' % C.version()))}\n        props.update(self.extra)\n        pf = self.dir / 'worker.properties'\n        pf.write_text('\\n'.join('%s=%s' % kv for kv in props.items()) + '\\n')\n        e = dict(os.environ)\n        e.update({'KAFKA_HEAP_OPTS': '-Xmx384m -Xms128m', 'LOG_DIR': str(self.dir / 'logs')})\n        self.proc = subprocess.Popen([str(C.check_home() / 'bin' / 'connect-distributed.sh'), str(pf)], stdout=open(self.dir / 'worker.out', 'ab'), stderr=subprocess.STDOUT, env=e,\n                                     start_new_session=True)\n        t0 = time.time()\n        while time.time() - t0 < timeout:\n            try:\n                if self.api('GET', '/connector-plugins')[0] == 200:       # the server answers before its resources are registered, so ask for something real\n                    return self\n            except Exception:\n                pass\n            time.sleep(0.5)\n        raise TimeoutError('the Connect worker did not start')\n\n    def api(self, method, path, body=None, timeout=30):\n        data = json.dumps(body).encode() if body is not None else None\n        req = urllib.request.Request('http://localhost:%d%s' % (self.port, path), data=data, method=method, headers={'Content-Type': 'application/json'})\n        try:\n            with urllib.request.urlopen(req, timeout=timeout) as r:\n                txt = r.read().decode()\n                return r.status, (json.loads(txt) if txt else None)\n        except urllib.error.HTTPError as e:\n            txt = e.read().decode()\n            try:\n                return e.code, json.loads(txt)\n            except ValueError:\n                return e.code, txt\n\n    def stop(self):\n        if self.proc and self.proc.poll() is None:\n            import signal\n            os.killpg(self.proc.pid, signal.SIGTERM)\n            try:\n                self.proc.wait(30)\n            except subprocess.TimeoutExpired:\n                os.killpg(self.proc.pid, signal.SIGKILL)\n\n    def create(self, name, config):\n        return self.api('POST', '/connectors', {'name': name, 'config': config})\n\n    def status(self, name):\n        return self.api('GET', '/connectors/%s/status' % name)[1]\n\n    def wait_state(self, name, state='RUNNING', timeout=60):\n        t0 = time.time()\n        last = None\n        while time.time() - t0 < timeout:\n            code, st = self.api('GET', '/connectors/%s/status' % name)\n            if code == 200 and st['connector']['state'] == state and st['tasks'] and all(t['state'] == state for t in st['tasks']):\n                return st\n            last = st\n            time.sleep(0.5)\n        raise TimeoutError('%s never became %s: %s' % (name, state, last))\n\n\ndef wait_count(c, topic, n, timeout=60, isolation='read_uncommitted'):\n    t0 = time.time()\n    while time.time() - t0 < timeout:\n        msgs = kx.read_all(c.bootstrap, topic, timeout=10) if topic in kx.admin(c.bootstrap).list_topics(timeout=10).topics else []\n        if len(msgs) >= n:\n            return msgs\n        time.sleep(0.7)\n    raise TimeoutError('%s never had %d records (has %d)' % (topic, n, len(msgs)))\n\n\ndef write_lines(path, start, n):\n    with open(path, 'a') as f:\n        for i in range(start, start + n):\n            f.write(kx.value(i) + '\\n')\n\n\ndef record_connect(c, rec):\n    kx.delete_topics(c.bootstrap, ['connect-offsets', 'connect-configs', 'connect-status', 'conv-string', 'conv-json', 'conv-envelope', 'orders-file', 'bad-lines', 'bad-lines-dlq'])\n    files = c.work / 'files'\n    files.mkdir(exist_ok=True)\n    w = Worker(c).start()\n    try:\n        run(c, rec, w, files)\n    finally:\n        w.stop()\n\n\ndef run(c, rec, w, files):\n    # ---- the plugins that the worker found ----\n    code, plugins = w.api('GET', '/connector-plugins')\n    rec.table('connect.plugins', ['connector class', 'type', 'version'], [[p['class'].replace('org.apache.kafka.connect.', ''), p['type'], p['version']] for p in plugins])\n    code, root = w.api('GET', '/')\n    rec.counts('connect.worker', {'version': root['version'], 'rest_port': w.port, 'status_code': code, 'plugins': len(plugins)})\n\n    # ---- the same file through three converters ----\n    src = files / 'orders.jsonl'\n    src.write_text('')\n    write_lines(src, 0, 20)\n    for tag, conv in (('string', {'value.converter': 'org.apache.kafka.connect.storage.StringConverter'}),\n                      ('json', {'value.converter': 'org.apache.kafka.connect.json.JsonConverter', 'value.converter.schemas.enable': 'false'}),\n                      ('envelope', {'value.converter': 'org.apache.kafka.connect.json.JsonConverter', 'value.converter.schemas.enable': 'true'})):\n        cfg = {'connector.class': CLS + 'SourceConnector', 'tasks.max': '1', 'file': str(src), 'topic': 'conv-' + tag}\n        cfg.update(conv)\n        w.create('src-conv-' + tag, cfg)\n    rows = []\n    for tag, label in (('string', 'StringConverter'), ('json', 'JsonConverter, schemas.enable=false'), ('envelope', 'JsonConverter, schemas.enable=true')):\n        msgs = wait_count(c, 'conv-' + tag, 20)\n        rows.append([label, len(msgs), msgs[0][3][:150], len(msgs[0][3])])\n    rec.table('connect.converters', ['converter of the value', 'records', 'the first value, as Kafka stores it (first 150 characters)', 'bytes of that value'], rows)\n\n    # ---- a source connector, its status and its offsets ----\n    cfg = {'connector.class': CLS + 'SourceConnector', 'tasks.max': '1', 'file': str(src), 'topic': 'orders-file', 'value.converter': 'org.apache.kafka.connect.storage.StringConverter'}\n    code, created = w.create('src-orders', cfg)\n    rec.counts('connect.created', {'status_code': code, 'name': created['name'], 'type': created['type'], 'config_keys': sorted(created['config'])})\n    st = w.wait_state('src-orders')\n    wait_count(c, 'orders-file', 20)\n    st = w.status('src-orders')\n    rec.counts('connect.status', {'connector_state': st['connector']['state'], 'tasks': [{'id': t['id'], 'state': t['state']} for t in st['tasks']], 'type': st['type'],\n                                  'worker_id_is_the_worker': st['connector']['worker_id'] == 'localhost:%d' % w.port})\n    time.sleep(3)\n    code, off = w.api('GET', '/connectors/src-orders/offsets')\n    pos20 = off['offsets'][0]['offset']['position']\n    rec.counts('connect.offsets_after_20', {'status_code': code, 'offsets': [{'partition': {'filename': '<file>'}, 'offset': off['offsets'][0]['offset']}], 'file_bytes': src.stat().st_size,\n                                            'position_equals_file_size': pos20 == src.stat().st_size})\n    write_lines(src, 20, 5)\n    wait_count(c, 'orders-file', 25)\n    time.sleep(3)\n    w.api('POST', '/connectors/src-orders/restart')\n    w.wait_state('src-orders')\n    time.sleep(2)\n    after_restart = len(kx.read_all(c.bootstrap, 'orders-file'))\n    # delete the connector and create it again under the same name: the position was kept in the offsets topic\n    w.api('DELETE', '/connectors/src-orders')\n    time.sleep(2)\n    w.create('src-orders', cfg)\n    w.wait_state('src-orders')\n    time.sleep(4)\n    after_recreate = len(kx.read_all(c.bootstrap, 'orders-file'))\n    # reset the offsets: the connector must be stopped first, and then it reads the file from the top\n    w.api('PUT', '/connectors/src-orders/stop')\n    time.sleep(2)\n    code, resp = w.api('DELETE', '/connectors/src-orders/offsets')\n    w.api('PUT', '/connectors/src-orders/resume')\n    w.wait_state('src-orders')\n    time.sleep(5)\n    after_reset = len(kx.read_all(c.bootstrap, 'orders-file'))\n    rec.counts('connect.restart_and_reset', {'lines_in_the_file': 25, 'records_after_20_lines': 20, 'records_after_5_more_lines': 25, 'records_after_a_restart': after_restart,\n                                             'records_after_delete_and_create_with_the_same_name': after_recreate, 'reset_status_code': code, 'reset_message': resp['message'] if isinstance(resp, dict) else resp,\n                                             'records_after_the_offsets_were_reset': after_reset})\n\n    # ---- internal topics ----\n    tm = kx.admin(c.bootstrap).list_topics(timeout=10).topics\n    rows = []\n    for t in ('connect-configs', 'connect-offsets', 'connect-status'):\n        pol = [l for l in c.tool('kafka-configs', '--describe', '--entity-type', 'topics', '--entity-name', t)[1].splitlines() if 'cleanup.policy' in l]\n        rows.append([t, len(tm[t].partitions), len(tm[t].partitions[0].replicas), 'compact' if pol and 'compact' in pol[0] else 'delete', {'connect-configs': 'the settings of each connector', 'connect-offsets': 'the positions of the source connectors', 'connect-status': 'the state of each connector and task'}[t]])\n    rec.table('connect.internal_topics', ['topic', 'partitions', 'copies', 'cleanup policy', 'what it holds'], rows)\n    off_msgs = kx.read_all(c.bootstrap, 'connect-offsets')\n    rec.text('connect.offsets_record', '\\n'.join('key: %s\\nvalue: %s' % (m[2], m[3]) for m in off_msgs[-1:]).replace(str(files), '<files>'))\n\n    # ---- transforms in a sink ----\n    out = files / 'smt.out'\n    sink = {'connector.class': CLS + 'SinkConnector', 'tasks.max': '1', 'topics': 'orders-file', 'file': str(out), 'value.converter': 'org.apache.kafka.connect.json.JsonConverter',\n            'value.converter.schemas.enable': 'false'}\n    w.create('sink-plain', dict(sink, file=str(files / 'plain.out')))\n    smt = dict(sink, file=str(out), transforms='drop,tag,mask',\n               **{'transforms.drop.type': 'org.apache.kafka.connect.transforms.ReplaceField$Value', 'transforms.drop.exclude': 'customer_id,channel',\n                  'transforms.tag.type': 'org.apache.kafka.connect.transforms.InsertField$Value', 'transforms.tag.static.field': 'source', 'transforms.tag.static.value': 'pos',\n                  'transforms.mask.type': 'org.apache.kafka.connect.transforms.MaskField$Value', 'transforms.mask.fields': 'status'})\n    w.create('sink-smt', smt)\n    t0 = time.time()\n    while time.time() - t0 < 60 and not ((files / 'plain.out').exists() and (files / 'smt.out').exists() and len((files / 'smt.out').read_text().splitlines()) >= 50):\n        time.sleep(1)\n    plain = (files / 'plain.out').read_text().splitlines()\n    smt_lines = (files / 'smt.out').read_text().splitlines()\n    rec.text('connect.sink_plain', '\\n'.join(plain[:2]))\n    rec.text('connect.sink_smt', '\\n'.join(smt_lines[:2]))\n    rec.counts('connect.sink_counts', {'records_in_the_topic': 50, 'lines_written_without_transforms': len(plain), 'lines_written_with_transforms': len(smt_lines),\n                                       'transforms': ['ReplaceField$Value (drop two fields)', 'InsertField$Value (add a field)', 'MaskField$Value (blank a field)']})\n    w.api('DELETE', '/connectors/sink-plain')\n    w.api('DELETE', '/connectors/sink-smt')\n\n    # ---- a record that cannot be converted ----\n    bad = files / 'bad.jsonl'\n    bad.write_text('')\n    write_lines(bad, 0, 5)\n    with open(bad, 'a') as f:\n        f.write('this line is not JSON\\n')\n    write_lines(bad, 5, 5)\n    w.create('src-bad', {'connector.class': CLS + 'SourceConnector', 'tasks.max': '1', 'file': str(bad), 'topic': 'bad-lines', 'value.converter': 'org.apache.kafka.connect.storage.StringConverter'})\n    wait_count(c, 'bad-lines', 11)\n    base = {'connector.class': CLS + 'SinkConnector', 'tasks.max': '1', 'topics': 'bad-lines', 'value.converter': 'org.apache.kafka.connect.json.JsonConverter',\n            'value.converter.schemas.enable': 'false'}\n    w.create('sink-strict', dict(base, file=str(files / 'strict.out')))\n    t0 = time.time()\n    while time.time() - t0 < 60:\n        s = w.status('sink-strict')\n        if s and s.get('tasks') and s['tasks'][0]['state'] == 'FAILED':\n            break\n        time.sleep(0.5)\n    strict = (files / 'strict.out').read_text().splitlines() if (files / 'strict.out').exists() else []\n    trace = s['tasks'][0].get('trace', '')\n    rec.counts('connect.failed_task', {'connector_state': s['connector']['state'], 'task_state': s['tasks'][0]['state'], 'first_line_of_the_trace': trace.splitlines()[0][:230],\n                                       'lines_written_before_it_failed': len(strict), 'records_in_the_topic': 11})\n    w.create('sink-tolerant', dict(base, file=str(files / 'tolerant.out'), **{'errors.tolerance': 'all', 'errors.deadletterqueue.topic.name': 'bad-lines-dlq',\n                                                                                'errors.deadletterqueue.topic.replication.factor': '3',\n                                                                                'errors.deadletterqueue.context.headers.enable': 'true', 'errors.log.enable': 'true'}))\n    w.wait_state('sink-tolerant')\n    t0 = time.time()\n    while time.time() - t0 < 60 and not ((files / 'tolerant.out').exists() and len((files / 'tolerant.out').read_text().splitlines()) >= 10):\n        time.sleep(1)\n    tol = (files / 'tolerant.out').read_text().splitlines()\n    dlq = wait_count(c, 'bad-lines-dlq', 1)\n    # the headers of the dead letter record\n    hdrs = {}\n    from confluent_kafka import Consumer, TopicPartition\n    cons = kx.consumer(c.bootstrap, 'dlq-reader-' + str(time.time()))\n    cons.assign([TopicPartition('bad-lines-dlq', 0, 0)])\n    m = None\n    while m is None or m.error():\n        m = cons.poll(5)\n    for k, v in m.headers():\n        hdrs[k] = (v.decode(errors='replace') if v else '')\n    cons.close()\n    rec.counts('connect.dead_letter', {'records_read_by_the_sink': 11, 'lines_written': len(tol), 'records_in_the_dead_letter_topic': len(dlq), 'dead_letter_value': dlq[0][3],\n                                       'header_names': sorted(hdrs), 'task_state': w.status('sink-tolerant')['tasks'][0]['state'],\n                                       'exception_message': re.sub(r'\\s+', ' ', hdrs.get('__connect.errors.exception.message', ''))[:200], 'stage': hdrs.get('__connect.errors.stage'),\n                                       'source_topic': hdrs.get('__connect.errors.topic'), 'source_offset': hdrs.get('__connect.errors.offset')})\n    rc, st_all = w.api('GET', '/connectors?expand=status')\n    rec.table('connect.all_status', ['connector', 'type', 'connector state', 'task states'],\n              [[n, d['status']['type'], d['status']['connector']['state'], ','.join(t['state'] for t in d['status']['tasks'])] for n, d in sorted(st_all.items())])\n    for n in list(st_all):\n        w.api('DELETE', '/connectors/' + n)",
  "code/consumers.py": "\"\"\"Mission 6: consumers and consumer groups. Offsets, lag, the internal topic that stores them, rebalances, and what happens when a consumer is too slow.\"\"\"\nimport re\nimport threading\nimport time\n\nfrom confluent_kafka import Consumer, KafkaException, TopicPartition\n\nimport cluster as C\nimport kx\nfrom world import norm\n\nSPREAD6 = [[1 + i % 3, 1 + (i + 1) % 3, 1 + (i + 2) % 3] for i in range(6)]\n\n\ndef java_hash(s):\n    \"\"\"String.hashCode() of the Java language, as a signed 32-bit integer.\"\"\"\n    h = 0\n    for ch in s:\n        h = (31 * h + ord(ch)) & 0xffffffff\n    return h - (1 << 32) if h >= (1 << 31) else h\n\n\ndef offsets_partition(group, partitions=50):\n    \"\"\"The partition of __consumer_offsets that stores a group: the absolute value of the Java hash of the group name, modulo the number of partitions.\"\"\"\n    return abs(java_hash(group)) % partitions\n\n\ndef fill(c, topic, n=6000):\n    \"\"\"n orders, spread evenly over the six partitions (order i goes to partition i % 6).\"\"\"\n    p = kx.producer(c.bootstrap)\n    for part in range(6):\n        for i in range(part, n, 6):\n            p.produce(topic, key=kx.order(i)['store_id'], value=kx.value(i), partition=part, timestamp=kx.T0 + i * 1000)\n    p.flush(60)\n\n\ndef read_n(c, group, topic, partition, n):\n    \"\"\"Read exactly n records of one partition from the beginning and commit the position, as a consumer of the group would.\"\"\"\n    cons = kx.consumer(c.bootstrap, group)\n    cons.assign([TopicPartition(topic, partition, 0)])\n    got = 0\n    while got < n:\n        m = cons.poll(2)\n        if m is not None and not m.error():\n            got += 1\n            last = m.offset()\n    if n:\n        cons.commit(offsets=[TopicPartition(topic, partition, last + 1)], asynchronous=False)\n    cons.close()\n\n\ndef describe(c, group, *flags):\n    rc, out, err = c.tool('kafka-consumer-groups', '--describe', '--group', group, *flags)\n    return out\n\n\n# ---- offsets, lag and the internal topic ----------------------------------------------------------------------------------------------------------------------\ndef basics(c, rec):\n    kx.create_topic(c.bootstrap, 'cons', assignment=SPREAD6, config={'retention.ms': '-1'})\n    fill(c, 'cons')\n    done = [400, 800, 1000, 250, 600, 1]\n    for part, n in enumerate(done):\n        read_n(c, 'g-basic', 'cons', part, n)\n    out = describe(c, 'g-basic')\n    rec.text('consumers.describe_group', out)\n    rows = []\n    for line in out.splitlines()[1:]:\n        f = line.split()\n        if len(f) >= 6 and f[1] == 'cons':\n            rows.append([int(f[2]), int(f[3]), int(f[4]), int(f[5])])\n    rec.table('consumers.lag', ['partition', 'committed offset', 'end of the partition', 'lag'], rows)\n    rec.counts('consumers.lag_total', {'records': 6000, 'committed': sum(done), 'lag': sum(r[3] for r in rows), 'lag_is_end_minus_committed': all(r[3] == r[2] - r[1] for r in rows)})\n    rec.text('consumers.describe_state', describe(c, 'g-basic', '--state'))\n    rc, lst, _ = c.tool('kafka-consumer-groups', '--list')\n    rec.text('consumers.list_groups', lst)\n    rc, groups, _ = c.tool('kafka-groups', '--list')\n    rec.text('consumers.kafka_groups_list', groups)\n\n    # where the offsets are stored: a compacted internal topic, one partition for each group (by a hash of the group name)\n    part = offsets_partition('g-basic')\n    log = sorted((c.data_dir(1) / ('__consumer_offsets-%d' % part)).glob('*.log'))[0]\n    rc, dump, _ = C.run_tool('kafka-dump-log', '--files', str(log), '--offsets-decoder', timeout=60)\n    lines = [l for l in dump.splitlines() if l.startswith('| offset:') and '\"g-basic\"' in l and '\"type\":\"1\"' in l]\n    lines = [re.sub(r'CreateTime: \\d+ ', '', re.sub(r'\"topicId\":\"[^\"]+\"', '\"topicId\":\"<topic id>\"', re.sub(r'\"commitTimestamp\":\\d+', '\"commitTimestamp\":<time>', l))) for l in lines]\n    rec.counts('consumers.offsets_topic', {'group': 'g-basic', 'java_hash': java_hash('g-basic'), 'partitions_of_the_topic': 50, 'partition_computed': part,\n                                           'offset_commit_records_for_the_group_found_there': len(lines)})\n    rec.text('consumers.offsets_dump', '\\n'.join(lines[:3]))\n\n    # moving the position of a group: a dry run first, then the real thing\n    base = ['--group', 'g-basic', '--topic', 'cons']\n    rc, out, err = c.tool('kafka-consumer-groups', *base, '--reset-offsets', '--to-earliest', '--dry-run')\n    rec.text('consumers.reset_dry_run', out)\n    rc, out, err = c.tool('kafka-consumer-groups', *base, '--reset-offsets', '--shift-by=-100', '--execute')\n    rec.text('consumers.reset_shift', norm((out + '\\n' + err).strip(), c))\n    rc, out, err = c.tool('kafka-consumer-groups', *base, '--reset-offsets', '--to-datetime', '2026-01-01T00:30:00.000', '--dry-run')\n    rec.text('consumers.reset_datetime', out)\n    # a group that is running cannot be reset\n    cons = kx.consumer(c.bootstrap, 'g-basic')\n    cons.subscribe(['cons'])\n    t0 = time.time()\n    while time.time() - t0 < 20 and not cons.assignment():\n        cons.poll(0.5)\n    rc, out, err = c.tool('kafka-consumer-groups', *base, '--reset-offsets', '--to-earliest', '--execute')\n    rec.text('consumers.reset_while_running', (out + '\\n' + err).strip())\n    cons.close()\n\n\n# ---- rebalances -------------------------------------------------------------------------------------------------------------------------------------------------\nclass Member(threading.Thread):\n    def __init__(self, c, group, name, topic, protocol, events, extra=None):\n        super().__init__(daemon=True)\n        self.c, self.group, self.name, self.topic, self.protocol, self.events = c, group, name, topic, protocol, events\n        self.extra = extra or {}\n        self.stop_flag = threading.Event()\n        self.current = set()\n        self.incremental = protocol in ('cooperative-sticky', 'consumer')\n        self.last_change = time.time()\n        self.polls = 0\n\n    def log(self, kind, parts):\n        self.events.append((self.name, kind, sorted(p.partition for p in parts)))\n        self.last_change = time.time()\n\n    def run(self):\n        conf = {'client.id': self.name, 'group.id': self.group, 'bootstrap.servers': self.c.bootstrap, 'auto.offset.reset': 'earliest', 'enable.auto.commit': False}\n        if self.protocol == 'consumer':\n            conf['group.protocol'] = 'consumer'          # the new protocol: the session timeout is a setting of the broker, not of the client\n        else:\n            conf['partition.assignment.strategy'] = self.protocol\n            conf['session.timeout.ms'] = 10000\n        conf.update(self.extra)\n        cons = Consumer(conf)\n\n        def on_assign(cn, parts):\n            self.log('assigned', parts)\n            self.current |= {p.partition for p in parts}\n            cn.incremental_assign(parts) if self.incremental else cn.assign(parts)\n\n        def on_revoke(cn, parts):\n            self.log('revoked', parts)\n            self.current -= {p.partition for p in parts}\n            cn.incremental_unassign(parts) if self.incremental else cn.unassign()\n            if not self.incremental:\n                self.current.clear()\n\n        def on_lost(cn, parts):\n            self.log('lost', parts)\n            self.current.clear()\n            cn.incremental_unassign(parts) if self.incremental else cn.unassign()\n        cons.subscribe([self.topic], on_assign=on_assign, on_revoke=on_revoke, on_lost=on_lost)\n        while not self.stop_flag.is_set():\n            self.polls += 1\n            m = cons.poll(0.2)\n            if m is not None and m.error():\n                self.events.append((self.name, 'error', [m.error().name()]))\n        cons.close()\n        self.events.append((self.name, 'closed', []))\n\n\ndef wait_stable(members, total=6, quiet=3.0, timeout=90):\n    t0 = time.time()\n    while time.time() - t0 < timeout:\n        assigned = [m.current for m in members]\n        sizes = sum(len(a) for a in assigned)\n        flat = set().union(*assigned) if assigned else set()\n        if sizes == total and len(flat) == total and all(a for a in assigned) and time.time() - max(m.last_change for m in members) > quiet:\n            return            # every member has some partitions, together they have all six, and nothing has changed for a while\n        time.sleep(0.3)\n    raise TimeoutError('assignment never became stable: %s' % [sorted(m.current) for m in members])\n\n\ndef rebalance_experiment(c, rec, protocol, label):\n    topic = 'rb'\n    group = 'rb-' + label\n    events = []\n    a = Member(c, group, 'A', topic, protocol, events)\n    b = Member(c, group, 'B', topic, protocol, events)\n    cc = Member(c, group, 'C', topic, protocol, events)\n    steps = []\n\n    def mark(name, members):\n        steps.append((name, len(events)))\n        return members\n    mark('A starts', [a]); a.start(); wait_stable([a])\n    mark('B joins', [a, b]); b.start(); wait_stable([a, b])\n    mark('C joins', [a, b, cc]); cc.start(); wait_stable([a, b, cc])\n    mark('B leaves', [a, cc]); b.stop_flag.set(); b.join(30); wait_stable([a, cc])\n    steps.append(('end', len(events)))\n    a.stop_flag.set(); cc.stop_flag.set(); a.join(30); cc.join(30)\n    rows, summary = [], {}\n    for (name, lo), (_, hi) in zip(steps, steps[1:]):\n        evs = [e for e in events[lo:hi] if e[1] != 'closed']\n        newcomer = name.split()[0]\n        # an \"assigned\" callback with no partitions is a member taking part in a round of the rebalance without gaining anything\n        shown = [e for e in evs if e[2]]\n        empty = len(evs) - len(shown)\n        for who, kind, parts in shown:\n            rows.append([name, who, kind, ','.join(map(str, parts))])\n        summary[name] = {'partitions_revoked_in_all': sum(len(e[2]) for e in evs if e[1] == 'revoked'),\n                         'partitions_revoked_from_members_that_stay': sum(len(e[2]) for e in evs if e[1] == 'revoked' and e[0] != newcomer),\n                         'callbacks_with_no_partitions': empty}\n    rec.table('consumers.rebalance_' + label, ['step', 'consumer', 'event', 'partitions'], rows)\n    final = {m.name: sorted(m.current) for m in (a, cc)}\n    return summary\n\n\ndef rebalances(c, rec):\n    kx.delete_topics(c.bootstrap, ['rb'])\n    kx.create_topic(c.bootstrap, 'rb', assignment=SPREAD6, config={'retention.ms': '-1'})\n    result = {}\n    for protocol, label in (('range', 'range'), ('cooperative-sticky', 'cooperative'), ('consumer', 'new_protocol')):\n        result[label] = rebalance_experiment(c, rec, protocol, label)\n    rec.counts('consumers.rebalance_summary', result)\n\n\n# ---- a consumer that is too slow ------------------------------------------------------------------------------------------------------------------------------\ndef slow_consumer(c, rec):\n    kx.delete_topics(c.bootstrap, ['slow'])\n    kx.create_topic(c.bootstrap, 'slow', assignment=SPREAD6[:1], config={'retention.ms': '-1'})\n    kx.send(kx.producer(c.bootstrap), 'slow', 200, partition=0)\n    events = []\n    conf = {'bootstrap.servers': c.bootstrap, 'group.id': 'slow-group', 'auto.offset.reset': 'earliest', 'enable.auto.commit': False, 'max.poll.interval.ms': 6000,\n            'session.timeout.ms': 6000, 'client.id': 'slow'}\n    cons = Consumer(conf)\n    cons.subscribe(['slow'], on_assign=lambda cn, p: (events.append('assigned'), cn.assign(p)), on_revoke=lambda cn, p: (events.append('revoked'), cn.unassign()),\n                   on_lost=lambda cn, p: (events.append('lost'), cn.unassign()))\n    first = None\n    t0 = time.time()\n    while first is None and time.time() - t0 < 30:\n        m = cons.poll(0.5)\n        if m is not None and not m.error():\n            first = m\n    time.sleep(8.5)             # \"processing\" that takes longer than max.poll.interval.ms (6 seconds)\n    errors = []\n    commit_error = None\n    try:\n        cons.commit(message=first, asynchronous=False)\n    except KafkaException as e:\n        commit_error = (e.args[0].name(), e.args[0].str())\n    for _ in range(10):\n        m = cons.poll(1)\n        if m is not None and m.error():\n            errors.append((m.error().name(), m.error().str()))\n    cons.close()\n    rec.counts('consumers.too_slow', {'max_poll_interval_ms': 6000, 'processing_took_seconds': 8.5, 'poll_errors': errors[:2], 'commit_error': commit_error, 'events': events})\n\n\ndef record_consumers(c, rec):\n    kx.delete_topics(c.bootstrap, ['cons', 'rb', 'slow'])\n    basics(c, rec)\n    rebalances(c, rec)\n    slow_consumer(c, rec)",
  "code/delivery.py": "\"\"\"Mission 7: delivery guarantees. A lost acknowledgement, the order of \"process\" and \"commit\", and a transaction that is cut in half.\n\nWhat is real: the brokers, the clients, the logs, the markers of the transactions. What is a stand-in: the lost acknowledgement is made by a small proxy (lossy_proxy.py) that throws\naway one response, because a real network does not drop a packet on demand. Everything else is the real protocol.\n\"\"\"\nimport json\nimport os\nimport re\nimport subprocess\nimport sys\nimport time\n\nfrom confluent_kafka import KafkaException\n\nimport cluster as C\nimport kx\nfrom lossy_proxy import LossyProxy\nfrom world import norm, parse_dump\n\nHERE = os.path.dirname(os.path.abspath(__file__))\nPROXY_PORT = 19400\n\n\ndef batches_of(c, topic, node=1):\n    d = c.data_dir(node) / (topic + '-0')\n    out = []\n    for f in sorted(d.glob('*.log')):\n        out += parse_dump(C.run_tool('kafka-dump-log', '--files', str(f))[1])\n    return out\n\n\n# ---- a lost acknowledgement -----------------------------------------------------------------------------------------------------------------------------------\ndef retry_experiment(rec):\n    \"\"\"One broker. The producer sends five orders; the broker writes them; the answer is thrown away; the producer sends the batch again.\n\n    The broker tells every client that it lives at the address of the proxy, so every client goes through it. The proxy forwards everything and, when it is armed, drops one answer.\n    \"\"\"\n    broker_port = int(os.environ.get('KAFKA_BASE_PORT', 9092))\n    props = {1: {'advertised.listeners': 'PLAINTEXT://localhost:%d' % PROXY_PORT}}\n    via = 'localhost:%d' % PROXY_PORT\n    proxy = LossyProxy(PROXY_PORT, broker_port, drop=0)\n    with C.Cluster(nodes=1, node_props=props) as c:\n        rows, dumps, ids = [], [], {}\n        for idem in (False, True):\n            name = 'retry-' + ('on' if idem else 'off')\n            kx.create_topic(via, name, assignment=[[1]], config={'retention.ms': '-1'})\n            p = kx.producer(via, **{'enable.idempotence': idem, 'acks': 'all', 'socket.timeout.ms': 3000, 'message.timeout.ms': 30000, 'linger.ms': 200, 'retry.backoff.ms': 100})\n            p.list_topics(name, timeout=10)           # the producer knows the leader before the proxy is armed\n            proxy.arm(1)\n            delivered = []\n            for i in range(5):\n                p.produce(name, key=kx.order(i)['store_id'], value=kx.value(i), timestamp=kx.T0 + i * 1000, callback=lambda err, msg: delivered.append(err))\n            p.flush(60)\n            time.sleep(1)\n            b = batches_of(c, name)\n            records = kx.read_all(via, name)\n            for x in b:\n                pid = x['producerId']\n                dumps.append([('enable.idempotence=true' if idem else 'enable.idempotence=false'), x['baseOffset'], x['lastOffset'],\n                              -1 if pid < 0 else ids.setdefault(pid, '<id %s>' % 'AB'[len(ids)]), x['baseSequence']])\n            rows.append(['enable.idempotence=' + ('true' if idem else 'false'), 5, proxy.produce_requests, proxy.dropped, len(records), len(records) - 5,\n                         sorted({json.loads(r[3])['order_id'] for r in records}) == [1, 2, 3, 4, 5], sum(1 for e in delivered if e is None)])\n            del p\n        rec.table('delivery.lost_ack', ['producer', 'orders sent', 'produce requests that reached the broker', 'responses thrown away', 'records in the log', 'extra copies',\n                                        'every order is there', 'delivery reports that said delivered'], rows)\n        rec.table('delivery.lost_ack_batches', ['producer', 'first offset', 'last offset', 'producer id', 'first sequence'], dumps)\n    proxy.close()\n\n\n# ---- process, then commit; or commit, then process -----------------------------------------------------------------------------------------------------------\nclass Crash(Exception):\n    pass\n\n\ndef worker(c, group, strategy, crash_after, sink, writes):\n    \"\"\"Read orders from the topic 'work' and process them: here, \"process\" means to write the order id into a sink. Raises Crash at the moment that is asked for.\n\n    commit-first:   commit the offset of a record, then process it.   Crash after the commit of the order crash_after, before it is processed.\n    process-first:  process a record, commit every ten records.        Crash after the order crash_after was processed, before the next commit.\n    \"\"\"\n    cons = kx.consumer(c.bootstrap, group)\n    cons.subscribe(['work'])\n    since_commit, read = 0, 0\n    try:\n        while True:\n            m = cons.poll(5)\n            if m is None:\n                break\n            if m.error():\n                if m.error().code() == -191:\n                    break\n                continue\n            read += 1\n            oid = json.loads(m.value())['order_id']\n            if strategy == 'commit-first':\n                cons.commit(message=m, asynchronous=False)\n                if oid == crash_after:\n                    raise Crash()\n                writes.append(oid)\n                sink[oid] = sink.get(oid, 0) + 1\n            else:\n                writes.append(oid)\n                sink[oid] = sink.get(oid, 0) + 1\n                if oid == crash_after:\n                    raise Crash()\n                since_commit += 1\n                if since_commit == 10:\n                    cons.commit(asynchronous=False)\n                    since_commit = 0\n    except Crash:\n        pass\n    finally:\n        cons.close()\n    return read\n\n\ndef commit_experiments(c, rec):\n    kx.delete_topics(c.bootstrap, ['work'])\n    kx.create_topic(c.bootstrap, 'work', assignment=[[1, 2, 3]], config={'retention.ms': '-1'})\n    kx.send(kx.producer(c.bootstrap), 'work', 100, partition=0)\n    rows = []\n    for label, group, strategy, crash_after, idempotent in (\n            ('commit, then process', 'w-commit-first', 'commit-first', 61, False),\n            ('process, then commit every 10 records', 'w-process-first', 'process-first', 65, False),\n            ('process, then commit every 10 records, into a sink that overwrites by order id', 'w-idempotent', 'process-first', 65, True)):\n        sink, writes = {}, []\n        r1 = worker(c, group, strategy, crash_after, sink, writes)       # the first run dies\n        r2 = worker(c, group, strategy, None, sink, writes)              # the second run starts from what the group committed\n        rec_counts = sorted(sink.items())\n        lost = [i for i in range(1, 101) if i not in sink]\n        twice = [i for i, n in rec_counts if n > 1]\n        rows.append([label, 'order %d' % crash_after, r1, r2, len(writes), len(lost), len(twice), len(sink) if idempotent else len(writes),\n                     lost[:1] and 'order %d' % lost[0] or '-', ('orders %d to %d' % (twice[0], twice[-1])) if twice else '-'])\n    rec.table('delivery.crash', ['strategy', 'the process dies after', 'records read before the crash', 'records read after the restart', 'times the sink was written',\n                                 'orders never processed', 'orders processed twice', 'rows in the sink', 'the lost order', 'the orders done twice'], rows)\n\n\ndef norm_tx(text, kind):\n    \"\"\"The output of kafka-transactions without what changes from run to run: the producer ids, the coordinator and the times.\"\"\"\n    out = []\n    for i, line in enumerate(text.splitlines()):\n        f = line.split('\\t')\n        if i > 0 and kind == 'list' and len(f) >= 4:\n            f[1], f[2] = '<broker>', '<id>' if f[2].strip() else f[2]\n        if i > 0 and kind == 'describe' and len(f) >= 9:\n            f[0], f[2] = '<broker>', '<id>'\n            f[6], f[7] = ('<time>', '<ms>') if f[6].strip() != 'None' else (f[6], f[7])\n        out.append('\\t'.join(x.strip() for x in f).replace('\\t', '  '))\n    return '\\n'.join(out)\n\n\n# ---- a transaction that is cut in half --------------------------------------------------------------------------------------------------------------------------\ndef transactions(c, rec):\n    kx.delete_topics(c.bootstrap, ['tx-in', 'tx-out'])\n    c.tool('kafka-consumer-groups', '--delete', '--group', 'tx-pipeline')\n    kx.create_topic(c.bootstrap, 'tx-in', assignment=[[1, 2, 3]], config={'retention.ms': '-1'})\n    kx.create_topic(c.bootstrap, 'tx-out', assignment=[[1, 2, 3]], config={'retention.ms': '-1'})\n    kx.send(kx.producer(c.bootstrap), 'tx-in', 100, partition=0)\n    py = sys.executable\n    script = os.path.join(HERE, 'app', 'pipeline.py')\n    r1 = subprocess.run([py, script, '--bootstrap', c.bootstrap, '--crash-in-batch', '7'], capture_output=True, text=True, timeout=120)\n    time.sleep(1)\n    committed = len(kx.read_all(c.bootstrap, 'tx-out', isolation='read_committed', timeout=10))\n    uncommitted = len(kx.read_all(c.bootstrap, 'tx-out', isolation='read_uncommitted', timeout=10))\n    rc, lst, _ = c.tool('kafka-transactions', 'list')\n    rc, desc, _ = c.tool('kafka-transactions', 'describe', '--transactional-id', 'tx-pipeline-1')\n    rec.counts('delivery.tx_after_crash', {'exit_code_of_the_first_run': r1.returncode, 'batches_committed_before_the_crash': 6,\n                                           'records_seen_by_a_read_committed_consumer': committed, 'records_seen_by_a_read_uncommitted_consumer': uncommitted,\n                                           'records_of_the_open_transaction': uncommitted - committed})\n    rec.text('delivery.tx_list_open', norm_tx(lst, 'list'))\n    rec.text('delivery.tx_describe_open', norm_tx(desc, 'describe'))\n    r2 = subprocess.run([py, script, '--bootstrap', c.bootstrap], capture_output=True, text=True, timeout=180)\n    time.sleep(1)\n    out_c = kx.read_all(c.bootstrap, 'tx-out', isolation='read_committed', timeout=15)\n    out_u = kx.read_all(c.bootstrap, 'tx-out', isolation='read_uncommitted', timeout=15)\n    ids_c = [json.loads(m[3])['order_id'] for m in out_c]\n    ids_u = [json.loads(m[3])['order_id'] for m in out_u]\n    rc, desc2, _ = c.tool('kafka-transactions', 'describe', '--transactional-id', 'tx-pipeline-1')\n    rec.text('delivery.tx_describe_done', norm_tx(desc2, 'describe'))\n    rec.counts('delivery.tx_after_restart', {'exit_code_of_the_second_run': r2.returncode, 'read_committed_records': len(out_c), 'read_committed_distinct_orders': len(set(ids_c)),\n                                             'read_committed_has_duplicates': len(ids_c) != len(set(ids_c)), 'read_committed_in_order': ids_c == sorted(ids_c),\n                                             'read_uncommitted_records': len(out_u), 'read_uncommitted_distinct_orders': len(set(ids_u)),\n                                             'orders_seen_twice_by_read_uncommitted': sorted(i for i in set(ids_u) if ids_u.count(i) > 1)})\n    # the markers in the log\n    d = c.data_dir(1) / 'tx-out-0'\n    markers = []\n    for f in sorted(d.glob('*.log')):\n        rc, dump, _ = C.run_tool('kafka-dump-log', '--files', str(f), '--print-data-log')\n        markers += [l for l in dump.splitlines() if 'endTxnMarker' in l]\n    kinds = {'COMMIT': sum('endTxnMarker: COMMIT' in l for l in markers), 'ABORT': sum('endTxnMarker: ABORT' in l for l in markers)}\n    rec.counts('delivery.tx_markers', {'markers_in_the_log': len(markers), 'commit': kinds['COMMIT'], 'abort': kinds['ABORT'], 'transactions_that_wrote_records': 11})\n    k = next(i for i, l in enumerate(markers) if 'ABORT' in l)\n    rec.text('delivery.tx_marker_lines', '\\n'.join(re.sub(r'CreateTime: \\d+ ', '', l) for l in markers[max(0, k - 1):k + 2]))\n    rc, lst2, _ = c.tool('kafka-transactions', 'list')\n    rec.text('delivery.tx_list_done', norm_tx(lst2, 'list'))\n\n\ndef record_delivery(c, rec):\n    commit_experiments(c, rec)\n    transactions(c, rec)\n\n\ndef record_lost_ack(rec):\n    retry_experiment(rec)",
  "code/keys.py": "\"\"\"Mission 3: topics, partitions and keys. Which partition does a key go to, what skew does a hot key cause, and what happens when partitions are added.\"\"\"\nimport collections\nimport json\nimport time\n\nimport cluster as C\nimport kx\n\nSPREAD3 = [[1, 2, 3], [2, 3, 1], [3, 1, 2]]\n\n\ndef placement(bootstrap, topic, partitioner):\n    \"\"\"Send one record for each store with the given partitioner and return the partition that the broker reports for each.\"\"\"\n    p = kx.producer(bootstrap, partitioner=partitioner)\n    placed = {}\n\n    def cb(err, msg):\n        placed[msg.key().decode()] = msg.partition()\n    for s in kx.STORES:\n        p.produce(topic, key=s, value='x', callback=cb)\n    p.flush()\n    return [placed[s] for s in kx.STORES]\n\n\ndef record_keys(c, rec):\n    kx.delete_topics(c.bootstrap, ['keys-3', 'keys-6', 'keys-12', 'orders-6p', 'adding', 'keyless-steady', 'keyless-burst'])\n    # ---- the same key on topics of different sizes, with two different default partitioners ----\n    rows, rows_crc, ok = [], [], True\n    real = {}\n    for parts in (3, 6, 12):\n        kx.create_topic(c.bootstrap, 'keys-%d' % parts, assignment=[[1 + i % 3] for i in range(parts)])\n        real[parts] = placement(c.bootstrap, 'keys-%d' % parts, 'murmur2_random')\n        ok = ok and real[parts] == [kx.partition_for(s, parts) for s in kx.STORES]\n    crc = {parts: placement(c.bootstrap, 'keys-%d' % parts, 'consistent_random') for parts in (3, 6, 12)}\n    rec.table('keys.placement', ['key', '3 partitions', '6 partitions', '12 partitions'], [[s, real[3][i], real[6][i], real[12][i]] for i, s in enumerate(kx.STORES)])\n    rec.table('keys.placement_other_client', ['key', '3 partitions', '6 partitions', '12 partitions'], [[s, crc[3][i], crc[6][i], crc[12][i]] for i, s in enumerate(kx.STORES)])\n    rec.counts('keys.placement_check', {'my_murmur2_matches_the_broker_placement': ok, 'keys': len(kx.STORES), 'partition_counts_tried': [3, 6, 12],\n                                        'keys_where_the_two_partitioners_disagree_on_6': sum(1 for i in range(12) if real[6][i] != crc[6][i])})\n\n    # ---- 12,000 orders on 6 partitions: one store is a third of them ----\n    kx.create_topic(c.bootstrap, 'orders-6p', assignment=[[1 + i % 3] for i in range(6)], config={'retention.ms': '-1'})\n    p = kx.producer(c.bootstrap)\n    kx.send(p, 'orders-6p', 12000)\n    off = kx.offsets(c.bootstrap, 'orders-6p')\n    msgs = kx.read_all(c.bootstrap, 'orders-6p')\n    stores_in = collections.defaultdict(set)\n    for part, _, key, _, _ in msgs:\n        stores_in[part].add(key)\n    total = sum(hi - lo for lo, hi in off.values())\n    rec.table('keys.skew', ['partition', 'records', 'share of all records', 'stores in it'],\n              [[pn, off[pn][1], round(off[pn][1] / total, 3), ' '.join(sorted(stores_in[pn]))] for pn in sorted(off)])\n    per_store = collections.Counter(k for _, _, k, _, _ in msgs)\n    busiest = max(off.values(), key=lambda x: x[1])[1]\n    rec.counts('keys.skew_summary', {'records': total, 'partitions': 6, 'busiest_partition_records': busiest, 'even_share_records': total // 6,\n                                     'busiest_over_even': round(busiest / (total / 6), 2), 'busiest_store': 's01', 'busiest_store_records': per_store['s01'],\n                                     'busiest_store_share': round(per_store['s01'] / total, 3)})\n    rec.table('keys.store_records', ['key', 'records among the 12,000'], [[st, per_store[st]] for st in kx.STORES])\n    # order inside a partition: the order ids of one partition always rise; across the topic they do not\n    by_part = collections.defaultdict(list)\n    for part, o, k, v, ts in msgs:\n        by_part[part].append(json.loads(v)['order_id'])\n    rec.counts('keys.ordering', {'every_partition_is_in_order': all(ids == sorted(ids) for ids in by_part.values()),\n                                 'partition_0_first_order_ids': by_part[0][:8], 'partition_1_first_order_ids': by_part[1][:8],\n                                 'one_store_stays_in_one_partition': all(len({pn for pn in stores_in if k in stores_in[pn]}) == 1 for k in kx.STORES)})\n\n    # ---- adding partitions moves keys ----\n    kx.create_topic(c.bootstrap, 'adding', assignment=SPREAD3, config={'retention.ms': '-1'})\n    first = {}\n\n    def cb1(err, msg):\n        first[msg.key().decode()] = (msg.partition(), msg.offset())\n    p = kx.producer(c.bootstrap)\n    for s in kx.STORES:\n        p.produce('adding', key=s, value=json.dumps({'store_id': s, 'seq': 1}), callback=cb1)\n    p.flush()\n    from confluent_kafka.admin import NewPartitions\n    a = kx.admin(c.bootstrap)\n    for f in a.create_partitions([NewPartitions('adding', 6, replica_assignment=SPREAD3)]).values():\n        f.result(30)\n    time.sleep(1)\n    kx.wait_for_leaders(c.bootstrap, 'adding')\n    second = {}\n\n    def cb2(err, msg):\n        second[msg.key().decode()] = (msg.partition(), msg.offset())\n    p = kx.producer(c.bootstrap)\n    for s in kx.STORES:\n        p.produce('adding', key=s, value=json.dumps({'store_id': s, 'seq': 2}), callback=cb2)\n    p.flush()\n    moved = [s for s in kx.STORES if first[s][0] != second[s][0]]\n    rec.table('keys.adding', ['key', 'partition before (3 partitions)', 'partition after (6 partitions)', 'moved'],\n              [[s, first[s][0], second[s][0], 'moved' if s in moved else 'same'] for s in kx.STORES])\n    rec.counts('keys.adding_summary', {'keys': 12, 'moved': len(moved), 'stayed': 12 - len(moved), 'new_partitions': [3, 4, 5]})\n\n    # ---- records without a key: they go to a partition that is chosen for a whole batch ----\n    def keyless(name, steady):\n        kx.delete_topics(c.bootstrap, [name])\n        kx.create_topic(c.bootstrap, name, assignment=[[1 + i % 3] for i in range(6)], config={'retention.ms': '-1'})\n        p = kx.producer(c.bootstrap, **{'linger.ms': 5})\n        for b in range(120):\n            for j in range(100):\n                p.produce(name, value=kx.value(b * 100 + j))\n            if steady:\n                p.poll(0)\n                time.sleep(0.02)          # a steady stream: a batch every 20 ms\n        p.flush()\n        off = kx.offsets(c.bootstrap, name)\n        return [off[pn][1] for pn in sorted(off)]\n    steady, burst = keyless('keyless-steady', True), keyless('keyless-burst', False)\n    rec.counts('keys.keyless', {'records': 12000, 'partitions': 6, 'batch_size': 100,\n                                'steady_stream_records_per_partition_in_this_run': steady, 'steady_stream_smallest_share': round(min(steady) / 12000, 3),\n                                'steady_stream_largest_share': round(max(steady) / 12000, 3), 'one_burst_records_per_partition_in_this_run': burst,\n                                'one_burst_largest_share': round(max(burst) / 12000, 3), 'all_counts_are_multiples_of_the_batch_size': all(x % 100 == 0 for x in steady),\n                                'note': 'the partition of a keyless batch is chosen at random, so the counts differ from run to run'})",
  "code/kx.py": "\"\"\"Small helpers that the experiments share: made-up Brewline events, topics, a producer, a reader, and the arithmetic of the default partitioner.\n\nNothing here hides what Kafka does. The experiments call the Kafka client (confluent-kafka, which is librdkafka) and the command line tools of the distribution.\n\"\"\"\nimport json\nimport time\n\nfrom confluent_kafka import Consumer, KafkaException, Producer, TopicPartition\nfrom confluent_kafka.admin import AdminClient, NewTopic\n\nT0 = 1767225600000  # 2026-01-01 00:00:00 UTC, in milliseconds: the time of the first made-up event\nSTORES = ['s01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10', 's11', 's12']\n# the share of the orders that each store sells; store s01 sells about a third of them (the same shape as the Spark course)\nSHARE = [338, 80, 80, 81, 81, 70, 61, 60, 50, 40, 30, 29]\n\n\ndef store_of(i):\n    \"\"\"The store of order number i (0, 1, 2, ...). A fixed rule, so that every run writes the same events: the shares repeat every 1,000 orders.\"\"\"\n    r = (i * 389) % 1000          # 389 and 1000 share no factor, so this visits every remainder once in a thousand orders, in a scrambled order\n    acc = 0\n    for s, w in zip(STORES, SHARE):\n        acc += w\n        if r < acc:\n            return s\n    return STORES[-1]\n\n\ndef order(i):\n    \"\"\"The i-th order as an event: the value is JSON, the key is the store.\"\"\"\n    return {'order_id': i + 1, 'store_id': store_of(i), 'customer_id': None if i % 4 == 3 else 1000 + (i * 7) % 5250,\n            'total_cents': 300 + (i * 37) % 500, 'status': 'paid' if i % 5 else 'refunded', 'channel': ('app', 'counter', 'web')[i % 3]}\n\n\ndef value(i):\n    return json.dumps(order(i), separators=(',', ':'))\n\n\n# ---- murmur2: the hash of the default partitioner of the Java client and of the console tools ---------------------------------------------------------------\ndef murmur2(data):\n    length = len(data)\n    seed = 0x9747b28c\n    m = 0x5bd1e995\n    r = 24\n    h = (seed ^ length) & 0xffffffff\n    i = 0\n    for _ in range(length // 4):\n        k = data[i] | (data[i + 1] << 8) | (data[i + 2] << 16) | (data[i + 3] << 24)\n        k = (k * m) & 0xffffffff\n        k ^= k >> r\n        k = (k * m) & 0xffffffff\n        h = (h * m) & 0xffffffff\n        h ^= k\n        i += 4\n    rest = length % 4\n    if rest == 3:\n        h ^= data[i + 2] << 16\n    if rest >= 2:\n        h ^= data[i + 1] << 8\n    if rest >= 1:\n        h ^= data[i]\n        h = (h * m) & 0xffffffff\n    h ^= h >> 13\n    h = (h * m) & 0xffffffff\n    h ^= h >> 15\n    return h\n\n\ndef partition_for(key, partitions):\n    \"\"\"What the default partitioner of the Java client does with a key: murmur2 of the bytes, made positive, modulo the number of partitions.\"\"\"\n    return (murmur2(key.encode() if isinstance(key, str) else key) & 0x7fffffff) % partitions\n\n\n# ---- topics ----------------------------------------------------------------------------------------------------------------------------------------------\ndef admin(bootstrap):\n    return AdminClient({'bootstrap.servers': bootstrap})\n\n\ndef create_topic(bootstrap, name, partitions=1, replication=1, config=None, assignment=None, wait=True):\n    \"\"\"Create a topic and wait until the cluster has made it. With an assignment (a list of replica lists) the placement is fixed, so every run is the same.\"\"\"\n    a = admin(bootstrap)\n    if assignment is not None:\n        nt = NewTopic(name, num_partitions=len(assignment), replication_factor=-1, replica_assignment=assignment, config=config or {})\n    else:\n        nt = NewTopic(name, num_partitions=partitions, replication_factor=replication, config=config or {})\n    for f in a.create_topics([nt]).values():\n        f.result(30)\n    if wait:\n        wait_for_leaders(bootstrap, name)\n\n\ndef delete_topics(bootstrap, names):\n    \"\"\"Delete topics if they exist (used when a section is run again on the same cluster).\"\"\"\n    a = admin(bootstrap)\n    have = set(a.list_topics(timeout=10).topics)\n    todo = [n for n in names if n in have]\n    if not todo:\n        return\n    for f in a.delete_topics(todo).values():\n        f.result(30)\n    t0 = time.time()\n    while todo and time.time() - t0 < 30:\n        todo = [n for n in todo if n in a.list_topics(timeout=10).topics]\n        time.sleep(0.3)\n\n\ndef wait_for_leaders(bootstrap, name, timeout=30):\n    a = admin(bootstrap)\n    t0 = time.time()\n    while time.time() - t0 < timeout:\n        md = a.list_topics(name, timeout=10).topics.get(name)\n        if md is not None and md.partitions and all(p.leader >= 0 for p in md.partitions.values()):\n            return md\n        time.sleep(0.2)\n    raise TimeoutError('no leaders for ' + name)\n\n\ndef layout(bootstrap, name):\n    \"\"\"Leader, replicas and in-sync replicas of every partition, as rows [partition, leader, replicas, isr].\"\"\"\n    md = admin(bootstrap).list_topics(name, timeout=10).topics[name]\n    return [[p, md.partitions[p].leader, list(md.partitions[p].replicas), sorted(md.partitions[p].isrs)] for p in sorted(md.partitions)]\n\n\n# ---- producing and reading ---------------------------------------------------------------------------------------------------------------------------------\ndef producer(bootstrap, **conf):\n    c = {'bootstrap.servers': bootstrap, 'partitioner': 'murmur2_random', 'linger.ms': 5000, 'batch.num.messages': 100, 'queue.buffering.max.messages': 500000}\n    c.update(conf)\n    return Producer(c)\n\n\ndef send(p, topic, n, start=0, key=True, partition=None, timestamp=True, headers=None):\n    \"\"\"Send orders start .. start+n-1 and wait for every delivery report. Returns the orders and the (partition, offset) of each one, in order.\"\"\"\n    placed = {}\n\n    def mk(i):\n        def cb(err, msg):\n            if err:\n                raise KafkaException(err)\n            placed[i] = (msg.partition(), msg.offset())\n        return cb\n    out = []\n    for i in range(start, start + n):\n        o = order(i)\n        kw = {'key': o['store_id']} if key else {}\n        if partition is not None:\n            kw['partition'] = partition\n        if timestamp:\n            kw['timestamp'] = T0 + i * 1000\n        if headers:\n            kw['headers'] = headers\n        p.produce(topic, value=json.dumps(o, separators=(',', ':')), callback=mk(i), **kw)\n        out.append(o)\n    p.flush(60)\n    return out, [placed[i] for i in range(start, start + n)]\n\n\ndef consumer(bootstrap, group, **conf):\n    c = {'bootstrap.servers': bootstrap, 'group.id': group, 'auto.offset.reset': 'earliest', 'enable.auto.commit': False, 'enable.partition.eof': True}\n    c.update(conf)\n    return Consumer(c)\n\n\ndef read_all(bootstrap, topic, partitions=None, isolation='read_uncommitted', timeout=30, group='reader', raw=False):\n    \"\"\"Read a topic from the beginning to the end of every partition. Returns the messages as (partition, offset, key, value, timestamp).\"\"\"\n    c = consumer(bootstrap, group + '-' + str(time.time()), **{'isolation.level': isolation})\n    md = c.list_topics(topic, timeout=10).topics[topic]\n    parts = sorted(md.partitions) if partitions is None else partitions\n    c.assign([TopicPartition(topic, p, 0) for p in parts])\n    done, out, t0 = set(), [], time.time()\n    while len(done) < len(parts) and time.time() - t0 < timeout:\n        m = c.poll(0.5)\n        if m is None:\n            continue\n        if m.error():\n            if m.error().code() == -191:  # partition EOF\n                done.add(m.partition())\n                continue\n            raise KafkaException(m.error())\n        key, val = m.key(), m.value()\n        if not raw:\n            key = key.decode(errors='replace') if key else None\n            val = val.decode(errors='replace') if val is not None else None\n        out.append((m.partition(), m.offset(), key, val, m.timestamp()[1]))\n    c.close()\n    return out\n\n\ndef offsets(bootstrap, topic):\n    \"\"\"The first and the next offset of every partition: {partition: (earliest, latest)}.\"\"\"\n    c = consumer(bootstrap, 'offsets-' + str(time.time()))\n    md = c.list_topics(topic, timeout=10).topics[topic]\n    r = {p: c.get_watermark_offsets(TopicPartition(topic, p), timeout=10) for p in sorted(md.partitions)}\n    c.close()\n    return r",
  "code/lossy_proxy.py": "\"\"\"A TCP proxy that sits between a client and one Kafka broker and throws away the response to the first Produce request.\n\nThe broker has written the records, the client never hears about it. This is what a network that drops a packet looks like to a producer, and it is the cleanest way to make\na producer retry a batch that the broker already has. It reads the Kafka protocol only as far as it must: every request and response starts with a 4 byte length, a request has an\nAPI key (Produce is 0) and a correlation id, and a response starts with the correlation id of the request that it answers.\n\"\"\"\nimport socket\nimport threading\n\n\ndef recv_exact(sock, n):\n    buf = b''\n    while len(buf) < n:\n        chunk = sock.recv(n - len(buf))\n        if not chunk:\n            raise ConnectionError('closed')\n        buf += chunk\n    return buf\n\n\nclass LossyProxy:\n    def __init__(self, listen_port, target_port, drop=1):\n        self.listen_port, self.target_port, self.drop = listen_port, target_port, drop\n        self.dropped = 0\n        self.produce_requests = 0\n        self.srv = socket.socket()\n        self.srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)\n        self.srv.bind(('localhost', listen_port))\n        self.srv.listen(16)\n        self.lock = threading.Lock()\n        threading.Thread(target=self._accept, daemon=True).start()\n\n    def arm(self, drop=1):\n        \"\"\"Start counting again and throw away the response to the next `drop` Produce requests.\"\"\"\n        with self.lock:\n            self.dropped, self.produce_requests, self.drop = 0, 0, drop\n\n    def _accept(self):\n        while True:\n            try:\n                client, _ = self.srv.accept()\n            except OSError:\n                return\n            threading.Thread(target=self._handle, args=(client,), daemon=True).start()\n\n    def _handle(self, client):\n        try:\n            up = socket.create_connection(('localhost', self.target_port))\n        except OSError:\n            client.close()\n            return\n        produce_ids = set()\n\n        def to_broker():\n            try:\n                while True:\n                    head = recv_exact(client, 4)\n                    body = recv_exact(client, int.from_bytes(head, 'big'))\n                    if int.from_bytes(body[0:2], 'big', signed=True) == 0:         # API key 0 is Produce\n                        with self.lock:\n                            self.produce_requests += 1\n                        produce_ids.add(int.from_bytes(body[4:8], 'big'))\n                    up.sendall(head + body)\n            except (ConnectionError, OSError):\n                pass\n            finally:\n                for s in (up, client):\n                    try:\n                        s.close()\n                    except OSError:\n                        pass\n\n        def to_client():\n            try:\n                while True:\n                    head = recv_exact(up, 4)\n                    body = recv_exact(up, int.from_bytes(head, 'big'))\n                    corr = int.from_bytes(body[0:4], 'big')\n                    if corr in produce_ids:\n                        produce_ids.discard(corr)\n                        with self.lock:\n                            if self.dropped < self.drop:\n                                self.dropped += 1\n                                continue                      # the response is thrown away\n                    client.sendall(head + body)\n            except (ConnectionError, OSError):\n                pass\n            finally:\n                for s in (up, client):\n                    try:\n                        s.close()\n                    except OSError:\n                        pass\n        threading.Thread(target=to_broker, daemon=True).start()\n        threading.Thread(target=to_client, daemon=True).start()\n\n    def close(self):\n        self.srv.close()",
  "code/ops.py": "\"\"\"Mission 14: running Kafka. The numbers that tell you something is wrong (read over JMX from the brokers), a rolling restart under a producer that never stops, a partition that is moved to a\nnew broker, and a quota.\n\nWhat is real: the brokers, their metrics, the tools, the data on disk. What is not: a real network and real load. Everything runs on one machine, so rates and times are not recorded; counts are.\n\"\"\"\nimport json\nimport os\nimport re\nimport tempfile\nimport threading\nimport time\n\nfrom confluent_kafka import Producer\n\nimport cluster as C\nimport kx\nfrom replication import layout_rows, wait_layout\nfrom world import norm\n\nJMX_BASE = 9990\nCONTROLLER = 100\n\n\ndef jmx_port(node):\n    return JMX_BASE + node if node < 100 else 9899\n\n\ndef jmx(c, node, bean, attr='Value'):\n    \"\"\"One attribute of one MBean of a broker or of the controller, read with the kafka-jmx tool of the distribution.\"\"\"\n    url = 'service:jmx:rmi:///jndi/rmi://localhost:%d/jmxrmi' % jmx_port(node)\n    rc, out, err = C.run_tool('kafka-jmx', '--jmx-url', url, '--object-name', bean, '--attributes', attr, '--one-time', 'true', timeout=60)\n    for line in out.splitlines():\n        m = re.match(r'\"?[^,]*\"?,\\s*\"?([-\\d.eE+]+)\"?$', line.strip())\n        if m:\n            return float(m.group(1))\n    return out.strip() or err.strip()\n\n\nBEANS = [('under-replicated partitions', 'kafka.server:type=ReplicaManager,name=UnderReplicatedPartitions', 'broker'),\n         ('partitions below the minimum in-sync replicas', 'kafka.server:type=ReplicaManager,name=UnderMinIsrPartitionCount', 'broker'),\n         ('partitions that this broker leads', 'kafka.server:type=ReplicaManager,name=LeaderCount', 'broker'),\n         ('offline partitions', 'kafka.controller:type=KafkaController,name=OfflinePartitionsCount', 'controller'),\n         ('active controllers', 'kafka.controller:type=KafkaController,name=ActiveControllerCount', 'controller')]\n\n\ndef broker_numbers(c, nodes):\n    \"\"\"The broker metrics from each broker, and the controller metrics from the controller (a broker does not have those).\"\"\"\n    out = {n: {label: jmx(c, n, bean) for label, bean, where in BEANS if where == 'broker'} for n in nodes}\n    out[CONTROLLER] = {label: jmx(c, CONTROLLER, bean) for label, bean, where in BEANS if where == 'controller'}\n    return out\n\n\ndef record_ops(rec):\n    node_env = {i: {'JMX_PORT': jmx_port(i)} for i in (1, 2, 3, 4, CONTROLLER)}\n    with C.Cluster(isolated=True, props={'replica.lag.time.max.ms': 6000}, node_env=node_env) as c:\n        run(c, rec)\n\n\ndef run(c, rec):\n    kx.delete_topics(c.bootstrap, ['gauge', 'rolling', 'moving'])\n    # ---- the numbers of a healthy cluster, and of a cluster that lost a broker ----\n    kx.create_topic(c.bootstrap, 'gauge', assignment=[[1, 2, 3], [2, 3, 1], [3, 1, 2]], config={'min.insync.replicas': '2', 'retention.ms': '-1'})\n    healthy = broker_numbers(c, [1, 2, 3])\n    c.stop_node(1, kill=True)\n    wait_layout(c, 'gauge', lambda l: all(1 not in x[3] for x in l))\n    time.sleep(2)\n    hurt = broker_numbers(c, [2, 3])\n    rows = []\n    for label, bean, where in BEANS:\n        if where == 'broker':\n            rows.append([label, 'a broker', ' / '.join(str(int(healthy[n][label])) for n in (1, 2, 3)), ' / '.join(str(int(hurt[n][label])) for n in (2, 3))])\n        else:\n            rows.append([label, 'the controller', str(int(healthy[CONTROLLER][label])), str(int(hurt[CONTROLLER][label]))])\n    rec.table('ops.metrics', ['what is counted', 'read from', 'all three brokers up (brokers 1 / 2 / 3)', 'broker 1 is dead (brokers 2 / 3)'], rows)\n    rec.counts('ops.metrics_reading', {'tool': 'kafka-jmx.sh', 'bean_of_under_replicated': BEANS[0][1], 'under_replicated_when_healthy': sum(healthy[n][BEANS[0][0]] for n in (1, 2, 3)),\n                                       'under_replicated_when_broker_1_is_dead': sum(hurt[n][BEANS[0][0]] for n in (2, 3)),\n                                       'partitions_with_a_replica_on_broker_1': 3, 'offline_when_broker_1_is_dead': hurt[CONTROLLER][BEANS[3][0]],\n                                       'leaders_on_brokers_2_and_3_when_broker_1_is_dead': sum(hurt[n][BEANS[2][0]] for n in (2, 3))})\n    c.start_node(1)\n    c.wait_ready([c.node(1)])\n    wait_layout(c, 'gauge', lambda l: all(len(x[3]) == 3 for x in l))\n\n    # ---- a rolling restart, with a producer that keeps sending ----\n    kx.create_topic(c.bootstrap, 'rolling', assignment=[[1, 2, 3], [2, 3, 1], [3, 1, 2]], config={'min.insync.replicas': '2', 'retention.ms': '-1'})\n    stop = threading.Event()\n    sent, delivered, errors = [0], [0], []\n\n    def cb(err, msg):\n        if err:\n            errors.append(err.name())\n        else:\n            delivered[0] += 1\n    p = Producer({'bootstrap.servers': c.bootstrap, 'acks': 'all', 'enable.idempotence': True, 'linger.ms': 5, 'partitioner': 'murmur2_random', 'message.timeout.ms': 120000})\n\n    def loop():\n        i = 0\n        while not stop.is_set():\n            o = kx.order(i)\n            p.produce('rolling', key=o['store_id'], value=kx.value(i), callback=cb)\n            p.poll(0)\n            i += 1\n            sent[0] = i\n            time.sleep(0.01)\n        p.flush(120)\n    th = threading.Thread(target=loop)\n    th.start()\n    time.sleep(3)\n    steps = []\n    for nid in (1, 2, 3):\n        c.stop_node(nid)                                                       # a clean shutdown: the broker hands its partitions to other brokers first\n        wait_layout(c, 'rolling', lambda l: all(nid not in x[3] for x in l))\n        under = [jmx(c, n, BEANS[0][1]) for n in (1, 2, 3) if n != nid]\n        c.start_node(nid)\n        c.wait_ready([c.node(nid)])\n        wait_layout(c, 'rolling', lambda l: all(len(x[3]) == 3 for x in l))\n        steps.append(['restart broker %d' % nid, 'broker %d is down' % nid, int(sum(under)), 'all three in sync again'])\n        time.sleep(2)\n    stop.set()\n    th.join()\n    time.sleep(3)\n    got = kx.read_all(c.bootstrap, 'rolling', timeout=30)\n    ids = [json.loads(m[3])['order_id'] for m in got]\n    rec.table('ops.rolling_steps', ['step', 'while it is down', 'under-replicated partitions then (sum on the other brokers)', 'afterwards'], steps)\n    rec.counts('ops.rolling_restart', {'orders_sent': sent[0], 'delivery_reports_ok': delivered[0], 'errors': len(errors), 'records_in_the_topic': len(got), 'distinct_orders': len(set(ids)),\n                                       'lost': sent[0] - len(set(ids)), 'duplicates': len(ids) - len(set(ids)), 'brokers_restarted': 3, 'acks': 'all', 'min_insync_replicas': 2,\n                                       'idempotent_producer': True})\n\n    # ---- moving a partition to a new broker ----\n    kx.create_topic(c.bootstrap, 'moving', assignment=[[1, 2, 3]], config={'retention.ms': '-1', 'min.insync.replicas': '2'})\n    kx.send(kx.producer(c.bootstrap), 'moving', 3000, partition=0)\n    c.add_broker(4, c.node(3).broker_port + 100)\n    time.sleep(3)\n    before = layout_rows(kx.layout(c.bootstrap, 'moving'))\n    topics_json = json.dumps({'topics': [{'topic': 'moving'}], 'version': 1})\n    d = tempfile.mkdtemp()\n    tj = os.path.join(d, 'topics.json')\n    open(tj, 'w').write(topics_json)\n    rc, out, err = c.tool('kafka-reassign-partitions', '--generate', '--topics-to-move-json-file', tj, '--broker-list', '2,3,4')\n    rec.text('ops.reassign_generate', norm(out, c))\n    plan = json.dumps({'version': 1, 'partitions': [{'topic': 'moving', 'partition': 0, 'replicas': [2, 3, 4], 'log_dirs': ['any', 'any', 'any']}]})\n    pj = os.path.join(d, 'plan.json')\n    open(pj, 'w').write(plan)\n    rc, out, err = c.tool('kafka-reassign-partitions', '--execute', '--reassignment-json-file', pj, '--throttle', '50000000')\n    rec.text('ops.reassign_execute', norm(out, c))\n    lay = wait_layout(c, 'moving', lambda l: l[0][2] == [2, 3, 4] and sorted(l[0][3]) == [2, 3, 4], timeout=180)\n    rc, out, err = c.tool('kafka-reassign-partitions', '--verify', '--reassignment-json-file', pj)\n    rec.text('ops.reassign_verify', norm(out, c))\n    time.sleep(8)\n    on_disk = {n: (c.data_dir(n) / 'moving-0').exists() for n in (1, 2, 3, 4)}\n    sizes = {n: sum(f.stat().st_size for f in (c.data_dir(n) / 'moving-0').glob('*.log')) for n in (2, 3, 4) if on_disk[n]}\n    rec.table('ops.reassign_layout', ['moment', 'partition', 'leader', 'replicas', 'in-sync replicas'], [['before'] + r for r in before] + [['after'] + r for r in layout_rows(lay)])\n    rec.counts('ops.reassign_result', {'replicas_before': [1, 2, 3], 'replicas_after': [2, 3, 4], 'folder_exists_on_broker': {str(k): v for k, v in on_disk.items()}, 'log_bytes_on_the_new_broker_equals_the_others': len(set(sizes.values())) == 1,\n                                       'records': 3000, 'throttle_bytes_per_second': 50000000})\n\n\ndef record_quota(c, rec):\n    \"\"\"A quota: the broker slows a client down that sends more bytes per second than it may. The client is told how long to wait, and the producer simply takes longer.\n    The broker measures the rate over a window of 11 one second samples by default, so a short burst of up to rate x 11 bytes is not throttled: the experiment must send more than that.\"\"\"\n    kx.delete_topics(c.bootstrap, ['quota'])\n    kx.create_topic(c.bootstrap, 'quota', assignment=[[1]], config={'retention.ms': '-1'})\n    cli = 'quota-client'\n    n, rate = 60000, 200_000\n    body = [kx.value(i) for i in range(n)]\n    size = sum(len(b) for b in body)\n\n    def send_all(client_id):\n        stats = []\n        p = Producer({'bootstrap.servers': c.bootstrap, 'client.id': client_id, 'statistics.interval.ms': 500, 'stats_cb': lambda s: stats.append(json.loads(s)), 'linger.ms': 20, 'acks': '1',\n                      'queue.buffering.max.messages': 200000})\n        t0 = time.time()\n        for v in body:\n            p.produce('quota', value=v)\n            p.poll(0)\n        p.flush(180)\n        took = time.time() - t0\n        p.poll(1)\n        thr = max([b.get('throttle', {}).get('max', 0) for s in stats for b in s.get('brokers', {}).values()] or [0])\n        return took, thr\n    rc, out, err = c.tool('kafka-configs', '--describe', '--all', '--entity-type', 'brokers', '--entity-name', '1')\n    win_num = int(re.search(r'quota\\.window\\.num=(\\d+)', out).group(1))\n    win_size = int(re.search(r'quota\\.window\\.size\\.seconds=(\\d+)', out).group(1))\n    burst = rate * win_num * win_size\n    free_took, free_thr = send_all('no-quota-client')\n    rc, out, err = c.tool('kafka-configs', '--alter', '--entity-type', 'clients', '--entity-name', cli, '--add-config', 'producer_byte_rate=%d' % rate)\n    rec.text('ops.quota_set', out.strip() or err.strip())\n    rc, out, err = c.tool('kafka-configs', '--describe', '--entity-type', 'clients', '--entity-name', cli)\n    rec.text('ops.quota_described', out.strip() or err.strip())\n    time.sleep(2)\n    slow_took, slow_thr = send_all(cli)\n    rec.counts('ops.quota', {'quota_bytes_per_second': rate, 'bytes_sent': size, 'window_samples': win_num, 'window_seconds_each': win_size, 'burst_the_window_allows_bytes': burst,\n                             'sent_more_than_the_burst': size > burst, 'seconds_the_quota_forces_at_least': round(max(0, size - burst) / rate, 1), 'client_without_a_quota_waited_ms': free_thr,\n                             'client_with_the_quota_waited_ms_at_most': slow_thr, 'the_broker_asked_the_client_to_wait': slow_thr > 0 and free_thr == 0,\n                             'the_client_with_the_quota_took_longer': slow_took > 2 * free_took})\n    c.tool('kafka-configs', '--alter', '--entity-type', 'clients', '--entity-name', cli, '--delete-config', 'producer_byte_rate')",
  "code/postgres.py": "\"\"\"A PostgreSQL 16 server on this machine for the change data capture mission. Logical decoding needs wal_level=logical; everything else is the default.\"\"\"\nimport os\nimport pathlib\nimport shutil\nimport subprocess\nimport tempfile\nimport time\n\nBIN = pathlib.Path('/usr/lib/postgresql/16/bin')\n\n\nclass Pg:\n    def __init__(self, port=15432):\n        self.port = port\n        self.dir = pathlib.Path(tempfile.mkdtemp(prefix='pg-capture-'))\n        os.chmod(self.dir, 0o755)\n        shutil.chown(self.dir, 'postgres', 'postgres')\n        self.data = self.dir / 'data'\n\n    def as_postgres(self, *cmd, **kw):\n        return subprocess.run(['runuser', '-u', 'postgres', '--'] + [str(c) for c in cmd], capture_output=True, text=True, **kw)\n\n    def start(self):\n        r = self.as_postgres(BIN / 'initdb', '-D', self.data, '--auth=trust', '-U', 'postgres', '--encoding=UTF8', '--locale=C.UTF-8')\n        if r.returncode:\n            raise RuntimeError(r.stdout + r.stderr)\n        opts = ('-p %d -c listen_addresses=localhost -c unix_socket_directories=%s -c wal_level=logical -c max_replication_slots=4 -c max_wal_senders=4 '\n                '-c shared_buffers=64MB -c max_wal_size=256MB -c min_wal_size=80MB' % (self.port, self.dir))\n        r = self.as_postgres(BIN / 'pg_ctl', '-D', self.data, '-o', opts, '-l', self.dir / 'pg.log', '-w', 'start')\n        if r.returncode:\n            raise RuntimeError(r.stdout + r.stderr + (self.dir / 'pg.log').read_text())\n        self.psql('CREATE DATABASE brewline;', db='postgres')\n        return self\n\n    def psql(self, sql, db='brewline', tuples=True):\n        args = [str(BIN / 'psql'), '-h', 'localhost', '-p', str(self.port), '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1']\n        if tuples:\n            args += ['-At', '-F', '|']\n        r = subprocess.run(args + ['-c', sql], capture_output=True, text=True)\n        if r.returncode:\n            raise RuntimeError('psql failed: %s\\n%s' % (sql, r.stderr))\n        return r.stdout.strip()\n\n    def stop(self):\n        self.as_postgres(BIN / 'pg_ctl', '-D', self.data, '-m', 'fast', '-w', 'stop')\n        shutil.rmtree(self.dir, ignore_errors=True)",
  "code/producers.py": "\"\"\"Mission 4: producers. What acks mean, what batching and compression do to the bytes on disk, what a producer does with an error, and what idempotence adds to a batch.\"\"\"\nimport json\nimport time\n\nfrom confluent_kafka import KafkaException, Producer\n\nimport cluster as C\nimport kx\nfrom world import parse_dump\n\nON_NODE_1 = [[1]]\n\n\ndef log_files(c, topic):\n    return sorted((c.data_dir(1) / (topic + '-0')).glob('*.log'))\n\n\ndef log_bytes(c, topic):\n    return sum(f.stat().st_size for f in log_files(c, topic))\n\n\ndef batches(c, topic):\n    out = []\n    for f in log_files(c, topic):\n        out += parse_dump(C.run_tool('kafka-dump-log', '--files', str(f))[1])\n    return out\n\n\ndef acks_experiment(c, rec):\n    \"\"\"The same 1,000 orders with acks 0, 1 and all. The delivery report is what the producer learns about each one.\"\"\"\n    rows = []\n    for acks in ('0', '1', 'all'):\n        name = 'acks-' + acks\n        kx.create_topic(c.bootstrap, name, assignment=[[1, 2, 3]], config={'retention.ms': '-1'})\n        reports = []\n\n        def cb(err, msg):\n            reports.append((str(err) if err else None, msg.offset(), msg.partition()))\n        p = kx.producer(c.bootstrap, **{'acks': acks, 'batch.num.messages': 100})\n        for i in range(1000):\n            p.produce(name, key=kx.order(i)['store_id'], value=kx.value(i), timestamp=kx.T0 + i * 1000, partition=0, callback=cb)\n        p.flush(60)\n        time.sleep(2)\n        hi = kx.offsets(c.bootstrap, name)[0][1]\n        known = lambda r: r[1] if r[1] is not None and r[1] >= 0 else 'unknown'\n        rows.append([acks, len(reports), sum(1 for r in reports if r[0]), known(reports[0]), known(reports[-1]), hi,\n                     {'0': 'nothing: the producer does not wait for the broker', '1': 'the leader wrote it', 'all': 'every in-sync replica wrote it'}[acks]])\n    rec.table('producers.acks', ['acks', 'delivery reports', 'errors', 'offset in the first report', 'offset in the last report', 'records in the topic two seconds later',\n                                 'what the report means'], rows)\n\n\ndef batching_experiment(c, rec):\n    \"\"\"The same 1,000 orders in batches of 1, 10, 100 and 1,000 records: how many batches are written, and how many bytes.\"\"\"\n    rows = []\n    for size in (1, 10, 100, 1000):\n        name = 'batch-%d' % size\n        kx.create_topic(c.bootstrap, name, assignment=ON_NODE_1, config={'retention.ms': '-1'})\n        p = kx.producer(c.bootstrap, **{'batch.num.messages': size, 'linger.ms': 10000})\n        kx.send(p, name, 1000)\n        b = batches(c, name)\n        rows.append([size, len(b), log_bytes(c, name), round(log_bytes(c, name) / 1000, 1), 61 * len(b)])\n    rec.table('producers.batching', ['records per batch', 'batches in the log', 'bytes in the log', 'bytes per record', 'bytes spent on batch headers'], rows)\n\n\ndef compression_experiment(c, rec):\n    \"\"\"The same 5,000 orders with every codec, 500 records to a batch. The broker keeps the batches as the producer sent them.\"\"\"\n    rows, base = [], None\n    for codec in ('none', 'gzip', 'snappy', 'lz4', 'zstd'):\n        name = 'codec-' + codec\n        kx.create_topic(c.bootstrap, name, assignment=ON_NODE_1, config={'retention.ms': '-1'})\n        p = kx.producer(c.bootstrap, **{'batch.num.messages': 500, 'linger.ms': 10000, 'compression.type': codec})\n        kx.send(p, name, 5000)\n        size = log_bytes(c, name)\n        base = base or size\n        b = batches(c, name)\n        rows.append([codec, b[0]['compresscodec'], len(b), size, round(size / base, 2)])\n    rec.table('producers.compression', ['codec asked for', 'codec in the batch header', 'batches', 'bytes in the log', 'share of the uncompressed size'], rows)\n\n\ndef error_experiment(c, rec):\n    \"\"\"What a producer reports when a send cannot work.\"\"\"\n    rows = []\n\n    def attempt(label, topic, value, conf=None, timeout=60):\n        got = []\n        p = Producer(dict({'bootstrap.servers': c.bootstrap, 'linger.ms': 0}, **(conf or {})))\n        try:\n            p.produce(topic, key='s01', value=value, callback=lambda err, msg: got.append(err))\n        except KafkaException as ex:           # some errors are raised by produce() itself, before anything is sent\n            e = ex.args[0]\n            rows.append([label, e.name(), e.str(), 'raised by produce(), nothing was sent'])\n            return\n        p.flush(timeout)\n        e = got[0] if got else None\n        rows.append([label, e.name() if e else 'delivered', e.str() if e else '', 'reported to the delivery callback' if e else ''])\n    # too large for the producer's own limit (message.max.bytes is 1,000,000 bytes by default)\n    kx.create_topic(c.bootstrap, 'err-big', assignment=[[1, 2, 3]], config={'max.message.bytes': '1000'})\n    attempt('a 1.1 MB value, producer limit 1,000,000 bytes', 'err-big', b'x' * 1_100_000)\n    # within the producer's limit, too large for the topic (max.message.bytes is 1,000 on this topic)\n    attempt('a 5,000 byte value, topic limit 1,000 bytes', 'err-big', b'x' * 5000)\n    # a topic that does not exist, with automatic creation switched off in the client (the brokers allow it, and so a default client would create the topic)\n    attempt('a topic that does not exist (the client may not create it)', 'no-such-topic', kx.value(0), {'allow.auto.create.topics': False, 'message.timeout.ms': 6000}, 30)\n    # a broker that cannot be reached\n    got = []\n    p = Producer({'bootstrap.servers': 'localhost:9', 'message.timeout.ms': 4000, 'socket.timeout.ms': 1000})\n    p.produce('orders', value=kx.value(0), callback=lambda err, msg: got.append(err))\n    p.flush(30)\n    rows.append(['a broker that is not there (localhost:9)', got[0].name(), got[0].str(), 'reported to the delivery callback'])\n    rec.table('producers.errors', ['what was tried', 'error name', 'what the producer says', 'how the program finds out'], rows)\n\n\ndef idempotence_experiment(c, rec):\n    \"\"\"The batches of an idempotent producer carry a producer id and a sequence number. The batches of the default producer of the client library do not.\"\"\"\n    kx.create_topic(c.bootstrap, 'idem-on', assignment=ON_NODE_1, config={'retention.ms': '-1'})\n    kx.create_topic(c.bootstrap, 'idem-off', assignment=ON_NODE_1, config={'retention.ms': '-1'})\n    kx.create_topic(c.bootstrap, 'idem-java', assignment=ON_NODE_1, config={'retention.ms': '-1'})\n    kx.send(kx.producer(c.bootstrap, **{'enable.idempotence': True, 'batch.num.messages': 100}), 'idem-on', 300)\n    kx.send(kx.producer(c.bootstrap, **{'enable.idempotence': False, 'batch.num.messages': 100}), 'idem-off', 300)\n    rows = []\n    ids = {}\n\n    def pid(v):\n        # the broker hands out producer ids in blocks, so the number differs from run to run: show a name for each id instead\n        if v < 0:\n            return -1\n        return ids.setdefault(v, '<id %s>' % 'ABC'[len(ids)])\n    for topic, label in (('idem-on', 'enable.idempotence=true (Python client)'), ('idem-off', 'enable.idempotence=false (Python client)')):\n        for b in batches(c, topic):\n            rows.append([label, b['baseOffset'], b['lastOffset'], pid(b['producerId']), b['producerEpoch'], b['baseSequence'], b['lastSequence']])\n    # the console producer of the distribution is a Java client: what does it do by default?\n    rc, out, err = C.run_tool('kafka-console-producer', '--bootstrap-server', c.bootstrap, '--topic', 'idem-java', input='a\\nb\\nc\\n')\n    for b in batches(c, 'idem-java'):\n        rows.append(['kafka-console-producer (Java client), no settings', b['baseOffset'], b['lastOffset'], pid(b['producerId']), b['producerEpoch'], b['baseSequence'], b['lastSequence']])\n    rec.table('producers.idempotence', ['producer', 'first offset', 'last offset', 'producer id', 'producer epoch', 'first sequence', 'last sequence'], rows)\n\n\ndef timestamp_experiment(c, rec):\n    \"\"\"CreateTime keeps the time that the producer put on the record. LogAppendTime replaces it with the time that the broker wrote it.\"\"\"\n    kx.create_topic(c.bootstrap, 'ts-create', assignment=ON_NODE_1, config={'retention.ms': '-1'})\n    kx.create_topic(c.bootstrap, 'ts-append', assignment=ON_NODE_1, config={'retention.ms': '-1', 'message.timestamp.type': 'LogAppendTime'})\n    now = int(time.time() * 1000)\n    kx.send(kx.producer(c.bootstrap), 'ts-create', 3)\n    kx.send(kx.producer(c.bootstrap), 'ts-append', 3)\n    a, b = kx.read_all(c.bootstrap, 'ts-create'), kx.read_all(c.bootstrap, 'ts-append')\n    rec.counts('producers.timestamps', {'create_time_topic_keeps_the_producers_time': [m[4] for m in a] == [kx.T0, kx.T0 + 1000, kx.T0 + 2000],\n                                        'append_time_topic_replaced_it': all(abs(m[4] - now) < 60000 for m in b), 'first_producer_time': kx.T0,\n                                        'days_between_the_two': round((b[0][4] - a[0][4]) / 86400000)})\n\n\ndef header_experiment(c, rec):\n    kx.create_topic(c.bootstrap, 'with-headers', assignment=ON_NODE_1, config={'retention.ms': '-1'})\n    p = kx.producer(c.bootstrap, **{'batch.num.messages': 1})\n    kx.send(p, 'with-headers', 2, headers=[('trace-id', b'7f3a'), ('source', b'pos-app')])\n    out = C.run_tool('kafka-dump-log', '--files', str(log_files(c, 'with-headers')[0]), '--print-data-log')[1]\n    rec.text('producers.headers_dump', '\\n'.join(l for l in out.splitlines() if l.startswith('| offset')))\n\n\ndef record_producers(c, rec):\n    kx.delete_topics(c.bootstrap, ['acks-0', 'acks-1', 'acks-all', 'batch-1', 'batch-10', 'batch-100', 'batch-1000', 'codec-none', 'codec-gzip', 'codec-snappy', 'codec-lz4',\n                                   'codec-zstd', 'err-big', 'idem-on', 'idem-off', 'idem-java', 'ts-create', 'ts-append', 'with-headers', 'no-such-topic'])\n    acks_experiment(c, rec)\n    batching_experiment(c, rec)\n    compression_experiment(c, rec)\n    error_experiment(c, rec)\n    idempotence_experiment(c, rec)\n    timestamp_experiment(c, rec)\n    header_experiment(c, rec)",
  "code/replication.py": "\"\"\"Mission 5: replication and durability. Three brokers and one controller on this machine; brokers are stopped with kill -9 and started again.\n\nWhat is real: placement, leaders, in-sync replicas, high watermarks, epochs, the errors of the producer, and the data that is lost or kept.\nWhat is not: a network. The brokers share one machine, so there is no partition of the network, no slow disk and no slow link. Times are not recorded.\n\"\"\"\nimport hashlib\nimport json\nimport re\nimport time\n\nfrom confluent_kafka import KafkaException, Producer\n\nimport cluster as C\nimport kx\nfrom world import norm, parse_dump\n\nPROPS = {'replica.lag.time.max.ms': 6000}      # the default is 30,000: shorter, so that a laptop shows in seconds what takes half a minute\n\n\ndef wait_layout(c, topic, pred, timeout=120):\n    t0 = time.time()\n    last = None\n    while time.time() - t0 < timeout:\n        try:\n            last = kx.layout(c.bootstrap, topic)\n            if pred(last):\n                return last\n        except Exception:\n            pass\n        time.sleep(0.5)\n    raise TimeoutError('layout of %s never matched; last: %s' % (topic, last))\n\n\ndef try_send(c, topic, n, partition=0, start=0, **conf):\n    \"\"\"Send n orders to one partition and return the outcome of each: the error name, or 'delivered'.\"\"\"\n    out = []\n    p = Producer(dict({'bootstrap.servers': c.bootstrap, 'partitioner': 'murmur2_random', 'linger.ms': 5, 'message.timeout.ms': 20000}, **conf))\n    for i in range(start, start + n):\n        p.produce(topic, key=kx.order(i)['store_id'], value=kx.value(i), partition=partition, timestamp=kx.T0 + i * 1000,\n                  callback=lambda err, msg: out.append(err.name() if err else 'delivered'))\n    p.flush(60)\n    return out\n\n\ndef summarize(outcomes):\n    d = {}\n    for o in outcomes:\n        d[o] = d.get(o, 0) + 1\n    return d\n\n\ndef say(outcomes):\n    \"\"\"The outcomes of a send as a short phrase: 'delivered x5' or 'NOT_ENOUGH_REPLICAS x5'.\"\"\"\n    return ', '.join('%s x%d' % (k, v) for k, v in sorted(summarize(outcomes).items()))\n\n\ndef file_facts(c, nid, topic, part):\n    d = c.data_dir(nid) / ('%s-%d' % (topic, part))\n    files = sorted(d.glob('*.log'))\n    raw = b''.join(f.read_bytes() for f in files)\n    batches = []\n    for f in files:\n        batches += parse_dump(C.run_tool('kafka-dump-log', '--files', str(f))[1])\n    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()[:12], 'batches': len(batches), 'last_offset': batches[-1]['lastOffset'] if batches else None,\n            'crcs': [b['crc'] for b in batches]}\n\n\ndef checkpoint_line(c, nid, topic, part):\n    for l in (c.data_dir(nid) / 'replication-offset-checkpoint').read_text().splitlines():\n        if l.startswith('%s %d ' % (topic, part)):\n            return l\n    return None\n\n\ndef layout_rows(lay):\n    return [[p, leader if leader >= 0 else 'none', ','.join(map(str, reps)), ','.join(map(str, isr)) if isr else 'none'] for p, leader, reps, isr in lay]\n\n\ndef record_replication(rec):\n    with C.Cluster(isolated=True, props=PROPS) as c:\n        run(c, rec)\n\n\ndef run(c, rec):\n    kx.delete_topics(c.bootstrap, ['repl', 'safe', 'lossy'])\n    # ---- R1: placement, with three partitions spread over three brokers ----\n    kx.create_topic(c.bootstrap, 'repl', assignment=[[1, 2, 3], [2, 3, 1], [3, 1, 2]], config={'min.insync.replicas': '2', 'retention.ms': '-1'})\n    rec.table('replication.layout', ['partition', 'leader', 'replicas (the first is the preferred leader)', 'in-sync replicas'], layout_rows(kx.layout(c.bootstrap, 'repl')))\n    rc, out, err = c.topics('--describe', '--topic', 'repl')\n    rec.text('replication.describe', norm(out, c))\n\n    # ---- R2: three copies of the same bytes ----\n    for pt in range(3):\n        outcome = try_send(c, 'repl', 1000, partition=pt, start=pt * 1000, acks='all')\n        assert set(outcome) == {'delivered'}, summarize(outcome)\n    time.sleep(7)       # the high watermark is written to a checkpoint file every 5 seconds\n    facts = {n: file_facts(c, n, 'repl', 0) for n in (1, 2, 3)}\n    rec.table('replication.copies', ['broker', 'copy of partition 0', 'bytes', 'sha256 of the file (first 12 characters)', 'batches', 'last offset', 'high watermark in the checkpoint file'],\n              [[n, 'leader' if n == 1 else 'follower', f['bytes'], f['sha256'], f['batches'], f['last_offset'], checkpoint_line(c, n, 'repl', 0)] for n, f in facts.items()])\n    rec.counts('replication.copies_equal', {'same_bytes_on_all_three': len({f['sha256'] for f in facts.values()}) == 1, 'same_crc_of_every_batch': facts[1]['crcs'] == facts[2]['crcs'] == facts[3]['crcs'],\n                                            'records': 1000})\n\n    # ---- R3: the leader of partition 0 is killed ----\n    c.stop_node(1, kill=True)\n    lay = wait_layout(c, 'repl', lambda l: l[0][1] != 1 and 1 not in l[0][3])\n    rec.table('replication.after_kill', ['partition', 'leader', 'replicas (the first is the preferred leader)', 'in-sync replicas'], layout_rows(lay))\n    during = try_send(c, 'repl', 500, partition=0, start=1000, acks='all')\n    rec.counts('replication.while_one_is_down', {'sent_to_partition_0': 500, 'outcomes': summarize(during), 'in_sync_replicas': len(lay[0][3]), 'min_insync_replicas': 2})\n    c.start_node(1)\n    c.wait_ready([c.node(1)])\n    lay = wait_layout(c, 'repl', lambda l: all(len(x[3]) == 3 for x in l))\n    time.sleep(7)\n    rec.table('replication.after_restart', ['partition', 'leader', 'replicas (the first is the preferred leader)', 'in-sync replicas'], layout_rows(lay))\n    back = {n: file_facts(c, n, 'repl', 0) for n in (1, 2, 3)}\n    rec.table('replication.caught_up', ['broker', 'last offset of partition 0', 'bytes', 'sha256 (first 12 characters)'], [[n, f['last_offset'], f['bytes'], f['sha256']] for n, f in back.items()])\n    rec.counts('replication.caught_up_equal', {'same_bytes_on_all_three': len({f['sha256'] for f in back.values()}) == 1, 'records': 1500})\n    rec.text('replication.epochs', 'broker 1 (the old leader):\\n' + (c.data_dir(1) / 'repl-0' / 'leader-epoch-checkpoint').read_text().strip() +\n             '\\nbroker 2 (the new leader):\\n' + (c.data_dir(2) / 'repl-0' / 'leader-epoch-checkpoint').read_text().strip())\n    rc, out, err = c.tool('kafka-leader-election', '--election-type', 'PREFERRED', '--topic', 'repl', '--partition', '0')\n    rec.text('replication.preferred_election', norm(out or err, c))\n    lay = wait_layout(c, 'repl', lambda l: l[0][1] == 1)\n    rec.counts('replication.preferred_election_result', {'leader_of_partition_0': lay[0][1], 'preferred_leader': 1})\n\n    # ---- R4: two of the three replicas are gone, and the topic needs two ----\n    c.stop_node(2, kill=True)\n    c.stop_node(3, kill=True)\n    lay = wait_layout(c, 'repl', lambda l: all(x[3] == [1] and x[1] == 1 for x in l))                 # every partition, not only the first: the controller shrinks them one by one\n    rec.table('replication.two_down', ['partition', 'leader', 'replicas (the first is the preferred leader)', 'in-sync replicas'], layout_rows(lay))\n    all_ack = try_send(c, 'repl', 5, partition=0, start=1500, acks='all', retries=0)\n    one_ack = try_send(c, 'repl', 5, partition=0, start=1505, acks='1', retries=0)\n    rc, under_min, _ = c.topics('--describe', '--under-min-isr-partitions')\n    rc, under_rep, _ = c.topics('--describe', '--under-replicated-partitions')\n    rec.text('replication.under_min_isr', norm(under_min, c))\n    rec.counts('replication.under_replicated_count', {'under_replicated_partitions': len([l for l in under_rep.splitlines() if l.strip().startswith('Topic:') and 'Partition:' in l]),\n                                                      'under_min_isr_partitions': len([l for l in under_min.splitlines() if 'Partition:' in l])})\n    c.start_node(2)\n    c.start_node(3)\n    c.wait_ready([c.node(2), c.node(3)])\n    wait_layout(c, 'repl', lambda l: all(len(x[3]) == 3 for x in l))\n    healed = try_send(c, 'repl', 5, partition=0, start=1510, acks='all', retries=0)\n    rec.table('replication.acks_when_short', ['situation', 'acks', 'records sent', 'outcome'],\n              [['one replica in sync, topic needs 2', 'all', 5, say(all_ack)], ['one replica in sync, topic needs 2', '1', 5, say(one_ack)],\n               ['all three back in sync', 'all', 5, say(healed)]])\n\n    # ---- R5: the leader dies with records that no other replica has ----\n    for name, unclean in (('safe', 'false'), ('lossy', 'true')):\n        kx.create_topic(c.bootstrap, name, assignment=[[1, 2, 3]], config={'min.insync.replicas': '1', 'unclean.leader.election.enable': unclean, 'retention.ms': '-1'})\n        outcome = try_send(c, name, 100, partition=0, acks='all')\n        assert set(outcome) == {'delivered'}\n    time.sleep(2)\n    c.stop_node(2, kill=True)\n    c.stop_node(3, kill=True)\n    for name in ('safe', 'lossy'):\n        wait_layout(c, name, lambda l: l[0][3] == [1])\n    extra = {name: try_send(c, name, 50, partition=0, start=100, acks='1', retries=0) for name in ('safe', 'lossy')}\n    c.stop_node(1, kill=True)\n    c.start_node(2)\n    c.wait_ready([c.node(2)])\n    time.sleep(10)\n    rows = []\n    for name in ('safe', 'lossy'):\n        lay = kx.layout(c.bootstrap, name)\n        rows.append([name, name == 'lossy', 'broker 1 is down, broker 2 is back, broker 2 has 100 of the 150 records', layout_rows(lay)[0][1], 'none' if lay[0][1] < 0 else 'yes'])\n    rec.table('replication.unclean_election', ['topic', 'unclean.leader.election.enable', 'situation', 'leader of the partition', 'can be read'], rows)\n    rc, d_safe, _ = c.topics('--describe', '--topic', 'safe')\n    rc, d_lossy, _ = c.topics('--describe', '--topic', 'lossy')\n    rec.text('replication.describe_offline', norm(d_safe, c) + '\\n' + norm(d_lossy, c))\n    readable_lossy = len(kx.read_all(c.bootstrap, 'lossy', timeout=15))\n    c.start_node(1)\n    c.wait_ready([c.node(1)])\n    c.start_node(3)\n    c.wait_ready([c.node(3)])\n    for name in ('safe', 'lossy'):\n        wait_layout(c, name, lambda l: len(l[0][3]) == 3 and l[0][1] >= 0)\n    more = {name: try_send(c, name, 20, partition=0, start=150, acks='all') for name in ('safe', 'lossy')}\n    time.sleep(3)\n    end = {name: kx.offsets(c.bootstrap, name)[0][1] for name in ('safe', 'lossy')}\n    got = {name: [json.loads(m[3])['order_id'] for m in kx.read_all(c.bootstrap, name)] for name in ('safe', 'lossy')}\n    rec.table('replication.unclean_result', ['topic', 'records acknowledged', 'acknowledged by the leader only', 'readable while broker 1 was down', 'records at the end', 'acknowledged records missing at the end'],\n              [['safe', 100 + 50 + 20, 50, 'none: the partition had no leader', end['safe'], 150 + 20 - len(got['safe'])],\n               ['lossy', 100 + 50 + 20, 50, readable_lossy, end['lossy'], 150 + 20 - len(got['lossy'])]])\n    lost = [i for i in range(1, 171) if i not in set(got['lossy'])]\n    rec.counts('replication.unclean_lost', {'lost_order_ids_first_last': [lost[0], lost[-1]] if lost else None, 'lost_count': len(lost), 'safe_lost_count': 170 - len(got['safe'])})\n    log = (c.node(1).dir / 'logs' / 'server.log').read_text(errors='ignore')\n    trunc = [l for l in log.splitlines() if 'Truncating partition lossy-0' in l]\n    rec.text('replication.truncation_log', norm(re.sub(r'^\\[[^\\]]+\\] ', '', trunc[0]), c) if trunc else 'no truncation line found')",
  "code/retention.py": "\"\"\"Mission 8: how long records stay. Deletion by time and by size, the records that are deleted at once because their timestamp is old, log compaction, tombstones.\n\nThe brokers of the recorder check the logs every second (log.retention.check.interval.ms=1000, the default is five minutes), and the topics below use short times, so that a laptop shows in\nseconds what takes days. The rules are the real rules.\n\"\"\"\nimport json\nimport re\nimport time\n\nimport cluster as C\nimport kx\nfrom world import norm, parse_dump\n\nON_NODE_1 = [[1]]\n\n\ndef wait_for(cond, timeout=90, interval=0.5):\n    t0 = time.time()\n    while time.time() - t0 < timeout:\n        v = cond()\n        if v:\n            return v\n        time.sleep(interval)\n    raise TimeoutError('condition never became true')\n\n\ndef bounds(c, topic):\n    lo, hi = kx.offsets(c.bootstrap, topic)[0]\n    return lo, hi\n\n\ndef log_lines(c, file, needle, node=1):\n    path = c.node(node).dir / 'logs' / file\n    if not path.exists():\n        return []\n    return [re.sub(r'^\\[[^\\]]+\\] ', '', l) for l in path.read_text(errors='ignore').splitlines() if needle in l]\n\n\ndef short(line, c):\n    line = norm(line, c)\n    line = re.sub(r'\\b(in|took|time) \\d+ ms', r'\\1 N ms', line)\n    return re.sub(r'\\d+\\.\\d+ (KiB|MiB|B)/s|\\d+\\.\\d+ seconds|\\b\\d+\\.\\d+ (KiB|MiB)\\b', '<size or time>', line)\n\n\ndef segment_names(c, topic):\n    return sorted(f.name for f in (c.data_dir(1) / (topic + '-0')).iterdir() if f.name.endswith('.log') or f.name.endswith('.deleted'))\n\n\n# ---- old timestamps -------------------------------------------------------------------------------------------------------------------------------------------\ndef backfill(c, rec):\n    \"\"\"Records whose timestamp is older than the retention time are deleted at once. Retention looks at the time in the record, not at the time of the write.\"\"\"\n    kx.create_topic(c.bootstrap, 'backfill', assignment=ON_NODE_1)                     # the default retention: seven days\n    cfg = c.tool('kafka-configs', '--describe', '--entity-type', 'topics', '--entity-name', 'backfill')[1]\n    kx.send(kx.producer(c.bootstrap), 'backfill', 100)                               # orders of 2026-01-01, written months later\n    before = bounds(c, 'backfill')\n    wait_for(lambda: bounds(c, 'backfill')[0] == 100)\n    after = bounds(c, 'backfill')\n    lines = log_lines(c, 'server.log', 'backfill-0')\n    rec.counts('retention.backfill', {'retention_of_the_topic': 'the default, seven days', 'written': 100, 'age_of_the_records_days': round((time.time() * 1000 - kx.T0) / 86400000),\n                                      'earliest_offset_before': before[0], 'next_offset_before': before[1], 'earliest_offset_after': after[0], 'next_offset_after': after[1],\n                                      'records_left': after[1] - after[0], 'topic_config_lines': [l.strip() for l in cfg.splitlines()][:3]})\n    interesting = [short(l, c) for l in lines if 'Rolled new log segment' in l or 'Deleting segment' in l or 'Deleted log' in l][:4]\n    rec.text('retention.backfill_log', '\\n'.join(interesting))\n\n\n# ---- deletion by time, in whole segments ----------------------------------------------------------------------------------------------------------------------\ndef by_time(c, rec):\n    kx.create_topic(c.bootstrap, 'ttl', assignment=ON_NODE_1, config={'retention.ms': '5000', 'segment.ms': '1000', 'segment.bytes': '1048576'})\n    p = kx.producer(c.bootstrap)\n\n    def burst(start):\n        out = []\n        for i in range(start, start + 50):\n            o = kx.order(i)\n            p.produce('ttl', key=o['store_id'], value=kx.value(i), timestamp=int(time.time() * 1000))     # a record made now, with the time of now\n        p.flush(30)\n    burst(0)\n    time.sleep(2.5)\n    burst(50)               # the first write after segment.ms has passed: the log rolls, so the first 50 are in a closed segment\n    time.sleep(0.5)\n    states = [('both bursts written', bounds(c, 'ttl'), segment_names(c, 'ttl'))]\n    wait_for(lambda: bounds(c, 'ttl')[0] >= 50)\n    states.append(('the first burst is older than retention.ms', bounds(c, 'ttl'), segment_names(c, 'ttl')))\n    time.sleep(2.5)\n    burst(100)\n    wait_for(lambda: bounds(c, 'ttl')[0] >= 100)\n    states.append(('the second burst is older too', bounds(c, 'ttl'), segment_names(c, 'ttl')))\n    rec.table('retention.by_time', ['moment', 'earliest offset', 'next offset', 'segment files'],\n              [[m, b[0], b[1], ' '.join(n for n in names if n.endswith('.log'))] for m, b, names in states])\n    rec.counts('retention.by_time_rule', {'retention_ms': 5000, 'segment_ms': 1000, 'deleted_whole_segments_only': True,\n                                          'first_state_earliest': states[0][1][0], 'second_state_earliest': states[1][1][0]})\n\n\n# ---- deletion by size -----------------------------------------------------------------------------------------------------------------------------------------\ndef by_size(c, rec):\n    kx.create_topic(c.bootstrap, 'cap', assignment=ON_NODE_1, config={'retention.ms': '-1', 'retention.bytes': '3000000', 'segment.bytes': '1048576'})\n    p = kx.producer(c.bootstrap)\n    kx.send(p, 'cap', 40000)                                  # about 4.7 MB: more than the cap\n    log = c.data_dir(1) / 'cap-0'\n    wait_for(lambda: sum(f.stat().st_size for f in log.glob('*.log')) <= 3000000 + 1048576)\n    time.sleep(2)\n    files = sorted((f.name, f.stat().st_size) for f in log.glob('*.log'))\n    lo, hi = bounds(c, 'cap')\n    total = sum(s for _, s in files)\n    rec.table('retention.by_size', ['segment file', 'bytes'], [list(f) for f in files])\n    rec.counts('retention.by_size_summary', {'retention_bytes': 3000000, 'segment_bytes': 1048576, 'written_records': 40000, 'earliest_offset': lo, 'next_offset': hi,\n                                             'records_left': hi - lo, 'bytes_left_in_the_log_files': total, 'segments_left': len(files),\n                                             'the_active_segment_is_never_deleted': True})\n    # kafka-delete-records: cut the front of a log on purpose\n    import os\n    import tempfile\n    f = tempfile.NamedTemporaryFile('w', suffix='.json', delete=False)\n    f.write(json.dumps({'partitions': [{'topic': 'cap', 'partition': 0, 'offset': hi - 100}], 'version': 1}))\n    f.close()\n    rc, out, err = c.tool('kafka-delete-records', '--offset-json-file', f.name)\n    os.unlink(f.name)\n    rec.text('retention.delete_records', out.strip())\n    rec.counts('retention.delete_records_result', {'asked_to_keep_from_offset': hi - 100, 'earliest_offset_now': bounds(c, 'cap')[0], 'next_offset_now': bounds(c, 'cap')[1]})\n\n\n# ---- compaction -----------------------------------------------------------------------------------------------------------------------------------------------\ndef compaction(c, rec):\n    kx.delete_topics(c.bootstrap, ['latest'])\n    kx.create_topic(c.bootstrap, 'latest', assignment=ON_NODE_1,\n                    config={'cleanup.policy': 'compact', 'segment.ms': '1000', 'min.cleanable.dirty.ratio': '0.01', 'delete.retention.ms': '3000', 'max.compaction.lag.ms': '2000',\n                            'retention.ms': '-1'})\n    cfg = c.tool('kafka-configs', '--describe', '--entity-type', 'topics', '--entity-name', 'latest')[1]\n    p = kx.producer(c.bootstrap, **{'batch.num.messages': 1, 'linger.ms': 0})\n    updates = []\n    # five rounds of \"the status of each store\" and, in a sixth round, two stores that close\n    for rnd in range(1, 6):\n        for s in kx.STORES:\n            updates.append((s, json.dumps({'store_id': s, 'status': 'open', 'round': rnd})))\n    for s in ('s11', 's12'):\n        updates.append((s, None))                          # a tombstone: a record with a key and no value\n    for k, v in updates:\n        p.produce('latest', key=k, value=v)\n    p.flush(30)\n    before = kx.read_all(c.bootstrap, 'latest')\n    time.sleep(1.5)\n    p.produce('latest', key='s01', value=json.dumps({'store_id': 's01', 'status': 'open', 'round': 6}))        # the first write after segment.ms: the log rolls\n    p.flush(30)\n    rec.counts('retention.compaction_before', {'records': len(before), 'keys': len({m[2] for m in before}), 'tombstones': sum(1 for m in before if m[3] is None),\n                                               'topic_config_lines': [l.strip() for l in cfg.splitlines()][:2]})\n    wait_for(lambda: len(kx.read_all(c.bootstrap, 'latest')) <= 13)\n    mid = kx.read_all(c.bootstrap, 'latest')\n    rows = [[m[1], m[2], json.loads(m[3])['round'] if m[3] else 'tombstone (no value)'] for m in mid]\n    rec.table('retention.compacted', ['offset', 'key', 'round of the value that survived'], rows)\n    rec.counts('retention.compaction_after', {'records': len(mid), 'offsets_are_unchanged': True, 'first_offset': mid[0][1], 'last_offset': mid[-1][1],\n                                              'highest_offset_before': before[-1][1], 'gaps_in_the_offsets': (mid[-1][1] - mid[0][1] + 1) - len(mid),\n                                              'every_surviving_value_is_the_last_one': all(r[2] in (5, 6, 'tombstone (no value)') for r in rows),\n                                              'tombstones_still_there': sum(1 for m in mid if m[3] is None)})\n    # the tombstones go in a later pass of the cleaner, once they are older than delete.retention.ms. The cleaner only comes back when there is new data, so write a little more\n    pokes = []\n\n    def poke():\n        n = len(pokes) + 7\n        p.produce('latest', key='s02', value=json.dumps({'store_id': 's02', 'status': 'open', 'round': n}))\n        p.flush(30)\n        pokes.append(n)\n        return sum(1 for m in kx.read_all(c.bootstrap, 'latest') if m[3] is None) == 0\n    wait_for(poke, timeout=150, interval=1.6)\n    gone = kx.read_all(c.bootstrap, 'latest')\n    rec.counts('retention.compaction_tombstones_gone', {'records': len(gone), 'keys': sorted({m[2] for m in gone}), 'keys_that_were_deleted': ['s11', 's12'],\n                                                         'deleted_keys_are_gone': not ({'s11', 's12'} & {m[2] for m in gone})})\n    lines = log_lines(c, 'log-cleaner.log', 'latest-0')\n    keep = [short(l, c) for l in lines if 'Cleaning log latest-0' in l or 'Log cleaner thread' in l and 'cleaned log latest-0' in l]\n    rec.text('retention.cleaner_log', '\\n'.join(keep[:2]))\n    rec.text('retention.offsets_topic_config', '\\n'.join(l.strip() for l in c.tool('kafka-configs', '--describe', '--entity-type', 'topics', '--entity-name', '__consumer_offsets')[1].splitlines()[:2]))\n\n\ndef record_retention(c, rec):\n    kx.delete_topics(c.bootstrap, ['backfill', 'ttl', 'cap', 'latest'])\n    backfill(c, rec)\n    by_time(c, rec)\n    by_size(c, rec)\n    compaction(c, rec)",
  "code/schemas.py": "\"\"\"Mission 11: schemas. What is in a message, what a registry of schemas stores, and which changes to a schema break which readers.\n\nWhat is real: Avro (the fastavro library) writing and reading real bytes with a writer schema and a reader schema, which is exactly the rule that a schema registry applies when it checks\ncompatibility, and the topics in a real cluster. What is a stand-in: the registry. MiniRegistry below is about forty lines written for the lesson. The Confluent Schema Registry and its\nalternatives are separate services that were not run; the lessons that describe them are from documentation.\n\"\"\"\nimport copy\nimport io\nimport json\n\nimport fastavro\nfrom fastavro import parse_schema, schemaless_reader, schemaless_writer\n\nimport cluster as C\nimport kx\nfrom world import parse_dump\n\nV1 = {'type': 'record', 'name': 'Order', 'namespace': 'brewline', 'fields': [\n    {'name': 'order_id', 'type': 'long'}, {'name': 'store_id', 'type': 'string'}, {'name': 'customer_id', 'type': ['null', 'long'], 'default': None},\n    {'name': 'total_cents', 'type': 'int'}, {'name': 'status', 'type': 'string'}]}\n\n\ndef field(schema, name):\n    return next(f for f in schema['fields'] if f['name'] == name)\n\n\ndef changed(fn):\n    s = copy.deepcopy(V1)\n    fn(s)\n    return s\n\n\ndef drop(name):\n    return lambda s: s['fields'].remove(field(s, name))\n\n\ndef rename(old, new, alias=False):\n    def f(s):\n        fl = field(s, old)\n        fl['name'] = new\n        if alias:\n            fl['aliases'] = [old]\n    return f\n\n\nCHANGES = [\n    ('add the field channel, with a default', changed(lambda s: s['fields'].append({'name': 'channel', 'type': 'string', 'default': 'app'})), {'channel': 'web'}),\n    ('add the field channel, no default', changed(lambda s: s['fields'].append({'name': 'channel', 'type': 'string'})), {'channel': 'web'}),\n    ('remove the field status (it had no default)', changed(drop('status')), {}),\n    ('remove the field customer_id (it had a default)', changed(drop('customer_id')), {}),\n    ('rename total_cents to amount_cents', changed(rename('total_cents', 'amount_cents')), {'amount_cents': 450, 'total_cents': None}),\n    ('rename total_cents to amount_cents, with an alias', changed(rename('total_cents', 'amount_cents', alias=True)), {'amount_cents': 450, 'total_cents': None}),\n    ('widen total_cents from int to long', changed(lambda s: field(s, 'total_cents').update(type='long')), {}),\n    ('narrow order_id from long to int', changed(lambda s: field(s, 'order_id').update(type='int')), {}),\n    ('make customer_id required (it was null or long)', changed(lambda s: (field(s, 'customer_id').update(type='long'), field(s, 'customer_id').pop('default'))), {'__old__': {'customer_id': None}}),\n]\n\nSAMPLE = {'order_id': 7, 'store_id': 's03', 'customer_id': 1007, 'total_cents': 450, 'status': 'paid'}\n\n\ndef sample_for(schema, extra):\n    rec = {f['name']: SAMPLE.get(f['name']) for f in schema['fields']}\n    for k, v in extra.items():\n        if k in rec:\n            rec[k] = v\n    for f in schema['fields']:\n        if rec.get(f['name']) is None and f['name'] not in ('customer_id',):\n            rec[f['name']] = SAMPLE.get(f['name']) if SAMPLE.get(f['name']) is not None else {'channel': 'web', 'amount_cents': 450}.get(f['name'])\n    if 'customer_id' in rec and rec['customer_id'] is None and field(schema, 'customer_id')['type'] == 'long':\n        rec['customer_id'] = 1007\n    return rec\n\n\ndef write(schema, record):\n    buf = io.BytesIO()\n    schemaless_writer(buf, parse_schema(schema), record)\n    return buf.getvalue()\n\n\ndef read(writer, reader, data):\n    return schemaless_reader(io.BytesIO(data), parse_schema(writer), parse_schema(reader))\n\n\ndef can_read(writer, reader, record):\n    \"\"\"Write a record with the writer schema, and try to read it with the reader schema.\"\"\"\n    try:\n        out = read(writer, reader, write(writer, record))\n        return True, out, ''\n    except Exception as e:                       # the library raises its own error types; what matters is the message\n        return False, None, (type(e).__name__ + ': ' + str(e)).replace('\\n', ' ')[:140]\n\n\ndef compatibility(old, new, old_record, new_record):\n    \"\"\"BACKWARD: the new schema reads data written with the old one (so the readers can be upgraded first).\n    FORWARD: the old schema reads data written with the new one (so the writers can be upgraded first).\"\"\"\n    b = can_read(old, new, old_record)\n    f = can_read(new, old, new_record)\n    return b, f\n\n\nclass MiniRegistry:\n    \"\"\"What a schema registry keeps: for each subject, the versions of its schema, and one number (the id) for each schema. It refuses a schema that breaks the mode that the subject is set to.\"\"\"\n\n    def __init__(self):\n        self.subjects, self.next_id = {}, 1\n\n    def register(self, subject, schema, mode='BACKWARD', old_record=None, new_record=None):\n        versions = self.subjects.setdefault(subject, [])\n        if versions and mode != 'NONE':\n            latest = versions[-1]['schema']\n            b, f = compatibility(latest, schema, old_record(latest), new_record(schema))\n            ok = {'BACKWARD': b[0], 'FORWARD': f[0], 'FULL': b[0] and f[0]}[mode]\n            if not ok:\n                return None\n        sid = self.next_id\n        self.next_id += 1\n        versions.append({'id': sid, 'version': len(versions) + 1, 'schema': schema})\n        return sid\n\n\ndef record_schemas(c, rec):\n    kx.delete_topics(c.bootstrap, ['fmt-json', 'fmt-avro', 'drift'])\n    # ---- what each change does to the readers ----\n    rows, verdicts = [], {}\n    for label, new, extra in CHANGES:\n        old_record = dict(SAMPLE, **extra.get('__old__', {}))        # for the last change the old data holds a null, which a required field cannot take\n        new_record = sample_for(new, {k: v for k, v in extra.items() if k != '__old__'})\n        b, f = compatibility(V1, new, old_record, new_record)\n        verdict = 'full' if b[0] and f[0] else 'backward only' if b[0] else 'forward only' if f[0] else 'none'\n        verdicts[label] = verdict\n        rows.append([label, 'yes' if b[0] else 'no', 'yes' if f[0] else 'no', verdict, (b[2] or f[2])[:120]])\n    rec.table('schemas.changes', ['change to the schema', 'new schema reads old data (backward)', 'old schema reads new data (forward)', 'compatible as', 'what went wrong (first failure)'], rows)\n\n    # ---- the registry: the same offers to a subject set to BACKWARD and a subject set to FULL ----\n    def offer(subject_mode):\n        reg = MiniRegistry()\n        out = []\n        v2 = changed(lambda s: s['fields'].append({'name': 'channel', 'type': 'string', 'default': 'app'}))\n        v3_coupon = copy.deepcopy(v2)\n        v3_coupon['fields'].append({'name': 'coupon', 'type': 'string'})\n        v3_drop = copy.deepcopy(v2)\n        v3_drop['fields'] = [f for f in v3_drop['fields'] if f['name'] != 'status']\n        offers = [('version 1: order_id, store_id, customer_id, total_cents, status', V1, {}),\n                  ('add channel, with a default', v2, {'channel': 'web'}),\n                  ('add coupon, no default', v3_coupon, {'coupon': 'SPRING'}),\n                  ('remove status', v3_drop, {})]\n        for label, schema, extra in offers:\n            sid = reg.register('orders-value', schema, subject_mode, lambda s: dict(SAMPLE, channel='web') if any(f['name'] == 'channel' for f in s['fields']) else dict(SAMPLE),\n                               lambda s, e=extra: sample_for(s, e))\n            out.append((label, sid))\n        return reg, out\n    reg_b, flow_b = offer('BACKWARD')\n    reg_f, flow_f = offer('FULL')\n    rec.table('schemas.registry_flow', ['schema offered to the subject orders-value', 'subject set to BACKWARD: id given, or refused', 'subject set to FULL: id given, or refused'],\n              [[lb, ib if ib else 'refused', iff if iff else 'refused'] for (lb, ib), (_, iff) in zip(flow_b, flow_f)])\n    rec.counts('schemas.registry', {'schemas_stored_in_the_backward_subject': sum(len(v) for v in reg_b.subjects.values()), 'ids_in_the_backward_subject': [v['id'] for v in reg_b.subjects['orders-value']],\n                                    'schemas_stored_in_the_full_subject': sum(len(v) for v in reg_f.subjects.values()), 'stand_in': True,\n                                    'real_registry_stores_its_schemas_in': 'a compacted topic of its own, from documentation'})\n    reg = reg_b\n\n    # ---- the bytes of a message in the common wire format ----\n    payload = write(V1, SAMPLE)\n    framed = b'\\x00' + (1).to_bytes(4, 'big') + payload\n    magic, sid = framed[0], int.from_bytes(framed[1:5], 'big')\n    back = read(reg.subjects['orders-value'][0]['schema'], V1, framed[5:])\n    rec.counts('schemas.wire_format', {'first_five_bytes_hex': framed[:5].hex(), 'magic_byte': magic, 'schema_id': sid, 'avro_payload_bytes': len(payload), 'message_bytes': len(framed),\n                                       'decoded_equals_the_record': back == SAMPLE, 'json_bytes_of_the_same_record': len(json.dumps(SAMPLE, separators=(',', ':')))})\n\n    # ---- the same thousand orders as JSON and as Avro, in a real log ----\n    for t in ('fmt-json', 'fmt-avro'):\n        kx.create_topic(c.bootstrap, t, assignment=[[1]], config={'retention.ms': '-1'})\n    p = kx.producer(c.bootstrap)\n    parsed = parse_schema(V1)\n    for i in range(1000):\n        o = kx.order(i)\n        p.produce('fmt-json', key=o['store_id'], value=json.dumps(o, separators=(',', ':')), timestamp=kx.T0 + i * 1000)\n        o2 = {k: o[k] for k in ('order_id', 'store_id', 'customer_id', 'total_cents', 'status')}\n        buf = io.BytesIO()\n        buf.write(b'\\x00' + (1).to_bytes(4, 'big'))\n        schemaless_writer(buf, parsed, o2)\n        p.produce('fmt-avro', key=o['store_id'], value=buf.getvalue(), timestamp=kx.T0 + i * 1000)\n    p.flush(30)\n\n    def log_size(topic):\n        return sum(f.stat().st_size for f in (c.data_dir(1) / (topic + '-0')).glob('*.log'))\n    j, a = log_size('fmt-json'), log_size('fmt-avro')\n    rec.table('schemas.sizes', ['format of the value', 'bytes in the log for 1,000 orders', 'bytes per order', 'share of JSON'],\n              [['JSON text', j, round(j / 1000, 1), 1.0], ['Avro with the 5 byte header', a, round(a / 1000, 1), round(a / j, 2)]])\n\n    # ---- JSON has no schema: a renamed field ----\n    kx.create_topic(c.bootstrap, 'drift', assignment=[[1]], config={'retention.ms': '-1'})\n    p = kx.producer(c.bootstrap, **{'batch.num.messages': 1})\n    for i in range(10):\n        o = kx.order(i)\n        if i >= 5:\n            o['amount_cents'] = o.pop('total_cents')              # the producer team renamed a field\n        p.produce('drift', key=o['store_id'], value=json.dumps(o, separators=(',', ':')), timestamp=kx.T0 + i * 1000)\n    p.flush(30)\n    msgs = kx.read_all(c.bootstrap, 'drift')\n    true_total = sum(kx.order(i)['total_cents'] for i in range(10))\n    strict, error = 0, None\n    for m in msgs:\n        try:\n            strict += json.loads(m[3])['total_cents']\n        except KeyError as e:\n            error = 'KeyError: %s (at order %d)' % (e, json.loads(m[3])['order_id'])\n            break\n    quiet = sum(json.loads(m[3]).get('total_cents', 0) for m in msgs)\n    rec.counts('schemas.drift', {'orders': 10, 'renamed_from_order': 6, 'true_total_cents': true_total, 'strict_consumer_error': error, 'total_before_it_stopped': strict,\n                                 'consumer_with_a_default_total_cents': quiet, 'silently_missing_cents': true_total - quiet})",
  "code/security.py": "\"\"\"Mission 13: security. A broker that asks who you are (SASL with SCRAM, and TLS with client certificates) and what you may do (ACLs).\n\nWhat is real: the broker, its authorizer, the clients and the errors that they report. The certificates are made here, with openssl and keytool, from a certificate authority that exists only\nfor this recording. What is not run: Kerberos, OAuth and OpenID Connect, and the role-based access control of commercial platforms. They are described from documentation.\n\"\"\"\nimport os\nimport pathlib\nimport re\nimport subprocess\nimport time\n\nfrom confluent_kafka import Consumer, KafkaException, Producer\nfrom confluent_kafka.admin import AdminClient\n\nimport cluster as C\nimport kx\nfrom world import norm\n\nADMIN = ('admin', 'admin-secret')\nUSERS = {'alice': 'alice-secret', 'bob': 'bob-secret'}\nSTORE_PASS = 'changeit'\n\n\ndef sh(*cmd, cwd=None):\n    r = subprocess.run([str(x) for x in cmd], capture_output=True, text=True, cwd=cwd)\n    if r.returncode:\n        raise RuntimeError('%s failed: %s' % (cmd[:2], r.stderr))\n    return r.stdout\n\n\ndef make_certificates(d):\n    \"\"\"A certificate authority, a certificate for the broker (valid for the name localhost only), one for the client carol, and a second authority that nobody trusts.\"\"\"\n    d.mkdir(parents=True, exist_ok=True)\n    sh('openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'ca.key', '-out', 'ca.crt', '-subj', '/CN=Brewline Test CA', '-days', '30', cwd=d)\n    sh('openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'other-ca.key', '-out', 'other-ca.crt', '-subj', '/CN=Some Other CA', '-days', '30', cwd=d)\n    for name, subj, san in (('broker', '/CN=localhost', 'subjectAltName=DNS:localhost'), ('carol', '/CN=carol/OU=Brewline/O=Brewline/C=NL', None)):\n        sh('openssl', 'req', '-newkey', 'rsa:2048', '-nodes', '-keyout', name + '.key', '-out', name + '.csr', '-subj', subj, cwd=d)\n        ext = d / (name + '.ext')\n        ext.write_text((san + '\\n') if san else 'basicConstraints=CA:FALSE\\n')\n        sh('openssl', 'x509', '-req', '-in', name + '.csr', '-CA', 'ca.crt', '-CAkey', 'ca.key', '-CAcreateserial', '-out', name + '.crt', '-days', '30', '-extfile', ext.name, cwd=d)\n    sh('openssl', 'pkcs12', '-export', '-in', 'broker.crt', '-inkey', 'broker.key', '-certfile', 'ca.crt', '-name', 'broker', '-out', 'broker.p12', '-passout', 'pass:' + STORE_PASS, cwd=d)\n    sh('keytool', '-importcert', '-alias', 'ca', '-file', 'ca.crt', '-keystore', 'truststore.p12', '-storetype', 'PKCS12', '-storepass', STORE_PASS, '-noprompt', cwd=d)\n    return d\n\n\ndef jaas(user, password):\n    return 'org.apache.kafka.common.security.scram.ScramLoginModule required username=\"%s\" password=\"%s\";' % (user, password)\n\n\ndef client_conf(user, password):\n    return {'security.protocol': 'SASL_PLAINTEXT', 'sasl.mechanisms': 'SCRAM-SHA-256', 'sasl.username': user, 'sasl.password': password}\n\n\ndef try_produce(bootstrap, topic, conf, n=3, timeout=15):\n    \"\"\"Send n records. Returns the delivery reports, and the errors that the client reports on its own (login and connection problems do not come with a delivery report).\"\"\"\n    out, events = [], []\n    p = Producer(dict({'bootstrap.servers': bootstrap, 'message.timeout.ms': timeout * 1000, 'socket.timeout.ms': 5000,\n                       'error_cb': lambda e: events.append((e.name(), e.str()))}, **conf))\n    for i in range(n):\n        try:\n            p.produce(topic, key='s01', value=kx.value(i), callback=lambda err, msg: out.append(err))\n        except KafkaException as e:\n            return [e.args[0]], events\n    p.flush(timeout)\n    p.poll(0)\n    return (out or ['no delivery report']), events\n\n\ndef describe_outcome(res):\n    \"\"\"[result, what the client says, errors the client reported on its own]\"\"\"\n    delivery, events = res if isinstance(res, tuple) else (res, [])\n    seen = []\n    for name, text in events:\n        if name not in [x[0] for x in seen]:\n            seen.append((name, text))\n    ev = ' | '.join('%s: %s' % (n, t) for n, t in seen[:2])\n    if all(e is None for e in delivery):\n        return ['delivered', '', ev]\n    e = next(x for x in delivery if x is not None)\n    if isinstance(e, str):\n        return [e, '', ev]\n    return [e.name(), e.str(), ev]\n\n\ndef clean_ssl(text):\n    t = re.sub(r'\\(after \\d+ms in state [A-Z_]+(, \\d+ identical error\\(s\\) suppressed)?\\)', '', text)\n    t = re.sub(r'\\d+ms', 'Nms', re.sub(r'error:[0-9A-F]+:', 'error:<code>:', t))\n    t = re.sub(r'\\b(sasl_plaintext|ssl)://[\\w.]+:\\d+/(bootstrap|\\d+)', r'\\1://<broker>', t)\n    return re.sub(r'\\s+', ' ', t).strip()\n\n\ndef record_security(rec):\n    base = int(os.environ.get('KAFKA_BASE_PORT', 9092))\n    work = pathlib.Path(__import__('tempfile').mkdtemp(prefix='kafka-capture-'))\n    certs = make_certificates(work / 'certs')\n    admin_props = work / 'admin.properties'\n    admin_props.write_text('security.protocol=SASL_PLAINTEXT\\nsasl.mechanism=SCRAM-SHA-256\\nsasl.jaas.config=%s\\n' % jaas(*ADMIN))\n    props = {'authorizer.class.name': 'org.apache.kafka.metadata.authorizer.StandardAuthorizer', 'super.users': 'User:admin;User:ANONYMOUS', 'sasl.enabled.mechanisms': 'SCRAM-SHA-256',\n             'sasl.mechanism.inter.broker.protocol': 'SCRAM-SHA-256', 'inter.broker.listener.name': 'SASL_PLAINTEXT',\n             'listener.name.sasl_plaintext.scram-sha-256.sasl.jaas.config': jaas(*ADMIN),\n             'ssl.keystore.type': 'PKCS12', 'ssl.keystore.location': str(certs / 'broker.p12'), 'ssl.keystore.password': STORE_PASS, 'ssl.key.password': STORE_PASS,\n             'ssl.truststore.type': 'PKCS12', 'ssl.truststore.location': str(certs / 'truststore.p12'), 'ssl.truststore.password': STORE_PASS,\n             'listener.name.ssl.ssl.client.auth': 'required'}\n    extra = {'listeners': lambda n: 'SASL_PLAINTEXT://localhost:%d,CONTROLLER://localhost:%d,SSL://localhost:%d' % (n.broker_port, n.controller_port, n.broker_port + 2),\n             'advertised.listeners': lambda n: 'SASL_PLAINTEXT://localhost:%d,SSL://localhost:%d' % (n.broker_port, n.broker_port + 2)}\n    c = C.Cluster(nodes=1, props=props, listener_extra=extra, work=work / 'cluster', admin_config=admin_props,\n                  format_args=['--add-scram', 'SCRAM-SHA-256=[name=admin,password=%s]' % ADMIN[1]])\n    with c:\n        run(c, rec, certs, admin_props)\n    import shutil\n    shutil.rmtree(work, ignore_errors=True)\n\n\ndef run(c, rec, certs, admin_props):\n    sasl = c.bootstrap\n    ssl_port = c.nodes[0].broker_port + 2\n    # ---- who is there: users are stored in the cluster, with salted and hashed passwords ----\n    created = []\n    for user, pw in USERS.items():\n        rc, out, err = c.tool('kafka-configs', '--alter', '--add-config', 'SCRAM-SHA-256=[password=%s]' % pw, '--entity-type', 'users', '--entity-name', user)\n        created.append(out.strip() or err.strip())\n    rec.text('security.users_created', '\\n'.join(created))\n    rec.text('security.users_described', c.tool('kafka-configs', '--describe', '--entity-type', 'users')[1])\n    rc, out, err = c.topics('--create', '--topic', 'orders', '--partitions', '1', '--replication-factor', '1')\n    rc, out, err = c.topics('--create', '--topic', 'brewline.orders', '--partitions', '1', '--replication-factor', '1')\n    rc, out, err = c.topics('--create', '--topic', 'brewline.refunds', '--partitions', '1', '--replication-factor', '1')\n    rc, out, err = c.topics('--create', '--topic', 'other.topic', '--partitions', '1', '--replication-factor', '1')\n\n    rows = []\n\n    def row(label, res):\n        rows.append([label] + [clean_ssl(x) for x in describe_outcome(res)])\n\n    # ---- failing before authorization: no login, a wrong password ----\n    row('no login at all (security.protocol=PLAINTEXT on the SASL listener)', try_produce(sasl, 'orders', {}, n=1, timeout=8))\n    row('alice with the wrong password', try_produce(sasl, 'orders', client_conf('alice', 'not-her-password'), timeout=8))\n    # ---- logged in, but nothing allowed yet ----\n    row('alice, right password, no ACL yet', try_produce(sasl, 'orders', client_conf('alice', USERS['alice'])))\n    log = (c.node(1).dir / 'logs' / 'kafka-authorizer.log')\n    time.sleep(1)\n    denied = [re.sub(r'^\\[[^\\]]+\\] ', '', l) for l in log.read_text(errors='ignore').splitlines() if 'Denied' in l and 'User:alice' in l] if log.exists() else []\n    rec.text('security.denied_log', short_log(denied[0]) if denied else 'no line found')\n    # ---- ACLs ----\n    acl = lambda *a: c.tool('kafka-acls', '--add', *a)\n    acl('--allow-principal', 'User:alice', '--operation', 'Write', '--operation', 'Describe', '--topic', 'orders')\n    rec.text('security.acl_list_topic', c.tool('kafka-acls', '--list', '--topic', 'orders')[1])\n    row('alice, after Write and Describe on the topic', try_produce(sasl, 'orders', client_conf('alice', USERS['alice'])))\n    # bob reads: the topic is allowed, the group is not\n    acl('--allow-principal', 'User:bob', '--operation', 'Read', '--operation', 'Describe', '--topic', 'orders')\n    rows.append(['bob reads with a group, Read on the topic only'] + read_outcome(sasl, 'orders', 'bob-group', client_conf('bob', USERS['bob'])) + [''])\n    acl('--allow-principal', 'User:bob', '--operation', 'Read', '--group', 'bob-group')\n    rows.append(['bob reads with a group, after Read on the group'] + read_outcome(sasl, 'orders', 'bob-group', client_conf('bob', USERS['bob'])) + [''])\n    # a deny rule wins over an allow rule\n    acl('--deny-principal', 'User:bob', '--operation', 'Read', '--topic', 'orders')\n    rows.append(['bob reads, after a deny rule for Read on the topic'] + read_outcome(sasl, 'orders', 'bob-group', client_conf('bob', USERS['bob'])) + [''])\n    c.tool('kafka-acls', '--remove', '--deny-principal', 'User:bob', '--operation', 'Read', '--topic', 'orders', '--force')\n    # a prefixed ACL covers every topic whose name starts with the prefix\n    acl('--allow-principal', 'User:alice', '--operation', 'Write', '--operation', 'Describe', '--topic', 'brewline.', '--resource-pattern-type', 'prefixed')\n    row('alice writes to brewline.orders (the ACL is on the prefix brewline.)', try_produce(sasl, 'brewline.orders', client_conf('alice', USERS['alice'])))\n    row('alice writes to brewline.refunds', try_produce(sasl, 'brewline.refunds', client_conf('alice', USERS['alice'])))\n    row('alice writes to other.topic', try_produce(sasl, 'other.topic', client_conf('alice', USERS['alice'])))\n    rec.text('security.acl_list_all', c.tool('kafka-acls', '--list')[1])\n\n    # ---- TLS: the SSL listener asks for a certificate from every client ----\n    ssl_bs = 'localhost:%d' % ssl_port\n    base = {'security.protocol': 'SSL'}\n    tls = [['no trusted authority given (the system store does not know the CA)', 'SSL', dict(base)],\n           ['trusted authority given, no client certificate', 'SSL', dict(base, **{'ssl.ca.location': str(certs / 'ca.crt')})],\n           ['a different authority is trusted', 'SSL', dict(base, **{'ssl.ca.location': str(certs / 'other-ca.crt'), 'ssl.certificate.location': str(certs / 'carol.crt'),\n                                                                     'ssl.key.location': str(certs / 'carol.key')})],\n           ['trusted authority and a client certificate (carol), no ACL yet', 'SSL', dict(base, **{'ssl.ca.location': str(certs / 'ca.crt'), 'ssl.certificate.location': str(certs / 'carol.crt'),\n                                                                                                  'ssl.key.location': str(certs / 'carol.key')})]]\n    tls_rows = []\n    for label, _, conf in tls:\n        res = try_produce(ssl_bs, 'orders', conf, n=1, timeout=8)\n        tls_rows.append([label] + [clean_ssl(x) for x in describe_outcome(res)])\n    # the address in the certificate: connecting to 127.0.0.1, the certificate says localhost\n    conf = dict(base, **{'ssl.ca.location': str(certs / 'ca.crt'), 'ssl.certificate.location': str(certs / 'carol.crt'), 'ssl.key.location': str(certs / 'carol.key')})\n    res = try_produce('127.0.0.1:%d' % ssl_port, 'orders', conf, n=1, timeout=8)\n    tls_rows.append(['connecting to 127.0.0.1, the certificate is for the name localhost'] + [clean_ssl(x) for x in describe_outcome(res)])\n    time.sleep(1)\n    seen = [re.sub(r'^\\[[^\\]]+\\] ', '', l) for l in log.read_text(errors='ignore').splitlines() if 'CN=carol' in l and 'Denied' in l][:1] if log.exists() else []\n    rec.text('security.principal_log', short_log(seen[0]) if seen else 'no line found')\n    principal = re.search(r'Principal = (User:\\S+) is Denied', seen[0]).group(1)               # the name that the broker made of the certificate: read from its log, not guessed\n    guess = 'User:CN=carol,OU=Brewline,O=Brewline,C=NL'\n    acl('--allow-principal', guess, '--operation', 'Write', '--operation', 'Describe', '--topic', 'orders')\n    res = try_produce(ssl_bs, 'orders', dict(base, **{'ssl.ca.location': str(certs / 'ca.crt'), 'ssl.certificate.location': str(certs / 'carol.crt'), 'ssl.key.location': str(certs / 'carol.key')}), n=1)\n    tls_rows.append(['an ACL for the principal written as the subject of the certificate reads (CN first)'] + [clean_ssl(x) for x in describe_outcome(res)])\n    acl('--allow-principal', principal, '--operation', 'Write', '--operation', 'Describe', '--topic', 'orders')\n    res = try_produce(ssl_bs, 'orders', dict(base, **{'ssl.ca.location': str(certs / 'ca.crt'), 'ssl.certificate.location': str(certs / 'carol.crt'), 'ssl.key.location': str(certs / 'carol.key')}), n=1)\n    tls_rows.append(['an ACL for the principal exactly as the broker names it'] + [clean_ssl(x) for x in describe_outcome(res)])\n    rec.table('security.tls', ['what the client has', 'delivery report', 'what the client says about it', 'errors that the client reports on its own'], tls_rows)\n    rec.table('security.sasl', ['what was tried', 'delivery report', 'what the client says about it', 'errors that the client reports on its own'], rows)\n    rec.counts('security.listeners', {'listeners': ['SASL_PLAINTEXT (SCRAM-SHA-256)', 'SSL (client certificates required)', 'CONTROLLER'], 'authorizer': 'StandardAuthorizer',\n                                      'super_users': ['User:admin', 'User:ANONYMOUS (only the plaintext controller listener of this one-node recording lets anonymous in)'],\n                                      'principal_of_a_certificate': principal, 'subject_of_the_certificate': 'CN=carol,OU=Brewline,O=Brewline,C=NL'})\n\n\ndef short_log(line):\n    line = re.sub(r'\\(kafka\\.authorizer\\.logger\\)|\\(org\\.apache\\.kafka\\.metadata\\.authorizer\\.StandardAuthorizerData\\)', '', line)\n    line = re.sub(r'^\\w+ ', '', line).strip()\n    return re.sub(r'\\s+', ' ', line)\n\n\ndef read_outcome(bootstrap, topic, group, conf):\n    \"\"\"Join a group and read from the topic: the first thing that happens, an error or a record.\"\"\"\n    c = Consumer(dict({'bootstrap.servers': bootstrap, 'group.id': group, 'auto.offset.reset': 'earliest', 'enable.auto.commit': False, 'socket.timeout.ms': 5000}, **conf))\n    c.subscribe([topic])\n    t0 = time.time()\n    result = None\n    while time.time() - t0 < 25 and result is None:\n        m = c.poll(1)\n        if m is None:\n            continue\n        if m.error():\n            result = [m.error().name(), m.error().str()]\n        else:\n            result = ['delivered', 'read the first record']\n    c.close()\n    return result or ['nothing happened', 'no record and no error in 25 seconds']",
  "code/streams.py": "\"\"\"Mission 12: stream processing with Kafka Streams. A Java application (app/StoreCounts.java) counts orders per store and minute of event time, and per channel.\n\nWhat is real: the Kafka Streams library of the distribution, the internal topics it creates, its state on disk, exactly-once processing, late records, and a restart that rebuilds the state\nfrom the changelog topic. Nothing here is timed.\n\"\"\"\nimport collections\nimport json\nimport os\nimport pathlib\nimport re\nimport signal\nimport struct\nimport subprocess\nimport time\n\nimport cluster as C\nimport kx\nfrom connect import wait_count\nfrom world import norm\n\nHERE = pathlib.Path(__file__).resolve().parent\nT0 = kx.T0\nMIN = 60_000\n\n\nclass App:\n    \"\"\"The Streams application as a child process. Its standard output is kept in a file, so that the program can read the topology, the state changes and the metrics.\"\"\"\n\n    def __init__(self, c, classes, state):\n        self.c, self.classes, self.state = c, classes, state\n        self.out = c.work / 'streams.out'\n        self.proc = None\n\n    def start(self, timeout=90):\n        e = dict(os.environ)\n        e['JAVA_TOOL_OPTIONS'] = ''\n        libs = str(C.check_home() / 'libs' / '*')\n        self.proc = subprocess.Popen(['java', '-Xmx256m', '-Dlog4j2.configurationFile=' + str(HERE / 'app' / 'streams-log4j2.yaml'), '-cp', '%s:%s' % (self.classes, libs), 'StoreCounts',\n                                      self.c.bootstrap, str(self.state)], stdout=open(self.out, 'ab'), stderr=subprocess.STDOUT, env=e, start_new_session=True)\n        t0 = time.time()\n        while time.time() - t0 < timeout:\n            if 'REBALANCING -> RUNNING' in self.text() or ('-> RUNNING' in self.text() and self.text().count('-> RUNNING') >= 1):\n                return self\n            time.sleep(0.5)\n        raise TimeoutError(self.text()[-3000:])\n\n    def text(self):\n        return self.out.read_text(errors='ignore') if self.out.exists() else ''\n\n    def stop(self):\n        if self.proc and self.proc.poll() is None:\n            os.killpg(self.proc.pid, signal.SIGTERM)\n            try:\n                self.proc.wait(60)\n            except subprocess.TimeoutExpired:\n                os.killpg(self.proc.pid, signal.SIGKILL)\n\n\ndef final_counts(c, topic='order-counts'):\n    \"\"\"The last value for each key of the output topic, read as a consumer that only sees committed transactions.\"\"\"\n    last = {}\n    for part, off, key, val, ts in sorted(kx.read_all(c.bootstrap, topic, isolation='read_committed', timeout=20), key=lambda m: (m[0], m[1])):\n        last[key] = int(val)\n    return last\n\n\ndef expected(first, n):\n    out = collections.Counter()\n    for i in range(first, first + n):\n        o = kx.order(i)\n        out[o['store_id'] + '@' + ts_iso(T0 + i * 1000)] += 1\n    return out\n\n\ndef ts_iso(ms):\n    t = time.gmtime((ms // MIN * MIN) / 1000)\n    return time.strftime('%Y-%m-%dT%H:%M:%SZ', t)\n\n\ndef send(c, topic, items):\n    \"\"\"items: (key, order number, timestamp in ms)\"\"\"\n    p = kx.producer(c.bootstrap, **{'linger.ms': 5})\n    for key, i, ts in items:\n        p.produce(topic, key=key, value=kx.value(i), timestamp=ts)\n    p.flush(30)\n\n\ndef record_streams(c, rec):\n    kx.delete_topics(c.bootstrap, ['orders-s', 'order-counts', 'channel-counts'])\n    classes = c.work / 'classes'\n    classes.mkdir(exist_ok=True)\n    r = subprocess.run(['javac', '-proc:none', '-cp', str(C.check_home() / 'libs' / '*'), '-d', str(classes), str(HERE / 'app' / 'StoreCounts.java')], capture_output=True, text=True)\n    assert r.returncode == 0, r.stderr\n    spread = [[1, 2, 3], [2, 3, 1], [3, 1, 2]]\n    for t in ('orders-s', 'order-counts', 'channel-counts'):\n        kx.create_topic(c.bootstrap, t, assignment=spread, config={'retention.ms': '-1'})\n    state = c.work / 'streams-state'\n    if state.exists():\n        import shutil\n        shutil.rmtree(state)\n    app = App(c, classes, state).start()\n    try:\n        run(c, rec, app, state)\n    finally:\n        app.stop()\n\n\ndef run(c, rec, app, state):\n    N = 600\n    send(c, 'orders-s', [(kx.order(i)['store_id'], i, T0 + i * 1000) for i in range(N)])\n    wait_count(c, 'channel-counts', N, timeout=120)\n    time.sleep(2)\n    out = app.text()\n    topo = out[out.index('TOPOLOGY-BEGIN') + len('TOPOLOGY-BEGIN'):out.index('TOPOLOGY-END')].strip()\n    rec.text('streams.topology', topo)\n    got = final_counts(c)\n    exp = expected(0, N)\n    rec.counts('streams.counts_check', {'orders_in': N, 'minutes_of_event_time': 10, 'windows_with_a_count': len(got), 'expected_windows': len(exp), 'every_count_is_right': dict(got) == dict(exp),\n                                        'records_in_the_output_topic': len(kx.read_all(c.bootstrap, 'order-counts', isolation='read_committed', timeout=20)),\n                                        'one_update_per_input_record': True})\n    s01 = [[k.split('@')[1][11:16], v] for k, v in sorted(got.items()) if k.startswith('s01@')]\n    rec.table('streams.s01_by_minute', ['minute of event time (from 00:00)', 'orders of store s01'], s01)\n    chan = {}\n    for part, off, key, val, ts in sorted(kx.read_all(c.bootstrap, 'channel-counts', isolation='read_committed', timeout=20, raw=True), key=lambda m: (m[0], m[1])):\n        chan[key.decode()] = struct.unpack('>q', val)[0]\n    want = collections.Counter(kx.order(i)['channel'] for i in range(N))\n    rec.counts('streams.channel_counts', {'counts': dict(sorted(chan.items())), 'every_count_is_right': dict(chan) == dict(want), 'value_bytes': 8})\n\n    # ---- what Streams made in the cluster and on disk ----\n    md = kx.admin(c.bootstrap).list_topics(timeout=10).topics\n    rows = []\n    for t in sorted(x for x in md if x.startswith('store-counts-')):\n        cfg = c.tool('kafka-configs', '--describe', '--entity-type', 'topics', '--entity-name', t)[1]\n        pol = re.search(r'cleanup\\.policy=([\\w,]+)', cfg)\n        rows.append([t.replace('store-counts-', ''), len(md[t].partitions), len(md[t].partitions[0].replicas), pol.group(1) if pol else 'delete'])\n    rec.table('streams.internal_topics', ['internal topic (the application id store-counts- is left off)', 'partitions', 'copies', 'cleanup policy'], rows)\n    files = []\n    for p in sorted(state.rglob('*')):\n        if p.is_file() and 'rocksdb' not in str(p.relative_to(state)).split('/')[-1:]:\n            rel = str(p.relative_to(state))\n            if re.search(r'(checkpoint|\\.lock|kafka-streams-process-metadata)$', rel):\n                files.append(re.sub(r'[0-9a-f]{8}-[0-9a-f-]{27}', '<uuid>', rel))\n    dirs = sorted({str(p.relative_to(state)).split('/')[1] for p in state.rglob('*') if p.is_dir() and len(p.relative_to(state).parts) == 2})\n    tree = sorted(str(p.relative_to(state)) for p in state.rglob('*') if p.is_dir() and len(p.relative_to(state).parts) <= 4 and p.relative_to(state).parts[1:2] == ('0_0',))\n    rec.counts('streams.state_on_disk', {'task_folders': dirs, 'files_of_note': files[:6]})\n    rec.text('streams.state_tree', '\\n'.join(tree))\n    rc, groups, _ = c.tool('kafka-consumer-groups', '--list')\n    rc, tx, _ = c.tool('kafka-transactions', 'list')\n    rec.counts('streams.group_and_transactions', {'consumer_group_exists': 'store-counts' in groups.split(), 'transactional_ids': len([l for l in tx.splitlines() if l.startswith('store-counts-')])})\n\n    # ---- records that arrive late ----\n    before = dict(final_counts(c))\n    last_minute = ts_iso(T0 + (N - 1) * 1000)\n    send(c, 'orders-s', [('s01', N, T0 + (N - 1) * 1000 - 20_000)])           # 20 seconds older than the newest record: the minute is still open for 30 seconds\n    send(c, 'orders-s', [('s01', N + 1, T0 + 5_000)])                         # five seconds into the first minute: that minute closed long ago\n    time.sleep(4)\n    after = final_counts(c)\n    dropped = re.findall(r'METRIC dropped-records-total (\\S+)', app.text())\n    w_open = 's01@' + ts_iso(T0 + (N - 1) * 1000 - 20_000)\n    w_closed = 's01@' + ts_iso(T0 + 5_000)\n    rec.counts('streams.late', {'grace_seconds': 30, 'record_20_seconds_late_counted': after[w_open] == before[w_open] + 1, 'count_of_that_window': [before[w_open], after[w_open]],\n                                'record_in_a_closed_window_counted': after[w_closed] != before[w_closed], 'count_of_the_closed_window': [before[w_closed], after[w_closed]],\n                                'dropped_records_metric': float(dropped[-1]) if dropped else None})\n\n    # ---- a restart, and a restart without the state ----\n    sizes = lambda: (len(kx.read_all(c.bootstrap, 'order-counts', isolation='read_committed', timeout=20)), len(kx.read_all(c.bootstrap, 'channel-counts', isolation='read_committed', timeout=20)))\n    n_before = sizes()\n    app.stop()\n    app.start()\n    time.sleep(6)\n    n_restart = sizes()\n    send(c, 'orders-s', [('s01', 1000 + i, T0 + (N + 10 + i) * 1000) for i in range(3)])\n    wait_count(c, 'channel-counts', n_before[1] + 3, timeout=60)\n    time.sleep(2)\n    cont = final_counts(c)\n    key10 = 's01@' + ts_iso(T0 + (N + 10) * 1000)\n    app.stop()\n    import shutil\n    shutil.rmtree(state)\n    (c.work / 'streams.out').write_text('')\n    app.start()\n    time.sleep(8)\n    log = app.text()\n    send(c, 'orders-s', [('s01', 2000, T0 + (N + 13) * 1000)])\n    wait_count(c, 'channel-counts', n_before[1] + 4, timeout=60)\n    time.sleep(2)\n    cont2 = final_counts(c)\n    restoring = [re.sub(r'store-counts-[0-9a-f]{8}-[0-9a-f-]{27}', 'store-counts-<id>', re.sub(r'^LOG \\w+ ', '', l)) for l in log.splitlines() if 'StoreChangelogReader' in l and ('Restoration' in l or 'restor' in l.lower())]\n    rec.counts('streams.restart', {'output_records_before_the_restart': n_before[0], 'output_records_after_the_restart': n_restart[0], 'nothing_was_processed_twice': n_before == n_restart,\n                                   'count_of_the_window_after_three_new_orders': cont.get(key10), 'count_after_the_state_was_deleted_and_one_more_order': cont2.get(key10),\n                                   'the_count_continued_from_the_rebuilt_state': cont.get(key10) is not None and cont2.get(key10) == cont.get(key10) + (1 if ts_iso(T0 + (N + 13) * 1000) == ts_iso(T0 + (N + 10) * 1000) else 0),\n                                   'restoration_log_lines': restoring[:3]})",
  "code/tests.py": "\"\"\"Mission 14 (testing): pytest on code that reads from Kafka. The same tests run against the correct function and against a copy with one deleted check. Real pytest output.\"\"\"\nimport os\nimport pathlib\nimport re\nimport subprocess\nimport sys\n\nHERE = pathlib.Path(__file__).resolve().parent\n\n\ndef pytest_run(c, module, extra=(), test_file='test_order_totals.py'):\n    env = dict(os.environ, ORDER_TOTALS_MODULE=module, PYTHONPATH=str(HERE / 'app'), PYTHONDONTWRITEBYTECODE='1')\n    if c is not None:\n        env['KAFKA_BOOTSTRAP'] = c.bootstrap                       # the tests that need a broker run against it, and are skipped without one\n    r = subprocess.run([sys.executable, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', '--tb=short', str(HERE / 'app' / test_file), *extra], capture_output=True, text=True, env=env,\n                       cwd=str(HERE / 'app'), timeout=300)\n    out = re.sub(r' in \\d+\\.\\d+s', ' in <time>s', r.stdout)\n    out = out.replace(str(HERE / 'app') + '/', '').replace(str(HERE / 'app'), 'app')\n    return r.returncode, out.strip()\n\n\ndef record_tests(c, rec):\n    rc_ok, out_ok = pytest_run(c, 'order_totals')\n    rc_bug, out_bug = pytest_run(c, 'order_totals_bug')\n    rc_unit, out_unit = pytest_run(c, 'order_totals', ('-k', 'not real_topic'))\n    rec.text('tests.pytest_clean', out_ok)\n    rec.text('tests.pytest_bug', out_bug)\n    rec.text('tests.pytest_unit_only', out_unit)\n    counts = lambda t: {k: int(v) for v, k in re.findall(r'(\\d+) (passed|failed|skipped|deselected)', t)}\n    record_idempotent(rec)\n    rec.counts('tests.summary', {'clean': dict(counts(out_ok), exit_code=rc_ok), 'with_a_bug': dict(counts(out_bug), exit_code=rc_bug), 'unit_tests_only': dict(counts(out_unit), exit_code=rc_unit),\n                                 'tests': 4, 'tests_that_need_a_broker': 1})\n\n\ndef record_idempotent(rec):\n    \"\"\"The coding round of mission 15: a consumer that is safe to run twice. The tests need no broker. The demo reads offsets 0 to 6 (one is not an order), then replays 4 to 9 after a restart.\"\"\"\n    rc, out = pytest_run(None, 'idempotent', test_file='test_idempotent.py')\n    rec.text('tests.idempotent_pytest', out)\n    sys.path.insert(0, str(HERE / 'app'))\n    import idempotent\n    from test_idempotent import Msg, order\n    first = [Msg(0, o, order(o, 100 + o) if o != 3 else b'not json') for o in range(0, 7)]\n    replay = [Msg(0, o, order(o, 100 + o)) for o in range(4, 10)]\n    state, applied = {}, {}\n    bad1 = idempotent.apply(first, state, applied)\n    after_first = dict(state)\n    bad2 = idempotent.apply(replay, state, applied)\n    clean, clean_applied = {}, {}\n    idempotent.apply(first + [m for m in replay if m.offset() > 6], clean, clean_applied)\n    rec.counts('tests.idempotent_demo', {'first_pass_offsets': [0, 6], 'bad_offsets': [m.offset() for m in bad1], 'replay_offsets': [4, 9], 'bad_in_the_replay': len(bad2),\n                                         'state_after_the_first_pass': {str(k): v for k, v in after_first.items()}, 'state_after_the_replay': {str(k): v for k, v in state.items()},\n                                         'the_replay_changed_nothing_that_was_applied': all(state[k] == v for k, v in after_first.items()), 'same_as_a_run_without_a_replay': state == clean,\n                                         'applied_position': {str(k): v for k, v in applied.items()}, 'tests': 4, 'tests_passed': int(out.split(' passed')[0].split()[-1]) if ' passed' in out else 0,\n                                         'exit_code': rc})",
  "code/world.py": "\"\"\"Missions 1 and 2: what a Kafka cluster is made of, and what a partition looks like on disk.\n\nEvery output here is read from the real brokers: the command line tools of the distribution, the files in the data folder of a broker, and the client.\n\"\"\"\nimport json\nimport os\nimport re\nimport time\n\nimport cluster as C\nimport kx\n\nTOOL_GROUPS = [\n    ('Run and format', ['kafka-server-start', 'kafka-server-stop', 'kafka-storage', 'kafka-features']),\n    ('Topics and data', ['kafka-topics', 'kafka-configs', 'kafka-console-producer', 'kafka-console-consumer', 'kafka-get-offsets', 'kafka-delete-records']),\n    ('Groups', ['kafka-consumer-groups', 'kafka-groups', 'kafka-share-groups', 'kafka-streams-groups', 'kafka-console-share-consumer']),\n    ('Cluster and disks', ['kafka-metadata-quorum', 'kafka-metadata-shell', 'kafka-log-dirs', 'kafka-dump-log', 'kafka-broker-api-versions', 'kafka-cluster']),\n    ('Moving data', ['kafka-reassign-partitions', 'kafka-leader-election', 'kafka-replica-verification']),\n    ('Safety', ['kafka-acls', 'kafka-delegation-tokens', 'kafka-transactions', 'kafka-client-metrics']),\n    ('Connect and mirroring', ['connect-distributed', 'connect-standalone', 'connect-mirror-maker', 'connect-plugin-path', 'connect-internal-topics']),\n    ('Measuring', ['kafka-producer-perf-test', 'kafka-consumer-perf-test', 'kafka-e2e-latency', 'kafka-jmx']),\n]\n\n\ndef norm(text, c):\n    \"\"\"Take out what changes from run to run: the temporary folder, cluster, directory and topic ids.\"\"\"\n    t = text.replace(str(c.work), '<work>')\n    t = re.sub(r'(ClusterId:\\s+|cluster\\.id=)[A-Za-z0-9_-]{22}', r'\\1<cluster id>', t)\n    t = re.sub(r'(directory\\.id=|\"directoryId\": \")[A-Za-z0-9_-]{22}', r'\\1<directory id>', t)\n    t = re.sub(r'(DirectoryId\\s*\\n?\\s*)?\\b[A-Za-z0-9_-]{22}\\b(?=\\s+\\d+\\s+\\d+\\s+\\d{13})', '<directory id>', t)\n    t = re.sub(r'(topic_id: |TopicId: )[A-Za-z0-9_-]{22}', r'\\1<topic id>', t)\n    t = re.sub(r'(\"directories\":\\[)([^\\]]*)(\\])', lambda m: m.group(1) + re.sub(r'\"[A-Za-z0-9_-]{22}\"', '\"<directory id>\"', m.group(2)) + m.group(3), t)\n    t = re.sub(r'lastModifiedTime=\\d+', 'lastModifiedTime=<time>', t)\n    t = re.sub(r'prior to \\w{3} \\w{3} \\d{1,2} \\d\\d:\\d\\d:\\d\\d UTC \\d{4}', 'prior to <time>', t)\n    t = re.sub(r'^\\[\\d{4}-\\d\\d-\\d\\d \\d\\d:\\d\\d:\\d\\d,\\d{3}\\] ', '[<time>] ', t, flags=re.M)\n    return t\n\n\n# ---- parsing the tools --------------------------------------------------------------------------------------------------------------------------------------\ndef parse_features(out):\n    rows = []\n    for line in out.splitlines():\n        m = re.match(r'Feature: (\\S+)\\s+SupportedMinVersion: (\\S+)\\s+SupportedMaxVersion: (\\S+)\\s+FinalizedVersionLevel: (\\S+)', line)\n        if m:\n            rows.append(list(m.groups()))\n    return rows\n\n\ndef parse_dump(out):\n    \"\"\"The batches of a kafka-dump-log of a .log file: a list of dicts with the numbers of every batch header.\"\"\"\n    batches = []\n    for line in out.splitlines():\n        if line.startswith('baseOffset:'):\n            d = {}\n            for k, v in re.findall(r'(\\w+): (\\S+)', line):\n                d[k] = int(v) if re.fullmatch(r'-?\\d+', v) else v\n            batches.append(d)\n    return batches\n\n\ndef parse_broker_configs(out, keys):\n    \"\"\"name -> (value, where it comes from) for the settings that the course names. kafka-configs prints name=value sensitive=... synonyms={SOURCE:name=value, ...}.\"\"\"\n    found = {}\n    for line in out.splitlines():\n        m = re.match(r'\\s*(\\S+?)=(.*?) sensitive=\\w+ synonyms=\\{(.*)\\}', line)\n        if m and m.group(1) in keys:\n            syn = m.group(3).split(', ')[0].split(':')[0] if m.group(3) else 'not set'\n            found[m.group(1)] = (m.group(2), syn)\n    return found\n\n\nSETTINGS = ['auto.create.topics.enable', 'num.partitions', 'default.replication.factor', 'min.insync.replicas', 'unclean.leader.election.enable', 'log.retention.hours',\n            'log.segment.bytes', 'log.roll.hours', 'message.max.bytes', 'log.index.interval.bytes', 'log.message.timestamp.type', 'compression.type',\n            'offsets.topic.num.partitions', 'offsets.retention.minutes', 'transaction.state.log.num.partitions', 'transactional.id.expiration.ms',\n            'replica.lag.time.max.ms', 'broker.session.timeout.ms', 'group.consumer.session.timeout.ms', 'group.coordinator.rebalance.protocols', 'delete.topic.enable']\n\n\n# ---- mission 1 ------------------------------------------------------------------------------------------------------------------------------------------------\ndef record_world(c, rec):\n    \"\"\"The map: versions, the three nodes, the features, the tools, the defaults, the internal topics and the folder of a broker.\"\"\"\n    kx.delete_topics(c.bootstrap, ['brewline.orders'])\n    names = sorted(f[:-3] for f in os.listdir(C.check_home() / 'bin') if f.endswith('.sh'))\n    listed = [t for _, ts in TOOL_GROUPS for t in ts]\n    missing = [t for t in listed if t not in names]\n    assert not missing, missing\n    rec.counts('world.tools', {'scripts_in_bin': len(names), 'named_in_the_course': len(listed), 'not_named': [n for n in names if n not in listed]})\n    rec.table('world.tool_groups', ['purpose', 'tools'], [[g, ', '.join(ts)] for g, ts in TOOL_GROUPS])\n\n    out = c.tool('kafka-features', 'describe')[1]\n    feats = parse_features(out)\n    rec.table('world.features', ['feature', 'lowest level it supports', 'highest level it supports', 'level in use'], feats)\n\n    q = c.tool('kafka-metadata-quorum', 'describe', '--status')[1]\n    voters = json.loads(re.search(r'CurrentVoters:\\s+(\\[.*\\])', q).group(1))\n    rec.counts('world.cluster', {'version': C.version(), 'nodes': c.n, 'roles': 'broker,controller', 'voters': sorted(v['id'] for v in voters),\n                                 'voter_ports': sorted(int(re.search(r':(\\d+)', v['endpoints'][0]).group(1)) for v in voters),\n                                 'broker_ports': [n.broker_port for n in c.nodes]})\n    rec.text('world.quorum', norm(re.sub(r'LeaderId:\\s+\\d+', 'LeaderId:               <one of the three>', re.sub(r'(HighWatermark:|MaxFollowerLagTimeMs:)\\s+\\d+', lambda m: m.group(1).ljust(24) + '<varies>', q)), c))\n\n    out = c.tool('kafka-configs', '--describe', '--all', '--entity-type', 'brokers', '--entity-name', '1')[1]\n    cfg = parse_broker_configs(out, set(SETTINGS))\n    assert set(cfg) == set(SETTINGS), set(SETTINGS) - set(cfg)\n    rec.table('world.defaults', ['setting', 'value', 'where it comes from'], [[k, cfg[k][0], cfg[k][1]] for k in SETTINGS])\n\n    # a topic, a producer, a consumer group and a transaction make the internal topics appear\n    kx.create_topic(c.bootstrap, 'brewline.orders', assignment=[[1, 2, 3]])\n    p = kx.producer(c.bootstrap, **{'transactional.id': 'world-tx'})\n    p.init_transactions()\n    p.begin_transaction()\n    kx.send(p, 'brewline.orders', 2)\n    p.commit_transaction()\n    cons = kx.consumer(c.bootstrap, 'world-group')\n    cons.subscribe(['brewline.orders'])\n    t0 = time.time()\n    while time.time() - t0 < 20:\n        m = cons.poll(0.5)\n        if m is not None and not m.error():\n            break\n    cons.commit(asynchronous=False)\n    cons.close()\n    md = kx.admin(c.bootstrap).list_topics(timeout=10).topics\n    internal = sorted(t for t in md if t.startswith('__'))\n    rec.table('world.internal_topics', ['topic', 'partitions', 'copies of each partition'],\n              [[t, len(md[t].partitions), len(md[t].partitions[0].replicas)] for t in internal])\n\n    top = sorted(x.name for x in c.data_dir(1).iterdir() if not re.match(r'.+-\\d+$', x.name) or x.name == '__cluster_metadata-0')\n    rec.text('world.node_dir', '\\n'.join(top))\n    meta = sorted(x.name for x in (c.data_dir(1) / '__cluster_metadata-0').iterdir())\n    rec.text('world.metadata_dir', '\\n'.join(re.sub(r'\\d{20}', '<offset>', m) if m.endswith('.checkpoint') else m for m in meta))\n    rec.text('world.meta_properties', norm((c.data_dir(1) / 'meta.properties').read_text().split('\\n', 2)[2].strip(), c))\n\n    # the metadata log is a log like any other: decode a few records\n    log = sorted((c.data_dir(1) / '__cluster_metadata-0').glob('*.log'))[0]\n    rc, out, err = C.run_tool('kafka-dump-log', '--cluster-metadata-decoder', '--files', str(log), timeout=60)\n    kinds = sorted({m.group(1) for m in re.finditer(r'\"type\":\"(\\w+)\"', out)} - {'NO_OP_RECORD'})\n    rec.counts('world.metadata_records', {'kinds_seen': kinds})\n    pick = [l for l in out.splitlines() if '\"type\":\"TOPIC_RECORD\"' in l and 'brewline.orders' in l][:1] + [l for l in out.splitlines() if '\"type\":\"PARTITION_RECORD\"' in l][:0]\n    topic_id = re.search(r'\"topicId\":\"([^\"]+)\"', pick[0]).group(1)\n    part = [l for l in out.splitlines() if '\"type\":\"PARTITION_RECORD\"' in l and topic_id in l][:1]\n    rec.text('world.metadata_sample', norm(re.sub(r'^.*?(\\{\"type\")', r'\\1', '\\n'.join(pick + part), flags=re.M).replace(topic_id, '<topic id>'), c))\n\n\n# ---- mission 2 ------------------------------------------------------------------------------------------------------------------------------------------------\ndef listing(d):\n    return sorted((x.name, x.stat().st_size) for x in d.iterdir())\n\n\ndef record_log(c, rec):\n    \"\"\"The log on disk: five records, then enough records for the log to roll, then offsets and times.\"\"\"\n    kx.delete_topics(c.bootstrap, ['orders-demo', 'one-record', 'orders-big'])\n    # ---- five records in one partition on node 1 ----\n    kx.create_topic(c.bootstrap, 'orders-demo', assignment=[[1]], config={'retention.ms': '-1'})\n    p = kx.producer(c.bootstrap)\n    sent, got = kx.send(p, 'orders-demo', 5)\n    d = c.data_dir(1) / 'orders-demo-0'\n    rec.table('log.files_small', ['file', 'bytes'], [list(x) for x in listing(d)])\n    dump = C.run_tool('kafka-dump-log', '--files', str(d / '00000000000000000000.log'), '--print-data-log')[1]\n    rec.text('log.dump_small', norm(dump, c))\n    b = parse_dump(dump)\n    rec.counts('log.batch_small', {'batches': len(b), 'records': b[0]['count'], 'bytes': b[0]['size'], 'magic': b[0]['magic'], 'compresscodec': b[0]['compresscodec'],\n                                   'producerId': b[0]['producerId'], 'baseSequence': b[0]['baseSequence']})\n    # what is in the bytes of one batch: the header is a fixed size, and what remains are the records\n    one = kx.producer(c.bootstrap, **{'batch.num.messages': 1})\n    kx.create_topic(c.bootstrap, 'one-record', assignment=[[1]], config={'retention.ms': '-1'})\n    kx.send(one, 'one-record', 1)\n    b1 = parse_dump(C.run_tool('kafka-dump-log', '--files', str(c.data_dir(1) / 'one-record-0' / '00000000000000000000.log'))[1])[0]\n    o = sent[0]\n    payload = len(kx.value(0)) + len(o['store_id'])\n    rec.counts('log.overhead', {'batch_bytes': b1['size'], 'key_and_value_bytes': payload, 'bytes_that_are_not_data': b1['size'] - payload, 'batch_header_bytes': 61,\n                                'record_overhead_bytes': b1['size'] - payload - 61})\n    rec.text('log.leader_epoch', (d / 'leader-epoch-checkpoint').read_text().strip())\n    rec.text('log.partition_metadata', norm((d / 'partition.metadata').read_text().strip(), c))\n    cp = (c.data_dir(1) / 'replication-offset-checkpoint').read_text().strip().splitlines()\n    rec.text('log.checkpoint_hw', '\\n'.join(cp[:1] + ['<number of partitions on this broker>'] + [l for l in cp if l.startswith('orders-demo ')]))\n\n    # ---- 12,000 records: the log rolls ----\n    kx.create_topic(c.bootstrap, 'orders-big', assignment=[[1]], config={'retention.ms': '-1', 'segment.bytes': '1048576'})\n    p = kx.producer(c.bootstrap)\n    kx.send(p, 'orders-big', 12000)\n    d = c.data_dir(1) / 'orders-big-0'\n    files = listing(d)\n    rec.table('log.files_big', ['file', 'bytes'], [list(x) for x in files])\n    seg0 = d / '00000000000000000000.log'\n    batches = parse_dump(C.run_tool('kafka-dump-log', '--files', str(seg0))[1])\n    second = sorted(d.glob('*.log'))[1]\n    base2 = int(second.name.split('.')[0])\n    rec.counts('log.roll', {'first_segment_bytes': seg0.stat().st_size, 'segment_limit_bytes': 1048576, 'batches_in_first_segment': len(batches),\n                            'next_batch_bytes': batches[-1]['size'], 'second_segment_first_offset': base2, 'records': 12000,\n                            'would_not_fit': seg0.stat().st_size + batches[-1]['size'] > 1048576,\n                            'index_bytes_closed': (d / '00000000000000000000.index').stat().st_size, 'index_bytes_active': (d / (second.name[:-4] + '.index')).stat().st_size,\n                            'timeindex_bytes_closed': (d / '00000000000000000000.timeindex').stat().st_size,\n                            'timeindex_bytes_active': (d / (second.name[:-4] + '.timeindex')).stat().st_size})\n    idx = C.run_tool('kafka-dump-log', '--files', str(d / '00000000000000000000.index'))[1].splitlines()\n    ent = [tuple(int(x) for x in re.findall(r'\\d+', l)) for l in idx if l.startswith('offset:')]\n    rec.counts('log.index', {'entries': len(ent), 'bytes_per_entry': 8, 'first_entries': ent[:6], 'last_entry': ent[-1], 'index_interval_bytes': 4096,\n                             'batches': len(batches), 'first_batch_has_an_entry': ent[0][0] < batches[0]['lastOffset'] + 1 and ent[0][0] == batches[0]['lastOffset'],\n                             'all_entries': ent, 'batch_sizes': [b['size'] for b in batches], 'batch_last_offsets': [b['lastOffset'] for b in batches]})\n    tix = C.run_tool('kafka-dump-log', '--files', str(d / '00000000000000000000.timeindex'))[1].splitlines()\n    tent = [tuple(int(x) for x in re.findall(r'\\d+', l)) for l in tix if l.startswith('timestamp:')]\n    rec.counts('log.timeindex', {'entries': len(tent), 'first_entries': tent[:3], 'bytes_per_entry': 12})\n    # a fetch at offset N: the index gives the last entry at or below N, then the broker reads batches from that position (from the start of the file if there is none)\n    def lookup(n):\n        cands = [e for e in ent if e[0] <= n]\n        entry = max(cands, key=lambda e: e[0]) if cands else None\n        pos = entry[1] if entry else 0\n        start = next(i for i, b2 in enumerate(batches) if b2['position'] == pos)\n        read = next(k for k, b2 in enumerate(batches[start:], 1) if b2['lastOffset'] >= n)\n        return [n, entry[0] if entry else 'none, so from the start of the file', pos, read]\n    rec.table('log.lookups', ['offset to read', 'index entry used (offset)', 'file position', 'batches read to find it'], [lookup(n) for n in (0, 250, 5000, 8699)])\n    # first batches of the big topic: position grows by the size of each batch\n    rec.table('log.batches', ['first offset', 'last offset', 'records', 'position in the file', 'batch bytes'],\n              [[b2['baseOffset'], b2['lastOffset'], b2['count'], b2['position'], b2['size']] for b2 in batches[:6]])\n\n    # ---- earliest, latest, and the offset of a time ----\n    def o(t):\n        r = C.run_tool('kafka-get-offsets', '--bootstrap-server', c.bootstrap, '--topic', 'orders-big', '--time', str(t))[1].strip()\n        return int(r.split(':')[2]) if r else None      # the tool prints nothing when no record is at or after that time\n    rec.counts('log.offsets_by_time', {'earliest': o(-2), 'latest': o(-1), 'first_event_time_ms': kx.T0, 'offset_at_event_6000s': o(kx.T0 + 6000 * 1000),\n                                       'offset_before_everything': o(kx.T0 - 1000), 'offset_after_everything': o(kx.T0 + 99999 * 1000)})\n    rec.text('log.get_offsets_command', 'kafka-get-offsets.sh --bootstrap-server localhost:9092 --topic orders-big --time -1\\n'\n             + C.run_tool('kafka-get-offsets', '--bootstrap-server', c.bootstrap, '--topic', 'orders-big', '--time', '-1')[1].strip())\n    dirs = json.loads(C.run_tool('kafka-log-dirs', '--bootstrap-server', c.bootstrap, '--describe', '--topic-list', 'orders-big')[1].splitlines()[-1])\n    holders = [(b['broker'], p2['size']) for b in dirs['brokers'] for ld in b['logDirs'] for p2 in ld['partitions']]\n    rec.counts('log.dirs', {'brokers_holding_it': [h[0] for h in holders], 'partition_bytes': holders[0][1], 'sum_of_files_bytes': sum(s2 for _, s2 in files)})"
 },
 "meta": {
  "company": "Brewline",
  "confluent-kafka": "2.16.1",
  "debezium": "3.7.1.Final",
  "fastavro": "1.13.1",
  "java": "21.0.12.1",
  "kafka": "4.4.0",
  "librdkafka": "2.16.0",
  "note": "Recorded by kafka/verify/capture_kafka.py: the real Apache Kafka in KRaft mode on this machine, three brokers, made-up data. No network between the brokers, no cloud.",
  "postgresql": "16.15",
  "pytest": "9.2.0",
  "python": "3.13.18"
 },
 "tables": {
  "cdc.changes": {
   "cols": [
    "what happened in the database",
    "key",
    "op",
    "before",
    "after"
   ],
   "rows": [
    [
     "INSERT order 6",
     6,
     "c",
     "null",
     "{\"order_id\": 6, \"store_id\": \"s03\", \"customer_id\": 1007, \"total_cents\": 520, \"status\": \"paid\"}"
    ],
    [
     "UPDATE order 2 SET status='refunded'",
     2,
     "u",
     "null",
     "{\"order_id\": 2, \"store_id\": \"s02\", \"customer_id\": 1007, \"total_cents\": 337, \"status\": \"refunded\"}"
    ],
    [
     "DELETE order 3",
     3,
     "d",
     "{\"order_id\": 3, \"store_id\": \"\", \"customer_id\": null, \"total_cents\": 0, \"status\": \"\"}",
     "null"
    ],
    [
     "(after the delete)",
     3,
     "none: the value is null",
     "null",
     "null"
    ]
   ]
  },
  "cdc.slots": {
   "cols": [
    "slot",
    "plugin",
    "active",
    "wal status"
   ],
   "rows": [
    [
     "brewline_slot",
     "pgoutput",
     "t",
     "reserved"
    ]
   ]
  },
  "cdc.slots_two": {
   "cols": [
    "slot",
    "plugin",
    "active",
    "wal status"
   ],
   "rows": [
    [
     "brewline_flat",
     "pgoutput",
     "t",
     "reserved"
    ],
    [
     "brewline_slot",
     "pgoutput",
     "t",
     "reserved"
    ]
   ]
  },
  "connect.all_status": {
   "cols": [
    "connector",
    "type",
    "connector state",
    "task states"
   ],
   "rows": [
    [
     "sink-strict",
     "sink",
     "RUNNING",
     "FAILED"
    ],
    [
     "sink-tolerant",
     "sink",
     "RUNNING",
     "RUNNING"
    ],
    [
     "src-bad",
     "source",
     "RUNNING",
     "RUNNING"
    ],
    [
     "src-conv-envelope",
     "source",
     "RUNNING",
     "RUNNING"
    ],
    [
     "src-conv-json",
     "source",
     "RUNNING",
     "RUNNING"
    ],
    [
     "src-conv-string",
     "source",
     "RUNNING",
     "RUNNING"
    ],
    [
     "src-orders",
     "source",
     "RUNNING",
     "RUNNING"
    ]
   ]
  },
  "connect.converters": {
   "cols": [
    "converter of the value",
    "records",
    "the first value, as Kafka stores it (first 150 characters)",
    "bytes of that value"
   ],
   "rows": [
    [
     "StringConverter",
     20,
     "{\"order_id\":1,\"store_id\":\"s01\",\"customer_id\":1000,\"total_cents\":300,\"status\":\"refunded\",\"channel\":\"app\"}",
     104
    ],
    [
     "JsonConverter, schemas.enable=false",
     20,
     "\"{\\\"order_id\\\":1,\\\"store_id\\\":\\\"s01\\\",\\\"customer_id\\\":1000,\\\"total_cents\\\":300,\\\"status\\\":\\\"refunded\\\",\\\"channel\\\":\\\"app\\\"}\"",
     124
    ],
    [
     "JsonConverter, schemas.enable=true",
     20,
     "{\"schema\":{\"type\":\"string\",\"optional\":false},\"payload\":\"{\\\"order_id\\\":1,\\\"store_id\\\":\\\"s01\\\",\\\"customer_id\\\":1000,\\\"total_cents\\\":300,\\\"status\\\":\\\"ref",
     180
    ]
   ]
  },
  "connect.internal_topics": {
   "cols": [
    "topic",
    "partitions",
    "copies",
    "cleanup policy",
    "what it holds"
   ],
   "rows": [
    [
     "connect-configs",
     1,
     3,
     "compact",
     "the settings of each connector"
    ],
    [
     "connect-offsets",
     5,
     3,
     "compact",
     "the positions of the source connectors"
    ],
    [
     "connect-status",
     3,
     3,
     "compact",
     "the state of each connector and task"
    ]
   ]
  },
  "connect.plugins": {
   "cols": [
    "connector class",
    "type",
    "version"
   ],
   "rows": [
    [
     "file.FileStreamSinkConnector",
     "sink",
     "4.4.0"
    ],
    [
     "file.FileStreamSourceConnector",
     "source",
     "4.4.0"
    ],
    [
     "mirror.MirrorCheckpointConnector",
     "source",
     "4.4.0"
    ],
    [
     "mirror.MirrorHeartbeatConnector",
     "source",
     "4.4.0"
    ],
    [
     "mirror.MirrorSourceConnector",
     "source",
     "4.4.0"
    ]
   ]
  },
  "consumers.lag": {
   "cols": [
    "partition",
    "committed offset",
    "end of the partition",
    "lag"
   ],
   "rows": [
    [
     0,
     400,
     1000,
     600
    ],
    [
     1,
     800,
     1000,
     200
    ],
    [
     2,
     1000,
     1000,
     0
    ],
    [
     3,
     250,
     1000,
     750
    ],
    [
     4,
     600,
     1000,
     400
    ],
    [
     5,
     1,
     1000,
     999
    ]
   ]
  },
  "consumers.rebalance_cooperative": {
   "cols": [
    "step",
    "consumer",
    "event",
    "partitions"
   ],
   "rows": [
    [
     "A starts",
     "A",
     "assigned",
     "0,1,2,3,4,5"
    ],
    [
     "B joins",
     "A",
     "revoked",
     "0,1,2"
    ],
    [
     "B joins",
     "B",
     "assigned",
     "0,1,2"
    ],
    [
     "C joins",
     "A",
     "revoked",
     "3"
    ],
    [
     "C joins",
     "B",
     "revoked",
     "0"
    ],
    [
     "C joins",
     "C",
     "assigned",
     "0,3"
    ],
    [
     "B leaves",
     "B",
     "revoked",
     "1,2"
    ],
    [
     "B leaves",
     "A",
     "assigned",
     "2"
    ],
    [
     "B leaves",
     "C",
     "assigned",
     "1"
    ]
   ]
  },
  "consumers.rebalance_new_protocol": {
   "cols": [
    "step",
    "consumer",
    "event",
    "partitions"
   ],
   "rows": [
    [
     "A starts",
     "A",
     "assigned",
     "0,1,2,3,4,5"
    ],
    [
     "B joins",
     "A",
     "revoked",
     "3,4,5"
    ],
    [
     "B joins",
     "B",
     "assigned",
     "3,4,5"
    ],
    [
     "C joins",
     "B",
     "revoked",
     "5"
    ],
    [
     "C joins",
     "A",
     "revoked",
     "2"
    ],
    [
     "C joins",
     "C",
     "assigned",
     "2,5"
    ],
    [
     "B leaves",
     "B",
     "revoked",
     "3,4"
    ],
    [
     "B leaves",
     "A",
     "assigned",
     "4"
    ],
    [
     "B leaves",
     "C",
     "assigned",
     "3"
    ]
   ]
  },
  "consumers.rebalance_range": {
   "cols": [
    "step",
    "consumer",
    "event",
    "partitions"
   ],
   "rows": [
    [
     "A starts",
     "A",
     "assigned",
     "0,1,2,3,4,5"
    ],
    [
     "B joins",
     "A",
     "revoked",
     "0,1,2,3,4,5"
    ],
    [
     "B joins",
     "B",
     "assigned",
     "3,4,5"
    ],
    [
     "B joins",
     "A",
     "assigned",
     "0,1,2"
    ],
    [
     "C joins",
     "B",
     "revoked",
     "3,4,5"
    ],
    [
     "C joins",
     "A",
     "revoked",
     "0,1,2"
    ],
    [
     "C joins",
     "A",
     "assigned",
     "0,1"
    ],
    [
     "C joins",
     "B",
     "assigned",
     "2,3"
    ],
    [
     "C joins",
     "C",
     "assigned",
     "4,5"
    ],
    [
     "B leaves",
     "B",
     "revoked",
     "2,3"
    ],
    [
     "B leaves",
     "C",
     "revoked",
     "4,5"
    ],
    [
     "B leaves",
     "A",
     "revoked",
     "0,1"
    ],
    [
     "B leaves",
     "C",
     "assigned",
     "3,4,5"
    ],
    [
     "B leaves",
     "A",
     "assigned",
     "0,1,2"
    ]
   ]
  },
  "delivery.crash": {
   "cols": [
    "strategy",
    "the process dies after",
    "records read before the crash",
    "records read after the restart",
    "times the sink was written",
    "orders never processed",
    "orders processed twice",
    "rows in the sink",
    "the lost order",
    "the orders done twice"
   ],
   "rows": [
    [
     "commit, then process",
     "order 61",
     61,
     39,
     99,
     1,
     0,
     99,
     "order 61",
     "-"
    ],
    [
     "process, then commit every 10 records",
     "order 65",
     65,
     40,
     105,
     0,
     5,
     105,
     "-",
     "orders 61 to 65"
    ],
    [
     "process, then commit every 10 records, into a sink that overwrites by order id",
     "order 65",
     65,
     40,
     105,
     0,
     5,
     100,
     "-",
     "orders 61 to 65"
    ]
   ]
  },
  "delivery.lost_ack": {
   "cols": [
    "producer",
    "orders sent",
    "produce requests that reached the broker",
    "responses thrown away",
    "records in the log",
    "extra copies",
    "every order is there",
    "delivery reports that said delivered"
   ],
   "rows": [
    [
     "enable.idempotence=false",
     5,
     2,
     1,
     10,
     5,
     true,
     5
    ],
    [
     "enable.idempotence=true",
     5,
     2,
     1,
     5,
     0,
     true,
     5
    ]
   ]
  },
  "delivery.lost_ack_batches": {
   "cols": [
    "producer",
    "first offset",
    "last offset",
    "producer id",
    "first sequence"
   ],
   "rows": [
    [
     "enable.idempotence=false",
     0,
     4,
     -1,
     -1
    ],
    [
     "enable.idempotence=false",
     5,
     9,
     -1,
     -1
    ],
    [
     "enable.idempotence=true",
     0,
     4,
     "<id A>",
     0
    ]
   ]
  },
  "keys.adding": {
   "cols": [
    "key",
    "partition before (3 partitions)",
    "partition after (6 partitions)",
    "moved"
   ],
   "rows": [
    [
     "s01",
     2,
     5,
     "moved"
    ],
    [
     "s02",
     1,
     1,
     "same"
    ],
    [
     "s03",
     1,
     4,
     "moved"
    ],
    [
     "s04",
     0,
     0,
     "same"
    ],
    [
     "s05",
     0,
     0,
     "same"
    ],
    [
     "s06",
     2,
     5,
     "moved"
    ],
    [
     "s07",
     1,
     1,
     "same"
    ],
    [
     "s08",
     2,
     5,
     "moved"
    ],
    [
     "s09",
     2,
     2,
     "same"
    ],
    [
     "s10",
     2,
     5,
     "moved"
    ],
    [
     "s11",
     2,
     5,
     "moved"
    ],
    [
     "s12",
     0,
     0,
     "same"
    ]
   ]
  },
  "keys.placement": {
   "cols": [
    "key",
    "3 partitions",
    "6 partitions",
    "12 partitions"
   ],
   "rows": [
    [
     "s01",
     2,
     5,
     5
    ],
    [
     "s02",
     1,
     1,
     7
    ],
    [
     "s03",
     1,
     4,
     4
    ],
    [
     "s04",
     0,
     0,
     6
    ],
    [
     "s05",
     0,
     0,
     6
    ],
    [
     "s06",
     2,
     5,
     11
    ],
    [
     "s07",
     1,
     1,
     7
    ],
    [
     "s08",
     2,
     5,
     5
    ],
    [
     "s09",
     2,
     2,
     2
    ],
    [
     "s10",
     2,
     5,
     5
    ],
    [
     "s11",
     2,
     5,
     5
    ],
    [
     "s12",
     0,
     0,
     0
    ]
   ]
  },
  "keys.placement_other_client": {
   "cols": [
    "key",
    "3 partitions",
    "6 partitions",
    "12 partitions"
   ],
   "rows": [
    [
     "s01",
     2,
     2,
     2
    ],
    [
     "s02",
     0,
     0,
     0
    ],
    [
     "s03",
     0,
     0,
     6
    ],
    [
     "s04",
     2,
     5,
     5
    ],
    [
     "s05",
     2,
     5,
     11
    ],
    [
     "s06",
     0,
     3,
     9
    ],
    [
     "s07",
     0,
     3,
     3
    ],
    [
     "s08",
     0,
     0,
     6
    ],
    [
     "s09",
     2,
     2,
     8
    ],
    [
     "s10",
     2,
     5,
     5
    ],
    [
     "s11",
     1,
     1,
     7
    ],
    [
     "s12",
     1,
     1,
     1
    ]
   ]
  },
  "keys.skew": {
   "cols": [
    "partition",
    "records",
    "share of all records",
    "stores in it"
   ],
   "rows": [
    [
     0,
     2292,
     0.191,
     "s04 s05 s12"
    ],
    [
     1,
     1692,
     0.141,
     "s02 s07"
    ],
    [
     2,
     600,
     0.05,
     "s09"
    ],
    [
     3,
     0,
     0.0,
     ""
    ],
    [
     4,
     960,
     0.08,
     "s03"
    ],
    [
     5,
     6456,
     0.538,
     "s01 s06 s08 s10 s11"
    ]
   ]
  },
  "keys.store_records": {
   "cols": [
    "key",
    "records among the 12,000"
   ],
   "rows": [
    [
     "s01",
     4056
    ],
    [
     "s02",
     960
    ],
    [
     "s03",
     960
    ],
    [
     "s04",
     972
    ],
    [
     "s05",
     972
    ],
    [
     "s06",
     840
    ],
    [
     "s07",
     732
    ],
    [
     "s08",
     720
    ],
    [
     "s09",
     600
    ],
    [
     "s10",
     480
    ],
    [
     "s11",
     360
    ],
    [
     "s12",
     348
    ]
   ]
  },
  "log.batches": {
   "cols": [
    "first offset",
    "last offset",
    "records",
    "position in the file",
    "batch bytes"
   ],
   "rows": [
    [
     0,
     99,
     100,
     0,
     11791
    ],
    [
     100,
     199,
     100,
     11791,
     11903
    ],
    [
     200,
     299,
     100,
     23694,
     11899
    ],
    [
     300,
     399,
     100,
     35593,
     11899
    ],
    [
     400,
     499,
     100,
     47492,
     11903
    ],
    [
     500,
     599,
     100,
     59395,
     11899
    ]
   ]
  },
  "log.files_big": {
   "cols": [
    "file",
    "bytes"
   ],
   "rows": [
    [
     "00000000000000000000.index",
     688
    ],
    [
     "00000000000000000000.log",
     1042922
    ],
    [
     "00000000000000000000.timeindex",
     1032
    ],
    [
     "00000000000000008700.index",
     10485760
    ],
    [
     "00000000000000008700.log",
     398012
    ],
    [
     "00000000000000008700.snapshot",
     10
    ],
    [
     "00000000000000008700.timeindex",
     10485756
    ],
    [
     "leader-epoch-checkpoint",
     8
    ],
    [
     "partition.metadata",
     43
    ]
   ]
  },
  "log.files_small": {
   "cols": [
    "file",
    "bytes"
   ],
   "rows": [
    [
     "00000000000000000000.index",
     10485760
    ],
    [
     "00000000000000000000.log",
     637
    ],
    [
     "00000000000000000000.timeindex",
     10485756
    ],
    [
     "leader-epoch-checkpoint",
     8
    ],
    [
     "partition.metadata",
     43
    ]
   ]
  },
  "log.lookups": {
   "cols": [
    "offset to read",
    "index entry used (offset)",
    "file position",
    "batches read to find it"
   ],
   "rows": [
    [
     0,
     "none, so from the start of the file",
     0,
     1
    ],
    [
     250,
     199,
     11791,
     2
    ],
    [
     5000,
     4999,
     586908,
     2
    ],
    [
     8699,
     8699,
     1030923,
     1
    ]
   ]
  },
  "ops.metrics": {
   "cols": [
    "what is counted",
    "read from",
    "all three brokers up (brokers 1 / 2 / 3)",
    "broker 1 is dead (brokers 2 / 3)"
   ],
   "rows": [
    [
     "under-replicated partitions",
     "a broker",
     "0 / 0 / 0",
     "2 / 1"
    ],
    [
     "partitions below the minimum in-sync replicas",
     "a broker",
     "0 / 0 / 0",
     "0 / 0"
    ],
    [
     "partitions that this broker leads",
     "a broker",
     "1 / 1 / 1",
     "2 / 1"
    ],
    [
     "offline partitions",
     "the controller",
     "0",
     "0"
    ],
    [
     "active controllers",
     "the controller",
     "1",
     "1"
    ]
   ]
  },
  "ops.reassign_layout": {
   "cols": [
    "moment",
    "partition",
    "leader",
    "replicas",
    "in-sync replicas"
   ],
   "rows": [
    [
     "before",
     0,
     1,
     "1,2,3",
     "1,2,3"
    ],
    [
     "after",
     0,
     2,
     "2,3,4",
     "2,3,4"
    ]
   ]
  },
  "ops.rolling_steps": {
   "cols": [
    "step",
    "while it is down",
    "under-replicated partitions then (sum on the other brokers)",
    "afterwards"
   ],
   "rows": [
    [
     "restart broker 1",
     "broker 1 is down",
     6,
     "all three in sync again"
    ],
    [
     "restart broker 2",
     "broker 2 is down",
     6,
     "all three in sync again"
    ],
    [
     "restart broker 3",
     "broker 3 is down",
     6,
     "all three in sync again"
    ]
   ]
  },
  "producers.acks": {
   "cols": [
    "acks",
    "delivery reports",
    "errors",
    "offset in the first report",
    "offset in the last report",
    "records in the topic two seconds later",
    "what the report means"
   ],
   "rows": [
    [
     "0",
     1000,
     0,
     "unknown",
     "unknown",
     1000,
     "nothing: the producer does not wait for the broker"
    ],
    [
     "1",
     1000,
     0,
     0,
     999,
     1000,
     "the leader wrote it"
    ],
    [
     "all",
     1000,
     0,
     0,
     999,
     1000,
     "every in-sync replica wrote it"
    ]
   ]
  },
  "producers.batching": {
   "cols": [
    "records per batch",
    "batches in the log",
    "bytes in the log",
    "bytes per record",
    "bytes spent on batch headers"
   ],
   "rows": [
    [
     1,
     1000,
     177025,
     177.0,
     61000
    ],
    [
     10,
     100,
     123125,
     123.1,
     6100
    ],
    [
     100,
     10,
     118895,
     118.9,
     610
    ],
    [
     1000,
     1,
     119012,
     119.0,
     61
    ]
   ]
  },
  "producers.compression": {
   "cols": [
    "codec asked for",
    "codec in the batch header",
    "batches",
    "bytes in the log",
    "share of the uncompressed size"
   ],
   "rows": [
    [
     "none",
     "none",
     10,
     599431,
     1.0
    ],
    [
     "gzip",
     "gzip",
     10,
     95099,
     0.16
    ],
    [
     "snappy",
     "snappy",
     10,
     172829,
     0.29
    ],
    [
     "lz4",
     "lz4",
     10,
     184463,
     0.31
    ],
    [
     "zstd",
     "zstd",
     10,
     85109,
     0.14
    ]
   ]
  },
  "producers.errors": {
   "cols": [
    "what was tried",
    "error name",
    "what the producer says",
    "how the program finds out"
   ],
   "rows": [
    [
     "a 1.1 MB value, producer limit 1,000,000 bytes",
     "MSG_SIZE_TOO_LARGE",
     "Unable to produce message: Broker: Message size too large",
     "raised by produce(), nothing was sent"
    ],
    [
     "a 5,000 byte value, topic limit 1,000 bytes",
     "MSG_SIZE_TOO_LARGE",
     "Broker: Message size too large",
     "reported to the delivery callback"
    ],
    [
     "a topic that does not exist (the client may not create it)",
     "_MSG_TIMED_OUT",
     "Local: Message timed out",
     "reported to the delivery callback"
    ],
    [
     "a broker that is not there (localhost:9)",
     "_MSG_TIMED_OUT",
     "Local: Message timed out",
     "reported to the delivery callback"
    ]
   ]
  },
  "producers.idempotence": {
   "cols": [
    "producer",
    "first offset",
    "last offset",
    "producer id",
    "producer epoch",
    "first sequence",
    "last sequence"
   ],
   "rows": [
    [
     "enable.idempotence=true (Python client)",
     0,
     99,
     "<id A>",
     0,
     0,
     99
    ],
    [
     "enable.idempotence=true (Python client)",
     100,
     199,
     "<id A>",
     0,
     100,
     199
    ],
    [
     "enable.idempotence=true (Python client)",
     200,
     299,
     "<id A>",
     0,
     200,
     299
    ],
    [
     "enable.idempotence=false (Python client)",
     0,
     99,
     -1,
     -1,
     -1,
     -1
    ],
    [
     "enable.idempotence=false (Python client)",
     100,
     199,
     -1,
     -1,
     -1,
     -1
    ],
    [
     "enable.idempotence=false (Python client)",
     200,
     299,
     -1,
     -1,
     -1,
     -1
    ],
    [
     "kafka-console-producer (Java client), no settings",
     0,
     2,
     "<id B>",
     0,
     0,
     2
    ]
   ]
  },
  "replication.acks_when_short": {
   "cols": [
    "situation",
    "acks",
    "records sent",
    "outcome"
   ],
   "rows": [
    [
     "one replica in sync, topic needs 2",
     "all",
     5,
     "NOT_ENOUGH_REPLICAS x5"
    ],
    [
     "one replica in sync, topic needs 2",
     "1",
     5,
     "delivered x5"
    ],
    [
     "all three back in sync",
     "all",
     5,
     "delivered x5"
    ]
   ]
  },
  "replication.after_kill": {
   "cols": [
    "partition",
    "leader",
    "replicas (the first is the preferred leader)",
    "in-sync replicas"
   ],
   "rows": [
    [
     0,
     2,
     "1,2,3",
     "2,3"
    ],
    [
     1,
     2,
     "2,3,1",
     "2,3"
    ],
    [
     2,
     3,
     "3,1,2",
     "2,3"
    ]
   ]
  },
  "replication.after_restart": {
   "cols": [
    "partition",
    "leader",
    "replicas (the first is the preferred leader)",
    "in-sync replicas"
   ],
   "rows": [
    [
     0,
     2,
     "1,2,3",
     "1,2,3"
    ],
    [
     1,
     2,
     "2,3,1",
     "1,2,3"
    ],
    [
     2,
     3,
     "3,1,2",
     "1,2,3"
    ]
   ]
  },
  "replication.caught_up": {
   "cols": [
    "broker",
    "last offset of partition 0",
    "bytes",
    "sha256 (first 12 characters)"
   ],
   "rows": [
    [
     1,
     1499,
     179125,
     "7805f87cf0c7"
    ],
    [
     2,
     1499,
     179125,
     "7805f87cf0c7"
    ],
    [
     3,
     1499,
     179125,
     "7805f87cf0c7"
    ]
   ]
  },
  "replication.copies": {
   "cols": [
    "broker",
    "copy of partition 0",
    "bytes",
    "sha256 of the file (first 12 characters)",
    "batches",
    "last offset",
    "high watermark in the checkpoint file"
   ],
   "rows": [
    [
     1,
     "leader",
     119070,
     "e9f16aeae744",
     2,
     999,
     "repl 0 1000"
    ],
    [
     2,
     "follower",
     119070,
     "e9f16aeae744",
     2,
     999,
     "repl 0 1000"
    ],
    [
     3,
     "follower",
     119070,
     "e9f16aeae744",
     2,
     999,
     "repl 0 1000"
    ]
   ]
  },
  "replication.layout": {
   "cols": [
    "partition",
    "leader",
    "replicas (the first is the preferred leader)",
    "in-sync replicas"
   ],
   "rows": [
    [
     0,
     1,
     "1,2,3",
     "1,2,3"
    ],
    [
     1,
     2,
     "2,3,1",
     "1,2,3"
    ],
    [
     2,
     3,
     "3,1,2",
     "1,2,3"
    ]
   ]
  },
  "replication.two_down": {
   "cols": [
    "partition",
    "leader",
    "replicas (the first is the preferred leader)",
    "in-sync replicas"
   ],
   "rows": [
    [
     0,
     1,
     "1,2,3",
     "1"
    ],
    [
     1,
     1,
     "2,3,1",
     "1"
    ],
    [
     2,
     1,
     "3,1,2",
     "1"
    ]
   ]
  },
  "replication.unclean_election": {
   "cols": [
    "topic",
    "unclean.leader.election.enable",
    "situation",
    "leader of the partition",
    "can be read"
   ],
   "rows": [
    [
     "safe",
     false,
     "broker 1 is down, broker 2 is back, broker 2 has 100 of the 150 records",
     "none",
     "none"
    ],
    [
     "lossy",
     true,
     "broker 1 is down, broker 2 is back, broker 2 has 100 of the 150 records",
     2,
     "yes"
    ]
   ]
  },
  "replication.unclean_result": {
   "cols": [
    "topic",
    "records acknowledged",
    "acknowledged by the leader only",
    "readable while broker 1 was down",
    "records at the end",
    "acknowledged records missing at the end"
   ],
   "rows": [
    [
     "safe",
     170,
     50,
     "none: the partition had no leader",
     170,
     0
    ],
    [
     "lossy",
     170,
     50,
     100,
     120,
     50
    ]
   ]
  },
  "retention.by_size": {
   "cols": [
    "segment file",
    "bytes"
   ],
   "rows": [
    [
     "00000000000000008700.log",
     1039331
    ],
    [
     "00000000000000017300.log",
     1040626
    ],
    [
     "00000000000000025900.log",
     1040630
    ],
    [
     "00000000000000034500.log",
     665517
    ]
   ]
  },
  "retention.by_time": {
   "cols": [
    "moment",
    "earliest offset",
    "next offset",
    "segment files"
   ],
   "rows": [
    [
     "both bursts written",
     0,
     100,
     "00000000000000000000.log 00000000000000000050.log"
    ],
    [
     "the first burst is older than retention.ms",
     50,
     100,
     "00000000000000000050.log"
    ],
    [
     "the second burst is older too",
     100,
     150,
     "00000000000000000100.log"
    ]
   ]
  },
  "retention.compacted": {
   "cols": [
    "offset",
    "key",
    "round of the value that survived"
   ],
   "rows": [
    [
     48,
     "s01",
     5
    ],
    [
     49,
     "s02",
     5
    ],
    [
     50,
     "s03",
     5
    ],
    [
     51,
     "s04",
     5
    ],
    [
     52,
     "s05",
     5
    ],
    [
     53,
     "s06",
     5
    ],
    [
     54,
     "s07",
     5
    ],
    [
     55,
     "s08",
     5
    ],
    [
     56,
     "s09",
     5
    ],
    [
     57,
     "s10",
     5
    ],
    [
     60,
     "s11",
     "tombstone (no value)"
    ],
    [
     61,
     "s12",
     "tombstone (no value)"
    ],
    [
     62,
     "s01",
     6
    ]
   ]
  },
  "schemas.changes": {
   "cols": [
    "change to the schema",
    "new schema reads old data (backward)",
    "old schema reads new data (forward)",
    "compatible as",
    "what went wrong (first failure)"
   ],
   "rows": [
    [
     "add the field channel, with a default",
     "yes",
     "yes",
     "full",
     ""
    ],
    [
     "add the field channel, no default",
     "no",
     "yes",
     "forward only",
     "SchemaResolutionError: No default value for field channel in brewline.Order"
    ],
    [
     "remove the field status (it had no default)",
     "yes",
     "no",
     "backward only",
     "SchemaResolutionError: No default value for field status in brewline.Order"
    ],
    [
     "remove the field customer_id (it had a default)",
     "yes",
     "yes",
     "full",
     ""
    ],
    [
     "rename total_cents to amount_cents",
     "no",
     "no",
     "none",
     "SchemaResolutionError: No default value for field amount_cents in brewline.Order"
    ],
    [
     "rename total_cents to amount_cents, with an alias",
     "yes",
     "no",
     "backward only",
     "SchemaResolutionError: No default value for field total_cents in brewline.Order"
    ],
    [
     "widen total_cents from int to long",
     "yes",
     "no",
     "backward only",
     "SchemaResolutionError: Schema mismatch: long is not int"
    ],
    [
     "narrow order_id from long to int",
     "no",
     "yes",
     "forward only",
     "SchemaResolutionError: Schema mismatch: long is not int"
    ],
    [
     "make customer_id required (it was null or long)",
     "no",
     "yes",
     "forward only",
     "SchemaResolutionError: schema mismatch: ['null', 'long'] not found in long"
    ]
   ]
  },
  "schemas.registry_flow": {
   "cols": [
    "schema offered to the subject orders-value",
    "subject set to BACKWARD: id given, or refused",
    "subject set to FULL: id given, or refused"
   ],
   "rows": [
    [
     "version 1: order_id, store_id, customer_id, total_cents, status",
     1,
     1
    ],
    [
     "add channel, with a default",
     2,
     2
    ],
    [
     "add coupon, no default",
     "refused",
     "refused"
    ],
    [
     "remove status",
     3,
     "refused"
    ]
   ]
  },
  "schemas.sizes": {
   "cols": [
    "format of the value",
    "bytes in the log for 1,000 orders",
    "bytes per order",
    "share of JSON"
   ],
   "rows": [
    [
     "JSON text",
     118895,
     118.9,
     1.0
    ],
    [
     "Avro with the 5 byte header",
     34107,
     34.1,
     0.29
    ]
   ]
  },
  "security.sasl": {
   "cols": [
    "what was tried",
    "delivery report",
    "what the client says about it",
    "errors that the client reports on its own"
   ],
   "rows": [
    [
     "no login at all (security.protocol=PLAINTEXT on the SASL listener)",
     "_MSG_TIMED_OUT",
     "Local: Message timed out",
     "_ALL_BROKERS_DOWN: 1/1 brokers are down"
    ],
    [
     "alice with the wrong password",
     "_MSG_TIMED_OUT",
     "Local: Message timed out",
     "_AUTHENTICATION: sasl_plaintext://<broker>: SASL authentication error: Authentication failed during authentication due to invalid credentials with SASL mechanism SCRAM-SHA-256 | _ALL_BROKERS_DOWN: 1/1 brokers are down"
    ],
    [
     "alice, right password, no ACL yet",
     "TOPIC_AUTHORIZATION_FAILED",
     "Broker: Topic authorization failed",
     ""
    ],
    [
     "alice, after Write and Describe on the topic",
     "delivered",
     "",
     ""
    ],
    [
     "bob reads with a group, Read on the topic only",
     "GROUP_AUTHORIZATION_FAILED",
     "FindCoordinator response error: Group authorization failed.",
     ""
    ],
    [
     "bob reads with a group, after Read on the group",
     "delivered",
     "read the first record",
     ""
    ],
    [
     "bob reads, after a deny rule for Read on the topic",
     "TOPIC_AUTHORIZATION_FAILED",
     "Fetch from broker 1 failed: Broker: Topic authorization failed",
     ""
    ],
    [
     "alice writes to brewline.orders (the ACL is on the prefix brewline.)",
     "delivered",
     "",
     ""
    ],
    [
     "alice writes to brewline.refunds",
     "delivered",
     "",
     ""
    ],
    [
     "alice writes to other.topic",
     "TOPIC_AUTHORIZATION_FAILED",
     "Broker: Topic authorization failed",
     ""
    ]
   ]
  },
  "security.tls": {
   "cols": [
    "what the client has",
    "delivery report",
    "what the client says about it",
    "errors that the client reports on its own"
   ],
   "rows": [
    [
     "no trusted authority given (the system store does not know the CA)",
     "_MSG_TIMED_OUT",
     "Local: Message timed out",
     "_SSL: ssl://<broker>: SSL handshake failed: error:<code>:SSL routines::certificate verify failed: broker certificate could not be verified, verify that ssl.ca.location is correctly configured or root CA certificates are installed (install ca-certificates package) | _ALL_BROKERS_DOWN: 1/1 brokers are down"
    ],
    [
     "trusted authority given, no client certificate",
     "_MSG_TIMED_OUT",
     "Local: Message timed out",
     "_TRANSPORT: ssl://<broker>: Receive failed: error:<code>:SSL routines::tlsv13 alert certificate required: SSL alert number 116 | _ALL_BROKERS_DOWN: 1/1 brokers are down"
    ],
    [
     "a different authority is trusted",
     "_MSG_TIMED_OUT",
     "Local: Message timed out",
     "_SSL: ssl://<broker>: SSL handshake failed: error:<code>:SSL routines::certificate verify failed: broker certificate could not be verified, verify that ssl.ca.location is correctly configured or root CA certificates are installed (install ca-certificates package) | _ALL_BROKERS_DOWN: 1/1 brokers are down"
    ],
    [
     "trusted authority and a client certificate (carol), no ACL yet",
     "TOPIC_AUTHORIZATION_FAILED",
     "Broker: Topic authorization failed",
     ""
    ],
    [
     "connecting to 127.0.0.1, the certificate is for the name localhost",
     "_MSG_TIMED_OUT",
     "Local: Message timed out",
     "_SSL: ssl://<broker>: SSL handshake failed: error:<code>:SSL routines::certificate verify failed: broker certificate could not be verified, verify that ssl.ca.location is correctly configured or root CA certificates are installed (install ca-certificates package) | _ALL_BROKERS_DOWN: 1/1 brokers are down"
    ],
    [
     "an ACL for the principal written as the subject of the certificate reads (CN first)",
     "TOPIC_AUTHORIZATION_FAILED",
     "Broker: Topic authorization failed",
     ""
    ],
    [
     "an ACL for the principal exactly as the broker names it",
     "delivered",
     "",
     ""
    ]
   ]
  },
  "streams.internal_topics": {
   "cols": [
    "internal topic (the application id store-counts- is left off)",
    "partitions",
    "copies",
    "cleanup policy"
   ],
   "rows": [
    [
     "orders-per-channel-changelog",
     3,
     1,
     "compact"
    ],
    [
     "orders-per-channel-repartition",
     3,
     1,
     "delete"
    ],
    [
     "orders-per-store-minute-changelog",
     3,
     1,
     "compact,delete"
    ]
   ]
  },
  "streams.s01_by_minute": {
   "cols": [
    "minute of event time (from 00:00)",
    "orders of store s01"
   ],
   "rows": [
    [
     "00:00",
     22
    ],
    [
     "00:01",
     20
    ],
    [
     "00:02",
     20
    ],
    [
     "00:03",
     20
    ],
    [
     "00:04",
     20
    ],
    [
     "00:05",
     20
    ],
    [
     "00:06",
     20
    ],
    [
     "00:07",
     20
    ],
    [
     "00:08",
     22
    ],
    [
     "00:09",
     21
    ]
   ]
  },
  "world.defaults": {
   "cols": [
    "setting",
    "value",
    "where it comes from"
   ],
   "rows": [
    [
     "auto.create.topics.enable",
     "true",
     "DEFAULT_CONFIG"
    ],
    [
     "num.partitions",
     "1",
     "DEFAULT_CONFIG"
    ],
    [
     "default.replication.factor",
     "1",
     "DEFAULT_CONFIG"
    ],
    [
     "min.insync.replicas",
     "1",
     "DYNAMIC_DEFAULT_BROKER_CONFIG"
    ],
    [
     "unclean.leader.election.enable",
     "false",
     "DEFAULT_CONFIG"
    ],
    [
     "log.retention.hours",
     "168",
     "DEFAULT_CONFIG"
    ],
    [
     "log.segment.bytes",
     "1073741824",
     "DEFAULT_CONFIG"
    ],
    [
     "log.roll.hours",
     "168",
     "DEFAULT_CONFIG"
    ],
    [
     "message.max.bytes",
     "1048588",
     "DEFAULT_CONFIG"
    ],
    [
     "log.index.interval.bytes",
     "4096",
     "DEFAULT_CONFIG"
    ],
    [
     "log.message.timestamp.type",
     "CreateTime",
     "DEFAULT_CONFIG"
    ],
    [
     "compression.type",
     "producer",
     "DEFAULT_CONFIG"
    ],
    [
     "offsets.topic.num.partitions",
     "50",
     "DEFAULT_CONFIG"
    ],
    [
     "offsets.retention.minutes",
     "10080",
     "DEFAULT_CONFIG"
    ],
    [
     "transaction.state.log.num.partitions",
     "50",
     "DEFAULT_CONFIG"
    ],
    [
     "transactional.id.expiration.ms",
     "604800000",
     "DEFAULT_CONFIG"
    ],
    [
     "replica.lag.time.max.ms",
     "30000",
     "DEFAULT_CONFIG"
    ],
    [
     "broker.session.timeout.ms",
     "9000",
     "DEFAULT_CONFIG"
    ],
    [
     "group.consumer.session.timeout.ms",
     "45000",
     "DEFAULT_CONFIG"
    ],
    [
     "group.coordinator.rebalance.protocols",
     "classic,consumer,streams",
     "DEFAULT_CONFIG"
    ],
    [
     "delete.topic.enable",
     "true",
     "DEFAULT_CONFIG"
    ]
   ]
  },
  "world.features": {
   "cols": [
    "feature",
    "lowest level it supports",
    "highest level it supports",
    "level in use"
   ],
   "rows": [
    [
     "eligible.leader.replicas.version",
     "0",
     "1",
     "1"
    ],
    [
     "group.version",
     "0",
     "1",
     "1"
    ],
    [
     "kraft.version",
     "0",
     "1",
     "1"
    ],
    [
     "metadata.version",
     "3.3-IV3",
     "4.4-IV2",
     "4.4-IV2"
    ],
    [
     "share.version",
     "0",
     "2",
     "2"
    ],
    [
     "streams.version",
     "0",
     "1",
     "1"
    ],
    [
     "transaction.version",
     "0",
     "2",
     "2"
    ]
   ]
  },
  "world.internal_topics": {
   "cols": [
    "topic",
    "partitions",
    "copies of each partition"
   ],
   "rows": [
    [
     "__consumer_offsets",
     50,
     3
    ],
    [
     "__transaction_state",
     50,
     3
    ]
   ]
  },
  "world.tool_groups": {
   "cols": [
    "purpose",
    "tools"
   ],
   "rows": [
    [
     "Run and format",
     "kafka-server-start, kafka-server-stop, kafka-storage, kafka-features"
    ],
    [
     "Topics and data",
     "kafka-topics, kafka-configs, kafka-console-producer, kafka-console-consumer, kafka-get-offsets, kafka-delete-records"
    ],
    [
     "Groups",
     "kafka-consumer-groups, kafka-groups, kafka-share-groups, kafka-streams-groups, kafka-console-share-consumer"
    ],
    [
     "Cluster and disks",
     "kafka-metadata-quorum, kafka-metadata-shell, kafka-log-dirs, kafka-dump-log, kafka-broker-api-versions, kafka-cluster"
    ],
    [
     "Moving data",
     "kafka-reassign-partitions, kafka-leader-election, kafka-replica-verification"
    ],
    [
     "Safety",
     "kafka-acls, kafka-delegation-tokens, kafka-transactions, kafka-client-metrics"
    ],
    [
     "Connect and mirroring",
     "connect-distributed, connect-standalone, connect-mirror-maker, connect-plugin-path, connect-internal-topics"
    ],
    [
     "Measuring",
     "kafka-producer-perf-test, kafka-consumer-perf-test, kafka-e2e-latency, kafka-jmx"
    ]
   ]
  }
 },
 "text": {
  "cdc.event_snapshot": "{\n  \"before\": null,\n  \"after\": {\n    \"order_id\": 1,\n    \"store_id\": \"s01\",\n    \"customer_id\": 1000,\n    \"total_cents\": 300,\n    \"status\": \"refunded\"\n  },\n  \"source\": {\n    \"version\": \"3.7.1.Final\",\n    \"connector\": \"postgresql\",\n    \"name\": \"brewline\",\n    \"ts_ms\": \"<ts_ms>\",\n    \"snapshot\": \"first_in_data_collection\",\n    \"db\": \"brewline\",\n    \"sequence\": \"<sequence>\",\n    \"ts_us\": \"<ts_us>\",\n    \"ts_ns\": \"<ts_ns>\",\n    \"schema\": \"public\",\n    \"table\": \"orders\",\n    \"txId\": \"<txId>\",\n    \"lsn\": \"<lsn>\",\n    \"xmin\": \"<xmin>\",\n    \"origin\": null,\n    \"origin_lsn\": null\n  },\n  \"op\": \"r\",\n  \"ts_ms\": \"<ts_ms>\",\n  \"ts_us\": \"<ts_us>\",\n  \"ts_ns\": \"<ts_ns>\"\n}",
  "cdc.event_update": "{\n  \"before\": null,\n  \"after\": {\n    \"order_id\": 2,\n    \"store_id\": \"s02\",\n    \"customer_id\": 1007,\n    \"total_cents\": 337,\n    \"status\": \"refunded\"\n  },\n  \"source\": {\n    \"version\": \"3.7.1.Final\",\n    \"connector\": \"postgresql\",\n    \"name\": \"brewline\",\n    \"ts_ms\": \"<ts_ms>\",\n    \"snapshot\": \"false\",\n    \"db\": \"brewline\",\n    \"sequence\": \"<sequence>\",\n    \"ts_us\": \"<ts_us>\",\n    \"ts_ns\": \"<ts_ns>\",\n    \"schema\": \"public\",\n    \"table\": \"orders\",\n    \"txId\": \"<txId>\",\n    \"lsn\": \"<lsn>\",\n    \"xmin\": \"<xmin>\",\n    \"origin\": null,\n    \"origin_lsn\": null\n  },\n  \"op\": \"u\",\n  \"ts_ms\": \"<ts_ms>\",\n  \"ts_us\": \"<ts_us>\",\n  \"ts_ns\": \"<ts_ns>\"\n}",
  "cdc.flat_events": "{\"order_id\":2,\"store_id\":\"s02\",\"customer_id\":1007,\"total_cents\":337,\"status\":\"paid\",\"channel\":\"app\",\"__deleted\":\"false\",\"__op\":\"u\",\"__table\":\"orders\"}\n{\"order_id\":4,\"store_id\":\"s01\",\"customer_id\":null,\"total_cents\":411,\"status\":\"paid\",\"channel\":\"web\",\"__deleted\":\"true\",\"__op\":\"d\",\"__table\":\"orders\"}",
  "cdc.publication": "dbz_publication  customers\ndbz_publication  orders",
  "connect.offsets_record": "key: [\"src-orders\",{\"filename\":\"<files>/orders.jsonl\"}]\nvalue: {\"position\":2593}",
  "connect.sink_plain": "{store_id=s01, channel=app, customer_id=1000, order_id=1, total_cents=300, status=refunded}\n{store_id=s02, channel=counter, customer_id=1007, order_id=2, total_cents=337, status=paid}",
  "connect.sink_smt": "{store_id=s01, source=pos, order_id=1, total_cents=300, status=}\n{store_id=s02, source=pos, order_id=2, total_cents=337, status=}",
  "consumers.describe_group": "GROUP           TOPIC           PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG             CONSUMER-ID     HOST            CLIENT-ID\ng-basic         cons            0          400             1000            600             -               -               -\ng-basic         cons            1          800             1000            200             -               -               -\ng-basic         cons            2          1000            1000            0               -               -               -\ng-basic         cons            3          250             1000            750             -               -               -\ng-basic         cons            4          600             1000            400             -               -               -\ng-basic         cons            5          1               1000            999             -               -               -",
  "consumers.describe_state": "GROUP           COORDINATOR (ID)          ASSIGNMENT-STRATEGY  STATE                #MEMBERS\ng-basic         localhost:9092  (1)       -                    Empty                0",
  "consumers.kafka_groups_list": "GROUP                TYPE                 PROTOCOL            \ng-basic              Classic                                   ",
  "consumers.list_groups": "g-basic",
  "consumers.offsets_dump": "| offset: 0 keySize: 21 valueSize: 42 sequence: 0 headerKeys: [] key: {\"type\":\"1\",\"data\":{\"group\":\"g-basic\",\"topic\":\"cons\",\"partition\":0}} payload: {\"version\":\"4\",\"data\":{\"offset\":400,\"leaderEpoch\":-1,\"metadata\":\"\",\"commitTimestamp\":<time>,\"topicId\":\"<topic id>\"}}\n| offset: 1 keySize: 21 valueSize: 42 sequence: 0 headerKeys: [] key: {\"type\":\"1\",\"data\":{\"group\":\"g-basic\",\"topic\":\"cons\",\"partition\":1}} payload: {\"version\":\"4\",\"data\":{\"offset\":800,\"leaderEpoch\":-1,\"metadata\":\"\",\"commitTimestamp\":<time>,\"topicId\":\"<topic id>\"}}\n| offset: 2 keySize: 21 valueSize: 42 sequence: 0 headerKeys: [] key: {\"type\":\"1\",\"data\":{\"group\":\"g-basic\",\"topic\":\"cons\",\"partition\":2}} payload: {\"version\":\"4\",\"data\":{\"offset\":1000,\"leaderEpoch\":-1,\"metadata\":\"\",\"commitTimestamp\":<time>,\"topicId\":\"<topic id>\"}}",
  "consumers.reset_datetime": "GROUP           TOPIC           PARTITION  NEW-OFFSET\ng-basic         cons            4          300\ng-basic         cons            3          300\ng-basic         cons            5          300\ng-basic         cons            0          300\ng-basic         cons            2          300\ng-basic         cons            1          300",
  "consumers.reset_dry_run": "GROUP           TOPIC           PARTITION  NEW-OFFSET\ng-basic         cons            4          0\ng-basic         cons            3          0\ng-basic         cons            5          0\ng-basic         cons            0          0\ng-basic         cons            2          0\ng-basic         cons            1          0",
  "consumers.reset_shift": "GROUP           TOPIC           PARTITION  NEW-OFFSET\ng-basic         cons            4          500\ng-basic         cons            3          150\ng-basic         cons            5          0\ng-basic         cons            0          300\ng-basic         cons            2          900\ng-basic         cons            1          700\n[<time>] WARN New offset (-99) is lower than earliest offset for topic partition cons-5. Value will be set to 0. (org.apache.kafka.tools.GroupOffsetsResetter)",
  "consumers.reset_while_running": "Error: Assignments can only be reset if the group 'g-basic' is inactive, but the current state is Stable.\n\nGROUP           TOPIC           PARTITION  NEW-OFFSET",
  "delivery.tx_describe_done": "CoordinatorId  TransactionalId  ProducerId  ProducerEpoch  TransactionState  TransactionTimeoutMs  CurrentTransactionStartTimeMs  TransactionDurationMs  TopicPartitions  \n<broker>  tx-pipeline-1  <id>  2  CompleteCommit  20000  <time>  <ms>    ",
  "delivery.tx_describe_open": "CoordinatorId  TransactionalId  ProducerId  ProducerEpoch  TransactionState  TransactionTimeoutMs  CurrentTransactionStartTimeMs  TransactionDurationMs  TopicPartitions  \n<broker>  tx-pipeline-1  <id>  0  Ongoing  20000  <time>  <ms>  tx-out-0  ",
  "delivery.tx_list_done": "TransactionalId  Coordinator  ProducerId  TransactionState  \ntx-pipeline-1  <broker>  <id>  CompleteCommit  ",
  "delivery.tx_list_open": "TransactionalId  Coordinator  ProducerId  TransactionState  \ntx-pipeline-1  <broker>  <id>  Ongoing  ",
  "delivery.tx_marker_lines": "| offset: 65 keySize: 4 valueSize: 6 sequence: -1 headerKeys: [] endTxnMarker: COMMIT coordinatorEpoch: 0\n| offset: 76 keySize: 4 valueSize: 6 sequence: -1 headerKeys: [] endTxnMarker: ABORT coordinatorEpoch: 0\n| offset: 87 keySize: 4 valueSize: 6 sequence: -1 headerKeys: [] endTxnMarker: COMMIT coordinatorEpoch: 0",
  "log.checkpoint_hw": "0\n<number of partitions on this broker>\norders-demo 0 5",
  "log.dump_small": "Dumping <work>/node1/data/orders-demo-0/00000000000000000000.log\nLog starting offset: 0\nbaseOffset: 0 lastOffset: 4 count: 5 baseSequence: -1 lastSequence: -1 producerId: -1 producerEpoch: -1 partitionLeaderEpoch: 0 isTransactional: false isControl: false deleteHorizonMs: OptionalLong.empty position: 0 CreateTime: 1767225604000 size: 637 magic: 2 compresscodec: none crc: 2733679849 isvalid: true\n| offset: 0 CreateTime: 1767225600000 keySize: 3 valueSize: 104 sequence: -1 headerKeys: [] key: s01 payload: {\"order_id\":1,\"store_id\":\"s01\",\"customer_id\":1000,\"total_cents\":300,\"status\":\"refunded\",\"channel\":\"app\"}\n| offset: 1 CreateTime: 1767225601000 keySize: 3 valueSize: 104 sequence: -1 headerKeys: [] key: s02 payload: {\"order_id\":2,\"store_id\":\"s02\",\"customer_id\":1007,\"total_cents\":337,\"status\":\"paid\",\"channel\":\"counter\"}\n| offset: 2 CreateTime: 1767225602000 keySize: 3 valueSize: 100 sequence: -1 headerKeys: [] key: s07 payload: {\"order_id\":3,\"store_id\":\"s07\",\"customer_id\":1014,\"total_cents\":374,\"status\":\"paid\",\"channel\":\"web\"}\n| offset: 3 CreateTime: 1767225603000 keySize: 3 valueSize: 100 sequence: -1 headerKeys: [] key: s01 payload: {\"order_id\":4,\"store_id\":\"s01\",\"customer_id\":null,\"total_cents\":411,\"status\":\"paid\",\"channel\":\"app\"}\n| offset: 4 CreateTime: 1767225604000 keySize: 3 valueSize: 104 sequence: -1 headerKeys: [] key: s04 payload: {\"order_id\":5,\"store_id\":\"s04\",\"customer_id\":1028,\"total_cents\":448,\"status\":\"paid\",\"channel\":\"counter\"}",
  "log.get_offsets_command": "kafka-get-offsets.sh --bootstrap-server localhost:9092 --topic orders-big --time -1\norders-big:0:12000",
  "log.leader_epoch": "0\n1\n0 0",
  "log.partition_metadata": "version: 0\ntopic_id: <topic id>",
  "ops.quota_described": "Quota configs for client-id 'quota-client' are producer_byte_rate=200000.0",
  "ops.quota_set": "Completed updating config for client quota-client.",
  "ops.reassign_execute": "Current partition replica assignment\n\n{\"version\":1,\"partitions\":[{\"topic\":\"moving\",\"partition\":0,\"replicas\":[1,2,3],\"log_dirs\":[\"<work>/node1/data\",\"<work>/node2/data\",\"<work>/node3/data\"]}]}\n\nSave this to use as the --reassignment-json-file option during rollback\nWarning: You must run --verify periodically, until the reassignment completes, to ensure the throttle is removed.\nThe inter-broker throttle limit was set to 50000000 B/s\nSuccessfully started partition reassignment for moving-0",
  "ops.reassign_generate": "Current partition replica assignment\n{\"version\":1,\"partitions\":[{\"topic\":\"moving\",\"partition\":0,\"replicas\":[1,2,3],\"log_dirs\":[\"<work>/node1/data\",\"<work>/node2/data\",\"<work>/node3/data\"]}]}\n\nProposed partition reassignment configuration\n{\"version\":1,\"partitions\":[{\"topic\":\"moving\",\"partition\":0,\"replicas\":[3,4,2],\"log_dirs\":[\"any\",\"any\",\"any\"]}]}",
  "ops.reassign_verify": "Status of partition reassignment:\nReassignment of partition moving-0 is completed.\n\nClearing broker-level throttles on brokers 1,2,3,4\nClearing topic-level throttles on topic moving",
  "producers.headers_dump": "| offset: 0 CreateTime: 1767225600000 keySize: 3 valueSize: 104 sequence: -1 headerKeys: [trace-id,source] key: s01 payload: {\"order_id\":1,\"store_id\":\"s01\",\"customer_id\":1000,\"total_cents\":300,\"status\":\"refunded\",\"channel\":\"app\"}\n| offset: 1 CreateTime: 1767225601000 keySize: 3 valueSize: 104 sequence: -1 headerKeys: [trace-id,source] key: s02 payload: {\"order_id\":2,\"store_id\":\"s02\",\"customer_id\":1007,\"total_cents\":337,\"status\":\"paid\",\"channel\":\"counter\"}",
  "replication.describe": "Topic: repl\tTopicId: <topic id>\tPartitionCount: 3\tReplicationFactor: 3\tConfigs: min.insync.replicas=2,retention.ms=-1\n\tTopic: repl\tPartition: 0\tLeader: 1\tReplicas: 1,2,3\tIsr: 1,2,3\tElr: \tLastKnownElr: \n\tTopic: repl\tPartition: 1\tLeader: 2\tReplicas: 2,3,1\tIsr: 2,3,1\tElr: \tLastKnownElr: \n\tTopic: repl\tPartition: 2\tLeader: 3\tReplicas: 3,1,2\tIsr: 3,1,2\tElr: \tLastKnownElr: ",
  "replication.describe_offline": "Topic: safe\tTopicId: <topic id>\tPartitionCount: 1\tReplicationFactor: 3\tConfigs: min.insync.replicas=1,retention.ms=-1,unclean.leader.election.enable=false\n\tTopic: safe\tPartition: 0\tLeader: none\tReplicas: 1,2,3\tIsr: \tElr: 1\tLastKnownElr: 1\nTopic: lossy\tTopicId: <topic id>\tPartitionCount: 1\tReplicationFactor: 3\tConfigs: min.insync.replicas=1,retention.ms=-1,unclean.leader.election.enable=true\n\tTopic: lossy\tPartition: 0\tLeader: 2\tReplicas: 1,2,3\tIsr: 2\tElr: \tLastKnownElr: ",
  "replication.epochs": "broker 1 (the old leader):\n0\n2\n0 0\n1 1000\nbroker 2 (the new leader):\n0\n2\n0 0\n1 1000",
  "replication.preferred_election": "Successfully completed leader election (PREFERRED) for partitions repl-0",
  "replication.truncation_log": "INFO [ReplicaFetcher replicaId=1, leaderId=2, fetcherId=0] Truncating partition lossy-0 with TruncationState(offset=100, completed=true) due to leader epoch and offset EpochEndOffset(errorCode=0, partition=0, leaderEpoch=0, endOffset=100) (kafka.server.ReplicaFetcherThread)",
  "replication.under_min_isr": "\tTopic: repl\tPartition: 0\tLeader: 1\tReplicas: 1,2,3\tIsr: 1\tElr: 2,3\tLastKnownElr: \n\tTopic: repl\tPartition: 1\tLeader: 1\tReplicas: 2,3,1\tIsr: 1\tElr: 2\tLastKnownElr: \n\tTopic: repl\tPartition: 2\tLeader: 1\tReplicas: 3,1,2\tIsr: 1\tElr: 2\tLastKnownElr: ",
  "retention.backfill_log": "INFO [LocalLog partition=backfill-0, dir=<work>/node1/data/backfill-0] Rolled new log segment at offset 100 in N ms. (org.apache.kafka.storage.internals.log.LocalLog)\nINFO [UnifiedLog partition=backfill-0, dir=<work>/node1/data] Deleting segment LogSegment(baseOffset=0, size=11791, lastModifiedTime=<time>, largestRecordTimestamp=1767225699000) due to log retention time 604800000ms breach based on the largest record timestamp in the segment (org.apache.kafka.storage.internals.log.UnifiedLog)",
  "retention.cleaner_log": "INFO Cleaner 0: Cleaning log latest-0 (cleaning prior to <time>, discarding tombstones prior to upper bound deletion horizon Thu Jan 01 00:00:00 UTC 1970)... (org.apache.kafka.storage.internals.log.Cleaner)\n\tLog cleaner thread 0 cleaned log latest-0 (dirty section = [0, 62])",
  "retention.delete_records": "Executing records delete operation\nRecords delete operation completed:\npartition: cap-0\tlow_watermark: 39900",
  "retention.offsets_topic_config": "Dynamic configs for topic __consumer_offsets are:\ncleanup.policy=compact sensitive=false synonyms={DYNAMIC_TOPIC_CONFIG:cleanup.policy=compact, DEFAULT_CONFIG:log.cleanup.policy=delete}",
  "security.acl_list_all": "Current ACLs for resource `ResourcePattern(resourceType=TOPIC, name=orders, patternType=LITERAL)`:\n\t(principal=User:alice, host=*, operation=DESCRIBE, permissionType=ALLOW)\n\t(principal=User:alice, host=*, operation=WRITE, permissionType=ALLOW)\n\t(principal=User:bob, host=*, operation=DESCRIBE, permissionType=ALLOW)\n\t(principal=User:bob, host=*, operation=READ, permissionType=ALLOW)\n\nCurrent ACLs for resource `ResourcePattern(resourceType=TOPIC, name=brewline., patternType=PREFIXED)`:\n\t(principal=User:alice, host=*, operation=DESCRIBE, permissionType=ALLOW)\n\t(principal=User:alice, host=*, operation=WRITE, permissionType=ALLOW)\n\nCurrent ACLs for resource `ResourcePattern(resourceType=GROUP, name=bob-group, patternType=LITERAL)`:\n\t(principal=User:bob, host=*, operation=READ, permissionType=ALLOW)",
  "security.acl_list_topic": "Current ACLs for resource `ResourcePattern(resourceType=TOPIC, name=orders, patternType=LITERAL)`:\n\t(principal=User:alice, host=*, operation=WRITE, permissionType=ALLOW)\n\t(principal=User:alice, host=*, operation=DESCRIBE, permissionType=ALLOW)",
  "security.denied_log": "Principal = User:alice is Denied operation = DESCRIBE from host = 127.0.0.1 on resource = Topic:LITERAL:orders for request = Metadata with resourceRefCount = 1 based on rule DefaultDeny",
  "security.principal_log": "Principal = User:C=NL,O=Brewline,OU=Brewline,CN=carol is Denied operation = DESCRIBE from host = 127.0.0.1 on resource = Topic:LITERAL:orders for request = Metadata with resourceRefCount = 1 based on rule DefaultDeny",
  "security.users_created": "Completed updating config for user alice.\nCompleted updating config for user bob.",
  "security.users_described": "SCRAM credential configs for user-principal 'bob' are SCRAM-SHA-256=iterations=4096\nSCRAM credential configs for user-principal 'admin' are SCRAM-SHA-256=iterations=4096\nSCRAM credential configs for user-principal 'alice' are SCRAM-SHA-256=iterations=4096",
  "streams.state_tree": "store-counts/0_0\nstore-counts/0_0/orders-per-store-minute\nstore-counts/0_0/orders-per-store-minute/orders-per-store-minute.1767226020000\nstore-counts/0_0/orders-per-store-minute/orders-per-store-minute.1767226080000\nstore-counts/0_0/orders-per-store-minute/orders-per-store-minute.1767226140000",
  "streams.topology": "Topologies:\n   Sub-topology: 0\n    Source: KSTREAM-SOURCE-0000000000 (topics: [orders-s])\n      --> KSTREAM-KEY-SELECT-0000000005, KSTREAM-AGGREGATE-0000000001\n    Processor: KSTREAM-AGGREGATE-0000000001 (stores: [orders-per-store-minute])\n      --> KTABLE-TOSTREAM-0000000002\n      <-- KSTREAM-SOURCE-0000000000\n    Processor: KSTREAM-KEY-SELECT-0000000005 (stores: [])\n      --> orders-per-channel-repartition-filter\n      <-- KSTREAM-SOURCE-0000000000\n    Processor: KTABLE-TOSTREAM-0000000002 (stores: [])\n      --> KSTREAM-MAP-0000000003\n      <-- KSTREAM-AGGREGATE-0000000001\n    Processor: KSTREAM-MAP-0000000003 (stores: [])\n      --> KSTREAM-SINK-0000000004\n      <-- KTABLE-TOSTREAM-0000000002\n    Processor: orders-per-channel-repartition-filter (stores: [])\n      --> orders-per-channel-repartition-sink\n      <-- KSTREAM-KEY-SELECT-0000000005\n    Sink: KSTREAM-SINK-0000000004 (topic: order-counts)\n      <-- KSTREAM-MAP-0000000003\n    Sink: orders-per-channel-repartition-sink (topic: orders-per-channel-repartition)\n      <-- orders-per-channel-repartition-filter\n\n  Sub-topology: 1\n    Source: orders-per-channel-repartition-source (topics: [orders-per-channel-repartition])\n      --> KSTREAM-AGGREGATE-0000000006\n    Processor: KSTREAM-AGGREGATE-0000000006 (stores: [orders-per-channel])\n      --> KTABLE-TOSTREAM-0000000010\n      <-- orders-per-channel-repartition-source\n    Processor: KTABLE-TOSTREAM-0000000010 (stores: [])\n      --> KSTREAM-SINK-0000000011\n      <-- KSTREAM-AGGREGATE-0000000006\n    Sink: KSTREAM-SINK-0000000011 (topic: channel-counts)\n      <-- KTABLE-TOSTREAM-0000000010",
  "tests.idempotent_pytest": "....                                                                     [100%]\n4 passed in <time>s",
  "tests.pytest_bug": ".F.F                                                                     [100%]\n=================================== FAILURES ===================================\n_____________________ test_a_refunded_order_is_not_a_sale ______________________\ntest_order_totals.py:32: in test_a_refunded_order_is_not_a_sale\n    assert totals == {'s01': 300}\nE   AssertionError: assert {'s01': 750} == {'s01': 300}\nE     \nE     Differing items:\nE     {'s01': 750} != {'s01': 300}\nE     Use -v to get more diff\n_______ test_totals_of_a_real_topic_match_the_totals_of_the_sent_orders ________\ntest_order_totals.py:50: in test_totals_of_a_real_topic_match_the_totals_of_the_sent_orders\n    assert got == expected\nE   AssertionError: assert {'s01': 2570,..., 's03': 2610} == {'s02': 2060,..., 's01': 2080}\nE     \nE     Differing items:\nE     {'s02': 2590} != {'s02': 2060}\nE     {'s03': 2610} != {'s03': 2100}\nE     {'s01': 2570} != {'s01': 2080}\nE     Use -v to get more diff\n=========================== short test summary info ============================\nFAILED test_order_totals.py::test_a_refunded_order_is_not_a_sale - AssertionE...\nFAILED test_order_totals.py::test_totals_of_a_real_topic_match_the_totals_of_the_sent_orders\n2 failed, 2 passed in <time>s",
  "tests.pytest_clean": "....                                                                     [100%]\n4 passed in <time>s",
  "tests.pytest_unit_only": "...                                                                      [100%]\n3 passed, 1 deselected in <time>s",
  "world.meta_properties": "cluster.id=<cluster id>\ndirectory.id=<directory id>\nnode.id=1\nversion=1",
  "world.metadata_dir": "<offset>-0000000000.checkpoint\n00000000000000000000.index\n00000000000000000000.log\n00000000000000000000.timeindex\nleader-epoch-checkpoint\npartition.metadata\nquorum-state",
  "world.metadata_sample": "{\"type\":\"TOPIC_RECORD\",\"version\":0,\"data\":{\"name\":\"brewline.orders\",\"topicId\":\"<topic id>\"}}\n{\"type\":\"PARTITION_RECORD\",\"version\":2,\"data\":{\"partitionId\":0,\"topicId\":\"<topic id>\",\"replicas\":[1,2,3],\"isr\":[1,2,3],\"removingReplicas\":[],\"addingReplicas\":[],\"leader\":1,\"leaderEpoch\":0,\"partitionEpoch\":0,\"directories\":[\"<directory id>\",\"<directory id>\",\"<directory id>\"]}}",
  "world.node_dir": ".lock\n__cluster_metadata-0\ncleaner-offset-checkpoint\nlog-start-offset-checkpoint\nmeta.properties\nrecovery-point-offset-checkpoint\nreplication-offset-checkpoint",
  "world.quorum": "ClusterId:              <cluster id>\nLeaderId:               <one of the three>\nLeaderEpoch:            1\nHighWatermark:          <varies>\nMaxFollowerLag:         0\nMaxFollowerLagTimeMs:   <varies>\nCurrentVoters:          [{\"id\": 1, \"directoryId\": \"<directory id>\", \"endpoints\": [\"CONTROLLER://localhost:9093\"]}, {\"id\": 2, \"directoryId\": \"<directory id>\", \"endpoints\": [\"CONTROLLER://localhost:9193\"]}, {\"id\": 3, \"directoryId\": \"<directory id>\", \"endpoints\": [\"CONTROLLER://localhost:9293\"]}]\nCurrentObservers:       []"
 }
};
