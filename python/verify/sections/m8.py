"""Mission 8: APIs and databases. The API is a fake one that runs in a thread on this machine (support/brewline_api.py)."""
import contextlib
import importlib.util
import io
import pathlib
import re
import shutil
import sys

HERE = pathlib.Path(__file__).resolve().parent.parent
LESSONS = HERE / 'lessons' / 'm8'
SUPPORT = HERE / 'support'


def load_module(name):
    sys.path.insert(0, str(SUPPORT))
    spec = importlib.util.spec_from_file_location('lesson_' + name, LESSONS / (name + '.py'))
    mod = importlib.util.module_from_spec(spec)
    with contextlib.redirect_stdout(io.StringIO()):
        spec.loader.exec_module(mod)
    return mod


def paging(rec):
    mod = load_module('paginate')
    cases = []
    for style, fetch in (('offset', mod.fetch_offset), ('cursor', mod.fetch_cursor)):
        for scenario in ('none', 'insert', 'delete'):
            sid = 'lab-%s-%s' % (style, scenario)
            before = mod.ids(sid)
            got = fetch(sid, scenario)
            after = mod.ids(sid)
            stayed = set(before) & set(after)
            repeated = sorted({i for i in got if got.count(i) > 1})
            cases.append({'style': style, 'scenario': scenario, 'pages': [got[i:i + 5] for i in range(0, len(got), 5)], 'rows': len(got), 'unique': len(set(got)),
                          'repeated': repeated, 'missed': sorted(stayed - set(got)), 'new': sorted(set(got) - set(before)), 'cancelled': sorted(set(before) - set(after)),
                          'before': len(before), 'after': len(after)})
    rec.counts('m8.paging', {'per_page': 5, 'cases': cases, 'note': 'every case is a run of the functions in lessons/m8/paginate.py against the fake API (support/brewline_api.py): the first page is read, then the data changes, then the rest is read'})


def batch(rec, text):
    rows = {}
    for line in text.split('\n'):
        m = re.match(r'^(.+?)\s{2,}([\d.]+)\s+([\d,]+)$', line)
        if m:
            rows[m.group(1)] = {'seconds': float(m.group(2)), 'rows_per_second': int(m.group(3).replace(',', ''))}
    rec.counts('m8.batch', {'rows': 5000, 'methods': rows, 'note': 'median of 3 runs for each method, SQLite in a file in a temporary folder, on this machine. Parsed from the recorded output of lessons/m8/batch_insert.py.'})


def record(rec, work, cache):
    api = lambda cwd: shutil.copy(SUPPORT / 'brewline_api.py', cwd)
    for name in ('api_basics', 'paginate', 'rate_limit', 'fetch_all'):
        rec.lesson('m8/%s.py' % name, setup=api)
    for name in ('sql_params', 'transactions', 'sqlalchemy_core', 'upsert_batches', 'batch_insert'):
        rec.lesson('m8/%s.py' % name)
    paging(rec)
    batch(rec, rec.data['text']['m8/batch_insert.py'])
