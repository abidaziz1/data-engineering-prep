"""Mission 7: delivery guarantees. A lost acknowledgement, the order of "process" and "commit", and a transaction that is cut in half.

What is real: the brokers, the clients, the logs, the markers of the transactions. What is a stand-in: the lost acknowledgement is made by a small proxy (lossy_proxy.py) that throws
away one response, because a real network does not drop a packet on demand. Everything else is the real protocol.
"""
import json
import os
import re
import subprocess
import sys
import time

from confluent_kafka import KafkaException

import cluster as C
import kx
from lossy_proxy import LossyProxy
from world import norm, parse_dump

HERE = os.path.dirname(os.path.abspath(__file__))
PROXY_PORT = 19400


def batches_of(c, topic, node=1):
    d = c.data_dir(node) / (topic + '-0')
    out = []
    for f in sorted(d.glob('*.log')):
        out += parse_dump(C.run_tool('kafka-dump-log', '--files', str(f))[1])
    return out


# ---- a lost acknowledgement -----------------------------------------------------------------------------------------------------------------------------------
def retry_experiment(rec):
    """One broker. The producer sends five orders; the broker writes them; the answer is thrown away; the producer sends the batch again.

    The broker tells every client that it lives at the address of the proxy, so every client goes through it. The proxy forwards everything and, when it is armed, drops one answer.
    """
    broker_port = int(os.environ.get('KAFKA_BASE_PORT', 9092))
    props = {1: {'advertised.listeners': 'PLAINTEXT://localhost:%d' % PROXY_PORT}}
    via = 'localhost:%d' % PROXY_PORT
    proxy = LossyProxy(PROXY_PORT, broker_port, drop=0)
    with C.Cluster(nodes=1, node_props=props) as c:
        rows, dumps, ids = [], [], {}
        for idem in (False, True):
            name = 'retry-' + ('on' if idem else 'off')
            kx.create_topic(via, name, assignment=[[1]], config={'retention.ms': '-1'})
            p = kx.producer(via, **{'enable.idempotence': idem, 'acks': 'all', 'socket.timeout.ms': 3000, 'message.timeout.ms': 30000, 'linger.ms': 200, 'retry.backoff.ms': 100})
            p.list_topics(name, timeout=10)           # the producer knows the leader before the proxy is armed
            proxy.arm(1)
            delivered = []
            for i in range(5):
                p.produce(name, key=kx.order(i)['store_id'], value=kx.value(i), timestamp=kx.T0 + i * 1000, callback=lambda err, msg: delivered.append(err))
            p.flush(60)
            time.sleep(1)
            b = batches_of(c, name)
            records = kx.read_all(via, name)
            for x in b:
                pid = x['producerId']
                dumps.append([('enable.idempotence=true' if idem else 'enable.idempotence=false'), x['baseOffset'], x['lastOffset'],
                              -1 if pid < 0 else ids.setdefault(pid, '<id %s>' % 'AB'[len(ids)]), x['baseSequence']])
            rows.append(['enable.idempotence=' + ('true' if idem else 'false'), 5, proxy.produce_requests, proxy.dropped, len(records), len(records) - 5,
                         sorted({json.loads(r[3])['order_id'] for r in records}) == [1, 2, 3, 4, 5], sum(1 for e in delivered if e is None)])
            del p
        rec.table('delivery.lost_ack', ['producer', 'orders sent', 'produce requests that reached the broker', 'responses thrown away', 'records in the log', 'extra copies',
                                        'every order is there', 'delivery reports that said delivered'], rows)
        rec.table('delivery.lost_ack_batches', ['producer', 'first offset', 'last offset', 'producer id', 'first sequence'], dumps)
    proxy.close()


# ---- process, then commit; or commit, then process -----------------------------------------------------------------------------------------------------------
class Crash(Exception):
    pass


