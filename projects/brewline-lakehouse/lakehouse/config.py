"""Paths and rules of the Brewline lakehouse.

Everything lives under one folder, LAKEHOUSE_HOME, so that a test or a run never touches
anything else.
"""

import os


def set_home(path):
    """Points every path at another folder.

    The modules read these names when they run, so a test can use a folder of its own.
    """
    global ROOT, LANDING, BRONZE, LEDGER, SILVER, QUARANTINE, GOLD
    ROOT = path
    LANDING = os.path.join(ROOT, 'landing', 'orders')
    BRONZE = os.path.join(ROOT, 'bronze', 'orders_raw')
    LEDGER = os.path.join(ROOT, 'bronze', 'ingested_files')
    SILVER = os.path.join(ROOT, 'silver', 'orders')
    QUARANTINE = os.path.join(ROOT, 'silver', 'quarantine')
    GOLD = os.path.join(ROOT, 'gold', 'daily_revenue')


set_home(os.environ.get('LAKEHOUSE_HOME', os.path.abspath('lakehouse_data')))

STORES = list(range(1, 13))
STATUSES = ['PLACED', 'SHIPPED', 'REFUNDED']
EXPECTED_FIELDS = ['order_id', 'store_id', 'status', 'amount_cents', 'event_time', 'lines']
