#!/usr/bin/env python3
"""Record what a real MongoDB does, for the MongoDB course.

A mongod 8.0 runs in a Docker container (image mongo:8.0, host network, a one-member replica set) and the programs of mongodb/verify/project run against it with pymongo, as they are on disk:
the shape of documents, the aggregation pipeline, indexes and explain on 20,000 orders, schema validation, idempotent writes, a transaction, and a change stream with a resume.
Everything is made-up Brewline data built from fixed rules. Nothing is timed, and the container is removed at the end.

Not recorded: a sharded cluster, Atlas, mongosh, other drivers, Atlas Search, time series collections, and a Kafka connector. The lessons say which is which.

Usage:   python3 mongodb/verify/capture_mongodb.py [--out mongodb/js/real.js]      (run with an interpreter that has pymongo)
Needs:   Docker with the image mongo:8.0 (Docker Hub), and pymongo.
"""
import argparse
import re
import sys

import pathlib

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.dont_write_bytecode = True
import mongolib                                         # noqa: E402
from mongolib import R, T, PROJECT                      # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--out', default=str(HERE.parent / 'js' / 'real.js'))
args = ap.parse_args()

for f in sorted(PROJECT.rglob('*.py')):
    R['files'][str(f.relative_to(PROJECT))] = f.read_text()

