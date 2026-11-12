"""Measure first. A slow report, a profile that names the hot spot, a one-line fix, and the same run again."""
import cProfile
import pstats
import statistics
import time

STORES = [f"S-{n:04d}" for n in range(5000)]
ROWS = [(f"O-{i}", STORES[(i * 37) % 5000], 100 + i % 900) for i in range(20_000)]


def is_known(store, known):
    return store in known


def report(rows, known):
    totals = {}
    for order_id, store, cents in rows:
        if is_known(store, known):
            totals[store] = totals.get(store, 0) + cents
    return totals


def seconds(known, runs=3):
    took = []
    for _ in range(runs):
        t0 = time.perf_counter()
        report(ROWS, known)
        took.append(time.perf_counter() - t0)
    return statistics.median(took)


profile = cProfile.Profile()
profile.runcall(report, ROWS, STORES)  # `known` is a list of 5,000 store ids
pstats.Stats(profile).strip_dirs().sort_stats("tottime").print_stats(3)

print(f"known is a list: {seconds(STORES):.3f} s")
print(f"known is a set:  {seconds(set(STORES)):.4f} s")
