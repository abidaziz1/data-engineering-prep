#!/usr/bin/env python3
"""Runs the bug hunts of the ingestion course that use the Airbyte connector, each snippet next to its fix, and prints the results as JSON.
Called by verify_ingestion.py with the interpreter that has PyAirbyte, from a folder where it may install the connector:   python hunts_airbyte.py hunts.json
The snippets come from the lessons (dump_ingestion.js)."""
import contextlib
import io
import json
import os
import subprocess
import sys
import tempfile

import airbyte as ab

H = json.load(open(sys.argv[1]))
OUT = {}
quiet = io.StringIO()
work = tempfile.mkdtemp()


def sync_hunt(kind):
    """m4-bug: two syncs of 20 users with the strategy of the snippet. Returns the rows that the cache holds."""
    source = ab.get_source('source-faker', config={'count': 20, 'seed': 1, 'always_updated': True}, pip_url='airbyte-source-faker', install_if_missing=True, streams=['users'])
    cache = ab.new_local_cache('hunt' + kind, cache_dir=os.path.join(work, kind))
    for _ in range(2):
        ns = {'source': source, 'cache': cache}
        with contextlib.redirect_stdout(quiet), contextlib.redirect_stderr(quiet):
            exec(H['m4-bug'][kind], ns)         # noqa: S102 - the snippet of the course, on a throwaway cache
    return {'rows': len(list(cache['users'])), 'distinct': len({r['id'] for r in cache['users']})}


OUT['m4-bug'] = {k: sync_hunt(k) for k in ('code', 'fix')}

CONNECTOR = os.path.abspath(os.path.join('.venv-source-faker', 'bin', 'source-faker'))
KEEP = {'SPEC', 'CONNECTION_STATUS', 'CATALOG', 'RECORD', 'STATE'}


def save(name, obj):
    path = os.path.join(work, name)
    with open(path, 'w') as f:
        json.dump(obj, f)
    return path


def call(*args):
    done = subprocess.run([CONNECTOR, *args], capture_output=True, text=True, cwd=work)
    return [m for m in (json.loads(line) for line in done.stdout.splitlines() if line.startswith('{')) if m['type'] in KEEP]


def of(messages, kind):
    return [m for m in messages if m['type'] == kind]


config = save('config.json', {'count': 20, 'seed': 1, 'records_per_slice': 10, 'parallelism': 1, 'always_updated': False})
catalog = of(call('discover', '--config', config), 'CATALOG')[0]['catalog']


def configured(mode, destination):
    return save('catalog-%s.json' % mode, {'streams': [{'stream': s, 'sync_mode': mode, 'destination_sync_mode': destination} for s in catalog['streams'] if s['name'] == 'users']})


last_state = of(call('read', '--config', config, '--catalog', configured('incremental', 'append')), 'STATE')[-1]


def state_hunt(kind):
    buf = io.StringIO()
    ns = {'save': save, 'last_state': last_state, 'call': call, 'config': config, 'configured': configured, 'of': of}
    with contextlib.redirect_stdout(buf):
        exec(H['m4-bug2'][kind], ns)            # noqa: S102
    return {'printed': buf.getvalue().strip()}


OUT['m4-bug2'] = {k: state_hunt(k) for k in ('code', 'fix')}
print(json.dumps(OUT))
