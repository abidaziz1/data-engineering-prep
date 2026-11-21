import json
import pathlib
import sys

import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from cdc import config  # noqa: E402
from cdc.spark import session  # noqa: E402


@pytest.fixture(scope='session')
def spark():
    # no Kafka or Postgres package: these tests need only Delta Lake
    return session('brewline-cdc-tests', packages=False)


@pytest.fixture()
def home(tmp_path):
    """A pipeline folder of its own for one test."""
    config.set_home(str(tmp_path))
    return tmp_path


def event(op, order_id, lsn, **row):
    """The text of a Debezium change event for an order, as the JSON converter writes it."""
    fields = {'id': order_id, 'store_id': 3, 'status': 'PLACED', 'amount_cents': 1200}
    fields.update(updated_at='2026-03-01T10:00:00.000000Z')
    fields.update(row)
    after = None if op == 'd' else fields
    before = {'id': order_id} if op == 'd' else None
    envelope = {'before': before, 'after': after, 'source': {'lsn': lsn, 'snapshot': 'false'}}
    return json.dumps(dict(envelope, op=op))


def batch(spark, *events, first_offset=0):
    """A DataFrame like a micro-batch of bronze: the offset and the text of each message."""
    rows = [(first_offset + i, text) for i, text in enumerate(events)]
    return spark.createDataFrame(rows, 'offset long, value string')
