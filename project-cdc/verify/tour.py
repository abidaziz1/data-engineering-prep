"""The history of the silver table, as JSON: [version, operation, inserted, updated]. Run with CDC_HOME set, from the folder of the project."""
import json
import sys

sys.path.insert(0, '.')
from delta.tables import DeltaTable        # noqa: E402

from cdc import config                     # noqa: E402
from cdc.spark import session              # noqa: E402

spark = session('tour', packages=False)
rows = []
for h in DeltaTable.forPath(spark, config.SILVER).history().orderBy('version').collect():
    m = h['operationMetrics'] or {}
    merge = h['operation'] == 'MERGE'
    rows.append([h['version'], h['operation'], int(m.get('numTargetRowsInserted', 0)) if merge else 0, int(m.get('numTargetRowsUpdated', 0)) if merge else 0])
print(json.dumps(rows))
