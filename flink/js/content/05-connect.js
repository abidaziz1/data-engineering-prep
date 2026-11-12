/* Mission 5: connectors. Kafka as a source (where it starts, what a record carries) and as a sink (a keyed topic with deletes), files that become visible when a checkpoint completes, and change
   data capture with the Flink CDC connector against a real PostgreSQL 16. Real Apache Flink 2.2.1, Kafka connector 5.0.0-2.2, Flink CDC 3.7.0-2.2 and Apache Kafka 4.4.0. */
(function () {
  var B = LAB.b, G = LAB.get;
  var TP = G.counts('connect.topic'), ST = G.table('connect.startup_modes'), MD = G.table('connect.metadata'), UT = G.table('connect.upsert_topic'), US = G.counts('connect.upsert_summary');
  var FL = G.counts('connect.files'), FR = G.counts('connect.files_rows'), CF = G.counts('cdc.flink_cdc_summary_full'), CD = G.counts('cdc.flink_cdc_summary_default');
  var CO = G.text('cdc.flink_cdc_output_full'), CDO = G.text('cdc.flink_cdc_output_default'), DI = G.counts('world.distribution');
  var SCM = G.file('sql/connect_meta.sql'), SCU = G.file('sql/connect_upsert.sql'), SCC = G.file('sql/cdc_direct_full.sql'), SCF = G.file('sql/connect_files.sql');
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  var mode = function (m) { var r = ST.rows.filter(function (x) { return x[0] === m; })[0]; G.expect(!!r, 'startup mode ' + m); return r[2]; };
  G.expect(mode('earliest-offset') === 12 && mode('latest-offset') === 0 && mode('timestamp') === 6 && mode('specific-offsets') === 4, 'rows read by the four startup modes');
  G.expect(US.tombstones === 3 && US.records_in_the_topic === 17 && US.changelog_rows_of_the_query === 25 && US.retractions_not_written === 8, 'the keyed topic holds 17 records, 3 of them deletes, and none of the 8 retractions');
  G.expect(FL.hidden_before === true && FL.visible_after === true && FR.rows_in_visible_files > 0, 'files are hidden until a checkpoint, then visible');
  G.expect(CF.kinds.length === 4 && CF.snapshot_rows === 5 && CF.job_state === 'RUNNING' && CF.replica_identity === 'full', 'Flink CDC sends the snapshot, then inserts, updates and deletes');
  G.expect(CD.job_state === 'RESTARTING' && /REPLICA IDENTITY/.test(CD.error) && CD.failures_recorded >= 2, 'the default replica identity fails the job, again and again');
  var lines = CO.split('\n');
  var cdcDup = CDO.split('\n').filter(function (l) { return /^\+I\[6,/.test(l); }).length;
  G.expect(cdcDup >= 2, 'the insert of order 6 is printed more than once after the restarts');

  LAB.addChapter({
    id: 'm5', n: 5, title: 'Connectors and change data capture', short: 'Connect', blurb: 'Kafka in and out, files that commit on a checkpoint, and PostgreSQL changes with Flink CDC', minutes: 40,
    focus: ['con', 'raw'],
    goals: [
      'Name the parts of a **connector**: the table options, the format, and what it commits on a checkpoint.',
      'Choose where a **Kafka source** starts, and read the **metadata** of a record.',
      'Write a changelog into Kafka with **upsert-kafka**, and say what a **tombstone** is.',
      'Say why **files** only become visible when a **checkpoint** completes.',
      'Use **Flink CDC** to follow PostgreSQL, and fix the **replica identity** error.'
    ],
    say: 'Mission 5 is how Flink meets the rest of the platform. A job is only as useful as its sources and sinks. I read a real Kafka topic from four different starting points, wrote a changelog into a keyed topic with deletes, watched files appear only after a checkpoint, and then pointed the Flink CDC connector at a real PostgreSQL and changed its rows. Press Next.',
    scenes: [
      B.talk({
        id: 'm5-parts', t: 1, src: 'docs', title: 'What a connector is made of',
        say: 'Four things make a connector. Press Next.',
        items: [
          ['A table with options', 'In SQL a connector is a **table** whose `WITH` clause names it: `\'connector\' = \'kafka\'`, a topic, a server. The rest of the query does not know where the rows come from.', 'A table is a door.'],
          ['A format', 'The format turns bytes into columns and back: JSON, CSV, Avro, Debezium JSON. The distribution has JSON and CSV built in. Here the file listing of its lib folder: ' + DI.lib.filter(function (x) { return !/log4j/.test(x); }).map(function (x) { return x.replace('-2.2.1.jar', ''); }).join(', ') + '.', 'A format reads bytes.'],
          ['The connector jar', 'Kafka and change data capture are not in the distribution. They are separate jars (' + G.meta('kafka-connector') + ' and ' + G.meta('flink-cdc') + ' in this course) that you put in the lib folder or add to the job.', 'Add the jar for the system.'],
          ['What it commits', 'A source stores its position in the checkpoint. A sink either writes at once, or holds its writes until a checkpoint completes. The second kind is how exactly-once works, and how files become visible.', 'Position and commit go with the checkpoint.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The interview sentence:', t: 'A connector is a table with options and a format. A source keeps its position in the checkpoint, and a sink that supports exactly-once commits its writes when the checkpoint completes.' }
      }),

      B.rows({
        id: 'm5-start', t: 1, src: 'rec', title: 'Where a Kafka source starts',
        steps: [
          {
            say: 'A topic with ' + TP.partitions + ' partitions and ' + TP.orders + ' orders, with the times of the Kafka course. A query that counts the rows reads **different amounts** depending on `scan.startup.mode`. `earliest-offset` reads everything. `latest-offset` reads only what arrives later: here **nothing**.',
            tabs: [{ layer: 'RECORDED', name: 'The same count with four startup modes', c: 'raw', cols: ST.cols, rows: ST.rows, trk: 1 }],
            notes: ['Recorded. The queries were bounded (<code>scan.bounded.mode</code> latest-offset) so that each count finished. A streaming COUNT(*) prints no row at all when nothing arrives.']
          },
          {
            say: 'The `timestamp` mode starts at the first record at or after a time, here the time of order 7. It read **' + mode('timestamp') + '** rows. `specific-offsets` starts at offsets you give for each partition. A job that is restored from a checkpoint or a savepoint ignores all of these: its positions come from the saved state.',
            tabs: [{ layer: 'RECORDED', name: 'Orders in each partition', c: 'raw', cols: ['Partition', 'Orders'], rows: Object.keys(TP.orders_per_partition).map(function (p) { return [p, TP.orders_per_partition[p]]; }), trk: 0 }],
            notes: ['Recorded. The producer put 3 orders in partition 0 and 9 in partition 1, by the hash of the store.']
          }
        ]
      }),

      B.sql({
        id: 'm5-meta', t: 1, src: 'rec', title: 'The metadata of a Kafka record', file: 'connect_meta.sql', code: SCM,
        steps: [
          { say: 'A Kafka record carries more than its value: a partition, an offset, a timestamp, headers. The connector can expose them as columns. Press Next.', lines: null },
          { say: 'Three **metadata columns**. `VIRTUAL` means that the column is read from the record and is never written back.', lines: G.span(SCM, /part INT METADATA/, /kts TIMESTAMP_LTZ/) },
          { say: 'And a query that selects them with the order.', lines: G.span(SCM, /SELECT order_id/), run: true }
        ],
        result: { cols: MD.cols, rows: MD.rows, msg: MD.rows.length + ' orders with their Kafka metadata' },
        note: 'Recorded. The timestamps are the made-up times of the orders, one second apart. The partitions are where the producer put each store.'
      }),

      B.sql({
        id: 'm5-upsert', t: 1, src: 'rec', title: 'A changelog into a keyed Kafka topic', file: 'connect_upsert.sql', code: SCU,
        steps: [
          { say: 'The count of counts from mission 2, sent into a Kafka topic with a **key**. Press Next.', lines: null },
          { say: 'An **upsert-kafka** table needs a primary key. The key becomes the key of the Kafka record, so the topic can be compacted to the last value of each key.', lines: G.span(SCU, /CREATE TEMPORARY TABLE stores_per_count/, /value\.format/) },
          { say: 'The query: how many stores have each count.', lines: G.span(SCU, /INSERT INTO/), run: true }
        ],
        result: { cols: UT.cols, rows: UT.rows, msg: US.records_in_the_topic + ' records in the topic' },
        note: 'Recorded. The query sent ' + US.changelog_rows_of_the_query + ' changes. The topic holds ' + US.records_in_the_topic + ' records: the ' + US.retractions_not_written + ' retractions (-U) are not written, and every delete became a record with a key and **no value**.'
      }),

      B.rows({
        id: 'm5-tomb', t: 1, src: 'rec', title: 'A delete is a record with no value',
        steps: [{
          say: 'Look at the three rows whose value is `null (a tombstone)`. In Kafka a record with a key and a null value is a **tombstone**: on a compacted topic it tells the broker to forget the key. This is how a Flink delete (**-D**) reaches Kafka. A reader that builds a table from the topic must treat the null as "remove this key", as you saw in the Kafka course.',
          tabs: [{ layer: 'RECORDED', name: 'The records of the topic, with their keys', c: 'raw', cols: UT.cols, rows: UT.rows, trk: UT.rows.map(function (r) { return r[2]; }).indexOf('null (a tombstone)') }],
          notes: ['Recorded. ' + US.tombstones + ' tombstones in ' + US.records_in_the_topic + ' records. Without a primary key Flink would refuse to write this query to an upsert sink.']
        }]
      }),

      B.sql({
        id: 'm5-files', t: 1, src: 'rec', title: 'Files that become visible on a checkpoint', file: 'connect_files.sql', code: SCF,
        steps: [
          { say: 'A job that writes a stream to CSV files, with a checkpoint every ' + FL.checkpoint_interval_seconds + ' seconds. Press Next.', lines: null },
          { say: 'The sink is the **filesystem** connector with the CSV format.', lines: G.span(SCF, /CREATE TEMPORARY TABLE sink/) },
          { say: 'While the job runs, I listed the folder at two moments. Before the first checkpoint there is **one hidden file**, whose name starts with a dot and ends in `inprogress`. After checkpoints there are **finished** files next to the hidden one that is still being written.', lines: G.span(SCF, /INSERT INTO sink/), run: true }
        ],
        result: { cols: ['Moment', 'Files in the folder'], rows: [['Before the first checkpoint', FL.before_the_first_checkpoint.join('\n')], ['After the checkpoints', FL.after_checkpoints.join('\n')]], msg: n0(FR.rows_in_visible_files) + ' rows in the visible files' },
        note: 'Recorded. The documentation says that pending files become finished on the next checkpoint. A reader of the folder sees only the finished files, and they hold ' + n0(FR.rows_in_visible_files) + ' rows. Without checkpoints on, a streaming file sink never finishes a file.'
      }),

      B.flow({
        id: 'm5-cdc', t: 1, src: 'docs', title: 'Change data capture into Flink', g: 'cdc', legend: true,
        steps: [
          { say: 'Two ways to follow a database from Flink. Press Next.', cap: 'Read the log of PostgreSQL.' },
          { say: 'Step 1. PostgreSQL writes every change to its **write-ahead log**. A **replication slot** keeps the log from being deleted until a reader has confirmed it.', on: ['k1'], focus: ['q_pg', 'q_slot'], cap: 'The database logs every change.' },
          { say: 'Step 2. The **Flink CDC source** reads from the slot. It first takes a **snapshot** of the table, then follows the log.', on: ['k2'], focus: ['q_slot', 'q_cdc'], cap: 'A snapshot, then the log.' },
          { say: 'Step 3. The job gets a **changelog** of the table: +I for each row of the snapshot, then the inserts, updates and deletes as they happen.', on: ['k3'], focus: ['q_cdc', 'q_job'], cap: 'A changelog for the job.', tags: ['tg_rid'] },
          { say: 'Step 4. The other way: Debezium, on Kafka Connect, reads the same slot.', on: ['k4'], focus: ['q_slot', 'q_dbz'], cap: 'Debezium reads the slot.' },
          { say: 'Step 5. It writes change events into a Kafka topic, in the format you met in the Kafka course.', on: ['k5'], focus: ['q_dbz', 'q_top'], cap: 'Events in a topic.' },
          { say: 'Step 6. Flink reads the topic with the `debezium-json` format, which turns the events back into a changelog. The topic can feed other readers as well.', on: ['k6'], focus: ['q_top', 'q_job'], cap: 'The job reads the topic.' }
        ]
      }),

      B.sql({
        id: 'm5-cdcsql', t: 1, src: 'rec', title: 'Flink CDC against a real PostgreSQL', file: 'cdc_direct_full.sql', code: SCC,
        steps: [
          { say: 'A PostgreSQL 16 server with a table of five orders, and the script that follows it. Press Next.', lines: null },
          { say: 'The source is **postgres-cdc**. It names the server, the database, the table, a replication slot, and the decoding plugin, `pgoutput`, which PostgreSQL ships with. The key is declared for Flink; PostgreSQL has one too.', lines: G.span(SCC, /CREATE TEMPORARY TABLE pg_orders/, /scan\.incremental/) },
          { say: 'A print sink and the query that copies the table into it.', lines: G.span(SCC, /INSERT INTO shown/), run: true }
        ],
        result: { cols: ['What the print sink wrote'], rows: lines.map(function (l) { return [l]; }), msg: lines.length + ' changes' },
        note: 'Recorded. The first five lines are the **snapshot** of the table. Then I inserted order 6, updated order 2 to refunded and deleted order 3 in PostgreSQL. The slot shows <code>' + CF.slot + '</code>.'
      }),

      B.rows({
        id: 'm5-cdcout', t: 1, src: 'rec', title: 'The changes of the database, as a changelog',
        steps: [{
          say: 'Read the last four lines. An **insert** in the database is a **+I**. The **update** of order 2 is a **-U** with the old row and a **+U** with the new one. The **delete** of order 3 is a **-D**. This is the same changelog as in mission 2, now fed by a database instead of a query.',
          tabs: [{ layer: 'RECORDED', name: 'What the print sink wrote', c: 'raw', cols: ['Change'], rows: lines.map(function (l) { return [l]; }), trk: lines.length - 3, chg: [[lines.length - 3, 0], [lines.length - 2, 0], [lines.length - 1, 0]] }],
          notes: ['Recorded, with <code>REPLICA IDENTITY FULL</code> on the table. The job state at the end was ' + CF.job_state + '.']
        }]
      }),

      B.rows({
        id: 'm5-ident', t: 1, src: 'rec', title: 'The same job with the default replica identity',
        steps: [
          {
            say: 'Now the table as PostgreSQL creates it, with the **default** replica identity: for an update or a delete, the log carries only the key of the old row, not the whole row. Flink CDC needs the old row for the -U. The job gets the snapshot and the insert, then it **fails**, and the message tells you what to do.',
            tabs: [{ layer: 'RECORDED', name: 'The failure of the job', c: 'raw', cols: ['Message'], rows: [[CD.error]], trk: 0 }],
            notes: ['Recorded. The state of the job was ' + CD.job_state + ': it fails, restarts, and fails again. It had failed ' + CD.failures_recorded + ' times when I looked.']
          },
          {
            say: 'Look at the output. The insert of order 6 appears **' + cdcDup + ' times**. Each restart reads the log again from the last saved position, which was before that insert, so it prints it again, and then fails on the update. The restart loop turns one failing record into duplicates.',
            tabs: [{ layer: 'RECORDED', name: 'What the print sink wrote', c: 'raw', cols: ['Change'], rows: CDO.split('\n').map(function (l) { return [l]; }), trk: 6 }],
            notes: ['Recorded. The fix is one line in PostgreSQL: <code>ALTER TABLE public.orders REPLICA IDENTITY FULL</code>, as the message says. The Kafka course shows the same setting on the Debezium side.']
          }
        ]
      }),

      B.cmp({
        id: 'm5-ways', t: 2, src: 'docs', title: 'Two ways to follow a database',
        say: 'Flink CDC directly, or Debezium through Kafka. Both work, with different consequences. Press Next.',
        cols: ['', 'Flink CDC connector', 'Debezium, Kafka, Flink'],
        hl: 1,
        rows: [
          ['Moving parts', 'The job and the database', 'Kafka Connect, Debezium, Kafka, then the job'],
          ['Readers of the changes', 'Only this job', 'Any consumer of the topic, and replay'],
          ['The replication slot', 'Held by the Flink job', 'Held by the connector'],
          ['Failure of the job', 'The slot keeps the log, which fills the disk if the job stays down', 'Kafka holds the events, and the connector keeps reading'],
          ['Good for', 'One consumer, a quick pipeline', 'Many consumers, a platform of events']
        ],
        steps: [
          { upto: 2, say: 'Fewer parts with the connector. Kafka in the middle gives every other team a copy of the changes.' },
          { upto: 4, say: 'The slot is the same danger in both cases: a reader that stops makes the database keep its log. In the Kafka course a stopped connector held back the log of a real PostgreSQL.' },
          { upto: 5, say: 'Pick by how many readers there will be next year. A job descriptions that names Debezium and Kafka usually describes the second.' }
        ],
        pick: 'Comparison from the connector documentation and from the two recordings of this course (this mission, and the Kafka course for the Debezium side). I did not run Debezium for this course.'
      }),

      B.cmp({
        id: 'm5-lake', t: 2, src: 'docs', title: 'Where the results go: lake table formats',
        say: 'Many jobs write to a lake table instead of a topic or a file. Press Next.',
        cols: ['Format', 'What it adds to files', 'With Flink'],
        hl: 0,
        rows: [
          ['Apache Iceberg', 'Snapshots, schema changes and a table spec on object storage; many engines can read it', 'A Flink sink writes data files and commits a snapshot when a checkpoint completes'],
          ['Apache Paimon', 'A table format built for streaming: primary keys, merging rows, and changelog reads', 'Designed around Flink; it also commits on a checkpoint'],
          ['Delta Lake and Apache Hudi', 'Transaction logs for tables of files, with updates and deletes', 'Connectors exist for Flink; check the version you need']
        ],
        steps: [
          { upto: 1, say: 'Iceberg is the one that job descriptions ask for most: many engines, one table. The Flink sink follows the same rule as the file sink you just saw: write files continuously, publish them with a checkpoint.' },
          { upto: 2, say: 'Paimon came out of the Flink project for streaming updates by key, and it can be read as a changelog again. The Flink documentation uses a Paimon table in its time-travel example.' },
          { upto: 3, say: 'Delta and Hudi have Flink support of different maturity. Look at the compatibility with the Flink version before you promise anything.' }
        ],
        pick: 'I did not run any of these. The statements come from what the Flink documentation says about committers and the file sink, and from the public documentation of the projects. Check the version table of each project for Flink 2.x.'
      }),

      B.quiz({
        id: 'm5-q1', t: 1,
        q: 'A job starts with scan.startup.mode = latest-offset on a topic that holds 12 orders and nobody writes to it. How many rows does a count read?',
        opts: [
          { t: 'None: it starts at the end', fb: '' },
          { t: '12, because the topic has them', fb: 'That is earliest-offset.' },
          { t: '6, half of them', fb: 'The recording read 6 with a timestamp that fell in the middle, not with latest.' },
          { t: 'The job fails because nothing is there', fb: 'A source that has nothing to read simply waits.' }
        ],
        ok: 0,
        why: 'latest-offset starts at the end of every partition at the moment the job starts. In the recording the count read 0 rows with that mode and 12 with earliest-offset.'
      }),

      B.quiz({
        id: 'm5-q2', t: 1,
        q: 'What reaches a compacted Kafka topic when an upsert-kafka sink gets a -D for a key?',
        opts: [
          { t: 'A record with that key and a null value', fb: '' },
          { t: 'A record with the old value and a delete flag', fb: 'The sink writes no flag. The null value is the delete.' },
          { t: 'Nothing: deletes are ignored', fb: 'In the recording three deletes became three tombstones.' },
          { t: 'The whole topic is cleared', fb: 'Only the key is affected.' }
        ],
        ok: 0,
        why: 'A tombstone is a record with a key and a null value. In the recording three of the seventeen records were tombstones, and the eight retractions (-U) were not written at all.'
      }),

      B.quiz({
        id: 'm5-q3', t: 2,
        q: 'Your Flink CDC job from PostgreSQL fails on the first UPDATE, and then restarts again and again. What do you check first?',
        opts: [
          { t: 'The replica identity of the table', fb: '' },
          { t: 'The checkpoint interval', fb: 'Checkpoints decide where a restart begins, not why the update fails.' },
          { t: 'The number of TaskManagers', fb: 'Capacity is not the problem.' },
          { t: 'The Kafka topic of the sink', fb: 'There is no Kafka topic in this path.' }
        ],
        ok: 0,
        why: 'With the default replica identity the log carries only the key of an old row, and the connector needs the whole row for the -U. The recorded message names the fix: REPLICA IDENTITY FULL.'
      }),

      B.bug({
        id: 'm5-bug', t: 1, q: 'This job writes the count of orders for each store into a Kafka topic with the upsert connector, and the planner refuses it. Click the line that is missing.',
        file: 'sink.sql', lang: 'sql',
        code: ["CREATE TEMPORARY TABLE counts (", "  store_id STRING,", "  n BIGINT", ") WITH ('connector' = 'upsert-kafka', 'topic' = 'counts', 'properties.bootstrap.servers' = 'broker:9092', 'key.format' = 'json', 'value.format' = 'json');"].join('\n'),
        bad: [3],
        hint: 'What does an upsert sink need to know about a row?',
        why: 'An upsert-kafka table needs a primary key, because the key of the Kafka record is built from it. Add `PRIMARY KEY (store_id) NOT ENFORCED`. Flink does not check the key against the data (that is what NOT ENFORCED says); it trusts you.',
        fix: ["CREATE TEMPORARY TABLE counts (", "  store_id STRING,", "  n BIGINT,", "  PRIMARY KEY (store_id) NOT ENFORCED", ") WITH ('connector' = 'upsert-kafka', 'topic' = 'counts', 'properties.bootstrap.servers' = 'broker:9092', 'key.format' = 'json', 'value.format' = 'json');"].join('\n'),
        cheer: 'An upsert needs a key.'
      }),

      B.order({
        id: 'm5-ord', t: 1, q: 'Put in order what a streaming file sink does with its files.',
        items: [
          'It writes records into a hidden in-progress file',
          'A checkpoint barrier arrives and the sink remembers the file as pending',
          'The checkpoint completes',
          'The file is renamed so that readers see it'
        ],
        why: 'The hidden name protects readers from half-written files. The rename happens only after the checkpoint, so a failure before it simply leaves the file to be discarded and rewritten. In the recording the first file was hidden before any checkpoint and finished afterwards.'
      }),

      B.incident({
        id: 'm5-inc', t: 2, src: 'rec', title: 'Incident: PostgreSQL is running out of disk, and the Flink job has been down for two days', time: '07:30',
        alert: '**The disk of the orders database is almost full. The write-ahead log is growing, and nothing has been cleaned.** The only thing that changed is that a Flink CDC job, which reads the database, was stopped for a deploy two days ago and never restarted.',
        clues: ['The WAL is retained for a replication slot', 'The slot belongs to the Flink CDC job', 'The job is not running'],
        opts: [
          { t: 'Restart the job so that it consumes the log, and alert on the lag of every replication slot; drop the slot only if the job is retired', fb: '' },
          { t: 'Delete the WAL files by hand', fb: 'It corrupts the database.' },
          { t: 'Restart PostgreSQL', fb: 'The slot survives a restart and still holds the log.' },
          { t: 'Turn on REPLICA IDENTITY FULL', fb: 'That increases the size of the log.' }
        ],
        best: 0,
        why: 'A replication slot keeps the log until its reader confirms it. In the recording, a slot named flink_slot was active while the job ran. When the reader stops, the slot stays and the log piles up. The same danger exists with Debezium, and the Kafka course measured it.',
        checks: [['Look at pg_replication_slots', 'Is the slot active, and how far behind is it?'], ['Check the Flink job', 'Is it running?'], ['Look at the disk and the WAL size', 'How fast does it grow?']],
        tell: 'A replication slot holds the log for its reader, and the reader was down. I restart the reader or drop the slot if it is retired, and I alert on the lag of every slot.',
        prevent: ['Alert on the retained WAL of each slot', 'Drop the slot when a pipeline is removed', 'Plan the deploy of a CDC job so that it is down for minutes, not days']
      }),

      B.qa({
        id: 'qa-kafka', t: 1, tag: 'Connectors', secs: 75,
        q: 'How does Flink read from and write to Kafka, and what guarantees does it give?',
        pts: ['Source: offsets stored in the checkpoint', 'Startup modes', 'Sink: at-least-once or exactly-once with transactions', 'upsert-kafka for changelogs', 'Readers use read_committed'],
        short: 'The **Kafka source** keeps the offsets of its partitions in the checkpoint, so after a failure it reads from the saved positions, not from Kafka\'s committed offsets. `scan.startup.mode` decides where a new job starts: earliest, latest, a timestamp or given offsets. The **Kafka sink** can be at-least-once, or exactly-once with Kafka transactions that are committed when a checkpoint completes; readers must use `read_committed`. For a changelog I use **upsert-kafka** with a primary key: updates replace by key, and deletes become tombstones. In my recording an upsert topic held 17 records for a query that sent 25 changes.',
        fu: [['What does the transaction timeout have to be?', 'Larger than the checkpoint interval plus the time to restart, or the broker aborts a transaction that Flink still wants to commit.'], ['Where do the committed offsets of the group matter?', 'Mostly for monitoring: Flink commits them on checkpoints so that lag tools show something.']],
        trap: 'Saying that exactly-once in Flink means no duplicate in any consumer. A reader without read_committed can see aborted records.'
      }),

      B.qa({
        id: 'qa-cdc', t: 1, tag: 'Connectors', secs: 75,
        q: 'How would you capture changes from a database with Flink?',
        pts: ['Flink CDC reads the log directly', 'Debezium to Kafka to Flink', 'Snapshot, then the log', 'Changelog: +I -U +U -D', 'Replica identity and the slot'],
        short: 'Two ways. The **Flink CDC connector** reads the database log itself: a consistent **snapshot** of the table, then the log, and it gives the job a changelog of +I, -U, +U and -D. **Debezium** on Kafka Connect writes the changes to a Kafka topic and Flink reads them with the `debezium-json` format; that costs more moving parts, and gives every other consumer the same events. In both cases the database keeps its log in a **replication slot** until the reader confirms it, so a stopped reader fills the disk. In my recording the default replica identity of PostgreSQL made the job fail on the first update with a message that asked for REPLICA IDENTITY FULL.',
        fu: [['Which one would you pick?', 'The topic when more than one team needs the changes, the connector for a single pipeline.'], ['What about deletes?', 'They arrive as -D, and an upsert sink turns them into tombstones or deletes by key.']],
        trap: 'Forgetting the slot. The reader consumes data, and it is also the reason the database keeps its log.'
      }),

      B.qa({
        id: 'qa-files', t: 2, tag: 'Connectors', secs: 60,
        q: 'Why do a streaming file sink and a lake sink need checkpoints?',
        pts: ['Files are written continuously', 'Pending files are finished on a checkpoint', 'A failure leaves hidden files, not bad data', 'Checkpoint interval sets file size and delay', 'Same idea for Iceberg and Paimon'],
        short: 'A streaming job writes continuously, but a reader must never see a half-written file. The file sink writes into a hidden in-progress file and makes it visible only when a **checkpoint completes**. If the job fails first, the hidden file is dropped and rewritten after the restore, so no reader sees data that the job then took back. In my recording one hidden file existed before the first checkpoint, and finished files after. The interval is therefore also the delay before data is visible, and many tiny checkpoints mean many tiny files, which is why compaction exists. Lake table sinks follow the same rule: they commit a snapshot per checkpoint.',
        fu: [['What if checkpointing is off?', 'A streaming file sink never finishes its files.'], ['How do you avoid small files?', 'A longer interval, a size-based rolling policy, or compaction.']],
        trap: 'Setting a one-second checkpoint interval for a lake sink and being surprised by thousands of tiny files.'
      }),

      B.recap({
        id: 'm5-recap', n: 5, badge: 'Connector', color: '#FFD6E4',
        pts: [
          'A connector is a **table with options** and a **format**. A source stores its position in the checkpoint, and a sink commits on a checkpoint.',
          'Four Kafka startup modes read **' + mode('earliest-offset') + '**, **' + mode('latest-offset') + '**, **' + mode('timestamp') + '** and **' + mode('specific-offsets') + '** rows of the same topic. Metadata columns give the partition, the offset and the timestamp.',
          '**upsert-kafka** needs a primary key: ' + US.changelog_rows_of_the_query + ' changes became ' + US.records_in_the_topic + ' records, ' + US.tombstones + ' of them **tombstones**.',
          'A file sink hides its file until a **checkpoint** completes. A lake sink does the same with a snapshot.',
          '**Flink CDC** sends the snapshot, then +I, -U, +U, -D. The default **replica identity** fails the job and loops: order 6 was printed ' + cdcDup + ' times. A stopped reader leaves the **replication slot** holding the log.'
        ]
      })
    ]
  });
})();
