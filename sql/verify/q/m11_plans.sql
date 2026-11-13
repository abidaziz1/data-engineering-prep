-- Mission 11: single-session statements for the coding rounds. The plans are recorded in s_plans.py.

-- @name m11.ch_range
-- @engines duckdb postgres sqlite
SELECT count(*) AS orders
FROM orders
WHERE order_ts >= '2026-03-03' AND order_ts < '2026-03-04';

-- @name m11.ch_range_cast
-- @engines duckdb postgres
SELECT count(*) AS orders
FROM orders
WHERE CAST(order_ts AS DATE) = DATE '2026-03-03';

-- @name m11.ch_sargable
-- @engines duckdb postgres sqlite
SELECT order_id, total
FROM orders
WHERE total > 15
ORDER BY order_id;

-- @name m11.ch_sargable_bad
-- @engines duckdb postgres sqlite
SELECT order_id, total
FROM orders
WHERE total * 2 > 30
ORDER BY order_id;

-- @name m11.ch_keyset
-- @engines duckdb postgres sqlite
SELECT order_id, status, total
FROM orders
WHERE order_id > 1004
ORDER BY order_id
LIMIT 5;
