/* Mission 3: getting data in with stages, COPY INTO, Snowpipe and Snowpipe Streaming. */
(function () {
  var B = LAB.b;

  var STAGE = [
    '-- 1. Tell Snowflake how to read the files',
    'CREATE OR REPLACE FILE FORMAT raw.ff_csv',
    "  TYPE = CSV FIELD_OPTIONALLY_ENCLOSED_BY = '\"' SKIP_HEADER = 1",
    "  NULL_IF = ('', 'NULL');",
    '',
    '-- 2. Point a stage at the bucket. A storage integration holds the access.',
    'CREATE OR REPLACE STAGE raw.stg_orders',
    "  URL = 's3://brewline-landing/orders/'",
    '  STORAGE_INTEGRATION = si_brewline',
    '  FILE_FORMAT = raw.ff_csv;',
    '',
    '-- 3. See what is waiting',
    'LIST @raw.stg_orders/2026-03-14/;'
  ].join('\n');

  var COPY = [
    '-- Load the files Snowflake has not loaded before',
    'COPY INTO raw.orders',
    '  (order_id, customer_id, order_ts, status, total_usd, _file, _loaded_at)',
    'FROM (',
    '  SELECT $1, $2, $3, $4, $5, METADATA$FILENAME, CURRENT_TIMESTAMP()',
    '  FROM @raw.stg_orders/2026-03-14/',
    ')',
    'ON_ERROR = ABORT_STATEMENT;'
  ].join('\n');

  var PIPE = [
    '-- 1. A pipe is a COPY statement that Snowflake runs for every new file',
    'CREATE OR REPLACE PIPE raw.pipe_orders',
    '  AUTO_INGEST = TRUE',
    'AS',
    'COPY INTO raw.orders',
    '  (order_id, customer_id, order_ts, status, total_usd, _file, _loaded_at)',
    'FROM (',
    '  SELECT $1, $2, $3, $4, $5, METADATA$FILENAME, CURRENT_TIMESTAMP()',
    '  FROM @raw.stg_orders',
    ');',
    '',
    '-- 2. The notification channel is the queue S3 must send events to',
    "SHOW PIPES LIKE 'pipe_orders' IN SCHEMA raw;",
    '',
    '-- 3. Is it healthy?',
    "SELECT SYSTEM$PIPE_STATUS('raw.pipe_orders');"
  ].join('\n');

  var BUGCOPY = [
    'CREATE OR REPLACE FILE FORMAT raw.ff_orders',
    '  TYPE = CSV',
    '  SKIP_HEADER = 1',
    "  FIELD_OPTIONALLY_ENCLOSED_BY = '\"';",
    '',
    'COPY INTO raw.orders FROM @raw.stg_orders',
    '  FILE_FORMAT = (FORMAT_NAME = raw.ff_orders)',
    '  ON_ERROR = CONTINUE;'
  ].join('\n');

  var FILE_HEAD = ['order_id', 'customer_id', 'order_ts', 'status', 'total_usd'];
  var RAW_HEAD = FILE_HEAD.concat(['_file', '_loaded_at']);

  LAB.addChapter({
    id: 'm3', n: 3, title: 'Getting data in', short: 'Loading', blurb: 'Stages, COPY INTO, Snowpipe, streaming', minutes: 28,
    focus: ['ing'],
    goals: [
      'Choose between **COPY INTO, Snowpipe and Snowpipe Streaming** for a requirement.',
      'Load staged files with a **file format, a stage and COPY INTO**, and read the result.',
      'Explain **load metadata**, and how to avoid **duplicates and silently skipped rows**.',
      'Diagnose a **pipe that stopped loading**.'
    ],
    say: 'Mission 3 is ingestion. Every pipeline starts here, and most data quality problems are born here too, so interviewers ask about it at every level.',
    scenes: [
      B.flow({
        id: 'm3-paths', t: 1, title: 'Three ways to load data', g: 'load', legend: true,
        steps: [
          { say: 'Snowflake has three main ways to get data in. Batch loading runs COPY INTO when you tell it to. Snowpipe loads files automatically as they arrive. Snowpipe Streaming writes rows directly, with no files. Press Next to see each one.', cap: 'All three end in the same place: **RAW tables**.' },
          { say: 'Batch loading. Files wait in cloud storage. An external stage tells Snowflake where they are. You run COPY INTO on your own warehouse, usually from a task or an orchestrator, and it loads the files it has not seen before.', on: ['lb1', 'lb2', 'lb3'], focus: ['g_b', 'b1', 'b2', 'b3', 'raw'], cap: 'Good for **scheduled loads** where minutes or hours of delay are fine. You pay for warehouse time.' },
          { say: 'Continuous loading with Snowpipe. The bucket sends an event notification when a file arrives. Snowpipe runs the COPY for you on serverless compute, usually within a minute or two. You manage no warehouse.', on: ['lp1', 'lp2', 'lp3'], focus: ['g_p', 'p1', 'p2', 'p3', 'raw'], cap: 'Good when **files arrive all day** and freshness matters. You pay Snowpipe\'s serverless rate, not warehouse time.' },
          { say: 'Snowpipe Streaming skips files. An application or the Kafka connector sends rows through an SDK, and they are queryable within seconds.', on: ['ls1', 'ls2'], focus: ['g_s', 's1', 's2', 'raw'], cap: 'Good for **high-volume event streams** such as clickstream, when the source can send rows.' }
        ]
      }),

      B.talk({
        id: 'm3-stage', t: 1, title: 'Stages and file formats',
        say: 'Before you can load a file, Snowflake needs to know where it is and how to read it. Press Next for each idea.',
        items: [
          ['A stage is a file location', 'A **stage** tells Snowflake where files wait. An **internal stage** stores files inside Snowflake, and you upload with `PUT`. An **external stage** points at your own bucket in S3, Azure Blob Storage or Google Cloud Storage. Every table and every user also has an internal stage of its own.', 'Stage means where the files wait.'],
          ['Access without secrets in SQL', 'For an external stage, create a **storage integration**. It uses a cloud role that you allow to read the bucket, so no access keys appear in SQL or in Git. An administrator creates it once and engineers use it by name.', 'Use a storage integration. Never put keys in SQL.'],
          ['A file format describes the files', 'A **file format** object stores the delimiter, header, quoting, null markers and compression. Define it once and attach it to the stage, so every load reads files the same way.', 'Define formats once and reuse them.'],
          ['LIST before you load', '`LIST @stage` shows the files with their sizes and times. It is the cheapest way to confirm that the files you expect have arrived, before you spend warehouse time on a COPY.', 'LIST first, then COPY.']
        ],
        cols: 1
      }),

      B.sql({
        id: 'm3-stage-sql', t: 1, title: 'Create a format and a stage', file: 'worksheet: stage.sql', code: STAGE,
        ctx: { role: 'LOADER', wh: 'WH_LOAD', db: 'BREWLINE.RAW' },
        steps: [
          { say: 'Two objects and one check. Press Next to go through them.', lines: null },
          { say: 'The file format. The orders files are CSV with a header line, quoted text and empty strings for missing values.', lines: [1, 4] },
          { say: 'The stage. The URL is the bucket folder. The storage integration holds the permission, and the file format is attached so every COPY reads the files the same way.', lines: [6, 10] },
          { say: 'LIST shows what is waiting in the folder for one day. Press Run.', lines: [12, 13], run: true }
        ],
        result: { cols: ['name', 'size', 'md5', 'last_modified'], rows: [['s3://brewline-landing/orders/2026-03-14/part-0001.csv.gz', '18734221', '5d41402abc4b2a76b9719d911017c592', 'Sat, 14 Mar 2026 09:20:41 GMT'], ['s3://brewline-landing/orders/2026-03-14/part-0002.csv.gz', '17920877', '7d793037a0760186574b0282f2f435e7', 'Sat, 14 Mar 2026 10:20:13 GMT']], msg: '2 rows' },
        note: 'A role needs `USAGE` on the stage, the file format and the storage integration. A missing grant on one of the three is a common reason a first load fails.'
      }),

      B.sql({
        id: 'm3-copy-sql', t: 1, title: 'Load the files with COPY INTO', file: 'worksheet: copy_into.sql', code: COPY,
        ctx: { role: 'LOADER', wh: 'WH_LOAD', db: 'BREWLINE.RAW' },
        steps: [
          { say: 'COPY INTO moves staged files into a table. Press Next to read the statement piece by piece.', lines: null },
          { say: 'The target table and the columns to fill. The last two columns are audit columns: which file the row came from, and when it loaded.', lines: [2, 3] },
          { say: 'The source is a SELECT from the stage. In a staged CSV file the columns are called $1, $2, and so on, by position. METADATA$FILENAME gives the file name for each row.', lines: [4, 7] },
          { say: 'ON_ERROR decides what happens to a bad row. ABORT_STATEMENT stops the load and loads nothing. That is the safe default. Press Run.', lines: [8, 8], run: true }
        ],
        result: { cols: ['file', 'status', 'rows_parsed', 'rows_loaded', 'errors_seen'], rows: [['s3://brewline-landing/orders/2026-03-14/part-0001.csv.gz', 'LOADED', '1204', '1204', '0'], ['s3://brewline-landing/orders/2026-03-14/part-0002.csv.gz', 'LOADED', '1187', '1187', '0']], msg: '2 rows' },
        note: 'Run the same COPY again and Snowflake answers **"Copy executed with 0 files processed."** It remembers which files it loaded, so the second run loads nothing.'
      }),

      B.talk({
        id: 'm3-options', t: 1, title: 'COPY options that matter',
        say: 'Five things decide whether a load is safe. Press Next for each one.',
        items: [
          ['ON_ERROR decides what a bad row does', '`ABORT_STATEMENT` (the default for COPY) stops and loads nothing. `SKIP_FILE` skips any file that has an error. `CONTINUE` loads the good rows and skips the bad ones **without failing**. For a critical table, silent skipping is the dangerous choice.', 'Know what happens to bad rows before you load.'],
          ['Snowflake remembers loaded files', 'COPY keeps **load metadata for 64 days**, so running the same COPY twice loads each file once. `FORCE = TRUE` ignores that memory and creates duplicates. A file older than 64 days that is loaded again looks new to Snowflake.', 'Load metadata makes COPY safe to repeat for 64 days.'],
          ['Check before you trust', 'The COPY result lists `rows_parsed`, `rows_loaded` and `errors_seen` for each file. `INFORMATION_SCHEMA.COPY_HISTORY` and `SNOWFLAKE.ACCOUNT_USAGE.COPY_HISTORY` keep the history, and `VALIDATE` shows the rows that failed in an earlier load.', 'Compare rows parsed with rows loaded.'],
          ['File size and count', 'Aim for files of **100 to 250 MB compressed**. Thousands of tiny files waste time on per-file work, and one 20 GB file cannot be split across servers. For Snowpipe, roughly one file a minute is a good rhythm.', 'Right-size files at the source.'],
          ['Other formats', 'JSON, Avro, Parquet and ORC load into a single **VARIANT** column, or into typed columns with `MATCH_BY_COLUMN_NAME`. Parquet is compressed and typed, so choose it when you control the source.', 'Parquet when you can. CSV when you must.']
        ],
        cols: 1
      }),

      B.rows({
        id: 'm3-rows', t: 1, title: 'Follow order O-5001 into RAW',
        steps: [
          { say: 'A file lands in the bucket. It holds one header line and one line per order. Order O-5001 is the marked row.', tabs: [
            { layer: 'FILE', name: 'part-0001.csv.gz (in S3)', c: 'ing', cols: FILE_HEAD, rows: [['O-5001', 'C-42', '2026-03-14 09:12', 'PLACED', '67.00'], ['O-5002', 'C-77', '2026-03-14 09:15', 'PLACED', '12.50']], trk: 0 }
          ], notes: ['The header is the first line of the file. `SKIP_HEADER = 1` makes Snowflake ignore it.'] },
          { say: 'COPY INTO reads the file and adds two audit columns: the file name and the load time. They let you trace any bad row back to the file it came from.', tabs: [
            { layer: 'FILE', name: 'part-0001.csv.gz (in S3)', c: 'ing', cols: FILE_HEAD, rows: [['O-5001', 'C-42', '2026-03-14 09:12', 'PLACED', '67.00'], ['O-5002', 'C-77', '2026-03-14 09:15', 'PLACED', '12.50']], trk: 0 },
            { layer: 'RAW', name: 'raw.orders', c: 'raw', cols: RAW_HEAD, rows: [['O-5001', 'C-42', '2026-03-14 09:12', 'PLACED', '67.00', 'part-0001.csv.gz', '2026-03-14 09:31'], ['O-5002', 'C-77', '2026-03-14 09:15', 'PLACED', '12.50', 'part-0001.csv.gz', '2026-03-14 09:31']], chg: [[0, 5], [0, 6], [1, 5], [1, 6]], trk: 0 }
          ], ops: ['COPY INTO raw.orders adds _file and _loaded_at'] },
          { say: 'An hour later the next file arrives, and Snowpipe loads it. Order O-5001 appears again because its status changed. RAW only appends. It never edits rows.', tabs: [
            { layer: 'FILE', name: 'part-0002.csv.gz (in S3)', c: 'ing', cols: FILE_HEAD, rows: [['O-5001', 'C-42', '2026-03-14 09:12', 'SHIPPED', '67.00'], ['O-5003', 'C-42', '2026-03-14 10:02', 'PLACED', '28.00']], trk: 0 },
            { layer: 'RAW', name: 'raw.orders', c: 'raw', cols: RAW_HEAD, rows: [['O-5001', 'C-42', '2026-03-14 09:12', 'PLACED', '67.00', 'part-0001.csv.gz', '2026-03-14 09:31'], ['O-5002', 'C-77', '2026-03-14 09:15', 'PLACED', '12.50', 'part-0001.csv.gz', '2026-03-14 09:31'], ['O-5001', 'C-42', '2026-03-14 09:12', 'SHIPPED', '67.00', 'part-0002.csv.gz', '2026-03-14 10:31'], ['O-5003', 'C-42', '2026-03-14 10:02', 'PLACED', '28.00', 'part-0002.csv.gz', '2026-03-14 10:31']], chg: [[2, 3], [2, 5], [3, 5]], trk: 2 }
          ], ops: ['Snowpipe loads the new file'], notes: ['Order **O-5001 now appears twice**: PLACED, then SHIPPED. RAW keeps both on purpose. Mission 4 shows how to keep only the latest row.'] }
        ]
      }),

      B.sql({
        id: 'm3-pipe-sql', t: 2, title: 'Snowpipe: a COPY that runs by itself', file: 'worksheet: snowpipe.sql', code: PIPE,
        ctx: { role: 'LOADER', wh: 'WH_LOAD', db: 'BREWLINE.RAW' },
        steps: [
          { say: 'A pipe wraps the same COPY statement you already know and runs it for every new file. Press Next.', lines: null },
          { say: 'AUTO_INGEST = TRUE means the pipe listens for cloud storage events. The COPY inside is the one from the last screen, reading from the stage with no folder filter, so every new file is a candidate.', lines: [1, 10] },
          { say: 'SHOW PIPES returns a notification channel, which is a queue address. In the bucket you configure event notifications to send "object created" events to that queue. This is the step people forget.', lines: [12, 13] },
          { say: 'SYSTEM$PIPE_STATUS tells you whether the pipe is running and how many files are waiting. It is the first thing to check when loads stall. Press Run.', lines: [15, 16], run: true }
        ],
        result: { cols: ['executionState', 'pendingFileCount', 'lastIngestedFilePath', 'numOutstandingMessagesOnChannel'], rows: [['RUNNING', '0', 'orders/2026-03-14/part-0002.csv.gz', '0']], msg: '1 row (fields taken from the JSON result)' },
        note: 'Snowpipe keeps **14 days** of load history, compared with 64 days for COPY. A file that Snowpipe loaded more than 14 days ago can load again if it is re-staged.'
      }),

      B.talk({
        id: 'm3-streaming', t: 2, title: 'Snowpipe Streaming and Kafka',
        say: 'When data arrives as events, writing files first adds delay and small-file trouble. Press Next for the alternative.',
        items: [
          ['Rows, not files', '**Snowpipe Streaming** lets an application write rows straight into a table through an SDK. Rows are queryable within seconds, and there are no staged files to manage. It uses serverless compute.', 'Streaming writes rows directly into a table.'],
          ['The Kafka connector', 'The **Snowflake connector for Kafka** reads topics and writes to tables. It can use Snowpipe or Snowpipe Streaming under the hood. With Streaming, latency drops from minutes to seconds.', 'Kafka to Snowflake is a connector, not custom code.'],
          ['When to choose it', 'Choose Streaming for **high-volume events** (clickstream, IoT, change data capture) where seconds matter and the source can send rows. Choose Snowpipe when sources already write files. Choose COPY when hours of delay are fine.', 'Match the method to freshness and to who controls the source.'],
          ['This area keeps changing', 'Snowflake has introduced a newer, higher-throughput Snowpipe Streaming architecture. Read the current documentation for the SDK and limits before you design around it.', 'Check the docs for current limits.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm3-openflow', t: 3, title: 'Openflow connectors',
        say: 'A newer option for sources that are not files or Kafka topics, such as databases and SaaS tools.',
        items: [
          ['What it is', '**Openflow** is Snowflake\'s managed integration service built on Apache NiFi. It offers ready-made connectors for databases, SaaS applications and files, with change data capture for some sources.', 'Openflow moves data from many sources into Snowflake with managed connectors.'],
          ['Status', 'Snowflake announced second-generation Openflow deployments and runtimes as generally available on AWS and Azure on **8 September 2026**. Cloud and region availability differ, so confirm yours.', 'Check availability for your cloud and region.'],
          ['How to talk about it', 'In an interview, say it replaces custom extractors for common sources. Add that you would still compare it with Fivetran, Airbyte or a custom job on cost, control and monitoring.', 'Name it, and compare it with the tools you already know.']
        ],
        cols: 1
      }),

      B.bug({
        id: 'm3-bug', t: 1, q: 'The nightly load reports success, but analysts count 38 fewer orders than the source system. Click the line that hides the problem.',
        file: 'load_orders.sql', lang: 'sql', code: BUGCOPY, bad: 8,
        hint: 'Which setting decides what happens to rows that cannot be parsed?',
        why: '`ON_ERROR = CONTINUE` loads the good rows, skips the bad ones and still reports success. Unless someone compares `rows_parsed` with `rows_loaded`, the missing rows go unnoticed. For a critical table use `ABORT_STATEMENT` or `SKIP_FILE`, and alert on any skipped file.',
        fix: 'COPY INTO raw.orders FROM @raw.stg_orders\n  FILE_FORMAT = (FORMAT_NAME = raw.ff_orders)\n  ON_ERROR = ABORT_STATEMENT;'
      }),

      B.quiz({
        id: 'm3-q1', t: 1,
        q: 'Someone runs the same COPY INTO statement twice by accident, with no other options. What happens on the second run?',
        opts: [
          { t: 'It loads nothing, because Snowflake remembers which files it already loaded', fb: '' },
          { t: 'It loads every file again and creates duplicate rows', fb: 'That happens only with FORCE = TRUE, or after the 64 day memory expires.' },
          { t: 'It fails with a duplicate key error', fb: 'Snowflake does not enforce primary keys on standard tables, so no duplicate error appears.' },
          { t: 'It replaces the table contents', fb: 'COPY INTO appends. It never replaces a table unless you truncate it first.' }
        ],
        ok: 0, why: 'COPY keeps **load metadata for 64 days**, so the second run reports "Copy executed with 0 files processed." Duplicates appear when someone uses `FORCE = TRUE`, or reloads a file after the metadata has expired.'
      }),

      B.quiz({
        id: 'm3-q2', t: 1,
        q: 'What file size does Snowflake recommend for efficient loading?',
        opts: [
          { t: 'About 100 to 250 MB compressed', fb: '' },
          { t: 'As small as possible, so each file loads fast', fb: 'Thousands of tiny files add per-file work and slow the load down.' },
          { t: 'One file of 20 GB or more', fb: 'A single huge file cannot be split across the servers of a warehouse.' },
          { t: 'Exactly 16 MB', fb: 'There is no such magic number. The guidance is a range.' }
        ],
        ok: 0, why: 'Files of **100 to 250 MB compressed** let a warehouse load many files in parallel without drowning in tiny-file overhead. Fix file size at the source, because you cannot fix it cheaply in Snowflake.'
      }),

      B.quiz({
        id: 'm3-q3', t: 2,
        q: 'Which statement about Snowpipe is correct?',
        opts: [
          { t: 'It runs on serverless compute that Snowflake manages, not on your warehouse', fb: '' },
          { t: 'It uses your warehouse credits, so size the warehouse for it', fb: 'Snowpipe does not use your warehouses. It bills its own serverless compute.' },
          { t: 'It needs a scheduler such as a task to trigger each load', fb: 'Auto-ingest reacts to storage events by itself. No scheduler is involved.' },
          { t: 'It keeps load history for 64 days', fb: 'That is COPY INTO. Snowpipe keeps 14 days.' }
        ],
        ok: 0, why: 'Snowpipe uses **serverless** compute and reacts to storage events. It keeps load history for **14 days**. COPY INTO runs on your warehouse and keeps **64 days**.'
      }),

      B.order({
        id: 'm3-ord', t: 1, q: 'Put a safe batch load in order.',
        items: [
          'Create the file format that describes the files',
          'Create the stage that points at the bucket',
          'LIST the stage to confirm the files arrived',
          'Run COPY INTO with ON_ERROR = ABORT_STATEMENT',
          'Check rows parsed, rows loaded and errors for each file'
        ],
        why: 'Describe the files, locate them, confirm they exist, load safely, then verify. Checking the result is part of the load, not an extra.'
      }),

      B.decide({
        id: 'm3-dec', t: 2, title: 'Decision: how should orders load?',
        scenario: 'The orders system writes about **40 files a day** into S3, roughly 50 MB each. Dashboards must be fresh **within 5 minutes** of a file arriving. The source team says they **cannot change** what the system does.',
        opts: [
          { t: 'COPY INTO every 15 minutes', d: 'A task runs the COPY on WH_LOAD on a schedule.', lose: 'A 15 minute schedule cannot meet a 5 minute target, and a warehouse wakes up 96 times a day to load a few files.' },
          { t: 'Snowpipe with auto-ingest', d: 'S3 notifies Snowflake and Snowpipe loads each file.' },
          { t: 'Snowpipe Streaming', d: 'Send rows through the SDK.', lose: 'The source writes files and cannot be changed, so there is nothing to send rows from. You would have to build and run a converter.' }
        ],
        pick: 1,
        why: 'The files already exist, so **Snowpipe auto-ingest** fits: it reacts within about a minute, uses serverless compute, and needs no change at the source. You still need monitoring on the pipe status and on rows loaded.',
        when: '**Scheduled COPY** wins when hours of delay are fine and you want predictable warehouse cost and full control. **Streaming** wins for high-volume event data when the source can send rows and seconds matter.'
      }),

      B.incident({
        id: 'm3-inc', t: 2, title: 'Incident: the pipe stopped loading', time: '04:10',
        alert: 'No new rows in **RAW.ORDERS** since 01:50. Files for 02:00 to 04:00 are sitting in S3. The freshness check has failed twice.',
        clues: ['`SYSTEM$PIPE_STATUS` says `RUNNING`', '`pendingFileCount` is 0', '`numOutstandingMessagesOnChannel` is 0'],
        opts: [
          { t: 'Check whether storage events still reach the pipe, starting with SYSTEM$PIPE_STATUS and the bucket notification', fb: '' },
          { t: 'Drop and recreate the pipe', fb: 'Recreating a pipe can reload or skip files, and it hides the cause. Look first.' },
          { t: 'Increase the warehouse size', fb: 'Snowpipe does not use your warehouse, so a bigger one changes nothing.' },
          { t: 'Run COPY with FORCE = TRUE on the whole stage', fb: 'FORCE reloads files that were already loaded, which creates duplicates.' }
        ],
        best: 0,
        why: 'A pipe that is running with **no pending files and no messages** means nothing is telling it about new files. The break is upstream of Snowflake, in the event notification, so start there.',
        checks: [
          ['Pipe status', '`SYSTEM$PIPE_STATUS`: is it RUNNING, and when did it last receive a message?'],
          ['Notification path', 'Does the bucket still send "object created" events to the pipe\'s queue? A changed bucket configuration or a deleted notification stops events silently.'],
          ['Permissions', 'Did the storage integration role or the bucket policy change?'],
          ['Load errors', '`COPY_HISTORY` for the table: files that failed are skipped by default in Snowpipe.'],
          ['Backfill', '`ALTER PIPE raw.pipe_orders REFRESH` queues files staged in the last 7 days that were not loaded.']
        ],
        tell: 'Loads stalled at 01:50 and the freshness alert fired. The pipe was healthy but received no messages, so I traced it to the bucket: an infrastructure change had removed the event notification. I restored it, ran a refresh to backfill the missing files, and checked that the row counts matched the source.',
        prevent: ['Alert on **pipe silence**: no ingested file for longer than the normal gap', 'Manage the bucket notification in the same Terraform code as the pipe', 'Reconcile row counts against the source every day', 'Document the refresh and backfill steps in a runbook']
      }),

      B.qa({
        id: 'qa-copy-pipe', t: 1, tag: 'Loading', secs: 60,
        q: 'What is the difference between COPY INTO, Snowpipe and Snowpipe Streaming?',
        pts: ['COPY INTO: you run it, on your warehouse, in batches', 'Snowpipe: runs automatically when files arrive, serverless', 'Streaming: rows without files, seconds of latency', 'Choose by freshness need and what the source can do', 'Both COPY and Snowpipe remember loaded files'],
        short: 'COPY INTO is batch loading. I run it, usually from a task or an orchestrator, on my own warehouse, and it loads files that have not been loaded before. Snowpipe is continuous file loading: the bucket sends an event when a file arrives and Snowpipe runs the COPY on serverless compute, normally within a minute or two. Snowpipe Streaming skips files, and an application or the Kafka connector writes rows directly, with seconds of latency.\n\nI choose by freshness and by what the source can do. Hours of delay are fine for COPY. Files arriving all day with a short freshness target fit Snowpipe. High-volume events fit Streaming. COPY remembers loaded files for 64 days and Snowpipe for 14.',
        fu: [
          ['Who pays for the compute in each case?', 'COPY uses my warehouse, so I pay for warehouse time. Snowpipe and Snowpipe Streaming use serverless compute that Snowflake bills separately, with no warehouse for me to size.'],
          ['What would make you pick COPY over Snowpipe?', 'Predictable cost, full control of timing, and a load window where hours of delay are acceptable. Also a source that delivers one big batch at a fixed time.']
        ],
        trap: 'Describing the three methods without saying how you choose. The choice, based on freshness and the source, is the real question.'
      }),

      B.qa({
        id: 'qa-ingest', t: 2, tag: 'Loading', secs: 75,
        q: 'How would you design reliable file ingestion into Snowflake?',
        pts: ['Land raw files first, immutable and partitioned by date', 'Stage, file format and storage integration, with no keys in SQL', 'Loads that are safe to repeat: load metadata, no FORCE', 'A bad-data policy: abort or skip the file and alert, never silent CONTINUE', 'Audit columns: file name and load time in every RAW row', 'Monitoring: copy history, pipe status, row counts against the source'],
        short: 'I land raw files in cloud storage first, immutable and partitioned by date, so any load can be replayed. Snowflake reads them through an external stage with a storage integration, so there are no keys in SQL, and a named file format so every load parses the same way. I load into RAW tables with audit columns: file name and load time.\n\nLoads must be safe to repeat, so I rely on load metadata and never use FORCE as a habit. For bad data I abort or skip the file and raise an alert. I never use a silent CONTINUE on a critical table. For monitoring I check copy history, pipe status and the file count, and I compare row counts with the source every day.',
        fu: [
          ['How do you handle a file with a changed schema?', 'The load fails or skips the file and alerts. I would add the column in RAW, fix the file format, then reload that file. A VARIANT landing column absorbs additions when the source changes often.'],
          ['How do you reload one day safely?', 'Delete that day\'s rows by file name or load date, then run COPY with the files for that day. Load metadata blocks duplicates, so for a true reload I use a new target or truncate and reload.']
        ],
        trap: 'Saying "I use Snowpipe" and stopping. The design is in the safety rails: replay, idempotency, bad-data policy and reconciliation.',
        real: 'Use the ingestion you actually built. Say how many files a day, which source, and one failure you caught because of the audit columns or the row count check.'
      }),

      B.recap({
        id: 'm3-recap', n: 3, badge: 'Loader', color: '#A5F3FC',
        pts: [
          'Three methods: **COPY INTO** (you run it, your warehouse), **Snowpipe** (files, serverless), **Streaming** (rows, seconds).',
          'A **stage** says where files are, a **file format** says how to read them, a **storage integration** grants access without keys.',
          'COPY remembers loaded files for **64 days**, Snowpipe for **14 days**. **FORCE** creates duplicates.',
          '`ON_ERROR = CONTINUE` hides bad rows. Check **rows parsed vs rows loaded**.',
          'Aim for **100 to 250 MB compressed** files. Keep audit columns: file name and load time.'
        ],
        lines: [
          'I choose the load method from the freshness target and from what the source can do.',
          'I never let a load skip rows silently, and I compare row counts with the source every day.',
          'A pipe that is running with no pending files points me at the storage notification first.'
        ]
      })
    ]
  });
})();
