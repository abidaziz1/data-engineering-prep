import importlib
import os
from datetime import datetime

import pytest
from pyspark.sql import SparkSession
from pyspark.testing import assertDataFrameEqual, assertSchemaEqual

T = importlib.import_module(os.environ.get('TRANSFORMS', 'transforms'))
SCHEMA = 'order_id long, store_id string, customer_id string, order_ts timestamp, status string, total_cents int'


@pytest.fixture(scope='session')
def spark():
    s = (SparkSession.builder.master('local[2]').appName('tests').config('spark.sql.shuffle.partitions', '2').config('spark.ui.enabled', 'false')
         .config('spark.driver.bindAddress', '127.0.0.1').config('spark.sql.session.timeZone', 'UTC').config('spark.ui.showConsoleProgress', 'false').getOrCreate())
    yield s
    s.stop()


def orders(spark, rows):
    return spark.createDataFrame(rows, SCHEMA)


def test_paid_and_refunded_orders_count(spark):
    df = orders(spark, [(1, 's01', 'c1', datetime(2026, 11, 1, 9), 'PAID', 1000), (2, 's01', 'c2', datetime(2026, 11, 1, 10), 'REFUNDED', 500), (3, 's01', 'c3', datetime(2026, 11, 1, 11), 'CANCELLED', 700)])
    got = T.daily_revenue(df)
    want = spark.createDataFrame([('s01', datetime(2026, 11, 1).date(), 2, 1500)], 'store_id string, day date, orders long, revenue_cents long')
    assertDataFrameEqual(got, want)


def test_each_store_and_day_is_its_own_row(spark):
    df = orders(spark, [(1, 's01', 'c1', datetime(2026, 11, 1, 9), 'PAID', 100), (2, 's02', 'c2', datetime(2026, 11, 1, 9), 'PAID', 200), (3, 's01', 'c3', datetime(2026, 11, 2, 9), 'PAID', 300)])
    assert T.daily_revenue(df).count() == 3


def test_empty_input_keeps_the_schema(spark):
    got = T.daily_revenue(orders(spark, []))
    assert got.count() == 0
    assertSchemaEqual(got.schema, spark.createDataFrame([], 'store_id string, day date, orders long, revenue_cents long').schema)


def test_guest_orders_are_counted_in_the_share(spark):
    df = orders(spark, [(1, 's01', None, datetime(2026, 11, 1, 9), 'PAID', 100), (2, 's01', 'c2', datetime(2026, 11, 1, 9), 'PAID', 100), (3, 's01', None, datetime(2026, 11, 1, 9), 'NEW', 100), (4, 's01', 'c4', datetime(2026, 11, 1, 9), 'NEW', 100)])
    assert T.guest_share(df).collect()[0]['guest_share'] == 0.5
