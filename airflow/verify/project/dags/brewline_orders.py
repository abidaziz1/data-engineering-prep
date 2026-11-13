"""The orders DAG of the Brewline project: its rules live in orders_logic.py, and its tests live in tests/."""
import os
from pathlib import Path

import pendulum
from airflow.sdk import dag, task

from orders_logic import normalize_order, revenue_cents

OUT = Path(os.environ.get("BREWLINE_OUT", "/tmp/brewline"))
RAW = [{"id": " o-1 ", "store": "SG-01", "total": "12.50"}, {"id": "o-2", "store": "SG-02", "total": "8.00"}]


@dag(
    dag_id="brewline_orders",
    schedule="0 2 * * *",
    start_date=pendulum.datetime(2026, 3, 1, tz="UTC"),
    catchup=False,
    default_args={"owner": "data-team", "retries": 2},
    tags=["brewline", "orders"],
)
def brewline_orders():
    @task
    def transform():
        return [normalize_order(r) for r in RAW]

    @task
    def load(rows, ds=None):
        OUT.mkdir(parents=True, exist_ok=True)
        (OUT / f"revenue_{ds}.txt").write_text(str(revenue_cents(rows)))

    load(transform())


brewline_orders()
