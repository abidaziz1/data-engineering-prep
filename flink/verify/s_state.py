"""Mission 4: state, checkpoints, recovery and savepoints.

A job reads orders from Kafka and keeps a count and a sum for every store. While it runs, a TaskManager is killed. The job is then judged on what it wrote: the totals of the stores, and,
for a job that copies the orders, every order exactly once or more than once. Then the same job is stopped with a savepoint and started again, with a different parallelism.
"""
import json
import os
import re
import time

import fcluster as F
import fx
import kx

N_AGG = 2400
STATE_SQL = """SET 'parallelism.default' = '%(p)d';
%(sets)sCREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, total_cents INT) WITH ('connector' = 'kafka', 'topic' = '%(topic)s', 'properties.bootstrap.servers' = '%(boot)s',
  'properties.group.id' = '%(group)s', 'scan.startup.mode' = '%(startup)s', 'format' = 'json');
CREATE TEMPORARY TABLE store_totals (store_id STRING, n BIGINT, cents BIGINT, PRIMARY KEY (store_id) NOT ENFORCED) WITH ('connector' = 'upsert-kafka', 'topic' = '%(sink)s',
  'properties.bootstrap.servers' = '%(boot)s', 'key.format' = 'json', 'value.format' = 'json');
INSERT INTO store_totals SELECT store_id, COUNT(*) AS n, SUM(total_cents) AS cents FROM orders GROUP BY store_id;
"""
COPY_SQL = """SET 'parallelism.default' = '1';
SET 'execution.checkpointing.interval' = '6 s';
CREATE TEMPORARY TABLE orders (order_id INT, store_id STRING, total_cents INT) WITH ('connector' = 'kafka', 'topic' = '%(topic)s', 'properties.bootstrap.servers' = '%(boot)s',
  'properties.group.id' = '%(group)s', 'scan.startup.mode' = 'earliest-offset', 'format' = 'json');
CREATE TEMPORARY TABLE orders_copy (order_id INT, store_id STRING, total_cents INT) WITH ('connector' = 'kafka', 'topic' = '%(sink)s', 'properties.bootstrap.servers' = '%(boot)s',
  'format' = 'json', 'sink.delivery-guarantee' = '%(guarantee)s'%(txn)s);
INSERT INTO orders_copy SELECT order_id, store_id, total_cents FROM orders;
"""


def state_script(boot, topic, sink, p=2, group='state', startup='earliest-offset', sets='', checkpoint='3 s', recover=None):
    s = ''
    if checkpoint:
        s += "SET 'execution.checkpointing.interval' = '%s';\n" % checkpoint
    if recover:
        s += "SET 'execution.state-recovery.path' = '%s';\n" % recover
    return STATE_SQL % {'p': p, 'sets': s + sets, 'topic': topic, 'boot': boot, 'group': group, 'startup': startup, 'sink': sink}


def totals(boot, sink):
    """The last value for every store in an upsert-kafka topic: store -> (n, cents)."""
    cur = {}
    for _, _, k, v, _ in kx.read_all(boot, sink, timeout=8, raw=False):
        if v is None:
            continue
        d = json.loads(v)
        cur[d['store_id']] = (d['n'], d['cents'])
    return cur


def wait_total(boot, sink, n, timeout=120):
    t0 = time.time()
    while True:
        cur = totals(boot, sink)
        if sum(x[0] for x in cur.values()) >= n:
            return cur
        if time.time() - t0 > timeout:
            return cur
        time.sleep(1)


def wait_restart(f, jid, timeout=120):
    """Wait until the job has failed over and is running again: a failure was recorded and the state is RUNNING."""
    t0 = time.time()
    while time.time() - t0 < timeout:
        ex = f.rest('/jobs/%s/exceptions' % jid)['exceptionHistory']['entries']
        st = f.job(jid)['state']
        if ex and st == 'RUNNING':
            return ex
        if st in ('FAILED', 'CANCELED', 'FINISHED'):
            return ex
        time.sleep(0.5)
    raise TimeoutError('the job did not come back')


