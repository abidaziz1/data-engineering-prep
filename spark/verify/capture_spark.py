#!/usr/bin/env python3
"""Record what Apache Spark really does, for the Spark course. Everything here runs the real engine (PySpark 4.0.1, local mode) on made-up Brewline data,
and reads the numbers back from the event log, which is what the Spark UI is drawn from. Writes spark/js/real.js. Nothing is timed.

What is real:      plans, partition and task counts, shuffle sizes, spill, skew, file layouts, bytes read, SQL results and errors, UDF plans and call counts,
                   Structured Streaming batches and progress, Delta Lake (delta-spark 4.0.1), pytest runs, spark-submit help and configuration order.
What is not:       a cluster (everything runs in one JVM, so there is no network between executors), Spark's own web UI, Kafka, Iceberg, Hudi, YARN,
                   Kubernetes, EMR, Dataproc and Databricks. Those parts of the course are from documentation, and the screens say so.

Usage:   python3 spark/verify/capture_spark.py [--out spark/js/real.js] [--only world,conf,plans,partitions,joins,skew,memory,layout,sqlfun,udfs,streaming,tables,tests,submit,errors,eventlog] [--json FILE]
Needs:   pyspark==4.0.1, delta-spark==4.0.1, pandas<3 (PySpark 4.0 does not import with pandas 3), numpy, pyarrow, pytest, Java 17 or 21. Delta Lake loads its jars with Ivy the first time.
"""
import argparse
import glob
import importlib.metadata as md
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

ap = argparse.ArgumentParser()
ap.add_argument('--out', default=str(HERE.parent / 'js' / 'real.js'))
ap.add_argument('--only', default='world,conf,plans,partitions,joins,skew,memory,layout,sqlfun,udfs,streaming,tables,tests,submit,errors,eventlog')
ap.add_argument('--json')
ap.add_argument('--child', help='run one section in this process and write its recording to --json (used by the parent, so that each section gets its own JVM)')
args = ap.parse_args()
ONLY = set(args.only.split(','))

import session as S  # noqa: E402
import plans as P  # noqa: E402
import partitions as PT  # noqa: E402
import joins as J  # noqa: E402
import skew as K  # noqa: E402
import memory as M  # noqa: E402
import layout as L  # noqa: E402
import sqlfun as Q  # noqa: E402
import udfs as U  # noqa: E402
import streaming as T  # noqa: E402
import tables as TB  # noqa: E402
import errors as ER  # noqa: E402

# Each section runs in its own process, because some settings are read when the JVM starts (driver memory, the Delta jars). The parent makes the folder, the children share it.
IS_CHILD = bool(args.child)
WORK = os.environ.get('SPARK_CAPTURE_WORK') or tempfile.mkdtemp(prefix='spark-capture-')
os.environ['SPARK_CAPTURE_WORK'] = WORK
LAKE = os.path.join(WORK, 'lake')
OUT_DIR = os.path.join(WORK, 'out')
os.makedirs(OUT_DIR, exist_ok=True)
if not IS_CHILD:
    import atexit  # noqa: E402
    atexit.register(lambda: shutil.rmtree(WORK, ignore_errors=True))
OUT = {'meta': {}, 'files': {}, 'text': {}, 'tables': {}, 'counts': {}}
PATHS = {k: os.path.join(LAKE, k) for k in ('orders', 'stores', 'customers')}


def text(key, s):
    OUT['text'][key] = s


def file(key, s):
    OUT['files'][key] = s


def counts(key, d):
    OUT['counts'][key] = d


def table(key, cols, rows):
    OUT['tables'][key] = {'cols': cols, 'rows': [list(r) for r in rows]}


def version(pkg):
    try:
        return md.version(pkg)
    except md.PackageNotFoundError:
        return None


def n(plan):
    return S.norm(plan, WORK)


def clean_err(msg):
    """An error line without the Java class prefix, the temporary folder, file ids and sizes."""
    m = re.sub(r'^:?\s*org\.apache\.spark\.', '', n(msg).strip())
    m = re.sub(r'part-[0-9a-f-]+-c000', 'part-N-c000', m)
    m = re.sub(r'file:///[^ ]+\.parquet', 'file:///.../<file>.parquet', m)
    m = re.sub(r'\([0-9.]+ [KMG]iB\) is bigger', '(N MiB) is bigger', m)
    return re.sub(r'of \d+ tasks', 'of N tasks', m)


def run(cmd, **kw):
    kw.setdefault('capture_output', True)
    kw.setdefault('text', True)
    return subprocess.run(cmd, **kw)


def java_version():
    r = run(['java', '-version'])
    m = re.search(r'version "([^"]+)"', r.stderr)
    return m.group(1) if m else None


OUT['meta'].update({p: version(p) for p in ('pyspark', 'delta-spark', 'pandas', 'numpy', 'pyarrow', 'pytest')})
OUT['meta'].update({'python': sys.version.split()[0], 'java': java_version(), 'company': 'Brewline',
                    'note': 'Recorded by spark/verify/capture_spark.py: the real Apache Spark in local mode on made-up data, read back from its event log. No cluster, no web UI, no Kafka.'})


