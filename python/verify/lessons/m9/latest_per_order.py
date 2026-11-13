"""Coding round: the latest row for each order, in SQL, with DuckDB."""
import duckdb
import pandas as pd


def latest_per_order(rows):
    """rows are (order_id, status, updated_at). Return one row for each order_id, the one with the latest updated_at, sorted by order_id."""
    df = pd.DataFrame(rows, columns=["order_id", "status", "updated_at"])
    return duckdb.sql("""
        SELECT order_id, status, updated_at FROM df
        QUALIFY row_number() OVER (PARTITION BY order_id ORDER BY updated_at DESC) = 1
        ORDER BY order_id""").fetchall()


rows = [("O-1", "placed", "2026-03-14 08:00"), ("O-2", "placed", "2026-03-14 09:00"), ("O-1", "paid", "2026-03-14 08:05"),
        ("O-3", "placed", "2026-03-14 07:00"), ("O-1", "refunded", "2026-03-15 10:00"), ("O-2", "paid", "2026-03-14 09:30")]
got = latest_per_order(rows)
assert got == [("O-1", "refunded", "2026-03-15 10:00"), ("O-2", "paid", "2026-03-14 09:30"), ("O-3", "placed", "2026-03-14 07:00")]
print("latest status of each order:", [(o, s) for o, s, _ in got])
assert latest_per_order([]) == []
print("no rows:", latest_per_order([]))
assert latest_per_order(rows[:1]) == [rows[0]]
print("one row:", len(latest_per_order(rows[:1])), "row")
print("tests passed")
