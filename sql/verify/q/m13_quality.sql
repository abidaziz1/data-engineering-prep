-- Mission 13: data quality checks written as SQL. Each check returns the number of bad rows: 0 passes.

-- @name m13.dq
-- @engines duckdb postgres sqlite
SELECT 'orders: order_id is unique' AS check_name, count(*) - count(DISTINCT order_id) AS bad_rows FROM orders
UNION ALL
SELECT 'orders: customer_id is not null', count(*) FROM orders WHERE customer_id IS NULL
UNION ALL
SELECT 'orders: status is an accepted value', count(*) FROM orders WHERE status NOT IN ('paid', 'cancelled', 'refunded', 'pending')
UNION ALL
SELECT 'orders: the customer exists', count(*)
FROM orders AS o LEFT JOIN customers AS c ON c.customer_id = o.customer_id
WHERE o.customer_id IS NOT NULL AND c.customer_id IS NULL
UNION ALL
SELECT 'orders: total equals the sum of its lines', count(*)
FROM (SELECT o.order_id FROM orders AS o JOIN order_items AS i ON i.order_id = o.order_id
      GROUP BY o.order_id, o.total HAVING sum(i.qty * i.unit_price) <> o.total) AS t
UNION ALL
SELECT 'orders_raw: one row for each order', count(*) - count(DISTINCT order_id) FROM orders_raw
UNION ALL
SELECT 'customers: email is present', count(*) FROM customers WHERE email IS NULL
UNION ALL
SELECT 'payments: a paid order has a payment', count(*)
FROM orders AS o
WHERE o.status = 'paid' AND NOT EXISTS (SELECT 1 FROM payments AS p WHERE p.order_id = o.order_id AND p.status = 'ok')
UNION ALL
SELECT 'order_items: price equals the list price that day', count(*)
FROM order_items AS i
JOIN orders AS o ON o.order_id = i.order_id
JOIN price_history AS ph ON ph.product_id = i.product_id AND date(o.order_ts) BETWEEN ph.valid_from AND ph.valid_to
WHERE i.unit_price <> ph.price
UNION ALL
SELECT 'orders: the newest order is less than 3 days old on 10 March', CASE WHEN max(order_ts) >= '2026-03-07' THEN 0 ELSE 1 END FROM orders
UNION ALL
SELECT 'orders: the row count is between 10 and 20', CASE WHEN count(*) BETWEEN 10 AND 20 THEN 0 ELSE 1 END FROM orders
ORDER BY 1;

-- @name m13.dq_unique_fail
-- @engines duckdb postgres sqlite
SELECT order_id, count(*) AS versions
FROM orders_raw
GROUP BY order_id
HAVING count(*) > 1
ORDER BY order_id;

-- @name m13.dq_anti_join
-- @engines duckdb postgres sqlite
SELECT o.order_id, o.customer_id
FROM orders AS o
LEFT JOIN customers AS c ON c.customer_id = o.customer_id
WHERE c.customer_id IS NULL
ORDER BY o.order_id;

-- @name m13.ch_not_null
-- @engines duckdb postgres sqlite
SELECT count(*) AS bad_rows
FROM customers
WHERE email IS NULL OR country IS NULL;

-- @name m13.ch_accepted
-- @engines duckdb postgres sqlite
SELECT status, count(*) AS rows_with_status
FROM orders
WHERE status NOT IN ('paid', 'cancelled', 'refunded')
GROUP BY status
ORDER BY status;

-- @name m13.dq_count_bug
-- @engines duckdb postgres sqlite
SELECT count(customer_id) AS bad_rows
FROM orders
WHERE customer_id IS NULL;

-- @name m13.dq_count_right
-- @engines duckdb postgres sqlite
SELECT count(*) AS bad_rows
FROM orders
WHERE customer_id IS NULL;
