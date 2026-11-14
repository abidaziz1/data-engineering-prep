window.LAB = window.LAB || {};
LAB.real = {
 "counts": {
  "hyper.append": {
   "bytes_after": 1703936,
   "bytes_before": 917504,
   "completed_revenue_in_extract": 6306370.5,
   "completed_revenue_in_source": 6306314.5,
   "difference": 56.0,
   "late_order_amount": 56.0,
   "late_order_date": "2025-11-17",
   "late_order_id": 39622,
   "late_order_status_in_extract": "completed",
   "late_order_status_in_source": "refunded",
   "rows_after": 122196,
   "rows_appended": 315,
   "rows_before": 121881,
   "rows_in_source": 122196,
   "tile_matches_duckdb_after_append": true
  },
  "hyper.build": {
   "columns": 11,
   "newest_day_in_extract": "2026-03-30",
   "rows_in_extract": 121881,
   "rows_loaded": 121881,
   "tile_matches_duckdb_before_the_last_day": true
  },
  "lookml.summary": {
   "access_filter_field": "stores.region",
   "access_filter_user_attribute": "region",
   "columns_not_in_the_warehouse": [],
   "connection": "brewline_warehouse",
   "datagroup": "nightly_load",
   "datagroup_max_cache_age": "24 hours",
   "dimension_groups": 1,
   "dimensions": 16,
   "explores": 1,
   "joins": 3,
   "measures": 5,
   "primary_keys": 4,
   "views": 4
  },
  "measures.aov": {
   "average_of_ratios": 111.8,
   "ratio_of_sums": 110.89
  },
  "measures.cohort": {
   "customers_who_ordered": 2000
  },
  "measures.distinct": {
   "quarter": 1997,
   "sum_of_the_months": 5262
  },
  "model.fanout": {
   "lines": 122196,
   "lines_per_order": 2.09,
   "max_lines_on_an_order": 4,
   "orders": 58385,
   "revenue_total": 6494608.5,
   "shipping_fixed": 126183.5,
   "shipping_right": 126183.5,
   "shipping_wrong": 264974.0,
   "times_too_high": 2.1
  },
  "model.m2m": {
   "orders_summed_over_codes": 17652,
   "orders_with_a_code": 14661,
   "orders_with_two_codes": 2991,
   "revenue_of_orders_with_a_code": 1612839.5,
   "revenue_summed_over_codes": 1940789.0
  },
  "perf.agg": {
   "agg_rows": 21449,
   "categories": 4,
   "customers_march_summed_from_agg": 7696,
   "customers_march_true": 1788,
   "days": 455,
   "fact_rows": 122196,
   "most_rows_possible": 21840,
   "stores": 12,
   "tile_same_numbers": true,
   "times_fewer_rows": 5.7
  },
  "perf.columns": {
   "rows": 122196,
   "top_two": [
    "order_id",
    "customer_id"
   ],
   "top_two_share_pct": 56.5,
   "total_bytes": 830004
  },
  "perf.page": {
   "queries_live": 6,
   "rows_read_all_from_fact": 733176,
   "rows_read_with_aggregate": 330188,
   "tiles": 6,
   "viewers_in_the_example": 40
  },
  "powerbi.refresh_request": {
   "body_keys": [
    "commitMode",
    "objects",
    "retryCount",
    "type"
   ],
   "method": "POST",
   "sent": false
  },
  "refresh.policy": {
   "completed_revenue_model_after_detect_changes": 6306314.5,
   "completed_revenue_model_after_incremental": 6306370.5,
   "completed_revenue_source": 6306314.5,
   "difference_after_detect_changes": 0.0,
   "difference_after_incremental": 56.0,
   "keep_months": 12,
   "late_order_amount": 56.0,
   "late_order_month": "2025-11",
   "months_in_source": 15,
   "months_refreshed": [
    "2026-02",
    "2026-03"
   ],
   "months_with_changes_today": [
    "2025-11",
    "2026-03"
   ],
   "percent_of_full": 14.4,
   "refresh_months": 2,
   "rows_detect_changes": 17843,
   "rows_full_refresh": 122196,
   "rows_incremental_refresh": 17552
  },
  "rls.summary": {
   "march_lines_all": 9285,
   "march_revenue_all": 492014.0,
   "unknown_user_lines": 0,
   "users": 5
  },
  "tableau.change": {
   "attributes_changed": [
    "connection@dbname",
    "connection@server"
   ],
   "attributes_in_the_file": 49,
   "calculated_fields": 1,
   "caption_of_the_connection_after": "dev-warehouse.brewline.example",
   "fields": 6,
   "has_password": false
  }
 },
 "files": {
  "build_extract.py": "\"\"\"Build a Tableau extract (.hyper) from a CSV file, and append a later file to it. Uses the Hyper API, the engine behind a Tableau extract.\"\"\"\nfrom tableauhyperapi import Connection, CreateMode, HyperProcess, Telemetry, escape_string_literal\n\nTABLE = \"\"\"CREATE TABLE sales (\n  order_id int NOT NULL, line_no int NOT NULL, order_date date NOT NULL,\n  store_id text NOT NULL, region text NOT NULL, customer_id int NOT NULL,\n  product_id int NOT NULL, category text NOT NULL, quantity int NOT NULL,\n  line_amount double precision NOT NULL, status text NOT NULL)\"\"\"\n\n\ndef build(hyper, csv_file, extract):\n    \"\"\"A full refresh: a new file with every row of the CSV.\"\"\"\n    with Connection(hyper.endpoint, extract, CreateMode.CREATE_AND_REPLACE) as con:\n        con.execute_command(TABLE)\n        return con.execute_command(f\"COPY sales FROM {escape_string_literal(csv_file)} WITH (format csv, header)\")\n\n\ndef append(hyper, csv_file, extract):\n    \"\"\"An incremental refresh: add the rows of a newer file. Rows that are already in the extract are not looked at.\"\"\"\n    with Connection(hyper.endpoint, extract, CreateMode.NONE) as con:\n        return con.execute_command(f\"COPY sales FROM {escape_string_literal(csv_file)} WITH (format csv, header)\")\n\n\ndef start(log_dir):\n    return HyperProcess(telemetry=Telemetry.DO_NOT_SEND_USAGE_DATA_TO_TABLEAU, parameters={\"log_dir\": log_dir})\n",
  "hyper/tile.sql": "SELECT region, to_char(order_date, 'YYYY-MM') AS month, CAST(round(CAST(sum(line_amount) AS numeric(18, 2)), 2) AS double precision) AS revenue FROM sales WHERE order_date >= DATE '2026-01-01' AND order_date < DATE '2026-04-01' GROUP BY 1, 2 ORDER BY 1, 2",
  "lookml/brewline.model.lkml": "connection: \"brewline_warehouse\"\n\ninclude: \"/views/*.view.lkml\"\n\ndatagroup: nightly_load {\n  sql_trigger: SELECT max(loaded_at) FROM analytics.load_log ;;\n  max_cache_age: \"24 hours\"\n}\n\nexplore: order_lines {\n  label: \"Sales\"\n  persist_with: nightly_load\n\n  join: orders {\n    type: left_outer\n    relationship: many_to_one\n    sql_on: ${order_lines.order_id} = ${orders.order_id} ;;\n  }\n\n  join: stores {\n    type: left_outer\n    relationship: many_to_one\n    sql_on: ${orders.store_id} = ${stores.store_id} ;;\n  }\n\n  join: products {\n    type: left_outer\n    relationship: many_to_one\n    sql_on: ${order_lines.product_id} = ${products.product_id} ;;\n  }\n\n  access_filter: {\n    field: stores.region\n    user_attribute: region\n  }\n}\n",
  "lookml/broken.view.lkml": "view: orders_broken {\n  sql_table_name: analytics.fact_orders ;;\n\n  dimension: order_id {\n    primary_key: yes\n    type: number\n    sql: ${TABLE}.order_id ;;\n\n  measure: order_count {\n    type: count\n  }\n}\n",
  "lookml/views/order_lines.view.lkml": "view: order_lines {\n  sql_table_name: analytics.fact_order_lines ;;\n\n  dimension: line_key {\n    primary_key: yes\n    hidden: yes\n    type: string\n    sql: ${TABLE}.order_id || '-' || ${TABLE}.line_no ;;\n  }\n\n  dimension: order_id {\n    hidden: yes\n    type: number\n    sql: ${TABLE}.order_id ;;\n  }\n\n  dimension: product_id {\n    hidden: yes\n    type: number\n    sql: ${TABLE}.product_id ;;\n  }\n\n  dimension: quantity {\n    type: number\n    sql: ${TABLE}.quantity ;;\n  }\n\n  dimension: line_amount {\n    hidden: yes\n    type: number\n    sql: ${TABLE}.line_amount ;;\n  }\n\n  measure: revenue {\n    type: sum\n    sql: ${line_amount} ;;\n    value_format_name: usd\n    description: \"Sum of the line amounts. Shipping is not part of it.\"\n  }\n\n  measure: units {\n    type: sum\n    sql: ${quantity} ;;\n  }\n}\n",
  "lookml/views/orders.view.lkml": "view: orders {\n  sql_table_name: analytics.fact_orders ;;\n\n  dimension: order_id {\n    primary_key: yes\n    type: number\n    sql: ${TABLE}.order_id ;;\n  }\n\n  dimension: store_id {\n    hidden: yes\n    type: string\n    sql: ${TABLE}.store_id ;;\n  }\n\n  dimension: customer_id {\n    hidden: yes\n    type: number\n    sql: ${TABLE}.customer_id ;;\n  }\n\n  dimension: status {\n    type: string\n    sql: ${TABLE}.status ;;\n  }\n\n  dimension: shipping_fee {\n    hidden: yes\n    type: number\n    sql: ${TABLE}.shipping_fee ;;\n  }\n\n  dimension_group: ordered {\n    type: time\n    datatype: date\n    timeframes: [date, month, quarter, year]\n    sql: ${TABLE}.order_date ;;\n  }\n\n  measure: order_count {\n    type: count\n  }\n\n  measure: shipping_total {\n    type: sum\n    sql: ${shipping_fee} ;;\n    value_format_name: usd\n  }\n\n  measure: customers {\n    type: count_distinct\n    sql: ${customer_id} ;;\n  }\n}\n",
  "lookml/views/products.view.lkml": "view: products {\n  sql_table_name: analytics.dim_product ;;\n\n  dimension: product_id {\n    primary_key: yes\n    type: number\n    sql: ${TABLE}.product_id ;;\n  }\n\n  dimension: product_name {\n    type: string\n    sql: ${TABLE}.product_name ;;\n  }\n\n  dimension: category {\n    type: string\n    sql: ${TABLE}.category ;;\n  }\n}\n",
  "lookml/views/stores.view.lkml": "view: stores {\n  sql_table_name: analytics.dim_store ;;\n\n  dimension: store_id {\n    primary_key: yes\n    type: string\n    sql: ${TABLE}.store_id ;;\n  }\n\n  dimension: city {\n    type: string\n    sql: ${TABLE}.city ;;\n  }\n\n  dimension: region {\n    type: string\n    sql: ${TABLE}.region ;;\n  }\n}\n",
  "powerbi/fact_order_lines.tmdl": "table fact_order_lines\n\n\tmeasure Revenue = SUM ( fact_order_lines[line_amount] )\n\t\tformatString: \\$ #,0.00\n\n\tmeasure 'Revenue all regions' = CALCULATE ( [Revenue], REMOVEFILTERS ( dim_store[region] ) )\n\t\tformatString: \\$ #,0.00\n\n\tmeasure 'Share of revenue' = DIVIDE ( [Revenue], [Revenue all regions] )\n\t\tformatString: 0.0%\n\n\tmeasure 'Revenue YTD' = TOTALYTD ( [Revenue], dim_date[date] )\n\t\tformatString: \\$ #,0.00\n\n\tcolumn order_id\n\t\tdataType: int64\n\t\tisHidden\n\t\tsummarizeBy: none\n\t\tsourceColumn: order_id\n\n\tcolumn product_id\n\t\tdataType: int64\n\t\tisHidden\n\t\tsummarizeBy: none\n\t\tsourceColumn: product_id\n\n\tcolumn quantity\n\t\tdataType: int64\n\t\tsummarizeBy: sum\n\t\tsourceColumn: quantity\n\n\tcolumn line_amount\n\t\tdataType: decimal\n\t\tisHidden\n\t\tsummarizeBy: none\n\t\tsourceColumn: line_amount\n\n\tpartition fact_order_lines = m\n\t\tmode: import\n\t\tsource =\n\t\t\t\tlet\n\t\t\t\t    Source = PostgreSQL.Database(\"warehouse.brewline.example\", \"analytics\"),\n\t\t\t\t    Lines = Source{[Schema = \"analytics\", Item = \"fact_order_lines\"]}[Data],\n\t\t\t\t    Kept = Table.SelectRows(Lines, each [order_date] >= RangeStart and [order_date] < RangeEnd)\n\t\t\t\tin\n\t\t\t\t    Kept\n",
  "sql/agg_build.sql": "-- One row for each day, store and category: the table that most tiles can read.\nCREATE OR REPLACE TABLE agg_day_store_category AS\nSELECT o.order_date,\n       o.store_id,\n       p.category,\n       sum(l.line_amount)          AS revenue,\n       sum(l.quantity)             AS units,\n       count(DISTINCT o.order_id)  AS orders,\n       count(DISTINCT o.customer_id) AS customers_that_day\nFROM fact_order_lines l\nJOIN fact_orders o ON o.order_id = l.order_id\nJOIN dim_product p ON p.product_id = l.product_id\nGROUP BY o.order_date, o.store_id, p.category;\n",
  "sql/aov.sql": "-- Average order value for March 2026, two ways.\nWITH per_store AS (\n  SELECT o.store_id,\n         sum(l.line_amount)         AS revenue,\n         count(DISTINCT o.order_id) AS orders\n  FROM fact_order_lines l\n  JOIN fact_orders o ON o.order_id = l.order_id\n  WHERE o.order_date >= DATE '2026-03-01' AND o.order_date < DATE '2026-04-01'\n  GROUP BY o.store_id\n)\nSELECT round(sum(revenue) / sum(orders), 2)  AS ratio_of_sums,       -- the measure, computed at the level of the question\n       round(avg(revenue / orders), 2)       AS average_of_ratios    -- an average of twelve store averages\nFROM per_store;\n",
  "sql/cohort.sql": "-- A value fixed at the level of the customer, whatever the view shows: the quarter of the first order.\nWITH first_order AS (\n  SELECT customer_id, min(order_date) AS first_date\n  FROM fact_orders\n  GROUP BY customer_id\n)\nSELECT CAST(year(first_date) AS VARCHAR) || '-Q' || CAST(quarter(first_date) AS VARCHAR) AS first_quarter,\n       count(*)                                                                         AS customers\nFROM first_order\nGROUP BY first_quarter\nORDER BY first_quarter;\n",
  "sql/distinct.sql": "-- Customers who ordered, by month, and for the whole quarter. A distinct count does not add up.\nSELECT strftime(order_date, '%Y-%m') AS month,\n       count(DISTINCT customer_id)   AS customers\nFROM fact_orders\nWHERE order_date >= DATE '2026-01-01' AND order_date < DATE '2026-04-01'\nGROUP BY month\nORDER BY month;\n",
  "sql/fanout_fixed.sql": "-- Bring the lines to the grain of the order first, then join one row to one row.\nWITH lines AS (\n  SELECT order_id, sum(line_amount) AS revenue\n  FROM fact_order_lines\n  GROUP BY order_id\n)\nSELECT count(*)               AS rows_read,\n       sum(o.shipping_fee)    AS shipping_total,\n       sum(l.revenue)         AS revenue_total\nFROM fact_orders o\nJOIN lines l ON l.order_id = o.order_id;\n",
  "sql/fanout_right.sql": "-- The shipping fee lives on the order. Sum it from the orders table.\nSELECT count(*)               AS rows_read,\n       sum(shipping_fee)      AS shipping_total\nFROM fact_orders;\n",
  "sql/fanout_wrong.sql": "-- The same sum after a join to the order lines: an order with three lines is read three times.\nSELECT count(*)               AS rows_read,\n       sum(o.shipping_fee)    AS shipping_total\nFROM fact_orders o\nJOIN fact_order_lines l ON l.order_id = o.order_id;\n",
  "sql/m2m.sql": "-- An order can carry two promotion codes. Revenue by code counts such an order under both codes.\nSELECT p.promo_code,\n       count(DISTINCT l.order_id) AS orders,\n       sum(l.line_amount)         AS revenue\nFROM bridge_order_promos p\nJOIN fact_order_lines l ON l.order_id = p.order_id\nGROUP BY p.promo_code\nORDER BY p.promo_code;\n",
  "sql/rls.sql": "-- Row-level security as the database sees it: the user's regions become a filter on every query.\nSELECT count(*)            AS order_lines_visible,\n       sum(l.line_amount)  AS revenue_visible\nFROM fact_order_lines l\nJOIN fact_orders o ON o.order_id = l.order_id\nJOIN dim_store   s ON s.store_id = o.store_id\nWHERE o.order_date >= DATE '2026-03-01' AND o.order_date < DATE '2026-04-01'\n  AND (\n        EXISTS (SELECT 1 FROM bi_users u WHERE u.email = $email AND u.sees_all)\n     OR s.region IN (SELECT r.region FROM bi_user_regions r WHERE r.email = $email)\n      );\n",
  "sql/share.sql": "-- Share of total: the numerator follows the filter, the denominator ignores the region.\nSELECT s.region,\n       sum(l.line_amount)                                              AS revenue,\n       sum(sum(l.line_amount)) OVER ()                                 AS revenue_all_regions,\n       round(100.0 * sum(l.line_amount) / sum(sum(l.line_amount)) OVER (), 1) AS share_pct\nFROM fact_order_lines l\nJOIN fact_orders o ON o.order_id = l.order_id\nJOIN dim_store   s ON s.store_id = o.store_id\nWHERE o.order_date >= DATE '2026-03-01' AND o.order_date < DATE '2026-04-01'\nGROUP BY s.region\nORDER BY s.region;\n",
  "sql/tile.sql": "-- One tile of the dashboard: revenue by region and month, first quarter of 2026.\nSELECT s.region,\n       strftime(o.order_date, '%Y-%m') AS month,\n       sum(l.line_amount)              AS revenue\nFROM fact_order_lines l\nJOIN fact_orders o ON o.order_id = l.order_id\nJOIN dim_store   s ON s.store_id = o.store_id\nWHERE o.order_date >= DATE '2026-01-01' AND o.order_date < DATE '2026-04-01'\nGROUP BY s.region, month\nORDER BY s.region, month;\n",
  "sql/tile_from_agg.sql": "-- The same tile, answered from the aggregate table.\nSELECT s.region,\n       strftime(a.order_date, '%Y-%m') AS month,\n       sum(a.revenue)                  AS revenue\nFROM agg_day_store_category a\nJOIN dim_store s ON s.store_id = a.store_id\nWHERE a.order_date >= DATE '2026-01-01' AND a.order_date < DATE '2026-04-01'\nGROUP BY s.region, month\nORDER BY s.region, month;\n",
  "sql/ytd.sql": "-- Revenue by month of 2026 and the running total for the year.\nWITH m AS (\n  SELECT strftime(o.order_date, '%Y-%m') AS month, sum(l.line_amount) AS revenue\n  FROM fact_order_lines l\n  JOIN fact_orders o ON o.order_id = l.order_id\n  WHERE o.order_date >= DATE '2026-01-01'\n  GROUP BY month\n)\nSELECT month, revenue, sum(revenue) OVER (ORDER BY month) AS revenue_ytd\nFROM m\nORDER BY month;\n",
  "tableau/brewline_sales.tds": "<?xml version='1.0' encoding='utf-8' ?>\n<datasource formatted-name='Brewline sales' inline='true' source-platform='linux' version='18.1' xmlns:user='http://www.tableausoftware.com/xml/user'>\n  <connection class='federated'>\n    <named-connections>\n      <named-connection caption='dev-warehouse.brewline.example' name='postgres.brewline'>\n        <connection authentication='username-password' class='postgres' dbname='analytics_dev' port='5432' server='dev-warehouse.brewline.example' username='tableau_reader' />\n      </named-connection>\n    </named-connections>\n    <relation connection='postgres.brewline' name='agg_day_store_category' table='[analytics].[agg_day_store_category]' type='table' />\n  </connection>\n  <column caption='Order date' datatype='date' name='[order_date]' role='dimension' type='ordinal' />\n  <column caption='Store' datatype='string' name='[store_id]' role='dimension' type='nominal' />\n  <column caption='Category' datatype='string' name='[category]' role='dimension' type='nominal' />\n  <column caption='Revenue' datatype='real' name='[revenue]' role='measure' type='quantitative' />\n  <column caption='Units' datatype='integer' name='[units]' role='measure' type='quantitative' />\n  <column caption='Average order value' datatype='real' name='[Calculation_aov]' role='measure' type='quantitative'>\n    <calculation class='tableau' formula='SUM([revenue]) / SUM([orders])' />\n  </column>\n</datasource>\n",
  "tableau/switch_connection.py": "\"\"\"Point a Tableau data source file at another server, without opening Tableau. Uses the Tableau Document API.\"\"\"\nfrom tableaudocumentapi import Datasource\n\n\ndef switch(src, dst, server, dbname):\n    ds = Datasource.from_file(src)\n    for con in ds.connections:\n        con.server = server\n        con.dbname = dbname\n    ds.save_as(dst)\n    return [(c.dbclass, c.server, c.dbname, c.username) for c in ds.connections]\n"
 },
 "meta": {
  "company": "Brewline",
  "duckdb": "2.0.0",
  "first_day": "2025-01-01",
  "lkml": "1.3.7",
  "note": "Recorded by bi/verify/capture_bi.py with DuckDB, the Tableau Hyper engine, the lkml parser and the Tableau Document API on made-up data. Power BI, Tableau Desktop, Tableau Server and Looker did not run.",
  "pyarrow": "26.0.1",
  "python": "3.13.18",
  "requests": "2.34.2",
  "tableaudocumentapi": "0.11",
  "tableauhyperapi": "0.0.26963",
  "today": "2026-03-31"
 },
 "tables": {
  "hyper.sizes": {
   "cols": [
    "file",
    "format",
    "rows",
    "bytes"
   ],
   "rows": [
    [
     "sales.csv",
     "CSV, text",
     121881,
     7179234
    ],
    [
     "sales.parquet",
     "Parquet, columns, compressed",
     121881,
     834580
    ],
    [
     "sales.hyper",
     "Tableau extract, columns",
     121881,
     917504
    ]
   ]
  },
  "hyper.tile": {
   "cols": [
    "region",
    "month",
    "revenue"
   ],
   "rows": [
    [
     "East",
     "2026-01",
     97112.5
    ],
    [
     "East",
     "2026-02",
     91834.5
    ],
    [
     "East",
     "2026-03",
     106713.0
    ],
    [
     "North",
     "2026-01",
     170962.5
    ],
    [
     "North",
     "2026-02",
     147210.0
    ],
    [
     "North",
     "2026-03",
     183854.0
    ],
    [
     "South",
     "2026-01",
     106427.5
    ],
    [
     "South",
     "2026-02",
     97787.0
    ],
    [
     "South",
     "2026-03",
     101722.0
    ],
    [
     "West",
     "2026-01",
     100240.0
    ],
    [
     "West",
     "2026-02",
     94310.0
    ],
    [
     "West",
     "2026-03",
     99725.0
    ]
   ]
  },
  "lookml.fields": {
   "cols": [
    "view",
    "kind",
    "name",
    "type",
    "primary key",
    "hidden"
   ],
   "rows": [
    [
     "order_lines",
     "dimension",
     "line_key",
     "string",
     "yes",
     "yes"
    ],
    [
     "order_lines",
     "dimension",
     "order_id",
     "number",
     "",
     "yes"
    ],
    [
     "order_lines",
     "dimension",
     "product_id",
     "number",
     "",
     "yes"
    ],
    [
     "order_lines",
     "dimension",
     "quantity",
     "number",
     "",
     ""
    ],
    [
     "order_lines",
     "dimension",
     "line_amount",
     "number",
     "",
     "yes"
    ],
    [
     "order_lines",
     "measure",
     "revenue",
     "sum",
     "",
     ""
    ],
    [
     "order_lines",
     "measure",
     "units",
     "sum",
     "",
     ""
    ],
    [
     "orders",
     "dimension",
     "order_id",
     "number",
     "yes",
     ""
    ],
    [
     "orders",
     "dimension",
     "store_id",
     "string",
     "",
     "yes"
    ],
    [
     "orders",
     "dimension",
     "customer_id",
     "number",
     "",
     "yes"
    ],
    [
     "orders",
     "dimension",
     "status",
     "string",
     "",
     ""
    ],
    [
     "orders",
     "dimension",
     "shipping_fee",
     "number",
     "",
     "yes"
    ],
    [
     "orders",
     "dimension group",
     "ordered",
     "time",
     "",
     ""
    ],
    [
     "orders",
     "measure",
     "order_count",
     "count",
     "",
     ""
    ],
    [
     "orders",
     "measure",
     "shipping_total",
     "sum",
     "",
     ""
    ],
    [
     "orders",
     "measure",
     "customers",
     "count_distinct",
     "",
     ""
    ],
    [
     "products",
     "dimension",
     "product_id",
     "number",
     "yes",
     ""
    ],
    [
     "products",
     "dimension",
     "product_name",
     "string",
     "",
     ""
    ],
    [
     "products",
     "dimension",
     "category",
     "string",
     "",
     ""
    ],
    [
     "stores",
     "dimension",
     "store_id",
     "string",
     "yes",
     ""
    ],
    [
     "stores",
     "dimension",
     "city",
     "string",
     "",
     ""
    ],
    [
     "stores",
     "dimension",
     "region",
     "string",
     "",
     ""
    ]
   ]
  },
  "lookml.joins": {
   "cols": [
    "join",
    "type",
    "relationship in the file",
    "on",
    "the joined view has one row for each key"
   ],
   "rows": [
    [
     "orders",
     "left_outer",
     "many_to_one",
     "order_lines.order_id = orders.order_id",
     "yes"
    ],
    [
     "stores",
     "left_outer",
     "many_to_one",
     "orders.store_id = stores.store_id",
     "yes"
    ],
    [
     "products",
     "left_outer",
     "many_to_one",
     "order_lines.product_id = products.product_id",
     "yes"
    ]
   ]
  },
  "measures.aov_by_store": {
   "cols": [
    "store_id",
    "revenue",
    "orders",
    "average_order_value"
   ],
   "rows": [
    [
     "s01",
     107315.5,
     1010,
     106.25
    ],
    [
     "s02",
     37023.5,
     333,
     111.18
    ],
    [
     "s03",
     39515.0,
     321,
     123.1
    ],
    [
     "s04",
     34039.5,
     311,
     109.45
    ],
    [
     "s05",
     35643.0,
     327,
     109.0
    ],
    [
     "s06",
     32039.5,
     285,
     112.42
    ],
    [
     "s07",
     34890.0,
     317,
     110.06
    ],
    [
     "s08",
     38208.0,
     324,
     117.93
    ],
    [
     "s09",
     33615.0,
     323,
     104.07
    ],
    [
     "s10",
     31324.5,
     283,
     110.69
    ],
    [
     "s11",
     32068.0,
     274,
     117.04
    ],
    [
     "s12",
     36332.5,
     329,
     110.43
    ]
   ]
  },
  "measures.cohort": {
   "cols": [
    "first_quarter",
    "customers"
   ],
   "rows": [
    [
     "2025-Q1",
     829
    ],
    [
     "2025-Q2",
     356
    ],
    [
     "2025-Q3",
     349
    ],
    [
     "2025-Q4",
     372
    ],
    [
     "2026-Q1",
     94
    ]
   ]
  },
  "measures.context": {
   "cols": [
    "filters on the report",
    "Revenue",
    "Orders",
    "Average order value",
    "Customers"
   ],
   "rows": [
    [
     "March 2026, no other filter",
     492014.0,
     4437,
     110.89,
     1788
    ],
    [
     "Region = North",
     183854.0,
     1664,
     110.49,
     1145
    ],
    [
     "Region = North, category = Coffee",
     22099.0,
     747,
     29.58,
     617
    ],
    [
     "Category = Equipment",
     302352.0,
     1911,
     158.22,
     1266
    ],
    [
     "Store = s01",
     107315.5,
     1010,
     106.25,
     802
    ]
   ]
  },
  "measures.distinct": {
   "cols": [
    "month",
    "customers"
   ],
   "rows": [
    [
     "2026-01",
     1764
    ],
    [
     "2026-02",
     1710
    ],
    [
     "2026-03",
     1788
    ]
   ]
  },
  "measures.lab": {
   "cols": [
    "region",
    "category",
    "revenue",
    "orders",
    "customers"
   ],
   "rows": [
    [
     "All",
     "All",
     492014.0,
     4437,
     1788
    ],
    [
     "All",
     "Coffee",
     59450.5,
     1975,
     1274
    ],
    [
     "All",
     "Tea",
     36954.0,
     1894,
     1227
    ],
    [
     "All",
     "Equipment",
     302352.0,
     1911,
     1266
    ],
    [
     "All",
     "Merch",
     93257.5,
     1926,
     1228
    ],
    [
     "North",
     "All",
     183854.0,
     1664,
     1145
    ],
    [
     "North",
     "Coffee",
     22099.0,
     747,
     617
    ],
    [
     "North",
     "Tea",
     13991.0,
     706,
     600
    ],
    [
     "North",
     "Equipment",
     113304.0,
     718,
     610
    ],
    [
     "North",
     "Merch",
     34460.0,
     707,
     594
    ],
    [
     "South",
     "All",
     101722.0,
     923,
     743
    ],
    [
     "South",
     "Coffee",
     11916.0,
     387,
     356
    ],
    [
     "South",
     "Tea",
     7836.0,
     406,
     368
    ],
    [
     "South",
     "Equipment",
     61770.0,
     394,
     362
    ],
    [
     "South",
     "Merch",
     20200.0,
     407,
     364
    ],
    [
     "East",
     "All",
     106713.0,
     964,
     774
    ],
    [
     "East",
     "Coffee",
     13049.0,
     429,
     397
    ],
    [
     "East",
     "Tea",
     7660.0,
     407,
     360
    ],
    [
     "East",
     "Equipment",
     65724.0,
     415,
     379
    ],
    [
     "East",
     "Merch",
     20280.0,
     428,
     378
    ],
    [
     "West",
     "All",
     99725.0,
     886,
     711
    ],
    [
     "West",
     "Coffee",
     12386.5,
     412,
     371
    ],
    [
     "West",
     "Tea",
     7467.0,
     375,
     337
    ],
    [
     "West",
     "Equipment",
     61554.0,
     384,
     353
    ],
    [
     "West",
     "Merch",
     18317.5,
     384,
     357
    ]
   ]
  },
  "measures.share": {
   "cols": [
    "region",
    "revenue",
    "revenue_all_regions",
    "share_pct"
   ],
   "rows": [
    [
     "East",
     106713.0,
     492014.0,
     21.7
    ],
    [
     "North",
     183854.0,
     492014.0,
     37.4
    ],
    [
     "South",
     101722.0,
     492014.0,
     20.7
    ],
    [
     "West",
     99725.0,
     492014.0,
     20.3
    ]
   ]
  },
  "measures.ytd": {
   "cols": [
    "month",
    "revenue",
    "revenue_ytd"
   ],
   "rows": [
    [
     "2026-01",
     474742.5,
     474742.5
    ],
    [
     "2026-02",
     431141.5,
     905884.0
    ],
    [
     "2026-03",
     492014.0,
     1397898.0
    ]
   ]
  },
  "model.fanout": {
   "cols": [
    "query",
    "rows read",
    "shipping total",
    "what happened"
   ],
   "rows": [
    [
     "Sum from the orders table",
     58385,
     126183.5,
     "right: one row for each order"
    ],
    [
     "Sum after a join to the lines",
     122196,
     264974.0,
     "wrong: every order is counted once for each line"
    ],
    [
     "Lines summed to the order first",
     58385,
     126183.5,
     "right: the join is one row to one row"
    ]
   ]
  },
  "model.lab_lines": {
   "cols": [
    "order_id",
    "line_no",
    "line_amount"
   ],
   "rows": [
    [
     1,
     1,
     24.0
    ],
    [
     1,
     2,
     60.0
    ],
    [
     2,
     1,
     9.0
    ],
    [
     3,
     1,
     14.0
    ],
    [
     3,
     2,
     37.5
    ],
    [
     4,
     1,
     67.5
    ],
    [
     4,
     2,
     234.0
    ]
   ]
  },
  "model.lab_orders": {
   "cols": [
    "order_id",
    "shipping_fee"
   ],
   "rows": [
    [
     1,
     2.5
    ],
    [
     2,
     4.0
    ],
    [
     3,
     0.0
    ],
    [
     4,
     2.5
    ]
   ]
  },
  "model.lines_sample": {
   "cols": [
    "order_id",
    "line_no",
    "product_id",
    "quantity",
    "unit_price",
    "line_amount"
   ],
   "rows": [
    [
     1,
     1,
     10,
     3,
     8.0,
     24.0
    ],
    [
     1,
     2,
     12,
     3,
     20.0,
     60.0
    ],
    [
     2,
     1,
     14,
     1,
     9.0,
     9.0
    ],
    [
     3,
     1,
     6,
     2,
     7.0,
     14.0
    ],
    [
     3,
     2,
     9,
     3,
     12.5,
     37.5
    ],
    [
     4,
     1,
     16,
     3,
     22.5,
     67.5
    ],
    [
     4,
     2,
     15,
     3,
     78.0,
     234.0
    ]
   ]
  },
  "model.m2m": {
   "cols": [
    "promo_code",
    "orders",
    "revenue"
   ],
   "rows": [
    [
     "BUNDLE",
     3603,
     398056.0
    ],
    [
     "FIRST",
     3484,
     379581.0
    ],
    [
     "LOYAL",
     3571,
     399834.0
    ],
    [
     "SPRING",
     3518,
     386565.0
    ],
    [
     "STAFF",
     3476,
     376753.0
    ]
   ]
  },
  "model.orders_sample": {
   "cols": [
    "order_id",
    "order_date",
    "store_id",
    "customer_id",
    "shipping_fee",
    "status"
   ],
   "rows": [
    [
     1,
     "2025-01-01",
     "s01",
     234,
     2.5,
     "completed"
    ],
    [
     2,
     "2025-01-01",
     "s09",
     25,
     4.0,
     "completed"
    ],
    [
     3,
     "2025-01-01",
     "s06",
     476,
     0.0,
     "completed"
    ],
    [
     4,
     "2025-01-01",
     "s01",
     357,
     2.5,
     "completed"
    ]
   ]
  },
  "model.products": {
   "cols": [
    "product_id",
    "product_name",
    "category",
    "list_price"
   ],
   "rows": [
    [
     1,
     "Coffee 1",
     "Coffee",
     9.5
    ],
    [
     2,
     "Tea 1",
     "Tea",
     6.0
    ],
    [
     3,
     "Equipment 1",
     "Equipment",
     42.0
    ],
    [
     4,
     "Merch 1",
     "Merch",
     15.0
    ],
    [
     5,
     "Coffee 2",
     "Coffee",
     11.0
    ],
    [
     6,
     "Tea 2",
     "Tea",
     7.0
    ],
    [
     7,
     "Equipment 2",
     "Equipment",
     54.0
    ],
    [
     8,
     "Merch 2",
     "Merch",
     17.5
    ],
    [
     9,
     "Coffee 3",
     "Coffee",
     12.5
    ],
    [
     10,
     "Tea 3",
     "Tea",
     8.0
    ],
    [
     11,
     "Equipment 3",
     "Equipment",
     66.0
    ],
    [
     12,
     "Merch 3",
     "Merch",
     20.0
    ],
    [
     13,
     "Coffee 4",
     "Coffee",
     14.0
    ],
    [
     14,
     "Tea 4",
     "Tea",
     9.0
    ],
    [
     15,
     "Equipment 4",
     "Equipment",
     78.0
    ],
    [
     16,
     "Merch 4",
     "Merch",
     22.5
    ],
    [
     17,
     "Coffee 5",
     "Coffee",
     15.5
    ],
    [
     18,
     "Tea 5",
     "Tea",
     10.0
    ],
    [
     19,
     "Equipment 5",
     "Equipment",
     90.0
    ],
    [
     20,
     "Merch 5",
     "Merch",
     25.0
    ]
   ]
  },
  "model.relationships": {
   "cols": [
    "from (many)",
    "to (one)",
    "cardinality",
    "duplicate keys on the one side",
    "rows with no match"
   ],
   "rows": [
    [
     "fact_order_lines.order_id",
     "fact_orders.order_id",
     "many to one",
     0,
     0
    ],
    [
     "fact_orders.store_id",
     "dim_store.store_id",
     "many to one",
     0,
     0
    ],
    [
     "fact_order_lines.product_id",
     "dim_product.product_id",
     "many to one",
     0,
     0
    ],
    [
     "fact_orders.order_date",
     "dim_date.date",
     "many to one",
     0,
     0
    ]
   ]
  },
  "model.stores": {
   "cols": [
    "store_id",
    "city",
    "region"
   ],
   "rows": [
    [
     "s01",
     "Leeds",
     "North"
    ],
    [
     "s02",
     "York",
     "North"
    ],
    [
     "s03",
     "Hull",
     "North"
    ],
    [
     "s04",
     "Bath",
     "South"
    ],
    [
     "s05",
     "Exeter",
     "South"
    ],
    [
     "s06",
     "Dover",
     "South"
    ],
    [
     "s07",
     "Ely",
     "East"
    ],
    [
     "s08",
     "Luton",
     "East"
    ],
    [
     "s09",
     "Derby",
     "East"
    ],
    [
     "s10",
     "Stoke",
     "West"
    ],
    [
     "s11",
     "Ludlow",
     "West"
    ],
    [
     "s12",
     "Truro",
     "West"
    ]
   ]
  },
  "model.tables": {
   "cols": [
    "table",
    "kind",
    "rows",
    "grain"
   ],
   "rows": [
    [
     "fact_orders",
     "fact",
     58385,
     "one row for each order"
    ],
    [
     "fact_order_lines",
     "fact",
     122196,
     "one row for each product on an order"
    ],
    [
     "dim_store",
     "dimension",
     12,
     "one row for each store"
    ],
    [
     "dim_product",
     "dimension",
     20,
     "one row for each product"
    ],
    [
     "dim_date",
     "dimension",
     455,
     "one row for each day"
    ],
    [
     "bridge_order_promos",
     "bridge",
     17652,
     "one row for each promotion code on an order"
    ]
   ]
  },
  "perf.can_answer": {
   "cols": [
    "question on the dashboard",
    "aggregate table",
    "why"
   ],
   "rows": [
    [
     "Revenue by region and month",
     "yes",
     "region comes from the store, month from the day, and revenue adds up"
    ],
    [
     "Units by category and week",
     "yes",
     "both columns are in the grain, and units add up"
    ],
    [
     "Revenue by product",
     "no",
     "the product was summed away: only the category is left"
    ],
    [
     "Customers who ordered in March",
     "no",
     "a distinct count does not add up over days and stores"
    ],
    [
     "Average order value by store",
     "yes",
     "revenue and orders both add up over days when an order belongs to one day and one store. Divide after you sum"
    ]
   ]
  },
  "perf.columns": {
   "cols": [
    "column",
    "different values",
    "bytes in the Parquet file",
    "share of the file"
   ],
   "rows": [
    [
     "order_id",
     58385,
     292491,
     "35.2 %"
    ],
    [
     "customer_id",
     2000,
     176811,
     "21.3 %"
    ],
    [
     "line_amount",
     53,
     92552,
     "11.2 %"
    ],
    [
     "product_id",
     20,
     77089,
     "9.3 %"
    ],
    [
     "store_id",
     12,
     61748,
     "7.4 %"
    ],
    [
     "category",
     4,
     31174,
     "3.8 %"
    ],
    [
     "region",
     4,
     31155,
     "3.8 %"
    ],
    [
     "quantity",
     3,
     31100,
     "3.7 %"
    ],
    [
     "line_no",
     4,
     26891,
     "3.2 %"
    ],
    [
     "status",
     2,
     5305,
     "0.6 %"
    ],
    [
     "order_date",
     455,
     3688,
     "0.4 %"
    ]
   ]
  },
  "perf.page": {
   "cols": [
    "tile",
    "smallest table that can answer it",
    "rows in that table"
   ],
   "rows": [
    [
     "Revenue by region and month",
     "agg_day_store_category",
     21449
    ],
    [
     "Units by category",
     "agg_day_store_category",
     21449
    ],
    [
     "Revenue today against yesterday",
     "agg_day_store_category",
     21449
    ],
    [
     "Top 10 products",
     "fact_order_lines",
     122196
    ],
    [
     "Customers this month",
     "fact_order_lines",
     122196
    ],
    [
     "Average order value by store",
     "agg_day_store_category",
     21449
    ]
   ]
  },
  "perf.tables": {
   "cols": [
    "table",
    "rows",
    "grain"
   ],
   "rows": [
    [
     "fact_order_lines",
     122196,
     "one row for each product on an order"
    ],
    [
     "agg_day_store_category",
     21449,
     "one row for each day, store and category"
    ]
   ]
  },
  "refresh.partitions": {
   "cols": [
    "month",
    "rows in the source",
    "in the model",
    "by the policy",
    "orders changed today"
   ],
   "rows": [
    [
     "2025-01",
     7242,
     "dropped",
     "not touched",
     0
    ],
    [
     "2025-02",
     6861,
     "dropped",
     "not touched",
     0
    ],
    [
     "2025-03",
     7715,
     "dropped",
     "not touched",
     0
    ],
    [
     "2025-04",
     7504,
     "kept",
     "not touched",
     0
    ],
    [
     "2025-05",
     7988,
     "kept",
     "not touched",
     0
    ],
    [
     "2025-06",
     7832,
     "kept",
     "not touched",
     0
    ],
    [
     "2025-07",
     8137,
     "kept",
     "not touched",
     0
    ],
    [
     "2025-08",
     8315,
     "kept",
     "not touched",
     0
    ],
    [
     "2025-09",
     8158,
     "kept",
     "not touched",
     0
    ],
    [
     "2025-10",
     8484,
     "kept",
     "not touched",
     0
    ],
    [
     "2025-11",
     8558,
     "kept",
     "not touched",
     1
    ],
    [
     "2025-12",
     8859,
     "kept",
     "not touched",
     0
    ],
    [
     "2026-01",
     8991,
     "kept",
     "not touched",
     0
    ],
    [
     "2026-02",
     8267,
     "kept",
     "refreshed",
     0
    ],
    [
     "2026-03",
     9285,
     "kept",
     "refreshed",
     148
    ]
   ]
  },
  "rls.by_region": {
   "cols": [
    "region",
    "revenue in March 2026"
   ],
   "rows": [
    [
     "East",
     106713.0
    ],
    [
     "North",
     183854.0
    ],
    [
     "South",
     101722.0
    ],
    [
     "West",
     99725.0
    ]
   ]
  },
  "rls.users": {
   "cols": [
    "user",
    "job",
    "regions",
    "order lines visible",
    "revenue visible"
   ],
   "rows": [
    [
     "ana",
     "Regional manager",
     "North",
     3477,
     183854.0
    ],
    [
     "ben",
     "Regional manager",
     "South",
     1932,
     101722.0
    ],
    [
     "cho",
     "Area lead",
     "East, West",
     3876,
     206438.0
    ],
    [
     "dee",
     "Head of sales",
     "all regions",
     9285,
     492014.0
    ],
    [
     "eli",
     "New analyst",
     "none",
     0,
     0
    ]
   ]
  },
  "tableau.connections": {
   "cols": [
    "file",
    "class",
    "server",
    "database",
    "user"
   ],
   "rows": [
    [
     "dev.tds",
     "postgres",
     "dev-warehouse.brewline.example",
     "analytics_dev",
     "tableau_reader"
    ],
    [
     "prod.tds",
     "postgres",
     "warehouse.brewline.example",
     "analytics",
     "tableau_reader"
    ]
   ]
  },
  "tableau.fields": {
   "cols": [
    "field",
    "data type",
    "role",
    "calculation"
   ],
   "rows": [
    [
     "Category",
     "string",
     "dimension",
     ""
    ],
    [
     "Order date",
     "date",
     "dimension",
     ""
    ],
    [
     "Store",
     "string",
     "dimension",
     ""
    ],
    [
     "Average order value",
     "real",
     "measure",
     "SUM([revenue]) / SUM([orders])"
    ],
    [
     "Revenue",
     "real",
     "measure",
     ""
    ],
    [
     "Units",
     "integer",
     "measure",
     ""
    ]
   ]
  },
  "tile.region_month": {
   "cols": [
    "region",
    "month",
    "revenue"
   ],
   "rows": [
    [
     "East",
     "2026-01",
     97112.5
    ],
    [
     "East",
     "2026-02",
     91834.5
    ],
    [
     "East",
     "2026-03",
     106713.0
    ],
    [
     "North",
     "2026-01",
     170962.5
    ],
    [
     "North",
     "2026-02",
     147210.0
    ],
    [
     "North",
     "2026-03",
     183854.0
    ],
    [
     "South",
     "2026-01",
     106427.5
    ],
    [
     "South",
     "2026-02",
     97787.0
    ],
    [
     "South",
     "2026-03",
     101722.0
    ],
    [
     "West",
     "2026-01",
     100240.0
    ],
    [
     "West",
     "2026-02",
     94310.0
    ],
    [
     "West",
     "2026-03",
     99725.0
    ]
   ]
  }
 },
 "text": {
  "lookml.broken_error": "SyntaxError: Unable to find a matching expression for '<stream end>' on line 13",
  "powerbi.refresh_request": "POST https://api.powerbi.com/v1.0/myorg/groups/{workspaceId}/datasets/{datasetId}/refreshes\nAuthorization: Bearer <token from Microsoft Entra ID>\nContent-Type: application/json\n\n{\n  \"type\": \"full\",\n  \"commitMode\": \"transactional\",\n  \"objects\": [\n    {\n      \"table\": \"fact_order_lines\",\n      \"partition\": \"2026-03\"\n    }\n  ],\n  \"retryCount\": 2\n}"
 }
};
