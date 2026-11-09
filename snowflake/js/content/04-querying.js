/* Mission 4: SQL for data engineers, JSON in VARIANT columns, MERGE, and the classic traps. */
(function () {
  var B = LAB.b;

  var CORE = [
    '-- Revenue by country, without cancelled orders',
    'SELECT c.country,',
    '       COUNT(*)         AS orders,',
    '       SUM(o.total_usd) AS revenue_usd',
    'FROM core.orders o',
    'JOIN core.customers c',
    '  ON c.customer_id = o.customer_id',
    "WHERE o.status <> 'CANCELLED'",
    'GROUP BY c.country',
    'ORDER BY revenue_usd DESC;'
  ].join('\n');

  var QUAL = [
    '-- RAW keeps every version of an order. Keep only the latest.',
    'SELECT order_id, status, total_usd, _file',
    'FROM raw.orders',
    'QUALIFY ROW_NUMBER() OVER (',
    '          PARTITION BY order_id',
    '          ORDER BY _loaded_at DESC) = 1',
    'ORDER BY order_id;'
  ].join('\n');

  var VAR = [
    '-- Events landed as JSON in one VARIANT column called payload',
    'SELECT payload:user.id::STRING       AS customer_id,',
    '       payload:event::STRING         AS event,',
    '       payload:ts::TIMESTAMP_TZ      AS event_ts,',
    '       payload:items[0].sku::STRING  AS first_sku',
    'FROM raw.web_events',
    'ORDER BY event_ts;'
  ].join('\n');

  var FLAT = [
    '-- One row per item in the cart',
    'SELECT e.payload:user.id::STRING AS customer_id,',
    '       i.value:sku::STRING       AS sku,',
    '       i.value:qty::NUMBER       AS qty',
    'FROM raw.web_events e,',
    '     LATERAL FLATTEN(INPUT => e.payload:items) i',
    "WHERE e.payload:event::STRING = 'add_to_cart'",
    'ORDER BY customer_id, sku;'
  ].join('\n');

  var MERGE = [
    'MERGE INTO core.orders t',
    'USING (',
    '  SELECT order_id, customer_id, order_ts, status, total_usd',
    '  FROM raw.orders',
    '  QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY _loaded_at DESC) = 1',
    ') s',
    'ON t.order_id = s.order_id',
    'WHEN MATCHED AND t.status <> s.status THEN',
    '  UPDATE SET t.status = s.status',
    'WHEN NOT MATCHED THEN',
    '  INSERT (order_id, customer_id, order_ts, status, total_usd)',
    '  VALUES (s.order_id, s.customer_id, s.order_ts, s.status, s.total_usd);'
  ].join('\n');

  var BUGPATH = [
    'SELECT payload:user.id::STRING   AS customer_id,',
    '       payload:items.sku::STRING AS sku',
    'FROM raw.web_events',
    "WHERE payload:event::STRING = 'add_to_cart';"
  ].join('\n');

  var BUGNOT = [
    '-- Customers who have never ordered',
    'SELECT c.customer_id',
    'FROM core.customers c',
    'WHERE c.customer_id NOT IN (SELECT customer_id FROM core.orders);'
  ].join('\n');

  var T_ITEMS = { name: 'core.order_items', cols: ['order_id', 'line_no', 'product_id', 'qty', 'unit_price'], rows: [['O-5001', '1', 'P-10', '2', '14.00'], ['O-5001', '2', 'P-22', '1', '39.00'], ['O-5002', '1', 'P-11', '1', '12.50'], ['O-5003', '1', 'P-10', '2', '14.00'], ['O-5004', '1', 'P-30', '1', '55.00'], ['O-5005', '1', 'P-31', '1', '29.00'], ['O-5006', '1', 'P-12', '2', '16.00'], ['O-5006', '2', 'P-11', '1', '12.50'], ['O-5007', '1', 'P-12', '1', '16.00'], ['O-5008', '1', 'P-22', '1', '39.00'], ['O-5009', '1', 'P-31', '1', '29.00']] };
  var T_PRODUCTS = { name: 'core.products', cols: ['product_id', 'name', 'category'], rows: [['P-10', 'Ethiopia 250 g', 'coffee'], ['P-11', 'Colombia 250 g', 'coffee'], ['P-12', 'Kenya 250 g', 'coffee'], ['P-22', 'Hand grinder', 'gear'], ['P-30', 'Kettle', 'gear'], ['P-31', 'Scale', 'gear']] };
  var T_ORDERS = { name: 'core.orders (all columns that matter)', cols: ['order_id', 'status', 'total_usd'], rows: [['O-5001', 'SHIPPED', '67.00'], ['O-5002', 'PLACED', '12.50'], ['O-5003', 'SHIPPED', '28.00'], ['O-5004', 'SHIPPED', '55.00'], ['O-5005', 'CANCELLED', '29.00'], ['O-5006', 'SHIPPED', '44.50'], ['O-5007', 'PLACED', '16.00'], ['O-5008', 'SHIPPED', '39.00'], ['O-5009', 'SHIPPED', '30.00'], ['O-5010', 'PLACED', '20.00']] };
  var T_SESS = { name: 'web.session_events', cols: ['user_id', 'event_ts'], rows: [['C-42', '2026-03-14 09:00'], ['C-42', '2026-03-14 09:10'], ['C-42', '2026-03-14 09:25'], ['C-42', '2026-03-14 10:15'], ['C-42', '2026-03-14 10:20'], ['C-77', '2026-03-14 11:00'], ['C-77', '2026-03-14 11:40'], ['C-77', '2026-03-14 11:55']] };

  LAB.addChapter({
    id: 'm4', n: 4, title: 'Querying and JSON', short: 'Querying', blurb: 'Joins, windows, QUALIFY, VARIANT, FLATTEN, MERGE', minutes: 30,
    focus: ['stg'],
    goals: [
      'Write **joins, window functions and QUALIFY** the way Snowflake teams do.',
      'Query **JSON in a VARIANT column** with paths, casts and FLATTEN.',
      'Use **MERGE** safely, and explain why its source must be deduplicated.',
      'Avoid the classic traps: **NULL in NOT IN**, **time zones** and **array paths**.'
    ],
    say: 'Mission 4 is the SQL you will write every day. Snowflake adds a few features that save a lot of code, especially QUALIFY and VARIANT, and interviewers like to see that you know them.',
    scenes: [
      B.sql({
        id: 'm4-sql-core', t: 1, title: 'Join, group and order', file: 'worksheet: revenue_by_country.sql', code: CORE,
        ctx: { role: 'ANALYST', wh: 'WH_BI', db: 'BREWLINE.CORE' },
        steps: [
          { say: 'The shape of most analytics queries: join, filter, group, sort. Press Next to read it line by line.', lines: null },
          { say: 'SELECT lists what you want back. COUNT and SUM are aggregates, so every other column must appear in GROUP BY.', lines: [2, 4] },
          { say: 'Join orders to customers on the customer ID, to get each order\'s country. Use table aliases, here o and c, to keep the query readable.', lines: [5, 7] },
          { say: 'WHERE filters rows before they are grouped. Cancelled orders are not revenue, so they never reach the aggregate.', lines: [8, 8] },
          { say: 'Group by country and sort by revenue, largest first. Press Run.', lines: [9, 10], run: true }
        ],
        result: { cols: ['COUNTRY', 'ORDERS', 'REVENUE_USD'], rows: [['US', '4', '141.00'], ['FR', '2', '94.00'], ['UK', '3', '77.00']], msg: '3 rows' },
        note: 'The order of evaluation is **FROM, WHERE, GROUP BY, HAVING, window functions, QUALIFY, SELECT, ORDER BY, LIMIT**. That is why `WHERE` cannot use a column alias, and `ORDER BY` can.'
      }),

      B.sql({
        id: 'm4-qualify', t: 1, title: 'QUALIFY: the latest row per key', file: 'worksheet: latest_order.sql', code: QUAL,
        ctx: { role: 'TRANSFORMER', wh: 'WH_TRANSFORM', db: 'BREWLINE.RAW' },
        steps: [
          { say: 'RAW keeps every version of an order, so one order can appear several times. We want one row per order: the latest. Press Next.', lines: null },
          { say: 'RAW holds five rows for three orders, because O-5001 and O-5003 each changed status.', lines: [2, 3] },
          { say: 'ROW_NUMBER numbers the rows inside each order, newest first. QUALIFY keeps only row number 1. QUALIFY filters on window functions, the way HAVING filters on aggregates, so you need no subquery.', lines: [4, 6] },
          { say: 'The result is one row per order, with its latest status. Press Run.', lines: [7, 7], run: true }
        ],
        result: { cols: ['ORDER_ID', 'STATUS', 'TOTAL_USD', '_FILE'], rows: [['O-5001', 'SHIPPED', '67.00', 'part-0002.csv.gz'], ['O-5002', 'PLACED', '12.50', 'part-0001.csv.gz'], ['O-5003', 'SHIPPED', '28.00', 'part-0003.csv.gz']], msg: '3 rows' },
        note: 'Most other databases need `SELECT * FROM (SELECT ..., ROW_NUMBER() ...) WHERE rn = 1`. In an interview, say that QUALIFY is the Snowflake way and that the two forms are equivalent.'
      }),

      B.talk({
        id: 'm4-variant', t: 1, title: 'VARIANT: JSON without a schema',
        say: 'Event data is nested JSON, and Snowflake stores it in a VARIANT column. Five ideas, press Next for each.',
        items: [
          ['VARIANT holds any JSON', 'A **VARIANT** column stores JSON, Avro, Parquet or ORC values of any shape. Snowflake stores common paths in a columnar form, so queries that read a few fields stay fast. It is the right type for landing event data.', 'Land JSON as VARIANT. Do not flatten it before you load.'],
          ['Paths and casts', 'Use `:` for the first level, `.` for deeper levels and `[n]` for array positions: `payload:user.id`. The result is still VARIANT, so cast it with `::STRING`, `::NUMBER` or `::TIMESTAMP_TZ`. Path names are **case-sensitive**.', 'Path, then cast.'],
          ['A missing path returns NULL', 'A path that does not exist returns **NULL**, not an error. That is convenient and it hides typos: `payload:Event` and `payload:event` are different. Check a new path with `COUNT(payload:event)` before you trust it.', 'No error does not mean the path is right.'],
          ['Arrays need FLATTEN', 'A path into an array without an index returns NULL. To get **one row per element**, use `LATERAL FLATTEN(INPUT => payload:items)`. It adds the columns `value`, `index`, `key` and `path`.', 'FLATTEN turns an array into rows.'],
          ['Promote what you use', 'VARIANT is for landing. For anything used often, **extract the paths into typed columns** in the CORE layer. Typed columns are easier to test, document and join.', 'Land as VARIANT, model as typed columns.']
        ],
        cols: 1
      }),

      B.sql({
        id: 'm4-variant-sql', t: 1, title: 'Read JSON with paths', file: 'worksheet: json_paths.sql', code: VAR,
        ctx: { role: 'TRANSFORMER', wh: 'WH_TRANSFORM', db: 'BREWLINE.RAW' },
        steps: [
          { say: 'Three web events are stored as JSON in the payload column. Let us read fields out of them. Press Next.', lines: null },
          { say: 'The path payload:user.id walks into the user object and takes its id. The double colon casts the VARIANT to a string.', lines: [2, 2] },
          { say: 'Same pattern for the event name.', lines: [3, 3] },
          { say: 'The timestamp in the JSON ends with Z, which means UTC. Casting to TIMESTAMP_TZ keeps that offset, so the result shows +0000.', lines: [4, 4] },
          { say: 'items[0] takes the first element of the array, and .sku reads its field. For an empty array there is no first element. Press Run and look at the last row.', lines: [5, 7], run: true }
        ],
        result: { cols: ['CUSTOMER_ID', 'EVENT', 'EVENT_TS', 'FIRST_SKU'], rows: [['C-42', 'add_to_cart', '2026-03-14 09:10:41.000 +0000', 'P-10'], ['C-77', 'add_to_cart', '2026-03-14 09:14:02.000 +0000', 'P-11'], ['C-42', 'page_view', '2026-03-14 09:20:55.000 +0000', 'NULL']], msg: '3 rows' },
        note: 'The page view has an empty `items` array, so `items[0].sku` is **NULL**. No error is raised.'
      }),

      B.sql({
        id: 'm4-flatten', t: 1, title: 'FLATTEN: arrays become rows', file: 'worksheet: flatten_items.sql', code: FLAT,
        ctx: { role: 'TRANSFORMER', wh: 'WH_TRANSFORM', db: 'BREWLINE.RAW' },
        steps: [
          { say: 'A cart has a list of items. To count products, we need one row per item. Press Next.', lines: null },
          { say: 'LATERAL FLATTEN takes the array in payload:items and produces one row for each element, joined to its parent event. The comma before LATERAL joins each event to its own items.', lines: [5, 6] },
          { say: 'Each element arrives in the column called value, so i.value:sku reads the SKU of that item.', lines: [2, 4] },
          { say: 'Filter and sort as usual. Press Run.', lines: [7, 8], run: true }
        ],
        result: { cols: ['CUSTOMER_ID', 'SKU', 'QTY'], rows: [['C-42', 'P-10', '2'], ['C-42', 'P-22', '1'], ['C-77', 'P-11', '1']], msg: '3 rows' },
        note: 'Two add-to-cart events became three item rows. The page view had an empty array, and a plain FLATTEN drops events with no items. Add `OUTER => TRUE` to keep them with a NULL value.'
      }),

      B.sql({
        id: 'm4-merge', t: 1, title: 'MERGE: upsert the latest version', file: 'worksheet: merge_orders.sql', code: MERGE,
        ctx: { role: 'TRANSFORMER', wh: 'WH_TRANSFORM', db: 'BREWLINE.CORE' },
        steps: [
          { say: 'MERGE updates rows that exist and inserts rows that do not, in one statement. CORE.ORDERS currently holds O-5001 and O-5002, both PLACED. Press Next.', lines: null },
          { say: 'The source is the latest version of each order from RAW, the same QUALIFY you just wrote. Deduplicating the source is not optional. I explain why at the end.', lines: [2, 6] },
          { say: 'Match on the order ID.', lines: [7, 7] },
          { say: 'When the order exists and its status changed, update the status. The extra condition avoids rewriting rows that did not change.', lines: [8, 9] },
          { say: 'When the order is new, insert it. Press Run. O-5001 changed to SHIPPED, and O-5003 is new.', lines: [10, 12], run: true }
        ],
        result: { cols: ['number of rows inserted', 'number of rows updated'], rows: [['1', '1']], msg: '1 row' },
        note: 'If **two source rows match one target row**, Snowflake raises an error ("Duplicate row detected during DML action") or picks one at random, depending on the `ERROR_ON_NONDETERMINISTIC_MERGE` setting. That is why the source must have exactly one row per key.'
      }),

      B.talk({
        id: 'm4-types', t: 2, title: 'Types, time zones and NULLs',
        say: 'Five type and NULL rules that cause real production bugs. Press Next for each.',
        items: [
          ['Three kinds of timestamp', '`TIMESTAMP_NTZ` has no time zone: it is a wall-clock time. `TIMESTAMP_TZ` stores the value with its offset. `TIMESTAMP_LTZ` stores one moment and shows it in the session time zone. The plain word `TIMESTAMP` means NTZ unless the account changes `TIMESTAMP_TYPE_MAPPING`.', 'NTZ is a clock, TZ keeps the offset, LTZ follows the session.'],
          ['Store UTC, convert at the edge', 'Keep event times in UTC. For reporting, convert first and truncate second: `DATE_TRUNC(\'day\', CONVERT_TIMEZONE(\'UTC\', \'America/New_York\', ts))`. Subtracting hours by hand breaks at daylight saving changes.', 'Convert, then truncate.'],
          ['Money is NUMBER, never FLOAT', 'Use `NUMBER(10,2)` for money so sums are exact. `FLOAT` is binary and adds rounding noise. A plain `NUMBER` means `NUMBER(38,0)`, so always state the scale.', 'State precision and scale.'],
          ['Safe casts for dirty data', '`::` fails the whole query on one bad value. `TRY_TO_NUMBER`, `TRY_TO_DATE` and `TRY_CAST` return NULL instead, which is what you want when you clean RAW. Then count those NULLs so bad data stays visible.', 'Use TRY_ casts, then count what failed.'],
          ['NULL is never equal to anything', '`x = NULL` matches nothing, and `NOT IN` with a NULL in the list returns **no rows at all**. Use `IS NULL`, `COALESCE` or `NOT EXISTS`.', 'Test NULL with IS NULL.']
        ],
        cols: 1
      }),

      B.bug({
        id: 'm4-bug1', t: 1, q: 'This query should list each SKU added to a cart, but the sku column is empty for every row. Click the line that causes it.',
        file: 'cart_items.sql', lang: 'sql', code: BUGPATH, bad: 2,
        hint: 'Look at what `items` is in the JSON. Can you read a field from it directly?',
        why: '`items` is an **array**. A path such as `items.sku` into an array returns NULL without an error. Use `LATERAL FLATTEN` to get one row per element and read `value:sku`, or index a single element with `items[0].sku`.',
        fix: 'SELECT e.payload:user.id::STRING AS customer_id,\n       i.value:sku::STRING       AS sku\nFROM raw.web_events e,\n     LATERAL FLATTEN(INPUT => e.payload:items) i\nWHERE e.payload:event::STRING = \'add_to_cart\';'
      }),

      B.bug({
        id: 'm4-bug2', t: 2, q: 'The query should list customers who never ordered. It returns zero rows, although two such customers exist. Click the line to blame.',
        file: 'never_ordered.sql', lang: 'sql', code: BUGNOT, bad: 4,
        hint: 'Guest checkouts have a NULL customer_id in core.orders.',
        why: 'If the subquery returns even one **NULL**, `NOT IN` can never be true, so no rows come back. Use `NOT EXISTS`, or filter the NULLs out of the subquery with `WHERE customer_id IS NOT NULL`. In a test run with a NULL in the list, the `NOT IN` form returned 0 rows and `NOT EXISTS` returned both customers.',
        fix: 'SELECT c.customer_id\nFROM core.customers c\nWHERE NOT EXISTS (\n  SELECT 1 FROM core.orders o\n  WHERE o.customer_id = c.customer_id\n);'
      }),

      B.challenge({
        id: 'm4-ch-topn', t: 1, title: 'Coding round: top products per category', file: 'top_products.sql', lang: 'sql',
        q: 'Return the **top 2 products by revenue in each category**. Ignore cancelled orders. Show `category`, `product_id`, `revenue_usd` and the rank. Revenue is quantity times unit price. `core.orders` has a `status` column, and order O-5005 is cancelled.',
        data: [T_ITEMS, T_PRODUCTS],
        starter: '-- Join order_items to products and orders.\n-- Aggregate first, then rank inside each category.\nSELECT ...',
        hints: ['Join `order_items` to `products` for the category, and to `orders` so you can drop cancelled orders.', 'Revenue is `SUM(qty * unit_price)`. Group by category and product.', 'Rank with `RANK() OVER (PARTITION BY category ORDER BY <the sum> DESC)` and keep ranks 1 and 2 with `QUALIFY`.'],
        sol: "SELECT p.category, p.product_id,\n       SUM(i.qty * i.unit_price) AS revenue_usd,\n       RANK() OVER (PARTITION BY p.category\n                    ORDER BY SUM(i.qty * i.unit_price) DESC) AS rnk\nFROM core.order_items i\nJOIN core.orders   o ON o.order_id   = i.order_id\n                    AND o.status <> 'CANCELLED'\nJOIN core.products p ON p.product_id = i.product_id\nGROUP BY p.category, p.product_id\nQUALIFY rnk <= 2\nORDER BY p.category, rnk;",
        res: { cols: ['category', 'product_id', 'revenue_usd', 'rnk'], rows: [['coffee', 'P-10', '56.00', '1'], ['coffee', 'P-12', '48.00', '2'], ['gear', 'P-22', '78.00', '1'], ['gear', 'P-30', '55.00', '2']], msg: '4 rows' },
        expl: ['The window function runs **after** GROUP BY, so it can rank the sums.', 'QUALIFY filters on the window result, so no subquery is needed.', 'The cancelled scale order was removed by the join condition, and the third gear product, P-31, ranks below the cutoff.', '`RANK` keeps ties, so it can return more than 2 rows. Use `ROW_NUMBER` when you need exactly 2.']
      }),

      B.challenge({
        id: 'm4-ch-session', t: 2, title: 'Coding round: sessions from clicks', file: 'sessions.sql', lang: 'sql',
        q: 'A new session starts when a user has been **inactive for more than 30 minutes**. For each session return the user, a session number, the start time, the end time and the number of events.',
        data: [T_SESS],
        starter: '-- Hint: flag the events that start a session, then number the sessions with a running sum.\nSELECT ...',
        hints: ['Get the previous event time for the same user with `LAG(event_ts) OVER (PARTITION BY user_id ORDER BY event_ts)`.', 'Give a 1 to the first event of a user and to any event more than 30 minutes after the previous one, and a 0 to the rest.', 'A running `SUM` of those flags, ordered by time, is the session number. Then group by user and session number.'],
        sol: "WITH flagged AS (\n  SELECT user_id, event_ts,\n         CASE WHEN LAG(event_ts) OVER (PARTITION BY user_id ORDER BY event_ts) IS NULL\n                OR DATEDIFF('minute',\n                     LAG(event_ts) OVER (PARTITION BY user_id ORDER BY event_ts),\n                     event_ts) > 30\n              THEN 1 ELSE 0 END AS new_session\n  FROM web.session_events\n),\nnumbered AS (\n  SELECT *, SUM(new_session) OVER (PARTITION BY user_id ORDER BY event_ts) AS session_no\n  FROM flagged\n)\nSELECT user_id, session_no,\n       MIN(event_ts) AS started_at, MAX(event_ts) AS ended_at, COUNT(*) AS events\nFROM numbered\nGROUP BY user_id, session_no\nORDER BY user_id, session_no;",
        res: { cols: ['user_id', 'session_no', 'started_at', 'ended_at', 'events'], rows: [['C-42', '1', '2026-03-14 09:00:00.000', '2026-03-14 09:25:00.000', '3'], ['C-42', '2', '2026-03-14 10:15:00.000', '2026-03-14 10:20:00.000', '2'], ['C-77', '1', '2026-03-14 11:00:00.000', '2026-03-14 11:00:00.000', '1'], ['C-77', '2', '2026-03-14 11:40:00.000', '2026-03-14 11:55:00.000', '2']], msg: '4 rows' },
        expl: ['`LAG` looks at the previous row inside the same user, so the first event has no previous time. That case needs its own flag.', 'A running `SUM` of 0 and 1 flags counts how many session starts have happened so far. That is a standard way to number groups.', 'It is one pass over the data with two window functions. Say that sessionization is a "gaps and islands" problem.']
      }),

      B.challenge({
        id: 'm4-ch-recon', t: 2, title: 'Coding round: orders that do not add up', file: 'reconcile.sql', lang: 'sql',
        q: 'Find the orders whose **line items do not add up to the order total**. Return the order, its total, the items total and the difference. Make sure an order with **no lines at all** is also caught.',
        data: [T_ORDERS, T_ITEMS],
        starter: '-- Think about which join keeps orders that have no lines.\nSELECT ...',
        hints: ['Sum `qty * unit_price` per order and compare it with the order total.', 'An `INNER JOIN` drops orders that have no lines. Which join keeps them?', 'With a `LEFT JOIN` the sum is NULL for an order with no lines. Wrap it in `COALESCE(..., 0)`, and filter with `HAVING`.'],
        sol: 'SELECT o.order_id, o.total_usd,\n       COALESCE(SUM(i.qty * i.unit_price), 0)               AS items_usd,\n       o.total_usd - COALESCE(SUM(i.qty * i.unit_price), 0) AS diff_usd\nFROM core.orders o\nLEFT JOIN core.order_items i ON i.order_id = o.order_id\nGROUP BY o.order_id, o.total_usd\nHAVING o.total_usd <> COALESCE(SUM(i.qty * i.unit_price), 0)\nORDER BY o.order_id;',
        res: { cols: ['order_id', 'total_usd', 'items_usd', 'diff_usd'], rows: [['O-5009', '30.00', '29.00', '1.00'], ['O-5010', '20.00', '0.00', '20.00']], msg: '2 rows' },
        expl: ['O-5009 is 1.00 higher than its lines. O-5010 has no lines at all, so only a `LEFT JOIN` finds it.', 'A reconciliation that silently skips empty orders is worse than none. State your join choice out loud.', 'This query is the seed of a data quality test: in dbt it becomes a singular test that must return zero rows.']
      }),

      B.quiz({
        id: 'm4-q1', t: 1,
        q: 'Which clause filters rows on the result of a window function, such as `ROW_NUMBER() = 1`, without a subquery?',
        opts: [
          { t: 'QUALIFY', fb: '' },
          { t: 'HAVING', fb: 'HAVING filters groups after aggregation. It does not see window function results.' },
          { t: 'WHERE', fb: 'WHERE runs before window functions are calculated, so it cannot use them.' },
          { t: 'WINDOW', fb: 'WINDOW only defines a named window specification. It does not filter anything.' }
        ],
        ok: 0, why: 'The evaluation order is FROM, WHERE, GROUP BY, HAVING, window functions, **QUALIFY**. QUALIFY is the only clause that runs after window functions, and it removes the need for a wrapper query.'
      }),

      B.quiz({
        id: 'm4-q2', t: 1,
        q: 'The `items` array of an event is empty. What does `payload:items[0].sku::STRING` return?',
        opts: [
          { t: 'NULL', fb: '' },
          { t: 'An empty string', fb: 'A missing path gives NULL, not an empty string.' },
          { t: 'An error: array index out of range', fb: 'Snowflake does not raise an error for a missing path or index in VARIANT.' },
          { t: 'The text "[]"', fb: 'The path points at an element that does not exist, so there is nothing to show.' }
        ],
        ok: 0, why: 'Missing paths and out-of-range indexes in VARIANT return **NULL**. That avoids failures on irregular JSON, and it also hides typos, so test new paths with a COUNT.'
      }),

      B.quiz({
        id: 'm4-q3', t: 2,
        q: 'Order timestamps are stored in UTC. Analysts in New York want revenue per local day. What do you do?',
        opts: [
          { t: 'Convert with CONVERT_TIMEZONE to America/New_York, then truncate to the day', fb: '' },
          { t: 'Subtract 5 hours, then truncate to the day', fb: 'The offset is 4 hours in summer and 5 in winter. A fixed subtraction is wrong for half the year.' },
          { t: 'Truncate to the day in UTC and ask analysts to accept the difference', fb: 'Orders placed between 8 PM and midnight New York time would land on the wrong day.' },
          { t: 'Store the timestamps as text so nothing changes them', fb: 'Text cannot be compared or converted safely, and it makes every query slower.' }
        ],
        ok: 0, why: 'Convert first, then truncate: `DATE_TRUNC(\'day\', CONVERT_TIMEZONE(\'UTC\', \'America/New_York\', ts))`. The time zone database handles daylight saving, and the stored data stays in UTC.'
      }),

      B.qa({
        id: 'qa-variant', t: 1, tag: 'SQL', secs: 60,
        q: 'How do you query nested JSON in Snowflake?',
        pts: ['Land it in a VARIANT column', 'Path notation and casts: payload:user.id::STRING', 'FLATTEN for arrays, one row per element', 'Missing paths return NULL, so check spelling', 'Promote the paths you use into typed columns in CORE'],
        short: 'I land the JSON as is in a VARIANT column, so a changing source never breaks the load. To read it I use path notation with a cast: payload:user.id::STRING walks into the object and converts the value. For arrays I use LATERAL FLATTEN, which returns one row per element, and I read each element through its value column. OUTER => TRUE keeps parents that have an empty array.\n\nI remember that a missing path returns NULL and not an error, so I check new paths with a count. Then I promote the fields I use often into typed columns in the CORE layer, because typed columns are easier to test, document and join, and queries on them are cheaper than parsing JSON every time.',
        fu: [
          ['What does FLATTEN return besides value?', 'Columns for the sequence number, key, path, index, value and the parent element. For an array, index gives the position, and value gives the element.'],
          ['How do you handle a field whose type changes between events?', 'I keep it as VARIANT in RAW and use TRY_ casts when I extract it. I count the NULLs after the cast, so a type change is visible instead of silent.']
        ],
        trap: 'Saying "I would flatten everything before loading". Landing the raw JSON first keeps the load stable and lets you reprocess when you change your mind.'
      }),

      B.qa({
        id: 'qa-dedupe', t: 2, tag: 'SQL', secs: 75,
        q: 'How do you deduplicate and keep the latest version of each record in Snowflake?',
        pts: ['ROW_NUMBER over the key, ordered by change time descending', 'QUALIFY = 1, no subquery', 'A deterministic tie-breaker in the ORDER BY', 'MERGE needs one source row per key', 'Choose the ordering column carefully: source change time versus load time', 'Protect it with a unique test on the key'],
        short: 'I number the rows inside each key with ROW_NUMBER, ordered by the change time descending, and keep row number 1. In Snowflake I put that in a QUALIFY clause, so there is no wrapper query. I add a tie-breaker to the ORDER BY, such as the load time or file name, so the result is deterministic when two versions share a timestamp.\n\nI choose the ordering column on purpose. The source change time is best, and the load time is the fallback, because a late file can arrive out of order. When I merge into a target, the source must contain one row per key. Otherwise MERGE fails or picks a row at random. Finally I protect the result with a unique test on the key, so a break shows up in CI and not in a dashboard.',
        fu: [
          ['ROW_NUMBER, RANK or DENSE_RANK?', 'ROW_NUMBER, because it always returns exactly one row per key. RANK and DENSE_RANK keep ties, so they can return two rows for one key.'],
          ['What if events arrive out of order?', 'Order by the source change time and not by the arrival time, and keep the raw history. Then a late old version cannot overwrite a newer one.']
        ],
        trap: 'Using `SELECT DISTINCT`. It removes only exact duplicates, so two versions of the same order with different statuses both stay.',
        real: 'Use a table you deduplicated yourself. Say how many duplicates the source produced and which ordering column you chose.'
      }),

      B.recap({
        id: 'm4-recap', n: 4, badge: 'Query Writer', color: '#BFDBFE',
        pts: [
          'Evaluation order: FROM, WHERE, GROUP BY, HAVING, windows, **QUALIFY**, SELECT, ORDER BY.',
          '**QUALIFY** filters on window functions. `ROW_NUMBER() = 1` keeps the latest row per key.',
          '**VARIANT** holds JSON. Path, then cast. A missing path is **NULL**. **FLATTEN** turns arrays into rows.',
          '**MERGE** needs one source row per key. Deduplicate the source first.',
          'Traps: **NULL in NOT IN**, fixed-hour time zone shifts, FLOAT for money, inner joins that drop empty parents.'
        ],
        lines: [
          'I keep the latest version of each record with ROW_NUMBER and QUALIFY, with a deterministic tie-breaker.',
          'I land JSON as VARIANT, then promote the fields I use into typed columns.',
          'I use a LEFT JOIN when a reconciliation must also catch records with no children.'
        ]
      })
    ]
  });
})();
