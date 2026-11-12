#!/usr/bin/env python3
"""Record what Apache Airflow 3 does, for the Airflow tutorial.

Nothing here runs on a managed service, on Celery or on Kubernetes. Everything is recorded on one machine from the real software:

  apache-airflow 3.4.0        the DagBag, `airflow dags test`, `dag.test()`, `airflow tasks render`, timetables, the CLI, and a small running
                              Airflow: api-server, scheduler, dag-processor and triggerer with the LocalExecutor on a SQLite database
  apache-airflow-providers-standard, -sqlite, -http, -smtp
  pytest, ruff                a DAG integrity test run green and red, and the Airflow rules of ruff on a DAG written for Airflow 2

The made-up data is Brewline's: a few orders, five stores, a partner file. Paths are shortened to /opt/airflow, the usual home in a container image.
Clock values, ids and temporary paths are normalized, and the lessons quote durations only as ranges that this machine produced.

Usage:   python airflow/verify/capture_af.py [--out airflow/js/real.js] [--only SECTION,SECTION] [--json FILE]
Needs:   an interpreter with apache-airflow 3.4.0 installed with the official constraints file (see airflow/README.md), pytest and ruff.
         AF_PYTHON may name another interpreter for the Airflow runs; by default the one that runs this script is used.
"""
import argparse
import contextlib
import datetime
import importlib.metadata as md
import json
import os
import pathlib
import platform
import re
import shutil
import signal
import socket
import sqlite3
import subprocess
import sys
import tempfile
import textwrap
import time

HERE = pathlib.Path(__file__).resolve().parent
COURSE = HERE.parent                                  # airflow/
DAGS_SRC = HERE / 'dags'
BROKEN_SRC = HERE / 'dags_broken'
TESTS_SRC = HERE / 'tests'
PROBE = HERE / 'af_probe.py'

ap = argparse.ArgumentParser()
ap.add_argument('--out', default=str(COURSE / 'js' / 'real.js'))
ap.add_argument('--only', default='')
ap.add_argument('--json')
args = ap.parse_args()
ONLY = set(x for x in args.only.split(',') if x)

PY = os.environ.get('AF_PYTHON') or sys.executable
BIN = pathlib.Path(PY).parent
AIRFLOW = str(BIN / 'airflow')

WORK = pathlib.Path(tempfile.mkdtemp(prefix='af-capture-'))
DAGS = WORK / 'dags'
OUTDIR = WORK / 'out'
WATCH = WORK / 'watch'
for d in (DAGS, OUTDIR, WATCH):
    d.mkdir(parents=True, exist_ok=True)
HOME_TEST = WORK / 'home_test'                         # AIRFLOW_HOME for the in-process runs
HOME_STACK = WORK / 'home_stack'                       # AIRFLOW_HOME for the running stack
for d in (HOME_TEST, HOME_STACK):
    d.mkdir(parents=True, exist_ok=True)

OUT = {'meta': {}, 'files': {}, 'text': {}, 'tables': {}, 'counts': {}}

# the clock of the lessons: the day of the recording is shown as 2026-03-14
TODAY_REAL = datetime.datetime.now(datetime.timezone.utc).date()
TODAY_SHOWN = datetime.date(2026, 3, 14)


def put(section, key, value):
    OUT[section][key] = value
    return value


def text(key, s):
    return put('text', key, s.strip('\n') if isinstance(s, str) else s)


def file(key, s):
    return put('files', key, s if s.endswith('\n') else s + '\n')


def counts(key, d):
    return put('counts', key, d)


def table(key, cols, rows):
    return put('tables', key, {'cols': cols, 'rows': [[str(c) for c in r] for r in rows]})


def jdump(o, indent=2):
    return json.dumps(o, indent=indent, ensure_ascii=False, default=str)


# ---------------------------------------------------------------------------------------------------------------------------------------
# normalization: what a reader sees is the same on every recording
# ---------------------------------------------------------------------------------------------------------------------------------------
SITE = None


def site_packages():
    global SITE
    if SITE is None:
        SITE = subprocess.run([PY, '-c', 'import sysconfig; print(sysconfig.get_paths()["purelib"])'], capture_output=True, text=True).stdout.strip()
    return SITE


