"""Small helpers that the experiments share: made-up Brewline events, topics, a producer, a reader, and the arithmetic of the default partitioner.

Nothing here hides what Kafka does. The experiments call the Kafka client (confluent-kafka, which is librdkafka) and the command line tools of the distribution.
"""
import json
import time

from confluent_kafka import Consumer, KafkaException, Producer, TopicPartition
from confluent_kafka.admin import AdminClient, NewTopic

T0 = 1767225600000  # 2026-01-01 00:00:00 UTC, in milliseconds: the time of the first made-up event
STORES = ['s01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10', 's11', 's12']
# the share of the orders that each store sells; store s01 sells about a third of them (the same shape as the Spark course)
SHARE = [338, 80, 80, 81, 81, 70, 61, 60, 50, 40, 30, 29]


def store_of(i):
    """The store of order number i (0, 1, 2, ...). A fixed rule, so that every run writes the same events: the shares repeat every 1,000 orders."""
    r = (i * 389) % 1000          # 389 and 1000 share no factor, so this visits every remainder once in a thousand orders, in a scrambled order
    acc = 0
    for s, w in zip(STORES, SHARE):
        acc += w
        if r < acc:
            return s
    return STORES[-1]


def order(i):
    """The i-th order as an event: the value is JSON, the key is the store."""
    return {'order_id': i + 1, 'store_id': store_of(i), 'customer_id': None if i % 4 == 3 else 1000 + (i * 7) % 5250,
            'total_cents': 300 + (i * 37) % 500, 'status': 'paid' if i % 5 else 'refunded', 'channel': ('app', 'counter', 'web')[i % 3]}


def value(i):
    return json.dumps(order(i), separators=(',', ':'))


