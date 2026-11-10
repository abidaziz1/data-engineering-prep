/* Mission 8: the dedicated SQL pool of Synapse. A warehouse engine that splits every table into 60 distributions.
   How the 600,000 Brewline orders spread over 60 distributions for each possible hash column, and how many rows would have to move for a join on
   customer_id, were computed on the real data with a stand-in hash: Synapse does not publish its own, so the recording uses MD5 modulo 60.
   The design rules, the T-SQL, the limits and the behavior of the service come from the Azure documentation, and nothing here ran on Synapse. */
(function () {
  var B = LAB.b, G = LAB.get;
  var D = G.counts('dedicated.distribution'), MV = G.counts('dedicated.movement'), BY = D.by_column;
  function n0(n) { return Number(n).toLocaleString('en-US'); }
  function mv(how) { return MV.cases.filter(function (c) { return c.how === how; })[0]; }
  var ROWGROUP = 1048576, FULL = ROWGROUP * D.distributions, PER = D.rows / D.distributions;
  var CUST = BY.customer_id, STATUS = BY.status, CHANNEL = BY.channel;
  var BUSIEST = CUST.buckets.indexOf(CUST.max) + 1;

  G.expect(D.distributions === 60 && D.rows === 600000 && D.customers === 12000, '60 distributions, 600,000 orders and 12,000 customers');
  G.expect(CUST.skew === 1.86 && CUST.empty === 0 && CUST.max === 18618 && BY.order_id.skew === 1.02 && BY.order_id.empty === 0, 'customer_id is 1.86 times the average with no empty distribution, and order_id is nearly even');
  G.expect(STATUS.distinct === 4 && STATUS.empty === 56 && STATUS.skew === 52.84 && CHANNEL.distinct === 3 && CHANNEL.empty === 57, 'status leaves 56 distributions empty and channel leaves 57');
  G.expect(mv('HASH(customer_id)').moved === 0 && mv('HASH(order_id)').moved > 580000 && mv('HASH(order_id)').of === 600000, 'a join on customer_id moves nothing when the orders are hashed on customer_id, and about 98 percent otherwise');
  G.expect(PER === 10000 && CUST.buckets.length === 60, '10,000 rows in each distribution on average');

  var CTAS_SQL = [
    '-- a fact table: spread by customer, stored as a columnstore',
    'CREATE TABLE dbo.fct_orders',
    'WITH (',
    '    DISTRIBUTION = HASH(customer_id),',
    '    CLUSTERED COLUMNSTORE INDEX',
    ')',
    'AS',
    'SELECT order_id, customer_id, store_id, order_date, status, total_eur',
    'FROM stg.orders;',
    '',
    '-- a small dimension: a copy on every compute node, sorted by its key',
    'CREATE TABLE dbo.dim_customers',
    'WITH (',
    '    DISTRIBUTION = REPLICATED,',
    '    CLUSTERED INDEX (customer_id)',
    ')',
    'AS',
    'SELECT customer_id, region, tier',
    'FROM stg.customers;'
  ].join('\n');

  var COPY_SQL = [
    '-- 1. a staging table: dealt out evenly, no index, fast to load',
    'CREATE TABLE stg.orders (',
    '    order_id    BIGINT       NOT NULL,',
    '    order_date  DATE         NOT NULL,',
    '    customer_id VARCHAR(10)  NOT NULL,',
    '    status      VARCHAR(20)  NOT NULL,',
    '    total_eur   FLOAT        NOT NULL',
    ')',
    'WITH (DISTRIBUTION = ROUND_ROBIN, HEAP);',
    '',
    '-- 2. read the Parquet files of March from the lake, in parallel',
    'COPY INTO stg.orders',
    "FROM 'https://stbrewlinelakeprod.dfs.core.windows.net/curated/orders_hive/year=2026/month=03/*/*.parquet'",
    'WITH (',
    "    FILE_TYPE  = 'PARQUET',",
    "    CREDENTIAL = (IDENTITY = 'Managed Identity')",
    ');',
    '',
    '-- 3. build the final table, swap it in, and refresh the statistics',
    'CREATE TABLE dbo.fct_orders_new',
    'WITH (DISTRIBUTION = HASH(customer_id), CLUSTERED COLUMNSTORE INDEX)',
    'AS SELECT * FROM stg.orders;',
    '',
    'RENAME OBJECT dbo.fct_orders TO fct_orders_old;',
    'RENAME OBJECT dbo.fct_orders_new TO fct_orders;',
    'DROP TABLE dbo.fct_orders_old;',
    'UPDATE STATISTICS dbo.fct_orders;'
  ].join('\n');

  var DIAG_SQL = [
    '-- rows and space in each of the 60 distributions of a table',
    "DBCC PDW_SHOWSPACEUSED('dbo.fct_orders');",
    '',
    '-- the latest requests, with the label that the query set',
    'SELECT TOP 20 request_id, status, total_elapsed_time, [label]',
    'FROM sys.dm_pdw_exec_requests',
    'ORDER BY submit_time DESC;',
    '',
    '-- the steps of one request: look for ShuffleMoveOperation and BroadcastMoveOperation',
    'SELECT step_index, operation_type, row_count, total_elapsed_time',
    'FROM sys.dm_pdw_request_steps',
    "WHERE request_id = 'QID1234'",
    'ORDER BY step_index;'
  ].join('\n');

  var BUG_HASH = [
    'CREATE TABLE dbo.fct_orders',
    'WITH (DISTRIBUTION = HASH(status), CLUSTERED COLUMNSTORE INDEX)',
    'AS',
    'SELECT order_id, customer_id, status, total_eur',
    'FROM stg.orders;'
  ].join('\n');
  var FIX_HASH = BUG_HASH.replace('HASH(status)', 'HASH(customer_id)');

  var BUG_LOOP = [
    'for row in orders:',
    '    cursor.execute("INSERT INTO dbo.fct_orders (order_id, customer_id, total_eur) VALUES (?, ?, ?)", row)',
    'connection.commit()'
  ].join('\n');
  var FIX_LOOP = [
    '# write the rows to Parquet files in the lake, then load them in parallel',
    'cursor.execute("""',
    '    COPY INTO stg.orders',
    "    FROM 'https://stbrewlinelakeprod.dfs.core.windows.net/staging/orders/*.parquet'",
    "    WITH (FILE_TYPE = 'PARQUET', CREDENTIAL = (IDENTITY = 'Managed Identity'))",
    '""")',
    'connection.commit()'
  ].join('\n');

  var SKEW_SQL = [
    'SELECT TOP 1',
    '       distribution_id,',
    '       row_count,',
    '       ROUND(row_count * 1.0 / AVG(row_count * 1.0) OVER (), 2) AS times_the_average',
    'FROM dist_rows',
    'ORDER BY row_count DESC;'
  ].join('\n');

  /* the hours that a pool is on in a month: about 730 in all */
  var H_ALL = 730, H_BIZ = 10 * 22, H_BIZ_LOAD = (10 + 2) * 22;

  LAB.addChapter({
    id: 'm8', n: 8, title: 'The dedicated SQL pool', short: 'Dedicated SQL pool', blurb: 'Sixty distributions, hash or copy, data movement, columnstore, loading, and when not to use a pool', minutes: 50,
    focus: ['mart', 'con', 'mon'],
    goals: [
      'Say how a **dedicated SQL pool** runs a query: control node, compute nodes and **60 distributions**.',
      'Choose **hash, round robin or replicated** for a table, and read **skew** from numbers.',
      'Predict **data movement** for a join, and say what **co-location** means.',
      'Choose between **columnstore, heap and a clustered index**, and see why 600,000 rows is too few.',
      'Load with **COPY INTO**, staging and CTAS, and keep **statistics** fresh.',
      'Run the pool: **pause, resume, scale**, and decide when serverless, Spark or Fabric is the better answer.'
    ],
    say: 'Mission 8 is the warehouse engine of Synapse. It splits every table into 60 pieces, and a query is fast only when the pieces line up. I counted how the 600,000 Brewline orders spread over 60 distributions for each possible hash column, and how many rows must move for a join. Synapse does not publish its hash, so I used MD5 as a stand-in, and the screens say so. The rules and the T-SQL come from the documentation.',
    scenes: [
      B.flow({
        id: 'm8-arch', t: 1, src: 'docs', title: 'How a dedicated pool runs a query', g: 'dedicated', legend: true,
        steps: [
          { say: 'A dedicated SQL pool is a warehouse engine that you size and pay for by the hour. Press Next to follow one query through it.', cap: 'A warehouse engine with a size.' },
          { say: 'Step 1. Your T-SQL goes to the control node. It is the front door: it parses the query, makes a plan, and splits the work into steps.', on: ['z1'], focus: ['cli', 'ct'], cap: 'The control node plans.' },
          { say: 'Step 2. The control node sends the steps to the compute nodes. Each compute node works on its share of the data, in parallel with the others.', on: ['z2'], focus: ['ct', 'n1', 'n2', 'n3'], cap: 'Compute nodes work in parallel.' },
          { say: 'Step 3. The data lives in 60 pieces called distributions, in Azure Storage. A compute node reads and writes the distributions that belong to it. How many each node owns depends on the size of the pool.', on: ['z3'], focus: ['n2', 'st'], cap: 'Data is stored in 60 distributions.' },
          { say: 'Step 4. When a join or a group needs rows that sit on other distributions, the pool moves them: a shuffle by a key, or a broadcast of a small table. Data movement is the cost to watch.', on: ['z4'], focus: ['n3', 'dm'], cap: 'Movement is the cost.' },
          { say: 'Step 5. Loading is parallel too. COPY INTO reads files from the lake and writes into the distributions from all the nodes at once.', on: ['z5'], focus: ['cp', 'n3'], cap: 'Load in parallel.' }
        ]
      }),

      B.talk({
        id: 'm8-sixty', t: 1, src: 'docs', title: 'Sixty distributions and the size of a pool',
        say: 'Everything in a dedicated pool follows from one number. Press Next for five facts about it.',
        items: [
          ['Always 60', 'Every table is split into 60 distributions, whatever its size, and the number does not change when you resize the pool. A table of ten rows is split into 60 pieces, and most are empty.', 'Sixty, for every table.'],
          ['Nodes and sizes', 'You pick a size in data warehouse units, written like DW500c. A bigger size adds compute nodes, and each node then owns fewer of the 60 distributions. DW1000c has 2 nodes with 30 distributions each, and the largest size has 60 nodes with one each.', 'More nodes, fewer pieces each.'],
          ['The slowest piece decides', 'A step ends when its slowest distribution finishes. If one distribution holds ten times the rows of the others, the other nodes wait for it. Evenness matters more than the average.', 'Parallel work is as slow as its slowest part.'],
          ['Storage and compute are apart', 'The data stays in Azure Storage. You can pause the pool and keep the data, and when you resume, compute is attached to the same 60 distributions.', 'Pause the compute, keep the tables.'],
          ['What you pay for', 'The compute size costs money for every hour that the pool is running. Storage costs money all the time, paused or not. Mission 12 puts numbers on a month.', 'Hours on, plus storage.']
        ],
        cols: 1
      }),

      B.widget({ id: 'm8-dist-lab', kind: 'distribution', t: 1, src: 'rec', title: 'Lab: spread the orders over 60 distributions' }),

      B.cmp({
        id: 'm8-place', t: 1, src: 'docs', title: 'Three ways to place a table',
        say: 'Every table gets one of three placements, chosen when you create it. Press Next to compare them.',
        cols: ['Placement', 'How rows are placed', 'Good for', 'Watch for'],
        hl: 1,
        rows: [
          ['Hash', 'A hash of one column picks the distribution, so rows with the same value land together', 'big fact tables that are joined or grouped on that column. The documentation suggests it for tables over 2 GB.', 'A column with few values, or one dominant value, gives skew. You cannot change the column without rebuilding the table.'],
          ['Round robin', 'Rows are dealt out in turn, evenly', 'staging tables and fast loads, and tables with no good hash column', 'It knows nothing about keys, so a join on any column moves data.'],
          ['Replicated', 'A full copy of the table on every compute node', 'small dimension tables that join to big facts. The documentation suggests tables under 2 GB.', 'Every write changes every copy, and the copies are rebuilt after a change. The first query after it can be slow.']
        ],
        steps: [
          { upto: 1, say: 'Hash is the choice for a big table. The lab showed that the column matters more than the idea.' },
          { upto: 2, say: 'Round robin is the neutral choice. It loads fast and joins badly.' },
          { upto: 3, say: 'Replicated is how small tables avoid data movement altogether.' }
        ],
        pick: '**Hash** the big fact on its main join column, **replicate** the small dimensions, and use **round robin** for staging. Test the hash column with the real data before you commit.'
      }),

      B.rows({
        id: 'm8-move', t: 1, src: 'rec', title: 'How many rows move for a join on customer_id',
        steps: [
          {
            say: 'Brewline joins orders to customers on customer_id. This table counts the order rows that sit on a different distribution than their customer. Hash the orders on customer_id and none do: each customer and their orders share a distribution, so the join is local. With any other placement, about 98 percent of the rows are elsewhere.',
            tabs: [{ layer: 'MOVEMENT', name: 'orders that are not on the distribution of their customer', c: 'mon', cols: ['orders are placed by', 'rows on another distribution', 'share of the ' + n0(D.rows) + ' rows'], rows: MV.cases.map(function (c) { return [c.how, n0(c.moved), (c.share * 100).toFixed(1) + '%']; }), chg: [[0, 1], [0, 2]], trk: 0 }],
            notes: ['Counted on the real orders with a stand-in hash: MD5 of the value as text, modulo 60. Synapse does not publish its hash, so the exact rows differ, but the share does not. ROUND_ROBIN is dealt out in turn by order number.']
          },
          {
            say: 'Moving the orders is the expensive way. The ' + n0(D.customers) + ' customers are a small table, so the pool can send a copy of them to every node and leave the big table where it is. Or you replicate the customers in advance, and nothing moves at query time.',
            tabs: [{ layer: 'OPTIONS', name: 'ways to line the two tables up', c: 'qual', cols: ['way', 'rows that move', 'what it costs'], rows: [
              ['Hash on customer_id at creation', '0', 'nothing at query time'],
              ['Shuffle the orders at query time', n0(mv('HASH(order_id)').moved), 'the big table crosses the network'],
              ['Broadcast the customers', n0(D.customers) + ' per node', 'small, so the pool prefers it'],
              ['Replicate the customers', '0', 'a copy per node, rebuilt on change']
            ], chg: [[0, 1], [3, 1]], trk: 1 }],
            notes: ['The pool decides which side to move from its estimates, so it needs statistics. With stale or missing statistics, it can shuffle a big table when a broadcast of a small one would do.']
          }
        ]
      }),

      B.cmp({
        id: 'm8-index', t: 1, src: 'docs', title: 'How a table is stored: columnstore, heap or index',
        say: 'Placement decides which distribution holds a row. A second choice decides how the rows are stored inside it. Press Next to compare the three.',
        cols: ['Storage', 'What it is', 'Good for', 'Watch for'],
        hl: 1,
        rows: [
          ['Clustered columnstore index', 'Columns stored and compressed in row groups. It is the default.', 'big fact tables that are scanned and aggregated', 'It needs rows to fill its row groups. A row group holds up to 1,048,576 rows, and each distribution builds its own.'],
          ['Heap', 'Rows in no particular order', 'staging tables that are loaded and read once', 'No index helps a lookup, and a large heap is slow to scan.'],
          ['Clustered rowstore index', 'Rows sorted by a key', 'small tables that are looked up by key, such as dimensions', 'A scan of a big table is slower than with a columnstore.']
        ],
        steps: [
          { upto: 1, say: 'The default, and the right one for a large fact table, because analytics read a few columns of many rows.' },
          { upto: 3, say: 'The other two suit staging and small tables. A mistake here is quiet: the pool still works, only slower and bigger.' }
        ],
        pick: 'Use a **clustered columnstore** for big facts, a **heap** for staging, and a **clustered index** for small tables that are looked up by key.'
      }),

      B.talk({
        id: 'm8-small', t: 1, src: 'rec', title: 'Is 600,000 rows enough for a columnstore?',
        say: 'Press Next for the arithmetic. It uses the recorded row counts and one number from the documentation, the size of a row group.',
        items: [
          ['The arithmetic', n0(D.rows) + ' rows over 60 distributions is ' + n0(PER) + ' rows in each. A row group holds up to ' + n0(ROWGROUP) + ' rows, so each distribution holds a row group that is about **' + (PER / ROWGROUP * 100).toFixed(1) + ' percent** full.', 'About one percent of a row group.'],
          ['What the documentation says', 'Row group quality is best near the maximum, and the documentation names about 100,000 rows as the floor for a good compressed row group. Ten thousand is far below it, so the data compresses badly and a scan opens many small groups.', 'Far below the floor.'],
          ['How many rows are enough', 'For every distribution to hold one full row group, a table needs ' + n0(ROWGROUP) + ' times 60, which is about ' + (FULL / 1e6).toFixed(0) + ' million rows. Below that, a columnstore has less to compress than it was built for.', 'Tens of millions of rows, at least.'],
          ['So what for Brewline', 'At ' + n0(D.rows) + ' rows a dedicated pool is the wrong tool. Serverless SQL over Parquet (mission 7) or a small Azure SQL database serves it with less to manage. A pool earns its place with hundreds of millions of rows.', 'Match the engine to the size.'],
          ['Small tables in a big pool', 'Even in a big pool, a dimension of ' + n0(D.customers) + ' rows should be replicated with a clustered index, or a heap. Only the big fact tables use columnstore.', 'One pool, several storage choices.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm8-ctas', t: 1, src: 'docs', title: 'CTAS: create a table with its placement and storage', file: 'create_tables.sql', lang: 'tsql', code: CTAS_SQL,
        steps: [
          { say: 'CTAS means create table as select. It is the preferred way to create and load a table in a dedicated pool, because the pool does the work in parallel. Press Next.', lines: null },
          { say: 'The `WITH` clause is where the two choices go. The first is the placement: `HASH(customer_id)` sends all of a customer\'s orders to the same distribution.', lines: G.span(CTAS_SQL, /DISTRIBUTION = HASH/) },
          { say: 'The second is the storage: a clustered columnstore index, which compresses the columns in row groups.', lines: G.span(CTAS_SQL, /CLUSTERED COLUMNSTORE/) },
          { say: 'After `AS` comes any query. Here it copies six columns from a staging table. The pool runs it on all nodes at once.', lines: G.span(CTAS_SQL, /^SELECT order_id/, /^FROM stg.orders/) },
          { say: 'The dimension is replicated, with a clustered rowstore index on its key. Every node gets a full copy, so a join from the fact table to it moves nothing.', lines: G.span(CTAS_SQL, /^CREATE TABLE dbo.dim_customers/, /^FROM stg.customers/) }
        ],
        note: 'T-SQL for a dedicated SQL pool, from the documentation. It was not run on Synapse. The table options `DISTRIBUTION` and `CLUSTERED COLUMNSTORE INDEX` are specific to Synapse, so sqlglot cannot parse them and the syntax checker could not check this file.'
      }),

      B.code({
        id: 'm8-copy', t: 1, src: 'docs', title: 'Load: COPY INTO a staging table, then CTAS', file: 'load_orders.sql', lang: 'tsql', code: COPY_SQL,
        steps: [
          { say: 'A good load has three steps, and each one has a reason. Press Next.', lines: null },
          { say: 'First a staging table. Round robin deals the rows out evenly, and a heap has no index to maintain, so the load is as fast as the pool can make it.', lines: G.span(COPY_SQL, /^CREATE TABLE stg.orders/, /^WITH \(DISTRIBUTION = ROUND_ROBIN/) },
          { say: '`COPY INTO` reads the files of March from the lake, in parallel from every node. The wildcards in the path pick the day folders, and the credential is the managed identity of the workspace, with no secret.', lines: G.span(COPY_SQL, /^COPY INTO/, /^\);/) },
          { say: 'Then a CTAS builds the final table with the right placement and storage, from the staging table, in parallel.', lines: G.span(COPY_SQL, /^CREATE TABLE dbo.fct_orders_new/, /^AS SELECT/) },
          { say: 'The swap is two renames and a drop, so readers see the old table, then the new one. The last statement refreshes the statistics, because the pool creates them but does not update them for you after a load.', lines: G.span(COPY_SQL, /^RENAME OBJECT dbo.fct_orders TO/, /^UPDATE STATISTICS/) }
        ],
        note: 'From the documentation, not run on Synapse. sqlglot parses the COPY INTO statement and cannot parse the table options. The identity of the workspace needs a role that can read the container, as in mission 7. Mission 5 explains why the load should be safe to repeat.'
      }),

      B.code({
        id: 'm8-diag', t: 2, src: 'docs', title: 'Find skew and data movement', file: 'diagnose.sql', lang: 'tsql', code: DIAG_SQL,
        steps: [
          { say: 'Three statements answer the two questions of this mission: is a table spread evenly, and did a query move data? Press Next.', lines: null },
          { say: '`DBCC PDW_SHOWSPACEUSED` lists the rows and the space in each of the 60 distributions. It is the check for skew. Take the biggest and divide by the average, as the lab did.', lines: G.span(DIAG_SQL, /PDW_SHOWSPACEUSED/) },
          { say: 'A DMV of requests lists the latest queries with their status and time. Set a label on important queries with `OPTION (LABEL = \'...\')`, and you can find them here.', lines: G.span(DIAG_SQL, /^SELECT TOP 20/, /^ORDER BY submit_time/) },
          { say: 'A DMV of steps lists what one request did, step by step. A `ShuffleMoveOperation` or a `BroadcastMoveOperation` with a large row count is data movement, and it is where the time went.', lines: G.span(DIAG_SQL, /^SELECT step_index/, /^ORDER BY step_index/) }
        ],
        note: 'From the documentation, not run. The request id in the example is made up. These views exist in a dedicated pool and not in a serverless pool.'
      }),

      B.talk({
        id: 'm8-ops', t: 1, src: 'docs', title: 'Running a pool: pause, scale, statistics and workloads',
        say: 'A pool is something you operate, not just query. Press Next for five habits.',
        items: [
          ['Pause and resume', 'Pausing stops the compute charge, and storage keeps billing. Resuming takes minutes. Automate it, with a pipeline or a runbook on a schedule, because a pool that someone forgot to pause is the most common surprise on the bill.', 'Pause on a schedule, not from memory.'],
          ['Scale', 'You change the size with a statement or in the portal. The pool restarts compute, so running queries are cancelled and open transactions roll back. Scale at a quiet time, and size for the load that you measured.', 'Resize at a quiet moment.'],
          ['Statistics', 'The pool creates statistics on columns for you, and it does not update them after a load. Stale statistics lead to wrong choices, such as a shuffle of a big table. Refresh the statistics of the big tables after every load.', 'Refresh after each load.'],
          ['Workload management', 'Workload groups reserve and cap resources, and classifiers send a user or a label to a group. Use them so that a heavy load job cannot starve the dashboards, and the other way round.', 'Reserve resources for the work that matters.'],
          ['Look at the plan', 'EXPLAIN and the request-step DMV show the movement steps. When a query is slow, look there before you buy a bigger size.', 'Read the plan before you scale.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm8-hours', t: 1, src: 'docs', title: 'Hours that you pay for',
        say: 'Compute is billed for every hour that the pool is on, so the schedule is a cost control. Press Next to count hours in a month. The arithmetic needs no price: multiply the hours by the price of your size.',
        cols: ['Schedule', 'Hours on in a month', 'Share of always on'],
        hl: 1,
        rows: [
          ['Always on', String(H_ALL), '100%'],
          ['Weekdays 08:00 to 18:00, paused outside', n0(H_BIZ), Math.round(H_BIZ / H_ALL * 100) + '%'],
          ['The same, plus a 2 hour load each night of the week', n0(H_BIZ_LOAD), Math.round(H_BIZ_LOAD / H_ALL * 100) + '%']
        ],
        steps: [
          { upto: 1, say: 'A month has about 730 hours. A pool that is never paused pays for all of them.' },
          { upto: 3, say: 'Pausing outside business hours cuts the compute hours by about two thirds. A nightly load adds a few hours and still leaves most of the saving.' }
        ],
        pick: 'Pause the pool **outside business hours**, and start it for the **nightly load**. Keep the schedule in a pipeline, with an alert if the pool is on when it should be paused.'
      }),

      B.decide({
        id: 'm8-dec', t: 2, src: 'docs', title: 'Decision: where should the orders warehouse live?',
        scenario: 'Brewline has **600,000 orders** now and expects **8 million** by next year. Twelve analysts run dashboards in business hours. The team knows T-SQL and has two engineers. Finance wants a bill that is easy to predict.',
        opts: [
          { t: 'A dedicated SQL pool, always on, with the orders hashed on customer_id', d: 'A real warehouse, with T-SQL that the team knows.', lose: 'At this size each distribution holds a few thousand rows, so a columnstore has little to compress, and you pay for every hour whether anyone queries or not.' },
          { t: 'Keep Parquet in the lake, query it with a serverless pool, and write small gold tables with CETAS', d: 'You pay for the data processed, with no pool to size, pause or resize. Gold tables keep the dashboards cheap, and the files stay open for other engines.' },
          { t: 'A dedicated SQL pool, paused outside business hours', d: 'About a third of the hours of an always-on pool.', lose: 'Cheaper, but the tables are still far too small for 60 distributions. Resuming takes minutes, so the first query of the morning waits.' }
        ],
        pick: 1,
        why: 'Even at 8 million orders there are about ' + n0(Math.round(8000000 / 60)) + ' rows in each distribution, above the floor of a good row group and a long way from a full one. A serverless pool over Parquet bills for bytes and has nothing to pause. The lake stays in open formats, so the choice can change later.',
        when: 'A dedicated pool, or a Fabric warehouse, earns its place with hundreds of millions of rows, heavy joins between big tables, and many people who need fast answers all day. Decide with measured queries and the example prices of your region.'
      }),

      B.quiz({
        id: 'm8-q1', t: 1,
        q: 'How many distributions does a table in a dedicated SQL pool have?',
        opts: [
          { t: 'One for each compute node', fb: 'The number of nodes changes with the size of the pool. The number of distributions does not.' },
          { t: '60, for every table, whatever its size', fb: '' },
          { t: 'As many as there are rows', fb: 'A distribution is a piece of storage, not a row.' },
          { t: 'You choose between 1 and 60 when you create the table', fb: 'It is fixed. You choose the placement.' }
        ],
        ok: 1, why: 'Every table is split into 60 distributions, and a bigger pool gives each compute node fewer of them. A table of ten rows still has 60, and most are empty.'
      }),

      B.quiz({
        id: 'm8-q2', t: 1,
        q: 'A table of customers has 12,000 rows, rarely changes, and joins to a big fact table. Which placement fits?',
        opts: [
          { t: 'Round robin', fb: 'A join on any column then moves data.' },
          { t: 'Hash on the customer id', fb: 'It works if the fact is hashed on the same column, but for a small table there is a simpler choice.' },
          { t: 'Replicated', fb: '' },
          { t: 'Hash on the region', fb: 'A column with few values gives skew.' }
        ],
        ok: 2, why: 'A small table that rarely changes can have a full copy on every node, so a join to it moves nothing. The documentation suggests it for tables under 2 GB.'
      }),

      B.quiz({
        id: 'm8-q3', t: 1,
        q: 'In the recording, HASH(channel) used a column with 3 values. How many of the 60 distributions were empty?',
        opts: [
          { t: '0', fb: 'With 3 values there are at most 3 different hash results.' },
          { t: String(CHANNEL.empty), fb: '' },
          { t: '3', fb: 'Three distributions hold rows. The others are empty.' },
          { t: '30', fb: 'The number is not half. At most 3 hold rows.' }
        ],
        ok: 1, why: 'Equal values hash to the same distribution, so 3 values fill at most 3 distributions, and the other ' + CHANNEL.empty + ' stay empty. The busiest one held ' + CHANNEL.skew.toFixed(1) + ' times the average.'
      }),

      B.quiz({
        id: 'm8-q4', t: 1,
        q: 'Both tables are hashed on customer_id, and the join is on customer_id. How many order rows must move?',
        opts: [
          { t: 'None. The rows with the same customer are on the same distribution', fb: '' },
          { t: 'About a half', fb: 'They are already together, so nothing needs to move.' },
          { t: 'All of them, every time', fb: 'That happens when the tables are placed by different columns.' },
          { t: 'Only the rows of the busiest customer', fb: 'A hot customer causes skew, not movement.' }
        ],
        ok: 0, why: 'This is co-location. In the recording, hashing the orders on customer_id gave **0 of ' + n0(D.rows) + '** rows on the wrong distribution, against ' + n0(mv('HASH(order_id)').moved) + ' with any other column.'
      }),

      B.quiz({
        id: 'm8-q5', t: 1,
        q: 'You pause a dedicated SQL pool for the weekend. What stops being charged?',
        opts: [
          { t: 'Everything, including storage', fb: 'The data stays in Azure Storage, which is still billed.' },
          { t: 'The compute. Storage is still billed', fb: '' },
          { t: 'Only the queries that were running', fb: 'A pool is billed by the hour while it is on, not by query.' },
          { t: 'Nothing, because pausing is only a flag', fb: 'Pausing releases the compute.' }
        ],
        ok: 1, why: 'Compute is billed for the hours that the pool is on. A paused pool keeps its data in storage, which keeps billing. That is why pausing on a schedule is the cheapest saving.'
      }),

      B.quiz({
        id: 'm8-q6', t: 2,
        q: 'A table of 600,000 rows has a clustered columnstore index in a pool. How full is each distribution\'s row group, at best?',
        opts: [
          { t: 'About 1 percent, 10,000 of the 1,048,576 rows that a group can hold', fb: '' },
          { t: 'About 60 percent', fb: 'Sixty is the number of distributions, not a percent.' },
          { t: 'Full, because columnstore packs rows tightly', fb: 'Each distribution builds its own groups, and it has only about 10,000 rows.' },
          { t: 'It depends on the hash column only', fb: 'The hash column changes the spread, and the average is still 10,000.' }
        ],
        ok: 0, why: n0(D.rows) + ' divided by 60 is ' + n0(PER) + '. A row group holds up to ' + n0(ROWGROUP) + ' rows, so each is about 1 percent full, far below the 100,000 rows that the documentation names as the floor for a good row group.'
      }),

      B.order({
        id: 'm8-ord', t: 1, q: 'Put the monthly load of the orders fact table in order.',
        items: [
          'Create a round robin heap staging table',
          'COPY INTO the staging table from the Parquet files in the lake',
          'CTAS the final table from staging, hashed on customer_id with a clustered columnstore index',
          'Swap the new table in with RENAME OBJECT',
          'Update the statistics of the new table',
          'Check the row count against the files, and the skew with DBCC PDW_SHOWSPACEUSED'
        ],
        why: 'Staging is built to load fast, and the final table is built from it with the placement and storage that queries need. The swap makes the new table visible at once, statistics are refreshed because the pool does not do it after a load, and the checks catch a wrong count or a skewed placement before the dashboards do.'
      }),

      B.bug({
        id: 'm8-bug', t: 1, src: 'rec', q: 'The fact table was created, and one distribution holds more than half of the rows while 56 are empty. Click the line that causes it.',
        file: 'create_fact.sql', lang: 'tsql', code: BUG_HASH, bad: [2],
        hint: 'How many different values does the hash column have?',
        why: 'The `status` column has ' + STATUS.distinct + ' values, so at most ' + STATUS.distinct + ' distributions can hold rows. In the recording **' + STATUS.empty + ' of 60** were empty, and the busiest held **' + STATUS.skew.toFixed(1) + ' times** the average, because most orders are COMPLETED. Hash on the join column, `customer_id`, which spreads over all 60 with a skew of ' + CUST.skew.toFixed(2) + '.',
        fix: FIX_HASH,
        cheer: 'A hash column needs many values and no dominant one.'
      }),

      B.bug({
        id: 'm8-bug2', t: 2, src: 'docs', q: 'A script loads 2 million rows into the pool in one night, and it takes hours. Click the line that is the problem.',
        file: 'load_rows.py', lang: 'python', code: BUG_LOOP, bad: [2],
        hint: 'How many statements does this send to the control node?',
        why: 'Each insert is a separate statement through the control node, so the load runs one row at a time and leaves tiny row groups behind. A dedicated pool loads fast with `COPY INTO` from files in the lake, because every node reads in parallel. Write the rows to Parquet files first, then load them in one statement.',
        fix: FIX_LOOP,
        cheer: 'Load files in parallel, never rows one by one.'
      }),

      B.challenge({
        id: 'm8-ch', t: 2, title: 'Coding round: find the busiest distribution', file: 'skew.sql', lang: 'sql',
        q: 'The table `dist_rows` holds the rows of each of the 60 distributions of the orders table when it is hashed on customer_id. **Write a query that returns the busiest distribution, its row count, and how many times the average it is**, rounded to two decimals.',
        data: [{ name: 'dist_rows (60 rows, the first 8 shown)', cols: ['distribution_id', 'row_count'], rows: CUST.buckets.slice(0, 8).map(function (n, i) { return [String(i + 1), n0(n)]; }).concat([['...', '...']]) }],
        starter: '-- the busiest distribution and its ratio to the average\nSELECT ...\nFROM dist_rows',
        hints: ['Sort by `row_count` in descending order and keep one row.', 'An average over the whole table, next to each row, is a window function with an empty `OVER ()`.', 'Multiply by 1.0 so that the division is not an integer division.'],
        sol: SKEW_SQL,
        res: { msg: '1 row', cols: ['distribution_id', 'row_count', 'times_the_average'], rows: [[String(BUSIEST), n0(CUST.max), CUST.skew.toFixed(2)]] },
        expl: ['`AVG(row_count * 1.0) OVER ()` puts the average of the whole table on every row, so the ratio needs no subquery.', 'The `* 1.0` turns the integers into decimals, so that the division does not round down to a whole number.', 'The busiest of the 60 holds ' + n0(CUST.max) + ' rows, against an average of ' + n0(PER) + ', so the pool waits for it ' + CUST.skew.toFixed(2) + ' times as long as a perfectly even table. The counts come from the recording, with a stand-in hash.', 'On a real pool, `DBCC PDW_SHOWSPACEUSED` gives the same kind of list for a table, and you put it in a temporary table first.'],
        cx: 'One pass over 60 rows. The point is the ratio: it is the number to watch after every change of the hash column.'
      }),

      B.incident({
        id: 'm8-inc', t: 2, src: 'docs', title: 'Incident: a report went from 20 seconds to 12 minutes', time: '09:15',
        alert: '**The revenue report took 20 seconds all last month, and this morning it takes 12 minutes.** Nothing was released. A teammate changed the customers table from REPLICATED to ROUND_ROBIN last night, to make the nightly load faster. The fact table is hashed on customer_id.',
        clues: ['The report joins the fact table to customers', 'The step list of the slow request shows a big shuffle', 'The only change was the placement of the dimension'],
        opts: [
          { t: 'Rebuild the dimension as REPLICATED with CTAS, update the statistics, and check in the request steps that the shuffle is gone', fb: '' },
          { t: 'Scale the pool up to a bigger size', fb: 'More nodes move the rows faster, and the move is still there. It also raises the hourly bill.' },
          { t: 'Add a nonclustered index to the fact table', fb: 'An index does not change where the rows live.' },
          { t: 'Hash the dimension on the region column', fb: 'The join column decides. A different column leaves the rows in the wrong place.' }
        ],
        best: 0,
        why: 'The recording shows the effect: with the right placement **0** order rows move, and with any other about **98 percent** would. A round robin dimension is not on the distribution of any fact row, so the pool has to move one side for every run. Replicated puts a copy on every node, so the join is local again.',
        checks: [
          ['Find the slow request', 'sys.dm_pdw_exec_requests, newest first, with the label of the report.'],
          ['Read its steps', 'sys.dm_pdw_request_steps: a ShuffleMoveOperation with a large row count.'],
          ['Compare with last month', 'What changed? The placement of the dimension.'],
          ['Fix it', 'CTAS the table back as REPLICATED, swap it in, and update the statistics.'],
          ['Prevent it', 'Put table placement in code review, and run a plan check on the main reports after a change.']
        ],
        tell: 'The report slowed down because someone changed the customers table from replicated to round robin to speed up a load, and the join to the fact table then had to move rows for every run, which I saw as a large shuffle step in the request steps. I rebuilt the dimension as replicated with a CTAS, refreshed the statistics, and checked that the shuffle was gone and the time was back to twenty seconds. Table placement is now reviewed in pull requests, and the main reports have a plan check after each deployment.',
        prevent: ['Review **placement changes** like code', 'Check **request steps** after a change', 'Keep **statistics** fresh', 'Do not **resize** to fix movement']
      }),

      B.incident({
        id: 'm8-inc2', t: 2, src: 'docs', title: 'Incident: the pool ran all weekend', time: '08:40',
        alert: '**The Synapse line of the bill is three times its usual amount this month.** On Friday afternoon an engineer scaled the dedicated pool up for a test, and then went on leave. The pool was on, at the larger size, until Monday morning, and nobody was asked.',
        clues: ['A dedicated pool bills for every hour that it is on', 'The size was raised for a test and not lowered', 'No alert warned anyone'],
        opts: [
          { t: 'Pause and resume the pool on a schedule from a pipeline, put a budget alert on the resource group, and tag each pool with its owner', fb: '' },
          { t: 'Delete the pool and use serverless for everything', fb: 'It ends the problem and the dashboards that need a pool. Decide with a measurement, not in a hurry.' },
          { t: 'Ask engineers to remember to pause it', fb: 'It worked until the next Friday. A schedule and an alert do not forget.' },
          { t: 'Lock the resource group so that nobody can scale', fb: 'It stops the next test, and it also stops the next fix. Controls should warn, and not block the people who run the pool.' }
        ],
        best: 0,
        why: 'The bill follows hours and size, so the control is a schedule and an alert. A pipeline pauses the pool every evening and resumes it before the load, a budget alert on the resource group warns when spend passes a limit, and the owner tag says whom to ask. Mission 12 builds the budgets.',
        checks: [
          ['Read the bill by resource', 'Which resource and which size account for the jump?'],
          ['Find the cause', 'The activity log shows who scaled the pool, and when.'],
          ['Stop the spend', 'Scale down or pause now.'],
          ['Automate the habit', 'A scheduled pause and resume, and an alert if the pool is on out of hours.'],
          ['Add the guard', 'A budget alert and an owner tag on every pool.']
        ],
        tell: 'The bill tripled because a dedicated pool was scaled up on Friday for a test and left running over the weekend. I scaled it down, found the change in the activity log, and replaced the habit with a schedule: a pipeline pauses the pool every evening and resumes it before the nightly load. I added a budget alert on the resource group and an owner tag on each pool, so that a pool that is on out of hours becomes an alert and not an invoice.',
        prevent: ['**Pause** on a schedule', '**Alert** on spend and on a pool that is on out of hours', '**Tag** every pool with an owner', 'Scale **back** after a test']
      }),

      B.qa({
        id: 'qa-dedicated', t: 1, tag: 'Synapse', secs: 75,
        q: 'How does a dedicated SQL pool work, and how is it billed?',
        pts: ['A control node plans the query and sends steps to compute nodes', 'Data is stored in 60 distributions in Azure Storage, for every table', 'The size, in DWUs, sets the number of compute nodes', 'Data movement is the cost: shuffles and broadcasts', 'Billed for the size for every hour that the pool is on, plus storage', 'Pause stops the compute charge and keeps the data'],
        short: 'A dedicated SQL pool is a warehouse engine with a control node and compute nodes. The control node parses a query, plans it and splits it into steps, and the compute nodes run the steps in parallel. The data is stored in Azure Storage in 60 distributions for every table, whatever its size. The size of the pool, in data warehouse units, sets how many compute nodes there are, so a bigger pool gives each node fewer of the 60.\n\nThe cost to watch is data movement. When a join or a group needs rows from other distributions, the pool shuffles them by a key or broadcasts a small table.\n\nI pay for the size for every hour that the pool is on, plus storage all the time. Pausing stops the compute charge and keeps the data, so I pause on a schedule.',
        fu: [
          ['What decides the speed of a step?', 'The slowest distribution. An uneven placement makes every other node wait.'],
          ['Does resizing change the 60?', 'No. It changes how many nodes share them.']
        ],
        trap: 'Thinking that a bigger size fixes a bad placement. Data movement stays.',
        real: 'Describe a query that you made faster in a warehouse, and what you measured.'
      }),

      B.qa({
        id: 'qa-distribution', t: 1, tag: 'Synapse', secs: 90,
        q: 'How do you choose the distribution of a table?',
        pts: ['Hash for big facts, on a column used in joins and GROUP BY', 'The column needs many values, no dominant one, and it is not a filter column', 'Replicated for small dimensions that join to big facts, under about 2 GB', 'Round robin for staging and when no column is good', 'Test with the real data: skew and empty distributions', 'You cannot change a hash column without rebuilding the table'],
        short: 'For a large fact table I use hash, on a column that is used in joins and in GROUP BY, with many different values and no value that dominates, and not one that people filter on with equality, because a filter then hits one distribution. Small dimensions that join to the big table are replicated, which the documentation suggests for tables under about 2 GB, so that a join moves nothing. Staging tables are round robin, which loads fast.\n\nI test the hash column on real data and not on a guess. On the Brewline orders I counted how the rows fall over 60 distributions with a stand-in hash: order_id was perfectly even, customer_id was 1.86 times the average with none empty, and status left 56 of 60 empty. The best column is the one that is also the join column, when it spreads well.\n\nA hash column cannot be changed without rebuilding the table, so I decide with data, and I check the skew with DBCC PDW_SHOWSPACEUSED after the load.',
        fu: [
          ['What if no column is good?', 'Round robin for the fact table, replicated dimensions, and accept some movement. Measure it.'],
          ['What is skew?', 'Rows that are unevenly spread. The busiest distribution sets the speed of a step.']
        ],
        trap: 'Hashing on a column with few values, such as status, because it looks natural.',
        real: 'Describe how you chose a distribution key, and how you checked it.'
      }),

      B.qa({
        id: 'qa-movement', t: 2, tag: 'Synapse', secs: 75,
        q: 'What is data movement in a dedicated pool, and how do you find and fix it?',
        pts: ['Rows that move between distributions so that a join or group can run', 'Shuffle by a key, or broadcast of a small table', 'Co-location: tables hashed on the same join column need no movement', 'Find it in the request steps: ShuffleMoveOperation, BroadcastMoveOperation', 'Fix it with placement: hash on the join column, replicate small tables', 'Keep statistics fresh so the pool picks the cheaper side'],
        short: 'A join or a group by needs the rows with the same key on the same distribution. If they are not there, the pool moves them: a shuffle that re-hashes rows by a key, or a broadcast that copies a small table to every node. That is the main cost of a slow warehouse query.\n\nI find it in the request steps, with the DMV for steps of a request, where a ShuffleMoveOperation or a BroadcastMoveOperation with a big row count shows where the time went. I fix it with the placement: hash the big tables on the main join column so that they are co-located, and replicate the small dimensions. In my recording, hashing the orders on customer_id left 0 of 600,000 rows on the wrong distribution, and any other column left about 98 percent.\n\nI also keep statistics fresh, because the pool chooses which side to move from its estimates.',
        fu: [
          ['Is a broadcast bad?', 'Not for a small table. It is cheap, and the pool prefers it. A shuffle of a big table is the expensive case.'],
          ['Would a bigger size help?', 'Not for the movement. It makes the move faster and leaves it there.']
        ],
        trap: 'Scaling the pool before reading the steps of the slow request.',
        real: 'Describe a slow query that turned out to be data movement.'
      }),

      B.qa({
        id: 'qa-columnstore', t: 2, tag: 'Synapse', secs: 75,
        q: 'When do you use a columnstore, a heap or a clustered index, and what size of table is too small?',
        pts: ['Clustered columnstore: big facts that are scanned and aggregated', 'Heap: staging tables loaded and read once', 'Clustered index: small tables looked up by key', 'A row group holds up to 1,048,576 rows, built in each of 60 distributions', 'Under about 100,000 rows per row group is poor quality', 'A table needs tens of millions of rows for columnstore to pay off'],
        short: 'A clustered columnstore is the default and the right choice for a big fact table that is scanned and aggregated, because it stores columns compressed in row groups. A heap is for staging tables that are loaded and read once. A clustered rowstore index fits a small table that is looked up by key, such as a dimension.\n\nThe size matters. A row group holds up to 1,048,576 rows, and each of the 60 distributions builds its own, so a table needs about 60 million rows before every distribution has a full row group. The documentation names about 100,000 rows as the floor for a good one. The Brewline orders, 600,000 rows, give 10,000 rows in each distribution, which is about one percent of a row group, so a columnstore there has almost nothing to compress.\n\nSo for small tables I use a heap or a clustered index, and for a small warehouse I question the dedicated pool altogether.',
        fu: [
          ['What about partitions?', 'Partitions split the table again. Too many make row groups even smaller, so partition only big tables, and by a coarse key such as the month.'],
          ['What is the alternative for small data?', 'Serverless SQL over Parquet, an Azure SQL database, or a Fabric warehouse, depending on the size and the users.']
        ],
        trap: 'Using the defaults on a small table and wondering why compression is poor.',
        real: 'Describe how you decided that a table was too small for a columnstore.'
      }),

      B.qa({
        id: 'qa-load-dedicated', t: 1, tag: 'Synapse', secs: 75,
        q: 'How do you load data into a dedicated SQL pool?',
        pts: ['COPY INTO from files in the lake, in parallel from every node', 'A round robin heap staging table, then CTAS into the final table', 'The managed identity of the workspace as the credential, with no secret', 'Never row by row with INSERT', 'Swap the new table in, and refresh statistics after the load', 'Make the load safe to repeat'],
        short: 'I load files, not rows. COPY INTO reads Parquet or CSV files from the lake, in parallel from every compute node, and I sign in with the managed identity of the workspace so that no secret is involved. I load into a staging table that is round robin and a heap, because that is the fastest to write, and then I build the final table with CTAS, with the placement and storage that queries need, hashed on the join column with a clustered columnstore.\n\nThen I swap the new table in with a rename, refresh the statistics, because the pool does not update them after a load, and check the row count and the skew. A script that inserts one row at a time sends every row through the control node and leaves tiny row groups behind, so I never do that.\n\nI make the load safe to repeat: the dated folder, or a rebuild of a whole table, so that a retry gives the same result.',
        fu: [
          ['Why a staging table?', 'It loads fast, and the CTAS then builds the final table in parallel with the right placement.'],
          ['Which tool starts the load?', 'A Data Factory or Synapse pipeline, with COPY INTO or a copy activity that uses it.']
        ],
        trap: 'Loading straight into a hashed columnstore table with many small inserts.',
        real: 'Describe a load that you made faster, with the numbers.'
      }),

      B.qa({
        id: 'qa-engine-choice', t: 2, tag: 'Architecture', secs: 90,
        q: 'Serverless SQL, a dedicated pool, Spark or Fabric: how do you choose?',
        pts: ['Serverless: files in the lake, pay for data processed, no pool to run', 'Dedicated: a warehouse with its own copy, sized and paid by the hour, for very large data and many users', 'Spark: heavy transformation, Delta, code-first work, machine learning', 'Fabric: one product with a lakehouse, a warehouse and Power BI, billed by capacity', 'Decide by data size, concurrency, skills and cost shape', 'Keep the data in open formats so that the choice can change'],
        short: 'I start from the size of the data, the number of users, the skills of the team and the shape of the cost. For files in a lake and a modest number of queries, a serverless SQL pool is the simplest: no pool to run, and I pay for the data processed. For heavy transformations, Delta and code-first work I use Spark. A dedicated SQL pool fits a very large warehouse, hundreds of millions of rows and more, with many users and heavy joins, where it is worth paying for a size by the hour, pausing it when idle, and designing placement. Fabric puts a lakehouse, a warehouse and Power BI in one product, billed by capacity, and it is where Microsoft is investing, so I look at it first for a new platform.\n\nFor Brewline, with 600,000 orders today, I would pick serverless over Parquet with small gold tables, and revisit when the numbers justify more.\n\nIn all cases I keep the data in Parquet or Delta, so that the engine can change later.',
        fu: [
          ['When is a dedicated pool clearly right?', 'Hundreds of millions of rows, heavy joins between big tables, many concurrent users, and a team that will design placement and run the pool.'],
          ['What do you re-check first?', 'The current support dates and pricing of each service, because both change.']
        ],
        trap: 'Choosing the engine by name and not by the size of the data.',
        real: 'Describe a platform choice that you made, and what you measured to make it.'
      }),

      B.recap({
        id: 'm8-recap', n: 8, badge: 'Pool Planner', color: '#FED7AA',
        pts: [
          'A dedicated pool splits **every table into 60 distributions**. A step ends when the **slowest** one finishes, so an even spread matters.',
          '**Hash** the big fact on its join column, **replicate** small dimensions, use **round robin** for staging. Test the column: status left 56 of 60 empty.',
          'Joins are fast when the rows are **co-located**. Hashing on customer_id left **0** order rows to move, and any other column left about **98 percent**.',
          'A **columnstore** needs tens of millions of rows. 600,000 rows give 10,000 per distribution, about **1 percent** of a row group.',
          'Load with **COPY INTO** and **CTAS**, refresh **statistics**, **pause** on a schedule, and read the **request steps** before you scale.'
        ],
        lines: [
          'I choose the hash column with data, not with a feeling.',
          'I read the plan before I buy a bigger size.',
          'I match the engine to the size of the data.'
        ]
      })
    ]
  });
})();
