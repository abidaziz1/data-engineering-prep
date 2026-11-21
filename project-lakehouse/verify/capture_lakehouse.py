#!/usr/bin/env python3
"""Record what the real lakehouse project does, for the walkthrough.

The project projects/brewline-lakehouse is copied to a temporary folder and run with Spark 4.0.1 and Delta Lake 4.0.1: pytest (7 tests), the pipeline for three days of the pretend source
(bronze, silver, gold, and the quality gate), a rerun of the last day, and a tour of the Delta history. Nothing is timed.

Not recorded: cloud storage, a cluster, streaming, table maintenance (OPTIMIZE, VACUUM), a Docker build, a CI run.

Usage:   LAKE_PY=.. python3 project-lakehouse/verify/capture_lakehouse.py [--out project-lakehouse/js/real.js]
"""
import argparse
import datetime
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.dont_write_bytecode = True
import lakelib                                          # noqa: E402
from lakelib import R, T, REPO, tool, parse_run         # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--out', default=str(HERE.parent / 'js' / 'real.js'))
args = ap.parse_args()

JUNK = ('lakehouse_data', '__pycache__', '.pytest_cache', 'spark-warehouse', 'metastore_db', 'derby.log', '.venv')
for f in sorted(REPO.rglob('*')):
    rel = str(f.relative_to(REPO))
    if f.is_file() and (f.suffix in ('.py', '.md', '.txt', '.yml') or f.name in ('Makefile', 'Dockerfile', '.gitignore')) and not any(j in rel for j in JUNK):
        R['files'][rel] = f.read_text()

versions = lakelib.sh([tool(), '-c', 'import pyspark, delta, platform; print(pyspark.__version__, delta.__version__ if hasattr(delta, "__version__") else "", platform.python_version())']).stdout.split()
delta_v = lakelib.sh([tool(), '-m', 'pip', 'show', 'delta-spark']).stdout
R['meta'].update({'pyspark': versions[0], 'delta': re.search(r'Version: (\S+)', delta_v).group(1), 'python': versions[-1], 'java': re.search(r'version "([^"]+)"', lakelib.sh(['java', '-version']).stderr).group(1),
                  'recorded_on': datetime.date.today().isoformat(), 'note': 'Recorded by project-lakehouse/verify/capture_lakehouse.py: the real project in a temporary copy, with Spark and Delta Lake on one machine.'})

L = lakelib.Lake()
rc, out, err = L.module(['pytest', '-q', 'tests'])
assert rc == 0, out[-600:] + err[-600:]
T('tests.run', 'pytest -q tests\n' + re.sub(r' in [\d.]+s( \(.*\))?', '', out.strip().split('\n')[-1]))
R['counts']['tests'] = {'passed': int(re.search(r'(\d+) passed', out).group(1))}


def counts():
    rc_, out_, err_ = L.script(str(HERE / 'counts.py'))
    assert rc_ == 0, err_[-600:]
    return json.loads(out_)


RUNS = {}
for key, day in [('day1', 1), ('day2', 2), ('day3', 3), ('day3_again', 3)]:
    rc, out, err = L.module(['lakehouse.run', '--day', str(day)])
    assert rc == 0, '%s: exit %d: %s %s' % (key, rc, out[-600:], err[-600:])
    T('run.' + key, 'python -m lakehouse.run --day %d\n%s' % (day, out))
    RUNS[key] = parse_run(out)
    R['counts']['after_' + key] = counts()
R['counts']['runs'] = RUNS

rc, out, err = L.module(['lakehouse.tour'])
assert rc == 0, err[-800:]
T('tour.run', 'python -m lakehouse.tour\n' + out)
hist, vers, quar = [], [], []
for line in out.split('\n'):
    m = re.match(r'  version (\d+)  (\w+)(?:, inserted (\d+), updated (\d+))?$', line)
    if m:
        hist.append([int(m.group(1)), m.group(2), int(m.group(3) or 0), int(m.group(4) or 0)])
    m = re.match(r'  version (\d+): (\d+) orders, order 5 is (.+)$', line)
    if m:
        vers.append([int(m.group(1)), int(m.group(2)), m.group(3)])
    m = re.match(r'  (\w+)\s+(\d+)$', line)
    if m:
        quar.append([m.group(1), int(m.group(2))])
R['tables']['history'] = {'cols': ['version', 'operation', 'inserted', 'updated'], 'rows': hist}
R['tables']['versions'] = {'cols': ['version', 'orders', 'order 5'], 'rows': vers}
R['tables']['quarantine'] = {'cols': ['reason', 'rows'], 'rows': quar}
R['counts']['tour'] = {'gold': re.search(r'gold: (\d+) rows, (\d+) days, (\d+) stores', out).groups()}
T('tool.versions', 'Spark %(pyspark)s with Delta Lake %(delta)s on Java %(java)s and Python %(python)s' % R['meta'])
lakelib.write_real(args.out)
print('wrote %s: %d files, %d texts, %d tables, %d sets of counts' % (args.out, len(R['files']), len(R['text']), len(R['tables']), len(R['counts'])))
