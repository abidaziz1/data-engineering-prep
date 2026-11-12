"""A consumer that is safe to run twice. After a restart, a consumer reads some messages again (at-least-once delivery), so applying a message must be harmless the second time.
Two rules do it: skip what was already applied (a position for each partition), and write by key, so that the same order always gives the same row."""
import json


def apply(batch, state, applied):
    """batch: messages with partition(), offset() and value(), like the messages of confluent-kafka.
    state: {order_id: total_cents}, the sink. applied: {partition: the highest offset that was applied}.
    Returns the messages that are not valid orders, so that the caller can set them aside."""
    bad = []
    for m in batch:
        if m.offset() <= applied.get(m.partition(), -1):
            continue                                    # seen before: a replay after a restart
        try:
            order = json.loads(m.value())
            order_id, cents = order['order_id'], order['total_cents']
        except (ValueError, KeyError, TypeError):
            bad.append(m)                               # set it aside, and go on with the rest
        else:
            state[order_id] = cents                     # write by key: the same order twice gives the same row
        applied[m.partition()] = m.offset()
    return bad
