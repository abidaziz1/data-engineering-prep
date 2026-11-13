import sqlite3
from pathlib import Path

import pendulum
import pytest
from airflow.dag_processing.dagbag import DagBag

DAGS = Path(__file__).resolve().parents[1] / "dags"


@pytest.fixture(scope="session")
def dagbag():
    return DagBag(dag_folder=str(DAGS))


def test_no_import_errors(dagbag):
    assert dagbag.import_errors == {}


def test_team_rules(dagbag):
    dag = dagbag.dags["brewline_store_revenue"]
    assert dag.tags and all(t.owner == "data-team" for t in dag.tasks)
    assert all(t.retries >= 1 for t in dag.tasks)


def test_running_the_dag_twice_gives_the_same_table(dagbag, tmp_path, monkeypatch):
    db = tmp_path / "round.db"
    monkeypatch.setenv("BREWLINE_DB", str(db))
    dag = dagbag.dags["brewline_store_revenue"]
    day = pendulum.datetime(2026, 3, 14, tz="UTC")
    counts = []
    for _ in range(2):
        assert dag.test(logical_date=day).state == "success"
        with sqlite3.connect(db) as con:
            counts.append(con.execute("SELECT count(*), sum(revenue_cents) FROM store_revenue").fetchone())
    assert counts == [(2, 4049), (2, 4049)]
