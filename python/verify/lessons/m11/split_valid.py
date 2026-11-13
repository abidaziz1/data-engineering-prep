"""Coding round: split rows into good ones and quarantined ones with a checking function, and fail when too many are bad."""


def split_valid(rows, check, max_bad_share=0.2):
    """check(row) returns the cleaned row, or raises ValueError("reason"). Return (good, quarantine).
    A quarantine item is {"line": n, "row": row, "why": reason}, with n counting from 2 because line 1 is the header.
    When the share of bad rows is above max_bad_share, raise RuntimeError (the good and quarantined rows are not returned)."""
    good, quarantine = [], []
    for line, row in enumerate(rows, start=2):
        try:
            good.append(check(row))
        except ValueError as err:
            quarantine.append({"line": line, "row": row, "why": str(err)})
    if rows and len(quarantine) / len(rows) > max_bad_share:
        raise RuntimeError(f"{len(quarantine)} of {len(rows)} rows are bad")
    return good, quarantine


def check_order(row):
    try:
        qty = int(row["qty"])
        cents = int(row["total_cents"])
    except (KeyError, ValueError):
        raise ValueError("qty and total_cents must be whole numbers") from None
    if qty < 1:
        raise ValueError("qty must be at least 1")
    return {"order_id": row["order_id"], "qty": qty, "total_cents": cents}


rows = [{"order_id": "O-1", "qty": "2", "total_cents": "1250"}, {"order_id": "O-2", "qty": "0", "total_cents": "475"}, {"order_id": "O-3", "qty": "1", "total_cents": "8,20"},
        {"order_id": "O-4", "qty": "1", "total_cents": "1990"}, {"order_id": "O-5", "qty": "3", "total_cents": "3100"}, {"order_id": "O-6", "qty": "1", "total_cents": "640"},
        {"order_id": "O-7", "qty": "2", "total_cents": "900"}, {"order_id": "O-8", "qty": "1", "total_cents": "2200"}, {"order_id": "O-9", "qty": "1", "total_cents": "500"},
        {"order_id": "O-10", "qty": "5", "total_cents": "1000"}]
good, quarantine = split_valid(rows, check_order, max_bad_share=0.3)
assert [g["order_id"] for g in good] == ["O-1", "O-4", "O-5", "O-6", "O-7", "O-8", "O-9", "O-10"] and good[0] == {"order_id": "O-1", "qty": 2, "total_cents": 1250}
print("8 good rows, cleaned:", good[0])
assert [(q["line"], q["why"]) for q in quarantine] == [(3, "qty must be at least 1"), (4, "qty and total_cents must be whole numbers")]
print("quarantined:", [(q["line"], q["why"]) for q in quarantine])
try:
    split_valid(rows, check_order, max_bad_share=0.1)
    raise AssertionError("20 percent bad rows must fail a 10 percent limit")
except RuntimeError as err:
    print("over the limit:", err)
assert split_valid([], check_order) == ([], [])
print("no rows:", split_valid([], check_order))
print("tests passed")
