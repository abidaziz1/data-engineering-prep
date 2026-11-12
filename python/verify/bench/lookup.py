"""Time a membership test on a list, a set and a dict. Prints one JSON object: microseconds per lookup, median of 5 runs."""
import json
import random
import statistics
import time

SIZES = [1_000, 10_000, 100_000, 1_000_000]
out = {"sizes": SIZES, "list": [], "set": [], "dict": [], "lookups": {}}
rng = random.Random(7)
for n in SIZES:
    ids = [f"O-{i:07d}" for i in range(n)]
    s, d = set(ids), dict.fromkeys(ids, 1)
    k = 2000 if n < 100_000 else 200
    kl = 200 if n < 100_000 else 10
    probes = [ids[rng.randrange(n)] for _ in range(k)]
    list_probes = ids[-kl:]  # the last items, where a list has to look at everything
    def time_it(fn, probes_):
        runs = []
        for _ in range(5):
            t = time.perf_counter()
            for p in probes_:
                fn(p)
            runs.append((time.perf_counter() - t) / len(probes_))
        return statistics.median(runs) * 1e6
    out["list"].append(round(time_it(lambda p: p in ids, list_probes), 4))
    out["set"].append(round(time_it(lambda p: p in s, probes), 4))
    out["dict"].append(round(time_it(lambda p: p in d, probes), 4))
    out["lookups"][str(n)] = {"list": kl, "set_dict": k}
print(json.dumps(out))
