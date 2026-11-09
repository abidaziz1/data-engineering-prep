"""Create the RAW schema that the dbt project reads as its sources.
Usage: python3 setup_raw.py <path-to-duckdb-file>
The raw tables stand in for what an ingestion pipeline (see the Snowflake tutorial) would have loaded."""
import pathlib, sys
import duckdb

db = sys.argv[1]
raw = pathlib.Path(__file__).resolve().parent / 'raw'
con = duckdb.connect(db)
con.execute('create schema if not exists raw')
for t in ['orders', 'order_items', 'customers', 'products']:
    con.execute("create or replace table raw.%s as select * from read_csv_auto('%s')" % (t, raw / (t + '.csv')))
print('raw tables:', [r[0] for r in con.execute("select table_name from information_schema.tables where table_schema = 'raw' order by 1").fetchall()])
