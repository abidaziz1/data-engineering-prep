"""Eight jobs, done one after another and at once. The waiting jobs sleep 0.25 s, which stands in for a network call.
The computing jobs add up numbers. Each time is the median of 3 runs on this machine."""
import asyncio
import os
import statistics
import sys
import time
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor


def wait_job(_):
    time.sleep(0.25)


async def wait_async(_):
    await asyncio.sleep(0.25)


def cpu_job(_):
    total = 0
    for i in range(3_000_000):
        total += i * i % 7
    return total


def one_after_another(fn):
    return [fn(i) for i in range(8)]


def with_threads(fn):
    with ThreadPoolExecutor(8) as pool:
        return list(pool.map(fn, range(8)))


def with_processes(fn):
    with ProcessPoolExecutor(4) as pool:
        return list(pool.map(fn, range(8)))


def with_asyncio():
    async def main():
        await asyncio.gather(*(wait_async(i) for i in range(8)))
    asyncio.run(main())


def seconds(run, repeats=3):
    took = []
    for _ in range(repeats):
        t0 = time.perf_counter()
        run()
        took.append(time.perf_counter() - t0)
    return statistics.median(took)


if __name__ == "__main__":
    print(f"GIL enabled: {sys._is_gil_enabled()}, cores: {os.cpu_count()}")
    print("eight jobs that wait 0.25 s")
    for name, run in (("one after another", lambda: one_after_another(wait_job)), ("8 threads", lambda: with_threads(wait_job)),
                      ("4 processes", lambda: with_processes(wait_job)), ("asyncio", with_asyncio)):
        print(f"  {name:<20}{seconds(run):>6.2f} s")
    print("eight jobs that compute")
    for name, run in (("one after another", lambda: one_after_another(cpu_job)), ("8 threads", lambda: with_threads(cpu_job)), ("4 processes", lambda: with_processes(cpu_job))):
        print(f"  {name:<20}{seconds(run):>6.2f} s")
