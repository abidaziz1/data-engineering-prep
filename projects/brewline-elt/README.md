# Brewline orders platform: dlt, dbt, Airflow and DuckDB

A small, complete ELT pipeline for a coffee retailer, built the way a senior data engineer would defend it in a review: an incremental and repeatable load, tested models, a gate between the load and the readers, an orchestrator that fails closed, and a drill for every way that it was seen to break.

```
shop API  ->  dlt (incremental, merge)  ->  DuckDB raw  ->  dbt (staging, marts, tests, snapshot)  ->  quality gate  ->  Parquet
                                         \________________________ Airflow DAG: brewline_daily ________________________/
```

DuckDB stands in for a warehouse such as Snowflake, BigQuery or Redshift: the SQL is plain, and the project has no cloud account to configure. The shop is a stand-in too: a Python function with fixed rules (`ingestion/shop_api.py`), so every run gives the same numbers.

## Run it

```bash
make setup               # three virtual environments: dlt, dbt, Airflow (they do not agree on versions)
make test                # fast tests of the shop and its contract with the dbt seed
make day-1               # one DAG run: load, dbt build, quality gate, publish
make day-2
make day-3               # fails on purpose: see "The drill" below
```

`make manual-1` runs the same steps without Airflow.

## What is in it

| Folder | What it does |
| --- | --- |
| `ingestion/` | `shop_api.py` is the pretend API. `load_orders.py` loads it with dlt: orders merged on `id` with a cursor on `updated_at` and a lookback of one hour, their lines as a child table, and the stores replaced in each run |
| `dbt/` | Staging views, marts (`fct_orders`, `dim_store`, an incremental `orders_daily`), 14 tests, a seed with the prices, and a snapshot that keeps the history of a renamed store |
| `orchestration/dags/` | `brewline_daily`: `extract_load >> dbt_build >> quality_gate >> publish`, with retries, one run at a time, and where the tools live set by environment variables |
| `quality/` | `source_vs_warehouse.py` compares the warehouse with the shop (rows against distinct ids, orders, revenue). `publish.py` writes the marts as Parquet |
| `tests/` | pytest tests of the rules of the shop |

## Design decisions

- **Merge on a key, with a cursor and a lookback.** A repeat of a day changes nothing, and a change that arrives late (within one hour) is still seen. A cursor cannot see a delete, and the shop never deletes.
- **dbt tests are the contract.** Keys are unique and not null, statuses are from a list, every order points at a store, every line points at a priced product, and the total of an order equals the total of its lines. A failing test stops the models that depend on it: the marts keep yesterday's data.
- **A quality gate outside dbt.** The gate compares the warehouse with the **source**, which dbt cannot see. It compares with the shop as of the newest day in the warehouse, so that a backfill of an old day does not fail for a good reason.
- **Publish last.** The Parquet files are written only after the gate passed.
- **One run at a time.** The warehouse is one DuckDB file, so the DAG has `max_active_runs=1`.

## The drill

Day 3 holds two traps on purpose. An order has a SKU that has no price in the seed, and store 4 is renamed.

1. `make day-3` fails at `dbt_build`: the test `relationships_stg_order_lines_sku__sku__ref_product_prices_` finds one line, and the 7 models and tests that depend on it are skipped. The marts still hold day 2. `quality_gate` and `publish` do not run.
2. Add the price: append `CAPSULE-10,1200` to `dbt/seeds/product_prices.csv`, and run `make day-3` again. The run succeeds, and `snapshots.stores_snapshot` holds two versions of store 4.
3. `make day-2` again (a backfill) loads 0 rows and passes the gate.

## What is not covered

No cloud warehouse, no real source system, no deletes, no secrets manager, no alerting channel, no CI that ran (`.github/workflows/ci.yml` is a sketch), and no deployment of Airflow beyond `airflow dags test`.
