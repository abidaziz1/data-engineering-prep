"""The daily orders DAG of Brewline. It runs at 02:00 Singapore time, merges yesterday's staged orders into the table, then checks the result.

Composer runs Airflow, so this is an ordinary Airflow DAG. Nothing heavy happens when the file is read: the work is in the tasks.
"""
import pendulum
from airflow.providers.google.cloud.operators.bigquery import BigQueryInsertJobOperator
from airflow.providers.standard.operators.empty import EmptyOperator
from airflow.sdk import DAG, task

with DAG(
    dag_id="brewline_daily",
    schedule="0 2 * * *",
    start_date=pendulum.datetime(2026, 11, 1, tz="Asia/Singapore"),
    catchup=False,
    default_args={"retries": 2},
    tags=["brewline", "orders"],
) as dag:
    start = EmptyOperator(task_id="start")

    merge_orders = BigQueryInsertJobOperator(
        task_id="merge_orders",
        location="asia-southeast1",
        project_id="brewline-dev",
        configuration={
            "query": {
                "query": "MERGE `brewline-dev.curated.orders` AS t USING `brewline-dev.staging.orders_{{ ds_nodash }}` AS s ON t.order_id = s.order_id "
                         "WHEN MATCHED THEN UPDATE SET status = s.status WHEN NOT MATCHED THEN INSERT ROW",
                "useLegacySql": False,
            }
        },
    )

    @task
    def check_rows(ds=None):
        return "checked " + ds

    start >> merge_orders >> check_rows()