def shift_date(m):
    d = datetime.date.fromisoformat(m.group(0))
    delta = (d - TODAY_REAL).days
    if abs(delta) <= 90:
        return (TODAY_SHOWN + datetime.timedelta(days=delta)).isoformat()
    return m.group(0)


def norm(s, shift=False):
    """Shorten paths and hide ids. With shift=True the dates around today become dates around 2026-03-14 (for runs that the scheduler made by itself)."""
    s = s.replace(str(DAGS), '/opt/airflow/dags').replace(str(HOME_STACK), '/opt/airflow').replace(str(HOME_TEST), '/opt/airflow').replace(str(OUTDIR), '/opt/airflow/out')
    s = s.replace(str(WATCH), '/opt/airflow/watch').replace(str(WORK), '/opt/airflow')
    s = s.replace(site_packages(), '/usr/local/lib/python3.12/site-packages')
    if shift:
        s = re.sub(r'\b\d{4}-\d{2}-\d{2}\b', shift_date, s)
    s = re.sub(r'\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b', '<id>', s)
    return s


def norm_run_id(rid, seq=0):
    """manual__2026-03-14T07:18:53.563880+00:00 becomes manual__2026-03-14T07:18:5N+00:00-ish: a stable fake time."""
    m = re.match(r'^(manual|scheduled|backfill|asset_triggered)__(.+)$', rid)
    if not m:
        return norm(rid)
    kind, rest = m.groups()
    if kind == 'manual' or kind == 'asset_triggered':
        return '%s__2026-03-14T09:00:%02d.000000+00:00' % (kind, seq % 60)
    return '%s__%s' % (kind, norm(rest))


# ---------------------------------------------------------------------------------------------------------------------------------------
# running Airflow
# ---------------------------------------------------------------------------------------------------------------------------------------
BASE_ENV = dict(os.environ)
for k in list(BASE_ENV):
    if k.startswith('AIRFLOW'):
        BASE_ENV.pop(k)
BASE_ENV.update({
    'AIRFLOW__CORE__LOAD_EXAMPLES': 'False', 'PYTHONDONTWRITEBYTECODE': '1', 'NO_PROXY': '127.0.0.1,localhost', 'no_proxy': '127.0.0.1,localhost',
    'BREWLINE_OUT': str(OUTDIR), 'BREWLINE_DB': str(OUTDIR / 'brewline.db'), 'FLAKY_COUNT_FILE': str(OUTDIR / 'flaky_count'),
    'BREWLINE_CALLBACK_LOG': str(OUTDIR / 'callbacks.log'), 'BREWLINE_WATCH': str(WATCH),
    'AIRFLOW__LOGGING__COLORED_CONSOLE_LOG': 'False',
})
NOISE = re.compile(r'graphviz|Run `pip install|You might need to install|warnings\.warn|\[py\.warnings\]')


def env_for(home, dags=None, extra=None):
    e = dict(BASE_ENV)
    e['AIRFLOW_HOME'] = str(home)
    e['AIRFLOW__CORE__DAGS_FOLDER'] = str(dags or DAGS)
    if extra:
        e.update(extra)
    return e


def af(*a, home=HOME_TEST, dags=None, extra=None, timeout=300, check=False):
    """Run the airflow CLI. Returns (returncode, combined output without the graphviz warning)."""
    r = subprocess.run([AIRFLOW] + list(a), capture_output=True, text=True, env=env_for(home, dags, extra), timeout=timeout)
    out = '\n'.join(ln for ln in (r.stdout + r.stderr).splitlines() if not NOISE.search(ln))
    if check and r.returncode:
        raise RuntimeError('airflow %s failed:\n%s' % (' '.join(a), out[-800:]))
    return r.returncode, out


def probe(cmd, *a, home=HOME_TEST, dags=None, extra=None, stdin=None, timeout=600):
    r = subprocess.run([PY, str(PROBE), cmd] + [str(x) for x in a], capture_output=True, text=True, env=env_for(home, dags, extra), input=stdin, timeout=timeout)
    for ln in r.stdout.splitlines():
        if ln.startswith('RESULT'):
            return json.loads(ln[6:])
    raise RuntimeError('probe %s gave no result:\n%s' % (cmd, (r.stdout + r.stderr)[-1500:]))


def migrate(home, extra=None):
    af('db', 'migrate', home=home, extra=extra, check=True)


