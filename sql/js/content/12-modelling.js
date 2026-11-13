/* Mission 12: modelling for analytics. Grain, fact and dimension tables, a star schema built from the Brewline tables, the unknown member, reconciliation,
   the fan-out of a wrong grain, normalization and its anomalies, and the three kinds of fact table. Recorded on DuckDB and PostgreSQL (SQLite for two blocks). */
(function () {
  var B = LAB.b, G = LAB.get;
  function flat(t) { return t.rows.map(function (r) { return r.map(function (c) { return /^-?\d+(\.\d+)?$/.test(c) ? String(parseFloat(c)) : c; }).join('|'); }).join(';'); }
  function agree(key) { return flat(G.on(key, 'duckdb')) === flat(G.on(key, 'postgres')); }
  var BU = G.on('m12.build', 'duckdb').rows[0], FS = G.on('m12.fact_sample', 'duckdb'), BC = G.on('m12.by_category', 'duckdb'), BD = G.on('m12.by_daytype', 'duckdb'), UC = G.on('m12.unknown_customer', 'duckdb');
  var RC = G.on('m12.reconcile', 'duckdb').rows[0], FO = G.on('m12.fanout', 'duckdb').rows[0], GO = G.on('m12.grain_order', 'duckdb').rows[0], GL = G.on('m12.grain_line', 'duckdb').rows[0], GS = G.on('m12.grain_store', 'duckdb').rows[0], GC = G.on('m12.grain_customer', 'duckdb').rows[0];
  var WA = G.on('m12.wide_anomaly', 'duckdb'), NU = G.on('m12.normal_update', 'duckdb'), LC = G.on('m12.lifecycle', 'duckdb'), CR = G.on('m12.ch_revenue', 'duckdb'), CW = G.on('m12.ch_weekday', 'duckdb'), CA = G.on('m12.ch_aov', 'duckdb').rows[0][0];
  var DF = G.on('m12.dump_fact', 'duckdb'), DP = G.on('m12.dump_product', 'duckdb'), DD = G.on('m12.dump_date', 'duckdb');

  G.expect(BU.join() === '10,6,4,9,19' && agree('m12.build'), 'the star has 10 days, 6 products, 4 stores, 9 customers (with the unknown member) and 19 fact rows, on both engines');
  G.expect(FS.rows[0].join() === '1001,1,20260301,1,1,1,2,7.00' && agree('m12.fact_sample') && DF.rows.length === 19 && DP.rows.length === 6 && DD.rows.length === 10, 'the first fact rows and the table sizes');
  G.expect(BC.rows.length === 9 && agree('m12.by_category') && BC.rows.reduce(function (a, r) { return a + parseFloat(r[2]); }, 0) === 127, 'revenue by category and country adds up to 127.00 and both engines agree');
  G.expect(flat(BD) === 'weekday|6|80;weekend|3|47' && agree('m12.by_daytype') && UC.rows[3].join() === 'Unknown customer,1,9.50' && agree('m12.unknown_customer'), 'weekday 6 orders 80.00, weekend 3 orders 47.00, and the guest order of 9.50 sits under the unknown customer');
  G.expect(RC.join() === '156.00,156.00,0' && agree('m12.reconcile') && FO.join() === '127.00,228.00' && agree('m12.fanout'), 'the fact table reconciles to the orders (156.00, 0 differences) and summing the order total on lines gives 228.00 instead of 127.00');
  G.expect(GO.join() === '12,156.00,12,13.0' && GL.join() === '19,156.00,12,8.21' && GS.join() === '4,156.00,NULL,39.0' && GC.join() === '7,156.00,NULL,22.29', 'the four grains: 12, 19, 4 and 7 rows for the same 156.00');
  G.expect(WA.rows[0].join() === 'Ana Lim,2,3' && NU.rows.length === 3 && NU.rows.every(function (r) { return r[2] === 'MY'; }) && flat(WA) === flat(G.on('m12.wide_anomaly', 'sqlite')), 'a wide table gives Ana two countries after one update and a customers table updates all three of her orders');
  G.expect(LC.rows.length === 12 && LC.rows[4].join() === '1005,cancelled,2026-03-04 03:05:00,NULL,NULL' && LC.rows[7][4] !== 'NULL', 'the lifecycle has 12 orders, no payment for the cancelled one and a refund for 1008');
  G.expect(flat(CR) === 'beans|56;hot|32;merch|24;cold|15' && CW.rows.length === 7 && CA === '14.11' && agree('m12.ch_revenue') && agree('m12.ch_weekday'), 'the coding rounds');

  var BUILD = G.file('m12.build'), FANQ = G.file('m12.fanout'), RECQ = G.file('m12.reconcile'), CATQ = G.file('m12.by_category'), DAYQ = G.file('m12.by_daytype'), UNQ = G.file('m12.unknown_customer');
  var WIDEQ = G.file('m12.wide_anomaly'), NORMQ = G.file('m12.normal_update'), LIFEQ = G.file('m12.lifecycle'), SAMPQ = G.file('m12.fact_sample');
  function res(key, e) { var t = e ? G.on(key, e) : G.table(key); return { msg: t.rows.length + ' rows', cols: t.cols, rows: t.rows }; }
  var FACT_TYPES = ['INTEGER', 'INTEGER', 'INTEGER', 'INTEGER', 'INTEGER', 'INTEGER', 'VARCHAR', 'INTEGER', 'DECIMAL(10,2)'];

  LAB.addChapter({
    id: 'm12', n: 12, title: 'Modelling for analytics', short: 'Modelling', blurb: 'Grain, facts and dimensions, a star schema built and queried, the unknown member, the fan-out of a wrong grain, normalization and fact table types', minutes: 55,
    focus: ['int', 'mart'],
    goals: [
      'State the **grain** of a table before you write a column.',
      'Build a **star schema**: one fact table and its dimensions, with keys and measures.',
      'Query it by joining the dimensions you need, and **reconcile** it to the source.',
      'Avoid the **fan-out** of a wrong grain, and keep rows with no customer with an **unknown member**.',
      'Know **normalization**, the three kinds of fact table, and star against snowflake.'
    ],
    say: 'Mission 12 is about the shape of tables. Before any column, decide what one row means. That is the grain. I built a star schema from the Brewline tables, ran the same queries on DuckDB and PostgreSQL, and checked that it adds up to the source. Then I show what breaks when the grain is wrong, with numbers.',
    scenes: [
      B.talk({
        id: 'm12-what', t: 1, src: 'docs', title: 'The shape of an analytics table',
        say: 'Press Next for six ideas about modelling.',
        items: [
          ['Grain first', 'The grain says what one row stands for: one order, one order line, one store and day. Everything else follows from it, and a table with a vague grain gives wrong numbers.', 'What is one row?'],
          ['Facts are events, dimensions are descriptions', 'A fact table has a row for each event, such as a sale, with keys and numbers to add up. A dimension describes a thing: a customer, a product, a day.', 'Events and things.'],
          ['A star joins facts to dimensions', 'The fact table sits in the middle, with one key for each dimension. A query joins what it needs and groups by the descriptions. Few joins, one hop each.', 'One hop to each dimension.'],
          ['Keep the detail, add up later', 'A fact table at the finest grain can answer many questions. A summary table answers few, and it cannot be taken apart again.', 'Detail can be summed, a sum cannot be split.'],
          ['Normalization removes repeats', 'In a normalized model each fact is stored once. That protects writes from anomalies. Analytics reads prefer fewer joins, so facts and dimensions are partly denormalized on purpose.', 'Store once for writes, flatten for reads.'],
          ['Check against the source', 'A new model must add up to the source: the same total, the same count. A difference is a bug in the model, not a rounding.', 'Reconcile before you trust.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm12-models', t: 1, src: 'docs', title: 'Three shapes for the same data',
        say: 'The Brewline data in three shapes. Press Next for each.',
        cols: ['Shape', 'Structure', 'Good for', 'Weak at'],
        hl: 2,
        rows: [
          ['Normalized (as in the app)', 'Many small tables joined by keys: orders, order_items, customers, products', 'Writes: each fact is stored once', 'Analytics: many joins, and the rules are spread out'],
          ['Star schema', 'One fact table and a few flat dimensions', 'Reads, BI tools, clear meaning of every column', 'Needs a load job, and the dimension history needs care'],
          ['One big table', 'Everything joined into one wide table', 'Simple queries, a fast dashboard on one question', 'Repeats data, grows large and drifts when the source changes']
        ],
        steps: [
          { upto: 1, say: 'The application model is built for writing. It is the source of the star.' },
          { upto: 2, say: 'The star is built for reading. It is the usual answer for a warehouse.' },
          { upto: 3, say: 'One big table is the fast and simple answer for one dashboard. It is the first thing that people build, and it is rarely the last.' }
        ],
        pick: 'Normalize where you write, a star where you analyse, and a wide table only for one known question.'
      }),

      B.flow({
        id: 'm12-flow', t: 1, src: 'docs', title: 'A star schema', g: 'star', legend: true,
        steps: [
          { say: 'The fact table in the middle holds one row for each order line. Press Next to meet the dimensions around it.', tags: ['tg_x1'] },
          { say: 'Step 1. `dim_date` has a row for each day, with the weekday and whether it is a weekend.', on: ['k1'], focus: ['x_date', 'x_fact'], cap: 'Date.' },
          { say: 'Step 2. `dim_customer` has a row for each customer, and an extra "unknown customer" row for orders with no customer.', on: ['k2'], focus: ['x_cust', 'x_fact'], cap: 'Customer.' },
          { say: 'Step 3. `dim_store` describes the store: its city and country.', on: ['k3'], focus: ['x_store', 'x_fact'], cap: 'Store.' },
          { say: 'Step 4. `dim_product` describes the product and its category.', on: ['k4'], focus: ['x_prod', 'x_fact'], tags: ['tg_x2'], cap: 'Product.' }
        ]
      }),

      B.sql({
        id: 'm12-build', t: 1, src: 'rec', title: 'Build the star from the Brewline tables', file: 'star.sql', code: BUILD, ctx: G.ctx('duckdb'),
        result: res('m12.build', 'duckdb'),
        steps: [
          { say: 'Five tables, built with CREATE TABLE AS. The dimensions come first.' },
          { say: '`dim_product` and `dim_store` rename their ids to `_key` columns. A key of the star is a column that the fact table points to.', lines: G.span(BUILD, /^CREATE TABLE dim_product/, /^FROM products/) },
          { say: '`dim_customer` adds one more row with the key -1, "Unknown customer". Orders with no customer will point to it, and no order is lost.', lines: G.span(BUILD, /^CREATE TABLE dim_customer/, /SELECT -1/) },
          { say: '`dim_date` is built with a recursive CTE from mission 5, one row for each day, with the ISO weekday and a weekday or weekend label.', lines: G.span(BUILD, /^CREATE TABLE dim_date/, /^FROM d;/) },
          { say: 'The fact table has the grain of one order line. It joins the order lines to their orders, and keeps the keys and two numbers: `qty` and `line_amount`.', lines: G.span(BUILD, /^CREATE TABLE fact_sales/, /JOIN orders AS o/) },
          { say: 'Run it. 10 days, 6 products, 4 stores, 9 customers (8 and the unknown member) and 19 fact rows. DuckDB and PostgreSQL built the same tables.', run: true }
        ]
      }),

      B.sql({
        id: 'm12-sample', t: 1, src: 'rec', title: 'A fact row: keys and numbers', file: 'fact_sample.sql', code: SAMPQ, ctx: G.ctx('duckdb'),
        result: res('m12.fact_sample', 'duckdb'),
        steps: [
          { say: 'The first rows of `fact_sales`. Read them as sentences.' },
          { say: 'Run it. The first row says: order 1001, line 1, on day 20260301, by customer 1, in store 1, of product 1, quantity 2, amount 7.00. The `date_key` is the date as a number. Everything that is not a key is a number to add up.', run: true }
        ]
      }),

      B.sql({
        id: 'm12-category', t: 1, src: 'rec', title: 'Query the star: revenue by category and country', file: 'by_category.sql', code: CATQ, ctx: G.ctx('duckdb'),
        result: res('m12.by_category', 'duckdb'),
        steps: [
          { say: 'A business question: paid revenue by product category and by the country of the store. Two joins, one to each dimension.' },
          { say: 'Each join is one hop from the fact table to a dimension, on its key.', lines: G.span(CATQ, /^JOIN dim_product/, /^JOIN dim_store/) },
          { say: 'Run it. 9 rows. The nine amounts add up to 127.00, the paid revenue of the source. Beans in Singapore are the largest, 42.00. PostgreSQL returned the same rows.', run: true }
        ]
      }),

      B.sql({
        id: 'm12-daytype', t: 2, src: 'rec', title: 'Why a date dimension', file: 'by_daytype.sql', code: DAYQ, ctx: G.ctx('duckdb'),
        result: res('m12.by_daytype', 'duckdb'),
        steps: [
          { say: 'Weekday against weekend is not in the order timestamp. The date dimension holds it, ready to join.' },
          { say: 'The join uses the date key, and the label comes from the dimension.', lines: G.span(DAYQ, /^JOIN dim_date/) },
          { say: 'Run it. 6 paid orders on weekdays for 80.00 and 3 on weekends for 47.00. Any other calendar attribute, such as the fiscal week, a holiday or the month name, is one more column of `dim_date`, and no query has to compute it.', run: true }
        ]
      }),

      B.sql({
        id: 'm12-unknown', t: 2, src: 'rec', title: 'The unknown member', file: 'unknown_customer.sql', code: UNQ, ctx: G.ctx('duckdb'),
        result: res('m12.unknown_customer', 'duckdb'),
        steps: [
          { say: 'Order 1009 has no customer: a guest. In the fact table its `customer_key` is -1, which points to the "Unknown customer" row.' },
          { say: 'Run it. The guest order of 9.50 appears under "Unknown customer". Without the unknown member, an inner join to `dim_customer` would drop that order, and the revenue would be short by 9.50. A LEFT JOIN with NULLs is the other way. The unknown member keeps the join simple.', run: true }
        ]
      }),

      B.sql({
        id: 'm12-reconcile', t: 1, src: 'rec', title: 'Reconcile the model to the source', file: 'reconcile.sql', code: RECQ, ctx: G.ctx('duckdb'),
        result: res('m12.reconcile', 'duckdb'),
        steps: [
          { say: 'A model must add up to its source. Three checks in one query: the total of the orders, the total of the fact table, and the number of orders where the two disagree.' },
          { say: 'Run it. Both totals are 156.00 and no order differs. If a join had dropped or doubled a row, the totals would not match, and this query would show it. Run it after every load.', run: true }
        ]
      }),

      B.widget({ id: 'm12-lab-grain', kind: 'grain', t: 1, src: 'rec', title: 'Lab: one amount, four grains' }),

      B.sql({
        id: 'm12-fanout', t: 1, src: 'rec', title: 'A wrong grain doubles the revenue', file: 'fanout.sql', code: FANQ, ctx: G.ctx('duckdb'),
        result: res('m12.fanout', 'duckdb'),
        steps: [
          { say: 'The order total is a number at the grain of the order. If you join orders to the fact table and add `o.total`, it is repeated on every line of the order.' },
          { say: 'Run it. The right paid revenue is 127.00. The sum of the order total over the joined lines is 228.00, because an order with two lines is counted twice. Mission 3 showed this fan-out. The model fixes it by keeping a number only at the grain where it belongs: here `line_amount` on the line.', run: true }
        ]
      }),

      B.bug({
        id: 'm12-bug-grain', t: 1, title: 'Bug hunt: revenue that does not tie out',
        q: 'A dashboard shows the paid revenue by product category. Its total is 228.00 and the finance total is 127.00. Click the line that adds up a number at the wrong grain.',
        file: 'revenue_by_category.sql', lang: 'sql',
        code: ['SELECT p.category, sum(o.total) AS revenue', 'FROM orders AS o', 'JOIN fact_sales AS f ON f.order_id = o.order_id', 'JOIN dim_product AS p ON p.product_key = f.product_key', "WHERE o.status = 'paid'", 'GROUP BY p.category;'].join('\n'),
        bad: [1], hint: 'At which grain does `o.total` live, and at which grain is each joined row?',
        why: '`o.total` is the total of a whole order. After the join to the fact table each order appears once for each of its lines, so its total is added once for each line: 228.00 instead of 127.00. Add `f.line_amount`, which belongs to the line, and the category totals add up to 127.00.',
        fix: ['SELECT p.category, sum(f.line_amount) AS revenue', 'FROM fact_sales AS f', 'JOIN dim_product AS p ON p.product_key = f.product_key', "WHERE f.status = 'paid'", 'GROUP BY p.category;'].join('\n'),
        cheer: 'Add a number only at the grain where it is stored.'
      }),

      B.cmp({
        id: 'm12-normal', t: 2, src: 'docs', title: 'Normalization in three lines',
        say: 'Three rules that protect a table from update anomalies. Press Next for each.',
        cols: ['Form', 'Rule', 'Brewline example'],
        hl: 1,
        rows: [
          ['First (1NF)', 'One value in each cell, and no repeating groups', 'A list of items in one column breaks it. Use `order_items` with a row for each line.'],
          ['Second (2NF)', 'Every column depends on the whole key', 'In `order_items`, the product name does not depend on the line. It belongs in `products`.'],
          ['Third (3NF)', 'Columns depend on the key and on nothing else', 'The country of a customer belongs to the customer, not to each order.']
        ],
        steps: [
          { upto: 1, say: 'First normal form: a cell holds one value. A table with a list in a cell cannot be joined or counted properly.' },
          { upto: 2, say: 'Second normal form: with a key of two columns, every other column must depend on both.' },
          { upto: 3, say: 'Third normal form: nothing depends on another non-key column. That is what the next two scenes show.' }
        ],
        pick: 'Normalize the tables that you write to. Flatten them into dimensions for reading.'
      }),

      B.sql({
        id: 'm12-wide', t: 2, src: 'rec', title: 'An update anomaly in a wide table', file: 'wide_anomaly.sql', code: WIDEQ, ctx: G.ctx('duckdb'),
        result: res('m12.wide_anomaly', 'duckdb'),
        steps: [
          { say: 'A wide table repeats the country of the customer on every order row. Ana Lim moved to Malaysia. The update fixed one row.' },
          { say: 'The UPDATE changes one order row, because that is the row the job found.', lines: G.span(WIDEQ, /^UPDATE orders_wide/) },
          { say: 'Run it. Ana Lim now has 2 countries across her 3 rows. A report by country counts her in both. DuckDB, PostgreSQL and SQLite gave the same result. The country is repeated, so it can disagree with itself.', run: true }
        ]
      }),

      B.sql({
        id: 'm12-normalized', t: 2, src: 'rec', title: 'The same change in a normalized table', file: 'normal_update.sql', code: NORMQ, ctx: G.ctx('duckdb'),
        result: res('m12.normal_update', 'duckdb'),
        steps: [
          { say: 'The country is stored once, in the customers table. One UPDATE changes the only copy.' },
          { say: 'Run it. All three orders of Ana Lim show Malaysia, because they look up the one copy. A normalized table cannot disagree with itself. That is why the write side stays normalized.', run: true }
        ]
      }),

      B.cmp({
        id: 'm12-fact-types', t: 2, src: 'docs', title: 'Three kinds of fact table',
        say: 'Not every fact table records a sale. Press Next for each kind.',
        cols: ['Kind', 'One row is', 'In the Brewline data', 'Rows'],
        hl: 1,
        rows: [
          ['Transaction', 'One event that happened', 'fact_sales: one order line', GL[0] + ' rows'],
          ['Periodic snapshot', 'The state at a regular time', 'daily_revenue: a store on a day', '10 rows'],
          ['Accumulating snapshot', 'One process that is updated as it moves', 'One order, with its payment and refund times', LC.rows.length + ' rows']
        ],
        steps: [
          { upto: 1, say: 'A transaction fact is added once and never changes. It is the finest and the most flexible.' },
          { upto: 2, say: 'A periodic snapshot records a state at the end of each period, such as the balance or the stock of each day. The rows exist even when nothing happened.' },
          { upto: 3, say: 'An accumulating snapshot has one row for a process with several steps. Dates are filled in as the steps happen.' }
        ],
        pick: 'Choose the kind by the question: what happened, what was the state, or how far has this process come.'
      }),

      B.sql({
        id: 'm12-lifecycle', t: 2, src: 'rec', title: 'An accumulating snapshot: the life of an order', file: 'lifecycle.sql', code: LIFEQ, ctx: G.ctx('duckdb'),
        result: res('m12.lifecycle', 'duckdb'),
        steps: [
          { say: 'One row for each order, with the time of each step. A step that has not happened is NULL.' },
          { say: 'Two conditional minimums pick the first payment and the refund out of the payment rows.', lines: G.span(LIFEQ, /min\(CASE WHEN p.status = 'ok'/, /min\(CASE WHEN p.status = 'refund'/) },
          { say: 'Run it. 12 orders. Order 1005 was cancelled, so it has no payment. Order 1008 has a payment and later a refund. Order 1012 is pending and has no payment yet. When the payment arrives, the row is updated. DuckDB, PostgreSQL and SQLite returned the same rows.', run: true }
        ]
      }),

      B.cmp({
        id: 'm12-snowflake', t: 2, src: 'docs', title: 'Star or snowflake',
        say: 'A star keeps each dimension flat. A snowflake splits a dimension into several tables. Press Next for each.',
        cols: ['', 'Star', 'Snowflake'],
        hl: 1,
        rows: [
          ['Product dimension', 'One table with sku, name and category', 'Product, then category, then department, in separate tables'],
          ['Joins for a category report', 'One hop from the fact', 'Two or more hops'],
          ['Repeated values', 'The category name is repeated on each product', 'Stored once'],
          ['Good when', 'Reads and BI tools matter most', 'A dimension is huge or its parts change on their own']
        ],
        steps: [
          { upto: 1, say: 'A star has one flat table for the product.' },
          { upto: 2, say: 'A snowflake normalizes the dimension, so a report needs more joins.' },
          { upto: 3, say: 'The star repeats a few values. That costs little space and saves joins.' },
          { upto: 4, say: 'Most warehouses prefer the star. A snowflake is a fix for a dimension that is large or shared.' }
        ],
        pick: 'Start with a star. Split a dimension only when it hurts.'
      }),

      B.quiz({
        id: 'm12-q-grain', t: 1, q: 'The fact table has one row for each order line. A query adds `o.total` from the orders table after joining to it. The order has two lines. What happens to that order?',
        opts: [
          { t: 'It is counted once', fb: 'The join makes one row for each line, so the order total is on two rows.' },
          { t: 'It is counted twice', fb: '' },
          { t: 'It is not counted', fb: 'Both lines match the order, so it is counted.' },
          { t: 'The query fails', fb: 'It runs without an error, and that is the danger: the number is quietly wrong.' }
        ],
        ok: 1, why: 'Each line carries the whole order total, so adding it once for each line counts the order twice. In the recording 127.00 became 228.00. Put each number at its own grain.'
      }),

      B.quiz({
        id: 'm12-q-star', t: 2, q: 'In a star schema, how many joins does a report of revenue by product category and store country need from the fact table?',
        opts: [
          { t: 'One join to a combined dimension', fb: 'Product and store are two dimensions. They are separate tables.' },
          { t: 'Two joins, one hop each: product and store', fb: '' },
          { t: 'Four joins, one for each dimension of the star', fb: 'A query joins only the dimensions that it needs.' },
          { t: 'A join for each row of the fact table', fb: 'A join is between tables, not between rows and a table.' }
        ],
        ok: 1, why: 'The category is a column of `dim_product` and the country is a column of `dim_store`, so two joins, each directly from the fact table. The date and customer dimensions are not needed for this report.'
      }),

      B.quiz({
        id: 'm12-q-unknown', t: 2, q: 'An order has no customer. You join the fact table to `dim_customer` with an inner join. What happens without an unknown member?',
        opts: [
          { t: 'The order is dropped from the result', fb: '' },
          { t: 'The order is counted under customer 0', fb: 'No row of the dimension has a key to match the NULL.' },
          { t: 'The query fails', fb: 'It runs, and quietly returns less data.' },
          { t: 'The order is kept with an empty name', fb: 'That needs a LEFT JOIN, or an unknown member.' }
        ],
        ok: 0, why: 'A NULL key matches nothing, so an inner join drops the order. The recording had one guest order of 9.50. The unknown member with key -1 keeps it in the join, under "Unknown customer".'
      }),

      B.challenge({
        id: 'm12-ch-revenue', t: 1, title: 'Coding round: revenue by category from the star', file: 'revenue_by_category.sql', lang: 'sql',
        q: 'Using `fact_sales` and `dim_product`, return the **paid revenue of each product category**: `category` and `revenue`, with the biggest first.',
        data: [{ name: 'fact_sales', cols: DF.cols, rows: DF.rows, types: FACT_TYPES }, { name: 'dim_product', cols: DP.cols, rows: DP.rows, types: ['INTEGER', 'VARCHAR', 'VARCHAR', 'VARCHAR'] }],
        starter: '-- paid revenue of each category\nSELECT ...',
        hints: ['Join the fact to the product dimension on `product_key`.', 'Filter the paid lines: `status = \'paid\'`.', 'Add `line_amount` and group by the category.'],
        sol: G.file('m12.ch_revenue'),
        res: res('m12.ch_revenue', 'duckdb'),
        expl: ['One join from the fact table to `dim_product` gives each line a category.', '`sum(f.line_amount)` adds the amount of the line, the number that belongs to this grain.', 'Beans 56.00, hot 32.00, merch 24.00 and cold 15.00 add up to 127.00, the paid revenue of the source.'],
        cx: 'One join to a six row dimension and one group by category.'
      }),

      B.challenge({
        id: 'm12-ch-aov', t: 1, title: 'Coding round: the average order value', file: 'avg_order_value.sql', lang: 'sql',
        q: 'From `fact_sales`, return the **average order value of the paid orders**, rounded to 2 decimals, as `avg_order_value`. Be careful: the table has a row for each order line.',
        data: [{ name: 'fact_sales', cols: DF.cols, rows: DF.rows, types: FACT_TYPES }],
        starter: '-- average value of a paid order\nSELECT ...',
        hints: ['The average of `line_amount` is the average line, not the average order.', 'Add up the revenue, and divide by the number of orders.', '`count(DISTINCT order_id)` counts orders, not lines.'],
        sol: G.file('m12.ch_aov'),
        res: res('m12.ch_aov', 'duckdb'),
        expl: ['`sum(line_amount)` is the paid revenue, 127.00. `count(DISTINCT order_id)` is the number of paid orders, 9.', '127.00 divided by 9 is 14.11. `avg(line_amount)` would give the average line, which is smaller, because an order has several lines.', 'This is the fan-out again, in the other direction: a row is a line, so a count of rows is a count of lines.'],
        cx: 'One pass over the fact table, with a distinct count of order ids.'
      }),

      B.challenge({
        id: 'm12-ch-weekday', t: 2, title: 'Coding round: orders for each weekday', file: 'orders_by_weekday.sql', lang: 'sql',
        q: 'Using `fact_sales` and `dim_date`, return the **number of distinct orders for each ISO weekday**: `iso_weekday` and `orders`, ordered by weekday. Count the orders of every status.',
        data: [{ name: 'fact_sales', cols: DF.cols, rows: DF.rows, types: FACT_TYPES }, { name: 'dim_date', cols: DD.cols, rows: DD.rows, types: ['INTEGER', 'DATE', 'INTEGER', 'VARCHAR'] }],
        starter: '-- orders for each weekday\nSELECT ...',
        hints: ['Join on `date_key`.', 'An order has several lines, so count distinct order ids.', 'Group by the weekday of the date dimension.'],
        sol: G.file('m12.ch_weekday'),
        res: res('m12.ch_weekday', 'duckdb'),
        expl: ['The join to `dim_date` gives every fact row the ISO weekday of its day.', '`count(DISTINCT f.order_id)` counts each order once, although it has two lines.', 'The 12 orders spread over the seven weekdays: Monday has 3, and the others 1 or 2.'],
        cx: 'One join to a ten row dimension and one group by weekday.'
      }),

      B.decide({
        id: 'm12-dec-model', t: 2, title: 'Decision: how do you model the sales for the dashboards?',
        scenario: 'The shop sells 200 million order lines a year. Twelve dashboards and some analysts read the sales by product, store, customer group and day. The source is a normalized application database that changes all day. You choose the shape of the analytics tables.',
        opts: [
          { t: 'Query the application tables directly', d: 'No new tables, no load job.', lose: 'Every dashboard repeats the same long joins on the live write database, and its numbers move while you read them.' },
          { t: 'One wide table with everything joined', d: 'Simple for any query. No joins.', lose: 'Customer and product text is repeated 200 million times, a change in a product must be rewritten everywhere, and a second grain needs a second table.' },
          { t: 'A star schema: one fact table at the line grain and flat dimensions', d: 'One hop to each dimension, one meaning for each number.', lose: '' },
          { t: 'A table of daily totals only', d: 'Tiny and fast.', lose: 'The detail is gone: no product mix, no customer view, and no way to split a total again.' }
        ],
        pick: 2,
        why: 'A fact table at the finest grain keeps every question open, and flat dimensions keep every query to one join for each descriptor. In the recording, the star tied out to the source (156.00, 0 differences) and answered revenue by category and country with two joins.',
        when: 'For one dashboard on one known question, a pre-aggregated table or a wide table can be built on top of the star, as a layer, and rebuilt when the star changes.'
      }),

      B.incident({
        id: 'm12-inc-grain', t: 2, time: '09:05',
        alert: 'The new revenue by category dashboard shows 228 for the paid orders, and finance reports 127. The dashboard joins the orders table to the sales fact table and adds `o.total`. It was tested on an order that has one line.',
        clues: ['An order with two lines is counted twice.', 'The fact table has a row for each order line.', 'The total of the source is 127.00 for the paid orders.'],
        opts: [
          { t: 'Divide the dashboard total by a correction factor', fb: 'The factor depends on how many lines orders have, and it changes every day.' },
          { t: 'Add the line amount from the fact table, a number that belongs to the grain of the line', fb: '' },
          { t: 'Use DISTINCT on the order total', fb: 'DISTINCT removes equal values, so two different orders with the same total would collapse into one.' },
          { t: 'Join the orders table with a LEFT JOIN instead', fb: 'The join type does not change how many rows an order gets. It still has one for each line.' }
        ],
        best: 1,
        why: 'The order total lives at the grain of the order, and the fact table has the grain of the line, so the join repeats the total on every line. In the recording the sum was 228.00 instead of 127.00. `line_amount` is the number for this grain, and the category totals then add up to 127.00. A reconciliation query would have caught it before the dashboard did.',
        checks: [['Find the grain of each table', 'One row is an order here, and one row is an order line there.'], ['Compare the totals', 'The dashboard total against the source total: 228.00 against 127.00.'], ['Use the number of the right grain', 'Sum `line_amount` from the fact table, and do not join the orders table for a number.'], ['Add a check', 'A reconciliation query that fails when the model and the source differ.']],
        tell: 'The category revenue was 228 where finance had 127. The dashboard added the order total after a join to the line grain fact table, so orders with two lines were counted twice. I switched to the line amount of the fact table, which belongs to that grain, checked that the categories add up to 127.00, and added a reconciliation query that compares the model with the source after each load.',
        prevent: ['Write the grain of every table in its description.', 'Add a number only at the grain where it is stored.', 'Reconcile totals and counts after every load.']
      }),

      B.qa({
        id: 'qa-star', t: 1, tag: 'Modelling', secs: 60,
        q: 'What is a star schema and why do analysts use it?',
        pts: ['One fact table, several dimensions', 'Facts have keys and numbers', 'Dimensions are flat descriptions', 'One hop to each dimension'],
        short: 'A star schema has one fact table in the middle with a row for each event, such as an order line. It holds a key for each dimension and the numbers to add up, such as quantity and amount. Around it are flat dimension tables: date, customer, store, product. A query joins the fact table to the dimensions it needs and groups by their columns. That gives few joins, one hop each, and one clear meaning for each column. In my build there were 19 fact rows and four dimensions, and revenue by category and country needed two joins. The star also reconciled to the source: 156.00 on both sides, with 0 orders that differed.',
        fu: [['Why is the fact table at the finest grain?', 'Because the detail can always be added up, and a total cannot be split again.']],
        trap: 'Putting numbers from a coarser grain into the fact table.',
        real: 'Tell about a star schema that you built or used, and what its grain was.'
      }),

      B.qa({
        id: 'qa-model-grain', t: 1, tag: 'Modelling', secs: 60,
        q: 'What is the grain of a table and why does it matter?',
        pts: ['What one row stands for', 'Decide it first', 'Wrong grain gives fan-out', 'A number belongs to one grain'],
        short: 'The grain says what one row of a table stands for: one order, one order line, one store and day. I decide it before any column, and I write it in the table description. It matters because every number belongs to one grain, and mixing grains gives wrong totals. In my test the paid revenue was 127.00. After joining the orders to the line grain fact table and adding the order total, the sum was 228.00, because an order with two lines was counted twice. The same 156.00 of orders took 12 rows at the order grain, 19 at the line grain, 4 per store and 7 per customer, and only the finer grains could still answer questions about products.',
        fu: [['How do you check the grain?', 'Count rows against the distinct key columns. If they differ, the grain is not what you thought.']],
        trap: 'Joining a table at a coarser grain and adding its numbers.',
        real: 'Tell about a total that was wrong because of a join.'
      }),

      B.qa({
        id: 'qa-fact-types', t: 2, tag: 'Modelling', secs: 60,
        q: 'What kinds of fact table are there?',
        pts: ['Transaction facts', 'Periodic snapshots', 'Accumulating snapshots', 'Choose by the question'],
        short: 'A transaction fact has a row for each event, added once and never changed: an order line is one. A periodic snapshot has a row for the state at a regular time, such as the revenue of a store for a day or the stock level each night, and it has rows even for days with no events. An accumulating snapshot has one row for a process with several steps, such as an order with its order, payment and refund times, and the row is updated as steps happen. In my data, the sales fact had 19 rows, daily_revenue was a periodic snapshot with 10 rows, and the order lifecycle was an accumulating snapshot with 12 rows. I choose by the question: what happened, what was the state, or how far has this process come.',
        fu: [['Which one is updated in place?', 'The accumulating snapshot. The other two are only appended.']],
        trap: 'Using a transaction fact to answer a state question, such as stock at the end of a day.',
        real: 'Tell about a balance or stock table and how it was built.'
      }),

      B.qa({
        id: 'qa-normal', t: 2, tag: 'Modelling', secs: 60,
        q: 'What is normalization, and why denormalize for analytics?',
        pts: ['Store each fact once', 'Prevents update anomalies', 'Normal forms 1, 2 and 3', 'Denormalize dimensions for fewer joins'],
        short: 'Normalization stores each fact once: one value in a cell (first form), every column depends on the whole key (second) and on nothing but the key (third). It protects writes from anomalies. In my test, a wide table repeated the customer country on every order, and one UPDATE of one row left Ana Lim with 2 countries across her 3 orders. In the normalized customers table, one UPDATE changed the only copy and all three orders showed Malaysia. For analytics I flatten some of it on purpose: dimensions repeat descriptions, so a report needs one join for each descriptor and not a chain of tables. The load job takes care of keeping the copies consistent.',
        fu: [['Where do you normalize and where not?', 'Tables that are written by applications stay normalized. Tables built for reading are flatter.']],
        trap: 'Denormalizing a table that applications write to.',
        real: 'Tell about an update that left the data inconsistent.'
      }),

      B.qa({
        id: 'qa-unknown', t: 2, tag: 'Modelling', secs: 60,
        q: 'How do you handle facts with no matching dimension row?',
        pts: ['The unknown member', 'Key -1 for example', 'Inner join would drop the rows', 'Reconcile counts'],
        short: 'I add an "unknown" row to the dimension, with a key such as -1, and I load facts with a missing or unmatched key against it. Then every fact row has exactly one dimension row, an inner join keeps all rows, and the totals still tie out. In my sample, the guest order of 9.50 had no customer. It was loaded with customer key -1, and the report by customer showed it under "Unknown customer" with 1 order and 9.50. An inner join without the unknown member would have dropped it, and the revenue would have been short. I also count the facts under the unknown member, because a growing number means a data problem upstream.',
        fu: [['What about late arriving dimension rows?', 'Load the fact with the unknown key first, and fix the key when the dimension row arrives, or insert a placeholder dimension row and complete it later.']],
        trap: 'Inner joining to a dimension and losing rows silently.',
        real: 'Tell about a join that lost rows, and how you found out.'
      }),

      B.qa({
        id: 'qa-snowflake-model', t: 3, tag: 'Modelling', secs: 60,
        q: 'Star schema or snowflake schema?',
        pts: ['Star: flat dimensions, fewer joins', 'Snowflake: normalized dimensions, less repetition', 'Most warehouses choose the star', 'Snowflake when a dimension is huge or shared'],
        short: 'In a star, each dimension is one flat table, so a report is one hop from the fact table to each dimension. In a snowflake the dimensions are normalized into several tables: a product table, then a category table, then a department table. That stores repeated values once, and it needs more joins for every report. Warehouses are good at joins and cheap at storage, so the star is the usual choice: it is simpler to read and to teach to a BI tool. I split a dimension only when it is very large, when parts of it change on their own schedule, or when several dimensions share a sub-dimension. Even then I may expose a flat view on top for the analysts.',
        fu: [['What is a conformed dimension?', 'A dimension that several fact tables share, such as the date or the customer, so that their numbers can be compared.']],
        trap: 'Snowflaking every dimension "to be clean".',
        real: 'Tell about a dimension that you flattened or split.'
      }),

      B.qa({
        id: 'qa-obt', t: 3, tag: 'Modelling', secs: 60,
        q: 'When is one big table the right model?',
        pts: ['One known question or dashboard', 'No joins, simple queries', 'Repeats data, hard to change', 'Build it on top of a star'],
        short: 'A single wide table is right for one known question, such as one dashboard that is read all day by many people. It needs no joins, the query is simple, and a BI tool can use it at once. The cost is that it repeats every descriptor on every row, it grows large, a change in a dimension must be rewritten in many rows, and a second grain needs a second table. So I do not use it as the base model. I build it as a layer on top of the star, derived by a job, and I rebuild it when the star changes. The star remains the place where the numbers are defined and reconciled: in my build, 156.00 on the fact table and 156.00 on the source.',
        fu: [['How does a wide table drift?', 'The source changes and the copy is not rebuilt, so two reports of the same number disagree, as Ana Lim\'s two countries showed.']],
        trap: 'Building a wide table first and having no model behind it.',
        real: 'Tell about a wide table that helped a dashboard, and its refresh job.'
      }),

      B.recap({
        id: 'm12-recap', n: 12, badge: 'Model Builder', color: '#BBF7D0',
        pts: [
          'Decide the **grain** first: what one row stands for. The same 156.00 took 12, 19, 4 or 7 rows at four grains.',
          'A **star schema**: one fact table with keys and numbers, flat dimensions around it. 19 fact rows and 4 dimensions, and two joins for revenue by category and country.',
          'A number belongs to **one grain**. Adding the order total on the line grain gave 228.00 for 127.00. Add `line_amount` instead.',
          'Keep the guest order with an **unknown member** (key -1). An inner join to the dimension would have dropped 9.50.',
          '**Normalize** where you write: one UPDATE fixed all three orders, where a wide table left Ana with two countries. Flatten dimensions for reading.',
          '**Reconcile** after every load: 156.00 on both sides and 0 orders that differ. Fact tables are transaction, periodic snapshot or accumulating snapshot.'
        ],
        lines: [
          'I write the grain of every table before I add a column.',
          'I add a number only at the grain where it is stored.',
          'I reconcile the model to the source after every load.'
        ]
      })
    ]
  });
})();
