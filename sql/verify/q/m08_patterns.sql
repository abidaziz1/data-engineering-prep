-- Mission 8: patterns. Dedupe, top N per group, gaps and islands, sessions, funnels, retention, pivots and as-of joins.

-- @name m8.dups
-- @engines duckdb postgres sqlite
SELECT order_id, count(*) AS versions, min(ingested_at) AS first_seen, max(ingested_at) AS last_seen
FROM orders_raw
GROUP BY order_id
HAVING count(*) > 1
ORDER BY order_id;

-- @name m8.raw_sum
-- @engines duckdb postgres sqlite
SELECT count(*) AS raw_rows, count(DISTINCT order_id) AS orders, sum(total) AS raw_total
FROM orders_raw;

-- @name m8.dedupe
-- @engines duckdb postgres sqlite
WITH ranked AS (
  SELECT order_id, status, total, ingested_at,
         ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY ingested_at DESC) AS rn
  FROM orders_raw
)
SELECT order_id, status, total, ingested_at
FROM ranked
WHERE rn = 1
ORDER BY order_id;

-- @name m8.dedupe_total
-- @engines duckdb postgres sqlite
WITH ranked AS (
  SELECT order_id, total,
         ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY ingested_at DESC) AS rn
  FROM orders_raw
)
SELECT count(*) AS rows_kept, sum(total) AS clean_total
FROM ranked
WHERE rn = 1;

-- @name m8.dedupe_distinct_on
-- @engines postgres
SELECT DISTINCT ON (order_id) order_id, status, total, ingested_at
FROM orders_raw
ORDER BY order_id, ingested_at DESC;

-- @name m8.dedupe_qualify
-- @engines duckdb
SELECT order_id, status, total, ingested_at
FROM orders_raw
QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY ingested_at DESC) = 1
ORDER BY order_id;

-- @name m8.dedupe_argmax
-- @engines duckdb
SELECT order_id,
       arg_max(status, ingested_at) AS status,
       arg_max(total, ingested_at) AS total,
       max(ingested_at) AS ingested_at
FROM orders_raw
GROUP BY order_id
ORDER BY order_id;

-- @name m8.distinct_bug
-- @engines duckdb postgres sqlite
SELECT count(*) AS rows_after_distinct
FROM (SELECT DISTINCT * FROM orders_raw) AS t;

-- @name m8.topn
-- @engines duckdb postgres sqlite
WITH ranked AS (
  SELECT store_id, order_id, total,
         ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY total DESC, order_id) AS rn
  FROM orders
  WHERE status = 'paid'
)
SELECT store_id, rn, order_id, total
FROM ranked
WHERE rn <= 2
ORDER BY store_id, rn;

-- @name m8.lateral
-- @engines duckdb postgres sqlite
-- @each
SELECT s.store_id, s.name, t.order_id, t.total
FROM stores AS s
LEFT JOIN LATERAL (
  SELECT o.order_id, o.total
  FROM orders AS o
  WHERE o.store_id = s.store_id AND o.status = 'paid'
  ORDER BY o.total DESC
  LIMIT 2
) AS t ON true
ORDER BY s.store_id, t.total DESC;

-- @name m8.islands
-- @engines duckdb postgres
WITH numbered AS (
  SELECT customer_id, day,
         day - CAST(ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY day) AS INTEGER) AS grp
  FROM daily_active
)
SELECT customer_id, min(day) AS streak_start, max(day) AS streak_end, count(*) AS days
FROM numbered
GROUP BY customer_id, grp
ORDER BY customer_id, streak_start;

-- @name m8.islands_sqlite
-- @engines sqlite
WITH numbered AS (
  SELECT customer_id, day,
         date(day, '-' || ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY day) || ' days') AS grp
  FROM daily_active
)
SELECT customer_id, min(day) AS streak_start, max(day) AS streak_end, count(*) AS days
FROM numbered
GROUP BY customer_id, grp
ORDER BY customer_id, streak_start;

-- @name m8.gaps
-- @engines duckdb postgres
SELECT customer_id, day AS last_active, next_day AS back_on, next_day - day - 1 AS days_missed
FROM (
  SELECT customer_id, day,
         LEAD(day) OVER (PARTITION BY customer_id ORDER BY day) AS next_day
  FROM daily_active
) AS t
WHERE next_day - day > 1
ORDER BY customer_id, day;

