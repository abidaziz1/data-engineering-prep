"""Counts of the tables of a CDC pipeline folder, as JSON, for the recorder and the verifier. Run with CDC_HOME and the service settings set, from the folder of the project."""
import json
import sys

sys.path.insert(0, '.')
from delta.tables import DeltaTable        # noqa: E402
from pyspark.sql import functions as F     # noqa: E402

from cdc import config                     # noqa: E402
from cdc.spark import session              # noqa: E402

spark = session('counts', packages=False)
out = {}
if DeltaTable.isDeltaTable(spark, config.BRONZE):
    out['bronze'] = spark.read.format('delta').load(config.BRONZE).count()
if DeltaTable.isDeltaTable(spark, config.SILVER):
    s = spark.read.format('delta').load(config.SILVER)
    live = s.where(~F.col('is_deleted'))
    out['silver'], out['silver_distinct'] = s.count(), s.select('id').distinct().count()
    out['live'], out['deleted'] = live.count(), s.where(F.col('is_deleted')).count()
    out['shipped'] = live.where("status = 'SHIPPED'").count()
    out['refunded'] = live.where("status = 'REFUNDED'").count()
    out['revenue'] = live.agg(F.sum('amount_cents')).collect()[0][0]
print(json.dumps(out, sort_keys=True))
