/* Mission 2: apply it. Bronze, the parser, and the silver merge by log position. The files are those of projects/brewline-cdc, and the runs are real. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n, M = function (k) { return G.meta(k); };
  var RUNS = C('runs'), R1 = RUNS.snapshot, R2 = RUNS.changes, A2 = C('after_changes');
  var ENV = G.file('cdc/envelope.py'), BRZ = G.file('cdc/bronze.py'), SIL = G.file('cdc/silver.py');
  G.expect(R2.new_messages === 87 && R2.events === 87 && R2.batches === 1 && R2.inserted === 50 && R2.updated === 36 && R2.left === 0 && R2.gate.length === 5 && R2.gate.every(function (l) { return /^PASS/.test(l); }), 'the day of changes: 87 events in one batch, 50 inserted, 36 updated, 0 left alone, and the 5 gate checks pass');
  G.expect(A2.bronze === 287 && A2.silver === 250 && A2.silver_distinct === 250 && A2.live === 245 && A2.deleted === 5 && A2.source === 245 && A2.shipped === 30 && A2.refunded === 1 && A2.revenue === 1336770 && A2.revenue === A2.source_revenue, 'after the day of changes silver holds 250 rows (245 live, 5 deleted), 30 shipped and 1 refunded, and matches Postgres in orders and revenue');

  var MSPAN = G.span(SIL, /^    target = DeltaTable\.forPath/, /^    \)$/), MERGE_BLOCK = G.lines(SIL, MSPAN[0], MSPAN[1]);
  var MERGE_BAD = MERGE_BLOCK.replace(".whenMatchedUpdate(condition='s.lsn > t.lsn', set=changed)", ".whenMatchedUpdate(set=changed)");
  var DELETE_BAD = MERGE_BLOCK.replace("        .whenMatchedUpdate(condition='s.lsn > t.lsn', set=changed)\n", "        .whenMatchedDelete(condition='s.is_deleted AND s.lsn > t.lsn')\n        .whenMatchedUpdate(condition='s.lsn > t.lsn', set=changed)\n");
  var BATCH_BLOCK = G.lines(SIL, G.at(SIL, /^    order = /), G.at(SIL, /^    batch = ranked/));
  var BATCH_BAD = BATCH_BLOCK.replace("    batch = ranked.where('rn = 1').withColumn('is_deleted', F.col('op') == 'd')", "    batch = changes.withColumn('is_deleted', F.col('op') == 'd')");
  G.expect(MERGE_BAD !== MERGE_BLOCK && DELETE_BAD !== MERGE_BLOCK && BATCH_BAD !== BATCH_BLOCK, 'the three bug hunts replace lines that are in silver.py');

  LAB.addChapter({
    id: 'm2', n: 2, title: 'Apply it: bronze, silver and the merge by log position', short: 'Apply', blurb: 'The parser, bronze, and a merge that applies a change only when its position is newer', minutes: 28,
    focus: ['stg'],
    goals: [
      'Read the **parser**, and say where the key of a row comes from, for a delete too.',
      'Read **bronze** and the **silver merge**, line by line.',
      'Say why the merge compares the **log position**, and why a batch keeps **one event** for each row.',
      'Say what a **delete** does to silver, and why the row stays.'
    ],
    say: 'Now the messages become a table. Silver is where the pipeline earns its keep: the same row can arrive twice in a day, a delete must stick, and the order of the log must win over the order of arrival. I will show the code, run it on a day of real changes, and then break it three ways.',
    scenes: [
      B.code({
        id: 'm2-env', t: 1, src: 'rec', title: 'envelope.py: a change event as columns', file: 'envelope.py', lang: 'python', code: ENV,
        steps: [
          { say: 'One small file that knows the shape of a message. Press Next.', lines: null },
          { say: 'The **row** of an order, and the part of `source` that the pipeline needs: the log position `lsn`, and `snapshot`.', lines: G.span(ENV, /^ROW = /, /^SOURCE = /) },
          { say: 'The **envelope**: the row before, the row after, the source, and the operation. Everything else in the message is ignored.', lines: G.span(ENV, /^ENVELOPE = /, /^\)$/) },
          { say: '`parse` reads the text and keeps what silver needs. The **key** is the id of the row **after** the change, or **before** it for a delete: a delete has no row after it.', lines: G.span(ENV, /^def parse/, /^    \)$/) }
        ]
      }),

      B.code({
        id: 'm2-bronze', t: 1, src: 'rec', title: 'bronze.py: every message, as text', file: 'bronze.py', lang: 'python', code: BRZ,
        steps: [
          { say: 'Bronze copies and does not judge. Press Next.', lines: null },
          { say: '`ingest` is a **stream** from Kafka. It reads from the **earliest** offset the first time, and its **checkpoint** remembers where it stopped, so a later run reads only what is new.', lines: G.span(BRZ, /^def ingest/, /\.load\(\)$/) },
          { say: 'Each message keeps its **topic, partition and offset**, the time that Kafka gave it, and its value as **text**. Nothing is parsed, so a message that Spark cannot read is still here.', lines: G.span(BRZ, /^    messages = /, /^    \)$/) },
          { say: 'The stream writes to a **Delta table** and stops when it has read everything that is there (`availableNow`), so that a run has an end.', lines: G.span(BRZ, /^    query = /, /query\.awaitTermination/) }
        ]
      }),

      B.code({
        id: 'm2-silver', t: 1, src: 'rec', title: 'silver.py: one event for each row, and a merge by position', file: 'silver.py', lang: 'python', code: SIL,
        steps: [
          { say: 'The function that applies one micro-batch to silver. Press Next.', lines: null },
          { say: 'First the batch keeps **one event for each row**: the one with the **newest `lsn`**, and the later offset if two have the same. A row that changed twice in the batch counts once.', lines: G.span(SIL, /^    order = /, /^    batch = ranked/) },
          { say: 'Then what an update writes. A delete event has **no row**, so for the business columns `coalesce` keeps the values that silver already holds. The `lsn` and the **delete mark** always come from the event.', lines: G.span(SIL, /# a delete event has no row/, /^    new_row = /) },
          { say: 'The **merge**: match on the id. A row that is there is updated **only when the event\'s `lsn` is newer** than the row\'s. A row that is not there is inserted. A delete is an update that sets the mark, and **the row stays**.', lines: G.span(SIL, /^    target = DeltaTable/, /^    \)$/) },
          { say: 'The function returns what it did: the events, the rows after the window, and the **inserted** and **updated** rows from the history of the table. The rest is **left alone**.', lines: G.span(SIL, /^    metrics = /, /^    \}$/) }
        ]
      }),

      B.flow({
        id: 'm2-merge', t: 1, src: 'rec', title: 'One rule for repeats, old messages and deletes', g: 'merge', legend: true,
        steps: [
          { say: 'Every micro-batch goes through the same four stops. Press Next.', focus: ['bat', 'pick', 'cmp', 'slv', 'upd', 'skp'], cap: 'One rule for every message.' },
          { say: 'Step 1. A **batch** is whatever bronze received since the last one. The day of changes was **' + R2.events + '** events.', on: ['e1'], focus: ['bat', 'pick'], cap: 'A batch.' },
          { say: 'Step 2. The batch keeps **one event for each row**, the latest by position: **' + R2.events + '** events became **86** rows, because order 40 changed twice.', on: ['e2'], focus: ['pick', 'cmp'], cap: 'One per row.' },
          { say: 'Step 3. Each event meets the row of its order in silver, and the question is: **is its `lsn` newer?** A row that is not there is a new order.', on: ['e3'], focus: ['cmp', 'slv'], cap: 'Is it newer?' },
          { say: 'Step 4. **Yes: applied.** **' + R2.inserted + '** inserts, and **' + R2.updated + '** updates: 30 shipments, 5 delete marks and the order that changed twice.', on: ['e4'], focus: ['slv', 'upd'], tags: ['tg_gone'], cap: 'A real change.' },
          { say: 'Step 5. **No: left alone.** When the last batch ran **again**, all **' + RUNS.replay.left + '** rows were left alone and nothing changed.', on: ['e5'], focus: ['slv', 'skp'], tags: ['tg_replay'], cap: 'A repeat changes nothing.' }
        ]
      }),

      B.term({
        id: 'm2-changes', t: 1, src: 'rec', title: 'A day of changes',
        say: 'The shop worked for a day: new orders, shipments, five deletes, and an order that changed twice. This is the real second run.',
        lines: function () { return G.plain(X('run.changes')); },
        after: 'Postgres wrote **' + R2.new_messages + '** changes, and the topic grew from **' + n(R1.new_messages) + '** to **' + n(C('topic').changes) + '** messages. Silver merged them in **' + R2.batches + '** micro-batch: **' + R2.inserted + '** inserted and **' + R2.updated + '** updated. It holds **' + A2.silver + '** rows, **' + A2.live + '** live and **' + A2.deleted + '** marked deleted. The gate passed all 5 checks: Postgres has **' + A2.source + '** orders, the same as the live rows of silver, and **' + n(A2.source_revenue) + '** cents of revenue.',
        afterKind: 'tip',
        doneSay: 'Silver follows the database.'
      }),

      B.cmp({
        id: 'm2-ops', t: 1, src: 'rec', title: 'What the merge did with each kind of change',
        say: 'The day of changes held four kinds of change. Press Next to see what each one did to silver.',
        cols: ['Changes in Postgres', 'What the merge saw', 'What it did'],
        hl: 2,
        rows: [
          ['50 new orders', 'Events with an id that silver does not have', 'Inserted ' + R2.inserted],
          ['30 orders shipped', 'Events with a newer `lsn`', 'Updated 30'],
          ['5 orders deleted', 'Events with a newer `lsn` and no row after', 'Updated 5: the rows are marked'],
          ['1 order changed twice in one transaction', 'Two events of one row in one batch', 'Kept the later one: updated 1']
        ],
        steps: [
          { upto: 2, say: 'The easy cases: a new id is an **insert**, and a newer position is an **update**.' },
          { upto: 4, say: 'The two interesting cases: a **delete** is an update that sets the mark and keeps the columns, and **two events of one row** in a batch are reduced to one first. The totals: **' + R2.inserted + '** inserted, **' + R2.updated + '** updated (30 + 5 + 1), and **' + R2.events + '** events for **86** rows.' }
        ]
      }),

      B.widget({ id: 'm2-lab', kind: 'runlab', t: 1, src: 'rec', title: 'Lab: the runs of the pipeline' }),

      B.bug({
        id: 'm2-bug', t: 1, src: 'rec', q: 'A message that was created first is delivered again after a shipping update. Silver shows the order as `PLACED` again. Click the line that lets an old message overwrite a newer row.',
        file: 'silver.py', lang: 'python',
        code: MERGE_BAD,
        bad: [G.at(MERGE_BAD, /whenMatchedUpdate\(set=changed\)/)],
        hint: 'What does `whenMatchedUpdate` do when it has no condition?',
        why: 'With no condition, **every** message that matches a row overwrites it, so the **last to arrive** wins, and not the **latest to happen**. In my hunt an order was created (position 100), shipped (200), and then the creation message arrived again: silver said **PLACED**. With `s.lsn > t.lsn` it stays **SHIPPED**. Kafka and Debezium deliver at least once, so a message can come twice.',
        fix: MERGE_BLOCK + '\n',
        cheer: 'Compare positions, not arrivals.'
      }),

      B.bug({
        id: 'm2-bug2', t: 1, src: 'rec', q: 'An order is shipped and refunded in one batch. The run stops with a Delta error about several source rows. Click the line that forgets to keep one event for each row.',
        file: 'silver.py', lang: 'python',
        code: BATCH_BAD,
        bad: [G.at(BATCH_BAD, /batch = changes\.withColumn/)],
        hint: 'How many source rows match an order that changed twice in the batch?',
        why: 'The batch had **two** events for one row, and Delta Lake refuses a merge in which two source rows match **one** row of the table: the run failed with `DELTA_MULTIPLE_SOURCE_ROW_MATCHING_TARGET_ROW_IN_MERGE`. It is a safety, and not a bug of Delta: which of the two should win? A window by `lsn` decides it, and the day of real changes had exactly this case, the order that changed twice.',
        fix: BATCH_BLOCK + '\n',
        cheer: 'One event for each row, then merge.'
      }),

      B.bug({
        id: 'm2-bug3', t: 2, src: 'rec', q: 'An order was deleted. A while later an old update of the same order is delivered again, and the order is back in silver. Click the line that removes the row instead of marking it.',
        file: 'silver.py', lang: 'python',
        code: DELETE_BAD,
        bad: [G.at(DELETE_BAD, /whenMatchedDelete/)],
        hint: 'What does the merge find when the old update arrives, and the row is gone?',
        why: 'With a hard delete the row is **gone**, so the old update finds **no row** and is **inserted** as a new order. In my hunt an order was created (100), updated (200) and deleted (300), and then the update was delivered again: silver held **1 live row** for an order that Postgres no longer has. A **mark** keeps the row and its `lsn` 300, and the old update is left alone. The gate would have caught it, as a live count above the count of Postgres.',
        fix: MERGE_BLOCK + '\n',
        cheer: 'A delete needs a memory.'
      }),

      B.quiz({
        id: 'm2-q1', t: 1,
        q: 'The day of changes had **' + R2.events + '** events, and the merge worked on **86** rows. Why?',
        opts: [
          { t: 'One order changed twice in a transaction, and the window kept the latest of its two events', fb: '' },
          { t: 'One event was lost', fb: 'Bronze held all ' + R2.new_messages + ' messages, and the gate checks it.' },
          { t: 'One event was a duplicate that Kafka removed', fb: 'Kafka keeps every message that it receives.' },
          { t: 'The merge skipped one event', fb: 'The merge only sees what the window keeps.' }
        ],
        ok: 0, why: 'Order 40 was shipped and then refunded, in one transaction: two messages, two positions. The window kept the later one, so silver says `REFUNDED` and the batch counts one update for it: **30 + 5 + 1 = ' + R2.updated + '**.'
      }),

      B.quiz({
        id: 'm2-q2', t: 1,
        q: 'What does the merge write for a **delete** event?',
        opts: [
          { t: 'The delete mark and the new `lsn`, and the columns of the row stay as they were', fb: '' },
          { t: 'Nothing: the row is removed from silver', fb: 'The row stays, so that an old message cannot bring it back.' },
          { t: 'The placeholders of `before`: 0 and an empty text', fb: 'Only the key of `before` is trusted, and the parser does not read the rest.' },
          { t: 'A new row with a status `DELETED`', fb: 'There is no such status in Postgres.' }
        ],
        ok: 0, why: 'A delete has no `after`, so its business columns are null, and `coalesce` keeps the values that silver holds. The five deleted orders are still in silver: **' + A2.deleted + '** rows with the mark, and **' + A2.live + '** live.'
      }),

      B.quiz({
        id: 'm2-q3', t: 1,
        q: 'Why does the window order by `lsn`, and not by the offset of the message?',
        opts: [
          { t: 'The `lsn` belongs to the change, and a message that is sent again gets a new offset for the same change', fb: '' },
          { t: 'The offset is not a number', fb: 'It is a number, and it orders the messages of a partition.' },
          { t: 'Offsets are reset every day', fb: 'They are not.' },
          { t: 'Spark cannot read the offset', fb: 'Bronze keeps it, and the window uses it as a tie-break.' }
        ],
        ok: 0, why: 'A duplicate that arrives late has a **big** offset and an **old** `lsn`. Ordered by offset it would win, and the bug hunt shows what follows. The offset is only the tie-break for two events with the same position.'
      }),

      B.quiz({
        id: 'm2-q4', t: 2,
        q: 'Which step of silver makes the merge safe from Delta\'s error about several source rows?',
        opts: [
          { t: 'The window that keeps one event for each key before the merge', fb: '' },
          { t: 'The `coalesce` of the columns', fb: 'It keeps values for a delete. It does not reduce rows.' },
          { t: 'The condition `s.lsn > t.lsn`', fb: 'It decides which rows change, after Delta has matched the rows.' },
          { t: 'The checkpoint of the stream', fb: 'It remembers the offsets, and it has nothing to do with the merge.' }
        ],
        ok: 0, why: 'The error comes when the **source** has two rows with the same key. The window is the only step that touches the source before the merge, and it is the one that the second bug hunt removes.'
      }),

      B.order({
        id: 'm2-ord', t: 1, q: 'Put the steps of one micro-batch of silver in the order that `apply_batch` uses.',
        items: ['Parse the text of each message into columns', 'Keep the latest event of each row, by position', 'Merge: apply an event only when its position is newer than the row', 'Read how many rows were inserted and updated from the history of the table'],
        why: 'Each step reads what the one before made. The window must come **before** the merge, and the counts must be read **after** it, from the version that the merge wrote.'
      }),

      B.decide({
        id: 'm2-dec', t: 2, src: 'docs', title: 'Decision (ADR 2): how silver follows the log',
        scenario: 'Messages arrive at least once, and not always in order. Silver must hold the current state of each order, deletes included, and a repeat of a batch must change nothing. The data is small today.',
        opts: [
          { t: 'Merge by log position, with soft deletes', d: 'Each batch touches only the rows that it names. A repeat, an old message and a delete are all handled by one rule.', lose: 'The merge needs a trustworthy position, and the deleted rows stay in the table and must be filtered by every reader.' },
          { t: 'Append every event, and let a view pick the latest of each key', d: 'The cheapest write, and the whole history of each row is in the table.', lose: 'Every reader pays for the window, and a reader who forgets the rule counts a deleted order.' },
          { t: 'Reload the whole table from Postgres at every run', d: 'No events to get wrong: silver is a copy.', lose: 'It queries the shop database for every row at every run, and it throws away the point of capture: the changes.' }
        ],
        pick: 0,
        why: 'The recording shows the merge doing its job: **' + R2.inserted + '** inserted, **' + R2.updated + '** updated and a replay that left **' + RUNS.replay.left + '** rows alone. This is a design judgement, and the other two options were not built.',
        when: 'If the table is small and a full copy every hour is acceptable, a reload is the simplest thing that works, and no connector is needed.'
      }),

      B.recap({
        id: 'm2-recap', n: 2, badge: 'Applier', color: '#94A3B8',
        pts: [
          'The parser takes the key from `after`, or from `before` for a **delete**. Bronze keeps every message as **text**, with its offset.',
          'The merge updates a row **only when the event\'s `lsn` is newer**. Without that condition the last arrival wins, and an old message turned a shipped order back into **PLACED**.',
          'A batch keeps **one event for each row** first. Without it, Delta Lake refuses the merge when an order changed twice: **' + R2.events + '** events became **86** rows.',
          'A **delete is a mark**: the row stays with its `lsn`. Removed, the row came back when an old update was delivered again.',
          'The day of changes: **' + R2.inserted + '** inserted, **' + R2.updated + '** updated, silver **' + A2.silver + '** rows (**' + A2.live + '** live), equal to Postgres.'
        ],
        lines: [
          'I compare the position of the log, not the arrival.',
          'I keep one event for each key before I merge.',
          'I mark a delete, and I keep the row.'
        ]
      })
    ]
  });
})();
