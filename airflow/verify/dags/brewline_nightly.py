"""The Brewline nightly pipeline, written with classic operators.

Five tasks in a row, then a notification that runs whatever happened. Airflow reads this file to build the DAG.
"""
from datetime import timedelta

import pendulum
from airflow.sdk import DAG
from airflow.providers.standard.operators.bash import BashOperator
from airflow.providers.standard.operators.empty import EmptyOperator
from airflow.providers.standard.operators.python import PythonOperator


def check_order_files(**context):
    print("checking the files of", context["ds"])


with DAG(
    dag_id="brewline_nightly",
    description="Nightly orders pipeline",
    schedule="0 2 * * *",
    start_date=pendulum.datetime(2026, 3, 1, tz="UTC"),
    catchup=False,
    default_args={"owner": "data-team", "retries": 2, "retry_delay": timedelta(minutes=5)},
    tags=["brewline", "nightly"],
) as dag:
    start = EmptyOperator(task_id="start")
    extract_orders = BashOperator(task_id="extract_orders", bash_command="echo extracting {{ ds }}")
    validate_orders = PythonOperator(task_id="validate_orders", python_callable=check_order_files)
    load_orders = BashOperator(task_id="load_orders", bash_command="echo loading {{ ds }}")
    build_marts = BashOperator(task_id="build_marts", bash_command="echo building marts")
    notify = BashOperator(task_id="notify", bash_command="echo done", trigger_rule="all_done")

    start >> extract_orders >> validate_orders >> load_orders >> build_marts >> notify
