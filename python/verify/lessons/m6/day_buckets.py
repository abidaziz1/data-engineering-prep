"""Which day is an order on? It depends on whose clock you ask."""
from collections import Counter
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

SG = ZoneInfo("Asia/Singapore")
orders = [  # UTC timestamps
    ("O-1", datetime(2026, 3, 14, 3, 0, tzinfo=timezone.utc)),
    ("O-2", datetime(2026, 3, 14, 15, 59, tzinfo=timezone.utc)),
    ("O-3", datetime(2026, 3, 14, 16, 1, tzinfo=timezone.utc)),
    ("O-4", datetime(2026, 3, 14, 22, 30, tzinfo=timezone.utc)),
    ("O-5", datetime(2026, 3, 15, 5, 0, tzinfo=timezone.utc)),
]
print("orders per day by the UTC date:       ", dict(Counter(str(t.date()) for _, t in orders)))
print("orders per day by Singapore's date:   ", dict(Counter(str(t.astimezone(SG).date()) for _, t in orders)))

london = ZoneInfo("Europe/London")
start = datetime(2026, 3, 29, 0, 0, tzinfo=london)
end = start + timedelta(days=1)
print()
print("London, 29 March 2026: from", start.isoformat(), "to", end.isoformat())
print("subtracting the two aware values:     ", end - start)
print("the same two moments in UTC:          ", end.astimezone(timezone.utc) - start.astimezone(timezone.utc))
