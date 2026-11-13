"""Round 1: the revenue of each store for the day of the run, written so that a repeat changes nothing."""
import os
import sqlite3
from datetime import timedelta

import pendulum
from airflow.sdk import dag, task

from store_logic import revenue_by_store

ORDERS = {  # a stand-in for the source: the orders of each day
    "2026-03-14": [
        {"store": "SG-01", "total": "19.99"},
        {"store": "SG-01", "total": "8.00"},
        {"store": "SG-02", "total": "12.50"},
    ],
}


@dag(
    dag_id="brewline_store_revenue",
    schedule="0 3 * * *",
    start_date=pendulum.datetime(2026, 3, 1, tz="UTC"),
    catchup=False,
    default_args={"owner": "data-team", "retries": 2, "retry_delay": timedelta(minutes=5)},
    tags=["brewline", "revenue"],
)
def brewline_store_revenue():
    @task(execution_timeout=timedelta(minutes=10))
    def compute(ds=None):
        return revenue_by_store(ORDERS.get(ds, []))

    @task
    def load(totals, ds=None):
        db = os.environ.get("BREWLINE_DB", "/tmp/brewline.db")  # read when the task runs, so a test can point it elsewhere
        with sqlite3.connect(db) as con:  # one transaction: delete the day, then insert it
            con.execute("CREATE TABLE IF NOT EXISTS store_revenue (store TEXT, dt TEXT, revenue_cents INTEGER)")
            con.execute("DELETE FROM store_revenue WHERE dt = ?", (ds,))
            con.executemany("INSERT INTO store_revenue VALUES (?, ?, ?)", [(s, ds, c) for s, c in totals.items()])

    load(compute())


brewline_store_revenue()
