"""Totals of paid orders for each store, from the messages of a topic. The part that decides what a message means is a plain function, so that it can be tested without a broker."""
import json
from collections import defaultdict

from confluent_kafka import Consumer, TopicPartition


def total_by_store(messages):
    """messages: objects with a value() method, like the messages of confluent-kafka. Returns ({store: cents of paid orders}, the messages that are not JSON)."""
    totals, bad = defaultdict(int), []
    for m in messages:
        try:
            order = json.loads(m.value())
        except (ValueError, TypeError):
            bad.append(m)
            continue
        if order.get('status') != 'paid':
            continue                      # a refunded order is not a sale
        totals[order['store_id']] += order['total_cents']
    return dict(totals), bad


def read_topic(bootstrap, topic, group, timeout=20):
    """Read every message of a topic, from the start to the end of each partition."""
    c = Consumer({'bootstrap.servers': bootstrap, 'group.id': group, 'auto.offset.reset': 'earliest', 'enable.auto.commit': False, 'enable.partition.eof': True})
    parts = sorted(c.list_topics(topic, timeout=10).topics[topic].partitions)
    c.assign([TopicPartition(topic, p, 0) for p in parts])
    out, done = [], set()
    import time
    t0 = time.time()
    while len(done) < len(parts) and time.time() - t0 < timeout:
        m = c.poll(0.5)
        if m is None:
            continue
        if m.error():
            if m.error().code() == -191:           # the end of a partition
                done.add(m.partition())
            continue
        out.append(m)
    c.close()
    return out
