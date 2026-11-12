"""Coding round: the two biggest orders for each store, without sorting every order."""
import heapq
from collections import defaultdict

orders = [
    ("O-1", "SG-01", 1250), ("O-2", "SG-01", 475), ("O-3", "KL-01", 3100), ("O-4", "SG-02", 820),
    ("O-5", "KL-01", 1990), ("O-6", "SG-01", 250), ("O-7", "KL-01", 5400), ("O-8", "SG-02", 610),
    ("O-9", "SG-01", 1250),
]


def top_k_per_group(rows, k):
    heaps = defaultdict(list)  # a min-heap per store that never holds more than k rows
    for order_id, store, cents in rows:
        item = (cents, order_id)
        if len(heaps[store]) < k:
            heapq.heappush(heaps[store], item)
        elif item > heaps[store][0]:
            heapq.heapreplace(heaps[store], item)
    return {store: sorted(h, reverse=True) for store, h in heaps.items()}


result = top_k_per_group(orders, 2)
for store in sorted(result):
    print(store, [(oid, cents) for cents, oid in result[store]])

assert result["KL-01"] == [(5400, "O-7"), (3100, "O-3")]
assert result["SG-02"] == [(820, "O-4"), (610, "O-8")]
assert len(result["SG-01"]) == 2
print("tests passed")
