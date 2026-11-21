#!/usr/bin/env python3
"""Runs one bug hunt of the lakehouse walkthrough on a copy of the real project, and prints the result as JSON.

Called by verify_lakehouse.py with the interpreter that has Spark and Delta:   python hunts_lake.py <hunt> <project copy> <lakehouse folder>
The snippet of the lesson has already replaced its block in the file of the copy. Each hunt runs a small scenario with the project's own functions.
  dedupe  day 1 in full: the gate must find one silver row for each order
  merge   an order is placed, shipped, and then an old event of it arrives late: what is its status?
  gold    day 1 in full, and then a file with only the refund of order 41, which was placed on day 1: does gold still agree with silver?
  solve   the solution of the coding round (a file given as the fourth argument), run on days 1 and 2: one event for each order, the latest?
  reason  the validation rules on the six kinds of record of the rules test: which reason does each get?
"""
import json
import os
import sys

hunt, home, data = sys.argv[1:4]
sys.path.insert(0, home)
os.environ['LAKEHOUSE_HOME'] = data
from lakehouse import bronze, config, gold, landing, quality, run, silver     # noqa: E402
from lakehouse.spark import session                                          # noqa: E402

spark = session('hunt')


def drop(day, name, events):
    folder = os.path.join(config.LANDING, 'date=' + landing.when(day, 0)[:10])
    os.makedirs(folder, exist_ok=True)
    with open(os.path.join(folder, name), 'w') as f:
        f.write('\n'.join(landing.lines(events)) + '\n')


def step(run_id):
    files, n = bronze.ingest(spark, run_id)
    stats = silver.process(spark, run_id)
    gold.refresh(spark, stats['batch_dates'])
    return stats, quality.gate(spark, run_id, stats)


out = {}
if hunt == 'dedupe':
    lines, ok = run.run(1)
    out = {'ok': ok, 'gate': [l for l in lines if l.startswith(('PASS', 'FAIL'))]}
elif hunt == 'merge':
    drop(1, 'a.json', [landing.event(i, 1) for i in range(1, 6)])
    step('r1')
    drop(2, 'b.json', [landing.event(5, 2, status='SHIPPED', minute=600)])
    step('r2')
    drop(3, 'c.json', [landing.event(5, 1, minute=3)])                       # an old event, delivered late
    step('r3')
    out = {'status': spark.read.format('delta').load(config.SILVER).where('order_id = 5').collect()[0]['status']}
elif hunt == 'gold':
    lines, ok = run.run(1)
    drop(2, 'only-a-refund.json', [landing.event(41, 2, status='REFUNDED', minute=700)])        # order 41 was placed on day 1 and is refunded on day 2
    stats, checks = step('r2')
    out = {'checks': [[name, passed, got, want] for name, passed, got, want in checks], 'dates': stats['batch_dates']}
elif hunt == 'solve':
    import contextlib
    import io
    import tempfile
    from pyspark.sql import Window
    from pyspark.sql import functions as F
    code = open(sys.argv[4]).read()

    def solve(days):
        config.set_home(tempfile.mkdtemp(prefix='lh-solve-'))
        for d in days:
            landing.write_day(d, config.LANDING)
        bronze.ingest(spark, 'r1')
        parsed = silver.parse(spark, 'r1')
        good = parsed.where(F.col('reason').isNull()).select('o.*', F.col('file'), F.col('line_no')).drop('_corrupt')
        good = good.withColumn('event_time', F.to_timestamp('event_time')).withColumn('order_date', F.to_date('event_time'))
        g = {'good': good, 'Window': Window, 'F': F}
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            exec(code, g)
        batch = g['batch']
        best = {}
        for r in good.select('order_id', 'event_time', 'file', 'line_no', 'status').collect():
            k = (r['event_time'], r['file'], r['line_no'])
            if r['order_id'] not in best or k > best[r['order_id']][0]:
                best[r['order_id']] = (k, r['status'])
        got = {r['order_id']: r['status'] for r in batch.select('order_id', 'status').collect()}
        return {'printed': buf.getvalue().strip(), 'valid': good.count(), 'rows': batch.count(), 'right': got == {k: v[1] for k, v in best.items()}}
    out = {'day1': solve([1]), 'days12': solve([1, 2])}
elif hunt == 'reason':
    from pyspark.sql import functions as F
    from lakehouse import rules
    texts = ['{"order_id": 1, "store_id": 3, "status": "PLACED", "amount_cents": 1200, "event_time": "2026-03-01T10:00:00Z"}',
             '{"order_id": 1, "store_id": 3, "status": "PLACED", "amount_cents": -5, "event_time": "2026-03-01T10:00:00Z"}',
             '{"order_id": 1, "store_id": 3, "status": "LOST", "amount_cents": 100, "event_time": "2026-03-01T10:00:00Z"}',
             '{"order_id": 1, "store_id": 99, "status": "PLACED", "amount_cents": 100, "event_time": "2026-03-01T10:00:00Z"}',
             '{"order_id": 1, "store_id": 3, "status": "PLACED", "amount_cents": "12.50", "event_time": "2026-03-01T10:00:00Z"}',
             '{"order_id": 4, "store_id": 3, "status": "PLAC']
    df = spark.createDataFrame([(x,) for x in texts], 'raw string').withColumn('o', rules.parse_json(F.col('raw')))
    out = {'reasons': [r['reason'] for r in df.withColumn('reason', rules.reason(F.col('o'))).collect()]}
print(json.dumps(out))
