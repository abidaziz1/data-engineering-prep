-- Mission 7: dates, times, time zones, strings, JSON and arrays.

-- @name m7.trunc
-- @engines duckdb postgres
SELECT date_trunc('week', order_ts) AS week_start,
       count(*) AS orders,
       sum(total) AS revenue
FROM orders
GROUP BY date_trunc('week', order_ts)
ORDER BY week_start;

-- @name m7.trunc_sqlite
-- @engines sqlite
SELECT date(order_ts, 'weekday 0', '-6 days') AS week_start,
       count(*) AS orders,
       sum(total) AS revenue
FROM orders
GROUP BY date(order_ts, 'weekday 0', '-6 days')
ORDER BY week_start;

-- @name m7.parts
-- @engines duckdb postgres
SELECT order_id, order_ts,
       extract(isodow FROM order_ts) AS isodow,
       extract(dow FROM order_ts) AS dow,
       extract(week FROM order_ts) AS iso_week
FROM orders
WHERE order_id IN (1001, 1002, 1011)
ORDER BY order_id;

-- @name m7.parts_sqlite
-- @engines sqlite
SELECT order_id, order_ts,
       CAST(strftime('%u', order_ts) AS INTEGER) AS isodow,
       CAST(strftime('%w', order_ts) AS INTEGER) AS dow,
       CAST(strftime('%V', order_ts) AS INTEGER) AS iso_week,
       CAST(strftime('%W', order_ts) AS INTEGER) AS week_monday_first
FROM orders
WHERE order_id IN (1001, 1002, 1011)
ORDER BY order_id;

-- @name m7.arith_duckdb
-- @engines duckdb
SELECT o.order_id,
       date_diff('minute', o.order_ts, min(p.paid_ts)) AS first_payment_after,
       date_diff('minute', o.order_ts, max(p.paid_ts)) AS last_payment_after
FROM orders AS o
JOIN payments AS p ON p.order_id = o.order_id
GROUP BY o.order_id, o.order_ts
ORDER BY o.order_id;

-- @name m7.arith_postgres
-- @engines postgres
SELECT o.order_id,
       CAST(extract(epoch FROM min(p.paid_ts) - o.order_ts) / 60 AS INTEGER) AS first_payment_after,
       CAST(extract(epoch FROM max(p.paid_ts) - o.order_ts) / 60 AS INTEGER) AS last_payment_after
FROM orders AS o
JOIN payments AS p ON p.order_id = o.order_id
GROUP BY o.order_id, o.order_ts
ORDER BY o.order_id;

-- @name m7.arith_sqlite
-- @engines sqlite
SELECT o.order_id,
       CAST(round((julianday(min(p.paid_ts)) - julianday(o.order_ts)) * 1440) AS INTEGER) AS first_payment_after,
       CAST(round((julianday(max(p.paid_ts)) - julianday(o.order_ts)) * 1440) AS INTEGER) AS last_payment_after
FROM orders AS o
JOIN payments AS p ON p.order_id = o.order_id
GROUP BY o.order_id, o.order_ts
ORDER BY o.order_id;

-- @name m7.month_end
-- @engines duckdb postgres
SELECT CAST(DATE '2026-01-31' + INTERVAL '1 month' AS DATE) AS plus_one_month,
       CAST(DATE '2026-03-31' - INTERVAL '1 month' AS DATE) AS minus_one_month;

-- @name m7.month_end_sqlite
-- @engines sqlite
SELECT date('2026-01-31', '+1 month') AS plus_one_month,
       date('2026-03-31', '-1 month') AS minus_one_month;

-- @name m7.shift
-- @engines duckdb postgres
SELECT order_id, order_ts,
       order_ts + INTERVAL '7 days' AS refund_deadline,
       CAST(order_ts AS DATE) + 7 AS refund_deadline_day
FROM orders
WHERE order_id IN (1001, 1004)
ORDER BY order_id;

-- @name m7.tz_local
-- @engines duckdb postgres
WITH store_tz(store_id, tz) AS (
  VALUES (1, 'Asia/Singapore'), (2, 'Asia/Kuala_Lumpur'), (3, 'Asia/Jakarta'), (4, 'Australia/Sydney')
)
SELECT o.order_id, o.store_id, z.tz,
       o.order_ts AS utc_ts,
       (o.order_ts AT TIME ZONE 'UTC') AT TIME ZONE z.tz AS local_ts
FROM orders AS o
JOIN store_tz AS z ON z.store_id = o.store_id
ORDER BY o.order_id;

-- @name m7.tz_day
-- @engines duckdb postgres
WITH store_tz(store_id, tz) AS (
  VALUES (1, 'Asia/Singapore'), (2, 'Asia/Kuala_Lumpur'), (3, 'Asia/Jakarta'), (4, 'Australia/Sydney')
),
local AS (
  SELECT o.order_id,
         CAST(o.order_ts AS DATE) AS utc_day,
         CAST((o.order_ts AT TIME ZONE 'UTC') AT TIME ZONE z.tz AS DATE) AS local_day
  FROM orders AS o
  JOIN store_tz AS z ON z.store_id = o.store_id
)
SELECT order_id, utc_day, local_day
FROM local
WHERE utc_day <> local_day
ORDER BY order_id;

