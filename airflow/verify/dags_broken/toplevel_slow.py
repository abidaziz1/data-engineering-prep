"""A DAG file that does slow work when it is imported, not when its task runs. Airflow imports every DAG file again and again."""
import time

import pendulum
from airflow.sdk import DAG
from airflow.providers.standard.operators.empty import EmptyOperator

time.sleep(2)  # stands in for a call to an API, a database or a big import at the top of the file

with DAG(dag_id="toplevel_slow", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz="UTC")) as dag:
    EmptyOperator(task_id="start")
