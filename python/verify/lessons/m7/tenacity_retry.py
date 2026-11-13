"""The same idea with the tenacity library, and a failure that must not be retried."""
import logging
import random
import sys

from tenacity import before_sleep_log, retry, retry_if_exception_type, stop_after_attempt, wait_random_exponential

logging.basicConfig(stream=sys.stdout, level=logging.WARNING, format="%(levelname)s %(message)s")
log = logging.getLogger("loader")
random.seed(3)


class Transient(Exception):
    pass


calls = {"n": 0}


@retry(
    retry=retry_if_exception_type(Transient),
    stop=stop_after_attempt(5),
    wait=wait_random_exponential(multiplier=0.01, max=0.05),  # full jitter, with small waits so that this file runs fast
    before_sleep=before_sleep_log(log, logging.WARNING),
    reraise=True,
)
def fetch_page(kind):
    calls["n"] += 1
    if kind == "bad request":
        raise ValueError("400 Bad Request")
    if calls["n"] <= 2:
        raise Transient("429 Too Many Requests")
    return "page 1"


print("result:", fetch_page("fine"), "after", calls["n"], "calls")

calls["n"] = 0
try:
    fetch_page("bad request")
except ValueError as err:
    print("a ValueError is not in the retry list, so it stopped after", calls["n"], "call:", err)
