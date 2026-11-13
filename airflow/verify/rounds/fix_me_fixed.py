"""Round 2, fixed: the six mistakes are repaired. Run at 02:00 UTC every day, no catchup, a fixed start date, safe to rerun, retry the load twice, and notify the team after the load whatever its outcome."""
import os
import sqlite3
from datetime import timedelta

import pendulum
from airflow.sdk import dag, task

DB = os.environ.get("BREWLINE_DB", "/tmp/brewline.db")


@dag(
    dag_id="brewline_nightly_fix_me",
    schedule="0 2 * * *",
    start_date=pendulum.datetime(2026, 3, 1, tz="UTC"),
    catchup=False,
)
def brewline_nightly_fix_me():
    @task
    def extract():
        return [("O-1", 12.5), ("O-2", 8.0)]

    @task(retries=2, retry_delay=timedelta(minutes=5))
    def load(rows, ds=None):
        with sqlite3.connect(DB) as con:  # one transaction: delete the day, then insert it
            con.execute("CREATE TABLE IF NOT EXISTS orders (order_id TEXT, dt TEXT, total REAL)")
            con.execute("DELETE FROM orders WHERE dt = ?", (ds,))
            con.executemany("INSERT INTO orders VALUES (?, ?, ?)", [(i, ds, t) for i, t in rows])

    @task(trigger_rule="all_done")
    def notify():
        print("the nightly load is done")

    load(extract()) >> notify()


brewline_nightly_fix_me()
