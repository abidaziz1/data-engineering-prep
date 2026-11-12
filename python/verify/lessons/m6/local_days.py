"""Coding round: count orders for each local day of a store, including the day that has 23 hours."""
from collections import Counter
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo


def orders_per_local_day(utc_times, zone):
    tz = ZoneInfo(zone)
    return dict(sorted(Counter(t.astimezone(tz).date().isoformat() for t in utc_times).items()))


def hours_in_local_day(day, zone):
    tz = ZoneInfo(zone)
    start = datetime.fromisoformat(day).replace(tzinfo=tz)
    end = start + timedelta(days=1)  # the next midnight on the wall clock
    return (end.astimezone(timezone.utc) - start.astimezone(timezone.utc)).total_seconds() / 3600


times = [datetime(2026, 3, 28, 23, 30, tzinfo=timezone.utc), datetime(2026, 3, 29, 0, 30, tzinfo=timezone.utc),
         datetime(2026, 3, 29, 22, 59, tzinfo=timezone.utc), datetime(2026, 3, 29, 23, 1, tzinfo=timezone.utc)]
print("London:   ", orders_per_local_day(times, "Europe/London"))
print("Singapore:", orders_per_local_day(times, "Asia/Singapore"))
for day in ("2026-03-28", "2026-03-29", "2026-10-25"):
    print(f"hours in {day} in London: {hours_in_local_day(day, 'Europe/London'):g}")

assert orders_per_local_day(times, "Europe/London") == {"2026-03-28": 1, "2026-03-29": 2, "2026-03-30": 1}
assert hours_in_local_day("2026-03-29", "Europe/London") == 23
assert hours_in_local_day("2026-10-25", "Europe/London") == 25
print("tests passed")
