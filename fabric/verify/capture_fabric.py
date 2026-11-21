#!/usr/bin/env python3
"""Record what real Apache Spark and Delta Lake do, for the Microsoft Fabric tutorial.

Fabric Spark is Apache Spark, and the tables of a Fabric lakehouse are Delta tables in OneLake. This script runs the open-source versions on this machine,
in a folder laid out like a lakehouse (Files/ and Tables/), on made-up Brewline data, and writes everything a lesson shows into fabric/js/real.js:
result tables, Delta log entries, DESCRIBE HISTORY rows, error messages and file counts. The notebook code of the course (fabric/verify/project) is the code that runs here.

It does not record Microsoft Fabric. OneLake, the capacity and its throttling, the Fabric runtime and its starter pools, V-Order, the SQL analytics endpoint, the Warehouse,
Data Factory pipelines, Dataflows Gen2, Eventstreams and KQL, Direct Lake and the Power BI service did not run. The lessons say which is which.

Usage:   python3 fabric/verify/capture_fabric.py [--out fabric/js/real.js]
Needs:   pip install pyspark==4.0.1 delta-spark==4.0.1 "pandas<3" pyarrow, and Java 17 or 21. The first run downloads the Delta jar from Maven Central.
"""
import argparse
import csv
import importlib.metadata as md
import json
import os
import pathlib
import re
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.dont_write_bytecode = True
import fablib                                      # noqa: E402
from fablib import R, T, table, result, exc, LH, COLS, order, day_rows, write_day     # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--out', default=str(HERE.parent / 'js' / 'real.js'))
args = ap.parse_args()
PROJECT = HERE / 'project'

spark = fablib.start_spark()
sql = spark.sql
from pyspark.sql import functions as F          # noqa: E402

R['meta'].update({'spark': spark.version, 'delta': md.version('delta-spark'), 'pyspark': md.version('pyspark'), 'python': sys.version.split()[0],
                  'java': re.search(r'version "([^"]+)"', subprocess.run(['java', '-version'], capture_output=True, text=True).stderr).group(1),
                  'recorded_on': __import__('datetime').date.today().isoformat(),
                  'note': 'Recorded by fabric/verify/capture_fabric.py from open-source Apache Spark and Delta Lake on one machine. Nothing ran on Microsoft Fabric.'})
for f in sorted(PROJECT.iterdir()):
    if f.is_file():
        R['files'][f.name] = f.read_text()


def run_project(name, **ns):
    """Run a notebook file of the course project as it is on disk."""
    g = {'spark': spark}
    g.update(ns)
    exec(compile((PROJECT / name).read_text(), name, 'exec'), g)
    return g


def run_sql_file(name):
    for stmt in [s.strip() for s in re.sub(r'^--.*$', '', (PROJECT / name).read_text(), flags=re.M).split(';') if s.strip()]:
        sql(stmt)


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# data: five daily files of orders, with the problems that a nightly feed has
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
def hist(name):
    out = []
    for r in sql('DESCRIBE HISTORY ' + name).orderBy('version').collect():
        m = {k: v for k, v in (r['operationMetrics'] or {}).items() if not re.search(r'TimeMs$|^executionTime|Duration', k)}
        out.append({'version': r['version'], 'operation': r['operation'], 'blind': bool(r['isBlindAppend']), 'metrics': m, 'params': dict(r['operationParameters'] or {})})
    return out


def detail(name):
    d = sql('DESCRIBE DETAIL ' + name).collect()[0]
    return {'numFiles': d['numFiles'], 'sizeInBytes': d['sizeInBytes'], 'minReaderVersion': d['minReaderVersion'], 'minWriterVersion': d['minWriterVersion'], 'format': d['format'],
            'partitionColumns': list(d['partitionColumns'])}


def folder(name):
    return LH / 'Tables' / name


def parquet_files(name):
    return sorted(f for f in os.listdir(folder(name)) if f.endswith('.parquet'))


def log_files(name):
    return sorted(f for f in os.listdir(folder(name) / '_delta_log') if not f.startswith('.'))


def n(name, where=''):
    return sql('SELECT count(*) FROM %s %s' % (name, where)).collect()[0][0]


def metric(h, v, k):
    return int(next(x for x in h if x['version'] == v)['metrics'].get(k, 0))


