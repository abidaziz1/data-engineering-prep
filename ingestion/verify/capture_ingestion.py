#!/usr/bin/env python3
"""Record what real ingestion tools do, for the ingestion course.

The programs of ingestion/verify/project run as they are on disk, on made-up Brewline data built from fixed rules:
  dlt (an open-source Python library) loads the orders of a pretend shop API into DuckDB: a first load, seven ways to load, schema drift under five contracts, state, a window of old data, and the coding round.
  The Faker connector of Airbyte (airbyte-source-faker) is called the way Airbyte calls any connector (spec, check, discover, read, with a state), and PyAirbyte syncs it four ways into a local cache.
Nothing is timed, and nothing needs an account, a network service or a server. The network is used only to install the packages from PyPI.

Not recorded: Fivetran (a closed service that needs an account), the Airbyte platform and its connection UI, a CDC tool such as Debezium (the Kafka course records one), Meltano and Singer taps,
other destinations than DuckDB, rate limits and retries of a real API. The lessons say which is which.

Usage:   DLT_PY=<python with dlt> AIRBYTE_PY=<python with PyAirbyte> python3 ingestion/verify/capture_ingestion.py [--out ingestion/js/real.js]
Needs:   dlt[duckdb] and airbyte (PyPI). See ingestion/verify/requirements.txt.
"""
import argparse
import datetime
import importlib.metadata
import re
import sys
import tempfile

import pathlib

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.dont_write_bytecode = True
import inglib                                           # noqa: E402
from inglib import R, T, PROJECT, program               # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--out', default=str(HERE.parent / 'js' / 'real.js'))
args = ap.parse_args()
if not inglib.AIRBYTE_PY:
    raise SystemExit('AIRBYTE_PY is not set: point it at an interpreter that has PyAirbyte (pip install airbyte, on Python 3.11 or 3.12)')

for f in sorted(PROJECT.rglob('*.py')):
    R['files'][str(f.relative_to(PROJECT))] = f.read_text()


def versions(py, names):
    r = inglib.sh([py, '-c', 'import importlib.metadata as m; print(",".join(m.version(n) for n in %r))' % (names,)])
    return r.stdout.strip().split(',')


dlt_v, duck_v = versions(inglib.DLT_PY, ['dlt', 'duckdb'])
ab_v, = versions(inglib.AIRBYTE_PY, ['airbyte'])
py_v = lambda py: inglib.sh([py, '-c', 'import platform; print(platform.python_version())']).stdout.strip()   # noqa: E731
R['meta'].update({'dlt': dlt_v, 'duckdb': duck_v, 'airbyte': ab_v, 'python_dlt': py_v(inglib.DLT_PY), 'python_airbyte': py_v(inglib.AIRBYTE_PY), 'connector': 'airbyte-source-faker',
                  'recorded_on': datetime.date.today().isoformat(),
                  'note': 'Recorded by ingestion/verify/capture_ingestion.py: dlt on DuckDB, and the Airbyte Faker connector through PyAirbyte. Fivetran, the Airbyte platform and CDC tools were not run.'})


def run(name, key, py=None, cwd=None):
    rc, out = program(name, py, cwd)
    assert rc == 0, '%s failed: %s' % (name, out[-900:])
    T(key, 'python ' + name + '\n' + out)
    return out


def num(s):
    return int(s.replace(',', ''))


out = run('first_load.py', 'first.run')
R['counts']['first'] = {'orders': num(re.search(r'orders written by the run: (\d+)', out).group(1)), 'lines': num(re.search(r'orders__lines: (\d+) rows', out).group(1)),
                        'tables': re.search(r'tables in the dataset shop: (.*)', out).group(1).split(', '),
                        'columns': [m.group(1) for m in re.finditer(r'^  (\S+)\s+[A-Z]', out, re.M)]}

out = run('strategies.py', 'strategies.run')
rows = []
for line in out.split('\n'):
    m = re.match(r'^(.+?)\s{2,}((?:\d+(?:, )?)+)\s+(\d+)\s+(\d+)\s+(\d+)$', line)
    if m and not line.startswith('case'):
        rows.append([m.group(1), m.group(2), int(m.group(3)), int(m.group(4)), int(m.group(5))])
assert len(rows) == 7, rows
R['tables']['strategies.cases'] = {'cols': ['case', 'runs wrote', 'in the end', 'distinct orders', 'the shop holds'], 'rows': rows}
R['counts']['strategies'] = {'order11_in_destination': 'still in the destination, True' in out, 'order12_destination': re.search(r'the destination says (\w+)', out).group(1),
                             'shipped_destination': int(re.search(r'in the destination: (\d+) of (\d+) in the shop', out).group(1)), 'shipped_shop': int(re.search(r'in the destination: (\d+) of (\d+) in the shop', out).group(2))}

