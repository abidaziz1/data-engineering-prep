"""Mission 14: running Kafka. The numbers that tell you something is wrong (read over JMX from the brokers), a rolling restart under a producer that never stops, a partition that is moved to a
new broker, and a quota.

What is real: the brokers, their metrics, the tools, the data on disk. What is not: a real network and real load. Everything runs on one machine, so rates and times are not recorded; counts are.
"""
import json
import os
import re
import tempfile
import threading
import time

from confluent_kafka import Producer

import cluster as C
import kx
from replication import layout_rows, wait_layout
from world import norm

JMX_BASE = 9990
CONTROLLER = 100


def jmx_port(node):
    return JMX_BASE + node if node < 100 else 9899


def jmx(c, node, bean, attr='Value'):
    """One attribute of one MBean of a broker or of the controller, read with the kafka-jmx tool of the distribution."""
    url = 'service:jmx:rmi:///jndi/rmi://localhost:%d/jmxrmi' % jmx_port(node)
    rc, out, err = C.run_tool('kafka-jmx', '--jmx-url', url, '--object-name', bean, '--attributes', attr, '--one-time', 'true', timeout=60)
    for line in out.splitlines():
        m = re.match(r'"?[^,]*"?,\s*"?([-\d.eE+]+)"?$', line.strip())
        if m:
            return float(m.group(1))
    return out.strip() or err.strip()


BEANS = [('under-replicated partitions', 'kafka.server:type=ReplicaManager,name=UnderReplicatedPartitions', 'broker'),
         ('partitions below the minimum in-sync replicas', 'kafka.server:type=ReplicaManager,name=UnderMinIsrPartitionCount', 'broker'),
         ('partitions that this broker leads', 'kafka.server:type=ReplicaManager,name=LeaderCount', 'broker'),
         ('offline partitions', 'kafka.controller:type=KafkaController,name=OfflinePartitionsCount', 'controller'),
         ('active controllers', 'kafka.controller:type=KafkaController,name=ActiveControllerCount', 'controller')]


def broker_numbers(c, nodes):
    """The broker metrics from each broker, and the controller metrics from the controller (a broker does not have those)."""
    out = {n: {label: jmx(c, n, bean) for label, bean, where in BEANS if where == 'broker'} for n in nodes}
    out[CONTROLLER] = {label: jmx(c, CONTROLLER, bean) for label, bean, where in BEANS if where == 'controller'}
    return out


def record_ops(rec):
    node_env = {i: {'JMX_PORT': jmx_port(i)} for i in (1, 2, 3, 4, CONTROLLER)}
    with C.Cluster(isolated=True, props={'replica.lag.time.max.ms': 6000}, node_env=node_env) as c:
        run(c, rec)


