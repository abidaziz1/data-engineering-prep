-- Bring the lines to the grain of the order first, then join one row to one row.
WITH lines AS (
  SELECT order_id, sum(line_amount) AS revenue
  FROM fact_order_lines
  GROUP BY order_id
)
SELECT count(*)               AS rows_read,
       sum(o.shipping_fee)    AS shipping_total,
       sum(l.revenue)         AS revenue_total
FROM fact_orders o
JOIN lines l ON l.order_id = o.order_id;
