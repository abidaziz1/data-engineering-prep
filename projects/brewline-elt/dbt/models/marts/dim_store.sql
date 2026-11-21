select store_id, store_name, region from {{ ref('stg_stores') }}
