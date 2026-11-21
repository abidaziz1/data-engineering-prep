"""The first load: 100 orders from the shop API into DuckDB, and everything that dlt leaves behind."""
import tempfile

import shop_pipeline as sp

work = tempfile.mkdtemp()
p = sp.make_pipeline('first', work)
wrote = sp.run(p, sp.orders_resource('append', [1]))
print('orders written by the run:', wrote)
print('tables in the dataset shop:', ', '.join(t[0] for t in sp.query(work, 'first', "select table_name from information_schema.tables where table_schema = 'shop' order by 1")))
print()
print('columns of orders:')
for name, kind in sp.query(work, 'first', "select column_name, data_type from information_schema.columns where table_schema = 'shop' and table_name = 'orders' order by ordinal_position"):
    print('  %-16s %s' % (name, kind))
print()
rows = sp.query(work, 'first', "select count(*) from shop.orders__lines")[0][0]
print('orders__lines: %d rows, the lines of the orders' % rows)
print('order 5:', sp.query(work, 'first', "select id, status, total_cents, customer__id, customer__tier from shop.orders where id = 5")[0])
print('its lines:', sp.query(work, 'first', "select l._dlt_list_idx, l.sku, l.qty from shop.orders__lines l join shop.orders o on l._dlt_parent_id = o._dlt_id where o.id = 5 order by 1"))
print('_dlt_loads: %d row, status %d' % tuple(sp.query(work, 'first', "select count(*), min(status) from shop._dlt_loads")[0]))
