"""Functions that the scheduler and the executor import by name. They must be importable from the DAGs folder."""
import os


def deadline_missed(**kwargs):
    with open(os.environ.get("BREWLINE_DEADLINE_LOG", "/tmp/brewline_deadline.log"), "a") as f:
        f.write("deadline missed\n")
