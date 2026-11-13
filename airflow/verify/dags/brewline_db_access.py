"""A task that reaches for the metadata database. In Airflow 3 a task talks to the API server, not to the database."""
import pendulum
from airflow.sdk import dag, task


@dag(dag_id="brewline_db_access", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)
def brewline_db_access():
    @task(retries=0)
    def count_runs():
        from airflow.models import DagRun
        from airflow.utils.session import create_session

        with create_session() as session:
            print(session.query(DagRun).count())

    count_runs()


brewline_db_access()
