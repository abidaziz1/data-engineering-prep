"""Parsing timestamps, and the epoch mistake that gives a year in the 58,000s."""
from datetime import datetime, timezone

for text in ["2026-03-14T08:15:00Z", "2026-03-14T16:15:00+08:00", "2026-03-14 08:15:00", "2026-03-14"]:
    d = datetime.fromisoformat(text)
    print(f"{text:<28} -> {d.isoformat():<28} aware: {d.tzinfo is not None}")

print()
print("strptime, with an offset:", datetime.strptime("14/03/2026 16:15 +0800", "%d/%m/%Y %H:%M %z").isoformat())

seconds = 1_773_476_100
print("\nepoch seconds:     ", datetime.fromtimestamp(seconds, timezone.utc).isoformat())
try:
    datetime.fromtimestamp(seconds * 1000, timezone.utc)
except (ValueError, OverflowError) as e:
    print("epoch milliseconds:", type(e).__name__ + ":", e)
print("divide by 1000 first:", datetime.fromtimestamp(seconds * 1000 / 1000, timezone.utc).isoformat())
