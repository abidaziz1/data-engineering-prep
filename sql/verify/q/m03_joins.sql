-- Mission 3: joins, fan-out and grain.

-- @name m3.left_on
-- @engines duckdb
SELECT c.customer_id, c.name, count(o.order_id) AS paid_orders
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.customer_id AND o.status = 'paid'
GROUP BY c.customer_id, c.name
ORDER BY c.customer_id;

-- @name m3.left_where
-- @engines duckdb
SELECT c.customer_id, c.name, count(o.order_id) AS paid_orders
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.customer_id
WHERE o.status = 'paid'
GROUP BY c.customer_id, c.name
ORDER BY c.customer_id;

-- @name m3.onwhere_counts
-- @engines duckdb postgres sqlite
SELECT 'filter in ON' AS variant, count(*) AS rows
FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.customer_id AND o.status = 'paid'
UNION ALL
SELECT 'filter in WHERE', count(*)
FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.customer_id
WHERE o.status = 'paid'
UNION ALL
SELECT 'no filter', count(*)
FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.customer_id;

-- @name m3.fanout_payments
-- @engines duckdb
SELECT o.order_id, o.total, p.payment_id, p.amount
FROM orders AS o
JOIN payments AS p ON p.order_id = o.order_id
WHERE o.status = 'paid'
ORDER BY o.order_id, p.payment_id;

-- @name m3.fanout_sum
-- @engines duckdb postgres sqlite
SELECT 'orders only' AS joined_with, count(*) AS rows, sum(o.total) AS revenue
FROM orders AS o
WHERE o.status = 'paid'
UNION ALL
SELECT 'orders and payments', count(*), sum(o.total)
FROM orders AS o
JOIN payments AS p ON p.order_id = o.order_id
WHERE o.status = 'paid';

-- @name m3.grain_multi
-- @engines duckdb
SELECT order_id, count(*) AS payments
FROM payments
GROUP BY order_id
HAVING count(*) > 1
ORDER BY order_id;

-- @name m3.grain_counts
-- @engines duckdb
SELECT count(*)                 AS payment_rows,
       count(DISTINCT order_id) AS orders_paid
FROM payments;

-- @name m3.preagg_orders
-- @engines duckdb
WITH paid_by_order AS (
  SELECT order_id, sum(amount) AS net_paid
  FROM payments
  GROUP BY order_id
)
SELECT o.order_id, o.status, o.total, p.net_paid
FROM orders AS o
LEFT JOIN paid_by_order AS p ON p.order_id = o.order_id
ORDER BY o.order_id;

-- @name m3.preagg_revenue
-- @engines duckdb postgres sqlite
WITH paid_by_order AS (
  SELECT order_id, sum(amount) AS net_paid
  FROM payments
  GROUP BY order_id
)
SELECT count(*) AS rows, sum(o.total) AS revenue
FROM orders AS o
LEFT JOIN paid_by_order AS p ON p.order_id = o.order_id
WHERE o.status = 'paid';

-- @name m3.distinct_trap
-- @engines duckdb
SELECT count(*)               AS paid_orders,
       sum(total)             AS plain_sum,
       sum(DISTINCT total)    AS distinct_sum,
       count(DISTINCT total)  AS different_totals
FROM big_orders
WHERE status = 'paid';

-- @name m3.self_join
-- @engines duckdb postgres sqlite
SELECT c.category_id, c.name AS category, p.name AS parent
FROM categories AS c
LEFT JOIN categories AS p ON p.category_id = c.parent_id
ORDER BY c.category_id;

-- @name m3.range_join
-- @engines duckdb postgres
SELECT i.order_id, i.line_no, i.product_id, CAST(o.order_ts AS DATE) AS order_day,
       i.unit_price AS charged, h.price AS list_price
FROM order_items AS i
JOIN orders AS o ON o.order_id = i.order_id
JOIN price_history AS h
  ON h.product_id = i.product_id
 AND CAST(o.order_ts AS DATE) BETWEEN h.valid_from AND h.valid_to
WHERE i.unit_price <> h.price
ORDER BY i.order_id, i.line_no;

-- @name m3.natural
-- @engines duckdb postgres sqlite
SELECT count(*) AS rows
FROM customers
NATURAL JOIN stores;

-- @name m3.lateral
-- @engines duckdb postgres
SELECT c.customer_id, c.name, last_order.order_id, last_order.order_ts, last_order.total
FROM customers AS c
CROSS JOIN LATERAL (
  SELECT o.order_id, o.order_ts, o.total
  FROM orders AS o
  WHERE o.customer_id = c.customer_id
  ORDER BY o.order_ts DESC
  LIMIT 1
) AS last_order
ORDER BY c.customer_id;

-- @name m3.using
-- @engines duckdb postgres sqlite
SELECT customer_id, name, order_id
FROM customers
JOIN orders USING (customer_id)
WHERE order_id < 1004
ORDER BY order_id;

-- @name m3.ch_paid_by_order
-- @engines duckdb
SELECT o.order_id, o.total, coalesce(sum(p.amount), 0) AS paid
FROM orders AS o
LEFT JOIN payments AS p ON p.order_id = o.order_id
GROUP BY o.order_id, o.total
ORDER BY o.order_id;

-- @name m3.ch_country
-- @engines duckdb
SELECT c.country, count(*) AS orders, sum(o.total) AS revenue
FROM orders AS o
JOIN customers AS c ON c.customer_id = o.customer_id
WHERE o.status = 'paid'
  AND EXISTS (SELECT 1 FROM payments AS p WHERE p.order_id = o.order_id AND p.status = 'ok')
GROUP BY c.country
ORDER BY revenue DESC;

-- @name m3.ch_country_wrong
-- @engines duckdb
SELECT c.country, count(*) AS orders, sum(o.total) AS revenue
FROM orders AS o
JOIN customers AS c ON c.customer_id = o.customer_id
JOIN payments AS p ON p.order_id = o.order_id AND p.status = 'ok'
WHERE o.status = 'paid'
GROUP BY c.country
ORDER BY revenue DESC;
