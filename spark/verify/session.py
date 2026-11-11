"""Shared helpers for the Spark course: a local session with an event log, the made-up Brewline data, and two readers (plans and event logs).

Everything here runs the real Apache Spark in local mode. The event log is what the Spark UI is drawn from, so the tables that the lessons show
(tasks in a stage, bytes read by a shuffle, bytes spilled) are real numbers of real runs. Nothing is timed: times differ between runs and between machines.
"""
import glob
import json
import os
import re
import shutil
import statistics
import sys
import tempfile

from pyspark.sql import SparkSession
from pyspark.sql import functions as F

os.environ['PYTHONPATH'] = os.path.dirname(os.path.abspath(__file__)) + os.pathsep + os.environ.get('PYTHONPATH', '')   # Python workers must be able to import the modules that define UDFs

os.environ['PYSPARK_PYTHON'] = sys.executable                                                                                                 # the Python workers use the same interpreter as the driver

BASE = {'spark.ui.enabled': 'false', 'spark.driver.bindAddress': '127.0.0.1', 'spark.driver.host': '127.0.0.1', 'spark.sql.session.timeZone': 'UTC',
        'spark.sql.shuffle.partitions': '8', 'spark.default.parallelism': '4', 'spark.sql.warehouse.dir': None, 'spark.ui.showConsoleProgress': 'false'}


class Run:
    """A local Spark session that writes an event log, so that a run can be read back like the Spark UI."""

    def __init__(self, name, work, cores=4, master=None, **conf):
        self.work = work
        self.logdir = os.path.join(work, 'eventlog-' + name)
        shutil.rmtree(self.logdir, ignore_errors=True)
        os.makedirs(self.logdir)
        b = SparkSession.builder.master(master or 'local[%d]' % cores).appName(name)
        settings = dict(BASE)
        settings['spark.sql.warehouse.dir'] = os.path.join(work, 'warehouse-' + name)
        settings.update({'spark.eventLog.enabled': 'true', 'spark.eventLog.dir': 'file://' + self.logdir, 'spark.eventLog.compress': 'false'})
        settings.update({k.replace('__', '.'): str(v) for k, v in conf.items()})
        for k, v in settings.items():
            b = b.config(k, v)
        self.spark = b.getOrCreate()
        self.spark.sparkContext.setLogLevel('OFF')

    def stop(self):
        self.spark.stop()

    def events(self):
        """All events of the log so far (the log is flushed when the session stops, so stop first or call this after stop())."""
        out = []
        for f in sorted(glob.glob(os.path.join(self.logdir, '*', 'events_*'))):
            for line in open(f):
                out.append(json.loads(line))
        return out


def stages(events):
    """One row for each completed stage: id, name, tasks, and the min, median and max of the records and bytes that its tasks read and wrote."""
    tasks = {}
    names = {}
    for e in events:
        if e['Event'] == 'SparkListenerStageSubmitted':
            si = e['Stage Info']
            names[si['Stage ID']] = si['Stage Name']
        if e['Event'] == 'SparkListenerTaskEnd' and e['Task Info'].get('Failed') is False:
            m = e.get('Task Metrics') or {}
            sr, sw, inp = m.get('Shuffle Read Metrics', {}), m.get('Shuffle Write Metrics', {}), m.get('Input Metrics', {})
            tasks.setdefault((e['Stage ID'], e['Stage Attempt ID']), []).append({
                'in_bytes': inp.get('Bytes Read', 0), 'in_records': inp.get('Records Read', 0),
                'sr_bytes': sr.get('Remote Bytes Read', 0) + sr.get('Local Bytes Read', 0), 'sr_records': sr.get('Total Records Read', 0),
                'sw_bytes': sw.get('Shuffle Bytes Written', 0), 'sw_records': sw.get('Shuffle Records Written', 0),
                'spill_mem': m.get('Memory Bytes Spilled', 0), 'spill_disk': m.get('Disk Bytes Spilled', 0)})
    rows = []
    for (sid, att), ts in sorted(tasks.items()):
        def agg(key):
            v = [t[key] for t in ts]
            return {'min': min(v), 'median': statistics.median(v), 'max': max(v), 'sum': sum(v)}
        rows.append({'stage': sid, 'attempt': att, 'name': names.get(sid, ''), 'tasks': len(ts), 'input_bytes': agg('in_bytes'), 'input_records': agg('in_records'),
                     'shuffle_read_bytes': agg('sr_bytes'), 'shuffle_read_records': agg('sr_records'), 'shuffle_write_bytes': agg('sw_bytes'), 'shuffle_write_records': agg('sw_records'),
                     'spilled_memory': agg('spill_mem')['sum'], 'spilled_disk': agg('spill_disk')['sum']})
    return rows


def group_stages(events):
    """The completed stages of each job group (setJobGroup), in the order that they ran. This ties a stage of the event log to the line of code that started it."""
    by_stage = {r['stage']: r for r in stages(events)}
    out = {}
    for e in events:
        if e['Event'] == 'SparkListenerJobStart':
            g = (e.get('Properties') or {}).get('spark.jobGroup.id')
            if g:
                out.setdefault(g, []).extend(by_stage[i] for i in sorted(e['Stage IDs']) if i in by_stage)
    return out


def jobs(events):
    """The jobs of the log: how many stages and tasks each had."""
    out = {}
    for e in events:
        if e['Event'] == 'SparkListenerJobStart':
            out[e['Job ID']] = {'job': e['Job ID'], 'stages': len(e['Stage IDs']), 'tasks': sum(s['Number of Tasks'] for s in e['Stage Infos'])}
    return [out[k] for k in sorted(out)]


