"""Load one file of Brewline orders into Postgres. Running it twice does no harm."""
import csv
import os
import sys

import psycopg

SCHEMA = """
CREATE TABLE IF NOT EXISTS orders (
    order_id   integer PRIMARY KEY,
    store_id   text NOT NULL,
    order_date date NOT NULL,
    amount     numeric(10, 2) NOT NULL
)
"""


def read_rows(path):
    with open(path, newline="") as f:
        return [(int(r["order_id"]), r["store_id"], r["order_date"], r["amount"])
                for r in csv.DictReader(f)]


def main(path):
    rows = read_rows(path)
    with psycopg.connect(os.environ["DATABASE_URL"]) as con:
        con.execute(SCHEMA)
        with con.cursor() as cur:
            cur.executemany(
                "INSERT INTO orders VALUES (%s, %s, %s, %s) ON CONFLICT (order_id) DO NOTHING",
                rows)
        total = con.execute("SELECT count(*) FROM orders").fetchone()[0]
    print(f"read {len(rows)} rows from {path}, the table now has {total}")


if __name__ == "__main__":
    main(sys.argv[1])
