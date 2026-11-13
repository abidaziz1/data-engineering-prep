"""Coding round: turn timestamps in mixed formats into one UTC format."""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo


def to_utc(value, default_zone):
    """Return an ISO 8601 string in UTC. Numbers are epoch seconds. Text without an offset is in default_zone."""
    if isinstance(value, (int, float)):
        d = datetime.fromtimestamp(value, timezone.utc)
    else:
        d = datetime.fromisoformat(value)
        if d.tzinfo is None:
            d = d.replace(tzinfo=ZoneInfo(default_zone))
    return d.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


samples = ["2026-03-14T08:15:00Z", "2026-03-14T16:15:00+08:00", "2026-03-14 16:15:00", 1_773_476_100]
for s in samples:
    print(f"{s!s:<28} -> {to_utc(s, 'Asia/Singapore')}")

assert to_utc("2026-03-14T08:15:00Z", "Asia/Singapore") == "2026-03-14T08:15:00Z"
assert to_utc("2026-03-14T16:15:00+08:00", "Europe/London") == "2026-03-14T08:15:00Z"
assert to_utc("2026-03-14 16:15:00", "Asia/Singapore") == "2026-03-14T08:15:00Z"
assert to_utc("2026-07-01 12:00:00", "Europe/London") == "2026-07-01T11:00:00Z"  # summer time
print("tests passed")
