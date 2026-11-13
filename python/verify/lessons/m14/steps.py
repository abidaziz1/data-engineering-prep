"""Coding round: a pipeline as a list of named steps. The runner times each step, stops at the first failure and says which step failed."""


def run_pipeline(steps, ctx, log, clock):
    """steps is a list of (name, function). Each function takes the result of the step before it (the first takes ctx) and returns its own result.
    log(text) is called once for each step: "step NAME: ok in X.X s", or "step NAME: FAILED after X.X s: ErrorName: message" for the step that raised.
    Stop at the first failure. Return 0 when every step worked and 1 when one failed. clock() returns the time in seconds."""
    for name, fn in steps:
        start = clock()
        try:
            ctx = fn(ctx)
        except Exception as err:
            log(f"step {name}: FAILED after {clock() - start:.1f} s: {type(err).__name__}: {err}")
            return 1
        log(f"step {name}: ok in {clock() - start:.1f} s")
    return 0


def fake_clock(*times):
    it = iter(times)
    return lambda: next(it)


def need_rows(rows):
    if not rows:
        raise ValueError("no rows to load")
    return rows


lines = []
steps = [("extract", lambda ctx: [1, 2, 3]), ("validate", need_rows), ("load", lambda rows: len(rows))]
code = run_pipeline(steps, None, lines.append, fake_clock(0.0, 0.4, 0.4, 0.5, 0.5, 2.0))
assert code == 0 and lines == ["step extract: ok in 0.4 s", "step validate: ok in 0.1 s", "step load: ok in 1.5 s"], lines
print("all steps worked, exit code", code, "-", lines)

lines.clear()
steps = [("extract", lambda ctx: []), ("validate", need_rows), ("load", lambda rows: len(rows))]
code = run_pipeline(steps, None, lines.append, fake_clock(0.0, 0.2, 0.2, 0.3, 9.9))
assert code == 1 and lines == ["step extract: ok in 0.2 s", "step validate: FAILED after 0.1 s: ValueError: no rows to load"], lines
print("the second step failed, exit code", code, "-", lines)
assert not any(line.startswith("step load") for line in lines)
print("the third step never ran")
print("tests passed")
