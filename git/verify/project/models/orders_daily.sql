select
    order_date,
    store_id,
    count(*) as orders,
    sum(amount) as revenue
from raw_orders
group by 1, 2