def stage_rows(stages_, label=None):
    """The stages of one job group that moved data, as table rows: tasks, and the records that each task read after the shuffle."""
    rows = []
    for st in stages_:
        sr = st['shuffle_read_records']
        if sr['sum'] > 0:
            rows.append([label, st['tasks'], int(sr['min']), int(sr['median']) if sr['median'] == int(sr['median']) else sr['median'], int(sr['max']), int(sr['sum'])])
    return rows


def sec_worldfiles():
    r = S.Run('world', WORK)
    S.write_world(r.spark, LAKE)
    r.stop()


def ensure_world():
    """The three Parquet datasets are written once, by a process of their own, so that the section that calls this keeps a JVM that it can still configure (Delta needs its jars at start)."""
    if os.path.exists(PATHS['orders']):
        return
    part = os.path.join(WORK, 'part-worldfiles.json')
    r = run([sys.executable, str(pathlib.Path(__file__).resolve()), '--child', 'worldfiles', '--json', part])
    if r.returncode:
        print(r.stdout[-1500:], r.stderr[-2500:])
        raise SystemExit('writing the world failed')


# =======================================================================================================================================
def sec_world():
    ensure_world()
    r = S.Run('world-facts', WORK)
    sp = r.spark
    o = sp.read.parquet(PATHS['orders'])
    total = o.count()
    by_store = {x['store_id']: x['count'] for x in o.groupBy('store_id').count().collect()}
    guests = o.filter('customer_id IS NULL').count()
    days = o.select('dt').distinct().count()
    files_ = L.parquet_files(PATHS['orders'])
    counts('world.summary', {'orders': total, 'customers': sp.read.parquet(PATHS['customers']).count(), 'new_customers_without_orders': S.NEW_CUSTOMERS, 'stores': len(by_store), 'days': days,
                             'first_day': '2026-11-01', 'orders_files': len(files_), 'orders_kb': L.size_kb(PATHS['orders']), 'busiest_store': max(by_store, key=by_store.get),
                             'busiest_store_share': round(max(by_store.values()) / total, 3), 'guest_share': round(guests / total, 3), 'paid_share': round(o.filter("status = 'PAID'").count() / total, 3)})
    table('world.stores', ['store_id', 'orders', 'share'], [[s, by_store[s], round(by_store[s] / total, 3)] for s in sorted(by_store)])
    # the anatomy of a tiny job, read from the event log
    sp.sparkContext.setJobGroup('anatomy', 'anatomy')
    o.groupBy('store_id').count().collect()
    r.stop()
    g = S.group_stages(r.events())['anatomy']
    table('world.anatomy', ['stage', 'tasks', 'what it did'], [[i + 1, st['tasks'], 'reads files and counts inside each task' if st['shuffle_write_records']['sum'] else 'adds up what the first stage sent'] for i, st in enumerate(g)])


def sec_conf():
    r = S.Run('conf', WORK)
    sp = r.spark
    keys = [('spark.sql.shuffle.partitions', 'tasks after a shuffle'), ('spark.sql.adaptive.enabled', 'adaptive query execution'), ('spark.sql.adaptive.coalescePartitions.enabled', 'merge small shuffle partitions'),
            ('spark.sql.adaptive.skewJoin.enabled', 'split skewed join partitions'), ('spark.sql.adaptive.skewJoin.skewedPartitionFactor', 'skew: times the median'),
            ('spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes', 'skew: smallest size'), ('spark.sql.adaptive.advisoryPartitionSizeInBytes', 'target size of a shuffle partition'),
            ('spark.sql.autoBroadcastJoinThreshold', 'largest table that is broadcast'), ('spark.sql.files.maxPartitionBytes', 'largest input partition'),
            ('spark.sql.files.openCostInBytes', 'cost of opening a file'), ('spark.sql.ansi.enabled', 'ANSI SQL rules'), ('spark.sql.parquet.compression.codec', 'Parquet codec'),
            ('spark.sql.sources.partitionOverwriteMode', 'overwrite of partitions'), ('spark.sql.execution.arrow.maxRecordsPerBatch', 'rows in a pandas UDF batch'),
            ('spark.sql.streaming.stateStore.providerClass', 'where streaming state lives')]
    sp.conf.unset('spark.sql.shuffle.partitions')   # the recorder sets 8 so that small runs stay fast; the table shows what Spark itself ships with
    rows = []
    for k, what in keys:
        try:
            rows.append([k, sp.conf.get(k), what])
        except Exception:  # noqa: BLE001
            pass
    table('conf.defaults', ['setting', 'default in Spark 4.0.1', 'what it controls'], rows)
    sc = sp.sparkContext
    counts('conf.session', {'version': sp.version, 'master': sc.master, 'default_parallelism_local4': sc.defaultParallelism, 'executors_in_local_mode': 1,
                            'unified_memory_fraction': 0.6, 'storage_fraction': 0.5, 'reserved_memory_mib': 300})
    r.stop()


