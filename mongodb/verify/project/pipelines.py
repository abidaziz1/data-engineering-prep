from rules import database

db = database()
orders = db.orders
by_sku = [
    {'$match': {'status': {'$ne': 'REFUNDED'}}},
    {'$unwind': '$lines'},
    {'$group': {'_id': '$lines.sku', 'units': {'$sum': '$lines.qty'}, 'revenue': {'$sum': {'$multiply': ['$lines.qty', '$lines.cents']}}}},
    {'$sort': {'_id': 1}},
]
for k in range(1, len(by_sku) + 1):
    print('after stage', k, list(by_sku[k - 1])[0], '->', len(list(orders.aggregate(by_sku[:k]))), 'documents')
for row in orders.aggregate(by_sku):
    print('sku', row['_id'], 'units', row['units'], 'revenue', row['revenue'])

by_store = [
    {'$match': {'status': {'$ne': 'REFUNDED'}}},
    {'$group': {'_id': '$store_id', 'orders': {'$sum': 1}, 'revenue': {'$sum': '$total_cents'}}},
    {'$sort': {'_id': 1}},
]
for row in list(orders.aggregate(by_store))[:3]:
    print('store', row['_id'], 'orders', row['orders'], 'revenue', row['revenue'])

by_region = by_store[:2] + [
    {'$lookup': {'from': 'stores', 'localField': '_id', 'foreignField': '_id', 'as': 'store'}},
    {'$unwind': '$store'},
    {'$group': {'_id': '$store.region', 'orders': {'$sum': '$orders'}, 'revenue': {'$sum': '$revenue'}}},
    {'$sort': {'_id': 1}},
]
for row in orders.aggregate(by_region):
    print('region', row['_id'], 'orders', row['orders'], 'revenue', row['revenue'])
