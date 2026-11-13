"""Putting a value into SQL with an f-string, and with a parameter. SQLite, in memory."""
import sqlite3

conn = sqlite3.connect(":memory:")
conn.executescript("""
CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT, city TEXT);
INSERT INTO customers (name, city) VALUES ('Ana Tan', 'Singapore'), ('Ben Lee', 'London'), ('Cy Park', 'London');
""")


def find_unsafe(name):
    sql = f"SELECT name, city FROM customers WHERE name = '{name}'"
    print("  sql:", sql)
    return conn.execute(sql).fetchall()


def find_safe(name):
    return conn.execute("SELECT name, city FROM customers WHERE name = ?", (name,)).fetchall()


print("a normal name, with an f-string:", find_unsafe("Ana Tan"))
print("a name with an apostrophe:")
try:
    find_unsafe("Conan O'Brien")
except sqlite3.OperationalError as err:
    print("  error:", err)
print("a name that changes the query:")
rows = find_unsafe("x' OR '1'='1")
print("  rows returned:", len(rows), "of", conn.execute("SELECT count(*) FROM customers").fetchone()[0])

print("the same two names, with a parameter:")
print("  Conan O'Brien ->", find_safe("Conan O'Brien"))
print("  x' OR '1'='1 ->", find_safe("x' OR '1'='1"))
