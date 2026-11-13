/* Mission 8: patterns. The queries that data engineers write again and again: remove duplicates, top N for each group, streaks and gaps, sessions from events,
   funnels, retention, pivots and price lookups by date. Every result was returned by the engines when the recorder ran the queries. */
(function () {
  var B = LAB.b, G = LAB.get;
  function inFile(key, text) { return G.file(key).indexOf(text) >= 0; }
  function cells(t, col) { var i = t.cols.indexOf(col); return t.rows.map(function (r) { return r[i]; }).join(); }
  function flat(t) { return t.rows.map(function (r) { return r.map(function (c) { return /^-?\d+(\.\d+)?$/.test(c) ? String(parseFloat(c)) : c; }).join('|'); }).join(';'); }
  var DU = G.on('m8.dups', 'duckdb'), RS = G.on('m8.raw_sum', 'duckdb').rows[0], DD = G.on('m8.dedupe', 'duckdb'), DT = G.on('m8.dedupe_total', 'duckdb').rows[0];
  var DX = G.table('m8.dedupe_distinct_on'), DQ = G.table('m8.dedupe_qualify'), DA = G.table('m8.dedupe_argmax'), DB = G.on('m8.distinct_bug', 'duckdb').rows[0][0];
  var TN = G.on('m8.topn', 'duckdb'), LA = G.on('m8.lateral', 'duckdb'), LAP = G.on('m8.lateral', 'postgres'), LAE = G.text('m8.lateral.sqlite.error');
  var IT = G.on('m8.island_trick', 'duckdb'), IS = G.on('m8.islands', 'duckdb'), ISS = G.table('m8.islands_sqlite'), GP = G.on('m8.gaps', 'duckdb');
  var SE = G.on('m8.sessions', 'duckdb'), SES = G.table('m8.sessions_sqlite'), FU = G.on('m8.funnel', 'duckdb').rows[0], FE = G.on('m8.funnel_events', 'duckdb').rows[0];
  var RT = G.on('m8.retention', 'duckdb'), RTS = G.table('m8.retention_sqlite'), PV = G.on('m8.pivot', 'duckdb'), PC = G.on('m8.pivot_case', 'duckdb'), PD = G.table('m8.pivot_duckdb');
  var AO = G.on('m8.asof', 'duckdb'), AOS = G.table('m8.asof_sqlite'), AJ = G.table('m8.asof_join'), CK = G.on('m8.ch_streak', 'duckdb'), CS = G.on('m8.ch_sessions', 'duckdb');
  var LB = G.counts('m8.sessions_lab');
  function sess(n) { return LB.combos[String(n)]; }

  G.expect(DU.rows.length === 4 && cells(DU, 'order_id') === '1001,1002,1004,1005' && cells(DU, 'versions') === '2,2,2,2' && flat(DU) === flat(G.on('m8.dups', 'postgres')) && flat(DU) === flat(G.on('m8.dups', 'sqlite')), 'orders 1001, 1002, 1004 and 1005 have two versions each in orders_raw');
  G.expect(RS.join() === '9,5,135.00' && DT.join() === '5,70.00' && flat(DD) === flat(G.on('m8.dedupe', 'postgres')) && flat(DD) === flat(G.on('m8.dedupe', 'sqlite')) && DD.rows[0].slice(0, 3).join() === '1001,paid,11.50' && DD.rows[4].slice(0, 3).join() === '1005,cancelled,9.00', 'orders_raw has 9 rows for 5 orders worth 135.00 raw and 70.00 deduplicated, and the latest row of 1005 is cancelled');
  G.expect(flat(DX) === flat(DD) && flat(DQ) === flat(DD) && flat(DA) === flat(DD) && inFile('m8.dedupe_distinct_on', 'DISTINCT ON (order_id)') && inFile('m8.dedupe_qualify', 'QUALIFY ROW_NUMBER()') && inFile('m8.dedupe_argmax', 'arg_max(status, ingested_at)'), 'DISTINCT ON, QUALIFY and arg_max return the same five rows as the window');
  G.expect(DB === '8', 'SELECT DISTINCT * leaves 8 rows');
  G.expect(flat(TN) === '1|1|1004|26;1|2|1010|19;2|1|1009|9.5;2|2|1003|5;4|1|1011|16.5;4|2|1006|14' && flat(TN) === flat(G.on('m8.topn', 'sqlite')), 'the top 2 paid orders of each store');
  G.expect(LA.rows.length === 7 && LA.rows[4].join() === '3,Kemang,NULL,NULL' && flat(LA) === flat(LAP) && /syntax error/.test(LAE), 'LEFT JOIN LATERAL keeps store 3 on DuckDB and PostgreSQL, and SQLite has no LATERAL');
  G.expect(IT.rows[0].slice(1).join() === '1,2026-02-28' && IT.rows[2].slice(1).join() === '3,2026-02-28' && IT.rows[3].slice(1).join() === '4,2026-03-01' && flat(IS) === flat(ISS) && IS.rows.length === 7 && IS.rows[0].join() === '1,2026-03-01,2026-03-03,3', 'consecutive days share one day minus row number, and the islands of customer 1 are 3, 2 and 1 days');
  G.expect(GP.rows.length === 4 && GP.rows[1].join() === '1,2026-03-06,2026-03-09,2', 'the gaps between activity days');
  G.expect(SE.rows.length === 8 && flat(SE) === flat(SES) && flat(SE) === flat(G.on('m8.sessions', 'postgres')) && SE.rows[7].join() === 'NULL,1,2026-03-02 12:00:00,2026-03-02 12:30:00,2', '8 sessions of 30 minutes on three engines, and the guest events 30 minutes apart are one session');
  G.expect(FU.join() === '8,8,5,4,3' && FE.join() === '12,5,4,3', 'the funnel has 8 sessions, 8 viewed, 5 carted, 4 at checkout and 3 purchases, and counting events gives 12 views');
  G.expect(RT.rows[0].join() === '2026-03-01,2,2,1,1' && RT.rows[1].join() === '2026-03-02,1,1,1,1' && flat(RT) === flat(RTS), 'retention of the two cohorts');
  G.expect(PV.rows[1].join() === '2,NULL,5.00,9.50' && PC.rows[1].join() === '2,0.00,5.00,9.50' && PD.cols.join() === 'store_id,app,store,web' && PD.rows[1].join() === '2,5.00,9.50,NULL', 'FILTER leaves NULL where there is nothing, CASE with ELSE 0 gives zeros, and PIVOT sorts the channels');
  G.expect(AO.rows.length === 1 && AO.rows[0].join() === '1003,3,2026-03-02,5.00,4.50' && AOS.rows[0][0] === '1003' && AJ.rows[0].join() === AO.rows[0].join(), 'the price audit finds order 1003: 5.00 charged and 4.50 listed, with a range join and with ASOF JOIN');
  G.expect(flat(CK) === '1|3;2|4;3|2' && flat(CS) === '1|2;2|3;3|2;NULL|1', 'longest streaks 3, 4 and 2 and sessions 2, 3, 2 and 1');
  G.expect(sess(5).sessions.length === 12 && sess(10).sessions.length === 9 && sess(30).sessions.length === 8 && sess(45).sessions.length === 7 && sess(120).sessions.length === 7 && sess(30).funnel.join() === '8,5,4,3' && sess(10).sessions.some(function (r) { return r[0] === 'NULL' && r[1] === '2'; }) && LB.engines.join() === 'duckdb,postgres,sqlite', 'the lab: 12, 9, 8, 7 and 7 sessions for limits of 5, 10, 30, 45 and 120 minutes');

  var DUPQ = G.file('m8.dups'), DEDQ = G.file('m8.dedupe'), TOPQ = G.file('m8.topn'), LATQ = G.file('m8.lateral'), TRICK = G.file('m8.island_trick'), ISLQ = G.file('m8.islands'), GAPQ = G.file('m8.gaps');
  var SESQ = G.file('m8.sessions'), FUNQ = G.file('m8.funnel'), RETQ = G.file('m8.retention'), PIVQ = G.file('m8.pivot'), ASQ = G.file('m8.asof'), AJQ = G.file('m8.asof_join');
  function res(key, e) { var t = e ? G.on(key, e) : G.table(key); return { msg: t.rows.length + ' rows', cols: t.cols, rows: t.rows }; }

  LAB.addChapter({
    id: 'm8', n: 8, title: 'Patterns', short: 'Patterns', blurb: 'Deduplicate, top N for each group, streaks and gaps, sessions, funnels, retention, pivots and price lookups by date', minutes: 60,
    focus: ['int', 'mart'],
    goals: [
      'Keep the **latest row for each key**, and know why DISTINCT is not enough.',
      'Pick the **top N for each group**, and keep groups that have no rows.',
      'Find **streaks and gaps** with a row number, and cut events into **sessions** with LAG.',
      'Count a **funnel** and a **retention** table without counting the wrong thing.',
      'Pivot with conditional aggregation, and look up the **price valid on a date**.'
    ],
    say: 'Mission 8 is a toolbox. Interviewers ask these queries by name: dedupe, top N per group, gaps and islands, sessions, funnels. Each one is a small combination of the window functions from mission 6. You will run them on the Brewline data, change the session limit in a lab, and see how each one fails when you misread the grain.',
    scenes: [
      B.talk({
        id: 'm8-what', t: 1, src: 'docs', title: 'Six patterns you will write again and again',
        say: 'Press Next for six patterns. Each gets a scene in this mission.',
        items: [
          ['Deduplicate', 'Raw tables hold the same key more than once: retries, updates and reloads. Keep one row for each key, usually the latest.', 'One row for each key.'],
          ['Top N for each group', 'The best two orders of each store. Rank inside a partition, then filter on the rank.', 'Rank, then filter.'],
          ['Gaps and islands', 'Streaks of consecutive days and the days missed in between. Consecutive values share the same value minus their row number.', 'Subtract the row number.'],
          ['Sessions and funnels', 'Cut a stream of events into sessions with LAG and a running sum, then count how many sessions reach each step.', 'Gap, flag, sum.'],
          ['Retention', 'Of the customers who started on a day, how many came back after 1, 2 or 3 days? Join the activity table to the first day of each customer.', 'Cohort, then offset.'],
          ['Pivots and price lookups', 'Turn values into columns with conditional aggregation, and find the price that was valid on the day of an order with a range join.', 'Columns from values, rows by date.']
        ],
        cols: 1
      }),

      B.sql({
        id: 'm8-dups', t: 1, src: 'rec', title: 'Find the duplicates first', file: 'duplicates.sql', code: DUPQ, ctx: G.ctx('duckdb'),
        result: res('m8.dups', 'duckdb'),
        steps: [
          { say: 'The table `orders_raw` has the orders as they arrived from the source. A retry or an update can deliver the same order more than once.' },
          { say: 'Group by the key and keep the groups with more than one row. `HAVING` filters the groups.', lines: G.span(DUPQ, /^GROUP BY/, /^HAVING/) },
          { say: 'Run it. Four orders have two versions: 1001, 1002, 1004 and 1005. Order 1001 arrived first as pending and then as paid. Order 1002 arrived twice with the same time, so it is an exact copy. DuckDB, PostgreSQL and SQLite returned the same rows.', run: true }
        ]
      }),

      B.sql({
        id: 'm8-dedupe', t: 1, src: 'rec', title: 'Keep the latest row for each key', file: 'dedupe.sql', code: DEDQ, ctx: G.ctx('duckdb'),
        result: res('m8.dedupe', 'duckdb'),
        steps: [
          { say: 'The standard answer: number the versions of each key from the newest to the oldest, then keep number 1.' },
          { say: '`PARTITION BY order_id` makes one window for each order. `ORDER BY ingested_at DESC` puts the newest version first.', lines: G.span(DEDQ, /ROW_NUMBER\(\)/) },
          { say: 'The outer query keeps only `rn = 1`. A window function cannot be used in WHERE, so the ranking sits in a CTE.', lines: G.span(DEDQ, /^WHERE rn = 1/) },
          { say: 'Run it. 5 orders remain from 9 rows. Order 1005 is cancelled: its latest version is the cancellation. The raw table held ' + RS[2] + ' of totals and the clean one holds ' + DT[1] + '. The same query ran on three engines with the same rows.', run: true }
        ]
      }),

      B.bug({
        id: 'm8-bug-distinct', t: 1, title: 'Bug hunt: DISTINCT did not deduplicate',
        q: 'A job should keep one row for each order in `orders_raw`, which has 5 orders. The result has ' + DB + ' rows. Click the line that is not enough.',
        file: 'dedupe.sql', lang: 'sql',
        code: ['SELECT DISTINCT *', 'FROM orders_raw', 'ORDER BY order_id;'].join('\n'),
        bad: [1], hint: 'DISTINCT compares whole rows. Do two versions of an order look the same?',
        why: 'DISTINCT removes rows that are identical in every column. Order 1002 arrived twice with the same values, so one copy went. The versions of 1001, 1004 and 1005 differ in time or status, so they all stayed: ' + DB + ' rows for 5 orders. Choose the version to keep with ROW_NUMBER over the key, ordered by the load time.',
        fix: ['WITH ranked AS (', '  SELECT *, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY ingested_at DESC) AS rn', '  FROM orders_raw', ')', 'SELECT order_id, ingested_at, status, total', 'FROM ranked', 'WHERE rn = 1', 'ORDER BY order_id;'].join('\n'),
        cheer: 'Name the key and the rule for the winner. DISTINCT knows neither.'
      }),

      B.cmp({
        id: 'm8-dedupe-cmp', t: 2, src: 'rec', title: 'Four ways to keep the latest row',
        say: 'All four returned the same five rows. Press Next for each one.',
        cols: ['Way', 'The key part', 'Runs on'],
        hl: 1,
        rows: [
          ['Window in a CTE', 'ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY ingested_at DESC), then WHERE rn = 1', 'DuckDB, PostgreSQL, SQLite'],
          ['QUALIFY', 'QUALIFY ROW_NUMBER() OVER (...) = 1', 'DuckDB'],
          ['DISTINCT ON', 'SELECT DISTINCT ON (order_id) ... ORDER BY order_id, ingested_at DESC', 'PostgreSQL'],
          ['arg_max', 'arg_max(status, ingested_at) with GROUP BY order_id', 'DuckDB']
        ],
        steps: [
          { upto: 1, say: 'The window in a CTE is the portable one. It ran on all three engines and is the form to know for an interview.' },
          { upto: 2, say: 'QUALIFY filters on the window in the same query, so the CTE disappears. DuckDB has it. PostgreSQL and SQLite do not.' },
          { upto: 3, say: 'DISTINCT ON keeps the first row of each key in the sort order. It is short, and it is PostgreSQL only.' },
          { upto: 4, say: 'arg_max returns the value of one column at the row where another column is largest. It needs one call for each column.' }
        ],
        pick: 'Write the window form unless the team uses one engine. Then use its shortcut.'
      }),

      B.sql({
        id: 'm8-topn', t: 1, src: 'rec', title: 'Top N for each group', file: 'top2_per_store.sql', code: TOPQ, ctx: G.ctx('duckdb'),
        result: res('m8.topn', 'duckdb'),
        steps: [
          { say: 'The two biggest paid orders of each store. It is the same shape as the dedupe: rank inside a partition, then filter on the rank.' },
          { say: 'The ORDER BY ends with `order_id`, a tie-breaker, so that two orders with the same total always rank the same way.', lines: G.span(TOPQ, /ROW_NUMBER\(\)/) },
          { say: 'Run it. Store 1 has 1004 (26.00) and 1010 (19.00), store 2 has 1009 (9.50) and 1003 (5.00), and store 4 has 1011 (16.50) and 1006 (14.00). Store 3 has no paid orders, so it does not appear. DuckDB, PostgreSQL and SQLite agreed.', run: true }
        ]
      }),

      B.sql({
        id: 'm8-lateral', t: 3, src: 'rec', title: 'Top N with LATERAL, and the groups that have no rows', file: 'top2_lateral.sql', code: LATQ, ctx: G.ctx('duckdb'),
        result: res('m8.lateral', 'duckdb'),
        steps: [
          { say: 'A lateral subquery runs once for each row on its left and can use that row. With `ORDER BY ... LIMIT 2` inside, it returns the top 2 of each store.' },
          { say: '`LEFT JOIN LATERAL ... ON true` keeps a store even when the subquery returns nothing.', lines: G.span(LATQ, /^LEFT JOIN LATERAL/) },
          { say: 'Run it. Store 3, Kemang, is in the result with NULL for the order and the total, because it has no paid orders. The window version of the last scene dropped it. PostgreSQL returned the same 7 rows. SQLite stopped with: ' + LAE + '. It has no LATERAL.', run: true }
        ]
      }),

      B.sql({
        id: 'm8-island-trick', t: 2, src: 'rec', title: 'Streaks: subtract the row number', file: 'island_trick.sql', code: TRICK, ctx: G.ctx('duckdb'),
        result: res('m8.island_trick', 'duckdb'),
        steps: [
          { say: 'A customer is active on some days. A streak is a run of consecutive days. Here are the days of customer 1, numbered in order.' },
          { say: 'Days that follow each other grow by 1, and so does the row number. Their difference stays the same.', lines: G.span(TRICK, /day - CAST\(ROW_NUMBER/) },
          { say: 'Run it. The first three days (1, 2 and 3 March) all have 28 February as `grp`. After the missing 4 March the value moves to 1 March for the next two days, and to 3 March for the last day. Each streak has its own value.', run: true }
        ]
      }),

      B.sql({
        id: 'm8-islands', t: 2, src: 'rec', title: 'Islands: group by the difference', file: 'islands.sql', code: ISLQ, ctx: G.ctx('duckdb'),
        result: res('m8.islands', 'duckdb'),
        steps: [
          { say: 'Group by customer and the difference value to get one row for each streak, with its first day, its last day and its length.' },
          { say: '`min(day)`, `max(day)` and `count(*)` describe each island.', lines: G.span(ISLQ, /SELECT customer_id, min\(day\)/) },
          { say: 'Run it. Customer 1 has streaks of 3, 2 and 1 days. Customer 2 has 4 and 1. Customer 3 has 2 and 1. PostgreSQL returned the same rows. SQLite cannot subtract a number from a date, so it used `date(day, \'-\' || row_number || \' days\')` and returned the same seven islands.', run: true }
        ]
      }),

      B.sql({
        id: 'm8-gaps', t: 2, src: 'rec', title: 'Gaps: look at the next active day', file: 'gaps.sql', code: GAPQ, ctx: G.ctx('duckdb'),
        result: res('m8.gaps', 'duckdb'),
        steps: [
          { say: 'The gaps are the other side of the islands. `LEAD` brings the next active day onto the row, and a gap is a difference of more than 1 day.' },
          { say: 'The difference minus 1 is the number of days missed.', lines: G.span(GAPQ, /next_day - day - 1 AS days_missed/) },
          { say: 'Run it. Customer 1 missed 1 day (4 March) and then 2 days (7 and 8 March). Customer 2 missed 6 March and customer 3 missed 3 March. Four gaps in total, and they match the island borders.', run: true }
        ]
      }),

      B.flow({
        id: 'm8-flow', t: 2, src: 'docs', title: 'How events become sessions', g: 'sessions', legend: true,
        steps: [
          { say: 'A session is a group of events of one customer with no long pause in between. Press Next to follow the recipe.', tags: ['tg_s1'] },
          { say: 'Step 1. Sort the events of each customer by time.', on: ['q1'], focus: ['s_ev', 's_lag'], cap: 'Sort.' },
          { say: 'Step 2. `LAG(event_ts)` reads the time of the previous event of the same customer.', on: ['q2'], focus: ['s_lag', 's_flag'], cap: 'Look back.' },
          { say: 'Step 3. Flag an event as new when it is the first one, or when the gap is longer than the limit, for example 30 minutes.', on: ['q3'], focus: ['s_flag', 's_sum'], tags: ['tg_s2'], cap: 'Flag.' },
          { say: 'Step 4. A running sum of the flags numbers the sessions: 1 for the first event, and it grows by 1 at each new session.', on: ['q4'], focus: ['s_sum', 's_id'], cap: 'Number.' },
          { say: 'Step 5. Group by customer and session number to get one row for each session: start, end and the count of events.', on: ['q5'], focus: ['s_id', 's_out'], cap: 'Group.' }
        ]
      }),

      B.sql({
        id: 'm8-sessions', t: 2, src: 'rec', title: 'Sessions with a 30 minute limit', file: 'sessions.sql', code: SESQ, ctx: G.ctx('duckdb'),
        result: res('m8.sessions', 'duckdb'),
        steps: [
          { say: 'The recipe as SQL. The first CTE flags the events that start a session. The second numbers the sessions. The last query groups them.' },
          { say: 'An event is new when it has no previous event, or when it comes more than 30 minutes after the previous one.', lines: G.span(SESQ, /CASE WHEN LAG/, /THEN 1 ELSE 0 END AS is_new/) },
          { say: 'A running sum of `is_new` gives the session number. A named window `w` keeps the PARTITION BY and ORDER BY in one place.', lines: G.span(SESQ, /sum\(is_new\) OVER/) },
          { say: 'Run it. 8 sessions. Customer 2 has 3: one lone view at 10:00, then 10:40 to 10:46, then 16:20 to 16:30. The guest with no customer id forms one partition, and its two events 30 minutes apart are one session, because 30 is not longer than 30. DuckDB, PostgreSQL and SQLite returned the same 8 rows.', run: true }
        ]
      }),

      B.widget({ id: 'm8-lab-sessions', kind: 'sessions', t: 2, src: 'rec', title: 'Lab: how long is a session?' }),

      B.quiz({
        id: 'm8-q-boundary', t: 2, q: 'A guest has two events at 12:00 and 12:30. The rule is "a new session starts when the gap is longer than 30 minutes". How many sessions is that?',
        opts: [
          { t: 'Two, because the gap reaches 30 minutes', fb: 'The gap is exactly 30 minutes. It is not longer than 30, so the rule does not start a new session.' },
          { t: 'One', fb: '' },
          { t: 'Zero, because the guest has no customer id', fb: 'The events of a NULL customer form one partition, and they make sessions like any other customer.' },
          { t: 'It depends on the engine', fb: 'All three engines returned one session in the recording.' }
        ],
        ok: 1, why: 'The comparison is "greater than", so a gap of exactly 30 minutes stays inside the session. In the lab, a limit of 10 minutes splits the guest into 2 sessions and a limit of 30 does not. Write the boundary in the metric definition: longer than, or at least.'
      }),

      B.sql({
        id: 'm8-funnel', t: 2, src: 'rec', title: 'A funnel by session', file: 'funnel.sql', code: FUNQ, ctx: G.ctx('duckdb'),
        result: res('m8.funnel', 'duckdb'),
        steps: [
          { say: 'A funnel counts how many sessions reach each step: view, add to cart, checkout, purchase. First reduce the events to one row for each session, with a 0 or 1 for each step.' },
          { say: '`max(CASE WHEN event_type = \'purchase\' THEN 1 ELSE 0 END)` is 1 when the session has at least one purchase event.', lines: G.span(FUNQ, /max\(CASE WHEN event_type = 'view'/, /max\(CASE WHEN event_type = 'purchase'/) },
          { say: 'Then add the flags up. Run it. 8 sessions: 8 viewed, 5 added to the cart, 4 reached checkout and 3 bought. That is 62.5 percent from view to cart, 80 percent from cart to checkout and 75 percent from checkout to purchase.', run: true }
        ]
      }),

      B.bug({
        id: 'm8-bug-funnel', t: 2, title: 'Bug hunt: the funnel that starts too wide',
        q: 'A funnel should show how many sessions viewed a page. The query counts events and shows ' + FE[0] + ' views, while the sessions query found ' + FU[1] + '. The conversion to cart looks like ' + Math.round(+FE[1] / +FE[0] * 100) + ' percent and should be 62.5 percent. Click the line that counts the wrong thing.',
        file: 'funnel_events.sql', lang: 'sql',
        code: G.file('m8.funnel_events'), bad: [1], hint: 'What is the grain of the events table, and what is the grain of a funnel?',
        why: 'The events table has one row for each event, and a session can view many pages. `count(*)` counts events, so ' + FE[0] + ' views came from ' + FU[1] + ' sessions. A funnel counts sessions: reduce to one row for each session first, or use `count(DISTINCT session)`.',
        fix: ['SELECT count(DISTINCT CASE WHEN event_type = \'view\' THEN session_id END) AS sessions_with_view', 'FROM events_with_session;'].join('\n'),
        cheer: 'Name the thing you count: events, sessions or customers.'
      }),

      B.sql({
        id: 'm8-retention', t: 2, src: 'rec', title: 'Retention by cohort', file: 'retention.sql', code: RETQ, ctx: G.ctx('duckdb'),
        result: res('m8.retention', 'duckdb'),
        steps: [
          { say: 'Retention asks: of the customers whose first active day is a given day (the cohort), how many were active again 1, 2 and 3 days later?' },
          { say: 'First find the first active day of each customer. Then join the activity table back and compute the day offset: the active day minus the cohort day.', lines: G.span(RETQ, /^WITH first_day/, /JOIN first_day/) },
          { say: 'Each column counts the distinct customers with that offset. `count(DISTINCT CASE WHEN day_n = 1 THEN customer_id END)` ignores the NULLs that the CASE returns for other offsets.', lines: G.span(RETQ, /count\(DISTINCT CASE WHEN day_n = 1/, /day_n = 3/) },
          { say: 'Run it. The cohort of 1 March has 2 customers: 2 came back after 1 day, 1 after 2 days and 1 after 3 days. The cohort of 2 March has 1 customer, who came back on each of the next 3 days. SQLite returned the same rows with `julianday` for the offset.', run: true }
        ]
      }),

      B.sql({
        id: 'm8-pivot', t: 1, src: 'rec', title: 'A pivot with conditional aggregation', file: 'pivot.sql', code: PIVQ, ctx: G.ctx('duckdb'),
        result: res('m8.pivot', 'duckdb'),
        steps: [
          { say: 'Put the channels in columns: the revenue of each store by web, app and in store. The portable way is one conditional sum for each column.' },
          { say: '`sum(total) FILTER (WHERE channel = \'web\')` adds only the rows of that channel.', lines: G.span(PIVQ, /FILTER \(WHERE channel = 'web'\)/, /FILTER \(WHERE channel = 'store'\)/) },
          { say: 'Run it. Store 2 has NULL for web, because it has no paid web orders and a sum over no rows is NULL. The form `sum(CASE WHEN channel = \'web\' THEN total ELSE 0 END)` gave 0.00 there. Use `coalesce` or the ELSE 0 when the report must show zeros. DuckDB, PostgreSQL and SQLite all ran both forms.', run: true }
        ],
        note: 'DuckDB also has a PIVOT statement. It returned the same numbers, with the columns sorted by name: app, store, web.'
      }),

      B.sql({
        id: 'm8-asof', t: 2, src: 'rec', title: 'The price on the day: a range join', file: 'price_audit.sql', code: ASQ, ctx: G.ctx('duckdb'),
        result: res('m8.asof', 'duckdb'),
        steps: [
          { say: 'The table `price_history` has a price for each product and a period: `valid_from` and `valid_to`. Which order lines were charged a price that differs from the price valid on the day of the order?' },
          { say: 'Join on the product and on the order day being between the two dates of the period.', lines: G.span(ASQ, /ON ph.product_id = i.product_id/, /BETWEEN ph.valid_from AND ph.valid_to/) },
          { say: 'Run it. One line: order 1003 charged 5.00 for product 3 on 2 March, and the list price on that day was 4.50. The price rose to 5.00 on 5 March. The open period `9999-12-31` works as a far future date. PostgreSQL and SQLite returned the same row.', run: true }
        ]
      }),

      B.sql({
        id: 'm8-asof-join', t: 3, src: 'rec', title: 'ASOF JOIN: the latest row at or before', file: 'price_audit_asof.sql', code: AJQ, ctx: G.ctx('duckdb'),
        result: res('m8.asof_join'),
        steps: [
          { say: 'DuckDB has a join for exactly this case. `ASOF JOIN` matches each row with the latest row of the other table that is at or before it.' },
          { say: 'It needs only the start of each period, `valid_from`, and no `valid_to`. The last price that started on or before the order wins.', lines: G.span(AJQ, /^ASOF JOIN/, /o.order_ts >= ph.valid_from/) },
          { say: 'Run it. The same single line as the range join: order 1003, 5.00 charged, 4.50 listed. PostgreSQL and SQLite have no ASOF JOIN, so they keep the range join.', run: true }
        ]
      }),

      B.quiz({
        id: 'm8-q-island', t: 2, q: 'The days 1, 2 and 3 March have row numbers 1, 2 and 3. What do they share that makes them one streak?',
        opts: [
          { t: 'The same weekday', fb: 'Consecutive days have different weekdays.' },
          { t: 'The same value of day minus row number', fb: '' },
          { t: 'The same value of day plus row number', fb: 'The sum grows by 2 each day, so it differs on every row.' },
          { t: 'The same count of orders', fb: 'The pattern does not look at orders at all.' }
        ],
        ok: 1, why: 'Each next day adds 1 to the date and 1 to the row number, so the difference stays equal: 28 February in the recording. A missing day adds 2 to the date and only 1 to the row number, and the difference changes. Each value of the difference is one island.'
      }),

      B.challenge({
        id: 'm8-ch-dedupe', t: 1, title: 'Coding round: the latest version of each order', file: 'latest_orders.sql', lang: 'sql',
        q: 'Return **one row for each order** of `orders_raw`: the version with the latest `ingested_at`. Columns: `order_id`, `status`, `total`, `ingested_at`, in order id order.',
        data: [{ name: 'orders_raw', cols: G.table('data.orders_raw').cols, rows: G.table('data.orders_raw').rows, types: ['INTEGER', 'TIMESTAMP', 'VARCHAR', 'DECIMAL(10,2)'] }],
        starter: '-- the latest version of each order\nWITH ranked AS (\n  SELECT ...\n)\nSELECT ...',
        hints: ['Number the versions of each order with ROW_NUMBER.', 'PARTITION BY order_id, ORDER BY ingested_at DESC.', 'Keep the rows with number 1.'],
        sol: DEDQ,
        res: res('m8.dedupe', 'duckdb'),
        expl: ['The window numbers the versions of each order from the newest. The newest version has number 1.', 'The outer query keeps number 1. Order 1002 has two identical rows, so either one is the same answer.', 'The result has 5 rows. The latest version of order 1005 is the cancellation, and order 1001 is paid.'],
        cx: 'One sort by order and time, then a single pass.'
      }),

      B.challenge({
        id: 'm8-ch-top2', t: 1, title: 'Coding round: the top 2 paid orders of each store', file: 'top2.sql', lang: 'sql',
        q: 'Return the **two biggest paid orders of each store**: store, rank, order id and total. Break ties by order id. Order by store and rank.',
        data: [{ name: 'orders (4 columns)', cols: G.cols('data.orders', ['order_id', 'store_id', 'status', 'total']).cols, rows: G.cols('data.orders', ['order_id', 'store_id', 'status', 'total']).rows, types: ['INTEGER', 'INTEGER', 'VARCHAR', 'DECIMAL(10,2)'] }],
        starter: '-- the top 2 paid orders of each store\nWITH ranked AS (\n  SELECT ...\n)\nSELECT ...',
        hints: ['ROW_NUMBER with PARTITION BY store_id.', 'ORDER BY total DESC, then order_id for ties.', 'You cannot filter on the number in WHERE of the same query.'],
        sol: TOPQ,
        res: res('m8.topn', 'duckdb'),
        expl: ['The window ranks the paid orders inside each store by total, with the order id as a tie-breaker.', 'The outer WHERE keeps ranks 1 and 2. Store 3 has no paid orders, so it has no rows.', 'Six rows come back: two for each of the stores 1, 2 and 4.'],
        cx: 'One sort by store and total, then a single pass.'
      }),

      B.challenge({
        id: 'm8-ch-pivot', t: 1, title: 'Coding round: revenue by store and channel', file: 'pivot.sql', lang: 'sql',
        q: 'Return the **paid revenue of each store in three columns**: `web`, `app` and `in_store`. A channel with no paid orders must show 0, not NULL. Order by store.',
        data: [{ name: 'orders (4 columns)', cols: G.cols('data.orders', ['store_id', 'status', 'channel', 'total']).cols, rows: G.cols('data.orders', ['store_id', 'status', 'channel', 'total']).rows, types: ['INTEGER', 'VARCHAR', 'VARCHAR', 'DECIMAL(10,2)'] }],
        starter: '-- paid revenue of each store by channel\nSELECT ...',
        hints: ['One sum for each column.', 'A CASE inside the sum picks the channel.', 'ELSE 0 gives zeros instead of NULL.'],
        sol: G.file('m8.pivot_case'),
        res: res('m8.pivot_case', 'duckdb'),
        expl: ['`sum(CASE WHEN channel = \'web\' THEN total ELSE 0 END)` adds the web totals and 0 for the other rows.', 'The ELSE 0 gives 0.00 for store 2 on web instead of NULL.', 'Store 1 has 56.50 web, 7.00 app and 18.50 in store. The three columns of a store add up to its paid revenue of 82.00.'],
        cx: 'One pass over the paid orders and one group by store.'
      }),

      B.challenge({
        id: 'm8-ch-streak', t: 2, title: 'Coding round: the longest streak of each customer', file: 'longest_streak.sql', lang: 'sql',
        q: 'Return the **longest run of consecutive active days** of each customer: `customer_id` and `longest_streak`, ordered by customer.',
        data: [{ name: 'daily_active', cols: G.table('data.daily_active').cols, rows: G.table('data.daily_active').rows, types: ['INTEGER', 'DATE'] }],
        starter: '-- the longest streak of each customer\nWITH numbered AS (\n  SELECT ...\n)\nSELECT ...',
        hints: ['Number the days of each customer.', 'Consecutive days have the same value of day minus the row number.', 'Count the days in each island, then take the maximum for each customer.'],
        sol: G.file('m8.ch_streak'),
        res: res('m8.ch_streak', 'duckdb'),
        expl: ['`day - ROW_NUMBER()` is the same for days in a row, and changes after a missing day. That value labels the island.', 'Counting the rows of each island gives its length. The maximum of the lengths is the longest streak.', 'Customer 1 has 3, customer 2 has 4 and customer 3 has 2.'],
        cx: 'One sort by customer and day, then two small groupings.'
      }),

      B.challenge({
        id: 'm8-ch-sessions', t: 2, title: 'Coding round: sessions for each customer', file: 'session_count.sql', lang: 'sql',
        q: 'Count the **sessions of each customer** with a limit of 30 minutes: a new session starts when the gap to the previous event is longer than 30 minutes. Events with no customer count as one group. Return `customer_id` and `sessions`, with the NULL customer last.',
        data: [{ name: 'events (3 columns)', cols: G.cols('data.events', ['event_id', 'customer_id', 'event_ts']).cols, rows: G.cols('data.events', ['event_id', 'customer_id', 'event_ts']).rows, types: ['INTEGER', 'INTEGER', 'TIMESTAMP'] }],
        starter: '-- sessions for each customer\nSELECT ...',
        hints: ['LAG(event_ts) gives the previous event of the same customer.', 'The first event has no previous event: that also starts a session.', 'Sum the flags of each customer.'],
        sol: G.file('m8.ch_sessions'),
        res: res('m8.ch_sessions', 'duckdb'),
        expl: ['A CASE flags each event that starts a session: the first one of a customer, or one that is more than 30 minutes after the previous one.', 'The sum of the flags is the number of sessions, because each session has exactly one starting event.', 'Customers 1, 2 and 3 have 2, 3 and 2 sessions. The guest has 1: its events are exactly 30 minutes apart, which is not longer than 30.'],
        cx: 'One sort by customer and time, then a single pass.'
      }),

      B.decide({
        id: 'm8-dec-dedupe', t: 2, title: 'Decision: where do you remove the duplicates?',
        scenario: 'A feed delivers orders more than once, sometimes with updates. Five dashboards and a model read the data. Rows arrive about 40 million a day. You must pick where the deduplication lives.',
        opts: [
          { t: 'In every dashboard query, with ROW_NUMBER', d: 'No new object. Each query cleans for itself.', lose: 'Six copies of the rule drift apart, and every query pays for a sort of 40 million rows.' },
          { t: 'Trust the source and never deduplicate', d: 'Simplest. No work.', lose: 'In the sample the raw rows summed to 135.00 for orders worth 70.00. Every report would double count.' },
          { t: 'Once, in the staging step that all readers use', d: 'A clean table with one row for each order, rebuilt or merged by a job.', lose: '' },
          { t: 'DISTINCT on the raw table', d: 'One short keyword.', lose: 'It only removes identical rows. In the sample it left 8 rows for 5 orders.' }
        ],
        pick: 2,
        why: 'The rule is the same for every reader, so it belongs in one place. The staging step pays the cost once, and every dashboard reads one row for each order. The recording shows the cost of skipping it: the raw table summed to 135.00 and the clean one to 70.00.',
        when: 'For a one-off analysis on a small table, a ROW_NUMBER in the query is fine. For shared data, put it in staging and add a test that the key is unique.'
      }),

      B.incident({
        id: 'm8-inc-dup', t: 2, time: '07:50',
        alert: 'Revenue on the morning dashboard is almost double yesterday and nobody sold double. The pipeline restarted at 03:00 and reloaded the last file of orders. The dashboard sums the `orders_raw` table.',
        clues: ['The raw table has 9 rows for 5 orders in the sample.', 'Some orders have two versions: a pending row and a paid row.', 'The restart loaded a file that was already loaded.'],
        opts: [
          { t: 'Divide the revenue by 2 in the dashboard', fb: 'The duplicates are not exact doubles. Orders 1001 and 1005 changed status, and 1003 has one row.' },
          { t: 'Build the report from one row for each order: rank the versions by load time and keep the latest', fb: '' },
          { t: 'Use SELECT DISTINCT on the raw table', fb: 'DISTINCT only removes rows that are identical in every column. The versions that differ in status or time stay.' },
          { t: 'Delete the file and wait for the next load', fb: 'Tomorrow will have the same problem, and today the dashboard stays wrong.' }
        ],
        best: 1,
        why: 'The reload added second versions of orders. In the sample the raw rows summed to 135.00, and one row for each order summed to 70.00. Keeping the latest version of each key, with ROW_NUMBER over the key and the load time, gives the right total whether the file arrives once or twice.',
        checks: [['Find the duplicate keys', 'Group by order_id and keep the groups with more than one row. The sample has four.'], ['Compare the totals', 'The raw sum and the deduplicated sum: 135.00 against 70.00 in the sample.'], ['Fix the model', 'Read a deduplicated view or table, not the raw rows.'], ['Add a test', 'A check that order_id is unique in the clean table, and that a reload does not change the total.']],
        tell: 'Revenue doubled after a restart reloaded a file. The raw table held several versions of each order, 9 rows for 5 orders in my sample, with a raw total of 135.00 against 70.00 for one row per order. I replaced the dashboard source with a deduplicated table that keeps the latest version of each order by load time, and added a test for a unique key and for a stable total after a reload.',
        prevent: ['Deduplicate once in staging and have every report read that table.', 'Test that the key is unique and that a reload keeps the total.', 'Make loads safe to run twice (mission 9).']
      }),

      B.qa({
        id: 'qa-dedupe', t: 1, tag: 'Patterns', secs: 60,
        q: 'How do you remove duplicates and keep the latest row for each key?',
        pts: ['ROW_NUMBER partitioned by the key', 'ORDER BY the load time descending', 'Keep row number 1', 'DISTINCT is not enough'],
        short: 'I number the rows of each key with ROW_NUMBER() OVER (PARTITION BY key ORDER BY loaded_at DESC) in a CTE, and keep row number 1 in the outer query. DISTINCT is not enough, because it removes only rows that are identical in every column. In my sample 9 raw rows held 5 orders, and DISTINCT * still left 8 rows because the versions of three orders differed. The window gave 5 rows, with the cancelled version of order 1005 and the paid version of 1001. DuckDB has QUALIFY, PostgreSQL has DISTINCT ON and DuckDB has arg_max. They gave the same rows. I add a tie-breaker if two versions can share a load time, and I test that the key is unique afterwards.',
        fu: [['What if two versions have the same load time?', 'Add another column to the ORDER BY, such as a sequence number, so that the winner is always the same.']],
        trap: 'Using DISTINCT and calling it deduplication.',
        real: 'Tell about a table with repeated keys and how you cleaned it.'
      }),

      B.qa({
        id: 'qa-topn', t: 1, tag: 'Patterns', secs: 60,
        q: 'How do you get the top N rows for each group?',
        pts: ['Rank inside a partition', 'Filter on the rank in an outer query', 'Tie-breaker', 'LATERAL keeps empty groups'],
        short: 'I rank the rows with ROW_NUMBER() OVER (PARTITION BY group ORDER BY value DESC, id) in a CTE and filter WHERE rn <= N outside. The id is a tie-breaker, so that ties give the same answer on every run. For the top 2 paid orders of each store, I got 6 rows: stores 1, 2 and 4, two each. Store 3 has no paid orders, so it was missing. A LEFT JOIN LATERAL with ORDER BY and LIMIT inside kept store 3 with NULLs on DuckDB and PostgreSQL. SQLite has no LATERAL. If ties must all be kept, I use RANK instead of ROW_NUMBER.',
        fu: [['ROW_NUMBER or RANK for the top 3?', 'ROW_NUMBER returns exactly 3 rows and cuts ties. RANK returns every row tied for third place.']],
        trap: 'Forgetting that groups without rows disappear.',
        real: 'Tell about a top N report and how you handled ties.'
      }),

      B.qa({
        id: 'qa-pivot', t: 1, tag: 'Patterns', secs: 60,
        q: 'How do you pivot rows into columns in SQL?',
        pts: ['Conditional aggregation', 'One sum or count for each column', 'NULL or 0 for empty cells', 'PIVOT on some engines'],
        short: 'The portable way is conditional aggregation: one aggregate for each new column, with a CASE or a FILTER inside, grouped by the row key. For revenue by store and channel I used sum(total) FILTER (WHERE channel = \'web\') and the same for app and store. An empty cell is NULL with FILTER, and 0 with a CASE that has ELSE 0. In my sample store 2 had NULL for web in the first form. I choose on purpose, because NULL breaks sums downstream. DuckDB also has a PIVOT statement that returned the same numbers with the channels sorted by name. The column list is fixed in the query, so a new channel needs a change.',
        fu: [['What if the list of channels changes often?', 'Use the long form: one row for each store and channel, and pivot in the BI tool. Or generate the SQL from the list of values.']],
        trap: 'Leaving NULL in a cell that a report adds up.',
        real: 'Tell about a cross-tab you built.'
      }),

      B.qa({
        id: 'qa-islands', t: 2, tag: 'Patterns', secs: 60,
        q: 'How do you find streaks of consecutive days, and the gaps between them?',
        pts: ['Number the days with ROW_NUMBER', 'Subtract the row number from the day', 'Equal values are one island', 'LEAD finds the gaps'],
        short: 'For each customer I number the active days with ROW_NUMBER, and subtract the row number from the day. Consecutive days give the same value, and a missing day changes it. Grouping by customer and that value gives one row for each streak, with min(day), max(day) and count(*). Customer 1 had streaks of 3, 2 and 1 days. The longest streaks were 3, 4 and 2 for the three customers. For gaps I use LEAD to bring the next active day, and a difference above 1 is a gap: four gaps in the sample. If the day can repeat, I deduplicate first, because a repeated day breaks the trick.',
        fu: [['How does it work in SQLite?', 'It cannot subtract a number from a date. I used date(day, \'-\' || rn || \' days\') and got the same islands.']],
        trap: 'Repeated days in the data, which shift the row number.',
        real: 'Tell about an activity or uptime streak you computed.'
      }),

      B.qa({
        id: 'qa-sessions', t: 2, tag: 'Patterns', secs: 60,
        q: 'How do you build sessions from raw events?',
        pts: ['LAG for the previous event', 'Flag a new session after a long gap', 'Running sum numbers the sessions', 'State the boundary and the limit'],
        short: 'For each customer I sort the events by time and use LAG to read the previous event. An event starts a new session if it is the first one or if the gap is longer than the limit, for example 30 minutes. A running sum of those flags numbers the sessions, and a group by customer and session number gives one row for each session. On my sample that made 8 sessions at 30 minutes, 12 at 5 minutes and 7 at 45 minutes. The boundary matters: two guest events exactly 30 minutes apart were one session with "longer than 30". I write the limit and the comparison in the definition, and keep the limit in one place.',
        fu: [['What about events with no customer id?', 'In a PARTITION BY the NULLs form one partition. I either keep them as a guest group or drop them, and I say which.']],
        trap: 'Sessions that are defined in each dashboard with a different limit.',
        real: 'Tell about a session metric and how the limit was chosen.'
      }),

      B.qa({
        id: 'qa-funnel', t: 2, tag: 'Patterns', secs: 60,
        q: 'How do you compute a funnel, and what goes wrong?',
        pts: ['Decide what you count', 'One row for each session or customer first', 'Flags for each step', 'Conversion between steps'],
        short: 'I decide what I count first: sessions, customers or events. Then I reduce the events to one row for each session with a 0 or 1 flag for each step, using max(CASE WHEN event_type = ... THEN 1 ELSE 0 END), and add the flags up. In my sample, 8 sessions gave 8 views, 5 carts, 4 checkouts and 3 purchases: 62.5 percent from view to cart, 80 percent to checkout and 75 percent to purchase. Counting events instead gave 12 views, which made the first step look like 42 percent. If the order of the steps matters, I compare the times of the events in the session. I also say how long a session may be.',
        fu: [['What if a session has a purchase without a cart event?', 'Then the flags disagree with the funnel. I either require the earlier steps or report the data problem.']],
        trap: 'Counting events when the funnel is about sessions.',
        real: 'Tell about a conversion number that two teams computed differently.'
      }),

      B.qa({
        id: 'qa-retention', t: 2, tag: 'Patterns', secs: 60,
        q: 'How do you compute retention by cohort?',
        pts: ['Cohort is the first active day', 'Offset is the active day minus the cohort day', 'Count distinct customers for each offset', 'Divide by the cohort size'],
        short: 'I find the first active day of each customer, which is the cohort. I join the activity table to it and compute the offset: the active day minus the cohort day. Then for each cohort I count the distinct customers with offset 1, 2 and 3, using count(DISTINCT CASE WHEN offset = 1 THEN customer_id END), and divide by the cohort size. In my sample the cohort of 1 March had 2 customers, and 2, 1 and 1 of them came back after 1, 2 and 3 days. The trap is the definition: active on exactly day N, or on day N or later. I write it down. DuckDB and PostgreSQL subtract dates directly, and SQLite needs julianday.',
        fu: [['What is the difference between day N retention and rolling retention?', 'Day N counts customers active exactly on day N. Rolling counts customers active on day N or any later day.']],
        trap: 'Counting rows instead of distinct customers.',
        real: 'Tell about a retention chart and its definition.'
      }),

      B.qa({
        id: 'qa-asof', t: 3, tag: 'Patterns', secs: 60,
        q: 'How do you find the price or status that was valid on a date?',
        pts: ['A table with valid_from and valid_to', 'Range join with BETWEEN', 'Open period with a far future date', 'ASOF JOIN on DuckDB'],
        short: 'I keep a history table with valid_from and valid_to, and I join on the key and on the date being between the two. An open period gets a far future date, here 9999-12-31, so the join needs no OR for NULL. With it I audited order lines: one line charged 5.00 on 2 March while the list price was 4.50, and the price rose on 5 March. DuckDB has ASOF JOIN, which needs only valid_from and takes the latest row at or before the date. It returned the same line. I check that the periods of a key never overlap, because an overlap would make the join return two rows and double count.',
        fu: [['How do you make sure the periods do not overlap?', 'A test that for each key the next valid_from is the day after the previous valid_to, or an exclusion constraint where the engine has one.']],
        trap: 'Overlapping periods that duplicate rows in the join.',
        real: 'Tell about a slowly changing table that you joined by date.'
      }),

      B.recap({
        id: 'm8-recap', n: 8, badge: 'Pattern Spotter', color: '#DDD6FE',
        pts: [
          '**Deduplicate** with ROW_NUMBER over the key, newest first, and keep 1. DISTINCT only removes identical rows: 8 rows left for 5 orders.',
          '**Top N for each group**: rank in a partition with a tie-breaker, filter outside. A LEFT JOIN LATERAL keeps groups with no rows.',
          '**Islands**: day minus row number is equal inside a streak. LEAD finds the **gaps**.',
          '**Sessions**: LAG, flag a gap longer than the limit, running sum. The limit and the boundary belong in the definition: 12, 8 and 7 sessions for 5, 30 and 45 minutes.',
          'A **funnel** counts sessions, not events: 8, 5, 4 and 3 against 12 views. **Retention** counts distinct customers by offset from the cohort day.',
          '**Pivot** with FILTER or CASE and decide between NULL and 0. Look up the price valid on a date with a **range join** or ASOF JOIN.'
        ],
        lines: [
          'I deduplicate once in staging, and I test that the key is unique.',
          'I state what a funnel counts and where a session ends.',
          'I add a tie-breaker to every ranking that decides something.'
        ]
      })
    ]
  });
})();
