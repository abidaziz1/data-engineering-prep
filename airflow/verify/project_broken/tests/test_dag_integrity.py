"""Tests that every DAG file of the project follows the rules of the team. They run in a second, with no Airflow services."""
from pathlib import Path

import pytest
from airflow.dag_processing.dagbag import DagBag

DAGS = Path(__file__).resolve().parents[1] / "dags"


@pytest.fixture(scope="session")
def dagbag():
    return DagBag(dag_folder=str(DAGS))


def test_no_import_errors(dagbag):
    assert dagbag.import_errors == {}


def test_every_dag_has_tags_and_an_owner(dagbag):
    for dag_id, dag in dagbag.dags.items():
        assert dag.tags, f"{dag_id} has no tags"
        assert all(t.owner != "airflow" for t in dag.tasks), f"{dag_id} still has the default owner"


def test_every_task_retries(dagbag):
    for dag_id, dag in dagbag.dags.items():
        for task in dag.tasks:
            assert task.retries >= 1, f"{dag_id}.{task.task_id} does not retry"


def test_the_dag_runs(dagbag, tmp_path, monkeypatch):
    monkeypatch.setenv("BREWLINE_OUT", str(tmp_path))
    import pendulum

    run = dagbag.dags["brewline_orders"].test(logical_date=pendulum.datetime(2026, 3, 14, tz="UTC"))
    assert run.state == "success"
