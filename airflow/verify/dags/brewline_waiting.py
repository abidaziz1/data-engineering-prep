"""Four sensors wait for a partner file, in three ways. All of them use a pool with two slots.

poke        the sensor keeps its slot for the whole wait and checks every poke_interval seconds
reschedule  the sensor gives its slot back between checks
deferrable  the sensor hands the wait to the triggerer and holds no slot at all
"""
import os

import pendulum
from airflow.sdk import DAG
from airflow.providers.standard.sensors.filesystem import FileSensor
from airflow.providers.standard.sensors.python import PythonSensor

WATCH_DIR = os.environ.get("BREWLINE_WATCH", "/tmp/brewline_watch")


def file_arrived(path):
    return os.path.exists(path)


for mode in ("poke", "reschedule", "deferrable"):
    with DAG(
        dag_id=f"brewline_wait_{mode}",
        schedule=None,
        start_date=pendulum.datetime(2026, 3, 1, tz="UTC"),
        catchup=False,
    ) as dag:
        for n in range(1, 5):
            path = f"{WATCH_DIR}/{mode}_partner_{n}.csv"
            if mode == "deferrable":
                FileSensor(task_id=f"wait_{n}", filepath=path, deferrable=True, poke_interval=2, pool="partner_pool")
            else:
                PythonSensor(
                    task_id=f"wait_{n}",
                    python_callable=file_arrived,
                    op_args=[path],
                    mode=mode,
                    poke_interval=2,
                    timeout=60,
                    pool="partner_pool",
                )
    globals()[dag.dag_id] = dag
