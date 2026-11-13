"""How big can an XCom be? Four tasks return strings of growing size."""
import pendulum
from airflow.sdk import dag, task

SIZES = {"1 KB": 1_000, "100 KB": 100_000, "1 MB": 1_000_000, "10 MB": 10_000_000}


@dag(dag_id="brewline_xcom_size", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)
def xcom_size():
    for label, n in SIZES.items():
        @task(task_id="return_" + label.replace(" ", "_").lower())
        def make(n=n):
            return "x" * n

        make()


xcom_size()
