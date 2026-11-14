"""Mission 4: producers. What acks mean, what batching and compression do to the bytes on disk, what a producer does with an error, and what idempotence adds to a batch."""
import json
import time

from confluent_kafka import KafkaException, Producer

import cluster as C
import kx
from world import parse_dump

ON_NODE_1 = [[1]]


def log_files(c, topic):
    return sorted((c.data_dir(1) / (topic + '-0')).glob('*.log'))


def log_bytes(c, topic):
    return sum(f.stat().st_size for f in log_files(c, topic))


def batches(c, topic):
    out = []
    for f in log_files(c, topic):
        out += parse_dump(C.run_tool('kafka-dump-log', '--files', str(f))[1])
    return out


def acks_experiment(c, rec):
    """The same 1,000 orders with acks 0, 1 and all. The delivery report is what the producer learns about each one."""
    rows = []
    for acks in ('0', '1', 'all'):
        name = 'acks-' + acks
        kx.create_topic(c.bootstrap, name, assignment=[[1, 2, 3]], config={'retention.ms': '-1'})
        reports = []

        def cb(err, msg):
            reports.append((str(err) if err else None, msg.offset(), msg.partition()))
        p = kx.producer(c.bootstrap, **{'acks': acks, 'batch.num.messages': 100})
        for i in range(1000):
            p.produce(name, key=kx.order(i)['store_id'], value=kx.value(i), timestamp=kx.T0 + i * 1000, partition=0, callback=cb)
        p.flush(60)
        time.sleep(2)
        hi = kx.offsets(c.bootstrap, name)[0][1]
        known = lambda r: r[1] if r[1] is not None and r[1] >= 0 else 'unknown'
        rows.append([acks, len(reports), sum(1 for r in reports if r[0]), known(reports[0]), known(reports[-1]), hi,
                     {'0': 'nothing: the producer does not wait for the broker', '1': 'the leader wrote it', 'all': 'every in-sync replica wrote it'}[acks]])
    rec.table('producers.acks', ['acks', 'delivery reports', 'errors', 'offset in the first report', 'offset in the last report', 'records in the topic two seconds later',
                                 'what the report means'], rows)


def batching_experiment(c, rec):
    """The same 1,000 orders in batches of 1, 10, 100 and 1,000 records: how many batches are written, and how many bytes."""
    rows = []
    for size in (1, 10, 100, 1000):
        name = 'batch-%d' % size
        kx.create_topic(c.bootstrap, name, assignment=ON_NODE_1, config={'retention.ms': '-1'})
        p = kx.producer(c.bootstrap, **{'batch.num.messages': size, 'linger.ms': 10000})
        kx.send(p, name, 1000)
        b = batches(c, name)
        rows.append([size, len(b), log_bytes(c, name), round(log_bytes(c, name) / 1000, 1), 61 * len(b)])
    rec.table('producers.batching', ['records per batch', 'batches in the log', 'bytes in the log', 'bytes per record', 'bytes spent on batch headers'], rows)


def compression_experiment(c, rec):
    """The same 5,000 orders with every codec, 500 records to a batch. The broker keeps the batches as the producer sent them."""
    rows, base = [], None
    for codec in ('none', 'gzip', 'snappy', 'lz4', 'zstd'):
        name = 'codec-' + codec
        kx.create_topic(c.bootstrap, name, assignment=ON_NODE_1, config={'retention.ms': '-1'})
        p = kx.producer(c.bootstrap, **{'batch.num.messages': 500, 'linger.ms': 10000, 'compression.type': codec})
        kx.send(p, name, 5000)
        size = log_bytes(c, name)
        base = base or size
        b = batches(c, name)
        rows.append([codec, b[0]['compresscodec'], len(b), size, round(size / base, 2)])
    rec.table('producers.compression', ['codec asked for', 'codec in the batch header', 'batches', 'bytes in the log', 'share of the uncompressed size'], rows)


def error_experiment(c, rec):
    """What a producer reports when a send cannot work."""
    rows = []

    def attempt(label, topic, value, conf=None, timeout=60):
        got = []
        p = Producer(dict({'bootstrap.servers': c.bootstrap, 'linger.ms': 0}, **(conf or {})))
        try:
            p.produce(topic, key='s01', value=value, callback=lambda err, msg: got.append(err))
        except KafkaException as ex:           # some errors are raised by produce() itself, before anything is sent
            e = ex.args[0]
            rows.append([label, e.name(), e.str(), 'raised by produce(), nothing was sent'])
            return
        p.flush(timeout)
        e = got[0] if got else None
        rows.append([label, e.name() if e else 'delivered', e.str() if e else '', 'reported to the delivery callback' if e else ''])
    # too large for the producer's own limit (message.max.bytes is 1,000,000 bytes by default)
    kx.create_topic(c.bootstrap, 'err-big', assignment=[[1, 2, 3]], config={'max.message.bytes': '1000'})
    attempt('a 1.1 MB value, producer limit 1,000,000 bytes', 'err-big', b'x' * 1_100_000)
    # within the producer's limit, too large for the topic (max.message.bytes is 1,000 on this topic)
    attempt('a 5,000 byte value, topic limit 1,000 bytes', 'err-big', b'x' * 5000)
    # a topic that does not exist, with automatic creation switched off in the client (the brokers allow it, and so a default client would create the topic)
    attempt('a topic that does not exist (the client may not create it)', 'no-such-topic', kx.value(0), {'allow.auto.create.topics': False, 'message.timeout.ms': 6000}, 30)
    # a broker that cannot be reached
    got = []
    p = Producer({'bootstrap.servers': 'localhost:9', 'message.timeout.ms': 4000, 'socket.timeout.ms': 1000})
    p.produce('orders', value=kx.value(0), callback=lambda err, msg: got.append(err))
    p.flush(30)
    rows.append(['a broker that is not there (localhost:9)', got[0].name(), got[0].str(), 'reported to the delivery callback'])
    rec.table('producers.errors', ['what was tried', 'error name', 'what the producer says', 'how the program finds out'], rows)


