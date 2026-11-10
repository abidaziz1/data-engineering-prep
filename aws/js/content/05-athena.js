/* Mission 5: Athena. The five file layouts, the bytes each query has to read, the Parquet column sizes and the row-group statistics come from
   the recording: DuckDB wrote the same 2 million orders five ways, and the byte counts come from the real files and the Parquet footers.
   Athena itself did not run, so its billed bytes can differ a little. Prices, limits, error names and syntax come from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var SZ = G.counts('athena.sizes'), SC = G.counts('athena.scan'), PC = G.counts('athena.parquet_columns');
  var Q = {}, LAYOUT = {};
  SC.queries.forEach(function (q) { Q[q.id] = q; });
  SC.layouts.forEach(function (l) { LAYOUT[l.k] = l.name; });
  var KEYS = ['csv', 'csv_gz', 'csv_by_day', 'parquet', 'parquet_by_day'];
  var TREE = G.text('athena.layout_tree');

  function num(n, d) { return n.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function kb(n) { return num(n / 1e3) + ' KB'; }
  function mb(n, d) { return num(n / 1e6, d === undefined ? 1 : d) + ' MB'; }
  function gb(n, d) { return num(n / 1e9, d === undefined ? 1 : d) + ' GB'; }
  function size(n) { return n < 1e6 ? kb(n) : n < 1e9 ? mb(n) : gb(n); }
  function billed(b) { return Math.max(10e6, Math.ceil(b / 1e6) * 1e6); }
  function cost(b, scale) { return billed(b * (scale || 1)) / 1e12 * 5; }
  function usd(x) { return '$' + (x < 0.001 ? x.toFixed(5) : x < 1 ? x.toFixed(4) : x < 10 ? num(x, 2) : num(x, 0)); }

  G.expect(SC.queries.length === 5 && SC.layouts.length === 5 && KEYS.every(function (k) { return LAYOUT[k]; }), 'five queries and five layouts');
  G.expect(SC.queries.every(function (q) { return q.bytes.csv === SZ.csv && q.bytes.csv_gz === SZ.csv_gz; }), 'every query reads the whole single CSV file, plain or gzip');
  G.expect(Q.q1.bytes.parquet === SZ.parquet_footer_bytes, 'count(*) on one Parquet file reads only the footer');
  G.expect(Q.q5.bytes.parquet === PC.bytes_by_column.status + SZ.parquet_footer_bytes, 'the status count reads one column and the footer');
  G.expect(Q.q2.bytes.parquet_by_day < Q.q2.bytes.parquet && Q.q2.bytes.parquet < Q.q2.bytes.csv_by_day && Q.q2.bytes.csv_by_day < Q.q2.bytes.csv_gz, 'the order of layouts for the one-day query');
  G.expect(Q.q3.bytes.parquet < Q.q3.bytes.parquet_by_day, 'the month query is cheaper in one Parquet file than in 90 files');
  G.expect(Q.q4.bytes.csv_by_day === SZ.csv_by_day && Q.q5.bytes.csv_by_day === SZ.csv_by_day, 'a query without a day filter reads every day folder');
  G.expect(SZ.csv_gz < SZ.parquet && SZ.parquet < SZ.parquet_by_day && SZ.csv_by_day < SZ.csv && SZ.days === 90 && SZ.parquet_row_groups === 17, 'the on-disk sizes');
  G.expect(PC.row_groups_for_one_day.length === 1 && PC.row_groups_for_march.length === 7 && PC.row_groups_for_the_order_id.length === 1, 'row group statistics');

  var COLS = Object.keys(PC.bytes_by_column).sort(function (a, b) { return PC.bytes_by_column[b] - PC.bytes_by_column[a]; });
  var COLSUM = COLS.reduce(function (a, c) { return a + PC.bytes_by_column[c]; }, 0);
  var RUNS = 12 * 24 * 30;
  var M_CSV = cost(Q.q3.bytes.csv, 1000) * RUNS, M_PQ = cost(Q.q3.bytes.parquet, 1000) * RUNS;
  G.expect(Math.round(M_CSV) === 7200 && Math.round(M_PQ) === 92 && Math.round(M_CSV / 12) === 600, 'the dashboard month on CSV and on Parquet');
  var RATIO = Math.round(Q.q5.bytes.csv / Q.q5.bytes.parquet);
  G.expect(RATIO > 500, 'Parquet reads more than 500 times fewer bytes for the status count');

  var API = [
    'import time',
    'import boto3',
    '',
    'athena = boto3.client("athena", region_name="us-east-1")',
    '',
    '',
    'def run_query(sql, database="brewline_lake", workgroup="brewline"):',
    '    qid = athena.start_query_execution(',
    '        QueryString=sql,',
    '        QueryExecutionContext={"Database": database},',
    '        WorkGroup=workgroup,',
    '    )["QueryExecutionId"]',
    '',
    '    while True:',
    '        run = athena.get_query_execution(QueryExecutionId=qid)["QueryExecution"]',
    '        state = run["Status"]["State"]',
    '        if state in ("SUCCEEDED", "FAILED", "CANCELLED"):',
    '            break',
    '        time.sleep(1)',
    '',
    '    if state != "SUCCEEDED":',
    '        raise RuntimeError(run["Status"].get("StateChangeReason", state))',
    '',
    '    print("scanned", run["Statistics"]["DataScannedInBytes"], "bytes")',
    '',
    '    rows = []',
    '    pages = athena.get_paginator("get_query_results").paginate(QueryExecutionId=qid)',
    '    for page in pages:',
    '        for row in page["ResultSet"]["Rows"]:',
    '            rows.append([col.get("VarCharValue") for col in row["Data"]])',
    '    return rows[1:]'
  ].join('\n');

  var CTAS = [
    'CREATE TABLE curated.orders',
    'WITH (',
    "  format = 'PARQUET',",
    "  parquet_compression = 'SNAPPY',",
    "  external_location = 's3://brewline-lake/curated/orders/',",
    "  partitioned_by = ARRAY['dt']",
    ') AS',
    'SELECT order_id, customer_id, order_ts, product_id, qty,',
    '       unit_price_usd, total_usd, status, channel, store_id,',
    '       dt',
    'FROM raw.orders_csv',
    "WHERE dt >= '2026-01-01';"
  ].join('\n');

  var SLICES = [
    'CREATE EXTERNAL TABLE curated.orders (',
    '  order_id string, customer_id string, order_ts timestamp, product_id string,',
    '  qty int, unit_price_usd decimal(10,2), total_usd decimal(12,2),',
    '  status string, channel string, store_id string',
    ')',
    'PARTITIONED BY (dt string)',
    'STORED AS PARQUET',
    "LOCATION 's3://brewline-lake/curated/orders/';",
    '',
    'INSERT INTO curated.orders',
    'SELECT order_id, customer_id, order_ts, product_id, qty,',
    '       unit_price_usd, total_usd, status, channel, store_id, dt',
    'FROM raw.orders_csv',
    "WHERE dt >= '2026-01-01' AND dt < '2026-04-11';",
    '',
    'INSERT INTO curated.orders',
    'SELECT order_id, customer_id, order_ts, product_id, qty,',
    '       unit_price_usd, total_usd, status, channel, store_id, dt',
    'FROM raw.orders_csv',
    "WHERE dt >= '2026-04-11' AND dt < '2026-07-20';"
  ].join('\n');

  var CTAS_BUG = [
    'CREATE TABLE curated.orders',
    "WITH (format = 'PARQUET', external_location = 's3://brewline-lake/curated/orders/',",
    "      partitioned_by = ARRAY['dt']) AS",
    'SELECT dt, order_id, customer_id, total_usd, status',
    'FROM raw.orders_csv;'
  ].join('\n');
  var CTAS_FIX = CTAS_BUG.replace('SELECT dt, order_id, customer_id, total_usd, status', 'SELECT order_id, customer_id, total_usd, status, dt');

  var PRUNE_BUG = [
    'SELECT sum(total_usd) AS revenue_usd',
    'FROM curated.orders',
    "WHERE order_ts >= TIMESTAMP '2026-03-14 00:00:00'",
    "  AND order_ts <  TIMESTAMP '2026-03-15 00:00:00';"
  ].join('\n');
  var PRUNE_FIX = PRUNE_BUG.replace("00:00:00';", "00:00:00'\n  AND dt = '2026-03-14';").replace("TIMESTAMP '2026-03-15 00:00:00'\n", "TIMESTAMP '2026-03-15 00:00:00'\n");

  var ICE = [
    'CREATE TABLE curated.orders_iceberg (',
    '  order_id string,',
    '  customer_id string,',
    '  order_ts timestamp,',
    '  total_usd decimal(12,2),',
    '  status string',
    ')',
    'PARTITIONED BY (day(order_ts))',
    "LOCATION 's3://brewline-lake/curated/orders_iceberg/'",
    "TBLPROPERTIES ('table_type' = 'ICEBERG', 'format' = 'parquet');",
    '',
    'MERGE INTO curated.orders_iceberg AS t',
    'USING staging.order_changes AS s',
    '  ON t.order_id = s.order_id',
    "WHEN MATCHED AND s.op = 'D' THEN DELETE",
    'WHEN MATCHED THEN UPDATE SET status = s.status, total_usd = s.total_usd',
    'WHEN NOT MATCHED THEN INSERT (order_id, customer_id, order_ts, total_usd, status)',
    '  VALUES (s.order_id, s.customer_id, s.order_ts, s.total_usd, s.status);',
    '',
    'OPTIMIZE curated.orders_iceberg REWRITE DATA USING BIN_PACK;',
    '',
    'VACUUM curated.orders_iceberg;'
  ].join('\n');

  var T_RAW = {
    name: 'raw_orders',
    cols: ['order_id', 'customer_id', 'status', 'total_usd', 'ingested_at'],
    rows: [
      ['O-1', 'C-1', 'PLACED', '12.50', '2026-03-14 08:00:00'],
      ['O-1', 'C-1', 'COMPLETED', '12.50', '2026-03-14 09:30:00'],
      ['O-2', 'C-2', 'PLACED', '8.00', '2026-03-14 08:05:00'],
      ['O-3', 'C-1', 'PLACED', '20.00', '2026-03-14 08:10:00'],
      ['O-3', 'C-1', 'CANCELLED', '20.00', '2026-03-14 10:00:00'],
      ['O-4', 'C-3', 'PLACED', '5.25', '2026-03-14 08:20:00']
    ]
  };

  LAB.addChapter({
    id: 'm5', n: 5, title: 'Athena: SQL on the lake and what a scan costs', short: 'Athena', blurb: 'Serverless SQL on S3, the bytes a query reads, file formats and layouts, CTAS, workgroups and cost', minutes: 45,
    focus: ['int', 'mart', 'con'],
    goals: [
      'Say how **Athena** runs a query and what it bills.',
      'Predict which **bytes** a query reads in CSV, gzip and Parquet, with and without partitions.',
      'Write a **CTAS** that converts raw files into partitioned Parquet, and work around the **100 partition** limit.',
      'Control cost with **workgroups**, scan limits and **result reuse**.',
      'Choose between **Athena and Redshift** for a workload.'
    ],
    say: 'Mission 5 is Athena. It is the fastest way to ask a question of files in S3, and the easiest way to get a large bill. The bill follows one number, the bytes a query reads. So this mission is about reading less. The lab uses the real sizes of 2 million orders written five ways, and shows what each query has to read. Athena itself did not run, so I label the numbers as a calculation from real files.',
    scenes: [
      B.talk({
        id: 'm5-talk', t: 1, src: 'docs', title: 'What Athena is',
        say: 'Athena runs SQL on files in S3 without servers. Press Next for the five facts you need.',
        items: [
          ['Serverless SQL on files in S3', 'You write a SELECT statement. Athena starts the workers, reads the files and returns the result. There is no cluster to size, patch or stop. The engine is built on Trino.', 'No servers to run.'],
          ['The schema lives in the catalog', 'Athena reads table definitions from the Glue Data Catalog (mission 4). A table is a name, columns, a file format and an S3 location. The files stay where they are, and creating a table checks nothing about them.', 'Definitions in the catalog, data in S3.'],
          ['You pay for bytes scanned', 'On-demand queries cost $5 per terabyte scanned in the US East example, rounded up to the next megabyte, with a 10 MB minimum for each query. Less data read means a smaller bill and a faster query.', 'The meter is bytes.'],
          ['Results go to S3', 'Each query writes a CSV result file and a metadata file to the result location of its workgroup. Applications read the result through the API or take the file from S3.', 'Every result is an object.'],
          ['Good at, and not good at', 'Good at ad hoc questions, log analysis, and SQL transformations that write Parquet back to the lake with CTAS and INSERT INTO. Poor at serving many users who refresh dashboards every few seconds, at low-latency lookups and at heavy row updates. Redshift or a serving store fits those.', 'Pick it for the lake, not for serving.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm5-flow', t: 1, src: 'docs', title: 'The path of one query', g: 'athena', legend: true,
        steps: [
          { say: 'Five steps from SQL to a bill. Press Next to follow one query.', cap: 'SQL in, bytes billed.' },
          { say: 'Step 1. You submit SQL with `StartQueryExecution`, or run it in the console. The call returns a query execution id at once. The query runs in the background.', on: ['a1'], focus: ['sql', 'eng'], cap: 'Submit, get an id.' },
          { say: 'Step 2. The engine asks the Glue Data Catalog for the table: its columns, partitions and S3 location.', on: ['a2'], focus: ['eng', 'cat'], cap: 'Read the definition.' },
          { say: 'Step 3. The engine splits the work over many workers. They read only the columns and folders the query needs from the files in S3.', on: ['a3'], focus: ['eng', 'dat'], cap: 'Read only what is needed.' },
          { say: 'Step 4. The result goes to the result location in S3, as a CSV file plus a metadata file.', on: ['a4'], focus: ['eng', 'res'], cap: 'Write the result.' },
          { say: 'Step 5. The bill counts the bytes read in step 3. Not the size of the table, and not the size of the result.', on: ['a5'], focus: ['dat', 'bill'], cap: 'Bytes read are the bill.' },
          { say: 'Around the query sits the workgroup. It sets the result location, the encryption and the limits, such as a cap on the bytes one query may scan.', focus: ['lim'], cap: 'The workgroup holds the rules.' }
        ]
      }),

      B.code({
        id: 'm5-api', t: 1, src: 'docs', title: 'Running a query from Python', file: 'run_query.py', lang: 'python', code: API,
        steps: [
          { say: 'Submit the query. The call returns an id at once and the query runs in the background. When the workgroup has a result location, you do not pass one.', lines: G.span(API, /qid = athena/, /\["QueryExecutionId"\]/) },
          { say: 'Poll until the query leaves QUEUED and RUNNING. Production code waits longer between polls and gives up after a time limit.', lines: G.span(API, /while True/, /time\.sleep/) },
          { say: 'A failed query carries its reason in `StateChangeReason`. Raise it, so the job fails with the real message.', lines: G.span(API, /if state != "SUCCEEDED"/, /raise RuntimeError/) },
          { say: '`DataScannedInBytes` is the number Athena bills for. Log it for every query and the cost of each job becomes visible in your own metrics.', lines: G.span(API, /print\("scanned"/) },
          { say: 'Read the result with a paginator, because one call returns at most 1,000 rows. Every value arrives as text. The first row of a SELECT result holds the column names, so the function returns `rows[1:]`.', lines: G.span(API, /rows = \[\]/, /return rows\[1:\]/) }
        ],
        note: 'This code follows the Athena API. I checked its parameter names and the states against the AWS SDK service model. It was not run against Athena.'
      }),

      B.code({
        id: 'm5-tree', t: 1, src: 'rec', title: 'The same orders, written five ways', file: 'layouts.txt', lang: 'text',
        code: TREE,
        steps: [
          { say: 'The recorder generated ' + num(SZ.rows) + ' orders over ' + SZ.days + ' days and wrote them five ways with DuckDB. This is the file tree, and the dots stand for the other days. The numbers in this mission come from these real files.', lines: null },
          { say: 'One CSV file, and the same file compressed with gzip. Text, one row after the other.', lines: G.span(TREE, /^orders\.csv$/, /^orders\.csv\.gz$/) },
          { say: 'One Parquet file, sorted by order time. Columnar and compressed, with a footer that describes every column chunk.', lines: G.span(TREE, /^orders\.parquet$/) },
          { say: 'CSV with one folder for each day. A folder named `dt=2026-01-01` is a partition: the folder name holds the date, and the file inside does not.', lines: G.span(TREE, /^csv_by_day\/dt=/, /^csv_by_day\/\.\.\./) },
          { say: 'Parquet with one folder for each day. Same idea, with one small Parquet file in every folder.', lines: G.span(TREE, /^parquet_by_day\/dt=/, /^parquet_by_day\/\.\.\./) }
        ],
        note: 'The lab on the next screen computes the bytes that a query needs from these files. Athena did not read them.'
      }),

      B.cmp({
        id: 'm5-sizes', t: 1, src: 'rec', title: 'How big is each layout?',
        say: 'Same ' + num(SZ.rows) + ' orders, five layouts. Press Next to read the sizes the recorder measured. Decimal units: 1 MB is 1,000,000 bytes.',
        cols: ['Layout', 'Size on S3', 'Files'],
        hl: 1,
        rows: [
          [LAYOUT.csv, mb(SZ.csv), '1'],
          [LAYOUT.csv_gz, mb(SZ.csv_gz), '1'],
          [LAYOUT.csv_by_day, mb(SZ.csv_by_day), String(SZ.days)],
          [LAYOUT.parquet, mb(SZ.parquet), '1, in ' + SZ.parquet_row_groups + ' row groups'],
          [LAYOUT.parquet_by_day, mb(SZ.parquet_by_day), String(SZ.days)]
        ],
        steps: [
          { upto: 2, say: 'Plain CSV is the largest. gzip makes the file ' + (SZ.csv / SZ.csv_gz).toFixed(1) + ' times smaller.' },
          { upto: 3, say: 'In day folders the CSV is ' + mb(SZ.csv - SZ.csv_by_day) + ' smaller than the single file. The date is now in the folder name, and no longer in every row.' },
          { upto: 5, say: 'Parquet is ' + mb(SZ.parquet) + ' in one file and ' + mb(SZ.parquet_by_day) + ' in ' + SZ.days + ' files, because every file repeats its own footer and dictionaries.' }
        ],
        pick: 'On disk, gzip CSV (' + mb(SZ.csv_gz) + ') and Parquet (' + mb(SZ.parquet) + ') are about the same size. The difference shows when you query: Parquet lets the engine skip columns and row groups, and a gzip CSV file has to be read from the start.'
      }),

      B.widget({ id: 'm5-lab', kind: 'scan', t: 1, src: 'rec', title: 'Lab: what does this query read?' }),

      B.talk({
        id: 'm5-lessons', t: 1, src: 'rec', title: 'What the lab showed',
        say: 'Five lessons from the numbers. Press Next to read them.',
        items: [
          ['A CSV file is read in full', 'All five queries read ' + mb(SZ.csv) + ' from the one CSV file, including `count(*)`. Text rows have no index and no column chunks, so the engine reads every byte. gzip does not change that: every query read ' + mb(SZ.csv_gz) + '.', 'Text has no shortcuts.'],
          ['Parquet reads columns', 'The status count needs one column. On the one Parquet file it read ' + size(Q.q5.bytes.parquet) + ' of ' + mb(SZ.parquet) + ': the status column and the footer. That is ' + RATIO + ' times fewer bytes than the CSV.', 'Name the columns you need.'],
          ['Folders prune days', 'The one-day query read ' + mb(Q.q2.bytes.csv_by_day) + ' from CSV in day folders, against ' + mb(Q.q2.bytes.csv) + ' from the single file. In Parquet day folders it read ' + size(Q.q2.bytes.parquet_by_day) + '.', 'Filter on the partition.'],
          ['A missing filter undoes it', 'The queries without a date filter read all ' + mb(Q.q5.bytes.csv_by_day) + ' of the CSV day folders. Partitions only help when the query filters on the partition column.', 'No filter, no pruning.'],
          ['More folders are not always better', 'The 31-day query read ' + mb(Q.q3.bytes.parquet_by_day) + ' from the 90 day files and only ' + mb(Q.q3.bytes.parquet) + ' from the single file. Small files cost extra, which the senior screens return to.', 'Partition for the questions you ask.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm5-bill', t: 1, src: 'docs', title: 'What Athena bills',
        say: 'Athena has two ways to pay. Press Next to read them and the costs around them. The prices are examples, and AWS changes them.',
        cols: ['What', 'How it is billed', 'When it fits'],
        hl: 1,
        rows: [
          ['On-demand SQL', '$5.00 per terabyte scanned in the US East example, rounded up to the next megabyte, with a 10 MB minimum for each query.', 'The default. Irregular use, ad hoc work, jobs that run a few times a day.'],
          ['Provisioned capacity', 'You reserve processing units (DPUs) for a period and pay by the hour, about $0.30 per DPU-hour in the sources I found. Check the minimums on the pricing page.', 'Steady, heavy use where a fixed bill and isolation from other users matter.'],
          ['Statements that read no data', 'CREATE TABLE, ALTER TABLE, partition management and failed queries are not billed for scanned data, according to the pricing page.', 'Free to run, so build tables and partitions as often as you need.'],
          ['What sits around it', 'S3 storage and requests for the data and the results, Glue Data Catalog storage and requests, KMS requests for encrypted data, and Lambda for federated queries.', 'Check these when the Athena line looks small and the account bill does not.']
        ],
        steps: [
          { upto: 2, say: 'Two payment models. On-demand follows the bytes, provisioned follows the clock.' },
          { upto: 3, say: 'Statements that read no data are free, so DDL is not a cost to worry about.' },
          { upto: 4, say: 'The Athena line is not the whole cost of a query. The result files and the requests belong to S3.' }
        ],
        pick: 'Start **on-demand**. Move to **provisioned capacity** only when a steady workload would cost more in scans than the reserved units. To know that, log `DataScannedInBytes` for every query.'
      }),

      B.cmp({
        id: 'm5-oneday', t: 1, src: 'rec', title: 'One day of revenue, five layouts',
        say: 'Query q2 asks for the revenue of one day. Press Next to see the bytes it reads in each layout and what that costs. The right column pretends the table is 1,000 times bigger.',
        cols: ['Layout', 'Bytes read', 'One run', 'One run at 1,000 times the data'],
        hl: 1,
        rows: KEYS.map(function (k) { return [LAYOUT[k], size(Q.q2.bytes[k]), usd(cost(Q.q2.bytes[k])), usd(cost(Q.q2.bytes[k], 1000))]; }),
        steps: [
          { upto: 2, say: 'Both CSV files are read in full. At this size the cost is tiny, and at 1,000 times the data the plain CSV costs ' + usd(cost(Q.q2.bytes.csv, 1000)) + ' for one question.' },
          { upto: 3, say: 'Day folders turn the same CSV into a ' + mb(Q.q2.bytes.csv_by_day) + ' read. The query names one day, so only one folder is opened.' },
          { upto: 5, say: 'Parquet reads one column and one day. The single sorted file skips row groups by their statistics, and the day folders skip whole files. Below 10 MB, all of them are billed the 10 MB minimum.' }
        ],
        pick: 'Moving this query from plain CSV to Parquet in day folders cuts its cost by more than ' + num(Math.floor(cost(Q.q2.bytes.csv, 1000) / cost(Q.q2.bytes.parquet_by_day, 1000) / 1000) * 1000, 0) + ' times at 1,000 times the data. At the size of the lab, the **10 MB minimum** hides the difference.'
      }),

      B.quiz({
        id: 'm5-q1', t: 1, src: 'rec',
        q: 'On the single CSV file, which query reads the most bytes?',
        opts: [
          { t: 'SELECT * FROM orders WHERE order_id = \'O-1234567\'', fb: 'It returns one row, but the engine still has to read every row to find it.' },
          { t: 'SELECT count(*) FROM orders', fb: 'It returns one number, and the file is still read in full.' },
          { t: 'SELECT status, count(*) FROM orders GROUP BY status', fb: 'It names one column, but a CSV file has no column chunks to skip.' },
          { t: 'None. All of them read the whole file.', fb: '' }
        ],
        ok: 3, why: 'A CSV file is plain text, row after row. There is nothing to read by column and no index. In the recording all five queries read ' + num(SZ.csv) + ' bytes from the CSV file.'
      }),

      B.quiz({
        id: 'm5-q2', t: 1, src: 'rec',
        q: 'Query q2 reads ' + num(Q.q2.bytes.parquet_by_day) + ' bytes from Parquet in day folders. What does Athena bill for it?',
        opts: [
          { t: 'About 21 KB, which is $0.0000001', fb: 'Athena rounds up to the next megabyte and applies a minimum.' },
          { t: '10 MB, which is $0.00005', fb: '' },
          { t: 'Nothing, because the query is small', fb: 'The 10 MB minimum applies to each query that reads data. Small queries are not free.' },
          { t: '1 MB, which is $0.000005', fb: 'The minimum is 10 MB, not 1 MB.' }
        ],
        ok: 1, why: '10 MB is 0.00001 TB, and at $5 per TB that is $0.00005. It is cheap, and it means thousands of tiny queries still add up: one million of them cost $50.'
      }),

      B.quiz({
        id: 'm5-q3', t: 1, src: 'rec',
        q: 'Which single change cuts the bytes of "count the orders by status" the most on this data?',
        opts: [
          { t: 'Compress the CSV with gzip', fb: 'It reads ' + mb(SZ.csv_gz) + ' instead of ' + mb(SZ.csv) + ', which is about ' + (SZ.csv / SZ.csv_gz).toFixed(1) + ' times less. Good, but not the biggest change.' },
          { t: 'Put the CSV files in day folders', fb: 'The query has no date filter, so it still reads every folder: ' + mb(Q.q5.bytes.csv_by_day) + '.' },
          { t: 'Convert the data to Parquet', fb: '' },
          { t: 'Add LIMIT 10', fb: 'An aggregate has to read all rows before it can return its groups.' }
        ],
        ok: 2, why: 'The query needs one column. Parquet reads only that column and the footer: ' + size(Q.q5.bytes.parquet) + ' against ' + mb(Q.q5.bytes.csv) + ' for the CSV, which is ' + RATIO + ' times fewer bytes.'
      }),

      B.code({
        id: 'm5-ctas', t: 1, src: 'docs', title: 'CTAS: raw CSV to partitioned Parquet', file: 'ctas_orders.sql', lang: 'sql', code: CTAS,
        steps: [
          { say: 'CTAS means CREATE TABLE AS SELECT. One statement creates the table in the catalog and writes its files to S3. This is the usual way to turn raw CSV into Parquet.', lines: null },
          { say: '`format` and `parquet_compression` choose the file type. Snappy is quick to read and compresses well enough for most tables.', lines: G.span(CTAS, /format = /, /parquet_compression/) },
          { say: '`external_location` is where the files go. It must be empty. A location that already holds files stops the statement with `HIVE_PATH_ALREADY_EXISTS`, and Athena never deletes old data for you.', lines: G.span(CTAS, /external_location/) },
          { say: '`partitioned_by` names the partition columns. They must be the last columns of the SELECT list, so `dt` comes last below.', lines: G.span(CTAS, /partitioned_by/) },
          { say: 'The SELECT is the transformation: filter, cast, rename, deduplicate. It reads the raw table once, and the partition filter limits what it reads.', lines: G.span(CTAS, /^SELECT order_id/, /^WHERE/) }
        ],
        note: 'When the workgroup enforces a query result location, a CTAS that sets `external_location` fails, according to the documentation. Either use a workgroup that does not enforce it for these jobs, or leave `external_location` out and let Athena write under the result location. One statement writes at most 100 partitions, which the next screens cover.'
      }),

      B.bug({
        id: 'm5-bug1', t: 1, src: 'docs', q: 'This CTAS should partition by `dt`. It does not follow the Athena rule for partition columns. Click the line that breaks it.',
        file: 'ctas_bug.sql', lang: 'sql', code: CTAS_BUG, bad: [4],
        hint: 'Where must the partition columns sit in the SELECT list?',
        why: 'The Athena documentation says the partition columns must be listed last in the SELECT list. Here `dt` comes first. Move it to the end of the column list and keep the same name in `partitioned_by`.',
        fix: CTAS_FIX,
        cheer: 'Partition columns go last.'
      }),

      B.bug({
        id: 'm5-bug2', t: 1, src: 'rec', q: 'The table `curated.orders` has a folder for each `dt`. This query asks for one day and still scans every folder. Click the lines that cause it.',
        file: 'one_day.sql', lang: 'sql', code: PRUNE_BUG, bad: [3, 4],
        hint: 'Which column does Athena use to choose folders?',
        why: 'Athena skips folders only when the query filters on the partition column. These two conditions are on `order_ts`, which is a normal column inside the files, so every `dt=` folder is opened. In the recording a day filter cut a CSV day-folder query from ' + mb(Q.q5.bytes.csv_by_day) + ' to ' + mb(Q.q2.bytes.csv_by_day) + '. Add `AND dt = \'2026-03-14\'` and keep the time filter if you need the exact hours.',
        fix: PRUNE_FIX,
        cheer: 'Always filter on the partition column.'
      }),

      B.order({
        id: 'm5-ord', t: 1, q: 'Put the steps of a safe conversion from raw CSV to partitioned Parquet in order.',
        items: [
          'Create an external table over the raw CSV files and make its partitions visible',
          'Write the CTAS with format, location and partitioned_by, partition column last',
          'Run it and compare the bytes scanned by a test query on the old and the new table',
          'Check the partitions in the catalog and the file sizes in S3',
          'Point the dashboards and jobs at the new table',
          'Keep the raw table and files as the copy you can rebuild from'
        ],
        why: 'Build the new copy next to the old one, measure it, and move the readers last. The raw files stay untouched, so a mistake costs one more CTAS run and nothing else.'
      }),

      B.challenge({
        id: 'm5-ch-dedupe', t: 1, title: 'Coding round: keep the newest copy of each order', file: 'dedupe.sql', lang: 'sql',
        q: 'The raw zone holds **several copies of some orders**, because the source sends an order again when its status changes. Return **one row for each order**: the copy with the **latest `ingested_at`**. Show `order_id`, `customer_id`, `status` and `total_usd`. Athena has no `QUALIFY` clause.',
        data: [T_RAW],
        starter: '-- Rank the copies of each order, newest first.\n-- Then keep only the first copy of each order.\nSELECT ...',
        hints: ['Number the copies with `row_number() OVER (PARTITION BY order_id ORDER BY ingested_at DESC)`.', 'Put the window function in a subquery. Athena (Trino) has no `QUALIFY`, so you filter the result in an outer query.', 'In the outer query keep the rows where the number is 1.'],
        sol: 'SELECT order_id, customer_id, status, total_usd\nFROM (\n  SELECT order_id, customer_id, status, total_usd,\n         row_number() OVER (PARTITION BY order_id\n                            ORDER BY ingested_at DESC) AS rn\n  FROM raw_orders\n) AS t\nWHERE rn = 1\nORDER BY order_id;',
        res: { cols: ['order_id', 'customer_id', 'status', 'total_usd'], rows: [['O-1', 'C-1', 'COMPLETED', '12.50'], ['O-2', 'C-2', 'PLACED', '8.00'], ['O-3', 'C-1', 'CANCELLED', '20.00'], ['O-4', 'C-3', 'PLACED', '5.25']], msg: '4 rows' },
        expl: ['`row_number` gives every copy of an order a rank by ingest time. Rank 1 is the newest copy.', 'Athena has no `QUALIFY`, so the window result is filtered in an outer query.', 'This is the standard way to deduplicate a raw zone in SQL. Put it in the CTAS that builds the clean table.', 'If two copies can share the same `ingested_at`, add a second sort column. Without one, the winner is arbitrary.']
      }),

      B.cmp({
        id: 'm5-formats', t: 1, src: 'docs', title: 'File formats for Athena',
        say: 'The format decides how much a query can skip. Press Next to compare the common ones.',
        cols: ['Format', 'Layout', 'Skips columns?', 'Good for'],
        hl: 2,
        rows: [
          ['CSV and JSON', 'Text, row by row', 'No', 'Raw landing files and small exports'],
          ['Avro', 'Binary, row by row, schema inside the file', 'No', 'Events and streams, where the schema travels with the data'],
          ['Parquet', 'Binary, column by column, with statistics', 'Yes', 'The default for analytics tables on AWS'],
          ['ORC', 'Binary, column by column, with statistics', 'Yes', 'Similar to Parquet, common in Hive-based setups']
        ],
        steps: [
          { upto: 2, say: 'Row formats. Easy to write and read, and a query always reads whole rows.' },
          { upto: 4, say: 'Columnar formats. A query reads the columns it names, and the statistics in the footer let it skip row groups. Parquet has the widest support across AWS services.' }
        ],
        pick: 'Land data as it arrives, then convert to **Parquet with Snappy** in the clean zone. Keep the raw files in the original format as the copy you can rebuild from.'
      }),

      B.cmp({
        id: 'm5-parquet', t: 2, src: 'rec', title: 'Inside the Parquet file',
        say: 'A Parquet file holds ' + SZ.parquet_row_groups + ' row groups of up to ' + num(SZ.parquet_row_group_rows) + ' rows. Each row group stores one chunk for every column. Press Next to read what each column costs in the recorded file.',
        cols: ['Column', 'Compressed bytes', 'Share of the column data'],
        hl: 1,
        rows: COLS.map(function (c) { return [c, num(PC.bytes_by_column[c]), num(PC.bytes_by_column[c] / COLSUM * 100, 1) + ' %']; }),
        steps: [
          { upto: 2, say: 'The order time and the order id take ' + num((PC.bytes_by_column.order_ts + PC.bytes_by_column.order_id) / COLSUM * 100, 0) + ' % of the column data. Values that rarely repeat do not compress well.' },
          { upto: 6, say: 'Columns with a few repeating values, such as the store, the channel and the quantity, are small.' },
          { upto: 11, say: '`order_date` takes ' + num(PC.bytes_by_column.order_date) + ' bytes for ' + num(SZ.rows) + ' rows. The file is sorted by time, so the same date repeats in long runs, and runs compress to almost nothing. The footer adds ' + num(SZ.parquet_footer_bytes) + ' bytes that describe every chunk.' }
        ],
        pick: 'A query for **status** reads **' + num(PC.bytes_by_column.status / COLSUM * 100, 1) + ' %** of the column data. `SELECT *` reads all of it. Name your columns.'
      }),

      B.talk({
        id: 'm5-skip', t: 3, src: 'rec', title: 'Skipping row groups with statistics',
        say: 'Each row group keeps the smallest and the largest value of every column in the footer. A reader compares your filter with those values and skips groups that cannot match. Press Next for the recorded cases.',
        items: [
          ['One day of orders', 'Rows for 2026-03-14 can be in ' + PC.row_groups_for_one_day.length + ' of ' + SZ.parquet_row_groups + ' row groups (number ' + PC.row_groups_for_one_day.join(', ') + '). The file is sorted by time, so each date sits in a narrow range of groups. The query read ' + size(Q.q2.bytes.parquet) + ', not ' + mb(SZ.parquet) + '.', 'Sorted data skips well.'],
          ['One month', 'March can be in ' + PC.row_groups_for_march.length + ' of ' + SZ.parquet_row_groups + ' row groups (' + PC.row_groups_for_march[0] + ' to ' + PC.row_groups_for_march[PC.row_groups_for_march.length - 1] + ').', 'A range maps to a run of groups.'],
          ['One order id', 'O-1234567 can be in ' + PC.row_groups_for_the_order_id.length + ' row group (number ' + PC.row_groups_for_the_order_id.join(', ') + '), on the day ' + PC.daily_file_with_the_order + '. This works here because the ids grow with the order time.', 'Min and max work for clustered values.'],
          ['When it does not help', 'A random id, such as a UUID, appears in every row group, so every group has to be read. Statistics only help when the column is sorted or clustered. Sort the data on the column you filter by, or partition on it.', 'Random values defeat statistics.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm5-small', t: 2, src: 'rec', title: 'The cost of small files',
        say: 'Partitioning by day looked cheaper for one day and dearer for a month. Press Next to see why.',
        cols: ['What was measured', 'One Parquet file', 'Parquet in ' + SZ.days + ' day files'],
        hl: 2,
        rows: [
          ['Size on S3 for the same orders', mb(SZ.parquet), mb(SZ.parquet_by_day)],
          ['q3: top customers in March, bytes read', mb(Q.q3.bytes.parquet), mb(Q.q3.bytes.parquet_by_day)],
          ['q2: one day of revenue, bytes read', size(Q.q2.bytes.parquet), size(Q.q2.bytes.parquet_by_day)],
          ['Average size of a day file', '-', mb(SZ.avg_day_parquet_bytes)]
        ],
        steps: [
          { upto: 1, say: 'Each day file repeats its own footer and dictionaries, so ' + SZ.days + ' small files take ' + num((SZ.parquet_by_day / SZ.parquet - 1) * 100, 0) + ' % more space.' },
          { upto: 2, say: 'A month query opens 31 files and reads ' + (Q.q3.bytes.parquet_by_day / Q.q3.bytes.parquet).toFixed(1) + ' times the bytes it reads from the one file.' },
          { upto: 3, say: 'One day is the case partitions are made for: ' + size(Q.q2.bytes.parquet_by_day) + ' against ' + size(Q.q2.bytes.parquet) + '.' },
          { upto: 4, say: 'The day files average ' + mb(SZ.avg_day_parquet_bytes) + '. At 1,000 times the data they would average ' + mb(SZ.avg_day_parquet_bytes * 1000, 0) + ', which is a comfortable size.' }
        ],
        pick: 'A common rule of thumb is **files of 128 MB or more**. Partition by a column only when each partition holds at least that much. A table partitioned by hour, or by store, at this size would be far too fine. Fix small files by rewriting them into bigger ones with CTAS, INSERT INTO or `OPTIMIZE` on an Iceberg table.'
      }),

      B.code({
        id: 'm5-slices', t: 2, src: 'docs', title: 'The 100 partition limit', file: 'backfill.sql', lang: 'sql', code: SLICES,
        steps: [
          { say: 'One CTAS or INSERT INTO statement can write at most 100 partitions. A statement that goes over stops with `HIVE_TOO_MANY_OPEN_PARTITIONS: Exceeded limit of 100 open writers for partitions/buckets`. A backfill of 400 days hits it at once.', lines: null },
          { say: 'The documented way around it: create the table first with CREATE EXTERNAL TABLE, partitioned by the column you want.', lines: G.span(SLICES, /CREATE EXTERNAL TABLE/, /LOCATION/) },
          { say: 'Then fill it with several INSERT INTO statements, each writing no more than 100 partitions. Here, 100 days in the first slice.', lines: G.span(SLICES, /^INSERT INTO/, /dt < '2026-04-11'/) },
          { say: 'The second slice starts exactly where the first ended and holds another 100 days. Keep the ranges apart. Overlapping ranges write the same partition twice and duplicate its rows.', lines: G.span(SLICES, /dt >= '2026-04-11'/, /dt < '2026-07-20'/) }
        ],
        note: 'A loop in your job code can generate the slices, one statement for each 100 days. INSERT INTO appends, so running a slice twice duplicates its rows. For a load that you may repeat, write to a new location, or use an Iceberg table with MERGE.'
      }),

      B.quiz({
        id: 'm5-q4', t: 2, src: 'rec',
        q: 'A tile on a dashboard runs q3 on a 166.7 GB CSV table every 5 minutes for 30 days. At $5 per TB, what does it cost?',
        opts: [
          { t: 'About $72', fb: 'That is 100 times too low. 8,640 runs each read 166.7 GB.' },
          { t: 'About $720', fb: 'Ten times too low. Count the runs: 12 an hour, 24 hours, 30 days.' },
          { t: 'About $7,200', fb: '' },
          { t: 'About $72,000', fb: 'Ten times too high. 166.7 GB is 0.1667 TB, which costs $0.83 a run.' }
        ],
        ok: 2, why: '12 runs an hour for 24 hours and 30 days is ' + num(RUNS) + ' runs. Each reads 0.1667 TB, which is $0.83. Together that is about ' + usd(M_CSV) + ' a month. The same query on Parquet reads ' + gb(Q.q3.bytes.parquet * 1000, 2) + ' and costs about ' + usd(M_PQ) + '.'
      }),

      B.quiz({
        id: 'm5-q5', t: 2, src: 'docs',
        q: 'A CTAS backfill of 400 days fails with HIVE_TOO_MANY_OPEN_PARTITIONS. What is the documented fix?',
        opts: [
          { t: 'Raise the partition limit in the workgroup settings', fb: 'The documented route is to split the work, not to change a setting.' },
          { t: 'Create the table, then load it with INSERT INTO statements of at most 100 partitions each', fb: '' },
          { t: 'Run the same CTAS again, because the error is temporary', fb: 'The number of partitions is the same on every run, so the error is too.' },
          { t: 'Convert the raw files to JSON first', fb: 'The input format has no part in this limit.' }
        ],
        ok: 1, why: 'The limit is on the number of partitions one statement writes. Split the range into slices with no overlap and run one INSERT INTO for each slice.'
      }),

      B.talk({
        id: 'm5-wg', t: 2, src: 'docs', title: 'Workgroups: rules for a group of queries',
        say: 'A workgroup is where cost control and access control for Athena live. Press Next to read what it holds.',
        items: [
          ['What it is', 'A named set of rules for queries. It holds the result location, the encryption setting, the engine version, limits, metrics and tags. Every query runs in one workgroup, chosen by the user or the job.', 'One set of rules for each team or job.'],
          ['A cap on each query', 'You can set the maximum bytes one query may scan. The smallest value you can set is 10 MB. A query that reaches the cap is cancelled, so one wrong `SELECT *` on a big table stops early.', 'The cost of a mistake has a ceiling.'],
          ['A cap on the whole workgroup', 'You can set a limit on the bytes all queries scan in a period, and attach an alarm that notifies you through SNS when the total crosses it.', 'An alarm on the total.'],
          ['Settings that cannot be overridden', 'With "override client-side settings" on, every query in the workgroup writes its results to the workgroup location with the workgroup encryption. A user cannot send results to a bucket of their own.', 'No stray result buckets.'],
          ['Metrics and tags', 'The workgroup publishes metrics to CloudWatch, such as bytes scanned and query time, and carries tags. Tags make the cost allocation reports show the Athena cost of each team.', 'Who spent what.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm5-reuse', t: 2, src: 'docs', title: 'Query result reuse',
        say: 'A dashboard runs the same query again and again. Result reuse answers repeats from the stored result. Press Next to read how it works and what it risks.',
        cols: ['Question', 'Answer'],
        hl: 1,
        rows: [
          ['What does it do?', 'If a query with the same text ran in the same workgroup recently, Athena returns the stored result and scans nothing.'],
          ['How long is a result reused?', 'You set the maximum age. The default is 60 minutes, and the API accepts up to 10,080 minutes (7 days).'],
          ['What must match?', 'The query text must be identical, character for character. A changed comment or a different timestamp in the text is a different query.'],
          ['What is the risk?', 'The result can be stale. Athena does not check whether the data changed until the maximum age has passed.'],
          ['What does it save?', 'A tile that refreshes every 5 minutes, with a 60 minute maximum age, scans at most once an hour: 12 times fewer scans. The month on CSV falls from ' + usd(M_CSV) + ' to about ' + usd(M_CSV / 12) + ', and on Parquet from ' + usd(M_PQ) + ' to about ' + usd(M_PQ / 12) + '.']
        ],
        steps: [
          { upto: 3, say: 'What it is, how long it lasts, and the rule that makes it hit: identical text.' },
          { upto: 5, say: 'The risk is staleness. The saving is large for repeated queries.' }
        ],
        pick: 'Turn on reuse for **dashboard queries** and set the **maximum age to what the business can tolerate**. Do not use it for queries that must see this minute data.'
      }),

      B.decide({
        id: 'm5-dec', t: 2, src: 'docs', title: 'Decision: how do you serve the 5 minute dashboard tile?',
        scenario: 'One tile shows revenue for the last 31 days and refreshes **every 5 minutes**. It reads the order table, which holds **166.7 GB** as one raw CSV copy. The business accepts data that is **up to an hour old**. Today the tile costs about **' + usd(M_CSV) + ' a month** in Athena scans.',
        opts: [
          { t: 'Keep the CSV table and turn on result reuse with a 60 minute maximum age', d: 'One setting. About ' + usd(M_CSV / 12) + ' a month.', lose: 'The bill falls by 12 times and stays high for one tile. Every scan still reads the whole CSV file, and a second tile with another query text pays again.' },
          { t: 'CTAS the data to Parquet partitioned by day, point the tile at it, and turn on result reuse', d: 'About ' + usd(M_PQ) + ' a month without reuse and ' + usd(M_PQ / 12) + ' with it.' },
          { t: 'Load the table into a Redshift cluster for this tile', d: 'Fast repeated queries and no per-scan charge.', lose: 'A cluster to size and pay for around the clock, for one tile that costs under $100 a month on Parquet. Redshift pays off when many dashboards share the same tables (mission 6).' }
        ],
        pick: 1,
        why: 'Fix the bytes first. Parquet cuts the cost of every query on the table by about ' + num(M_CSV / M_PQ, 0) + ' times, which also helps every other user. Reuse then divides what is left by 12.',
        when: 'Choose Redshift or a serving store when many users query the same tables all day, when you need answers in a second, or when the query cost on Athena passes the cost of a small cluster. Choose a precomputed summary table when one query text serves many viewers.'
      }),

      B.cmp({
        id: 'm5-errors', t: 2, src: 'docs', title: 'Athena errors you will meet',
        say: 'Most Athena failures come from a small set of messages. Press Next to read what each one usually means and what to do first.',
        cols: ['Message', 'Usual cause', 'First thing to do'],
        hl: 2,
        rows: [
          ['HIVE_TOO_MANY_OPEN_PARTITIONS', 'One CTAS or INSERT INTO writes more than 100 partitions.', 'Split the statement into slices of 100 partitions or fewer.'],
          ['HIVE_PATH_ALREADY_EXISTS', 'A CTAS wants to write to an `external_location` that already holds files.', 'Write to an empty prefix, or clear the old one yourself.'],
          ['HIVE_PARTITION_SCHEMA_MISMATCH', 'A partition has column types that differ from the table definition.', 'Compare the partition and the table, and re-register the partition.'],
          ['HIVE_BAD_DATA', 'The data in a file does not fit the type declared in the table.', 'Check the declared type against the file, and fix the writer.'],
          ['Query exhausted resources at this scale factor', 'A step such as ORDER BY, DISTINCT or a large join needs more memory than the engine can give it.', 'Reduce the data first, add LIMIT after ORDER BY, or write an intermediate table.'],
          ['TABLE_NOT_FOUND or COLUMN_NOT_FOUND', 'A name is wrong, or the query runs in another database or workgroup.', 'Check the database in the query context and the spelling.']
        ],
        steps: [
          { upto: 3, say: 'Load errors. They tell you which rule the statement broke.' },
          { upto: 5, say: 'Data errors. The files and the table definition disagree.' },
          { upto: 6, say: 'Resource and name errors. Cut the data first, then check the context.' }
        ],
        pick: 'Read the **first line** of the error. The prefix (`HIVE_`, `SYNTAX_ERROR`, `TABLE_NOT_FOUND`) names the area, and half of the fix is in it.'
      }),

      B.talk({
        id: 'm5-more', t: 3, src: 'docs', title: 'Other things Athena can do',
        say: 'Five features that senior interviews like to touch. Press Next to read what each one is for.',
        items: [
          ['The "$path" column', 'Every Hive-style table has a hidden column `"$path"` with the S3 file that holds the row. `SELECT "$path", count(*) FROM orders GROUP BY 1` finds the file that holds a bad row, or shows how many files a query touches.', 'Which file did this row come from?'],
          ['EXPLAIN and EXPLAIN ANALYZE', 'EXPLAIN shows the plan. EXPLAIN ANALYZE runs the query and adds the rows and the time spent in each step.', 'Find the expensive step.'],
          ['UNLOAD', 'UNLOAD writes the result of a SELECT to S3 as Parquet, ORC, Avro, JSON or text, without the CSV result file. It is useful when a query feeds another tool.', 'Results as proper files.'],
          ['Federated queries', 'Connectors that run in Lambda let Athena query other sources such as RDS and DynamoDB, and join them with S3 data. You pay for the Lambda and for what the connector scans.', 'One SQL over many stores.'],
          ['Athena for Apache Spark', 'A notebook mode for PySpark with sessions that start in seconds. Use it when SQL is not enough.', 'Python on demand.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm5-ice', t: 3, src: 'docs', title: 'Iceberg tables in Athena', file: 'orders_iceberg.sql', lang: 'sql', code: ICE,
        steps: [
          { say: 'An Iceberg table keeps its own metadata in S3: a list of snapshots, and for each snapshot the data files. A write is one atomic switch to a new snapshot, so readers never see half a write.', lines: null },
          { say: 'Partitioning is a transform of a column: `day(order_ts)`. Nobody adds a `dt` column or registers partitions, and queries filter on `order_ts` directly. This is called hidden partitioning.', lines: G.span(ICE, /^PARTITIONED BY/) },
          { say: 'MERGE applies a batch of changes in one statement: delete the rows marked D, update the rows that exist, and insert the new ones. This is how change data from a database lands in the lake.', lines: G.span(ICE, /^MERGE INTO/, /VALUES/) },
          { say: '`OPTIMIZE ... REWRITE DATA USING BIN_PACK` compacts small files into larger ones. Run it after many small writes.', lines: G.span(ICE, /^OPTIMIZE/) },
          { say: '`VACUUM` removes files that no snapshot needs any more, so deleted data really leaves S3 and storage stops growing.', lines: G.span(ICE, /^VACUUM/) }
        ],
        note: 'The syntax follows the Athena documentation and was not run. Check the statements that your engine version supports before you rely on them.'
      }),

      B.incident({
        id: 'm5-inc', t: 2, src: 'docs', title: 'Incident: the Athena bill went from $60 to $7,200', time: '14:10',
        alert: '**The Athena line of the bill is $7,200 this month. Last month it was $60.** Nothing was deployed on the data side. The only change is a new executive dashboard that the BI team published on the 1st. The workgroup has no scan limit.',
        clues: ['One BI user ran 8,640 queries in the month, all with the same text', 'The query reads `raw.orders_csv`, the 166.7 GB raw copy', 'The dashboard tile refreshes every 5 minutes'],
        opts: [
          { t: 'Point the tile at a curated Parquet table, turn on result reuse, and add a per-query scan limit to the workgroup', fb: '' },
          { t: 'Ask the BI team to refresh once a day', fb: 'It cuts the bill and breaks the requirement of 5 minutes. Fix the bytes first, then agree on a refresh time.' },
          { t: 'Buy provisioned capacity', fb: 'It caps the price, and each run still reads the whole CSV file. Fix the bytes per query first.' },
          { t: 'Cancel the queries each night', fb: 'A cancelled query still scans the data it read before the cancel, and the tile asks again.' }
        ],
        best: 0,
        why: 'The cost is 8,640 runs of a query that reads 166.7 GB each, about 1,440 TB at $5 per TB. A Parquet table partitioned by day reads about 2 GB for the same question, which is about $92 a month. Result reuse divides that by 12, and the per-query limit stops the next mistake early.',
        checks: [
          ['Find the line', 'Cost Explorer, filtered to Athena, grouped by workgroup and by usage type, shows the growth in scanned bytes.'],
          ['Find the query', 'The Athena query history shows 8,640 runs of one text, each with 166.7 GB of data scanned.'],
          ['Find the table', 'The query reads the raw CSV table, not a curated one.'],
          ['Fix the bytes', 'Build a Parquet table partitioned by day with CTAS and point the tile at it.'],
          ['Fix the rules', 'Turn on result reuse for the workgroup of dashboards, and set a per-query scan limit.']
        ],
        tell: 'Our Athena bill went from $60 to $7,200 in a month. A new executive dashboard ran the same query every 5 minutes against the raw CSV copy of the orders, which is 166.7 GB, so each run scanned the whole file. I built a Parquet table partitioned by day with CTAS and pointed the dashboard at it, which brought the monthly cost to about $92, and turned on result reuse with a 60 minute maximum age, which divides it by 12 again. We also set a per-query scan limit on the workgroup and an alarm on the daily total.',
        prevent: ['Give dashboards a **curated Parquet table** and keep BI tools away from raw files', 'Set a **per-query scan limit** and a **workgroup alarm**', 'Turn on **result reuse** for dashboard workgroups', 'Log **DataScannedInBytes** and review the top queries every week']
      }),

      B.incident({
        id: 'm5-inc2', t: 2, src: 'docs', title: 'Incident: the backfill fails with too many open partitions', time: '03:20',
        alert: '**The nightly curated load failed.** Yesterday the team added a backfill of the last 400 days to the same CTAS statement. The log shows `HIVE_TOO_MANY_OPEN_PARTITIONS: Exceeded limit of 100 open writers for partitions/buckets`.',
        clues: ['The statement selects from the raw table with a date range of 400 days', 'The table is partitioned by day', 'The nightly run for one day worked for months'],
        opts: [
          { t: 'Create the table once, then load the range with several INSERT INTO statements of at most 100 days each', fb: '' },
          { t: 'Run the same CTAS again later', fb: 'The statement writes the same 400 partitions every time, so it fails every time.' },
          { t: 'Partition by year, so there are fewer folders', fb: 'This changes the table for every reader, and one year folder is a poor unit for pruning. The error comes from one statement writing too many partitions, and slicing the statement fixes that without a new layout.' },
          { t: 'Increase the query timeout', fb: 'The statement fails on the number of writers, not on the time.' }
        ],
        best: 0,
        why: 'One statement can write at most 100 partitions. The documented way around the limit is to create the table first and load it in slices with no overlap. Keep the nightly job on its single day, and run the slices once for the backfill.',
        checks: [
          ['Read the error', 'The limit named in the message is 100 open writers for partitions.'],
          ['Count the partitions', '400 days in one statement is four times the limit.'],
          ['Check the table', 'A CTAS needs an empty location. Clear the partial output of the failed run first.'],
          ['Run the slices', 'Four INSERT INTO statements of 100 days each, with ranges that do not overlap.'],
          ['Check the result', 'Compare the row count and the partition list with the raw table.']
        ],
        tell: 'The curated load failed with HIVE_TOO_MANY_OPEN_PARTITIONS after we added a 400 day backfill to the CTAS. Athena allows 100 partitions for each statement. I created the table with CREATE EXTERNAL TABLE and loaded the backfill with four INSERT INTO statements of 100 days each, with ranges that do not overlap, then checked the row count against the raw table. The nightly job still loads one day, and the backfill script generates its slices from the date range.',
        prevent: ['Generate **slices of 100 partitions or fewer** in the backfill script', 'Keep **backfills out of the nightly statement**', 'Make loads **safe to repeat**: write to a new location or use MERGE', 'Compare **row counts** with the source after every load']
      }),

      B.qa({
        id: 'qa-athena', t: 1, tag: 'Athena', secs: 60,
        q: 'What is Amazon Athena, and when would you use it?',
        pts: ['Serverless SQL on files in S3', 'Table definitions come from the Glue Data Catalog', 'You pay for bytes scanned: $5 per TB, 10 MB minimum for each query', 'Good for ad hoc work, logs and CTAS transformations', 'Poor for many users who refresh dashboards every few seconds', 'Workgroups give limits and cost control'],
        short: 'Athena is serverless SQL on files in S3. It runs the Trino engine, reads table definitions from the Glue Data Catalog and writes each result to S3. There is no cluster to run.\n\nOn-demand queries cost $5 per terabyte scanned, rounded up to the next megabyte, with a 10 MB minimum for each query. So the bill follows the bytes a query reads, and the way to make a query cheaper and faster is to make it read less.\n\nI use it for ad hoc questions, log analysis, and SQL transformations that write Parquet back to the lake with CTAS and INSERT INTO. I would not use it to serve a dashboard that many people refresh every few seconds. Redshift or a precomputed summary table fits that better.\n\nI give each team or job its own workgroup, with a result location and a limit on the bytes that one query may scan.',
        fu: [
          ['What does one query cost on a 166 GB CSV table?', 'Any query that reads it in full costs about $0.83, because 166 GB is 0.166 TB and the rate is $5 per TB.'],
          ['What stops a runaway query?', 'A per-query scan limit on the workgroup. A query that reaches it is cancelled.']
        ],
        trap: 'Saying that Athena is free when idle and stopping there. Idle costs nothing, but one bad query on a big CSV table is expensive.',
        real: 'Describe the biggest Athena query you ran, and how many bytes it scanned.'
      }),

      B.qa({
        id: 'qa-athena-cost', t: 1, tag: 'Athena', secs: 90,
        q: 'How do you make Athena queries cheaper and faster?',
        pts: ['Store Parquet or ORC, not CSV', 'Partition on the column most queries filter by', 'Name the columns you need, never SELECT *', 'Keep files large, 128 MB or more', 'Reuse results for repeated queries', 'Measure with DataScannedInBytes'],
        short: 'Cost follows bytes scanned, so I cut bytes in four ways.\n\nFirst, a columnar format. Parquet lets a query read only the columns it names. In a test on 2 million orders, counting by status read 323 KB from Parquet and 166.7 MB from CSV, more than 500 times less.\n\nSecond, partitions. With a folder for each day and a day filter, one day of revenue read 21 KB. Without the filter on the partition column, every folder is read.\n\nThird, file size. In my test 90 small day files read 60 % more bytes than one file for a month query, so I keep files at 128 MB or more and compact small ones.\n\nFourth, I name columns and filter early.\n\nBeyond the bytes, I turn on result reuse for repeated dashboard queries, and I log DataScannedInBytes for every query so each job shows its own cost.',
        fu: [
          ['Why not partition by hour?', 'More partitions mean more small files and more catalog entries. When files end up far below 128 MB, a coarser partition is better.'],
          ['How do you check the real bytes?', '`get_query_execution` returns `DataScannedInBytes`, and the console shows Data scanned for each run.']
        ],
        trap: 'Naming only partitioning. The format and the column list often matter more.',
        real: 'Describe a table you converted, with the bytes scanned before and after.'
      }),

      B.qa({
        id: 'qa-partition', t: 1, tag: 'Athena', secs: 90,
        q: 'How do you choose partition columns, and what goes wrong?',
        pts: ['Partition on the column most queries filter by, usually the date', 'Not too many values, so each partition holds enough data', 'Aim for 128 MB or more in each partition', 'The query must filter on the partition column itself', 'Register partitions, or use partition projection', 'Too many partitions mean small files and slow planning'],
        short: 'I look at the filters of the real queries. Most analytics queries filter by date, so a day column is the usual choice. Sometimes a second column such as region helps, when many queries filter on it.\n\nI check the size of each partition. A partition should hold at least 128 MB, or the table has many small files. In my test, the same orders took 13 % more space in 90 day files than in one file, and a month query read 60 % more bytes.\n\nThree things go wrong. The query does not filter on the partition column, for example it filters on a timestamp, so every folder is read. The new partition is not registered, so the data is invisible. Or the partitions are too fine, which makes planning slow and files small.\n\nFor date columns I use partition projection, so there is nothing to register.',
        fu: [
          ['What is partition projection?', 'Athena computes the partition values from rules in the table properties instead of asking the catalog. A new day needs no registration. It is an Athena feature, so other engines ignore it.'],
          ['What is bucketing for?', 'It groups rows by a hash of a high-cardinality column such as customer id, which helps joins and lookups on that column. For most tables a date partition and sorted Parquet are enough.']
        ],
        trap: 'Partitioning by a high-cardinality column such as customer id, which creates millions of tiny partitions.',
        real: 'Describe a partitioning choice you changed, and the effect on bytes scanned.'
      }),

      B.qa({
        id: 'qa-format', t: 1, tag: 'Athena', secs: 60,
        q: 'Parquet, ORC, Avro, CSV, JSON: how do you choose a file format?',
        pts: ['Analytics tables: Parquet or ORC, columnar with statistics', 'Row formats such as CSV and JSON for landing files', 'Avro for events, where the schema travels with the data', 'Snappy compression as the default', 'gzip CSV is small on disk and has no shortcuts', 'Convert once, in the clean zone'],
        short: 'For tables that people query, I use Parquet with Snappy compression. It is columnar, so a query reads only the columns it names, and the statistics in the footer let it skip row groups. ORC does the same and is common in Hive setups.\n\nFor landing files I keep what the source sends, usually CSV or JSON, because that is the copy I can rebuild everything from. For events and streams I like Avro, because the schema is inside the file.\n\nSize on disk is not the whole story. In my test the gzip CSV file was about the same size as the Parquet file, 29.5 MB against 31.8 MB. But every query read all of the CSV, while the status count read 323 KB from Parquet.\n\nI convert once, in the clean zone, with CTAS or a Glue job, and I check the file sizes afterwards.',
        fu: [
          ['Why is JSON a poor analytics format?', 'It repeats every key in every row, it is text, and a query cannot skip columns. It is fine for landing data and small payloads.'],
          ['Parquet or ORC on AWS?', 'Both work in Athena, EMR and Redshift Spectrum. I pick Parquet because more tools read it, unless the team already runs on ORC.']
        ],
        trap: 'Choosing a format by size on disk alone. What matters is how many bytes a query has to read.',
        real: 'Describe a table you moved to a columnar format and the result.'
      }),

      B.qa({
        id: 'qa-ctas', t: 2, tag: 'Athena', secs: 90,
        q: 'How do you transform data inside Athena, and what are the limits?',
        pts: ['CTAS creates a table and writes files in one statement', 'INSERT INTO appends to an existing table', 'The location must be empty, and the partition columns go last', 'At most 100 partitions for each statement', 'INSERT INTO is not safe to repeat', 'Iceberg adds MERGE, OPTIMIZE and VACUUM'],
        short: 'CTAS creates a table and writes its files in one statement. I use it to convert raw CSV into partitioned Parquet, with `format`, `external_location` and `partitioned_by`. The location must be empty, and the partition columns must be last in the SELECT.\n\nFor daily loads I use INSERT INTO on an existing table. It appends, so running it twice duplicates rows. I make the load safe to repeat by writing one partition from a known source range, or by using an Iceberg table and MERGE.\n\nOne statement can write at most 100 partitions. For a backfill of 400 days I create the table first and run INSERT INTO in slices of 100 days that do not overlap.\n\nWhen the logic needs Python, bookmarks or complex joins at scale, I move to a Glue job. For SQL that fits in one statement, Athena is the least to operate, and I put the statement in Git and run it from Step Functions.',
        fu: [
          ['How do you repeat a failed load?', 'Clear the target partition and run the slice again, or MERGE into an Iceberg table. Never run a plain INSERT INTO twice.'],
          ['What do you do about small files after many INSERTs?', 'Rewrite them into bigger ones with a CTAS, or run OPTIMIZE on an Iceberg table.']
        ],
        trap: 'Forgetting that INSERT INTO appends. A retry then doubles the data.',
        real: 'Describe a load you made safe to repeat, and how.'
      }),

      B.qa({
        id: 'qa-athena-redshift', t: 2, tag: 'Athena', secs: 90,
        q: 'Athena or Redshift: how do you decide?',
        pts: ['Athena: no cluster, pay for bytes, good for irregular use', 'Redshift: pay for capacity, fast repeated queries and many users', 'Redshift stores and manages its own data and has tuning options', 'Spectrum lets Redshift query S3 too', 'Cost crossover depends on query volume', 'Many platforms use both'],
        short: 'Athena has no cluster and bills by bytes scanned. That suits irregular use, ad hoc work and transformations on the lake. The cost is zero when idle and grows with every scan.\n\nRedshift bills for capacity. It fits many users who run repeated queries all day against the same tables, joins on large fact tables, and cases that need answers in about a second. It also gives me tuning options such as sort and distribution keys, and concurrency scaling.\n\nThe crossover is a number. If a workload scans so many bytes that the monthly Athena bill passes the price of a small cluster, I look at Redshift. In my test, one dashboard tile on a 166.7 GB CSV table cost about $7,200 a month, but only about $92 on Parquet, so I fix the bytes before I buy capacity.\n\nMany platforms use both: Athena over the lake for exploration and ELT, and Redshift for the curated marts that dashboards use.',
        fu: [
          ['What is Redshift Spectrum?', 'A Redshift feature that queries files in S3 through the same catalog, billed by bytes scanned. It lets one query join warehouse tables with lake tables.'],
          ['Can Athena serve a BI tool?', 'Yes, for light use. For many users and tight response times I prefer Redshift or a summary table.']
        ],
        trap: 'Answering with a product preference and no numbers. The decision is bytes, users and response time.',
        real: 'Describe a workload you moved between the two, and the numbers that drove it.'
      }),

      B.qa({
        id: 'qa-workgroup', t: 2, tag: 'Athena', secs: 60,
        q: 'How do you control cost and access when several teams use Athena?',
        pts: ['One workgroup for each team or job', 'A per-query scan limit that cancels runaway queries', 'A workgroup alarm on total bytes', 'Enforced result location and encryption', 'Result reuse for dashboards', 'Tags for cost allocation and CloudWatch metrics'],
        short: 'I give each team or job its own workgroup, and I put the rules in the workgroup so nobody has to remember them.\n\nEach workgroup has a per-query scan limit, so one wrong SELECT * on a big table is cancelled early. The smallest limit the API accepts is 10 MB. I add an alarm on the total bytes scanned in a period, which notifies me through SNS.\n\nI turn on the setting that overrides client settings, so every query writes its results to the workgroup location with the workgroup encryption.\n\nFor dashboard workgroups I turn on result reuse. IAM policies say which roles may use which workgroup, so a team cannot run in a workgroup that has no limit. The workgroups carry tags, so the cost allocation report shows the Athena cost of each team, and I read the CloudWatch metrics for bytes scanned and query time.',
        fu: [
          ['What happens when a query hits the limit?', 'Athena cancels it. The user sees a failure that says the data limit was reached, and pays for what was scanned until then.'],
          ['How do you stop people using the default workgroup?', 'An IAM policy that allows `athena:StartQueryExecution` only for the named workgroups.']
        ],
        trap: 'Describing limits without the policy that forces people to use the workgroup.',
        real: 'Describe how you found out which team or query caused a cost spike.'
      }),

      B.qa({
        id: 'qa-iceberg', t: 3, tag: 'Athena', secs: 90,
        q: 'Why would you use Apache Iceberg tables with Athena?',
        pts: ['Atomic commits on S3 through snapshots', 'MERGE, UPDATE and DELETE on lake data', 'Hidden partitioning and safe schema changes', 'Time travel to an earlier snapshot', 'OPTIMIZE and VACUUM for small files and old data', 'Support in Athena, EMR, Glue and Redshift'],
        short: 'Plain folders of Parquet have no transactions and no row-level changes. An Iceberg table adds a metadata layer in S3: snapshots that list the data files. A write is one atomic switch to a new snapshot, so readers never see half a write.\n\nThat gives me MERGE, UPDATE and DELETE in Athena. I use MERGE to apply change data from a database, and DELETE to remove one person data on request without rewriting the lake.\n\nPartitioning is a transform of a column, such as day(order_ts), so nobody maintains a dt column or registers partitions. Schema changes such as adding or renaming a column do not break old files. I can read the table as of an earlier snapshot to debug a bad load.\n\nMaintenance is on me: OPTIMIZE rewrites small files into bigger ones, and VACUUM removes files that no snapshot needs. Athena, EMR, Glue and Redshift all read Iceberg, so I pick it when changes and deletes matter.',
        fu: [
          ['What is the cost of Iceberg?', 'More moving parts: metadata files, maintenance jobs, and versions that must match across engines. For append-only data, plain Parquet is simpler.'],
          ['How does it compare with Delta Lake?', 'Both give snapshots and transactions. Iceberg has the widest native support in AWS services, and Delta is stronger in Databricks.']
        ],
        trap: 'Choosing Iceberg for a table that is only appended to. The extra layer earns its cost with changes and deletes.',
        real: 'Describe a table where you needed row-level changes and what you used.'
      }),

      B.recap({
        id: 'm5-recap', n: 5, badge: 'Query Tuner', color: '#FDE68A',
        pts: [
          'Athena bills **bytes scanned**: $5 per TB in the example, rounded up to the next MB, with a **10 MB minimum** for each query.',
          'A **CSV file is read in full** by every query. **Parquet** reads only the named columns: ' + size(Q.q5.bytes.parquet) + ' against ' + mb(Q.q5.bytes.csv) + ' for the status count.',
          '**Partitions** prune folders only when the query filters on the **partition column**. Too many small files cost extra.',
          '**CTAS** needs an empty location and the partition columns last. One statement writes at most **100 partitions**.',
          '**Workgroups** hold the scan limits, the result location and the alarms. **Result reuse** divides repeated dashboard scans.',
          'Use Athena for the lake and ad hoc work. Use **Redshift** for many users, repeated queries and fast answers.'
        ],
        lines: [
          'I look at the bytes before I look at the SQL.',
          'I filter on the partition column.',
          'I set a scan limit before the first user arrives.'
        ]
      })
    ]
  });
})();
