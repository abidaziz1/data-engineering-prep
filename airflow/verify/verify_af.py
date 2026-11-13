#!/usr/bin/env python3
"""Check the code and the recorded output of the Airflow tutorial.

Everything recorded for this course ran on one machine with Apache Airflow 3.4.0: the scheduler, the DAG processor, the API server and the triggerer
with the LocalExecutor and a SQLite metadata database, plus `airflow dags test` and the command line. Nothing ran on Celery, Kubernetes, a
managed service, PostgreSQL or MySQL. This script checks what can be checked on that machine:

1. Every Python snippet of the lessons is parsed with ast. Every Airflow import statement is run in the installed Airflow, and every keyword
   argument of an Airflow call (`@dag`, `@task`, the operators, the sensors, `DeadlineAlert`, `ExceptionRetryPolicy` and more) is checked against the
   installed signature. Every string `trigger_rule` must be a value of the TriggerRule enum.
2. Every DAG snippet is loaded with a DagBag. The code of the lessons must import. The broken code of the bug hunts must fail or import as the lesson says
   (the removed argument, the duplicate id and the cycle fail, the others import and are wrong in what they do). Every fixed version must import,
   and ruff with the AIR rules must pass on it.
3. A group of lessons is run again and compared with the recording or with the claim of the lesson: the first DAG, the three loads, the incremental loads,
   mapping and its edge cases, the branch, the watcher pattern, the task loops, five trigger rules against ten mixes of parents, the retry delay of
   Airflow's own function over the grid of the lab, the test projects with pytest (6 pass, 3 fail and 3 pass, 5 pass), a few fixes by running them,
   and the timetables.
4. The command line: every `airflow <group> <command>` that a lesson names must exist, and every `--option` named next to it must be in its help.
5. Deliberately broken inputs (controls) must be rejected by the checks above, and a changed recording must fail the widget checker.
6. The logic of the lab widgets is checked against the recording and against arithmetic done by hand (check_widgets.js), and the content lint runs.
7. With --recapture the whole recording is made again (about 30 minutes) and compared with js/real.js. Ids, process numbers and clock values are ignored.
   Timings are compared with a tolerance that is written in this file.

What this cannot show: that a managed service, Celery, Kubernetes, PostgreSQL or MySQL behave the same, what any of them cost, how the scheduler behaves under load,
or that a version, default or limit is current. Those screens carry the "From documentation" tag and the README lists the pages they come from.

Run:  AF_PYTHON=/path/to/venv/bin/python python3 airflow/verify/verify_af.py [--no-run] [--offline] [--full] [--recapture] [--reuse] [--verbose]
Needs: Apache Airflow 3.4.0 installed with its constraints file (see INTEGRATION.md), ruff, pytest, Node 20 or later.
"""
import argparse
import ast
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import time

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
PY = os.environ.get('AF_PYTHON', sys.executable)
BIN = pathlib.Path(PY).parent

ap = argparse.ArgumentParser()
ap.add_argument('--no-run', action='store_true', help='skip the runs of DAGs, pytest and the command line')
ap.add_argument('--offline', action='store_true', help='do not check the URL of the constraints file')
ap.add_argument('--full', action='store_true', help='run all thirteen trigger rules and all 36 cron expressions again (slow)')
ap.add_argument('--recapture', action='store_true', help='record everything again and compare with js/real.js')
ap.add_argument('--reuse', action='store_true', help='with --recapture: compare the recording kept from the last --recapture')
ap.add_argument('--verbose', action='store_true')
args = ap.parse_args()

problems = 0
TALLY = {}
CONTROLS = []


def bad(msg):
    global problems
    problems += 1
    print('PROBLEM:', msg)


def tick(group, n=1):
    TALLY[group] = TALLY.get(group, 0) + n


def note(msg):
    if args.verbose:
        print('  note:', msg)


def load_real(path):
    text = pathlib.Path(path).read_text()
    return json.loads(text[text.index('LAB.real = ') + len('LAB.real = '):].rstrip().rstrip(';'))


real = load_real(ROOT / 'airflow' / 'js' / 'real.js')
F, C, T, TB, M = real['files'], real['counts'], real['text'], real['tables'], real['meta']
dump = json.loads(subprocess.check_output(['node', str(ROOT / 'dev' / 'dump-scenes.js'), 'airflow']))
SN = {}
for s in dump['snippets']:
    SN[(s['id'], s['kind'])] = s

WORK = pathlib.Path(tempfile.mkdtemp(prefix='verify_af_'))
HOME = WORK / 'home'
HOME.mkdir()
BASE_ENV = dict(os.environ, AIRFLOW_HOME=str(HOME), AIRFLOW__CORE__LOAD_EXAMPLES='False', AIRFLOW__LOGGING__LOGGING_LEVEL='CRITICAL',
                AIRFLOW__CORE__UNIT_TEST_MODE='False', no_proxy='127.0.0.1,localhost', NO_PROXY='127.0.0.1,localhost', BREWLINE_DB=str(WORK / 'brewline.db'), BREWLINE_OUT=str(WORK / 'out'))


def run(cmd, env=None, cwd=None, timeout=600, stdin=None):
    return subprocess.run(cmd, capture_output=True, text=True, env=env or BASE_ENV, cwd=cwd, timeout=timeout, input=stdin)


