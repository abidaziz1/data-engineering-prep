"""The first Brewline DAG: three TaskFlow tasks in a row, run once a day."""
import json
import os
from pathlib import Path

import pendulum
from airflow.sdk import dag, task

OUT = Path(os.environ.get("BREWLINE_OUT", "/tmp/brewline"))


@dag(
    dag_id="brewline_first",
    schedule="@daily",
    start_date=pendulum.datetime(2026, 3, 1, tz="UTC"),
    catchup=False,
    tags=["brewline"],
)
def brewline_first():
    @task
    def extract(ds=None):
        orders = [{"order_id": "O-1", "total": 12.5}, {"order_id": "O-2", "total": 8.0}]
        print(f"extracted {len(orders)} orders for {ds}")
        return orders

    @task
    def transform(orders):
        total = sum(o["total"] for o in orders)
        print(f"total is {total}")
        return {"orders": len(orders), "total": total}

    @task
    def load(summary, ds=None):
        OUT.mkdir(parents=True, exist_ok=True)
        path = OUT / f"summary_{ds}.json"
        path.write_text(json.dumps(summary))
        print(f"wrote {path.name}")

    load(transform(extract()))


brewline_first()
