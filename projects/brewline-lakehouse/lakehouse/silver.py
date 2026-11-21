"""Silver: the orders, parsed, validated and de-duplicated, with the latest event winning.

Rows that break a rule go to a quarantine table with the reason, and are never dropped. The
merge is safe to repeat: an event is applied only when it is newer than the one that the
table holds. The order date is the date of the first event that silver saw for the order,
and an update never changes it, so an order stays on the day when it was placed.
"""

from delta.tables import DeltaTable
from pyspark.sql import Window
from pyspark.sql import functions as F

from . import config, rules


def parse(spark, run_id):
    """The bronze rows of this run, parsed.

    `o` is a struct, with the raw text in `o._corrupt` when the record cannot be read.
    """
    bronze = spark.read.format('delta').load(config.BRONZE).where(F.col('run_id') == run_id)
    parsed = bronze.withColumn('o', rules.parse_json(F.col('raw')))
    return parsed.withColumn('reason', rules.reason(F.col('o')))


def process(spark, run_id):
    """Quarantines the bad rows, and merges the good ones into silver. Returns what it did."""
    parsed = parse(spark, run_id).cache()
    total = parsed.count()
    bad = parsed.where(F.col('reason').isNotNull())
    quarantined = bad.select('run_id', 'file', 'line_no', 'reason', 'raw')
    qn = quarantined.count()
    quarantined.write.format('delta').mode('append').save(config.QUARANTINE)

    good = parsed.where(F.col('reason').isNull()).select('o.*', 'file', 'line_no')
    good = good.drop('_corrupt')
    good = good.withColumn('event_time', F.to_timestamp('event_time'))
    good = good.withColumn('order_date', F.to_date('event_time'))
    order = [F.col('event_time').desc(), F.col('file').desc(), F.col('line_no').desc()]
    latest = Window.partitionBy('order_id').orderBy(*order)
    ranked = good.withColumn('rn', F.row_number().over(latest))
    batch = ranked.where('rn = 1').drop('rn', 'file', 'line_no')
    valid, distinct = good.count(), batch.count()

    if not DeltaTable.isDeltaTable(spark, config.SILVER):
        batch.limit(0).write.format('delta').partitionBy('order_date').save(config.SILVER)
    target = DeltaTable.forPath(spark, config.SILVER)
    # an update changes everything except the order date
    changed = {c: 's.' + c for c in batch.columns if c != 'order_date'}
    (
        target.alias('t')
        .merge(batch.alias('s'), 't.order_id = s.order_id')
        .whenMatchedUpdate(condition='s.event_time > t.event_time', set=changed)
        .whenNotMatchedInsertAll()
        .execute()
    )
    m = target.history(1).select('operationMetrics').collect()[0][0]
    # the days whose numbers may have changed: the order dates of this batch, as silver holds them
    silver = spark.read.format('delta').load(config.SILVER)
    days = silver.join(batch.select('order_id'), 'order_id').select('order_date').distinct()
    batch_dates = sorted(r[0].isoformat() for r in days.collect())
    parsed.unpersist()
    return {
        'bronze_rows': total,
        'quarantined': qn,
        'valid': valid,
        'distinct': distinct,
        'inserted': int(m['numTargetRowsInserted']),
        'updated': int(m['numTargetRowsUpdated']),
        'batch_dates': batch_dates,
    }
