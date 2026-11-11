"""Mission 6: consumers and consumer groups. Offsets, lag, the internal topic that stores them, rebalances, and what happens when a consumer is too slow."""
import re
import threading
import time

from confluent_kafka import Consumer, KafkaException, TopicPartition

import cluster as C
import kx
from world import norm

SPREAD6 = [[1 + i % 3, 1 + (i + 1) % 3, 1 + (i + 2) % 3] for i in range(6)]


def java_hash(s):
    """String.hashCode() of the Java language, as a signed 32-bit integer."""
    h = 0
    for ch in s:
        h = (31 * h + ord(ch)) & 0xffffffff
    return h - (1 << 32) if h >= (1 << 31) else h


def offsets_partition(group, partitions=50):
    """The partition of __consumer_offsets that stores a group: the absolute value of the Java hash of the group name, modulo the number of partitions."""
    return abs(java_hash(group)) % partitions


def fill(c, topic, n=6000):
    """n orders, spread evenly over the six partitions (order i goes to partition i % 6)."""
    p = kx.producer(c.bootstrap)
    for part in range(6):
        for i in range(part, n, 6):
            p.produce(topic, key=kx.order(i)['store_id'], value=kx.value(i), partition=part, timestamp=kx.T0 + i * 1000)
    p.flush(60)


def read_n(c, group, topic, partition, n):
    """Read exactly n records of one partition from the beginning and commit the position, as a consumer of the group would."""
    cons = kx.consumer(c.bootstrap, group)
    cons.assign([TopicPartition(topic, partition, 0)])
    got = 0
    while got < n:
        m = cons.poll(2)
        if m is not None and not m.error():
            got += 1
            last = m.offset()
    if n:
        cons.commit(offsets=[TopicPartition(topic, partition, last + 1)], asynchronous=False)
    cons.close()


def describe(c, group, *flags):
    rc, out, err = c.tool('kafka-consumer-groups', '--describe', '--group', group, *flags)
    return out


# ---- offsets, lag and the internal topic ----------------------------------------------------------------------------------------------------------------------
def basics(c, rec):
    kx.create_topic(c.bootstrap, 'cons', assignment=SPREAD6, config={'retention.ms': '-1'})
    fill(c, 'cons')
    done = [400, 800, 1000, 250, 600, 1]
    for part, n in enumerate(done):
        read_n(c, 'g-basic', 'cons', part, n)
    out = describe(c, 'g-basic')
    rec.text('consumers.describe_group', out)
    rows = []
    for line in out.splitlines()[1:]:
        f = line.split()
        if len(f) >= 6 and f[1] == 'cons':
            rows.append([int(f[2]), int(f[3]), int(f[4]), int(f[5])])
    rec.table('consumers.lag', ['partition', 'committed offset', 'end of the partition', 'lag'], rows)
    rec.counts('consumers.lag_total', {'records': 6000, 'committed': sum(done), 'lag': sum(r[3] for r in rows), 'lag_is_end_minus_committed': all(r[3] == r[2] - r[1] for r in rows)})
    rec.text('consumers.describe_state', describe(c, 'g-basic', '--state'))
    rc, lst, _ = c.tool('kafka-consumer-groups', '--list')
    rec.text('consumers.list_groups', lst)
    rc, groups, _ = c.tool('kafka-groups', '--list')
    rec.text('consumers.kafka_groups_list', groups)

    # where the offsets are stored: a compacted internal topic, one partition for each group (by a hash of the group name)
    part = offsets_partition('g-basic')
    log = sorted((c.data_dir(1) / ('__consumer_offsets-%d' % part)).glob('*.log'))[0]
    rc, dump, _ = C.run_tool('kafka-dump-log', '--files', str(log), '--offsets-decoder', timeout=60)
    lines = [l for l in dump.splitlines() if l.startswith('| offset:') and '"g-basic"' in l and '"type":"1"' in l]
    lines = [re.sub(r'CreateTime: \d+ ', '', re.sub(r'"topicId":"[^"]+"', '"topicId":"<topic id>"', re.sub(r'"commitTimestamp":\d+', '"commitTimestamp":<time>', l))) for l in lines]
    rec.counts('consumers.offsets_topic', {'group': 'g-basic', 'java_hash': java_hash('g-basic'), 'partitions_of_the_topic': 50, 'partition_computed': part,
                                           'offset_commit_records_for_the_group_found_there': len(lines)})
    rec.text('consumers.offsets_dump', '\n'.join(lines[:3]))

    # moving the position of a group: a dry run first, then the real thing
    base = ['--group', 'g-basic', '--topic', 'cons']
    rc, out, err = c.tool('kafka-consumer-groups', *base, '--reset-offsets', '--to-earliest', '--dry-run')
    rec.text('consumers.reset_dry_run', out)
    rc, out, err = c.tool('kafka-consumer-groups', *base, '--reset-offsets', '--shift-by=-100', '--execute')
    rec.text('consumers.reset_shift', (out + '\n' + err).strip())
    rc, out, err = c.tool('kafka-consumer-groups', *base, '--reset-offsets', '--to-datetime', '2026-01-01T00:30:00.000', '--dry-run')
    rec.text('consumers.reset_datetime', out)
    # a group that is running cannot be reset
    cons = kx.consumer(c.bootstrap, 'g-basic')
    cons.subscribe(['cons'])
    t0 = time.time()
    while time.time() - t0 < 20 and not cons.assignment():
        cons.poll(0.5)
    rc, out, err = c.tool('kafka-consumer-groups', *base, '--reset-offsets', '--to-earliest', '--execute')
    rec.text('consumers.reset_while_running', (out + '\n' + err).strip())
    cons.close()


