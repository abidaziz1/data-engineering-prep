"""Helpers of the recorder for the ELT project walkthrough: run the real project (projects/brewline-elt) in a temporary copy, with its three tools, and parse what Airflow, dlt and dbt printed.

The project is copied to a temporary folder before anything runs, so the repository is never touched.
Three interpreters are needed, because dlt, dbt and Airflow do not install together (see requirements.txt):
  ELT_INGEST_PY   Python with dlt[duckdb] and duckdb          ELT_DBT       the dbt program (dbt-duckdb)
  ELT_AIRFLOW     the airflow program (apache-airflow 3.4.0)   ELT_TEST_PY   Python with pytest (the dbt environment will do)
"""
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
REPO = ROOT / 'projects' / 'brewline-elt'
R = {'meta': {}, 'files': {}, 'text': {}, 'tables': {}, 'counts': {}}
ANSI = re.compile(r'\x1b?\[[0-9;]*m')


def tool(name):
    v = os.environ.get(name, '')
    if not v:
        raise SystemExit('Set %s (see project-elt/verify/requirements.txt)' % name)
    return v


def sh(cmd, **kw):
    return subprocess.run([str(c) for c in cmd], capture_output=True, text=True, **kw)


def copy_project(dest=None):
    dest = pathlib.Path(dest or tempfile.mkdtemp(prefix='elt-project-'))
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(REPO, dest, ignore=shutil.ignore_patterns('warehouse', 'published', '__pycache__', 'target', 'logs', '.pytest_cache', '.airflow'))
    return dest


class Project:
    """A temporary copy of the project and the environment that its DAG needs."""

    def __init__(self, need_airflow=True):
        self.home = copy_project()
        self.airflow_home = pathlib.Path(tempfile.mkdtemp(prefix='elt-airflow-'))
        self.env = dict(os.environ, BREWLINE_HOME=str(self.home), BREWLINE_PYTHON=tool('ELT_INGEST_PY'), BREWLINE_DBT=tool('ELT_DBT'), BREWLINE_RETRIES='0', AIRFLOW_HOME=str(self.airflow_home),
                        AIRFLOW__CORE__LOAD_EXAMPLES='False', AIRFLOW__CORE__DAGS_FOLDER=str(self.home / 'orchestration' / 'dags'), PYTHONDONTWRITEBYTECODE='1', PYTHONWARNINGS='ignore', DO_NOT_TRACK='1',
                        RUNTIME__DLTHUB_TELEMETRY='false')
        if need_airflow:
            r = sh([tool('ELT_AIRFLOW'), 'db', 'migrate'], env=self.env, cwd=self.home)
            assert r.returncode == 0, r.stderr[-400:]
        self.warehouse = self.home / 'warehouse' / 'brewline.duckdb'

    def dag_test(self, date):
        """One run of the DAG for a logical date, as `airflow dags test` does it. Returns (exit code, parsed run)."""
        r = sh([tool('ELT_AIRFLOW'), 'dags', 'test', 'brewline_daily', date], env=self.env, cwd=self.home, timeout=900)
        return r.returncode, parse_run(r.stdout + '\n' + r.stderr)

    def query(self, sql):
        code = 'import duckdb,json,sys; c=duckdb.connect(sys.argv[1],read_only=True); print(json.dumps(c.sql(sys.argv[2]).fetchall(),default=str))'
        r = sh([tool('ELT_INGEST_PY'), '-c', code, self.warehouse, sql], env=self.env)
        assert r.returncode == 0, r.stderr[-400:]
        return json.loads(r.stdout)

    def load(self, day):
        return self.run_script(['ingestion/load_orders.py', '--day', str(day), '--warehouse', str(self.warehouse)])

    def dbt_build(self):
        env = dict(self.env, BREWLINE_WAREHOUSE=str(self.warehouse))
        r = sh([tool('ELT_DBT'), 'build', '--profiles-dir', '.'], env=env, cwd=self.home / 'dbt')
        lines = [ANSI.sub('', l) for l in r.stdout.splitlines()]
        lines = [re.sub(r'^\d\d:\d\d:\d\d\s+', '', l) for l in lines]
        return r.returncode, lines

    def replace_in(self, relpath, old, new):
        f = self.home / relpath
        text = f.read_text()
        assert text.count(old) == 1, '%s: the original text is not there exactly once (%d)' % (relpath, text.count(old))
        f.write_text(text.replace(old, new))

    def run_script(self, args):
        r = sh([tool('ELT_INGEST_PY'), *args], env=self.env, cwd=self.home)
        return r.returncode, r.stdout.rstrip('\n')


_OUT = re.compile(r'\[info\s*\] (.*?)\s+\[airflow\.task\.hooks\.airflow\.providers\.standard\.hooks\.subprocess\.SubprocessHook\] loc=subprocess\.py:106')


def parse_run(log):
    """What a run of the DAG did: the state of the run and of each task, and what each program printed."""
    run = {'state': None, 'tasks': [], 'out': {}}
    order, current, states = [], None, []
    for line in log.splitlines():
        m = re.search(r'\[DAG TEST\] starting task_id=(\w+)', line)
        if m:
            current = m.group(1)
            order.append(current)
            run['out'][current] = []
            continue
        m = re.search(r'new_state=(success|failed|upstream_failed|skipped)', line)
        if m:
            states.append(m.group(1))
            continue
        m = re.search(r'DagRun Finished: .*? state=(\w+)', line)
        if m:
            run['state'] = m.group(1)
            continue
        m = _OUT.search(line)
        if m and current:
            msg = ANSI.sub('', m.group(1))
            msg = re.sub(r'^\d\d:\d\d:\d\d\s+', '', msg)
            run['out'][current].append(msg)
    run['tasks'] = list(zip(order, states))
    return run


def dbt_summary(lines):
    done = [l for l in lines if l.startswith('Done.')]
    s = {k: int(v) for k, v in re.findall(r'(PASS|WARN|ERROR|SKIP|TOTAL)=(\d+)', done[-1])} if done else {}
    fails = sorted({m.group(1) for l in lines for m in [re.search(r'FAIL \d+ (\S+)', l)] if m})
    skipped = sorted({m.group(1) for l in lines for m in [re.search(r'SKIP (?:relation|test|sql \w+ model) (\S+)', l)] if m})
    return s, fails, skipped


def gate_lines(lines):
    return [l for l in lines if re.match(r'^(PASS|FAIL) (raw\.|fct_orders|orders_daily)', l)]


def T(key, s):
    R['text'][key] = '\n'.join(l.rstrip() for l in s.split('\n')).strip('\n')
    return R['text'][key]


def write_real(path):
    pathlib.Path(path).write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(R, indent=1, sort_keys=True, ensure_ascii=False, default=str) + ';\n')
