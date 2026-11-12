/* Mission 14: drills that mix missions, the coding rounds, the boss round of interview questions and a one-page review.
   The numbers in the review come from the recordings of the earlier missions. They are read from the recording below, so a new recording that changes one of them fails the lint.
   Items marked (docs) come from documentation and were not run. Nothing here ran on a cloud warehouse. */
(function () {
  var B = LAB.b, G = LAB.get;

  /* Boss round: the interview questions of the earlier missions. The first two of tier 1 and every tier 2 question of each mission, in mission order,
     at most five for each mission. Tier 1 is the junior path, tier 2 adds the senior questions, tier 3 adds the rest. */
  var IDS = [], TIERS = [];
  LAB.chapters.forEach(function (ch) {
    if (ch.id === 'm14') return;
    var qs = [];
    ch.scenes.forEach(function (sc) { if (sc.type === 'qa') qs.push(sc); });
    qs.sort(function (a, b) { return a.t - b.t; });
    qs.filter(function (q) { return q.t <= 2; }).slice(0, 5).forEach(function (q) { IDS.push(q.id); TIERS.push(q.t); });
    var third = qs.filter(function (q) { return q.t === 3; })[0];
    if (third) { IDS.push(third.id); TIERS.push(3); }
  });

  function num(n, d) { return Number(n).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  var JT = {}; G.counts('m3.jointypes').types.forEach(function (t) { JT[t.type] = t.rows.duckdb; });
  var FS = G.on('m3.fanout_sum', 'duckdb').rows, DT = G.table('m3.distinct_trap').rows[0], AA = G.table('m4.avg_of_avgs').rows[0], AP = G.table('m4.approx').rows[0];
  var CY = G.on('m5.cycle_union_all', 'duckdb').rows[0], CORR = G.text('m5.plan.pg_corr_noindex'), RTY = G.on('m6.running_ties', 'duckdb').rows, FR = G.counts('m6.frames');
  var TZD = G.on('m7.tz_day', 'duckdb').rows, PLF = G.text('m7.plan.pg_func'), RAW = G.on('m8.raw_sum', 'duckdb').rows[0], DEDT = G.on('m8.dedupe_total', 'duckdb').rows[0], SL = G.counts('m8.sessions_lab'), FUN = G.on('m8.funnel', 'duckdb').rows[0];
  var APP = G.on('m9.append_twice', 'duckdb').rows[0], UPS = G.on('m9.upsert_twice', 'duckdb').rows[0], DIS = G.on('m9.distinct_from', 'duckdb').rows.length, NEQ = G.on('m9.not_equal', 'duckdb').rows.length, SCD = G.on('m9.scd2', 'duckdb').rows.length;
  var TRN = G.counts('m10.transfer'), ISO = G.counts('m10.lab').runs, DL = G.counts('m10.deadlock');
  var PL = G.counts('m11.lab').lab, ES = G.counts('m11.estimates'), PGN = G.counts('m11.pagination');
  var FAN = G.on('m12.fanout', 'duckdb').rows[0], GRO = G.on('m12.grain_order', 'duckdb').rows[0][0], GRL = G.on('m12.grain_line', 'duckdb').rows[0][0], REC = G.on('m12.reconcile', 'duckdb').rows[0];
  var DQ = G.on('m13.dq', 'duckdb').rows, CBUG = G.on('m13.dq_count_bug', 'duckdb').rows[0][0], CRIGHT = G.on('m13.dq_count_right', 'duckdb').rows[0][0], TR = G.counts('m13.translate').results;
  var D1 = G.on('m14.d_tier', 'duckdb'), D2 = G.on('m14.d_bestday', 'duckdb'), D3 = G.on('m14.d_span', 'duckdb');
  function pagesOf(sc, d) { return PL[sc].runs[d].buffers.match(/shared hit=(\d+)/)[1]; }

  G.expect(IDS.length > 60 && IDS.length === TIERS.length && IDS.indexOf('qa-dedupe') >= 0, 'the boss round has more than 60 questions from the earlier missions');
  G.expect(JT.INNER === 11 && JT.LEFT === 13 && JT.RIGHT === 12 && JT.FULL === 14 && JT.CROSS === 96 && FS[0][2] === '127.00' && FS[1][2] === '145.50' && DT[2] === '267.00' && AA[0] === '12.97' && AA[1] === '14.11' && AP[0] === '3000' && AP[1] === '2999', 'the numbers of missions 3 and 4');
  G.expect(CY.join() === '61,20' && /loops=3000/.test(CORR) && RTY[6].slice(3).join() === '295.00,245.00' && FR.combos && Object.keys(FR.combos).length === 27, 'the numbers of missions 5 and 6');
  G.expect(TZD.length === 3 && /Rows Removed by Filter: 29669/.test(PLF) && RAW.join() === '9,5,135.00' && DEDT.join() === '5,70.00' && SL.combos['30'].sessions.length === 8 && FUN.join() === '8,8,5,4,3', 'the numbers of missions 7 and 8');
  G.expect(APP.join() === '20,820.00' && UPS.join() === '11,456.50' && DIS === 2 && NEQ === 1 && SCD === 7 && TRN.autocommit.total_after === '300' && TRN.transaction.total_after === '150' && DL.victim === 'A', 'the numbers of missions 9 and 10');
  G.expect(PL.point.runs.none.rows_read === 30000 && PL.point.runs.order_id.rows_read === 1 && PL.paid.runs.status.scan === 'Seq Scan' && pagesOf('range', 'store_ts') === '40' && pagesOf('range', 'ts_store') === '47' && /estimated rows=150\)/.test(ES.expr_before) && /actual rows=20020/.test(PGN.offset), 'the numbers of mission 11');
  G.expect(FAN.join() === '127.00,228.00' && GRO === '12' && GRL === '19' && REC.join() === '156.00,156.00,0' && DQ.length === 11 && DQ.filter(function (r) { return r[1] !== '0'; }).length === 4 && CBUG === '0' && CRIGHT === '1' && TR.trycast.targets.sqlite.ran === 'different' && TR.trycast.targets.postgres.ran === 'error', 'the numbers of missions 12 and 13');
  G.expect(D1.rows.map(function (r) { return r.join(); }).join(';') === 'gold,5,67.50;none,3,54.50;silver,1,5.00' && D2.rows[0].join() === '1,2026-03-04,60.00,25.0' && D2.rows[1].join() === '2,2026-03-05,50.00,29.4' && D3.rows.map(function (r) { return r[2]; }).join() === '4,7,5,4', 'the coding rounds');
  var ISOR = ['nonrep', 'phantom', 'lost', 'skew'].map(function (s) { return ISO[s + '|read committed'].anomaly; });
  G.expect(ISOR.join() === 'true,true,true,true' && ISO['skew|repeatable read'].anomaly && !ISO['skew|serializable'].anomaly, 'read committed allowed all four problems, repeatable read still allowed write skew, and serializable stopped it');

  var TIER = G.cols('data.orders', ['order_id', 'customer_id', 'status', 'total']), CUST = G.cols('data.customers', ['customer_id', 'tier']);
  function res(key, e) { var t = e ? G.on(key, e) : G.table(key); return { msg: t.rows.length + ' rows', cols: t.cols, rows: t.rows }; }

  LAB.addChapter({
    id: 'm14', n: 14, title: 'Boss round and cheat sheet', short: 'Boss round', blurb: 'Coding rounds that mix topics, a decision, an incident, a mock interview and a one-page review', minutes: 60,
    focus: ['src', 'stg', 'int', 'mart', 'con', 'sf', 'air', 'mon', 'qual', 'snap', 'ci'],
    goals: [
      'Solve **coding rounds** that combine several missions, and say the grain before you write.',
      'Take a **first move** in a decision and an incident that touch several missions.',
      'Answer a **mock interview round** against a timer, and grade yourself honestly.',
      'Keep a **one-page review** of the numbers and rules, with their sources.'
    ],
    say: 'This is the last mission. Three coding rounds that mix topics, then a decision and an incident, then the boss round: real interview questions with no notes. Grade yourself honestly. Honest grades make the scorecard worth reading. The review at the end lists the numbers from the recordings, so you can say them with confidence.',
    scenes: [
      B.challenge({
        id: 'm14-ch-tier', t: 1, title: 'Coding round: revenue by customer tier, with the unknowns', file: 'revenue_by_tier.sql', lang: 'sql',
        q: 'Return the **paid orders and revenue for each customer tier**. Orders with no customer and customers with no tier go under `none`. Columns: `tier`, `orders` (distinct orders) and `revenue`. Biggest revenue first, then by tier.',
        data: [{ name: 'orders (4 columns)', cols: TIER.cols, rows: TIER.rows, types: ['INTEGER', 'INTEGER', 'VARCHAR', 'DECIMAL(10,2)'] }, { name: 'customers (2 columns)', cols: CUST.cols, rows: CUST.rows, types: ['INTEGER', 'VARCHAR'] }],
        starter: '-- paid orders and revenue for each tier\nSELECT ...',
        hints: ['A LEFT JOIN keeps the orders with no customer.', '`coalesce(c.tier, \'none\')` names the unknowns.', 'Filter `status = \'paid\'` in WHERE, and group by the same expression.'],
        sol: G.file('m14.d_tier'),
        res: res('m14.d_tier', 'duckdb'),
        expl: ['The LEFT JOIN keeps the guest order 1009, which has no customer. Customers 3 and 6 have no tier, so their tier is NULL.', '`coalesce` puts both kinds of NULL under `none`: 3 orders and 54.50. Gold has 5 orders and 67.50, silver has 1 and 5.00.', 'The three revenues add up to 127.00, the paid revenue of the source. That is the reconciliation of mission 12.'],
        cx: 'One join on the customer key and one group by tier.'
      }),

      B.challenge({
        id: 'm14-ch-bestday', t: 2, title: 'Coding round: the best day of each store and its share', file: 'best_day.sql', lang: 'sql',
        q: 'For each store, return its **best revenue day**: `store_id`, `day`, `revenue` and `share_percent`, the percent of the store\'s total revenue, rounded to 1 decimal. Ordered by store.',
        data: [{ name: 'daily_revenue', cols: G.table('data.daily_revenue').cols, rows: G.table('data.daily_revenue').rows, types: ['DATE', 'INTEGER', 'DECIMAL(10,2)'] }],
        starter: '-- the best day of each store and its share of the store total\nWITH r AS (\n  SELECT ...\n)\nSELECT ...',
        hints: ['RANK over each store, biggest revenue first, finds the best day.', '`sum(revenue) OVER (PARTITION BY store_id)` is the store total on every row.', 'Filter the rank in the outer query.'],
        sol: G.file('m14.d_bestday'),
        res: res('m14.d_bestday', 'duckdb'),
        expl: ['Two window functions over the same partition: a rank for the best day and a total for the share.', 'The CTE computes them, because a window function cannot be used in WHERE. The outer query keeps rank 1.', 'Store 1\'s best day is 4 March with 60.00, which is 25.0 percent of its 240.00. Store 2\'s is 5 March with 50.00, 29.4 percent of 170.00.'],
        cx: 'One sort by store and revenue, then a single pass.'
      }),

      B.challenge({
        id: 'm14-ch-span', t: 2, title: 'Coding round: the span between the first and last order', file: 'order_span.sql', lang: 'sql',
        q: 'For each customer with **at least two orders**, return the number of orders and the **days between the first and the last order**: `customer_id`, `orders` and `days_between`. Ignore orders with no customer. Ordered by customer.',
        data: [{ name: 'orders (3 columns)', cols: G.cols('data.orders', ['order_id', 'customer_id', 'order_ts']).cols, rows: G.cols('data.orders', ['order_id', 'customer_id', 'order_ts']).rows, types: ['INTEGER', 'INTEGER', 'TIMESTAMP'] }],
        starter: '-- orders and days between first and last order\nSELECT ...',
        hints: ['Group by the customer, and keep the groups with two or more orders with HAVING.', 'Cut the timestamps to dates with CAST.', 'A date minus a date is a number of days on DuckDB and PostgreSQL.'],
        sol: G.file('m14.d_span'),
        res: res('m14.d_span', 'duckdb'),
        expl: ['The WHERE removes the guest order, whose customer is NULL. HAVING keeps the customers with at least two orders: 1, 2, 3 and 5.', '`CAST(max(order_ts) AS DATE) - CAST(min(order_ts) AS DATE)` subtracts two dates and gives whole days. Customer 2 ordered on 2 March and on 9 March: 7 days.', 'Customer 4 has one order and is not listed, and customers 6 and 8 have none.'],
        cx: 'One pass over the orders and a hash group by customer.'
      }),

      B.decide({
        id: 'm14-dec-slow', t: 2, title: 'Decision: the report got slow after last night\'s load',
        scenario: 'A report that took a second yesterday now takes minutes. The query and the indexes did not change. The nightly load added a lot of rows. A colleague suggests three fixes: more indexes, a rewrite with CTEs, or a bigger server. What is your first move?',
        opts: [
          { t: 'Add an index on every column of the table', d: 'Something will be used.', lose: 'Each index costs space and slows writes, and the planner may still choose the same bad plan.' },
          { t: 'Run EXPLAIN ANALYZE and compare the estimated rows with the actual rows', d: 'Look before you change anything.', lose: '' },
          { t: 'Rewrite the query with CTEs', d: 'It may read better.', lose: 'A plain CTE is usually inlined, so the plan may not change at all.' },
          { t: 'Move to a bigger server', d: 'More CPU and memory.', lose: 'If the planner picked a plan for the wrong number of rows, more hardware makes the wrong plan run on a faster machine.' }
        ],
        pick: 1,
        why: 'The plan shows the cause. In the recording an estimate of 150 rows met 4,285 real rows, and a table that grew after its last ANALYZE was estimated at 23,023 rows for 27,315. After ANALYZE the estimate was exact. Reading the plan costs a minute and tells you whether the problem is statistics, an index, a join or the data.',
        when: 'If the plan looks right and the numbers match, look at the data volume, the locks and the other queries that run at the same time.'
      }),

      B.incident({
        id: 'm14-inc-mix', t: 2, time: '08:40',
        alert: 'The revenue dashboard is 5 percent above finance on Mondays and equal on other days. The pipeline loads a file every night with retries, joins orders to order lines, and buckets the orders by the UTC date. You have one hour before the review.',
        clues: ['Retried loads can append rows twice: a raw table of 9 rows held 5 orders, and its total was 135.00 against 70.00.', 'A join to the line grain repeats an order total on each line: 228.00 against 127.00.', 'Late evening orders change their day in the zone of a store: 3 of 12 orders in the sample.'],
        opts: [
          { t: 'Divide Monday\'s revenue by 1.05', fb: 'A fudge factor hides the cause and breaks the next time the data changes.' },
          { t: 'Reconcile layer by layer and day by day: counts and totals of the source, staging and the mart, to find where Monday first differs', fb: '' },
          { t: 'Reload the whole month', fb: 'A reload without a cause can repeat the problem and costs hours before the review.' },
          { t: 'Tell finance that the dashboard is right', fb: 'The two numbers differ, so one of them is wrong. Finance can be right.' }
        ],
        best: 1,
        why: 'Three different causes fit the symptom, and each one changes a total in a different layer: duplicate rows in staging, a fan-out in a join, or the wrong day. Comparing counts and totals between layers, one day at a time, shows the first layer where Monday differs, and that layer names the cause. The reconciliation query of mission 12 and the checks of mission 13 are the tools.',
        checks: [['Pick a Monday', 'Compare the total of the source with each layer: staging, the joined table and the mart.'], ['Find the first difference', 'The layer where the numbers first differ holds the cause.'], ['Then test the three suspects', 'Duplicate keys in staging, a count of rows against distinct keys after the join, and orders near midnight in the store zones.'], ['Fix and guard it', 'Fix the cause, then add the check that would have caught it.']],
        tell: 'The dashboard was 5 percent above finance on Mondays. I reconciled counts and totals between the source, staging and the mart for one Monday, to find the first layer where they differed. That layer pointed at the cause, which I confirmed with a duplicate key query, a row count against distinct keys after the join, and a comparison of the UTC day with the store day. I fixed it and added the check that would have failed.',
        prevent: ['Reconcile every layer to the source after every load.', 'Test keys for uniqueness in staging and the grain after every join.', 'Name the time zone of every daily metric.']
      }),

      B.mockRound(IDS, TIERS),

      B.cheat({
        id: 'm14-cheat', t: 1, src: 'rec', title: 'One page to review',
        say: 'This is your last-minute review. Every number comes from a recording that ran in this course. Items marked (docs) come from documentation and were not run. Take a screenshot or print the page.',
        sections: [
          { h: 'Reading data', items: ['Order of work: FROM and JOIN, WHERE, GROUP BY, HAVING, window functions, SELECT, DISTINCT, ORDER BY, LIMIT. An alias works in ORDER BY and GROUP BY on all three engines, not in WHERE on PostgreSQL', 'NULL: a comparison is never true. Use IS NULL, IS DISTINCT FROM, and NOT EXISTS instead of NOT IN. count(column) skips NULL: ' + CBUG + ' bad rows where count(*) said ' + CRIGHT, '10 / 0 is infinity on DuckDB, an error on PostgreSQL and NULL on SQLite. NULLs sort last on DuckDB and PostgreSQL and first on SQLite'] },
          { h: 'Joins and grain', items: ['Row counts of the join types on the course data: inner ' + JT.INNER + ', left ' + JT.LEFT + ', right ' + JT.RIGHT + ', full ' + JT.FULL + ', cross ' + JT.CROSS, 'The paid revenue was ' + FS[0][2] + '. A join to payments made ' + FS[1][2] + ', and a total on the order lines made ' + FAN[1] + '. Add a number only at its own grain', 'sum(DISTINCT total) gave ' + DT[2] + ' on 27,315 paid orders. Distinct values are not distinct rows'] },
          { h: 'Aggregates', items: ['The average of store averages was ' + AA[0] + ' and the average of orders ' + AA[1] + '. Weight by the rows', 'An exact distinct count of ' + AP[0] + ' against an approximate ' + AP[1] + ' on the big data. HAVING filters groups, WHERE filters rows', 'ROLLUP and CUBE add subtotal rows, and a filter in ON or in WHERE of an outer join gives different rows'] },
          { h: 'Subqueries and CTEs', items: ['IN a list, EXISTS a yes or no, scalar one value. A scalar subquery with many rows is an error on DuckDB and PostgreSQL and the first row on SQLite', 'A recursive CTE has an anchor and a step. A cycle with UNION ALL needs a guard: a depth of 20 made ' + CY[0] + ' rows', 'PostgreSQL ran a correlated subquery as a SubPlan with loops=3000, and DuckDB turned it into a join. Read the plan'] },
          { h: 'Window functions', items: ['RANK repeats and skips (3, 3, 5), DENSE_RANK does not skip, ROW_NUMBER needs a tie-breaker', 'The default frame with ORDER BY is RANGE: two tied rows showed ' + RTY[6][3] + ' twice, and ROWS showed ' + RTY[6][4] + ' then ' + RTY[7][4], 'All ' + Object.keys(FR.combos).length + ' frame settings gave the same sums on three engines. LAST_VALUE needs a frame to UNBOUNDED FOLLOWING. Filter on a window with a CTE or QUALIFY (DuckDB)'] },
          { h: 'Dates, strings, JSON', items: [TZD.length + ' of 12 orders change their day in the zone of the store. Store UTC instants and convert for the report. Daylight saving: a day with 23 or 25 hours', 'A half-open range used an index. A cast of the column scanned the table and removed 29,669 rows on PostgreSQL', 'A JSON null and a missing key are both NULL. A flatten is an inner join: keep the parents with a LEFT JOIN. Collation sets the sort order'] },
          { h: 'Patterns', items: ['Dedupe: ROW_NUMBER over the key, newest first. ' + RAW[0] + ' raw rows held ' + RAW[1] + ' orders: ' + RAW[2] + ' raw against ' + DEDT[1] + ' clean', 'Sessions of the same 24 events: ' + SL.combos['5'].sessions.length + ', ' + SL.combos['10'].sessions.length + ', ' + SL.combos['30'].sessions.length + ', ' + SL.combos['45'].sessions.length + ' and ' + SL.combos['120'].sessions.length + ' for gaps of 5, 10, 30, 45 and 120 minutes. A funnel counts sessions: ' + FUN.slice(1).join(', '), 'Streaks: day minus row number. Pivot with FILTER or CASE, and decide between NULL and 0'] },
          { h: 'Changing data', items: ['An append run twice made ' + APP[0] + ' rows and ' + APP[1] + '. An upsert stayed at ' + UPS[0] + ' rows and ' + UPS[1] + '. Delete and insert a period in one transaction', 'MERGE and ON CONFLICT need one source row for each key. With a duplicate key the engines gave an error, the first value or the last value', 'IS DISTINCT FROM found ' + DIS + ' changed customers and <> found ' + NEQ + '. A type 2 dimension closes the old row and inserts the new one: ' + SCD + ' rows after the feed, and a second run changed nothing'] },
          { h: 'Transactions and locks', items: ['A transfer without a transaction left a total of ' + TRN.autocommit.total_after + ' for ' + TRN.before + '. With one the total stayed ' + TRN.transaction.total_after + ' and COMMIT answered ROLLBACK after the error', 'At READ COMMITTED all four problems happened. REPEATABLE READ still allowed write skew. SERIALIZABLE stopped it with SQLSTATE 40001', 'A deadlock (40P01) stopped one session: lock rows in one order and retry the whole transaction. SKIP LOCKED builds a queue'] },
          { h: 'Indexes and plans', items: ['A lookup read ' + num(PL.point.runs.none.rows_read) + ' rows without an index and ' + PL.point.runs.order_id.rows_read + ' with one. An index on a filter that keeps 91 percent of the rows was ignored', 'A composite index touched ' + pagesOf('range', 'store_ts') + ' pages with the equality column first and ' + pagesOf('range', 'ts_store') + ' with the range first. The estimate was 150 for 4,285 real rows until statistics existed', 'OFFSET read ' + num(20020) + ' index entries for 20 rows. A keyset read 20. Joins are hash, merge or nested loop'] },
          { h: 'Modelling', items: ['Grain first. The same ' + REC[0] + ' took ' + GRO + ' rows by order and ' + GRL + ' by order line. A star: one fact table, flat dimensions, an unknown member', 'Reconcile after every load: ' + REC[0] + ' on both sides and ' + REC[2] + ' orders that differ. Normalize where you write, flatten where you read', 'Fact tables are transaction, periodic snapshot or accumulating snapshot'] },
          { h: 'Dialects and quality', items: ['A translated query is not a tested query. A translated try_cast stopped PostgreSQL, and SQLite returned 12 for the text 12x', 'A check returns the number of bad rows. The scorecard had ' + DQ.length + ' checks and ' + DQ.filter(function (r) { return r[1] !== '0'; }).length + ' failed. Put checks at each layer and decide the severity', 'Seven dialects were translated, not run, in this course. Say so'] },
          { h: 'Say it in one line', items: ['Say the grain before you write the query.', 'Read the plan before you change the query.', 'Make every load safe to run twice, and every check able to fail.', 'Pick the isolation level on purpose, and retry on 40001 and 40P01.', 'Say what you know from practice, and say when you would check the documentation.'] }
        ]
      }),

      B.recap({
        id: 'm14-recap', n: 14, badge: 'SQL Architect', color: '#FDE68A',
        pts: [
          'You can follow a question from **the grain to the result**: the clause order, the joins, the aggregates, the windows and the plan.',
          'You choose by **evidence**: the plan before the index, the reconciliation before the dashboard, the run before the translation.',
          'You make loads **safe to repeat**, pick an **isolation level** on purpose, and retry on the two errors that mean "try again".',
          'You model with a **star schema**, check **quality at every layer**, and keep a check that has failed once on purpose.',
          'You know which facts came from **recordings** and which from **documentation**, and you say so.',
          'Next: practise the answers out loud, and run the Brewline examples on your own engine, with the verifier in the README.'
        ],
        lines: [
          'I say the grain, I read the plan and I reconcile the totals.',
          'I make every load safe to run twice and every check able to fail.',
          'I say what I know, and I say when I would check the documentation.'
        ]
      })
    ].reduce(function (all, x) { return all.concat(x); }, [])
  });
})();
