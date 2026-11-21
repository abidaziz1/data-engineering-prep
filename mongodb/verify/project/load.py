from rules import ORDERS, database, order, stores

db = database()
db.client.drop_database(db.name)
db.orders.insert_many(order(i) for i in range(1, ORDERS + 1))
db.stores.insert_many(stores())
print('orders:', db.orders.count_documents({}))
print('stores:', db.stores.count_documents({}))
print('one order:', db.orders.find_one({'_id': 'O-00007'}))
