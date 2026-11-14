-- The same tile, answered from the aggregate table.
SELECT s.region,
       strftime(a.order_date, '%Y-%m') AS month,
       sum(a.revenue)                  AS revenue
FROM agg_day_store_category a
JOIN dim_store s ON s.store_id = a.store_id
WHERE a.order_date >= DATE '2026-01-01' AND a.order_date < DATE '2026-04-01'
GROUP BY s.region, month
ORDER BY s.region, month;