def root_cause(entry):
    lines = [l.strip() for l in entry['stacktrace'].split('\n') if l.startswith('Caused by') or l.startswith('org.apache') or l.startswith('java.')]
    return lines[-1] if lines else entry['exceptionName']


def completed_id(f, jid):
    c = f.checkpoints(jid)
    return (c.get('latest') or {}).get('completed', {}).get('id') if (c.get('latest') or {}).get('completed') else None


def tree(root, strip):
    """A listing of a folder: relative path and size in bytes, sorted."""
    rows = []
    for p in sorted(root.rglob('*')):
        if p.is_file():
            rows.append([re.sub(strip, '<job id>', str(p.relative_to(root))), p.stat().st_size])
    return rows


def kill_and_replace(f, jid, restart_tm=True):
    """Kill, with signal 9, the TaskManager that runs the job. Gives the index of the TaskManager that was killed."""
    tms = f.tm_of_job(jid)
    assert len(tms) == 1, tms
    i = next(iter(tms))
    f.kill_tm(i)
    return i


def record_state(f, kc, rec):
    f.cancel_all()
    f.wait_idle()
    boot = kc.bootstrap
    only = os.environ.get('STATE_ONLY', 'a,b,c,d,e').split(',')          # for working on one part
    if 'a' not in only:
        return record_rest(f, kc, rec, only)
    # ====== A: a keyed count with checkpoints, a TaskManager is killed ======
    fx.fresh_topic(kx, boot, 'orders_a', partitions=2)
    fx.fresh_topic(kx, boot, 'totals_a', partitions=1)
    pacer = fx.Pacer(kx, boot, 'orders_a', N_AGG, rate=100)
    pacer.start()
    jid, out = fx.submit(f, state_script(boot, 'orders_a', 'totals_a'), name='state_a')
    f.wait_state(jid, 'RUNNING')
    f.wait_checkpoints(jid, 3)
    rec.counts('state.a_before', {'tms_running_the_job': sorted(f.tm_of_job(jid)), 'checkpoint_interval_seconds': 3, 'parallelism': 2, 'slots_total': f.rest('/overview')['slots-total']})
    cp_before = f.checkpoints(jid)
    before_id = cp_before['latest']['completed']['id']
    chk_files = tree(f.work / 'checkpoints', r'[0-9a-f]{32}')
    rec.table('state.checkpoint_files', ['file (below the checkpoint folder)', 'bytes'], chk_files)
    killed = kill_and_replace(f, jid)
    ex = wait_restart(f, jid)
    pacer.join()
    cur = wait_total(boot, 'totals_a', N_AGG)
    want = fx.expected_totals(kx, N_AGG)
    ok = {k: tuple(v) for k, v in cur.items()} == {k: tuple(v) for k, v in want.items()}
    cps = f.checkpoints(jid)
    rec.counts('state.a_result', {'orders_sent': N_AGG, 'orders_counted': sum(x[0] for x in cur.values()), 'stores': len(cur), 'totals_equal_the_truth': ok,
                                  'failures_recorded': len(ex), 'first_failure_root_cause': re.sub(r'\b[0-9a-f]{32}\b', '<id>', re.sub(r'localhost:\d+-[0-9a-f]+', '<taskmanager>', root_cause(ex[0]))) if ex else None,
                                  'checkpoint_before_the_kill': before_id, 'job_state': f.job(jid)['state'],
                                  'restored_checkpoint_counted': cps['counts']['restored'], 'checkpoints_completed': cps['counts']['completed'], 'checkpoints_failed': cps['counts']['failed']})
    rec.text('state.a_jobmanager_log', '\n'.join(f.jm_log_lines(r'switched from state|Restoring job|Closing TaskExecutor connection|Completed checkpoint \\d+ .*|restart', job=jid)[:30]))
    # the cluster is two TaskManagers: put the one that was killed back
    f.start_tm(killed)
    f.cancel(jid)
    f.wait_slots(f.n_tm * f.slots)
    assert ok, (cur, want)
    record_rest(f, kc, rec, only)


