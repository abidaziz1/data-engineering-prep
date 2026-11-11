/* Mission 11: moving data in. Change data capture with Datastream, ways to copy a database, transfers and migrations, event-driven integration, and how to reconcile the result.
   The apply-in-order lab is a small program of mine that applies a rule from the documentation (every change carries a sequence number). The reconciliation numbers come from the
   made-up orders run in DuckDB. The flags of gcloud were checked against its help pages, offline. Datastream, the Data Transfer Service and the other services were not reachable:
   how they work, what they support and what they cost are from documentation, and the sources and destinations change often, so check the current list. */
(function () {
  var B = LAB.b, G = LAB.get;
  var FL = G.table('cli.flags'), CK = G.table('sql.checks'), DD = G.counts('sql.dedup'), W0 = G.counts('sql.world'), FN = G.counts('fn.summary'), RD = G.table('sql.redelivered');
  var ds = FL.rows.filter(function (r) { return r[0] === 'gcloud datastream streams create'; })[0], tj = FL.rows.filter(function (r) { return r[0] === 'gcloud transfer jobs create'; })[0];
  G.expect(ds[2] === '-' && /postgresql-source-config/.test(ds[1]) && /bigquery-destination-config/.test(ds[1]) && tj[2] === '-', 'the Datastream and transfer flags exist');
  G.expect(DD.raw_rows === 20600 && DD.after_qualify === 20000 && W0.orders === 20000 && CK.rows.length === 5 && CK.rows[0][2] === 'pass' && FN.clean.passed === 4, 'the reconciliation numbers');
  var n0 = function (x) { return x.toLocaleString('en-US'); };
  var GC = [
    'gcloud datastream streams create orders-cdc \\',
    '  --location=asia-southeast1 \\',
    '  --display-name="Orders CDC" \\',
    '  --source=orders-pg-profile \\',
    '  --postgresql-source-config=source_config.json \\',
    '  --destination=orders-bq-profile \\',
    '  --bigquery-destination-config=destination_config.json \\',
    '  --backfill-all'
  ].join('\n');
  var TJ = [
    'gcloud transfer jobs create s3://brewline-partner-exports gs://brewline-landing-dev/partners/ \\',
    '  --include-prefixes=campaigns/ \\',
    '  --overwrite-when=different \\',
    '  --schedule-repeats-every=1d'
  ].join('\n');
  var APPEND = [
    '-- append-only mode: every change is a row. The current state is the latest change of each key.',
    'SELECT * EXCEPT (change_type, sequence_number)',
    'FROM `brewline-dev.raw.orders_changes`',
    'QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY sequence_number DESC) = 1',
    '  AND change_type != \'DELETE\';'
  ].join('\n');
  var BUGW = [
    'INSERT INTO `brewline-dev.curated.orders`',
    'SELECT * FROM `brewline-dev.raw.orders_export`',
    'WHERE updated_at > (SELECT MAX(updated_at) FROM `brewline-dev.curated.orders`);'
  ].join('\n');
  var FIXW = [
    'MERGE `brewline-dev.curated.orders` AS t',
    'USING (',
    '  SELECT * FROM `brewline-dev.raw.orders_export`',
    '  WHERE updated_at >= (SELECT TIMESTAMP_SUB(MAX(updated_at), INTERVAL 1 HOUR) FROM `brewline-dev.curated.orders`)',
    '  QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY updated_at DESC) = 1',
    ') AS s',
    'ON t.order_id = s.order_id',
    'WHEN MATCHED THEN UPDATE SET status = s.status, updated_at = s.updated_at',
    'WHEN NOT MATCHED THEN INSERT ROW'
  ].join('\n');

  LAB.addChapter({
    id: 'm11', n: 11, title: 'Moving data in: CDC, transfers and migrations', short: 'Integration', blurb: 'Change data capture, ways to copy a database, transfers, event-driven integration, migrations and reconciliation', minutes: 46,
    focus: ['src', 'ing'],
    goals: [
      'Explain **change data capture** and why it beats a nightly export for a live database.',
      'Apply a stream of inserts, updates and deletes **in the right order**, and say what a **sequence number** is for.',
      'Choose between **Datastream**, a **timestamp watermark**, a **transfer service** and a **migration** tool.',
      'Read the **append-only** and **merge** styles of landing changes in BigQuery.',
      '**Reconcile** a copy against its source with counts and sums.',
      'Say how a **legacy warehouse** (Teradata, Oracle, DB2) moves to BigQuery.'
    ],
    say: 'Mission 11 is about getting data out of other systems and into BigQuery, and about knowing that the copy is right. Job descriptions ask for it in three forms: change data capture with Datastream, migrations from old warehouses, and the managed transfer services. The order lab is a small program of mine that applies one rule from the documentation, and the reconciliation numbers come from the made-up orders. Datastream and the transfer services were not reachable, so what they support and cost is from documentation, and I tell you where the list changes fast.',
    scenes: [
      B.flow({
        id: 'm11-flow', t: 1, src: 'docs', title: 'A database, copied by its change log', g: 'cdc', legend: true,
        steps: [
          { say: 'The orders live in an application database. Analysts need them in BigQuery, current within minutes, deletes included, and the application must not slow down. Press Next to follow the changes.', cap: 'A live database, copied.' },
          { say: 'Step 1. Every database keeps a **change log** for its own recovery and replication: the binlog of MySQL, the write-ahead log of PostgreSQL, the redo log of Oracle. Every insert, update and delete is written there, in order.', on: ['c1'], focus: ['t_src', 't_log'], cap: 'The database already writes every change down.' },
          { say: 'Step 2. **Datastream** reads that log. It first copies the rows that already exist, the **backfill**, and then follows the new changes. It does not run queries against your tables, so the load on the source stays small.', on: ['c2'], focus: ['t_log', 't_ds'], cap: 'Backfill, then follow the log.' },
          { say: 'Step 3. The changes arrive in BigQuery. Each one says what happened (an upsert or a delete) and carries a **sequence number** that gives the order in the source.', on: ['c3'], focus: ['t_ds', 't_raw'], cap: 'Changes arrive with a type and a sequence.' },
          { say: 'Step 4. They are applied **in order of the sequence number**, not in the order in which they arrived. The next screens show what goes wrong if they are not.', on: ['c4', 'c5'], focus: ['t_raw', 't_seq', 't_cur'], cap: 'Apply by the sequence number.' },
          { say: 'Step 5. A **reconcile** step compares counts and sums with the source, and reports the difference. Trust in a copy comes from this step and not from the tool.', on: ['c6', 'c7'], focus: ['t_cur', 't_qa', 't_bi'], cap: 'Check the copy against the source.' }
        ]
      }),

      B.talk({
        id: 'm11-why', t: 1, src: 'docs', title: 'Why capture changes from the log',
        say: 'There are older ways to copy a database, and each one fails in a way that change data capture does not. Press Next for each.',
        items: [
          ['A full export', 'Copy everything every night. It is simple, and it moves the whole table to learn about a few changes, so it is slow and costly, and the data is a day old. It loads the source at the busiest moment.', 'Simple, and heavy.'],
          ['A timestamp watermark', 'Copy the rows with an `updated_at` newer than the last copy. It is cheaper, and it **never sees a delete**, it misses rows that were committed late with an older time, and it needs a trustworthy `updated_at` on every table.', 'Cheap, and blind to deletes.'],
          ['Log-based capture', 'Read the change log. It sees **every** insert, update and delete, **in order**, within seconds or minutes, and it does not query your tables. The costs: you configure the source (access to the log, retention of it), and you must apply the changes correctly.', 'Complete and fresh.'],
          ['What it still needs', 'A **backfill** for the rows that existed before, an agreement on **schema changes** (a new column in the source), a rule for **deletes**, and a **reconcile** that proves the copy. The tool moves the data and does not know whether you wanted it.', 'The tool moves, you prove.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'Datastream, in one line:', t: 'a serverless service that reads the change log of a database and writes the changes to BigQuery or Cloud Storage, with a backfill first. The list of sources and destinations grows: the help page of the gcloud I used names source configurations for several databases. Check the current list before you design.' }
      }),

      B.talk({
        id: 'm11-bq', t: 2, src: 'docs', title: 'Two styles of landing changes in BigQuery',
        say: 'A change stream in BigQuery can be stored in two ways. Press Next for each. The names of the columns and options are from the documentation, as I know it. Check the current ones.',
        items: [
          ['Merge style: a table that mirrors the source', 'The destination table has a **primary key**, and every change carries a **change type** (an upsert or a delete) and a **sequence number**. BigQuery applies them, so the table looks like the source. Reads are fresh to within a table option, `max_staleness`: a stricter value costs more at query time.', 'The table is the source, a little behind.'],
          ['Append-only style: every change is a row', 'Each change is stored as a row, with its type and sequence number. You keep the **history**, and you derive the current state with a window: the latest change of each key, ignoring keys whose last change is a delete. The query below is the usual one.', 'You keep the log, and derive the state.'],
          ['Which to choose', 'The merge style is the simplest for analysts. The append-only style is the safest to audit and to replay, and it costs a query to read the current state. Many platforms keep **append-only in raw** and build the current table in **staging**, as the layers of mission 1 suggest.', 'Raw keeps the log, staging holds the state.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm11-append', t: 2, src: 'docs', title: 'The current state from a log of changes', file: 'current_orders.sql', lang: 'sql', code: APPEND,
        steps: [
          { say: 'In the append-only style the table holds every change, so the current state is a query. This one is from the documentation of the idea, and I did not run it, because there is no stream behind this course. It is the QUALIFY of mission 6 again, with a sequence number in place of a load time. Press Next.', lines: null },
          { say: 'The window numbers the changes of each order, **highest sequence number first**. Number 1 is the last thing that happened to the order in the source, whatever the order of arrival.', lines: G.span(APPEND, /QUALIFY/) },
          { say: 'If the last change is a delete, the order no longer exists, so the filter drops it. Without it, deleted orders would haunt the report for ever.', lines: G.span(APPEND, /change_type != /) }
        ],
        note: 'The sequence number is the order in the **source**. Ordering by the arrival time would repeat the mistake of the lab: a late arrival of an old change would win.'
      }),

      B.widget({ id: 'm11-lab', kind: 'cdc', t: 1, src: 'docs', title: 'Lab: apply the changes in order' }),

      B.cmp({
        id: 'm11-methods', t: 1, src: 'docs', title: 'Five ways to copy a database to BigQuery',
        say: 'Here is the whole comparison in one table. Press Next to read the pattern.',
        cols: ['Way', 'Freshness', 'Sees deletes', 'Load on the source', 'Effort'],
        hl: 1,
        rows: [
          ['Full export each night', 'a day', 'yes, by replacing', 'high, at one time', 'low'],
          ['Timestamp watermark', 'minutes to hours', 'no', 'medium', 'low, but fragile'],
          ['Datastream (log based)', 'seconds to minutes', 'yes', 'low', 'medium: source setup, reconcile'],
          ['Dataflow templates or Debezium on Kafka or Pub/Sub', 'seconds', 'yes', 'low', 'high: you run the pieces'],
          ['Database Migration Service', 'not for analytics', 'n/a', 'n/a', 'it moves a database to another database, not to BigQuery']
        ],
        steps: [
          { upto: 2, say: 'The two simple ways. A full export is robust and heavy. A watermark is cheap and blind to deletes.' },
          { upto: 4, say: 'Log-based capture is the usual answer for a live database. Datastream is the managed one, and Debezium on Kafka is the do-it-yourself one.' },
          { upto: 5, say: 'Database Migration Service is a different tool: it moves a database to Cloud SQL or AlloyDB. Do not confuse the two names.' }
        ],
        pick: 'For a **live application database** that analysts need: **Datastream**. For a **small, stable table**: a nightly export and a MERGE is fine. For a **legacy warehouse** move: the migration path of the next screens.'
      }),

      B.rows({
        id: 'm11-reconcile', t: 1, src: 'rec', title: 'Prove the copy: counts and sums',
        steps: [
          {
            say: 'The made-up source has **' + n0(W0.orders) + '** orders. The raw layer, which keeps every delivery, has **' + n0(DD.raw_rows) + '**. The curated layer, after the dedupe of mission 6, has **' + n0(DD.after_qualify) + '**. The raw layer is **' + n0(DD.raw_rows - W0.orders) + '** rows larger, and that difference has an explanation: **' + n0(DD.ids_delivered_twice) + '** orders were delivered twice.',
            tabs: [{ layer: 'RECORDED', name: 'A reconciliation of counts', c: 'raw', cols: ['layer', 'rows', 'against the source', 'explained by'], rows: [['source (orders)', n0(W0.orders), '-', '-'], ['raw (every delivery)', n0(DD.raw_rows), '+' + n0(DD.raw_rows - W0.orders), n0(DD.ids_delivered_twice) + ' orders delivered twice'], ['curated (after QUALIFY)', n0(DD.after_qualify), '0', 'repeats removed']], trk: 0 }],
            notes: ['Recorded: counts from DuckDB on the made-up orders. A reconcile with an **unexplained** difference is the one to worry about. An explained one is a fact.']
          },
          {
            say: 'Counts are the first check. Add **sums** (the total of `total_cents`), **distinct keys**, and the **latest timestamp**: a copy that is a day behind has the right counts and the wrong freshness. These five checks of mission 6 are the shape of it: each returns rows when something is wrong.',
            tabs: [{ layer: 'RECORDED', name: 'Checks on the made-up orders', c: 'raw', cols: CK.cols, rows: CK.rows, trk: 0 }],
            notes: ['Run the reconcile on a **schedule**, compare against the source system, and alert on a difference that is not zero. Report the number of the day in the pipeline summary, so that a trend shows.']
          }
        ]
      }),

      B.code({
        id: 'm11-gcloud', t: 2, src: 'docs', title: 'Creating a stream', file: 'create_stream.sh', lang: 'bash', code: GC,
        steps: [
          { say: 'This is the shape of the command that creates a Datastream stream. I checked that every flag exists in the help page of the installed `gcloud`: ' + ds[1].split(' ').length + ' flags, none missing. I did not run it, and the connection profiles and config files that it names do not exist. Press Next.', lines: null },
          { say: 'A **stream** is a named pipe from one source to one destination, in a **location**. The display name is for people.', lines: G.span(GC, /streams create/, /display-name/) },
          { say: 'The **source**: a connection profile (the address and credentials of the database, kept as a resource) and a **source config** that says which schemas and tables to include. The flag exists for PostgreSQL, MySQL and Oracle, and the help page names more.', lines: G.span(GC, /--source=/, /postgresql-source-config/) },
          { say: 'The **destination**: a profile for BigQuery (or Cloud Storage), and a config that says the dataset and the mode, merge or append-only.', lines: G.span(GC, /--destination=/, /bigquery-destination-config/) },
          { say: '`--backfill-all` copies the existing rows of every included table first, and then follows the log. `--backfill-none` skips it, which is right only when the destination is already loaded.', lines: G.span(GC, /backfill-all/) }
        ],
        note: 'A stream also needs the source set up: a user with the right grants, the log enabled and kept long enough, and a network path (public with an allow list, or private connectivity). Most failures of a first stream are in that setup.'
      }),

      B.talk({
        id: 'm11-transfer', t: 1, src: 'docs', title: 'Transfers and migrations',
        say: 'Not every move is a live stream. Four managed services cover most of the rest. Press Next for each.',
        items: [
          ['Storage Transfer Service', 'Copies **objects** in bulk: from S3, Azure, another bucket or an on-premises agent into Cloud Storage, on a schedule, with filters on prefixes, rules for overwriting, and checks of the hashes. Use it instead of a script when the volume is large or the source is another cloud.', 'A managed copier for files.'],
          ['BigQuery Data Transfer Service', 'Runs **scheduled loads** into BigQuery from sources such as Cloud Storage, S3, and several Google and third-party applications. It also runs **scheduled queries**. Use it when a connector exists, so that there is no pipeline to write.', 'Scheduled loads from connectors.'],
          ['BigQuery Migration Service', 'Helps to move a **legacy warehouse** such as Teradata or Oracle: it assesses the estate, **translates the SQL** to BigQuery, and loads the data with the transfer service and agents. It translates most statements, and a person reviews the result.', 'Assess, translate, load.'],
          ['Database Migration Service', 'Moves a **database** to a managed one, such as MySQL or PostgreSQL to Cloud SQL or AlloyDB, with continuous replication until the cut-over. It is for the application, not for the warehouse.', 'A database to a database.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm11-transfer-code', t: 2, src: 'docs', title: 'A scheduled transfer of files from S3', file: 'transfer.sh', lang: 'bash', code: TJ,
        steps: [
          { say: 'A partner puts campaign files in an S3 bucket. This job copies them into the landing bucket every day. I checked that the flags exist in the help page of the installed `gcloud`, and I did not run it: it would need a real bucket and a credential. Press Next.', lines: null },
          { say: 'The **source** and the **destination** are the first two words. `s3://` is the other cloud. The credential for it is stored as a secret in the job, or in the agent pool, and is never in the command.', lines: G.span(TJ, /transfer jobs create/) },
          { say: 'A **prefix filter** limits what is copied, and **overwrite when different** copies a file again only when it changed (by size or hash, as the service decides). Together they make the job safe to repeat.', lines: G.span(TJ, /include-prefixes/, /overwrite-when/) },
          { say: 'A **schedule**: every day. The job runs by itself, and the service retries failed files.', lines: G.span(TJ, /schedule-repeats-every/) }
        ],
        note: 'Land the files unchanged, and let mission 3\'s notification and a load job take it from there. Checking the hashes after a transfer is a cheap test.'
      }),

      B.cmp({
        id: 'm11-dbs', t: 2, src: 'docs', title: 'Getting each kind of source into BigQuery',
        say: 'The sources of an estate are mixed. Here is the usual road for each. Press Next to read the pattern. Support for sources changes fast: check the current documentation of each connector.',
        cols: ['Source', 'Usual road', 'Watch out for'],
        hl: 1,
        rows: [
          ['Cloud SQL or AlloyDB (MySQL, PostgreSQL)', 'Datastream for the change stream, or a federated query for a small lookup', 'The log must be enabled and retained long enough'],
          ['An on-premises Oracle or SQL Server', 'Datastream over private connectivity, or an export in files', 'Network path, and the supplemental logging of the source'],
          ['Spanner or Bigtable', 'Their own change streams, read by a Dataflow template into BigQuery', 'Another set of limits for each: read them'],
          ['Files from partners or other clouds', 'Storage Transfer Service, then a load job', 'A marker for the end of a batch (mission 3)'],
          ['A SaaS application', 'A BigQuery Data Transfer Service connector, or a partner tool', 'API limits, and a schema that the vendor changes'],
          ['Events from your own services', 'Pub/Sub and a BigQuery subscription (mission 7)', 'Repeats, and the order of events']
        ],
        steps: [
          { upto: 3, say: 'Databases: a change stream where one exists. A federated query is fine for a small lookup and wrong for a big join.' },
          { upto: 6, say: 'Files, applications and events each have a managed road. Pick the one that has no code to write.' }
        ],
        pick: 'Use the road with the **least code** that meets the freshness, and look at **who owns the schema**. A schema that a vendor can change without telling you needs a check before every load.'
      }),

      B.talk({
        id: 'm11-fed', t: 2, src: 'docs', title: 'Federated queries: a join over there',
        say: 'BigQuery can query some other systems in place. Press Next for when it helps and when it hurts.',
        items: [
          ['What it is', 'A **federated query** sends part of the work to another service: `EXTERNAL_QUERY` runs a SQL statement in Cloud SQL or Spanner and returns rows to BigQuery. External tables read files in Cloud Storage or Bigtable. No copy is made.', 'Query it where it is.'],
          ['When it helps', 'A **small lookup** from an application database in a larger query: a list of 200 store codes, a current price. It needs no pipeline and is always current.', 'A small, current lookup.'],
          ['When it hurts', 'A **large join or a heavy scan** puts the load on the application database, and is slower than a copy. A federated query is a way to avoid a pipeline, not a way to avoid its cost.', 'Never run a big join against the application.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm11-events', t: 1, src: 'docs', title: 'Event-driven integration with small functions',
        say: 'Between a stream and a batch there is a middle road: a few lines of code that react to an event. Press Next.',
        items: [
          ['Cloud Run functions and Eventarc', 'A **Cloud Run function** (the new name of Cloud Functions) runs a small piece of code when an event arrives. **Eventarc** routes events from Cloud Storage, Pub/Sub, audit logs and other sources to it, as **CloudEvents**. A file lands, a function checks the name and starts a load.', 'A few lines of code for each event.'],
          ['At least once, again', 'Events are delivered at least once, so the function must be safe to repeat, as in mission 7. I tested one with real CloudEvents: the right code passed **' + FN.clean.passed + '** tests, and a copy that appended failed the test that delivers a message twice.', 'Same rule, same test.'],
          ['When it is too much', 'A function for each message is fine for a trickle and wrong for a flood: the cost and the load on the target grow. A BigQuery subscription or a Dataflow job takes over at volume.', 'A function is for a trickle.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm11-legacy', t: 2, src: 'docs', title: 'Moving a legacy warehouse to BigQuery',
        say: 'Job descriptions mention migrations from Teradata, Oracle and DB2 more often than you would guess. The plan has five steps. Press Next for each.',
        items: [
          ['Assess', 'List the tables, the queries, the schedules and the **users**. Find what is used and what is dead: a third of an old warehouse is often unused. Do not migrate what nobody reads.', 'Migrate what is used.'],
          ['Translate the SQL', 'Old dialects differ: functions, date handling, `MERGE`, procedural code. A **translator** (the BigQuery Migration Service) converts most statements, and a person reviews the rest. Run both versions on the same data and compare the results.', 'Translate, then compare.'],
          ['Move the data', 'Export from the old system, land the files in Cloud Storage with a transfer agent or Storage Transfer Service, and load them. Reshape on the way: nested tables, partitions and clusters instead of indexes.', 'Land files, then load.'],
          ['Validate', 'Compare **counts, sums and a sample of rows** between the two systems for each table. Google publishes an open-source **Data Validation Tool** for this kind of comparison. Run the old and the new in parallel for a period.', 'Compare, in parallel.'],
          ['Cut over by domain', 'Move one business area at a time: orders, then stock, then finance. Point the reports at BigQuery for that area, keep the old one read-only for a while, and then switch it off.', 'One domain at a time.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'Lift and shift, then modernise:', t: 'first get the same tables and queries running on BigQuery, then redesign the slow and the costly ones with partitions, nested columns and Dataform. Doing both at once makes it impossible to tell a migration bug from a design change.' }
      }),

      B.decide({
        id: 'm11-dec', t: 1, src: 'docs', title: 'Decision: how the orders database reaches BigQuery',
        scenario: 'The application keeps orders in Cloud SQL for PostgreSQL. The analysts want them in BigQuery within a few minutes, with cancelled and deleted test orders gone. The database is busy at lunchtime. A nightly export exists today, and everybody complains that the data is a day old.',
        opts: [
          { t: 'Keep the nightly export and run it every 15 minutes', d: 'No new tool.', lose: 'Every run copies the whole table, at the busiest moments, and it still misses deletes unless it replaces everything.' },
          { t: 'Datastream into BigQuery, with a backfill, landing in raw, and a reconcile', d: 'Fresh within minutes, deletes included, and a small load on the source.', lose: '' },
          { t: 'A query on `updated_at` greater than the last copy, every 5 minutes', d: 'Cheap and quick to write.', lose: 'It never sees a delete, and rows committed late with an older timestamp are lost, so the reconcile will drift.' }
        ],
        pick: 1,
        why: 'Fresh data with deletes from a busy database is what log-based capture is for. Keep the raw changes, build the current table from them, and prove the copy with a reconcile.',
        when: 'For a small table that changes once a day, the nightly export and a MERGE is simpler and good enough.'
      }),

      B.bug({
        id: 'm11-bug', t: 1, q: 'An incremental load by timestamp has a few orders missing every week, and cancelled orders never disappear. Click the line that causes the missing orders.',
        file: 'incremental.sql', lang: 'sql', code: BUGW, bad: [3],
        hint: 'What happens to a row that is committed after the load, with a timestamp older than the newest copied row?',
        why: 'The filter takes rows **newer than the newest row already copied**. A row that is committed late, with an earlier `updated_at`, is never newer, so it is skipped for ever. Take an overlap (a lookback of an hour or more, with `>=`) and **merge by the key** so that the overlap is harmless. Deletes still need a log or a full compare: this pattern cannot see them.',
        fix: FIXW,
        cheer: 'Overlap, and merge by key.'
      }),

      B.incident({
        id: 'm11-inc', t: 2, src: 'rec', title: 'Incident: the warehouse has 0.4 percent more orders than the source', time: '09:10',
        alert: '**The finance team compared the order count of the warehouse with the application database, and the warehouse has 0.4 percent more.** The copy is a Datastream stream in append-only style, and the curated table is built by a daily query.',
        clues: ['The warehouse has extra orders, never fewer', 'The curated query keeps the latest change of each order by the load time', 'Some orders were deleted in the source as test orders', 'The backfill ran for a day while changes kept arriving'],
        opts: [
          { t: 'Reconcile by key to find the extra orders, then rebuild the curated table with the latest change by the sequence number and drop keys whose last change is a delete', fb: '' },
          { t: 'Delete the 0.4 percent from the warehouse by hand each month', fb: 'It hides the cause, and the next deleted order reappears.' },
          { t: 'Restart the stream and run the backfill again', fb: 'The data is there. The bug is in how the current state is derived, and a new backfill would overlap with live changes again.' },
          { t: 'Tell finance that a small difference is normal', fb: 'A difference that you cannot explain is the one that you cannot accept.' }
        ],
        best: 0,
        why: 'Extra rows that are never fewer point at **deletes that were not applied**. The curated query ordered by the load time and did not drop the keys whose last change is a delete. Order by the sequence number of the source, and exclude deleted keys, and the difference closes.',
        checks: [
          ['Find the extra keys', 'Compare the keys of the warehouse with the keys of the source. Check the type of the last change of each extra key.'],
          ['Look at the derivation', 'How is the current state chosen? By load time or by sequence number? Are deletes dropped?'],
          ['Rebuild', 'Latest change by sequence number, excluding deletes, as the append-only query showed.'],
          ['Prevent', 'A daily reconcile of counts and sums against the source, an alert on any unexplained difference, and a test with a delete in the data.']
        ],
        tell: 'The extra orders were deleted in the source. The curated query picked the latest change by load time and never dropped a key whose last change was a delete. I rebuilt it with the sequence number and excluded deletes, and added a daily reconcile of counts and sums with an alert, and a test that includes a delete.',
        prevent: ['A reconcile of counts and sums on a schedule', 'Order by the sequence number of the source', 'A delete and a late change in every test of the apply step']
      }),

      B.quiz({
        id: 'm11-q1', t: 1,
        q: 'A nightly export copies the full orders table. What does it learn about orders deleted during the day?',
        opts: [
          { t: 'Nothing, unless it replaces the whole destination', fb: '' },
          { t: 'Each delete, in order', fb: 'That is what a change log gives. An export is a snapshot.' },
          { t: 'The time of each delete', fb: 'A snapshot has no history.' },
          { t: 'Nothing is ever deleted in a database', fb: 'Deletes happen, and are the usual blind spot.' }
        ],
        ok: 0,
        why: 'A snapshot shows the rows that exist now. A deleted row is simply absent, so a copy that adds and updates will keep the deleted row. Replace everything, or read the log.'
      }),

      B.quiz({
        id: 'm11-q2', t: 1,
        q: 'Why does a change stream carry a sequence number?',
        opts: [
          { t: 'To count the changes', fb: 'It is for order, not for counting.' },
          { t: 'Because changes can arrive out of order, and the order in the source decides the final state', fb: '' },
          { t: 'To encrypt the change', fb: 'It has nothing to do with encryption.' },
          { t: 'To pay for each change', fb: 'It is not a billing field.' }
        ],
        ok: 1,
        why: 'In the lab, applying changes in the order of arrival left order o1 as PACKED, when the source said PAID. By sequence number the table matched the source.'
      }),

      B.quiz({
        id: 'm11-q3', t: 1,
        q: 'The raw layer has 20,600 rows, the source has 20,000 orders, and 600 orders were delivered twice. Is the difference a problem?',
        opts: [
          { t: 'Yes, always', fb: 'It is fully explained by the repeats.' },
          { t: 'No: it is explained, and the curated layer has 20,000', fb: '' },
          { t: 'Yes, because raw must equal the source', fb: 'Raw keeps every delivery, which is its job.' },
          { t: 'Only if finance asks', fb: 'An unexplained difference is the problem. This one is explained.' }
        ],
        ok: 1,
        why: 'A reconcile compares layers and explains each difference. An explained difference is a fact. An unexplained one is an incident.'
      }),

      B.quiz({
        id: 'm11-q4', t: 2,
        q: 'You need a small, always-current lookup of 200 store codes from Cloud SQL inside a BigQuery query. What fits?',
        opts: [
          { t: 'A federated query with EXTERNAL_QUERY', fb: '' },
          { t: 'A full Datastream stream for 200 rows', fb: 'A lot of machinery for a small lookup.' },
          { t: 'A nightly export of the whole database', fb: 'It would not be current, and it copies more than needed.' },
          { t: 'Copy the codes into the query text by hand', fb: 'They will go stale and nobody will notice.' }
        ],
        ok: 0,
        why: 'A small, current lookup is what federated queries are for. For a large join, copy the data instead.'
      }),

      B.quiz({
        id: 'm11-q5', t: 2,
        q: 'What is the safest way to run a legacy warehouse migration?',
        opts: [
          { t: 'Switch everything on one weekend', fb: 'A single cut-over hides which change broke which report.' },
          { t: 'Assess, translate, load, validate in parallel, and cut over by business domain', fb: '' },
          { t: 'Redesign every table first, then move', fb: 'You cannot then tell a migration bug from a design change.' },
          { t: 'Move only the data and rewrite the queries later', fb: 'Without the queries, nobody can validate the result.' }
        ],
        ok: 1,
        why: 'Move in steps that can be checked: same results first, redesign second, one domain at a time.'
      }),

      B.order({
        id: 'm11-ord', t: 1, q: 'Put the setup of a change data capture pipeline in order.',
        items: [
          'Agree with the source owner on the log, a user, retention and the network path',
          'Create the connection profiles and the stream, with a backfill',
          'Land the changes unchanged in the raw layer',
          'Build the current state by the sequence number, dropping deleted keys',
          'Reconcile counts and sums against the source on a schedule',
          'Alert on a difference that is not explained'
        ],
        why: 'The source must be ready before the tool can read it. Raw keeps the log so that you can rebuild. The current state is derived, and the reconcile is what makes it trusted.'
      }),

      B.qa({
        id: 'qa-cdc', t: 1, tag: 'Integration', secs: 90,
        q: 'How do you replicate a live application database into BigQuery?',
        pts: ['Log-based change data capture, for example Datastream', 'Backfill, then follow the log', 'Land the changes unchanged in raw', 'Apply by the sequence number, handle deletes', 'Reconcile counts and sums', 'Schema changes and source setup'],
        short: 'For a live database I use log-based change data capture, with Datastream on Google Cloud. It reads the change log of the database, first copies the existing rows (the backfill), then follows the inserts, updates and deletes, with little load on the source. I land the changes unchanged in the raw layer, in append-only style, so that I keep the history and can rebuild.\n\nThe current state is derived by taking the latest change of each key **by the sequence number of the source**, not by the arrival time, and by dropping keys whose last change is a delete. Then I reconcile counts, sums and the latest timestamp against the source on a schedule, and alert on any difference that I cannot explain. I also agree with the source owner on schema changes, because a new column arrives without a warning.',
        fu: [['Why not a nightly export?', 'It is a day old, it loads the source, and it never sees a delete unless it replaces everything.'], ['What goes wrong with the order?', 'Changes can arrive out of order, so applying by arrival can leave an old value. In my lab it left PACKED where the source said PAID.']],
        trap: 'Describing the tool and skipping deletes, order and the reconcile.',
        real: 'Tell me about a copy of a database that was not quite right, and how you found out.'
      }),

      B.qa({
        id: 'qa-recon', t: 2, tag: 'Integration', secs: 75,
        q: 'How do you know that the warehouse copy is right?',
        pts: ['Reconcile against the source on a schedule', 'Counts, sums, distinct keys, latest timestamp', 'Explain every difference', 'Compare by key to find the extra and the missing rows', 'Alert on unexplained differences', 'Tests with deletes and late changes'],
        short: 'I reconcile it against the source on a schedule, with several checks and not just one: row counts, sums of the money columns, distinct keys, and the latest timestamp, because a copy that is a day late can have the right counts. When there is a difference I compare by key to find the extra and the missing rows, and I explain every difference. In my example the raw layer had 600 more rows than the source, and all 600 were orders that had been delivered twice, which is a fact. An unexplained difference raises an alert.\n\nI also test the apply step with data that has a delete, a late change and a repeat, because those are the cases that make a copy drift.',
        fu: [['What would you do about a small, constant difference?', 'Find it by key. A constant difference is usually a rule, such as deletes or test orders, and it must be written down and tested.'], ['Where do you keep the results?', 'In a table, one row for each run and check, so that trends and the first day of a drift are visible.']],
        trap: 'Saying "I compare the row counts" and nothing more.',
        real: 'Describe a reconcile that found a real problem.'
      }),

      B.qa({
        id: 'qa-migrate', t: 2, tag: 'Integration', secs: 90,
        q: 'You must migrate a Teradata warehouse to BigQuery. What is your plan?',
        pts: ['Assess: what is used, by whom', 'Translate the SQL and compare results', 'Land files in Cloud Storage and load', 'Validate counts, sums and samples in parallel', 'Cut over by business domain', 'Lift and shift, then modernise'],
        short: 'I start with an assessment: which tables, queries and schedules exist, who uses them, and which are dead, because a large part of an old warehouse is unused and I do not migrate it. Then I translate the SQL, with the BigQuery Migration Service for the bulk and a person for the rest, and I run old and new on the same data and compare the results.\n\nI move the data through files: export, land in Cloud Storage with a transfer agent or Storage Transfer Service, and load into partitioned tables. I validate counts, sums and samples for every table and run both systems in parallel for a period. I cut over **one business domain at a time**. And I lift and shift first, then modernise the slow and costly parts with nested columns, partitions and Dataform, so that a migration bug is not mixed with a design change.',
        fu: [['How do you validate?', 'Counts, sums and a row sample for each table, with a tool such as the Data Validation Tool, and a report from each system compared by its owner.'], ['What is the biggest risk?', 'Silent differences in semantics: dates, nulls, rounding and sort order. They look right and are wrong.']],
        trap: 'Describing only the data copy.',
        real: 'Tell me about a migration you worked on, and what surprised you.'
      }),

      B.qa({
        id: 'qa-wm', t: 1, tag: 'Integration', secs: 60,
        q: 'What are the limits of an incremental load by timestamp?',
        pts: ['It never sees deletes', 'Late commits with an older timestamp are missed', 'Needs a trusted updated_at on every table', 'Fix: overlap window and merge by key', 'Deletes need a log or a full compare', 'Consider CDC'],
        short: 'It has two blind spots. It **never sees a delete**, because a deleted row simply is not there to have a new timestamp. And it **misses rows committed late** with a timestamp older than the newest one that was copied, so they are skipped for ever. It also assumes that every table has an `updated_at` that every writer keeps right.\n\nI reduce the risk with an **overlap**: take rows newer than the newest copied minus a margin, with `>=`, and **merge by the key** so that the overlap is harmless. For deletes I need either the change log, which means change data capture, or a periodic full compare of keys. For a table where both matter, I go to Datastream.',
        fu: [['What would a full compare of keys look like?', 'Compare the set of keys in the source with the set in the warehouse, and delete the ones that are gone.'], ['When is a watermark fine?', 'A table that is only ever inserted, with a reliable time, such as an event log.']],
        trap: 'Saying that a timestamp is enough.',
        real: 'Tell me about a bug caused by a late commit or a missing delete.'
      }),

      B.recap({
        id: 'm11-recap', n: 11, badge: 'Data Mover', color: '#FED7AA',
        pts: [
          '**Log-based capture** sees every insert, update and delete, in order, with little load on the source. A nightly export is a day old. A **timestamp watermark** never sees a delete.',
          'Changes can arrive **out of order**. Apply them by the **sequence number** of the source. Applying by arrival left **PACKED** where the source said **PAID**.',
          'Land changes **unchanged** in raw (append-only), and derive the current state: latest change by sequence, **deleted keys dropped**.',
          'Use **Datastream** for a live database, a **transfer service** for files and SaaS, **Database Migration Service** for database to database, and a **migration plan** for a legacy warehouse.',
          '**Reconcile** counts, sums, keys and the latest timestamp. Raw had **' + n0(DD.raw_rows - W0.orders) + '** more rows than the source, all explained by repeats.',
          'A **federated query** is for a small lookup, a **function** is for a trickle, and a migration moves **one domain at a time**.'
        ],
        lines: [
          'I apply changes by the sequence number, and I test with a delete.',
          'I reconcile on a schedule and explain every difference.',
          'I choose the road with the least code that meets the freshness.'
        ]
      })
    ]
  });
})();
