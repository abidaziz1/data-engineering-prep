"""Coding round: write many rows in batches, safe to run twice. SQLite, in memory."""
import sqlite3
from itertools import batched


def upsert_orders(conn, rows, batch_size=1000):
    """rows are (order_id, store, total_cents). Insert new orders and update the ones that exist. One transaction for each batch.
    Return the number of batches written."""
    sql = ("INSERT INTO orders (order_id, store, total_cents) VALUES (?, ?, ?) "
           "ON CONFLICT (order_id) DO UPDATE SET store = excluded.store, total_cents = excluded.total_cents")
    n = 0
    for chunk in batched(rows, batch_size):
        with conn:
            conn.executemany(sql, chunk)
        n += 1
    return n


conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE orders (order_id TEXT PRIMARY KEY, store TEXT NOT NULL, total_cents INTEGER NOT NULL)")
rows = [(f"O-{i}", "London" if i % 2 else "Singapore", 100 + i) for i in range(2500)]

n = upsert_orders(conn, rows, batch_size=1000)
count = lambda: conn.execute("SELECT count(*), sum(total_cents) FROM orders").fetchone()
assert n == 3 and count() == (2500, sum(r[2] for r in rows))
print("2,500 rows in batches of 1,000:", n, "batches,", count()[0], "rows")

upsert_orders(conn, rows, batch_size=1000)
assert count() == (2500, sum(r[2] for r in rows))
print("run again:", count()[0], "rows, the same total")

changed = [("O-0", "Singapore", 9999)] + rows[1:]
upsert_orders(conn, changed, batch_size=1000)
assert conn.execute("SELECT total_cents FROM orders WHERE order_id = 'O-0'").fetchone() == (9999,) and count()[0] == 2500
print("one changed row: updated in place, still", count()[0], "rows")

bad = rows[:3] + [("O-9000", None, 1)]
try:
    upsert_orders(conn, bad, batch_size=2)
except sqlite3.IntegrityError as err:
    print("a bad row in the second batch:", err)
assert conn.execute("SELECT count(*) FROM orders WHERE order_id = 'O-9000'").fetchone() == (0,)
print("tests passed")
