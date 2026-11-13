/* Mission 3: joins, fan-out and grain. Join types, ON against WHERE, the join that multiplies rows, how to find the grain, three fixes, self joins, range joins and LATERAL.
   The row counts, the tables and the wrong and right totals were returned by DuckDB, PostgreSQL and SQLite when the recorder ran the queries. */
(function () {
  var B = LAB.b, G = LAB.get;
  var ENG = ['duckdb', 'postgres', 'sqlite'];
  var JT = {}; G.counts('m3.jointypes').types.forEach(function (t) { JT[t.type] = t; });
  var OW = {}; G.on('m3.onwhere_counts', 'duckdb').rows.forEach(function (r) { OW[r[0]] = r[1]; });
  var FS = {}; ENG.forEach(function (e) { FS[e] = G.on('m3.fanout_sum', e).rows; });
  var FP = G.table('m3.fanout_payments'), GM = G.table('m3.grain_multi'), GC = G.table('m3.grain_counts').rows[0], PA = G.table('m3.preagg_orders');
  var PR = {}; ENG.forEach(function (e) { PR[e] = G.on('m3.preagg_revenue', e).rows[0]; });
  var DT = G.table('m3.distinct_trap').rows[0];
  var RJ = G.on('m3.range_join', 'duckdb'), NAT = {}; ENG.forEach(function (e) { NAT[e] = G.on('m3.natural', e).rows[0][0]; });
  var LA = G.on('m3.lateral', 'duckdb'), CC = G.table('m3.ch_country'), CCW = G.table('m3.ch_country_wrong'), CP = G.table('m3.ch_paid_by_order');
  var FO = G.counts('m3.fanout'), TRUTH = FO.truth;
  G.expect(JT.INNER.rows.duckdb === 11 && JT.LEFT.rows.postgres === 13 && JT.RIGHT.rows.sqlite === 12 && JT.FULL.rows.duckdb === 14 && JT.CROSS.rows.duckdb === 96, 'the join row counts are 11, 13, 12, 14 and 96 on every engine');
  G.expect(OW['filter in ON'] === '12' && OW['filter in WHERE'] === '8' && OW['no filter'] === '13', 'a filter in ON leaves 12 rows and a filter in WHERE 8');
  G.expect(FS.duckdb[0][2] === '127.00' && FS.duckdb[1][2] === '145.50' && FS.postgres[1][1] === '10' && FP.rows.length === 10, 'nine paid orders are 127.00 and the join to payments gives 10 rows and 145.50');
  G.expect(GM.rows.length === 2 && GM.rows[0][0] === '1002' && GC[0] === '12' && GC[1] === '10', 'two orders have two payments: 12 payment rows for 10 orders');
  G.expect(PR.duckdb[1] === '127.00' && PR.postgres[0] === '9' && PA.rows.length === 12 && PA.rows[7][3] === '0.00', 'pre-aggregation keeps 9 rows and 127.00, and the refunded order nets to 0.00');
  G.expect(DT[0] === '27315' && DT[2] === '267.00' && DT[3] === '6', 'on the big data sum(DISTINCT total) is 267.00 for 27,315 paid orders with 6 different totals');
  G.expect(RJ.rows.length === 1 && RJ.rows[0][0] === '1003' && RJ.rows[0][4] === '5.00' && RJ.rows[0][5] === '4.50', 'the range join finds one charged price that is not the list price');
  G.expect(NAT.duckdb === '0' && NAT.postgres === '0' && NAT.sqlite === '0' && LA.rows.length === 6, 'NATURAL JOIN of customers and stores finds nothing, and LATERAL gives the last order of 6 customers');
  G.expect(CC.rows[0][0] === 'SG' && CC.rows[0][2] === '82.00' && CCW.rows[0][1] === '6' && CCW.rows[0][2] === '100.50' && CP.rows.length === 12, 'the country revenue is 82.00 for SG, and 100.50 with the fan-out');
  var PCT = ((parseFloat(FS.duckdb[1][2]) - parseFloat(FS.duckdb[0][2])) / parseFloat(FS.duckdb[0][2]) * 100).toFixed(1);

  var INNER = G.file('m3.jointype.inner'), LEFT = G.file('m3.jointype.left'), FULL = G.file('m3.jointype.full');
  var LEFTON = G.file('m3.left_on'), FANP = G.file('m3.fanout_payments'), FANS = G.file('m3.fanout_sum'), GRAIN = G.file('m3.grain_multi'), PREAGG = G.file('m3.preagg_orders');
  var DIST = G.file('m3.distinct_trap'), SELF = G.file('m3.self_join'), RANGE = G.file('m3.range_join'), LATERAL = G.file('m3.lateral'), NATSQL = G.file('m3.natural'), USING = G.file('m3.using');
  function res(key, e) { var t = e ? G.on(key, e) : G.table(key); return { msg: t.rows.length + ' rows', cols: t.cols, rows: t.rows }; }

  LAB.addChapter({
    id: 'm3', n: 3, title: 'Joins, fan-out and grain', short: 'Joins', blurb: 'Join types, ON against WHERE, the join that multiplies rows, how to find the grain and three ways to keep a total right', minutes: 55,
    focus: ['stg'],
    goals: [
      'Choose between **INNER, LEFT, RIGHT, FULL and CROSS** joins and predict the row count.',
      'Explain why a filter in **ON** and a filter in **WHERE** differ for an outer join.',
      'Spot a **fan-out** and say the **grain** of every table in a query.',
      'Fix a doubled total with **pre-aggregation** or **EXISTS**, and know why `sum(DISTINCT)` is a trap.',
      'Write a self join, a range join and a LATERAL join.'
    ],
    say: 'Mission 3 is about joins, and about the most common wrong number in analytics: a total that is too big because a join repeated some rows. The syntax is easy. The skill is to know how many rows a join produces before you run it. We will count them on real data.',
    scenes: [
      B.talk({
        id: 'm3-what', t: 1, src: 'docs', title: 'What a join does',
        say: 'A join pairs rows from two tables. Press Next for six ideas. The last one causes most wrong totals in dashboards.',
        items: [
          ['Pairs of rows', 'A join takes each row of one table and each row of the other, keeps the pairs where the `ON` condition is true, and returns one row for each pair. The number of rows out depends on how many rows match, not on the size of either table.', 'One output row for each matching pair.'],
          ['Keys', 'Joins usually follow a key: `orders.customer_id` refers to `customers.customer_id`. The customer table has one row for each customer, so the key is unique there. The orders table has many rows for the same customer.', 'Unique on one side, repeated on the other.'],
          ['What happens without a match', 'An **inner** join drops rows that have no partner. A **left** join keeps every row of the left table and fills the right columns with NULL. **Right** is the mirror image, **full** keeps both, and **cross** pairs everything with everything.', 'Choose the join by what you want to keep.'],
          ['ON or WHERE', 'For an inner join a test in ON and a test in WHERE give the same rows. For an outer join they do not, because WHERE runs after the join and removes the NULL rows that the outer join made.', 'On an outer join, a filter on the right table belongs in ON.'],
          ['Fan-out', 'If the other table has several rows for one key, the row repeats. An order with two payments appears twice. A sum over the order columns now counts that order twice. This is a fan-out.', 'A join can multiply rows.'],
          ['Grain', 'The grain of a table is what one row stands for: one order, one payment, one customer a day. Know the grain of every table in a query, and know the grain of the result.', 'Say the grain out loud.']
        ],
        cols: 1
      }),

      B.widget({ id: 'm3-types', kind: 'jointypes', t: 1, src: 'rec', title: 'Lab: join types and where the filter goes' }),

      B.sql({
        id: 'm3-inner', t: 1, src: 'rec', title: 'INNER JOIN: only the matches', file: 'inner.sql', code: INNER, ctx: G.ctx('duckdb'),
        result: { msg: JT.INNER.rows.duckdb + ' rows', cols: G.table('m3.jointype.inner').cols, rows: G.table('m3.jointype.inner').rows },
        steps: [
          { say: 'Customers and their orders. Press Next to read the join.' },
          { say: 'The FROM clause names the left table. The alias `c` is short for customers. Aliases keep the query readable.', lines: G.span(INNER, /^FROM customers/) },
          { say: 'The join names the right table and the condition. `ON o.customer_id = c.customer_id` pairs an order with its customer.', lines: G.span(INNER, /INNER JOIN/) },
          { say: 'ORDER BY makes the output stable. `NULLS LAST` keeps the guest order, which has no customer, at the end where it does not move.', lines: G.span(INNER, /^ORDER BY/) },
          { say: 'Run it. ' + JT.INNER.rows.duckdb + ' rows came out on all three engines. Customers 6 and 8 never ordered, and the guest order has no customer, so none of the three is here.', run: true }
        ]
      }),

      B.sql({
        id: 'm3-left', t: 1, src: 'rec', title: 'LEFT JOIN: keep every customer', file: 'left.sql', code: LEFT, ctx: G.ctx('duckdb'),
        result: { msg: JT.LEFT.rows.duckdb + ' rows', cols: G.table('m3.jointype.left').cols, rows: G.table('m3.jointype.left').rows },
        steps: [
          { say: 'The same query with one word changed. LEFT JOIN keeps every row of the table on the left.' },
          { say: 'Only the join word changed.', lines: G.span(LEFT, /LEFT JOIN/) },
          { say: 'Run it. ' + JT.LEFT.rows.duckdb + ' rows. Customers 6 and 8 are back, and their order columns are NULL. A LEFT JOIN is how you find customers without orders: test `o.order_id IS NULL`.', run: true }
        ]
      }),

      B.sql({
        id: 'm3-full', t: 2, src: 'rec', title: 'FULL JOIN: keep everything', file: 'full.sql', code: FULL, ctx: G.ctx('duckdb'),
        result: { msg: JT.FULL.rows.duckdb + ' rows', cols: G.table('m3.jointype.full').cols, rows: G.table('m3.jointype.full').rows },
        steps: [
          { say: 'A FULL JOIN keeps the unmatched rows of both sides. It is the join for reconciliation: what is in one table and not in the other, in either direction.' },
          { say: 'Run it. ' + JT.FULL.rows.duckdb + ' rows: 11 matches, 2 customers without orders, and 1 order without a customer. The last row is the guest order, with NULL customer columns.', run: true }
        ]
      }),

      B.cmp({
        id: 'm3-keeps', t: 1, src: 'rec', title: 'Which join keeps what',
        say: 'Five joins over the same 8 customers and 12 orders. Press Next for each. The row counts are what the three engines returned.',
        cols: ['Join', 'Keeps', 'Rows here', 'Typical use'],
        hl: 2,
        rows: [
          ['INNER', 'Matching pairs only', String(JT.INNER.rows.duckdb), 'Facts that must have a dimension'],
          ['LEFT', 'All left rows, NULL on the right when there is no match', String(JT.LEFT.rows.duckdb), 'Keep every customer, find those without orders'],
          ['RIGHT', 'All right rows, NULL on the left', String(JT.RIGHT.rows.duckdb), 'The mirror of LEFT. Most people swap the tables and use LEFT'],
          ['FULL', 'Everything from both sides', String(JT.FULL.rows.duckdb), 'Reconcile two tables in both directions'],
          ['CROSS', 'Every left row with every right row', String(JT.CROSS.rows.duckdb) + ' (8 times 12)', 'A calendar times a list of stores. Rare, and dangerous by accident']
        ],
        steps: [
          { upto: 1, say: 'INNER is the default. Rows with no partner disappear, so a missing customer silently removes an order from a report.' },
          { upto: 2, say: 'LEFT keeps the left side whole. It is the join for "everything in A, and B if there is one".' },
          { upto: 3, say: 'RIGHT is a LEFT join written backwards. Reading code is easier when you always put the table you want to keep on the left.' },
          { upto: 4, say: 'FULL shows the gaps on both sides.' },
          { upto: 5, say: 'CROSS has no condition and returns every pair. With big tables it is a quick way to fill a disk. If you see a join with no ON, ask why.' }
        ],
        pick: 'Write LEFT JOIN instead of RIGHT JOIN, and name the table you keep first. Use INNER only when a missing partner should remove the row.'
      }),

      B.sql({
        id: 'm3-onwhere', t: 1, src: 'rec', title: 'ON and WHERE are not the same on an outer join', file: 'left_on.sql', code: LEFTON, ctx: G.ctx('duckdb'),
        result: res('m3.left_on'),
        steps: [
          { say: 'You want every customer with the number of paid orders, zero included. The paid test goes in the ON clause.' },
          { say: 'The test is part of the match. A customer with no paid order has no matching pair, so the left join keeps the customer and fills the order columns with NULL.', lines: G.span(LEFTON, /^LEFT JOIN/) },
          { say: '`count(o.order_id)` counts only non-NULL values, so the unmatched customers get 0.', lines: G.span(LEFTON, /^SELECT/) },
          { say: 'Run it. All 8 customers are here. Four have no paid order. Move the test to WHERE and the join keeps ' + OW['filter in WHERE'] + ' rows instead of ' + OW['filter in ON'] + ', and four customers vanish.', run: true }
        ]
      }),

      B.bug({
        id: 'm3-bug-leftwhere', t: 1, title: 'Bug hunt: the customers that disappeared',
        q: 'The report should list every customer with the number of paid orders, zero included. Customers 4, 6, 7 and 8 are missing. Click the line that causes it.',
        file: 'paid_per_customer.sql', lang: 'sql',
        code: ['SELECT c.customer_id, c.name, count(o.order_id) AS paid_orders', 'FROM customers AS c', 'LEFT JOIN orders AS o ON o.customer_id = c.customer_id', "WHERE o.status = 'paid'", 'GROUP BY c.customer_id, c.name', 'ORDER BY c.customer_id;'].join('\n'),
        bad: [4], hint: 'What is `o.status` for a customer that has no order?',
        why: 'For a customer without a match, `o.status` is NULL, so `o.status = \'paid\'` is unknown and WHERE drops the row. The LEFT JOIN has turned into an INNER JOIN.',
        fix: ['SELECT c.customer_id, c.name, count(o.order_id) AS paid_orders', 'FROM customers AS c', "LEFT JOIN orders AS o ON o.customer_id = c.customer_id AND o.status = 'paid'", 'GROUP BY c.customer_id, c.name', 'ORDER BY c.customer_id;'].join('\n'),
        cheer: 'Move the test on the right table into ON.'
      }),

      B.quiz({
        id: 'm3-q-left', t: 1, q: 'You run `customers LEFT JOIN orders ON ... WHERE o.status = \'paid\'`. Which join does it behave like?',
        opts: [
          { t: 'A LEFT JOIN: every customer is kept', fb: 'The WHERE removes the rows that have NULL in o.status, which are exactly the customers without a match.' },
          { t: 'An INNER JOIN with a filter', fb: '' },
          { t: 'A CROSS JOIN', fb: 'There is a join condition, so it does not pair everything with everything.' },
          { t: 'A FULL JOIN', fb: 'A FULL JOIN also keeps unmatched orders. This one drops rows.' }
        ],
        ok: 1, why: 'The outer join makes NULL rows, and WHERE then removes them, because a test on a NULL column is not TRUE. The result is the same as an inner join. The recorded counts are ' + OW['filter in WHERE'] + ' rows with the test in WHERE and ' + OW['filter in ON'] + ' with the test in ON.'
      }),

      B.flow({
        id: 'm3-fanout', t: 1, src: 'docs', title: 'How a join multiplies rows', g: 'fanout', legend: true,
        steps: [
          { say: 'Here is the trap in a picture. Orders have one row for each order. Payments have one row for each payment. Press Next to join them.', tags: ['tg_g1'] },
          { say: 'Step 1. Orders enter the join. Order 1002 is worth 18.50. It appears once.', on: ['x1'], focus: ['f_o', 'f_j'], cap: 'One row for each order.' },
          { say: 'Step 2. Payments enter the join. Order 1002 was paid in two parts, so it has two payment rows.', on: ['x2'], focus: ['f_p', 'f_j'], cap: 'Two rows for order 1002.' },
          { say: 'Step 3. The join pairs the order with each of its payments. The result has one row for each payment, so order 1002 now appears twice, with its total 18.50 on both rows. The grain of the result is the payment, not the order.', on: ['x1', 'x2'], focus: ['f_j'], tags: ['tg_g2'], cap: 'The grain changed.' },
          { say: 'Step 4. `sum(o.total)` adds up the rows. It adds 18.50 twice. Nine paid orders are worth ' + TRUTH + ', and the sum returns ' + FS.duckdb[1][2] + '.', on: ['x3'], focus: ['f_s'], cap: 'The total is too big.' }
        ]
      }),

      B.widget({ id: 'm3-fan-lab', kind: 'fanout', t: 1, src: 'rec', title: 'Lab: twelve ways to total the same nine orders' }),

      B.sql({
        id: 'm3-fanout-rows', t: 1, src: 'rec', title: 'Look at the joined rows', file: 'fanout_rows.sql', code: FANP, ctx: G.ctx('duckdb'),
        result: res('m3.fanout_payments'),
        steps: [
          { say: 'Always look at the rows before you sum them. This query joins the paid orders to their payments and shows every row.' },
          { say: 'Nine paid orders go in.', lines: G.span(FANP, /FROM orders/) },
          { say: 'The join pairs each order with each payment.', lines: G.span(FANP, /JOIN payments/) },
          { say: 'Run it. ' + FP.rows.length + ' rows come out of 9 orders. Order 1002 appears twice, once for each payment of 10.00 and 8.50, and both rows carry the total 18.50.', run: true }
        ]
      }),

      B.sql({
        id: 'm3-fanout-sum', t: 1, src: 'rec', title: 'The wrong total, on PostgreSQL', file: 'fanout_sum.sql', code: FANS, ctx: G.ctx('postgres'),
        result: res('m3.fanout_sum', 'postgres'),
        steps: [
          { say: 'The same paid orders, summed twice: once alone, once after the join to payments.' },
          { say: 'The first query is the truth: 9 orders and ' + TRUTH + '.', lines: G.span(FANS, /orders only/, /WHERE o.status/) },
          { say: 'The second query joins payments. The rows go up, the revenue goes up, and nobody sold anything more.', lines: G.span(FANS, /orders and payments/, /^WHERE o.status = .paid.;?$/) },
          { say: 'Run it on PostgreSQL. ' + FS.postgres[1][2] + ' instead of ' + FS.postgres[0][2] + ': ' + PCT + ' percent too much. DuckDB and SQLite gave the same two numbers.', run: true }
        ]
      }),

      B.sql({
        id: 'm3-grain', t: 1, src: 'rec', title: 'Find the table that repeats', file: 'grain.sql', code: GRAIN, ctx: G.ctx('duckdb'),
        result: res('m3.grain_multi'),
        steps: [
          { say: 'How do you find the cause when a total is wrong? Ask each table: is the join key unique here?' },
          { say: 'Group the payments by order and keep the groups with more than one row.', lines: G.span(GRAIN, /GROUP BY/, /HAVING/) },
          { say: 'Run it. Orders 1002 and 1008 have two payments each. The payments table has ' + GC[0] + ' rows for ' + GC[1] + ' different orders, so its grain is the payment, not the order.', run: true }
        ],
        note: 'A quick check for any join: `count(*)` against `count(DISTINCT key)`. If they differ, the key repeats and the join multiplies rows.'
      }),

      B.sql({
        id: 'm3-preagg', t: 1, src: 'rec', title: 'Fix 1: aggregate to the grain of the order first', file: 'preaggregate.sql', code: PREAGG, ctx: G.ctx('duckdb'),
        result: res('m3.preagg_orders'),
        steps: [
          { say: 'The cleanest fix: reduce the many-side table to the grain of the one-side table before you join.' },
          { say: 'This CTE makes one row for each order: the net amount paid. Order 1008 was paid 12.00 and refunded -12.00, so it nets to 0.00.', lines: G.span(PREAGG, /^WITH/, /^\)/) },
          { say: 'Now the join is one to one. Every order matches at most one row, so no order can repeat.', lines: G.span(PREAGG, /^FROM orders/, /^LEFT JOIN/) },
          { say: 'Run it. 12 orders, 12 rows. Orders 1005 and 1012 have NULL: they have no payment. With this shape, `sum(o.total)` over the paid orders returned ' + PR.duckdb[1] + ' on all three engines, and ' + PR.postgres[0] + ' rows.', run: true }
        ]
      }),

      B.sql({
        id: 'm3-distinct', t: 2, src: 'rec', title: 'Fix that is not a fix: sum(DISTINCT)', file: 'distinct_trap.sql', code: DIST, ctx: G.ctx('duckdb'),
        result: res('m3.distinct_trap'),
        steps: [
          { say: 'A tempting fix for a doubled sum is `sum(DISTINCT total)`. On the 9 mini orders it even gives the right answer, by luck. Here it is on the 30,000 big orders.' },
          { say: '`DISTINCT` removes repeated values, not repeated rows. Two different orders with the same total count once.', lines: G.span(DIST, /sum\(DISTINCT total\)/) },
          { say: 'Run it. ' + G.n(DT[0]) + ' paid orders have only ' + DT[3] + ' different totals. The plain sum is ' + G.n(DT[1].split('.')[0]) + ' and the distinct sum is ' + DT[2] + '. Never use DISTINCT to repair a fan-out.', run: true }
        ]
      }),

      B.quiz({
        id: 'm3-q-fanout', t: 1, q: 'Nine paid orders are worth 127.00. You join them to `payments` and one order has two payments. What does `sum(o.total)` return?',
        opts: [
          { t: '127.00, because the join does not change the orders', fb: 'The join changes the number of rows, and the sum adds every row.' },
          { t: '145.50: the order with two payments is counted twice', fb: '' },
          { t: '63.50, because the join halves the rows', fb: 'A join does not halve anything. It repeats rows that match more than once.' },
          { t: 'An error about duplicate rows', fb: 'SQL accepts the query. The answer is wrong, and nothing tells you.' }
        ],
        ok: 1, why: 'The order with two payments appears on two rows, and its total of 18.50 is added twice. 127.00 plus 18.50 is ' + FS.duckdb[1][2] + '. The engines raise no warning.'
      }),

      B.quiz({
        id: 'm3-q-grain', t: 1, q: 'The `payments` table has 12 rows and 10 different `order_id` values. What is its grain?',
        opts: [
          { t: 'One row for each order', fb: 'Then there would be 10 rows, one for each order.' },
          { t: 'One row for each payment', fb: '' },
          { t: 'One row for each customer', fb: 'The table has no customer column at all.' },
          { t: 'It cannot be known', fb: 'You can check it: count rows against distinct keys.' }
        ],
        ok: 1, why: 'Each row is one payment, and some orders have two. `count(*)` is ' + GC[0] + ' and `count(DISTINCT order_id)` is ' + GC[1] + ', so the order key repeats.'
      }),

      B.order({
        id: 'm3-order-debug', t: 2, title: 'Debug a total that is too big',
        q: 'Tap the steps in the order you would take them when a dashboard total is wrong after a join was added.',
        items: ['Compare the total with the source table, alone', 'Compare the row count before and after the join', 'Find the table whose join key repeats', 'Reduce that table to the grain of the key, or use EXISTS', 'Re-run and compare the total with the source again'],
        why: 'Start with a number you trust. If the row count grows after a join, a key repeats. Find the table that repeats, fix the grain, and check against the trusted number. Do not start by adding DISTINCT.'
      }),

      B.decide({
        id: 'm3-dec-fix', t: 2, title: 'Decision: how do you keep the revenue right?',
        scenario: 'The revenue by country query must show the payment method too, so it joins `payments`. Orders can have several payments. The total jumped by 14 percent. Which fix do you ship?',
        opts: [
          { t: 'Aggregate payments to one row for each order, then join', d: 'A CTE with `GROUP BY order_id`, joined one to one.', lose: '' },
          { t: 'Use sum(DISTINCT o.total)', d: 'One word added to the query.', lose: 'It removes equal totals of different orders. It looks right on small data and is very wrong at scale.' },
          { t: 'Divide the sum by the number of payments', d: 'Correct for orders with two payments.', lose: 'The average of payments per order differs from day to day, so the answer is wrong in a new way every day.' },
          { t: 'Remove the payments join and drop the method', d: 'The numbers are right again.', lose: 'It hides the problem and does not answer the question of finance.' }
        ],
        pick: 0,
        why: 'The fix that respects the grain is to bring the many-side table to the grain of the order before joining, so the join cannot multiply rows. The total then stays right whatever the number of payments, and the method can be shown as an aggregated column such as the first method, or a list.',
        when: 'If you only need to test whether a payment exists, use EXISTS and do not join at all. If you need every payment on its own row, change the grain of the report to the payment, and sum the payment amounts, not the order totals.'
      }),

      B.sql({
        id: 'm3-self', t: 1, src: 'rec', title: 'A self join: a table joined to itself', file: 'self_join.sql', code: SELF, ctx: G.ctx('duckdb'),
        result: res('m3.self_join', 'duckdb'),
        steps: [
          { say: 'A table can be joined to itself. The categories table stores a tree: each row points to its parent with `parent_id`.' },
          { say: 'The table appears twice, with two aliases: `c` is the child and `p` is the parent. The join condition links a child to its parent.', lines: G.span(SELF, /^FROM categories/, /^LEFT JOIN/) },
          { say: 'A LEFT JOIN keeps the root, which has no parent. Run it. The root `Menu` has a NULL parent. Mission 5 walks the whole tree with a recursive CTE.', run: true }
        ]
      }),

      B.sql({
        id: 'm3-range', t: 2, src: 'rec', title: 'A range join: the price on the day', file: 'range_join.sql', code: RANGE, ctx: G.ctx('postgres'),
        result: res('m3.range_join', 'postgres'),
        steps: [
          { say: 'A join condition does not have to be equality. `price_history` has a price and the dates it was valid. To find the price on the day of an order, join on a date range.' },
          { say: 'The match needs the product and a date that falls between `valid_from` and `valid_to`.', lines: G.span(RANGE, /JOIN price_history/, /BETWEEN/) },
          { say: 'Keep the lines where the price charged differs from the list price on that day.', lines: G.span(RANGE, /WHERE/) },
          { say: 'Run it on PostgreSQL. One line: order 1003 charged 5.00 on 2026-03-02, when the list price was 4.50. The price changed on 5 March. DuckDB gave the same row.', run: true }
        ],
        note: 'Range joins are not hash joins. Engines handle them with a nested loop or a special range operator, and on big tables they are slow unless the ranges are narrow.'
      }),

      B.cmp({
        id: 'm3-natural', t: 2, src: 'rec', title: 'USING and NATURAL JOIN',
        say: 'Two shortcuts for the join condition. Press Next for each. One is handy, the other is a trap.',
        cols: ['Shortcut', 'What it does', 'Recorded', 'Advice'],
        hl: 3,
        rows: [
          ['`JOIN orders USING (customer_id)`', 'Joins on a column that has the same name in both tables, and returns that column once.', G.on('m3.using', 'duckdb').rows.length + ' rows for orders below 1004, the same on all three engines', 'Fine. It is short and the condition is visible.'],
          ['`customers NATURAL JOIN stores`', 'Joins on every column whose name appears in both tables.', NAT.duckdb + ' rows: `name` and `country` are in both tables and they never match', 'Avoid. A new column with a shared name changes the join without a warning.']
        ],
        steps: [
          { upto: 1, say: 'USING names the column. The condition stays explicit, and the output has one `customer_id` column instead of two.' },
          { upto: 2, say: 'NATURAL JOIN finds the shared names itself. Customers and stores share `name` and `country`, so the join compares a person with a store and returns nothing. Rename or add a column and the join changes.' }
        ],
        pick: 'Write the ON or USING condition yourself. Never use NATURAL JOIN in code that has to survive a schema change.'
      }),

      B.sql({
        id: 'm3-lateral', t: 3, src: 'rec', title: 'LATERAL: a subquery that sees the row', file: 'lateral.sql', code: LATERAL, ctx: G.ctx('duckdb'),
        result: res('m3.lateral', 'duckdb'),
        steps: [
          { say: 'A LATERAL subquery may refer to columns of the tables before it. That makes it a loop: for each customer, run this small query. It is the clean way to take the top row of each group.' },
          { say: 'For each customer, the subquery takes the newest order.', lines: G.span(LATERAL, /CROSS JOIN LATERAL/, /LIMIT 1/) },
          { say: 'Run it on DuckDB. Six customers have orders, so six rows. Customers 6 and 8 have none, and a CROSS JOIN LATERAL drops them. Use LEFT JOIN LATERAL ... ON TRUE to keep them. SQLite has no LATERAL.', run: true }
        ]
      }),

      B.challenge({
        id: 'm3-ch-paid', t: 1, title: 'Coding round: paid so far for each order', file: 'paid_by_order.sql', lang: 'sql',
        q: 'Return **one row for each order**: the order id, its total, and the **total amount paid** so far. An order with no payment must appear with 0. Orders can have several payments, and a refund is a negative payment.',
        data: [
          { name: 'orders (id and total)', cols: G.cols('data.orders', ['order_id', 'total']).cols, rows: G.cols('data.orders', ['order_id', 'total']).rows, types: ['INTEGER', 'DECIMAL(10,2)'] },
          { name: 'payments (order and amount)', cols: G.cols('data.payments', ['payment_id', 'order_id', 'amount']).cols, rows: G.cols('data.payments', ['payment_id', 'order_id', 'amount']).rows, types: ['INTEGER', 'INTEGER', 'DECIMAL(10,2)'] }
        ],
        starter: '-- one row for each order, with the amount paid so far (0 when nothing was paid)\nSELECT ...',
        hints: ['Which table must keep all its rows? Pick the join that does that.', 'Group by the order so that its payments collapse to one row.', 'An order with no payments has NULL after the join. What turns NULL into 0?'],
        sol: G.file('m3.ch_paid_by_order'),
        res: res('m3.ch_paid_by_order'),
        expl: ['The LEFT JOIN keeps orders without payments. Their payment columns are NULL.', 'GROUP BY collapses the payments of one order into one row, so the grain of the result is the order.', '`coalesce(sum(...), 0)` turns the NULL sum of an unpaid order into 0. Order 1008 is paid 12.00 and refunded -12.00, so its sum is 0.00 too.'],
        cx: 'One pass over payments to group, a hash join with orders, and one group for each order. The time grows with the number of payments.'
      }),

      B.challenge({
        id: 'm3-ch-country', t: 2, title: 'Coding round: revenue by country with a payment', file: 'country_revenue.sql', lang: 'sql',
        q: 'Brewline wants the **revenue of paid orders by customer country**, but only for orders that have at least one payment with status `ok`. Return the country, the number of orders and the revenue, biggest first. Orders can have several payments. Do not double count.',
        data: [
          { name: 'orders', cols: G.cols('data.orders', ['order_id', 'customer_id', 'status', 'total']).cols, rows: G.cols('data.orders', ['order_id', 'customer_id', 'status', 'total']).rows, types: ['INTEGER', 'INTEGER', 'VARCHAR', 'DECIMAL(10,2)'] },
          { name: 'customers', cols: G.cols('data.customers', ['customer_id', 'country']).cols, rows: G.cols('data.customers', ['customer_id', 'country']).rows, types: ['INTEGER', 'VARCHAR'] },
          { name: 'payments', cols: G.cols('data.payments', ['payment_id', 'order_id', 'amount', 'status']).cols, rows: G.cols('data.payments', ['payment_id', 'order_id', 'amount', 'status']).rows, types: ['INTEGER', 'INTEGER', 'DECIMAL(10,2)', 'VARCHAR'] }
        ],
        starter: '-- revenue by country for paid orders that have an ok payment, without double counting\nSELECT ...',
        hints: ['You only need to know whether a payment exists. You do not need its columns.', 'Which operator tests existence without multiplying rows?', 'Join customers with an inner join: the guest order has no customer and drops out.'],
        sol: G.file('m3.ch_country'),
        res: res('m3.ch_country'),
        expl: ['`EXISTS` asks whether an ok payment exists for the order. It never multiplies rows, so order 1002, with two payments, counts once.', 'The inner join to customers drops the guest order, which has no country.', 'The version that joins payments directly returned **' + CCW.rows[0][2] + '** for ' + CCW.rows[0][0] + ' (' + CCW.rows[0][1] + ' orders). The right answer is ' + CC.rows[0][2] + ' for ' + CC.rows[0][1] + ' orders.'],
        cx: 'The engine can run EXISTS as a semi join: one probe of the payments hash table for each order. It is linear in the number of orders and payments.'
      }),

      B.incident({
        id: 'm3-inc-doubled', t: 1, time: '08:40',
        alert: 'The revenue on the morning dashboard is ' + PCT + ' percent higher than yesterday. Finance says no campaign ran. The only change in the data team was a new column, the payment method, added to the revenue query yesterday evening.',
        clues: ['The query now has a join to the payments table.', 'Some orders are paid in two parts.', 'The sum is over `orders.total`.'],
        opts: [
          { t: 'Ask the sales team what they changed', fb: 'Nothing changed in sales. The change is in the query.' },
          { t: 'Compare the row count of the query before and after the new join', fb: '' },
          { t: 'Restart the dashboard service', fb: 'The service shows what the query returns. The query is wrong.' },
          { t: 'Round the total down', fb: 'It hides the problem and misses the true number.' }
        ],
        best: 1,
        why: 'A total that grows after a join was added points to a fan-out. The check costs one query: count the rows before and after the join. In the mini data 9 paid orders became ' + FS.duckdb[1][1] + ' rows.',
        checks: [['Count the rows with and without the join', '9 rows became ' + FS.duckdb[1][1] + ' rows.'], ['Check the grain of payments', GC[0] + ' payment rows for ' + GC[1] + ' orders: the key repeats.'], ['Fix the query', 'Aggregate payments to one row for each order, or use EXISTS.'], ['Compare with the trusted number', 'The revenue is back at ' + TRUTH + ' for the nine orders.']],
        tell: 'After a join to the payments table, the revenue on the dashboard went up by almost fifteen percent. Orders can be paid in two parts, so the join repeated them and the sum counted them twice. I confirmed it by comparing row counts, aggregated the payments to one row for each order, and checked the total against the orders table alone. I also added a test on the dashboard model.',
        prevent: ['Add a test: the row count of a model must equal the row count of its main table.', 'Write the grain of each table in its description.', 'Review every new join with the question: is the key unique on the other side?']
      }),

      B.qa({
        id: 'qa-jointypes', t: 1, tag: 'Joins', secs: 60,
        q: 'What is the difference between INNER, LEFT, RIGHT, FULL and CROSS joins?',
        pts: ['INNER keeps matches only', 'LEFT keeps all left rows and fills NULL on the right', 'RIGHT is the mirror, FULL keeps both sides', 'CROSS pairs every row with every row', 'Pick by what you must keep'],
        short: 'An inner join returns only the pairs that match. A left join returns every row of the left table, with the right columns set to NULL when there is no match. A right join is the mirror image, and a full join keeps unmatched rows of both sides. A cross join has no condition and pairs every left row with every right row, so the result has left rows times right rows. I choose by what must survive: an inner join when a missing partner should remove the row, a left join to keep all customers and find those without orders. On eight customers and twelve orders the counts were 11, 13, 12, 14 and 96.',
        fu: [['How do you find rows in A that have no match in B?', 'LEFT JOIN B and filter `b.key IS NULL`, or NOT EXISTS. Both ignore NULL problems that NOT IN has.']],
        trap: 'Using a right join in a chain of left joins and losing track of what is kept.',
        real: 'Tell about a join type that dropped rows from a report.'
      }),

      B.qa({
        id: 'qa-onwhere', t: 1, tag: 'Joins', secs: 60,
        q: 'Does a filter go in ON or in WHERE?',
        pts: ['Inner join: same result', 'Outer join: WHERE runs after the join', 'WHERE removes the NULL rows', 'Put right-table filters in ON'],
        short: 'For an inner join it makes no difference: both give the same rows, and the planner treats them alike. For an outer join it does. The ON clause decides which rows match, and unmatched rows of the preserved side are kept with NULLs. WHERE runs after the join, and a test on a column of the optional side is unknown for those NULL rows, so it removes them and the left join becomes an inner join. So for a left join, a filter on the right table goes in ON, and a filter on the left table goes in WHERE. On the course data, a paid test in ON gave 12 rows and in WHERE gave 8.',
        fu: [['How do you notice this bug in a review?', 'A LEFT JOIN followed by a WHERE on a right-table column other than `IS NULL`. It is usually a mistake.']],
        trap: 'Saying that ON and WHERE are interchangeable.',
        real: 'Tell about a LEFT JOIN that silently became an inner join.'
      }),

      B.qa({
        id: 'qa-fanout', t: 1, tag: 'Joins', secs: 60,
        q: 'A total is too big after you add a join. What happened and how do you fix it?',
        pts: ['The other table has several rows for a key: fan-out', 'The sum counts the repeated rows', 'Check count(*) against count(distinct key)', 'Aggregate to the grain first, or use EXISTS', 'Not DISTINCT'],
        short: 'This is a fan-out. The table I joined has several rows for the same key, so each row of the first table repeats once for each match, and the sum counts it several times. I check the grain: the row count before and after the join, and `count(*)` against `count(DISTINCT key)` on the joined table. Then I fix it at the grain. Either I aggregate the many-side table to one row for each key before joining, or, if I only need to know whether a match exists, I use EXISTS. I do not use `sum(DISTINCT)`, because it removes equal values, not repeated rows. At the end I compare with the total from the source table.',
        fu: [['Why is sum(DISTINCT) wrong?', 'It collapses different rows that have the same value. On 27,315 paid orders there were only 6 different totals, so it returned 267.00 instead of more than a million.']],
        trap: 'Dividing the total by the number of repeats.',
        real: 'Tell about a doubled total you found, and the check that proved the fix.'
      }),

      B.qa({
        id: 'qa-grain', t: 2, tag: 'Joins', secs: 60,
        q: 'What is the grain of a table, and why do you state it?',
        pts: ['What one row stands for', 'One order, one payment, one customer a day', 'The result grain follows the joins', 'It tells you when a join multiplies rows'],
        short: 'The grain is what one row of a table stands for: one order, one payment, one customer for one day. I state it for every table in a query and for the result. When I join, the grain of the result is the finest grain involved if the key repeats: orders joined to payments gives one row for each payment. If I then sum an order column, I count each order once for each payment. Stating the grain makes that visible before I run the query. I also write it in the model description and I test it: a unique test on the grain columns.',
        fu: [['How do you test a grain?', 'A uniqueness test on the columns that define it, for example `count(*) = count(DISTINCT order_id, line_no)` for order lines.']],
        trap: 'Joining two tables without knowing which key is unique.',
        real: 'Tell about a table whose grain was not what its name suggested.'
      }),

      B.qa({
        id: 'qa-distinct', t: 2, tag: 'Joins', secs: 60,
        q: 'Why is DISTINCT a bad fix for duplicate rows after a join?',
        pts: ['It removes repeated values, not repeated rows', 'Different rows with equal values collapse', 'It hides the cause', 'Fix the grain instead'],
        short: 'DISTINCT removes rows that are equal in all selected columns. After a join I use it to hide the repeats, but it also removes legitimate rows that happen to look the same, for example two orders with the same total. With `sum(DISTINCT total)` over 27,315 paid orders I got 267.00, because there are only six different totals. It also hides the real cause, a key that repeats, and it costs a sort or a hash on all rows. I fix the grain: aggregate first, use EXISTS for a membership test, or choose one row with a window function.',
        fu: [['When is DISTINCT right?', 'When you want the different values themselves, for example a list of countries, or `count(DISTINCT customer_id)` for the number of customers.']],
        trap: 'Adding DISTINCT until the numbers look right.',
        real: 'Tell about a report where DISTINCT changed the numbers.'
      }),

      B.qa({
        id: 'qa-selfrange', t: 2, tag: 'Joins', secs: 60,
        q: 'When do you join a table to itself, and when do you join on a range?',
        pts: ['Self join: rows that refer to rows of the same table', 'Parent and child, or pairs of rows', 'Range join: a value between two bounds', 'Price at a point in time', 'Range joins can be slow'],
        short: 'A self join uses the same table twice with two aliases. I use it when rows refer to other rows of the same table: a category and its parent, an employee and a manager. A range join uses a condition such as `date BETWEEN valid_from AND valid_to`. I use it to find the price, the tier or the rate that was valid on the day of an event. It finds the right row for each event. Range joins cannot use a plain hash join, so engines use a nested loop or a range operator, and they are slow on big tables unless the ranges are narrow or sorted. For events and intervals I also look at ASOF joins where the engine offers them.',
        fu: [['What is a risk in a range join?', 'Overlapping ranges. An event can match two rows and the join multiplies it. Make the ranges disjoint and test it.']],
        trap: 'Forgetting that overlapping validity ranges cause a fan-out.',
        real: 'Tell about a price or rate lookup you built with a range join.'
      }),

      B.qa({
        id: 'qa-cross', t: 1, tag: 'Joins', secs: 60,
        q: 'What is a cross join and when is it useful?',
        pts: ['Every row with every row', 'Rows = left times right', 'Useful for a calendar times a list', 'Dangerous by accident'],
        short: 'A cross join pairs every row of one table with every row of another, with no condition. The result has left rows times right rows: 8 customers and 12 orders gave 96. It is useful on purpose, for example to build a grid of every day and every store, which you then left join with the real sales to show zeros. By accident it is dangerous: a missing join condition in a big query turns two tables of a million rows into a trillion, and the job runs until it fills a disk. If a join has no ON, I ask why.',
        fu: [['How can a cross join appear by accident?', 'A comma join with the condition forgotten in WHERE, or a join on a condition that is always true.']],
        trap: 'Believing that a missing ON clause is a syntax error. Many engines accept it.',
        real: 'Tell about a calendar grid you built with a cross join.'
      }),

      B.recap({
        id: 'm3-recap', n: 3, badge: 'Join Keeper', color: '#BBF7D0',
        pts: [
          '**INNER** keeps matches, **LEFT** keeps the left side, **FULL** keeps both, **CROSS** pairs everything. Predict the row count first.',
          'For an **outer join**, a filter on the optional table goes in **ON**. In WHERE it turns the join into an inner join.',
          'A join can **multiply rows**: a fan-out. An order with two payments appears twice and its total is added twice.',
          'State the **grain** of every table. Check `count(*)` against `count(DISTINCT key)`.',
          'Fix a fan-out by **aggregating to the grain first**, or with **EXISTS**. Never with `sum(DISTINCT)`.',
          'Self join for trees, range join for a value between bounds, LATERAL for the top row of each group. Do not use NATURAL JOIN.'
        ],
        lines: [
          'Before I join, I say the grain of both tables.',
          'A total that grows after a join is a fan-out until proven otherwise.',
          'Filters on the optional side of a left join go in ON.'
        ]
      })
    ]
  });
})();
