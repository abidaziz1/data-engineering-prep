"""load_orders_v8.py: the same job, written so that running it twice gives the same table."""
import csv
import glob
import sqlite3
from decimal import Decimal

con = sqlite3.connect("warehouse.db")
con.execute("""CREATE TABLE IF NOT EXISTS orders (
    order_id TEXT PRIMARY KEY, customer_id TEXT, total_cents INTEGER, ordered_at TEXT)""")

def read_orders(pattern):
    for path in sorted(glob.glob(pattern)):
        with open(path, newline="", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                yield (r["order_id"], r["customer_id"], int(Decimal(r["total"]) * 100), r["ordered_at"])

with con:  # one transaction: all rows or none
    con.executemany(
        "INSERT INTO orders VALUES (?, ?, ?, ?) "
        "ON CONFLICT(order_id) DO UPDATE SET customer_id = excluded.customer_id, "
        "total_cents = excluded.total_cents, ordered_at = excluded.ordered_at",
        read_orders("incoming/orders_[ab].csv"))

print(con.execute("SELECT count(*), count(DISTINCT order_id), sum(total_cents) FROM orders").fetchone())
