-- Average order value for March 2026, two ways.
WITH per_store AS (
  SELECT o.store_id,
         sum(l.line_amount)         AS revenue,
         count(DISTINCT o.order_id) AS orders
  FROM fact_order_lines l
  JOIN fact_orders o ON o.order_id = l.order_id
  WHERE o.order_date >= DATE '2026-03-01' AND o.order_date < DATE '2026-04-01'
  GROUP BY o.store_id
)
SELECT round(sum(revenue) / sum(orders), 2)  AS ratio_of_sums,       -- the measure, computed at the level of the question
       round(avg(revenue / orders), 2)       AS average_of_ratios    -- an average of twelve store averages
FROM per_store;
