"""Dynamic task mapping: one task definition, one task instance for each store, decided when the DAG runs."""
import pendulum
from airflow.sdk import dag, task


@dag(dag_id="brewline_mapping", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)
def brewline_mapping():
    @task
    def list_stores():
        return ["SG-01", "SG-02", "SG-03", "SG-04", "SG-05"]

    @task
    def load_store(store, region):
        print(f"loading {store} in {region}")
        return {"store": store, "orders": len(store) * 10}

    @task
    def summarize(results):
        results = list(results)
        print(f"loaded {len(results)} stores, {sum(r['orders'] for r in results)} orders")

    summarize(load_store.partial(region="sg").expand(store=list_stores()))


brewline_mapping()
