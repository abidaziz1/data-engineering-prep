-- Mission 9: changing data. INSERT, UPDATE, DELETE, constraints, upserts, MERGE, safe reloads and slowly changing dimensions.

-- @name m9.crud
-- @engines duckdb postgres sqlite
CREATE TABLE stock (sku VARCHAR PRIMARY KEY, name VARCHAR, qty INTEGER);
INSERT INTO stock VALUES ('ESP-01', 'Espresso beans', 40), ('LAT-01', 'Oat milk', 25), ('MUG-01', 'Mug', 8);
-- @snap m9.crud_insert: SELECT * FROM stock ORDER BY sku
UPDATE stock SET qty = qty - 5 WHERE sku = 'ESP-01';
-- @snap m9.crud_update: SELECT * FROM stock ORDER BY sku
DELETE FROM stock WHERE qty < 10;
SELECT * FROM stock ORDER BY sku;

-- @name m9.returning
-- @engines duckdb postgres sqlite
CREATE TABLE stock (sku VARCHAR PRIMARY KEY, name VARCHAR, qty INTEGER);
INSERT INTO stock VALUES ('ESP-01', 'Espresso beans', 40), ('LAT-01', 'Oat milk', 25), ('MUG-01', 'Mug', 8);
UPDATE stock SET qty = qty + 10 WHERE qty < 30 RETURNING sku, qty;

-- @name m9.pk_error
-- @engines duckdb postgres sqlite
-- @each
CREATE TABLE stock (sku VARCHAR PRIMARY KEY, name VARCHAR, qty INTEGER);
INSERT INTO stock VALUES ('ESP-01', 'Espresso beans', 40);
INSERT INTO stock VALUES ('ESP-01', 'Espresso beans again', 12);

-- @name m9.notnull_error
-- @engines duckdb postgres sqlite
-- @each
CREATE TABLE stock (sku VARCHAR PRIMARY KEY, name VARCHAR NOT NULL, qty INTEGER);
INSERT INTO stock VALUES ('ESP-01', NULL, 40);

-- @name m9.check_error
-- @engines duckdb postgres sqlite
-- @each
CREATE TABLE stock (sku VARCHAR PRIMARY KEY, name VARCHAR, qty INTEGER CHECK (qty >= 0));
INSERT INTO stock VALUES ('ESP-01', 'Espresso beans', -3);

-- @name m9.append_twice
-- @engines duckdb postgres sqlite
CREATE TABLE loaded (store_id INTEGER, day DATE, revenue DECIMAL(10,2));
INSERT INTO loaded SELECT store_id, day, revenue FROM daily_revenue;
-- @snap m9.append_once: SELECT count(*) AS rows_loaded, sum(revenue) AS revenue FROM loaded
INSERT INTO loaded SELECT store_id, day, revenue FROM daily_revenue;
SELECT count(*) AS rows_loaded, sum(revenue) AS revenue FROM loaded;

-- @name m9.delete_insert
-- @engines duckdb postgres sqlite
CREATE TABLE loaded (store_id INTEGER, day DATE, revenue DECIMAL(10,2));
INSERT INTO loaded SELECT store_id, day, revenue FROM daily_revenue;
-- @snap m9.delete_insert_once: SELECT count(*) AS rows_loaded, sum(revenue) AS revenue FROM loaded
DELETE FROM loaded WHERE day BETWEEN '2026-03-01' AND '2026-03-05';
INSERT INTO loaded SELECT store_id, day, revenue FROM daily_revenue WHERE day BETWEEN '2026-03-01' AND '2026-03-05';
SELECT count(*) AS rows_loaded, sum(revenue) AS revenue FROM loaded;

