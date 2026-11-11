/* Mission 8: Spark SQL for pipelines. ANSI mode (on by default in Spark 4), what Spark SQL does not have (QUALIFY), window functions and the frame that surprises people, rollups and
   pivots, arrays and explode, and the time zone that moves a day. Every result and every error message is real output of Spark 4.0.1. */
(function () {
  var B = LAB.b, G = LAB.get;
  var AN = G.table('sql.ansi'), WI = G.table('sql.windows'), TI = G.table('sql.ties'), RO = G.table('sql.rollup'), PI = G.table('sql.pivot'), AR = G.table('sql.arrays'), TZ = G.table('sql.timezone');
  var EXP = G.counts('sql.explode'), QUAL = G.text('sql.qualify'), SKW = G.table('skew.aggregations').rows[1];
  var PYS = G.file('code/sqlfun.py');
  var ran = function (sql) { sql.split('\n').forEach(function (ln) { var t = ln.trim(); if (t && PYS.indexOf(t) < 0) throw new Error('the lesson shows SQL that did not run: ' + t); }); return sql; };
  var nul = function (rows) { return rows.map(function (r) { return r.map(function (c) { return c === '' || c === null ? 'NULL' : c; }); }); };
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  var ansi = function (start) { var r = AN.rows.filter(function (x) { return x[0].indexOf(start) === 0; })[0]; if (!r) throw new Error('no ANSI case ' + start); return r; };
  var firstLine = function (s) { return String(s).replace(/^error:\s*/, ''); };
  var code = function (s) { return firstLine(s).split(' ')[0]; };
  var SQ_WIN = ran('SELECT store, day, cents,\n       SUM(cents) OVER (PARTITION BY store ORDER BY day) AS running,\n       RANK() OVER (PARTITION BY store ORDER BY cents DESC) AS rnk,\n       LAG(cents) OVER (PARTITION BY store ORDER BY day) AS prev\nFROM daily ORDER BY store, day');
  var SQ_TIES = ran('SELECT day, cents,\n       SUM(cents) OVER (ORDER BY cents ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS rows_frame,\n       SUM(cents) OVER (ORDER BY cents RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS range_frame\nFROM daily WHERE store = \'s01\' ORDER BY cents, day');
  var SQ_ROLL = ran('SELECT country, channel, SUM(n) AS n, GROUPING(country) AS g_country, GROUPING(channel) AS g_channel FROM sales GROUP BY ROLLUP (country, channel) ORDER BY g_country, country, g_channel, channel');
  var SQ_PIV = ran('SELECT * FROM sales PIVOT (SUM(n) FOR channel IN (\'app\', \'pos\')) ORDER BY country');
  var SQ_ARR = ran('SELECT id, xs, transform(xs, x -> x * 10) AS times10, filter(xs, x -> x > 1) AS over1, aggregate(xs, 0, (acc, x) -> acc + x) AS total, sort_array(xs) AS sorted\nFROM t ORDER BY id');
  var SQ_EXP = ran('SELECT id, x FROM t LATERAL VIEW explode(xs) e AS x ORDER BY id, x');
  var SQ_QUAL = ran("SELECT store_id, row_number() OVER (PARTITION BY store_id ORDER BY total_cents DESC) AS r FROM orders QUALIFY r = 1");
  var SQ_QUAL_OK = 'SELECT store_id, r FROM (\n  SELECT store_id, row_number() OVER (PARTITION BY store_id ORDER BY total_cents DESC) AS r\n  FROM orders\n) WHERE r = 1';
  var TIES = TI.rows, tie2 = TIES.filter(function (r) { return Number(r[1]) === 150; });
  G.expect(ansi("CAST('abc'")[1].indexOf('error:') === 0 && ansi("CAST('abc'")[2] === 'NULL' && ansi('1 / 0')[1].indexOf('DIVIDE_BY_ZERO') > 0, 'ANSI mode raises errors and the old mode returns NULL');
  G.expect(/PARSE_SYNTAX_ERROR/.test(QUAL), 'Spark 4.0.1 does not parse QUALIFY');
  G.expect(tie2.length === 2 && tie2[0][2] !== tie2[1][2] && tie2[0][3] === tie2[1][3], 'ROWS and RANGE differ on tied rows');
  G.expect(Number(TZ.rows[0][1]) !== Number(TZ.rows[0][2]) && TZ.rows.reduce(function (a, r) { return a + Number(r[1]); }, 0) === TZ.rows.reduce(function (a, r) { return a + Number(r[2]); }, 0), 'the time zone moves orders between days and loses none');
  var utcFirst = TZ.rows[0], utcLast = TZ.rows[TZ.rows.length - 1];

  LAB.addChapter({
    id: 'm8', n: 8, title: 'Spark SQL for pipelines', short: 'SQL', blurb: 'ANSI mode, windows, rollups, arrays, and the time zone that moves a day', minutes: 55,
    focus: ['stg', 'mart'],
    goals: [
      'Say what **ANSI mode** changes in Spark 4, and use `try_cast` and `try_divide` on purpose.',
      'Know what Spark SQL **does not have** (`QUALIFY`), and write the subquery that replaces it.',
      'Write **window functions**: running total, rank, lag. Choose between **ROWS** and **RANGE**.',
      'Use **ROLLUP**, **GROUPING** and **PIVOT** for reports.',
      'Use **arrays**: `transform`, `filter`, `aggregate`, `explode`, and `explode_outer`.',
      'Explain how the **session time zone** moves orders between days.'
    ],
    say: 'Mission 8 is the SQL that a Spark pipeline is made of. Most of it you know. What is specific to Spark 4 is the part that bites: ANSI mode, which turns quiet NULLs into errors, a window frame that gives a wrong running total when two rows tie, and a time zone that moves orders between days. I ran each on small tables and on the Brewline orders, and I kept the real error messages.',
    scenes: [
      B.talk({
        id: 'm8-what', t: 1, src: 'docs', title: 'Spark SQL on one page',
        say: 'Spark SQL is one of the two spellings of the same engine. Press Next for what to know before you write a line.',
        items: [
          ['How it runs', '`spark.sql("...")` parses the text into the same plan that the DataFrame API builds, so the two are equal, as mission 2 showed. A **temporary view** gives a DataFrame a name that SQL can use. A **table** in the catalog is a name for files: `CREATE TABLE ... USING parquet` or `USING delta`.', 'SQL text becomes a plan.'],
          ['What it has', 'Joins and subqueries, `GROUP BY` with `ROLLUP`, `CUBE` and `GROUPING SETS`, window functions, `PIVOT`, `LATERAL VIEW` with `explode`, higher-order functions on arrays (`transform`, `filter`, `aggregate`), `MERGE` on table formats, and hints in comments (`/*+ BROADCAST(t) */`).', 'A rich dialect.'],
          ['What it lacks', 'It is not the SQL of your warehouse. Spark 4.0.1 has **no `QUALIFY`**: the recording shows the parse error. Some functions have other names, and some warehouse types have no equivalent.', 'Not the warehouse dialect.'],
          ['Parameters, not string formatting', 'Pass values with **parameter markers**: `spark.sql("SELECT * FROM orders WHERE dt = :day", args={"day": "2026-11-05"})`. Never paste a value into the SQL text with an f-string: it breaks on a quote, and it is how injection starts.', 'Named markers, not f-strings.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'A habit worth having:', t: 'keep the SQL in files that analysts can read, run it with `spark.sql`, and test it on a tiny view. Mission 12 shows the test.' }
      }),

      B.widget({ id: 'm8-ansi', kind: 'ansilab', t: 1, src: 'rec', title: 'Lab: ANSI mode on and off' }),

      B.rows({
        id: 'm8-ansi-rows', t: 1, src: 'rec', title: 'What ANSI mode changed',
        steps: [
          {
            say: 'Spark 4 turned **ANSI mode on by default**. In Spark 3 the default was off. The setting is `spark.sql.ansi.enabled`, and the recording confirms the new default: ' + G.table('conf.defaults').rows.filter(function (r) { return r[0] === 'spark.sql.ansi.enabled'; })[0][1] + '. I ran eight expressions both ways. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'The same expression with ANSI mode on and off', c: 'raw', cols: ['expression', 'ANSI on (the default)', 'ANSI off'], rows: AN.rows.map(function (r) { return [r[0], String(r[1]).indexOf('error:') === 0 ? 'error ' + code(r[1]) : r[1], r[2]]; }), trk: 0 }],
            notes: ['Recorded: `spark.sql(...)` with the setting changed in the session. The full first line of each message is in the lab above.']
          },
          {
            say: 'Look at the second column. A bad cast, a division by zero, an integer overflow, an impossible date and an index out of range all **stop the query** with an error that has a **class** such as `' + code(ansi("CAST('abc'")[1]) + '` and `' + code(ansi('1 / 0')[1]) + '`. The message names the fix: a `try_` function.',
            tabs: [{ layer: 'RECORDED', name: 'The same expression with ANSI mode on and off', c: 'raw', cols: ['expression', 'ANSI on (the default)', 'ANSI off'], rows: AN.rows.map(function (r) { return [r[0], String(r[1]).indexOf('error:') === 0 ? 'error ' + code(r[1]) : r[1], r[2]]; }), trk: 0, chg: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1]] }],
            notes: ['An error with a class and an SQLSTATE can be caught, counted and reported by your own code. It is far better than a quiet wrong value.']
          },
          {
            say: 'Look at the third column. With ANSI off, the cast gives **NULL**, the division by zero gives **NULL**, and `2147483647 + 1` **wraps around** to **' + ansi('2147483647')[2] + '**, a negative number. `CAST(300 AS TINYINT)` gives **' + ansi('CAST(300')[2] + '**. No error. A report built on these is quietly wrong.',
            tabs: [{ layer: 'RECORDED', name: 'The same expression with ANSI mode on and off', c: 'raw', cols: ['expression', 'ANSI on (the default)', 'ANSI off'], rows: AN.rows.map(function (r) { return [r[0], String(r[1]).indexOf('error:') === 0 ? 'error ' + code(r[1]) : r[1], r[2]]; }), trk: 2, chg: [[2, 2], [3, 2]] }],
            notes: ['These are the values the old default produced. If a job of yours depended on them, an upgrade to Spark 4 will make it fail, and the failure is the information.']
          },
          {
            say: 'The last two rows are the way to say "NULL is fine here, and I know it": `try_cast` and `try_divide` return NULL for a bad input in either mode. Use them where bad rows are expected, then **count the NULLs** to know how many there were.',
            tabs: [{ layer: 'RECORDED', name: 'The same expression with ANSI mode on and off', c: 'raw', cols: ['expression', 'ANSI on (the default)', 'ANSI off'], rows: AN.rows.map(function (r) { return [r[0], String(r[1]).indexOf('error:') === 0 ? 'error ' + code(r[1]) : r[1], r[2]]; }), trk: 6, chg: [[6, 1], [7, 1]] }],
            notes: ['The set of `try_` functions includes `try_add`, `try_subtract`, `try_multiply`, `try_divide`, `try_cast` and `try_element_at`.']
          }
        ]
      }),

      B.code({
        id: 'm8-qualify', t: 1, src: 'rec', title: 'QUALIFY is not in Spark SQL', file: 'qualify.sql', lang: 'sql', code: SQ_QUAL + '\n\n-- the way that works, in Spark 4.0.1\n' + SQ_QUAL_OK,
        steps: [
          { say: 'Many warehouses let you filter on a window function with `QUALIFY`. Brewline\'s other courses used it. I tried it in Spark. Press Next.', lines: null },
          { say: 'The first query asks for the biggest order of each store with `QUALIFY r = 1`. Spark answered: **' + QUAL + '** The parser does not know the word. There is no `QUALIFY` in Spark 4.0.1.', lines: [1, 1] },
          { say: 'The way that works is a **subquery**: compute the window in the inner query, and filter on its result in the outer one. This second form is from the documentation. I did not run it, because the first form is what the recording tests.', lines: [3, 7] }
        ],
        note: 'Recorded: the error of Spark 4.0.1 for the first query. The subquery form is standard SQL and works in every Spark version.'
      }),

      B.sql({
        id: 'm8-windows', t: 1, src: 'rec', title: 'Window functions: running total, rank, previous value', file: 'windows.sql', code: SQ_WIN,
        steps: [
          { say: 'A window function computes a value for **each row** from a set of related rows, without collapsing them. Here is a small table of takings, two stores and a few days. Press Next.', lines: null },
          { say: '`PARTITION BY store` splits the rows by store. Each store gets its own window, like a separate group. `ORDER BY day` sorts inside it.', lines: G.span(SQ_WIN, /PARTITION BY store ORDER BY day\) AS running/) },
          { say: '`SUM(cents) OVER (...)` with an `ORDER BY` is a **running total**: each row sums its own value and all the rows before it. Day 2 of s01 is 100 plus 150, which is 250.', lines: G.span(SQ_WIN, /SUM\(cents\)/) },
          { say: '`RANK()` numbers the rows by cents, biggest first. Two rows with the same value get the **same rank**, and the next rank is skipped. `LAG(cents)` is the value of the previous row, or NULL for the first.', lines: G.span(SQ_WIN, /RANK\(\)/, /LAG/), run: true }
        ],
        result: { cols: WI.cols, rows: nul(WI.rows), msg: WI.rows.length + ' rows' },
        note: 'Recorded on Spark 4.0.1. The first row of each store has NULL for the previous value, because there is none.'
      }),

      B.sql({
        id: 'm8-ties', t: 2, src: 'rec', title: 'ROWS and RANGE: when two rows tie', file: 'ties.sql', code: SQ_TIES,
        steps: [
          { say: 'The same running total can be written two ways, and they differ when two rows have the same value. Store s01 has two days with 150 cents. Press Next.', lines: null },
          { say: '`ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` counts **physical rows**: the rows before this one, and this one. Each row gets its own running total.', lines: G.span(SQ_TIES, /ROWS BETWEEN/) },
          { say: '`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` counts **peers**: all the rows whose sort value is equal to this one\'s are included. The two rows with 150 get the same total.', lines: G.span(SQ_TIES, /RANGE BETWEEN/), run: true }
        ],
        result: { cols: TI.cols, rows: nul(TI.rows), msg: TI.rows.length + ' rows' },
        note: 'Recorded. With `ORDER BY` and no frame, the default is **RANGE**. That is why a plain running total jumps over a value when there are ties.'
      }),

      B.bug({
        id: 'm8-bug', t: 2, q: 'This query should give a running total of takings by size. Two days tie at 150 cents, and the report shows 490 for both of them, with no 340 anywhere. Click the line that causes it.',
        file: 'running.sql', lang: 'sql',
        code: ['SELECT day, cents,', '       SUM(cents) OVER (ORDER BY cents) AS running', 'FROM daily', "WHERE store = 's01'"].join('\n'),
        bad: [2],
        hint: 'What is the default frame when there is an ORDER BY and no frame?',
        why: 'With an `ORDER BY` and no frame, the default is **RANGE**, which includes all the rows that tie with the current one. The two rows with 150 both get 490. In the recording, the `ROWS` frame gave **' + tie2[0][2] + '** and **' + tie2[1][2] + '**, and the `RANGE` frame gave **' + tie2[0][3] + '** for both. Write `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, or sort by a unique column.',
        fix: ['SELECT day, cents,', '       SUM(cents) OVER (ORDER BY cents, day ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running', 'FROM daily', "WHERE store = 's01'"].join('\n'),
        cheer: 'Say ROWS when you mean rows.'
      }),

      B.talk({
        id: 'm8-winrules', t: 1, src: 'docs', title: 'Window functions: the rules to remember',
        say: 'Windows are the part of SQL that interviews like. Press Next for the rules.',
        items: [
          ['Row number, rank, dense rank', '`ROW_NUMBER()` gives 1, 2, 3 with no ties: a unique number, in an order you must make deterministic. `RANK()` gives ties the same rank and then skips. `DENSE_RANK()` gives ties the same rank and does not skip. To keep the latest row of each key, use `ROW_NUMBER() ... = 1`.', 'Pick by what a tie should do.'],
          ['LAG, LEAD, FIRST_VALUE', '`LAG(x)` is the previous row\'s value and `LEAD(x)` the next. `FIRST_VALUE` and `LAST_VALUE` take the first or last of the frame, and `LAST_VALUE` with the default frame returns the current row. Check the frame.', 'Mind the frame.'],
          ['The default frame', 'With no `ORDER BY`, the frame is the **whole partition**. With an `ORDER BY` and no frame, it is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. Name the frame whenever it matters.', 'Name the frame.'],
          ['The cost', 'A window by a key needs **every row of the key in one task**: a shuffle by the key, and a sort. It cannot add up in pieces, so it feels skew. Mission 5 recorded a busiest task of ' + n0(SKW[4]) + ' records against a median of about ' + n0(Math.round(Number(SKW[3]))) + ' for a window by store.', 'A shuffle and a sort, and skew.'],
          ['Keep the latest row', 'Without `QUALIFY`, wrap the window in a subquery and filter on the number. For simple cases `max_by(col, ordering)` or an aggregate with a join can be cheaper than a window.', 'Subquery, or max_by.']
        ],
        cols: 1
      }),

      B.sql({
        id: 'm8-rollup', t: 2, src: 'rec', title: 'ROLLUP and GROUPING: subtotals in one query', file: 'rollup.sql', code: SQ_ROLL,
        steps: [
          { say: 'A report often wants the detail, the subtotals and the grand total. `ROLLUP` makes all three from one pass. The table is five small rows of sales by country and channel. Press Next.', lines: null },
          { say: '`GROUP BY ROLLUP (country, channel)` groups by country and channel, then by country alone, then by nothing. The extra rows have **NULL** in the columns that were rolled up.', lines: G.span(SQ_ROLL, /GROUP BY ROLLUP/) },
          { say: 'But a real NULL in the data looks the same. `GROUPING(col)` is **1** on a rolled-up row and **0** on a real one. Use it to tell a subtotal from a missing value, and to label the rows.', lines: G.span(SQ_ROLL, /GROUPING\(country\)/), run: true }
        ],
        result: { cols: RO.cols, rows: nul(RO.rows), msg: RO.rows.length + ' rows' },
        note: 'Recorded. `CUBE` makes every combination, and `GROUPING SETS` lets you list exactly the groupings you want.'
      }),

      B.sql({
        id: 'm8-pivot', t: 2, src: 'rec', title: 'PIVOT: rows into columns', file: 'pivot.sql', code: SQ_PIV,
        steps: [
          { say: 'The same sales, with the channels turned into columns. Press Next.', lines: null },
          { say: '`PIVOT (SUM(n) FOR channel IN (\'app\', \'pos\'))` takes the values of `channel` and makes one column for each, with the sum of `n` in it. You must **list the values**, because Spark has to know the columns before it runs.', lines: G.span(SQ_PIV, /PIVOT/), run: true }
        ],
        result: { cols: PI.cols, rows: nul(PI.rows), msg: PI.rows.length + ' rows' },
        note: 'Recorded. If a new channel appears, it is not in the list and does not show. A pivot with a changing list belongs in a report, and not in a pipeline.'
      }),

      B.sql({
        id: 'm8-arrays', t: 1, src: 'rec', title: 'Arrays: transform, filter, aggregate', file: 'arrays.sql', code: SQ_ARR,
        steps: [
          { say: 'Spark SQL can work inside an array without exploding it. Three rows, with an array each: `[3, 1, 2]`, `[5, 5]` and an empty one. Press Next.', lines: null },
          { say: '`transform(xs, x -> x * 10)` applies a function to **each element** and returns a new array. The part `x -> x * 10` is a lambda.', lines: G.span(SQ_ARR, /transform/) },
          { say: '`filter(xs, x -> x > 1)` keeps the elements that pass. `aggregate(xs, 0, (acc, x) -> acc + x)` folds the array into a single value, starting from 0. `sort_array(xs)` sorts.', lines: G.span(SQ_ARR, /filter\(xs/), run: true }
        ],
        result: { cols: AR.cols, rows: nul(AR.rows), msg: AR.rows.length + ' rows' },
        note: 'Recorded. The empty array gives an empty array and a total of 0. These functions run in the JVM, with no Python, and the optimiser can see them.'
      }),

      B.sql({
        id: 'm8-explode', t: 1, src: 'rec', title: 'explode and explode_outer: an order line for each row', file: 'explode.sql', code: SQ_EXP,
        steps: [
          { say: 'Sometimes you want one row for each element. `explode` does that. Press Next.', lines: null },
          { say: '`LATERAL VIEW explode(xs) e AS x` pairs each row with every element of its own array. Row 1 has three elements and becomes ' + EXP.explode.filter(function (r) { return r[0] === 1; }).length + ' rows. Row 2 gives ' + EXP.explode.filter(function (r) { return r[0] === 2; }).length + '.', lines: G.span(SQ_EXP, /LATERAL VIEW/), run: true },
          { say: 'Look at id 3: it has an empty array, and it **disappears**. `explode` drops rows whose array is empty or NULL. `LATERAL VIEW OUTER explode` (or `explode_outer`) keeps it with a NULL element.', lines: null }
        ],
        result: { cols: ['id', 'x'], rows: EXP.explode.map(function (r) { return [String(r[0]), String(r[1])]; }), msg: EXP.explode.length + ' rows' },
        note: 'Recorded. With `explode_outer` the same query gives ' + EXP.explode_outer.length + ' rows: the extra one is `' + JSON.stringify(EXP.explode_outer[EXP.explode_outer.length - 1]) + '`. Dropping rows without saying so is a classic silent bug in order-line pipelines.'
      }),

      B.rows({
        id: 'm8-tz', t: 1, src: 'rec', title: 'The session time zone moves a day',
        steps: [
          {
            say: 'Orders have a timestamp. Which day does an order belong to? It depends on the **time zone of the session**. I counted the same orders by day twice: with `spark.sql.session.timeZone` set to UTC, and set to Singapore, eight hours ahead. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Orders for each day, in two time zones', c: 'raw', cols: ['day', 'UTC', 'Singapore'], rows: TZ.rows.map(function (r) { return [r[0], n0(r[1]), n0(r[2])]; }), trk: 0 }],
            notes: ['Recorded: `date_format(order_ts, "yyyy-MM-dd")` and a count by day. The data is the same.']
          },
          {
            say: 'The middle days barely change. The first and the last do. On the first day, UTC counts **' + n0(utcFirst[1]) + '** orders and Singapore **' + n0(utcFirst[2]) + '**: the orders from late in the evening of the 31st, Singapore time, are on the 1st in UTC. The last day, ' + utcLast[0] + ', has **' + n0(utcLast[1]) + '** in UTC and **' + n0(utcLast[2]) + '** in Singapore.',
            tabs: [{ layer: 'RECORDED', name: 'Orders for each day, in two time zones', c: 'raw', cols: ['day', 'UTC', 'Singapore'], rows: TZ.rows.map(function (r) { return [r[0], n0(r[1]), n0(r[2])]; }), trk: 0, chg: [[0, 1], [0, 2], [TZ.rows.length - 1, 1], [TZ.rows.length - 1, 2]] }],
            notes: ['A Singapore day of 5 November is two UTC days, as in the BigQuery course. The same rule applies to any engine.']
          },
          {
            say: 'No order is lost: the two columns add up to the same total. Orders **move** between days. A daily revenue report that runs on a server in UTC, and one run by an analyst in Singapore, give different numbers for the same day, and both are right.',
            tabs: [{ layer: 'RECORDED', name: 'The totals', c: 'raw', cols: ['time zone', 'orders in all'], rows: [['UTC', n0(TZ.rows.reduce(function (a, r) { return a + Number(r[1]); }, 0))], ['Singapore', n0(TZ.rows.reduce(function (a, r) { return a + Number(r[2]); }, 0))]], trk: 0 }],
            notes: ['Decide the time zone of the business once, set `spark.sql.session.timeZone` in the job, and store a UTC timestamp. Mission 0 set UTC for every recording.']
          }
        ]
      }),

      B.talk({
        id: 'm8-spark4', t: 3, src: 'docs', title: 'Extra: what else is new in Spark 4 SQL',
        say: 'Besides ANSI mode, the Spark 4.0.0 release notes list several SQL features. Press Next for the ones I could confirm. I did not run these, so they are from the documentation.',
        items: [
          ['VARIANT', 'A data type for **semi-structured data** such as JSON, stored in a binary form that Spark can read faster than a JSON string. You query it by path, and you do not have to declare a schema first.', 'Semi-structured data, with a type.'],
          ['SQL pipe syntax', 'A way to write a query as a **pipeline of steps** separated by `|>`, read from top to bottom, as an alternative to nested subqueries.', 'A query as a pipeline.'],
          ['String collation', 'Rules for comparing and sorting strings, such as case-insensitive or accent-insensitive, attached to a column or an expression.', 'Rules for comparing strings.'],
          ['Session variables', 'Variables with `DECLARE VARIABLE` and `SET VAR`, for use in a session\'s queries.', 'Variables in SQL.'],
          ['Spark Connect and the thin Python client', 'A lightweight Python package, `pyspark-client`, talks to a Spark server instead of starting a JVM on your machine, and a Spark Connect enabled distribution is available.', 'A client without a JVM.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The source:', t: 'the Spark 4.0.0 release notes at spark.apache.org. Check them for the status of each feature in the version that you run.' }
      }),

      B.decide({
        id: 'm8-dec', t: 2, src: 'docs', title: 'Decision: how to pass the date into a query',
        scenario: 'A nightly job runs a SQL file for one day of orders. The date comes from the scheduler as text, like `2026-11-05`. Last month someone passed a value with a quote in it and the job failed. You choose how the date reaches the query.',
        opts: [
          { t: 'Build the SQL text with an f-string: f"... WHERE dt = \'{day}\'"', d: 'Simple, and it works for every normal date.', lose: 'A quote or a bad value changes the SQL, or breaks it. It is also how injection starts.' },
          { t: 'Use a named parameter marker: `WHERE dt = :day`, and pass `args={"day": day}`', d: 'The value is a value, not part of the text.', lose: '' },
          { t: 'Rewrite the query in the DataFrame API with a Python variable', d: 'No SQL text at all.', lose: 'It works, but analysts can no longer read or change the logic in a SQL file, which was the reason for the file.' }
        ],
        pick: 1,
        why: 'Parameter markers keep the value out of the SQL text. They also keep the plan the same for every date, and the query file stays readable and testable.',
        when: 'For the name of a table or a column, markers do not work. Use the `IDENTIFIER()` clause with a marker, or validate the name against a list, and never paste an unchecked name.'
      }),

      B.incident({
        id: 'm8-inc', t: 1, src: 'rec', title: 'Incident: the upgrade made the job fail', time: '05:45',
        alert: '**The nightly partner load fails after yesterday\'s upgrade to Spark 4.** The error is `[CAST_INVALID_INPUT] The value \'N/A\' of the type "STRING" cannot be cast to "INT" because it is malformed.` The same code ran for two years.',
        clues: ['The job casts a column of a partner file to int', 'Some rows of the partner file contain the text N/A', 'Spark 3 returned NULL for those rows and the job did not notice'],
        opts: [
          { t: 'Use `try_cast`, count and report the rows that became NULL, and talk to the partner. Keep ANSI mode on', fb: '' },
          { t: 'Set `spark.sql.ansi.enabled` to false so that it works like before', fb: 'It hides the bad rows again. The data was always bad, and now you can see it.' },
          { t: 'Delete the column', fb: 'The business needs it.' },
          { t: 'Roll back to Spark 3', fb: 'You would give up the fix and keep the problem.' }
        ],
        best: 0,
        why: 'Spark 3 turned a bad value into NULL and said nothing. Spark 4 stops and tells you. In the recording, `CAST(\'abc\' AS INT)` gave an error with ANSI on and NULL with it off. `try_cast` is the explicit form of "NULL is fine", and you count the NULLs.',
        checks: [
          ['Read the error class', '`CAST_INVALID_INPUT` names the value and the type. It points to `try_cast`.'],
          ['Find the rows', 'Select the rows where `try_cast(col AS INT)` is NULL and `col` is not NULL.'],
          ['Fix it', 'Use `try_cast`, write the bad rows to a quarantine table, and fail the job only if there are too many.'],
          ['Guard', 'A test with a bad value in the sample data, and a metric for the number of rejected rows.']
        ],
        tell: 'The job started failing on Spark 4 because ANSI mode raises an error for a cast that used to give NULL. A partner file had N/A in a numeric column, and it always did. I used try_cast, wrote the bad rows to a quarantine table, and added a metric for the count.',
        prevent: ['Keep ANSI mode on', 'try_cast with a quarantine table and a count', 'A bad row in the test data']
      }),

      B.quiz({
        id: 'm8-q1', t: 1,
        q: 'With the default settings of Spark 4, what does `SELECT 1 / 0` return?',
        opts: [{ t: 'NULL', fb: 'That was the Spark 3 default.' }, { t: 'An error, DIVIDE_BY_ZERO', fb: '' }, { t: 'Infinity', fb: 'Not in Spark SQL.' }, { t: '0', fb: 'No.' }],
        ok: 1,
        why: 'The recording: ' + firstLine(ansi('1 / 0')[1]).slice(0, 80) + '... With ANSI off it gave NULL.'
      }),

      B.quiz({
        id: 'm8-q2', t: 1,
        q: 'How do you keep the latest row of each key in Spark SQL, which has no QUALIFY?',
        opts: [{ t: 'Use QUALIFY anyway', fb: 'The parser rejects it.' }, { t: 'Number the rows in a subquery with ROW_NUMBER() and filter on the number outside', fb: '' }, { t: 'Use DISTINCT', fb: 'It does not choose the latest.' }, { t: 'Use ORDER BY and LIMIT 1', fb: 'That gives one row in all.' }],
        ok: 1,
        why: 'The recording shows the error: ' + QUAL + ' The subquery form works everywhere.'
      }),

      B.quiz({
        id: 'm8-q3', t: 2,
        q: 'Two rows tie on the ORDER BY of `SUM(x) OVER (ORDER BY x)`. What do they get?',
        opts: [{ t: 'Different running totals, in a random order', fb: 'The default frame does not do that.' }, { t: 'The same running total, because RANGE includes all peers', fb: '' }, { t: 'An error', fb: 'It is valid.' }, { t: 'NULL', fb: 'No.' }],
        ok: 1,
        why: 'Both rows with 150 cents got ' + tie2[0][3] + ' under RANGE, and ' + tie2[0][2] + ' and ' + tie2[1][2] + ' under ROWS.'
      }),

      B.quiz({
        id: 'm8-q4', t: 1,
        q: 'An array column is empty for one row. You run `LATERAL VIEW explode(xs)`. What happens to that row?',
        opts: [{ t: 'It stays with a NULL element', fb: 'That is explode_outer.' }, { t: 'It disappears from the result', fb: '' }, { t: 'The query fails', fb: 'It is valid.' }, { t: 'It is repeated twice', fb: 'No.' }],
        ok: 1,
        why: 'The recording had ' + EXP.explode.length + ' rows with `explode` and ' + EXP.explode_outer.length + ' with `explode_outer`.'
      }),

      B.quiz({
        id: 'm8-q5', t: 1,
        q: 'The same daily revenue report gives different numbers on a UTC server and in Singapore. Why?',
        opts: [{ t: 'One of them is wrong', fb: 'Both are right for their own day.' }, { t: 'The session time zone assigns orders near midnight to different days', fb: '' }, { t: 'Spark sorts differently', fb: 'Sorting is not the cause.' }, { t: 'ANSI mode', fb: 'Not related.' }],
        ok: 1,
        why: 'The first day had ' + n0(utcFirst[1]) + ' orders in UTC and ' + n0(utcFirst[2]) + ' in Singapore. The totals were equal.'
      }),

      B.order({
        id: 'm8-ord', t: 2, q: 'Put the steps of "the latest row of each customer" in order.',
        items: [
          'Write the inner query with ROW_NUMBER() OVER (PARTITION BY customer ORDER BY updated_at DESC)',
          'Make the ORDER BY deterministic (add a unique tie-breaker)',
          'Wrap it in a subquery',
          'Filter on the row number = 1 in the outer query',
          'Check the row count against the number of customers',
          'Look at the stage table for a hot customer key'
        ],
        why: 'There is no QUALIFY, so the filter goes outside. A tie-breaker keeps the result stable, and the count proves that you kept one row for each key.'
      }),

      B.qa({
        id: 'qa-ansi', t: 1, tag: 'Spark SQL', secs: 75,
        q: 'What is ANSI mode in Spark 4, and why does it matter for pipelines?',
        pts: ['spark.sql.ansi.enabled, on by default in Spark 4', 'Bad cast, divide by zero, overflow raise errors', 'Off: NULL or wrapped numbers, silently', 'try_cast, try_divide, try_add for expected bad input', 'Count the rejects; quarantine', 'Upgrade risk: jobs that relied on NULLs'],
        short: 'ANSI mode makes Spark follow standard SQL rules for errors. In Spark 4 it is **on by default**. A bad cast, a division by zero, an integer overflow or an index out of range raises an error with a class like `CAST_INVALID_INPUT` or `DIVIDE_BY_ZERO`. With it off, as in Spark 3, the same expressions gave NULL or a wrapped number and the job carried on. For a pipeline, the error is the better behaviour: bad data is found on the day it arrives. Where bad rows are expected, I use `try_cast` or `try_divide`, count the NULLs it produces, and put the rejects in a quarantine table. The risk is the upgrade: a job that depended on quiet NULLs will start to fail, and the failure is telling me something true.',
        fu: [['Would you turn it off?', 'Not as a first move. It hides bad data. I would fix the cast or use a try function, and turn it off only for a legacy job with a plan to fix it.'], ['What does overflow do with ANSI off?', 'It wraps around: 2147483647 plus 1 became -2147483648 in my test.']],
        trap: 'Saying that the error is a bug in Spark 4.',
        real: 'Your job fails after an upgrade with a cast error. What do you do?'
      }),

      B.qa({
        id: 'qa-windowsql', t: 1, tag: 'Spark SQL', secs: 90,
        q: 'Explain window functions, and the difference between ROWS and RANGE.',
        pts: ['A value for each row from related rows, no collapse', 'PARTITION BY, ORDER BY, frame', 'ROW_NUMBER, RANK, DENSE_RANK, LAG, LEAD, running SUM', 'ROWS: physical rows; RANGE: all peers', 'Default with ORDER BY is RANGE', 'Cost: shuffle by the key and a sort; feels skew'],
        short: 'A window function computes a value for each row from a set of related rows, called the window, without collapsing the rows as a group by does. I define the window with `PARTITION BY`, an `ORDER BY` and sometimes a frame. I use `ROW_NUMBER` to keep the latest row of a key, `RANK` and `DENSE_RANK` when ties matter, `LAG` and `LEAD` to compare with neighbours, and `SUM` over a frame for a running total. The frame matters: **ROWS** counts physical rows, and **RANGE** includes all peers that tie on the sort value, and RANGE is the default when there is an ORDER BY and no frame. In my test, two days with 150 cents both got a running total of 490 under RANGE, and 340 and 490 under ROWS. A window needs all the rows of a key in one task, so it costs a shuffle and a sort, and a hot key makes a hot task.',
        fu: [['How do you get the top N for each group?', 'ROW_NUMBER in a subquery, filtered to N or less, since Spark has no QUALIFY.'], ['LAST_VALUE gives me the current row. Why?', 'The default frame stops at the current row. Use a frame to UNBOUNDED FOLLOWING.']],
        trap: 'Using RANK when you wanted one row for each key.',
        real: 'Write a query for the second-largest order of each store.'
      }),

      B.qa({
        id: 'qa-sqlpitfalls', t: 2, tag: 'Spark SQL', secs: 75,
        q: 'What are the pitfalls of Spark SQL in a production pipeline?',
        pts: ['ANSI errors after the upgrade; try_ functions', 'No QUALIFY: subquery', 'NOT IN with NULLs', 'explode drops empty arrays', 'Window frame default RANGE', 'Session time zone moves days', 'Parameter markers, not f-strings'],
        short: 'I keep a short list. Since Spark 4, **ANSI mode** raises errors where Spark 3 gave NULL, so I use `try_cast` on purpose and count the rejects. There is **no QUALIFY**, so I filter a window in a subquery. **NOT IN** returns nothing if the subquery has a NULL, so I use NOT EXISTS. **explode** drops rows with an empty or NULL array, so I use `explode_outer` when I must keep them. A window with an ORDER BY and no frame uses **RANGE**, which merges ties. The **session time zone** decides which day an order belongs to, so I set it in the job. And I pass values with **parameter markers** and never with an f-string. Most of these I have seen as real results on the Brewline data.',
        fu: [['How do you test SQL?', 'Run it on a tiny view in a unit test, with the awkward rows: NULLs, ties, empty arrays, a bad cast.'], ['Where do you keep SQL?', 'In files that analysts can read, run through `spark.sql` with parameters.']],
        trap: 'Assuming that warehouse SQL runs unchanged.',
        real: 'Tell me about a wrong number that came from a SQL detail.'
      }),

      B.recap({
        id: 'm8-recap', n: 8, badge: 'SQL Smith', color: '#FDE68A',
        pts: [
          'Spark 4 has **ANSI mode on**. A bad cast gave an error, and with it off gave **NULL**. `2147483647 + 1` wrapped to ' + ansi('2147483647')[2] + '. Use `try_cast` and count the rejects.',
          'Spark 4.0.1 has **no QUALIFY**: ' + code(QUAL) + '. Filter a window in a subquery.',
          '**Windows** keep all rows. With an `ORDER BY` and no frame the default is **RANGE**, and ties share a total: ' + tie2[0][3] + ' for both, against ' + tie2[0][2] + ' and ' + tie2[1][2] + ' with ROWS.',
          '**ROLLUP** makes subtotals, and `GROUPING()` tells them from real NULLs. **PIVOT** needs the list of values.',
          '`explode` drops empty arrays: ' + EXP.explode.length + ' rows against ' + EXP.explode_outer.length + ' with `explode_outer`.',
          'The **time zone** moved orders between days: ' + n0(utcFirst[1]) + ' against ' + n0(utcFirst[2]) + ' on the first day. Pass values with **parameter markers**.'
        ],
        lines: [
          'I use try_cast on purpose and count the rejects.',
          'I say ROWS when I mean rows.',
          'I set the time zone in the job.'
        ]
      })
    ]
  });
})();
