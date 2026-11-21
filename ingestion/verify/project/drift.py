"""Day 3 brings new fields and a number sent as text. What happens to the destination under five rules (schema contracts)?"""
import tempfile

import shop_pipeline as sp

MODES = [('evolve (the default)', None), ("columns: freeze", {'columns': 'freeze'}), ("columns: discard_row", {'columns': 'discard_row'}),
         ("columns: discard_value", {'columns': 'discard_value'}), ("data_type: freeze", {'data_type': 'freeze'})]
work = tempfile.mkdtemp()
BASE = None
for k, (label, mode) in enumerate(MODES):
    name = 'drift%d' % k
    day = [1]
    p = sp.make_pipeline(name, work)
    resource = sp.orders_resource('merge', day, True)
    for d in (1, 2):
        day[0] = d
        sp.run(p, resource)
    before = {c[0] for c in sp.query(work, name, "select column_name from information_schema.columns where table_schema = 'shop' and table_name = 'orders'")}
    day[0] = 3
    try:
        wrote = sp.run(p, resource, **({'schema_contract': mode} if mode else {}))
        result = 'loaded %d' % wrote
        error = ''
    except Exception as e:                                           # noqa: BLE001
        cause = e
        while cause.__cause__ is not None:
            cause = cause.__cause__
        result, error = 'failed', str(cause).split('. ', 1)[-1].split(' Offending')[0].replace('\n', ' ').strip()
    after = [c[0] for c in sp.query(work, name, "select column_name from information_schema.columns where table_schema = 'shop' and table_name = 'orders' order by ordinal_position")]
    print('%s | %s | in the destination: %d | new columns: %s%s' % (label, result, sp.totals(work, name)[0], ', '.join(c for c in after if c not in before) or 'none', (' | ' + error) if error else ''))
    if k == 0:
        BASE = (work, name)
print()
w, n = BASE
for i in (111, 112, 116, 117):
    print('order %d under evolve:' % i, sp.query(w, n, 'select id, coupon, channel__name, channel__app__version, total_cents, total_cents__v_text from shop.orders where id = %d' % i)[0])
print('schema versions kept by dlt:', sp.query(w, n, 'select count(*) from shop._dlt_version')[0][0])
