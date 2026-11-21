"""The Brewline data of the MongoDB course, built from fixed rules (no random numbers), and the connection that every program uses."""
import datetime
import os

from pymongo import MongoClient

SKUS = [('MUG', 900), ('BEANS-250', 1800), ('FILTER', 350), ('GRINDER', 4900)]
REGIONS = ['north', 'south', 'east']
ORDERS = 20000


def client():
    return MongoClient(os.environ.get('MONGO_URI', 'mongodb://127.0.0.1:27017/?directConnection=true'), serverSelectionTimeoutMS=30000)


def database():
    return client()[os.environ.get('MONGO_DB', 'brewline')]


def order(i):
    lines = [{'sku': SKUS[(i + k) % 4][0], 'qty': 1 + (i + k) % 3, 'cents': SKUS[(i + k) % 4][1]} for k in range(1 + i % 3)]
    return {
        '_id': 'O-%05d' % i,
        'store_id': 1 + (i * 7) % 12,
        'status': 'REFUNDED' if i % 25 == 0 else 'SHIPPED' if i % 7 == 0 else 'PLACED',
        'placed_at': datetime.datetime(2026, 3, 1 + i % 28, i % 24, (i * 11) % 60),
        'customer': {'id': 'C-%03d' % (1 + (i * 13) % 400), 'tier': ['bronze', 'silver', 'gold'][i % 3]},
        'lines': lines,
        'total_cents': sum(l['qty'] * l['cents'] for l in lines),
    }


def stores():
    return [{'_id': s, 'name': 'Store %d' % s, 'region': REGIONS[s % 3]} for s in range(1, 13)]
