select
    order_id,
    line_no,
    product_id,
    cast(qty as integer) as quantity,
    cast(unit_price as decimal(12, 2)) as unit_price_usd,
    cast(qty as integer) * cast(unit_price as decimal(12, 2)) as line_total_usd
from {{ source('brewline', 'order_items') }}