def sqlite_rows(home, sql, params=()):
    con = sqlite3.connect('file:%s?mode=ro' % (pathlib.Path(home) / 'airflow.db'), uri=True, timeout=10)
    try:
        cur = con.execute(sql, params)
        cols = [c[0] for c in cur.description]
        return cols, cur.fetchall()
    finally:
        con.close()


def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def copy_dags():
    for f in sorted(DAGS_SRC.glob('*.py')):
        shutil.copy(f, DAGS / f.name)


# ---------------------------------------------------------------------------------------------------------------------------------------
# console and log cleaning: the lessons show what a task wrote, not a wall of internal lines
# ---------------------------------------------------------------------------------------------------------------------------------------
LINE = re.compile(r'^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+\[(\w+)\s*\]\s+(.*)$')
KEEP = (
    '[DAG TEST] starting', '[DAG TEST] end', 'Task started', 'Done. Returned value was', 'Pushing xcom', 'Marking run', 'DagRun Finished',
    'Task instance state updated', 'Creating ORM DAG', 'creating dag run', 'Created dag run',
)


def clean_console(raw, keep=KEEP, task_stdout=True):
    """Turn the console output of `airflow dags test` into short lines: [level] message, and task output as plain text."""
    out = []
    for ln in raw.splitlines():
        m = LINE.match(ln)
        if not m:
            if ln.strip() and not NOISE.search(ln):
                out.append(norm(ln.rstrip()))
            continue
        _, level, rest = m.groups()
        msg = re.sub(r'\s+\[[\w.]+\](\s+\w+=.*)?$', '', rest)           # drop the logger name and the key=value tail
        msg = re.sub(r'\s+(loc|correlation_id|hostname|rows_affected|ti_id|previous_state|try_number|dag_id|run_id|logger)=\S+', '', msg).strip()
        if rest.rstrip().endswith('[task.stdout]') or ' [task.stdout]' in rest:
            if task_stdout:
                out.append(norm(re.sub(r'\s+\[task\.stdout\].*$', '', rest).strip()))
            continue
        if any(msg.startswith(k) for k in keep):
            out.append(norm('[%s] %s' % (level, msg)))
    return '\n'.join(out)


def read_task_log(home, dag_id, run_id, task_id, attempt=1, map_index=None):
    """The JSON lines that a worker wrote for one try of one task, as a list of dicts."""
    base = pathlib.Path(home) / 'logs' / ('dag_id=%s' % dag_id) / ('run_id=%s' % run_id) / ('task_id=%s' % task_id)
    if map_index is not None and map_index >= 0:
        base = base / ('map_index=%d' % map_index)
    f = base / ('attempt=%d.log' % attempt)
    if not f.exists():
        return []
    rows = []
    for ln in f.read_text().splitlines():
        try:
            rows.append(json.loads(ln))
        except ValueError:
            pass
    return rows


BOILERPLATE = ('::group::', '::endgroup::', 'DAG bundles loaded', 'Filling up the DagBag', 'Worker startup parse complete', 'Bundle')


def show_log(rows, keep_boiler=False, drop_ids=True):
    """Lines of a task log as a reader sees them in the UI: output of the task and the messages of the runner."""
    out = []
    for d in rows:
        ev = str(d.get('event', ''))
        if not keep_boiler and ev.startswith(BOILERPLATE):
            continue
        level = d.get('level', 'info')
        if d.get('logger') == 'task.stdout':
            out.append(norm(ev))
        else:
            out.append(norm('[%s] %s' % (level, ev)))
            ed = d.get('error_detail')
            if ed:
                try:
                    e = ed[0]
                    out.append(norm('%s: %s' % (e.get('exc_type'), e.get('exc_value'))))
                except Exception:
                    pass
    return '\n'.join(out)


