"""The same question in pandas, Polars and DuckDB: paid revenue for each store, biggest first. Two million made-up orders."""
import duckdb
import numpy as np
import pandas as pd
import polars as pl

rng = np.random.default_rng(7)
n = 2_000_000
pd.DataFrame({
    "order_id": np.arange(n),
    "store": rng.choice(["London", "Singapore", "Sydney", "Mumbai", "Dubai", "Paris", "Tokyo", "Lagos"], n),
    "status": rng.choice(["paid", "paid", "paid", "refunded", "cancelled"], n),
    "total_cents": rng.integers(300, 4000, n),
}).to_parquet("orders.parquet")


def with_pandas():
    df = pd.read_parquet("orders.parquet", columns=["store", "status", "total_cents"])
    paid = df[df["status"] == "paid"]
    return paid.groupby("store")["total_cents"].agg(["sum", "count"]).sort_values("sum", ascending=False)


def with_polars():
    return (pl.scan_parquet("orders.parquet").filter(pl.col("status") == "paid")
            .group_by("store").agg(pl.col("total_cents").sum().alias("sum"), pl.col("total_cents").count().alias("count"))
            .sort("sum", descending=True).collect())


def with_duckdb():
    return duckdb.sql("""SELECT store, sum(total_cents) AS "sum", count(*) AS "count" FROM 'orders.parquet'
                         WHERE status = 'paid' GROUP BY store ORDER BY "sum" DESC""").fetchall()


a = [(store, int(r["sum"]), int(r["count"])) for store, r in with_pandas().iterrows()]
b = [tuple(r) for r in with_polars().iter_rows()]
c = with_duckdb()
print("same answer from all three:", a == b == c)
for store, cents, count in a[:3]:
    print(f"  {store:<10}{count:>9,} paid orders{cents / 100:>14,.2f}")
