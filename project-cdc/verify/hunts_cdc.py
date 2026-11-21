#!/usr/bin/env python3
"""Runs one bug hunt of the CDC walkthrough on a copy of the real project, and prints the result as JSON.

Called by verify_cdc.py with the interpreter that has Spark and Delta:   python hunts_cdc.py <hunt> <project copy> <pipeline folder> [file]
The snippet of the lesson has already replaced its lines in the file of the copy. No service is needed: the events are written here, and the merge of silver is the real one.
  order   an order is created (position 100), shipped (200), and then the creation message is delivered again: what is its status?
  dedupe  an order changes twice in one batch: does the merge run, and what does it say when it does not?
  delete  an order is created, updated and deleted (positions 100, 200, 300), and then the update is delivered again: is the order back?
  replay  three micro-batches, and then the commit of the last one is removed and the job runs again: does it run, and what does the merge do?
  solve   the solution of the coding round (a file given as the fourth argument), on the log of the recorded day: the current orders, and are they right?
"""
import contextlib
import io
import json
import os
import re
import sys
import tempfile

hunt, home, data = sys.argv[1:4]
sys.path.insert(0, home)
os.environ['CDC_HOME'] = data
from pyspark.sql import Window                     # noqa: E402
from pyspark.sql import functions as F             # noqa: E402

from cdc import config, silver, stream             # noqa: E402
from cdc.spark import session                      # noqa: E402

spark = session('hunt', packages=False)


def event(op, order_id, lsn, **row):
    fields = {'id': order_id, 'store_id': 3, 'status': 'PLACED', 'amount_cents': 1200, 'updated_at': '2026-03-01T10:00:00.000000Z'}
    fields.update(row)
    envelope = {'before': {'id': order_id} if op == 'd' else None, 'after': None if op == 'd' else fields, 'source': {'lsn': lsn, 'snapshot': 'false'}, 'op': op}
    return json.dumps(envelope)


def batch(events, first_offset=0):
    return spark.createDataFrame([(first_offset + i, text) for i, text in enumerate(events)], 'offset long, value string')


def rows():
    return {r['id']: r.asDict() for r in spark.read.format('delta').load(config.SILVER).collect()}


out = {}
if hunt == 'order':
    silver.apply_batch(spark, batch([event('c', 1, 100)]))
    silver.apply_batch(spark, batch([event('u', 1, 200, status='SHIPPED')], 10))
    silver.apply_batch(spark, batch([event('c', 1, 100)], 20))
    out = {'status': rows()[1]['status'], 'lsn': rows()[1]['lsn']}
elif hunt == 'dedupe':
    silver.apply_batch(spark, batch([event('c', 1, 100)]))
    try:
        silver.apply_batch(spark, batch([event('u', 1, 200, status='SHIPPED'), event('u', 1, 300, status='REFUNDED')], 10))
        out = {'error': None, 'status': rows()[1]['status']}
    except Exception as e:                                                       # noqa: BLE001
        m = re.search(r'\[(DELTA_[A-Z_]+)\]', str(e))
        out = {'error': m.group(1) if m else type(e).__name__, 'status': rows()[1]['status']}
elif hunt == 'delete':
    silver.apply_batch(spark, batch([event('c', 1, 100)]))
    silver.apply_batch(spark, batch([event('u', 1, 200, status='SHIPPED')], 10))
    silver.apply_batch(spark, batch([event('d', 1, 300)], 20))
    silver.apply_batch(spark, batch([event('u', 1, 200, status='SHIPPED')], 30))
    r = rows()
    out = {'rows': len(r), 'live': sum(1 for x in r.values() if not x['is_deleted']), 'lsn': max(x['lsn'] for x in r.values())}
elif hunt == 'replay':
    def append(values, start):
        df = spark.createDataFrame([('t', 0, start + i, None, v) for i, v in enumerate(values)], 'topic string, partition int, offset long, kafka_time timestamp, value string')
        df.write.format('delta').mode('append').save(config.BRONZE)
    append([event('r', i, 100) for i in range(1, 6)], 0)
    stream.process(spark)
    append([event('u', 1, 200, status='SHIPPED'), event('d', 2, 210)], 5)
    stream.process(spark)
    append([event('c', 6, 220)], 7)
    stream.process(spark)
    try:
        done = stream.process(spark, replay_last=True)
        d = done[0]
        out = {'error': None, 'events': d['events'], 'inserted': d['inserted'], 'updated': d['updated'], 'left': d['distinct'] - d['inserted'] - d['updated']}
    except Exception as e:                                                       # noqa: BLE001
        text = str(e)
        out = {'error': type(e).__name__, 'two_queries': 'Multiple streaming queries are concurrently using' in text and 'commits' in text}
elif hunt == 'solve':
    code = open(sys.argv[4]).read()
    log, lsn, state = [], 1000, {}
    amount = lambda i: 1000 + (i * 37) % 9000                                    # noqa: E731
    for i in range(1, 201):                                                      # the snapshot: every row has the position of the snapshot
        log.append((i, 'r', lsn, 'PLACED', amount(i)))
    steps = [('c', i, 'PLACED') for i in range(201, 251)] + [('u', i, 'SHIPPED') for i in range(1, 31)] + [('d', i, None) for i in range(31, 36)] + [('u', 40, 'SHIPPED'), ('u', 40, 'REFUNDED')]
    for op, i, status in steps:
        lsn += 8
        log.append((i, op, lsn, status, None if op == 'd' else amount(i)))
    for i, op, p, status, amt in sorted(log, key=lambda e: e[2]):                # the truth: replay the log in the order of its positions
        if op == 'd':
            state.pop(i, None)
        else:
            state[i] = status
    events = spark.createDataFrame(log, 'id long, op string, lsn long, status string, amount_cents long')
    g = {'events': events, 'Window': Window, 'F': F}
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        exec(code, g)
    current = g['current']
    got = {r['id']: r['status'] for r in current.select('id', 'status').collect()}
    revenue = current.agg(F.sum('amount_cents')).collect()[0][0]
    out = {'printed': buf.getvalue().strip(), 'events': len(log), 'rows': current.count(), 'revenue': revenue, 'right': got == state}
print(json.dumps(out))
