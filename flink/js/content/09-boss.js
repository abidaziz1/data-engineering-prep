/* Mission 9: drills that mix the missions, a design decision, a coding round on a tumbling window (with the real result), the boss round of interview questions, and a one-page review.
   Every number on the cheat sheet comes from a recording in an earlier mission: a real Apache Flink 2.2.1 standalone cluster, its SQL client, the Kafka connector, the Flink CDC connector,
   a Java job, Apache Kafka 4.4.0 and PostgreSQL 16, on one machine and on made-up Brewline data. Kubernetes, YARN, managed services and lake formats are from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;

  /* Boss round: every interview question of missions 1 to 8, in mission order. Tier 1 is the junior path, tier 2 adds the senior questions, tier 3 the extra ones. */
  var BOSS = [];
  LAB.chapters.forEach(function (ch) { ch.scenes.forEach(function (s) { if (s.type === 'qa') BOSS.push([s.id, s.t]); }); });

  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  var mib = function (b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MiB' : (b / 1024).toFixed(0) + ' KiB'; };
  var CL = G.counts('world.cluster'), SS = G.counts('sql.stream_summary'), MB = G.counts('sql.minibatch_summary'), DF = G.counts('time.delay_facts'), DS = G.table('time.delay_summary'), IS = G.counts('time.idle_summary');
  var AR = G.counts('state.a_result'), BR = G.counts('state.b_result'), EO = G.counts('state.copy_eo'), AL = G.counts('state.copy_alo'), SR = G.counts('state.savepoint_result'), NS = G.counts('state.no_savepoint_result');
  var BS = G.counts('state.backends_summary'), US = G.counts('connect.upsert_summary'), CD = G.counts('cdc.flink_cdc_summary_default'), JS = G.counts('joins.state_summary');
  var RS = G.counts('datastream.restored'), WU = G.counts('datastream.wrong_uid'), R1 = G.counts('running.rate_p1'), R4 = G.counts('running.rate_p4'), CP = G.counts('running.compare');
  var T10 = G.table('time.tumble_10'), EV = G.table('time.events'), SCT = G.file('sql/time_tumble_10.sql');
  var dsRow = function (d) { return DS.rows.filter(function (x) { return x[0] === d; })[0]; };
  G.expect(BOSS.length >= 20 && BOSS[0][0] !== undefined, 'the boss round has the questions of the earlier missions');
  G.expect(T10.rows.length === 5 && T10.rows[0][3] === '4' && dsRow(10)[3] === 3, 'the tumbling windows of the coding round');
  G.expect(AR.totals_equal_the_truth === true && EO.duplicates === 0 && AL.duplicates > 0, 'the recovery numbers');

  var JR = G.file('code/app/PassThousand.java'), RO = G.table('datastream.round_output'), RC = G.counts('datastream.round'), ORD = G.table('sql.orders');
  G.expect(RC.equals_plain_python === true && RC.lines === 2 && RC.job_state === 'FINISHED' && RO.rows.length === 2 && /^s01 passed 1000 cents with order 7, total 1233$/.test(RO.rows[0][0]) && /^s04 passed 1000 cents with order 10, total 1081$/.test(RO.rows[1][0]), 'the DataStream coding round prints one line for s01 and one for s04');
  var STARTER_JAVA = ['public class PassThousand {', '', '    public static class Order {                       // a POJO: public fields and an empty constructor', '        public int orderId;', '        public String storeId;', '        public int totalCents;', '        public Order() {}', '        // ... a constructor with the three fields', '    }', '',
    '    public static void main(String[] args) throws Exception {', '        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();', '        env.setParallelism(2);', '        env.fromData(ORDERS)                                // the twelve orders, in this order',
    '                // 1. send the orders of one store to the same task', '                // 2. keep the running total of the store in state, and emit a line the first time it reaches 1,000 cents', '                .print();', '        env.execute("pass-thousand");', '    }', '}'].join('\n');
  var SOLQ = G.lines(SCT, G.at(SCT, /CREATE TEMPORARY TABLE events/), SCT.split('\n').length);
  var STARTER = ["CREATE TEMPORARY TABLE events (", "  order_id INT, store_id STRING, total_cents INT, ts TIMESTAMP(3)", "  -- 1. make ts an event time that waits 10 seconds", ") WITH ('connector' = 'filesystem', 'path' = 'file:///data/events14.jsonl', 'format' = 'json', 'json.timestamp-format.standard' = 'SQL');", '', '-- 2. orders and cents for each minute of ts'].join('\n');

  LAB.addChapter({
    id: 'm9', n: 9, title: 'Boss round', short: 'Boss round', blurb: 'Two drills that mix the missions, a design decision, a coding round and a mock interview', minutes: 45,
    focus: ['src', 'ing', 'qual'],
    goals: [
      'Handle **two incidents** that cross missions: a deploy that loses state, and a pipeline that falls behind.',
      'Decide **what to build first** on a new Flink platform, and defend it.',
      'Write **a windowed query with a watermark** and read its real result.',
      'Answer **the interview questions** of every mission in the time of a real interview.',
      'Take away **one page** of numbers and rules.'
    ],
    say: 'Mission 9 is the boss round. Two drills that mix what you learned, because nobody has an incident in only one mission. Then a design decision, a coding round on the window query with the result that Flink printed, and a mock interview with the questions of every mission. At the end there is one page to keep. Press Next.',
    scenes: [
      B.incident({
        id: 'm9-inc1', t: 2, src: 'rec', title: 'Drill: after the deploy, today\'s counts start from zero and some orders are missing', time: '10:20',
        alert: '**The new version of the order-counting job was deployed at 09:00 by cancelling the old job and submitting the new one. The dashboard now shows today\'s counts per store starting from 09:00, and the finance numbers are short by about a third.** The job reads a Kafka topic with `scan.startup.mode` set to `latest-offset`. Nobody took a savepoint.',
        clues: ['The old job was cancelled, not stopped with a savepoint', 'The new job started at the end of the topic', 'The counts are a running total kept in state'],
        opts: [
          { t: 'Rebuild the missing part from the topic, stop and start with a savepoint from now on, and test the restore before every release', fb: '' },
          { t: 'Leave it: the numbers will catch up tomorrow', fb: 'A running count never catches up. The part before 09:00 is not in the new state.' },
          { t: 'Raise the watermark delay', fb: 'The delay decides late orders. Here the state is missing.' },
          { t: 'Restart the new job again', fb: 'It would start at the end of the topic again and lose more.' }
        ],
        best: 0,
        why: 'A new job has no state. In the recording a job started without a savepoint counted ' + n0(NS.orders_counted_by_the_new_job) + ' of ' + n0(NS.orders_in_the_topic) + ' orders, and the same query restored from a savepoint counted all ' + n0(SR.orders_counted) + ', even with another parallelism. The fix for today is to read the topic again from the earliest offset into the state, and the fix for the next release is `flink stop --savepointPath` and a start from it.',
        checks: [['How was the old job stopped?', 'Cancel keeps no state. Stop with a savepoint does.'], ['What is the startup mode of the source?', 'latest-offset ignores everything before the start.'], ['Is there a savepoint?', 'Look in the savepoint folder.'], ['Rebuild', 'Start a job from the earliest offset and compare it with the batch result.']],
        tell: 'The release cancelled the job and started a new one at the end of the topic, so the state before 09:00 was gone. I rebuild the counts from the topic, and I change the release to stop with a savepoint and start from it, after a restore test.',
        prevent: ['Stop with a savepoint, never cancel, for a release', 'Test a restore in CI', 'Keep the last savepoint until the new version has run for a day']
      }),

      B.incident({
        id: 'm9-inc2', t: 2, src: 'rec', title: 'Drill: the lag grows, checkpoints time out, and the CPU is quiet', time: '03:30',
        alert: '**The job that enriches each order with a customer record has fallen two hours behind. Checkpoints take longer and then time out, the CPU of the TaskManagers is at 8 percent, and nothing was deployed.** The enrichment is a call to the customer service for each record. Yesterday the customer service was moved to another region.',
        clues: ['The source is backpressured and the enrichment step is busy on every task', 'Each call takes about ten times longer than last week', 'Barriers move with the records, and the records are stuck'],
        opts: [
          { t: 'Fix the cause of the slow step: the call. Cache the customer records or batch and parallelize the calls, give the step more tasks, and watch busy time, lag and checkpoint duration come down', fb: '' },
          { t: 'Restart the job from the latest checkpoint', fb: 'The job restarts into the same slow step.' },
          { t: 'Double the checkpoint timeout', fb: 'The checkpoints are slow because the records ahead of the barrier are slow. The timeout only hides it.' },
          { t: 'Add TaskManagers without changing the parallelism', fb: 'The job does not use them.' }
        ],
        best: 0,
        why: 'Backpressure and slow checkpoints have one cause: a step that cannot keep up. In the recording a step of ten milliseconds for each record held a job to about ' + R1.records_per_second + ' records a second, and four tasks gave ' + R4.records_per_second + '. A barrier travels with the records, so a job that is held back is slow to checkpoint too.',
        checks: [['Busy, idle and backpressured time for each vertex', 'Find the busy step.'], ['The time of one call', 'Is it the service?'], ['Checkpoint duration over days', 'It followed the slowdown.'], ['The lag of the topic', 'It grows by the difference of the rates.']],
        tell: 'The enrichment call became slow, so the step was the bottleneck: the source was backpressured, the lag grew and the checkpoints got slow. I cache and parallelize the calls, add tasks to that step, and watch the three time metrics and the lag.',
        prevent: ['Alert on lag and backpressure together', 'Cache or batch calls to external services', 'Test the job against a slow service']
      }),

      B.decide({
        id: 'm9-dec', t: 2, src: 'docs', title: 'Decision: what do four engineers build first on Flink?',
        scenario: 'Brewline Asia-Pacific has four engineers, ten weeks, and a new Flink platform on Kubernetes. The business wants the order counts for each shop within a minute, and the numbers must match finance at the end of the day. Two engineers want to start with a complex join of orders, payments and customers. One wants a custom Java library. One wants checkpoints, savepoints and monitoring first. You choose the order.',
        opts: [
          { t: 'Foundations first: checkpoints on, a restore tested by killing a TaskManager, stable operator uids, an exactly-once sink, idle timeouts, and alerts on restarts, checkpoint size, backpressure and lag. Then the simple counts. Then the joins with a time bound', d: 'Every later job inherits the safety.', lose: '' },
          { t: 'The big join first, because it is the hardest part of the business', d: 'The most valuable query, early.', lose: 'Without a time bound its state grows every day, and without checkpoints and savepoints there is no safe way to fix it. The first incident arrives with no tools.' },
          { t: 'A custom library for everything, and SQL later', d: 'Full control from day one.', lose: 'Most jobs would be a few lines of SQL. The library has to be tested, upgraded and understood by everyone, before it has paid for itself.' }
        ],
        pick: 0,
        why: 'Order the work by what the next step needs. The recordings show how small gaps grow: **' + AL.duplicates + '** duplicates with an at-least-once sink, a job that **ended FAILED** for good with no checkpoints, a state that grew from ' + mib(JS.regular_first) + ' to ' + mib(JS.regular_last) + ' in eighteen seconds with no time bound, and a restore that was **refused** because of a renamed operator.',
        when: 'If the business has a hard date for one dashboard, build a thin version early on the same foundations, with the checkpoints, the savepoint test and the alerts from the first day.'
      }),

      B.challenge({
        id: 'm9-ch', t: 1, title: 'Coding round: orders for each minute, with a watermark', file: 'minute_counts.sql', lang: 'sql',
        q: 'The fourteen orders below arrive in the order of the first column. **Write the DDL and the query** that give the number of orders and the cents for each **minute of the time at which an order happened**, where the watermark waits **10 seconds**. Then say which orders are missing from the result and why.',
        data: [{ name: 'The orders, in arrival order (the file events14.jsonl)', cols: EV.cols.slice(0, 5), rows: EV.rows.map(function (r) { return r.slice(0, 5); }) }],
        starter: STARTER,
        hints: ['A watermark is declared in the table: `WATERMARK FOR ts AS ts - INTERVAL \'10\' SECOND`. Put it as a column definition after `ts`.', 'A tumbling window is the table function `TUMBLE(TABLE events, DESCRIPTOR(ts), INTERVAL \'1\' MINUTE)`. You group by `window_start` and `window_end`.', 'An order is late if its window has been sent when it arrives. Order 8 happened at 00:00:55 and arrived after one from 00:02:05.'],
        sol: SOLQ,
        res: { msg: T10.rows.length + ' windows, the real output of Flink', cols: T10.cols, rows: T10.rows },
        expl: ['The `WATERMARK` clause makes `ts` the **event time** and says that the watermark is the largest time seen minus **10 seconds**.', 'The window function cuts the orders into minutes. The query counts them with an ordinary GROUP BY on the window columns, and each result is sent once, when the watermark passes the end of its minute.', 'Three orders are missing: **' + dsRow(10)[4] + '**. Their windows had been sent when they arrived, because they were behind by 70, 72 and 189 seconds. With a delay of 75 seconds only one is missing (' + dsRow(75)[4] + '), and with 200 seconds none.'],
        cx: 'State is one counter for each open window, and a window is dropped when the watermark passes its end. The cost is the delay of every result by the watermark delay.'
      }),

      B.challenge({
        id: 'm9-ch2', t: 2, title: 'Coding round: tell me when a store passes 1,000 cents', file: 'PassThousand.java', lang: 'java',
        q: 'The twelve orders below arrive in the order of the first column. **Write a DataStream job in Java** that keeps the running total of cents for each store, and prints one line the **first time** the total of a store reaches **1,000 cents**: the store, the order and the total. Then say which stores print a line, and why the job needs state.',
        data: [{ name: 'The orders, in arrival order', cols: ['order_id', 'store_id', 'total_cents'], rows: ORD.rows.map(function (r) { return [r[0], r[1], r[3]]; }) }],
        starter: STARTER_JAVA,
        hints: ['A running total for each store is state for each key: `keyBy` the store, then a `KeyedProcessFunction` with a `ValueState<Long>`.', 'The first time the total reaches the limit means that it was below the limit before this order and is at or above it after: `before < limit && after >= limit`.', 'Register the state in `open` with `getRuntimeContext().getState(new ValueStateDescriptor<>("total", Long.class))`. Its value is null until the first order of a store, so read it with a check.'],
        sol: JR,
        res: { msg: RO.rows.length + ' lines, the real output of the job on Flink ' + G.meta('flink') + ' (parallelism 2)', cols: ['line that the print sink wrote'], rows: RO.rows },
        expl: ['Two stores print a line: **s01** with order 7 (300 + 411 + 522 = 1,233) and **s04** with order 10 (448 + 633 = 1,081). The other ten stores stay under 1,000.', 'The total of a store is **keyed state**: one `long` for each store, saved in checkpoints. Without it the function sees one order at a time and cannot know the total.', 'The test `before < limit && after >= limit` prints once. After order 7 the total of s01 is 1,233, and orders 9 and 12 make it bigger without printing again.', 'The job ran with parallelism 2, so the print sink puts the task number in front of each line (`1>` or `2>`). The order of the two lines can change from run to run, and the lines cannot.'],
        cx: 'One counter for each store, so twelve here. The work for each order is the same small amount, whatever the number of orders.'
      }),

      B.mockRound(BOSS.map(function (b) { return b[0]; }), BOSS.map(function (b) { return b[1]; })),

      B.cheat({
        id: 'm9-cheat', t: 1, src: 'rec', title: 'One page to review',
        say: 'This is your last-minute review. Every number comes from a recording in an earlier mission, made with a real Apache Flink ' + G.meta('flink') + ' on one machine, and made-up data. Take a screenshot or print the page.',
        sections: [
          { h: 'The cluster', items: ['A **JobManager** plans and coordinates, **TaskManagers** run tasks in **slots**. The recording: three Java processes, **' + CL.slots_total + '** slots, REST on port **' + CL.rest_port + '**', 'A job needs as many slots as its **highest parallelism**. Parallelism 4 meant 8 tasks in 4 slots, and parallelism 5 failed at once with **NoResourceAvailableException**', '**Chaining** glues operators without a shuffle: 2 vertices with it, 6 without'] },
          { h: 'SQL and the changelog', items: ['A streaming query sends **+I -U +U -D**. Twelve orders made **' + SS.changelog_rows + '** changes for **' + SS.batch_rows + '** rows, and replaying them gave the **batch** result', '**EXPLAIN CHANGELOG_MODE** shows [I], [I,UA] or [I,UA,D]. An updating query needs a **retract** or **upsert** sink with a primary key', '**Mini-batch** cut ' + MB.changelog_rows_without + ' changes to ' + MB.changelog_rows_with + ', at the price of delay'] },
          { h: 'Time and windows', items: ['Watermark = the largest time seen minus a **delay**. A window closes when it passes the end. Delays of 0, 10, 30, 75 and 200 s dropped **' + [0, 10, 30, 75, 200].map(function (d) { return dsRow(d)[3]; }).join(', ') + '** of 14 orders', '**Tumbling, hopping, cumulating, session.** An **idle** partition holds every window back: nothing printed until an idle timeout of **' + IS.setting.split('= ')[1] + '**'] },
          { h: 'State and recovery', items: ['A killed TaskManager: with checkpoints the job restarted from checkpoint **' + AR.checkpoint_before_the_kill + '** and counted **' + n0(AR.orders_counted) + '** of **' + n0(AR.orders_sent) + '** orders. Without checkpoints it ended **' + BR.final_state + '**', 'At least once: **' + AL.duplicates + '** duplicates. Exactly once: **' + EO.duplicates + '**, with **' + EO.records_of_aborted_transactions + '** aborted records nobody reads', 'A **savepoint** is yours: stop with it, start from it, even at another parallelism (**' + SR.parallelism_before + ' to ' + SR.parallelism_after + '**). A new job counted ' + n0(NS.orders_counted_by_the_new_job) + ' of ' + n0(NS.orders_in_the_topic), 'RocksDB **incremental** checkpoints wrote **' + n0(BS.rocksdb_incremental_written_6) + '** bytes against **' + n0(BS.heap_written_6) + '** for the heap'] },
          { h: 'Connectors and CDC', items: ['Kafka startup modes read **12, 0, 6, 4** rows of the same topic. **upsert-kafka** turned ' + US.changelog_rows_of_the_query + ' changes into **' + US.records_in_the_topic + '** records, **' + US.tombstones + '** of them tombstones', 'A file sink hides its file until a **checkpoint** completes', '**Flink CDC** sends the snapshot, then +I -U +U -D. The default **replica identity** failed the job and looped: ' + CD.failures_recorded + ' failures. A stopped reader leaves the **replication slot** holding the log'] },
          { h: 'Joins and state growth', items: ['A **regular join** keeps both sides **for ever**: ' + mib(JS.regular_first) + ' to ' + mib(JS.regular_last) + ' in nine checkpoints. An **interval join** and a **TTL** went flat near ' + mib(JS.interval_max) + ' and ' + mib(JS.ttl_max), 'Dedup: **keep first** only inserts, **keep last** updates'] },
          { h: 'The DataStream API', items: ['Source, **keyBy**, process function with **ValueState** and a **timer**, sink. Every stateful operator needs a **uid**: a renamed one was **refused** at restore, the same one carried **' + n0(RS.orders_in_total) + '** orders across a stop', '**128 key groups**; a task holds a range; a hot key stays on one task'] },
          { h: 'Running it', items: ['**Busy, idle, backpressured** time find the bottleneck: the blocked task is the symptom. One task did **' + R1.records_per_second + '** records a second, four did **' + R4.records_per_second + '** (' + CP.ratio + ' times), and the source stayed blocked', '**Session mode** shares a cluster, **application mode** gives each job its own. Watch restarts, checkpoint size and duration, the watermark and the Kafka lag'] },
          { h: 'Say it in one line', items: ['Turn checkpoints on, test the restore, and stop with a savepoint.', 'Choose the watermark delay on purpose, and set an idle timeout.', 'Bound every join and every distinct in time.', 'Give every stateful operator a uid.', 'Fix the busy step, not the blocked one.', 'Say what I ran, and what I did not.'] }
        ]
      }),

      B.recap({
        id: 'm9-recap', n: 9, badge: 'Flink Architect', color: '#FBCFE8',
        pts: [
          'You can follow Brewline from an **order in Kafka** through a **job graph**, **SQL and the changelog**, **time and windows**, **state and checkpoints**, **connectors and CDC**, **joins**, the **DataStream API**, and **running** a job.',
          'You turn **checkpoints** on, **test the restore** by killing a TaskManager, and **stop with a savepoint** for a release.',
          'You choose the **watermark delay** and the **idle timeout** on purpose, and you **bound every join** and every distinct.',
          'You give every stateful operator a **uid**, and you know what a **replica identity**, a **tombstone** and a **backpressured** source look like.',
          'You say what you **ran** (a real Flink 2.2.1 cluster, Kafka, a Flink CDC connector against PostgreSQL, a compiled Java job, on one machine), what was **from documentation** (Kubernetes, YARN, managed services, lake table formats, high availability), and when each matters.'
        ],
        lines: [
          'I turn on checkpoints and test the restore.',
          'I choose the watermark and bound the state.',
          'I say what I ran, and what I did not.'
        ]
      })
    ].reduce(function (all, x) { return all.concat(x); }, [])
  });
})();
