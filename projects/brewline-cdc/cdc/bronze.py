"""Bronze: every message of the topic, as it came, with where it came from in Kafka.

The value is the text of the change event. Nothing is parsed here, so nothing can be lost here.
A Structured Streaming checkpoint remembers the offsets that were read, so a rerun reads only
what is new.
"""

import os

from delta.tables import DeltaTable
from pyspark.sql import functions as F

from . import config


def count(spark):
    if not DeltaTable.isDeltaTable(spark, config.BRONZE):
        return 0
    return spark.read.format('delta').load(config.BRONZE).count()


def ingest(spark):
    """Reads the new messages of the topic into bronze, once. Returns how many it added."""
    before = count(spark)
    source = (
        spark.readStream.format('kafka')
        .option('kafka.bootstrap.servers', config.BOOTSTRAP)
        .option('subscribe', config.TOPIC)
        .option('startingOffsets', 'earliest')
        .load()
    )
    messages = source.select(
        'topic',
        'partition',
        'offset',
        F.col('timestamp').alias('kafka_time'),
        F.col('value').cast('string').alias('value'),
    )
    query = (
        messages.writeStream.format('delta')
        .option('checkpointLocation', os.path.join(config.CHECKPOINTS, 'bronze'))
        .trigger(availableNow=True)
        .start(config.BRONZE)
    )
    query.awaitTermination()
    return count(spark) - before


def topic_size(spark):
    """The number of messages that the topic holds now, from its first and its last offsets."""
    topic = (
        spark.read.format('kafka')
        .option('kafka.bootstrap.servers', config.BOOTSTRAP)
        .option('subscribe', config.TOPIC)
        .option('startingOffsets', 'earliest')
        .option('endingOffsets', 'latest')
        .load()
    )
    return topic.count()
