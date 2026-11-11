"""Run one section against the cluster that dev_up.py started, and print what it recorded. For working on the recorder. Usage: dev_section.py world.record_world [more.sections]"""
import importlib
import json
import os
import sys
import pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import cluster as C
from recorder import Rec

if __name__ == '__main__':
    c = C.Cluster.attach(os.environ.get('KAFKA_DEV_WORK', '/tmp/kafka-dev'))
    rec = Rec()
    for spec in sys.argv[1:]:
        mod, fn = spec.split('.')
        getattr(importlib.import_module(mod), fn)(c, rec)
    sys.stdout.flush()
    for kind in ('counts', 'text', 'tables'):
        for k, v in rec.out[kind].items():
            print('=== %s:%s' % (kind, k))
            if kind == 'tables':
                print(' | '.join(map(str, v['cols'])))
                for r in v['rows']:
                    print(' | '.join(map(str, r)))
            else:
                print(v if isinstance(v, str) else json.dumps(v))
