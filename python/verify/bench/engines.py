"""One engine, one query, one fresh process: how long it takes and how much memory it adds. Usage: engines.py ENGINE PARQUET_FILE"""
import json
import resource
import sys
import time

engine, path = sys.argv[1], sys.argv[2]
if engine.startswith('pandas'):
    import pandas as pd
elif engine.startswith('polars'):
    import polars as pl
else:
    import duckdb


def run():
    if engine == 'pandas':
        df = pd.read_parquet(path, columns=['store', 'status', 'total_cents'])
        return df[df['status'] == 'paid'].groupby('store')['total_cents'].agg(['sum', 'count']).sort_values('sum', ascending=False)
    if engine == 'polars lazy':
        return (pl.scan_parquet(path).filter(pl.col('status') == 'paid').group_by('store').agg(pl.col('total_cents').sum().alias('sum'), pl.col('total_cents').count().alias('count')).sort('sum', descending=True).collect())
    if engine == 'polars eager':
        df = pl.read_parquet(path, columns=['store', 'status', 'total_cents'])
        return df.filter(pl.col('status') == 'paid').group_by('store').agg(pl.col('total_cents').sum().alias('sum'), pl.col('total_cents').count().alias('count')).sort('sum', descending=True)
    return duckdb.sql(f"SELECT store, sum(total_cents) AS \"sum\", count(*) AS \"count\" FROM '{path}' WHERE status = 'paid' GROUP BY store ORDER BY \"sum\" DESC").fetchall()


before = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
t0 = time.perf_counter()
run()
took = time.perf_counter() - t0
after = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
print(json.dumps({'seconds': took, 'extra_mb': (after - before) / 1024, 'peak_mb': after / 1024}))