-- @name m9.upsert
-- @engines duckdb postgres sqlite
CREATE TABLE store_day (store_id INTEGER, day DATE, revenue DECIMAL(10,2), PRIMARY KEY (store_id, day));
INSERT INTO store_day SELECT store_id, day, revenue FROM daily_revenue;
CREATE TABLE incoming (store_id INTEGER, day DATE, revenue DECIMAL(10,2));
INSERT INTO incoming VALUES (1, '2026-03-02', 57.50), (2, '2026-03-05', 50.00), (1, '2026-03-06', 44.00);
INSERT INTO store_day
SELECT store_id, day, revenue FROM incoming WHERE true
ON CONFLICT (store_id, day) DO UPDATE SET revenue = excluded.revenue;
-- @snap m9.upsert_count_once: SELECT count(*) AS rows_in_table, sum(revenue) AS revenue FROM store_day
INSERT INTO store_day
SELECT store_id, day, revenue FROM incoming WHERE true
ON CONFLICT (store_id, day) DO UPDATE SET revenue = excluded.revenue;
SELECT store_id, day, revenue FROM store_day ORDER BY store_id, day;

-- @name m9.upsert_twice
-- @engines duckdb postgres sqlite
CREATE TABLE store_day (store_id INTEGER, day DATE, revenue DECIMAL(10,2), PRIMARY KEY (store_id, day));
INSERT INTO store_day SELECT store_id, day, revenue FROM daily_revenue;
CREATE TABLE incoming (store_id INTEGER, day DATE, revenue DECIMAL(10,2));
INSERT INTO incoming VALUES (1, '2026-03-02', 57.50), (2, '2026-03-05', 50.00), (1, '2026-03-06', 44.00);
INSERT INTO store_day
SELECT store_id, day, revenue FROM incoming WHERE true
ON CONFLICT (store_id, day) DO UPDATE SET revenue = excluded.revenue;
-- @snap m9.upsert_run1: SELECT count(*) AS rows_in_table, sum(revenue) AS revenue FROM store_day
INSERT INTO store_day
SELECT store_id, day, revenue FROM incoming WHERE true
ON CONFLICT (store_id, day) DO UPDATE SET revenue = excluded.revenue;
SELECT count(*) AS rows_in_table, sum(revenue) AS revenue FROM store_day;

-- @name m9.do_nothing
-- @engines duckdb postgres sqlite
CREATE TABLE store_day (store_id INTEGER, day DATE, revenue DECIMAL(10,2), PRIMARY KEY (store_id, day));
INSERT INTO store_day SELECT store_id, day, revenue FROM daily_revenue;
CREATE TABLE incoming (store_id INTEGER, day DATE, revenue DECIMAL(10,2));
INSERT INTO incoming VALUES (1, '2026-03-02', 57.50), (2, '2026-03-05', 50.00), (1, '2026-03-06', 44.00);
INSERT INTO store_day
SELECT store_id, day, revenue FROM incoming WHERE true
ON CONFLICT (store_id, day) DO NOTHING;
SELECT store_id, day, revenue FROM store_day WHERE (store_id, day) IN ((1, '2026-03-02'), (1, '2026-03-06'), (2, '2026-03-05')) ORDER BY store_id, day;

-- @name m9.merge
-- @engines duckdb postgres sqlite
-- @each
CREATE TABLE store_day (store_id INTEGER, day DATE, revenue DECIMAL(10,2), PRIMARY KEY (store_id, day));
INSERT INTO store_day SELECT store_id, day, revenue FROM daily_revenue;
CREATE TABLE incoming (store_id INTEGER, day DATE, revenue DECIMAL(10,2));
INSERT INTO incoming VALUES (1, '2026-03-02', 57.50), (2, '2026-03-05', 50.00), (1, '2026-03-06', 44.00);
MERGE INTO store_day AS t
USING incoming AS s
  ON t.store_id = s.store_id AND t.day = s.day
WHEN MATCHED THEN
  UPDATE SET revenue = s.revenue
WHEN NOT MATCHED THEN
  INSERT (store_id, day, revenue) VALUES (s.store_id, s.day, s.revenue);

-- @name m9.merge_result
-- @engines duckdb postgres
CREATE TABLE store_day (store_id INTEGER, day DATE, revenue DECIMAL(10,2), PRIMARY KEY (store_id, day));
INSERT INTO store_day SELECT store_id, day, revenue FROM daily_revenue;
CREATE TABLE incoming (store_id INTEGER, day DATE, revenue DECIMAL(10,2));
INSERT INTO incoming VALUES (1, '2026-03-02', 57.50), (2, '2026-03-05', 50.00), (1, '2026-03-06', 44.00);
MERGE INTO store_day AS t
USING incoming AS s
  ON t.store_id = s.store_id AND t.day = s.day
