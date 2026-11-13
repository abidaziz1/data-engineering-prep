"""The safe way to read a supplier CSV: say the encoding, pass newline="", and let utf-8-sig drop a byte order mark."""
import csv

with open("supplier.csv", newline="", encoding="utf-8-sig") as f:
    rows = list(csv.DictReader(f))

print("rows:", len(rows), " columns:", list(rows[0]))
print("customer of the first row:", rows[0]["customer"])
print("note of the second row:", repr(rows[1]["note"]))
print("total as money:", sum(float(r["total"]) for r in rows))
