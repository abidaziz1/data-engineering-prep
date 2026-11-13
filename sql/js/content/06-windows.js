/* Mission 6: window functions. Partitions, ranking, LAG and LEAD, running totals, frames (ROWS, RANGE, GROUPS), FIRST_VALUE and LAST_VALUE, windows over aggregates,
   filtering on a window function, and what a window costs in a plan. Every result and plan was returned by the engines when the recorder ran the queries. */
(function () {
  var B = LAB.b, G = LAB.get;
  G.expect(LAB.sq.info.frame.check().length === 0, 'the frame rule of the lab gives the sums that DuckDB, PostgreSQL and SQLite returned for all 27 settings');
  var OV = G.on('m6.over', 'duckdb'), GB = G.on('m6.group_by', 'duckdb'), RK = G.on('m6.rank', 'duckdb'), NT = G.on('m6.ntile', 'duckdb'), RP = G.on('m6.rank_partition', 'duckdb');
  var RW = G.on('m6.rank_after_where', 'duckdb'), RA = G.on('m6.rank_all_orders', 'duckdb'), LG = G.on('m6.lag', 'duckdb'), LGP = G.on('m6.lag', 'postgres'), RU = G.on('m6.running', 'duckdb');
  var RTY = G.on('m6.running_ties', 'duckdb'), MV = G.on('m6.moving', 'duckdb'), MVP = G.on('m6.moving', 'postgres'), LV = G.on('m6.last_value', 'duckdb'), SH = G.on('m6.share', 'duckdb');
  var T3 = G.on('m6.top3_cte', 'duckdb'), QU = G.on('m6.qualify', 'duckdb'), CS = G.on('m6.ch_share', 'duckdb'), CD = G.on('m6.ch_drop', 'duckdb'), CT = G.on('m6.ch_third', 'duckdb');
  var WE = { duckdb: G.text('m6.where_error.duckdb.error'), postgres: G.text('m6.where_error.postgres.error'), sqlite: G.text('m6.where_error.sqlite.error') };
  var QE = { postgres: G.text('m6.qualify.postgres.error'), sqlite: G.text('m6.qualify.sqlite.error') };
  var P = { pg_noindex: G.text('m6.plan.pg_noindex'), pg_index: G.text('m6.plan.pg_index'), duck: G.text('m6.plan.duck') };
  function cm(t) { return t.split('\n').map(function (l) { return '-- ' + l; }).join('\n'); }
  var PLAN_WIN = [cm(G.file('m6.plan.query')), '-- PostgreSQL ' + G.meta('postgres') + ', no index', P.pg_noindex, '', '-- PostgreSQL after CREATE INDEX big_orders_cust_ts ON big_orders (customer_id, order_ts)', P.pg_index, '', '-- DuckDB ' + G.meta('duckdb'), P.duck].join('\n');
  function same(key, cols) {   /* the three engines return the same values in these columns */
    var a = G.on(key, 'duckdb'), ix = cols.map(function (c) { return a.cols.indexOf(c); });
    return ['postgres', 'sqlite'].every(function (e) {
      var b = G.on(key, e);
      return b.rows.length === a.rows.length && a.rows.every(function (r, k) { return ix.every(function (i) { return parseFloat(r[i]) === parseFloat(b.rows[k][i]) || r[i] === b.rows[k][i]; }); });
    });
  }
  G.expect(OV.rows.length === 9 && OV.rows[0][3] === '127.00' && GB.rows.length === 3 && OV.rows[0][4] === '82.00' && OV.rows[2][4] === '14.50' && OV.rows[4][4] === '30.50' && same('m6.over', ['all_paid', 'store_paid']), 'the window keeps 9 rows with the totals 127.00, 82.00, 14.50 and 30.50, and GROUP BY returns 3');
  G.expect(RK.rows[2].slice(3).join() === '3,3,3' && RK.rows[3].slice(3).join() === '4,3,3' && RK.rows[4].slice(2).join() === '45.00,5,5,4' && same('m6.rank', ['row_num', 'rnk', 'dense_rnk']), 'the two 50.00 days: row numbers 3 and 4, rank 3 and 3, dense rank 3 and 3, then 45.00 gets 5, 5 and 4');
  G.expect(same('m6.rownum_ties', ['day', 'store_id', 'row_num']) && G.on('m6.rownum_ties', 'duckdb').rows[2][1] === '1', 'all three engines give row number 3 to store 1 and 4 to store 2');
  G.expect([1, 2, 3, 4].map(function (q) { return NT.rows.filter(function (r) { return r[3] === String(q); }).length; }).join() === '3,3,2,2', 'NTILE(4) over 10 rows makes buckets of 3, 3, 2 and 2');
  G.expect(RP.rows[0].join() === '1,2026-03-04,60.00,1' && RP.rows[5].join() === '2,2026-03-05,50.00,1', 'the best day of store 1 is 4 March and of store 2 is 5 March');
  G.expect(RW.rows[5][0] === '1001' && RW.rows[5][3] === '6' && RA.rows[6][0] === '1001' && RA.rows[6][3] === '7' && RA.rows[5][0] === '1008', 'order 1001 is ranked 6 among paid orders and 7 among all orders, because refunded order 1008 sits above it');
  G.expect(LG.rows[0][3] === 'NULL' && LG.rows[1][4] === '15.00' && LG.rows[2][4] === '-20.00' && LG.rows[3][4] === '25.00' && LG.rows[4][4] === '-10.00' && LG.rows[4][5] === '0.00' && LGP.rows[4][5] === '0', 'LAG gives NULL on the first day, and the LEAD default 0 prints as 0.00 on DuckDB and 0 on PostgreSQL');
  G.expect(RU.rows.slice(0, 5).map(function (r) { return r[3]; }).join() === '40.00,95.00,130.00,190.00,240.00' && RU.rows.slice(5).map(function (r) { return r[3]; }).join() === '25.00,55.00,100.00,120.00,170.00' && same('m6.running', ['running_total']), 'the running totals of the two stores');
  G.expect(RTY.rows[6].slice(3).join() === '295.00,245.00' && RTY.rows[7].slice(3).join() === '295.00,295.00' && same('m6.running_ties', ['default_frame', 'rows_frame']), 'the tied 50.00 rows: default frame 295.00 twice, ROWS frame 245.00 and 295.00');
  G.expect(MV.rows.slice(0, 5).map(function (r) { return r[3]; }).join() === '40.0,47.5,43.33,50.0,48.33' && MV.rows.slice(0, 5).map(function (r) { return r[4]; }).join() === '1,2,3,3,3' && MVP.rows[0][3] === '40.00' && same('m6.moving', ['avg_3_days', 'rows_in_frame']), 'the 3 day moving average of store 1');
  G.expect(LV.rows.every(function (r) { return r[4] === r[2] && r[5] === '50.00'; }) && same('m6.last_value', ['first_day', 'last_default', 'last_full']), 'LAST_VALUE with the default frame repeats the row, and with the full frame it is 50.00');
  G.expect(SH.rows.map(function (r) { return r[2]; }).join() === '64.6,24.0,11.4' && G.on('m5.cte_reuse', 'duckdb').rows.map(function (r) { return r[2]; }).join() === '64.6,24.0,11.4', 'the window version of the share of revenue gives the same shares as the CTE of mission 5');
  G.expect(/window functions/i.test(WE.duckdb) && /window functions are not allowed in WHERE/.test(WE.postgres) && /misuse of window function/.test(WE.sqlite) && /QUALIFY/.test(QE.postgres) && /QUALIFY/.test(QE.sqlite), 'the three engines refuse a window function in WHERE, and only DuckDB knows QUALIFY');
  G.expect(T3.rows.map(function (r) { return r[0]; }).join() === '1004,1010,1002' && QU.rows.map(function (r) { return r[0]; }).join() === '1004,1010,1002', 'the three biggest paid orders are 1004, 1010 and 1002');
  G.expect(CS.rows.length === 9 && CS.rows[3][3] === '31.7' && CD.rows.length === 3 && CD.rows[0].join() === '1,2026-03-03,35.00,55.00' && CT.rows.length === 2, 'the three coding rounds');
  G.expect(/^WindowAgg/.test(P.pg_noindex) && /Sort Key: customer_id, order_ts/.test(P.pg_noindex) && /Sort Method: quicksort/.test(P.pg_noindex) && /Index Scan using big_orders_cust_ts/.test(P.pg_index) && !/Sort/.test(P.pg_index) && /^WINDOW row_number/.test(P.duck), 'PostgreSQL sorts for a window and skips the sort with a matching index, and DuckDB uses one WINDOW operator');

  var OVER = G.file('m6.over'), RANK = G.file('m6.rank'), RTIES = G.file('m6.rownum_ties'), NTILE = G.file('m6.ntile'), RPART = G.file('m6.rank_partition'), RWHERE = G.file('m6.rank_after_where');
  var LAGQ = G.file('m6.lag'), RUNQ = G.file('m6.running'), RTYQ = G.file('m6.running_ties'), MOVQ = G.file('m6.moving'), LASTQ = G.file('m6.last_value'), SHAREQ = G.file('m6.share');
  var NAMEDQ = G.file('m6.named_window'), TOP3Q = G.file('m6.top3_cte'), QUALQ = G.file('m6.qualify');
  function res(key, e) { var t = e ? G.on(key, e) : G.table(key); return { msg: t.rows.length + ' rows', cols: t.cols, rows: t.rows }; }

  LAB.addChapter({
    id: 'm6', n: 6, title: 'Window functions', short: 'Windows', blurb: 'Ranking, LAG and LEAD, running totals, frames with ROWS, RANGE and GROUPS, and filtering on a window function', minutes: 55,
    focus: ['int', 'mart'],
    goals: [
      'Add a **value computed over related rows** to every row, without collapsing them.',
      'Rank rows with **ROW_NUMBER, RANK and DENSE_RANK**, and know what a tie does to each.',
      'Compare a row with its neighbors using **LAG and LEAD**, and write running totals and moving averages.',
      'Choose a **frame** with ROWS, RANGE or GROUPS, and avoid the traps of the default frame.',
      'Filter on a window function with a **CTE** or QUALIFY, and read what a window costs in a plan.'
    ],
    say: 'Mission 6 is about window functions. They look hard, and they are three ideas: a window of rows, an order inside it, and a frame that says which rows the function can see. You will run each idea on the Brewline data, play with the frame in a lab, and meet the traps that interviewers like: ties, the default frame and LAST_VALUE.',
    scenes: [
      B.talk({
        id: 'm6-what', t: 1, src: 'docs', title: 'A value from related rows, on every row',
        say: 'Press Next for six ideas about window functions.',
        items: [
          ['A window function reads related rows', 'It computes a value from a set of rows near the current row and writes it as a new column. The set is the window. No row is removed or merged.', 'Same rows, one more column.'],
          ['OVER describes the window', '`OVER ()` means all rows. `PARTITION BY` splits the rows into groups. `ORDER BY` sorts inside a group. A frame can narrow the window to the rows around the current one.', 'Partition, order, frame.'],
          ['It differs from GROUP BY', 'GROUP BY returns one row for each group. A window function keeps every row and puts the value of its group next to it. You can show an order and the total of its store in one row.', 'Collapse or keep.'],
          ['Three families of function', 'Aggregates used as windows (`sum`, `avg`, `count`). Ranking (`row_number`, `rank`, `dense_rank`, `ntile`). Offsets (`lag`, `lead`, `first_value`, `last_value`).', 'Add, rank, look around.'],
          ['It runs late in the query', 'After WHERE, GROUP BY and HAVING, and before DISTINCT, ORDER BY and LIMIT. So you can run a window over aggregated rows, and you cannot filter on a window function in WHERE.', 'After grouping, before sorting.'],
          ['The engines of this course have them', 'DuckDB, PostgreSQL and SQLite all ran the examples of this mission. SQLite has window functions from version 3.25.', 'Check the version.']
        ],
        cols: 1
      }),

      B.sql({
        id: 'm6-over', t: 1, src: 'rec', title: 'OVER: keep the rows and add a total', file: 'over.sql', code: OVER, ctx: G.ctx('duckdb'),
        result: res('m6.over', 'duckdb'),
        steps: [
          { say: 'You want every paid order with two extra numbers: the total of all paid orders and the total of its own store. GROUP BY cannot do it, because it collapses the orders into one row for each store.' },
          { say: 'An empty `OVER ()` is the whole result. All paid orders are one window, so `sum(total)` is the same on every row.', lines: G.span(OVER, /OVER \(\) AS all_paid/) },
          { say: '`PARTITION BY store_id` makes one window for each store. The sum runs on the rows of that store only.', lines: G.span(OVER, /PARTITION BY store_id/) },
          { say: 'Run it. All ' + OV.rows.length + ' rows are still there. `all_paid` is 127.00 on every row. `store_paid` is 82.00 for store 1, 14.50 for store 2 and 30.50 for store 4. The same sum with GROUP BY returned only ' + GB.rows.length + ' rows. DuckDB, PostgreSQL and SQLite gave the same numbers. SQLite prints 127.0 and 11.5, without fixed decimals.', run: true }
        ]
      }),

      B.flow({
        id: 'm6-flow', t: 1, src: 'docs', title: 'How a window function runs', g: 'window', legend: true,
        steps: [
          { say: 'A window function reads rows and writes a new column. Press Next to follow one query through its parts.', tags: ['tg_w1'] },
          { say: 'Step 1. The engine finishes WHERE, GROUP BY and HAVING first. The rows that remain are the input of the window function.', on: ['v1'], focus: ['w_rows', 'w_part'], cap: 'Input rows.' },
          { say: 'Step 2. `PARTITION BY` splits the rows into separate groups. The groups do not see each other.', on: ['v2'], focus: ['w_part', 'w_order'], cap: 'Partition.' },
          { say: 'Step 3. `ORDER BY` sorts the rows inside each group. Ranking, LAG and running totals need it.', on: ['v3'], focus: ['w_order', 'w_frame'], cap: 'Order.' },
          { say: 'Step 4. For each row the engine picks a frame: the rows of the group that this row may use. With an ORDER BY the default frame runs from the first row of the group to the current row and the rows that tie with it.', on: ['v4'], focus: ['w_frame', 'w_fn'], cap: 'Frame.' },
          { say: 'Step 5. The function reads the frame and writes its value as a new column on the row. Every input row is still there, so the output has as many rows as the input.', on: ['v5'], focus: ['w_fn', 'w_out'], tags: ['tg_w2'], cap: 'New column.' }
        ]
      }),

      B.sql({
        id: 'm6-where-first', t: 1, src: 'rec', title: 'A window sees the rows that passed WHERE', file: 'rank_after_where.sql', code: RWHERE, ctx: G.ctx('duckdb'),
        result: res('m6.rank_after_where', 'duckdb'),
        steps: [
          { say: 'Window functions run after WHERE. A window sees only the rows that passed the filter. This query ranks the paid orders by total.' },
          { say: 'WHERE removes the cancelled, refunded and pending orders before the ranking starts.', lines: G.span(RWHERE, /^WHERE status/) },
          { say: 'Run it. Order 1001 (11.50) is ranked 6th among the paid orders. I also ran the same ranking without the WHERE: refunded order 1008 (12.00) is then in the race, and 1001 drops to rank 7.', run: true }
        ],
        note: 'To rank among all orders and then show only the paid ones, rank in a CTE first and filter in the outer query.'
      }),

      B.sql({
        id: 'm6-rank', t: 1, src: 'rec', title: 'ROW_NUMBER, RANK and DENSE_RANK', file: 'rank.sql', code: RANK, ctx: G.ctx('duckdb'),
        result: res('m6.rank', 'duckdb'),
        steps: [
          { say: 'Three ranking functions answer "which place is this row in". They differ on ties. Two days have the same revenue, 50.00: store 1 and store 2 on 5 March.' },
          { say: '`ROW_NUMBER` numbers the rows 1, 2, 3 and never repeats a number. Its ORDER BY has a second column, `store_id`, to break the tie.', lines: G.span(RANK, /ROW_NUMBER\(\)/) },
          { say: '`RANK` gives tied rows the same number and then skips: 3, 3 and then 5.', lines: G.span(RANK, /RANK\(\)       OVER/) },
          { say: '`DENSE_RANK` gives tied rows the same number and does not skip: 3, 3 and then 4.', lines: G.span(RANK, /DENSE_RANK\(\)/) },
          { say: 'Run it. The two 50.00 rows get row numbers 3 and 4, rank 3 and 3, and dense rank 3 and 3. The next row, 45.00, gets row number 5, rank 5 and dense rank 4. DuckDB, PostgreSQL and SQLite gave identical numbers.', run: true }
        ]
      }),

      B.quiz({
        id: 'm6-q-rank', t: 1, q: 'In the result of the last scene, the two 50.00 rows share rank 3. What do RANK and DENSE_RANK give to the next row, 45.00?',
        opts: [
          { t: 'RANK 4 and DENSE_RANK 4', fb: 'RANK skips the places that the tie used. The tie used places 3 and 4, so the next RANK is 5.' },
          { t: 'RANK 5 and DENSE_RANK 4', fb: '' },
          { t: 'RANK 5 and DENSE_RANK 5', fb: 'DENSE_RANK never skips a number. It continues with 4.' },
          { t: 'RANK 4 and DENSE_RANK 5', fb: 'It is the other way round. RANK skips and DENSE_RANK does not.' }
        ],
        ok: 1, why: 'RANK counts the rows before the current one: four rows rank above 45.00, so it is 5th. DENSE_RANK counts the distinct revenues above it: 60, 55 and 50, so it is the 4th value.'
      }),

      B.sql({
        id: 'm6-rownum-ties', t: 2, src: 'rec', title: 'ROW_NUMBER needs a tie-breaker', file: 'rownum_ties.sql', code: RTIES, ctx: G.ctx('duckdb'),
        result: res('m6.rownum_ties', 'duckdb'),
        steps: [
          { say: 'Without a tie-breaker, `ROW_NUMBER` must still give every row a different number. The SQL standard does not say which of two tied rows gets the smaller number.' },
          { say: 'Only `revenue DESC` is in the ORDER BY. The two 50.00 rows are equal as far as the sort can tell.', lines: G.span(RTIES, /ROW_NUMBER\(\)/) },
          { say: 'Run it. DuckDB, PostgreSQL and SQLite all gave 3 to store 1 and 4 to store 2. That is a coincidence of this data and these versions, and nothing promises it. When the number decides something, such as which row to keep, add a unique column to the ORDER BY.', run: true }
        ]
      }),

      B.sql({
        id: 'm6-ntile', t: 2, src: 'rec', title: 'NTILE: buckets of equal size', file: 'ntile.sql', code: NTILE, ctx: G.ctx('duckdb'),
        result: res('m6.ntile', 'duckdb'),
        steps: [
          { say: '`NTILE(4)` deals the sorted rows into 4 buckets of nearly equal size. It is the tool for quartiles and for "top 25 percent".' },
          { say: 'Run it. Ten rows do not divide by 4. The buckets have 3, 3, 2 and 2 rows: the two extra rows went to the first two buckets. DuckDB, PostgreSQL and SQLite agreed.', run: true }
        ]
      }),

      B.sql({
        id: 'm6-rank-part', t: 1, src: 'rec', title: 'PARTITION BY restarts the ranking', file: 'rank_partition.sql', code: RPART, ctx: G.ctx('duckdb'),
        result: res('m6.rank_partition', 'duckdb'),
        steps: [
          { say: 'Rank the days of each store separately. `PARTITION BY` restarts the numbering for every store.' },
          { say: 'The window is split by `store_id`, and the days of one store are ranked by revenue.', lines: G.span(RPART, /RANK\(\) OVER/) },
          { say: 'Run it. Each store has its own 1 to 5. The best day of store 1 is 4 March (60.00). The best day of store 2 is 5 March (50.00).', run: true }
        ]
      }),

      B.sql({
        id: 'm6-lag', t: 1, src: 'rec', title: 'LAG and LEAD: look at the next door rows', file: 'lag.sql', code: LAGQ, ctx: G.ctx('duckdb'),
        result: res('m6.lag', 'duckdb'),
        steps: [
          { say: 'Compare each day with the day before. `LAG` reads a column from an earlier row of the same window. `LEAD` reads from a later row.' },
          { say: '`LAG(revenue)` is the revenue of the previous day in the same store. The ORDER BY gives "previous" its meaning.', lines: G.span(LAGQ, /LAG\(revenue\) OVER .* AS prev_revenue/) },
          { say: '`LEAD(revenue, 1, 0)` looks one row ahead. The third argument is the value to use when there is no such row.', lines: G.span(LAGQ, /LEAD\(revenue, 1, 0\)/) },
          { say: 'Run it. The first day of each store has NULL as previous revenue, so its change is NULL. Store 1 changed by 15.00, -20.00, 25.00 and -10.00. On the last day `next_revenue` is the default, 0. DuckDB prints 0.00 and PostgreSQL prints 0, because they type the default differently.', run: true }
        ]
      }),

      B.sql({
        id: 'm6-running', t: 1, src: 'rec', title: 'A running total', file: 'running.sql', code: RUNQ, ctx: G.ctx('duckdb'),
        result: res('m6.running', 'duckdb'),
        steps: [
          { say: 'A running total adds up everything so far. A `sum` with an ORDER BY inside OVER does that.' },
          { say: 'The window is the store, sorted by day. The default frame runs from the first day of the store to the current day.', lines: G.span(RUNQ, /sum\(revenue\) OVER/) },
          { say: 'Run it. Store 1 runs 40, 95, 130, 190 and 240. Store 2 runs 25, 55, 100, 120 and 170. The last value of each store is its total for the five days.', run: true }
        ]
      }),

      B.cmp({
        id: 'm6-frames-cmp', t: 2, src: 'docs', title: 'Three kinds of frame',
        say: 'A frame says which rows of the window the function may read. Press Next for each kind.',
        cols: ['Kind', 'It counts', '1 PRECEDING means', 'Peers (equal ORDER BY values)'],
        hl: 1,
        rows: [
          ['ROWS', 'Physical rows', 'The one row before this row', 'Not special: each row is its own row'],
          ['RANGE', 'Values of the ORDER BY column', 'Rows whose value is within the distance below this row (with one numeric or date ORDER BY column)', 'Always in the frame together'],
          ['GROUPS', 'Groups of peers', 'The whole group of peers before this row', 'Always in the frame together'],
          ['Default', 'With ORDER BY: RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW', 'Without ORDER BY: the whole partition', 'A running total treats peers as one step']
        ],
        steps: [
          { upto: 1, say: 'ROWS is the simple one. It counts rows, and it is the safe choice for a running total or a moving average by row.' },
          { upto: 2, say: 'RANGE counts values. `RANGE BETWEEN 10 PRECEDING AND CURRENT ROW` on revenue means every row within 10 below the current revenue, however many rows that is.' },
          { upto: 3, say: 'GROUPS counts the groups of equal values. It exists in PostgreSQL 11 and later, DuckDB and SQLite 3.28 and later.' },
          { upto: 4, say: 'The default is RANGE up to the current row when you give an ORDER BY. That is why tied rows share one running total.' }
        ],
        pick: 'Write the frame yourself. ROWS for running totals and moving averages by row, RANGE when the distance is in values such as days or euros.'
      }),

      B.widget({ id: 'm6-lab-frame', kind: 'frame', t: 2, src: 'rec', title: 'Lab: pick a frame, see its rows' }),

      B.sql({
        id: 'm6-running-ties', t: 2, src: 'rec', title: 'The default frame and ties', file: 'running_ties.sql', code: RTYQ, ctx: G.ctx('duckdb'),
        result: res('m6.running_ties', 'duckdb'),
        steps: [
          { say: 'Both columns look like running totals of the revenue. They differ when two rows have the same revenue.' },
          { say: '`default_frame` has an ORDER BY and no frame. The default is RANGE, so a row that ties with the current row is inside the frame.', lines: G.span(RTYQ, /AS default_frame/) },
          { say: '`rows_frame` says ROWS and adds `store_id` as a tie-breaker. Now the frame ends at the row itself.', lines: G.span(RTYQ, /ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\) AS rows_frame/) },
          { say: 'Run it. At the two 50.00 rows `default_frame` shows 295.00 twice. `rows_frame` shows 245.00 and then 295.00. For a total that grows with every row, use ROWS and a unique ORDER BY. DuckDB, PostgreSQL and SQLite agreed.', run: true }
        ]
      }),

      B.sql({
        id: 'm6-moving', t: 2, src: 'rec', title: 'A moving average', file: 'moving.sql', code: MOVQ, ctx: G.ctx('duckdb'),
        result: res('m6.moving', 'duckdb'),
        steps: [
          { say: 'A moving average smooths a series. The frame is the current day and the two days before it.' },
          { say: '`ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` is the frame. It holds 3 rows at most.', lines: G.span(MOVQ, /avg\(revenue\)/) },
          { say: 'The count of rows in the frame shows what happens at the start of each store.', lines: G.span(MOVQ, /count\(\*\)/) },
          { say: 'Run it. Store 1 shows 40.0, 47.5, 43.33, 50.0 and 48.33. The first day has a frame of 1 row and the second a frame of 2, so those averages use fewer days. A report that needs a full window must drop them. PostgreSQL printed 40.00 and 47.50, with two decimals. The values are the same.', run: true }
        ]
      }),

      B.sql({
        id: 'm6-last-value', t: 2, src: 'rec', title: 'FIRST_VALUE, LAST_VALUE and the frame', file: 'last_value.sql', code: LASTQ, ctx: G.ctx('duckdb'),
        result: res('m6.last_value', 'duckdb'),
        steps: [
          { say: '`FIRST_VALUE` and `LAST_VALUE` read the first and the last row of the frame. The default frame stops at the current row, and that catches people out.' },
          { say: 'The first row of the frame is the first day of the store, so `first_day` works as expected.', lines: G.span(LASTQ, /AS first_day/) },
          { say: 'The last row of the default frame is the current row. `last_default` just repeats the revenue of the row.', lines: G.span(LASTQ, /AS last_default/) },
          { say: 'Extend the frame to `UNBOUNDED FOLLOWING` to reach the last day of the store.', lines: G.span(LASTQ, /LAST_VALUE\(revenue\) OVER \(PARTITION BY store_id ORDER BY day$/, /AS last_full/) },
          { say: 'Run it. `last_default` equals `revenue` on every row. `last_full` is 50.00 on every row: the revenue of 5 March, the last day of both stores. DuckDB, PostgreSQL and SQLite agreed.', run: true }
        ]
      }),

      B.sql({
        id: 'm6-share', t: 1, src: 'rec', title: 'A window over aggregates: the share of revenue', file: 'share.sql', code: SHAREQ, ctx: G.ctx('duckdb'),
        result: res('m6.share', 'duckdb'),
        steps: [
          { say: 'In mission 5 you wrote the share of revenue with a CTE that was read twice. A window function does it in one query.' },
          { say: '`sum(total)` is the revenue of each store. `sum(sum(total)) OVER ()` adds those store totals up again. It works because the window runs after GROUP BY and sees one row for each store.', lines: G.span(SHAREQ, /sum\(sum\(total\)\) OVER/) },
          { say: 'Run it. Store 1 has 64.6 percent, store 4 has 24.0 and store 2 has 11.4: the same numbers as the CTE of mission 5.', run: true }
        ]
      }),

      B.sql({
        id: 'm6-named', t: 2, src: 'rec', title: 'A named window', file: 'named_window.sql', code: NAMEDQ, ctx: G.ctx('duckdb'),
        result: res('m6.named_window', 'duckdb'),
        steps: [
          { say: 'Two functions with the same window repeat the same OVER clause. A `WINDOW` clause names it once.' },
          { say: '`WINDOW w AS (...)` defines the window after HAVING. Each function then says `OVER w`.', lines: G.span(NAMEDQ, /^WINDOW w AS/) },
          { say: 'Run it. `running` is the running total and `best_so_far` is the biggest revenue so far in the store. DuckDB, PostgreSQL and SQLite all accepted the clause.', run: true }
        ]
      }),

      B.bug({
        id: 'm6-bug-where', t: 1, title: 'Bug hunt: the three biggest orders',
        q: 'A report should show the 3 biggest orders. The engines refuse the query. DuckDB: "' + WE.duckdb + '" PostgreSQL: "' + WE.postgres + '" SQLite: "' + WE.sqlite + '". Click the line that causes it.',
        file: 'top3.sql', lang: 'sql',
        code: G.file('m6.where_error'), bad: [3], hint: 'Which clause runs before the window function exists?',
        why: 'WHERE runs before window functions, so the row number does not exist yet at that point. Compute the number in a CTE or a subquery, and filter in the outer query. DuckDB also has QUALIFY for this.',
        fix: ['WITH ranked AS (', '  SELECT order_id, total, ROW_NUMBER() OVER (ORDER BY total DESC) AS rn', '  FROM orders', ')', 'SELECT order_id, total', 'FROM ranked', 'WHERE rn <= 3;'].join('\n'),
        cheer: 'Rank first, filter second.'
      }),

      B.sql({
        id: 'm6-top3', t: 1, src: 'rec', title: 'Filter on a window function with a CTE', file: 'top3.sql', code: TOP3Q, ctx: G.ctx('duckdb'),
        result: res('m6.top3_cte', 'duckdb'),
        steps: [
          { say: 'The fix has two steps. A CTE computes the row number. The outer query filters on it.' },
          { say: 'The outer WHERE can use `rn`, because by now the window function has run inside the CTE.', lines: G.span(TOP3Q, /^WHERE rn <= 3/) },
          { say: 'Run it. The three biggest paid orders are 1004 (26.00), 1010 (19.00) and 1002 (18.50). This form runs on DuckDB, PostgreSQL and SQLite.', run: true }
        ]
      }),

      B.sql({
        id: 'm6-qualify', t: 2, src: 'rec', title: 'QUALIFY: a filter for window functions', file: 'qualify.sql', code: QUALQ, ctx: G.ctx('duckdb'),
        result: res('m6.qualify', 'duckdb'),
        steps: [
          { say: 'DuckDB has a clause that filters on window functions: `QUALIFY`. It runs after the window functions, in the way HAVING runs after GROUP BY.' },
          { say: 'The condition uses the window function directly. No CTE is needed.', lines: G.span(QUALQ, /^QUALIFY/) },
          { say: 'Run it on DuckDB. The same three orders. PostgreSQL stops with: ' + QE.postgres + '. SQLite stops with: ' + QE.sqlite + '. When a query has to run on more than one engine, use the CTE form.', run: true }
        ],
        note: 'Some warehouses, such as Snowflake and BigQuery, also support QUALIFY. That comes from their documentation. It was not run here.'
      }),

      B.quiz({
        id: 'm6-q-over', t: 1, q: 'A table has 9 paid orders. How many rows does `SELECT order_id, sum(total) OVER () FROM orders WHERE status = \'paid\'` return?',
        opts: [
          { t: '1, the total of all orders', fb: 'That is what an aggregate without OVER does. A window function keeps the rows.' },
          { t: '3, one for each store', fb: 'There is no PARTITION BY or GROUP BY here, and a window function does not collapse rows anyway.' },
          { t: '9, one for each paid order', fb: '' },
          { t: 'An error, because sum needs GROUP BY', fb: 'sum is allowed as a window function. OVER makes it one.' }
        ],
        ok: 2, why: 'A window function adds a column and keeps every row. With an empty OVER () the sum covers all the rows, and every row shows the same total: 127.00.'
      }),

      B.quiz({
        id: 'm6-q-frame', t: 2, q: 'A window has ORDER BY day and no frame clause. Which frame does it use?',
        opts: [
          { t: 'The whole partition', fb: 'That is the default when there is no ORDER BY.' },
          { t: 'Only the current row', fb: 'Then a running total could not exist.' },
          { t: 'The first row of the partition up to the current row and its peers', fb: '' },
          { t: 'The previous row and the current row', fb: 'You have to ask for that with ROWS BETWEEN 1 PRECEDING AND CURRENT ROW.' }
        ],
        ok: 2, why: 'With an ORDER BY the default frame is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW. It includes the rows that tie with the current row, which is why tied rows share a running total.'
      }),

      B.bug({
        id: 'm6-bug-last', t: 2, title: 'Bug hunt: the closing revenue that repeats',
        q: 'A report should show next to every day the revenue of the last day of its store. The column `closing_revenue` repeats the revenue of each row instead. Click the line that causes it.',
        file: 'closing.sql', lang: 'sql',
        code: ['SELECT store_id, day, revenue,', '       LAST_VALUE(revenue) OVER (PARTITION BY store_id ORDER BY day) AS closing_revenue', 'FROM daily_revenue', 'ORDER BY store_id, day;'].join('\n'),
        bad: [2], hint: 'Where does the default frame end?',
        why: 'With an ORDER BY the default frame ends at the current row, so the last row of the frame is the current row. Extend the frame to UNBOUNDED FOLLOWING, or use FIRST_VALUE with the reverse order.',
        fix: ['SELECT store_id, day, revenue,', '       LAST_VALUE(revenue) OVER (PARTITION BY store_id ORDER BY day', '                                 ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS closing_revenue', 'FROM daily_revenue', 'ORDER BY store_id, day;'].join('\n'),
        cheer: 'Whenever you use LAST_VALUE, write the frame.'
      }),

      B.code({
        id: 'm6-plan', t: 3, src: 'rec', title: 'A window function in the plan', file: 'EXPLAIN (ANALYZE) on PostgreSQL ' + G.meta('postgres') + ' and DuckDB ' + G.meta('duckdb'), lang: 'text', code: PLAN_WIN,
        steps: [
          { say: 'Number the orders of each customer by time, on 30,000 orders. The first lines show the query. The plans come from EXPLAIN with ANALYZE, so the row counts are real.' },
          { say: 'PostgreSQL scans the table, sorts all 30,000 rows by `customer_id, order_ts` (a quicksort in memory), and the `WindowAgg` node numbers them. The sort is what PARTITION BY plus ORDER BY costs.', lines: G.span(PLAN_WIN, /^WindowAgg/, /Seq Scan on big_orders/) },
          { say: 'With an index on `(customer_id, order_ts)` the rows already arrive in that order. An `Index Scan` feeds the `WindowAgg` and the plan has no Sort node.', lines: G.span(PLAN_WIN, /after CREATE INDEX/, /Index Scan using big_orders_cust_ts/) },
          { say: 'DuckDB uses one `WINDOW` operator that reads 30,000 rows from the scan and writes 30,000 rows.', lines: G.span(PLAN_WIN, /^WINDOW row_number/, /SCAN big_orders/) }
        ],
        note: 'The plans show shapes and row counts. Times are not recorded. One query on one version of each engine: another version may choose another plan.'
      }),

      B.challenge({
        id: 'm6-ch-share', t: 1, title: 'Coding round: the share of each order in its store', file: 'order_share.sql', lang: 'sql',
        q: 'Return every **paid order with its percent of the paid revenue of its own store**, rounded to 1 decimal, as `store_share`: order id, store, total and `store_share`, in order id order. Use a window function.',
        data: [{ name: 'orders (4 columns)', cols: G.cols('data.orders', ['order_id', 'store_id', 'status', 'total']).cols, rows: G.cols('data.orders', ['order_id', 'store_id', 'status', 'total']).rows, types: ['INTEGER', 'INTEGER', 'VARCHAR', 'DECIMAL(10,2)'] }],
        starter: '-- every paid order with its share of the store\nSELECT ...',
        hints: ['The total of the store is a sum over the rows of the same store.', '`sum(total) OVER (PARTITION BY store_id)` repeats that sum on every row.', 'Multiply by 100.0, divide by the store sum, then round.'],
        sol: G.file('m6.ch_share'),
        res: res('m6.ch_share', 'duckdb'),
        expl: ['`sum(total) OVER (PARTITION BY store_id)` puts the paid revenue of the store on every order, without collapsing the orders.', 'Order 1004 is 26.00 of the 82.00 of store 1: 31.7 percent.', 'The shares of one store add up to 100. Store 2 has two orders: 34.5 and 65.5.'],
        cx: 'One pass over the paid orders, plus a partition by store. The window reads each row once.'
      }),

      B.challenge({
        id: 'm6-ch-drop', t: 2, title: 'Coding round: the days when a store dropped', file: 'drops.sql', lang: 'sql',
        q: 'Return the **days when the revenue of a store was lower than on the previous day of the same store**: store, day, revenue and `prev_revenue`, in store and day order.',
        data: [{ name: 'daily_revenue', cols: G.table('data.daily_revenue').cols, rows: G.table('data.daily_revenue').rows, types: ['DATE', 'INTEGER', 'DECIMAL(10,2)'] }],
        starter: '-- days when the revenue fell\nWITH d AS (\n  SELECT ...\n)\nSELECT ...',
        hints: ['`LAG(revenue)` gives the revenue of the previous day.', 'LAG needs `PARTITION BY store_id ORDER BY day`.', 'You cannot filter on LAG in WHERE. Use a CTE.'],
        sol: G.file('m6.ch_drop'),
        res: res('m6.ch_drop', 'duckdb'),
        expl: ['`LAG(revenue) OVER (PARTITION BY store_id ORDER BY day)` is the revenue of the previous day of the same store.', 'A CTE computes it, and the outer query filters with an ordinary WHERE.', 'Three drops: store 1 on 3 March (55.00 to 35.00) and 5 March (60.00 to 50.00), store 2 on 4 March (45.00 to 20.00). The first day of a store has a NULL previous revenue. The comparison with NULL is not true, so that row is not returned.'],
        cx: 'One sort by store and day, then a single pass.'
      }),

      B.challenge({
        id: 'm6-ch-third', t: 2, title: 'Coding round: the third highest revenue, with ties', file: 'third_highest.sql', lang: 'sql',
        q: 'Return the **days that hold the third highest revenue** among all stores and days, ties included: day, store and revenue, ordered by store.',
        data: [{ name: 'daily_revenue', cols: G.table('data.daily_revenue').cols, rows: G.table('data.daily_revenue').rows, types: ['DATE', 'INTEGER', 'DECIMAL(10,2)'] }],
        starter: '-- the days with the third highest revenue\nWITH r AS (\n  SELECT ...\n)\nSELECT ...',
        hints: ['Rank all the days by revenue, highest first.', 'A function that gives tied rows the same number returns both.', 'Filter on the rank in the outer query.'],
        sol: G.file('m6.ch_third'),
        res: res('m6.ch_third', 'duckdb'),
        expl: ['`RANK() OVER (ORDER BY revenue DESC)` gives both 50.00 rows the number 3.', '`ROW_NUMBER() = 3` would return only one of the two, and which one is not fixed.', '`DENSE_RANK() = 3` means the third highest distinct value. Here it returns the same two rows. Pick RANK when the question is about the place, and DENSE_RANK when it is about the distinct values.'],
        cx: 'One sort of all rows by revenue, then a single pass.'
      }),

      B.decide({
        id: 'm6-dec-rank', t: 2, title: 'Decision: which function builds the top 3 of a leaderboard?',
        scenario: 'A board shows the 3 best stores of each day by revenue. The rule says: never more than 3 stores, unless stores tie for the third place, and then all of them appear. Ties happen about once a week. Which function do you filter on?',
        opts: [
          { t: 'ROW_NUMBER() <= 3', d: 'Always exactly 3 rows for each day.', lose: 'When two stores tie for the third place, one of them is cut, and which one depends on how the engine breaks the tie.' },
          { t: 'DENSE_RANK() <= 3', d: 'The top 3 distinct revenues.', lose: 'When two stores tie for the first place, the board shows 4 stores, which breaks the rule of 3.' },
          { t: 'RANK() <= 3', d: 'Ties share a place, and the places after a tie are skipped.', lose: '' },
          { t: 'NTILE(3) = 1', d: 'The first bucket of a split into three.', lose: 'NTILE splits all the stores into three equal groups. It does not pick the top 3.' }
        ],
        pick: 2,
        why: 'RANK gives tied stores the same place and skips the places they use. Two stores tied for third both get 3 and appear. Two stores tied for first get 1, 1 and then 3, so the board shows 3 stores. ROW_NUMBER cuts a tied store at random and DENSE_RANK can show 4.',
        when: 'If the board must always show exactly 3 stores, use ROW_NUMBER with a tie-breaker that the business agrees with, such as the store with the older opening date.'
      }),

      B.incident({
        id: 'm6-inc-run', t: 2, time: '11:05',
        alert: 'The finance dashboard shows a cumulative revenue line with flat steps. On busy days two orders carry the same second in `order_ts`, and their running totals are identical. Finance says the line must grow with every order. The query is `sum(total) OVER (ORDER BY order_ts)`.',
        clues: ['The ORDER BY column is not unique.', 'The window has no frame clause.', 'Only the rows that tie are wrong. The rest of the line is correct.'],
        opts: [
          { t: 'Round the timestamps to the minute', fb: 'That creates more ties, not fewer.' },
          { t: 'Add a unique tie-breaker to the ORDER BY and write the frame as ROWS', fb: '' },
          { t: 'Add DISTINCT to the result', fb: 'The rows are different orders with different ids. DISTINCT does not change the totals.' },
          { t: 'Compute the totals in the dashboard tool', fb: 'It moves the problem to a tool that has to sort and sum as well, and the definition of the total drifts away from the database.' }
        ],
        best: 1,
        why: 'The default frame is RANGE up to the current row, and it includes the rows that tie with it. Two orders with the same timestamp are peers and get the same total. In the recording, two rows with revenue 50.00 both showed 295.00 with the default frame, and 245.00 then 295.00 with ROWS and a tie-breaker.',
        checks: [['Find the ties', 'Group by `order_ts` and look for counts above 1.'], ['Compare the two frames', 'Run the sum with and without `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` on the tied rows.'], ['Pick a unique tie-breaker', '`order_id` works if ids never repeat.'], ['Add a test', 'A check that the last running total equals the plain sum.']],
        tell: 'The cumulative line had flat steps where two orders shared a timestamp. The window had no frame, so it used the default RANGE frame, which includes rows that tie with the current row. I added order_id to the ORDER BY as a tie-breaker and wrote ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW. Then I added a check that the last running total equals the plain sum.',
        prevent: ['Write the frame in every window that has an ORDER BY.', 'Always end an ORDER BY inside OVER with a unique column when the order matters.', 'Check that the last running total equals the plain sum.']
      }),

      B.qa({
        id: 'qa-window-group', t: 1, tag: 'Windows', secs: 60,
        q: 'What is the difference between GROUP BY and a window function?',
        pts: ['GROUP BY collapses rows', 'A window keeps every row', 'A window adds a column', 'They can be combined'],
        short: 'GROUP BY collapses the rows of each group into one row, so you can show only the grouping columns and aggregates. A window function computes the same kind of value but keeps every row and puts the result in a new column. That lets me show an order next to the total of its store, or the share of the order in that total. On the course data, 9 paid orders grouped by store gave 3 rows, and the window version kept 9 rows with the store total on each. They combine well: a window runs after GROUP BY, so it can work over the aggregated rows, such as a share of the total revenue.',
        fu: [['Where in the query order does a window function run?', 'After WHERE, GROUP BY and HAVING, and before DISTINCT, ORDER BY and LIMIT. That is why you cannot filter on one in WHERE.']],
        trap: 'Using a window function when a plain GROUP BY is enough.',
        real: 'Tell about a report where you needed the detail rows and a group total side by side.'
      }),

      B.qa({
        id: 'qa-rank-fns', t: 1, tag: 'Windows', secs: 60,
        q: 'ROW_NUMBER, RANK and DENSE_RANK: how do they differ?',
        pts: ['All number rows by an order', 'ROW_NUMBER never repeats', 'RANK repeats and skips', 'DENSE_RANK repeats and does not skip'],
        short: 'All three number the rows of a window by an ORDER BY. They differ on ties. ROW_NUMBER never repeats a number, so tied rows get different numbers in an order that is not guaranteed unless I add a tie-breaker. RANK gives tied rows the same number and then skips. DENSE_RANK gives tied rows the same number and does not skip. In my test two days tied at 50.00: row numbers 3 and 4, rank 3 and 3, dense rank 3 and 3, and the next day got row number 5, rank 5 and dense rank 4. I use ROW_NUMBER to keep one row per group, RANK for places with shared positions, and DENSE_RANK for the nth distinct value.',
        fu: [['Which one do you use for the top 3 with ties?', 'RANK <= 3, because tied rows share a place and the rule of 3 holds. ROW_NUMBER would cut a tied row at random.']],
        trap: 'Using ROW_NUMBER without a tie-breaker and trusting the order of tied rows.',
        real: 'Tell about a ranking where a tie changed the answer.'
      }),

      B.qa({
        id: 'qa-lag-lead', t: 1, tag: 'Windows', secs: 60,
        q: 'When do you use LAG and LEAD?',
        pts: ['Compare a row with a neighbor', 'LAG looks back, LEAD looks ahead', 'ORDER BY gives the meaning', 'First or last row is NULL or a default'],
        short: 'LAG reads a column from an earlier row of the same window and LEAD from a later one. I use them to compare a row with its neighbor: the change from the previous day, the time since the last event, or the next price. PARTITION BY keeps the neighbors inside one group, such as one store, and the ORDER BY gives "previous" its meaning. The first row has no previous row, so LAG returns NULL there unless I pass a default as the third argument. On the course data the first day of every store had a NULL change, and the three drops were found by filtering on LAG in a CTE.',
        fu: [['Why do you need a CTE to filter on LAG?', 'A window function cannot be used in WHERE, because WHERE runs first. The CTE computes it and the outer query filters.']],
        trap: 'Forgetting that the first row of each partition has no previous row.',
        real: 'Tell about a metric you computed with LAG, such as day over day change.'
      }),

      B.qa({
        id: 'qa-filter-window', t: 1, tag: 'Windows', secs: 60,
        q: 'How do you filter on the result of a window function?',
        pts: ['WHERE cannot see it', 'Compute it in a CTE or subquery', 'Filter in the outer query', 'QUALIFY exists on some engines'],
        short: 'WHERE runs before window functions, so the engines refuse it: DuckDB says the WHERE clause cannot contain window functions, PostgreSQL says they are not allowed in WHERE and SQLite says misuse of window function. I compute the window function in a CTE or a subquery and filter in the outer query. That form runs everywhere. DuckDB, Snowflake and BigQuery also have QUALIFY, which filters after the window functions in the same query. PostgreSQL and SQLite do not have it: they raised a syntax error in my test. For the top 3 orders I used ROW_NUMBER in a CTE and WHERE rn <= 3 outside.',
        fu: [['What about a window function in HAVING?', 'It is not allowed either. HAVING runs before the windows. Use a CTE or QUALIFY.']],
        trap: 'Writing a window function in WHERE and reading the error as a missing parenthesis.',
        real: 'Tell about a top N per group query you wrote.'
      }),

      B.qa({
        id: 'qa-frames', t: 2, tag: 'Windows', secs: 60,
        q: 'What are ROWS, RANGE and GROUPS frames, and what is the default?',
        pts: ['A frame is the rows the function sees', 'ROWS counts rows', 'RANGE counts values and includes peers', 'GROUPS counts groups of peers', 'Default with ORDER BY: RANGE up to current row'],
        short: 'The frame is the set of rows of the partition that the function reads for the current row. ROWS counts physical rows, so 1 PRECEDING is the row before. RANGE counts values of the ORDER BY column, so 10 PRECEDING means rows within 10 below, and rows that tie are always together. GROUPS counts groups of ties, so 1 PRECEDING is the previous group. With an ORDER BY and no frame the default is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW, and without ORDER BY it is the whole partition. I run all three on the same ten values in the lab. DuckDB, PostgreSQL and SQLite gave the same sums for all 27 combinations I tried.',
        fu: [['When do the three kinds differ?', 'Only when the ORDER BY values tie, or when you use a numeric offset with RANGE. Without ties ROWS and GROUPS give the same frames.']],
        trap: 'Assuming that the default frame is the whole partition when there is an ORDER BY.',
        real: 'Tell about a running total or moving average that you wrote with an explicit frame.'
      }),

      B.qa({
        id: 'qa-running', t: 2, tag: 'Windows', secs: 60,
        q: 'How do you write a running total, and what can go wrong?',
        pts: ['sum over an ordered window', 'Partition for one total for each group', 'ROWS frame for a row by row total', 'Ties in the ORDER BY with the default frame'],
        short: 'sum(x) OVER (PARTITION BY g ORDER BY d ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW). The partition restarts the total for each group, the order says what comes first, and the ROWS frame makes the total grow with every row. The default frame is RANGE, which includes rows that tie with the current row. In my test two days with revenue 50.00 both showed 295.00 with the default frame, and 245.00 then 295.00 with ROWS and a tie-breaker in the ORDER BY. So I write the frame, and I end the ORDER BY with a unique column. As a check, the last running total of each group must equal the plain sum of the group.',
        fu: [['How do you make a 7 day moving average?', 'avg(x) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), and I drop the first 6 rows if I need full windows.']],
        trap: 'A non-unique ORDER BY with the default frame.',
        real: 'Tell about a cumulative metric you built and how you checked it.'
      }),

      B.qa({
        id: 'qa-last-value', t: 2, tag: 'Windows', secs: 60,
        q: 'Why does LAST_VALUE return the current row, and how do you fix it?',
        pts: ['The default frame ends at the current row', 'LAST_VALUE reads the last row of the frame', 'Extend the frame to UNBOUNDED FOLLOWING', 'Or FIRST_VALUE with the reverse order'],
        short: 'FIRST_VALUE and LAST_VALUE read the first and the last row of the frame, not of the partition. With an ORDER BY the default frame ends at the current row, so the last row of the frame is the current row and LAST_VALUE repeats the value of the row. In my test the column was equal to revenue on all 10 rows. The fix is to extend the frame: ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING gave 50.00 on every row, the revenue of the last day. Another way is FIRST_VALUE with the opposite ORDER BY. FIRST_VALUE does not have the problem, because the default frame always starts at the first row.',
        fu: [['What does NTH_VALUE do with the same frame?', 'It reads the nth row of the frame, so it has the same limit. Extend the frame if the row lies below the current one.']],
        trap: 'Using LAST_VALUE without a frame.',
        real: 'Tell about a first or last value per group that you needed.'
      }),

      B.qa({
        id: 'qa-window-cost', t: 3, tag: 'Windows', secs: 60,
        q: 'What does a window function cost, and how do you speed it up?',
        pts: ['It needs rows sorted by partition and order', 'A sort of all rows is the main cost', 'An index in that order can avoid the sort', 'Read the plan'],
        short: 'A window with PARTITION BY and ORDER BY needs the rows sorted by the partition columns and then the order columns, so the main cost is a sort of all the input rows. In my plan on 30,000 orders, PostgreSQL scanned the table, sorted 30,000 rows with a quicksort in memory, and a WindowAgg node numbered them. With an index on (customer_id, order_ts) the plan had an Index Scan feeding the WindowAgg and no Sort node. DuckDB used one WINDOW operator. To speed it up I filter early so that fewer rows reach the window, use one window definition for several functions, and check whether an index matches the partition and order.',
        fu: [['Does an index always remove the sort?', 'No. The planner chooses by cost. In my test it did use the index. On another version or with other statistics it may sort anyway, so I read the plan.']],
        trap: 'Adding several windows with different PARTITION BY and ORDER BY and not noticing that each one sorts again.',
        real: 'Tell about a window query you made faster, and what the plan showed.'
      }),

      B.recap({
        id: 'm6-recap', n: 6, badge: 'Window Watcher', color: '#BAE6FD',
        pts: [
          'A **window function** adds a value computed over related rows and **keeps every row**. GROUP BY collapses them.',
          '`OVER (PARTITION BY ... ORDER BY ... frame)`. A window runs **after WHERE, GROUP BY and HAVING**.',
          '**ROW_NUMBER** never repeats, **RANK** repeats and skips, **DENSE_RANK** repeats and does not skip. End the ORDER BY with a unique column when the order decides something.',
          '**LAG** and **LEAD** read a neighbor row. The first or last row gives NULL or the default you pass.',
          'With an ORDER BY the default frame is **RANGE up to the current row**, and peers share a running total. Write **ROWS** for a row by row total. LAST_VALUE needs a frame to UNBOUNDED FOLLOWING.',
          'Filter on a window function in a **CTE** or with QUALIFY on DuckDB. A window with PARTITION BY and ORDER BY **sorts**, unless an index already gives that order.'
        ],
        lines: [
          'I write the frame, and I end the ORDER BY of a window with a unique column.',
          'To keep one row for each group I rank in a CTE and filter outside.',
          'A window over aggregates gives the share of a total in one query.'
        ]
      })
    ]
  });
})();
