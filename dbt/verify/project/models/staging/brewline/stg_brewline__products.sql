select
    product_id,
    name as product_name,
    category,
    cast(price_usd as decimal(12, 2)) as list_price_usd
from {{ source('brewline', 'products') }}