def run(c, rec):
    kx.delete_topics(c.bootstrap, ['gauge', 'rolling', 'moving'])
    # ---- the numbers of a healthy cluster, and of a cluster that lost a broker ----
    kx.create_topic(c.bootstrap, 'gauge', assignment=[[1, 2, 3], [2, 3, 1], [3, 1, 2]], config={'min.insync.replicas': '2', 'retention.ms': '-1'})
    healthy = broker_numbers(c, [1, 2, 3])
    c.stop_node(1, kill=True)
    wait_layout(c, 'gauge', lambda l: all(1 not in x[3] for x in l))
    time.sleep(2)
    hurt = broker_numbers(c, [2, 3])
    rows = []
    for label, bean, where in BEANS:
        if where == 'broker':
            rows.append([label, 'a broker', ' / '.join(str(int(healthy[n][label])) for n in (1, 2, 3)), ' / '.join(str(int(hurt[n][label])) for n in (2, 3))])
        else:
            rows.append([label, 'the controller', str(int(healthy[CONTROLLER][label])), str(int(hurt[CONTROLLER][label]))])
    rec.table('ops.metrics', ['what is counted', 'read from', 'all three brokers up (brokers 1 / 2 / 3)', 'broker 1 is dead (brokers 2 / 3)'], rows)
    rec.counts('ops.metrics_reading', {'tool': 'kafka-jmx.sh', 'bean_of_under_replicated': BEANS[0][1], 'under_replicated_when_healthy': sum(healthy[n][BEANS[0][0]] for n in (1, 2, 3)),
                                       'under_replicated_when_broker_1_is_dead': sum(hurt[n][BEANS[0][0]] for n in (2, 3)),
                                       'partitions_with_a_replica_on_broker_1': 3, 'offline_when_broker_1_is_dead': hurt[CONTROLLER][BEANS[3][0]],
                                       'leaders_on_brokers_2_and_3_when_broker_1_is_dead': sum(hurt[n][BEANS[2][0]] for n in (2, 3))})
    c.start_node(1)
    c.wait_ready([c.node(1)])
    wait_layout(c, 'gauge', lambda l: all(len(x[3]) == 3 for x in l))

    # ---- a rolling restart, with a producer that keeps sending ----
    kx.create_topic(c.bootstrap, 'rolling', assignment=[[1, 2, 3], [2, 3, 1], [3, 1, 2]], config={'min.insync.replicas': '2', 'retention.ms': '-1'})
    stop = threading.Event()
    sent, delivered, errors = [0], [0], []

    def cb(err, msg):
        if err:
            errors.append(err.name())
        else:
            delivered[0] += 1
    p = Producer({'bootstrap.servers': c.bootstrap, 'acks': 'all', 'enable.idempotence': True, 'linger.ms': 5, 'partitioner': 'murmur2_random', 'message.timeout.ms': 120000})

    def loop():
        i = 0
        while not stop.is_set():
            o = kx.order(i)
            p.produce('rolling', key=o['store_id'], value=kx.value(i), callback=cb)
            p.poll(0)
            i += 1
            sent[0] = i
            time.sleep(0.01)
        p.flush(120)
    th = threading.Thread(target=loop)
    th.start()
    time.sleep(3)
    steps = []
    for nid in (1, 2, 3):
        c.stop_node(nid)                                                       # a clean shutdown: the broker hands its partitions to other brokers first
        wait_layout(c, 'rolling', lambda l: all(nid not in x[3] for x in l))
        under = [jmx(c, n, BEANS[0][1]) for n in (1, 2, 3) if n != nid]
        c.start_node(nid)
        c.wait_ready([c.node(nid)])
        wait_layout(c, 'rolling', lambda l: all(len(x[3]) == 3 for x in l))
        steps.append(['restart broker %d' % nid, 'broker %d is down' % nid, int(sum(under)), 'all three in sync again'])
        time.sleep(2)
    stop.set()
    th.join()
    time.sleep(3)
    got = kx.read_all(c.bootstrap, 'rolling', timeout=30)
    ids = [json.loads(m[3])['order_id'] for m in got]
    rec.table('ops.rolling_steps', ['step', 'while it is down', 'under-replicated partitions then (sum on the other brokers)', 'afterwards'], steps)
    rec.counts('ops.rolling_restart', {'orders_sent': sent[0], 'delivery_reports_ok': delivered[0], 'errors': len(errors), 'records_in_the_topic': len(got), 'distinct_orders': len(set(ids)),
                                       'lost': sent[0] - len(set(ids)), 'duplicates': len(ids) - len(set(ids)), 'brokers_restarted': 3, 'acks': 'all', 'min_insync_replicas': 2,
                                       'idempotent_producer': True})

    # ---- moving a partition to a new broker ----
    kx.create_topic(c.bootstrap, 'moving', assignment=[[1, 2, 3]], config={'retention.ms': '-1', 'min.insync.replicas': '2'})
    kx.send(kx.producer(c.bootstrap), 'moving', 3000, partition=0)
    c.add_broker(4, c.node(3).broker_port + 100)
    time.sleep(3)
    before = layout_rows(kx.layout(c.bootstrap, 'moving'))
    topics_json = json.dumps({'topics': [{'topic': 'moving'}], 'version': 1})
    d = tempfile.mkdtemp()
    tj = os.path.join(d, 'topics.json')
    open(tj, 'w').write(topics_json)
    rc, out, err = c.tool('kafka-reassign-partitions', '--generate', '--topics-to-move-json-file', tj, '--broker-list', '2,3,4')
    rec.text('ops.reassign_generate', norm(out, c))
    plan = json.dumps({'version': 1, 'partitions': [{'topic': 'moving', 'partition': 0, 'replicas': [2, 3, 4], 'log_dirs': ['any', 'any', 'any']}]})
    pj = os.path.join(d, 'plan.json')
    open(pj, 'w').write(plan)
    rc, out, err = c.tool('kafka-reassign-partitions', '--execute', '--reassignment-json-file', pj, '--throttle', '50000000')
    rec.text('ops.reassign_execute', norm(out, c))
    lay = wait_layout(c, 'moving', lambda l: l[0][2] == [2, 3, 4] and sorted(l[0][3]) == [2, 3, 4], timeout=180)
    rc, out, err = c.tool('kafka-reassign-partitions', '--verify', '--reassignment-json-file', pj)
    rec.text('ops.reassign_verify', norm(out, c))
    time.sleep(8)
    on_disk = {n: (c.data_dir(n) / 'moving-0').exists() for n in (1, 2, 3, 4)}
    sizes = {n: sum(f.stat().st_size for f in (c.data_dir(n) / 'moving-0').glob('*.log')) for n in (2, 3, 4) if on_disk[n]}
    rec.table('ops.reassign_layout', ['moment', 'partition', 'leader', 'replicas', 'in-sync replicas'], [['before'] + r for r in before] + [['after'] + r for r in layout_rows(lay)])
    rec.counts('ops.reassign_result', {'replicas_before': [1, 2, 3], 'replicas_after': [2, 3, 4], 'folder_exists_on_broker': {str(k): v for k, v in on_disk.items()}, 'log_bytes_on_the_new_broker_equals_the_others': len(set(sizes.values())) == 1,
                                       'records': 3000, 'throttle_bytes_per_second': 50000000})


