"""Coding round: turn log lines into dicts, and count the lines that cannot be parsed."""
import re

PATTERN = re.compile(r"^(?P<ts>\S+) (?P<level>[A-Z]+) (?P<job>\S+) rows=(?P<rows>\d+) ms=(?P<ms>\d+)$")

lines = [
    "2026-03-14T02:00:01Z INFO load_orders rows=1200 ms=340",
    "2026-03-14T02:00:05Z WARN load_orders rows=0 ms=12",
    "2026-03-14T02:01:00Z INFO load_stores rows=40 ms=8",
    "this line is not a log line",
    "2026-03-14T02:02:00Z INFO load_orders rows=abc ms=9",
]


def parse_log(lines):
    good, bad = [], 0
    for line in lines:
        m = PATTERN.match(line)
        if not m:
            bad += 1
            continue
        d = m.groupdict()
        d["rows"], d["ms"] = int(d["rows"]), int(d["ms"])
        good.append(d)
    return good, bad


good, bad = parse_log(lines)
for d in good:
    print(d["ts"], d["level"].ljust(4), d["job"].ljust(12), d["rows"], d["ms"])
print("unparsable lines:", bad)

assert len(good) == 3 and bad == 2
assert parse_log([]) == ([], 0)
print("tests passed")
