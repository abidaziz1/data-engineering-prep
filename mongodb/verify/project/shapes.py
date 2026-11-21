from pymongo import errors

from rules import database

db = database()
db.drop_collection('shapes')
shapes = db.shapes
shapes.insert_many([
    {'_id': 'O-1', 'n': 1, 'coupon': None},
    {'_id': 'O-2', 'n': 2},
    {'_id': 'O-3', 'n': 3, 'coupon': 'SPRING'},
    {'_id': 'O-4', 'n': '4'},
])


def ids(cursor):
    return [d['_id'] for d in cursor]


print('coupon is null:', ids(shapes.find({'coupon': None})))
print('coupon does not exist:', ids(shapes.find({'coupon': {'$exists': False}})))
print('n = 4 (a number):', ids(shapes.find({'n': 4})))
print('n = "4" (a string):', ids(shapes.find({'n': '4'})))
print('sorted by n:', ids(shapes.find().sort('n', 1)))
try:
    shapes.insert_one({'_id': 'O-1'})
except errors.DuplicateKeyError as e:
    print('same _id twice: code', e.code, '-', e.details['errmsg'])
try:
    shapes.insert_one({'_id': 'big', 'text': 'a' * (17 * 1024 * 1024)})
except errors.DocumentTooLarge as e:
    print('a 17 MB document:', e)
print('largest document the server accepts:', db.client.admin.command('hello')['maxBsonObjectSize'], 'bytes')
