"""Mission 1: what a Flink cluster is made of, and what a job looks like to the cluster.

Every output here is read from the real processes: the REST interface of the JobManager, the process list, the files of the distribution, the SQL client and the `flink` tool.
"""
import html
import json
import os
import re
import subprocess
import time

import fcluster as F
import fx

SRC = """SET 'parallelism.default' = '%(p)d';
%(extra)sCREATE TEMPORARY TABLE orders (order_id BIGINT, store_id STRING, total_cents INT)
WITH ('connector' = 'datagen', 'rows-per-second' = '20', 'fields.order_id.min' = '1', 'fields.order_id.max' = '1000000',
      'fields.store_id.length' = '1', 'fields.total_cents.min' = '300', 'fields.total_cents.max' = '800');
CREATE TEMPORARY TABLE counts (store_id STRING, n BIGINT, cents BIGINT, PRIMARY KEY (store_id) NOT ENFORCED) WITH ('connector' = 'print');
INSERT INTO counts SELECT store_id, count(*), sum(total_cents) FROM orders WHERE total_cents > 350 GROUP BY store_id;
"""

MIB = 1024 * 1024


def operators(desc):
    """The operators of one vertex from the description that the plan gives: [4]:GroupAggregate(...)<br/>+- [5]:Calc(...)."""
    parts = re.split(r'<br/>', desc)
    out = []
    for p in parts:
        p = html.unescape(re.sub(r'^[\s+\-]*', '', p)).strip()
        m = re.match(r'\[(\d+)\]:(\w+)', p)
        if m:
            out.append((int(m.group(1)), m.group(2), p))
    return out


def op_name(o):
    """Calc, GroupAggregate, TableSourceScan(orders), Sink(counts): the operator and, for a source or a sink, the table it reads or writes."""
    kind, text = o[1], o[2]
    m = re.search(r'table=\[\[default_catalog, default_database, (\w+)', text) or re.search(r'table=\[default_catalog\.default_database\.(\w+)', text)
    return '%s(%s)' % (kind, m.group(1)) if m and kind in ('TableSourceScan', 'Sink') else kind


def submit_wait(f, p, extra=''):
    jid, out = fx.submit(f, SRC % {'p': p, 'extra': extra}, name='world_p%d' % p)
    t0 = time.time()
    while time.time() - t0 < 60:
        st = f.job(jid)['state']
        if st in ('RUNNING', 'FAILED'):
            break
        time.sleep(0.3)
    time.sleep(2.5)
    return jid


