"""A DAG file with a typo in an import. Airflow lists it as an import error and shows no DAG from this file."""
import pendulum
from airflow.sdk import DAG
from airflow.providers.google.cloud.operators.bigqeury import BigQueryInsertJobOperator   # the typo is in "bigqeury"

with DAG(dag_id="broken_import", schedule=None, start_date=pendulum.datetime(2026, 11, 1, tz="UTC")):
    BigQueryInsertJobOperator(task_id="x", configuration={})
