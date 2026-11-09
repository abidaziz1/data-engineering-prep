with source as (

    select * from {{ source('brewline', 'orders') }}

),

latest as (

    select *
    from source
    qualify row_number() over (partition by order_id order by _loaded_at desc) = 1

)

select
    order_id,
    customer_id,
    cast(order_ts as timestamp) as ordered_at,
    upper(status) as order_status,
    cast(total_usd as decimal(12, 2)) as order_total_usd,
    _loaded_at as loaded_at
from latest
