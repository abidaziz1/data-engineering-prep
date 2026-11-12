"""The same script, one day later: the file from the supplier has a bad value in row 3."""
import csv
import sqlite3

con = sqlite3.connect("warehouse.db")
con.execute("CREATE TABLE IF NOT EXISTS orders (order_id TEXT, customer_id TEXT, total REAL)")

loaded = 0
try:
    for r in csv.DictReader(open("later/orders_c.csv")):
        con.execute("INSERT INTO orders VALUES (?, ?, ?)", (r["order_id"], r["customer_id"], float(r["total"])))
        con.commit()
        loaded += 1
except ValueError as e:
    print("stopped:", e)

print("loaded", loaded, "of 4 rows before the stop")
print(con.execute("SELECT order_id FROM orders ORDER BY order_id").fetchall())
