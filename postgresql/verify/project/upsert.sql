INSERT INTO orders (order_id, store_id, customer_id, order_ts, amount, status, note)
SELECT DISTINCT ON (order_id) order_id, store_id, customer_id, order_ts, amount, status, note
FROM stg
ORDER BY order_id, order_ts DESC
ON CONFLICT (order_id) DO UPDATE
SET store_id = EXCLUDED.store_id, customer_id = EXCLUDED.customer_id, order_ts = EXCLUDED.order_ts,
    amount = EXCLUDED.amount, status = EXCLUDED.status, note = EXCLUDED.note
WHERE (orders.store_id, orders.customer_id, orders.order_ts, orders.amount, orders.status, orders.note)
      IS DISTINCT FROM (EXCLUDED.store_id, EXCLUDED.customer_id, EXCLUDED.order_ts, EXCLUDED.amount, EXCLUDED.status, EXCLUDED.note);
