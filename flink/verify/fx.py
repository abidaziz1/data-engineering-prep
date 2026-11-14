"""Helpers that the Flink experiments share: made-up Brewline events written to files and to Kafka, a reader for the tables that the SQL client prints, and the clean-up of recorded text.

Nothing here hides what Flink does. The experiments run the SQL client, the `flink` tool and the REST interface of the distribution, and the Kafka tools of the Kafka course.
"""
import json
import os
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / 'kafka' / 'verify'))      # the Kafka course's cluster.py and kx.py: the same Brewline events and the same real Kafka
import fcluster as F          # noqa: E402

T0 = 1767225600000            # 2026-01-01 00:00:00 UTC in milliseconds, the time of the first made-up event (the same as the Kafka course)
STORES = ['s01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10', 's11', 's12']
SHARE = [338, 80, 80, 81, 81, 70, 61, 60, 50, 40, 30, 29]


def store_of(i):
    """The store of order number i (0, 1, 2, ...). The same fixed rule as the Kafka course: store s01 sells about a third of the orders."""
    r = (i * 389) % 1000
    acc = 0
    for s, w in zip(STORES, SHARE):
        acc += w
        if r < acc:
            return s
    return STORES[-1]


def order(i):
    return {'order_id': i + 1, 'store_id': store_of(i), 'customer_id': None if i % 4 == 3 else 1000 + (i * 7) % 5250, 'total_cents': 300 + (i * 37) % 500,
            'status': 'paid' if i % 5 else 'refunded', 'channel': ('app', 'counter', 'web')[i % 3]}


def iso(ms):
    """2026-01-01 00:00:05.000 style text of a time in milliseconds (UTC), the form that Flink SQL reads for TIMESTAMP(3)."""
    import datetime
    d = datetime.datetime.fromtimestamp(ms / 1000, datetime.timezone.utc)
    return d.strftime('%Y-%m-%d %H:%M:%S.') + '%03d' % (ms % 1000)


def write_jsonl(path, rows):
    path = pathlib.Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(''.join(json.dumps(r, separators=(',', ':')) + '\n' for r in rows))
    return path


# ---- reading what the SQL client prints ---------------------------------------------------------------------------------------------------------------
def tables(out):
    """The result tables in the output of the SQL client, in order: each is {'cols': [...], 'rows': [[...]], 'footer': 'Received a total of 9 rows (2.28 seconds)'}.
    The client draws a table with + and - lines and | between the cells. Values are returned as text."""
    out = F.strip_ansi(out)
    res, cur = [], None
    for line in out.splitlines():
        if not line.startswith('|') and re.search(r'\+-[-+]*\+$', line):            # the first line of a table is glued to the end of the echoed statement
            line = re.search(r'(\+-[-+]*\+)$', line).group(1)
        if re.match(r'^\+[-+]+\+$', line):
            if cur is not None and cur['state'] == 'rows':
                cur['state'] = 'done'
            elif cur is None or cur['state'] == 'done':
                cur = {'cols': None, 'rows': [], 'state': 'head'}
                res.append(cur)
            elif cur['state'] == 'head' and cur['cols'] is not None:
                cur['state'] = 'rows'
            continue
        if cur is not None and cur['state'] in ('head', 'rows') and line.startswith('|'):
            cells = [c.strip() for c in line.strip().strip('|').split('|')]
            if cur['state'] == 'head':
                cur['cols'] = cells
            else:
                cur['rows'].append(cells)
            continue
        m = re.match(r'^(Received a total of \d+ rows?|\d+ rows? in set)', line)
        if m and res:
            res[-1]['footer'] = re.sub(r' \(\d+\.\d+ seconds\)', '', line.strip())
    for t in res:
        t.pop('state', None)
        t.setdefault('footer', '')
    return res


def statements(out):
    """What the SQL client printed, split by statement: a list of (statement text, the output that follows it). Statements are printed after the 'Flink SQL>' prompt."""
    out = F.strip_ansi(out)
    parts = out.split('Flink SQL> ')
    return [(p.split('\n', 1)[0], p.split('\n', 1)[1] if '\n' in p else '') for p in parts[1:]]


def fmt_table(t, widths=None):
    """The table the way the SQL client draws it, from cols and rows (for recorded text that must match the client exactly)."""
    cols = t['cols']
    w = [max(len(str(c)), *(len(str(r[i])) for r in t['rows'])) if t['rows'] else len(str(c)) for i, c in enumerate(cols)]
    sep = '+' + '+'.join('-' * (x + 2) for x in w) + '+'
    line = lambda cells: '| ' + ' | '.join(str(c).rjust(x) for c, x in zip(cells, w)) + ' |'
    return '\n'.join([sep, line(cols), sep] + [line(r) for r in t['rows']] + [sep])


