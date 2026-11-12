-- Mission 4: aggregation.

-- @name m4.basic
-- @engines duckdb
SELECT status,
       count(*)              AS orders,
       sum(total)            AS revenue,
       min(total)            AS smallest,
       max(total)            AS largest,
       round(avg(total), 2)  AS average
FROM orders
GROUP BY status
ORDER BY status;

-- @name m4.bare_column
-- @engines duckdb postgres sqlite
-- @each
SELECT status, channel, count(*) AS orders
FROM orders
GROUP BY status
ORDER BY status;

-- @name m4.having
-- @engines duckdb
SELECT store_id, count(*) AS paid_orders, sum(total) AS revenue
FROM orders
WHERE status = 'paid'
GROUP BY store_id
HAVING sum(total) > 20
ORDER BY store_id;

-- @name m4.conditional
-- @engines duckdb postgres sqlite
SELECT store_id,
       count(*)                                         AS orders,
       sum(CASE WHEN status = 'paid' THEN total ELSE 0 END) AS paid_with_case,
       sum(total) FILTER (WHERE status = 'paid')        AS paid_with_filter,
       count(*) FILTER (WHERE status = 'paid')          AS paid_orders
FROM orders
GROUP BY store_id
ORDER BY store_id;

-- @name m4.pivot
-- @engines duckdb postgres sqlite
SELECT status,
       sum(CASE WHEN channel = 'web'   THEN total END) AS web,
       sum(CASE WHEN channel = 'app'   THEN total END) AS app,
       sum(CASE WHEN channel = 'store' THEN total END) AS store
FROM orders
GROUP BY status
ORDER BY status;

-- @name m4.distinct_counts
-- @engines duckdb postgres sqlite
SELECT store_id,
       count(*)                    AS orders,
       count(customer_id)          AS with_customer,
       count(DISTINCT customer_id) AS different_customers
FROM orders
GROUP BY store_id
ORDER BY store_id;

-- @name m4.avg_of_avgs
-- @engines duckdb
WITH per_store AS (
  SELECT store_id, avg(total) AS avg_total
  FROM orders
  WHERE status = 'paid'
  GROUP BY store_id
)
SELECT round(avg(avg_total), 2)                                           AS average_of_averages,
       (SELECT round(avg(total), 2) FROM orders WHERE status = 'paid')    AS average_of_orders
FROM per_store;

-- @name m4.empty_sum
-- @engines duckdb postgres sqlite
SELECT sum(total)               AS sum_of_nothing,
       count(*)                 AS rows,
       coalesce(sum(total), 0)  AS sum_or_zero
FROM orders
WHERE status = 'does not exist';

-- @name m4.median
-- @engines duckdb postgres
SELECT round(avg(total), 2)                                          AS average,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY total)           AS median,
       percentile_cont(0.9) WITHIN GROUP (ORDER BY total)           AS p90
FROM orders
WHERE status = 'paid';

-- @name m4.string_agg
-- @engines duckdb postgres sqlite
SELECT country, count(*) AS customers, string_agg(name, ', ' ORDER BY name) AS names
FROM customers
GROUP BY country
ORDER BY country NULLS LAST;

-- @name m4.approx
-- @engines duckdb
SELECT count(DISTINCT customer_id)         AS exact,
       approx_count_distinct(customer_id)  AS approximate
FROM big_orders;

-- @name m4.rollup_sqlite
-- @engines sqlite
-- @error
SELECT store_id, channel, sum(total) AS revenue
FROM orders
WHERE status = 'paid'
GROUP BY ROLLUP (store_id, channel);

-- @name m4.ch_repeat
-- @engines duckdb
SELECT customer_id, count(*) AS paid_orders, sum(total) AS spent
FROM orders
WHERE status = 'paid' AND customer_id IS NOT NULL
GROUP BY customer_id
HAVING count(*) >= 2
ORDER BY spent DESC;

-- @name m4.ch_conditional
-- @engines duckdb
SELECT store_id,
       sum(CASE WHEN status = 'paid'      THEN total ELSE 0 END) AS paid,
       sum(CASE WHEN status = 'cancelled' THEN total ELSE 0 END) AS cancelled,
       sum(CASE WHEN status = 'refunded'  THEN total ELSE 0 END) AS refunded
FROM orders
GROUP BY store_id
ORDER BY store_id;

-- @name m4.ch_daily
-- @engines duckdb
SELECT CAST(order_ts AS DATE) AS day, count(*) AS orders, sum(total) AS revenue
FROM orders
WHERE status = 'paid'
GROUP BY ROLLUP (CAST(order_ts AS DATE))
ORDER BY day NULLS LAST;
