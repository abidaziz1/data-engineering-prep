/* Mission 12: stream processing with Kafka Streams. A Java application of about ninety lines counts orders per store and minute of event time, and per sales channel, on the real cluster with exactly-once processing.
   Real: the Kafka Streams library of the distribution, the topology it prints, the internal topics, the state on disk, late records, and a restart that rebuilds the state from the changelog. Nothing here is timed.
   From documentation: the Streams settings (read from the site documentation that ships with Apache Kafka 4.4.0), Flink and other engines. */
(function () {
  var B = LAB.b, G = LAB.get;
  var TP = G.text('streams.topology'), CC = G.counts('streams.counts_check'), BM = G.table('streams.s01_by_minute'), CN = G.counts('streams.channel_counts'), IT = G.table('streams.internal_topics');
  var SD = G.counts('streams.state_on_disk'), ST = G.text('streams.state_tree'), GT = G.counts('streams.group_and_transactions'), LT = G.counts('streams.late'), RS = G.counts('streams.restart');
  var JV = G.file('code/app/StoreCounts.java');
  var BUILD = G.lines(JV, G.at(JV, /var orders = builder/), G.at(JV, /\.to\("channel-counts"/));
  var CFG = G.lines(JV, G.at(JV, /Properties props = new Properties/), G.at(JV, /consumerPrefix\("auto\.offset\.reset"\)/));
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  G.expect(CC.orders_in === 600 && CC.every_count_is_right === true && CC.windows_with_a_count === CC.expected_windows && CC.records_in_the_output_topic === CC.orders_in, 'the windowed counts are right, and there is one update for each input record');
  G.expect(CN.every_count_is_right === true && CN.value_bytes === 8, 'the counts by channel are right');
  G.expect(IT.rows.length === 3 && IT.rows.every(function (r) { return r[1] === 3; }), 'three internal topics, with three partitions each');
  G.expect(LT.record_20_seconds_late_counted === true && LT.record_in_a_closed_window_counted === false && LT.dropped_records_metric >= 1, 'a late record inside the grace is counted, one after it is dropped and counted by a metric');
  G.expect(RS.nothing_was_processed_twice === true && RS.the_count_continued_from_the_rebuilt_state === true, 'a restart repeats nothing, and a rebuilt state continues the count');
  G.expect(TP.indexOf('Sub-topology: 1') > 0 && TP.indexOf('orders-per-channel-repartition') > 0, 'a topology with a repartition topic and two sub-topologies');
  var internal = function (k) { var r = IT.rows.filter(function (x) { return x[0].indexOf(k) === 0; })[0]; G.expect(!!r, 'internal topic ' + k); return r; };
  var copies = internal('orders-per-store-minute-changelog')[2];

  LAB.addChapter({
    id: 'm12', n: 12, title: 'Stream processing with Kafka Streams', short: 'Streams', blurb: 'A Java library that counts, joins and windows records: topology, state, repartition, late records, exactly once', minutes: 60,
    focus: ['xf', 'stg', 'qual'],
    goals: [
      'Explain what **Kafka Streams** is: a **library** in your application, not a cluster.',
      'Read a **topology**: sources, processors, sinks, **sub-topologies**.',
      'Explain **state stores**, their **changelog topics**, and **repartition topics**.',
      'Explain **windows**, **event time**, **grace** and **late records**.',
      'Explain **exactly-once** processing and what it needs.',
      'Say what happens on a **restart**, with and without the local state.'
    ],
    say: 'Mission 12 is where Kafka stops being a pipe and starts computing. Kafka Streams is a Java library: you add it to your own program, and your program reads topics, keeps state, and writes topics. I wrote a real application of ninety lines, ran it on the three-broker cluster with exactly-once processing, counted six hundred orders per store and minute, sent records that were late, stopped the program, deleted its local state, and watched it rebuild from Kafka. Press Next.',
    scenes: [
      B.talk({
        id: 'm12-what', t: 1, src: 'docs', title: 'A library, not a cluster',
        say: 'Spark and Flink are systems that run your job. Kafka Streams is different. Press Next.',
        items: [
          ['What it is', 'A **Java library**. You add it to your application, write a few lines that describe a **topology**, and start it. Your application is the stream processor. There is no cluster of workers to run.', 'It lives inside your program.'],
          ['Where the work runs', 'In every copy of your application. Start a second copy with the same `application.id` and the work is **shared**: the partitions of the input topics are split between the copies, as in a consumer group.', 'Scale by starting more copies.'],
          ['What it uses Kafka for', 'To read input, to write output, to keep **state** safe (in changelog topics), and to coordinate (in a consumer group). No other system is needed.', 'Kafka is all it needs.'],
          ['What it does well', 'Counting, joining, windows and small services that read and write topics, with exactly-once processing, and no extra cluster to run.', 'Stateful processing on topics.'],
          ['What it does not do', 'It reads and writes **Kafka topics** only. For other sources and sinks you use Connect around it. A job that needs a cluster for heavy batch work, SQL over many systems or very large state is a job for Flink or Spark.', 'It is about Kafka in, Kafka out.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The interview sentence:', t: 'Kafka Streams is a client library, so a Streams application is an ordinary program that you deploy like any other. It scales and recovers through Kafka itself.' }
      }),

      B.code({
        id: 'm12-code', t: 1, src: 'rec', title: 'A topology in nine lines', file: 'StoreCounts.java', lang: 'java', code: BUILD,
        steps: [
          { say: 'This is the core of a real application that I ran. It counts orders as they arrive. Press Next.', lines: null },
          { say: '`builder.stream("orders-s")` says: read the topic `orders-s`. Everything after it is a chain of steps on the stream of records.', lines: G.span(BUILD, /var orders = builder/) },
          { say: '`groupByKey` puts the records of one key together. The key of an order is its store, so all the orders of one store meet. `windowedBy` cuts time into **one minute windows**, and lets a window stay open for **30 seconds of grace** for records that arrive late.', lines: G.span(BUILD, /groupByKey/, /windowedBy/) },
          { say: '`count` keeps a number for each store and window. `Materialized.as(...)` gives the **state store** a name. Then `toStream` turns the table of counts back into a stream of updates, `map` makes a readable key, and `to("order-counts")` writes them to a topic.', lines: G.span(BUILD, /\.count\(Materialized\.as\("orders-per-store-minute"\)\)/, /\.to\("order-counts"\)/) },
          { say: 'The second chain counts orders by **sales channel**. A channel is not the key, so it first calls `selectKey` to **change the key**. That makes Kafka Streams move the records through a new topic, as you will see in the topology.', lines: G.span(BUILD, /orders\.selectKey/, /\.to\("channel-counts"/) }
        ],
        note: 'Recorded: the real source of the application. It was compiled with the Java compiler against the libraries of Apache Kafka ' + G.meta('kafka') + ' and ran on the cluster of mission 1.'
      }),

      B.code({
        id: 'm12-config', t: 2, src: 'rec', title: 'The settings that matter', file: 'StoreCounts.java', lang: 'java', code: CFG,
        steps: [
          { say: 'A few settings decide how the application behaves. Press Next.', lines: null },
          { say: '`application.id` names the application. It is also the name of its **consumer group**, and the **prefix of every internal topic** that it creates. `state.dir` is the folder for local state.', lines: G.span(CFG, /APPLICATION_ID_CONFIG/, /STATE_DIR_CONFIG/) },
          { say: '`processing.guarantee` is **exactly_once_v2**. The default is `at_least_once`. This is the one setting that decides whether a crash can repeat a count.', lines: G.span(CFG, /PROCESSING_GUARANTEE_CONFIG/) },
          { say: 'I set the commit interval to 300 ms, and the cache to zero bytes, **only so that the lesson can see every step**. By default the cache is 10 MiB, which merges updates of the same key before they are sent on, so you see far fewer output records.', lines: G.span(CFG, /COMMIT_INTERVAL_MS_CONFIG/, /STATESTORE_CACHE_MAX_BYTES_CONFIG/) },
          { say: 'The default serdes (serializers and deserializers) say that keys and values are strings. A step that needs another type names its own.', lines: G.span(CFG, /DEFAULT_KEY_SERDE_CLASS_CONFIG/, /DEFAULT_VALUE_SERDE_CLASS_CONFIG/) }
        ],
        note: 'Recorded: the settings of the run. The defaults named here (exactly_once_v2 is not the default, a 10 MiB cache) are read from the Streams configuration page in the documentation that ships with Apache Kafka ' + G.meta('kafka') + '.'
      }),

      B.term({
        id: 'm12-topology', t: 1, src: 'rec', title: 'The topology that Streams printed',
        say: 'Before it starts, Kafka Streams can **describe** what it will do. This is the real output for the application. Press Next.',
        lines: G.plain(TP, { cmd: 'topology.describe()' }),
        after: 'Read it from the top. **Sub-topology 0** reads `orders-s` and has two branches: the windowed aggregate with its state store `orders-per-store-minute`, and a key select that feeds a **repartition** sink. **Sub-topology 1** reads that repartition topic and counts by channel into the store `orders-per-channel`.',
        afterKind: 'tip',
        doneSay: 'Two sub-topologies, joined by a topic. Each runs as its own set of tasks.'
      }),

      B.flow({
        id: 'm12-flow', t: 1, src: 'docs', title: 'How a record travels', g: 'streams', legend: true,
        steps: [
          { say: 'This is the path of one record through the application. Press Next.', cap: 'A record, step by step.' },
          { say: 'Step 1. A record arrives on the **input topic**. A task reads it from one partition.', on: ['k1'], focus: ['s_in', 's_agg'], cap: 'A task reads a partition.' },
          { say: 'Step 2. The **aggregate** finds the window of the record, adds one to its count, and keeps the count in a **state store**: a small local database, RocksDB, on the disk of the application.', on: ['k2'], focus: ['s_agg', 's_store'], cap: 'The count goes into a local store.' },
          { say: 'Step 3. Every change to the store is **also written to a changelog topic** in Kafka. This is the backup. If the machine dies, another copy of the application rebuilds the store from the changelog.', on: ['k3'], focus: ['s_store', 's_log'], cap: 'The changelog is the backup.' },
          { say: 'Step 4. The new count goes to the **output topic**.', on: ['k4'], focus: ['s_agg', 's_out'], cap: 'An update goes out.' },
          { say: 'Step 5. When a step needs a **new key**, Streams sends the records through a **repartition topic**, so that all records with the new key meet in one task.', on: ['k5'], focus: ['s_agg', 's_rep'], cap: 'A new key needs a repartition.' },
          { say: 'Step 6. With **exactly-once**, the state, the output and the position in the input are committed in **one transaction**. A crash repeats nothing.', on: ['k6'], focus: ['s_out', 's_eos'], cap: 'One transaction for all three.' },
          { say: 'Step 7. A record that arrives **late**, after the window is closed, is dropped, and a metric counts it.', on: ['k7'], focus: ['s_late', 's_agg'], cap: 'Too late: dropped.' }
        ]
      }),

      B.rows({
        id: 'm12-counts', t: 1, src: 'rec', title: 'The counts are right',
        steps: [
          {
            say: 'I produced **' + CC.orders_in + ' orders** with event times spread over **' + CC.minutes_of_event_time + ' minutes**, and let the application count them. Then I read the output topic as a consumer that sees only committed transactions, took the last value of each key, and compared it with a count made in Python.',
            tabs: [{ layer: 'RECORDED', name: 'Checking the windowed count', c: 'raw', cols: ['Measure', 'Value'], rows: [['Orders in', CC.orders_in], ['Windows with a count (store and minute)', CC.windows_with_a_count], ['Windows expected', CC.expected_windows], ['Every count equals the count made in Python', CC.every_count_is_right ? 'yes' : 'no'], ['Records in the output topic', CC.records_in_the_output_topic]], trk: 3 }],
            notes: ['Recorded. There are ' + CC.records_in_the_output_topic + ' output records for ' + CC.orders_in + ' input records: one **update** for each input record, because I turned the cache off. The last value of each key is the answer.']
          },
          {
            say: 'This is the count of one store, `s01`, by minute of event time. The minute is the minute in the **record**, not the minute when the application ran. This is **event time**.',
            tabs: [{ layer: 'RECORDED', name: 'Orders of store s01 by minute', c: 'raw', cols: BM.cols, rows: BM.rows }],
            notes: ['Recorded. The records were sent in one burst, and the counts follow the times inside the records, not the time of the run. Send the same records again, even a day later, and the counts are the same.']
          },
          {
            say: 'The second chain counts by **channel**: `app`, `counter`, `web`. A count by a new key needed a repartition. The result is also right, and the values are **8 byte numbers**, because I told that step to write longs.',
            tabs: [{ layer: 'RECORDED', name: 'Orders by channel', c: 'raw', cols: ['Channel', 'Orders'], rows: Object.keys(CN.counts).map(function (k) { return [k, CN.counts[k]]; }) }],
            notes: ['Recorded: every count equals the count made in Python: ' + (CN.every_count_is_right ? 'yes' : 'no') + '. The value of each record is ' + CN.value_bytes + ' bytes.']
          }
        ]
      }),

      B.rows({
        id: 'm12-internal', t: 1, src: 'rec', title: 'What Streams made in the cluster',
        steps: [
          {
            say: 'I never created a topic for the state or the repartition. Kafka Streams created **three topics** by itself, all named with the application id first. Two are **changelogs** that back up the state stores, and one is the **repartition topic**.',
            tabs: [{ layer: 'RECORDED', name: 'The internal topics', c: 'raw', cols: IT.cols, rows: IT.rows }],
            notes: ['Recorded: read with the admin client and the configuration tool. The changelogs are **compacted** (mission 8): only the latest value of each key matters. The windowed one is also `delete`, so that old windows go away.']
          },
          {
            say: 'Look at the **copies** column. It says **' + copies + '**. Kafka Streams did not set a replication factor, so these topics took the **broker default**, and the broker default of this cluster is ' + copies + '. **One copy of the backup of your state is not a backup.** On a production cluster, set `replication.factor` in the Streams settings (its default is -1, meaning "use the broker default") or set the broker default.',
            tabs: [{ layer: 'RECORDED', name: 'The same topics, and the one setting to check', c: 'raw', cols: ['Topic', 'Copies', 'Safe in production?'], rows: IT.rows.map(function (r) { return [r[0], r[2], Number(r[2]) >= 3 ? 'yes' : 'no: a lost broker loses the backup']; }) }],
            notes: ['Recorded. The default of `replication.factor` is from the Streams configuration page of the Apache Kafka ' + G.meta('kafka') + ' documentation. A real cluster usually sets a broker default of 3, and then this problem does not appear.']
          }
        ]
      }),

      B.rows({
        id: 'm12-disk', t: 2, src: 'rec', title: 'The state on the disk of the application',
        steps: [
          {
            say: 'The state stores are **local files**. The folder of the application has one subfolder for each **task**. A task is a pair: the number of the sub-topology, and the number of the partition. Sub-topology 0 and 1, with three partitions each, make **' + SD.task_folders.length + ' tasks**.',
            tabs: [{ layer: 'RECORDED', name: 'The task folders', c: 'raw', cols: ['Folder', 'Meaning'], rows: SD.task_folders.map(function (f) { return [f, 'sub-topology ' + f.split('_')[0] + ', partition ' + f.split('_')[1]]; }) }],
            notes: ['Recorded. The task is the unit of work: one task is one thread\'s share of one partition. More copies of the application share the tasks.']
          },
          {
            say: 'Inside a task folder are the **RocksDB** files of its stores. For the windowed store there is a **segment** for each stretch of time. When the window is old enough, its segment is deleted whole.',
            tabs: [{ layer: 'RECORDED', name: 'Inside the first task', c: 'raw', cols: ['Path under the state folder'], rows: ST.split('\n').map(function (l) { return [l]; }) }],
            notes: ['Recorded: the folders of task 0_0. There are also a lock file and a file that records the process: `' + SD.files_of_note.join('`, `') + '`.']
          },
          {
            say: 'Streams also created the **consumer group** `store-counts` and ' + GT.transactional_ids + (GT.transactional_ids === 1 ? ' **transactional id**' : ' **transactional ids**') + ', which is what exactly-once processing uses, as in mission 7. With `exactly_once_v2` there is one for each stream thread, and this application has one thread.',
            tabs: [{ layer: 'RECORDED', name: 'Group and transactions', c: 'raw', cols: ['What', 'Result'], rows: [['The consumer group named by the application id exists', GT.consumer_group_exists ? 'yes' : 'no'], ['Transactional ids of the application', GT.transactional_ids]] }],
            notes: ['Recorded: `kafka-consumer-groups --list` and `kafka-transactions list`.']
          }
        ]
      }),

      B.widget({ id: 'm12-lab', kind: 'streamlab', t: 1, src: 'rec', title: 'Lab: windows, grace and late records' }),

      B.rows({
        id: 'm12-late', t: 1, src: 'rec', title: 'Records that arrive late',
        steps: [
          {
            say: 'A window is one minute of **event time**, and it stays open for **' + LT.grace_seconds + ' seconds** of grace. I sent two records after the newest one. The first was **20 seconds older** than the newest record: its minute is still open. The second was **five seconds into the very first minute**, which closed long ago.',
            tabs: [{ layer: 'RECORDED', name: 'Two late records', c: 'raw', cols: ['Record', 'Window', 'Count before', 'Count after', 'Counted?'], rows: [['20 seconds late', 'still open', LT.count_of_that_window[0], LT.count_of_that_window[1], LT.record_20_seconds_late_counted ? 'yes' : 'no'], ['about ten minutes late', 'closed long ago', LT.count_of_the_closed_window[0], LT.count_of_the_closed_window[1], LT.record_in_a_closed_window_counted ? 'yes' : 'no']] }],
            notes: ['Recorded. The clock that closes a window is the **largest event time seen so far** (stream time), not the clock on the wall.']
          },
          {
            say: 'The second record was **dropped**, and Kafka Streams counted the drop. The metric `dropped-records-total` is **' + LT.dropped_records_metric + '**. Nothing else tells you: no error, no log line at the default level. A late record is lost quietly unless you read that metric.',
            tabs: [{ layer: 'RECORDED', name: 'The metric', c: 'raw', cols: ['Metric', 'Value'], rows: [['dropped-records-total (all tasks, read from the running application)', LT.dropped_records_metric]] }],
            notes: ['Recorded: read through `streams.metrics()` in the application, once a second. Put this metric on a dashboard, and alert when it rises.']
          },
          {
            say: 'The **grace** is a trade. A longer grace counts more of the late records, and delays the final answer, and keeps more state. A shorter one is faster and drops more. You choose it from how late your records really arrive, which you can measure.',
            tabs: [{ layer: 'RECORDED', name: 'The choice', c: 'raw', cols: ['Grace', 'Late records', 'Result is final after', 'State kept'], rows: [['short', 'more are dropped', 'sooner', 'less'], ['long', 'fewer are dropped', 'later', 'more']] }],
            notes: ['The first two lines are the recording above. The table is the trade that follows from it.']
          }
        ]
      }),

      B.rows({
        id: 'm12-restart', t: 1, src: 'rec', title: 'Stop it, delete its state, start it again',
        steps: [
          {
            say: 'Two experiments. First I **stopped** the application and started it again. The output topic held **' + RS.output_records_before_the_restart + '** records before, and **' + RS.output_records_after_the_restart + '** after. **Nothing was processed twice**, because the position in the input was committed in the same transaction as the output.',
            tabs: [{ layer: 'RECORDED', name: 'A restart', c: 'raw', cols: ['Measure', 'Value'], rows: [['Output records before the restart', RS.output_records_before_the_restart], ['Output records after the restart', RS.output_records_after_the_restart], ['Nothing was processed twice', RS.nothing_was_processed_twice ? 'yes' : 'no']], trk: 2 }],
            notes: ['Recorded. This is **exactly-once**: a crash between the output and the position cannot happen, because they commit together.']
          },
          {
            say: 'Then I stopped it again and **deleted the whole state folder**, as if the machine had been replaced. I started it, and sent one more order. The count was **' + RS.count_after_the_state_was_deleted_and_one_more_order + '**: it had continued from **' + RS.count_of_the_window_after_three_new_orders + '**. The application had **rebuilt its stores from the changelog topics**.',
            tabs: [{ layer: 'RECORDED', name: 'A restart without the state', c: 'raw', cols: ['Measure', 'Value'], rows: [['Count of the window after three new orders', RS.count_of_the_window_after_three_new_orders], ['Count after the state was deleted, and one more order', RS.count_after_the_state_was_deleted_and_one_more_order], ['The count continued from the rebuilt state', RS.the_count_continued_from_the_rebuilt_state ? 'yes' : 'no']], trk: 1 }],
            notes: ['Recorded.']
          },
          {
            say: 'Here is the log of the restore. Streams reads each changelog and puts every record into the new store, and tells you how many it restored.',
            tabs: [{ layer: 'RECORDED', name: 'The restoration log', c: 'raw', cols: ['Line of the log'], rows: RS.restoration_log_lines.map(function (l) { return [l.replace(/store-counts-[0-9a-f-]{36}/, 'store-counts-<id>')]; }) }],
            notes: ['Recorded: lines of the real log. The restore reads the whole changelog, so a big store takes time. **Standby replicas** (`num.standby.replicas`, default 0) keep a warm copy on another instance to cut that time. From the documentation.']
          }
        ]
      }),

      B.cmp({
        id: 'm12-engines', t: 1, src: 'docs', title: 'Kafka Streams, Flink or Spark',
        say: 'Three tools can count orders per minute from a topic. Press Next.',
        cols: ['Question', 'Kafka Streams', 'Apache Flink', 'Spark Structured Streaming'],
        hl: 1,
        rows: [
          ['What is it?', 'A library in your Java program', 'A cluster that runs your jobs', 'A cluster, with the Spark engine of mission 4 to 5'],
          ['Sources and sinks', 'Kafka topics only (use Connect around it)', 'Many connectors', 'Many connectors'],
          ['State', 'RocksDB on local disk, backed up in changelog topics', 'Managed state, checkpoints to a file system', 'State store, checkpoint to a file system'],
          ['Exactly once', 'Yes, between Kafka topics', 'Yes, with the right sinks', 'Yes, with the right sinks'],
          ['Operations', 'Deploy like any app', 'Run and tune a cluster', 'Run and tune a cluster'],
          ['Good fit', 'Small services and counts on topics', 'Large, complex streaming jobs', 'Batch and streaming in one framework']
        ],
        pick: 'If the input and the output are both Kafka topics and the logic is moderate, Kafka Streams is the simplest thing that works. When you need many sources, big state, or SQL across systems, look at Flink or Spark.'
      }),

      B.talk({
        id: 'm12-practice', t: 2, src: 'docs', title: 'Running a Streams application',
        say: 'Six points to know before you put one in production. Press Next.',
        items: [
          ['The application id', 'It is the name of the group and the prefix of the internal topics. Never change it casually: a new id is a **new application**, with no state and no committed positions.', 'Treat it as the identity.'],
          ['Replication of the internal topics', 'Set `replication.factor` to 3, or rely on a broker default of 3. The recording had ' + copies + ' copy of the changelogs.', 'The state backup needs copies.'],
          ['Exactly once', 'Use `exactly_once_v2`. It needs a cluster of three brokers by default, for the transaction log. It lowers the default commit interval to 100 ms.', 'It costs little and removes a class of bugs.'],
          ['Scaling', 'You can run as many instances as there are tasks. More partitions of the input mean more tasks. You cannot add partitions to a running application with state: the keys would move.', 'Plan the partitions.'],
          ['Recovery time', 'A new instance restores its stores from the changelog before it works. Use standby replicas, and keep the state small, to keep that short.', 'Restores take time.'],
          ['Late data', 'Measure how late your records arrive, choose the grace from it, and watch `dropped-records-total`.', 'Late records vanish quietly.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm12-q1', t: 1,
        q: 'What is Kafka Streams?',
        opts: [
          { t: 'A cluster that runs jobs, like Flink', fb: 'That is not what it is.' },
          { t: 'A Java library that you put in your own application, which reads and writes Kafka topics', fb: '' },
          { t: 'A feature of the broker', fb: 'The broker does no processing of this kind.' },
          { t: 'A topic type', fb: 'It is not a type of topic.' }
        ],
        ok: 1,
        why: 'Kafka Streams is a client library. In the recording a plain Java program of ninety lines was the whole processor, and a second copy of it would share the work.'
      }),

      B.quiz({
        id: 'm12-q2', t: 1,
        q: 'Why did Kafka Streams create a repartition topic for the count by channel?',
        opts: [
          { t: 'To back up the state', fb: 'That is the changelog.' },
          { t: 'The key changed to the channel, so records with the same channel have to be brought together in one task', fb: '' },
          { t: 'Because the cache was off', fb: 'The cache is unrelated.' },
          { t: 'Because the topic had too many partitions', fb: 'The partition count is not the reason.' }
        ],
        ok: 1,
        why: 'A count needs all records of a key in one place. The key of the input was the store, so counting by channel meant `selectKey` and a trip through `orders-per-channel-repartition`, as the topology shows.'
      }),

      B.quiz({
        id: 'm12-q3', t: 1,
        q: 'The machine of a Streams application is lost, with its disk. What happens to the state of its stores?',
        opts: [
          { t: 'It is lost for ever', fb: 'It is backed up.' },
          { t: 'It is rebuilt from the changelog topics in Kafka when the application runs again', fb: '' },
          { t: 'It is read from the output topic', fb: 'The output topic is not the state.' },
          { t: 'It is copied from the other brokers by Kafka itself', fb: 'Kafka replicates topics, and the changelog is one.' }
        ],
        ok: 1,
        why: 'The recording deleted the state folder and started the application. It read the changelog and the count continued from ' + RS.count_of_the_window_after_three_new_orders + ' to ' + RS.count_after_the_state_was_deleted_and_one_more_order + '.'
      }),

      B.quiz({
        id: 'm12-q4', t: 2,
        q: 'A record arrives with an event time from ten minutes ago. The window had a grace of 30 seconds. What happens?',
        opts: [
          { t: 'It is counted in the old window', fb: 'The window is closed.' },
          { t: 'It is dropped, and `dropped-records-total` goes up', fb: '' },
          { t: 'It is sent to a dead letter topic automatically', fb: 'You would have to build that.' },
          { t: 'It reopens the window', fb: 'A closed window stays closed.' }
        ],
        ok: 1,
        why: 'The recording counted a record 20 seconds late and dropped one about ten minutes late, with the metric at ' + LT.dropped_records_metric + '. Nothing else warns you.'
      }),

      B.bug({
        id: 'm12-bug', t: 1, q: 'The counts of this application are sometimes too high after a crash. Click the line that allows it.',
        file: 'App.java', lang: 'java',
        code: ['props.put(StreamsConfig.APPLICATION_ID_CONFIG, "store-counts");', 'props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrap);', 'props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG, StreamsConfig.AT_LEAST_ONCE);', 'props.put(StreamsConfig.NUM_STREAM_THREADS_CONFIG, 1);'].join('\n'),
        bad: [3],
        hint: 'What happens to the input position and the output when the application crashes between them?',
        why: 'With `at_least_once` the output and the input position are not committed together. A crash after the output and before the position makes the application read the same records again, and a **count** is increased twice. Use `exactly_once_v2`, which commits the state, the output and the position in one transaction.',
        fix: ['props.put(StreamsConfig.APPLICATION_ID_CONFIG, "store-counts");', 'props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrap);', 'props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG, StreamsConfig.EXACTLY_ONCE_V2);', 'props.put(StreamsConfig.NUM_STREAM_THREADS_CONFIG, 1);'].join('\n'),
        cheer: 'Counts need exactly once.'
      }),

      B.order({
        id: 'm12-ord', t: 1, q: 'Put the life of one record in a Streams application in order.',
        items: [
          'A task reads the record from a partition of the input topic',
          'The aggregate finds the window and adds one to the count in the state store',
          'The change of the store is written to the changelog topic',
          'The new count is written to the output topic',
          'The transaction commits: the state, the output and the input position together',
          'A consumer of the output topic with read_committed sees the new count'
        ],
        why: 'The commit is last, and it covers everything before it. That is why a read_committed reader never sees a count that was later undone.'
      }),

      B.decide({
        id: 'm12-dec', t: 2, src: 'docs', title: 'Decision: where should the order counts be computed',
        scenario: 'You need the number of orders per store per minute, from the `orders` topic, written to another topic that a dashboard reads. The team has no Flink or Spark cluster, and nobody wants to run one. The logic will not grow beyond counts and a few joins. You choose.',
        opts: [
          { t: 'Kafka Streams, in a small service that you deploy like any other', d: 'No new cluster. State is backed up in Kafka. Exactly once between topics.', lose: '' },
          { t: 'A Flink cluster', d: 'Powerful.', lose: 'A cluster to run for a job that a library can do.' },
          { t: 'A nightly batch job in Spark', d: 'Simple to reason about.', lose: 'The dashboard is a day behind.' }
        ],
        pick: 0,
        why: 'The input and the output are Kafka topics, the logic is small, and the team does not want a cluster. That is the fit for Kafka Streams. Remember to set the replication factor of the internal topics.',
        when: 'If the job must read files, call several systems, or run SQL over very large state, Flink or Spark would fit better. Say what would change your answer.'
      }),

      B.incident({
        id: 'm12-inc', t: 1, src: 'rec', title: 'Incident: the counts are lower than the orders', time: '11:30',
        alert: '**The per-minute order counts are a little lower than the number of orders in the database.** The gap is about 1% and varies from day to day. There are no errors in the logs of the Streams application.',
        clues: ['The application windows its counts by event time, with a grace of 30 seconds', 'Some records come from mobile phones that sync in batches when the network returns', 'The metric dropped-records-total is not on any dashboard'],
        opts: [
          { t: 'Read `dropped-records-total`, measure how late the records are, and raise the grace to cover them (or write late records to a side topic)', fb: '' },
          { t: 'Restart the application every night', fb: 'A restart does not bring back dropped records.' },
          { t: 'Switch the cache back on', fb: 'The cache does not drop records.' },
          { t: 'Add more instances', fb: 'More instances do not change lateness.' }
        ],
        best: 0,
        why: 'Records older than the window plus its grace are **dropped quietly**. The recording dropped one and the only trace was the metric. Phones that sync late are a classic source. Measure the delay, choose the grace from it, and put the metric on a dashboard with an alert.',
        checks: [
          ['Read dropped-records-total', 'A number above zero that keeps growing is the answer.'],
          ['Compare event time with the time of arrival for a sample', 'It tells you how long the grace must be.'],
          ['Compare the gap with the share of mobile records', 'If they match, it is lateness.']
        ],
        tell: 'Records from phones arrive after their window had closed, and Streams dropped them without an error. We measured the delay, raised the grace, and alert on the dropped records metric.',
        prevent: ['Put dropped-records-total on a dashboard, with an alert', 'Choose the grace from measured lateness', 'Reconcile the counts with the database every day']
      }),

      B.incident({
        id: 'm12-inc2', t: 2, src: 'rec', title: 'Incident: the restart takes forty minutes', time: '07:05',
        alert: '**After a deploy, the Streams application needed forty minutes before it processed anything.** The input lag grew the whole time. The previous deploy took two minutes. The pods were replaced, so their local disks were empty.',
        clues: ['The application keeps large state stores, with a changelog for each', 'Pods are new on every deploy, with no local disk to keep', 'num.standby.replicas is 0'],
        opts: [
          { t: 'Keep the state on a persistent volume, or run standby replicas, and keep the state small, so that a new instance does not restore the whole changelog', fb: '' },
          { t: 'Delete the changelog topics', fb: 'You would lose the state for good.' },
          { t: 'Lower the commit interval', fb: 'It does not change the restore.' },
          { t: 'Turn off exactly once', fb: 'It is not the cause of the restore time.' }
        ],
        best: 0,
        why: 'A new instance with an empty disk must read the whole changelog before it can process. The recording did exactly this after the state folder was deleted. For a large state it takes long. A persistent volume keeps the files, and standby replicas keep a warm copy elsewhere.',
        checks: [
          ['Read the restoration log', 'It shows each changelog and its record count.'],
          ['Check the size of the changelogs', 'The restore time follows from it.'],
          ['Check where the state folder lives', 'On the pod\'s own disk it is lost with the pod.']
        ],
        tell: 'The new pods had empty disks, so they restored forty minutes of changelog before they could work. We keep the state on persistent volumes and run a standby replica.',
        prevent: ['A persistent volume for the state folder', 'num.standby.replicas of 1', 'A rolling deploy, one instance at a time']
      }),

      B.qa({
        id: 'qa-streams', t: 1, tag: 'Streams', secs: 75,
        q: 'What is Kafka Streams and how does it keep state?',
        pts: ['A library in your application', 'Topology of sources, processors, sinks', 'State store on local disk (RocksDB)', 'Changelog topic as the backup', 'Scales like a consumer group'],
        short: 'Kafka Streams is a **Java library**, so a Streams application is an ordinary program that reads topics, processes records, and writes topics. You describe a **topology**: a source, steps such as filter, map, group and count, and a sink. For stateful steps it keeps a **state store**, RocksDB on local disk, and writes every change to a **changelog topic** in Kafka, which is compacted. If the machine is lost, a new instance **rebuilds the store from the changelog**: in my run I deleted the state folder and the count continued. It scales like a consumer group: instances with the same `application.id` share the partitions as **tasks**.',
        fu: [['What is a repartition topic?', 'When a step changes the key, records are written to an internal topic keyed by the new key so that they meet in one task.'], ['How do you shorten a restore?', 'Standby replicas, persistent volumes, and smaller state.']],
        trap: 'Calling it a cluster, or saying it can read from any database.',
        real: 'Where does the state of a Kafka Streams application live?'
      }),

      B.qa({
        id: 'qa-streams-eos', t: 2, tag: 'Streams', secs: 75,
        q: 'How does exactly-once processing work in Kafka Streams, and what are its limits?',
        pts: ['Read, process, write in one transaction', 'State, output and offset commit together', 'exactly_once_v2', 'read_committed readers', 'Only between Kafka topics'],
        short: 'With `processing.guarantee=exactly_once_v2` a Streams application uses Kafka **transactions**: the writes to the output topics, the writes to the changelogs, and the **commit of the input offsets** happen in **one transaction**. If the application dies before the commit, the transaction aborts and the input is read again, and nothing was seen. Downstream readers must use **`read_committed`**. In my run a restart repeated nothing: 601 output records before and after. The limits: it covers **Kafka to Kafka**. A call to a database or an API inside a step is not covered, so such a step must be idempotent. It also needs three brokers by default for the transaction log, and it shortens the commit interval to 100 ms.',
        fu: [['What was exactly_once, version one?', 'A transactional producer for each task, which does not scale. exactly_once_v2 uses one for each thread.'], ['What does the consumer need?', 'isolation.level=read_committed.']],
        trap: 'Saying that exactly once covers side effects outside Kafka.',
        real: 'Your Streams job writes to a database. Can it be exactly once?'
      }),

      B.qa({
        id: 'qa-window', t: 2, tag: 'Streams', secs: 75,
        q: 'Explain windows, event time and late records.',
        pts: ['Event time is in the record', 'A window is a stretch of event time', 'Grace keeps it open for late records', 'Late records are dropped', 'dropped-records-total'],
        short: '**Event time** is the time stored in the record, when the thing happened, not when the application saw it. A **window** groups records by a stretch of event time, for example one minute. The window stays open for a **grace period** after it ends, because records arrive out of order. The clock that closes it is the highest event time seen so far, **stream time**. In my run a record 20 seconds late was counted, and one ten minutes late was **dropped**, and the only sign was the metric **`dropped-records-total`**. So I choose the grace from the measured lateness, and alert on that metric. A longer grace gives a more complete count, a later final answer, and more state.',
        fu: [['What about a tumbling or hopping window?', 'Tumbling windows do not overlap, hopping ones do, and session windows are cut by gaps of silence.'], ['What if you cannot drop late records?', 'Write them to a side topic, or use a design that corrects results later.']],
        trap: 'Mixing up event time and processing time.',
        real: 'Counts from mobile devices are lower than the database. Why?'
      }),

      B.recap({
        id: 'm12-recap', n: 12, badge: 'Stream Builder', color: '#FDE68A',
        pts: [
          '**Kafka Streams** is a **Java library**. Your application is the processor. Instances with the same **application id** share the work as **tasks**.',
          'A **topology** has sources, processors and sinks. A step that changes the key adds a **repartition topic** and a second **sub-topology**.',
          '**State** lives in a store on local disk, backed up in a compacted **changelog topic**. Delete the disk and it is **rebuilt**: the recording continued its count.',
          'The internal topics had **' + copies + ' copy** because the application did not set `replication.factor`. Set it to 3.',
          '**Windows** work on **event time**. A record inside the **grace** is counted, a later one is **dropped** and only `dropped-records-total` shows it.',
          '**exactly_once_v2** commits state, output and input position in **one transaction**: a restart repeated nothing. It covers Kafka to Kafka only.'
        ]
      })
    ]
  });
})();
