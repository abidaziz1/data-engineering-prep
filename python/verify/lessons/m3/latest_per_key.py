"""Coding round: keep the newest record for each order, even when an old record arrives late."""

events = [
    {"order_id": "O-1", "status": "created", "updated_at": "2026-03-01T08:00:00Z"},
    {"order_id": "O-2", "status": "created", "updated_at": "2026-03-01T08:05:00Z"},
    {"order_id": "O-1", "status": "paid", "updated_at": "2026-03-01T08:07:00Z"},
    {"order_id": "O-3", "status": "created", "updated_at": "2026-03-01T09:00:00Z"},
    {"order_id": "O-2", "status": "cancelled", "updated_at": "2026-03-01T08:06:00Z"},
    {"order_id": "O-1", "status": "refunded", "updated_at": "2026-03-01T07:59:00Z"},  # arrives last, but is the oldest
]


def latest_per_key(events, key="order_id", order_by="updated_at"):
    latest = {}
    for e in events:
        k = e[key]
        if k not in latest or e[order_by] > latest[k][order_by]:
            latest[k] = e
    return list(latest.values())


result = latest_per_key(events)
for r in sorted(result, key=lambda r: r["order_id"]):
    print(r["order_id"], r["status"].ljust(10), r["updated_at"])

assert len(result) == 3
assert {r["order_id"]: r["status"] for r in result} == {"O-1": "paid", "O-2": "cancelled", "O-3": "created"}
assert latest_per_key([]) == []
print("tests passed")
