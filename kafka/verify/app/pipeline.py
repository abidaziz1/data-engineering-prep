"""A consume-transform-produce pipeline that reads orders from one topic and writes them to another, with exactly-once processing.

Each batch of ten orders is one transaction: the outputs and the position of the consumer are committed together, or not at all.
Run it as a script with --crash-in-batch N to make the process die in the middle of batch N, after its outputs were sent and before the transaction was committed.
"""
import argparse
import json
import os

from confluent_kafka import Consumer, Producer


def transform(value):
    """The made-up business rule: add the total in euros."""
    o = json.loads(value)
    o['total_eur'] = o['total_cents'] / 100
    return json.dumps(o, separators=(',', ':')).encode()


def run_pipeline(bootstrap, crash_in_batch=None, batch_size=10, transactional_id='tx-pipeline-1'):
    consumer = Consumer({'bootstrap.servers': bootstrap, 'group.id': 'tx-pipeline', 'auto.offset.reset': 'earliest', 'enable.auto.commit': False,
                         'isolation.level': 'read_committed', 'session.timeout.ms': 6000})
    producer = Producer({'bootstrap.servers': bootstrap, 'transactional.id': transactional_id, 'transaction.timeout.ms': 20000, 'linger.ms': 0})
    producer.init_transactions()                 # fences any older producer with the same transactional.id and aborts what it left open
    consumer.subscribe(['tx-in'])
    batch_no = 0
    while True:
        # the first wait is long: after a crash, the group has to notice that the old member is gone (the session timeout) before it hands out the partition again
        msgs = [m for m in consumer.consume(num_messages=batch_size, timeout=30 if batch_no == 0 else 5) if not m.error()]
        if not msgs:
            break
        batch_no += 1
        producer.begin_transaction()
        for m in msgs:
            producer.produce('tx-out', key=m.key(), value=transform(m.value()))
        producer.flush()
        if crash_in_batch == batch_no:
            os._exit(137)                        # the process dies here: the outputs are in the topic, the transaction is not finished
        producer.send_offsets_to_transaction(consumer.position(consumer.assignment()), consumer.consumer_group_metadata())
        producer.commit_transaction()
    consumer.close()
    return batch_no


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--bootstrap', required=True)
    ap.add_argument('--crash-in-batch', type=int)
    a = ap.parse_args()
    print('batches committed or crashed in:', run_pipeline(a.bootstrap, a.crash_in_batch))
