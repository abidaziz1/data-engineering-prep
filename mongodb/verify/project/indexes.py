from rules import database

db = database()
orders = db.orders
orders.drop_indexes()


def stages(plan):
    out = []
    plan = plan.get('queryPlan', plan)
    while plan:
        out.append(plan['stage'])
        plan = plan.get('inputStage')
    return ' > '.join(out)


def show(label, query, sort=None, projection=None):
    command = {'find': 'orders', 'filter': query}
    if sort:
        command['sort'] = sort
    if projection:
        command['projection'] = projection
    e = db.command('explain', command, verbosity='executionStats')
    s = e['executionStats']
    print('%s: %s, keys %d, documents %d, returned %d' % (label, stages(e['queryPlanner']['winningPlan']), s['totalKeysExamined'], s['totalDocsExamined'], s['nReturned']))


query = {'store_id': 3, 'status': 'REFUNDED'}
show('1 no index', query)
orders.create_index([('store_id', 1), ('status', 1)], name='store_status')
show('2 index (store_id, status)', query)
newest = {'store_id': 3, 'status': 'PLACED'}
show('3 same index, sorted by placed_at', newest, sort={'placed_at': 1})
orders.create_index([('store_id', 1), ('status', 1), ('placed_at', 1)], name='store_status_placed')
show('4 index (store_id, status, placed_at)', newest, sort={'placed_at': 1})
show('5 only the fields of the index', query, projection={'_id': 0, 'store_id': 1, 'status': 1})
print('indexes:', sorted(orders.index_information()))
