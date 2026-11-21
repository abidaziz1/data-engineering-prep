"""A look at what Delta Lake keeps.

The history of the silver table, the table as it was at an earlier version, and the
quarantine by reason. Run it after a few days of the pipeline.

Run:   python -m lakehouse.tour
"""

from delta.tables import DeltaTable

from . import config
from .spark import session


def read(spark, path, **options):
    return spark.read.format('delta').options(**options).load(path)


def tour(spark):
    out = ['history of silver:']
    history = DeltaTable.forPath(spark, config.SILVER).history().orderBy('version').collect()
    for h in history:
        m = h['operationMetrics'] or {}
        extra = ''
        if h['operation'] == 'MERGE':
            extra = ', inserted %s, updated %s' % (
                m.get('numTargetRowsInserted', '0'),
                m.get('numTargetRowsUpdated', '0'),
            )
        out.append('  version %d  %s%s' % (h['version'], h['operation'], extra))
    out += ['', 'silver as it was at each version:']
    for h in history:
        old = read(spark, config.SILVER, versionAsOf=h['version'])
        status = old.where('order_id = 5').select('status').collect()
        order5 = status[0][0] if status else 'not there yet'
        out.append('  version %d: %d orders, order 5 is %s' % (h['version'], old.count(), order5))
    out += ['', 'quarantine by reason:']
    by_reason = read(spark, config.QUARANTINE).groupBy('reason').count().orderBy('reason')
    for r in by_reason.collect():
        out.append('  %-14s %d' % (r['reason'], r['count']))
    gold = read(spark, config.GOLD)
    days = gold.select('order_date').distinct().count()
    stores = gold.select('store_id').distinct().count()
    out += ['', 'gold: %d rows, %d days, %d stores' % (gold.count(), days, stores)]
    return out


if __name__ == '__main__':
    print('\n'.join(tour(session())))
