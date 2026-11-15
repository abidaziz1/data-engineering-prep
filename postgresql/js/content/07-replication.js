/* Mission 7: replication and change data capture. A primary, a standby and a subscriber on one machine over 127.0.0.1, all real PostgreSQL 16 servers. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var ST = C('repl.standby'), LG = C('repl.lag'), CF = C('repl.conflict'), LO = C('repl.logical'), DD = C('repl.ddl'), ID = C('repl.identity'), SQ = C('repl.sequence'), DC = C('repl.decoded'), SL = C('repl.slots');
  var STAT = G.table('repl.stat').rows[0], LAGT = G.table('repl.lag').rows, SLT = G.table('repl.slots').rows;
  var CONF = G.file('postgresql.conf');
  G.expect(ST.is_in_recovery === true && ST.primary_in_recovery === false && ST.write_refused === true && ST.state === 'streaming' && ST.sync_state === 'async', 'a standby is in recovery, streams and refuses writes');
  G.expect(LG.standby_rows_while_paused < LG.primary_rows && LG.standby_rows_after_resume === LG.primary_rows, 'a standby that is behind returns old data and catches up');
  G.expect(CF.off_canceled === true && CF.off_removed === 10000 && CF.on_canceled === false && CF.on_removed === 0 && CF.on_not_yet_removable === 10000 && CF.standby_conflicts_counted === 1, 'the standby conflict and the feedback trade');
  G.expect(LO.initial_synced === true && LO.after_changes_primary === LO.after_changes_subscriber && LO.update_replicated === 'refunded' && LO.delete_replicated === 0, 'logical replication copies rows and changes');
  G.expect(DD.stalled_subscriber_rows < DD.stalled_primary_rows && DD.after_fix_subscriber_rows === DD.stalled_primary_rows && DD.error_names_column === true, 'a column on one side only stalls the subscriber');
  G.expect(ID.update_refused === true && SQ.subscriber_last_value === 1 && SQ.publisher_last_value === 100 && SQ.subscriber_is_called === false, 'no identity stops updates, and sequences stay behind');
  G.expect(SL.forgotten_active === false && SL.forgotten_status === 'reserved' && SL.status_after_limit === 'lost' && SL.forgotten_retained_mb > 50 && SL.error_says_invalidated === true, 'a slot that nobody reads keeps the log until it is lost');
  var DDLBUG = '-- migration, run on the publisher\nALTER TABLE orders ADD COLUMN channel text;\n';
  var KEYBUG = 'CREATE TABLE tags (id int, label text);\nCREATE PUBLICATION p FOR TABLE tags;\nUPDATE tags SET label = \'b\';\n';
  var rowsOf = function (t) { return t.split('\n'); };
  var cl = function (re) { return G.at(CONF, re); };

  LAB.addChapter({
    id: 'm7', n: 7, title: 'Replication and change data capture', short: 'Replication', blurb: 'a standby, a conflict, a subscriber, a stalled column and a slot that fills the disk', minutes: 22,
    focus: ['qual', 'ci'],
    goals: [
      'Tell **physical** from **logical** replication and say what each one is for.',
      'Say what a **standby** can and cannot do, and why a long query on it is **cancelled**.',
      'Name what **logical replication does not copy**, and what happens when a column differs.',
      'Say how a **replication slot** can fill a disk, and how to limit it.'
    ],
    say: 'Every replica reads the same thing: the write-ahead log from mission 3. A standby replays it to be a copy of the whole server. A subscriber or a change data capture connector decodes it into rows. Both are held in place by a slot, and a slot that nobody reads is the most common way for a healthy PostgreSQL server to run out of disk. This mission builds all of them on one machine.',
    scenes: [
      B.flow({
        id: 'm7-flow', t: 1, src: 'docs', title: 'One log, three readers', g: 'replication', legend: true,
        steps: [
          { say: 'The primary writes every change to the log. Three kinds of reader can follow it. Press Next.', focus: ['pri', 'wal', 'stb', 'sub', 'slot'], cap: 'The log is the source.' },
          { say: 'Step 1. The primary takes the writes and logs them. Nothing else changes on the primary.', on: ['e1'], focus: ['pri', 'wal'], cap: 'Writes go to the log.' },
          { say: 'Step 2. A **standby** receives the log and **replays it**. It is a copy of the whole server, page for page, that you can **read** but not write. This is **physical** replication.', on: ['e2'], focus: ['wal', 'stb'], tags: ['tg_phys', 'tg_fb'], cap: 'A standby replays the log.' },
          { say: 'Step 3. A **subscriber** receives the **decoded changes** of chosen tables, as rows: insert, update, delete. It has tables of its own that you can write to. This is **logical** replication, and it is also what a CDC connector reads.', on: ['e3'], focus: ['wal', 'sub'], tags: ['tg_logical'], cap: 'A subscriber gets rows.' },
          { say: 'Step 4. A **replication slot** remembers how far a reader has got, so the primary keeps the log it needs. That makes a reader safe against a pause, and a reader that **never comes back** a danger.', on: ['e4'], focus: ['wal', 'slot'], tags: ['tg_full'], cap: 'A slot keeps the log.' }
        ]
      }),

      B.term({
        id: 'm7-standby', t: 1, src: 'rec', title: 'A standby, made with pg_basebackup',
        say: 'I made a second server from the first with `pg_basebackup -R`, which copies the data directory and writes the settings of a standby. Then I asked both what they are.',
        lines: function () {
          return G.term([
            ['SELECT application_name, state, sync_state FROM pg_stat_replication;   -- on the primary', STAT[0] + ' | ' + STAT[1] + ' | ' + STAT[2]],
            ['SELECT pg_is_in_recovery();   -- primary, then standby', 'false, then true'],
            ['SELECT count(*) FROM orders;   -- on the standby', String(ST.rows_on_standby)],
            ['INSERT INTO orders VALUES (-1, 1, 1, now(), 1, \'x\', \'y\');   -- on the standby', rowsOf(X('repl.standby_write'))[1]]
          ]);
        },
        after: 'The standby is **' + STAT[1] + '**, and **' + STAT[2] + '** (asynchronous: a commit on the primary does not wait for it). It answers `pg_is_in_recovery()` with **true**, it had all **' + n(ST.rows_on_standby) + '** rows, and it **refused a write**: *' + rowsOf(X('repl.standby_write'))[1] + '*. A standby is for **reading and for failover**. Dashboards and heavy reports can run on it, and the primary is spared. The rest of this mission is about what a standby does when its reader and the primary disagree.',
        afterKind: 'tip',
        doneSay: 'A standby is a read-only copy that replays the log.'
      }),

      B.cmp({
        id: 'm7-lag', t: 1, src: 'rec', title: 'A standby can be behind',
        say: 'Replication is asynchronous, so a standby can return **old data**. I paused the replay on the standby, inserted 1,000 rows on the primary, and counted on both.',
        cols: ['Moment', 'Rows on the primary', 'Rows on the standby'],
        hl: 2,
        rows: LAGT.map(function (r) { return [r[0], n(r[1]), n(r[2])]; }),
        steps: [
          { upto: 1, say: 'While replay was paused, the primary had **' + n(LG.primary_rows) + '** rows and the standby answered **' + n(LG.standby_rows_while_paused) + '**. A query on a standby sees **the past**, and the gap is the **lag**. `pg_stat_replication` on the primary shows it as bytes between `sent_lsn` and `replay_lsn`.' },
          { upto: 2, say: 'After the replay resumed, the standby caught up: **' + n(LG.standby_rows_after_resume) + '**. A report that reads from a standby and then writes to the primary must allow for this. **Read your own writes** from the primary.' }
        ]
      }),

      B.term({
        id: 'm7-conflict', t: 2, src: 'rec', title: 'A long query on the standby against a vacuum on the primary',
        say: 'A session on the standby opened a repeatable read transaction, and so holds a snapshot. On the primary I deleted 10,000 rows and ran `VACUUM`. I did it twice: with `hot_standby_feedback` off, and on.',
        lines: function () {
          return G.term([
            ['-- hot_standby_feedback = off', rowsOf(X('repl.conflict_off')).slice(2).join('\n')],
            ['-- hot_standby_feedback = on', rowsOf(X('repl.conflict_on')).slice(2).join('\n')]
          ]);
        },
        after: 'With feedback **off**, the primary was free to vacuum: it removed **' + n(CF.off_removed) + '** rows, and the log record of that removal reached the standby, whose open query might still need them. After waiting for `max_standby_streaming_delay` (1 s in this run), the standby **ended the session**. The counter `pg_stat_database_conflicts` showed **' + CF.standby_conflicts_counted + '**. With feedback **on**, the standby told the primary about its snapshot, the primary removed **' + CF.on_removed + '** rows (**' + n(CF.on_not_yet_removable) + ' not yet removable**), and the query ran. You choose between **cancelled reports on the standby** and **bloat on the primary** (mission 2). The usual answer is to size the delay for your longest report and keep feedback off, or to give long reports a standby of their own.',
        afterKind: 'warn',
        doneSay: 'Standby conflicts: cancelled queries, or dead rows on the primary.'
      }),

      B.term({
        id: 'm7-logical', t: 1, src: 'rec', title: 'Logical replication: publication and subscription',
        say: 'A third server, empty, with its own `orders` table. On the primary I published the table. On the new server I subscribed to it.',
        lines: function () {
          return G.term([
            ['CREATE PUBLICATION brewline FOR TABLE orders;   -- primary', 'CREATE PUBLICATION'],
            ['CREATE SUBSCRIPTION brewline_sub CONNECTION \'host=... port=...\' PUBLICATION brewline;   -- subscriber', 'CREATE SUBSCRIPTION'],
            ['SELECT count(*) FROM orders;   -- subscriber, after the initial copy', String(LO.initial_copy_rows)],
            ['-- on the primary: 5 inserts, 1 update, 1 delete', ''],
            ['SELECT count(*), max(status) FILTER (WHERE order_id = 9001) FROM orders;   -- subscriber', LO.after_changes_subscriber + ' | ' + LO.update_replicated],
            ['SELECT count(*) FROM orders WHERE order_id = 9002;   -- the deleted order', String(LO.delete_replicated)]
          ]);
        },
        after: 'The subscription did an **initial copy** of **' + n(LO.initial_copy_rows) + '** rows, then followed the changes: the primary and the subscriber both held **' + n(LO.after_changes_primary) + '**, the update (`' + LO.update_replicated + '`) and the delete (' + LO.delete_replicated + ' rows left) were applied. The subscriber is a **normal, writable server** with its own tables and indexes, even in another major version. That is what makes logical replication the tool for **upgrades with little downtime**, for **feeding a reporting server**, and for **moving a table**. The next screens are what it does not do.',
        afterKind: 'tip',
        doneSay: 'A publication on one side, a subscription on the other.'
      }),

      B.term({
        id: 'm7-ddl', t: 2, src: 'rec', title: 'A column that exists on one side only',
        say: 'Logical replication copies rows, not table definitions. I added a column on the primary and not on the subscriber, and then inserted a row that uses it.',
        lines: function () {
          return G.term([
            ['ALTER TABLE orders ADD COLUMN channel text;   -- on the primary only', 'ALTER TABLE'],
            ['INSERT INTO orders (..., channel) VALUES (..., \'app\');   -- on the primary', 'INSERT 0 1'],
            ['-- the subscriber log:', rowsOf(X('repl.missing_column')).slice(2).join('\n')],
            ['SELECT count(*) FROM orders;   -- primary, subscriber', DD.stalled_primary_rows + ', ' + DD.stalled_subscriber_rows],
            ['ALTER TABLE orders ADD COLUMN channel text;   -- on the subscriber, then wait', ''],
            ['SELECT count(*) FROM orders;   -- subscriber', String(DD.after_fix_subscriber_rows)]
          ]);
        },
        after: 'The subscriber **could not apply the row** and logged the error, naming the column. The primary had **' + n(DD.stalled_primary_rows) + '** rows and the subscriber **' + n(DD.stalled_subscriber_rows) + '**, and it **stopped** at that row: replication does not skip. At the same time the primary has to **keep the log** that the subscriber has not taken (next screens). After the same column was added on the subscriber, it caught up to **' + n(DD.after_fix_subscriber_rows) + '**. The rule for a migration is **subscriber first, then publisher**, for a column that is added, and the opposite for a column that is dropped.',
        afterKind: 'warn',
        doneSay: 'DDL is not replicated. Add the column on the subscriber first.'
      }),

      B.term({
        id: 'm7-identity', t: 2, src: 'rec', title: 'A published table needs a way to find its rows',
        say: 'A table without a primary key is in the publication, and I tried to update it on the primary.',
        lines: function () {
          return G.term([
            ['CREATE TABLE tags (id int, label text);  -- no primary key, then ALTER PUBLICATION brewline ADD TABLE tags;', ''],
            ['UPDATE tags SET label = \'b\';', rowsOf(X('repl.no_identity')).slice(1).join('\n')],
            ['ALTER TABLE tags REPLICA IDENTITY FULL;  UPDATE tags SET label = \'b\';', 'UPDATE 1']
          ]);
        },
        after: 'To replicate an update or a delete, the subscriber must know **which row** it concerns. The **replica identity** is the primary key by default. This table had none, so the **primary refused the update** itself, even though the problem is on the other side. `REPLICA IDENTITY FULL` makes the whole old row the identity: it works, and it is **expensive** for wide tables, because the log carries the whole old row. The better fix is **a primary key on every published table**.',
        afterKind: 'warn',
        doneSay: 'Every published table needs a primary key, or a replica identity.'
      }),

      B.cmp({
        id: 'm7-seq', t: 2, src: 'rec', title: 'Sequences are not replicated',
        say: 'A table with an identity column on both servers. I inserted 100 rows on the primary and read the sequence on both.',
        cols: ['Server', 'Rows in the table', 'Last value of the sequence', 'Is called'],
        hl: 2,
        rows: [
          ['Primary', '100', String(SQ.publisher_last_value), 'true'],
          ['Subscriber', String(SQ.rows_on_subscriber), String(SQ.subscriber_last_value), String(SQ.subscriber_is_called)]
        ],
        steps: [
          { upto: 1, say: 'The primary used 100 numbers.' },
          { upto: 2, say: 'The subscriber has the same **100 rows**, and its sequence is still at **' + SQ.subscriber_last_value + '**, never used (`is_called` is ' + SQ.subscriber_is_called + '). Logical replication copies **rows**, and the ids in them, and not the **state of sequences**. If you promote the subscriber, the next insert starts at 1 and collides with the rows that are there. **Move the sequences before a switchover**, with `setval`.' }
        ]
      }),

      B.term({
        id: 'm7-decoded', t: 2, src: 'rec', title: 'What the changes look like when they are decoded',
        say: 'This is what a CDC connector reads. I made a table, created a logical slot with the `test_decoding` plugin, did an insert of two rows, an update and a delete, and read the slot.',
        lines: function () {
          return G.term([['SELECT data FROM pg_logical_slot_get_changes(\'dec\', NULL, NULL);', X('repl.decoded')]]);
        },
        after: 'Each transaction is a **BEGIN**, a list of row changes, and a **COMMIT**. An update shows the new row, and a **delete** shows only the **key** (`id[integer]:2`), which is the replica identity: this is why the key matters. Debezium and logical replication use the same mechanism with another plugin, `pgoutput`, and a **slot** to remember their place. The Kafka course shows what Debezium does with these events. Here, remember that every reader is a **slot**, and that a slot has a cost.',
        afterKind: 'tip',
        doneSay: 'CDC reads decoded changes through a slot.'
      }),

      B.widget({ id: 'm7-lab', kind: 'slotlab', t: 1, src: 'rec', title: 'Lab: a slot that nobody reads' }),

      B.term({
        id: 'm7-slotlost', t: 2, src: 'rec', title: 'When the limit is reached',
        say: 'I set `max_slot_wal_keep_size` to 16 MB and ran a checkpoint. Then I tried to read the forgotten slot.',
        lines: function () {
          return G.term([
            ['ALTER SYSTEM SET max_slot_wal_keep_size = \'16MB\';  SELECT pg_reload_conf();  CHECKPOINT;', ''],
            ['SELECT slot_name, wal_status FROM pg_replication_slots;', 'forgotten | ' + SL.status_after_limit],
            ['SELECT * FROM pg_logical_slot_get_changes(\'forgotten\', NULL, NULL);', rowsOf(X('repl.slot_lost')).slice(1).join('\n')]
          ]);
        },
        after: 'Without a limit, the slot held **' + SL.forgotten_retained_mb + ' MB** of log and would hold more, for as long as it exists. With the limit, the server **removed the log** that the slot needed, and the slot became **`' + SL.status_after_limit + '`**: *' + rowsOf(X('repl.slot_lost'))[1] + '*. The disk is safe, and the reader is **lost**: it has to be set up again from a new copy. That is the trade, and it is the right one for a disk that must not fill: a connector that is down for a long time costs a **resnapshot**, which is better than an **outage**. Set the limit well above the longest pause that you accept.',
        afterKind: 'warn',
        doneSay: 'max_slot_wal_keep_size trades a lost reader for a full disk.'
      }),

      B.cmp({
        id: 'm7-compare', t: 1, src: 'docs', title: 'Physical or logical',
        say: 'The two kinds side by side. The recorded rows are from this mission, and the last two are from documentation.',
        cols: ['', 'Physical (a standby)', 'Logical (a subscriber, CDC)'],
        hl: 2,
        rows: [
          ['What is copied', 'The whole server, page for page', 'Chosen tables, as rows'],
          ['Can you write to the copy?', 'No: ' + rowsOf(X('repl.standby_write'))[1], 'Yes, it is an ordinary server'],
          ['Table definitions', 'The same, always', 'Not copied: add a column on both sides'],
          ['Sequences', 'Copied with the pages', 'Not copied: ' + SQ.subscriber_last_value + ' against ' + SQ.publisher_last_value],
          ['Needs `wal_level`', 'replica', 'logical (restart)'],
          ['Different major version?', 'No, the same version', 'Yes, which is why it is used for upgrades'],
          ['Use it for', 'Failover, read replicas', 'Reporting servers, upgrades, CDC, moving tables']
        ],
        steps: [
          { upto: 4, say: 'A standby is **everything and read-only**. A subscriber is **some tables and writable**, and the price is that you look after definitions and sequences.' },
          { upto: 7, say: 'Version and use. Physical for **high availability**. Logical for **moving data between systems**. Many teams run both.' }
        ]
      }),

      B.code({
        id: 'm7-conf', t: 2, src: 'docs', title: 'The settings that this mission touched', file: 'postgresql.conf', lang: 'ini', code: CONF,
        steps: [
          { say: 'These are the settings of the project, as one file. I applied them one at a time in the recording, and not this file as a whole, so this screen is from documentation. Press Next.', lines: null },
          { say: '`wal_level = logical` is needed by a subscriber and by Debezium, and changing it needs a restart. `replica` is enough for a standby.', lines: [cl(/^wal_level/), cl(/^wal_level/)] },
          { say: '`archive_mode` and `archive_command` keep the old log for point-in-time recovery, which mission 8 uses.', lines: [cl(/^archive_mode/), cl(/^archive_command/)] },
          { say: '`max_slot_wal_keep_size` is the limit that turned the forgotten slot into `lost` in the lab. Set it to what the disk can afford.', lines: [cl(/^max_slot_wal_keep_size/), cl(/^max_slot_wal_keep_size/)] },
          { say: '`hot_standby_feedback = off` is the default. It is the trade of the conflict screen.', lines: [cl(/^hot_standby_feedback/), cl(/^hot_standby_feedback/)] }
        ],
        note: 'The values are examples. The right size for `max_slot_wal_keep_size` depends on your disk and your longest planned pause.'
      }),

      B.bug({
        id: 'm7-bug', t: 2, src: 'docs', q: 'A team uses logical replication to feed a reporting server. This migration runs on a Friday evening, and on Monday the reporting data is 60 hours old. Click the line that caused it.',
        file: 'migration.sql', lang: 'sql', code: DDLBUG, bad: [1],
        hint: 'Where did this run, and does the other side know the column?',
        why: 'The comment says it: the migration ran **on the publisher only**. Logical replication does not copy DDL, so the subscriber **stopped at the first row that carried `channel`**. The recording: ' + n(DD.stalled_primary_rows) + ' rows on the primary and ' + n(DD.stalled_subscriber_rows) + ' on the subscriber, with the error *' + rowsOf(X('repl.missing_column'))[2].replace('LOG:  ', '') + '*. Add the column on the **subscriber first**, then on the publisher.',
        fix: '-- migration, run on the subscriber first\nALTER TABLE orders ADD COLUMN channel text;\n-- then on the publisher\nALTER TABLE orders ADD COLUMN channel text;\n',
        cheer: 'Subscriber first.'
      }),

      B.bug({
        id: 'm7-bug2', t: 2, src: 'docs', q: 'A new table is added to a publication, and the first update on the publisher fails. Click the line that is the cause.',
        file: 'tags.sql', lang: 'sql', code: KEYBUG, bad: [1],
        hint: 'How does the subscriber find the row of an update?',
        why: 'The table has **no primary key and no replica identity**, so an update cannot say which row it concerns, and the primary refuses it. The recording: *' + rowsOf(X('repl.no_identity'))[1] + '*. Add a primary key, or `REPLICA IDENTITY FULL` if there is no key.',
        fix: 'CREATE TABLE tags (id int PRIMARY KEY, label text);\nCREATE PUBLICATION p FOR TABLE tags;\nUPDATE tags SET label = \'b\';\n',
        cheer: 'A key on every published table.'
      }),

      B.quiz({
        id: 'm7-q1', t: 1,
        q: 'Which is true of a streaming standby?',
        opts: [
          { t: 'It can serve reads, and it can be a little behind the primary', fb: '' },
          { t: 'It accepts writes and sends them to the primary', fb: 'It refuses writes: *' + rowsOf(X('repl.standby_write'))[1] + '*.' },
          { t: 'It is always exactly in step with the primary', fb: 'Replication is asynchronous: the standby answered ' + n(LG.standby_rows_while_paused) + ' rows while the primary had ' + n(LG.primary_rows) + '.' },
          { t: 'It holds only the tables you publish', fb: 'That is logical replication. A standby holds the whole server.' }
        ],
        ok: 0, why: 'The recording: `pg_is_in_recovery()` was true on the standby, and replay lag was visible as a lower row count.'
      }),

      B.quiz({
        id: 'm7-q2', t: 1,
        q: 'You add a column on the publisher with `ALTER TABLE`. What happens on the subscriber?',
        opts: [
          { t: 'Nothing: logical replication does not copy DDL, and it stops at the first row that uses the column', fb: '' },
          { t: 'The column is added by itself', fb: 'DDL is not replicated.' },
          { t: 'The subscription is dropped', fb: 'It stays and retries.' },
          { t: 'The new column is ignored and rows flow on', fb: 'It stopped, with an error that names the column.' }
        ],
        ok: 0, why: 'The recording: *' + rowsOf(X('repl.missing_column'))[2].replace('LOG:  ', '') + '*, with ' + n(DD.stalled_subscriber_rows) + ' rows on the subscriber against ' + n(DD.stalled_primary_rows) + '.'
      }),

      B.quiz({
        id: 'm7-q3', t: 1,
        q: 'A replication slot is not active and `wal_status` is `reserved`. What is the server doing?',
        opts: [
          { t: 'Keeping all the log since the slot\'s position, so the disk grows', fb: '' },
          { t: 'Recycling the log as usual', fb: 'A slot that is reserved holds the log back.' },
          { t: 'Nothing: an inactive slot is free', fb: 'It is the most expensive kind: it holds log and no reader takes it.' },
          { t: 'Copying the log to the standby', fb: 'A slot does not copy anything. It remembers a position.' }
        ],
        ok: 0, why: 'The recording: the slot that nobody read held **' + SL.forgotten_retained_mb + ' MB** with `wal_status = ' + SL.forgotten_status + '`.'
      }),

      B.quiz({
        id: 'm7-q4', t: 2,
        q: 'You promote the logical subscriber to be the new primary. What do you do first?',
        opts: [
          { t: 'Set every sequence to the last value of the old primary', fb: '' },
          { t: 'Nothing: sequences are replicated', fb: 'They are not. The subscriber\'s sequence was at ' + SQ.subscriber_last_value + ' while the publisher\'s was at ' + SQ.publisher_last_value + '.' },
          { t: 'Drop the primary keys', fb: 'They protect you from the collision.' },
          { t: 'Restart with `wal_level = replica`', fb: 'It has nothing to do with sequences.' }
        ],
        ok: 0, why: 'The recording: ' + SQ.rows_on_subscriber + ' rows copied, sequence at ' + SQ.subscriber_last_value + '. The next insert would reuse an id that exists.'
      }),

      B.order({
        id: 'm7-ord', t: 1, q: 'The disk of the primary is filling with log, and the tables are small. Put the steps in order.',
        items: [
          'Read `pg_replication_slots`: which slot, active or not, how many bytes it holds back',
          'Find the reader: a subscription, a connector, a standby, or nobody',
          'If the reader is alive, restart or fix it, so that it takes the log',
          'If the slot is abandoned, drop it with `pg_drop_replication_slot`, after confirming that nobody needs it',
          'Set `max_slot_wal_keep_size` and alert on `wal_status` and on the bytes held back'
        ],
        why: 'Dropping a slot ends the reader\'s ability to continue, so confirm who it belongs to. The limit and the alert make the next one a message and not an outage.'
      }),

      B.decide({
        id: 'm7-dec', t: 2, src: 'docs', title: 'Decision: feed the warehouse from PostgreSQL',
        scenario: 'The warehouse needs the orders table every few minutes. Today a job queries the primary with `SELECT * FROM orders WHERE updated_at > :last` every five minutes. It misses deletes, and it slows the primary at peak.',
        opts: [
          { t: 'Change data capture with a logical slot (a connector such as Debezium), with `max_slot_wal_keep_size` set and the slot monitored', d: 'Every insert, update and delete arrives, in order, and the primary does no scanning.', lose: '`wal_level = logical` needs a restart, a slot to monitor, a replica identity on each table, and a plan for a lost slot (a new snapshot).' },
          { t: 'Keep the polling query, but run it on a standby', d: 'No change on the primary.', lose: 'It still misses deletes, and the long query can be cancelled by a conflict, as the recording of this mission shows.' },
          { t: 'Nightly dump of the whole table', d: 'Simple.', lose: 'The warehouse is a day old, and the dump grows with the table.' }
        ],
        pick: 0,
        why: 'The requirement includes deletes and low latency, and only the log has them. The recording lists the costs: a slot that must be watched (' + SL.forgotten_retained_mb + ' MB held by one that nobody read, lost at the limit) and a key on every table. Debezium itself did not run in this mission. The Kafka course covers it.',
        when: 'If a daily copy is good enough, the dump is the right amount of engineering.'
      }),

      B.incident({
        id: 'm7-inc', t: 2, src: 'rec', title: 'Incident: the disk is full and the database is small', time: '05:05',
        alert: '**The primary has 2 GB of tables and a 100 GB disk that is 97 % full.** `pg_wal` holds 90 GB. Last week a team removed its CDC connector. Nobody dropped its slot.',
        clues: ['`pg_replication_slots` has a slot with `active = false` and `wal_status = reserved`', '`restart_lsn` is days behind the current position', 'There is no `max_slot_wal_keep_size` on this server'],
        opts: [
          { t: 'Confirm that the connector is gone, drop its slot, and set `max_slot_wal_keep_size` so that it cannot happen again', fb: '' },
          { t: 'Delete the files in `pg_wal` by hand', fb: 'It corrupts the server. Never delete files in `pg_wal`.' },
          { t: 'Restart the server', fb: 'The slot survives a restart, and so does the log that it holds.' },
          { t: 'Resize the disk and leave the slot', fb: 'The log will grow into the new space too.' }
        ],
        best: 0,
        why: 'The recording: a slot that was not read held **' + SL.forgotten_retained_mb + ' MB** after about 450,000 rows of changes, `wal_status` stayed `' + SL.forgotten_status + '`, and with a limit of 16 MB it turned to `' + SL.status_after_limit + '` and stopped holding log.',
        checks: [
          ['Find it', '`SELECT slot_name, active, wal_status, pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) FROM pg_replication_slots`.'],
          ['Confirm that nobody needs it', 'Ask the owner of the connector, or look at the subscription.'],
          ['Drop it', '`SELECT pg_drop_replication_slot(\'name\')`, and the log is recycled at the next checkpoints.'],
          ['Limit and alert', 'Set `max_slot_wal_keep_size`, and alert on inactive slots.']
        ],
        tell: 'A connector was removed and its slot stayed, so the primary kept all the log since then and the disk filled. I confirmed with the team that the connector is gone, dropped the slot, and the disk recovered after the next checkpoints. We set a limit on the log that a slot can hold, and an alert on inactive slots.',
        prevent: ['Set **`max_slot_wal_keep_size`**', 'Alert on **inactive slots** and on the **bytes they hold**', 'Drop the slot in the **same change** that removes its reader']
      }),

      B.qa({
        id: 'qa-standby', t: 1, tag: 'PostgreSQL', secs: 75,
        q: 'How does streaming replication work, and what can a standby do?',
        pts: ['The standby receives the WAL and replays it', 'It is a copy of the whole server, read-only', 'Asynchronous by default, so it can lag', 'Used for failover and for read replicas'],
        short: 'The primary sends its write-ahead log to the standby over a connection, and the standby **replays** it, so it is a page-for-page copy of the whole server. It is **read-only** while it is a standby: in my recording an insert on it failed with *cannot execute INSERT in a read-only transaction*. By default replication is **asynchronous**, so a commit on the primary does not wait for the standby, and the standby can be behind: when I paused replay and inserted 1,000 rows, the standby answered 1,000 while the primary had 2,000. I use a standby for **failover**, because it can be promoted, and for **read replicas** that take the load of reports. `pg_stat_replication` on the primary shows its state and its lag in bytes. Synchronous replication can make a commit wait for a standby, at the cost of latency.',
        fu: [['How do you make one?', '`pg_basebackup -R`, which copies the data and writes the standby settings.'], ['What is promotion?', 'Turning a standby into a primary, for example with `pg_promote()`.']],
        trap: 'Assuming that a replica always has the latest data.',
        real: 'Say how you handle lag in the applications that read from a replica.'
      }),

      B.qa({
        id: 'qa-conflict', t: 2, tag: 'PostgreSQL', secs: 75,
        q: 'Why does a long query on a standby get cancelled?',
        pts: ['A vacuum on the primary removed row versions that the query needs', 'The replay would have to remove them too', 'After max_standby_streaming_delay the query is cancelled', 'hot_standby_feedback trades it for bloat on the primary'],
        short: 'Because the standby replays what the primary did, and the primary may have **vacuumed away row versions** that the standby\'s query still needs for its snapshot. The standby cannot skip a record, so it waits for `max_standby_streaming_delay`, and then it **cancels the query**, with *conflict with recovery*. In my recording I held a snapshot on the standby, deleted 10,000 rows and vacuumed on the primary, and the session was ended after the delay, and `pg_stat_database_conflicts` counted it. With `hot_standby_feedback = on` the standby tells the primary about its oldest snapshot, so the primary **does not remove** those rows (10,000 not yet removable), and the query ran, but the primary carries the dead rows for as long as the standby\'s query runs. I choose by workload: a longer delay and feedback off, a dedicated standby for long reports, or feedback on for a standby with short queries.',
        fu: [['Where do you see it?', '`pg_stat_database_conflicts` on the standby.'], ['Is a delay of -1 allowed?', 'It means to wait forever, and the standby then falls behind. From documentation.']],
        trap: 'Switching feedback on everywhere to stop the errors.',
        real: 'Describe a report that was cancelled on a replica.'
      }),

      B.qa({
        id: 'qa-logical', t: 1, tag: 'PostgreSQL', secs: 75,
        q: 'What is logical replication, and how is it different from streaming replication?',
        pts: ['Publication on one side, subscription on the other', 'Rows of chosen tables, decoded from the log', 'The subscriber is a normal writable server, any major version', 'DDL and sequences are not replicated'],
        short: 'Logical replication copies **the changes of chosen tables as rows**. You create a `PUBLICATION` on the source and a `SUBSCRIPTION` on the target, which does an initial copy of the tables and then applies inserts, updates and deletes. The target is a **normal writable server**, can be a different major version, and can have other indexes, so I use it for reporting copies, for upgrades with little downtime, and for moving tables. Streaming replication copies the whole server, page for page, and is read-only. In my recording the subscriber copied 2,000 rows and then followed an update and a delete. The limits are what it does not copy: **DDL** (a column on one side only stopped it), **sequences** (1 on the subscriber against 100 on the publisher), and updates need a **primary key or a replica identity**. It also needs `wal_level = logical`.',
        fu: [['How do you upgrade with it?', 'Build a new server of the new version, subscribe, wait for it to catch up, and switch. From documentation.'], ['What about large objects and sequences?', 'Not replicated.']],
        trap: 'Believing that logical replication copies the table definition.',
        real: 'Describe a use of logical replication that you have seen.'
      }),

      B.qa({
        id: 'qa-slot', t: 1, tag: 'PostgreSQL', secs: 75,
        q: 'What is a replication slot, and what is the danger?',
        pts: ['It remembers how far a reader has read the log', 'The primary keeps all the log after that point', 'A reader that never returns fills the disk', 'max_slot_wal_keep_size limits it, and a slot can become lost'],
        short: 'A slot is a promise by the primary to **keep the log that a reader has not yet taken**, so that a standby, a subscriber or a CDC connector can pause and resume without a gap. The danger is a reader that **never comes back**: the slot keeps all the log since its position, and the disk of the primary fills while the tables are small. In my recording a slot that nobody read held 69 MB after 450,000 rows of changes, with `wal_status = reserved`, and the slot of a running subscription held 23 MB. `max_slot_wal_keep_size` limits the log that a slot can hold: with 16 MB the slot became `lost` and the server removed the log, which costs the reader a new snapshot but saves the disk. I alert on inactive slots and on the bytes that they hold, and I drop a slot in the same change that removes its reader.',
        fu: [['How do you list them?', '`SELECT * FROM pg_replication_slots`.'], ['What does lost mean?', 'The log that the slot needed is gone, and the reader cannot continue.']],
        trap: 'Removing a connector and leaving its slot.',
        real: 'Say how you monitor slots.'
      }),

      B.qa({
        id: 'qa-ddl', t: 2, tag: 'PostgreSQL', secs: 60,
        q: 'How do you run a schema migration with logical replication in place?',
        pts: ['DDL is not replicated', 'Add a column on the subscriber first', 'Drop a column on the publisher first', 'Watch the lag while you migrate'],
        short: 'Logical replication does not copy DDL, so I run the change on both sides, in an order that keeps the subscriber able to apply every row. For a **new column** I add it on the **subscriber first**, then on the publisher: in my recording the other way round stopped the subscriber at the first row that carried the column, with an error that named it, and the subscriber had 2,004 rows against 2,005 until I added the column there. For a **dropped column** I drop it on the publisher first, then on the subscriber. A type change needs more care. During the migration I watch the lag, because a stalled subscriber makes the primary keep the log. And I remember that **sequences** are not replicated, so a switchover needs a `setval`.',
        fu: [['Can the order be automated?', 'With a migration tool that knows both sides. From documentation.'], ['What if you forget?', 'The subscriber stops, and the primary keeps the log until you fix it.']],
        trap: 'Running the migration on the publisher only.',
        real: 'Describe a migration that stalled replication.'
      }),

      B.qa({
        id: 'qa-cdc', t: 2, tag: 'PostgreSQL', secs: 75,
        q: 'How does a change data capture tool read from PostgreSQL?',
        pts: ['Through logical decoding and a replication slot', 'wal_level = logical and a plugin such as pgoutput', 'It sees inserts, updates and deletes in commit order', 'The slot has to be watched'],
        short: 'It reads the write-ahead log through **logical decoding**: the server needs `wal_level = logical`, the tool creates a **replication slot** with an output plugin such as `pgoutput`, and then reads the decoded changes of each transaction in commit order. In my recording I read a slot with the `test_decoding` plugin: each transaction was a BEGIN, the row changes and a COMMIT, an update showed the new row, and a delete only the **key**, which is why every table needs a primary key or a replica identity. The tool remembers its position in the slot, so the primary keeps the log until it has confirmed it. That is why the slot must be monitored and limited with `max_slot_wal_keep_size`. I did not run Debezium here: it is covered in the Kafka course, and its behaviour on top of this mechanism is from documentation.',
        fu: [['What about the initial data?', 'A snapshot of the tables, and then the stream.'], ['What about schema changes?', 'The tool has to handle them. From documentation.']],
        trap: 'Believing that CDC polls the tables.',
        real: 'Name a CDC pipeline you operated and its slot.'
      }),

      B.qa({
        id: 'qa-lag', t: 1, tag: 'PostgreSQL', secs: 60,
        q: 'How do you measure replication lag?',
        pts: ['pg_stat_replication on the primary: bytes between sent and replay', 'On the standby: now() minus pg_last_xact_replay_timestamp()', 'A bytes lag and a time lag are different', 'Alert on both'],
        short: 'On the primary, `pg_stat_replication` has the log positions `sent_lsn`, `write_lsn`, `flush_lsn` and `replay_lsn`, and `pg_wal_lsn_diff` between them gives the lag in **bytes**. In my recording the standby was 0 bytes behind when idle, and behind while replay was paused. On the standby I can compare `now()` with `pg_last_xact_replay_timestamp()` for a lag in **time**, which is what a user feels, but it grows on a quiet primary, because nothing is replayed. So I alert on the byte lag and on the time lag together. For logical replication I look at the slot: how many bytes the `restart_lsn` is behind the current position. A lag that keeps growing means that the reader is slower than the writes, or stopped.',
        fu: [['What are the usual causes?', 'A long conflicting query, a slow disk on the standby, or a huge transaction.'], ['What does the application do about it?', 'Read your own writes from the primary.']],
        trap: 'Measuring lag only in seconds on a quiet system.',
        real: 'Say what lag you alert on, and its threshold.'
      }),

      B.recap({
        id: 'm7-recap', n: 7, badge: 'Replica Keeper', color: '#99F6E4',
        pts: [
          'A **standby** replays the log: `' + STAT[1] + '`, `' + STAT[2] + '`, **read-only**. It can be behind: ' + n(LG.standby_rows_while_paused) + ' rows against ' + n(LG.primary_rows) + ' while paused.',
          'A vacuum on the primary can **cancel a long query** on the standby. `hot_standby_feedback` trades that for ' + n(CF.on_not_yet_removable) + ' dead rows kept on the primary.',
          '**Logical** replication copies rows of chosen tables to a writable server. It does **not** copy DDL or sequences (' + SQ.subscriber_last_value + ' against ' + SQ.publisher_last_value + '), and needs a key.',
          'A **slot** that nobody reads held **' + SL.forgotten_retained_mb + ' MB**, and became `' + SL.status_after_limit + '` at the limit.',
          'CDC reads decoded changes through a slot. A delete shows only the **key**.'
        ],
        lines: [
          'I know which replica I am reading from.',
          'I run migrations in the right order.',
          'I limit and watch every slot.'
        ]
      })
    ]
  });
})();
