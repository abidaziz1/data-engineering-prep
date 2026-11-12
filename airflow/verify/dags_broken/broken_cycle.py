"""A DAG whose tasks wait for each other in a circle."""
import pendulum
from airflow.sdk import DAG
from airflow.providers.standard.operators.empty import EmptyOperator

with DAG(dag_id="broken_cycle", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz="UTC")) as dag:
    extract = EmptyOperator(task_id="extract")
    load = EmptyOperator(task_id="load")
    check = EmptyOperator(task_id="check")
    extract >> load >> check >> extract
