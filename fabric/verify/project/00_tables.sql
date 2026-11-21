-- Run once in a notebook cell (Spark SQL) or in the SQL view of the lakehouse. Fabric lakehouse tables are Delta tables.
CREATE TABLE IF NOT EXISTS silver_orders (
  order_id    STRING NOT NULL,
  store_id    INT,
  customer_id STRING,
  order_ts    TIMESTAMP,
  status      STRING,
  amount      DECIMAL(10, 2)
) USING DELTA;

CREATE TABLE IF NOT EXISTS silver_rejects (
  order_id     STRING,
  store_id     STRING,
  customer_id  STRING,
  order_ts     STRING,
  status       STRING,
  amount       STRING,
  _source_file STRING,
  _reason      STRING
) USING DELTA;
