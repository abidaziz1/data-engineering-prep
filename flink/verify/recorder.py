"""The place where the experiments put what they found. capture_flink.py gives every section one of these, and writes the result to flink/js/real.js."""
import json


class Rec:
    def __init__(self):
        self.out = {'files': {}, 'text': {}, 'tables': {}, 'counts': {}}

    def text(self, key, s):
        self.out['text'][key] = s

    def file(self, key, s):
        self.out['files'][key] = s

    def counts(self, key, d):
        self.out['counts'][key] = json.loads(json.dumps(d))   # plain JSON types only

    def table(self, key, cols, rows):
        self.out['tables'][key] = {'cols': cols, 'rows': json.loads(json.dumps([list(r) for r in rows]))}


def show(rec):
    """Print what was recorded, for working on a section."""
    for kind in ('counts', 'text', 'tables'):
        for k, v in rec.out[kind].items():
            print('=== %s:%s' % (kind, k))
            if kind == 'tables':
                print(' | '.join(map(str, v['cols'])))
                for r in v['rows']:
                    print(' | '.join(map(str, r)))
            else:
                print(v if isinstance(v, str) else json.dumps(v))