def worker(c, group, strategy, crash_after, sink, writes):
    """Read orders from the topic 'work' and process them: here, "process" means to write the order id into a sink. Raises Crash at the moment that is asked for.

    commit-first:   commit the offset of a record, then process it.   Crash after the commit of the order crash_after, before it is processed.
    process-first:  process a record, commit every ten records.        Crash after the order crash_after was processed, before the next commit.
    """
    cons = kx.consumer(c.bootstrap, group)
    cons.subscribe(['work'])
    since_commit, read = 0, 0
    try:
        while True:
            m = cons.poll(5)
            if m is None:
                break
            if m.error():
                if m.error().code() == -191:
                    break
                continue
            read += 1
            oid = json.loads(m.value())['order_id']
            if strategy == 'commit-first':
                cons.commit(message=m, asynchronous=False)
                if oid == crash_after:
                    raise Crash()
                writes.append(oid)
                sink[oid] = sink.get(oid, 0) + 1
            else:
                writes.append(oid)
                sink[oid] = sink.get(oid, 0) + 1
                if oid == crash_after:
                    raise Crash()
                since_commit += 1
                if since_commit == 10:
                    cons.commit(asynchronous=False)
                    since_commit = 0
    except Crash:
        pass
    finally:
        cons.close()
    return read


def commit_experiments(c, rec):
    kx.delete_topics(c.bootstrap, ['work'])
    kx.create_topic(c.bootstrap, 'work', assignment=[[1, 2, 3]], config={'retention.ms': '-1'})
    kx.send(kx.producer(c.bootstrap), 'work', 100, partition=0)
    rows = []
    for label, group, strategy, crash_after, idempotent in (
            ('commit, then process', 'w-commit-first', 'commit-first', 61, False),
            ('process, then commit every 10 records', 'w-process-first', 'process-first', 65, False),
            ('process, then commit every 10 records, into a sink that overwrites by order id', 'w-idempotent', 'process-first', 65, True)):
        sink, writes = {}, []
        r1 = worker(c, group, strategy, crash_after, sink, writes)       # the first run dies
        r2 = worker(c, group, strategy, None, sink, writes)              # the second run starts from what the group committed
        rec_counts = sorted(sink.items())
        lost = [i for i in range(1, 101) if i not in sink]
        twice = [i for i, n in rec_counts if n > 1]
        rows.append([label, 'order %d' % crash_after, r1, r2, len(writes), len(lost), len(twice), len(sink) if idempotent else len(writes),
                     lost[:1] and 'order %d' % lost[0] or '-', ('orders %d to %d' % (twice[0], twice[-1])) if twice else '-'])
    rec.table('delivery.crash', ['strategy', 'the process dies after', 'records read before the crash', 'records read after the restart', 'times the sink was written',
                                 'orders never processed', 'orders processed twice', 'rows in the sink', 'the lost order', 'the orders done twice'], rows)


def norm_tx(text, kind):
    """The output of kafka-transactions without what changes from run to run: the producer ids, the coordinator and the times."""
    out = []
    for i, line in enumerate(text.splitlines()):
        f = line.split('\t')
        if i > 0 and kind == 'list' and len(f) >= 4:
            f[1], f[2] = '<broker>', '<id>' if f[2].strip() else f[2]
        if i > 0 and kind == 'describe' and len(f) >= 9:
            f[0], f[2] = '<broker>', '<id>'
            f[6], f[7] = ('<time>', '<ms>') if f[6].strip() != 'None' else (f[6], f[7])
        out.append('\t'.join(x.strip() for x in f).replace('\t', '  '))
    return '\n'.join(out)


