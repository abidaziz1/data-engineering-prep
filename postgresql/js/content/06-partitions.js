/* Mission 6: partitioning and retention. A table of 600,000 events in six monthly partitions, on a real server. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var SZ = G.table('part.sizes').rows, RT = G.table('part.retention').rows, PS = C('part.sizes'), PR = C('part.pruning'), RC = C('part.retention'), ER = C('part.errors');
  var PART = G.file('partitions.sql');
  var mbOf = function (b) { return (b / 1048576).toFixed(1) + ' MB'; };
  var kbOf = function (b) { return (b / 1024).toFixed(1) + ' kB'; };
  G.expect(PS.partitions === 6 && PS.total_rows === 600000 && PR.partitions_scanned_with_range === 1 && PR.partitions_scanned_with_function === 6 && PR.prepared_subplans_removed === 5, 'a range prunes to one partition, a function on the key scans all six');
  G.expect(RC.delete_wal_bytes > 5000000 && RC.drop_wal_bytes < 20000 && RC.times_less_wal > 100 && RC.delete_keeps_the_space === true && RC.dead_rows_after_delete === RC.march_rows, 'a delete writes log and dead rows and keeps the space, a drop writes almost nothing');
  G.expect(ER.default_blocks_new_partition && ER.no_partition_error && ER.pk_error_names_the_rule, 'the three errors of partitioning');
  var FUNC = "SELECT count(*) FROM ev\nWHERE date_trunc('day', event_ts) = '2026-03-05';\n";
  var DEL = '-- retention: keep ninety days\nDELETE FROM ev WHERE event_ts < now() - interval \'90 days\';\nVACUUM ev;\n';
  var rowsOf = function (t) { return t.split('\n'); };
  var span = function (a, b) { return G.span(PART, a, b); };

  LAB.addChapter({
    id: 'm6', n: 6, title: 'Partitions and retention', short: 'Partitions', blurb: 'pruning, a month dropped without a dead row, and the three errors you will meet', minutes: 18,
    focus: ['mon', 'qual'],
    goals: [
      'Partition a table **by time** and read the **pruning** in the plan.',
      'Say why a **function on the key** hides the partition.',
      'Remove a month with **detach and drop**, and say why a `DELETE` is worse.',
      'Read the three errors of partitioning: the **key**, the **missing partition** and the **default**.'
    ],
    say: 'An events table only grows, and somebody asks to keep ninety days. You can delete rows, and then wait for vacuum and watch the log. Or you can keep each month in a table of its own and drop the old one. We recorded both on 600,000 rows, and you will see why partitioning is mostly about **removing data**, and only second about speed.',
    scenes: [
      B.flow({
        id: 'm6-flow', t: 1, src: 'docs', title: 'One table in many pieces', g: 'partition', legend: true,
        steps: [
          { say: 'The events table is **partitioned by month**. The parent holds no rows. Each month is a table of its own. Press Next.', focus: ['par', 'feb', 'mar', 'apr', 'def'], cap: 'The parent and its partitions.' },
          { say: 'Step 1. A query asks for one day of March. It is written against the **parent**, as if it were one table.', on: ['e1'], focus: ['q', 'par'], cap: 'You query the parent.' },
          { say: 'Step 2. The planner compares the **range in your WHERE clause** with the bounds of each partition.', on: ['e2', 'e4', 'e5'], focus: ['par'], tags: ['tg_pruned'], cap: 'It compares the bounds.' },
          { say: 'Step 3. Only the partition that overlaps the range is read. The others are **pruned**: they are not even opened.', on: ['e3'], focus: ['par', 'mar'], tags: ['tg_read'], cap: 'Only March is read.' },
          { say: 'A **function on the key** (`date_trunc(...)`, a cast) hides the range, and the planner has to read every partition.', focus: ['q', 'par'], tags: ['tg_func'], cap: 'A function on the key defeats pruning.' },
          { say: 'Step 4. Retention: a month that is no longer needed is **detached and dropped**. No row is deleted, so there are no dead rows and almost no log.', on: ['e6'], focus: ['apr', 'drop'], cap: 'Retention drops a partition.' }
        ]
      }),

      B.cmp({
        id: 'm6-sizes', t: 1, src: 'rec', title: 'Six partitions of one table',
        say: 'The recording: 600,000 events spread over six months, loaded into the parent, which routed each row.',
        cols: ['Partition', 'Rows', 'Size'],
        hl: 1,
        rows: SZ.map(function (r) { return [r[0], n(r[1]), mbOf(r[2])]; }),
        steps: [
          { upto: 3, say: 'January, February and March: 103,015, 93,046 and 103,015 rows. February is shorter, and it holds fewer. The **parent has no rows of its own**.' },
          { upto: 6, say: 'In all **' + n(PS.total_rows) + '** rows in **' + PS.partitions + '** partitions of about 6 MB each. Each partition is a normal table with its own indexes, its own statistics and its own autovacuum.' }
        ]
      }),

      B.term({
        id: 'm6-prune', t: 1, src: 'rec', title: 'Pruning, and a function that defeats it',
        say: 'Two queries for the same day. One filters on a range of the key. The other applies `date_trunc` to the key.',
        lines: function () {
          return G.term([
            ['EXPLAIN (ANALYZE) ' + rowsOf(X('part.plan_pruned'))[0], rowsOf(X('part.plan_pruned')).slice(1).join('\n')],
            ['EXPLAIN (ANALYZE) ' + rowsOf(X('part.plan_not_pruned'))[0], rowsOf(X('part.plan_not_pruned')).slice(1, 7).join('\n') + '\n... (' + PR.partitions_scanned_with_function + ' partitions in all)']
          ]);
        },
        after: 'The range query read **' + PR.partitions_scanned_with_range + '** partition, `ev_2026_03`, and found ' + n(PR.range_rows) + ' rows. The `date_trunc` query read **all ' + PR.partitions_scanned_with_function + '**: the planner cannot compare `date_trunc(\'day\', event_ts)` with the bounds, so it must read every partition and apply the function to every row. The result is the same and the work is six times larger. **Write conditions on the partition key as plain ranges** (`>=` and `<`), and the same for casts such as `event_ts::date = ...`.',
        afterKind: 'warn',
        doneSay: 'Plain ranges on the key prune. Functions on the key do not.'
      }),

      B.term({
        id: 'm6-prepared', t: 2, src: 'rec', title: 'Prepared statements prune too',
        say: 'Drivers send parameters, and a generic plan does not know the values when it is made. I forced a generic plan and ran it with two dates.',
        lines: function () {
          return G.term([['EXECUTE q(\'2026-03-05\', \'2026-03-06\');', rowsOf(X('part.plan_prepared')).slice(2).join('\n')]]);
        },
        after: 'The plan says **Subplans Removed: ' + PR.prepared_subplans_removed + '**, and only `ev_2026_03` was executed. When the parameters are known, at the **start of execution**, PostgreSQL removes the partitions that cannot match. Pruning therefore works with `psycopg` parameters and `PREPARE`, and with literals in the text. A condition on `now()` is also pruned at the start of execution, and was not recorded here.',
        afterKind: 'tip',
        doneSay: 'Parameters are pruned at execution time.'
      }),

      B.cmp({
        id: 'm6-retention', t: 1, src: 'rec', title: 'Removing a month: DELETE or DROP',
        say: 'Keep six months. I removed March with `DELETE`, and April with `DETACH PARTITION` and `DROP TABLE`, and measured what was written.',
        cols: ['Remove one month', 'Rows removed', 'Log written', 'Table afterwards', 'Dead rows left'],
        hl: 2,
        rows: RT.map(function (r, i) { return [r[0], n(r[1]), r[2] > 100000 ? mbOf(r[2]) : kbOf(r[2]), i === 0 ? mbOf(r[3]) : 'gone', n(r[4])]; }),
        steps: [
          { upto: 1, say: '`DELETE` of **' + n(RC.march_rows) + '** rows wrote **' + RC.delete_wal_mb + ' MB** of log. The table is **still ' + mbOf(RC.march_size_after_delete) + '**, and it holds **' + n(RC.dead_rows_after_delete) + ' dead rows** that vacuum has to clean. A standby replays all of it.' },
          { upto: 2, say: '`DETACH PARTITION` and `DROP TABLE` wrote **' + kbOf(RC.drop_wal_bytes) + '**: **' + n(RC.times_less_wal) + ' times less**. The file was removed, the space returned to the disk at once, and nothing is left for vacuum. This is the reason to partition a table that has a retention rule.' }
        ]
      }),

      B.term({
        id: 'm6-errors', t: 1, src: 'rec', title: 'The three errors of partitioning',
        say: 'Three things go wrong the first time. I made each of them happen.',
        lines: function () {
          return G.term([
            ['CREATE TABLE ev_bad (event_id bigint PRIMARY KEY, event_ts timestamptz) PARTITION BY RANGE (event_ts);', rowsOf(X('part.pk_error')).slice(1).join('\n')],
            ['INSERT INTO ev VALUES (999999999, \'2027-01-01\', 1, \'view\');   -- no partition for it', rowsOf(X('part.no_partition')).slice(1).join('\n')],
            ['CREATE TABLE ev_default PARTITION OF ev DEFAULT;  -- then the row goes there, and then:', ''],
            ['CREATE TABLE ev_2027_01 PARTITION OF ev FOR VALUES FROM (\'2027-01-01\') TO (\'2027-02-01\');', rowsOf(X('part.default_conflict')).slice(2).join('\n')]
          ]);
        },
        after: '**1. The key.** A primary key or unique constraint on a partitioned table **must include the partition key**, because each partition enforces uniqueness alone. A key on `event_id` alone is not possible: use `(event_id, event_ts)`. **2. No partition.** A row whose time has no partition is **refused**, so a pipeline that runs past the last partition fails. Create next month\'s partition **ahead of time**. **3. The default partition.** A `DEFAULT` partition catches such rows, and then you cannot add a partition for their range while they are in it: the server refuses until the rows are moved.',
        afterKind: 'warn',
        doneSay: 'The key includes the partition key. Create partitions ahead. A default partition holds strays.'
      }),

      B.code({
        id: 'm6-code', t: 1, src: 'rec', title: 'The partitions of the events table', file: 'partitions.sql', lang: 'sql', code: PART,
        steps: [
          { say: 'This is the file of the project. It ran as it is, and the structure of the recording comes from it. Press Next.', lines: null },
          { say: 'The table is declared `PARTITION BY RANGE (event_ts)`, and the **primary key contains `event_ts`**. Without it, the first error of the previous screen.', lines: span(/CREATE TABLE ev \(/, /PARTITION BY RANGE/) },
          { say: 'One partition for each month, with bounds that include the start and exclude the end. Create them **ahead of time**, from a scheduled job.', lines: span(/ev_2026_03 PARTITION OF/, /ev_2026_04 PARTITION OF/) },
          { say: 'The **default partition** catches the rest. It is a safety net that must stay nearly empty.', lines: span(/ev_default/) },
          { say: 'Retention is two statements: detach, then drop. `DETACH PARTITION ... CONCURRENTLY` exists to avoid a long lock, and I did not run it. Detach first and **archive** the table if you must keep a copy.', lines: span(/DETACH PARTITION/, /DROP TABLE/) }
        ],
        note: 'Declarative partitioning needs PostgreSQL 10 or later. The syntax is the one of version 16.'
      }),

      B.cmp({
        id: 'm6-when', t: 2, src: 'docs', title: 'When to partition, and when not to',
        say: 'Partitioning has a cost, and this screen is from documentation. Press Next.',
        cols: ['Reason', 'Partition?', 'Why'],
        hl: 1,
        rows: [
          ['Data is kept for a fixed time and old data is removed', 'Yes', 'Drop a partition instead of a huge DELETE. This is the best reason.'],
          ['The table is bigger than memory and queries filter by time', 'Yes', 'Pruning reads one partition, and each has smaller indexes.'],
          ['Maintenance on a huge table is slow', 'Yes', 'Vacuum, analyze and reindex work on one partition at a time.'],
          ['A 5 GB table is slow', 'Probably not', 'An index or a better plan is usually the cure. Partitioning adds objects and planning time.'],
          ['Queries never filter on the key', 'No', 'Every query reads every partition.'],
          ['You need a unique key on a column that is not the partition key', 'No', 'It is not possible: uniqueness is per partition.']
        ],
        steps: [
          { upto: 3, say: 'Three good reasons: retention, size and maintenance. They share a pattern: you work on **one piece** at a time.' },
          { upto: 6, say: 'Three bad reasons. Partitioning is not a general speed-up, and it adds planning time with many partitions, which I did not measure.' }
        ]
      }),

      B.bug({
        id: 'm6-bug', t: 1, src: 'docs', q: 'The events table is partitioned by month, and this query scans every partition. Click the line that causes it.',
        file: 'day.sql', lang: 'sql', code: FUNC, bad: [2],
        hint: 'Can the planner compare the result of a function with the bounds of a partition?',
        why: 'The condition applies `date_trunc` to the **partition key**, so the planner cannot compare it with the bounds and must read every partition. The recording: this form read **' + PR.partitions_scanned_with_function + '** partitions, the range form read **' + PR.partitions_scanned_with_range + '**. Write `event_ts >= \'2026-03-05\' AND event_ts < \'2026-03-06\'`.',
        fix: "SELECT count(*) FROM ev\nWHERE event_ts >= '2026-03-05' AND event_ts < '2026-03-06';\n",
        cheer: 'A plain range on the key.'
      }),

      B.bug({
        id: 'm6-bug2', t: 1, src: 'docs', q: 'This job keeps ninety days of events, on a table that is partitioned by month. It runs every night and the standby falls behind. Click the line that is the problem.',
        file: 'retention.sql', lang: 'sql', code: DEL, bad: [2],
        hint: 'What does a delete write, and what stays behind?',
        why: 'A `DELETE` writes a log record for every row, leaves a **dead row** for each of them, and **does not shrink the files**. The recording: **' + n(RC.march_rows) + '** rows wrote **' + RC.delete_wal_mb + ' MB** of log, and the table kept its ' + mbOf(RC.march_size_after_delete) + '. With partitions the same removal was `DETACH PARTITION` and `DROP TABLE`: **' + kbOf(RC.drop_wal_bytes) + '** of log.',
        fix: '-- retention: keep three months\nALTER TABLE ev DETACH PARTITION ev_2026_03;\nDROP TABLE ev_2026_03;\n',
        cheer: 'Drop a partition, not rows.'
      }),

      B.quiz({
        id: 'm6-q1', t: 1,
        q: 'Which query on a table partitioned by `event_ts` is pruned to one month?',
        opts: [
          { t: '`WHERE event_ts >= \'2026-03-01\' AND event_ts < \'2026-04-01\'`', fb: '' },
          { t: '`WHERE date_trunc(\'month\', event_ts) = \'2026-03-01\'`', fb: 'A function on the key hides the range: all partitions are read.' },
          { t: '`WHERE event_ts::date = \'2026-03-05\'`', fb: 'A cast is a function on the key.' },
          { t: '`WHERE user_id = 7`', fb: 'The key is not in the condition.' }
        ],
        ok: 0, why: 'The recording: the range read **' + PR.partitions_scanned_with_range + '** partition, the function read **' + PR.partitions_scanned_with_function + '**.'
      }),

      B.quiz({
        id: 'm6-q2', t: 1,
        q: 'You partition by `event_ts`. Which primary key is allowed?',
        opts: [
          { t: '`(event_id, event_ts)`', fb: '' },
          { t: '`(event_id)` alone', fb: 'It lacks the partition key, and the server refuses it.' },
          { t: 'No primary key is possible on a partitioned table', fb: 'It is possible, if it includes the partition key.' },
          { t: '`(event_ts)` alone only', fb: 'It would be allowed, but two events can share a second.' }
        ],
        ok: 0, why: 'The error of the recording: *' + X('part.pk_error').split('\n')[1] + '*.'
      }),

      B.quiz({
        id: 'm6-q3', t: 1,
        q: 'You remove 100,000 old events. How does the log compare between `DELETE` and dropping a partition?',
        opts: [
          { t: 'The delete writes millions of bytes, the drop a few kilobytes', fb: '' },
          { t: 'They write about the same', fb: 'The drop removes a file and writes almost nothing.' },
          { t: 'The drop writes more, because it moves the data', fb: 'Nothing is moved.' },
          { t: 'Neither writes to the log', fb: 'Every change is logged.' }
        ],
        ok: 0, why: 'The recording: ' + RC.delete_wal_mb + ' MB for the delete of ' + n(RC.march_rows) + ' rows and ' + kbOf(RC.drop_wal_bytes) + ' for the drop, ' + n(RC.times_less_wal) + ' times less.'
      }),

      B.quiz({
        id: 'm6-q4', t: 2,
        q: 'A default partition holds some January 2027 rows. You try to add the partition for January 2027. What happens?',
        opts: [
          { t: 'The server refuses until the rows are moved out of the default partition', fb: '' },
          { t: 'The rows move automatically', fb: 'They do not. The error says that the default partition would be violated.' },
          { t: 'A second partition is made and both hold the rows', fb: 'The bounds would overlap.' },
          { t: 'The default partition is dropped', fb: 'It stays.' }
        ],
        ok: 0, why: 'The error of the recording: *' + X('part.default_conflict').split('\n')[2] + '*.'
      }),

      B.order({
        id: 'm6-ord', t: 1, q: 'Write the monthly retention job of a partitioned events table. Put the steps in order.',
        items: [
          'Create the partitions of the next months, so that new rows always have a home',
          'Check that the default partition is empty',
          'Detach the oldest partition',
          'Archive it if it must be kept (a dump, or a copy to object storage)',
          'Drop the detached table and log what was removed'
        ],
        why: 'The first two steps stop the errors of the recording. Detaching before dropping gives you a moment to archive, and a table that you can still read.'
      }),

      B.decide({
        id: 'm6-dec', t: 2, src: 'docs', title: 'Decision: a table of 500 GB and a rule of 13 months',
        scenario: 'The events table is 500 GB and grows by 40 GB a month. Business rules say to keep 13 months. Today a nightly `DELETE` removes the oldest day, and vacuum cannot keep up. Dashboards filter by time.',
        opts: [
          { t: 'Partition by month, create next months ahead, and drop the oldest partition each month', d: 'Retention becomes a drop. Queries by time prune. Vacuum and reindex work on 40 GB pieces.', lose: 'A migration to the partitioned table, a primary key that includes the time, and a job that creates and drops partitions.' },
          { t: 'Keep one table, add a BRIN index, and keep the nightly delete', d: 'No migration.', lose: 'The delete still writes log and dead rows every night, and the table never shrinks.' },
          { t: 'Hash partition by user, 64 partitions', d: 'Even sizes.', lose: 'It does not help retention, because every partition holds every month, and queries by time still read all of them.' }
        ],
        pick: 0,
        why: 'The rule is about time, so the partitions should be about time. The recording shows the difference in what removal costs: **' + RC.delete_wal_mb + ' MB** of log for ' + n(RC.march_rows) + ' rows against **' + kbOf(RC.drop_wal_bytes) + '**. At 500 GB the ratio is the reason the delete cannot keep up.',
        when: 'A table that is small, or kept forever, has little to gain.'
      }),

      B.incident({
        id: 'm6-inc', t: 2, src: 'rec', title: 'Incident: the retention job fills the disk and the replica lags', time: '03:20',
        alert: '**The nightly retention `DELETE` has run for two hours.** The log directory is growing, the standby is behind by minutes, and the table is not smaller afterwards. Dashboards are slow.',
        clues: ['The events table is partitioned by month, but the job deletes rows by `WHERE event_ts < ...`', 'Autovacuum is running on the partitions that the delete touched', '`DELETE` of one month wrote about 5.5 MB of log for 100,000 rows in a test'],
        opts: [
          { t: 'Stop the delete. Replace it with `DETACH PARTITION` and `DROP TABLE` of the old month, and let vacuum finish what is already dead', fb: '' },
          { t: 'Run `VACUUM FULL` on the table', fb: 'It takes an exclusive lock and rewrites the table while dashboards need it.' },
          { t: 'Add more disk and wait', fb: 'The same delete will run again tomorrow.' },
          { t: 'Increase `max_wal_size`', fb: 'It makes the log bigger and not smaller.' }
        ],
        best: 0,
        why: 'The recording: a delete of **' + n(RC.march_rows) + '** rows wrote **' + RC.delete_wal_mb + ' MB**, left **' + n(RC.dead_rows_after_delete) + '** dead rows and the same file size; dropping a partition of ' + n(RC.april_rows) + ' rows wrote **' + kbOf(RC.drop_wal_bytes) + '**.',
        checks: [
          ['Stop the delete', 'Cancel the job, so that the log and the lag stop growing.'],
          ['Check that the table is partitioned by time', 'Retention by the same key is a drop.'],
          ['Detach and drop', 'The old month is gone in a moment, with no dead rows.'],
          ['Let the replica catch up', 'It has to replay what was already written.']
        ],
        tell: 'The retention job deleted rows from a table that is partitioned by month, so it wrote a lot of log and left dead rows, and the standby lagged. I stopped the job and replaced it with detach and drop of the old partition. Removal is now instant, the log stays small, and the replica is current.',
        prevent: ['Make retention follow the **partition key**', 'Create partitions **ahead of time**', 'Alert on the **lag** of replicas']
      }),

      B.qa({
        id: 'qa-partition', t: 1, tag: 'PostgreSQL', secs: 75,
        q: 'What is table partitioning, and why would you use it?',
        pts: ['One logical table made of several physical tables', 'Declarative: range, list or hash on the partition key', 'Pruning: queries read only the partitions that match', 'Best use: retention by dropping a partition'],
        short: 'It splits one logical table into several physical ones by a **partition key**, with declarative **range**, **list** or **hash** partitioning. You query the parent and the server routes rows on insert and **prunes** partitions on select, so a query for one day reads one month. In my recording a table of 600,000 events in six monthly partitions read one partition for a range on the key and all six for a function on the key. The best reason to use it is **retention**: removing a month is `DETACH PARTITION` and `DROP TABLE`, which wrote 7 KB of log, while a `DELETE` of 103,015 rows wrote 5.5 MB, left 103,015 dead rows and did not shrink the file. A second reason is maintenance on a smaller piece at a time. It is not a general speed-up, and it adds planning work and rules about keys.',
        fu: [['What are the partition types?', 'Range for time, list for categories, hash for even spread.'], ['Is it a different table?', 'Each partition is a table with its own indexes and statistics.']],
        trap: 'Partitioning a small table for speed.',
        real: 'Say which tables you partitioned, and by what.'
      }),

      B.qa({
        id: 'qa-pruning', t: 1, tag: 'PostgreSQL', secs: 60,
        q: 'What is partition pruning, and what defeats it?',
        pts: ['The planner skips partitions whose bounds cannot match', 'Needs the partition key in the WHERE clause', 'A function or a cast on the key hides it', 'Also at execution time for parameters'],
        short: 'Pruning is the planner leaving out partitions whose bounds cannot overlap the condition, so they are not even opened. It needs a condition on the **partition key** in a form that can be compared with the bounds, such as a range with `>=` and `<`. A **function or a cast on the key**, for example `date_trunc(\'day\', event_ts) = ...` or `event_ts::date`, hides the range, and every partition is read: in my recording that was 6 partitions against 1 for the same day. Pruning also works for parameters of a prepared statement, at the start of execution: the plan said `Subplans Removed: 5`. I check it in the plan, by counting the partitions that appear in it.',
        fu: [['Can you turn it off?', '`enable_partition_pruning`, on by default.'], ['What about joins?', 'Partition-wise joins exist and need a setting. From documentation.']],
        trap: 'Wrapping the key in a function.',
        real: 'Describe a query that you fixed so that it pruned.'
      }),

      B.qa({
        id: 'qa-retention', t: 1, tag: 'PostgreSQL', secs: 60,
        q: 'How do you delete old data from a huge table?',
        pts: ['Partition by time and drop old partitions', 'DELETE writes log and dead rows and does not shrink the file', 'Detach first, archive if needed', 'If not partitioned: delete in batches and vacuum'],
        short: 'If I can, I partition by time and drop the old partition: `ALTER TABLE ev DETACH PARTITION ev_2026_03`, then `DROP TABLE`. That wrote 7 KB of log in my recording, left no dead rows and returned the space to the disk at once. A `DELETE` of one month wrote 5.5 MB of log for 103,015 rows, left the same number of dead rows, and the file kept its size, and a standby has to replay all of it. If the table is not partitioned, I delete in **batches** of a few thousand rows, in separate transactions, with pauses, so that vacuum can keep up and the replica does not lag, and I accept that the file will not shrink. Detaching first also gives me a moment to archive the data, for example with a dump.',
        fu: [['Is TRUNCATE an option?', 'For a whole table, yes. It is fast and takes an exclusive lock.'], ['What about CONCURRENTLY?', '`DETACH PARTITION ... CONCURRENTLY` avoids a long lock. From documentation.']],
        trap: 'One huge DELETE in one transaction.',
        real: 'Describe a retention job that you built or fixed.'
      }),

      B.qa({
        id: 'qa-partkey', t: 2, tag: 'PostgreSQL', secs: 60,
        q: 'What limits does partitioning put on keys and indexes?',
        pts: ['A primary key or unique index must include the partition key', 'Uniqueness is per partition', 'Indexes are created on each partition', 'No foreign key to a column outside the key as a unique target'],
        short: 'A **primary key or unique constraint must include all the partition columns**, because uniqueness is enforced inside each partition and the server cannot check across them. In my recording a primary key on `event_id` alone was refused with *unique constraint on partitioned table must include all partitioning columns*, so the key is `(event_id, event_ts)`. That means the database cannot guarantee that `event_id` is unique on its own, and the application or the loader has to, for example with a sequence. An index on the parent is created on every partition. A foreign key that points **to** a partitioned table needs a unique key that includes the partition key, which limits the design, so a big events table is usually the child, not the parent.',
        fu: [['Can you index one partition only?', 'Yes. An index on a partition is its own.'], ['Does a default partition matter?', 'It catches rows that fit nowhere, and it blocks adding a partition for their range.']],
        trap: 'Expecting a global unique constraint.',
        real: 'Say how you kept an id unique across partitions.'
      }),

      B.qa({
        id: 'qa-default', t: 2, tag: 'PostgreSQL', secs: 60,
        q: 'What happens to a row that fits no partition?',
        pts: ['The insert fails with no partition of relation found for row', 'A DEFAULT partition catches it instead', 'Then new partitions for that range cannot be added until the rows are moved', 'Create partitions ahead of time'],
        short: 'Without a default partition the insert fails with *no partition of relation \\"ev\\" found for row*, and the DETAIL shows the key value, so a pipeline that runs past the last partition stops. With a **`DEFAULT` partition** the row is stored there instead. The catch is that you cannot then create a partition for a range that the default partition holds rows for: in my recording the server refused with *updated partition constraint for default partition would be violated by some row*, and the rows have to be moved out first. So I create partitions **ahead of time** from a scheduled job, I alert when the default partition is not empty, and I treat it as a safety net and not as a place to store data.',
        fu: [['How far ahead?', 'Enough to survive a failed job for a few days.'], ['How do you move the rows?', 'Detach the default partition, insert its rows into the parent, and attach it again. From documentation.']],
        trap: 'Using the default partition as a normal one.',
        real: 'Describe an outage that a missing partition caused.'
      }),

      B.recap({
        id: 'm6-recap', n: 6, badge: 'Partitioner', color: '#FBCFE8',
        pts: [
          'A range on the **partition key** read **' + PR.partitions_scanned_with_range + '** partition, a **function** on it read **' + PR.partitions_scanned_with_function + '**. Parameters prune too (Subplans Removed: ' + PR.prepared_subplans_removed + ').',
          'Removing a month: `DELETE` wrote **' + RC.delete_wal_mb + ' MB** and left ' + n(RC.dead_rows_after_delete) + ' dead rows; **detach and drop** wrote **' + kbOf(RC.drop_wal_bytes) + '**.',
          'A primary key must **include the partition key**. A row with no partition is **refused**. A default partition **blocks** a new partition for its range.',
          'Create the **next partitions ahead of time**, and keep the default one empty.',
          'Partition for **retention and maintenance**, not as a general speed-up.'
        ],
        lines: [
          'I write plain ranges on the partition key.',
          'I drop partitions instead of deleting rows.',
          'I create partitions ahead of time.'
        ]
      })
    ]
  });
})();
