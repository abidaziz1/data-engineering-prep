"""A stand-in for the shop API of Brewline: the orders as the shop holds them at the end of a day (1 to 3). Fixed rules, no random numbers."""
SKUS = ['MUG', 'BEANS-250', 'FILTER', 'GRINDER']


def _base(i):
    return {'id': i, 'status': 'PLACED', 'total_cents': 1000 + i, 'updated_at': '2026-03-01T08:00:00+00:00',
            'customer': {'id': 'C%03d' % (1 + (i * 13) % 40), 'tier': ['bronze', 'silver', 'gold'][i % 3]},
            'lines': [{'sku': SKUS[(i + k) % 4], 'qty': 1 + (i + k) % 3} for k in range(1 + i % 3)]}


def orders_on(day):
    """Every order that the shop holds at the end of `day`."""
    rows = {i: _base(i) for i in range(1, 101)}
    if day >= 2:
        for i in range(1, 11):                                         # ten orders are shipped
            rows[i].update(status='SHIPPED', updated_at='2026-03-02T09:00:00+00:00')
        for i in range(101, 111):                                      # ten new orders
            rows[i] = dict(_base(i), updated_at='2026-03-02T09:30:00+00:00')
        del rows[11]                                                   # an order is deleted for good
        rows[12]['status'] = 'SHIPPED'                                 # a change that did not move updated_at
    if day >= 3:
        for i in range(111, 116):                                      # new orders with a coupon and a channel
            rows[i] = dict(_base(i), updated_at='2026-03-03T10:00:00+00:00', coupon='SPRING' if i % 2 else None, channel={'name': 'web', 'app': {'version': '4.1'}})
        rows[116] = dict(_base(116), updated_at='2026-03-03T10:30:00+00:00', total_cents='1116')    # a number sent as text
        rows[117] = dict(_base(117), updated_at='2026-03-03T10:40:00+00:00', total_cents='11.17')   # an amount with a decimal point, sent as text
    return rows


def get_orders(day, since=None, page_size=50):
    """Like GET /orders?updated_since=...: the orders changed at or after `since`, in pages of 50."""
    rows = [r for _, r in sorted(orders_on(day).items()) if since is None or r['updated_at'] >= since]
    for k in range(0, len(rows), page_size):
        yield rows[k:k + page_size]
