select
    {{ dbt_utils.generate_surrogate_key(['product_id']) }} as product_key,
    product_id,
    product_name,
    category,
    list_price_usd
from {{ ref('stg_brewline__products') }}
