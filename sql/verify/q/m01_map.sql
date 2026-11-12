-- Mission 1: how a query runs. Every block here ran; the recording keeps the SQL and what came back.

-- @name m1.revenue
-- @engines duckdb
SELECT c.country,
       count(*)                AS orders,
       sum(o.total)            AS revenue,
       round(avg(o.total), 2)  AS avg_order
FROM orders AS o
JOIN customers AS c ON c.customer_id = o.customer_id
WHERE o.status = 'paid'
GROUP BY c.country
HAVING sum(o.total) > 10
ORDER BY revenue DESC
LIMIT 3;

-- @name m1.alias_where
-- @engines duckdb postgres sqlite
-- @each
SELECT order_id, total * 2 AS doubled
FROM orders
WHERE doubled > 30
ORDER BY order_id;

-- @name m1.alias_order
-- @engines duckdb postgres sqlite
SELECT order_id, total * 2 AS doubled
FROM orders
ORDER BY doubled DESC
LIMIT 3;

-- @name m1.alias_group
-- @engines duckdb postgres sqlite
-- @each
SELECT upper(status) AS s, count(*) AS n
FROM orders
GROUP BY s
ORDER BY s;

-- @name m1.limit_order
-- @engines duckdb
SELECT order_id, total
FROM orders
ORDER BY total DESC, order_id
LIMIT 3;

-- @name m1.where_vs_having_error
-- @engines postgres
-- @error
SELECT country, count(*) AS n
FROM customers
WHERE count(*) > 1
GROUP BY country;

-- @name m1.having_fixed
-- @engines duckdb
SELECT country, count(*) AS n
FROM customers
GROUP BY country
HAVING count(*) > 1
ORDER BY country;

-- @name m1.ch_store_revenue
-- @engines duckdb
SELECT store_id,
       count(*)   AS orders,
       sum(total) AS revenue
FROM orders
WHERE status = 'paid'
GROUP BY store_id
ORDER BY revenue DESC;
