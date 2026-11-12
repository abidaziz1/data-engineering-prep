"""The shell: it reads the file, calls the core, and writes the result. It decides nothing about the data."""
import csv
import sqlite3
import sys

from core import daily_totals, parse_order


def main(path, db_path):
    with open(path) as f:
        orders = [parse_order(row) for row in csv.DictReader(f)]
    totals = daily_totals(orders)
    conn = sqlite3.connect(db_path)
    conn.execute("CREATE TABLE IF NOT EXISTS daily (store TEXT, day TEXT, cents INTEGER)")
    conn.executemany("INSERT INTO daily VALUES (?, ?, ?)", totals)
    conn.commit()
    print(f"wrote {len(totals)} rows to {db_path}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
