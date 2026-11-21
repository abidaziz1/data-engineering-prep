-- Work that happens while the connector is stopped: 100 orders are shipped.
UPDATE orders
SET status = 'SHIPPED', updated_at = timestamptz '2026-03-03 09:00:00+00' + id * interval '1 minute'
WHERE id BETWEEN 101 AND 200;
