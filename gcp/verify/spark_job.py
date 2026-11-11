"""A small Spark job on this machine (local mode), for the Dataproc lessons: what the plan reads, how many tasks a shuffle makes, small files, skew, and a join.

Dataproc runs the same Spark. What is not here: a cluster, YARN, Google Cloud Storage, the BigQuery connector, autoscaling, and the cost of any of them.
Run: python spark_job.py   (needs pyspark and Java 17 or 21; the recorder calls it with the interpreter named by GCP_SPARK_PYTHON). Prints one line that starts with RESULT.
"""
import contextlib
import glob
import io
import json
import os
import re
import shutil
import statistics
import tempfile

from pyspark.sql import SparkSession, functions as F

work = tempfile.mkdtemp(prefix='spark-gcp-')
spark = (SparkSession.builder.master('local[2]').appName('brewline').config('spark.ui.enabled', 'false').config('spark.sql.shuffle.partitions', '200')
         .config('spark.driver.memory', '1g').config('spark.sql.adaptive.enabled', 'false').config('spark.ui.showConsoleProgress', 'false').getOrCreate())
spark.sparkContext.setLogLevel('ERROR')
sc = spark.sparkContext


def plan_text(df):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        df.explain(mode='formatted')
    return buf.getvalue()


def stage_tasks(label, action):
    """Run an action in its own job group and report how many tasks each of its stages had."""
    sc.setJobGroup(label, label)
    action()
    tr = sc.statusTracker()
    tasks = []
    for job in tr.getJobIdsForGroup(label):
        for sid in tr.getJobInfo(job).stageIds:
            info = tr.getStageInfo(sid)
            tasks.append(info.numTasks)
    return sorted(tasks, reverse=True)


# 60,000 orders over 10 days. Store s01 sells about a third of them: that is the skew.
n = 60000
orders = (spark.range(n).withColumnRenamed('id', 'order_id').withColumn('r', F.rand(7)).withColumn('r2', F.rand(11))
          .withColumn('store_id', F.when(F.col('r') < 0.34, F.lit('s01')).otherwise(F.format_string('s%02d', (F.floor(F.col('r2') * 11) + 2).cast('int'))))
          .withColumn('dt', F.date_format(F.expr('date_add(DATE\'2026-11-01\', cast(order_id % 10 as int))'), 'yyyy-MM-dd'))
          .withColumn('total_cents', (F.col('order_id') * 7 % 2700 + 300).cast('int')).drop('r', 'r2'))
path = os.path.join(work, 'orders')
orders.write.partitionBy('dt').parquet(path)
out = {'spark_version': spark.version, 'files_written': len(glob.glob(path + '/dt=*/*.parquet')), 'partitions_written': len(glob.glob(path + '/dt=*'))}

# 1. What the plan reads
o = spark.read.parquet(path)
spark.conf.set('spark.sql.shuffle.partitions', '8')
full = plan_text(o.groupBy('store_id').agg(F.sum('total_cents')))
one_day = plan_text(o.where("dt = '2026-11-03'").groupBy('store_id').agg(F.sum('total_cents')))
grab = lambda t, key: (re.search(key + r': (.*)', t) or [None, 'none'])[1].strip()
out['pruning'] = {'all_days': {'PartitionFilters': re.sub(r'#\d+', '', grab(full, 'PartitionFilters')), 'ReadSchema': grab(full, 'ReadSchema')},
                  'one_day': {'PartitionFilters': re.sub(r'#\d+', '', grab(one_day, 'PartitionFilters')), 'ReadSchema': grab(one_day, 'ReadSchema')}}

# 2. How many tasks a shuffle makes, without and with adaptive query execution
spark.conf.set('spark.sql.shuffle.partitions', '200')
agg = lambda: o.groupBy('store_id').agg(F.sum('total_cents').alias('t')).collect()
no_aqe = stage_tasks('no_aqe', agg)
spark.conf.set('spark.sql.adaptive.enabled', 'true')
aqe = stage_tasks('aqe', agg)
spark.conf.set('spark.sql.adaptive.enabled', 'false')
out['shuffle'] = {'shuffle_partitions_setting': 200, 'tasks_per_stage_without_aqe': no_aqe, 'tasks_per_stage_with_aqe': aqe}

# 3. Small files: how many files does a write make?
files = []
for label, df in (('repartition(200)', o.repartition(200)), ('repartition(4)', o.repartition(4)), ('coalesce(1)', o.coalesce(1))):
    dest = os.path.join(work, 'out_' + re.sub(r'\W', '', label))
    df.write.parquet(dest)
    fs = glob.glob(dest + '/*.parquet')
    files.append({'write': label, 'files': len(fs), 'bytes': sum(os.path.getsize(f) for f in fs), 'bytes_per_file': sum(os.path.getsize(f) for f in fs) // len(fs)})
out['small_files'] = files

# 4. Skew: rows in each of 8 partitions when the data is split by store, and when it is split by store plus a salt
def spread(df):
    rows = [r['n'] for r in df.groupBy(F.spark_partition_id().alias('p')).agg(F.count('*').alias('n')).collect()]
    rows.sort(reverse=True)
    return {'partitions_with_rows': len(rows), 'largest': rows[0], 'median': int(statistics.median(rows)), 'smallest': rows[-1], 'largest_over_median': round(rows[0] / statistics.median(rows), 2)}
spark.conf.set('spark.sql.shuffle.partitions', '8')
by_store = o.repartition(8, 'store_id')
salted = o.withColumn('salt', F.pmod(F.hash('order_id'), F.lit(4))).repartition(8, 'store_id', 'salt')
out['skew'] = {'by_store': spread(by_store), 'by_store_and_salt': spread(salted), 'share_of_s01': round(o.where("store_id = 's01'").count() / n, 3)}

# 5. A join with a small table: broadcast or sort-merge?
stores = spark.createDataFrame([('s%02d' % i, 'city%d' % i) for i in range(1, 13)], ['store_id', 'city'])
joined = o.join(stores, 'store_id')
broadcast_plan = plan_text(joined)
spark.conf.set('spark.sql.autoBroadcastJoinThreshold', '-1')
merge_plan = plan_text(o.join(stores, 'store_id'))
spark.conf.set('spark.sql.autoBroadcastJoinThreshold', '10485760')
out['join'] = {'default_threshold_bytes': 10485760, 'small_table_join': 'BroadcastHashJoin' if 'BroadcastHashJoin' in broadcast_plan else 'other',
               'threshold_off_join': 'SortMergeJoin' if 'SortMergeJoin' in merge_plan else 'other'}
spark.stop()
shutil.rmtree(work, ignore_errors=True)
print('RESULT' + json.dumps(out))
