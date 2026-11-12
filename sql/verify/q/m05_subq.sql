-- Mission 5: subqueries, CTEs and recursive CTEs.

-- @name m5.scalar
-- @engines duckdb postgres sqlite
SELECT order_id, total
FROM orders
WHERE status = 'paid'
  AND total > (SELECT avg(total) FROM orders WHERE status = 'paid')
ORDER BY order_id;

-- @name m5.in_subquery
-- @engines duckdb postgres sqlite
SELECT customer_id, name
FROM customers
WHERE customer_id IN (SELECT customer_id FROM orders WHERE store_id = 1)
ORDER BY customer_id;

-- @name m5.in_join
-- @engines duckdb postgres sqlite
SELECT c.customer_id, c.name
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.customer_id
WHERE o.store_id = 1
ORDER BY c.customer_id, o.order_id;

-- @name m5.correlated
-- @engines duckdb postgres sqlite
SELECT c.customer_id,
       c.name,
       (SELECT max(o.total) FROM orders AS o WHERE o.customer_id = c.customer_id) AS biggest_order
FROM customers AS c
ORDER BY c.customer_id;

-- @name m5.scalar_many
-- @engines duckdb postgres sqlite
-- @each
SELECT c.name,
       (SELECT o.order_id FROM orders AS o WHERE o.customer_id = c.customer_id) AS order_id
FROM customers AS c
ORDER BY c.customer_id;

-- @name m5.derived
-- @engines duckdb postgres sqlite
SELECT customer_id, spent
FROM (
  SELECT customer_id, sum(total) AS spent
  FROM orders
  WHERE status = 'paid' AND customer_id IS NOT NULL
  GROUP BY customer_id
) AS per_customer
WHERE spent > 30
ORDER BY spent DESC;

-- @name m5.cte
-- @engines duckdb postgres sqlite
WITH paid AS (
  SELECT order_id, customer_id, total
  FROM orders
  WHERE status = 'paid' AND customer_id IS NOT NULL
),
per_customer AS (
  SELECT customer_id, count(*) AS orders, sum(total) AS spent
  FROM paid
  GROUP BY customer_id
)
SELECT c.name, p.orders, p.spent
FROM per_customer AS p
JOIN customers AS c ON c.customer_id = p.customer_id
WHERE p.spent > 30
ORDER BY p.spent DESC;

-- @name m5.cte_reuse
-- @engines duckdb postgres sqlite
WITH per_store AS (
  SELECT store_id, sum(total) AS revenue
  FROM orders
  WHERE status = 'paid'
  GROUP BY store_id
)
SELECT store_id,
       revenue,
       round(100.0 * revenue / (SELECT sum(revenue) FROM per_store), 1) AS share_percent
FROM per_store
ORDER BY revenue DESC;

-- @name m5.tree
-- @engines duckdb postgres sqlite
WITH RECURSIVE tree AS (
  SELECT category_id, name, 0 AS depth, name AS path
  FROM categories
  WHERE parent_id IS NULL
  UNION ALL
  SELECT c.category_id, c.name, t.depth + 1, t.path || ' > ' || c.name
  FROM categories AS c
  JOIN tree AS t ON c.parent_id = t.category_id
)
SELECT category_id, depth, path
FROM tree
ORDER BY path;

-- @name m5.tree_iterations
-- @engines duckdb postgres sqlite
WITH RECURSIVE tree AS (
  SELECT category_id, name, 0 AS iteration
  FROM categories
  WHERE parent_id IS NULL
  UNION ALL
  SELECT c.category_id, c.name, t.iteration + 1
  FROM categories AS c
  JOIN tree AS t ON c.parent_id = t.category_id
)
SELECT iteration, category_id, name
FROM tree
ORDER BY iteration, category_id;

-- @name m5.calendar
-- @engines duckdb postgres
WITH RECURSIVE days(day) AS (
  SELECT DATE '2026-03-01'
  UNION ALL
  SELECT day + 1 FROM days WHERE day < DATE '2026-03-10'
)
SELECT d.day, count(o.order_id) AS orders
FROM days AS d
LEFT JOIN orders AS o ON CAST(o.order_ts AS DATE) = d.day
GROUP BY d.day
ORDER BY d.day;

