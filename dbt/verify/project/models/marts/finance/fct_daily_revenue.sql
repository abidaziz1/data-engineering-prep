select
    cast(ordered_at as date) as order_date,
    count(*) as orders,
    sum(order_total_usd) as revenue_usd
from {{ ref('fct_orders') }}
where order_status <> 'CANCELLED'
group by 1
