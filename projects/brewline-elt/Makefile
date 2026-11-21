# Three small environments, because dlt, dbt and Airflow pin versions that do not agree on one interpreter.
# Override the paths on the command line:   make day-1 INGEST_PY=/path/to/python
INGEST_PY ?= .venv-ingest/bin/python
DBT       ?= .venv-dbt/bin/dbt
AIRFLOW   ?= .venv-airflow/bin/airflow
HOME_DIR  := $(CURDIR)
export BREWLINE_HOME := $(HOME_DIR)
export BREWLINE_PYTHON := $(INGEST_PY)
export BREWLINE_DBT := $(DBT)
export AIRFLOW_HOME ?= $(HOME_DIR)/.airflow
export AIRFLOW__CORE__LOAD_EXAMPLES := False
export AIRFLOW__CORE__DAGS_FOLDER := $(HOME_DIR)/orchestration/dags

setup:
	python3 -m venv .venv-ingest && .venv-ingest/bin/pip install -r requirements/ingest.txt
	python3 -m venv .venv-dbt && .venv-dbt/bin/pip install -r requirements/dbt.txt
	python3 -m venv .venv-airflow && .venv-airflow/bin/pip install -r requirements/airflow.txt
	$(AIRFLOW) db migrate

test:
	.venv-dbt/bin/python -m pytest -q tests

# one run of the DAG for one day of the pretend shop
day-%:
	$(AIRFLOW) dags test brewline_daily 2026-03-0$*

# the same steps without Airflow, for a quick look
manual-%:
	$(INGEST_PY) ingestion/load_orders.py --day $* --warehouse warehouse/brewline.duckdb
	cd dbt && BREWLINE_WAREHOUSE=$(HOME_DIR)/warehouse/brewline.duckdb $(DBT) build --profiles-dir .
	$(INGEST_PY) quality/source_vs_warehouse.py --day $* --warehouse warehouse/brewline.duckdb

clean:
	rm -rf warehouse published dbt/target dbt/logs .airflow
