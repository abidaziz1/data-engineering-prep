/* Mission 6: Redshift. Nothing here ran on Redshift: there is no open-source Redshift to record. The table of order statuses comes from the
   DuckDB recording of the 2 million orders. The lab is a model with made-up numbers (it says so on screen) and its checks are in
   aws/verify/check_widgets.js. SQL and Python snippets follow the Redshift and AWS SDK documentation and are checked by aws/verify/verify_aws.py
   (SQL parsed with sqlglot, boto3 parameters checked against the service model). Prices are examples from public price lists. */
(function () {
  var B = LAB.b, G = LAB.get;
  var ST = G.table('athena.q5_result');
  var STATUS = {}; ST.rows.forEach(function (r) { STATUS[r[0]] = +r[1]; });
  var ROWS = STATUS.COMPLETED + STATUS.CANCELLED + STATUS.REFUNDED;
  G.expect(ST.cols.join() === 'status,orders' && ROWS === 2000000 && Object.keys(STATUS).length === 3, 'three statuses over 2 million orders');
  var SHARE = STATUS.COMPLETED / ROWS * 100;
  G.expect(Math.round(SHARE) === 90, 'about 90 percent of the orders are COMPLETED');
  function num(n, d) { return n.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }

  var DDL = [
    'CREATE TABLE mart.fct_orders (',
    '  order_id     varchar(20)   NOT NULL,',
    '  customer_id  varchar(20)   NOT NULL,',
    '  order_ts     timestamp     NOT NULL,',
    '  store_id     varchar(10),',
    '  status       varchar(24),',
    '  total_usd    decimal(12,2)',
    ')',
    'DISTSTYLE KEY',
    'DISTKEY (customer_id)',
    'COMPOUND SORTKEY (order_ts);',
    '',
    'CREATE TABLE mart.dim_customers (',
    '  customer_id  varchar(20)   NOT NULL,',
    '  segment      varchar(16),',
    '  PRIMARY KEY (customer_id)',
    ')',
    'DISTSTYLE ALL',
    'SORTKEY (customer_id);'
  ].join('\n');

  var COPY = [
    'COPY mart.fct_orders (order_id, customer_id, order_ts, store_id, status, total_usd)',
    "FROM 's3://brewline-lake/curated/orders/dt=2026-03-14/'",
    "IAM_ROLE 'arn:aws:iam::123456789012:role/brewline-redshift-load'",
    'FORMAT AS PARQUET;'
  ].join('\n');

  var STAGE = [
    'BEGIN;',
    '',
    'CREATE TEMP TABLE stage_orders (LIKE mart.fct_orders);',
    '',
    'COPY stage_orders (order_id, customer_id, order_ts, store_id, status, total_usd)',
    "FROM 's3://brewline-lake/curated/orders/dt=2026-03-14/'",
    "IAM_ROLE 'arn:aws:iam::123456789012:role/brewline-redshift-load'",
    'FORMAT AS PARQUET;',
    '',
    'DELETE FROM mart.fct_orders',
    'USING stage_orders',
    'WHERE mart.fct_orders.order_id = stage_orders.order_id;',
    '',
    'INSERT INTO mart.fct_orders',
    'SELECT * FROM stage_orders;',
    '',
    'COMMIT;'
  ].join('\n');

  var API = [
    'import time',
    'import boto3',
    '',
    'rsd = boto3.client("redshift-data", region_name="us-east-1")',
    'SECRET = "arn:aws:secretsmanager:us-east-1:123456789012:secret:brewline-redshift-AbCdEf"',
    '',
    '',
    'def run_sql(sql):',
    '    sid = rsd.execute_statement(',
    '        WorkgroupName="brewline",',
    '        Database="analytics",',
    '        SecretArn=SECRET,',
    '        Sql=sql,',
    '    )["Id"]',
    '',
    '    while True:',
    '        d = rsd.describe_statement(Id=sid)',
    '        if d["Status"] in ("FINISHED", "FAILED", "ABORTED"):',
    '            break',
    '        time.sleep(1)',
    '',
    '    if d["Status"] != "FINISHED":',
    '        raise RuntimeError(d.get("Error", d["Status"]))',
    '',
    '    if not d["HasResultSet"]:',
    '        return []',
    '    rows = []',
    '    for page in rsd.get_paginator("get_statement_result").paginate(Id=sid):',
    '        rows += page["Records"]',
    '    return rows'
  ].join('\n');

  var API_BUG = [
    'sid = rsd.execute_statement(WorkgroupName="brewline", Database="analytics", SecretArn=SECRET,',
    '                            Sql="SELECT status, count(*) FROM mart.fct_orders GROUP BY 1")["Id"]',
    'rows = rsd.get_statement_result(Id=sid)["Records"]',
    'print(rows)'
  ].join('\n');
  var API_FIX = [
    'sid = rsd.execute_statement(WorkgroupName="brewline", Database="analytics", SecretArn=SECRET,',
    '                            Sql="SELECT status, count(*) FROM mart.fct_orders GROUP BY 1")["Id"]',
    'while rsd.describe_statement(Id=sid)["Status"] not in ("FINISHED", "FAILED", "ABORTED"):',
    '    time.sleep(1)',
    'rows = rsd.get_statement_result(Id=sid)["Records"]',
    'print(rows)'
  ].join('\n');

  var DIST_BUG = [
    'CREATE TABLE mart.fct_orders (',
    '  order_id     varchar(20) NOT NULL,',
    '  customer_id  varchar(20) NOT NULL,',
    '  status       varchar(24),',
    '  total_usd    decimal(12,2)',
    ')',
    'DISTSTYLE KEY',
    'DISTKEY (status)',
    'SORTKEY (order_id);'
  ].join('\n');
  var DIST_FIX = DIST_BUG.replace('DISTKEY (status)', 'DISTKEY (customer_id)');

  var SPECTRUM = [
    'CREATE EXTERNAL SCHEMA lake',
    "FROM DATA CATALOG DATABASE 'brewline_lake'",
    "IAM_ROLE 'arn:aws:iam::123456789012:role/brewline-redshift-spectrum';",
    '',
    'SELECT c.segment, sum(o.total_usd) AS revenue_usd',
    'FROM lake.orders o',
    'JOIN mart.dim_customers c ON c.customer_id = o.customer_id',
    "WHERE o.dt = '2026-03-14'",
    'GROUP BY c.segment;'
  ].join('\n');

  var DIAG = [
    'SELECT "schema", "table", diststyle, sortkey1,',
    '       tbl_rows, skew_rows, unsorted, stats_off, size',
    'FROM svv_table_info',
    "WHERE \"schema\" = 'mart'",
    'ORDER BY size DESC;',
    '',
    'SELECT filename, line_number, colname, err_reason',
    'FROM stl_load_errors',
    'ORDER BY starttime DESC',
    'LIMIT 5;'
  ].join('\n');

  LAB.addChapter({
    id: 'm6', n: 6, title: 'Redshift: the warehouse for repeated queries', short: 'Redshift', blurb: 'Nodes and slices, Serverless or provisioned, distribution and sort keys, COPY and staging loads, Spectrum and tuning', minutes: 50,
    focus: ['mart', 'con'],
    goals: [
      'Describe the **leader node, compute nodes and slices**, and the difference between **provisioned and Serverless**.',
      'Choose a **distribution style** and a **sort key**, and read the **join label** in EXPLAIN.',
      'Load data with **COPY** and a **staging table** in one transaction.',
      'Read **SVV_TABLE_INFO** and the load error tables to find skew and bad files.',
      'Explain when to use **Spectrum, data sharing and zero-ETL**.'
    ],
    say: 'Mission 6 is Redshift. Athena bills the bytes a query reads, and Redshift bills capacity, so it pays off when many people run repeated queries on the same tables. Nothing in this mission ran on Redshift, because no open-source Redshift exists to record. The facts come from documentation. The lab is a small model with made-up numbers that shows what a distribution key does to your data, and I label it that way.',
    scenes: [
      B.talk({
        id: 'm6-talk', t: 1, src: 'docs', title: 'What Redshift is',
        say: 'Redshift is a data warehouse that runs SQL on tables it stores itself. Press Next for the parts.',
        items: [
          ['A columnar, parallel warehouse', 'Tables are stored by column and compressed, so a query reads only the columns it names. Every query is split over many processors that work in parallel. The design suits scans and joins over millions of rows.', 'Built for analytics, not for single-row updates.'],
          ['Leader node, compute nodes, slices', 'A leader node takes the SQL, plans it and coordinates. Compute nodes run the plan. Each node divides its memory and disk into slices, and each slice works on its own share of every table.', 'Plan on one, work on many.'],
          ['RA3 nodes and managed storage', 'RA3 nodes keep data in managed storage that S3 backs, with a cache on local SSD. You can add compute without adding storage, and the other way round. The smallest RA3 node, ra3.xlplus, has 4 vCPUs, 32 GiB of memory and 2 slices.', 'Storage and compute scale apart.'],
          ['Serverless', 'Redshift Serverless has no nodes to pick. You set a base capacity in Redshift Processing Units (RPUs), it scales with the load, and it bills for the RPU-hours while queries run.', 'No cluster, billed while it works.'],
          ['What you pay for', 'Capacity: node hours for a provisioned cluster, RPU-hours for Serverless, and managed storage by the GB-month. Athena bills bytes scanned instead. Repeated queries on the same tables cost nothing extra on Redshift once the capacity is there.', 'Capacity, not bytes.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm6-flow', t: 1, src: 'docs', title: 'The path of a query and a load', g: 'redshift', legend: true,
        steps: [
          { say: 'One cluster, three jobs: answer queries, load files, and read the lake. Press Next to follow each.', cap: 'Query, load, lake.' },
          { say: 'Step 1. A BI tool or a script connects with JDBC, ODBC or the Data API, and sends SQL to the leader node.', on: ['r1'], focus: ['cli', 'ldr'], cap: 'SQL goes to the leader.' },
          { say: 'Step 2. The leader parses the SQL, plans the query and sends compiled steps to the compute nodes.', on: ['r2'], focus: ['ldr', 'n2'], cap: 'The leader plans.' },
          { say: 'Step 3. The nodes work in parallel on their slices. They read the data from local cache or from managed storage in S3.', on: ['r3'], focus: ['n1', 'n2', 'n3', 'ms'], cap: 'Slices work in parallel.' },
          { say: 'Step 4. COPY loads files from S3 into the nodes. Every slice loads some of the files at the same time, so many files make a fast load.', on: ['r4', 'r5'], focus: ['s3', 'cp', 'n3'], cap: 'COPY loads in parallel.' },
          { say: 'Step 5. Spectrum reads files in S3 in place, with the same SQL, and joins them with tables in the cluster.', on: ['r6', 'r7'], focus: ['n3', 'sp', 's3'], cap: 'Spectrum reads the lake.' },
          { say: 'Data sharing lets another cluster read this one live, with no copy.', focus: ['sh'], cap: 'Share without copying.' }
        ]
      }),

      B.cmp({
        id: 'm6-modes', t: 1, src: 'docs', title: 'Provisioned or Serverless',
        say: 'Two ways to run Redshift. Press Next to compare them. The prices are example US rates from public price lists, and AWS changes them.',
        cols: ['Question', 'Provisioned (RA3 nodes)', 'Serverless'],
        hl: 2,
        rows: [
          ['What do you choose?', 'Node type and number of nodes.', 'A base capacity in RPUs, and an optional maximum.'],
          ['How is it billed?', 'Per node-hour while the cluster runs. About $3.26 an hour for one ra3.4xlarge. Storage extra.', 'Per RPU-hour while queries run, by the second. About $0.375 for each RPU-hour. Storage extra.'],
          ['What about idle time?', 'You pay until you pause the cluster.', 'Nothing while no query runs.'],
          ['Scaling', 'Resize, or add concurrency scaling clusters for bursts.', 'Automatic within the base and maximum capacity.'],
          ['Fits', 'Steady load around the clock, where reserved nodes cut the price, and teams that want to choose hardware.', 'Uneven or unpredictable load, new projects, and teams without a Redshift expert.']
        ],
        steps: [
          { upto: 2, say: 'What you choose and how it is billed.' },
          { upto: 4, say: 'Idle time and scaling, which is where the two differ most.' },
          { upto: 5, say: 'Match the model to the shape of the load.' }
        ],
        pick: 'Start with **Serverless** for a new warehouse with uneven load. Move to **provisioned** when the load is steady and a reserved price beats the RPU-hours.'
      }),

      B.cmp({
        id: 'm6-diststyle', t: 1, src: 'docs', title: 'Distribution styles',
        say: 'A distribution style decides which slice stores each row. Press Next to read the four styles.',
        cols: ['Style', 'What it does', 'Use it for'],
        hl: 2,
        rows: [
          ['AUTO', 'Redshift chooses and can change the style as the table grows. A small table starts as ALL.', 'The default, and a good starting point.'],
          ['EVEN', 'Rows are dealt out to the slices in turn.', 'Tables that are not joined on one column, and tables where no key spreads well.'],
          ['KEY', 'Rows with the same value of the key column go to the same slice.', 'Two large tables that are joined on the same column.'],
          ['ALL', 'A full copy of the table sits on every node.', 'Small dimension tables that many queries join to.']
        ],
        steps: [
          { upto: 1, say: 'AUTO is the default, and it is a sound choice until a measured problem says otherwise.' },
          { upto: 3, say: 'EVEN spreads evenly. KEY puts matching rows together, so a join on that column needs no data movement.' },
          { upto: 4, say: 'ALL removes data movement for small tables, at the price of storage and slower writes.' }
        ],
        pick: 'A key needs **many different values** and **no value that dominates**. A key with a handful of values leaves most slices empty and one slice overloaded.'
      }),

      B.widget({ id: 'm6-lab', kind: 'distkey', t: 1, src: 'docs', title: 'Lab (a model): distribution and sort keys' }),

      B.talk({
        id: 'm6-sort', t: 1, src: 'docs', title: 'Sort keys and zone maps',
        say: 'The distribution key decides which slice holds a row. The sort key decides the order inside the slice. Press Next for how it speeds up a query.',
        items: [
          ['Blocks and zone maps', 'Redshift stores each column in 1 MB blocks. For every block it keeps the smallest and the largest value, which is called a zone map. A filter that falls outside the range of a block skips the block.', 'Skip blocks, not rows.'],
          ['Sorting makes ranges narrow', 'When a table is stored in the order of a column, each block holds a narrow range of that column. A filter on that column then matches a few blocks. Without a sort order, every block holds a bit of everything.', 'Order makes skipping work.'],
          ['Compound, interleaved, auto', 'A compound sort key sorts by the first column, then the second, and so on, so the first column matters most. An interleaved key gives equal weight to several columns and costs more to maintain. AUTO lets Redshift choose. Use compound unless you have measured a reason.', 'Put the most filtered column first.'],
          ['The usual choice', 'For event and order tables, the time column is the usual first column of the sort key, because most queries filter a range of dates and new rows arrive in time order.', 'Time first for facts.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm6-ddl', t: 1, src: 'docs', title: 'Tables with keys', file: 'tables.sql', lang: 'sql', code: DDL,
        steps: [
          { say: 'The fact table. The columns look like any SQL table, and Redshift stores them by column. NOT NULL is enforced.', lines: G.span(DDL, /CREATE TABLE mart\.fct_orders/, /^\)$/) },
          { say: '`DISTSTYLE KEY` with `DISTKEY (customer_id)` puts all orders of a customer on one slice. Joins to the customer table on this column need no data movement.', lines: G.span(DDL, /DISTSTYLE KEY/, /DISTKEY/) },
          { say: 'A compound sort key on `order_ts` stores the rows in time order, so a query for one day or one month reads a few blocks.', lines: G.span(DDL, /COMPOUND SORTKEY/) },
          { say: 'The customer dimension is small, so `DISTSTYLE ALL` puts a full copy on every node. Every join to it is local.', lines: G.span(DDL, /CREATE TABLE mart\.dim_customers/, /SORTKEY \(customer_id\)/) },
          { say: 'The `PRIMARY KEY` is information for the planner. Redshift does not enforce primary key, foreign key or unique constraints, so duplicate keys go in unless your load prevents them.', lines: G.span(DDL, /PRIMARY KEY/) }
        ],
        note: 'The statements follow the Redshift documentation and were not run on Redshift. They are parsed with the Redshift dialect of sqlglot by the verifier.'
      }),

      B.bug({
        id: 'm6-bug1', t: 1, src: 'rec', q: 'This table is slow whatever the cluster size. Click the line that causes it.',
        file: 'fct_orders_bad.sql', lang: 'sql', code: DIST_BUG, bad: [8],
        hint: 'How many different values does the distribution key have?',
        why: 'A distribution key hashes its values to slices. `status` has only ' + Object.keys(STATUS).length + ' values, so at most ' + Object.keys(STATUS).length + ' slices hold any data, and in the recorded 2 million orders ' + num(STATUS.COMPLETED) + ' rows (' + num(SHARE) + ' %) are COMPLETED, which all land on one slice. That slice does most of the work while the others wait. Use `customer_id`, or leave the style on AUTO.',
        fix: DIST_FIX,
        cheer: 'A distribution key needs many values and no dominant one.'
      }),

      B.code({
        id: 'm6-copy', t: 1, src: 'docs', title: 'COPY: load files from S3', file: 'copy_orders.sql', lang: 'sql', code: COPY,
        steps: [
          { say: 'COPY loads files from S3 into a table, in parallel on all slices. It is the way to load large data. Row-by-row INSERT statements are slow.', lines: null },
          { say: 'Give COPY an explicit column list, in the order of the file columns. Do not rely on column order or name matching, and check that the file types fit the table.', lines: G.span(COPY, /^COPY/) },
          { say: 'The S3 path can be a prefix, so every file under it is loaded, or a manifest file that lists the files.', lines: G.span(COPY, /^FROM/) },
          { say: '`IAM_ROLE` is a role attached to the cluster. It needs read access to the bucket, and to the KMS key if the files are encrypted (mission 3 and mission 10).', lines: G.span(COPY, /^IAM_ROLE/) },
          { say: '`FORMAT AS PARQUET` reads columnar files. For CSV you would give the delimiter, the header rows to skip and the compression.', lines: G.span(COPY, /^FORMAT AS/) }
        ],
        note: 'COPY is documented to match columns of Parquet files by position. A community answer says by name. An explicit column list avoids relying on either.'
      }),

      B.cmp({
        id: 'm6-copyrules', t: 1, src: 'docs', title: 'Rules for a fast COPY',
        say: 'Most slow loads break one of these rules. Press Next to read them.',
        cols: ['Rule', 'Why'],
        hl: 1,
        rows: [
          ['Split the data into many files', 'Each slice loads whole files. One big file is loaded by one slice while the others wait.'],
          ['Use a number of files that is a multiple of the number of slices', 'Every slice gets the same amount of work. With 8 slices, use 8, 16 or 24 files.'],
          ['Keep the files about equal in size, from 1 MB to 1 GB after compression', 'The load finishes when the slowest slice finishes.'],
          ['Compress CSV files with gzip, or use Parquet', 'Less to read from S3. A gzip file is not split, so it needs to be one of many.'],
          ['Use one COPY for a table, with a prefix or a manifest', 'Several COPY commands into one table at the same time are run one after the other.'],
          ['Load into a staging table, then merge', 'It keeps bad data out of the target and makes the load safe to repeat.']
        ],
        steps: [
          { upto: 3, say: 'Files: how many, how big, how even.' },
          { upto: 6, say: 'Format, one command, and a staging table.' }
        ],
        pick: 'The cluster has the **same number of slices every day**. Cut the files into **a multiple of that number**, and one COPY keeps all of them busy.'
      }),

      B.quiz({
        id: 'm6-q1', t: 1, src: 'docs',
        q: 'A 20 GB gzip CSV file is loaded with COPY into a cluster with 8 slices. Why is it slow?',
        opts: [
          { t: 'gzip is a bad compression format for Redshift', fb: 'gzip is fine. The problem is that this is one file.' },
          { t: 'A gzip file is not split, so one slice loads it while the other 7 do nothing', fb: '' },
          { t: 'COPY cannot read files larger than 1 GB', fb: 'It can. 1 GB is the recommended size per file, not a hard limit.' },
          { t: 'The IAM role is too slow', fb: 'The role is checked once. It has no effect on the speed of the load.' }
        ],
        ok: 1, why: 'Each slice loads whole files. One gzip file cannot be split, so one slice does all the work. Cut the data into 8, 16 or 24 files of about the same size, and all slices load at once.'
      }),

      B.quiz({
        id: 'm6-q2', t: 1, src: 'docs',
        q: '`customers` has 400 rows and joins to a large `orders` table in many queries. Which distribution style fits `customers`?',
        opts: [
          { t: 'EVEN', fb: 'Rows of one customer would sit on different slices from his orders, so every join has to move rows.' },
          { t: 'KEY on status', fb: 'Status has a handful of values and has nothing to do with the join.' },
          { t: 'ALL', fb: '' },
          { t: 'No distribution style is needed for a small table', fb: 'Every table has one. AUTO would pick ALL for a table this small.' }
        ],
        ok: 2, why: 'A table of 400 rows costs almost nothing to copy to every node. After that, the join is local on every slice, and EXPLAIN shows `DS_DIST_ALL_NONE`.'
      }),

      B.cmp({
        id: 'm6-explain', t: 2, src: 'docs', title: 'Reading the join label in EXPLAIN',
        say: 'EXPLAIN shows how a join moves data. The label after `Hash Join` tells you. Press Next to read the six labels.',
        cols: ['Label', 'What happens', 'Verdict'],
        hl: 2,
        rows: [
          ['DS_DIST_NONE', 'No data moves. Matching rows are already on the same slice.', 'Good'],
          ['DS_DIST_ALL_NONE', 'No data moves. The inner table has a full copy on every node.', 'Good'],
          ['DS_DIST_INNER', 'The inner table is re-spread to match the outer one.', 'Fine for a small inner table'],
          ['DS_DIST_OUTER', 'The outer table is re-spread to match the inner one.', 'Costly when the outer table is big'],
          ['DS_BCAST_INNER', 'A copy of the whole inner table goes to every node.', 'Fine for a small table, costly for a big one'],
          ['DS_DIST_BOTH', 'Both tables are re-spread by the join column.', 'The most expensive']
        ],
        steps: [
          { upto: 2, say: 'The two good labels. Tables are joined on their distribution keys, or the inner table is a full copy everywhere.' },
          { upto: 4, say: 'One table moves. Look at which one and how big it is.' },
          { upto: 6, say: 'Broadcast and double redistribution. They usually mean that the tables are not joined on their distribution keys.' }
        ],
        pick: 'Read the label for every big join. If you see `DS_BCAST_INNER` or `DS_DIST_BOTH` on a large table, **change a distribution key**, and compare the plans.'
      }),

      B.code({
        id: 'm6-stage', t: 2, src: 'docs', title: 'A load that is safe to repeat', file: 'load_orders.sql', lang: 'sql', code: STAGE,
        steps: [
          { say: 'A daily load as one transaction: stage the file, replace the matching rows, commit. If any step fails, nothing changes. If the job runs twice, the second run replaces the same rows.', lines: null },
          { say: 'A temporary table with the same columns as the target. It lives for the session and collects the new rows.', lines: G.span(STAGE, /CREATE TEMP TABLE/) },
          { say: 'COPY into the staging table, not into the target. A bad file fails here and the target stays clean.', lines: G.span(STAGE, /^COPY/, /^FORMAT/) },
          { say: 'Delete the rows of the target that the new file replaces, and insert the staged rows. Redshift does not enforce primary keys, so this step is what keeps order ids unique.', lines: G.span(STAGE, /^DELETE FROM/, /^SELECT \* FROM/) },
          { say: 'Commit. Readers see the old rows or the new ones, never a mix.', lines: G.span(STAGE, /^COMMIT/) }
        ],
        note: 'Redshift also has a MERGE statement that does the same in one step. Do not put TRUNCATE inside the transaction: the documentation says that TRUNCATE commits the transaction it runs in.'
      }),

      B.order({
        id: 'm6-ord', t: 1, q: 'Put the steps of a safe daily load into Redshift in order.',
        items: [
          'Start a transaction',
          'Create a temporary staging table like the target',
          'COPY the day of files from S3 into the staging table',
          'Delete the target rows that the staging table replaces',
          'Insert the staged rows into the target',
          'Commit, then check the row count against the source'
        ],
        why: 'Stage first, so bad data never touches the target. Replace and insert inside one transaction, so readers never see a half-finished load. Check the count last, because a commit that loaded zero rows still succeeds.'
      }),

      B.code({
        id: 'm6-api', t: 2, src: 'docs', title: 'The Data API: SQL from Python without a driver', file: 'run_sql.py', lang: 'python', code: API,
        steps: [
          { say: 'The Redshift Data API runs SQL over HTTPS. There is no driver, no connection pool and no network path into the cluster. The caller needs IAM permission. This suits Lambda functions and Step Functions.', lines: null },
          { say: 'Submit the statement. `WorkgroupName` selects a Serverless workgroup (a provisioned cluster takes `ClusterIdentifier`). `SecretArn` names a Secrets Manager secret with the database login. The call returns an id and the statement runs in the background.', lines: G.span(API, /sid = rsd/, /\["Id"\]/) },
          { say: 'Poll the status. A statement goes through SUBMITTED, PICKED and STARTED, and ends as FINISHED, FAILED or ABORTED.', lines: G.span(API, /while True/, /time\.sleep/) },
          { say: 'On FAILED, the `Error` field holds the database message. Raise it, so the job fails with the real reason.', lines: G.span(API, /if d\["Status"\] != "FINISHED"/, /raise RuntimeError/) },
          { say: 'A statement without a result set, such as COPY, has `HasResultSet` false. For a query, read the rows with the paginator.', lines: G.span(API, /if not d\["HasResultSet"\]/, /return rows/) }
        ],
        note: 'I checked the operation and parameter names, the statuses and the paginator against the AWS SDK service model. The code did not run against Redshift.'
      }),

      B.bug({
        id: 'm6-bug2', t: 2, src: 'docs', q: 'This script prints an error instead of the counts. Click the line that causes it.',
        file: 'status_counts.py', lang: 'python', code: API_BUG, bad: [3],
        hint: 'What does execute_statement return, and when is the result ready?',
        why: '`execute_statement` returns an id at once, and the statement runs in the background. A result can be read only when the status is FINISHED, so `get_statement_result` on line 3 fails while the statement is still running. Poll `describe_statement` first, as the fix does.',
        fix: API_FIX,
        cheer: 'Submit, poll, then read.'
      }),

      B.code({
        id: 'm6-spectrum', t: 2, src: 'docs', title: 'Spectrum: query the lake from Redshift', file: 'spectrum.sql', lang: 'sql', code: SPECTRUM,
        steps: [
          { say: 'An external schema points at a database in the Glue Data Catalog (mission 4). Every table of that database appears in Redshift as `lake.<table>`. The role needs read access to the catalog and to the S3 files.', lines: G.span(SPECTRUM, /CREATE EXTERNAL SCHEMA/, /IAM_ROLE/) },
          { say: 'Then one query can join a table in the lake with a table in the cluster. The orders stay in S3 as Parquet, and the customers are local.', lines: G.span(SPECTRUM, /^SELECT c\.segment/, /^JOIN/) },
          { say: 'The filter on the partition column limits the S3 folders that Spectrum reads, as in Athena. Spectrum bills by the bytes it scans in S3, so the lessons of mission 5 apply.', lines: G.span(SPECTRUM, /WHERE o\.dt/) }
        ],
        note: 'The statements follow the documentation and were not run on Redshift.'
      }),

      B.cmp({
        id: 'm6-where', t: 2, src: 'docs', title: 'Load it, or leave it in the lake?',
        say: 'Spectrum, loading with COPY and Athena can all answer the same question. Press Next to compare them.',
        cols: ['Question', 'Load into Redshift', 'Spectrum', 'Athena'],
        hl: 1,
        rows: [
          ['Where is the data?', 'In the cluster, in Redshift format', 'In S3', 'In S3'],
          ['How is it billed?', 'Capacity', 'Capacity for the cluster, plus bytes scanned in S3', 'Bytes scanned'],
          ['Speed for repeated queries', 'Fastest, with keys and caching', 'Slower: every query reads S3', 'Slower: every query reads S3'],
          ['Best for', 'Hot tables that many users query all day', 'Big, rarely used history that you still want to join to hot tables', 'Ad hoc work and ELT, without a cluster']
        ],
        steps: [
          { upto: 2, say: 'Where the data lives, and what each query costs.' },
          { upto: 4, say: 'Speed and fit. Load what is hot. Leave the cold history in the lake.' }
        ],
        pick: 'Load the **last months of data** that dashboards use all day, keep **older history in S3** as Parquet, and join both with Spectrum when a question needs it.'
      }),

      B.cmp({
        id: 'm6-maint', t: 2, src: 'docs', title: 'What Redshift maintains, and what you still check',
        say: 'Redshift does a lot of upkeep in the background. Press Next to read what it does and what is still your job.',
        cols: ['Area', 'Redshift does', 'You check'],
        hl: 2,
        rows: [
          ['Deleted rows', 'Deleting marks rows as removed. Automatic vacuum delete reclaims the space when the cluster is quiet.', 'The `unsorted` column of SVV_TABLE_INFO after big deletes or updates.'],
          ['Statistics', 'Automatic analyze updates the statistics the planner uses.', 'The `stats_off` column. A high value means the plan may be poor.'],
          ['Keys', 'Automatic table optimization can apply distribution and sort keys that suit the workload.', 'The `diststyle` and `sortkey1` columns, and the join labels in EXPLAIN.'],
          ['Queues and bursts', 'Automatic workload management sizes the queues. Concurrency scaling adds clusters for read bursts.', 'Queue time, and whether long jobs slow the dashboards.'],
          ['Repeated queries', 'A materialized view stores the result of a query and can refresh itself.', 'That the view is fresh enough and the refresh does not run for hours.']
        ],
        steps: [
          { upto: 2, say: 'Space and statistics.' },
          { upto: 4, say: 'Keys and queues.' },
          { upto: 5, say: 'Materialized views for queries that run again and again.' }
        ],
        pick: 'Trust the automatic upkeep, **and look at SVV_TABLE_INFO once a week**. A table with a high `skew_rows`, `unsorted` or `stats_off` explains most slow dashboards.'
      }),

      B.code({
        id: 'm6-diag', t: 2, src: 'docs', title: 'Two queries to keep', file: 'diagnose.sql', lang: 'sql', code: DIAG,
        steps: [
          { say: 'The first query lists the tables of a schema with the numbers that explain most performance problems. The second shows the latest load errors.', lines: null },
          { say: '`skew_rows` is the ratio of the rows on the fullest slice to the rows on the emptiest slice. Near 1 is healthy. A high value points at a bad distribution key.', lines: G.span(DIAG, /skew_rows/) },
          { say: '`unsorted` is the percentage of rows outside the sort order, and `stats_off` says how out of date the statistics are. `diststyle` and `sortkey1` show the keys in use.', lines: G.span(DIAG, /FROM svv_table_info/, /ORDER BY size/) },
          { say: 'When COPY fails with "Load into table failed. Check stl_load_errors", this query shows the file, the line, the column and the reason. Serverless exposes the same detail in `sys_load_error_detail`.', lines: G.span(DIAG, /FROM stl_load_errors/, /LIMIT 5/) }
        ],
        note: 'Column and view names follow the Redshift documentation and were not run on Redshift. The verifier parses both statements.'
      }),

      B.quiz({
        id: 'm6-q3', t: 2, src: 'docs',
        q: 'Analysts query from 8 to 18 on workdays, 22 days a month. A nightly load runs for 1 hour on 30 nights. At most 250 hours of compute a month are in use. At $0.375 for each RPU-hour and 8 RPUs, what is the most that Serverless costs for compute?',
        opts: [
          { t: '$75', fb: 'That is 250 hours at 1 RPU. The workgroup has 8.' },
          { t: '$750', fb: '' },
          { t: '$2,190', fb: 'That is 8 RPUs for all 730 hours of the month. Serverless bills only while queries run.' },
          { t: '$7,500', fb: 'Ten times too high. 250 x 8 x 0.375 is $750.' }
        ],
        ok: 1, why: '250 hours x 8 RPUs = 2,000 RPU-hours. At $0.375 that is $750 at most, and less when queries run for only part of those hours. Two ra3.4xlarge nodes at $3.26 an hour for 730 hours would cost about $4,760 without pausing.'
      }),

      B.quiz({
        id: 'm6-q4', t: 2, src: 'docs',
        q: 'A load inserts the same order id twice in `mart.fct_orders`, which has a PRIMARY KEY on `order_id`. What does Redshift do?',
        opts: [
          { t: 'Rejects the second row with a unique violation', fb: 'Redshift does not enforce primary keys.' },
          { t: 'Accepts both rows, because the key is only information for the planner', fb: '' },
          { t: 'Keeps only the newest row', fb: 'It keeps both rows. Removing duplicates is the job of your load.' },
          { t: 'Fails the whole COPY', fb: 'A key violation does not fail anything. Redshift does not check it.' }
        ],
        ok: 1, why: 'Redshift treats primary key, foreign key and unique constraints as information for the planner, and does not enforce them. NOT NULL is enforced. Keep keys unique with a staging table and a delete-then-insert or MERGE, and test uniqueness after the load.'
      }),

      B.decide({
        id: 'm6-dec', t: 2, src: 'docs', title: 'Decision: how do you run the Brewline marts?',
        scenario: 'The marts hold **500 GB**. **40 analysts** run dashboards from 8 to 18 on workdays (about 220 hours a month). A **1 hour load** runs every night. Nobody on the team has run a Redshift cluster before. The prices are examples: $3.26 an hour for one ra3.4xlarge node and $0.375 for each RPU-hour.',
        opts: [
          { t: 'A provisioned cluster of 2 ra3.4xlarge nodes, always on', d: 'Fixed performance. About $4,760 a month for compute.', lose: 'The cluster is used about a third of the time and billed for all of it, and the team has to size, resize and watch it.' },
          { t: 'Redshift Serverless with a base capacity of 8 RPUs and a maximum', d: 'At most about $750 a month for compute, less when queries are short.' },
          { t: 'A provisioned cluster, paused outside working hours by a schedule', d: 'About $1,630 for 250 hours of 2 nodes.', lose: 'Cheaper than always on, but you now run a cluster and the automation that pauses it, and resume takes time before the first query.' }
        ],
        pick: 1,
        why: 'The load is uneven and small, and the team is new to Redshift. Serverless bills while queries run, and it needs no sizing work. A maximum capacity limits the worst month.',
        when: 'Choose provisioned when the load is steady around the clock and a reserved price beats the RPU-hours, or when you need a node type or setting that Serverless does not offer. Re-check the numbers every quarter. The break-even point moves with usage.'
      }),

      B.incident({
        id: 'm6-inc', t: 2, src: 'docs', title: 'Incident: one step runs 40 minutes and the cluster is idle', time: '10:30',
        alert: '**The revenue dashboard takes 40 minutes to load, and the cluster shows low CPU on most slices and one slice at 100 %.** The query is the same as last month. After the guest checkout launched, many orders carry the customer id `C-0000`. `mart.fct_orders` uses `DISTKEY (customer_id)`.',
        clues: ['`skew_rows` of the table in SVV_TABLE_INFO is 14', 'About 38 % of the new orders have the customer id `C-0000`', 'EXPLAIN shows no redistribution'],
        opts: [
          { t: 'Change the distribution style so that guest orders spread out, for example to EVEN or to KEY on order_id, and reload', fb: '' },
          { t: 'Add nodes to the cluster', fb: 'More nodes add more slices, and the 38 % that share one key still go to one slice. The skew stays.' },
          { t: 'Run VACUUM and ANALYZE on the table', fb: 'They fix sort order and statistics. The problem is where the rows live.' },
          { t: 'Add an interleaved sort key', fb: 'The sort key does not change which slice holds the rows.' }
        ],
        best: 0,
        why: 'Every row with `C-0000` hashes to the same slice, and that slice holds 38 % of the table while the other slices share the rest. The query finishes only when that slice does. Spread the rows with EVEN or with a key that has many values, such as `order_id`, and reload the table.',
        checks: [
          ['Read the table stats', '`skew_rows` of 14 says the fullest slice holds 14 times the rows of the emptiest one.'],
          ['Find the dominant value', 'A count by `customer_id` shows `C-0000` with 38 % of the rows.'],
          ['Check the plan', 'EXPLAIN has no redistribution step, so the join is not the problem.'],
          ['Change the style', 'Use EVEN, or a key with many values. For a customer join, use ALL on the dimension.'],
          ['Prevent it', 'Treat guest checkout as NULL or a unique key, and alert on `skew_rows` above 3.']
        ],
        tell: 'The dashboard went from seconds to 40 minutes after guest checkout launched. About 38 % of the orders carry the customer id C-0000, and the table was distributed by customer_id, so one slice held that share and ran at 100 % while the others idled. SVV_TABLE_INFO showed a skew of 14. I switched the table to an even distribution, reloaded it, and the query went back to its old time. We now alert when skew_rows passes 3, and guest orders no longer share one key.',
        prevent: ['Check **skew_rows** after changes to the data', 'Do not use a **placeholder value** as a distribution key', 'Alert when **skew_rows passes 3**', 'Review the **distribution key** when a new channel changes the data']
      }),

      B.incident({
        id: 'm6-inc2', t: 2, src: 'docs', title: 'Incident: the nightly COPY fails', time: '04:05',
        alert: '**The nightly load stopped with: Load into table \'stage_orders\' failed. Check \'stl_load_errors\' system table for details.** The files arrived on time. Nothing changed in the job. The target table was not touched.',
        clues: ['`stl_load_errors` shows the column `status` and the reason: String length exceeds DDL length', 'The new value is `CANCELLED_BY_CUSTOMER`, 21 characters', 'The column is `varchar(12)` in the staging table, which copies the target'],
        opts: [
          { t: 'Widen the column in the target and the staging table, rerun the load, and add a check on the length of new values', fb: '' },
          { t: 'Set MAXERROR high so COPY skips the bad rows', fb: 'The orders with the new status would disappear without anyone knowing. A silent skip is worse than a failed load.' },
          { t: 'Truncate the new status to 12 characters in the file', fb: 'It hides a new business value and breaks reports that group by status.' },
          { t: 'Resize the cluster', fb: 'The error is about a column length. Capacity does not matter.' }
        ],
        best: 0,
        why: 'The source added a status value that is longer than the column. Because the load goes through a staging table in one transaction, the target stayed clean. Widen the column (Redshift allows a larger VARCHAR), rerun the load, and keep the rule that a load that cannot take a value stops.',
        checks: [
          ['Read the message', 'It points at `stl_load_errors`.'],
          ['Query the table', 'The row shows the file, the line, the column `status` and the reason.'],
          ['Compare with the DDL', '`varchar(12)` cannot hold 21 characters.'],
          ['Fix the column', 'Widen it in the target and the staging definition, then rerun.'],
          ['Prevent it', 'Tell the source team about the new value, and check lengths in the clean zone before the load.']
        ],
        tell: 'The nightly COPY failed on a string length error. The load errors table showed that a new status value, CANCELLED_BY_CUSTOMER, is 21 characters and the column was varchar(12). The target table was untouched, because we load into a staging table inside a transaction. I widened the column, reran the load, and checked the row counts against the source. We also added a length check on the clean zone, and we keep MAXERROR at zero so a bad value stops the load.',
        prevent: ['Load through a **staging table** in one transaction', 'Keep **MAXERROR at zero**', 'Check **value lengths and new values** in the clean zone', 'Tell the **source team** about the new status and keep a data contract']
      }),

      B.talk({
        id: 'm6-share', t: 3, src: 'docs', title: 'Sharing, zero-ETL and streaming',
        say: 'Four features that change how data reaches Redshift. Press Next to read what each one is for.',
        items: [
          ['Data sharing', 'A producer cluster or workgroup shares live tables with consumers in the same account or in other accounts. The consumer reads the producer data with no copy and no load job, and sees changes as they commit. Each side pays for its own compute.', 'Share data, not files.'],
          ['Zero-ETL integrations', 'AWS can replicate an operational database such as Aurora into Redshift continuously, without a pipeline that you write. Check the list of supported sources and the limits for your engine before you design around it.', 'Replication as a managed feature.'],
          ['Streaming ingestion', 'A materialized view over a Kinesis data stream or an MSK topic reads records straight into Redshift, with no S3 step in between. It suits data that has to be queryable within seconds.', 'Records land in a table within seconds.'],
          ['Federated queries', 'Redshift can query an RDS or Aurora PostgreSQL or MySQL database in place, for a small lookup that does not justify a load.', 'Query the source, once.']
        ],
        cols: 1
      }),

      B.qa({
        id: 'qa-redshift', t: 1, tag: 'Redshift', secs: 60,
        q: 'What is Amazon Redshift, and how does it work?',
        pts: ['A columnar, parallel data warehouse', 'A leader node plans, compute nodes run in parallel on slices', 'RA3 managed storage backed by S3, or Serverless in RPUs', 'COPY loads from S3, Spectrum queries S3', 'Distribution and sort keys decide the speed', 'You pay for capacity, not for bytes scanned'],
        short: 'Redshift is a columnar, massively parallel data warehouse. A leader node parses and plans each query. Compute nodes run it in parallel, and each node divides its work over slices. Tables are stored by column and compressed, so a query reads only the columns it names.\n\nI can run it as a provisioned cluster, where RA3 nodes keep data in managed storage backed by S3, or as Redshift Serverless, which bills for RPU-hours while queries run.\n\nData comes in with COPY from S3, which loads files in parallel. Spectrum lets the same SQL read files that stay in the lake. Distribution keys decide which slice holds which rows, and sort keys decide the stored order, so they decide how much data moves and how many blocks are read.\n\nAthena bills the bytes it scans. Redshift bills capacity, which fits many users who run repeated queries against the same tables.',
        fu: [
          ['What is a slice?', 'A share of the memory and disk of a node. Each slice processes its part of the data in parallel. A node has a fixed number of slices, for example 2 on an ra3.xlplus.'],
          ['Why is a columnar store good for analytics?', 'A query reads only the columns it names, and similar values in one column compress well.']
        ],
        trap: 'Calling Redshift a Postgres database. The SQL looks alike, but its tables are spread over slices and tuned with keys.',
        real: 'Describe the largest table you tuned in a warehouse, and how.'
      }),

      B.qa({
        id: 'qa-diststyle', t: 1, tag: 'Redshift', secs: 90,
        q: 'What are distribution styles and sort keys, and how do you choose them?',
        pts: ['AUTO is the default and a fine start', 'KEY on the join column for two big tables', 'ALL for small dimension tables', 'EVEN when no join dominates', 'Avoid keys with few values or a dominant value', 'Sort key on the column used in range filters, usually time'],
        short: 'A distribution style decides which slice stores each row. KEY hashes a column, so rows with the same value land together. ALL keeps a full copy on every node. EVEN deals rows out in turn. AUTO lets Redshift choose and change the style as the table grows. It is the default I start with.\n\nI choose by the joins. If two big tables are joined on the same column, I use KEY on that column for both, and the join needs no data movement. A small dimension gets ALL. Otherwise EVEN or AUTO.\n\nThe key needs many different values and no dominant one. A key on status has 3 values, so at most 3 slices hold data, and in my test data 90 % of the orders have one status.\n\nA sort key sets the stored order. Redshift keeps the smallest and largest value of each block, so a filter on the sort key skips blocks. I use a compound key that starts with the column used most in range filters, usually the timestamp.\n\nI check the result in EXPLAIN and in SVV_TABLE_INFO.',
        fu: [
          ['What does DS_BCAST_INNER tell you?', 'The inner table is copied to every node for the join. It is fine for a small table and costly for a big one. It usually means the tables are not joined on their distribution keys.'],
          ['Compound or interleaved?', 'Compound for most tables. Interleaved gives equal weight to several columns but costs more to maintain.']
        ],
        trap: 'Picking a key by habit. A key is right only for the joins your queries run.',
        real: 'Describe a table where you changed a distribution or sort key, and what improved.'
      }),

      B.qa({
        id: 'qa-copy', t: 1, tag: 'Redshift', secs: 60,
        q: 'How do you load data into Redshift efficiently and safely?',
        pts: ['COPY from S3, never row-by-row INSERT', 'Many files of equal size, a multiple of the slice count', 'Parquet or compressed files, 1 MB to 1 GB', 'One COPY for a table, with a prefix or manifest', 'Staging table, then delete-and-insert in one transaction', 'Check the load error tables'],
        short: 'I use COPY from S3. It loads files in parallel, one file per slice at a time, so I cut the data into many files of about equal size, between 1 MB and 1 GB after compression, and with a count that is a multiple of the slices. One big gzip file is loaded by a single slice.\n\nI use Parquet when I can, give COPY an explicit column list, and run one COPY for a table with a prefix or a manifest.\n\nFor daily loads I copy into a temporary staging table inside a transaction, delete the target rows that the staging rows replace, insert the staged rows and commit. A bad file fails in staging and the target stays clean, and a repeated run gives the same result. I need this because Redshift does not enforce primary keys.\n\nIf a load fails, I read stl_load_errors for the file, line, column and reason. I keep MAXERROR at zero so bad data stops the job.',
        fu: [
          ['Why not INSERT row by row?', 'Each INSERT goes through the leader node, so it is far slower than COPY, which loads in parallel from S3.'],
          ['Why not TRUNCATE in the transaction?', 'TRUNCATE commits the transaction it runs in, so the rest of the load can no longer be rolled back.']
        ],
        trap: 'Saying COPY is fast and stopping there. The speed comes from the number and size of the files.',
        real: 'Describe a load that you made faster or safer, with the numbers.'
      }),

      B.qa({
        id: 'qa-spectrum', t: 2, tag: 'Redshift', secs: 90,
        q: 'When do you use Redshift Spectrum instead of loading data?',
        pts: ['Spectrum reads Parquet in S3 through the Glue Data Catalog', 'Billed by bytes scanned in S3, on top of the cluster', 'Slower than local tables for repeated queries', 'Good for big, cold history', 'Join lake tables with hot local tables', 'Partition and use Parquet, as in Athena'],
        short: 'Spectrum lets Redshift query files in S3 through an external schema on the Glue Data Catalog, with no load step. It bills by the bytes it scans in S3, in addition to the cluster.\n\nEvery query reads S3, so it is slower than a local table and its cost grows with scans. I use it for big, rarely used history, for example orders older than 12 months, and for new data that I want to see before a load job exists.\n\nThe hot data, which dashboards use all day, I load into Redshift with the right keys. One query can then join a local table with a lake table.\n\nThe lessons of Athena apply: Parquet, partitions, and a filter on the partition column. Without them every query scans the whole history.\n\nIf almost all queries run on the lake and nobody needs a warehouse, Athena alone is simpler and has no cluster to pay for.',
        fu: [
          ['Spectrum or Athena for lake queries?', 'If a Redshift cluster already exists and the queries join lake data with local tables, Spectrum. For lake-only work, Athena.'],
          ['What do you tune?', 'The file format, partitioning and file sizes, and a filter on the partition column.']
        ],
        trap: 'Using Spectrum for the hottest tables. Every query pays the S3 read.',
        real: 'Describe a table you kept in the lake while its dashboard stayed in Redshift.'
      }),

      B.qa({
        id: 'qa-serverless', t: 2, tag: 'Redshift', secs: 60,
        q: 'Redshift Serverless or a provisioned cluster?',
        pts: ['Serverless bills RPU-hours while queries run', 'Provisioned bills node-hours until paused', 'Uneven load fits Serverless', 'Steady 24 hour load and reserved nodes fit provisioned', 'Set a maximum capacity in Serverless', 'Re-check the numbers every quarter'],
        short: 'It depends on the shape of the load. Redshift Serverless bills RPU-hours by the second while queries run, so an idle warehouse costs nothing for compute. I set a base capacity and a maximum, which limits the worst month.\n\nA provisioned cluster bills node-hours until I pause it. It fits a steady load around the clock, where reserved nodes bring the price down, and it gives me the choice of node types.\n\nI compare with numbers. Take 8 RPUs for at most 250 hours a month at $0.375: $750. Two ra3.4xlarge nodes at $3.26 an hour for 730 hours: about $4,760. For a team with uneven load and no Redshift expert, Serverless wins. For a platform with steady heavy load, provisioned with reserved pricing often wins.\n\nI re-check every quarter, because usage and prices move. Both keep data in managed storage that bills by the GB-month.',
        fu: [
          ['What is an RPU?', 'A Redshift Processing Unit, the unit of Serverless capacity. A workgroup has a base capacity in RPUs.'],
          ['Can a provisioned cluster pause?', 'Yes. Compute billing stops while it is paused and storage keeps billing. Resume takes a few minutes.']
        ],
        trap: 'Choosing Serverless as always cheaper. A steady load can cost more in RPU-hours than a reserved cluster.',
        real: 'Describe a warehouse whose pricing model you changed, with the numbers.'
      }),

      B.qa({
        id: 'qa-slow', t: 2, tag: 'Redshift', secs: 90,
        q: 'A Redshift query is slow. How do you find out why?',
        pts: ['EXPLAIN: join labels such as DS_BCAST_INNER or DS_DIST_BOTH', 'SVV_TABLE_INFO: skew_rows, unsorted, stats_off', 'Is the query waiting in a queue?', 'Does the filter use the sort key?', 'Check the distribution key for skew', 'Fix keys first, then materialized views or concurrency scaling'],
        short: 'I start with EXPLAIN. A join label of DS_BCAST_INNER or DS_DIST_BOTH on a big table means data moves because the tables are not joined on their distribution keys.\n\nThen I look at the tables in SVV_TABLE_INFO. A high skew_rows points at a bad distribution key, a high unsorted value means the sort order has degraded, and a high stats_off means that the planner works with old statistics.\n\nI check whether the query waited. If most of the time is queue time, the fix is workload management or concurrency scaling, not the query.\n\nI also check that the filter uses the leading column of the sort key, since otherwise every block is read.\n\nI fix the keys first. For queries that run again and again, I add a materialized view. I measure the time before and after, and I only keep a change that the numbers support.',
        fu: [
          ['What is skew?', 'Uneven rows on the slices. The query finishes when the slowest slice does, so one overloaded slice makes the whole query slow.'],
          ['What do you do about a table that was deleted from heavily?', 'Let automatic vacuum run, or run VACUUM when the unsorted value is high, then check again.']
        ],
        trap: 'Adding nodes first. If the problem is skew or data movement, more nodes do not help.',
        real: 'Describe the slowest query you fixed and what the cause was.'
      }),

      B.qa({
        id: 'qa-sharing', t: 3, tag: 'Redshift', secs: 90,
        q: 'How do you share data between teams and accounts in Redshift, and what is zero-ETL?',
        pts: ['Data sharing: live, read access, no copy', 'Each side pays for its own compute', 'Works across clusters, workgroups and accounts', 'Zero-ETL: managed replication from Aurora and other sources', 'Streaming ingestion from Kinesis and MSK', 'Governance: who owns the data, and which share is documented'],
        short: 'Data sharing lets a producer cluster or workgroup share live tables with consumers in the same account or in other accounts. Consumers read the data with no copy and no load job, and they see changes as soon as they commit. Each side pays for its own compute, so a heavy team cannot slow the producer.\n\nI use it so that one team owns each table, and other teams read it. I keep a list of shares and who uses them.\n\nZero-ETL integrations replicate an operational database such as Aurora into Redshift continuously, with no pipeline to run. I check the supported sources and the limits first, and I still test lag and schema changes.\n\nStreaming ingestion reads a Kinesis stream or an MSK topic into a materialized view for data that must be queryable within seconds.\n\nThe risk of all three is the same: more consumers on data that nobody documents. So each shared table needs an owner and a contract.',
        fu: [
          ['What does a consumer see when the producer changes a table?', 'The change, as soon as the producer commits it. The share is live, not a snapshot.'],
          ['When would you still use COPY?', 'For files from outside AWS, for batch exports from partners, and when I want a copy that does not depend on another team.']
        ],
        trap: 'Treating a share as free. The consumer queries the producer data, so a schema change by the producer can break the consumer.',
        real: 'Describe how two teams shared a table and who owned it.'
      }),

      B.recap({
        id: 'm6-recap', n: 6, badge: 'Warehouse Planner', color: '#C7D2FE',
        pts: [
          'A **leader node** plans, **compute nodes** run on **slices**. **Serverless** bills RPU-hours while queries run, **provisioned** bills node-hours.',
          'A **distribution key** needs many values and no dominant one. In the recorded orders **' + num(SHARE) + ' %** are COMPLETED, so `status` is a bad key.',
          'Read the **join label** in EXPLAIN. `DS_BCAST_INNER` and `DS_DIST_BOTH` on a big table mean the tables are not joined on their distribution keys.',
          '**COPY** needs many files of equal size, a multiple of the slice count. Load through a **staging table** in one transaction.',
          'Redshift does **not enforce primary keys**. Your load keeps ids unique.',
          '**Spectrum** reads the lake, **data sharing** shares live data, and **SVV_TABLE_INFO** shows skew, unsorted rows and stale statistics.'
        ],
        lines: [
          'I choose a key by the joins my queries run.',
          'I load into a staging table, inside a transaction.',
          'I read skew_rows before I add nodes.'
        ]
      })
    ]
  });
})();
