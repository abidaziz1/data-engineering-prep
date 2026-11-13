"""The rules of the store revenue pipeline as plain Python, so that a test can call them without Airflow."""
from decimal import Decimal


def revenue_by_store(orders):
    """Total in whole cents for each store. Amounts are strings such as "19.99", so no float is added."""
    totals = {}
    for order in orders:
        cents = int(Decimal(order["total"]) * 100)
        totals[order["store"]] = totals.get(order["store"], 0) + cents
    return totals
