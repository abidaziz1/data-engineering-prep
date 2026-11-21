"""Seven ways to load the orders: what each run wrote, and what the destination holds in the end."""
import tempfile

import source
import shop_pipeline as sp

CASES = [
    ('append, the same day twice', 'append', [1, 1], False),
    ('replace, the same day twice', 'replace', [1, 1], False),
    ('merge on id, the same day twice', 'merge', [1, 1], False),
    ('merge on id, day 1 then day 2, the whole list', 'merge', [1, 2], False),
    ('append with a cursor, day 1 then day 2', 'append', [1, 2], True),
    ('merge with a cursor, day 1 then day 2', 'merge', [1, 2], True),
    ('merge with a cursor, day 1, day 2, day 2 again', 'merge', [1, 2, 2], True),
]
work = tempfile.mkdtemp()
print('%-48s %-14s %-11s %-9s %s' % ('case', 'runs wrote', 'in the end', 'distinct', 'the shop holds'))
for k, (label, strategy, days, cursor) in enumerate(CASES):
    name = 'case%d' % k
    day = [1]
    p = sp.make_pipeline(name, work)
    resource = sp.orders_resource(strategy, day, cursor)
    wrote = []
    for d in days:
        day[0] = d
        wrote.append(sp.run(p, resource))
    rows, distinct = sp.totals(work, name)
    print('%-48s %-14s %-11d %-9d %d' % (label, ', '.join(map(str, wrote)), rows, distinct, len(source.orders_on(days[-1]))))
print()
name, day = 'case5', [2]
print('with a cursor, order 11 (deleted in the shop on day 2): still in the destination, %s' % (len(sp.query(work, name, 'select id from shop.orders where id = 11')) == 1))
print('with a cursor, order 12 (shipped on day 2, updated_at not moved): the shop says SHIPPED, the destination says', sp.query(work, name, 'select status from shop.orders where id = 12')[0][0])
print('with a cursor, orders shipped in the destination:', sp.query(work, name, "select count(*) from shop.orders where status = 'SHIPPED'")[0][0], 'of', sum(1 for o in source.orders_on(2).values() if o['status'] == 'SHIPPED'), 'in the shop')
