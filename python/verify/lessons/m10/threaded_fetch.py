"""Coding round: do many slow calls at once, keep the order, and keep going when one call fails."""
import time
from concurrent.futures import ThreadPoolExecutor


def fetch_all(fetch, urls, workers=10):
    """Call fetch(url) for every url in a thread pool. Return a list in the order of `urls` with one item for each:
    ("ok", result) when the call worked, or ("error", "ExceptionName: message") when it raised."""
    def one(url):
        try:
            return ("ok", fetch(url))
        except Exception as err:
            return ("error", f"{type(err).__name__}: {err}")
    with ThreadPoolExecutor(workers) as pool:
        return list(pool.map(one, urls))


def slow(url):
    time.sleep(0.1)  # stands in for a network call
    if url.endswith("/7"):
        raise TimeoutError("read timed out")
    return url.upper()


urls = [f"/orders/{n}" for n in range(20)]
t0 = time.perf_counter()
got = fetch_all(slow, urls, workers=10)
took = time.perf_counter() - t0
assert [g[1] for g in got if g[0] == "ok"] == [u.upper() for u in urls if not u.endswith("/7")], "results in the order of the urls"
assert got[7] == ("error", "TimeoutError: read timed out") and len([g for g in got if g[0] == "error"]) == 1
print("20 calls of 0.1 s with 10 workers:", "finished in under a second" if took < 1.0 else "TOO SLOW", "-", len(got), "results")
assert took < 1.0, took
print("order kept:", got[0], got[19])
print("one failure kept, the other 19 worked:", got[7])
assert fetch_all(slow, []) == []
print("no urls:", fetch_all(slow, []))
print("tests passed")
