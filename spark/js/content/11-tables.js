/* Mission 11: table formats and Delta Lake. What Parquet files alone cannot do, the transaction log, MERGE, time travel, schema enforcement, small files with OPTIMIZE and VACUUM.
   Delta Lake 4.0.1 ran for real on local files. Apache Iceberg and Apache Hudi were not run: they are described from documentation, and the screens say so. */
(function () {
  var B = LAB.b, G = LAB.get;
  var BD = G.counts('delta.build'), MG = G.counts('delta.merge'), LG = G.counts('delta.log_after'), HI = G.table('delta.history'), TT = G.counts('delta.time_travel'), SE = G.text('delta.schema_enforcement'), SM = G.counts('delta.small_files');
  var PY = G.file('code/tables.py');
  var BUILD = G.lines(PY, G.at(PY, /^def build/), G.at(PY, /return o\.count\(\)/));
  var MERGE = G.lines(PY, G.at(PY, /^def merge/), G.at(PY, /\.execute\(\)/));
  var SMALL = G.lines(PY, G.at(PY, /^def small_files/), G.at(PY, /out\['rows_now'\]/));
  var ENF = G.lines(PY, G.at(PY, /^def schema_enforcement/), G.at(PY, /extra\.write\.format/));
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  var act = BD.first_commit_actions;
  G.expect(BD.parquet_files === act.add && BD.log_files.length === 1 && LG.log_files.length === 2, 'the first commit lists every Parquet file, and the merge adds a commit');
  G.expect(MG.numTargetRowsUpdated + MG.numTargetRowsDeleted + MG.numTargetRowsInserted === MG.numSourceRows, 'every change of the batch did one thing');
  G.expect(MG.numOutputRows === BD.rows - MG.numTargetRowsDeleted + MG.numTargetRowsInserted && TT.latest === MG.numOutputRows && TT['version 0'] === BD.rows, 'the merge adds up');
  G.expect(SM.files_in_the_version_after_optimize === 1 && SM.files_on_disk_after_optimize === SM.files_on_disk_before + 1 && SM.files_on_disk_after_vacuum === 1, 'optimize then vacuum');
  G.expect(/mergeSchema/.test(SE) && /channel/.test(SE) && /FILE_NOT_EXIST/.test(SM.old_version_after_vacuum), 'schema enforcement names the fix, and vacuum removes old versions');
  var enfFirst = SE.split('\n')[0].replace(/^\[[^\]]+\]\s*/, '');

  LAB.addChapter({
    id: 'm11', n: 11, title: 'Table formats and Delta Lake', short: 'Tables', blurb: 'What a transaction log adds to Parquet files: MERGE, time travel, schema checks, OPTIMIZE and VACUUM', minutes: 58,
    focus: ['snap', 'mart'],
    goals: [
      'Say what **plain Parquet folders** cannot do, and what a **table format** adds.',
      'Describe a **Delta table**: Parquet files plus a **transaction log** of commits.',
      'Write a **MERGE** that updates, deletes and inserts in one commit, and read its numbers.',
      'Use **time travel**, and explain why it stops working after **VACUUM**.',
      'Explain **schema enforcement** and how to change a schema on purpose.',
      'Compare **Delta, Iceberg and Hudi** at the level an interviewer expects.'
    ],
    say: 'Mission 11 is the layer that sits on top of the files. A folder of Parquet is cheap and simple, and it cannot update a row, cannot be changed in one safe step, and cannot go back. A table format adds a log that fixes all three. Delta Lake ran for real here, on local files, and I read its log and its numbers. Iceberg and Hudi were not run: I describe them from documentation, and I say so.',
    scenes: [
      B.talk({
        id: 'm11-why', t: 1, src: 'docs', title: 'What plain files cannot do',
        say: 'Mission 7 showed what a folder of Parquet files is. It is also all that it is. Press Next for the five things it cannot do.',
        items: [
          ['No atomic change', 'A job writes ten files and fails after six. A reader sees six files: half a result. There is no "commit". Readers and writers have no way to agree on what the table is at one moment.', 'Half a write is visible.'],
          ['No row-level change', 'To change one order you rewrite the whole file that holds it, by hand, or the whole partition. There is no UPDATE, DELETE or MERGE.', 'Files are immutable.'],
          ['No history', 'Once a file is overwritten the old data is gone. There is no way to ask "what did the table look like yesterday?"', 'No time travel.'],
          ['No schema guard', 'Any job can write a file with a different type or a new column. The break appears later, in a reader, as in mission 7.', 'The schema is not enforced.'],
          ['Listing is the metadata', 'To know what a table holds, an engine **lists the folder**. On an object store with a million files, listing is slow and, on some stores, not strictly consistent.', 'Listing does not scale.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The idea of a table format:', t: 'keep the data files as they are, and add a small **log** that says which files make up each version of the table. Everything in this mission follows from that.' }
      }),

      B.flow({
        id: 'm11-flow', t: 1, src: 'rec', title: 'A Delta table: files plus a log', g: 'delta', legend: true,
        steps: [
          { say: 'A Delta table is a folder with Parquet files and a folder named `_delta_log`. Press Next to see a write and a read.', cap: 'Files and a log.' },
          { say: 'Step 1. A writer, such as an append or a MERGE, starts. It first writes **new Parquet files** to the table folder. Nobody can see them yet, because no log entry mentions them.', on: ['dw1'], focus: ['d_w', 'd_files'], cap: 'New files are written first.' },
          { say: 'Step 2. Then it writes **one commit file** into `_delta_log`, with the next version number. The commit is a list of **actions**: `add` this file, `remove` that file, change the schema. Writing this one small file is the whole commit. It is all or nothing.', on: ['dw2'], focus: ['d_files', 'd_log'], tags: ['tg_atomic'], cap: 'One small file is the commit.' },
          { say: 'Step 3. The table has a **new version**. Readers see it from the moment the commit file exists, and not before.', on: ['dw3'], focus: ['d_log', 'd_ver'], cap: 'A new version appears at once.' },
          { say: 'Step 4. A reader starts. It does not list the folder. It reads the log.', on: ['dw4'], focus: ['d_ver', 'd_r'], cap: 'A reader reads the log.' },
          { say: 'Step 5. It reads the log from the last **checkpoint**, a summary file, and then the few commits after it, and works out the list of files that are part of the latest version.', on: ['dw5'], focus: ['d_r', 'd_rl'], cap: 'The log gives the list of files.' },
          { say: 'Step 6. It opens only those files. A file that a MERGE replaced is not in the list, even though it is still on disk. That is how a table can change without anyone editing a file.', on: ['dw6'], focus: ['d_rl', 'd_rf'], cap: 'Only the listed files are opened.' },
          { say: 'Step 7. The result is one consistent **snapshot**. And the pills at the bottom are the tools around it: time travel reads an older version, OPTIMIZE rewrites small files, VACUUM deletes old files, and a schema check refuses a wrong type.', on: ['dw7'], focus: ['d_rf', 'd_rows', 'd_tt', 'd_opt', 'd_vac', 'd_enf'], keepGroups: true, cap: 'One snapshot, and four tools.' }
        ]
      }),

      B.code({
        id: 'm11-build', t: 1, src: 'rec', title: 'Commit 0: create the table', file: 'tables.py', lang: 'python', code: BUILD,
        steps: [
          { say: 'The first commit of a Delta table. Press Next.', lines: null },
          { say: 'The data: the paid orders of the first three days, five columns, from the Brewline files.', lines: G.span(BUILD, /o = spark\.read/) },
          { say: '`repartition(6)` makes six tasks, so six Parquet files. Then `write.format("delta")` writes them and the first commit. It is the same `write` that you know: only the format changed.', lines: G.span(BUILD, /o\.repartition\(6\)/) }
        ],
        note: 'Recorded with delta-spark ' + G.meta('delta-spark') + '. Delta Lake loads as a package, plus two session settings: the SQL extension and the Delta catalog.'
      }),

      B.rows({
        id: 'm11-log', t: 1, src: 'rec', title: 'The first commit, read from the log',
        steps: [
          {
            say: 'After the write, the folder holds **' + BD.parquet_files + '** Parquet files and the log. I read the first commit file, `' + BD.log_files[0] + '`, and counted the kinds of action in it. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'The actions in commit 0', c: 'raw', cols: ['action', 'how many'], rows: Object.keys(act).map(function (k) { return [k, act[k]]; }), trk: 0 }],
            notes: ['Recorded: each line of the commit file is one JSON object with one key, the kind of action.']
          },
          {
            say: 'There are **' + act.add + '** `add` actions, one for each Parquet file, and the table holds ' + n0(BD.rows) + ' rows. A reader that finds this commit sees exactly these ' + act.add + ' files, and nothing else.',
            tabs: [{ layer: 'RECORDED', name: 'The actions in commit 0', c: 'raw', cols: ['action', 'how many'], rows: Object.keys(act).map(function (k) { return [k, act[k]]; }), trk: Object.keys(act).indexOf('add'), chg: [[Object.keys(act).indexOf('add'), 1]] }],
            notes: ['The file name `00000000000000000000.json` is the version number, with leading zeros.']
          },
          {
            say: '`metaData` is the **schema** and the partitioning of the table. `protocol` says which features a reader must understand. `commitInfo` records who wrote it, with what operation. Those three make the table self-describing.',
            tabs: [{ layer: 'RECORDED', name: 'The actions in commit 0', c: 'raw', cols: ['action', 'how many'], rows: Object.keys(act).map(function (k) { return [k, act[k]]; }), trk: Object.keys(act).indexOf('metaData'), chg: [[Object.keys(act).indexOf('metaData'), 1], [Object.keys(act).indexOf('protocol'), 1], [Object.keys(act).indexOf('commitInfo'), 1]] }],
            notes: ['Every later commit adds `add` and `remove` actions. The current file list is the sum of all of them.']
          }
        ]
      }),

      B.code({
        id: 'm11-merge', t: 1, src: 'rec', title: 'Commit 1: a MERGE', file: 'tables.py', lang: 'python', code: MERGE,
        steps: [
          { say: 'A MERGE changes rows of the table with a batch of changes. Press Next.', lines: null },
          { say: '`DeltaTable.forPath` opens the table. The batch of changes is built from 3,000 numbers: some orders that exist, set to a new total, some of them set to REFUNDED, and 100 new orders.', lines: G.span(MERGE, /t = DeltaTable/, /changes = changes\.union/) },
          { say: 'The merge condition is the key: `t.order_id = c.order_id`. Rows that **match** and are REFUNDED are deleted. Rows that match and are not refunded get the new total. Rows with **no match** are inserted. Three actions, one statement.', lines: G.span(MERGE, /t\.alias\('t'\)\.merge/, /execute/) }
        ],
        note: 'Recorded. A MERGE is how a pipeline stays correct when it runs twice: the same changes applied again leave the same table.'
      }),

      B.rows({
        id: 'm11-merge-rows', t: 1, src: 'rec', title: 'What the MERGE did',
        steps: [
          {
            say: 'Delta reports the numbers of every operation in the history of the table. Here is the MERGE. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Numbers of the MERGE', c: 'raw', cols: ['metric', 'rows'], rows: [['rows in the batch of changes', n0(MG.numSourceRows)], ['updated', n0(MG.numTargetRowsUpdated)], ['deleted', n0(MG.numTargetRowsDeleted)], ['inserted', n0(MG.numTargetRowsInserted)], ['rows in the table afterwards', n0(MG.numOutputRows)]], trk: 0 }],
            notes: ['Recorded: `DESCRIBE HISTORY`, the `operationMetrics` of the last commit.']
          },
          {
            say: 'Of the ' + n0(MG.numSourceRows) + ' changes, **' + n0(MG.numTargetRowsUpdated) + '** updated an order, **' + n0(MG.numTargetRowsDeleted) + '** deleted a refunded one and **' + n0(MG.numTargetRowsInserted) + '** inserted a new one. The table had ' + n0(BD.rows) + ' rows: ' + n0(BD.rows) + ' - ' + n0(MG.numTargetRowsDeleted) + ' + ' + n0(MG.numTargetRowsInserted) + ' = **' + n0(MG.numOutputRows) + '**.',
            tabs: [{ layer: 'RECORDED', name: 'Numbers of the MERGE', c: 'raw', cols: ['metric', 'rows'], rows: [['rows in the batch of changes', n0(MG.numSourceRows)], ['updated', n0(MG.numTargetRowsUpdated)], ['deleted', n0(MG.numTargetRowsDeleted)], ['inserted', n0(MG.numTargetRowsInserted)], ['rows in the table afterwards', n0(MG.numOutputRows)]], trk: 4, chg: [[1, 1], [2, 1], [3, 1], [4, 1]] }],
            notes: ['The three counts add up to the batch: ' + n0(MG.numTargetRowsUpdated) + ' + ' + n0(MG.numTargetRowsDeleted) + ' + ' + n0(MG.numTargetRowsInserted) + ' = ' + n0(MG.numTargetRowsUpdated + MG.numTargetRowsDeleted + MG.numTargetRowsInserted) + '. Every change in the batch did exactly one of the three things.']
          },
          {
            say: 'The log folder now holds **' + LG.log_files.length + '** commit files: `' + LG.log_files.join('`, `') + '`. And `DESCRIBE HISTORY` lists them as a table: version ' + HI.rows.map(function (r) { return r[0] + ' is ' + r[1]; }).join(', and version ') + '.',
            tabs: [{ layer: 'RECORDED', name: 'The history of the table', c: 'raw', cols: HI.cols, rows: HI.rows, trk: 1 }],
            notes: ['The history is the audit trail: who changed the table, when, and with which operation.']
          }
        ]
      }),

      B.rows({
        id: 'm11-tt', t: 1, src: 'rec', title: 'Time travel',
        steps: [
          {
            say: 'Both versions of the table are still there. I counted the rows of the first version and of the latest. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Rows in two versions', c: 'raw', cols: ['version', 'rows'], rows: [['0, before the MERGE (versionAsOf 0)', n0(TT['version 0'])], ['latest', n0(TT.latest)]], trk: 0 }],
            notes: ['Recorded: `spark.read.format("delta").option("versionAsOf", 0).load(path).count()` and the same without the option.']
          },
          {
            say: 'Version 0 has **' + n0(TT['version 0']) + '** rows and the latest has **' + n0(TT.latest) + '**. A job that went wrong can be compared with yesterday\'s table, or the table can be **restored** to the version before the bad write. For a data engineer this is the undo button.',
            tabs: [{ layer: 'RECORDED', name: 'Rows in two versions', c: 'raw', cols: ['version', 'rows'], rows: [['0, before the MERGE (versionAsOf 0)', n0(TT['version 0'])], ['latest', n0(TT.latest)]], trk: 1, chg: [[0, 1], [1, 1]] }],
            notes: ['It works because the old Parquet files are still on disk. The next screens show what ends it.']
          }
        ]
      }),

      B.code({
        id: 'm11-enforce', t: 1, src: 'rec', title: 'Schema enforcement: a wrong write is refused', file: 'tables.py', lang: 'python', code: ENF + '\n\n-- what Delta answered\n' + SE.replace(/^/gm, '# '),
        steps: [
          { say: 'Plain Parquet takes any file. Delta checks the schema of every write. Press Next.', lines: null },
          { say: 'The test appends a DataFrame that has all the columns of the table **and one more**, `channel`.', lines: G.span(ENF + '\n\n-- what Delta answered\n' + SE.replace(/^/gm, '# '), /extra = spark\.createDataFrame/) },
          { say: 'Delta refused it. The first line of the message: **' + enfFirst + '** And the message names the cure: set `option("mergeSchema", "true")` on the write, or the session setting `spark.databricks.delta.schema.autoMerge.enabled`.', lines: G.span(ENF + '\n\n-- what Delta answered\n' + SE.replace(/^/gm, '# '), /# \[_LEGACY_ERROR/, /# specific to the operation/) },
          { say: 'It then prints the **table schema** and the **data schema** side by side. The extra column is easy to see. Nothing was written. That is the guard: a new column is a decision, not an accident.', lines: G.span(ENF + '\n\n-- what Delta answered\n' + SE.replace(/^/gm, '# '), /# Table schema/) }
        ],
        note: 'Recorded: the full message of Delta Lake ' + G.meta('delta-spark') + '. With `mergeSchema` the append goes through and the table gets the new column. That is how a schema changes on purpose.'
      }),

      B.widget({ id: 'm11-lab', kind: 'deltalab', t: 1, src: 'rec', title: 'Lab: the life of a Delta table' }),

      B.code({
        id: 'm11-small', t: 2, src: 'rec', title: 'Twenty appends, OPTIMIZE and VACUUM', file: 'tables.py', lang: 'python', code: SMALL,
        steps: [
          { say: 'The experiment on small files. Press Next.', lines: null },
          { say: 'Twenty appends of 500 rows each, written as a single file each. Twenty commits, twenty small files. This is what a streaming job that commits every minute does to a table.', lines: G.span(SMALL, /for i in range\(20\)/) },
          { say: 'I count the files on disk and the files in the latest version. Both are 20 here.', lines: G.span(SMALL, /files_on_disk_before/, /version_before_optimize/) },
          { say: '`OPTIMIZE` reads the small files and writes them as a few big ones, in one new commit. The old files are not deleted. They are marked as removed in the log.', lines: G.span(SMALL, /spark\.sql\('OPTIMIZE/, /files_on_disk_after_optimize/) },
          { say: '`VACUUM RETAIN 0 HOURS` is refused unless a safety check is switched off. Then `VACUUM` deletes the files that no version within the retention needs.', lines: G.span(SMALL, /VACUUM/, /retentionDurationCheck\.enabled', 'true'/) },
          { say: 'Last, the experiment tries to read the old version, 19. After VACUUM, its files are gone.', lines: G.span(SMALL, /rows_now/) }
        ],
        note: 'Recorded: the counts are in the lab above and in the next screen.'
      }),

      B.rows({
        id: 'm11-small-rows', t: 1, src: 'rec', title: 'What OPTIMIZE and VACUUM did to the files',
        steps: [
          {
            say: 'The same table at four moments. Look at the two columns of files. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Files in the latest version and on disk', c: 'raw', cols: ['moment', 'files in the latest version', 'files on disk'], rows: [['after ' + SM.appends + ' appends', SM.files_in_the_version_before, SM.files_on_disk_before], ['after OPTIMIZE', SM.files_in_the_version_after_optimize, SM.files_on_disk_after_optimize], ['after VACUUM', SM.files_in_the_version_after_vacuum, SM.files_on_disk_after_vacuum]], trk: 0 }],
            notes: ['Recorded: `DESCRIBE DETAIL` for the files in the version, and a count of the Parquet files on disk.']
          },
          {
            say: 'After OPTIMIZE the latest version has **' + SM.files_in_the_version_after_optimize + '** file. But the folder has **' + SM.files_on_disk_after_optimize + '**: the twenty old files and the new one. They stay so that version ' + SM.version_before_optimize + ' and a reader that started earlier still work.',
            tabs: [{ layer: 'RECORDED', name: 'Files in the latest version and on disk', c: 'raw', cols: ['moment', 'files in the latest version', 'files on disk'], rows: [['after ' + SM.appends + ' appends', SM.files_in_the_version_before, SM.files_on_disk_before], ['after OPTIMIZE', SM.files_in_the_version_after_optimize, SM.files_on_disk_after_optimize], ['after VACUUM', SM.files_in_the_version_after_vacuum, SM.files_on_disk_after_vacuum]], trk: 1, chg: [[1, 1], [1, 2]] }],
            notes: ['OPTIMIZE saves read time, not disk. Disk is saved by VACUUM.']
          },
          {
            say: 'After VACUUM only **' + SM.files_on_disk_after_vacuum + '** file is left. The price: reading version ' + SM.version_before_optimize + ' now fails. The message: **' + SM.old_version_after_vacuum + '** Time travel needs the old files.',
            tabs: [{ layer: 'RECORDED', name: 'Files in the latest version and on disk', c: 'raw', cols: ['moment', 'files in the latest version', 'files on disk'], rows: [['after ' + SM.appends + ' appends', SM.files_in_the_version_before, SM.files_on_disk_before], ['after OPTIMIZE', SM.files_in_the_version_after_optimize, SM.files_on_disk_after_optimize], ['after VACUUM', SM.files_in_the_version_after_vacuum, SM.files_on_disk_after_vacuum]], trk: 2, chg: [[2, 2]] }],
            notes: ['The table still has ' + n0(SM.rows_now) + ' rows in its latest version. Only the history was cut.']
          },
          {
            say: 'And a retention of zero hours is **refused** by default: ' + SM.vacuum_zero_hours + ' The check protects running queries and your time travel. The default retention is seven days. Do not switch the check off to save disk.',
            tabs: [{ layer: 'RECORDED', name: 'The safety check', c: 'raw', cols: ['what I asked', 'what Delta said'], rows: [['VACUUM ... RETAIN 0 HOURS', SM.vacuum_zero_hours]], trk: 0 }],
            notes: ['The retention for VACUUM and the retention of the log are separate settings. The seven days come from the Delta documentation.']
          }
        ]
      }),

      B.cmp({
        id: 'm11-formats', t: 1, src: 'docs', title: 'Delta, Iceberg and Hudi',
        say: 'Three table formats do the same job in different ways. Only Delta ran in this course. The rest of this table is from the documentation of each project. Press Next.',
        cols: ['', 'Delta Lake', 'Apache Iceberg', 'Apache Hudi'],
        hl: 1,
        rows: [
          ['Metadata', 'A log of JSON commits, with checkpoints in Parquet', 'A tree: a metadata file, manifest lists, manifests, then data files', 'A timeline of instants on the table'],
          ['Row-level changes', 'Rewrites files by default; deletion vectors in newer releases', 'Copy-on-write or merge-on-read, per table', 'Copy-on-write or merge-on-read tables, built around upserts'],
          ['Partitions', 'Folders by partition column; clustering features in newer releases', 'Hidden partitioning, and partitions that can change over time', 'Folders, with indexes for record lookups'],
          ['Strength', 'Deep Spark integration; strong on Databricks', 'Many engines read and write it; a catalog-centred design', 'Streaming upserts and incremental pulls of changed records'],
          ['Time travel', 'By version or timestamp, until VACUUM', 'By snapshot id or timestamp, until snapshots expire', 'By commit time, until the cleaner runs']
        ],
        steps: [
          { upto: 2, say: 'How each one keeps its metadata and how it changes a row. These are the two questions that decide the performance and the maintenance.' },
          { upto: 4, say: 'Partitioning and the shape of each project. Iceberg\'s hidden partitioning and Hudi\'s record index are the features that people mention first.' },
          { upto: 5, say: 'All three can go back in time, and all three need housekeeping: expiring snapshots, vacuuming, or cleaning.' }
        ],
        pick: 'Choose by **which engines must read the table** and **which catalog you already run**, not by fashion. If one engine (Spark) does nearly everything, Delta is the shortest path. If many engines share the tables, look hard at Iceberg.'
      }),

      B.talk({
        id: 'm11-pipelines', t: 2, src: 'docs', title: 'Using a table format in a pipeline',
        say: 'A table format changes how you write pipelines. Press Next for the patterns.',
        items: [
          ['Upsert with MERGE', 'Load a day of changes with MERGE on the key. Run it twice and the table is the same. This replaces "delete the day, then insert" and its half-done failures. The recording did it with ' + n0(MG.numSourceRows) + ' changes in one commit.', 'Idempotent by design.'],
          ['Replace a slice', '`replaceWhere` overwrites exactly the rows that match a condition, such as one day, and refuses data that does not match. It is the safe form of the overwrite that mission 7 showed emptying a table.', 'A safe partial overwrite.'],
          ['Stream in, stream out', 'A Delta table can be a streaming **sink** and a streaming **source**. The transaction ids make the sink idempotent for a replayed batch. This is why Delta is the usual sink in mission 10\'s fix.', 'Exactly-once to the table.'],
          ['Change data feed', 'Delta can record **which rows changed** in each version (the change data feed), so that a downstream job reads only the changes. Iceberg and Hudi have their own incremental reads.', 'Read only what changed.'],
          ['Concurrent writers', 'Delta uses **optimistic concurrency**: two writers work in parallel, and when one commits, the other checks that it did not touch the same files. If it did, it fails and retries. Design jobs so that they write different partitions.', 'Conflicts are detected at commit.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm11-maint', t: 2, src: 'docs', title: 'Housekeeping: what to schedule',
        say: 'A table format needs care, like a database does. Press Next for the checklist.',
        items: [
          ['Compact', 'Run `OPTIMIZE` on tables that receive many small writes, daily or after big loads, scoped to the partitions that changed. In the recording, twenty files became one.', 'OPTIMIZE for small files.'],
          ['Vacuum', 'Run `VACUUM` with the default retention (seven days) to delete files that no version needs. Never below the longest running query, or the time travel that you promised. In the recording, a vacuum ended reading version 19.', 'VACUUM with the default.'],
          ['Checkpoints', 'Delta writes a checkpoint file every ten commits by default, so that a reader does not replay thousands of JSON files. You rarely touch it, and it is why reading a log stays fast.', 'A summary of the log.'],
          ['Statistics and ordering', 'Delta stores min and max for columns in the log, which feeds data skipping. `OPTIMIZE ... ZORDER BY` sorts files by columns to make the ranges narrow, like the sort inside files in mission 7.', 'Make skipping work.'],
          ['Watch the log', 'The log grows with every commit. A table with a commit every second makes a million log entries a month. Batch the commits, or use a trigger of a minute or more.', 'Fewer, bigger commits.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'The mistake that costs most:', t: 'a VACUUM with a very short retention, switched on with the safety check off. It deletes files that a running query or a time travel read still needs.' }
      }),

      B.decide({
        id: 'm11-dec', t: 2, src: 'docs', title: 'Decision: which table format for Brewline',
        scenario: 'Brewline\'s data team writes and reads all its tables with Spark. They need MERGE for daily changes, time travel for mistakes, and a safe sink for a stream. In a year an analytics team may want to read the same tables from Trino. You choose a format.',
        opts: [
          { t: 'Plain Parquet folders, with careful jobs', d: 'The simplest storage there is.', lose: 'No MERGE, no safe sink, no time travel. Every one of them becomes a hand-written script.' },
          { t: 'Delta Lake now, and review it again if more engines need to write', d: 'The shortest path with Spark, with everything they listed. Other engines can read Delta tables.', lose: '' },
          { t: 'Hudi, because it is built for upserts', d: 'It is good at record-level updates.', lose: 'It has the smallest Spark-only path in this team, and little else to gain. Pick it when streaming upserts and incremental pulls are the main job.' }
        ],
        pick: 1,
        why: 'Pick the format that fits the engines and the catalog you have, and the features you need now. Delta gives MERGE, time travel and an idempotent stream sink with Spark alone. Revisit when a second engine needs to write.',
        when: 'If three engines write the same tables from the start, or the company standard is a shared catalog of Iceberg tables, start with Iceberg.'
      }),

      B.bug({
        id: 'm11-bug', t: 2, q: 'A cleanup job runs this to save disk. Next morning a report that compares with version 19 of the table fails with a missing-file error. Click the line that causes it.',
        file: 'cleanup.py', lang: 'python',
        code: ['spark.conf.set("spark.databricks.delta.retentionDurationCheck.enabled", "false")', 'spark.sql("VACUUM delta.`/lake/orders` RETAIN 0 HOURS")', 'old = spark.read.format("delta").option("versionAsOf", 19).load("/lake/orders")'].join('\n'),
        bad: [2],
        hint: 'What does a retention of zero hours keep?',
        why: 'The first line switches off the safety check, and the second deletes **every file that the latest version does not use**, including those of version 19. In the recording, the safety check refused the zero-hour VACUUM, and after it ran the read failed with: ' + SM.old_version_after_vacuum + ' Keep the default retention, and the check on.',
        fix: ['spark.sql("VACUUM delta.`/lake/orders`")   # the default retention: seven days', 'old = spark.read.format("delta").option("versionAsOf", 19).load("/lake/orders")'].join('\n'),
        cheer: 'Vacuum with the default retention. Never turn the check off to save disk.'
      }),

      B.incident({
        id: 'm11-inc', t: 1, src: 'rec', title: 'Incident: the orders table gets slower every day', time: '10:25',
        alert: '**Reports on the streaming orders table take twice as long as a month ago.** The table has the same number of rows as it would have. A streaming job appends to it every minute, and nothing was changed in the queries.',
        clues: ['The stream commits to the table every minute', 'Each commit adds a few small files', 'Nobody runs OPTIMIZE'],
        opts: [
          { t: 'Count the files in the latest version, schedule OPTIMIZE on the partitions that change, and commit less often (a longer trigger)', fb: '' },
          { t: 'Add executors to the reports', fb: 'The reports spend their time opening thousands of tiny files, not computing.' },
          { t: 'Run VACUUM with zero hours', fb: 'VACUUM deletes unused old files. It does not merge the small files that are in use, and it ends time travel.' },
          { t: 'Convert the table back to plain Parquet', fb: 'You would lose MERGE, the log and the safe stream sink, and the small files would stay.' }
        ],
        best: 0,
        why: 'A commit every minute is 1,440 commits and many small files a day. In the recording, twenty appends gave **' + SM.files_in_the_version_before + '** files, and OPTIMIZE brought the latest version to **' + SM.files_in_the_version_after_optimize + '**. Every reader opens every file, so more files means slower reads.',
        checks: [
          ['Measure', '`DESCRIBE DETAIL` gives `numFiles` and `sizeInBytes`. Divide them: a few MB per file is a problem.'],
          ['Compact', '`OPTIMIZE` the partitions that receive new data, on a schedule.'],
          ['Commit less', 'A longer trigger in the stream means fewer, bigger files.'],
          ['Guard', 'Alert on the number of files and on the average file size of the busiest tables.']
        ],
        tell: 'The streaming table was committing a few small files every minute, so every report opened thousands of them. I scheduled OPTIMIZE on the changing partitions, lengthened the stream trigger, and added an alert on the average file size.',
        prevent: ['Scheduled OPTIMIZE on streaming tables', 'A trigger of a minute or more', 'An alert on file count and average size']
      }),

      B.quiz({
        id: 'm11-q1', t: 1,
        q: 'What is the commit of a Delta table?',
        opts: [{ t: 'The last Parquet file written', fb: 'The data files are written before the commit.' }, { t: 'One small file in `_delta_log`, listing the actions of the version', fb: '' }, { t: 'A copy of the whole table', fb: 'The data files are not copied.' }, { t: 'A message to the driver', fb: 'It is a file.' }],
        ok: 1,
        why: 'Commit 0 had ' + act.add + ' `add` actions, a `metaData`, a `protocol` and a `commitInfo`. Readers see the version when this file exists.'
      }),

      B.quiz({
        id: 'm11-q2', t: 1,
        q: 'A MERGE has ' + n0(MG.numSourceRows) + ' changes. It updated ' + n0(MG.numTargetRowsUpdated) + ', deleted ' + n0(MG.numTargetRowsDeleted) + ' and inserted ' + n0(MG.numTargetRowsInserted) + '. The table had ' + n0(BD.rows) + ' rows. How many rows does it hold now?',
        opts: [{ t: n0(BD.rows), fb: 'The merge deleted and inserted rows.' }, { t: n0(MG.numOutputRows), fb: '' }, { t: n0(BD.rows + MG.numSourceRows), fb: 'Not all changes were inserts.' }, { t: n0(MG.numSourceRows), fb: 'That is the size of the batch.' }],
        ok: 1,
        why: 'Updates do not change the count. Deletes take rows away and inserts add them: ' + n0(BD.rows) + ' - ' + n0(MG.numTargetRowsDeleted) + ' + ' + n0(MG.numTargetRowsInserted) + ' = ' + n0(MG.numOutputRows) + '.'
      }),

      B.quiz({
        id: 'm11-q3', t: 1,
        q: 'You append a DataFrame with an extra column to a Delta table. What happens by default?',
        opts: [{ t: 'The column is added', fb: 'Only with mergeSchema.' }, { t: 'The write is refused with a schema mismatch', fb: '' }, { t: 'The extra column is dropped silently', fb: 'Delta does not hide it.' }, { t: 'The table is corrupted', fb: 'The guard prevents that.' }],
        ok: 1,
        why: 'The message started with: ' + enfFirst + ' It named `option("mergeSchema", "true")` as the way to do it on purpose.'
      }),

      B.quiz({
        id: 'm11-q4', t: 2,
        q: 'After OPTIMIZE the latest version has 1 file and the folder has 21. Why are the 20 old files still there?',
        opts: [{ t: 'A bug', fb: 'It is the design.' }, { t: 'Time travel and running readers still need them. VACUUM removes them later', fb: '' }, { t: 'OPTIMIZE only copies', fb: 'It marks the old files as removed in the log.' }, { t: 'The disk is full', fb: 'No.' }],
        ok: 1,
        why: 'Disk went from ' + SM.files_on_disk_before + ' to ' + SM.files_on_disk_after_optimize + ' files after OPTIMIZE and to ' + SM.files_on_disk_after_vacuum + ' after VACUUM.'
      }),

      B.quiz({
        id: 'm11-q5', t: 2,
        q: 'Which statement about the three table formats is correct?',
        opts: [{ t: 'Only Delta has a transaction log', fb: 'Iceberg and Hudi have their own metadata, too.' }, { t: 'All three add ACID commits, snapshots and time travel to files in object storage', fb: '' }, { t: 'Iceberg cannot be read by Spark', fb: 'Spark reads and writes Iceberg.' }, { t: 'Hudi is a SQL engine', fb: 'It is a table format.' }],
        ok: 1,
        why: 'They differ in how they keep metadata, how they change a row and which engines support them. I ran Delta only; the others are from documentation.'
      }),

      B.order({
        id: 'm11-ord', t: 2, q: 'Put the writing of a Delta commit in order.',
        items: [
          'The writer produces the new Parquet files in the table folder',
          'The writer prepares the list of add and remove actions',
          'It checks that no other writer touched the same files',
          'It writes the next numbered JSON file into _delta_log',
          'Readers that open the table now see the new version'
        ],
        why: 'Files first, because nothing sees them. Then the check and the single small file that makes them visible. Atomicity comes from that one file.'
      }),

      B.qa({
        id: 'qa-delta', t: 1, tag: 'Table formats', secs: 90,
        q: 'What does Delta Lake add to Parquet, and how does it work?',
        pts: ['Parquet files plus a _delta_log of JSON commits', 'Commit = add/remove actions, all or nothing', 'Readers read the log, not a listing', 'ACID, MERGE/UPDATE/DELETE, time travel', 'Schema enforcement', 'Housekeeping: OPTIMIZE, VACUUM, checkpoints'],
        short: 'A Delta table is a folder of Parquet files plus a **transaction log** in `_delta_log`. A write puts new Parquet files in the folder, then writes **one small commit file** with `add` and `remove` actions. That is the atomic step: readers see the new version when the file exists, so there is no half-written table. A reader reads the log from the last checkpoint to get the list of files, instead of listing the folder. This gives ACID commits, `MERGE`, `UPDATE` and `DELETE`, **time travel** because old files are still there, and **schema enforcement**. In my test, one MERGE updated 347 rows, deleted 164 and inserted 2,589 in a single commit. It needs care: OPTIMIZE for small files, and VACUUM, which ends time travel for the files it deletes.',
        fu: [['What is optimistic concurrency?', 'Writers work in parallel and check for conflicts at commit. If the same files were touched, one fails and retries.'], ['How is MERGE idempotent?', 'The same changes applied again match the same keys and give the same table.']],
        trap: 'Saying that Delta is a database or a different file format. The data files are Parquet.',
        real: 'A job failed half way through a load. What state is the Delta table in?'
      }),

      B.qa({
        id: 'qa-formats', t: 2, tag: 'Table formats', secs: 90,
        q: 'Delta, Iceberg or Hudi: how do you choose?',
        pts: ['All three: ACID on files, snapshots, time travel, schema evolution', 'Delta: log of commits; deepest Spark and Databricks fit', 'Iceberg: metadata tree, hidden partitioning, many engines', 'Hudi: upserts and incremental pulls, COW and MOR', 'Choose by engines, catalog and workload', 'Housekeeping for all three'],
        short: 'All three add transactions, snapshots, time travel and schema evolution to files in object storage. They differ in design. **Delta** keeps a log of commits and has the deepest integration with Spark and Databricks. **Iceberg** keeps a tree of metadata, with hidden partitioning and partitions that can evolve, and many engines read and write it. **Hudi** is built around upserts and incremental pulls, with copy-on-write and merge-on-read tables. I choose by which engines must read and write the tables, which catalog is already there, and the workload: streaming upserts point at Hudi, many engines at Iceberg, and a Spark-centred team at Delta. I ran Delta for real here; I know the others from their documentation. For all of them I schedule compaction and snapshot cleanup.',
        fu: [['Can they work together?', 'Some engines read more than one format, and there are conversion layers, but one format per table is the safe design.'], ['What is merge-on-read?', 'Updates are written to small delta files and merged at read time, which makes writes cheap and reads a bit costlier. Copy-on-write rewrites the files on write.']],
        trap: 'Naming a winner without saying what it depends on.',
        real: 'The company wants Trino to query the Spark tables. What do you recommend?'
      }),

      B.qa({
        id: 'qa-vacuum', t: 2, tag: 'Table formats', secs: 60,
        q: 'What do OPTIMIZE and VACUUM do, and what can go wrong?',
        pts: ['OPTIMIZE: rewrites small files into big ones in a new commit', 'Old files stay, marked removed', 'VACUUM: deletes files no version in the retention needs', 'Default retention 7 days; zero hours is refused', 'After VACUUM old versions cannot be read', 'Schedule both; never vacuum below your longest query'],
        short: '`OPTIMIZE` rewrites many small files into a few big ones, in a new commit. It makes reads faster and saves no disk, because the old files stay, marked as removed. `VACUUM` deletes the files that no version within the **retention** needs; the default is seven days, and a retention of zero hours is refused unless you turn a safety check off. What can go wrong: after `VACUUM`, time travel to versions whose files are gone fails. In my test, after twenty appends, OPTIMIZE gave 1 file in the latest version with 21 on disk, VACUUM left 1, and reading version 19 failed with a missing-file error. So I schedule both, keep the default retention, and never vacuum below the longest query or the time travel I promised.',
        fu: [['Why not VACUUM at once?', 'A running query or a time travel read may still need the old files.'], ['How often do you OPTIMIZE?', 'After big loads, and daily on tables that take many small writes, only on the changed partitions.']],
        trap: 'Turning off the retention check to save disk.',
        real: 'A report on version 19 fails after a cleanup job. What happened?'
      }),

      B.recap({
        id: 'm11-recap', n: 11, badge: 'Table Builder', color: '#FBCFE8',
        pts: [
          'Plain Parquet has **no atomic commit, no row changes, no history and no schema guard**. A table format adds a **log**.',
          'A Delta table is **Parquet files plus `_delta_log`**. Commit 0 had **' + act.add + '** `add` actions for **' + BD.parquet_files + '** files.',
          'One **MERGE** updated **' + n0(MG.numTargetRowsUpdated) + '**, deleted **' + n0(MG.numTargetRowsDeleted) + '** and inserted **' + n0(MG.numTargetRowsInserted) + '** rows: ' + n0(BD.rows) + ' became **' + n0(MG.numOutputRows) + '**, in one commit.',
          '**Time travel** read version 0 with ' + n0(TT['version 0']) + ' rows. **Schema enforcement** refused an extra column and named `mergeSchema`.',
          'Twenty appends gave **' + SM.files_in_the_version_before + '** files. OPTIMIZE: **' + SM.files_in_the_version_after_optimize + '** in the version, **' + SM.files_on_disk_after_optimize + '** on disk. VACUUM: **' + SM.files_on_disk_after_vacuum + '**, and version ' + SM.version_before_optimize + ' could not be read.',
          'Delta ran here. **Iceberg and Hudi** are from documentation: choose by engines, catalog and workload.'
        ],
        lines: [
          'I use MERGE so that a rerun is safe.',
          'I keep the default VACUUM retention.',
          'I compact tables that take small writes.'
        ]
      })
    ]
  });
})();
