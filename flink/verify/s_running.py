"""Mission 8: running a job. A source that is faster than the step after it, the numbers that Flink gives for it, and what changes when the slow step gets more parallel tasks.

Every number is read from the REST interface of the JobManager, from a job that runs on the cluster.
"""
import json
import re
import time

import fcluster as F
import fx
import kx
import s_datastream as D

N_RECORDS = 120000


def vertex_metrics(f, jid, vid, names):
    """name -> list of values (one for each parallel task) of the metrics that the vertex reports."""
    allm = [m['id'] for m in f.rest('/jobs/%s/vertices/%s/metrics' % (jid, vid))]
    out = {}
    for n in names:
        ids = [m for m in allm if re.fullmatch(r'\d+\.' + re.escape(n), m)]
        if not ids:
            out[n] = []
            continue
        r = f.rest('/jobs/%s/vertices/%s/metrics?get=%s' % (jid, vid, ','.join(ids)))
        out[n] = [float(x['value']) for x in r]
    return out


def sample(f, jid):
    """For each vertex: how many ms of every second its tasks were busy, idle and blocked by a full output, and the records it has taken in."""
    rows, raw = [], {}
    for v in f.job(jid)['vertices']:
        m = vertex_metrics(f, jid, v['id'], ['busyTimeMsPerSecond', 'idleTimeMsPerSecond', 'backPressuredTimeMsPerSecond'])
        m.update(vertex_metrics(f, jid, v['id'], ['numRecordsIn', 'numRecordsOut']))
        total_in, total_out = round(sum(m['numRecordsIn'])), round(sum(m['numRecordsOut']))
        avg = lambda xs: round(sum(xs) / len(xs)) if xs else None
        rows.append([v['name'], v['parallelism'], avg(m['busyTimeMsPerSecond']), avg(m['idleTimeMsPerSecond']), avg(m['backPressuredTimeMsPerSecond']), total_in, total_out])
        raw[v['id']] = v['name']
    return rows


def read_count(f, jid, vid):
    """The clock and the number of records that the tasks of a vertex have taken in. The metric store of the JobManager refreshes every second, so this waits for the number to change and takes the
    clock at that moment: two such readings, some seconds apart, give a rate that does not depend on how old the stored number was."""
    first = sum(vertex_metrics(f, jid, vid, ['numRecordsIn'])['numRecordsIn'])
    t0 = time.time()
    while time.time() - t0 < 5:
        v = sum(vertex_metrics(f, jid, vid, ['numRecordsIn'])['numRecordsIn'])
        if v != first:
            return time.time(), v
        time.sleep(0.05)
    return time.time(), first


def run_pipe(f, boot, jar, lookup_p, label, sleep_ms=10):
    mark_t = time.time()
    rc, out, err = f.cli('run', '-d', '-p', '1', '-c', 'brewline.Pipe', str(jar), '--bootstrap', boot, '--topic', 'pipe_in', '--sleep-ms', str(sleep_ms), '--lookup-parallelism', str(lookup_p))
    jid = re.search(r'JobID (\w{32})', out + err).group(1)
    f.wait_state(jid, 'RUNNING')
    time.sleep(20)                                                  # long enough for the numbers of one window
    a = sample(f, jid)
    time.sleep(10)
    b = sample(f, jid)
    return jid, a, b


def record_running(f, kc, rec):
    f.cancel_all()
    f.wait_idle()
    boot = kc.bootstrap
    work = f.work / 'build'
    jar, classes, cp = D.compile_jar(f, work)
    rec.file('code/app/Pipe.java', (D.APP / 'Pipe.java').read_text().rstrip('\n'))
    fx.fresh_topic(kx, boot, 'pipe_in', partitions=2)
    p = kx.producer(boot, **{'linger.ms': 20, 'batch.num.messages': 1000})
    for i in range(N_RECORDS):
        p.produce('pipe_in', value=b'{"order_id":%d}' % i)
        if i % 20000 == 0:
            p.poll(0)
    p.flush(120)
    cols = ['vertex', 'parallel tasks', 'busy (ms of each second)', 'idle', 'blocked by a full output ("backpressured")', 'records taken in', 'records sent on']
    results = {}
    for lookup_p, label in ((1, 'one task for the slow step'), (4, 'four tasks for the slow step')):
        jid, a, b = run_pipe(f, boot, jar, lookup_p, label)
        results[lookup_p] = (a, b)
        rec.table('running.metrics_p%d' % lookup_p, cols, b)
        verts = f.job(jid)['vertices']
        src = next(v for v in verts if v['name'].startswith('Source'))
        bp = f.rest('/jobs/%s/vertices/%s/backpressure' % (jid, src['id']))
        keep = {k: bp[k] for k in ('status', 'backpressure-level') if k in bp}
        keep['subtasks'] = [{k: round(v, 2) if isinstance(v, float) else v for k, v in s.items()} for s in bp.get('subtasks', [])]
        rec.text('running.backpressure_p%d' % lookup_p, json.dumps(keep, indent=1))
        # records per second of the slow step, from two readings of its counter, each with the clock at the moment it was read (the metric calls above took some time)
        vid = next(v['id'] for v in f.job(jid)['vertices'] if v['name'].startswith('slow'))
        t1, c1 = read_count(f, jid, vid)
        time.sleep(18)
        t2, c2 = read_count(f, jid, vid)
        rate = (c2 - c1) / (t2 - t1)
        rec.counts('running.rate_p%d' % lookup_p, {'lookup_parallelism': lookup_p, 'records_per_second': round(rate), 'sleep_ms': 10, 'ceiling_per_second': lookup_p * 100, 'topic_records': N_RECORDS,
                                                   'records_counted': c2 - c1})
        f.cancel(jid)
        f.wait_idle()
    r1, r4 = (rec.out['counts']['running.rate_p%d' % k]['records_per_second'] for k in (1, 4))
    rec.counts('running.compare', {'records_per_second_with_1': r1, 'records_per_second_with_4': r4, 'ratio': round(r4 / max(r1, 1), 1)})