def result(proc):
    for ln in proc.stdout.splitlines():
        if ln.startswith('RESULT'):
            return json.loads(ln[6:])
    raise RuntimeError('no RESULT line:\n' + (proc.stdout + proc.stderr)[-1200:])


def check(cmd, *a, stdin=None, dags=None, env_extra=None, timeout=600):
    env = dict(BASE_ENV, **(env_extra or {}))
    if dags is not None:
        env['AIRFLOW__CORE__DAGS_FOLDER'] = str(dags)
    return result(run([PY, str(HERE / cmd)] + [str(x) for x in a], env=env, stdin=stdin, timeout=timeout))


def probe(*a, **kw):
    return check('af_probe.py', *a, **kw)


def check_names(snips):
    return check('af_check.py', 'names', stdin=json.dumps(snips))


def check_files(paths, dags=None, env_extra=None):
    return check('af_check.py', 'files', stdin=json.dumps({k: str(v) for k, v in paths.items()}), dags=dags, env_extra=env_extra)


def own_warning(statement, message):
    """A deprecation warning counts when it names the module or the object that the lesson imports.
    Warnings that Airflow's own provider code raises about its own internals are not the lesson's problem."""
    try:
        node = ast.parse(statement).body[0]
    except (SyntaxError, IndexError):
        return True
    if isinstance(node, ast.ImportFrom):
        wanted = [node.module or ''] + ['%s.%s' % (node.module, a.name) for a in node.names]
    else:
        wanted = [a.name for a in node.names]
    return any(w and w in message for w in wanted)


def ruff_aira(path):
    r = run([str(BIN / 'ruff'), 'check', str(path), '--select', 'AIR', '--no-cache'])
    return r.returncode == 0, (r.stdout + r.stderr).strip()


def ensure_db():
    if not (HOME / 'airflow.db').exists():
        r = run([str(BIN / 'airflow'), 'db', 'migrate'])
        if r.returncode != 0:
            bad('airflow db migrate failed: ' + (r.stdout + r.stderr)[-300:])


# ======================================================================================================================
# 0. the environment
# ======================================================================================================================
ver = run([PY, '-c', 'import airflow; print(airflow.__version__)']).stdout.strip()
if ver != M['apache-airflow']:
    bad('this machine has Airflow %s but the recording and the lessons are for %s' % (ver, M['apache-airflow']))
else:
    tick('Airflow version matches the recording (%s)' % ver)

# ======================================================================================================================
# 1. Python snippets: syntax, imports, keyword arguments
# ======================================================================================================================
PYSNIPS = {k: v for k, v in SN.items() if v.get('lang') == 'python'}
snips_by_id = {}
for (sid, kind), v in PYSNIPS.items():
    name = sid + ('_fix' if kind == 'fix' else '')
    snips_by_id[name] = v['code']
    try:
        ast.parse(v['code'])
        tick('Python snippets parsed')
    except SyntaxError as e:
        bad('%s (%s): Python does not parse: %s' % (sid, kind, e))

# what the lessons say about the broken code of the bug hunts
IMPORT_FAILS = {  # the lesson says that the file does not import, and why
    'm2-bug1': 'schedule_interval', 'm2-bug2': 'Task id', 'm2-bug3': 'Cycle', 'm11-bug1': 'days_ago', 'm14-r2-bug': 'schedule_interval',
}
KWARG_BAD = {'m2-bug1': 'schedule_interval', 'm11-bug1': 'schedule_interval', 'm14-r2-bug': 'schedule_interval'}
PARTIAL = {'m14-r3-code', 'm14-r3-bug', 'm14-r3-bug_fix', 'm9-code-db_unused'}          # an excerpt of a file: no imports of its own
NOT_DAG = {'m10-code-logic', 'm10-code-tests', 'm14-r1-test', 'm10-bug2', 'm10-bug2_fix'}  # a module or a test file

if not args.no_run:
    names = check_names(snips_by_id)
    for name, r in names.items():
        sid = name.replace('_fix', '')
        isfix = name.endswith('_fix')
        if 'syntax' in r:
            bad('%s: %s' % (name, r['syntax']))
            continue
        tick('Airflow import statements run in Airflow %s' % ver, len(r['imports_failed']) + 1)
        expected_fail = (not isfix) and sid in IMPORT_FAILS
        if r['imports_failed'] and not expected_fail:
            bad('%s: an import fails: %s' % (name, r['imports_failed']))
        if (not isfix) and sid in IMPORT_FAILS and sid == 'm11-bug1' and not r['imports_failed']:
            bad('%s: the lesson says the old import fails, and it does not' % name)
        own = [w for w in r['warnings'] if own_warning(w[0], w[1])]
        if own and (isfix or 'bug' not in sid):
            bad('%s: the code of a lesson imports through a deprecated path: %s' % (name, own[0]))
        for w in r['warnings']:
            if w not in own:
                note('%s: Airflow raises a deprecation warning inside its own code for "%s": %s' % (name, w[0], w[1][:100]))
        want = KWARG_BAD.get(sid) if not isfix else None
        got = [k for _, k in r['bad_kwargs']]
        if want and want not in got:
            bad('%s: the lesson says that "%s" is not accepted, and the signatures accept it' % (name, want))
        if (want is None or isfix) and got:
            bad('%s: a keyword argument is not in the installed signature: %s' % (name, r['bad_kwargs']))
        if r['bad_values']:
            bad('%s: %s' % (name, r['bad_values']))
        tick('Airflow keyword arguments checked against the installed signatures', 1)

