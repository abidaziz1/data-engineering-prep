from orders_logic import normalize_order, revenue_cents


def test_normalize_order_cleans_the_id_and_uses_cents():
    row = normalize_order({"id": " o-1 ", "store": "SG-01", "total": "12.50"})
    assert row == {"order_id": "O-1", "store": "SG-01", "total_cents": 1250}


def test_revenue_adds_cents():
    assert revenue_cents([{"total_cents": 1250}, {"total_cents": 800}]) == 2050
