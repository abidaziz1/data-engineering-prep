"""A retry loop with exponential backoff and full jitter.
Time and randomness are passed in, so this file runs in a fraction of a second and a test never waits."""
import random


class Transient(Exception):
    """A failure that a second try can fix: a timeout, a 429, a 503."""


def delay_for(attempt, base=0.5, cap=8.0, rng=random):
    """Full jitter: a random wait between 0 and min(cap, base * 2 ** (attempt - 1))."""
    return rng.uniform(0, min(cap, base * 2 ** (attempt - 1)))


def retry(fn, *, attempts=5, sleep, rng):
    for attempt in range(1, attempts + 1):
        try:
            return fn()
        except Transient as err:
            if attempt == attempts:
                raise
            wait = delay_for(attempt, rng=rng)
            print(f"  attempt {attempt} failed ({err}); waiting {wait:.2f} s")
            sleep(wait)


class Flaky:
    """Fails the first `failures` calls, then works."""

    def __init__(self, failures):
        self.failures, self.calls = failures, 0

    def __call__(self):
        self.calls += 1
        if self.calls <= self.failures:
            raise Transient("503 from the API")
        return "orders page 1"


slept = []
print("an API that fails 3 times, then works:")
api = Flaky(3)
print("  result:", retry(api, sleep=slept.append, rng=random.Random(7)), "after", api.calls, "calls")
print(f"  total wait: {sum(slept):.2f} s (a fake clock, so nothing really waited)")

print("an API that fails every time:")
slept.clear()
try:
    retry(Flaky(99), sleep=slept.append, rng=random.Random(7))
except Transient as err:
    print("  gave up after", len(slept) + 1, "calls with:", err)

print("the most a wait can last, by attempt:", [min(8.0, 0.5 * 2 ** n) for n in range(5)])
