"""Mission 3: time, watermarks and windows.

A small file of fourteen orders, in the order in which they arrive, with the time at which each one happened. Some arrive late. The same file goes through tumbling, hopping, cumulating and
session windows, with a watermark that waits for zero, ten, thirty, seventy-five and two hundred seconds, and the windows that Flink really printed are what the lessons show.
"""
import json
import time

import kx

import fcluster as F
import fx

# (order_id, store, total_cents, seconds after 2026-01-01 00:00:00 UTC at which the order happened). The list is the ARRIVAL order.
EVENTS = [(1, 's01', 400, 5), (2, 's01', 350, 20), (3, 's02', 500, 40),
          (4, 's01', 420, 65), (5, 's02', 380, 50),
          (6, 's01', 610, 70), (7, 's02', 450, 125), (8, 's01', 300, 55),
          (9, 's02', 520, 130), (10, 's01', 700, 190), (11, 's02', 330, 118),
          (12, 's01', 410, 200), (13, 's02', 480, 250), (14, 's01', 360, 61)]
DELAYS = [0, 10, 30, 75, 200]

DDL = """CREATE TEMPORARY TABLE events (order_id INT, store_id STRING, total_cents INT, ts TIMESTAMP(3), WATERMARK FOR ts AS ts - INTERVAL '%(delay)d' SECOND(3))
WITH ('connector' = 'filesystem', 'path' = 'file://%(path)s', 'format' = 'json', 'json.timestamp-format.standard' = 'SQL')"""
SETUP = """SET 'parallelism.default' = '1';
SET 'sql-client.execution.result-mode' = 'tableau';
SET 'execution.runtime-mode' = 'streaming';
"""
TUMBLE = """SELECT window_start, window_end, COUNT(*) AS orders, SUM(total_cents) AS cents
FROM TABLE(TUMBLE(TABLE events, DESCRIPTOR(ts), INTERVAL '1' MINUTE))
GROUP BY window_start, window_end"""