def norm_names(name):
    """A stable name for each data file of a table: part-0001, part-0002 ... in the order in which the commits of the log first add them."""
    m = {}
    for f in sorted(x for x in os.listdir(folder(name) / '_delta_log') if x.endswith('.json')):
        for line in (folder(name) / '_delta_log' / f).read_text().splitlines():
            if line.strip():
                a = json.loads(line).get('add')
                if a and a['path'] not in m:
                    m[a['path']] = 'part-%04d.snappy.parquet' % (len(m) + 1)
    return m


def log_listing(name):
    """The files of the log that a lesson talks about: the commits, the checkpoints and the pointer to the last one."""
    fs = log_files(name)
    return [f for f in fs if f.endswith('.json') or 'checkpoint' in f]


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# 1. the lakehouse: a folder of files
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
for d in range(1, 6):
    write_day(d)
if True:
    files = sorted(os.listdir(LH / 'Files' / 'landing'))
    R['counts']['lake.landing'] = {'files': len(files), 'rows_in_files': [len(day_rows(d)) for d in range(1, 6)], 'total_rows': sum(len(day_rows(d)) for d in range(1, 6)),
                                   'bytes': [(LH / 'Files' / 'landing' / f).stat().st_size for f in files]}
    R['tables']['lake.landing'] = table(['file', 'rows', 'bytes'], [[f, len(day_rows(i + 1)), (LH / 'Files' / 'landing' / f).stat().st_size] for i, f in enumerate(files)])
    T('lake.csv_head', 'Files/landing/orders_2026-03-01.csv\n' + '\n'.join((LH / 'Files' / 'landing' / files[0]).read_text().split('\n')[:4]))
    T('lake.tree_before', 'BrewlineLakehouse/\n  Files/\n    landing/\n' + '\n'.join('      ' + f for f in files) + '\n  Tables/')

# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# 2. bronze: append each file as it came, one commit for each
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
land = run_project('01_bronze.py')['land']
for d in ('2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05'):
    land(d)
bh = hist('bronze_orders')
R['tables']['bronze.history'] = table(['version', 'operation', 'files added', 'rows written'], [[h['version'], h['operation'], int(h['metrics'].get('numFiles', 0)), int(h['metrics'].get('numOutputRows', 0))] for h in bh])
nm = norm_names('bronze_orders')
T('bronze.tree', 'Tables/bronze_orders/\n' + '\n'.join('  ' + v for v in sorted(nm.values())) + '\n  _delta_log/\n' + '\n'.join('    ' + f for f in log_listing('bronze_orders')))
first = [json.loads(l) for l in (folder('bronze_orders') / '_delta_log' / '00000000000000000000.json').read_text().splitlines() if l.strip()]
shown = []
for a in first:
    (kind, body), = a.items()
    if kind == 'commitInfo':
        body = {'operation': body.get('operation'), 'operationParameters': body.get('operationParameters'), 'isBlindAppend': body.get('isBlindAppend')}
    elif kind == 'metaData':
        sch = json.loads(body['schemaString'])
        body = {'format': body['format'], 'schema': ['%s %s' % (f['name'], f['type']) for f in sch['fields']], 'partitionColumns': body['partitionColumns']}
    elif kind == 'add':
        st = json.loads(body.get('stats') or '{}')
        body = {'path': nm[body['path']], 'size': body['size'], 'dataChange': body['dataChange'], 'stats': {'numRecords': st.get('numRecords'), 'minValues.order_id': st.get('minValues', {}).get('order_id'), 'maxValues.order_id': st.get('maxValues', {}).get('order_id')}}
    shown.append(json.dumps({kind: body}, sort_keys=True))
T('bronze.commit0', '\n'.join(shown))
R['counts']['bronze.log'] = {'commits': len(bh), 'kinds_in_first_commit': [list(a)[0] for a in first], 'parquet_files': len(parquet_files('bronze_orders')), 'log_files': len(log_files('bronze_orders')),
                             'crc_files': len([f for f in log_files('bronze_orders') if f.endswith('.crc')]), 'rows': n('bronze_orders'), 'columns': [c for c in spark.table('bronze_orders').columns],
                             'all_strings': all(t == 'string' for _, t in spark.table('bronze_orders').dtypes)}
tt = []
for v in range(len(bh)):
    tt.append([v, n('bronze_orders VERSION AS OF %d' % v)])
R['tables']['bronze.timetravel'] = table(['VERSION AS OF', 'rows'], tt)
R['counts']['bronze.detail'] = detail('bronze_orders')
T('bronze.sample', 'SELECT order_id, store_id, order_ts, status, amount FROM bronze_orders WHERE order_id IS NOT NULL LIMIT 3;\n' + '\n'.join(' | '.join(cell for cell in r) for r in result(sql('SELECT order_id, store_id, order_ts, status, amount FROM bronze_orders WHERE order_id IS NOT NULL ORDER BY order_id LIMIT 3'))['rows']))

