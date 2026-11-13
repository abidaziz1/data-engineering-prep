"""A join that multiplies rows: the customer table has two rows for customer 3. The same join in pandas, Polars and DuckDB."""
import duckdb
import pandas as pd
import polars as pl

orders = pd.DataFrame({"order_id": ["O-1", "O-2", "O-3", "O-4", "O-5", "O-6"], "customer_id": [1, 2, 2, 3, 1, 3], "total_cents": [1250, 475, 820, 1990, 3100, 640]})
customers = pd.DataFrame({"customer_id": [1, 2, 3, 3], "city": ["London", "London", "Singapore", "Singapore"]})  # 3 appears twice, like a history table

print("orders:", len(orders), "rows, total", orders["total_cents"].sum(), "cents")

merged = orders.merge(customers, on="customer_id", how="left")
print("pandas  left join:", len(merged), "rows, total", merged["total_cents"].sum(), "cents")

joined = pl.from_pandas(orders).join(pl.from_pandas(customers), on="customer_id", how="left")
print("polars  left join:", joined.height, "rows, total", joined["total_cents"].sum(), "cents")

row = duckdb.sql("SELECT count(*), sum(total_cents) FROM orders LEFT JOIN customers USING (customer_id)").fetchall()[0]
print("duckdb  left join:", row[0], "rows, total", row[1], "cents")

print("who is repeated:", merged[merged["order_id"].duplicated(keep=False)]["order_id"].tolist())

try:
    orders.merge(customers, on="customer_id", how="left", validate="m:1")
except Exception as err:
    print("pandas  validate m:1 ->", type(err).__name__ + ":", err)
try:
    pl.from_pandas(orders).join(pl.from_pandas(customers), on="customer_id", how="left", validate="m:1")
except Exception as err:
    print("polars  validate m:1 ->", type(err).__name__ + ":", err)
print("duckdb  has no validate. Check the key yourself:",
      duckdb.sql("SELECT customer_id, count(*) AS rows FROM customers GROUP BY customer_id HAVING count(*) > 1").fetchall())

fixed = orders.merge(customers.drop_duplicates("customer_id"), on="customer_id", how="left", validate="m:1")
print("after drop_duplicates and validate m:1:", len(fixed), "rows, total", fixed["total_cents"].sum(), "cents")