# =====================================================================================================================================
# 1. meta and files
# =====================================================================================================================================
def sec_meta():
    out = {}
    for pkg in ('apache-airflow', 'apache-airflow-core', 'apache-airflow-task-sdk', 'apache-airflow-providers-standard', 'apache-airflow-providers-sqlite',
                'apache-airflow-providers-http', 'apache-airflow-providers-smtp', 'apache-airflow-providers-common-sql', 'pendulum', 'croniter',
                'sqlalchemy', 'pytest', 'ruff', 'fastapi', 'uvicorn'):
        try:
            out[pkg] = md.version(pkg)
        except md.PackageNotFoundError:
            out[pkg] = None
    # the interpreter that runs Airflow may differ from the one that runs this script
    r = subprocess.run([PY, '-c', 'import json, importlib.metadata as m, sys; print(json.dumps({p: (m.version(p) if True else None) for p in %r}))' % list(out)],
                       capture_output=True, text=True)
    try:
        out = json.loads(r.stdout)
    except ValueError:
        pass
    pv = subprocess.run([PY, '-c', 'import sys; print(sys.version.split()[0])'], capture_output=True, text=True).stdout.strip()
    OUT['meta'].update(out)
    OUT['meta'].update({'python': pv, 'platform': platform.system(), 'recorded_on': TODAY_SHOWN.isoformat(),
                        'note': 'Recorded by airflow/verify/capture_af.py with Apache Airflow 3.4.0 on one machine. Nothing ran on a managed service.'})


def sec_files():
    for f in sorted(DAGS_SRC.glob('*.py')):
        file('dags/' + f.name, f.read_text())
    if BROKEN_SRC.exists():
        for f in sorted(BROKEN_SRC.glob('*.py')):
            file('dags_broken/' + f.name, f.read_text())
    if TESTS_SRC.exists():
        for f in sorted(TESTS_SRC.glob('*.py')):
            file('tests/' + f.name, f.read_text())
    for f in sorted((HERE / 'snippets').glob('*')) if (HERE / 'snippets').exists() else []:
        file('snippets/' + f.name, f.read_text())


# =====================================================================================================================================
# 2. reading DAG files: the DagBag, import errors, the defaults of a DAG
# =====================================================================================================================================
def sec_dagbag():
    copy_dags()
    migrate(HOME_TEST)
    good = probe('dagbag')
    counts('af.dagbag', {'dags': good['dags'], 'import_errors': good['import_errors'], 'count': len(good['dags'])})
    # the broken files, each one alone, so each message is the message of that file
    errs = {}
    if BROKEN_SRC.exists():
        for f in sorted(BROKEN_SRC.glob('*.py')):
            d = WORK / ('broken_' + f.stem)
            d.mkdir(exist_ok=True)
            shutil.copy(f, d / f.name)
            r = probe('dagbag', home=HOME_TEST, dags=d)
            errs[f.name] = {'import_errors': {k: norm(v) for k, v in r['import_errors'].items()}, 'dags': sorted(r['dags'])}
    counts('af.broken', errs)
    # airflow dags details for the nightly DAG
    af('dags', 'reserialize', check=True)
    rc, out = af('dags', 'details', 'brewline_nightly')
    rows = []
    for ln in out.splitlines():
        if '|' in ln and not ln.startswith('=') and not ln.startswith('property_name'):
            k, _, v = ln.partition('|')
            if k.strip():
                rows.append([k.strip(), v.strip()])
    keep = ['dag_id', 'is_paused', 'timetable_summary', 'timetable_description', 'timetable_periodic', 'max_active_tasks', 'max_active_runs', 'max_consecutive_failed_dag_runs',
            'has_task_concurrency_limits', 'has_import_errors', 'bundle_name', 'relative_fileloc']
    table('af.details', ['property', 'value'], [r for r in rows if r[0] in keep])
    text('af.details_raw', norm(out))


def sec_imports():
    stmts = [
        'from airflow import DAG', 'from airflow.sdk import DAG, dag, task', 'from airflow.decorators import dag, task',
        'from airflow.operators.bash import BashOperator', 'from airflow.providers.standard.operators.bash import BashOperator',
        'from airflow.operators.python import PythonOperator', 'from airflow.providers.standard.operators.python import PythonOperator',
        'from airflow.sensors.filesystem import FileSensor', 'from airflow.providers.standard.sensors.filesystem import FileSensor',
        'from airflow.hooks.base import BaseHook', 'from airflow.sdk import BaseHook',
        'from airflow.utils.task_group import TaskGroup', 'from airflow.sdk import TaskGroup',
        'from airflow.models.baseoperator import BaseOperator', 'from airflow.sdk import BaseOperator',
        'from airflow.exceptions import AirflowSkipException', 'from airflow.sdk.exceptions import AirflowSkipException',
        'from airflow.utils.trigger_rule import TriggerRule', 'from airflow.task.trigger_rule import TriggerRule',
        'from airflow.utils.dates import days_ago', 'from airflow.datasets import Dataset', 'from airflow.sdk import Asset',
        'from airflow.utils.decorators import apply_defaults',
    ]
    res = probe('imports', stdin='\n'.join(stmts))
    counts('af.imports', res)



