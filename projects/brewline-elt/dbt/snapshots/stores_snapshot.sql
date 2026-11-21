{% snapshot stores_snapshot %}
{{ config(target_schema='snapshots', unique_key='store_id', strategy='check', check_cols=['store_name', 'region']) }}
select store_id, store_name, region from {{ ref('stg_stores') }}
{% endsnapshot %}
