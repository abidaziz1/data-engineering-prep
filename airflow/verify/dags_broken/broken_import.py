"""A DAG file that cannot be imported: it needs a module that is not installed."""
import pendulum
from airflow.sdk import DAG
from airflow.providers.standard.operators.empty import EmptyOperator

import brewline_utils  # noqa: F401  (the module lives in another repository and is not installed here)

with DAG(dag_id="broken_import", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz="UTC")) as dag:
    EmptyOperator(task_id="start")
