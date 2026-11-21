"""Counts of the tables of a lakehouse, as JSON, for the recorder and the verifier. Run with LAKEHOUSE_HOME set, from the folder of the project."""
import json
import sys

sys.path.insert(0, '.')
from delta.tables import DeltaTable        # noqa: E402
from pyspark.sql import functions as F     # noqa: E402

from lakehouse import config               # noqa: E402
from lakehouse.spark import session        # noqa: E402

spark = session('counts')
out = {}
if DeltaTable.isDeltaTable(spark, config.BRONZE):
    out['bronze'] = spark.read.format('delta').load(config.BRONZE).count()
    out['ledger'] = spark.read.format('delta').load(config.LEDGER).count()
if DeltaTable.isDeltaTable(spark, config.SILVER):
    s = spark.read.format('delta').load(config.SILVER)
    out['silver'], out['silver_distinct'] = s.count(), s.select('order_id').distinct().count()
    out['order5'] = s.where('order_id = 5').select('status').collect()[0][0]
    out['shipped'] = s.where("status = 'SHIPPED'").count()
    out['refunded'] = s.where("status = 'REFUNDED'").count()
if DeltaTable.isDeltaTable(spark, config.QUARANTINE):
    out['quarantine'] = spark.read.format('delta').load(config.QUARANTINE).count()
if DeltaTable.isDeltaTable(spark, config.GOLD):
    g = spark.read.format('delta').load(config.GOLD)
    out['gold'] = g.count()
    out['gold_revenue'] = g.agg(F.sum('revenue_cents')).collect()[0][0]
    out['gold_orders'] = g.agg(F.sum('orders')).collect()[0][0]
print(json.dumps(out, sort_keys=True))
