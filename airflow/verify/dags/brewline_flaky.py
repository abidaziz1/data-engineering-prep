"""A task that fails twice and then works. The counter lives in a file, so it survives between tries."""
import datetime
import os

import pendulum
from airflow.sdk import dag, task

COUNT_FILE = os.environ.get("FLAKY_COUNT_FILE", "/tmp/brewline_flaky_count")


@dag(dag_id="brewline_flaky", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)
def brewline_flaky():
    @task(retries=3, retry_delay=datetime.timedelta(seconds=2))
    def extract():
        tries = int(open(COUNT_FILE).read()) if os.path.exists(COUNT_FILE) else 0
        open(COUNT_FILE, "w").write(str(tries + 1))
        if tries < 2:
            raise RuntimeError(f"source not ready (try {tries + 1})")
        return "rows=10"

    @task
    def load(value):
        print("loading", value)

    load(extract())


brewline_flaky()
