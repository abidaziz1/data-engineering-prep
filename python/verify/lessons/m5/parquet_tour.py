"""What is inside a Parquet file: row groups, types and the minimum and maximum of each column."""
import datetime as dt
import random
from decimal import Decimal

import pyarrow as pa
import pyarrow.dataset as ds
import pyarrow.parquet as pq

rng = random.Random(42)  # made-up orders, the same on every machine
start = dt.datetime(2026, 3, 1)
rows = sorted(
    (f"O-{i:07d}", rng.choice(["SG-01", "SG-02", "KL-01", "JK-01"]), rng.choice(["paid", "paid", "paid", "cancelled"]),
     Decimal(rng.randint(350, 12000)) / 100, start + dt.timedelta(seconds=rng.randint(0, 31 * 86400 - 1)))
    for i in range(200_000)
)
rows.sort(key=lambda r: r[4])
table = pa.table({
    "order_id": [r[0] for r in rows],
    "store": [r[1] for r in rows],
    "status": [r[2] for r in rows],
    "total": pa.array([r[3] for r in rows], pa.decimal128(10, 2)),
    "ordered_at": pa.array([r[4] for r in rows], pa.timestamp("us")),
})
pq.write_table(table, "orders.parquet", row_group_size=50_000, compression="zstd")

f = pq.ParquetFile("orders.parquet")
print("rows:", f.metadata.num_rows, " row groups:", f.metadata.num_row_groups, " columns:", f.metadata.num_columns)
print(f.schema_arrow)
print()
print("row group  rows    first order_at        last order_at")
for g in range(f.metadata.num_row_groups):
    st = f.metadata.row_group(g).column(4).statistics
    print(f"{g:>9}  {f.metadata.row_group(g).num_rows:<6}  {st.min}  {st.max}")

dataset = ds.dataset("orders.parquet")
flt = ds.field("ordered_at") >= pa.scalar(dt.datetime(2026, 3, 30), pa.timestamp("us"))
fragment = next(iter(dataset.get_fragments()))
picked = list(fragment.split_by_row_group(filter=flt))
print(f"\nrows from 30 March on: the statistics select {len(picked)} of {f.metadata.num_row_groups} row groups to read")
print("one column only:", pq.read_table("orders.parquet", columns=["total"]).num_rows, "values, without reading the other four")
