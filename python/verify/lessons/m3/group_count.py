"""Counting, grouping and the top few, with the tools of the standard library."""
import heapq
from collections import Counter, defaultdict

orders = [
    ("O-1", "SG-01", "paid", 1250), ("O-2", "SG-01", "paid", 475), ("O-3", "KL-01", "cancelled", 3100),
    ("O-4", "SG-02", "paid", 820), ("O-5", "KL-01", "paid", 1990), ("O-6", "SG-01", "refunded", 250),
    ("O-7", "KL-01", "paid", 5400), ("O-8", "SG-02", "paid", 610),
]

print("orders per status:", Counter(status for _, _, status, _ in orders))

revenue = defaultdict(int)
for _, store, status, cents in orders:
    if status == "paid":
        revenue[store] += cents
print("paid revenue per store (cents):", dict(revenue))

print("two biggest orders:", heapq.nlargest(2, orders, key=lambda o: o[3]))
print("stores by revenue, highest first:", sorted(revenue, key=revenue.get, reverse=True))
print("sorted by status, then by amount (a stable sort):")
for o in sorted(orders, key=lambda o: (o[2], o[3])):
    print("  ", o)
