"""Which values does a task get? A scheduled run and a manual run without a date answer differently."""
import pendulum
from airflow.sdk import dag, task, get_current_context


@dag(dag_id="brewline_ctx", schedule="@daily", start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)
def brewline_ctx():
    @task
    def show():
        ctx = get_current_context()
        for key in ["run_id", "logical_date", "data_interval_start", "data_interval_end", "ds", "ts"]:
            print(key, "=", ctx.get(key, "<missing>"))
        print("run_type =", ctx["dag_run"].run_type.value)

    @task
    def templated(ds=None):
        print("ds argument =", ds)

    show() >> templated()


brewline_ctx()
