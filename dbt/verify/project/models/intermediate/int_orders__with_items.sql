with items as (

    select
        order_id,
        count(*) as item_lines,
        sum(quantity) as units,
        sum(line_total_usd) as items_total_usd
    from {{ ref('stg_brewline__order_items') }}
    group by order_id

)

select
    o.order_id,
    o.customer_id,
    o.ordered_at,
    o.order_status,
    o.order_total_usd,
    o.loaded_at,
    coalesce(i.item_lines, 0) as item_lines,
    coalesce(i.units, 0) as units,
    coalesce(i.items_total_usd, 0) as items_total_usd
from {{ ref('stg_brewline__orders') }} as o
left join items as i on i.order_id = o.order_id