# ---- murmur2: the hash of the default partitioner of the Java client and of the console tools ---------------------------------------------------------------
def murmur2(data):
    length = len(data)
    seed = 0x9747b28c
    m = 0x5bd1e995
    r = 24
    h = (seed ^ length) & 0xffffffff
    i = 0
    for _ in range(length // 4):
        k = data[i] | (data[i + 1] << 8) | (data[i + 2] << 16) | (data[i + 3] << 24)
        k = (k * m) & 0xffffffff
        k ^= k >> r
        k = (k * m) & 0xffffffff
        h = (h * m) & 0xffffffff
        h ^= k
        i += 4
    rest = length % 4
    if rest == 3:
        h ^= data[i + 2] << 16
    if rest >= 2:
        h ^= data[i + 1] << 8
    if rest >= 1:
        h ^= data[i]
        h = (h * m) & 0xffffffff
    h ^= h >> 13
    h = (h * m) & 0xffffffff
    h ^= h >> 15
    return h


def partition_for(key, partitions):
    """What the default partitioner of the Java client does with a key: murmur2 of the bytes, made positive, modulo the number of partitions."""
    return (murmur2(key.encode() if isinstance(key, str) else key) & 0x7fffffff) % partitions


# ---- topics ----------------------------------------------------------------------------------------------------------------------------------------------
def admin(bootstrap):
    return AdminClient({'bootstrap.servers': bootstrap})


def create_topic(bootstrap, name, partitions=1, replication=1, config=None, assignment=None, wait=True):
    """Create a topic and wait until the cluster has made it. With an assignment (a list of replica lists) the placement is fixed, so every run is the same."""
    a = admin(bootstrap)
    if assignment is not None:
        nt = NewTopic(name, num_partitions=len(assignment), replication_factor=-1, replica_assignment=assignment, config=config or {})
    else:
        nt = NewTopic(name, num_partitions=partitions, replication_factor=replication, config=config or {})
    for f in a.create_topics([nt]).values():
        f.result(30)
    if wait:
        wait_for_leaders(bootstrap, name)


def delete_topics(bootstrap, names):
    """Delete topics if they exist (used when a section is run again on the same cluster)."""
    a = admin(bootstrap)
    have = set(a.list_topics(timeout=10).topics)
    todo = [n for n in names if n in have]
    if not todo:
        return
    for f in a.delete_topics(todo).values():
        f.result(30)
    t0 = time.time()
    while todo and time.time() - t0 < 30:
        todo = [n for n in todo if n in a.list_topics(timeout=10).topics]
        time.sleep(0.3)


def wait_for_leaders(bootstrap, name, timeout=30):
    a = admin(bootstrap)
    t0 = time.time()
    while time.time() - t0 < timeout:
        md = a.list_topics(name, timeout=10).topics.get(name)
        if md is not None and md.partitions and all(p.leader >= 0 for p in md.partitions.values()):
            return md
        time.sleep(0.2)
    raise TimeoutError('no leaders for ' + name)


def layout(bootstrap, name):
    """Leader, replicas and in-sync replicas of every partition, as rows [partition, leader, replicas, isr]."""
    md = admin(bootstrap).list_topics(name, timeout=10).topics[name]
    return [[p, md.partitions[p].leader, list(md.partitions[p].replicas), sorted(md.partitions[p].isrs)] for p in sorted(md.partitions)]


# ---- producing and reading ---------------------------------------------------------------------------------------------------------------------------------
def producer(bootstrap, **conf):
    c = {'bootstrap.servers': bootstrap, 'partitioner': 'murmur2_random', 'linger.ms': 5000, 'batch.num.messages': 100, 'queue.buffering.max.messages': 500000}
    c.update(conf)
    return Producer(c)


def send(p, topic, n, start=0, key=True, partition=None, timestamp=True, headers=None):
    """Send orders start .. start+n-1 and wait for every delivery report. Returns the orders and the (partition, offset) of each one, in order."""
    placed = {}

    def mk(i):
        def cb(err, msg):
            if err:
                raise KafkaException(err)
            placed[i] = (msg.partition(), msg.offset())
        return cb
    out = []
    for i in range(start, start + n):
        o = order(i)
        kw = {'key': o['store_id']} if key else {}
        if partition is not None:
            kw['partition'] = partition
        if timestamp:
            kw['timestamp'] = T0 + i * 1000
        if headers:
            kw['headers'] = headers
        p.produce(topic, value=json.dumps(o, separators=(',', ':')), callback=mk(i), **kw)
        out.append(o)
    p.flush(60)
    return out, [placed[i] for i in range(start, start + n)]


def consumer(bootstrap, group, **conf):
    c = {'bootstrap.servers': bootstrap, 'group.id': group, 'auto.offset.reset': 'earliest', 'enable.auto.commit': False, 'enable.partition.eof': True}
    c.update(conf)
    return Consumer(c)


def read_all(bootstrap, topic, partitions=None, isolation='read_uncommitted', timeout=30, group='reader'):
    """Read a topic from the beginning to the end of every partition. Returns the messages as (partition, offset, key, value, timestamp)."""
    c = consumer(bootstrap, group + '-' + str(time.time()), **{'isolation.level': isolation})
    md = c.list_topics(topic, timeout=10).topics[topic]
    parts = sorted(md.partitions) if partitions is None else partitions
    c.assign([TopicPartition(topic, p, 0) for p in parts])
    done, out, t0 = set(), [], time.time()
    while len(done) < len(parts) and time.time() - t0 < timeout:
        m = c.poll(0.5)
        if m is None:
            continue
        if m.error():
            if m.error().code() == -191:  # partition EOF
                done.add(m.partition())
                continue
            raise KafkaException(m.error())
        out.append((m.partition(), m.offset(), m.key().decode() if m.key() else None, m.value().decode() if m.value() is not None else None, m.timestamp()[1]))
    c.close()
    return out


def offsets(bootstrap, topic):
    """The first and the next offset of every partition: {partition: (earliest, latest)}."""
    c = consumer(bootstrap, 'offsets-' + str(time.time()))
    md = c.list_topics(topic, timeout=10).topics[topic]
    r = {p: c.get_watermark_offsets(TopicPartition(topic, p), timeout=10) for p in sorted(md.partitions)}
    c.close()
    return r
