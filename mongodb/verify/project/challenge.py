from rules import database

db = database()
top_stores = [
    {'$match': {'status': {'$ne': 'REFUNDED'}}},
    {'$group': {'_id': '$store_id', 'orders': {'$sum': 1}, 'revenue': {'$sum': '$total_cents'}}},
    {'$sort': {'revenue': -1, '_id': 1}},
    {'$limit': 3},
    {'$project': {'orders': 1, 'revenue': 1, 'average': {'$toInt': {'$floor': {'$divide': ['$revenue', '$orders']}}}}},
]
for row in db.orders.aggregate(top_stores):
    print('store', row['_id'], 'orders', row['orders'], 'revenue', row['revenue'], 'average', row['average'])