def changelog(t):
    """A changelog table (first column 'op') as a list of (op, row tuple)."""
    assert t['cols'][0] == 'op', t['cols']
    return [(r[0], tuple(r[1:])) for r in t['rows']]


# ---- clean-up of recorded text -----------------------------------------------------------------------------------------------------------------------
def norm(text, f=None):
    """Take out what changes from run to run: the temporary folder, job and vertex ids, ports, process ids, clock times and user names."""
    t = F.strip_ansi(text)
    if f is not None:
        t = t.replace(str(f.work), '<work>')
    t = re.sub(r'/tmp/flink-[A-Za-z0-9_]+', '<work>', t)
    t = re.sub(r'\b[0-9a-f]{32}\b', '<id>', t)
    t = re.sub(r'(?<=pid )\d+', '<pid>', t)
    t = re.sub(r'\d{4}-\d\d-\d\d \d\d:\d\d:\d\d,\d{3}', '<time>', t)
    t = re.sub(r'\d\d\.\d\d\.\d{4} \d\d:\d\d:\d\d', '<time>', t)
    t = re.sub(r'^Waiting for response\.\.\.\n?', '', t, flags=re.M)
    t = re.sub(r'^Command history file path: .*\n?', '', t, flags=re.M)
    t = re.sub(r'^Nov \d+, \d{4} .*org\.jline.*\n?', '', t, flags=re.M)
    return t


def job_ids(out):
    """The ids of the jobs that the SQL client submitted, in order."""
    return re.findall(r'Job ID: ([0-9a-f]{32})', F.strip_ansi(out))


def submit(f, script, name='submit', **kw):
    """Run a script whose last statement is an INSERT: the SQL client submits the job and returns. Gives (job id, output)."""
    rc, out, err = f.sql(script, name=name, **kw)
    ids = job_ids(out)
    if rc or not ids:
        raise RuntimeError('the script did not submit a job (exit %s):\n%s\n%s' % (rc, F.strip_ansi(out)[-2500:], err[-1500:]))
    return ids[-1], out


# ---- Kafka: topics, a paced producer, readers ----------------------------------------------------------------------------------------------------------
import threading          # noqa: E402
import time               # noqa: E402


def kafka_table(name, topic, bootstrap, cols, group='flink', startup='earliest-offset', fmt='json', extra=None, wm=None):
    """The DDL of a Kafka table. cols is the text of the column list; wm adds a WATERMARK clause."""
    opts = {'connector': 'kafka', 'topic': topic, 'properties.bootstrap.servers': bootstrap, 'properties.group.id': group, 'scan.startup.mode': startup, 'format': fmt}
    opts.update(extra or {})
    return 'CREATE TEMPORARY TABLE %s (%s%s) WITH (%s)' % (name, cols, ', ' + wm if wm else '', ', '.join("'%s' = '%s'" % kv for kv in opts.items()))


class Pacer(threading.Thread):
    """Produce orders start .. start+n-1 to a topic at about `rate` orders a second, from a thread, so that a job can be changed while data arrives."""

    def __init__(self, kx, bootstrap, topic, n, rate=100, start=0, partitions=None):
        super().__init__(daemon=True)
        self.kx, self.bootstrap, self.topic, self.n, self.rate, self.start_at, self.sent = kx, bootstrap, topic, n, rate, start, 0
        self.error = None

    def run(self):
        try:
            p = self.kx.producer(self.bootstrap, **{'linger.ms': 5, 'batch.num.messages': 10})
            step = max(1, self.rate // 10)
            for i in range(self.start_at, self.start_at + self.n, step):
                for j in range(i, min(i + step, self.start_at + self.n)):
                    o = self.kx.order(j)
                    p.produce(self.topic, key=o['store_id'], value=json.dumps({k: o[k] for k in ('order_id', 'store_id', 'total_cents')}, separators=(',', ':')))
                    self.sent += 1
                p.poll(0)
                time.sleep(0.1)
            p.flush(60)
        except Exception as e:          # noqa: BLE001
            self.error = e


def expected_totals(kx, n, start=0):
    """store -> (orders, cents) for orders start .. start+n-1."""
    tot = {}
    for i in range(start, start + n):
        o = kx.order(i)
        c, s = tot.get(o['store_id'], (0, 0))
        tot[o['store_id']] = (c + 1, s + o['total_cents'])
    return tot


def fresh_topic(kx, boot, name, partitions=1, config=None):
    """Create a topic; a topic of the same name from an earlier run on the same broker is removed first."""
    kx.delete_topics(boot, [name])
    kx.create_topic(boot, name, partitions=partitions, config=config)
