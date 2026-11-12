/* Mission 11: indexes, plans and performance. Every plan is a real EXPLAIN (ANALYZE) from PostgreSQL, DuckDB or SQLite on 30,000 orders. The row counts are real.
   Times are not shown, because they change from run to run. PostgreSQL's cost numbers are removed from the text and its estimated row count stays. */
(function () {
  var B = LAB.b, G = LAB.get;
  var L = G.counts('m11.lab'), ST = G.counts('m11.status_rows'), OP = G.counts('m11.other_point'), CV = G.counts('m11.covering'), ES = G.counts('m11.estimates'), JN = G.counts('m11.joins'), PG = G.counts('m11.pagination'), SZ = G.counts('m11.sizes');
  function R(sc, d) { return L.lab[sc].runs[d]; }
  function cm(t) { return t.split('\n').map(function (l) { return '-- ' + l; }).join('\n'); }
  function kb(n) { return Math.round(n / 1024).toLocaleString('en-US') + ' kB'; }
  function n(v) { return Number(v).toLocaleString('en-US'); }
  function pct(a, b) { return (a / b * 100).toFixed(1).replace(/\.0$/, ''); }
  function sameRows(a, b) { return JSON.stringify(a.rows) === JSON.stringify(b.rows); }
  var CR = G.on('m11.ch_range', 'duckdb'), CRC = G.on('m11.ch_range_cast', 'duckdb'), CS = G.on('m11.ch_sargable', 'duckdb'), CSB = G.on('m11.ch_sargable_bad', 'duckdb'), CK = G.on('m11.ch_keyset', 'duckdb');

  G.expect(L.table_rows === '30000' || L.table_rows === 30000, 'the plans ran on 30,000 orders');
  G.expect(ST.paid === '27315' || ST.paid === 27315, 'status rows: paid 27315');
  G.expect(R('point', 'none').scan === 'Seq Scan' && R('point', 'none').rows_read === 30000 && R('point', 'order_id').scan === 'Index Scan' && R('point', 'order_id').rows_read === 1 && R('point', 'order_id').rows_matched === 1, 'a point lookup reads 30,000 rows without an index and 1 with it');
  G.expect(R('paid', 'status').scan === 'Seq Scan' && R('paid', 'status').rows_matched === 27315 && R('cancelled', 'status').scan === 'Bitmap Heap Scan' && R('cancelled', 'status').rows_read === 1500 && R('pending', 'status').scan === 'Index Only Scan' && R('pending', 'status').rows_read === 285, 'with an index on status the planner scans for paid, uses a bitmap for cancelled and an index-only scan for pending');
  G.expect(R('range', 'store').rows_read === 7500 && R('range', 'ts').rows_read === 2317 && R('range', 'store_ts').rows_read === 579 && R('range', 'ts_store').rows_read === 579 && R('range', 'none').rows_read === 30000 && R('range', 'store_ts').rows_matched === 579, 'the week and store query reads 30000, 7500, 2317, 579 and 579 table rows for the five designs');
  G.expect(/shared hit=261/.test(R('range', 'store').buffers) && /shared hit=45/.test(R('range', 'ts').buffers) && /shared hit=40/.test(R('range', 'store_ts').buffers) && /shared hit=47/.test(R('range', 'ts_store').buffers), 'the pages touched: 261, 45, 40 and 47');
  G.expect(R('latest', 'none').scan === 'Seq Scan' && /^Index Scan/.test(R('latest', 'ts').scan) && R('latest', 'ts').rows_read === 10, 'the 10 latest orders read 10 rows through the index on order_ts');
  G.expect(/^Index Only Scan/.test(CV.index_only) && /Heap Fetches: 0/.test(CV.index_only) && /^Bitmap Heap Scan/.test(CV.index_scan), 'a covering index gives an index-only scan with 0 heap fetches');
  G.expect(/estimated rows=150\)/.test(ES.expr_before) && /actual rows=4285/.test(ES.expr_before) && /estimated rows=4285\)/.test(ES.expr_after) && /estimated rows=23023\)/.test(ES.stale) && /actual rows=27315/.test(ES.stale) && /estimated rows=27315\)/.test(ES.fresh), 'the estimate was 150 for 4285 rows and then 4285, and 23023 for 27315 rows and then 27315');
  G.expect(/Hash Join/.test(JN['default']) && /Merge Join/.test(JN.merge) && /Nested Loop/.test(JN.nested) && /loops=750/.test(JN.nested) && /HASH_JOIN/.test(JN.duckdb) && /AUTOMATIC COVERING INDEX/.test(JN.sqlite), 'hash join by default, merge join and nested loop when forced, a hash join on DuckDB and an automatic index on SQLite');
  G.expect(PG.same_page === true && /actual rows=20020/.test(PG.offset) && /actual rows=20 loops=1\)\n +Index Cond/.test(PG.keyset), 'OFFSET read 20,020 index entries and the keyset read 20, for the same page');
  G.expect(SZ.table === 2097152 && SZ.order_id === 688128 && SZ.customer_id === 303104 && SZ.status === 229376, 'index sizes');
  G.expect(/scanned 15664/.test(OP.duckdb.none) && /scanned 1,/.test(OP.duckdb.index) && /^QUERY PLAN\n`--SCAN big_orders/.test(OP.sqlite.none) && /SEARCH big_orders USING INDEX o_order_id/.test(OP.sqlite.index), 'DuckDB and SQLite plans for the point lookup');
  G.expect(CR.rows[0][0] === '1' && CRC.rows[0][0] === '1' && sameRows(CS, CSB) && CS.rows.length === 4 && CK.rows.map(function (r) { return r[0]; }).join() === '1005,1006,1007,1008,1009', 'the coding rounds');

  var PLAN_POINT = [cm('SELECT * FROM big_orders WHERE order_id = 12345'), '-- PostgreSQL ' + G.meta('postgres') + ', no index', R('point', 'none').plan, '', '-- PostgreSQL after CREATE INDEX o_order_id ON big_orders (order_id)', R('point', 'order_id').plan, '',
    '-- DuckDB ' + G.meta('duckdb') + ', no index', OP.duckdb.none, '-- DuckDB with the index', OP.duckdb.index, '', '-- SQLite ' + G.meta('sqlite') + ', EXPLAIN QUERY PLAN, no index', OP.sqlite.none, '-- SQLite with the index', OP.sqlite.index].join('\n');
  var PLAN_SEL = ['-- an index on status; the table has ' + n(L.table_rows) + ' orders', "-- status = 'paid': " + n(ST.paid) + ' orders, ' + pct(ST.paid, L.table_rows) + ' percent', R('paid', 'status').plan, '', "-- status = 'cancelled': " + n(ST.cancelled) + ' orders, ' + pct(ST.cancelled, L.table_rows) + ' percent', R('cancelled', 'status').plan, '', "-- status = 'pending': " + n(ST.pending) + ' orders, ' + pct(ST.pending, L.table_rows) + ' percent', R('pending', 'status').plan].join('\n');
  var PLAN_COMP = [cm(L.lab.range.sql), '-- index on (store_id, order_ts), with BUFFERS', R('range', 'store_ts').buffers, '', '-- index on (order_ts, store_id), with BUFFERS', R('range', 'ts_store').buffers].join('\n');
  var PLAN_COV = [cm(CV.query), '-- an index on (customer_id) INCLUDE (order_id), after VACUUM', CV.index_only, '', cm(CV.other_query), '-- the same index columns, but the query also needs total', CV.index_scan].join('\n');
  var PLAN_EST = [cm(ES.expr_query), '-- no statistics for the expression', ES.expr_before, '', '-- after CREATE INDEX ON big_orders ((order_id % 7)) and ANALYZE', ES.expr_after, '', cm(ES.stale_query), '-- the table grew from 300 to 30,000 rows after the last ANALYZE', ES.stale, '', '-- after ANALYZE', ES.fresh].join('\n');
  var PLAN_JOIN = [cm(JN.query), '-- the plan the planner chose', JN['default'], '', '-- with hash joins and nested loops switched off, so the planner must merge', JN.merge, '', '-- with an index on o.customer_id and hash and merge joins switched off', JN.nested, '', '-- DuckDB ' + G.meta('duckdb'), JN.duckdb, '', '-- SQLite ' + G.meta('sqlite'), JN.sqlite].join('\n');
  var PLAN_PAGE = [cm(PG.offset_query), PG.offset, '', cm(PG.keyset_query), PG.keyset].join('\n');
  var PLAN_EXPLAIN = [cm(L.lab.paid.sql), R('paid', 'none').plan].join('\n');
  function res(key, e) { var t = e ? G.on(key, e) : G.table(key); return { msg: t.rows.length + ' rows', cols: t.cols, rows: t.rows }; }

  LAB.addChapter({
    id: 'm11', n: 11, title: 'Indexes and plans', short: 'Plans', blurb: 'Read EXPLAIN ANALYZE, see when an index helps and when it is ignored, composite and covering indexes, statistics, join algorithms and pagination', minutes: 60,
    focus: ['mon', 'int'],
    goals: [
      'Read an **EXPLAIN ANALYZE** plan: the scan type, the estimated rows and the real rows.',
      'Predict when an **index** helps, and when the planner ignores it.',
      'Order the columns of a **composite index**, and use a **covering index**.',
      'Explain why wrong **estimates** give bad plans, and what ANALYZE does.',
      'Recognise the three **join algorithms**, and paginate without a deep OFFSET.'
    ],
    say: 'Mission 11 is about speed, and the first rule is to look before you guess. Every plan in this mission is a real EXPLAIN ANALYZE on 30,000 orders. I did not record times, because they change from run to run. The row counts do not change, and they tell the story: how many rows the engine read, how many it needed and how many it expected.',
    scenes: [
      B.talk({
        id: 'm11-what', t: 1, src: 'docs', title: 'Look at the plan before you tune',
        say: 'Press Next for six ideas about indexes and plans.',
        items: [
          ['A plan is the recipe of a query', 'The planner picks how to read each table, how to join them and how to sort. EXPLAIN shows the plan. EXPLAIN ANALYZE also runs the query and shows the real row counts.', 'Read before you change.'],
          ['An index is a sorted copy of some columns', 'It lets the engine find rows by a value without reading the whole table. It costs disk space, and every write must update it.', 'Faster reads, slower writes.'],
          ['The planner works from estimates', 'It keeps statistics about each table: row counts and the spread of values. It estimates how many rows a filter keeps, and chooses the cheapest plan. Stale or missing statistics give wrong plans.', 'Estimates drive the choice.'],
          ['Selectivity decides', 'An index pays when the filter keeps few rows. If the filter keeps most of the table, reading everything in order is cheaper than jumping around through an index.', 'Few rows: index. Most rows: scan.'],
          ['Composite and covering indexes', 'An index on two columns is sorted by the first, then by the second, so column order matters. An index that holds every column the query needs answers it without touching the table.', 'Order the columns, cover the query.'],
          ['Join algorithms and pagination', 'The planner joins with a hash join, a merge join or a nested loop. And a deep OFFSET reads every row that it skips.', 'Three joins, one trap.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm11-flow', t: 2, src: 'docs', title: 'How a query becomes rows', g: 'planner', legend: true,
        steps: [
          { say: 'A query goes through five stages before you see a row. Press Next to follow it.', tags: ['tg_p1'] },
          { say: 'Step 1. You send the SQL text.', on: ['n1'], focus: ['p_sql', 'p_parse'], cap: 'SQL.' },
          { say: 'Step 2. The engine parses it, checks the names and the types, and expands views.', on: ['n2'], focus: ['p_parse', 'p_plan'], cap: 'Parse.' },
          { say: 'Step 3. The planner compares ways to run it. It uses statistics about the tables and the indexes that exist, and picks the plan with the lowest estimated cost.', on: ['n5'], focus: ['p_stats', 'p_plan'], cap: 'Choose a plan.' },
          { say: 'Step 4. The executor runs the plan and returns the rows.', on: ['n3', 'n4'], focus: ['p_plan', 'p_exec', 'p_rows'], tags: ['tg_p2'], cap: 'Run.' }
        ]
      }),

      B.code({
        id: 'm11-explain', t: 1, src: 'rec', title: 'Reading a plan', file: 'EXPLAIN (ANALYZE) on PostgreSQL ' + G.meta('postgres'), lang: 'text', code: PLAN_EXPLAIN,
        steps: [
          { say: 'The query counts the paid orders of the 30,000. A plan is a tree, and it reads from the inside out. The first line is the top of the tree.' },
          { say: 'The innermost node does the work. `Seq Scan on big_orders` reads the table from start to end. It returned ' + n(R('paid', 'none').rows_matched) + ' rows and removed the rest with the filter.', lines: G.span(PLAN_EXPLAIN, /Seq Scan on big_orders/, /Rows Removed by Filter/) },
          { say: '`estimated rows` is what the planner expected, and `actual rows` is what happened. Here both are close, which is why the plan is a good one.', lines: G.span(PLAN_EXPLAIN, /Seq Scan on big_orders/) },
          { say: 'The top node, `Aggregate`, turns those rows into the single count. Rows read: 30,000. Rows that matched: ' + n(R('paid', 'none').rows_matched) + '.', lines: G.span(PLAN_EXPLAIN, /^Aggregate/) }
        ],
        note: 'The plans show shapes and row counts. Times are not recorded. PostgreSQL cost numbers are left out, and its estimated row count is kept.'
      }),

      B.code({
        id: 'm11-point', t: 1, src: 'rec', title: 'One order by id: scan or index', file: 'EXPLAIN (ANALYZE) on three engines', lang: 'text', code: PLAN_POINT,
        steps: [
          { say: 'One order out of 30,000, by its id. The first lines show the query. Then the plan without an index and with one, on three engines.' },
          { say: 'PostgreSQL without an index reads the whole table: ' + n(R('point', 'none').rows_read) + ' rows read for 1 row returned.', lines: G.span(PLAN_POINT, /^Seq Scan on big_orders/, /Rows Removed by Filter/) },
          { say: 'With the index, PostgreSQL reads 1 row. An `Index Scan` goes straight to the row.', lines: G.span(PLAN_POINT, /^Index Scan using o_order_id/, /Index Cond/) },
          { say: 'DuckDB scanned ' + /scanned (\d+)/.exec(OP.duckdb.none)[1] + ' rows without the index, because it skips blocks whose minimum and maximum rule the value out. With the index it scanned 1.', lines: G.span(PLAN_POINT, /DuckDB .*no index/, /scanned 1, rows 1/) },
          { say: 'SQLite says `SCAN` without the index and `SEARCH ... USING INDEX` with it. The words differ, and the idea is the same.', lines: G.span(PLAN_POINT, /SQLite .*no index/, /SEARCH big_orders USING INDEX/) }
        ]
      }),

      B.widget({ id: 'm11-lab-plan', kind: 'plan', t: 1, src: 'rec', title: 'Lab: six queries, with and without an index' }),

      B.bug({
        id: 'm11-bug-lowcard', t: 1, title: 'Bug hunt: the index that is never used',
        q: 'A report counts the paid orders. Someone added `CREATE INDEX o_status ON big_orders (status)` to speed it up. The query is no faster, and EXPLAIN shows ' + R('paid', 'status').scan + ' with ' + n(R('paid', 'status').rows_read) + ' rows read. Click the line that is the wrong fix.',
        file: 'fix.sql', lang: 'sql',
        code: ['CREATE INDEX o_status ON big_orders (status);', "SELECT count(*) FROM big_orders WHERE status = 'paid';"].join('\n'),
        bad: [1], hint: 'How much of the table has status paid?',
        why: 'Paid is ' + pct(ST.paid, L.table_rows) + ' percent of the table. Reading 27,315 rows through an index means jumping around the table, which costs more than reading it once in order, so the planner ignored the index. An index helps when the filter keeps a small share: the same index was used for pending (285 rows) and for cancelled (1,500 rows).',
        fix: ["-- no index needed: the query reads most of the table", "SELECT count(*) FROM big_orders WHERE status = 'paid';"].join('\n'),
        cheer: 'An index is for few rows. Most rows want a scan.'
      }),

      B.code({
        id: 'm11-selectivity', t: 2, src: 'rec', title: 'Selectivity: the same index, three answers', file: 'EXPLAIN (ANALYZE) on PostgreSQL ' + G.meta('postgres'), lang: 'text', code: PLAN_SEL,
        steps: [
          { say: 'One index on `status`. Three queries that differ only in the value. The planner decides each time from the share of rows that match.' },
          { say: 'Paid is ' + pct(ST.paid, L.table_rows) + ' percent. PostgreSQL chose a `Seq Scan`: reading everything once is cheaper.', lines: G.span(PLAN_SEL, /status = 'paid'/, /Rows Removed by Filter/) },
          { say: 'Cancelled is ' + pct(ST.cancelled, L.table_rows) + ' percent, ' + n(ST.cancelled) + ' rows. It used a `Bitmap Heap Scan`: the index finds the matching pages, and the table is read page by page.', lines: G.span(PLAN_SEL, /status = 'cancelled'/, /Index Cond/) },
          { say: 'Pending is ' + pct(ST.pending, L.table_rows) + ' percent, ' + n(ST.pending) + ' rows. It used an `Index Only Scan`: the index alone holds the status, and nothing in the table had to be read for a count.', lines: G.span(PLAN_SEL, /status = 'pending'/, /Index Cond|Heap Fetches/) }
        ]
      }),

      B.quiz({
        id: 'm11-q-index', t: 1, q: 'The table has 30,000 rows and an index on `status`. For which filter did PostgreSQL still scan the whole table?',
        opts: [
          { t: "status = 'paid', which keeps 91 percent of the rows", fb: '' },
          { t: "status = 'pending', which keeps 285 rows", fb: 'For pending it used the index: an index-only scan that read 285 rows.' },
          { t: "status = 'cancelled', which keeps 1,500 rows", fb: 'For cancelled it used a bitmap scan on the index and read 1,500 rows.' },
          { t: 'None: an index is always used', fb: 'The planner uses an index only when its estimated cost is lower. For paid it was not.' }
        ],
        ok: 0, why: 'When a filter keeps most of the table, reading the table once from start to end is cheaper than looking up 27,315 rows one by one. The plan for paid was a Seq Scan that read all 30,000 rows, with the index in place.'
      }),

      B.code({
        id: 'm11-composite', t: 2, src: 'rec', title: 'Composite index: the order of the columns', file: 'EXPLAIN (ANALYZE, BUFFERS) on PostgreSQL ' + G.meta('postgres'), lang: 'text', code: PLAN_COMP,
        steps: [
          { say: 'Orders of store 2 in one week. Both indexes hold the same two columns. They differ in which one comes first. BUFFERS counts the pages that the plan touched.' },
          { say: 'Index on `(store_id, order_ts)`: the equality column first, then the range. It touched ' + R('range', 'store_ts').buffers.match(/shared hit=(\d+)/)[1] + ' pages, and the index part only ' + R('range', 'store_ts').buffers.match(/Bitmap Index Scan[\s\S]*?shared hit=(\d+)/)[1] + '.', lines: G.span(PLAN_COMP, /store_id, order_ts\), with BUFFERS/, /shared hit=4/) },
          { say: 'Index on `(order_ts, store_id)`: the range column first. It touched ' + R('range', 'ts_store').buffers.match(/shared hit=(\d+)/)[1] + ' pages, and the index part ' + R('range', 'ts_store').buffers.match(/Bitmap Index Scan[\s\S]*?shared hit=(\d+)/)[1] + ': the index walks the whole week and filters the store inside it.', lines: G.span(PLAN_COMP, /order_ts, store_id\), with BUFFERS/, /shared hit=11/) },
          { say: 'Both read the same 579 table rows. The saving is in the index. For comparison, an index on `store_id` alone touched ' + R('range', 'store').buffers.match(/shared hit=(\d+)/)[1] + ' pages and read ' + n(R('range', 'store').rows_read) + ' table rows, and an index on `order_ts` alone read ' + n(R('range', 'ts').rows_read) + '.' }
        ],
        note: 'The rule of thumb: equality columns first, then the range column. The numbers here come from one query on one data set. Try your own queries with EXPLAIN.'
      }),

      B.quiz({
        id: 'm11-q-order', t: 2, q: 'A query filters on `store_id = 2` and on a range of `order_ts`. Which index order did the recorded plan touch fewer pages with?',
        opts: [
          { t: '(order_ts, store_id)', fb: 'It touched 47 pages and 11 of them in the index.' },
          { t: '(store_id, order_ts)', fb: '' },
          { t: 'They touched the same pages', fb: 'The pages differ: 40 against 47. The table rows read were the same, 579.' },
          { t: 'Neither: both were ignored', fb: 'Both were used, as bitmap scans.' }
        ],
        ok: 1, why: 'With the equality column first, the matching entries for store 2 sit together in the index, and the range narrows them further. With the range column first, the index walks every store of that week. The recording touched 40 pages against 47.'
      }),

      B.code({
        id: 'm11-covering', t: 2, src: 'rec', title: 'A covering index: no visit to the table', file: 'EXPLAIN (ANALYZE) on PostgreSQL ' + G.meta('postgres'), lang: 'text', code: PLAN_COV,
        steps: [
          { say: 'An index can hold more columns than it searches by. `INCLUDE (order_id)` stores the order id in the index entry. A query that needs only those columns never visits the table.' },
          { say: 'The first query needs `customer_id` and `order_id`. PostgreSQL used an `Index Only Scan`, and `Heap Fetches: 0` says that it did not read the table at all. The table had been vacuumed, so every page was known to be visible.', lines: G.span(PLAN_COV, /^Index Only Scan/, /Heap Fetches: 0/) },
          { say: 'The second query also needs `total`, which the index does not hold. Now the engine has to read the table rows, and it used a `Bitmap Heap Scan` over 10 pages.', lines: G.span(PLAN_COV, /^Bitmap Heap Scan/, /Index Cond/) }
        ],
        note: 'An index-only scan needs the table pages to be marked visible, which VACUUM does. Right after a bulk load PostgreSQL shows a number of heap fetches, as the join plan later in this mission does.'
      }),

      B.code({
        id: 'm11-estimates', t: 2, src: 'rec', title: 'Estimated rows against actual rows', file: 'EXPLAIN (ANALYZE) on PostgreSQL ' + G.meta('postgres'), lang: 'text', code: PLAN_EST,
        steps: [
          { say: 'The planner estimates how many rows a filter keeps. When the estimate is far from the truth, it can pick a bad plan. Two cases, side by side.' },
          { say: 'A filter on an expression, `order_id % 7 = 0`. The planner has no statistics for an expression, and guessed 150 rows. The real answer was 4,285.', lines: G.span(PLAN_EST, /no statistics for the expression/, /Rows Removed by Filter/) },
          { say: 'After an index on that expression and an ANALYZE, the planner had statistics for it. The estimate became 4,285, the same as the truth, and the plan changed to an index scan.', lines: G.span(PLAN_EST, /after CREATE INDEX ON big_orders/, /Index Cond/) },
          { say: 'A table that grew after its last ANALYZE: 300 rows then, 30,000 now. The planner still believed what ANALYZE had seen and estimated ' + n(/estimated rows=(\d+)\) \(actual rows=27315/.exec(ES.stale)[1]) + ' for 27,315 real rows.', lines: G.span(PLAN_EST, /the table grew from 300/, /Rows Removed by Filter/) },
          { say: 'After ANALYZE the estimate was 27,315. Statistics are the planner\'s eyes, and they go stale when the data changes a lot.', lines: G.span(PLAN_EST, /^-- after ANALYZE/, /Rows Removed by Filter/) }
        ],
        note: 'The stale case here is mild. The estimate was off by 16 percent. A table that grows from 10 rows to 10 million before the next ANALYZE gives estimates that are off by many orders of magnitude.'
      }),

      B.quiz({
        id: 'm11-q-est', t: 2, q: 'A plan shows `estimated rows=150` and `actual rows=4285` on the same node. What does it tell you?',
        opts: [
          { t: 'The query is correct, and the numbers will match later', fb: 'The estimate is the planner\'s guess. It does not change by itself.' },
          { t: 'The planner\'s guess was far off, so check statistics and conditions on expressions', fb: '' },
          { t: 'The index is corrupt', fb: 'An estimate error is about statistics, not about damage to an index.' },
          { t: 'The query returned the wrong rows', fb: 'The result is right. The planner only expected fewer rows than it got.' }
        ],
        ok: 1, why: 'The planner estimated 150 rows and 4,285 came back. A gap this large can make it choose a nested loop or a plan that suits a few rows. Common causes are stale statistics, a condition on an expression and columns that depend on each other. ANALYZE, or statistics on the expression, fixed it in the recording.'
      }),

      B.code({
        id: 'm11-joins', t: 2, src: 'rec', title: 'Three join algorithms', file: 'EXPLAIN (ANALYZE) on PostgreSQL, DuckDB and SQLite', lang: 'text', code: PLAN_JOIN,
        steps: [
          { say: 'Orders of customers in Singapore: 750 customers and 30,000 orders. The planner chose a plan. Then the recorder switched off its choice, to show the alternatives that PostgreSQL can use.' },
          { say: 'The planner chose a `Hash Join`: it built a hash table of the 750 customers and probed it with the 30,000 orders. Both tables were read once.', lines: G.span(PLAN_JOIN, /^Aggregate/, /Rows Removed by Filter: 2250/) },
          { say: 'A `Merge Join` sorts both sides on the join key and walks them together. It needed two Sort nodes. It suits inputs that are already sorted.', lines: G.span(PLAN_JOIN, /with hash joins and nested loops switched off/, /Sort Method: quicksort  Memory: 769kB/) },
          { say: 'A `Nested Loop` takes each customer and looks up its orders through an index. `loops=750` says that the inner side ran 750 times, 10 rows each. It wins when the outer side is small and the inner side has an index.', lines: G.span(PLAN_JOIN, /with an index on o.customer_id/, /Heap Fetches/) },
          { say: 'DuckDB used a hash join. SQLite has no hash join: it built a temporary `AUTOMATIC COVERING INDEX` on the orders and looked up each customer in it.', lines: G.span(PLAN_JOIN, /-- DuckDB/, /AUTOMATIC COVERING INDEX/) }
        ],
        note: 'The merge and the nested loop were forced with settings, to show them. By default PostgreSQL chose the hash join. A planner setting is a test tool, not a fix for production.'
      }),

      B.code({
        id: 'm11-pagination', t: 2, src: 'rec', title: 'Pagination: OFFSET against a keyset', file: 'EXPLAIN (ANALYZE) on PostgreSQL ' + G.meta('postgres'), lang: 'text', code: PLAN_PAGE,
        steps: [
          { say: 'Page 1,001 of a list with 20 rows on a page. Two ways to ask for it. Both returned the same 20 rows. An index on `order_id` exists.' },
          { say: '`OFFSET 20000` produced 20,020 rows from the index scan and threw 20,000 of them away. The work grows with the page number.', lines: G.span(PLAN_PAGE, /OFFSET 20000/, /Heap Fetches: 20020/) },
          { say: 'The keyset form, `WHERE order_id > 20000`, jumps to the place in the index and reads 20 rows. The work does not depend on how deep the page is.', lines: G.span(PLAN_PAGE, /order_id > 20000/, /Heap Fetches: 20/) }
        ],
        note: 'Keyset pagination needs a stable unique order, and the client must remember the last id it saw. It cannot jump to page 500, but it is the right form for a feed or an export.'
      }),

      B.bug({
        id: 'm11-bug-offset', t: 2, title: 'Bug hunt: the export that gets slower every page',
        q: 'An export job reads orders in pages of 1,000 with `LIMIT 1000 OFFSET n`. The first pages are fast. The pages near the end take minutes. Click the line that makes later pages slower.',
        file: 'export.sql', lang: 'sql',
        code: ['SELECT order_id, customer_id, total', 'FROM big_orders', 'ORDER BY order_id', 'LIMIT 1000 OFFSET :n;'].join('\n'),
        bad: [4], hint: 'How many rows does the engine produce and discard for a late page?',
        why: 'OFFSET makes the engine produce all the skipped rows and drop them. In the recording, page 1,001 produced 20,020 index entries to return 20 rows. A keyset condition, `WHERE order_id > :last_id`, starts at the right place in the index and reads only the rows of the page.',
        fix: ['SELECT order_id, customer_id, total', 'FROM big_orders', 'WHERE order_id > :last_id', 'ORDER BY order_id', 'LIMIT 1000;'].join('\n'),
        cheer: 'Remember where you stopped, and start from there.'
      }),

      B.bug({
        id: 'm11-bug-func', t: 1, title: 'Bug hunt: the function that hides the index',
        q: 'The table has an index on `order_ts`. A query asks for one day with `WHERE CAST(order_ts AS DATE) = DATE \'2026-02-10\'`. EXPLAIN shows a Seq Scan that removed about 29,669 rows. Click the line that stops the index from working.',
        file: 'one_day.sql', lang: 'sql',
        code: ['SELECT count(*)', 'FROM big_orders', "WHERE CAST(order_ts AS DATE) = DATE '2026-02-10';"].join('\n'),
        bad: [3], hint: 'What does the index store: the date or the full timestamp?',
        why: 'The index is sorted by the timestamp. A cast of the column makes the engine evaluate the function for every row, so PostgreSQL cannot search the index and scans the table. Compare the bare column with a half-open range: it used a bitmap index scan on 331 rows in mission 7. This is called a non-sargable filter.',
        fix: ['SELECT count(*)', 'FROM big_orders', "WHERE order_ts >= TIMESTAMP '2026-02-10 00:00:00' AND order_ts < TIMESTAMP '2026-02-11 00:00:00';"].join('\n'),
        cheer: 'Leave the column bare, and put the arithmetic on the other side.'
      }),

      B.cmp({
        id: 'm11-sizes', t: 2, src: 'rec', title: 'What an index costs on disk',
        say: 'The table and five indexes, measured on PostgreSQL. Press Next for each.',
        cols: ['Object', 'Size on disk', 'Share of the table'],
        hl: 1,
        rows: [
          ['The table big_orders (30,000 rows)', kb(SZ.table), '100 percent'],
          ['Index on order_id (30,000 distinct values)', kb(SZ.order_id), pct(SZ.order_id, SZ.table) + ' percent'],
          ['Index on order_ts (30,000 distinct values)', kb(SZ.order_ts), pct(SZ.order_ts, SZ.table) + ' percent'],
          ['Index on customer_id (3,000 distinct values)', kb(SZ.customer_id), pct(SZ.customer_id, SZ.table) + ' percent'],
          ['Index on status (5 distinct values)', kb(SZ.status), pct(SZ.status, SZ.table) + ' percent'],
          ['Index on (store_id, order_ts)', kb(SZ['store_id, order_ts']), pct(SZ['store_id, order_ts'], SZ.table) + ' percent']
        ],
        steps: [
          { upto: 1, say: 'The table is about 2 MB.' },
          { upto: 2, say: 'An index on a unique column is a third of the table.' },
          { upto: 3, say: 'An index on a timestamp is the same size here, because every value is different.' },
          { upto: 4, say: 'An index on a column with fewer distinct values is smaller: PostgreSQL stores a repeated value once and lists the rows after it.' },
          { upto: 5, say: 'An index on a column with 5 distinct values is tiny. It is still not useful for a filter that keeps most of the table.' },
          { upto: 6, say: 'An index on two columns is the biggest of the five. Every index also has to be updated on every INSERT, UPDATE of its columns and DELETE.' }
        ],
        pick: 'Add the indexes that your queries use, and drop the ones that they do not. Each one costs space and slows every write.'
      }),

      B.challenge({
        id: 'm11-ch-range', t: 1, title: 'Coding round: one day, without a function', file: 'one_day.sql', lang: 'sql',
        q: 'Count the **orders placed on 3 March 2026**, so that an index on `order_ts` could be used. Do not put a function around the column. Return one column, `orders`.',
        data: [{ name: 'orders (3 columns)', cols: G.cols('data.orders', ['order_id', 'order_ts', 'status']).cols, rows: G.cols('data.orders', ['order_id', 'order_ts', 'status']).rows, types: ['INTEGER', 'TIMESTAMP', 'VARCHAR'] }],
        starter: '-- orders of 3 March 2026\nSELECT ...',
        hints: ['Compare the bare column with the start of the day.', 'The end is the start of the next day, and it is not included.', '`order_ts >= ... AND order_ts < ...`'],
        sol: G.file('m11.ch_range'),
        res: res('m11.ch_range', 'duckdb'),
        expl: ['The half-open range takes everything from midnight of 3 March up to, but not including, midnight of 4 March.', 'The column is bare, so an index on `order_ts` can be searched. Order 1002 (09:40) is the one match.', 'The form `CAST(order_ts AS DATE) = DATE \'2026-03-03\'` returns the same count. On PostgreSQL it blocked the index in the recording.'],
        cx: 'With an index on `order_ts`, a range scan reads only the matching entries.'
      }),

      B.challenge({
        id: 'm11-ch-sargable', t: 1, title: 'Coding round: move the arithmetic off the column', file: 'big_orders.sql', lang: 'sql',
        q: 'A query uses `WHERE total * 2 > 30`, which stops an index on `total` from being used. Rewrite the filter so that the **column stands alone** and the query returns the same rows: order id and total, ordered by order id.',
        data: [{ name: 'orders (2 columns)', cols: G.cols('data.orders', ['order_id', 'total']).cols, rows: G.cols('data.orders', ['order_id', 'total']).rows, types: ['INTEGER', 'DECIMAL(10,2)'] }],
        starter: '-- same rows as WHERE total * 2 > 30, with the column alone\nSELECT ...',
        hints: ['Divide both sides by 2.', 'The column should be alone on the left of the comparison.', '`total > 15`'],
        sol: G.file('m11.ch_sargable'),
        res: res('m11.ch_sargable', 'duckdb'),
        expl: ['`total * 2 > 30` is the same as `total > 15`. The engine would have to compute `total * 2` for every row, which an index on `total` cannot help with.', 'With the column alone, a range scan on the index finds the rows. Four orders qualify: 1002, 1004, 1010 and 1011.', 'The old form returned the same four rows when I ran it.'],
        cx: 'An index range scan on `total`, instead of a computation for every row.'
      }),

      B.challenge({
        id: 'm11-ch-keyset', t: 2, title: 'Coding round: the next page, by keyset', file: 'next_page.sql', lang: 'sql',
        q: 'A client has shown the orders up to id 1004. Return the **next 5 orders**: order id, status and total, in order id order. Do not use OFFSET.',
        data: [{ name: 'orders (3 columns)', cols: G.cols('data.orders', ['order_id', 'status', 'total']).cols, rows: G.cols('data.orders', ['order_id', 'status', 'total']).rows, types: ['INTEGER', 'VARCHAR', 'DECIMAL(10,2)'] }],
        starter: '-- the 5 orders after id 1004\nSELECT ...',
        hints: ['Filter on the id that the client saw last.', 'Keep the order stable and unique: `ORDER BY order_id`.', '`LIMIT 5` takes the page.'],
        sol: G.file('m11.ch_keyset'),
        res: res('m11.ch_keyset', 'duckdb'),
        expl: ['`WHERE order_id > 1004` starts after the last order the client saw. The next page needs the last id of this one.', '`ORDER BY order_id LIMIT 5` returns 1005 to 1009. The order id is unique, so the pages never overlap or skip.', 'The work for a page does not grow with its position, unlike OFFSET.'],
        cx: 'An index range scan that starts at the key and stops after 5 rows.'
      }),

      B.decide({
        id: 'm11-dec-index', t: 2, title: 'Decision: which index for the week and store query?',
        scenario: 'A dashboard runs "orders of one store in one week" many times a minute on a table of 30 million orders. Without an index the query reads the whole table. Writes arrive all day, and the team does not want more indexes than needed.',
        opts: [
          { t: 'An index on store_id alone', d: 'Small and simple.', lose: 'A store holds a quarter of the table. The recorded plan read 7,500 table rows for the 579 it needed, and touched 261 pages.' },
          { t: 'An index on order_ts alone', d: 'Narrows the week.', lose: 'The week keeps 2,317 rows and the store filter then drops most of them. The recording read 2,317 table rows to return 579.' },
          { t: 'A composite index on (store_id, order_ts)', d: 'Equality column first, then the range.', lose: '' },
          { t: 'A separate index on every column of the table', d: 'Something will match.', lose: 'Each index costs disk space and slows every write, and the planner can only use a few of them for this query.' }
        ],
        pick: 2,
        why: 'The query has an equality filter on the store and a range on the time. A composite index with the equality column first lets the engine go straight to the entries of that store and that week: 579 table rows read and 40 pages touched in the recording, against 7,500 rows and 261 pages for the store index alone.',
        when: 'If the dashboard also filters by week alone, without a store, a separate index on the timestamp may still be worth its cost.'
      }),

      B.incident({
        id: 'm11-inc-stale', t: 2, time: '10:15',
        alert: 'A query that used to take a second now takes minutes after last night\'s load. The table grew a lot in the load. The query and the indexes did not change. The plan switched from an index scan to a nested loop over a huge number of rows.',
        clues: ['EXPLAIN ANALYZE shows `estimated rows` far below `actual rows` on a scan.', 'The last ANALYZE ran before the big load.', 'Autovacuum did not get to the table yet.'],
        opts: [
          { t: 'Add more memory to the database server', fb: 'The planner picked a plan that suits a few rows. Memory does not fix the choice.' },
          { t: 'Run ANALYZE on the table, then check that estimated rows match actual rows', fb: '' },
          { t: 'Rewrite the query with a different join order', fb: 'The cause is the estimate. Tricks may help once and break again.' },
          { t: 'Drop all the indexes and let it scan', fb: 'It removes the safety for every other query on the table.' }
        ],
        best: 1,
        why: 'The planner works from statistics. After a large load they describe the old table, so it estimates too few rows and picks a plan for that. In the recording a table that grew from 300 to 30,000 rows had an estimate of 23,023 for 27,315 real rows, and after ANALYZE the estimate was exact. ANALYZE refreshes the statistics, and EXPLAIN ANALYZE confirms it.',
        checks: [['Compare estimates and actual rows', 'Run EXPLAIN ANALYZE and look for a node where the two numbers differ by a large factor.'], ['Refresh statistics', 'ANALYZE the table. A bulk load job should run it at its end.'], ['Re-check the plan', 'The estimate should now match, and the plan should change.'], ['Prevent it', 'Add ANALYZE to the load job, and tune autovacuum for tables that change fast.']],
        tell: 'A query got slow after a big load. EXPLAIN ANALYZE showed estimated rows far below actual rows, and the last ANALYZE was from before the load. I ran ANALYZE on the table, the estimate matched the actual count, and the plan went back to the efficient one. I added ANALYZE to the end of the load job.',
        prevent: ['Run ANALYZE at the end of every bulk load.', 'Watch the gap between estimated and actual rows in slow query reviews.', 'Keep autovacuum on, and tune it for large, fast changing tables.']
      }),

      B.qa({
        id: 'qa-index-how', t: 1, tag: 'Indexes', secs: 60,
        q: 'What is an index and how does it speed up a query?',
        pts: ['A sorted structure over some columns', 'Find rows without reading the table', 'It costs space and slows writes', 'Only helps for selective filters'],
        short: 'An index is a sorted structure over one or more columns, usually a B-tree. The engine can search it by value and jump to the matching rows, so it does not read the whole table. In my test a lookup of one order by id read 30,000 rows without an index and 1 row with it. An index is not free: it takes disk space (an index on a unique column was about a third of the table) and every insert, update and delete has to maintain it. And it only helps when the filter keeps few rows. With an index on status, the planner still scanned the table for status paid, which is 91 percent of the rows.',
        fu: [['How do you know an index is used?', 'EXPLAIN or EXPLAIN ANALYZE. Look for Index Scan, Index Only Scan or Bitmap Index Scan, and compare the rows read with the rows needed.']],
        trap: 'Adding an index and not checking the plan.',
        real: 'Tell about a query you sped up with an index, and the plan before and after.'
      }),

      B.qa({
        id: 'qa-index-when', t: 1, tag: 'Indexes', secs: 60,
        q: 'When does an index not help?',
        pts: ['The filter keeps most of the table', 'A function or arithmetic on the column', 'Small tables', 'Wrong column order', 'Stale statistics'],
        short: 'Several cases. When the filter keeps most of the table: status paid kept 91 percent and the planner ignored the index. When a function or arithmetic wraps the column, such as a cast of the timestamp to a date or total * 2: the engine cannot search the index. On small tables, where a scan is cheap. When the columns of a composite index are in the wrong order for the query. And when the statistics are stale, so the planner picks a plan for the wrong number of rows. In each case I look at the plan before I add or drop anything.',
        fu: [['What is a non-sargable filter?', 'A filter that cannot use an index to search, because the indexed column is inside an expression. The fix is to leave the column bare.']],
        trap: 'Indexing every column "just in case".',
        real: 'Tell about an index that was never used, and how you found out.'
      }),

      B.qa({
        id: 'qa-explain', t: 1, tag: 'Plans', secs: 60,
        q: 'How do you read an EXPLAIN plan?',
        pts: ['A tree read from the inside out', 'Scan type, join type, estimated and actual rows', 'EXPLAIN ANALYZE runs the query', 'Rows read against rows returned'],
        short: 'A plan is a tree, and the innermost nodes run first. I look at how each table is read: Seq Scan, Index Scan, Index Only Scan or Bitmap Heap Scan. I look at how tables are joined: hash join, merge join or nested loop. And I compare estimated rows with actual rows on each node. EXPLAIN shows the plan the planner would use. EXPLAIN ANALYZE runs the query, so it adds actual rows and loops. Rows read against rows returned is the number I watch: 30,000 read for 1 returned means a missing index, and 579 read for 579 means a good one. I do not rely on times from one run, because they change.',
        fu: [['What does Rows Removed by Filter tell you?', 'How many rows the scan read and then threw away. A large number next to few returned rows suggests an index or a better filter.']],
        trap: 'Running EXPLAIN ANALYZE on a destructive statement, since ANALYZE really runs it.',
        real: 'Tell about a slow query that you diagnosed from its plan.'
      }),

      B.qa({
        id: 'qa-composite', t: 2, tag: 'Indexes', secs: 60,
        q: 'How do you choose the columns and their order in a composite index?',
        pts: ['Equality columns first', 'Then the range column', 'The leftmost column must be in the filter', 'A covering index with INCLUDE'],
        short: 'An index on two columns is sorted by the first column, and within it by the second. So a query can use it if the filter contains the leftmost column. I put columns with equality filters first and the range column last. For store 2 in one week, the index on (store_id, order_ts) touched 40 pages and the one on (order_ts, store_id) touched 47, with the same 579 table rows read. Single column indexes were worse: store_id alone read 7,500 table rows and order_ts alone read 2,317. For a query that needs only a few columns, I add them with INCLUDE so that the plan is an index-only scan with no heap fetches.',
        fu: [['Does the order matter for a query on the second column alone?', 'The index is much less useful, because the entries are sorted by the first column. A separate index may be needed.']],
        trap: 'Creating one index per column and expecting the planner to combine them well.',
        real: 'Tell about an index whose column order you changed.'
      }),

      B.qa({
        id: 'qa-estimates', t: 2, tag: 'Plans', secs: 60,
        q: 'Why do estimates matter, and what do you do when they are wrong?',
        pts: ['The planner chooses by estimated cost', 'Statistics describe the data', 'ANALYZE refreshes them', 'Expressions and correlated columns are hard to estimate'],
        short: 'The planner picks the plan with the lowest estimated cost, and the estimate comes from statistics: row counts and the spread of values. If the statistics are stale, the estimate is wrong and the plan may be wrong. In my test a table that grew from 300 to 30,000 rows had an estimate of 23,023 for 27,315 real rows, and after ANALYZE it was exact. A filter on an expression, order_id % 7 = 0, was estimated at 150 rows and returned 4,285, until I made an index on the expression and ran ANALYZE. When the gap between estimated and actual rows is large, I run ANALYZE first, then consider extended statistics or an expression index.',
        fu: [['When do you run ANALYZE?', 'After a bulk load or a large change, and autovacuum does it in the background for normal workloads.']],
        trap: 'Tuning the query when the real problem is stale statistics.',
        real: 'Tell about a plan that changed after a load.'
      }),

      B.qa({
        id: 'qa-joins', t: 2, tag: 'Plans', secs: 60,
        q: 'What join algorithms do engines use, and when is each one good?',
        pts: ['Hash join: build a hash table of the smaller side', 'Merge join: both sides sorted', 'Nested loop: lookup for each outer row', 'Different engines have different sets'],
        short: 'A hash join builds a hash table of the smaller input and probes it with the other one. It reads both tables once and is the usual choice for large unsorted inputs. A merge join sorts both inputs on the key and walks them together. It is good when they are already sorted, for example from an index. A nested loop looks up matching rows for each outer row, and it wins when the outer side is small and the inner side has an index. In my plan, PostgreSQL chose a hash join for 750 customers and 30,000 orders. With a nested loop forced, the inner index lookup ran 750 times. DuckDB used a hash join, and SQLite built a temporary index.',
        fu: [['How do you force a join type?', 'Only to experiment: PostgreSQL has settings such as enable_hashjoin. In production I fix statistics and indexes instead.']],
        trap: 'Forcing a join order or type with hints and forgetting about it.',
        real: 'Tell about a join that changed its algorithm and what happened.'
      }),

      B.qa({
        id: 'qa-pagination', t: 2, tag: 'Plans', secs: 60,
        q: 'Why is OFFSET slow for deep pages, and what do you use instead?',
        pts: ['OFFSET produces and discards the skipped rows', 'Work grows with the page number', 'Keyset pagination', 'Needs a unique stable order'],
        short: 'OFFSET asks the engine to produce all the rows before the page and throw them away. In my plan, page 1,001 with OFFSET 20000 produced 20,020 index entries to return 20 rows, and the cost grows with every page. Keyset pagination remembers the last key and asks for the rows after it: WHERE order_id > 20000 ORDER BY order_id LIMIT 20. That jumped to the right place in the index and produced 20 rows. Both returned the same page. Keyset needs a unique, stable sort key, or a pair such as time and id, and it cannot jump to an arbitrary page number, which is fine for feeds and exports.',
        fu: [['What if the sort key is not unique?', 'Sort by the key and a unique tie-breaker, and use both in the condition, so that no row is skipped or repeated.']],
        trap: 'Exporting a big table with LIMIT and OFFSET in a loop.',
        real: 'Tell about an export or an API that paged through a large table.'
      }),

      B.qa({
        id: 'qa-index-cost', t: 3, tag: 'Indexes', secs: 60,
        q: 'What does an index cost, and how do you decide how many to keep?',
        pts: ['Disk space', 'Slower writes', 'Planning time', 'Drop unused indexes', 'Measure with the plan and with usage statistics'],
        short: 'An index costs disk space, and it costs time on every write that touches its columns. In my measurement the table was 2,048 kB. An index on the unique order id was 672 kB, on the timestamp 672 kB, on (store_id, order_ts) 936 kB, and on customer_id with 3,000 distinct values 296 kB, because PostgreSQL stores repeated values once. More indexes also give the planner more plans to compare. So I keep the indexes that real queries use. I check plans for the important queries, look at the engine usage statistics to find indexes that are never scanned, and drop those. For a write heavy table I keep them few.',
        fu: [['How do you find unused indexes?', 'In PostgreSQL, the statistics view pg_stat_user_indexes shows how often each index was scanned. An index with no scans over a long time is a candidate to drop.']],
        trap: 'Keeping every index that someone ever added.',
        real: 'Tell about an index you dropped, and what you checked first.'
      }),

      B.recap({
        id: 'm11-recap', n: 11, badge: 'Plan Reader', color: '#FCD34D',
        pts: [
          '**EXPLAIN ANALYZE** shows scan types, estimated rows and actual rows. Compare **rows read** with **rows needed**: 30,000 against 1 means a missing index.',
          'An index helps when the filter is **selective**. Paid (91 percent) kept a Seq Scan, cancelled used a bitmap scan and pending an index-only scan.',
          'A **function or arithmetic on the column** stops the index. Keep the column bare, and use half-open ranges.',
          'A composite index puts **equality columns first**, then the range: 40 pages against 47 for the same 579 rows. **INCLUDE** can make an index-only scan with 0 heap fetches.',
          '**Estimates come from statistics**. 150 estimated for 4,285 real, and 23,023 for 27,315 after growth. ANALYZE fixed both.',
          'Joins are **hash**, **merge** or **nested loop**. A deep **OFFSET** read 20,020 entries for 20 rows. A keyset read 20. Every index costs space and slows writes.'
        ],
        lines: [
          'I read the plan before I change a query or add an index.',
          'I keep the column bare, and I write half-open ranges and keyset pages.',
          'I run ANALYZE after a bulk load and compare estimated rows with actual rows.'
        ]
      })
    ]
  });
})();
