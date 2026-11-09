{{
    config(
        materialized='incremental',
        unique_key='order_id',
        on_schema_change='append_new_columns'
    )
}}

select
    order_id,
    customer_id,
    ordered_at,
    order_status,
    order_total_usd,
    items_total_usd,
    order_total_usd = items_total_usd as is_reconciled,
    loaded_at
from {{ ref('int_orders__with_items') }}

{% if is_incremental() %}
where loaded_at > (select coalesce(max(loaded_at), timestamp '1900-01-01') from {{ this }})
{% endif %}
