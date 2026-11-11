import os
import uuid

import pytest
from confluent_kafka import Producer
from confluent_kafka.admin import AdminClient, NewTopic


@pytest.fixture(scope='session')
def bootstrap():
    """The tests that need a broker run against the one that KAFKA_BOOTSTRAP names, and are skipped when it is not set."""
    value = os.environ.get('KAFKA_BOOTSTRAP')
    if not value:
        pytest.skip('KAFKA_BOOTSTRAP is not set')
    return value


@pytest.fixture
def topic(bootstrap):
    """A topic of its own for each test, so that tests do not see each other's records."""
    name = 'test-' + uuid.uuid4().hex[:8]
    admin = AdminClient({'bootstrap.servers': bootstrap})          # keep the client alive until the topic exists
    for f in admin.create_topics([NewTopic(name, num_partitions=2, replication_factor=1)]).values():
        f.result(30)
    return name


@pytest.fixture
def send(bootstrap):
    def _send(topic, items):
        p = Producer({'bootstrap.servers': bootstrap})
        for key, value in items:
            p.produce(topic, key=key, value=value)
        p.flush(30)
    return _send
