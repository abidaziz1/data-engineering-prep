"""Prints the value of a few settings, so that spark-submit runs can show which source won. SET_IN_CODE sets one of them in the program."""
import json
import os

from pyspark.sql import SparkSession

b = SparkSession.builder.appName('conf-probe')
if os.environ.get('SET_IN_CODE'):
    b = b.config('spark.sql.shuffle.partitions', os.environ['SET_IN_CODE'])
spark = b.getOrCreate()
spark.sparkContext.setLogLevel('OFF')
print('RESULT' + json.dumps({'shuffle_partitions': spark.conf.get('spark.sql.shuffle.partitions'), 'master': spark.sparkContext.master, 'app_name': spark.sparkContext.appName}))
spark.stop()
