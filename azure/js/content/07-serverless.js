/* Mission 7: Synapse serverless SQL. Query files in the lake with T-SQL, and pay for the data processed.
   The file layouts, the bytes in each column, the row-group statistics and the files that each wildcard opens were recorded on real Parquet files
   (written with DuckDB, read with pyarrow). The monthly totals are the result of DuckDB on the same files, because Synapse was not available.
   The T-SQL, the billing rules and the limits come from the Azure documentation, and nothing here ran on Synapse. */
(function () {
  var B = LAB.b, G = LAB.get;
  var L = G.counts('synapse.layouts'), P = G.counts('synapse.prune').cases, CB = G.counts('synapse.columns'), RG = G.counts('synapse.rowgroups'), BM = G.table('synapse.by_month');
  function pc(id) { return P.filter(function (c) { return c.id === id; })[0]; }
  function mb(b, d) { return (b / 1e6).toFixed(d === undefined ? 1 : d) + ' MB'; }
  function n0(n) { return Number(n).toLocaleString('en-US'); }
  function pct(a, b) { return (a / b * 100).toFixed(1) + '%'; }
  var BYC = CB.bytes_by_column, COLNAMES = Object.keys(BYC).sort(function (a, b) { return BYC[b] - BYC[a]; });
  var COLTOTAL = COLNAMES.reduce(function (a, k) { return a + BYC[k]; }, 0), TWO = BYC.order_date + BYC.total_eur;
  var MARCH = BM.rows.filter(function (r) { return r[0] === '2026-03'; })[0];

  G.expect(L.hive.files === 60 && L.flat.files === 60 && L.one.files === 1 && L.one.row_groups === 6 && L.rows === 600000, 'sixty daily files in two layouts, and one sorted file of 600,000 orders in 6 row groups');
  G.expect(pc('p1').files === 60 && pc('p2').files === 14 && pc('p3').files === 14 && pc('p4').files === 3 && pc('p5').files === 1 && pc('p8').files === 1, 'the wildcard cases open 60, 14, 14, 3, 1 and 1 files');
  G.expect(pc('p2').rows === 139566 && MARCH && MARCH[1] === 139566, 'March has 139,566 orders');
  G.expect(BM.rows.length === 3 && BM.rows.reduce(function (a, r) { return a + r[1]; }, 0) === 600000, 'three months and 600,000 orders');
  G.expect(TWO === pc('p8').bytes_of_two_columns && Object.keys(BYC).length === 11, 'two of eleven columns take 606,828 bytes');
  G.expect(RG.groups.length === 6 && RG.groups_that_can_hold_the_day === 1 && RG.day === '2026-03-14', 'one of six row groups can hold 14 March');
  G.expect(pc('p3').filepath_values['1'].length === 14 && pc('p3').wildcards === 2, 'with the month written in the path, filepath(1) is the day');

  var URL = "https://stbrewlinelakeprod.dfs.core.windows.net/curated/orders_hive/year=*/month=*/day=*/*.parquet";

  var OPEN_SQL = [
    "SELECT r.filepath(1) + '-' + r.filepath(2)                           AS order_month,",
    '       COUNT(*)                                                      AS orders,',
    "       SUM(CASE WHEN r.status <> 'CANCELLED' THEN r.total_eur END)   AS revenue_eur",
    'FROM OPENROWSET(',
    "        BULK '" + URL + "',",
    "        FORMAT = 'PARQUET'",
    '     ) AS r',
    'GROUP BY r.filepath(1), r.filepath(2)',
    'ORDER BY order_month;'
  ].join('\n');

  var FILTER_SQL = [
    'SELECT COUNT(*)                                                      AS orders,',
    "       SUM(CASE WHEN r.status <> 'CANCELLED' THEN r.total_eur END)   AS revenue_eur",
    'FROM OPENROWSET(',
    "        BULK '" + URL + "',",
    "        FORMAT = 'PARQUET'",
    '     ) AS r',
    "WHERE r.filepath(2) = '03';"
  ].join('\n');

  var DS_SQL = [
    'CREATE DATABASE brewline_lake COLLATE Latin1_General_100_BIN2_UTF8;',
    'GO',
    'USE brewline_lake;',
    'GO',
    '',
    'CREATE EXTERNAL DATA SOURCE curated',
    "WITH (LOCATION = 'https://stbrewlinelakeprod.dfs.core.windows.net/curated');",
    'GO',
    '',
    'CREATE VIEW dbo.orders AS',
    'SELECT r.filepath(1) AS order_year,',
    '       r.filepath(2) AS order_month,',
    '       r.filepath(3) AS order_day,',
    '       r.order_id, r.order_date, r.status, r.total_eur',
    'FROM OPENROWSET(',
    "        BULK 'orders_hive/year=*/month=*/day=*/*.parquet',",
    "        DATA_SOURCE = 'curated',",
    "        FORMAT = 'PARQUET'",
    '     )',
    '     WITH (',
    '        order_id   BIGINT,',
    '        order_date DATE,',
    '        status     VARCHAR(20),',
    '        total_eur  FLOAT',
    '     ) AS r;'
  ].join('\n');

  var MI_SQL = [
    "CREATE MASTER KEY ENCRYPTION BY PASSWORD = '<a long password, kept in Key Vault>';",
    '',
    'CREATE DATABASE SCOPED CREDENTIAL workspace_identity',
    "WITH IDENTITY = 'Managed Identity';",
    '',
    'CREATE EXTERNAL DATA SOURCE curated_mi',
    'WITH (',
    "    LOCATION   = 'https://stbrewlinelakeprod.dfs.core.windows.net/curated',",
    '    CREDENTIAL = workspace_identity',
    ');'
  ].join('\n');

  var CTAS_SQL = [
    'CREATE EXTERNAL FILE FORMAT parquet_snappy',
    "WITH (FORMAT_TYPE = PARQUET, DATA_COMPRESSION = 'org.apache.hadoop.io.compress.SnappyCodec');",
    '',
    'CREATE EXTERNAL TABLE dbo.daily_revenue',
    'WITH (',
    "    LOCATION    = 'gold/daily_revenue/',",
    '    DATA_SOURCE = curated_mi,',
    '    FILE_FORMAT = parquet_snappy',
    ')',
    'AS',
    'SELECT r.order_date,',
    '       COUNT(*)         AS orders,',
    '       SUM(r.total_eur) AS revenue_eur',
    'FROM OPENROWSET(',
    "        BULK 'orders_hive/year=*/month=*/day=*/*.parquet',",
    "        DATA_SOURCE = 'curated_mi',",
    "        FORMAT = 'PARQUET'",
    '     ) AS r',
    'GROUP BY r.order_date;'
  ].join('\n');

  var LIMIT_SQL = [
    '-- stop new queries after 1 TB in a day and 10 TB in a month',
    "EXEC sp_set_data_processed_limit @type = N'daily',   @limit_tb = 1;",
    "EXEC sp_set_data_processed_limit @type = N'monthly', @limit_tb = 10;",
    '',
    '-- how much has been processed in each period so far',
    'SELECT * FROM sys.dm_external_data_processed;'
  ].join('\n');

  var BUG_FILTER = [
    'SELECT COUNT(*) AS orders',
    'FROM OPENROWSET(',
    "        BULK '" + URL + "',",
    "        FORMAT = 'PARQUET') AS r",
    "WHERE r.order_date >= '2026-03-01';"
  ].join('\n');
  var FIX_FILTER = BUG_FILTER.replace('year=*/month=*/day=*', 'year=2026/month=03/day=*').replace("WHERE r.order_date >= '2026-03-01';", "WHERE r.order_date >= '2026-03-01';");

  var BUG_DB = [
    'CREATE DATABASE brewline_lake;',
    'GO',
    'USE brewline_lake;',
    'SELECT TOP 10 status FROM OPENROWSET(BULK \'orders_hive/*/*/*/*.parquet\', DATA_SOURCE = \'curated\', FORMAT = \'PARQUET\') AS r;'
  ].join('\n');
  var FIX_DB = BUG_DB.replace('CREATE DATABASE brewline_lake;', 'CREATE DATABASE brewline_lake COLLATE Latin1_General_100_BIN2_UTF8;');

  var CH_SQL = [
    'SELECT r.filepath(1)                                                 AS order_month,',
    '       COUNT(*)                                                      AS orders,',
    "       SUM(CASE WHEN r.status <> 'CANCELLED' THEN r.total_eur END)   AS revenue_eur",
    'FROM OPENROWSET(',
    "        BULK 'https://stbrewlinelakeprod.dfs.core.windows.net/curated/orders_hive/year=2026/month=*/day=*/*.parquet',",
    "        FORMAT = 'PARQUET'",
    '     ) AS r',
    'GROUP BY r.filepath(1)',
    'ORDER BY order_month;'
  ].join('\n');

  LAB.addChapter({
    id: 'm7', n: 7, title: 'Synapse serverless SQL', short: 'Synapse serverless', blurb: 'T-SQL on files in the lake, what a query bills, and the layouts that keep it cheap', minutes: 50,
    focus: ['mart', 'con', 'air'],
    goals: [
      'Say what a **serverless SQL pool** is, and what it can and cannot do.',
      'Query Parquet files with **OPENROWSET**, a data source and a view.',
      'Predict how many files a **wildcard** opens, and use **filepath()** to skip folders.',
      'Explain how the bill works: **data processed**, columns, formats, the **10 MB minimum** and budgets.',
      'Choose a **file layout**, a **collation** and a **sign-in** for the pool.',
      'Build a small table with **CETAS** and know when Synapse is the wrong tool.'
    ],
    say: 'Mission 7 is the cheapest way I know to put SQL on a lake, and the easiest to make expensive. I wrote 600,000 orders as real Parquet files in three layouts and counted what a query opens and reads: which files each wildcard matches, how many bytes each column takes, what the statistics say. Those numbers are recorded. The billing rules and the T-SQL come from the Azure documentation, and the screens say so.',
    scenes: [
      B.flow({
        id: 'm7-workspace', t: 1, src: 'docs', title: 'A Synapse workspace: three engines on one lake', g: 'synapse', legend: true,
        steps: [
          { say: 'A Synapse workspace puts several engines beside one lake. Brewline has one workspace, syn-brewline-prod. Press Next to see which engine does what.', cap: 'One workspace, three engines.' },
          { say: 'Step 1. People and tools connect with T-SQL as an Entra identity: Power BI, SQL Server Management Studio, an app. The serverless SQL pool takes the connection, and so does a dedicated pool if you created one.', on: ['y1', 'y1b'], focus: ['cl', 'sv', 'dd'], cap: 'Clients speak T-SQL.' },
          { say: 'Step 2. The serverless SQL pool has no storage of its own. A query names files in the lake, and the pool reads them there, as the identity that you set up. You pay for the data that the query processes, and nothing while no query runs.', on: ['y2'], focus: ['lk', 'sv'], cap: 'Serverless reads files in place.' },
          { say: 'Step 3. A dedicated SQL pool is a different design. COPY INTO loads the files into its own storage, spread over 60 distributions, and you pay for the pool for every hour it is on. Mission 8 is about it.', on: ['y3'], focus: ['lk', 'dd'], cap: 'Dedicated loads a copy.' },
          { say: 'Step 4. A Spark pool reads and writes the same lake with notebooks and jobs. That was the work of mission 6.', on: ['y4'], focus: ['sp', 'lk'], cap: 'Spark shares the lake.' },
          { say: 'One more fact for planning. Microsoft has said that new investment goes to Fabric, so read its current guidance before you start a new platform. The skills carry over: T-SQL on files in a lake is also how the SQL endpoint of a Fabric lakehouse works.', focus: ['cl', 'sv', 'dd', 'sp', 'lk'], tags: ['tg_fab'], cap: 'Check where the product is going.' }
        ]
      }),

      B.sql({
        id: 'm7-openrowset', t: 1, src: 'rec', title: 'Your first query on files', file: 'worksheet: orders_by_month.sql', code: OPEN_SQL,
        ctx: { role: 'Entra ID: brewline-analyst', wh: 'Synapse serverless SQL', db: 'master' },
        steps: [
          { say: 'This is a complete query on the Brewline orders. There is no table and no load step. The data is a folder of Parquet files in the lake. Press Next to go through it.', lines: null },
          { say: '`OPENROWSET` is what makes files look like a table. `BULK` takes the address of the files, and `FORMAT` says how to read them. The wildcards match every day folder.', lines: G.span(OPEN_SQL, /^FROM OPENROWSET/, /AS r$/) },
          { say: 'The address is a plain URL of the lake: the account, the container, and a path with three stars. A star matches any text inside one folder name. Here they stand for the year, the month and the day.', lines: G.span(OPEN_SQL, /BULK/) },
          { say: '`filepath(1)` returns the text that the first star matched, here the year, and `filepath(2)` the month. Putting them together gives a label such as 2026-03 without any column in the files.', lines: G.span(OPEN_SQL, /filepath\(1\) \+/) },
          { say: 'Revenue leaves out cancelled orders. A `CASE` with no `ELSE` gives NULL for a cancelled order, and `SUM` ignores NULL. Press Run.', lines: G.span(OPEN_SQL, /^       SUM/), run: true }
        ],
        result: { cols: ['order_month', 'orders', 'revenue_eur'], rows: BM.rows.map(function (r) { return [r[0], n0(r[1]), r[2].toFixed(2)]; }), msg: BM.rows.length + ' rows' },
        note: 'The three result rows come from DuckDB, which ran the same logic on the same ' + n0(L.rows) + ' orders in the real Parquet files. The T-SQL itself was not run on Synapse. The pool is reached at an address of the form `<workspace>-ondemand.sql.azuresynapse.net`, and the portal shows the exact name.'
      }),

      B.talk({
        id: 'm7-ways', t: 1, src: 'docs', title: 'Four ways to point a query at files',
        say: 'You can reach the same files in four ways, from a quick look to something an analyst can use every day. Press Next for each.',
        items: [
          ['A full URL in OPENROWSET', 'The quickest way, as in the first query. There is nothing to create. It suits exploring a folder, and it repeats the address in every query.', 'No setup, and no reuse.'],
          ['A data source and a relative path', 'An external data source stores the account and container, and optionally a credential. Queries then name only a path inside it. When the lake moves or a credential changes, you change one object.', 'One place for the address and the sign-in.'],
          ['A view over OPENROWSET', 'A view fixes the path, the column names and the types, so analysts and Power BI see a table. The files are still read when the query runs, and the view is only a saved query.', 'A table for people, a saved query for the pool.'],
          ['An external table', 'An external table maps files to a table definition that tools can discover. It is also what CETAS creates when it writes a result back to the lake.', 'A table definition over files.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'A serverless pool holds no data.', t: 'A database in it stores definitions only: views, external tables, data sources and credentials. Drop the database and the files in the lake are untouched.' }
      }),

      B.cmp({
        id: 'm7-formats', t: 1, src: 'docs', title: 'File formats: what the pool reads, and what you pay for',
        say: 'The format of the files decides how much a query reads. Press Next to compare the common ones. Which formats and features a pool supports changes over time, so check the current page.',
        cols: ['Format', 'How it is read', 'What the bill sees', 'Watch for'],
        hl: 2,
        rows: [
          ['Parquet', 'Column by column, with the statistics of each row group', 'the bytes of the columns that the query names', 'Many small files. Strings are UTF-8, so use a UTF-8 collation.'],
          ['Delta Lake', 'The log decides which Parquet files count, then like Parquet', 'the same as Parquet, for the files in the current version', 'A pool may not support every newer table feature. Check the page before you rely on one.'],
          ['CSV', 'Row by row, as text, and every column of a row is read', 'every byte of every file that the query opens', 'Header, quoting, encoding and types. A star query reads all of it.'],
          ['JSON lines', 'As lines of text that you parse with JSON functions', 'every byte of every file that the query opens', 'Slow to parse, and a changing shape makes a fragile query.']
        ],
        steps: [
          { upto: 2, say: 'The columnar formats. A query that names two columns of a wide table reads only those two, and that is the whole saving.' },
          { upto: 4, say: 'The text formats. They have no columns to skip, so the cost follows the size of the files, whatever the query asks for.' }
        ],
        pick: 'Keep the lake in **Parquet**, or **Delta** where Spark writes it. Use **CSV and JSON** for what arrives, in bronze, and convert them once, as mission 6 did. A text format that is queried often turns into a bill.'
      }),

      B.rows({
        id: 'm7-columns', t: 1, src: 'rec', title: 'Bytes in each column of a Parquet file',
        steps: [
          {
            say: 'This is one Parquet file of ' + n0(L.rows) + ' orders. Parquet stores each column on its own, so a query that names two columns reads two chunks and skips the rest. The timestamp takes ' + pct(BYC.order_ts, COLTOTAL) + ' of the file, and the date takes ' + n0(BYC.order_date) + ' bytes, because the file is sorted by date and the values repeat.',
            tabs: [{ layer: 'PARQUET FILE', name: 'orders_one/orders.parquet, compressed bytes of each column', c: 'mart', cols: ['column', 'bytes', 'share of the file'], rows: COLNAMES.map(function (k) { return [k, n0(BYC[k]), pct(BYC[k], COLTOTAL)]; }), chg: [[COLNAMES.indexOf('order_date'), 1], [COLNAMES.indexOf('total_eur'), 1]], trk: 0 }],
            notes: ['These are the compressed sizes of the column chunks, read with pyarrow. The whole file is ' + mb(L.one.bytes) + ' and has ' + L.one.row_groups + ' row groups.']
          },
          {
            say: 'Now three queries. Naming two columns reads ' + pct(TWO, COLTOTAL) + ' of the column bytes. A query that asks for everything reads all of it. In a serverless pool the data processed is the bill, so a star query on a wide Parquet table is the most expensive habit you can have.',
            tabs: [{ layer: 'QUERIES', name: 'what each query reads from the same file', c: 'qual', cols: ['query', 'columns read', 'bytes processed', 'share'], rows: [['SELECT *', String(COLNAMES.length), n0(COLTOTAL), '100.0%'], ['SELECT order_date, total_eur', '2', n0(TWO), pct(TWO, COLTOTAL)], ['SELECT order_ts', '1', n0(BYC.order_ts), pct(BYC.order_ts, COLTOTAL)]], chg: [[1, 2], [1, 3]], trk: 1 }],
            notes: ['A small footer of metadata is read as well, and the pool bills at least 10 MB for a query, so a single small file does not show the saving on the bill. The next screens show it at a larger scale.']
          }
        ]
      }),

      B.talk({
        id: 'm7-bill', t: 1, src: 'docs', title: 'How a serverless pool bills',
        say: 'You are charged for data, not for time. Press Next for the five rules, and keep them in mind for the next labs.',
        items: [
          ['Data processed', 'The documentation counts three things: the data read from storage, including the metadata of the files it opens, the data moved between the nodes of the pool while the query runs, and the data written to storage by a CETAS statement.', 'What the pool touches is what you pay for.'],
          ['Rounding and the minimum', 'The amount for each query is rounded up to the next MB, and every query counts for at least 10 MB. A query that processes 100 KB is billed as 10 MB.', 'Tiny queries still cost something.'],
          ['What is free', 'Statements that only touch metadata, such as creating a view or a data source, are not charged.', 'Definitions cost nothing.'],
          ['The rate', 'An example rate is **$5 for each TB** processed. The Azure pricing page shows the real rate for your region, and Microsoft changes it. The labs in this course use the example rate.', 'Always read the pricing page.'],
          ['Budgets', 'You can set a limit in TB for a day, a week and a month. The limit is checked when a query is submitted, and a query that is already running is not stopped. After the limit is reached, new queries are rejected until the period ends.', 'A budget is a brake, and not a wall.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The levers are all about bytes.', t: 'Name only the columns you need, read a columnar format, skip folders with filepath(), and write small summary tables for dashboards. The next lab measures the effect of each one.' }
      }),

      B.widget({ id: 'm7-prune-lab', kind: 'prune', t: 1, src: 'rec', title: 'Lab: which files does a wildcard open?' }),

      B.talk({
        id: 'm7-layouts', t: 1, src: 'rec', title: 'Three layouts for the same 600,000 orders',
        say: 'I wrote the same orders three ways, and you saw how each one behaves in the lab. Press Next for what the numbers say.',
        items: [
          ['Daily files in date folders', L.hive.files + ' files of about ' + mb(L.avg_day_file_bytes, 2) + ' each, in `year=2026/month=03/day=14/`. A wildcard in the path names only the folders you want: March opens ' + pc('p3').files + ' files, one day opens ' + pc('p5').files + ', and `filepath()` lets a filter skip the rest.', 'Folders are the cheapest way to skip data.'],
          ['Daily files in one folder', 'The same ' + L.flat.files + ' files, with the date in the name: `orders_2026-03-14.parquet`. A pattern on the name still works (' + pc('p6').files + ' files for March), and so does `filename()`. There are no folders to skip.', 'The name can do what a folder does.'],
          ['One sorted file', 'All ' + n0(L.rows) + ' rows in one file of ' + mb(L.one.bytes) + ', sorted by date. The pool opens it whatever the dates in the query. Inside the file, row groups can still be skipped, as the next screen shows.', 'One file is opened whole, with some skipping.'],
          ['The size of a file', 'A daily file here is only ' + mb(L.avg_day_file_bytes, 2) + '. The documentation gives **100 MB to 10 GB** as a good size for files, so at real volumes you combine days into larger files, and you partition by month or by week, not by day, until the files are big enough.', 'Tiny files cost a request each.']
        ],
        cols: 1
      }),

      B.rows({
        id: 'm7-rowgroups', t: 2, src: 'rec', title: 'Inside the sorted file: row groups and statistics',
        steps: [
          {
            say: 'A Parquet file is cut into row groups, and each one records the smallest and largest value of every column. An engine can skip a group that cannot hold what the query wants. Here the sorted file has ' + RG.groups.length + ' groups, and only ' + RG.groups_that_can_hold_the_day + ' can hold ' + RG.day + '.',
            tabs: [{ layer: 'ROW GROUPS', name: 'orders_one/orders.parquet, statistics of ' + RG.column, c: 'int', cols: ['row group', 'rows', 'first ' + RG.column, 'last ' + RG.column, 'can hold ' + RG.day + '?'], rows: RG.groups.map(function (g, i) { return [String(i + 1), n0(g.rows), g.min, g.max, g.min <= RG.day && RG.day <= g.max ? 'yes' : 'no']; }), chg: RG.groups.map(function (g, i) { return g.min <= RG.day && RG.day <= g.max ? [i, 4] : null; }).filter(Boolean), trk: RG.groups.map(function (g) { return g.min <= RG.day && RG.day <= g.max; }).indexOf(true) }],
            notes: ['The file is sorted by ' + RG.sorted_by + ', so each group covers a short range of days. In an unsorted file every group would span all days, and none could be skipped. Whether and when an engine uses the statistics is in its documentation.']
          }
        ]
      }),

      B.sql({
        id: 'm7-filepath', t: 1, src: 'rec', title: 'Skip folders with filepath()', file: 'worksheet: march_orders.sql', code: FILTER_SQL,
        ctx: { role: 'Entra ID: brewline-analyst', wh: 'Synapse serverless SQL', db: 'master' },
        steps: [
          { say: 'This query asks for March only, but its wildcards name every day folder. The filter at the bottom is what saves the money. Press Next.', lines: null },
          { say: 'The path has three stars, for the year, the month and the day. Each star numbers from the left, so `filepath(2)` is the text that the second star matched: 01, 02 or 03.', lines: G.span(FILTER_SQL, /BULK/) },
          { say: 'The filter is on the path and not on a column. The pool applies it before it opens a file, so it opens **' + pc('p2').files + ' of ' + pc('p1').files + '** files and reads ' + mb(pc('p2').bytes_of_files) + ' of ' + mb(pc('p1').bytes_of_files) + '. Press Run.', lines: G.span(FILTER_SQL, /^WHERE/), run: true }
        ],
        result: { cols: ['orders', 'revenue_eur'], rows: [[n0(MARCH[1]), MARCH[2].toFixed(2)]], msg: '1 row' },
        note: 'Writing the month into the path, `year=2026/month=03/day=*`, opens the same ' + pc('p3').files + ' files and needs no filter. With the month written out, the stars are counted again from the left, so `filepath(1)` is then the day. The numbers are from DuckDB on the real files, and the T-SQL was not run on Synapse.'
      }),

      B.code({
        id: 'm7-ds', t: 1, src: 'docs', title: 'A database, a data source and a view', file: 'setup_lake_db.sql', lang: 'tsql', code: DS_SQL,
        steps: [
          { say: 'This is the setup that an analyst never sees. It makes a database in the serverless pool, a data source that points at the container, and a view that looks like a table. Press Next.', lines: null },
          { say: 'The database holds only definitions. Its collation is a UTF-8 one, because Parquet stores strings as UTF-8, and a mismatch can cause conversion errors. Use `varchar` with it, and not `nvarchar`.', lines: G.span(DS_SQL, /^CREATE DATABASE/) },
          { say: 'The data source stores the address of the container once. Queries then use short paths. With no credential, a query that runs under an Entra login reaches the files as that login.', lines: G.span(DS_SQL, /^CREATE EXTERNAL DATA SOURCE/, /^WITH/) },
          { say: 'The select list adds the three `filepath` values as columns, so a filter on `order_month` can skip folders, and Power BI can use them like any column.', lines: G.span(DS_SQL, /^SELECT r.filepath\(1\)/, /r.order_id/) },
          { say: '`DATA_SOURCE` makes the path relative to the container. The view repeats the wildcard path with the three stars.', lines: G.span(DS_SQL, /BULK/, /FORMAT/) },
          { say: 'The `WITH` clause names the columns and their types. With explicit types the pool reads only these columns, and a string gets the length that you choose, and not the widest default.', lines: G.span(DS_SQL, /WITH \(/, /\) AS r;/) }
        ],
        note: 'T-SQL for a serverless SQL pool, from the documentation. It was not run on Synapse, and sqlglot cannot parse OPENROWSET, so the syntax checker could not check it either. Check the current page before you copy it.'
      }),

      B.cmp({
        id: 'm7-signin', t: 1, src: 'docs', title: 'How the pool signs in to the lake',
        say: 'The storage account sees an identity and a role, as in mission 3. Press Next to compare the four ways that a serverless pool can present one.',
        cols: ['Sign-in', 'Whose identity', 'It needs', 'Watch for'],
        hl: 1,
        rows: [
          ['Entra pass-through', 'The person or the app that runs the query', 'a role such as Storage Blob Data Reader for that identity, or ACLs on the folders', 'Every user needs access. A scheduled job that runs as a person stops when the person leaves.'],
          ['Managed identity of the workspace', 'The identity of the Synapse workspace', 'a role for the workspace identity, and a database scoped credential that names it', 'Everyone who may use the data source gets the same access. Control who can use the credential.'],
          ['SAS token', 'A token stored in a credential', 'a SAS for the container with read and list permission', 'It expires, and it is a secret inside a database.'],
          ['Public access', 'Nobody', 'a container that allows anonymous reads', 'Never for company data.']
        ],
        steps: [
          { upto: 2, say: 'The two that use Entra ID. One acts as the caller and the other as the workspace. Both are role assignments that you can audit.' },
          { upto: 4, say: 'A SAS is a stored secret, and public access is no identity at all. They exist, and they are not where to start.' }
        ],
        pick: 'Use **pass-through** when people explore, and a **workspace managed identity** behind a data source for shared views, with the credential limited to the group that needs it. Avoid **SAS** inside databases.'
      }),

      B.code({
        id: 'm7-mi', t: 2, src: 'docs', title: 'A data source that uses the workspace identity', file: 'managed_identity_source.sql', lang: 'tsql', code: MI_SQL,
        steps: [
          { say: 'This is the managed identity option in T-SQL. It needs three objects. Press Next.', lines: null },
          { say: 'A database master key protects the credentials that the database stores. Keep its password in Key Vault.', lines: G.span(MI_SQL, /MASTER KEY/) },
          { say: 'The credential names no secret. `Managed Identity` means: sign in as the identity of the workspace. That identity must hold a read role on the container, for example Storage Blob Data Reader.', lines: G.span(MI_SQL, /^CREATE DATABASE SCOPED CREDENTIAL/, /Managed Identity/) },
          { say: 'The data source ties the address to the credential. A view that uses it reads the lake as the workspace, and the analyst needs no role on the storage account.', lines: G.span(MI_SQL, /^CREATE EXTERNAL DATA SOURCE/, /^\);/) }
        ],
        note: 'From the documentation, not run on Synapse. Which database permissions let a user use a credential, and the exact steps, are on the page of your pool type, so read it before you grant anything.'
      }),

      B.code({
        id: 'm7-ctas', t: 2, src: 'docs', title: 'CETAS: write a small table back to the lake', file: 'daily_revenue_ctas.sql', lang: 'tsql', code: CTAS_SQL,
        steps: [
          { say: 'CETAS means create external table as select. It runs a query, writes the result as Parquet files into the lake, and creates a table over them. Dashboards then read a small table, and not the big one. Press Next.', lines: null },
          { say: 'First, a file format object that says: Parquet, compressed with Snappy.', lines: G.span(CTAS_SQL, /^CREATE EXTERNAL FILE FORMAT/, /^WITH/) },
          { say: 'The table definition says where to write: a folder in the container of the data source, and the format. The pool needs write access there, so the identity needs a role that can write blobs.', lines: G.span(CTAS_SQL, /^CREATE EXTERNAL TABLE/, /^\)/) },
          { say: 'After `AS` comes the query. This one counts orders and sums revenue for each day, from the big daily files.', lines: G.span(CTAS_SQL, /^SELECT r.order_date/, /^GROUP BY/) }
        ],
        note: 'From the documentation, not run. A CETAS statement bills for the data it processes, which includes the data it writes. Run it from a pipeline each night, write to a new folder each time, and read the finished folder, so that a dashboard never reads files that are half written.'
      }),

      B.code({
        id: 'm7-limit', t: 1, src: 'docs', title: 'Put a ceiling on the bill', file: 'budget.sql', lang: 'tsql', code: LIMIT_SQL,
        steps: [
          { say: 'A single wrong query can process terabytes. These statements set a limit, so that it cannot run all month. Press Next.', lines: null },
          { say: '`sp_set_data_processed_limit` sets a budget in TB for a day, a week or a month. You can set more than one. The limit is checked when a query is submitted. A query that is already running continues, so the total can pass the limit by what that query needs.', lines: G.span(LIMIT_SQL, /sp_set_data_processed_limit @type = N'daily'/, /monthly/) },
          { say: 'The view `sys.dm_external_data_processed` shows what has been processed in each period so far. Check it before you pick a limit, and again each week.', lines: G.span(LIMIT_SQL, /^SELECT/) }
        ],
        note: 'From the documentation. When a limit is reached, new queries are rejected with an error that names the period and the limit, so tell the dashboard owners what that message looks like. Pair a budget with an alert on the spend.'
      }),

      B.decide({
        id: 'm7-dec', t: 2, src: 'docs', title: 'Decision: the dashboard scans three years of orders',
        scenario: 'Brewline now has **three years** of orders as Parquet in daily folders, about **2 TB**. A Power BI dashboard for the current month runs **300 queries a day** through a serverless view that has no folder filter. Each query names two of the eleven columns, and processes about 120 GB. The serverless line is now the biggest on the data bill.',
        opts: [
          { t: 'Move the data to a dedicated SQL pool', d: 'Fast queries on a table that the pool owns.', lose: 'It adds a second copy and a bill for every hour that the pool is on, and it does not fix a view that reads everything.' },
          { t: 'Write a small gold table with a nightly CETAS, point the dashboard at it, and keep the detail view for exploration, with filepath() filters and a daily budget', d: 'The dashboard reads a few MB. The detail stays available and cheap when it names its folders.' },
          { t: 'Convert the files to CSV so that they are easy to read', d: 'Simple to open in other tools.', lose: 'CSV is text. Every query reads every column of every file that it opens, so the bill grows.' }
        ],
        pick: 1,
        why: 'The arithmetic shows it. At the example rate of $5 per TB, 300 queries that each process 120 GB process 36 TB a day, which is **$180 a day**. The same dashboard on a gold table of a few MB pays the 10 MB minimum: 300 times 10 MB is 3 GB, which is **about 1.5 cents a day**. The detail view stays, and its filters and budget stop a mistake from becoming a bill.',
        when: 'If many people need sub-second answers all day on large detail, or the queries are complex joins, a dedicated pool or a Fabric lakehouse may fit better. Decide with a week of real query history and the example rate.'
      }),

      B.quiz({
        id: 'm7-q1', t: 1,
        q: 'A query names two of the eleven columns of a Parquet file. What does a serverless pool process?',
        opts: [
          { t: 'The whole file, because the file is opened', fb: 'Parquet keeps each column separately, so the other columns are skipped.' },
          { t: 'About the two column chunks, plus a little metadata', fb: '' },
          { t: 'Nothing, because the first query of the day is free', fb: 'There is no free query. Only metadata statements are free.' },
          { t: 'Every row of every column, but compressed', fb: 'Compression does not bring the skipped columns back.' }
        ],
        ok: 1, why: 'The recorded file shows it: two columns took ' + n0(TWO) + ' bytes, ' + pct(TWO, COLTOTAL) + ' of the column bytes. The bill counts what is read, rounded up per query, with a minimum of 10 MB.'
      }),

      B.quiz({
        id: 'm7-q2', t: 1,
        q: "The path has year=*/month=*/day=* and the query says WHERE r.filepath(2) = '03'. How many of the 60 recorded files are opened?",
        opts: [
          { t: '60, because the wildcard names every file', fb: 'The filter on filepath() lets the pool skip folders before it opens them.' },
          { t: String(pc('p2').files), fb: '' },
          { t: '1', fb: 'March has more than one daily file.' },
          { t: '31', fb: 'The data ends on 14 March, so March has fewer than 31 files.' }
        ],
        ok: 1, why: 'The data runs from 14 January to 14 March, so March has ' + pc('p2').files + ' daily files. The filter on `filepath(2)` skips the others without opening them.'
      }),

      B.quiz({
        id: 'm7-q3', t: 1,
        q: 'Which format makes a serverless pool read every byte of the files it opens, even when the query names one column?',
        opts: [
          { t: 'Parquet', fb: 'Parquet is columnar, so it skips columns.' },
          { t: 'Delta Lake', fb: 'Delta is Parquet files plus a log.' },
          { t: 'CSV', fb: '' },
          { t: 'None. A pool always reads only the named columns', fb: 'Text formats have no columns to skip.' }
        ],
        ok: 2, why: 'CSV is text in rows. To find one column the reader must read the whole row, so the data processed is the size of the files. That is why bronze is converted to Parquet in mission 6.'
      }),

      B.quiz({
        id: 'm7-q4', t: 1,
        q: 'The daily budget of a serverless pool has been reached. What happens to a query that is already running, and to a new one?',
        opts: [
          { t: 'Both are stopped at once', fb: 'The limit is checked when a query is submitted.' },
          { t: 'The running query finishes, and new queries are rejected until the period ends', fb: '' },
          { t: 'Both continue, and the bill is sent late', fb: 'New queries are rejected once the limit is reached.' },
          { t: 'The pool scales down', fb: 'A serverless pool has no size to scale. The limit rejects queries.' }
        ],
        ok: 1, why: 'The documentation says that the limit is checked at submission, so a running query is not stopped, and the total can pass the limit by what that query needs. After that, new queries get an error that names the period and the limit.'
      }),

      B.quiz({
        id: 'm7-q5', t: 1,
        q: 'A query processes 120 KB. What does the pool bill it as?',
        opts: [
          { t: '120 KB', fb: 'There is a minimum for each query.' },
          { t: '1 MB, rounded up', fb: 'Rounding goes up to the next MB, and the minimum is higher.' },
          { t: '10 MB, the minimum', fb: '' },
          { t: 'Nothing, because it is under 1 GB', fb: 'There is no free tier like that.' }
        ],
        ok: 2, why: 'Each query is rounded up to the next MB and counts for at least 10 MB. At $5 per TB that is $0.00005 for a tiny query, which adds up only when a tool sends thousands of them.'
      }),

      B.quiz({
        id: 'm7-q6', t: 2,
        q: 'A view reads Parquet files with string columns. Which database setting does the documentation recommend?',
        opts: [
          { t: 'A UTF-8 collation such as Latin1_General_100_BIN2_UTF8, with varchar columns', fb: '' },
          { t: 'The default collation, with nvarchar columns', fb: 'Parquet strings are UTF-8, and nvarchar is meant for UTF-16 text.' },
          { t: 'A case-insensitive collation only', fb: 'Case is a different matter. The encoding is the concern.' },
          { t: 'No collation, because Parquet has no strings', fb: 'Parquet stores strings, as UTF-8.' }
        ],
        ok: 0, why: 'Parquet stores strings as UTF-8, and the documentation warns that a mismatch with the collation can give conversion errors. It recommends a UTF-8 collation, with `varchar`, for Parquet, Delta and UTF-8 CSV.'
      }),

      B.order({
        id: 'm7-ord', t: 1, q: 'Put the setup of a shared lake view in order.',
        items: [
          'Give the workspace identity a read role on the container',
          'Create the database with a UTF-8 collation',
          'Create the credential and the data source',
          'Create a view over OPENROWSET with explicit column types and filepath columns',
          'Give the analyst group access to the view',
          'Set a daily data processed limit'
        ],
        why: 'The identity needs its role before anything can read the lake. The database and its collation come before the objects in it, and the view uses the data source. Access is granted on the view, so analysts never touch the storage account, and the budget comes last as the safety net.'
      }),

      B.bug({
        id: 'm7-bug', t: 1, src: 'docs', q: 'A dashboard counts the orders of March, and it is slow and expensive. Click the line that makes it read the whole table.',
        file: 'march_orders.sql', lang: 'tsql', code: BUG_FILTER, bad: [3],
        hint: 'A filter on a column is applied after a file is opened.',
        why: 'The wildcard names every day of every month, and `order_date` is a column inside the files. The pool opens every file that the wildcard matches and filters the rows after reading them. Put the month in the path, or filter on `filepath()`, so that the folders are skipped before any file is opened.',
        fix: FIX_FILTER,
        cheer: 'Filter on the folder, not on the column.'
      }),

      B.bug({
        id: 'm7-bug2', t: 2, src: 'docs', q: 'Strings from the Parquet files arrive with conversion errors. Click the line that is the cause.',
        file: 'create_db.sql', lang: 'tsql', code: BUG_DB, bad: [1],
        hint: 'Parquet stores strings as UTF-8. Which statement decides the collation of the database?',
        why: 'The database was created with the default collation, which is not a UTF-8 one. Parquet strings are UTF-8, and the documentation warns that a mismatch can cause conversion errors. Create the database with a UTF-8 collation such as `Latin1_General_100_BIN2_UTF8`, or set the collation of the string columns in the `WITH` clause.',
        fix: FIX_DB,
        cheer: 'Match the collation to the encoding of the files.'
      }),

      B.challenge({
        id: 'm7-ch', t: 2, title: 'Coding round: revenue for each month from the folders', file: 'revenue_by_month.sql', lang: 'sql',
        q: 'The orders are in `orders_hive/year=2026/month=*/day=*/*.parquet`. **Write the query that returns, for each month, the number of orders and the revenue without cancelled orders**, using `filepath()`. Careful: count the stars from the left.',
        data: [{ name: 'files that the wildcard matches (the first three and the last)', cols: ['path', 'rows'], rows: [['orders_hive/year=2026/month=01/day=14/part-0.parquet', '10,014'], ['orders_hive/year=2026/month=01/day=15/part-0.parquet', '...'], ['orders_hive/year=2026/month=01/day=16/part-0.parquet', '...'], ['orders_hive/year=2026/month=03/day=14/part-0.parquet', '10,014']] }],
        starter: "-- one row for each month, from the folder names\nSELECT ...\nFROM OPENROWSET(\n        BULK 'https://stbrewlinelakeprod.dfs.core.windows.net/curated/orders_hive/year=2026/month=*/day=*/*.parquet',\n        FORMAT = 'PARQUET') AS r",
        hints: ['`filepath(n)` returns the text that the n-th star matched, counted from the left.', 'The year is written out, so the first star is the month and the second is the day.', 'Group by the same `filepath()` call that you select.'],
        sol: CH_SQL,
        res: { msg: '3 rows', cols: ['order_month', 'orders', 'revenue_eur'], rows: BM.rows.map(function (r) { return [r[0].slice(5), n0(r[1]), r[2].toFixed(2)]; }) },
        expl: ['With the year written out, the stars are `month=*`, `day=*` and `*.parquet`. So `filepath(1)` is the month. Counting the stars from the left is the whole trap.', 'The recorded case with the month written out, `year=2026/month=03/day=*`, shows it: there `filepath(1)` returned the days 01 to 14.', 'The `CASE` with no `ELSE` leaves cancelled orders out of the sum, and `COUNT(*)` still counts them, as in the first query of this mission.', 'The result is DuckDB running the same logic on the real files. A query that groups by `filepath()` still opens all the files that the wildcard matches, so for one month a literal path is cheaper.'],
        cx: 'One pass over the files that the wildcard matches, and a hash aggregation of three groups. The cost is the bytes of the two columns that it reads.'
      }),

      B.incident({
        id: 'm7-inc', t: 2, src: 'docs', title: 'Incident: the serverless bill doubled', time: '10:05',
        alert: '**The serverless line of the bill went from $410 to $890 in a month.** No new dashboard was added. The query history shows a view over a **CSV export folder** that grows by 3 GB a day, queried 400 times a day with `SELECT *`. The export is written by a vendor tool, and nobody owns the folder.',
        clues: ['The view reads CSV, which has no columns to skip', 'The folder grows every day, so every query reads more', 'Nothing limits what a query may process'],
        opts: [
          { t: 'Convert the export to Parquet with a nightly job, name the columns in the view, and set a daily data processed limit', fb: '' },
          { t: 'Move the folder to a dedicated SQL pool', fb: 'It adds a pool to pay for by the hour, and does not fix a view that reads everything.' },
          { t: 'Ask the dashboard to refresh less often', fb: 'It cuts the number of queries and leaves each one reading the whole folder, which grows every day.' },
          { t: 'Ask for a bigger budget', fb: 'It pays for the problem and does nothing about it.' }
        ],
        best: 0,
        why: 'The recording shows the effect of the format and of the columns: two named columns of a Parquet file took ' + pct(TWO, COLTOTAL) + ' of its bytes. CSV cannot skip columns, so every query pays for the whole folder, and the folder grows. A nightly conversion to Parquet, a view with named columns, and a budget fix the cause and add a brake.',
        checks: [
          ['Find the biggest spender', 'The query history shows which views and which queries process the most data.'],
          ['Read the shape', 'Which format and how many columns? Is there a folder filter?'],
          ['Fix the data', 'Convert to Parquet, in folders by date, in files of a sensible size.'],
          ['Fix the view', 'Name the columns and filter on filepath().'],
          ['Add a brake', 'A daily and a monthly limit, and an alert on the spend.']
        ],
        tell: 'The serverless bill doubled because a view read a CSV export folder that grows by 3 GB a day, with SELECT *, 400 times a day, and CSV cannot skip columns. I converted the export to Parquet in a nightly job, rewrote the view with named columns and a filter on the date folders, and set a daily and a monthly data processed limit with an alert, so a change like this shows up as an alert and not on the invoice.',
        prevent: ['**Convert** text exports to **Parquet** once', 'Name **columns** and filter on **filepath()**', 'Set **budgets** and alert on spend', 'Give every folder an **owner**']
      }),

      B.incident({
        id: 'm7-inc2', t: 2, src: 'docs', title: 'Incident: the dashboard reads files that are half written', time: '06:50',
        alert: '**The morning dashboard shows a revenue that is 30 percent too low, and it fixes itself an hour later.** A Data Factory pipeline rewrites the `orders_hive` folder of the current day between 06:30 and 07:30. The view that the dashboard reads covers the whole folder.',
        clues: ['The wrong number appears only during the load window', 'The view reads whatever files exist when it runs', 'The pipeline overwrites files in place'],
        opts: [
          { t: 'Write the day to a new folder name, check the counts, and then switch the view or rename the folder in one step', fb: '' },
          { t: 'Retry the dashboard query until the number looks right', fb: 'A retry reads the same half-written folder, and a wrong number that looks right is still wrong.' },
          { t: 'Tell people not to open the dashboard before 08:00', fb: 'It works until the load runs late. The design should not depend on the clock.' },
          { t: 'Copy the data to a dedicated SQL pool and read it there', fb: 'It adds a copy and a load to maintain, and the copy can have the same problem unless it is loaded safely.' }
        ],
        best: 0,
        why: 'Mission 5 made the rule: write somewhere new, check, then publish. On a lake with a hierarchical namespace, renaming a directory is a single metadata operation, so readers see the old folder or the new one and never a mix. The view then reads the finished folder only.',
        checks: [
          ['Match the wrong number to the clock', 'It is wrong only while the pipeline runs.'],
          ['Look at the files', 'Are files being replaced or added while the query reads them?'],
          ['Change the write', 'Write to a new folder, and check the counts against the source.'],
          ['Publish in one step', 'Rename the folder, or point the view at the new folder.'],
          ['Add a gate', 'A row-count check before the publish step.']
        ],
        tell: 'The dashboard was low because it read the day folder while the pipeline rewrote it. I changed the load to write to a new folder, compare counts with the source, and then rename it into place in one step, which is atomic on a hierarchical namespace, and I added the count check as a gate before the rename. Readers now see the old folder or the new one, and never a mix.',
        prevent: ['**Write** to a new place, **check**, then **publish**', 'Use **atomic** renames on a hierarchical namespace', 'Add a **count gate** before the publish', 'Do not depend on **time windows**']
      }),

      B.qa({
        id: 'qa-serverless', t: 1, tag: 'Synapse', secs: 60,
        q: 'What is a serverless SQL pool in Synapse, and when do you use it?',
        pts: ['Built into every Synapse workspace, with no storage and no cluster to run', 'Queries files in the lake with T-SQL: OPENROWSET, views, external tables', 'Billed for the data processed, and not for time', 'Good for exploration, a SQL layer over curated files, and small summary tables with CETAS', 'Holds only definitions, never data', 'Not the tool for heavy, repeated, sub-second workloads'],
        short: 'A serverless SQL pool is built into every Synapse workspace. It has no storage and no cluster for me to run: a query names files in the lake, and the pool reads them there with T-SQL. I use OPENROWSET for exploration, and views or external tables so that analysts and Power BI see tables. A database in the pool holds only definitions.\n\nI am billed for the data that a query processes, not for time, so an idle pool costs nothing. That makes it good for exploration, for a thin SQL layer over curated Parquet or Delta, and for writing small summary tables with CETAS.\n\nI would not choose it for heavy, repeated workloads that need sub-second answers for many users. A dedicated pool, Spark or a Fabric lakehouse fits those better.',
        fu: [
          ['Can it write data?', 'It can write query results to the lake as Parquet with CETAS. It does not store tables of its own.'],
          ['What formats does it read?', 'Parquet, Delta Lake, CSV and JSON as text. Check the current page for the list and the features.']
        ],
        trap: 'Treating it as a warehouse. It is a query engine over files.',
        real: 'Describe a use of serverless SQL in a project, and its limits.'
      }),

      B.qa({
        id: 'qa-serverless-bill', t: 1, tag: 'Synapse', secs: 90,
        q: 'How is a serverless pool billed, and how do you cut the bill?',
        pts: ['Data processed: read from storage, moved between nodes, and written by CETAS', 'Rounded up to the next MB, with a 10 MB minimum for each query', 'An example rate of $5 per TB, so check the pricing page', 'Parquet or Delta, and name the columns', 'Folders and filepath() to skip files, and files of a good size', 'Gold tables with CETAS, and budgets with sp_set_data_processed_limit'],
        short: 'The pool bills for data processed: what it reads from storage, what it moves between its nodes, and what a CETAS statement writes. Each query is rounded up to the next MB and counts for at least 10 MB. An example rate is $5 per TB, and I check the pricing page for the real one.\n\nThe levers are all about bytes. I keep the lake in Parquet or Delta so that a query reads only the columns it names, and I never use a star on a wide table. I lay the files out in folders so that a wildcard or a filepath filter skips most of them, and I keep the files a good size, 100 MB or more. For dashboards I write small gold tables with CETAS, so each query reads a few MB.\n\nThen I add a brake: daily and monthly limits with sp_set_data_processed_limit, a look at the consumption view each week, and an alert on spend.',
        fu: [
          ['What does the limit do?', 'It is checked when a query is submitted. A running query is not stopped, and later queries are rejected until the period ends.'],
          ['Why does CSV cost more?', 'It is text in rows, so a query reads every column of the files it opens, whatever it names.']
        ],
        trap: 'Optimizing the query and forgetting the layout of the files.',
        real: 'Describe a query or a view that you made cheaper, with the numbers.'
      }),

      B.qa({
        id: 'qa-serverless-layout', t: 2, tag: 'Synapse', secs: 90,
        q: 'How do you lay out files in the lake for serverless SQL?',
        pts: ['Parquet or Delta, with a UTF-8 collation and varchar for strings', 'Folders by date, with the date in the path: year, month, day', 'Wildcards and filepath() so the pool skips folders before it opens files', 'Files of a good size: 100 MB to 10 GB in the documentation, not hundreds of KB', 'Sort a file by the column you filter on, so row groups can be skipped', 'Storage and pool in the same region'],
        short: 'I use Parquet, or Delta where Spark writes it, in folders by date, such as year, month and day. Then a wildcard in the path or a filter on filepath() lets the pool skip whole folders before it opens a single file. In my recording, a filter on the month opened 14 of 60 files.\n\nFile size matters. A daily file of 194 KB is far too small. The documentation gives 100 MB to 10 GB as a good range, so at real volumes I combine days into larger files and partition by month or week. Inside a file, sorting by the column that people filter on gives each row group a narrow range, so an engine can skip groups using the statistics.\n\nI create the database with a UTF-8 collation and use varchar for strings, and I keep the storage account and the pool in the same region.',
        fu: [
          ['Why not partition by hour?', 'Partitions that are too small make tiny files, and every file costs a request. Partition until files are large enough, not further.'],
          ['What does filepath(1) return?', 'The text that the first star of the path matched. Stars are counted from the left, so writing a folder name out changes the numbers.']
        ],
        trap: 'Counting the stars from the wrong end, or filtering on a column and expecting folders to be skipped.',
        real: 'Describe how you chose the layout of a lake folder.'
      }),

      B.qa({
        id: 'qa-serverless-security', t: 2, tag: 'Synapse', secs: 75,
        q: 'How does a serverless pool get access to the lake, and how do you control who sees what?',
        pts: ['Entra pass-through: the caller needs a role or ACLs', 'The workspace managed identity, through a credential and a data source', 'A SAS token only when nothing else works', 'Roles at the storage account, ACLs on folders, as in mission 3', 'Give analysts access to views, not to the storage account', 'Limit who can use a credential'],
        short: 'The storage account only sees an identity and a role, plus ACLs on folders. There are three ways for the pool. With Entra pass-through the pool reaches the lake as the person or app that runs the query, which needs a role such as Storage Blob Data Reader or ACLs. With a workspace managed identity, a database scoped credential and a data source let shared views read the lake as the workspace. A SAS token is the last resort, because it is a secret that expires.\n\nI prefer to give analysts access to views and not to the storage account, using the managed identity behind a data source, and I control who may use the credential. I keep the roles at the least scope that works, and I check the logs for who read what.',
        fu: [
          ['What if a job runs as a person?', 'It stops when the person leaves. Run scheduled work as a managed identity or a service principal.'],
          ['Is public access ever fine?', 'Not for company data. A container with anonymous reads is open to everyone.']
        ],
        trap: 'Giving the whole analyst group a role on the storage account for convenience.',
        real: 'Describe how access to a lake was granted and reviewed.'
      }),

      B.qa({
        id: 'qa-synapse-fabric', t: 2, tag: 'Synapse', secs: 75,
        q: 'Where does Synapse stand next to Fabric, and what do you tell a team that starts now?',
        pts: ['Microsoft has said that new investment goes to Fabric', 'Synapse is still supported: check the support dates of each runtime', 'For a new platform, evaluate Fabric first, and read its current limits and price', 'The skills carry over: T-SQL on files, Spark, pipelines', 'Avoid building on Synapse-only features that have no Fabric path', 'Keep data in open formats, Parquet and Delta, so engines can change'],
        short: 'Microsoft has said that new investment goes to Fabric, and Synapse keeps being supported, so I check the support dates of each runtime I would use. For a team that starts now I would evaluate Fabric first, and read its current limits and price, because it changes quickly.\n\nThe skills carry over: T-SQL on files in a lake, Spark notebooks, and pipelines work in both. The design choices that keep a team free are the same on either: keep the data in open formats, Parquet and Delta, in a lake that more than one engine can read, and keep the logic in code that is under version control.\n\nI would avoid building on features that only Synapse has and Fabric does not, such as a dedicated SQL pool that holds the only copy of the data, unless there is a clear reason.',
        fu: [
          ['Should we migrate now?', 'Not by default. Check the support dates, the features that you use, and the cost. Plan it, and do not rush.'],
          ['What carries over?', 'Parquet and Delta in the lake, T-SQL, Spark code and the idea of a pipeline.']
        ],
        trap: 'Stating the future of a product as a fact. Read the current announcements.',
        real: 'Describe how you decided between two platforms, and what you would re-check.'
      }),

      B.recap({
        id: 'm7-recap', n: 7, badge: 'Serverless Querier', color: '#FDE68A',
        pts: [
          'A **serverless SQL pool** has no storage and no cluster. It reads files in the lake with T-SQL and holds only definitions.',
          'You pay for **data processed**, rounded up to the MB, with a **10 MB minimum** for each query. The example rate is $5 per TB.',
          'Parquet stores **columns** apart: naming two columns read ' + pct(TWO, COLTOTAL) + ' of the bytes. CSV reads everything.',
          '**Folders and filepath()** skip files before they are opened. A filter on a column does not. Stars are counted **from the left**.',
          'Use a **UTF-8 collation**, a **data source** with a managed identity, **CETAS** for small gold tables, and **budgets** as a brake.'
        ],
        lines: [
          'I name the columns and I filter on the folder.',
          'I convert text to Parquet once.',
          'I put a limit on the bill before the bill puts a limit on me.'
        ]
      })
    ]
  });
})();