-- @name m7.tz_sqlite
-- @engines sqlite
SELECT order_id, order_ts AS utc_ts, datetime(order_ts, '+8 hours') AS singapore_ts
FROM orders
WHERE store_id = 1
ORDER BY order_id;

-- @name m7.tz_sqlite_error
-- @engines sqlite
-- @error
SELECT order_ts AT TIME ZONE 'Asia/Singapore' FROM orders;

-- @name m7.fmt
-- @engines duckdb
SELECT strftime(order_ts, '%Y-%m-%d %H:%M') AS minute_text,
       strftime(order_ts, '%Y-%m') AS month_text
FROM orders
WHERE order_id = 1001;

-- @name m7.fmt_postgres
-- @engines postgres
SELECT to_char(order_ts, 'YYYY-MM-DD HH24:MI') AS minute_text,
       to_char(order_ts, 'YYYY-MM') AS month_text
FROM orders
WHERE order_id = 1001;

-- @name m7.fmt_sqlite
-- @engines sqlite
SELECT strftime('%Y-%m-%d %H:%M', order_ts) AS minute_text,
       strftime('%Y-%m', order_ts) AS month_text
FROM orders
WHERE order_id = 1001;

-- @name m7.strings
-- @engines duckdb postgres sqlite
SELECT customer_id, name,
       upper(name) AS shouted,
       length(name) AS chars,
       substr(name, 1, 3) AS first3,
       replace(lower(name), ' ', '.') AS handle
FROM customers
ORDER BY customer_id;

-- @name m7.domain
-- @engines duckdb postgres
SELECT customer_id, email, split_part(email, '@', 2) AS domain
FROM customers
ORDER BY customer_id;

-- @name m7.domain_sqlite
-- @engines sqlite
SELECT customer_id, email, substr(email, instr(email, '@') + 1) AS domain
FROM customers
ORDER BY customer_id;

-- @name m7.regex
-- @engines duckdb postgres sqlite
-- @each
SELECT name, regexp_replace(name, '[aeiou]', '*', 'g') AS masked
FROM customers
ORDER BY customer_id;

-- @name m7.bytes
-- @engines postgres sqlite
SELECT 'Zoë' AS s, length('Zoë') AS chars, octet_length('Zoë') AS bytes;

-- @name m7.bytes_duckdb
-- @engines duckdb
SELECT 'Zoë' AS s, length('Zoë') AS chars, strlen('Zoë') AS bytes;

-- @name m7.collation
-- @engines duckdb postgres sqlite
WITH w(word) AS (
  VALUES ('banana'), ('Banana'), ('apple'), ('Éclair'), ('cherry'), ('Apple')
)
SELECT word FROM w ORDER BY word;

-- @name m7.collation_nocase
-- @engines duckdb sqlite
WITH w(word) AS (
  VALUES ('banana'), ('Banana'), ('apple'), ('Éclair'), ('cherry'), ('Apple')
)
SELECT word FROM w ORDER BY word COLLATE NOCASE, word;

-- @name m7.collation_icu
-- @engines postgres
WITH w(word) AS (
  VALUES ('banana'), ('Banana'), ('apple'), ('Éclair'), ('cherry'), ('Apple')
)
SELECT word FROM w ORDER BY word COLLATE "und-x-icu";

-- @name m7.collation_en
-- @engines duckdb
WITH w(word) AS (
  VALUES ('banana'), ('Banana'), ('apple'), ('Éclair'), ('cherry'), ('Apple')
)
SELECT word FROM w ORDER BY word COLLATE en;

-- @name m7.json_data
-- @engines duckdb postgres sqlite
-- @setup app_events
SELECT event_id, payload FROM app_events ORDER BY event_id;

-- @name m7.json_fields_duckdb
-- @engines duckdb
-- @setup app_events
SELECT event_id,
       payload ->> '$.device' AS device,
       payload ->> '$.cart.coupon' AS coupon,
       json_array_length(payload, '$.cart.items') AS items
FROM app_events
ORDER BY event_id;

