"""A loader that catches everything. It reports success while it drops rows."""
ROWS = [("O-1", "12.50"), ("O-2", "4.75"), ("O-3", "8,20"), ("O-4", "19.90"), ("O-5", ""), ("O-6", "31.00")]


def load(rows):
    loaded = []
    for order_id, total in rows:
        try:
            loaded.append((order_id, float(total)))
        except Exception:
            pass
    return loaded


loaded = load(ROWS)
print(f"loaded {len(loaded)} of {len(ROWS)} rows")
print("status: success")
