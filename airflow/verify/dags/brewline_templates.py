"""Templates: Airflow fills in {{ ... }} in the fields of an operator just before the task runs."""
import pendulum
from airflow.sdk import DAG
from airflow.providers.standard.operators.bash import BashOperator

with DAG(
    dag_id="brewline_templates",
    schedule="0 2 * * *",
    start_date=pendulum.datetime(2026, 3, 1, tz="UTC"),
    catchup=False,
    params={"region": "sg"},
) as dag:
    dates = BashOperator(
        task_id="dates",
        bash_command="echo ds={{ ds }} nodash={{ ds_nodash }} logical_date={{ logical_date }} start={{ data_interval_start }} end={{ data_interval_end }}",
    )
    path = BashOperator(
        task_id="partition_path",
        bash_command="echo s3://brewline-lake/raw/orders/dt={{ ds }}/region={{ params.region }}/",
    )
    previous = BashOperator(task_id="previous_day", bash_command="echo {{ macros.ds_add(ds, -1) }}")
    dates >> path >> previous
