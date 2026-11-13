"""Mission 4: iterators and generators, with real peaks of memory and traces of the pull order."""
import json
import pathlib

from brewline import write_csv

BENCH = pathlib.Path(__file__).resolve().parent.parent / 'bench'
SIZES = [50_000, 100_000, 200_000, 400_000, 800_000]


def pipeline_setup(cwd):
    write_csv(pathlib.Path(cwd) / 'orders.csv', 200_000)


def record(rec, work, cache):
    for name in ('generator_basics', 'pull_trace', 'itertools_tools', 'generator_close', 'flatten_json', 'sessionize'):
        rec.lesson('m4/%s.py' % name)
    rec.lesson('m4/pipeline.py', setup=pipeline_setup, args=['orders.csv'])

    d = work / 'm4'
    d.mkdir(exist_ok=True)
    out = {'sizes': SIZES, 'list': [], 'generator': [], 'file_bytes': []}
    for n in SIZES:
        path = d / ('orders_%d.csv' % n)
        write_csv(path, n)
        out['file_bytes'].append(path.stat().st_size)
        for mode in ('list', 'generator'):
            rc, text, _ = rec.run([rec.py, str(BENCH / 'genmem.py'), mode, str(path)], d, timeout=300)
            r = json.loads(text.strip().splitlines()[-1])
            assert r['rows'] == n, r
            out[mode].append({'peak_bytes': r['peak_bytes'], 'paid_cents': r['paid_cents']})
        assert out['list'][-1]['paid_cents'] == out['generator'][-1]['paid_cents'], 'both ways must give the same total'
        path.unlink()
    out['note'] = 'peak bytes of Python memory (tracemalloc) while adding up the paid orders of a CSV file; both ways give the same total'
    rec.counts('m4.genmem', out)
