"""XCom: a return value is pushed under the key return_value. A task can push other keys too."""
import pendulum
from airflow.sdk import dag, task, get_current_context


@dag(dag_id="brewline_xcom", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)
def brewline_xcom():
    @task
    def count_orders():
        return 3

    @task(multiple_outputs=True)
    def summarize():
        return {"orders": 3, "revenue": 41.5}

    @task
    def push_extra():
        ti = get_current_context()["ti"]
        ti.xcom_push(key="source_file", value="orders-2026-03-14.json")

    @task
    def report(n, summary):
        ti = get_current_context()["ti"]
        name = ti.xcom_pull(task_ids="push_extra", key="source_file")
        print(f"{n} orders, revenue {summary['revenue']}, from {name}")

    n = count_orders()
    s = summarize()
    p = push_extra()
    report(n, s) << p


brewline_xcom()
