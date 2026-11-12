"""What zoneinfo says about local times around a clock change."""
import zoneinfo
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

zi = Path(zoneinfo.TZPATH[0]) / "tzdata.zi"
print("database:", zi.read_text().splitlines()[0] if zi.exists() else "the tzdata package")
print()

CASES = [
    ("Europe/London", datetime(2026, 3, 29, 1, 30)),   # the clocks go forward at 01:00 and skip an hour
    ("Europe/London", datetime(2026, 10, 25, 1, 30)),  # the clocks go back at 02:00 and repeat an hour
    ("America/New_York", datetime(2026, 3, 8, 2, 30)),
    ("America/New_York", datetime(2026, 11, 1, 1, 30)),
    ("Asia/Singapore", datetime(2026, 3, 29, 1, 30)),  # no clock changes
]


def describe(zone, naive):
    tz = ZoneInfo(zone)
    a, b = naive.replace(tzinfo=tz, fold=0), naive.replace(tzinfo=tz, fold=1)
    back = a.astimezone(timezone.utc).astimezone(tz)
    if a.utcoffset() != b.utcoffset():
        kind = "ambiguous" if back.replace(tzinfo=None) == naive else "does not exist"
    else:
        kind = "exists once"
    return kind, a, b


for zone, naive in CASES:
    kind, a, b = describe(zone, naive)
    print(f"{zone:<17} {naive:%Y-%m-%d %H:%M}  {kind}")
    print(f"    fold=0: offset {a.isoformat()[-6:]}  utc {a.astimezone(timezone.utc):%Y-%m-%d %H:%M}")
    print(f"    fold=1: offset {b.isoformat()[-6:]}  utc {b.astimezone(timezone.utc):%Y-%m-%d %H:%M}")
