-- One tile of the dashboard: revenue by region and month, first quarter of 2026.
SELECT s.region,
       strftime(o.order_date, '%Y-%m') AS month,
       sum(l.line_amount)              AS revenue
FROM fact_order_lines l
JOIN fact_orders o ON o.order_id = l.order_id
JOIN dim_store   s ON s.store_id = o.store_id
WHERE o.order_date >= DATE '2026-01-01' AND o.order_date < DATE '2026-04-01'
GROUP BY s.region, month
ORDER BY s.region, month;
