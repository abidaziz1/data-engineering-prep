window.LAB = window.LAB || {};
LAB.real = {
 "counts": {
  "design": {
   "after_abort": 0,
   "after_commit": 1,
   "daily": 3,
   "inside": 1,
   "outside": 0,
   "payments_held": 1,
   "plain_insert_error_code": 11000,
   "upsert_first": [
    3,
    0,
    0
   ],
   "upsert_second": [
    0,
    3,
    0
   ]
  },
  "load": {
   "orders": 20000,
   "stores": 12
  },
  "pipeline": {
   "stage_counts": [
    19200,
    38400,
    4,
    4
   ],
   "stage_names": [
    "$match",
    "$unwind",
    "$group",
    "$sort"
   ]
  },
  "shapes": {
   "duplicate_code": 11000,
   "max_bson": 16777216,
   "missing_matches": "['O-2', 'O-4']",
   "null_matches": "['O-1', 'O-2', 'O-4']",
   "number_matches": "[]",
   "server_limit_bytes": 16793598,
   "sorted": "['O-1', 'O-2', 'O-3', 'O-4']",
   "string_matches": "['O-4']",
   "too_large_bytes": 17826044
  },
  "streams": {
   "events": [
    "insert O-1 full status=PLACED",
    "update O-1 changed {'status': 'SHIPPED'} full=None",
    "delete O-1 full=None"
   ],
   "fields": "['_id', 'clusterTime', 'documentKey', 'fullDocument', 'ns', 'operationType', 'wallTime']",
   "first_stream": "insert O-2 full status=PLACED",
   "resumed": [
    "update O-2 changed {'status': 'REFUNDED'} full=None",
    "delete O-2 full=None"
   ]
  }
 },
 "files": {
  "challenge.py": "from rules import database\n\ndb = database()\ntop_stores = [\n    {'$match': {'status': {'$ne': 'REFUNDED'}}},\n    {'$group': {'_id': '$store_id', 'orders': {'$sum': 1}, 'revenue': {'$sum': '$total_cents'}}},\n    {'$sort': {'revenue': -1, '_id': 1}},\n    {'$limit': 3},\n    {'$project': {'orders': 1, 'revenue': 1, 'average': {'$toInt': {'$floor': {'$divide': ['$revenue', '$orders']}}}}},\n]\nfor row in db.orders.aggregate(top_stores):\n    print('store', row['_id'], 'orders', row['orders'], 'revenue', row['revenue'], 'average', row['average'])\n",
  "design.py": "import os\n\nfrom pymongo import ReplaceOne, errors\n\nfrom rules import client\n\nconnection = client()\ndb = connection[os.environ.get('MONGO_DB', 'brewline')]\ndb.drop_collection('payments')\ndb.create_collection('payments', validator={'$jsonSchema': {\n    'bsonType': 'object',\n    'required': ['order_id', 'amount_cents', 'currency'],\n    'properties': {\n        'order_id': {'bsonType': 'string'},\n        'amount_cents': {'bsonType': 'int', 'minimum': 0},\n        'currency': {'enum': ['USD', 'EUR', 'GBP']},\n    },\n}})\ndb.payments.create_index('order_id', unique=True)\ntests = [\n    ('a valid payment', {'order_id': 'O-1', 'amount_cents': 1250, 'currency': 'USD'}),\n    ('amount as text', {'order_id': 'O-2', 'amount_cents': '12.50', 'currency': 'USD'}),\n    ('amount with decimals', {'order_id': 'O-3', 'amount_cents': 12.5, 'currency': 'USD'}),\n    ('negative amount', {'order_id': 'O-4', 'amount_cents': -5, 'currency': 'USD'}),\n    ('unknown currency', {'order_id': 'O-5', 'amount_cents': 100, 'currency': 'XXX'}),\n    ('missing currency', {'order_id': 'O-6', 'amount_cents': 100}),\n    ('same order again', {'order_id': 'O-1', 'amount_cents': 1250, 'currency': 'USD'}),\n]\nfor label, doc in tests:\n    try:\n        db.payments.insert_one(doc)\n        print('%s: inserted' % label)\n    except errors.WriteError as e:\n        print('%s: rejected, code %d (%s)' % (label, e.code, e.details['errmsg'].split(' - ')[0] if e.code == 11000 else e.details['errmsg']))\nprint('payments held:', db.payments.count_documents({}))\n\ndb.drop_collection('daily')\ndays = [{'_id': 'S-%d' % s, 'orders': 100 + s, 'revenue': 1000 * s} for s in (1, 2, 3)]\nwrite = [ReplaceOne({'_id': d['_id']}, d, upsert=True) for d in days]\nfor run in ('first', 'second'):\n    r = db.daily.bulk_write(write)\n    print('%s run of the upsert: upserted %d, matched %d, modified %d' % (run, r.upserted_count, r.matched_count, r.modified_count))\ndb.drop_collection('daily_plain')\ndb.daily_plain.insert_many(days)\ntry:\n    db.daily_plain.insert_many(days)\nexcept errors.BulkWriteError as e:\n    print('the same insert_many again: %d error, code %d (an ordered insert stops at the first)' % (len(e.details['writeErrors']), e.details['writeErrors'][0]['code']))\nprint('daily holds %d documents, daily_plain holds %d' % (db.daily.count_documents({}), db.daily_plain.count_documents({})))\n\ndb.drop_collection('transfers')\ndb.create_collection('transfers')\nwith connection.start_session() as session:\n    with session.start_transaction():\n        db.transfers.insert_one({'_id': 1}, session=session)\n        print('inside the transaction: %d, seen from outside: %d' % (db.transfers.count_documents({}, session=session), db.transfers.count_documents({})))\n        session.abort_transaction()\n    print('after abort: %d documents' % db.transfers.count_documents({}))\n    with session.start_transaction():\n        db.transfers.insert_one({'_id': 2}, session=session)\n    print('after commit: %d document' % db.transfers.count_documents({}))\n",
  "indexes.py": "from rules import database\n\ndb = database()\norders = db.orders\norders.drop_indexes()\n\n\ndef stages(plan):\n    out = []\n    plan = plan.get('queryPlan', plan)\n    while plan:\n        out.append(plan['stage'])\n        plan = plan.get('inputStage')\n    return ' > '.join(out)\n\n\ndef show(label, query, sort=None, projection=None):\n    command = {'find': 'orders', 'filter': query}\n    if sort:\n        command['sort'] = sort\n    if projection:\n        command['projection'] = projection\n    e = db.command('explain', command, verbosity='executionStats')\n    s = e['executionStats']\n    print('%s: %s, keys %d, documents %d, returned %d' % (label, stages(e['queryPlanner']['winningPlan']), s['totalKeysExamined'], s['totalDocsExamined'], s['nReturned']))\n\n\nquery = {'store_id': 3, 'status': 'REFUNDED'}\nshow('1 no index', query)\norders.create_index([('store_id', 1), ('status', 1)], name='store_status')\nshow('2 index (store_id, status)', query)\nnewest = {'store_id': 3, 'status': 'PLACED'}\nshow('3 same index, sorted by placed_at', newest, sort={'placed_at': 1})\norders.create_index([('store_id', 1), ('status', 1), ('placed_at', 1)], name='store_status_placed')\nshow('4 index (store_id, status, placed_at)', newest, sort={'placed_at': 1})\nshow('5 only the fields of the index', query, projection={'_id': 0, 'store_id': 1, 'status': 1})\nprint('indexes:', sorted(orders.index_information()))\n",
  "load.py": "from rules import ORDERS, database, order, stores\n\ndb = database()\ndb.client.drop_database(db.name)\ndb.orders.insert_many(order(i) for i in range(1, ORDERS + 1))\ndb.stores.insert_many(stores())\nprint('orders:', db.orders.count_documents({}))\nprint('stores:', db.stores.count_documents({}))\nprint('one order:', db.orders.find_one({'_id': 'O-00007'}))\n",
  "pipelines.py": "from rules import database\n\ndb = database()\norders = db.orders\nby_sku = [\n    {'$match': {'status': {'$ne': 'REFUNDED'}}},\n    {'$unwind': '$lines'},\n    {'$group': {'_id': '$lines.sku', 'units': {'$sum': '$lines.qty'}, 'revenue': {'$sum': {'$multiply': ['$lines.qty', '$lines.cents']}}}},\n    {'$sort': {'_id': 1}},\n]\nfor k in range(1, len(by_sku) + 1):\n    print('after stage', k, list(by_sku[k - 1])[0], '->', len(list(orders.aggregate(by_sku[:k]))), 'documents')\nfor row in orders.aggregate(by_sku):\n    print('sku', row['_id'], 'units', row['units'], 'revenue', row['revenue'])\n\nby_store = [\n    {'$match': {'status': {'$ne': 'REFUNDED'}}},\n    {'$group': {'_id': '$store_id', 'orders': {'$sum': 1}, 'revenue': {'$sum': '$total_cents'}}},\n    {'$sort': {'_id': 1}},\n]\nfor row in list(orders.aggregate(by_store))[:3]:\n    print('store', row['_id'], 'orders', row['orders'], 'revenue', row['revenue'])\n\nby_region = by_store[:2] + [\n    {'$lookup': {'from': 'stores', 'localField': '_id', 'foreignField': '_id', 'as': 'store'}},\n    {'$unwind': '$store'},\n    {'$group': {'_id': '$store.region', 'orders': {'$sum': '$orders'}, 'revenue': {'$sum': '$revenue'}}},\n    {'$sort': {'_id': 1}},\n]\nfor row in orders.aggregate(by_region):\n    print('region', row['_id'], 'orders', row['orders'], 'revenue', row['revenue'])\n",
  "rules.py": "\"\"\"The Brewline data of the MongoDB course, built from fixed rules (no random numbers), and the connection that every program uses.\"\"\"\nimport datetime\nimport os\n\nfrom pymongo import MongoClient\n\nSKUS = [('MUG', 900), ('BEANS-250', 1800), ('FILTER', 350), ('GRINDER', 4900)]\nREGIONS = ['north', 'south', 'east']\nORDERS = 20000\n\n\ndef client():\n    return MongoClient(os.environ.get('MONGO_URI', 'mongodb://127.0.0.1:27017/?directConnection=true'), serverSelectionTimeoutMS=30000)\n\n\ndef database():\n    return client()[os.environ.get('MONGO_DB', 'brewline')]\n\n\ndef order(i):\n    lines = [{'sku': SKUS[(i + k) % 4][0], 'qty': 1 + (i + k) % 3, 'cents': SKUS[(i + k) % 4][1]} for k in range(1 + i % 3)]\n    return {\n        '_id': 'O-%05d' % i,\n        'store_id': 1 + (i * 7) % 12,\n        'status': 'REFUNDED' if i % 25 == 0 else 'SHIPPED' if i % 7 == 0 else 'PLACED',\n        'placed_at': datetime.datetime(2026, 3, 1 + i % 28, i % 24, (i * 11) % 60),\n        'customer': {'id': 'C-%03d' % (1 + (i * 13) % 400), 'tier': ['bronze', 'silver', 'gold'][i % 3]},\n        'lines': lines,\n        'total_cents': sum(l['qty'] * l['cents'] for l in lines),\n    }\n\n\ndef stores():\n    return [{'_id': s, 'name': 'Store %d' % s, 'region': REGIONS[s % 3]} for s in range(1, 13)]\n",
  "shapes.py": "from pymongo import errors\n\nfrom rules import database\n\ndb = database()\ndb.drop_collection('shapes')\nshapes = db.shapes\nshapes.insert_many([\n    {'_id': 'O-1', 'n': 1, 'coupon': None},\n    {'_id': 'O-2', 'n': 2},\n    {'_id': 'O-3', 'n': 3, 'coupon': 'SPRING'},\n    {'_id': 'O-4', 'n': '4'},\n])\n\n\ndef ids(cursor):\n    return [d['_id'] for d in cursor]\n\n\nprint('coupon is null:', ids(shapes.find({'coupon': None})))\nprint('coupon does not exist:', ids(shapes.find({'coupon': {'$exists': False}})))\nprint('n = 4 (a number):', ids(shapes.find({'n': 4})))\nprint('n = \"4\" (a string):', ids(shapes.find({'n': '4'})))\nprint('sorted by n:', ids(shapes.find().sort('n', 1)))\ntry:\n    shapes.insert_one({'_id': 'O-1'})\nexcept errors.DuplicateKeyError as e:\n    print('same _id twice: code', e.code, '-', e.details['errmsg'])\ntry:\n    shapes.insert_one({'_id': 'big', 'text': 'a' * (17 * 1024 * 1024)})\nexcept errors.DocumentTooLarge as e:\n    print('a 17 MB document:', e)\nprint('largest document the server accepts:', db.client.admin.command('hello')['maxBsonObjectSize'], 'bytes')\n",
  "streams.py": "from rules import database\n\ndb = database()\ndb.drop_collection('changes')\ndb.create_collection('changes')\ncoll = db.changes\n\n\ndef describe(e):\n    changed = e.get('updateDescription', {}).get('updatedFields')\n    full = e.get('fullDocument')\n    return '%s %s%s%s' % (e['operationType'], e['documentKey']['_id'], ' changed %s' % changed if changed else '', ' full status=%s' % full['status'] if full else ' full=None')\n\n\nwith coll.watch(full_document='updateLookup') as stream:\n    coll.insert_one({'_id': 'O-1', 'status': 'PLACED', 'total_cents': 1250})\n    coll.update_one({'_id': 'O-1'}, {'$set': {'status': 'SHIPPED'}})\n    coll.delete_one({'_id': 'O-1'})\n    events = [stream.next() for _ in range(3)]\nfor e in events:\n    print('event:', describe(e))\nprint('fields of an event:', sorted(events[0]))\n\nwith coll.watch(full_document='updateLookup') as stream:\n    coll.insert_one({'_id': 'O-2', 'status': 'PLACED', 'total_cents': 900})\n    first = stream.next()\n    token = stream.resume_token\nprint('first stream saw:', describe(first))\ncoll.update_one({'_id': 'O-2'}, {'$set': {'status': 'REFUNDED'}})\ncoll.delete_one({'_id': 'O-2'})\nprint('written while nobody was watching: update, delete')\nwith coll.watch(resume_after=token, full_document='updateLookup') as stream:\n    for _ in range(2):\n        print('resumed from the token:', describe(stream.next()))\n"
 },
 "meta": {
  "image": "mongo:8.0",
  "mongod": "8.0.38",
  "note": "Recorded by mongodb/verify/capture_mongodb.py on a real mongod in a Docker container (a one-member replica set). A sharded cluster and Atlas were not used.",
  "pymongo": "4.20.1",
  "recorded_on": "2026-11-21"
 },
 "tables": {
  "challenge.top": {
   "cols": [
    "store",
    "orders",
    "revenue",
    "average"
   ],
   "rows": [
    [
     6,
     1600,
     30720000,
     19200
    ],
    [
     12,
     1600,
     24880000,
     15550
    ],
    [
     11,
     1600,
     24640000,
     15400
    ]
   ]
  },
  "design.validation": {
   "cols": [
    "case",
    "result",
    "message"
   ],
   "rows": [
    [
     "a valid payment",
     "inserted",
     ""
    ],
    [
     "amount as text",
     "code 121",
     "Document failed validation"
    ],
    [
     "amount with decimals",
     "code 121",
     "Document failed validation"
    ],
    [
     "negative amount",
     "code 121",
     "Document failed validation"
    ],
    [
     "unknown currency",
     "code 121",
     "Document failed validation"
    ],
    [
     "missing currency",
     "code 121",
     "Document failed validation"
    ],
    [
     "same order again",
     "code 11000",
     "E11000 duplicate key error collection: brewline.payments index: order_id_1 dup key: { order_id: \"O-1\" }"
    ]
   ]
  },
  "index.cases": {
   "cols": [
    "case",
    "what",
    "plan",
    "keys",
    "documents",
    "returned"
   ],
   "rows": [
    [
     "1",
     "no index",
     "COLLSCAN",
     0,
     20000,
     67
    ],
    [
     "2",
     "index (store_id, status)",
     "FETCH > IXSCAN",
     67,
     67,
     67
    ],
    [
     "3",
     "same index, sorted by placed_at",
     "SORT > FETCH > IXSCAN",
     1372,
     1372,
     1372
    ],
    [
     "4",
     "index (store_id, status, placed_at)",
     "FETCH > IXSCAN",
     1372,
     1372,
     1372
    ],
    [
     "5",
     "only the fields of the index",
     "PROJECTION_COVERED > IXSCAN",
     67,
     0,
     67
    ]
   ]
  },
  "pipeline.region": {
   "cols": [
    "region",
    "orders",
    "revenue"
   ],
   "rows": [
    [
     "east",
     6400,
     63600000
    ],
    [
     "north",
     6400,
     76320000
    ],
    [
     "south",
     6400,
     12720000
    ]
   ]
  },
  "pipeline.sku": {
   "cols": [
    "sku",
    "units",
    "revenue"
   ],
   "rows": [
    [
     "BEANS-250",
     19200,
     34560000
    ],
    [
     "FILTER",
     19200,
     6720000
    ],
    [
     "GRINDER",
     19200,
     94080000
    ],
    [
     "MUG",
     19200,
     17280000
    ]
   ]
  },
  "pipeline.store": {
   "cols": [
    "store",
    "orders",
    "revenue"
   ],
   "rows": [
    [
     1,
     1600,
     1440000
    ],
    [
     2,
     1600,
     20000000
    ],
    [
     3,
     1600,
     12400000
    ]
   ]
  }
 },
 "text": {
  "challenge.run": "python challenge.py\nstore 6 orders 1600 revenue 30720000 average 19200\nstore 12 orders 1600 revenue 24880000 average 15550\nstore 11 orders 1600 revenue 24640000 average 15400",
  "design.run": "python design.py\na valid payment: inserted\namount as text: rejected, code 121 (Document failed validation)\namount with decimals: rejected, code 121 (Document failed validation)\nnegative amount: rejected, code 121 (Document failed validation)\nunknown currency: rejected, code 121 (Document failed validation)\nmissing currency: rejected, code 121 (Document failed validation)\nsame order again: rejected, code 11000 (E11000 duplicate key error collection: brewline.payments index: order_id_1 dup key: { order_id: \"O-1\" })\npayments held: 1\nfirst run of the upsert: upserted 3, matched 0, modified 0\nsecond run of the upsert: upserted 0, matched 3, modified 0\nthe same insert_many again: 1 error, code 11000 (an ordered insert stops at the first)\ndaily holds 3 documents, daily_plain holds 3\ninside the transaction: 1, seen from outside: 0\nafter abort: 0 documents\nafter commit: 1 document",
  "indexes.run": "python indexes.py\n1 no index: COLLSCAN, keys 0, documents 20000, returned 67\n2 index (store_id, status): FETCH > IXSCAN, keys 67, documents 67, returned 67\n3 same index, sorted by placed_at: SORT > FETCH > IXSCAN, keys 1372, documents 1372, returned 1372\n4 index (store_id, status, placed_at): FETCH > IXSCAN, keys 1372, documents 1372, returned 1372\n5 only the fields of the index: PROJECTION_COVERED > IXSCAN, keys 67, documents 0, returned 67\nindexes: ['_id_', 'store_status', 'store_status_placed']",
  "load.run": "python load.py\norders: 20000\nstores: 12\none order: {'_id': 'O-00007', 'store_id': 2, 'status': 'SHIPPED', 'placed_at': datetime(2026, 3, 8, 7, 17), 'customer': {'id': 'C-092', 'tier': 'silver'}, 'lines': [{'sku': 'GRINDER', 'qty': 2, 'cents': 4900}, {'sku': 'MUG', 'qty': 3, 'cents': 900}], 'total_cents': 12500}",
  "pipelines.run": "python pipelines.py\nafter stage 1 $match -> 19200 documents\nafter stage 2 $unwind -> 38400 documents\nafter stage 3 $group -> 4 documents\nafter stage 4 $sort -> 4 documents\nsku BEANS-250 units 19200 revenue 34560000\nsku FILTER units 19200 revenue 6720000\nsku GRINDER units 19200 revenue 94080000\nsku MUG units 19200 revenue 17280000\nstore 1 orders 1600 revenue 1440000\nstore 2 orders 1600 revenue 20000000\nstore 3 orders 1600 revenue 12400000\nregion east orders 6400 revenue 63600000\nregion north orders 6400 revenue 76320000\nregion south orders 6400 revenue 12720000",
  "shapes.run": "python shapes.py\ncoupon is null: ['O-1', 'O-2', 'O-4']\ncoupon does not exist: ['O-2', 'O-4']\nn = 4 (a number): []\nn = \"4\" (a string): ['O-4']\nsorted by n: ['O-1', 'O-2', 'O-3', 'O-4']\nsame _id twice: code 11000 - E11000 duplicate key error collection: brewline.shapes index: _id_ dup key: { _id: \"O-1\" }\na 17 MB document: BSON document too large (17826044 bytes) - the connected server supports BSON document sizes up to 16793598 bytes.\nlargest document the server accepts: 16777216 bytes",
  "streams.run": "python streams.py\nevent: insert O-1 full status=PLACED\nevent: update O-1 changed {'status': 'SHIPPED'} full=None\nevent: delete O-1 full=None\nfields of an event: ['_id', 'clusterTime', 'documentKey', 'fullDocument', 'ns', 'operationType', 'wallTime']\nfirst stream saw: insert O-2 full status=PLACED\nwritten while nobody was watching: update, delete\nresumed from the token: update O-2 changed {'status': 'REFUNDED'} full=None\nresumed from the token: delete O-2 full=None",
  "tool.versions": "mongod --version (the image mongo:8.0)\nMongoDB 8.0.38\n\nthe driver: pymongo 4.20.1"
 }
};
