/* Mission 4: defend it. The talk track and the questions that a reviewer asks about this CDC pipeline. Every number is from the recording of the real runs, or from a bug hunt that the verifier reruns. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n, M = function (k) { return G.meta(k); };
  var RUNS = C('runs'), R1 = RUNS.snapshot, R2 = RUNS.changes, R3 = RUNS.replay, R4 = RUNS.backlog, A2 = C('after_changes'), A5 = C('after_identity'), T = C('tests'), OPS = C('ops'), TOPIC = C('topic');
  G.expect(T.passed === 8 && R1.inserted === 200 && R2.updated === 36 && R3.left === 86 && R4.updated === 100 && A2.live === 245 && A2.deleted === 5 && A5.bronze === 389 && TOPIC.changes === 287, 'the totals that the answers quote: 8 tests, 200 snapshot rows, 36 updates, 86 rows left alone, 100 backlog updates, 245 live rows, 5 deleted, 389 messages in the end');
  var SOL = 'latest = Window.partitionBy(\'id\').orderBy(F.col(\'lsn\').desc())\ncurrent = events.withColumn(\'rn\', F.row_number().over(latest)).where(\'rn = 1\').where("op != \'d\'")\nprint(current.count())\n';

  var QA = [['qa-walk', 1], ['qa-log', 1], ['qa-order', 1], ['qa-delete', 1], ['qa-replay', 1], ['qa-slot', 2], ['qa-gate', 2], ['qa-schema', 2], ['qa-scale', 2], ['qa-change', 2]];

  LAB.addChapter({
    id: 'm4', n: 4, title: 'Defend it', short: 'Defend', blurb: 'The two-minute story, the questions of a review, a coding round, and what you would change', minutes: 30,
    focus: ['mon'],
    goals: [
      'Tell the project in **two minutes**, with numbers that you ran.',
      'Answer the **questions of a review**: why the log, order, deletes, repeats and the slot.',
      'Solve a **coding round**: the current state from a log of changes.',
      'Say what you would **change**, and what the project does **not** cover.'
    ],
    say: 'A project is only worth what you can defend. This mission is the interview: the story in two minutes, the questions that a reviewer asks, a coding round, and the honest list of what the project does not do. Every number below came from a run.',
    scenes: [
      B.talk({
        id: 'm4-story', t: 1, src: 'rec', title: 'The project in two minutes',
        say: 'Five parts, one idea each. Say them out loud, and use the numbers.',
        items: [
          ['The problem', 'Brewline\'s orders live in a PostgreSQL database. The data team needs a table that **follows every change, deletes included**, without querying the shop all day, and a way to **prove** that it is right.', 'Say what the readers need.'],
          ['The design', '**Debezium** reads the Postgres log into a **Kafka** topic. A Spark stream keeps every message in **bronze**, and a second stream **merges** them into **silver** by **log position**, with deletes as marks. A **gate** reads Postgres and compares every row.', 'Log, topic, bronze, silver, gate.'],
          ['The proof', 'I ran it for real. The snapshot gave **' + R1.new_messages + '** messages and **' + R1.inserted + '** orders. A day of changes gave **' + R2.new_messages + '** messages, **' + R2.inserted + '** inserts and **' + R2.updated + '** updates, and silver matched Postgres on **' + A2.live + '** live orders and **' + n(A2.revenue) + '** cents.', 'Numbers that you ran.'],
          ['The failures', 'A batch **ran twice** and left **' + R3.left + '** rows alone. The connector was **stopped** while **' + R4.new_messages + '** orders shipped, and nothing was lost. Three bug hunts broke the merge: an old message turned **SHIPPED** into **PLACED**, two events of one order stopped the run, and a hard delete let a deleted order **come back**.', 'Failures that you caused and fixed.'],
          ['The honest part', 'One machine, one partition, one table. **No alerts on the slot**, no schema registry, no handling of a new column, and **nothing timed**. I would watch the slot first.', 'What is missing, said first.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm4-covered', t: 1, src: 'rec', title: 'What the project covers, and what it does not',
        say: 'A reviewer will ask about the edges of the project. Press Next to see where they are.',
        cols: ['Topic', 'In the project', 'Status'],
        hl: 1,
        rows: [
          ['Capture of inserts, updates and deletes', 'Debezium on the Postgres log. ' + OPS.c + ' inserts, ' + OPS.u + ' updates and ' + OPS.d + ' deletes, after a snapshot of ' + OPS.r + ' rows', 'Run'],
          ['Ordering, repeats and deletes', 'A merge by log position, a batch that ran twice, deletes as marks', 'Run'],
          ['A connector that stops', 'A stop, a backlog of ' + R4.new_messages + ' changes, a restart with no loss', 'Run'],
          ['Reconciliation with the source', 'A gate of 5 checks that reads Postgres, and ' + T.passed + ' pytest tests', 'Run'],
          ['Schema changes, a large table, several partitions', 'None of them is handled', 'Not built'],
          ['Alerts, security, a cluster, a registry', 'None of them exists', 'Not built']
        ],
        steps: [
          { upto: 4, say: 'The first four rows are what the project **proves**. Each one has a run behind it, and most have a bug hunt that breaks it.' },
          { upto: 6, say: 'The last two are what a production version adds. Say them **before** the reviewer does: a gap that you name is a plan, and a gap that is found is a flaw.' }
        ]
      }),

      B.qa({
        id: 'qa-walk', t: 1, tag: 'Project', secs: 90,
        q: 'Walk me through your pipeline, from the database to the table.',
        pts: ['Log, connector, topic', 'Bronze keeps the messages', 'Silver merges by position', 'A gate against the source'],
        short: 'Postgres writes every change to its log. **Debezium** reads it through a replication slot and writes **one message** for each change to a Kafka topic, after a **snapshot** of the table. A Spark stream copies every message to **bronze** as text, with its offset. A second stream applies the messages to **silver**: it keeps the latest event of each row by **log position**, and merges it only when it is **newer** than the row, so a repeat changes nothing. A delete **marks** the row. A **gate** reads Postgres and compares the live rows, the revenue and every row. I ran it for real: **' + R1.new_messages + '** messages in the snapshot, **' + R2.new_messages + '** in a day of changes, silver at **' + A2.silver + '** rows (**' + A2.live + '** live), equal to the database.',
        fu: [['Where would you replay from?', 'From bronze, which holds every message. Or from the topic, while Kafka still keeps it.'], ['What did you not build?', 'Alerts on the slot, schema changes, and anything beyond one table.']],
        trap: 'Naming the tools and not the guarantees.',
        real: 'Walk through a pipeline that you own.'
      }),

      B.qa({
        id: 'qa-log', t: 1, tag: 'Project', secs: 60,
        q: 'Why read the log, and not poll the table?',
        pts: ['Deletes', 'Every update', 'No load on the table', 'The cost: a slot'],
        short: 'A poll on `updated_at` sees only the rows that are still there with a **newer time**. It **never sees a delete**, it misses an update that does not touch the column, and each poll is a query on the shop database. The **log** has every committed change, **' + OPS.d + ' deletes** among the **' + (OPS.c + OPS.u + OPS.d) + ' changes** of the recording, in order, with no query on the table. The cost is operational: a **replication slot** that holds the log when the reader is away, a **Connect worker** to run, and `wal_level = logical`, which needs a restart. For a table that never deletes and changes slowly, polling is a smaller thing to run, and I would say so.',
        fu: [['What about triggers?', 'They see deletes, and they make every write of the shop pay for a second write.'], ['Is the log enough for the first load?', 'No: the snapshot reads the rows that were there before the slot.']],
        trap: 'Saying that log-based capture is always better.',
        real: 'Explain why you chose a capture method.'
      }),

      B.qa({
        id: 'qa-order', t: 1, tag: 'Project', secs: 60,
        q: 'Messages can arrive twice and out of order. How do you get the right state?',
        pts: ['The log position of the change', 'Apply only newer events', 'One event for each key in a batch', 'The gap: one partition'],
        short: 'Every event carries the **`lsn`**, the position of its change in the Postgres log. It belongs to the **change**: a message that is sent again has a new Kafka offset and the **same `lsn`**. So the merge updates a row **only when the event\'s `lsn` is newer**, and a batch keeps the **latest event of each row** first, because Delta refuses a merge in which two source rows match one row. In the recording a batch that ran again left **' + R3.left + '** rows alone. Without the condition, an old message turned **SHIPPED** into **PLACED** in my hunt. The gap: the `lsn` orders the changes of **one database**, and I used one table and one partition. Several tables or partitions would need a rule for what order means.',
        fu: [['What if two events have the same lsn?', 'The later offset wins, so the answer is the same on every run.'], ['Why not order by time?', 'A time can be written by anyone, and a delete has none.']],
        trap: 'Ordering by arrival.',
        real: 'Describe how you handled out-of-order data.'
      }),

      B.qa({
        id: 'qa-delete', t: 1, tag: 'Project', secs: 60,
        q: 'How do you handle deletes?',
        pts: ['A delete is an event', 'A mark, not a removal', 'Trust the key only', 'Readers filter'],
        short: 'A delete is a message with no row after it. Its `before` has the **key**, and the other columns are **placeholders** under the default replica identity: `0`, an empty text, the year 1970. So the parser takes the key from `before` and the columns from `after`, and silver **marks** the row with `is_deleted` and the new `lsn`, and keeps the other columns. I do not remove the row, because an old update that is delivered again would find nothing and **insert the order back**: in my hunt it came back as **1 live row** for an order that Postgres no longer has. The cost is that every reader must filter the marks, and the gate does. I recorded **' + OPS.d + '** deletes and **' + A2.deleted + '** marked rows.',
        fu: [['How do you remove the rows for good?', 'A job that deletes the marks older than any message that can still arrive, which I did not build.'], ['And for privacy?', 'A delete for a legal reason needs a plan for bronze too. I did not build one.']],
        trap: 'Removing the row and trusting that nothing old will arrive.',
        real: 'Describe a delete that came back.'
      }),

      B.qa({
        id: 'qa-replay', t: 1, tag: 'Project', secs: 60,
        q: 'What happens if the job dies in the middle of a batch?',
        pts: ['At least once', 'The batch runs again', 'The merge absorbs it', 'I made it happen'],
        short: '`foreachBatch` is **at least once**: if the program dies after the merge and before the commit, the same batch runs again. That is fine **only because the merge is safe to repeat**. I did not trust it: I removed the commit of the last batch, as a crash would leave it, and ran the job. Bronze read **' + R3.new_messages + '** new messages, silver processed the **same ' + R3.events + ' events**, and the merge **inserted ' + R3.inserted + ', updated ' + R3.updated + ' and left ' + R3.left + ' alone**. The totals did not move, and the history of silver has a version with zeros. The connector is at least once too: a restart can send a message again, and the same rule absorbs it. Both repeats are handled by **one** condition.',
        fu: [['Why not exactly once?', 'It needs the sink to commit the offsets and the data in one transaction. A merge by position is simpler, and it covers both repeats.'], ['How did you simulate the crash?', 'By removing the commit file of the last batch, and its checksum file.']],
        trap: 'Assuming that the framework gives exactly once.',
        real: 'Describe how you tested a failure.'
      }),

      B.qa({
        id: 'qa-slot', t: 2, tag: 'Project', secs: 60,
        q: 'What is the biggest operational risk of this design?',
        pts: ['The slot holds the log', 'A connector that stays down', 'Alerts and a limit', 'The way out'],
        short: 'The **replication slot**. Postgres keeps the log that the slot has not confirmed, so while the connector is **away** the log **grows**. In the recording the slot was released when the connector stopped, the log it held grew while **' + R4.new_messages + '** orders shipped, and after the restart the backlog came, nothing was lost, and the held log dropped. That is the safety. The risk is a connector that **never returns**: the log fills the disk, and the shop stops. I would **alert** on an inactive slot and on the bytes that it holds, and set `max_slot_wal_keep_size` as a limit. I know that setting from the documentation and did not run it. If the connector cannot come back, I drop the slot and take a new snapshot, and I know that deletes made in the gap are not in it.',
        fu: [['Who is paged?', 'The owner of the pipeline, for an inactive slot, before the disk is a problem.'], ['Does a stopped consumer matter too?', 'Kafka keeps the messages for its retention, and Spark remembers its offsets. A long stop needs a look at the retention.']],
        trap: 'Not knowing that a slot holds the log.',
        real: 'Describe an incident of a disk that filled.'
      }),

      B.qa({
        id: 'qa-gate', t: 2, tag: 'Project', secs: 60,
        q: 'How do you know that the copy is right?',
        pts: ['A gate with 5 checks', 'It reads the database', 'The strict check: every row', 'What it cannot see'],
        short: 'A **gate** runs after every run, with **5 checks**: every message of the topic is in bronze (rows against the offsets of Kafka), silver has one row for each order, and the live orders, their revenue and **every row** equal what **Postgres** holds. The last one is a full outer join with the source, and its answer must be **0**. It reads the database itself, so a message that never reached Kafka cannot hide: layers that only compare each other would agree on a loss before them. After the day of changes it said **' + A2.live + '** live orders on both sides and **' + n(A2.revenue) + '** cents. What it cannot see is a **change in the middle of a run**: it compares at one moment, so a busy table needs a quiet point or a position to compare at.',
        fu: [['Is it expensive?', 'It reads the whole table over JDBC. For a big table I would compare counts and sums by partition.'], ['What if the source changes while the gate runs?', 'It can fail for a good reason. I would compare as of a log position.']],
        trap: 'Comparing the layers only with each other.',
        real: 'Describe a check that caught a loss.'
      }),

      B.qa({
        id: 'qa-schema', t: 2, tag: 'Project', secs: 60,
        q: 'A column is added to the table. What happens?',
        pts: ['The events change', 'The parser ignores it', 'Bronze keeps the text', 'A contract'],
        short: 'The events get a new field. My parser knows **five columns**, so it **ignores the sixth**: silver goes on, and nothing is lost, because **bronze** keeps the raw text of every message. The field is not in silver until someone adds it to the schema and replays from bronze, and I did not build that replay. A **renamed** or **retyped** column is worse: the parser reads null, and the gate would show it as a difference. I have no schema registry: the messages are JSON with no schema, so nothing checks a message before the parser. In production I would add a **contract** with the owners of the table, a registry with compatibility rules, and an alert on a new field. I did not run a schema change, and this answer is from the documentation of Debezium and not from a run.',
        fu: [['Would you use Avro?', 'With a registry, yes: it gives a check and a smaller message.'], ['What does Debezium do on its own?', 'It emits events with the new shape after the change. The details I did not run.']],
        trap: 'Saying that it will work, with no run.',
        real: 'Describe how you handled a change of a source table.'
      }),

      B.qa({
        id: 'qa-scale', t: 2, tag: 'Project', secs: 60,
        q: 'What changes with a hundred tables, a large table and a cluster?',
        pts: ['The snapshot of a large table', 'Several tables and partitions', 'A cluster and its settings', 'Nothing was measured'],
        short: 'Four things. A **large table** cannot be read in one snapshot: Debezium has an **incremental snapshot**, which I did not use. **Several tables** need a topic each, and **partitions** need a key that keeps the changes of one row in one partition, since the order of the log holds only inside a partition. A **cluster** means three brokers, a replication factor of three, several Connect workers, and settings for a connector that moves between them. And **silver** would be partitioned or clustered by something other than the id. I ran **one table, one partition and one broker** on one machine and timed nothing, so I cannot say what lag or throughput this gives. I would measure the lag first, the time from the commit in Postgres to the row in silver.',
        fu: [['How would you key the topic?', 'By the primary key, which is what Debezium does by default.'], ['What would you watch?', 'The lag of the consumer, the slot, and the state of the connector.']],
        trap: 'Claiming a scale that you did not test.',
        real: 'Describe a pipeline that you scaled.'
      }),

      B.qa({
        id: 'qa-change', t: 2, tag: 'Project', secs: 60,
        q: 'What would you change if you built it again?',
        pts: ['Alerts on the slot first', 'Schema changes', 'A gate at a position', 'Measure the lag'],
        short: 'Four things, in this order. **First the alerts**: an inactive slot, the bytes that it holds, and a connector that is not running, because the worst failure of this design is silent. **Second schema changes**: a contract, a registry, and a replay of silver from bronze that I have tested. **Third a gate that compares at a position** instead of at a moment, so that it does not fail on a busy table. **Fourth I would measure**: the lag from the commit to silver, and the log that a slot holds, on something larger than my machine. I would also test the **delete of a row that was never in silver**, and a **snapshot after a gap**, which my drill describes and I did not run. And I would keep the stack of the walkthrough in a container image, so that a reader can start it in one command.',
        fu: [['What would you keep?', 'The merge by position, the delete marks, and the gate that reads the source.'], ['What did the hunts teach you?', 'That every rule of the merge is there because something broke without it.']],
        trap: 'Saying that nothing needs to change.',
        real: 'Describe a decision that you would take differently.'
      }),

      B.challenge({
        id: 'm4-ch', t: 1, title: 'Coding round: the current state from a log of changes', file: 'challenge.py', lang: 'python',
        q: 'The topic holds **' + n(TOPIC.changes) + '** change events of the orders. `events` is a Spark DataFrame with `id`, `op`, `lsn`, `status` and `amount_cents`. An order can have many events, and a delete (`op = "d"`) has no status or amount. Write the code that returns the **current live orders**: the **latest** event of each id by `lsn`, **without** the ids whose latest event is a delete. Print the number of rows.',
        starter: 'from pyspark.sql import Window, functions as F\n\ncurrent = events  # your code here\nprint(current.count())\n',
        hints: ['A **window** over each order: `Window.partitionBy(\'id\')`, ordered by `lsn` **descending**.', '`F.row_number().over(window)` numbers the events of each order, with 1 for the latest. Keep `rn = 1`.', 'Remove the deletes **after** you pick the latest event: an order whose last event is a delete is gone, and an order whose delete came before a later insert is alive.', 'Filter on `op != \'d\'` last, and drop the helper column if you want the columns of the table.'],
        sol: SOL,
        res: { cols: ['Events', 'Live orders'], rows: [[n(TOPIC.changes), n(A2.live)]] },
        expl: ['`partitionBy(\'id\')` makes a group for each order, and ordering by `lsn` descending puts its **latest** event first.', '`row_number() = 1` keeps that one event. **' + n(TOPIC.changes) + '** events become **' + n(A2.silver) + '** orders: ' + A2.live + ' that are alive and ' + A2.deleted + ' whose latest event is a delete.', '`op != \'d\'` removes the deleted orders **after** the latest event is picked. Filtering the deletes first would keep an old event of a deleted order, and it would come back. The result, **' + n(A2.live) + '**, is the number of orders in Postgres.'],
        cx: 'The window shuffles by `id` and sorts each group. For a stream, do it per micro-batch and merge it by position, as silver does, instead of recomputing the whole log. On a very large log, `groupBy(\'id\').agg(F.max(F.struct(\'lsn\', ...)))` avoids the sort, with the struct starting on `lsn`.'
      })
    ].concat(B.mockRound(QA.map(function (x) { return x[0]; }), QA.map(function (x) { return x[1]; }))).concat([
      B.cheat({
        id: 'm4-cheat', t: 1, src: 'rec', title: 'One page to review',
        say: 'This is your last-minute review. The numbers come from the real runs with PostgreSQL ' + M('postgres') + ', Kafka ' + M('kafka') + ', Debezium ' + M('debezium') + ', Spark ' + M('pyspark') + ' and Delta Lake ' + M('delta') + ', and from the bug hunts. Take a screenshot or print the page.',
        sections: [
          { h: 'The design', items: ['**Debezium** reads the Postgres log through a **slot** and a **publication**: a snapshot first, then one message for each change. Events have `op` (`r`, `c`, `u`, `d`), `before`, `after` and `source.lsn`', '**Bronze**: every message as text, with partition and offset. **Silver**: the latest event of each row by `lsn`, **merged only when newer**, deletes as **marks**', '**Gate**: 5 checks, and it **reads Postgres**. **' + T.passed + '** pytest tests'] },
          { h: 'The runs', items: ['Snapshot: **' + R1.new_messages + '** messages, **' + R1.inserted + '** inserted. A day of changes: **' + R2.new_messages + '** messages, **' + R2.inserted + '** inserted, **' + R2.updated + '** updated. Silver **' + A2.silver + '** rows, **' + A2.live + '** live, **' + A2.deleted + '** deleted', 'A batch that ran again: **' + R3.events + '** events, **' + R3.inserted + '** inserted, **' + R3.updated + '** updated, **' + R3.left + '** left alone', 'The connector stopped: **' + R4.new_messages + '** changes came after the restart, nothing lost. The topic ended at **' + n(TOPIC.identity) + '** messages: ' + OPS.r + ' reads, ' + OPS.c + ' creates, ' + OPS.u + ' updates, ' + OPS.d + ' deletes'] },
          { h: 'What the bug hunts showed', items: ['A merge **without** the `lsn` condition: an old message turned **SHIPPED** into **PLACED**', 'No window: two events of one order stopped the run, `DELTA_MULTIPLE_SOURCE_ROW_MATCHING_TARGET_ROW_IN_MERGE`', 'A **hard delete**: an old update brought the deleted order back as **1 live row**', 'A replay that removes the commit but not its `.crc` file: Spark cannot write the commit again'] },
          { h: 'Not covered (say it first)', items: ['No alerts on the slot or the connector, no `max_slot_wal_keep_size`, nothing timed', 'No schema change, no incremental snapshot, one table, one partition, one broker', 'No registry, no TLS, no login, no Docker, no CI'] }
        ]
      }),

      B.recap({
        id: 'm4-recap', n: 4, badge: 'Defender', color: '#334155',
        pts: [
          'You tell the project in **two minutes**: the problem, the design, the proof, the failures and the honest part.',
          'You say what each choice **guarantees**: the log sees every change, the merge by position absorbs a repeat, a mark keeps a delete, and the gate reads the source.',
          'You back each claim with a **number that you ran**: ' + R1.new_messages + ' snapshot messages, ' + R2.updated + ' updates, ' + R3.left + ' rows left alone, ' + A2.live + ' live orders.',
          'You name the **gaps** before the reviewer does: the slot, schema changes, scale, alerts and security.',
          'You solve the **coding round** on the current state of a log, and you filter the deletes **after** the latest event.'
        ],
        lines: [
          'I can defend every design choice with a run.',
          'I name the gaps before I am asked.',
          'I know that a slot holds the log.'
        ]
      })
    ])
  });
})();
