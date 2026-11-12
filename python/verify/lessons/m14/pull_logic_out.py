"""Coding round: pull the logic out of a function that reads a log file and sends an email."""


def failures_by_job(lines):
    """Lines look like '2026-03-14T02:00:05Z ERROR load_orders rows=0'. Return {job: number of ERROR lines}, for jobs with at least one."""
    counts = {}
    for line in lines:
        parts = line.split()
        if len(parts) >= 3 and parts[1] == "ERROR":
            counts[parts[2]] = counts.get(parts[2], 0) + 1
    return counts


def alert_text(counts, limit=3):
    """None when no job has more than `limit` errors. Otherwise one line for each job over the limit, the worst first, like 'load_orders: 5 errors'."""
    worst = sorted(((n, job) for job, n in counts.items() if n > limit), reverse=True)
    if not worst:
        return None
    return "\n".join(f"{job}: {n} errors" for n, job in worst)


LOG = ["2026-03-14T02:00:01Z INFO load_orders rows=1200", "2026-03-14T02:00:05Z ERROR load_orders rows=0", "2026-03-14T02:00:06Z ERROR load_orders rows=0",
       "2026-03-14T02:00:07Z ERROR load_stores rows=0", "2026-03-14T02:00:08Z ERROR load_orders rows=0", "2026-03-14T02:00:09Z ERROR load_orders rows=0",
       "2026-03-14T02:00:10Z WARN load_orders slow", "2026-03-14T02:01:00Z ERROR load_stores rows=0", "short line"]
counts = failures_by_job(LOG)
assert counts == {"load_orders": 4, "load_stores": 2}
print("errors by job:", counts)
assert alert_text(counts, limit=3) == "load_orders: 4 errors"
print("alert, limit 3:", repr(alert_text(counts, limit=3)))
assert alert_text(counts, limit=1) == "load_orders: 4 errors\nload_stores: 2 errors"
print("alert, limit 1:", repr(alert_text(counts, limit=1)))
assert alert_text(counts, limit=10) is None and failures_by_job([]) == {}
print("quiet when under the limit:", alert_text(counts, limit=10))
print("tests passed")
