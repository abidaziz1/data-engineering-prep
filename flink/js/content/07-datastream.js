/* Mission 7: the DataStream API. A Java job with keyed state and a timer is compiled against the real Apache Flink 2.2.1, run on the cluster, stopped with a savepoint and started twice more:
   once with a renamed operator id, which fails, and once with the same id, which carries the counts over. The key groups are read from Flink's own KeyGroupRangeAssignment class. */
(function () {
  var B = LAB.b, G = LAB.get;
  var JAVA = G.file('code/app/StoreWatch.java'), KGJ = G.file('code/app/KeyGroups.java');
  var BU = G.counts('datastream.build'), AS = G.counts('datastream.assignment'), FR = G.counts('datastream.first_run'), WU = G.counts('datastream.wrong_uid'), RS = G.counts('datastream.restored');
  var VX = G.table('datastream.vertices'), KG = G.table('datastream.key_groups'), PR = G.table('datastream.printed'), RC = G.text('datastream.run_command'), IL = G.text('datastream.idle_lines'), OP = G.table('datastream.orders_per_store');
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  G.expect(BU.release === 17 && BU.jar_holds_the_kafka_connector === false && /javac/.test(BU.javac), 'the job was compiled with javac for Java 17 and the jar does not hold the connector');
  G.expect(AS.runtime_equals_keygroup_class_for_p2 === true && AS.keys_seen === 12, 'a running job put every store on the task that KeyGroupRangeAssignment names');
  G.expect(FR.totals_equal_the_truth === true && RS.totals_equal_the_truth === true && RS.orders_in_total === 1200, 'the counts are right, also after the restore');
  G.expect(WU.job_state === 'FAILED' && /Cannot map checkpoint\/savepoint state for operator/.test(WU.message) && /allowNonRestoredState/.test(WU.message), 'a renamed operator id cannot be restored');
  G.expect(VX.rows.length === 2 && VX.rows[1][2] === 'HASH', 'two vertices, joined by a hash');
  var L = function (re, re2) { return G.span(JAVA, re, re2); };

  LAB.addChapter({
    id: 'm7', n: 7, title: 'The DataStream API', short: 'DataStream', blurb: 'A Java job with keyed state and a timer, operator ids, and which task holds a key', minutes: 35,
    focus: ['air', 'stg'],
    goals: [
      'Say when to use the **DataStream API** instead of SQL.',
      'Read a job with a **source**, a **keyBy**, a **process function** with **state** and a **timer**, and a sink.',
      'Explain **key groups**, and which task holds a key.',
      'Give every stateful operator a stable **uid**, and say what happens when you do not.',
      'Build, run, stop with a savepoint and restart a job from the command line.'
    ],
    say: 'Mission 7 is the other API. SQL covers most pipelines. When a job needs its own state, its own timers, or a rule that SQL cannot say, you write a DataStream program in Java. I wrote a small one, compiled it against the real Flink, ran it on the cluster, stopped it with a savepoint, and started it again twice: once with an operator renamed, once with the same name. Press Next.',
    scenes: [
      B.cmp({
        id: 'm7-which', t: 1, src: 'docs', title: 'SQL or DataStream',
        say: 'Both run on the same engine and can be mixed in one program. Press Next to read when to use which.',
        cols: ['', 'Flink SQL and the Table API', 'The DataStream API'],
        hl: 1,
        rows: [
          ['You write', 'A query', 'Java code: operators, functions, state'],
          ['State and time', 'Chosen by the planner (aggregates, joins, windows)', 'Chosen by you: ValueState, ListState, timers, event or processing time'],
          ['Good for', 'Filters, joins, aggregates, windows, CDC, most ETL', 'Rules that depend on history, custom timeouts, stateful alerts, complex event handling'],
          ['Changing it later', 'The plan can change when the query changes', 'Stable uids keep the state across versions'],
          ['Cost', 'Short, readable, easy to review', 'More code to test and to run']
        ],
        steps: [
          { upto: 2, say: 'The planner decides what state a query keeps. In DataStream you do.' },
          { upto: 3, say: 'Start with SQL. Move to DataStream for the rule that SQL cannot express, for instance "alert when a store has had no order for five minutes".' },
          { upto: 5, say: 'DataStream gives control and takes responsibility: the uids, the serialization, the tests.' }
        ],
        pick: 'From the Flink documentation (the overview of the Table API and the DataStream API) and from the job below. A program can convert between a table and a stream.'
      }),

      B.code({
        id: 'm7-code', t: 1, src: 'rec', title: 'A DataStream job: counts per store, and an alarm', file: 'StoreWatch.java', lang: 'java', code: JAVA,
        steps: [
          { say: 'The job that I compiled and ran. It reads the orders from Kafka, keeps a count and a total for each store, and says so when a store has had no order for a while. About a hundred lines. Press Next.', lines: null },
          { say: 'The data type: a plain class with public fields and an empty constructor. Flink recognizes it as a **POJO** and uses a fast serializer for it.', lines: L(/public static class Order/, /public Order\(\)/) },
          { say: 'The **environment** is the program\'s entry to Flink. `enableCheckpointing(3000)` turns on a checkpoint every three seconds, as `execution.checkpointing.interval` did in SQL.', lines: L(/StreamExecutionEnvironment env/, /enableCheckpointing/) },
          { say: 'The **source**: the Kafka connector, with the servers and the topic from the arguments, reading from the earliest offset, and handing over each value as a string.', lines: L(/KafkaSource<String> source/, /\.build\(\);/) },
          { say: 'The **pipeline** is one chain of calls. Read from the source, parse each line into an Order, and group by store with `keyBy`. A `keyBy` is a shuffle: records with the same store go to the same task.', lines: L(/env\.fromSource/, /\.keyBy/) },
          { say: 'Then the **process function**, and the line that matters for upgrades: `.uid(...)`. It gives the operator a stable identity, which the state in a savepoint is filed under.', lines: L(/\.process\(new Watch/) },
          { say: 'And a print sink. Nothing runs until `env.execute`: before that, the program only describes the job.', lines: L(/\.print\(\)\.name/, /env\.execute/) },
          { say: 'The function. Its state is three **ValueState** objects, one value each for every store: the number of orders, the total in cents, and the time of the alarm.', lines: L(/private transient ValueState<Long> orders/, /private transient ValueState<Long> alarm/) },
          { say: '`open` is called once in each task. It registers the three states by name and type.', lines: L(/public void open/, /new ValueStateDescriptor<>\("alarm"/) },
          { say: '`processElement` is called for each order. It reads the state of **this store** (Flink gives the state of the current key), adds the order, and writes it back.', lines: L(/public void processElement/, /cents\.update\(c\)/) },
          { say: 'Then the **timer**. If the store had an alarm, delete it. Register a new one, `idle` seconds from now, and remember its time. Every order moves the alarm forward.', lines: L(/if \(alarm\.value\(\) != null\)/, /alarm\.update\(next\)/) },
          { say: '`onTimer` runs when the alarm fires, five seconds after the last order of a store. It prints the store\'s state and clears the alarm.', lines: L(/public void onTimer/, /alarm\.clear\(\)/) }
        ],
        note: 'Recorded: this is the source that was compiled. While writing it, the first compile stopped at <code>org.apache.flink.api.java.utils.ParameterTool</code>: in Flink 2 the class is <code>org.apache.flink.util.ParameterTool</code>, and <code>open</code> takes an <code>OpenContext</code>.'
      }),

      B.term({
        id: 'm7-run', t: 1, src: 'rec', title: 'Build it, run it, read it',
        say: 'The commands. `javac` against the jars of the distribution and the Kafka connector, `jar` to package the classes, and `flink run -d` to submit the job. The job does not contain the connector: it was already in the lib folder of the cluster. Then the lines that the print sink wrote.',
        lines: [
          { c: 'cmd', t: '$ javac --release 17 -cp "$FLINK_HOME/lib/*:flink-sql-connector-kafka-' + G.meta('kafka-connector') + '.jar" -d classes StoreWatch.java', d: 300 },
          { c: 'out', t: BU.javac + ' compiled ' + BU.classes.length + ' classes: ' + BU.classes.join(', '), d: 80 },
          { c: 'cmd', t: '$ jar cf storewatch.jar -C classes .', d: 300 },
          { c: 'out', t: 'storewatch.jar, ' + n0(BU.jar_bytes) + ' bytes', d: 80 },
          { c: 'cmd', t: '$ ' + RC.split('\n')[0], d: 300 },
          { c: 'ok', t: RC.split('\n').slice(1).join('\n'), d: 80 }
        ].concat(PR.rows.map(function (r) { return { c: 'out', t: r[1], d: 40 }; }), IL.split('\n').map(function (l) { return { c: 'out', t: l, d: 40 }; })),
        after: 'Twelve stores were seen, and five seconds after their last order each printed an <code>idle</code> line with its totals. They are the right totals: the recorder compared them with the ' + n0(FR.orders) + ' orders it sent.',
        afterKind: 'tip',
        doneSay: 'The prefix, 1> or 2>, is the number of the task plus one. It tells you which task held the store.'
      }),

      B.rows({
        id: 'm7-graph', t: 1, src: 'rec', title: 'The job graph of the Java job',
        steps: [{
          say: 'Two vertices again. The source and the parser are chained: they have the names that the code gave them (`orders`, `parse`). The `keyBy` is where the **HASH** edge sits. After it, the process function and the print sink are chained. The names you give with `.name()` are what you will read in the web UI.',
          tabs: [{ layer: 'RECORDED', name: 'The vertices of the running Java job', c: 'raw', cols: VX.cols, rows: VX.rows, trk: 1 }],
          notes: ['Recorded. Parallelism 2, from `flink run -p 2`.']
        }]
      }),

      B.widget({ id: 'm7-lab', kind: 'keygrouplab', t: 1, src: 'rec', title: 'Lab: which task holds a store' }),

      B.rows({
        id: 'm7-kg', t: 2, src: 'rec', title: 'Key groups, asked of Flink itself',
        steps: [
          {
            say: 'I did not guess which task holds a store. A small program called `KeyGroupRangeAssignment`, the class that Flink uses, with 128 key groups. For each of the twelve stores it printed the key group, and the task for parallelism 2, 3 and 4. Look at the columns: the key group of a store never changes. Only the task does.',
            tabs: [{ layer: 'RECORDED', name: 'KeyGroupRangeAssignment, for twelve stores', c: 'raw', cols: KG.cols, rows: KG.rows, trk: 0 }],
            notes: ['Recorded. The program is `KeyGroups.java` in the recording folder: five lines that call `assignToKeyGroup` and `assignKeyToParallelOperator`.']
          },
          {
            say: 'Then I ran the job at parallelism 2 and read which task printed the first order of each store. All twelve were on the task that the class named. The first few are in the table.',
            tabs: [{ layer: 'RECORDED', name: 'What the running job printed', c: 'raw', cols: PR.cols, rows: PR.rows, trk: 0 }],
            notes: ['Recorded. All ' + AS.keys_seen + ' stores matched: ' + (AS.runtime_equals_keygroup_class_for_p2 ? 'yes' : 'no') + '.']
          }
        ]
      }),

      B.rows({
        id: 'm7-uid', t: 1, src: 'rec', title: 'Stop it, rename an operator, and start it again',
        steps: [
          {
            say: 'I stopped the job with a savepoint after ' + n0(FR.orders) + ' orders, produced ' + n0(RS.orders_in_total - FR.orders) + ' more, and started the job from the savepoint with the process function\'s uid changed from `watch` to `renamed`. The job **failed at restore**. The message is long, but the important part is in the middle.',
            tabs: [{ layer: 'RECORDED', name: 'The failure of the job with another uid', c: 'raw', cols: ['Message'], rows: [[WU.message.replace('Caused by: java.util.concurrent.CompletionException: java.lang.IllegalStateException: ', '')]], trk: 0 }],
            notes: ['Recorded. The command line said the job was submitted (exit code ' + WU.cli_exit_code + '). The failure came afterwards, when the JobManager tried to restore the state. The job state was ' + WU.job_state + '.']
          },
          {
            say: 'The savepoint files the state under the **uid** of each operator. A job with an operator that has a different uid cannot find its state, and Flink refuses to start rather than lose it. The message offers `--allowNonRestoredState`, which starts the job and **throws that state away**. Use it only when you mean it.',
            tabs: [{ layer: 'RECORDED', name: 'What the savepoint knows', c: 'raw', cols: ['Operator', 'uid in the savepoint', 'uid in the new job', 'Result'], rows: [['Kafka source', 'orders-source', 'orders-source', 'state restored'], ['parse', 'parse', 'parse', 'no state'], ['process function', 'watch', 'renamed', 'cannot be mapped: the job is refused']], trk: 2 }],
            notes: ['The uids are in the code you saw; the third row is the recorded failure.']
          },
          {
            say: 'With the **same** uid the job started from the savepoint, read the second batch, and after five quiet seconds printed the totals of **' + n0(RS.orders_in_total) + '** orders: the first ' + n0(FR.orders) + ' that it had counted before the stop and the next ' + n0(RS.orders_in_total - FR.orders) + '. They were all right.',
            tabs: [{ layer: 'RECORDED', name: 'The totals after the restart', c: 'raw', cols: ['Store', 'Orders', 'Cents'], rows: RS.sample, trk: 0 }],
            notes: ['Recorded. ' + RS.idle_lines + ' of 12 stores printed. The recorder compared all of them with the truth for ' + n0(RS.orders_in_total) + ' orders.']
          }
        ]
      }),

      B.quiz({
        id: 'm7-q1', t: 1,
        q: 'A job has a keyed process function with state. You deploy a new version of the code and restore the old savepoint. What must stay the same?',
        opts: [
          { t: 'The uid of the stateful operators', fb: '' },
          { t: 'The name of the class of the process function', fb: 'State is not filed under the class name.' },
          { t: 'The parallelism', fb: 'A savepoint can be restored with another parallelism.' },
          { t: 'The checkpoint interval', fb: 'The interval can change at will.' }
        ],
        ok: 0,
        why: 'State in a savepoint is filed under the operator uid. Without a stable uid Flink generates one from the shape of the job, and any change in the shape breaks the restore. In the recording a renamed uid was refused.'
      }),

      B.quiz({
        id: 'm7-q2', t: 1,
        q: 'The orders of one store must always go to the same task. Which call does that in the DataStream API?',
        opts: [
          { t: 'keyBy, with the store as the key', fb: '' },
          { t: 'rebalance', fb: 'rebalance spreads records round robin and splits a store over tasks.' },
          { t: 'map', fb: 'map transforms a record. It does not move it.' },
          { t: 'setParallelism(1)', fb: 'It would put everything in one task.' }
        ],
        ok: 0,
        why: 'keyBy partitions the stream by the hash of the key into key groups, and each task holds a range of key groups. A keyed process function then sees all records of a store, and its state of that store.'
      }),

      B.quiz({
        id: 'm7-q3', t: 2,
        q: 'Store s01 sells a third of the orders. You raise the parallelism of the keyed operator from 4 to 12. What happens to the busiest task?',
        opts: [
          { t: 'It stays as busy: one key always goes to one task', fb: '' },
          { t: 'It gets three times less work', fb: 'A key group belongs to one task. s01 is one key.' },
          { t: 'Flink splits s01 over several tasks', fb: 'Flink never splits a key.' },
          { t: 'The job fails with too many tasks', fb: 'Twelve tasks are fine for twelve keys.' }
        ],
        ok: 0,
        why: 'The key group of s01 is one of 128, held by one task at any parallelism. More tasks help the other stores, not s01. The fix for a hot key is in the data: add a salt to the key, pre-aggregate, or split the work another way.'
      }),

      B.bug({
        id: 'm7-bug', t: 1, q: 'A team keeps a count in a keyed function, and after a release the job cannot restore its savepoint. Nothing else changed. Click the line whose absence causes it.',
        file: 'Job.java', lang: 'java',
        code: ['events', '    .keyBy(e -> e.storeId)', '    .process(new CountPerStore())', '    .name("count per store")', '    .print();'].join('\n'),
        bad: [4],
        hint: 'How does Flink know, after a release, which state belongs to this operator?',
        why: 'There is no `.uid("count-per-store")`. Flink generates an id from the structure of the job, so adding or removing an operator upstream changes the id of this one, and its state can no longer be found. Set a uid on every stateful operator, once, and never change it.',
        fix: ['events', '    .keyBy(e -> e.storeId)', '    .process(new CountPerStore())', '    .name("count per store")', '    .uid("count-per-store")', '    .print();'].join('\n'),
        cheer: 'Name your state.'
      }),

      B.order({
        id: 'm7-ord', t: 1, q: 'Put in order what happens to an order for store s03 in the keyed process function.',
        items: [
          'The order is hashed by its store into one of 128 key groups',
          'The records are sent to the task that holds that key group',
          'processElement runs with the state of s03 selected',
          'The count and the total of s03 are updated and the alarm timer of s03 is moved'
        ],
        why: 'The key decides the task, the task selects the state of the key, and the function only ever sees one key at a time. That is why a keyed function needs no locks.'
      }),

      B.incident({
        id: 'm7-inc', t: 2, src: 'rec', title: 'Incident: the release is blocked, the new version cannot start from the savepoint', time: '11:40',
        alert: '**A refactor split one operator into two and renamed another. The new version of the job, started from last night\'s savepoint, fails at once with "Cannot map checkpoint/savepoint state for operator ... to the new program".** The state is three weeks of counts. A colleague suggests --allowNonRestoredState.',
        clues: ['The operators had no explicit uids', 'The message names an operator that is missing in the new program', 'The state is three weeks of counts for every store'],
        opts: [
          { t: 'Do not start with --allowNonRestoredState. Restore the old version, add explicit uids that match the old generated ones, or migrate the state, then release', fb: '' },
          { t: 'Use --allowNonRestoredState and rebuild the counts', fb: 'It starts the job and silently drops the state of the missing operator. Three weeks of counts would be gone.' },
          { t: 'Delete the savepoint and start empty', fb: 'Same loss, with no way back.' },
          { t: 'Raise the parallelism', fb: 'That has no bearing on the mapping of the state.' }
        ],
        best: 0,
        why: 'The state of the old operator is filed under an id that the new program no longer has. The flag would drop it. The safe way is to keep the job restorable: give the operators the uids they had, or migrate the state with the State Processor API. The recording refused a job whose uid was renamed, with exactly this message.',
        checks: [['Read the whole error message', 'Which operator id is missing?'], ['Look for .uid() in the code', 'Are the stateful operators named?'], ['Check the savepoint is still there', 'It is your only copy of the state.']],
        tell: 'The new program lost the id of an operator that held state. I do not use the flag that drops state. I restore the old job, add the explicit uids, and release again, and I set a uid on every stateful operator from the start.',
        prevent: ['Set .uid() on every stateful operator in code review', 'Test a restore from a savepoint in CI before every release', 'Keep the last good savepoint until the new version has run for a day']
      }),

      B.qa({
        id: 'qa-ds', t: 1, tag: 'DataStream', secs: 75,
        q: 'When do you use the DataStream API instead of SQL, and what is in a typical stateful job?',
        pts: ['SQL first', 'DataStream for custom state, timers, rules', 'Source, keyBy, process function, sink', 'ValueState and timers', 'uids and names'],
        short: 'I start with SQL for filters, joins, aggregates, windows and CDC. I use the **DataStream API** when the logic needs state or timers that SQL cannot express, for instance an alarm for a store that has had no orders for five minutes. A typical job has a **source**, a `keyBy`, a **process function** that keeps **ValueState**, ListState or MapState and registers **timers**, and a sink. In my job each order updated three values for its store and moved a timer; when the timer fired, it printed the store\'s totals. Every stateful operator gets an explicit `.uid()`, and every operator a `.name()` for the web UI.',
        fu: [['What kinds of state are there?', 'Value, list, map, reducing and aggregating state, for the current key; and operator state for sources and sinks.'], ['Event time or processing time timers?', 'Event-time timers fire when the watermark passes them. Processing-time timers use the clock, as in my job.']],
        trap: 'Using DataStream for a job that SQL could say in five lines: more code, more tests, more to upgrade.'
      }),

      B.qa({
        id: 'qa-uid', t: 1, tag: 'DataStream', secs: 60,
        q: 'Why do operators need uids, and what happens if they change?',
        pts: ['State in a savepoint is filed by uid', 'Generated ids depend on the job shape', 'A missing id: the restore is refused', 'allowNonRestoredState drops state', 'Set uids from the start'],
        short: 'A savepoint stores the state of each operator under its **uid**. If you do not set one, Flink generates it from the structure of the job, so adding an operator or reordering can change it. A restore then cannot match the state to the operator. In my recording a job started from a savepoint with a renamed uid was **refused**, with "Cannot map checkpoint/savepoint state for operator ... to the new program"; with the original uid the same savepoint restored and the counts of ' + n0(RS.orders_in_total) + ' orders were right. The flag `--allowNonRestoredState` starts the job anyway and drops the state that does not match, so I use it only when I mean to lose that state.',
        fu: [['Does it apply to SQL?', 'SQL derives the ids from the plan, so a changed query can break a restore. Compiled plans keep the plan fixed.'], ['What if I already shipped without uids?', 'Restore with the generated ids shown in the error, set matching uids, and release.']],
        trap: 'Thinking that the name of an operator is its identity. The name is for the UI; the uid is for the state.'
      }),

      B.qa({
        id: 'qa-keygroup', t: 2, tag: 'DataStream', secs: 75,
        q: 'How does Flink decide which task holds a key, and what happens when you change the parallelism?',
        pts: ['Hash the key into one of max-parallelism key groups', 'Each task holds a range of key groups', '128 by default', 'Rescale moves key groups, not single keys', 'A hot key stays on one task'],
        short: 'Flink hashes the key (`hashCode`, then a murmur hash) into one of **max-parallelism key groups**, 128 by default. Each task holds a contiguous **range** of key groups, and a key group is the unit that moves when the parallelism changes: task = key group times parallelism divided by max parallelism. I asked Flink\'s own `KeyGroupRangeAssignment` for twelve stores: store s01 was key group ' + KG.rows[0][1] + ' and sat on task ' + KG.rows[0][2] + ' at parallelism 2, ' + KG.rows[0][3] + ' at 3. A savepoint can be restored with another parallelism because the state is stored by key group. Two limits: the parallelism can never exceed the max parallelism, which is fixed with the state, and a busy key always lands on one task.',
        fu: [['How do you fix a hot key?', 'Change the key: add a salt, pre-aggregate before the keyBy, or split the logic in two stages.'], ['Can I change max parallelism?', 'Not for existing state, without migrating it.']],
        trap: 'Believing that more parallelism spreads a single hot key. It spreads keys, not one key.'
      }),

      B.recap({
        id: 'm7-recap', n: 7, badge: 'Stream Coder', color: '#C6F3E6',
        pts: [
          'Use **SQL first**. Use the **DataStream API** for custom state, timers and rules. A job is a source, a **keyBy**, a **process function** with state and timers, and a sink.',
          'Every stateful operator needs an explicit **uid**. A renamed uid was **refused** at restore; the same uid carried ' + n0(RS.orders_in_total) + ' orders across a stop and a restart.',
          '**Key groups**: the hash of a key picks one of 128 groups; each task holds a range. Flink\'s own class and a running job agreed on all ' + AS.keys_seen + ' stores.',
          'A hot key stays on one task, whatever the parallelism: s01 sells a third of the orders.',
          'Build with `javac` and `jar`, run with `flink run -d`, stop with `flink stop --savepointPath`, and restart with `-s <savepoint>`.'
        ]
      })
    ]
  });
})();
