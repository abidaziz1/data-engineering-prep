"""The same 200,000 orders in seven file formats: sizes, and the time of one DuckDB query over each. Prints one JSON object."""
import csv
import datetime as dt
import gzip
import json
import os
import pathlib
import random
import statistics
import sys
import time
from compression import zstd
from decimal import Decimal

import duckdb
import pyarrow as pa
import pyarrow.parquet as pq

out = pathlib.Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
N = 200_000
rng = random.Random(42)
start = dt.datetime(2026, 3, 1)
rows = [
    ("O-%07d" % i, "C-%04d" % rng.randint(1, 4000), rng.choice(["SG-01", "SG-02", "KL-01", "JK-01", "BK-01"]), rng.choice(["paid", "paid", "paid", "paid", "cancelled", "refunded"]),
     Decimal(rng.randint(350, 12000)) / 100, start + dt.timedelta(seconds=rng.randint(0, 31 * 86400 - 1)), rng.randint(1, 6))
    for i in range(N)
]
cols = ["order_id", "customer_id", "store", "status", "total", "ordered_at", "items"]

csv_path = out / "orders.csv"
with open(csv_path, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(cols)
    for r in rows:
        w.writerow([r[0], r[1], r[2], r[3], r[4], r[5].strftime("%Y-%m-%d %H:%M:%S"), r[6]])
raw = csv_path.read_bytes()
with gzip.open(out / "orders.csv.gz", "wb", compresslevel=6) as f:
    f.write(raw)
with zstd.open(out / "orders.csv.zst", "wb") as f:
    f.write(raw)

jl = "".join(json.dumps(dict(zip(cols, [r[0], r[1], r[2], r[3], float(r[4]), r[5].strftime("%Y-%m-%d %H:%M:%S"), r[6]]))) + "\n" for r in rows).encode()
(out / "orders.jsonl").write_bytes(jl)
with gzip.open(out / "orders.jsonl.gz", "wb", compresslevel=6) as f:
    f.write(jl)

table = pa.table({
    "order_id": [r[0] for r in rows], "customer_id": [r[1] for r in rows], "store": [r[2] for r in rows], "status": [r[3] for r in rows],
    "total": pa.array([r[4] for r in rows], pa.decimal128(10, 2)), "ordered_at": pa.array([r[5] for r in rows], pa.timestamp("us")), "items": pa.array([r[6] for r in rows], pa.int8()),
})
pq.write_table(table, out / "orders_snappy.parquet", compression="snappy", row_group_size=100_000)
pq.write_table(table, out / "orders_zstd.parquet", compression="zstd", row_group_size=100_000)

FORMATS = [
    ("CSV", "orders.csv", "read_csv('{p}')"),
    ("CSV, gzip", "orders.csv.gz", "read_csv('{p}')"),
    ("CSV, zstd", "orders.csv.zst", "read_csv('{p}')"),
    ("JSON Lines", "orders.jsonl", "read_json('{p}', format='newline_delimited')"),
    ("JSON Lines, gzip", "orders.jsonl.gz", "read_json('{p}', format='newline_delimited')"),
    ("Parquet, snappy", "orders_snappy.parquet", "read_parquet('{p}')"),
    ("Parquet, zstd", "orders_zstd.parquet", "read_parquet('{p}')"),
]
con = duckdb.connect()
result = []
expected = None
for label, name, reader in FORMATS:
    p = out / name
    sql = "SELECT sum(total) FROM " + reader.format(p=p)
    runs = []
    for _ in range(5):
        t = time.perf_counter()
        v = con.execute(sql).fetchone()[0]
        runs.append(time.perf_counter() - t)
    total = float(v)
    expected = expected if expected is not None else total
    assert abs(total - expected) < 0.5, (label, total, expected)
    result.append({"format": label, "file": name, "bytes": p.stat().st_size, "query_ms": round(statistics.median(runs) * 1000, 2), "total": round(total, 2)})
print(json.dumps({"rows": N, "formats": result, "query": "SELECT sum(total) FROM <the file>", "runs": 5}))
