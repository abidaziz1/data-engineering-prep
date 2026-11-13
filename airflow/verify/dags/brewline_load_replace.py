"""A load that replaces its own day: delete and insert in one transaction. Run it twice and the table is the same."""
import os
import sqlite3

import pendulum
from airflow.sdk import dag, task

DB = os.environ.get("BREWLINE_DB", "/tmp/brewline.db")
ORDERS = [("O-1", 12.5), ("O-2", 8.0), ("O-3", 21.0)]


@dag(dag_id="brewline_load_replace", schedule="@daily", start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)
def brewline_load_replace():
    @task
    def load(ds=None):
        with sqlite3.connect(DB) as con:  # one transaction: both statements commit together or not at all
            con.execute("CREATE TABLE IF NOT EXISTS orders_replace (order_id TEXT, dt TEXT, total REAL)")
            con.execute("DELETE FROM orders_replace WHERE dt = ?", (ds,))
            con.executemany("INSERT INTO orders_replace VALUES (?, ?, ?)", [(i, ds, t) for i, t in ORDERS])
        print(f"replaced the rows of {ds}: {len(ORDERS)}")

    load()


brewline_load_replace()
