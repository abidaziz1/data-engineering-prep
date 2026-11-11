"""Made-up Brewline Asia-Pacific data for the Google Cloud course. Nothing here is real. Every run gives the same rows.

The stores, the customers and the orders are generated from a fixed seed, so a lesson that quotes a count can be checked against the recording.
Three things are built in on purpose, because real data has them: some orders arrive twice (a re-delivery with a later load time), one store sells far
more than the others (skew), and some customers are guests (no customer id).
"""
import datetime as dt
import random

SEED = 2026
DAYS = 14
FIRST_DAY = dt.date(2026, 10, 28)
N_ORDERS = 20000
N_CUSTOMERS = 2000

STORES = [
    ('s01', 'Singapore', 'SG'), ('s02', 'Singapore', 'SG'), ('s03', 'Kuala Lumpur', 'MY'), ('s04', 'Kuala Lumpur', 'MY'),
    ('s05', 'Jakarta', 'ID'), ('s06', 'Jakarta', 'ID'), ('s07', 'Bangkok', 'TH'), ('s08', 'Bangkok', 'TH'),
    ('s09', 'Ho Chi Minh City', 'VN'), ('s10', 'Ho Chi Minh City', 'VN'), ('s11', 'Manila', 'PH'), ('s12', 'Penang', 'MY'),
]
SKUS = [('latte', 520), ('flat_white', 540), ('espresso', 380), ('cold_brew', 560), ('mocha', 580), ('tea', 340),
        ('croissant', 420), ('bun', 300), ('cookie', 260), ('beans_250g', 1850), ('mug', 1450), ('oat_upgrade', 80)]
STATUSES = ['NEW', 'PAID', 'PAID', 'PAID', 'PAID', 'PAID', 'REFUNDED', 'CANCELLED']
CHANNELS = ['pos', 'pos', 'pos', 'app', 'app', 'web']
TIERS = ['none', 'none', 'silver', 'gold']


def stores():
    return [{'store_id': s, 'city': c, 'country': k} for s, c, k in STORES]


def customers():
    rnd = random.Random(SEED + 1)
    rows = []
    for i in range(1, N_CUSTOMERS + 1):
        rows.append({'customer_id': 'c%04d' % i, 'email': 'user%04d@example.com' % i, 'phone': '+65 5550 %04d' % rnd.randint(0, 9999),
                     'birth_year': rnd.randint(1960, 2006), 'loyalty_tier': rnd.choice(TIERS)})
    return rows


def orders(n=N_ORDERS):
    """20,000 orders over 14 days (or n). Store s01 sells about a third of them. A quarter of the orders are guests."""
    rnd = random.Random(SEED)
    rows = []
    weights = [0.34] + [0.66 / 11] * 11
    for oid in range(1, n + 1):
        day = FIRST_DAY + dt.timedelta(days=min(DAYS - 1, int(rnd.random() * DAYS)))
        sec = int(rnd.random() * 86400)
        ts = dt.datetime.combine(day, dt.time()) + dt.timedelta(seconds=sec)
        store = rnd.choices(STORES, weights)[0][0]
        guest = rnd.random() < 0.25
        items = []
        for _ in range(rnd.randint(1, 4)):
            sku, cents = rnd.choice(SKUS)
            items.append({'sku': sku, 'qty': rnd.randint(1, 3), 'unit_cents': cents})
        rows.append({'order_id': oid, 'store_id': store, 'customer_id': None if guest else 'c%04d' % rnd.randint(1, N_CUSTOMERS), 'order_ts': ts,
                     'status': rnd.choice(STATUSES), 'channel': rnd.choice(CHANNELS), 'items': items,
                     'total_cents': sum(i['qty'] * i['unit_cents'] for i in items)})
    return rows


def raw_orders(rows=None, share=0.03):
    """What lands in the raw layer: every order once, with a load time, and a share of them delivered a second time later (at least once delivery)."""
    rows = rows if rows is not None else orders()
    rnd = random.Random(SEED + 2)
    out = []
    for r in rows:
        base = r['order_ts'] + dt.timedelta(seconds=rnd.randint(1, 20))
        out.append(dict(r, ingest_ts=base))
        if rnd.random() < share:
            again = dict(r, ingest_ts=base + dt.timedelta(seconds=rnd.randint(30, 3000)))
            if rnd.random() < 0.5 and r['status'] == 'NEW':
                again['status'] = 'PAID'                     # the second delivery carries a newer state
            out.append(again)
    return out


def flat_orders(rows=None, n=N_ORDERS):
    """Orders without the nested items, for file format comparisons."""
    rows = rows if rows is not None else orders(n)
    return [{k: v for k, v in r.items() if k != 'items'} for r in rows]


def stream_events():
    """POS events for the streaming lessons: event time (seconds), a key, an id, and the awkward cases: a duplicate id, late events and one broken line."""
    rnd = random.Random(SEED + 3)
    ev = []
    for i in range(1, 41):
        ts = 10 + int(rnd.random() * 170)
        ev.append({'event_id': 'e%03d' % i, 'store_id': rnd.choice(['s01', 's01', 's02', 's03']), 'event_ts': ts, 'amount': rnd.choice([380, 520, 540, 560, 1850])})
    ev.sort(key=lambda e: e['event_ts'])
    return ev
