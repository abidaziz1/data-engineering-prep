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
        seen = {}

        def fake(m):
            seen.setdefault(m.group(0), len(seen))
            return norm_run_id(m.group(0), seen[m.group(0)])
        s = re.sub(r'\b(?:manual|asset_triggered)__[0-9T:.+\-]+', fake, s)
        s = re.sub(r'(?<!\d)\d{4}-\d{2}-\d{2}(?!\d)', shift_date, s)
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
    return '%s__%s' % (kind, rest)


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
    'BREWLINE_CALLBACK_LOG': str(OUTDIR / 'callbacks.log'), 'BREWLINE_WATCH': str(WATCH), 'BREWLINE_DEADLINE_LOG': str(OUTDIR / 'deadline.log'), 'BREWLINE_POLICY_COUNT': str(OUTDIR / 'policy_count'),
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


def mini(*names):
    """A folder with only the named DAG files, so that a CLI call parses a few files and not all of them."""
    d = WORK / ('mini_' + '_'.join(n[:-3] for n in names))
    d.mkdir(exist_ok=True)
    for n in names:
        shutil.copy(DAGS_SRC / n, d / n)
    return d


# ---------------------------------------------------------------------------------------------------------------------------------------
# console and log cleaning: the lessons show what a task wrote, not a wall of internal lines
# ---------------------------------------------------------------------------------------------------------------------------------------
LINE = re.compile(r'^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+\[(\w+)\s*\]\s+(.*)$')
RUNID = re.compile(r'\b(manual|scheduled|backfill|asset_triggered)__[0-9T:.+\-]+')
KEEP = ('[DAG TEST] starting', '[DAG TEST] end', 'Task started', 'Done. Returned value was', 'Pushing xcom', 'Marking run', 'DagRun Finished', 'Task instance state updated')


def clean_console(raw, keep=KEEP, task_stdout=True):
    """Turn the console output of `airflow dags test` into short lines: [level] message, and what the tasks printed as plain text."""
    out, seq = [], {}

    def rid(m):
        seq.setdefault(m.group(0), len(seq))
        return norm_run_id(m.group(0), seq[m.group(0)])
    for ln in raw.splitlines():
        m = LINE.match(ln)
        if not m:
            if ln.strip() and not NOISE.search(ln):
                out.append(norm(ln.rstrip()))
            continue
        _, level, rest = m.groups()
        if ' [task.stdout]' in rest:
            if task_stdout:
                out.append(norm(re.sub(r'\s+\[task\.stdout\].*$', '', rest).strip()))
            continue
        msg = re.sub(r'\s+\[[\w.]+\](\s+\w+=.*)?$', '', rest)           # drop the logger name and the key=value tail
        tail = dict(re.findall(r'(\w+)=([^\s]+)', rest))
        msg = re.sub(r'\s+(loc|correlation_id|hostname|rows_affected|ti_id|previous_state|try_number|dag_id|run_id|logger|new_state)=\S+', '', msg).strip()
        if not any(msg.startswith(k) for k in keep):
            continue
        if msg.startswith('Task instance state updated'):
            if 'new_state' not in tail:
                continue
            msg = 'Task instance state updated: new_state=' + tail['new_state']
        if msg.startswith('DagRun Finished'):
            mm = re.search(r'DagRun Finished: (.*)$', rest)
            kv = dict(re.findall(r'(\w+)=([^,\s]+)', mm.group(1))) if mm else {}
            msg = 'DagRun Finished: ' + ', '.join('%s=%s' % (k, kv[k]) for k in ('dag_id', 'logical_date', 'state', 'run_type') if k in kv)
        out.append(norm(RUNID.sub(rid, '[%s] %s' % (level, msg))))
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
    file('gen/trigger_rules_gen.py', (HERE / 'gen' / 'trigger_rules_gen.py').read_text())
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
    cols, rows = sqlite_rows(home, "SELECT task_id, region_index AS map_index, state, try_number, operator FROM task_instance WHERE dag_id = ? AND working_set = 1 ORDER BY start_date, task_id, region_index", (dag_id,))
    table(key, ['task_id', 'map_index', 'state', 'try_number', 'operator'], rows)
    return rows


def xcoms(home, dag_id):
    cols, rows = sqlite_rows(home, "SELECT ti.task_id, ti.region_index, x.key, x.value FROM xcom_v2 x JOIN task_instance ti ON ti.id = x.task_instance_id WHERE ti.dag_id = ? ORDER BY ti.task_id, ti.region_index, x.key", (dag_id,))
    return rows


def sec_first_run():
    d = mini('brewline_first.py', 'brewline_nightly.py')
    migrate(HOME_TEST)
    rc, raw = af('dags', 'test', 'brewline_first', '2026-03-14', dags=d)
    text('af.first_run', clean_console(raw))
    rows = tis_table(HOME_TEST, 'brewline_first', 'af.first_run_ti')
    xs = xcoms(HOME_TEST, 'brewline_first')
    table('af.first_run_xcom', ['task_id', 'key', 'value'], [[a, c, d] for a, _, c, d in xs])
    summary = (OUTDIR / 'summary_2026-03-14.json').read_text()
    counts('af.first_run', {'rc': rc, 'tasks': [r[0] for r in rows], 'states': [r[2] for r in rows], 'summary_file': 'summary_2026-03-14.json', 'summary': json.loads(summary)})
    # the classic nightly DAG: the same, with classic operators
    rc, raw = af('dags', 'test', 'brewline_nightly', '2026-03-14', dags=d)
    text('af.nightly_run', clean_console(raw))
    rows = tis_table(HOME_TEST, 'brewline_nightly', 'af.nightly_ti')
    counts('af.nightly', {'rc': rc, 'order': [r[0] for r in rows]})


def sec_render():
    d = mini('brewline_templates.py')
    migrate(HOME_TEST)
    out = {}
    for t in ('dates', 'partition_path', 'previous_day'):
        rc, raw = af('tasks', 'render', 'brewline_templates', t, '2026-03-14', dags=d)
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
    ('weekly_trigger', {'kind': 'CronTriggerTimetable', 'args': {'expr': '0 6 * * 1', 'timezone': 'UTC'}}),
    ('delta_trigger_6h', {'kind': 'DeltaTriggerTimetable', 'args': {'delta': {'hours': 6}}}),
    ('delta_interval_6h', {'kind': 'DeltaDataIntervalTimetable', 'args': {'delta': {'hours': 6}}}),
]


def sec_timetables():
    migrate(HOME_TEST)
    res = {}
    for label, spec in TIMETABLES:
        spec = dict(spec, start='2026-03-01T00:00:00+00:00', n=4, catchup=True,
                    manual_at=['2026-03-14T01:30:00+00:00', '2026-03-14T15:30:00+00:00', '2026-03-14T23:30:00+00:00'])
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
# 4. a small running Airflow: api-server, scheduler, dag-processor and triggerer, LocalExecutor, SQLite. Bound to 127.0.0.1 only.
# =====================================================================================================================================
os.environ['no_proxy'] = os.environ['NO_PROXY'] = '127.0.0.1,localhost'


