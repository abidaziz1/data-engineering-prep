"""An incremental load with a watermark: what it loses when it is saved too early, and when a row arrives late."""
import sqlite3
from datetime import datetime, timedelta

COLS = "order_id TEXT PRIMARY KEY, total_cents INTEGER, updated_at TEXT"
UPSERT = ("INSERT INTO orders VALUES (?, ?, ?) ON CONFLICT (order_id) DO UPDATE "
          "SET total_cents = excluded.total_cents, updated_at = excluded.updated_at")


def make(*rows):
    src = sqlite3.connect(":memory:", isolation_level=None)
    dst = sqlite3.connect(":memory:", isolation_level=None)
    for db in (src, dst):
        db.execute(f"CREATE TABLE orders ({COLS})")
    src.executemany("INSERT INTO orders VALUES (?, ?, ?)", rows)
    return src, dst, {"watermark": "2026-03-14 00:00"}


def rows(n):
    return f"{n} row" + ("" if n == 1 else "s")


def count(db):
    return db.execute("SELECT count(*) FROM orders").fetchone()[0]


def load(src, dst, state, overlap=0, save_first=False, crash=False):
    since = datetime.fromisoformat(state["watermark"]) - timedelta(minutes=overlap)
    rows = src.execute("SELECT * FROM orders WHERE updated_at > ? ORDER BY updated_at", (f"{since:%Y-%m-%d %H:%M}",)).fetchall()
    if rows and save_first:
        state["watermark"] = rows[-1][2]  # saved before the rows are written
    if crash:
        raise RuntimeError("the job died before writing")
    dst.executemany(UPSERT, rows)
    if rows and not save_first:
        state["watermark"] = max(state["watermark"], rows[-1][2])  # saved after the rows are written
    return len(rows)


print("1. the watermark is saved first, then the job dies")
src, dst, state = make(("O-1", 1250, "2026-03-14 08:00"), ("O-2", 475, "2026-03-14 08:05"), ("O-3", 820, "2026-03-14 08:10"))
try:
    load(src, dst, state, save_first=True, crash=True)
except RuntimeError as err:
    print("   run 1:", err, "| watermark is now", state["watermark"])
print("   run 2 reads", rows(load(src, dst, state, save_first=True)) + "; the target has", count(dst), "of 3")

print("2. the watermark is saved after the rows are written")
src, dst, state = make(("O-1", 1250, "2026-03-14 08:00"), ("O-2", 475, "2026-03-14 08:05"), ("O-3", 820, "2026-03-14 08:10"))
try:
    load(src, dst, state, crash=True)
except RuntimeError as err:
    print("   run 1:", err, "| watermark is still", state["watermark"])
print("   run 2 reads", rows(load(src, dst, state)) + "; the target has", count(dst), "of 3")

print("3. a row arrives late: a slow writer commits updated_at 08:07 after the load has passed 08:10")
for overlap in (0, 15):
    src, dst, state = make(("O-1", 1250, "2026-03-14 08:00"), ("O-3", 820, "2026-03-14 08:10"))
    load(src, dst, state, overlap=overlap)
    src.execute("INSERT INTO orders VALUES ('O-4', 640, '2026-03-14 08:07')")  # late, with an old timestamp
    src.execute("INSERT INTO orders VALUES ('O-5', 3100, '2026-03-14 08:20')")
    n = load(src, dst, state, overlap=overlap)
    print(f"   overlap {overlap:>2} min: run 2 reads {rows(n)}; the target has {count(dst)} of 4")
