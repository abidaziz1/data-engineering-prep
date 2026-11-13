def normalize_order(raw):
    return {
        "order_id": raw["id"].strip().upper(),
        "store": raw["store"].strip(),
        "total_cents": int(float(raw["total"]) * 100),
    }


def revenue_cents(rows):
    return sum(r["total_cents"] for r in rows)
