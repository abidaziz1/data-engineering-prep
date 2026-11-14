"""Mission 7: the DataStream API. A Java job with keyed state and a timer is compiled here, run on the cluster, stopped with a savepoint, and started again, once with the wrong operator id.

Every output is read from the real thing: javac, the jar, `flink run`, `flink stop`, the print sink, and the KeyGroupRangeAssignment class of Flink itself.
"""
import json
import os
import pathlib
import re
import subprocess
import time

import fcluster as F
import fx
import kx

APP = pathlib.Path(__file__).resolve().parent / 'app'


def compile_jar(f, work, files=('StoreWatch.java', 'KeyGroups.java', 'Pipe.java'), jar_name='storewatch.jar', folder='classes'):
    """javac against the jars of the distribution and the Kafka connector, then jar. The Java files are the ones in verify/app."""
    classes = work / folder
    classes.mkdir(parents=True, exist_ok=True)
    cp = ':'.join([str(F.check_home() / 'lib' / '*'), str(F.KAFKA_JAR)] if F.KAFKA_JAR else [str(F.check_home() / 'lib' / '*')])
    r = subprocess.run(['javac', '-proc:none', '--release', '17', '-cp', cp, '-d', str(classes)] + [str(APP / n) for n in files], capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(r.stderr[-3000:])
    jar = work / jar_name
    r = subprocess.run(['jar', 'cf', str(jar), '-C', str(classes), '.'], capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(r.stderr)
    return jar, classes, cp


def subtasks(printed):
    """key -> subtask index from the lines 'N> first order of sXX seen by subtask K'."""
    return {m.group(1): int(m.group(2)) for m in re.finditer(r'first order of (s\d\d) seen by subtask (\d)', printed)}


def record_datastream(f, kc, rec):
    f.cancel_all()
    f.wait_idle()
    boot = kc.bootstrap
    work = f.work / 'build'
    jar, classes, cp = compile_jar(f, work)
    rec.file('code/app/StoreWatch.java', (APP / 'StoreWatch.java').read_text().rstrip('\n'))
    rec.file('code/app/KeyGroups.java', (APP / 'KeyGroups.java').read_text().rstrip('\n'))
    jv = subprocess.run(['javac', '-version'], capture_output=True, text=True)
    rec.counts('datastream.build', {'javac': F.clean(jv.stdout + jv.stderr),
                                    'release': 17, 'classes': sorted(p.name for p in (classes / 'brewline').iterdir()), 'jar_bytes': jar.stat().st_size,
                                    'jar_holds_the_kafka_connector': False})

    # ---- which task holds which key: asked of Flink's own class ----
    stores = ['s%02d' % i for i in range(1, 13)]
    r = subprocess.run(['java', '-cp', str(classes) + ':' + str(F.check_home() / 'lib' / '*'), 'brewline.KeyGroups', '128'] + stores, capture_output=True, text=True)
    rows = [l.split(',') for l in F.clean(r.stdout).splitlines()[1:]]
    rec.table('datastream.key_groups', ['key', 'key group (of 128)', 'task, if parallelism is 2', 'task, if parallelism is 3', 'task, if parallelism is 4'], [[a, int(b), int(c), int(d), int(e)] for a, b, c, d, e in rows])

    # ---- run the job ----
    fx.fresh_topic(kx, boot, 'orders_s', partitions=2)
    p = kx.producer(boot, **{'linger.ms': 5, 'batch.num.messages': 50})

    def produce(start, n):
        for i in range(start, start + n):
            o = kx.order(i)
            p.produce('orders_s', key=o['store_id'], value=json.dumps({k: o[k] for k in ('order_id', 'store_id', 'total_cents')}, separators=(',', ':')))
        p.flush(60)

    def run_args(savepoint=None, uid=None):
        a = ['run', '-d', '-p', '2', '-c', 'brewline.StoreWatch'] + (['-s', savepoint] if savepoint else [])
        a += [str(jar), '--bootstrap', boot, '--topic', 'orders_s', '--idle-seconds', '5'] + (['--uid', uid] if uid else [])
        return a
    produce(0, 600)
    mark = f.out_mark()
    rc, out, err = f.cli(*run_args())
    jid = re.search(r'JobID (\w{32})', out + err).group(1)
    rec.text('datastream.run_command', fx.norm('flink run -d -p 2 -c brewline.StoreWatch storewatch.jar --bootstrap localhost:9092 --topic orders_s --idle-seconds 5\n' + out, f))
    f.wait_state(jid, 'RUNNING')
    plan = f.rest('/jobs/%s/plan' % jid)['plan']
    j = f.job(jid)
    rows = []
    for n in sorted(plan['nodes'], key=lambda n: 'inputs' in n):
        v = next(v for v in j['vertices'] if v['id'] == n['id'])
        rows.append([v['name'], n['parallelism'], n['inputs'][0]['ship_strategy'] if n.get('inputs') else 'a source'])
    rec.table('datastream.vertices', ['vertex (operators chained inside it)', 'parallelism', 'records arrive by'], rows)
    t0 = time.time()
    while time.time() - t0 < 60:
        printed = f.out_since(mark)
        if len(re.findall(r'idle s\d\d', printed)) >= 12:
            break
        time.sleep(1)
    printed = f.out_since(mark)
    seen = subtasks(printed)
    real = {r[0]: r[2] for r in rec.out['tables']['datastream.key_groups']['rows']}
    rec.counts('datastream.assignment', {'keys_seen': len(seen), 'runtime_equals_keygroup_class_for_p2': all(seen[k] == real[k] for k in seen) and len(seen) == 12,
                                         'tasks_used': sorted(set(seen.values()))})
    idle = sorted(re.findall(r'idle (s\d\d) orders=(\d+) cents=(\d+)', printed))
    want = fx.expected_totals(kx, 600)
    rec.counts('datastream.first_run', {'orders': 600, 'idle_lines': len(idle), 'totals_equal_the_truth': {k: (int(a), int(b)) for k, a, b in idle} == {k: tuple(v) for k, v in want.items()}})
    firsts = {m.group(2): (m.group(1), int(m.group(3))) for m in re.finditer(r'(\d)> first order of (s\d\d) seen by subtask (\d)', printed)}
    rec.table('datastream.printed', ['key', 'line the sink printed', 'task that held the key'],
              [[k, '%s> first order of %s ...' % firsts[k][:1] + k if False else '%s> first order of %s seen by subtask %d' % (firsts[k][0], k, firsts[k][1]), firsts[k][1]] for k in sorted(firsts)][:4])
    rec.text('datastream.idle_lines', '\n'.join(sorted(l for l in printed.splitlines() if '> idle ' in l)[:4]))

    # ---- stop with a savepoint ----
    rc, out, err = f.cli('stop', '--savepointPath', 'file://%s' % (f.work / 'savepoints'), jid)
    sp = re.search(r'Path: (\S+)', out).group(1)
    f.wait_state(jid, 'FINISHED', timeout=60)
    f.wait_idle()
    produce(600, 600)

    # ---- start again with another operator id ----
    rc, out, err = f.cli(*run_args(savepoint=sp, uid='renamed'))
    jid_bad = re.search(r'JobID (\w{32})', out + err).group(1)
    t0 = time.time()
    while time.time() - t0 < 60 and f.job(jid_bad)['state'] not in ('FAILED', 'RESTARTING', 'RUNNING'):
        time.sleep(0.5)
    time.sleep(2)
    ex = f.rest('/jobs/%s/exceptions' % jid_bad)['exceptionHistory']['entries']
    msg = ''
    if ex:
        head = [l.strip() for l in ex[0]['stacktrace'].split('\n') if not l.strip().startswith('at ')]
        lines = [l for l in head if 'Cannot map checkpoint/savepoint state' in l or 'Failed to rollback' in l]
        msg = fx.norm(lines[0] if lines else head[0], f)
        msg = re.sub(r'file:\S+?(?=\. )', '<savepoint>', msg)
    rec.counts('datastream.wrong_uid', {'cli_exit_code': rc, 'submitted': 'JobID' in out + err, 'job_state': f.job(jid_bad)['state'], 'message': msg})
    f.cancel_all()
    f.wait_idle()

    # ---- start again with the same operator id ----
    mark = f.out_mark()
    rc, out, err = f.cli(*run_args(savepoint=sp))
    jid2 = re.search(r'JobID (\w{32})', out + err).group(1)
    f.wait_state(jid2, 'RUNNING')
    t0 = time.time()
    idle2 = []
    while time.time() - t0 < 60:
        printed = f.out_since(mark)
        idle2 = sorted(re.findall(r'idle (s\d\d) orders=(\d+) cents=(\d+)', printed))
        if len(idle2) >= 12:
            break
        time.sleep(1)
    want2 = fx.expected_totals(kx, 1200)
    rec.table('datastream.orders_per_store', ['store', 'orders', 'cents'], [[k, v[0], v[1]] for k, v in sorted(want2.items())])
    ok = {k: (int(a), int(b)) for k, a, b in idle2} == {k: tuple(v) for k, v in want2.items()}
    rec.counts('datastream.restored', {'orders_in_total': 1200, 'idle_lines': len(idle2), 'totals_equal_the_truth': ok, 'sample': idle2[:3]})
    f.cancel(jid2)
    assert ok, (idle2, want2)
    f.wait_idle()
    record_max_parallelism(f, rec, work)
    record_round(f, rec, work)


def record_max_parallelism(f, rec, work):
    """The default maximum parallelism (the number of key groups), asked of the class that Flink uses."""
    jar, classes, cp = compile_jar(f, work, files=('MaxParallelism.java',), jar_name='maxpar.jar', folder='classes_maxpar')
    rec.file('code/app/MaxParallelism.java', (APP / 'MaxParallelism.java').read_text().rstrip('\n'))
    ps = ['1', '2', '4', '10', '85', '86', '100', '1000', '30000']
    r = subprocess.run(['java', '-cp', str(classes) + ':' + str(F.check_home() / 'lib' / '*'), 'brewline.MaxParallelism'] + ps, capture_output=True, text=True)
    lines = F.clean(r.stdout).splitlines()
    rows = [[int(a), int(b)] for a, b in (l.split(',') for l in lines[1:1 + len(ps)])]
    rec.table('datastream.max_parallelism', ['parallelism of the operator', 'default maximum parallelism (key groups)'], rows)
    bounds = dict(l.split(',') for l in lines[1 + len(ps):])
    rec.counts('datastream.max_parallelism_bounds', {'lower_bound': int(bounds['lower_bound']), 'upper_bound': int(bounds['upper_bound'])})


ROUND_ORDERS = [(1, 's01', 300), (2, 's02', 337), (3, 's07', 374), (4, 's01', 411), (5, 's04', 448), (6, 's11', 485), (7, 's01', 522), (8, 's06', 559), (9, 's01', 596), (10, 's04', 633),
                (11, 's09', 670), (12, 's01', 707)]


def round_truth(limit=1000):
    """What the coding round must print, worked out here in plain Python: the line for the order that makes the running total of a store reach the limit."""
    tot, out = {}, []
    for oid, store, cents in ROUND_ORDERS:
        before = tot.get(store, 0)
        tot[store] = before + cents
        if before < limit <= tot[store]:
            out.append('%s passed %d cents with order %d, total %d' % (store, limit, oid, tot[store]))
    return sorted(out)


def record_round(f, rec, work):
    """The DataStream coding round: a keyed function with state that says when a store passes 1,000 cents. Compiled here, run on the cluster, and read from the print sink."""
    jar, classes, cp = compile_jar(f, work, files=('PassThousand.java',), jar_name='passthousand.jar', folder='classes_round')
    rec.file('code/app/PassThousand.java', (APP / 'PassThousand.java').read_text().rstrip('\n'))
    mark = f.out_mark()
    rc, out, err = f.cli('run', '-d', '-p', '2', '-c', 'brewline.PassThousand', str(jar))
    jid = re.search(r'JobID (\w{32})', out + err).group(1)
    f.wait_state(jid, 'FINISHED', timeout=90)
    time.sleep(2)
    printed = f.out_since(mark)
    lines = sorted(re.sub(r'^\d+> ', '', l) for l in printed.splitlines() if ' passed ' in l)
    rec.table('datastream.round_output', ['line that the print sink wrote'], [[l] for l in lines])
    rec.counts('datastream.round', {'orders': len(ROUND_ORDERS), 'lines': len(lines), 'job_state': f.job(jid)['state'], 'equals_plain_python': lines == round_truth(), 'limit_cents': 1000,
                                    'classes': sorted(p.name for p in (classes / 'brewline').iterdir())})
    assert lines == round_truth(), (lines, round_truth())
