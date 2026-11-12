"""Coding round: a retry function that retries only what is worth retrying, and that tests can run without waiting."""
import random


class Transient(Exception):
    pass


def call_with_retry(fn, *, retry_on=(Transient,), attempts=4, base=0.5, cap=8.0, sleep, rng):
    """Call fn(). On an exception in retry_on, wait a random time between 0 and min(cap, base * 2 ** (n - 1)) and try again.
    Give up after `attempts` calls and raise the last error. Any other exception is raised at once."""
    for attempt in range(1, attempts + 1):
        try:
            return fn()
        except retry_on:
            if attempt == attempts:
                raise
            sleep(rng.uniform(0, min(cap, base * 2 ** (attempt - 1))))


class Upper:
    """A stand-in for random: always picks the top of the range, so the waits are the bounds themselves."""
    def uniform(self, a, b):
        return b


class Script:
    """A function that raises the given errors, one for each call, then returns "ok"."""
    def __init__(self, *errors):
        self.errors, self.calls = list(errors), 0

    def __call__(self):
        self.calls += 1
        if self.errors:
            raise self.errors.pop(0)
        return "ok"


waits = []
fn = Script(Transient("503"), Transient("503"))
assert call_with_retry(fn, sleep=waits.append, rng=random.Random(7)) == "ok" and fn.calls == 3
assert len(waits) == 2 and 0 <= waits[0] <= 0.5 and 0 <= waits[1] <= 1.0
print("fails twice, then works:", fn.calls, "calls, waits", [round(w, 2) for w in waits])

waits = []
fn = Script(ValueError("400"))
try:
    call_with_retry(fn, sleep=waits.append, rng=random.Random(7))
    raise AssertionError("a ValueError must not be swallowed")
except ValueError:
    pass
assert fn.calls == 1 and waits == []
print("a ValueError is not retried:", fn.calls, "call, no waits")

waits = []
fn = Script(*[Transient(f"503 #{i}") for i in range(10)])
try:
    call_with_retry(fn, sleep=waits.append, rng=random.Random(7))
    raise AssertionError("it must give up")
except Transient as err:
    assert str(err) == "503 #3" and fn.calls == 4 and len(waits) == 3
print("always fails: gave up after", fn.calls, "calls, with the last error")

waits = []
fn = Script(*[Transient("503") for _ in range(7)])
assert call_with_retry(fn, attempts=8, sleep=waits.append, rng=Upper()) == "ok"
assert waits == [0.5, 1.0, 2.0, 4.0, 8.0, 8.0, 8.0], waits
print("the longest waits, with the cap at 8 s:", waits)
print("tests passed")