# the same load with schema inference: day 1 reads amount as a number, day 3 has "n/a" in it
inf = lambda d: spark.read.option('header', True).option('inferSchema', True).csv('Files/landing/orders_%s.csv' % d)
dt1, dt3 = dict(inf('2026-03-01').dtypes)['amount'], dict(inf('2026-03-03').dtypes)['amount']
inf('2026-03-01').write.format('delta').mode('append').saveAsTable('bronze_infer')
ci, condi, msgi = exc(lambda: inf('2026-03-03').write.format('delta').mode('append').saveAsTable('bronze_infer'))
T('bronze.infer_error', 'spark.read.option("header", True).option("inferSchema", True).csv("Files/landing/orders_2026-03-03.csv")\n    .write.format("delta").mode("append").saveAsTable("bronze_infer")\n' + '\n'.join((msgi or 'no error').split('\n')[:3]))
R['counts']['bronze.infer'] = {'amount_type_day1': dt1, 'amount_type_day3': dt3, 'class': ci, 'condition': condi, 'rows_after_failed_append': n('bronze_infer')}

# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# 3. silver: clean and merge, one run for each day, then the same files again
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
run_sql_file('00_tables.sql')
to_silver = run_project('02_silver.py')['to_silver']
runs = []
src_rows = {d: len(day_rows(d)) for d in range(1, 6)}


def merge_run(label, day, target='silver_orders'):
    v0 = max(h['version'] for h in hist(target))
    to_silver('2026-03-%02d' % day, target)
    h = hist(target)
    last = h[-1]
    m = last['metrics']
    runs.append([label, src_rows.get(day, 2000), int(m.get('numTargetRowsInserted', 0)), int(m.get('numTargetRowsUpdated', 0)), last['version'], n(target), last['version'] > v0, n(target, "WHERE status = 'CANCELLED'"), int(m.get('numTargetFilesAdded', 0)), int(m.get('numTargetFilesRemoved', 0))])


for d in range(1, 6):
    merge_run('day %d' % d, d)
merge_run('day 5 again', 5)
merge_run('day 4 replayed', 4)
merge_run('day 5 replayed', 5)
R['tables']['silver.merge_runs'] = table(['run', 'rows in the file', 'inserted', 'updated', 'table version', 'rows in the table', 'made a commit', 'cancelled orders', 'files written', 'files removed'], [[r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9]] for r in runs])
sh = hist('silver_orders')
cancelled_final = n('silver_orders', "WHERE status = 'CANCELLED'")
R['counts']['silver.merge'] = {'rows': n('silver_orders'), 'distinct_ids': sql('SELECT count(DISTINCT order_id) FROM silver_orders').collect()[0][0], 'cancelled': cancelled_final,
                               'rejects': n('silver_rejects'), 'rejects_no_id': n('silver_rejects', "WHERE _reason = 'no order_id'"), 'rejects_amount': n('silver_rejects', "WHERE _reason = 'amount is not a number'"),
                               'rerun_made_a_commit': runs[5][6], 'rerun_inserted': runs[5][2], 'rerun_updated': runs[5][3], 'replay_updated': runs[6][3], 'replay_inserted': runs[6][2], 'replay_back_updated': runs[7][3],
                               'cancelled_after_day5': runs[4][7], 'cancelled_after_replay': runs[6][7], 'cancelled_after_replay_back': runs[7][7], 'day4_rows_matched': 100}
