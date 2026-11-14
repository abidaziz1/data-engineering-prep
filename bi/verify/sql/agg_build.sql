-- One row for each day, store and category: the table that most tiles can read.
CREATE OR REPLACE TABLE agg_day_store_category AS
SELECT o.order_date,
       o.store_id,
       p.category,
       sum(l.line_amount)          AS revenue,
       sum(l.quantity)             AS units,
       count(DISTINCT o.order_id)  AS orders,
       count(DISTINCT o.customer_id) AS customers_that_day
FROM fact_order_lines l
JOIN fact_orders o ON o.order_id = l.order_id
JOIN dim_product p ON p.product_id = l.product_id
GROUP BY o.order_date, o.store_id, p.category;
