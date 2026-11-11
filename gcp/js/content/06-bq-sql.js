/* Mission 6: SQL for pipelines. De-duplication with QUALIFY, nested data with UNNEST, windows, calendars that expose missing days, MERGE and the five ways to load a day,
   slowly changing dimensions, the NULL trap, and tests written as queries. The SQL is BigQuery SQL. It was translated by sqlglot and RUN IN DUCKDB on made-up orders, because
   BigQuery was not reachable: the logic of these statements is the same, and the engine, the bytes and the timings are not BigQuery's. The service rules are from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var DD = G.counts('sql.dedup'), RD = G.table('sql.redelivered'), UN = G.table('sql.unnest'), TS = G.table('sql.top_store'), GP = G.table('sql.gaps'), CK = G.table('sql.checks'), TR = G.table('sql.translations');
  var IR = G.table('idem.runs'), IW = G.counts('idem.world'), NT = G.counts('sql.null_trap'), SD = G.counts('sql.scd2'), SF = G.table('sql.scd2_first'), W0 = G.counts('sql.world');
  var LOADS = G.file('code/loads.py'), SCD = G.file('sql/scd2.sql'), WH = G.file('code/warehouse.py');
  G.expect(DD.raw_rows === 20600 && DD.after_qualify === 20000 && DD.ids_delivered_twice === 600 && DD.new_became_paid_on_second_delivery === 45, 'the dedupe counts');
  G.expect(NT.not_in_rows === 0 && NT.not_exists_rows > 0 && NT.refunded_orders_without_customer > 0, 'the NOT IN trap');
  G.expect(SD.rows_after_first === 5 && SD.rows_after_second === 5 && SD.second_run_changes_nothing === true, 'the SCD2 runs');
  G.expect(GP.rows.length === 1 && GP.rows[0][0] === '2026-11-06' && TS.rows.length === 6 && UN.rows.length === 5 && CK.rows.length === 5, 'the recorded results');
  var run = function (method, step) { return IR.rows.filter(function (r) { return r[0] === method && r[1] === step; })[0]; };
  G.expect(run('append', 'the same batch again')[4] === 1402 && run('merge', 'corrected batch')[4] === 8 && run('merge_and_delete', 'corrected batch')[4] === 0 && run('overwrite_partition', 'corrected batch')[4] === 0 && run('reload_all', 'corrected batch')[4] === 0, 'the idempotency results');
  var n0 = function (x) { return x.toLocaleString('en-US'); };
  var Q_DEDUP = [
    'CREATE OR REPLACE TABLE `brewline-dev.staging.orders_dedup` AS',
    'SELECT * EXCEPT (ingest_ts)',
    'FROM `brewline-dev.raw.orders_raw`',
    'QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY ingest_ts DESC) = 1;'
  ].join('\n');
  var Q_UNNEST = [
    'SELECT i.sku,',
    '       SUM(i.qty) AS units,',
    '       SUM(i.qty * i.unit_cents) AS revenue_cents',
    'FROM `brewline-dev.curated.orders` AS o, UNNEST(o.items) AS i',
    'WHERE o.status = \'PAID\'',
    'GROUP BY i.sku',
    'ORDER BY revenue_cents DESC',
    'LIMIT 5;'
  ].join('\n');
  var Q_WIN = [
    'SELECT country, store_id, revenue_cents, rnk',
    'FROM (',
    '  SELECT s.country, o.store_id, SUM(o.total_cents) AS revenue_cents,',
    '         RANK() OVER (PARTITION BY s.country ORDER BY SUM(o.total_cents) DESC) AS rnk',
    '  FROM `brewline-dev.curated.orders` AS o',
    '  JOIN `brewline-dev.curated.stores` AS s USING (store_id)',
    '  WHERE o.status = \'PAID\'',
    '  GROUP BY s.country, o.store_id',
    ')',
    'WHERE rnk = 1',
    'ORDER BY revenue_cents DESC;'
  ].join('\n');
  var Q_GAP = [
    'WITH calendar AS (',
    '  SELECT d FROM UNNEST(GENERATE_DATE_ARRAY(DATE \'2026-10-28\', DATE \'2026-11-10\')) AS d',
    '),',
    'daily AS (',
    '  SELECT DATE(order_ts) AS d, COUNT(*) AS orders',
    '  FROM `brewline-dev.staging.s12_orders`',
    '  GROUP BY d',
    ')',
    'SELECT calendar.d, IFNULL(daily.orders, 0) AS orders',
    'FROM calendar LEFT JOIN daily USING (d)',
    'WHERE IFNULL(daily.orders, 0) = 0',
    'ORDER BY 1;'
  ].join('\n');
  var Q_NULL = [
    '-- 1. looks right: customers who never had a refund',
    'SELECT COUNT(*) FROM `brewline-dev.curated.customers`',
    'WHERE customer_id NOT IN (',
    '  SELECT customer_id FROM `brewline-dev.curated.orders` WHERE status = \'REFUNDED\'',
    ');',
    '',
    '-- 2. the same question, with NOT EXISTS',
    'SELECT COUNT(*) FROM `brewline-dev.curated.customers` AS c',
    'WHERE NOT EXISTS (',
    '  SELECT 1 FROM `brewline-dev.curated.orders` AS o',
    '  WHERE o.customer_id = c.customer_id AND o.status = \'REFUNDED\'',
    ');'
  ].join('\n');
  var BUGM = [
    'MERGE `brewline-dev.curated.orders` AS t',
    'USING `brewline-dev.raw.orders_raw` AS s',
    'ON t.order_id = s.order_id',
    'WHEN MATCHED THEN UPDATE SET status = s.status',
    'WHEN NOT MATCHED THEN INSERT ROW'
  ].join('\n');
  var FIXM = [
    'MERGE `brewline-dev.curated.orders` AS t',
    'USING (',
    '  SELECT * FROM `brewline-dev.raw.orders_raw`',
    '  QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY ingest_ts DESC) = 1',
    ') AS s',
    'ON t.order_id = s.order_id',
    'WHEN MATCHED THEN UPDATE SET status = s.status',
    'WHEN NOT MATCHED THEN INSERT ROW'
  ].join('\n');
  var BUGN = [
    'SELECT COUNT(*) AS customers_without_refund',
    'FROM `brewline-dev.curated.customers`',
    'WHERE customer_id NOT IN (',
    '  SELECT customer_id FROM `brewline-dev.curated.orders` WHERE status = \'REFUNDED\'',
    ');'
  ].join('\n');
  var FIXN = [
    'SELECT COUNT(*) AS customers_without_refund',
    'FROM `brewline-dev.curated.customers` AS c',
    'WHERE NOT EXISTS (',
    '  SELECT 1 FROM `brewline-dev.curated.orders` AS o',
    '  WHERE o.customer_id = c.customer_id AND o.status = \'REFUNDED\'',
    ');'
  ].join('\n');

  LAB.addChapter({
    id: 'm6', n: 6, title: 'BigQuery SQL for pipelines', short: 'SQL', blurb: 'QUALIFY, UNNEST, windows, MERGE, five ways to load a day, slowly changing dimensions, the NULL trap and tests as queries', minutes: 54,
    focus: ['stg', 'int', 'mart'],
    goals: [
      'Remove **repeats** with `QUALIFY` and a window, and say which delivery wins.',
      'Read **nested** data with `UNNEST`, rank with a **window**, and expose missing days with a **calendar**.',
      'Compare **five ways** to load a day, and say which are safe to run twice.',
      'Write a **slowly changing dimension** with `MERGE`.',
      'Avoid the **NULL trap** of `NOT IN`.',
      'Write **tests as queries** that return rows when something is wrong.'
    ],
    say: 'Mission 6 is the SQL that a data engineer writes every week: remove repeats, flatten lists, rank, fill calendars, merge a day, keep history of a dimension. The statements are BigQuery SQL. I translated them with sqlglot and ran them in DuckDB on the made-up Brewline orders, so every result you see is a real result of that SQL on that data. DuckDB is not BigQuery, and I show you exactly what the translation changed. The question that matters most is the one in the middle: which way of loading a day survives a retry.',
    scenes: [
      B.talk({
        id: 'm6-how', t: 1, src: 'rec', title: 'How the SQL in this course ran',
        say: 'You should know exactly what produced these results. Press Next for each piece.',
        items: [
          ['The SQL is BigQuery SQL', 'Everything you read is written in the GoogleSQL dialect of BigQuery: backticks around `project.dataset.table`, `COUNTIF`, `QUALIFY`, `UNNEST`, `MERGE`, and so on. You could paste it into the console.', 'The text is BigQuery.'],
          ['sqlglot translates, DuckDB runs', 'BigQuery was not reachable, so **sqlglot ' + G.meta('sqlglot') + '** rewrote each statement into the dialect of **DuckDB ' + G.meta('duckdb') + '**, and DuckDB ran it on the made-up orders. Joins, windows, `MERGE`, `UNNEST` and `QUALIFY` mean the same in both.', 'Same logic, a different engine.'],
          ['What is not the same', 'The time, the plan, the slots and the bytes are DuckDB\'s, so none of them says anything about BigQuery. Corner cases can differ: for example how `NULL` sorts, or approximate functions, which use another algorithm. A stand-in for `FARM_FINGERPRINT` is used where a hash is needed.', 'Logic yes. Cost and speed no.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'See the translation:', t: 'the screen after the next one shows four statements next to the DuckDB SQL that really ran.' }
      }),

      B.rows({
        id: 'm6-trans', t: 2, src: 'rec', title: 'What the translation changed',
        steps: [{
          say: 'Four statements, and the SQL that DuckDB ran for each. Look at what moved: `EXCEPT` became `EXCLUDE`, `COUNTIF` became `COUNT_IF`, `SAFE_DIVIDE` became a `CASE`, and an `ORDER BY` got `NULLS FIRST`, because BigQuery sorts nulls first when ascending and DuckDB by default does not.',
          tabs: [{ layer: 'RECORDED', name: 'BigQuery SQL, and the SQL that ran', c: 'raw', cols: TR.cols, rows: TR.rows, trk: 0 }],
          notes: ['Recorded with sqlglot ' + G.meta('sqlglot') + ' (BigQuery to DuckDB). The translation is the reason to trust the logic and not the timing.']
        }]
      }),

      B.sql({
        id: 'm6-dedup', t: 1, src: 'rec', title: 'Remove repeats with QUALIFY', file: 'dedup.sql', code: Q_DEDUP,
        ctx: { role: 'analyst@brewline-dev', wh: 'DuckDB (BigQuery SQL translated)', db: 'brewline-dev' },
        steps: [
          { say: 'Delivery is at least once, so the raw table holds ' + n0(DD.raw_rows) + ' rows for ' + n0(DD.after_qualify) + ' orders. This statement keeps one row for each order: the latest. Press Next.', lines: null },
          { say: '`ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY ingest_ts DESC)` numbers the deliveries of each order, newest first. Number 1 is the latest.', lines: G.span(Q_DEDUP, /ROW_NUMBER/) },
          { say: '`QUALIFY` is a filter on a window function. Without it you would need a subquery. `= 1` keeps the latest delivery.', lines: G.span(Q_DEDUP, /QUALIFY/) },
          { say: '`SELECT * EXCEPT (ingest_ts)` returns every column but the load time, which has done its job. Press Run.', lines: G.span(Q_DEDUP, /SELECT \* EXCEPT/), run: true }
        ],
        result: { cols: ['what was counted', 'rows'], rows: [['raw rows (every delivery)', n0(DD.raw_rows)], ['rows after QUALIFY', n0(DD.after_qualify)], ['order ids delivered twice', n0(DD.ids_delivered_twice)], ['of those, first NEW and then PAID', DD.new_became_paid_on_second_delivery]], msg: '4 counts' },
        note: 'Run in DuckDB on made-up data after translation. The counts are real for this data. The word "latest" here means the latest load time, which is not always the latest state in the source: the next screens come back to it.'
      }),

      B.rows({
        id: 'm6-redel', t: 1, src: 'rec', title: 'Which delivery wins?',
        steps: [
          {
            say: 'Five of the ' + DD.ids_delivered_twice + ' orders that arrived twice. For most the two deliveries are the same. But **' + DD.new_became_paid_on_second_delivery + '** orders were first sent as NEW and then as PAID, so the second delivery carried a newer state. "Latest load time wins" gave the right answer for those.',
            tabs: [{ layer: 'RECORDED', name: 'Orders that arrived twice, statuses in order of arrival', c: 'raw', cols: RD.cols, rows: RD.rows, trk: 0 }],
            notes: ['A source that can send an **older** state later than a newer one needs a better rule: order by a version or a sequence number that the source writes, not by the time you received it. Mission 11 meets this in change data capture.']
          },
          {
            say: 'This is why the dedupe key and the order key are a design decision. Write them down: **which column identifies the thing** (`order_id`), and **which column says which version is newest**. If the second one is only the load time, you are trusting the network.',
            tabs: [{ layer: 'RULE', name: 'Two questions for every dedupe', c: 'raw', cols: ['Question', 'In the orders example'], rows: [['What identifies the row?', 'order_id'], ['What says which copy is newest?', 'ingest_ts, the load time (a weak choice)'], ['What if the source can send an old state late?', 'Use a version or a sequence number from the source']], trk: 0 }],
            notes: ['A weak rule works until the day that it does not. Make the rule visible in the code and in the tests.']
          }
        ]
      }),

      B.sql({
        id: 'm6-unnest', t: 1, src: 'rec', title: 'Open the order lines with UNNEST', file: 'revenue_by_sku.sql', code: Q_UNNEST,
        steps: [
          { say: 'Each order holds its lines in an array. This query wants the revenue of each product, which lives in the lines. Press Next.', lines: null },
          { say: '`FROM orders AS o, UNNEST(o.items) AS i` puts each line next to its order: one output row for every line, with `i.sku`, `i.qty` and `i.unit_cents`. The comma is a join with the order\'s own array, so it never multiplies rows from other orders.', lines: G.span(Q_UNNEST, /UNNEST/) },
          { say: 'After that it is ordinary SQL: sum the quantity, and the quantity times the price, by product. Only paid orders count.', lines: G.span(Q_UNNEST, /SUM\(i\.qty\)/, /GROUP BY/) },
          { say: 'Sort by revenue and keep five. Press Run.', lines: G.span(Q_UNNEST, /ORDER BY/, /LIMIT/), run: true }
        ],
        result: { cols: UN.cols, rows: UN.rows.map(function (r) { return [r[0], n0(r[1]), n0(r[2])]; }), msg: '5 rows' },
        note: 'Run in DuckDB. Notice that the bag of beans and the mug lead the table: they cost far more than a coffee. Cents are integers, because money in floating point drifts.'
      }),

      B.sql({
        id: 'm6-window', t: 1, src: 'rec', title: 'The best store in each country', file: 'top_store.sql', code: Q_WIN,
        steps: [
          { say: 'A window function computes over a group of rows without collapsing them. Here: the store with the most revenue in each country. Press Next.', lines: null },
          { say: 'The inner query adds up the paid revenue of each store, and joins the stores table to get the country. `USING (store_id)` joins on the column of the same name.', lines: G.span(Q_WIN, /SUM\(o\.total_cents\)/, /GROUP BY/) },
          { say: '`RANK() OVER (PARTITION BY country ORDER BY revenue DESC)` numbers the stores inside each country, best first. A tie gets the same rank, which is the difference from `ROW_NUMBER`.', lines: G.span(Q_WIN, /RANK\(\)/) },
          { say: 'The outer query keeps rank 1. Press Run.', lines: G.span(Q_WIN, /^WHERE rnk/, /ORDER BY/), run: true }
        ],
        result: { cols: TS.cols, rows: TS.rows.map(function (r) { return [r[0], r[1], n0(r[2]), r[3]]; }), msg: TS.rows.length + ' rows' },
        note: 'Run in DuckDB. Singapore wins with store s01, which sells about a third of all orders. That one store is also the skew that you will meet in Spark.'
      }),

      B.sql({
        id: 'm6-gaps', t: 2, src: 'rec', title: 'A calendar finds the day that is missing', file: 'missing_days.sql', code: Q_GAP,
        steps: [
          { say: 'A group by shows the days that have rows, and says nothing about the days that have none. To find a missing day, start from a list of all days and join. Press Next.', lines: null },
          { say: '`GENERATE_DATE_ARRAY` makes one row for every day of the period, and `UNNEST` turns the array into rows. This is the calendar.', lines: G.span(Q_GAP, /calendar AS/, /^\),/) },
          { say: 'The second part counts the orders of one store by day. I removed the day 6 November for store s12 on purpose, to play a feed that failed.', lines: G.span(Q_GAP, /daily AS/, /^\)$/) },
          { say: 'A `LEFT JOIN` from the calendar keeps every day. A day without orders has a NULL count, and `IFNULL` makes it 0. The filter keeps only those days. Press Run.', lines: G.span(Q_GAP, /^SELECT calendar/, /ORDER BY/), run: true }
        ],
        result: { cols: GP.cols, rows: GP.rows, msg: '1 row' },
        note: 'Run in DuckDB. This is a data quality check, and the best kind: it asks for the evidence of a failure. A report with a missing day looks fine until somebody compares the totals.'
      }),

      B.widget({ id: 'm6-idem', kind: 'idem', t: 1, src: 'rec', title: 'Lab: five ways to load a day, run twice' }),

      B.code({
        id: 'm6-loads', t: 1, src: 'rec', title: 'The five statements', file: 'loads.py', lang: 'python', code: LOADS,
        steps: [
          { say: 'These are the five statements of the lab, in the file that ran them. Each is BigQuery SQL inside a Python string. Press Next to read them.', lines: null },
          { say: '**Append.** One insert from the batch table. It is the simplest, and a retry runs it again.', lines: G.span(LOADS, /^APPEND = /, /^"""$/) },
          { say: '**Merge.** Match on `order_id`. Update the status if it changed, insert if the order is new. A retry matches everything and changes nothing. Nothing says what to do with an order that has gone from the source.', lines: G.span(LOADS, /^MERGE = /, /^"""$/) },
          { say: '**Merge with delete by source.** The last clause deletes target rows that are not in the batch, but only for the day (`DATE(t.order_ts) = DATE \'2026-11-10\'`). Without that condition, a partial batch would delete everything else.', lines: G.span(LOADS, /^MERGE_AND_DELETE = /, /^"""$/) },
          { say: '**Overwrite the partition.** In one transaction: delete the day, insert the day. The result depends only on the batch, so any number of retries gives the same table.', lines: G.span(LOADS, /^OVERWRITE_PARTITION = /, /^"""$/) },
          { say: '**Reload everything.** Rebuild the whole table from the source of truth. Always right, and the most expensive.', lines: G.span(LOADS, /^RELOAD_ALL = /, /^"""$/) }
        ],
        note: 'Run in DuckDB after translation. BigQuery supports multi-statement transactions and `MERGE` with `WHEN NOT MATCHED BY SOURCE`, as documented. The counts in the lab are real for this data.'
      }),

      B.cmp({
        id: 'm6-methods', t: 1, src: 'rec', title: 'Choosing a load method',
        say: 'The results side by side. "Wrong rows" are the rows of the table that differ from what it should hold, after the same-batch retry and after the correction. Press Next to read the pattern.',
        cols: ['Method', 'Wrong after a retry', 'Wrong after a correction', 'What it costs'],
        hl: 2,
        rows: [
          ['INSERT (append)', run('append', 'the same batch again')[4], run('append', 'corrected batch')[4], 'Cheapest. Unsafe to repeat'],
          ['MERGE', run('merge', 'the same batch again')[4], run('merge', 'corrected batch')[4], 'Reads and writes the matched rows. Leaves vanished orders'],
          ['MERGE with delete by source', run('merge_and_delete', 'the same batch again')[4], run('merge_and_delete', 'corrected batch')[4], 'As MERGE, plus the delete. Needs the day condition'],
          ['Overwrite the partition', run('overwrite_partition', 'the same batch again')[4], run('overwrite_partition', 'corrected batch')[4], 'Rewrites the whole day each run'],
          ['Reload the whole table', run('reload_all', 'the same batch again')[4], run('reload_all', 'corrected batch')[4], 'Rewrites and rereads everything']
        ],
        steps: [
          { upto: 1, say: 'Append doubles the day on a retry: ' + n0(run('append', 'the same batch again')[4]) + ' wrong rows. It is only right when something else removes repeats.' },
          { upto: 2, say: 'Merge is safe to repeat and applies corrections, but it keeps the ' + IW.vanished + ' orders that vanished at the source.' },
          { upto: 5, say: 'The last three are right in every step. They differ in cost: a merge touches the changed rows, a partition overwrite rewrites a day, and a reload rewrites everything.' }
        ],
        pick: 'For a **fact table by day**, overwrite the partition: it is simple, and it needs no keys. For a table with **late changes across many days**, merge with a delete condition. For a **small dimension**, reload. Never append without a way to remove repeats.'
      }),

      B.talk({
        id: 'm6-merge', t: 2, src: 'docs', title: 'MERGE: the rules that bite',
        say: 'MERGE is the workhorse of loads, and it has four rules that people learn in production. Press Next for each.',
        items: [
          ['One source row for each target row', 'If two source rows match the same target row, BigQuery fails the statement, because it cannot say which update to apply. The classic cause is a source with repeats. **Remove repeats with `QUALIFY` in the `USING` subquery.**', 'Dedupe the source first.'],
          ['Narrow the target', 'A `MERGE` reads the target to find matches. On a big partitioned table, add a condition on the partition column to the `ON` clause (for example "the last three days"), so that BigQuery does not scan the whole target. It is the same pruning rule as for a query.', 'Merge into the days that can change.'],
          ['Be careful with delete by source', '`WHEN NOT MATCHED BY SOURCE THEN DELETE` removes target rows that the source does not have. With a partial source, that is the **whole table minus the batch**. Always add a condition that limits it to the scope of the batch.', 'Limit the delete to the batch scope.'],
          ['It is atomic', 'A statement either applies fully or not at all. Several statements can be wrapped in a **transaction**. Table-level limits on how many modifications run at once apply, so do not run hundreds of tiny merges: batch them.', 'One merge for a batch, not one for a row.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm6-scd', t: 2, src: 'docs', title: 'History of a dimension',
        say: 'A customer changes their loyalty tier. Do you overwrite it or keep the history? There are named answers. Press Next for each.',
        items: [
          ['Type 1: overwrite', 'The row is updated in place. Simple, and the past is lost: an old order will now show today\'s tier. Fine when the old value is a mistake.', 'Fix the value, forget the old one.'],
          ['Type 2: add a row', 'The old row is **closed** with an end date and a new row is added with a start date and `is_current`. A fact can then join to the version that was true at its time. It is the standard for a customer or product whose history matters.', 'A new row for each version.'],
          ['Type 3: add a column', 'A column holds the previous value next to the current one. It keeps one step of history, and it is rarely enough.', 'One step back, no more.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'A trick in BigQuery:', t: 'a type 2 change needs two actions for one changed row: close the old version and insert the new one. A single `MERGE` can do both if the source brings the changed row twice, once with the key (to match and close) and once with a NULL key (to insert).' }
      }),

      B.code({
        id: 'm6-scd2', t: 2, src: 'rec', title: 'A type 2 dimension with one MERGE', file: 'scd2.sql', lang: 'sql', code: SCD,
        steps: [
          { say: 'The dimension has three customers. The feed says that c0001 moved from none to silver, that c0002 and c0003 did not change, and that c0004 is new. One `MERGE` should close one row, add two, and change nothing else. Press Next.', lines: null },
          { say: 'The source has **two parts**. The first sends every customer in the feed with its own key. It will match the current row of each customer.', lines: G.span(SCD, /^USING \(/, /FROM `brewline-dev\.staging\.customer_feed` AS f$/) },
          { say: 'The second part sends only the customers whose tier **changed**, with a NULL key. A NULL never matches, so these rows fall into "not matched" and become inserts: the new version.', lines: G.span(SCD, /UNION ALL/, /d\.loyalty_tier != f\.loyalty_tier/) },
          { say: 'The `ON` clause matches the key to the **current** row only. A matched row whose tier differs is **closed**: `is_current` false and an end date.', lines: G.span(SCD, /^ON t\.customer_id/, /valid_to = /) },
          { say: 'Everything that does not match, the new customer and the new version of c0001, is inserted as the current row from the load date to the end of time.', lines: G.span(SCD, /WHEN NOT MATCHED/) }
        ],
        note: 'Run in DuckDB after translation. The load date is a literal here so that the result does not depend on the day it ran.'
      }),

      B.rows({
        id: 'm6-scd2-rows', t: 2, src: 'rec', title: 'The dimension after the first run and the second',
        steps: [
          {
            say: 'After the first run the table has **' + SD.rows_after_first + '** rows. c0001 has two versions: the old one is closed on 10 November, and the new one is current. c0004 is new. c0002 and c0003 are untouched.',
            tabs: [{ layer: 'RECORDED', name: 'dim_customer after the first run', c: 'raw', cols: SF.cols, rows: SF.rows.map(function (r) { return [r[0], r[1], r[2], r[3], r[4] ? 'true' : 'false']; }), trk: 0 }],
            notes: ['A fact joins to the right version with a condition such as `o.order_date BETWEEN d.valid_from AND d.valid_to`, or by a surrogate key chosen at load time.']
          },
          {
            say: 'I ran the same statement **again**. The table has **' + SD.rows_after_second + '** rows, and ' + (SD.second_run_changes_nothing ? 'it is identical to the first result.' : 'it changed.') + ' The match is on the current row and its tier, and now the tier agrees, so nothing is closed and nothing inserted. A pipeline that does this is safe to retry.',
            tabs: [{ layer: 'RECORDED', name: 'The result of running it twice', c: 'raw', cols: ['Run', 'Rows', 'Same as the run before'], rows: [['first', SD.rows_after_first, '-'], ['second', SD.rows_after_second, SD.second_run_changes_nothing ? 'yes' : 'no']], trk: 0 }],
            notes: ['The `is_current` flag in the match condition is what makes it repeatable. Without it, the old version of c0001 would match again.']
          }
        ]
      }),

      B.cmp({
        id: 'm6-shapes', t: 2, src: 'docs', title: 'The shape of a BigQuery model',
        say: 'Classic warehouses use a star schema. BigQuery can use that, and it can also nest. Press Next to read when each fits.',
        cols: ['Shape', 'What it is', 'Good for', 'Watch out for'],
        hl: 2,
        rows: [
          ['Star schema', 'A fact table and dimension tables, joined by keys', 'Shared dimensions, history (type 2), many facts over one customer', 'Joins on every query, and the row counts after a join'],
          ['Nested facts', 'Children stored inside the parent as arrays of structs', 'Order lines, events with attributes: always read with their parent', 'A shared dimension copied into every row'],
          ['One wide table', 'Dimensions flattened into the fact', 'A dashboard that wants one fast table', 'Repeated data, and a change in a dimension means a rewrite']
        ],
        steps: [
          { upto: 1, say: 'The star keeps one copy of each dimension, which is good for history and for consistency.' },
          { upto: 2, say: 'Nesting avoids joins for data that is always read together. Order lines are the classic case.' },
          { upto: 3, say: 'A wide table is a **mart** built from the others, for speed. It is rebuilt, not edited.' }
        ],
        pick: 'Use a **star** for what is shared and has history, **nest** what belongs to its parent, and build **wide marts** on top for dashboards. The raw and staging layers stay close to the source.'
      }),

      B.cmp({
        id: 'm6-views', t: 1, src: 'docs', title: 'View, materialized view, scheduled table, Dataform',
        say: 'Four ways to put logic into BigQuery, and when each one fits. Press Next to read the pattern.',
        cols: ['Tool', 'Stores data', 'Updated', 'Use it for'],
        hl: 3,
        rows: [
          ['View', 'no', 'always current', 'A stable name or a slice over changing tables'],
          ['Materialized view', 'yes', 'automatically, within limits', 'A heavy aggregate that many queries repeat'],
          ['Scheduled query into a table', 'yes', 'on a schedule that you set', 'A simple daily table with no dependencies'],
          ['Dataform (mission 10)', 'yes', 'when the workflow runs, in dependency order', 'A graph of tables, with tests and versions in Git']
        ],
        steps: [
          { upto: 2, say: 'A view stores nothing. A materialized view stores the answer and keeps it fresh, and only supports a limited set of SQL.' },
          { upto: 4, say: 'When the logic has steps and dependencies, a scheduled query is not enough. Use a workflow tool, and keep the SQL in Git.' }
        ],
        pick: 'One scheduled query is fine for one table. Ten of them, with the order held in your head, is a pipeline that needs a tool.'
      }),

      B.sql({
        id: 'm6-null', t: 1, src: 'rec', title: 'The NULL trap of NOT IN', file: 'never_refunded.sql', code: Q_NULL,
        steps: [
          { say: 'A simple question: how many of the ' + n0(NT.customers) + ' customers never had a refund? Two ways of writing it give different answers. Press Next.', lines: null },
          { say: 'Version 1 uses `NOT IN` against the customer ids of the refunded orders. It reads well.', lines: G.span(Q_NULL, /^SELECT COUNT/, /^\);/) },
          { say: 'But **' + n0(NT.refunded_orders_without_customer) + ' refunded orders are guest orders**, and their customer id is `NULL`. A list that holds a NULL makes `x NOT IN (...)` unknown for every x, and unknown is not true, so no row passes.', lines: G.span(Q_NULL, /status = 'REFUNDED'/) },
          { say: 'Version 2 asks the same question with `NOT EXISTS`, which looks for a matching row and is not fooled by a NULL. Press Run to see both answers.', lines: G.span(Q_NULL, /^-- 2/, /^\);$/), run: true }
        ],
        result: { cols: ['version', 'customers who never had a refund'], rows: [['1. NOT IN', NT.not_in_rows], ['2. NOT EXISTS', n0(NT.not_exists_rows)]], msg: '2 rows' },
        note: 'Run in DuckDB, and the rule is standard SQL, so BigQuery behaves the same. The wrong answer comes with no error. Prefer `NOT EXISTS`, or filter the NULLs out of the list.'
      }),

      B.rows({
        id: 'm6-checks', t: 1, src: 'rec', title: 'Tests written as queries',
        steps: [{
          say: 'A data test is a query that returns rows **when something is wrong**. An empty result is a pass. I ran five on the made-up orders. The last one is a check that must find something: the raw layer has repeats, and that is exactly why we remove them. Dataform assertions, in mission 10, are this idea with a name.',
          tabs: [{ layer: 'RECORDED', name: 'Five checks on the curated tables and the raw layer', c: 'raw', cols: CK.cols, rows: CK.rows, trk: 0 }],
          notes: ['Good checks to start with: a unique key, no NULL in the keys, every foreign key exists, values in a sensible range, and freshness (the latest row is not too old). Run them after each load, and stop the pipeline on a failure.']
        }]
      }),

      B.talk({
        id: 'm6-more', t: 2, src: 'docs', title: 'More BigQuery SQL that jobs ask about',
        say: 'Five features that come up in interviews and in real pipelines. Press Next for each.',
        items: [
          ['Scripting and stored procedures', 'A script can `DECLARE` variables, use `IF` and loops, run `EXECUTE IMMEDIATE`, and call a stored procedure. It is the way to put a small sequence of steps in one scheduled query, for example "delete the partition, insert the partition".', 'Several statements as one job.'],
          ['Scheduled queries', 'A query can run on a schedule through the BigQuery Data Transfer Service, with parameters for the run time. It is fine for a single table, and weak for a graph of tables.', 'Cron for one query.'],
          ['User-defined functions', 'A **SQL UDF** names a piece of logic. A **JavaScript UDF** can do what SQL cannot, and is slower. Use SQL first, and prefer a built-in function.', 'SQL first, JavaScript last.'],
          ['JSON and the safe functions', 'The `JSON` type and functions such as `JSON_VALUE` read semi-structured data. `SAFE_CAST` and `SAFE_DIVIDE` return NULL instead of failing the query. Use them on purpose, and count the NULLs they create.', 'A NULL instead of an error is a choice.'],
          ['Approximate functions', '`APPROX_COUNT_DISTINCT` reads less and returns a close answer. It uses another algorithm than any other engine\'s, so numbers differ between systems. Never use it for money, and always say that it is approximate.', 'Fast and close, not exact.']
        ],
        cols: 1
      }),

      B.decide({
        id: 'm6-dec', t: 2, src: 'rec', title: 'Decision: how to keep the history of the customer tier',
        scenario: 'Marketing wants to know how many orders each loyalty tier made last quarter, **by the tier that the customer had at the time**. Customers change tier a few times a year. The customers table holds today\'s tier only.',
        opts: [
          { t: 'Overwrite the tier in place every day (type 1)', d: 'One row for each customer. The simplest.', lose: 'An old order will show today\'s tier. The question cannot be answered, and nobody notices.' },
          { t: 'Keep a version for each change (type 2), and join orders to the version that was current at the order time', d: 'The history is in the data. A retry changes nothing, as the recorded run showed.', lose: '' },
          { t: 'Rely on time travel to look at old states', d: 'No extra table.', lose: 'Time travel keeps at most seven days. A quarter is gone.' }
        ],
        pick: 1,
        why: 'The question needs the tier **at the time of the order**, so the history must be a table that you own. A type 2 dimension gives it, and a MERGE that matches on the current row keeps it safe to repeat.',
        when: 'If nobody will ever ask about the past, a type 1 overwrite is simpler and enough.'
      }),

      B.bug({
        id: 'm6-bug', t: 2, q: 'This merge into the orders table works for a week and then fails with an error about matching more than one source row. Click the line that causes it.',
        file: 'merge_orders.sql', lang: 'sql', code: BUGM, bad: [2],
        hint: 'How many rows does the source have for one order?',
        why: 'The source is the **raw** table, which holds repeats: ' + n0(DD.ids_delivered_twice) + ' orders arrived twice in the recording. When an order has two source rows, BigQuery cannot decide which one updates the target row, so it refuses. Remove repeats first, in the `USING` subquery.',
        fix: FIXM,
        cheer: 'One source row for each target row.'
      }),

      B.bug({
        id: 'm6-bug2', t: 1, q: 'This query is meant to count customers who never had a refund. It returns 0, and nobody believes it. Click the line that causes it.',
        file: 'never_refunded.sql', lang: 'sql', code: BUGN, bad: [3],
        hint: 'What happens to NOT IN when the list holds a NULL?',
        why: 'The list holds a NULL, because guest orders have no customer id, and `NOT IN` against a list with a NULL is never true. The query returns ' + NT.not_in_rows + ' while the right answer in the recording is **' + n0(NT.not_exists_rows) + '**. `NOT EXISTS` has no such trap.',
        fix: FIXN,
        cheer: 'Use NOT EXISTS.'
      }),

      B.incident({
        id: 'm6-inc', t: 1, src: 'rec', title: 'Incident: revenue doubled for one day', time: '08:50',
        alert: '**The daily revenue of 10 November is almost twice the usual number.** The nightly load timed out at 02:41 and the scheduler retried it at 02:56. The load appends the day to the orders table.',
        clues: ['The first attempt timed out after it had inserted some rows', 'The retry ran the same INSERT again', 'In the recording an append that runs twice leaves ' + n0(run('append', 'the same batch again')[4]) + ' wrong rows']
        , opts: [
          { t: 'Remove the day\'s repeats, then change the load to overwrite the partition (or to merge) so that a retry is harmless', fb: '' },
          { t: 'Divide the revenue by two in the dashboard', fb: 'It hides the bug, and the number is wrong for any other day that was partly loaded.' },
          { t: 'Turn off retries', fb: 'Then every timeout is a missing day. Retries are good. The load must be safe to repeat.' },
          { t: 'Delete the whole table and reload everything from the start', fb: 'It would work and is far larger than the problem. It also needs the raw files for every day.' }
        ],
        best: 0,
        why: 'An append is atomic per statement but not safe to repeat. Replace the day, or merge by key, and the retry that caused the incident becomes a non-event. Then repair the day once.',
        checks: [
          ['Confirm', 'Count rows by day, and rows by key for the day. Which keys appear twice?'],
          ['Repair', 'Delete the day and load it again from the raw files, in one transaction.'],
          ['Change the load', 'Overwrite the partition, or merge on the key.'],
          ['Test', 'A test that runs the load twice and checks that the table is unchanged.']
        ],
        tell: 'The load timed out after it had written some rows, and the retry appended the whole day again, so the day was counted twice. I repaired the day from the raw files, and changed the load to overwrite its partition, so that a retry gives the same table. I added a test that runs it twice.',
        prevent: ['Loads that overwrite a partition or merge by key', 'A test that runs every load twice', 'A check of row counts by day against the source']
      }),

      B.quiz({
        id: 'm6-q1', t: 1,
        q: 'What does `QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY ingest_ts DESC) = 1` do?',
        opts: [
          { t: 'Keeps the latest row of each order', fb: '' },
          { t: 'Keeps the first row loaded for each order', fb: 'The order is descending, so number 1 is the newest.' },
          { t: 'Deletes the repeats from the table', fb: 'A SELECT with QUALIFY returns rows. It deletes nothing.' },
          { t: 'Counts the orders', fb: 'It filters rows. It does not count.' }
        ],
        ok: 0,
        why: 'The window numbers the rows of each order from newest to oldest, and QUALIFY keeps number 1.'
      }),

      B.quiz({
        id: 'm6-q2', t: 1,
        q: 'You run an append-style load twice by mistake. What do the rows look like?',
        opts: [
          { t: 'The same: BigQuery skips what it has', fb: 'It does not know what it has.' },
          { t: 'Doubled for the rows of that batch', fb: '' },
          { t: 'Empty', fb: 'Nothing deletes them.' },
          { t: 'Replaced by the new batch', fb: 'That is truncate or overwrite.' }
        ],
        ok: 1,
        why: 'In the recording an append that ran twice left ' + n0(run('append', 'the same batch again')[4]) + ' wrong rows. Overwrite or merge to be safe.'
      }),

      B.quiz({
        id: 'm6-q3', t: 1,
        q: 'Which of these makes `NOT IN` return no rows at all?',
        opts: [
          { t: 'A NULL in the list', fb: '' },
          { t: 'A NULL in the left column only', fb: 'That drops only that row.' },
          { t: 'A very long list', fb: 'Length is not the problem.' },
          { t: 'A duplicate in the list', fb: 'Duplicates do not matter.' }
        ],
        ok: 0,
        why: '`x NOT IN (..., NULL)` is unknown for every x. The recording returned ' + NT.not_in_rows + ' instead of ' + n0(NT.not_exists_rows) + '.'
      }),

      B.quiz({
        id: 'm6-q4', t: 2,
        q: 'In the type 2 merge, why does the source carry the changed customer **twice**?',
        opts: [
          { t: 'By mistake', fb: 'It is the point of the design.' },
          { t: 'Once with the key to match and close the old row, and once with a NULL key to insert the new version', fb: '' },
          { t: 'To double the speed', fb: 'It has no effect on speed.' },
          { t: 'Because MERGE needs two rows to run', fb: 'MERGE works with one row. A type 2 change needs two actions.' }
        ],
        ok: 1,
        why: 'One changed customer needs two actions: close one row and add one row. A NULL key never matches, so that copy is inserted.'
      }),

      B.quiz({
        id: 'm6-q5', t: 2,
        q: 'A MERGE source holds two rows for one target key. What does BigQuery do?',
        opts: [
          { t: 'Applies both in order', fb: 'It cannot know the order.' },
          { t: 'Fails the statement', fb: '' },
          { t: 'Applies the first one', fb: 'It does not choose for you.' },
          { t: 'Ignores the key', fb: 'It does not.' }
        ],
        ok: 1,
        why: 'Each target row may match at most one source row. Deduplicate the source with QUALIFY inside the USING subquery.'
      }),

      B.order({
        id: 'm6-ord', t: 1, q: 'Put the steps of a safe daily load in order.',
        items: [
          'Land the day\'s files unchanged in the raw layer',
          'Remove repeats with QUALIFY into staging',
          'Run the data checks on staging',
          'Overwrite the day\'s partition in curated, in one transaction',
          'Run the checks on curated: keys, counts, freshness',
          'Record the run, and alert if a check failed'
        ],
        why: 'Raw first, so that you can replay. Cleaning comes before the checks, and the checks come before the data that people read changes. The overwrite makes a retry harmless, and the last checks prove the result.'
      }),

      B.qa({
        id: 'qa-merge', t: 1, tag: 'SQL', secs: 75,
        q: 'How do you load a day of data into a table so that a retry does no harm?',
        pts: ['Idempotent: running twice equals once', 'Overwrite the partition in a transaction', 'Or MERGE on a key, source deduplicated', 'Delete by source only within the batch scope', 'Never plain append without a guard', 'A test that runs the load twice'],
        short: 'I make the load idempotent, so that running it twice gives the same table as running it once. For a fact table by day the simplest way is to overwrite the partition: in one transaction I delete the day and insert the day from staging. For a table with changes spread over many days I use a `MERGE` on the key, with the source deduplicated first by a window, and with a delete clause limited to the scope of the batch.\n\nI avoid a plain append, because a timeout and a retry doubles the rows. In a recording I ran five methods twice and counted wrong rows: the append had ' + n0(run('append', 'the same batch again')[4]) + ', and the other four had none after the retry. And I keep a test in the pipeline that runs the load twice and compares the table.',
        fu: [['What does a MERGE cost on a big table?', 'It reads the target to find matches, so I add a condition on the partition column to the ON clause and merge only the days that can change.'], ['How do you handle deletes in the source?', 'With a delete by source limited to the batch scope, or by overwriting the partition.']],
        trap: 'Saying that the scheduler will not retry. Retries happen, and so do people pressing the button.',
        real: 'Tell me about a pipeline that you made safe to retry, and how you proved it.'
      }),

      B.qa({
        id: 'qa-scd', t: 2, tag: 'SQL', secs: 90,
        q: 'How do you keep the history of a dimension in BigQuery?',
        pts: ['Slowly changing dimension type 2', 'A row for each version with valid_from, valid_to, is_current', 'One MERGE: key to close, NULL key to insert', 'Match on the current row, so it is repeatable', 'Facts join on the validity interval or a surrogate key', 'Type 1 when history does not matter'],
        short: 'I use a type 2 slowly changing dimension: one row for each version of a customer, with `valid_from`, `valid_to` and an `is_current` flag. A change needs two actions, close the old row and insert the new one, and one `MERGE` can do both. The source brings each changed row twice: once with the key, to match the current row and close it, and once with a NULL key, which never matches and so is inserted.\n\nThe match is on the **current** row, so running the same load twice changes nothing, and in my recording the second run left the table identical. Facts join to the version that was true at the order time, by the validity interval or by a surrogate key chosen at load time. When history does not matter, a type 1 overwrite is simpler, and I say so.',
        fu: [['Why not time travel?', 'It keeps at most seven days, and a history question can be a quarter old.'], ['What about a late-arriving change?', 'It needs the new row to be inserted with an earlier start date, and the neighbours to be adjusted. That is why the rule for ordering matters.']],
        trap: 'Describing the types without saying how the load stays repeatable.',
        real: 'Describe a report that gave a wrong answer because a dimension had no history.'
      }),

      B.qa({
        id: 'qa-nested', t: 2, tag: 'SQL', secs: 75,
        q: 'Nested columns or a star schema in BigQuery?',
        pts: ['Nest what belongs to its parent and is read with it', 'Star for shared dimensions with history', 'Nested leaves are separate columns: still columnar', 'UNNEST to read; watch the row multiplication', 'Wide marts on top for dashboards', 'Choose by the access pattern'],
        short: 'Both, by the access pattern. I nest data that belongs to its parent and is always read with it, such as order lines inside an order: it removes a join, and because every leaf field is stored as its own column, a query that names only `items.sku` reads only that leaf. I keep a table for what is shared or has its own key and history, such as customers, in a star shape with a type 2 dimension.\n\nTo read a nested column I use `UNNEST`, and I count rows before and after, because it multiplies rows by design. On top I build wide marts for dashboards, which are rebuilt and never edited. The raw and staging layers stay close to the source.',
        fu: [['What is the risk of nesting a dimension?', 'Copies of the same customer in every order, and a rewrite of everything when the customer changes.'], ['Does nesting cost more to query?', 'Not by itself: you pay for the leaves that you name.']],
        trap: 'Saying that BigQuery has no joins, or that nesting is always better.',
        real: 'Tell me about a model that you changed from star to nested, or the other way, and why.'
      }),

      B.qa({
        id: 'qa-null', t: 1, tag: 'SQL', secs: 60,
        q: 'What is the NOT IN trap?',
        pts: ['NOT IN with a NULL in the list returns nothing', 'The comparison is unknown, not true', 'No error, a silent wrong answer', 'Use NOT EXISTS or a left join anti-pattern', 'Or filter NULLs out of the list', 'Test with a NULL case'],
        short: 'If the list of a `NOT IN` contains a NULL, then `x NOT IN (...)` is unknown for every x, and unknown is not true, so no row passes. There is no error: the query just returns nothing. In my recording, "customers who never had a refund" returned 0 with `NOT IN`, because guest orders have no customer id, and ' + n0(NT.not_exists_rows) + ' with `NOT EXISTS`.\n\nI use `NOT EXISTS`, or an anti-join with a left join and a check for NULL on the right, or I filter NULLs out of the list. And I add a NULL row to my test data, because that is where this kind of bug lives.',
        fu: [['Does NOT EXISTS have the same problem?', 'No. It looks for a matching row and a NULL never matches.'], ['Does IN have it?', 'IN with a NULL still finds the values that are present. The trap is the negative form.']],
        trap: 'Saying that NULL equals NULL, or that the query errors.',
        real: 'Describe a silent wrong answer that you found in a query.'
      }),

      B.recap({
        id: 'm6-recap', n: 6, badge: 'SQL Smith', color: '#C7D2FE',
        pts: [
          '`QUALIFY` with a window keeps one row per key. Decide which column says which copy is **newest**.',
          '`UNNEST` opens arrays, `RANK` and friends compute over groups, and a **calendar** exposes missing days.',
          'An **append** doubled the day on a retry: **' + n0(run('append', 'the same batch again')[4]) + ' wrong rows**. Overwrite the partition or merge by key.',
          '`MERGE` needs **one source row** per target row, a narrow `ON`, and a delete limited to the **batch scope**.',
          'A **type 2** dimension keeps history: one MERGE, key to close and NULL key to insert, matched on the **current** row.',
          '`NOT IN` with a NULL returns **nothing**. Use `NOT EXISTS`. Write **tests as queries** that return rows on failure.'
        ],
        lines: [
          'I make every load safe to run twice, and I test it by running it twice.',
          'I dedupe the source of a MERGE before I merge.',
          'I put a NULL in my test data.'
        ]
      })
    ]
  });
})();
