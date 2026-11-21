"""State and backfills: where dlt remembers the cursor, and what a repeated load or a window of old data does."""
import tempfile

import dlt

import shop_pipeline as sp

work = tempfile.mkdtemp()
day = [1]
p = sp.make_pipeline('state', work)
resource = sp.orders_resource('merge', day, True)
for d in (1, 2):
    day[0] = d
    sp.run(p, resource)
cursor = p.state['sources']['state']['resources']['orders']['incremental']['updated_at']
print('the cursor after day 2: last_value =', cursor['last_value'])
print('rows at the cursor that dlt remembers:', len(cursor['unique_hashes']))
print('loads recorded in the destination:', sp.query(work, 'state', 'select count(*) from shop._dlt_loads')[0][0])
fresh = sp.make_pipeline('state', work, 'dlt-fresh')
day[0] = 2
print('a new working folder, the same destination, day 2 again: wrote', sp.run(fresh, resource))
print()
for strategy in ('append', 'merge'):
    name = 'window_' + strategy
    q = sp.make_pipeline(name, work)
    day[0] = 1
    sp.run(q, sp.orders_resource(strategy, day, True))
    day[0] = 2
    wrote = []
    for _ in range(2):
        @dlt.resource(name='orders', write_disposition=strategy, **({'primary_key': 'id'} if strategy == 'merge' else {}))
        def window(updated=dlt.sources.incremental('updated_at', initial_value='2026-03-02T00:00:00+00:00', end_value='2026-03-03T00:00:00+00:00')):
            import source
            for page in source.get_orders(day[0], since=updated.start_value):
                yield page
        wrote.append(sp.run(q, window))
    rows, distinct = sp.totals(work, name)
    print('a window of day 2 loaded twice with %s: wrote %s, %d rows, %d distinct orders' % (strategy, ', '.join(map(str, wrote)), rows, distinct))
