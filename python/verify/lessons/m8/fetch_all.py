"""Coding round: read every page of a cursor API, wait when the server says 429, and never read a page twice."""
import time

import requests
from brewline_api import serve


def fetch_all(http, url, limit=5, sleep=time.sleep, **params):
    """Return every item of a cursor-paged listing. `url` takes `limit` and `after`, and answers {"items": [...], "next_cursor": ...}.
    On a 429, wait for the Retry-After seconds and ask for the same page again. Any other error status raises."""
    items, after = [], None
    while True:
        query = dict(params, limit=limit)
        if after:
            query["after"] = after
        r = http.get(url, params=query, timeout=5)
        if r.status_code == 429:
            sleep(float(r.headers.get("Retry-After", 1)))
            continue
        r.raise_for_status()
        data = r.json()
        items += data["items"]
        after = data["next_cursor"]
        if after is None:
            return items


base = serve()
http = requests.Session()

got = fetch_all(http, f"{base}/orders/cursor", sid="t1")
assert [o["id"] for o in got] == [f"O-{n}" for n in range(100, 123)], "all 23 orders, once each, in order"
print("a quiet API:", len(got), "orders, from", got[0]["id"], "to", got[-1]["id"])

got = fetch_all(http, f"{base}/orders/cursor", limit=7, sid="t2", scenario="insert")
assert len({o["id"] for o in got}) == len(got) == 26, "the 3 new orders arrive at the end, with no repeats"
print("3 orders arrive while reading:", len(got), "orders, none twice")

waits = []


class Limited:
    """Answers 429 once, then forwards to the real session."""
    def __init__(self):
        self.tripped = False

    def get(self, url, **kw):
        if not self.tripped:
            self.tripped = True
            r = requests.Response()
            r.status_code, r.headers["Retry-After"] = 429, "2"
            return r
        return http.get(url, **kw)


got = fetch_all(Limited(), f"{base}/orders/cursor", sid="t3", sleep=waits.append)
assert waits == [2.0] and len(got) == 23
print("one 429 with Retry-After 2: waited", waits, "then read", len(got), "orders")
try:
    fetch_all(http, f"{base}/orders/O-999")
    raise AssertionError("a 404 must raise")
except requests.HTTPError as err:
    print("a 404 raises:", err.response.status_code)
print("tests passed")
