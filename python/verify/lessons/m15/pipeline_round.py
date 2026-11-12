"""Coding round: one day of a pipeline, from pages to a table, with a limit on bad rows. Everything that touches the outside world is passed in."""


def run_day(pages, check, write, max_bad_share=0.1, batch_size=2):
    """pages is an iterator of lists of rows, like a cursor API. check(row) returns the cleaned row or raises ValueError(reason).
    write(rows) writes one batch, and is safe to repeat. Return {"read": n, "loaded": n, "quarantined": [(line, reason)], "batches": n}.
    Raise RuntimeError, before anything is written, when the share of bad rows is above max_bad_share. Line 1 is the header, so rows count from 2."""
    good, bad, line = [], [], 1
    for page in pages:
        for row in page:
            line += 1
            try:
                good.append(check(row))
            except ValueError as err:
                bad.append((line, str(err)))
    read = len(good) + len(bad)
    if read and len(bad) / read > max_bad_share:
        raise RuntimeError(f"{len(bad)} of {read} rows are bad")
    batches = 0
    for i in range(0, len(good), batch_size):
        write(good[i:i + batch_size])
        batches += 1
    return {"read": read, "loaded": len(good), "quarantined": bad, "batches": batches}


def check(row):
    if not str(row.get("qty", "")).isdigit() or int(row["qty"]) < 1:
        raise ValueError("qty must be a whole number from 1")
    return {"order_id": row["order_id"], "qty": int(row["qty"])}


def pages_of(rows, size=3):
    return iter([rows[i:i + size] for i in range(0, len(rows), size)])


rows = [{"order_id": f"O-{n}", "qty": "2"} for n in range(1, 11)]
rows[4]["qty"] = "0"
written = []
summary = run_day(pages_of(rows), check, written.append, max_bad_share=0.2, batch_size=4)
assert summary == {"read": 10, "loaded": 9, "quarantined": [(6, "qty must be a whole number from 1")], "batches": 3}
assert [len(b) for b in written] == [4, 4, 1] and written[0][0] == {"order_id": "O-1", "qty": 2}
print("one bad row of 10 under a limit of 20 percent:", summary["loaded"], "loaded in", summary["batches"], "batches, quarantined", summary["quarantined"])

written.clear()
rows[7]["qty"] = "x"
rows[8]["qty"] = ""
try:
    run_day(pages_of(rows), check, written.append, max_bad_share=0.2)
    raise AssertionError("3 bad rows of 10 must fail a 20 percent limit")
except RuntimeError as err:
    print("three bad rows of 10:", err, "- batches written:", len(written))
assert written == []

written.clear()
assert run_day(iter([]), check, written.append) == {"read": 0, "loaded": 0, "quarantined": [], "batches": 0} and written == []
print("no pages:", run_day(iter([]), check, written.append))
print("tests passed")
