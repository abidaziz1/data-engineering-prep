-- The same sum after a join to the order lines: an order with three lines is read three times.
SELECT count(*)               AS rows_read,
       sum(o.shipping_fee)    AS shipping_total
FROM fact_orders o
JOIN fact_order_lines l ON l.order_id = o.order_id;
