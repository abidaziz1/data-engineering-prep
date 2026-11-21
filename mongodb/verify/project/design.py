import os

from pymongo import ReplaceOne, errors

from rules import client

connection = client()
db = connection[os.environ.get('MONGO_DB', 'brewline')]
db.drop_collection('payments')
db.create_collection('payments', validator={'$jsonSchema': {
    'bsonType': 'object',
    'required': ['order_id', 'amount_cents', 'currency'],
    'properties': {
        'order_id': {'bsonType': 'string'},
        'amount_cents': {'bsonType': 'int', 'minimum': 0},
        'currency': {'enum': ['USD', 'EUR', 'GBP']},
    },
}})
db.payments.create_index('order_id', unique=True)
tests = [
    ('a valid payment', {'order_id': 'O-1', 'amount_cents': 1250, 'currency': 'USD'}),
    ('amount as text', {'order_id': 'O-2', 'amount_cents': '12.50', 'currency': 'USD'}),
    ('amount with decimals', {'order_id': 'O-3', 'amount_cents': 12.5, 'currency': 'USD'}),
    ('negative amount', {'order_id': 'O-4', 'amount_cents': -5, 'currency': 'USD'}),
    ('unknown currency', {'order_id': 'O-5', 'amount_cents': 100, 'currency': 'XXX'}),
    ('missing currency', {'order_id': 'O-6', 'amount_cents': 100}),
    ('same order again', {'order_id': 'O-1', 'amount_cents': 1250, 'currency': 'USD'}),
]
for label, doc in tests:
    try:
        db.payments.insert_one(doc)
        print('%s: inserted' % label)
    except errors.WriteError as e:
        print('%s: rejected, code %d (%s)' % (label, e.code, e.details['errmsg'].split(' - ')[0] if e.code == 11000 else e.details['errmsg']))
print('payments held:', db.payments.count_documents({}))

db.drop_collection('daily')
days = [{'_id': 'S-%d' % s, 'orders': 100 + s, 'revenue': 1000 * s} for s in (1, 2, 3)]
write = [ReplaceOne({'_id': d['_id']}, d, upsert=True) for d in days]
for run in ('first', 'second'):
    r = db.daily.bulk_write(write)
    print('%s run of the upsert: upserted %d, matched %d, modified %d' % (run, r.upserted_count, r.matched_count, r.modified_count))
db.drop_collection('daily_plain')
db.daily_plain.insert_many(days)
try:
    db.daily_plain.insert_many(days)
except errors.BulkWriteError as e:
    print('the same insert_many again: %d error, code %d (an ordered insert stops at the first)' % (len(e.details['writeErrors']), e.details['writeErrors'][0]['code']))
print('daily holds %d documents, daily_plain holds %d' % (db.daily.count_documents({}), db.daily_plain.count_documents({})))

db.drop_collection('transfers')
db.create_collection('transfers')
with connection.start_session() as session:
    with session.start_transaction():
        db.transfers.insert_one({'_id': 1}, session=session)
        print('inside the transaction: %d, seen from outside: %d' % (db.transfers.count_documents({}, session=session), db.transfers.count_documents({})))
        session.abort_transaction()
    print('after abort: %d documents' % db.transfers.count_documents({}))
    with session.start_transaction():
        db.transfers.insert_one({'_id': 2}, session=session)
    print('after commit: %d document' % db.transfers.count_documents({}))
