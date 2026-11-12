"""A load that upserts on the order id. Run it twice and the table is the same, and rows of other days stay."""
import os
import sqlite3

import pendulum
from airflow.sdk import dag, task

DB = os.environ.get("BREWLINE_DB", "/tmp/brewline.db")
ORDERS = [("O-1", 12.5), ("O-2", 8.0), ("O-3", 21.0)]


@dag(dag_id="brewline_load_upsert", schedule="@daily", start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)
def brewline_load_upsert():
    @task
    def load(ds=None):
        with sqlite3.connect(DB) as con:
            con.execute("CREATE TABLE IF NOT EXISTS orders_upsert (order_id TEXT PRIMARY KEY, dt TEXT, total REAL)")
            con.executemany(
                "INSERT INTO orders_upsert VALUES (?, ?, ?) ON CONFLICT(order_id) DO UPDATE SET dt = excluded.dt, total = excluded.total",
                [(f"{ds}-{i}", ds, t) for i, t in ORDERS],
            )
        print(f"upserted {len(ORDERS)} rows for {ds}")

    load()


brewline_load_upsert()
