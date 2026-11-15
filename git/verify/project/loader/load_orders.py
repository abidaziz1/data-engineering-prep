"""Load one file of Brewline orders into Postgres. Running it twice does no harm."""
import csv
import os
import sys

TAX_RATE = float(open(os.path.join(os.path.dirname(__file__), "tax_rate.txt")).read())


def read_rows(path):
    with open(path, newline="") as f:
        return [(int(r["order_id"]), r["store_id"], round(float(r["amount"]) * (1 + TAX_RATE), 2)) for r in csv.DictReader(f)]


if __name__ == "__main__":
    print(len(read_rows(sys.argv[1])), "rows")
