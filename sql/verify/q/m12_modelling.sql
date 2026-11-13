-- Mission 12: modelling for analytics. A star schema built from the Brewline tables. Recorded on DuckDB and PostgreSQL.

-- @name m12.build
-- @engines duckdb postgres
CREATE TABLE dim_product AS
SELECT product_id AS product_key, sku, name AS product, category
FROM products;

CREATE TABLE dim_store AS
SELECT store_id AS store_key, name AS store, city, country
FROM stores;

CREATE TABLE dim_customer AS
SELECT customer_id AS customer_key, name AS customer, country, tier
FROM customers
UNION ALL
SELECT -1, 'Unknown customer', NULL, NULL;

CREATE TABLE dim_date AS
WITH RECURSIVE d(day) AS (
  SELECT DATE '2026-03-01'
  UNION ALL
  SELECT CAST(day + 1 AS DATE) FROM d WHERE day < DATE '2026-03-10'
)
SELECT CAST(extract(year FROM day) * 10000 + extract(month FROM day) * 100 + extract(day FROM day) AS INTEGER) AS date_key,
       day,
       CAST(extract(isodow FROM day) AS INTEGER) AS iso_weekday,
       CASE WHEN extract(isodow FROM day) >= 6 THEN 'weekend' ELSE 'weekday' END AS day_type
FROM d;

CREATE TABLE fact_sales AS
SELECT i.order_id,
       i.line_no,
       CAST(extract(year FROM o.order_ts) * 10000 + extract(month FROM o.order_ts) * 100 + extract(day FROM o.order_ts) AS INTEGER) AS date_key,
       coalesce(o.customer_id, -1) AS customer_key,
       o.store_id AS store_key,
       i.product_id AS product_key,
       o.status,
       i.qty,
       i.qty * i.unit_price AS line_amount
FROM order_items AS i
JOIN orders AS o ON o.order_id = i.order_id;
SELECT (SELECT count(*) FROM dim_date) AS dim_date,
       (SELECT count(*) FROM dim_product) AS dim_product,
       (SELECT count(*) FROM dim_store) AS dim_store,
       (SELECT count(*) FROM dim_customer) AS dim_customer,
       (SELECT count(*) FROM fact_sales) AS fact_sales;

-- @name m12.fact_sample
-- @engines duckdb postgres
-- @setup star
SELECT order_id, line_no, date_key, customer_key, store_key, product_key, qty, line_amount
FROM fact_sales
ORDER BY order_id, line_no
LIMIT 6;

-- @name m12.by_category
-- @engines duckdb postgres
-- @setup star
SELECT p.category, s.country, sum(f.line_amount) AS revenue
FROM fact_sales AS f
JOIN dim_product AS p ON p.product_key = f.product_key
JOIN dim_store AS s ON s.store_key = f.store_key
WHERE f.status = 'paid'
GROUP BY p.category, s.country
ORDER BY p.category, s.country;

-- @name m12.by_daytype
-- @engines duckdb postgres
-- @setup star
SELECT d.day_type, count(DISTINCT f.order_id) AS orders, sum(f.line_amount) AS revenue
FROM fact_sales AS f
JOIN dim_date AS d ON d.date_key = f.date_key
WHERE f.status = 'paid'
GROUP BY d.day_type
ORDER BY d.day_type;

-- @name m12.unknown_customer
-- @engines duckdb postgres
-- @setup star
SELECT c.customer, count(DISTINCT f.order_id) AS orders, sum(f.line_amount) AS revenue
FROM fact_sales AS f
JOIN dim_customer AS c ON c.customer_key = f.customer_key
WHERE f.status = 'paid'
GROUP BY c.customer
ORDER BY revenue DESC;

-- @name m12.reconcile
-- @engines duckdb postgres
-- @setup star
SELECT (SELECT sum(total) FROM orders) AS orders_total,
       (SELECT sum(line_amount) FROM fact_sales) AS fact_total,
       (SELECT count(*) FROM (
          SELECT o.order_id
          FROM orders AS o
          JOIN (SELECT order_id, sum(line_amount) AS lines_total FROM fact_sales GROUP BY order_id) AS f ON f.order_id = o.order_id
          WHERE f.lines_total <> o.total
        ) AS t) AS orders_that_differ;

-- @name m12.fanout
-- @engines duckdb postgres
-- @setup star
SELECT (SELECT sum(total) FROM orders WHERE status = 'paid') AS right_revenue,
       sum(o.total) AS revenue_repeated_on_every_line
