"""A task that always fails, with exponential backoff: how long does Airflow wait before each retry?"""
import datetime

import pendulum
from airflow.sdk import dag, task


@dag(dag_id="brewline_backoff", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)
def brewline_backoff():
    @task(
        retries=4,
        retry_delay=datetime.timedelta(seconds=1),
        retry_exponential_backoff=2.0,
        max_retry_delay=datetime.timedelta(seconds=10),
    )
    def call_partner():
        raise ConnectionError("the partner API is down")

    call_partner()


brewline_backoff()
