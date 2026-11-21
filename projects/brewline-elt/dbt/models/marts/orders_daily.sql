-- Revenue and orders for each day and region. It counts only orders that were not refunded.
{{ config(materialized='incremental', unique_key=['updated_date', 'region'], incremental_strategy='delete+insert') }}
select
    updated_date,
    region,
    count(*)           as orders,
    sum(total_cents)   as revenue_cents
from {{ ref('fct_orders') }}
where status <> 'REFUNDED'
{% if is_incremental() %}
  and updated_date >= (select max(updated_date) - interval 1 day from {{ this }})
{% endif %}
group by 1, 2
