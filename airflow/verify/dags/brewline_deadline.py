"""A deadline alert: if the run is not done five seconds after it was queued, Airflow calls a function."""
import datetime

import pendulum
from airflow.sdk import DeadlineAlert, DeadlineReference, SyncCallback, dag, task


@dag(
    dag_id="brewline_deadline",
    schedule=None,
    start_date=pendulum.datetime(2026, 3, 1, tz="UTC"),
    catchup=False,
    deadline=DeadlineAlert(
        reference=DeadlineReference.DAGRUN_QUEUED_AT,
        interval=datetime.timedelta(seconds=5),
        callback=SyncCallback("brewline_alerts.deadline_missed"),
    ),
)
def brewline_deadline():
    @task
    def slow_load():
        import time

        time.sleep(20)

    slow_load()


brewline_deadline()
