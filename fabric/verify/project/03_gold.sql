-- Notebook cell 3 (Spark SQL): the gold table that the report reads. One row for each store and day.
CREATE OR REPLACE TABLE gold_daily_revenue AS
SELECT CAST(order_ts AS DATE) AS order_date,
       store_id,
       COUNT(*)               AS orders,
       SUM(amount)            AS revenue
FROM silver_orders
WHERE status <> 'REFUNDED'
GROUP BY CAST(order_ts AS DATE), store_id;
