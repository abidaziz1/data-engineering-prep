"""Silver: the current state of every order, from the change events.

A change event is applied only when its log position (lsn) is newer than the one of the row, so
a message that is delivered twice, or late, changes nothing. A delete does not remove the row: it
marks it, and keeps its lsn, so that an old event cannot bring the order back.
"""

import os

from delta.tables import DeltaTable
from pyspark.sql import Window
from pyspark.sql import functions as F
from pyspark.sql.types import BooleanType, LongType, StringType, StructField, StructType

from . import config, envelope

SCHEMA = StructType(
    [
        StructField('id', LongType()),
        StructField('store_id', LongType()),
        StructField('status', StringType()),
        StructField('amount_cents', LongType()),
        StructField('updated_at', StringType()),
        StructField('lsn', LongType()),
        StructField('is_deleted', BooleanType()),
    ]
)


def create_if_missing(spark):
    if not DeltaTable.isDeltaTable(spark, config.SILVER):
        os.makedirs(config.SILVER, exist_ok=True)
        empty = spark.createDataFrame([], SCHEMA)
        empty.write.format('delta').mode('overwrite').save(config.SILVER)


def apply_batch(spark, events):
    """Applies a batch of raw change events (columns `offset` and `value`) to silver.

    Returns the number of events, and how many rows the merge inserted and updated.
    """
    create_if_missing(spark)
    changes = envelope.parse(events).where(F.col('id').isNotNull())
    order = [F.col('lsn').desc(), F.col('offset').desc()]
    latest = Window.partitionBy('id').orderBy(*order)
    ranked = changes.withColumn('rn', F.row_number().over(latest))
    batch = ranked.where('rn = 1').withColumn('is_deleted', F.col('op') == 'd')
    # a delete event has no row, so the business columns keep the values that silver holds
    keep = {c: F.coalesce('s.' + c, 't.' + c) for c in envelope.COLUMNS}
    changed = dict(keep, lsn='s.lsn', is_deleted='s.is_deleted')
    new_row = {c: 's.' + c for c in ['id'] + envelope.COLUMNS + ['lsn', 'is_deleted']}
    target = DeltaTable.forPath(spark, config.SILVER)
    (
        target.alias('t')
        .merge(batch.alias('s'), 't.id = s.id')
        .whenMatchedUpdate(condition='s.lsn > t.lsn', set=changed)
        .whenNotMatchedInsert(values=new_row)
        .execute()
    )
    metrics = target.history(1).select('operationMetrics').collect()[0][0]
    return {
        'events': changes.count(),
        'distinct': batch.count(),
        'inserted': int(metrics['numTargetRowsInserted']),
        'updated': int(metrics['numTargetRowsUpdated']),
    }
