"""Round 2: this DAG has six mistakes. Requirements: run at 02:00 UTC every day, no catchup, a fixed start date, safe to rerun, retry the load twice, and notify the team after the load whatever its outcome."""
import os
import sqlite3
from datetime import datetime

from airflow.sdk import dag, task

DB = os.environ.get("BREWLINE_DB", "/tmp/brewline.db")


@dag(
    dag_id="brewline_nightly_fix_me",
    schedule_interval="0 2 * * *",
    start_date=datetime.now(),
    catchup=True,
)
def brewline_nightly_fix_me():
    @task
    def extract():
        return [("O-1", 12.5), ("O-2", 8.0)]

    @task
    def load(rows, ds=None):
        with sqlite3.connect(DB) as con:
            con.execute("CREATE TABLE IF NOT EXISTS orders (order_id TEXT, dt TEXT, total REAL)")
            con.executemany("INSERT INTO orders VALUES (?, ?, ?)", [(i, ds, t) for i, t in rows])

    @task
    def notify():
        print("the nightly load is done")

    load(extract()) >> notify()


brewline_nightly_fix_me()
