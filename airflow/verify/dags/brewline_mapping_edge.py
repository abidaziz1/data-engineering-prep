"""Dynamic task mapping, two edge cases: an empty list, and a list longer than max_map_length."""
import pendulum
from airflow.sdk import dag, task


@dag(dag_id="brewline_map_empty", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)
def map_empty():
    @task
    def list_stores():
        return []

    @task
    def load_store(store):
        print("loading", store)

    @task(trigger_rule="all_done")
    def summarize():
        print("summarize ran")

    load_store.expand(store=list_stores()) >> summarize()


@dag(dag_id="brewline_map_big", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)
def map_big():
    @task
    def list_stores():
        return list(range(1100))

    @task
    def load_store(store):
        return store

    load_store.expand(store=list_stores())


map_empty()
map_big()
