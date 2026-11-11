"""Mission 5: replication and durability. Three brokers and one controller on this machine; brokers are stopped with kill -9 and started again.

What is real: placement, leaders, in-sync replicas, high watermarks, epochs, the errors of the producer, and the data that is lost or kept.
What is not: a network. The brokers share one machine, so there is no partition of the network, no slow disk and no slow link. Times are not recorded.
"""
import hashlib
import json
import re
import time

from confluent_kafka import KafkaException, Producer

import cluster as C
import kx
from world import norm, parse_dump

PROPS = {'replica.lag.time.max.ms': 6000}      # the default is 30,000: shorter, so that a laptop shows in seconds what takes half a minute


def wait_layout(c, topic, pred, timeout=120):
    t0 = time.time()
    last = None
    while time.time() - t0 < timeout:
        try:
            last = kx.layout(c.bootstrap, topic)
            if pred(last):
                return last
        except Exception:
            pass
        time.sleep(0.5)
    raise TimeoutError('layout of %s never matched; last: %s' % (topic, last))


def try_send(c, topic, n, partition=0, start=0, **conf):
    """Send n orders to one partition and return the outcome of each: the error name, or 'delivered'."""
    out = []
    p = Producer(dict({'bootstrap.servers': c.bootstrap, 'partitioner': 'murmur2_random', 'linger.ms': 5, 'message.timeout.ms': 20000}, **conf))
    for i in range(start, start + n):
        p.produce(topic, key=kx.order(i)['store_id'], value=kx.value(i), partition=partition, timestamp=kx.T0 + i * 1000,
                  callback=lambda err, msg: out.append(err.name() if err else 'delivered'))
    p.flush(60)
    return out


def summarize(outcomes):
    d = {}
    for o in outcomes:
        d[o] = d.get(o, 0) + 1
    return d


def file_facts(c, nid, topic, part):
    d = c.data_dir(nid) / ('%s-%d' % (topic, part))
    files = sorted(d.glob('*.log'))
    raw = b''.join(f.read_bytes() for f in files)
    batches = []
    for f in files:
        batches += parse_dump(C.run_tool('kafka-dump-log', '--files', str(f))[1])
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()[:12], 'batches': len(batches), 'last_offset': batches[-1]['lastOffset'] if batches else None,
            'crcs': [b['crc'] for b in batches]}


def checkpoint_line(c, nid, topic, part):
    for l in (c.data_dir(nid) / 'replication-offset-checkpoint').read_text().splitlines():
        if l.startswith('%s %d ' % (topic, part)):
            return l
    return None


def layout_rows(lay):
    return [[p, leader if leader >= 0 else 'none', ','.join(map(str, reps)), ','.join(map(str, isr)) if isr else 'none'] for p, leader, reps, isr in lay]


def record_replication(rec):
    with C.Cluster(isolated=True, props=PROPS) as c:
        run(c, rec)


