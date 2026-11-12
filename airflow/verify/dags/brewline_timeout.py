"""A task that takes longer than its execution_timeout."""
import datetime
import time

import pendulum
from airflow.sdk import dag, task


@dag(dag_id="brewline_timeout", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)
def brewline_timeout():
    @task(execution_timeout=datetime.timedelta(seconds=3), retries=0)
    def slow_export():
        time.sleep(10)

    slow_export()


brewline_timeout()
