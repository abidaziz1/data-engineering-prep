"""The landing zone: JSON-lines files of order events, as a source system would drop them.

A stand-in for the source, with fixed rules and no random numbers.

Day 1 is mostly clean, with a few dirty lines on purpose. Day 2 brings new orders, status
changes (one of them a refund), and a file that is delivered twice. Day 3 adds a field that
nobody announced, an amount that is text, and an old event of order 5 that arrives late,
after the update that it must not undo.
"""

import datetime
import json
import os

DAY1 = datetime.datetime(2026, 3, 1, tzinfo=datetime.timezone.utc)
SKUS = ['MUG', 'BEANS-250', 'FILTER', 'GRINDER']


def when(day, minute):
    moment = DAY1 + datetime.timedelta(days=day - 1, minutes=minute)
    return moment.strftime('%Y-%m-%dT%H:%M:%SZ')


def event(i, day, status='PLACED', minute=None, **override):
    e = {
        'order_id': i,
        'store_id': 1 + (i * 7) % 12,
        'status': status,
        'amount_cents': 1000 + (i * 37) % 9000,
        'event_time': when(day, i % 1440 if minute is None else minute),
        'lines': [{'sku': SKUS[(i + k) % 4], 'qty': 1 + (i + k) % 3} for k in range(1 + i % 3)],
    }
    e.update(override)
    return e


def lines(events):
    return [json.dumps(e, sort_keys=True) for e in events]


def day1():
    ev = [event(i, 1) for i in range(1, 301)]
    # a negative amount, an unknown status, an unknown store, and a duplicate of order 7
    ev += [
        event(301, 1, amount_cents=-500),
        event(302, 1, status='LOST'),
        event(303, 1, store_id=99),
        event(7, 1),
    ]
    # a line that is cut in the middle
    cut = '{"order_id": 304, "store_id": 3, "status": "PLAC'
    return lines(ev) + [cut]


def day2():
    new = lines([event(i, 2) for i in range(305, 421)])
    # 40 orders ship, and order 41 is refunded
    shipped = [event(i, 2, status='SHIPPED', minute=600 + i) for i in range(1, 41)]
    changes = lines(shipped + [event(41, 2, status='REFUNDED', minute=700)])
    # the first file of day 1 is delivered again
    return {'part-0002.json': new + changes, 'replay-part-0001.json': day1()}


def day3():
    ev = [event(i, 3) for i in range(421, 501)]
    for e in ev[:20]:
        # a new field that nobody announced
        e['coupon'] = 'SPRING'
    # two amounts that are text
    ev += [event(501, 3, amount_cents='12.50'), event(502, 3, amount_cents='9.99')]
    # an old event of order 5, delivered late
    ev.append(event(5, 1, minute=3))
    return lines(ev)


def files_for_day(day):
    """The files that arrive on a day, as a dict from the name of the file to its lines."""
    if day == 1:
        return {'part-0001.json': day1()}
    if day == 2:
        return day2()
    if day == 3:
        return {'part-0001.json': day3()}
    raise ValueError('the pretend source has three days')


def write_day(day, landing):
    """Writes the files of a day into the landing zone: landing/date=YYYY-MM-DD/<file>.

    Returns the paths.
    """
    folder = os.path.join(landing, 'date=' + when(day, 0)[:10])
    os.makedirs(folder, exist_ok=True)
    paths = []
    for name, content in sorted(files_for_day(day).items()):
        path = os.path.join(folder, name)
        with open(path, 'w') as f:
            f.write('\n'.join(content) + '\n')
        paths.append(path)
    return paths