# ---- rebalances -------------------------------------------------------------------------------------------------------------------------------------------------
class Member(threading.Thread):
    def __init__(self, c, group, name, topic, protocol, events, extra=None):
        super().__init__(daemon=True)
        self.c, self.group, self.name, self.topic, self.protocol, self.events = c, group, name, topic, protocol, events
        self.extra = extra or {}
        self.stop_flag = threading.Event()
        self.current = set()
        self.incremental = protocol in ('cooperative-sticky', 'consumer')
        self.last_change = time.time()
        self.polls = 0

    def log(self, kind, parts):
        self.events.append((self.name, kind, sorted(p.partition for p in parts)))
        self.last_change = time.time()

    def run(self):
        conf = {'client.id': self.name, 'group.id': self.group, 'bootstrap.servers': self.c.bootstrap, 'auto.offset.reset': 'earliest', 'enable.auto.commit': False}
        if self.protocol == 'consumer':
            conf['group.protocol'] = 'consumer'          # the new protocol: the session timeout is a setting of the broker, not of the client
        else:
            conf['partition.assignment.strategy'] = self.protocol
            conf['session.timeout.ms'] = 10000
        conf.update(self.extra)
        cons = Consumer(conf)

        def on_assign(cn, parts):
            self.log('assigned', parts)
            self.current |= {p.partition for p in parts}
            cn.incremental_assign(parts) if self.incremental else cn.assign(parts)

        def on_revoke(cn, parts):
            self.log('revoked', parts)
            self.current -= {p.partition for p in parts}
            cn.incremental_unassign(parts) if self.incremental else cn.unassign()
            if not self.incremental:
                self.current.clear()

        def on_lost(cn, parts):
            self.log('lost', parts)
            self.current.clear()
            cn.incremental_unassign(parts) if self.incremental else cn.unassign()
        cons.subscribe([self.topic], on_assign=on_assign, on_revoke=on_revoke, on_lost=on_lost)
        while not self.stop_flag.is_set():
            self.polls += 1
            m = cons.poll(0.2)
            if m is not None and m.error():
                self.events.append((self.name, 'error', [m.error().name()]))
        cons.close()
        self.events.append((self.name, 'closed', []))


def wait_stable(members, total=6, quiet=3.0, timeout=90):
    t0 = time.time()
    while time.time() - t0 < timeout:
        assigned = [m.current for m in members]
        sizes = sum(len(a) for a in assigned)
        flat = set().union(*assigned) if assigned else set()
        if sizes == total and len(flat) == total and all(a for a in assigned) and time.time() - max(m.last_change for m in members) > quiet:
            return            # every member has some partitions, together they have all six, and nothing has changed for a while
        time.sleep(0.3)
    raise TimeoutError('assignment never became stable: %s' % [sorted(m.current) for m in members])