def sec_plans():
    ensure_world()
    r = S.Run('plans', WORK)
    sp = r.spark
    steps = P.lazy_steps(sp, PATHS['orders'])
    table('lazy.steps', ['line', 'jobs it started'], steps)
    q, ext, fmt = P.plans_of(sp, PATHS['orders'])
    parts = re.split(r'== (Parsed Logical Plan|Analyzed Logical Plan|Optimized Logical Plan|Physical Plan) ==\n', ext)
    d = {parts[i]: parts[i + 1].strip() for i in range(1, len(parts) - 1, 2)}
    # the plans share expression ids, so normalise them together
    for key, name in (('Parsed Logical Plan', 'parsed'), ('Analyzed Logical Plan', 'analyzed'), ('Optimized Logical Plan', 'optimized'), ('Physical Plan', 'physical')):
        text('plans.' + name, n(d[key]))
    text('plans.formatted', n(fmt))
    sql_q, api_q = P.sql_and_dataframe(sp, PATHS['orders'])
    counts('plans.same', {'sql_and_dataframe_have_the_same_plan': n(S.plan_text(sql_q, 'formatted')) == n(S.plan_text(api_q, 'formatted'))})
    o = P.optimizer_example(sp)
    ext2 = S.plan_text(o, 'extended')
    parts2 = re.split(r'== (Parsed Logical Plan|Analyzed Logical Plan|Optimized Logical Plan|Physical Plan) ==\n', ext2)
    d2 = {parts2[i]: parts2[i + 1].strip() for i in range(1, len(parts2) - 1, 2)}
    text('plans.fold_before', n(d2['Analyzed Logical Plan']))
    text('plans.fold_after', n(d2['Optimized Logical Plan']))
    r.stop()


def sec_partitions():
    ensure_world()
    r = S.Run('partitions', WORK)
    sp = r.spark
    table('parts.read', ['maxPartitionBytes', 'partitions of the orders'], PT.read_partitions(sp, PATHS['orders'], [('128 MiB (the default)', 134217728), ('1 MiB', 1048576), ('256 KiB', 262144)]))
    d = PT.repartition_demo(sp, PATHS['orders'])
    counts('parts.sizes', {'after_repartition_14_by_dt_rows_in_each_nonempty_partition': d['start'], 'coalesce_3': d['coalesce_3'], 'repartition_3': d['repartition_3']})
    text('parts.plan_coalesce', n(d['plan_coalesce']))
    text('parts.plan_repartition', n(d['plan_repartition']))
    text('parts.plan_repartition_by', n(d['plan_repartition_by']))
    table('parts.operations', ['operation', 'shuffles (Exchange)', 'sorts'], PT.operations(sp, PATHS['orders'], PATHS['stores']))
    PT.shuffle_settings(r, PATHS['orders'])
    r.stop()
    gs = S.group_stages(r.events())
    rows = []
    for label in ('200 partitions, adaptive off', '8 partitions, adaptive off', '200 partitions, adaptive on'):
        rr = stage_rows(gs[label], label)
        rows.append(rr[-1] if rr else [label, 0, 0, 0, 0, 0])
    table('parts.shuffle', ['setting', 'tasks in the stage after the shuffle', 'fewest records', 'median', 'most records', 'records in all'], [[x[0], x[1], x[2], x[3], x[4], x[5]] for x in rows])


def sec_joins():
    ensure_world()
    r = S.Run('joins', WORK)
    sp = r.spark
    sc = J.scenarios(sp, PATHS)
    rows = []
    for k, v in sc.items():
        plan = n(v)
        node = re.search(r'(BroadcastHashJoin|SortMergeJoin|ShuffledHashJoin|BroadcastNestedLoopJoin|CartesianProduct)', plan)
        rows.append([k, node.group(1) if node else '?', plan.count('Exchange') - plan.count('BroadcastExchange'), plan.count('BroadcastExchange')])
        text('joins.plan.' + k, J.join_lines(plan))
    table('joins.strategies', ['situation', 'join that Spark chose', 'shuffles', 'broadcasts'], rows)
    b, a = J.adaptive_switch(sp, PATHS)
    text('joins.aqe_before', J.join_lines(n(b)))
    text('joins.aqe_after', J.join_lines(n(a)))
    counts('joins.counts', J.counts(sp, PATHS))
    text('joins.pushdown', n(J.filter_goes_down(sp, PATHS)))
    r.stop()


