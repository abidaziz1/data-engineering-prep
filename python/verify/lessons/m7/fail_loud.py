"""The same loader, with the bad rows counted and an exit code that tells the truth."""
import sys

ROWS = [("O-1", "12.50"), ("O-2", "4.75"), ("O-3", "8,20"), ("O-4", "19.90"), ("O-5", ""), ("O-6", "31.00")]
MAX_BAD = 0.05  # more than 5 percent bad rows fails the run


def load(rows):
    loaded, bad = [], []
    for order_id, total in rows:
        try:
            loaded.append((order_id, float(total)))
        except ValueError as err:
            bad.append((order_id, total, str(err)))
    return loaded, bad


loaded, bad = load(ROWS)
print(f"loaded {len(loaded)} of {len(ROWS)} rows")
for order_id, total, why in bad:
    print(f"  rejected {order_id}: {why}")
if len(bad) / len(ROWS) > MAX_BAD:
    print(f"status: failed, {len(bad)} of {len(ROWS)} rows rejected (limit {MAX_BAD:.0%})")
    sys.exit(1)
print("status: success")
