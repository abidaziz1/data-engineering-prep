"""The coding round: load the orders so that a day can be loaded again without a duplicate, and only what changed is read."""
import tempfile

import dlt

import shop_pipeline as sp
import source

START = sp.START
day = [1]

# --- your answer starts here ---
@dlt.resource(name='orders', write_disposition='merge', primary_key='id')
def orders(updated=dlt.sources.incremental('updated_at', initial_value=START)):
    for page in source.get_orders(day[0], since=updated.last_value):
        yield page
# --- your answer ends here ---


work = tempfile.mkdtemp()
p = sp.make_pipeline('challenge', work)
for d in (1, 2, 3, 3):
    day[0] = d
    p.run(orders())
    wrote = p.last_trace.last_normalize_info.row_counts.get('orders', 0)
    print('day %d: wrote %d, destination holds %d rows (%d distinct orders)' % ((d, wrote) + sp.totals(work, 'challenge')))