def sec_skew():
    ensure_world()
    r = S.Run('skew', WORK)
    K.counting_is_safe(r, PATHS['orders'])
    K.hot_partition(r, PATHS['orders'])
    plans = K.join_three_ways(r, PATHS)
    r.stop()
    gs = S.group_stages(r.events())
    rows = []
    for g, label in (('count-by-store', 'a count by store'), ('window-by-store', 'a window sum by store')):
        rr = stage_rows(gs[g], label)[0]
        rows.append([label, rr[1], rr[2], rr[3], rr[4]])
    table('skew.aggregations', ['query', 'tasks after the shuffle', 'fewest records', 'median', 'most records'], rows)
    rows = []
    for mode, label in (('plain', 'plain sort-merge join'), ('adaptive', 'adaptive skew join'), ('salted', 'join with a salt of 4')):
        rr = [x for x in stage_rows(gs['join-' + mode], label) if x[1] > 1][0]
        rows.append([label, rr[1], rr[2], rr[3], rr[4]])
        counts('skew.rows_' + mode, {'rows': plans[mode][0], 'plan_says_skew': 'skew=true' in plans[mode][1]})
    table('skew.joins', ['join', 'tasks in the join stage', 'fewest records', 'median', 'most records'], rows)
    text('skew.plan_adaptive', J.join_lines(n(plans['adaptive'][1])))
    text('skew.plan_salted', J.join_lines(n(plans['salted'][1])))


def sec_memory():
    ensure_world()
    rows = []
    for mem in ('512m', '1g', '2g'):
        code = ("import sys, json; sys.path.insert(0, %r); import session as S, memory as M; r = S.Run('mf', %r, cores=2, spark__driver__memory=%r); "
                "h, rep = M.jvm_memory(r.spark); print('RESULT' + json.dumps([h, rep])); r.stop()") % (str(HERE), WORK, mem)
        res = run([sys.executable, '-c', code])
        heap, rep = json.loads(re.search(r'RESULT(\[.*\])', res.stdout).group(1))
        rows.append([mem, heap, rep, M.formula(heap), rep == M.formula(heap)])
    table('mem.formula', ['spark.driver.memory', 'JVM heap (bytes)', 'storage memory that Spark reports', '(heap - 300 MiB) x 0.6', 'equal'], rows)
    r = S.Run('memory', WORK)
    sp = r.spark
    pb, pa, info, left = M.cache_demo(sp, PATHS['orders'])
    text('mem.plan_cached', n(pa))
    text('mem.plan_before_action', n(pb))
    counts('mem.cache', {'storage_level': info[0][0], 'cached_partitions': info[0][1], 'memory_bytes': info[0][2], 'disk_bytes': info[0][3], 'entries_after_unpersist': left})
    table('mem.levels', ['storage level', 'bytes in memory', 'bytes on disk'], M.storage_levels(sp, PATHS['orders']))
    r.stop()
    gs = S.group_stages(r.events())
    rows = []
    for g, label in (('first-count', 'the first count (builds the cache)'), ('second-count', 'the second count (reads the cache)')):
        st = gs[g]
        rows.append([label, sum(x['input_bytes']['sum'] for x in st), sum(x['input_records']['sum'] for x in st)])
    table('mem.cache_reads', ['action', 'bytes read as input', 'records read as input'], rows)
    r2 = S.Run('spill', WORK, spark__shuffle__spill__numElementsForceSpillThreshold='20000')
    M.forced_spill(r2, PATHS['orders'])
    r2.stop()
    st = S.group_stages(r2.events())['sort-with-spill']
    counts('mem.spill', {'forced_after_rows': 20000, 'memory_bytes_spilled': sum(x['spilled_memory'] for x in st), 'disk_bytes_spilled': sum(x['spilled_disk'] for x in st), 'rows_sorted': 400000})


def sec_layout():
    ensure_world()
    r = S.Run('layout', WORK)
    sp = r.spark
    out = os.path.join(OUT_DIR, 'layout')
    rows = L.write_variants(sp, PATHS, out)
    table('files.variants', ['how it was written', 'files', 'total KB', 'KB for each file'], rows)
    touched = [('dt = "2026-11-05" (a partition column)', "dt = '2026-11-05'"), ('cast(dt as string) = "2026-11-05"', "cast(dt as string) = '2026-11-05'"), ('store_id = "s01" (not a partition column)', "store_id = 's01'")]
    total_files = len(L.parquet_files(PATHS['orders']))
    table('files.touched', ['filter', 'files opened', 'files in the dataset'], [[lab, L.files_touched(sp, PATHS['orders'], cond), total_files] for lab, cond in touched])
    table('files.codecs', ['compression', 'total KB'], L.codecs(sp, PATHS, os.path.join(OUT_DIR, 'codecs')))
    L.row_group_skipping(r, PATHS, os.path.join(OUT_DIR, 'rg'))
    plain, merged, rows_ = L.schema_evolution(sp, OUT_DIR)
    counts('files.evolution', {'columns_by_default': plain, 'columns_with_mergeSchema': merged, 'rows_with_merge': [[str(c) for c in r_] for r_ in rows_]})
    b = L.bucketing(sp, PATHS)
    counts('files.bucketing', {'shuffles_without_buckets': b['without buckets'], 'shuffles_when_bucketed': b['bucketed on customer_id']})
    text('files.bucketing_plan', n(b['bucketed plan']))
    counts('files.overwrite', L.overwrite_modes(sp, os.path.join(OUT_DIR, 'overwrite')))
    r.stop()
    gs = S.group_stages(r.events())
    rows = []
    for label in ('sorted', 'shuffled'):
        for push in ('true', 'false'):
            st = gs['rg-%s-%s' % (label, push)]
            rows.append([label + ' by order_id', 'on' if push == 'true' else 'off', sum(x['input_bytes']['sum'] for x in st), sum(x['input_records']['sum'] for x in st)])
    table('files.rowgroups', ['the file is', 'filter pushdown', 'bytes read', 'records read'], rows)


