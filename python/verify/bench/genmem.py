"""Peak memory of two ways to read a CSV of orders and add up the paid ones. Run: python genmem.py MODE PATH. One JSON line."""
import csv
import itertools
import json
import sys
import tracemalloc
from decimal import Decimal

mode, path = sys.argv[1], sys.argv[2]


def cents(r):
    return int(Decimal(r["total"]) * 100)


tracemalloc.start()
if mode == "list":
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    total = sum(cents(r) for r in rows if r["status"] == "paid")
    n = len(rows)
else:
    def read_rows(p):
        with open(p, newline="", encoding="utf-8") as f:
            yield from csv.DictReader(f)
    total = n = 0
    for batch in itertools.batched((r for r in read_rows(path)), 10_000):
        n += len(batch)
        total += sum(cents(r) for r in batch if r["status"] == "paid")
peak = tracemalloc.get_traced_memory()[1]
print(json.dumps({"mode": mode, "rows": n, "paid_cents": total, "peak_bytes": peak}))
