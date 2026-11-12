"""A retry policy: the exception decides what happens next, not only the number of retries."""
import datetime
import os

import pendulum
from airflow.sdk import ExceptionRetryPolicy, RetryAction, RetryRule, dag, task

COUNT_FILE = os.environ.get("BREWLINE_POLICY_COUNT", "/tmp/brewline_policy_count")

policy = ExceptionRetryPolicy(
    rules=[
        RetryRule(exception="builtins.PermissionError", action=RetryAction.FAIL, reason="A wrong credential does not fix itself"),
        RetryRule(exception="builtins.ConnectionError", action=RetryAction.RETRY, retry_delay=datetime.timedelta(seconds=1), reason="The partner API may be restarting"),
    ]
)


@dag(dag_id="brewline_retry_policy", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz="UTC"), catchup=False)
def brewline_retry_policy():
    @task(retries=3, retry_policy=policy)
    def call_partner():
        tries = int(open(COUNT_FILE).read()) if os.path.exists(COUNT_FILE) else 0
        open(COUNT_FILE, "w").write(str(tries + 1))
        if tries < 2:
            raise ConnectionError(f"partner API refused the connection (try {tries + 1})")
        return "ok"

    @task(retries=3, retry_policy=policy)
    def read_secret():
        raise PermissionError("the API key was rejected")

    call_partner()
    read_secret()


brewline_retry_policy()