uri = mongolib.start_server()
try:
    import pymongo
    c = pymongo.MongoClient(uri)
    info = c.server_info()
    R['meta'].update({'mongod': info['version'], 'pymongo': pymongo.version, 'image': mongolib.IMAGE, 'recorded_on': __import__('datetime').date.today().isoformat(),
                      'note': 'Recorded by mongodb/verify/capture_mongodb.py on a real mongod in a Docker container (a one-member replica set). A sharded cluster and Atlas were not used.'})
    T('tool.versions', 'mongod --version (the image %s)\nMongoDB %s\n\nthe driver: pymongo %s' % (mongolib.IMAGE, info['version'], pymongo.version))

    def run(name, key, cmd):
        rc, out = mongolib.program(name, uri)
        assert rc == 0, '%s failed: %s' % (name, out[-600:])
        T(key, cmd + '\n' + out)
        return out

    out = run('load.py', 'load.run', 'python load.py')
    R['counts']['load'] = {'orders': int(re.search(r'orders: (\d+)', out).group(1)), 'stores': int(re.search(r'stores: (\d+)', out).group(1))}

    out = run('shapes.py', 'shapes.run', 'python shapes.py')
    L = out.split('\n')
    R['counts']['shapes'] = {'null_matches': L[0].split(': ', 1)[1], 'missing_matches': L[1].split(': ', 1)[1], 'number_matches': L[2].split(': ', 1)[1], 'string_matches': L[3].split(': ', 1)[1], 'sorted': L[4].split(': ', 1)[1],
                             'duplicate_code': int(re.search(r'code (\d+)', L[5]).group(1)), 'too_large_bytes': int(re.search(r'\((\d+) bytes\)', L[6]).group(1)),
                             'server_limit_bytes': int(re.search(r'up to (\d+) bytes', L[6]).group(1)), 'max_bson': int(re.search(r': (\d+) bytes', L[7]).group(1))}

    out = run('pipelines.py', 'pipelines.run', 'python pipelines.py')
    stages = [(m.group(1), m.group(2), int(m.group(3))) for m in re.finditer(r'after stage (\d) (\S+) -> (\d+) documents', out)]
    R['counts']['pipeline'] = {'stage_counts': [s[2] for s in stages], 'stage_names': [s[1] for s in stages]}
    R['tables']['pipeline.sku'] = {'cols': ['sku', 'units', 'revenue'], 'rows': [[m.group(1), int(m.group(2)), int(m.group(3))] for m in re.finditer(r'sku (\S+) units (\d+) revenue (\d+)', out)]}
    R['tables']['pipeline.store'] = {'cols': ['store', 'orders', 'revenue'], 'rows': [[int(m.group(1)), int(m.group(2)), int(m.group(3))] for m in re.finditer(r'store (\d+) orders (\d+) revenue (\d+)', out)]}
    R['tables']['pipeline.region'] = {'cols': ['region', 'orders', 'revenue'], 'rows': [[m.group(1), int(m.group(2)), int(m.group(3))] for m in re.finditer(r'region (\S+) orders (\d+) revenue (\d+)', out)]}

    out = run('indexes.py', 'indexes.run', 'python indexes.py')
    cases = [[m.group(1), m.group(2), m.group(3), int(m.group(4)), int(m.group(5)), int(m.group(6))] for m in re.finditer(r'^(\d) ([^:]+): ([A-Z_ >]+), keys (\d+), documents (\d+), returned (\d+)$', out, re.M)]
    cases = [[c_[0], c_[1], c_[2], c_[3], c_[4], c_[5]] for c_ in cases]
    R['tables']['index.cases'] = {'cols': ['case', 'what', 'plan', 'keys', 'documents', 'returned'], 'rows': cases}

    out = run('design.py', 'design.run', 'python design.py')
    val = [[m.group(1), m.group(2), int(m.group(3))] for m in re.finditer(r'^([^:\n]+): (inserted|rejected), code (\d+)|^([^:\n]+): (inserted)$', out, re.M) if m.group(1)]
    val = []
    for line in out.split('\n'):
        m = re.match(r'^([a-z A-Z]+): (inserted|rejected, code (\d+) \((.*)\))$', line)
        if m and not line.startswith(('first run', 'second run')):
            val.append([m.group(1), 'inserted' if m.group(2) == 'inserted' else 'code %s' % m.group(3), m.group(4) or ''])
    R['tables']['design.validation'] = {'cols': ['case', 'result', 'message'], 'rows': val}
    up1 = re.search(r'first run of the upsert: upserted (\d+), matched (\d+), modified (\d+)', out)
    up2 = re.search(r'second run of the upsert: upserted (\d+), matched (\d+), modified (\d+)', out)
    tx = re.search(r'inside the transaction: (\d+), seen from outside: (\d+)', out)
    R['counts']['design'] = {'payments_held': int(re.search(r'payments held: (\d+)', out).group(1)), 'upsert_first': [int(x) for x in up1.groups()], 'upsert_second': [int(x) for x in up2.groups()],
                             'plain_insert_error_code': int(re.search(r'again: (\d+) error, code (\d+)', out).group(2)), 'daily': int(re.search(r'daily holds (\d+)', out).group(1)),
                             'inside': int(tx.group(1)), 'outside': int(tx.group(2)), 'after_abort': int(re.search(r'after abort: (\d+)', out).group(1)), 'after_commit': int(re.search(r'after commit: (\d+)', out).group(1))}

    out = run('challenge.py', 'challenge.run', 'python challenge.py')
    R['tables']['challenge.top'] = {'cols': ['store', 'orders', 'revenue', 'average'], 'rows': [[int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4))] for m in re.finditer(r'store (\d+) orders (\d+) revenue (\d+) average (\d+)', out)]}

    out = run('streams.py', 'streams.run', 'python streams.py')
    ev = [l.split(': ', 1)[1] for l in out.split('\n') if l.startswith('event: ')]
    R['counts']['streams'] = {'events': ev, 'fields': re.search(r'fields of an event: (.*)', out).group(1), 'first_stream': re.search(r'first stream saw: (.*)', out).group(1),
                              'resumed': [l.split(': ', 1)[1] for l in out.split('\n') if l.startswith('resumed from the token: ')]}
finally:
    mongolib.stop_server()

mongolib.write_real(args.out)
print('wrote %s: %d files, %d texts, %d tables, %d sets of counts' % (args.out, len(R['files']), len(R['text']), len(R['tables']), len(R['counts'])))
