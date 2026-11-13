"""Branching: pick one path, skip the other, then join with a trigger rule that accepts skipped parents."""
import pendulum
from airflow.sdk import dag, task


@dag(dag_id="brewline_branch", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False, params={"full_refresh": False})
def brewline_branch():
    @task.branch
    def choose(params=None):
        return "full_load" if params["full_refresh"] else "incremental_load"

    @task
    def full_load():
        print("loading everything")

    @task
    def incremental_load():
        print("loading yesterday")

    @task(trigger_rule="none_failed_min_one_success")
    def build_marts():
        print("building marts")

    pick = choose()
    full = full_load()
    incremental = incremental_load()
    pick >> [full, incremental] >> build_marts()


brewline_branch()
