"""Helpers of the recorder for the Microsoft Fabric course: one local Apache Spark session with Delta Lake, a folder that is laid out like a Lakehouse
(Files/ and Tables/), and the writer of js/real.js. Fabric itself did not run: Fabric Spark is Apache Spark and its lakehouse tables are Delta tables,
and this recorder runs the open-source versions of both on this machine.
Everything the recorder makes lives in one temporary folder that is removed at the end. No setting of the machine is read or changed."""
import csv
import datetime
import decimal
import glob
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
R = {'meta': {}, 'files': {}, 'text': {}, 'tables': {}, 'counts': {}}
WORK = pathlib.Path(tempfile.mkdtemp(prefix='fabric-capture-'))
LH = WORK / 'BrewlineLakehouse'            # the lakehouse: Files/ for any file, Tables/ for Delta tables
spark = None


def start_spark():
    global spark
    from pyspark.sql import SparkSession
    from delta import configure_spark_with_delta_pip
    (LH / 'Files').mkdir(parents=True, exist_ok=True)
    (LH / 'Tables').mkdir(parents=True, exist_ok=True)
    os.chdir(LH)                                   # a notebook with a default lakehouse reads "Files/..." relative to it
    b = (SparkSession.builder.master('local[2]').appName('brewline')
         .config('spark.sql.extensions', 'io.delta.sql.DeltaSparkSessionExtension')
         .config('spark.sql.catalog.spark_catalog', 'org.apache.spark.sql.delta.catalog.DeltaCatalog')
         .config('spark.ui.enabled', 'false').config('spark.ui.showConsoleProgress', 'false')
         .config('spark.sql.warehouse.dir', str(LH / 'Tables'))
         .config('spark.sql.session.timeZone', 'UTC').config('spark.sql.shuffle.partitions', '4')
         .config('spark.sql.adaptive.enabled', 'false').config('spark.driver.memory', '2g')
         .config('spark.sql.sources.default', 'delta')            # Fabric creates Delta tables by default, open-source Spark creates Parquet tables
         .config('spark.databricks.delta.snapshotPartitions', '2'))
    spark = configure_spark_with_delta_pip(b).getOrCreate()
    spark.sparkContext.setLogLevel('OFF')
    return spark


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# data: five daily files of orders, with the problems that a nightly feed has. Fixed rules, no random numbers.
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
COLS = ['order_id', 'store_id', 'customer_id', 'order_ts', 'status', 'amount']


def order(day, i, status=None):
    st = status or ('REFUNDED' if i % 25 == 0 else 'SHIPPED' if i % 7 == 0 else 'PLACED')
    return ['O-%d%04d' % (day, i), str(1 + (i * 7) % 12), 'C-%03d' % (1 + (i * 13 + day * 5) % 400),
            '2026-03-%02d %02d:%02d:00' % (day, (i * 37) % 24, (i * 11) % 60), st, '%d.%02d' % (5 + (i * 17) % 80, (i * 5) % 100)]


def day_rows(day):
    rows = [order(day, i) for i in range(2000)]
    if day == 2:
        rows += [['', str(1 + i % 12), 'C-001', '2026-03-02 10:00:00', 'PLACED', '9.50'] for i in range(12)]            # no order id
    if day == 3:
        rows += [['O-3%04d' % (2000 + i), '3', 'C-002', '2026-03-03 11:00:00', 'PLACED', 'n/a'] for i in range(5)]       # an amount that is not a number
    if day == 4:
        rows += [order(3, i) for i in range(100)]                                                                         # 100 orders of yesterday, sent again
    if day == 5:
        rows += [order(4, i, status='CANCELLED') for i in range(40)]                                                      # 40 orders of yesterday, changed
    if day == 6:
        pass
    return rows


def write_day(day):
    p = LH / 'Files' / 'landing' / ('orders_2026-03-%02d.csv' % day)
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(COLS)
        w.writerows(day_rows(day))
    return p


def mask(s):
    s = str(s)
    s = s.replace(str(WORK), '~')
    s = re.sub(r'file:/+[^\s,\]\)\'"]*?BrewlineLakehouse', 'file:/BrewlineLakehouse', s)
    s = re.sub(r'#\d+L?', '', s)
    s = re.sub(r'\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b', '<id>', s)
    s = re.sub(r'part-\d{5}-[0-9a-f-]{36}(-c\d+)?', 'part-<id>', s)
    return '\n'.join(l.rstrip() for l in s.split('\n'))


def T(key, s):
    R['text'][key] = mask(s).strip('\n')
    return R['text'][key]


def table(cols, rows):
    return {'cols': cols, 'rows': rows}


def cell(v):
    if v is None:
        return 'NULL'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, (datetime.datetime, datetime.date, decimal.Decimal)):
        return str(v)
    if isinstance(v, float):
        return repr(round(v, 4))
    if hasattr(v, 'asDict'):
        return json.dumps(v.asDict(recursive=True), default=str, sort_keys=True)
    if isinstance(v, (list, tuple, dict)):
        return json.dumps(v, default=str, sort_keys=True)
    return str(v)


def result(df, cols=None, limit=None):
    """A Spark DataFrame as a recorded table: {cols, rows} with every cell as text."""
    rows = df.collect() if limit is None else df.limit(limit).collect()
    return table(cols or df.columns, [[cell(v) for v in r] for r in rows])


def exc(fn):
    """The error a call raises, as (class, condition, message) with the volatile parts removed. (None, None, None) when it did not fail."""
    try:
        fn()
    except Exception as e:      # noqa: BLE001
        je = getattr(e, 'java_exception', None)
        msg = None
        if je is not None:
            while je.getCause() is not None and 'delta' not in je.getClass().getName().lower() and 'spark' not in je.getClass().getName().lower():
                je = je.getCause()
            msg = je.getMessage()
            cls = je.getClass().getSimpleName()
        else:
            cls = type(e).__name__
            try:
                msg = e.getMessage()
            except Exception:      # noqa: BLE001      Delta error classes are unknown to the message helper of PySpark
                msg = getattr(e, '_desc', None) or str(e)
            if not msg:
                msg = getattr(e, '_desc', None) or str(e)
        msg = re.split(r'\n\s*(JVM stacktrace|at [a-z]+\.)', msg)[0]
        m = re.match(r'\[([A-Z_0-9.]+)\]', msg.strip())
        return cls, (m.group(1) if m else ''), mask(msg).strip()
    return None, None, None


def write_real(path):
    path = pathlib.Path(path)
    path.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(R, indent=1, sort_keys=True, ensure_ascii=False, default=str) + ';\n')
    return path


def cleanup():
    global spark
    try:
        if spark:
            spark.stop()
    finally:
        os.chdir('/')
        shutil.rmtree(WORK, ignore_errors=True)
