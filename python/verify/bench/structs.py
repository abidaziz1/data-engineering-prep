"""Memory of N order records in different structures. Run: python structs.py KIND N. Prints one JSON line.

Python structures are measured with tracemalloc (every byte that Python allocated and kept). The libraries that keep data in
their own buffers are measured the way their own documentation measures: pandas memory_usage(deep=True), Arrow Table.nbytes,
Polars estimated_size(). The strings are made fresh for every record, like text parsed from a file."""
import json
import sys
import tracemalloc
from collections import namedtuple
from dataclasses import dataclass

kind, n = sys.argv[1], int(sys.argv[2])
STORES = ["SG-01", "SG-02", "KL-01", "JK-01", "BK-01"]
STATUSES = ["paid", "paid", "paid", "paid", "cancelled", "refunded"]


def row(i):
    return ("O-%07d" % i, "C-%04d" % (i % 4000), STORES[i % 5].encode().decode(), STATUSES[i % 6].encode().decode(), 350 + (i * 7919) % 11650, 1 + i % 6)


FIELDS = ("order_id", "customer_id", "store", "status", "total_cents", "items")
NT = namedtuple("NT", FIELDS)


@dataclass
class DC:
    order_id: str
    customer_id: str
    store: str
    status: str
    total_cents: int
    items: int


@dataclass(slots=True)
class DS:
    order_id: str
    customer_id: str
    store: str
    status: str
    total_cents: int
    items: int


def build():
    if kind == "list_of_dicts":
        return [dict(zip(FIELDS, row(i))) for i in range(n)]
    if kind == "list_of_tuples":
        return [row(i) for i in range(n)]
    if kind == "list_of_namedtuples":
        return [NT(*row(i)) for i in range(n)]
    if kind == "list_of_dataclasses":
        return [DC(*row(i)) for i in range(n)]
    if kind == "list_of_slots_dataclasses":
        return [DS(*row(i)) for i in range(n)]
    if kind == "dict_of_lists":
        cols = {f: [] for f in FIELDS}
        for i in range(n):
            for f, v in zip(FIELDS, row(i)):
                cols[f].append(v)
        return cols
    if kind == "set_of_ids":
        return {"O-%08d" % i for i in range(n)}
    if kind == "list_of_ids":
        return ["O-%08d" % i for i in range(n)]
    raise SystemExit("unknown kind " + kind)


def columns():
    cols = {f: [] for f in FIELDS}
    for i in range(n):
        for f, v in zip(FIELDS, row(i)):
            cols[f].append(v)
    return cols


if kind in ("pandas_default", "pandas_typed", "pyarrow_table", "polars_frame"):
    cols = columns()
    if kind == "pandas_default":
        import pandas as pd
        obj = pd.DataFrame(cols)
        size, method = int(obj.memory_usage(deep=True).sum()), "memory_usage(deep=True)"
    elif kind == "pandas_typed":
        import pandas as pd
        obj = pd.DataFrame(cols).astype({"store": "category", "status": "category", "customer_id": "category", "total_cents": "int32", "items": "int8"})
        size, method = int(obj.memory_usage(deep=True).sum()), "memory_usage(deep=True)"
    elif kind == "pyarrow_table":
        import pyarrow as pa
        obj = pa.table(cols)
        size, method = obj.nbytes, "Table.nbytes"
    else:
        import polars as pl
        obj = pl.DataFrame(cols)
        size, method = obj.estimated_size(), "DataFrame.estimated_size()"
else:
    tracemalloc.start()
    before = tracemalloc.get_traced_memory()[0]
    obj = build()
    size, method = tracemalloc.get_traced_memory()[0] - before, "tracemalloc"
print(json.dumps({"kind": kind, "n": n, "bytes": size, "per_record": round(size / n, 1), "method": method}))