class Stack:
    NAMES = ('api-server', 'scheduler', 'dag-processor', 'triggerer')

    def __init__(self, extra=None):
        self.home = HOME_STACK
        self.port = free_port()
        self.extra = {
            'AIRFLOW__CORE__EXECUTION_API_SERVER_URL': 'http://127.0.0.1:%d/execution/' % self.port,
            'AIRFLOW__API_AUTH__JWT_SECRET': 'brewline-demo-secret-not-for-production',
            'AIRFLOW__CORE__SIMPLE_AUTH_MANAGER_ALL_ADMINS': 'True',
            'AIRFLOW__DAG_PROCESSOR__REFRESH_INTERVAL': '3',
            'AIRFLOW__DAG_PROCESSOR__MIN_FILE_PROCESS_INTERVAL': '3',
            'AIRFLOW_CONN_FS_DEFAULT': json.dumps({'conn_type': 'fs', 'extra': {'path': '/'}}),
        }
        self.extra.update(extra or {})
        self.procs = {}
        self.health = None

    def start(self):
        migrate(self.home, self.extra)
        logs = WORK / 'stack_logs'
        logs.mkdir(exist_ok=True)
        env = env_for(self.home, DAGS, self.extra)
        cmds = {'api-server': ['api-server', '-H', '127.0.0.1', '-p', str(self.port)], 'scheduler': ['scheduler', '--skip-serve-logs'], 'dag-processor': ['dag-processor'], 'triggerer': ['triggerer', '--skip-serve-logs']}
        for name in self.NAMES:
            f = open(logs / (name + '.log'), 'w')
            self.procs[name] = subprocess.Popen([AIRFLOW] + cmds[name], stdout=f, stderr=subprocess.STDOUT, env=env, start_new_session=True)
        import urllib.request
        url = 'http://127.0.0.1:%d/api/v2/monitor/health' % self.port
        for _ in range(150):
            try:
                with urllib.request.urlopen(url, timeout=3) as r:
                    h = json.loads(r.read())
                if h.get('scheduler', {}).get('latest_scheduler_heartbeat') and h.get('triggerer', {}).get('latest_triggerer_heartbeat') and h.get('dag_processor', {}).get('latest_dag_processor_heartbeat'):
                    self.health = h
                    return
            except Exception:
                pass
            time.sleep(1)
        raise RuntimeError('the stack did not become healthy')

    def health_now(self):
        import urllib.request
        with urllib.request.urlopen('http://127.0.0.1:%d/api/v2/monitor/health' % self.port, timeout=5) as r:
            return json.loads(r.read())

    def stop(self):
        for p in self.procs.values():
            try:
                os.killpg(p.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
        for p in self.procs.values():
            try:
                p.wait(timeout=20)
            except subprocess.TimeoutExpired:
                try:
                    os.killpg(p.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass

    # --- helpers
    def cli(self, *a, check=False, timeout=120):
        return af(*a, home=self.home, extra=self.extra, check=check, timeout=timeout)

    def sql(self, q, params=()):
        for _ in range(30):
            try:
                return sqlite_rows(self.home, q, params)
            except sqlite3.OperationalError:
                time.sleep(0.3)
        return sqlite_rows(self.home, q, params)

    def wait_dag(self, dag_id, timeout=90):
        t0 = time.time()
        while time.time() - t0 < timeout:
            _, rows = self.sql('SELECT dag_id FROM dag WHERE dag_id = ?', (dag_id,))
            if rows:
                return
            time.sleep(1)
        raise RuntimeError('DAG %s was not parsed in %ds' % (dag_id, timeout))

    def unpause(self, dag_id):
        self.wait_dag(dag_id)
        self.cli('dags', 'unpause', dag_id)

    def runs(self, dag_id):
        _, rows = self.sql('SELECT run_id, run_type, state, logical_date, data_interval_start, data_interval_end, run_after, start_date, end_date FROM dag_run WHERE dag_id = ? ORDER BY run_after, id', (dag_id,))
        return rows

    def trigger(self, dag_id, conf=None, logical_date=None, run_id=None):
        before = {r[0] for r in self.runs(dag_id)}
        a = ['dags', 'trigger', dag_id]
        if conf is not None:
            a += ['--conf', json.dumps(conf)]
        if logical_date:
            a += ['--logical-date', logical_date]
        if run_id:
            a += ['--run-id', run_id]
        self.cli(*a, check=True)
        for _ in range(30):
            new = [r for r in self.runs(dag_id) if r[0] not in before]
            if new:
                return new[-1][0]
            time.sleep(0.5)
        raise RuntimeError('no run appeared for ' + dag_id)

    def wait_run(self, dag_id, run_id, timeout=120, states=('success', 'failed')):
        t0 = time.time()
        while time.time() - t0 < timeout:
            _, rows = self.sql('SELECT state FROM dag_run WHERE dag_id = ? AND run_id = ?', (dag_id, run_id))
            if rows and rows[0][0] in states:
                return rows[0][0]
            time.sleep(0.5)
        raise RuntimeError('run %s of %s did not finish in %ds' % (run_id, dag_id, timeout))

    def tis(self, dag_id, run_id):
        _, rows = self.sql('SELECT task_id, region_index, state, try_number, start_date, end_date, duration, pool, priority_weight FROM task_instance WHERE dag_id = ? AND run_id = ? AND working_set = 1 ORDER BY task_id, region_index', (dag_id, run_id))
        return rows

    def sample(self, dag_id, run_id, until, timeout=60, step=0.5, each=None):
        """Poll the task states every `step` seconds. Returns [(t, {task_id: state})]. until(snapshot) ends the loop, each(t) runs after every poll."""
        t0 = time.time()
        series = []
        while time.time() - t0 < timeout:
            snap = {}
            for t_id, idx, state, *_ in self.tis(dag_id, run_id):
                snap['%s[%d]' % (t_id, idx) if idx >= 0 else t_id] = state
            t = round(time.time() - t0, 1)
            series.append((t, snap))
            if each:
                each(t)
            if snap and until(snap):
                break
            time.sleep(step)
        return series

    def task_log(self, dag_id, run_id, task_id, attempt=1, map_index=None):
        return read_task_log(self.home, dag_id, run_id, task_id, attempt, map_index)


def segments(series, tasks=None):
    """From polled snapshots to {task: [[state, from, to], ...]} with equal neighbours merged."""
    out = {}
    names = tasks or sorted({k for _, s in series for k in s})
    for n in names:
        segs = []
        for t, snap in series:
            st = snap.get(n) or 'none'
            if segs and segs[-1][0] == st:
                segs[-1][2] = t
            else:
                segs.append([st, t, t])
        out[n] = segs
    return out


_STACK = {}


def the_stack():
    if 'stack' not in _STACK:
        copy_dags()
        st = Stack()
        st.start()
        _STACK['stack'] = st
    return _STACK['stack']


def close_stack():
    st = _STACK.pop('stack', None)
    if st:
        st.stop()


def write_dag(name, body):
    """A DAG file that depends on today's date: written for the run, and stored shifted to the lesson's date."""
    (DAGS / name).write_text(body)
    file('dags/' + name, norm(body, shift=True))


def sec_stack_basic():
    st = the_stack()
    # what the four processes say when they start
    startup = {}
    for name in Stack.NAMES:
        raw = (WORK / 'stack_logs' / (name + '.log')).read_text()
        lines = []
        for ln in raw.splitlines():
            m = LINE.match(ln)
            if m and not NOISE.search(ln):
                lvl, rest = m.group(2), m.group(3)
                rest = re.sub(r'\s+\[[\w.]+\](\s+\w+=.*)?$', '', rest)
                lines.append('[%s] %s' % (lvl, norm(rest)))
        lines = [ln for ln in lines if ln.strip() not in ('[info]',) and not ln.startswith('[info] Worker starting up')][:10]
        startup[name] = [re.sub(r'http://127\.0\.0\.1:\d+', 'http://127.0.0.1:<port>', ln) for ln in lines]
    counts('af.stack_startup', startup)
    h = st.health_now()
    counts('af.health', json.loads(re.sub(r'\d{4}-\d{2}-\d{2}T[\d:.]+\+00:00', '<time>', json.dumps(h))))
    rc, out = st.cli('jobs', 'check', '--job-type', 'SchedulerJob')
    text('af.jobs_check', norm(out))
    rc, out = st.cli('jobs', 'check', '--job-type', 'TriggererJob')
    text('af.jobs_check_triggerer', norm(out))
    _, rows = st.sql('SELECT job_type, state FROM job ORDER BY job_type')
    table('af.jobs', ['job_type', 'state'], rows)
    counts('af.stack', {'executor': st.cli('config', 'get-value', 'core', 'executor')[1].strip(), 'database': 'SQLite', 'processes': list(Stack.NAMES)})


def sec_ctx():
    st = the_stack()
    st.unpause('brewline_ctx')
    run_m = st.trigger('brewline_ctx')
    for _ in range(90):
        runs = st.runs('brewline_ctx')
        if len(runs) >= 2 and all(r[2] in ('success', 'failed') for r in runs):
            break
        time.sleep(1)
    out = {}
    for r in st.runs('brewline_ctx'):
        kind = r[1]
        out[kind] = {'run_id': norm(r[0], shift=True), 'state': r[2], 'has_logical_date': bool(r[3]), 'has_data_interval': bool(r[4]),
                     'logical_date': norm(str(r[3]), shift=True) if r[3] else None,
                     'show_log': norm(show_log(st.task_log('brewline_ctx', r[0], 'show')), shift=True),
                     'templated_log': norm(show_log(st.task_log('brewline_ctx', r[0], 'templated')), shift=True)}
    counts('af.ctx', out)


CATCHUP_TMPL = '''"""Catchup: what Airflow does about the days between start_date and today, when the DAG is switched on."""
import pendulum
from airflow.sdk import DAG
from airflow.providers.standard.operators.bash import BashOperator

with DAG(
    dag_id="%(dag_id)s",
    schedule="@daily",
    start_date=pendulum.datetime(%(y)d, %(m)d, %(d)d, tz="UTC"),
    catchup=%(catchup)s,%(mar)s
) as dag:
    BashOperator(task_id="load", bash_command="sleep 3; echo loading {{ ds }}")
'''


def sec_catchup():
    st = the_stack()
    start = TODAY_REAL - datetime.timedelta(days=4)
    variants = [('brewline_catchup_off', False, None), ('brewline_catchup_on', True, 2), ('brewline_catchup_serial', True, 1)]
    for dag_id, catchup, mar in variants:
        write_dag(dag_id + '.py', CATCHUP_TMPL % {'dag_id': dag_id, 'y': start.year, 'm': start.month, 'd': start.day, 'catchup': catchup, 'mar': ('\n    max_active_runs=%d,' % mar) if mar else ''})
    for dag_id, catchup, mar in variants:
        st.unpause(dag_id)
    res = {}
    for dag_id, catchup, mar in variants:
        want = 5 if catchup else 1
        for _ in range(150):
            runs = st.runs(dag_id)
            if len(runs) >= want and all(r[2] in ('success', 'failed') for r in runs):
                break
            time.sleep(1)
        runs = st.runs(dag_id)
        spans = [(r[7], r[8]) for r in runs if r[7] and r[8]]
        events = sorted([(a, 1) for a, b in spans] + [(b, -1) for a, b in spans])
        cur = peak = 0
        for _, d in events:
            cur += d
            peak = max(peak, cur)
        res[dag_id] = {'catchup': catchup, 'max_active_runs': mar or 16,
                       'runs': [{'run_id': norm(r[0], shift=True), 'type': r[1], 'state': r[2], 'logical_date': norm(str(r[3]), shift=True), 'run_after': norm(str(r[6]), shift=True)} for r in runs],
                       'run_count': len(runs), 'peak_parallel_runs': peak}
    counts('af.catchup', {'today': TODAY_SHOWN.isoformat(), 'start_date': norm(start.isoformat(), shift=True), 'variants': res})


BACKFILL_TMPL = '''"""A daily load without catchup. Old days are filled with a backfill instead."""
import pendulum
from airflow.sdk import DAG
from airflow.providers.standard.operators.bash import BashOperator

with DAG(dag_id="brewline_backfill_demo", schedule="@daily", start_date=pendulum.datetime(%(y)d, %(m)d, %(d)d, tz="UTC"), catchup=False) as dag:
    BashOperator(task_id="load", bash_command="echo loading {{ ds }}")
'''


def sec_backfill():
    st = the_stack()
    s0 = TODAY_REAL - datetime.timedelta(days=12)
    frm = TODAY_REAL - datetime.timedelta(days=9)
    to = TODAY_REAL - datetime.timedelta(days=7)
    write_dag('brewline_backfill_demo.py', BACKFILL_TMPL % {'y': s0.year, 'm': s0.month, 'd': s0.day})
    st.unpause('brewline_backfill_demo')
    for _ in range(60):
        if any(r[2] == 'success' for r in st.runs('brewline_backfill_demo')):
            break
        time.sleep(1)
    f, t = frm.isoformat() + 'T00:00:00+00:00', to.isoformat() + 'T23:59:59+00:00'
    rc, dry = st.cli('backfill', 'create', '--dag-id', 'brewline_backfill_demo', '--from-date', f, '--to-date', t, '--dry-run')
    rc, real = st.cli('backfill', 'create', '--dag-id', 'brewline_backfill_demo', '--from-date', f, '--to-date', t, '--max-active-runs', '2')
    for _ in range(90):
        runs = [r for r in st.runs('brewline_backfill_demo') if r[1] == 'backfill']
        if len(runs) >= 3 and all(r[2] in ('success', 'failed') for r in runs):
            break
        time.sleep(1)
    n_before = len([r for r in st.runs('brewline_backfill_demo') if r[1] == 'backfill'])
    rc, again = st.cli('backfill', 'create', '--dag-id', 'brewline_backfill_demo', '--from-date', f, '--to-date', t, '--reprocess-behavior', 'none')
    time.sleep(4)
    _, cn0 = st.sql("SELECT run_id, clear_number FROM dag_run WHERE dag_id = 'brewline_backfill_demo' AND run_type = 'backfill' ORDER BY run_after")
    rc, comp = st.cli('backfill', 'create', '--dag-id', 'brewline_backfill_demo', '--from-date', f, '--to-date', t, '--reprocess-behavior', 'completed')
    time.sleep(12)
    _, cn1 = st.sql("SELECT run_id, clear_number FROM dag_run WHERE dag_id = 'brewline_backfill_demo' AND run_type = 'backfill' ORDER BY run_after")
    runs_after = st.runs('brewline_backfill_demo')
    n_after = len([r for r in runs_after if r[1] == 'backfill'])
    _, bf = st.sql('SELECT dag_id, from_date, to_date, max_active_runs, reprocess_behavior FROM backfill ORDER BY id')
    counts('af.backfill', {'window': [norm(f, shift=True), norm(t, shift=True)],
                           'created': [{'run_id': norm(r[0], shift=True), 'type': r[1], 'state': r[2], 'logical_date': norm(str(r[3]), shift=True)} for r in runs_after if r[1] == 'backfill'],
                           'backfill_rows': [[a, norm(str(b), shift=True), norm(str(c), shift=True), d, e] for a, b, c, d, e in bf],
                           'runs_after_first_call': n_before, 'runs_after_second_call': n_after, 'clear_numbers_after_none': [r[1] for r in cn0], 'clear_numbers_after_completed': [r[1] for r in cn1]})
    text('af.backfill_dry_run', norm(clean_console(dry, keep=('creating dag run', 'Created', 'Dry', 'dry')), shift=True) or norm(dry[-600:], shift=True))
    text('af.backfill_create', norm(clean_console(real, keep=('creating dag run', 'Created')), shift=True))


# =====================================================================================================================================
# 5. failure: trigger rules, branching, retries, timeouts and callbacks
# =====================================================================================================================================
def latest_run(home, dag_id):
    _, rows = sqlite_rows(home, 'SELECT run_id FROM dag_run WHERE dag_id = ? ORDER BY id DESC LIMIT 1', (dag_id,))
    return rows[0][0]


def run_tis(home, dag_id, run_id):
    _, rows = sqlite_rows(home, 'SELECT task_id, region_index, state, try_number FROM task_instance WHERE dag_id = ? AND run_id = ? AND working_set = 1 ORDER BY task_id, region_index', (dag_id, run_id))
    return rows


def sec_trigger_rules():
    migrate(HOME_TEST)
    d = WORK / 'trigger_dags'
    d.mkdir(exist_ok=True)
    shutil.copy(HERE / 'gen' / 'trigger_rules_gen.py', d / 'trigger_rules_gen.py')
    rules = probe('rules')
    mixes = ['300', '210', '201', '120', '111', '102', '030', '021', '012', '003']
    results = {}
    for rule in rules:
        r = probe('test', 'trigger_rule_' + rule, '2026-03-14', dags=d, extra={'AF_PROBE_NOCONSOLE': '1'})
        states = {ti['task_id']: ti['state'] for ti in r['tis']}
        results[rule] = {m: states['child_' + m] for m in mixes}
    counts('af.trigger_rules', {'rules': rules, 'mixes': mixes, 'meaning': 'three parents: succeeded, failed, skipped (digits are the counts)', 'results': results})


def sec_branch():
    migrate(HOME_TEST)
    d = mini('brewline_branch.py')
    out = {}
    for label, conf in (('incremental', {'full_refresh': False}), ('full', {'full_refresh': True})):
        rc, raw = af('dags', 'test', 'brewline_branch', '2026-03-14', '--conf', json.dumps(conf), dags=d)
        run = latest_run(HOME_TEST, 'brewline_branch')
        out[label] = {'conf': conf, 'states': {t: s for t, _, s, _ in run_tis(HOME_TEST, 'brewline_branch', run)}, 'printed': [ln for ln in clean_console(raw).splitlines() if not ln.startswith('[')]}
    counts('af.branch', out)


def sec_mapping():
    migrate(HOME_TEST)
    d = mini('brewline_mapping.py', 'brewline_mapping_edge.py')
    rc, raw = af('dags', 'test', 'brewline_mapping', '2026-03-14', dags=d)
    run = latest_run(HOME_TEST, 'brewline_mapping')
    rows = run_tis(HOME_TEST, 'brewline_mapping', run)
    table('af.mapping_ti', ['task_id', 'map_index', 'state', 'try_number'], rows)
    xs = xcoms(HOME_TEST, 'brewline_mapping')
    table('af.mapping_xcom', ['task_id', 'map_index', 'key', 'value'], xs)
    text('af.mapping_run', '\n'.join(sorted(ln for ln in clean_console(raw, keep=()).splitlines() if ln.startswith('loading') or ln.startswith('loaded'))))
    # an empty list, and a list that is too long
    rc, raw = af('dags', 'test', 'brewline_map_empty', '2026-03-14', dags=d)
    run = latest_run(HOME_TEST, 'brewline_map_empty')
    empty = {t: s for t, _, s, _ in run_tis(HOME_TEST, 'brewline_map_empty', run)}
    rc, raw = af('dags', 'test', 'brewline_map_big', '2026-03-14', dags=d)
    run = latest_run(HOME_TEST, 'brewline_map_big')
    big = {t: s for t, _, s, _ in run_tis(HOME_TEST, 'brewline_map_big', run)}
    m = re.search(r"Server error detail: (\{.*\})", raw)
    rc2, cfg = af('config', 'get-value', 'core', 'max_map_length')
    counts('af.mapping_edge', {'empty': empty, 'big': big, 'big_list_length': 1100, 'max_map_length': cfg.strip(), 'big_error': m.group(1).replace("'", '"') if m else ''})


def sec_xcom():
    migrate(HOME_TEST)
    d = mini('brewline_xcom.py', 'brewline_xcom_size.py')
    af('dags', 'test', 'brewline_xcom', '2026-03-14', dags=d)
    table('af.xcom', ['task_id', 'key', 'value'], [[a, c, d] for a, _, c, d in xcoms(HOME_TEST, 'brewline_xcom')])
    rows, secs = [], []
    t0 = time.time()
    rc, raw = af('dags', 'test', 'brewline_xcom_size', '2026-03-14', dags=d)
    run = latest_run(HOME_TEST, 'brewline_xcom_size')
    _, r = sqlite_rows(HOME_TEST, 'SELECT ti.task_id, ti.state, length(x.value) FROM task_instance ti LEFT JOIN xcom_v2 x ON x.task_instance_id = ti.id WHERE ti.dag_id = ? AND ti.run_id = ? ORDER BY length(x.value)', ('brewline_xcom_size', run))
    counts('af.xcom_size', {'rows': [{'task': a, 'state': b, 'stored_bytes': c} for a, b, c in r], 'database': 'SQLite'})


def sql_rows(path, q, params=()):
    con = sqlite3.connect(path)
    try:
        return con.execute(q, params).fetchall()
    finally:
        con.close()


def sec_idempotent():
    migrate(HOME_TEST)
    d = mini('brewline_load_append.py', 'brewline_load_replace.py', 'brewline_load_upsert.py')
    db = OUTDIR / 'brewline.db'
    if db.exists():
        db.unlink()
    steps = [('first run, day 14', '2026-03-14'), ('same day again', '2026-03-14'), ('day 15', '2026-03-15'), ('day 14 once more', '2026-03-14')]
    res = {}
    for dag_id, tbl in (('brewline_load_append', 'orders_append'), ('brewline_load_replace', 'orders_replace'), ('brewline_load_upsert', 'orders_upsert')):
        r = probe('idem', dag_id, tbl, db, ','.join(x[1] for x in steps), dags=d)
        res[dag_id] = [{'step': label, 'day': day, 'rows': row['rows'], 'per_day': row['per_day']} for (label, day), row in zip(steps, r)]
    counts('af.idempotent', res)


def sec_parse_cost():
    d = WORK / 'parse'
    d.mkdir(exist_ok=True)
    light = d / 'light.py'
    light.write_text(textwrap.dedent('''
        import pendulum
        from airflow.sdk import DAG
        from airflow.providers.standard.operators.empty import EmptyOperator
        with DAG(dag_id="light", schedule=None, start_date=pendulum.datetime(2026, 3, 1, tz="UTC")) as dag:
            EmptyOperator(task_id="start")
    '''))
    shutil.copy(BROKEN_SRC / 'toplevel_slow.py', d / 'toplevel_slow.py')
    res = {}
    for name in ('light.py', 'toplevel_slow.py'):
        r = probe('parse_cost', d / name, 5)
        res[name] = sorted(r['times'])
    med = {k: v[len(v) // 2] for k, v in res.items()}
    # a hundred light files
    many = WORK / 'parse_many'
    many.mkdir(exist_ok=True)
    for i in range(100):
        (many / ('dag_%03d.py' % i)).write_text(light.read_text().replace('"light"', '"light_%03d"' % i))
    r = probe('parse_cost', many, 3)
    counts('af.parse_cost', {'single_file_seconds': res, 'median_seconds': med, 'sleep_at_top_level_seconds': 2, 'hundred_files_seconds': sorted(r['times']),
                             'note': 'wall time of a fresh DagBag in one process on this machine, including the import of Airflow code'})


# ----- the stack: retries, timeouts and callbacks, with what the worker wrote
def ts_of(row):
    t = row.get('timestamp')
    return datetime.datetime.fromisoformat(t.replace('Z', '+00:00')).timestamp() if t else None


def sec_retries():
    st = the_stack()
    for d in ('brewline_flaky', 'brewline_timeout', 'brewline_callbacks'):
        st.unpause(d)
    run = st.trigger('brewline_flaky')
    series = st.sample('brewline_flaky', run, until=lambda s: s.get('load') in ('success', 'failed'), timeout=120)
    segs = segments(series, ['extract'])['extract']
    logs, gaps, seen = {}, [], []
    spans = []
    for n in (1, 2, 3):
        rows = st.task_log('brewline_flaky', run, 'extract', n)
        if rows:
            logs[str(n)] = norm(show_log(rows))
            ts = [ts_of(r) for r in rows if ts_of(r)]
            spans.append((min(ts), max(ts)))
    for a, b in zip(spans, spans[1:]):
        gaps.append(round(b[0] - a[1], 1))
    _, tis = st.sql('SELECT state, try_number, max_tries FROM task_instance WHERE dag_id = ? AND run_id = ? AND task_id = ? AND working_set = 1', ('brewline_flaky', run, 'extract'))
    _, tries = st.sql('SELECT try_number, state, working_set, archived_reason FROM task_instance WHERE dag_id = ? AND run_id = ? AND task_id = ? ORDER BY try_number', ('brewline_flaky', run, 'extract'))
    table('af.retries_rows', ['try_number', 'state', 'working_set', 'archived_reason'], [[a, b, c if c is not None else 'NULL', d if d else 'NULL'] for a, b, c, d in tries])
    counts('af.retries', {'retries': 3, 'retry_delay_seconds': 2, 'final_state': tis[0][0], 'try_number': tis[0][1], 'max_tries': tis[0][2],
                          'gap_seconds_between_tries': gaps, 'attempt_logs': logs})
    # a task that runs longer than its timeout
    run = st.trigger('brewline_timeout')
    st.wait_run('brewline_timeout', run, timeout=90)
    rows = st.task_log('brewline_timeout', run, 'slow_export', 1)
    ts = [ts_of(r) for r in rows if ts_of(r)]
    _, tis = st.sql('SELECT state, duration FROM task_instance WHERE dag_id = ? AND run_id = ? AND working_set = 1', ('brewline_timeout', run))
    err = [r for r in rows if r.get('level') == 'error']
    detail = ''
    for r in err:
        ed = r.get('error_detail')
        if ed:
            detail = '%s: %s' % (ed[0].get('exc_type'), ed[0].get('exc_value'))
    counts('af.timeout', {'state': tis[0][0], 'execution_timeout_seconds': 3, 'sleep_seconds': 10, 'seconds_until_failed': round(tis[0][1] or 0), 'error': norm(detail), 'log': norm(show_log(rows))})
    # callbacks
    cb = OUTDIR / 'callbacks.log'
    if cb.exists():
        cb.unlink()
    run = st.trigger('brewline_callbacks')
    st.wait_run('brewline_callbacks', run, timeout=90)
    time.sleep(3)
    counts('af.callbacks', {'file': cb.read_text().splitlines() if cb.exists() else [], 'task_retries': 1, 'run_state': st.runs('brewline_callbacks')[-1][2]})


BLOCKED = '''"""Four reasons why a task does not start. The recorder asks Airflow while each one is true."""
import pendulum
from airflow.sdk import DAG
from airflow.providers.standard.operators.bash import BashOperator

START = pendulum.datetime(2026, 3, 1, tz="UTC")

with DAG(dag_id="brewline_blocked", schedule=None, start_date=START, catchup=False) as dag:
    hold_slot = BashOperator(task_id="hold_slot", bash_command="sleep 30", pool="tiny_pool")
    wait_for_slot = BashOperator(task_id="wait_for_slot", bash_command="echo report", pool="tiny_pool")
    slow_extract = BashOperator(task_id="slow_extract", bash_command="sleep 30")
    load_after_extract = BashOperator(task_id="load_after_extract", bash_command="echo load")
    slow_extract >> load_after_extract

with DAG(dag_id="brewline_blocked_limit", schedule=None, start_date=START, catchup=False, max_active_tasks=1) as dag2:
    BashOperator(task_id="long_a", bash_command="sleep 30")
    BashOperator(task_id="long_b", bash_command="echo b")

with DAG(dag_id="brewline_blocked_past", schedule=None, start_date=START, catchup=False, default_args={"depends_on_past": True, "retries": 0}) as dag3:
    BashOperator(task_id="load", bash_command="test -f /nonexistent_partner_file")
'''


def sec_failed_deps():
    """Why a task does not run: the answers that Airflow gives with `airflow tasks failed-deps` while the reason is true."""
    st = the_stack()
    write_dag('brewline_blocked.py', BLOCKED)
    st.cli('pools', 'set', 'tiny_pool', '1', 'one slot')
    for d in ('brewline_blocked', 'brewline_blocked_limit', 'brewline_blocked_past'):
        st.unpause(d)
    run_past1 = st.trigger('brewline_blocked_past', logical_date=(TODAY_REAL - datetime.timedelta(days=1)).isoformat() + 'T00:00:00+00:00')
    st.wait_run('brewline_blocked_past', run_past1, timeout=90)
    run_b = st.trigger('brewline_blocked')
    run_l = st.trigger('brewline_blocked_limit')
    run_past2 = st.trigger('brewline_blocked_past', logical_date=TODAY_REAL.isoformat() + 'T00:00:00+00:00')
    time.sleep(14)
    out = {}
    for label, dag_id, run, task_id in (('pool_full', 'brewline_blocked', run_b, 'wait_for_slot'), ('upstream_running', 'brewline_blocked', run_b, 'load_after_extract'),
                                         ('dag_limit', 'brewline_blocked_limit', run_l, 'long_b'), ('depends_on_past', 'brewline_blocked_past', run_past2, 'load')):
        _, rows = st.sql('SELECT state FROM task_instance WHERE dag_id = ? AND run_id = ? AND task_id = ? AND working_set = 1', (dag_id, run, task_id))
        rc, fd = st.cli('tasks', 'failed-deps', dag_id, task_id, run)
        out[label] = {'dag_id': dag_id, 'task_id': task_id, 'state': rows[0][0] if rows else None, 'failed_deps': norm(fd.strip())}
    for dag_id, run in (('brewline_blocked', run_b), ('brewline_blocked_limit', run_l)):
        st.wait_run(dag_id, run, timeout=120)
    counts('af.failed_deps', out)



# =====================================================================================================================================
# 6. waiting and capacity: sensors, pools, DAG limits, priorities; assets
# =====================================================================================================================================
def timeline_facts(series, tasks, step=0.5):
    """Numbers that do not depend on the exact second: how many tasks held a slot, and for how long."""
    holding = ('running', 'queued')
    per_sample = [sum(1 for t in tasks if snap.get(t) in holding) for _, snap in series]
    running = [sum(1 for t in tasks if snap.get(t) == 'running') for _, snap in series]
    deferred = [sum(1 for t in tasks if snap.get(t) == 'deferred') for _, snap in series]
    waiting = [sum(1 for t in tasks if snap.get(t) in ('scheduled', 'none', None)) for _, snap in series]
    done_t = next((t for t, snap in series if all(snap.get(x) == 'success' for x in tasks)), None)
    return {'max_holding_a_slot': max(per_sample), 'max_running': max(running), 'max_deferred': max(deferred), 'slot_seconds': round(sum(per_sample) * step, 1),
            'seconds_until_all_done': round(done_t, 1) if done_t is not None else None}


def sec_waiting():
    st = the_stack()
    st.cli('pools', 'set', 'partner_pool', '2', 'two slots for partner files')
    modes = ('poke', 'reschedule', 'deferrable')
    for m in modes:
        st.unpause('brewline_wait_' + m)
    res = {}
    tasks = ['wait_%d' % n for n in range(1, 5)]
    for m in modes:
        for f in WATCH.glob('*'):
            f.unlink()
        run = st.trigger('brewline_wait_' + m)
        made = {'t': None}

        def each(t, m=m, made=made):
            if made['t'] is None and t >= 14.0:
                for n in range(1, 5):
                    (WATCH / ('%s_partner_%d.csv' % (m, n))).write_text('partner file')
                made['t'] = t
        series = st.sample('brewline_wait_' + m, run, until=lambda s: len(s) == 4 and all(v in ('success', 'failed') for v in s.values()), timeout=90, each=each)
        facts = timeline_facts(series, tasks)
        segs = segments(series, tasks)
        res[m] = {'files_created_at': round(made['t'] or 0), 'facts': facts, 'segments': {k: [[a, round(b), round(c)] for a, b, c in v] for k, v in segs.items()},
                  'states_seen': sorted({x[0] for v in segs.values() for x in v if x[0] != 'none'}), 'pool_slots': 2, 'poke_interval_seconds': 2}
    counts('af.waiting', res)


def starts(st, dag_id, run):
    """Start and end offsets in seconds of every task of a run, from the metadata database."""
    _, rows = st.sql('SELECT task_id, start_date, end_date, priority_weight FROM task_instance WHERE dag_id = ? AND run_id = ? AND working_set = 1 ORDER BY start_date', (dag_id, run))

    def p(x):
        return datetime.datetime.fromisoformat(x).timestamp()
    t0 = min(p(r[1]) for r in rows)
    return [{'task': r[0], 'start': round(p(r[1]) - t0, 1), 'end': round(p(r[2]) - t0, 1), 'priority_weight': r[3]} for r in rows]


def sec_pools():
    st = the_stack()
    st.cli('pools', 'set', 'warehouse_pool', '2', 'two slots for the warehouse')
    st.cli('pools', 'set', 'single_pool', '1', 'one slot')
    for d in ('brewline_pool_two_slots', 'brewline_pool_priority', 'brewline_dag_limit'):
        st.unpause(d)
    out = {}
    for dag_id, tasks in (('brewline_pool_two_slots', ['load_%d' % n for n in range(1, 7)]), ('brewline_dag_limit', ['load_%d' % n for n in range(1, 7)]), ('brewline_pool_priority', ['report_%d' % n for n in range(1, 6)])):
        run = st.trigger(dag_id)
        st.wait_run(dag_id, run, timeout=120)
        rows = starts(st, dag_id, run)
        ev = sorted([(r['start'], 1) for r in rows] + [(r['end'], -1) for r in rows])
        cur = peak = 0
        for _, d in ev:
            cur += d
            peak = max(peak, cur)
        order = [r['task'] for r in sorted(rows, key=lambda r: r['start'])]
        out[dag_id] = {'tasks': rows, 'peak_running': peak, 'start_order': order, 'tasks_count': len(tasks), 'seconds_each': 3 if dag_id != 'brewline_pool_priority' else 2}
    out['brewline_pool_two_slots']['pool_slots'] = 2
    out['brewline_dag_limit']['max_active_tasks'] = 2
    out['brewline_pool_priority']['pool_slots'] = 1
    counts('af.pools', out)
    rc, o = st.cli('pools', 'list')
    text('af.pools_list', norm(o.strip()))


def sec_assets():
    st = the_stack()
    for d in ('brewline_land_orders', 'brewline_land_customers', 'brewline_orders_daily', 'brewline_customer_orders'):
        st.unpause(d)
    for _ in range(3):
        st.trigger('brewline_land_orders')
        time.sleep(3)
    for _ in range(80):
        runs = st.runs('brewline_orders_daily')
        if len(runs) >= 3 and all(r[2] in ('success', 'failed') for r in runs):
            break
        time.sleep(1)
    daily = st.runs('brewline_orders_daily')
    logs = [norm(show_log(st.task_log('brewline_orders_daily', r[0], 'build')), shift=True) for r in daily]
    before_and = len(st.runs('brewline_customer_orders'))
    st.trigger('brewline_land_customers')
    for _ in range(80):
        runs = st.runs('brewline_customer_orders')
        if runs and all(r[2] in ('success', 'failed') for r in runs):
            break
        time.sleep(1)
    both = st.runs('brewline_customer_orders')
    and_logs = [norm(show_log(st.task_log('brewline_customer_orders', r[0], 'build')), shift=True) for r in both]
    # a customers event on its own does not start the AND consumer, because the orders events were already used. An orders event after it does.
    st.trigger('brewline_land_customers')
    time.sleep(12)
    after_customers = len(st.runs('brewline_customer_orders'))
    st.trigger('brewline_land_orders')
    for _ in range(80):
        runs = st.runs('brewline_customer_orders')
        if len(runs) > after_customers and all(r[2] in ('success', 'failed') for r in runs):
            break
        time.sleep(1)
    final = st.runs('brewline_customer_orders')
    final_logs = [norm(show_log(st.task_log('brewline_customer_orders', r[0], 'build')), shift=True) for r in final]
    _, ev = st.sql('SELECT a.name, e.source_dag_id, count(*) FROM asset_event e JOIN asset a ON a.id = e.asset_id GROUP BY a.name, e.source_dag_id ORDER BY a.name')
    _, assets = st.sql('SELECT name, uri FROM asset ORDER BY name')
    rc, listing = st.cli('assets', 'list')
    counts('af.assets', {'producer_runs': 3, 'consumer_runs_after_3_events': len(daily), 'consumer_run_types': sorted({r[1] for r in daily}), 'consumer_logs': logs,
                         'and_consumer_runs_before': before_and, 'and_consumer_runs_after': len(both), 'and_consumer_logs': and_logs,
                         'and_runs_after_extra_customers_event': after_customers, 'and_runs_after_extra_orders_event': len(final), 'and_consumer_logs_all': final_logs,
                         'events': [{'asset': a, 'source_dag': b, 'events': c} for a, b, c in ev], 'assets': [{'name': a, 'uri': b} for a, b in assets]})
    text('af.assets_list', norm(listing.strip()))


# =====================================================================================================================================
# 7. configuration, the CLI, secrets, newer failure handling, versions of a DAG, the metadata database
# =====================================================================================================================================
CONFIG_KEYS = [
    ('core', 'executor'), ('core', 'parallelism'), ('core', 'max_active_tasks_per_dag'), ('core', 'max_active_runs_per_dag'), ('core', 'max_map_length'),
    ('core', 'default_task_retries'), ('core', 'dags_are_paused_at_creation'), ('core', 'default_timezone'), ('core', 'dagbag_import_timeout'),
    ('core', 'dag_file_processor_timeout'), ('core', 'load_examples'), ('core', 'dag_run_conf_overrides_params'), ('core', 'default_pool_task_slot_count'),
    ('scheduler', 'catchup_by_default'), ('scheduler', 'create_cron_data_intervals'), ('scheduler', 'max_tis_per_query'), ('scheduler', 'task_instance_heartbeat_timeout'),
    ('scheduler', 'scheduler_idle_sleep_time'), ('scheduler', 'max_dagruns_to_create_per_loop'), ('scheduler', 'job_heartbeat_sec'), ('scheduler', 'batch_asset_events'),
    ('dag_processor', 'refresh_interval'), ('dag_processor', 'min_file_process_interval'), ('dag_processor', 'parsing_processes'), ('dag_processor', 'dag_file_processor_timeout'),
    ('triggerer', 'capacity'), ('api', 'port'), ('logging', 'remote_logging'), ('secrets', 'backend'), ('workers', 'execution_api_retries'),
    ('database', 'max_db_retries'), ('metrics', 'statsd_on'),
]


def sec_config():
    migrate(HOME_TEST)
    rows = []
    for sec, key in CONFIG_KEYS:
        rc, out = af('config', 'get-value', sec, key)
        val = out.strip().splitlines()[-1] if out.strip() else ''
        if rc == 0 and 'error' not in val.lower() and 'not found' not in val.lower() and 'Traceback' not in out:
            rows.append(['%s.%s' % (sec, key), val if val else '(empty)'])
    table('af.config', ['setting', 'default value'], rows)
    # a setting set through the environment wins over the file: AIRFLOW__SECTION__KEY
    rc, out = af('config', 'get-value', 'core', 'parallelism', extra={'AIRFLOW__CORE__PARALLELISM': '8'})
    counts('af.config_env', {'variable': 'AIRFLOW__CORE__PARALLELISM=8', 'value_read': out.strip().splitlines()[-1]})


def sec_cli():
    migrate(HOME_TEST)
    copy_dags()
    rc, out = af('version')
    text('af.version', out.strip().splitlines()[-1])
    rc, out = af('providers', 'list')
    rows = []
    for ln in out.splitlines():
        if '|' in ln and not ln.startswith('=') and not ln.lower().startswith('package_name'):
            cells = [c.strip() for c in ln.split('|')]
            if len(cells) >= 3 and cells[0].startswith('apache-airflow-providers'):
                rows.append([cells[0], cells[-1] if cells[-1] else cells[1]])
    table('af.providers', ['package', 'version'], [[a, b] for a, b in rows])
    rc, out = af('cheat-sheet')
    text('af.cheat_sheet', norm('\n'.join(out.strip().splitlines()[:40])))
    rc, out = af('db', 'check')
    text('af.db_check', norm('\n'.join(ln for ln in out.splitlines() if 'Connection successful' in ln or ln.startswith('ERROR')) or out.strip()[-200:]))
    rc, out = af('dags', 'list', '-o', 'json')
    try:
        listing = json.loads(out[out.index('['):])
        counts('af.dags_list', {'dags': len(listing), 'paused': sum(1 for d in listing if d.get('is_paused')), 'bundles': sorted({d.get('bundle_name') for d in listing})})
    except ValueError:
        pass


def sec_secrets():
    st_extra = {
        'AIRFLOW_CONN_BREWLINE_API': json.dumps({'conn_type': 'https', 'host': 'api.partner.example', 'login': 'brewline', 'password': 'env-s3cret-pass'}),
        'AIRFLOW_VAR_BREWLINE_REGION': 'sg', 'AIRFLOW_VAR_BREWLINE_API_SECRET': 'hunter2-api-key',
    }
    st = Stack(st_extra)
    st.start()
    try:
        # the same connection id also exists in the metadata database, with another password: which one wins?
        st.cli('connections', 'add', 'brewline_api', '--conn-type', 'https', '--conn-host', 'api.database.example', '--conn-login', 'brewline', '--conn-password', 'db-s3cret-pass')
        st.cli('connections', 'add', 'brewline_warehouse', '--conn-uri', 'postgres://loader:wh-s3cret@warehouse.brewline.example:5432/analytics')
        shutil.copy(DAGS_SRC / 'brewline_secrets.py', DAGS / 'brewline_secrets.py')
        shutil.copy(DAGS_SRC / 'brewline_db_access.py', DAGS / 'brewline_db_access.py')
        st.unpause('brewline_secrets')
        run = st.trigger('brewline_secrets')
        st.wait_run('brewline_secrets', run, timeout=90)
        log = show_log(st.task_log('brewline_secrets', run, 'use_secrets'))
        rc, out = st.cli('connections', 'get', 'brewline_api', '-o', 'json')
        rc2, lst = st.cli('connections', 'list')
        rc3, v = st.cli('variables', 'list')
        counts('af.secrets', {'task_log': norm(log), 'connection_in_env': 'AIRFLOW_CONN_BREWLINE_API (password env-s3cret-pass)', 'connection_in_database': 'brewline_api (password db-s3cret-pass)',
                              'winner_host': 'api.partner.example' if 'api.partner.example' in log else ('api.database.example' if 'api.database.example' in log else '?'),
                              'masked': '***' in log, 'plain_password_visible': any(x in log for x in ('env-s3cret-pass', 'db-s3cret-pass', 'hunter2-api-key', 'wh-s3cret'))})
        text('af.connections_list', norm(lst.strip()))
        # a task that reaches for the database
        st.unpause('brewline_db_access')
        run = st.trigger('brewline_db_access')
        st.wait_run('brewline_db_access', run, timeout=90)
        rows = st.task_log('brewline_db_access', run, 'count_runs')
        err = ''
        for r in rows:
            ed = r.get('error_detail')
            if ed:
                err = '%s: %s' % (ed[0].get('exc_type'), ed[0].get('exc_value'))
        counts('af.db_access', {'state': st.runs('brewline_db_access')[-1][2], 'error': norm(err)})
    finally:
        st.stop()


def sec_retry_policy():
    st = the_stack()
    shutil.copy(DAGS_SRC / 'brewline_retry_policy.py', DAGS / 'brewline_retry_policy.py')
    st.unpause('brewline_retry_policy')
    cf = OUTDIR / 'policy_count'
    if cf.exists():
        cf.unlink()
    run = st.trigger('brewline_retry_policy')
    st.wait_run('brewline_retry_policy', run, timeout=120)
    time.sleep(1)
    _, rows = st.sql('SELECT task_id, try_number, state, working_set, archived_reason, retry_reason FROM task_instance WHERE dag_id = ? AND run_id = ? ORDER BY task_id, try_number', ('brewline_retry_policy', run))
    table('af.retry_policy_rows', ['task_id', 'try_number', 'state', 'working_set', 'archived_reason', 'retry_reason'], [[a, b, c, d if d is not None else 'NULL', e or 'NULL', f or 'NULL'] for a, b, c, d, e, f in rows])
    counts('af.retry_policy', {'retries': 3, 'rules': ['PermissionError: FAIL', 'ConnectionError: RETRY after 1 second'],
                               'tries': {t: len([r for r in rows if r[0] == t]) for t in ('call_partner', 'read_secret')},
                               'final': {t: [r[2] for r in rows if r[0] == t][-1] for t in ('call_partner', 'read_secret')}})


def sec_deadline():
    st = the_stack()
    shutil.copy(DAGS_SRC / 'brewline_deadline.py', DAGS / 'brewline_deadline.py')
    shutil.copy(DAGS_SRC / 'brewline_alerts.py', DAGS / 'brewline_alerts.py')
    log = OUTDIR / 'deadline.log'
    if log.exists():
        log.unlink()
    st.unpause('brewline_deadline')
    run = st.trigger('brewline_deadline')
    t0 = time.time()
    seen = None
    for _ in range(70):
        if log.exists() and log.read_text().strip():
            seen = round(time.time() - t0)
            break
        time.sleep(1)
    state = st.wait_run('brewline_deadline', run, timeout=90)
    _, dl = st.sql('SELECT count(*) FROM deadline')
    _, da = st.sql('SELECT count(*) FROM deadline_alert')
    lines = []
    for ln in (WORK / 'stack_logs' / 'scheduler.log').read_text().splitlines():
        if 'allback' in ln and ('deadline_missed' in ln or 'ExecutorCallback' in ln or 'for callback' in ln):
            m = LINE.match(ln) or re.match(r'^(\d{4}-\d{2}-\d{2} [\d:.+]+)\s+\[(\w+)\s*\]\s+(.*)$', ln)
            if m:
                msg = re.sub(r'\s+\[[\w.]+\](\s+\w+=.*)?$', '', m.group(3))
                msg = re.sub(r'\s+(loc|duration|exit_code|workload_id|workload_type)=\S+', '', msg).strip()
                msg = re.sub(r'callback [0-9a-f]{8}-[0-9a-f-]+', 'callback <id>', msg)
                lines.append('[%s] %s' % (m.group(2), msg))
    text('af.deadline_log', '\n'.join(lines))
    counts('af.deadline', {'deadline_seconds': 5, 'task_seconds': 20, 'callback_file': log.read_text().splitlines() if log.exists() else [], 'callback_seen_before_run_end': seen is not None and seen < 18,
                           'run_state': state, 'deadline_rows': dl[0][0], 'deadline_alert_rows': da[0][0]})


def sec_versions():
    """A DAG file changes: Airflow keeps a version for each shape of the DAG, and a run keeps the version it started with."""
    st = the_stack()
    shutil.copy(DAGS_SRC / 'brewline_first.py', DAGS / 'brewline_first.py')
    st.unpause('brewline_first')
    r1 = st.trigger('brewline_first')
    st.wait_run('brewline_first', r1, timeout=90)
    _, v0 = st.sql('SELECT v.version_number, v.dag_id FROM dag_version v WHERE v.dag_id = ? ORDER BY v.version_number', ('brewline_first',))
    changed = (DAGS_SRC / 'brewline_first.py').read_text().replace("    load(transform(extract()))", "    @task\n    def audit(summary):\n        print('audited', summary)\n\n    summary = transform(extract())\n    load(summary)\n    audit(summary)")
    (DAGS / 'brewline_first.py').write_text(changed)
    for _ in range(60):
        _, v1 = st.sql('SELECT version_number FROM dag_version WHERE dag_id = ? ORDER BY version_number', ('brewline_first',))
        if len(v1) > len(v0):
            break
        time.sleep(1)
    r2 = st.trigger('brewline_first')
    st.wait_run('brewline_first', r2, timeout=90)
    _, rows = st.sql('SELECT ti.run_id, max(v.version_number) FROM task_instance ti JOIN dag_version v ON v.id = ti.dag_version_id WHERE ti.dag_id = ? AND ti.run_id IN (?, ?) AND ti.working_set = 1 GROUP BY ti.run_id ORDER BY min(ti.start_date)', ('brewline_first', r1, r2))
    _, tasks1 = st.sql('SELECT count(*) FROM task_instance WHERE dag_id = ? AND run_id = ? AND working_set = 1', ('brewline_first', r1))
    _, tasks2 = st.sql('SELECT count(*) FROM task_instance WHERE dag_id = ? AND run_id = ? AND working_set = 1', ('brewline_first', r2))
    counts('af.versions', {'versions_before': [x[0] for x in v0], 'versions_after': [x[0] for x in v1], 'runs': [{'run': 'first run', 'dag_version': rows[0][1], 'tasks': tasks1[0][0]}, {'run': 'second run', 'dag_version': rows[1][1], 'tasks': tasks2[0][0]}],
                           'change': 'a fourth task, audit, was added to the file'})
    (DAGS / 'brewline_first.py').write_text((DAGS_SRC / 'brewline_first.py').read_text())


def sec_metadb():
    """Questions that you can ask the metadata database, and the cleanup command. Run after the runs of the other sections."""
    st = the_stack()
    queries = [
        ('states', 'How many task instances are in each state?', "SELECT state, count(*) AS tasks FROM task_instance WHERE working_set = 1 GROUP BY state ORDER BY tasks DESC, state"),
        ('runs', 'Which DAGs have failed runs?', "SELECT dag_id, count(*) AS runs, sum(CASE WHEN state = 'failed' THEN 1 ELSE 0 END) AS failed FROM dag_run GROUP BY dag_id HAVING failed > 0 ORDER BY failed DESC, dag_id"),
        ('pools', 'Which pools exist, and how big are they?', "SELECT pool, slots FROM slot_pool ORDER BY pool"),
        ('tries', 'Which tasks needed more than one try?', "SELECT dag_id, task_id, max(try_number) AS tries FROM task_instance GROUP BY dag_id, task_id HAVING tries > 1 ORDER BY tries DESC, dag_id, task_id"),
        ('xcom', 'Which XCom values are the largest?', "SELECT ti.dag_id, ti.task_id, length(x.value) AS bytes FROM xcom_v2 x JOIN task_instance ti ON ti.id = x.task_instance_id ORDER BY bytes DESC, ti.dag_id LIMIT 3"),
        ('run_types', 'How were the runs started?', "SELECT run_type, count(*) AS runs FROM dag_run GROUP BY run_type ORDER BY run_type"),
    ]
    out = {}
    for key, question, q in queries:
        cols, rows = st.sql(q)
        out[key] = {'question': question, 'sql': q, 'cols': cols, 'rows': [[str(c) for c in r] for r in rows]}
    counts('af.metadb', out)
    _, tabs = st.sql("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    counts('af.metadb_tables', {'count': len(tabs), 'names': [t[0] for t in tabs]})
    rc, o = st.cli('db', 'clean', '--clean-before-timestamp', (TODAY_REAL + datetime.timedelta(days=1)).isoformat(), '--dry-run', '--yes', '--tables', 'dag_run,task_instance')
    text('af.db_clean_dry_run', norm(clean_console(o, keep=('Performing dry run', 'Dry run', 'dry', 'Table', 'table')) or '\n'.join(ln for ln in o.splitlines() if ln.strip())[-900:], shift=True))


def sec_ruff():
    ruff = str(BIN / 'ruff')
    d = WORK / 'ruffcheck'
    d.mkdir(exist_ok=True)
    shutil.copy(BROKEN_SRC / 'old_style.py', d / 'old_style.py')
    r = subprocess.run([ruff, 'check', str(d / 'old_style.py'), '--select', 'AIR', '--output-format', 'concise', '--no-cache'], capture_output=True, text=True)
    text('af.ruff_old_style', norm((r.stdout + r.stderr).replace(str(d) + '/', 'dags/').strip()))
    n_old = len([ln for ln in r.stdout.splitlines() if ': ' in ln and 'old_style.py' in ln])
    r2 = subprocess.run([ruff, 'check', str(DAGS_SRC), '--select', 'AIR', '--output-format', 'concise', '--no-cache'], capture_output=True, text=True)
    text('af.ruff_good', norm((r2.stdout + r2.stderr).replace(str(DAGS_SRC) + '/', 'dags/').strip()))
    ver = subprocess.run([ruff, '--version'], capture_output=True, text=True).stdout.strip()
    counts('af.ruff', {'version': ver, 'findings_old_style': n_old, 'good_dags_clean': r2.returncode == 0})
    OUT['meta']['ruff'] = ver.split()[-1]


def sec_pytest():
    py = [PY, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', '-x', '--no-header']
    migrate(HOME_TEST)
    out = {}
    for label, proj in (('green', 'project'), ('red', 'project_broken')):
        d = WORK / ('pytest_' + label)
        if d.exists():
            shutil.rmtree(d)
        shutil.copytree(HERE / proj, d)
        env = env_for(HOME_TEST, d / 'dags')
        env['AIRFLOW__LOGGING__LOGGING_LEVEL'] = 'CRITICAL'
        args = [PY, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', '--no-header', '-rf', str(d / 'tests')] + (['--tb=short'] if label == 'red' else [])
        t0 = time.time()
        r = subprocess.run(args, capture_output=True, text=True, env=env, cwd=str(d))
        body = '\n'.join(ln for ln in (r.stdout + r.stderr).splitlines() if not NOISE.search(ln) and not ln.startswith('  warnings.warn'))
        body = re.sub(r'in \d+\.\d+s', 'in <seconds>s', body)
        body = norm(body.replace(str(d) + '/', ''))
        out[label] = {'rc': r.returncode, 'summary': body.strip().splitlines()[-1] if body.strip() else ''}
        text('af.pytest_' + label, body.strip())
        for f in sorted((HERE / proj).rglob('*.py')):
            file('project/%s/%s' % ('good' if label == 'green' else 'broken', f.relative_to(HERE / proj)), f.read_text())
    counts('af.pytest', out)


def sec_timetables_more():
    migrate(HOME_TEST)
    res = {}
    spec = {'kind': 'EventsTimetable', 'args': {'event_dates': ['2026-03-02T09:00:00+00:00', '2026-03-09T09:00:00+00:00', '2026-03-31T09:00:00+00:00']}, 'start': '2026-03-01T00:00:00+00:00', 'n': 4, 'catchup': True}
    res['events'] = probe('timetable', json.dumps(spec))
    spec = {'kind': 'MultipleCronTriggerTimetable', 'args': {'exprs': ['0 1 * * *', '0 13 * * 1'], 'timezone': 'UTC'}, 'start': '2026-03-14T00:00:00+00:00', 'n': 6, 'catchup': True}
    res['multiple_cron'] = probe('timetable', json.dumps(spec))
    counts('af.timetables_more', res)


def sec_retry_grid():
    """The retry lab offers a grid of settings. Airflow's own delay function runs on every one of them and the lab is checked against the result."""
    migrate(HOME_TEST)
    r = probe('retry_grid')
    counts('af.retry_grid', r)


def sec_backoff():
    """Exponential backoff: the delay before each retry, read back from the metadata database, next to the formula in the installed source."""
    st = the_stack()
    st.unpause('brewline_backoff')
    ld = '2026-03-14T00:00:00+00:00'                       # a fixed logical date: the jitter is a hash of it, so the recorded waits can be reproduced
    run = st.trigger('brewline_backoff', logical_date=ld)
    waiting = {}
    t0 = time.time()
    while time.time() - t0 < 150:
        _, r = st.sql("SELECT try_number, end_date, retry_at, state FROM task_instance WHERE dag_id = ? AND run_id = ? AND task_id = ? ORDER BY try_number", ('brewline_backoff', run, 'call_partner'))
        ends = {n: e for n, e, ra, sta in r}
        for n, end, retry_at, sta in r:
            if retry_at and sta == 'up_for_retry':
                prev_end = ends.get(n - 1) or end
                if prev_end:
                    waiting[n - 1] = round(datetime.datetime.fromisoformat(retry_at).timestamp() - datetime.datetime.fromisoformat(prev_end).timestamp(), 2)
        _, d = st.sql('SELECT state FROM dag_run WHERE dag_id = ? AND run_id = ?', ('brewline_backoff', run))
        if d and d[0][0] in ('success', 'failed'):
            break
        time.sleep(0.2)
    st.wait_run('brewline_backoff', run, timeout=150)
    time.sleep(1)
    _, rows = st.sql('SELECT try_number, state, end_date, retry_at, start_date FROM task_instance WHERE dag_id = ? AND run_id = ? AND task_id = ? ORDER BY try_number', ('brewline_backoff', run, 'call_partner'))

    def p(x):
        return datetime.datetime.fromisoformat(x).timestamp() if x else None
    delays, waits = [], []
    for i, (n, state, end, retry_at, start) in enumerate(rows):
        if retry_at and end:
            delays.append(round(p(retry_at) - p(end)))
        if i + 1 < len(rows) and end:
            waits.append(round(p(rows[i + 1][4]) - p(end), 1))
    # the formula of Airflow 3.4.0 (airflow/models/taskinstance.py, _compute_retry_deadline), written out again here
    import hashlib
    expected = []
    for k in range(1, 5):
        base = max(1, -(-int(1 * 2 ** (k - 1) * 1000) // 1000))
        ti_hash = int(hashlib.sha1(('brewline_backoff#call_partner#%s#%d' % (datetime.datetime.fromisoformat(ld).strftime('%Y-%m-%d %H:%M:%S+00:00'), k)).encode()).hexdigest(), 16)
        expected.append(min(base + ti_hash % base, 10))
    counts('af.backoff', {'retry_delay_seconds': 1, 'multiplier': 2.0, 'max_retry_delay_seconds': 10, 'retries': 4, 'tries': len(rows), 'final_state': rows[-1][1],
                          'delays_in_database': [waiting[k] for k in sorted(waiting)], 'delays_from_formula': expected, 'seconds_between_end_and_next_start': waits,
                          'dag_id': 'brewline_backoff', 'task_id': 'call_partner', 'logical_date': '2026-03-14 00:00:00+00:00'})

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
section('stack_basic')(sec_stack_basic)
section('ctx')(sec_ctx)
section('catchup')(sec_catchup)
section('backfill')(sec_backfill)
section('trigger_rules')(sec_trigger_rules)
section('branch')(sec_branch)
section('mapping')(sec_mapping)
section('xcom')(sec_xcom)
section('idempotent')(sec_idempotent)
section('parse_cost')(sec_parse_cost)
section('retries')(sec_retries)
section('failed_deps')(sec_failed_deps)
section('waiting')(sec_waiting)
section('pools')(sec_pools)
section('assets')(sec_assets)
section('backoff')(sec_backoff)
section('retry_grid')(sec_retry_grid)
section('config')(sec_config)
section('cli')(sec_cli)
section('retry_policy')(sec_retry_policy)
section('deadline')(sec_deadline)
section('versions')(sec_versions)
section('metadb')(sec_metadb)
section('ruff')(sec_ruff)
section('pytest')(sec_pytest)
section('timetables_more')(sec_timetables_more)
section('secrets')(sec_secrets)


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
        close_stack()
        finish()
        if os.environ.get('AF_KEEP'):
            print('kept', WORK)
        else:
            shutil.rmtree(WORK, ignore_errors=True)


if __name__ == '__main__':
    main()
