CREATE MATERIALIZED VIEW gold_daily_revenue
AS SELECT to_date(order_ts) AS order_date,
          count(*) AS orders,
          sum(total_usd) AS revenue_usd
FROM silver_orders
WHERE status <> 'CANCELLED'
GROUP BY to_date(order_ts)
