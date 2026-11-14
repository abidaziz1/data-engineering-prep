-- Row-level security as the database sees it: the user's regions become a filter on every query.
SELECT count(*)            AS order_lines_visible,
       sum(l.line_amount)  AS revenue_visible
FROM fact_order_lines l
JOIN fact_orders o ON o.order_id = l.order_id
JOIN dim_store   s ON s.store_id = o.store_id
WHERE o.order_date >= DATE '2026-03-01' AND o.order_date < DATE '2026-04-01'
  AND (
        EXISTS (SELECT 1 FROM bi_users u WHERE u.email = $email AND u.sees_all)
     OR s.region IN (SELECT r.region FROM bi_user_regions r WHERE r.email = $email)
      );
