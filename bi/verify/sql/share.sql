-- Share of total: the numerator follows the filter, the denominator ignores the region.
SELECT s.region,
       sum(l.line_amount)                                              AS revenue,
       sum(sum(l.line_amount)) OVER ()                                 AS revenue_all_regions,
       round(100.0 * sum(l.line_amount) / sum(sum(l.line_amount)) OVER (), 1) AS share_pct
FROM fact_order_lines l
JOIN fact_orders o ON o.order_id = l.order_id
JOIN dim_store   s ON s.store_id = o.store_id
WHERE o.order_date >= DATE '2026-03-01' AND o.order_date < DATE '2026-04-01'
GROUP BY s.region
ORDER BY s.region;
