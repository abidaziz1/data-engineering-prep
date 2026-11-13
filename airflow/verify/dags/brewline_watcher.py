"""A cleanup task with trigger rule all_done decides the state of the run. The watcher pattern makes the run fail when any other task failed."""
import pendulum
from airflow.sdk import dag, task
from airflow.sdk.exceptions import AirflowException


@dag(dag_id="brewline_teardown_hides", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)
def teardown_hides():
    @task
    def check_quality():
        raise ValueError("row counts do not match")

    @task
    def publish():
        print("publishing")

    @task(trigger_rule="all_done")
    def cleanup():
        print("removing the temporary files")

    check_quality() >> publish() >> cleanup()


@dag(dag_id="brewline_teardown_watcher", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)
def teardown_watcher():
    @task
    def check_quality():
        raise ValueError("row counts do not match")

    @task
    def publish():
        print("publishing")

    @task(trigger_rule="all_done")
    def cleanup():
        print("removing the temporary files")

    @task(trigger_rule="one_failed", retries=0)
    def watcher():
        raise AirflowException("a task of this run failed")

    checked = check_quality()
    published = publish()
    cleaned = cleanup()
    checked >> published >> cleaned
    [checked, published, cleaned] >> watcher()


teardown_hides()
teardown_watcher()
