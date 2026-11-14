window.LAB = window.LAB || {};
LAB.real = {
 "counts": {
  "cdc.flink_cdc_summary_default": {
   "error": "java.lang.IllegalStateException: The \"before\" field of UPDATE/DELETE message is null, please check the Postgres table has been set REPLICA IDENTITY to FULL level. You can update the setting by running the command in Postgres 'ALTER TABLE public.orders REPLICA IDENTITY FULL'.",
   "failures_recorded": 4,
   "job_state": "RESTARTING",
   "kinds": [
    "+I"
   ],
   "lines": 9,
   "replica_identity": "default",
   "slot": "flink_slot  pgoutput  active=true",
   "snapshot_rows": 5
  },
  "cdc.flink_cdc_summary_full": {
   "error": "",
   "failures_recorded": 0,
   "job_state": "RUNNING",
   "kinds": [
    "+I",
    "+U",
    "-D",
    "-U"
   ],
   "lines": 9,
   "replica_identity": "full",
   "slot": "flink_slot  pgoutput  active=true",
   "snapshot_rows": 5
  },
  "cdc.flink_cdc_summary_upsert": {
   "error": "",
   "failures_recorded": 0,
   "job_state": "RUNNING",
   "kinds": [
    "+I",
    "+U",
    "-D",
    "-U"
   ],
   "lines": 9,
   "replica_identity": "default",
   "slot": "flink_slot  pgoutput  active=true",
   "snapshot_rows": 5
  },
  "connect.files": {
   "after_checkpoints": [
    ".part-<uuid>-0-2.inprogress.<uuid>",
    "part-<uuid>-0-0",
    "part-<uuid>-0-1"
   ],
   "before_the_first_checkpoint": [
    ".part-<uuid>-0-0.inprogress.<uuid>"
   ],
   "checkpoint_interval_seconds": 8,
   "checkpoints_completed_at_the_first_look": 0,
   "hidden_before": true,
   "visible_after": true
  },
  "connect.files_rows": {
   "rows_in_visible_files": 200
  },
  "connect.topic": {
   "orders": 12,
   "orders_per_partition": {
    "0": 3,
    "1": 9
   },
   "partitions": 2
  },
  "connect.upsert_summary": {
   "changelog_rows_of_the_query": 25,
   "records_in_the_topic": 17,
   "retractions_not_written": 8,
   "tombstones": 3
  },
  "datastream.assignment": {
   "keys_seen": 12,
   "runtime_equals_keygroup_class_for_p2": true,
   "tasks_used": [
    0,
    1
   ]
  },
  "datastream.build": {
   "classes": [
    "KeyGroups.class",
    "Pipe$1.class",
    "Pipe.class",
    "StoreWatch$Order.class",
    "StoreWatch$Watch.class",
    "StoreWatch.class"
   ],
   "jar_bytes": 8398,
   "jar_holds_the_kafka_connector": false,
   "javac": "javac 21.0.12.1",
   "release": 17
  },
  "datastream.first_run": {
   "idle_lines": 12,
   "orders": 600,
   "totals_equal_the_truth": true
  },
  "datastream.max_parallelism_bounds": {
   "lower_bound": 128,
   "upper_bound": 32768
  },
  "datastream.restored": {
   "idle_lines": 12,
   "orders_in_total": 1200,
   "sample": [
    [
     "s01",
     "407",
     "234422"
    ],
    [
     "s02",
     "101",
     "51262"
    ],
    [
     "s03",
     "91",
     "43428"
    ]
   ],
   "totals_equal_the_truth": true
  },
  "datastream.round": {
   "classes": [
    "PassThousand$FirstPass.class",
    "PassThousand$Order.class",
    "PassThousand.class"
   ],
   "equals_plain_python": true,
   "job_state": "FINISHED",
   "limit_cents": 1000,
   "lines": 2,
   "orders": 12
  },
  "datastream.wrong_uid": {
   "cli_exit_code": 0,
   "job_state": "FAILED",
   "message": "Caused by: java.util.concurrent.CompletionException: java.lang.IllegalStateException: Failed to rollback to checkpoint/savepoint <savepoint>. Cannot map checkpoint/savepoint state for operator <id> to the new program, because the operator is not available in the new program. If you want to allow to skip this, you can set the --allowNonRestoredState option on the CLI.",
   "submitted": true
  },
  "joins.dedup_summary": {
   "distinct_orders": 4,
   "input_rows": 8
  },
  "joins.state_summary": {
   "checkpoints": 9,
   "interval_first": 86264,
   "interval_last": 382264,
   "interval_max": 382264,
   "ratio_regular_to_interval_last": 2.1,
   "regular_first": 93184,
   "regular_grows_every_checkpoint": true,
   "regular_last": 797184,
   "ttl_first": 99952,
   "ttl_flat_at_the_end": true,
   "ttl_last": 562446,
   "ttl_max": 562446
  },
  "running.compare": {
   "ratio": 4.0,
   "records_per_second_with_1": 99,
   "records_per_second_with_4": 396
  },
  "running.rate_p1": {
   "ceiling_per_second": 100,
   "lookup_parallelism": 1,
   "records_counted": 1785.0,
   "records_per_second": 99,
   "sleep_ms": 10,
   "topic_records": 120000
  },
  "running.rate_p4": {
   "ceiling_per_second": 400,
   "lookup_parallelism": 4,
   "records_counted": 7148.0,
   "records_per_second": 396,
   "sleep_ms": 10,
   "topic_records": 120000
  },
  "sql.append_only_summary": {
   "ops": [
    "+I"
   ],
   "refunds_in_input": 3,
   "rows": 3
  },
  "sql.minibatch_summary": {
   "batch_size": 4,
   "changelog_rows_with": 13,
   "changelog_rows_without": 17,
   "same_final_table": true
  },
  "sql.print_summary": {
   "kinds": [
    "+I",
    "+U",
    "-U"
   ],
   "lines": 17
  },
  "sql.stream_summary": {
   "batch_rows": 7,
   "changelog_rows": 17,
   "first_change": [
    "s01",
    "1",
    "300"
   ],
   "input_orders": 12,
   "insert_only_first_per_store": true,
   "ops": {
    "+I": 7,
    "+U": 5,
    "-U": 5
   },
   "replay_equals_batch": true,
   "stores": 7
  },
  "sql.two_level_summary": {
   "batch": [
    [
     "1",
     "5"
    ],
    [
     "2",
     "1"
    ],
    [
     "5",
     "1"
    ]
   ],
   "changelog_rows": 25,
   "ops": {
    "+I": 6,
    "+U": 8,
    "-D": 3,
    "-U": 8
   },
   "replay": [
    [
     "1",
     "5"
    ],
    [
     "2",
     "1"
    ],
    [
     "5",
     "1"
    ]
   ]
  },
  "state.a_before": {
   "checkpoint_interval_seconds": 3,
   "parallelism": 2,
   "slots_total": 4,
   "tms_running_the_job": [
    0
   ]
  },
  "state.a_result": {
   "checkpoint_before_the_kill": 3,
   "checkpoints_completed": 3,
   "checkpoints_failed": 3,
   "failures_recorded": 1,
   "first_failure_root_cause": "org.apache.flink.runtime.jobmaster.JobMasterException: TaskManager with id <taskmanager> is no longer reachable.",
   "job_state": "RUNNING",
   "orders_counted": 2400,
   "orders_sent": 2400,
   "restored_checkpoint_counted": 1,
   "stores": 12,
   "totals_equal_the_truth": true
  },
  "state.b_result": {
   "checkpoints_completed": 0,
   "exception_chain": [
    "org.apache.flink.runtime.JobException: Recovery is suppressed by NoRestartBackoffTimeStrategy",
    "Caused by: org.apache.flink.runtime.resourcemanager.exceptions.ResourceManagerException: TaskManager with id <taskmanager> is no longer reachable."
   ],
   "final_state": "FAILED",
   "restart_strategy_message": true
  },
  "state.backends_summary": {
   "heap_written_6": 709152,
   "incremental_writes_less_than_the_state": true,
   "rocksdb_full_written_6": 299671,
   "rocksdb_incremental_state_6": 316217,
   "rocksdb_incremental_written_6": 80233
  },
  "state.changed_query": {
   "job_state": "RESTARTING",
   "message": "Caused by: org.apache.flink.util.StateMigrationException: For heap backends, the new state serializer (org.apache.flink.table.runtime.typeutils.RowDataSerializer@302ceef5) must not be incompatible with the old state serializer (org.apache.flink.table.runtime.typeutils.RowDataSerializer@c6b89546)."
  },
  "state.copy_alo": {
   "checkpoint_before_the_kill": 3,
   "distinct_orders": 5000,
   "duplicates": 320,
   "guarantee": "at-least-once",
   "missing": 0,
   "orders_sent": 5000,
   "records_a_read_committed_reader_sees": 5320,
   "records_in_the_log": 5320,
   "records_of_aborted_transactions": 0
  },
  "state.copy_eo": {
   "checkpoint_before_the_kill": 3,
   "distinct_orders": 5000,
   "duplicates": 0,
   "guarantee": "exactly-once",
   "missing": 0,
   "orders_sent": 5000,
   "records_a_read_committed_reader_sees": 5000,
   "records_in_the_log": 5410,
   "records_of_aborted_transactions": 410
  },
  "state.no_savepoint_result": {
   "orders_counted_by_the_new_job": 600,
   "orders_in_the_topic": 3000
  },
  "state.rocksdb_files": {
   "example_names": [
    "<uuid>"
   ],
   "shared_folder_files": 4,
   "sst_files": 4
  },
  "state.savepoint_result": {
   "first_batch": 1200,
   "orders_counted": 2400,
   "parallelism_after": 3,
   "parallelism_before": 2,
   "restored_from_savepoint": true,
   "second_batch": 1200,
   "stopped_job_state": "FINISHED",
   "totals_equal_the_truth": true
  },
  "time.delay_facts": {
   "delays": [
    0,
    10,
    30,
    75,
    200
   ],
   "dropped": {
    "0": 4,
    "10": 3,
    "200": 0,
    "30": 3,
    "75": 1
   },
   "events": 14,
   "model_equals_flink": true,
   "window_seconds": 60,
   "windows_in_file": 5
  },
  "time.idle_paced_summary": {
   "first_window_orders": 4,
   "orders_a_second": 1,
   "windows": 4
  },
  "time.idle_summary": {
   "seconds_waited": 18,
   "setting": "table.exec.source.idle-timeout = 3 s",
   "windows_with_idle_timeout": 4,
   "windows_without_idle_timeout": 0
  },
  "time.idle_topic": {
   "partitions": 2,
   "records": 14,
   "records_in_partition_0": 14,
   "records_in_partition_1": 0
  },
  "time.session_supported": {
   "supported": true
  },
  "time.window_models": {
   "cumulate_equals_model": true,
   "cumulate_windows": 15,
   "hop_equals_model": true,
   "hop_windows": 10
  },
  "world.cluster": {
   "default_parallelism": 1,
   "deployment": "standalone session cluster, on one machine",
   "heartbeat_interval_ms": 2000,
   "heartbeat_timeout_ms": 10000,
   "jobmanager_process_mib": 1024,
   "rest_port": 8081,
   "slots_per_taskmanager": 2,
   "slots_total": 4,
   "taskmanager_process_mib": 1280,
   "taskmanagers": 2,
   "version": "2.2.1"
  },
  "world.distribution": {
   "bin": [
    "bash-java-utils.sh",
    "config-parser-utils.sh",
    "config.sh",
    "find-flink-home.sh",
    "flink",
    "flink-console.sh",
    "flink-daemon.sh",
    "historyserver.sh",
    "jobmanager.sh",
    "kubernetes-jobmanager.sh",
    "kubernetes-session.sh",
    "kubernetes-taskmanager.sh",
    "migrate-config-file.sh",
    "pyflink-shell.sh",
    "sql-client.sh",
    "sql-gateway.sh",
    "standalone-job.sh",
    "start-cluster.sh",
    "start-zookeeper-quorum.sh",
    "stop-cluster.sh",
    "stop-zookeeper-quorum.sh",
    "taskmanager.sh",
    "yarn-session.sh",
    "zookeeper.sh"
   ],
   "examples": [
    "python",
    "streaming",
    "table"
   ],
   "lib": [
    "flink-cep-2.2.1.jar",
    "flink-connector-files-2.2.1.jar",
    "flink-csv-2.2.1.jar",
    "flink-dist-2.2.1.jar",
    "flink-json-2.2.1.jar",
    "flink-scala_2.12-2.2.1.jar",
    "flink-table-api-java-uber-2.2.1.jar",
    "flink-table-planner-loader-2.2.1.jar",
    "flink-table-runtime-2.2.1.jar",
    "log4j-1.2-api-2.24.3.jar",
    "log4j-api-2.24.3.jar",
    "log4j-core-2.24.3.jar",
    "log4j-layout-template-json-2.24.3.jar",
    "log4j-slf4j-impl-2.24.3.jar"
   ],
   "opt": [
    "flink-azure-fs-hadoop-2.2.1.jar",
    "flink-gs-fs-hadoop-2.2.1.jar",
    "flink-oss-fs-hadoop-2.2.1.jar",
    "flink-python-2.2.1.jar",
    "flink-queryable-state-runtime-2.2.1.jar",
    "flink-s3-fs-hadoop-2.2.1.jar",
    "flink-s3-fs-presto-2.2.1.jar",
    "flink-shaded-netty-tcnative-dynamic-2.0.62.Final-20.0.jar",
    "flink-sql-client-2.2.1.jar",
    "flink-sql-gateway-2.2.1.jar",
    "flink-state-processor-api-2.2.1.jar",
    "flink-table-planner_2.12-2.2.1.jar"
   ],
   "plugins": [
    "external-resource-gpu",
    "metrics-datadog",
    "metrics-graphite",
    "metrics-influx",
    "metrics-jmx",
    "metrics-otel",
    "metrics-prometheus",
    "metrics-slf4j",
    "metrics-statsd"
   ]
  },
  "world.job": {
   "parallelism": 2,
   "slots_used": 2,
   "state": "RUNNING",
   "tasks": 4,
   "type": "STREAMING",
   "vertices": 2
  },
  "world.taskmanager_memory_sums": {
   "sum_of_pieces_mib": 1280,
   "total_flink_mib": 832,
   "total_process_mib": 1280
  }
 },
 "files": {
  "code/app/KeyGroups.java": "package brewline;\n\nimport org.apache.flink.runtime.state.KeyGroupRangeAssignment;\n\n/** Asks Flink itself which key group a key belongs to, and which parallel task of an operator holds that key group. */\npublic class KeyGroups {\n    public static void main(String[] args) {\n        int maxParallelism = Integer.parseInt(args[0]);\n        System.out.println(\"key,key_group,p2,p3,p4\");\n        for (int i = 1; i < args.length; i++) {\n            String key = args[i];\n            System.out.println(key + \",\" + KeyGroupRangeAssignment.assignToKeyGroup(key, maxParallelism)\n                    + \",\" + KeyGroupRangeAssignment.assignKeyToParallelOperator(key, maxParallelism, 2)\n                    + \",\" + KeyGroupRangeAssignment.assignKeyToParallelOperator(key, maxParallelism, 3)\n                    + \",\" + KeyGroupRangeAssignment.assignKeyToParallelOperator(key, maxParallelism, 4));\n        }\n    }\n}",
  "code/app/MaxParallelism.java": "package brewline;\n\nimport org.apache.flink.runtime.state.KeyGroupRangeAssignment;\n\n/** Asks Flink itself for the default maximum parallelism (the number of key groups) of an operator, and for the two bounds of that default. */\npublic class MaxParallelism {\n    public static void main(String[] args) {\n        System.out.println(\"parallelism,default_max_parallelism\");\n        for (String a : args) {\n            int p = Integer.parseInt(a);\n            System.out.println(p + \",\" + KeyGroupRangeAssignment.computeDefaultMaxParallelism(p));\n        }\n        System.out.println(\"lower_bound,\" + KeyGroupRangeAssignment.DEFAULT_LOWER_BOUND_MAX_PARALLELISM);\n        System.out.println(\"upper_bound,\" + KeyGroupRangeAssignment.UPPER_BOUND_MAX_PARALLELISM);\n    }\n}",
  "code/app/PassThousand.java": "package brewline;\n\nimport java.util.List;\n\nimport org.apache.flink.api.common.functions.OpenContext;\nimport org.apache.flink.api.common.state.ValueState;\nimport org.apache.flink.api.common.state.ValueStateDescriptor;\nimport org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;\nimport org.apache.flink.streaming.api.functions.KeyedProcessFunction;\nimport org.apache.flink.util.Collector;\n\n/** Coding round: print a line the first time the running total of a store reaches 1,000 cents. The first twelve Brewline orders are the input. */\npublic class PassThousand {\n\n    /** A public class with public fields and an empty constructor is a POJO to Flink. */\n    public static class Order {\n        public int orderId;\n        public String storeId;\n        public int totalCents;\n\n        public Order() {}\n\n        public Order(int orderId, String storeId, int totalCents) {\n            this.orderId = orderId;\n            this.storeId = storeId;\n            this.totalCents = totalCents;\n        }\n    }\n\n    static final List<Order> ORDERS = List.of(\n            new Order(1, \"s01\", 300), new Order(2, \"s02\", 337), new Order(3, \"s07\", 374), new Order(4, \"s01\", 411),\n            new Order(5, \"s04\", 448), new Order(6, \"s11\", 485), new Order(7, \"s01\", 522), new Order(8, \"s06\", 559),\n            new Order(9, \"s01\", 596), new Order(10, \"s04\", 633), new Order(11, \"s09\", 670), new Order(12, \"s01\", 707));\n\n    public static void main(String[] args) throws Exception {\n        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();\n        env.setParallelism(2);\n        env.fromData(ORDERS)\n                .keyBy(o -> o.storeId)\n                .process(new FirstPass(1000)).name(\"first pass\").uid(\"first-pass\")\n                .print();\n        env.execute(\"pass-thousand\");\n    }\n\n    /** One running total for every store, kept in state. It says so once, in the order that makes the total reach the limit. */\n    static class FirstPass extends KeyedProcessFunction<String, Order, String> {\n        private final long limit;\n        private transient ValueState<Long> total;\n\n        FirstPass(long limit) {\n            this.limit = limit;\n        }\n\n        @Override\n        public void open(OpenContext ctx) {\n            total = getRuntimeContext().getState(new ValueStateDescriptor<>(\"total\", Long.class));\n        }\n\n        @Override\n        public void processElement(Order o, Context ctx, Collector<String> out) throws Exception {\n            long before = total.value() == null ? 0 : total.value();\n            long after = before + o.totalCents;\n            total.update(after);\n            if (before < limit && after >= limit) {\n                out.collect(o.storeId + \" passed \" + limit + \" cents with order \" + o.orderId + \", total \" + after);\n            }\n        }\n    }\n}",
  "code/app/Pipe.java": "package brewline;\n\nimport org.apache.flink.api.common.eventtime.WatermarkStrategy;\nimport org.apache.flink.api.common.functions.RichMapFunction;\nimport org.apache.flink.api.common.serialization.SimpleStringSchema;\nimport org.apache.flink.connector.kafka.source.KafkaSource;\nimport org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;\nimport org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;\nimport org.apache.flink.streaming.api.functions.sink.v2.DiscardingSink;\nimport org.apache.flink.util.ParameterTool;\n\n/** A source that can read much faster than the step after it: the step after it takes some milliseconds for every record, like a call to a slow service. */\npublic class Pipe {\n    public static void main(String[] args) throws Exception {\n        ParameterTool p = ParameterTool.fromArgs(args);\n        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();\n\n        KafkaSource<String> source = KafkaSource.<String>builder()\n                .setBootstrapServers(p.getRequired(\"bootstrap\"))\n                .setTopics(p.getRequired(\"topic\"))\n                .setGroupId(\"pipe\")\n                .setStartingOffsets(OffsetsInitializer.earliest())\n                .setValueOnlyDeserializer(new SimpleStringSchema())\n                .build();\n\n        long sleepMillis = p.getLong(\"sleep-ms\", 10);\n        env.fromSource(source, WatermarkStrategy.noWatermarks(), \"orders\").setParallelism(1)\n                .rebalance()                                                  // a network step between the source and the slow step, so that they are two tasks\n                .map(new RichMapFunction<String, String>() {\n                    @Override\n                    public String map(String value) throws Exception {\n                        Thread.sleep(sleepMillis);\n                        return value;\n                    }\n                }).name(\"slow lookup\").setParallelism(p.getInt(\"lookup-parallelism\", 1))\n                .sinkTo(new DiscardingSink<>()).name(\"discard\");\n\n        env.execute(\"pipe\");\n    }\n}",
  "code/app/StoreWatch.java": "package brewline;\n\nimport org.apache.flink.api.common.eventtime.WatermarkStrategy;\nimport org.apache.flink.api.common.functions.OpenContext;\nimport org.apache.flink.api.common.serialization.SimpleStringSchema;\nimport org.apache.flink.api.common.state.ValueState;\nimport org.apache.flink.api.common.state.ValueStateDescriptor;\nimport org.apache.flink.util.ParameterTool;\nimport org.apache.flink.connector.kafka.source.KafkaSource;\nimport org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;\nimport org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.JsonNode;\nimport org.apache.flink.shaded.jackson2.com.fasterxml.jackson.databind.ObjectMapper;\nimport org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;\nimport org.apache.flink.streaming.api.functions.KeyedProcessFunction;\nimport org.apache.flink.util.Collector;\n\n/** Reads Brewline orders from Kafka, keeps a count and a total for every store, and says so when a store has had no order for a while. */\npublic class StoreWatch {\n\n    /** One order. Flink treats a public class with public fields and an empty constructor as a POJO and gives it a fast serializer. */\n    public static class Order {\n        public String storeId;\n        public int totalCents;\n\n        public Order() {}\n    }\n\n    public static void main(String[] args) throws Exception {\n        ParameterTool p = ParameterTool.fromArgs(args);\n        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();\n        env.enableCheckpointing(3000);\n\n        KafkaSource<String> source = KafkaSource.<String>builder()\n                .setBootstrapServers(p.getRequired(\"bootstrap\"))\n                .setTopics(p.getRequired(\"topic\"))\n                .setGroupId(\"store-watch\")\n                .setStartingOffsets(OffsetsInitializer.earliest())\n                .setValueOnlyDeserializer(new SimpleStringSchema())\n                .build();\n\n        env.fromSource(source, WatermarkStrategy.noWatermarks(), \"orders\").uid(\"orders-source\")\n                .map(StoreWatch::parse).name(\"parse\").uid(\"parse\")\n                .keyBy(o -> o.storeId)\n                .process(new Watch(p.getLong(\"idle-seconds\", 5) * 1000)).name(\"watch per store\").uid(p.get(\"uid\", \"watch\"))\n                .print().name(\"print\");\n\n        env.execute(\"store-watch\");\n    }\n\n    static Order parse(String json) throws Exception {\n        JsonNode n = new ObjectMapper().readTree(json);\n        Order o = new Order();\n        o.storeId = n.get(\"store_id\").asText();\n        o.totalCents = n.get(\"total_cents\").asInt();\n        return o;\n    }\n\n    /** The state of one store lives in three ValueStates: it is kept per key, checkpointed with the job, and restored after a failure. */\n    static class Watch extends KeyedProcessFunction<String, Order, String> {\n        private final long idleMillis;\n        private transient ValueState<Long> orders;\n        private transient ValueState<Long> cents;\n        private transient ValueState<Long> alarm;\n\n        Watch(long idleMillis) {\n            this.idleMillis = idleMillis;\n        }\n\n        @Override\n        public void open(OpenContext ctx) {\n            orders = getRuntimeContext().getState(new ValueStateDescriptor<>(\"orders\", Long.class));\n            cents = getRuntimeContext().getState(new ValueStateDescriptor<>(\"cents\", Long.class));\n            alarm = getRuntimeContext().getState(new ValueStateDescriptor<>(\"alarm\", Long.class));\n        }\n\n        @Override\n        public void processElement(Order o, Context ctx, Collector<String> out) throws Exception {\n            long n = (orders.value() == null ? 0 : orders.value()) + 1;\n            long c = (cents.value() == null ? 0 : cents.value()) + o.totalCents;\n            orders.update(n);\n            cents.update(c);\n            if (n == 1) {\n                out.collect(\"first order of \" + o.storeId + \" seen by subtask \" + getRuntimeContext().getTaskInfo().getIndexOfThisSubtask());\n            }\n            if (alarm.value() != null) {\n                ctx.timerService().deleteProcessingTimeTimer(alarm.value());      // an order came: the old alarm is not needed\n            }\n            long next = ctx.timerService().currentProcessingTime() + idleMillis;\n            ctx.timerService().registerProcessingTimeTimer(next);\n            alarm.update(next);\n        }\n\n        @Override\n        public void onTimer(long timestamp, OnTimerContext ctx, Collector<String> out) throws Exception {\n            out.collect(\"idle \" + ctx.getCurrentKey() + \" orders=\" + orders.value() + \" cents=\" + cents.value());\n            alarm.clear();\n        }\n    }\n}",
  "sql/backend_hashmapfalse.sql": "SET 'parallelism.default' = '1';\nSET 'execution.checkpointing.interval' = '3 s';\nSET 'state.backend.type' = 'hashmap';\nSET 'execution.checkpointing.incremental' = 'false';\nCREATE TEMPORARY TABLE orders (order_id BIGINT, store_id STRING, note STRING, pt AS PROCTIME())\nWITH ('connector' = 'datagen', 'rows-per-second' = '2000', 'fields.order_id.kind' = 'sequence', 'fields.order_id.start' = '1', 'fields.order_id.end' = '400000',\n      'fields.store_id.length' = '3', 'fields.note.length' = '50');\nCREATE TEMPORARY TABLE firsts (order_id BIGINT, store_id STRING, note STRING) WITH ('connector' = 'blackhole');\nINSERT INTO firsts SELECT order_id, store_id, note FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY pt) AS rn FROM orders) WHERE rn = 1;",
  "sql/backend_rocksdbfalse.sql": "SET 'parallelism.default' = '1';\nSET 'execution.checkpointing.interval' = '3 s';\nSET 'state.backend.type' = 'rocksdb';\nSET 'execution.checkpointing.incremental' = 'false';\nCREATE TEMPORARY TABLE orders (order_id BIGINT, store_id STRING, note STRING, pt AS PROCTIME())\nWITH ('connector' = 'datagen', 'rows-per-second' = '2000', 'fields.order_id.kind' = 'sequence', 'fields.order_id.start' = '1', 'fields.order_id.end' = '400000',\n      'fields.store_id.length' = '3', 'fields.note.length' = '50');\nCREATE TEMPORARY TABLE firsts (order_id BIGINT, store_id STRING, note STRING) WITH ('connector' = 'blackhole');\nINSERT INTO firsts SELECT order_id, store_id, note FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY pt) AS rn FROM orders) WHERE rn = 1;",
  "sql/backend_rocksdbtrue.sql": "SET 'parallelism.default' = '1';\nSET 'execution.checkpointing.interval' = '3 s';\nSET 'state.backend.type' = 'rocksdb';\nSET 'execution.checkpointing.incremental' = 'true';\nCREATE TEMPORARY TABLE orders (order_id BIGINT, store_id STRING, note STRING, pt AS PROCTIME())\nWITH ('connector' = 'datagen', 'rows-per-second' = '2000', 'fields.order_id.kind' = 'sequence', 'fields.order_id.start' = '1', 'fields.order_id.end' = '400000',\n      'fields.store_id.length' = '3', 'fields.note.length' = '50');\nCREATE TEMPORARY TABLE firsts (order_id BIGINT, store_id STRING, note STRING) WITH ('connector' = 'blackhole');\nINSERT INTO firsts SELECT order_id, store_id, note FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY pt) AS rn FROM orders) WHERE rn = 1;",
  "sql/cdc_direct_default.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nSET 'execution.checkpointing.interval' = '5 s';\nCREATE TEMPORARY TABLE pg_orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, PRIMARY KEY (order_id) NOT ENFORCED) WITH ('connector' = 'postgres-cdc', 'hostname' = 'localhost', 'port' = '5432', 'username' = 'postgres', 'password' = 'not-a-real-password', 'database-name' = 'brewline', 'schema-name' = 'public', 'table-name' = 'orders', 'slot.name' = 'flink_slot', 'decoding.plugin.name' = 'pgoutput', 'scan.incremental.snapshot.enabled' = 'false');\nCREATE TEMPORARY TABLE shown (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, PRIMARY KEY (order_id) NOT ENFORCED) WITH ('connector' = 'print');\nINSERT INTO shown SELECT * FROM pg_orders;",
  "sql/cdc_direct_full.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nSET 'execution.checkpointing.interval' = '5 s';\nCREATE TEMPORARY TABLE pg_orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, PRIMARY KEY (order_id) NOT ENFORCED) WITH ('connector' = 'postgres-cdc', 'hostname' = 'localhost', 'port' = '5432', 'username' = 'postgres', 'password' = 'not-a-real-password', 'database-name' = 'brewline', 'schema-name' = 'public', 'table-name' = 'orders', 'slot.name' = 'flink_slot', 'decoding.plugin.name' = 'pgoutput', 'scan.incremental.snapshot.enabled' = 'false');\nCREATE TEMPORARY TABLE shown (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, PRIMARY KEY (order_id) NOT ENFORCED) WITH ('connector' = 'print');\nINSERT INTO shown SELECT * FROM pg_orders;",
  "sql/cdc_direct_upsert.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nSET 'execution.checkpointing.interval' = '5 s';\nCREATE TEMPORARY TABLE pg_orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, PRIMARY KEY (order_id) NOT ENFORCED) WITH ('connector' = 'postgres-cdc', 'hostname' = 'localhost', 'port' = '5432', 'username' = 'postgres', 'password' = 'not-a-real-password', 'database-name' = 'brewline', 'schema-name' = 'public', 'table-name' = 'orders', 'slot.name' = 'flink_slot', 'decoding.plugin.name' = 'pgoutput', 'scan.incremental.snapshot.enabled' = 'false', 'changelog-mode' = 'upsert');\nCREATE TEMPORARY TABLE shown (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, PRIMARY KEY (order_id) NOT ENFORCED) WITH ('connector' = 'print');\nINSERT INTO shown SELECT * FROM pg_orders;",
  "sql/cdc_explain_default.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE pg_orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, PRIMARY KEY (order_id) NOT ENFORCED) WITH ('connector' = 'postgres-cdc', 'hostname' = 'localhost', 'port' = '5432', 'username' = 'postgres', 'password' = 'not-a-real-password', 'database-name' = 'brewline', 'schema-name' = 'public', 'table-name' = 'orders', 'slot.name' = 'flink_slot', 'decoding.plugin.name' = 'pgoutput', 'scan.incremental.snapshot.enabled' = 'false');\nEXPLAIN CHANGELOG_MODE SELECT * FROM pg_orders;",
  "sql/cdc_explain_full.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE pg_orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, PRIMARY KEY (order_id) NOT ENFORCED) WITH ('connector' = 'postgres-cdc', 'hostname' = 'localhost', 'port' = '5432', 'username' = 'postgres', 'password' = 'not-a-real-password', 'database-name' = 'brewline', 'schema-name' = 'public', 'table-name' = 'orders', 'slot.name' = 'flink_slot', 'decoding.plugin.name' = 'pgoutput', 'scan.incremental.snapshot.enabled' = 'false');\nEXPLAIN CHANGELOG_MODE SELECT * FROM pg_orders;",
  "sql/cdc_explain_upsert.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE pg_orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, PRIMARY KEY (order_id) NOT ENFORCED) WITH ('connector' = 'postgres-cdc', 'hostname' = 'localhost', 'port' = '5432', 'username' = 'postgres', 'password' = 'not-a-real-password', 'database-name' = 'brewline', 'schema-name' = 'public', 'table-name' = 'orders', 'slot.name' = 'flink_slot', 'decoding.plugin.name' = 'pgoutput', 'scan.incremental.snapshot.enabled' = 'false', 'changelog-mode' = 'upsert');\nEXPLAIN CHANGELOG_MODE SELECT * FROM pg_orders;",
  "sql/connect_earliest-offset.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, channel STRING) WITH ('connector' = 'kafka', 'topic' = 'orders_c', 'properties.bootstrap.servers' = 'localhost:9092', 'properties.group.id' = 'connect', 'format' = 'json', 'scan.bounded.mode' = 'latest-offset', 'scan.startup.mode' = 'earliest-offset');\nSELECT COUNT(*) AS rows_read FROM orders;",
  "sql/connect_files.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nSET 'execution.checkpointing.interval' = '8 s';\nCREATE TEMPORARY TABLE src (order_id BIGINT, store_id STRING, total_cents INT) WITH ('connector' = 'datagen', 'rows-per-second' = '20', 'fields.order_id.min' = '1', 'fields.order_id.max' = '1000000', 'fields.store_id.length' = '2', 'fields.total_cents.min' = '300', 'fields.total_cents.max' = '800');\nCREATE TEMPORARY TABLE sink (order_id BIGINT, store_id STRING, total_cents INT) WITH ('connector' = 'filesystem', 'path' = 'file:///data/out', 'format' = 'csv');\nINSERT INTO sink SELECT * FROM src;",
  "sql/connect_latest-offset.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, channel STRING) WITH ('connector' = 'kafka', 'topic' = 'orders_c', 'properties.bootstrap.servers' = 'localhost:9092', 'properties.group.id' = 'connect', 'format' = 'json', 'scan.bounded.mode' = 'latest-offset', 'scan.startup.mode' = 'latest-offset');\nSELECT COUNT(*) AS rows_read FROM orders;",
  "sql/connect_meta.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, channel STRING, part INT METADATA FROM 'partition' VIRTUAL, off BIGINT METADATA FROM 'offset' VIRTUAL, kts TIMESTAMP_LTZ(3) METADATA FROM 'timestamp' VIRTUAL) WITH ('connector' = 'kafka', 'topic' = 'orders_c', 'properties.bootstrap.servers' = 'localhost:9092', 'properties.group.id' = 'connect', 'format' = 'json', 'scan.bounded.mode' = 'latest-offset', 'scan.startup.mode' = 'earliest-offset');\nSET 'table.local-time-zone' = 'UTC';\nSELECT order_id, store_id, part, off, kts FROM orders WHERE order_id <= 6;",
  "sql/connect_specific-offsets.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, channel STRING) WITH ('connector' = 'kafka', 'topic' = 'orders_c', 'properties.bootstrap.servers' = 'localhost:9092', 'properties.group.id' = 'connect', 'format' = 'json', 'scan.bounded.mode' = 'latest-offset', 'scan.startup.specific-offsets' = 'partition:0,offset:1;partition:1,offset:7', 'scan.startup.mode' = 'specific-offsets');\nSELECT COUNT(*) AS rows_read FROM orders;",
  "sql/connect_timestamp.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, channel STRING) WITH ('connector' = 'kafka', 'topic' = 'orders_c', 'properties.bootstrap.servers' = 'localhost:9092', 'properties.group.id' = 'connect', 'format' = 'json', 'scan.bounded.mode' = 'latest-offset', 'scan.startup.timestamp-millis' = '1767225606000', 'scan.startup.mode' = 'timestamp');\nSELECT COUNT(*) AS rows_read FROM orders;",
  "sql/connect_upsert.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, channel STRING) WITH ('connector' = 'filesystem', 'path' = 'file:///data/orders12.jsonl', 'format' = 'json');\nCREATE TEMPORARY TABLE stores_per_count (n BIGINT, stores BIGINT, PRIMARY KEY (n) NOT ENFORCED) WITH ('connector' = 'upsert-kafka', 'topic' = 'stores_per_count', 'properties.bootstrap.servers' = 'localhost:9092', 'key.format' = 'json', 'value.format' = 'json');\nINSERT INTO stores_per_count SELECT n, COUNT(*) AS stores FROM (SELECT store_id, COUNT(*) AS n FROM orders GROUP BY store_id) GROUP BY n;",
  "sql/copy_alo.sql": "SET 'parallelism.default' = '1';\nSET 'execution.checkpointing.interval' = '6 s';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, total_cents INT) WITH ('connector' = 'kafka', 'topic' = 'orders_alo', 'properties.bootstrap.servers' = 'localhost:9092',\n  'properties.group.id' = 'copy-alo', 'scan.startup.mode' = 'earliest-offset', 'format' = 'json');\nCREATE TEMPORARY TABLE orders_copy (order_id INT, store_id STRING, total_cents INT) WITH ('connector' = 'kafka', 'topic' = 'copy_alo', 'properties.bootstrap.servers' = 'localhost:9092',\n  'format' = 'json', 'sink.delivery-guarantee' = 'at-least-once');\nINSERT INTO orders_copy SELECT order_id, store_id, total_cents FROM orders;",
  "sql/copy_eo.sql": "SET 'parallelism.default' = '1';\nSET 'execution.checkpointing.interval' = '6 s';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, total_cents INT) WITH ('connector' = 'kafka', 'topic' = 'orders_eo', 'properties.bootstrap.servers' = 'localhost:9092',\n  'properties.group.id' = 'copy-eo', 'scan.startup.mode' = 'earliest-offset', 'format' = 'json');\nCREATE TEMPORARY TABLE orders_copy (order_id INT, store_id STRING, total_cents INT) WITH ('connector' = 'kafka', 'topic' = 'copy_eo', 'properties.bootstrap.servers' = 'localhost:9092',\n  'format' = 'json', 'sink.delivery-guarantee' = 'exactly-once', 'sink.transactional-id-prefix' = 'copy-eo', 'properties.transaction.timeout.ms' = '120000');\nINSERT INTO orders_copy SELECT order_id, store_id, total_cents FROM orders;",
  "sql/joins_dedup_first.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, channel STRING, pt AS PROCTIME()) WITH ('connector' = 'filesystem', 'path' = 'file:///data/dup8.jsonl', 'format' = 'json');\nSELECT order_id, store_id, total_cents, status FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY pt ASC) AS rn FROM orders) WHERE rn = 1;",
  "sql/joins_dedup_last.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, channel STRING, pt AS PROCTIME()) WITH ('connector' = 'filesystem', 'path' = 'file:///data/dup8.jsonl', 'format' = 'json');\nSELECT order_id, store_id, total_cents, status FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY pt DESC) AS rn FROM orders) WHERE rn = 1;",
  "sql/joins_ex1.sql": "SET 'parallelism.default' = '1';\nSET 'execution.checkpointing.interval' = '2 s';\nCREATE TEMPORARY TABLE orders (order_id BIGINT, store_id STRING, total_cents INT, note STRING, ot AS PROCTIME())\nWITH ('connector' = 'datagen', 'rows-per-second' = '200', 'fields.order_id.kind' = 'sequence', 'fields.order_id.start' = '1', 'fields.order_id.end' = '100000',\n      'fields.store_id.length' = '3', 'fields.total_cents.min' = '300', 'fields.total_cents.max' = '800', 'fields.note.length' = '100');\nCREATE TEMPORARY TABLE payments (order_id BIGINT, how_paid STRING, pt AS PROCTIME())\nWITH ('connector' = 'datagen', 'rows-per-second' = '200', 'fields.order_id.kind' = 'sequence', 'fields.order_id.start' = '1', 'fields.order_id.end' = '100000', 'fields.how_paid.length' = '4');\nCREATE TEMPORARY TABLE joined (order_id BIGINT, note STRING, how_paid STRING) WITH ('connector' = 'blackhole');\nEXPLAIN SELECT o.order_id, o.note, p.how_paid FROM orders o JOIN payments p ON o.order_id = p.order_id;",
  "sql/joins_ex2.sql": "SET 'parallelism.default' = '1';\nSET 'execution.checkpointing.interval' = '2 s';\nCREATE TEMPORARY TABLE orders (order_id BIGINT, store_id STRING, total_cents INT, note STRING, ot AS PROCTIME())\nWITH ('connector' = 'datagen', 'rows-per-second' = '200', 'fields.order_id.kind' = 'sequence', 'fields.order_id.start' = '1', 'fields.order_id.end' = '100000',\n      'fields.store_id.length' = '3', 'fields.total_cents.min' = '300', 'fields.total_cents.max' = '800', 'fields.note.length' = '100');\nCREATE TEMPORARY TABLE payments (order_id BIGINT, how_paid STRING, pt AS PROCTIME())\nWITH ('connector' = 'datagen', 'rows-per-second' = '200', 'fields.order_id.kind' = 'sequence', 'fields.order_id.start' = '1', 'fields.order_id.end' = '100000', 'fields.how_paid.length' = '4');\nCREATE TEMPORARY TABLE joined (order_id BIGINT, note STRING, how_paid STRING) WITH ('connector' = 'blackhole');\nEXPLAIN SELECT o.order_id, o.note, p.how_paid FROM orders o JOIN payments p ON o.order_id = p.order_id AND o.ot BETWEEN p.pt - INTERVAL '5' SECOND AND p.pt + INTERVAL '5' SECOND;",
  "sql/joins_ex3.sql": "CREATE TEMPORARY TABLE orders (order_id BIGINT, note STRING, ot TIMESTAMP(3))\nWITH ('connector' = 'datagen', 'rows-per-second' = '200', 'fields.order_id.kind' = 'sequence', 'fields.order_id.start' = '1', 'fields.order_id.end' = '100000', 'fields.note.length' = '100');\nCREATE TEMPORARY TABLE payments (order_id BIGINT, how_paid STRING, pt TIMESTAMP(3))\nWITH ('connector' = 'datagen', 'rows-per-second' = '200', 'fields.order_id.kind' = 'sequence', 'fields.order_id.start' = '1', 'fields.order_id.end' = '100000', 'fields.how_paid.length' = '4');\nEXPLAIN SELECT o.order_id, o.note, p.how_paid FROM orders o JOIN payments p ON o.order_id = p.order_id AND o.ot BETWEEN p.pt - INTERVAL '5' SECOND AND p.pt + INTERVAL '5' SECOND;",
  "sql/joins_interval.sql": "SET 'parallelism.default' = '1';\nSET 'execution.checkpointing.interval' = '2 s';\nCREATE TEMPORARY TABLE orders (order_id BIGINT, store_id STRING, total_cents INT, note STRING, ot AS PROCTIME())\nWITH ('connector' = 'datagen', 'rows-per-second' = '200', 'fields.order_id.kind' = 'sequence', 'fields.order_id.start' = '1', 'fields.order_id.end' = '100000',\n      'fields.store_id.length' = '3', 'fields.total_cents.min' = '300', 'fields.total_cents.max' = '800', 'fields.note.length' = '100');\nCREATE TEMPORARY TABLE payments (order_id BIGINT, how_paid STRING, pt AS PROCTIME())\nWITH ('connector' = 'datagen', 'rows-per-second' = '200', 'fields.order_id.kind' = 'sequence', 'fields.order_id.start' = '1', 'fields.order_id.end' = '100000', 'fields.how_paid.length' = '4');\nCREATE TEMPORARY TABLE joined (order_id BIGINT, note STRING, how_paid STRING) WITH ('connector' = 'blackhole');\nINSERT INTO joined SELECT o.order_id, o.note, p.how_paid FROM orders o JOIN payments p ON o.order_id = p.order_id AND o.ot BETWEEN p.pt - INTERVAL '5' SECOND AND p.pt + INTERVAL '5' SECOND;",
  "sql/joins_regular.sql": "SET 'parallelism.default' = '1';\nSET 'execution.checkpointing.interval' = '2 s';\nCREATE TEMPORARY TABLE orders (order_id BIGINT, store_id STRING, total_cents INT, note STRING, ot AS PROCTIME())\nWITH ('connector' = 'datagen', 'rows-per-second' = '200', 'fields.order_id.kind' = 'sequence', 'fields.order_id.start' = '1', 'fields.order_id.end' = '100000',\n      'fields.store_id.length' = '3', 'fields.total_cents.min' = '300', 'fields.total_cents.max' = '800', 'fields.note.length' = '100');\nCREATE TEMPORARY TABLE payments (order_id BIGINT, how_paid STRING, pt AS PROCTIME())\nWITH ('connector' = 'datagen', 'rows-per-second' = '200', 'fields.order_id.kind' = 'sequence', 'fields.order_id.start' = '1', 'fields.order_id.end' = '100000', 'fields.how_paid.length' = '4');\nCREATE TEMPORARY TABLE joined (order_id BIGINT, note STRING, how_paid STRING) WITH ('connector' = 'blackhole');\nINSERT INTO joined SELECT o.order_id, o.note, p.how_paid FROM orders o JOIN payments p ON o.order_id = p.order_id;",
  "sql/joins_ttl.sql": "SET 'parallelism.default' = '1';\nSET 'execution.checkpointing.interval' = '2 s';\nSET 'table.exec.state.ttl' = '10 s';\nCREATE TEMPORARY TABLE orders (order_id BIGINT, store_id STRING, total_cents INT, note STRING, ot AS PROCTIME())\nWITH ('connector' = 'datagen', 'rows-per-second' = '200', 'fields.order_id.kind' = 'sequence', 'fields.order_id.start' = '1', 'fields.order_id.end' = '100000',\n      'fields.store_id.length' = '3', 'fields.total_cents.min' = '300', 'fields.total_cents.max' = '800', 'fields.note.length' = '100');\nCREATE TEMPORARY TABLE payments (order_id BIGINT, how_paid STRING, pt AS PROCTIME())\nWITH ('connector' = 'datagen', 'rows-per-second' = '200', 'fields.order_id.kind' = 'sequence', 'fields.order_id.start' = '1', 'fields.order_id.end' = '100000', 'fields.how_paid.length' = '4');\nCREATE TEMPORARY TABLE joined (order_id BIGINT, note STRING, how_paid STRING) WITH ('connector' = 'blackhole');\nINSERT INTO joined SELECT o.order_id, o.note, p.how_paid FROM orders o JOIN payments p ON o.order_id = p.order_id;",
  "sql/refused_file.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, channel STRING)\nWITH ('connector' = 'filesystem', 'path' = 'file:///data/orders12.jsonl', 'format' = 'json');\nCREATE TEMPORARY TABLE counts_file (store_id STRING, n BIGINT) WITH ('connector' = 'filesystem', 'path' = 'file://<work>/out', 'format' = 'csv');\nINSERT INTO counts_file SELECT store_id, COUNT(*) AS n FROM orders GROUP BY store_id;",
  "sql/refused_method.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, channel STRING)\nWITH ('connector' = 'filesystem', 'path' = 'file:///data/orders12.jsonl', 'format' = 'json');\nCREATE TEMPORARY TABLE payments (order_id INT, method STRING) WITH ('connector' = 'datagen');",
  "sql/refused_nokey.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, channel STRING)\nWITH ('connector' = 'filesystem', 'path' = 'file:///data/orders12.jsonl', 'format' = 'json');\nCREATE TEMPORARY TABLE counts (store_id STRING, n BIGINT) WITH ('connector' = 'upsert-kafka', 'topic' = 'counts', 'properties.bootstrap.servers' = 'localhost:9092', 'key.format' = 'json', 'value.format' = 'json');\nINSERT INTO counts SELECT store_id, COUNT(*) AS n FROM orders GROUP BY store_id;",
  "sql/refused_window.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, channel STRING)\nWITH ('connector' = 'filesystem', 'path' = 'file:///data/orders12.jsonl', 'format' = 'json');\nCREATE TEMPORARY TABLE ev (order_id INT, total_cents INT, ts TIMESTAMP(3)) WITH ('connector' = 'datagen');\nSELECT window_start, COUNT(*) FROM TABLE(TUMBLE(TABLE ev, DESCRIPTOR(ts), INTERVAL '1' MINUTE)) GROUP BY window_start, window_end;",
  "sql/sp_1.sql": "SET 'parallelism.default' = '2';\nSET 'execution.checkpointing.interval' = '3 s';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, total_cents INT) WITH ('connector' = 'kafka', 'topic' = 'orders_d', 'properties.bootstrap.servers' = 'localhost:9092',\n  'properties.group.id' = 'd1', 'scan.startup.mode' = 'earliest-offset', 'format' = 'json');\nCREATE TEMPORARY TABLE store_totals (store_id STRING, n BIGINT, cents BIGINT, PRIMARY KEY (store_id) NOT ENFORCED) WITH ('connector' = 'upsert-kafka', 'topic' = 'totals_d',\n  'properties.bootstrap.servers' = 'localhost:9092', 'key.format' = 'json', 'value.format' = 'json');\nINSERT INTO store_totals SELECT store_id, COUNT(*) AS n, SUM(total_cents) AS cents FROM orders GROUP BY store_id;",
  "sql/sp_2.sql": "SET 'parallelism.default' = '3';\nSET 'execution.checkpointing.interval' = '3 s';\nSET 'execution.state-recovery.path' = 'file:<work>/savepoints/savepoint-f66754-d90b9c8865b9';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, total_cents INT) WITH ('connector' = 'kafka', 'topic' = 'orders_d', 'properties.bootstrap.servers' = 'localhost:9092',\n  'properties.group.id' = 'd2', 'scan.startup.mode' = 'earliest-offset', 'format' = 'json');\nCREATE TEMPORARY TABLE store_totals (store_id STRING, n BIGINT, cents BIGINT, PRIMARY KEY (store_id) NOT ENFORCED) WITH ('connector' = 'upsert-kafka', 'topic' = 'totals_d',\n  'properties.bootstrap.servers' = 'localhost:9092', 'key.format' = 'json', 'value.format' = 'json');\nINSERT INTO store_totals SELECT store_id, COUNT(*) AS n, SUM(total_cents) AS cents FROM orders GROUP BY store_id;",
  "sql/sp_3.sql": "SET 'parallelism.default' = '2';\nSET 'execution.checkpointing.interval' = '3 s';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, total_cents INT) WITH ('connector' = 'kafka', 'topic' = 'orders_d', 'properties.bootstrap.servers' = 'localhost:9092',\n  'properties.group.id' = 'd3', 'scan.startup.mode' = 'latest-offset', 'format' = 'json');\nCREATE TEMPORARY TABLE store_totals (store_id STRING, n BIGINT, cents BIGINT, PRIMARY KEY (store_id) NOT ENFORCED) WITH ('connector' = 'upsert-kafka', 'topic' = 'totals_d3',\n  'properties.bootstrap.servers' = 'localhost:9092', 'key.format' = 'json', 'value.format' = 'json');\nINSERT INTO store_totals SELECT store_id, COUNT(*) AS n, SUM(total_cents) AS cents FROM orders GROUP BY store_id;",
  "sql/sp_4.sql": "SET 'parallelism.default' = '2';\nSET 'execution.checkpointing.interval' = '3 s';\nSET 'execution.state-recovery.path' = 'file:<work>/savepoints/savepoint-f66754-d90b9c8865b9';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, total_cents INT) WITH ('connector' = 'kafka', 'topic' = 'orders_d', 'properties.bootstrap.servers' = 'localhost:9092',\n  'properties.group.id' = 'd4', 'scan.startup.mode' = 'earliest-offset', 'format' = 'json');\nCREATE TEMPORARY TABLE store_totals (store_id STRING, n BIGINT, cents BIGINT, biggest INT, PRIMARY KEY (store_id) NOT ENFORCED) WITH ('connector' = 'upsert-kafka', 'topic' = 'totals_d',\n  'properties.bootstrap.servers' = 'localhost:9092', 'key.format' = 'json', 'value.format' = 'json');\nINSERT INTO store_totals SELECT store_id, COUNT(*) AS n, SUM(total_cents) AS cents, MAX(total_cents) AS biggest FROM orders GROUP BY store_id;",
  "sql/sql_append.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, channel STRING)\nWITH ('connector' = 'filesystem', 'path' = 'file:///data/orders12.jsonl', 'format' = 'json');\nSELECT order_id, store_id, total_cents FROM orders WHERE status = 'refunded';",
  "sql/sql_batch.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'batch';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, channel STRING)\nWITH ('connector' = 'filesystem', 'path' = 'file:///data/orders12.jsonl', 'format' = 'json');\nSELECT store_id, COUNT(*) AS n, SUM(total_cents) AS cents FROM orders GROUP BY store_id;",
  "sql/sql_explain.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, channel STRING)\nWITH ('connector' = 'filesystem', 'path' = 'file:///data/orders12.jsonl', 'format' = 'json');\nEXPLAIN CHANGELOG_MODE SELECT n, COUNT(*) AS stores FROM (SELECT store_id, COUNT(*) AS n FROM orders GROUP BY store_id) GROUP BY n;",
  "sql/sql_help.sql": "HELP;",
  "sql/sql_minibatch.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, channel STRING)\nWITH ('connector' = 'filesystem', 'path' = 'file:///data/orders12.jsonl', 'format' = 'json');\nSET 'table.exec.mini-batch.enabled' = 'true';\nSET 'table.exec.mini-batch.allow-latency' = '1 h';\nSET 'table.exec.mini-batch.size' = '4';\nSELECT store_id, COUNT(*) AS n, SUM(total_cents) AS cents FROM orders GROUP BY store_id;",
  "sql/sql_print.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, channel STRING)\nWITH ('connector' = 'filesystem', 'path' = 'file:///data/orders12.jsonl', 'format' = 'json');\nCREATE TEMPORARY TABLE per_store (store_id STRING, n BIGINT, cents BIGINT, PRIMARY KEY (store_id) NOT ENFORCED) WITH ('connector' = 'print');\nINSERT INTO per_store SELECT store_id, COUNT(*) AS n, SUM(total_cents) AS cents FROM orders GROUP BY store_id;",
  "sql/sql_stream.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, channel STRING)\nWITH ('connector' = 'filesystem', 'path' = 'file:///data/orders12.jsonl', 'format' = 'json');\nSELECT store_id, COUNT(*) AS n, SUM(total_cents) AS cents FROM orders GROUP BY store_id;",
  "sql/sql_two.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, channel STRING)\nWITH ('connector' = 'filesystem', 'path' = 'file:///data/orders12.jsonl', 'format' = 'json');\nSELECT n, COUNT(*) AS stores FROM (SELECT store_id, COUNT(*) AS n FROM orders GROUP BY store_id) GROUP BY n;",
  "sql/sql_two_batch.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'batch';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, customer_id INT, total_cents INT, status STRING, channel STRING)\nWITH ('connector' = 'filesystem', 'path' = 'file:///data/orders12.jsonl', 'format' = 'json');\nSELECT n, COUNT(*) AS stores FROM (SELECT store_id, COUNT(*) AS n FROM orders GROUP BY store_id) GROUP BY n;",
  "sql/state_a.sql": "SET 'parallelism.default' = '2';\nSET 'execution.checkpointing.interval' = '3 s';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, total_cents INT) WITH ('connector' = 'kafka', 'topic' = 'orders_a', 'properties.bootstrap.servers' = 'localhost:9092',\n  'properties.group.id' = 'state', 'scan.startup.mode' = 'earliest-offset', 'format' = 'json');\nCREATE TEMPORARY TABLE store_totals (store_id STRING, n BIGINT, cents BIGINT, PRIMARY KEY (store_id) NOT ENFORCED) WITH ('connector' = 'upsert-kafka', 'topic' = 'totals_a',\n  'properties.bootstrap.servers' = 'localhost:9092', 'key.format' = 'json', 'value.format' = 'json');\nINSERT INTO store_totals SELECT store_id, COUNT(*) AS n, SUM(total_cents) AS cents FROM orders GROUP BY store_id;",
  "sql/state_b.sql": "SET 'parallelism.default' = '2';\nCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, total_cents INT) WITH ('connector' = 'kafka', 'topic' = 'orders_b', 'properties.bootstrap.servers' = 'localhost:9092',\n  'properties.group.id' = 'state', 'scan.startup.mode' = 'earliest-offset', 'format' = 'json');\nCREATE TEMPORARY TABLE store_totals (store_id STRING, n BIGINT, cents BIGINT, PRIMARY KEY (store_id) NOT ENFORCED) WITH ('connector' = 'upsert-kafka', 'topic' = 'totals_b',\n  'properties.bootstrap.servers' = 'localhost:9092', 'key.format' = 'json', 'value.format' = 'json');\nINSERT INTO store_totals SELECT store_id, COUNT(*) AS n, SUM(total_cents) AS cents FROM orders GROUP BY store_id;",
  "sql/time_cumulate.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE events (order_id INT, store_id STRING, total_cents INT, ts TIMESTAMP(3), WATERMARK FOR ts AS ts - INTERVAL '200' SECOND(3))\nWITH ('connector' = 'filesystem', 'path' = 'file:///data/events14.jsonl', 'format' = 'json', 'json.timestamp-format.standard' = 'SQL');\nSELECT window_start, window_end, COUNT(*) AS orders FROM TABLE(CUMULATE(TABLE events, DESCRIPTOR(ts), INTERVAL '20' SECOND, INTERVAL '1' MINUTE))\nGROUP BY window_start, window_end;",
  "sql/time_hop.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE events (order_id INT, store_id STRING, total_cents INT, ts TIMESTAMP(3), WATERMARK FOR ts AS ts - INTERVAL '200' SECOND(3))\nWITH ('connector' = 'filesystem', 'path' = 'file:///data/events14.jsonl', 'format' = 'json', 'json.timestamp-format.standard' = 'SQL');\nSELECT window_start, window_end, COUNT(*) AS orders FROM TABLE(HOP(TABLE events, DESCRIPTOR(ts), INTERVAL '30' SECOND, INTERVAL '1' MINUTE))\nGROUP BY window_start, window_end;",
  "sql/time_idle_paced.sql": "SET 'parallelism.default' = '1';\nSET 'table.exec.source.idle-timeout' = '3 s';\nCREATE TEMPORARY TABLE events (order_id INT, store_id STRING, total_cents INT, ts TIMESTAMP(3), WATERMARK FOR ts AS ts - INTERVAL '10' SECOND(3)) WITH ('connector' = 'kafka', 'topic' = 'events_paced', 'properties.bootstrap.servers' = 'localhost:9092', 'properties.group.id' = 'paced', 'scan.startup.mode' = 'earliest-offset', 'format' = 'json', 'json.timestamp-format.standard' = 'SQL');\nCREATE TEMPORARY TABLE shown (window_start TIMESTAMP(3), window_end TIMESTAMP(3), orders BIGINT) WITH ('connector' = 'print');\nINSERT INTO shown SELECT window_start, window_end, COUNT(*) FROM TABLE(TUMBLE(TABLE events, DESCRIPTOR(ts), INTERVAL '1' MINUTE)) GROUP BY window_start, window_end;",
  "sql/time_idle_with.sql": "SET 'parallelism.default' = '1';\nSET 'table.exec.source.idle-timeout' = '3 s';\nCREATE TEMPORARY TABLE events (order_id INT, store_id STRING, total_cents INT, ts TIMESTAMP(3), WATERMARK FOR ts AS ts - INTERVAL '10' SECOND(3)) WITH ('connector' = 'kafka', 'topic' = 'events_idle', 'properties.bootstrap.servers' = 'localhost:9092', 'properties.group.id' = 'idle', 'scan.startup.mode' = 'earliest-offset', 'format' = 'json', 'json.timestamp-format.standard' = 'SQL');\nCREATE TEMPORARY TABLE shown (window_start TIMESTAMP(3), window_end TIMESTAMP(3), orders BIGINT) WITH ('connector' = 'print');\nINSERT INTO shown SELECT window_start, window_end, COUNT(*) FROM TABLE(TUMBLE(TABLE events, DESCRIPTOR(ts), INTERVAL '1' MINUTE)) GROUP BY window_start, window_end;",
  "sql/time_idle_without.sql": "SET 'parallelism.default' = '1';\nCREATE TEMPORARY TABLE events (order_id INT, store_id STRING, total_cents INT, ts TIMESTAMP(3), WATERMARK FOR ts AS ts - INTERVAL '10' SECOND(3)) WITH ('connector' = 'kafka', 'topic' = 'events_idle', 'properties.bootstrap.servers' = 'localhost:9092', 'properties.group.id' = 'idle', 'scan.startup.mode' = 'earliest-offset', 'format' = 'json', 'json.timestamp-format.standard' = 'SQL');\nCREATE TEMPORARY TABLE shown (window_start TIMESTAMP(3), window_end TIMESTAMP(3), orders BIGINT) WITH ('connector' = 'print');\nINSERT INTO shown SELECT window_start, window_end, COUNT(*) FROM TABLE(TUMBLE(TABLE events, DESCRIPTOR(ts), INTERVAL '1' MINUTE)) GROUP BY window_start, window_end;",
  "sql/time_session.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE events (order_id INT, store_id STRING, total_cents INT, ts TIMESTAMP(3), WATERMARK FOR ts AS ts - INTERVAL '200' SECOND(3))\nWITH ('connector' = 'filesystem', 'path' = 'file:///data/events14.jsonl', 'format' = 'json', 'json.timestamp-format.standard' = 'SQL');\nSELECT store_id, window_start, window_end, COUNT(*) AS orders\nFROM TABLE(SESSION(TABLE events PARTITION BY store_id, DESCRIPTOR(ts), INTERVAL '30' SECOND))\nGROUP BY store_id, window_start, window_end;",
  "sql/time_tumble_0.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE events (order_id INT, store_id STRING, total_cents INT, ts TIMESTAMP(3), WATERMARK FOR ts AS ts - INTERVAL '0' SECOND(3))\nWITH ('connector' = 'filesystem', 'path' = 'file:///data/events14.jsonl', 'format' = 'json', 'json.timestamp-format.standard' = 'SQL');\nSELECT window_start, window_end, COUNT(*) AS orders, SUM(total_cents) AS cents\nFROM TABLE(TUMBLE(TABLE events, DESCRIPTOR(ts), INTERVAL '1' MINUTE))\nGROUP BY window_start, window_end;",
  "sql/time_tumble_10.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE events (order_id INT, store_id STRING, total_cents INT, ts TIMESTAMP(3), WATERMARK FOR ts AS ts - INTERVAL '10' SECOND(3))\nWITH ('connector' = 'filesystem', 'path' = 'file:///data/events14.jsonl', 'format' = 'json', 'json.timestamp-format.standard' = 'SQL');\nSELECT window_start, window_end, COUNT(*) AS orders, SUM(total_cents) AS cents\nFROM TABLE(TUMBLE(TABLE events, DESCRIPTOR(ts), INTERVAL '1' MINUTE))\nGROUP BY window_start, window_end;",
  "sql/time_tumble_200.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE events (order_id INT, store_id STRING, total_cents INT, ts TIMESTAMP(3), WATERMARK FOR ts AS ts - INTERVAL '200' SECOND(3))\nWITH ('connector' = 'filesystem', 'path' = 'file:///data/events14.jsonl', 'format' = 'json', 'json.timestamp-format.standard' = 'SQL');\nSELECT window_start, window_end, COUNT(*) AS orders, SUM(total_cents) AS cents\nFROM TABLE(TUMBLE(TABLE events, DESCRIPTOR(ts), INTERVAL '1' MINUTE))\nGROUP BY window_start, window_end;",
  "sql/time_tumble_30.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE events (order_id INT, store_id STRING, total_cents INT, ts TIMESTAMP(3), WATERMARK FOR ts AS ts - INTERVAL '30' SECOND(3))\nWITH ('connector' = 'filesystem', 'path' = 'file:///data/events14.jsonl', 'format' = 'json', 'json.timestamp-format.standard' = 'SQL');\nSELECT window_start, window_end, COUNT(*) AS orders, SUM(total_cents) AS cents\nFROM TABLE(TUMBLE(TABLE events, DESCRIPTOR(ts), INTERVAL '1' MINUTE))\nGROUP BY window_start, window_end;",
  "sql/time_tumble_75.sql": "SET 'parallelism.default' = '1';\nSET 'sql-client.execution.result-mode' = 'tableau';\nSET 'execution.runtime-mode' = 'streaming';\nCREATE TEMPORARY TABLE events (order_id INT, store_id STRING, total_cents INT, ts TIMESTAMP(3), WATERMARK FOR ts AS ts - INTERVAL '75' SECOND(3))\nWITH ('connector' = 'filesystem', 'path' = 'file:///data/events14.jsonl', 'format' = 'json', 'json.timestamp-format.standard' = 'SQL');\nSELECT window_start, window_end, COUNT(*) AS orders, SUM(total_cents) AS cents\nFROM TABLE(TUMBLE(TABLE events, DESCRIPTOR(ts), INTERVAL '1' MINUTE))\nGROUP BY window_start, window_end;",
  "sql/world_explain.sql": "CREATE TEMPORARY TABLE orders (order_id BIGINT, store_id STRING, total_cents INT) WITH ('connector' = 'datagen');\nEXPLAIN SELECT store_id, count(*), sum(total_cents) FROM orders WHERE total_cents > 350 GROUP BY store_id;",
  "sql/world_p1.sql": "SET 'parallelism.default' = '1';\nCREATE TEMPORARY TABLE orders (order_id BIGINT, store_id STRING, total_cents INT)\nWITH ('connector' = 'datagen', 'rows-per-second' = '20', 'fields.order_id.min' = '1', 'fields.order_id.max' = '1000000',\n      'fields.store_id.length' = '1', 'fields.total_cents.min' = '300', 'fields.total_cents.max' = '800');\nCREATE TEMPORARY TABLE counts (store_id STRING, n BIGINT, cents BIGINT, PRIMARY KEY (store_id) NOT ENFORCED) WITH ('connector' = 'print');\nINSERT INTO counts SELECT store_id, count(*), sum(total_cents) FROM orders WHERE total_cents > 350 GROUP BY store_id;",
  "sql/world_p2.sql": "SET 'parallelism.default' = '2';\nCREATE TEMPORARY TABLE orders (order_id BIGINT, store_id STRING, total_cents INT)\nWITH ('connector' = 'datagen', 'rows-per-second' = '20', 'fields.order_id.min' = '1', 'fields.order_id.max' = '1000000',\n      'fields.store_id.length' = '1', 'fields.total_cents.min' = '300', 'fields.total_cents.max' = '800');\nCREATE TEMPORARY TABLE counts (store_id STRING, n BIGINT, cents BIGINT, PRIMARY KEY (store_id) NOT ENFORCED) WITH ('connector' = 'print');\nINSERT INTO counts SELECT store_id, count(*), sum(total_cents) FROM orders WHERE total_cents > 350 GROUP BY store_id;",
  "sql/world_p4.sql": "SET 'parallelism.default' = '4';\nCREATE TEMPORARY TABLE orders (order_id BIGINT, store_id STRING, total_cents INT)\nWITH ('connector' = 'datagen', 'rows-per-second' = '20', 'fields.order_id.min' = '1', 'fields.order_id.max' = '1000000',\n      'fields.store_id.length' = '1', 'fields.total_cents.min' = '300', 'fields.total_cents.max' = '800');\nCREATE TEMPORARY TABLE counts (store_id STRING, n BIGINT, cents BIGINT, PRIMARY KEY (store_id) NOT ENFORCED) WITH ('connector' = 'print');\nINSERT INTO counts SELECT store_id, count(*), sum(total_cents) FROM orders WHERE total_cents > 350 GROUP BY store_id;",
  "sql/world_p5.sql": "SET 'parallelism.default' = '5';\nCREATE TEMPORARY TABLE orders (order_id BIGINT, store_id STRING, total_cents INT)\nWITH ('connector' = 'datagen', 'rows-per-second' = '20', 'fields.order_id.min' = '1', 'fields.order_id.max' = '1000000',\n      'fields.store_id.length' = '1', 'fields.total_cents.min' = '300', 'fields.total_cents.max' = '800');\nCREATE TEMPORARY TABLE counts (store_id STRING, n BIGINT, cents BIGINT, PRIMARY KEY (store_id) NOT ENFORCED) WITH ('connector' = 'print');\nINSERT INTO counts SELECT store_id, count(*), sum(total_cents) FROM orders WHERE total_cents > 350 GROUP BY store_id;"
 },
 "meta": {
  "company": "Brewline",
  "confluent-kafka": "2.16.1",
  "flink": "2.2.1",
  "flink-cdc": "3.7.0-2.2",
  "java": "21.0.12.1",
  "kafka": "4.4.0",
  "kafka-connector": "5.0.0-2.2",
  "librdkafka": "2.16.0",
  "note": "Recorded by flink/verify/capture_flink.py: the real Apache Flink on this machine, a standalone cluster of one JobManager and two TaskManagers, made-up data. No network between the processes, no cloud.",
  "postgresql": "16.15",
  "python": "3.13.18"
 },
 "tables": {
  "connect.metadata": {
   "cols": [
    "order_id",
    "store_id",
    "partition",
    "offset",
    "Kafka timestamp"
   ],
   "rows": [
    [
     "1",
     "s01",
     "1",
     "0",
     "2026-01-01 00:00:00.000"
    ],
    [
     "2",
     "s02",
     "1",
     "1",
     "2026-01-01 00:00:01.000"
    ],
    [
     "3",
     "s07",
     "1",
     "2",
     "2026-01-01 00:00:02.000"
    ],
    [
     "4",
     "s01",
     "1",
     "3",
     "2026-01-01 00:00:03.000"
    ],
    [
     "5",
     "s04",
     "0",
     "0",
     "2026-01-01 00:00:04.000"
    ],
    [
     "6",
     "s11",
     "1",
     "4",
     "2026-01-01 00:00:05.000"
    ]
   ]
  },
  "connect.startup_modes": {
   "cols": [
    "scan.startup.mode",
    "where the source starts",
    "rows a query reads"
   ],
   "rows": [
    [
     "earliest-offset",
     "from the first record of every partition",
     12
    ],
    [
     "latest-offset",
     "from the end of every partition: only records that arrive later",
     0
    ],
    [
     "timestamp",
     "from the first record at or after 00:00:06 on every partition (the time of order 7)",
     6
    ],
    [
     "specific-offsets",
     "from the second to last record of each partition",
     4
    ]
   ]
  },
  "connect.upsert_topic": {
   "cols": [
    "offset",
    "key",
    "value"
   ],
   "rows": [
    [
     0,
     1,
     "{\"n\":1,\"stores\":1}"
    ],
    [
     1,
     1,
     "{\"n\":1,\"stores\":2}"
    ],
    [
     2,
     1,
     "{\"n\":1,\"stores\":3}"
    ],
    [
     3,
     1,
     "{\"n\":1,\"stores\":2}"
    ],
    [
     4,
     2,
     "{\"n\":2,\"stores\":1}"
    ],
    [
     5,
     1,
     "{\"n\":1,\"stores\":3}"
    ],
    [
     6,
     1,
     "{\"n\":1,\"stores\":4}"
    ],
    [
     7,
     2,
     "null (a tombstone)"
    ],
    [
     8,
     3,
     "{\"n\":3,\"stores\":1}"
    ],
    [
     9,
     1,
     "{\"n\":1,\"stores\":5}"
    ],
    [
     10,
     3,
     "null (a tombstone)"
    ],
    [
     11,
     4,
     "{\"n\":4,\"stores\":1}"
    ],
    [
     12,
     1,
     "{\"n\":1,\"stores\":4}"
    ],
    [
     13,
     2,
     "{\"n\":2,\"stores\":1}"
    ],
    [
     14,
     1,
     "{\"n\":1,\"stores\":5}"
    ],
    [
     15,
     4,
     "null (a tombstone)"
    ],
    [
     16,
     5,
     "{\"n\":5,\"stores\":1}"
    ]
   ]
  },
  "datastream.key_groups": {
   "cols": [
    "key",
    "key group (of 128)",
    "task, if parallelism is 2",
    "task, if parallelism is 3",
    "task, if parallelism is 4"
   ],
   "rows": [
    [
     "s01",
     4,
     0,
     0,
     0
    ],
    [
     "s02",
     85,
     1,
     1,
     2
    ],
    [
     "s03",
     101,
     1,
     2,
     3
    ],
    [
     "s04",
     0,
     0,
     0,
     0
    ],
    [
     "s05",
     33,
     0,
     0,
     1
    ],
    [
     "s06",
     70,
     1,
     1,
     2
    ],
    [
     "s07",
     49,
     0,
     1,
     1
    ],
    [
     "s08",
     43,
     0,
     1,
     1
    ],
    [
     "s09",
     72,
     1,
     1,
     2
    ],
    [
     "s10",
     31,
     0,
     0,
     0
    ],
    [
     "s11",
     90,
     1,
     2,
     2
    ],
    [
     "s12",
     65,
     1,
     1,
     2
    ]
   ]
  },
  "datastream.max_parallelism": {
   "cols": [
    "parallelism of the operator",
    "default maximum parallelism (key groups)"
   ],
   "rows": [
    [
     1,
     128
    ],
    [
     2,
     128
    ],
    [
     4,
     128
    ],
    [
     10,
     128
    ],
    [
     85,
     128
    ],
    [
     86,
     256
    ],
    [
     100,
     256
    ],
    [
     1000,
     2048
    ],
    [
     30000,
     32768
    ]
   ]
  },
  "datastream.orders_per_store": {
   "cols": [
    "store",
    "orders",
    "cents"
   ],
   "rows": [
    [
     "s01",
     407,
     234422
    ],
    [
     "s02",
     101,
     51262
    ],
    [
     "s03",
     91,
     43428
    ],
    [
     "s04",
     103,
     63425
    ],
    [
     "s05",
     92,
     54436
    ],
    [
     "s06",
     85,
     48341
    ],
    [
     "s07",
     75,
     40831
    ],
    [
     "s08",
     72,
     37718
    ],
    [
     "s09",
     59,
     30132
    ],
    [
     "s10",
     45,
     22050
    ],
    [
     "s11",
     41,
     19910
    ],
    [
     "s12",
     29,
     13845
    ]
   ]
  },
  "datastream.printed": {
   "cols": [
    "key",
    "line the sink printed",
    "task that held the key"
   ],
   "rows": [
    [
     "s01",
     "1> first order of s01 seen by subtask 0",
     0
    ],
    [
     "s02",
     "2> first order of s02 seen by subtask 1",
     1
    ],
    [
     "s03",
     "2> first order of s03 seen by subtask 1",
     1
    ],
    [
     "s04",
     "1> first order of s04 seen by subtask 0",
     0
    ]
   ]
  },
  "datastream.round_output": {
   "cols": [
    "line that the print sink wrote"
   ],
   "rows": [
    [
     "s01 passed 1000 cents with order 7, total 1233"
    ],
    [
     "s04 passed 1000 cents with order 10, total 1081"
    ]
   ]
  },
  "datastream.vertices": {
   "cols": [
    "vertex (operators chained inside it)",
    "parallelism",
    "records arrive by"
   ],
   "rows": [
    [
     "Source: orders -> parse",
     2,
     "a source"
    ],
    [
     "watch per store -> Sink: print",
     2,
     "HASH"
    ]
   ]
  },
  "joins.dedup_first": {
   "cols": [
    "op",
    "order_id",
    "store_id",
    "total_cents",
    "status"
   ],
   "rows": [
    [
     "+I",
     "1",
     "s01",
     "300",
     "refunded"
    ],
    [
     "+I",
     "2",
     "s02",
     "337",
     "paid"
    ],
    [
     "+I",
     "3",
     "s07",
     "374",
     "paid"
    ],
    [
     "+I",
     "4",
     "s01",
     "411",
     "paid"
    ]
   ]
  },
  "joins.dedup_last": {
   "cols": [
    "op",
    "order_id",
    "store_id",
    "total_cents",
    "status"
   ],
   "rows": [
    [
     "+I",
     "1",
     "s01",
     "300",
     "refunded"
    ],
    [
     "+I",
     "2",
     "s02",
     "337",
     "paid"
    ],
    [
     "-U",
     "1",
     "s01",
     "300",
     "refunded"
    ],
    [
     "+U",
     "1",
     "s01",
     "350",
     "refunded"
    ],
    [
     "+I",
     "3",
     "s07",
     "374",
     "paid"
    ],
    [
     "-U",
     "2",
     "s02",
     "337",
     "paid"
    ],
    [
     "+U",
     "2",
     "s02",
     "390",
     "refunded"
    ],
    [
     "-U",
     "1",
     "s01",
     "350",
     "refunded"
    ],
    [
     "+U",
     "1",
     "s01",
     "300",
     "paid"
    ],
    [
     "+I",
     "4",
     "s01",
     "411",
     "paid"
    ]
   ]
  },
  "joins.dup_input": {
   "cols": [
    "arrives",
    "order_id",
    "store_id",
    "total_cents",
    "status"
   ],
   "rows": [
    [
     1,
     1,
     "s01",
     300,
     "refunded"
    ],
    [
     2,
     2,
     "s02",
     337,
     "paid"
    ],
    [
     3,
     1,
     "s01",
     350,
     "refunded"
    ],
    [
     4,
     3,
     "s07",
     374,
     "paid"
    ],
    [
     5,
     2,
     "s02",
     390,
     "refunded"
    ],
    [
     6,
     1,
     "s01",
     300,
     "paid"
    ],
    [
     7,
     4,
     "s01",
     411,
     "paid"
    ],
    [
     8,
     3,
     "s07",
     374,
     "paid"
    ]
   ]
  },
  "joins.state_size": {
   "cols": [
    "checkpoint (one every 2 seconds)",
    "no time bound (bytes)",
    "interval join (bytes)",
    "time to live 10 s (bytes)"
   ],
   "rows": [
    [
     1,
     93184,
     86264,
     99952
    ],
    [
     2,
     181184,
     234264,
     194352
    ],
    [
     3,
     269184,
     382264,
     288752
    ],
    [
     4,
     357184,
     382264,
     383152
    ],
    [
     5,
     445184,
     381539,
     477552
    ],
    [
     6,
     533184,
     381539,
     547028
    ],
    [
     7,
     621184,
     381539,
     561504
    ],
    [
     8,
     709184,
     382264,
     549698
    ],
    [
     9,
     797184,
     382264,
     562446
    ]
   ]
  },
  "running.metrics_p1": {
   "cols": [
    "vertex",
    "parallel tasks",
    "busy (ms of each second)",
    "idle",
    "blocked by a full output (\"backpressured\")",
    "records taken in",
    "records sent on"
   ],
   "rows": [
    [
     "Source: orders",
     1,
     0,
     14,
     1000,
     11563,
     11563
    ],
    [
     "slow lookup -> discard: Writer",
     1,
     980,
     20,
     0,
     2871,
     0
    ]
   ]
  },
  "running.metrics_p4": {
   "cols": [
    "vertex",
    "parallel tasks",
    "busy (ms of each second)",
    "idle",
    "blocked by a full output (\"backpressured\")",
    "records taken in",
    "records sent on"
   ],
   "rows": [
    [
     "Source: orders",
     1,
     0,
     15,
     1000,
     33067,
     33067
    ],
    [
     "slow lookup",
     4,
     971,
     29,
     0,
     11574,
     11570
    ],
    [
     "discard: Writer",
     1,
     0,
     1000,
     0,
     11541,
     0
    ]
   ]
  },
  "sql.append_only": {
   "cols": [
    "op",
    "order_id",
    "store_id",
    "total_cents"
   ],
   "rows": [
    [
     "+I",
     "1",
     "s01",
     "300"
    ],
    [
     "+I",
     "6",
     "s11",
     "485"
    ],
    [
     "+I",
     "11",
     "s09",
     "670"
    ]
   ]
  },
  "sql.batch_group": {
   "cols": [
    "store_id",
    "n",
    "cents"
   ],
   "rows": [
    [
     "s01",
     "5",
     "2536"
    ],
    [
     "s02",
     "1",
     "337"
    ],
    [
     "s04",
     "2",
     "1081"
    ],
    [
     "s06",
     "1",
     "559"
    ],
    [
     "s07",
     "1",
     "374"
    ],
    [
     "s09",
     "1",
     "670"
    ],
    [
     "s11",
     "1",
     "485"
    ]
   ]
  },
  "sql.minibatch": {
   "cols": [
    "op",
    "store_id",
    "n",
    "cents"
   ],
   "rows": [
    [
     "+I",
     "s04",
     "1",
     "448"
    ],
    [
     "+I",
     "s02",
     "1",
     "337"
    ],
    [
     "+I",
     "s01",
     "2",
     "711"
    ],
    [
     "+I",
     "s07",
     "1",
     "374"
    ],
    [
     "+I",
     "s11",
     "1",
     "485"
    ],
    [
     "-U",
     "s04",
     "1",
     "448"
    ],
    [
     "+U",
     "s04",
     "2",
     "1081"
    ],
    [
     "-U",
     "s01",
     "2",
     "711"
    ],
    [
     "+U",
     "s01",
     "3",
     "1233"
    ],
    [
     "+I",
     "s06",
     "1",
     "559"
    ],
    [
     "-U",
     "s01",
     "3",
     "1233"
    ],
    [
     "+U",
     "s01",
     "5",
     "2536"
    ],
    [
     "+I",
     "s09",
     "1",
     "670"
    ]
   ]
  },
  "sql.orders": {
   "cols": [
    "order_id",
    "store_id",
    "customer_id",
    "total_cents",
    "status",
    "channel"
   ],
   "rows": [
    [
     1,
     "s01",
     1000,
     300,
     "refunded",
     "app"
    ],
    [
     2,
     "s02",
     1007,
     337,
     "paid",
     "counter"
    ],
    [
     3,
     "s07",
     1014,
     374,
     "paid",
     "web"
    ],
    [
     4,
     "s01",
     "null",
     411,
     "paid",
     "app"
    ],
    [
     5,
     "s04",
     1028,
     448,
     "paid",
     "counter"
    ],
    [
     6,
     "s11",
     1035,
     485,
     "refunded",
     "web"
    ],
    [
     7,
     "s01",
     1042,
     522,
     "paid",
     "app"
    ],
    [
     8,
     "s06",
     "null",
     559,
     "paid",
     "counter"
    ],
    [
     9,
     "s01",
     1056,
     596,
     "paid",
     "web"
    ],
    [
     10,
     "s04",
     1063,
     633,
     "paid",
     "app"
    ],
    [
     11,
     "s09",
     1070,
     670,
     "refunded",
     "counter"
    ],
    [
     12,
     "s01",
     "null",
     707,
     "paid",
     "web"
    ]
   ]
  },
  "sql.planner_errors": {
   "cols": [
    "what the script does",
    "what the SQL client said"
   ],
   "rows": [
    [
     "an aggregate written to a plain file",
     "TableException: Table sink 'default_catalog.default_database.counts_file' doesn't support consuming update changes which is produced by node GroupAggregate(groupBy=[store_id], select=[store_id, COUNT(*) AS n])"
    ],
    [
     "an upsert-kafka table with no primary key",
     "ValidationException: 'upsert-kafka' tables require to define a PRIMARY KEY constraint. The PRIMARY KEY specifies which columns should be read from or write to the Kafka message key. The PRIMARY KEY also defines records in the 'upsert-kafka' table should update or delete on which keys."
    ],
    [
     "a window on a column that is not a time attribute",
     "ValidationException: The window function requires the timecol is a time attribute type, but is TIMESTAMP(3)."
    ],
    [
     "a column called method",
     "ParseException: Encountered \"method\" at line 1, column 48."
    ]
   ]
  },
  "sql.stream_group": {
   "cols": [
    "op",
    "store_id",
    "n",
    "cents"
   ],
   "rows": [
    [
     "+I",
     "s01",
     "1",
     "300"
    ],
    [
     "+I",
     "s02",
     "1",
     "337"
    ],
    [
     "+I",
     "s07",
     "1",
     "374"
    ],
    [
     "-U",
     "s01",
     "1",
     "300"
    ],
    [
     "+U",
     "s01",
     "2",
     "711"
    ],
    [
     "+I",
     "s04",
     "1",
     "448"
    ],
    [
     "+I",
     "s11",
     "1",
     "485"
    ],
    [
     "-U",
     "s01",
     "2",
     "711"
    ],
    [
     "+U",
     "s01",
     "3",
     "1233"
    ],
    [
     "+I",
     "s06",
     "1",
     "559"
    ],
    [
     "-U",
     "s01",
     "3",
     "1233"
    ],
    [
     "+U",
     "s01",
     "4",
     "1829"
    ],
    [
     "-U",
     "s04",
     "1",
     "448"
    ],
    [
     "+U",
     "s04",
     "2",
     "1081"
    ],
    [
     "+I",
     "s09",
     "1",
     "670"
    ],
    [
     "-U",
     "s01",
     "4",
     "1829"
    ],
    [
     "+U",
     "s01",
     "5",
     "2536"
    ]
   ]
  },
  "sql.two_level": {
   "cols": [
    "op",
    "n",
    "stores"
   ],
   "rows": [
    [
     "+I",
     "1",
     "1"
    ],
    [
     "-U",
     "1",
     "1"
    ],
    [
     "+U",
     "1",
     "2"
    ],
    [
     "-U",
     "1",
     "2"
    ],
    [
     "+U",
     "1",
     "3"
    ],
    [
     "-U",
     "1",
     "3"
    ],
    [
     "+U",
     "1",
     "2"
    ],
    [
     "+I",
     "2",
     "1"
    ],
    [
     "-U",
     "1",
     "2"
    ],
    [
     "+U",
     "1",
     "3"
    ],
    [
     "-U",
     "1",
     "3"
    ],
    [
     "+U",
     "1",
     "4"
    ],
    [
     "-D",
     "2",
     "1"
    ],
    [
     "+I",
     "3",
     "1"
    ],
    [
     "-U",
     "1",
     "4"
    ],
    [
     "+U",
     "1",
     "5"
    ],
    [
     "-D",
     "3",
     "1"
    ],
    [
     "+I",
     "4",
     "1"
    ],
    [
     "-U",
     "1",
     "5"
    ],
    [
     "+U",
     "1",
     "4"
    ],
    [
     "+I",
     "2",
     "1"
    ],
    [
     "-U",
     "1",
     "4"
    ],
    [
     "+U",
     "1",
     "5"
    ],
    [
     "-D",
     "4",
     "1"
    ],
    [
     "+I",
     "5",
     "1"
    ]
   ]
  },
  "state.backends": {
   "cols": [
    "state backend",
    "size of the state, checkpoint 1 (bytes)",
    "size of the state, checkpoint 6",
    "bytes written, checkpoint 1",
    "bytes written, checkpoint 6"
   ],
   "rows": [
    [
     "heap (HashMapStateBackend)",
     49152,
     709152,
     49152,
     709152
    ],
    [
     "RocksDB, full checkpoints",
     61393,
     299671,
     61393,
     299671
    ],
    [
     "RocksDB, incremental checkpoints",
     79730,
     316217,
     79730,
     80233
    ]
   ]
  },
  "state.checkpoint_files": {
   "cols": [
    "file (below the checkpoint folder)",
    "bytes"
   ],
   "rows": [
    [
     "<job id>/chk-3/_metadata",
     15294
    ]
   ]
  },
  "state.savepoint_files": {
   "cols": [
    "file (below the savepoint folder)",
    "bytes"
   ],
   "rows": [
    [
     "_metadata",
     12626
    ]
   ]
  },
  "time.cumulate": {
   "cols": [
    "op",
    "window_start",
    "window_end",
    "orders"
   ],
   "rows": [
    [
     "+I",
     "2026-01-01 00:00:00.000",
     "2026-01-01 00:00:20.000",
     "1"
    ],
    [
     "+I",
     "2026-01-01 00:00:00.000",
     "2026-01-01 00:00:40.000",
     "2"
    ],
    [
     "+I",
     "2026-01-01 00:00:00.000",
     "2026-01-01 00:01:00.000",
     "5"
    ],
    [
     "+I",
     "2026-01-01 00:01:00.000",
     "2026-01-01 00:01:20.000",
     "3"
    ],
    [
     "+I",
     "2026-01-01 00:01:00.000",
     "2026-01-01 00:01:40.000",
     "3"
    ],
    [
     "+I",
     "2026-01-01 00:01:00.000",
     "2026-01-01 00:02:00.000",
     "4"
    ],
    [
     "+I",
     "2026-01-01 00:02:00.000",
     "2026-01-01 00:02:20.000",
     "2"
    ],
    [
     "+I",
     "2026-01-01 00:02:00.000",
     "2026-01-01 00:02:40.000",
     "2"
    ],
    [
     "+I",
     "2026-01-01 00:02:00.000",
     "2026-01-01 00:03:00.000",
     "2"
    ],
    [
     "+I",
     "2026-01-01 00:03:00.000",
     "2026-01-01 00:03:20.000",
     "1"
    ],
    [
     "+I",
     "2026-01-01 00:03:00.000",
     "2026-01-01 00:03:40.000",
     "2"
    ],
    [
     "+I",
     "2026-01-01 00:03:00.000",
     "2026-01-01 00:04:00.000",
     "2"
    ],
    [
     "+I",
     "2026-01-01 00:04:00.000",
     "2026-01-01 00:04:20.000",
     "1"
    ],
    [
     "+I",
     "2026-01-01 00:04:00.000",
     "2026-01-01 00:04:40.000",
     "1"
    ],
    [
     "+I",
     "2026-01-01 00:04:00.000",
     "2026-01-01 00:05:00.000",
     "1"
    ]
   ]
  },
  "time.delay_summary": {
   "cols": [
    "watermark waits (seconds)",
    "orders in windows 1 to 5",
    "counted",
    "dropped as late",
    "order_id dropped"
   ],
   "rows": [
    [
     0,
     "3, 2, 2, 2, 1",
     10,
     4,
     "5, 8, 11, 14"
    ],
    [
     10,
     "4, 2, 2, 2, 1",
     11,
     3,
     "8, 11, 14"
    ],
    [
     30,
     "4, 2, 2, 2, 1",
     11,
     3,
     "8, 11, 14"
    ],
    [
     75,
     "5, 3, 2, 2, 1",
     13,
     1,
     "14"
    ],
    [
     200,
     "5, 4, 2, 2, 1",
     14,
     0,
     ""
    ]
   ]
  },
  "time.events": {
   "cols": [
    "arrives",
    "order_id",
    "store_id",
    "total_cents",
    "happened at",
    "seconds late (behind the largest time seen so far)"
   ],
   "rows": [
    [
     1,
     1,
     "s01",
     400,
     "00:00:05",
     0
    ],
    [
     2,
     2,
     "s01",
     350,
     "00:00:20",
     0
    ],
    [
     3,
     3,
     "s02",
     500,
     "00:00:40",
     0
    ],
    [
     4,
     4,
     "s01",
     420,
     "00:01:05",
     0
    ],
    [
     5,
     5,
     "s02",
     380,
     "00:00:50",
     15
    ],
    [
     6,
     6,
     "s01",
     610,
     "00:01:10",
     0
    ],
    [
     7,
     7,
     "s02",
     450,
     "00:02:05",
     0
    ],
    [
     8,
     8,
     "s01",
     300,
     "00:00:55",
     70
    ],
    [
     9,
     9,
     "s02",
     520,
     "00:02:10",
     0
    ],
    [
     10,
     10,
     "s01",
     700,
     "00:03:10",
     0
    ],
    [
     11,
     11,
     "s02",
     330,
     "00:01:58",
     72
    ],
    [
     12,
     12,
     "s01",
     410,
     "00:03:20",
     0
    ],
    [
     13,
     13,
     "s02",
     480,
     "00:04:10",
     0
    ],
    [
     14,
     14,
     "s01",
     360,
     "00:01:01",
     189
    ]
   ]
  },
  "time.hop": {
   "cols": [
    "op",
    "window_start",
    "window_end",
    "orders"
   ],
   "rows": [
    [
     "+I",
     "2025-12-31 23:59:30.000",
     "2026-01-01 00:00:30.000",
     "2"
    ],
    [
     "+I",
     "2026-01-01 00:00:00.000",
     "2026-01-01 00:01:00.000",
     "5"
    ],
    [
     "+I",
     "2026-01-01 00:00:30.000",
     "2026-01-01 00:01:30.000",
     "6"
    ],
    [
     "+I",
     "2026-01-01 00:01:00.000",
     "2026-01-01 00:02:00.000",
     "4"
    ],
    [
     "+I",
     "2026-01-01 00:01:30.000",
     "2026-01-01 00:02:30.000",
     "3"
    ],
    [
     "+I",
     "2026-01-01 00:02:00.000",
     "2026-01-01 00:03:00.000",
     "2"
    ],
    [
     "+I",
     "2026-01-01 00:02:30.000",
     "2026-01-01 00:03:30.000",
     "2"
    ],
    [
     "+I",
     "2026-01-01 00:03:00.000",
     "2026-01-01 00:04:00.000",
     "2"
    ],
    [
     "+I",
     "2026-01-01 00:03:30.000",
     "2026-01-01 00:04:30.000",
     "1"
    ],
    [
     "+I",
     "2026-01-01 00:04:00.000",
     "2026-01-01 00:05:00.000",
     "1"
    ]
   ]
  },
  "time.session": {
   "cols": [
    "op",
    "store_id",
    "window_start",
    "window_end",
    "orders"
   ],
   "rows": [
    [
     "+I",
     "s01",
     "2026-01-01 00:00:05.000",
     "2026-01-01 00:00:50.000",
     "2"
    ],
    [
     "+I",
     "s01",
     "2026-01-01 00:00:55.000",
     "2026-01-01 00:01:40.000",
     "4"
    ],
    [
     "+I",
     "s01",
     "2026-01-01 00:03:10.000",
     "2026-01-01 00:03:50.000",
     "2"
    ],
    [
     "+I",
     "s02",
     "2026-01-01 00:00:40.000",
     "2026-01-01 00:01:20.000",
     "2"
    ],
    [
     "+I",
     "s02",
     "2026-01-01 00:01:58.000",
     "2026-01-01 00:02:40.000",
     "3"
    ],
    [
     "+I",
     "s02",
     "2026-01-01 00:04:10.000",
     "2026-01-01 00:04:40.000",
     "1"
    ]
   ]
  },
  "time.tumble_0": {
   "cols": [
    "op",
    "window_start",
    "window_end",
    "orders",
    "cents"
   ],
   "rows": [
    [
     "+I",
     "2026-01-01 00:00:00.000",
     "2026-01-01 00:01:00.000",
     "3",
     "1250"
    ],
    [
     "+I",
     "2026-01-01 00:01:00.000",
     "2026-01-01 00:02:00.000",
     "2",
     "1030"
    ],
    [
     "+I",
     "2026-01-01 00:02:00.000",
     "2026-01-01 00:03:00.000",
     "2",
     "970"
    ],
    [
     "+I",
     "2026-01-01 00:03:00.000",
     "2026-01-01 00:04:00.000",
     "2",
     "1110"
    ],
    [
     "+I",
     "2026-01-01 00:04:00.000",
     "2026-01-01 00:05:00.000",
     "1",
     "480"
    ]
   ]
  },
  "time.tumble_10": {
   "cols": [
    "op",
    "window_start",
    "window_end",
    "orders",
    "cents"
   ],
   "rows": [
    [
     "+I",
     "2026-01-01 00:00:00.000",
     "2026-01-01 00:01:00.000",
     "4",
     "1630"
    ],
    [
     "+I",
     "2026-01-01 00:01:00.000",
     "2026-01-01 00:02:00.000",
     "2",
     "1030"
    ],
    [
     "+I",
     "2026-01-01 00:02:00.000",
     "2026-01-01 00:03:00.000",
     "2",
     "970"
    ],
    [
     "+I",
     "2026-01-01 00:03:00.000",
     "2026-01-01 00:04:00.000",
     "2",
     "1110"
    ],
    [
     "+I",
     "2026-01-01 00:04:00.000",
     "2026-01-01 00:05:00.000",
     "1",
     "480"
    ]
   ]
  },
  "time.tumble_200": {
   "cols": [
    "op",
    "window_start",
    "window_end",
    "orders",
    "cents"
   ],
   "rows": [
    [
     "+I",
     "2026-01-01 00:00:00.000",
     "2026-01-01 00:01:00.000",
     "5",
     "1930"
    ],
    [
     "+I",
     "2026-01-01 00:01:00.000",
     "2026-01-01 00:02:00.000",
     "4",
     "1720"
    ],
    [
     "+I",
     "2026-01-01 00:02:00.000",
     "2026-01-01 00:03:00.000",
     "2",
     "970"
    ],
    [
     "+I",
     "2026-01-01 00:03:00.000",
     "2026-01-01 00:04:00.000",
     "2",
     "1110"
    ],
    [
     "+I",
     "2026-01-01 00:04:00.000",
     "2026-01-01 00:05:00.000",
     "1",
     "480"
    ]
   ]
  },
  "time.tumble_30": {
   "cols": [
    "op",
    "window_start",
    "window_end",
    "orders",
    "cents"
   ],
   "rows": [
    [
     "+I",
     "2026-01-01 00:00:00.000",
     "2026-01-01 00:01:00.000",
     "4",
     "1630"
    ],
    [
     "+I",
     "2026-01-01 00:01:00.000",
     "2026-01-01 00:02:00.000",
     "2",
     "1030"
    ],
    [
     "+I",
     "2026-01-01 00:02:00.000",
     "2026-01-01 00:03:00.000",
     "2",
     "970"
    ],
    [
     "+I",
     "2026-01-01 00:03:00.000",
     "2026-01-01 00:04:00.000",
     "2",
     "1110"
    ],
    [
     "+I",
     "2026-01-01 00:04:00.000",
     "2026-01-01 00:05:00.000",
     "1",
     "480"
    ]
   ]
  },
  "time.tumble_75": {
   "cols": [
    "op",
    "window_start",
    "window_end",
    "orders",
    "cents"
   ],
   "rows": [
    [
     "+I",
     "2026-01-01 00:00:00.000",
     "2026-01-01 00:01:00.000",
     "5",
     "1930"
    ],
    [
     "+I",
     "2026-01-01 00:01:00.000",
     "2026-01-01 00:02:00.000",
     "3",
     "1360"
    ],
    [
     "+I",
     "2026-01-01 00:02:00.000",
     "2026-01-01 00:03:00.000",
     "2",
     "970"
    ],
    [
     "+I",
     "2026-01-01 00:03:00.000",
     "2026-01-01 00:04:00.000",
     "2",
     "1110"
    ],
    [
     "+I",
     "2026-01-01 00:04:00.000",
     "2026-01-01 00:05:00.000",
     "1",
     "480"
    ]
   ]
  },
  "world.chaining": {
   "cols": [
    "operator chaining",
    "vertices",
    "tasks",
    "names of the vertices"
   ],
   "rows": [
    [
     "on (the default)",
     2,
     4,
     "GroupAggregate -> Calc -> ConstraintEnforcer -> Sink: counts | Source: orders -> Calc"
    ],
    [
     "off",
     6,
     12,
     "Calc | Calc | ConstraintEnforcer | GroupAggregate | Sink: counts | Source: orders"
    ]
   ]
  },
  "world.plan": {
   "cols": [
    "vertex",
    "operators chained inside it",
    "parallelism",
    "records arrive by"
   ],
   "rows": [
    [
     "v1",
     "TableSourceScan(orders) -> Calc",
     2,
     "nothing: a source"
    ],
    [
     "v2",
     "GroupAggregate -> Calc -> ConstraintEnforcer -> Sink(counts)",
     2,
     "HASH"
    ]
   ]
  },
  "world.processes": {
   "cols": [
    "process",
    "main class (a plain Java program)",
    "heap it was started with (MiB)"
   ],
   "rows": [
    [
     "JobManager",
     "org.apache.flink.runtime.entrypoint.StandaloneSessionClusterEntrypoint",
     448
    ],
    [
     "TaskManager",
     "org.apache.flink.runtime.taskexecutor.TaskManagerRunner",
     287
    ],
    [
     "TaskManager",
     "org.apache.flink.runtime.taskexecutor.TaskManagerRunner",
     287
    ]
   ]
  },
  "world.rest": {
   "cols": [
    "GET path",
    "what it answers",
    "result",
    "first keys of the answer"
   ],
   "rows": [
    [
     "/overview",
     "the cluster in one line",
     "works",
     "flink-commit, flink-version, jobs-cancelled, jobs-failed, jobs-finished"
    ],
    [
     "/jobs/overview",
     "every job and its state",
     "works",
     "jobs"
    ],
    [
     "/taskmanagers",
     "the TaskManagers, their slots and memory",
     "works",
     "taskmanagers"
    ],
    [
     "/jobs/<id>",
     "one job: its vertices and their states",
     "works",
     "duration, end-time, isStoppable, jid, job-type"
    ],
    [
     "/jobs/<id>/plan",
     "the job graph",
     "works",
     "plan"
    ],
    [
     "/jobs/<id>/checkpoints",
     "checkpoint counts, sizes and durations",
     "works",
     "counts, history, latest, summary"
    ],
    [
     "/jobs/<id>/exceptions",
     "the failures of a job",
     "works",
     "exceptionHistory"
    ],
    [
     "/jobs/<id>/vertices/<id>/metrics",
     "the metrics of one vertex",
     "works",
     "164 metrics"
    ]
   ]
  },
  "world.slots": {
   "cols": [
    "parallelism",
    "tasks (vertices x parallelism)",
    "slots in use",
    "state of the job",
    "error"
   ],
   "rows": [
    [
     1,
     2,
     1,
     "RUNNING",
     ""
    ],
    [
     2,
     4,
     2,
     "RUNNING",
     ""
    ],
    [
     4,
     8,
     4,
     "RUNNING",
     ""
    ],
    [
     5,
     10,
     0,
     "FAILED",
     "org.apache.flink.runtime.jobmanager.scheduler.NoResourceAvailableException: Could not acquire the minimum required resources."
    ]
   ]
  },
  "world.taskmanager_memory": {
   "cols": [
    "piece",
    "MiB",
    "what uses it"
   ],
   "rows": [
    [
     "Framework heap",
     128,
     "Flink itself"
    ],
    [
     "Task heap",
     160,
     "your code and the state of the heap state backend"
    ],
    [
     "Framework off-heap",
     128,
     "Flink itself, outside the heap"
    ],
    [
     "Task off-heap",
     0,
     "your code, outside the heap (none here)"
    ],
    [
     "Network buffers",
     83,
     "the buffers that carry records between tasks"
    ],
    [
     "Managed memory",
     333,
     "RocksDB, and sorting in batch jobs"
    ],
    [
     "JVM metaspace",
     256,
     "loaded classes"
    ],
    [
     "JVM overhead",
     192,
     "threads, native memory, the rest"
    ],
    [
     "Total process",
     1280,
     "what the operating system sees"
    ]
   ]
  }
 },
 "text": {
  "cdc.flink_cdc_output_default": "+I[1, s01, 1000, 300, refunded]\n+I[2, s02, 1007, 337, paid]\n+I[3, s07, 1014, 374, paid]\n+I[4, s01, null, 411, paid]\n+I[5, s04, 1028, 448, paid]\n+I[6, s03, 1007, 520, paid]\n+I[6, s03, 1007, 520, paid]\n+I[6, s03, 1007, 520, paid]\n+I[6, s03, 1007, 520, paid]",
  "cdc.flink_cdc_output_full": "+I[1, s01, 1000, 300, refunded]\n+I[2, s02, 1007, 337, paid]\n+I[3, s07, 1014, 374, paid]\n+I[4, s01, null, 411, paid]\n+I[5, s04, 1028, 448, paid]\n+I[6, s03, 1007, 520, paid]\n-U[2, s02, 1007, 337, paid]\n+U[2, s02, 1007, 337, refunded]\n-D[3, s07, 1014, 374, paid]",
  "cdc.flink_cdc_output_upsert": "+I[1, s01, 1000, 300, refunded]\n+I[2, s02, 1007, 337, paid]\n+I[3, s07, 1014, 374, paid]\n+I[4, s01, null, 411, paid]\n+I[5, s04, 1028, 448, paid]\n+I[6, s03, 1007, 520, paid]\n-U[2, s02, 1007, 337, paid]\n+U[2, s02, 1007, 337, refunded]\n-D[3, s07, 1014, 374, paid]",
  "cdc.plan_default": "DropUpdateBefore(changelogMode=[I,UA,D])\n+- TableSourceScan(table=[[default_catalog, default_database, pg_orders]], fields=[order_id, store_id, customer_id, total_cents, status], changelogMode=[I,UB,UA,D])",
  "cdc.plan_full": "DropUpdateBefore(changelogMode=[I,UA,D])\n+- TableSourceScan(table=[[default_catalog, default_database, pg_orders]], fields=[order_id, store_id, customer_id, total_cents, status], changelogMode=[I,UB,UA,D])",
  "cdc.plan_upsert": "ChangelogNormalize(key=[order_id], changelogMode=[I,UA,D])\n+- Exchange(distribution=[hash[order_id]], changelogMode=[I,UA,PD])\n   +- TableSourceScan(table=[[default_catalog, default_database, pg_orders]], fields=[order_id, store_id, customer_id, total_cents, status], changelogMode=[I,UA,PD])",
  "datastream.idle_lines": "1> idle s01 orders=205 cents=118165\n1> idle s04 orders=52 cents=31793\n1> idle s05 orders=46 cents=27138\n1> idle s07 orders=38 cents=20413",
  "datastream.run_command": "flink run -d -p 2 -c brewline.StoreWatch storewatch.jar --bootstrap localhost:9092 --topic orders_s --idle-seconds 5\nJob has been submitted with JobID <id>",
  "joins.plan_interval": "+- IntervalJoin(joinType=[InnerJoin], windowBounds=[isRowTime=false, leftLowerBound=-5000, leftUpperBound=5000, leftTimeIndex=2, rightTimeIndex=2], where=[AND(=(order_id, order_id0), >=(ot, -(pt, 5000:INTERVAL SECOND)), <=(ot, +(pt, 5000:INTERVAL SECOND)))], select=[order_id, note, ot, order_id0, how_paid, pt])",
  "joins.plan_plain_timestamp": "+- Join(joinType=[InnerJoin], where=[AND(=(order_id, order_id0), >=(ot, -(pt, 5000:INTERVAL SECOND)), <=(ot, +(pt, 5000:INTERVAL SECOND)))], select=[order_id, note, ot, order_id0, how_paid, pt], leftInputSpec=[NoUniqueKey], rightInputSpec=[NoUniqueKey])",
  "joins.plan_regular": "+- Join(joinType=[InnerJoin], where=[=(order_id, order_id0)], select=[order_id, note, order_id0, how_paid], leftInputSpec=[NoUniqueKey], rightInputSpec=[NoUniqueKey])",
  "running.backpressure_p1": "{\n \"status\": \"ok\",\n \"backpressure-level\": \"high\",\n \"subtasks\": [\n  {\n   \"subtask\": 0,\n   \"backpressureLevel\": \"high\",\n   \"ratio\": 1.0,\n   \"idleRatio\": 0.01,\n   \"busyRatio\": 0.0,\n   \"backpressure-level\": \"high\"\n  }\n ]\n}",
  "running.backpressure_p4": "{\n \"status\": \"ok\",\n \"backpressure-level\": \"high\",\n \"subtasks\": [\n  {\n   \"subtask\": 0,\n   \"backpressureLevel\": \"high\",\n   \"ratio\": 1.0,\n   \"idleRatio\": 0.01,\n   \"busyRatio\": 0.0,\n   \"backpressure-level\": \"high\"\n  }\n ]\n}",
  "sql.batch_footer": "7 rows in set",
  "sql.client_help": "The following commands are available:\n\nHELP                 Prints the available commands.\nQUIT/EXIT            Quits the SQL CLI client.\nCLEAR                Clears the current terminal.\nSET                  Sets a session configuration property. Syntax: \"SET '<key>'='<value>';\". Use \"SET;\" for listing all properties.\nRESET                Resets a session configuration property. Syntax: \"RESET '<key>';\". Use \"RESET;\" for reset all session properties.\nINSERT INTO          Inserts the results of a SQL SELECT query into a declared table sink.\nINSERT OVERWRITE     Inserts the results of a SQL SELECT query into a declared table sink and overwrite existing data.\nSELECT               Executes a SQL SELECT query on the Flink cluster.\nEXPLAIN              Describes the execution plan of a query or table with the given name.\nBEGIN STATEMENT SET  Begins a statement set. Syntax: \"BEGIN STATEMENT SET;\"\nEND                  Ends a statement set. Syntax: \"END;\"\nADD JAR              Adds the specified jar file to the submitted jobs' classloader. Syntax: \"ADD JAR '<path_to_filename>.jar'\"\nREMOVE JAR           Removes the specified jar file from the submitted jobs' classloader. Syntax: \"REMOVE JAR '<path_to_filename>.jar'\"\nSHOW JARS            Shows the list of user-specified jar dependencies. This list is impacted by the --jar and --library startup options as well as the ADD/REMOVE JAR commands.\n\nHint: Make sure that a statement ends with \";\" for finalizing (multi-line) statements.\nYou can also type any Flink SQL statement, please visit https://nightlies.apache.org/flink/flink-docs-stable/docs/dev/table/sql/overview/ for more details.",
  "sql.explain_filter": "== Optimized Physical Plan ==\nCalc(select=[order_id, total_cents], where=[>(total_cents, 500)], changelogMode=[I])\n+- TableSourceScan(table=[[default_catalog, default_database, orders, filter=[>(total_cents, 500)], project=[order_id, total_cents], metadata=[]]], fields=[order_id, total_cents], changelogMode=[I])",
  "sql.explain_group": "== Optimized Physical Plan ==\nGroupAggregate(groupBy=[store_id], select=[store_id, COUNT(*) AS n, SUM(total_cents) AS cents], changelogMode=[I,UA])\n+- Exchange(distribution=[hash[store_id]], changelogMode=[I])\n   +- TableSourceScan(table=[[default_catalog, default_database, orders, project=[store_id, total_cents], metadata=[]]], fields=[store_id, total_cents], changelogMode=[I])",
  "sql.explain_two": "== Optimized Physical Plan ==\nGroupAggregate(groupBy=[n], select=[n, COUNT_RETRACT(*) AS stores], changelogMode=[I,UA,D])\n+- Exchange(distribution=[hash[n]], changelogMode=[I,UB,UA])\n   +- Calc(select=[n], changelogMode=[I,UB,UA])\n      +- GroupAggregate(groupBy=[store_id], select=[store_id, COUNT(*) AS n], changelogMode=[I,UB,UA])\n         +- Exchange(distribution=[hash[store_id]], changelogMode=[I])\n            +- TableSourceScan(table=[[default_catalog, default_database, orders, project=[store_id], metadata=[]]], fields=[store_id], changelogMode=[I])",
  "sql.job_name": "insert-into_default_catalog.default_database.per_store",
  "sql.orders_file": "{\"order_id\":1,\"store_id\":\"s01\",\"customer_id\":1000,\"total_cents\":300,\"status\":\"refunded\",\"channel\":\"app\"}\n{\"order_id\":2,\"store_id\":\"s02\",\"customer_id\":1007,\"total_cents\":337,\"status\":\"paid\",\"channel\":\"counter\"}\n{\"order_id\":3,\"store_id\":\"s07\",\"customer_id\":1014,\"total_cents\":374,\"status\":\"paid\",\"channel\":\"web\"}\n{\"order_id\":4,\"store_id\":\"s01\",\"customer_id\":null,\"total_cents\":411,\"status\":\"paid\",\"channel\":\"app\"}\n{\"order_id\":5,\"store_id\":\"s04\",\"customer_id\":1028,\"total_cents\":448,\"status\":\"paid\",\"channel\":\"counter\"}\n{\"order_id\":6,\"store_id\":\"s11\",\"customer_id\":1035,\"total_cents\":485,\"status\":\"refunded\",\"channel\":\"web\"}\n{\"order_id\":7,\"store_id\":\"s01\",\"customer_id\":1042,\"total_cents\":522,\"status\":\"paid\",\"channel\":\"app\"}\n{\"order_id\":8,\"store_id\":\"s06\",\"customer_id\":null,\"total_cents\":559,\"status\":\"paid\",\"channel\":\"counter\"}\n{\"order_id\":9,\"store_id\":\"s01\",\"customer_id\":1056,\"total_cents\":596,\"status\":\"paid\",\"channel\":\"web\"}\n{\"order_id\":10,\"store_id\":\"s04\",\"customer_id\":1063,\"total_cents\":633,\"status\":\"paid\",\"channel\":\"app\"}\n{\"order_id\":11,\"store_id\":\"s09\",\"customer_id\":1070,\"total_cents\":670,\"status\":\"refunded\",\"channel\":\"counter\"}\n{\"order_id\":12,\"store_id\":\"s01\",\"customer_id\":null,\"total_cents\":707,\"status\":\"paid\",\"channel\":\"web\"}",
  "sql.print_out": "+I[s01, 1, 300]\n+I[s02, 1, 337]\n+I[s07, 1, 374]\n-U[s01, 1, 300]\n+U[s01, 2, 711]\n+I[s04, 1, 448]\n+I[s11, 1, 485]\n-U[s01, 2, 711]\n+U[s01, 3, 1233]\n+I[s06, 1, 559]\n-U[s01, 3, 1233]\n+U[s01, 4, 1829]\n-U[s04, 1, 448]\n+U[s04, 2, 1081]\n+I[s09, 1, 670]\n-U[s01, 4, 1829]\n+U[s01, 5, 2536]",
  "sql.stream_footer": "Received a total of 17 rows",
  "state.a_jobmanager_log": "Using restart back off time strategy ExponentialDelayRestartBackoffTimeStrategy(initialBackoffMS=1000, maxBackoffMS=60000, backoffMultiplier=1.5, resetBackoffThresholdMS=3600000, jitterFactor=0.1, attemptsBeforeResetBackoff=2147483647, currentRestartAttempt=0, nextRestartTimestamp=-2147483648) for insert-into_default_catalog.default_database.store_totals (<job id>).\nJob insert-into_default_catalog.default_database.store_totals (<job id>) switched from state CREATED to RUNNING.\nJob insert-into_default_catalog.default_database.store_totals (<job id>) switched from state RUNNING to RESTARTING.\nJob insert-into_default_catalog.default_database.store_totals (<job id>) switched from state RESTARTING to RUNNING.\nRestoring job <job id> from Checkpoint 3 for <job id> located at file:<work>/checkpoints/<job id>/chk-3.",
  "state.savepoint_command": "flink stop --savepointPath <savepoints> <job id>\nSuspending job \"<id>\" with a CANONICAL savepoint.\nTriggering stop-with-savepoint for job <id>.\nSavepoint completed. Path: file:<work>/savepoints/savepoint-f66754-d90b9c8865b9",
  "time.events_file": "{\"order_id\":1,\"store_id\":\"s01\",\"total_cents\":400,\"ts\":\"2026-01-01 00:00:05.000\"}\n{\"order_id\":2,\"store_id\":\"s01\",\"total_cents\":350,\"ts\":\"2026-01-01 00:00:20.000\"}\n{\"order_id\":3,\"store_id\":\"s02\",\"total_cents\":500,\"ts\":\"2026-01-01 00:00:40.000\"}\n{\"order_id\":4,\"store_id\":\"s01\",\"total_cents\":420,\"ts\":\"2026-01-01 00:01:05.000\"}\n{\"order_id\":5,\"store_id\":\"s02\",\"total_cents\":380,\"ts\":\"2026-01-01 00:00:50.000\"}\n{\"order_id\":6,\"store_id\":\"s01\",\"total_cents\":610,\"ts\":\"2026-01-01 00:01:10.000\"}\n{\"order_id\":7,\"store_id\":\"s02\",\"total_cents\":450,\"ts\":\"2026-01-01 00:02:05.000\"}\n{\"order_id\":8,\"store_id\":\"s01\",\"total_cents\":300,\"ts\":\"2026-01-01 00:00:55.000\"}\n{\"order_id\":9,\"store_id\":\"s02\",\"total_cents\":520,\"ts\":\"2026-01-01 00:02:10.000\"}\n{\"order_id\":10,\"store_id\":\"s01\",\"total_cents\":700,\"ts\":\"2026-01-01 00:03:10.000\"}\n{\"order_id\":11,\"store_id\":\"s02\",\"total_cents\":330,\"ts\":\"2026-01-01 00:01:58.000\"}\n{\"order_id\":12,\"store_id\":\"s01\",\"total_cents\":410,\"ts\":\"2026-01-01 00:03:20.000\"}\n{\"order_id\":13,\"store_id\":\"s02\",\"total_cents\":480,\"ts\":\"2026-01-01 00:04:10.000\"}\n{\"order_id\":14,\"store_id\":\"s01\",\"total_cents\":360,\"ts\":\"2026-01-01 00:01:01.000\"}",
  "time.idle_paced": "+I[2026-01-01T00:00, 2026-01-01T00:01, 4]\n+I[2026-01-01T00:01, 2026-01-01T00:02, 2]\n+I[2026-01-01T00:02, 2026-01-01T00:03, 2]\n+I[2026-01-01T00:03, 2026-01-01T00:04, 2]",
  "time.idle_with": "+I[2026-01-01T00:00, 2026-01-01T00:01, 5]\n+I[2026-01-01T00:01, 2026-01-01T00:02, 4]\n+I[2026-01-01T00:02, 2026-01-01T00:03, 2]\n+I[2026-01-01T00:03, 2026-01-01T00:04, 2]",
  "time.idle_without": "(nothing was printed)",
  "world.explain": "== Optimized Execution Plan ==\nGroupAggregate(groupBy=[store_id], select=[store_id, COUNT(*) AS EXPR$1, SUM(total_cents) AS EXPR$2])\n+- Exchange(distribution=[hash[store_id]])\n   +- Calc(select=[store_id, total_cents], where=[(total_cents > 350)])\n      +- TableSourceScan(table=[[default_catalog, default_database, orders]], fields=[order_id, store_id, total_cents])",
  "world.flink_list": "------------------ Running/Restarting Jobs -------------------\n<time> : <id> : insert-into_default_catalog.default_database.counts (RUNNING)\n--------------------------------------------------------------\nNo scheduled jobs.",
  "world.job_rest_keys": "duration, end-time, isStoppable, jid, job-type, maxParallelism, name, now, pending-operators, plan, start-time, state, status-counts, timestamps, vertices",
  "world.plan_json": "{\n \"plan\": {\n  \"jid\": \"<job id>\",\n  \"name\": \"insert-into_default_catalog.default_database.counts\",\n  \"type\": \"STREAMING\",\n  \"nodes\": [\n   {\n    \"id\": \"v2\",\n    \"operator\": \"\",\n    \"parallelism\": 2,\n    \"operator_strategy\": \"\",\n    \"description\": \"[4]:GroupAggregate(groupBy=[store_id], select=[store_id, COUNT(*) AS EXPR$1, SUM(total_cents) AS EXPR$2])\\n+- [5]:Calc(select=[store_id, CAST(EXPR$1 AS BIGINT) AS n, CAST(EXPR$2 AS BIGINT) AS cents])\\n   +- [6]:ConstraintEnforcer[NotNullEnforcer(fields=[store_id])]\\n      +- [6]:Sink(table=[default_catalog.default_database.counts], fields=[store_id, n, cents])\\n\",\n    \"optimizer_properties\": {},\n    \"inputs\": [\n     {\n      \"id\": \"v1\",\n      \"num\": 0,\n      \"exchange\": \"pipelined_bounded\",\n      \"ship_strategy\": \"HASH\"\n     }\n    ]\n   },\n   {\n    \"id\": \"v1\",\n    \"operator\": \"\",\n    \"parallelism\": 2,\n    \"operator_strategy\": \"\",\n    \"description\": \"[1]:TableSourceScan(table=[[default_catalog, default_database, orders]], fields=[order_id, store_id, total_cents])\\n+- [2]:Calc(select=[store_id, total_cents], where=[(total_cents > 350)])\\n\",\n    \"optimizer_properties\": {}\n   }\n  ]\n }\n}",
  "world.plan_vertices": "v1  Source: orders[1] -> Calc[2]  (parallelism 2)  status RUNNING\nv2  GroupAggregate[4] -> Calc[5] -> ConstraintEnforcer[6] -> Sink: counts[6]  (parallelism 2)  status RUNNING"
 }
};
