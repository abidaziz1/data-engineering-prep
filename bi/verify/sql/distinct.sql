-- Customers who ordered, by month, and for the whole quarter. A distinct count does not add up.
SELECT strftime(order_date, '%Y-%m') AS month,
       count(DISTINCT customer_id)   AS customers
FROM fact_orders
WHERE order_date >= DATE '2026-01-01' AND order_date < DATE '2026-04-01'
GROUP BY month
ORDER BY month;