def sec_sqlfun():
    ensure_world()
    r = S.Run('sqlfun', WORK)
    sp = r.spark
    sp.read.parquet(PATHS['orders']).createOrReplaceTempView('orders')
    table('sql.ansi', ['expression', 'ANSI mode on (the default)', 'ANSI mode off'], Q.ansi_table(sp))
    text('sql.qualify', Q.qualify(sp))
    w, ties = Q.windows(sp)
    table('sql.windows', ['store', 'day', 'cents', 'running total', 'rank by cents', 'cents the day before'], w)
    table('sql.ties', ['day', 'cents', 'sum with ROWS', 'sum with RANGE'], ties)
    ro, pv = Q.groupings(sp)
    table('sql.rollup', ['country', 'channel', 'n', 'grouping(country)', 'grouping(channel)'], [['NULL' if x is None else x for x in row] for row in ro])
    table('sql.pivot', ['country', 'app', 'pos'], pv)
    cols, ex, outer = Q.arrays(sp)
    table('sql.arrays', ['id', 'xs', 'transform x*10', 'filter x>1', 'aggregate sum', 'sort_array'], cols)
    counts('sql.explode', {'explode': ex, 'explode_outer': [['NULL' if x is None else x for x in row] for row in outer]})
    tz = Q.time_zone_days(sp, PATHS['orders'])
    days = sorted(set(d for d, _ in tz['UTC']) | set(d for d, _ in tz['Asia/Singapore']))
    u, s = dict(tz['UTC']), dict(tz['Asia/Singapore'])
    table('sql.timezone', ['day', 'orders counted in UTC', 'orders counted in Singapore'], [[d, u.get(d, 0), s.get(d, 0)] for d in days])
    r.stop()


def sec_udfs():
    ensure_world()
    r = S.Run('udfs', WORK)
    sp = r.spark
    for k, v in U.plans(sp, PATHS['orders']).items():
        text('udf.plan.' + k, '\n'.join(l for l in n(v).splitlines() if 'Project' in l or 'EvalPython' in l))
    rows, same = U.same_answers(sp, PATHS['orders'])
    counts('udf.same', {'labels': rows, 'all_three_agree': same})
    table('udf.wrong_type', ['status', 'v (declared integer, returned text)'], [[a, 'NULL' if b is None else b] for a, b in U.wrong_return_type(sp)])
    text('udf.null', U.null_handling(sp)[0])
    counts('udf.calls', U.runs_more_than_once(sp, PATHS['orders'], os.path.join(WORK, 'tally1')))
    counts('udf.batches', U.arrow_batches(sp, PATHS['orders'], os.path.join(WORK, 'tally2')))
    r.stop()


def sec_streaming():
    r = S.Run('streaming', WORK, cores=2)
    sp = r.spark
    table('stream.files', ['file', 'arrives as', 'events (store, event time, amount)'], [['events-%d.json' % i, 'file %d' % i, '; '.join('%s %s %d' % e for e in f)] for i, f in enumerate(T.FILES)])
    modes = {}
    for mode in ('update', 'append', 'complete'):
        d, ck = os.path.join(WORK, 'st-in-' + mode), os.path.join(WORK, 'st-ck-' + mode)
        for i in range(len(T.FILES)):
            T.write_file(d, i)
        out, prog, err = T.run(sp, d, ck, mode)
        modes[mode] = out
        table('stream.' + mode, ['batch', 'rows written by this batch (window, store, orders, total)'], [[b['batch'], '; '.join('%s %s %d %d' % x for x in b['rows']) or '(nothing)'] for b in out])
        if mode == 'update':
            table('stream.progress', ['batch', 'rows read', 'watermark used', 'latest event time in the batch', 'rows in state', 'rows dropped as late'],
                  [[p['batch'], p['input_rows'], p['watermark'] or '(none yet)', p['max_event_time'] or '-', p['state_rows'], p['dropped_by_watermark']] for p in prog])
            counts('stream.checkpoint', {'tree': T.checkpoint_tree(ck)})
    # a restart, and a sink that fails after it wrote
    d, ck = os.path.join(WORK, 'st-in-r'), os.path.join(WORK, 'st-ck-r')
    sink = []
    for i in range(3):
        T.write_file(d, i)
    o1, _, _ = T.run(sp, d, ck, 'update', sink=sink)
    for i in (3, 4, 5):
        T.write_file(d, i)
    o2, _, e2 = T.run(sp, d, ck, 'update', fail_batch=4, sink=sink)
    o3, _, e3 = T.run(sp, d, ck, 'update', sink=sink)
    by_batch = {}
    for row in sink:
        by_batch[row[0]] = by_batch.get(row[0], 0) + 1
    counts('stream.restart', {'first_run_batches': [b['batch'] for b in o1], 'second_run_batches_that_finished': [b['batch'] for b in o2], 'second_run_failed': bool(e2), 'restart_batches': [b['batch'] for b in o3],
                              'rows_the_sink_got_for_each_batch': {str(k): v for k, v in sorted(by_batch.items())}, 'batch_written_twice': [k for k, v in by_batch.items() if v > 1 and k == 4]})
    # the same query without a watermark: the state never shrinks, the late row is counted, and append mode is refused
    d, ck = os.path.join(WORK, 'st-in-n'), os.path.join(WORK, 'st-ck-n')
    for i in range(len(T.FILES)):
        T.write_file(d, i)
    out_n, prog_n, _ = T.run(sp, d, ck, 'update', delay=None)
    d_u, ck_u = os.path.join(WORK, 'st-in-w'), os.path.join(WORK, 'st-ck-w')
    for i in range(len(T.FILES)):
        T.write_file(d_u, i)
    _, prog_w, _ = T.run(sp, d_u, ck_u, 'update')
    table('stream.state_growth', ['batch', 'rows in state with a watermark', 'rows in state without one'], [[a['batch'], a['state_rows'], b['state_rows']] for a, b in zip(prog_w, prog_n)])
    late = [b for b in out_n if b['batch'] == 4]
    d_a, ck_a = os.path.join(WORK, 'st-in-a'), os.path.join(WORK, 'st-ck-a')
    for i in range(len(T.FILES)):
        T.write_file(d_a, i)
    counts('stream.no_watermark', {'append_mode_error': clean_err(T.append_without_watermark(sp, d_a, ck_a)),
                                   'batch_4_rows_without_watermark': ['%s %s %d %d' % x for x in late[0]['rows']] if late else [], 'rows_dropped_as_late_without_watermark': sum(p_['dropped_by_watermark'] or 0 for p_ in prog_n)})
    r.stop()


