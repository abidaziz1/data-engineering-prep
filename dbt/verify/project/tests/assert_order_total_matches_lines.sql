{{ config(severity='warn') }}

select
    order_id,
    order_total_usd,
    items_total_usd
from {{ ref('int_orders__with_items') }}
where order_total_usd <> items_total_usd
