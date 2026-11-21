window.LAB = window.LAB || {};
LAB.real = {
 "counts": {
  "after_backfill": {
   "distinct": 255,
   "fct_orders": 255,
   "orders_daily": 9,
   "raw_orders": 255
  },
  "after_day1": {
   "fct_orders": 200,
   "raw_orders": 200
  },
  "after_day2": {
   "fct_orders": 230,
   "orders_daily": 6,
   "raw_orders": 230
  },
  "after_day3": {
   "fct_orders": 255,
   "lines": 511,
   "orders_daily": 9,
   "raw_orders": 255,
   "revenue_cents": 2021900
  },
  "after_failed_day3": {
   "fct_orders": 230,
   "orders_daily": 6,
   "raw_orders": 255,
   "unpriced_lines": 1,
   "unpriced_sku": "CAPSULE-10"
  },
  "first_gate": {
   "exit": 1,
   "lines": [
    "PASS raw.orders: rows equal distinct ids: 255",
    "FAIL raw.orders: orders equal the orders of the shop: 255 (expected 230)",
    "FAIL raw.orders: revenue equals the revenue of the shop: 2021900 (expected 1825000)",
    "FAIL fct_orders: one row for each order: 255 (expected 230)",
    "PASS fct_orders: revenue equals raw.orders: 2021900",
    "FAIL orders_daily: revenue equals the orders that were not refunded: 2020100 (expected 1823200)"
   ]
  },
  "runs": {
   "backfill2": {
    "dbt": {
     "ERROR": 0,
     "PASS": 22,
     "SKIP": 0,
     "TOTAL": 22,
     "WARN": 0
    },
    "dbt_fail": [],
    "dbt_skip": [],
    "gate": [
     "PASS raw.orders: rows equal distinct ids: 255",
     "PASS raw.orders: orders equal the orders of the shop: 255",
     "PASS raw.orders: revenue equals the revenue of the shop: 2021900",
     "PASS fct_orders: one row for each order: 255",
     "PASS fct_orders: revenue equals raw.orders: 2021900",
     "PASS orders_daily: revenue equals the orders that were not refunded: 2020100"
    ],
    "load": "loaded day 2: orders 0, order lines 0, stores 12",
    "publish": [
     "published orders_daily: 9 rows",
     "published fct_orders: 255 rows",
     "published dim_store: 12 rows"
    ],
    "state": "success",
    "tasks": {
     "dbt_build": "success",
     "extract_load": "success",
     "publish": "success",
     "quality_gate": "success"
    }
   },
   "day1": {
    "dbt": {
     "ERROR": 0,
     "PASS": 22,
     "SKIP": 0,
     "TOTAL": 22,
     "WARN": 0
    },
    "dbt_fail": [],
    "dbt_skip": [],
    "gate": [
     "PASS raw.orders: rows equal distinct ids: 200",
     "PASS raw.orders: orders equal the orders of the shop: 200",
     "PASS raw.orders: revenue equals the revenue of the shop: 1584500",
     "PASS fct_orders: one row for each order: 200",
     "PASS fct_orders: revenue equals raw.orders: 1584500",
     "PASS orders_daily: revenue equals the orders that were not refunded: 1584500"
    ],
    "load": "loaded day 1: orders 200, order lines 401, stores 12",
    "publish": [
     "published orders_daily: 3 rows",
     "published fct_orders: 200 rows",
     "published dim_store: 12 rows"
    ],
    "state": "success",
    "tasks": {
     "dbt_build": "success",
     "extract_load": "success",
     "publish": "success",
     "quality_gate": "success"
    }
   },
   "day2": {
    "dbt": {
     "ERROR": 0,
     "PASS": 22,
     "SKIP": 0,
     "TOTAL": 22,
     "WARN": 0
    },
    "dbt_fail": [],
    "dbt_skip": [],
    "gate": [
     "PASS raw.orders: rows equal distinct ids: 230",
     "PASS raw.orders: orders equal the orders of the shop: 230",
     "PASS raw.orders: revenue equals the revenue of the shop: 1825000",
     "PASS fct_orders: one row for each order: 230",
     "PASS fct_orders: revenue equals raw.orders: 1825000",
     "PASS orders_daily: revenue equals the orders that were not refunded: 1823200"
    ],
    "load": "loaded day 2: orders 60, order lines 120, stores 12",
    "publish": [
     "published orders_daily: 6 rows",
     "published fct_orders: 230 rows",
     "published dim_store: 12 rows"
    ],
    "state": "success",
    "tasks": {
     "dbt_build": "success",
     "extract_load": "success",
     "publish": "success",
     "quality_gate": "success"
    }
   },
   "day3_fail": {
    "dbt": {
     "ERROR": 1,
     "PASS": 14,
     "SKIP": 7,
     "TOTAL": 22,
     "WARN": 0
    },
    "dbt_fail": [
     "relationships_stg_order_lines_sku__sku__ref_product_prices_"
    ],
    "dbt_skip": [
     "assert_order_totals_match_lines",
     "main.fct_orders",
     "main.orders_daily",
     "not_null_fct_orders_order_id",
     "not_null_fct_orders_total_cents",
     "not_null_orders_daily_orders",
     "unique_fct_orders_order_id"
    ],
    "gate": [],
    "load": "loaded day 3: orders 35, order lines 70, stores 12",
    "publish": [],
    "state": "failed",
    "tasks": {
     "dbt_build": "failed",
     "extract_load": "success",
     "publish": "not run",
     "quality_gate": "not run"
    }
   },
   "day3_fix": {
    "dbt": {
     "ERROR": 0,
     "PASS": 22,
     "SKIP": 0,
     "TOTAL": 22,
     "WARN": 0
    },
    "dbt_fail": [],
    "dbt_skip": [],
    "gate": [
     "PASS raw.orders: rows equal distinct ids: 255",
     "PASS raw.orders: orders equal the orders of the shop: 255",
     "PASS raw.orders: revenue equals the revenue of the shop: 2021900",
     "PASS fct_orders: one row for each order: 255",
     "PASS fct_orders: revenue equals raw.orders: 2021900",
     "PASS orders_daily: revenue equals the orders that were not refunded: 2020100"
    ],
    "load": "loaded day 3: orders 9, order lines 18, stores 12",
    "publish": [
     "published orders_daily: 9 rows",
     "published fct_orders: 255 rows",
     "published dim_store: 12 rows"
    ],
    "state": "success",
    "tasks": {
     "dbt_build": "success",
     "extract_load": "success",
     "publish": "success",
     "quality_gate": "success"
    }
   }
  },
  "tests": {
   "passed": 5
  }
 },
 "files": {
  ".github/workflows/ci.yml": "# NOT RUN in the course that describes this project: it is a sketch of the checks that a pull request would run.\nname: ci\non: [pull_request]\njobs:\n  checks:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-python@v5\n        with: { python-version: '3.12' }\n      - run: pip install -r requirements/dbt.txt -r requirements/ingest.txt\n      - run: python -m pytest -q tests\n      - name: Build the models of day 1 and run their tests\n        run: |\n          python ingestion/load_orders.py --day 1 --warehouse warehouse/brewline.duckdb\n          cd dbt && BREWLINE_WAREHOUSE=$PWD/../warehouse/brewline.duckdb dbt build --profiles-dir .\n",
  ".gitignore": "warehouse/\npublished/\n__pycache__/\ndbt/target/\ndbt/logs/\ndbt/dbt_packages/\n.pytest_cache/\n.user.yml\n",
  "Makefile": "# Three small environments, because dlt, dbt and Airflow pin versions that do not agree on one interpreter.\n# Override the paths on the command line:   make day-1 INGEST_PY=/path/to/python\nINGEST_PY ?= .venv-ingest/bin/python\nDBT       ?= .venv-dbt/bin/dbt\nAIRFLOW   ?= .venv-airflow/bin/airflow\nHOME_DIR  := $(CURDIR)\nexport BREWLINE_HOME := $(HOME_DIR)\nexport BREWLINE_PYTHON := $(INGEST_PY)\nexport BREWLINE_DBT := $(DBT)\nexport AIRFLOW_HOME ?= $(HOME_DIR)/.airflow\nexport AIRFLOW__CORE__LOAD_EXAMPLES := False\nexport AIRFLOW__CORE__DAGS_FOLDER := $(HOME_DIR)/orchestration/dags\n\nsetup:\n\tpython3 -m venv .venv-ingest && .venv-ingest/bin/pip install -r requirements/ingest.txt\n\tpython3 -m venv .venv-dbt && .venv-dbt/bin/pip install -r requirements/dbt.txt\n\tpython3 -m venv .venv-airflow && .venv-airflow/bin/pip install -r requirements/airflow.txt\n\t$(AIRFLOW) db migrate\n\ntest:\n\t.venv-dbt/bin/python -m pytest -q tests\n\n# one run of the DAG for one day of the pretend shop\nday-%:\n\t$(AIRFLOW) dags test brewline_daily 2026-03-0$*\n\n# the same steps without Airflow, for a quick look\nmanual-%:\n\t$(INGEST_PY) ingestion/load_orders.py --day $* --warehouse warehouse/brewline.duckdb\n\tcd dbt && BREWLINE_WAREHOUSE=$(HOME_DIR)/warehouse/brewline.duckdb $(DBT) build --profiles-dir .\n\t$(INGEST_PY) quality/source_vs_warehouse.py --day $* --warehouse warehouse/brewline.duckdb\n\nclean:\n\trm -rf warehouse published dbt/target dbt/logs .airflow\n",
  "README.md": "# Brewline orders platform: dlt, dbt, Airflow and DuckDB\n\nA small, complete ELT pipeline for a coffee retailer, built the way a senior data engineer would defend it in a review: an incremental and repeatable load, tested models, a gate between the load and the readers, an orchestrator that fails closed, and a drill for every way that it was seen to break.\n\n```\nshop API  ->  dlt (incremental, merge)  ->  DuckDB raw  ->  dbt (staging, marts, tests, snapshot)  ->  quality gate  ->  Parquet\n                                         \\________________________ Airflow DAG: brewline_daily ________________________/\n```\n\nDuckDB stands in for a warehouse such as Snowflake, BigQuery or Redshift: the SQL is plain, and the project has no cloud account to configure. The shop is a stand-in too: a Python function with fixed rules (`ingestion/shop_api.py`), so every run gives the same numbers.\n\n## Run it\n\n```bash\nmake setup               # three virtual environments: dlt, dbt, Airflow (they do not agree on versions)\nmake test                # fast tests of the shop and its contract with the dbt seed\nmake day-1               # one DAG run: load, dbt build, quality gate, publish\nmake day-2\nmake day-3               # fails on purpose: see \"The drill\" below\n```\n\n`make manual-1` runs the same steps without Airflow.\n\n## What is in it\n\n| Folder | What it does |\n| --- | --- |\n| `ingestion/` | `shop_api.py` is the pretend API. `load_orders.py` loads it with dlt: orders merged on `id` with a cursor on `updated_at` and a lookback of one hour, their lines as a child table, and the stores replaced in each run |\n| `dbt/` | Staging views, marts (`fct_orders`, `dim_store`, an incremental `orders_daily`), 14 tests, a seed with the prices, and a snapshot that keeps the history of a renamed store |\n| `orchestration/dags/` | `brewline_daily`: `extract_load >> dbt_build >> quality_gate >> publish`, with retries, one run at a time, and where the tools live set by environment variables |\n| `quality/` | `source_vs_warehouse.py` compares the warehouse with the shop (rows against distinct ids, orders, revenue). `publish.py` writes the marts as Parquet |\n| `tests/` | pytest tests of the rules of the shop |\n\n## Design decisions\n\n- **Merge on a key, with a cursor and a lookback.** A repeat of a day changes nothing, and a change that arrives late (within one hour) is still seen. A cursor cannot see a delete, and the shop never deletes.\n- **dbt tests are the contract.** Keys are unique and not null, statuses are from a list, every order points at a store, every line points at a priced product, and the total of an order equals the total of its lines. A failing test stops the models that depend on it: the marts keep yesterday's data.\n- **A quality gate outside dbt.** The gate compares the warehouse with the **source**, which dbt cannot see. It compares with the shop as of the newest day in the warehouse, so that a backfill of an old day does not fail for a good reason.\n- **Publish last.** The Parquet files are written only after the gate passed.\n- **One run at a time.** The warehouse is one DuckDB file, so the DAG has `max_active_runs=1`.\n\n## The drill\n\nDay 3 holds two traps on purpose. An order has a SKU that has no price in the seed, and store 4 is renamed.\n\n1. `make day-3` fails at `dbt_build`: the test `relationships_stg_order_lines_sku__sku__ref_product_prices_` finds one line, and the 7 models and tests that depend on it are skipped. The marts still hold day 2. `quality_gate` and `publish` do not run.\n2. Add the price: append `CAPSULE-10,1200` to `dbt/seeds/product_prices.csv`, and run `make day-3` again. The run succeeds, and `snapshots.stores_snapshot` holds two versions of store 4.\n3. `make day-2` again (a backfill) loads 0 rows and passes the gate.\n\n## What is not covered\n\nNo cloud warehouse, no real source system, no deletes, no secrets manager, no alerting channel, no CI that ran (`.github/workflows/ci.yml` is a sketch), and no deployment of Airflow beyond `airflow dags test`.\n",
  "dbt/dbt_project.yml": "name: brewline\nversion: '1.0.0'\nprofile: brewline\nmodel-paths: ['models']\nseed-paths: ['seeds']\ntest-paths: ['tests']\nsnapshot-paths: ['snapshots']\nmodels:\n  brewline:\n    staging:\n      +materialized: view\n    marts:\n      +materialized: table\n",
  "dbt/models/marts/_marts.yml": "version: 2\nmodels:\n  - name: fct_orders\n    columns:\n      - name: order_id\n        tests: [unique, not_null]\n      - name: total_cents\n        tests: [not_null]\n  - name: orders_daily\n    columns:\n      - name: orders\n        tests: [not_null]\n",
  "dbt/models/marts/dim_store.sql": "select store_id, store_name, region from {{ ref('stg_stores') }}\n",
  "dbt/models/marts/fct_orders.sql": "-- The grain is one row for each order. The total from the lines must equal the total of the order: a singular test checks it.\nwith lines as (\n    select\n        l.order_id,\n        sum(l.qty * p.price_cents) as lines_total_cents,\n        count(*)                   as line_count\n    from {{ ref('stg_order_lines') }} l\n    join {{ ref('product_prices') }} p on p.sku = l.sku\n    group by 1\n)\nselect\n    o.order_id,\n    o.store_id,\n    s.region,\n    o.status,\n    o.updated_date,\n    o.total_cents,\n    coalesce(l.lines_total_cents, 0) as lines_total_cents,\n    coalesce(l.line_count, 0)        as line_count\nfrom {{ ref('stg_orders') }} o\nleft join lines l using (order_id)\nleft join {{ ref('stg_stores') }} s using (store_id)\n",
  "dbt/models/marts/orders_daily.sql": "-- Revenue and orders for each day and region. It counts only orders that were not refunded.\n{{ config(materialized='incremental', unique_key=['updated_date', 'region'], incremental_strategy='delete+insert') }}\nselect\n    updated_date,\n    region,\n    count(*)           as orders,\n    sum(total_cents)   as revenue_cents\nfrom {{ ref('fct_orders') }}\nwhere status <> 'REFUNDED'\n{% if is_incremental() %}\n  and updated_date >= (select max(updated_date) - interval 1 day from {{ this }})\n{% endif %}\ngroup by 1, 2\n",
  "dbt/models/sources.yml": "version: 2\nsources:\n  - name: raw\n    schema: raw\n    tables:\n      - name: orders\n      - name: orders__lines\n      - name: stores\n",
  "dbt/models/staging/_staging.yml": "version: 2\nmodels:\n  - name: stg_orders\n    columns:\n      - name: order_id\n        tests: [unique, not_null]\n      - name: status\n        tests:\n          - accepted_values:\n              values: ['PLACED', 'SHIPPED', 'REFUNDED']\n      - name: store_id\n        tests:\n          - not_null\n          - relationships:\n              to: ref('stg_stores')\n              field: store_id\n  - name: stg_order_lines\n    columns:\n      - name: sku\n        tests:\n          - not_null\n          - relationships:\n              to: ref('product_prices')\n              field: sku\n  - name: stg_stores\n    columns:\n      - name: store_id\n        tests: [unique, not_null]\n",
  "dbt/models/staging/stg_order_lines.sql": "-- One row for each line of an order. dlt put the lines of the list in a child table, linked to its parent by _dlt_parent_id.\nselect\n    o.id          as order_id,\n    l._dlt_list_idx as line_no,\n    l.sku,\n    l.qty\nfrom {{ source('raw', 'orders__lines') }} l\njoin {{ source('raw', 'orders') }} o on l._dlt_parent_id = o._dlt_id\n",
  "dbt/models/staging/stg_orders.sql": "-- One row for each order, with the names and types that the rest of the project uses.\nselect\n    id                              as order_id,\n    store_id,\n    upper(status)                   as status,\n    total_cents,\n    cast(updated_at as timestamp)   as updated_at,\n    cast(updated_at as date)        as updated_date,\n    _dlt_id\nfrom {{ source('raw', 'orders') }}\n",
  "dbt/models/staging/stg_stores.sql": "select id as store_id, name as store_name, region\nfrom {{ source('raw', 'stores') }}\n",
  "dbt/profiles.yml": "brewline:\n  target: dev\n  outputs:\n    dev:\n      type: duckdb\n      path: \"{{ env_var('BREWLINE_WAREHOUSE', '../warehouse/brewline.duckdb') }}\"\n      threads: 4\n",
  "dbt/seeds/product_prices.csv": "sku,price_cents\nMUG,900\nBEANS-250,1800\nFILTER,350\nGRINDER,4900\n",
  "dbt/snapshots/stores_snapshot.sql": "{% snapshot stores_snapshot %}\n{{ config(target_schema='snapshots', unique_key='store_id', strategy='check', check_cols=['store_name', 'region']) }}\nselect store_id, store_name, region from {{ ref('stg_stores') }}\n{% endsnapshot %}\n",
  "dbt/tests/assert_order_totals_match_lines.sql": "-- A singular test: it returns the orders whose total differs from the total of their lines. A test passes when it returns no rows.\nselect order_id, total_cents, lines_total_cents\nfrom {{ ref('fct_orders') }}\nwhere total_cents <> lines_total_cents\n",
  "ingestion/load_orders.py": "\"\"\"Loads one day of the shop into DuckDB with dlt: the orders (incremental, merged on the id, with a lookback of one hour), their lines, and the stores (replaced every run).\n\nRun:   python ingestion/load_orders.py --day 2 --warehouse warehouse/brewline.duckdb\nPrints one line with what the run wrote, so that the orchestrator can check it.\n\"\"\"\nimport argparse\nimport os\nimport pathlib\nimport sys\n\nimport dlt\n\nsys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))\nimport shop_api  # noqa: E402\n\nSTART = '2026-01-01T00:00:00+00:00'\n\n\ndef build(day, warehouse):\n    pipeline = dlt.pipeline(pipeline_name='brewline', destination=dlt.destinations.duckdb(warehouse), dataset_name='raw', pipelines_dir=os.path.join(os.path.dirname(warehouse), '.dlt'))\n\n    @dlt.resource(name='orders', write_disposition='merge', primary_key='id')\n    def orders(updated=dlt.sources.incremental('updated_at', initial_value=START, lag=3600)):\n        for page in shop_api.get_orders(day, since=updated.last_value):\n            yield page\n\n    @dlt.resource(name='stores', write_disposition='replace')\n    def stores():\n        for page in shop_api.get_stores(day):\n            yield page\n\n    return pipeline, [orders, stores]\n\n\ndef main():\n    ap = argparse.ArgumentParser()\n    ap.add_argument('--day', type=int, required=True)\n    ap.add_argument('--warehouse', default='warehouse/brewline.duckdb')\n    args = ap.parse_args()\n    os.makedirs(os.path.dirname(os.path.abspath(args.warehouse)), exist_ok=True)\n    pipeline, resources = build(args.day, os.path.abspath(args.warehouse))\n    pipeline.run(resources)\n    counts = pipeline.last_trace.last_normalize_info.row_counts\n    print('loaded day %d: orders %d, order lines %d, stores %d' % (args.day, counts.get('orders', 0), counts.get('orders__lines', 0), counts.get('stores', 0)))\n\n\nif __name__ == '__main__':\n    main()\n",
  "ingestion/shop_api.py": "\"\"\"A stand-in for the shop API of Brewline: the state of the shop at the end of a day (1 to 3). Fixed rules and no random numbers, so every run gives the same answer.\n\nThe prices are in the dbt seed `product_prices.csv`, and the total of an order is the sum of quantity times price over its lines. Day 3 holds two traps on purpose:\nan order with a SKU that has no price in the seed (a product that marketing launched without telling the data team), and a store that was renamed.\n\"\"\"\nimport datetime\n\nPRICES = {'MUG': 900, 'BEANS-250': 1800, 'FILTER': 350, 'GRINDER': 4900}\nSKUS = list(PRICES)\nREGIONS = ['north', 'south', 'east']\nDAY1 = datetime.datetime(2026, 3, 1, 0, 0, 0, tzinfo=datetime.timezone.utc)\n\n\ndef stamp(day, i=0):\n    \"\"\"The time of a change: the day, plus a minute that depends on the order, so that the changes of a day are spread over it.\"\"\"\n    return (DAY1 + datetime.timedelta(days=day - 1, minutes=(i * 7) % 1440)).isoformat()\n\n\ndef _order(i, day, trap=False):\n    lines = [{'sku': SKUS[(i + k) % 4], 'qty': 1 + (i + k) % 3} for k in range(1 + i % 3)]\n    if trap:\n        lines.append({'sku': 'CAPSULE-10', 'qty': 1})                                    # a new product with no price yet\n    total = sum(l['qty'] * PRICES.get(l['sku'], 1200) for l in lines)\n    return {'id': i, 'store_id': 1 + (i * 7) % 12, 'status': 'PLACED', 'total_cents': total, 'updated_at': stamp(day, i), 'lines': lines}\n\n\ndef orders_on(day):\n    \"\"\"Every order the shop holds at the end of `day`, as a dict from id to order.\"\"\"\n    rows = {i: _order(i, 1) for i in range(1, 201)}                                        # day 1: 200 orders\n    if day >= 2:\n        for i in range(1, 21):                                                             # day 2: 20 shipped, 30 new, one refunded\n            rows[i].update(status='SHIPPED', updated_at=stamp(2, i))\n        for i in range(201, 231):\n            rows[i] = _order(i, 2)\n        rows[21].update(status='REFUNDED', updated_at=stamp(2, 21))\n    if day >= 3:                                                                           # day 3: 25 new orders, one with an unknown SKU\n        for i in range(231, 256):\n            rows[i] = _order(i, 3, trap=(i == 240))\n        for i in range(31, 36):\n            rows[i].update(status='SHIPPED', updated_at=stamp(3, i))\n    return rows\n\n\ndef stores_on(day):\n    \"\"\"The 12 stores. On day 3 store 4 is renamed.\"\"\"\n    names = {s: 'Store %d' % s for s in range(1, 13)}\n    if day >= 3:\n        names[4] = 'Store 4 (Riverside)'\n    return [{'id': s, 'name': names[s], 'region': REGIONS[s % 3]} for s in range(1, 13)]\n\n\ndef get_orders(day, since=None, page_size=100):\n    \"\"\"Like GET /orders?updated_since=...: the orders changed at or after `since`, in pages.\"\"\"\n    rows = [r for _, r in sorted(orders_on(day).items()) if since is None or r['updated_at'] >= since]\n    for k in range(0, len(rows), page_size):\n        yield rows[k:k + page_size]\n\n\ndef get_stores(day):\n    yield stores_on(day)\n",
  "orchestration/dags/brewline_daily.py": "\"\"\"The daily pipeline of Brewline: load the shop with dlt, build the models and run the tests with dbt, check the warehouse against the shop, and publish the marts.\n\nA run handles one day of the pretend shop: the day number is the number of days since the logical date 2026-03-01, plus one.\nWhere the tools live is set by environment variables, so that the same DAG runs on a laptop and in a container:\n  BREWLINE_HOME     the folder of the project           BREWLINE_PYTHON  the Python that has dlt and DuckDB\n  BREWLINE_DBT      the dbt program                     BREWLINE_RETRIES how many times a task is retried (2 by default)\n\"\"\"\nimport datetime\nimport os\n\nfrom airflow.sdk import dag, task\n\nHOME = os.environ.get('BREWLINE_HOME', os.getcwd())\nPYTHON = os.environ.get('BREWLINE_PYTHON', 'python')\nDBT = os.environ.get('BREWLINE_DBT', 'dbt')\nWAREHOUSE = os.path.join(HOME, 'warehouse', 'brewline.duckdb')\nFIRST_DAY = datetime.date(2026, 3, 1)\n\n\ndef day_of(logical_date):\n    return (logical_date.date() - FIRST_DAY).days + 1\n\n\n@dag(\n    dag_id='brewline_daily',\n    schedule='@daily',\n    start_date=datetime.datetime(2026, 3, 1, tzinfo=datetime.timezone.utc),\n    catchup=False,\n    max_active_runs=1,                                      # two runs at once would write the same warehouse file\n    default_args={'retries': int(os.environ.get('BREWLINE_RETRIES', '2')), 'retry_delay': datetime.timedelta(seconds=5)},\n    tags=['brewline', 'elt'],\n)\ndef brewline_daily():\n    @task.bash(cwd=HOME)\n    def extract_load(logical_date=None):\n        return '%s ingestion/load_orders.py --day %d --warehouse %s' % (PYTHON, day_of(logical_date), WAREHOUSE)\n\n    @task.bash(cwd=os.path.join(HOME, 'dbt'), env={'BREWLINE_WAREHOUSE': WAREHOUSE, 'DBT_PROFILES_DIR': os.path.join(HOME, 'dbt')}, append_env=True)\n    def dbt_build():\n        return '%s build' % DBT\n\n    @task.bash(cwd=HOME)\n    def quality_gate(logical_date=None):\n        return '%s quality/source_vs_warehouse.py --day %d --warehouse %s' % (PYTHON, day_of(logical_date), WAREHOUSE)\n\n    @task.bash(cwd=HOME)\n    def publish():\n        return '%s quality/publish.py --warehouse %s --out %s' % (PYTHON, WAREHOUSE, os.path.join(HOME, 'published'))\n\n    extract_load() >> dbt_build() >> quality_gate() >> publish()\n\n\nbrewline_daily()\n",
  "quality/publish.py": "\"\"\"Publishes the marts as Parquet files, for the tools that read the warehouse from files. Run after the quality gate has passed.\n\nRun:   python quality/publish.py --warehouse warehouse/brewline.duckdb --out published\n\"\"\"\nimport argparse\nimport os\n\nimport duckdb\n\nap = argparse.ArgumentParser()\nap.add_argument('--warehouse', default='warehouse/brewline.duckdb')\nap.add_argument('--out', default='published')\na = ap.parse_args()\nos.makedirs(a.out, exist_ok=True)\ncon = duckdb.connect(a.warehouse, read_only=True)\nfor table in ('orders_daily', 'fct_orders', 'dim_store'):\n    path = os.path.join(a.out, table + '.parquet')\n    con.sql(\"copy (select * from main.%s) to '%s' (format parquet)\" % (table, path))\n    print('published %s: %d rows' % (table, con.sql('select count(*) from main.%s' % table).fetchone()[0]))\n",
  "quality/source_vs_warehouse.py": "\"\"\"The quality gate: checks that the warehouse agrees with the source, after the load and the dbt build of one day. Exits with 1 when a check fails.\n\nRun:   python quality/source_vs_warehouse.py --day 2 --warehouse warehouse/brewline.duckdb\nThe day is the day of the run. The gate compares with the shop as of the newest day that the warehouse holds, so that a backfill of an old day does not fail for a good reason.\n\"\"\"\nimport argparse\nimport pathlib\nimport sys\n\nimport duckdb\n\nsys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / 'ingestion'))\nimport shop_api  # noqa: E402\n\n\ndef latest_day(con):\n    \"\"\"The newest day that the warehouse holds. A run for an old day (a backfill) must compare with the shop as of this day, because the warehouse is already there.\"\"\"\n    newest = con.sql('select max(cast(updated_at as date)) from raw.orders').fetchone()[0]\n    return (newest - shop_api.DAY1.date()).days + 1\n\n\ndef run(day, warehouse):\n    con = duckdb.connect(warehouse, read_only=True)\n    day = max(day, latest_day(con))\n    shop = shop_api.orders_on(day)\n    checks = []\n\n    def check(name, got, want):\n        checks.append((name, got == want, got, want))\n\n    raw_rows, raw_distinct = con.sql('select count(*), count(distinct id) from raw.orders').fetchone()\n    check('raw.orders: rows equal distinct ids', raw_rows, raw_distinct)\n    check('raw.orders: orders equal the orders of the shop', raw_distinct, len(shop))\n    check('raw.orders: revenue equals the revenue of the shop', con.sql('select sum(total_cents) from raw.orders').fetchone()[0], sum(o['total_cents'] for o in shop.values()))\n    check('fct_orders: one row for each order', con.sql('select count(*) from main.fct_orders').fetchone()[0], len(shop))\n    check('fct_orders: revenue equals raw.orders', con.sql('select sum(total_cents) from main.fct_orders').fetchone()[0], con.sql('select sum(total_cents) from raw.orders').fetchone()[0])\n    check('orders_daily: revenue equals the orders that were not refunded', con.sql('select sum(revenue_cents) from main.orders_daily').fetchone()[0],\n          sum(o['total_cents'] for o in shop.values() if o['status'] != 'REFUNDED'))\n    for name, ok, got, want in checks:\n        print('%s %s: %s%s' % ('PASS' if ok else 'FAIL', name, got, '' if ok else ' (expected %s)' % want))\n    return all(ok for _, ok, _, _ in checks)\n\n\nif __name__ == '__main__':\n    ap = argparse.ArgumentParser()\n    ap.add_argument('--day', type=int, required=True)\n    ap.add_argument('--warehouse', default='warehouse/brewline.duckdb')\n    a = ap.parse_args()\n    sys.exit(0 if run(a.day, a.warehouse) else 1)\n",
  "requirements/airflow.txt": "apache-airflow==3.4.0\n",
  "requirements/dbt.txt": "dbt-duckdb\npytest\n",
  "requirements/ingest.txt": "dlt[duckdb]\n",
  "tests/test_shop_and_quality.py": "\"\"\"Fast tests of the pieces that do not need a database: the rules of the shop, and the contract between the shop and the dbt seed.\"\"\"\nimport csv\nimport pathlib\nimport sys\n\nROOT = pathlib.Path(__file__).resolve().parent.parent\nsys.path.insert(0, str(ROOT / 'ingestion'))\nimport shop_api  # noqa: E402\n\n\ndef test_day_one_has_200_orders_and_day_three_255():\n    assert len(shop_api.orders_on(1)) == 200\n    assert len(shop_api.orders_on(2)) == 230\n    assert len(shop_api.orders_on(3)) == 255\n\n\ndef test_totals_equal_the_lines_for_every_priced_order():\n    for day in (1, 2, 3):\n        for o in shop_api.orders_on(day).values():\n            if all(l['sku'] in shop_api.PRICES for l in o['lines']):\n                assert o['total_cents'] == sum(l['qty'] * shop_api.PRICES[l['sku']] for l in o['lines'])\n\n\ndef test_the_seed_has_the_prices_of_the_shop():\n    seed = {r['sku']: int(r['price_cents']) for r in csv.DictReader(open(ROOT / 'dbt' / 'seeds' / 'product_prices.csv'))}\n    assert seed == shop_api.PRICES or set(seed) >= set(shop_api.PRICES)\n\n\ndef test_a_change_moves_updated_at_forward():\n    d1, d2 = shop_api.orders_on(1), shop_api.orders_on(2)\n    assert all(d2[i]['updated_at'] > d1[i]['updated_at'] for i in range(1, 21))\n\n\ndef test_the_changes_of_a_day_are_spread_over_the_day():\n    stamps = sorted(o['updated_at'] for o in shop_api.orders_on(1).values())\n    assert stamps[0][:10] == stamps[-1][:10] == '2026-03-01' and len({s[11:16] for s in stamps}) > 100\n"
 },
 "meta": {
  "airflow": "3.4.0",
  "dbt": "1.12.7",
  "dbt_duckdb": "1.11.1",
  "dlt": "1.32.0",
  "duckdb": "1.5.6",
  "note": "Recorded by project-elt/verify/capture_elt.py: the real project in a temporary copy, with dlt, dbt-duckdb and Airflow (airflow dags test).",
  "recorded_on": "2026-11-21"
 },
 "tables": {
  "orders_daily": {
   "cols": [
    "date",
    "region",
    "orders",
    "revenue_cents"
   ],
   "rows": [
    [
     "2026-03-01",
     "east",
     58,
     568350
    ],
    [
     "2026-03-01",
     "north",
     58,
     691100
    ],
    [
     "2026-03-01",
     "south",
     58,
     115650
    ],
    [
     "2026-03-02",
     "east",
     17,
     163650
    ],
    [
     "2026-03-02",
     "north",
     17,
     198550
    ],
    [
     "2026-03-02",
     "south",
     16,
     31800
    ],
    [
     "2026-03-03",
     "east",
     10,
     107400
    ],
    [
     "2026-03-03",
     "north",
     10,
     119800
    ],
    [
     "2026-03-03",
     "south",
     10,
     23800
    ]
   ]
  },
  "runs": {
   "cols": [
    "run",
    "date",
    "dag",
    "load",
    "dbt",
    "gate",
    "publish"
   ],
   "rows": [
    [
     "Day 1",
     "2026-03-01",
     "success",
     "success",
     "success",
     "success",
     "success"
    ],
    [
     "Day 2",
     "2026-03-02",
     "success",
     "success",
     "success",
     "success",
     "success"
    ],
    [
     "Day 3",
     "2026-03-03",
     "failed",
     "success",
     "failed",
     "not run",
     "not run"
    ],
    [
     "Day 3 again",
     "2026-03-03",
     "success",
     "success",
     "success",
     "success",
     "success"
    ],
    [
     "Backfill of day 2",
     "2026-03-02",
     "success",
     "success",
     "success",
     "success",
     "success"
    ]
   ]
  },
  "snapshot.store4": {
   "cols": [
    "store",
    "name",
    "current"
   ],
   "rows": [
    [
     4,
     "Store 4",
     false
    ],
    [
     4,
     "Store 4 (Riverside)",
     true
    ]
   ]
  }
 },
 "text": {
  "gate.first": "python quality/source_vs_warehouse.py --day 2        # the first version\nPASS raw.orders: rows equal distinct ids: 255\nFAIL raw.orders: orders equal the orders of the shop: 255 (expected 230)\nFAIL raw.orders: revenue equals the revenue of the shop: 2021900 (expected 1825000)\nFAIL fct_orders: one row for each order: 255 (expected 230)\nPASS fct_orders: revenue equals raw.orders: 2021900\nFAIL orders_daily: revenue equals the orders that were not refunded: 2020100 (expected 1823200)",
  "run.backfill2": "airflow dags test brewline_daily 2026-03-02\nDAG run: success\n  extract_load  success\n  dbt_build     success\n  quality_gate  success\n  publish       success\n  loaded day 2: orders 0, order lines 0, stores 12\n  dbt: PASS=22 ERROR=0 SKIP=0 of 22\n  PASS raw.orders: rows equal distinct ids: 255\n  PASS raw.orders: orders equal the orders of the shop: 255\n  PASS raw.orders: revenue equals the revenue of the shop: 2021900\n  PASS fct_orders: one row for each order: 255\n  PASS fct_orders: revenue equals raw.orders: 2021900\n  PASS orders_daily: revenue equals the orders that were not refunded: 2020100\n  published orders_daily: 9 rows\n  published fct_orders: 255 rows\n  published dim_store: 12 rows",
  "run.day1": "airflow dags test brewline_daily 2026-03-01\nDAG run: success\n  extract_load  success\n  dbt_build     success\n  quality_gate  success\n  publish       success\n  loaded day 1: orders 200, order lines 401, stores 12\n  dbt: PASS=22 ERROR=0 SKIP=0 of 22\n  PASS raw.orders: rows equal distinct ids: 200\n  PASS raw.orders: orders equal the orders of the shop: 200\n  PASS raw.orders: revenue equals the revenue of the shop: 1584500\n  PASS fct_orders: one row for each order: 200\n  PASS fct_orders: revenue equals raw.orders: 1584500\n  PASS orders_daily: revenue equals the orders that were not refunded: 1584500\n  published orders_daily: 3 rows\n  published fct_orders: 200 rows\n  published dim_store: 12 rows",
  "run.day2": "airflow dags test brewline_daily 2026-03-02\nDAG run: success\n  extract_load  success\n  dbt_build     success\n  quality_gate  success\n  publish       success\n  loaded day 2: orders 60, order lines 120, stores 12\n  dbt: PASS=22 ERROR=0 SKIP=0 of 22\n  PASS raw.orders: rows equal distinct ids: 230\n  PASS raw.orders: orders equal the orders of the shop: 230\n  PASS raw.orders: revenue equals the revenue of the shop: 1825000\n  PASS fct_orders: one row for each order: 230\n  PASS fct_orders: revenue equals raw.orders: 1825000\n  PASS orders_daily: revenue equals the orders that were not refunded: 1823200\n  published orders_daily: 6 rows\n  published fct_orders: 230 rows\n  published dim_store: 12 rows",
  "run.day3_fail": "airflow dags test brewline_daily 2026-03-03\nDAG run: failed\n  extract_load  success\n  dbt_build     failed\n  quality_gate  not run\n  publish       not run\n  loaded day 3: orders 35, order lines 70, stores 12\n  dbt: PASS=14 ERROR=1 SKIP=7 of 22\n  failed test: relationships_stg_order_lines_sku__sku__ref_product_prices_",
  "run.day3_fix": "airflow dags test brewline_daily 2026-03-03\nDAG run: success\n  extract_load  success\n  dbt_build     success\n  quality_gate  success\n  publish       success\n  loaded day 3: orders 9, order lines 18, stores 12\n  dbt: PASS=22 ERROR=0 SKIP=0 of 22\n  PASS raw.orders: rows equal distinct ids: 255\n  PASS raw.orders: orders equal the orders of the shop: 255\n  PASS raw.orders: revenue equals the revenue of the shop: 2021900\n  PASS fct_orders: one row for each order: 255\n  PASS fct_orders: revenue equals raw.orders: 2021900\n  PASS orders_daily: revenue equals the orders that were not refunded: 2020100\n  published orders_daily: 9 rows\n  published fct_orders: 255 rows\n  published dim_store: 12 rows",
  "tests.run": "pytest -q tests\n5 passed",
  "tool.versions": "dlt 1.32.0 with DuckDB 1.5.6, dbt 1.12.7 with dbt-duckdb 1.11.1, Airflow 3.4.0"
 }
};
