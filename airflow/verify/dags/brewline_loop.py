"""Task loops (new in Airflow 3.4): a task group that repeats. One loop runs a fixed number of times, the other until a condition is met."""
from __future__ import annotations

from airflow.sdk import LoopDecision, dag, task, task_group


@dag(dag_id="brewline_loop_fixed", schedule=None, catchup=False, tags=["brewline"])
def loop_fixed():
    @task_group
    def accumulate():
        @task
        def increment(*, loop):
            total = (0 if loop.index == 1 else loop.previous) + 1
            print(f"iteration {loop.index}: total is {total}")
            return total

        increment()

    accumulate.loop(max_iterations=3)


@dag(dag_id="brewline_loop_until", schedule=None, catchup=False, tags=["brewline"])
def loop_until():
    @task_group
    def refine():
        @task
        def improve(*, loop):
            estimate = 1.0 if loop.index == 1 else loop.previous["estimate"]
            return (estimate + 2.0 / estimate) / 2.0

        @task
        def evaluate(estimate, *, loop):
            error = abs(estimate * estimate - 2.0)
            print(f"iteration {loop.index}: estimate {estimate:.6f}, error {error:.2g}")
            return {"estimate": estimate, "error": error}

        evaluate(improve())

    def accurate_enough(*, loop):
        error = loop.result["error"]
        return LoopDecision(stop=error < 0.000001, reason=f"error {error:.2g}")

    @task
    def finished():
        print("refinement finished")

    refine.loop(max_iterations=10, until=accurate_enough) >> finished()


loop_fixed()
loop_until()
