"""A DAG written for Airflow 2.x. It still imports in 3.4.0, with warnings, and ruff can find what to change before Airflow 4."""
from datetime import datetime

from airflow import DAG
from airflow.decorators import task
from airflow.models import Variable
from airflow.operators.bash import BashOperator
from airflow.operators.python import PythonOperator
from airflow.utils.dates import days_ago
from airflow.utils.trigger_rule import TriggerRule


def load(**context):
    run_day = context["execution_date"]
    print("loading", run_day, Variable.get("region"))


with DAG(
    dag_id="old_style",
    schedule_interval="@daily",
    start_date=days_ago(2),
    catchup=False,
) as dag:
    extract = BashOperator(task_id="extract", bash_command="echo {{ execution_date }}")
    load_orders = PythonOperator(task_id="load", python_callable=load, provide_context=True, trigger_rule=TriggerRule.ALL_SUCCESS)
    extract >> load_orders
