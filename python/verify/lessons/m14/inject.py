"""Pass in what changes: the reader, the writer and the clock. The job does not know whether they are real."""
import csv
from datetime import datetime, timezone


def run_day(day, read, write, now):
    """Read the orders of a day, stamp them with the time of the run, and write them. Returns the number of rows written."""
    rows = [dict(row, loaded_at=now().isoformat()) for row in read(day)]
    write(rows)
    return len(rows)


# 1. with fakes: no file, no database, and a clock that always says the same time
written = []
fake_now = lambda: datetime(2026, 3, 15, 2, 0, tzinfo=timezone.utc)
n = run_day("2026-03-14", read=lambda day: [{"order_id": "O-1"}, {"order_id": "O-2"}], write=written.extend, now=fake_now)
print("with fakes:", n, "rows, first one:", written[0])


# 2. with the real things: a CSV file, a list that stands for the table, and the real clock
def read_csv(day):
    with open("orders.csv") as f:
        return [r for r in csv.DictReader(f) if r["ordered_at"].startswith(day)]


table = []
n = run_day("2026-03-14", read=read_csv, write=table.extend, now=lambda: datetime.now(timezone.utc))
print("with the real reader:", n, "rows, ids", [r["order_id"] for r in table], ", loaded_at is set:", all(r["loaded_at"].endswith("+00:00") for r in table))