-- @name m5.calendar_sqlite
-- @engines sqlite
WITH RECURSIVE days(day) AS (
  SELECT '2026-03-01'
  UNION ALL
  SELECT date(day, '+1 day') FROM days WHERE day < '2026-03-10'
)
SELECT d.day, count(o.order_id) AS orders
FROM days AS d
LEFT JOIN orders AS o ON date(o.order_ts) = d.day
GROUP BY d.day
ORDER BY d.day;

-- @name m5.series_postgres
-- @engines postgres
SELECT CAST(d AS DATE) AS day, count(o.order_id) AS orders
FROM generate_series(DATE '2026-03-01', DATE '2026-03-10', INTERVAL '1 day') AS g(d)
LEFT JOIN orders AS o ON CAST(o.order_ts AS DATE) = CAST(d AS DATE)
GROUP BY CAST(d AS DATE)
ORDER BY CAST(d AS DATE);

-- @name m5.series_duckdb
-- @engines duckdb
SELECT CAST(d AS DATE) AS day, count(o.order_id) AS orders
FROM range(DATE '2026-03-01', DATE '2026-03-11', INTERVAL 1 DAY) AS g(d)
LEFT JOIN orders AS o ON CAST(o.order_ts AS DATE) = CAST(d AS DATE)
GROUP BY CAST(d AS DATE)
ORDER BY CAST(d AS DATE);

-- @name m5.cycle_union
-- @engines duckdb postgres sqlite
UPDATE categories SET parent_id = 9 WHERE category_id = 1;
WITH RECURSIVE walk(category_id) AS (
  SELECT 1
  UNION
  SELECT c.category_id
  FROM categories AS c
  JOIN walk AS w ON c.parent_id = w.category_id
)
SELECT count(*) AS categories_reached FROM walk;

-- @name m5.cycle_union_all
-- @engines duckdb postgres sqlite
UPDATE categories SET parent_id = 9 WHERE category_id = 1;
WITH RECURSIVE walk(category_id, depth) AS (
  SELECT 1, 0
  UNION ALL
  SELECT c.category_id, w.depth + 1
  FROM categories AS c
  JOIN walk AS w ON c.parent_id = w.category_id
  WHERE w.depth < 20
)
SELECT count(*) AS rows_produced, max(depth) AS deepest FROM walk;

-- @name m5.exists
-- @engines duckdb postgres sqlite
SELECT c.customer_id, c.name
FROM customers AS c
WHERE EXISTS (
  SELECT 1
  FROM orders AS o
  WHERE o.customer_id = c.customer_id AND o.status = 'refunded'
);

-- @name m5.view
-- @engines duckdb postgres sqlite
CREATE VIEW paid_orders AS
SELECT order_id, customer_id, store_id, total
FROM orders
WHERE status = 'paid';
SELECT count(*) AS paid_orders, sum(total) AS revenue FROM paid_orders;

-- @name m5.ch_second
-- @engines duckdb postgres sqlite
SELECT max(total) AS second_highest
FROM orders
WHERE status = 'paid'
  AND total < (SELECT max(total) FROM orders WHERE status = 'paid');

-- @name m5.ch_storeavg
-- @engines duckdb postgres sqlite
SELECT o.order_id, o.store_id, o.total
FROM orders AS o
WHERE o.status = 'paid'
  AND o.total > (
    SELECT avg(i.total)
    FROM orders AS i
    WHERE i.status = 'paid' AND i.store_id = o.store_id
  )
ORDER BY o.order_id;

-- @name m5.ch_subtree
-- @engines duckdb postgres sqlite
WITH RECURSIVE sub AS (
  SELECT category_id, name, 0 AS depth
  FROM categories
  WHERE name = 'Drinks'
  UNION ALL
  SELECT c.category_id, c.name, s.depth + 1
  FROM categories AS c
  JOIN sub AS s ON c.parent_id = s.category_id
)
SELECT category_id, name, depth
FROM sub
ORDER BY depth, category_id;
