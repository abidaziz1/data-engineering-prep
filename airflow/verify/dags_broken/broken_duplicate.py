"""Two tasks with the same task_id."""
import pendulum
from airflow.sdk import DAG
from airflow.providers.standard.operators.empty import EmptyOperator

with DAG(dag_id="broken_duplicate", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz="UTC")) as dag:
    EmptyOperator(task_id="load")
    EmptyOperator(task_id="load")
