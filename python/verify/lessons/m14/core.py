"""The core: pure functions. They take values and return values. They read no file, call no API and know no clock."""
from datetime import datetime


def parse_order(row):
    """A row of text from the file becomes a clean order. Raise ValueError for a row that cannot be used."""
    try:
        return {"store": row["store"].strip().title(), "status": row["status"],
                "day": datetime.fromisoformat(row["ordered_at"]).date().isoformat(), "cents": int(row["total_cents"])}
    except (KeyError, ValueError) as err:
        raise ValueError(f"bad order row: {err}") from None


def daily_totals(orders):
    """Paid revenue for each store and day, as a sorted list of (store, day, cents)."""
    totals = {}
    for o in orders:
        if o["status"] == "paid":
            totals[(o["store"], o["day"])] = totals.get((o["store"], o["day"]), 0) + o["cents"]
    return [(store, day, cents) for (store, day), cents in sorted(totals.items())]
