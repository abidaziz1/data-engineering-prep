"""One pass over a CSV file of orders, in small steps, with the memory that Python used."""
import csv
import itertools
import sys
import tracemalloc
from decimal import Decimal


def read_rows(path):
    with open(path, newline="", encoding="utf-8") as f:
        yield from csv.DictReader(f)


def parse(rows):
    for r in rows:
        yield {"order_id": r["order_id"], "store": r["store"], "status": r["status"], "cents": int(Decimal(r["total"]) * 100)}


def paid(rows):
    return (r for r in rows if r["status"] == "paid")


def batches(rows, size):
    return itertools.batched(rows, size)


tracemalloc.start()
rows_in_batches = batches(paid(parse(read_rows(sys.argv[1]))), 10_000)
total_cents = orders = batch_count = 0
for batch in rows_in_batches:
    total_cents += sum(r["cents"] for r in batch)
    orders += len(batch)
    batch_count += 1
peak = tracemalloc.get_traced_memory()[1]

print(f"paid orders: {orders:,} in {batch_count} batches")
print(f"paid revenue: {total_cents / 100:,.2f}")
print(f"peak memory held by Python: {peak / 1e6:.2f} MB")
