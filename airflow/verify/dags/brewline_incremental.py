"""Two incremental loads of the same source. One reads only the day of the run. The other also reads the day before, so it catches rows that arrive late."""
import os
import sqlite3

import pendulum
from airflow.sdk import dag, task

DB = os.environ.get("BREWLINE_DB", "/tmp/brewline.db")


def make(dag_id, table, lookback_days):
    @dag(dag_id=dag_id, schedule="@daily", start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)
    def incremental():
        @task
        def load(ds=None):
            with sqlite3.connect(DB) as con:
                con.execute(f"CREATE TABLE IF NOT EXISTS {table} (order_id TEXT PRIMARY KEY, updated_at TEXT, total REAL)")
                rows = con.execute(
                    "SELECT order_id, updated_at, total FROM source_orders WHERE updated_at >= date(?, ?) AND updated_at < date(?, '+1 day')",
                    (ds, f"-{lookback_days} day", ds),
                ).fetchall()
                con.executemany(
                    f"INSERT INTO {table} VALUES (?, ?, ?) ON CONFLICT(order_id) DO UPDATE SET updated_at = excluded.updated_at, total = excluded.total",
                    rows,
                )
            print(f"read {len(rows)} source rows for {ds}")

        load()

    return incremental()


brewline_incr_window = make("brewline_incr_window", "orders_window", 0)
brewline_incr_lookback = make("brewline_incr_lookback", "orders_lookback", 1)
