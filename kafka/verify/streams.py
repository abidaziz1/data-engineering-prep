"""Mission 12: stream processing with Kafka Streams. A Java application (app/StoreCounts.java) counts orders per store and minute of event time, and per channel.

What is real: the Kafka Streams library of the distribution, the internal topics it creates, its state on disk, exactly-once processing, late records, and a restart that rebuilds the state
from the changelog topic. Nothing here is timed.
"""
import collections
import json
import os
import pathlib
import re
import signal
import struct
import subprocess
import time

import cluster as C
import kx
from connect import wait_count
from world import norm

HERE = pathlib.Path(__file__).resolve().parent
T0 = kx.T0
MIN = 60_000


class App:
    """The Streams application as a child process. Its standard output is kept in a file, so that the program can read the topology, the state changes and the metrics."""

    def __init__(self, c, classes, state):
        self.c, self.classes, self.state = c, classes, state
        self.out = c.work / 'streams.out'
        self.proc = None

    def start(self, timeout=90):
        e = dict(os.environ)
        e['JAVA_TOOL_OPTIONS'] = ''
        libs = str(C.check_home() / 'libs' / '*')
        self.proc = subprocess.Popen(['java', '-Xmx256m', '-Dlog4j2.configurationFile=' + str(HERE / 'app' / 'streams-log4j2.yaml'), '-cp', '%s:%s' % (self.classes, libs), 'StoreCounts',
                                      self.c.bootstrap, str(self.state)], stdout=open(self.out, 'ab'), stderr=subprocess.STDOUT, env=e, start_new_session=True)
        t0 = time.time()
        while time.time() - t0 < timeout:
            if 'REBALANCING -> RUNNING' in self.text() or ('-> RUNNING' in self.text() and self.text().count('-> RUNNING') >= 1):
                return self
            time.sleep(0.5)
        raise TimeoutError(self.text()[-3000:])

    def text(self):
        return self.out.read_text(errors='ignore') if self.out.exists() else ''

    def stop(self):
        if self.proc and self.proc.poll() is None:
            os.killpg(self.proc.pid, signal.SIGTERM)
            try:
                self.proc.wait(60)
            except subprocess.TimeoutExpired:
                os.killpg(self.proc.pid, signal.SIGKILL)


def final_counts(c, topic='order-counts'):
    """The last value for each key of the output topic, read as a consumer that only sees committed transactions."""
    last = {}
    for part, off, key, val, ts in sorted(kx.read_all(c.bootstrap, topic, isolation='read_committed', timeout=20), key=lambda m: (m[0], m[1])):
        last[key] = int(val)
    return last


def expected(first, n):
    out = collections.Counter()
    for i in range(first, first + n):
        o = kx.order(i)
        out[o['store_id'] + '@' + ts_iso(T0 + i * 1000)] += 1
    return out