WHEN MATCHED THEN
  UPDATE SET revenue = s.revenue
WHEN NOT MATCHED THEN
  INSERT (store_id, day, revenue) VALUES (s.store_id, s.day, s.revenue);
SELECT store_id, day, revenue FROM store_day ORDER BY store_id, day;

-- @name m9.distinct_from
-- @engines duckdb postgres sqlite
SELECT c.customer_id, d.tier AS old_tier, c.tier AS new_tier
FROM customer_changes AS c
LEFT JOIN customer_dim AS d ON d.customer_id = c.customer_id AND d.is_current
WHERE d.tier IS DISTINCT FROM c.tier
ORDER BY c.customer_id;

-- @name m9.not_equal
-- @engines duckdb postgres sqlite
SELECT c.customer_id, d.tier AS old_tier, c.tier AS new_tier
FROM customer_changes AS c
LEFT JOIN customer_dim AS d ON d.customer_id = c.customer_id AND d.is_current
WHERE d.tier <> c.tier
ORDER BY c.customer_id;

-- @name m9.scd2
-- @engines duckdb postgres sqlite
CREATE TABLE dim AS SELECT * FROM customer_dim;
-- @snap m9.scd2_before: SELECT customer_key, customer_id, tier, valid_from, valid_to, is_current FROM dim ORDER BY customer_key
UPDATE dim
SET valid_to = '2026-03-09', is_current = false
WHERE is_current
  AND EXISTS (SELECT 1 FROM customer_changes AS c WHERE c.customer_id = dim.customer_id AND c.tier <> dim.tier);
-- @snap m9.scd2_closed: SELECT customer_key, customer_id, tier, valid_from, valid_to, is_current FROM dim ORDER BY customer_key
INSERT INTO dim (customer_key, customer_id, tier, valid_from, valid_to, is_current)
SELECT (SELECT max(customer_key) FROM dim) + ROW_NUMBER() OVER (ORDER BY c.customer_id),
       c.customer_id, c.tier, '2026-03-10', '9999-12-31', true
FROM customer_changes AS c
WHERE NOT EXISTS (
  SELECT 1 FROM dim AS d WHERE d.customer_id = c.customer_id AND d.is_current AND d.tier = c.tier
);
-- @snap m9.scd2_final: SELECT customer_key, customer_id, tier, valid_from, valid_to, is_current FROM dim ORDER BY customer_key
UPDATE dim
SET valid_to = '2026-03-09', is_current = false
WHERE is_current
  AND EXISTS (SELECT 1 FROM customer_changes AS c WHERE c.customer_id = dim.customer_id AND c.tier <> dim.tier);
INSERT INTO dim (customer_key, customer_id, tier, valid_from, valid_to, is_current)
SELECT (SELECT max(customer_key) FROM dim) + ROW_NUMBER() OVER (ORDER BY c.customer_id),
       c.customer_id, c.tier, '2026-03-10', '9999-12-31', true
FROM customer_changes AS c
WHERE NOT EXISTS (
  SELECT 1 FROM dim AS d WHERE d.customer_id = c.customer_id AND d.is_current AND d.tier = c.tier
);
SELECT customer_key, customer_id, tier, valid_from, valid_to, is_current FROM dim ORDER BY customer_key;

