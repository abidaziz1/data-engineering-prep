"""Made-up Brewline data for the Python course. Everything here is deterministic: the same seed gives the same rows on every machine."""
import csv
import datetime as dt
import random
from decimal import Decimal

STORES = ["SG-01", "SG-02", "KL-01", "JK-01", "BK-01"]
STATUSES = ["paid", "paid", "paid", "paid", "cancelled", "refunded"]


def orders(n, seed=42, start=dt.datetime(2026, 3, 1)):
    """Yield n order dicts. total is a Decimal with two places, ordered_at is a naive UTC datetime."""
    rng = random.Random(seed)
    for i in range(n):
        cents = rng.randint(350, 12000)
        yield {
            "order_id": "O-%07d" % (i + 1),
            "customer_id": "C-%04d" % rng.randint(1, 4000),
            "store": rng.choice(STORES),
            "status": rng.choice(STATUSES),
            "total": Decimal(cents) / 100,
            "ordered_at": start + dt.timedelta(seconds=rng.randint(0, 31 * 86400 - 1)),
            "items": rng.randint(1, 6),
        }


def write_csv(path, n, seed=42):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["order_id", "customer_id", "store", "status", "total", "ordered_at", "items"])
        for o in orders(n, seed):
            w.writerow([o["order_id"], o["customer_id"], o["store"], o["status"], o["total"], o["ordered_at"].strftime("%Y-%m-%d %H:%M:%S"), o["items"]])
    return path
