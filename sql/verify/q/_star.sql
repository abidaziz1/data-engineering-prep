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
