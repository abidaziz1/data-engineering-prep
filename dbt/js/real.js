window.LAB = window.LAB || {};
LAB.real = {
 "cmds": {
  "access_fail": "dbt parse --target prod",
  "build_day1": "dbt build --target prod",
  "build_day2": "dbt build --target prod",
  "build_fail": "dbt build --target prod",
  "build_fresh_fail": "dbt build --target prod",
  "compile_all": "dbt compile --target prod",
  "compile_inline": "dbt compile --inline \"select * from {{ ref('stg_brewline__orders') }} limit 3\"",
  "contract_fail": "dbt run -s fct_daily_revenue --target prod",
  "debug": "dbt debug --target prod",
  "deps": "dbt deps",
  "docs_generate": "dbt docs generate --target prod",
  "empty_run": "dbt run -s stg_brewline__orders --empty --target dev",
  "empty_shell": "dbt run -s +fct_orders --empty --target prod",
  "ephemeral_compile": "dbt compile -s fct_orders --target prod",
  "first_run": "dbt run -s +fct_orders --target prod",
  "freshness_error": "dbt source freshness --select source:brewline.orders",
  "freshness_stale": "dbt source freshness",
  "freshness_warn": "dbt source freshness --select source:brewline.orders",
  "full_refresh": "dbt run -s fct_orders --full-refresh --target prod",
  "inc_bug_run": "dbt run -s fct_orders --target prod",
  "jinja_execute_bug": "dbt parse --target prod",
  "jinja_parse": "dbt parse --target prod",
  "jinja_run": "dbt run -s orders_by_status min_total status_list cents_demo --target prod",
  "jinja_sample_dev": "dbt compile -s customers_sample --target dev",
  "jinja_sample_prod": "dbt compile -s customers_sample --target prod",
  "jinja_vars": "dbt compile -s min_total --vars {min_total: 25} --target prod",
  "ls_tests_orders": "dbt ls --resource-type test -s stg_brewline__orders --target prod",
  "ls_unit_tests": "dbt ls --resource-type unit_test --target prod",
  "retry": "dbt retry",
  "schema_custom_dev": "dbt run -s stg_brewline__customers --target dev",
  "schema_custom_prod": "dbt run -s stg_brewline__customers --target prod",
  "schema_default_dev": "dbt run -s stg_brewline__customers --target dev",
  "schema_default_prod": "dbt run -s stg_brewline__customers --target prod",
  "show": "dbt show -s fct_daily_revenue --target prod",
  "show_inline": "dbt show --inline \"select {{ cents_to_dollars('6700') }} as dollars\"",
  "slim_defer": "dbt build -s state:modified+ --defer --state state --target dev",
  "slim_ls": "dbt ls -s state:modified+ --state state --resource-type model --target prod",
  "slim_nodefer": "dbt build -s state:modified+ --state state --target dev",
  "slowest_build": "dbt build -s +fct_daily_revenue --target prod",
  "snap_check_run1": "dbt snapshot --target prod",
  "snap_check_run2": "dbt snapshot --target prod",
  "strategy_append": "dbt run -s fct_orders --target prod",
  "strategy_append_test": "dbt test -s fct_orders --target prod",
  "strategy_delete_insert": "dbt run -s fct_orders --target prod",
  "strategy_delete_insert_test": "dbt test -s fct_orders --target prod",
  "strategy_merge": "dbt run -s fct_orders --target prod",
  "strategy_merge_test": "dbt test -s fct_orders --target prod",
  "strategy_microbatch": "dbt run -s fct_orders --event-time-start 2026-03-17 --event-time-end 2026-03-19 --target prod",
  "test_fail": "dbt test -s stg_brewline__orders --target prod",
  "test_fail_many": "dbt test -s stg_brewline__orders --target prod",
  "test_store_failures": "dbt test -s stg_brewline__orders --store-failures --target prod",
  "unit_fail": "dbt test --select test_type:unit --target prod",
  "unit_pass": "dbt test --select test_type:unit --target prod",
  "version": "dbt --version"
 },
 "dag": {
  "edges": [
   [
    "country_names",
    "dim_customers"
   ],
   [
    "fct_daily_revenue",
    "finance_dashboard"
   ],
   [
    "fct_orders",
    "fct_daily_revenue"
   ],
   [
    "int_orders__with_items",
    "fct_orders"
   ],
   [
    "source:customers",
    "snap_customers"
   ],
   [
    "source:customers",
    "stg_brewline__customers"
   ],
   [
    "source:order_items",
    "stg_brewline__order_items"
   ],
   [
    "source:orders",
    "stg_brewline__orders"
   ],
   [
    "source:products",
    "stg_brewline__products"
   ],
   [
    "stg_brewline__customers",
    "dim_customers"
   ],
   [
    "stg_brewline__order_items",
    "int_orders__with_items"
   ],
   [
    "stg_brewline__orders",
    "dim_customers"
   ],
   [
    "stg_brewline__orders",
    "int_orders__with_items"
   ],
   [
    "stg_brewline__products",
    "dim_products"
   ]
  ],
  "nodes": [
   {
    "materialized": "",
    "name": "finance_dashboard",
    "type": "exposure"
   },
   {
    "materialized": "table",
    "name": "dim_customers",
    "type": "model"
   },
   {
    "materialized": "table",
    "name": "dim_products",
    "type": "model"
   },
   {
    "materialized": "table",
    "name": "fct_daily_revenue",
    "type": "model"
   },
   {
    "materialized": "incremental",
    "name": "fct_orders",
    "type": "model"
   },
   {
    "materialized": "view",
    "name": "int_orders__with_items",
    "type": "model"
   },
   {
    "materialized": "view",
    "name": "stg_brewline__customers",
    "type": "model"
   },
   {
    "materialized": "view",
    "name": "stg_brewline__order_items",
    "type": "model"
   },
   {
    "materialized": "view",
    "name": "stg_brewline__orders",
    "type": "model"
   },
   {
    "materialized": "view",
    "name": "stg_brewline__products",
    "type": "model"
   },
   {
    "materialized": "seed",
    "name": "country_names",
    "type": "seed"
   },
   {
    "materialized": "snapshot",
    "name": "snap_customers",
    "type": "snapshot"
   },
   {
    "materialized": "",
    "name": "source:customers",
    "type": "source"
   },
   {
    "materialized": "",
    "name": "source:order_items",
    "type": "source"
   },
   {
    "materialized": "",
    "name": "source:orders",
    "type": "source"
   },
   {
    "materialized": "",
    "name": "source:products",
    "type": "source"
   }
  ]
 },
 "files": {
  ".gitignore": "target/\ndbt_packages/\nlogs/\n*.duckdb\n*.duckdb.wal\npackage-lock.yml\n",
  ".user.yml": "id: 863260f1-0d2c-41fa-824c-1ff7a95bb4b8\n",
  "dbt_project.yml": "name: brewline\nversion: '1.0.0'\nprofile: brewline\n\nmodel-paths: [\"models\"]\nseed-paths: [\"seeds\"]\nsnapshot-paths: [\"snapshots\"]\nmacro-paths: [\"macros\"]\ntest-paths: [\"tests\"]\n\nclean-targets: [\"target\", \"dbt_packages\"]\n\nmodels:\n  brewline:\n    staging:\n      +materialized: view\n      +schema: staging\n    intermediate:\n      +materialized: view\n      +schema: intermediate\n    marts:\n      +materialized: table\n      +schema: marts\n\nseeds:\n  brewline:\n    +schema: reference\n",
  "macros/cents_to_dollars.sql": "{% macro cents_to_dollars(column_name, scale=2) %}\n    round({{ column_name }} / 100.0, {{ scale }})\n{% endmacro %}\n",
  "macros/limit_in_dev.sql": "{% macro limit_in_dev(row_count=1000) %}\n    {% if target.name == 'dev' %}\n    limit {{ row_count }}\n    {% endif %}\n{% endmacro %}\n",
  "models/docs.md": "{% docs order_status %}\n\nWhere an order is in its life. `PLACED` means the customer paid and nothing has shipped.\n`SHIPPED` means the carrier has the parcel. `CANCELLED` orders never produce revenue.\n\n{% enddocs %}\n",
  "models/intermediate/int_orders__with_items.sql": "with items as (\n\n    select\n        order_id,\n        count(*) as item_lines,\n        sum(quantity) as units,\n        sum(line_total_usd) as items_total_usd\n    from {{ ref('stg_brewline__order_items') }}\n    group by order_id\n\n)\n\nselect\n    o.order_id,\n    o.customer_id,\n    o.ordered_at,\n    o.order_status,\n    o.order_total_usd,\n    o.loaded_at,\n    coalesce(i.item_lines, 0) as item_lines,\n    coalesce(i.units, 0) as units,\n    coalesce(i.items_total_usd, 0) as items_total_usd\nfrom {{ ref('stg_brewline__orders') }} as o\nleft join items as i on i.order_id = o.order_id\n",
  "models/marts/_exposures.yml": "exposures:\n  - name: finance_dashboard\n    label: Finance revenue dashboard\n    type: dashboard\n    maturity: high\n    url: https://bi.brewline.example/dashboards/finance-revenue\n    description: Daily revenue that the finance team reviews every morning.\n    depends_on:\n      - ref('fct_daily_revenue')\n    owner:\n      name: Finance Analytics\n      email: finance-analytics@brewline.example\n",
  "models/marts/_groups.yml": "groups:\n  - name: finance\n    owner:\n      name: Finance Analytics\n      email: finance-analytics@brewline.example\n",
  "models/marts/_marts__models.yml": "version: 2\n\nmodels:\n  - name: dim_customers\n    description: One row per customer, with country name and order counts.\n    config:\n      tags: [pii]\n    columns:\n      - name: customer_key\n        data_tests: [unique, not_null]\n      - name: customer_id\n        data_tests: [unique, not_null]\n\n  - name: dim_products\n    description: One row per product.\n    latest_version: 2\n    columns:\n      - name: product_key\n        data_tests: [unique, not_null]\n    versions:\n      - v: 1\n        deprecation_date: 2027-01-31\n      - v: 2\n        columns:\n          - include: all\n            exclude: [list_price_usd]\n          - name: price_usd\n            description: List price in US dollars. Renamed from list_price_usd in v1.\n          - name: price_band\n            description: premium for list prices of 30 dollars or more, otherwise standard.\n\n  - name: fct_orders\n    description: One row per order. Incremental, merged on order_id.\n    config:\n      tags: [daily]\n    columns:\n      - name: order_id\n        data_tests: [unique, not_null]\n      - name: customer_id\n        data_tests:\n          - relationships:\n              arguments:\n                to: ref('dim_customers')\n                field: customer_id\n      - name: is_reconciled\n        description: True when the order total equals the sum of its lines.\n\n  - name: fct_daily_revenue\n    description: Revenue per day, without cancelled orders. A public interface with an enforced contract.\n    config:\n      tags: [daily]\n      group: finance\n      access: public\n      contract:\n        enforced: true\n    columns:\n      - name: order_date\n        data_type: date\n        constraints:\n          - type: not_null\n        data_tests: [unique, not_null]\n      - name: orders\n        data_type: bigint\n      - name: revenue_usd\n        data_type: decimal(38, 2)\n",
  "models/marts/core/_core__unit_tests.yml": "unit_tests:\n  - name: test_fct_orders_incremental_reads_only_new_versions\n    description: On an incremental run, only versions loaded after the newest row already in the table are read.\n    model: fct_orders\n    overrides:\n      macros:\n        is_incremental: true\n    given:\n      - input: ref('int_orders__with_items')\n        rows:\n          - {order_id: O-1, customer_id: C-1, ordered_at: '2026-01-01 10:00:00', order_status: SHIPPED, order_total_usd: 10.00, loaded_at: '2026-01-01 11:05:00', item_lines: 1, units: 1, items_total_usd: 10.00}\n          - {order_id: O-2, customer_id: C-2, ordered_at: '2026-01-02 09:00:00', order_status: PLACED, order_total_usd: 8.00, loaded_at: '2026-01-02 09:05:00', item_lines: 1, units: 1, items_total_usd: 8.00}\n      - input: this\n        rows:\n          - {order_id: O-1, customer_id: C-1, ordered_at: '2026-01-01 10:00:00', order_status: PLACED, order_total_usd: 10.00, items_total_usd: 10.00, is_reconciled: true, loaded_at: '2026-01-01 10:05:00'}\n    expect:\n      rows:\n        - {order_id: O-1, customer_id: C-1, ordered_at: '2026-01-01 10:00:00', order_status: SHIPPED, order_total_usd: 10.00, items_total_usd: 10.00, is_reconciled: true, loaded_at: '2026-01-01 11:05:00'}\n        - {order_id: O-2, customer_id: C-2, ordered_at: '2026-01-02 09:00:00', order_status: PLACED, order_total_usd: 8.00, items_total_usd: 8.00, is_reconciled: true, loaded_at: '2026-01-02 09:05:00'}\n",
  "models/marts/core/dim_customers.sql": "with customers as (\n\n    select * from {{ ref('stg_brewline__customers') }}\n\n),\n\ncountries as (\n\n    select * from {{ ref('country_names') }}\n\n),\n\norders as (\n\n    select\n        customer_id,\n        count(*) as orders_count,\n        min(ordered_at) as first_order_at\n    from {{ ref('stg_brewline__orders') }}\n    where order_status <> 'CANCELLED'\n    group by customer_id\n\n)\n\nselect\n    {{ dbt_utils.generate_surrogate_key(['c.customer_id']) }} as customer_key,\n    c.customer_id,\n    c.full_name,\n    c.email,\n    c.country_code,\n    n.country_name,\n    c.tier,\n    coalesce(o.orders_count, 0) as orders_count,\n    o.first_order_at\nfrom customers as c\nleft join countries as n on n.country_code = c.country_code\nleft join orders as o on o.customer_id = c.customer_id\n",
  "models/marts/core/dim_products_v1.sql": "select\n    {{ dbt_utils.generate_surrogate_key(['product_id']) }} as product_key,\n    product_id,\n    product_name,\n    category,\n    list_price_usd\nfrom {{ ref('stg_brewline__products') }}\n",
  "models/marts/core/dim_products_v2.sql": "select\n    {{ dbt_utils.generate_surrogate_key(['product_id']) }} as product_key,\n    product_id,\n    product_name,\n    category,\n    list_price_usd as price_usd,\n    case when list_price_usd >= 30 then 'premium' else 'standard' end as price_band\nfrom {{ ref('stg_brewline__products') }}\n",
  "models/marts/core/fct_orders.sql": "{{\n    config(\n        materialized='incremental',\n        unique_key='order_id',\n        on_schema_change='append_new_columns'\n    )\n}}\n\nselect\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom {{ ref('int_orders__with_items') }}\n\n{% if is_incremental() %}\nwhere loaded_at > (select coalesce(max(loaded_at), timestamp '1900-01-01') from {{ this }})\n{% endif %}\n",
  "models/marts/finance/fct_daily_revenue.sql": "select\n    cast(ordered_at as date) as order_date,\n    count(*) as orders,\n    sum(order_total_usd) as revenue_usd\nfrom {{ ref('fct_orders') }}\nwhere order_status <> 'CANCELLED'\ngroup by 1\n",
  "models/staging/brewline/_brewline__models.yml": "version: 2\n\nmodels:\n  - name: stg_brewline__orders\n    description: One row per order, latest version only, cleaned and typed.\n    columns:\n      - name: order_id\n        description: Business key of the order.\n        data_tests:\n          - unique\n          - not_null\n      - name: customer_id\n        description: The customer who placed the order.\n        data_tests:\n          - not_null\n          - relationships:\n              arguments:\n                to: ref('stg_brewline__customers')\n                field: customer_id\n      - name: order_status\n        description: '{{ doc(\"order_status\") }}'\n        data_tests:\n          - accepted_values:\n              arguments:\n                values: ['PLACED', 'SHIPPED', 'CANCELLED']\n      - name: order_total_usd\n        description: Order total in US dollars, as charged.\n        data_tests:\n          - positive_value\n\n  - name: stg_brewline__order_items\n    description: One row per order line.\n    columns:\n      - name: order_id\n        data_tests:\n          - not_null\n      - name: quantity\n        data_tests:\n          - positive_value\n\n  - name: stg_brewline__customers\n    description: One row per customer, with the email and country code cleaned.\n    config:\n      tags: [pii]\n    columns:\n      - name: customer_id\n        data_tests:\n          - unique\n          - not_null\n\n  - name: stg_brewline__products\n    description: One row per product.\n    columns:\n      - name: product_id\n        data_tests:\n          - unique\n          - not_null\n",
  "models/staging/brewline/_brewline__sources.yml": "version: 2\n\nsources:\n  - name: brewline\n    description: Raw tables loaded by the ingestion pipeline. Nothing here is cleaned.\n    schema: raw\n    config:\n      loaded_at_field: _loaded_at\n      freshness:\n        warn_after: {count: 12, period: hour}\n        error_after: {count: 24, period: hour}\n    tables:\n      - name: orders\n        description: One row for every version of an order. The loader only appends.\n        columns:\n          - name: order_id\n            description: Business key. It repeats here because RAW keeps every version.\n      - name: order_items\n        description: One row for every line of an order.\n      - name: customers\n        description: One row for every customer, as last loaded.\n      - name: products\n        description: The product catalog.\n",
  "models/staging/brewline/_brewline__unit_tests.yml": "unit_tests:\n  - name: test_stg_orders_keeps_the_latest_version\n    description: When an order has two versions, staging keeps only the newest one.\n    model: stg_brewline__orders\n    given:\n      - input: source('brewline', 'orders')\n        rows:\n          - {order_id: O-1, customer_id: C-1, order_ts: '2026-01-01 10:00:00', status: placed, total_usd: 10.00, _loaded_at: '2026-01-01 10:05:00'}\n          - {order_id: O-1, customer_id: C-1, order_ts: '2026-01-01 10:00:00', status: shipped, total_usd: 10.00, _loaded_at: '2026-01-01 11:05:00'}\n          - {order_id: O-2, customer_id: C-2, order_ts: '2026-01-01 12:00:00', status: placed, total_usd: 5.50, _loaded_at: '2026-01-01 12:05:00'}\n    expect:\n      rows:\n        - {order_id: O-1, customer_id: C-1, ordered_at: '2026-01-01 10:00:00', order_status: SHIPPED, order_total_usd: 10.00, loaded_at: '2026-01-01 11:05:00'}\n        - {order_id: O-2, customer_id: C-2, ordered_at: '2026-01-01 12:00:00', order_status: PLACED, order_total_usd: 5.50, loaded_at: '2026-01-01 12:05:00'}\n",
  "models/staging/brewline/stg_brewline__customers.sql": "select\n    customer_id,\n    full_name,\n    lower(email) as email,\n    upper(country) as country_code,\n    tier\nfrom {{ source('brewline', 'customers') }}\n",
  "models/staging/brewline/stg_brewline__order_items.sql": "select\n    order_id,\n    line_no,\n    product_id,\n    cast(qty as integer) as quantity,\n    cast(unit_price as decimal(12, 2)) as unit_price_usd,\n    cast(qty as integer) * cast(unit_price as decimal(12, 2)) as line_total_usd\nfrom {{ source('brewline', 'order_items') }}\n",
  "models/staging/brewline/stg_brewline__orders.sql": "with source as (\n\n    select * from {{ source('brewline', 'orders') }}\n\n),\n\nlatest as (\n\n    select *\n    from source\n    qualify row_number() over (partition by order_id order by _loaded_at desc) = 1\n\n)\n\nselect\n    order_id,\n    customer_id,\n    cast(order_ts as timestamp) as ordered_at,\n    upper(status) as order_status,\n    cast(total_usd as decimal(12, 2)) as order_total_usd,\n    _loaded_at as loaded_at\nfrom latest\n",
  "models/staging/brewline/stg_brewline__products.sql": "select\n    product_id,\n    name as product_name,\n    category,\n    cast(price_usd as decimal(12, 2)) as list_price_usd\nfrom {{ source('brewline', 'products') }}\n",
  "packages.yml": "packages:\n  - git: \"https://github.com/dbt-labs/dbt-utils.git\"\n    revision: 1.4.1\n",
  "profiles.yml": "brewline:\n  target: dev\n  outputs:\n    dev:\n      type: duckdb\n      path: brewline.duckdb\n      schema: dev_alice\n      threads: 4\n    prod:\n      type: duckdb\n      path: brewline.duckdb\n      schema: analytics\n      threads: 4\n",
  "scenario/cents_demo.sql": "select {{ cents_to_dollars('6700') }} as dollars\n",
  "scenario/customers_sample.sql": "select customer_id, full_name, tier\nfrom {{ ref('stg_brewline__customers') }}\norder by customer_id\n{{ limit_in_dev(2) }}\n",
  "scenario/fct_daily_revenue_contract_bug.sql": "select\n    cast(ordered_at as date) as order_date,\n    count(*) as orders,\n    sum(order_total_usd) as revenue\nfrom {{ ref('fct_orders') }}\nwhere order_status <> 'CANCELLED'\ngroup by 1\n",
  "scenario/fct_finance_orders.sql": "{{ config(group='finance') }}\n\nselect order_id, order_total_usd\nfrom {{ ref('int_orders__with_items') }}\n",
  "scenario/fct_orders_bug_ordered_at.sql": "{{\n    config(\n        materialized='incremental',\n        unique_key='order_id',\n        on_schema_change='append_new_columns'\n    )\n}}\n\nselect\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom {{ ref('int_orders__with_items') }}\n\n{% if is_incremental() %}\nwhere ordered_at > (select coalesce(max(ordered_at), timestamp '1900-01-01') from {{ this }})\n{% endif %}\n",
  "scenario/fct_orders_microbatch.sql": "{{\n    config(\n        materialized='incremental',\n        incremental_strategy='microbatch',\n        event_time='ordered_at',\n        batch_size='day',\n        begin='2026-03-14',\n        lookback=1\n    )\n}}\n\nselect\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom {{ ref('int_orders__with_items') }}\n",
  "scenario/generate_schema_name.sql": "{% macro generate_schema_name(custom_schema_name, node) -%}\n    {%- set default_schema = target.schema -%}\n    {%- if target.name == 'prod' and custom_schema_name is not none -%}\n        {{ custom_schema_name | trim }}\n    {%- else -%}\n        {{ default_schema }}\n    {%- endif -%}\n{%- endmacro %}\n",
  "scenario/int_orders_private.yml": "models:\n  - name: int_orders__with_items\n    config:\n      group: core\n      access: private\n",
  "scenario/min_total.sql": "select order_id, order_total_usd\nfrom {{ ref('stg_brewline__orders') }}\nwhere order_total_usd >= {{ var('min_total', 0) }}\norder by order_id\n",
  "scenario/orders_by_status.sql": "select\n    customer_id,\n    {% for s in ['PLACED', 'SHIPPED', 'CANCELLED'] %}\n    count(*) filter (where order_status = '{{ s }}') as {{ s | lower }}_orders{{ ',' if not loop.last }}\n    {% endfor %}\nfrom {{ ref('stg_brewline__orders') }}\ngroup by customer_id\n",
  "scenario/snap_customers_check.yml": "snapshots:\n  - name: snap_customers\n    relation: source('brewline', 'customers')\n    config:\n      schema: snapshots\n      unique_key: customer_id\n      strategy: check\n      check_cols: [tier, country]\n",
  "scenario/status_list.sql": "{% set statuses_query %}\n    select distinct order_status from {{ ref('stg_brewline__orders') }} order by 1\n{% endset %}\n\n{% if execute %}\n    {% set statuses = run_query(statuses_query).columns[0].values() %}\n{% else %}\n    {% set statuses = [] %}\n{% endif %}\n\nselect\n    count(*) as orders\n    {% for s in statuses %}\n    , count(*) filter (where order_status = '{{ s }}') as {{ s | lower }}\n    {% endfor %}\nfrom {{ ref('stg_brewline__orders') }}\n",
  "scenario/status_list_no_guard.sql": "{% set statuses_query %}\n    select distinct order_status from {{ ref('stg_brewline__orders') }} order by 1\n{% endset %}\n\n{% set statuses = run_query(statuses_query).columns[0].values() %}\n\nselect\n    count(*) as orders\n    {% for s in statuses %}\n    , count(*) filter (where order_status = '{{ s }}') as {{ s | lower }}\n    {% endfor %}\nfrom {{ ref('stg_brewline__orders') }}\n",
  "scenario/stg_customers_change.sql": "select\n    customer_id,\n    full_name,\n    split_part(full_name, ' ', 1) as first_name,\n    lower(email) as email,\n    upper(country) as country_code,\n    tier\nfrom {{ source('brewline', 'customers') }}\n",
  "scenario/stg_orders_unit_bug.sql": "with source as (\n\n    select * from {{ source('brewline', 'orders') }}\n\n),\n\nlatest as (\n\n    select *\n    from source\n    qualify row_number() over (partition by order_id order by _loaded_at asc) = 1\n\n)\n\nselect\n    order_id,\n    customer_id,\n    cast(order_ts as timestamp) as ordered_at,\n    upper(status) as order_status,\n    cast(total_usd as decimal(12, 2)) as order_total_usd,\n    _loaded_at as loaded_at\nfrom latest\n",
  "seeds/country_names.csv": "country_code,country_name\nUS,United States\nUK,United Kingdom\nFR,France\nDE,Germany\n",
  "snapshots/snap_customers.yml": "snapshots:\n  - name: snap_customers\n    relation: source('brewline', 'customers')\n    config:\n      schema: snapshots\n      unique_key: customer_id\n      strategy: timestamp\n      updated_at: _loaded_at\n",
  "tests/assert_order_total_matches_lines.sql": "{{ config(severity='warn') }}\n\nselect\n    order_id,\n    order_total_usd,\n    items_total_usd\nfrom {{ ref('int_orders__with_items') }}\nwhere order_total_usd <> items_total_usd\n",
  "tests/generic/positive_value.sql": "{% test positive_value(model, column_name) %}\n\nselect *\nfrom {{ model }}\nwhere {{ column_name }} <= 0\n\n{% endtest %}\n",
  "verify/raw/customers.csv": "customer_id,full_name,email,country,tier,_loaded_at\nC-12,Omar Haddad,Omar.Haddad@mail.test,us,standard,2026-03-14 06:00:00\nC-42,Ava Martin,ava.martin@mail.test,us,standard,2026-03-14 06:00:00\nC-77,Noah Singh,noah.singh@mail.test,uk,standard,2026-03-14 06:00:00\nC-91,Lea Dubois,lea.dubois@mail.test,fr,gold,2026-03-14 06:00:00\n",
  "verify/raw/order_items.csv": "order_id,line_no,product_id,qty,unit_price,_loaded_at\nO-5001,1,P-10,2,14.00,2026-03-14 09:31:07\nO-5001,2,P-22,1,39.00,2026-03-14 09:31:07\nO-5002,1,P-11,1,12.50,2026-03-14 09:31:07\nO-5003,1,P-10,2,14.00,2026-03-14 10:31:44\nO-5004,1,P-30,1,55.00,2026-03-15 12:00:05\nO-5005,1,P-31,1,29.00,2026-03-15 15:00:11\nO-5006,1,P-12,2,16.00,2026-03-16 09:30:02\nO-5006,2,P-11,1,12.50,2026-03-16 09:30:02\nO-5007,1,P-12,1,16.00,2026-03-16 18:30:09\nO-5008,1,P-22,1,39.00,2026-03-17 13:00:41\nO-5009,1,P-31,1,29.00,2026-03-17 16:00:17\n",
  "verify/raw/orders.csv": "order_id,customer_id,order_ts,status,total_usd,_loaded_at\nO-5001,C-42,2026-03-14 09:12:00,PLACED,67.00,2026-03-14 09:31:07\nO-5002,C-77,2026-03-14 09:15:00,PLACED,12.50,2026-03-14 09:31:07\nO-5001,C-42,2026-03-14 09:12:00,SHIPPED,67.00,2026-03-14 10:31:44\nO-5003,C-42,2026-03-14 10:02:00,PLACED,28.00,2026-03-14 10:31:44\nO-5003,C-42,2026-03-14 10:02:00,SHIPPED,28.00,2026-03-14 11:31:20\nO-5004,C-91,2026-03-15 11:20:00,SHIPPED,55.00,2026-03-15 12:00:05\nO-5005,C-12,2026-03-15 14:05:00,CANCELLED,29.00,2026-03-15 15:00:11\nO-5006,C-77,2026-03-16 08:40:00,SHIPPED,44.50,2026-03-16 09:30:02\nO-5007,C-42,2026-03-16 17:55:00,PLACED,16.00,2026-03-16 18:30:09\nO-5008,C-91,2026-03-17 12:30:00,SHIPPED,39.00,2026-03-17 13:00:41\nO-5009,C-12,2026-03-17 15:00:00,SHIPPED,30.00,2026-03-17 16:00:17\nO-5010,C-77,2026-03-17 16:20:00,PLACED,20.00,2026-03-17 17:00:03\n",
  "verify/raw/products.csv": "product_id,name,category,price_usd,_loaded_at\nP-10,Ethiopia 250 g,coffee,14.00,2026-03-14 06:00:00\nP-11,Colombia 250 g,coffee,12.50,2026-03-14 06:00:00\nP-12,Kenya 250 g,coffee,16.00,2026-03-14 06:00:00\nP-22,Hand grinder,gear,39.00,2026-03-14 06:00:00\nP-30,Kettle,gear,55.00,2026-03-14 06:00:00\nP-31,Scale,gear,29.00,2026-03-14 06:00:00\n"
 },
 "logs": {
  "access_fail": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:01  [ERROR]: Encountered an error:\nParsing Error\n  Node model.brewline.fct_finance_orders attempted to reference node model.brewline.int_orders__with_items, which is not allowed because the referenced node is private to the 'core' group.",
  "build_day1": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:01  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:01\n06:00:01  Concurrency: 4 threads (target='prod')\n06:00:01\n06:00:01  6 of 41 START unit_test stg_brewline__orders::test_stg_orders_keeps_the_latest_version  [RUN]\n06:00:01  1 of 41 START sql view model analytics_staging.stg_brewline__customers ......... [RUN]\n06:00:01  3 of 41 START sql view model analytics_staging.stg_brewline__products .......... [RUN]\n06:00:01  2 of 41 START sql view model analytics_staging.stg_brewline__order_items ....... [RUN]\n06:00:02  1 of 41 OK created sql view model analytics_staging.stg_brewline__customers .... [OK in 0.21s]\n06:00:02  3 of 41 OK created sql view model analytics_staging.stg_brewline__products ..... [OK in 0.21s]\n06:00:02  4 of 41 START seed file analytics_reference.country_names ...................... [RUN]\n06:00:02  2 of 41 OK created sql view model analytics_staging.stg_brewline__order_items .. [OK in 0.22s]\n06:00:02  5 of 41 START snapshot analytics_snapshots.snap_customers ...................... [RUN]\n06:00:02  7 of 41 START test not_null_stg_brewline__customers_customer_id ................ [RUN]\n06:00:02  6 of 41 PASS stg_brewline__orders::test_stg_orders_keeps_the_latest_version .... [PASS in 0.30s]\n06:00:02  13 of 41 START sql view model analytics_staging.stg_brewline__orders ........... [RUN]\n06:00:02  4 of 41 OK loaded seed file analytics_reference.country_names .................. [INSERT 4 in 0.20s]\n06:00:02  7 of 41 PASS not_null_stg_brewline__customers_customer_id ...................... [PASS in 0.19s]\n06:00:02  8 of 41 START test unique_stg_brewline__customers_customer_id .................. [RUN]\n06:00:02  9 of 41 START test not_null_stg_brewline__products_product_id .................. [RUN]\n06:00:02  5 of 41 OK snapshotted analytics_snapshots.snap_customers ...................... [OK in 0.26s]\n06:00:02  10 of 41 START test unique_stg_brewline__products_product_id ................... [RUN]\n06:00:02  13 of 41 OK created sql view model analytics_staging.stg_brewline__orders ...... [OK in 0.24s]\n06:00:02  8 of 41 PASS unique_stg_brewline__customers_customer_id ........................ [PASS in 0.08s]\n06:00:02  9 of 41 PASS not_null_stg_brewline__products_product_id ........................ [PASS in 0.07s]\n06:00:02  11 of 41 START test not_null_stg_brewline__order_items_order_id ................ [RUN]\n06:00:02  12 of 41 START test positive_value_stg_brewline__order_items_quantity .......... [RUN]\n06:00:02  14 of 41 START test accepted_values_stg_brewline__orders_order_status__PLACED__SHIPPED__CANCELLED  [RUN]\n06:00:02  10 of 41 PASS unique_stg_brewline__products_product_id ......................... [PASS in 0.10s]\n06:00:02  15 of 41 START test not_null_stg_brewline__orders_customer_id .................. [RUN]\n06:00:02  12 of 41 PASS positive_value_stg_brewline__order_items_quantity ................ [PASS in 0.09s]\n06:00:02  16 of 41 START test not_null_stg_brewline__orders_order_id ..................... [RUN]\n06:00:02  11 of 41 PASS not_null_stg_brewline__order_items_order_id ...................... [PASS in 0.11s]\n06:00:02  17 of 41 START test positive_value_stg_brewline__orders_order_total_usd ........ [RUN]\n06:00:02  14 of 41 PASS accepted_values_stg_brewline__orders_order_status__PLACED__SHIPPED__CANCELLED  [PASS in 0.10s]\n06:00:02  18 of 41 START test relationships_stg_brewline__orders_customer_id__customer_id__ref_stg_brewline__customers_  [RUN]\n06:00:02  16 of 41 PASS not_null_stg_brewline__orders_order_id ........................... [PASS in 0.07s]\n06:00:02  19 of 41 START test unique_stg_brewline__orders_order_id ....................... [RUN]\n06:00:02  15 of 41 PASS not_null_stg_brewline__orders_customer_id ........................ [PASS in 0.10s]\n06:00:02  20 of 41 START sql table model analytics_marts.dim_products_v1 ................. [RUN]\n06:00:02  17 of 41 PASS positive_value_stg_brewline__orders_order_total_usd .............. [PASS in 0.09s]\n06:00:02  21 of 41 START sql table model analytics_marts.dim_products_v2 ................. [RUN]\n06:00:02  18 of 41 PASS relationships_stg_brewline__orders_customer_id__customer_id__ref_stg_brewline__customers_  [PASS in 0.12s]\n06:00:02  19 of 41 PASS unique_stg_brewline__orders_order_id ............................. [PASS in 0.11s]\n06:00:02  23 of 41 START sql view model analytics_intermediate.int_orders__with_items .... [RUN]\n06:00:02  22 of 41 START sql table model analytics_marts.dim_customers ................... [RUN]\n06:00:02  21 of 41 OK created sql table model analytics_marts.dim_products_v2 ............ [OK in 0.09s]\n06:00:02  24 of 41 START test not_null_dim_products_v2_product_key ....................... [RUN]\n06:00:02  20 of 41 OK created sql table model analytics_marts.dim_products_v1 ............ [OK in 0.18s]\n06:00:02  25 of 41 START test unique_dim_products_v2_product_key ......................... [RUN]\n06:00:02  22 of 41 OK created sql table model analytics_marts.dim_customers .............. [OK in 0.15s]\n06:00:02  23 of 41 OK created sql view model analytics_intermediate.int_orders__with_items  [OK in 0.15s]\n06:00:02  26 of 41 START test not_null_dim_products_v1_product_key ....................... [RUN]\n06:00:02  24 of 41 PASS not_null_dim_products_v2_product_key ............................. [PASS in 0.10s]\n06:00:02  25 of 41 PASS unique_dim_products_v2_product_key ............................... [PASS in 0.09s]\n06:00:02  27 of 41 START test unique_dim_products_v1_product_key ......................... [RUN]\n06:00:02  28 of 41 START test not_null_dim_customers_customer_id ......................... [RUN]\n06:00:02  29 of 41 START test not_null_dim_customers_customer_key ........................ [RUN]\n06:00:02  28 of 41 PASS not_null_dim_customers_customer_id ............................... [PASS in 0.07s]\n06:00:02  30 of 41 START test unique_dim_customers_customer_id ........................... [RUN]\n06:00:02  26 of 41 PASS not_null_dim_products_v1_product_key ............................. [PASS in 0.10s]\n06:00:02  31 of 41 START test unique_dim_customers_customer_key .......................... [RUN]\n06:00:02  27 of 41 PASS unique_dim_products_v1_product_key ............................... [PASS in 0.10s]\n06:00:02  32 of 41 START test assert_order_total_matches_lines ........................... [RUN]\n06:00:02  29 of 41 PASS not_null_dim_customers_customer_key .............................. [PASS in 0.09s]\n06:00:02  30 of 41 PASS unique_dim_customers_customer_id ................................. [PASS in 0.05s]\n06:00:02  31 of 41 PASS unique_dim_customers_customer_key ................................ [PASS in 0.05s]\n06:00:02  32 of 41 WARN 2 assert_order_total_matches_lines ............................... [WARN 2 in 0.04s]\n06:00:02  33 of 41 START unit_test fct_orders::test_fct_orders_incremental_reads_only_new_versions  [RUN]\n06:00:03  33 of 41 PASS fct_orders::test_fct_orders_incremental_reads_only_new_versions .. [PASS in 0.07s]\n06:00:03  34 of 41 START sql incremental model analytics_marts.fct_orders ................ [RUN]\n06:00:03  34 of 41 OK created sql incremental model analytics_marts.fct_orders ........... [OK in 0.13s]\n06:00:03  37 of 41 START test unique_fct_orders_order_id ................................. [RUN]\n06:00:03  36 of 41 START test relationships_fct_orders_customer_id__customer_id__ref_dim_customers_  [RUN]\n06:00:03  35 of 41 START test not_null_fct_orders_order_id ............................... [RUN]\n06:00:03  35 of 41 PASS not_null_fct_orders_order_id ..................................... [PASS in 0.05s]\n06:00:03  37 of 41 PASS unique_fct_orders_order_id ....................................... [PASS in 0.06s]\n06:00:03  38 of 41 START sql table model analytics_marts.fct_daily_revenue ............... [RUN]\n06:00:03  36 of 41 PASS relationships_fct_orders_customer_id__customer_id__ref_dim_customers_  [PASS in 0.06s]\n06:00:03  38 of 41 OK created sql table model analytics_marts.fct_daily_revenue .......... [OK in 0.09s]\n06:00:03  41 of 41 START test unique_fct_daily_revenue_order_date ........................ [RUN]\n06:00:03  40 of 41 START test not_null_fct_daily_revenue_order_date ...................... [RUN]\n06:00:03  39 of 41 NO-OP exposure finance_dashboard ...................................... [NO-OP in 0.00s]\n06:00:03  40 of 41 PASS not_null_fct_daily_revenue_order_date ............................ [PASS in 0.03s]\n06:00:03  41 of 41 PASS unique_fct_daily_revenue_order_date .............................. [PASS in 0.04s]\n06:00:03\n06:00:03  Finished running 1 exposure, 1 incremental model, 1 seed, 1 snapshot, 4 table models, 26 data tests, 2 unit tests, 5 view models in 0 hours 0 minutes and 1.88 seconds (1.88s).\n06:00:03\n06:00:03  Completed with 1 warning:\n06:00:03\n06:00:03  [WARNING]: in test assert_order_total_matches_lines (tests/assert_order_total_matches_lines.sql)\n06:00:03  [WARNING]: Got 2 results, configured to warn if != 0\n06:00:03\n06:00:03    compiled code at target/compiled/brewline/tests/assert_order_total_matches_lines.sql\n06:00:03\n06:00:03  Done. PASS=39 WARN=1 ERROR=0 SKIP=0 NO-OP=1 REUSED=0 TOTAL=41",
  "build_day2": "06:00:00  Running with dbt=1.12.6\n06:00:01  Registered adapter: duckdb=1.11.1\n06:00:01  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:01\n06:00:01  Concurrency: 4 threads (target='prod')\n06:00:01\n06:00:02  6 of 41 START unit_test stg_brewline__orders::test_stg_orders_keeps_the_latest_version  [RUN]\n06:00:02  2 of 41 START sql view model analytics_staging.stg_brewline__order_items ....... [RUN]\n06:00:02  1 of 41 START sql view model analytics_staging.stg_brewline__customers ......... [RUN]\n06:00:02  3 of 41 START sql view model analytics_staging.stg_brewline__products .......... [RUN]\n06:00:02  1 of 41 OK created sql view model analytics_staging.stg_brewline__customers .... [OK in 0.31s]\n06:00:02  4 of 41 START seed file analytics_reference.country_names ...................... [RUN]\n06:00:02  2 of 41 OK created sql view model analytics_staging.stg_brewline__order_items .. [OK in 0.33s]\n06:00:02  3 of 41 OK created sql view model analytics_staging.stg_brewline__products ..... [OK in 0.31s]\n06:00:02  6 of 41 PASS stg_brewline__orders::test_stg_orders_keeps_the_latest_version .... [PASS in 0.36s]\n06:00:02  5 of 41 START snapshot analytics_snapshots.snap_customers ...................... [RUN]\n06:00:02  7 of 41 START test not_null_stg_brewline__customers_customer_id ................ [RUN]\n06:00:02  13 of 41 START sql view model analytics_staging.stg_brewline__orders ........... [RUN]\n06:00:02  4 of 41 OK loaded seed file analytics_reference.country_names .................. [INSERT 4 in 0.29s]\n06:00:02  8 of 41 START test unique_stg_brewline__customers_customer_id .................. [RUN]\n06:00:02  7 of 41 PASS not_null_stg_brewline__customers_customer_id ...................... [PASS in 0.27s]\n06:00:02  9 of 41 START test not_null_stg_brewline__order_items_order_id ................. [RUN]\n06:00:02  13 of 41 OK created sql view model analytics_staging.stg_brewline__orders ...... [OK in 0.30s]\n06:00:02  10 of 41 START test positive_value_stg_brewline__order_items_quantity .......... [RUN]\n06:00:02  8 of 41 PASS unique_stg_brewline__customers_customer_id ........................ [PASS in 0.09s]\n06:00:02  11 of 41 START test not_null_stg_brewline__products_product_id ................. [RUN]\n06:00:02  9 of 41 PASS not_null_stg_brewline__order_items_order_id ....................... [PASS in 0.10s]\n06:00:02  12 of 41 START test unique_stg_brewline__products_product_id ................... [RUN]\n06:00:02  10 of 41 PASS positive_value_stg_brewline__order_items_quantity ................ [PASS in 0.10s]\n06:00:02  11 of 41 PASS not_null_stg_brewline__products_product_id ....................... [PASS in 0.08s]\n06:00:02  14 of 41 START test accepted_values_stg_brewline__orders_order_status__PLACED__SHIPPED__CANCELLED  [RUN]\n06:00:02  15 of 41 START test not_null_stg_brewline__orders_customer_id .................. [RUN]\n06:00:02  12 of 41 PASS unique_stg_brewline__products_product_id ......................... [PASS in 0.10s]\n06:00:02  16 of 41 START test not_null_stg_brewline__orders_order_id ..................... [RUN]\n06:00:02  5 of 41 OK snapshotted analytics_snapshots.snap_customers ...................... [OK in 0.53s]\n06:00:02  17 of 41 START test positive_value_stg_brewline__orders_order_total_usd ........ [RUN]\n06:00:03  15 of 41 PASS not_null_stg_brewline__orders_customer_id ........................ [PASS in 0.11s]\n06:00:03  14 of 41 PASS accepted_values_stg_brewline__orders_order_status__PLACED__SHIPPED__CANCELLED  [PASS in 0.14s]\n06:00:03  18 of 41 START test relationships_stg_brewline__orders_customer_id__customer_id__ref_stg_brewline__customers_  [RUN]\n06:00:03  17 of 41 PASS positive_value_stg_brewline__orders_order_total_usd .............. [PASS in 0.05s]\n06:00:03  19 of 41 START test unique_stg_brewline__orders_order_id ....................... [RUN]\n06:00:03  16 of 41 PASS not_null_stg_brewline__orders_order_id ........................... [PASS in 0.09s]\n06:00:03  20 of 41 START sql table model analytics_marts.dim_products_v1 ................. [RUN]\n06:00:03  21 of 41 START sql table model analytics_marts.dim_products_v2 ................. [RUN]\n06:00:03  19 of 41 PASS unique_stg_brewline__orders_order_id ............................. [PASS in 0.15s]\n06:00:03  18 of 41 PASS relationships_stg_brewline__orders_customer_id__customer_id__ref_stg_brewline__customers_  [PASS in 0.17s]\n06:00:03  22 of 41 START sql view model analytics_intermediate.int_orders__with_items .... [RUN]\n06:00:03  23 of 41 START sql table model analytics_marts.dim_customers ................... [RUN]\n06:00:03  21 of 41 OK created sql table model analytics_marts.dim_products_v2 ............ [OK in 0.21s]\n06:00:03  24 of 41 START test not_null_dim_products_v2_product_key ....................... [RUN]\n06:00:03  20 of 41 OK created sql table model analytics_marts.dim_products_v1 ............ [OK in 0.27s]\n06:00:03  25 of 41 START test unique_dim_products_v2_product_key ......................... [RUN]\n06:00:03  22 of 41 OK created sql view model analytics_intermediate.int_orders__with_items  [OK in 0.16s]\n06:00:03  26 of 41 START test not_null_dim_products_v1_product_key ....................... [RUN]\n06:00:03  24 of 41 PASS not_null_dim_products_v2_product_key ............................. [PASS in 0.08s]\n06:00:03  27 of 41 START test unique_dim_products_v1_product_key ......................... [RUN]\n06:00:03  23 of 41 OK created sql table model analytics_marts.dim_customers .............. [OK in 0.20s]\n06:00:03  28 of 41 START test assert_order_total_matches_lines ........................... [RUN]\n06:00:03  25 of 41 PASS unique_dim_products_v2_product_key ............................... [PASS in 0.10s]\n06:00:03  29 of 41 START test not_null_dim_customers_customer_id ......................... [RUN]\n06:00:03  26 of 41 PASS not_null_dim_products_v1_product_key ............................. [PASS in 0.08s]\n06:00:03  30 of 41 START test not_null_dim_customers_customer_key ........................ [RUN]\n06:00:03  27 of 41 PASS unique_dim_products_v1_product_key ............................... [PASS in 0.08s]\n06:00:03  28 of 41 WARN 2 assert_order_total_matches_lines ............................... [WARN 2 in 0.07s]\n06:00:03  31 of 41 START test unique_dim_customers_customer_id ........................... [RUN]\n06:00:03  32 of 41 START test unique_dim_customers_customer_key .......................... [RUN]\n06:00:03  29 of 41 PASS not_null_dim_customers_customer_id ............................... [PASS in 0.08s]\n06:00:03  33 of 41 START unit_test fct_orders::test_fct_orders_incremental_reads_only_new_versions  [RUN]\n06:00:03  30 of 41 PASS not_null_dim_customers_customer_key .............................. [PASS in 0.08s]\n06:00:03  31 of 41 PASS unique_dim_customers_customer_id ................................. [PASS in 0.07s]\n06:00:03  32 of 41 PASS unique_dim_customers_customer_key ................................ [PASS in 0.07s]\n06:00:03  33 of 41 PASS fct_orders::test_fct_orders_incremental_reads_only_new_versions .. [PASS in 0.09s]\n06:00:03  34 of 41 START sql incremental model analytics_marts.fct_orders ................ [RUN]\n06:00:03  34 of 41 OK created sql incremental model analytics_marts.fct_orders ........... [OK in 0.09s]\n06:00:03  35 of 41 START test not_null_fct_orders_order_id ............................... [RUN]\n06:00:03  36 of 41 START test relationships_fct_orders_customer_id__customer_id__ref_dim_customers_  [RUN]\n06:00:03  37 of 41 START test unique_fct_orders_order_id ................................. [RUN]\n06:00:03  36 of 41 PASS relationships_fct_orders_customer_id__customer_id__ref_dim_customers_  [PASS in 0.06s]\n06:00:03  35 of 41 PASS not_null_fct_orders_order_id ..................................... [PASS in 0.07s]\n06:00:03  37 of 41 PASS unique_fct_orders_order_id ....................................... [PASS in 0.05s]\n06:00:03  38 of 41 START sql table model analytics_marts.fct_daily_revenue ............... [RUN]\n06:00:03  38 of 41 OK created sql table model analytics_marts.fct_daily_revenue .......... [OK in 0.08s]\n06:00:03  40 of 41 START test not_null_fct_daily_revenue_order_date ...................... [RUN]\n06:00:03  41 of 41 START test unique_fct_daily_revenue_order_date ........................ [RUN]\n06:00:03  39 of 41 NO-OP exposure finance_dashboard ...................................... [NO-OP in 0.00s]\n06:00:03  40 of 41 PASS not_null_fct_daily_revenue_order_date ............................ [PASS in 0.04s]\n06:00:03  41 of 41 PASS unique_fct_daily_revenue_order_date .............................. [PASS in 0.05s]\n06:00:03\n06:00:03  Finished running 1 exposure, 1 incremental model, 1 seed, 1 snapshot, 4 table models, 26 data tests, 2 unit tests, 5 view models in 0 hours 0 minutes and 2.16 seconds (2.16s).\n06:00:03\n06:00:03  Completed with 1 warning:\n06:00:03\n06:00:03  [WARNING]: in test assert_order_total_matches_lines (tests/assert_order_total_matches_lines.sql)\n06:00:03  [WARNING]: Got 2 results, configured to warn if != 0\n06:00:03\n06:00:03    compiled code at target/compiled/brewline/tests/assert_order_total_matches_lines.sql\n06:00:03\n06:00:03  Done. PASS=39 WARN=1 ERROR=0 SKIP=0 NO-OP=1 REUSED=0 TOTAL=41",
  "build_fail": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:01  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:01\n06:00:01  Concurrency: 4 threads (target='prod')\n06:00:01\n06:00:01  1 of 41 START sql view model analytics_staging.stg_brewline__customers ......... [RUN]\n06:00:01  6 of 41 START unit_test stg_brewline__orders::test_stg_orders_keeps_the_latest_version  [RUN]\n06:00:01  3 of 41 START sql view model analytics_staging.stg_brewline__products .......... [RUN]\n06:00:01  2 of 41 START sql view model analytics_staging.stg_brewline__order_items ....... [RUN]\n06:00:02  3 of 41 OK created sql view model analytics_staging.stg_brewline__products ..... [OK in 0.35s]\n06:00:02  4 of 41 START seed file analytics_reference.country_names ...................... [RUN]\n06:00:02  1 of 41 OK created sql view model analytics_staging.stg_brewline__customers .... [OK in 0.37s]\n06:00:02  2 of 41 OK created sql view model analytics_staging.stg_brewline__order_items .. [OK in 0.35s]\n06:00:02  5 of 41 START snapshot analytics_snapshots.snap_customers ...................... [RUN]\n06:00:02  6 of 41 PASS stg_brewline__orders::test_stg_orders_keeps_the_latest_version .... [PASS in 0.38s]\n06:00:02  7 of 41 START test not_null_stg_brewline__products_product_id .................. [RUN]\n06:00:02  13 of 41 START sql view model analytics_staging.stg_brewline__orders ........... [RUN]\n06:00:02  4 of 41 OK loaded seed file analytics_reference.country_names .................. [INSERT 4 in 0.15s]\n06:00:02  8 of 41 START test unique_stg_brewline__products_product_id .................... [RUN]\n06:00:02  7 of 41 PASS not_null_stg_brewline__products_product_id ........................ [PASS in 0.21s]\n06:00:02  8 of 41 PASS unique_stg_brewline__products_product_id .......................... [PASS in 0.10s]\n06:00:02  9 of 41 START test not_null_stg_brewline__customers_customer_id ................ [RUN]\n06:00:02  10 of 41 START test not_null_stg_brewline__order_items_order_id ................ [RUN]\n06:00:02  13 of 41 OK created sql view model analytics_staging.stg_brewline__orders ...... [OK in 0.25s]\n06:00:02  11 of 41 START test positive_value_stg_brewline__order_items_quantity .......... [RUN]\n06:00:02  10 of 41 PASS not_null_stg_brewline__order_items_order_id ...................... [PASS in 0.08s]\n06:00:02  12 of 41 START test unique_stg_brewline__customers_customer_id ................. [RUN]\n06:00:02  9 of 41 PASS not_null_stg_brewline__customers_customer_id ...................... [PASS in 0.12s]\n06:00:02  11 of 41 PASS positive_value_stg_brewline__order_items_quantity ................ [PASS in 0.07s]\n06:00:02  14 of 41 START sql table model analytics_marts.dim_products_v1 ................. [RUN]\n06:00:02  15 of 41 START sql table model analytics_marts.dim_products_v2 ................. [RUN]\n06:00:02  5 of 41 OK snapshotted analytics_snapshots.snap_customers ...................... [OK in 0.40s]\n06:00:02  16 of 41 START test accepted_values_stg_brewline__orders_order_status__PLACED__SHIPPED__CANCELLED  [RUN]\n06:00:02  12 of 41 PASS unique_stg_brewline__customers_customer_id ....................... [PASS in 0.16s]\n06:00:02  17 of 41 START test not_null_stg_brewline__orders_customer_id .................. [RUN]\n06:00:02  16 of 41 PASS accepted_values_stg_brewline__orders_order_status__PLACED__SHIPPED__CANCELLED  [PASS in 0.16s]\n06:00:02  17 of 41 PASS not_null_stg_brewline__orders_customer_id ........................ [PASS in 0.06s]\n06:00:02  18 of 41 START test not_null_stg_brewline__orders_order_id ..................... [RUN]\n06:00:02  19 of 41 START test positive_value_stg_brewline__orders_order_total_usd ........ [RUN]\n06:00:02  14 of 41 OK created sql table model analytics_marts.dim_products_v1 ............ [OK in 0.27s]\n06:00:02  20 of 41 START test relationships_stg_brewline__orders_customer_id__customer_id__ref_stg_brewline__customers_  [RUN]\n06:00:03  15 of 41 OK created sql table model analytics_marts.dim_products_v2 ............ [OK in 0.30s]\n06:00:03  18 of 41 PASS not_null_stg_brewline__orders_order_id ........................... [PASS in 0.09s]\n06:00:03  21 of 41 START test unique_stg_brewline__orders_order_id ....................... [RUN]\n06:00:03  22 of 41 START test not_null_dim_products_v1_product_key ....................... [RUN]\n06:00:03  19 of 41 PASS positive_value_stg_brewline__orders_order_total_usd .............. [PASS in 0.11s]\n06:00:03  23 of 41 START test unique_dim_products_v1_product_key ......................... [RUN]\n06:00:03  20 of 41 PASS relationships_stg_brewline__orders_customer_id__customer_id__ref_stg_brewline__customers_  [PASS in 0.11s]\n06:00:03  24 of 41 START test not_null_dim_products_v2_product_key ....................... [RUN]\n06:00:03  22 of 41 PASS not_null_dim_products_v1_product_key ............................. [PASS in 0.08s]\n06:00:03  21 of 41 PASS unique_stg_brewline__orders_order_id ............................. [PASS in 0.10s]\n06:00:03  23 of 41 PASS unique_dim_products_v1_product_key ............................... [PASS in 0.06s]\n06:00:03  25 of 41 START test unique_dim_products_v2_product_key ......................... [RUN]\n06:00:03  26 of 41 START sql table model analytics_marts.dim_customers ................... [RUN]\n06:00:03  27 of 41 START sql view model analytics_intermediate.int_orders__with_items .... [RUN]\n06:00:03  24 of 41 PASS not_null_dim_products_v2_product_key ............................. [PASS in 0.08s]\n06:00:03  25 of 41 PASS unique_dim_products_v2_product_key ............................... [PASS in 0.07s]\n06:00:03  26 of 41 ERROR creating sql table model analytics_marts.dim_customers .......... [ERROR in 0.09s]\n06:00:03  28 of 41 SKIP test not_null_dim_customers_customer_id .......................... [SKIP]\n06:00:03  31 of 41 SKIP test unique_dim_customers_customer_key ........................... [SKIP]\n06:00:03  29 of 41 SKIP test not_null_dim_customers_customer_key ......................... [SKIP]\n06:00:03  30 of 41 SKIP test unique_dim_customers_customer_id ............................ [SKIP]\n06:00:03  27 of 41 OK created sql view model analytics_intermediate.int_orders__with_items  [OK in 0.11s]\n06:00:03  32 of 41 START test assert_order_total_matches_lines ........................... [RUN]\n06:00:03  32 of 41 WARN 2 assert_order_total_matches_lines ............................... [WARN 2 in 0.02s]\n06:00:03  33 of 41 START unit_test fct_orders::test_fct_orders_incremental_reads_only_new_versions  [RUN]\n06:00:03  33 of 41 PASS fct_orders::test_fct_orders_incremental_reads_only_new_versions .. [PASS in 0.06s]\n06:00:03  34 of 41 START sql incremental model analytics_marts.fct_orders ................ [RUN]\n06:00:03  34 of 41 OK created sql incremental model analytics_marts.fct_orders ........... [OK in 0.12s]\n06:00:03  36 of 41 SKIP test relationships_fct_orders_customer_id__customer_id__ref_dim_customers_  [SKIP]\n06:00:03  37 of 41 START test unique_fct_orders_order_id ................................. [RUN]\n06:00:03  35 of 41 START test not_null_fct_orders_order_id ............................... [RUN]\n06:00:03  37 of 41 PASS unique_fct_orders_order_id ....................................... [PASS in 0.04s]\n06:00:03  35 of 41 PASS not_null_fct_orders_order_id ..................................... [PASS in 0.04s]\n06:00:03  38 of 41 START sql table model analytics_marts.fct_daily_revenue ............... [RUN]\n06:00:03  38 of 41 OK created sql table model analytics_marts.fct_daily_revenue .......... [OK in 0.08s]\n06:00:03  39 of 41 NO-OP exposure finance_dashboard ...................................... [NO-OP in 0.00s]\n06:00:03  41 of 41 START test unique_fct_daily_revenue_order_date ........................ [RUN]\n06:00:03  40 of 41 START test not_null_fct_daily_revenue_order_date ...................... [RUN]\n06:00:03  41 of 41 PASS unique_fct_daily_revenue_order_date .............................. [PASS in 0.03s]\n06:00:03  40 of 41 PASS not_null_fct_daily_revenue_order_date ............................ [PASS in 0.03s]\n06:00:03\n06:00:03  Finished running 1 exposure, 1 incremental model, 1 seed, 1 snapshot, 4 table models, 26 data tests, 2 unit tests, 5 view models in 0 hours 0 minutes and 1.98 seconds (1.98s).\n06:00:03\n06:00:03  Completed with 1 error, 0 partial successes, and 1 warning:\n06:00:03\n06:00:03  [ERROR]: in model dim_customers (models/marts/core/dim_customers.sql)\n06:00:03    Runtime Error in model dim_customers (models/marts/core/dim_customers.sql)\n  Binder Error: Values list \"n\" does not have a column named \"country_title\"\n\n  LINE 41: left join countries as n on n.country_code = c.country_code\n                                           ^^^^^^^^^^^^^^^\n06:00:03\n06:00:03    compiled code at target/compiled/brewline/models/marts/core/dim_customers.sql\n06:00:03\n06:00:03  [WARNING]: in test assert_order_total_matches_lines (tests/assert_order_total_matches_lines.sql)\n06:00:03  [WARNING]: Got 2 results, configured to warn if != 0\n06:00:03\n06:00:03    compiled code at target/compiled/brewline/tests/assert_order_total_matches_lines.sql\n06:00:03\n06:00:03  Done. PASS=33 WARN=1 ERROR=1 SKIP=5 NO-OP=1 REUSED=0 TOTAL=41",
  "build_fresh_fail": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:00  Unable to do partial parsing because saved manifest not found. Starting full parse.\n06:00:03  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:03\n06:00:03  Concurrency: 4 threads (target='prod')\n06:00:03\n06:00:03  3 of 41 START sql view model analytics_staging.stg_brewline__products .......... [RUN]\n06:00:03  6 of 41 START unit_test stg_brewline__orders::test_stg_orders_keeps_the_latest_version  [RUN]\n06:00:03  2 of 41 START sql view model analytics_staging.stg_brewline__order_items ....... [RUN]\n06:00:03  1 of 41 START sql view model analytics_staging.stg_brewline__customers ......... [RUN]\n06:00:03  2 of 41 OK created sql view model analytics_staging.stg_brewline__order_items .. [OK in 0.25s]\n06:00:03  1 of 41 OK created sql view model analytics_staging.stg_brewline__customers .... [OK in 0.25s]\n06:00:03  4 of 41 START seed file analytics_reference.country_names ...................... [RUN]\n06:00:03  3 of 41 OK created sql view model analytics_staging.stg_brewline__products ..... [OK in 0.30s]\n06:00:03  5 of 41 START snapshot analytics_snapshots.snap_customers ...................... [RUN]\n06:00:03  7 of 41 START test not_null_stg_brewline__order_items_order_id ................. [RUN]\n06:00:03  6 of 41 PASS stg_brewline__orders::test_stg_orders_keeps_the_latest_version .... [PASS in 0.37s]\n06:00:03  13 of 41 START sql view model analytics_staging.stg_brewline__orders ........... [RUN]\n06:00:03  4 of 41 OK loaded seed file analytics_reference.country_names .................. [INSERT 4 in 0.19s]\n06:00:03  8 of 41 START test positive_value_stg_brewline__order_items_quantity ........... [RUN]\n06:00:03  7 of 41 PASS not_null_stg_brewline__order_items_order_id ....................... [PASS in 0.19s]\n06:00:03  9 of 41 START test not_null_stg_brewline__customers_customer_id ................ [RUN]\n06:00:03  5 of 41 OK snapshotted analytics_snapshots.snap_customers ...................... [OK in 0.24s]\n06:00:03  13 of 41 OK created sql view model analytics_staging.stg_brewline__orders ...... [OK in 0.12s]\n06:00:03  10 of 41 START test unique_stg_brewline__customers_customer_id ................. [RUN]\n06:00:03  11 of 41 START test not_null_stg_brewline__products_product_id ................. [RUN]\n06:00:03  8 of 41 PASS positive_value_stg_brewline__order_items_quantity ................. [PASS in 0.09s]\n06:00:04  12 of 41 START test unique_stg_brewline__products_product_id ................... [RUN]\n06:00:04  9 of 41 PASS not_null_stg_brewline__customers_customer_id ...................... [PASS in 0.08s]\n06:00:04  14 of 41 START test accepted_values_stg_brewline__orders_order_status__PLACED__SHIPPED__CANCELLED  [RUN]\n06:00:04  11 of 41 PASS not_null_stg_brewline__products_product_id ....................... [PASS in 0.07s]\n06:00:04  15 of 41 START test not_null_stg_brewline__orders_customer_id .................. [RUN]\n06:00:04  10 of 41 PASS unique_stg_brewline__customers_customer_id ....................... [PASS in 0.09s]\n06:00:04  16 of 41 START test not_null_stg_brewline__orders_order_id ..................... [RUN]\n06:00:04  12 of 41 PASS unique_stg_brewline__products_product_id ......................... [PASS in 0.09s]\n06:00:04  14 of 41 PASS accepted_values_stg_brewline__orders_order_status__PLACED__SHIPPED__CANCELLED  [PASS in 0.09s]\n06:00:04  17 of 41 START test positive_value_stg_brewline__orders_order_total_usd ........ [RUN]\n06:00:04  18 of 41 START test relationships_stg_brewline__orders_customer_id__customer_id__ref_stg_brewline__customers_  [RUN]\n06:00:04  15 of 41 PASS not_null_stg_brewline__orders_customer_id ........................ [PASS in 0.09s]\n06:00:04  19 of 41 START test unique_stg_brewline__orders_order_id ....................... [RUN]\n06:00:04  16 of 41 PASS not_null_stg_brewline__orders_order_id ........................... [PASS in 0.10s]\n06:00:04  20 of 41 START sql table model analytics_marts.dim_products_v1 ................. [RUN]\n06:00:04  18 of 41 PASS relationships_stg_brewline__orders_customer_id__customer_id__ref_stg_brewline__customers_  [PASS in 0.09s]\n06:00:04  17 of 41 PASS positive_value_stg_brewline__orders_order_total_usd .............. [PASS in 0.12s]\n06:00:04  19 of 41 PASS unique_stg_brewline__orders_order_id ............................. [PASS in 0.09s]\n06:00:04  21 of 41 START sql table model analytics_marts.dim_products_v2 ................. [RUN]\n06:00:04  22 of 41 START sql table model analytics_marts.dim_customers ................... [RUN]\n06:00:04  23 of 41 START sql view model analytics_intermediate.int_orders__with_items .... [RUN]\n06:00:04  20 of 41 OK created sql table model analytics_marts.dim_products_v1 ............ [OK in 0.14s]\n06:00:04  24 of 41 START test not_null_dim_products_v1_product_key ....................... [RUN]\n06:00:04  21 of 41 OK created sql table model analytics_marts.dim_products_v2 ............ [OK in 0.12s]\n06:00:04  25 of 41 START test unique_dim_products_v1_product_key ......................... [RUN]\n06:00:04  23 of 41 OK created sql view model analytics_intermediate.int_orders__with_items  [OK in 0.13s]\n06:00:04  22 of 41 OK created sql table model analytics_marts.dim_customers .............. [OK in 0.13s]\n06:00:04  26 of 41 START test not_null_dim_products_v2_product_key ....................... [RUN]\n06:00:04  27 of 41 START test unique_dim_products_v2_product_key ......................... [RUN]\n06:00:04  24 of 41 PASS not_null_dim_products_v1_product_key ............................. [PASS in 0.09s]\n06:00:04  28 of 41 START test assert_order_total_matches_lines ........................... [RUN]\n06:00:04  25 of 41 PASS unique_dim_products_v1_product_key ............................... [PASS in 0.07s]\n06:00:04  29 of 41 START test not_null_dim_customers_customer_id ......................... [RUN]\n06:00:04  26 of 41 PASS not_null_dim_products_v2_product_key ............................. [PASS in 0.07s]\n06:00:04  30 of 41 START test not_null_dim_customers_customer_key ........................ [RUN]\n06:00:04  27 of 41 PASS unique_dim_products_v2_product_key ............................... [PASS in 0.08s]\n06:00:04  31 of 41 START test unique_dim_customers_customer_id ........................... [RUN]\n06:00:04  28 of 41 WARN 2 assert_order_total_matches_lines ............................... [WARN 2 in 0.08s]\n06:00:04  29 of 41 PASS not_null_dim_customers_customer_id ............................... [PASS in 0.07s]\n06:00:04  32 of 41 START test unique_dim_customers_customer_key .......................... [RUN]\n06:00:04  33 of 41 START unit_test fct_orders::test_fct_orders_incremental_reads_only_new_versions  [RUN]\n06:00:04  31 of 41 PASS unique_dim_customers_customer_id ................................. [PASS in 0.08s]\n06:00:04  30 of 41 PASS not_null_dim_customers_customer_key .............................. [PASS in 0.10s]\n06:00:04  32 of 41 PASS unique_dim_customers_customer_key ................................ [PASS in 0.07s]\n06:00:04  33 of 41 ERROR fct_orders::test_fct_orders_incremental_reads_only_new_versions . [ERROR in 0.07s]\n06:00:04  34 of 41 SKIP relation analytics_marts.fct_orders .............................. [SKIP]\n06:00:04  35 of 41 SKIP test not_null_fct_orders_order_id ................................ [SKIP]\n06:00:04  37 of 41 SKIP test unique_fct_orders_order_id .................................. [SKIP]\n06:00:04  36 of 41 SKIP test relationships_fct_orders_customer_id__customer_id__ref_dim_customers_  [SKIP]\n06:00:04  38 of 41 SKIP relation analytics_marts.fct_daily_revenue ....................... [SKIP]\n06:00:04  39 of 41 SKIP exposure finance_dashboard ....................................... [SKIP]\n06:00:04  41 of 41 SKIP test unique_fct_daily_revenue_order_date ......................... [SKIP]\n06:00:04  40 of 41 SKIP test not_null_fct_daily_revenue_order_date ....................... [SKIP]\n06:00:04\n06:00:04  Finished running 1 exposure, 1 incremental model, 1 seed, 1 snapshot, 4 table models, 26 data tests, 2 unit tests, 5 view models in 0 hours 0 minutes and 1.49 seconds (1.49s).\n06:00:04\n06:00:04  Completed with 1 error, 0 partial successes, and 1 warning:\n06:00:04\n06:00:04  [ERROR]: in unit_test test_fct_orders_incremental_reads_only_new_versions (models/marts/core/_core__unit_tests.yml)\n06:00:04    Compilation Error in model fct_orders (models/marts/core/_core__unit_tests.yml)\n  Not able to get columns for unit test 'fct_orders' from relation \"brewline\".\"analytics_marts\".\"fct_orders\" because the relation doesn't exist\n\n  > in macro get_fixture_sql (macros/unit_test_sql/get_fixture_sql.sql)\n  > called by model fct_orders (models/marts/core/_core__unit_tests.yml)\n06:00:04\n06:00:04  [WARNING]: in test assert_order_total_matches_lines (tests/assert_order_total_matches_lines.sql)\n06:00:04  [WARNING]: Got 2 results, configured to warn if != 0\n06:00:04\n06:00:04    compiled code at target/compiled/brewline/tests/assert_order_total_matches_lines.sql\n06:00:04\n06:00:04  Done. PASS=31 WARN=1 ERROR=1 SKIP=8 NO-OP=0 REUSED=0 TOTAL=41",
  "compile_all": "06:00:00  Running with dbt=1.12.6\n06:00:01  Registered adapter: duckdb=1.11.1\n06:00:01  Unable to do partial parsing because saved manifest not found. Starting full parse.\n06:00:03  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:03\n06:00:03  Concurrency: 4 threads (target='prod')\n10:24:20",
  "compile_inline": "06:00:00  Running with dbt=1.12.6\n06:00:01  Registered adapter: duckdb=1.11.1\n06:00:02  Found 15 models, 26 data tests, 1 seed, 1 snapshot, 1 sql operation, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:02\n06:00:02  Concurrency: 4 threads (target='prod')\n06:00:02\nCompiled inline node is:\nselect * from \"brewline\".\"analytics_staging\".\"stg_brewline__orders\" limit 3",
  "contract_fail": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:01  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:01\n06:00:01  Concurrency: 4 threads (target='prod')\n06:00:01\n06:00:01  1 of 1 START sql table model analytics_marts.fct_daily_revenue ................. [RUN]\n06:00:02  1 of 1 ERROR creating sql table model analytics_marts.fct_daily_revenue ........ [ERROR in 0.13s]\n06:00:02\n06:00:02  Finished running 1 table model in 0 hours 0 minutes and 0.31 seconds (0.31s).\n06:00:02\n06:00:02  Completed with 1 error, 0 partial successes, and 0 warnings:\n06:00:02\n06:00:02  [ERROR]: in model fct_daily_revenue (models/marts/finance/fct_daily_revenue.sql)\n06:00:02    Compilation Error in model fct_daily_revenue (models/marts/finance/fct_daily_revenue.sql)\n  This model has an enforced contract that failed.\n  Please ensure the name, data_type, and number of columns in your contract match the columns in your model's definition.\n\n  | column_name | definition_type | contract_type | mismatch_reason       |\n  | ----------- | --------------- | ------------- | --------------------- |\n  | revenue     | DECIMAL(38,2)   |               | missing in contract   |\n  | revenue_usd |                 | DECIMAL(38,2) | missing in definition |\n\n\n  > in macro assert_columns_equivalent (macros/relations/column/columns_spec_ddl.sql)\n  > called by macro default__get_assert_columns_equivalent (macros/relations/column/columns_spec_ddl.sql)\n  > called by macro get_assert_columns_equivalent (macros/relations/column/columns_spec_ddl.sql)\n  > called by macro duckdb__create_table_as (macros/adapters.sql)\n  > called by macro create_table_as (macros/adapters.sql)\n  > called by macro statement (macros/etc/statement.sql)\n  > called by macro materialization_table_duckdb (macros/materializations/table.sql)\n  > called by model fct_daily_revenue (models/marts/finance/fct_daily_revenue.sql)\n06:00:02\n06:00:02    compiled code at target/compiled/brewline/models/marts/finance/fct_daily_revenue.sql\n06:00:02\n06:00:02  Done. PASS=0 WARN=0 ERROR=1 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1",
  "debug": "06:00:00  Running with dbt=1.12.6\n06:00:00  dbt version: 1.12.6\n06:00:00  python version: 3.13.18\n06:00:00  python path: /home/me/.venv/bin/python3\n06:00:00  os info: Linux-6.18.44-fc-v310-x86_64-with-glibc2.39\n06:00:00  Using profiles dir at /workspace/brewline\n06:00:00  Using profiles.yml file at /workspace/brewline/profiles.yml\n06:00:00  Using dbt_project.yml file at /workspace/brewline/dbt_project.yml\n06:00:00  adapter type: duckdb\n06:00:00  adapter version: 1.11.1\n06:00:00  Configuration:\n06:00:00    profiles.yml file [OK found and valid]\n06:00:00    dbt_project.yml file [OK found and valid]\n06:00:00  Required dependencies:\n06:00:00   - git [OK found]\n\n06:00:00  Connection:\n06:00:00    database: brewline\n06:00:00    schema: analytics\n06:00:00    path: brewline.duckdb\n06:00:00    config_options: None\n06:00:00    extensions: None\n06:00:00    settings: {}\n06:00:00    external_root: .\n06:00:00    use_credential_provider: None\n06:00:00    attach: None\n06:00:00    filesystems: None\n06:00:00    remote: None\n06:00:00    plugins: None\n06:00:00    disable_transactions: False\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:01    Connection test: [OK connection ok]\n\n06:00:01  All checks passed!",
  "deps": "06:00:00  Running with dbt=1.12.6\n06:00:02  Updating lock file in file path: /workspace/brewline/package-lock.yml\n06:00:02  Installing https://github.com/dbt-labs/dbt-utils.git\n06:00:03  Installed from revision 49b932cb1f6fd0f7dfbf9048512db6415f570b20",
  "docs_generate": "06:00:00  Running with dbt=1.12.6\n06:00:01  Registered adapter: duckdb=1.11.1\n06:00:01  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:01\n06:00:01  Concurrency: 4 threads (target='prod')\n06:00:01\n06:00:02  Building catalog\n06:00:02  Catalog written to /workspace/brewline/target/catalog.json",
  "empty_run": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:01  Unable to do partial parsing because config vars, config profile, or config target have changed\n06:00:01  Unable to do partial parsing because profile has changed\n06:00:03  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:03\n06:00:03  Concurrency: 4 threads (target='dev')\n06:00:03\n06:00:03  1 of 1 START sql view model dev_alice_staging.stg_brewline__orders ............. [RUN]\n06:00:03  1 of 1 OK created sql view model dev_alice_staging.stg_brewline__orders ........ [OK in 0.08s]\n06:00:03\n06:00:03  Finished running 1 view model in 0 hours 0 minutes and 0.26 seconds (0.26s).\n06:00:03\n06:00:03  Completed successfully\n06:00:03\n06:00:03  Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1",
  "empty_shell": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:01  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:01\n06:00:01  Concurrency: 4 threads (target='prod')\n06:00:01\n06:00:01  1 of 4 START sql view model analytics_staging.stg_brewline__order_items ........ [RUN]\n06:00:01  2 of 4 START sql view model analytics_staging.stg_brewline__orders ............. [RUN]\n06:00:01  2 of 4 OK created sql view model analytics_staging.stg_brewline__orders ........ [OK in 0.11s]\n06:00:01  1 of 4 OK created sql view model analytics_staging.stg_brewline__order_items ... [OK in 0.12s]\n06:00:01  3 of 4 START sql view model analytics_intermediate.int_orders__with_items ...... [RUN]\n06:00:01  3 of 4 OK created sql view model analytics_intermediate.int_orders__with_items . [OK in 0.03s]\n06:00:01  4 of 4 START sql incremental model analytics_marts.fct_orders .................. [RUN]\n06:00:01  4 of 4 OK created sql incremental model analytics_marts.fct_orders ............. [OK in 0.08s]\n06:00:01\n06:00:01  Finished running 1 incremental model, 3 view models in 0 hours 0 minutes and 0.47 seconds (0.47s).\n06:00:01\n06:00:01  Completed successfully\n06:00:01\n06:00:01  Done. PASS=4 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=4",
  "ephemeral_compile": "06:00:00  Running with dbt=1.12.6\n06:00:01  Registered adapter: duckdb=1.11.1\n06:00:01  Unable to do partial parsing because a project config has changed\n06:00:03  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:03\n06:00:03  Concurrency: 4 threads (target='prod')\n06:00:03\nCompiled node 'fct_orders' is:\n\n\nwith __dbt__cte__int_orders__with_items as (\nwith items as (\n\n    select\n        order_id,\n        count(*) as item_lines,\n        sum(quantity) as units,\n        sum(line_total_usd) as items_total_usd\n    from \"brewline\".\"analytics_staging\".\"stg_brewline__order_items\"\n    group by order_id\n\n)\n\nselect\n    o.order_id,\n    o.customer_id,\n    o.ordered_at,\n    o.order_status,\n    o.order_total_usd,\n    o.loaded_at,\n    coalesce(i.item_lines, 0) as item_lines,\n    coalesce(i.units, 0) as units,\n    coalesce(i.items_total_usd, 0) as items_total_usd\nfrom \"brewline\".\"analytics_staging\".\"stg_brewline__orders\" as o\nleft join items as i on i.order_id = o.order_id\n) select\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom __dbt__cte__int_orders__with_items\n\n\nwhere loaded_at > (select coalesce(max(loaded_at), timestamp '1900-01-01') from \"brewline\".\"analytics_marts\".\"fct_orders\")",
  "first_run": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:00  Unable to do partial parsing because saved manifest not found. Starting full parse.\n06:00:03  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:03\n06:00:03  Concurrency: 4 threads (target='prod')\n06:00:03\n06:00:03  2 of 4 START sql view model analytics_staging.stg_brewline__orders ............. [RUN]\n06:00:03  1 of 4 START sql view model analytics_staging.stg_brewline__order_items ........ [RUN]\n06:00:03  1 of 4 OK created sql view model analytics_staging.stg_brewline__order_items ... [OK in 0.13s]\n06:00:03  2 of 4 OK created sql view model analytics_staging.stg_brewline__orders ........ [OK in 0.14s]\n06:00:03  3 of 4 START sql view model analytics_intermediate.int_orders__with_items ...... [RUN]\n06:00:03  3 of 4 OK created sql view model analytics_intermediate.int_orders__with_items . [OK in 0.03s]\n06:00:03  4 of 4 START sql incremental model analytics_marts.fct_orders .................. [RUN]\n06:00:03  4 of 4 OK created sql incremental model analytics_marts.fct_orders ............. [OK in 0.08s]\n06:00:03\n06:00:03  Finished running 1 incremental model, 3 view models in 0 hours 0 minutes and 0.48 seconds (0.48s).\n06:00:03\n06:00:03  Completed successfully\n06:00:03\n06:00:03  Done. PASS=4 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=4",
  "freshness_error": "06:00:00  Running with dbt=1.12.6\n06:00:01  Registered adapter: duckdb=1.11.1\n06:00:01  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:01\n06:00:01  Concurrency: 4 threads (target='prod')\n06:00:01\n06:00:01  1 of 1 START freshness of brewline.orders ...................................... [RUN]\n06:00:01  1 of 1 ERROR STALE freshness of brewline.orders ................................ [ERROR STALE in 0.02s]\n06:00:01\n06:00:01  Finished running 1 source in 0 hours 0 minutes and 0.16 seconds (0.16s).\n06:00:01\n06:00:01  [ERROR]: in source orders (models/staging/brewline/_brewline__sources.yml)\n06:00:01    Status: error\n06:00:01  Done.",
  "freshness_stale": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:01  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:01\n06:00:01  Concurrency: 4 threads (target='prod')\n06:00:01\n06:00:01  2 of 4 START freshness of brewline.order_items ................................. [RUN]\n06:00:01  3 of 4 START freshness of brewline.orders ...................................... [RUN]\n06:00:01  4 of 4 START freshness of brewline.products .................................... [RUN]\n06:00:01  1 of 4 START freshness of brewline.customers ................................... [RUN]\n06:00:01  4 of 4 ERROR STALE freshness of brewline.products .............................. [ERROR STALE in 0.06s]\n06:00:01  3 of 4 ERROR STALE freshness of brewline.orders ................................ [ERROR STALE in 0.06s]\n06:00:01  2 of 4 ERROR STALE freshness of brewline.order_items ........................... [ERROR STALE in 0.07s]\n06:00:01  1 of 4 ERROR STALE freshness of brewline.customers ............................. [ERROR STALE in 0.07s]\n06:00:01\n06:00:01  Finished running 4 sources in 0 hours 0 minutes and 0.23 seconds (0.23s).\n06:00:01\n06:00:01  [ERROR]: in source products (models/staging/brewline/_brewline__sources.yml)\n06:00:01    Status: error\n06:00:01\n06:00:01  [ERROR]: in source orders (models/staging/brewline/_brewline__sources.yml)\n06:00:01    Status: error\n06:00:01\n06:00:01  [ERROR]: in source order_items (models/staging/brewline/_brewline__sources.yml)\n06:00:01    Status: error\n06:00:01\n06:00:01  [ERROR]: in source customers (models/staging/brewline/_brewline__sources.yml)\n06:00:01    Status: error\n06:00:01  Done.",
  "freshness_warn": "06:00:00  Running with dbt=1.12.6\n06:00:01  Registered adapter: duckdb=1.11.1\n06:00:01  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:01\n06:00:01  Concurrency: 4 threads (target='prod')\n06:00:01\n06:00:01  1 of 1 START freshness of brewline.orders ...................................... [RUN]\n06:00:01  1 of 1 WARN freshness of brewline.orders ....................................... [WARN in 0.02s]\n06:00:01\n06:00:01  Finished running 1 source in 0 hours 0 minutes and 0.17 seconds (0.17s).\n06:00:01  Done.",
  "full_refresh": "06:00:00  Running with dbt=1.12.6\n06:00:01  Registered adapter: duckdb=1.11.1\n06:00:01  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:01\n06:00:01  Concurrency: 4 threads (target='prod')\n06:00:01\n06:00:02  1 of 1 START sql incremental model analytics_marts.fct_orders .................. [RUN]\n06:00:02  1 of 1 OK created sql incremental model analytics_marts.fct_orders ............. [OK in 0.15s]\n06:00:02\n06:00:02  Finished running 1 incremental model in 0 hours 0 minutes and 0.32 seconds (0.32s).\n06:00:02\n06:00:02  Completed successfully\n06:00:02\n06:00:02  Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1",
  "inc_bug_run": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:02  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:02\n06:00:02  Concurrency: 4 threads (target='prod')\n06:00:02\n06:00:02  1 of 1 START sql incremental model analytics_marts.fct_orders .................. [RUN]\n06:00:02  1 of 1 OK created sql incremental model analytics_marts.fct_orders ............. [OK in 0.14s]\n06:00:02\n06:00:02  Finished running 1 incremental model in 0 hours 0 minutes and 0.32 seconds (0.32s).\n06:00:02\n06:00:02  Completed successfully\n06:00:02\n06:00:02  Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1",
  "jinja_execute_bug": "06:00:00  Running with dbt=1.12.6\n06:00:01  Registered adapter: duckdb=1.11.1\n06:00:01  [ERROR]: Encountered an error:\nCompilation Error in model status_list (models/scratch/status_list.sql)\n  'None' has no attribute 'table'. This can happen when calling a macro that does not exist. Check for typos and/or install package dependencies with \"dbt deps\".",
  "jinja_parse": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:00  Unable to do partial parsing because config vars, config profile, or config target have changed\n06:00:03  Performance info: /workspace/brewline/target/perf_info.json",
  "jinja_run": "06:00:00  Running with dbt=1.12.6\n06:00:01  Registered adapter: duckdb=1.11.1\n06:00:01  Found 15 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:01\n06:00:01  Concurrency: 4 threads (target='prod')\n06:00:01\n06:00:02  3 of 4 START sql view model analytics.orders_by_status ......................... [RUN]\n06:00:02  4 of 4 START sql view model analytics.status_list .............................. [RUN]\n06:00:02  1 of 4 START sql view model analytics.cents_demo ............................... [RUN]\n06:00:02  2 of 4 START sql view model analytics.min_total ................................ [RUN]\n06:00:02  2 of 4 OK created sql view model analytics.min_total ........................... [OK in 0.16s]\n06:00:02  3 of 4 OK created sql view model analytics.orders_by_status .................... [OK in 0.20s]\n06:00:02  4 of 4 OK created sql view model analytics.status_list ......................... [OK in 0.19s]\n06:00:02  1 of 4 OK created sql view model analytics.cents_demo .......................... [OK in 0.18s]\n06:00:02\n06:00:02  Finished running 4 view models in 0 hours 0 minutes and 0.38 seconds (0.38s).\n06:00:02\n06:00:02  Completed successfully\n06:00:02\n06:00:02  Done. PASS=4 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=4",
  "jinja_sample_dev": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:00  Unable to do partial parsing because config vars, config profile, or config target have changed\n06:00:00  Unable to do partial parsing because profile has changed\n06:00:03  Found 15 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:03\n06:00:03  Concurrency: 4 threads (target='dev')\n06:00:03\nCompiled node 'customers_sample' is:\nselect customer_id, full_name, tier\nfrom \"brewline\".\"dev_alice_staging\".\"stg_brewline__customers\"\norder by customer_id\n\n\n    limit 2",
  "jinja_sample_prod": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:00  Unable to do partial parsing because config vars, config profile, or config target have changed\n06:00:00  Unable to do partial parsing because profile has changed\n06:00:03  Found 15 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:03\n06:00:03  Concurrency: 4 threads (target='prod')\n06:00:03\nCompiled node 'customers_sample' is:\nselect customer_id, full_name, tier\nfrom \"brewline\".\"analytics_staging\".\"stg_brewline__customers\"\norder by customer_id",
  "jinja_vars": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:00  Unable to do partial parsing because config vars, config profile, or config target have changed\n06:00:03  Found 15 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:03\n06:00:03  Concurrency: 4 threads (target='prod')\n06:00:03\nCompiled node 'min_total' is:\nselect order_id, order_total_usd\nfrom \"brewline\".\"analytics_staging\".\"stg_brewline__orders\"\nwhere order_total_usd >= 25\norder by order_id",
  "ls_tests_orders": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:01  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\nbrewline.staging.brewline.accepted_values_stg_brewline__orders_order_status__PLACED__SHIPPED__CANCELLED\nbrewline.staging.brewline.not_null_stg_brewline__orders_customer_id\nbrewline.staging.brewline.not_null_stg_brewline__orders_order_id\nbrewline.staging.brewline.positive_value_stg_brewline__orders_order_total_usd\nbrewline.staging.brewline.relationships_stg_brewline__orders_customer_id__customer_id__ref_stg_brewline__customers_\nbrewline.staging.brewline.unique_stg_brewline__orders_order_id",
  "ls_unit_tests": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:01  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\nunit_test:brewline.test_fct_orders_incremental_reads_only_new_versions\nunit_test:brewline.test_stg_orders_keeps_the_latest_version",
  "retry": "06:00:00  Running with dbt=1.12.6\n06:00:01  Registered adapter: duckdb=1.11.1\n06:00:02  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:02\n06:00:02  Concurrency: 4 threads (target='prod')\n06:00:02\n06:00:02  1 of 6 START sql table model analytics_marts.dim_customers ..................... [RUN]\n06:00:02  1 of 6 OK created sql table model analytics_marts.dim_customers ................ [OK in 0.15s]\n06:00:02  2 of 6 START test not_null_dim_customers_customer_id ........................... [RUN]\n06:00:02  4 of 6 START test relationships_fct_orders_customer_id__customer_id__ref_dim_customers_  [RUN]\n06:00:02  5 of 6 START test unique_dim_customers_customer_id ............................. [RUN]\n06:00:02  3 of 6 START test not_null_dim_customers_customer_key .......................... [RUN]\n06:00:02  5 of 6 PASS unique_dim_customers_customer_id ................................... [PASS in 0.12s]\n06:00:02  2 of 6 PASS not_null_dim_customers_customer_id ................................. [PASS in 0.14s]\n06:00:02  3 of 6 PASS not_null_dim_customers_customer_key ................................ [PASS in 0.12s]\n06:00:02  6 of 6 START test unique_dim_customers_customer_key ............................ [RUN]\n06:00:02  4 of 6 PASS relationships_fct_orders_customer_id__customer_id__ref_dim_customers_  [PASS in 0.14s]\n06:00:02  6 of 6 PASS unique_dim_customers_customer_key .................................. [PASS in 0.03s]\n06:00:02\n06:00:02  Finished running 1 table model, 5 data tests in 0 hours 0 minutes and 0.47 seconds (0.47s).\n06:00:02\n06:00:02  Completed successfully\n06:00:02\n06:00:02  Done. PASS=6 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=6",
  "schema_custom_dev": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:00  Unable to do partial parsing because config vars, config profile, or config target have changed\n06:00:00  Unable to do partial parsing because profile has changed\n06:00:03  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 631 macros, 1 group, 2 unit tests\n06:00:03\n06:00:03  Concurrency: 4 threads (target='dev')\n06:00:03\n06:00:03  1 of 1 START sql view model dev_alice.stg_brewline__customers .................. [RUN]\n06:00:03  1 of 1 OK created sql view model dev_alice.stg_brewline__customers ............. [OK in 0.08s]\n06:00:03\n06:00:03  Finished running 1 view model in 0 hours 0 minutes and 0.21 seconds (0.21s).\n06:00:03\n06:00:03  Completed successfully\n06:00:03\n06:00:03  Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1",
  "schema_custom_prod": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:01  Unable to do partial parsing because change detected to override macro. Starting full parse.\n06:00:03  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 631 macros, 1 group, 2 unit tests\n06:00:03\n06:00:03  Concurrency: 4 threads (target='prod')\n06:00:03\n06:00:03  1 of 1 START sql view model staging.stg_brewline__customers .................... [RUN]\n06:00:03  1 of 1 OK created sql view model staging.stg_brewline__customers ............... [OK in 0.07s]\n06:00:03\n06:00:03  Finished running 1 view model in 0 hours 0 minutes and 0.24 seconds (0.24s).\n06:00:03\n06:00:03  Completed successfully\n06:00:03\n06:00:03  Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1",
  "schema_default_dev": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:00  Unable to do partial parsing because config vars, config profile, or config target have changed\n06:00:00  Unable to do partial parsing because profile has changed\n06:00:02  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:02\n06:00:02  Concurrency: 4 threads (target='dev')\n06:00:02\n06:00:03  1 of 1 START sql view model dev_alice_staging.stg_brewline__customers .......... [RUN]\n06:00:03  1 of 1 OK created sql view model dev_alice_staging.stg_brewline__customers ..... [OK in 0.08s]\n06:00:03\n06:00:03  Finished running 1 view model in 0 hours 0 minutes and 0.25 seconds (0.25s).\n06:00:03\n06:00:03  Completed successfully\n06:00:03\n06:00:03  Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1",
  "schema_default_prod": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:01  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:01\n06:00:01  Concurrency: 4 threads (target='prod')\n06:00:01\n06:00:01  1 of 1 START sql view model analytics_staging.stg_brewline__customers .......... [RUN]\n06:00:01  1 of 1 OK created sql view model analytics_staging.stg_brewline__customers ..... [OK in 0.08s]\n06:00:01\n06:00:01  Finished running 1 view model in 0 hours 0 minutes and 0.24 seconds (0.24s).\n06:00:01\n06:00:01  Completed successfully\n06:00:01\n06:00:01  Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1",
  "show": "06:00:00  Running with dbt=1.12.6\n06:00:01  Registered adapter: duckdb=1.11.1\n06:00:01  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:01\n06:00:01  Concurrency: 4 threads (target='prod')\n06:00:01\nPreviewing node 'fct_daily_revenue':\n| order_date | orders | revenue_usd |\n| ---------- | ------ | ----------- |\n| 2026-03-14 |      3 |       107.5 |\n| 2026-03-15 |      1 |        55.0 |\n| 2026-03-16 |      2 |        60.5 |\n| 2026-03-17 |      3 |        89.0 |",
  "show_inline": "06:00:00  Running with dbt=1.12.6\n06:00:01  Registered adapter: duckdb=1.11.1\n06:00:01  Found 15 models, 26 data tests, 1 seed, 1 snapshot, 1 sql operation, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:01\n06:00:01  Concurrency: 4 threads (target='prod')\n06:00:01\nPreviewing inline node:\n| dollars |\n| ------- |\n|      67 |",
  "slim_defer": "06:00:00  Running with dbt=1.12.6\n06:00:01  Registered adapter: duckdb=1.11.1\n06:00:01  Unable to do partial parsing because config vars, config profile, or config target have changed\n06:00:01  Unable to do partial parsing because profile has changed\n06:00:04  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:04\n06:00:04  Concurrency: 4 threads (target='dev')\n06:00:04\n06:00:04  1 of 10 START sql view model dev_alice_staging.stg_brewline__customers ......... [RUN]\n06:00:04  1 of 10 OK created sql view model dev_alice_staging.stg_brewline__customers .... [OK in 0.08s]\n06:00:04  2 of 10 START test not_null_stg_brewline__customers_customer_id ................ [RUN]\n06:00:04  3 of 10 START test relationships_stg_brewline__orders_customer_id__customer_id__ref_stg_brewline__customers_  [RUN]\n06:00:04  4 of 10 START test unique_stg_brewline__customers_customer_id .................. [RUN]\n06:00:04  4 of 10 PASS unique_stg_brewline__customers_customer_id ........................ [PASS in 0.09s]\n06:00:04  3 of 10 PASS relationships_stg_brewline__orders_customer_id__customer_id__ref_stg_brewline__customers_  [PASS in 0.11s]\n06:00:04  2 of 10 PASS not_null_stg_brewline__customers_customer_id ...................... [PASS in 0.11s]\n06:00:04  5 of 10 START sql table model dev_alice_marts.dim_customers .................... [RUN]\n06:00:04  5 of 10 OK created sql table model dev_alice_marts.dim_customers ............... [OK in 0.09s]\n06:00:04  7 of 10 START test not_null_dim_customers_customer_key ......................... [RUN]\n06:00:04  8 of 10 START test relationships_fct_orders_customer_id__customer_id__ref_dim_customers_  [RUN]\n06:00:04  6 of 10 START test not_null_dim_customers_customer_id .......................... [RUN]\n06:00:04  9 of 10 START test unique_dim_customers_customer_id ............................ [RUN]\n06:00:04  7 of 10 PASS not_null_dim_customers_customer_key ............................... [PASS in 0.08s]\n06:00:04  10 of 10 START test unique_dim_customers_customer_key .......................... [RUN]\n06:00:04  8 of 10 PASS relationships_fct_orders_customer_id__customer_id__ref_dim_customers_  [PASS in 0.08s]\n06:00:04  9 of 10 PASS unique_dim_customers_customer_id .................................. [PASS in 0.09s]\n06:00:04  6 of 10 PASS not_null_dim_customers_customer_id ................................ [PASS in 0.09s]\n06:00:04  10 of 10 PASS unique_dim_customers_customer_key ................................ [PASS in 0.04s]\n06:00:04\n06:00:04  Finished running 1 table model, 8 data tests, 1 view model in 0 hours 0 minutes and 0.67 seconds (0.67s).\n06:00:05\n06:00:05  Completed successfully\n06:00:05\n06:00:05  Done. PASS=10 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=10",
  "slim_ls": "06:00:00  Running with dbt=1.12.6\n06:00:01  Registered adapter: duckdb=1.11.1\n06:00:02  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\nbrewline.marts.core.dim_customers\nbrewline.staging.brewline.stg_brewline__customers",
  "slim_nodefer": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:00  Unable to do partial parsing because config vars, config profile, or config target have changed\n06:00:00  Unable to do partial parsing because profile has changed\n06:00:03  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:03\n06:00:03  Concurrency: 4 threads (target='dev')\n06:00:03\n06:00:03  1 of 10 START sql view model dev_alice_staging.stg_brewline__customers ......... [RUN]\n06:00:03  1 of 10 OK created sql view model dev_alice_staging.stg_brewline__customers .... [OK in 0.07s]\n06:00:03  3 of 10 START test relationships_stg_brewline__orders_customer_id__customer_id__ref_stg_brewline__customers_  [RUN]\n06:00:03  4 of 10 START test unique_stg_brewline__customers_customer_id .................. [RUN]\n06:00:03  2 of 10 START test not_null_stg_brewline__customers_customer_id ................ [RUN]\n06:00:03  4 of 10 PASS unique_stg_brewline__customers_customer_id ........................ [PASS in 0.10s]\n06:00:03  2 of 10 PASS not_null_stg_brewline__customers_customer_id ...................... [PASS in 0.10s]\n06:00:03  3 of 10 ERROR relationships_stg_brewline__orders_customer_id__customer_id__ref_stg_brewline__customers_  [ERROR in 0.12s]\n06:00:03  5 of 10 SKIP relation dev_alice_marts.dim_customers ............................ [SKIP]\n06:00:03  7 of 10 SKIP test not_null_dim_customers_customer_key .......................... [SKIP]\n06:00:03  10 of 10 SKIP test unique_dim_customers_customer_key ........................... [SKIP]\n06:00:03  8 of 10 SKIP test relationships_fct_orders_customer_id__customer_id__ref_dim_customers_  [SKIP]\n06:00:03  9 of 10 SKIP test unique_dim_customers_customer_id ............................. [SKIP]\n06:00:03  6 of 10 SKIP test not_null_dim_customers_customer_id ........................... [SKIP]\n06:00:03\n06:00:03  Finished running 1 table model, 8 data tests, 1 view model in 0 hours 0 minutes and 0.41 seconds (0.41s).\n06:00:03\n06:00:03  Completed with 1 error, 0 partial successes, and 0 warnings:\n06:00:03\n06:00:03  [ERROR]: in test relationships_stg_brewline__orders_customer_id__customer_id__ref_stg_brewline__customers_ (models/staging/brewline/_brewline__models.yml)\n06:00:03    Runtime Error in test relationships_stg_brewline__orders_customer_id__customer_id__ref_stg_brewline__customers_ (models/staging/brewline/_brewline__models.yml)\n  Catalog Error: Table with name stg_brewline__orders does not exist!\n  Did you mean \"analytics_staging.stg_brewline__orders\"?\n\n  LINE 26: from child\n               ^^^^^^\n06:00:03\n06:00:03    compiled code at target/compiled/brewline/models/staging/brewline/_brewline__models.yml/relationships_stg_brewline__or_87f38ce99566346eabf0d27dba43d03c.sql\n06:00:03\n06:00:03  Done. PASS=3 WARN=0 ERROR=1 SKIP=6 NO-OP=0 REUSED=0 TOTAL=10",
  "slowest_build": "06:00:00  Running with dbt=1.12.6\n06:00:01  Registered adapter: duckdb=1.11.1\n06:00:01  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:01\n06:00:01  Concurrency: 4 threads (target='prod')\n06:00:01\n06:00:02  1 of 21 START sql view model analytics_staging.stg_brewline__order_items ....... [RUN]\n06:00:02  2 of 21 START unit_test stg_brewline__orders::test_stg_orders_keeps_the_latest_version  [RUN]\n06:00:02  1 of 21 OK created sql view model analytics_staging.stg_brewline__order_items .. [OK in 0.20s]\n06:00:02  4 of 21 START test positive_value_stg_brewline__order_items_quantity ........... [RUN]\n06:00:02  3 of 21 START test not_null_stg_brewline__order_items_order_id ................. [RUN]\n06:00:02  2 of 21 PASS stg_brewline__orders::test_stg_orders_keeps_the_latest_version .... [PASS in 0.23s]\n06:00:02  5 of 21 START sql view model analytics_staging.stg_brewline__orders ............ [RUN]\n06:00:02  4 of 21 PASS positive_value_stg_brewline__order_items_quantity ................. [PASS in 0.09s]\n06:00:02  3 of 21 PASS not_null_stg_brewline__order_items_order_id ....................... [PASS in 0.09s]\n06:00:02  5 of 21 OK created sql view model analytics_staging.stg_brewline__orders ....... [OK in 0.06s]\n06:00:02  9 of 21 START test positive_value_stg_brewline__orders_order_total_usd ......... [RUN]\n06:00:02  6 of 21 START test accepted_values_stg_brewline__orders_order_status__PLACED__SHIPPED__CANCELLED  [RUN]\n06:00:02  7 of 21 START test not_null_stg_brewline__orders_customer_id ................... [RUN]\n06:00:02  8 of 21 START test not_null_stg_brewline__orders_order_id ...................... [RUN]\n06:00:02  8 of 21 PASS not_null_stg_brewline__orders_order_id ............................ [PASS in 0.06s]\n06:00:02  10 of 21 START test relationships_stg_brewline__orders_customer_id__customer_id__ref_stg_brewline__customers_  [RUN]\n06:00:02  9 of 21 PASS positive_value_stg_brewline__orders_order_total_usd ............... [PASS in 0.09s]\n06:00:02  6 of 21 PASS accepted_values_stg_brewline__orders_order_status__PLACED__SHIPPED__CANCELLED  [PASS in 0.08s]\n06:00:02  7 of 21 PASS not_null_stg_brewline__orders_customer_id ......................... [PASS in 0.08s]\n06:00:02  11 of 21 START test unique_stg_brewline__orders_order_id ....................... [RUN]\n06:00:02  11 of 21 PASS unique_stg_brewline__orders_order_id ............................. [PASS in 0.04s]\n06:00:02  12 of 21 START sql view model analytics_intermediate.int_orders__with_items .... [RUN]\n06:00:02  10 of 21 PASS relationships_stg_brewline__orders_customer_id__customer_id__ref_stg_brewline__customers_  [PASS in 0.06s]\n06:00:02  12 of 21 OK created sql view model analytics_intermediate.int_orders__with_items  [OK in 0.04s]\n06:00:02  13 of 21 START test assert_order_total_matches_lines ........................... [RUN]\n06:00:02  13 of 21 WARN 2 assert_order_total_matches_lines ............................... [WARN 2 in 0.02s]\n06:00:02  14 of 21 START unit_test fct_orders::test_fct_orders_incremental_reads_only_new_versions  [RUN]\n06:00:02  14 of 21 PASS fct_orders::test_fct_orders_incremental_reads_only_new_versions .. [PASS in 0.07s]\n06:00:02  15 of 21 START sql incremental model analytics_marts.fct_orders ................ [RUN]\n06:00:02  15 of 21 OK created sql incremental model analytics_marts.fct_orders ........... [OK in 0.10s]\n06:00:02  17 of 21 START test relationships_fct_orders_customer_id__customer_id__ref_dim_customers_  [RUN]\n06:00:02  16 of 21 START test not_null_fct_orders_order_id ............................... [RUN]\n06:00:02  18 of 21 START test unique_fct_orders_order_id ................................. [RUN]\n06:00:02  17 of 21 PASS relationships_fct_orders_customer_id__customer_id__ref_dim_customers_  [PASS in 0.05s]\n06:00:02  18 of 21 PASS unique_fct_orders_order_id ....................................... [PASS in 0.04s]\n06:00:02  16 of 21 PASS not_null_fct_orders_order_id ..................................... [PASS in 0.06s]\n06:00:02  19 of 21 START sql table model analytics_marts.fct_daily_revenue ............... [RUN]\n06:00:02  19 of 21 OK created sql table model analytics_marts.fct_daily_revenue .......... [OK in 0.15s]\n06:00:02  20 of 21 START test not_null_fct_daily_revenue_order_date ...................... [RUN]\n06:00:02  21 of 21 START test unique_fct_daily_revenue_order_date ........................ [RUN]\n06:00:03  20 of 21 PASS not_null_fct_daily_revenue_order_date ............................ [PASS in 0.04s]\n06:00:03  21 of 21 PASS unique_fct_daily_revenue_order_date .............................. [PASS in 0.04s]\n06:00:03\n06:00:03  Finished running 1 incremental model, 1 table model, 14 data tests, 2 unit tests, 3 view models in 0 hours 0 minutes and 1.19 seconds (1.19s).\n06:00:03\n06:00:03  Completed with 1 warning:\n06:00:03\n06:00:03  [WARNING]: in test assert_order_total_matches_lines (tests/assert_order_total_matches_lines.sql)\n06:00:03  [WARNING]: Got 2 results, configured to warn if != 0\n06:00:03\n06:00:03    compiled code at target/compiled/brewline/tests/assert_order_total_matches_lines.sql\n06:00:03\n06:00:03  Done. PASS=20 WARN=1 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=21",
  "snap_check_run1": "06:00:00  Running with dbt=1.12.6\n06:00:01  Registered adapter: duckdb=1.11.1\n06:00:01  Unable to do partial parsing because saved manifest not found. Starting full parse.\n06:00:03  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:03\n06:00:03  Concurrency: 4 threads (target='prod')\n06:00:03\n06:00:03  1 of 1 START snapshot analytics_snapshots.snap_customers ....................... [RUN]\n06:00:03  1 of 1 OK snapshotted analytics_snapshots.snap_customers ....................... [OK in 0.12s]\n06:00:03\n06:00:03  Finished running 1 snapshot in 0 hours 0 minutes and 0.29 seconds (0.29s).\n06:00:03\n06:00:03  Completed successfully\n06:00:03\n06:00:03  Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1",
  "snap_check_run2": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:00  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:00\n06:00:00  Concurrency: 4 threads (target='prod')\n06:00:00\n06:00:00  1 of 1 START snapshot analytics_snapshots.snap_customers ....................... [RUN]\n06:00:01  1 of 1 OK snapshotted analytics_snapshots.snap_customers ....................... [OK in 0.31s]\n06:00:01\n06:00:01  Finished running 1 snapshot in 0 hours 0 minutes and 0.49 seconds (0.49s).\n06:00:01\n06:00:01  Completed successfully\n06:00:01\n06:00:01  Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1",
  "strategy_append": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:02  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:02\n06:00:02  Concurrency: 4 threads (target='prod')\n06:00:02\n06:00:02  1 of 1 START sql incremental model analytics_marts.fct_orders .................. [RUN]\n06:00:02  1 of 1 OK created sql incremental model analytics_marts.fct_orders ............. [OK in 0.13s]\n06:00:02\n06:00:02  Finished running 1 incremental model in 0 hours 0 minutes and 0.30 seconds (0.30s).\n06:00:02\n06:00:02  Completed successfully\n06:00:02\n06:00:02  Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1",
  "strategy_append_test": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:01  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:01\n06:00:01  Concurrency: 4 threads (target='prod')\n06:00:01\n06:00:01  1 of 4 START test not_null_fct_orders_order_id ................................. [RUN]\n06:00:01  3 of 4 START test unique_fct_orders_order_id ................................... [RUN]\n06:00:01  4 of 4 START unit_test fct_orders::test_fct_orders_incremental_reads_only_new_versions  [RUN]\n06:00:01  2 of 4 START test relationships_fct_orders_customer_id__customer_id__ref_dim_customers_  [RUN]\n06:00:01  3 of 4 FAIL 1 unique_fct_orders_order_id ....................................... [FAIL 1 in 0.21s]\n06:00:01  2 of 4 PASS relationships_fct_orders_customer_id__customer_id__ref_dim_customers_  [PASS in 0.22s]\n06:00:01  1 of 4 PASS not_null_fct_orders_order_id ....................................... [PASS in 0.23s]\n06:00:01  4 of 4 PASS fct_orders::test_fct_orders_incremental_reads_only_new_versions .... [PASS in 0.27s]\n06:00:01\n06:00:01  Finished running 3 data tests, 1 unit test in 0 hours 0 minutes and 0.43 seconds (0.43s).\n06:00:01\n06:00:01  Completed with 1 error, 0 partial successes, and 0 warnings:\n06:00:01\n06:00:01  [ERROR]: in test unique_fct_orders_order_id (models/marts/_marts__models.yml)\n06:00:01    Got 1 result, configured to fail if != 0\n06:00:01\n06:00:01    compiled code at target/compiled/brewline/models/marts/_marts__models.yml/unique_fct_orders_order_id.sql\n06:00:01\n06:00:01  Done. PASS=3 WARN=0 ERROR=1 SKIP=0 NO-OP=0 REUSED=0 TOTAL=4",
  "strategy_delete_insert": "06:00:00  Running with dbt=1.12.6\n06:00:01  Registered adapter: duckdb=1.11.1\n06:00:02  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:02\n06:00:02  Concurrency: 4 threads (target='prod')\n06:00:02\n06:00:02  1 of 1 START sql incremental model analytics_marts.fct_orders .................. [RUN]\n06:00:02  1 of 1 OK created sql incremental model analytics_marts.fct_orders ............. [OK in 0.15s]\n06:00:02\n06:00:02  Finished running 1 incremental model in 0 hours 0 minutes and 0.33 seconds (0.33s).\n06:00:02\n06:00:02  Completed successfully\n06:00:02\n06:00:02  Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1",
  "strategy_delete_insert_test": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:01  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:01\n06:00:01  Concurrency: 4 threads (target='prod')\n06:00:01\n06:00:01  4 of 4 START unit_test fct_orders::test_fct_orders_incremental_reads_only_new_versions  [RUN]\n06:00:01  1 of 4 START test not_null_fct_orders_order_id ................................. [RUN]\n06:00:01  2 of 4 START test relationships_fct_orders_customer_id__customer_id__ref_dim_customers_  [RUN]\n06:00:01  3 of 4 START test unique_fct_orders_order_id ................................... [RUN]\n06:00:01  3 of 4 PASS unique_fct_orders_order_id ......................................... [PASS in 0.25s]\n06:00:01  1 of 4 PASS not_null_fct_orders_order_id ....................................... [PASS in 0.26s]\n06:00:01  2 of 4 PASS relationships_fct_orders_customer_id__customer_id__ref_dim_customers_  [PASS in 0.28s]\n06:00:01  4 of 4 PASS fct_orders::test_fct_orders_incremental_reads_only_new_versions .... [PASS in 0.34s]\n06:00:01\n06:00:01  Finished running 3 data tests, 1 unit test in 0 hours 0 minutes and 0.49 seconds (0.49s).\n06:00:01\n06:00:01  Completed successfully\n06:00:01\n06:00:01  Done. PASS=4 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=4",
  "strategy_merge": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:01  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:01\n06:00:01  Concurrency: 4 threads (target='prod')\n06:00:01\n06:00:01  1 of 1 START sql incremental model analytics_marts.fct_orders .................. [RUN]\n06:00:01  1 of 1 OK created sql incremental model analytics_marts.fct_orders ............. [OK in 0.20s]\n06:00:01\n06:00:01  Finished running 1 incremental model in 0 hours 0 minutes and 0.38 seconds (0.38s).\n06:00:01\n06:00:01  Completed successfully\n06:00:01\n06:00:01  Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1",
  "strategy_merge_test": "06:00:00  Running with dbt=1.12.6\n06:00:01  Registered adapter: duckdb=1.11.1\n06:00:01  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:01\n06:00:01  Concurrency: 4 threads (target='prod')\n06:00:01\n06:00:01  1 of 4 START test not_null_fct_orders_order_id ................................. [RUN]\n06:00:01  2 of 4 START test relationships_fct_orders_customer_id__customer_id__ref_dim_customers_  [RUN]\n06:00:01  4 of 4 START unit_test fct_orders::test_fct_orders_incremental_reads_only_new_versions  [RUN]\n06:00:01  3 of 4 START test unique_fct_orders_order_id ................................... [RUN]\n06:00:02  2 of 4 PASS relationships_fct_orders_customer_id__customer_id__ref_dim_customers_  [PASS in 0.19s]\n06:00:02  1 of 4 PASS not_null_fct_orders_order_id ....................................... [PASS in 0.21s]\n06:00:02  3 of 4 PASS unique_fct_orders_order_id ......................................... [PASS in 0.21s]\n06:00:02  4 of 4 PASS fct_orders::test_fct_orders_incremental_reads_only_new_versions .... [PASS in 0.27s]\n06:00:02\n06:00:02  Finished running 3 data tests, 1 unit test in 0 hours 0 minutes and 0.42 seconds (0.42s).\n06:00:02\n06:00:02  Completed successfully\n06:00:02\n06:00:02  Done. PASS=4 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=4",
  "strategy_microbatch": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:01  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:01\n06:00:01  Concurrency: 4 threads (target='prod')\n06:00:01\n06:00:01  1 of 1 START sql microbatch model analytics_marts.fct_orders ................... [RUN]\n06:00:01  Batch 1 of 2 START batch 2026-03-17 of analytics_marts.fct_orders .................... [RUN]\n06:00:01  Batch 1 of 2 OK created batch 2026-03-17 of analytics_marts.fct_orders ............... [OK in 0.16s]\n06:00:01  Batch 2 of 2 START batch 2026-03-18 of analytics_marts.fct_orders .................... [RUN]\n06:00:01  Batch 2 of 2 OK created batch 2026-03-18 of analytics_marts.fct_orders ............... [OK in 0.03s]\n06:00:01  1 of 1 OK created sql microbatch model analytics_marts.fct_orders .............. [SUCCESS in 0.20s]\n06:00:01\n06:00:01  Finished running 1 incremental model in 0 hours 0 minutes and 0.36 seconds (0.36s).\n06:00:01\n06:00:01  Completed successfully\n06:00:01\n06:00:01  Done. PASS=1 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=1",
  "test_fail": "06:00:00  Running with dbt=1.12.6\n06:00:01  Registered adapter: duckdb=1.11.1\n06:00:01  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:01\n06:00:01  Concurrency: 4 threads (target='prod')\n06:00:01\n06:00:02  3 of 7 START test not_null_stg_brewline__orders_order_id ....................... [RUN]\n06:00:02  2 of 7 START test not_null_stg_brewline__orders_customer_id .................... [RUN]\n06:00:02  4 of 7 START test positive_value_stg_brewline__orders_order_total_usd .......... [RUN]\n06:00:02  1 of 7 START test accepted_values_stg_brewline__orders_order_status__PLACED__SHIPPED__CANCELLED  [RUN]\n06:00:02  4 of 7 PASS positive_value_stg_brewline__orders_order_total_usd ................ [PASS in 0.15s]\n06:00:02  1 of 7 FAIL 1 accepted_values_stg_brewline__orders_order_status__PLACED__SHIPPED__CANCELLED  [FAIL 1 in 0.15s]\n06:00:02  2 of 7 PASS not_null_stg_brewline__orders_customer_id .......................... [PASS in 0.16s]\n06:00:02  5 of 7 START test relationships_stg_brewline__orders_customer_id__customer_id__ref_stg_brewline__customers_  [RUN]\n06:00:02  6 of 7 START test unique_stg_brewline__orders_order_id ......................... [RUN]\n06:00:02  3 of 7 PASS not_null_stg_brewline__orders_order_id ............................. [PASS in 0.17s]\n06:00:02  7 of 7 START unit_test stg_brewline__orders::test_stg_orders_keeps_the_latest_version  [RUN]\n06:00:02  5 of 7 PASS relationships_stg_brewline__orders_customer_id__customer_id__ref_stg_brewline__customers_  [PASS in 0.13s]\n06:00:02  6 of 7 PASS unique_stg_brewline__orders_order_id ............................... [PASS in 0.13s]\n06:00:02  7 of 7 PASS stg_brewline__orders::test_stg_orders_keeps_the_latest_version ..... [PASS in 0.20s]\n06:00:02\n06:00:02  Finished running 6 data tests, 1 unit test in 0 hours 0 minutes and 0.55 seconds (0.55s).\n06:00:02\n06:00:02  Completed with 1 error, 0 partial successes, and 0 warnings:\n06:00:02\n06:00:02  [ERROR]: in test accepted_values_stg_brewline__orders_order_status__PLACED__SHIPPED__CANCELLED (models/staging/brewline/_brewline__models.yml)\n06:00:02    Got 1 result, configured to fail if != 0\n06:00:02\n06:00:02    compiled code at target/compiled/brewline/models/staging/brewline/_brewline__models.yml/accepted_values_stg_brewline___fb3d689ef2b6116335190138f3581b6c.sql\n06:00:02\n06:00:02  Done. PASS=6 WARN=0 ERROR=1 SKIP=0 NO-OP=0 REUSED=0 TOTAL=7",
  "test_fail_many": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:01  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:01\n06:00:01  Concurrency: 4 threads (target='prod')\n06:00:01\n06:00:01  1 of 7 START test accepted_values_stg_brewline__orders_order_status__PLACED__SHIPPED__CANCELLED  [RUN]\n06:00:01  4 of 7 START test positive_value_stg_brewline__orders_order_total_usd .......... [RUN]\n06:00:01  3 of 7 START test not_null_stg_brewline__orders_order_id ....................... [RUN]\n06:00:01  2 of 7 START test not_null_stg_brewline__orders_customer_id .................... [RUN]\n06:00:01  2 of 7 FAIL 1 not_null_stg_brewline__orders_customer_id ........................ [FAIL 1 in 0.10s]\n06:00:01  5 of 7 START test relationships_stg_brewline__orders_customer_id__customer_id__ref_stg_brewline__customers_  [RUN]\n06:00:01  4 of 7 FAIL 1 positive_value_stg_brewline__orders_order_total_usd .............. [FAIL 1 in 0.16s]\n06:00:01  3 of 7 PASS not_null_stg_brewline__orders_order_id ............................. [PASS in 0.14s]\n06:00:01  1 of 7 FAIL 1 accepted_values_stg_brewline__orders_order_status__PLACED__SHIPPED__CANCELLED  [FAIL 1 in 0.18s]\n06:00:01  6 of 7 START test unique_stg_brewline__orders_order_id ......................... [RUN]\n06:00:01  7 of 7 START unit_test stg_brewline__orders::test_stg_orders_keeps_the_latest_version  [RUN]\n06:00:01  5 of 7 FAIL 1 relationships_stg_brewline__orders_customer_id__customer_id__ref_stg_brewline__customers_  [FAIL 1 in 0.16s]\n06:00:01  6 of 7 PASS unique_stg_brewline__orders_order_id ............................... [PASS in 0.13s]\n06:00:01  7 of 7 PASS stg_brewline__orders::test_stg_orders_keeps_the_latest_version ..... [PASS in 0.20s]\n06:00:01\n06:00:01  Finished running 6 data tests, 1 unit test in 0 hours 0 minutes and 0.55 seconds (0.55s).\n06:00:01\n06:00:01  Completed with 4 errors, 0 partial successes, and 0 warnings:\n06:00:01\n06:00:01  [ERROR]: in test not_null_stg_brewline__orders_customer_id (models/staging/brewline/_brewline__models.yml)\n06:00:01    Got 1 result, configured to fail if != 0\n06:00:01\n06:00:01    compiled code at target/compiled/brewline/models/staging/brewline/_brewline__models.yml/not_null_stg_brewline__orders_customer_id.sql\n06:00:01\n06:00:01  [ERROR]: in test positive_value_stg_brewline__orders_order_total_usd (models/staging/brewline/_brewline__models.yml)\n06:00:01    Got 1 result, configured to fail if != 0\n06:00:01\n06:00:01    compiled code at target/compiled/brewline/models/staging/brewline/_brewline__models.yml/positive_value_stg_brewline__orders_order_total_usd.sql\n06:00:01\n06:00:01  [ERROR]: in test accepted_values_stg_brewline__orders_order_status__PLACED__SHIPPED__CANCELLED (models/staging/brewline/_brewline__models.yml)\n06:00:01    Got 1 result, configured to fail if != 0\n06:00:01\n06:00:01    compiled code at target/compiled/brewline/models/staging/brewline/_brewline__models.yml/accepted_values_stg_brewline___fb3d689ef2b6116335190138f3581b6c.sql\n06:00:01\n06:00:01  [ERROR]: in test relationships_stg_brewline__orders_customer_id__customer_id__ref_stg_brewline__customers_ (models/staging/brewline/_brewline__models.yml)\n06:00:01    Got 1 result, configured to fail if != 0\n06:00:01\n06:00:01    compiled code at target/compiled/brewline/models/staging/brewline/_brewline__models.yml/relationships_stg_brewline__or_87f38ce99566346eabf0d27dba43d03c.sql\n06:00:01\n06:00:01  Done. PASS=3 WARN=0 ERROR=4 SKIP=0 NO-OP=0 REUSED=0 TOTAL=7",
  "test_store_failures": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:01  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:01\n06:00:01  Concurrency: 4 threads (target='prod')\n06:00:01\n06:00:01  4 of 7 START test positive_value_stg_brewline__orders_order_total_usd .......... [RUN]\n06:00:01  3 of 7 START test not_null_stg_brewline__orders_order_id ....................... [RUN]\n06:00:01  1 of 7 START test accepted_values_stg_brewline__orders_order_status__PLACED__SHIPPED__CANCELLED  [RUN]\n06:00:01  2 of 7 START test not_null_stg_brewline__orders_customer_id .................... [RUN]\n06:00:01  1 of 7 FAIL 1 accepted_values_stg_brewline__orders_order_status__PLACED__SHIPPED__CANCELLED  [FAIL 1 in 0.20s]\n06:00:01  5 of 7 START test relationships_stg_brewline__orders_customer_id__customer_id__ref_stg_brewline__customers_  [RUN]\n06:00:01  4 of 7 PASS positive_value_stg_brewline__orders_order_total_usd ................ [PASS in 0.23s]\n06:00:01  2 of 7 PASS not_null_stg_brewline__orders_customer_id .......................... [PASS in 0.21s]\n06:00:01  3 of 7 PASS not_null_stg_brewline__orders_order_id ............................. [PASS in 0.23s]\n06:00:01  6 of 7 START test unique_stg_brewline__orders_order_id ......................... [RUN]\n06:00:01  7 of 7 START unit_test stg_brewline__orders::test_stg_orders_keeps_the_latest_version  [RUN]\n06:00:02  5 of 7 PASS relationships_stg_brewline__orders_customer_id__customer_id__ref_stg_brewline__customers_  [PASS in 0.18s]\n06:00:02  6 of 7 PASS unique_stg_brewline__orders_order_id ............................... [PASS in 0.15s]\n06:00:02  7 of 7 PASS stg_brewline__orders::test_stg_orders_keeps_the_latest_version ..... [PASS in 0.20s]\n06:00:02\n06:00:02  Finished running 6 data tests, 1 unit test in 0 hours 0 minutes and 0.63 seconds (0.63s).\n06:00:02\n06:00:02  Completed with 1 error, 0 partial successes, and 0 warnings:\n06:00:02\n06:00:02  [ERROR]: in test accepted_values_stg_brewline__orders_order_status__PLACED__SHIPPED__CANCELLED (models/staging/brewline/_brewline__models.yml)\n06:00:02    Got 1 result, configured to fail if != 0\n06:00:02\n06:00:02    compiled code at target/compiled/brewline/models/staging/brewline/_brewline__models.yml/accepted_values_stg_brewline___fb3d689ef2b6116335190138f3581b6c.sql\n06:00:02\n06:00:02    See test failures:\n  ----------------------------------------------------------------------------------------------------------------------\n  select * from \"brewline\".\"analytics_dbt_test__audit\".\"accepted_values_stg_brewline___fb3d689ef2b6116335190138f3581b6c\"\n  ----------------------------------------------------------------------------------------------------------------------\n06:00:02\n06:00:02  Done. PASS=6 WARN=0 ERROR=1 SKIP=0 NO-OP=0 REUSED=0 TOTAL=7",
  "unit_fail": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:01  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:01\n06:00:01  Concurrency: 4 threads (target='prod')\n06:00:01\n06:00:02  2 of 2 START unit_test stg_brewline__orders::test_stg_orders_keeps_the_latest_version  [RUN]\n06:00:02  1 of 2 START unit_test fct_orders::test_fct_orders_incremental_reads_only_new_versions  [RUN]\n06:00:02  2 of 2 FAIL 1 stg_brewline__orders::test_stg_orders_keeps_the_latest_version ... [FAIL 1 in 0.24s]\n06:00:02  1 of 2 PASS fct_orders::test_fct_orders_incremental_reads_only_new_versions .... [PASS in 0.24s]\n06:00:02\n06:00:02  Finished running 2 unit tests in 0 hours 0 minutes and 0.38 seconds (0.38s).\n06:00:02\n06:00:02  Completed with 1 error, 0 partial successes, and 0 warnings:\n06:00:02\n06:00:02  [ERROR]: in unit_test test_stg_orders_keeps_the_latest_version (models/staging/brewline/_brewline__unit_tests.yml)\n06:00:02\n\nactual differs from expected:\n\n@@,order_id,customer_id,ordered_at         ,order_status  ,order_total_usd,loaded_at\n→ ,O-1     ,C-1        ,2026-01-01 10:00:00,SHIPPED→PLACED,10.00          ,2026-01-01 11:05:00→2026-01-01 10:05:00\n  ,O-2     ,C-2        ,2026-01-01 12:00:00,PLACED        ,5.50           ,2026-01-01 12:05:00\n\n\n06:00:02\n06:00:02    compiled code at target/compiled/brewline/models/staging/brewline/_brewline__unit_tests.yml/models/staging/brewline/test_stg_orders_keeps_the_latest_version.sql\n06:00:02\n06:00:02  Done. PASS=1 WARN=0 ERROR=1 SKIP=0 NO-OP=0 REUSED=0 TOTAL=2",
  "unit_pass": "06:00:00  Running with dbt=1.12.6\n06:00:00  Registered adapter: duckdb=1.11.1\n06:00:01  Found 10 models, 26 data tests, 1 seed, 1 snapshot, 4 sources, 1 exposure, 630 macros, 1 group, 2 unit tests\n06:00:01\n06:00:01  Concurrency: 4 threads (target='prod')\n06:00:01\n06:00:01  1 of 2 START unit_test fct_orders::test_fct_orders_incremental_reads_only_new_versions  [RUN]\n06:00:01  2 of 2 START unit_test stg_brewline__orders::test_stg_orders_keeps_the_latest_version  [RUN]\n06:00:01  2 of 2 PASS stg_brewline__orders::test_stg_orders_keeps_the_latest_version ..... [PASS in 0.20s]\n06:00:01  1 of 2 PASS fct_orders::test_fct_orders_incremental_reads_only_new_versions .... [PASS in 0.22s]\n06:00:01\n06:00:01  Finished running 2 unit tests in 0 hours 0 minutes and 0.36 seconds (0.36s).\n06:00:01\n06:00:01  Completed successfully\n06:00:01\n06:00:01  Done. PASS=2 WARN=0 ERROR=0 SKIP=0 NO-OP=0 REUSED=0 TOTAL=2",
  "version": "Core:\n  - installed: 1.12.6\n  - latest:    1.12.6 - Up to date!\n\nPlugins:\n  - duckdb: 1.11.1 - Up to date!\n\n\n06:00:00  dbt v2 is available, and is the default for new installations. This is dbt Core v1.\n          New project - install v2: https://docs.getdbt.com/docs/local/install-dbt?utm_source=dbt-cli\n          Existing v1 project - upgrade guide: https://docs.getdbt.com/docs/dbt-versions/dbt-upgrade/upgrading-to-v2?utm_source=dbt-cli"
 },
 "ls": {
  "access_public": [
   "fct_daily_revenue"
  ],
  "all": [
   "finance_dashboard",
   "dim_customers",
   "dim_products",
   "dim_products",
   "fct_daily_revenue",
   "fct_orders",
   "int_orders__with_items",
   "stg_brewline__customers",
   "stg_brewline__order_items",
   "stg_brewline__orders",
   "stg_brewline__products",
   "country_names",
   "snap_customers"
  ],
  "both": [
   "fct_daily_revenue",
   "fct_orders",
   "int_orders__with_items",
   "stg_brewline__order_items",
   "stg_brewline__orders",
   "source:order_items",
   "source:orders"
  ],
  "down": [
   "finance_dashboard",
   "dim_customers",
   "fct_daily_revenue",
   "fct_orders",
   "int_orders__with_items",
   "stg_brewline__orders"
  ],
  "down_two": [
   "dim_customers",
   "fct_orders",
   "int_orders__with_items",
   "stg_brewline__orders"
  ],
  "exposure_up": [
   "finance_dashboard",
   "fct_daily_revenue",
   "fct_orders",
   "int_orders__with_items",
   "stg_brewline__order_items",
   "stg_brewline__orders",
   "source:order_items",
   "source:orders"
  ],
  "group_finance": [
   "fct_daily_revenue"
  ],
  "incremental": [
   "fct_orders"
  ],
  "intersection": [
   "stg_brewline__orders",
   "source:orders"
  ],
  "model": [
   "stg_brewline__orders"
  ],
  "one_up": [
   "fct_orders",
   "int_orders__with_items"
  ],
  "path_core": [
   "dim_customers",
   "dim_products",
   "dim_products",
   "fct_orders"
  ],
  "path_staging": [
   "stg_brewline__customers",
   "stg_brewline__order_items",
   "stg_brewline__orders",
   "stg_brewline__products",
   "source:customers",
   "source:order_items",
   "source:orders",
   "source:products"
  ],
  "plus_at": [
   "dim_customers",
   "fct_orders",
   "int_orders__with_items",
   "stg_brewline__customers",
   "stg_brewline__order_items",
   "stg_brewline__orders",
   "country_names",
   "source:customers",
   "source:order_items",
   "source:orders"
  ],
  "seed": [
   "country_names"
  ],
  "source_down": [
   "finance_dashboard",
   "dim_customers",
   "dim_products",
   "dim_products",
   "fct_daily_revenue",
   "fct_orders",
   "int_orders__with_items",
   "stg_brewline__customers",
   "stg_brewline__order_items",
   "stg_brewline__orders",
   "stg_brewline__products",
   "snap_customers",
   "source:customers",
   "source:order_items",
   "source:orders",
   "source:products"
  ],
  "source_orders_down": [
   "finance_dashboard",
   "dim_customers",
   "fct_daily_revenue",
   "fct_orders",
   "int_orders__with_items",
   "stg_brewline__orders",
   "source:orders"
  ],
  "table": [
   "dim_customers",
   "dim_products",
   "dim_products",
   "fct_daily_revenue"
  ],
  "tag_daily": [
   "fct_daily_revenue",
   "fct_orders"
  ],
  "tag_pii": [
   "dim_customers",
   "stg_brewline__customers"
  ],
  "union": [
   "dim_customers",
   "fct_orders"
  ],
  "up": [
   "fct_orders",
   "int_orders__with_items",
   "stg_brewline__order_items",
   "stg_brewline__orders",
   "source:order_items",
   "source:orders"
  ]
 },
 "meta": {
  "adapter": "dbt-duckdb 1.11.1",
  "dbt": "1.12.6",
  "duckdb": "2.0.0",
  "note": "Recorded by dbt/verify/capture.py. Log clock times start at 06:00:00; durations are real."
 },
 "sql": {
  "compiled/day1/assert_order_total_matches_lines": "select\n    order_id,\n    order_total_usd,\n    items_total_usd\nfrom \"brewline\".\"analytics_intermediate\".\"int_orders__with_items\"\nwhere order_total_usd <> items_total_usd",
  "compiled/day1/dim_customers": "with customers as (\n\n    select * from \"brewline\".\"analytics_staging\".\"stg_brewline__customers\"\n\n),\n\ncountries as (\n\n    select * from \"brewline\".\"analytics_reference\".\"country_names\"\n\n),\n\norders as (\n\n    select\n        customer_id,\n        count(*) as orders_count,\n        min(ordered_at) as first_order_at\n    from \"brewline\".\"analytics_staging\".\"stg_brewline__orders\"\n    where order_status <> 'CANCELLED'\n    group by customer_id\n\n)\n\nselect\n    md5(cast(coalesce(cast(c.customer_id as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as customer_key,\n    c.customer_id,\n    c.full_name,\n    c.email,\n    c.country_code,\n    n.country_name,\n    c.tier,\n    coalesce(o.orders_count, 0) as orders_count,\n    o.first_order_at\nfrom customers as c\nleft join countries as n on n.country_code = c.country_code\nleft join orders as o on o.customer_id = c.customer_id",
  "compiled/day1/dim_products_v2": "select\n    md5(cast(coalesce(cast(product_id as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as product_key,\n    product_id,\n    product_name,\n    category,\n    list_price_usd as price_usd,\n    case when list_price_usd >= 30 then 'premium' else 'standard' end as price_band\nfrom \"brewline\".\"analytics_staging\".\"stg_brewline__products\"",
  "compiled/day1/fct_daily_revenue": "select\n    cast(ordered_at as date) as order_date,\n    count(*) as orders,\n    sum(order_total_usd) as revenue_usd\nfrom \"brewline\".\"analytics_marts\".\"fct_orders\"\nwhere order_status <> 'CANCELLED'\ngroup by 1",
  "compiled/day1/fct_orders": "select\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom \"brewline\".\"analytics_intermediate\".\"int_orders__with_items\"",
  "compiled/day1/int_orders__with_items": "with items as (\n\n    select\n        order_id,\n        count(*) as item_lines,\n        sum(quantity) as units,\n        sum(line_total_usd) as items_total_usd\n    from \"brewline\".\"analytics_staging\".\"stg_brewline__order_items\"\n    group by order_id\n\n)\n\nselect\n    o.order_id,\n    o.customer_id,\n    o.ordered_at,\n    o.order_status,\n    o.order_total_usd,\n    o.loaded_at,\n    coalesce(i.item_lines, 0) as item_lines,\n    coalesce(i.units, 0) as units,\n    coalesce(i.items_total_usd, 0) as items_total_usd\nfrom \"brewline\".\"analytics_staging\".\"stg_brewline__orders\" as o\nleft join items as i on i.order_id = o.order_id",
  "compiled/day1/stg_brewline__customers": "select\n    customer_id,\n    full_name,\n    lower(email) as email,\n    upper(country) as country_code,\n    tier\nfrom \"brewline\".\"raw\".\"customers\"",
  "compiled/day1/stg_brewline__orders": "with source as (\n\n    select * from \"brewline\".\"raw\".\"orders\"\n\n),\n\nlatest as (\n\n    select *\n    from source\n    qualify row_number() over (partition by order_id order by _loaded_at desc) = 1\n\n)\n\nselect\n    order_id,\n    customer_id,\n    cast(order_ts as timestamp) as ordered_at,\n    upper(status) as order_status,\n    cast(total_usd as decimal(12, 2)) as order_total_usd,\n    _loaded_at as loaded_at\nfrom latest",
  "compiled/day2/fct_orders": "select\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom \"brewline\".\"analytics_intermediate\".\"int_orders__with_items\"\n\n\nwhere loaded_at > (select coalesce(max(loaded_at), timestamp '1900-01-01') from \"brewline\".\"analytics_marts\".\"fct_orders\")",
  "compiled/ephemeral/fct_orders": "with __dbt__cte__int_orders__with_items as (\nwith items as (\n\n    select\n        order_id,\n        count(*) as item_lines,\n        sum(quantity) as units,\n        sum(line_total_usd) as items_total_usd\n    from \"brewline\".\"analytics_staging\".\"stg_brewline__order_items\"\n    group by order_id\n\n)\n\nselect\n    o.order_id,\n    o.customer_id,\n    o.ordered_at,\n    o.order_status,\n    o.order_total_usd,\n    o.loaded_at,\n    coalesce(i.item_lines, 0) as item_lines,\n    coalesce(i.units, 0) as units,\n    coalesce(i.items_total_usd, 0) as items_total_usd\nfrom \"brewline\".\"analytics_staging\".\"stg_brewline__orders\" as o\nleft join items as i on i.order_id = o.order_id\n) select\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom __dbt__cte__int_orders__with_items\n\n\nwhere loaded_at > (select coalesce(max(loaded_at), timestamp '1900-01-01') from \"brewline\".\"analytics_marts\".\"fct_orders\")",
  "compiled/jinja/cents_demo": "select \n    round(6700 / 100.0, 2)\n as dollars",
  "compiled/jinja/customers_sample_dev": "select customer_id, full_name, tier\nfrom \"brewline\".\"dev_alice_staging\".\"stg_brewline__customers\"\norder by customer_id\n\n    \n    limit 2\n    ",
  "compiled/jinja/customers_sample_prod": "select customer_id, full_name, tier\nfrom \"brewline\".\"analytics_staging\".\"stg_brewline__customers\"\norder by customer_id\n\n    ",
  "compiled/jinja/min_total": "select order_id, order_total_usd\nfrom \"brewline\".\"analytics_staging\".\"stg_brewline__orders\"\nwhere order_total_usd >= 0\norder by order_id",
  "compiled/jinja/min_total_25": "select order_id, order_total_usd\nfrom \"brewline\".\"analytics_staging\".\"stg_brewline__orders\"\nwhere order_total_usd >= 25\norder by order_id",
  "compiled/jinja/orders_by_status": "select\n    customer_id,\n    \n    count(*) filter (where order_status = 'PLACED') as placed_orders,\n    \n    count(*) filter (where order_status = 'SHIPPED') as shipped_orders,\n    \n    count(*) filter (where order_status = 'CANCELLED') as cancelled_orders\n    \nfrom \"brewline\".\"analytics_staging\".\"stg_brewline__orders\"\ngroup by customer_id",
  "compiled/jinja/status_list": "    \n\n\nselect\n    count(*) as orders\n    \n    , count(*) filter (where order_status = 'CANCELLED') as cancelled\n    \n    , count(*) filter (where order_status = 'PLACED') as placed\n    \n    , count(*) filter (where order_status = 'SHIPPED') as shipped\n    \nfrom \"brewline\".\"analytics_staging\".\"stg_brewline__orders\"",
  "compiled/second/fct_orders": "select\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom \"brewline\".\"analytics_intermediate\".\"int_orders__with_items\"\n\n\nwhere loaded_at > (select coalesce(max(loaded_at), timestamp '1900-01-01') from \"brewline\".\"analytics_marts\".\"fct_orders\")",
  "compiled/slim/dim_customers_dev": "with customers as (\n\n    select * from \"brewline\".\"dev_alice_staging\".\"stg_brewline__customers\"\n\n),\n\ncountries as (\n\n    select * from \"brewline\".\"analytics_reference\".\"country_names\"\n\n),\n\norders as (\n\n    select\n        customer_id,\n        count(*) as orders_count,\n        min(ordered_at) as first_order_at\n    from \"brewline\".\"analytics_staging\".\"stg_brewline__orders\"\n    where order_status <> 'CANCELLED'\n    group by customer_id\n\n)\n\nselect\n    md5(cast(coalesce(cast(c.customer_id as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as customer_key,\n    c.customer_id,\n    c.full_name,\n    c.email,\n    c.country_code,\n    n.country_name,\n    c.tier,\n    coalesce(o.orders_count, 0) as orders_count,\n    o.first_order_at\nfrom customers as c\nleft join countries as n on n.country_code = c.country_code\nleft join orders as o on o.customer_id = c.customer_id",
  "compiled/strategy_microbatch": "select\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom (select * from \"brewline\".\"analytics_intermediate\".\"int_orders__with_items\" where ordered_at >= '2026-03-17 00:00:00+00:00' and ordered_at < '2026-03-18 00:00:00+00:00')",
  "compiled/test/accepted_values": "    \n    \n\nwith all_values as (\n\n    select\n        order_status as value_field,\n        count(*) as n_records\n\n    from \"brewline\".\"analytics_staging\".\"stg_brewline__orders\"\n    group by order_status\n\n)\n\nselect *\nfrom all_values\nwhere value_field not in (\n    'PLACED','SHIPPED','CANCELLED'\n)",
  "run/day1/dim_customers": "    \n\n    create  table\n      \"brewline\".\"analytics_marts\".\"dim_customers__dbt_tmp\"\n  \n    \n    as (\n      with customers as (\n\n    select * from \"brewline\".\"analytics_staging\".\"stg_brewline__customers\"\n\n),\n\ncountries as (\n\n    select * from \"brewline\".\"analytics_reference\".\"country_names\"\n\n),\n\norders as (\n\n    select\n        customer_id,\n        count(*) as orders_count,\n        min(ordered_at) as first_order_at\n    from \"brewline\".\"analytics_staging\".\"stg_brewline__orders\"\n    where order_status <> 'CANCELLED'\n    group by customer_id\n\n)\n\nselect\n    md5(cast(coalesce(cast(c.customer_id as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as customer_key,\n    c.customer_id,\n    c.full_name,\n    c.email,\n    c.country_code,\n    n.country_name,\n    c.tier,\n    coalesce(o.orders_count, 0) as orders_count,\n    o.first_order_at\nfrom customers as c\nleft join countries as n on n.country_code = c.country_code\nleft join orders as o on o.customer_id = c.customer_id\n    );\n    \n  ",
  "run/day1/fct_orders": "        \n            delete from \"brewline\".\"analytics_marts\".\"fct_orders\"\n            where (\n                order_id) in (\n                select (order_id)\n                from \"fct_orders__dbt_tmp20260318090000000000\"\n            );\n\n        \n    \n\n    insert into \"brewline\".\"analytics_marts\".\"fct_orders\" (\"order_id\", \"customer_id\", \"ordered_at\", \"order_status\", \"order_total_usd\", \"items_total_usd\", \"is_reconciled\", \"loaded_at\")\n    (\n        select \"order_id\", \"customer_id\", \"ordered_at\", \"order_status\", \"order_total_usd\", \"items_total_usd\", \"is_reconciled\", \"loaded_at\"\n        from \"fct_orders__dbt_tmp20260318090000000000\"\n    )\n  ",
  "run/day1/stg_brewline__customers": "  \n  create view \"brewline\".\"analytics_staging\".\"stg_brewline__customers__dbt_tmp\" as (\n    select\n    customer_id,\n    full_name,\n    lower(email) as email,\n    upper(country) as country_code,\n    tier\nfrom \"brewline\".\"raw\".\"customers\"\n  );",
  "run/day1/stg_brewline__orders": "  \n  create view \"brewline\".\"analytics_staging\".\"stg_brewline__orders__dbt_tmp\" as (\n    with source as (\n\n    select * from \"brewline\".\"raw\".\"orders\"\n\n),\n\nlatest as (\n\n    select *\n    from source\n    qualify row_number() over (partition by order_id order by _loaded_at desc) = 1\n\n)\n\nselect\n    order_id,\n    customer_id,\n    cast(order_ts as timestamp) as ordered_at,\n    upper(status) as order_status,\n    cast(total_usd as decimal(12, 2)) as order_total_usd,\n    _loaded_at as loaded_at\nfrom latest\n  );",
  "run/day2/fct_orders": "        \n            delete from \"brewline\".\"analytics_marts\".\"fct_orders\"\n            where (\n                order_id) in (\n                select (order_id)\n                from \"fct_orders__dbt_tmp20260318090000000000\"\n            );\n\n        \n    \n\n    insert into \"brewline\".\"analytics_marts\".\"fct_orders\" (\"order_id\", \"customer_id\", \"ordered_at\", \"order_status\", \"order_total_usd\", \"items_total_usd\", \"is_reconciled\", \"loaded_at\")\n    (\n        select \"order_id\", \"customer_id\", \"ordered_at\", \"order_status\", \"order_total_usd\", \"items_total_usd\", \"is_reconciled\", \"loaded_at\"\n        from \"fct_orders__dbt_tmp20260318090000000000\"\n    )\n  ",
  "run/empty/stg_brewline__orders": "  \n  create view \"brewline\".\"dev_alice_staging\".\"stg_brewline__orders__dbt_tmp\" as (\n    with source as (\n\n    select * from (select * from \"brewline\".\"raw\".\"orders\" where false limit 0)\n\n),\n\nlatest as (\n\n    select *\n    from source\n    qualify row_number() over (partition by order_id order by _loaded_at desc) = 1\n\n)\n\nselect\n    order_id,\n    customer_id,\n    cast(order_ts as timestamp) as ordered_at,\n    upper(status) as order_status,\n    cast(total_usd as decimal(12, 2)) as order_total_usd,\n    _loaded_at as loaded_at\nfrom latest\n  );",
  "run/first/fct_orders": "    \n\n    create  table\n      \"brewline\".\"analytics_marts\".\"fct_orders\"\n  \n    \n    as (\n      \n\nselect\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom \"brewline\".\"analytics_intermediate\".\"int_orders__with_items\"\n\n\n    );\n    \n  \n  ",
  "run/first/int_orders__with_items": "  \n  create view \"brewline\".\"analytics_intermediate\".\"int_orders__with_items__dbt_tmp\" as (\n    with items as (\n\n    select\n        order_id,\n        count(*) as item_lines,\n        sum(quantity) as units,\n        sum(line_total_usd) as items_total_usd\n    from \"brewline\".\"analytics_staging\".\"stg_brewline__order_items\"\n    group by order_id\n\n)\n\nselect\n    o.order_id,\n    o.customer_id,\n    o.ordered_at,\n    o.order_status,\n    o.order_total_usd,\n    o.loaded_at,\n    coalesce(i.item_lines, 0) as item_lines,\n    coalesce(i.units, 0) as units,\n    coalesce(i.items_total_usd, 0) as items_total_usd\nfrom \"brewline\".\"analytics_staging\".\"stg_brewline__orders\" as o\nleft join items as i on i.order_id = o.order_id\n  );",
  "run/first/stg_brewline__orders": "  \n  create view \"brewline\".\"analytics_staging\".\"stg_brewline__orders__dbt_tmp\" as (\n    with source as (\n\n    select * from \"brewline\".\"raw\".\"orders\"\n\n),\n\nlatest as (\n\n    select *\n    from source\n    qualify row_number() over (partition by order_id order by _loaded_at desc) = 1\n\n)\n\nselect\n    order_id,\n    customer_id,\n    cast(order_ts as timestamp) as ordered_at,\n    upper(status) as order_status,\n    cast(total_usd as decimal(12, 2)) as order_total_usd,\n    _loaded_at as loaded_at\nfrom latest\n  );",
  "run/full_refresh/fct_orders": "    \n\n    create  table\n      \"brewline\".\"analytics_marts\".\"fct_orders__dbt_tmp\"\n  \n    \n    as (\n      \n\nselect\n    order_id,\n    customer_id,\n    ordered_at,\n    order_status,\n    order_total_usd,\n    items_total_usd,\n    order_total_usd = items_total_usd as is_reconciled,\n    loaded_at\nfrom \"brewline\".\"analytics_intermediate\".\"int_orders__with_items\"\n\n\n    );\n    \n  \n  ",
  "run/strategy_append": "insert into \"brewline\".\"analytics_marts\".\"fct_orders\" (\"order_id\", \"customer_id\", \"ordered_at\", \"order_status\", \"order_total_usd\", \"items_total_usd\", \"is_reconciled\", \"loaded_at\")\n    (\n        select \"order_id\", \"customer_id\", \"ordered_at\", \"order_status\", \"order_total_usd\", \"items_total_usd\", \"is_reconciled\", \"loaded_at\"\n        from \"fct_orders__dbt_tmp20260318090000000000\"\n    )\n\n\n  ",
  "run/strategy_delete_insert": "        \n            delete from \"brewline\".\"analytics_marts\".\"fct_orders\"\n            where (\n                order_id) in (\n                select (order_id)\n                from \"fct_orders__dbt_tmp20260318090000000000\"\n            );\n\n        \n    \n\n    insert into \"brewline\".\"analytics_marts\".\"fct_orders\" (\"order_id\", \"customer_id\", \"ordered_at\", \"order_status\", \"order_total_usd\", \"items_total_usd\", \"is_reconciled\", \"loaded_at\")\n    (\n        select \"order_id\", \"customer_id\", \"ordered_at\", \"order_status\", \"order_total_usd\", \"items_total_usd\", \"is_reconciled\", \"loaded_at\"\n        from \"fct_orders__dbt_tmp20260318090000000000\"\n    )\n  ",
  "run/strategy_merge": "    MERGE INTO \"brewline\".\"analytics_marts\".\"fct_orders\" AS DBT_INTERNAL_DEST\n        USING \"fct_orders__dbt_tmp20260318090000000000\" AS DBT_INTERNAL_SOURCE\n        \n            \n                \n            \n        \n        ON (DBT_INTERNAL_SOURCE.order_id = DBT_INTERNAL_DEST.order_id)\n    \n    WHEN MATCHED\n    THEN\n        UPDATE BY NAME\n    WHEN NOT MATCHED\n        \n    THEN\n        INSERT BY NAME\n\n  ",
  "run/strategy_microbatch": "delete from \"brewline\".\"analytics_marts\".\"fct_orders\"\n        where ordered_at >= '2026-03-17 00:00:00+00:00'\n        and ordered_at < '2026-03-18 00:00:00+00:00';\n\n        insert into \"brewline\".\"analytics_marts\".\"fct_orders\" (\"order_id\", \"customer_id\", \"ordered_at\", \"order_status\", \"order_total_usd\", \"items_total_usd\", \"is_reconciled\", \"loaded_at\")\n        select \"order_id\", \"customer_id\", \"ordered_at\", \"order_status\", \"order_total_usd\", \"items_total_usd\", \"is_reconciled\", \"loaded_at\"\n        from \"fct_orders__dbt_tmp20260318090000000000\"\n        where ordered_at >= '2026-03-17 00:00:00+00:00'\n        and ordered_at < '2026-03-18 00:00:00+00:00';\n  "
 },
 "tables": {
  "after_failure_tables": {
   "cols": [
    "table_schema",
    "table_name"
   ],
   "rows": [
    [
     "analytics_marts",
     "dim_customers"
    ],
    [
     "analytics_marts",
     "dim_products_v1"
    ],
    [
     "analytics_marts",
     "dim_products_v2"
    ],
    [
     "analytics_marts",
     "fct_daily_revenue"
    ],
    [
     "analytics_marts",
     "fct_orders"
    ]
   ]
  },
  "asof_orders": {
   "cols": [
    "order_id",
    "ordered_at",
    "customer_id",
    "tier",
    "country"
   ],
   "rows": [
    [
     "O-5001",
     "2026-03-14 09:12:00",
     "C-42",
     "standard",
     "us"
    ],
    [
     "O-5002",
     "2026-03-14 09:15:00",
     "C-77",
     "standard",
     "uk"
    ],
    [
     "O-5003",
     "2026-03-14 10:02:00",
     "C-42",
     "standard",
     "us"
    ],
    [
     "O-5006",
     "2026-03-16 08:40:00",
     "C-77",
     "standard",
     "uk"
    ],
    [
     "O-5007",
     "2026-03-16 17:55:00",
     "C-42",
     "standard",
     "us"
    ],
    [
     "O-5010",
     "2026-03-17 16:20:00",
     "C-77",
     "standard",
     "uk"
    ]
   ]
  },
  "asof_wrong": {
   "cols": [
    "order_id",
    "ordered_at",
    "customer_id",
    "tier",
    "country"
   ],
   "rows": [
    [
     "O-5001",
     "2026-03-14 09:12:00",
     "C-42",
     "gold",
     "us"
    ],
    [
     "O-5002",
     "2026-03-14 09:15:00",
     "C-77",
     "standard",
     "de"
    ],
    [
     "O-5003",
     "2026-03-14 10:02:00",
     "C-42",
     "gold",
     "us"
    ],
    [
     "O-5006",
     "2026-03-16 08:40:00",
     "C-77",
     "standard",
     "de"
    ],
    [
     "O-5007",
     "2026-03-16 17:55:00",
     "C-42",
     "gold",
     "us"
    ],
    [
     "O-5010",
     "2026-03-17 16:20:00",
     "C-77",
     "standard",
     "de"
    ]
   ]
  },
  "assert_rows": {
   "cols": [
    "order_id",
    "order_total_usd",
    "items_total_usd"
   ],
   "rows": [
    [
     "O-5009",
     "30.00",
     "29.00"
    ],
    [
     "O-5010",
     "20.00",
     "0.00"
    ]
   ]
  },
  "country_names": {
   "cols": [
    "country_code",
    "country_name"
   ],
   "rows": [
    [
     "DE",
     "Germany"
    ],
    [
     "FR",
     "France"
    ],
    [
     "UK",
     "United Kingdom"
    ],
    [
     "US",
     "United States"
    ]
   ]
  },
  "dim_customers": {
   "cols": [
    "customer_key",
    "customer_id",
    "full_name",
    "email",
    "country_code",
    "country_name",
    "tier",
    "orders_count",
    "first_order_at"
   ],
   "rows": [
    [
     "b91bee38bb08362fc22cdbdb7216259b",
     "C-12",
     "Omar Haddad",
     "omar.haddad@mail.test",
     "US",
     "United States",
     "standard",
     "1",
     "2026-03-17 15:00:00"
    ],
    [
     "fff4d770e059599ab3ab0649cf65ff4d",
     "C-42",
     "Ava Martin",
     "ava.martin@mail.test",
     "US",
     "United States",
     "standard",
     "3",
     "2026-03-14 09:12:00"
    ],
    [
     "4dbc4ed72d6cb86f95a3b12e6aae8054",
     "C-77",
     "Noah Singh",
     "noah.singh@mail.test",
     "UK",
     "United Kingdom",
     "standard",
     "3",
     "2026-03-14 09:15:00"
    ],
    [
     "1a2a7c6651d937cab804178f19cc1693",
     "C-91",
     "Lea Dubois",
     "lea.dubois@mail.test",
     "FR",
     "France",
     "gold",
     "2",
     "2026-03-15 11:20:00"
    ]
   ]
  },
  "dim_products_v1": {
   "cols": [
    "product_key",
    "product_id",
    "product_name",
    "category",
    "list_price_usd"
   ],
   "rows": [
    [
     "c3837822dc354309d267a11ed11f3425",
     "P-10",
     "Ethiopia 250 g",
     "coffee",
     "14.00"
    ],
    [
     "4722a4a8a2c28f6a1942e6366b12fb94",
     "P-11",
     "Colombia 250 g",
     "coffee",
     "12.50"
    ],
    [
     "c8531e3ccf937c118cadc5fe13e8e8b4",
     "P-12",
     "Kenya 250 g",
     "coffee",
     "16.00"
    ],
    [
     "ca9428c8c613b8f0595658f94cededd2",
     "P-22",
     "Hand grinder",
     "gear",
     "39.00"
    ],
    [
     "0b59b47f83d79a562b8d2e9ec591dad4",
     "P-30",
     "Kettle",
     "gear",
     "55.00"
    ],
    [
     "46a6457c436617f8d5dd32da38de7640",
     "P-31",
     "Scale",
     "gear",
     "29.00"
    ]
   ]
  },
  "dim_products_v2": {
   "cols": [
    "product_key",
    "product_id",
    "product_name",
    "category",
    "price_usd",
    "price_band"
   ],
   "rows": [
    [
     "c3837822dc354309d267a11ed11f3425",
     "P-10",
     "Ethiopia 250 g",
     "coffee",
     "14.00",
     "standard"
    ],
    [
     "4722a4a8a2c28f6a1942e6366b12fb94",
     "P-11",
     "Colombia 250 g",
     "coffee",
     "12.50",
     "standard"
    ],
    [
     "c8531e3ccf937c118cadc5fe13e8e8b4",
     "P-12",
     "Kenya 250 g",
     "coffee",
     "16.00",
     "standard"
    ],
    [
     "ca9428c8c613b8f0595658f94cededd2",
     "P-22",
     "Hand grinder",
     "gear",
     "39.00",
     "premium"
    ],
    [
     "0b59b47f83d79a562b8d2e9ec591dad4",
     "P-30",
     "Kettle",
     "gear",
     "55.00",
     "premium"
    ],
    [
     "46a6457c436617f8d5dd32da38de7640",
     "P-31",
     "Scale",
     "gear",
     "29.00",
     "standard"
    ]
   ]
  },
  "fanout_naive": {
   "cols": [
    "order_date",
    "revenue_usd"
   ],
   "rows": [
    [
     "2026-03-14",
     "174.50"
    ],
    [
     "2026-03-15",
     "55.00"
    ],
    [
     "2026-03-16",
     "105.00"
    ],
    [
     "2026-03-17",
     "69.00"
    ]
   ]
  },
  "fanout_right": {
   "cols": [
    "order_date",
    "revenue_usd"
   ],
   "rows": [
    [
     "2026-03-14",
     "107.50"
    ],
    [
     "2026-03-15",
     "55.00"
    ],
    [
     "2026-03-16",
     "60.50"
    ],
    [
     "2026-03-17",
     "89.00"
    ]
   ]
  },
  "fanout_rows": {
   "cols": [
    "order_id",
    "order_total_usd",
    "line_no",
    "line_total_usd"
   ],
   "rows": [
    [
     "O-5001",
     "67.00",
     "1",
     "28.00"
    ],
    [
     "O-5001",
     "67.00",
     "2",
     "39.00"
    ]
   ]
  },
  "fct_daily_revenue_day1": {
   "cols": [
    "order_date",
    "orders",
    "revenue_usd"
   ],
   "rows": [
    [
     "2026-03-14",
     "3",
     "107.50"
    ],
    [
     "2026-03-15",
     "1",
     "55.00"
    ],
    [
     "2026-03-16",
     "2",
     "60.50"
    ],
    [
     "2026-03-17",
     "3",
     "89.00"
    ]
   ]
  },
  "fct_daily_revenue_day2": {
   "cols": [
    "order_date",
    "orders",
    "revenue_usd"
   ],
   "rows": [
    [
     "2026-03-14",
     "3",
     "107.50"
    ],
    [
     "2026-03-15",
     "1",
     "55.00"
    ],
    [
     "2026-03-16",
     "2",
     "60.50"
    ],
    [
     "2026-03-17",
     "3",
     "89.00"
    ],
    [
     "2026-03-18",
     "1",
     "28.50"
    ]
   ]
  },
  "fct_orders_day1": {
   "cols": [
    "order_id",
    "customer_id",
    "ordered_at",
    "order_status",
    "order_total_usd",
    "items_total_usd",
    "is_reconciled",
    "loaded_at"
   ],
   "rows": [
    [
     "O-5001",
     "C-42",
     "2026-03-14 09:12:00",
     "SHIPPED",
     "67.00",
     "67.00",
     "true",
     "2026-03-14 10:31:44"
    ],
    [
     "O-5002",
     "C-77",
     "2026-03-14 09:15:00",
     "PLACED",
     "12.50",
     "12.50",
     "true",
     "2026-03-14 09:31:07"
    ],
    [
     "O-5003",
     "C-42",
     "2026-03-14 10:02:00",
     "SHIPPED",
     "28.00",
     "28.00",
     "true",
     "2026-03-14 11:31:20"
    ],
    [
     "O-5004",
     "C-91",
     "2026-03-15 11:20:00",
     "SHIPPED",
     "55.00",
     "55.00",
     "true",
     "2026-03-15 12:00:05"
    ],
    [
     "O-5005",
     "C-12",
     "2026-03-15 14:05:00",
     "CANCELLED",
     "29.00",
     "29.00",
     "true",
     "2026-03-15 15:00:11"
    ],
    [
     "O-5006",
     "C-77",
     "2026-03-16 08:40:00",
     "SHIPPED",
     "44.50",
     "44.50",
     "true",
     "2026-03-16 09:30:02"
    ],
    [
     "O-5007",
     "C-42",
     "2026-03-16 17:55:00",
     "PLACED",
     "16.00",
     "16.00",
     "true",
     "2026-03-16 18:30:09"
    ],
    [
     "O-5008",
     "C-91",
     "2026-03-17 12:30:00",
     "SHIPPED",
     "39.00",
     "39.00",
     "true",
     "2026-03-17 13:00:41"
    ],
    [
     "O-5009",
     "C-12",
     "2026-03-17 15:00:00",
     "SHIPPED",
     "30.00",
     "29.00",
     "false",
     "2026-03-17 16:00:17"
    ],
    [
     "O-5010",
     "C-77",
     "2026-03-17 16:20:00",
     "PLACED",
     "20.00",
     "0.00",
     "false",
     "2026-03-17 17:00:03"
    ]
   ]
  },
  "fct_orders_day2": {
   "cols": [
    "order_id",
    "customer_id",
    "ordered_at",
    "order_status",
    "order_total_usd",
    "items_total_usd",
    "is_reconciled",
    "loaded_at"
   ],
   "rows": [
    [
     "O-5001",
     "C-42",
     "2026-03-14 09:12:00",
     "SHIPPED",
     "67.00",
     "67.00",
     "true",
     "2026-03-14 10:31:44"
    ],
    [
     "O-5002",
     "C-77",
     "2026-03-14 09:15:00",
     "PLACED",
     "12.50",
     "12.50",
     "true",
     "2026-03-14 09:31:07"
    ],
    [
     "O-5003",
     "C-42",
     "2026-03-14 10:02:00",
     "SHIPPED",
     "28.00",
     "28.00",
     "true",
     "2026-03-14 11:31:20"
    ],
    [
     "O-5004",
     "C-91",
     "2026-03-15 11:20:00",
     "SHIPPED",
     "55.00",
     "55.00",
     "true",
     "2026-03-15 12:00:05"
    ],
    [
     "O-5005",
     "C-12",
     "2026-03-15 14:05:00",
     "CANCELLED",
     "29.00",
     "29.00",
     "true",
     "2026-03-15 15:00:11"
    ],
    [
     "O-5006",
     "C-77",
     "2026-03-16 08:40:00",
     "SHIPPED",
     "44.50",
     "44.50",
     "true",
     "2026-03-16 09:30:02"
    ],
    [
     "O-5007",
     "C-42",
     "2026-03-16 17:55:00",
     "PLACED",
     "16.00",
     "16.00",
     "true",
     "2026-03-16 18:30:09"
    ],
    [
     "O-5008",
     "C-91",
     "2026-03-17 12:30:00",
     "SHIPPED",
     "39.00",
     "39.00",
     "true",
     "2026-03-17 13:00:41"
    ],
    [
     "O-5009",
     "C-12",
     "2026-03-17 15:00:00",
     "SHIPPED",
     "30.00",
     "29.00",
     "false",
     "2026-03-17 16:00:17"
    ],
    [
     "O-5010",
     "C-77",
     "2026-03-17 16:20:00",
     "SHIPPED",
     "20.00",
     "0.00",
     "false",
     "2026-03-18 09:00:00"
    ],
    [
     "O-5011",
     "C-91",
     "2026-03-18 08:15:00",
     "PLACED",
     "28.50",
     "28.50",
     "true",
     "2026-03-18 09:00:00"
    ]
   ]
  },
  "inc_bug_all": {
   "cols": [
    "order_id",
    "order_status",
    "order_total_usd",
    "loaded_at"
   ],
   "rows": [
    [
     "O-5001",
     "SHIPPED",
     "67.00",
     "2026-03-14 10:31:44"
    ],
    [
     "O-5002",
     "PLACED",
     "12.50",
     "2026-03-14 09:31:07"
    ],
    [
     "O-5003",
     "SHIPPED",
     "28.00",
     "2026-03-14 11:31:20"
    ],
    [
     "O-5004",
     "SHIPPED",
     "55.00",
     "2026-03-15 12:00:05"
    ],
    [
     "O-5005",
     "CANCELLED",
     "29.00",
     "2026-03-15 15:00:11"
    ],
    [
     "O-5006",
     "SHIPPED",
     "44.50",
     "2026-03-16 09:30:02"
    ],
    [
     "O-5007",
     "PLACED",
     "16.00",
     "2026-03-16 18:30:09"
    ],
    [
     "O-5008",
     "SHIPPED",
     "39.00",
     "2026-03-17 13:00:41"
    ],
    [
     "O-5009",
     "SHIPPED",
     "30.00",
     "2026-03-17 16:00:17"
    ],
    [
     "O-5010",
     "PLACED",
     "20.00",
     "2026-03-17 17:00:03"
    ],
    [
     "O-5011",
     "PLACED",
     "28.50",
     "2026-03-18 09:00:00"
    ]
   ]
  },
  "inc_bug_expected": {
   "cols": [
    "order_id",
    "order_status",
    "order_total_usd",
    "loaded_at"
   ],
   "rows": [
    [
     "O-5010",
     "SHIPPED",
     "20.00",
     "2026-03-18 09:00:00"
    ],
    [
     "O-5011",
     "PLACED",
     "28.50",
     "2026-03-18 09:00:00"
    ]
   ]
  },
  "inc_bug_rows": {
   "cols": [
    "order_id",
    "order_status",
    "order_total_usd",
    "loaded_at"
   ],
   "rows": [
    [
     "O-5010",
     "PLACED",
     "20.00",
     "2026-03-17 17:00:03"
    ],
    [
     "O-5011",
     "PLACED",
     "28.50",
     "2026-03-18 09:00:00"
    ]
   ]
  },
  "int_orders": {
   "cols": [
    "order_id",
    "customer_id",
    "ordered_at",
    "order_status",
    "order_total_usd",
    "loaded_at",
    "item_lines",
    "units",
    "items_total_usd"
   ],
   "rows": [
    [
     "O-5001",
     "C-42",
     "2026-03-14 09:12:00",
     "SHIPPED",
     "67.00",
     "2026-03-14 10:31:44",
     "2",
     "3",
     "67.00"
    ],
    [
     "O-5002",
     "C-77",
     "2026-03-14 09:15:00",
     "PLACED",
     "12.50",
     "2026-03-14 09:31:07",
     "1",
     "1",
     "12.50"
    ],
    [
     "O-5003",
     "C-42",
     "2026-03-14 10:02:00",
     "SHIPPED",
     "28.00",
     "2026-03-14 11:31:20",
     "1",
     "2",
     "28.00"
    ],
    [
     "O-5004",
     "C-91",
     "2026-03-15 11:20:00",
     "SHIPPED",
     "55.00",
     "2026-03-15 12:00:05",
     "1",
     "1",
     "55.00"
    ],
    [
     "O-5005",
     "C-12",
     "2026-03-15 14:05:00",
     "CANCELLED",
     "29.00",
     "2026-03-15 15:00:11",
     "1",
     "1",
     "29.00"
    ],
    [
     "O-5006",
     "C-77",
     "2026-03-16 08:40:00",
     "SHIPPED",
     "44.50",
     "2026-03-16 09:30:02",
     "2",
     "3",
     "44.50"
    ],
    [
     "O-5007",
     "C-42",
     "2026-03-16 17:55:00",
     "PLACED",
     "16.00",
     "2026-03-16 18:30:09",
     "1",
     "1",
     "16.00"
    ],
    [
     "O-5008",
     "C-91",
     "2026-03-17 12:30:00",
     "SHIPPED",
     "39.00",
     "2026-03-17 13:00:41",
     "1",
     "1",
     "39.00"
    ],
    [
     "O-5009",
     "C-12",
     "2026-03-17 15:00:00",
     "SHIPPED",
     "30.00",
     "2026-03-17 16:00:17",
     "1",
     "1",
     "29.00"
    ],
    [
     "O-5010",
     "C-77",
     "2026-03-17 16:20:00",
     "PLACED",
     "20.00",
     "2026-03-17 17:00:03",
     "0",
     "0",
     "0.00"
    ]
   ]
  },
  "jinja_cents_demo": {
   "cols": [
    "dollars"
   ],
   "rows": [
    [
     "67.0"
    ]
   ]
  },
  "jinja_orders_by_status": {
   "cols": [
    "customer_id",
    "placed_orders",
    "shipped_orders",
    "cancelled_orders"
   ],
   "rows": [
    [
     "C-12",
     "0",
     "1",
     "1"
    ],
    [
     "C-42",
     "1",
     "2",
     "0"
    ],
    [
     "C-77",
     "1",
     "2",
     "0"
    ],
    [
     "C-91",
     "1",
     "2",
     "0"
    ]
   ]
  },
  "jinja_status_list": {
   "cols": [
    "orders",
    "cancelled",
    "placed",
    "shipped"
   ],
   "rows": [
    [
     "11",
     "1",
     "3",
     "7"
    ]
   ]
  },
  "raw_customers": {
   "cols": [
    "customer_id",
    "full_name",
    "email",
    "country",
    "tier"
   ],
   "rows": [
    [
     "C-12",
     "Omar Haddad",
     "Omar.Haddad@mail.test",
     "us",
     "standard"
    ],
    [
     "C-42",
     "Ava Martin",
     "ava.martin@mail.test",
     "us",
     "standard"
    ],
    [
     "C-77",
     "Noah Singh",
     "noah.singh@mail.test",
     "uk",
     "standard"
    ],
    [
     "C-91",
     "Lea Dubois",
     "lea.dubois@mail.test",
     "fr",
     "gold"
    ]
   ]
  },
  "raw_customers_day2": {
   "cols": [
    "customer_id",
    "full_name",
    "country",
    "tier",
    "_loaded_at"
   ],
   "rows": [
    [
     "C-12",
     "Omar Haddad",
     "us",
     "standard",
     "2026-03-14 06:00:00"
    ],
    [
     "C-42",
     "Ava Martin",
     "us",
     "gold",
     "2026-03-18 06:00:00"
    ],
    [
     "C-77",
     "Noah Singh",
     "de",
     "standard",
     "2026-03-18 06:00:00"
    ],
    [
     "C-91",
     "Lea Dubois",
     "fr",
     "gold",
     "2026-03-14 06:00:00"
    ]
   ]
  },
  "raw_order_items": {
   "cols": [
    "order_id",
    "line_no",
    "product_id",
    "qty",
    "unit_price"
   ],
   "rows": [
    [
     "O-5001",
     "1",
     "P-10",
     "2",
     "14.0"
    ],
    [
     "O-5001",
     "2",
     "P-22",
     "1",
     "39.0"
    ],
    [
     "O-5002",
     "1",
     "P-11",
     "1",
     "12.5"
    ],
    [
     "O-5003",
     "1",
     "P-10",
     "2",
     "14.0"
    ],
    [
     "O-5004",
     "1",
     "P-30",
     "1",
     "55.0"
    ],
    [
     "O-5005",
     "1",
     "P-31",
     "1",
     "29.0"
    ],
    [
     "O-5006",
     "1",
     "P-12",
     "2",
     "16.0"
    ],
    [
     "O-5006",
     "2",
     "P-11",
     "1",
     "12.5"
    ],
    [
     "O-5007",
     "1",
     "P-12",
     "1",
     "16.0"
    ],
    [
     "O-5008",
     "1",
     "P-22",
     "1",
     "39.0"
    ],
    [
     "O-5009",
     "1",
     "P-31",
     "1",
     "29.0"
    ]
   ]
  },
  "raw_orders": {
   "cols": [
    "order_id",
    "customer_id",
    "order_ts",
    "status",
    "total_usd",
    "_loaded_at"
   ],
   "rows": [
    [
     "O-5001",
     "C-42",
     "2026-03-14 09:12:00",
     "PLACED",
     "67.0",
     "2026-03-14 09:31:07"
    ],
    [
     "O-5001",
     "C-42",
     "2026-03-14 09:12:00",
     "SHIPPED",
     "67.0",
     "2026-03-14 10:31:44"
    ],
    [
     "O-5002",
     "C-77",
     "2026-03-14 09:15:00",
     "PLACED",
     "12.5",
     "2026-03-14 09:31:07"
    ],
    [
     "O-5003",
     "C-42",
     "2026-03-14 10:02:00",
     "PLACED",
     "28.0",
     "2026-03-14 10:31:44"
    ],
    [
     "O-5003",
     "C-42",
     "2026-03-14 10:02:00",
     "SHIPPED",
     "28.0",
     "2026-03-14 11:31:20"
    ],
    [
     "O-5004",
     "C-91",
     "2026-03-15 11:20:00",
     "SHIPPED",
     "55.0",
     "2026-03-15 12:00:05"
    ],
    [
     "O-5005",
     "C-12",
     "2026-03-15 14:05:00",
     "CANCELLED",
     "29.0",
     "2026-03-15 15:00:11"
    ],
    [
     "O-5006",
     "C-77",
     "2026-03-16 08:40:00",
     "SHIPPED",
     "44.5",
     "2026-03-16 09:30:02"
    ],
    [
     "O-5007",
     "C-42",
     "2026-03-16 17:55:00",
     "PLACED",
     "16.0",
     "2026-03-16 18:30:09"
    ],
    [
     "O-5008",
     "C-91",
     "2026-03-17 12:30:00",
     "SHIPPED",
     "39.0",
     "2026-03-17 13:00:41"
    ],
    [
     "O-5009",
     "C-12",
     "2026-03-17 15:00:00",
     "SHIPPED",
     "30.0",
     "2026-03-17 16:00:17"
    ],
    [
     "O-5010",
     "C-77",
     "2026-03-17 16:20:00",
     "PLACED",
     "20.0",
     "2026-03-17 17:00:03"
    ]
   ]
  },
  "raw_products": {
   "cols": [
    "product_id",
    "name",
    "category",
    "price_usd"
   ],
   "rows": [
    [
     "P-10",
     "Ethiopia 250 g",
     "coffee",
     "14.0"
    ],
    [
     "P-11",
     "Colombia 250 g",
     "coffee",
     "12.5"
    ],
    [
     "P-12",
     "Kenya 250 g",
     "coffee",
     "16.0"
    ],
    [
     "P-22",
     "Hand grinder",
     "gear",
     "39.0"
    ],
    [
     "P-30",
     "Kettle",
     "gear",
     "55.0"
    ],
    [
     "P-31",
     "Scale",
     "gear",
     "29.0"
    ]
   ]
  },
  "schemas_default": {
   "cols": [
    "schema_name"
   ],
   "rows": [
    [
     "analytics_intermediate"
    ],
    [
     "analytics_marts"
    ],
    [
     "analytics_reference"
    ],
    [
     "analytics_snapshots"
    ],
    [
     "analytics_staging"
    ]
   ]
  },
  "slim_dev_schemas": {
   "cols": [
    "schema_name"
   ],
   "rows": [
    [
     "dev_alice_marts"
    ],
    [
     "dev_alice_staging"
    ]
   ]
  },
  "slim_dev_tables": {
   "cols": [
    "relation"
   ],
   "rows": [
    [
     "dev_alice_marts.dim_customers"
    ],
    [
     "dev_alice_staging.stg_brewline__customers"
    ]
   ]
  },
  "snap_asof": {
   "cols": [
    "customer_id",
    "tier",
    "country"
   ],
   "rows": [
    [
     "C-12",
     "standard",
     "us"
    ],
    [
     "C-42",
     "standard",
     "us"
    ],
    [
     "C-42",
     "gold",
     "us"
    ],
    [
     "C-77",
     "standard",
     "uk"
    ],
    [
     "C-77",
     "standard",
     "de"
    ],
    [
     "C-91",
     "gold",
     "fr"
    ]
   ]
  },
  "snap_check_day2": {
   "cols": [
    "customer_id",
    "tier",
    "country",
    "dbt_valid_from",
    "dbt_valid_to"
   ],
   "rows": [
    [
     "C-12",
     "standard",
     "us",
     "2026-11-09 10:26:25",
     "NULL"
    ],
    [
     "C-42",
     "standard",
     "us",
     "2026-11-09 10:26:25",
     "2026-11-09 10:26:29"
    ],
    [
     "C-42",
     "gold",
     "us",
     "2026-11-09 10:26:29",
     "NULL"
    ],
    [
     "C-77",
     "standard",
     "uk",
     "2026-11-09 10:26:25",
     "2026-11-09 10:26:29"
    ],
    [
     "C-77",
     "standard",
     "de",
     "2026-11-09 10:26:29",
     "NULL"
    ],
    [
     "C-91",
     "gold",
     "fr",
     "2026-11-09 10:26:25",
     "NULL"
    ]
   ]
  },
  "snap_columns": {
   "cols": [
    "column_name"
   ],
   "rows": [
    [
     "customer_id"
    ],
    [
     "full_name"
    ],
    [
     "email"
    ],
    [
     "country"
    ],
    [
     "tier"
    ],
    [
     "_loaded_at"
    ],
    [
     "dbt_scd_id"
    ],
    [
     "dbt_updated_at"
    ],
    [
     "dbt_valid_from"
    ],
    [
     "dbt_valid_to"
    ]
   ]
  },
  "snap_day1": {
   "cols": [
    "customer_id",
    "tier",
    "country",
    "dbt_valid_from",
    "dbt_valid_to"
   ],
   "rows": [
    [
     "C-12",
     "standard",
     "us",
     "2026-03-14 06:00:00",
     "NULL"
    ],
    [
     "C-42",
     "standard",
     "us",
     "2026-03-14 06:00:00",
     "NULL"
    ],
    [
     "C-77",
     "standard",
     "uk",
     "2026-03-14 06:00:00",
     "NULL"
    ],
    [
     "C-91",
     "gold",
     "fr",
     "2026-03-14 06:00:00",
     "NULL"
    ]
   ]
  },
  "snap_day2": {
   "cols": [
    "customer_id",
    "tier",
    "country",
    "dbt_valid_from",
    "dbt_valid_to"
   ],
   "rows": [
    [
     "C-12",
     "standard",
     "us",
     "2026-03-14 06:00:00",
     "NULL"
    ],
    [
     "C-42",
     "standard",
     "us",
     "2026-03-14 06:00:00",
     "2026-03-18 06:00:00"
    ],
    [
     "C-42",
     "gold",
     "us",
     "2026-03-18 06:00:00",
     "NULL"
    ],
    [
     "C-77",
     "standard",
     "uk",
     "2026-03-14 06:00:00",
     "2026-03-18 06:00:00"
    ],
    [
     "C-77",
     "standard",
     "de",
     "2026-03-18 06:00:00",
     "NULL"
    ],
    [
     "C-91",
     "gold",
     "fr",
     "2026-03-14 06:00:00",
     "NULL"
    ]
   ]
  },
  "snap_day2_full": {
   "cols": [
    "customer_id",
    "full_name",
    "country",
    "tier",
    "_loaded_at",
    "dbt_updated_at",
    "dbt_valid_from",
    "dbt_valid_to"
   ],
   "rows": [
    [
     "C-12",
     "Omar Haddad",
     "us",
     "standard",
     "2026-03-14 06:00:00",
     "2026-03-14 06:00:00",
     "2026-03-14 06:00:00",
     "NULL"
    ],
    [
     "C-42",
     "Ava Martin",
     "us",
     "standard",
     "2026-03-14 06:00:00",
     "2026-03-14 06:00:00",
     "2026-03-14 06:00:00",
     "2026-03-18 06:00:00"
    ],
    [
     "C-42",
     "Ava Martin",
     "us",
     "gold",
     "2026-03-18 06:00:00",
     "2026-03-18 06:00:00",
     "2026-03-18 06:00:00",
     "NULL"
    ],
    [
     "C-77",
     "Noah Singh",
     "uk",
     "standard",
     "2026-03-14 06:00:00",
     "2026-03-14 06:00:00",
     "2026-03-14 06:00:00",
     "2026-03-18 06:00:00"
    ],
    [
     "C-77",
     "Noah Singh",
     "de",
     "standard",
     "2026-03-18 06:00:00",
     "2026-03-18 06:00:00",
     "2026-03-18 06:00:00",
     "NULL"
    ],
    [
     "C-91",
     "Lea Dubois",
     "fr",
     "gold",
     "2026-03-14 06:00:00",
     "2026-03-14 06:00:00",
     "2026-03-14 06:00:00",
     "NULL"
    ]
   ]
  },
  "stg_customers": {
   "cols": [
    "customer_id",
    "full_name",
    "email",
    "country_code",
    "tier"
   ],
   "rows": [
    [
     "C-12",
     "Omar Haddad",
     "omar.haddad@mail.test",
     "US",
     "standard"
    ],
    [
     "C-42",
     "Ava Martin",
     "ava.martin@mail.test",
     "US",
     "standard"
    ],
    [
     "C-77",
     "Noah Singh",
     "noah.singh@mail.test",
     "UK",
     "standard"
    ],
    [
     "C-91",
     "Lea Dubois",
     "lea.dubois@mail.test",
     "FR",
     "gold"
    ]
   ]
  },
  "stg_order_items": {
   "cols": [
    "order_id",
    "line_no",
    "product_id",
    "quantity",
    "unit_price_usd",
    "line_total_usd"
   ],
   "rows": [
    [
     "O-5001",
     "1",
     "P-10",
     "2",
     "14.00",
     "28.00"
    ],
    [
     "O-5001",
     "2",
     "P-22",
     "1",
     "39.00",
     "39.00"
    ],
    [
     "O-5002",
     "1",
     "P-11",
     "1",
     "12.50",
     "12.50"
    ],
    [
     "O-5003",
     "1",
     "P-10",
     "2",
     "14.00",
     "28.00"
    ],
    [
     "O-5004",
     "1",
     "P-30",
     "1",
     "55.00",
     "55.00"
    ],
    [
     "O-5005",
     "1",
     "P-31",
     "1",
     "29.00",
     "29.00"
    ],
    [
     "O-5006",
     "1",
     "P-12",
     "2",
     "16.00",
     "32.00"
    ],
    [
     "O-5006",
     "2",
     "P-11",
     "1",
     "12.50",
     "12.50"
    ],
    [
     "O-5007",
     "1",
     "P-12",
     "1",
     "16.00",
     "16.00"
    ],
    [
     "O-5008",
     "1",
     "P-22",
     "1",
     "39.00",
     "39.00"
    ],
    [
     "O-5009",
     "1",
     "P-31",
     "1",
     "29.00",
     "29.00"
    ]
   ]
  },
  "stg_orders": {
   "cols": [
    "order_id",
    "customer_id",
    "ordered_at",
    "order_status",
    "order_total_usd",
    "loaded_at"
   ],
   "rows": [
    [
     "O-5001",
     "C-42",
     "2026-03-14 09:12:00",
     "SHIPPED",
     "67.00",
     "2026-03-14 10:31:44"
    ],
    [
     "O-5002",
     "C-77",
     "2026-03-14 09:15:00",
     "PLACED",
     "12.50",
     "2026-03-14 09:31:07"
    ],
    [
     "O-5003",
     "C-42",
     "2026-03-14 10:02:00",
     "SHIPPED",
     "28.00",
     "2026-03-14 11:31:20"
    ],
    [
     "O-5004",
     "C-91",
     "2026-03-15 11:20:00",
     "SHIPPED",
     "55.00",
     "2026-03-15 12:00:05"
    ],
    [
     "O-5005",
     "C-12",
     "2026-03-15 14:05:00",
     "CANCELLED",
     "29.00",
     "2026-03-15 15:00:11"
    ],
    [
     "O-5006",
     "C-77",
     "2026-03-16 08:40:00",
     "SHIPPED",
     "44.50",
     "2026-03-16 09:30:02"
    ],
    [
     "O-5007",
     "C-42",
     "2026-03-16 17:55:00",
     "PLACED",
     "16.00",
     "2026-03-16 18:30:09"
    ],
    [
     "O-5008",
     "C-91",
     "2026-03-17 12:30:00",
     "SHIPPED",
     "39.00",
     "2026-03-17 13:00:41"
    ],
    [
     "O-5009",
     "C-12",
     "2026-03-17 15:00:00",
     "SHIPPED",
     "30.00",
     "2026-03-17 16:00:17"
    ],
    [
     "O-5010",
     "C-77",
     "2026-03-17 16:20:00",
     "PLACED",
     "20.00",
     "2026-03-17 17:00:03"
    ]
   ]
  },
  "stg_products": {
   "cols": [
    "product_id",
    "product_name",
    "category",
    "list_price_usd"
   ],
   "rows": [
    [
     "P-10",
     "Ethiopia 250 g",
     "coffee",
     "14.00"
    ],
    [
     "P-11",
     "Colombia 250 g",
     "coffee",
     "12.50"
    ],
    [
     "P-12",
     "Kenya 250 g",
     "coffee",
     "16.00"
    ],
    [
     "P-22",
     "Hand grinder",
     "gear",
     "39.00"
    ],
    [
     "P-30",
     "Kettle",
     "gear",
     "55.00"
    ],
    [
     "P-31",
     "Scale",
     "gear",
     "29.00"
    ]
   ]
  },
  "store_failures_rows": {
   "cols": [
    "value_field",
    "n_records"
   ],
   "rows": [
    [
     "REFUNDED",
     "1"
    ]
   ]
  },
  "store_failures_tables": {
   "cols": [
    "table_schema",
    "table_name"
   ],
   "rows": [
    [
     "analytics_dbt_test__audit",
     "accepted_values_stg_brewline___fb3d689ef2b6116335190138f3581b6c"
    ],
    [
     "analytics_dbt_test__audit",
     "not_null_stg_brewline__orders_customer_id"
    ],
    [
     "analytics_dbt_test__audit",
     "not_null_stg_brewline__orders_order_id"
    ],
    [
     "analytics_dbt_test__audit",
     "positive_value_stg_brewline__orders_order_total_usd"
    ],
    [
     "analytics_dbt_test__audit",
     "relationships_stg_brewline__or_87f38ce99566346eabf0d27dba43d03c"
    ],
    [
     "analytics_dbt_test__audit",
     "unique_stg_brewline__orders_order_id"
    ]
   ]
  },
  "strategy_append_counts": {
   "cols": [
    "rows_in_table",
    "distinct_orders"
   ],
   "rows": [
    [
     "12",
     "11"
    ]
   ]
  },
  "strategy_append_rows": {
   "cols": [
    "order_id",
    "order_status",
    "order_total_usd",
    "loaded_at"
   ],
   "rows": [
    [
     "O-5001",
     "SHIPPED",
     "67.00",
     "2026-03-14 10:31:44"
    ],
    [
     "O-5002",
     "PLACED",
     "12.50",
     "2026-03-14 09:31:07"
    ],
    [
     "O-5003",
     "SHIPPED",
     "28.00",
     "2026-03-14 11:31:20"
    ],
    [
     "O-5004",
     "SHIPPED",
     "55.00",
     "2026-03-15 12:00:05"
    ],
    [
     "O-5005",
     "CANCELLED",
     "29.00",
     "2026-03-15 15:00:11"
    ],
    [
     "O-5006",
     "SHIPPED",
     "44.50",
     "2026-03-16 09:30:02"
    ],
    [
     "O-5007",
     "PLACED",
     "16.00",
     "2026-03-16 18:30:09"
    ],
    [
     "O-5008",
     "SHIPPED",
     "39.00",
     "2026-03-17 13:00:41"
    ],
    [
     "O-5009",
     "SHIPPED",
     "30.00",
     "2026-03-17 16:00:17"
    ],
    [
     "O-5010",
     "PLACED",
     "20.00",
     "2026-03-17 17:00:03"
    ],
    [
     "O-5010",
     "SHIPPED",
     "20.00",
     "2026-03-18 09:00:00"
    ],
    [
     "O-5011",
     "PLACED",
     "28.50",
     "2026-03-18 09:00:00"
    ]
   ]
  },
  "strategy_delete_insert_counts": {
   "cols": [
    "rows_in_table",
    "distinct_orders"
   ],
   "rows": [
    [
     "11",
     "11"
    ]
   ]
  },
  "strategy_delete_insert_rows": {
   "cols": [
    "order_id",
    "order_status",
    "order_total_usd",
    "loaded_at"
   ],
   "rows": [
    [
     "O-5001",
     "SHIPPED",
     "67.00",
     "2026-03-14 10:31:44"
    ],
    [
     "O-5002",
     "PLACED",
     "12.50",
     "2026-03-14 09:31:07"
    ],
    [
     "O-5003",
     "SHIPPED",
     "28.00",
     "2026-03-14 11:31:20"
    ],
    [
     "O-5004",
     "SHIPPED",
     "55.00",
     "2026-03-15 12:00:05"
    ],
    [
     "O-5005",
     "CANCELLED",
     "29.00",
     "2026-03-15 15:00:11"
    ],
    [
     "O-5006",
     "SHIPPED",
     "44.50",
     "2026-03-16 09:30:02"
    ],
    [
     "O-5007",
     "PLACED",
     "16.00",
     "2026-03-16 18:30:09"
    ],
    [
     "O-5008",
     "SHIPPED",
     "39.00",
     "2026-03-17 13:00:41"
    ],
    [
     "O-5009",
     "SHIPPED",
     "30.00",
     "2026-03-17 16:00:17"
    ],
    [
     "O-5010",
     "SHIPPED",
     "20.00",
     "2026-03-18 09:00:00"
    ],
    [
     "O-5011",
     "PLACED",
     "28.50",
     "2026-03-18 09:00:00"
    ]
   ]
  },
  "strategy_merge_counts": {
   "cols": [
    "rows_in_table",
    "distinct_orders"
   ],
   "rows": [
    [
     "11",
     "11"
    ]
   ]
  },
  "strategy_merge_rows": {
   "cols": [
    "order_id",
    "order_status",
    "order_total_usd",
    "loaded_at"
   ],
   "rows": [
    [
     "O-5001",
     "SHIPPED",
     "67.00",
     "2026-03-14 10:31:44"
    ],
    [
     "O-5002",
     "PLACED",
     "12.50",
     "2026-03-14 09:31:07"
    ],
    [
     "O-5003",
     "SHIPPED",
     "28.00",
     "2026-03-14 11:31:20"
    ],
    [
     "O-5004",
     "SHIPPED",
     "55.00",
     "2026-03-15 12:00:05"
    ],
    [
     "O-5005",
     "CANCELLED",
     "29.00",
     "2026-03-15 15:00:11"
    ],
    [
     "O-5006",
     "SHIPPED",
     "44.50",
     "2026-03-16 09:30:02"
    ],
    [
     "O-5007",
     "PLACED",
     "16.00",
     "2026-03-16 18:30:09"
    ],
    [
     "O-5008",
     "SHIPPED",
     "39.00",
     "2026-03-17 13:00:41"
    ],
    [
     "O-5009",
     "SHIPPED",
     "30.00",
     "2026-03-17 16:00:17"
    ],
    [
     "O-5010",
     "SHIPPED",
     "20.00",
     "2026-03-18 09:00:00"
    ],
    [
     "O-5011",
     "PLACED",
     "28.50",
     "2026-03-18 09:00:00"
    ]
   ]
  },
  "strategy_microbatch_counts": {
   "cols": [
    "rows_in_table",
    "distinct_orders"
   ],
   "rows": [
    [
     "11",
     "11"
    ]
   ]
  },
  "strategy_microbatch_rows": {
   "cols": [
    "order_id",
    "order_status",
    "order_total_usd",
    "loaded_at"
   ],
   "rows": [
    [
     "O-5001",
     "SHIPPED",
     "67.00",
     "2026-03-14 10:31:44"
    ],
    [
     "O-5002",
     "PLACED",
     "12.50",
     "2026-03-14 09:31:07"
    ],
    [
     "O-5003",
     "SHIPPED",
     "28.00",
     "2026-03-14 11:31:20"
    ],
    [
     "O-5004",
     "SHIPPED",
     "55.00",
     "2026-03-15 12:00:05"
    ],
    [
     "O-5005",
     "CANCELLED",
     "29.00",
     "2026-03-15 15:00:11"
    ],
    [
     "O-5006",
     "SHIPPED",
     "44.50",
     "2026-03-16 09:30:02"
    ],
    [
     "O-5007",
     "PLACED",
     "16.00",
     "2026-03-16 18:30:09"
    ],
    [
     "O-5008",
     "SHIPPED",
     "39.00",
     "2026-03-17 13:00:41"
    ],
    [
     "O-5009",
     "SHIPPED",
     "30.00",
     "2026-03-17 16:00:17"
    ],
    [
     "O-5010",
     "SHIPPED",
     "20.00",
     "2026-03-18 09:00:00"
    ],
    [
     "O-5011",
     "PLACED",
     "28.50",
     "2026-03-18 09:00:00"
    ]
   ]
  }
 },
 "text": {
  "manifest_fct_orders": "{\n  \"unique_id\": \"model.brewline.fct_orders\",\n  \"resource_type\": \"model\",\n  \"path\": \"marts/core/fct_orders.sql\",\n  \"config\": {\n    \"materialized\": \"incremental\",\n    \"unique_key\": \"order_id\",\n    \"on_schema_change\": \"append_new_columns\",\n    \"tags\": [\n      \"daily\"\n    ]\n  },\n  \"depends_on\": {\n    \"macros\": [\n      \"macro.dbt.is_incremental\"\n    ],\n    \"nodes\": [\n      \"model.brewline.int_orders__with_items\"\n    ]\n  },\n  \"checksum\": {\n    \"name\": \"sha256\",\n    \"checksum\": \"f3559e1affc6...\"\n  }\n}",
  "manifest_keys": "[\"child_map\", \"disabled\", \"docs\", \"exposures\", \"functions\", \"group_map\", \"groups\", \"macros\", \"metadata\", \"metrics\", \"nodes\", \"parent_map\", \"saved_queries\", \"selectors\", \"semantic_models\", \"sources\", \"unit_tests\"]",
  "run_result_fct_orders": "{\n  \"unique_id\": \"model.brewline.fct_orders\",\n  \"status\": \"success\",\n  \"execution_time\": 0.13,\n  \"adapter_response\": {\n    \"_message\": \"OK\"\n  },\n  \"message\": \"OK\",\n  \"failures\": null\n}",
  "run_results_keys": "[\"args\", \"elapsed_time\", \"metadata\", \"results\"]",
  "selectors": "{\"model\": \"stg_brewline__orders\", \"up\": \"+fct_orders\", \"down\": \"stg_brewline__orders+\", \"both\": \"+fct_daily_revenue\", \"one_up\": \"1+fct_orders\", \"plus_at\": \"@stg_brewline__customers\", \"tag_pii\": \"tag:pii\", \"tag_daily\": \"tag:daily\", \"path_staging\": \"path:models/staging\", \"path_core\": \"models/marts/core\", \"source_down\": \"source:brewline+\", \"source_orders_down\": \"source:brewline.orders+\", \"seed\": \"resource_type:seed\", \"incremental\": \"config.materialized:incremental\", \"table\": \"config.materialized:table\", \"union\": \"fct_orders dim_customers\", \"intersection\": \"+fct_orders,+dim_customers\", \"exposure_up\": \"+exposure:finance_dashboard\", \"access_public\": \"access:public\", \"group_finance\": \"group:finance\", \"down_two\": \"stg_brewline__orders+2\", \"all\": \"fqn:*\"}",
  "slowest_code": "import json\nr = json.load(open(\"target/run_results.json\"))[\"results\"]\nfor x in sorted(r, key=lambda x: -x[\"execution_time\"])[:3]:\n    print(f\"{x['execution_time']:6.2f}s  {x['unique_id']}\")",
  "slowest_out": "  0.23s  unit_test.brewline.stg_brewline__orders.test_stg_orders_keeps_the_latest_version\n  0.20s  model.brewline.stg_brewline__order_items\n  0.15s  model.brewline.fct_daily_revenue",
  "tree": "brewline/\n├── macros/\n│   ├── cents_to_dollars.sql\n│   └── limit_in_dev.sql\n├── models/\n│   ├── intermediate/\n│   │   └── int_orders__with_items.sql\n│   ├── marts/\n│   │   ├── core/\n│   │   │   ├── _core__unit_tests.yml\n│   │   │   ├── dim_customers.sql\n│   │   │   ├── dim_products_v1.sql\n│   │   │   ├── dim_products_v2.sql\n│   │   │   └── fct_orders.sql\n│   │   ├── finance/\n│   │   │   └── fct_daily_revenue.sql\n│   │   ├── _exposures.yml\n│   │   ├── _groups.yml\n│   │   └── _marts__models.yml\n│   ├── staging/\n│   │   └── brewline/\n│   │       ├── _brewline__models.yml\n│   │       ├── _brewline__sources.yml\n│   │       ├── _brewline__unit_tests.yml\n│   │       ├── stg_brewline__customers.sql\n│   │       ├── stg_brewline__order_items.sql\n│   │       ├── stg_brewline__orders.sql\n│   │       └── stg_brewline__products.sql\n│   └── docs.md\n├── seeds/\n│   └── country_names.csv\n├── snapshots/\n│   └── snap_customers.yml\n├── tests/\n│   ├── generic/\n│   │   └── positive_value.sql\n│   └── assert_order_total_matches_lines.sql\n├── .gitignore\n├── .user.yml\n├── dbt_project.yml\n├── packages.yml\n└── profiles.yml"
 }
};
