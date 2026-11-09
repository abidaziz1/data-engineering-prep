window.LAB = window.LAB || {};
LAB.real = {
 "conns": {
  "cfg_baseline": 1,
  "cfg_cluster_by": 1,
  "cfg_copy_grants": 1,
  "cfg_dynamic_table": 1,
  "cfg_grants": 1,
  "cfg_post_hook": 1,
  "cfg_query_tag": 1,
  "cfg_secure_view": 1,
  "cfg_transient_false": 1,
  "cfg_warehouse": 1,
  "ci_cleanup": 1,
  "ci_cleanup_guard": 1,
  "ci_defer": 1,
  "clone_to_ci": 2,
  "compile_one": 1,
  "debug_dev": 1,
  "debug_pw": 1,
  "debug_sso": 1,
  "docs_generate": 3,
  "empty_run": 1,
  "freshness": 1,
  "grants_revoke": 1,
  "hook_grants": 2,
  "incr_append": 1,
  "incr_delete_insert": 1,
  "incr_first_run": 1,
  "incr_full_refresh": 1,
  "incr_merge": 1,
  "incr_merge_columns": 1,
  "incr_merge_nokey": 1,
  "incr_microbatch": 1,
  "incr_predicates": 1,
  "incr_schema_append": 1,
  "parse_only": 0,
  "python_model": 1,
  "run_all_dev": 4,
  "run_two_ci": 2,
  "run_two_prod": 5,
  "seed_dev": 1,
  "snapshot_first": 1,
  "snapshot_permanent": 1,
  "snapshot_second": 1,
  "tests_generic": 4
 },
 "files": {
  "dbt_project.yml": "name: brewline\nversion: '1.0.0'\nprofile: brewline\n\nmodel-paths: [\"models\"]\nseed-paths: [\"seeds\"]\nsnapshot-paths: [\"snapshots\"]\nmacro-paths: [\"macros\"]\ntest-paths: [\"tests\"]\n\nclean-targets: [\"target\", \"dbt_packages\"]\n\nmodels:\n  brewline:\n    staging:\n      +materialized: view\n      +schema: staging\n    intermediate:\n      +materialized: view\n      +schema: intermediate\n    marts:\n      +materialized: table\n      +schema: marts\n\nseeds:\n  brewline:\n    +schema: reference\n",
  "macros/generate_schema_name.sql": "{% macro generate_schema_name(custom_schema_name, node) -%}\n    {%- set default_schema = target.schema -%}\n    {%- if target.name == 'prod' and custom_schema_name is not none -%}\n        {{ custom_schema_name | trim }}\n    {%- else -%}\n        {{ default_schema }}\n    {%- endif -%}\n{%- endmacro %}\n",
  "models/marts/_marts__models.yml": "version: 2\n\nmodels:\n  - name: dim_customers\n    description: One row per customer, with country name and order counts.\n    config:\n      tags: [pii]\n    columns:\n      - name: customer_key\n        data_tests: [unique, not_null]\n      - name: customer_id\n        data_tests: [unique, not_null]\n\n  - name: dim_products\n    description: One row per product.\n    latest_version: 2\n    columns:\n      - name: product_key\n        data_tests: [unique, not_null]\n    versions:\n      - v: 1\n        deprecation_date: 2027-01-31\n      - v: 2\n        columns:\n          - include: all\n            exclude: [list_price_usd]\n          - name: price_usd\n            description: List price in US dollars. Renamed from list_price_usd in v1.\n          - name: price_band\n            description: premium for list prices of 30 dollars or more, otherwise standard.\n\n  - name: fct_orders\n    description: One row per order. Incremental, merged on order_id.\n    config:\n      tags: [daily]\n    columns:\n      - name: order_id\n        data_tests: [unique, not_null]\n      - name: customer_id\n        data_tests:\n          - relationships:\n              arguments:\n                to: ref('dim_customers')\n                field: customer_id\n      - name: is_reconciled\n        description: True when the order total equals the sum of its lines.\n\n  - name: fct_daily_revenue\n    description: Revenue per day, without cancelled orders. A public interface with an enforced contract.\n    config:\n      tags: [daily]\n      group: finance\n      access: public\n      contract:\n        enforced: true\n    columns:\n      - name: order_date\n        data_type: date\n        constraints:\n          - type: not_null\n        data_tests: [unique, not_null]\n      - name: orders\n        data_type: bigint\n      - name: revenue_usd\n        data_type: decimal(38, 2)\n",
  "models/marts/core/dim_customers.sql": "with customers as (\n\n    select * from {{ ref('stg_brewline__customers') }}\n\n),\n\ncountries as (\n\n    select * from {{ ref('country_names') }}\n\n),\n\norders as (\n\n    select\n        customer_id,\n        count(*) as orders_count,\n        min(ordered_at) as first_order_at\n    from {{ ref('stg_brewline__orders') }}\n    where order_status <> 'CANCELLED'\n    group by customer_id\n\n)\n\nselect\n    {{ dbt_utils.generate_surrogate_key(['c.customer_id']) }} as customer_key,\n    c.customer_id,\n    c.full_name,\n    c.email,\n    c.country_code,\n    n.country_name,\n    c.tier,\n    coalesce(o.orders_count, 0) as orders_count,\n    o.first_order_at\nfrom customers as c\nleft join countries as n on n.country_code = c.country_code\nleft join orders as o on o.customer_id = c.customer_id\n",
  "models/marts/core/fct_orders.sql": "{{\n    config(\n        materialized='incremental',\n        unique_key='order_id',\n        on_schema_change='append_new_columns'\n    )\n}}\n\nselect\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom {{ ref('int_orders__with_items') }}\n\n{% if is_incremental() %}\nwhere loaded_at > (select coalesce(max(loaded_at), timestamp '1900-01-01') from {{ this }})\n{% endif %}\n",
  "models/marts/finance/fct_daily_revenue.sql": "select\n    cast(ordered_at as date) as order_date,\n    count(*) as orders,\n    sum(order_total_usd) as revenue_usd\nfrom {{ ref('fct_orders') }}\nwhere order_status <> 'CANCELLED'\ngroup by 1\n",
  "models/staging/brewline/_brewline__sources.yml": "version: 2\n\nsources:\n  - name: brewline\n    description: Raw tables loaded by the ingestion pipeline. Nothing here is cleaned.\n    database: BREWLINE\n    schema: raw\n    config:\n      loaded_at_field: _loaded_at\n      freshness:\n        warn_after: {count: 12, period: hour}\n        error_after: {count: 24, period: hour}\n    tables:\n      - name: orders\n        description: One row for every version of an order. The loader only appends.\n        columns:\n          - name: order_id\n            description: Business key. It repeats here because RAW keeps every version.\n      - name: order_items\n        description: One row for every line of an order.\n      - name: customers\n        description: One row for every customer, as last loaded.\n      - name: products\n        description: The product catalog.\n",
  "profiles.yml": "brewline:\n  target: dev\n  outputs:\n    dev:\n      type: snowflake\n      account: \"{{ env_var('SNOWFLAKE_ACCOUNT') }}\"\n      user: \"{{ env_var('SNOWFLAKE_USER') }}\"\n      private_key_path: \"{{ env_var('SNOWFLAKE_PRIVATE_KEY_PATH') }}\"\n      role: TRANSFORMER\n      warehouse: WH_TRANSFORM_DEV\n      database: BREWLINE_DEV\n      schema: DEV_ALICE\n      threads: 4\n    ci:\n      type: snowflake\n      account: \"{{ env_var('SNOWFLAKE_ACCOUNT') }}\"\n      user: \"{{ env_var('SNOWFLAKE_USER') }}\"\n      private_key_path: \"{{ env_var('SNOWFLAKE_PRIVATE_KEY_PATH') }}\"\n      role: CI_DEPLOYER\n      warehouse: WH_CI\n      database: BREWLINE_CI\n      schema: \"PR_{{ env_var('PR_NUMBER', '0') }}\"\n      threads: 4\n    prod:\n      type: snowflake\n      account: \"{{ env_var('SNOWFLAKE_ACCOUNT') }}\"\n      user: \"{{ env_var('SNOWFLAKE_USER') }}\"\n      private_key_path: \"{{ env_var('SNOWFLAKE_PRIVATE_KEY_PATH') }}\"\n      role: TRANSFORMER\n      warehouse: WH_TRANSFORM\n      database: BREWLINE\n      schema: ANALYTICS\n      threads: 8\n      query_tag: dbt_brewline_prod\n",
  "scenario/_intermediate__models_event_time.yml": "models:\n  - name: int_orders__with_items\n    config:\n      event_time: ordered_at\n",
  "scenario/cfg_baseline.sql": "{{ config(materialized='table') }}\n\nselect customer_id, full_name, email, tier\nfrom {{ ref('stg_brewline__customers') }}\n",
  "scenario/cfg_cluster_by.sql": "{{ config(materialized='table', cluster_by=['tier']) }}\n\nselect customer_id, full_name, email, tier\nfrom {{ ref('stg_brewline__customers') }}\n",
  "scenario/cfg_copy_grants.sql": "{{ config(materialized='table', copy_grants=true) }}\n\nselect customer_id, full_name, email, tier\nfrom {{ ref('stg_brewline__customers') }}\n",
  "scenario/cfg_dynamic_table.sql": "{{ config(materialized='dynamic_table', target_lag='1 hour', snowflake_warehouse='WH_TRANSFORM', refresh_mode='AUTO') }}\n\nselect customer_id, full_name, email, tier\nfrom {{ ref('stg_brewline__customers') }}\n",
  "scenario/cfg_grants.sql": "{{ config(materialized='table', grants={'select': ['REPORTER', 'ANALYST']}) }}\n\nselect customer_id, full_name, email, tier\nfrom {{ ref('stg_brewline__customers') }}\n",
  "scenario/cfg_post_hook.sql": "{{ config(materialized='table', post_hook=\"alter table {{ this }} modify column email set masking policy BREWLINE.GOVERNANCE.EMAIL_MASK\") }}\n\nselect customer_id, full_name, email, tier\nfrom {{ ref('stg_brewline__customers') }}\n",
  "scenario/cfg_query_tag.sql": "{{ config(materialized='table', query_tag='dbt_brewline_' ~ target.name) }}\n\nselect customer_id, full_name, email, tier\nfrom {{ ref('stg_brewline__customers') }}\n",
  "scenario/cfg_secure_view.sql": "{{ config(materialized='view', secure=true) }}\n\nselect customer_id, full_name, email, tier\nfrom {{ ref('stg_brewline__customers') }}\n",
  "scenario/cfg_transient_false.sql": "{{ config(materialized='table', transient=false) }}\n\nselect customer_id, full_name, email, tier\nfrom {{ ref('stg_brewline__customers') }}\n",
  "scenario/cfg_warehouse.sql": "{{ config(materialized='table', snowflake_warehouse='WH_TRANSFORM_XL') }}\n\nselect customer_id, full_name, email, tier\nfrom {{ ref('stg_brewline__customers') }}\n",
  "scenario/drop_pr_schema.sql": "{% macro drop_pr_schema() %}\n    {% if target.name != 'ci' %}\n        {{ exceptions.raise_compiler_error('drop_pr_schema runs only on the ci target, not on ' ~ target.name) }}\n    {% endif %}\n    {% do run_query('drop schema if exists ' ~ target.database ~ '.' ~ target.schema ~ ' cascade') %}\n{% endmacro %}\n",
  "scenario/fct_orders_append.sql": "{{\n    config(\n        materialized='incremental',\n        unique_key='order_id',\n        incremental_strategy='append',\n        on_schema_change='append_new_columns'\n    )\n}}\n\nselect\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom {{ ref('int_orders__with_items') }}\n\n{% if is_incremental() %}\nwhere loaded_at > (select coalesce(max(loaded_at), timestamp '1900-01-01') from {{ this }})\n{% endif %}\n",
  "scenario/fct_orders_delete_insert.sql": "{{\n    config(\n        materialized='incremental',\n        unique_key='order_id',\n        incremental_strategy='delete+insert',\n        on_schema_change='append_new_columns'\n    )\n}}\n\nselect\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom {{ ref('int_orders__with_items') }}\n\n{% if is_incremental() %}\nwhere loaded_at > (select coalesce(max(loaded_at), timestamp '1900-01-01') from {{ this }})\n{% endif %}\n",
  "scenario/fct_orders_merge.sql": "{{\n    config(\n        materialized='incremental',\n        unique_key='order_id',\n        on_schema_change='append_new_columns'\n    )\n}}\n\nselect\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom {{ ref('int_orders__with_items') }}\n\n{% if is_incremental() %}\nwhere loaded_at > (select coalesce(max(loaded_at), timestamp '1900-01-01') from {{ this }})\n{% endif %}\n",
  "scenario/fct_orders_merge_columns.sql": "{{\n    config(\n        materialized='incremental',\n        unique_key='order_id',\n        merge_update_columns=['order_status', 'order_total_usd', 'loaded_at'],\n        on_schema_change='append_new_columns'\n    )\n}}\n\nselect\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom {{ ref('int_orders__with_items') }}\n\n{% if is_incremental() %}\nwhere loaded_at > (select coalesce(max(loaded_at), timestamp '1900-01-01') from {{ this }})\n{% endif %}\n",
  "scenario/fct_orders_merge_nokey.sql": "{{\n    config(\n        materialized='incremental',\n        incremental_strategy='merge',\n        on_schema_change='append_new_columns'\n    )\n}}\n\nselect\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom {{ ref('int_orders__with_items') }}\n\n{% if is_incremental() %}\nwhere loaded_at > (select coalesce(max(loaded_at), timestamp '1900-01-01') from {{ this }})\n{% endif %}\n",
  "scenario/fct_orders_microbatch.sql": "{{\n    config(\n        materialized='incremental',\n        incremental_strategy='microbatch',\n        event_time='ordered_at',\n        batch_size='day',\n        begin='2026-03-14',\n        lookback=1\n    )\n}}\n\nselect\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom {{ ref('int_orders__with_items') }}\n",
  "scenario/fct_orders_predicates.sql": "{{\n    config(\n        materialized='incremental',\n        unique_key='order_id',\n        incremental_predicates=[\"DBT_INTERNAL_DEST.ordered_at >= dateadd(day, -7, current_date)\"],\n        on_schema_change='append_new_columns'\n    )\n}}\n\nselect\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom {{ ref('int_orders__with_items') }}\n\n{% if is_incremental() %}\nwhere loaded_at > (select coalesce(max(loaded_at), timestamp '1900-01-01') from {{ this }})\n{% endif %}\n",
  "scenario/grants_revoke.sql": "{{ config(materialized='incremental', unique_key='customer_id', grants={'select': ['REPORTER', 'ANALYST']}) }}\n\nselect customer_id, full_name, email, tier\nfrom {{ ref('stg_brewline__customers') }}\n",
  "scenario/profiles_other_sign_in.yml": "    pw:\n      type: snowflake\n      account: \"{{ env_var('SNOWFLAKE_ACCOUNT') }}\"\n      user: \"{{ env_var('SNOWFLAKE_USER') }}\"\n      password: \"{{ env_var('SNOWFLAKE_PASSWORD') }}\"\n      role: TRANSFORMER\n      warehouse: WH_TRANSFORM_DEV\n      database: BREWLINE_DEV\n      schema: DEV_ALICE\n      threads: 4\n    sso:\n      type: snowflake\n      account: \"{{ env_var('SNOWFLAKE_ACCOUNT') }}\"\n      user: alice@brewline.example\n      authenticator: externalbrowser\n      role: TRANSFORMER\n      warehouse: WH_TRANSFORM_DEV\n      database: BREWLINE_DEV\n      schema: DEV_ALICE\n      threads: 4\n",
  "scenario/project_on_run_end.yml": "on-run-end:\n  - \"{% for s in schemas %}grant usage on schema {{ target.database }}.{{ s }} to role REPORTER{% if not loop.last %};{% endif %}{% endfor %}\"\n",
  "scenario/project_snapshots_permanent.yml": "snapshots:\n  brewline:\n    +transient: false\n",
  "scenario/py_customer_revenue.py": "import snowflake.snowpark.functions as F\n\n\ndef model(dbt, session):\n    dbt.config(materialized=\"table\")\n\n    orders = dbt.ref(\"stg_brewline__orders\")\n    kept = orders.filter(F.col(\"ORDER_STATUS\") != \"CANCELLED\")\n\n    return kept.group_by(\"CUSTOMER_ID\").agg(\n        F.count(\"ORDER_ID\").alias(\"ORDERS\"),\n        F.sum(\"ORDER_TOTAL_USD\").alias(\"REVENUE_USD\"),\n    )\n",
  "seeds/country_names.csv": "country_code,country_name\nUS,United States\nUK,United Kingdom\nFR,France\nDE,Germany\n",
  "snapshots/snap_customers.yml": "snapshots:\n  - name: snap_customers\n    relation: source('brewline', 'customers')\n    config:\n      schema: snapshots\n      unique_key: customer_id\n      strategy: timestamp\n      updated_at: _loaded_at\n"
 },
 "meta": {
  "dbt-core": "1.12.6",
  "dbt-snowflake": "1.12.5",
  "note": "Recorded by snowflake-dbt/verify/capture_sf.py against a stand-in connection. Nothing ran on Snowflake.",
  "snowflake-connector-python": "5.2.0"
 },
 "stmts": {
  "cfg_baseline": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "ddl",
    "sql": "create or replace transient table BREWLINE_DEV.DEV_ALICE.cfg_demo\n    as (\nselect customer_id, full_name, email, tier\nfrom BREWLINE_DEV.DEV_ALICE.stg_brewline__customers\n    )"
   }
  ],
  "cfg_cluster_by": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "ddl",
    "sql": "create or replace transient table BREWLINE_DEV.DEV_ALICE.cfg_demo\n    as (select * from (\nselect customer_id, full_name, email, tier\nfrom BREWLINE_DEV.DEV_ALICE.stg_brewline__customers\n        )\n        order by (\n            tier\n        )\n    )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "ddl",
    "sql": "alter table BREWLINE_DEV.DEV_ALICE.cfg_demo cluster by (tier)"
   }
  ],
  "cfg_copy_grants": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "ddl",
    "sql": "create or replace transient table BREWLINE_DEV.DEV_ALICE.cfg_demo\n    copy grants\n    as (\nselect customer_id, full_name, email, tier\nfrom BREWLINE_DEV.DEV_ALICE.stg_brewline__customers\n    )"
   }
  ],
  "cfg_dynamic_table": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "query",
    "sql": "select current_warehouse() as warehouse"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "ddl",
    "sql": "use warehouse WH_TRANSFORM"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "ddl",
    "sql": "create dynamic table BREWLINE_DEV.DEV_ALICE.cfg_demo\n        target_lag = '1 hour'\n        warehouse = WH_TRANSFORM\n        refresh_mode = AUTO\n        initialize = ON_CREATE\n        scheduler = 'ENABLE'\n        as (\nselect customer_id, full_name, email, tier\nfrom BREWLINE_DEV.DEV_ALICE.stg_brewline__customers\n        )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "ddl",
    "sql": "use warehouse WH_TRANSFORM_DEV"
   }
  ],
  "cfg_grants": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "ddl",
    "sql": "create or replace transient table BREWLINE_DEV.DEV_ALICE.cfg_demo\n    as (\nselect customer_id, full_name, email, tier\nfrom BREWLINE_DEV.DEV_ALICE.stg_brewline__customers\n    )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "ddl",
    "sql": "grant select on BREWLINE_DEV.DEV_ALICE.cfg_demo to REPORTER"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "ddl",
    "sql": "grant select on BREWLINE_DEV.DEV_ALICE.cfg_demo to ANALYST"
   }
  ],
  "cfg_post_hook": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "ddl",
    "sql": "create or replace transient table BREWLINE_DEV.DEV_ALICE.cfg_demo\n    as (\nselect customer_id, full_name, email, tier\nfrom BREWLINE_DEV.DEV_ALICE.stg_brewline__customers\n    )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "ddl",
    "sql": "alter table BREWLINE_DEV.DEV_ALICE.cfg_demo modify column email set masking policy BREWLINE.GOVERNANCE.EMAIL_MASK"
   }
  ],
  "cfg_query_tag": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "meta",
    "sql": "show parameters like 'query_tag' in session"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "ddl",
    "sql": "alter session set query_tag = 'dbt_brewline_dev'"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "ddl",
    "sql": "create or replace transient table BREWLINE_DEV.DEV_ALICE.cfg_demo\n    as (\nselect customer_id, full_name, email, tier\nfrom BREWLINE_DEV.DEV_ALICE.stg_brewline__customers\n    )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "ddl",
    "sql": "alter session unset query_tag"
   }
  ],
  "cfg_secure_view": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "ddl",
    "sql": "create or replace secure  view BREWLINE_DEV.DEV_ALICE.cfg_demo\n  as (\nselect customer_id, full_name, email, tier\nfrom BREWLINE_DEV.DEV_ALICE.stg_brewline__customers\n  )"
   }
  ],
  "cfg_transient_false": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "ddl",
    "sql": "create or replace table BREWLINE_DEV.DEV_ALICE.cfg_demo\n    as (\nselect customer_id, full_name, email, tier\nfrom BREWLINE_DEV.DEV_ALICE.stg_brewline__customers\n    )"
   }
  ],
  "cfg_warehouse": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "query",
    "sql": "select current_warehouse() as warehouse"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "ddl",
    "sql": "use warehouse WH_TRANSFORM_XL"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "ddl",
    "sql": "create or replace transient table BREWLINE_DEV.DEV_ALICE.cfg_demo\n    as (\nselect customer_id, full_name, email, tier\nfrom BREWLINE_DEV.DEV_ALICE.stg_brewline__customers\n    )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "ddl",
    "sql": "use warehouse WH_TRANSFORM_DEV"
   }
  ],
  "ci_cleanup": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"ci\", \"connection_name\": \"macro_drop_pr_schema\"}",
    "kind": "ddl",
    "sql": "drop schema if exists BREWLINE_CI.PR_123 cascade"
   }
  ],
  "ci_cleanup_guard": [],
  "ci_defer": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"ci\", \"connection_name\": \"list_BREWLINE_CI\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_CI\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"ci\", \"connection_name\": \"list_BREWLINE_CI_PR_123\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_CI.PR_123\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"ci\", \"connection_name\": \"list_BREWLINE_CI_PR_123\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_CI.PR_123"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"ci\", \"node_id\": \"model.brewline.dim_customers\"}",
    "kind": "ddl",
    "sql": "create or replace transient table BREWLINE_CI.PR_123.dim_customers\n    as (with customers as (\n    select * from BREWLINE.staging.stg_brewline__customers\n),\ncountries as (\n    select * from BREWLINE.reference.country_names\n),\norders as (\n    select\n        customer_id,\n        count(*) as orders_count,\n        min(ordered_at) as first_order_at\n    from BREWLINE.staging.stg_brewline__orders\n    where order_status <> 'CANCELLED'\n    group by customer_id\n)\nselect\n    md5(cast(coalesce(cast(c.customer_id as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as customer_key,\n    c.customer_id,\n    c.full_name,\n    c.email,\n    c.country_code,\n    n.country_name,\n    c.tier,\n    coalesce(o.orders_count, 0) as orders_count,\n    o.first_order_at\nfrom customers as c\nleft join countries as n on n.country_code = c.country_code\nleft join orders as o on o.customer_id = c.customer_id\n    )"
   }
  ],
  "clone_to_ci": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"ci\", \"connection_name\": \"list_BREWLINE_CI\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_CI\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"ci\", \"connection_name\": \"create_BREWLINE_CI_PR_123\"}",
    "kind": "ddl",
    "sql": "create schema if not exists BREWLINE_CI.PR_123"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"ci\", \"connection_name\": \"list_BREWLINE_CI_PR_123\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_CI.PR_123\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"ci\", \"connection_name\": \"list_BREWLINE_CI_PR_123\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_CI.PR_123"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"ci\", \"node_id\": \"model.brewline.dim_customers\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE.marts\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"ci\", \"node_id\": \"model.brewline.dim_customers\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE.marts"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"ci\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE.marts\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"ci\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE.marts"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"ci\", \"node_id\": \"model.brewline.dim_customers\"}",
    "kind": "ddl",
    "sql": "create or replace\n      transient\n      table BREWLINE_CI.PR_123.dim_customers\n      clone BREWLINE.marts.dim_customers"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"ci\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "ddl",
    "sql": "create or replace\n      transient\n      table BREWLINE_CI.PR_123.fct_orders\n      clone BREWLINE.marts.fct_orders"
   }
  ],
  "compile_one": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   }
  ],
  "debug_dev": [
   {
    "comment": null,
    "kind": "query",
    "sql": "select 1 as id"
   }
  ],
  "debug_pw": [
   {
    "comment": null,
    "kind": "query",
    "sql": "select 1 as id"
   }
  ],
  "debug_sso": [
   {
    "comment": null,
    "kind": "query",
    "sql": "select 1 as id"
   }
  ],
  "docs_generate": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"BREWLINE.information_schema\"}",
    "kind": "query",
    "sql": "with tables as (\n            select\n        table_catalog as \"table_database\",\n        table_schema as \"table_schema\",\n        table_name as \"table_name\",\n        case\n            when is_dynamic = 'YES' and table_type = 'BASE TABLE' THEN 'DYNAMIC TABLE'\n            else table_type\n        end as \"table_type\",\n        comment as \"table_comment\",\n        -- note: this is the _role_ that owns the table\n        table_owner as \"table_owner\",\n        'Clustering Key' as \"stats:clustering_key:label\",\n        clustering_key as \"stats:clustering_key:value\",\n        'The key used to cluster this table' as \"stats:clustering_key:description\",\n        (clustering_key is not null) as \"stats:clustering_key:include\",\n        'Row Count' as \"stats:row_count:label\",\n        row_count as \"stats:row_count:value\",\n        'An approximate count of rows in this table' as \"stats:row_count:description\",\n        (row_count is not null) as \"stats:row_count:include\",\n        'Approximate Size' as \"stats:bytes:label\",\n        bytes as \"stats:bytes:value\",\n        'Approximate size of the table as reported by Snowflake' as \"stats:bytes:description\",\n        (bytes is not null) as \"stats:bytes:include\",\n        'Last Modified' as \"stats:last_modified:label\",\n        to_varchar(convert_timezone('UTC', last_altered), 'yyyy-mm-dd HH24:MI'||'UTC') as \"stats:last_modified:value\",\n        'The timestamp for last update/change' as \"stats:last_modified:description\",\n        (last_altered is not null and table_type in ('BASE TABLE', 'INTERACTIVE TABLE')) as \"stats:last_modified:include\"\n    from BREWLINE.INFORMATION_SCHEMA.tables\n            where (\n                (\n    \"table_schema\" ilike 'raw' and upper(\"table_schema\") = upper('raw')\n                    and\n    \"table_name\" ilike 'orders' and upper(\"table_name\") = upper('orders')\n                )\n             or\n                (\n    \"table_schema\" ilike 'raw' and upper(\"table_schema\") = upper('raw')\n                    and\n    \"table_name\" ilike 'customers' and upper(\"table_name\") = upper('customers')\n                )\n             or\n                (\n    \"table_schema\" ilike 'raw' and upper(\"table_schema\") = upper('raw')\n                    and\n    \"table_name\" ilike 'products' and upper(\"table_name\") = upper('products')\n                )\n             or\n                (\n    \"table_schema\" ilike 'raw' and upper(\"table_schema\") = upper('raw')\n                    and\n    \"table_name\" ilike 'order_items' and upper(\"table_name\") = upper('order_items')\n                )\n            )\n        ),\n        columns as (\n            select\n        table_catalog as \"table_database\",\n        table_schema as \"table_schema\",\n        table_name as \"table_name\",\n        column_name as \"column_name\",\n        ordinal_position as \"column_index\",\n        data_type as \"column_type\",\n        comment as \"column_comment\"\n    from BREWLINE.INFORMATION_SCHEMA.columns\n            where (\n                (\n    \"table_schema\" ilike 'raw' and upper(\"table_schema\") = upper('raw')\n                    and\n    \"table_name\" ilike 'orders' and upper(\"table_name\") = upper('orders')\n                )\n             or\n                (\n    \"table_schema\" ilike 'raw' and upper(\"table_schema\") = upper('raw')\n                    and\n    \"table_name\" ilike 'customers' and upper(\"table_name\") = upper('customers')\n                )\n             or\n                (\n    \"table_schema\" ilike 'raw' and upper(\"table_schema\") = upper('raw')\n                    and\n    \"table_name\" ilike 'products' and upper(\"table_name\") = upper('products')\n                )\n             or\n                (\n    \"table_schema\" ilike 'raw' and upper(\"table_schema\") = upper('raw')\n                    and\n    \"table_name\" ilike 'order_items' and upper(\"table_name\") = upper('order_items')\n                )\n            )\n        )\n        select *\n    from tables\n    join columns using (\"table_database\", \"table_schema\", \"table_name\")\n    order by \"column_index\""
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"BREWLINE_DEV.information_schema\"}",
    "kind": "query",
    "sql": "with tables as (\n            select\n        table_catalog as \"table_database\",\n        table_schema as \"table_schema\",\n        table_name as \"table_name\",\n        case\n            when is_dynamic = 'YES' and table_type = 'BASE TABLE' THEN 'DYNAMIC TABLE'\n            else table_type\n        end as \"table_type\",\n        comment as \"table_comment\",\n        -- note: this is the _role_ that owns the table\n        table_owner as \"table_owner\",\n        'Clustering Key' as \"stats:clustering_key:label\",\n        clustering_key as \"stats:clustering_key:value\",\n        'The key used to cluster this table' as \"stats:clustering_key:description\",\n        (clustering_key is not null) as \"stats:clustering_key:include\",\n        'Row Count' as \"stats:row_count:label\",\n        row_count as \"stats:row_count:value\",\n        'An approximate count of rows in this table' as \"stats:row_count:description\",\n        (row_count is not null) as \"stats:row_count:include\",\n        'Approximate Size' as \"stats:bytes:label\",\n        bytes as \"stats:bytes:value\",\n        'Approximate size of the table as reported by Snowflake' as \"stats:bytes:description\",\n        (bytes is not null) as \"stats:bytes:include\",\n        'Last Modified' as \"stats:last_modified:label\",\n        to_varchar(convert_timezone('UTC', last_altered), 'yyyy-mm-dd HH24:MI'||'UTC') as \"stats:last_modified:value\",\n        'The timestamp for last update/change' as \"stats:last_modified:description\",\n        (last_altered is not null and table_type in ('BASE TABLE', 'INTERACTIVE TABLE')) as \"stats:last_modified:include\"\n    from BREWLINE_DEV.INFORMATION_SCHEMA.tables\n            where (\n                (\n    \"table_schema\" ilike 'DEV_ALICE' and upper(\"table_schema\") = upper('DEV_ALICE')\n                    and\n    \"table_name\" ilike 'fct_daily_revenue' and upper(\"table_name\") = upper('fct_daily_revenue')\n                )\n             or\n                (\n    \"table_schema\" ilike 'DEV_ALICE' and upper(\"table_schema\") = upper('DEV_ALICE')\n                    and\n    \"table_name\" ilike 'dim_products_v1' and upper(\"table_name\") = upper('dim_products_v1')\n                )\n             or\n                (\n    \"table_schema\" ilike 'DEV_ALICE' and upper(\"table_schema\") = upper('DEV_ALICE')\n                    and\n    \"table_name\" ilike 'country_names' and upper(\"table_name\") = upper('country_names')\n                )\n             or\n                (\n    \"table_schema\" ilike 'DEV_ALICE' and upper(\"table_schema\") = upper('DEV_ALICE')\n                    and\n    \"table_name\" ilike 'dim_products_v2' and upper(\"table_name\") = upper('dim_products_v2')\n                )\n             or\n                (\n    \"table_schema\" ilike 'DEV_ALICE' and upper(\"table_schema\") = upper('DEV_ALICE')\n                    and\n    \"table_name\" ilike 'stg_brewline__order_items' and upper(\"table_name\") = upper('stg_brewline__order_items')\n                )\n             or\n                (\n    \"table_schema\" ilike 'DEV_ALICE' and upper(\"table_schema\") = upper('DEV_ALICE')\n                    and\n    \"table_name\" ilike 'dim_customers' and upper(\"table_name\") = upper('dim_customers')\n                )\n             or\n                (\n    \"table_schema\" ilike 'DEV_ALICE' and upper(\"table_schema\") = upper('DEV_ALICE')\n                    and\n    \"table_name\" ilike 'fct_orders' and upper(\"table_name\") = upper('fct_orders')\n                )\n             or\n                (\n    \"table_schema\" ilike 'DEV_ALICE' and upper(\"table_schema\") = upper('DEV_ALICE')\n                    and\n    \"table_name\" ilike 'stg_brewline__customers' and upper(\"table_name\") = upper('stg_brewline__customers')\n                )\n             or\n                (\n    \"table_schema\" ilike 'DEV_ALICE' and upper(\"table_schema\") = upper('DEV_ALICE')\n                    and\n    \"table_name\" ilike 'stg_brewline__orders' and upper(\"table_name\") = upper('stg_brewline__orders')\n                )\n             or\n                (\n    \"table_schema\" ilike 'DEV_ALICE' and upper(\"table_schema\") = upper('DEV_ALICE')\n                    and\n    \"table_name\" ilike 'int_orders__with_items' and upper(\"table_name\") = upper('int_orders__with_items')\n                )\n             or\n                (\n    \"table_schema\" ilike 'DEV_ALICE' and upper(\"table_schema\") = upper('DEV_ALICE')\n                    and\n    \"table_name\" ilike 'snap_customers' and upper(\"table_name\") = upper('snap_customers')\n                )\n             or\n                (\n    \"table_schema\" ilike 'DEV_ALICE' and upper(\"table_schema\") = upper('DEV_ALICE')\n                    and\n    \"table_name\" ilike 'stg_brewline__products' and upper(\"table_name\") = upper('stg_brewline__products')\n                )\n            )\n        ),\n        columns as (\n            select\n        table_catalog as \"table_database\",\n        table_schema as \"table_schema\",\n        table_name as \"table_name\",\n        column_name as \"column_name\",\n        ordinal_position as \"column_index\",\n        data_type as \"column_type\",\n        comment as \"column_comment\"\n    from BREWLINE_DEV.INFORMATION_SCHEMA.columns\n            where (\n                (\n    \"table_schema\" ilike 'DEV_ALICE' and upper(\"table_schema\") = upper('DEV_ALICE')\n                    and\n    \"table_name\" ilike 'fct_daily_revenue' and upper(\"table_name\") = upper('fct_daily_revenue')\n                )\n             or\n                (\n    \"table_schema\" ilike 'DEV_ALICE' and upper(\"table_schema\") = upper('DEV_ALICE')\n                    and\n    \"table_name\" ilike 'dim_products_v1' and upper(\"table_name\") = upper('dim_products_v1')\n                )\n             or\n                (\n    \"table_schema\" ilike 'DEV_ALICE' and upper(\"table_schema\") = upper('DEV_ALICE')\n                    and\n    \"table_name\" ilike 'country_names' and upper(\"table_name\") = upper('country_names')\n                )\n             or\n                (\n    \"table_schema\" ilike 'DEV_ALICE' and upper(\"table_schema\") = upper('DEV_ALICE')\n                    and\n    \"table_name\" ilike 'dim_products_v2' and upper(\"table_name\") = upper('dim_products_v2')\n                )\n             or\n                (\n    \"table_schema\" ilike 'DEV_ALICE' and upper(\"table_schema\") = upper('DEV_ALICE')\n                    and\n    \"table_name\" ilike 'stg_brewline__order_items' and upper(\"table_name\") = upper('stg_brewline__order_items')\n                )\n             or\n                (\n    \"table_schema\" ilike 'DEV_ALICE' and upper(\"table_schema\") = upper('DEV_ALICE')\n                    and\n    \"table_name\" ilike 'dim_customers' and upper(\"table_name\") = upper('dim_customers')\n                )\n             or\n                (\n    \"table_schema\" ilike 'DEV_ALICE' and upper(\"table_schema\") = upper('DEV_ALICE')\n                    and\n    \"table_name\" ilike 'fct_orders' and upper(\"table_name\") = upper('fct_orders')\n                )\n             or\n                (\n    \"table_schema\" ilike 'DEV_ALICE' and upper(\"table_schema\") = upper('DEV_ALICE')\n                    and\n    \"table_name\" ilike 'stg_brewline__customers' and upper(\"table_name\") = upper('stg_brewline__customers')\n                )\n             or\n                (\n    \"table_schema\" ilike 'DEV_ALICE' and upper(\"table_schema\") = upper('DEV_ALICE')\n                    and\n    \"table_name\" ilike 'stg_brewline__orders' and upper(\"table_name\") = upper('stg_brewline__orders')\n                )\n             or\n                (\n    \"table_schema\" ilike 'DEV_ALICE' and upper(\"table_schema\") = upper('DEV_ALICE')\n                    and\n    \"table_name\" ilike 'int_orders__with_items' and upper(\"table_name\") = upper('int_orders__with_items')\n                )\n             or\n                (\n    \"table_schema\" ilike 'DEV_ALICE' and upper(\"table_schema\") = upper('DEV_ALICE')\n                    and\n    \"table_name\" ilike 'snap_customers' and upper(\"table_name\") = upper('snap_customers')\n                )\n             or\n                (\n    \"table_schema\" ilike 'DEV_ALICE' and upper(\"table_schema\") = upper('DEV_ALICE')\n                    and\n    \"table_name\" ilike 'stg_brewline__products' and upper(\"table_name\") = upper('stg_brewline__products')\n                )\n            )\n        )\n        select *\n    from tables\n    join columns using (\"table_database\", \"table_schema\", \"table_name\")\n    order by \"column_index\""
   }
  ],
  "empty_run": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.stg_brewline__orders\"}",
    "kind": "ddl",
    "sql": "create or replace view BREWLINE_DEV.DEV_ALICE.stg_brewline__orders\n  as (\n    with source as (\n    select * from (select * from BREWLINE.raw.orders where false limit 0)\n),\nlatest as (\n    select *\n    from source\n    qualify row_number() over (partition by order_id order by _loaded_at desc) = 1\n)\nselect\n    order_id,\n    customer_id,\n    cast(order_ts as timestamp) as ordered_at,\n    upper(status) as order_status,\n    cast(total_usd as decimal(12, 2)) as order_total_usd,\n    _loaded_at as loaded_at\nfrom latest\n  )"
   }
  ],
  "freshness": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"source.brewline.brewline.orders\"}",
    "kind": "query",
    "sql": "select\n      max(_loaded_at) as max_loaded_at,\n      convert_timezone('UTC', current_timestamp()) as snapshotted_at\n    from BREWLINE.raw.orders"
   }
  ],
  "grants_revoke": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "ddl",
    "sql": "create or replace temporary view BREWLINE_DEV.DEV_ALICE.cfg_demo__dbt_tmp\n  as (\nselect customer_id, full_name, email, tier\nfrom BREWLINE_DEV.DEV_ALICE.stg_brewline__customers\n  )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "meta",
    "sql": "describe table BREWLINE_DEV.DEV_ALICE.cfg_demo__dbt_tmp"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "meta",
    "sql": "describe table BREWLINE_DEV.DEV_ALICE.cfg_demo"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "meta",
    "sql": "describe table \"BREWLINE_DEV\".\"DEV_ALICE\".\"CFG_DEMO\""
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "txn",
    "sql": "begin"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "dml",
    "sql": "merge into BREWLINE_DEV.DEV_ALICE.cfg_demo as DBT_INTERNAL_DEST\n        using BREWLINE_DEV.DEV_ALICE.cfg_demo__dbt_tmp as DBT_INTERNAL_SOURCE\n        on ((DBT_INTERNAL_SOURCE.customer_id = DBT_INTERNAL_DEST.customer_id))\n    when matched then update set\n        \"CUSTOMER_ID\" = DBT_INTERNAL_SOURCE.\"CUSTOMER_ID\",\"FULL_NAME\" = DBT_INTERNAL_SOURCE.\"FULL_NAME\",\"EMAIL\" = DBT_INTERNAL_SOURCE.\"EMAIL\",\"TIER\" = DBT_INTERNAL_SOURCE.\"TIER\"\n    when not matched then insert\n        (\"CUSTOMER_ID\", \"FULL_NAME\", \"EMAIL\", \"TIER\")\n    values\n        (\"CUSTOMER_ID\", \"FULL_NAME\", \"EMAIL\", \"TIER\")"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "txn",
    "sql": "commit"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "ddl",
    "sql": "drop view if exists BREWLINE_DEV.DEV_ALICE.cfg_demo__dbt_tmp cascade"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "meta",
    "sql": "show grants on BREWLINE_DEV.DEV_ALICE.cfg_demo"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "ddl",
    "sql": "revoke SELECT on BREWLINE_DEV.DEV_ALICE.cfg_demo from \"OLD_ANALYST\""
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "ddl",
    "sql": "grant select on BREWLINE_DEV.DEV_ALICE.cfg_demo to ANALYST"
   }
  ],
  "hook_grants": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.cfg_demo\"}",
    "kind": "ddl",
    "sql": "create or replace transient table BREWLINE_DEV.DEV_ALICE.cfg_demo\n    as (\nselect customer_id, full_name, email, tier\nfrom BREWLINE_DEV.DEV_ALICE.stg_brewline__customers\n    )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"master\"}",
    "kind": "ddl",
    "sql": "grant usage on schema BREWLINE_DEV.DEV_ALICE to role REPORTER"
   }
  ],
  "incr_append": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "ddl",
    "sql": "create or replace temporary view BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp\n  as (\nselect\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom BREWLINE_DEV.DEV_ALICE.int_orders__with_items\nwhere loaded_at > (select coalesce(max(loaded_at), timestamp '1900-01-01') from BREWLINE_DEV.DEV_ALICE.fct_orders)\n  )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table BREWLINE_DEV.DEV_ALICE.fct_orders"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table \"BREWLINE_DEV\".\"DEV_ALICE\".\"FCT_ORDERS\""
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table \"BREWLINE_DEV\".\"DEV_ALICE\".\"FCT_ORDERS\""
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "txn",
    "sql": "begin"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "dml",
    "sql": "insert into BREWLINE_DEV.DEV_ALICE.fct_orders (\"ORDER_ID\", \"CUSTOMER_ID\", \"ORDERED_AT\", \"ORDER_STATUS\", \"ORDER_TOTAL_USD\", \"ITEMS_TOTAL_USD\", \"IS_RECONCILED\", \"LOADED_AT\")\n    (\n        select \"ORDER_ID\", \"CUSTOMER_ID\", \"ORDERED_AT\", \"ORDER_STATUS\", \"ORDER_TOTAL_USD\", \"ITEMS_TOTAL_USD\", \"IS_RECONCILED\", \"LOADED_AT\"\n        from BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp\n    )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "txn",
    "sql": "commit"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "ddl",
    "sql": "drop view if exists BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp cascade"
   }
  ],
  "incr_delete_insert": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "ddl",
    "sql": "create or replace temporary table BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp\nas (\nselect\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom BREWLINE_DEV.DEV_ALICE.int_orders__with_items\nwhere loaded_at > (select coalesce(max(loaded_at), timestamp '1900-01-01') from BREWLINE_DEV.DEV_ALICE.fct_orders)\n    )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table BREWLINE_DEV.DEV_ALICE.fct_orders"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table \"BREWLINE_DEV\".\"DEV_ALICE\".\"FCT_ORDERS\""
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table \"BREWLINE_DEV\".\"DEV_ALICE\".\"FCT_ORDERS\""
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "txn",
    "sql": "begin"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "dml",
    "sql": "delete from BREWLINE_DEV.DEV_ALICE.fct_orders as DBT_INTERNAL_DEST\n        where (order_id) in (\n            select distinct order_id\n            from BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp as DBT_INTERNAL_SOURCE\n        )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "dml",
    "sql": "insert into BREWLINE_DEV.DEV_ALICE.fct_orders (\"ORDER_ID\", \"CUSTOMER_ID\", \"ORDERED_AT\", \"ORDER_STATUS\", \"ORDER_TOTAL_USD\", \"ITEMS_TOTAL_USD\", \"IS_RECONCILED\", \"LOADED_AT\")\n    (\n        select \"ORDER_ID\", \"CUSTOMER_ID\", \"ORDERED_AT\", \"ORDER_STATUS\", \"ORDER_TOTAL_USD\", \"ITEMS_TOTAL_USD\", \"IS_RECONCILED\", \"LOADED_AT\"\n        from BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp\n    )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "txn",
    "sql": "commit"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "ddl",
    "sql": "drop table if exists BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp cascade"
   }
  ],
  "incr_first_run": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"create_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "ddl",
    "sql": "create schema if not exists BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "ddl",
    "sql": "create or replace transient table BREWLINE_DEV.DEV_ALICE.fct_orders\n    as (\nselect\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom BREWLINE_DEV.DEV_ALICE.int_orders__with_items\n    )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "ddl",
    "sql": "drop view if exists BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp cascade"
   }
  ],
  "incr_full_refresh": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "ddl",
    "sql": "create or replace transient table BREWLINE_DEV.DEV_ALICE.fct_orders\n    as (\nselect\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom BREWLINE_DEV.DEV_ALICE.int_orders__with_items\n    )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "ddl",
    "sql": "drop view if exists BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp cascade"
   }
  ],
  "incr_merge": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "ddl",
    "sql": "create or replace temporary view BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp\n  as (\nselect\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom BREWLINE_DEV.DEV_ALICE.int_orders__with_items\nwhere loaded_at > (select coalesce(max(loaded_at), timestamp '1900-01-01') from BREWLINE_DEV.DEV_ALICE.fct_orders)\n  )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table BREWLINE_DEV.DEV_ALICE.fct_orders"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table \"BREWLINE_DEV\".\"DEV_ALICE\".\"FCT_ORDERS\""
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table \"BREWLINE_DEV\".\"DEV_ALICE\".\"FCT_ORDERS\""
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "txn",
    "sql": "begin"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "dml",
    "sql": "merge into BREWLINE_DEV.DEV_ALICE.fct_orders as DBT_INTERNAL_DEST\n        using BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp as DBT_INTERNAL_SOURCE\n        on ((DBT_INTERNAL_SOURCE.order_id = DBT_INTERNAL_DEST.order_id))\n    when matched then update set\n        \"ORDER_ID\" = DBT_INTERNAL_SOURCE.\"ORDER_ID\",\"CUSTOMER_ID\" = DBT_INTERNAL_SOURCE.\"CUSTOMER_ID\",\"ORDERED_AT\" = DBT_INTERNAL_SOURCE.\"ORDERED_AT\",\"ORDER_STATUS\" = DBT_INTERNAL_SOURCE.\"ORDER_STATUS\",\"ORDER_TOTAL_USD\" = DBT_INTERNAL_SOURCE.\"ORDER_TOTAL_USD\",\"ITEMS_TOTAL_USD\" = DBT_INTERNAL_SOURCE.\"ITEMS_TOTAL_USD\",\"IS_RECONCILED\" = DBT_INTERNAL_SOURCE.\"IS_RECONCILED\",\"LOADED_AT\" = DBT_INTERNAL_SOURCE.\"LOADED_AT\"\n    when not matched then insert\n        (\"ORDER_ID\", \"CUSTOMER_ID\", \"ORDERED_AT\", \"ORDER_STATUS\", \"ORDER_TOTAL_USD\", \"ITEMS_TOTAL_USD\", \"IS_RECONCILED\", \"LOADED_AT\")\n    values\n        (\"ORDER_ID\", \"CUSTOMER_ID\", \"ORDERED_AT\", \"ORDER_STATUS\", \"ORDER_TOTAL_USD\", \"ITEMS_TOTAL_USD\", \"IS_RECONCILED\", \"LOADED_AT\")"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "txn",
    "sql": "commit"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "ddl",
    "sql": "drop view if exists BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp cascade"
   }
  ],
  "incr_merge_columns": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "ddl",
    "sql": "create or replace temporary view BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp\n  as (\nselect\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom BREWLINE_DEV.DEV_ALICE.int_orders__with_items\nwhere loaded_at > (select coalesce(max(loaded_at), timestamp '1900-01-01') from BREWLINE_DEV.DEV_ALICE.fct_orders)\n  )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table BREWLINE_DEV.DEV_ALICE.fct_orders"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table \"BREWLINE_DEV\".\"DEV_ALICE\".\"FCT_ORDERS\""
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table \"BREWLINE_DEV\".\"DEV_ALICE\".\"FCT_ORDERS\""
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "txn",
    "sql": "begin"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "dml",
    "sql": "merge into BREWLINE_DEV.DEV_ALICE.fct_orders as DBT_INTERNAL_DEST\n        using BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp as DBT_INTERNAL_SOURCE\n        on ((DBT_INTERNAL_SOURCE.order_id = DBT_INTERNAL_DEST.order_id))\n    when matched then update set\n        order_status = DBT_INTERNAL_SOURCE.order_status,order_total_usd = DBT_INTERNAL_SOURCE.order_total_usd,loaded_at = DBT_INTERNAL_SOURCE.loaded_at\n    when not matched then insert\n        (\"ORDER_ID\", \"CUSTOMER_ID\", \"ORDERED_AT\", \"ORDER_STATUS\", \"ORDER_TOTAL_USD\", \"ITEMS_TOTAL_USD\", \"IS_RECONCILED\", \"LOADED_AT\")\n    values\n        (\"ORDER_ID\", \"CUSTOMER_ID\", \"ORDERED_AT\", \"ORDER_STATUS\", \"ORDER_TOTAL_USD\", \"ITEMS_TOTAL_USD\", \"IS_RECONCILED\", \"LOADED_AT\")"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "txn",
    "sql": "commit"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "ddl",
    "sql": "drop view if exists BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp cascade"
   }
  ],
  "incr_merge_nokey": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "ddl",
    "sql": "create or replace temporary view BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp\n  as (\nselect\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom BREWLINE_DEV.DEV_ALICE.int_orders__with_items\nwhere loaded_at > (select coalesce(max(loaded_at), timestamp '1900-01-01') from BREWLINE_DEV.DEV_ALICE.fct_orders)\n  )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table BREWLINE_DEV.DEV_ALICE.fct_orders"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table \"BREWLINE_DEV\".\"DEV_ALICE\".\"FCT_ORDERS\""
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table \"BREWLINE_DEV\".\"DEV_ALICE\".\"FCT_ORDERS\""
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "txn",
    "sql": "begin"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "dml",
    "sql": "insert into BREWLINE_DEV.DEV_ALICE.fct_orders (\"ORDER_ID\", \"CUSTOMER_ID\", \"ORDERED_AT\", \"ORDER_STATUS\", \"ORDER_TOTAL_USD\", \"ITEMS_TOTAL_USD\", \"IS_RECONCILED\", \"LOADED_AT\")\n        (\n            select \"ORDER_ID\", \"CUSTOMER_ID\", \"ORDERED_AT\", \"ORDER_STATUS\", \"ORDER_TOTAL_USD\", \"ITEMS_TOTAL_USD\", \"IS_RECONCILED\", \"LOADED_AT\"\n            from BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp\n        )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "txn",
    "sql": "commit"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "ddl",
    "sql": "drop view if exists BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp cascade"
   }
  ],
  "incr_microbatch": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "ddl",
    "sql": "create or replace temporary view BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp_20260317\n  as (\nselect\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom (select * from BREWLINE_DEV.DEV_ALICE.int_orders__with_items where ordered_at >= to_timestamp_tz('2026-03-17 00:00:00+00:00') and ordered_at < to_timestamp_tz('2026-03-18 00:00:00+00:00'))\n  )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp_20260317"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table BREWLINE_DEV.DEV_ALICE.fct_orders"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table \"BREWLINE_DEV\".\"DEV_ALICE\".\"FCT_ORDERS\""
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "dml",
    "sql": "delete from BREWLINE_DEV.DEV_ALICE.fct_orders DBT_INTERNAL_TARGET\n    where (\n    DBT_INTERNAL_TARGET.ordered_at >= to_timestamp_tz('2026-03-17 00:00:00+00:00')\n    and DBT_INTERNAL_TARGET.ordered_at < to_timestamp_tz('2026-03-18 00:00:00+00:00')\n    )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "dml",
    "sql": "insert into BREWLINE_DEV.DEV_ALICE.fct_orders (\"ORDER_ID\", \"CUSTOMER_ID\", \"ORDERED_AT\", \"ORDER_STATUS\", \"ORDER_TOTAL_USD\", \"ITEMS_TOTAL_USD\", \"IS_RECONCILED\", \"LOADED_AT\")\n    (\n        select \"ORDER_ID\", \"CUSTOMER_ID\", \"ORDERED_AT\", \"ORDER_STATUS\", \"ORDER_TOTAL_USD\", \"ITEMS_TOTAL_USD\", \"IS_RECONCILED\", \"LOADED_AT\"\n        from BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp_20260317\n    )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "ddl",
    "sql": "drop view if exists BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp_20260317 cascade"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "ddl",
    "sql": "create or replace temporary view BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp_20260318\n  as (\nselect\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom (select * from BREWLINE_DEV.DEV_ALICE.int_orders__with_items where ordered_at >= to_timestamp_tz('2026-03-18 00:00:00+00:00') and ordered_at < to_timestamp_tz('2026-03-19 00:00:00+00:00'))\n  )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp_20260318"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table BREWLINE_DEV.DEV_ALICE.fct_orders"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table \"BREWLINE_DEV\".\"DEV_ALICE\".\"FCT_ORDERS\""
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "dml",
    "sql": "delete from BREWLINE_DEV.DEV_ALICE.fct_orders DBT_INTERNAL_TARGET\n    where (\n    DBT_INTERNAL_TARGET.ordered_at >= to_timestamp_tz('2026-03-18 00:00:00+00:00')\n    and DBT_INTERNAL_TARGET.ordered_at < to_timestamp_tz('2026-03-19 00:00:00+00:00')\n    )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "dml",
    "sql": "insert into BREWLINE_DEV.DEV_ALICE.fct_orders (\"ORDER_ID\", \"CUSTOMER_ID\", \"ORDERED_AT\", \"ORDER_STATUS\", \"ORDER_TOTAL_USD\", \"ITEMS_TOTAL_USD\", \"IS_RECONCILED\", \"LOADED_AT\")\n    (\n        select \"ORDER_ID\", \"CUSTOMER_ID\", \"ORDERED_AT\", \"ORDER_STATUS\", \"ORDER_TOTAL_USD\", \"ITEMS_TOTAL_USD\", \"IS_RECONCILED\", \"LOADED_AT\"\n        from BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp_20260318\n    )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "ddl",
    "sql": "drop view if exists BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp_20260318 cascade"
   }
  ],
  "incr_predicates": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "ddl",
    "sql": "create or replace temporary view BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp\n  as (\nselect\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom BREWLINE_DEV.DEV_ALICE.int_orders__with_items\nwhere loaded_at > (select coalesce(max(loaded_at), timestamp '1900-01-01') from BREWLINE_DEV.DEV_ALICE.fct_orders)\n  )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table BREWLINE_DEV.DEV_ALICE.fct_orders"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table \"BREWLINE_DEV\".\"DEV_ALICE\".\"FCT_ORDERS\""
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table \"BREWLINE_DEV\".\"DEV_ALICE\".\"FCT_ORDERS\""
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "txn",
    "sql": "begin"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "dml",
    "sql": "merge into BREWLINE_DEV.DEV_ALICE.fct_orders as DBT_INTERNAL_DEST\n        using BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp as DBT_INTERNAL_SOURCE\n        on (DBT_INTERNAL_DEST.ordered_at >= dateadd(day, -7, current_date)) and ((DBT_INTERNAL_SOURCE.order_id = DBT_INTERNAL_DEST.order_id))\n    when matched then update set\n        \"ORDER_ID\" = DBT_INTERNAL_SOURCE.\"ORDER_ID\",\"CUSTOMER_ID\" = DBT_INTERNAL_SOURCE.\"CUSTOMER_ID\",\"ORDERED_AT\" = DBT_INTERNAL_SOURCE.\"ORDERED_AT\",\"ORDER_STATUS\" = DBT_INTERNAL_SOURCE.\"ORDER_STATUS\",\"ORDER_TOTAL_USD\" = DBT_INTERNAL_SOURCE.\"ORDER_TOTAL_USD\",\"ITEMS_TOTAL_USD\" = DBT_INTERNAL_SOURCE.\"ITEMS_TOTAL_USD\",\"IS_RECONCILED\" = DBT_INTERNAL_SOURCE.\"IS_RECONCILED\",\"LOADED_AT\" = DBT_INTERNAL_SOURCE.\"LOADED_AT\"\n    when not matched then insert\n        (\"ORDER_ID\", \"CUSTOMER_ID\", \"ORDERED_AT\", \"ORDER_STATUS\", \"ORDER_TOTAL_USD\", \"ITEMS_TOTAL_USD\", \"IS_RECONCILED\", \"LOADED_AT\")\n    values\n        (\"ORDER_ID\", \"CUSTOMER_ID\", \"ORDERED_AT\", \"ORDER_STATUS\", \"ORDER_TOTAL_USD\", \"ITEMS_TOTAL_USD\", \"IS_RECONCILED\", \"LOADED_AT\")"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "txn",
    "sql": "commit"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "ddl",
    "sql": "drop view if exists BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp cascade"
   }
  ],
  "incr_schema_append": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "ddl",
    "sql": "create or replace temporary view BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp\n  as (\nselect\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom BREWLINE_DEV.DEV_ALICE.int_orders__with_items\nwhere loaded_at > (select coalesce(max(loaded_at), timestamp '1900-01-01') from BREWLINE_DEV.DEV_ALICE.fct_orders)\n  )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table BREWLINE_DEV.DEV_ALICE.fct_orders"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "meta",
    "sql": "describe table \"BREWLINE_DEV\".\"DEV_ALICE\".\"FCT_ORDERS\""
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "ddl",
    "sql": "alter  table \"BREWLINE_DEV\".\"DEV_ALICE\".\"FCT_ORDERS\" add column\n            \"IS_CANCELLED\"\n    BOOLEAN"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "txn",
    "sql": "begin"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "dml",
    "sql": "merge into BREWLINE_DEV.DEV_ALICE.fct_orders as DBT_INTERNAL_DEST\n        using BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp as DBT_INTERNAL_SOURCE\n        on ((DBT_INTERNAL_SOURCE.order_id = DBT_INTERNAL_DEST.order_id))\n    when matched then update set\n        \"ORDER_ID\" = DBT_INTERNAL_SOURCE.\"ORDER_ID\",\"CUSTOMER_ID\" = DBT_INTERNAL_SOURCE.\"CUSTOMER_ID\",\"ORDERED_AT\" = DBT_INTERNAL_SOURCE.\"ORDERED_AT\",\"ORDER_STATUS\" = DBT_INTERNAL_SOURCE.\"ORDER_STATUS\",\"ORDER_TOTAL_USD\" = DBT_INTERNAL_SOURCE.\"ORDER_TOTAL_USD\",\"ITEMS_TOTAL_USD\" = DBT_INTERNAL_SOURCE.\"ITEMS_TOTAL_USD\",\"IS_RECONCILED\" = DBT_INTERNAL_SOURCE.\"IS_RECONCILED\",\"LOADED_AT\" = DBT_INTERNAL_SOURCE.\"LOADED_AT\",\"IS_CANCELLED\" = DBT_INTERNAL_SOURCE.\"IS_CANCELLED\"\n    when not matched then insert\n        (\"ORDER_ID\", \"CUSTOMER_ID\", \"ORDERED_AT\", \"ORDER_STATUS\", \"ORDER_TOTAL_USD\", \"ITEMS_TOTAL_USD\", \"IS_RECONCILED\", \"LOADED_AT\", \"IS_CANCELLED\")\n    values\n        (\"ORDER_ID\", \"CUSTOMER_ID\", \"ORDERED_AT\", \"ORDER_STATUS\", \"ORDER_TOTAL_USD\", \"ITEMS_TOTAL_USD\", \"IS_RECONCILED\", \"LOADED_AT\", \"IS_CANCELLED\")"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "txn",
    "sql": "commit"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "ddl",
    "sql": "drop view if exists BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp cascade"
   }
  ],
  "parse_only": [],
  "python_model": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.py_customer_revenue\"}",
    "kind": "query",
    "sql": "WITH py_customer_revenue__dbt_sp AS PROCEDURE ()\nRETURNS STRING\nLANGUAGE PYTHON\nRUNTIME_VERSION = '3.10'\nPACKAGES = ('snowflake-snowpark-python')\nHANDLER = 'main'\nEXECUTE AS CALLER\nAS\n$$\nimport snowflake.snowpark.functions as F\ndef model(dbt, session):\n    dbt.config(materialized=\"table\")\n    orders = dbt.ref(\"stg_brewline__orders\")\n    kept = orders.filter(F.col(\"ORDER_STATUS\") != \"CANCELLED\")\n    return kept.group_by(\"CUSTOMER_ID\").agg(\n        F.count(\"ORDER_ID\").alias(\"ORDERS\"),\n        F.sum(\"ORDER_TOTAL_USD\").alias(\"REVENUE_USD\"),\n    )\n# This part is user provided model code\n# you will need to copy the next section to run the code\n# COMMAND ----------\n# this part is dbt logic for get ref work, do not modify\ndef ref(*args, **kwargs):\n    refs = {\"stg_brewline__orders\": \"BREWLINE_DEV.DEV_ALICE.stg_brewline__orders\"}\n    key = '.'.join(args)\n    version = kwargs.get(\"v\") or kwargs.get(\"version\")\n    if version:\n        key += f\".v{version}\"\n    dbt_load_df_function = kwargs.get(\"dbt_load_df_function\")\n    return dbt_load_df_function(refs[key])\ndef source(*args, dbt_load_df_function):\n    sources = {}\n    key = '.'.join(args)\n    return dbt_load_df_function(sources[key])\nconfig_dict = {}\nmeta_dict = {}\nclass config:\n    def __init__(self, *args, **kwargs):\n        pass\n    @staticmethod\n    def get(key, default=None):\n        return config_dict.get(key, default)\n    @staticmethod\n    def meta_get(key, default=None):\n        return meta_dict.get(key, default)\nclass this:\n    \"\"\"dbt.this() or dbt.this.identifier\"\"\"\n    database = \"BREWLINE_DEV\"\n    schema = \"DEV_ALICE\"\n    identifier = \"py_customer_revenue\"\n    def __repr__(self):\n        return 'BREWLINE_DEV.DEV_ALICE.py_customer_revenue'\nclass dbtObj:\n    def __init__(self, load_df_function) -> None:\n        self.source = lambda *args: source(*args, dbt_load_df_function=load_df_function)\n        self.ref = lambda *args, **kwargs: ref(*args, **kwargs, dbt_load_df_function=load_df_function)\n        self.config = config\n        self.this = this()\n        self.is_incremental = False\n# COMMAND ----------\ndef materialize(session, df, target_relation):\n    # make sure pandas exists\n    import importlib.util\n    package_name = 'pandas'\n    if importlib.util.find_spec(package_name):\n        import pandas\n        if isinstance(df, pandas.core.frame.DataFrame):\n            session.use_database(target_relation.database)\n            session.use_schema(target_relation.schema)\n            # session.write_pandas does not have overwrite function\n            df = session.createDataFrame(df)\n    df.write.mode(\"overwrite\").save_as_table('BREWLINE_DEV.DEV_ALICE.py_customer_revenue', table_type='transient')\ndef main(session):\n    dbt = dbtObj(session.table)\n    df = model(dbt, session)\n    materialize(session, df, dbt.this)\n    return \"OK\"\n$$\nCALL py_customer_revenue__dbt_sp()"
   }
  ],
  "run_all_dev": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"create_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "ddl",
    "sql": "create schema if not exists BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.stg_brewline__orders\"}",
    "kind": "ddl",
    "sql": "create or replace view BREWLINE_DEV.DEV_ALICE.stg_brewline__orders\n  as (\n    with source as (\n    select * from BREWLINE.raw.orders\n),\nlatest as (\n    select *\n    from source\n    qualify row_number() over (partition by order_id order by _loaded_at desc) = 1\n)\nselect\n    order_id,\n    customer_id,\n    cast(order_ts as timestamp) as ordered_at,\n    upper(status) as order_status,\n    cast(total_usd as decimal(12, 2)) as order_total_usd,\n    _loaded_at as loaded_at\nfrom latest\n  )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.stg_brewline__products\"}",
    "kind": "ddl",
    "sql": "create or replace view BREWLINE_DEV.DEV_ALICE.stg_brewline__products\n  as (\n    select\n    product_id,\n    name as product_name,\n    category,\n    cast(price_usd as decimal(12, 2)) as list_price_usd\nfrom BREWLINE.raw.products\n  )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.stg_brewline__order_items\"}",
    "kind": "ddl",
    "sql": "create or replace view BREWLINE_DEV.DEV_ALICE.stg_brewline__order_items\n  as (\n    select\n    order_id,\n    line_no,\n    product_id,\n    cast(qty as integer) as quantity,\n    cast(unit_price as decimal(12, 2)) as unit_price_usd,\n    cast(qty as integer) * cast(unit_price as decimal(12, 2)) as line_total_usd\nfrom BREWLINE.raw.order_items\n  )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.stg_brewline__customers\"}",
    "kind": "ddl",
    "sql": "create or replace view BREWLINE_DEV.DEV_ALICE.stg_brewline__customers\n  as (\n    select\n    customer_id,\n    full_name,\n    lower(email) as email,\n    upper(country) as country_code,\n    tier\nfrom BREWLINE.raw.customers\n  )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.int_orders__with_items\"}",
    "kind": "ddl",
    "sql": "create or replace view BREWLINE_DEV.DEV_ALICE.int_orders__with_items\n  as (\n    with items as (\n    select\n        order_id,\n        count(*) as item_lines,\n        sum(quantity) as units,\n        sum(line_total_usd) as items_total_usd\n    from BREWLINE_DEV.DEV_ALICE.stg_brewline__order_items\n    group by order_id\n)\nselect\n    o.order_id,\n    o.customer_id,\n    o.ordered_at,\n    o.order_status,\n    o.order_total_usd,\n    o.loaded_at,\n    coalesce(i.item_lines, 0) as item_lines,\n    coalesce(i.units, 0) as units,\n    coalesce(i.items_total_usd, 0) as items_total_usd\nfrom BREWLINE_DEV.DEV_ALICE.stg_brewline__orders as o\nleft join items as i on i.order_id = o.order_id\n  )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.dim_products.v2\"}",
    "kind": "ddl",
    "sql": "create or replace transient table BREWLINE_DEV.DEV_ALICE.dim_products_v2\n    as (select\n    md5(cast(coalesce(cast(product_id as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as product_key,\n    product_id,\n    product_name,\n    category,\n    list_price_usd as price_usd,\n    case when list_price_usd >= 30 then 'premium' else 'standard' end as price_band\nfrom BREWLINE_DEV.DEV_ALICE.stg_brewline__products\n    )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.dim_customers\"}",
    "kind": "ddl",
    "sql": "create or replace transient table BREWLINE_DEV.DEV_ALICE.dim_customers\n    as (with customers as (\n    select * from BREWLINE_DEV.DEV_ALICE.stg_brewline__customers\n),\ncountries as (\n    select * from BREWLINE_DEV.DEV_ALICE.country_names\n),\norders as (\n    select\n        customer_id,\n        count(*) as orders_count,\n        min(ordered_at) as first_order_at\n    from BREWLINE_DEV.DEV_ALICE.stg_brewline__orders\n    where order_status <> 'CANCELLED'\n    group by customer_id\n)\nselect\n    md5(cast(coalesce(cast(c.customer_id as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as customer_key,\n    c.customer_id,\n    c.full_name,\n    c.email,\n    c.country_code,\n    n.country_name,\n    c.tier,\n    coalesce(o.orders_count, 0) as orders_count,\n    o.first_order_at\nfrom customers as c\nleft join countries as n on n.country_code = c.country_code\nleft join orders as o on o.customer_id = c.customer_id\n    )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.dim_products.v1\"}",
    "kind": "ddl",
    "sql": "create or replace transient table BREWLINE_DEV.DEV_ALICE.dim_products_v1\n    as (select\n    md5(cast(coalesce(cast(product_id as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as product_key,\n    product_id,\n    product_name,\n    category,\n    list_price_usd\nfrom BREWLINE_DEV.DEV_ALICE.stg_brewline__products\n    )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "ddl",
    "sql": "create or replace transient table BREWLINE_DEV.DEV_ALICE.fct_orders\n    as (\nselect\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom BREWLINE_DEV.DEV_ALICE.int_orders__with_items\n    )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_orders\"}",
    "kind": "ddl",
    "sql": "drop view if exists BREWLINE_DEV.DEV_ALICE.fct_orders__dbt_tmp cascade"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_daily_revenue\"}",
    "kind": "query",
    "sql": "select * from (\n        select\n    cast(ordered_at as date) as order_date,\n    count(*) as orders,\n    sum(order_total_usd) as revenue_usd\nfrom BREWLINE_DEV.DEV_ALICE.fct_orders\nwhere order_status <> 'CANCELLED'\ngroup by 1\n    ) as __dbt_sbq\n    where false\n    limit 0"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_daily_revenue\"}",
    "kind": "query",
    "sql": "select * from (\n        select\n    cast(null as date)\n     as order_date,\n    cast(null as bigint)\n     as orders,\n    cast(null as decimal(38, 2))\n     as revenue_usd\n    ) as __dbt_sbq\n    where false\n    limit 0"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"model.brewline.fct_daily_revenue\"}",
    "kind": "ddl",
    "sql": "create or replace transient table BREWLINE_DEV.DEV_ALICE.fct_daily_revenue\n  (\n    order_date date not null,\n    orders bigint,\n    revenue_usd decimal(38, 2)\n    )\n    as (\n    select order_date, orders, revenue_usd\n    from (\n        select\n    cast(ordered_at as date) as order_date,\n    count(*) as orders,\n    sum(order_total_usd) as revenue_usd\nfrom BREWLINE_DEV.DEV_ALICE.fct_orders\nwhere order_status <> 'CANCELLED'\ngroup by 1\n    ) as model_subq\n    )"
   }
  ],
  "run_two_ci": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"ci\", \"connection_name\": \"list_BREWLINE_CI\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_CI\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"ci\", \"connection_name\": \"create_BREWLINE_CI_PR_123\"}",
    "kind": "ddl",
    "sql": "create schema if not exists BREWLINE_CI.PR_123"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"ci\", \"connection_name\": \"list_BREWLINE_CI_PR_123\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_CI.PR_123\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"ci\", \"connection_name\": \"list_BREWLINE_CI_PR_123\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_CI.PR_123"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"ci\", \"node_id\": \"model.brewline.stg_brewline__customers\"}",
    "kind": "ddl",
    "sql": "create or replace view BREWLINE_CI.PR_123.stg_brewline__customers\n  as (\n    select\n    customer_id,\n    full_name,\n    lower(email) as email,\n    upper(country) as country_code,\n    tier\nfrom BREWLINE.raw.customers\n  )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"ci\", \"node_id\": \"model.brewline.dim_customers\"}",
    "kind": "ddl",
    "sql": "create or replace transient table BREWLINE_CI.PR_123.dim_customers\n    as (with customers as (\n    select * from BREWLINE_CI.PR_123.stg_brewline__customers\n),\ncountries as (\n    select * from BREWLINE_CI.PR_123.country_names\n),\norders as (\n    select\n        customer_id,\n        count(*) as orders_count,\n        min(ordered_at) as first_order_at\n    from BREWLINE_CI.PR_123.stg_brewline__orders\n    where order_status <> 'CANCELLED'\n    group by customer_id\n)\nselect\n    md5(cast(coalesce(cast(c.customer_id as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as customer_key,\n    c.customer_id,\n    c.full_name,\n    c.email,\n    c.country_code,\n    n.country_name,\n    c.tier,\n    coalesce(o.orders_count, 0) as orders_count,\n    o.first_order_at\nfrom customers as c\nleft join countries as n on n.country_code = c.country_code\nleft join orders as o on o.customer_id = c.customer_id\n    )"
   }
  ],
  "run_two_prod": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"prod\", \"connection_name\": \"list_BREWLINE\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"prod\", \"connection_name\": \"list_BREWLINE\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"prod\", \"connection_name\": \"create_BREWLINE_marts\"}",
    "kind": "ddl",
    "sql": "create schema if not exists BREWLINE.marts"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"prod\", \"connection_name\": \"create_BREWLINE_staging\"}",
    "kind": "ddl",
    "sql": "create schema if not exists BREWLINE.staging"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"prod\", \"connection_name\": \"list_BREWLINE_reference\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE.reference\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"prod\", \"connection_name\": \"list_BREWLINE_intermediate\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE.intermediate\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"prod\", \"connection_name\": \"list_BREWLINE_snapshots\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE.snapshots\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"prod\", \"connection_name\": \"list_BREWLINE_marts\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE.marts\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"prod\", \"connection_name\": \"list_BREWLINE_staging\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE.staging\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"prod\", \"connection_name\": \"list_BREWLINE_marts\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE.marts"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"prod\", \"connection_name\": \"list_BREWLINE_staging\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE.staging"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"prod\", \"node_id\": \"model.brewline.stg_brewline__customers\"}",
    "kind": "ddl",
    "sql": "create or replace view BREWLINE.staging.stg_brewline__customers\n  as (\n    select\n    customer_id,\n    full_name,\n    lower(email) as email,\n    upper(country) as country_code,\n    tier\nfrom BREWLINE.raw.customers\n  )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"prod\", \"node_id\": \"model.brewline.dim_customers\"}",
    "kind": "ddl",
    "sql": "create or replace transient table BREWLINE.marts.dim_customers\n    as (with customers as (\n    select * from BREWLINE.staging.stg_brewline__customers\n),\ncountries as (\n    select * from BREWLINE.reference.country_names\n),\norders as (\n    select\n        customer_id,\n        count(*) as orders_count,\n        min(ordered_at) as first_order_at\n    from BREWLINE.staging.stg_brewline__orders\n    where order_status <> 'CANCELLED'\n    group by customer_id\n)\nselect\n    md5(cast(coalesce(cast(c.customer_id as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as customer_key,\n    c.customer_id,\n    c.full_name,\n    c.email,\n    c.country_code,\n    n.country_name,\n    c.tier,\n    coalesce(o.orders_count, 0) as orders_count,\n    o.first_order_at\nfrom customers as c\nleft join countries as n on n.country_code = c.country_code\nleft join orders as o on o.customer_id = c.customer_id\n    )"
   }
  ],
  "seed_dev": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"seed.brewline.country_names\"}",
    "kind": "ddl",
    "sql": "create transient table BREWLINE_DEV.DEV_ALICE.country_names (country_code text,country_name text)"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"seed.brewline.country_names\"}",
    "kind": "txn",
    "sql": "begin"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"seed.brewline.country_names\"}",
    "kind": "dml",
    "sql": "insert overwrite into BREWLINE_DEV.DEV_ALICE.country_names (country_code, country_name) values\n            (%s,%s),(%s,%s),(%s,%s),(%s,%s)"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"seed.brewline.country_names\"}",
    "kind": "txn",
    "sql": "commit"
   }
  ],
  "snapshot_first": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"snapshot.brewline.snap_customers\"}",
    "kind": "query",
    "sql": "select * from (\n    select *,\n        md5(coalesce(cast(customer_id as varchar ), '')\n         || '|' || coalesce(cast(_loaded_at as varchar ), '')\n        ) as dbt_scd_id,\n        _loaded_at as dbt_updated_at,\n        _loaded_at as dbt_valid_from,\n  coalesce(nullif(_loaded_at, _loaded_at), null)\n  as dbt_valid_to\nfrom (\n        select * from BREWLINE.raw.customers\n    ) sbq\n    ) as __dbt_sbq\n    where false\n    limit 0"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"snapshot.brewline.snap_customers\"}",
    "kind": "query",
    "sql": "select * from (\n        select to_timestamp_ntz(convert_timezone('UTC', current_timestamp())) as dbt_snapshot_time\n    ) as __dbt_sbq\n    where false\n    limit 0"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"snapshot.brewline.snap_customers\"}",
    "kind": "ddl",
    "sql": "create or replace transient table BREWLINE_DEV.DEV_ALICE.snap_customers\n    as (\n    select *,\n        md5(coalesce(cast(customer_id as varchar ), '')\n         || '|' || coalesce(cast(_loaded_at as varchar ), '')\n        ) as dbt_scd_id,\n        _loaded_at as dbt_updated_at,\n        _loaded_at as dbt_valid_from,\n  coalesce(nullif(_loaded_at, _loaded_at), null)\n  as dbt_valid_to\nfrom (\n        select * from BREWLINE.raw.customers\n    ) sbq\n    )"
   }
  ],
  "snapshot_permanent": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"create_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "ddl",
    "sql": "create schema if not exists BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"snapshot.brewline.snap_customers\"}",
    "kind": "query",
    "sql": "select * from (\n    select *,\n        md5(coalesce(cast(customer_id as varchar ), '')\n         || '|' || coalesce(cast(_loaded_at as varchar ), '')\n        ) as dbt_scd_id,\n        _loaded_at as dbt_updated_at,\n        _loaded_at as dbt_valid_from,\n  coalesce(nullif(_loaded_at, _loaded_at), null)\n  as dbt_valid_to\nfrom (\n        select * from BREWLINE.raw.customers\n    ) sbq\n    ) as __dbt_sbq\n    where false\n    limit 0"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"snapshot.brewline.snap_customers\"}",
    "kind": "query",
    "sql": "select * from (\n        select to_timestamp_ntz(convert_timezone('UTC', current_timestamp())) as dbt_snapshot_time\n    ) as __dbt_sbq\n    where false\n    limit 0"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"snapshot.brewline.snap_customers\"}",
    "kind": "ddl",
    "sql": "create or replace table BREWLINE_DEV.DEV_ALICE.snap_customers\n    as (\n    select *,\n        md5(coalesce(cast(customer_id as varchar ), '')\n         || '|' || coalesce(cast(_loaded_at as varchar ), '')\n        ) as dbt_scd_id,\n        _loaded_at as dbt_updated_at,\n        _loaded_at as dbt_valid_from,\n  coalesce(nullif(_loaded_at, _loaded_at), null)\n  as dbt_valid_to\nfrom (\n        select * from BREWLINE.raw.customers\n    ) sbq\n    )"
   }
  ],
  "snapshot_second": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV\"}",
    "kind": "meta",
    "sql": "show terse schemas in database BREWLINE_DEV\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"snapshot.brewline.snap_customers\"}",
    "kind": "meta",
    "sql": "describe table \"BREWLINE_DEV\".\"DEV_ALICE\".\"SNAP_CUSTOMERS\""
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"snapshot.brewline.snap_customers\"}",
    "kind": "ddl",
    "sql": "create or replace temporary table \"BREWLINE_DEV\".\"DEV_ALICE\".\"SNAP_CUSTOMERS__dbt_tmp\"\nas (\n    with snapshot_query as (\n        select * from BREWLINE.raw.customers\n    ),\n    snapshotted_data as (\n        select *,\n        customer_id as dbt_unique_key\n        from \"BREWLINE_DEV\".\"DEV_ALICE\".\"SNAP_CUSTOMERS\"\n        where\n                dbt_valid_to is null\n    ),\n    insertions_source_data as (\n        select *,\n        customer_id as dbt_unique_key\n,\n            _loaded_at as dbt_updated_at,\n            _loaded_at as dbt_valid_from,\n  coalesce(nullif(_loaded_at, _loaded_at), null)\n  as dbt_valid_to\n,\n            md5(coalesce(cast(customer_id as varchar ), '')\n         || '|' || coalesce(cast(_loaded_at as varchar ), '')\n        ) as dbt_scd_id\n        from snapshot_query\n    ),\n    updates_source_data as (\n        select *,\n        customer_id as dbt_unique_key\n,\n            _loaded_at as dbt_updated_at,\n            _loaded_at as dbt_valid_from,\n            _loaded_at as dbt_valid_to\n        from snapshot_query\n    ),\n    insertions as (\n        select\n            'insert' as dbt_change_type,\n            source_data.*\n        from insertions_source_data as source_data\n        left outer join snapshotted_data\n            on\n        snapshotted_data.dbt_unique_key = source_data.dbt_unique_key\n            where\n        snapshotted_data.dbt_unique_key is null\n            or (\n        snapshotted_data.dbt_unique_key is not null\n and (\n               (snapshotted_data.dbt_valid_from < source_data._loaded_at)\n            )\n        )\n    ),\n    updates as (\n        select\n            'update' as dbt_change_type,\n            source_data.*,\n            snapshotted_data.dbt_scd_id\n        from updates_source_data as source_data\n        join snapshotted_data\n            on\n        snapshotted_data.dbt_unique_key = source_data.dbt_unique_key\n        where (\n            (snapshotted_data.dbt_valid_from < source_data._loaded_at)\n        )\n    )\n    select * from insertions\n    union all\n    select * from updates\n    )"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"snapshot.brewline.snap_customers\"}",
    "kind": "meta",
    "sql": "describe table \"BREWLINE_DEV\".\"DEV_ALICE\".\"SNAP_CUSTOMERS__dbt_tmp\""
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"snapshot.brewline.snap_customers\"}",
    "kind": "meta",
    "sql": "describe table \"BREWLINE_DEV\".\"DEV_ALICE\".\"SNAP_CUSTOMERS\""
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"snapshot.brewline.snap_customers\"}",
    "kind": "meta",
    "sql": "describe table \"BREWLINE_DEV\".\"DEV_ALICE\".\"SNAP_CUSTOMERS__dbt_tmp\""
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"snapshot.brewline.snap_customers\"}",
    "kind": "meta",
    "sql": "describe table \"BREWLINE_DEV\".\"DEV_ALICE\".\"SNAP_CUSTOMERS\""
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"snapshot.brewline.snap_customers\"}",
    "kind": "meta",
    "sql": "describe table \"BREWLINE_DEV\".\"DEV_ALICE\".\"SNAP_CUSTOMERS__dbt_tmp\""
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"snapshot.brewline.snap_customers\"}",
    "kind": "query",
    "sql": "select * from (\n    with snapshot_query as (\n        select * from BREWLINE.raw.customers\n    ),\n    snapshotted_data as (\n        select *,\n        customer_id as dbt_unique_key\n        from \"BREWLINE_DEV\".\"DEV_ALICE\".\"SNAP_CUSTOMERS\"\n        where\n                dbt_valid_to is null\n    ),\n    insertions_source_data as (\n        select *,\n        customer_id as dbt_unique_key\n,\n            _loaded_at as dbt_updated_at,\n            _loaded_at as dbt_valid_from,\n  coalesce(nullif(_loaded_at, _loaded_at), null)\n  as dbt_valid_to\n,\n            md5(coalesce(cast(customer_id as varchar ), '')\n         || '|' || coalesce(cast(_loaded_at as varchar ), '')\n        ) as dbt_scd_id\n        from snapshot_query\n    ),\n    updates_source_data as (\n        select *,\n        customer_id as dbt_unique_key\n,\n            _loaded_at as dbt_updated_at,\n            _loaded_at as dbt_valid_from,\n            _loaded_at as dbt_valid_to\n        from snapshot_query\n    ),\n    insertions as (\n        select\n            'insert' as dbt_change_type,\n            source_data.*\n        from insertions_source_data as source_data\n        left outer join snapshotted_data\n            on\n        snapshotted_data.dbt_unique_key = source_data.dbt_unique_key\n            where\n        snapshotted_data.dbt_unique_key is null\n            or (\n        snapshotted_data.dbt_unique_key is not null\n and (\n               (snapshotted_data.dbt_valid_from < source_data._loaded_at)\n            )\n        )\n    ),\n    updates as (\n        select\n            'update' as dbt_change_type,\n            source_data.*,\n            snapshotted_data.dbt_scd_id\n        from updates_source_data as source_data\n        join snapshotted_data\n            on\n        snapshotted_data.dbt_unique_key = source_data.dbt_unique_key\n        where (\n            (snapshotted_data.dbt_valid_from < source_data._loaded_at)\n        )\n    )\n    select * from insertions\n    union all\n    select * from updates\n    ) as __dbt_sbq\n    where false\n    limit 0"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"snapshot.brewline.snap_customers\"}",
    "kind": "query",
    "sql": "select * from (\n        select to_timestamp_ntz(convert_timezone('UTC', current_timestamp())) as dbt_snapshot_time\n    ) as __dbt_sbq\n    where false\n    limit 0"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"snapshot.brewline.snap_customers\"}",
    "kind": "txn",
    "sql": "begin"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"snapshot.brewline.snap_customers\"}",
    "kind": "dml",
    "sql": "merge into \"BREWLINE_DEV\".\"DEV_ALICE\".\"SNAP_CUSTOMERS\" as DBT_INTERNAL_DEST\n    using \"BREWLINE_DEV\".\"DEV_ALICE\".\"SNAP_CUSTOMERS__dbt_tmp\" as DBT_INTERNAL_SOURCE\n    on DBT_INTERNAL_SOURCE.dbt_scd_id = DBT_INTERNAL_DEST.dbt_scd_id\n    when matched\n       and DBT_INTERNAL_DEST.dbt_valid_to is null\n     and DBT_INTERNAL_SOURCE.dbt_change_type in ('update', 'delete')\n        then update\n        set dbt_valid_to = DBT_INTERNAL_SOURCE.dbt_valid_to\n    when not matched\n     and DBT_INTERNAL_SOURCE.dbt_change_type = 'insert'\n        then insert (\"CUSTOMER_ID\", \"FULL_NAME\", \"EMAIL\", \"COUNTRY\", \"TIER\", \"_LOADED_AT\", \"DBT_SCD_ID\", \"DBT_UPDATED_AT\", \"DBT_VALID_FROM\", \"DBT_VALID_TO\")\n        values (\"CUSTOMER_ID\", \"FULL_NAME\", \"EMAIL\", \"COUNTRY\", \"TIER\", \"_LOADED_AT\", \"DBT_SCD_ID\", \"DBT_UPDATED_AT\", \"DBT_VALID_FROM\", \"DBT_VALID_TO\")"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"snapshot.brewline.snap_customers\"}",
    "kind": "txn",
    "sql": "commit"
   }
  ],
  "tests_generic": [
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show objects in BREWLINE_DEV.DEV_ALICE\n    limit 10000"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"connection_name\": \"list_BREWLINE_DEV_DEV_ALICE\"}",
    "kind": "meta",
    "sql": "show user functions in BREWLINE_DEV.DEV_ALICE"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"test.brewline.positive_value_stg_brewline__orders_order_total_usd.215373c17d\"}",
    "kind": "query",
    "sql": "select\n      count(*) as failures,\n      count(*) != 0 as should_warn,\n      count(*) != 0 as should_error\n    from (\nselect *\nfrom BREWLINE_DEV.DEV_ALICE.stg_brewline__orders\nwhere order_total_usd <= 0\n    ) dbt_internal_test"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"test.brewline.not_null_stg_brewline__orders_order_id.1678e7d9d1\"}",
    "kind": "query",
    "sql": "select\n      count(*) as failures,\n      count(*) != 0 as should_warn,\n      count(*) != 0 as should_error\n    from (\nselect order_id\nfrom BREWLINE_DEV.DEV_ALICE.stg_brewline__orders\nwhere order_id is null\n    ) dbt_internal_test"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"test.brewline.accepted_values_stg_brewline__orders_order_status__PLACED__SHIPPED__CANCELLED.1bda178a78\"}",
    "kind": "query",
    "sql": "select\n      count(*) as failures,\n      count(*) != 0 as should_warn,\n      count(*) != 0 as should_error\n    from (\nwith all_values as (\n    select\n        order_status as value_field,\n        count(*) as n_records\n    from BREWLINE_DEV.DEV_ALICE.stg_brewline__orders\n    group by order_status\n)\nselect *\nfrom all_values\nwhere value_field not in (\n    'PLACED','SHIPPED','CANCELLED'\n)\n    ) dbt_internal_test"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"test.brewline.not_null_stg_brewline__orders_customer_id.54a8f6ed0e\"}",
    "kind": "query",
    "sql": "select\n      count(*) as failures,\n      count(*) != 0 as should_warn,\n      count(*) != 0 as should_error\n    from (\nselect customer_id\nfrom BREWLINE_DEV.DEV_ALICE.stg_brewline__orders\nwhere customer_id is null\n    ) dbt_internal_test"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"test.brewline.relationships_stg_brewline__orders_customer_id__customer_id__ref_stg_brewline__customers_.0ff674b0d1\"}",
    "kind": "query",
    "sql": "select\n      count(*) as failures,\n      count(*) != 0 as should_warn,\n      count(*) != 0 as should_error\n    from (\nwith child as (\n    select customer_id as from_field\n    from BREWLINE_DEV.DEV_ALICE.stg_brewline__orders\n    where customer_id is not null\n),\nparent as (\n    select customer_id as to_field\n    from BREWLINE_DEV.DEV_ALICE.stg_brewline__customers\n)\nselect\n    from_field\nfrom child\nleft join parent\n    on child.from_field = parent.to_field\nwhere parent.to_field is null\n    ) dbt_internal_test"
   },
   {
    "comment": "{\"app\": \"dbt\", \"dbt_version\": \"1.12.6\", \"profile_name\": \"brewline\", \"target_name\": \"dev\", \"node_id\": \"test.brewline.unique_stg_brewline__orders_order_id.2f7a38eaba\"}",
    "kind": "query",
    "sql": "select\n      count(*) as failures,\n      count(*) != 0 as should_warn,\n      count(*) != 0 as should_error\n    from (\nselect\n    order_id as unique_field,\n    count(*) as n_records\nfrom BREWLINE_DEV.DEV_ALICE.stg_brewline__orders\nwhere order_id is not null\ngroup by order_id\nhaving count(*) > 1\n    ) dbt_internal_test"
   }
  ]
 },
 "text": {
  "auth_source": "if self.authenticator != \"oauth\" and (self.oauth_client_secret or self.oauth_client_id):\nself.authenticator not in [\"oauth\", \"jwt\", \"programmatic_access_token\"]\nresult[\"authenticator\"] = self.authenticator\nif self.authenticator == \"oauth\":\nelif self.authenticator == \"jwt\":\nresult[\"authenticator\"] = \"oauth\"\nelif self.authenticator == \"programmatic_access_token\":\nelif self.authenticator.lower() == \"workload_identity\":\nresult[\"authenticator\"] = WORKLOAD_IDENTITY_AUTHENTICATOR\nif self.authenticator != \"oauth\":\nraise DbtConfigError(\"Cannot specify both `private_key`  and `private_key_path`\")\nsession_parameters.update({\"QUERY_TAG\": creds.query_tag})",
  "ci_cleanup_guard": "drop_pr_schema runs only on the ci target, not on prod",
  "connect_cfg_baseline": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_cfg_cluster_by": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_cfg_copy_grants": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_cfg_dynamic_table": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_cfg_grants": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_cfg_post_hook": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_cfg_query_tag": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_cfg_secure_view": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_cfg_transient_false": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_cfg_warehouse": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_ci_cleanup": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_CI\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"CI_DEPLOYER\",\n  \"schema\": \"PR_123\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_CI\"\n}",
  "connect_ci_cleanup_guard": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"ANALYTICS\",\n  \"session_parameters\": {\n    \"QUERY_TAG\": \"dbt_brewline_prod\"\n  },\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM\"\n}",
  "connect_ci_defer": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_CI\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"CI_DEPLOYER\",\n  \"schema\": \"PR_123\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_CI\"\n}",
  "connect_clone_to_ci": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_CI\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"CI_DEPLOYER\",\n  \"schema\": \"PR_123\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_CI\"\n}",
  "connect_compile_one": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_debug_dev": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_debug_pw": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"password\": \"<hidden>\",\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": null,\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_debug_sso": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"authenticator\": \"externalbrowser\",\n  \"autocommit\": true,\n  \"client_request_mfa_token\": true,\n  \"client_session_keep_alive\": false,\n  \"client_store_temporary_credential\": true,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": null,\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"alice@brewline.example\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_docs_generate": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_empty_run": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_freshness": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_grants_revoke": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_hook_grants": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_incr_append": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_incr_delete_insert": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_incr_first_run": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_incr_full_refresh": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_incr_merge": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_incr_merge_columns": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_incr_merge_nokey": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_incr_microbatch": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_incr_predicates": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_incr_schema_append": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_python_model": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_run_all_dev": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_run_two_ci": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_CI\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"CI_DEPLOYER\",\n  \"schema\": \"PR_123\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_CI\"\n}",
  "connect_run_two_prod": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"ANALYTICS\",\n  \"session_parameters\": {\n    \"QUERY_TAG\": \"dbt_brewline_prod\"\n  },\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM\"\n}",
  "connect_seed_dev": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_snapshot_first": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_snapshot_permanent": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_snapshot_second": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "connect_tests_generic": "{\n  \"account\": \"acme-brewline\",\n  \"application\": \"dbt\",\n  \"autocommit\": true,\n  \"client_session_keep_alive\": false,\n  \"database\": \"BREWLINE_DEV\",\n  \"insecure_mode\": false,\n  \"ocsp_root_certs_dict_lock_timeout\": 10,\n  \"platform_detection_timeout_seconds\": 0.0,\n  \"private_key\": \"<private key, 1218 bytes>\",\n  \"reuse_connections\": true,\n  \"role\": \"TRANSFORMER\",\n  \"schema\": \"DEV_ALICE\",\n  \"session_parameters\": {},\n  \"user\": \"DBT_SERVICE\",\n  \"warehouse\": \"WH_TRANSFORM_DEV\"\n}",
  "credential_fields": "[\"_ALIASES\", \"account\", \"authenticator\", \"client_session_keep_alive\", \"connect_retries\", \"connect_timeout\", \"database\", \"host\", \"insecure_mode\", \"oauth_client_id\", \"oauth_client_secret\", \"password\", \"platform_detection_timeout_seconds\", \"port\", \"private_key\", \"private_key_passphrase\", \"private_key_path\", \"protocol\", \"proxy_host\", \"proxy_port\", \"query_tag\", \"retry_all\", \"retry_on_database_errors\", \"reuse_connections\", \"role\", \"s3_stage_vpce_dns_name\", \"schema\", \"token\", \"user\", \"warehouse\", \"workload_identity_entra_resource\", \"workload_identity_provider\"]",
  "debug_dev": "14:57:02  Running with dbt=1.12.6\n14:57:02  dbt version: 1.12.6\n14:57:02  python version: 3.13.18\n14:57:02  python path: ~/venv/bin/python3\n14:57:02  os info: Linux\n14:57:02  Using profiles dir at ~/brewline\n14:57:02  Using profiles.yml file at ~/brewline/profiles.yml\n14:57:02  Using dbt_project.yml file at ~/brewline/dbt_project.yml\n14:57:02  adapter type: snowflake\n14:57:02  adapter version: 1.12.5\n14:57:02  Configuration:\n14:57:02    profiles.yml file [OK found and valid]\n14:57:02    dbt_project.yml file [OK found and valid]\n14:57:02  Required dependencies:\n14:57:02   - git [OK found]\n\n14:57:02  Connection:\n14:57:02    account: acme-brewline\n14:57:02    user: DBT_SERVICE\n14:57:02    database: BREWLINE_DEV\n14:57:02    warehouse: WH_TRANSFORM_DEV\n14:57:02    role: TRANSFORMER\n14:57:02    schema: DEV_ALICE\n14:57:02    authenticator: None\n14:57:02    oauth_client_id: None\n14:57:02    query_tag: None\n14:57:02    client_session_keep_alive: False\n14:57:02    host: None\n14:57:02    port: None\n14:57:02    proxy_host: None\n14:57:02    proxy_port: None\n14:57:02    protocol: None\n14:57:02    connect_retries: 1\n14:57:02    connect_timeout: None\n14:57:02    retry_on_database_errors: False\n14:57:02    retry_all: False\n14:57:02    insecure_mode: False\n14:57:02    reuse_connections: True\n14:57:02    s3_stage_vpce_dns_name: None\n14:57:02    workload_identity_provider: None\n14:57:02    workload_identity_entra_resource: None\n14:57:02    platform_detection_timeout_seconds: 0.0\n14:57:02  Registered adapter: snowflake=1.12.5\n14:57:02    Connection test: [OK connection ok]\n\n14:57:02  All checks passed!\n",
  "debug_pw": "14:57:04  Running with dbt=1.12.6\n14:57:04  dbt version: 1.12.6\n14:57:04  python version: 3.13.18\n14:57:04  python path: ~/venv/bin/python3\n14:57:04  os info: Linux\n14:57:04  Using profiles dir at ~/brewline\n14:57:04  Using profiles.yml file at ~/brewline/profiles.yml\n14:57:04  Using dbt_project.yml file at ~/brewline/dbt_project.yml\n14:57:04  adapter type: snowflake\n14:57:04  adapter version: 1.12.5\n14:57:04  Configuration:\n14:57:04    profiles.yml file [OK found and valid]\n14:57:04    dbt_project.yml file [OK found and valid]\n14:57:04  Required dependencies:\n14:57:04   - git [OK found]\n\n14:57:04  Connection:\n14:57:04    account: acme-brewline\n14:57:04    user: DBT_SERVICE\n14:57:04    database: BREWLINE_DEV\n14:57:04    warehouse: WH_TRANSFORM_DEV\n14:57:04    role: TRANSFORMER\n14:57:04    schema: DEV_ALICE\n14:57:04    authenticator: None\n14:57:04    oauth_client_id: None\n14:57:04    query_tag: None\n14:57:04    client_session_keep_alive: False\n14:57:04    host: None\n14:57:04    port: None\n14:57:04    proxy_host: None\n14:57:04    proxy_port: None\n14:57:04    protocol: None\n14:57:04    connect_retries: 1\n14:57:04    connect_timeout: None\n14:57:04    retry_on_database_errors: False\n14:57:04    retry_all: False\n14:57:04    insecure_mode: False\n14:57:04    reuse_connections: True\n14:57:04    s3_stage_vpce_dns_name: None\n14:57:04    workload_identity_provider: None\n14:57:04    workload_identity_entra_resource: None\n14:57:04    platform_detection_timeout_seconds: 0.0\n14:57:04  Registered adapter: snowflake=1.12.5\n14:57:04    Connection test: [OK connection ok]\n\n14:57:04  All checks passed!\n",
  "debug_sso": "14:57:06  Running with dbt=1.12.6\n14:57:06  dbt version: 1.12.6\n14:57:06  python version: 3.13.18\n14:57:06  python path: ~/venv/bin/python3\n14:57:06  os info: Linux\n14:57:07  Using profiles dir at ~/brewline\n14:57:07  Using profiles.yml file at ~/brewline/profiles.yml\n14:57:07  Using dbt_project.yml file at ~/brewline/dbt_project.yml\n14:57:07  adapter type: snowflake\n14:57:07  adapter version: 1.12.5\n14:57:07  Configuration:\n14:57:07    profiles.yml file [OK found and valid]\n14:57:07    dbt_project.yml file [OK found and valid]\n14:57:07  Required dependencies:\n14:57:07   - git [OK found]\n\n14:57:07  Connection:\n14:57:07    account: acme-brewline\n14:57:07    user: alice@brewline.example\n14:57:07    database: BREWLINE_DEV\n14:57:07    warehouse: WH_TRANSFORM_DEV\n14:57:07    role: TRANSFORMER\n14:57:07    schema: DEV_ALICE\n14:57:07    authenticator: externalbrowser\n14:57:07    oauth_client_id: None\n14:57:07    query_tag: None\n14:57:07    client_session_keep_alive: False\n14:57:07    host: None\n14:57:07    port: None\n14:57:07    proxy_host: None\n14:57:07    proxy_port: None\n14:57:07    protocol: None\n14:57:07    connect_retries: 1\n14:57:07    connect_timeout: None\n14:57:07    retry_on_database_errors: False\n14:57:07    retry_all: False\n14:57:07    insecure_mode: False\n14:57:07    reuse_connections: True\n14:57:07    s3_stage_vpce_dns_name: None\n14:57:07    workload_identity_provider: None\n14:57:07    workload_identity_entra_resource: None\n14:57:07    platform_detection_timeout_seconds: 0.0\n14:57:07  Registered adapter: snowflake=1.12.5\n14:57:07    Connection test: [OK connection ok]\n\n14:57:07  All checks passed!\n"
 }
};