def record_quota(c, rec):
    """A quota: the broker slows a client down that sends more bytes per second than it may. The client is told how long to wait, and the producer simply takes longer.
    The broker measures the rate over a window of 11 one second samples by default, so a short burst of up to rate x 11 bytes is not throttled: the experiment must send more than that."""
    kx.delete_topics(c.bootstrap, ['quota'])
    kx.create_topic(c.bootstrap, 'quota', assignment=[[1]], config={'retention.ms': '-1'})
    cli = 'quota-client'
    n, rate = 60000, 200_000
    body = [kx.value(i) for i in range(n)]
    size = sum(len(b) for b in body)

    def send_all(client_id):
        stats = []
        p = Producer({'bootstrap.servers': c.bootstrap, 'client.id': client_id, 'statistics.interval.ms': 500, 'stats_cb': lambda s: stats.append(json.loads(s)), 'linger.ms': 20, 'acks': '1',
                      'queue.buffering.max.messages': 200000})
        t0 = time.time()
        for v in body:
            p.produce('quota', value=v)
            p.poll(0)
        p.flush(180)
        took = time.time() - t0
        p.poll(1)
        thr = max([b.get('throttle', {}).get('max', 0) for s in stats for b in s.get('brokers', {}).values()] or [0])
        return took, thr
    rc, out, err = c.tool('kafka-configs', '--describe', '--all', '--entity-type', 'brokers', '--entity-name', '1')
    win_num = int(re.search(r'quota\.window\.num=(\d+)', out).group(1))
    win_size = int(re.search(r'quota\.window\.size\.seconds=(\d+)', out).group(1))
    burst = rate * win_num * win_size
    free_took, free_thr = send_all('no-quota-client')
    rc, out, err = c.tool('kafka-configs', '--alter', '--entity-type', 'clients', '--entity-name', cli, '--add-config', 'producer_byte_rate=%d' % rate)
    rec.text('ops.quota_set', out.strip() or err.strip())
    rc, out, err = c.tool('kafka-configs', '--describe', '--entity-type', 'clients', '--entity-name', cli)
    rec.text('ops.quota_described', out.strip() or err.strip())
    time.sleep(2)
    slow_took, slow_thr = send_all(cli)
    rec.counts('ops.quota', {'quota_bytes_per_second': rate, 'bytes_sent': size, 'window_samples': win_num, 'window_seconds_each': win_size, 'burst_the_window_allows_bytes': burst,
                             'sent_more_than_the_burst': size > burst, 'seconds_the_quota_forces_at_least': round(max(0, size - burst) / rate, 1), 'client_without_a_quota_waited_ms': free_thr,
                             'client_with_the_quota_waited_ms_at_most': slow_thr, 'the_broker_asked_the_client_to_wait': slow_thr > 0 and free_thr == 0,
                             'the_client_with_the_quota_took_longer': slow_took > 2 * free_took})
    c.tool('kafka-configs', '--alter', '--entity-type', 'clients', '--entity-name', cli, '--delete-config', 'producer_byte_rate')
