-- 200 orders, deterministic: the store and the amount come from the id.
INSERT INTO orders
SELECT i, 1 + (i * 7) % 12, 'PLACED', 1000 + (i * 37) % 9000,
       timestamptz '2026-03-01 00:00:00+00' + (i % 1440) * interval '1 minute'
FROM generate_series(1, 200) AS i;
