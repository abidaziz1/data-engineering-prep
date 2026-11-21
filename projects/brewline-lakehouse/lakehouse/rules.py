"""The rules of the silver layer, as Spark column expressions.

One place for them, so that the pipeline and the tests use the same ones.
"""

from pyspark.sql import functions as F
from pyspark.sql.types import ArrayType, LongType, StringType, StructField, StructType

from . import config

LINE_SCHEMA = StructType([StructField('sku', StringType()), StructField('qty', LongType())])

ORDER_SCHEMA = StructType(
    [
        StructField('order_id', LongType()),
        StructField('store_id', LongType()),
        StructField('status', StringType()),
        StructField('amount_cents', LongType()),
        StructField('event_time', StringType()),
        StructField('lines', ArrayType(LINE_SCHEMA)),
        # Spark puts the raw text here when the record cannot be read as the schema says
        StructField('_corrupt', StringType()),
    ]
)

PARSE_OPTIONS = {'mode': 'PERMISSIVE', 'columnNameOfCorruptRecord': '_corrupt'}


def parse_json(raw):
    """The struct of an order from its raw text.

    A record that cannot be read as the schema says gets its text in `_corrupt`.
    """
    return F.from_json(raw, ORDER_SCHEMA, PARSE_OPTIONS)


def reason(o):
    """Why a parsed record is not valid, or null when it is. `o` is the struct of parse_json.

    Spark does not give a null struct for a cut line: it gives a struct of nulls with the
    text in `_corrupt`, so the order id tells the two bad cases apart.
    """
    return (
        F.when(o['_corrupt'].isNotNull() & o['order_id'].isNull(), F.lit('parse_error'))
        .when(o['_corrupt'].isNotNull(), F.lit('bad_type'))
        .when(o['order_id'].isNull(), F.lit('missing_order_id'))
        .when(o['amount_cents'].isNull() | (o['amount_cents'] <= 0), F.lit('bad_amount'))
        .when(~o['status'].isin(config.STATUSES), F.lit('bad_status'))
        .when(~o['store_id'].isin(config.STORES), F.lit('unknown_store'))
    )