FROM orders AS o
JOIN fact_sales AS f ON f.order_id = o.order_id
WHERE o.status = 'paid';

-- @name m12.grain_order
-- @engines duckdb postgres
-- @setup star
SELECT count(*) AS rows_in_table, sum(total) AS total, count(DISTINCT order_id) AS distinct_orders, round(avg(total), 2) AS avg_per_row
FROM orders;

-- @name m12.grain_line
-- @engines duckdb postgres
-- @setup star
SELECT count(*) AS rows_in_table, sum(line_amount) AS total, count(DISTINCT order_id) AS distinct_orders, round(avg(line_amount), 2) AS avg_per_row
FROM fact_sales;

-- @name m12.grain_store
-- @engines duckdb postgres
-- @setup star
SELECT count(*) AS rows_in_table, sum(revenue) AS total, CAST(NULL AS INTEGER) AS distinct_orders, round(avg(revenue), 2) AS avg_per_row
FROM (SELECT store_key, sum(line_amount) AS revenue FROM fact_sales GROUP BY store_key) AS t;

-- @name m12.grain_customer
-- @engines duckdb postgres
-- @setup star
SELECT count(*) AS rows_in_table, sum(revenue) AS total, CAST(NULL AS INTEGER) AS distinct_orders, round(avg(revenue), 2) AS avg_per_row
FROM (SELECT customer_key, sum(line_amount) AS revenue FROM fact_sales GROUP BY customer_key) AS t;

-- @name m12.wide_anomaly
-- @engines duckdb postgres sqlite
CREATE TABLE orders_wide AS
SELECT o.order_id, c.customer_id, c.name, c.country, o.total
FROM orders AS o
JOIN customers AS c ON c.customer_id = o.customer_id;
UPDATE orders_wide SET country = 'MY' WHERE order_id = 1001;
SELECT name, count(DISTINCT country) AS countries, count(*) AS rows_for_customer
FROM orders_wide
GROUP BY name
HAVING count(DISTINCT country) > 1;

-- @name m12.normal_update
-- @engines duckdb postgres sqlite
CREATE TABLE customers_copy AS SELECT customer_id, name, country FROM customers;
UPDATE customers_copy SET country = 'MY' WHERE customer_id = 1;
SELECT o.order_id, c.name, c.country
FROM orders AS o
JOIN customers_copy AS c ON c.customer_id = o.customer_id
WHERE c.customer_id = 1
ORDER BY o.order_id;

-- @name m12.lifecycle
-- @engines duckdb postgres sqlite
SELECT o.order_id, o.status, o.order_ts AS ordered_at,
       min(CASE WHEN p.status = 'ok' THEN p.paid_ts END) AS first_paid_at,
       min(CASE WHEN p.status = 'refund' THEN p.paid_ts END) AS refunded_at
FROM orders AS o
LEFT JOIN payments AS p ON p.order_id = o.order_id
GROUP BY o.order_id, o.status, o.order_ts
ORDER BY o.order_id;

-- @name m12.ch_revenue
-- @engines duckdb postgres
-- @setup star
SELECT p.category, sum(f.line_amount) AS revenue
FROM fact_sales AS f
JOIN dim_product AS p ON p.product_key = f.product_key
WHERE f.status = 'paid'
GROUP BY p.category
ORDER BY revenue DESC;

-- @name m12.ch_weekday
-- @engines duckdb postgres
-- @setup star
SELECT d.iso_weekday, count(DISTINCT f.order_id) AS orders
FROM fact_sales AS f
JOIN dim_date AS d ON d.date_key = f.date_key
GROUP BY d.iso_weekday
ORDER BY d.iso_weekday;

-- @name m12.ch_aov
-- @engines duckdb postgres
-- @setup star
SELECT round(sum(line_amount) / count(DISTINCT order_id), 2) AS avg_order_value
FROM fact_sales
WHERE status = 'paid';

-- @name m12.dump_fact
-- @engines duckdb postgres
-- @setup star
SELECT order_id, line_no, date_key, customer_key, store_key, product_key, status, qty, line_amount
FROM fact_sales
ORDER BY order_id, line_no;

-- @name m12.dump_product
-- @engines duckdb postgres
-- @setup star
SELECT product_key, sku, product, category FROM dim_product ORDER BY product_key;

-- @name m12.dump_date
-- @engines duckdb postgres
-- @setup star
SELECT date_key, day, iso_weekday, day_type FROM dim_date ORDER BY date_key;
