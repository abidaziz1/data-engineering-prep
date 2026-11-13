"""Six tasks that each take three seconds, in a pool with two slots, and five tasks with different priorities in a pool with one slot."""
import pendulum
from airflow.sdk import DAG
from airflow.providers.standard.operators.bash import BashOperator

with DAG(dag_id="brewline_pool_two_slots", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False) as dag:
    for n in range(1, 7):
        BashOperator(task_id=f"load_{n}", bash_command="sleep 3", pool="warehouse_pool")

with DAG(dag_id="brewline_pool_priority", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False) as dag2:
    for n in range(1, 6):
        BashOperator(task_id=f"report_{n}", bash_command="sleep 2", pool="single_pool", priority_weight=n)
