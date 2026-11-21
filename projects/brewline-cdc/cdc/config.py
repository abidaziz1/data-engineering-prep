"""Where things are. Everything that the pipeline writes lives under one folder, CDC_HOME."""

import os

BOOTSTRAP = os.environ.get('KAFKA_BOOTSTRAP', 'localhost:9092')
TOPIC = os.environ.get('CDC_TOPIC', 'brewline.public.orders')

PG_HOST = os.environ.get('PGHOST', 'localhost')
PG_PORT = os.environ.get('PGPORT', '5432')
PG_URL = 'jdbc:postgresql://%s:%s/brewline' % (PG_HOST, PG_PORT)
PG_PROPERTIES = {'user': 'postgres', 'driver': 'org.postgresql.Driver'}

PACKAGES = [
    'org.apache.spark:spark-sql-kafka-0-10_2.13:4.0.1',
    'org.postgresql:postgresql:42.7.4',
]


def set_home(path):
    """Points every path at another folder, so that a test or a run uses a folder of its own."""
    global ROOT, BRONZE, SILVER, CHECKPOINTS
    ROOT = path
    BRONZE = os.path.join(ROOT, 'bronze', 'orders_events')
    SILVER = os.path.join(ROOT, 'silver', 'orders')
    CHECKPOINTS = os.path.join(ROOT, 'checkpoints')


set_home(os.environ.get('CDC_HOME', os.path.abspath('cdc_data')))
