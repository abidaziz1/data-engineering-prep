"""A task that fails twice and then works, to show what retries do. The counter lives in a file so that it survives between tries."""
import datetime
import os

import pendulum
from airflow.sdk import DAG, task

COUNT_FILE = os.environ.get("FLAKY_COUNT_FILE", "/tmp/flaky_count")

with DAG(dag_id="flaky_demo", schedule=None, start_date=pendulum.datetime(2026, 11, 1, tz="UTC"), catchup=False) as dag:

    @task(retries=2, retry_delay=datetime.timedelta(seconds=1))
    def extract():
        tries = int(open(COUNT_FILE).read()) if os.path.exists(COUNT_FILE) else 0
        open(COUNT_FILE, "w").write(str(tries + 1))
        if tries < 2:
            raise RuntimeError("source not ready (try %d)" % (tries + 1))
        return "rows=10"

    @task
    def load(value):
        return value

    load(extract())
