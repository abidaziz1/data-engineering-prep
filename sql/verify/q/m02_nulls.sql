-- Mission 2: SELECT, filters and NULL.

-- @name m2.null_eq
-- @engines duckdb postgres sqlite
SELECT count(*)                                  AS customers,
       count(email)                              AS with_email,
       count(*) FILTER (WHERE email = NULL)      AS equals_null,
       count(*) FILTER (WHERE email IS NULL)     AS is_null,
       count(*) FILTER (WHERE email <> 'ana@example.com') AS not_ana
FROM customers;

-- @name m2.not_gold
-- @engines duckdb postgres sqlite
SELECT 'tier <> gold'                  AS filter, count(*) AS customers FROM customers WHERE tier <> 'gold'
UNION ALL
SELECT 'tier IS DISTINCT FROM gold'    AS filter, count(*) AS customers FROM customers WHERE tier IS DISTINCT FROM 'gold'
UNION ALL
SELECT 'NOT (tier = gold)'             AS filter, count(*) AS customers FROM customers WHERE NOT (tier = 'gold')
UNION ALL
SELECT 'tier <> gold OR tier IS NULL'  AS filter, count(*) AS customers FROM customers WHERE tier <> 'gold' OR tier IS NULL;

-- @name m2.not_in
-- @engines duckdb postgres sqlite
SELECT 'NOT IN' AS method, count(*) AS never_ordered
FROM customers
WHERE customer_id NOT IN (SELECT customer_id FROM orders)
UNION ALL
SELECT 'NOT EXISTS', count(*)
FROM customers AS c
WHERE NOT EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.customer_id)
UNION ALL
SELECT 'LEFT JOIN', count(*)
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.customer_id
WHERE o.order_id IS NULL;

-- @name m2.not_in_fixed
-- @engines duckdb postgres sqlite
SELECT customer_id, name
FROM customers
WHERE customer_id NOT IN (SELECT customer_id FROM orders WHERE customer_id IS NOT NULL)
ORDER BY customer_id;

-- @name m2.null_order
-- @engines duckdb postgres sqlite
SELECT customer_id, tier
FROM customers
ORDER BY tier, customer_id;

-- @name m2.null_order_explicit
-- @engines duckdb postgres sqlite
SELECT customer_id, tier
FROM customers
ORDER BY tier NULLS FIRST, customer_id;

-- @name m2.null_groups
-- @engines duckdb postgres sqlite
SELECT tier, count(*) AS customers
FROM customers
GROUP BY tier
ORDER BY tier NULLS LAST;

-- @name m2.distinct_null
-- @engines duckdb
SELECT DISTINCT tier
FROM customers
ORDER BY tier NULLS LAST;

-- @name m2.div_zero
-- @engines duckdb postgres sqlite
-- @each
SELECT 10 / 0 AS ten_over_zero;

-- @name m2.nullif
-- @engines duckdb postgres sqlite
SELECT 10 / NULLIF(0, 0) AS safe_division,
       coalesce(10 / NULLIF(0, 0), -1) AS with_default;

-- @name m2.coalesce
-- @engines duckdb
SELECT customer_id,
       name,
       coalesce(email, 'no email')  AS email_shown,
       coalesce(tier, 'unranked')   AS tier_shown,
       coalesce(country, '??')      AS country_shown
FROM customers
ORDER BY customer_id;

-- @name m2.concat_null
-- @engines duckdb postgres sqlite
SELECT customer_id,
       'Hi ' || name || ' <' || email || '>'  AS with_pipes,
       concat('Hi ', name, ' <', email, '>')  AS with_concat
FROM customers
WHERE customer_id IN (1, 2)
ORDER BY customer_id;

-- @name m2.like_case
-- @engines duckdb postgres sqlite
SELECT name
FROM customers
WHERE name LIKE 'ana%'
ORDER BY customer_id;

-- @name m2.in_null_list
-- @engines duckdb postgres sqlite
SELECT customer_id, tier
FROM customers
WHERE tier IN ('gold', NULL)
ORDER BY customer_id;

-- @name m2.case_null
-- @engines duckdb
SELECT customer_id,
       tier,
       CASE tier WHEN 'gold' THEN 'top' WHEN 'silver' THEN 'mid' ELSE 'other' END AS bucket,
       CASE WHEN tier IS NULL THEN 'unknown' ELSE tier END AS tier_or_unknown
FROM customers
ORDER BY customer_id;

-- @name m2.where_and_or
-- @engines duckdb
SELECT order_id, status, channel, total
FROM orders
WHERE channel = 'web' OR channel = 'app' AND status = 'paid'
ORDER BY order_id;

-- @name m2.where_and_or_fixed
-- @engines duckdb
SELECT order_id, status, channel, total
FROM orders
WHERE status = 'paid' AND (channel = 'web' OR channel = 'app')
ORDER BY order_id;

-- @name m2.count_forms
-- @engines duckdb
SELECT count(*)                AS all_rows,
       count(tier)             AS tier_not_null,
       count(DISTINCT tier)    AS tier_values,
       count(DISTINCT country) AS country_values
FROM customers;

-- @name m2.avg_null
-- @engines duckdb
SELECT round(avg(customer_id), 3)              AS avg_ignoring_null,
       round(avg(coalesce(customer_id, 0)), 3) AS avg_null_as_zero,
       count(*) - count(customer_id)           AS null_customers
FROM orders;

-- @name m2.ch_never
-- @engines duckdb postgres sqlite
SELECT c.customer_id, c.name
FROM customers AS c
WHERE NOT EXISTS (
  SELECT 1
  FROM orders AS o
  WHERE o.customer_id = c.customer_id
)
ORDER BY c.customer_id;

-- @name m2.ch_changed_wrong
-- @engines duckdb postgres sqlite
SELECT c.customer_id, c.tier AS tier_in_customers, d.tier AS tier_in_dimension
FROM customers AS c
LEFT JOIN customer_dim AS d ON d.customer_id = c.customer_id AND d.is_current
WHERE c.tier <> d.tier
ORDER BY c.customer_id;

-- @name m2.ch_changed
-- @engines duckdb postgres sqlite
SELECT c.customer_id, c.tier AS tier_in_customers, d.tier AS tier_in_dimension
FROM customers AS c
LEFT JOIN customer_dim AS d ON d.customer_id = c.customer_id AND d.is_current
WHERE c.tier IS DISTINCT FROM d.tier
ORDER BY c.customer_id;

-- @name m2.guest_orders
-- @engines duckdb
SELECT count(*)                     AS orders,
       count(customer_id)           AS with_customer,
       count(*) - count(customer_id) AS guest_orders
FROM orders;
