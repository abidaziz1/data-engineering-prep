"""Mission 3: data structures and what they cost."""
import json
import pathlib

BENCH = pathlib.Path(__file__).resolve().parent.parent / 'bench'

KINDS = [
    ('list_of_dicts', 'a list of dicts'),
    ('list_of_tuples', 'a list of tuples'),
    ('list_of_namedtuples', 'a list of named tuples'),
    ('list_of_dataclasses', 'a list of dataclass objects'),
    ('list_of_slots_dataclasses', 'a list of dataclass objects with slots'),
    ('dict_of_lists', 'a dict of lists (one list per column)'),
    ('pandas_default', 'a pandas DataFrame, default types'),
    ('pandas_typed', 'a pandas DataFrame, with category and small integers'),
    ('pyarrow_table', 'a pyarrow Table'),
    ('polars_frame', 'a Polars DataFrame'),
]
N = 200_000


def record(rec, work, cache):
    for name in ('membership_counts', 'hashing', 'mutable_default', 'copying', 'group_count', 'sizes', 'latest_per_key', 'top_k_per_group'):
        rec.lesson('m3/%s.py' % name)

    rows = []
    for kind, label in KINDS:
        rc, out, _ = rec.run([rec.py, str(BENCH / 'structs.py'), kind, str(N)], work)
        d = json.loads(out.strip().splitlines()[-1])
        rows.append([label, d['bytes'], d['per_record'], d['method']])
    rec.table('m3.structs', ['structure', 'bytes', 'bytes per record', 'measured with'], rows)
    rec.counts('m3.structs.meta', {'records': N, 'fields': ['order_id', 'customer_id', 'store', 'status', 'total_cents', 'items']})

    rc, out, _ = rec.run([rec.py, str(BENCH / 'lookup.py')], work, timeout=300)
    d = json.loads(out.strip().splitlines()[-1])
    d['runs'] = 5
    d['note'] = 'microseconds per membership test, median of 5 runs, on this machine'
    rec.counts('m3.lookup', d)

    # the ids of an order table held in a set, to size a de-duplication job
    ids = {}
    for kind in ('set_of_ids', 'list_of_ids'):
        ids[kind] = []
        for n in (1_000_000, 4_000_000):
            rc, out, _ = rec.run([rec.py, str(BENCH / 'structs.py'), kind, str(n)], work, timeout=300)
            d = json.loads(out.strip().splitlines()[-1])
            ids[kind].append({'n': n, 'bytes': d['bytes'], 'per_id': d['per_record']})
    rec.counts('m3.idset', {'ids': 'strings like O-00000001', 'measured_with': 'tracemalloc', **ids})
