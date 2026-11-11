"""Pub/Sub, in two parts.

Part 1 is the real client library, used offline: it shows the settings of a subscription and the defaults of the publisher and the subscriber.
Part 2 is a MODEL, written for these lessons from the documentation: a few rules (ack deadline, redelivery, dead letter after N attempts, order by key) that you can run
and count. The model is not Google's service. It has no backoff, no batching and no flow control, and it never loses a message. Real Pub/Sub will differ in detail.
"""
from google.cloud import pubsub_v1
from google.cloud.pubsub_v1 import types


def client_objects():
    """The settings that decide how a subscription behaves, as the library holds them."""
    sub = types.Subscription(
        name='projects/brewline-dev/subscriptions/orders-to-bq',
        topic='projects/brewline-dev/topics/pos-orders',
        ack_deadline_seconds=60,
        enable_message_ordering=True,
        enable_exactly_once_delivery=False,
        message_retention_duration={'seconds': 7 * 24 * 3600},
        retain_acked_messages=False,
        dead_letter_policy={'dead_letter_topic': 'projects/brewline-dev/topics/pos-orders-dead', 'max_delivery_attempts': 5},
        retry_policy={'minimum_backoff': {'seconds': 10}, 'maximum_backoff': {'seconds': 600}},
        expiration_policy={'ttl': {'seconds': 0}},
    )
    return types.Subscription.to_dict(sub)


def library_defaults():
    b = types.BatchSettings()
    f = types.FlowControl()
    return {'publisher_batch': {'max_bytes': b.max_bytes, 'max_latency_seconds': b.max_latency, 'max_messages': b.max_messages},
            'subscriber_flow_control': {'max_messages': f.max_messages, 'max_bytes': f.max_bytes, 'max_lease_duration_seconds': f.max_lease_duration,
                                        'min_duration_per_lease_extension': f.min_duration_per_lease_extension, 'max_duration_per_lease_extension': f.max_duration_per_lease_extension}}


def one_message():
    m = types.PubsubMessage(data=b'{"order_id": 7}', attributes={'store_id': 's01', 'source': 'pos'}, ordering_key='s01')
    return {'data_bytes': len(m.data), 'attributes': dict(m.attributes), 'ordering_key': m.ordering_key}


def publisher_with_ordering_options():
    """The publisher must be told that ordering is wanted, or a message with an ordering key is refused."""
    opts = pubsub_v1.types.PublisherOptions(enable_message_ordering=True)
    return {'enable_message_ordering': opts.enable_message_ordering}


# ---------------------------------------------------------------------------------------------------------------------------------------------------
# The model
# ---------------------------------------------------------------------------------------------------------------------------------------------------
class Msg:
    def __init__(self, mid, key=None, work=1, fails=0):
        self.id, self.key, self.work, self.fails = mid, key, work, fails     # work: seconds the handler needs. fails: how many deliveries fail first (-1 = always)
        self.deliveries = 0
        self.done_runs = 0
        self.state = 'pending'                                              # pending, acked, dead
        self.delivered_at = []


def simulate(messages, ack_deadline, max_attempts=None, ordered=False, extend_deadline=False, horizon=60):
    """Deliver the messages to one subscriber that can run any number of handlers at once. Time moves in whole seconds.

    A delivery starts a handler, which needs `work` seconds, or 1 second if it is going to fail. A handler that succeeds acks the message, if it is still waiting.
    A handler that fails nacks, and the message is delivered again at once. If the ack deadline runs out before the handler is done (and nothing extends it),
    the message is delivered again while the old handler runs on, so its side effect happens twice. After `max_attempts` deliveries a message is moved to the
    dead letter topic. With `ordered`, a message waits while an earlier message with the same key is still waiting.
    """
    for m in messages:
        m.deliveries, m.done_runs, m.state, m.delivered_at, m.next_at = 0, 0, 'pending', [], 0
    running = []                                        # (finish time, message, fails)
    for t in range(horizon + 1):
        for fin, m, fails in [r for r in running if r[0] == t]:
            running.remove((fin, m, fails))
            if fails:
                if m.state == 'pending':
                    m.next_at = t                         # a nack: deliver again at once
            else:
                m.done_runs += 1                          # the side effect happened
                if m.state == 'pending':
                    m.state, m.next_at = 'acked', None
        for i, m in enumerate(messages):
            if m.state != 'pending' or m.next_at != t:
                continue
            if ordered and m.key is not None and any(x.key == m.key and x.state == 'pending' for x in messages[:i]):
                m.next_at = t + 1                         # blocked behind an earlier message with the same key
                continue
            if max_attempts is not None and m.deliveries >= max_attempts:
                m.state, m.next_at = 'dead', None
                continue
            m.deliveries += 1
            m.delivered_at.append(t)
            fails = m.fails == -1 or m.deliveries <= m.fails
            running.append((t + (1 if fails else m.work), m, fails))
            if fails:
                m.next_at = None                          # the nack will say when
            elif m.work > ack_deadline and not extend_deadline:
                m.next_at = t + ack_deadline              # the deadline runs out first: delivered again
            else:
                m.next_at = None                          # the ack will come in time
    return [{'id': m.id, 'key': m.key, 'deliveries': m.deliveries, 'side_effects': m.done_runs, 'state': m.state, 'first_delivery': (m.delivered_at or [None])[0]} for m in messages]


def scenarios():
    """Six situations, each with a short story. The numbers come from simulate()."""
    out = []

    def add(name, story, msgs, **kw):
        res = simulate(msgs, **kw)
        out.append({'name': name, 'story': story, 'settings': kw, 'result': res})
    add('healthy', 'Three orders, each handled in 2 seconds, deadline 10.', [Msg('m1', work=2), Msg('m2', work=2), Msg('m3', work=2)], ack_deadline=10)
    add('slow handler', 'One order takes 35 seconds to handle. The deadline is 10 and nothing extends it (a push endpoint behaves like this).', [Msg('m1', work=35)], ack_deadline=10, horizon=100)
    add('deadline long enough', 'The same slow order, with a deadline of 60.', [Msg('m1', work=35)], ack_deadline=60)
    add('poison, no dead letter', 'One order always fails. Nothing limits the attempts. The model stops after 60 seconds.', [Msg('m1', fails=-1), Msg('m2', work=1)], ack_deadline=10)
    add('poison, dead letter after 5', 'The same, with max delivery attempts 5.', [Msg('m1', fails=-1), Msg('m2', work=1)], ack_deadline=10, max_attempts=5)
    add('ordering key blocks', 'Orders for store s01 must arrive in order. The first one always fails. Store s02 has no problem. No dead letter.',
        [Msg('a1', key='s01', fails=-1), Msg('a2', key='s01'), Msg('a3', key='s01'), Msg('b1', key='s02'), Msg('b2', key='s02')], ack_deadline=10, ordered=True, horizon=60)
    add('ordering key, dead letter after 5', 'The same, with max delivery attempts 5.',
        [Msg('a1', key='s01', fails=-1), Msg('a2', key='s01'), Msg('a3', key='s01'), Msg('b1', key='s02'), Msg('b2', key='s02')], ack_deadline=10, ordered=True, max_attempts=5, horizon=60)
    return out
