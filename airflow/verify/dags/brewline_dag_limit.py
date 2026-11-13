"""Six independent tasks and no pool: the DAG itself allows two tasks at a time."""
import pendulum
from airflow.sdk import DAG
from airflow.providers.standard.operators.bash import BashOperator

with DAG(dag_id="brewline_dag_limit", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False, max_active_tasks=2) as dag:
    for n in range(1, 7):
        BashOperator(task_id=f"load_{n}", bash_command="sleep 3")
