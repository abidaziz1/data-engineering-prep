"""Tests of the change event parser, on a handful of events in a small Spark session."""

from cdc import envelope

from conftest import batch, event


def rows(spark, *events):
    return [r.asDict() for r in envelope.parse(batch(spark, *events)).orderBy('offset').collect()]


def test_the_fields_of_a_create_an_update_and_a_snapshot_read(spark):
    got = rows(
        spark,
        event('c', 7, 100),
        event('u', 7, 200, status='SHIPPED'),
        event('r', 8, 50, amount_cents=900),
    )
    assert [(r['op'], r['id'], r['lsn']) for r in got] == [
        ('c', 7, 100),
        ('u', 7, 200),
        ('r', 8, 50),
    ]
    assert [r['status'] for r in got] == ['PLACED', 'SHIPPED', 'PLACED']
    assert got[2]['amount_cents'] == 900


def test_a_delete_has_the_key_of_the_row_before_and_no_columns(spark):
    got = rows(spark, event('d', 7, 300))
    assert got[0]['id'] == 7 and got[0]['op'] == 'd' and got[0]['status'] is None


def test_a_message_that_is_not_an_event_has_no_key(spark):
    got = rows(spark, 'this is not json', event('c', 7, 100))
    assert [r['id'] for r in got] == [None, 7]