# ======================================================================================================================
# 2. DagBag on every DAG snippet, ruff on the good ones
# ======================================================================================================================
SNIPDIR = WORK / 'snips'
SNIPDIR.mkdir()
for helper in ('orders_logic', 'store_logic', 'brewline_alerts'):
    src = F.get('dags/%s.py' % helper) or F.get('project/good/dags/%s.py' % helper) or F.get('round1/dags/%s.py' % helper)
    if src:
        (SNIPDIR / (helper + '.py')).write_text(src)
paths = {}
for name, code in snips_by_id.items():
    sid = name.replace('_fix', '')
    if sid in PARTIAL or name in PARTIAL or sid in NOT_DAG or name in NOT_DAG:
        continue
    if 'airflow' not in code.lower() or ('dag' not in code.lower()):
        continue
    p = SNIPDIR / (name.replace('-', '_') + '.py')
    p.write_text(code)
    paths[name] = p

if not args.no_run:
    ensure_db()
    got = check_files(paths, dags=SNIPDIR)
    for name, r in got.items():
        sid = name.replace('_fix', '')
        isfix = name.endswith('_fix')
        errs = list(r['errors'].values())
        if not isfix and sid in IMPORT_FAILS:
            if not errs:
                bad('%s: the lesson says that the file does not import, and it imports' % name)
            elif IMPORT_FAILS[sid] not in errs[0]:
                bad('%s: the import error is "%s", and the lesson says it is about "%s"' % (name, errs[0], IMPORT_FAILS[sid]))
            else:
                tick('Broken DAGs fail to import with the error that the lesson quotes')
            continue
        if sid == 'm13-bug5' and not isfix:
            if errs and 'unable to open database file' in errs[0]:
                tick('Broken DAGs fail to import with the error that the lesson quotes')
            elif errs:
                bad('%s: unexpected import error: %s' % (name, errs[0]))
            continue
        if sid == 'm13-bug2' and not isfix:
            # the top level of the file asks for a variable on every parse: with no variable the file cannot even be read
            if errs and 'brewline_region' in errs[0]:
                tick('Broken DAGs fail to import with the error that the lesson quotes')
            else:
                bad('%s: the top-level Variable.get must run when the file is parsed, and the file imported with no variable: %s' % (name, errs))
            continue
        if errs:
            bad('%s: the file does not import: %s' % (name, errs[0]))
        else:
            tick('DAG files import: the lessons, the bug hunts and the fixes' if True else '')
    # the same two files when the variable exists: both import, so the difference is the work that the parse does, which is the point of the lesson
    if 'm13-bug2' in paths and 'm13-bug2_fix' in paths:
        both = check_files({k: paths[k] for k in ('m13-bug2', 'm13-bug2_fix')}, dags=SNIPDIR, env_extra={'AIRFLOW_VAR_BREWLINE_REGION': 'eu'})
        if any(v['errors'] for v in both.values()) or not all(v['dags'] for v in both.values()):
            bad('m13-bug2: with the variable set, both files must import and define a DAG: %s' % both)
        else:
            tick('DAG files import: the lessons, the bug hunts and the fixes', 2)
    # ruff with the AIR rules on every file that must be clean: the lessons, the recorded DAGs and the fixes
    clean_dir = WORK / 'clean'
    clean_dir.mkdir()
    for name, p in paths.items():
        sid = name.replace('_fix', '')
        if (not name.endswith('_fix')) and ('bug' in sid):
            continue
        shutil.copy(p, clean_dir / p.name)
    for k, v in F.items():
        if k.startswith('dags/') and k.endswith('.py'):
            (clean_dir / ('rec_' + pathlib.Path(k).name)).write_text(v)
    okr, out = ruff_aira(clean_dir)
    if okr:
        tick('Files that pass ruff with the AIR rules', len(list(clean_dir.glob('*.py'))))
    else:
        bad('ruff with the AIR rules reports findings on the code of the lessons:\n' + out[:3000])

# ======================================================================================================================
# 3. runs
# ======================================================================================================================
def stored_files(prefix, dest):
    for k, v in F.items():
        if k.startswith(prefix):
            p = dest / k[len(prefix):]
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(v)


def mini(*names):
    d = WORK / ('mini_%d' % len(list(WORK.glob('mini_*'))))
    d.mkdir()
    for n in names:
        (d / n).write_text(F['dags/' + n])
    for helper in ('brewline_alerts.py',):
        (d / helper).write_text(F['dags/' + helper])
    return d


def tis_by_task(r):
    return {t['task_id'] + ('[%s]' % t['map_index'] if t['map_index'] >= 0 else ''): t['state'] for t in r['tis']}