def clock(sec):
    return '2026-01-01 %02d:%02d:%02d.000' % (sec // 3600, sec // 60 % 60, sec % 60)


def secs(text):
    """Seconds after 2026-01-01 00:00:00 of a time printed by the SQL client (negative before it)."""
    import datetime
    d = datetime.datetime.strptime(text.split('.')[0], '%Y-%m-%d %H:%M:%S')
    return int((d - datetime.datetime(2026, 1, 1)).total_seconds())


def model_tumble(delay, size=60):
    """What the rules say: a record is late when its window has already been fired, which is when the watermark (the largest time seen so far, minus the delay) has passed the window's end."""
    wm = None
    counts, cents, late = {}, {}, []
    for oid, store, c, t in EVENTS:
        start = t - t % size
        if wm is not None and wm >= start + size - 0.001:
            late.append(oid)
        else:
            counts[start] = counts.get(start, 0) + 1
            cents[start] = cents.get(start, 0) + c
        wm = t - delay if wm is None else max(wm, t - delay)
    return counts, cents, late


def run(f, path, delay, query, name):
    script = SETUP + (DDL % {'path': path, 'delay': delay}) + ';\n' + query + ';'
    rc, out, err = f.sql(script, name=name)
    if rc:
        raise RuntimeError(F.strip_ansi(out)[-3000:] + err[-1500:])
    ts = fx.tables(out)
    if not ts:
        raise RuntimeError('no result table in the output of %s:\n%s' % (name, F.strip_ansi(out)[-3500:]))
    return ts[-1]


def record_time(f, kc, rec):
    f.cancel_all()
    f.wait_idle()
    rows = [{'order_id': o, 'store_id': s, 'total_cents': c, 'ts': clock(t)} for o, s, c, t in EVENTS]
    path = fx.write_jsonl(f.work / 'data' / 'events14.jsonl', rows)
    rec.text('time.events_file', path.read_text().rstrip('\n'))
    rec.table('time.events', ['arrives', 'order_id', 'store_id', 'total_cents', 'happened at', 'seconds late (behind the largest time seen so far)'],
              [[i + 1, o, s, c, clock(t)[11:19], max(0, max(x[3] for x in EVENTS[:i + 1]) - t)] for i, (o, s, c, t) in enumerate(EVENTS)])

    # ---- tumbling windows, with five different delays ----
    summary = []
    for d in DELAYS:
        t = run(f, path, d, TUMBLE, 'time_tumble_%d' % d)
        got = {secs(r[1]): (int(r[3]), int(r[4])) for r in t['rows']}
        counts, cents, late = model_tumble(d)
        assert {k: v[0] for k, v in got.items()} == counts and {k: v[1] for k, v in got.items()} == cents, (d, got, counts)
        total = sum(v[0] for v in got.values())
        rec.table('time.tumble_%d' % d, ['op', 'window_start', 'window_end', 'orders', 'cents'], t['rows'])
        summary.append([d, ', '.join('%d' % got[k][0] for k in sorted(got)), total, len(EVENTS) - total, ', '.join(str(x) for x in late)])
    rec.table('time.delay_summary', ['watermark waits (seconds)', 'orders in windows 1 to 5', 'counted', 'dropped as late', 'order_id dropped'], summary)
    rec.counts('time.delay_facts', {'events': len(EVENTS), 'delays': DELAYS, 'window_seconds': 60, 'model_equals_flink': True,
                                    'dropped': {str(r[0]): r[3] for r in summary}, 'windows_in_file': 5})

    # ---- the other kinds of window, on the same events with a watermark that waits long enough for nothing to be late ----
    hop = run(f, path, 200, """SELECT window_start, window_end, COUNT(*) AS orders FROM TABLE(HOP(TABLE events, DESCRIPTOR(ts), INTERVAL '30' SECOND, INTERVAL '1' MINUTE))
GROUP BY window_start, window_end""", 'time_hop')
    rec.table('time.hop', ['op', 'window_start', 'window_end', 'orders'], sorted(hop['rows'], key=lambda r: r[1]))
    cum = run(f, path, 200, """SELECT window_start, window_end, COUNT(*) AS orders FROM TABLE(CUMULATE(TABLE events, DESCRIPTOR(ts), INTERVAL '20' SECOND, INTERVAL '1' MINUTE))
GROUP BY window_start, window_end""", 'time_cumulate')
    rec.table('time.cumulate', ['op', 'window_start', 'window_end', 'orders'], sorted(cum['rows'], key=lambda r: (r[1], r[2])))
    try:
        ses = run(f, path, 200, """SELECT store_id, window_start, window_end, COUNT(*) AS orders
FROM TABLE(SESSION(TABLE events PARTITION BY store_id, DESCRIPTOR(ts), INTERVAL '30' SECOND))
GROUP BY store_id, window_start, window_end""", 'time_session')
        rec.table('time.session', ['op', 'store_id', 'window_start', 'window_end', 'orders'], sorted(ses['rows'], key=lambda r: (r[1], r[2])))
        rec.counts('time.session_supported', {'supported': True})
    except RuntimeError as e:
        rec.counts('time.session_supported', {'supported': False, 'error': fx.norm(str(e))[-600:]})
    # the model of the other windows, checked against what Flink printed
    ts_all = [t for _, _, _, t in EVENTS]
    hop_model = {}
    for t in ts_all:
        k = t - t % 30
        for start in (k, k - 30):
            if start <= t < start + 60:
                hop_model[start] = hop_model.get(start, 0) + 1
    assert {secs(r[1]): int(r[3]) for r in hop['rows']} == hop_model, (hop['rows'], hop_model)
    cum_model = {}
    for t in ts_all:
        w = t - t % 60
        for end in range(w + 20, w + 61, 20):
            if t < end:
                cum_model[(w, end)] = cum_model.get((w, end), 0) + 1
    assert {(secs(r[1]), secs(r[2])): int(r[3]) for r in cum['rows']} == cum_model, (cum['rows'], cum_model)
    rec.counts('time.window_models', {'hop_equals_model': True, 'cumulate_equals_model': True, 'hop_windows': len(hop['rows']), 'cumulate_windows': len(cum['rows'])})

    record_idle(f, kc, rec)


def record_idle(f, kc, rec):
    """A topic with two partitions where one partition has no records: the windows do not close, until the source is told that an empty partition is idle."""
    boot = kc.bootstrap
    fx.fresh_topic(kx, boot, 'events_idle', partitions=2, config={'retention.ms': '-1'})
    p = kx.producer(boot, **{'linger.ms': 5})
    for o, st, c, t in EVENTS:
        p.produce('events_idle', value=json.dumps({'order_id': o, 'store_id': st, 'total_cents': c, 'ts': clock(t)}, separators=(',', ':')), partition=0)
    p.flush(30)
    rec.counts('time.idle_topic', {'partitions': 2, 'records': len(EVENTS), 'records_in_partition_0': len(EVENTS), 'records_in_partition_1': 0})
    ddl = ("CREATE TEMPORARY TABLE events (order_id INT, store_id STRING, total_cents INT, ts TIMESTAMP(3), WATERMARK FOR ts AS ts - INTERVAL '10' SECOND(3)) WITH ('connector' = 'kafka', "
           "'topic' = 'events_idle', 'properties.bootstrap.servers' = '%s', 'properties.group.id' = 'idle', 'scan.startup.mode' = 'earliest-offset', 'format' = 'json', "
           "'json.timestamp-format.standard' = 'SQL');\n" % boot)
    sink = "CREATE TEMPORARY TABLE shown (window_start TIMESTAMP(3), window_end TIMESTAMP(3), orders BIGINT) WITH ('connector' = 'print');\n"
    q = ("INSERT INTO shown SELECT window_start, window_end, COUNT(*) FROM TABLE(TUMBLE(TABLE events, DESCRIPTOR(ts), INTERVAL '1' MINUTE)) GROUP BY window_start, window_end;")
    res = {}
    for label, extra in (('without', ''), ('with', "SET 'table.exec.source.idle-timeout' = '3 s';\n")):
        mark = f.out_mark()
        jid, out = fx.submit(f, "SET 'parallelism.default' = '1';\n" + extra + ddl + sink + q, name='time_idle_' + label)
        f.wait_state(jid, 'RUNNING')
        time.sleep(18)
        printed = f.out_since(mark).strip()
        res[label] = printed
        f.cancel(jid)
        f.wait_idle()
    rec.text('time.idle_without', res['without'] or '(nothing was printed)')
    rec.text('time.idle_with', res['with'])
    rec.counts('time.idle_summary', {'windows_without_idle_timeout': len(res['without'].splitlines()), 'windows_with_idle_timeout': len(res['with'].splitlines()),
                                     'setting': "table.exec.source.idle-timeout = 3 s", 'seconds_waited': 18})
