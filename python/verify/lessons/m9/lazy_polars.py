"""Polars can look at the whole query before it reads anything. explain() prints the plan."""
import polars as pl

query = (pl.scan_parquet("orders.parquet")
         .filter(pl.col("status") == "paid")
         .group_by("store").agg(pl.col("total_cents").sum().alias("cents"))
         .sort("cents", descending=True))
print(query.explain())
