"""The Debezium change event, as Spark columns.

With the JSON converter and no schema, the value of a message is the envelope itself:
before and after (the row), source (where it came from, with the log position `lsn`), and op
(c create, u update, d delete, r read of the snapshot).
"""

from pyspark.sql import functions as F
from pyspark.sql.types import LongType, StringType, StructField, StructType

ROW = StructType(
    [
        StructField('id', LongType()),
        StructField('store_id', LongType()),
        StructField('status', StringType()),
        StructField('amount_cents', LongType()),
        StructField('updated_at', StringType()),
    ]
)
SOURCE = StructType([StructField('lsn', LongType()), StructField('snapshot', StringType())])
ENVELOPE = StructType(
    [
        StructField('before', ROW),
        StructField('after', ROW),
        StructField('source', SOURCE),
        StructField('op', StringType()),
    ]
)
COLUMNS = ['store_id', 'status', 'amount_cents', 'updated_at']


def parse(events):
    """Adds the fields of the envelope to a DataFrame with the raw text in `value`.

    The key of the row is the id of the row after the change, or before it for a delete.
    """
    parsed = events.withColumn('e', F.from_json('value', ENVELOPE))
    return parsed.select(
        'offset',
        F.coalesce('e.after.id', 'e.before.id').alias('id'),
        F.col('e.op').alias('op'),
        F.col('e.source.lsn').alias('lsn'),
        *[F.col('e.after.' + c).alias(c) for c in COLUMNS],
    )