def rebalance_experiment(c, rec, protocol, label):
    topic = 'rb'
    group = 'rb-' + label
    events = []
    a = Member(c, group, 'A', topic, protocol, events)
    b = Member(c, group, 'B', topic, protocol, events)
    cc = Member(c, group, 'C', topic, protocol, events)
    steps = []

    def mark(name, members):
        steps.append((name, len(events)))
        return members
    mark('A starts', [a]); a.start(); wait_stable([a])
    mark('B joins', [a, b]); b.start(); wait_stable([a, b])
    mark('C joins', [a, b, cc]); cc.start(); wait_stable([a, b, cc])
    mark('B leaves', [a, cc]); b.stop_flag.set(); b.join(30); wait_stable([a, cc])
    steps.append(('end', len(events)))
    a.stop_flag.set(); cc.stop_flag.set(); a.join(30); cc.join(30)
    rows, summary = [], {}
    for (name, lo), (_, hi) in zip(steps, steps[1:]):
        evs = [e for e in events[lo:hi] if e[1] != 'closed']
        newcomer = name.split()[0]
        # an "assigned" callback with no partitions is a member taking part in a round of the rebalance without gaining anything
        shown = [e for e in evs if e[2]]
        empty = len(evs) - len(shown)
        for who, kind, parts in shown:
            rows.append([name, who, kind, ','.join(map(str, parts))])
        summary[name] = {'partitions_revoked_in_all': sum(len(e[2]) for e in evs if e[1] == 'revoked'),
                         'partitions_revoked_from_members_that_stay': sum(len(e[2]) for e in evs if e[1] == 'revoked' and e[0] != newcomer),
                         'callbacks_with_no_partitions': empty}
    rec.table('consumers.rebalance_' + label, ['step', 'consumer', 'event', 'partitions'], rows)
    final = {m.name: sorted(m.current) for m in (a, cc)}
    return summary


def rebalances(c, rec):
    kx.delete_topics(c.bootstrap, ['rb'])
    kx.create_topic(c.bootstrap, 'rb', assignment=SPREAD6, config={'retention.ms': '-1'})
    result = {}
    for protocol, label in (('range', 'range'), ('cooperative-sticky', 'cooperative'), ('consumer', 'new_protocol')):
        result[label] = rebalance_experiment(c, rec, protocol, label)
    rec.counts('consumers.rebalance_summary', result)


# ---- a consumer that is too slow ------------------------------------------------------------------------------------------------------------------------------
def slow_consumer(c, rec):
    kx.delete_topics(c.bootstrap, ['slow'])
    kx.create_topic(c.bootstrap, 'slow', assignment=SPREAD6[:1], config={'retention.ms': '-1'})
    kx.send(kx.producer(c.bootstrap), 'slow', 200, partition=0)
    events = []
    conf = {'bootstrap.servers': c.bootstrap, 'group.id': 'slow-group', 'auto.offset.reset': 'earliest', 'enable.auto.commit': False, 'max.poll.interval.ms': 6000,
            'session.timeout.ms': 6000, 'client.id': 'slow'}
    cons = Consumer(conf)
    cons.subscribe(['slow'], on_assign=lambda cn, p: (events.append('assigned'), cn.assign(p)), on_revoke=lambda cn, p: (events.append('revoked'), cn.unassign()),
                   on_lost=lambda cn, p: (events.append('lost'), cn.unassign()))
    first = None
    t0 = time.time()
    while first is None and time.time() - t0 < 30:
        m = cons.poll(0.5)
        if m is not None and not m.error():
            first = m
    time.sleep(8.5)             # "processing" that takes longer than max.poll.interval.ms (6 seconds)
    errors = []
    commit_error = None
    try:
        cons.commit(message=first, asynchronous=False)
    except KafkaException as e:
        commit_error = (e.args[0].name(), e.args[0].str())
    for _ in range(10):
        m = cons.poll(1)
        if m is not None and m.error():
            errors.append((m.error().name(), m.error().str()))
    cons.close()
    rec.counts('consumers.too_slow', {'max_poll_interval_ms': 6000, 'processing_took_seconds': 8.5, 'poll_errors': errors[:2], 'commit_error': commit_error, 'events': events})


def record_consumers(c, rec):
    kx.delete_topics(c.bootstrap, ['cons', 'rb', 'slow'])
    basics(c, rec)
    rebalances(c, rec)
    slow_consumer(c, rec)
