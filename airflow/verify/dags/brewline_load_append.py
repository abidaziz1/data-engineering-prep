"""A load that appends. Run it twice for the same day and the day is in the table twice."""
import os
import sqlite3

import pendulum
from airflow.sdk import dag, task

DB = os.environ.get("BREWLINE_DB", "/tmp/brewline.db")
ORDERS = [("O-1", 12.5), ("O-2", 8.0), ("O-3", 21.0)]


@dag(dag_id="brewline_load_append", schedule="@daily", start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)
def brewline_load_append():
    @task
    def load(ds=None):
        with sqlite3.connect(DB) as con:
            con.execute("CREATE TABLE IF NOT EXISTS orders_append (order_id TEXT, dt TEXT, total REAL)")
            con.executemany("INSERT INTO orders_append VALUES (?, ?, ?)", [(i, ds, t) for i, t in ORDERS])
        print(f"inserted {len(ORDERS)} rows for {ds}")

    load()


brewline_load_append()
