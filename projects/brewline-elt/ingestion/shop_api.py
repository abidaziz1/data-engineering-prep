"""A stand-in for the shop API of Brewline: the state of the shop at the end of a day (1 to 3). Fixed rules and no random numbers, so every run gives the same answer.

The prices are in the dbt seed `product_prices.csv`, and the total of an order is the sum of quantity times price over its lines. Day 3 holds two traps on purpose:
an order with a SKU that has no price in the seed (a product that marketing launched without telling the data team), and a store that was renamed.
"""
import datetime

PRICES = {'MUG': 900, 'BEANS-250': 1800, 'FILTER': 350, 'GRINDER': 4900}
SKUS = list(PRICES)
REGIONS = ['north', 'south', 'east']
DAY1 = datetime.datetime(2026, 3, 1, 0, 0, 0, tzinfo=datetime.timezone.utc)


def stamp(day, i=0):
    """The time of a change: the day, plus a minute that depends on the order, so that the changes of a day are spread over it."""
    return (DAY1 + datetime.timedelta(days=day - 1, minutes=(i * 7) % 1440)).isoformat()


def _order(i, day, trap=False):
    lines = [{'sku': SKUS[(i + k) % 4], 'qty': 1 + (i + k) % 3} for k in range(1 + i % 3)]
    if trap:
        lines.append({'sku': 'CAPSULE-10', 'qty': 1})                                    # a new product with no price yet
    total = sum(l['qty'] * PRICES.get(l['sku'], 1200) for l in lines)
    return {'id': i, 'store_id': 1 + (i * 7) % 12, 'status': 'PLACED', 'total_cents': total, 'updated_at': stamp(day, i), 'lines': lines}


def orders_on(day):
    """Every order the shop holds at the end of `day`, as a dict from id to order."""
    rows = {i: _order(i, 1) for i in range(1, 201)}                                        # day 1: 200 orders
    if day >= 2:
        for i in range(1, 21):                                                             # day 2: 20 shipped, 30 new, one refunded
            rows[i].update(status='SHIPPED', updated_at=stamp(2, i))
        for i in range(201, 231):
            rows[i] = _order(i, 2)
        rows[21].update(status='REFUNDED', updated_at=stamp(2, 21))
    if day >= 3:                                                                           # day 3: 25 new orders, one with an unknown SKU
        for i in range(231, 256):
            rows[i] = _order(i, 3, trap=(i == 240))
        for i in range(31, 36):
            rows[i].update(status='SHIPPED', updated_at=stamp(3, i))
    return rows


def stores_on(day):
    """The 12 stores. On day 3 store 4 is renamed."""
    names = {s: 'Store %d' % s for s in range(1, 13)}
    if day >= 3:
        names[4] = 'Store 4 (Riverside)'
    return [{'id': s, 'name': names[s], 'region': REGIONS[s % 3]} for s in range(1, 13)]


def get_orders(day, since=None, page_size=100):
    """Like GET /orders?updated_since=...: the orders changed at or after `since`, in pages."""
    rows = [r for _, r in sorted(orders_on(day).items()) if since is None or r['updated_at'] >= since]
    for k in range(0, len(rows), page_size):
        yield rows[k:k + page_size]


def get_stores(day):
    yield stores_on(day)
