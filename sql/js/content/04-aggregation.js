/* Mission 4: aggregation. GROUP BY, every column grouped or aggregated, HAVING, conditional aggregation with CASE and FILTER, pivots, distinct counts, the average of averages,
   subtotals with ROLLUP, CUBE and GROUPING SETS, the median, string_agg and approximate counts. All results were returned by the engines when the recorder ran the queries. */
(function () {
  var B = LAB.b, G = LAB.get;
  var ENG = ['duckdb', 'postgres', 'sqlite'];
  var BAS = G.table('m4.basic'), HV = G.table('m4.having'), AA = G.table('m4.avg_of_avgs').rows[0], AP = G.table('m4.approx').rows[0];
  var BC = { duckdb: G.text('m4.bare_column.duckdb.error'), postgres: G.text('m4.bare_column.postgres.error'), sqlite: G.on('m4.bare_column', 'sqlite') };
  var CO = {}; ENG.forEach(function (e) { CO[e] = G.on('m4.conditional', e).rows; });
  var PV = G.on('m4.pivot', 'duckdb'), DC = G.on('m4.distinct_counts', 'duckdb'), ES = {}; ENG.forEach(function (e) { ES[e] = G.on('m4.empty_sum', e).rows[0]; });
  var MD = G.on('m4.median', 'duckdb').rows[0], MP = G.on('m4.median', 'postgres').rows[0], SA = G.on('m4.string_agg', 'duckdb');
  var RS = G.text('m4.rollup_sqlite.error'), CR = G.table('m4.ch_repeat'), CC = G.table('m4.ch_conditional'), CD = G.table('m4.ch_daily');
  var SETS = {}; G.counts('m4.sets').variants.forEach(function (v) { SETS[v.label] = v; });
  G.expect(BAS.rows[1].join() === 'paid,9,127.00,5.00,26.00,14.11' && BAS.rows.length === 4, 'orders by status: 9 paid orders worth 127.00, with a smallest of 5.00 and a largest of 26.00');
  G.expect(/must appear in the GROUP BY clause/.test(BC.duckdb) && /must appear in the GROUP BY clause/.test(BC.postgres) && BC.sqlite.rows.length === 4, 'a column that is neither grouped nor aggregated is an error on DuckDB and PostgreSQL, and SQLite returns a value');
  G.expect(HV.rows.length === 2 && HV.rows[0].join() === '1,5,82.00', 'HAVING sum(total) > 20 keeps stores 1 and 4');
  G.expect(CO.duckdb[2].join() === '3,1,0.00,NULL,0' && CO.postgres[1][3] === '14.50', 'store 3 has no paid order: CASE gives 0 and FILTER gives NULL');
  G.expect(PV.rows[1].join() === 'paid,70.50,28.50,28.00' && PV.rows[0][1] === 'NULL', 'the pivot: paid web 70.50, app 28.50, store 28.00, and NULL where nothing matched');
  G.expect(DC.rows[1].join() === '2,3,2,1', 'store 2 has 3 orders, 2 with a customer, and 1 different customer');
  G.expect(AA[0] === '12.97' && AA[1] === '14.11', 'the average of store averages is 12.97 and the average of orders is 14.11');
  G.expect(ES.duckdb[0] === 'NULL' && ES.postgres[1] === '0' && ES.sqlite[2] === '0', 'the sum of no rows is NULL, and count is 0');
  G.expect(MD[0] === '14.11' && MD[1] === '14.00' && MD[2] === '20.40' && MP[1] === '14.0', 'for the paid orders the average is 14.11 and the median 14.00');
  G.expect(SA.rows.length === 5 && SA.rows[3][2] === 'Ana Lim, Chen Wei, Hana Ito', 'string_agg lists the three Singapore customers');
  G.expect(AP[0] === '3000' && AP[1] === '2999', 'on the big data the exact distinct count is 3000 and the approximation 2999');
  G.expect(/no such function: ROLLUP/.test(RS), 'SQLite does not know ROLLUP');
  G.expect(SETS['ROLLUP (store, channel)'].rows === 11 && SETS['CUBE (store, channel)'].rows === 14 && SETS['GROUPING SETS'].rows === 7 && SETS['by store and channel'].rows === 7, 'the grouping sets return 7, 11, 14 and 7 rows');
  G.expect(CR.rows.length === 3 && CR.rows[0].join() === '3,2,45.00' && CC.rows.length === 4 && CD.rows.length === 9 && CD.rows[8][0] === 'NULL', 'the three coding rounds');

  var BASIC = G.file('m4.basic'), HAVING = G.file('m4.having'), COND = G.file('m4.conditional'), PIVOT = G.file('m4.pivot'), DIST = G.file('m4.distinct_counts'), AVGAVG = G.file('m4.avg_of_avgs');
  var EMPTY = G.file('m4.empty_sum'), MEDIAN = G.file('m4.median'), STRAGG = G.file('m4.string_agg'), APPROX = G.file('m4.approx'), ROLL = G.file('m4.set.3'), BARE = G.file('m4.bare_column');
  function res(key, e) { var t = e ? G.on(key, e) : G.table(key); return { msg: t.rows.length + ' rows', cols: t.cols, rows: t.rows }; }

  LAB.addChapter({
    id: 'm4', n: 4, title: 'Aggregation', short: 'Group', blurb: 'GROUP BY, HAVING, conditional aggregates, pivots, subtotals, the average of averages, medians and approximate counts', minutes: 50,
    focus: ['int'],
    goals: [
      'Say what **GROUP BY** does and why every other column must be grouped or aggregated.',
      'Use **conditional aggregation** with CASE and FILTER, and know what each returns for an empty group.',
      'Explain why an **average of averages** is wrong, and compute a **median**.',
      'Produce **subtotals** with ROLLUP, CUBE and GROUPING SETS and tell a subtotal NULL from a data NULL.',
      'Choose between an **exact and an approximate** distinct count.'
    ],
    say: 'Mission 4 is aggregation. Almost every dashboard is a GROUP BY. The syntax is short, and so are the mistakes: a column that is neither grouped nor aggregated, an average of averages, a count that skips NULL. We will see each one in numbers, and see what three engines do with it.',
    scenes: [
      B.talk({
        id: 'm4-what', t: 1, src: 'docs', title: 'What GROUP BY does',
        say: 'GROUP BY turns many rows into few. Press Next for six ideas.',
        items: [
          ['Rows become groups', 'GROUP BY splits the rows into groups that share the same values in the grouping columns. An aggregate function then reduces each group to one value: `count`, `sum`, `avg`, `min`, `max`.', 'One row out for each group.'],
          ['Grouped or aggregated', 'After grouping, one row stands for a whole group. A column that is neither in GROUP BY nor inside an aggregate has many values in the group, so the engine cannot give one. DuckDB and PostgreSQL refuse it. SQLite returns one of them without telling you.', 'No bare columns.'],
          ['WHERE before, HAVING after', 'WHERE removes rows before the groups exist. HAVING removes groups after the aggregates exist. Use WHERE whenever the test does not need an aggregate.', 'Filter early.'],
          ['Conditional aggregation', 'A CASE expression or a FILTER clause inside an aggregate counts or sums only some rows of the group. It gives you several measures, and a pivot, in one pass.', 'One scan, many measures.'],
          ['Aggregates and NULL', 'Aggregates skip NULL. The sum of no rows is NULL, not 0. `count(*)` of no rows is 0. A group can have a NULL value that is real data, and a subtotal row can also show NULL. Know which one you see.', 'Skip NULL, and say what an empty group returns.'],
          ['Averages need care', 'The average of group averages is not the average of the rows, unless every group has the same size. For a skewed number such as an order value, the median can say more than the average.', 'Average the rows, not the averages.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm4-group', t: 1, src: 'docs', title: 'Rows, groups, aggregates', g: 'group', legend: true,
        steps: [
          { say: 'Here is GROUP BY as a pipeline. Nine paid orders go in. Press Next to follow them.', tags: ['tg_gr1'] },
          { say: 'Step 1. The rows that passed WHERE are the input: one row for each paid order, 9 rows.', on: ['y1'], focus: ['g_rows', 'g_split'], cap: '9 rows.' },
          { say: 'Step 2. The engine splits them into groups by `store_id`. Stores 1, 2 and 4 have paid orders, so there are 3 groups. Store 3 has only a cancelled order, so it has no group.', on: ['y1'], focus: ['g_split'], cap: '3 groups.' },
          { say: 'Step 3. Each group is reduced by the aggregate functions: how many orders, what sum, what average. This happens inside the group, one group at a time.', on: ['y2'], focus: ['g_agg'], cap: 'Reduce each group.' },
          { say: 'Step 4. The result has one row for each group. The grain of the result is now the store, not the order. Every column in SELECT must be a grouping column or an aggregate.', on: ['y3'], focus: ['g_out'], tags: ['tg_gr2', 'tg_gr3'], cap: 'One row for each store.' }
        ]
      }),

      B.sql({
        id: 'm4-basic', t: 1, src: 'rec', title: 'The five aggregates by status', file: 'by_status.sql', code: BASIC, ctx: G.ctx('duckdb'),
        result: res('m4.basic'),
        steps: [
          { say: 'Twelve orders, four statuses. This query reduces them to one row for each status, with five aggregates.' },
          { say: 'The grouping column is `status`. It is named in GROUP BY and again in SELECT.', lines: G.span(BASIC, /^GROUP BY/) },
          { say: '`count(*)` counts the rows of the group. `sum`, `min`, `max` and `avg` read the `total` of those rows.', lines: G.span(BASIC, /count\(\*\)/, /round\(avg/) },
          { say: 'Run it. The paid group has ' + BAS.rows[1][1] + ' orders worth ' + BAS.rows[1][2] + ', from ' + BAS.rows[1][3] + ' to ' + BAS.rows[1][4] + ', with an average of ' + BAS.rows[1][5] + '.', run: true }
        ]
      }),

      B.cmp({
        id: 'm4-bare', t: 1, src: 'rec', title: 'A column that is not grouped',
        say: 'What if you select a column that is neither grouped nor aggregated? The query is `SELECT status, channel, count(*) FROM orders GROUP BY status`. Press Next to see the three engines.',
        cols: ['Engine', 'What it returned'],
        hl: 1,
        rows: [
          ['DuckDB', 'error: `' + BC.duckdb + '`'],
          ['PostgreSQL', 'error: `' + BC.postgres + '`'],
          ['SQLite', 'a result without an error: the paid group shows channel `' + BC.sqlite.rows[1][1] + '`, although paid orders came from three channels']
        ],
        steps: [
          { upto: 1, say: 'DuckDB refuses the query and says which column is the problem.' },
          { upto: 2, say: 'PostgreSQL refuses it too.' },
          { upto: 3, say: 'SQLite accepts the query and picks a value from some row of the group. The answer looks fine and means nothing. Paid orders came from the web, the app and the stores.' }
        ],
        pick: 'Treat every bare column as a bug, even where the engine allows it. If you want one value, say which: `min(channel)`, or group by the column.'
      }),

      B.bug({
        id: 'm4-bug-bare', t: 1, title: 'Bug hunt: the store and its channel',
        q: 'A report should show the revenue of each store and its best channel. PostgreSQL stops with: ' + BC.postgres + '. Click the line that causes it.',
        file: 'store_revenue.sql', lang: 'sql',
        code: ['SELECT store_id, channel, sum(total) AS revenue', 'FROM orders', "WHERE status = 'paid'", 'GROUP BY store_id;'].join('\n'),
        bad: [1], hint: 'Which column has many values inside one store group?',
        why: 'A store has paid orders from several channels, so `channel` has several values in one group and there is no single value to show. Group by it too, which gives one row for each store and channel, or aggregate it.',
        fix: ['SELECT store_id, channel, sum(total) AS revenue', 'FROM orders', "WHERE status = 'paid'", 'GROUP BY store_id, channel;'].join('\n'),
        cheer: 'Every column in SELECT is either in GROUP BY or inside an aggregate.'
      }),

      B.sql({
        id: 'm4-having', t: 1, src: 'rec', title: 'HAVING keeps the groups', file: 'having.sql', code: HAVING, ctx: G.ctx('duckdb'),
        result: res('m4.having'),
        steps: [
          { say: 'Which stores sold more than 20 in paid orders? The test is on a sum, so it cannot go in WHERE.' },
          { say: 'WHERE keeps the paid rows before the groups exist.', lines: G.span(HAVING, /^WHERE/) },
          { say: 'HAVING tests each group after the sum exists.', lines: G.span(HAVING, /^HAVING/) },
          { say: 'Run it. Store 2 has paid orders worth 14.50, so HAVING removed it. Stores 1 and 4 are left.', run: true }
        ]
      }),

      B.sql({
        id: 'm4-conditional', t: 1, src: 'rec', title: 'Conditional aggregation: CASE and FILTER', file: 'conditional.sql', code: COND, ctx: G.ctx('postgres'),
        result: res('m4.conditional', 'postgres'),
        steps: [
          { say: 'You want, for each store, all the orders and the paid orders, in one row. Two ways to count only some rows of a group.' },
          { say: 'A `CASE` inside `sum` adds the total when the status is paid and 0 otherwise. It works on every engine.', lines: G.span(COND, /paid_with_case/) },
          { say: '`FILTER (WHERE ...)` says the same thing in the standard way. It is shorter and clearer. PostgreSQL, DuckDB and SQLite 3.30 and later support it.', lines: G.span(COND, /paid_with_filter/, /paid_orders/) },
          { say: 'Run it on PostgreSQL. Store 3 has one cancelled order and no paid order. The CASE version gives 0. The FILTER version gives NULL, because the sum of no rows is NULL. Check which one you want.', run: true }
        ]
      }),

      B.sql({
        id: 'm4-pivot', t: 2, src: 'rec', title: 'A pivot with CASE', file: 'pivot.sql', code: PIVOT, ctx: G.ctx('duckdb'),
        result: res('m4.pivot', 'duckdb'),
        steps: [
          { say: 'A pivot turns the values of a column into columns. Here the channels become columns, and each cell is the sum of the totals of that status and channel.' },
          { say: 'Each column is a conditional sum. There is no ELSE, so a row that is not in the channel gives NULL and `sum` skips it.', lines: G.span(PIVOT, /AS web/, /AS store/) },
          { say: 'Run it. A cell is NULL when the group has no order in that channel. The paid row reads: web ' + PV.rows[1][1] + ', app ' + PV.rows[1][2] + ', store ' + PV.rows[1][3] + '. PostgreSQL gave the same table.', run: true }
        ],
        note: 'The list of channels is written in the query. A new channel needs a new column. DuckDB and some warehouses have a PIVOT statement that finds the values for you.'
      }),

      B.quiz({
        id: 'm4-q-empty', t: 1, q: 'No order matches `status = \'does not exist\'`. What does `SELECT sum(total), count(*) FROM orders WHERE status = \'does not exist\'` return?',
        opts: [
          { t: '0 and 0', fb: 'count is 0, but sum is not.' },
          { t: 'NULL and 0', fb: '' },
          { t: 'NULL and NULL', fb: 'count(*) always returns a number.' },
          { t: 'No row at all', fb: 'An aggregate without GROUP BY returns exactly one row, even over no rows.' }
        ],
        ok: 1, why: 'The sum of no values is NULL, because there is nothing to add and SQL does not assume 0. `count(*)` counts rows, and there are none, so it is 0. The recorded result is ' + ES.postgres.join(', ') + ' with `coalesce(sum(total), 0)` as the third column. All three engines agree.'
      }),

      B.sql({
        id: 'm4-distinct', t: 1, src: 'rec', title: 'Counting customers, not orders', file: 'distinct_counts.sql', code: DIST, ctx: G.ctx('duckdb'),
        result: res('m4.distinct_counts', 'duckdb'),
        steps: [
          { say: 'How many different customers ordered in each store? That is not the number of orders.' },
          { say: '`count(customer_id)` counts the orders that have a customer. `count(DISTINCT customer_id)` counts the different customers.', lines: G.span(DIST, /count\(customer_id\)/, /count\(DISTINCT/) },
          { say: 'Run it. Store 2 has 3 orders, 2 of them with a customer, and only 1 different customer: customer 2 ordered twice, and the guest order has no customer. The NULL is not counted.', run: true }
        ]
      }),

      B.widget({ id: 'm4-lab', kind: 'rollup', t: 2, src: 'rec', title: 'Lab: seven ways to group, with subtotals' }),

      B.sql({
        id: 'm4-rollup', t: 2, src: 'rec', title: 'ROLLUP and the GROUPING function', file: 'rollup.sql', code: ROLL, ctx: G.ctx('duckdb'),
        result: res('m4.set.3'),
        steps: [
          { say: 'A report often needs the detail rows and the subtotals in one result. `ROLLUP` adds them.' },
          { say: '`GROUP BY ROLLUP (store_id, channel)` groups by both columns, then by store alone, then by nothing: the grand total.', lines: G.span(ROLL, /^GROUP BY/) },
          { say: '`GROUPING(col)` is 1 on a row where that column was rolled up. It tells a subtotal row from a row whose value is really NULL.', lines: G.span(ROLL, /GROUPING/) },
          { say: 'Run it. 7 detail rows, 3 store subtotals and 1 grand total: 11 rows. The grand total is 127.00 on the last row, where both flags are 1. SQLite has no ROLLUP: it said `' + RS + '`.', run: true }
        ]
      }),

      B.sql({
        id: 'm4-avgavg', t: 2, src: 'rec', title: 'The average of averages', file: 'avg_of_avgs.sql', code: AVGAVG, ctx: G.ctx('duckdb'),
        result: res('m4.avg_of_avgs'),
        steps: [
          { say: 'A dashboard shows the average order value for each store, and a card above it shows the average over all stores. Someone computed that card from the store averages.' },
          { say: 'The CTE computes one average for each store. A store with 2 orders counts as much as a store with 5.', lines: G.span(AVGAVG, /^WITH/, /^\)/) },
          { say: 'The first column averages the three averages. The second averages the nine orders, which is the true average.', lines: G.span(AVGAVG, /average_of_averages/, /average_of_orders/) },
          { say: 'Run it. The average of averages is ' + AA[0] + '. The average of the orders is ' + AA[1] + '. They differ because the stores have 5, 2 and 2 orders. Weight by the rows: average the orders, or divide a sum by a count.', run: true }
        ]
      }),

      B.quiz({
        id: 'm4-q-avg', t: 1, q: 'Store A has 5 paid orders averaging 16.40. Store B has 2 averaging 7.25. What is the average over the 7 orders?',
        opts: [
          { t: '11.83, the mean of 16.40 and 7.25', fb: 'That gives the two stores the same weight, although store A has more than twice the orders.' },
          { t: '(5 * 16.40 + 2 * 7.25) / 7 = 13.79', fb: '' },
          { t: '23.65, the sum of the two averages', fb: 'A sum of averages has no meaning.' },
          { t: 'It cannot be computed from averages', fb: 'It can, if you know how many orders each average covers. Better to keep sums and counts.' }
        ],
        ok: 1, why: 'The average over the rows is the sum of all totals divided by the number of rows: 5 times 16.40 is 82.00, 2 times 7.25 is 14.50, and 96.50 divided by 7 is 13.79. Store sums and counts, and divide at the end.'
      }),

      B.sql({
        id: 'm4-median', t: 2, src: 'rec', title: 'The median and the percentile', file: 'median.sql', code: MEDIAN, ctx: G.ctx('duckdb'),
        result: res('m4.median', 'duckdb'),
        steps: [
          { say: 'An average can be pulled by a few big orders. The median is the middle value: half of the orders are below it. `percentile_cont` computes any percentile.' },
          { say: '`percentile_cont(0.5) WITHIN GROUP (ORDER BY total)` is the median. The same form with 0.9 gives the value below which nine orders in ten fall.', lines: G.span(MEDIAN, /percentile_cont\(0.5\)/, /percentile_cont\(0.9\)/) },
          { say: 'Run it on DuckDB. Average ' + MD[0] + ', median ' + MD[1] + ', p90 ' + MD[2] + '. PostgreSQL returned the median ' + MP[1] + ' and the p90 ' + MP[2] + ': the same numbers, printed as doubles. SQLite has no such function.', run: true }
        ]
      }),

      B.sql({
        id: 'm4-stringagg', t: 1, src: 'rec', title: 'string_agg: a list in one cell', file: 'string_agg.sql', code: STRAGG, ctx: G.ctx('duckdb'),
        result: res('m4.string_agg', 'duckdb'),
        steps: [
          { say: '`string_agg` joins the values of a group into one text. The ORDER BY inside the call makes the list stable.' },
          { say: 'Run it. Singapore has three customers, listed in name order. The group with a NULL country holds customer 6. PostgreSQL and SQLite returned the same text. The function is `group_concat` in older SQLite and in MySQL.', run: true }
        ]
      }),

      B.sql({
        id: 'm4-approx', t: 3, src: 'rec', title: 'Exact and approximate distinct counts', file: 'approx.sql', code: APPROX, ctx: G.ctx('duckdb'),
        result: res('m4.approx'),
        steps: [
          { say: 'An exact `count(DISTINCT x)` must remember every value it has seen. On billions of rows that needs a lot of memory, and a big shuffle in a distributed engine. Approximate counters use a small sketch of fixed size.' },
          { say: 'On the 30,000 big orders DuckDB computed both.', lines: G.span(APPROX, /count\(DISTINCT/, /approx_count_distinct/) },
          { say: 'Run it. Exact: ' + AP[0] + '. Approximate: ' + AP[1] + '. The error here is one customer in three thousand. PostgreSQL has no built-in approximation, and most warehouses have one.', run: true }
        ],
        note: 'Use an approximation for a dashboard card that is allowed to be off by a percent or so, and an exact count for money and for anything that is audited.'
      }),

      B.order({
        id: 'm4-order-agg', t: 1, title: 'Build a grouped query',
        q: 'Tap the steps in the order you would think them through when you write a grouped report.',
        items: ['Decide the grain of the result: one row for what?', 'Filter the rows that must not count, in WHERE', 'Choose the grouping columns', 'Choose the aggregates and check what each does with NULL', 'Filter groups, if needed, in HAVING', 'Compare the totals with a trusted number'],
        why: 'Start from the grain of the answer. Remove unwanted rows early, group, aggregate, and filter groups last. Finish by checking against a number you trust, such as the total of the source table.'
      }),

      B.challenge({
        id: 'm4-ch-repeat', t: 1, title: 'Coding round: customers who came back', file: 'repeat_customers.sql', lang: 'sql',
        q: 'Return the **customers who have at least 2 paid orders**: the customer id, the number of paid orders and the total spent, biggest spender first. Guest orders have no customer and must not appear.',
        data: [{ name: 'orders (5 of 7 columns)', cols: G.cols('data.orders', ['order_id', 'customer_id', 'status', 'total']).cols, rows: G.cols('data.orders', ['order_id', 'customer_id', 'status', 'total']).rows, types: ['INTEGER', 'INTEGER', 'VARCHAR', 'DECIMAL(10,2)'] }],
        starter: '-- customers with at least 2 paid orders, biggest spender first\nSELECT ...',
        hints: ['Filter the rows first: paid orders that have a customer.', 'One row for each customer means GROUP BY customer_id.', 'A test on the number of orders in a group goes in HAVING.'],
        sol: G.file('m4.ch_repeat'),
        res: res('m4.ch_repeat'),
        expl: ['WHERE keeps paid orders with a customer, so the guest order is out before grouping.', 'HAVING count(*) >= 2 keeps the groups with two or more orders.', 'ORDER BY spent uses the alias, which exists after SELECT.'],
        cx: 'One pass over the orders and one group for each customer, so the time grows with the number of orders. The groups sit in a hash table, so the memory grows with the number of customers.'
      }),

      B.challenge({
        id: 'm4-ch-cond', t: 2, title: 'Coding round: one row for each store, three amounts', file: 'store_status.sql', lang: 'sql',
        q: 'Return **one row for each store** with three columns: the revenue of its **paid** orders, of its **cancelled** orders and of its **refunded** orders. A store without such orders must show 0, not NULL. Use one pass over the table.',
        data: [{ name: 'orders (4 columns)', cols: G.cols('data.orders', ['order_id', 'store_id', 'status', 'total']).cols, rows: G.cols('data.orders', ['order_id', 'store_id', 'status', 'total']).rows, types: ['INTEGER', 'INTEGER', 'VARCHAR', 'DECIMAL(10,2)'] }],
        starter: '-- one row for each store: paid, cancelled and refunded revenue\nSELECT ...',
        hints: ['A CASE inside sum adds a value only when the status matches.', 'Give CASE an ELSE 0 so that the sum is 0 for an empty case.', 'Group by store.'],
        sol: G.file('m4.ch_conditional'),
        res: res('m4.ch_conditional'),
        expl: ['Each `sum(CASE ...)` is a separate measure computed in the same pass.', '`ELSE 0` makes the empty cases 0. Without it, a store with no cancelled order would show NULL.', 'The three columns do not add up to all orders: store 2 also has a pending order, which none of them counts.'],
        cx: 'A single scan and one hash group for each store. Three separate queries would scan three times.'
      }),

      B.challenge({
        id: 'm4-ch-daily', t: 2, title: 'Coding round: daily revenue with a total row', file: 'daily_total.sql', lang: 'sql',
        q: 'Return the **number and the revenue of paid orders for each day**, and one extra row at the end with the total. The extra row has a NULL day. Use a single query, and sort so that the total row is last.',
        data: [{ name: 'orders (3 columns)', cols: G.cols('data.orders', ['order_id', 'order_ts', 'status', 'total']).cols, rows: G.cols('data.orders', ['order_id', 'order_ts', 'status', 'total']).rows, types: ['INTEGER', 'TIMESTAMP', 'VARCHAR', 'DECIMAL(10,2)'] }],
        starter: '-- paid orders and revenue for each day, plus a total row\nSELECT ...',
        hints: ['Turn the timestamp into a date with CAST(order_ts AS DATE).', 'ROLLUP adds a row for the whole table.', 'NULLS LAST in ORDER BY keeps the total at the end.'],
        sol: G.file('m4.ch_daily'),
        res: res('m4.ch_daily'),
        expl: ['`ROLLUP (day)` returns one row for each day and a grand total with a NULL day.', 'The nine orders fall on eight days (two on 2 March), and the last row sums them to 127.00.', 'Use `GROUPING(day)` if a NULL day can also appear in the data.'],
        cx: 'One pass over the table. The rollup adds one more group, so the cost is almost the same as a plain GROUP BY.'
      }),

      B.decide({
        id: 'm4-dec-approx', t: 2, title: 'Decision: how do you count daily active customers?',
        scenario: 'The product team wants the number of distinct customers who visit each day, on a dashboard that refreshes every few minutes. The events table grows by hundreds of millions of rows a month. A finance report also needs the exact number of customers who paid, for each month. What do you use?',
        opts: [
          { t: 'Approximate distinct for the dashboard, exact for the finance report', d: 'A sketch such as HyperLogLog for the daily card, and `count(DISTINCT)` on the much smaller payments table for finance.', lose: '' },
          { t: 'Exact distinct everywhere', d: 'One rule, always exact.', lose: 'The dashboard scans and shuffles every event on each refresh. It gets slow and costly for a number that nobody reads to the last digit.' },
          { t: 'Approximate distinct everywhere', d: 'Fast and cheap everywhere.', lose: 'A finance number that is audited must be exact. An error of a percent can break a reconciliation.' },
          { t: 'Count rows instead of customers', d: 'count(*) is the cheapest aggregate.', lose: 'It counts events, not people. One busy customer inflates it.' }
        ],
        pick: 0,
        why: 'Match the accuracy to the use. A dashboard card can be off by a small percent, and an approximate counter keeps a small fixed state, so it is fast and cheap. Money and audited numbers must be exact, and the table behind them is small. On the course data the approximation was 2,999 for an exact 3,000.',
        when: 'If the data is small, exact is simplest and there is no reason to approximate. If the dashboard needs numbers that add up across days, remember that approximate distinct counts of two days cannot be added, but sketches can be merged.'
      }),

      B.incident({
        id: 'm4-inc-avg', t: 2, time: '11:30',
        alert: 'Finance says that the average order value on the sales dashboard is ' + AA[0] + ', and their ledger says ' + AA[1] + '. Both claim to use the same paid orders of the same week.',
        clues: ['The dashboard card is computed from the per-store table below it, which shows one average for each store.', 'The stores have very different numbers of orders.', 'The ledger divides the revenue by the number of orders.'],
        opts: [
          { t: 'Ask finance to use the dashboard number', fb: 'The ledger number is the right one. Do not copy a wrong number.' },
          { t: 'Compare how each number is computed, and recompute from sums and counts', fb: '' },
          { t: 'Refresh the cache of the dashboard', fb: 'The cache holds a correct copy of a wrong calculation.' },
          { t: 'Round both numbers to the same value', fb: 'It hides a difference of more than a unit.' }
        ],
        best: 1,
        why: 'When two numbers from the same data disagree, compare the formulas before the data. The dashboard averages store averages, which weights a store with 2 orders as much as one with 5. The ledger divides the total by the count.',
        checks: [['Write both formulas down', 'The card: the average of the store averages. The ledger: sum of totals divided by number of orders.'], ['Recompute from the orders', 'Average of the nine paid orders: ' + AA[1] + '.'], ['Recompute from the store table', 'The average of three store averages: ' + AA[0] + '.'], ['Fix the card', 'Carry sums and counts per store, and divide at the end.']],
        tell: 'The average order value on the dashboard disagreed with finance. I compared the formulas: the dashboard averaged the store averages, which gives every store the same weight. I changed the card to divide the total revenue by the total number of orders, which matched the ledger, and added a note on the card about how it is computed.',
        prevent: ['Store sums and counts in the model, not averages, and divide in the last step.', 'Define each metric once, in one place, with its formula.', 'Add a test that compares the dashboard total with the ledger.']
      }),

      B.qa({
        id: 'qa-groupby', t: 1, tag: 'Aggregation', secs: 60,
        q: 'What does GROUP BY do, and why can you not select a column that is not in it?',
        pts: ['It splits rows into groups and returns one row for each group', 'Aggregates reduce each group', 'A column that is not grouped has many values in a group', 'DuckDB and PostgreSQL refuse it, SQLite does not'],
        short: 'GROUP BY splits the rows into groups that share the same values in the grouping columns, and the query returns one row for each group. Aggregate functions such as count, sum and avg reduce each group to one value. A column that is neither grouped nor aggregated has many different values inside a group, so there is no single value to return, and DuckDB and PostgreSQL stop with an error. SQLite is lenient and returns the value of some row, which looks fine and is arbitrary. I treat that as a bug: I add the column to GROUP BY, or I aggregate it, for example with `min`.',
        fu: [['What is the grain of a grouped result?', 'The grouping columns: one row for each store, or for each store and channel.']],
        trap: 'Relying on SQLite or MySQL to pick a value for a bare column.',
        real: 'Tell about a report where a bare column returned the wrong value.'
      }),

      B.qa({
        id: 'qa-conditional', t: 1, tag: 'Aggregation', secs: 60,
        q: 'How do you count or sum only some of the rows in a group?',
        pts: ['CASE inside the aggregate', 'FILTER (WHERE ...)', 'Several measures in one pass', 'An empty case gives NULL or 0'],
        short: 'I put a condition inside the aggregate. With CASE, `sum(CASE WHEN status = \'paid\' THEN total ELSE 0 END)` adds the total only for paid orders. With the standard FILTER clause, `sum(total) FILTER (WHERE status = \'paid\')` says the same thing more clearly and is supported by PostgreSQL, DuckDB and recent SQLite. This lets me compute several measures, such as paid, cancelled and refunded, in one pass over the table, and a pivot works the same way. I watch what an empty case returns: FILTER gives NULL for a sum with no rows, while CASE with ELSE 0 gives 0.',
        fu: [['How is this different from WHERE?', 'WHERE removes rows for the whole query. A condition inside an aggregate affects one measure only.']],
        trap: 'Running one query for each status and gluing the results together.',
        real: 'Tell about a report you rewrote with conditional aggregation.'
      }),

      B.qa({
        id: 'qa-countdistinct', t: 1, tag: 'Aggregation', secs: 60,
        q: 'How do you count unique customers, and what are the pitfalls?',
        pts: ['count(DISTINCT customer_id)', 'NULL is not counted', 'Do not add distinct counts across groups', 'Exact counts cost memory at scale'],
        short: 'I use `count(DISTINCT customer_id)`, which counts the different non-NULL values. NULLs are not counted, so guest orders do not add a customer. The pitfall is adding distinct counts: the number of different customers over two stores is not the sum of the two store counts, because the same customer can be in both. I compute the distinct count at the level I need. At scale an exact distinct count needs memory for every value and a heavy shuffle, so for dashboards that can tolerate a small error I use an approximate function such as `approx_count_distinct`. For money, I stay exact.',
        fu: [['Why can you not sum daily distinct counts to get a monthly one?', 'A customer who visits on three days is counted three times. Count distinct over the whole month.']],
        trap: 'Summing distinct counts from different groups.',
        real: 'Tell about a unique-customer number that did not add up.'
      }),

      B.qa({
        id: 'qa-avgofavgs', t: 2, tag: 'Aggregation', secs: 60,
        q: 'Why is an average of averages usually wrong?',
        pts: ['Each average hides its group size', 'It gives every group the same weight', 'Weight by count: sum divided by count', 'Keep sums and counts in models'],
        short: 'An average hides how many rows it covers. If I average the averages of three stores, a store with 2 orders counts as much as a store with 5, so the result is not the average of the orders. On the course data the average of store averages was 12.97 and the average of the nine orders was 14.11. The right way is to weight by the counts: add up all the totals and divide by the total number of orders. So in models I keep sums and counts, which can be added, and I divide only in the last step. The same applies to percentages and ratios.',
        fu: [['When is the average of averages right?', 'When every group has the same size.'], ['How do you roll up a ratio, such as a conversion rate?', 'Add the numerators and the denominators separately, then divide.']],
        trap: 'Averaging a column that already holds averages.',
        real: 'Tell about a metric that changed after you weighted it.'
      }),

      B.qa({
        id: 'qa-rollup', t: 2, tag: 'Aggregation', secs: 60,
        q: 'What are ROLLUP, CUBE and GROUPING SETS?',
        pts: ['Several groupings in one query', 'ROLLUP: subtotals from right to left, plus a grand total', 'CUBE: all combinations', 'GROUPING SETS: the list you choose', 'GROUPING() tells a subtotal from a NULL'],
        short: 'They compute several groupings in one pass. `ROLLUP (a, b)` returns the groups by a and b, then by a alone, then the grand total, so the order of the columns matters. `CUBE (a, b)` returns every combination: a and b, a alone, b alone and the total. `GROUPING SETS` lets me list exactly the groupings I want. The subtotal rows show NULL in the rolled up columns, so I use the `GROUPING(col)` function, which is 1 for a subtotal, to tell it from a NULL that is real data. On nine orders by store and channel, ROLLUP returned 11 rows and CUBE 14. PostgreSQL and DuckDB support them. SQLite does not.',
        fu: [['Why can summing a rollup column give a wrong total?', 'It includes the subtotal and the grand total rows as well as the detail rows. Filter on the GROUPING flags first.']],
        trap: 'Treating a NULL in a rollup result as missing data.',
        real: 'Tell about a report with subtotals you built with ROLLUP.'
      }),

      B.qa({
        id: 'qa-percentile', t: 2, tag: 'Aggregation', secs: 60,
        q: 'When do you use the median instead of the average?',
        pts: ['The average is pulled by outliers', 'The median is the middle value', 'percentile_cont gives any percentile', 'Not every engine has it'],
        short: 'The average is the sum divided by the count, so a few very large values pull it up. The median is the middle value: half of the rows are below it. For a skewed number, such as order value or response time, I report the median and a high percentile such as the 90th, because they describe what a typical row and a bad row look like. In SQL I use `percentile_cont(0.5) WITHIN GROUP (ORDER BY x)`, which interpolates between the two middle values, or `percentile_disc`, which returns an existing value. PostgreSQL and DuckDB have them. SQLite does not, and warehouses often add an approximate version that is cheaper.',
        fu: [['What is the difference between percentile_cont and percentile_disc?', '`cont` interpolates and can return a value that is not in the data. `disc` returns a value that exists.']],
        trap: 'Reporting only the average of a skewed measure.',
        real: 'Tell about a metric where the median told a different story.'
      }),

      B.qa({
        id: 'qa-approx', t: 3, tag: 'Aggregation', secs: 60,
        q: 'What are approximate aggregates and when do you use them?',
        pts: ['A small fixed-size sketch', 'Error of a small percent', 'Fast, cheap and mergeable', 'Not for money or audits'],
        short: 'An approximate aggregate, such as `approx_count_distinct`, keeps a small sketch of fixed size instead of every value. HyperLogLog is the usual one for distinct counts. It is fast and cheap, it uses little memory, it can be merged across partitions or days, and its error is small, typically a percent or two. On 30,000 orders DuckDB returned 2,999 for an exact 3,000. I use it for dashboard cards and exploration on very large tables, where an exact distinct count would need a lot of memory and a big shuffle. I do not use it for money, billing or audited numbers, where an error is not acceptable.',
        fu: [['Can you add two approximate distinct counts?', 'Not the numbers, but you can merge the sketches and then read the count. That is why warehouses store sketches in aggregate tables.']],
        trap: 'Using an approximate count in a reconciliation.',
        real: 'Tell about a place where an approximation saved time and cost.'
      }),

      B.recap({
        id: 'm4-recap', n: 4, badge: 'Group Maker', color: '#FED7AA',
        pts: [
          '**GROUP BY** gives one row for each group. Every other column must be grouped or aggregated. SQLite lets a bare column through. Treat it as a bug.',
          '**WHERE** filters rows before grouping. **HAVING** filters groups after it.',
          '**Conditional aggregation**: `sum(CASE WHEN ...)` or `FILTER (WHERE ...)`. The sum of no rows is NULL.',
          '**count(DISTINCT x)** skips NULL. Do not add distinct counts across groups.',
          'An **average of averages** is wrong when the groups differ in size. Keep sums and counts, divide last.',
          '**ROLLUP, CUBE and GROUPING SETS** add subtotals. `GROUPING(col)` tells a subtotal from a NULL. Use the **median** for skewed numbers, and an **approximate** count only where an error is fine.'
        ],
        lines: [
          'Every column in SELECT is grouped or aggregated, and I treat a bare column as a bug.',
          'I never average averages. I carry sums and counts and divide at the end.',
          'A NULL in a rollup can be a subtotal, so I check GROUPING().'
        ]
      })
    ]
  });
})();