# =====================================================================================================================================
# 3. the first run, templates, time
# =====================================================================================================================================
def tis_table(home, dag_id, key, run_filter=None):
    cols, rows = sqlite_rows(home, "SELECT task_id, region_index AS map_index, state, try_number, operator FROM task_instance WHERE dag_id = ? ORDER BY start_date, task_id, region_index", (dag_id,))
    table(key, ['task_id', 'map_index', 'state', 'try_number', 'operator'], rows)
    return rows


def xcoms(home, dag_id):
    cols, rows = sqlite_rows(home, "SELECT ti.task_id, ti.region_index, x.key, x.value FROM xcom_v2 x JOIN task_instance ti ON ti.id = x.task_instance_id WHERE ti.dag_id = ? ORDER BY ti.task_id, ti.region_index, x.key", (dag_id,))
    return rows


def sec_first_run():
    copy_dags()
    migrate(HOME_TEST)
    rc, raw = af('dags', 'test', 'brewline_first', '2026-03-14')
    text('af.first_run', clean_console(raw))
    rows = tis_table(HOME_TEST, 'brewline_first', 'af.first_run_ti')
    xs = xcoms(HOME_TEST, 'brewline_first')
    table('af.first_run_xcom', ['task_id', 'key', 'value'], [[a, c, d] for a, _, c, d in xs])
    summary = (OUTDIR / 'summary_2026-03-14.json').read_text()
    counts('af.first_run', {'rc': rc, 'tasks': [r[0] for r in rows], 'states': [r[2] for r in rows], 'summary_file': 'summary_2026-03-14.json', 'summary': json.loads(summary)})
    # the classic nightly DAG: the same, with classic operators
    rc, raw = af('dags', 'test', 'brewline_nightly', '2026-03-14')
    text('af.nightly_run', clean_console(raw))
    rows = tis_table(HOME_TEST, 'brewline_nightly', 'af.nightly_ti')
    counts('af.nightly', {'rc': rc, 'order': [r[0] for r in rows]})


def sec_render():
    copy_dags()
    migrate(HOME_TEST)
    out = {}
    for t in ('dates', 'partition_path', 'previous_day'):
        rc, raw = af('tasks', 'render', 'brewline_templates', t, '2026-03-14')
        m = re.search(r'# property: bash_command\n# -+\n(.*?)\n# -+\n# property:', raw, re.S)
        out[t] = norm(m.group(1).strip()) if m else norm(raw[-300:])
    counts('af.render', out)


TIMETABLES = [
    ('cron_trigger_utc', {'kind': 'CronTriggerTimetable', 'args': {'expr': '0 2 * * *', 'timezone': 'UTC'}}),
    ('cron_interval_utc', {'kind': 'CronDataIntervalTimetable', 'args': {'expr': '0 2 * * *', 'timezone': 'UTC'}}),
    ('cron_trigger_interval', {'kind': 'CronTriggerTimetable', 'args': {'expr': '0 2 * * *', 'timezone': 'UTC', 'interval': {'days': 1}}}),
    ('daily_trigger', {'kind': 'CronTriggerTimetable', 'args': {'expr': '@daily', 'timezone': 'UTC'}}),
    ('daily_interval', {'kind': 'CronDataIntervalTimetable', 'args': {'expr': '@daily', 'timezone': 'UTC'}}),
    ('weekly_interval', {'kind': 'CronDataIntervalTimetable', 'args': {'expr': '0 6 * * 1', 'timezone': 'UTC'}}),
    ('delta_trigger_6h', {'kind': 'DeltaTriggerTimetable', 'args': {'delta': {'hours': 6}}}),
    ('delta_interval_6h', {'kind': 'DeltaDataIntervalTimetable', 'args': {'delta': {'hours': 6}}}),
]


def sec_timetables():
    migrate(HOME_TEST)
    res = {}
    for label, spec in TIMETABLES:
        spec = dict(spec, start='2026-03-01T00:00:00+00:00', n=4, catchup=True, manual_at=['2026-03-14T15:30:00+00:00'])
        res[label] = probe('timetable', json.dumps(spec))
    counts('af.timetables', res)


