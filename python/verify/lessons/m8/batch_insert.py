"""Four ways to write 5,000 rows into SQLite, in a file on disk. The timings come from the machine that runs this file."""
import os
import sqlite3
import statistics
import tempfile
import time

ROWS = [(f"O-{i}", "London" if i % 2 else "Singapore", 100 + i) for i in range(5000)]
SQL = "INSERT INTO orders VALUES (?, ?, ?)"


def commit_each(conn, rows):          # a transaction for every row
    for r in rows:
        conn.execute(SQL, r)
        conn.commit()


def one_transaction(conn, rows):      # one transaction, one execute for every row
    for r in rows:
        conn.execute(SQL, r)
    conn.commit()


def many(conn, rows):                 # one transaction, one executemany call
    conn.executemany(SQL, rows)
    conn.commit()


def batches(conn, rows, size=1000):   # executemany, and a commit for every 1,000 rows
    for i in range(0, len(rows), size):
        conn.executemany(SQL, rows[i:i + size])
        conn.commit()


METHODS = {"commit for every row": commit_each, "one transaction, execute in a loop": one_transaction, "one transaction, executemany": many, "executemany, commit every 1,000": batches}


def seconds(method, rows=ROWS):
    with tempfile.TemporaryDirectory() as folder:
        conn = sqlite3.connect(os.path.join(folder, "orders.db"))
        conn.execute("CREATE TABLE orders (order_id TEXT PRIMARY KEY, store TEXT, total_cents INTEGER)")
        conn.commit()
        t0 = time.perf_counter()
        METHODS[method](conn, rows)
        took = time.perf_counter() - t0
        assert conn.execute("SELECT count(*) FROM orders").fetchone()[0] == len(rows)
        conn.close()
        return took


if __name__ == "__main__":
    print(f"{'method':<38}{'seconds':>9}{'rows per second':>18}")
    for name in METHODS:
        s = statistics.median(seconds(name) for _ in range(3))
        print(f"{name:<38}{s:>9.3f}{len(ROWS) / s:>18,.0f}")
