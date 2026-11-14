/* Mission 15: two drills that mix the missions, a design decision, a coding round (a consumer that is safe to run twice, with its real tests), the boss round of interview questions, and a one-page review.
   Every number on the cheat sheet comes from a recording in an earlier mission: a real Apache Kafka 4.4.0 in KRaft mode with three brokers on one machine, Kafka Connect, Kafka Streams, PostgreSQL with
   Debezium, and pytest, on made-up Brewline data. Nothing ran on a network, on Kubernetes, on a managed service or under real load. MirrorMaker 2, Kerberos, OAuth and tiered storage are from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;

  /* Boss round: every interview question of missions 1 to 14, in mission order. Tier 1 is the junior path, tier 2 adds the senior questions, tier 3 the extra ones. */
  var BOSS = [];
  LAB.chapters.forEach(function (ch) { ch.scenes.forEach(function (s) { if (s.type === 'qa') BOSS.push([s.id, s.t]); }); });

  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  var mib = function (b) { return (Number(b) / 1048576).toFixed(1) + ' MiB'; };
  var OV = G.counts('log.overhead'), SK = G.counts('keys.skew_summary'), BA = G.table('producers.batching'), CO = G.table('producers.compression'), UL = G.counts('replication.unclean_lost');
  var LG = G.counts('consumers.lag_total'), RB = G.counts('consumers.rebalance_summary'), TS0 = G.counts('consumers.too_slow'), LA = G.table('delivery.lost_ack'), CR = G.table('delivery.crash');
  var TA = G.counts('delivery.tx_after_crash'), TR = G.counts('delivery.tx_after_restart'), BF = G.counts('retention.backfill'), BT = G.counts('retention.by_time_rule');
  var FT = G.counts('connect.failed_task'), DL = G.counts('connect.dead_letter'), WH = G.counts('cdc.wal_held_back'), AO = G.counts('cdc.at_least_once'), WF = G.counts('schemas.wire_format');
  var SC = G.table('schemas.changes'), SZ = G.table('schemas.sizes'), CC = G.counts('streams.counts_check'), LT = G.counts('streams.late'), SR = G.counts('streams.restart'), IT = G.table('streams.internal_topics');
  var MR = G.counts('ops.metrics_reading'), RR = G.counts('ops.rolling_restart'), QA = G.counts('ops.quota'), TS = G.counts('tests.summary'), SA = G.table('security.sasl'), DF = G.table('world.defaults');
  var ID = G.counts('tests.idempotent_demo'), IP = G.text('tests.idempotent_pytest'), IPY = G.file('code/app/idempotent.py');
  var row = function (t, k, c) { var r = t.rows.filter(function (x) { return String(x[c || 0]).indexOf(k) === 0; })[0]; G.expect(!!r, 'row "' + k + '"'); return r; };
  var pct = function (x) { return Math.round(x * 1000) / 10; };
  var eager = RB.range, coop = RB.cooperative;
  var crashProc = row(CR, 'process, then commit every 10 records'), crashOver = CR.rows.filter(function (r) { return /overwrites/.test(r[0]); })[0], crashCommit = row(CR, 'commit, then process');
  var noIdem = row(LA, 'enable.idempotence=false'), withIdem = row(LA, 'enable.idempotence=true');
  var retention = row(DF, 'log.retention.hours');
  var compat = function (k) { return row(SC, k)[3]; };
  var unauth = row(SA, 'alice, right password, no ACL');
  G.expect(BOSS.length >= 40 && BOSS[0][0] !== undefined, 'the boss round has the questions of the earlier missions');
  G.expect(eager['B joins'].partitions_revoked_in_all === 6 && coop['B joins'].partitions_revoked_in_all === 3, 'eager rebalancing stops every partition, cooperative moves part of them');
  G.expect(crashProc[6] === 5 && crashProc[7] === 105 && crashOver[7] === 100 && noIdem[4] === 10 && withIdem[4] === 5, 'the delivery numbers');
  G.expect(FT.connector_state === 'RUNNING' && FT.task_state === 'FAILED' && TS0.commit_error[0] === 'UNKNOWN_MEMBER_ID', 'a failed task under a running connector, and a commit by a member that was removed');
  G.expect(retention[1] === '168' && compat('rename total_cents to amount_cents') === 'none', 'the retention default and the rename');
  G.expect(ID.same_as_a_run_without_a_replay === true && ID.the_replay_changed_nothing_that_was_applied === true && ID.bad_offsets.length === 1 && ID.exit_code === 0, 'the consumer that is safe to run twice');

  /* The coding round: a consumer that is safe to run twice. The messages come from the recorded demo of tests.py: offsets 0 to 6 (one is not an order), then a replay of 4 to 9 after a restart. */
  var AP = ID.state_after_the_replay;
  var cents = function (o) { return AP[String(o)]; };
  var MSGROWS = [];
  for (var o = ID.first_pass_offsets[0]; o <= ID.first_pass_offsets[1]; o++) MSGROWS.push(['first run', 0, o, ID.bad_offsets.indexOf(o) >= 0 ? 'not json' : '{"order_id": ' + o + ', "total_cents": ' + cents(o) + ', ...}']);
  for (o = ID.replay_offsets[0]; o <= ID.replay_offsets[1]; o++) MSGROWS.push(['after the restart', 0, o, '{"order_id": ' + o + ', "total_cents": ' + cents(o) + ', ...}']);
  var RESROWS = Object.keys(AP).sort(function (a, b) { return Number(a) - Number(b); }).map(function (k) { return [k, AP[k]]; });
  var IPSOL = G.lines(IPY, G.at(IPY, /^def apply/), G.at(IPY, /^    return bad/));

  LAB.addChapter({
    id: 'm15', n: 15, title: 'Boss round', short: 'Boss round', blurb: 'Drills that mix the missions, a design decision, a coding round, and a mock interview', minutes: 85,
    focus: ['src', 'ing', 'qual'],
    goals: [
      'Handle **two incidents** that cross missions: a deploy that doubles some orders, and a pipeline that stops quietly.',
      'Decide **what to build first** on a new Kafka platform, and defend it.',
      'Write **a consumer that is safe to run twice**, and see its real tests pass.',
      'Answer **the interview questions** of every mission in the time of a real interview.',
      'Take away **one page** of numbers and rules.'
    ],
    say: 'Mission 15 is the boss round. First two drills that mix what you learned, because nobody has an incident in only one mission. Then a design decision, a coding round on the consumer that is safe to run twice, with the real tests that I ran, and the mock interview with the question of every mission. At the end there is one page that you can print. Press Next.',
    scenes: [
      B.incident({
        id: 'm15-inc1', t: 2, src: 'rec', title: 'Drill: a deploy, a rebalance, and orders counted twice', time: '16:40',
        alert: '**After the 16:00 deploy of the warehouse loader, the warehouse shows about 5% more orders than the shop database, and the lag of the group `warehouse-loader` jumped and then fell back.** The loader has three instances, all restarted at once. Nobody changed the topic or the producers.',
        clues: ['The loader commits every 10 records, **after** it writes to the warehouse, and the write is a plain insert', 'The group uses the classic **range** assignment, with eager rebalancing', 'In the logs, an instance reports that its commit failed with `UNKNOWN_MEMBER_ID`', 'Writing a batch to the warehouse takes longer than `max.poll.interval.ms` when the warehouse is busy'],
        opts: [
          { t: 'Make the write idempotent (an upsert by order id), keep committing after the write, make a batch finish inside the poll interval, move to the cooperative or new group protocol, roll the deploy one instance at a time, and alert on lag and rebalances', fb: '' },
          { t: 'Commit before writing, so that nothing is read twice', fb: 'That swaps duplicates for lost orders: the recording lost an order that way.' },
          { t: 'Turn auto commit on and forget it', fb: 'It still repeats records after a crash, and hides when a commit fails.' },
          { t: 'Delete the rows that look doubled in the warehouse every night', fb: 'You would hide the cause, and it will come back at the next restart.' }
        ],
        best: 0,
        why: 'Three missions in one incident. A restart with commits every ten records after the write is at-least-once: the recording processed **' + crashProc[6] + ' orders twice** and wrote **' + crashProc[7] + ' rows** into a plain sink, and **' + crashOver[7] + '** into a sink that overwrites by order id. Range assignment is eager, so one instance joining or leaving stopped **' + eager['B joins'].partitions_revoked_in_all + ' of 6** partitions where the cooperative protocol moved **' + coop['B joins'].partitions_revoked_in_all + '**. And a consumer that did not poll within the interval was removed: its commit failed with `' + TS0.commit_error[0] + '`, so the batch was read again by someone else.',
        checks: [
          ['Compare counts', 'The warehouse against the source, by day: the extra rows show when the restart happened.'],
          ['Read the group', '`kafka-consumer-groups --describe --state` and the rebalance log lines around 16:00.'],
          ['Look at the commit errors', '`UNKNOWN_MEMBER_ID` means the member was removed: the batch took too long.'],
          ['Fix the sink first', 'An upsert by key makes every later restart harmless.']
        ],
        tell: 'The loader writes with a plain insert and commits after the write, so a restart repeats up to ten records, and the all-at-once deploy and a slow warehouse made it worse with a rebalance and removed members. I made the write an upsert by order id, shortened the batches, moved the group to the cooperative protocol, and deploy one instance at a time.',
        prevent: ['An idempotent sink for every consumer', 'Rolling deploys of consumers, one instance at a time', 'Alerts on lag, rebalance frequency and commit errors']
      }),

      B.incident({
        id: 'm15-inc2', t: 2, src: 'rec', title: 'Drill: nothing reaches the warehouse since Friday, and Connect says RUNNING', time: '09:05',
        alert: '**The warehouse has no orders since Friday 18:00.** The Connect dashboard shows the sink connector as RUNNING. The topic `orders` has new records every second. On Friday afternoon the producer team renamed `total_cents` to `amount_cents` in the JSON of the orders.',
        clues: ['The consumer group of the sink has a lag that grows by thousands every minute', 'The sink was created with the default error handling', 'The topic has the default retention of ' + retention[1] + ' hours', 'Nobody looks at the status of individual tasks'],
        opts: [
          { t: 'Look at the status of the **tasks**, read the trace, make the sink accept the new field name, restart the task and let it catch up well inside the retention. Then add a dead letter topic, alerts on task state and lag, and a schema registry with a compatibility check', fb: '' },
          { t: 'Restart the connector and wait', fb: 'The connector is fine. The task fails again on the same record.' },
          { t: 'Increase the number of tasks', fb: 'Every task fails on the same field.' },
          { t: 'Raise `max.poll.interval.ms`', fb: 'The problem is a bad record, not a slow poll.' }
        ],
        best: 0,
        why: 'The recording shows the same shape: a connector in state **' + FT.connector_state + '** with a task in state **' + FT.task_state + '**, no line written, and the trace `' + FT.first_line_of_the_trace + '`. The rename is a change that is compatible in **neither** direction (' + compat('rename total_cents to amount_cents') + '), and nothing checked it because the topic had no schema. A tolerant sink with a dead letter topic wrote **' + DL.lines_written + '** lines and kept the bad record, with its headers, in `bad-lines-dlq`. And the clock is running: records older than **' + retention[1] + ' hours** are deleted, so the backlog must be read before that.',
        checks: [
          ['Status of the tasks', '`GET /connectors?expand=status`: a task FAILED under a RUNNING connector.'],
          ['The trace', 'It names the converter or the field that failed.'],
          ['The lag and the retention', 'How much time is left before the oldest unread record is deleted?'],
          ['After the fix', 'Watch the lag fall, and compare counts with the source.']
        ],
        tell: 'A renamed field made the sink task fail while the connector stayed RUNNING, so nothing alerted. I read the task trace, fixed the field mapping, restarted the task and watched the lag fall. Then I added a dead letter topic, alerts on task state and lag, and a schema registry with a compatibility mode, so that a rename is refused before it is produced.',
        prevent: ['Alert on task state, not on connector state', 'A dead letter topic with headers on every sink', 'A schema registry with a compatibility check on shared topics']
      }),

      B.decide({
        id: 'm15-dec', t: 2, src: 'docs', title: 'Decision: what do four engineers build first on Kafka?',
        scenario: 'Brewline Asia-Pacific has four engineers, ten weeks, and a new Kafka cluster that has just been approved. The business wants the orders of the shops in the warehouse within minutes, then live numbers for store managers. Managers like demos, and a live dashboard from a stream processor would impress them.',
        opts: [
          { t: 'The live stream processing first, because it impresses, and the replication, schemas and monitoring after the demo', d: 'The best demo, early.', lose: 'A stream hides its mistakes. Without three copies, a schema check and alerts on lag and under-replicated partitions, nobody can say that the live numbers are right, or that they will survive a broker failure.' },
          { t: 'Foundations first: topics with keys, retention and three copies; `acks=all` with `min.insync.replicas` 2; a schema registry with a compatibility mode; alerts. Then change data capture from the shop database into topics, and an idempotent sink into the warehouse. Then the stream processing, on top', d: 'Each step is what the next one needs, and each can be shown to the business when it is done.', lose: '' },
          { t: 'One topic with JSON for everything, and sort it out later', d: 'The fastest way to a first message.', lose: 'No keys means no order, no schema means no safe change, and a topic shared by everything cannot have its own retention or its own readers.' }
        ],
        pick: 1,
        why: 'Order the work by what the next step needs. The recordings show how small gaps grow: **' + UL.lost_count + '** acknowledged records lost when an unclean election was allowed, a renamed field that no check refused, and a sink that wrote **' + crashProc[7] + '** rows for **100** orders. Replication settings and a schema check are cheap in week one and very expensive in week ten.',
        when: 'If the business has a hard date for a live view, build a thin version early on the same foundations: keyed topics, three copies, a schema and an idempotent sink, and the alerts from the first day.'
      }),

      B.challenge({
        id: 'm15-ch', t: 2, title: 'Coding round: a consumer that is safe to run twice', file: 'idempotent.py', lang: 'python',
        q: 'A consumer reads orders from partition 0 and keeps the total of each order in a dictionary `state`. After a **restart** it reads some messages **again**. **Write `apply(batch, state, applied)`** so that reading a message twice changes nothing. A message has `partition()`, `offset()` and `value()`, which is JSON bytes with `order_id` and `total_cents`. `applied` is a dictionary from partition to the highest offset that was applied. **Return the messages that are not valid orders**, and go on with the rest.',
        data: [{ name: 'The messages that the consumer reads (the same ones as in the recorded run)', cols: ['When', 'Partition', 'Offset', 'Value'], rows: MSGROWS }],
        starter: 'def apply(batch, state, applied):\n    """Apply each message once. Return the messages that are not valid orders."""\n    bad = []\n    for m in batch:\n        ...\n    return bad',
        hints: ['A message that was already applied has an offset **at or below** the highest offset that you saved for its partition. Skip it.', 'Parse the value inside `try`. A message that is not JSON, or has no `order_id`, goes into `bad`, and the loop **continues**.', 'Write the total **by key**: `state[order_id] = cents`. Writing the same order twice then gives the same row.', 'Remember to move the position forward for a bad message too, or it will be read again after the next restart.'],
        sol: IPSOL,
        res: { msg: RESROWS.length + ' orders, the same as a run with no replay', cols: ['order_id', 'total_cents'], rows: RESROWS },
        expl: ['Two rules make the function safe to run twice. **Skip what was applied**: `applied` keeps the highest offset of each partition, so a replay of offsets ' + ID.replay_offsets[0] + ' to 6 changes nothing. **Write by key**: even if a message slipped through twice, the same order gives the same row.', 'The bad message at offset ' + ID.bad_offsets[0] + ' goes into `bad`. The function does not stop, and it moves the position past the bad message, so that the next restart does not read it again.', 'The state after the first run had **' + Object.keys(ID.state_after_the_first_pass).length + '** orders (offsets 0 to 6 without the bad one). After the replay of ' + ID.replay_offsets[0] + ' to ' + ID.replay_offsets[1] + ' it had **' + RESROWS.length + '**. Nothing that was already applied changed: ' + (ID.the_replay_changed_nothing_that_was_applied ? 'yes' : 'no') + '. It is the same as a run with no replay at all: ' + (ID.same_as_a_run_without_a_replay ? 'yes' : 'no') + '.', 'In production the position `applied` must be saved **in the same transaction** as the state, in the same database. Otherwise a crash between the two reopens the gap. This is the pattern of mission 7, for a sink outside Kafka.', 'These are the real tests of this function, run with pytest: `' + IP.split('\n').slice(-1)[0] + '`. They need no broker.'],
        cx: 'One pass over the batch, with a dictionary look-up for each message: linear in the size of the batch, and constant memory for the positions.'
      }),

      B.mockRound(BOSS.map(function (b) { return b[0]; }), BOSS.map(function (b) { return b[1]; })),

      B.cheat({
        id: 'm15-cheat', t: 1, src: 'rec', title: 'One page to review',
        say: 'This is your last-minute review. Every number comes from a recording in an earlier mission, made with a real Apache Kafka ' + G.meta('kafka') + ' in KRaft mode on one machine, and made-up data. Take a screenshot or print the page.',
        sections: [
          { h: 'The log on disk', items: ['A partition is a folder of **segment files**, named by the offset of their first record. A batch has a header of **' + OV.batch_header_bytes + ' bytes**: ' + OV.bytes_that_are_not_data + ' of the ' + OV.batch_bytes + ' bytes of one small batch were not data', 'The offset index and the time index are **sparse**: one entry for about every 4 KiB. Retention deletes **whole closed segments**', 'The **offset** is a promise to clients. The **position** is a private detail of the broker'] },
          { h: 'Partitions and keys', items: ['Java default: **murmur2** of the key bytes, made positive, modulo the number of partitions. The librdkafka clients use CRC32 unless you set `murmur2_random`', 'Order is kept **inside a partition** only. In the recording, store ' + SK.busiest_store + ' held **' + pct(SK.busiest_store_share) + '%** of the orders, and one partition got **' + n0(SK.busiest_partition_records) + '** of ' + n0(SK.records) + ' records', 'Adding partitions **moves keys**, and you can never remove them'] },
          { h: 'Producers', items: ['`acks=0` learns nothing, `acks=1` means the leader wrote it, `acks=all` means every in-sync replica did. Batches of 100 took **' + n0(BA.rows[2][2]) + '** bytes for 1,000 orders against **' + n0(BA.rows[0][2]) + '** in batches of 1', 'JSON shrank to **' + CO.rows[4][4] + '** with zstd and **' + CO.rows[1][4] + '** with gzip', 'Idempotence is on by default in Java and off in librdkafka. A lost acknowledgement made **' + noIdem[4] + '** records for ' + noIdem[1] + ' orders without it and **' + withIdem[4] + '** with it'] },
          { h: 'Replication', items: ['A leader and followers. The **ISR** is the set that kept up. Consumers read only below the **high watermark**', '`acks=all` with `min.insync.replicas` 2 on three copies survives **one** broker. With two down, writes are refused with `NOT_ENOUGH_REPLICAS`', 'Unclean election lost **' + UL.lost_count + '** acknowledged records in the recording. Keep it off'] },
          { h: 'Consumer groups', items: ['**One partition, one consumer** in a group. The committed offset is the next record to read. Lag in the recording: **' + n0(LG.lag) + '** of ' + n0(LG.records) + ' records', 'Eager rebalancing stopped **' + eager['B joins'].partitions_revoked_in_all + ' of 6** partitions when a member joined, cooperative **' + coop['B joins'].partitions_revoked_in_all + '**', 'A consumer that does not poll within `max.poll.interval.ms` is removed: processing took ' + TS0.processing_took_seconds + ' s against a limit of ' + (TS0.max_poll_interval_ms / 1000) + ' s, and the commit failed with `' + TS0.commit_error[0] + '`'] },
          { h: 'Delivery guarantees', items: ['Commit first **lost** order ' + crashCommit[8].replace('order ', '') + '. Process first **repeated** ' + crashProc[6] + '. A sink that overwrites by key ended with the right **' + crashOver[7] + '** rows', 'A transaction crash left **' + TA.records_seen_by_a_read_committed_consumer + '** records visible to `read_committed` while **' + TA.records_seen_by_a_read_uncommitted_consumer + '** existed, and **' + TR.read_committed_records + '** with no duplicates after the restart', 'Exactly once is a property of a **pipeline**: a Kafka transaction does not reach into a database'] },
          { h: 'Retention and compaction', items: ['Deletion is judged by the **record\'s timestamp**: **' + BF.written + '** orders that were ' + BF.age_of_the_records_days + ' days old were gone at once (' + BF.records_left + ' left)', 'A time rule moved the log start by a whole segment: to **' + BT.second_state_earliest + '**. Compaction keeps the **last value per key**, and a **tombstone** deletes a key', 'Disk is **volume × days × copies**, with headroom'] },
          { h: 'Kafka Connect', items: ['Distributed workers keep their state in three **compacted** topics. A source stores its position by **connector name**', 'A connector can be **' + FT.connector_state + '** with a task **' + FT.task_state + '**: alert on tasks. With `errors.tolerance=all` and a dead letter topic, **' + DL.lines_written + '** lines were written and the bad record was kept with **' + DL.header_names.length + '** headers', 'The Apache download holds file and MirrorMaker 2 connectors only. JDBC, S3 and Debezium are separate projects'] },
          { h: 'Change data capture', items: ['Debezium reads the write-ahead log through a **replication slot**. An event has `before`, `after`, `op` and `source`, keyed by the primary key. With the default replica identity `before` is **null**', 'A stopped connector held back **' + mib(WH.bytes_the_slot_forces_postgres_to_keep) + '** of log for ' + n0(WH.rows_changed_while_stopped) + ' changes. Monitor the slot and cap it', 'Delivery is **at least once**: a killed worker repeated **' + AO.events_delivered_twice + '** events'] },
          { h: 'Schemas', items: ['A value is **' + WF.message_bytes + ' bytes** in Avro with the five byte header, against **' + WF.json_bytes_of_the_same_record + '** as JSON: **' + SZ.rows[1][3] + '** of the size for 1,000 orders', 'Adding a field **with a default**: ' + compat('add the field channel, with') + '. Without: ' + compat('add the field channel, no') + '. Rename: ' + compat('rename total_cents to amount_cents') + '. Widen: ' + compat('widen') + '. Narrow: ' + compat('narrow'), '**Backward**: upgrade consumers first. **Forward**: producers first. **Full**: any order. Add, do not rename'] },
          { h: 'Kafka Streams', items: ['A **library** in your application. State in RocksDB, backed up in a compacted **changelog**. A new key adds a **repartition topic**. The internal topics had **' + IT.rows[0][2] + '** copy until the replication factor was set', CC.orders_in + ' orders gave ' + CC.records_in_the_output_topic + ' updates and every windowed count was right. A record 20 s late was counted, a record about ten minutes late was **dropped**: `dropped-records-total` = ' + LT.dropped_records_metric, '`exactly_once_v2` repeated nothing across a restart (**' + SR.output_records_after_the_restart + '** records before and after). Delete the state and it is rebuilt from the changelog'] },
          { h: 'Security', items: ['TLS encrypts, SASL or a certificate **authenticates** (a principal), ACLs **authorize**. No rule means no, a deny wins. A producer needs Write and Describe, a consumer Read on the topic **and** the group', 'A failed login is **not** a delivery error: it looked like `' + row(SA, 'alice with the wrong password')[1] + '`, and only the error callback said why. A missing ACL gave `' + unauth[1] + '`', 'A certificate\'s principal is the subject in **another order**: read it from the authorizer log'] },
          { h: 'Operations and tests', items: ['Page on under-replicated partitions (**' + MR.under_replicated_when_healthy + '** to **' + MR.under_replicated_when_broker_1_is_dead + '** with a dead broker), offline partitions and the active controller count', 'A rolling restart under load: **' + n0(RR.orders_sent) + '** sent, **' + RR.lost + '** lost, **' + RR.duplicates + '** duplicated. A new broker is empty until you reassign, with a throttle and `--verify`', 'A quota is measured over a window of **' + QA.window_samples + '** samples. The bug in the consumer test was caught by **' + TS.with_a_bug.failed + '** failing tests'] },
          { h: 'Say it in one line', items: ['Choose keys, replication and retention on purpose, on day one.', 'Make every consumer, sink and connector safe to run twice.', 'Check a schema change before it is produced, not after.', 'Watch under-replicated partitions, task states and lag.', 'Test the rule with the awkward record: a refund, a bad message, a replay.', 'Say what you ran, say what was a stand-in, and say when you would check the documentation.'] }
        ]
      }),

      B.recap({
        id: 'm15-recap', n: 15, badge: 'Kafka Architect', color: '#C7D2FE',
        pts: [
          'You can follow Brewline from a **record** through the **log**, **partitions and keys**, **producers**, **replication**, **consumer groups**, **delivery guarantees**, **retention**, **Connect**, **change data capture**, **schemas**, **Streams** and **security**, to **operations** and **tests**.',
          'You pick the **keys, the replication and the retention** on purpose, and you can say what each setting costs and what it saves.',
          'You make **consumers, sinks and connectors safe to run twice**, because delivery is **at least once**.',
          'You check a **schema change before it is produced**, and you watch **under-replicated partitions, task states and lag**.',
          'You **test the rule** with the awkward record, and you know the **error names** that a mistake gives.',
          'You say what you **ran** (a real Kafka in KRaft mode with three brokers on one machine), what was **from documentation** (MirrorMaker 2, Kubernetes, managed services, Kerberos, OAuth, tiered storage), and when you would **check the documentation**, because Kafka changes between versions.'
        ],
        lines: [
          'I choose keys, copies and retention on purpose.',
          'I make everything safe to run twice.',
          'I say what I ran, and what I did not.'
        ]
      })
    ].reduce(function (all, x) { return all.concat(x); }, [])
  });
})();
