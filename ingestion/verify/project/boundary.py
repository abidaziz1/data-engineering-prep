"""The order that was shipped without a new updated_at (order 12), under four loads with a cursor: which one sees the change?"""
import tempfile

import dlt

import shop_pipeline as sp
import source

CASES = [('append, no key', 'append', False, 0), ('append, key id', 'append', True, 0), ('merge, key id', 'merge', True, 0), ('merge, key id, lag of one day', 'merge', True, 86400)]
work = tempfile.mkdtemp()
print('%-32s %-10s %-11s %s' % ('case', 'runs wrote', 'in the end', 'order 12 in the destination'))
for k, (label, strategy, key, lag) in enumerate(CASES):
    name, day = 'boundary%d' % k, [1]
    p = sp.make_pipeline(name, work)

    @dlt.resource(name='orders', write_disposition=strategy, **({'primary_key': 'id'} if key else {}))
    def orders(updated=dlt.sources.incremental('updated_at', initial_value=sp.START, lag=lag)):
        for page in source.get_orders(day[0], since=updated.last_value):
            yield page
    wrote = []
    for d in (1, 2):
        day[0] = d
        wrote.append(sp.run(p, orders))
    status = sp.query(work, name, "select string_agg(status, ', ' order by status) from shop.orders where id = 12")[0][0]
    print('%-32s %-10s %-11d %s' % (label, ', '.join(map(str, wrote)), sp.totals(work, name)[0], status))
