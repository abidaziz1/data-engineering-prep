/* Mission 5: table care. Schema rules, constraints, small files, OPTIMIZE, VACUUM, partitions and RESTORE. All of it ran on real Delta Lake. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var SM = C('schema.mismatch'), SE = C('schema.evolve'), STE = C('schema.type_error'), SK = C('schema.constraints');
  var FS = C('files.small'), FO = C('files.optimize'), FV = C('files.vacuum'), FVC = C('files.vacuum_check'), FVD = C('files.vacuum_dry'), TE = C('files.timetravel_error');
  var PL = G.table('partition.layout').rows, PP = C('partition.pruning'), RS = C('restore'), RH = G.table('restore.history').rows, MT = C('maint');
  var MAINT = G.file('04_maintenance.py');
  G.expect(SM.rows_after_failed_append === 10000 && SE.old_rows_have_null_channel === 10000 && SE.columns_after.length === SE.columns_before.length + 1 && STE.rows_after === 10000, 'a refused write changes nothing, and mergeSchema adds a column that old rows leave empty');
  G.expect(SK.check_condition === 'DELTA_VIOLATE_CONSTRAINT_WITH_VALUES' && SK.not_null_condition === 'DELTA_NOT_NULL_CONSTRAINT_VIOLATED' && SK.rows_after_failed_insert === 10000 && SK.protocol_after_check === 3, 'a check constraint and a not null constraint refuse a row');
  G.expect(FS.files === 40 && FS.commits === 41 && FO.files_removed === 40 && FO.files_added === 1 && FO.files_after === 1 && FO.parquet_files_in_folder === 41 && FO.data_change === false && FV.parquet_files_after === 1 && FVD.rows === 0 && FVC.files_after_refusal === 41, 'forty small files become one, and the old files stay until a vacuum');
  G.expect(TE.condition === 'FAILED_READ_FILE.FILE_NOT_EXIST' && TE.latest_still_works === true && TE.optimize_version_reads === true, 'a vacuumed version cannot be read and the latest can');
  G.expect(PL[0][2] === 1 && PL[1][2] === 5 && PL[2][2] === 12 && PL[3][2] === 400 && PP.plan_has_partition_filter === true && PP.rows_for_the_day === 2000, 'one file for each partition value, and the filter on the date prunes');
  G.expect(RS.rows_after_bad_overwrite === 500 && RS.rows_after_restore === 10000 && RS.restore_is_a_new_version === true, 'a bad overwrite is undone by a restore that is itself a version');
  G.expect(MT.silver_orders.optimized === true && MT.silver_orders.files_after < MT.silver_orders.files_before, 'the maintenance notebook compacts silver');

  LAB.addChapter({
    id: 'm5', n: 5, title: 'Table care', short: 'Table care', blurb: 'Schema rules, small files, OPTIMIZE, VACUUM, partitions and RESTORE', minutes: 28,
    focus: ['air'],
    goals: [
      'Say what **schema enforcement**, **evolution** and **constraints** do to a write.',
      'Explain the **small files** problem and what `OPTIMIZE` and `VACUUM` do to the folder.',
      'Decide when a **partition** helps and when it makes things worse.',
      'Undo a bad write with **RESTORE**.'
    ],
    say: 'A Delta table that is loaded well can still go bad: files pile up, history grows, someone adds a column by accident, and one overwrite replaces ten thousand rows with five hundred. This mission is the care of a table. Every number is from real Delta Lake, and Fabric adds its own maintenance tools on top, which are from documentation.',
    scenes: [
      B.term({
        id: 'm5-schema', t: 1, src: 'rec', title: 'Schema enforcement: a write that does not fit is refused',
        say: 'I appended three rows that have one column more than the table, a `channel` column, to a copy of silver.',
        lines: function () { return G.plain(X('schema.mismatch')); },
        after: 'Delta compares the schema of every write with the schema of the table and **refuses a mismatch**. The error is `' + SM.condition + '`, and it tells you the two ways forward: the `mergeSchema` option, or a session setting. After the refusal the table still held **' + n(SM.rows_after_failed_append) + '** rows. Nothing was written, because nothing was committed.',
        afterKind: 'tip',
        doneSay: 'A refused write leaves the table as it was.'
      }),

      B.term({
        id: 'm5-evolve', t: 1, src: 'rec', title: 'Schema evolution: the same write with mergeSchema',
        say: 'I wrote the same three rows again, this time with the option that allows the table to grow a column.',
        lines: function () {
          return G.term([
            ['df.write.format("delta").mode("append").option("mergeSchema", "true").saveAsTable("silver_evo")', ''],
            ['spark.table("silver_evo").columns', SE.columns_after.join(', ')],
            ['SELECT count(*) FROM silver_evo WHERE channel IS NULL;   -- the old rows', String(SE.old_rows_have_null_channel)],
            ['SELECT count(*) FROM silver_evo WHERE channel = "app";   -- the new rows', String(SE.new_rows)]
          ]);
        },
        after: 'The table gained a column, `channel`, and the **' + n(SE.old_rows_have_null_channel) + '** existing rows read it as **NULL**. The schema changed in the log, and no data file was rewritten. Allow it when a producer **adds** a column on purpose. Do not set it on a job that nobody reviews, as the next screen shows.',
        afterKind: 'warn',
        doneSay: 'mergeSchema adds a column. Old rows are NULL there.'
      }),

      B.bug({
        id: 'm5-bug', t: 1, q: 'A nightly job writes to silver with `mergeSchema` switched on "so that it never fails". One week later the table has a strange column. Click the line that lets that happen.',
        file: 'nightly_write.py', lang: 'python',
        code: 'df = good.withColumnRenamed("customer_id", "custmer_id")    # a typo in a rename\n(\n    df.write.format("delta")\n    .mode("append")\n    .option("mergeSchema", "true")\n    .saveAsTable("silver_orders")\n)\n',
        bad: [5],
        hint: 'What does Delta do with a column that the table does not have?',
        why: 'With `mergeSchema` the write **adds** the column that it does not find, so the typo became a new column and `customer_id` was left empty for the new rows. The recording shows the same mechanism: the table got a column and **' + n(SE.old_rows_have_null_channel) + '** rows read it as NULL. Without the option the write is refused with `' + SM.condition + '`, which is the failure that you want. Evolve the schema in a **reviewed change**, not in the nightly job.',
        fix: 'df = good\n(\n    df.write.format("delta")\n    .mode("append")\n    .saveAsTable("silver_orders")      # a schema mismatch fails the job, and a person decides\n)\n',
        cheer: 'Let a mismatch fail.'
      }),

      B.term({
        id: 'm5-type', t: 1, src: 'rec', title: 'A column of the wrong type is refused too',
        say: 'I appended a row whose amount is the text "free" to silver, where the amount is a decimal.',
        lines: function () { return G.plain(X('schema.type_error')); },
        after: 'Delta checks **names and types**. The write was refused with `' + STE.condition + '` and silver kept its **' + n(STE.rows_after) + '** rows. This is a gate that works with no code of yours. The next gate is one that you write.',
        afterKind: 'tip',
        doneSay: 'A wrong type is refused.'
      }),

      B.term({
        id: 'm5-check', t: 1, src: 'rec', title: 'Constraints: a rule that the table enforces',
        say: 'I added a CHECK constraint to a copy of silver, and then tried to insert an order with a negative amount. On silver itself I tried a row with no order id, which the table declares NOT NULL.',
        lines: function () {
          return G.plain(X('schema.check_error')).concat(G.term([['INSERT INTO silver_orders VALUES (NULL, 1, "C-001", ...);   -- order_id is NOT NULL', 'refused: ' + SK.not_null_condition]]));
        },
        after: 'Both rows were refused (`' + SK.check_condition + '`, `' + SK.not_null_condition + '`), and the table held **' + n(SK.rows_after_failed_insert) + '** rows afterwards. A constraint puts the rule **in the table**, so every writer meets it: a notebook, a pipeline, a person. Adding a CHECK constraint also raised the writer protocol version of the table from **' + SK.protocol_before + '** to **' + SK.protocol_after_check + '**, so check which engines can still write to it.',
        afterKind: 'tip',
        doneSay: 'A constraint refuses a bad row for every writer.'
      }),

      B.widget({ id: 'm5-lab', kind: 'fileslab', t: 1, src: 'rec', title: 'Lab: small files, OPTIMIZE and VACUUM' }),

      B.term({
        id: 'm5-small', t: 1, src: 'rec', title: 'Forty small writes make forty small files',
        say: 'A job that loads a little data often does this. I inserted 100 rows forty times into a table, one insert for each commit.',
        lines: function () {
          return G.term([
            ['DESCRIBE DETAIL events_small;   -- numFiles, sizeInBytes', FS.files + ' files, ' + n(FS.bytes) + ' bytes (about ' + n(FS.avg_bytes_per_file) + ' bytes for each file)'],
            ['ls Tables/events_small/_delta_log | grep -c json', String(FS.json_commits)],
            ['ls Tables/events_small/_delta_log | grep checkpoint', FS.checkpoints.map(function (c) { return c; }).join('\n')]
          ]);
        },
        after: 'Every query has to **open all ' + FS.files + ' files** to read ' + n(FS.rows) + ' rows, and the log has ' + FS.json_commits + ' commits. The log writes a **checkpoint** every ten commits so that readers do not replay all of it. This is the **small files problem**, and it is the most common reason that a lakehouse table gets slower with time.',
        afterKind: 'warn',
        doneSay: 'Many small writes make many small files.'
      }),

      B.term({
        id: 'm5-optimize', t: 1, src: 'rec', title: 'OPTIMIZE: compact the small files',
        say: 'I ran `OPTIMIZE` on the table and looked at the table and at the folder.',
        lines: function () {
          return G.term([
            ['OPTIMIZE events_small;', 'files removed: ' + FO.files_removed + ', files added: ' + FO.files_added],
            ['DESCRIBE DETAIL events_small;   -- the files the table lists now', FO.files_after + ' file, about ' + Math.round(FO.bytes_after / 1024) + ' kB, ' + n(FO.rows_after) + ' rows'],
            ['ls Tables/events_small | grep -c parquet   -- the files in the folder', String(FO.parquet_files_in_folder)]
          ]);
        },
        after: '`OPTIMIZE` rewrote **' + FO.files_removed + '** small files into **' + FO.files_added + '** file, and the same ' + n(FO.rows_after) + ' rows now take about ' + Math.round(FO.bytes_after / 1024) + ' kB instead of ' + Math.round(FS.bytes / 1024) + ' kB (the size of the new file varies a little between recordings). It is a **new version** (' + FO.version + ') whose operation is `' + FO.operation + '`, and it changes no data. The folder still holds **' + FO.parquet_files_in_folder + '** files, because versions 0 to 40 still need the old ones. **Space is not freed until a vacuum.**',
        afterKind: 'tip',
        doneSay: 'OPTIMIZE compacts. It does not free space yet.'
      }),

      B.term({
        id: 'm5-vacuum', t: 1, src: 'rec', title: 'VACUUM: remove the files that no version needs',
        say: 'I tried three things: a vacuum with the default retention, a vacuum with zero hours, and then the same zero hours with the safety check switched off.',
        lines: function () {
          return G.term([
            ['VACUUM events_small DRY RUN;   -- the default retention is 7 days', FVD.rows ? String(FVD.rows) + ' rows' : '(no rows: every file is newer than 7 days)'],
            ['VACUUM events_small RETAIN 0 HOURS;', X('files.vacuum_check').split('\n').slice(1).join('\n')],
            ['SET spark.databricks.delta.retentionDurationCheck.enabled = false;  VACUUM events_small RETAIN 0 HOURS;', 'folder: ' + FV.parquet_files_after + ' file left']
          ]);
        },
        after: 'The default vacuum removed **nothing**, because the files are minutes old and the retention is **7 days**. A vacuum with zero hours is **refused** by a safety check: a writer that is running right now may still need those files. With the check switched off it deleted **' + (FO.parquet_files_in_folder - 1) + ' files** and left **' + FV.parquet_files_after + '**. The latest version reads fine, and the versions that needed the deleted files do not.',
        afterKind: 'warn',
        doneSay: 'VACUUM frees space and ends the history behind it.'
      }),

      B.term({
        id: 'm5-travel', t: 1, src: 'rec', title: 'What a vacuum does to time travel',
        say: 'After the vacuum I tried to read the table as of version 5.',
        lines: function () { return G.plain(X('files.timetravel_error')); },
        after: 'The error is `' + TE.condition + '`: the log still lists version 5, and the data files under it are gone. The version of the `OPTIMIZE` and the latest version still read. So the retention period is **the length of the history that you can promise**. Keep the default of 7 days, or more, and never switch off the check in a job.',
        afterKind: 'warn',
        doneSay: 'The retention period is the history you can promise.'
      }),

      B.cmp({
        id: 'm5-fabric', t: 2, src: 'docs', title: 'Maintenance in Fabric',
        say: 'In Fabric you can run the same commands, and the platform also offers its own way. Press Next to compare them.',
        cols: ['', 'In a notebook', 'In the lakehouse (table maintenance)'],
        hl: 1,
        rows: [
          ['What runs', '`OPTIMIZE` and `VACUUM` statements that you write', 'A maintenance feature of the lakehouse for tables, with options such as V-Order and the retention period'],
          ['Schedule', 'A pipeline or a notebook schedule that you set', 'Run on demand or through a job that you set up. Check the current options'],
          ['Control', 'Full: per table, with your own order and conditions', 'Simple: choose the tables and the options'],
          ['Good for', 'Tables with different needs, and maintenance in code review', 'A quick start and tables with the same needs']
        ],
        steps: [
          { upto: 2, say: 'The commands are the same, because the tables are Delta. What differs is who writes the job and where the schedule lives.' },
          { upto: 4, say: 'I did not run the lakehouse feature, so this is from documentation, and the README lists it for a second look. The notebook version is what the next screen shows.' }
        ]
      }),

      B.code({
        id: 'm5-maint', t: 1, src: 'rec', title: 'The weekly maintenance notebook', file: '04_maintenance.py', lang: 'python', code: MAINT,
        steps: [
          { say: 'A small notebook for a weekly schedule. I ran it on the tables of the recording. Press Next.', lines: null },
          { say: 'It loops over the tables of the course. Add a table here when you add a table to the lakehouse.', lines: G.span(MAINT, /for table in/) },
          { say: '`OPTIMIZE` first: it compacts small files. A table with one file, such as gold, has nothing to do.', lines: G.span(MAINT, /OPTIMIZE/) },
          { say: '`VACUUM` with **no retention given**, which means the default of 7 days. The comment is there so that nobody changes it without reading it.', lines: G.span(MAINT, /VACUUM/) }
        ],
        note: 'In the recording silver went from ' + MT.silver_orders.files_before + ' files to ' + MT.silver_orders.files_after + ', bronze from ' + MT.bronze_orders.files_before + ' to ' + MT.bronze_orders.files_after + ', and the folders still held the old files, because the vacuum kept everything of the last 7 days.'
      }),

      B.widget({ id: 'm5-part', kind: 'partlab', t: 1, src: 'rec', title: 'Lab: partition by what?' }),

      B.term({
        id: 'm5-plan', t: 2, src: 'rec', title: 'What a partition buys: a query that skips files',
        say: 'I asked for one day from the table that is partitioned by the order date, and looked at the plan.',
        lines: function () { return G.plain(X('partition.plan')); },
        after: 'The plan has **`PartitionFilters`** on `order_date`: Spark reads only the folder of that day, **1 of ' + PP.files_total + '** files, and returned ' + n(PP.rows_for_the_day) + ' rows. That is the whole benefit. It needs queries that **filter on the partition column**, and a column with **few values** and a lot of data in each, such as a date. A partition column that no query filters on only adds folders.',
        afterKind: 'tip',
        doneSay: 'A partition pays when queries filter on it.'
      }),

      B.cmp({
        id: 'm5-rules', t: 2, src: 'rec', title: 'When to partition a Delta table',
        say: 'The recording gives a way to reason about it. Press Next to read the rules.',
        cols: ['Question', 'Answer from the recording'],
        hl: 1,
        rows: [
          ['How many files does a partition make?', 'At least one for each value: ' + PL[1][2] + ' for the date, ' + PL[2][2] + ' for the store, ' + PL[3][2] + ' for the customer'],
          ['How big is each file?', 'About ' + n(PL[1][4]) + ' bytes for the date and ' + n(PL[3][4]) + ' for the customer, for 10,000 rows'],
          ['When does it help?', 'A filter on the partition column reads one folder: 1 of ' + PP.files_total + ' files'],
          ['When does it hurt?', 'A column with many values: the customer made ' + PL[3][2] + ' files of about ' + (10000 / PL[3][2]) + ' rows each']
        ],
        steps: [
          { upto: 2, say: 'Count the files before you choose. The number of partitions is the lower bound of the number of files, and every file is overhead.' },
          { upto: 4, say: 'Partition a table when it is **big**, a column has **few values**, and queries **filter** on it. For anything smaller, compact files with `OPTIMIZE` and let the statistics in the log skip files.' }
        ]
      }),

      B.term({
        id: 'm5-restore', t: 1, src: 'rec', title: 'A bad overwrite, and RESTORE',
        say: 'Somebody loaded a file of 500 lines into silver with `overwrite`. The table kept 500 rows. I looked at its history, and restored it.',
        lines: function () {
          return G.term([
            ['DESCRIBE HISTORY silver_rst;   -- version | operation | rows after', RH.map(function (r) { return r[0] + ' | ' + r[1] + ' | ' + n(r[2]); }).join('\n')],
            ['RESTORE TABLE silver_rst TO VERSION AS OF 0;', 'restored files: ' + RS.restored_files + ', removed files: ' + RS.removed_files],
            ['SELECT count(*) FROM silver_rst;', String(RS.rows_after_restore)]
          ]);
        },
        after: 'The overwrite left **' + n(RS.rows_after_bad_overwrite) + '** rows, and the restore brought back **' + n(RS.rows_after_restore) + '**. The restore is **a new version** (version 2): the history now says what happened, in order. It needs the files of the old version, so it works while they exist, and it is **not a backup**: it lives in the same storage as the table.',
        afterKind: 'tip',
        doneSay: 'RESTORE undoes a write and is itself a version.'
      }),

      B.quiz({
        id: 'm5-q1', t: 1,
        q: 'A nightly job appends a DataFrame with a column that silver does not have. What happens without `mergeSchema`?',
        opts: [
          { t: 'The write is refused with a schema mismatch and the table is unchanged', fb: '' },
          { t: 'The column is added automatically', fb: 'Only with `mergeSchema`. Without it, the write is refused.' },
          { t: 'The extra column is dropped and the rest is written', fb: 'Delta does not drop columns silently.' },
          { t: 'The table is overwritten', fb: 'Append never overwrites.' }
        ],
        ok: 0, why: 'The recording: `' + SM.condition + '`, and the table still held ' + n(SM.rows_after_failed_append) + ' rows.'
      }),

      B.quiz({
        id: 'm5-q2', t: 1,
        q: 'After `OPTIMIZE` of a table that had forty small files, how many Parquet files are in the folder in the recording?',
        opts: [
          { t: String(FO.parquet_files_in_folder) + ': the new file and the forty old ones', fb: '' },
          { t: '1: the old files are deleted at once', fb: 'That happens only after a VACUUM.' },
          { t: '40: nothing changed in the folder', fb: 'One new file was added.' },
          { t: '0', fb: 'The table still has data.' }
        ],
        ok: 0, why: 'The table lists **' + FO.files_after + '** file, and the folder holds ' + FO.parquet_files_in_folder + ' because older versions still need the others. A vacuum removes them.'
      }),

      B.quiz({
        id: 'm5-q3', t: 1,
        q: 'You run `VACUUM events_small` with no options on a table that was written ten minutes ago. How many files does it delete?',
        opts: [
          { t: 'None: the default retention is 7 days', fb: '' },
          { t: 'All files of the old versions', fb: 'That needs a retention of zero hours.' },
          { t: 'All files', fb: 'It would delete the table.' },
          { t: 'It refuses with an error', fb: 'The default retention passes the safety check.' }
        ],
        ok: 0, why: 'The dry run listed ' + FVD.rows + ' files. Only files older than the retention period that no current version needs are removed.'
      }),

      B.quiz({
        id: 'm5-q4', t: 2,
        q: 'Which partition column would you choose for a table of daily order files, in the recording?',
        opts: [
          { t: 'The order date: 5 partitions, and queries filter by day', fb: '' },
          { t: 'The customer: 400 partitions of about 25 rows', fb: 'It made ' + PL[3][2] + ' files of about ' + n(PL[3][4]) + ' bytes each.' },
          { t: 'The order id', fb: 'Every row would get its own file.' },
          { t: 'No partition at all, always', fb: 'Right for a small table. A big table that is filtered by day gains from the date.' }
        ],
        ok: 0, why: 'The date had ' + PL[1][2] + ' files of about ' + n(PL[1][4]) + ' bytes, and a filter on it read 1 of ' + PP.files_total + ' files.'
      }),

      B.order({
        id: 'm5-ord', t: 1, q: 'Put the steps in order to undo a bad overwrite and get back to a healthy table.',
        items: ['Look at `DESCRIBE HISTORY` and find the version before the overwrite', '`RESTORE TABLE ... TO VERSION AS OF` that version', 'Check the row count against the number that you expect', 'Find out why the overwrite ran, and fix the job', 'Check that the retention is long enough to make the next restore possible'],
        why: 'History first, then the restore, then the check. The restore only works while the old files exist, which is why the retention matters.'
      }),

      B.decide({
        id: 'm5-dec', t: 2, src: 'rec', title: 'Decision: partition the silver orders table?',
        scenario: 'Silver has 10,000 orders today and will have about 3 million in a year. Most reports filter on the order date. A few filter on the store. Nobody filters on the customer.',
        opts: [
          { t: 'Do not partition now. Compact with `OPTIMIZE`, and revisit when a table is big enough that a date filter skips whole folders', d: 'No overhead, and the statistics in the log already let a reader skip files whose date range does not match.', lose: 'A report that filters on the date reads more files than it needs once the table is large.' },
          { t: 'Partition by the order date from the start', d: 'A filter on the date reads one folder. The recording: 1 of ' + PP.files_total + ' files.', lose: 'At 10,000 rows each partition is about ' + n(PL[1][4]) + ' bytes, so the files are tiny, and a late file makes a small file in an old partition.' },
          { t: 'Partition by the store, because it has 12 values', d: 'Few values.', lose: 'Only a minority of reports filter on it, and every new store adds a folder.' },
          { t: 'Partition by the customer', d: 'A report on one customer reads one folder.', lose: 'The recording: ' + PL[3][2] + ' files of about ' + n(PL[3][4]) + ' bytes each.' }
        ],
        pick: 0,
        why: 'Partitioning is a cost that you pay for every table, and a benefit that appears only when the table is big and the filter matches. The date is the right column when the time comes, and today the table is small. This is a judgement, and I would say the numbers that would change it.',
        when: 'A table of hundreds of millions of rows that is filtered by day should be partitioned by day.'
      }),

      B.incident({
        id: 'm5-inc', t: 2, src: 'rec', title: 'Incident: a dashboard got slower every week for a month', time: '11:20',
        alert: '**A dashboard that reads the events table took 3 seconds a month ago and takes 40 now.** The table has the same number of rows. A pipeline appends a small batch every five minutes, and nobody has run maintenance on it.',
        clues: ['The log has thousands of commits and the table lists thousands of files', 'The files are a few kilobytes each', 'No `OPTIMIZE` or `VACUUM` job exists'],
        opts: [
          { t: 'Run `OPTIMIZE` on the table, add it and `VACUUM` to a weekly schedule, and consider batching the writes', fb: '' },
          { t: 'Add a partition on the event id', fb: 'It would make more and smaller files.' },
          { t: 'Double the capacity', fb: 'The queries are slow because of the number of files, not the size of the capacity.' },
          { t: 'Delete the old versions by hand', fb: 'Never delete data files by hand. The log would still list them.' }
        ],
        best: 0,
        why: 'The recording: forty inserts made **' + FS.files + '** files of about ' + n(FS.avg_bytes_per_file) + ' bytes, and `OPTIMIZE` made them **' + FO.files_added + '** file. A table that is written in small batches without maintenance gets slower in proportion to the number of its files.',
        checks: [
          ['Count the files', '`DESCRIBE DETAIL` shows `numFiles` and the size.'],
          ['Look at the writes', 'A small batch every five minutes is a small file every five minutes.'],
          ['Compact', '`OPTIMIZE`, then `VACUUM` on a schedule.'],
          ['Reduce the cause', 'Write bigger batches less often if the freshness allows.']
        ],
        tell: 'The table is written in small batches, so it has thousands of tiny files and every query opens all of them. I compacted it with OPTIMIZE and added a weekly maintenance notebook with OPTIMIZE and VACUUM. I will also look at writing larger batches.',
        prevent: ['Schedule **OPTIMIZE and VACUUM**', '**Alert** on the number of files of the big tables', 'Prefer **bigger, rarer** writes when the freshness allows']
      }),

      B.qa({
        id: 'qa-schema', t: 1, tag: 'Fabric', secs: 75,
        q: 'How does Delta Lake handle a schema change in a write?',
        pts: ['Enforcement: a mismatch is refused', 'Evolution: mergeSchema adds columns', 'Constraints: CHECK and NOT NULL', 'Evolve in a reviewed change'],
        short: 'By default Delta **enforces** the schema: a write whose columns or types do not fit is refused, with an error that names the mismatch, and the table is unchanged. In my recording a write with an extra column and a write with a text amount were both refused, and the table kept its 10,000 rows. With the `mergeSchema` option the write adds the new column, and old rows read it as NULL. I keep that for a reviewed change, because on a nightly job a typo in a column name becomes a new column. For rules about values I use constraints: a CHECK constraint on the amount and NOT NULL on the key refused bad rows for every writer. A new constraint raised the writer protocol version, so I check which engines can still write.',
        fu: [['Can you drop or rename a column?', 'With column mapping enabled. Check the version and the engines.'], ['Does evolution rewrite files?', 'No, the log changes and old files stay.']],
        trap: 'Switching mergeSchema on everywhere.',
        real: 'Describe a schema change that you made safely.'
      }),

      B.qa({
        id: 'qa-optimize', t: 1, tag: 'Fabric', secs: 75,
        q: 'What is the small files problem, and how do you fix it?',
        pts: ['Many small writes make many small files', 'Every query opens every file', 'OPTIMIZE compacts them into bigger files', 'VACUUM then frees the old ones'],
        short: 'Every write to a Delta table adds at least one file, so a job that writes small batches often makes thousands of tiny files. A query has to open each of them, and the log grows with each commit, so the table gets slower while the data stays the same size. In my recording forty inserts of 100 rows made forty files of about 1.6 kB each. `OPTIMIZE` rewrote them into one file and the same rows took 18 kB instead of 66 kB. It is a new version that changes no data, and the old files stay in the folder until `VACUUM` removes the ones that no version in the retention period needs. I schedule both weekly, and I also ask whether the writes can be bigger and rarer.',
        fu: [['Does OPTIMIZE lock the table?', 'No. Readers keep reading the version they started with.'], ['What is a good file size?', 'Larger than a few megabytes for big tables. Check the documentation for the engine.']],
        trap: 'Running OPTIMIZE and thinking the space is free.',
        real: 'Describe a table that got slow with time.'
      }),

      B.qa({
        id: 'qa-vacuum', t: 1, tag: 'Fabric', secs: 60,
        q: 'What does VACUUM do, and what is the risk?',
        pts: ['Deletes files that no version in the retention needs', 'The default retention is 7 days', 'It ends time travel beyond the retention', 'A zero retention can break a running writer'],
        short: '`VACUUM` deletes data files that no current version uses and that are older than the retention period, 7 days by default. It frees space, and it ends the history behind it: in my recording, after a vacuum with zero hours reading version 5 failed with a file-not-found error, while the latest version read fine. The retention is the length of history that I can promise, so I keep it at the default or longer. A retention below the default is refused by a safety check, because a writer that is running now might still need the files. I would not switch that check off in a job, and I never delete data files by hand.',
        fu: [['Does it change the log?', 'The log is separate and has its own retention.'], ['How do you free space faster?', 'Shorter retention, with eyes open about the history you lose.']],
        trap: 'Vacuuming with zero hours to save space.',
        real: 'Say what history your team relies on.'
      }),

      B.qa({
        id: 'qa-partition', t: 2, tag: 'Fabric', secs: 75,
        q: 'When do you partition a Delta table?',
        pts: ['Big tables, few values, filtered columns', 'Each value makes at least one file', 'Too many values make small files', 'Otherwise OPTIMIZE and statistics'],
        short: 'Only when the table is big, the column has few values, and queries filter on it, usually a date. A partition is a folder and holds at least one file for each value, so the number of values is the lower bound of the number of files. In my recording 10,000 rows partitioned by date made 5 files, by store 12, and by customer 400 files of about 25 rows each, which is the small files problem made by a partition column. The date partition let a filter on one day read 1 of 5 files, with `PartitionFilters` in the plan. For a table that is not yet big I do not partition, I compact with `OPTIMIZE`, and I let the file statistics in the log skip files. I would partition when the numbers show a gain.',
        fu: [['What about Z-order or liquid clustering?', 'They organize data inside files for several columns. Check what the runtime supports.'], ['Can you change it later?', 'Yes, by rewriting the table.']],
        trap: 'Partitioning by a column with many values.',
        real: 'Describe a table where partitioning helped or hurt.'
      }),

      B.qa({
        id: 'qa-restore', t: 2, tag: 'Fabric', secs: 60,
        q: 'Someone overwrote a table with the wrong data. What do you do?',
        pts: ['DESCRIBE HISTORY: find the version', 'RESTORE TABLE TO VERSION AS OF', 'A restore is a new version', 'It needs the old files: mind the retention'],
        short: 'I look at `DESCRIBE HISTORY` to find the version before the overwrite, and run `RESTORE TABLE ... TO VERSION AS OF` that version. In my recording an overwrite left 500 rows of 10,000, and the restore brought back all 10,000. The restore is itself a new version, so the history shows what happened, in order. It only works while the data files of that version exist, so it depends on the retention: after a vacuum it is too late. It is not a backup, because it lives in the same storage as the table, so I also keep the landing files and copies of what matters. Then I find out why the overwrite ran.',
        fu: [['What if the files are gone?', 'Rebuild from bronze or from the landing files.'], ['Can you restore by time?', 'Yes, `TIMESTAMP AS OF`.']],
        trap: 'Treating RESTORE as a backup.',
        real: 'Describe how you recovered from a bad write.'
      }),

      B.recap({
        id: 'm5-recap', n: 5, badge: 'Table Keeper', color: '#BBF7D0',
        pts: [
          'Delta **enforces the schema**: an extra column or a wrong type was refused and left **' + n(SM.rows_after_failed_append) + '** rows. `mergeSchema` adds a column and old rows read NULL.',
          '**Constraints** refuse a bad row for every writer. A CHECK constraint raised the protocol from ' + SK.protocol_before + ' to ' + SK.protocol_after_check + '.',
          'Forty writes made **' + FS.files + '** files. `OPTIMIZE` made **' + FO.files_added + '**, and the folder still held ' + FO.parquet_files_in_folder + ' until `VACUUM`.',
          '`VACUUM` keeps **7 days** by default. With zero hours version 5 could not be read.',
          'Partition only a big table, by a column with few values that queries filter on. `RESTORE` undid an overwrite of 10,000 rows.'
        ],
        lines: [
          'I can say what enforcement and a constraint do.',
          'I can fix the small files problem and say what it costs.',
          'I can undo a bad write.'
        ]
      })
    ]
  });
})();
