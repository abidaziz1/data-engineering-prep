"""The memory of one table, with the default types and with smaller ones. One million made-up orders."""
import numpy as np
import pandas as pd

rng = np.random.default_rng(7)
n = 1_000_000
df = pd.DataFrame({
    "order_id": np.arange(n),
    "store": rng.choice(["London", "Singapore", "Sydney", "Mumbai", "Dubai", "Paris", "Tokyo", "Lagos"], n),
    "status": rng.choice(["paid", "refunded", "cancelled"], n),
    "qty": rng.integers(1, 10, n),
    "total_cents": rng.integers(300, 4000, n),
})
small = df.astype({"order_id": "int32", "store": "category", "status": "category", "qty": "int8", "total_cents": "int32"})
before, after = df.memory_usage(deep=True), small.memory_usage(deep=True)

print(f"{'column':<13}{'default type':<14}{'MB':>7}   {'smaller type':<14}{'MB':>7}")
for col in df.columns:
    print(f"{col:<13}{str(df[col].dtype):<14}{before[col] / 1e6:>7.1f}   {str(small[col].dtype):<14}{after[col] / 1e6:>7.1f}")
print(f"{'total':<13}{'':<14}{before.sum() / 1e6:>7.1f}   {'':<14}{after.sum() / 1e6:>7.1f}")
assert df["total_cents"].sum() == small["total_cents"].sum() and (df["store"] == small["store"].astype(str)).all()
print("same sums and values after the change")
