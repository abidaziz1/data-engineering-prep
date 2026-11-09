import datetime
from decimal import Decimal

from transforms import daily_revenue, latest_per_key

SCHEMA = "order_id string, status string, order_ts timestamp, total_usd decimal(12,2), loaded_at timestamp"


def orders(spark, rows):
    return spark.createDataFrame(rows, SCHEMA)


def test_latest_per_key_keeps_the_newest_version(spark):
    df = orders(spark, [
        ("O-1", "PLACED", datetime.datetime(2026, 3, 14, 9), Decimal("10.00"), datetime.datetime(2026, 3, 14, 9, 30)),
        ("O-1", "SHIPPED", datetime.datetime(2026, 3, 14, 9), Decimal("10.00"), datetime.datetime(2026, 3, 14, 10, 30)),
    ])
    result = latest_per_key(df, "order_id", "loaded_at").collect()
    assert [(r.order_id, r.status) for r in result] == [("O-1", "SHIPPED")]


def test_daily_revenue_ignores_cancelled_orders(spark):
    df = orders(spark, [
        ("O-1", "SHIPPED", datetime.datetime(2026, 3, 14, 9), Decimal("10.00"), datetime.datetime(2026, 3, 14, 10)),
        ("O-2", "CANCELLED", datetime.datetime(2026, 3, 14, 11), Decimal("99.00"), datetime.datetime(2026, 3, 14, 12)),
    ])
    result = daily_revenue(df).collect()
    assert [(r.orders, r.revenue_usd) for r in result] == [(1, Decimal("10.00"))]


def test_daily_revenue_groups_by_date(spark):
    df = orders(spark, [
        ("O-1", "SHIPPED", datetime.datetime(2026, 3, 14, 9), Decimal("10.00"), datetime.datetime(2026, 3, 14, 10)),
        ("O-2", "SHIPPED", datetime.datetime(2026, 3, 15, 9), Decimal("5.50"), datetime.datetime(2026, 3, 15, 10)),
    ])
    result = {str(r.order_date): r.revenue_usd for r in daily_revenue(df).collect()}
    assert result == {"2026-03-14": Decimal("10.00"), "2026-03-15": Decimal("5.50")}