R['tables']['silver.rejects'] = result(sql('SELECT _reason, count(*) AS rows, min(_source_file) AS first_file FROM silver_rejects GROUP BY _reason ORDER BY _reason'))
R['counts']['silver.detail'] = detail('silver_orders')
# an append that is not idempotent, for comparison
sql('CREATE TABLE silver_plain (order_id STRING, store_id INT, customer_id STRING, order_ts TIMESTAMP, status STRING, amount DECIMAL(10,2)) USING DELTA')
plain = spark.table('bronze_orders').where(F.col('_source_file') == 'Files/landing/orders_2026-03-04.csv').select('order_id', F.col('store_id').cast('int'), 'customer_id', F.col('order_ts').cast('timestamp'), 'status', F.col('amount').cast('decimal(10,2)'))
plain.write.format('delta').mode('append').saveAsTable('silver_plain')
plain.write.format('delta').mode('append').saveAsTable('silver_plain')
R['counts']['silver.plain_append'] = {'rows_in_file': plain.count(), 'rows_after_two_appends': n('silver_plain'), 'distinct_ids': sql('SELECT count(DISTINCT order_id) FROM silver_plain').collect()[0][0]}
# three versions of the silver step on tables that record their changes, each run for day 1 to 5 and then day 5 again:
#   with the condition of the project, with no condition at all, and with a source that is filtered to new or different lines first
SILVER_DDL = 'CREATE TABLE %s (order_id STRING NOT NULL, store_id INT, customer_id STRING, order_ts TIMESTAMP, status STRING, amount DECIMAL(10, 2)) USING DELTA TBLPROPERTIES (delta.enableChangeDataFeed = true)'
base_src = (PROJECT / '02_silver.py').read_text().replace('saveAsTable("silver_rejects")', 'saveAsTable("silver_rejects_variants")')
cond_line = '.whenMatchedUpdateAll(condition="t.status <> s.status OR t.amount <> s.amount")'
assert cond_line in base_src
variants = {'with the condition': ('silver_v_cond', base_src, 'to_silver'),
            'with no condition': ('silver_v_none', base_src.replace(cond_line, '.whenMatchedUpdateAll()'), 'to_silver'),
            'changed lines only': ('silver_v_changed', base_src + '\n' + (PROJECT / '02b_changed_only.py').read_text(), 'to_silver_changed')}
VAR = {}
for label, (tname, src, fn) in variants.items():
    g = {'spark': spark}
    exec(compile(src, label, 'exec'), g)
    sql(SILVER_DDL % tname)
    for d in range(1, 6):
        g[fn]('2026-03-%02d' % d, tname)
    hv_day5 = hist(tname)[-1]['metrics']
    v_before = max(h['version'] for h in hist(tname))
    g[fn]('2026-03-05', tname)
    hh_ = hist(tname)
    m = hh_[-1]['metrics']
    made = hh_[-1]['version'] > v_before
    ch_rows = sql("SELECT count(*) FROM table_changes('%s', %d)" % (tname, hh_[-1]['version'])).collect()[0][0] if made else 0
    VAR[label] = {'day5_updated': int(hv_day5.get('numTargetRowsUpdated', 0)), 'day5_inserted': int(hv_day5.get('numTargetRowsInserted', 0)), 'rerun_commit': made, 'rerun_updated': int(m.get('numTargetRowsUpdated', 0)) if made else 0,
                  'rerun_inserted': int(m.get('numTargetRowsInserted', 0)) if made else 0, 'rerun_files_written': int(m.get('numTargetFilesAdded', 0)) if made else 0, 'rerun_files_removed': int(m.get('numTargetFilesRemoved', 0)) if made else 0,
                  'rerun_change_rows': ch_rows, 'rows': n(tname)}
R['counts']['silver.variants'] = VAR
R['tables']['silver.variants'] = table(['merge', 'rows updated by the rerun', 'files rewritten by the rerun', 'change records of the rerun', 'made a commit'],
                                       [[k, v['rerun_updated'], v['rerun_files_written'], v['rerun_change_rows'], v['rerun_commit']] for k, v in VAR.items()])

# a merge whose source has the same key twice
dup = spark.createDataFrame([('O-10000', 99.0), ('O-10000', 98.0)], 'order_id string, amount double')
dup.createOrReplaceTempView('dup_src')
c, cond, msg = exc(lambda: sql('MERGE INTO silver_orders t USING dup_src s ON t.order_id = s.order_id WHEN MATCHED THEN UPDATE SET t.amount = s.amount').collect())
T('silver.dup_error', "MERGE INTO silver_orders t USING dup_src s ON t.order_id = s.order_id\nWHEN MATCHED THEN UPDATE SET t.amount = s.amount;\n" + '\n'.join(msg.split('\n')[:3]))
R['counts']['silver.dup_error'] = {'class': c, 'condition': cond, 'rows_unchanged': n('silver_orders') == R['counts']['silver.merge']['rows']}

# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# 4. schema: enforcement, evolution and constraints
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
sql('CREATE TABLE silver_evo USING DELTA AS SELECT * FROM silver_orders')
before = spark.table('silver_evo').columns
newcol = spark.table('silver_evo').limit(3).withColumn('channel', F.lit('app'))
c, cond, msg = exc(lambda: newcol.write.format('delta').mode('append').saveAsTable('silver_evo'))
T('schema.mismatch', 'df.write.format("delta").mode("append").saveAsTable("silver_evo")   # df has a new column, channel\n' + '\n'.join(msg.split('\n')[:6]))
R['counts']['schema.mismatch'] = {'class': c, 'condition': cond, 'rows_after_failed_append': n('silver_evo'), 'columns_before': before}
newcol.write.format('delta').mode('append').option('mergeSchema', 'true').saveAsTable('silver_evo')
R['counts']['schema.evolve'] = {'columns_before': before, 'columns_after': spark.table('silver_evo').columns, 'rows_after': n('silver_evo'), 'old_rows_have_null_channel': n('silver_evo', 'WHERE channel IS NULL'),
                                'new_rows': n('silver_evo', "WHERE channel = 'app'")}
wrongtype = sql("SELECT 'O-X1' AS order_id, 1 AS store_id, 'C-001' AS customer_id, timestamp'2026-03-09 10:00:00' AS order_ts, 'PLACED' AS status, 'free' AS amount")
c2, cond2, msg2 = exc(lambda: wrongtype.write.format('delta').mode('append').saveAsTable('silver_orders'))
T('schema.type_error', 'df.write.format("delta").mode("append").saveAsTable("silver_orders")   # amount is the text "free"\n' + '\n'.join(msg2.split('\n')[:4]))
R['counts']['schema.type_error'] = {'class': c2, 'condition': cond2, 'rows_after': n('silver_orders')}
sql('CREATE TABLE silver_chk USING DELTA AS SELECT * FROM silver_orders')
sql('ALTER TABLE silver_chk ADD CONSTRAINT amount_positive CHECK (amount > 0)')
c3, cond3, msg3 = exc(lambda: sql("INSERT INTO silver_chk VALUES ('O-BAD', 1, 'C-001', timestamp'2026-03-09 10:00:00', 'PLACED', -5.00)").collect())
T('schema.check_error', "ALTER TABLE silver_chk ADD CONSTRAINT amount_positive CHECK (amount > 0);\nINSERT INTO silver_chk VALUES ('O-BAD', 1, 'C-001', timestamp'2026-03-09 10:00:00', 'PLACED', -5.00);\n" + '\n'.join(msg3.split('\n')[:3]))
c4, cond4, msg4 = exc(lambda: sql("INSERT INTO silver_orders VALUES (NULL, 1, 'C-001', timestamp'2026-03-09 10:00:00', 'PLACED', 5.00)").collect())
R['counts']['schema.constraints'] = {'check_class': c3, 'check_condition': cond3, 'rows_after_failed_insert': n('silver_chk'), 'not_null_condition': cond4, 'not_null_refused': c4 is not None,
                                     'protocol_after_check': detail('silver_chk')['minWriterVersion'], 'protocol_before': detail('silver_orders')['minWriterVersion']}

# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# 5. small files: forty commits, OPTIMIZE, VACUUM and what time travel can still reach
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
sql('CREATE TABLE events_small (event_id BIGINT, store_id INT, kind STRING) USING DELTA')
for i in range(40):
    sql('INSERT INTO events_small SELECT id, CAST(id %% 12 AS INT) + 1, CASE WHEN id %% 3 = 0 THEN "view" ELSE "click" END FROM range(%d, %d, 1, 1)' % (i * 100, i * 100 + 100)).collect()
d0 = detail('events_small')
lf0 = log_files('events_small')
R['counts']['files.small'] = {'commits': len(hist('events_small')), 'rows': n('events_small'), 'files': d0['numFiles'], 'bytes': d0['sizeInBytes'], 'avg_bytes_per_file': d0['sizeInBytes'] // d0['numFiles'],
                              'json_commits': len([f for f in lf0 if f.endswith('.json')]), 'checkpoints': [f for f in lf0 if 'checkpoint' in f], 'has_last_checkpoint': '_last_checkpoint' in lf0}
opt = sql('OPTIMIZE events_small').collect()[0]
om = opt['metrics'].asDict(recursive=True)
d1 = detail('events_small')
hh = hist('events_small')
R['counts']['files.optimize'] = {'files_removed': om['numFilesRemoved'], 'files_added': om['numFilesAdded'], 'files_after': d1['numFiles'], 'bytes_after': d1['sizeInBytes'], 'rows_after': n('events_small'),
                                 'parquet_files_in_folder': len(parquet_files('events_small')), 'operation': hh[-1]['operation'], 'blind_append': hh[-1]['blind'], 'data_change': any(json.loads(l).get('add', {}).get('dataChange') for l in (folder('events_small') / '_delta_log' / ('%020d.json' % hh[-1]['version'])).read_text().splitlines() if l.strip()), 'version': hh[-1]['version'],
                                 'min_reader': d1['minReaderVersion']}
