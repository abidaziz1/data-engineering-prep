"""Two ways to page through an API while the data changes: offset pages and cursor pages. The server is the fake Brewline API."""
import requests
from brewline_api import serve

base = serve()
http = requests.Session()


def ids(sid):
    return http.get(f"{base}/admin/ids", params={"sid": sid}, timeout=5).json()["ids"]


def fetch_offset(sid, scenario, per_page=5):
    got, page = [], 1
    while True:
        items = http.get(f"{base}/orders", params={"sid": sid, "scenario": scenario, "page": page, "per_page": per_page}, timeout=5).json()["items"]
        got += [o["id"] for o in items]
        if len(items) < per_page:
            return got
        page += 1


def fetch_cursor(sid, scenario, limit=5):
    got, after = [], None
    while True:
        params = {"sid": sid, "scenario": scenario, "limit": limit}
        if after:
            params["after"] = after
        data = http.get(f"{base}/orders/cursor", params=params, timeout=5).json()
        got += [o["id"] for o in data["items"]]
        after = data["next_cursor"]
        if after is None:
            return got


print(f"{'style':<8}{'while we read':<30}{'rows':>5}{'unique':>8}{'repeated':>10}{'missed':>8}")
for style, fetch in (("offset", fetch_offset), ("cursor", fetch_cursor)):
    for scenario, what in (("none", "nothing changes"), ("insert", "3 new orders arrive"), ("delete", "3 newest are cancelled")):
        sid = f"{style}-{scenario}"
        before = set(ids(sid))
        got = fetch(sid, scenario)
        stayed = before & set(ids(sid))  # orders that existed for the whole run
        print(f"{style:<8}{what:<30}{len(got):>5}{len(set(got)):>8}{len(got) - len(set(got)):>10}{len(stayed - set(got)):>8}")
