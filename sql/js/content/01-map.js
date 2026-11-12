/* Mission 1: the map. What SQL is, the life of a query, the logical order of the clauses, aliases and what differs by engine, and how to read a plan for the first time.
   The stage tables, the revenue result, the alias results on three engines, the psql session and the three plans were recorded by running the queries. */
(function () {
  var B = LAB.b, G = LAB.get;
  var REV = G.table('m1.revenue'), CODE = G.file('m1.revenue'), ST = G.counts('m1.stages').stages;
  var AW = {}, AO = {}, AG = {};
  ['duckdb', 'postgres', 'sqlite'].forEach(function (e) {
    AO[e] = G.on('m1.alias_order', e); AG[e] = G.on('m1.alias_group', e);
  });
  AW.duckdb = G.on('m1.alias_where', 'duckdb'); AW.sqlite = G.on('m1.alias_where', 'sqlite'); AW.postgresError = G.text('m1.alias_where.postgres.error');
  var HAVING_ERR = G.text('m1.where_vs_having_error.error'), FIXED = G.table('m1.having_fixed');
  var PGPLAN = G.text('m1.plan.postgres'), DUCKPLAN = G.text('m1.plan.duckdb'), LITEPLAN = G.text('m1.plan.sqlite');
  G.expect(REV.rows.length === 2 && REV.rows[0][0] === 'SG' && REV.rows[0][1] === '5' && REV.rows[0][2] === '82.00' && REV.rows[1][0] === 'AU', 'the revenue query returns Singapore 5 orders 82.00, then Australia');
  G.expect(ST.length === 7 && ST[0].rows === 11 && ST[1].rows === 8 && ST[2].rows === 3 && ST[3].rows === 2 && ST[6].rows === 2, 'the stage row counts are 11, 8, 3, 2, 2, 2, 2');
  G.expect(AW.duckdb.rows.length === 4 && AW.sqlite.rows.length === 4 && /column "doubled" does not exist/.test(AW.postgresError), 'DuckDB and SQLite accept an alias in WHERE, PostgreSQL refuses');
  G.expect(AG.postgres.rows.length === 4 && AO.postgres.rows[0][0] === '1004', 'an alias works in GROUP BY and ORDER BY on all three engines');
  G.expect(/aggregate functions are not allowed in WHERE/.test(HAVING_ERR) && FIXED.rows.length === 2, 'PostgreSQL refuses an aggregate in WHERE, and the HAVING version finds two countries');
  G.expect(/Seq Scan on orders/.test(PGPLAN) && /Hash Join/.test(PGPLAN) && /SCAN orders/.test(DUCKPLAN) && /^QUERY PLAN/.test(LITEPLAN), 'the three plans have the shapes that the lessons describe');
  G.expect(/rows=9 width=\d+\) \(actual rows=9 loops=1\)\n\s+Filter: .*\n\s+Rows Removed by Filter: 3/.test(PGPLAN) && /HashAggregate .*rows=1 width=\d+\) \(actual rows=2 loops=1\)/.test(PGPLAN) && /Rows Removed by Filter: 1\n/.test(PGPLAN), 'the PostgreSQL plan: 9 rows pass the orders filter and 3 are removed, the groups were estimated at 1 and came out as 2, and HAVING removed 1');
  G.expect(/SCAN orders   \(filter: \(status = 'paid'\), scanned 12, rows 9\)/.test(DUCKPLAN) && /SCAN customers   \(filter: \(customer_id <= 7\), scanned 4, rows 4\)/.test(DUCKPLAN) && /^TOP_N/.test(DUCKPLAN), 'the DuckDB plan: orders scanned 12 and 9 passed, customers got a pushed filter and 4 rows were scanned, ORDER BY and LIMIT became TOP_N');
  var STORE = G.table('m1.ch_store_revenue');
  G.expect(STORE.rows.length === 3 && STORE.rows[0][0] === '1' && STORE.rows[0][1] === '5' && STORE.rows[0][2] === '82.00', 'paid revenue by store: store 1 has 5 orders and 82.00');

  LAB.addChapter({
    id: 'm1', n: 1, title: 'The map: how a query runs', short: 'Map', blurb: 'What SQL is, what an engine does with it, the order of the clauses, and your first plan', minutes: 40,
    focus: ['src', 'stg'],
    goals: [
      'Say that SQL is **declarative** and what that means for two queries that look different.',
      'Follow a query through the **parser, planner and executor**.',
      'List the clauses of a SELECT in the order they are **evaluated**, and explain why an alias fails in WHERE.',
      'Choose between **WHERE and HAVING**.',
      'Read the first lines of a **query plan**.'
    ],
    say: 'Mission 1 is the map. SQL looks like English, and that is the trap: you write the clauses in one order, and the engine thinks about them in another. If you know the real order, most beginner errors explain themselves. We also meet the three engines and read a plan for the first time.',
    scenes: [
      B.talk({
        id: 'm1-what', t: 1, src: 'docs', title: 'What SQL is',
        say: 'SQL is a language for asking questions about tables. Press Next for six ideas that the rest of the course builds on.',
        items: [
          ['Declarative', 'You describe the result you want. The engine chooses how to get it: which table to read first, which index to use, how to join. Two queries that mean the same thing can run in very different ways.', 'Say what, not how.'],
          ['Tables of rows', 'A table is a set of rows with the same columns. A set has no order. Unless you write ORDER BY, the order of the rows you get is not defined, even if it looked stable yesterday.', 'No ORDER BY, no order.'],
          ['Three kinds of statement', 'A **query** reads (`SELECT`). A **data statement** changes rows (`INSERT`, `UPDATE`, `DELETE`, `MERGE`). A **definition statement** changes the structure (`CREATE TABLE`, `ALTER TABLE`). Pipelines use all three.', 'Read, change, define.'],
          ['One language, many engines', 'The core is the same everywhere: SELECT, JOIN, GROUP BY, window functions. The edges differ: where NULLs sort, what `10 / 0` does, how dates work, whether an alias may be used in WHERE. Mission 13 maps the differences.', 'Learn the core once. Check the edges.'],
          ['Where the bugs are', 'Most SQL bugs in pipelines are not syntax errors. The query runs and the answer is wrong: a doubled total, a missing row, a filter that dropped NULLs. The other kind is a query that is right and far too slow.', 'Wrong totals and slow queries.'],
          ['Run it, do not guess', 'Everything in this course ran. When a screen shows rows, an engine returned them. When it shows a plan, an engine made it. Each screen says which engine.', 'A result is evidence. A guess is not.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm1-engine', t: 1, src: 'docs', title: 'The life of one query', g: 'engine', legend: true,
        steps: [
          { say: 'A query is only text until an engine works on it. Press Next to follow one query from the client to the rows that come back.' },
          { say: 'Step 1. The client sends the text. It can be psql, a notebook, a dashboard or a job. The engine receives characters and nothing else.', on: ['a1'], focus: ['q_cli', 'q_par'], cap: 'Text in.' },
          { say: 'Step 2. The parser checks the grammar and builds a syntax tree. Then the names are resolved against the catalog: does a table `orders` exist, does it have a column `total`, and what type is it? A typo fails here, before any data is touched.', on: ['a2', 'a5'], focus: ['q_par', 'q_cat'], cap: 'Typos fail early.' },
          { say: 'Step 3. The planner chooses a plan. It knows which indexes exist and, from statistics, roughly how many rows each step will produce. It prices several plans and picks the cheapest guess. Old statistics make bad guesses.', on: ['a3', 'a6'], focus: ['q_pla', 'q_sta'], tags: ['tg_est'], cap: 'Estimates, not facts.' },
          { say: 'Step 4. The executor runs the plan: scan, filter, join, aggregate, sort. It asks storage for pages or files and does the work.', on: ['a4'], focus: ['q_exe', 'q_sto'], cap: 'The work happens here.' },
          { say: 'Step 5. The rows travel back to the client. Many engines send the first rows before the last row is computed.', on: ['a7'], focus: ['q_exe', 'q_res'], cap: 'Rows out.' },
          { say: 'Three things follow. An error can come from the parser or from the executor. The same SQL can get a new plan when the data grows. And you can ask the engine to show its plan with EXPLAIN.', tags: ['tg_decl', 'tg_est'] }
        ]
      }),

      B.widget({ id: 'm1-clauses', kind: 'clauses', t: 1, src: 'rec', title: 'Lab: one query, cut after each clause' }),

      B.flow({
        id: 'm1-order', t: 1, src: 'docs', title: 'The logical order of a SELECT', g: 'order', legend: true,
        steps: [
          { say: 'You write SELECT first. The engine thinks about it last. Press Next for the order in which the clauses are evaluated logically.' },
          { say: 'Step 1. FROM and JOIN decide which rows exist at all. Everything later works on these rows.', on: ['c1'], focus: ['o_from'], cap: 'First, the rows.' },
          { say: 'Step 2. WHERE drops rows. It runs before any grouping, so it cannot use an aggregate. It also runs before SELECT, so it cannot use an alias that SELECT creates.', on: ['c2'], focus: ['o_where'], tags: ['tg_alias'], cap: 'Row filter.' },
          { say: 'Step 3. GROUP BY collapses rows into groups. From here on, a row stands for a group.', on: ['c3'], focus: ['o_group'], cap: 'Many rows become one.' },
          { say: 'Step 4. HAVING drops groups. It may use aggregates, because the groups exist now.', on: ['c4'], focus: ['o_having'], cap: 'Group filter.' },
          { say: 'Step 5. Window functions run on the rows that are left. They see the grouped rows, not the original ones. Mission 6 is about them.', on: ['c5'], focus: ['o_win'], tags: ['tg_win'], cap: 'Windows after groups.' },
          { say: 'Step 6. SELECT computes the output columns and gives them names. This is where an alias is born.', on: ['c6'], focus: ['o_sel'], cap: 'Names are born here.' },
          { say: 'Step 7. DISTINCT drops repeated rows from the output.', on: ['c7'], focus: ['o_dis'], cap: 'Repeats go.' },
          { say: 'Step 8. ORDER BY sorts. It runs after SELECT, so it can use aliases.', on: ['c8'], focus: ['o_ord'], cap: 'Sort late.' },
          { say: 'Step 9. LIMIT keeps the first rows of the sorted result. The engine may reorder the work to be fast, but the result must look as if it followed this order.', on: ['c9'], focus: ['o_lim', 'o_res'], cap: 'Cut at the end.' }
        ]
      }),

      B.sql({
        id: 'm1-revenue', t: 1, src: 'rec', title: 'Read the query in the order it runs', file: 'revenue.sql', code: CODE, ctx: G.ctx('duckdb'),
        result: { msg: REV.rows.length + ' rows', cols: REV.cols, rows: REV.rows },
        steps: [
          { say: 'This is the query that the lab cut apart. Read it once from top to bottom, then I will read it the way the engine does.' },
          { say: 'First, FROM and JOIN. Orders are joined to their customers. The guest order has no customer, so an inner join drops it.', lines: G.span(CODE, /^FROM orders/, /^JOIN customers/) },
          { say: 'Second, WHERE keeps the paid orders.', lines: G.span(CODE, /^WHERE/) },
          { say: 'Third, GROUP BY makes one group for each country and computes the aggregates.', lines: G.span(CODE, /^GROUP BY/) },
          { say: 'Fourth, HAVING keeps the groups whose revenue is above 10.', lines: G.span(CODE, /^HAVING/) },
          { say: 'Fifth, SELECT builds the columns. This is where `orders`, `revenue` and `avg_order` get their names.', lines: G.span(CODE, /^SELECT/, /avg_order/) },
          { say: 'Sixth and seventh, ORDER BY sorts by the alias, which exists by now, and LIMIT keeps at most three rows.', lines: G.span(CODE, /^ORDER BY/, /^LIMIT/) },
          { say: 'Run it. DuckDB returned ' + REV.rows.length + ' rows. Singapore has ' + REV.rows[0][1] + ' paid orders worth ' + REV.rows[0][2] + '. Malaysia had 5.00 and HAVING removed it.', run: true }
        ]
      }),

      B.order({
        id: 'm1-order-game', t: 1, title: 'Put the clauses in order',
        q: 'Tap the steps in the order the engine evaluates them logically.',
        items: ['FROM and JOIN build the rows', 'WHERE drops rows', 'GROUP BY collapses rows into groups', 'HAVING drops groups', 'SELECT computes the output columns', 'ORDER BY sorts the result', 'LIMIT keeps the first rows'],
        why: 'Rows exist first, then they are filtered, then grouped, then the groups are filtered. SELECT comes after all of that, which is why an alias is unknown to WHERE and known to ORDER BY. Sorting and cutting come last.'
      }),

      B.quiz({
        id: 'm1-q-having', t: 1, q: 'You want only the countries whose revenue is above 10. Which clause holds the test `sum(total) > 10`?',
        opts: [
          { t: 'WHERE', fb: 'WHERE runs before GROUP BY, so no sum exists yet. The engine refuses an aggregate there.' },
          { t: 'HAVING', fb: '' },
          { t: 'ON', fb: 'ON belongs to a join. It decides which rows match. It has no groups either.' },
          { t: 'ORDER BY', fb: 'ORDER BY sorts. It does not remove anything.' }
        ],
        ok: 1, why: 'HAVING runs after GROUP BY, so the sums exist and the clause may use them. WHERE filters rows before any grouping.'
      }),

      B.quiz({
        id: 'm1-q-alias', t: 1,
        q: 'The query `SELECT order_id, total * 2 AS doubled FROM orders WHERE doubled > 30` returned 4 rows on DuckDB and on SQLite. What did PostgreSQL do?',
        opts: [
          { t: 'It returned the same 4 rows', fb: 'It did not. Standard SQL does not let WHERE see an alias from SELECT, and PostgreSQL follows the standard here.' },
          { t: 'It refused: ' + AW.postgresError, fb: '' },
          { t: 'It returned 0 rows', fb: 'An error is not an empty result. The query never ran.' },
          { t: 'It returned 4 rows and a warning', fb: 'PostgreSQL has no such warning for this. It stops with an error.' }
        ],
        ok: 1, why: 'WHERE runs before SELECT, so by the standard an alias does not exist yet. DuckDB and SQLite accept it as a convenience, PostgreSQL refuses. Portable SQL repeats the expression or moves it into a subquery.'
      }),

      B.cmp({
        id: 'm1-alias', t: 1, src: 'rec', title: 'The same alias on three engines',
        say: 'An alias is a name that SELECT creates. Where may you use it? The engines answer differently. Press Next for each clause. Every cell is what the engine returned.',
        cols: ['Alias used in', 'DuckDB', 'PostgreSQL', 'SQLite'],
        hl: 0,
        rows: [
          ['`WHERE doubled > 30`', AW.duckdb.rows.length + ' rows', 'error: `' + AW.postgresError + '`', AW.sqlite.rows.length + ' rows'],
          ['`GROUP BY s` (alias of `upper(status)`)', AG.duckdb.rows.length + ' groups', AG.postgres.rows.length + ' groups', AG.sqlite.rows.length + ' groups'],
          ['`ORDER BY doubled DESC`', 'first row: order ' + AO.duckdb.rows[0][0], 'first row: order ' + AO.postgres.rows[0][0], 'first row: order ' + AO.sqlite.rows[0][0]]
        ],
        steps: [
          { upto: 1, say: 'WHERE runs before SELECT. DuckDB and SQLite are lenient and allow the alias. PostgreSQL follows the standard and refuses.' },
          { upto: 2, say: 'GROUP BY accepts an output name on all three engines. That is an extension of the standard that all three share.' },
          { upto: 3, say: 'ORDER BY runs after SELECT, so the alias is legal everywhere.' }
        ],
        pick: 'Write SQL that survives a change of engine: repeat the expression in WHERE, or compute it in a subquery or a CTE and filter outside. Use an alias in ORDER BY freely.'
      }),

      B.term({
        id: 'm1-psql', t: 1, src: 'rec', title: 'The same idea in psql',
        say: 'This is real output of `psql`, the command line client of PostgreSQL, run against the local server of this recording. Watch the table, and the footer that counts rows.',
        lines: function () { return G.plain(G.text('m1.psql'), { cmd: G.text('m1.psql.command') }); },
        after: 'psql prints a text table and the number of rows. NULL is an empty cell, which is why the last row has a blank country: customer 6 has no country.',
        afterKind: 'tip'
      }),

      B.bug({
        id: 'm1-bug-having', t: 1, title: 'Bug hunt: the filter on a count',
        q: 'A colleague wants the countries that have more than one customer. PostgreSQL answers with the error: ' + HAVING_ERR + '. Click the line that causes it.',
        file: 'countries.sql', lang: 'sql',
        code: ['SELECT country, count(*) AS n', 'FROM customers', 'WHERE count(*) > 1', 'GROUP BY country;'].join('\n'),
        bad: [3],
        hint: 'Which clause runs before the groups exist?',
        why: 'WHERE runs before GROUP BY, so there is no count to test yet. A condition on an aggregate belongs in HAVING.',
        fix: ['SELECT country, count(*) AS n', 'FROM customers', 'GROUP BY country', 'HAVING count(*) > 1;'].join('\n'),
        cheer: 'The fixed query returned ' + FIXED.rows.map(function (r) { return r[0] + ' ' + r[1]; }).join(' and ') + '.'
      }),

      B.quiz({
        id: 'm1-q-order', t: 1, q: 'You run `SELECT * FROM orders LIMIT 3` with no ORDER BY, and you always got orders 1001, 1002, 1003. What can you rely on?',
        opts: [
          { t: 'The table is stored in key order, so it will always return these', fb: 'Storage order can change after an update, a vacuum, a new plan or a parallel scan.' },
          { t: 'The same three rows every time on the same engine', fb: 'It may hold today. A plan change or a different number of threads can reorder the rows.' },
          { t: 'Nothing: without ORDER BY the order is not defined', fb: '' },
          { t: 'The three smallest primary keys', fb: 'Nothing in the standard says so.' }
        ],
        ok: 2, why: 'A table is a set of rows. Without ORDER BY the engine may return rows in any order, and the order can change when the plan or the data changes. A test that depends on it will fail one day, usually on a Friday.'
      }),

      B.quiz({
        id: 'm1-q-stats', t: 2, q: 'What does the planner use to guess how many rows a filter will return?',
        opts: [
          { t: 'Statistics about the table that the engine collected earlier', fb: '' },
          { t: 'It runs the filter on a random sample at query time', fb: 'Some engines sample, but the usual source is stored statistics.' },
          { t: 'The order of the columns in the table', fb: 'Column order says nothing about row counts.' },
          { t: 'The result of your last query', fb: 'Plans do not depend on the previous query.' }
        ],
        ok: 0, why: 'Statistics such as the row count and the spread of values come from an ANALYZE step or from the loads. When they are stale the planner guesses wrong, and a wrong guess can pick a slow plan. Mission 11 shows a bad estimate next to the real count.'
      }),

      B.code({
        id: 'm1-plan-pg', t: 2, src: 'rec', title: 'Your first plan: PostgreSQL', file: 'EXPLAIN (ANALYZE, TIMING OFF, SUMMARY OFF)', lang: 'text', code: PGPLAN,
        steps: [
          { say: 'This is the plan that PostgreSQL ' + G.meta('postgres') + ' made and ran for the revenue query. Read it from the inside out: the deepest lines run first. `cost` is the planner\'s guess in its own units. `actual rows` is what really happened.' },
          { say: 'The two scans are at the bottom. The orders scan has a filter on status and removed 3 rows. 9 rows went on. The planner guessed 9.', lines: G.span(PGPLAN, /Seq Scan on orders/, /Rows Removed by Filter/) },
          { say: 'A hash join matches orders to customers on `customer_id`. PostgreSQL builds a hash table from the customers and probes it with the orders.', lines: G.span(PGPLAN, /Hash Join/, /Hash Cond/) },
          { say: 'The group and the HAVING test are one step. HashAggregate groups by country and its filter removed 1 group, the one with revenue 5.00.', lines: G.span(PGPLAN, /HashAggregate/, /Rows Removed by Filter: 1/) },
          { say: 'Sort and Limit finish the job. The plan estimated 1 row for the groups and got 2. With 12 orders that does not matter. With 30,000 it can.', lines: G.span(PGPLAN, /^Limit/, /Sort Method/) }
        ],
        note: 'Times are left out on purpose: they change from run to run. Rows and plan shape do not.'
      }),

      B.code({
        id: 'm1-plan-duck', t: 2, src: 'rec', title: 'Your first plan: DuckDB', file: 'EXPLAIN ANALYZE (shortened)', lang: 'text', code: DUCKPLAN,
        steps: [
          { say: 'DuckDB ' + G.meta('duckdb') + ' shows its plan as a tree. I shortened the output to the operators that do the work and the real rows each one produced. The two scans are at the bottom again.' },
          { say: 'The scan of orders has the filter on status, and the engine read all 12 rows and passed 9 on.', lines: G.span(DUCKPLAN, /SCAN orders/) },
          { say: 'The scan of customers has a filter you did not write: `customer_id <= 7`. DuckDB looked at the customer ids that the other side of the join produces and pushed a filter into this scan, so it read 4 rows instead of 8.', lines: G.span(DUCKPLAN, /SCAN customers/) },
          { say: 'The join, the grouping and the HAVING filter follow. The engine merged ORDER BY and LIMIT into one step, a top 3.', lines: G.span(DUCKPLAN, /TOP_N/, /HASH_JOIN/) }
        ],
        note: 'Another engine, another plan. The idea is the same: scan, filter, join, aggregate, sort.'
      }),

      B.code({
        id: 'm1-plan-sqlite', t: 3, src: 'rec', title: 'Your first plan: SQLite', file: 'EXPLAIN QUERY PLAN', lang: 'text', code: LITEPLAN,
        steps: [
          { say: 'SQLite ' + G.meta('sqlite') + ' prints the shortest plan of the three. It has no row counts: it only says how each table is read.' },
          { say: 'It scans orders in full, then looks up each customer by the primary key, which is the rowid. That is a nested loop with an index lookup.', lines: G.span(LITEPLAN, /SCAN o/, /SEARCH c/) },
          { say: 'It needs a temporary b-tree to group and another to sort. Those are the two extra passes over the data.', lines: G.span(LITEPLAN, /GROUP BY/, /ORDER BY/) }
        ]
      }),

      B.decide({
        id: 'm1-dec-engine', t: 2, title: 'Decision: where does the dashboard query run?',
        scenario: 'The finance team wants a revenue dashboard that refreshes every 5 minutes. It joins orders, items and customers for the last 90 days. Orders live in the PostgreSQL database that takes customer payments, and checkout must stay fast. Where do you run the dashboard query?',
        opts: [
          { t: 'On the production PostgreSQL', d: 'No new system. The data is already there.', lose: 'A 5 minute refresh adds a long scan to the database that serves checkout. One slow report can delay payments, and the incident looks like a payment problem.' },
          { t: 'On a copy of the data in an analytical engine', d: 'Load the orders into a warehouse or a columnar engine on a schedule, and query that copy.', lose: '' },
          { t: 'In the web application, with a cache', d: 'Compute the numbers in the app and keep them in memory.', lose: 'Business logic moves out of SQL, every service repeats it, and the numbers will disagree between dashboards.' },
          { t: 'A nightly CSV by email', d: 'Run once a day, send a file.', lose: 'It does not meet a 5 minute refresh, and nobody can drill into it.' }
        ],
        pick: 1,
        why: 'Checkout and reporting have different needs. Checkout wants many tiny reads and writes with low latency. A dashboard wants to scan many rows and group them. Running both on one row-store database makes them fight. A copy in an analytical engine, loaded every few minutes, protects checkout and makes the report cheap.',
        when: 'If the data is small, say a few hundred thousand rows, and the report is rare, a read replica of PostgreSQL is enough. If you cannot afford any delay in the numbers, you need the production database and a tight query.'
      }),

      B.challenge({
        id: 'm1-ch-store', t: 1, title: 'Coding round: paid revenue for each store', file: 'store_revenue.sql', lang: 'sql',
        q: 'Brewline wants the **paid revenue for each store**, biggest first. Return the store id, the number of paid orders and the revenue, from the `orders` table. Stores with no paid order do not need a row.',
        data: [{ name: 'orders (4 of 7 columns)', cols: G.cols('data.orders', ['order_id', 'store_id', 'status', 'total']).cols, rows: G.cols('data.orders', ['order_id', 'store_id', 'status', 'total']).rows, types: ['INTEGER', 'INTEGER', 'VARCHAR', 'DECIMAL(10,2)'] }],
        starter: '-- one row for each store: its id, the number of paid orders and the revenue\nSELECT ...',
        hints: ['One row for each store means GROUP BY store_id.', 'Which clause removes the orders that are not paid? It must run before the grouping.', 'ORDER BY may use the alias that SELECT gave to the sum.'],
        sol: G.file('m1.ch_store_revenue').replace(/;$/, ';'),
        res: { msg: STORE.rows.length + ' rows', cols: STORE.cols, rows: STORE.rows },
        expl: ['WHERE keeps the paid orders before any grouping, so the cancelled order of store 3 never makes a group.', 'GROUP BY store_id gives one row for each store, and count and sum are computed inside each group.', 'ORDER BY revenue DESC uses the alias, which exists after SELECT.'],
        cx: 'One pass over the orders table and one group for each store, so the time grows with the number of orders. With an index on `status` the engine could read fewer rows, but for a column with few distinct values a scan is often cheaper.'
      }),

      B.incident({
        id: 'm1-inc-pages', t: 2, time: '10:12',
        alert: 'Customers say that the orders page shows the same order on page 1 and on page 2, and that one order never appears. The query is `SELECT * FROM orders ORDER BY status LIMIT 20 OFFSET 20`. It worked in the test environment.',
        clues: ['Orders per status: paid has thousands of rows, the others have a few.', 'The table is updated all day: refunds change the status.', 'The test environment has 50 orders.'],
        opts: [
          { t: 'Restart the application servers', fb: 'The servers are not the cause. The query returns rows in an order that is not fully defined.' },
          { t: 'Look at the ORDER BY: does it give every row a unique position?', fb: '' },
          { t: 'Add an index on status', fb: 'An index may change the plan and the tie order, but it does not make the order unique. The bug stays.' },
          { t: 'Increase the page size to 100', fb: 'It hides the problem for some customers and makes the pages heavier.' }
        ],
        best: 1,
        why: 'Thousands of rows share the same status, so ORDER BY status does not decide their order. Without a tie breaker the engine may return tied rows in a different order on each call, and OFFSET pages then overlap or skip rows.',
        checks: [['Does ORDER BY identify a unique row?', 'No: many rows have status paid, so the order among them is not defined.'], ['Run the same page twice and compare', 'The tied rows can come back in a different order.'], ['Does the test data show it?', 'With 50 orders the ties are few and the plan is stable, so the bug hides.'], ['Fix', 'Order by status and then by order_id, a unique column.']],
        tell: 'Customers saw repeated and missing orders on a paged list. The sort key was not unique, so the order of tied rows changed between calls. I added the primary key as a tie breaker, and later moved to keyset pagination, which asks for rows after the last seen key. The pages are stable now.',
        prevent: ['Always end an ORDER BY used for paging with a unique column.', 'Prefer keyset pagination (`WHERE (status, order_id) > (?, ?)`) over big offsets.', 'Test paging on data with many ties, not on 50 rows.']
      }),

      B.qa({
        id: 'qa-order', t: 1, tag: 'SQL basics', secs: 60,
        q: 'In what order does a SELECT statement run?',
        pts: ['FROM and JOIN first', 'WHERE, then GROUP BY, then HAVING', 'Window functions, then SELECT and DISTINCT', 'ORDER BY, then LIMIT', 'The consequence: aliases and aggregates'],
        short: 'Logically, the engine evaluates FROM and JOIN first, to build the rows. Then WHERE drops rows. GROUP BY collapses them into groups and HAVING drops groups. Window functions run next, then SELECT computes the output columns, DISTINCT removes repeats, ORDER BY sorts and LIMIT cuts. This is a logical order. The engine may run the work in another order for speed, as long as the result matches. The practical consequences: WHERE cannot use an aggregate or a select alias, because they do not exist yet. HAVING can use aggregates. ORDER BY can use aliases, because it runs after SELECT.',
        fu: [['Why does `WHERE alias > 3` work in DuckDB?', 'DuckDB and SQLite add it as a convenience. The standard does not allow it and PostgreSQL refuses. I repeat the expression or use a CTE so the query runs on any engine.'], ['Is the physical order the same?', 'No. The planner may filter before a join, or use an index. Only the result must match the logical order.']],
        trap: 'Saying that SQL runs top to bottom as you write it.',
        real: 'Tell a time you hit "column does not exist" in WHERE and how you fixed it.'
      }),

      B.qa({
        id: 'qa-where-having', t: 1, tag: 'SQL basics', secs: 60,
        q: 'What is the difference between WHERE and HAVING?',
        pts: ['WHERE filters rows before grouping', 'HAVING filters groups after aggregation', 'Only HAVING may use aggregates', 'Filter early in WHERE when you can'],
        short: 'WHERE filters rows before any grouping, so it cannot test an aggregate. HAVING filters groups after GROUP BY, so it can test a sum or a count. For example, `WHERE status = \'paid\'` removes rows early, and `HAVING sum(total) > 10` keeps only the countries with revenue above 10. When a condition does not need an aggregate, I put it in WHERE, because the engine then has fewer rows to group. Putting it in HAVING gives the same answer in most cases but usually costs more work.',
        fu: [['Can HAVING work without GROUP BY?', 'Yes. The whole table is one group, so `SELECT count(*) FROM t HAVING count(*) > 0` is legal. It is rare.'], ['Do WHERE and HAVING ever give different answers for the same test?', 'Only when the test uses an aggregate, and then WHERE fails. For plain column tests they return the same rows, and WHERE is cheaper.']],
        trap: 'Using HAVING for plain column filters and calling it the same thing.',
        real: 'Tell about a report you sped up by moving a filter from HAVING to WHERE.'
      }),

      B.qa({
        id: 'qa-declarative', t: 1, tag: 'SQL basics', secs: 60,
        q: 'SQL is called declarative. What does that mean, and why does it matter to you?',
        pts: ['You describe the result, not the steps', 'The engine plans how to run it', 'Equivalent queries can run at different speeds', 'So you read plans when a query is slow'],
        short: 'Declarative means that I describe what result I want, and the engine decides how to compute it: which indexes, which join method, which order. I do not write loops. It matters for two reasons. First, I can rewrite a query in a different shape, for example a subquery as a join, and expect the same answer. Second, two equivalent queries can have very different speed, because the planner may choose different plans. So when a query is slow I do not guess. I read the plan with EXPLAIN, compare the estimated rows with the real ones, and then change the query or the indexes.',
        fu: [['Is declarative always faster than loops?', 'Usually far faster for set work, because the engine can use indexes and parallelism. For a row by row process with side effects, a loop in code may be clearer.']],
        trap: 'Saying that the engine always finds the best plan.',
        real: 'Tell about a query where the plan, not the SQL text, explained the slowness.'
      }),

      B.qa({
        id: 'qa-plan', t: 2, tag: 'Plans', secs: 60,
        q: 'What is a query plan and who makes it?',
        pts: ['The planner makes it', 'It uses the catalog, indexes and statistics', 'It is a tree of operators: scans, joins, aggregates', 'EXPLAIN shows it, EXPLAIN ANALYZE runs it', 'Estimates can be wrong'],
        short: 'A plan is the tree of steps that the engine will run for a query: scans of tables, filters, joins, aggregates and sorts. The planner, also called the optimizer, makes it. It uses the catalog to know the tables and the indexes, and statistics to estimate how many rows each step produces, and it prices several candidate plans and picks the cheapest. EXPLAIN shows the chosen plan. EXPLAIN ANALYZE also runs the query and shows the real row counts. The estimates are guesses, so when estimated and real rows differ a lot, that is the first thing I look at.',
        fu: [['What would you check first on a slow query?', 'The plan: the scan type, the join method, and where the estimate and the real rows part ways.']],
        trap: 'Running EXPLAIN ANALYZE on a DELETE in production. It really deletes.',
        real: 'Describe a plan you read and what you changed because of it.'
      }),

      B.qa({
        id: 'qa-oltp-olap', t: 2, tag: 'Engines', secs: 60,
        q: 'Why would you not run heavy reports on the same database that handles checkout?',
        pts: ['Different access patterns', 'Row store vs column store', 'Locks and resource contention', 'Copy or replica for reporting'],
        short: 'Checkout is transactional work: many small reads and writes, each fast, each needing correctness. Reporting scans many rows and aggregates them. On a row-store database such a scan reads whole rows and takes CPU, memory and disk that checkout needs, so latency goes up for customers. Analytical engines store data by column and read only the columns a query names, which suits reports. So I move the data to a replica or an analytical engine on a schedule or by change capture, and run reports there. The cost is some delay in the data and a pipeline to maintain.',
        fu: [['When is a read replica enough?', 'When the data is small and the report is rare. A replica still has the row store layout, so a huge scan is slower than on a column store.']],
        trap: 'Saying that an index solves it. An index helps point lookups, not a scan of a quarter of the table.',
        real: 'Tell how reports and checkout were separated where you worked.'
      }),

      B.qa({
        id: 'qa-dialects', t: 2, tag: 'Engines', secs: 60,
        q: 'How different are the SQL dialects, and how do you handle that?',
        pts: ['The core is shared', 'The edges differ: NULL order, division, dates, aliases', 'Test on the target engine', 'Isolate dialect code'],
        short: 'The core is shared: SELECT, joins, GROUP BY, CTEs and window functions work almost everywhere. The edges differ. Where NULLs sort, what division by zero does, how integer division works, how dates and time zones are handled, whether an alias may be used in WHERE, how upserts are written, and which functions exist. I handle it by writing the common core, running tests on the engine that production uses, and keeping dialect specific code in a small number of places. A translator such as sqlglot helps to port text, but it does not run the query, so I still test the result.',
        fu: [['Can you give an example of the same SQL giving a different result?', 'ORDER BY a column with NULLs: DuckDB and PostgreSQL put NULLs last by default, SQLite puts them first. And `10 / 0` is an error in PostgreSQL, NULL in SQLite and infinity in DuckDB.']],
        trap: 'Assuming that a query that parses on another engine returns the same rows.',
        real: 'Tell about a migration where a dialect difference changed a result.'
      }),

      B.recap({
        id: 'm1-recap', n: 1, badge: 'Query Reader', color: '#C7D2FE',
        pts: [
          'SQL is **declarative**: you say what, the engine plans how. Without ORDER BY the order of rows is not defined.',
          'A query goes through the **parser, the planner and the executor**. Names fail early. Plans use statistics, and statistics can be wrong.',
          'Logical order: **FROM and JOIN, WHERE, GROUP BY, HAVING, windows, SELECT, DISTINCT, ORDER BY, LIMIT**.',
          '**WHERE** filters rows and cannot use aggregates or select aliases. **HAVING** filters groups. ORDER BY may use aliases.',
          'Engines differ at the edges. An alias in WHERE works on DuckDB and SQLite and fails on PostgreSQL.',
          'A plan is a tree of scans, joins and aggregates. **EXPLAIN** shows it, **EXPLAIN ANALYZE** shows real rows.'
        ],
        lines: [
          'SQL is declarative. I say what I want and the engine plans how.',
          'WHERE filters rows before grouping. HAVING filters groups after it. Aliases are born at SELECT.',
          'When a query is slow, I read the plan and compare estimated rows with real rows.'
        ]
      })
    ]
  });
})();
