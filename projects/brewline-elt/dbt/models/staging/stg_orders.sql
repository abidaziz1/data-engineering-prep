-- One row for each order, with the names and types that the rest of the project uses.
select
    id                              as order_id,
    store_id,
    upper(status)                   as status,
    total_cents,
    cast(updated_at as timestamp)   as updated_at,
    cast(updated_at as date)        as updated_date,
    _dlt_id
from {{ source('raw', 'orders') }}