def record_rest(f, kc, rec, only):
    if 'b' in only:
        run_b(f, kc, rec)
    if 'c' in only:
        run_copy(f, kc, rec, 'exactly-once', 'eo')
        run_copy(f, kc, rec, 'at-least-once', 'alo')
    if 'd' in only:
        run_savepoint(f, kc, rec)
    if 'e' in only:
        run_backends(f, rec)


def run_b(f, kc, rec):
    """The same job without checkpoints: the TaskManager is killed, and the job is gone."""
    boot = kc.bootstrap
    fx.fresh_topic(kx, boot, 'orders_b', partitions=2)
    fx.fresh_topic(kx, boot, 'totals_b', partitions=1)
    pacer = fx.Pacer(kx, boot, 'orders_b', 1200, rate=100)
    pacer.start()
    jid, out = fx.submit(f, state_script(boot, 'orders_b', 'totals_b', checkpoint=None), name='state_b')
    f.wait_state(jid, 'RUNNING')
    time.sleep(4)
    killed = kill_and_replace(f, jid)
    st = f.wait_state(jid, 'FAILED', timeout=90)
    ex = f.rest('/jobs/%s/exceptions' % jid)['exceptionHistory']['entries']
    pacer.join()
    causes = [re.sub(r'localhost:\d+-[0-9a-f]+', '<taskmanager>', l.strip()) for l in ex[0]['stacktrace'].split('\n') if l.startswith('Caused by') or l.startswith('org.apache')][:4]
    rec.counts('state.b_result', {'final_state': st, 'checkpoints_completed': f.checkpoints(jid)['counts']['completed'] if True else 0, 'exception_chain': causes,
                                  'restart_strategy_message': 'Recovery is suppressed by NoRestartBackoffTimeStrategy' in ex[0]['stacktrace']})
    f.start_tm(killed)
    f.wait_slots(f.n_tm * f.slots)


def read_ids(boot, topic, isolation):
    rows = kx.read_all(boot, topic, isolation=isolation, timeout=20)
    return [json.loads(v)['order_id'] for _, _, _, v, _ in rows if v]


def run_copy(f, kc, rec, guarantee, tag, n=5000):
    boot = kc.bootstrap
    src, sink = 'orders_' + tag, 'copy_' + tag
    fx.fresh_topic(kx, boot, src, partitions=2)
    fx.fresh_topic(kx, boot, sink, partitions=1)
    txn = ", 'sink.transactional-id-prefix' = 'copy-%s', 'properties.transaction.timeout.ms' = '120000'" % tag if guarantee == 'exactly-once' else ''
    script = COPY_SQL % {'topic': src, 'boot': boot, 'group': 'copy-' + tag, 'sink': sink, 'guarantee': guarantee, 'txn': txn}
    pacer = fx.Pacer(kx, boot, src, n, rate=100)
    pacer.start()
    jid, out = fx.submit(f, script, name='copy_' + tag)
    f.wait_state(jid, 'RUNNING')
    c0 = f.wait_checkpoints(jid, 2)['counts']['completed']
    t0 = time.time()
    while f.checkpoints(jid)['counts']['completed'] <= c0 and time.time() - t0 < 30:       # a checkpoint has just finished
        time.sleep(0.2)
    time.sleep(3)                                                                           # three seconds of orders go into the sink after it
    last = f.checkpoints(jid)['latest']['completed']['id']
    killed = kill_and_replace(f, jid)
    wait_restart(f, jid)
    pacer.join()
    t0 = time.time()
    while time.time() - t0 < 90:
        ids = read_ids(boot, sink, 'read_committed')
        if len(set(ids)) >= n:
            break
        time.sleep(2)
    time.sleep(8)                                                                           # a duplicate that is still on its way would show now
    committed = read_ids(boot, sink, 'read_committed')
    everything = read_ids(boot, sink, 'read_uncommitted')
    res = {'guarantee': guarantee, 'orders_sent': n, 'checkpoint_before_the_kill': last, 'records_a_read_committed_reader_sees': len(committed), 'distinct_orders': len(set(committed)),
           'duplicates': len(committed) - len(set(committed)), 'missing': n - len(set(committed)), 'records_in_the_log': len(everything),
           'records_of_aborted_transactions': len(everything) - len(committed)}
    rec.counts('state.copy_' + tag, res)
    f.start_tm(killed)
    f.cancel(jid)
    f.wait_slots(f.n_tm * f.slots)
    return res


