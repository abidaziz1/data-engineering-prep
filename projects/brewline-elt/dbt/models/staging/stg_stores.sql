select id as store_id, name as store_name, region
from {{ source('raw', 'stores') }}