-- @name m9.scd_compare
-- @engines duckdb postgres sqlite
CREATE TABLE dim2 AS SELECT * FROM customer_dim;
UPDATE dim2 SET valid_to = '2026-03-09', is_current = false
WHERE is_current AND EXISTS (SELECT 1 FROM customer_changes AS c WHERE c.customer_id = dim2.customer_id AND c.tier <> dim2.tier);
INSERT INTO dim2 (customer_key, customer_id, tier, valid_from, valid_to, is_current)
SELECT (SELECT max(customer_key) FROM dim2) + ROW_NUMBER() OVER (ORDER BY c.customer_id), c.customer_id, c.tier, '2026-03-10', '9999-12-31', true
FROM customer_changes AS c
WHERE NOT EXISTS (SELECT 1 FROM dim2 AS d WHERE d.customer_id = c.customer_id AND d.is_current AND d.tier = c.tier);
CREATE TABLE dim1 AS SELECT customer_id, tier FROM customer_dim WHERE is_current;
UPDATE dim1 SET tier = (SELECT c.tier FROM customer_changes AS c WHERE c.customer_id = dim1.customer_id)
WHERE customer_id IN (SELECT customer_id FROM customer_changes);
SELECT o.order_id, o.customer_id, h.tier AS tier_with_history, o1.tier AS tier_overwritten
FROM orders AS o
JOIN dim2 AS h ON h.customer_id = o.customer_id AND date(o.order_ts) BETWEEN h.valid_from AND h.valid_to
JOIN dim1 AS o1 ON o1.customer_id = o.customer_id
ORDER BY o.order_id;

-- @name m9.update_all
-- @engines duckdb postgres sqlite
-- @setup stock
UPDATE stock SET qty = 0;
SELECT sku, qty FROM stock ORDER BY sku;

-- @name m9.update_where
-- @engines duckdb postgres sqlite
-- @setup stock
UPDATE stock SET qty = 0 WHERE sku = 'MUG-01';
SELECT sku, qty FROM stock ORDER BY sku;

-- @name m9.scd_bug
-- @engines duckdb postgres sqlite
CREATE TABLE dim AS SELECT * FROM customer_dim;
INSERT INTO dim (customer_key, customer_id, tier, valid_from, valid_to, is_current)
SELECT (SELECT max(customer_key) FROM dim) + ROW_NUMBER() OVER (ORDER BY c.customer_id),
       c.customer_id, c.tier, '2026-03-10', '9999-12-31', true
FROM customer_changes AS c
JOIN dim AS d ON d.customer_id = c.customer_id AND d.is_current AND d.tier <> c.tier;
SELECT customer_id, count(*) AS current_rows
FROM dim
WHERE is_current
GROUP BY customer_id
HAVING count(*) > 1;

-- @name m9.merge_dup
-- @engines duckdb postgres sqlite
-- @each
-- @setup store_day
INSERT INTO incoming VALUES (1, '2026-03-02', 58.00);
MERGE INTO store_day AS t
USING incoming AS s
  ON t.store_id = s.store_id AND t.day = s.day
WHEN MATCHED THEN
  UPDATE SET revenue = s.revenue
WHEN NOT MATCHED THEN
  INSERT (store_id, day, revenue) VALUES (s.store_id, s.day, s.revenue);

-- @name m9.upsert_dup
-- @engines duckdb postgres sqlite
-- @each
-- @setup store_day
INSERT INTO incoming VALUES (1, '2026-03-02', 58.00);
INSERT INTO store_day
SELECT store_id, day, revenue FROM incoming WHERE true
ON CONFLICT (store_id, day) DO UPDATE SET revenue = excluded.revenue;

-- @name m9.ch_upsert
-- @engines duckdb postgres sqlite
-- @setup store_day
INSERT INTO store_day
SELECT store_id, day, revenue FROM incoming WHERE true
ON CONFLICT (store_id, day) DO UPDATE SET revenue = excluded.revenue;
SELECT store_id, day, revenue FROM store_day ORDER BY store_id, day;

-- @name m9.ch_close
-- @engines duckdb postgres sqlite
UPDATE customer_dim
SET valid_to = '2026-03-09', is_current = false
WHERE is_current
  AND EXISTS (SELECT 1 FROM customer_changes AS c WHERE c.customer_id = customer_dim.customer_id AND c.tier <> customer_dim.tier);
SELECT customer_key, customer_id, tier, valid_from, valid_to, is_current
FROM customer_dim
ORDER BY customer_key;

-- @name m9.upsert_dup_value
-- @engines duckdb sqlite
-- @setup store_day
INSERT INTO incoming VALUES (1, '2026-03-02', 58.00);
INSERT INTO store_day
SELECT store_id, day, revenue FROM incoming WHERE true
ON CONFLICT (store_id, day) DO UPDATE SET revenue = excluded.revenue;
SELECT store_id, day, revenue FROM store_day WHERE store_id = 1 AND day = '2026-03-02';