def sec_tables():
    ensure_world()
    r = S.Run('delta', WORK, cores=2, **TB.delta_session_conf())
    sp = r.spark
    table_path = os.path.join(OUT_DIR, 'delta-orders')
    rows = TB.build(sp, PATHS, table_path)
    counts('delta.build', {'rows': rows, 'log_files': TB.log_names(table_path), 'parquet_files': TB.parquet_count(table_path), 'first_commit_actions': TB.log_peek(table_path)})
    counts('delta.merge', TB.merge(sp, table_path))
    table('delta.history', ['version', 'operation'], TB.history(sp, table_path))
    counts('delta.time_travel', TB.time_travel(sp, table_path))
    text('delta.schema_enforcement', re.sub(r'\(Table ID: [0-9a-f-]+\)', '(Table ID: ...)', TB.schema_enforcement(sp, table_path)))
    counts('delta.small_files', {k: (re.sub(r'file:/[^ ]+', 'file:/.../<file>', n(v)) if isinstance(v, str) else v) for k, v in TB.small_files(sp, OUT_DIR).items()})
    counts('delta.log_after', {'log_files': TB.log_names(table_path)})
    r.stop()


def sec_tests():
    base = HERE / 'app'
    res = {}
    for label, target in (('clean', 'transforms'), ('bug', 'transforms_bug')):
        env = dict(os.environ, TRANSFORMS=target, PYTHONDONTWRITEBYTECODE='1')
        r = run([sys.executable, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', '-p', 'no:warnings', '--tb=short', '--show-capture=no', 'test_transforms.py'], cwd=str(base), env=env)
        txt = re.sub(r'\x1b\[[0-9;]*m', '', r.stdout.strip())
        txt = re.sub(r' in [0-9.]+s', '', txt)
        txt = re.sub(r'/[^ ]*/site-packages/', '.../', txt)
        txt = txt.replace(str(base) + '/', '')
        last = txt.splitlines()[-1]
        res[label] = {'passed': int((re.search(r'(\d+) passed', last) or [0, 0])[1]), 'failed': int((re.search(r'(\d+) failed', last) or [0, 0])[1]), 'target': target}
        text('test.pytest_' + label, txt)
    counts('test.summary', res)


def sec_submit():
    sub = os.path.join(os.path.dirname(os.path.abspath(sys.executable)), 'spark-submit')
    if not os.path.exists(sub):
        import pyspark
        sub = os.path.join(os.path.dirname(pyspark.__file__), 'bin', 'spark-submit')
    help_ = run([sub, '--help'])
    body = help_.stdout + help_.stderr
    flags = ['--master', '--deploy-mode', '--name', '--conf', '--properties-file', '--driver-memory', '--driver-cores', '--executor-memory', '--executor-cores', '--num-executors',
             '--total-executor-cores', '--packages', '--jars', '--py-files', '--files', '--archives', '--queue', '--supervise', '--verbose', '--class', '--repositories', '--exclude-packages']
    table('submit.flags', ['flag', 'in spark-submit --help'], [[f, 'yes' if re.search(r'(^|[\s,\[])' + re.escape(f) + r'([=\s,\]]|$)', body, re.M) else 'NO'] for f in flags])
    scope, group = {}, 'every cluster manager'                   # the help groups the flags by where they work
    for line in body.splitlines():
        h = re.match(r'^ ([A-Z][^-]*?):\s*$', line)
        if h and h.group(1).endswith('only'):
            group = h.group(1)
        elif line.startswith('Options:'):
            group = 'every cluster manager'
        m = re.match(r'^\s{1,3}(--[a-z-]+)', line)
        if m and m.group(1) not in scope:
            scope[m.group(1)] = group
    table('submit.flag_scope', ['flag', 'where spark-submit --help lists it'], [[f, scope.get(f, '?')] for f in flags])
    ver = run([sub, '--version'])
    vtext = ver.stdout + ver.stderr
    counts('submit.version', {'spark': re.search(r'version (\d+\.\d+\.\d+)\s*$', vtext, re.M).group(1), 'scala': re.search(r'Using Scala version ([0-9.]+)', vtext).group(1),
                              'java': re.search(r'Using Scala version [0-9.]+, .*, ([0-9][0-9.]*)\s*$', vtext, re.M).group(1)})
    app = str(HERE / 'app' / 'app_conf.py')
    props = os.path.join(WORK, 'defaults.conf')
    with open(props, 'w') as f:
        f.write('spark.sql.shuffle.partitions 100\n')
    cases = [('nothing set', [], {}), ('--conf spark.sql.shuffle.partitions=50', ['--conf', 'spark.sql.shuffle.partitions=50'], {}),
             ('a properties file with 100', ['--properties-file', props], {}), ('the properties file (100) and --conf (50)', ['--properties-file', props, '--conf', 'spark.sql.shuffle.partitions=50'], {}),
             ('--conf (50) and the program sets 20', ['--conf', 'spark.sql.shuffle.partitions=50'], {'SET_IN_CODE': '20'})]
    rows = []
    for label, extra, env in cases:
        r = run([sub, '--master', 'local[2]', '--conf', 'spark.ui.enabled=false'] + extra + [app], env=dict(os.environ, **env))
        m = re.search(r'RESULT(\{.*\})', r.stdout)
        got = json.loads(m.group(1)) if m else {}
        rows.append([label, got.get('shuffle_partitions', '?')])
    table('submit.precedence', ['where the value was set', 'spark.sql.shuffle.partitions that the program saw'], rows)


def sec_errors():
    ensure_world()
    r = S.Run('errors', WORK, spark__driver__maxResultSize='1m')
    sp = r.spark
    rows = [['a column that does not exist', clean_err(ER.unresolved_column(sp, PATHS['orders'])[0])],
            ['collect() of every order with maxResultSize=1m', clean_err(ER.result_too_big(r, PATHS['orders'])[0])],
            ['a Python UDF that divides by zero', clean_err(ER.python_error_in_udf(sp)[0])]]
    mix = ER.type_mismatch_on_read(sp, OUT_DIR)
    rows.append(['two files that disagree on a type', clean_err((mix or ['?'])[0])])
    table('errors.messages', ['what went wrong', 'the first line of the message'], rows)
    cf = ER.corrupt_file(sp, OUT_DIR)
    counts('errors.corrupt', {k: (clean_err(v) if isinstance(v, str) else v) for k, v in cf.items()})
    local_error = ER.flaky_task(r, os.path.join(WORK, 'markers'))
    r.stop()
    r2 = S.Run('errors-retry', WORK, master='local[2,4]')
    cluster_like_error = ER.flaky_task(r2, os.path.join(WORK, 'markers2'))
    r2.stop()
    ev = r2.events()
    stages_ = {x['stage'] for x in S.group_stages(ev).get('flaky', [])}
    ends = [e for e in ev if e['Event'] == 'SparkListenerTaskEnd' and e['Stage ID'] in stages_]
    counts('errors.retry', {'master_local_2_first_attempt_error': local_error, 'master_local_2_4_error': cluster_like_error, 'maxFailures_default_on_a_cluster': 4, 'maxFailures_default_in_local_mode': 1,
                            'task_attempts_with_local_2_4': [{'attempt': e['Task Info']['Attempt'], 'failed': e['Task Info']['Failed'], 'reason': e['Task End Reason']['Reason']} for e in ends]})


def sec_eventlog():
    """What the Spark UI is drawn from: the event log of one small query. Times and byte counts differ a little on every run, so those fields are shown as "varies"."""
    from pyspark.sql import functions as F
    from collections import Counter
    ensure_world()
    r = S.Run('eventlog', WORK, cores=2)
    sp = r.spark
    q = sp.read.parquet(PATHS['orders']).where(F.col('status') == 'PAID').groupBy('store_id').agg(F.sum('total_cents').alias('revenue'))
    q.collect()
    r.stop()
    ev = r.events()
    names = Counter(e['Event'].split('.')[-1] for e in ev)
    what = [('SparkListenerApplicationStart', 'the application began'), ('SparkListenerEnvironmentUpdate', 'every setting the application ran with'),
            ('SparkListenerSQLExecutionStart', 'a SQL or DataFrame query began, with its plan'), ('SparkListenerJobStart', 'an action started a job, and which stages it has'),
            ('SparkListenerStageSubmitted', 'a stage was sent to the scheduler'), ('SparkListenerTaskStart', 'a task began on an executor'),
            ('SparkListenerTaskEnd', 'a task finished, with its metrics'), ('SparkListenerStageCompleted', 'a stage finished, with its totals'),
            ('SparkListenerJobEnd', 'a job finished'), ('SparkListenerSQLExecutionEnd', 'the query finished'), ('SparkListenerApplicationEnd', 'the application ended')]
    table('eventlog.types', ['event', 'lines in the log', 'what it tells you'], [[k, names[k], w] for k, w in what if names.get(k)])
    # the task with the lowest index of the earliest stage, and not the first to end: two map tasks run at the same time, which one ends first is a race,
    # and the two read different numbers of records (found when a repeat recording differed from the first one)
    first = min((e for e in ev if e['Event'] == 'SparkListenerTaskEnd' and e['Task Type'] == 'ShuffleMapTask'), key=lambda e: (e['Stage ID'], e['Task Info']['Index']))

    def mask(d):
        out = {}
        for k, v in d.items():
            if isinstance(v, dict):
                out[k] = mask(v)
            elif any(w in k for w in ('Time', 'Bytes', 'Size')) and v != 0:      # a zero (nothing spilled) is the same on every run
                out[k] = 'varies'
            else:
                out[k] = v
        return out
    m = first['Task Metrics']
    keep = {'Event': 'SparkListenerTaskEnd', 'Task Type': first['Task Type'], 'Task End Reason': first['Task End Reason'],
            'Task Info': {k: first['Task Info'][k] for k in ('Index', 'Attempt', 'Executor ID', 'Locality', 'Failed')},
            'Task Metrics': mask({k: m[k] for k in ('Executor Run Time', 'JVM GC Time', 'Result Size', 'Memory Bytes Spilled', 'Disk Bytes Spilled')})}
    keep['Task Metrics']['Input Metrics'] = mask(m['Input Metrics'])
    keep['Task Metrics']['Shuffle Write Metrics'] = mask(m['Shuffle Write Metrics'])
    text('eventlog.task_end', json.dumps(keep, indent=1))
    files = sorted(os.path.relpath(f, r.logdir) for f in glob.glob(os.path.join(r.logdir, '**', '*'), recursive=True) if os.path.isfile(f))
    counts('eventlog.layout', {'files': [re.sub(r'application_\d+_\d+|local-\d+', 'APP', f) for f in files], 'spark_conf_to_turn_it_on': ['spark.eventLog.enabled=true', 'spark.eventLog.dir=<a folder>']})


SECTIONS = [('world', sec_world), ('conf', sec_conf), ('plans', sec_plans), ('partitions', sec_partitions), ('joins', sec_joins), ('skew', sec_skew), ('memory', sec_memory), ('layout', sec_layout),
            ('sqlfun', sec_sqlfun), ('udfs', sec_udfs), ('streaming', sec_streaming), ('tables', sec_tables), ('tests', sec_tests), ('submit', sec_submit), ('errors', sec_errors), ('eventlog', sec_eventlog)]

CODE_FILES = ['session.py', 'plans.py', 'partitions.py', 'joins.py', 'skew.py', 'memory.py', 'layout.py', 'sqlfun.py', 'udfs.py', 'streaming.py', 'tables.py', 'errors.py',
              'app/transforms.py', 'app/transforms_bug.py', 'app/test_transforms.py', 'app/app_conf.py']


def finish():
    for f in CODE_FILES:
        OUT['files']['code/' + f] = (HERE / f).read_text().rstrip('\n')
    out = pathlib.Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    body = json.dumps(OUT, indent=1, sort_keys=True, ensure_ascii=False)
    out.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + body + ';\n')
    if args.json:
        pathlib.Path(args.json).write_text(body)
    print('wrote', out, len(body), 'bytes:', {k: len(v) for k, v in OUT.items()})


if __name__ == '__main__':
    fns = dict(SECTIONS, worldfiles=sec_worldfiles)
    if IS_CHILD:
        fns[args.child]()
        pathlib.Path(args.json).write_text(json.dumps({k: v for k, v in OUT.items() if k != 'meta'}))
    else:
        for name, _ in SECTIONS:
            if name not in ONLY:
                continue
            t0 = time.time()
            part = os.path.join(WORK, 'part-%s.json' % name)
            r = run([sys.executable, str(pathlib.Path(__file__).resolve()), '--child', name, '--json', part])
            if r.returncode or not os.path.exists(part):
                print(r.stdout[-1500:], r.stderr[-2500:])
                raise SystemExit('section %s failed' % name)
            for k, v in json.loads(pathlib.Path(part).read_text()).items():
                OUT[k].update(v)
            print('  %-10s %.1fs' % (name, time.time() - t0), flush=True)
        finish()
