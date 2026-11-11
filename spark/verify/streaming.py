"""Mission 10: Structured Streaming with a file source, so that every batch is known in advance and the run is the same every time.

Five small JSON files arrive one at a time. Each micro-batch reads one file (maxFilesPerTrigger=1), and trigger(availableNow=True) ends the query when the files are used up.
The progress objects are the real ones that Spark reports for each batch.
"""
import json
import os

from pyspark.sql import functions as F

# (store, event time, amount). The file number is the order of arrival. File 4 holds one event that is far older than the others: it arrives after the
# watermark has passed the end of its window.
FILES = [
    [('s01', '10:01', 5), ('s01', '10:04', 3), ('s02', '10:06', 2)],
    [('s01', '10:12', 4), ('s02', '10:15', 6)],
    [('s01', '10:25', 7)],
    [('s02', '10:27', 1)],
    [('s01', '10:07', 9)],
    [('s01', '10:41', 2)],
]
SCHEMA = 'store_id string, event_time timestamp, amount int'


def write_file(in_dir, n):
    os.makedirs(in_dir, exist_ok=True)
    path = os.path.join(in_dir, 'events-%d.json' % n)
    with open(path, 'w') as f:
        for store, t, amount in FILES[n]:
            f.write(json.dumps({'store_id': store, 'event_time': '2026-11-01 %s:00' % t, 'amount': amount}) + '\n')
    stamp = 1_793_491_200 + n * 60                       # the file source reads the oldest file first, so each file gets a modification time of its own
    os.utime(path, (stamp, stamp))


def windowed(spark, in_dir, delay='10 minutes'):
    """Orders per store in 10-minute windows of event time, with a watermark that lets a window close."""
    events = spark.readStream.schema(SCHEMA).option('maxFilesPerTrigger', 1).json(in_dir)
    if delay is not None:                               # delay=None leaves the watermark out, to show what it is for
        events = events.withWatermark('event_time', delay)
    return events.groupBy(F.window('event_time', '10 minutes').alias('w'), 'store_id').agg(F.count('*').alias('n'), F.sum('amount').alias('total'))


def rows_of(df):
    return sorted([(r['w']['start'].strftime('%H:%M'), r['store_id'], r['n'], r['total']) for r in df.collect()])


def run(spark, in_dir, ck_dir, mode='update', delay='10 minutes', fail_batch=None, sink=None):
    """Run the windowed query until the files are used up. Returns what each batch wrote, and the progress reports. sink is a list that foreachBatch appends to."""
    out = []
    state = {'failed': False}

    def on_batch(df, batch_id):
        rows = rows_of(df)
        if sink is not None:
            for r in rows:
                sink.append((batch_id,) + r)
        if fail_batch is not None and batch_id == fail_batch and not state['failed']:
            state['failed'] = True
            raise RuntimeError('the sink fails in batch %d after it wrote' % batch_id)
        out.append({'batch': batch_id, 'rows': rows})

    q = (windowed(spark, in_dir, delay).writeStream.outputMode(mode).foreachBatch(on_batch).option('checkpointLocation', ck_dir).trigger(availableNow=True).start())
    try:
        q.awaitTermination()
        error = None
    except Exception as e:  # noqa: BLE001
        error = str(e).strip().split('\n')[0][:160]
    prog = []
    for p in q.recentProgress:
        so = (p.get('stateOperators') or [{}])[0]
        et = p.get('eventTime', {})
        wm = et.get('watermark', '')
        prog.append({'batch': p['batchId'], 'input_rows': p['numInputRows'], 'watermark': '' if wm.startswith('1970') else wm[11:16], 'max_event_time': et.get('max', '')[11:16],
                     'state_rows': so.get('numRowsTotal'), 'dropped_by_watermark': so.get('numRowsDroppedByWatermark')})
    return out, prog, error


def checkpoint_tree(ck_dir):
    """The folders and the file names of the checkpoint, without the long ids."""
    tree = {}
    for name in sorted(os.listdir(ck_dir)):
        p = os.path.join(ck_dir, name)
        if os.path.isdir(p):
            files = sorted(os.listdir(p))
            tree[name] = [f for f in files if not f.startswith('.')][:8]
        else:
            tree[name] = None
    return tree


def append_without_watermark(spark, in_dir, ck_dir):
    """Append mode asks Spark to write a window once, when it is final. Without a watermark Spark cannot know when that is, and it refuses to start."""
    df = windowed(spark, in_dir, delay=None)
    try:
        df.writeStream.outputMode('append').format('noop').option('checkpointLocation', ck_dir).trigger(availableNow=True).start()
        return 'accepted'
    except Exception as e:  # noqa: BLE001
        return str(e).strip().split('\n')[0]
