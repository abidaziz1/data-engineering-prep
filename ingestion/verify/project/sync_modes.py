"""The same 20 users, synced twice in four ways with PyAirbyte: what each sync read, and what the destination holds."""
import contextlib
import io
import os
import tempfile

import airbyte as ab
import sqlalchemy

CASES = [('full refresh, replace', 'replace', True, True), ('full refresh, append', 'append', True, True), ('full refresh, merge', 'merge', True, True),
         ('incremental, a cursor that always moves', 'append', False, True), ('incremental, a cursor that tells the truth', 'append', False, False)]
work = tempfile.mkdtemp()
quiet = io.StringIO()                                                      # PyAirbyte prints a progress report for every sync
print('%-44s %-14s %-13s %s' % ('case', 'sync 1, 2 read', 'rows after', 'distinct ids'))
for k, (label, strategy, full, moves) in enumerate(CASES):
    source = ab.get_source('source-faker', config={'count': 20, 'seed': 1, 'always_updated': moves}, pip_url='airbyte-source-faker', install_if_missing=True, streams=['users'])
    cache = ab.new_local_cache('case%d' % k, cache_dir=os.path.join(work, 'c%d' % k))
    read, rows = [], []
    for _ in range(2):
        with contextlib.redirect_stdout(quiet), contextlib.redirect_stderr(quiet):
            result = source.read(cache=cache, write_strategy=strategy, force_full_refresh=full)
        read.append(result.processed_records)
        rows.append(len(list(cache['users'])))
    ids = len({r['id'] for r in cache['users']})
    print('%-44s %-14s %-13s %d' % (label, ', '.join(map(str, read)), ', '.join(map(str, rows)), ids))
engine = cache.get_sql_engine()
columns = [c['name'] for c in sqlalchemy.inspect(engine).get_columns('users', schema=cache.schema_name)]
print()
print('columns that PyAirbyte adds to users:', ', '.join(c for c in columns if c.startswith('_airbyte')))
print('the other %d columns come from the source' % sum(1 for c in columns if not c.startswith('_airbyte')))
