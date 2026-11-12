"""load_orders_v7.py: the script that Brewline runs from cron. It works on the laptop where it was written."""
import csv
import datetime
import glob
import sqlite3

con = sqlite3.connect("warehouse.db")
con.execute("CREATE TABLE IF NOT EXISTS orders (order_id TEXT, customer_id TEXT, total REAL, day TEXT)")

rows = []
for path in glob.glob("incoming/*.csv"):
    for r in csv.DictReader(open(path)):
        r["total"] = float(r["total"])
        r["day"] = str(datetime.date.today())
        rows.append(r)

for r in rows:
    con.execute("INSERT INTO orders VALUES (?, ?, ?, ?)", (r["order_id"], r["customer_id"], r["total"], r["day"]))
con.commit()

print("loaded", len(rows), "rows")
print(con.execute("SELECT count(*), count(DISTINCT order_id), round(sum(total), 2) FROM orders").fetchone())
print(con.execute("SELECT count(DISTINCT day) FROM orders").fetchone())
