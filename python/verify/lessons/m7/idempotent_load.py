"""Coding round: load one day of orders so that running it twice, or after a crash, leaves the same table."""
import sqlite3


def load_day(db, day, rows):
    """Replace the orders of `day` with `rows`, a list of (order_id, total_cents). All or nothing. Returns the rows written."""
    db.execute("BEGIN")
    try:
        db.execute("DELETE FROM orders WHERE day = ?", (day,))
        db.executemany("INSERT INTO orders (order_id, day, total_cents) VALUES (?, ?, ?)", [(i, day, c) for i, c in rows])
        db.execute("COMMIT")
    except Exception:
        db.execute("ROLLBACK")
        raise
    return len(rows)


def table(db):
    return db.execute("SELECT order_id, day, total_cents FROM orders ORDER BY day, order_id").fetchall()


db = sqlite3.connect(":memory:", isolation_level=None)
db.execute("CREATE TABLE orders (order_id TEXT PRIMARY KEY, day TEXT NOT NULL, total_cents INTEGER NOT NULL)")
monday = [("O-1", 1250), ("O-2", 475)]
tuesday = [("O-3", 820), ("O-4", 1990), ("O-5", 3100)]

load_day(db, "2026-03-09", monday)
load_day(db, "2026-03-10", tuesday)
once = table(db)
print("Monday and Tuesday loaded:", len(once), "rows")

load_day(db, "2026-03-10", tuesday)
assert table(db) == once, "the second run changed the table"
print("Tuesday loaded again:", len(table(db)), "rows, the same table")

try:
    load_day(db, "2026-03-10", [("O-3", 820), ("O-4", None)])  # None breaks NOT NULL halfway through
except sqlite3.IntegrityError as err:
    print("a run that fails halfway:", err)
assert table(db) == once, "a failed run changed the table"
print("after the failed run:", len(table(db)), "rows, the same table")

load_day(db, "2026-03-10", [("O-3", 920), ("O-4", 1990)])  # the source corrected O-3 and dropped O-5
after = table(db)
assert [r for r in after if r[1] == "2026-03-09"] == [r for r in once if r[1] == "2026-03-09"], "Monday changed"
assert [r[0] for r in after if r[1] == "2026-03-10"] == ["O-3", "O-4"], "Tuesday did not follow the file"
print("a corrected Tuesday:", len(after), "rows, Monday untouched")
print("tests passed")