def record_world(f, rec):
    """The map: the processes, the memory of a TaskManager, the files of the distribution, one job as the cluster sees it, slots, chaining, and what happens with too few slots."""
    f.cancel_all()
    f.wait_idle()
    ov = f.rest('/overview')
    cfg = {c['key']: c['value'] for c in f.rest('/jobmanager/config')}
    rec.counts('world.cluster', {'version': F.version(), 'taskmanagers': ov['taskmanagers'], 'slots_total': ov['slots-total'], 'slots_per_taskmanager': int(cfg['taskmanager.numberOfTaskSlots']),
                                 'jobmanager_process_mib': int(re.sub(r'\D', '', cfg['jobmanager.memory.process.size'])), 'taskmanager_process_mib': int(re.sub(r'\D', '', cfg['taskmanager.memory.process.size'])),
                                 'heartbeat_interval_ms': int(cfg['heartbeat.interval']), 'heartbeat_timeout_ms': int(cfg['heartbeat.timeout']), 'rest_port': int(cfg['rest.port']),
                                 'default_parallelism': int(cfg['parallelism.default']), 'deployment': 'standalone session cluster, on one machine'})

    # ---- the processes ----
    ps = subprocess.run(['ps', '-eo', 'pid,args'], capture_output=True, text=True).stdout.splitlines()
    rows = []
    for line in ps:
        kind = 'JobManager' if 'StandaloneSessionClusterEntrypoint' in line else 'TaskManager' if 'TaskManagerRunner' in line else None
        if not kind or str(f.work) not in line or '/bin/java' not in line:
            continue
        xmx = int(re.search(r'-Xmx(\d+)', line).group(1)) // MIB
        main = 'StandaloneSessionClusterEntrypoint' if kind == 'JobManager' else 'TaskManagerRunner'
        rows.append([kind, 'org.apache.flink.' + ('runtime.entrypoint.' if kind == 'JobManager' else 'runtime.taskexecutor.') + main, xmx])
    rows.sort(key=lambda r: (r[0], r[2]))
    rec.table('world.processes', ['process', 'main class (a plain Java program)', 'heap it was started with (MiB)'], rows)

    # ---- one TaskManager: where its memory goes ----
    tm = f.rest('/taskmanagers')['taskmanagers'][0]
    m = f.rest('/taskmanagers/%s' % tm['id'])['memoryConfiguration']
    pieces = [('frameworkHeap', 'Framework heap', 'Flink itself'), ('taskHeap', 'Task heap', 'your code and the state of the heap state backend'),
              ('frameworkOffHeap', 'Framework off-heap', 'Flink itself, outside the heap'), ('taskOffHeap', 'Task off-heap', 'your code, outside the heap (none here)'),
              ('networkMemory', 'Network buffers', 'the buffers that carry records between tasks'), ('managedMemory', 'Managed memory', 'RocksDB, and sorting in batch jobs'),
              ('jvmMetaspace', 'JVM metaspace', 'loaded classes'), ('jvmOverhead', 'JVM overhead', 'threads, native memory, the rest')]
    rec.table('world.taskmanager_memory', ['piece', 'MiB', 'what uses it'], [[b, round(m[k] / MIB), c] for k, b, c in pieces] + [['Total process', round(m['totalProcessMemory'] / MIB), 'what the operating system sees']])
    rec.counts('world.taskmanager_memory_sums', {'total_flink_mib': round(m['totalFlinkMemory'] / MIB), 'total_process_mib': round(m['totalProcessMemory'] / MIB),
                                                 'sum_of_pieces_mib': round(sum(m[k] for k, _, _ in pieces) / MIB)})

    # ---- what is in the distribution ----
    home = F.check_home()
    names = lambda d, pat: sorted(p.name for p in (home / d).iterdir() if re.search(pat, p.name))
    rec.counts('world.distribution', {'bin': names('bin', r'\.sh$|^flink$'), 'lib': names('lib', r'\.jar$'), 'opt': names('opt', r'\.jar$'), 'plugins': names('plugins', r'^(?!README)'),
                                      'examples': names('examples', r'.')})

    # ---- one job, as the cluster sees it ----
    jid = submit_wait(f, 2)
    j = f.job(jid)
    plan = f.rest('/jobs/%s/plan' % jid)['plan']
    ids = {n['id']: 'v%d' % (i + 1) for i, n in enumerate(sorted(plan['nodes'], key=lambda n: ('inputs' in n)))}      # the source is v1
    nodes = sorted(plan['nodes'], key=lambda n: ids[n['id']])
    rows = []
    for n in nodes:
        ops = operators(n['description'])
        short = ' -> '.join(op_name(o) for o in ops)
        feed = n['inputs'][0]['ship_strategy'] if n.get('inputs') else 'nothing: a source'
        rows.append([ids[n['id']], short, n['parallelism'], feed])
    rec.table('world.plan', ['vertex', 'operators chained inside it', 'parallelism', 'records arrive by'], rows)
    rec.text('world.plan_vertices', '\n'.join('%s  %s  (parallelism %d)  status %s' % (ids.get(v['id'], v['id']), v['name'], v['parallelism'], v['status']) for v in j['vertices']))
    pj = json.loads(json.dumps(plan))
    for n in pj['nodes']:
        n['description'] = html.unescape(n['description']).replace('<br/>', '\n')
        n['id'] = ids[n['id']]
        for i in n.get('inputs', []):
            i['id'] = ids[i['id']]
    pj['jid'] = '<job id>'
    rec.text('world.plan_json', json.dumps({'plan': {k: pj[k] for k in ('jid', 'name', 'type', 'nodes')}}, indent=1))
    slots_p2 = ov['slots-total'] - f.rest('/overview')['slots-available']
    n_tasks_p2 = sum(v['parallelism'] for v in j['vertices'])
    stat = f.job(jid)
    rec.counts('world.job', {'vertices': len(stat['vertices']), 'parallelism': 2, 'tasks': n_tasks_p2, 'slots_used': slots_p2, 'state': stat['state'], 'type': stat['job-type'] if 'job-type' in stat else 'STREAMING'})
    rec.text('world.job_rest_keys', ', '.join(sorted(stat.keys())))
    f.cancel(jid)
    time.sleep(1.5)

    # ---- the SQL that made it, and the plan before the cluster ----
    rc, out, err = f.sql("""CREATE TEMPORARY TABLE orders (order_id BIGINT, store_id STRING, total_cents INT) WITH ('connector' = 'datagen');
EXPLAIN SELECT store_id, count(*), sum(total_cents) FROM orders WHERE total_cents > 350 GROUP BY store_id;""", name='world_explain')
    ex = F.strip_ansi(out)
    plan_txt = ex[ex.index('== Optimized Execution Plan =='):].split('\n |')[0].strip() if '== Optimized Execution Plan ==' in ex else ex
    rec.text('world.explain', fx.norm(plan_txt))

    # ---- slots: parallelism against what the cluster has ----
    rows = []
    for p in (1, 2, 4, 5):
        jid = submit_wait(f, p)
        j = f.job(jid)
        free = f.rest('/overview')['slots-available']
        tasks = sum(v['parallelism'] for v in j['vertices'])
        cause = ''
        if j['state'] == 'FAILED':
            ent = f.rest('/jobs/%s/exceptions' % jid)['exceptionHistory']['entries']
            causes = [l.strip() for e in ent[:1] for l in e['stacktrace'].split('\n') if l.startswith('Caused by') and 'NoResource' in l]
            cause = re.sub(r'^Caused by: ', '', causes[-1]) if causes else ''
        rows.append([p, tasks, ov['slots-total'] - free if j['state'] == 'RUNNING' else 0, j['state'], cause])
        f.cancel(jid)
        time.sleep(1.5)
    rec.table('world.slots', ['parallelism', 'tasks (vertices x parallelism)', 'slots in use', 'state of the job', 'error'], rows)

    # ---- operator chaining on and off ----
    rows = []
    for label, extra in (('on (the default)', ''), ('off', "SET 'pipeline.operator-chaining.enabled' = 'false';\n")):
        jid = submit_wait(f, 2, extra)
        j = f.job(jid)
        rows.append([label, len(j['vertices']), sum(v['parallelism'] for v in j['vertices']), ' | '.join(re.sub(r'\[\d+\]', '', v['name']) for v in sorted(j['vertices'], key=lambda v: v['name']))])
        f.cancel(jid)
        time.sleep(1.5)
    rec.table('world.chaining', ['operator chaining', 'vertices', 'tasks', 'names of the vertices'], rows)

    # ---- the command line tool and the REST interface ----
    jid = submit_wait(f, 2)
    rc, out, err = f.cli('list')
    rec.text('world.flink_list', fx.norm(out))
    paths = [('/overview', 'the cluster in one line'), ('/jobs/overview', 'every job and its state'), ('/taskmanagers', 'the TaskManagers, their slots and memory'), ('/jobs/%s' % jid, 'one job: its vertices and their states'),
             ('/jobs/%s/plan' % jid, 'the job graph'), ('/jobs/%s/checkpoints' % jid, 'checkpoint counts, sizes and durations'), ('/jobs/%s/exceptions' % jid, 'the failures of a job'),
             ('/jobs/%s/vertices/%s/metrics' % (jid, f.job(jid)['vertices'][0]['id']), 'the metrics of one vertex')]
    rows = []
    for pth, what in paths:
        try:
            r = f.rest(pth)
            keys = ', '.join(sorted(r.keys())[:5]) if isinstance(r, dict) else '%d metrics' % len(r)
            rows.append([re.sub(r'[0-9a-f]{32}', '<id>', pth), what, 'works' if r is not None else 'empty', keys])
        except RuntimeError as e:
            rows.append([re.sub(r'[0-9a-f]{32}', '<id>', pth), what, 'error', str(e)[:60]])
    rec.table('world.rest', ['GET path', 'what it answers', 'result', 'first keys of the answer'], rows)
    f.cancel(jid)
