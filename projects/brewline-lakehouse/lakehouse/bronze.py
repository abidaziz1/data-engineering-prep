"""Bronze: every line of every new file, as raw text, with where it came from.

Nothing is parsed, cleaned or dropped here, so nothing can be lost here. A ledger of the
files that were ingested makes the step safe to repeat: a file that is already in the ledger
is not read again.
"""

import glob
import os

from delta.tables import DeltaTable
from pyspark.sql import Window
from pyspark.sql import functions as F

from . import config


def new_files(spark):
    """The files of the landing zone that the ledger does not know."""
    found = sorted(glob.glob(os.path.join(config.LANDING, 'date=*', '*.json')))
    known = set()
    if DeltaTable.isDeltaTable(spark, config.LEDGER):
        known = {r['file'] for r in spark.read.format('delta').load(config.LEDGER).collect()}
    return [f for f in found if f not in known]


def ingest(spark, run_id):
    """Appends the raw lines of the new files to bronze, and the files to the ledger.

    Returns the files and the number of lines.
    """
    files = new_files(spark)
    if not files:
        return [], 0
    by_file = Window.partitionBy('file').orderBy(F.monotonically_increasing_id())
    numbered = F.row_number().over(by_file)
    raw = (
        spark.read.text(files)
        .withColumn('file', F.input_file_name())
        .withColumn('line_no', numbered)
        .withColumnRenamed('value', 'raw')
        .withColumn('run_id', F.lit(run_id))
    )
    path = F.regexp_replace('file', '^file:', '').alias('file')
    rows = raw.select('run_id', path, 'line_no', 'raw')
    rows.write.format('delta').mode('append').save(config.BRONZE)
    n = rows.count()
    ledger = spark.createDataFrame([(f, run_id) for f in files], 'file string, run_id string')
    ledger.write.format('delta').mode('append').save(config.LEDGER)
    return files, n
