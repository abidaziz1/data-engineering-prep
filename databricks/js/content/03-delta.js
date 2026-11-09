/* Mission 3: Delta Lake. The folder, the log, operations, time travel, schema rules, MERGE, constraints, change feed, deletion vectors, clones and concurrent writers.
   Every log entry, history row, table and error message comes from open-source Delta Lake, recorded by verify/capture_db.py. */
(function () {
  var B = LAB.b, G = LAB.get;
  var KEY = 'delta.orders';
  var HIST = G.history(KEY);
  var V0 = G.listing('delta.after_v0'), V5 = G.listing('delta.after_v5');
  var CONF = G.counts('delta.conflicts');
  var DVOFF = G.counts('delta.dv_off_files'), DVON = G.counts('delta.dv_on_files');
  var DVOFF_M = G.metrics('delta.dv_off', 1), DVON_M = G.metrics('delta.dv_on', 1);
  var CLONE = G.counts('delta.shallow_clone'), RESTORE = G.counts('delta.restore');
  var MERGE = G.file('delta/merge.sql');
  var MERGE_M = G.metrics(KEY, 4);
  var COMMIT0 = G.commitText(KEY, 0), DVCOMMIT = G.commitText('delta.dv_on_delete', 1, { kinds: ['add', 'remove'] });
  G.expect(V5.files.length === 9 && V0.files.length === 1, 'the folder holds 9 data files after version 5 and 1 after version 0');
  G.expect(CONF.append_append.a === 'committed' && CONF.update_append.a === 'ConcurrentAppendException' && CONF.update_append_partitioned.a === 'committed', 'the writer conflict outcomes');
  G.expect(DVON.files_in_folder === 1 && DVOFF.files_in_folder === 2 && DVOFF.rows_after === DVON.rows_after, 'deletion vectors keep one file and give the same rows');

  function tree(l) { return ['orders/'].concat(l.files.map(function (f) { return '  ' + f; }), ['  _delta_log/'], l.log.map(function (f) { return '    ' + f; })).join('\n'); }
  function actionsOf(v) {
    var n = {};
    G.commit(KEY, v).actions.forEach(function (a) { if (['add', 'remove'].indexOf(a.kind) >= 0) n[a.kind] = (n[a.kind] || 0) + 1; });
    return Object.keys(n).map(function (k) { return n[k] + ' ' + k; }).join(', ');
  }
  function what(r) {
    var m = r.operationMetrics;
    if (r.operation === 'WRITE') return m.numOutputRows + ' rows written in ' + m.numFiles + ' file' + (m.numFiles === '1' ? '' : 's');
    if (r.operation === 'UPDATE') return m.numUpdatedRows + ' row updated, ' + m.numRemovedFiles + ' file rewritten';
    if (r.operation === 'DELETE') return m.numDeletedRows + ' row deleted, ' + m.numRemovedFiles + ' file rewritten';
    if (r.operation === 'MERGE') return m.numTargetRowsInserted + ' rows inserted, ' + m.numTargetRowsUpdated + ' updated';
    if (r.operation === 'OPTIMIZE') return m.numRemovedFiles + ' files compacted into ' + m.numAddedFiles;
    return '';
  }
  var HISTROWS = HIST.map(function (r) { return [String(r.version), r.operation, what(r), actionsOf(r.version)]; });
  var FLAGS = HIST.map(function (r) { return r.operation + (r.isBlindAppend ? ' (blind append)' : ''); });

  var TT_SQL = ['SELECT order_id, status, total_usd', 'FROM orders VERSION AS OF 1', 'ORDER BY order_id;'].join('\n');
  var HIST_SQL = 'DESCRIBE HISTORY orders;';
  var RESTORE_SQL = 'RESTORE TABLE orders TO VERSION AS OF 1;';
  var SCHEMA_CODE = [
    'extra = new_orders.withColumn("channel", F.lit("web"))',
    '',
    'extra.write.format("delta").mode("append").save(path)',
    '',
    '(extra.write.format("delta").mode("append")',
    '      .option("mergeSchema", "true")',
    '      .save(path))'
  ].join('\n');
  var ERR_EXTRA = G.text('delta.err_extra_column');
  var CONSTRAINT_SQL = [
    'ALTER TABLE orders ADD CONSTRAINT positive_total CHECK (total_usd > 0);',
    '',
    "INSERT INTO orders VALUES ('O-9002', 'C-1', TIMESTAMP'2026-03-18 08:00:00', 'PLACED', -5.00, TIMESTAMP'2026-03-18 09:00:00');",
    '',
    'ALTER TABLE orders ADD CONSTRAINT never_free CHECK (total_usd > 100);'
  ].join('\n');
  var CONSTRAINT_OUT = G.text('delta.err_constraint') + '\n\n' + G.text('delta.err_constraint_existing_rows');
  var CDF_CODE = [
    '(orders.write.format("delta")',
    '       .option("delta.enableChangeDataFeed", "true")',
    '       .save(path))',
    '',
    '# later: update one row, delete one row, append two rows',
    '',
    'feed = (spark.read.format("delta")',
    '        .option("readChangeFeed", "true")',
    '        .option("startingVersion", 0)',
    '        .load(path))'
  ].join('\n');
  var CLONE_SQL = 'CREATE TABLE orders_dev SHALLOW CLONE orders;';
  var OVERWRITE_BUG = [
    'daily = spark.read.json(landing + "/orders_20260318.json")',
    '',
    '(daily.write',
    '      .format("delta")',
    '      .mode("overwrite")',
    '      .save(silver_path))'
  ].join('\n');
  var OVERWRITE_FIX = [
    'daily = spark.read.json(landing + "/orders_20260318.json")',
    '',
    '(daily.write',
    '      .format("delta")',
    '      .mode("append")',
    '      .save(silver_path))'
  ].join('\n');
  var ERRMSG_CONFLICT = G.text('delta.conflict_update_append');

  LAB.addChapter({
    id: 'm3', n: 3, title: 'Delta Lake: tables you can trust', short: 'Delta', blurb: 'The log, time travel, schema rules, MERGE and concurrent writers', minutes: 44,
    focus: ['mon'],
    goals: [
      'Say what a **Delta table folder** holds and what each **log** entry records.',
      'Replay the log to find the files that make up a version.',
      'Use **time travel** and **RESTORE** to read or undo an old state.',
      'Read the errors of **schema enforcement** and **constraints**, and use **schema evolution** on purpose.',
      'Write a **MERGE** and read its metrics.',
      'Explain what happens when **two writers** commit at once.',
      'Know when to turn on the **change data feed**, **deletion vectors** and a **clone**.'
    ],
    say: 'Mission 3 is Delta Lake, the table format under every Databricks table. I wrote six versions of the Brewline orders table with open-source Delta Lake ' + G.meta('delta') + ' and kept every log entry. You will read the real log, replay it yourself, break the rules on purpose, and read the error messages.',
    scenes: [
      B.talk({
        id: 'm3-talk', t: 1, src: 'rec', title: 'A Delta table is a folder with a log',
        say: 'Delta Lake is a table format, not a service. A table is a plain folder in your storage. Press Next for each part.',
        items: [
          ['Data files', 'The rows sit in **Parquet** files, which are columnar and compressed. Delta never edits a Parquet file. A change writes new files.', 'Immutable files.'],
          ['The log', 'The folder `_delta_log` holds one JSON file for each commit, numbered `00000000000000000000.json`, `00000000000000000001.json` and so on. Each says which files were added and which were removed.', 'One JSON file for each commit.'],
          ['The table is the replay', 'To read the table, a reader replays the log in order. An `add` puts a file in the set, a `remove` takes it out. The files left are the table. You will do this yourself in the lab.', 'The log decides which files count.'],
          ['An atomic commit', 'A writer creates the next numbered JSON file. Storage allows only one writer to create a given file name, so either the whole commit exists or none of it does. A reader never sees half a change.', 'All or nothing.'],
          ['Checkpoints', 'After a number of commits, Delta writes a checkpoint, a Parquet summary of the state, so a reader does not replay thousands of JSON files. This recording is short, so it holds none.', 'A shortcut for long logs.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'Why this matters for you.', t: 'The log makes four features possible: safe concurrent writes, time travel, `RESTORE`, and an audit trail of every change.' }
      }),

      B.rows({
        id: 'm3-folder', t: 1, src: 'rec', title: 'What the folder looks like',
        steps: [
          {
            say: 'This is the folder right after the first write: three orders in one Parquet file. The log holds one JSON file for version 0 and a small checksum file next to it.',
            code: { file: 'orders/ after version 0', lang: 'text', code: tree(V0) },
            notes: ['The `.crc` file is a checksum of the table state. `_staged_commits` is a folder Delta uses for commits.']
          },
          {
            say: 'This is the same folder after six versions. The log has six commits. The folder holds **' + V5.files.length + '** Parquet files, and the table uses only **1** of them. Updates, deletes and the compaction replaced the others, and the log still points to them for time travel.',
            code: { file: 'orders/ after version 5', lang: 'text', code: tree(V5) },
            notes: ['The old files cost storage until `VACUUM` removes them. Mission 4 covers it.']
          }
        ]
      }),

      B.code({
        id: 'm3-commit', t: 1, src: 'rec', title: 'The first commit, line by line', file: '00000000000000000000.json', lang: 'json', code: COMMIT0,
        steps: [
          { say: 'This is the real file for version 0. A commit is a list of actions. Each action is one JSON object. Press Next to read them.', lines: null },
          { say: '`commitInfo` records what happened: the operation (WRITE), the engine that did it, the mode, and the metrics. `isBlindAppend` is true because this write added rows without reading the table.', lines: G.span(COMMIT0, /"commitInfo"/, /^\}/) },
          { say: '`metaData` holds the table id, the format, the partition columns and the schema. The schema is a JSON string, which I shortened here. Every schema change writes a new `metaData` action.', lines: G.span(COMMIT0, /"metaData"/, /"schemaString"/) },
          { say: '`protocol` says which reader and writer features a client needs. Here: reader version ' + 1 + ', writer version ' + 2 + '. A client that does not know the version must refuse to touch the table.', lines: G.span(COMMIT0, /"protocol"/, /"minWriterVersion"/) },
          { say: '`add` registers one data file: its path, its size, and **statistics**: the row count, and the smallest and largest value of each column. Delta writes the statistics for the first columns of the table by default (documentation).', lines: G.span(COMMIT0, /"add"/, /"stats"/) },
          { say: 'The `minValues` and `maxValues` are what data skipping reads. A query for `customer_id = \'C-90\'` can skip this file without opening it, because C-42 to C-77 cannot contain C-90. Mission 4 measures it.', lines: G.span(COMMIT0, /"minValues"/, /"nullCount"/) }
        ],
        note: 'The path is shown as `part-0001.snappy.parquet`. Real file names carry a random id. I renamed them in the recording so the same file has the same name in every commit.'
      }),

      B.widget({ id: 'm3-lab', kind: 'deltalog', t: 1, src: 'rec', title: 'Lab: replay the Delta log' }),

      B.sql({
        id: 'm3-history', t: 1, src: 'rec', title: 'DESCRIBE HISTORY: the story of the table', file: 'sql editor', code: HIST_SQL,
        result: { cols: ['version', 'operation', 'what changed', 'log actions'], rows: HISTROWS, msg: HISTROWS.length + ' versions', trk: 3 },
        steps: [
          { say: 'One statement lists every commit. The real result has more columns: the user, the time, the operation parameters and all metrics. I kept four so that the table fits. Press Run.', lines: [1, 1] },
          { say: 'Read the table from top to bottom. Version 0 and 1 are writes. 1 is a **blind append**, so it never conflicts with another append.', lines: [1, 1], run: true },
          { say: 'An `UPDATE` and a `DELETE` do not edit a file. Each rewrote one Parquet file: one `remove` and one `add`. This is copy-on-write.', lines: [1, 1], run: true },
          { say: 'Version 4 is the `MERGE`: five new rows, no update. Version 5 is `OPTIMIZE`. It joined five small files into one. The table held the same rows before and after.', lines: [1, 1], run: true }
        ],
        note: 'Delta keeps this history for 30 days by default (documentation: the table property `delta.logRetentionDuration`). Time travel can only go back as far as both the log and the data files still exist.'
      }),

      B.cmp({
        id: 'm3-ops', t: 1, src: 'rec', title: 'What each operation writes',
        say: 'Each operation leaves a different pattern in the log. Press Next to read them. The last column comes straight from the commits.',
        cols: ['Operation', 'What it does to files', 'Blind append', 'In the recording'],
        hl: 3,
        rows: [
          ['`INSERT` or append', 'Adds new files. Touches nothing else.', 'Yes', 'Version 1: ' + actionsOf(1) + '.'],
          ['`UPDATE`', 'Rewrites each file that holds a matching row.', 'No', 'Version 2: ' + actionsOf(2) + '.'],
          ['`DELETE`', 'Rewrites each file that holds a matching row, without that row.', 'No', 'Version 3: ' + actionsOf(3) + '.'],
          ['`MERGE`', 'Reads source and target, then adds files for inserts and rewrites files for updates and deletes.', 'No', 'Version 4: ' + actionsOf(4) + '.'],
          ['`OPTIMIZE`', 'Joins small files into big ones. The rows stay the same.', 'No', 'Version 5: ' + actionsOf(5) + '.']
        ],
        steps: [
          { upto: 2, say: 'An append only adds. An update reads the files that contain matching rows and replaces them with new copies.' },
          { upto: 4, say: 'A delete works the same way. A merge combines an insert path and an update path in one atomic commit.' },
          { upto: 5, say: '`OPTIMIZE` changes only the layout. Its `add` and `remove` actions carry `dataChange: false`, so a stream that reads the table does not see them as new data.' }
        ],
        pick: 'Remember the cost model: a **small change to a big file rewrites the whole file**. That is why the layout and deletion vector scenes come next.'
      }),

      B.sql({
        id: 'm3-tt', t: 1, src: 'rec', title: 'Time travel: query an old version', file: 'sql editor', code: TT_SQL,
        result: { cols: G.table('delta.version_1').cols, rows: G.table('delta.version_1').rows, msg: '5 rows as of version 1' },
        steps: [
          { say: '`VERSION AS OF 1` reads the table as the log described it after the second commit. Delta replays the log up to that version and reads those files.', lines: [2, 2] },
          { say: 'Press Run. The table had five orders then, including O-5005, which was cancelled. Version 3 deleted it, so a current query no longer shows it.', lines: [1, 3], run: true },
          { say: 'You can also use `TIMESTAMP AS OF` with a time. The version number is more exact, so take it from `DESCRIBE HISTORY`.', lines: [2, 2], run: true }
        ],
        note: 'Time travel reads files that the log lists for that version. If `VACUUM` has deleted them, the query fails. Mission 4 records that error.'
      }),

      B.sql({
        id: 'm3-restore', t: 1, src: 'rec', title: 'RESTORE: undo a bad change', file: 'sql editor', code: RESTORE_SQL,
        result: { cols: G.table('delta.after_restore').cols, rows: G.table('delta.after_restore').rows, msg: 'the table now equals version 1' },
        steps: [
          { say: 'A bad delete or a wrong merge happened. `RESTORE` makes the table equal to an older version.', lines: [1, 1] },
          { say: 'Press Run. The table has the five rows of version 1 again.', lines: [1, 1], run: true },
          { say: 'Restore is not a rewind. It writes a **new commit**, version 6, that adds back the files of version 1 and removes the current ones. It restored ' + RESTORE.num_restored_files + ' files and removed ' + RESTORE.num_removed_files + '. The history stays complete, and you can undo the restore.', lines: [1, 1], run: true }
        ],
        note: 'Restore needs the old data files. After `VACUUM` deletes them, the restore fails. Teams that run VACUUM with a short retention lose this safety net.'
      }),

      B.quiz({
        id: 'm3-q1', t: 1,
        q: 'A teammate runs `DELETE FROM orders WHERE status = \'CANCELLED\'` on the wrong table. It is 10 minutes later. What is the fastest safe fix?',
        opts: [
          { t: 'Reload the table from the source system', fb: 'It works but takes hours, and the source may have changed since.' },
          { t: 'Run `DESCRIBE HISTORY`, find the version before the delete, and run `RESTORE TABLE ... TO VERSION AS OF` that version', fb: '' },
          { t: 'Nothing can be done: a DELETE is permanent', fb: 'The delete wrote a new version. The old files are still there until VACUUM runs.' },
          { t: 'Create a new table and insert the rows by hand', fb: 'You do not know all the rows, and by hand you will miss some.' }
        ],
        ok: 1, why: 'The delete is version N in the log. The data before it still exists as files, so `RESTORE` can make the table equal to version N minus 1. This works only while the files exist, so the retention period of `VACUUM` is part of your recovery plan.'
      }),

      B.code({
        id: 'm3-schema', t: 1, src: 'rec', title: 'Schema enforcement and evolution', file: 'schema.py', lang: 'python', code: SCHEMA_CODE,
        compiled: { label: 'The error Delta raised for the first append', file: 'error message', lang: 'text', code: ERR_EXTRA },
        steps: [
          { say: 'A new column, `channel`, appears in the incoming data. The table does not have it. What should happen?', lines: [1, 1] },
          { say: 'Delta refuses the write. It checks the schema of the data against the schema of the table, and a mismatch is an error. This is **schema enforcement**. It protects the table from a silent drift.', lines: [3, 3], compiled: true, clines: [1, 1] },
          { say: 'The error prints both schemas. The table has six columns. The data has seven. The extra column is the last line.', lines: [3, 3], compiled: true, clines: [G.at(ERR_EXTRA, /Table schema/), ERR_EXTRA.split('\n').length] },
          { say: 'If the new column is wanted, say so. `mergeSchema` adds the column to the table. This is **schema evolution**, and you opt in on every write or with a session setting.', lines: [5, 7] }
        ],
        note: 'After the evolving write, the old rows have `NULL` in the new column, and the new rows have `web`. Delta does not rewrite the old files for this. The table now looks like this:'
      }),

      B.rows({
        id: 'm3-evolved', t: 1, src: 'rec', title: 'The table after evolution',
        steps: [
          {
            say: 'Three old rows have `NULL` for channel. The two new rows have `web`. The old Parquet files stayed as they were. A reader fills in `NULL` for a column that a file does not have.',
            tabs: [{ layer: 'DELTA', name: 'orders after mergeSchema', c: 'int', cols: G.table('delta.after_merge_schema').cols, rows: G.table('delta.after_merge_schema').rows, trk: 3 }],
            code: { file: 'printSchema()', lang: 'text', code: G.text('delta.schema_after_merge') },
            notes: ['Adding a column is cheap. Changing the type of a column is not: an incompatible type fails, as the next table shows.']
          }
        ]
      }),

      B.cmp({
        id: 'm3-errors', t: 1, src: 'rec', title: 'Delta errors you will read',
        say: 'These are real messages from this recording. Press Next to read what each means and what you do about it.',
        cols: ['Error', 'What caused it', 'What you do'],
        hl: 2,
        rows: [
          ['`DELTA_METADATA_MISMATCH`', 'The data has a column the table does not have.', 'Fix the source, or add `mergeSchema` if the column is wanted.'],
          ['`DELTA_FAILED_TO_MERGE_FIELDS`', 'A column has an incompatible type: text arrived for a decimal column. ' + G.text('delta.err_type'), 'Cast in the pipeline, before the write.'],
          ['`DELTA_VIOLATE_CONSTRAINT_WITH_VALUES`', 'A row broke a CHECK constraint: ' + G.text('delta.err_constraint').split('\n')[0].replace(/^\[[A-Z_]+\] /, ''), 'Fix or quarantine the row.'],
          ['`DELTA_NEW_CHECK_CONSTRAINT_VIOLATION`', 'You added a constraint that rows already in the table break.', 'Clean the rows first, then add the constraint.'],
          ['`DELTA_CONCURRENT_APPEND`', 'A concurrent write added data that your operation should have read.', 'Retry, and narrow the condition. See the writers lab below.']
        ],
        steps: [
          { upto: 2, say: 'Schema errors protect the table from bad shapes and bad types.' },
          { upto: 4, say: 'Constraint errors protect it from bad values.' },
          { upto: 5, say: 'A conflict error is not about the data at all. It is about timing.' }
        ],
        pick: 'Read the **error class in brackets** first. It names the rule that was broken. The text after it carries the values, the two schemas or the version number.'
      }),

      B.bug({
        id: 'm3-bug', t: 1, q: 'The nightly job should add the new day\'s orders to the silver table. After it runs, the table holds only yesterday\'s rows. Click the line that causes it.',
        file: 'load_daily.py', lang: 'python', code: OVERWRITE_BUG, bad: [G.at(OVERWRITE_BUG, /overwrite/)],
        hint: 'One word in the write mode decides between adding rows and replacing the table.',
        why: '`mode("overwrite")` replaces the whole table with the new rows. Delta kept the old state in the log, so a `RESTORE` brings it back, but the job must append. Use `append`, or a `MERGE` when rows can arrive twice.',
        fix: OVERWRITE_FIX,
        cheer: 'The log saved the data here. Check the write mode in every review.'
      }),

      B.sql({
        id: 'm3-merge', t: 1, src: 'rec', title: 'MERGE: insert new orders, update newer ones', file: 'sql editor', code: MERGE,
        result: { cols: G.table('delta.version_4').cols, rows: G.table('delta.version_4').rows, msg: MERGE_M.numTargetRowsInserted + ' inserted, ' + MERGE_M.numTargetRowsUpdated + ' updated, table now ' + G.table('delta.version_4').rows.length + ' rows', trk: 8 },
        steps: [
          { say: '`MERGE` compares a source of new rows with the target table. Here the source holds the orders that arrived on 16 and 17 March.', lines: G.span(MERGE, /MERGE INTO/, /USING/) },
          { say: 'The `ON` clause says how a source row finds its target row: the same `order_id`. Use a key that is unique in the target. If two target rows match, or two source rows match one target row, the merge fails.', lines: G.span(MERGE, /^ON/, /^ON/) },
          { say: '`WHEN MATCHED` runs when the key exists. The extra condition `s._loaded_at > t._loaded_at` updates the row only when the source row is newer. A resend of an old file cannot overwrite a newer row.', lines: G.span(MERGE, /WHEN MATCHED/, /WHEN MATCHED/) },
          { say: '`WHEN NOT MATCHED` runs for a new key. It inserts the row. `INSERT *` and `UPDATE SET *` map columns by name.', lines: G.span(MERGE, /WHEN NOT MATCHED/, /WHEN NOT MATCHED/) },
          { say: 'Press Run. All five orders were new, so the merge inserted ' + MERGE_M.numTargetRowsInserted + ' and updated ' + MERGE_M.numTargetRowsUpdated + '. It read ' + MERGE_M.numSourceRows + ' source rows. Mission 5 shows the update path with a real resend.', lines: G.span(MERGE, /MERGE INTO/, /INSERT/), run: true }
        ],
        note: 'The merge is one atomic commit (version 4 in the history). It wrote ' + MERGE_M.numTargetFilesAdded + ' new files and removed ' + MERGE_M.numTargetFilesRemoved + '.'
      }),

      B.sql({
        id: 'm3-constraint', t: 1, src: 'rec', title: 'CHECK constraints keep bad values out', file: 'sql editor', code: CONSTRAINT_SQL,
        result: { cols: ['statement', 'outcome'], rows: [['ALTER TABLE ... ADD CONSTRAINT positive_total', 'ok'], ['INSERT with total_usd = -5.00', 'rejected: DELTA_VIOLATE_CONSTRAINT_WITH_VALUES'], ['ALTER TABLE ... ADD CONSTRAINT never_free', 'rejected: DELTA_NEW_CHECK_CONSTRAINT_VIOLATION']], msg: 'three statements' },
        steps: [
          { say: 'A constraint is a rule that Delta checks on every write. This one says the total must be positive.', lines: [1, 1] },
          { say: 'An insert with a negative total fails, and nothing is written. The message names the constraint and prints the offending value: `total_usd : -5.00`.', lines: [3, 3] },
          { say: 'The reverse also holds. Adding a rule that existing rows break fails, and the message counts them: **3 rows** broke the rule `total_usd > 100`.', lines: [5, 5] },
          { say: 'Press Run. Delta stores the rule as a table property, `delta.constraints.positive_total`. A constraint guards the door. It does not clean what is already inside.', lines: [1, 5], run: true }
        ],
        note: 'The two messages, as recorded: ' + CONSTRAINT_OUT.replace(/\n+/g, ' | ')
      }),

      B.widget({ id: 'm3-conflict-lab', kind: 'conflicts', t: 2, src: 'rec', title: 'Lab: two writers at once' }),

      B.code({
        id: 'm3-conflict', t: 2, src: 'rec', title: 'The conflict error, read slowly', file: 'error message', lang: 'text', code: ERRMSG_CONFLICT,
        steps: [
          { say: 'This is what writer A received when its `UPDATE` lost the race with an append. I read it in pieces.', lines: null },
          { say: 'The bracket names the class: `DELTA_CONCURRENT_APPEND`. A concurrent write **added data**, and your operation had read the table, so it should have seen that data.', lines: [1, 1] },
          { say: 'It names the winner and the version: a concurrent `WRITE` committed at **version 1**. Look this version up in `DESCRIBE HISTORY` to learn who it was.', lines: [1, 1] },
          { say: 'Delta uses **optimistic concurrency**. Each writer works without a lock, then tries to commit the next version number. Before it commits, Delta checks whether the commits that landed in between touch what this writer read. If they do, the writer fails and must retry.', lines: [1, 1] }
        ],
        note: 'In the recording the retry of the same update, without a competitor, committed. Retries solve a rare conflict. If conflicts are frequent, change the schedule or narrow the conditions.'
      }),

      B.decide({
        id: 'm3-dec1', t: 2, src: 'rec', title: 'Decision: how do you load the daily orders?',
        scenario: 'The silver orders table holds **500 million rows**. Each night a file arrives with about **200,000 orders**. About 5 percent are updates to orders from the last **14 days**, such as a status change. The rest are new. The same file is sometimes sent twice.',
        opts: [
          { t: 'Overwrite the whole table from bronze every night', d: 'Simple. The result is always correct.', lose: 'It rewrites 500 million rows to change about 10,000. The run takes long, costs a lot, and a failure in the middle needs a restore. It is right only for small tables.' },
          { t: 'Append every file as it arrives and remove duplicates when you query', d: 'Fast writes.', lose: 'Every reader must know to deduplicate, and one forgetful query double counts revenue. The table also grows with every resend.' },
          { t: 'MERGE by `order_id`, updating only when the source row is newer', d: 'Inserts new orders, updates changed ones, and ignores a resend.' }
        ],
        pick: 2,
        why: 'The merge touches only the files that hold matching orders, and the extra condition makes it safe to run twice. Add the order date to the join condition so Delta reads only the recent files, as the next incident shows.',
        when: 'For a small table, a nightly overwrite is the simplest design and easy to reason about. For events that never change, such as clicks, append and keep every row.'
      }),

      B.incident({
        id: 'm3-inc', t: 2, src: 'rec', title: 'Incident: the nightly MERGE fails at 02:10', time: '02:15',
        alert: '**The silver merge failed with `DELTA_CONCURRENT_APPEND`.** A backfill job started at 02:00 and appends old orders to the same table. Both jobs are scheduled on purpose.',
        clues: ['The merge reads the whole silver table to find matching orders', 'The silver table is partitioned by order date', 'The backfill writes only orders from last year'],
        opts: [
          { t: 'Read the error for the winning version, then add the order date to the merge condition so the merge reads only recent partitions', fb: '' },
          { t: 'Rerun the merge until it passes', fb: 'It may pass when the backfill ends, but the next night it fails again.' },
          { t: 'Turn the backfill off permanently', fb: 'The business asked for the backfill. You would remove a feature to hide a design problem.' },
          { t: 'Grant the job more permissions', fb: 'This is not a permission problem. Delta found a conflict in what the two jobs read and wrote.' }
        ],
        best: 0,
        why: 'The merge reads the whole table because its condition does not say which part it needs. Any append, even one to last year\'s partitions, counts as data the merge should have seen. With the date in the condition, the merge reads only recent partitions and the backfill does not conflict. The recording shows both cases: the whole-table update failed, and the update on one partition committed next to an append in another.',
        checks: [
          ['Read the class and the version', '`DELTA_CONCURRENT_APPEND`, committed by the backfill. Find that version in `DESCRIBE HISTORY`.'],
          ['Compare what each job reads', 'The merge has no partition filter. The backfill writes old partitions.'],
          ['Narrow the condition', 'Add `t.order_date = s.order_date` to the `ON` clause, or add `t.order_date >= current_date() - 14` to it.'],
          ['Keep a retry as a safety net', 'Retry once with a short wait. Do not retry in a loop.'],
          ['Confirm the next run', 'Check `DESCRIBE HISTORY` the next morning: both commits should be there.']
        ],
        tell: 'The nightly merge failed with a concurrent append error because a backfill appended to the same table at the same time. The merge read the whole table, since its condition had no partition filter, so any append counted as a conflict. I added the order date to the merge condition, so it reads only the last 14 days, and I kept a single retry. Both jobs now commit in the same night. To prevent a repeat, our review checklist asks for a partition filter on every merge into a large partitioned table.',
        prevent: ['Put the **partition column in the merge condition**', 'Schedule big backfills **away from** the nightly merge', 'Allow **one retry** with a short wait', 'Read **DESCRIBE HISTORY** when a conflict appears']
      }),

      B.cmp({
        id: 'm3-dv', t: 2, src: 'rec', title: 'Deletion vectors: delete without rewriting the file',
        say: 'Without deletion vectors, a delete rewrites the file. With them, Delta writes a small marker of the deleted row positions instead. I deleted one order from a three-order table both ways. Press Next to compare.',
        cols: ['What happened', 'Without deletion vectors', 'With deletion vectors'],
        hl: 2,
        rows: [
          ['Data files added', DVOFF_M.numAddedFiles + ' (' + DVOFF_M.numAddedBytes + ' bytes)', DVON_M.numAddedFiles + ' (' + DVON_M.numAddedBytes + ' bytes)'],
          ['Data files removed', DVOFF_M.numRemovedFiles + ' (' + DVOFF_M.numRemovedBytes + ' bytes)', DVON_M.numRemovedFiles + ' (' + DVON_M.numRemovedBytes + ' bytes)'],
          ['Rows copied into a new file', DVOFF_M.numCopiedRows, DVON_M.numCopiedRows],
          ['Deletion vectors added', DVOFF_M.numDeletionVectorsAdded, DVON_M.numDeletionVectorsAdded],
          ['Files in the table folder', String(DVOFF.files_in_folder), String(DVON.files_in_folder)],
          ['Rows after the delete', String(DVOFF.rows_after), String(DVON.rows_after)]
        ],
        steps: [
          { upto: 3, say: 'The classic delete wrote a new file with the two surviving rows and removed the old one. With a deletion vector, no data file was written at all.' },
          { upto: 5, say: 'The vector is a tiny file, 34 bytes here. The folder holds one data file and the vector. The old design needs two data files, one dead.' },
          { upto: 6, say: 'Both tables return the same rows. Readers apply the vector and skip the marked positions.' }
        ],
        pick: 'Use deletion vectors on tables that get **many small deletes and updates**. A later `OPTIMIZE` or `REORG` rewrites the files and clears the vectors. Check which engine versions can read them before you turn them on for shared tables.'
      }),

      B.code({
        id: 'm3-dvlog', t: 3, src: 'rec', title: 'A deletion vector in the log', file: 'the delete commit, with deletion vectors', lang: 'json', code: DVCOMMIT,
        steps: [
          { say: 'This is the log of the delete with deletion vectors on. The `add` carries the same data file as before, plus a `deletionVector` field.', lines: G.span(DVCOMMIT, /"add"/, /"deletionVector"/) },
          { say: '`cardinality: 1` is the number of rows marked deleted. `sizeInBytes: 34` is the size of the vector. The location is encoded, and I replaced it here.', lines: G.span(DVCOMMIT, /"deletionVector"/, /"storageType"/) },
          { say: 'The `remove` names the same file path. Delta removes the old version of the file entry and adds it back with the vector. The Parquet file itself did not change.', lines: G.span(DVCOMMIT, /"remove"/, /^\}/) }
        ]
      }),

      B.rows({
        id: 'm3-cdf', t: 2, src: 'rec', title: 'The change data feed',
        steps: [
          {
            say: 'Downstream jobs often need to know what changed, not the whole table. Turn on the **change data feed** and Delta records row-level changes next to the data.',
            code: { file: 'cdf.py', lang: 'python', code: CDF_CODE },
            notes: ['The feed adds change files for updates and deletes. Inserts are read from the data files themselves.']
          },
          {
            say: 'This is the recorded feed for a table with an insert of three orders, an update, a delete, and an append of two more orders. Each row carries a change type and the version that made it.',
            tabs: [{ layer: 'FEED', name: 'readChangeFeed from version 0', c: 'seed', cols: G.table('delta.change_feed').cols, rows: G.table('delta.change_feed').rows, trk: 3 }],
            notes: ['An update appears twice: `update_preimage` is the row before, `update_postimage` is the row after. A delete appears once, with the old values.']
          },
          {
            say: 'Use the feed to keep a downstream table in step without comparing two full snapshots, to send changes to another system, or to build an audit trail. It costs extra storage for the change files.',
            tabs: [{ layer: 'FEED', name: 'the same feed, only updates and deletes', c: 'seed', cols: G.table('delta.change_feed').cols, rows: G.table('delta.change_feed').rows.filter(function (r) { return r[2] !== 'insert'; }) }]
          }
        ]
      }),

      B.sql({
        id: 'm3-clone', t: 2, src: 'rec', title: 'Shallow clone: a copy without copying data', file: 'sql editor', code: CLONE_SQL,
        result: { cols: ['metric', 'value'], rows: [['source files', CLONE.source_num_of_files], ['source size in bytes', CLONE.source_table_size], ['files copied', CLONE.num_copied_files], ['Parquet files in the clone folder', String(CLONE.parquet_files_in_clone_folder)]], msg: 'the clone is a new log' },
        steps: [
          { say: 'A **shallow clone** creates a new table whose log points at the data files of the source. It copies the log and none of the data.', lines: [1, 1] },
          { say: 'Press Run. The source has ' + CLONE.source_num_of_files + ' files of ' + CLONE.source_table_size + ' bytes. The clone copied **' + CLONE.num_copied_files + '** files, and its own folder holds **' + CLONE.parquet_files_in_clone_folder + '** Parquet files. It took the time to write one small log.', lines: [1, 1], run: true },
          { say: 'Writes to the clone create new files in the clone and leave the source untouched. This makes a clone a cheap place to test a change on production-sized data.', lines: [1, 1], run: true }
        ],
        note: 'A deep clone copies the data files too (documentation, not run here). A shallow clone depends on the source files, so a `VACUUM` of the source can break the clone. Mission 11 uses clones for pull request checks.'
      }),

      B.quiz({
        id: 'm3-q2', t: 2,
        q: 'Two jobs append different rows to the same Delta table at the same moment. What happens?',
        opts: [
          { t: 'One of the two fails with a conflict error', fb: 'Two blind appends do not read the table, so neither invalidates the other.' },
          { t: 'Both commit. The table holds the rows of both jobs in two new versions', fb: '' },
          { t: 'The second job waits for a lock on the table', fb: 'Delta takes no locks. Writers commit optimistically.' },
          { t: 'Delta merges the two sets of rows into one version', fb: 'Each commit is its own version.' }
        ],
        ok: 1, why: 'Appends do not read what the other writer wrote, so they never conflict. In the recording, both appends committed as versions 1 and 2 and the table held 5 rows. A conflict needs a writer that **read** something the other one changed.'
      }),

      B.qa({
        id: 'qa-delta', t: 1, tag: 'Delta', secs: 60,
        q: 'What is Delta Lake, and what does the transaction log give you?',
        pts: ['A table format: Parquet files plus a JSON transaction log', 'Each commit lists add and remove actions', 'Atomic commits: readers never see half a change', 'Time travel and restore from old log versions', 'Schema enforcement and constraints', 'Concurrent writers through optimistic concurrency'],
        short: 'Delta Lake is a table format on top of cloud storage. A table is a folder of Parquet files plus a `_delta_log` folder. Each commit adds a numbered JSON file that lists the files added and removed, and a reader replays the log to find the files that make up the current table.\n\nThe log gives four things. Commits are atomic, so a reader never sees half a change. Old versions stay readable, so I can use time travel and `RESTORE` to undo a bad delete. Delta checks the schema and the constraints on every write. And several writers can work at once: each tries to commit the next version number, and a conflicting writer fails and retries.\n\nIn my test, six operations on a three-row table left six log files, nine data files in the folder, and one data file in the current table.',
        fu: [
          ['What is a checkpoint?', 'A Parquet summary of the table state, written every few commits so that a reader does not replay thousands of JSON files.'],
          ['Is a Delta table a database?', 'No. It is files and a log in your storage. Any engine that speaks the protocol can read and write it, and the compute is separate.']
        ],
        trap: 'Describing Delta as "Parquet with ACID". Name the log, the add and remove actions, and how readers use them.',
        real: 'Say what you restored or investigated with the history of a table.'
      }),

      B.qa({
        id: 'qa-schema', t: 1, tag: 'Delta', secs: 60,
        q: 'What happens when the incoming data has a new column or a changed type? How do you handle it?',
        pts: ['Schema enforcement rejects a write that does not match the table', 'A new column raises DELTA_METADATA_MISMATCH', 'mergeSchema opts in to adding the column', 'Old rows get NULL for the new column', 'An incompatible type fails; cast before the write', 'Decide on purpose, and keep a record'],
        short: 'By default Delta enforces the table schema. If the data has a column the table lacks, the write fails with `DELTA_METADATA_MISMATCH` and the message prints both schemas. If a column has an incompatible type, it fails with `DELTA_FAILED_TO_MERGE_FIELDS`.\n\nI handle a wanted new column with schema evolution: I set `mergeSchema` on that write, and Delta adds the column. The old rows read `NULL` for it, and Delta does not rewrite the old files. I do not turn evolution on globally, because a typo in a column name would then create a new column silently.\n\nFor a type problem I cast in the pipeline before the write, and I decide in review whether the source change is real. In bronze I often keep the raw text and cast in silver, so a bad value does not stop ingestion.',
        fu: [
          ['Can you drop or rename a column?', 'Yes, with column mapping enabled on the table (documentation: `delta.columnMapping.mode`). Without it, you rewrite the table.'],
          ['Where do you allow evolution?', 'In bronze, where new source columns should land. Silver and gold have a contract, so a change goes through review.']
        ],
        trap: 'Saying "Delta handles schema changes automatically". It rejects them unless you say so.',
        real: 'Describe a schema change that arrived without warning and how you dealt with it.'
      }),

      B.qa({
        id: 'qa-merge', t: 2, tag: 'Delta', secs: 90,
        q: 'How do you write a MERGE that is safe to run twice and safe with late or duplicate data?',
        pts: ['A unique key in the target and one row per key in the source', 'Deduplicate the source: newest row for each key', 'Update only when the source row is newer', 'Insert when not matched', 'A partition filter in the condition to limit what is read', 'Check the metrics: inserted, updated, deleted'],
        short: 'First I make sure the source has one row per key. If the source can hold several versions of an order, I keep the newest with a window function. Two source rows that match one target row make the merge fail.\n\nThen I write the merge with a guard: `WHEN MATCHED AND s._loaded_at > t._loaded_at THEN UPDATE SET *` and `WHEN NOT MATCHED THEN INSERT *`. The guard means a resend of an old file cannot overwrite a newer row, so I can run the merge twice and get the same table. In my test the rerun with the same data updated zero rows.\n\nFor a large partitioned table I add the partition column to the condition, so Delta reads only the files it needs, and so a backfill does not cause a conflict. After the run I read the metrics in `DESCRIBE HISTORY`: rows inserted, updated and deleted. A sudden change in those numbers is my alert.',
        fu: [
          ['What if the source has duplicates on the key?', 'The merge fails with an error about multiple source rows matching one target row. Deduplicate first.'],
          ['How do you handle deletes from the source?', 'Add `WHEN MATCHED AND s.deleted THEN DELETE`, or `WHEN NOT MATCHED BY SOURCE` to remove rows that vanished (documentation, current Delta versions).']
        ],
        trap: 'Forgetting to deduplicate the source. A merge with duplicate source keys fails or behaves unpredictably.',
        real: 'Describe a merge you made idempotent and what went wrong before.'
      }),

      B.qa({
        id: 'qa-conflict', t: 2, tag: 'Delta', secs: 90,
        q: 'How does Delta Lake handle two writers at the same time? When does a write fail?',
        pts: ['Optimistic concurrency: no locks', 'A writer commits the next version number if no conflicting commit came in between', 'Blind appends never conflict with each other', 'An update or merge fails if a concurrent commit changed data it read', 'Partition filters narrow what counts as read', 'Retry once; change the schedule or the condition if it repeats'],
        short: 'Delta uses optimistic concurrency. A writer reads the current version, does its work without locks, and then tries to commit the next version number. Storage allows only one file with that name, so one writer wins. For the others, Delta checks whether the commits that landed in the meantime touch what this writer read. If not, the writer commits on top. If so, it fails with an exception such as `DELTA_CONCURRENT_APPEND` and must retry.\n\nIn my test two appends both committed, because neither read the table. An update that scanned the whole table failed when a concurrent append added rows. An update restricted to one partition committed next to an append in another partition.\n\nSo I narrow the conditions with partition filters, keep big backfills away from the nightly merge, and retry once. I read `DESCRIBE HISTORY` to find the commit that won.',
        fu: [
          ['Is there a lock I can take?', 'No. Delta is designed to commit without locks. Use scheduling or narrower conditions.'],
          ['What about the isolation level?', 'Delta offers `Serializable` and `WriteSerializable`, set with the table property `delta.isolationLevel`. The commit records the level it used.']
        ],
        trap: 'Answering "Delta locks the table". It checks for conflicts at commit time.',
        real: 'Describe a conflict you saw in production and how you removed it.'
      }),

      B.recap({
        id: 'm3-recap', n: 3, badge: 'Delta Keeper', color: '#BBF7D0',
        pts: [
          'A Delta table is **Parquet files plus a JSON log**. The table is what the log says is live.',
          'Updates and deletes **rewrite files**: a `remove` and an `add`. Old files stay for time travel until VACUUM.',
          '`DESCRIBE HISTORY`, `VERSION AS OF` and `RESTORE` undo mistakes. Restore is a new commit.',
          'Delta **rejects** a wrong shape or a bad value. `mergeSchema` is an opt-in.',
          'A **MERGE** needs a unique key, a deduplicated source and an "only if newer" guard.',
          'Writers commit **without locks**. Appends do not conflict. A read-then-change can.',
          'Deletion vectors, the change feed and shallow clones each trade a little complexity for a big saving.'
        ],
        lines: [
          'I read the log before I trust the table.',
          'I make every merge safe to run twice.',
          'I put the partition column in the merge condition.'
        ]
      })
    ]
  });
})();
