with customers as (

    select * from {{ ref('stg_brewline__customers') }}

),

countries as (

    select * from {{ ref('country_names') }}

),

orders as (

    select
        customer_id,
        count(*) as orders_count,
        min(ordered_at) as first_order_at
    from {{ ref('stg_brewline__orders') }}
    where order_status <> 'CANCELLED'
    group by customer_id

)

select
    {{ dbt_utils.generate_surrogate_key(['c.customer_id']) }} as customer_key,
    c.customer_id,
    c.full_name,
    c.email,
    c.country_code,
    n.country_name,
    c.tier,
    coalesce(o.orders_count, 0) as orders_count,
    o.first_order_at
from customers as c
left join countries as n on n.country_code = c.country_code
left join orders as o on o.customer_id = c.customer_id
