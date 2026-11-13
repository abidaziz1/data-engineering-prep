"""One function that does everything: it reads a file, cleans rows, adds them up, writes to a database and prints. It works, and it is hard to test."""
import csv
import sqlite3
from datetime import datetime


def run(path, db_path):
    conn = sqlite3.connect(db_path)
    conn.execute("CREATE TABLE IF NOT EXISTS daily (store TEXT, day TEXT, cents INTEGER)")
    totals = {}
    with open(path) as f:
        for row in csv.DictReader(f):
            if row["status"] != "paid":
                continue
            store = row["store"].strip().title()
            day = datetime.fromisoformat(row["ordered_at"]).date().isoformat()
            totals[(store, day)] = totals.get((store, day), 0) + int(row["total_cents"])
    for (store, day), cents in sorted(totals.items()):
        conn.execute("INSERT INTO daily VALUES (?, ?, ?)", (store, day, cents))
    conn.commit()
    print(f"wrote {len(totals)} rows to {db_path}")
