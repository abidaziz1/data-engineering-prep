"""Mission 12: tests and quality (pytest, coverage, a mutation experiment, Hypothesis, logging, ruff)."""
import pathlib
import re
import shutil

HERE = pathlib.Path(__file__).resolve().parent.parent
LESSONS = HERE / 'lessons' / 'm12'
FILES = ['orders.py', 'test_weak.py', 'test_strong.py', 'test_failing.py', 'run_mutants.py', 'hypothesis_demo.py', 'bad_style.py']


def record(rec, work, cache):
    d = work / 'm12_work'
    shutil.rmtree(d, ignore_errors=True)
    d.mkdir(parents=True)
    for f in FILES:
        shutil.copy(LESSONS / f, d / f)
        rec.file('m12/' + f, (LESSONS / f).read_text())
    py = rec.py
    pt = '%s -m pytest -q -p no:cacheprovider --no-header' % py
    jobs = [('m12/pytest_weak', pt + ' test_weak.py', 'pytest -q test_weak.py'),
            ('m12/pytest_failing', pt + ' test_failing.py', 'pytest -q test_failing.py'),
            ('m12/pytest_strong', pt + ' test_strong.py', 'pytest -q test_strong.py'),
            ('m12/coverage_weak', pt + ' --cov=orders --cov-report=term-missing test_weak.py', 'pytest -q --cov=orders --cov-report=term-missing test_weak.py'),
            ('m12/coverage_strong', pt + ' --cov=orders --cov-report=term-missing test_strong.py', 'pytest -q --cov=orders --cov-report=term-missing test_strong.py'),
            ('m12/hypothesis', pt + ' hypothesis_demo.py', 'pytest -q hypothesis_demo.py'),
            ('m12/ruff', '%s -m ruff check --select E,F,B --output-format=concise --no-cache bad_style.py' % py, 'ruff check --select E,F,B --output-format=concise bad_style.py')]
    for key, cmd, shown in jobs:
        rec.shell(key, [cmd], d, show={cmd: shown})
    rec.lesson('m12/run_mutants.py', setup=lambda c: [shutil.copy(LESSONS / f, c / f) for f in ('orders.py', 'test_weak.py', 'test_strong.py')], timeout=300)
    rec.lesson('m12/logging_basics.py')
    rec.lesson('m12/parse_amount.py')
    t = rec.data['text']
    src = (LESSONS / 'run_mutants.py').read_text()
    out = {'mutants': [{'name': n, 'old': o, 'new': w} for n, o, w in re.findall(r'^\s+\("([^"]+)", "([^"]+)", "([^"]+)"\),$', src, re.M)], 'suites': {}, 'coverage': {}}
    cur = None
    for line in t['m12/run_mutants.py'].split('\n'):
        m = re.match(r'^(test_\w+\.py): (\d+) of (\d+) mutants caught', line)
        if m:
            cur = m.group(1)
            out['suites'][cur] = {'caught': int(m.group(2)), 'total': int(m.group(3)), 'survived': []}
        m = re.match(r'^  survived: (.+)$', line)
        if m and cur:
            out['suites'][cur]['survived'].append(m.group(1))
    for suite in ('weak', 'strong'):
        m = re.search(r'TOTAL\s+(\d+)\s+(\d+)\s+(\d+)%', t['m12/coverage_' + suite])
        passed = re.search(r'(\d+) passed', t['m12/coverage_' + suite])
        out['coverage'][suite] = {'statements': int(m.group(1)), 'missed': int(m.group(2)), 'percent': int(m.group(3)), 'tests': int(passed.group(1))}
    rec.counts('m12.mutants', out)
