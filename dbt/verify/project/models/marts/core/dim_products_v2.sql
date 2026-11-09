select
    {{ dbt_utils.generate_surrogate_key(['product_id']) }} as product_key,
    product_id,
    product_name,
    category,
    list_price_usd as price_usd,
    case when list_price_usd >= 30 then 'premium' else 'standard' end as price_band
from {{ ref('stg_brewline__products') }}
