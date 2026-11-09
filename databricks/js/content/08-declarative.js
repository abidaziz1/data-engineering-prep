/* Mission 8: declarative pipelines. Declare datasets, let the framework find the order, run and track them.
   The project, the runs and the errors were recorded with the open-source declarative pipelines of Apache Spark. Expectations, AUTO CDC on Delta,
   the event log and pipeline modes are Databricks features, so those screens come from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var RUNS = G.counts('sdp.runs'), DRY = G.counts('sdp.dry_run'), FULL = G.counts('sdp.full_refresh'), VERS = G.counts('sdp.versions_after_run3'), TYPO = G.counts('sdp.dry_run_typo');
  var ERR_TYPO = G.text('sdp.err_typo'), CAUSE = G.text('sdp.err_typo_cause');
  var CDC_ERR = G.text('sdp.err_autocdc'), CDC_CLASS = (/^\[([A-Z_]+)\]/.exec(CDC_ERR) || [])[1];
  G.expect(CDC_CLASS === 'AUTOCDC_TARGET_DOES_NOT_SUPPORT_MERGE' && /row-level operations/.test(CDC_ERR) && G.counts('sdp.autocdc_attempt').rc !== 0, 'open-source Spark refused AUTO CDC on a Delta target');
  var SPEC = G.file('sdp/spark-pipeline.yml'), BRZ = G.file('sdp/transformations/bronze.py'), SLV = G.file('sdp/transformations/silver.py'), GLD = G.file('sdp/transformations/gold.sql'), TYPOSQL = G.file('sdp/gold_typo.sql');
  var GOLD = G.table('sdp.gold_rows');
  var idx = function (log, re) { for (var i = 0; i < log.length; i++) if (re.test(log[i])) return i; throw new Error('no log line matches ' + re); };
  var count = function (arr, word) { return arr.filter(function (x) { return x.indexOf(word) >= 0; }).length; };
  G.expect(RUNS.length === 3 && JSON.stringify(RUNS[0].rows) === JSON.stringify({ bronze_orders: 7, gold_daily_revenue: 2, silver_orders: 5 }) && JSON.stringify(RUNS[1].rows) === JSON.stringify({ bronze_orders: 14, gold_daily_revenue: 4, silver_orders: 10 }) && JSON.stringify(RUNS[2].rows) === JSON.stringify(RUNS[1].rows), 'the three runs leave 7, 14 and 14 rows in bronze, 5, 10 and 10 in silver, 2, 4 and 4 in gold');
  G.expect(idx(RUNS[0].log, /bronze_orders has COMPLETED/) < idx(RUNS[0].log, /silver_orders is STARTING/) && idx(RUNS[0].log, /silver_orders has COMPLETED/) < idx(RUNS[0].log, /gold_daily_revenue is STARTING/), 'bronze finishes before silver starts, and silver before gold');
  G.expect(DRY.rc === 0 && TYPO.rc !== 0 && FULL.rc === 0 && /EXCLUDED/.test(FULL.log.join('\n')) && FULL.rows.bronze_orders === 14, 'the dry run passes, the typo fails, and a full refresh of bronze excludes silver and gold');
  G.expect(count(VERS.bronze_orders, 'STREAMING UPDATE') === 2 && count(VERS.silver_orders, 'TRUNCATE') === 2 && count(VERS.silver_orders, 'WRITE') === 3 && count(VERS.gold_daily_revenue, 'TRUNCATE') === 2, 'bronze takes two data commits, silver and gold are truncated and written again on runs 2 and 3');
  G.expect(/gold_daily_revenue/.test(ERR_TYPO) && /silver_ordres/.test(CAUSE) && /silver_ordres/.test(TYPOSQL), 'the typo error names the gold dataset and the misspelled table');

  var NODE = { bronze_orders: 'brz', silver_orders: 'slv', gold_daily_revenue: 'gld' };
  var STATE = { QUEUED: 'wait', PLANNING: 'run', STARTING: 'run', RUNNING: 'run', COMPLETED: 'ok', EXCLUDED: 'skip', FAILED: 'fail', SKIPPED: 'skip' };
  function runLines(log, cmd) {
    var out = [{ c: 'cmd', t: '$ ' + cmd, d: 400 }];
    log.forEach(function (l) {
      var m = /^Flow '?spark_catalog\.default\.(\w+)'? (?:is|has) (\w+)/.exec(l);
      var o = { c: 'dim', t: l, d: 70 };
      if (m && NODE[m[1]]) { o.node = NODE[m[1]]; o.st = STATE[m[2]]; o.c = o.st === 'ok' ? 'ok' : o.st === 'skip' ? 'dim' : o.st === 'fail' ? 'err' : 'out'; o.d = 260; }
      if (/^Run is COMPLETED/.test(l)) { o.c = 'ok'; o.d = 300; }
      out.push(o);
    });
    return out;
  }

  var STEPS_ROWS = RUNS.map(function (r) {
    return [r.label.replace(/^\w+ run: /, ''), r.landed.length ? r.landed.map(function (f) { return f.file; }).join(', ') : 'none', String(r.rows.bronze_orders), String(r.rows.silver_orders), String(r.rows.gold_daily_revenue)];
  });
  var COLS = ['run', 'new files', 'bronze_orders', 'silver_orders', 'gold_daily_revenue'];

  var EXPECT_PY = [
    'from pyspark import pipelines as dp',
    '',
    '',
    '@dp.table(name="silver_orders")',
    '@dp.expect("has_customer", "customer_id IS NOT NULL")',
    '@dp.expect_or_drop("positive_total", "total_usd > 0")',
    '@dp.expect_or_fail("known_status", "status IN (\'PLACED\', \'SHIPPED\', \'CANCELLED\')")',
    'def silver_orders():',
    '    return spark.readStream.table("bronze_orders")'
  ].join('\n');
  var EXPECT_SQL = [
    'CREATE STREAMING TABLE silver_orders (',
    '  CONSTRAINT has_customer EXPECT (customer_id IS NOT NULL),',
    '  CONSTRAINT positive_total EXPECT (total_usd > 0) ON VIOLATION DROP ROW,',
    "  CONSTRAINT known_status EXPECT (status IN ('PLACED', 'SHIPPED', 'CANCELLED')) ON VIOLATION FAIL UPDATE",
    ')',
    'AS SELECT * FROM STREAM(bronze_orders);'
  ].join('\n');
  var CDC_SQL = [
    'CREATE STREAMING TABLE silver_orders;',
    '',
    'CREATE FLOW silver_orders_flow AS AUTO CDC INTO silver_orders',
    'FROM STREAM(bronze_orders)',
    'KEYS (order_id)',
    'SEQUENCE BY _loaded_at',
    'STORED AS SCD TYPE 1;'
  ].join('\n');
  var EVENTS = [
    'SELECT timestamp, event_type, message',
    'FROM event_log(TABLE(brewline_prod.silver.silver_orders))',
    "WHERE event_type = 'flow_progress'",
    'ORDER BY timestamp DESC',
    'LIMIT 20;'
  ].join('\n');
  var BUG = [
    '@dp.materialized_view(name="silver_orders")',
    'def silver_orders():',
    '    df = spark.read.table("bronze_orders").dropDuplicates(["order_id"])',
    '    df.write.mode("overwrite").saveAsTable("silver_orders")',
    '    return df'
  ].join('\n');
  var BUGFIX = [
    '@dp.materialized_view(name="silver_orders")',
    'def silver_orders():',
    '    newest = Window.partitionBy("order_id").orderBy(F.col("_loaded_at").desc())',
    '    ranked = spark.read.table("bronze_orders").select(*COLUMNS, F.row_number().over(newest).alias("rn"))',
    '    return ranked.where(F.col("rn") == 1).select(*COLUMNS)'
  ].join('\n');

  LAB.addChapter({
    id: 'm8', n: 8, title: 'Declarative pipelines', short: 'Declarative', blurb: 'Declare the tables, and let the framework order, run and track them', minutes: 40,
    focus: ['snap'],
    goals: [
      'Say how a **declarative** pipeline differs from the stream, merge and overwrite code of mission 5.',
      'Tell a **streaming table** from a **materialized view**, and say when each one fits.',
      'Read a **pipeline run** and the order the framework chose.',
      'Name the three **expectation** policies and what each one does to a bad row.',
      'Say what **AUTO CDC** replaces and how triggered and continuous modes differ.',
      'Use a **dry run** to catch a broken pipeline before any data moves.'
    ],
    say: 'Mission 8 is declarative pipelines. In mission 5 you wrote the stream, the checkpoint, the merge and the order of the steps. Here you only declare what each table is, and a framework does the rest. Databricks calls its version Lakeflow Spark Declarative Pipelines. Apache Spark ' + G.meta('spark') + ' contains an open-source version, and I ran it: the project files, the runs and the errors you see are real. The features that only Databricks has, such as expectations and AUTO CDC, come from documentation, and those screens say so.',
    scenes: [
      B.talk({
        id: 'm8-talk', t: 1, src: 'rec', title: 'Declare the tables, not the steps',
        say: 'Press Next for the five ideas behind a declarative pipeline.',
        items: [
          ['Before: you wrote the steps', 'In mission 5 you wrote a stream with a checkpoint, a `foreachBatch` function with a merge, an overwrite for gold, and you chose the order of the jobs. That is **imperative**: you say how.', 'You controlled every step.'],
          ['Now: you declare each table', 'In a declarative pipeline, every file defines datasets: what a table contains, in terms of other tables. You write no checkpoint path, no write call and no trigger.', 'You say what.'],
          ['The framework finds the order', 'Silver reads `bronze_orders`. Gold reads `silver_orders`. The framework reads these references, builds a graph, and runs each dataset when its inputs are ready. In the recording it ran bronze, then silver, then gold, and no file says so.', 'The order comes from the references.'],
          ['Two kinds of dataset', 'A **streaming table** reads only new data and appends it. A **materialized view** is the result of a query, kept up to date by running the query again.', 'Append, or recompute.'],
          ['Names and versions', 'Databricks calls this Lakeflow Spark Declarative Pipelines, and called it Delta Live Tables before. Apache Spark ' + G.meta('spark') + ' has an open-source version with the same `pyspark.pipelines` module and a `spark-pipelines` command. Databricks adds expectations, AUTO CDC on Delta tables, the event log, serverless compute and the link to Unity Catalog.', 'Same idea, more features on Databricks.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm8-spec', t: 1, src: 'rec', title: 'The pipeline project file', file: 'spark-pipeline.yml', lang: 'yaml', code: SPEC,
        steps: [
          { say: 'A pipeline project is a folder with one spec file and the files that define the datasets. This is the spec that ran in the recording.', lines: null },
          { say: 'The name of the pipeline.', lines: G.span(SPEC, /^name:/, /^name:/) },
          { say: '`storage` is where the framework keeps its own state: the checkpoints of the streaming tables and what it knows about each run. It plays the role of the checkpoint folders in mission 5. Treat it as part of the pipeline.', lines: G.span(SPEC, /^storage:/, /^storage:/) },
          { say: '`libraries` says which files define datasets: every file under `transformations`, Python and SQL together.', lines: G.span(SPEC, /^libraries:/, /include:/) },
          { say: '`configuration` sets values that the code can read. Here it holds the landing folder, so the same code can run in dev and in production with different paths.', lines: G.span(SPEC, /^configuration:/, /brewline\.landing/) }
        ],
        note: 'I replaced the two paths with folders on my machine for the run. On Databricks the same settings sit in the pipeline settings of the workspace or in a bundle (mission 11), together with the target catalog and schema and the compute. That part comes from documentation.'
      }),

      B.code({
        id: 'm8-bronze', t: 1, src: 'rec', title: 'A streaming table for bronze', file: 'transformations/bronze.py', lang: 'python', code: BRZ,
        steps: [
          { say: 'This file defines bronze. Compare it with mission 5: it is much shorter, because the framework owns the checkpoint, the write and the start.', lines: null },
          { say: '`@dp.table` declares a **streaming table**. The decorator names the dataset and adds a comment.', lines: G.span(BRZ, /@dp\.table/, /@dp\.table/) },
          { say: 'The function must **return** a streaming DataFrame, here a read of JSON files from the landing folder. It does not write anything.', lines: G.span(BRZ, /def bronze_orders/, /\.load\(/) },
          { say: 'The landing folder comes from the configuration in the spec. The `select` adds the name of the source file, as in mission 5.', lines: G.span(BRZ, /\.load\(/, /_source_file/) }
        ],
        note: 'Gone from mission 5: `writeStream`, `checkpointLocation`, `trigger`, `start` and `awaitTermination`. The framework creates the table, keeps the checkpoint in `storage`, and runs the stream when you start the pipeline.'
      }),

      B.code({
        id: 'm8-silver', t: 1, src: 'rec', title: 'A materialized view for silver', file: 'transformations/silver.py', lang: 'python', code: SLV,
        steps: [
          { say: 'Silver keeps the newest version of each order. In mission 5 this was a `foreachBatch` function with a merge. Here it is a query.', lines: null },
          { say: '`@dp.materialized_view` declares a view whose result the framework keeps. The function returns a **batch** DataFrame.', lines: G.span(SLV, /@dp\.materialized_view/, /def silver_orders/) },
          { say: '`spark.read.table("bronze_orders")` is the **reference**. It is the only place where the framework learns that silver depends on bronze, so it will run silver after bronze.', lines: G.span(SLV, /spark\.read\.table/, /spark\.read\.table/) },
          { say: 'The window ranks the versions of each order by load time, and the query keeps rank 1. This is the same rule as the merge guard of mission 5, written as a query.', lines: G.span(SLV, /newest = /, /ranked = /) },
          { say: 'The final `select` keeps the six columns of silver and drops the helper column.', lines: G.span(SLV, /return ranked/, /return ranked/) }
        ],
        note: 'I use `select` and column expressions instead of `drop` and a string filter on purpose: the framework runs the function while it registers the dataset, so keep it to plain transformations that return a DataFrame.'
      }),

      B.code({
        id: 'm8-gold', t: 1, src: 'rec', title: 'A SQL materialized view for gold', file: 'transformations/gold.sql', lang: 'sql', code: GLD,
        steps: [
          { say: 'Gold is a SQL file. A pipeline can mix Python and SQL files freely. `CREATE MATERIALIZED VIEW` names the dataset.', lines: G.span(GLD, /CREATE MATERIALIZED VIEW/, /CREATE MATERIALIZED VIEW/) },
          { say: 'The query counts orders and adds up revenue for each day.', lines: G.span(GLD, /AS SELECT/, /sum\(total_usd\)/) },
          { say: '`FROM silver_orders` is the reference. A table name that matches another dataset in the pipeline is all it takes.', lines: G.span(GLD, /FROM silver_orders/, /FROM silver_orders/) },
          { say: 'The filter leaves out cancelled orders. It is the same business rule as in mission 5, and it lives in gold.', lines: G.span(GLD, /WHERE/, /GROUP BY/) }
        ]
      }),

      B.term({
        id: 'm8-run', t: 1, src: 'rec', title: 'spark-pipelines run, the first time', g: 'sdp',
        say: 'Two files had landed. This is the real output of the first run. Watch the diagram: each dataset waits in the queue, then runs when the one before it has finished.',
        initial: { brz: 'wait', slv: 'wait', gld: 'wait' },
        lines: function () { return runLines(RUNS[0].log, 'spark-pipelines run'); },
        after: 'Three datasets, one command. The framework loaded the spec and the files, built the graph and queued every dataset. Bronze ran first. Silver started only after bronze had completed, and gold after silver. I wrote no order anywhere. After the run, bronze held **' + RUNS[0].rows.bronze_orders + '** rows, silver **' + RUNS[0].rows.silver_orders + '** and gold **' + RUNS[0].rows.gold_daily_revenue + '**.',
        afterKind: 'tip',
        doneSay: 'The order came from the references. If you add a dataset that reads gold, the framework runs it last, with no change to the rest.'
      }),

      B.rows({
        id: 'm8-runs', t: 1, src: 'rec', title: 'Three runs and what changed',
        steps: [
          {
            say: 'Before any data moves, `spark-pipelines dry-run` checks the pipeline. It loads the files, builds the graph and reports errors, without reading or writing a table.',
            code: { file: 'spark-pipelines dry-run', lang: 'text', code: DRY.log.join('\n') },
            notes: ['A dry run is cheap. Put it in the check of every pull request. The incident later in this mission shows why.']
          },
          {
            say: 'Run 1. Two files landed. Bronze read seven rows, silver kept five orders, and gold has two days.',
            tabs: [{ layer: 'RUN', name: 'rows after each run', c: 'snap', cols: COLS, rows: STEPS_ROWS.slice(0, 1), trk: 0 }]
          },
          {
            say: 'Run 2. A new day and a resend arrived. Bronze appended the seven new rows, so it holds ' + RUNS[1].rows.bronze_orders + '. Silver removed the duplicates and holds ' + RUNS[1].rows.silver_orders + ' orders, one for each. Gold has four days.',
            tabs: [{ layer: 'RUN', name: 'rows after each run', c: 'snap', cols: COLS, rows: STEPS_ROWS.slice(0, 2), trk: 1 }],
            notes: ['The same ten orders and the same four gold rows as in mission 5. The result is the same, and the code is shorter.']
          },
          {
            say: 'Run 3. No new file. Every dataset still ran, and the counts did not change. Streaming tables read nothing new, and materialized views computed the same result again.',
            tabs: [{ layer: 'RUN', name: 'rows after each run', c: 'snap', cols: COLS, rows: STEPS_ROWS, trk: 2 }]
          },
          {
            say: 'The final gold table, after run 2. It matches the gold table of mission 5.',
            tabs: [{ layer: 'GOLD', name: 'gold_daily_revenue', c: 'mart', cols: GOLD.cols, rows: GOLD.rows }]
          }
        ]
      }),

      B.cmp({
        id: 'm8-kinds', t: 1, src: 'rec', title: 'Streaming table or materialized view',
        say: 'The Delta history of each dataset shows the difference. Press Next to compare. The commits come from the recording.',
        cols: ['Dataset', 'Kind', 'Delta commits after three runs', 'What it tells you'],
        hl: 3,
        rows: [
          ['`bronze_orders`', 'Streaming table', count(VERS.bronze_orders, 'STREAMING UPDATE') + ' commits of new data. Run 3 added none.', 'It reads only what is new, and appends it. The checkpoint remembers the rest.'],
          ['`silver_orders`', 'Materialized view', count(VERS.silver_orders, 'WRITE') + ' writes and ' + count(VERS.silver_orders, 'TRUNCATE') + ' truncates. Each later run emptied the table and wrote the result again.', 'The query ran in full each time. The result always matches the query.'],
          ['`gold_daily_revenue`', 'Materialized view', count(VERS.gold_daily_revenue, 'WRITE') + ' writes and ' + count(VERS.gold_daily_revenue, 'TRUNCATE') + ' truncates. The same pattern.', 'A small table: recomputing is cheap.']
        ],
        steps: [
          { upto: 1, say: 'The streaming table writes new data only. In run 3 there was nothing new, so it wrote no rows.' },
          { upto: 2, say: 'The open-source framework recomputes a materialized view in full on every run. That is simple and always correct, and it costs time on a big table.' },
          { upto: 3, say: 'Gold is small, so the full recompute is cheap.' }
        ],
        pick: 'Use a **streaming table** to ingest and append data that does not change. Use a **materialized view** for a result that you can express as a query. On Databricks, a materialized view can refresh incrementally for some queries (documentation), which makes it cheaper on large tables.'
      }),

      B.quiz({
        id: 'm8-q1', t: 1,
        q: 'In a declarative pipeline, what decides that silver runs after bronze?',
        opts: [
          { t: 'The framework, from the reference to `bronze_orders` in the silver query', fb: '' },
          { t: 'The alphabetical order of the file names', fb: 'The recording ran bronze, silver and gold, and the framework would run them in that order even if you renamed the files.' },
          { t: 'A schedule you write for each table', fb: 'There is no schedule per table. The pipeline starts as a whole, and the framework orders the datasets.' },
          { t: 'The order of the lines in the spec file', fb: 'The spec lists where the files are. It does not list datasets.' }
        ],
        ok: 0, why: 'The framework reads the references between datasets, builds a graph, and runs a dataset when its inputs are ready. This is why you can add or rename files without maintaining an order.'
      }),

      B.quiz({
        id: 'm8-q2', t: 1,
        q: 'You need a bronze table that reads new files incrementally and appends them. What do you declare?',
        opts: [
          { t: 'A streaming table, with a streaming read of the landing folder', fb: '' },
          { t: 'A materialized view with a batch read of the folder', fb: 'A materialized view recomputes its query on each run. It does not remember which files it has read.' },
          { t: 'A temporary view', fb: 'A temporary view exists only inside the pipeline run. Nothing is stored.' },
          { t: 'A plain notebook with `writeStream`', fb: 'It works, but it is the imperative code of mission 5, and the framework does not track it.' }
        ],
        ok: 0, why: 'A streaming table reads only new data and appends it, and the framework keeps its checkpoint. In the recording, the third run read nothing and wrote no rows.'
      }),

      B.rows({
        id: 'm8-refresh', t: 2, src: 'rec', title: 'Refresh one dataset, or start it over',
        steps: [
          {
            say: 'You can run a single dataset. `--full-refresh bronze_orders` resets that dataset and builds it again. The log marks silver and gold as `EXCLUDED`: they were not part of this run.',
            code: { file: 'spark-pipelines run --full-refresh bronze_orders', lang: 'text', code: FULL.log.slice(FULL.log.indexOf('Starting run...')).join('\n') },
            notes: ['`--refresh` updates the datasets you name. `--full-refresh-all` resets the whole graph.']
          },
          {
            say: 'A full refresh of a streaming table clears its checkpoint, so the stream reads all files again. Here bronze read all four landed files and held **' + FULL.rows.bronze_orders + '** rows afterwards. That worked because the old files were still in the landing folder.',
            code: { file: 'rows after the full refresh', lang: 'text', code: 'bronze_orders        ' + FULL.rows.bronze_orders + '\nsilver_orders        ' + FULL.rows.silver_orders + '   (not part of the run)\ngold_daily_revenue   ' + FULL.rows.gold_daily_revenue + '   (not part of the run)' },
            notes: ['Danger: if the source no longer holds the old files, a full refresh of a streaming table loses that history. Databricks lets you protect a table from a full refresh with a table property (documentation). Bronze is your only copy of the raw data, so protect it.']
          }
        ]
      }),

      B.cmp({
        id: 'm8-policies', t: 2, src: 'docs', title: 'Expectations: three policies for a bad row',
        say: 'An **expectation** is a named rule about the rows of a dataset. Databricks tracks how many rows pass it, and the policy decides what happens to a row that fails. Expectations are a Databricks feature. The open-source framework does not have them. Press Next to compare the three policies.',
        cols: ['Policy', 'In Python', 'In SQL', 'What happens to a bad row'],
        hl: 3,
        rows: [
          ['Warn (the default)', '`@dp.expect`', '`CONSTRAINT name EXPECT (condition)`', 'The row is kept. The failure is counted in the dataset metrics.'],
          ['Drop', '`@dp.expect_or_drop`', '`... ON VIOLATION DROP ROW`', 'The row is removed before the data is written. The dropped count is logged with the metrics.'],
          ['Fail', '`@dp.expect_or_fail`', '`... ON VIOLATION FAIL UPDATE`', 'The update stops. You must fix the data or the rule before you run it again.']
        ],
        steps: [
          { upto: 1, say: 'Warn is for rules you want to measure but not to enforce yet. Nothing is lost, and the metric shows the size of the problem.' },
          { upto: 2, say: 'Drop removes the row from the target. Pair it with a quarantine table, so that the removed rows are not lost without a trace.' },
          { upto: 3, say: 'Fail is for rules whose breach means the data is not safe to publish. The pipeline stops instead of loading wrong rows.' }
        ],
        pick: 'Start with **warn** to learn how bad the data is. Use **drop** for rows that are plainly invalid, and keep them elsewhere. Use **fail** only for rules that must never break.'
      }),

      B.code({
        id: 'm8-expect', t: 2, src: 'docs', title: 'Expectations in a pipeline', file: 'transformations/silver.py (Databricks)', lang: 'python', code: EXPECT_PY,
        steps: [
          { say: 'Here is silver with three expectations. This code uses a Databricks feature, so I could not run it. It follows the documentation.', lines: null },
          { say: 'The expectation decorators sit under the `@dp.table` decorator and above the function.', lines: [4, 7] },
          { say: '`expect` only measures. If a row has no customer, it stays in the table and the failure is counted.', lines: [5, 5] },
          { say: '`expect_or_drop` removes rows with a total that is not positive.', lines: [6, 6] },
          { say: '`expect_or_fail` stops the update when a status is outside the known list. A new status from the source then needs a decision from a person.', lines: [7, 7] }
        ],
        note: 'The same rules in SQL read like this:\n' + EXPECT_SQL
      }),

      B.code({
        id: 'm8-autocdc', t: 2, src: 'docs', title: 'AUTO CDC replaces the merge you wrote', file: 'silver_cdc.sql (Databricks)', lang: 'sql', code: CDC_SQL,
        steps: [
          { say: 'In mission 5 you wrote a `foreachBatch` function with a window, a merge and a guard to keep the newest version of each order. For this job Databricks has a single statement, **AUTO CDC**. It used to be called `APPLY CHANGES`.', lines: null },
          { say: 'Declare the target as a streaming table. The flow will fill it.', lines: [1, 1] },
          { say: 'A **flow** reads a stream of changes from the source, here `bronze_orders`, and applies them to the target.', lines: [3, 4] },
          { say: '`KEYS` names the column that identifies a row. `SEQUENCE BY` names the column that says which change is newer. The pipeline uses it to handle changes that arrive out of order, which was the job of the guard in your merge.', lines: [5, 6] },
          { say: '`STORED AS SCD TYPE 1` keeps the latest row for each key. `SCD TYPE 2` keeps the history and adds start and end columns, which replaces the staged-union merge of mission 5.', lines: [7, 7] }
        ],
        note: 'I tried the same call, `create_auto_cdc_flow`, in the open-source framework of Spark ' + G.meta('spark') + ' with a Delta target. It refused to start with the error `' + CDC_CLASS + '`, which says the target table does not support row-level operations. So this screen comes from the Databricks documentation, and I have not run AUTO CDC. A streaming read of a table also fails when an existing row of the source changes, unless you set an option to skip such commits (documentation).'
      }),

      B.cmp({
        id: 'm8-modes', t: 2, src: 'docs', title: 'Triggered or continuous, and who starts the run',
        say: 'A pipeline can refresh once and stop, or keep running. This follows the Databricks documentation. Press Next to compare.',
        cols: ['Question', 'Triggered', 'Continuous'],
        hl: 1,
        rows: [
          ['What it does', 'Refreshes with the data that is available, then stops.', 'Keeps the tables fresh as new data arrives.'],
          ['Compute', 'Starts for the run and stops.', 'Needs an always-on cluster, so it costs far more.'],
          ['Retries', 'Up to five retries for each update.', 'Unlimited retries.'],
          ['Who is in charge', 'A job with a schedule, or a manual start.', 'Databricks recommends running it through a continuous job.'],
          ['Standalone tables', 'Standalone streaming tables and materialized views always run in triggered mode.', 'Not available.']
        ],
        steps: [
          { upto: 2, say: 'Triggered is the cost-saving default, the same idea as `availableNow` in mission 6. Continuous keeps the compute alive.' },
          { upto: 4, say: 'A job that runs the pipeline overrides the setting of the pipeline. A scheduled job runs one update. A continuous job runs it continuously.' },
          { upto: 5, say: 'Standalone tables that you create with SQL on a warehouse always refresh in triggered mode.' }
        ],
        pick: 'Use **triggered** mode in a scheduled job unless someone needs data within seconds. For continuous work, follow the documentation and wrap the pipeline in a continuous job.'
      }),

      B.code({
        id: 'm8-events', t: 2, src: 'docs', title: 'The event log tells you what a run did', file: 'sql editor', lang: 'sql', code: EVENTS,
        steps: [
          { say: 'Every pipeline writes an **event log**: a Delta table with events about flows, data quality and lineage. You can query it with SQL.', lines: null },
          { say: '`event_log(TABLE(...))` reads the log of the pipeline that owns a table.', lines: [2, 2] },
          { say: 'Filter by `event_type`. `flow_progress` events say how far each dataset got and how many rows it wrote. Other types carry the data quality results of the expectations.', lines: [3, 3] },
          { say: 'For a view across all pipelines in a region, the documentation points to a `pipeline_events` system table. You can also publish the log of a pipeline to a Unity Catalog table with a pipeline setting.', lines: [4, 5] }
        ],
        note: 'The function and the field names come from the documentation of the event log. Check the current schema page before you build a dashboard on it.'
      }),

      B.bug({
        id: 'm8-bug', t: 2, q: 'This silver dataset runs, but the reviewer rejects it for two reasons. Click a line that is wrong.',
        file: 'transformations/silver.py', lang: 'python', code: BUG, bad: [G.at(BUG, /dropDuplicates/), G.at(BUG, /\.write\./)],
        hint: 'One line writes a table although the framework does that. Another line lets Spark choose which duplicate survives.',
        why: 'A dataset function must only **return** a DataFrame. The framework owns the table, so a `saveAsTable` inside the function writes a second copy at registration time and can run more than once. And `dropDuplicates` keeps an arbitrary row for each key, so the newest version is not guaranteed. Rank by load time and keep rank 1, as in the recorded silver.',
        fix: BUGFIX,
        cheer: 'Side effects in a dataset function are the classic mistake.'
      }),

      B.decide({
        id: 'm8-dec', t: 2, src: 'rec', title: 'Decision: declarative pipelines or notebooks in a job?',
        scenario: 'A team of four runs **30 tables** in a bronze, silver and gold layout. They maintain checkpoint paths by hand, they once ran gold before silver finished, and they want data quality counts for each table. New tables arrive every month.',
        opts: [
          { t: 'Keep notebooks with streams and merges, ordered by a job', d: 'Full control of every step.', lose: 'Every new table means new checkpoint paths, a new task and a new place to get the order wrong. The code that handles state and order is yours to maintain.' },
          { t: 'Move the layers to a declarative pipeline', d: 'Declare tables. The framework orders, checkpoints and retries.' },
          { t: 'Write one large notebook that does all 30 tables in a loop', d: 'One place to read.', lose: 'One failure stops everything. You still write the order and the state handling, and nobody can rerun one table.' }
        ],
        pick: 1,
        why: 'The recording showed the framework deriving the order from the references, keeping checkpoints in one place, and letting you refresh one dataset on its own. Expectations add quality counts on Databricks. New tables become new files, with no change to the rest.',
        when: 'Keep jobs with notebooks for work that a declarative pipeline cannot express: custom state, writes to systems that the framework does not support, or steps that are not tables at all, such as sending a file.'
      }),

      B.incident({
        id: 'm8-inc', t: 2, src: 'rec', title: 'Incident: the pull request check fails on the gold table', time: '15:20',
        alert: '**The pipeline check on a pull request fails.** It says: "Failed to resolve flows in the pipeline". The change touched only `gold.sql`. Nothing ran against production data.',
        clues: ['The check runs `spark-pipelines dry-run`', 'The failing dataset is `gold_daily_revenue`', 'The pull request changed one line of the query'],
        opts: [
          { t: 'Read the line before the summary. It names the root cause. Then fix the query and run the dry run again', fb: '' },
          { t: 'Rerun the check until it passes', fb: 'A resolution error is not random. The same file fails the same way every time.' },
          { t: 'Skip the dry run in the check', fb: 'You would find the error in production instead, with data already moving.' },
          { t: 'Refresh gold with `--full-refresh`', fb: 'The pipeline does not even load. A refresh cannot fix a table name that does not exist.' }
        ],
        best: 0,
        why: 'The summary names the dataset that failed, `gold_daily_revenue`, and says it could not resolve. The line before it gives the cause: "' + CAUSE.slice(0, 130) + '..." The query reads `silver_ordres`, a typo for `silver_orders`. The dry run found it before any data moved.',
        checks: [
          ['Read the summary', 'It names the dataset that failed: `gold_daily_revenue`. The summary alone does not say why.'],
          ['Read the line above it', '`TABLE_OR_VIEW_NOT_FOUND`, for `silver_ordres`.'],
          ['Open the diff', 'The pull request changed `FROM silver_orders` to `FROM silver_ordres`.'],
          ['Fix and rerun', 'Correct the name and run `spark-pipelines dry-run`. It passes.'],
          ['Keep the check', 'The dry run stays in CI. It costs seconds and moves no data.']
        ],
        tell: 'The pull request check failed with "Failed to resolve flows in the pipeline", and it named the gold dataset. The line above the summary said the table silver_ordres could not be found, a typo in the FROM clause of the changed file. I fixed the name and the dry run passed. We kept the dry run in the check, because it finds broken references in seconds, before any data moves.',
        prevent: ['Run **dry-run** in the pull request check', 'Read the **line before** the summary: it holds the cause', 'Keep dataset names in **one place** so that they are easy to search', 'Test on a **small copy** of the data before production']
      }),

      B.qa({
        id: 'qa-sdp', t: 1, tag: 'Pipelines', secs: 60,
        q: 'What is a declarative pipeline, and how is it different from a job with notebooks?',
        pts: ['You declare datasets, not steps', 'The framework builds a graph from the references and runs in order', 'It manages checkpoints, table creation and retries', 'Streaming tables append new data, materialized views recompute a query', 'Databricks adds expectations, AUTO CDC, event log, serverless', 'Notebooks in a job stay right for custom steps'],
        short: 'In a declarative pipeline I declare what each table is, in Python or SQL, and a framework does the rest. Silver reads bronze and gold reads silver, and the framework reads those references, builds a graph, and runs each dataset when its inputs are ready. It also keeps the checkpoints and creates the tables, and on Databricks it retries failed updates.\n\nA streaming table reads only new data and appends it. A materialized view is the result of a query, and the framework keeps it up to date.\n\nCompared with a job of notebooks, I write no checkpoint paths, no write calls, no trigger and no order. In my test, a bronze, silver and gold pipeline ran in the right order from three files of code, and a dry run caught a typo in a table name before any data moved. On Databricks I also get expectations for data quality and AUTO CDC for change data.',
        fu: [
          ['Is it the same as Delta Live Tables?', 'It is the new name. Databricks first called it Delta Live Tables, then Lakeflow Declarative Pipelines, and now Lakeflow Spark Declarative Pipelines. Apache Spark has an open-source version.'],
          ['When would you not use it?', 'For steps that are not tables, such as sending a file or calling an API, and for custom state. Use a job with notebooks there.']
        ],
        trap: 'Saying that it is "just a scheduler". The framework understands the graph of datasets and manages the state.',
        real: 'Say which pipeline you moved to a declarative form and what you stopped maintaining.'
      }),

      B.qa({
        id: 'qa-st-mv', t: 2, tag: 'Pipelines', secs: 60,
        q: 'Streaming table, materialized view and view: when do you use each?',
        pts: ['Streaming table: incremental append of new data, with a checkpoint', 'Materialized view: stored result of a query, refreshed on each run', 'Temporary view: a step inside the pipeline, nothing stored', 'Streaming tables suit ingestion and append-only facts', 'Materialized views suit aggregates and joins that can change', 'On Databricks, some materialized views refresh incrementally'],
        short: 'A streaming table reads new data only and appends it. I use it for ingestion, such as bronze from files, and for append-only facts. The framework keeps the checkpoint, so a rerun does not read old data again. In my test, a run with no new file wrote no rows to the streaming table.\n\nA materialized view is the stored result of a query. I use it for aggregates, joins and the newest row for each key, where the result can change when the input changes. In the open-source framework it recomputes in full on every run: silver and gold were truncated and written again. On Databricks, some materialized views refresh incrementally, which is cheaper.\n\nA temporary view is a step inside a pipeline with nothing stored. I use it to split a long query into named parts.',
        fu: [
          ['Why not read a streaming table when the source changes rows?', 'A streaming read fails when an existing row of the source is updated or deleted, unless you set an option to skip such commits. A materialized view reads the current state instead.'],
          ['Can a materialized view read a streaming table?', 'Yes. In the recording, silver was a materialized view that read the streaming table bronze.']
        ],
        trap: 'Using a materialized view for ingestion. It would recompute from all files each time instead of reading only new ones.',
        real: 'Describe a dataset you changed from one kind to the other and what you gained.'
      }),

      B.qa({
        id: 'qa-expect', t: 2, tag: 'Pipelines', secs: 90,
        q: 'How do you enforce data quality in a declarative pipeline?',
        pts: ['Expectations: named rules on the rows of a dataset', 'Three policies: warn, drop, fail', 'Warn first to measure, drop for invalid rows, fail for rules that must hold', 'Quarantine the rows you drop', 'Metrics go to the event log', 'Combine with tests and alerts'],
        short: 'I use expectations, which are named rules about the rows of a dataset. There are three policies. The default, warn, keeps the row and counts the failure. Drop removes the row before the write. Fail stops the update.\n\nI start with warn on a new rule, because the metric tells me how bad the data is without losing anything. For rows that are plainly invalid, such as a negative total, I use drop, and I keep the dropped rows in a quarantine table so that they are not lost without a trace. I use fail only for rules that must never break, because the pipeline then stops until a person decides.\n\nThe pass and fail counts go to the event log, so I can chart them and alert on a jump. Expectations are a Databricks feature. I describe them from the documentation, and the open-source framework I ran does not have them. Alongside them I keep unit tests for the transformation code, which mission 11 covers.',
        fu: [
          ['How do you quarantine dropped rows?', 'Define a second dataset with the opposite rule, for example `NOT (total_usd > 0)`, so the rows that fail land in a table you can inspect.'],
          ['What if a rule is wrong and drops good rows?', 'The metric shows a jump in dropped rows. Start with warn, review the numbers, and only then switch to drop.']
        ],
        trap: 'Choosing fail for everything. A pipeline that stops on every odd row is a pipeline that nobody trusts.',
        real: 'Say which rule you enforce, with which policy, and the number of rows it caught.'
      }),

      B.qa({
        id: 'qa-cdc', t: 2, tag: 'Pipelines', secs: 90,
        q: 'How do you handle change data from a source, and keep history for a dimension?',
        pts: ['AUTO CDC replaces hand-written merges', 'KEYS identify the row, SEQUENCE BY orders the changes', 'Handles out-of-order changes and deletes', 'SCD type 1 keeps the latest row', 'SCD type 2 keeps history with start and end columns', 'Compare with a foreachBatch merge'],
        short: 'On Databricks I use AUTO CDC. It used to be called APPLY CHANGES. I declare a target streaming table and a flow that reads a stream of changes from the source. `KEYS` names the column that identifies a row, and `SEQUENCE BY` names the column that says which change is newer. The pipeline uses the sequence to handle changes that arrive out of order, so I do not write the guard myself. I can mark deletes with an `APPLY AS DELETE WHEN` condition.\n\nFor the latest row for each key I use SCD type 1. For history I use SCD type 2, where the target gets start and end columns and each change closes the old row and opens a new one.\n\nBefore this, I wrote that logic by hand: a window to keep the newest row, a merge with an "update only if newer" guard, and a staged union for type 2. AUTO CDC replaces that code. I know it from the documentation. When I tried the call on the open-source framework with a Delta target, it refused to start.',
        fu: [
          ['What is the difference between SCD type 1 and type 2?', 'Type 1 overwrites and keeps the latest row. Type 2 keeps every version with a start and an end.'],
          ['What if two changes have the same sequence value?', 'The order is then not defined. Use a column that is unique per key, such as a version number, or combine the time with a sequence.']
        ],
        trap: 'Claiming you ran AUTO CDC when you only read about it. Say which parts you know from practice.',
        real: 'Describe a source with change data and how you ordered its changes.'
      }),

      B.recap({
        id: 'm8-recap', n: 8, badge: 'Pipeline Author', color: '#FBCFE8',
        pts: [
          'A **declarative** pipeline declares datasets. The framework finds the order from the **references** and keeps the checkpoints.',
          'A **streaming table** appends new data. A **materialized view** keeps the result of a query. The open-source one recomputed in full each run.',
          'The recorded order was bronze, silver, gold. Run 3 had **no new file**, and bronze wrote no rows.',
          '`--full-refresh` starts a dataset over, and it can lose history when the source no longer holds the files.',
          '**Expectations**: warn keeps, drop removes, fail stops. **AUTO CDC** replaces the hand-written merge. Both are Databricks features.',
          '**Triggered** mode stops after a run. **Continuous** needs an always-on cluster.',
          'A **dry run** catches a typo in a table name before any data moves.'
        ],
        lines: [
          'I declare tables and let the framework order them.',
          'I put a dry run in every pull request check.',
          'I protect bronze from a full refresh.'
        ]
      })
    ]
  });
})();