dry = sql('VACUUM events_small DRY RUN').collect()
R['counts']['files.vacuum_dry'] = {'rows': len(dry), 'message': fablib.mask(str(dry[0][0])) if dry else ''}
c5, cond5, msg5 = exc(lambda: sql('VACUUM events_small RETAIN 0 HOURS').collect())
T('files.vacuum_check', 'VACUUM events_small RETAIN 0 HOURS;\n' + '\n'.join(msg5.split('\n')[:3]))
R['counts']['files.vacuum_check'] = {'class': c5, 'condition': cond5, 'files_after_refusal': len(parquet_files('events_small'))}
spark.conf.set('spark.databricks.delta.retentionDurationCheck.enabled', 'false')
vac = sql('VACUUM events_small RETAIN 0 HOURS').collect()
spark.conf.set('spark.databricks.delta.retentionDurationCheck.enabled', 'true')
lf1 = log_files('events_small')
R['counts']['files.vacuum'] = {'parquet_files_after': len(parquet_files('events_small')), 'rows_after': n('events_small'), 'json_commits_after': len([f for f in lf1 if f.endswith('.json')]), 'checkpoint_files': len([f for f in lf1 if 'checkpoint' in f])}
c6, cond6, msg6 = exc(lambda: sql('SELECT sum(event_id) FROM events_small VERSION AS OF 5').collect())
T('files.timetravel_error', 'SELECT sum(event_id) FROM events_small VERSION AS OF 5;\n' + '\n'.join((msg6 or 'no error').split('\n')[:3]))
R['counts']['files.timetravel_error'] = {'class': c6, 'condition': cond6, 'latest_still_works': n('events_small') == 4000, 'optimize_version_reads': n('events_small VERSION AS OF %d' % hh[-1]['version']) == 4000}
R['tables']['files.lifecycle'] = table(['step', 'files in the table', 'parquet files in the folder'], [
    ['40 inserts of 100 rows', d0['numFiles'], d0['numFiles']],
    ['OPTIMIZE', d1['numFiles'], R['counts']['files.optimize']['parquet_files_in_folder']],
    ['VACUUM RETAIN 0 HOURS', d1['numFiles'], R['counts']['files.vacuum']['parquet_files_after']]])
props = {r[0]: r[1] for r in sql('SHOW TBLPROPERTIES events_small').collect()}
R['counts']['files.properties'] = {'has_retention_property': 'delta.deletedFileRetentionDuration' in props, 'properties': sorted(props)}

# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# 6. partitions on a table of 10,000 rows
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
rows = []
base = spark.table('silver_orders').withColumn('order_date', F.to_date('order_ts'))
for label, col in [('no partition', None), ('order_date', 'order_date'), ('store_id', 'store_id'), ('customer_id', 'customer_id')]:
    name = 'silver_by_' + (col or 'none')
    w = base.repartition(1).write.format('delta').mode('overwrite')
    (w.partitionBy(col) if col else w).saveAsTable(name)
    d = detail(name)
    rows.append([label, len(d['partitionColumns']) and sql('SELECT count(DISTINCT %s) FROM %s' % (col, name)).collect()[0][0] or 1, d['numFiles'], d['sizeInBytes'], d['sizeInBytes'] // d['numFiles']])
R['tables']['partition.layout'] = table(['partitioned by', 'partitions', 'files', 'bytes in all', 'bytes per file'], rows)
R['counts']['partition.layout'] = {'rows': 10000, 'by_customer_files': rows[3][2], 'by_date_files': rows[1][2], 'none_files': rows[0][2]}
q = "SELECT count(*) FROM silver_by_order_date WHERE order_date = DATE'2026-03-02'"
plan = spark.sql(q)._jdf.queryExecution().explainString(spark._jvm.org.apache.spark.sql.execution.ExplainMode.fromString('formatted'))
scan = [l.strip() for l in plan.split('\n') if 'PartitionFilters' in l or 'Scan parquet' in l]
T('partition.plan', q + '\n' + '\n'.join(re.sub(r'#\d+L?', '', l) for l in scan))
R['counts']['partition.pruning'] = {'rows_for_the_day': spark.sql(q).collect()[0][0], 'plan_has_partition_filter': any('PartitionFilters' in l and 'order_date' in l for l in scan),
                                    'files_total': detail('silver_by_order_date')['numFiles']}

# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# 7. a bad overwrite, and RESTORE
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
sql('CREATE TABLE silver_rst USING DELTA AS SELECT * FROM silver_orders')
spark.table('silver_rst').limit(500).write.format('delta').mode('overwrite').saveAsTable('silver_rst')       # someone loaded one small file with overwrite
after_bad = n('silver_rst')
rh = hist('silver_rst')
sql('RESTORE TABLE silver_rst TO VERSION AS OF 0').collect()
rh2 = hist('silver_rst')
R['tables']['restore.history'] = table(['version', 'operation', 'rows after'], [[0, rh[0]['operation'], n('silver_rst VERSION AS OF 0')], [1, rh[1]['operation'], n('silver_rst VERSION AS OF 1')], [2, rh2[2]['operation'], n('silver_rst')]])
R['counts']['restore'] = {'rows_before': 10000, 'rows_after_bad_overwrite': after_bad, 'rows_after_restore': n('silver_rst'), 'restore_is_a_new_version': rh2[2]['version'] == 2,
                          'restored_files': int(rh2[2]['metrics'].get('numRestoredFiles', 0)), 'removed_files': int(rh2[2]['metrics'].get('numRemovedFiles', 0)), 'operations': [h['operation'] for h in rh2]}

# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# 8. change data feed: what changed, for the layer after
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
sql('CREATE TABLE silver_cdf (order_id STRING NOT NULL, store_id INT, customer_id STRING, order_ts TIMESTAMP, status STRING, amount DECIMAL(10,2)) USING DELTA TBLPROPERTIES (delta.enableChangeDataFeed = true)')
for d in range(1, 6):
    to_silver('2026-03-%02d' % d, 'silver_cdf')
sql("DELETE FROM silver_cdf WHERE order_id = 'O-10001'").collect()
last = max(h['version'] for h in hist('silver_cdf'))
ch = sql('SELECT _change_type, count(*) AS rows FROM table_changes("silver_cdf", 1) GROUP BY _change_type ORDER BY _change_type')
R['tables']['cdf.changes'] = result(ch)
R['tables']['cdf.update_sample'] = result(sql("SELECT order_id, status, _change_type, _commit_version FROM table_changes('silver_cdf', %d, %d) WHERE _change_type LIKE 'update%%' ORDER BY order_id, _change_type LIMIT 4" % (last - 1, last - 1)))
R['counts']['cdf'] = {'versions': last, 'has_enable_property': True, 'change_types': sorted(r[0] for r in ch.collect()), 'delete_rows': sql("SELECT count(*) FROM table_changes('silver_cdf', %d) WHERE _change_type = 'delete'" % last).collect()[0][0]}

# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# 9. gold, and a reader that is pinned to a version
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
run_sql_file('03_gold.sql')
gh = hist('gold_daily_revenue')
R['tables']['gold.sample'] = result(sql('SELECT order_date, store_id, orders, revenue FROM gold_daily_revenue ORDER BY order_date, store_id LIMIT 6'))
tot = sql("SELECT sum(amount) FROM silver_orders WHERE status <> 'REFUNDED'").collect()[0][0]
gold_tot = sql('SELECT sum(revenue) FROM gold_daily_revenue').collect()[0][0]
R['counts']['gold.table'] = {'rows': n('gold_daily_revenue'), 'orders': sql('SELECT sum(orders) FROM gold_daily_revenue').collect()[0][0], 'revenue': float(gold_tot), 'silver_revenue': float(tot),
                             'equal': gold_tot == tot, 'version': gh[-1]['version'], 'operation': gh[-1]['operation']}
pin = gh[-1]['version']
rev_pin = sql('SELECT sum(revenue) FROM gold_daily_revenue').collect()[0][0]
write_day(6)
land('2026-03-06')
to_silver('2026-03-06')
run_sql_file('03_gold.sql')
gh2 = hist('gold_daily_revenue')
rev_new = sql('SELECT sum(revenue) FROM gold_daily_revenue').collect()[0][0]
rev_pinned = sql('SELECT sum(revenue) FROM gold_daily_revenue VERSION AS OF %d' % pin).collect()[0][0]
R['counts']['gold.pinned'] = {'pinned_version': pin, 'latest_version': gh2[-1]['version'], 'rows_pinned': n('gold_daily_revenue VERSION AS OF %d' % pin), 'rows_latest': n('gold_daily_revenue'),
                              'revenue_pinned': float(rev_pinned), 'revenue_latest': float(rev_new), 'pinned_equals_earlier': rev_pinned == rev_pin, 'dates_latest': sql('SELECT max(order_date) FROM gold_daily_revenue').collect()[0][0].isoformat(),
                              'dates_pinned': sql('SELECT max(order_date) FROM gold_daily_revenue VERSION AS OF %d' % pin).collect()[0][0].isoformat()}
R['tables']['gold.pinned'] = table(['reader', 'delta version', 'last date', 'rows', 'revenue'], [
    ['pinned to the first gold table', pin, R['counts']['gold.pinned']['dates_pinned'], R['counts']['gold.pinned']['rows_pinned'], str(rev_pinned)],
    ['reads the latest', gh2[-1]['version'], R['counts']['gold.pinned']['dates_latest'], R['counts']['gold.pinned']['rows_latest'], str(rev_new)]])

# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# 10. managed and external tables: what DROP removes
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
sql('CREATE TABLE tmp_managed USING DELTA AS SELECT * FROM silver_orders LIMIT 100')
ext = LH / 'Files' / 'exports' / 'ext_orders'
spark.table('silver_orders').limit(100).write.format('delta').save('Files/exports/ext_orders')
sql("CREATE TABLE tmp_external USING DELTA LOCATION 'Files/exports/ext_orders'")
m_before, e_before = folder('tmp_managed').exists(), ext.exists()
sql('DROP TABLE tmp_managed')
sql('DROP TABLE tmp_external')
R['counts']['drop'] = {'managed_folder_before': m_before, 'managed_folder_after': folder('tmp_managed').exists(), 'external_folder_before': e_before, 'external_folder_after': ext.exists(),
                       'external_rows_still_readable': spark.read.format('delta').load('Files/exports/ext_orders').count()}

# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# 11. the weekly maintenance notebook of the project
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
MT = ['bronze_orders', 'silver_orders', 'gold_daily_revenue']
maint = {tn: {'files_before': detail(tn)['numFiles'], 'folder_before': len(parquet_files(tn)), 'bytes_before': detail(tn)['sizeInBytes'], 'versions_before': len(hist(tn))} for tn in MT}
run_project('04_maintenance.py')
for tn in MT:
    h_ = hist(tn)
    maint[tn].update({'files_after': detail(tn)['numFiles'], 'folder_after': len(parquet_files(tn)), 'bytes_after': detail(tn)['sizeInBytes'], 'versions_after': len(h_), 'last_operations': [x['operation'] for x in h_[-3:]],
                      'optimized': any(x['operation'] == 'OPTIMIZE' for x in h_[maint[tn]['versions_before']:]), 'rows': n(tn)})
R['counts']['maint'] = maint
R['tables']['maint'] = table(['table', 'files before', 'files after', 'parquet files in the folder after', 'rows'], [[tn, maint[tn]['files_before'], maint[tn]['files_after'], maint[tn]['folder_after'], maint[tn]['rows']] for tn in MT])

# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# 12. a retry of the landing step: a plain append against a replace of the rows of the file
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
land_once = run_project('01b_land_once.py')['land_once']
land('2026-03-05', 'bronze_retry')
land('2026-03-05', 'bronze_retry')
land_once('2026-03-05', 'bronze_once')            # the first call creates the table
v_once1 = len(hist('bronze_once'))
land_once('2026-03-05', 'bronze_once')
land_once('2026-03-05', 'bronze_once')
ho = hist('bronze_once')
R['counts']['bronze.retry'] = {'rows_in_file': src_rows[5], 'plain_rows_after_two_runs': n('bronze_retry'), 'once_rows_after_three_runs': n('bronze_once'),
                               'plain_distinct_lines': sql('SELECT count(*) FROM (SELECT DISTINCT * FROM bronze_retry)').collect()[0][0], 'once_operations': [h['operation'] for h in ho],
                               'once_versions_after_first': v_once1}

# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
# the lakehouse after all of it
# ---------------------------------------------------------------------------------------------------------------------------------------------------------------
tables = sorted(d for d in os.listdir(LH / 'Tables') if (LH / 'Tables' / d / '_delta_log').exists())
R['counts']['lake.after'] = {'tables': tables, 'every_table_has_a_log': True}
T('lake.tree_after', 'BrewlineLakehouse/\n  Files/\n    landing/ (6 files)\n    exports/ext_orders/ (a Delta table that the lakehouse does not manage)\n  Tables/\n' + '\n'.join('    %s/' % t for t in tables if not t.startswith('tmp_')))

fablib.write_real(args.out)
print('wrote %s: %d files, %d texts, %d tables, %d sets of counts' % (args.out, len(R['files']), len(R['text']), len(R['tables']), len(R['counts'])))
fablib.cleanup()
