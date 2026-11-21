"""What Airbyte does with a connector. A connector is a program that is called with spec, check, discover or read, and prints one JSON message for each line."""
import json
import os
import subprocess
import tempfile

CONNECTOR = os.path.abspath(os.path.join('.venv-source-faker', 'bin', 'source-faker'))
work = tempfile.mkdtemp()
KEEP = {'SPEC', 'CONNECTION_STATUS', 'CATALOG', 'RECORD', 'STATE'}            # LOG and TRACE messages are not shown


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
spec = of(call('spec'), 'SPEC')[0]['spec']['connectionSpecification']
print('spec: the connector asks for', ', '.join('%s (%s)' % (k, v['type']) for k, v in spec['properties'].items()))
print('check, count 20:', of(call('check', '--config', config), 'CONNECTION_STATUS')[0]['connectionStatus']['status'])
bad = of(call('check', '--config', save('bad.json', {'count': -5})), 'CONNECTION_STATUS')[0]['connectionStatus']
print('check, count -5: %s, %s' % (bad['status'], bad['message']))
catalog = of(call('discover', '--config', config), 'CATALOG')[0]['catalog']
for s in sorted(catalog['streams'], key=lambda s: s['name']):
    print('discover: %-9s %2d fields, sync modes %s, cursor %s, primary key %s' % (s['name'], len(s['json_schema']['properties']), ' and '.join(s['supported_sync_modes']), s['default_cursor_field'][0], s['source_defined_primary_key'][0][0]))


def configured(mode, destination):
    return save('catalog-%s.json' % mode, {'streams': [{'stream': s, 'sync_mode': mode, 'destination_sync_mode': destination} for s in catalog['streams'] if s['name'] == 'users']})


full = call('read', '--config', config, '--catalog', configured('full_refresh', 'overwrite'))
print('read users, full_refresh: %d RECORD messages, %d STATE messages' % (len(of(full, 'RECORD')), len(of(full, 'STATE'))))
first = of(full, 'RECORD')[0]['record']
print('a RECORD has the keys', ', '.join(first), 'and the fields of the row are in data (id %s, %d fields)' % (first['data']['id'], len(first['data'])))
inc = call('read', '--config', config, '--catalog', configured('incremental', 'append'))
print('read users, incremental: %d RECORD messages, %d STATE messages' % (len(of(inc, 'RECORD')), len(of(inc, 'STATE'))))
state = of(inc, 'STATE')[-1]
shown = json.loads(json.dumps(state['state']))
shown['stream']['stream_state']['updated_at'] = '<time of the run>'
print('the last STATE message:', json.dumps(shown['stream']))
again = call('read', '--config', config, '--catalog', configured('incremental', 'append'), '--state', save('state.json', [state]))
print('read again with that state: %d RECORD messages' % len(of(again, 'RECORD')))
