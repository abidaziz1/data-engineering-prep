-- A value fixed at the level of the customer, whatever the view shows: the quarter of the first order.
WITH first_order AS (
  SELECT customer_id, min(order_date) AS first_date
  FROM fact_orders
  GROUP BY customer_id
)
SELECT CAST(year(first_date) AS VARCHAR) || '-Q' || CAST(quarter(first_date) AS VARCHAR) AS first_quarter,
       count(*)                                                                         AS customers
FROM first_order
GROUP BY first_quarter
ORDER BY first_quarter;
