/* Mission 5: BigQuery performance and cost. Partitions, clusters, the bytes a query reads, guards, and the two price models. The bytes are an ESTIMATE made by a small
   program from the sizes that the documentation gives for each data type, on made-up orders pictured at 20,000 times their size. BigQuery itself was not reachable, so only a dry
   run in BigQuery gives your real number. The request bodies were built with the real client library, offline. Prices are examples. The rules of the service are from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var E = G.table('sql.estimates'), ED = G.counts('sql.estimate_detail'), ER = G.counts('sql.estimate_rules'), DAYS = G.table('sql.days'), W0 = G.counts('sql.world'), CODE = G.file('code/warehouse.py');
  var QRY = G.file('bq/query.json'), DRY = G.file('bq/dry_run.json'), BS = G.counts('bq.summary'), FL = G.table('cli.flags');
  var e = function (label) { var r = E.rows.filter(function (x) { return x[0] === label; })[0]; if (!r) throw new Error('no estimate ' + label); return r; };
  var ALL = e('SELECT *'), L10 = e('LIMIT 10'), SGZ = e('one Singapore day, filtered with DATE(ts, zone)'), SGB = e('one Singapore day, filtered with two bounds'), ONE = e('three columns and a filter, one UTC day'), THREE = e('three columns'), SUB = e('bound from a subquery');
  G.expect(ALL[4] === L10[4] && ALL[2] === L10[2], 'LIMIT does not change the bytes');
  G.expect(SGZ[2] === '14 of 14' && SGB[2] === '2 of 14' && ONE[2] === '1 of 14' && SUB[2] === '14 of 14', 'the partitions that each filter keeps');
  G.expect(DAYS.rows.length === 3 && ER.scale === 20000 && ER.example_price_per_tib_usd === 6.25, 'the days table and the rules');
  G.expect(BS.query_max_bytes_billed === '10737418240' && BS.query_priority === 'BATCH' && BS.dry_run_flag === true, 'the query body');
  var gib = function (n) { return (n / Math.pow(1024, 3)).toFixed(1) + ' GiB'; };
  var mib = function (n) { return Math.round(n / 1048576) + ' MiB'; };
  var usd = function (x) { return '$' + (x >= 1 ? x.toFixed(2) : x >= 0.01 ? x.toFixed(3) : x.toFixed(4)); };
  var bqq = FL.rows.filter(function (r) { return r[0] === 'bq query'; })[0];
  G.expect(/dry_run/.test(bqq[1]) && /maximum_bytes_billed/.test(bqq[1]) && bqq[2] === '-', 'the bq query flags exist');
  var SG = [
    '-- 1. looks right, prunes nothing',
    'WHERE DATE(order_ts, "Asia/Singapore") = DATE "2026-11-05"',
    '',
    '-- 2. the same Singapore day, as two bounds on the partition column',
    'WHERE order_ts >= TIMESTAMP "2026-11-04 16:00:00+00"',
    '  AND order_ts <  TIMESTAMP "2026-11-05 16:00:00+00"'
  ].join('\n');
  var BQF = [
    'bq query --use_legacy_sql=false --dry_run \\',
    '  --maximum_bytes_billed=10737418240 \\',
    '  --label=pipeline:daily_orders --label=env:dev \\',
    '  \'SELECT order_id, store_id, total_cents',
    '   FROM `brewline-dev.curated.orders`',
    '   WHERE order_ts >= TIMESTAMP "2026-11-04 16:00:00+00"',
    '     AND order_ts <  TIMESTAMP "2026-11-05 16:00:00+00"\''
  ].join('\n');
  var JOBS = [
    'SELECT user_email,',
    '       (SELECT value FROM UNNEST(labels) WHERE key = \'pipeline\') AS pipeline,',
    '       COUNT(*) AS jobs,',
    '       ROUND(SUM(total_bytes_billed) / POW(1024, 4), 3) AS tib_billed',
    'FROM `brewline-dev`.`region-asia-southeast1`.INFORMATION_SCHEMA.JOBS_BY_PROJECT',
    'WHERE creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)',
    '  AND job_type = \'QUERY\' AND state = \'DONE\'',
    'GROUP BY user_email, pipeline',
    'ORDER BY tib_billed DESC',
    'LIMIT 20;'
  ].join('\n');
  var BUGQ = [
    'SELECT store_id, SUM(total_cents) AS revenue_cents',
    'FROM `brewline-dev.curated.orders`',
    'WHERE DATE(order_ts, "Asia/Singapore") = DATE "2026-11-05"',
    'GROUP BY store_id'
  ].join('\n');
  var FIXQ = [
    'SELECT store_id, SUM(total_cents) AS revenue_cents',
    'FROM `brewline-dev.curated.orders`',
    'WHERE order_ts >= TIMESTAMP "2026-11-04 16:00:00+00"',
    '  AND order_ts <  TIMESTAMP "2026-11-05 16:00:00+00"',
    '  AND DATE(order_ts, "Asia/Singapore") = DATE "2026-11-05"',
    'GROUP BY store_id'
  ].join('\n');

  LAB.addChapter({
    id: 'm5', n: 5, title: 'BigQuery: read less, pay less', short: 'Cost', blurb: 'Partitions, clusters, the bytes a query reads, guards, and on demand against capacity', minutes: 52,
    focus: ['mart', 'snap'],
    goals: [
      'Say what **partitioning** and **clustering** do, and when each helps.',
      'Estimate the **bytes** of a query from its columns and partitions, and say why `LIMIT` saves nothing.',
      'Find the filter that **looks like** a partition filter and prunes **nothing**.',
      'Put a **guard** on a query: a dry run, a billing cap, and a required filter.',
      'Choose **on demand** or **capacity**, and say where each side wins.',
      'Find the **costly queries** in the job history, and fix the biggest.'
    ],
    say: 'Mission 5 is where BigQuery turns into money. On the on-demand model you pay for the bytes a query reads, so the skill is to read less, and to know how much a query will read before you run it. I wrote a small program that estimates the bytes from the documented size of each type, and applied it to eleven queries on one orders table. The bytes are our estimate, and the labs say so. One of the queries looks exactly like a partition filter and reads every partition. That one is worth a screen of its own.',
    scenes: [
      B.talk({
        id: 'm5-why', t: 1, src: 'docs', title: 'Reading less is the whole game',
        say: 'On the on-demand model, BigQuery bills the bytes that a query reads. Four levers cut them. Press Next for each.',
        items: [
          ['Fewer columns', 'Storage is columnar, so a query reads only the columns that it names. `SELECT *` reads all of them, and on a nested table it reads every leaf. Naming three columns instead of ten cut the bytes by about four fifths in the recording.', 'Name the columns.'],
          ['Fewer partitions', 'A partitioned table is cut into pieces, usually one per day. A filter on the partition column lets the planner **skip** whole pieces before any data is read. This is the biggest lever on a large table.', 'Filter the partition column.'],
          ['Fewer blocks', '**Clustering** sorts the data inside a partition by chosen columns, so a filter on them can skip blocks. The saving is real but not exact: BigQuery knows what it saved only after the query ran.', 'Cluster by what you filter on.'],
          ['Fewer repeats', 'The same query on unchanged data is served from the **cache** for free. A **materialized view** keeps a heavy aggregate ready. And a scheduled query that runs every five minutes is a repeat that you chose.', 'Do not read the same bytes twice.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The order to think in:', t: 'columns first (free), then the partition filter (large), then clustering (smaller), then caches and views (for repeats).' }
      }),

      B.talk({
        id: 'm5-part', t: 1, src: 'docs', title: 'Partitioning, in four rules',
        say: 'A partition is a piece of a table that BigQuery can read or skip as a whole. Press Next for the four rules that matter.',
        items: [
          ['Three kinds', 'A **time-unit column** partition cuts by the day (or hour, month, year) of a `DATE`, `TIMESTAMP` or `DATETIME` column. An **ingestion-time** partition cuts by the load time. An **integer range** partition cuts by ranges of a number. For events and orders, a time column is the usual choice.', 'Day of the event time, in most cases.'],
          ['Partition by what you filter on', 'A partition helps only if queries filter on that column in a way that the planner can use. If analysts ask "last week" all day, partition by the day. If they ask by store, partition would not help: **cluster** by store.', 'Partition by the filter people actually write.'],
          ['Not too many, not too small', 'A table can have a limited number of partitions (the limit has been raised over the years, so check the current quota). Very small partitions add metadata work and save nothing. Daily partitions are fine for a table that gets a few hundred megabytes a day or more; for less, consider monthly.', 'A partition should hold a meaningful amount.'],
          ['Make the filter mandatory', '`require_partition_filter` makes BigQuery **refuse** a query without a filter on the partition column. `partition_expiration_days` deletes old partitions by itself. Both are one line in the table definition, as the DDL of mission 4 showed.', 'Let the table refuse the careless query.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm5-cluster', t: 2, src: 'docs', title: 'Clustering, in three rules',
        say: 'Clustering is the smaller lever, and it composes with partitions. Press Next for the three rules.',
        items: [
          ['What it does', 'Rows inside each partition are **sorted by up to four columns** and stored in blocks. A filter or a join on those columns can skip blocks that cannot match. BigQuery re-clusters in the background at no charge to you.', 'Sorted blocks that can be skipped.'],
          ['Order matters', 'The first clustering column is the most useful. A filter on the **second** column alone helps much less. List the columns in the order that your queries filter, most selective and most used first.', 'The first column does most of the work.'],
          ['The estimate is an upper bound', 'On a clustered table, a **dry run** reports the bytes without the block savings, because those are known only when the query runs. The bill can be lower than the estimate, never higher. Do not conclude that clustering does nothing because the estimate did not move.', 'The estimate is a ceiling.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'Partition and cluster together:', t: 'partition by the day of the order, cluster by store and status. A query for one store on one day then reads one partition and few blocks.' }
      }),

      B.widget({ id: 'm5-bytes', kind: 'bytes', t: 1, src: 'rec', title: 'Lab: the bytes a query reads' }),

      B.rows({
        id: 'm5-est', t: 1, src: 'rec', title: 'Eleven queries on one table: what each reads',
        steps: [
          {
            say: 'This is the whole table behind the lab: eleven queries on the same orders table, pictured at ' + ER.scale.toLocaleString('en-US') + ' times the sample, ' + (W0.scaled_orders / 1e6).toFixed(0) + ' million orders. Look at three rows. `SELECT *` reads ' + gib(ALL[4]) + '. Naming three columns reads ' + gib(THREE[4]) + '. And a single UTC day reads ' + mib(ONE[4]) + '.',
            tabs: [{ layer: 'ESTIMATED', name: 'Our estimate of the bytes, by query', c: 'raw', cols: ['query', 'partitions read', 'billed', 'one run, example rate'], rows: E.rows.map(function (r) { return [r[0], r[2], gib(r[4]), usd(r[5])]; }), trk: 0 }],
            notes: ['**Our estimate**, from the documented size of each type, with the rule that ' + ER.billing_rounding + '. Clustering is not modelled. Dry runs in BigQuery give the real numbers.']
          },
          {
            say: '`LIMIT 10` reads exactly as much as `SELECT *`: ' + gib(L10[4]) + ' against ' + gib(ALL[4]) + '. `LIMIT` cuts the rows that come back, and the bytes are read before it applies. People add it to "save money", and it saves none. The saving comes from naming columns and filtering the partition.',
            tabs: [{ layer: 'ESTIMATED', name: 'Two queries, the same bill', c: 'raw', cols: ['query', 'columns read', 'billed'], rows: [[ALL[0], ALL[1], gib(ALL[4])], [L10[0], L10[1], gib(L10[4])]], trk: 0 }],
            notes: ['The exception: on a table that is **clustered**, a query with a filter on the clustering columns and a LIMIT can stop early and read less than the estimate. Do not count on it.']
          }
        ]
      }),

      B.rows({
        id: 'm5-days', t: 1, src: 'rec', title: 'A day in Singapore is two days in UTC',
        steps: [
          {
            say: 'A `TIMESTAMP` column is stored in UTC, and partitions are cut at UTC midnight, which is eight in the morning in Singapore. Brewline reports by the **Singapore** day. On the recorded orders, the Singapore day of 5 November is made of **two UTC days**: ' + DAYS.rows[0][2] + ' orders from the evening of the 4th UTC, and ' + DAYS.rows[1][2] + ' from the 5th. The third row shows the orders of the 5th UTC that belong to the 6th in Singapore.',
            tabs: [{ layer: 'RECORDED', name: 'UTC day and Singapore day, with order counts', c: 'raw', cols: DAYS.cols, rows: DAYS.rows, trk: 0 }],
            notes: ['Recorded: DuckDB ran `DATE(order_ts)` and `DATE(order_ts, "Asia/Singapore")` on the made-up orders. The counts are the real counts of that data.']
          },
          {
            say: 'So a report for one Singapore day must read **two** UTC partitions, and no fewer. The next screen compares two ways to write that filter. One of them reads the two partitions. The other reads all fourteen.',
            tabs: [{ layer: 'RULE', name: 'The partitions behind a Singapore day', c: 'raw', cols: ['Singapore day', 'UTC partitions it needs'], rows: [['5 November', '4 and 5 November (UTC)'], ['6 November', '5 and 6 November (UTC)']], trk: 0 }],
            notes: ['The shift is 8 hours, so every local day straddles two UTC days. A table partitioned by a local-time column would avoid this, at the price of a column to maintain.']
          }
        ]
      }),

      B.code({
        id: 'm5-sg', t: 1, src: 'rec', title: 'Two filters for the same Singapore day', file: 'filters.sql', lang: 'sql', code: SG,
        steps: [
          { say: 'Both filters ask for the same Singapore day. I ran them through the estimate. Press Next.', lines: null },
          { say: 'The first one wraps the partition column in a function with a time zone. It is the natural way to write "the Singapore day". The planner cannot turn that into a range of partitions, so it reads **' + SGZ[2] + '** partitions: ' + gib(SGZ[4]) + ' billed, ' + usd(SGZ[5]) + ' a run at the example rate.', lines: G.span(SG, /1\. looks/, /WHERE DATE/) },
          { say: 'The second one compares the **partition column itself** with two constants that mark the day in UTC. It reads **' + SGB[2] + '** partitions: ' + gib(SGB[4]) + ', ' + usd(SGB[5]) + '. About ' + (SGZ[4] / SGB[4]).toFixed(1) + ' times less, for the same rows.', lines: G.span(SG, /2\. the same/, /AND order_ts/) }
        ],
        note: 'The rule of the estimate: a filter prunes when it compares the partition column, or DATE of it, with constants. The documentation says to filter on the partition column itself and avoid wrapping it. Check the dry run in the console for your real query.'
      }),

      B.code({
        id: 'm5-estcode', t: 2, src: 'rec', title: 'How the estimate works', file: 'warehouse.py', lang: 'python', code: CODE,
        steps: [
          { say: 'The estimate is a short program, and you should know what it does and what it leaves out. Press Next.', lines: null },
          { say: 'The sizes come from the documentation of the data types: 8 bytes for integers and timestamps, 1 for a boolean, 16 for a numeric. A string is 2 bytes plus its length in UTF-8, and a null is 0.', lines: G.span(CODE, /^FIXED_SIZES/) },
          { say: 'For one query, sqlglot reads the SQL and lists the columns that it touches, expanding `SELECT *` and `EXCEPT`. A nested leaf is a column of its own.', lines: G.span(CODE, /^def referenced_columns/, /return sorted/) },
          { say: 'Then the partitions. Only the parts of the filter that compare the partition column with constants count. DuckDB checks which days can match. Everything else keeps all partitions.', lines: G.span(CODE, /^def partitions_read/, /usable = /) },
          { say: 'Last, the sum, the scale, and the rounding: up to a whole MiB, at least 10 MiB, as I read in the documentation. Clustering, caching and materialized views are not modelled.', lines: G.span(CODE, /^def estimate/, /example_usd/) }
        ],
        note: 'It is a model for teaching. BigQuery\'s own dry run is the real thing. Use this to understand why a number moves, and the dry run to know the number.'
      }),

      B.talk({
        id: 'm5-dry', t: 1, src: 'docs', title: 'Know the bytes before you run: dry run and caps',
        say: 'You do not have to guess, and you do not have to find out from the bill. Press Next for the three tools.',
        items: [
          ['A dry run', 'A **dry run** validates the query and reports the bytes that it **would** process, and runs nothing. The console shows it as you type. The command line has `--dry_run`, and the client library has `dry_run=True` on the job configuration. Put a dry run in your pipeline tests for every important query.', 'Ask before you spend.'],
          ['A cap on the job', '`maximum_bytes_billed` on a job makes it **fail without charge** if it would bill more than the cap. A pipeline that normally reads 5 GiB gets a cap of 20, and a mistake costs nothing but a failed job.', 'A ceiling for each job.'],
          ['Quotas and a required filter', 'A **custom quota** limits the bytes that a user or a project may query per day. `require_partition_filter` on a table refuses queries without a filter. Both are guards for people and tools that you do not control.', 'Ceilings for people.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm5-guard', t: 1, src: 'rec', title: 'A guarded query, as the client would send it', file: 'query.json', lang: 'json', code: QRY,
        steps: [
          { say: 'This is the configuration of a query job that I built with the client, offline. It carries four guards and a tag. Press Next.', lines: null },
          { say: 'The **cap**: `maximumBytesBilled` is 10,737,418,240, which is 10 GiB. If the planner says that the query would read more, the job fails and costs nothing.', lines: G.span(QRY, /maximumBytesBilled/) },
          { say: '**Batch priority**: the job waits for free capacity and does not take an interactive slot. A nightly pipeline has no reason to jump the queue.', lines: G.span(QRY, /"priority"/) },
          { say: 'The cache is **off** (`useQueryCache` false) because this job should always read fresh data. Parameters are typed values, not text pasted into the SQL: they keep the plan reusable and close a door to injection.', lines: G.span(QRY, /useQueryCache/, /queryParameters|parameterMode/) },
          { say: '**Labels** end up in the job history and in the billing export. `pipeline` and `env` are how you will answer "which job spent this" later.', lines: G.span(QRY, /"labels"/, /"env"/) }
        ],
        note: 'Recorded with google-cloud-bigquery ' + G.meta('google-cloud-bigquery') + ', offline. A dry run is the same body with `dryRun` set to true: ' + (BS.dry_run_flag ? 'the recorded dry-run body has it.' : '') + ''
      }),

      B.code({
        id: 'm5-bqflags', t: 1, src: 'docs', title: 'The same guards on the command line', file: 'dry_run.sh', lang: 'bash', code: BQF,
        steps: [
          { say: 'The same guards from the shell. I checked every flag against the help page of the installed `bq` ' + G.meta('bq') + ': ' + bqq[1].split(' ').length + ' flags found, none missing. I did not run it. Press Next.', lines: null },
          { say: '`--dry_run` asks for the bytes and runs nothing. `--use_legacy_sql=false` selects GoogleSQL, which is the one that this course uses.', lines: G.span(BQF, /^bq query/) },
          { say: '`--maximum_bytes_billed` is the cap, in bytes, and `--label` can be given more than once.', lines: G.span(BQF, /maximum_bytes_billed/, /label/) },
          { say: 'The query itself filters the partition column with two constants, as in the previous screens.', lines: G.span(BQF, /SELECT order_id/, /order_ts </) }
        ],
        note: 'Boolean flags of `bq` are written `--[no]flag` in its help, for example `--[no]dry_run`. Check the exact form for your version.'
      }),

      B.talk({
        id: 'm5-price', t: 1, src: 'docs', title: 'Two ways to pay for compute',
        say: 'BigQuery has two price models for queries. Press Next for each. All numbers here are examples. Read the price page for your region.',
        items: [
          ['On demand', 'You pay for the **bytes read** by each query, per TiB, and the first TiB each month is free. There is nothing to plan, and a careless query costs money at once. A project gets a share of shared slots, so a very big or busy workload can wait.', 'Pay per byte. Nothing to plan.'],
          ['Capacity (editions)', 'You pay for **slots by the hour** under an **edition** (Standard, Enterprise or Enterprise Plus). Slots can **autoscale** up to a limit and are billed for the time used. You can add a **baseline** that is always on, and commitments for one or three years at a lower rate. A query costs time, not bytes.', 'Pay per slot-hour. Plan the size.'],
          ['Reservations', 'On capacity you create **reservations**, and **assign** projects to them. A nightly pipeline project and an analyst project can have separate reservations, so that one cannot starve the other.', 'Slots are shared out by assignment.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'Prices change often.', t: 'The numbers in the lab are examples chosen to show the shape: on demand wins at low volume, capacity wins at high steady volume. Use the pricing calculator with your own numbers.' }
      }),

      B.widget({ id: 'm5-slots', kind: 'slots', t: 1, src: 'docs', title: 'Lab: on demand against capacity' }),

      B.cmp({
        id: 'm5-cut', t: 1, src: 'docs', title: 'Ways to cut a query bill',
        say: 'Seven levers, in the order I would pull them. Press Next to read the pattern.',
        cols: ['Lever', 'What it does', 'Cost to you'],
        hl: 1,
        rows: [
          ['Name the columns', 'Reads only what the query needs', 'None'],
          ['Filter the partition column', 'Skips whole days', 'A table that is partitioned the right way'],
          ['Cluster the table', 'Skips blocks inside a partition', 'A choice of columns, and the order'],
          ['Materialized view', 'Keeps a heavy aggregate ready', 'Allowed SQL is limited, and refresh costs something'],
          ['Cache and BI Engine', 'Serves repeats from memory or a cache', 'BI Engine has a reserved size'],
          ['Approximate functions', '`APPROX_COUNT_DISTINCT` reads less and returns a close answer', 'The answer is not exact'],
          ['Stage a repeated step', 'Write a repeated subquery once into a temporary table', 'A step in the pipeline']
        ],
        steps: [
          { upto: 3, say: 'The first three are about layout and SQL, and they cost nothing at run time.' },
          { upto: 5, say: 'Materialized views and caches help when many people ask the same question.' },
          { upto: 7, say: 'Approximation and staging are for the heaviest queries. A subquery used twice can be computed twice, so write it once.' }
        ],
        pick: 'Fix the **biggest** query first. Ten percent off a ' + usd(ALL[5] * 288 * 30) + ' monthly job is worth more than ninety percent off a job that costs ten cents.'
      }),

      B.talk({
        id: 'm5-plan', t: 2, src: 'docs', title: 'Reading a slow query',
        say: 'A cheap query can still be slow. The execution details of a job show where. Press Next for what to look for.',
        items: [
          ['The stage graph', 'Each job has **stages**: reads, joins, aggregations, sorts. For each stage you see the records read and written, the time, and the **slot time** used. Find the stage that takes the most time, and ask whether it is a read, a join or a sort.', 'Find the slowest stage.'],
          ['Skew', 'A stage whose slowest worker takes far longer than the average has **skew**: one key holds many more rows. Typical causes are `NULL` keys in a join, a store like s01 with a third of the orders, or a default value. Filter or split the hot key.', 'Compare the average with the maximum.'],
          ['Shuffle and spill', 'Large shuffles between stages cost time, and a stage that runs out of memory **spills** to disk and slows down. A join of two large tables, or an `ORDER BY` of a huge result, shows it. Reduce the data before the join, and drop `ORDER BY` on an intermediate step.', 'Shrink the data before the join.'],
          ['Row explosions', 'A join on a key that is **not unique** on both sides multiplies rows. A "join to customers" that returns more rows than orders is a bug, not a result. Count rows before and after every join.', 'Check the row count after a join.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm5-jobs', t: 1, src: 'docs', title: 'Find the costly queries', file: 'top_cost.sql', lang: 'sql', code: JOBS,
        steps: [
          { say: 'The job history is a view that you query with SQL. This one finds who billed the most in the last week, and for which pipeline. I did not run it, because there is no project behind this course. Press Next.', lines: null },
          { say: 'Jobs are in a **regional** view of the project: `JOBS_BY_PROJECT`. Labels are an array of key and value pairs, so a small subquery pulls out the `pipeline` label that mission 5 put on the job.', lines: G.span(JOBS, /pipeline/, /FROM/) },
          { say: '`total_bytes_billed` is the number that you pay for. Dividing by 1024 to the power of four gives TiB. The filter keeps finished query jobs of the last seven days.', lines: G.span(JOBS, /ROUND\(SUM/, /state = /) },
          { say: 'Group, sort and take twenty. The top row is where to start. A job with no label shows as NULL, which is a finding in itself.', lines: G.span(JOBS, /^GROUP BY/, /^LIMIT/) }
        ],
        note: 'From documentation: the view, column and label structure are those I know. Check them against the current reference.'
      }),

      B.decide({
        id: 'm5-dec', t: 2, src: 'rec', title: 'Decision: partition and cluster the orders',
        scenario: 'Analysts filter by day (last week, last month) and often by store. Some also filter by status. The orders table grows by ' + (W0.orders / 14 * ER.scale / 1e6).toFixed(0) + ' million rows a day at the scale of the lessons. You choose the layout.',
        opts: [
          { t: 'Partition by store_id and cluster by order_ts', d: 'Looks natural: one piece per store.', lose: 'A partition column must be a date, a timestamp or an integer range, and most queries filter by day, so the daily filter would still read everything.' },
          { t: 'Partition by the day of order_ts, cluster by store_id then status', d: 'The daily filter skips days, the store filter skips blocks, and status is a smaller third filter.', lose: '' },
          { t: 'No partition, cluster by order_ts only', d: 'Simple, and no partition rules to follow.', lose: 'There is no metadata to skip whole days, and the dry run cannot show the saving. On a large table the partition is the bigger lever.' }
        ],
        pick: 1,
        why: 'Partition by the filter that people write the most, which is the day, and cluster by the next ones in the order of use. Add `require_partition_filter` so that the table refuses the careless query.',
        when: 'If almost every query asks for one store, and the day is rarely used, cluster by store first, and consider partitioning by month so that partitions are not tiny.'
      }),

      B.bug({
        id: 'm5-bug', t: 1, q: 'A report for one Singapore day takes a long time and bills for the whole table. The table is partitioned by day. Click the line that causes it.',
        file: 'report.sql', lang: 'sql', code: BUGQ, bad: [3],
        hint: 'Does this filter compare the partition column with constants?',
        why: 'The filter wraps `order_ts` in a function with a time zone, so the planner cannot turn it into a range of partitions. In the recording this form read **' + SGZ[2] + '** partitions, against **' + SGB[2] + '** for two bounds on the column. Add the two bounds, and keep the exact filter on top if you want it.',
        fix: FIXQ,
        cheer: 'Filter the partition column itself, with constants.'
      }),

      B.incident({
        id: 'm5-inc', t: 1, src: 'rec', title: 'Incident: the BigQuery bill tripled', time: '10:30',
        alert: '**The finance team asks why this month\'s BigQuery bill is three times last month\'s.** Nothing was deployed on the platform. Four teams share the project.',
        clues: ['The job history has the bytes of every job', 'Some pipelines carry a label, some do not', 'The orders table has no partition filter requirement'],
        opts: [
          { t: 'Query the job history for the top spenders by user and label, fix the biggest query, then add a cap, a required filter and a budget alert', fb: '' },
          { t: 'Switch the whole project to capacity pricing today', fb: 'It may help later, but you do not know yet what is spending, and slots would hide the problem until they run out.' },
          { t: 'Ask every team to read less', fb: 'A request with no data. Nobody knows which query to change.' },
          { t: 'Delete the biggest table', fb: 'It would stop the bill and break the reports, and it fixes nothing about the query that read it.' }
        ],
        best: 0,
        why: 'Find the cause first. The job history says who and which job. Then fix the query (often a missing partition filter or a SELECT *), and add guards so the next mistake is small: a cap on each job, a required filter on big tables, and a budget alert.',
        checks: [
          ['Find the top spenders', 'Run the query on the job history, by user and by label, for the last 30 days.'],
          ['Read the biggest query', 'Open its SQL. Look for `SELECT *`, a missing partition filter, or a schedule that is too frequent.'],
          ['Fix it', 'Name columns, filter the partition column, and lower the frequency if nobody needs fresh data.'],
          ['Guard', '`maximum_bytes_billed` on jobs, `require_partition_filter` on big tables, labels on every pipeline, and a budget alert.']
        ],
        tell: 'The job history showed that one pipeline ran a full scan every five minutes: ' + usd(ALL[5] * 288 * 30) + ' a month in the lesson numbers. I named the columns and filtered the partition, which cut it by ' + Math.round((1 - SGB[4] / ALL[4]) * 100) + ' percent, and I added a cap, a required filter and a budget alert.',
        prevent: ['Labels on every pipeline and a weekly look at the job history', '`require_partition_filter` on every big table', 'A cap on the bytes of each job, and a budget alert on the project']
      }),

      B.quiz({
        id: 'm5-q1', t: 1,
        q: 'You add `LIMIT 10` to a query on a large table to save money. What happens to the bytes billed?',
        opts: [
          { t: 'They fall to a tenth of a percent', fb: 'LIMIT applies after the data is read.' },
          { t: 'They stay the same', fb: '' },
          { t: 'They double', fb: 'There is no such effect.' },
          { t: 'They fall by ten', fb: 'The number of rows returned is not the number of bytes read.' }
        ],
        ok: 1,
        why: 'In the recording `LIMIT 10` billed exactly what `SELECT *` billed. Name columns and filter the partition to save bytes.'
      }),

      B.quiz({
        id: 'm5-q2', t: 1,
        q: 'Which filter lets BigQuery skip day partitions of a table partitioned on `order_ts`?',
        opts: [
          { t: '`WHERE EXTRACT(DAY FROM order_ts) = 3`', fb: 'A function of the column. In the recording this kept all partitions.' },
          { t: '`WHERE order_ts >= TIMESTAMP "2026-11-03" AND order_ts < TIMESTAMP "2026-11-04"`', fb: '' },
          { t: '`WHERE order_ts > (SELECT MAX(order_ts) FROM orders)`', fb: 'A subquery as the bound. The estimate kept all partitions.' },
          { t: '`WHERE store_id = "s01"`', fb: 'That column is not the partition column.' }
        ],
        ok: 1,
        why: 'The column itself, compared with constants. Other forms may or may not prune, and the dry run is how you check.'
      }),

      B.quiz({
        id: 'm5-q3', t: 1,
        q: 'What does `maximum_bytes_billed` do?',
        opts: [
          { t: 'Limits how many rows come back', fb: 'That is LIMIT.' },
          { t: 'Makes the job fail, with no charge, if it would bill more than the cap', fb: '' },
          { t: 'Slows the query down until it fits', fb: 'It does not throttle. It refuses.' },
          { t: 'Sets the size of the result table', fb: 'It has nothing to do with the result size.' }
        ],
        ok: 1,
        why: 'A cap turns an expensive mistake into a failed job. Set it on every pipeline query, a little above the normal size.'
      }),

      B.quiz({
        id: 'm5-q4', t: 2,
        q: 'A dry run on a clustered table reports 100 GiB. The real bill is 40 GiB. Why?',
        opts: [
          { t: 'The dry run is wrong', fb: 'The dry run reports an upper bound for clustered tables.' },
          { t: 'The estimate cannot count the blocks that clustering lets the query skip', fb: '' },
          { t: 'The cache was used', fb: 'A cache hit would bill nothing, not 40 GiB.' },
          { t: 'Compression changed the size', fb: 'Bytes billed do not depend on compression, except for physical storage billing.' }
        ],
        ok: 1,
        why: 'Block savings from clustering are known only when the query runs. The estimate is a ceiling, and the bill is at most that.'
      }),

      B.quiz({
        id: 'm5-q5', t: 2,
        q: 'At which volume is capacity pricing most likely to beat on demand?',
        opts: [
          { t: 'A few TiB a month, at random times', fb: 'Slots would sit idle. On demand is simpler and cheaper.' },
          { t: 'A large, steady volume of queries over many hours', fb: '' },
          { t: 'A single query a week', fb: 'On demand, and probably inside the free first TiB.' },
          { t: 'Never', fb: 'It does win for a steady heavy load, as the lab shows.' }
        ],
        ok: 1,
        why: 'Capacity turns a cost that follows bytes into one that follows time. It pays off when the slots stay busy.'
      }),

      B.order({
        id: 'm5-ord', t: 1, q: 'Put the steps of making an expensive query cheaper in order.',
        items: [
          'Find the costly query in the job history',
          'Run a dry run to see the bytes',
          'Name only the columns that are needed',
          'Filter the partition column with constants',
          'Run a dry run again and compare',
          'Add a cap, a label and a required partition filter'
        ],
        why: 'Measure first, so you fix the right query. The cheap changes come before the layout changes. A second dry run proves the saving, and the guards stop it from coming back.'
      }),

      B.qa({
        id: 'qa-part', t: 1, tag: 'BigQuery', secs: 75,
        q: 'Partitioning or clustering: how do you choose?',
        pts: ['Partition by the column queries filter by most, usually a date', 'Cluster by up to four columns, in order of use', 'Partition prunes whole pieces, cluster prunes blocks', 'Partition needs a meaningful size', 'Require a partition filter', 'Dry run for partitions, an upper bound for clusters'],
        short: 'They work at two levels and I often use both. A **partition** cuts the table into pieces, usually by the day of a date or timestamp column, and a filter on that column lets the planner skip whole pieces. **Clustering** sorts the data inside each partition by up to four columns, so a filter on them skips blocks.\n\nI partition by the column that queries filter by most, which for events and orders is the day, and I cluster by the next filters in the order they are used, such as store and status. I make sure partitions are not tiny, I set `require_partition_filter` so careless queries are refused, and I check the bytes with a dry run. For a clustered table the dry run is an upper bound, because block savings are known only at run time.',
        fu: [['What if people filter by store only?', 'Then partitioning by day does not help those queries. Cluster by store, and consider whether a monthly partition keeps the pieces meaningful.'], ['How many partitions are allowed?', 'There is a quota that has been raised over the years. Check the current number, and avoid hourly partitions on small data.']],
        trap: 'Saying that partitioning and clustering are the same thing, or partitioning by a column with a million values.',
        real: 'Tell me how you chose the layout of a large table, and what you measured.'
      }),

      B.qa({
        id: 'qa-cost', t: 1, tag: 'BigQuery', secs: 90,
        q: 'The BigQuery bill doubled. What do you do?',
        pts: ['Find the cause in the job history, by user and label', 'Read the biggest queries', 'Name columns, filter partitions, reduce repeats', 'Guards: cap, required filter, labels, budget alert', 'Consider capacity if the load is steady', 'Make it a regular review'],
        short: 'I find the cause before I change anything. The job history, `INFORMATION_SCHEMA.JOBS`, gives the bytes billed by user, by label and by query, so I list the top spenders for the last month. Then I read the biggest queries. Usually it is a `SELECT *`, a missing partition filter, a filter that does not prune, or a schedule that runs far more often than anybody needs.\n\nI fix that query first, and measure with a dry run. Then I add guards so that the next mistake is small: a billing cap on every job, `require_partition_filter` on big tables, labels on every pipeline so spend has an owner, and a budget alert. If the load is large and steady, I price capacity against on demand. And I put a look at the job history on a calendar.',
        fu: [['What if there are no labels?', 'Then the first change is to add them: you cannot manage a cost that has no owner. In the meantime, group by user and by query text.'], ['When do you move to capacity?', 'When monthly bytes are large and steady, so slots stay busy, or when you need predictable cost and isolation between workloads.']],
        trap: 'Switching the pricing model before finding the cause.',
        real: 'Describe a bill that surprised you, how you found the cause, and what you changed.'
      }),

      B.qa({
        id: 'qa-slow', t: 2, tag: 'BigQuery', secs: 90,
        q: 'A BigQuery query is slow. How do you find out why?',
        pts: ['Open the execution details: stages and slot time', 'Find the slowest stage and its kind', 'Compare average and maximum for skew', 'Look at shuffle size and spill', 'Count rows before and after joins', 'Fix: reduce data first, filter hot keys, stage a repeated step'],
        short: 'I open the execution details of the job and look at the stages: which one takes the longest and how much slot time it uses. If the slowest worker of a stage takes much longer than the average, that is **skew**: one key, often a NULL or a store like s01 that holds a third of the orders. If a stage shuffles a huge amount or spills to disk, it is usually a join of two large inputs or an `ORDER BY` on a big result.\n\nI also count rows before and after each join, because a join on a key that is not unique multiplies rows. Then I reduce the data before the join, filter or split the hot key, drop sorting from intermediate steps, and write a repeated subquery into a temporary table once.',
        fu: [['Is more slots the answer?', 'Sometimes, but skew and row explosions are not fixed by slots. Find the cause first.'], ['How would you tell a read problem from a join problem?', 'The stage type and the rows in and out: a read stage reads a lot, a join stage produces more rows than it takes in.']],
        trap: 'Answering "add more slots" before reading the plan.',
        real: 'Tell me about a query that you made ten times faster, and what the plan showed.'
      }),

      B.qa({
        id: 'qa-od', t: 2, tag: 'BigQuery', secs: 75,
        q: 'On demand or capacity pricing: how do you decide?',
        pts: ['On demand: pay per byte, nothing to plan', 'Capacity: pay per slot-hour, plan size, autoscale, baseline', 'Break-even depends on volume and steadiness', 'Reservations isolate workloads', 'Estimate with real bytes from the job history', 'Review as the workload grows'],
        short: 'On demand charges per byte read, so there is nothing to plan, and it suits a small or irregular workload. Capacity charges for slots by the hour under an edition, with autoscaling and an optional baseline, so the cost follows time and not bytes. It suits a large steady workload, or one where I need predictable cost or isolation between teams through reservations and assignments.\n\nTo decide I take the real bytes from the job history, estimate the slots I would need at the peak and for how many hours, and compare both sums at the current rates. The break-even moves with the workload, so I review it every quarter. The numbers in a lab are examples. The price page and the pricing calculator are the source.',
        fu: [['What goes wrong with capacity?', 'Too few slots make queries wait. Too many slots sit idle. Autoscaling and a small baseline help.'], ['Can you mix them?', 'Yes. Different projects can use different models, for example capacity for the nightly pipeline and on demand for ad hoc work.']],
        trap: 'Quoting prices from memory. Say that you would use the calculator.',
        real: 'Describe how you would show the finance team that a change of price model pays off.'
      }),

      B.recap({
        id: 'm5-recap', n: 5, badge: 'Cost Cutter', color: '#FED7AA',
        pts: [
          'On demand bills the **bytes read**: name **columns**, filter the **partition**, then cluster and cache.',
          '`LIMIT` saves **nothing**: ' + gib(L10[4]) + ' against ' + gib(ALL[4]) + ' in the recording.',
          'A filter prunes only if it compares the **partition column** with constants. `DATE(ts, zone)` read **' + SGZ[2] + '** partitions, two bounds read **' + SGB[2] + '**.',
          'A Singapore day is **two UTC days**, so a report must read two partitions.',
          'Guards: a **dry run**, `maximum_bytes_billed`, `require_partition_filter`, **labels**, a budget alert.',
          '**On demand** wins at low or irregular volume, **capacity** at large steady volume. Find costs in the **job history** first.'
        ],
        lines: [
          'I run a dry run before I trust a query.',
          'I filter the partition column itself, with constants.',
          'I put a cap and a label on every pipeline query.'
        ]
      })
    ]
  });
})();
