"""Generates one DAG for each trigger rule. Every DAG has ten children, one for each mix of three parents that succeeded, failed or were skipped.

The recorder runs each DAG with dag.test() and reads the state of every child. The recording shows what Airflow does, rule by rule.
"""
import itertools

import pendulum
from airflow.sdk import DAG, task
from airflow.sdk.exceptions import AirflowSkipException
from airflow.task.trigger_rule import TriggerRule

MIXES = [(3, 0, 0), (2, 1, 0), (2, 0, 1), (1, 2, 0), (1, 1, 1), (1, 0, 2), (0, 3, 0), (0, 2, 1), (0, 1, 2), (0, 0, 3)]


@task(retries=0)
def succeed():
    return "ok"


@task(retries=0)
def fail():
    raise RuntimeError("boom")


@task(retries=0)
def skip():
    raise AirflowSkipException("not needed")


for rule in TriggerRule:
    with DAG(dag_id=f"trigger_rule_{rule.value}", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz="UTC")) as dag:
        for s, f, k in MIXES:
            parents = [succeed.override(task_id=f"s{i}_{s}{f}{k}")() for i in range(s)]
            parents += [fail.override(task_id=f"f{i}_{s}{f}{k}")() for i in range(f)]
            parents += [skip.override(task_id=f"k{i}_{s}{f}{k}")() for i in range(k)]

            @task(retries=0, trigger_rule=rule.value, task_id=f"child_{s}{f}{k}")
            def child():
                return "ran"

            parents >> child()
    globals()[dag.dag_id] = dag
