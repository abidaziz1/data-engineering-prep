"""Callbacks: functions that Airflow calls when a task fails, retries or succeeds."""
import os

import pendulum
from airflow.sdk import dag, task

LOG = os.environ.get("BREWLINE_CALLBACK_LOG", "/tmp/brewline_callbacks.log")


def note(kind):
    def callback(context):
        ti = context["ti"]
        with open(LOG, "a") as f:
            f.write(f"{kind} task={ti.task_id} try={ti.try_number}\n")
    return callback


@dag(dag_id="brewline_callbacks", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)
def brewline_callbacks():
    @task(retries=1, retry_delay=0, on_failure_callback=note("failure"), on_retry_callback=note("retry"), on_success_callback=note("success"))
    def export():
        raise RuntimeError("the export service is down")

    export()


brewline_callbacks()
