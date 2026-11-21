-- A singular test: it returns the orders whose total differs from the total of their lines. A test passes when it returns no rows.
select order_id, total_cents, lines_total_cents
from {{ ref('fct_orders') }}
where total_cents <> lines_total_cents
