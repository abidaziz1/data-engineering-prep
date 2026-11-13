/* Mission 5: subqueries, CTEs and recursive CTEs. Scalar, IN, EXISTS and correlated subqueries, derived tables, CTEs, views, recursive CTEs for trees and calendars, cycles,
   and how PostgreSQL plans a CTE. Every result and every plan was returned by the engines when the recorder ran the queries. */
(function () {
  var B = LAB.b, G = LAB.get;
  var ENG = ['duckdb', 'postgres', 'sqlite'];
  var SC = G.on('m5.scalar', 'duckdb'), SM = { duckdb: G.text('m5.scalar_many.duckdb.error'), postgres: G.text('m5.scalar_many.postgres.error'), sqlite: G.on('m5.scalar_many', 'sqlite') };
  var CO = G.on('m5.correlated', 'postgres'), DE = G.on('m5.derived', 'duckdb'), CT = G.on('m5.cte', 'postgres'), CR = G.on('m5.cte_reuse', 'postgres'), TR = G.on('m5.tree', 'duckdb');
  var IT = G.on('m5.tree_iterations', 'duckdb'), CAL = G.on('m5.calendar', 'postgres'), CU = G.on('m5.cycle_union', 'duckdb').rows[0][0], CA = G.on('m5.cycle_union_all', 'duckdb').rows[0];
  var EX = G.on('m5.exists', 'duckdb'), VW = G.on('m5.view', 'duckdb').rows[0], SE = G.on('m5.ch_second', 'duckdb'), SA = G.on('m5.ch_storeavg', 'duckdb'), ST = G.on('m5.ch_subtree', 'duckdb');
  var IJ = G.on('m5.in_join', 'duckdb'), CSQ = G.table('m5.calendar_sqlite'), SPG = G.table('m5.series_postgres'), SDU = G.table('m5.series_duckdb');
  var P = {}; ['pg_inlined_noindex', 'pg_inlined_index', 'pg_materialized_noindex', 'pg_materialized_index', 'pg_twice', 'pg_corr_noindex', 'pg_corr_index', 'duck_corr', 'pg_exists', 'duck_exists'].forEach(function (k) { P[k] = G.text('m5.plan.' + k); });
  function cm(t) { return t.split('\n').map(function (l) { return '-- ' + l; }).join('\n'); }
  var PLAN_CTE = [cm(G.file('m5.plan.once')), P.pg_inlined_index, '', cm(G.file('m5.plan.materialized')), P.pg_materialized_index].join('\n');
  var PLAN_CORR = [cm(G.file('m5.plan.corr')), '-- PostgreSQL ' + G.meta('postgres') + ', no index', P.pg_corr_noindex, '', '-- PostgreSQL after CREATE INDEX big_orders_cust ON big_orders (customer_id)', P.pg_corr_index, '', '-- DuckDB ' + G.meta('duckdb'), P.duck_corr].join('\n');
  var PLAN_EXISTS = [cm(G.file('m5.plan.exists')), '-- PostgreSQL ' + G.meta('postgres'), P.pg_exists, '', '-- DuckDB ' + G.meta('duckdb'), P.duck_exists].join('\n');
  var PLAN_TWICE = [cm(G.file('m5.plan.twice')), '-- PostgreSQL ' + G.meta('postgres'), P.pg_twice].join('\n');
  G.expect(SC.rows.length === 4 && SC.rows[0][0] === '1002' && G.on('m5.scalar', 'sqlite').rows.length === 4, '4 paid orders are above the average of the paid orders, on all three engines');
  G.expect(/More than one row returned by a subquery/.test(SM.duckdb) && /more than one row returned by a subquery/.test(SM.postgres) && SM.sqlite.rows[0][1] === '1001', 'a scalar subquery with several rows is an error on DuckDB and PostgreSQL, and SQLite returns the first');
  G.expect(CO.rows[5][2] === 'NULL' && CO.rows[0][2] === '18.50' && DE.rows.length === 3 && CT.rows[0][0] === 'Chen Wei', 'correlated, derived and CTE results');
  G.expect(CR.rows[0].join() === '1,82.00,64.6' && CR.rows.length === 3, 'store 1 has 64.6 percent of the revenue');
  G.expect(TR.rows.length === 9 && TR.rows[4][2] === 'Menu > Drinks > Coffee > Espresso drinks' && IT.rows.length === 9 && IT.rows[8][0] === '3', 'the tree has 9 categories and 4 iterations (0 to 3)');
  G.expect(CAL.rows.length === 10 && CAL.rows[9].join() === '2026-03-10,0' && CU === '9' && CA.join() === '61,20', 'the calendar has 10 days with a zero on 10 March, UNION reaches 9, UNION ALL with a guard makes 61 rows');
  G.expect(JSON.stringify(CSQ.rows) === JSON.stringify(CAL.rows) && JSON.stringify(SPG.rows) === JSON.stringify(CAL.rows) && JSON.stringify(SDU.rows) === JSON.stringify(CAL.rows), 'the SQLite form and the two series functions return the same ten days as the recursive calendar');
  G.expect(IJ.rows.length === 5 && IJ.rows[0][1] === 'Ana Lim' && IJ.rows[3][1] === 'Chen Wei', 'a join on store 1 returns 5 rows for 2 customers');
  G.expect(/SubPlan 1/.test(P.pg_corr_noindex) && /loops=3000/.test(P.pg_corr_noindex) && /Rows Removed by Filter: 29990/.test(P.pg_corr_noindex) && /Bitmap Index Scan on big_orders_cust/.test(P.pg_corr_index) && /actual rows=10 loops=3000/.test(P.pg_corr_index), 'PostgreSQL runs the correlated subquery as a SubPlan with 3000 loops, and uses the index in each loop when there is one');
  G.expect(/^HASH_JOIN RIGHT /.test(P.duck_corr) && /SCAN big_orders +\(scanned 30000/.test(P.duck_corr) && /^Hash Semi Join/.test(P.pg_exists) && /^HASH_JOIN RIGHT_SEMI/.test(P.duck_exists), 'DuckDB turns the correlated subquery into a join, and EXISTS becomes a semi join on both engines');
  G.expect(EX.rows.length === 1 && EX.rows[0][1] === 'Gus Hall' && VW.join() === '9,127.00' && SE.rows[0][0] === '19.00' && SA.rows.length === 5 && ST.rows.length === 5, 'exists, view and the three coding rounds');
  G.expect(/^Seq Scan on big_orders/.test(P.pg_inlined_noindex) && /^Index Scan using big_orders_id/.test(P.pg_inlined_index) && /^CTE Scan on o/.test(P.pg_materialized_index) && /actual rows=30000/.test(P.pg_materialized_index) && /CTE s/.test(P.pg_twice), 'PostgreSQL inlines a CTE that is used once, keeps a MATERIALIZED one as a CTE Scan over 30,000 rows, and keeps a CTE that is used twice');

  var SCALAR = G.file('m5.scalar'), INSUB = G.file('m5.in_subquery'), CORR = G.file('m5.correlated'), MANY = G.file('m5.scalar_many'), DERIVED = G.file('m5.derived'), CTE = G.file('m5.cte'), REUSE = G.file('m5.cte_reuse');
  var TREE = G.file('m5.tree'), CALQ = G.file('m5.calendar'), EXISTS = G.file('m5.exists'), VIEW = G.file('m5.view');
  function res(key, e) { var t = e ? G.on(key, e) : G.table(key); return { msg: t.rows.length + ' rows', cols: t.cols, rows: t.rows }; }

  LAB.addChapter({
    id: 'm5', n: 5, title: 'Subqueries, CTEs and recursion', short: 'CTEs', blurb: 'Subqueries, EXISTS, derived tables, CTEs, views, recursive CTEs for trees and calendars, and how an engine plans a CTE', minutes: 50,
    focus: ['stg', 'int'],
    goals: [
      'Write **scalar, IN, EXISTS and correlated** subqueries and know what each returns.',
      'Choose between a **subquery, a CTE, a view and a table**.',
      'Write a **recursive CTE** for a tree and for a calendar, and stop it from running forever.',
      'Read what an engine does with a **CTE**: inline it or materialize it.',
      'Explain why a scalar subquery that returns many rows fails.'
    ],
    say: 'Mission 5 is about queries inside queries. A subquery answers a small question that the big query needs. A CTE gives that small query a name so that you can read the big one. A recursive CTE walks a tree or builds a calendar. We will run them all, and look at the plans to see what the engine really does.',
    scenes: [
      B.talk({
        id: 'm5-what', t: 1, src: 'docs', title: 'Queries inside queries',
        say: 'Press Next for six ideas about subqueries and CTEs.',
        items: [
          ['A subquery is a query in parentheses', 'It can return one value (scalar), a list (used with IN), a yes or no (EXISTS), or a table (in FROM). It may refer to columns of the outer query. Then it is correlated.', 'One value, a list, a test or a table.'],
          ['A CTE is a named subquery', '`WITH name AS (...)` gives a subquery a name for one statement. You can chain several, and use a name more than once. It makes a long query read from top to bottom.', 'Name the steps.'],
          ['A view is a saved query', '`CREATE VIEW` stores a query in the catalog. Using the view runs the query. It saves typing and gives one definition to share. It does not store rows.', 'A name that lasts.'],
          ['A table stores the rows', 'A temporary or permanent table holds the result. Reading it is fast, and it can go stale. Use it when the work is expensive and many queries need it.', 'Pay once, read many times.'],
          ['Recursion walks a tree', 'A recursive CTE has an anchor query that runs once, and a recursive step that runs again on its own output until it produces no rows. It is how SQL walks a hierarchy or builds a series.', 'Anchor, step, stop.'],
          ['Engines rewrite your query', 'A subquery, a join and a CTE can mean the same thing, and the planner often turns one into another. You write for clarity, and read the plan to see what really runs.', 'Write for people, check the plan.']
        ],
        cols: 1
      }),

      B.sql({
        id: 'm5-scalar', t: 1, src: 'rec', title: 'A scalar subquery', file: 'above_average.sql', code: SCALAR, ctx: G.ctx('duckdb'),
        result: res('m5.scalar', 'duckdb'),
        steps: [
          { say: 'Which paid orders are worth more than the average paid order? The average is one number, and a subquery can supply it.' },
          { say: 'The subquery in parentheses returns one row and one column, so it can stand where a number stands.', lines: G.span(SCALAR, /total > \(SELECT avg/) },
          { say: 'Run it. The average of the paid orders is 14.11, and ' + SC.rows.length + ' orders are above it. DuckDB, PostgreSQL and SQLite gave the same rows. The subquery has no link to the outer query, so the engine runs it once.', run: true }
        ]
      }),

      B.sql({
        id: 'm5-in', t: 1, src: 'rec', title: 'IN with a subquery', file: 'in_subquery.sql', code: INSUB, ctx: G.ctx('duckdb'),
        result: res('m5.in_subquery', 'duckdb'),
        steps: [
          { say: 'Which customers ordered in store 1? The subquery returns a list of customer ids, and IN tests membership.' },
          { say: 'The subquery returns the customer ids of the orders in store 1. Ana Lim ordered three times there, so her id appears three times in the list. That does no harm: IN asks only whether the id is in it.', lines: G.span(INSUB, /IN \(SELECT/) },
          { say: 'Run it. Two customers ordered in store 1: Ana Lim and Chen Wei. The same question as a JOIN returned ' + IJ.rows.length + ' rows, one for each order (Ana Lim three times and Chen Wei twice). Use IN or EXISTS for a membership question. Beware of NOT IN with NULLs, which mission 2 showed.', run: true }
        ]
      }),

      B.sql({
        id: 'm5-exists', t: 1, src: 'rec', title: 'EXISTS: is there at least one?', file: 'exists.sql', code: EXISTS, ctx: G.ctx('duckdb'),
        result: res('m5.exists', 'duckdb'),
        steps: [
          { say: 'EXISTS asks one question: does the subquery return any row? It does not care about the values, so the usual form is `SELECT 1`.' },
          { say: 'For each customer, the subquery looks for a refunded order of that customer. The link `o.customer_id = c.customer_id` makes it correlated.', lines: G.span(EXISTS, /EXISTS \(/, /^\)/) },
          { say: 'Run it. One customer has a refunded order: Gus Hall. A customer with two refunded orders would still appear once, but a join would return that customer twice.', run: true }
        ]
      }),

      B.sql({
        id: 'm5-correlated', t: 1, src: 'rec', title: 'A correlated subquery', file: 'biggest_order.sql', code: CORR, ctx: G.ctx('postgres'),
        result: res('m5.correlated', 'postgres'),
        steps: [
          { say: 'A subquery may refer to the outer row. Then it answers a different question for each outer row. Here: what is the biggest order of this customer?' },
          { say: 'The inner query uses `c.customer_id` from the outer query. Logically it runs once for each customer.', lines: G.span(CORR, /\(SELECT max/) },
          { say: 'Run it on PostgreSQL. Customers 6 and 8 have no orders, so `max` sees no rows and returns NULL. What the engine really does with the loop is a separate question, and a plan scene further on shows it on 3,000 customers.', run: true }
        ]
      }),

      B.bug({
        id: 'm5-bug-scalar', t: 1, title: 'Bug hunt: one order for each customer',
        q: 'A report should show each customer and their order. PostgreSQL stops with: ' + SM.postgres + '. SQLite returns a result, with one order for each customer who has orders. Click the line that causes it.',
        file: 'customer_order.sql', lang: 'sql',
        code: ['SELECT c.name,', '       (SELECT o.order_id FROM orders AS o WHERE o.customer_id = c.customer_id) AS order_id', 'FROM customers AS c', 'ORDER BY c.customer_id;'].join('\n'),
        bad: [2], hint: 'How many orders does customer 1 have?',
        why: 'A scalar subquery must return at most one row. Customer 1 has three orders, so the subquery returns three. DuckDB stops with "' + SM.duckdb.replace(/^Invalid Input Error: /, '') + '" and PostgreSQL stops with a similar message. SQLite quietly takes the first row it finds, which hides the problem.',
        fix: ['SELECT c.name, o.order_id', 'FROM customers AS c', 'LEFT JOIN orders AS o ON o.customer_id = c.customer_id', 'ORDER BY c.customer_id, o.order_id;'].join('\n'),
        cheer: 'If you want one value, say which: `max(o.order_id)`. If you want every order, join.'
      }),

      B.cmp({
        id: 'm5-kinds', t: 1, src: 'docs', title: 'Kinds of subquery',
        say: 'Five places where a subquery can stand. Press Next for each.',
        cols: ['Kind', 'Where it stands', 'It must return', 'Example in this mission'],
        hl: 2,
        rows: [
          ['Scalar', 'Where a value stands: SELECT list, WHERE, HAVING', 'One column, at most one row', 'Paid orders above the average'],
          ['IN list', 'After IN or NOT IN', 'One column, any number of rows', 'Customers who ordered in store 1'],
          ['EXISTS', 'After EXISTS or NOT EXISTS', 'Anything: only the presence of a row counts', 'Customers with a refunded order'],
          ['Correlated', 'Any of the above, with a link to the outer row', 'The same rule as its kind', 'The biggest order of each customer'],
          ['Derived table', 'In FROM, with an alias', 'Any table', 'Totals for each customer, then a filter']
        ],
        steps: [
          { upto: 1, say: 'A scalar subquery that returns two rows is an error on most engines.' },
          { upto: 2, say: 'IN takes a list. A NULL in the list is the trap of mission 2.' },
          { upto: 3, say: 'EXISTS asks about presence. It is the safe way to write NOT EXISTS.' },
          { upto: 4, say: 'A correlated subquery refers to the outer row. It is easy to read and the planner often turns it into a join.' },
          { upto: 5, say: 'A derived table is a subquery in FROM. It needs an alias. A CTE does the same job and reads better.' }
        ],
        pick: 'Use EXISTS for yes or no, IN for a short list, a scalar subquery for one number, and a CTE instead of a derived table when the query has several steps.'
      }),

      B.sql({
        id: 'm5-derived', t: 1, src: 'rec', title: 'A subquery in FROM', file: 'derived.sql', code: DERIVED, ctx: G.ctx('duckdb'),
        result: res('m5.derived', 'duckdb'),
        steps: [
          { say: 'You cannot filter on an aggregate in WHERE, but you can filter on the result of a query. A subquery in FROM gives the aggregate a name.' },
          { say: 'The inner query computes the paid total of each customer. Its result is a table, called `per_customer`.', lines: G.span(DERIVED, /^FROM \(/, /^\) AS per_customer/) },
          { say: 'The outer query filters that table with an ordinary WHERE.', lines: G.span(DERIVED, /^WHERE spent/) },
          { say: 'Run it. Three customers spent more than 30. Engines can merge the two levels into one query, so the nesting usually costs nothing.', run: true }
        ]
      }),

      B.sql({
        id: 'm5-cte', t: 1, src: 'rec', title: 'A CTE: name the steps', file: 'cte.sql', code: CTE, ctx: G.ctx('postgres'),
        result: res('m5.cte', 'postgres'),
        steps: [
          { say: 'The same question, written as steps. Each step has a name, and the next step builds on it. The query reads from top to bottom.' },
          { say: 'Step 1, `paid`: the paid orders that have a customer.', lines: G.span(CTE, /^WITH paid/, /^\),/) },
          { say: 'Step 2, `per_customer`: the count and the total for each customer, built on `paid`.', lines: G.span(CTE, /^per_customer AS/, /^\)$/) },
          { say: 'The final query joins the result to the customers to show names.', lines: G.span(CTE, /^SELECT c\.name/, /^ORDER BY/) },
          { say: 'Run it on PostgreSQL. Chen Wei spent ' + CT.rows[0][2] + ' on ' + CT.rows[0][1] + ' orders. DuckDB and SQLite returned the same three customers.', run: true }
        ]
      }),

      B.sql({
        id: 'm5-cte-reuse', t: 1, src: 'rec', title: 'A CTE used twice', file: 'share_of_revenue.sql', code: REUSE, ctx: G.ctx('postgres'),
        result: res('m5.cte_reuse', 'postgres'),
        steps: [
          { say: 'A name can be used more than once. You write the aggregate once, and read it in two places.' },
          { say: '`per_store` has the revenue of each store.', lines: G.span(REUSE, /^WITH per_store/, /^\)/) },
          { say: 'The first use is the main query. The second is inside the subquery that adds all the stores up for the percentage.', lines: G.span(REUSE, /round\(100.0/) },
          { say: 'Run it. Store 1 has ' + CR.rows[0][2] + ' percent of the paid revenue, store 4 has ' + CR.rows[1][2] + ' and store 2 has ' + CR.rows[2][2] + '. Window functions give the same answer without the second read: mission 6.', run: true }
        ]
      }),

      B.sql({
        id: 'm5-view', t: 1, src: 'rec', title: 'A view is a saved query', file: 'view.sql', code: VIEW, ctx: G.ctx('duckdb'),
        result: res('m5.view', 'duckdb'),
        steps: [
          { say: 'A view gives a query a name that lasts. Anyone can select from it as if it were a table.' },
          { say: '`CREATE VIEW` stores the query text. No rows are stored.', lines: G.span(VIEW, /^CREATE VIEW/, /^WHERE status/) },
          { say: 'Selecting from the view runs the stored query. It returned ' + VW[0] + ' paid orders worth ' + VW[1] + '. The recorder rolled the view back, so the next example starts clean.', run: true }
        ],
        note: 'A view always shows current data, and it costs as much as its query each time. A materialized view or a table stores the rows, so reading is fast and the copy can be old.'
      }),

      B.cmp({
        id: 'm5-choose', t: 2, src: 'docs', title: 'Subquery, CTE, view or table?',
        say: 'Four ways to hold an intermediate result. Press Next for each, and for when to choose it.',
        cols: ['Option', 'What it holds', 'Lives', 'Choose it when'],
        hl: 3,
        rows: [
          ['Subquery', 'Nothing. It is part of the statement.', 'Within one statement', 'The step is small and used once'],
          ['CTE', 'Nothing. A name for a subquery.', 'Within one statement', 'The query has several steps, or a step is used twice'],
          ['View', 'The query, not the rows', 'In the database, until dropped', 'Many queries share one definition and it is cheap to run'],
          ['Table', 'The rows', 'In the database, until dropped', 'The work is expensive, many readers need it, and a delay is acceptable']
        ],
        steps: [
          { upto: 1, say: 'A subquery is the lightest tool. Use it for one value or one test.' },
          { upto: 2, say: 'A CTE adds a name and reads better. In most engines it costs the same as the subquery.' },
          { upto: 3, say: 'A view shares a definition between queries. The definition runs every time.' },
          { upto: 4, say: 'A table stores the answer. Reading is cheap, and a job must refresh it.' }
        ],
        pick: 'Start with a CTE. Promote it to a view when two queries need it. Promote the view to a table when it is expensive and many dashboards read it.'
      }),

      B.quiz({
        id: 'm5-q-cte', t: 1, q: 'What is a CTE?',
        opts: [
          { t: 'A table stored on disk until you drop it', fb: 'That is a table. A CTE stores nothing.' },
          { t: 'A named subquery that exists for one statement', fb: '' },
          { t: 'An index on a subquery', fb: 'An index speeds up lookups in a table. A CTE has none.' },
          { t: 'A faster kind of JOIN', fb: 'A CTE is a way to write a query. It is not a join and it does not speed anything up by itself.' }
        ],
        ok: 1, why: 'A common table expression, `WITH name AS (...)`, names a subquery for the statement that follows. Nothing is stored. Whether the engine runs it once or inlines it is up to the planner.'
      }),

      B.quiz({
        id: 'm5-q-exists', t: 1, q: 'A customer has three refunded orders. How many rows does a query with `WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id AND o.status = \'refunded\')` return for that customer?',
        opts: [
          { t: 'Three, one for each order', fb: 'That is what a JOIN would give. EXISTS returns the outer row once.' },
          { t: 'One', fb: '' },
          { t: 'Zero, because there is more than one match', fb: 'EXISTS does not care how many rows match, only whether there is at least one.' },
          { t: 'An error: the subquery returns many rows', fb: 'EXISTS accepts any number of rows.' }
        ],
        ok: 1, why: 'EXISTS is a test on the outer row. If the subquery returns at least one row, the outer row passes, once. That makes it the right tool for "has at least one", without a fan-out.'
      }),

      B.flow({
        id: 'm5-recursive', t: 2, src: 'docs', title: 'How a recursive CTE runs', g: 'recursive', legend: true,
        steps: [
          { say: 'A recursive CTE has two parts joined by UNION ALL: an anchor and a recursive step. Press Next to see how the engine runs them.', tags: ['tg_rec1'] },
          { say: 'Step 1. The anchor query runs once. For the category tree it selects the root, the row without a parent. Its rows go into the working table.', on: ['z1'], focus: ['r_anchor', 'r_work'], cap: 'Run the anchor.' },
          { say: 'Step 2. The recursive step reads the working table. It joins it to the table again, to find the children of the rows in the working table.', on: ['z2'], focus: ['r_work', 'r_step'], cap: 'Read the last rows.' },
          { say: 'Step 3. The rows that the step produced are added to the result.', on: ['z3'], focus: ['r_step', 'r_res'], cap: 'Add to the result.' },
          { say: 'Step 4. The same rows become the new working table, and the step runs again. This repeats once for each level of the tree.', on: ['z4'], focus: ['r_step', 'r_work'], cap: 'Loop.' },
          { say: 'Step 5. When a step produces no rows, the loop ends. A tree ends at its leaves. A cycle in the data would not end.', on: ['z5'], focus: ['r_step', 'r_stop'], tags: ['tg_rec2'], cap: 'Stop.' }
        ]
      }),

      B.widget({ id: 'm5-lab', kind: 'recursive', t: 2, src: 'rec', title: 'Lab: a recursive CTE, one iteration at a time' }),

      B.sql({
        id: 'm5-tree', t: 2, src: 'rec', title: 'Walk a tree with its path', file: 'tree.sql', code: TREE, ctx: G.ctx('duckdb'),
        result: res('m5.tree', 'duckdb'),
        steps: [
          { say: 'The categories table stores a tree: each row points to its parent. A recursive CTE turns that into a list with the depth and the path of each category.' },
          { say: 'The anchor selects the root, where `parent_id IS NULL`, with depth 0.', lines: G.span(TREE, /SELECT category_id, name, 0 AS depth/, /WHERE parent_id IS NULL/) },
          { say: 'The recursive step joins the categories to the rows found so far: a category whose parent is in the working table is one level deeper. It extends the path.', lines: G.span(TREE, /SELECT c\.category_id/, /JOIN tree/) },
          { say: 'Run it. Nine categories at depths 0, 1, 2 and 3. `Espresso drinks` has the path Menu, Drinks, Coffee, Espresso drinks. DuckDB, PostgreSQL and SQLite returned the same rows.', run: true }
        ],
        note: 'The word RECURSIVE is required in PostgreSQL, DuckDB and SQLite. Some engines, such as SQL Server, leave it out.'
      }),

      B.sql({
        id: 'm5-calendar', t: 2, src: 'rec', title: 'A calendar with the days that have no rows', file: 'calendar.sql', code: CALQ, ctx: G.ctx('postgres'),
        result: res('m5.calendar', 'postgres'),
        steps: [
          { say: 'Recursion also builds a series. A report of orders for each day must show the days with no order, and a GROUP BY on orders alone cannot do that, because a day with no order has no row.' },
          { say: 'The CTE starts at 1 March and adds one day until 10 March.', lines: G.span(CALQ, /^WITH RECURSIVE days/, /^\)/) },
          { say: 'A LEFT JOIN from the calendar to the orders keeps every day. `count(o.order_id)` counts only the real orders.', lines: G.span(CALQ, /LEFT JOIN/) },
          { say: 'Run it on PostgreSQL. Ten days. 10 March has 0 orders, and it is in the list. DuckDB gave the same table. SQLite does not add a number to a date, so its step is `date(day, \'+1 day\')` and its join is `date(o.order_ts) = d.day`. That form returned the same ten rows.', run: true }
        ],
        note: 'The two series functions are shorter and gave the same ten rows when recorded: `generate_series(DATE \'2026-03-01\', DATE \'2026-03-10\', INTERVAL \'1 day\')` on PostgreSQL and `range(DATE \'2026-03-01\', DATE \'2026-03-11\', INTERVAL 1 DAY)` on DuckDB, where the end is exclusive. The recursive form ran on all three engines, with a different date step on SQLite.'
      }),

      B.sql({
        id: 'm5-cycle', t: 3, src: 'rec', title: 'A cycle, and a guard that stops it', file: 'cycle_union_all.sql', code: G.file('m5.cycle_union_all'), ctx: G.ctx('duckdb'),
        result: res('m5.cycle_union_all', 'duckdb'),
        steps: [
          { say: 'What if the data has a loop? The first statement makes Menu (category 1) a child of Merch (category 9). Merch sits below Menu, under Retail, so Menu, Retail and Merch now form a cycle.', lines: [1, 1] },
          { say: 'Each round finds the children of the rows from the last round, and in a cycle it finds categories it has already seen. The guard `WHERE w.depth < 20` is the only thing that ends the recursion.', lines: G.span(G.file('m5.cycle_union_all'), /WHERE w.depth < 20/) },
          { say: 'Run it. With the guard the walk made ' + CA[0] + ' rows and stopped at depth ' + CA[1] + '. Without the guard nothing would end it, because every round finds more rows. DuckDB, PostgreSQL and SQLite gave the same two numbers.', run: true }
        ]
      }),

      B.sql({
        id: 'm5-cycle-union', t: 3, src: 'rec', title: 'The other guard: UNION', file: 'cycle_union.sql', code: G.file('m5.cycle_union'), ctx: G.ctx('duckdb'),
        result: res('m5.cycle_union', 'duckdb'),
        steps: [
          { say: 'The same cycle, with the other guard. `UNION` removes a row that is already in the result, so the recursion ends when a round finds nothing new.', lines: G.span(G.file('m5.cycle_union'), /^  UNION$/) },
          { say: 'This works only because each row is just a `category_id`. Add a counter such as `depth` and every round makes a new row, so UNION removes nothing and the loop does not end.', lines: G.span(G.file('m5.cycle_union'), /^WITH RECURSIVE walk/) },
          { say: 'Run it. The walk reached ' + CU + ' categories, the whole table, each counted once, and it stopped. DuckDB, PostgreSQL and SQLite gave ' + CU + '.', run: true }
        ]
      }),

      B.quiz({
        id: 'm5-q-rec', t: 2, q: 'In a recursive CTE, which part runs once?',
        opts: [
          { t: 'The anchor query', fb: '' },
          { t: 'The recursive step', fb: 'The recursive step runs again and again, once for each level, until it produces no rows.' },
          { t: 'The final SELECT', fb: 'The final SELECT reads the result after the recursion has ended, but it is not the part that is called once in the recursion.' },
          { t: 'Both parts, as one query', fb: 'They run differently: the anchor once, the step repeatedly.' }
        ],
        ok: 0, why: 'The anchor query starts the recursion and runs one time. The recursive step reads the working table, the rows of the last round, and runs repeatedly. In the tree it ran three times (levels 1, 2 and 3) and a fourth time, which found nothing and ended the loop.'
      }),

      B.bug({
        id: 'm5-bug-rec', t: 3, title: 'Bug hunt: the walk that never ends',
        q: 'A query walks the category tree with UNION ALL. After a data fix made category 1 a child of category 9, the job runs until the server runs out of memory. Click the line that must change.',
        file: 'walk.sql', lang: 'sql',
        code: ['WITH RECURSIVE walk(category_id, depth) AS (', '  SELECT 1, 0', '  UNION ALL', '  SELECT c.category_id, w.depth + 1', '  FROM categories AS c', '  JOIN walk AS w ON c.parent_id = w.category_id', ')', 'SELECT count(*) FROM walk;'].join('\n'),
        bad: [4, 5, 6], hint: 'What is missing from the recursive step that would stop a cycle?',
        why: 'With a cycle, the recursive step finds rows forever, because UNION ALL keeps every row and nothing limits the depth. Add a guard to the recursive step, such as a depth limit. UNION also ends a cycle, but only when the rows carry no counter: a row with a new depth is a new row. Fix the data too: a tree must not have a cycle.',
        fix: ['WITH RECURSIVE walk(category_id, depth) AS (', '  SELECT 1, 0', '  UNION ALL', '  SELECT c.category_id, w.depth + 1', '  FROM categories AS c', '  JOIN walk AS w ON c.parent_id = w.category_id', '  WHERE w.depth < 20', ')', 'SELECT count(*) FROM walk;'].join('\n'),
        cheer: 'A guard costs nothing and saves a server.'
      }),

      B.code({
        id: 'm5-plan-corr', t: 2, src: 'rec', title: 'A correlated subquery in the plan', file: 'EXPLAIN (ANALYZE) on PostgreSQL ' + G.meta('postgres') + ' and DuckDB ' + G.meta('duckdb'), lang: 'text', code: PLAN_CORR,
        steps: [
          { say: 'The correlated subquery again, on 3,000 customers and 30,000 orders. The first lines show the query. The plans below come from EXPLAIN with ANALYZE, so the row counts are real.' },
          { say: 'PostgreSQL ' + G.meta('postgres') + ' does what the words say. `SubPlan 1` runs once for each customer: `loops=3000`. Each run scans the whole orders table and throws away 29,990 rows. That is 3,000 scans of 30,000 rows, 90 million row reads.', lines: G.span(PLAN_CORR, /^Seq Scan on big_customers/, /Rows Removed by Filter: 29990/) },
          { say: 'With an index on `customer_id`, each of the 3,000 loops finds its 10 rows through the index. There are still 3,000 loops, but each one is a lookup and not a scan.', lines: G.span(PLAN_CORR, /Bitmap Heap Scan/, /Index Cond/) },
          { say: 'DuckDB ' + G.meta('duckdb') + ' rewrote the subquery as a join. It scans `big_orders` once, groups it by customer, and hash-joins the result to the customers. No loop is left.', lines: G.span(PLAN_CORR, /^HASH_JOIN RIGHT/, /SCAN big_customers/) }
        ],
        note: 'The plans show shapes and row counts. Times are not recorded. This is one query on one version of each engine. Another version may plan it differently, so read the plan on yours.'
      }),

      B.code({
        id: 'm5-plan-exists', t: 3, src: 'rec', title: 'EXISTS in the plan: a semi join', file: 'EXPLAIN (ANALYZE) on PostgreSQL ' + G.meta('postgres') + ' and DuckDB ' + G.meta('duckdb'), lang: 'text', code: PLAN_EXISTS,
        steps: [
          { say: 'The EXISTS form of a membership question on the same big tables: which customers have a refunded order?' },
          { say: 'PostgreSQL turned the correlated EXISTS into a `Hash Semi Join`. It scanned the orders once, kept the 900 refunded ones in a hash table, and checked each of the 3,000 customers against it. 90 customers matched. There is no loop of subqueries.', lines: G.span(PLAN_EXISTS, /^Hash Semi Join/, /Rows Removed by Filter/) },
          { say: 'DuckDB made the same choice and calls it `HASH_JOIN RIGHT_SEMI`. A semi join returns each left row at most once, which is why EXISTS never multiplies rows the way a join does.', lines: G.span(PLAN_EXISTS, /^HASH_JOIN RIGHT_SEMI/, /SCAN big_customers/) }
        ]
      }),

      B.code({
        id: 'm5-plan-cte', t: 2, src: 'rec', title: 'A CTE in the plan: inlined or kept', file: 'EXPLAIN (ANALYZE) on PostgreSQL ' + G.meta('postgres'), lang: 'text', code: PLAN_CTE,
        steps: [
          { say: 'The same lookup of one order, written with a CTE, on the 30,000 big orders, with an index on `order_id`. The first form is a plain CTE. The second adds `MATERIALIZED`.' },
          { say: 'PostgreSQL ' + G.meta('postgres') + ' inlines a plain CTE that is used once. The plan has no CTE node at all. The filter goes into the scan, and the index finds one row.', lines: G.span(PLAN_CTE, /^Index Scan/, /Index Cond/) },
          { say: 'With `MATERIALIZED` the engine computes the CTE first, in full, and filters afterwards. The inner scan produced 30,000 rows to find one, and the index is not used.', lines: G.span(PLAN_CTE, /^CTE Scan/, /Seq Scan on big_orders/) }
        ],
        note: 'This is the plan shape and the row counts, not a timing. The times are not recorded, because they change from run to run.'
      }),

      B.code({
        id: 'm5-plan-twice', t: 3, src: 'rec', title: 'A CTE used twice is computed once', file: 'EXPLAIN (ANALYZE) on PostgreSQL ' + G.meta('postgres'), lang: 'text', code: PLAN_TWICE,
        steps: [
          { say: 'The share of revenue query again, on the 30,000 big orders. The first lines show the query. The CTE `s` is used twice: in the main query and inside the subquery that adds the stores up.' },
          { say: 'PostgreSQL computes `s` once: one scan of `big_orders` that kept 27,315 paid rows and removed 2,685, then a hash aggregate that made 4 rows.', lines: G.span(PLAN_TWICE, /^  CTE s/, /Rows Removed by Filter/) },
          { say: 'Both readers scan that same result of 4 rows: the InitPlan that adds the stores up, and the main query.', lines: G.span(PLAN_TWICE, /InitPlan 2/, /CTE Scan on s a/) }
        ]
      }),

      B.challenge({
        id: 'm5-ch-second', t: 1, title: 'Coding round: the second highest paid order', file: 'second_highest.sql', lang: 'sql',
        q: 'Return the **second highest total among the paid orders** as one value. Use a subquery. A window function is the other way and comes in mission 6.',
        data: [{ name: 'orders (3 columns)', cols: G.cols('data.orders', ['order_id', 'status', 'total']).cols, rows: G.cols('data.orders', ['order_id', 'status', 'total']).rows, types: ['INTEGER', 'VARCHAR', 'DECIMAL(10,2)'] }],
        starter: '-- the second highest total among paid orders\nSELECT ...',
        hints: ['The highest total is `max(total)`.', 'The second highest is the highest of the totals that are smaller than the highest.', 'A scalar subquery can return the highest total.'],
        sol: G.file('m5.ch_second'),
        res: res('m5.ch_second', 'duckdb'),
        expl: ['The inner query returns the highest paid total, 26.00.', 'The outer query takes the highest total below it: 19.00.', 'If two orders tied for the highest total, this would return the highest value below the tie. A query that sorts and skips one row would return the tied total again.'],
        cx: 'Two passes over the table, one for the inner max and one for the outer. With an index on the total each pass is a lookup.'
      }),

      B.challenge({
        id: 'm5-ch-storeavg', t: 2, title: 'Coding round: orders above the average of their own store', file: 'above_store_average.sql', lang: 'sql',
        q: 'Return the **paid orders whose total is above the average paid total of their own store**: order id, store and total, in order id order. Use a correlated subquery.',
        data: [{ name: 'orders (4 columns)', cols: G.cols('data.orders', ['order_id', 'store_id', 'status', 'total']).cols, rows: G.cols('data.orders', ['order_id', 'store_id', 'status', 'total']).rows, types: ['INTEGER', 'INTEGER', 'VARCHAR', 'DECIMAL(10,2)'] }],
        starter: '-- paid orders above the average of their own store\nSELECT ...',
        hints: ['The average depends on the store of the outer row.', 'A subquery that refers to `o.store_id` is correlated.', 'Use two aliases for the table: one outside and one inside.'],
        sol: G.file('m5.ch_storeavg'),
        res: res('m5.ch_storeavg', 'duckdb'),
        expl: ['For each outer order, the inner query averages the paid totals of the same store.', 'Store 1 averages 16.40, store 2 averages 7.25, store 4 averages 15.25. Five orders are above their store average.', 'Order 1009 is worth only 9.50, and it is above the average of store 2. A global average would have missed it.'],
        cx: 'Logically one inner query for each outer row. DuckDB rewrote a correlated subquery as a join in the plan scene, and PostgreSQL ran one as a SubPlan for each outer row. On a big table write it as a join to a per-store average.'
      }),

      B.challenge({
        id: 'm5-ch-subtree', t: 2, title: 'Coding round: everything under Drinks', file: 'subtree.sql', lang: 'sql',
        q: 'Return every category **under and including Drinks**, with its depth below Drinks, ordered by depth. Use a recursive CTE that starts at the category named `Drinks`.',
        data: [{ name: 'categories', cols: G.table('data.categories').cols, rows: G.table('data.categories').rows, types: ['INTEGER', 'VARCHAR', 'INTEGER'] }],
        starter: '-- Drinks and all its descendants, with the depth\nWITH RECURSIVE sub AS (\n  ...\n)\nSELECT ...',
        hints: ['The anchor selects the category named Drinks, at depth 0.', 'The recursive step finds the categories whose parent is in the working table.', 'The depth is the depth of the parent plus 1.'],
        sol: G.file('m5.ch_subtree'),
        res: res('m5.ch_subtree', 'duckdb'),
        expl: ['The anchor starts at Drinks, not at the root, so only the subtree is walked.', 'Coffee and Tea are at depth 1, Espresso drinks and Cold coffee at depth 2.', 'The loop ends after depth 2, because those two have no children.'],
        cx: 'One iteration for each level, and each iteration reads only the children of the last rows. With an index on `parent_id` it is linear in the size of the subtree.'
      }),

      B.decide({
        id: 'm5-dec-share', t: 2, title: 'Decision: how do six dashboards share one cleaning step?',
        scenario: 'Six dashboards need the same cleaned orders: duplicates removed, test orders dropped, currencies converted. The logic is 80 lines and takes several minutes to run on the full history. Every dashboard refreshes every 15 minutes. Where does the logic live?',
        opts: [
          { t: 'Copy the CTE into every dashboard query', d: 'No new object. Each query is self-contained.', lose: 'The logic exists in six places and drifts. Each refresh repeats the expensive work six times.' },
          { t: 'A view', d: 'One definition. The dashboards select from the view.', lose: 'The definition is shared, but every refresh still pays the full cost, six times every 15 minutes.' },
          { t: 'A table that a scheduled job rebuilds', d: 'The cleaned orders are stored. The dashboards read the table.', lose: '' },
          { t: 'A temporary table in each dashboard session', d: 'Compute once per session, read many times.', lose: 'The table lives only in one session, so six dashboards still compute it six times, and nothing else can use it.' }
        ],
        pick: 2,
        why: 'The work is expensive and shared, and a delay of 15 minutes is acceptable. A table that a job rebuilds pays the cost once, gives every dashboard the same numbers, and makes reads cheap. A view would share the definition but not the cost.',
        when: 'If the logic is cheap, a view is better: always fresh, nothing to refresh. If you need fresher data than a job can give, an incrementally maintained table or a materialized view helps.'
      }),

      B.incident({
        id: 'm5-inc-cte', t: 2, time: '16:20',
        alert: 'The order lookup in the support tool takes seconds. It used to return at once. The query was refactored last week into a CTE, `WITH o AS MATERIALIZED (SELECT * FROM orders) SELECT * FROM o WHERE order_id = ?`, to make it "easier to read". The table has an index on order_id.',
        clues: ['The table has 30,000 rows in the test copy and many millions in production.', 'The plan shows a CTE Scan node.', 'Nothing else changed.'],
        opts: [
          { t: 'Add more memory to the database server', fb: 'The query does far more work than it needs to. Memory does not change that.' },
          { t: 'Read the plan: where does the filter run, and how many rows does the CTE produce?', fb: '' },
          { t: 'Create a second index on order_id', fb: 'The index exists, and the plan does not use it. A second one will not help.' },
          { t: 'Cache the result in the application', fb: 'It hides one slow call and leaves the query slow.' }
        ],
        best: 1,
        why: 'A MATERIALIZED CTE is computed in full before the outer filter runs. In the recorded plan the inner scan produced 30,000 rows to return one, and the index was not used. Without the keyword PostgreSQL inlined the CTE and used the index scan for one row.',
        checks: [['Run EXPLAIN (ANALYZE)', 'The CTE Scan shows `actual rows=1` and the inner Seq Scan shows `actual rows=30000`.'], ['Compare with the plain CTE', 'Without MATERIALIZED the plan is a single Index Scan that returned 1 row.'], ['Remove the keyword', 'Or remove the CTE: the query was a one-line filter.'], ['Check the other MATERIALIZED hints', 'Search the code base for the same pattern.']],
        tell: 'A lookup that returned at once took seconds after a refactor. The new CTE was marked MATERIALIZED, so PostgreSQL computed all the rows first and filtered afterwards, and it ignored the index. I read the plan, saw the CTE Scan over the whole table, removed the keyword, and the plan went back to an index scan. I also searched for the same hint elsewhere.',
        prevent: ['Review a MATERIALIZED or NOT MATERIALIZED hint like a performance change: it needs a plan.', 'Keep a few plan checks for the critical lookups.', 'Do not wrap a table in a CTE for readability when the query is one line.']
      }),

      B.qa({
        id: 'qa-subquery', t: 1, tag: 'Subqueries', secs: 60,
        q: 'What kinds of subquery are there, and what must each return?',
        pts: ['Scalar: one value', 'IN: a column of values', 'EXISTS: any rows', 'Correlated: refers to the outer row', 'Derived table in FROM'],
        short: 'A scalar subquery stands where a value stands and must return at most one row and one column. A subquery after IN returns one column and any number of rows. After EXISTS it may return anything, because only the presence of a row counts. A correlated subquery refers to a column of the outer query, so it logically runs once for each outer row. A subquery in FROM is a derived table and needs an alias. The usual mistake is a scalar subquery that returns several rows: DuckDB and PostgreSQL raise an error, and SQLite silently takes the first row, so I use an aggregate or a join.',
        fu: [['How do you pick between IN and EXISTS?', 'IN for a short list of values, EXISTS for a yes or no question on a related table. EXISTS is also safe with NULLs.']],
        trap: 'Relying on SQLite to pick the first row of a scalar subquery.',
        real: 'Tell about a subquery you replaced with a join, or the other way.'
      }),

      B.qa({
        id: 'qa-cte', t: 1, tag: 'CTEs', secs: 60,
        q: 'What is a CTE and when do you use one?',
        pts: ['A named subquery for one statement', 'Readable steps from top to bottom', 'Can be used more than once', 'Not a table, nothing is stored'],
        short: 'A common table expression is a named subquery, written with WITH, that exists for one statement. I use it to break a long query into steps with names, so it reads from top to bottom: clean the orders, aggregate them, then join to customers. A CTE can be used more than once in the same statement, which avoids repeating a long subquery. It stores nothing. Whether the engine runs it once or merges it into the outer query is the planner\'s choice, so a CTE is mostly a readability tool, and I check the plan when performance matters.',
        fu: [['Is a CTE faster than a subquery?', 'Not by itself. Many engines inline it and produce the same plan. If it is referenced twice, the engine may compute it once.']],
        trap: 'Believing that a CTE is a temporary table.',
        real: 'Tell about a long query you made readable with CTEs.'
      }),

      B.qa({
        id: 'qa-existsin', t: 1, tag: 'Subqueries', secs: 60,
        q: 'EXISTS or IN: which do you use?',
        pts: ['IN: a short list of values', 'EXISTS: a yes or no on related rows', 'NOT IN breaks with NULLs', 'NOT EXISTS is safe'],
        short: 'IN checks whether a value is in a list that a subquery returns. EXISTS checks whether a correlated subquery returns at least one row. For a positive test with a clean key they return the same rows, and in my plans PostgreSQL and DuckDB both turned EXISTS into a semi join. The difference is NULL. `NOT IN` returns nothing if the list holds a NULL, so I use `NOT EXISTS` for the negative case. I also prefer EXISTS when I only need to know whether related rows exist, because it never multiplies rows the way a join does. On the course data NOT IN returned 0 customers and NOT EXISTS returned 2.',
        fu: [['Why can a JOIN replace EXISTS wrongly?', 'A join returns one row for each match, so a customer with three matching orders appears three times.']],
        trap: 'Using NOT IN on a nullable column.',
        real: 'Tell about an EXISTS that replaced a join and removed duplicates.'
      }),

      B.qa({
        id: 'qa-correlated', t: 2, tag: 'Subqueries', secs: 60,
        q: 'What is a correlated subquery and what does it cost?',
        pts: ['It refers to the outer row', 'Logically runs once for each outer row', 'Some engines rewrite it as a join, some do not', 'Read the plan on big tables'],
        short: 'A correlated subquery uses a column of the outer query, so its result can differ for each outer row, such as the biggest order of this customer. Logically it runs once for each outer row. What happens in practice depends on the engine. In my test on 3,000 customers and 30,000 orders, PostgreSQL 16 ran it as a SubPlan with 3,000 loops, each scanning the orders table. With an index on the join column each loop became a lookup. DuckDB rewrote the same query as one join and one grouped scan. So I read the plan on big tables, and I write the join or a window function myself when the engine will not.',
        fu: [['How would you write it without a correlated subquery?', 'Aggregate once in a CTE and join it back, or use a window function such as `max(total) OVER (PARTITION BY customer_id)`.']],
        trap: 'Assuming that every engine rewrites a correlated subquery as a join.',
        real: 'Tell about a correlated subquery that you replaced after reading the plan.'
      }),

      B.qa({
        id: 'qa-recursive', t: 2, tag: 'CTEs', secs: 60,
        q: 'How does a recursive CTE work, and how do you keep it from running forever?',
        pts: ['Anchor runs once', 'The recursive step reads the last rows', 'It ends when a step returns nothing', 'A cycle needs UNION or a depth guard'],
        short: 'A recursive CTE has an anchor query, which runs once, and a recursive step, joined with UNION ALL. The step reads the rows produced by the previous round and produces new ones, and the loop ends when a round produces no rows. I use it for hierarchies, such as a category tree, and for series, such as a calendar. If the data has a cycle, the loop never ends, so I add a guard: a depth limit in the step, or UNION instead of UNION ALL, which drops rows already seen but only works when the rows carry no counter. On a cycle of three categories, a depth guard of 20 produced 61 rows, and UNION returned the 9 distinct categories and stopped. I also fix the data.',
        fu: [['What do you check in the data of a tree?', 'That no row is its own ancestor, and that every non-root row has a parent that exists. A test on the table can catch cycles.']],
        trap: 'Using UNION ALL on data that may contain a cycle, without a guard.',
        real: 'Tell about a hierarchy you walked with a recursive CTE.'
      }),

      B.qa({
        id: 'qa-ctemat', t: 3, tag: 'CTEs', secs: 60,
        q: 'Does the engine run a CTE once, or inline it?',
        pts: ['It depends on the engine and the version', 'A plain CTE used once is usually inlined', 'A CTE used twice may be computed once', 'Hints can force either way', 'Read the plan'],
        short: 'It depends on the engine. Older versions of PostgreSQL always computed a CTE first and treated it as a fence. Newer versions inline a plain non-recursive CTE that is used once, so the outer filter can reach the table and use an index, and they keep a CTE that is used more than once as a single computation. The keywords MATERIALIZED and NOT MATERIALIZED force one behavior. In my test, a lookup in a plain CTE used the index and returned one row, and with MATERIALIZED the plan scanned all 30,000 rows first. I do not assume. I read the plan on the engine I use.',
        fu: [['When do you want MATERIALIZED?', 'When the CTE is expensive and used several times, or when it has a side effect you want to run once.']],
        trap: 'Assuming that every engine treats a CTE as a temporary table, or that none does.',
        real: 'Tell about a plan that changed when you moved a filter into or out of a CTE.'
      }),

      B.qa({
        id: 'qa-viewtable', t: 2, tag: 'Views', secs: 60,
        q: 'What is the difference between a view, a materialized view and a table?',
        pts: ['A view stores the query', 'A materialized view stores the rows and must be refreshed', 'A table stores the rows and is maintained by jobs', 'Choose by cost and freshness'],
        short: 'A view stores a query, not rows. Selecting from it runs the query, so it is always current and costs what the query costs. A materialized view stores the result rows, so reads are fast, and the database refreshes it on demand or on a schedule, so it can be out of date. A plain table also stores rows, and a job that I write fills it. I choose by cost and freshness. A cheap query that must be current is a view. An expensive query that many readers need, where a delay is fine, is a materialized view or a table. With a table I control the schedule and the incremental logic.',
        fu: [['What does a view do to the plan?', 'Usually it is inlined into the query that uses it, so the planner can push filters into it.']],
        trap: 'Creating a view over an expensive query and being surprised when every dashboard is slow.',
        real: 'Tell about a view you turned into a table, and why.'
      }),

      B.recap({
        id: 'm5-recap', n: 5, badge: 'Subquery Writer', color: '#FBCFE8',
        pts: [
          '**Scalar** subquery: one value. **IN**: a list. **EXISTS**: any row, safe with NULL. **Correlated**: refers to the outer row. A scalar subquery with several rows is an error, or SQLite takes the first.',
          'A **CTE** names a subquery for one statement. It stores nothing. A **view** stores the query. A **table** stores the rows.',
          'Start with a CTE. Make it a view when queries share it, and a table when it is expensive and many read it.',
          'A **recursive CTE** has an anchor that runs once and a step that runs until it finds nothing. It walks trees and builds calendars.',
          'A cycle never ends with UNION ALL. Use a **depth guard** or UNION, and fix the data.',
          'PostgreSQL **inlines** a plain CTE used once and keeps a **MATERIALIZED** one. Read the plan to see which.'
        ],
        lines: [
          'I use EXISTS for yes or no questions, and NOT EXISTS instead of NOT IN.',
          'A CTE is a name, not a table. I read the plan when it matters.',
          'A recursive CTE needs a way to stop, and a cycle in the data needs a guard.'
        ]
      })
    ]
  });
})();