def idempotence_experiment(c, rec):
    """The batches of an idempotent producer carry a producer id and a sequence number. The batches of the default producer of the client library do not."""
    kx.create_topic(c.bootstrap, 'idem-on', assignment=ON_NODE_1, config={'retention.ms': '-1'})
    kx.create_topic(c.bootstrap, 'idem-off', assignment=ON_NODE_1, config={'retention.ms': '-1'})
    kx.create_topic(c.bootstrap, 'idem-java', assignment=ON_NODE_1, config={'retention.ms': '-1'})
    kx.send(kx.producer(c.bootstrap, **{'enable.idempotence': True, 'batch.num.messages': 100}), 'idem-on', 300)
    kx.send(kx.producer(c.bootstrap, **{'enable.idempotence': False, 'batch.num.messages': 100}), 'idem-off', 300)
    rows = []
    ids = {}

    def pid(v):
        # the broker hands out producer ids in blocks, so the number differs from run to run: show a name for each id instead
        if v < 0:
            return -1
        return ids.setdefault(v, '<id %s>' % 'ABC'[len(ids)])
    for topic, label in (('idem-on', 'enable.idempotence=true (Python client)'), ('idem-off', 'enable.idempotence=false (Python client)')):
        for b in batches(c, topic):
            rows.append([label, b['baseOffset'], b['lastOffset'], pid(b['producerId']), b['producerEpoch'], b['baseSequence'], b['lastSequence']])
    # the console producer of the distribution is a Java client: what does it do by default?
    rc, out, err = C.run_tool('kafka-console-producer', '--bootstrap-server', c.bootstrap, '--topic', 'idem-java', input='a\nb\nc\n')
    for b in batches(c, 'idem-java'):
        rows.append(['kafka-console-producer (Java client), no settings', b['baseOffset'], b['lastOffset'], pid(b['producerId']), b['producerEpoch'], b['baseSequence'], b['lastSequence']])
    rec.table('producers.idempotence', ['producer', 'first offset', 'last offset', 'producer id', 'producer epoch', 'first sequence', 'last sequence'], rows)


def timestamp_experiment(c, rec):
    """CreateTime keeps the time that the producer put on the record. LogAppendTime replaces it with the time that the broker wrote it."""
    kx.create_topic(c.bootstrap, 'ts-create', assignment=ON_NODE_1, config={'retention.ms': '-1'})
    kx.create_topic(c.bootstrap, 'ts-append', assignment=ON_NODE_1, config={'retention.ms': '-1', 'message.timestamp.type': 'LogAppendTime'})
    now = int(time.time() * 1000)
    kx.send(kx.producer(c.bootstrap), 'ts-create', 3)
    kx.send(kx.producer(c.bootstrap), 'ts-append', 3)
    a, b = kx.read_all(c.bootstrap, 'ts-create'), kx.read_all(c.bootstrap, 'ts-append')
    rec.counts('producers.timestamps', {'create_time_topic_keeps_the_producers_time': [m[4] for m in a] == [kx.T0, kx.T0 + 1000, kx.T0 + 2000],
                                        'append_time_topic_replaced_it': all(abs(m[4] - now) < 60000 for m in b), 'first_producer_time': kx.T0,
                                        'days_between_the_two': round((b[0][4] - a[0][4]) / 86400000)})


def header_experiment(c, rec):
    kx.create_topic(c.bootstrap, 'with-headers', assignment=ON_NODE_1, config={'retention.ms': '-1'})
    p = kx.producer(c.bootstrap, **{'batch.num.messages': 1})
    kx.send(p, 'with-headers', 2, headers=[('trace-id', b'7f3a'), ('source', b'pos-app')])
    out = C.run_tool('kafka-dump-log', '--files', str(log_files(c, 'with-headers')[0]), '--print-data-log')[1]
    rec.text('producers.headers_dump', '\n'.join(l for l in out.splitlines() if l.startswith('| offset')))


def record_producers(c, rec):
    kx.delete_topics(c.bootstrap, ['acks-0', 'acks-1', 'acks-all', 'batch-1', 'batch-10', 'batch-100', 'batch-1000', 'codec-none', 'codec-gzip', 'codec-snappy', 'codec-lz4',
                                   'codec-zstd', 'err-big', 'idem-on', 'idem-off', 'idem-java', 'ts-create', 'ts-append', 'with-headers', 'no-such-topic'])
    acks_experiment(c, rec)
    batching_experiment(c, rec)
    compression_experiment(c, rec)
    error_experiment(c, rec)
    idempotence_experiment(c, rec)
    timestamp_experiment(c, rec)
    header_experiment(c, rec)
