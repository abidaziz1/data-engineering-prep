"""One million numbers: a Python loop and the same sum as one column operation. Median of 5 runs each."""
import statistics
import time

import numpy as np
import pandas as pd

values = list(range(1_000_000))
arr = np.arange(1_000_000)
series = pd.Series(arr)


def loop():
    total = 0
    for v in values:
        total += v * 2
    return total


def comprehension():
    return sum([v * 2 for v in values])


def numpy_sum():
    return int((arr * 2).sum())


def pandas_sum():
    return int((series * 2).sum())


def median_ms(fn, runs=5):
    took = []
    for _ in range(runs):
        t0 = time.perf_counter()
        fn()
        took.append((time.perf_counter() - t0) * 1000)
    return statistics.median(took)


assert loop() == comprehension() == numpy_sum() == pandas_sum()
print(f"{'method':<28}{'milliseconds':>14}")
for name, fn in (("for loop", loop), ("list comprehension and sum", comprehension), ("numpy: (arr * 2).sum()", numpy_sum), ("pandas: (s * 2).sum()", pandas_sum)):
    print(f"{name:<28}{median_ms(fn):>14.1f}")
