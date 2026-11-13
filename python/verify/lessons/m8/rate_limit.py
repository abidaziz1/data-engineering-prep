"""A client that obeys 429 and Retry-After. The fake API allows 3 requests in each second."""
import time

import requests
from brewline_api import serve

base = serve()


def get_json(http, url, **params):
    for attempt in range(1, 6):
        r = http.get(url, params=params, timeout=5)
        if r.status_code == 429:
            wait = float(r.headers.get("Retry-After", 1))
            print(f"    429 Too Many Requests, Retry-After: {wait:g}, so wait {wait:g} s")
            time.sleep(wait)
            continue
        r.raise_for_status()
        return r.json()
    raise RuntimeError("still limited after 5 tries")


with requests.Session() as http:
    for n in range(1, 7):
        t0 = time.monotonic()
        get_json(http, f"{base}/limited", sid="demo")
        print(f"call {n}: ok in {time.monotonic() - t0:.0f} s")
