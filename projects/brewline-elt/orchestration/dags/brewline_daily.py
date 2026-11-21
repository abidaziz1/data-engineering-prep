"""The daily pipeline of Brewline: load the shop with dlt, build the models and run the tests with dbt, check the warehouse against the shop, and publish the marts.

A run handles one day of the pretend shop: the day number is the number of days since the logical date 2026-03-01, plus one.
Where the tools live is set by environment variables, so that the same DAG runs on a laptop and in a container:
  BREWLINE_HOME     the folder of the project           BREWLINE_PYTHON  the Python that has dlt and DuckDB
  BREWLINE_DBT      the dbt program                     BREWLINE_RETRIES how many times a task is retried (2 by default)
"""
import datetime
import os

from airflow.sdk import dag, task

HOME = os.environ.get('BREWLINE_HOME', os.getcwd())
PYTHON = os.environ.get('BREWLINE_PYTHON', 'python')
DBT = os.environ.get('BREWLINE_DBT', 'dbt')
WAREHOUSE = os.path.join(HOME, 'warehouse', 'brewline.duckdb')
FIRST_DAY = datetime.date(2026, 3, 1)


def day_of(logical_date):
    return (logical_date.date() - FIRST_DAY).days + 1


@dag(
    dag_id='brewline_daily',
    schedule='@daily',
    start_date=datetime.datetime(2026, 3, 1, tzinfo=datetime.timezone.utc),
    catchup=False,
    max_active_runs=1,                                      # two runs at once would write the same warehouse file
    default_args={'retries': int(os.environ.get('BREWLINE_RETRIES', '2')), 'retry_delay': datetime.timedelta(seconds=5)},
    tags=['brewline', 'elt'],
)
def brewline_daily():
    @task.bash(cwd=HOME)
    def extract_load(logical_date=None):
        return '%s ingestion/load_orders.py --day %d --warehouse %s' % (PYTHON, day_of(logical_date), WAREHOUSE)

    @task.bash(cwd=os.path.join(HOME, 'dbt'), env={'BREWLINE_WAREHOUSE': WAREHOUSE, 'DBT_PROFILES_DIR': os.path.join(HOME, 'dbt')}, append_env=True)
    def dbt_build():
        return '%s build' % DBT

    @task.bash(cwd=HOME)
    def quality_gate(logical_date=None):
        return '%s quality/source_vs_warehouse.py --day %d --warehouse %s' % (PYTHON, day_of(logical_date), WAREHOUSE)

    @task.bash(cwd=HOME)
    def publish():
        return '%s quality/publish.py --warehouse %s --out %s' % (PYTHON, WAREHOUSE, os.path.join(HOME, 'published'))

    extract_load() >> dbt_build() >> quality_gate() >> publish()


brewline_daily()
