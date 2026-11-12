"""Coding round: split each user's events into sessions. A gap of more than 30 minutes starts a new session."""


def sessionize(events, gap=30):
    """events: (user, minute) pairs, sorted by user and then by minute. Yield (user, first, last, count)."""
    current = None
    for user, minute in events:
        if current and current[0] == user and minute - current[2] <= gap:
            current[2] = minute
            current[3] += 1
        else:
            if current:
                yield tuple(current)
            current = [user, minute, minute, 1]
    if current:
        yield tuple(current)


events = [("C-1", 5), ("C-1", 20), ("C-1", 90), ("C-1", 100), ("C-2", 15), ("C-3", 0), ("C-3", 30), ("C-3", 61)]
for user, first, last, count in sessionize(events):
    print(f"{user}  minutes {first:>3} to {last:>3}  events: {count}")

assert list(sessionize([])) == []
assert list(sessionize([("A", 0), ("A", 30)])) == [("A", 0, 30, 2)]
assert list(sessionize([("A", 0), ("A", 31)])) == [("A", 0, 0, 1), ("A", 31, 31, 1)]
print("tests passed")
