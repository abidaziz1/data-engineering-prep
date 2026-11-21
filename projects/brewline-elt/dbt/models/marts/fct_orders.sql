-- The grain is one row for each order. The total from the lines must equal the total of the order: a singular test checks it.
with lines as (
    select
        l.order_id,
        sum(l.qty * p.price_cents) as lines_total_cents,
        count(*)                   as line_count
    from {{ ref('stg_order_lines') }} l
    join {{ ref('product_prices') }} p on p.sku = l.sku
    group by 1
)
select
    o.order_id,
    o.store_id,
    s.region,
    o.status,
    o.updated_date,
    o.total_cents,
    coalesce(l.lines_total_cents, 0) as lines_total_cents,
    coalesce(l.line_count, 0)        as line_count
from {{ ref('stg_orders') }} o
left join lines l using (order_id)
left join {{ ref('stg_stores') }} s using (store_id)
