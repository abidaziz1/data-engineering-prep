"""The streaming job that fills silver from bronze.

It reads the new rows of bronze as a stream and applies each micro-batch to silver. With
`availableNow` it processes what is there and stops, so that a run has an end.

foreachBatch gives at-least-once: after a crash between the write and the commit of a batch, the
same batch runs again. The merge of silver is safe to repeat, and that is what makes it work.
"""

import os

from . import config, silver


def checkpoint():
    return os.path.join(config.CHECKPOINTS, 'silver')


def forget_last_commit():
    """Removes the commit of the last batch, as a crash before the commit would leave it.

    A checkpoint on a local disk keeps a checksum file next to each commit (`.1.crc` next to
    `1`), and it must go too, or Spark cannot write the commit again.
    """
    commits = os.path.join(checkpoint(), 'commits')
    last = max(int(name) for name in os.listdir(commits) if name.isdigit())
    for name in (str(last), '.%d.crc' % last):
        path = os.path.join(commits, name)
        if os.path.exists(path):
            os.remove(path)
    return last


def process(spark, replay_last=False):
    """Applies the new rows of bronze to silver. Returns what each micro-batch did."""
    silver.create_if_missing(spark)
    if replay_last:
        forget_last_commit()
    done = []

    def handle(batch, batch_id):
        done.append(dict(silver.apply_batch(spark, batch), batch=batch_id))

    query = (
        spark.readStream.format('delta')
        .load(config.BRONZE)
        .writeStream.foreachBatch(handle)
        .option('checkpointLocation', checkpoint())
        .trigger(availableNow=True)
        .start()
    )
    query.awaitTermination()
    return done
