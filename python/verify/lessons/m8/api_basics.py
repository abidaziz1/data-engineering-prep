"""Calling an API: a session, a timeout, a status check and JSON. The server is a fake Brewline API that runs on this machine."""
import requests
from brewline_api import serve

base = serve()
with requests.Session() as http:  # one session reuses the connection
    r = http.get(f"{base}/orders", params={"page": 1, "per_page": 3}, timeout=5)
    print(r.status_code, r.headers["Content-Type"])
    page = r.json()
    print("keys:", sorted(page), "ids:", [o["id"] for o in page["items"]])

    r = http.get(f"{base}/orders/O-999", timeout=5)
    print(r.status_code, r.reason, r.json())
    try:
        r.raise_for_status()
    except requests.HTTPError as err:
        print("raise_for_status:", err)

    try:
        http.get(f"{base}/slow", params={"delay": 2}, timeout=0.5)
    except requests.Timeout as err:
        print("timeout:", type(err).__name__)
