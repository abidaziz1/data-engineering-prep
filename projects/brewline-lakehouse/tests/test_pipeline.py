"""The pipeline end to end on a folder of its own: days 1 to 3, with the replay and the late event.

It starts Spark and takes about two minutes.
"""

from pyspark.sql import functions as F

from lakehouse import config, run


def table(spark, path):
    return spark.read.format('delta').load(path)


def test_three_days_with_a_replay_and_a_late_event(spark, home):
    lines1, ok1 = run.run(1)
    assert ok1 and table(spark, config.SILVER).count() == 300

    lines2, ok2 = run.run(2)
    assert ok2
    silver = table(spark, config.SILVER)
    assert silver.count() == 416
    assert silver.where('order_id = 5').collect()[0]['status'] == 'SHIPPED'
    # a refunded order is not in gold
    gold_orders = table(spark, config.GOLD).agg(F.sum('orders')).collect()[0][0]
    assert silver.where("status = 'REFUNDED'").count() == 1 and gold_orders == 415
    # the 4 dirty lines of day 1, and the same 4 in the replay
    assert table(spark, config.QUARANTINE).count() == 8

    lines3, ok3 = run.run(3)
    assert ok3
    # the late event did not undo the update
    order5 = table(spark, config.SILVER).where('order_id = 5').collect()[0]['status']
    assert order5 == 'SHIPPED'

    again, ok4 = run.run(3)
    assert ok4 and again[-1] == 'nothing to do: every file is in the ledger'
    assert table(spark, config.SILVER).count() == 496
