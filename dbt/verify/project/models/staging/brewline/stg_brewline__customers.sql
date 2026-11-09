select
    customer_id,
    full_name,
    lower(email) as email,
    upper(country) as country_code,
    tier
from {{ source('brewline', 'customers') }}
