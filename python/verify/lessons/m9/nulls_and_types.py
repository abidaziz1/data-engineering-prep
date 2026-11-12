"""Missing values in pandas, Polars and DuckDB: what counts, what sums and what groups."""
import duckdb
import pandas as pd
import polars as pl

data = {"order_id": ["O-1", "O-2", "O-3", "O-4"], "total": [12.5, None, 8.2, None], "store": ["London", "London", None, "Singapore"]}

p = pd.DataFrame(data)
print("pandas  dtypes:", {k: str(v) for k, v in p.dtypes.items()})
print("pandas  rows:", len(p), " count of total:", p["total"].count(), " sum:", p["total"].sum(), " mean:", round(p["total"].mean(), 2))
print("pandas  NaN == NaN:", p["total"][1] == p["total"][1], " isna:", p["total"].isna().tolist())
print("pandas  rows per store:", p.groupby("store").size().to_dict(), "(the missing store is dropped)")
print("pandas  with dropna=False:", p.groupby("store", dropna=False).size().to_dict())

q = pl.DataFrame(data)
print("polars  dtypes:", {k: str(v) for k, v in q.schema.items()})
print("polars  rows:", q.height, " count of total:", q["total"].count(), " null_count:", q["total"].null_count(), " sum:", q["total"].sum(), " mean:", round(q["total"].mean(), 2))
print("polars  rows per store:", dict(q.group_by("store").len().sort("store", nulls_last=True).iter_rows()))

print("duckdb  rows per store:", dict(duckdb.sql("SELECT store, count(*) FROM p GROUP BY store ORDER BY store NULLS LAST").fetchall()))
print("duckdb  count(*), count(total), sum, avg:", duckdb.sql("SELECT count(*), count(total), sum(total), round(avg(total), 2) FROM p").fetchall()[0])