def run_savepoint(f, kc, rec):
    boot = kc.bootstrap
    fx.fresh_topic(kx, boot, 'orders_d', partitions=2)
    fx.fresh_topic(kx, boot, 'totals_d', partitions=1)
    first, second = 1200, 1200
    p = kx.producer(boot, **{'linger.ms': 5, 'batch.num.messages': 50})

    def produce(start, n):
        for i in range(start, start + n):
            o = kx.order(i)
            p.produce('orders_d', key=o['store_id'], value=json.dumps({k: o[k] for k in ('order_id', 'store_id', 'total_cents')}, separators=(',', ':')))
        p.flush(60)
    produce(0, first)
    jid, out = fx.submit(f, state_script(boot, 'orders_d', 'totals_d', p=2, group='d1'), name='sp_1')
    f.wait_state(jid, 'RUNNING')
    cur = wait_total(boot, 'totals_d', first)
    f.wait_checkpoints(jid, 1)
    rc, out, err = f.cli('stop', '--savepointPath', 'file://%s' % (f.work / 'savepoints'), jid)
    path = re.search(r'Path: (\S+)', out)
    sp_path = path.group(1) if path else None
    rec.text('state.savepoint_command', fx.norm('flink stop --savepointPath <savepoints> <job id>\n' + out + (('\n' + err) if err.strip() else ''), f))
    st = f.wait_state(jid, 'FINISHED', timeout=60)
    sp_dir = pathlib_path(sp_path)
    rec.table('state.savepoint_files', ['file (below the savepoint folder)', 'bytes'], tree(sp_dir, r'[0-9a-f]{32}') if sp_dir else [])
    produce(first, second)
    # job 2: the same query, restored from the savepoint, with one more parallel task
    jid2, out = fx.submit(f, state_script(boot, 'orders_d', 'totals_d', p=3, group='d2', recover=sp_path), name='sp_2')
    f.wait_state(jid2, 'RUNNING')
    cur = wait_total(boot, 'totals_d', first + second)
    want = fx.expected_totals(kx, first + second)
    ok = {k: tuple(v) for k, v in cur.items()} == {k: tuple(v) for k, v in want.items()}
    rec.counts('state.savepoint_result', {'stopped_job_state': st, 'first_batch': first, 'second_batch': second, 'parallelism_before': 2, 'parallelism_after': 3, 'orders_counted': sum(x[0] for x in cur.values()),
                                          'totals_equal_the_truth': ok, 'restored_from_savepoint': f.checkpoints(jid2)['latest'].get('restored') is not None})
    f.cancel(jid2)
    f.wait_idle()
    assert ok, (cur, want)
    # job 3: the same query, not restored: it starts at the end of the topic, with no state
    fx.fresh_topic(kx, boot, 'totals_d3', partitions=1)
    jid3, out = fx.submit(f, state_script(boot, 'orders_d', 'totals_d3', p=2, group='d3', startup='latest-offset'), name='sp_3')
    f.wait_state(jid3, 'RUNNING')
    time.sleep(8)
    produce(first + second, 600)
    cur3 = wait_total(boot, 'totals_d3', 600)
    rec.counts('state.no_savepoint_result', {'orders_in_the_topic': first + second + 600, 'orders_counted_by_the_new_job': sum(x[0] for x in cur3.values())})
    f.cancel(jid3)
    f.wait_idle()
    # job 4: a different query restored from the savepoint
    changed = state_script(boot, 'orders_d', 'totals_d', p=2, group='d4', recover=sp_path).replace('SUM(total_cents) AS cents', 'SUM(total_cents) AS cents, MAX(total_cents) AS biggest')
    changed = changed.replace('cents BIGINT, PRIMARY KEY', 'cents BIGINT, biggest INT, PRIMARY KEY')
    jid4, out = fx.submit(f, changed, name='sp_4')
    t0 = time.time()
    while time.time() - t0 < 60 and f.job(jid4)['state'] not in ('FAILED', 'RUNNING'):
        time.sleep(0.5)
    time.sleep(3)
    j4 = f.job(jid4)
    ex = f.rest('/jobs/%s/exceptions' % jid4)['exceptionHistory']['entries']
    msg = ''
    if ex:
        lines = [l.strip() for l in ex[0]['stacktrace'].split('\n') if l.startswith('Caused by') or l.startswith('org.apache') or 'savepoint' in l.lower()]
        msg = fx.norm('\n'.join(lines[:4]), f)
    rec.counts('state.changed_query', {'job_state': j4['state'], 'message': msg})
    f.cancel(jid4)


