-- Mission 14: the coding rounds of the boss chapter.

-- @name m14.d_tier
-- @engines duckdb postgres sqlite
SELECT coalesce(c.tier, 'none') AS tier, count(DISTINCT o.order_id) AS orders, sum(o.total) AS revenue
FROM orders AS o
LEFT JOIN customers AS c ON c.customer_id = o.customer_id
WHERE o.status = 'paid'
GROUP BY coalesce(c.tier, 'none')
ORDER BY revenue DESC, tier;

-- @name m14.d_bestday
-- @engines duckdb postgres sqlite
WITH r AS (
  SELECT store_id, day, revenue,
         RANK() OVER (PARTITION BY store_id ORDER BY revenue DESC) AS rnk,
         100.0 * revenue / sum(revenue) OVER (PARTITION BY store_id) AS share
  FROM daily_revenue
)
SELECT store_id, day, revenue, round(share, 1) AS share_percent
FROM r
WHERE rnk = 1
ORDER BY store_id;

-- @name m14.d_span
-- @engines duckdb postgres
SELECT customer_id,
       count(*) AS orders,
       CAST(max(order_ts) AS DATE) - CAST(min(order_ts) AS DATE) AS days_between
FROM orders
WHERE customer_id IS NOT NULL
GROUP BY customer_id
HAVING count(*) >= 2
ORDER BY customer_id;
