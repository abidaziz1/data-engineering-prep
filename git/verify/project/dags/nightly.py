from datetime import datetime

from airflow.sdk import DAG
from airflow.providers.standard.operators.bash import BashOperator

with DAG("nightly_orders", schedule="0 2 * * *", start_date=datetime(2026, 3, 1), catchup=False):
    BashOperator(task_id="load", bash_command="python loader/load_orders.py data/orders.csv")
