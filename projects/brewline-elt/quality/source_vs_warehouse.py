"""The quality gate: checks that the warehouse agrees with the source, after the load and the dbt build of one day. Exits with 1 when a check fails.

Run:   python quality/source_vs_warehouse.py --day 2 --warehouse warehouse/brewline.duckdb
The day is the day of the run. The gate compares with the shop as of the newest day that the warehouse holds, so that a backfill of an old day does not fail for a good reason.
"""
import argparse
import pathlib
import sys

import duckdb

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / 'ingestion'))
import shop_api  # noqa: E402


def latest_day(con):
    """The newest day that the warehouse holds. A run for an old day (a backfill) must compare with the shop as of this day, because the warehouse is already there."""
    newest = con.sql('select max(cast(updated_at as date)) from raw.orders').fetchone()[0]
    return (newest - shop_api.DAY1.date()).days + 1


def run(day, warehouse):
    con = duckdb.connect(warehouse, read_only=True)
    day = max(day, latest_day(con))
    shop = shop_api.orders_on(day)
    checks = []

    def check(name, got, want):
        checks.append((name, got == want, got, want))

    raw_rows, raw_distinct = con.sql('select count(*), count(distinct id) from raw.orders').fetchone()
    check('raw.orders: rows equal distinct ids', raw_rows, raw_distinct)
    check('raw.orders: orders equal the orders of the shop', raw_distinct, len(shop))
    check('raw.orders: revenue equals the revenue of the shop', con.sql('select sum(total_cents) from raw.orders').fetchone()[0], sum(o['total_cents'] for o in shop.values()))
    check('fct_orders: one row for each order', con.sql('select count(*) from main.fct_orders').fetchone()[0], len(shop))
    check('fct_orders: revenue equals raw.orders', con.sql('select sum(total_cents) from main.fct_orders').fetchone()[0], con.sql('select sum(total_cents) from raw.orders').fetchone()[0])
    check('orders_daily: revenue equals the orders that were not refunded', con.sql('select sum(revenue_cents) from main.orders_daily').fetchone()[0],
          sum(o['total_cents'] for o in shop.values() if o['status'] != 'REFUNDED'))
    for name, ok, got, want in checks:
        print('%s %s: %s%s' % ('PASS' if ok else 'FAIL', name, got, '' if ok else ' (expected %s)' % want))
    return all(ok for _, ok, _, _ in checks)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--day', type=int, required=True)
    ap.add_argument('--warehouse', default='warehouse/brewline.duckdb')
    a = ap.parse_args()
    sys.exit(0 if run(a.day, a.warehouse) else 1)
