"""Tests of the merge into silver: order, repeats, deletes, and two events of one row in a batch."""

from cdc import config, silver

from conftest import batch, event


def state(spark):
    table = spark.read.format('delta').load(config.SILVER)
    return {r['id']: r.asDict() for r in table.collect()}


def test_a_newer_event_is_applied_and_an_older_one_is_left_alone(spark, home):
    silver.apply_batch(spark, batch(spark, event('c', 1, 100)))
    done = silver.apply_batch(spark, batch(spark, event('u', 1, 200, status='SHIPPED')))
    assert (done['inserted'], done['updated']) == (0, 1)
    late = silver.apply_batch(spark, batch(spark, event('u', 1, 150, status='REFUNDED')))
    assert (late['inserted'], late['updated']) == (0, 0)
    assert state(spark)[1]['status'] == 'SHIPPED' and state(spark)[1]['lsn'] == 200


def test_a_batch_that_is_applied_twice_changes_nothing(spark, home):
    events = [event('c', 1, 100), event('c', 2, 110), event('u', 1, 120, status='SHIPPED')]
    silver.apply_batch(spark, batch(spark, *events))
    before = state(spark)
    again = silver.apply_batch(spark, batch(spark, *events))
    assert (again['inserted'], again['updated']) == (0, 0) and state(spark) == before


def test_two_events_of_one_row_in_one_batch_keep_the_latest(spark, home):
    silver.apply_batch(spark, batch(spark, event('c', 1, 100)))
    done = silver.apply_batch(
        spark,
        batch(spark, event('u', 1, 200, status='SHIPPED'), event('u', 1, 300, status='REFUNDED')),
    )
    assert (done['events'], done['distinct'], done['updated']) == (2, 1, 1)
    assert state(spark)[1]['status'] == 'REFUNDED'


def test_a_delete_marks_the_row_and_an_old_event_does_not_bring_it_back(spark, home):
    silver.apply_batch(spark, batch(spark, event('c', 1, 100, status='SHIPPED')))
    silver.apply_batch(spark, batch(spark, event('d', 1, 300)))
    silver.apply_batch(spark, batch(spark, event('u', 1, 200, status='REFUNDED')))
    row = state(spark)[1]
    assert row['is_deleted'] is True and row['lsn'] == 300 and row['status'] == 'SHIPPED'


def test_the_events_of_a_snapshot_share_one_lsn(spark, home):
    events = [event('r', i, 500, amount_cents=1000 + i) for i in range(1, 6)]
    done = silver.apply_batch(spark, batch(spark, *events))
    assert done['inserted'] == 5 and len(state(spark)) == 5
