-- Revenue by month of 2026 and the running total for the year.
WITH m AS (
  SELECT strftime(o.order_date, '%Y-%m') AS month, sum(l.line_amount) AS revenue
  FROM fact_order_lines l
  JOIN fact_orders o ON o.order_id = l.order_id
  WHERE o.order_date >= DATE '2026-01-01'
  GROUP BY month
)
SELECT month, revenue, sum(revenue) OVER (ORDER BY month) AS revenue_ytd
FROM m
ORDER BY month;