if not args.no_run:
    out_dir = WORK / 'out'
    out_dir.mkdir(exist_ok=True)

    # 3.1 the first DAG
    d = mini('brewline_first.py')
    r = probe('test', 'brewline_first', '2026-03-14', dags=d)
    if r['state'] != 'success' or [t['state'] for t in r['tis']] != ['success'] * 3:
        bad('brewline_first did not run to success: %s' % r['state'])
    else:
        tick('DAG runs repeated: states and outputs match the recording')
    summary = json.loads((out_dir / 'summary_2026-03-14.json').read_text()) if (out_dir / 'summary_2026-03-14.json').exists() else None
    if summary != C['af.first_run']['summary']:
        bad('the summary file of brewline_first is %s, the recording says %s' % (summary, C['af.first_run']['summary']))

    # 3.2 the three loads: append grows, replace and upsert do not
    d = mini('brewline_load_append.py', 'brewline_load_replace.py', 'brewline_load_upsert.py')
    db = WORK / 'brewline.db'
    if db.exists():
        db.unlink()
    for dag_id, tbl in (('brewline_load_append', 'orders_append'), ('brewline_load_replace', 'orders_replace'), ('brewline_load_upsert', 'orders_upsert')):
        rows = [x['rows'] for x in probe('idem', dag_id, tbl, db, '2026-03-14,2026-03-14,2026-03-15,2026-03-14', dags=d)]
        want = [x['rows'] for x in C['af.idempotent'][dag_id]]
        if rows != want:
            bad('%s: rows after the four runs are %s, the recording says %s' % (dag_id, rows, want))
        else:
            tick('DAG runs repeated: states and outputs match the recording')
    if [x['rows'] for x in C['af.idempotent']['brewline_load_append']] == [x['rows'] for x in C['af.idempotent']['brewline_load_replace']]:
        bad('control: the append load must differ from the replace load')

    # 3.3 incremental loads with a late row
    d = mini('brewline_incremental.py')
    steps = probe('incremental', db, dags=d)
    for got, want in zip(steps, C['af.incremental']['steps']):
        if got != want:
            bad('incremental loads: %s differs from the recording: %s' % (got['step'], got))
            break
    else:
        tick('DAG runs repeated: states and outputs match the recording')

    # 3.4 mapping and its edge cases
    d = mini('brewline_mapping.py', 'brewline_mapping_edge.py')
    r = probe('test', 'brewline_mapping', '2026-03-14', dags=d)
    st = tis_by_task(r)
    if [k for k in st if k.startswith('load_store[')] != ['load_store[%d]' % i for i in range(5)] or set(st.values()) != {'success'}:
        bad('mapping: the mapped run is not five successful copies: %s' % st)
    else:
        tick('DAG runs repeated: states and outputs match the recording')
    r = probe('test', 'brewline_map_empty', '2026-03-14', dags=d)
    st = tis_by_task(r)
    if st.get('load_store') != C['af.mapping_edge']['empty']['load_store'] or st.get('summarize') != 'success':
        bad('mapping with an empty list: %s, the recording says %s' % (st, C['af.mapping_edge']['empty']))
    else:
        tick('DAG runs repeated: states and outputs match the recording')
    r = probe('test', 'brewline_map_big', '2026-03-14', dags=d)
    st = tis_by_task(r)
    if st.get('list_stores') != 'failed' or st.get('load_store') != 'upstream_failed':
        bad('mapping over 1,100 items: %s' % st)
    else:
        tick('DAG runs repeated: states and outputs match the recording')

    # 3.5 the branch
    d = mini('brewline_branch.py')
    for key, conf in (('full', {'full_refresh': True}), ('incremental', {'full_refresh': False})):
        r = probe('test', 'brewline_branch', '2026-03-14', dags=d, env_extra={'AF_PROBE_CONF': json.dumps(conf)})
        if tis_by_task(r) != C['af.branch'][key]['states']:
            bad('branch %s: %s, the recording says %s' % (key, tis_by_task(r), C['af.branch'][key]['states']))
        else:
            tick('DAG runs repeated: states and outputs match the recording')

    # 3.6 the watcher pattern, and the task loops
    d = mini('brewline_watcher.py')
    for key, dag_id in (('hides', 'brewline_teardown_hides'), ('watcher', 'brewline_teardown_watcher')):
        r = probe('test', dag_id, '2026-03-14', dags=d)
        if r['state'] != C['af.watcher'][key]['run_state'] or tis_by_task(r) != C['af.watcher'][key]['tasks']:
            bad('%s: run %s %s, the recording says %s' % (dag_id, r['state'], tis_by_task(r), C['af.watcher'][key]))
        else:
            tick('DAG runs repeated: states and outputs match the recording')
    d = mini('brewline_loop.py')
    for key, dag_id, n in (('fixed', 'brewline_loop_fixed', 6), ('until', 'brewline_loop_until', 13)):
        r = probe('test', dag_id, '2026-03-14', dags=d)
        if r['state'] != 'success' or len(r['tis']) != n or len(C['af.loops'][key]['task_instances']) != n:
            bad('%s: %d task instances (state %s), the recording has %d' % (dag_id, len(r['tis']), r['state'], len(C['af.loops'][key]['task_instances'])))
        else:
            tick('DAG runs repeated: states and outputs match the recording')

    # 3.7 trigger rules
    rules = list(C['af.trigger_rules']['rules']) if args.full else ['all_success', 'all_done', 'one_failed', 'none_failed_min_one_success', 'all_done_min_one_success']
    gen_dir = WORK / 'gen'
    gen_dir.mkdir()
    (gen_dir / 'trigger_rules_gen.py').write_text(F['gen/trigger_rules_gen.py'])
    dags_dir = WORK / 'trigger_dags'
    dags_dir.mkdir()
    gen = run([PY, str(gen_dir / 'trigger_rules_gen.py'), str(dags_dir)])
    if gen.returncode != 0:
        note('the generator takes no folder argument: ' + gen.stderr[-200:])
        gen = run([PY, str(gen_dir / 'trigger_rules_gen.py')], cwd=str(dags_dir))
    made = sorted(dags_dir.glob('trigger_rule_*.py')) or sorted(gen_dir.glob('trigger_rule_*.py'))
    use = dags_dir if made and made[0].parent == dags_dir else gen_dir
    for rule in rules:
        r = probe('test', 'trigger_rule_' + rule, '2026-03-14', dags=use)
        st = tis_by_task(r)
        got = {}
        for mix in C['af.trigger_rules']['mixes']:
            kids = [k for k in st if k.startswith('child_' + mix)]
            got[mix] = st[kids[0]] if kids else None
        if got != C['af.trigger_rules']['results'][rule]:
            bad('trigger rule %s: states %s differ from the recording %s' % (rule, got, C['af.trigger_rules']['results'][rule]))
        else:
            tick('Trigger-rule cells re-run (10 mixes for each rule)', 10)

    # 3.8 Airflow's own retry delay over the grid of the lab
    grid = probe('retry_grid')
    if grid['rows'] != C['af.retry_grid']['rows']:
        bad('the retry delays of Airflow\'s own function differ from the recording')
    else:
        tick('Retry delay settings re-run through Airflow\'s own function', len(grid['rows']))

    # 3.9 the test projects, with pytest
    def pytest_project(files_prefix, label, want_rc, want_summary):
        dest = WORK / ('pytest_' + label)
        stored_files(files_prefix, dest)
        env = dict(BASE_ENV, AIRFLOW__CORE__DAGS_FOLDER=str(dest / 'dags'))
        r = run([PY, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', '--no-header', str(dest / 'tests')], env=env, cwd=str(dest), timeout=900)
        last = [ln for ln in (r.stdout + r.stderr).splitlines() if re.search(r'\d+ (passed|failed)', ln)]
        got = re.sub(r' in [\d.]+s', '', last[-1]).strip() if last else ''
        if r.returncode != want_rc or got != want_summary:
            bad('pytest on %s: rc %s "%s", expected rc %s "%s"' % (label, r.returncode, got, want_rc, want_summary))
        else:
            tick('pytest projects re-run (%s)' % label)
    pytest_project('project/good/', 'good project', 0, '6 passed')
    pytest_project('project/broken/', 'broken project', 1, '3 failed, 3 passed')
    pytest_project('round1/', 'coding round 1', 0, '5 passed')

    # 3.10 ruff on the old-style DAG: eight findings
    old = WORK / 'old'
    old.mkdir()
    (old / 'old_style.py').write_text(F['dags_broken/old_style.py'])
    okr, out = ruff_aira(old)
    nfind = int(re.search(r'Found (\d+) error', out).group(1)) if re.search(r'Found (\d+) error', out) else 0
    if okr or nfind != C['af.ruff']['findings_old_style']:
        bad('ruff on the old-style DAG found %d, the recording says %d' % (nfind, C['af.ruff']['findings_old_style']))
    else:
        tick('Ruff findings on the old-style DAG match the recording')

    # 3.11 the coding round 2 and a few fixes, by running them
    d = WORK / 'round2'
    d.mkdir()
    (d / 'fix_me_fixed.py').write_text(F['rounds/fix_me_fixed.py'])
    db = WORK / 'brewline.db'
    if db.exists():
        db.unlink()
    rows = [x['rows'] for x in probe('idem', 'brewline_nightly_fix_me', 'orders', db, '2026-03-14,2026-03-14', dags=d)]
    if rows != [2, 2]:
        bad('round 2, fixed: rows after two runs are %s' % rows)
    else:
        tick('Coding rounds re-run (fixed DAG: the same table after two runs)')
    d2 = WORK / 'round2_broken'
    d2.mkdir()
    (d2 / 'fix_me.py').write_text(F['rounds/fix_me.py'])
    gb = check_files({'fix_me': d2 / 'fix_me.py'}, dags=d2)['fix_me']
    if not any('schedule_interval' in e for e in gb['errors'].values()):
        bad('round 2, broken: the file must fail to import because of schedule_interval: %s' % gb)
    else:
        tick('Coding rounds re-run (broken DAG fails with the recorded error)')
    for sid, dag_id, expect in (('m9-bug2_fix', 'brewline_db_access', 'success'), ('m3-bug1_fix', 'brewline_daily_orders', 'success')):
        d = WORK / ('fix_' + sid)
        d.mkdir()
        (d / (sid + '.py')).write_text(snips_by_id[sid])
        r = probe('test', dag_id, '2026-03-14', dags=d)
        if r['state'] != expect:
            bad('%s: the fixed DAG ended as %s' % (sid, r['state']))
        elif sid == 'm9-bug2_fix' and not re.search(r'^\d+$', r['console'].strip().splitlines()[-1] if r['console'].strip() else ''):
            bad('%s: the fixed task did not print a number of runs: %r' % (sid, r['console'][-80:]))
        elif sid == 'm3-bug1_fix' and 'loading orders for 2026-03-14' not in r['console']:
            bad('%s: the fixed task did not load the day of the run: %r' % (sid, r['console'][-80:]))
        else:
            tick('Fixes of the bug hunts run: they do what the lesson says')
    # the join after a branch: the lesson says the default rule skips it, and none_failed_min_one_success runs it
    for sid, want in (('m6-bug2', 'skipped'), ('m6-bug2_fix', 'success')):
        d = WORK / ('join_' + sid)
        d.mkdir()
        (d / 'join.py').write_text(snips_by_id[sid])
        r = probe('test', 'brewline_loads', '2026-03-14', dags=d)
        got = tis_by_task(r).get('build_marts')
        if got != want:
            bad('%s: build_marts is %s, the lesson says %s' % (sid, got, want))
        else:
            tick('Fixes of the bug hunts run: they do what the lesson says')
    # the alert task: with the default rule it never runs after a failure, with one_failed it does
    for sid, want in (('m6-bug1', 'upstream_failed'), ('m6-bug1_fix', 'success')):
        d = WORK / ('alert_' + sid)
        d.mkdir()
        (d / 'alert.py').write_text(snips_by_id[sid])
        r = probe('test', 'brewline_report', '2026-03-14', dags=d)
        got = tis_by_task(r).get('alert_team')
        if got != want:
            bad('%s: alert_team is %s, the lesson says %s' % (sid, got, want))
        else:
            tick('Fixes of the bug hunts run: they do what the lesson says')
    # tests of the lessons: the buggy test fails and the fixed test passes
    for sid in ('m10-bug1', 'm10-bug2'):
        for suffix, want_rc in (('', 1), ('_fix', 0)):
            d = WORK / ('pt_' + sid + suffix)
            d.mkdir()
            (d / ('test_' + sid.replace('-', '_') + '.py')).write_text(snips_by_id[sid + suffix])
            r = run([PY, '-m', 'pytest', '-q', '-p', 'no:cacheprovider', '--no-header', str(d)], cwd=str(d), env=dict(BASE_ENV, AIRFLOW__CORE__DAGS_FOLDER=str(d)))
            if r.returncode != want_rc:
                bad('%s%s: pytest returned %d, the lesson says %d' % (sid, suffix, r.returncode, want_rc))
            else:
                tick('Fixes of the bug hunts run: they do what the lesson says')

    # 3.12 the timetables the labs depend on (the others are in --recapture)
    specs = [('cron_trigger_utc', {'kind': 'CronTriggerTimetable', 'args': {'expr': '0 2 * * *', 'timezone': 'UTC'}}),
             ('cron_interval_utc', {'kind': 'CronDataIntervalTimetable', 'args': {'expr': '0 2 * * *', 'timezone': 'UTC'}}),
             ('cron_trigger_interval', {'kind': 'CronTriggerTimetable', 'args': {'expr': '0 2 * * *', 'timezone': 'UTC', 'interval': {'days': 1}}})]
    for label, spec in specs:
        spec = dict(spec, start='2026-03-01T00:00:00+00:00', n=4, catchup=True, manual_at=['2026-03-14T01:30:00+00:00', '2026-03-14T15:30:00+00:00', '2026-03-14T23:30:00+00:00'])
        got = probe('timetable', json.dumps(spec))
        if got['runs'] != C['af.timetables'][label]['runs'] or got['manual'] != C['af.timetables'][label]['manual']:
            bad('timetable %s differs from the recording' % label)
        else:
            tick('Timetables asked again: the runs and the manual runs match the recording')
    exprs = list(C['af.cron']['exprs']) if args.full else ['0 2 * * *', '0 0 13 * 5', '0 12 1-7 * 1', '59 23 L * *', '0 0 29 2 *', '@weekly']
    for e in exprs:
        spec = {'kind': 'CronTriggerTimetable', 'args': {'expr': e, 'timezone': 'UTC'}, 'start': C['af.cron']['start'], 'n': 5, 'catchup': True}
        got = probe('timetable', json.dumps(spec))
        if [x['logical_date'][:16].replace('T', ' ') for x in got['runs']] != [x[:16].replace('T', ' ') for x in C['af.cron']['exprs'][e]['fires']]:
            bad('cron "%s": the fire times differ from the recording' % e)
        else:
            tick('Cron expressions asked again')

# ======================================================================================================================
# 4. the command line
# ======================================================================================================================
if not args.no_run:
    text = ''
    for f in sorted((ROOT / 'airflow' / 'js' / 'content').glob('*.js')):
        text += f.read_text()
    cmds = {}
    for m in re.finditer(r'`(airflow [a-z][a-z-]*(?: [a-z][a-z-]*)?)([^`]*)`', text):
        words = m.group(1).split()
        opts = re.findall(r'(?<![\w-])(--[a-z][a-z-]*)', m.group(2))
        cmds.setdefault(' '.join(words), set()).update(opts)
    groups = {'dags', 'tasks', 'pools', 'connections', 'variables', 'backfill', 'db', 'jobs', 'providers', 'config', 'assets', 'plugins'}
    singles = {'cheat-sheet', 'version', 'info', 'scheduler', 'dag-processor', 'triggerer', 'api-server', 'standalone', 'rotate-fernet-key'}
    checked = 0
    for cmd, opts in sorted(cmds.items()):
        w = cmd.split()
        if len(w) == 2 and w[1] in singles:
            c = w
        elif len(w) == 3 and w[1] in groups:
            c = w
        elif len(w) == 2 and w[1] in groups:
            c = w
        else:
            continue
        r = run([str(BIN / 'airflow')] + c[1:] + ['--help'])
        if r.returncode != 0:
            bad('the command line has no "%s": %s' % (' '.join(c), (r.stdout + r.stderr).strip()[-120:]))
            continue
        checked += 1
        for o in sorted(opts):
            if o != '--help' and o not in r.stdout:
                bad('"%s --help" does not list %s' % (' '.join(c), o))
        tick('Command line commands and options found in the help')
    note('%d command groups checked' % checked)

# ======================================================================================================================
# 5. the constraints file
# ======================================================================================================================
if not args.offline:
    url = 'https://raw.githubusercontent.com/apache/airflow/constraints-%s/constraints-3.12.txt' % M['apache-airflow']
    r = run(['curl', '-sSIL', '-o', '/dev/null', '-w', '%{http_code}', url])
    if r.stdout.strip() != '200':
        bad('the constraints file for Airflow %s and Python 3.12 is not at %s (HTTP %s)' % (M['apache-airflow'], url, r.stdout.strip() or r.stderr.strip()[:80]))
    else:
        tick('The constraints file that the lessons name exists')

# ======================================================================================================================
# 6. controls: inputs that the checks must reject
# ======================================================================================================================
def control(label, caught):
    CONTROLS.append((label, caught))
    if caught:
        tick('Controls rejected')
    else:
        bad('control not rejected: ' + label)


try:
    ast.parse('def broken(:\n  pass')
    control('Python with a syntax error', False)
except SyntaxError:
    control('Python with a syntax error', True)

if not args.no_run:
    good = snips_by_id['m2-code1']
    ctl = {
        'ctl_kwarg': good.replace('schedule="@daily"', 'schedule_interval="@daily"'),
        'ctl_import': good + '\nfrom airflow.utils.dates import days_ago\n',
        'ctl_rule': 'from airflow.sdk import dag, task\n@task(trigger_rule="all_finished")\ndef x():\n    pass\n',
        'ctl_decorator': good.replace('@dag(', '@dag(max_parallel_widgets=3, '),
    }
    got = check_names(ctl)
    control('a removed argument (schedule_interval) in a DAG', ('schedule_interval' in [k for _, k in got['ctl_kwarg']['bad_kwargs']]))
    control('an import that Airflow 3 removed (days_ago)', bool(got['ctl_import']['imports_failed']))
    control('a trigger rule that does not exist', bool(got['ctl_rule']['bad_values']))
    control('an argument that @dag does not have', ('max_parallel_widgets' in [k for _, k in got['ctl_decorator']['bad_kwargs']]))
    cyc = WORK / 'ctl'
    cyc.mkdir()
    (cyc / 'cycle.py').write_text(F['dags_broken/broken_cycle.py'])
    (cyc / 'dup.py').write_text(F['dags_broken/broken_duplicate.py'])
    (cyc / 'noimp.py').write_text(F['dags_broken/broken_import.py'])
    r = check_files({'cycle': cyc / 'cycle.py', 'dup': cyc / 'dup.py', 'noimp': cyc / 'noimp.py'}, dags=cyc)
    control('a DAG with a cycle', bool(r['cycle']['errors']))
    control('a DAG with a duplicate task id', bool(r['dup']['errors']))
    control('a DAG that imports a module that is missing', bool(r['noimp']['errors']))
    okr, _ = ruff_aira(old)
    control('a DAG in the Airflow 2 style under ruff with the AIR rules', not okr)
    # a changed recording must fail the widget checker: it compares every lab with what Airflow returned
    def widget_checker_on(mutate):
        data = json.loads(json.dumps(real))
        mutate(data)
        p = WORK / 'real_changed.js'
        p.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(data, indent=1, sort_keys=True) + ';\n')
        return run(['node', str(HERE / 'check_widgets.js')], env=dict(os.environ, AF_REAL=str(p)))

    base = run(['node', str(HERE / 'check_widgets.js')], env=dict(os.environ, AF_REAL=str(ROOT / 'airflow' / 'js' / 'real.js')))
    control('the widget checker passes on the unchanged recording (so that the changes below are the cause of a failure)', base.returncode == 0)
    for label, mutate in (
        ('a trigger-rule cell in the recording is changed', lambda d: d['counts']['af.trigger_rules']['results']['all_done_min_one_success'].__setitem__('102', 'success')),
        ('the run_after of a timetable run is changed', lambda d: d['counts']['af.timetables']['cron_interval_utc']['runs'][0].__setitem__('run_after', '2026-03-02 03:00:00+00:00')),
        ('the number of catch-up runs is changed', lambda d: d['counts']['af.catchup']['variants']['brewline_catchup_on'].__setitem__('run_count', 6)),
        ('the recorded retry delays are changed', lambda d: d['counts']['af.backoff']['delays_from_formula'].__setitem__(3, 11)),
        ('a cell of the retry grid is changed', lambda d: d['counts']['af.retry_grid']['rows'][0].__setitem__(list(d['counts']['af.retry_grid']['rows'][0])[-1], 999)),
    ):
        control(label + ': the widget checker fails', widget_checker_on(mutate).returncode != 0)

# ======================================================================================================================
# 7. the widget checker and the lint
# ======================================================================================================================
r = run(['node', str(HERE / 'check_widgets.js')], env=dict(os.environ))
m = re.search(r'(\d+) checks, (all passed|\d+ failed)', r.stdout)
if r.returncode != 0 or not m:
    bad('the widget checker fails:\n' + r.stdout[-800:])
else:
    tick('Widget checks passed (the labs against the recording and by hand)', int(m.group(1)))
r = run(['node', str(ROOT / 'dev' / 'lint-content.js'), 'airflow'], env=dict(os.environ))
if r.returncode != 0:
    bad('the content lint fails:\n' + r.stdout[-800:])
else:
    tick('Content lint clean (ids, tiers, ranges, diagrams, answers, writing rules, quoted numbers)')

# ======================================================================================================================
# 8. --recapture
# ======================================================================================================================
TIMING = [  # path regex -> (relative tolerance, absolute tolerance). Machine-dependent timings and counts of samples.
    (r'^counts\.af\.waiting\.\w+\.facts\.(slot_seconds|seconds_until_all_done)$', (0.6, 6.0)),
    (r'^counts\.af\.pools\.\w+\.tasks\[\d+\]\.(start|end)$', (0.5, 3.0)),
    (r'^counts\.af\.retries\.gap_seconds_between_tries\[\d+\]$', (0.5, 3.0)),
    (r'^counts\.af\.backoff\.seconds_between_end_and_next_start\[\d+\]$', (0.5, 6.0)),
    (r'^counts\.af\.timeout\.seconds_until_failed$', (0.5, 2.0)),
    (r'^counts\.af\.parse_cost\.', (2.0, 0.02)),
    (r'^counts\.af\.deadline\.(task_seconds)$', (0.2, 3.0)),
]
IGNORE = [r'^meta\.recorded_on$', r'^counts\.af\.waiting\.\w+\.segments', r'^counts\.af\.waiting\.\w+\.states_seen', r'^counts\.af\.pools\.\w+\.tasks\[\d+\]\.task$']


def normtext(s):
    s = re.sub(r'\[\d{3,6}\]', '[N]', s)
    s = re.sub(r'PID: \d+', 'PID: N', s)
    s = re.sub(r'pytest-of-\w+/pytest-\d+', 'pytest-of-X/pytest-N', s)
    s = re.sub(r'0x[0-9a-f]+', '0xADDR', s)
    return s


def walk(a, b, path, diffs):
    if any(re.search(p, path) for p in IGNORE):
        return
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a or k not in b:
                diffs.append('%s.%s: only in the %s recording' % (path, k, 'old' if k in a else 'new'))
            else:
                walk(a[k], b[k], path + '.' + k, diffs)
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            diffs.append('%s: %d items in the old recording, %d in the new' % (path, len(a), len(b)))
        for i, (x, y) in enumerate(zip(a, b)):
            walk(x, y, '%s[%d]' % (path, i), diffs)
    elif isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool) and not isinstance(b, bool):
        if a == b:
            return
        for pat, (rel, ab) in TIMING:
            if re.search(pat, path):
                if abs(a - b) <= max(ab, rel * abs(a)):
                    return
                diffs.append('%s: %s against %s is outside the tolerance of %s' % (path, a, b, (rel, ab)))
                return
        diffs.append('%s: %s against %s' % (path, a, b))
    elif isinstance(a, str) and isinstance(b, str):
        if normtext(a) != normtext(b):
            diffs.append('%s: text differs (%r against %r)' % (path, normtext(a)[:70], normtext(b)[:70]))
    elif a != b:
        diffs.append('%s: %r against %r' % (path, a, b))


