"""Helpers of the recorder for the lakehouse walkthrough: run the real project (projects/brewline-lakehouse) in a temporary copy, with Spark and Delta Lake, and parse what it printed.

The project is copied to a temporary folder before anything runs, so the repository is never touched. One interpreter is needed:
  LAKE_PY   Python with pyspark 4.0.1, delta-spark 4.0.1 and pytest, and a Java 17 or later on the path. The Delta jar is fetched once from Maven Central (the network is needed the first time).
"""
import json
import os
import pathlib
import re
import shutil
import subprocess
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
REPO = ROOT / 'projects' / 'brewline-lakehouse'
R = {'meta': {}, 'files': {}, 'text': {}, 'tables': {}, 'counts': {}}


def tool(name='LAKE_PY'):
    v = os.environ.get(name, '')
    if not v:
        raise SystemExit('Set %s (see project-lakehouse/verify/requirements.txt)' % name)
    return v


def sh(cmd, **kw):
    return subprocess.run([str(c) for c in cmd], capture_output=True, text=True, **kw)


class Lake:
    """A temporary copy of the project and a lakehouse folder of its own."""

    def __init__(self, keep_repo_copy=True):
        self.home = pathlib.Path(tempfile.mkdtemp(prefix='lake-project-'))
        shutil.rmtree(self.home)
        shutil.copytree(REPO, self.home, ignore=shutil.ignore_patterns('lakehouse_data', '__pycache__', '.pytest_cache', 'spark-warehouse', 'metastore_db', 'derby.log', '.venv'))
        self.data = pathlib.Path(tempfile.mkdtemp(prefix='lake-data-'))
        self.env = dict(os.environ, LAKEHOUSE_HOME=str(self.data), PYTHONDONTWRITEBYTECODE='1', PYTHONWARNINGS='ignore')

    def replace_in(self, rel, old, new):
        f = self.home / rel
        text = f.read_text()
        assert text.count(old) == 1, '%s: the text to replace is in the file %d times: %s' % (rel, text.count(old), old[:70])
        f.write_text(text.replace(old, new))

    def hunt(self, name, *extra, timeout=1800):
        """Runs one bug hunt (verify/hunts_lake.py) on this copy, with a lakehouse folder of its own. Returns the JSON that it printed."""
        r = sh([tool(), '-B', str(HERE / 'hunts_lake.py'), name, str(self.home), str(self.data), *extra], env=self.env, timeout=timeout)
        assert r.returncode == 0, 'hunt %s failed: %s' % (name, r.stderr[-800:])
        return json.loads(r.stdout.strip().split('\n')[-1])

    def module(self, args, timeout=1800):
        """Runs `python -m ...` in the copy. Returns (exit code, stdout). Spark's logs are on stderr and are not part of the recording."""
        r = sh([tool(), '-B', '-m', *args], cwd=self.home, env=self.env, timeout=timeout)
        return r.returncode, r.stdout.rstrip('\n'), r.stderr

    def script(self, path, *args, timeout=1800):
        r = sh([tool(), '-B', path, *args], cwd=self.home, env=self.env, timeout=timeout)
        return r.returncode, r.stdout.rstrip('\n'), r.stderr


def parse_run(out):
    """What a run printed: the files and rows, the silver merge, gold, a warning, and the gate lines."""
    d = {'files': 0, 'bronze_rows': 0, 'valid': 0, 'quarantined': 0, 'inserted': 0, 'updated': 0, 'left': 0, 'gold_rows': 0, 'gold_days': 0, 'warning': '', 'gate': [], 'nothing_to_do': False}
    for line in out.split('\n'):
        m = re.match(r'day (\d+): (\d+) new files, (\d+) bronze rows', line)
        if m:
            d['day'], d['files'], d['bronze_rows'] = int(m.group(1)), int(m.group(2)), int(m.group(3))
        m = re.match(r'silver: (\d+) valid, (\d+) quarantined; merge inserted (\d+), updated (\d+), left (\d+) alone', line)
        if m:
            d['valid'], d['quarantined'], d['inserted'], d['updated'], d['left'] = [int(x) for x in m.groups()]
        m = re.match(r'gold: (\d+) rows for (\d+) days', line)
        if m:
            d['gold_rows'], d['gold_days'] = int(m.group(1)), int(m.group(2))
        if line.startswith('warning:'):
            d['warning'] = line.split(': ', 2)[-1]
        if line.startswith(('PASS', 'FAIL')):
            d['gate'].append(line)
        if line.startswith('nothing to do'):
            d['nothing_to_do'] = True
    return d


def T(key, s):
    R['text'][key] = '\n'.join(l.rstrip() for l in s.split('\n')).strip('\n')
    return R['text'][key]


def write_real(path):
    pathlib.Path(path).write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(R, indent=1, sort_keys=True, ensure_ascii=False, default=str) + ';\n')