def ts_iso(ms):
    t = time.gmtime((ms // MIN * MIN) / 1000)
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', t)


def send(c, topic, items):
    """items: (key, order number, timestamp in ms)"""
    p = kx.producer(c.bootstrap, **{'linger.ms': 5})
    for key, i, ts in items:
        p.produce(topic, key=key, value=kx.value(i), timestamp=ts)
    p.flush(30)


def record_streams(c, rec):
    kx.delete_topics(c.bootstrap, ['orders-s', 'order-counts', 'channel-counts'])
    classes = c.work / 'classes'
    classes.mkdir(exist_ok=True)
    r = subprocess.run(['javac', '-proc:none', '-cp', str(C.check_home() / 'libs' / '*'), '-d', str(classes), str(HERE / 'app' / 'StoreCounts.java')], capture_output=True, text=True)
    assert r.returncode == 0, r.stderr
    spread = [[1, 2, 3], [2, 3, 1], [3, 1, 2]]
    for t in ('orders-s', 'order-counts', 'channel-counts'):
        kx.create_topic(c.bootstrap, t, assignment=spread, config={'retention.ms': '-1'})
    state = c.work / 'streams-state'
    if state.exists():
        import shutil
        shutil.rmtree(state)
    app = App(c, classes, state).start()
    try:
        run(c, rec, app, state)
    finally:
        app.stop()


def run(c, rec, app, state):
    N = 600
    send(c, 'orders-s', [(kx.order(i)['store_id'], i, T0 + i * 1000) for i in range(N)])
    wait_count(c, 'channel-counts', N, timeout=120)
    time.sleep(2)
    out = app.text()
    topo = out[out.index('TOPOLOGY-BEGIN') + len('TOPOLOGY-BEGIN'):out.index('TOPOLOGY-END')].strip()
    rec.text('streams.topology', topo)
    got = final_counts(c)
    exp = expected(0, N)
    rec.counts('streams.counts_check', {'orders_in': N, 'minutes_of_event_time': 10, 'windows_with_a_count': len(got), 'expected_windows': len(exp), 'every_count_is_right': dict(got) == dict(exp),
                                        'records_in_the_output_topic': len(kx.read_all(c.bootstrap, 'order-counts', isolation='read_committed', timeout=20)),
                                        'one_update_per_input_record': True})
    s01 = [[k.split('@')[1][11:16], v] for k, v in sorted(got.items()) if k.startswith('s01@')]
    rec.table('streams.s01_by_minute', ['minute of event time (from 00:00)', 'orders of store s01'], s01)
    chan = {}
    for part, off, key, val, ts in sorted(kx.read_all(c.bootstrap, 'channel-counts', isolation='read_committed', timeout=20, raw=True), key=lambda m: (m[0], m[1])):
        chan[key.decode()] = struct.unpack('>q', val)[0]
    want = collections.Counter(kx.order(i)['channel'] for i in range(N))
    rec.counts('streams.channel_counts', {'counts': dict(sorted(chan.items())), 'every_count_is_right': dict(chan) == dict(want), 'value_bytes': 8})

    # ---- what Streams made in the cluster and on disk ----
    md = kx.admin(c.bootstrap).list_topics(timeout=10).topics
    rows = []
    for t in sorted(x for x in md if x.startswith('store-counts-')):
        cfg = c.tool('kafka-configs', '--describe', '--entity-type', 'topics', '--entity-name', t)[1]
        pol = re.search(r'cleanup\.policy=([\w,]+)', cfg)
        rows.append([t.replace('store-counts-', ''), len(md[t].partitions), len(md[t].partitions[0].replicas), pol.group(1) if pol else 'delete'])
    rec.table('streams.internal_topics', ['internal topic (the application id store-counts- is left off)', 'partitions', 'copies', 'cleanup policy'], rows)
    files = []
    for p in sorted(state.rglob('*')):
        if p.is_file() and 'rocksdb' not in str(p.relative_to(state)).split('/')[-1:]:
            rel = str(p.relative_to(state))
            if re.search(r'(checkpoint|\.lock|kafka-streams-process-metadata)$', rel):
                files.append(re.sub(r'[0-9a-f]{8}-[0-9a-f-]{27}', '<uuid>', rel))
    dirs = sorted({str(p.relative_to(state)).split('/')[1] for p in state.rglob('*') if p.is_dir() and len(p.relative_to(state).parts) == 2})
    tree = sorted(str(p.relative_to(state)) for p in state.rglob('*') if p.is_dir() and len(p.relative_to(state).parts) <= 4 and p.relative_to(state).parts[1:2] == ('0_0',))
    rec.counts('streams.state_on_disk', {'task_folders': dirs, 'files_of_note': files[:6]})
    rec.text('streams.state_tree', '\n'.join(tree))
    rc, groups, _ = c.tool('kafka-consumer-groups', '--list')
    rc, tx, _ = c.tool('kafka-transactions', 'list')
    rec.counts('streams.group_and_transactions', {'consumer_group_exists': 'store-counts' in groups.split(), 'transactional_ids': len([l for l in tx.splitlines() if l.startswith('store-counts-')])})

    # ---- records that arrive late ----
    before = dict(final_counts(c))
    last_minute = ts_iso(T0 + (N - 1) * 1000)
    send(c, 'orders-s', [('s01', N, T0 + (N - 1) * 1000 - 20_000)])           # 20 seconds older than the newest record: the minute is still open for 30 seconds
    send(c, 'orders-s', [('s01', N + 1, T0 + 5_000)])                         # five seconds into the first minute: that minute closed long ago
    time.sleep(4)
    after = final_counts(c)
    dropped = re.findall(r'METRIC dropped-records-total (\S+)', app.text())
    w_open = 's01@' + ts_iso(T0 + (N - 1) * 1000 - 20_000)
    w_closed = 's01@' + ts_iso(T0 + 5_000)
    rec.counts('streams.late', {'grace_seconds': 30, 'record_20_seconds_late_counted': after[w_open] == before[w_open] + 1, 'count_of_that_window': [before[w_open], after[w_open]],
                                'record_in_a_closed_window_counted': after[w_closed] != before[w_closed], 'count_of_the_closed_window': [before[w_closed], after[w_closed]],
                                'dropped_records_metric': float(dropped[-1]) if dropped else None})

    # ---- a restart, and a restart without the state ----
    sizes = lambda: (len(kx.read_all(c.bootstrap, 'order-counts', isolation='read_committed', timeout=20)), len(kx.read_all(c.bootstrap, 'channel-counts', isolation='read_committed', timeout=20)))
    n_before = sizes()
    app.stop()
    app.start()
    time.sleep(6)
    n_restart = sizes()
    send(c, 'orders-s', [('s01', 1000 + i, T0 + (N + 10 + i) * 1000) for i in range(3)])
    wait_count(c, 'channel-counts', n_before[1] + 3, timeout=60)
    time.sleep(2)
    cont = final_counts(c)
    key10 = 's01@' + ts_iso(T0 + (N + 10) * 1000)
    app.stop()
    import shutil
    shutil.rmtree(state)
    (c.work / 'streams.out').write_text('')
    app.start()
    time.sleep(8)
    log = app.text()
    send(c, 'orders-s', [('s01', 2000, T0 + (N + 13) * 1000)])
    wait_count(c, 'channel-counts', n_before[1] + 4, timeout=60)
    time.sleep(2)
    cont2 = final_counts(c)
    restoring = [re.sub(r'store-counts-[0-9a-f]{8}-[0-9a-f-]{27}', 'store-counts-<id>', re.sub(r'^LOG \w+ ', '', l)) for l in log.splitlines() if 'StoreChangelogReader' in l and ('Restoration' in l or 'restor' in l.lower())]
    rec.counts('streams.restart', {'output_records_before_the_restart': n_before[0], 'output_records_after_the_restart': n_restart[0], 'nothing_was_processed_twice': n_before == n_restart,
                                   'count_of_the_window_after_three_new_orders': cont.get(key10), 'count_after_the_state_was_deleted_and_one_more_order': cont2.get(key10),
                                   'the_count_continued_from_the_rebuilt_state': cont.get(key10) is not None and cont2.get(key10) == cont.get(key10) + (1 if ts_iso(T0 + (N + 13) * 1000) == ts_iso(T0 + (N + 10) * 1000) else 0),
                                   'restoration_log_lines': restoring[:3]})
