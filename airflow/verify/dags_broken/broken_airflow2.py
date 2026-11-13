"""A DAG written for Airflow 2: schedule_interval was removed in Airflow 3."""
import pendulum
from airflow.sdk import DAG
from airflow.providers.standard.operators.empty import EmptyOperator

with DAG(dag_id="broken_airflow2", schedule_interval="@daily", start_date=pendulum.datetime(2026, 3, 1, tz="UTC")) as dag:
    EmptyOperator(task_id="start")
