"""Connections and variables: where a task finds its secrets, and what the log shows."""
import pendulum
from airflow.sdk import BaseHook, Variable, dag, task


@dag(dag_id="brewline_secrets", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)
def brewline_secrets():
    @task
    def use_secrets():
        conn = BaseHook.get_connection("brewline_api")
        print("host:", conn.host, "login:", conn.login)
        print("password:", conn.password)
        print("region:", Variable.get("brewline_region"))
        print("api_secret:", Variable.get("brewline_api_secret"))
        print("warehouse host:", BaseHook.get_connection("brewline_warehouse").host)

    use_secrets()


brewline_secrets()