def pathlib_path(uri):
    import pathlib
    if not uri:
        return None
    return pathlib.Path(re.sub(r'^file:', '', uri))


DEDUP_SQL = """SET 'parallelism.default' = '1';
SET 'execution.checkpointing.interval' = '3 s';
SET 'state.backend.type' = '%(backend)s';
SET 'execution.checkpointing.incremental' = '%(incremental)s';
CREATE TEMPORARY TABLE orders (order_id BIGINT, store_id STRING, note STRING, pt AS PROCTIME())
WITH ('connector' = 'datagen', 'rows-per-second' = '2000', 'fields.order_id.kind' = 'sequence', 'fields.order_id.start' = '1', 'fields.order_id.end' = '400000',
      'fields.store_id.length' = '3', 'fields.note.length' = '50');
CREATE TEMPORARY TABLE firsts (order_id BIGINT, store_id STRING, note STRING) WITH ('connector' = 'blackhole');
INSERT INTO firsts SELECT order_id, store_id, note FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY pt) AS rn FROM orders) WHERE rn = 1;
"""


def run_backends(f, rec):
    """The same job, a deduplication on the order id, with the state in the memory of the TaskManager (heap) and in RocksDB, whole and incrementally."""
    f.cancel_all()
    f.wait_idle()
    rows = []
    listing = None
    for label, backend, inc in (('heap (HashMapStateBackend)', 'hashmap', 'false'), ('RocksDB, full checkpoints', 'rocksdb', 'false'), ('RocksDB, incremental checkpoints', 'rocksdb', 'true')):
        jid, out = fx.submit(f, DEDUP_SQL % {'backend': backend, 'incremental': inc}, name='backend_' + backend + inc)
        f.wait_state(jid, 'RUNNING')
        vid = next(v['id'] for v in f.job(jid)['vertices'] if 'Deduplicate' in v['name'])
        f.wait_checkpoints(jid, 6)
        done = sorted([c for c in f.checkpoints(jid)['history'] if c['status'] == 'COMPLETED'], key=lambda c: c['id'])[:6]
        det = [f.rest('/jobs/%s/checkpoints/details/%d' % (jid, c['id']))['tasks'][vid] for c in done]
        rows.append([label, det[0]['state_size'], det[-1]['state_size'], det[0]['checkpointed_size'], det[-1]['checkpointed_size']])
        if inc == 'true':
            listing = tree(f.work / 'checkpoints', r'[0-9a-f]{32}')
            listing = [r for r in listing if not r[0].endswith('_metadata')]
            names = sorted({re.sub(r'[0-9a-f-]{36}', '<uuid>', pathlib_path(r[0]).name) for r in listing})
            rec.counts('state.rocksdb_files', {'sst_files': sum(1 for r in listing if r[0].endswith('.sst') or '/shared/' in r[0]), 'shared_folder_files': sum(1 for r in listing if '/shared/' in r[0]),
                                               'example_names': names[:3]})
        f.cancel(jid)
        f.wait_idle()
    rec.table('state.backends', ['state backend', 'size of the state, checkpoint 1 (bytes)', 'size of the state, checkpoint 6', 'bytes written, checkpoint 1', 'bytes written, checkpoint 6'], rows)
    rec.counts('state.backends_summary', {'heap_written_6': rows[0][4], 'rocksdb_full_written_6': rows[1][4], 'rocksdb_incremental_written_6': rows[2][4], 'rocksdb_incremental_state_6': rows[2][2],
                                          'incremental_writes_less_than_the_state': rows[2][4] < rows[2][2]})
