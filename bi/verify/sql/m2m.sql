-- An order can carry two promotion codes. Revenue by code counts such an order under both codes.
SELECT p.promo_code,
       count(DISTINCT l.order_id) AS orders,
       sum(l.line_amount)         AS revenue
FROM bridge_order_promos p
JOIN fact_order_lines l ON l.order_id = p.order_id
GROUP BY p.promo_code
ORDER BY p.promo_code;
