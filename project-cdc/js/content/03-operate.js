/* Mission 3: operate it. The gate, a batch that runs again, the history of silver, a connector that is stopped, and the replica identity. All runs are real. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n, M = function (k) { return G.meta(k); };
  var RUNS = C('runs'), R2 = RUNS.changes, R3 = RUNS.replay, R4 = RUNS.backlog, R5 = RUNS.identity, A2 = C('after_changes'), A3 = C('after_replay'), A4 = C('after_backlog'), A5 = C('after_identity'), SL = C('slot'), H = G.table('history').rows;
  var QG = G.file('cdc/quality.py'), ST = G.file('cdc/stream.py');
  G.expect(R3.new_messages === 0 && R3.events === 87 && R3.batches === 1 && R3.inserted === 0 && R3.updated === 0 && R3.left === 86 && JSON.stringify(A3) === JSON.stringify(A2) && R3.gate.every(function (l) { return /^PASS/.test(l); }), 'the replay of the last batch reads 0 new messages, applies 87 events, leaves 86 rows alone, and every total stays the same');
  G.expect(R4.new_messages === 100 && R4.events === 100 && R4.inserted === 0 && R4.updated === 100 && A4.bronze === 387 && A4.shipped === 130 && A4.live === 245 && A4.source === 245 && R4.gate.every(function (l) { return /^PASS/.test(l); }), 'after the stop of the connector 100 events arrive, 100 orders are updated, 130 are shipped, and the gate passes');
  G.expect(SL.active_before === true && SL.active_while_stopped === false && SL.retained_grew === true && SL.active_after_resume === true && SL.retained_dropped === true, 'the slot is active, then released while the connector is stopped, holds more log, and is active and drained after the restart');
  G.expect(R5.new_messages === 2 && R5.updated === 2 && A5.bronze === 389 && A5.shipped === 132, 'the two updates of the identity run arrive and are applied');
  G.expect(H.length === 6 && H[0][1] === 'WRITE' && H[1][2] === 200 && H[2][2] === 50 && H[2][3] === 36 && H[3][2] === 0 && H[3][3] === 0 && H[4][3] === 100 && H[5][3] === 2, 'silver has six versions: an empty write and five merges, the replay among them changing nothing');
  var json = function (key) { return function () { return X(key).split('\n').map(function (t) { return { c: 'out', t: t, d: 30 }; }); }; };
  var LAST = G.lines(ST, G.at(ST, /^    commits = /), G.at(ST, /^    return last/));
  var LAST_BAD = LAST.replace("    for name in (str(last), '.%d.crc' % last):\n        path = os.path.join(commits, name)\n        if os.path.exists(path):\n            os.remove(path)\n", "    os.remove(os.path.join(commits, str(last)))\n");
  G.expect(LAST_BAD !== LAST, 'the last bug hunt replaces the loop of forget_last_commit');

  LAB.addChapter({
    id: 'm3', n: 3, title: 'Operate it: the gate, a replay and a stopped connector', short: 'Operate', blurb: 'The gate against Postgres, a batch that runs twice, the history of silver, a stopped connector, and the replica identity', minutes: 28,
    focus: ['ing'],
    goals: [
      'Read the **gate**: what it compares, and why it reads the database.',
      'Say what happens when a **batch runs again** after a crash, and why nothing changes.',
      'Say what a **stopped connector** does to Postgres, and what comes back when it restarts.',
      'Read the **history** of silver, and the difference that **`REPLICA IDENTITY FULL`** makes.'
    ],
    say: 'A pipeline like this fails in quiet ways: a batch that runs twice, a connector that is down while the disk fills, a message that never arrives. Watch what each one did to the tables, and what the gate said.',
    scenes: [
      B.code({
        id: 'm3-gate', t: 1, src: 'rec', title: 'quality.py: a gate that reads the database', file: 'quality.py', lang: 'python', code: QG,
        steps: [
          { say: 'The gate is a short program that compares silver with the thing it copies. Press Next.', lines: null },
          { say: 'It loads **silver**, its **live** rows (the ones with no delete mark), and the **source**: the table of Postgres, read over JDBC.', lines: G.span(QG, /^    silver = spark/, /^    source = /) },
          { say: 'Check 1: **every message of the topic is in bronze**. The first number is the rows of bronze, the second is what Kafka holds, from its first to its last offset. A message that Spark missed shows here.', lines: G.span(QG, /check\('every message of the topic/, /check\('every message of the topic/) },
          { say: 'Check 2: **one silver row for each order**. Checks 3 and 4: the **live orders** and their **revenue** equal what Postgres holds. Only the source can say that a message never arrived.', lines: G.span(QG, /^    ids = /, /check\('the revenue of silver/) },
          { say: 'Check 5 is the strict one: a **full outer join** with the source on the id, and every live row must have the same store, status and amount. A missing row, an extra row or a different value counts as a difference, and the answer must be **0**.', lines: G.span(QG, /^    joined = /, /check\('every live order/) }
        ]
      }),

      B.code({
        id: 'm3-stream', t: 1, src: 'rec', title: 'stream.py: a job that can be run again', file: 'stream.py', lang: 'python', code: ST,
        steps: [
          { say: 'The streaming job that fills silver from bronze. Press Next.', lines: null },
          { say: 'The **stream** reads the new rows of bronze, hands each micro-batch to the function of silver, and stops (`availableNow`). The **checkpoint** records which batch was done.', lines: G.span(ST, /^    query = /, /query\.awaitTermination/) },
          { say: '`foreachBatch` is **at least once**: if the program dies after the merge and before the commit of the batch, the same batch runs again. The merge is what makes that harmless.', lines: G.span(ST, /^    def handle/, /done\.append/) },
          { say: 'To **see** that, this function removes the commit of the last batch, as a crash would leave it. The next run finds a batch that was planned and not committed, and runs it again.', lines: G.span(ST, /^def forget_last_commit/, /^    return last/) }
        ]
      }),

      B.term({
        id: 'm3-replay', t: 1, src: 'rec', title: 'A crash before the commit: the batch runs again',
        say: 'The commit of the last silver batch was removed. Bronze has nothing new. Read what silver does.',
        lines: function () { return G.plain(X('run.replay')); },
        after: 'Bronze read **' + R3.new_messages + '** new messages, and silver still processed **' + R3.events + '** events: the **same batch** as the day of changes. The merge **inserted ' + R3.inserted + '**, **updated ' + R3.updated + '** and **left ' + R3.left + ' alone**: every event had a position that was not newer than its row. The totals did not move (**' + A3.silver + '** rows, **' + A3.live + '** live), and the gate passed.',
        afterKind: 'tip',
        doneSay: 'A repeat is harmless.'
      }),

      B.cmp({
        id: 'm3-versions', t: 1, src: 'rec', title: 'Delta kept a version for each batch',
        say: 'Each micro-batch is one merge, and each merge is one version of silver. Press Next to read them.',
        cols: ['Version', 'What wrote it', 'Inserted', 'Updated'],
        hl: 1,
        rows: [
          [String(H[0][0]), 'The empty table, before the first batch', String(H[0][2]), String(H[0][3])],
          [String(H[1][0]), 'The snapshot', String(H[1][2]), String(H[1][3])],
          [String(H[2][0]), 'The day of changes', String(H[2][2]), String(H[2][3])],
          [String(H[3][0]), 'The batch that ran again', String(H[3][2]), String(H[3][3])],
          [String(H[4][0]), 'The backlog after the stop of the connector', String(H[4][2]), String(H[4][3])],
          [String(H[5][0]), 'The two updates of the identity run', String(H[5][2]), String(H[5][3])]
        ],
        steps: [
          { upto: 3, say: 'The snapshot **inserted ' + H[1][2] + '** and the day of changes **inserted ' + H[2][2] + '** and **updated ' + H[2][3] + '**.' },
          { upto: 4, say: 'Version **3** is the batch that ran again: **0** inserted and **0** updated. A merge that changes no row still **commits a version**, and that is the proof in the history that the repeat changed nothing.' },
          { upto: 6, say: 'The backlog **updated ' + H[4][3] + '** orders, and the two updates of the identity run came last. Every version can be read with `versionAsOf`, as in the lakehouse project.' }
        ]
      }),

      B.bug({
        id: 'm3-bug', t: 3, src: 'rec', q: 'The replay command fails: Spark cannot write the commit again, and says that a file `.1.crc` already exists. Click the line that removes only half of the commit.',
        file: 'stream.py', lang: 'python',
        code: LAST_BAD,
        bad: [G.at(LAST_BAD, /os\.remove\(os\.path\.join\(commits/)],
        hint: 'What does a checkpoint on a local disk keep next to each commit file?',
        why: 'A checkpoint on a local disk keeps a **checksum file** next to each file: `commits/1` has `commits/.1.crc`. Removing only the commit leaves the checksum, and when Spark writes the commit again it stops with `Rename destination file .1.crc already exists`, reported as two streaming queries using the same checkpoint. The fix removes both files. It is a trap of the tool for the drill, and not of the pipeline.',
        fix: LAST + '\n',
        cheer: 'A commit is two files.'
      }),

      B.term({
        id: 'm3-backlog', t: 1, src: 'rec', title: 'The connector was stopped, and the shop went on',
        say: 'The connector was stopped. Then 100 orders were shipped in the database. Then the connector was started again. This is the run that followed.',
        lines: function () { return G.plain(X('run.backlog')); },
        after: 'The restart delivered **' + R4.new_messages + '** events, one for each shipment that happened while nobody was reading. The merge **updated ' + R4.updated + '** orders, and silver now holds **' + A4.shipped + '** shipped orders. Nothing was lost, and the gate passed: **' + A4.live + '** live orders in silver, **' + A4.source + '** in Postgres.',
        afterKind: 'tip',
        doneSay: 'Nothing was lost.'
      }),

      B.cmp({
        id: 'm3-slot', t: 1, src: 'rec', title: 'What Postgres said about the slot, while the connector was away',
        say: 'Postgres keeps a record of each replication slot. Press Next to read what it said at each point.',
        cols: ['Moment', 'What the slot showed'],
        hl: 1,
        rows: [
          ['The connector is running', 'Active: ' + (SL.active_before ? 'yes' : 'no')],
          ['The connector is stopped', 'Active: ' + (SL.active_while_stopped ? 'yes' : 'no') + '. The slot stays, and holds the position'],
          ['100 changes with nobody reading', 'The log that the slot holds ' + (SL.retained_grew ? 'grew' : 'did not grow')],
          ['The connector is started again', 'Active: ' + (SL.active_after_resume ? 'yes' : 'no')],
          ['After it caught up', 'The log that the slot holds ' + (SL.retained_dropped ? 'dropped' : 'did not drop')]
        ],
        steps: [
          { upto: 2, say: 'When the connector stops, the **slot is released**, and it does not go away. It keeps the position of the last change that was confirmed.' },
          { upto: 3, say: 'While nobody reads, Postgres **cannot recycle the log** after that position. That is what made the restart lossless, and it is also the cost: the log **grows** for as long as the connector is away. I did not record the bytes, because they depend on the machine.' },
          { upto: 5, say: 'After the restart the connector read the backlog and **confirmed** the new position, so Postgres could let the old log go.' }
        ]
      }),

      B.term({
        id: 'm3-ev-full', t: 3, src: 'rec', title: 'An update, with REPLICA IDENTITY FULL',
        say: 'After `ALTER TABLE orders REPLICA IDENTITY FULL`, Postgres logs the whole old row of an update. This is the message of order 202.',
        lines: json('event.update_full'),
        after: 'Now **`before` holds the whole row**, as it was before the update: the status is `PLACED`, and `after` says `SHIPPED`. Compare it with the earlier update of order 201, where `before` was null. It costs more log for every update, and it is what a consumer needs to see **what changed**.',
        afterKind: 'tip',
        doneSay: 'Before and after, both.'
      }),

      B.quiz({
        id: 'm3-q1', t: 1,
        q: 'The last batch ran again after a crash. What did the merge do with its events?',
        opts: [
          { t: 'It left every row alone: no event had a position newer than its row', fb: '' },
          { t: 'It applied them again, and the totals doubled', fb: 'A merge by position does not apply the same event twice.' },
          { t: 'It failed, because the batch was already committed', fb: 'The commit had not happened, and that is why the batch ran.' },
          { t: 'It deleted the rows and inserted them again', fb: 'The merge never deletes a row.' }
        ],
        ok: 0, why: 'The recorded line says **inserted ' + R3.inserted + ', updated ' + R3.updated + ', left ' + R3.left + ' alone**. The totals stayed at **' + A3.silver + '** rows, and the history shows a version that changed nothing.'
      }),

      B.quiz({
        id: 'm3-q2', t: 1,
        q: 'The replay run printed `bronze: 0 new messages`, and then `silver: ' + R3.events + ' events`. Why did silver have something to do?',
        opts: [
          { t: 'The silver stream found a planned batch with no commit, and ran it again from bronze', fb: '' },
          { t: 'Kafka sent the messages again', fb: 'Bronze read none: the topic held nothing new.' },
          { t: 'The connector made a new snapshot', fb: 'The connector was not involved in this run.' },
          { t: 'Silver reads Postgres directly', fb: 'Only the gate reads Postgres.' }
        ],
        ok: 0, why: 'The two streams have **their own checkpoints**. Bronze had nothing to read, and the silver stream had a batch of **' + R3.events + '** events to finish. At least once is a property of the **silver** stream, and the merge is what absorbs it.'
      }),

      B.quiz({
        id: 'm3-q3', t: 1,
        q: 'The connector was stopped while 100 orders were shipped. After the restart, how many events came, and did silver lose anything?',
        opts: [
          { t: R4.new_messages + ' events, one for each shipment, and silver lost nothing: the gate passed', fb: '' },
          { t: 'None: the changes made while it was stopped are gone', fb: 'The slot kept the log, and the connector continued from its position.' },
          { t: 'The whole table again, as a new snapshot', fb: 'The snapshot is read once, before the first change.' },
          { t: '200 events: the snapshot and the changes', fb: 'Only the 100 changes of the backlog came.' }
        ],
        ok: 0, why: 'Bronze took **' + R4.new_messages + '** messages (the topic held **' + n(C('topic').backlog) + '** in all), silver **updated ' + R4.updated + '**, and the gate matched Postgres on the orders, the revenue and every row.'
      }),

      B.quiz({
        id: 'm3-q4', t: 2,
        q: 'Why does the gate read Postgres, instead of comparing silver with bronze?',
        opts: [
          { t: 'A message that never reached Kafka is missing from bronze too, so the layers still agree with each other', fb: '' },
          { t: 'Postgres is faster than Delta', fb: 'Speed is not the reason.' },
          { t: 'Bronze cannot be read twice', fb: 'It can.' },
          { t: 'It is required by Debezium', fb: 'Debezium does not know about the gate.' }
        ],
        ok: 0, why: 'Checks that compare layers with each other cannot see a loss **before** the first layer. Check 1 compares bronze with the topic, and checks 3 to 5 compare silver with the database. Between them, a missing message cannot hide.'
      }),

      B.quiz({
        id: 'm3-q5', t: 3, src: 'rec',
        q: 'The replay changed nothing, and yet silver has a new version for it. Why?',
        opts: [
          { t: 'A merge commits a version even when it changes no row: version ' + H[3][0] + ' has 0 inserted and 0 updated', fb: '' },
          { t: 'The history is written by the stream, not by Delta', fb: 'Delta writes the history, with the metrics of the merge.' },
          { t: 'The replay changed one row by mistake', fb: 'The totals and the metrics say that no row changed.' },
          { t: 'Delta writes a version for every query', fb: 'A read writes nothing.' }
        ],
        ok: 0, why: 'The history of the recording has **' + H.length + '** versions for **' + (H.length - 1) + '** merges, and the one of the replay holds zeros. It makes a useful check: a batch that runs again leaves a version with **0 inserted and 0 updated**.'
      }),

      B.decide({
        id: 'm3-dec', t: 2, src: 'docs', title: 'Decision (ADR 3): what to do with the slot of a connector that is stopped',
        scenario: 'The connector will stop now and then: an upgrade, a failure, a bad night. Postgres keeps the log that the slot has not confirmed, and the disk of the database is not large.',
        opts: [
          { t: 'Keep the slot, watch it, and alert when it is inactive or holds a lot of log', d: 'Nothing is lost when the connector comes back, and the alert gives people time to act before the disk is full.', lose: 'Someone must watch it, and someone must answer the alert. The project has no alert.' },
          { t: 'Drop the slot whenever the connector stops', d: 'The database never keeps a log for a reader that is away.', lose: 'The changes of the gap are lost, and the next start needs a new snapshot. Deletes of the gap are not even in the snapshot.' },
          { t: 'Let the log grow, and size the disk for it', d: 'No procedure, and no loss.', lose: 'A connector that never returns fills the disk, and the shop stops. A disk is a bad place to hide a failure.' }
        ],
        pick: 0,
        why: 'The recording shows both halves: the slot **kept** the changes of the stop, and the log it held **grew** until the connector came back. Postgres also has a limit on how much log a slot may hold, `max_slot_wal_keep_size`. I know it from the documentation and did not run it. This is a design judgement.',
        when: 'If a full snapshot is cheap and the database is fragile, a slot that is dropped after a limit is safer than a full disk. Say which one you chose, and why.'
      }),

      B.incident({
        id: 'm3-inc', t: 1, src: 'rec', title: 'Incident: the database disk is filling, and the connector has been down for two days', time: '04:20',
        alert: '**The disk of the shop database is at 91% and grows by 2% an hour.** The data directory is fine, but the `pg_wal` folder is huge. The replication slot `brewline_slot` is **inactive**. Nobody noticed that the connector stopped on Friday.',
        clues: ['The slot is inactive, and it exists', 'The log that it holds grows with every write', 'The connector is the only reader of the slot'],
        opts: [
          { t: 'Find why the connector stopped, restart it, and watch the slot drain: the connector continues from its position', fb: '' },
          { t: 'Delete the oldest files of `pg_wal` by hand to free the disk', fb: 'It can corrupt the database. Postgres decides what it may remove.' },
          { t: 'Drop the slot at once, and take a new snapshot later', fb: 'It frees the disk, and it loses the changes of two days, deletes included. It is a last choice, and a conscious one.' },
          { t: 'Add disk and wait', fb: 'The log grows for as long as the connector is away. It buys time and nothing else.' }
        ],
        best: 0,
        why: 'The recording shows both halves of the answer. While the connector was stopped the slot was **inactive** and the log it held **grew**. After the restart the connector read the backlog (**' + R4.new_messages + '** events in the drill), confirmed its position, and the held log **dropped**. If the connector cannot come back, dropping the slot is the way out, with a new snapshot as its cost.',
        checks: [
          ['Look at the slot', 'Inactive, and holding the log since Friday.'],
          ['Look at the connector', 'The status says why it stopped.'],
          ['Restart it', 'It continues from the confirmed position.'],
          ['Watch the log drain', 'The held log drops after the restart.']
        ],
        tell: 'The connector had been down for two days, so Postgres kept all the log since its last confirmed position, and the disk filled. I looked at why the connector stopped, fixed it and restarted it. It read the backlog, confirmed its position, and the log was released. Then I added an alert on an inactive slot and on the log that a slot holds.',
        prevent: ['Alert on a slot that is **inactive**', 'Alert on the **bytes of log** that a slot holds', 'Set a **limit** on what a slot may keep (`max_slot_wal_keep_size`), and decide what happens when it is reached']
      }),

      B.incident({
        id: 'm3-inc2', t: 2, src: 'docs', title: 'Incident: the gate says 243 live orders in silver and 245 in Postgres', time: '10:30',
        alert: '**The gate failed.** `FAIL the live orders of silver equal the orders of the source: 243 (expected 245)`. The check on the topic and bronze passed. Last night someone dropped the replication slot and created a new one, to free some disk.',
        clues: ['The topic and bronze agree', 'The two missing orders exist in Postgres', 'The slot was dropped, so the changes of the gap were never read'],
        opts: [
          { t: 'Read the table again (a new snapshot), apply it to silver, and compare the rows that Postgres no longer has', fb: '' },
          { t: 'Insert the two orders by hand into silver', fb: 'It hides the cause, and the next gap will lose others.' },
          { t: 'Skip the gate until the next release', fb: 'The gate found a real loss.' },
          { t: 'Delete silver and start from the topic', fb: 'The topic does not hold the changes of the gap either.' }
        ],
        best: 0,
        why: 'The changes made while no slot existed were never in the log that the new slot reads, so no message can bring them back. A **new snapshot** brings the inserts and the updates, and the merge by position makes it safe to apply. It **cannot** bring the deletes of the gap: a row that is no longer in Postgres is not in the snapshot, so silver must also be compared with the source, and the rows that it no longer has must be marked. This scenario is from documentation, and I did not run it.',
        checks: [
          ['Find the gap', 'Between the drop of the old slot and the start of the new one.'],
          ['Check what the gap holds', 'Inserts, updates and deletes made in that time.'],
          ['Repair', 'A new snapshot, and a comparison for the deletes.'],
          ['Prevent', 'Do not drop a slot without a plan for the gap.']
        ],
        tell: 'A slot was dropped and recreated, so the changes of the gap were lost, and the gate that reads the database found two orders missing. I took a new snapshot, which the merge by position applies safely, and compared silver with the source to mark the rows that Postgres no longer had. Then I wrote down the rule: nobody drops a slot without a plan for the gap.',
        prevent: ['A **rule and a runbook** for the slot', 'A gate that reads the **source**, which found it', 'An alert on a slot that **disappears**']
      }),

      B.cmp({
        id: 'm3-notbuilt', t: 2, src: 'docs', title: 'What a production pipeline adds, and this one does not have',
        say: 'A reviewer will ask about the edges of the project. Press Next to read what is missing, and why it did not matter here.',
        cols: ['Topic', 'In the project', 'Status'],
        hl: 1,
        rows: [
          ['A change of the table', 'A new column changes the events. The parser knows five columns, and ignores a sixth', 'Not built'],
          ['A large table', 'The snapshot reads the whole table at once. Debezium has an incremental snapshot, which was not used', 'Not built'],
          ['Several tables or partitions', 'One table, one partition: the order of the log is the order of the topic', 'Not built'],
          ['A schema registry, Avro', 'JSON with no schema. Nothing checks the shape of a message before the parser', 'Not built'],
          ['Monitoring and alerts', 'The gate and its exit code are the only signal. Nothing watches the slot or the connector', 'Not built'],
          ['Security, a cluster', 'No TLS, no login, one broker, one worker', 'Not run']
        ],
        steps: [
          { upto: 3, say: 'The first three are about the **shape** of the data and of the topic. Each one grows with time and with the number of tables.' },
          { upto: 6, say: 'The last three are the **platform**: the formats, who is told, and who may connect. I did not run any of them, and what I say about them comes from documentation.' }
        ]
      }),

      B.recap({
        id: 'm3-recap', n: 3, badge: 'Operator', color: '#64748B',
        pts: [
          'The **gate** reads the database: the topic and bronze agree, silver has one row for each order, and the **live orders**, their **revenue** and **every row** match Postgres. A missing message cannot hide.',
          'A **batch that runs again** after a crash left **' + R3.left + '** rows alone: **' + R3.inserted + '** inserted and **' + R3.updated + '** updated. `foreachBatch` is at least once, and the merge by position absorbs it.',
          'A **stopped connector** releases the slot, and Postgres **keeps the log**. After the restart **' + R4.new_messages + '** events came, nothing was lost, and the held log dropped. The cost of the safety is the disk.',
          'Delta kept **' + H.length + '** versions of silver, and the replay left one with **0 inserted and 0 updated**.',
          '`REPLICA IDENTITY FULL` puts the **whole old row** in `before`. By default an update has `before: null`.'
        ],
        lines: [
          'I read the source to prove the copy.',
          'I design for a batch that runs twice.',
          'I watch the slot, and I know what it holds.'
        ]
      })
    ]
  });
})();
