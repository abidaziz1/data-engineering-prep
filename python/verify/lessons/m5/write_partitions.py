"""Coding round: write orders into one folder for each day, so a later job can read a single day."""
import csv
import os
import pathlib
import tempfile
from collections import defaultdict

orders = [
    ("O-1", "2026-03-14 08:15:00", 12.5), ("O-2", "2026-03-14 09:02:00", 4.75), ("O-3", "2026-03-15 00:03:00", 8.2),
    ("O-4", "2026-03-15 10:41:00", 19.9), ("O-5", "2026-03-14 23:58:00", 31.0),
]


def write_partitions(rows, root):
    by_day = defaultdict(list)
    for order_id, ts, total in rows:
        by_day[ts[:10]].append((order_id, ts, total))
    written = {}
    for day, day_rows in sorted(by_day.items()):
        folder = pathlib.Path(root) / f"dt={day}"
        folder.mkdir(parents=True, exist_ok=True)
        fd, tmp = tempfile.mkstemp(dir=folder, suffix=".tmp")
        with os.fdopen(fd, "w", newline="") as f:
            csv.writer(f).writerows(sorted(day_rows))
        os.replace(tmp, folder / "part-0000.csv")
        written[day] = len(day_rows)
    return written


root = tempfile.mkdtemp()
result = write_partitions(orders, root)
for day, n in result.items():
    print(f"dt={day}/part-0000.csv  {n} rows")
assert write_partitions(orders, root) == result  # running it again changes nothing
assert sorted(p.name for p in pathlib.Path(root).iterdir()) == ["dt=2026-03-14", "dt=2026-03-15"]
print("tests passed")
