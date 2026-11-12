-- Mission 6: window functions.

-- @name m6.group_by
-- @engines duckdb postgres sqlite
SELECT store_id, sum(total) AS store_paid
FROM orders
WHERE status = 'paid'
GROUP BY store_id
ORDER BY store_id;

-- @name m6.over
-- @engines duckdb postgres sqlite
SELECT order_id, store_id, total,
       sum(total) OVER () AS all_paid,
       sum(total) OVER (PARTITION BY store_id) AS store_paid
FROM orders
WHERE status = 'paid'
ORDER BY order_id;

-- @name m6.rank
-- @engines duckdb postgres sqlite
SELECT day, store_id, revenue,
       ROW_NUMBER() OVER (ORDER BY revenue DESC, store_id) AS row_num,
       RANK()       OVER (ORDER BY revenue DESC) AS rnk,
       DENSE_RANK() OVER (ORDER BY revenue DESC) AS dense_rnk
FROM daily_revenue
ORDER BY revenue DESC, store_id;

-- @name m6.rownum_ties
-- @engines duckdb postgres sqlite
SELECT day, store_id, revenue,
       ROW_NUMBER() OVER (ORDER BY revenue DESC) AS row_num
FROM daily_revenue
WHERE revenue >= 50
ORDER BY row_num;

-- @name m6.ntile
-- @engines duckdb postgres sqlite
SELECT day, store_id, revenue,
       NTILE(4) OVER (ORDER BY revenue DESC, store_id) AS quartile
FROM daily_revenue
ORDER BY revenue DESC, store_id;

-- @name m6.rank_partition
-- @engines duckdb postgres sqlite
SELECT store_id, day, revenue,
       RANK() OVER (PARTITION BY store_id ORDER BY revenue DESC) AS rank_in_store
FROM daily_revenue
ORDER BY store_id, rank_in_store, day;

-- @name m6.rank_after_where
-- @engines duckdb postgres sqlite
SELECT order_id, status, total,
       RANK() OVER (ORDER BY total DESC) AS rank_paid_only
FROM orders
WHERE status = 'paid'
ORDER BY rank_paid_only;

-- @name m6.rank_all_orders
-- @engines duckdb postgres sqlite
SELECT order_id, status, total,
       RANK() OVER (ORDER BY total DESC) AS rank_all
FROM orders
ORDER BY rank_all;

-- @name m6.lag
-- @engines duckdb postgres sqlite
SELECT store_id, day, revenue,
       LAG(revenue) OVER (PARTITION BY store_id ORDER BY day) AS prev_revenue,
       revenue - LAG(revenue) OVER (PARTITION BY store_id ORDER BY day) AS change,
       LEAD(revenue, 1, 0) OVER (PARTITION BY store_id ORDER BY day) AS next_revenue
FROM daily_revenue
ORDER BY store_id, day;

-- @name m6.running
-- @engines duckdb postgres sqlite
SELECT store_id, day, revenue,
       sum(revenue) OVER (PARTITION BY store_id ORDER BY day) AS running_total
FROM daily_revenue
ORDER BY store_id, day;

-- @name m6.running_ties
-- @engines duckdb postgres sqlite
SELECT day, store_id, revenue,
       sum(revenue) OVER (ORDER BY revenue) AS default_frame,
       sum(revenue) OVER (ORDER BY revenue, store_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS rows_frame
FROM daily_revenue
ORDER BY revenue, store_id;

-- @name m6.moving
-- @engines duckdb postgres sqlite
SELECT store_id, day, revenue,
       round(avg(revenue) OVER (PARTITION BY store_id ORDER BY day ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS avg_3_days,
       count(*) OVER (PARTITION BY store_id ORDER BY day ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS rows_in_frame
FROM daily_revenue
ORDER BY store_id, day;

-- @name m6.last_value
-- @engines duckdb postgres sqlite
SELECT store_id, day, revenue,
       FIRST_VALUE(revenue) OVER (PARTITION BY store_id ORDER BY day) AS first_day,
       LAST_VALUE(revenue) OVER (PARTITION BY store_id ORDER BY day) AS last_default,
       LAST_VALUE(revenue) OVER (PARTITION BY store_id ORDER BY day
                                 ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS last_full
FROM daily_revenue
ORDER BY store_id, day;

-- @name m6.share
-- @engines duckdb postgres sqlite
SELECT store_id,
       sum(total) AS revenue,
       round(100.0 * sum(total) / sum(sum(total)) OVER (), 1) AS share_percent
FROM orders
WHERE status = 'paid'
GROUP BY store_id
ORDER BY revenue DESC;

-- @name m6.named_window
-- @engines duckdb postgres sqlite
SELECT store_id, day, revenue,
       sum(revenue) OVER w AS running,
       max(revenue) OVER w AS best_so_far
FROM daily_revenue
WINDOW w AS (PARTITION BY store_id ORDER BY day)
ORDER BY store_id, day;

-- @name m6.where_error
-- @engines duckdb postgres sqlite
-- @each
SELECT order_id, total
FROM orders
WHERE ROW_NUMBER() OVER (ORDER BY total DESC) <= 3;

-- @name m6.top3_cte
-- @engines duckdb postgres sqlite
WITH ranked AS (
  SELECT order_id, total, ROW_NUMBER() OVER (ORDER BY total DESC) AS rn
  FROM orders
  WHERE status = 'paid'
)
SELECT order_id, total, rn
FROM ranked
WHERE rn <= 3
ORDER BY rn;

-- @name m6.qualify
-- @engines duckdb postgres sqlite
-- @each
SELECT order_id, total
FROM orders
WHERE status = 'paid'
QUALIFY ROW_NUMBER() OVER (ORDER BY total DESC) <= 3
ORDER BY total DESC;

-- @name m6.ch_share
-- @engines duckdb postgres sqlite
SELECT order_id, store_id, total,
       round(100.0 * total / sum(total) OVER (PARTITION BY store_id), 1) AS store_share
FROM orders
WHERE status = 'paid'
ORDER BY order_id;

-- @name m6.ch_drop
-- @engines duckdb postgres sqlite
WITH d AS (
  SELECT store_id, day, revenue,
         LAG(revenue) OVER (PARTITION BY store_id ORDER BY day) AS prev_revenue
  FROM daily_revenue
)
SELECT store_id, day, revenue, prev_revenue
FROM d
WHERE revenue < prev_revenue
ORDER BY store_id, day;

-- @name m6.ch_third
-- @engines duckdb postgres sqlite
WITH r AS (
  SELECT day, store_id, revenue, RANK() OVER (ORDER BY revenue DESC) AS rnk
  FROM daily_revenue
)
SELECT day, store_id, revenue
FROM r
WHERE rnk = 3
ORDER BY store_id;