def run(c, rec):
    kx.delete_topics(c.bootstrap, ['repl', 'safe', 'lossy'])
    # ---- R1: placement, with three partitions spread over three brokers ----
    kx.create_topic(c.bootstrap, 'repl', assignment=[[1, 2, 3], [2, 3, 1], [3, 1, 2]], config={'min.insync.replicas': '2', 'retention.ms': '-1'})
    rec.table('replication.layout', ['partition', 'leader', 'replicas (the first is the preferred leader)', 'in-sync replicas'], layout_rows(kx.layout(c.bootstrap, 'repl')))
    rc, out, err = c.topics('--describe', '--topic', 'repl')
    rec.text('replication.describe', norm(out, c))

    # ---- R2: three copies of the same bytes ----
    for pt in range(3):
        outcome = try_send(c, 'repl', 1000, partition=pt, start=pt * 1000, acks='all')
        assert set(outcome) == {'delivered'}, summarize(outcome)
    time.sleep(7)       # the high watermark is written to a checkpoint file every 5 seconds
    facts = {n: file_facts(c, n, 'repl', 0) for n in (1, 2, 3)}
    rec.table('replication.copies', ['broker', 'copy of partition 0', 'bytes', 'sha256 of the file (first 12 characters)', 'batches', 'last offset', 'high watermark in the checkpoint file'],
              [[n, 'leader' if n == 1 else 'follower', f['bytes'], f['sha256'], f['batches'], f['last_offset'], checkpoint_line(c, n, 'repl', 0)] for n, f in facts.items()])
    rec.counts('replication.copies_equal', {'same_bytes_on_all_three': len({f['sha256'] for f in facts.values()}) == 1, 'same_crc_of_every_batch': facts[1]['crcs'] == facts[2]['crcs'] == facts[3]['crcs'],
                                            'records': 1000})

    # ---- R3: the leader of partition 0 is killed ----
    c.stop_node(1, kill=True)
    lay = wait_layout(c, 'repl', lambda l: l[0][1] != 1 and 1 not in l[0][3])
    rec.table('replication.after_kill', ['partition', 'leader', 'replicas (the first is the preferred leader)', 'in-sync replicas'], layout_rows(lay))
    during = try_send(c, 'repl', 500, partition=0, start=1000, acks='all')
    rec.counts('replication.while_one_is_down', {'sent_to_partition_0': 500, 'outcomes': summarize(during), 'in_sync_replicas': len(lay[0][3]), 'min_insync_replicas': 2})
    c.start_node(1)
    c.wait_ready([c.node(1)])
    lay = wait_layout(c, 'repl', lambda l: all(len(x[3]) == 3 for x in l))
    time.sleep(7)
    rec.table('replication.after_restart', ['partition', 'leader', 'replicas (the first is the preferred leader)', 'in-sync replicas'], layout_rows(lay))
    back = {n: file_facts(c, n, 'repl', 0) for n in (1, 2, 3)}
    rec.table('replication.caught_up', ['broker', 'last offset of partition 0', 'bytes', 'sha256 (first 12 characters)'], [[n, f['last_offset'], f['bytes'], f['sha256']] for n, f in back.items()])
    rec.counts('replication.caught_up_equal', {'same_bytes_on_all_three': len({f['sha256'] for f in back.values()}) == 1, 'records': 1500})
    rec.text('replication.epochs', 'broker 1 (the old leader):\n' + (c.data_dir(1) / 'repl-0' / 'leader-epoch-checkpoint').read_text().strip() +
             '\nbroker 2 (the new leader):\n' + (c.data_dir(2) / 'repl-0' / 'leader-epoch-checkpoint').read_text().strip())
    rc, out, err = c.tool('kafka-leader-election', '--election-type', 'PREFERRED', '--topic', 'repl', '--partition', '0')
    rec.text('replication.preferred_election', norm(out or err, c))
    lay = wait_layout(c, 'repl', lambda l: l[0][1] == 1)
    rec.counts('replication.preferred_election_result', {'leader_of_partition_0': lay[0][1], 'preferred_leader': 1})

    # ---- R4: two of the three replicas are gone, and the topic needs two ----
    c.stop_node(2, kill=True)
    c.stop_node(3, kill=True)
    lay = wait_layout(c, 'repl', lambda l: l[0][3] == [1])
    rec.table('replication.two_down', ['partition', 'leader', 'replicas (the first is the preferred leader)', 'in-sync replicas'], layout_rows(lay))
    all_ack = try_send(c, 'repl', 5, partition=0, start=1500, acks='all', retries=0)
    one_ack = try_send(c, 'repl', 5, partition=0, start=1505, acks='1', retries=0)
    rc, under_min, _ = c.topics('--describe', '--under-min-isr-partitions')
    rc, under_rep, _ = c.topics('--describe', '--under-replicated-partitions')
    rec.text('replication.under_min_isr', norm(under_min, c))
    rec.counts('replication.under_replicated_count', {'under_replicated_partitions': len([l for l in under_rep.splitlines() if l.strip().startswith('Topic:') and 'Partition:' in l]),
                                                      'under_min_isr_partitions': len([l for l in under_min.splitlines() if 'Partition:' in l])})
    c.start_node(2)
    c.start_node(3)
    c.wait_ready([c.node(2), c.node(3)])
    wait_layout(c, 'repl', lambda l: all(len(x[3]) == 3 for x in l))
    healed = try_send(c, 'repl', 5, partition=0, start=1510, acks='all', retries=0)
    rec.table('replication.acks_when_short', ['situation', 'acks', 'records sent', 'outcome'],
              [['one replica in sync, topic needs 2', 'all', 5, summarize(all_ack)], ['one replica in sync, topic needs 2', '1', 5, summarize(one_ack)],
               ['all three back in sync', 'all', 5, summarize(healed)]])

    # ---- R5: the leader dies with records that no other replica has ----
    for name, unclean in (('safe', 'false'), ('lossy', 'true')):
        kx.create_topic(c.bootstrap, name, assignment=[[1, 2, 3]], config={'min.insync.replicas': '1', 'unclean.leader.election.enable': unclean, 'retention.ms': '-1'})
        outcome = try_send(c, name, 100, partition=0, acks='all')
        assert set(outcome) == {'delivered'}
    time.sleep(2)
    c.stop_node(2, kill=True)
    c.stop_node(3, kill=True)
    for name in ('safe', 'lossy'):
        wait_layout(c, name, lambda l: l[0][3] == [1])
    extra = {name: try_send(c, name, 50, partition=0, start=100, acks='1', retries=0) for name in ('safe', 'lossy')}
    c.stop_node(1, kill=True)
    c.start_node(2)
    c.wait_ready([c.node(2)])
    time.sleep(10)
    rows = []
    for name in ('safe', 'lossy'):
        lay = kx.layout(c.bootstrap, name)
        rows.append([name, name == 'lossy', 'broker 1 is down, broker 2 is back, broker 2 has 100 of the 150 records', layout_rows(lay)[0][1], 'none' if lay[0][1] < 0 else 'yes'])
    rec.table('replication.unclean_election', ['topic', 'unclean.leader.election.enable', 'situation', 'leader of the partition', 'can be read'], rows)
    rc, d_safe, _ = c.topics('--describe', '--topic', 'safe')
    rc, d_lossy, _ = c.topics('--describe', '--topic', 'lossy')
    rec.text('replication.describe_offline', norm(d_safe, c) + '\n' + norm(d_lossy, c))
    readable_lossy = len(kx.read_all(c.bootstrap, 'lossy', timeout=15))
    c.start_node(1)
    c.wait_ready([c.node(1)])
    c.start_node(3)
    c.wait_ready([c.node(3)])
    for name in ('safe', 'lossy'):
        wait_layout(c, name, lambda l: len(l[0][3]) == 3 and l[0][1] >= 0)
    more = {name: try_send(c, name, 20, partition=0, start=150, acks='all') for name in ('safe', 'lossy')}
    time.sleep(3)
    end = {name: kx.offsets(c.bootstrap, name)[0][1] for name in ('safe', 'lossy')}
    got = {name: [json.loads(m[3])['order_id'] for m in kx.read_all(c.bootstrap, name)] for name in ('safe', 'lossy')}
    rec.table('replication.unclean_result', ['topic', 'records acknowledged', 'acknowledged by the leader only', 'readable while broker 1 was down', 'records at the end', 'acknowledged records missing at the end'],
              [['safe', 100 + 50 + 20, 50, 'none: the partition had no leader', end['safe'], 150 + 20 - len(got['safe'])],
               ['lossy', 100 + 50 + 20, 50, readable_lossy, end['lossy'], 150 + 20 - len(got['lossy'])]])
    lost = [i for i in range(1, 171) if i not in set(got['lossy'])]
    rec.counts('replication.unclean_lost', {'lost_order_ids_first_last': [lost[0], lost[-1]] if lost else None, 'lost_count': len(lost), 'safe_lost_count': 170 - len(got['safe'])})
    log = (c.node(1).dir / 'logs' / 'server.log').read_text(errors='ignore')
    trunc = [l for l in log.splitlines() if 'Truncating partition lossy-0' in l]
    rec.text('replication.truncation_log', norm(re.sub(r'^\[[^\]]+\] ', '', trunc[0]), c) if trunc else 'no truncation line found')