-- @name m8.sessions
-- @engines duckdb postgres
WITH flagged AS (
  SELECT event_id, customer_id, event_ts, event_type,
         CASE WHEN LAG(event_ts) OVER w IS NULL
                OR event_ts - LAG(event_ts) OVER w > INTERVAL '30 minutes'
              THEN 1 ELSE 0 END AS is_new
  FROM events
  WINDOW w AS (PARTITION BY customer_id ORDER BY event_ts, event_id)
),
numbered AS (
  SELECT *, sum(is_new) OVER (PARTITION BY customer_id ORDER BY event_ts, event_id) AS session_no
  FROM flagged
)
SELECT customer_id, session_no, min(event_ts) AS started, max(event_ts) AS ended, count(*) AS events
FROM numbered
GROUP BY customer_id, session_no
ORDER BY customer_id NULLS LAST, session_no;

-- @name m8.sessions_sqlite
-- @engines sqlite
WITH flagged AS (
  SELECT event_id, customer_id, event_ts, event_type,
         CASE WHEN LAG(event_ts) OVER w IS NULL
                OR round((julianday(event_ts) - julianday(LAG(event_ts) OVER w)) * 1440) > 30
              THEN 1 ELSE 0 END AS is_new
  FROM events
  WINDOW w AS (PARTITION BY customer_id ORDER BY event_ts, event_id)
),
numbered AS (
  SELECT *, sum(is_new) OVER (PARTITION BY customer_id ORDER BY event_ts, event_id) AS session_no
  FROM flagged
)
SELECT customer_id, session_no, min(event_ts) AS started, max(event_ts) AS ended, count(*) AS events
FROM numbered
GROUP BY customer_id, session_no
ORDER BY customer_id NULLS LAST, session_no;

-- @name m8.funnel
-- @engines duckdb postgres
WITH flagged AS (
  SELECT event_id, customer_id, event_ts, event_type,
         CASE WHEN LAG(event_ts) OVER w IS NULL
                OR event_ts - LAG(event_ts) OVER w > INTERVAL '30 minutes'
              THEN 1 ELSE 0 END AS is_new
  FROM events
  WINDOW w AS (PARTITION BY customer_id ORDER BY event_ts, event_id)
),
numbered AS (
  SELECT *, sum(is_new) OVER (PARTITION BY customer_id ORDER BY event_ts, event_id) AS session_no
  FROM flagged
),
per_session AS (
  SELECT customer_id, session_no,
         max(CASE WHEN event_type = 'view' THEN 1 ELSE 0 END) AS viewed,
         max(CASE WHEN event_type = 'add_to_cart' THEN 1 ELSE 0 END) AS carted,
         max(CASE WHEN event_type = 'checkout' THEN 1 ELSE 0 END) AS checked_out,
         max(CASE WHEN event_type = 'purchase' THEN 1 ELSE 0 END) AS purchased
  FROM numbered
  GROUP BY customer_id, session_no
)
SELECT count(*) AS sessions, sum(viewed) AS viewed, sum(carted) AS carted,
       sum(checked_out) AS checked_out, sum(purchased) AS purchased
FROM per_session;

-- @name m8.funnel_events
-- @engines duckdb postgres sqlite
SELECT count(*) FILTER (WHERE event_type = 'view') AS views,
       count(*) FILTER (WHERE event_type = 'add_to_cart') AS carts,
       count(*) FILTER (WHERE event_type = 'checkout') AS checkouts,
       count(*) FILTER (WHERE event_type = 'purchase') AS purchases
FROM events;

-- @name m8.retention
-- @engines duckdb postgres
WITH first_day AS (
  SELECT customer_id, min(day) AS cohort_day
  FROM daily_active
  GROUP BY customer_id
),
offsets AS (
  SELECT f.cohort_day, a.customer_id, a.day - f.cohort_day AS day_n
  FROM daily_active AS a
  JOIN first_day AS f ON f.customer_id = a.customer_id
)
SELECT cohort_day,
       count(DISTINCT customer_id) AS cohort_size,
       count(DISTINCT CASE WHEN day_n = 1 THEN customer_id END) AS day_1,
       count(DISTINCT CASE WHEN day_n = 2 THEN customer_id END) AS day_2,
       count(DISTINCT CASE WHEN day_n = 3 THEN customer_id END) AS day_3
FROM offsets
GROUP BY cohort_day
ORDER BY cohort_day;

