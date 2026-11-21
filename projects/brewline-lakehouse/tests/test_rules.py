"""Tests of the validation rules, on a handful of records in a small Spark session."""

from pyspark.sql import functions as F

from lakehouse import rules


def reasons(spark, texts):
    df = spark.createDataFrame([(t,) for t in texts], 'raw string')
    df = df.withColumn('o', rules.parse_json(F.col('raw')))
    return [r['reason'] for r in df.withColumn('reason', rules.reason(F.col('o'))).collect()]


def record(**changes):
    """The text of an order, with some fields changed. A field set to None is left out."""
    fields = {
        'order_id': 1,
        'store_id': 3,
        'status': 'PLACED',
        'amount_cents': 1200,
        'event_time': '2026-03-01T10:00:00Z',
    }
    fields.update(changes)
    pairs = []
    for key, value in fields.items():
        if value is not None:
            pairs.append('"%s": %s' % (key, '"%s"' % value if isinstance(value, str) else value))
    return '{' + ', '.join(pairs) + '}'


def test_every_rule_names_its_reason(spark):
    texts = [
        record(),
        record(amount_cents=-5),
        record(status='LOST'),
        record(store_id=99),
        record(amount_cents='12.50'),
        '{"order_id": 4, "store_id": 3, "status": "PLAC',
        record(order_id=None),
    ]
    assert reasons(spark, texts) == [
        None,
        'bad_amount',
        'bad_status',
        'unknown_store',
        'bad_type',
        'parse_error',
        'missing_order_id',
    ]


def test_a_field_that_is_not_in_the_contract_does_not_make_a_record_invalid(spark):
    text = record()[:-1] + ', "coupon": "SPRING"}'
    assert reasons(spark, [text]) == [None]
