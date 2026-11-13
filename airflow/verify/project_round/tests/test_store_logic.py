from store_logic import revenue_by_store


def test_revenue_is_exact_in_cents():
    orders = [{"store": "SG-01", "total": "19.99"}, {"store": "SG-01", "total": "8.00"}, {"store": "SG-02", "total": "12.50"}]
    assert revenue_by_store(orders) == {"SG-01": 2799, "SG-02": 1250}


def test_no_orders_gives_no_stores():
    assert revenue_by_store([]) == {}