-- @name m7.json_fields_postgres
-- @engines postgres
-- @setup app_events
SELECT event_id,
       payload::jsonb ->> 'device' AS device,
       payload::jsonb #>> '{cart,coupon}' AS coupon,
       jsonb_array_length(payload::jsonb #> '{cart,items}') AS items
FROM app_events
ORDER BY event_id;

-- @name m7.json_fields_sqlite
-- @engines sqlite
-- @setup app_events
SELECT event_id,
       json_extract(payload, '$.device') AS device,
       json_extract(payload, '$.cart.coupon') AS coupon,
       json_array_length(payload, '$.cart.items') AS items
FROM app_events
ORDER BY event_id;

-- @name m7.json_flat_duckdb
-- @engines duckdb
-- @setup app_events
SELECT e.event_id, j.item.sku AS sku, j.item.qty AS qty
FROM app_events AS e
CROSS JOIN LATERAL (
  SELECT unnest(from_json(e.payload -> '$.cart.items', '[{"sku":"VARCHAR","qty":"INTEGER"}]')) AS item
) AS j
ORDER BY e.event_id, sku;

-- @name m7.json_flat_postgres
-- @engines postgres
-- @setup app_events
SELECT e.event_id, j.item ->> 'sku' AS sku, CAST(j.item ->> 'qty' AS INTEGER) AS qty
FROM app_events AS e
CROSS JOIN LATERAL jsonb_array_elements(e.payload::jsonb #> '{cart,items}') AS j(item)
ORDER BY e.event_id, sku;

-- @name m7.json_flat_sqlite
-- @engines sqlite
-- @setup app_events
SELECT e.event_id, json_extract(j.value, '$.sku') AS sku, json_extract(j.value, '$.qty') AS qty
FROM app_events AS e
CROSS JOIN json_each(e.payload, '$.cart.items') AS j
ORDER BY e.event_id, sku;

-- @name m7.json_flat_left_duckdb
-- @engines duckdb
-- @setup app_events
SELECT e.event_id, j.item.sku AS sku, j.item.qty AS qty
FROM app_events AS e
LEFT JOIN LATERAL (
  SELECT unnest(from_json(e.payload -> '$.cart.items', '[{"sku":"VARCHAR","qty":"INTEGER"}]')) AS item
) AS j ON true
ORDER BY e.event_id, sku;

-- @name m7.json_flat_left_postgres
-- @engines postgres
-- @setup app_events
SELECT e.event_id, j.item ->> 'sku' AS sku, CAST(j.item ->> 'qty' AS INTEGER) AS qty
FROM app_events AS e
LEFT JOIN LATERAL jsonb_array_elements(e.payload::jsonb #> '{cart,items}') AS j(item) ON true
ORDER BY e.event_id, sku;

-- @name m7.json_flat_left_sqlite
-- @engines sqlite
-- @setup app_events
SELECT e.event_id, json_extract(j.value, '$.sku') AS sku, json_extract(j.value, '$.qty') AS qty
FROM app_events AS e
LEFT JOIN json_each(e.payload, '$.cart.items') AS j
ORDER BY e.event_id, sku;

-- @name m7.arrays_duckdb
-- @engines duckdb
SELECT i.order_id,
       list(p.name ORDER BY i.line_no) AS products,
       len(list(p.name)) AS lines,
       list_contains(list(p.name), 'Latte') AS has_latte
FROM order_items AS i
JOIN products AS p ON p.product_id = i.product_id
WHERE i.order_id IN (1001, 1002, 1011)
GROUP BY i.order_id
ORDER BY i.order_id;

-- @name m7.arrays_postgres
-- @engines postgres
SELECT i.order_id,
       array_agg(p.name ORDER BY i.line_no) AS products,
       cardinality(array_agg(p.name)) AS lines,
       'Latte' = ANY(array_agg(p.name)) AS has_latte
FROM order_items AS i
JOIN products AS p ON p.product_id = i.product_id
WHERE i.order_id IN (1001, 1002, 1011)
GROUP BY i.order_id
ORDER BY i.order_id;

-- @name m7.arrays_sqlite
-- @engines sqlite
SELECT order_id,
       json_group_array(name) AS products,
       count(*) AS lines,
       max(name = 'Latte') AS has_latte
FROM (
  SELECT i.order_id, p.name
  FROM order_items AS i
  JOIN products AS p ON p.product_id = i.product_id
  WHERE i.order_id IN (1001, 1002, 1011)
  ORDER BY i.order_id, i.line_no
)
GROUP BY order_id
ORDER BY order_id;

-- @name m7.ch_domain
-- @engines duckdb postgres
SELECT coalesce(split_part(email, '@', 2), 'unknown') AS domain, count(*) AS customers
FROM customers
GROUP BY coalesce(split_part(email, '@', 2), 'unknown')
ORDER BY customers DESC, domain;

-- @name m7.ch_firstorder
-- @engines duckdb postgres
SELECT c.customer_id, c.name,
       CAST(min(o.order_ts) AS DATE) - c.signup_date AS days_to_first_order
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.name, c.signup_date
ORDER BY c.customer_id;

-- @name m7.ch_localday
-- @engines duckdb postgres
WITH store_tz(store_id, tz) AS (
  VALUES (1, 'Asia/Singapore'), (2, 'Asia/Kuala_Lumpur'), (3, 'Asia/Jakarta'), (4, 'Australia/Sydney')
)
SELECT z.store_id,
       CAST((o.order_ts AT TIME ZONE 'UTC') AT TIME ZONE z.tz AS DATE) AS local_day,
       count(*) AS orders
FROM orders AS o
JOIN store_tz AS z ON z.store_id = o.store_id
GROUP BY z.store_id, CAST((o.order_ts AT TIME ZONE 'UTC') AT TIME ZONE z.tz AS DATE)
ORDER BY z.store_id, local_day;