out = run('drift.py', 'drift.run')
drift = []
for line in out.split('\n'):
    m = re.match(r'^(.+?) \| (loaded \d+|failed) \| in the destination: (\d+) \| new columns: ([^|]+?)(?: \| (.*))?$', line)
    if m:
        drift.append([m.group(1), m.group(2), int(m.group(3)), m.group(4), m.group(5) or ''])
assert len(drift) == 5, drift
R['tables']['drift.modes'] = {'cols': ['contract', 'result', 'in the destination', 'new columns', 'error'], 'rows': drift}
R['counts']['drift'] = {'order%s' % m.group(1): m.group(2) for m in re.finditer(r'order (\d+) under evolve: (.*)', out)}
R['counts']['drift']['versions'] = int(re.search(r'schema versions kept by dlt: (\d+)', out).group(1))

out = run('boundary.py', 'boundary.run')
bd = []
for line in out.split('\n'):
    m = re.match(r'^(.+?)\s{2,}((?:\d+(?:, )?)+)\s+(\d+)\s+(.+)$', line)
    if m and not line.startswith(('case', 'python')):
        bd.append([m.group(1), m.group(2), int(m.group(3)), m.group(4)])
assert len(bd) == 4, bd
R['tables']['boundary.cases'] = {'cols': ['case', 'runs wrote', 'in the end', 'order 12 in the destination'], 'rows': bd}

out = run('state.py', 'state.run')
R['counts']['state'] = {'last_value': re.search(r'last_value = (\S+)', out).group(1), 'remembered': int(re.search(r'that dlt remembers: (\d+)', out).group(1)), 'loads': int(re.search(r'recorded in the destination: (\d+)', out).group(1)),
                        'fresh_wrote': int(re.search(r'day 2 again: wrote (\d+)', out).group(1)),
                        'window': {m.group(1): [[int(x) for x in m.group(2).split(', ')], int(m.group(3)), int(m.group(4))] for m in re.finditer(r'loaded twice with (\w+): wrote ([\d, ]+), (\d+) rows, (\d+) distinct', out)}}

out = run('challenge.py', 'challenge.run')
R['tables']['challenge.days'] = {'cols': ['day', 'wrote', 'rows', 'distinct orders'], 'rows': [[int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4))] for m in re.finditer(r'day (\d): wrote (\d+), destination holds (\d+) rows \((\d+) distinct orders\)', out)]}

work = tempfile.mkdtemp(prefix='ing-airbyte-')           # PyAirbyte installs the connector into .venv-source-faker of the working folder, and protocol.py calls it from there
out = run('sync_modes.py', 'sync.run', inglib.AIRBYTE_PY, work)
sync = []
for line in out.split('\n'):
    m = re.match(r'^(.+?)\s{2,}(\d+, \d+)\s+(\d+, \d+)\s+(\d+)$', line)
    if m and not line.startswith('case'):
        sync.append([m.group(1), m.group(2), m.group(3), int(m.group(4))])
assert len(sync) == 5, sync
R['tables']['sync.cases'] = {'cols': ['case', 'sync 1, 2 read', 'rows after', 'distinct ids'], 'rows': sync}
R['counts']['sync'] = {'added': re.search(r'adds to users: (.*)', out).group(1).split(', '), 'source_columns': int(re.search(r'the other (\d+) columns', out).group(1))}

out = run('protocol.py', 'protocol.run', inglib.AIRBYTE_PY, work)
R['counts']['protocol'] = {'spec': re.search(r'asks for (.*)', out).group(1), 'check_ok': re.search(r'check, count 20: (\w+)', out).group(1), 'check_bad': re.search(r'check, count -5: (.*)', out).group(1),
                           'streams': [[m.group(1), int(m.group(2)), m.group(3), m.group(4), m.group(5)] for m in re.finditer(r'discover: (\S+)\s+(\d+) fields, sync modes (.*?), cursor (\S+), primary key (\S+)', out)],
                           'full': [int(x) for x in re.search(r'full_refresh: (\d+) RECORD messages, (\d+) STATE', out).groups()], 'inc': [int(x) for x in re.search(r'incremental: (\d+) RECORD messages, (\d+) STATE', out).groups()],
                           'again': int(re.search(r'read again with that state: (\d+) RECORD', out).group(1)), 'state': re.search(r'the last STATE message: (.*)', out).group(1),
                           'record_keys': re.search(r'has the keys (.*?) and the fields', out).group(1), 'fields': int(re.search(r'\((?:id \d+, )?(\d+) fields\)', out).group(1))}

T('tool.versions', 'dlt %s with DuckDB %s on Python %s\nPyAirbyte %s on Python %s, with the connector %s (installed from PyPI)' % (dlt_v, duck_v, R['meta']['python_dlt'], ab_v, R['meta']['python_airbyte'], R['meta']['connector']))
inglib.write_real(args.out)
print('wrote %s: %d files, %d texts, %d tables, %d sets of counts' % (args.out, len(R['files']), len(R['text']), len(R['tables']), len(R['counts'])))
