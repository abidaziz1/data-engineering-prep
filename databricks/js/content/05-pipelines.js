/* Mission 5: bronze, silver and gold. A file stream into bronze, a MERGE into silver, a rebuild of gold, and a type 2 dimension.
   The code ran on open-source Spark and Delta Lake. Auto Loader is a Databricks feature, so its screen comes from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var RUNS = G.counts('stream.bronze_runs'), SR1 = G.counts('stream.silver_run_1'), SR2 = G.counts('stream.silver_run_2');
  var BRZH = G.history('stream.bronze_history'), SILVH = G.history('stream.silver_history'), DIMH = G.history('pipeline.dim_history');
  var SM1 = SILVH[1].operationMetrics, SM2 = SILVH[2].operationMetrics, DM = DIMH[1].operationMetrics;
  var GOLD = G.table('stream.gold_rows'), DIMB = G.table('pipeline.dim_before'), DIMA = G.table('pipeline.dim_after');
  var DUP = G.table('stream.bronze_duplicates'), SAMPLE = G.table('stream.bronze_sample'), SILVER_ROWS = G.table('stream.silver_rows');
  var CK = G.listing('stream.checkpoint_bronze');
  var BRONZE = G.file('stream/bronze.py'), SILVER = G.file('stream/silver.py'), GOLDPY = G.file('stream/gold.py'), SCD = G.file('pipeline/scd2.py');
  var ERR_DUP = G.text('delta.err_merge_duplicates');
  var money = function (x) { return '$' + x.toFixed(2); };

  var GOLD_TOTAL = GOLD.rows.reduce(function (a, r) { return a + parseFloat(r[2]); }, 0);
  var HEAD = G.table('spark.orders_head').rows;
  var totalOf = function (id) { return parseFloat(HEAD.filter(function (r) { return r[0] === id; })[0][3]); };
  var LIVE = G.table('spark.status_counts').rows.filter(function (r) { return r[0] !== 'CANCELLED'; }).reduce(function (a, r) { return a + parseFloat(r[2]); }, 0);
  var EXTRA = DUP.rows.filter(function (r) { return r[1] !== 'CANCELLED'; }).reduce(function (a, r) { return a + (parseInt(r[2], 10) - 1) * totalOf(r[0]); }, 0);
  var NAIVE = LIVE + EXTRA;
  var O5004 = function (t) { return t.rows.filter(function (r) { return r[0] === 'O-5004'; }); };

  G.expect(RUNS.length === 4 && RUNS[0].bronze_rows === 5 && RUNS[1].bronze_rows === 7 && RUNS[2].bronze_rows === 7 && RUNS[3].bronze_rows === 14 && RUNS[3].bronze_orders === 10, 'the four bronze runs hold 5, 7, 7 and 14 rows and 10 distinct orders');
  G.expect(RUNS[2].progress[0].numInputRows === 0 && BRZH.length === 3, 'the empty trigger read 0 rows and wrote no version');
  G.expect(SILVER_ROWS.rows.length === 10 && SM1.numTargetRowsInserted === '5' && SM2.numTargetRowsInserted === '5' && SM2.numTargetRowsUpdated === '0', 'the silver merges insert 5 and 5 rows and update none');
  G.expect(GOLD.rows.length === 4 && GOLD_TOTAL.toFixed(2) === '312.00' && NAIVE.toFixed(2) === '462.00', 'gold totals 312.00 and a naive sum over bronze gives 462.00');
  G.expect(DM.numTargetRowsInserted === '2' && DM.numTargetRowsUpdated === '1' && DIMA.rows.length === 6 && DIMB.rows.length === 4, 'the dimension merge inserts 2 rows and updates 1');
  G.expect(DUP.rows.length === 2 && SAMPLE.rows.length === 2, 'two orders arrived twice');

  var SILVER_FN = SILVER.slice(0, SILVER.indexOf('\n\nquery'));
  var BUG = [
    'def upsert_orders(batch_df, batch_id):',
    '    (DeltaTable.forPath(spark, silver).alias("t")',
    '        .merge(batch_df.alias("s"), "t.order_id = s.order_id")',
    '        .whenMatchedUpdateAll()',
    '        .whenNotMatchedInsertAll()',
    '        .execute())'
  ].join('\n');
  var AUTOLOADER = [
    'bronze_stream = (spark.readStream',
    '    .format("cloudFiles")',
    '    .option("cloudFiles.format", "json")',
    '    .option("cloudFiles.schemaLocation", schema_path)',
    '    .load(landing))',
    '',
    '(bronze_stream.writeStream',
    '    .option("checkpointLocation", ckpt_bronze)',
    '    .trigger(availableNow=True)',
    '    .toTable("brewline_prod.bronze.orders"))'
  ].join('\n');

  var landed = [];
  RUNS.forEach(function (r) { r.landed.forEach(function (f) { landed.push([f.file, String(f.rows), r.label]); }); });
  var runRows = RUNS.map(function (r, k) {
    var p = r.progress[0], ver = k === 0 ? '0' : k === 1 ? '1' : k === 2 ? 'none' : '2';
    return [r.label, r.landed.length ? r.landed.map(function (f) { return f.file; }).join(', ') : 'none', String(p.numInputRows), String(p.batchId), String(r.bronze_rows), String(r.bronze_orders), ver];
  });
  function changedCells(before, after) {
    var out = [];
    after.rows.forEach(function (r, i) {
      var old = before.rows.filter(function (b) { return b[0] === r[0] && b[2] === r[2]; })[0];
      r.forEach(function (c, j) { if (!old || old[j] !== c) out.push([i, j]); });
    });
    return out;
  }

  LAB.addChapter({
    id: 'm5', n: 5, title: 'Pipelines: bronze, silver, gold', short: 'Pipelines', blurb: 'A file stream, a MERGE, a rebuilt gold table and a type 2 dimension', minutes: 46,
    focus: ['stg', 'int', 'mart'],
    goals: [
      'Say what **bronze, silver and gold** hold and why raw data is not cleaned on the way in.',
      'Ingest files with a stream that **remembers what it has read**, and read its progress.',
      'Build silver with **`foreachBatch` and `MERGE`**, so a resent file changes nothing.',
      'Build gold, and a **type 2 dimension** that keeps history.',
      'Explain what happens on a rerun, an empty trigger and a resend.'
    ],
    say: 'Mission 5 builds the Brewline pipeline for real. I ran every piece with Apache Spark ' + G.meta('spark') + ' and Delta Lake ' + G.meta('delta') + ': a file stream into bronze, a merge into silver, a gold table, and a customer dimension with history. The files, the checkpoint, the Delta log and the tables you see are the actual output. The one platform feature here, Auto Loader, comes from documentation and says so.',
    scenes: [
      B.talk({
        id: 'm5-talk', t: 1, src: 'docs', title: 'Bronze, silver and gold',
        say: 'Three layers is a naming convention that Databricks calls the medallion architecture. Each layer has one job. Press Next for each.',
        items: [
          ['Bronze: what arrived', 'Raw rows exactly as the source sent them, plus where they came from: the file name and the load time. It only grows. A resent file adds rows again, and bronze keeps them.', 'A faithful log of arrivals.'],
          ['Silver: what is true', 'Cleaned and typed data with one row for each business key. Silver removes duplicates, keeps the newest version of each order, and drops rows that are broken.', 'One row for each order.'],
          ['Gold: what the business asks', 'Small tables built for questions: revenue for each day, customers with their tier. People and dashboards read gold. Gold is rebuilt or updated from silver.', 'Tables named for questions.'],
          ['Why not clean on the way in', 'If a rule turns out wrong, you rebuild silver from bronze. If you cleaned before storing, the original is gone. Keep bronze raw, and put every rule in silver or gold.', 'Never lose the original.']
        ],
        cols: 2,
        call: { k: 'tip', h: 'Naming.', t: 'The names are not special. Some teams say raw, clean and curated. What matters is that each layer has one rule and one owner.' }
      }),

      B.rows({
        id: 'm5-follow', t: 1, src: 'rec', title: 'Follow order O-5004 through the layers',
        steps: [
          {
            say: 'Four files landed over four days. The last one is a resend: the source sent the file of 15 March a second time. That file holds order O-5004 again.',
            tabs: [{ layer: 'LANDING', name: 'files that arrived', c: 'raw', cols: ['file', 'rows', 'arrived with'], rows: landed, trk: landed.length - 1 }],
            notes: ['The stream will read each file once. It will not notice that a resend repeats an old order.']
          },
          {
            say: 'Bronze keeps both rows. Each row carries the name of the file it came from, so you can always tell which delivery produced it.',
            tabs: [
              { layer: 'LANDING', name: 'files that arrived', c: 'raw', cols: ['file', 'rows', 'arrived with'], rows: landed, trk: landed.length - 1 },
              { layer: 'BRONZE', name: 'orders, only O-5004', c: 'stg', cols: SAMPLE.cols, rows: SAMPLE.rows, chg: [[1, 3]], trk: 1 }
            ],
            ops: ['a stream appends every new file, with its name'],
            notes: ['In all, bronze holds ' + RUNS[3].bronze_rows + ' rows for ' + RUNS[3].bronze_orders + ' orders. Two orders arrived twice: ' + DUP.rows.map(function (r) { return r[0]; }).join(' and ') + '.']
          },
          {
            say: 'Silver has one row for O-5004. The merge saw the same key twice and kept the row once, because the resend was not newer.',
            tabs: [
              { layer: 'BRONZE', name: 'orders, only O-5004', c: 'stg', cols: SAMPLE.cols, rows: SAMPLE.rows, trk: 1 },
              { layer: 'SILVER', name: 'orders, only O-5004', c: 'int', cols: SILVER_ROWS.cols, rows: O5004(SILVER_ROWS), trk: 0 }
            ],
            ops: ['MERGE by order_id, keep the newest'],
            notes: ['Silver holds ' + SILVER_ROWS.rows.length + ' rows, one for each order.']
          },
          {
            say: 'Gold counts O-5004 once. The gold row for 15 March shows one order and $55.00. The other order of that day was cancelled, and gold leaves cancelled orders out.',
            tabs: [
              { layer: 'SILVER', name: 'orders, only O-5004', c: 'int', cols: SILVER_ROWS.cols, rows: O5004(SILVER_ROWS), trk: 0 },
              { layer: 'GOLD', name: 'revenue for each day', c: 'mart', cols: GOLD.cols, rows: GOLD.rows, trk: 1 }
            ],
            ops: ['group by day, without cancelled orders'],
            notes: ['The four gold rows add up to ' + money(GOLD_TOTAL) + '.']
          }
        ]
      }),

      B.code({
        id: 'm5-bronze', t: 1, src: 'rec', title: 'Bronze: read files as a stream', file: 'bronze.py', lang: 'python', code: BRONZE,
        steps: [
          { say: 'This is the code that filled bronze in the recording. It reads files from a landing folder as a **stream**, and writes them to a Delta table.', lines: null },
          { say: '`readStream` with the `json` format watches a folder. Each new file becomes input. I give it a schema, so the types are exact and Spark does not read the files twice to guess.', lines: G.span(BRONZE, /readStream/, /\.load\(landing\)/) },
          { say: 'The `select` adds two columns that bronze needs: the name of the file each row came from, read from the hidden `_metadata` column, and the time of loading.', lines: G.span(BRONZE, /\.select/, /\.select/) },
          { say: '`writeStream` writes to a Delta table. The `checkpointLocation` is where the stream stores what it has already read. Without it, a restart would read every file again.', lines: G.span(BRONZE, /query = /, /checkpointLocation/) },
          { say: '`trigger(availableNow=True)` says: process everything that is new now, then stop. You schedule the job, for example every hour. The stream does not stay up and bill all day.', lines: G.span(BRONZE, /availableNow/, /availableNow/) },
          { say: '`awaitTermination` waits for the run to finish, so the job ends when the work is done.', lines: G.span(BRONZE, /awaitTermination/, /awaitTermination/) }
        ],
        note: 'I used the plain Spark file source here, so the code runs anywhere. On Databricks you would normally use Auto Loader, shown two screens later.'
      }),

      B.rows({
        id: 'm5-runs', t: 1, src: 'rec', title: 'Four runs of the same stream',
        steps: [
          {
            say: 'I ran the stream four times, with new files landing in between. Each run is one trigger. The first run read the file of 14 March.',
            tabs: [{ layer: 'STREAM', name: 'progress after run 1', c: 'stg', cols: ['run', 'new files', 'rows read', 'batch id', 'bronze rows', 'distinct orders', 'Delta version'], rows: runRows.slice(0, 1), trk: 0 }],
            notes: ['Bronze holds ' + RUNS[0].bronze_rows + ' rows, but only ' + RUNS[0].bronze_orders + ' orders: the source sent O-5001 and O-5003 twice, first as PLACED and then as SHIPPED.']
          },
          {
            say: 'Run 2 read only the new file. It did not read the first file again. The stream remembers it in the checkpoint.',
            tabs: [{ layer: 'STREAM', name: 'progress after run 2', c: 'stg', cols: ['run', 'new files', 'rows read', 'batch id', 'bronze rows', 'distinct orders', 'Delta version'], rows: runRows.slice(0, 2), trk: 1 }]
          },
          {
            say: 'Run 3 found nothing new. The stream read **0 rows** and wrote no new Delta version. A scheduled run with no new files is cheap and safe.',
            tabs: [{ layer: 'STREAM', name: 'progress after run 3', c: 'stg', cols: ['run', 'new files', 'rows read', 'batch id', 'bronze rows', 'distinct orders', 'Delta version'], rows: runRows.slice(0, 3), trk: 2 }],
            notes: ['The batch id did not move forward, because no batch of data was committed.']
          },
          {
            say: 'Run 4 found two files: the new data, and the resend. It read both and appended **7 rows**. Bronze now holds ' + RUNS[3].bronze_rows + ' rows for ' + RUNS[3].bronze_orders + ' orders. Bronze did not remove the duplicates. That is silver\'s job.',
            tabs: [{ layer: 'STREAM', name: 'progress after run 4', c: 'stg', cols: ['run', 'new files', 'rows read', 'batch id', 'bronze rows', 'distinct orders', 'Delta version'], rows: runRows, trk: 3 }]
          }
        ]
      }),

      B.rows({
        id: 'm5-ckpt', t: 2, src: 'rec', title: 'The checkpoint: how the stream remembers',
        steps: [
          {
            say: 'A checkpoint is a folder next to the table. After the first run, the recording shows four entries in it.',
            code: { file: 'checkpoint folder of the bronze stream', lang: 'text', code: 'checkpoint/\n' + CK.entries.map(function (e) { return '  ' + e + '/'; }).join('\n') },
            notes: ['`metadata` holds the id of the query. `sources` holds the state of each source, here the folder of files.']
          },
          {
            say: 'Before a batch runs, Spark writes what it is about to read to `offsets`. After the batch succeeds, it writes a marker to `commits`. After the first run, both folders held batch ' + CK.offsets[0] + '.',
            code: { file: 'offsets/' + CK.offsets[0], lang: 'text', code: CK.offset_0_last_line },
            notes: ['If the job dies in the middle of a batch, the restart finds an offset without a commit and runs that batch again. Delta writes are atomic, so the retried batch does not leave half-written data.']
          },
          {
            say: 'Two rules follow. Keep the checkpoint for the life of the stream, and never share one between two streams. If you delete it, the stream starts from the beginning and reads every file again.',
            code: { file: 'what the checkpoint decides', lang: 'text', code: 'delete the checkpoint   ->  every file is read again, and bronze gets duplicates\nkeep the checkpoint     ->  each file is read once, after a restart too\ntwo streams, one folder ->  they corrupt each other' }
          }
        ]
      }),

      B.quiz({
        id: 'm5-q1', t: 1,
        q: 'The bronze job runs every hour with `availableNow`. Between two runs no new file arrived. What does the second run do?',
        opts: [
          { t: 'It reads the whole landing folder again and appends every row a second time', fb: 'That would happen only without a checkpoint. The checkpoint remembers which files were read.' },
          { t: 'It reads 0 rows, writes no new version, and stops', fb: '' },
          { t: 'It fails, because there is nothing to process', fb: 'An empty trigger is normal. In the recording, run 3 read 0 rows and finished without an error.' },
          { t: 'It waits until a file arrives and keeps the cluster running', fb: '`availableNow` stops when the available data is processed. A continuous trigger would keep waiting.' }
        ],
        ok: 1, why: 'The recorded run 3 read 0 rows, the batch id stayed the same, and Delta did not get a new version. This is what makes an hourly schedule safe.'
      }),

      B.code({
        id: 'm5-autoloader', t: 2, src: 'docs', title: 'Auto Loader: the Databricks way to ingest files', file: 'bronze_autoloader.py', lang: 'python', code: AUTOLOADER,
        steps: [
          { say: 'On Databricks, **Auto Loader** replaces the plain file source. It is a stream source named `cloudFiles`. I could not run it, because it is a Databricks feature. This screen follows the documentation.', lines: null },
          { say: 'The source is `cloudFiles`, and `cloudFiles.format` names the file type. Auto Loader tracks which files it has processed in the checkpoint, like the stream you just saw.', lines: [2, 3] },
          { say: '`cloudFiles.schemaLocation` is where Auto Loader stores the schema it infers. It can also evolve the schema when a new column appears, and it can keep values that do not fit in a rescued data column, instead of failing.', lines: [4, 4] },
          { say: 'The write is the same as before: a checkpoint, `availableNow`, and a Unity Catalog table name. `toTable` writes to a table with a three-part name.', lines: [7, 10] }
        ],
        note: 'Why use it over the plain file source: Auto Loader finds new files without listing the whole folder each time, either by directory listing in an efficient way or by file notifications from your cloud, and it keeps working with millions of files. Check the documentation for the options that apply to your cloud.'
      }),

      B.rows({
        id: 'm5-dup', t: 1, src: 'rec', title: 'Why bronze keeps duplicates',
        steps: [
          {
            say: 'Two orders arrived twice. Bronze kept both copies of each, and counted them: O-5004 and O-5005 appear **2** times.',
            tabs: [{ layer: 'BRONZE', name: 'orders that arrived more than once', c: 'stg', cols: DUP.cols, rows: DUP.rows }],
            notes: ['This is correct behaviour for bronze. It records every arrival. Removing duplicates here would hide that the source resent a file, and the source team would never hear about it.']
          },
          {
            say: 'Each duplicate row names its file, so you can find the delivery that repeated it. A good practice is to alert when the share of repeated rows jumps.',
            tabs: [{ layer: 'BRONZE', name: 'the two copies of O-5004', c: 'stg', cols: SAMPLE.cols, rows: SAMPLE.rows, chg: [[1, 3]] }]
          }
        ]
      }),

      B.code({
        id: 'm5-silver', t: 1, src: 'rec', title: 'Silver: upsert with foreachBatch and MERGE', file: 'silver.py', lang: 'python', code: SILVER,
        steps: [
          { say: 'This function is the whole silver layer. A stream reads new rows from bronze, and for every micro-batch it calls `upsert_orders`.', lines: null },
          { say: 'First, keep the newest row for each order inside the batch. A batch can hold two versions of one order. `row_number` over a window gives 1 to the newest by `_loaded_at`, and the filter keeps those rows.', lines: G.span(SILVER, /newest = /, /rn = 1/) },
          { say: 'Then the merge. The key is `order_id`. If two source rows matched one target row, Delta would stop with an error, so the first step is not optional.', lines: G.span(SILVER, /DeltaTable\.forPath/, /merge\(/) },
          { say: '`whenMatchedUpdateAll` has a condition: update only when the source row is newer than the target row. A resend of an old row finds a newer row in silver and does nothing.', lines: G.span(SILVER, /whenMatchedUpdateAll/, /whenMatchedUpdateAll/) },
          { say: '`whenNotMatchedInsertAll` inserts the orders that silver does not have.', lines: G.span(SILVER, /whenNotMatchedInsertAll/, /execute/) },
          { say: 'The stream part: read bronze as a stream, call the function for each batch, keep a checkpoint, and stop when done. The checkpoint for silver is separate from the one for bronze.', lines: G.span(SILVER, /^query = /, /awaitTermination/) }
        ],
        note: 'The merge is **idempotent**. If a batch runs twice after a failure, the second run changes nothing, because no source row is newer than what silver now holds.'
      }),

      B.cmp({
        id: 'm5-silver-runs', t: 1, src: 'rec', title: 'What the two silver merges did',
        say: 'Silver ran twice. The recording kept the metrics of each merge from `DESCRIBE HISTORY`. Press Next to compare them.',
        cols: ['Metric', 'First run', 'Second run, after the resend'],
        hl: 2,
        rows: [
          ['Source rows read', SM1.numSourceRows, SM2.numSourceRows],
          ['Rows inserted', SM1.numTargetRowsInserted, SM2.numTargetRowsInserted],
          ['Rows updated', SM1.numTargetRowsUpdated, SM2.numTargetRowsUpdated],
          ['Rows copied into rewritten files', SM1.numTargetRowsCopied, SM2.numTargetRowsCopied],
          ['Files removed', SM1.numTargetFilesRemoved, SM2.numTargetFilesRemoved],
          ['Silver rows afterwards', String(SR1.silver_rows), String(SR2.silver_rows)]
        ],
        steps: [
          { upto: 2, say: 'The first run saw ' + SM1.numSourceRows + ' source rows after removing duplicates inside the batch, and inserted all ' + SM1.numTargetRowsInserted + '. Silver started empty.' },
          { upto: 3, say: 'The second run read ' + SM2.numSourceRows + ' source rows. It inserted ' + SM2.numTargetRowsInserted + ' new orders. It **updated ' + SM2.numTargetRowsUpdated + '**. The two resent rows matched, but they were not newer, so the guard left them alone.' },
          { upto: 5, say: 'A detail worth knowing: Delta copied ' + SM2.numTargetRowsCopied + ' rows and removed ' + SM2.numTargetFilesRemoved + ' files. A merge rewrites each file that holds a matched row, even when no row changes. Mission 4 explained the cost of rewriting files.' },
          { upto: 6, say: 'Silver ended with ' + SR2.silver_rows + ' rows: one for each order.' }
        ],
        pick: 'Check **rows updated** after a rerun or a resend. If it is not 0 where you expect 0, the guard is wrong or the source changed.'
      }),

      B.rows({
        id: 'm5-silver-table', t: 1, src: 'rec', title: 'The silver table',
        steps: [
          {
            say: 'Ten orders, one row each, with the newest version. Order O-5001 is SHIPPED, as in its second version. Order O-5005 stays CANCELLED, because silver keeps cancelled orders. Gold leaves them out.',
            tabs: [{ layer: 'SILVER', name: 'orders', c: 'int', cols: SILVER_ROWS.cols, rows: SILVER_ROWS.rows, trk: 4 }],
            notes: ['Silver keeps all the facts about each order. Gold decides what counts as revenue.']
          }
        ]
      }),

      B.quiz({
        id: 'm5-q2', t: 1,
        q: 'Why does the merge update a row only when `s._loaded_at > t._loaded_at`, and not simply always?',
        opts: [
          { t: 'Files can arrive late or twice, and an old row must not overwrite a newer one', fb: '' },
          { t: 'It makes the merge run faster', fb: 'The condition is about correctness. It does not speed the merge up.' },
          { t: 'Delta requires a condition on every update clause', fb: 'It does not. A clause without a condition is allowed, and that is exactly the bug in the next exercise.' },
          { t: 'Because `_loaded_at` is the primary key', fb: 'The key is `order_id`. `_loaded_at` only says which version is newer.' }
        ],
        ok: 0, why: 'A resend or a late file brings an older version of an order. Without the guard, that older row would replace the newer one in silver. In the recording, the resend of two old orders updated 0 rows.'
      }),

      B.bug({
        id: 'm5-bug', t: 1, q: 'This silver function works on the first night. On a later night it fails, and on another it silently brings back an old status. Click a line that causes the trouble.',
        file: 'silver_bug.py', lang: 'python', code: BUG, bad: [G.at(BUG, /\.merge\(/), G.at(BUG, /whenMatchedUpdateAll\(\)/)],
        hint: 'Two things are missing: a step before the merge, and a condition inside it.',
        why: 'The merge takes `batch_df` as it is. If a batch holds two versions of one order, Delta stops with `DELTA_MULTIPLE_SOURCE_ROW_MATCHING_TARGET_ROW_IN_MERGE`, as I recorded: "multiple source rows matched and attempted to modify the same target row". And `whenMatchedUpdateAll()` has no condition, so a resent old row replaces a newer one. Keep the newest row for each key first, and update only when the source row is newer.',
        fix: SILVER_FN,
        cheer: 'Both bugs are the kind that pass a test on day one.'
      }),

      B.code({
        id: 'm5-gold', t: 1, src: 'rec', title: 'Gold: revenue for each day', file: 'gold.py', lang: 'python', code: GOLDPY,
        steps: [
          { say: 'Gold reads silver, and builds the table that the business asks for: orders and revenue for each day.', lines: [1, 1] },
          { say: 'The filter leaves out cancelled orders. This is a **business rule**, so it lives in gold, not in silver. Silver keeps the cancelled order, because it is a fact.', lines: G.span(GOLDPY, /filter/, /filter/) },
          { say: 'Group by the date of the order, count the orders and add up the revenue.', lines: G.span(GOLDPY, /groupBy/, /agg/) },
          { say: 'Gold is small, so the job overwrites it with the new result each run. Delta keeps the old version in the log, so a bad run can be undone with `RESTORE`.', lines: G.span(GOLDPY, /write\.format/, /write\.format/) }
        ],
        note: 'The result has four rows, one for each day, and they add up to ' + money(GOLD_TOTAL) + '. Overwriting is simple and safe for small gold tables. For a big gold table, merge only the days that changed.'
      }),

      B.rows({
        id: 'm5-gold-table', t: 1, src: 'rec', title: 'The gold table',
        steps: [
          {
            say: 'Four days, with the number of orders and the revenue. 15 March has one order of $55.00. Its other order was cancelled.',
            tabs: [{ layer: 'GOLD', name: 'daily revenue', c: 'mart', cols: GOLD.cols, rows: GOLD.rows, trk: 1 }],
            notes: ['Total revenue is ' + money(GOLD_TOTAL) + '. If you add up the rows of bronze instead, you get ' + money(NAIVE) + '. The next incident explains the gap.']
          }
        ]
      }),

      B.code({
        id: 'm5-scd', t: 2, src: 'rec', title: 'A type 2 dimension with MERGE', file: 'scd2.py', lang: 'python', code: SCD,
        steps: [
          { say: 'The customer table must keep history. When a customer\'s tier changes, the old row is closed and a new row opens. This is a **slowly changing dimension of type 2**. Here is the change feed: C-42 moves from standard to gold, and C-55 is new.', lines: G.span(SCD, /changes = /, /effective_at timestamp/) },
          { say: 'Take the current rows of the dimension. They are the ones with `is_current` true.', lines: G.span(SCD, /dim = DeltaTable/, /current = /) },
          { say: 'Find the customers whose tier changed, and prepare their **new** row. The `merge_key` is NULL on purpose, so these rows will not match anything and will be inserted.', lines: G.span(SCD, /new_versions = /, /effective_at"\)\)/) },
          { say: 'Stage a second set: all the changes again, this time with the real customer id as the `merge_key`. These rows will match the current rows and close them.', lines: G.span(SCD, /staged = /, /changes\.selectExpr/) },
          { say: 'The merge joins on the key and `is_current`. A match with a different tier **closes** the old row: `is_current` false and `valid_to` set. A row with no match is inserted as the new current row.', lines: G.span(SCD, /\(dim\.alias/, /execute/) }
        ],
        note: 'The union of the two staged sets is the trick. One merge produces both the closed row and the new row, in one atomic commit. Without the NULL key, Delta could not insert a new row for a customer that already exists.'
      }),

      B.rows({
        id: 'm5-scd-tables', t: 2, src: 'rec', title: 'The dimension before and after',
        steps: [
          {
            say: 'Before the merge, four customers, each with one current row.',
            tabs: [{ layer: 'GOLD', name: 'dim_customers before', c: 'mart', cols: DIMB.cols, rows: DIMB.rows }]
          },
          {
            say: 'After the merge, six rows. C-42 has two rows. The standard row is closed at 16 March 08:00. The gold row opens at the same moment. C-55 is new. Yellow cells changed.',
            tabs: [{ layer: 'GOLD', name: 'dim_customers after', c: 'mart', cols: DIMA.cols, rows: DIMA.rows, chg: changedCells(DIMB, DIMA), trk: 2 }],
            notes: ['The merge read ' + DM.numSourceRows + ' staged rows, inserted ' + DM.numTargetRowsInserted + ' and updated ' + DM.numTargetRowsUpdated + '. To count orders by the tier a customer had **on the day**, join the order date to `valid_from` and `valid_to`.']
          }
        ]
      }),

      B.decide({
        id: 'm5-dec', t: 2, src: 'rec', title: 'Decision: how do you keep customer history?',
        scenario: 'Finance wants **revenue by customer tier**. A customer who moved from standard to gold in March must count as standard for February and as gold from March. The customer table has **2 million rows** and about **3,000 tier changes a month**.',
        opts: [
          { t: 'Overwrite the customer table with each customer\'s latest tier every night', d: 'Type 1. Simple.', lose: 'Every past order would be reported with the tier the customer has today. February revenue moves between tiers every time someone changes tier.' },
          { t: 'Keep every version with `valid_from`, `valid_to` and `is_current`, updated by MERGE', d: 'Type 2, as in the recording.' },
          { t: 'Append a full copy of the customer table every night', d: 'Daily snapshots.', lose: 'It stores 2 million rows a day, about 730 million a year, to record 3,000 changes a month. Every query must also pick the right day.' }
        ],
        pick: 1,
        why: 'Type 2 stores one row per change, so the table grows by about 3,000 rows a month. A join on the order date finds the tier at that time. The merge in the recording closes the old row and opens the new one in one commit.',
        when: 'If nobody asks about history, type 1 is simpler and right. For a small table, daily snapshots are easy to understand and cost little.'
      }),

      B.incident({
        id: 'm5-inc', t: 2, src: 'rec', title: 'Incident: revenue is 48 percent too high', time: '08:05',
        alert: '**The revenue dashboard shows ' + money(NAIVE) + ' for 14 to 17 March. Finance says ' + money(GOLD_TOTAL) + '.** The source team resent the file of 15 March yesterday. A teammate built a new gold table last week, straight from bronze.',
        clues: ['Bronze holds ' + RUNS[3].bronze_rows + ' rows for ' + RUNS[3].bronze_orders + ' orders', 'The silver and gold tables from the main pipeline are correct', 'The new gold table skips silver'],
        opts: [
          { t: 'Compare row counts and distinct order ids in bronze, silver and the new gold table, and group bronze by `_source_file`', fb: '' },
          { t: 'Divide the dashboard number by 1.48 and move on', fb: 'It hides the bug. The next resend will break the number again, by a different amount.' },
          { t: 'Delete the resent file from the landing folder', fb: 'Bronze already read it. Deleting it from landing changes nothing in the tables, and you lose the evidence.' },
          { t: 'Add more workers so the job finishes faster', fb: 'The number is wrong, not slow.' }
        ],
        best: 0,
        why: 'Counting rows and distinct orders at each layer shows where the extra rows appear. Bronze holds ' + RUNS[3].bronze_rows + ' rows for ' + RUNS[3].bronze_orders + ' orders, because it keeps every arrival, including the resend and the earlier versions of two orders. A gold table built from bronze adds all of them up. Silver exists to remove them.',
        checks: [
          ['Compare the layers', 'Bronze ' + RUNS[3].bronze_rows + ' rows and ' + RUNS[3].bronze_orders + ' orders. Silver ' + SILVER_ROWS.rows.length + ' rows. The new gold table sums bronze.'],
          ['Find the repeated orders', 'Group bronze by `order_id` and count. Two orders appear twice. Group by `_source_file` to find the resent file.'],
          ['Find the gold source', 'The new gold job reads `bronze`, not `silver`. That is the bug.'],
          ['Repoint and rebuild', 'Read silver, rebuild gold, and compare with finance: ' + money(GOLD_TOTAL) + '.'],
          ['Add a guard', 'A test that `order_id` is unique in silver, and a rule that gold reads only from silver.']
        ],
        tell: 'The dashboard showed 48 percent too much revenue after the source resent a file. Bronze keeps every arrival, so it held 14 rows for 10 orders. A new gold table that a teammate built straight from bronze added them all up. I compared the row and distinct order counts at each layer to find it, pointed the job at silver, rebuilt gold, and the number matched finance. To prevent it, we added a uniqueness test on silver and a rule that gold reads only from silver.',
        prevent: ['Gold reads only from **silver**, never from bronze', 'A test that the key is **unique in silver**', 'Alert when the **share of repeated rows** in bronze jumps', 'Reconcile the **revenue total** against the source system each day']
      }),

      B.qa({
        id: 'qa-medallion', t: 1, tag: 'Pipelines', secs: 60,
        q: 'Explain bronze, silver and gold. Why not clean the data as it comes in?',
        pts: ['Bronze: raw data as received, plus source file and load time, append only', 'Silver: cleaned, typed, deduplicated, one row for each key', 'Gold: business tables for questions and dashboards', 'Keep bronze raw so you can rebuild when a rule changes', 'Business rules go in gold, facts stay in silver', 'Each layer has one owner and one rule'],
        short: 'Bronze holds the data as it arrived, plus the file name and the load time. It only grows. Silver is the cleaned version: typed, deduplicated, with one row for each business key, so for orders one row per order with the newest status. Gold holds the tables the business asks about, such as revenue for each day or customers with their tier.\n\nI do not clean data on the way in, because the original would be gone. If a rule turns out to be wrong, I can rebuild silver from bronze. In my test, bronze kept a resent file and held 14 rows for 10 orders. Silver had 10 rows. Gold showed revenue without double counting.\n\nI put facts in silver and business rules in gold. For example, silver keeps a cancelled order, and gold leaves it out of revenue. That way another team can build a different gold table from the same silver.',
        fu: [
          ['Is it always three layers?', 'No. It is a convention. Some pipelines have two, some have more. What matters is one clear job for each layer.'],
          ['Where do you validate data?', 'Check the shape in bronze with a schema, and the content in silver with expectations or tests. Move bad rows to a quarantine table, and keep the pipeline running.']
        ],
        trap: 'Describing the layers without the reason. The reason is that you can rebuild when a rule changes.',
        real: 'Give a case where you rebuilt a layer from the one below, and what it saved you.'
      }),

      B.qa({
        id: 'qa-idem', t: 2, tag: 'Pipelines', secs: 90,
        q: 'How do you build a pipeline that survives resent files, late data and reruns?',
        pts: ['A stream with a checkpoint reads each file once', 'Bronze keeps every arrival and the source file', 'Silver: keep the newest row for each key inside the batch', 'MERGE with a guard: update only if newer', 'Idempotent: running a batch twice changes nothing', 'Monitor the rows updated and rows inserted for each run'],
        short: 'I make each step safe to run twice. Bronze uses a stream with a checkpoint, so each file is read once, and it keeps every arrival with its source file name. A resent file adds rows to bronze, and that is fine.\n\nSilver is where I remove duplicates. In `foreachBatch` I first keep the newest row for each key inside the batch, using `row_number` over a window ordered by the load time. Then I `MERGE` into silver on the key, and I update a matched row only when the source row is newer. Late or resent rows find a newer row and do nothing.\n\nIn my test, the second silver run read 7 rows, inserted 5 and updated 0. The two resent orders were ignored. If a batch fails halfway, the retry is safe, because Delta commits atomically and the merge changes nothing on the second pass.\n\nI watch the metrics of each run: rows inserted and rows updated. A sudden jump in updates means the source changed.',
        fu: [
          ['What if the source has no timestamp?', 'Use a sequence number, a version column, or the file order. If nothing exists, ask the source team for one. Without it you cannot tell which row is newer.'],
          ['What happens if two source rows match one target row?', 'Delta stops with `DELTA_MULTIPLE_SOURCE_ROW_MATCHING_TARGET_ROW_IN_MERGE`. That is why the batch is deduplicated first.']
        ],
        trap: 'Saying "I use MERGE so it is idempotent". The merge is idempotent only with the guard and a deduplicated source.',
        real: 'Describe a resend or a late file that hit your pipeline, and how the design handled it.'
      }),

      B.qa({
        id: 'qa-scd', t: 2, tag: 'Pipelines', secs: 90,
        q: 'How do you implement a slowly changing dimension of type 2 in Delta Lake?',
        pts: ['Columns: valid_from, valid_to, is_current', 'Detect changes by comparing the incoming row with the current row', 'Stage two sets of rows: new versions with a NULL merge key, and the changes keyed by id', 'MERGE: close the matched current row, insert the unmatched rows', 'One atomic commit', 'Join facts on the date between valid_from and valid_to'],
        short: 'I add three columns to the dimension: `valid_from`, `valid_to` and `is_current`. For each change, the old row must be closed and a new row opened, and I want both in one atomic commit.\n\nI do it with one `MERGE` and a staged source. The first part holds the new versions of the customers whose tier changed, with a `merge_key` of NULL, so they never match and get inserted. The second part holds all incoming changes keyed by the customer id, so they match the current rows. The merge joins on the key and `is_current`. When the tier differs, it sets `is_current` to false and `valid_to` to the effective time. When nothing matches, it inserts the row as current.\n\nIn my test, one tier change and one new customer produced two inserts and one update in one commit. To report on history, I join an order to the dimension on the order date between `valid_from` and `valid_to`.',
        fu: [
          ['What about late-arriving changes?', 'A change that arrives out of order needs the previous row split in two. It is harder, so many teams reject them or rebuild the dimension for that key.'],
          ['What is the difference between type 1 and type 2?', 'Type 1 overwrites the value and keeps no history. Type 2 keeps every version.']
        ],
        trap: 'Describing the idea without saying how the old row is closed and the new one inserted in one commit.',
        real: 'Describe a dimension where history mattered and the question that needed it.'
      }),

      B.qa({
        id: 'qa-autoloader', t: 2, tag: 'Pipelines', secs: 60,
        q: 'What is Auto Loader, and when would you use it instead of a plain Spark file stream?',
        pts: ['A Databricks source for incremental file ingestion: cloudFiles', 'Tracks processed files in the checkpoint', 'Finds new files efficiently, by listing or by notifications', 'Schema inference, evolution and a rescued data column', 'Works with availableNow for scheduled runs', 'Plain file source is fine for small, simple folders'],
        short: 'Auto Loader is the Databricks source for incremental file ingestion. You read with `format("cloudFiles")` and name the file format. It remembers which files it has processed in the checkpoint, like any stream, and it finds new files without listing the whole folder each time. It can use directory listing or file notifications from the cloud, so it keeps working with millions of files.\n\nIt also helps with schemas. It can infer the schema and store it, evolve it when a new column appears, and put values that do not fit into a rescued data column instead of failing the run.\n\nI use it for bronze on Databricks, with `availableNow` and a schedule. A plain file stream is fine for a small folder, or when the code must also run outside Databricks. I read this from the documentation. I did not run Auto Loader myself.',
        fu: [
          ['What is the rescued data column?', 'A column, `_rescued_data`, that holds fields that did not match the schema, so nothing is lost and the run does not fail.'],
          ['How do you handle a new column?', 'With schema evolution mode set to add new columns, the stream stops once, picks up the new schema, and continues on the next run.']
        ],
        trap: 'Claiming you used it when you read about it. Say which parts you know from practice.',
        real: 'Say which source you ingested with Auto Loader and how many files a day.'
      }),

      B.recap({
        id: 'm5-recap', n: 5, badge: 'Pipeline Builder', color: '#C7D2FE',
        pts: [
          '**Bronze** keeps every arrival with its file name. **Silver** has one row for each key. **Gold** answers business questions.',
          'A stream with a **checkpoint** reads each file once. An empty trigger reads 0 rows and writes nothing.',
          'Silver: keep the **newest row in the batch**, then **MERGE** and update only when the source row is **newer**.',
          'A resent file updated **0 rows**. The merge is safe to run twice.',
          'Gold is **rebuilt from silver**. Business rules, such as dropping cancelled orders, live here.',
          'A **type 2 dimension** closes the old row and opens a new one in one merge, using a staged union with a NULL key.',
          'Never build gold from bronze: revenue was **' + money(NAIVE) + '** instead of ' + money(GOLD_TOTAL) + '.'
        ],
        lines: [
          'I keep bronze raw and put every rule in silver or gold.',
          'I make every merge safe to run twice.',
          'I check rows updated after a rerun.'
        ]
      })
    ]
  });
})();
