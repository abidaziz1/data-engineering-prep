#!/usr/bin/env python3
"""Runs the bug hunts of the ingestion course that use dlt and DuckDB, each snippet next to its fix, and prints the results as JSON.
Called by verify_ingestion.py with the interpreter that has dlt:   python hunts_dlt.py hunts.json
The snippets come from the lessons (dump_ingestion.js), and they run as they are, in a namespace that has what the lesson takes for granted: dlt, source, START, day and a pipeline."""
import json
import os
import sys
import tempfile
import types

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'project'))
sys.dont_write_bytecode = True
import dlt                          # noqa: E402
import shop_pipeline as sp          # noqa: E402
import source                       # noqa: E402

H = json.load(open(sys.argv[1]))
OUT = {}


_COUNT = [0]


def run_snippet(text, extra):
    """Runs a snippet as a module of its own: dlt reads the module of a decorated function, so a plain dictionary is not enough."""
    _COUNT[0] += 1
    mod = types.ModuleType('snippet_%d' % _COUNT[0])
    mod.__dict__.update({'dlt': dlt, 'source': source, 'START': sp.START})
    mod.__dict__.update(extra)
    sys.modules[mod.__name__] = mod
    exec(compile(text, mod.__name__, 'exec'), mod.__dict__)        # noqa: S102 - the snippets of the course, run on a throwaway database
    return mod.__dict__


def count(work, name):
    return list(sp.totals(work, name))


def sql_hunt(hid, build):
    """The SQL snippets run on a destination that the course's own loads built."""
    work, name = build()
    res = {}
    for kind in ('code', 'fix'):
        res[kind] = sp.query(work, name, H[hid][kind])
    OUT[hid] = res


def first_load():
    work = tempfile.mkdtemp()
    p = sp.make_pipeline('hunt', work)
    sp.run(p, sp.orders_resource('append', [1]))
    return work, 'hunt'


def drift_load():
    work = tempfile.mkdtemp()
    day = [1]
    p = sp.make_pipeline('hunt', work)
    r = sp.orders_resource('merge', day, True)
    for d in (1, 2, 3):
        day[0] = d
        sp.run(p, r)
    return work, 'hunt'


sql_hunt('m1-bug', first_load)
sql_hunt('m3-bug', drift_load)


def run_resource(kind, hid, days, fresh=True):
    """Executes the snippet, which defines `orders` (or `window`), and runs it once for each day. Returns the table totals and what each run wrote."""
    work = tempfile.mkdtemp()
    day = [1]
    ns = run_snippet(H[hid][kind], {'day': day})
    res = ns.get('orders') or ns.get('window')
    p = sp.make_pipeline('hunt', work)
    wrote = []
    for d in days:
        day[0] = d
        wrote.append(sp.run(p, res))
    return {'wrote': wrote, 'totals': count(work, 'hunt'), 'order12': sp.query(work, 'hunt', 'select status from shop.orders where id = 12 order by status limit 1')}


OUT['m1-bug2'] = {k: run_resource(k, 'm1-bug2', [1]) for k in ('code', 'fix')}
OUT['m2-bug'] = {k: run_resource(k, 'm2-bug', [1, 1]) for k in ('code', 'fix')}
OUT['m2-bug2'] = {k: run_resource(k, 'm2-bug2', [1, 2]) for k in ('code', 'fix')}
OUT['m5-bug2'] = {k: run_resource(k, 'm5-bug2', [2]) for k in ('code', 'fix')}


def window_hunt(kind):
    """A window of day 2 on top of day 1, run twice."""
    work = tempfile.mkdtemp()
    day = [1]
    p = sp.make_pipeline('hunt', work)
    sp.run(p, sp.orders_resource('append' if kind == 'code' else 'merge', day, True))
    ns = run_snippet(H['m5-bug'][kind], {'day': day})
    day[0] = 2
    wrote = [sp.run(p, ns['window']) for _ in range(2)]
    return {'wrote': wrote, 'totals': count(work, 'hunt')}


OUT['m5-bug'] = {k: window_hunt(k) for k in ('code', 'fix')}


def contract_hunt(kind):
    """Days 1 and 2 as usual, and then the snippet runs day 3: `pipeline.run(orders(), schema_contract=...)`."""
    work = tempfile.mkdtemp()
    day = [1]
    p = sp.make_pipeline('hunt', work)
    r = sp.orders_resource('merge', day, True)
    for d in (1, 2):
        day[0] = d
        sp.run(p, r)
    run_snippet(H['m3-bug2'][kind], {'day': day, 'pipeline': p, 'orders': r})
    return {'totals': count(work, 'hunt')}


OUT['m3-bug2'] = {k: contract_hunt(k) for k in ('code', 'fix')}
print(json.dumps(OUT))
