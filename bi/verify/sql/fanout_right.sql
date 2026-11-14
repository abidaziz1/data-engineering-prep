-- The shipping fee lives on the order. Sum it from the orders table.
SELECT count(*)               AS rows_read,
       sum(shipping_fee)      AS shipping_total
FROM fact_orders;