-- @name m8.retention_sqlite
-- @engines sqlite
WITH first_day AS (
  SELECT customer_id, min(day) AS cohort_day
  FROM daily_active
  GROUP BY customer_id
),
offsets AS (
  SELECT f.cohort_day, a.customer_id, CAST(julianday(a.day) - julianday(f.cohort_day) AS INTEGER) AS day_n
  FROM daily_active AS a
  JOIN first_day AS f ON f.customer_id = a.customer_id
)
SELECT cohort_day,
       count(DISTINCT customer_id) AS cohort_size,
       count(DISTINCT CASE WHEN day_n = 1 THEN customer_id END) AS day_1,
       count(DISTINCT CASE WHEN day_n = 2 THEN customer_id END) AS day_2,
       count(DISTINCT CASE WHEN day_n = 3 THEN customer_id END) AS day_3
FROM offsets
GROUP BY cohort_day
ORDER BY cohort_day;

-- @name m8.pivot
-- @engines duckdb postgres sqlite
SELECT store_id,
       sum(total) FILTER (WHERE channel = 'web') AS web,
       sum(total) FILTER (WHERE channel = 'app') AS app,
       sum(total) FILTER (WHERE channel = 'store') AS in_store
FROM orders
WHERE status = 'paid'
GROUP BY store_id
ORDER BY store_id;

-- @name m8.pivot_case
-- @engines duckdb postgres sqlite
SELECT store_id,
       sum(CASE WHEN channel = 'web' THEN total ELSE 0 END) AS web,
       sum(CASE WHEN channel = 'app' THEN total ELSE 0 END) AS app,
       sum(CASE WHEN channel = 'store' THEN total ELSE 0 END) AS in_store
FROM orders
WHERE status = 'paid'
GROUP BY store_id
ORDER BY store_id;

-- @name m8.pivot_duckdb
-- @engines duckdb
PIVOT (SELECT store_id, channel, total FROM orders WHERE status = 'paid')
ON channel
USING sum(total)
GROUP BY store_id
ORDER BY store_id;

-- @name m8.asof
-- @engines duckdb postgres
SELECT i.order_id, i.product_id, CAST(o.order_ts AS DATE) AS order_day, i.unit_price AS charged, ph.price AS list_price
FROM order_items AS i
JOIN orders AS o ON o.order_id = i.order_id
JOIN price_history AS ph
  ON ph.product_id = i.product_id
 AND CAST(o.order_ts AS DATE) BETWEEN ph.valid_from AND ph.valid_to
WHERE i.unit_price <> ph.price
ORDER BY i.order_id, i.line_no;

-- @name m8.asof_sqlite
-- @engines sqlite
SELECT i.order_id, i.product_id, date(o.order_ts) AS order_day, i.unit_price AS charged, ph.price AS list_price
FROM order_items AS i
JOIN orders AS o ON o.order_id = i.order_id
JOIN price_history AS ph
  ON ph.product_id = i.product_id
 AND date(o.order_ts) BETWEEN ph.valid_from AND ph.valid_to
WHERE i.unit_price <> ph.price
ORDER BY i.order_id, i.line_no;

-- @name m8.asof_join
-- @engines duckdb
SELECT i.order_id, i.product_id, CAST(o.order_ts AS DATE) AS order_day, i.unit_price AS charged, ph.price AS list_price
FROM order_items AS i
JOIN orders AS o ON o.order_id = i.order_id
ASOF JOIN price_history AS ph
  ON ph.product_id = i.product_id
 AND o.order_ts >= ph.valid_from
WHERE i.unit_price <> ph.price
ORDER BY i.order_id, i.line_no;

-- @name m8.ch_streak
-- @engines duckdb postgres
WITH numbered AS (
  SELECT customer_id, day,
         day - CAST(ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY day) AS INTEGER) AS grp
  FROM daily_active
),
streaks AS (
  SELECT customer_id, count(*) AS days
  FROM numbered
  GROUP BY customer_id, grp
)
SELECT customer_id, max(days) AS longest_streak
FROM streaks
GROUP BY customer_id
ORDER BY customer_id;

-- @name m8.ch_sessions
-- @engines duckdb postgres
SELECT customer_id, sum(is_new) AS sessions
FROM (
  SELECT customer_id,
         CASE WHEN LAG(event_ts) OVER w IS NULL
                OR event_ts - LAG(event_ts) OVER w > INTERVAL '30 minutes'
              THEN 1 ELSE 0 END AS is_new
  FROM events
  WINDOW w AS (PARTITION BY customer_id ORDER BY event_ts, event_id)
) AS f
GROUP BY customer_id
ORDER BY customer_id NULLS LAST;

-- @name m8.island_trick
-- @engines duckdb postgres
SELECT day,
       ROW_NUMBER() OVER (ORDER BY day) AS rn,
       day - CAST(ROW_NUMBER() OVER (ORDER BY day) AS INTEGER) AS grp
FROM daily_active
WHERE customer_id = 1
ORDER BY day;
