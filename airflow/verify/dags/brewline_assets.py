"""Assets: a producer task says which asset it updated, and the DAGs that schedule on that asset run when it does."""
import pendulum
from airflow.sdk import Asset, dag, task, get_current_context

orders_raw = Asset(name="orders_raw", uri="brewline://lake/raw/orders")
customers_raw = Asset(name="customers_raw", uri="brewline://lake/raw/customers")


@dag(dag_id="brewline_land_orders", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)
def land_orders():
    @task(outlets=[orders_raw])
    def land():
        print("landed the orders file")

    land()


@dag(dag_id="brewline_land_customers", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)
def land_customers():
    @task(outlets=[customers_raw])
    def land():
        print("landed the customers file")

    land()


@dag(dag_id="brewline_orders_daily", schedule=[orders_raw], start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)
def orders_daily():
    @task
    def build():
        events = get_current_context()["triggering_asset_events"]
        for asset, evs in events.items():
            print(f"triggered by {asset.name}: {len(evs)} event(s)")

    build()


@dag(dag_id="brewline_customer_orders", schedule=[orders_raw, customers_raw], start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)
def customer_orders():
    @task
    def build():
        events = get_current_context()["triggering_asset_events"]
        for asset, evs in sorted(events.items(), key=lambda kv: kv[0].name):
            print(f"triggered by {asset.name}: {len(evs)} event(s)")

    build()


land_orders()
land_customers()
orders_daily()
customer_orders()