# ---- a transaction that is cut in half --------------------------------------------------------------------------------------------------------------------------
def transactions(c, rec):
    kx.delete_topics(c.bootstrap, ['tx-in', 'tx-out'])
    c.tool('kafka-consumer-groups', '--delete', '--group', 'tx-pipeline')
    kx.create_topic(c.bootstrap, 'tx-in', assignment=[[1, 2, 3]], config={'retention.ms': '-1'})
    kx.create_topic(c.bootstrap, 'tx-out', assignment=[[1, 2, 3]], config={'retention.ms': '-1'})
    kx.send(kx.producer(c.bootstrap), 'tx-in', 100, partition=0)
    py = sys.executable
    script = os.path.join(HERE, 'app', 'pipeline.py')
    r1 = subprocess.run([py, script, '--bootstrap', c.bootstrap, '--crash-in-batch', '7'], capture_output=True, text=True, timeout=120)
    time.sleep(1)
    committed = len(kx.read_all(c.bootstrap, 'tx-out', isolation='read_committed', timeout=10))
    uncommitted = len(kx.read_all(c.bootstrap, 'tx-out', isolation='read_uncommitted', timeout=10))
    rc, lst, _ = c.tool('kafka-transactions', 'list')
    rc, desc, _ = c.tool('kafka-transactions', 'describe', '--transactional-id', 'tx-pipeline-1')
    rec.counts('delivery.tx_after_crash', {'exit_code_of_the_first_run': r1.returncode, 'batches_committed_before_the_crash': 6,
                                           'records_seen_by_a_read_committed_consumer': committed, 'records_seen_by_a_read_uncommitted_consumer': uncommitted,
                                           'records_of_the_open_transaction': uncommitted - committed})
    rec.text('delivery.tx_list_open', norm_tx(lst, 'list'))
    rec.text('delivery.tx_describe_open', norm_tx(desc, 'describe'))
    r2 = subprocess.run([py, script, '--bootstrap', c.bootstrap], capture_output=True, text=True, timeout=180)
    time.sleep(1)
    out_c = kx.read_all(c.bootstrap, 'tx-out', isolation='read_committed', timeout=15)
    out_u = kx.read_all(c.bootstrap, 'tx-out', isolation='read_uncommitted', timeout=15)
    ids_c = [json.loads(m[3])['order_id'] for m in out_c]
    ids_u = [json.loads(m[3])['order_id'] for m in out_u]
    rc, desc2, _ = c.tool('kafka-transactions', 'describe', '--transactional-id', 'tx-pipeline-1')
    rec.text('delivery.tx_describe_done', norm_tx(desc2, 'describe'))
    rec.counts('delivery.tx_after_restart', {'exit_code_of_the_second_run': r2.returncode, 'read_committed_records': len(out_c), 'read_committed_distinct_orders': len(set(ids_c)),
                                             'read_committed_has_duplicates': len(ids_c) != len(set(ids_c)), 'read_committed_in_order': ids_c == sorted(ids_c),
                                             'read_uncommitted_records': len(out_u), 'read_uncommitted_distinct_orders': len(set(ids_u)),
                                             'orders_seen_twice_by_read_uncommitted': sorted(i for i in set(ids_u) if ids_u.count(i) > 1)})
    # the markers in the log
    d = c.data_dir(1) / 'tx-out-0'
    markers = []
    for f in sorted(d.glob('*.log')):
        rc, dump, _ = C.run_tool('kafka-dump-log', '--files', str(f), '--print-data-log')
        markers += [l for l in dump.splitlines() if 'endTxnMarker' in l]
    kinds = {'COMMIT': sum('endTxnMarker: COMMIT' in l for l in markers), 'ABORT': sum('endTxnMarker: ABORT' in l for l in markers)}
    rec.counts('delivery.tx_markers', {'markers_in_the_log': len(markers), 'commit': kinds['COMMIT'], 'abort': kinds['ABORT'], 'transactions_that_wrote_records': 11})
    k = next(i for i, l in enumerate(markers) if 'ABORT' in l)
    rec.text('delivery.tx_marker_lines', '\n'.join(re.sub(r'CreateTime: \d+ ', '', l) for l in markers[max(0, k - 1):k + 2]))
    rc, lst2, _ = c.tool('kafka-transactions', 'list')
    rec.text('delivery.tx_list_done', norm_tx(lst2, 'list'))


def record_delivery(c, rec):
    commit_experiments(c, rec)
    transactions(c, rec)


def record_lost_ack(rec):
    retry_experiment(rec)