# the expressions of the cron lab: what Airflow's CronTriggerTimetable fires after a fixed moment
CRON_EXPRS = [
    '* * * * *', '*/15 * * * *', '0 * * * *', '30 3 * * *', '0 2 * * *', '0 0 * * *', '0 */6 * * *', '15 2,14 * * *', '0 9-17 * * 1-5', '0 6 * * MON', '0 6 * * 1,3,5',
    '0 0 1 * *', '0 0 15 * *', '0 0 1 1 *', '0 0 1 JAN,JUL *', '45 23 * * 0', '0 0 * * 6,0', '*/10 8-10 * * *', '5 4 * * sun', '0 12 1-7 * 1',
    '0 0 13 * 5', '0 0 29 2 *', '0 0 31 * *', '59 23 L * *', '0 0 * * 7', '0 22 * * 1-5', '20,50 * * * *', '0 8 */2 * *', '0 1 * * 1-3', '0 0 1,15 * *',
    '@hourly', '@daily', '@weekly', '@monthly', '@yearly', '@midnight',
]
CRON_START = '2026-03-14T10:17:00+00:00'


def sec_cron():
    migrate(HOME_TEST)
    res = {}
    for expr in CRON_EXPRS:
        spec = {'kind': 'CronTriggerTimetable', 'args': {'expr': expr, 'timezone': 'UTC'}, 'start': CRON_START, 'n': 5, 'catchup': True}
        try:
            r = probe('timetable', json.dumps(spec))
            res[expr] = {'description': r['description'], 'fires': [x['run_after'] for x in r['runs']]}
        except RuntimeError as e:
            res[expr] = {'error': str(e).strip().splitlines()[-1][:160]}
    counts('af.cron', {'start': CRON_START, 'tz': 'UTC', 'exprs': res})


def sec_dst():
    migrate(HOME_TEST)
    rows = []
    for tz, start, label in (('America/New_York', '2026-03-06T00:00:00+00:00', 'spring'), ('America/New_York', '2026-10-30T00:00:00+00:00', 'autumn'), ('Europe/London', '2026-03-26T00:00:00+00:00', 'london')):
        for expr in ('0 2 * * *', '30 1 * * *', '0 3 * * *'):
            spec = {'kind': 'CronTriggerTimetable', 'args': {'expr': expr, 'timezone': tz}, 'start': start, 'n': 5, 'catchup': True, 'show_tz': tz}
            r = probe('timetable', json.dumps(spec))
            rows.append({'tz': tz, 'expr': expr, 'season': label, 'runs': [{'utc': x['run_after'], 'local': x['run_after_local']} for x in r['runs']]})
    counts('af.dst', {'rows': rows})


# =====================================================================================================================================
SECTIONS = []


def section(name):
    def deco(fn):
        SECTIONS.append((name, fn))
        return fn
    return deco


section('meta')(sec_meta)
section('files')(sec_files)
section('dagbag')(sec_dagbag)
section('imports')(sec_imports)
section('first_run')(sec_first_run)
section('render')(sec_render)
section('timetables')(sec_timetables)
section('cron')(sec_cron)
section('dst')(sec_dst)


# =====================================================================================================================================
def load_existing():
    p = pathlib.Path(args.out)
    if ONLY and p.exists():
        body = p.read_text()
        j = body[body.index('LAB.real = ') + len('LAB.real = '):].rstrip().rstrip(';')
        try:
            old = json.loads(j)
            for k in OUT:
                OUT[k].update(old.get(k, {}))
        except ValueError:
            pass


def finish():
    body = 'window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(OUT, indent=1, ensure_ascii=False, sort_keys=True) + ';\n'
    pathlib.Path(args.out).write_text(body)
    if args.json:
        pathlib.Path(args.json).write_text(json.dumps(OUT, indent=1, ensure_ascii=False, sort_keys=True))
    print('wrote', args.out, '(%d bytes)' % len(body), {k: len(v) for k, v in OUT.items()})


def main():
    load_existing()
    try:
        for name, fn in SECTIONS:
            if ONLY and name not in ONLY:
                continue
            t0 = time.time()
            fn()
            print('section %-12s done in %5.1fs' % (name, time.time() - t0), flush=True)
    finally:
        finish()
        shutil.rmtree(WORK, ignore_errors=True)


if __name__ == '__main__':
    main()
