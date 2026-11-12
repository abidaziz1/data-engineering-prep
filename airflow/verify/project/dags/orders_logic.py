"""The rules of the orders pipeline as plain Python, so that a test can call them without Airflow."""


def normalize_order(raw):
    """One raw order from the shop becomes one clean row. Amounts are in cents, so that no float is stored."""
    return {
        "order_id": raw["id"].strip().upper(),
        "store": raw["store"].strip(),
        "total_cents": round(float(raw["total"]) * 100),
    }


def revenue_cents(rows):
    return sum(r["total_cents"] for r in rows)
