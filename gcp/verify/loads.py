"""Five ways to load one day of orders into a table, written in BigQuery SQL. Which of them can you run twice without harm?

The SQL is BigQuery SQL. It was translated by sqlglot and run in DuckDB (see warehouse.py), because BigQuery was not reachable. The set logic is the same.
The experiment: load the batch of one day, load it again (a retry after a timeout), then load a corrected batch for the same day in which
15 orders changed status, 8 orders disappeared at the source and 12 orders are new. After each step the table is compared with what it should hold.
"""
import datetime as dt

import brewdata
import warehouse as W

DAY = '2026-11-10'
COLS = 'order_id, store_id, status, order_ts, total_cents'

APPEND = """
INSERT INTO `brewline-dev.curated.orders_t` (order_id, store_id, status, order_ts, total_cents)
SELECT order_id, store_id, status, order_ts, total_cents FROM `brewline-dev.staging.batch`
"""

MERGE = """
MERGE `brewline-dev.curated.orders_t` AS t
USING `brewline-dev.staging.batch` AS s
ON t.order_id = s.order_id
WHEN MATCHED AND t.status != s.status THEN UPDATE SET status = s.status
WHEN NOT MATCHED THEN INSERT (order_id, store_id, status, order_ts, total_cents) VALUES (s.order_id, s.store_id, s.status, s.order_ts, s.total_cents)
"""

MERGE_AND_DELETE = """
MERGE `brewline-dev.curated.orders_t` AS t
USING `brewline-dev.staging.batch` AS s
ON t.order_id = s.order_id
WHEN MATCHED AND t.status != s.status THEN UPDATE SET status = s.status
WHEN NOT MATCHED BY TARGET THEN INSERT (order_id, store_id, status, order_ts, total_cents) VALUES (s.order_id, s.store_id, s.status, s.order_ts, s.total_cents)
WHEN NOT MATCHED BY SOURCE AND DATE(t.order_ts) = DATE '2026-11-10' THEN DELETE
"""

OVERWRITE_PARTITION = """
BEGIN TRANSACTION;
DELETE FROM `brewline-dev.curated.orders_t` WHERE DATE(order_ts) = DATE '2026-11-10';
INSERT INTO `brewline-dev.curated.orders_t` (order_id, store_id, status, order_ts, total_cents)
SELECT order_id, store_id, status, order_ts, total_cents FROM `brewline-dev.staging.batch`;
COMMIT TRANSACTION;
"""

RELOAD_ALL = """
CREATE OR REPLACE TABLE `brewline-dev.curated.orders_t` AS
SELECT order_id, store_id, status, order_ts, total_cents FROM `brewline-dev.staging.everything`
"""

METHODS = [('append', APPEND), ('merge', MERGE), ('merge_and_delete', MERGE_AND_DELETE), ('overwrite_partition', OVERWRITE_PARTITION), ('reload_all', RELOAD_ALL)]

DEDUPE = """
SELECT order_id, store_id, status, order_ts, total_cents
FROM `brewline-dev.raw.orders_raw`
QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY ingest_ts DESC) = 1
"""


def build_world(wh):
    """The raw layer, the clean history up to the day before, the batch of the day, the corrected batch, and the truth after the correction."""
    rows = brewdata.orders()
    wh.load('raw', 'orders_raw', brewdata.raw_orders(rows))
    wh.run("CREATE OR REPLACE TABLE `brewline-dev.staging.clean` AS " + DEDUPE)
    day_rows = wh.run("SELECT %s FROM `brewline-dev.staging.clean` WHERE DATE(order_ts) = DATE '%s' ORDER BY order_id" % (COLS, DAY))[1]
    ids = [r[0] for r in day_rows]
    changed, vanished = ids[:15], ids[15:23]
    wh.run("CREATE OR REPLACE TABLE `brewline-dev.staging.batch` AS SELECT %s FROM `brewline-dev.staging.clean` WHERE DATE(order_ts) = DATE '%s'" % (COLS, DAY))
    wh.run("CREATE OR REPLACE TABLE `brewline-dev.staging.batch2` AS SELECT order_id, store_id, "
           "CASE WHEN order_id IN (%s) THEN 'REFUNDED_X' ELSE status END AS status, order_ts, total_cents FROM `brewline-dev.staging.batch` WHERE order_id NOT IN (%s)"
           % (','.join(map(str, changed)), ','.join(map(str, vanished))))
    wh.run("UPDATE `brewline-dev.staging.batch2` SET status = 'REFUNDED' WHERE status = 'REFUNDED_X'")
    new_rows = ["(%d, 's01', 'PAID', TIMESTAMP '%s 0%d:15:00', 520)" % (900001 + i, DAY, i % 9) for i in range(12)]
    wh.run("INSERT INTO `brewline-dev.staging.batch2` VALUES " + ','.join(new_rows))
    wh.run("CREATE OR REPLACE TABLE `brewline-dev.staging.history` AS SELECT %s FROM `brewline-dev.staging.clean` WHERE DATE(order_ts) < DATE '%s'" % (COLS, DAY))
    wh.run("CREATE OR REPLACE TABLE `brewline-dev.staging.truth1` AS SELECT * FROM `brewline-dev.staging.history` UNION ALL SELECT * FROM `brewline-dev.staging.batch`")
    wh.run("CREATE OR REPLACE TABLE `brewline-dev.staging.truth2` AS SELECT * FROM `brewline-dev.staging.history` UNION ALL SELECT * FROM `brewline-dev.staging.batch2`")
    return {'changed': len(changed), 'vanished': len(vanished), 'new': len(new_rows), 'batch_rows': len(day_rows)}


WRONG = """
SELECT COUNT(*) FROM (
  SELECT order_id, store_id, status, order_ts, total_cents, COUNT(*) AS n FROM `brewline-dev.curated.orders_t` GROUP BY ALL
) AS a
FULL OUTER JOIN (
  SELECT order_id, store_id, status, order_ts, total_cents, COUNT(*) AS n FROM `brewline-dev.staging.%s` GROUP BY ALL
) AS b USING (order_id, store_id, status, order_ts, total_cents)
WHERE IFNULL(a.n, 0) != IFNULL(b.n, 0)
"""


def wrong_rows(wh, truth):
    """How many distinct rows differ from the truth, missing, extra, changed or repeated? Zero means the table is exactly right."""
    return wh.scalar(WRONG % truth)


def run_methods():
    wh = W.Warehouse()
    world = build_world(wh)
    out = []
    for name, sql in METHODS:
        wh.run("CREATE OR REPLACE TABLE `brewline-dev.curated.orders_t` AS SELECT * FROM `brewline-dev.staging.history`")
        steps = []

        def step(label, batch, truth):
            if name == 'reload_all':
                wh.run("CREATE OR REPLACE TABLE `brewline-dev.staging.everything` AS SELECT * FROM `brewline-dev.staging.%s`" % truth)
                text = sql
            else:
                text = sql.replace('staging.batch', 'staging.' + batch)
            wh.run(text)
            steps.append({'step': label, 'rows': wh.scalar("SELECT COUNT(*) FROM `brewline-dev.curated.orders_t`"), 'expected': wh.scalar("SELECT COUNT(*) FROM `brewline-dev.staging.%s`" % truth),
                          'wrong': wrong_rows(wh, truth)})
        step('first run', 'batch', 'truth1')
        step('the same batch again', 'batch', 'truth1')
        step('corrected batch', 'batch2', 'truth2')
        out.append({'method': name, 'steps': steps})
    return world, out


if __name__ == '__main__':
    print(run_methods())
