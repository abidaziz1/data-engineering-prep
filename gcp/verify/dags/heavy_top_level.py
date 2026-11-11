"""A DAG file that does slow work when it is READ. The scheduler reads every DAG file again and again, so slow work here slows everything."""
import time

import pendulum
from airflow.providers.standard.operators.empty import EmptyOperator
from airflow.sdk import DAG

time.sleep(2)                                   # imagine a call to an API or a database here, at the top of the file

with DAG(dag_id="heavy_top_level", schedule=None, start_date=pendulum.datetime(2026, 11, 1, tz="UTC")):
    EmptyOperator(task_id="start")
