"""A transaction: either both updates happen or neither does. SQLite, in memory."""
import sqlite3

conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE stock (store TEXT PRIMARY KEY, beans_kg INTEGER NOT NULL CHECK (beans_kg >= 0))")
conn.executemany("INSERT INTO stock VALUES (?, ?)", [("Singapore", 40), ("London", 10)])
conn.commit()


def levels():
    return dict(conn.execute("SELECT store, beans_kg FROM stock ORDER BY store"))


def move(kg, src, dst, use_transaction):
    try:
        if use_transaction:
            with conn:  # commits when the block ends, rolls back when it raises
                conn.execute("UPDATE stock SET beans_kg = beans_kg + ? WHERE store = ?", (kg, dst))
                conn.execute("UPDATE stock SET beans_kg = beans_kg - ? WHERE store = ?", (kg, src))
        else:
            conn.execute("UPDATE stock SET beans_kg = beans_kg + ? WHERE store = ?", (kg, dst))
            conn.commit()                         # the first update is saved on its own
            conn.execute("UPDATE stock SET beans_kg = beans_kg - ? WHERE store = ?", (kg, src))
            conn.commit()
    except sqlite3.IntegrityError as err:
        print("  error:", err)


print("start:", levels())
print("move 5 kg, London to Singapore, with a transaction (London has 10):")
move(5, "London", "Singapore", True)
print("  now:", levels())
print("move 30 kg, London to Singapore, with a transaction (London only has 5 left):")
move(30, "London", "Singapore", True)
print("  now:", levels())
print("the same move, with each update committed on its own:")
move(30, "London", "Singapore", False)
print("  now:", levels(), "-> total", sum(levels().values()), "kg, and it was 50")
