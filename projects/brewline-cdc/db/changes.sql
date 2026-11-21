-- The work of a second day in the shop. Every statement becomes change events.

-- 50 new orders
INSERT INTO orders
SELECT i, 1 + (i * 7) % 12, 'PLACED', 1000 + (i * 37) % 9000,
       timestamptz '2026-03-02 00:00:00+00' + (i % 1440) * interval '1 minute'
FROM generate_series(201, 250) AS i;

-- 30 orders are shipped
UPDATE orders
SET status = 'SHIPPED', updated_at = timestamptz '2026-03-02 10:00:00+00' + id * interval '1 minute'
WHERE id BETWEEN 1 AND 30;

-- 5 orders are deleted
DELETE FROM orders WHERE id BETWEEN 31 AND 35;

-- one order changes twice in one transaction: shipped, and then refunded
BEGIN;
UPDATE orders SET status = 'SHIPPED', updated_at = timestamptz '2026-03-02 11:00:00+00' WHERE id = 40;
UPDATE orders SET status = 'REFUNDED', updated_at = timestamptz '2026-03-02 11:05:00+00' WHERE id = 40;
COMMIT;