def compare(old, new):
    diffs = []
    for bag in ('meta', 'files', 'text', 'tables', 'counts'):
        walk(old[bag], new[bag], bag, diffs)
    return diffs


if args.recapture:
    keep = HERE / '.cache'
    keep.mkdir(exist_ok=True)
    out = keep / 'real_recaptured.js'
    if not args.reuse or not out.exists():
        t0 = time.time()
        env = dict(os.environ, AF_PYTHON=PY)
        r = subprocess.run([PY, str(HERE / 'capture_af.py'), '--out', str(out)], env=env, capture_output=True, text=True)
        print('recording took %.0f seconds' % (time.time() - t0))
        if r.returncode != 0:
            bad('capture_af.py failed:\n' + (r.stdout + r.stderr)[-1200:])
    if out.exists():
        new = load_real(out)
        diffs = compare(real, new)
        # a control: a changed copy must produce differences
        changed = json.loads(json.dumps(new))
        changed['counts']['af.catchup']['variants']['brewline_catchup_on']['run_count'] = 6
        control('a changed recording is reported by the comparison', bool(compare(real, changed)))
        if diffs:
            for d in diffs[:60]:
                print('DIFF:', d)
            bad('%d differences between the new recording and js/real.js (first 60 shown)' % len(diffs))
        else:
            tick('Recording made again and compared with js/real.js (timings within the stated tolerance)')

shutil.rmtree(WORK, ignore_errors=True)
print()
for k in sorted(TALLY):
    print('%6d  %s' % (TALLY[k], k))
print('%d controls: %s' % (len(CONTROLS), 'all rejected' if all(c for _, c in CONTROLS) else 'SOME NOT REJECTED'))
print('verify_af: %s' % ('%d problem(s)' % problems if problems else 'clean'))
sys.exit(1 if problems else 0)
