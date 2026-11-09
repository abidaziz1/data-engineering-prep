/* Mission 4: layout. Small files, OPTIMIZE, data skipping, partitions, Z-order, liquid clustering, VACUUM.
   File counts, scan counts, errors and log entries are recorded from open-source Delta Lake. The advice about what to choose comes from documentation and is marked. */
(function () {
  var B = LAB.b, G = LAB.get;
  var SB = G.counts('layout.small_before'), SA = G.counts('layout.small_after'), SOPS = G.counts('layout.small_operations'), SO = G.counts('layout.small_optimize');
  var SMALLW = G.history('layout.small_history').filter(function (r) { return r.operation === 'WRITE'; })[0];
  var PART = G.counts('layout.partitioning');
  var Z = G.counts('layout.zorder'), ZH = G.history('layout.zorder')[0];
  var LQ = G.counts('layout.liquid_optimize'), LB = G.counts('layout.liquid_before'), LA = G.counts('layout.liquid_after'), LS = G.counts('layout.liquid_scan');
  var VB = G.counts('layout.vacuum_before'), VA = G.counts('layout.vacuum_after'), VD = G.counts('layout.vacuum_dry_default_retention'), VZ = G.counts('layout.vacuum_dry_zero_retention');
  var VH = G.history('layout.vacuum'), VS = VH.filter(function (r) { return r.operation === 'VACUUM START'; })[0];
  var ERR_RET = G.text('layout.err_vacuum_retention'), ERR_TT = G.text('layout.err_time_travel_after_vacuum');
  var CLUSTER_DOMAIN = G.commitText('layout.liquid', 0, { kinds: ['domainMetadata', 'protocol'] });
  var SMALL_ROWS = SOPS.WRITE * parseInt(SMALLW.operationMetrics.numOutputRows, 10);
  G.expect(SB.numFiles === 40 && SA.numFiles === 1 && SO.numFilesRemoved === 40, '40 small files become 1');
  G.expect(Z.total_files_before === 16 && Z.scan_files_before === 16 && Z.scan_files_after === 1, 'Z-order lets the filter read 1 file instead of 16');
  G.expect(LS.scan_files === 1 && LQ.numFilesRemoved === 16, 'liquid clustering reads 1 of its files');
  G.expect(Z.files_before.every(function (f) { return f.min === 'C-0000' && f.max === 'C-1999'; }), 'before the Z-order every file spans every customer');
  G.expect(VB.files_in_folder === 3 && VB.files_in_snapshot === 1 && VA.files_in_folder === 1 && VD.files_to_delete === 0, 'vacuum numbers');
  var kb = function (n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : (n / 1024).toFixed(1) + ' KB'; };
  var n0 = function (n) { return Math.round(n).toLocaleString('en-US'); };

  var OPT_SQL = ['OPTIMIZE orders_small;'].join('\n');
  var ZORDER_SQL = ['OPTIMIZE orders_big', 'ZORDER BY (customer_id);'].join('\n');
  var LIQUID_SQL = [
    'CREATE TABLE lc_orders (order_id BIGINT, customer_id STRING, qty INT)',
    'USING DELTA',
    'CLUSTER BY (customer_id);',
    '',
    'OPTIMIZE lc_orders;'
  ].join('\n');
  var VACUUM_SQL = [
    'VACUUM orders DRY RUN;',
    '',
    'VACUUM orders RETAIN 0 HOURS;'
  ].join('\n');
  var TT_CODE = [
    '(spark.read.format("delta")',
    '      .option("versionAsOf", 0)',
    '      .load(path)',
    '      .collect())'
  ].join('\n');
  var BUG = [
    'SET spark.databricks.delta.retentionDurationCheck.enabled = false;',
    'VACUUM orders RETAIN 0 HOURS;'
  ].join('\n');
  var BUGFIX = 'VACUUM orders;';

  LAB.addChapter({
    id: 'm4', n: 4, title: 'Layout: small files, skipping and cleanup', short: 'Layout', blurb: 'OPTIMIZE, data skipping, partitions, Z-order, liquid clustering and VACUUM', minutes: 40,
    focus: ['mon'],
    goals: [
      'Explain why **many small files** slow a query and fix them with **OPTIMIZE**.',
      'Say how **data skipping** uses the minimum and maximum of each file.',
      'Choose **partitioning**, **Z-order** or **liquid clustering** for a table.',
      'Run **VACUUM** safely and say what it takes away.',
      'Read the two errors that VACUUM can cause.'
    ],
    say: 'Mission 4 is about the files under a table. Two tables with the same rows can differ by 100 times in query speed, because of how the rows sit in files. I built the Brewline orders in several layouts with Delta Lake ' + G.meta('delta') + ', counted the files, and counted how many a query reads. The data is small, so I set the file size limit low to get several files. The advice on what to choose in production comes from documentation, and those screens say so.',
    scenes: [
      B.talk({
        id: 'm4-talk', t: 1, src: 'rec', title: 'Why the layout of files matters',
        say: 'Four facts explain this mission. Press Next for each.',
        items: [
          ['A file costs time to open', 'To read a table, Spark lists the files, opens each one and reads its footer before it reads any data. Forty tiny files cost forty opens for a few thousand rows.', 'Per-file cost, not per-byte cost.'],
          ['Statistics let a query skip files', 'The log holds the smallest and largest value of each column for every file. A query with a filter skips every file whose range cannot hold the value. You saw these numbers in mission 3.', 'The log tells Spark what a file cannot contain.'],
          ['The layout decides how much can be skipped', 'If every file covers the full range of a column, no file can be skipped. If each file covers a narrow range, most files are skipped. The same rows give a different result.', 'Group similar values in the same file.'],
          ['Layout work costs compute', '`OPTIMIZE` rewrites files and bills compute for it. `VACUUM` deletes old files. You pay once to make many reads cheaper, so the table should be read more often than it is rewritten.', 'A trade between write cost and read cost.']
        ],
        cols: 2
      }),

      B.sql({
        id: 'm4-small', t: 1, src: 'rec', title: 'Small files and OPTIMIZE', file: 'sql editor', code: OPT_SQL,
        result: {
          cols: ['what I counted', 'before OPTIMIZE', 'after OPTIMIZE'],
          rows: [
            ['data files in the table', String(SB.numFiles), String(SA.numFiles)],
            ['total size', kb(SB.sizeInBytes), kb(SA.sizeInBytes)],
            ['average file size', kb(SB.sizeInBytes / SB.numFiles), kb(SA.sizeInBytes / SA.numFiles)],
            ['rows in the table', n0(SMALL_ROWS), n0(SMALL_ROWS)],
            ['commits in the log', SOPS.WRITE + ' writes', SOPS.WRITE + ' writes and ' + SOPS.OPTIMIZE + ' OPTIMIZE']
          ],
          msg: SO.numFilesRemoved + ' files compacted into ' + SO.numFilesAdded, trk: 0
        },
        steps: [
          { say: 'A job appended 50 orders every minute. I simulated 40 of those appends. Each one wrote its own small Parquet file.', lines: null },
          { say: 'This is how small files appear in real life: a stream with a short trigger, a job that writes often, or a shuffle with too many partitions. Mission 2 showed 200 files from one grouping.', lines: null },
          { say: '`OPTIMIZE` reads the small files and writes bigger ones. Press Run.', lines: [1, 1], run: true },
          { say: 'Forty files became one. The rows did not change: ' + n0(SMALL_ROWS) + ' before and after. The table is now one file, so a query opens one file instead of forty.', lines: [1, 1], run: true }
        ],
        note: 'The default target size for OPTIMIZE is much larger than this toy table, about 1 GB per file in Delta Lake (documentation). On a real table, you compact thousands of small files into a few hundred large ones. The old small files stay in the folder until VACUUM removes them.'
      }),

      B.cmp({
        id: 'm4-parts', t: 1, src: 'rec', title: 'Partitioning can create small files too',
        say: 'A partition is a folder per value of a column. A query that filters on that column skips whole folders. But every folder needs its own files. I wrote the same 100,000 rows three ways. Press Next to compare.',
        cols: ['Layout', 'Partition values', 'Files', 'Average file', 'Verdict'],
        hl: 4,
        rows: [
          ['No partitions', '1', String(PART.none.numFiles), kb(PART.none.avg_file_bytes), 'One file. Fine for a table this small.'],
          ['Partitioned by a column with 3 values', String(PART.bucket3.partition_values), String(PART.bucket3.numFiles), kb(PART.bucket3.avg_file_bytes), 'Three folders, each with a usable file.'],
          ['Partitioned by a column with 100 values', String(PART.cust100.partition_values), String(PART.cust100.numFiles), kb(PART.cust100.avg_file_bytes), 'One hundred tiny files. Every query pays 100 opens.']
        ],
        steps: [
          { upto: 1, say: 'Without partitions the 100,000 rows became one file of ' + kb(PART.none.avg_file_bytes) + '.' },
          { upto: 2, say: 'Three partition values gave three files of about ' + kb(PART.bucket3.avg_file_bytes) + ' each. A filter on that column reads one of the three.' },
          { upto: 3, say: 'One hundred values gave one hundred files of about ' + kb(PART.cust100.avg_file_bytes) + '. The data is the same. The layout multiplied the number of files by 100.' }
        ],
        pick: 'Partition only by a column with **few values**, that most queries filter on, and where each partition holds **a lot of data**. A customer id is almost never a good partition column.'
      }),

      B.talk({
        id: 'm4-skip-talk', t: 1, src: 'rec', title: 'How data skipping reads the statistics',
        say: 'Before the lab, one short recap of the idea. Press Next for each point.',
        items: [
          ['The log knows the range of every file', 'Each file has a minimum and a maximum for `customer_id`. After the Z-order in this recording, one file holds `' + Z.files_after[0].min + '` to `' + Z.files_after[0].max + '`, and the next holds `' + Z.files_after[1].min + '` to `' + Z.files_after[1].max + '`.', 'A range for each file.'],
          ['A filter is compared with the ranges', 'For `customer_id = \'C-0420\'`, a file can hold the value only if its minimum is at most `C-0420` and its maximum is at least `C-0420`. Spark opens only those files.', 'Skip a file when the value is outside its range.'],
          ['Narrow ranges skip more', 'Before layout work, each of the 16 files spans `C-0000` to `C-1999`. Every file can hold every customer, so Spark opens all 16. In the lab you will see the difference.', 'Skipping depends on the layout.']
        ],
        cols: 1
      }),

      B.widget({ id: 'm4-skip-lab', kind: 'skipping', t: 1, src: 'rec', title: 'Lab: how many files does a filter read?' }),

      B.sql({
        id: 'm4-zorder', t: 1, src: 'rec', title: 'OPTIMIZE ZORDER: group rows by a column', file: 'sql editor', code: ZORDER_SQL,
        result: {
          cols: ['what I counted', 'before', 'after'],
          rows: [
            ['data files', String(Z.total_files_before), String(Z.total_files_after)],
            ['files a filter on ' + Z.predicate + ' reads', String(Z.scan_files_before), String(Z.scan_files_after)],
            ['rows that match the filter', n0(Z.rows_matching), n0(Z.rows_matching)]
          ],
          msg: Z.numFilesRemoved + ' files removed, ' + Z.numFilesAdded + ' added', trk: 1
        },
        steps: [
          { say: 'The table holds 400,000 orders from 2,000 customers, in 16 files. Each file got a random slice of all customers.', lines: null },
          { say: '`ZORDER BY (customer_id)` rewrites the files so that rows with nearby customer ids sit in the same file. It combines compaction with a sort.', lines: [1, 2] },
          { say: 'Press Run. The filter for one customer read **' + Z.scan_files_before + ' of ' + Z.total_files_before + '** files before. After the Z-order it reads **' + Z.scan_files_after + '**. The result is the same ' + Z.rows_matching + ' rows. Spark read about one sixteenth of the files.', lines: [1, 2], run: true }
        ],
        note: 'I set the maximum file size to 1 MB so that the 3 MB table became ' + Z.total_files_after + ' files and not one. On a real table the files are much bigger. The history row records the parameter: `zOrderBy = ' + ZH.operationParameters.zOrderBy + '`. Z-order works with several columns, but it helps less with each column you add.'
      }),

      B.cmp({
        id: 'm4-choose', t: 2, src: 'docs', title: 'Partitioning, Z-order or liquid clustering',
        say: 'Delta tables have three layout tools. Press Next to compare them. The guidance in the last column is from the Databricks documentation as I read it. Check the current pages before you decide, because the advice has changed over time.',
        cols: ['Tool', 'You declare it with', 'How it keeps the layout', 'Documentation guidance'],
        hl: 3,
        rows: [
          ['Partitioning', '`PARTITIONED BY (order_date)` when you create the table', 'Each write puts rows in the folder of their partition value. The layout is fixed when you create the table.', 'Do not partition tables under 1 TB. Give each partition at least 1 GB. For 1 TB to 100 TB, prefer liquid clustering.'],
          ['Z-order', '`OPTIMIZE t ZORDER BY (col)`', 'You run it, and it rewrites the files. New data stays unordered until the next run.', 'Liquid clustering is recommended over Z-ordering for new tables.'],
          ['Liquid clustering', '`CLUSTER BY (col)` when you create the table, or `ALTER TABLE ... CLUSTER BY`', '`OPTIMIZE` clusters new data incrementally. You can change the keys later without rewriting old data.', 'Recommended for new tables. It cannot be combined with partitioning or Z-order on the same table.']
        ],
        steps: [
          { upto: 1, say: 'Partitioning is the oldest tool. It splits the table into folders, and it cannot change without a rewrite of the whole table.' },
          { upto: 2, say: 'Z-order sorts within the files. It is a maintenance command, so somebody must schedule it.' },
          { upto: 3, say: 'Liquid clustering keeps the layout as a property of the table. The recorded run in the next scene shows it working.' }
        ],
        pick: 'For a **new table**, start with **liquid clustering** on the columns you filter on most. Keep **partitioning** for very large tables with one obvious column, or when you drop whole partitions for retention.'
      }),

      B.sql({
        id: 'm4-liquid', t: 2, src: 'rec', title: 'Liquid clustering: declare it once', file: 'sql editor', code: LIQUID_SQL,
        result: {
          cols: ['what I counted', 'before OPTIMIZE', 'after OPTIMIZE'],
          rows: [
            ['clustering columns', LB.clusteringColumns.join(', '), LA.clusteringColumns.join(', ')],
            ['data files', String(LB.numFiles), String(LA.numFiles)],
            ['files a filter on ' + LS.predicate + ' reads', 'all ' + LB.numFiles + ' can match', LS.scan_files + ' of ' + LS.total_files],
            ['table features', LB.tableFeatures.join(', '), LA.tableFeatures.join(', ')]
          ],
          msg: LQ.numFilesRemoved + ' files removed, ' + LQ.numFilesAdded + ' added', trk: 2
        },
        steps: [
          { say: 'The `CLUSTER BY` clause names the columns. The table stores them as a property, so every job that writes to it follows the same layout.', lines: [1, 3] },
          { say: 'I loaded the same 400,000 orders in 16 files. The data is not clustered yet. Writes alone do not cluster it.', lines: [1, 3] },
          { say: '`OPTIMIZE` clusters the data. Press Run. Sixteen files became ' + LQ.numFilesAdded + ', and the same filter as before reads **' + LS.scan_files + ' of ' + LS.total_files + '**.', lines: [5, 5], run: true }
        ],
        note: 'Clustering adds two table features, `clustering` and `domainMetadata`, and the table needs writer version 7. An old client that does not know these features cannot write to the table. Check this before you cluster a table that other tools use.'
      }),

      B.code({
        id: 'm4-cluster-log', t: 3, src: 'rec', title: 'Where the clustering columns live in the log', file: 'the commit that created the table', lang: 'json', code: CLUSTER_DOMAIN,
        steps: [
          { say: 'The table\'s first commit carries the clustering columns. They are not in the schema. They sit in a separate action.', lines: null },
          { say: 'A `domainMetadata` action stores named settings for a feature. The domain `delta.clustering` holds the clustering columns as JSON. To change the keys, Delta writes a new action with new columns.', lines: G.span(CLUSTER_DOMAIN, /"domainMetadata"/, /^\}/) },
          { say: 'The `protocol` action lists the features a client must support to read or write this table.', lines: G.span(CLUSTER_DOMAIN, /"protocol"/, /^\}/) }
        ]
      }),

      B.sql({
        id: 'm4-vacuum', t: 1, src: 'rec', title: 'VACUUM: delete the files nobody needs', file: 'sql editor', code: VACUUM_SQL,
        result: {
          cols: ['step', 'result'],
          rows: [
            ['before: files in the table folder', String(VB.files_in_folder)],
            ['before: files that the current version uses', String(VB.files_in_snapshot)],
            ['VACUUM DRY RUN at the default of ' + VD.retention_hours + ' hours: files it would delete', String(VD.files_to_delete)],
            ['VACUUM RETAIN 0 HOURS with the safety check on', 'refused by Delta'],
            ['same, with the check switched off for this test: files deleted', VS.operationMetrics.numFilesToDelete],
            ['after: files in the table folder', String(VA.files_in_folder)]
          ],
          msg: 'a dry run lists, a real run deletes', trk: 3
        },
        steps: [
          { say: 'Every overwrite and update leaves files that the current version does not use. The log still points to them, which is why time travel works. They take storage until you delete them.', lines: null },
          { say: '`VACUUM` deletes files that no version inside the retention period needs. `DRY RUN` only lists them. At the default retention of ' + VD.retention_hours + ' hours, which is 7 days, the dry run found **' + VD.files_to_delete + '** files, because my files were minutes old.', lines: [1, 1] },
          { say: 'I then asked for a retention of 0 hours. Delta refused with `DELTA_VACUUM_RETENTION_PERIOD_TOO_SHORT`. The message says a short retention "may corrupt this Delta table if any writes are in progress" and asks for at least 168 hours.', lines: [3, 3] },
          { say: 'For the test only, I switched the check off and ran it. Press Run. It deleted ' + VS.operationMetrics.numFilesToDelete + ' files. The folder went from ' + VB.files_in_folder + ' files to ' + VA.files_in_folder + '. The table kept working.', lines: [3, 3], run: true }
        ],
        note: 'The history records two rows, `VACUUM START` with the number of files to delete, and `VACUUM END`. The recorded refusal reads: ' + ERR_RET.split('\n')[0].replace(/^\[[A-Z_]+\] /, '')
      }),

      B.code({
        id: 'm4-ttfail', t: 1, src: 'rec', title: 'What VACUUM breaks: time travel', file: 'time_travel.py', lang: 'python', code: TT_CODE,
        compiled: { label: 'The error after VACUUM deleted the old files', file: 'error message', lang: 'text', code: ERR_TT },
        steps: [
          { say: 'After the VACUUM, I tried to read version 0 of the same table. The log still lists version 0.', lines: [1, 4] },
          { say: 'The read fails. The error class is `FAILED_READ_FILE.FILE_NOT_EXIST`. The log says which files make up version 0, but VACUUM deleted them.', lines: [1, 4], compiled: true, clines: [1, 1] },
          { say: 'The same happens to `RESTORE`. It needs the old files too. A short retention period is a decision to give up time travel beyond that window.', lines: [1, 4], compiled: true, clines: [1, 2] }
        ],
        note: 'Pick the retention period from your recovery needs: how long can a bad change go unnoticed? The default of 7 days suits many tables. Streaming jobs and long queries also need the files they started with, which is another reason not to go below it.'
      }),

      B.talk({
        id: 'm4-auto', t: 2, src: 'docs', title: 'Let Databricks do the maintenance',
        say: 'You do not have to schedule every OPTIMIZE and VACUUM yourself on Databricks. Press Next for the options. These come from the documentation, and the defaults change, so check what is on in your workspace.',
        items: [
          ['Optimized writes', 'Spark shuffles data before a write so that it writes fewer, larger files. This reduces small files at the source. The documentation says it applies to MERGE, UPDATE and DELETE on Databricks.', 'Fewer files at write time.'],
          ['Auto compaction', 'After a write, Databricks can compact small files in the same table. It is not a replacement for OPTIMIZE. It keeps the small file count low between runs.', 'A light compaction after writes.'],
          ['Predictive optimization', 'For **Unity Catalog managed tables**, Databricks can run OPTIMIZE, VACUUM and ANALYZE for you, without a schedule. It is on by default for accounts created on or after 11 November 2024, and it is being turned on for older accounts. It runs on serverless compute and bills under its own line. It does not run for external tables.', 'The service decides when to run.'],
          ['A scheduled OPTIMIZE', 'For very large tables, over 1 TB, the documentation still recommends a scheduled OPTIMIZE. For external tables you always schedule it yourself.', 'You stay in charge of big and external tables.'],
          ['The VACUUM default', 'Seven days of retention, set with the table property `delta.deletedFileRetentionDuration`. Predictive optimization keeps files for at least that long.', 'Seven days.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'Interview tip.', t: 'Say which of these your team used and what you measured. "We switched on predictive optimization" is weaker than "average file size went from 40 KB to 400 MB".' }
      }),

      B.quiz({
        id: 'm4-q1', t: 1,
        q: 'A streaming job appends a few rows every 10 seconds. After a month the table has 250,000 small files and queries are slow. What is the first fix?',
        opts: [
          { t: 'Run `VACUUM` to delete the old files', fb: 'VACUUM removes files that no version uses. The small files are the current files, so VACUUM does not remove them.' },
          { t: 'Run `OPTIMIZE` to compact the small files, and then keep the files from piling up again', fb: '' },
          { t: 'Add more workers to the cluster that runs the queries', fb: 'More workers do not make opening 250,000 files cheaper. The files are the problem.' },
          { t: 'Partition the table by the time of the write', fb: 'A partition per time value makes more folders and more small files.' }
        ],
        ok: 1, why: '`OPTIMIZE` compacts the small files into big ones. To stop the pile from returning, write less often (a longer trigger), turn on optimized writes and auto compaction, or schedule `OPTIMIZE`. In the recording, 40 small files became one.'
      }),

      B.quiz({
        id: 'm4-q2', t: 2,
        q: 'A new 200 GB orders table is filtered by order date and by customer. Which layout do you choose?',
        opts: [
          { t: 'Partition by `customer_id`', fb: 'With thousands of customers this creates thousands of tiny partitions. The recording showed 100 values give 100 tiny files.' },
          { t: 'Partition by `order_id`', fb: 'Every row would get its own folder.' },
          { t: 'No partitions, and liquid clustering on `order_date` and `customer_id`', fb: '' },
          { t: 'Partition by `status`', fb: 'Status has few values, but the queries do not filter on it, so nothing is skipped.' }
        ],
        ok: 2, why: 'The table is far below 1 TB, so the documentation advises against partitions. Liquid clustering on the two filter columns groups similar values, and you can change the columns later without a full rewrite.'
      }),

      B.bug({
        id: 'm4-bug', t: 2, q: 'A teammate wants to save storage and runs this on the production orders table. Click a line that should not be there.',
        file: 'cleanup.sql', lang: 'sql', code: BUG, bad: [1, 2],
        hint: 'One line switches off a safety check. The other uses a retention that is too short to be safe.',
        why: 'The first line turns off the check that refuses a short retention. The second deletes every file that the current version does not use. Time travel, `RESTORE` and any running job that started before the command can fail with `FILE_NOT_EXIST`, as the recording showed.',
        fix: BUGFIX,
        cheer: 'Spotting a disabled safety check is a senior habit.'
      }),

      B.decide({
        id: 'm4-dec', t: 2, src: 'docs', title: 'Decision: layout for a new 3 TB events table',
        scenario: 'A new events table will reach **3 TB** in a year. Almost every query filters on **event date** and many also filter on **customer id**. There are about 5 million customers. The team wants a layout they can change when the queries change.',
        opts: [
          { t: 'Partition by event date and customer id', d: 'Two levels of folders.', lose: 'With 5 million customers the table gets millions of folders, and each holds tiny files. Listing and opening them costs more than the skipping saves.' },
          { t: 'Partition by event date only', d: 'The classic layout.', lose: 'It works for date filters. A query for one customer still opens every file of each day, and changing the partition column later means rewriting 3 TB.' },
          { t: 'Liquid clustering on event date and customer id', d: 'One table property. `OPTIMIZE` keeps it clustered.' }
        ],
        pick: 2,
        why: 'The documentation recommends liquid clustering for new tables, and for tables between 1 TB and 100 TB it advises it instead of partitioning. Both filter columns are in the clustering keys, and `ALTER TABLE ... CLUSTER BY` changes them later without rewriting old data. Run `OPTIMIZE` on a schedule, or let predictive optimization do it.',
        when: 'Partitioning still wins above about 100 TB, when you drop whole partitions for retention or legal reasons, or when an engine that must read the table does not support clustering. Check the readers before you choose.'
      }),

      B.incident({
        id: 'm4-inc', t: 2, src: 'rec', title: 'Incident: the dashboard went from 5 seconds to 3 minutes', time: '09:20',
        alert: '**The orders dashboard now takes 3 minutes. Last week it took 5 seconds.** Nobody changed the query. On Monday the team moved the streaming job that feeds the table from a 5-minute trigger to a 10-second trigger.',
        clues: ['The warehouse size is unchanged', 'The table holds about the same number of rows as last week', 'The stream appends a few hundred rows each time'],
        opts: [
          { t: 'Run `DESCRIBE DETAIL` and `DESCRIBE HISTORY` to count the files and look at the write pattern', fb: '' },
          { t: 'Double the size of the SQL warehouse', fb: 'More compute does not make opening a huge number of files cheap. It also doubles the cost.' },
          { t: 'Rewrite the dashboard query', fb: 'The query did not change, and neither did the data volume.' },
          { t: 'Run `VACUUM` with a retention of 0 hours', fb: 'VACUUM does not compact. It deletes unused files, and this setting breaks time travel and running jobs.' }
        ],
        best: 0,
        why: 'The only change was the trigger, so the table now gets 30 times as many commits, and each commit writes at least one small file. `DESCRIBE DETAIL` shows the file count and the average size. In the recording, 40 small appends gave 40 files of about ' + kb(SB.sizeInBytes / SB.numFiles) + '.',
        checks: [
          ['Find what changed', 'The trigger went from 5 minutes to 10 seconds. That is 30 times as many commits a day.'],
          ['Count the files', '`DESCRIBE DETAIL` shows `numFiles` and `sizeInBytes`. The average file is tiny.'],
          ['Look at the history', '`DESCRIBE HISTORY` shows a long run of small `STREAMING UPDATE` commits.'],
          ['Compact now', 'Run `OPTIMIZE` on the table. The dashboard returns to its old speed.'],
          ['Stop it returning', 'Turn on optimized writes and auto compaction, schedule `OPTIMIZE`, or use a longer trigger.']
        ],
        tell: 'The dashboard slowed from 5 seconds to 3 minutes after the team shortened the stream trigger from 5 minutes to 10 seconds. I checked the table with DESCRIBE DETAIL and found a very large number of tiny files, one or more for every commit. I ran OPTIMIZE and the dashboard went back to normal. To stop it returning, we turned on optimized writes and auto compaction on the table, and we added a scheduled OPTIMIZE. We also added a rule that a trigger change needs a look at the file count.',
        prevent: ['Alert on the **average file size** and on the number of files', 'Turn on **optimized writes** and **auto compaction**', 'Schedule **OPTIMIZE**, or use **predictive optimization** on managed tables', 'Review the **trigger interval** when a stream feeds a table']
      }),

      B.qa({
        id: 'qa-smallfiles', t: 1, tag: 'Layout', secs: 60,
        q: 'Why are many small files a problem, and how do you fix them in Delta Lake?',
        pts: ['Every file has an open and footer cost', 'Listing and planning slow down with the file count', 'Small files come from frequent appends, streams and too many shuffle partitions', 'OPTIMIZE compacts small files into larger ones', 'Prevent: optimized writes, auto compaction, longer triggers', 'VACUUM removes the old files afterwards'],
        short: 'Spark pays a fixed cost for every file: it lists it, opens it, reads its footer, and schedules a task. With thousands of tiny files, that overhead is larger than the work on the data, so queries are slow even when the table is small.\n\nSmall files come from frequent appends, from streaming jobs with a short trigger, and from shuffles that write too many partitions. In my test, 40 appends of 50 rows each produced 40 files of about 1.6 KB.\n\nI fix it with `OPTIMIZE`, which compacts them into larger files. In my test, 40 files became 1, and the rows stayed the same. To prevent the pile from coming back I turn on optimized writes and auto compaction, use a longer trigger, or schedule `OPTIMIZE`. Afterwards, `VACUUM` deletes the old files to free storage, within the retention period.',
        fu: [
          ['What file size do you aim for?', 'Large enough that open cost is small compared to read time. The default target of OPTIMIZE is about 1 GB. Smaller targets suit tables with many selective queries.'],
          ['Does OPTIMIZE change the data?', 'No. Its commit has `dataChange: false`, so a stream that reads the table does not see it as new data.']
        ],
        trap: 'Answering "use coalesce before the write" only. That helps one job but not the files written by other jobs and streams.',
        real: 'Give the file count and average file size of a table you compacted, and the speed-up.'
      }),

      B.qa({
        id: 'qa-layout', t: 2, tag: 'Layout', secs: 90,
        q: 'How do you choose between partitioning, Z-order and liquid clustering for a new table?',
        pts: ['Partitioning makes folders: only for big tables and low-cardinality columns', 'Each partition should hold a lot of data, at least about 1 GB', 'Z-order sorts within files and needs a scheduled OPTIMIZE', 'Liquid clustering is recommended for new tables and keys can change', 'The choice follows the filters of the queries', 'Measure files read before and after'],
        short: 'I start from the filters that the queries use. For a new table I choose liquid clustering on those columns. It is a table property, `OPTIMIZE` clusters new data incrementally, and I can change the keys later without rewriting the old data. The documentation recommends it for new tables.\n\nI use partitioning only for very large tables with one obvious column that almost every query filters on, and where each partition holds a lot of data, at least 1 GB. A column with many values makes tiny files. In my test, 100 partition values gave 100 files of about 9 KB.\n\nZ-order is the older way: `OPTIMIZE ... ZORDER BY` rewrites the files, and I must schedule it. In my test it cut the files read for one customer from 16 to 1.\n\nI check the result by counting the files a typical query reads before and after.',
        fu: [
          ['Can you combine partitioning and clustering?', 'Not on the same table. Liquid clustering cannot be combined with partitioning or Z-order.'],
          ['How many clustering columns?', 'A few. Each extra column dilutes the benefit for the others. Choose the columns that appear most in filters.']
        ],
        trap: 'Saying "partition by the column in the WHERE clause" without thinking about the number of values and the size of each partition.',
        real: 'Describe a table where you changed the layout and show the files read before and after.'
      }),

      B.qa({
        id: 'qa-vacuum', t: 2, tag: 'Layout', secs: 90,
        q: 'What does VACUUM do, and how do you choose the retention period?',
        pts: ['Deletes data files that no version inside the retention period needs', 'Default retention is 7 days', 'A short retention breaks time travel and RESTORE', 'It can break running jobs and streams that still read old files', 'Delta refuses less than 168 hours unless you switch the check off', 'Choose by how long a bad change can go unnoticed'],
        short: '`VACUUM` deletes data files that the log lists as removed and that are older than the retention period. It does not touch the current files. The default is 7 days, set by `delta.deletedFileRetentionDuration`.\n\nThe retention period is my recovery window. Time travel and `RESTORE` need the old files, so once VACUUM deletes them, those versions cannot be read. In my test, reading version 0 after a VACUUM failed with `FILE_NOT_EXIST`. A running query or stream that started before the VACUUM can fail too, because it still reads the old files.\n\nDelta refuses a retention under 168 hours with `DELTA_VACUUM_RETENTION_PERIOD_TOO_SHORT`, and I do not switch that check off on a shared table. I choose the period by asking how long a bad change can go unnoticed. For most tables the default is right. For a table with a long audit window I raise it. I run `DRY RUN` first to see what would be deleted.',
        fu: [
          ['Does VACUUM compact files?', 'No. It deletes unused files. `OPTIMIZE` compacts. After an OPTIMIZE, the replaced files become unused and VACUUM can delete them.'],
          ['Who runs VACUUM on managed tables?', 'With predictive optimization on, Databricks can run it for Unity Catalog managed tables. For external tables you schedule it.']
        ],
        trap: 'Thinking VACUUM makes queries faster. It saves storage. OPTIMIZE and layout make queries faster.',
        real: 'Tell about a retention period you chose and the reason.'
      }),

      B.recap({
        id: 'm4-recap', n: 4, badge: 'Layout Tuner', color: '#FDE68A',
        pts: [
          'Every file has a **fixed cost**. 40 small files became 1 with `OPTIMIZE`, and the rows stayed the same.',
          'The log holds the **minimum and maximum** of every column in every file. A filter skips files outside its range.',
          'After Z-order, a filter read **1 of 16** files. Liquid clustering read **1 of 2**.',
          'A column with **many values** makes a bad partition: 100 values gave 100 tiny files.',
          'For a new table use **liquid clustering**. Use partitions only for very large tables with one clear column.',
          '`VACUUM` frees storage and **ends time travel** beyond the retention. Keep the default of 7 days.'
        ],
        lines: [
          'I count the files a query reads before and after a layout change.',
          'I never switch off the VACUUM safety check on a shared table.',
          'I let the table property keep the layout, not a job that someone must remember.'
        ]
      })
    ]
  });
})();
