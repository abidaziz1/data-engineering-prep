"""Publishes the marts as Parquet files, for the tools that read the warehouse from files. Run after the quality gate has passed.

Run:   python quality/publish.py --warehouse warehouse/brewline.duckdb --out published
"""
import argparse
import os

import duckdb

ap = argparse.ArgumentParser()
ap.add_argument('--warehouse', default='warehouse/brewline.duckdb')
ap.add_argument('--out', default='published')
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
con = duckdb.connect(a.warehouse, read_only=True)
for table in ('orders_daily', 'fct_orders', 'dim_store'):
    path = os.path.join(a.out, table + '.parquet')
    con.sql("copy (select * from main.%s) to '%s' (format parquet)" % (table, path))
    print('published %s: %d rows' % (table, con.sql('select count(*) from main.%s' % table).fetchone()[0]))