def sql_executions(events):
    return [e for e in events if e['Event'].endswith('SparkListenerSQLExecutionStart')]


def plan_text(df, mode='formatted'):
    """The plan that explain(mode) prints, as a string. Modes: simple, extended, formatted, cost, codegen."""
    return df._sc._jvm.PythonSQLUtils.explainString(df._jdf.queryExecution(), mode)


def norm(text, work=None):
    """Make a plan the same on every run: expression ids and plan ids are numbered in order of appearance, and the temporary folder is cut from every path."""
    seen = {}

    def ids(m):
        k = m.group(1)
        seen.setdefault(k, '#%d' % (len(seen) + 1))
        return seen[k] + (m.group(2) or '')
    text = re.sub(r'(#\d+)(L?)', ids, text)
    text = re.sub(r'plan_id=\d+', 'plan_id=N', text)
    if work:
        text = text.replace('file:' + work, '').replace(work, '')
    return text


# ---------------------------------------------------------------------------------------------------------------------------------------------------
# The made-up Brewline data. Everything is computed from the row number with a hash, so every run writes the same files.
# ---------------------------------------------------------------------------------------------------------------------------------------------------
STORES = ['s01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10', 's11', 's12']
CITY = {'s01': ('Singapore', 'SG'), 's02': ('Singapore', 'SG'), 's03': ('Kuala Lumpur', 'MY'), 's04': ('Kuala Lumpur', 'MY'), 's05': ('Jakarta', 'ID'), 's06': ('Jakarta', 'ID'),
        's07': ('Surabaya', 'ID'), 's08': ('Bangkok', 'TH'), 's09': ('Ho Chi Minh City', 'VN'), 's10': ('Hanoi', 'VN'), 's11': ('Manila', 'PH'), 's12': ('Penang', 'MY')}
N_ORDERS = 400_000
N_CUSTOMERS = 5_000
NEW_CUSTOMERS = 250                      # signed up, never ordered: they are in the customers table and in no order
DAYS = 14


def u(col, salt):
    """A number between 0 and 1 that depends on the column and a salt, and on nothing else."""
    return (F.abs(F.xxhash64(col, F.lit(salt))) % F.lit(1_000_000)) / F.lit(1_000_000.0)


def orders_df(spark, n=N_ORDERS):
    i = F.col('id')
    r_store = u(i, 11)
    store = (F.when(r_store < 0.34, 's01').when(r_store < 0.42, 's02').when(r_store < 0.50, 's03').when(r_store < 0.58, 's04').when(r_store < 0.66, 's05').when(r_store < 0.73, 's06')
             .when(r_store < 0.79, 's07').when(r_store < 0.85, 's08').when(r_store < 0.90, 's09').when(r_store < 0.94, 's10').when(r_store < 0.97, 's11').otherwise('s12'))
    r_status = u(i, 13)
    status = F.when(r_status < 0.80, 'PAID').when(r_status < 0.88, 'NEW').when(r_status < 0.95, 'REFUNDED').otherwise('CANCELLED')
    r_ch = u(i, 17)
    channel = F.when(r_ch < 0.55, 'app').when(r_ch < 0.80, 'pos').otherwise('web')
    guest = u(i, 19) < 0.25
    cust = F.when(guest, F.lit(None)).otherwise(F.concat(F.lit('c'), F.lpad((F.abs(F.xxhash64(i, F.lit(23))) % F.lit(N_CUSTOMERS) + 1).cast('string'), 5, '0')))
    ts = F.timestamp_seconds(F.lit(1_793_491_200) + (u(i, 29) * F.lit(DAYS * 86400)).cast('long'))
    total = (F.lit(300) + (u(i, 31) * F.lit(3000)).cast('int')).cast('int')
    return (spark.range(0, n).select((i + 1).alias('order_id'), store.alias('store_id'), cust.alias('customer_id'), ts.alias('order_ts'), status.alias('status'),
                                     channel.alias('channel'), total.alias('total_cents')).withColumn('dt', F.to_date('order_ts')))


def stores_df(spark):
    rows = [(s, CITY[s][0], CITY[s][1]) for s in STORES]
    return spark.createDataFrame(rows, 'store_id string, city string, country string')


def customers_df(spark, n=N_CUSTOMERS + NEW_CUSTOMERS):
    i = F.col('id')
    tier = F.when(u(i, 41) < 0.6, 'none').when(u(i, 41) < 0.85, 'silver').otherwise('gold')
    return spark.range(1, n + 1).select(F.concat(F.lit('c'), F.lpad(i.cast('string'), 5, '0')).alias('customer_id'), tier.alias('loyalty_tier'),
                                        (F.lit(1960) + (u(i, 43) * 45).cast('int')).alias('birth_year'))


def write_world(spark, root):
    """Write the three datasets as Parquet under root, and return their paths. Orders are written one folder per day."""
    paths = {k: os.path.join(root, k) for k in ('orders', 'stores', 'customers')}
    orders_df(spark).repartition(14, 'dt').write.mode('overwrite').partitionBy('dt').parquet(paths['orders'])
    stores_df(spark).coalesce(1).write.mode('overwrite').parquet(paths['stores'])
    customers_df(spark).coalesce(1).write.mode('overwrite').parquet(paths['customers'])
    return paths
