import pytest

from core import daily_totals, parse_order


def test_parse_order_cleans_the_row():
    row = {"order_id": "O-1", "store": " london ", "status": "paid", "ordered_at": "2026-03-14T08:15:00", "total_cents": "1250"}
    assert parse_order(row) == {"store": "London", "status": "paid", "day": "2026-03-14", "cents": 1250}


def test_parse_order_rejects_a_bad_row():
    with pytest.raises(ValueError):
        parse_order({"store": "London", "status": "paid", "ordered_at": "yesterday", "total_cents": "12,50"})


def test_daily_totals_counts_paid_orders_only():
    orders = [{"store": "London", "status": "paid", "day": "2026-03-14", "cents": 1250}, {"store": "London", "status": "refunded", "day": "2026-03-14", "cents": 475},
              {"store": "London", "status": "paid", "day": "2026-03-14", "cents": 820}, {"store": "Singapore", "status": "paid", "day": "2026-03-15", "cents": 1990}]
    assert daily_totals(orders) == [("London", "2026-03-14", 2070), ("Singapore", "2026-03-15", 1990)]
