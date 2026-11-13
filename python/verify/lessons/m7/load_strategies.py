"""Five ways to load one day of orders, and what each does when the job runs twice, crashes or sees a changed file."""
import sqlite3

DAY = "2026-03-14"
FILE = [("O-1", 1250), ("O-2", 475), ("O-3", 820), ("O-4", 1990), ("O-5", 3100), ("O-6", 640)]  # cents
CORRECTED = [("O-1", 1250), ("O-2", 475), ("O-3", 920), ("O-4", 1990), ("O-5", 3100), ("O-6", 640)]
CANCELLED = FILE[:5]  # O-6 is gone from the source file


class Crash(Exception):
    pass


def new_db(with_key):
    db = sqlite3.connect(":memory:", isolation_level=None)  # autocommit: we say BEGIN and COMMIT ourselves
    db.execute(f"CREATE TABLE orders (order_id TEXT {'PRIMARY KEY' if with_key else ''}, day TEXT, total_cents INTEGER)")
    return db


INSERT = "INSERT INTO orders VALUES (?, ?, ?)"
UPSERT = INSERT + " ON CONFLICT (order_id) DO UPDATE SET total_cents = excluded.total_cents"


def write(db, rows, sql, crash):
    for i, (order_id, cents) in enumerate(rows):
        if crash and i == 3:
            raise Crash("the job died after 3 rows")
        db.execute(sql, (order_id, DAY, cents))


def append(db, rows, crash):                  # a table with no key
    write(db, rows, INSERT, crash)


def insert_key(db, rows, crash):              # a table with a primary key
    write(db, rows, INSERT, crash)


def delete_insert(db, rows, crash):           # no transaction: every statement commits on its own
    db.execute("DELETE FROM orders WHERE day = ?", (DAY,))
    write(db, rows, INSERT, crash)


def delete_insert_tx(db, rows, crash):        # one transaction: all of it, or none of it
    db.execute("BEGIN")
    try:
        db.execute("DELETE FROM orders WHERE day = ?", (DAY,))
        write(db, rows, INSERT, crash)
        db.execute("COMMIT")
    except Exception:
        db.execute("ROLLBACK")
        raise


def upsert(db, rows, crash):                  # a key, and ON CONFLICT DO UPDATE
    write(db, rows, UPSERT, crash)


STRATEGIES = {
    "append": (append, False),
    "insert with a key": (insert_key, True),
    "delete, then insert": (delete_insert, True),
    "delete, then insert, in a transaction": (delete_insert_tx, True),
    "upsert": (upsert, True),
}
SCENARIOS = {  # what happens to the job, in order
    "run once": [("run", FILE)],
    "run twice": [("run", FILE), ("run", FILE)],
    "crash, then run again": [("crash", FILE), ("run", FILE)],
    "the source corrects O-3": [("run", FILE), ("run", CORRECTED)],
    "the source drops O-6": [("run", FILE), ("run", CANCELLED)],
}
TRUTH = {"run once": FILE, "run twice": FILE, "crash, then run again": FILE, "the source corrects O-3": CORRECTED, "the source drops O-6": CANCELLED}


def state(db):
    return db.execute("SELECT order_id, total_cents FROM orders ORDER BY order_id, total_cents").fetchall()


def play(strategy, scenario):
    fn, with_key = STRATEGIES[strategy]
    db = new_db(with_key)
    runs = []
    for kind, rows in SCENARIOS[scenario]:
        try:
            fn(db, rows, kind == "crash")
            outcome = "finished"
        except Crash as err:
            outcome = f"crashed: {err}"
        except sqlite3.IntegrityError as err:
            outcome = f"failed: {err}"
        runs.append({"outcome": outcome, "rows": len(state(db)), "cents": sum(c for _, c in state(db))})
    final = state(db)
    want = sorted(TRUTH[scenario])
    return {"runs": runs, "final": final, "right": final == want, "want_rows": len(want), "want_cents": sum(c for _, c in want)}


if __name__ == "__main__":
    for scenario in SCENARIOS:
        print(scenario)
        for strategy in STRATEGIES:
            r = play(strategy, scenario)
            last = r["runs"][-1]
            verdict = "right" if r["right"] else "WRONG"
            print(f"  {strategy:<40} {last['rows']} rows, {last['cents'] / 100:7.2f}  {verdict}")
