#!/usr/bin/env python3
"""Verify the Python tutorial. Run it with the Python 3.14 environment that has the packages of requirements-py.txt.

  python python/verify/verify_py.py              the quick checks (a few minutes)
  python python/verify/verify_py.py --recapture  also record everything again and compare it with js/real.js (about 10 minutes, needs PyPI)
  python python/verify/verify_py.py --reuse      with --recapture: compare with the last recapture in the temporary folder instead of running it again
  python python/verify/verify_py.py --schema F   also check the CI workflow against a JSON schema file (the SchemaStore "github-workflow" schema)

What it checks:
 1. the lint of the lessons (node dev/lint-content.js python)
 2. every program of the lessons parses, pyproject.toml parses, the CI workflow has the structure of a workflow (and matches the schema with --schema)
 3. every coding round and every other program that ends in "tests passed" is run again, and its output must match the recording
 4. controls: broken versions of those programs must fail, and a recording that has been changed on purpose must fail the widget checker
 5. the independent widget checker (check_widgets.js)
 6. with --recapture: the recorder runs again and every recorded file, text and number must match, with a tolerance on timings and sizes
"""
import argparse, ast, json, os, pathlib, re, shutil, subprocess, sys, tempfile, time, tomllib

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
REPO = ROOT.parent
LESSONS = HERE / 'lessons'
ap = argparse.ArgumentParser()
ap.add_argument('--recapture', action='store_true')
ap.add_argument('--reuse', action='store_true')
ap.add_argument('--schema')
ap.add_argument('--keep', action='store_true')
args = ap.parse_args()

passed, failed = 0, 0


def ok(cond, msg):
    global passed, failed
    if cond:
        passed += 1
    else:
        failed += 1
        print('FAIL:', msg)


def load_real(path):
    t = pathlib.Path(path).read_text(encoding='utf-8')
    m = re.search(r'LAB\.real\s*=\s*(\{.*\})\s*;?\s*$', t, re.S)
    return json.loads(m.group(1))


def env():
    e = dict(os.environ)
    for k in ('VIRTUAL_ENV', 'PYTHONPATH', 'PYTHONHOME'):
        e.pop(k, None)
    e.update({'PYTHONHASHSEED': '0', 'PYTHONDONTWRITEBYTECODE': '1', 'PYTHON_COLORS': '0', 'NO_COLOR': '1', 'TZ': 'UTC', 'LANG': 'C.UTF-8', 'PYTHONIOENCODING': 'utf-8', 'COLUMNS': '100', 'PYTHONUTF8': '1'})
    return e


def norm(s):
    s = s.replace('\r\n', '\n')
    s = re.sub(r'/tmp/[A-Za-z0-9_./-]*py-verify-[A-Za-z0-9_]+', '/work', s)
    s = re.sub(r'File "/[^"]*/([^"/]+)"', r'File "\1"', s)
    s = re.sub(r'127\.0\.0\.1:\d{4,5}', '127.0.0.1:PORT', s)
    s = re.sub(r'\bport=\d{4,5}', 'port=PORT', s)
    s = re.sub(r'0x[0-9a-f]{6,}', '0x...', s)
    return re.sub(r'[ \t]+\n', '\n', s).rstrip('\n')


REAL = load_real(ROOT / 'js' / 'real.js')
WORK = pathlib.Path(tempfile.mkdtemp(prefix='py-verify-'))

# ---- 1. the lint ------------------------------------------------------------------------------------------------------------------------------
print('1. lint')
r = subprocess.run(['node', str(REPO / 'dev' / 'lint-content.js'), 'python'], capture_output=True, text=True, cwd=REPO)
ok(r.returncode == 0 and 'lint clean' in r.stdout, 'lint-content.js python: ' + (r.stdout + r.stderr)[-300:])

# ---- 2. everything that is shown as code parses --------------------------------------------------------------------------------------------------
print('2. programs, pyproject.toml and the CI workflow')
n_py = 0
for key, src in REAL['files'].items():
    if key.endswith('.py'):
        try:
            ast.parse(src)
            n_py += 1
        except SyntaxError as e:
            ok(False, f'{key} does not parse: {e}')
ok(n_py > 70, f'{n_py} programs parse')
for key, src in REAL['files'].items():
    if key.endswith('.toml'):
        try:
            tomllib.loads(src)
            ok(True, key)
        except Exception as e:
            ok(False, f'{key}: {e}')
wf = REAL['files'].get('m13/ci.yml', '')
try:
    import yaml
    doc = yaml.safe_load(wf)
    if True in doc:  # YAML 1.1 reads the key `on` as the boolean True
        doc['on'] = doc.pop(True)
    ok(doc.get('name') and doc.get('on') and 'jobs' in doc, 'the workflow has a name, triggers and jobs')
    for name, job in doc['jobs'].items():
        ok('runs-on' in job and all(('uses' in s) != ('run' in s) for s in job['steps']), f'job {name} has runs-on and steps that each use an action or run a command')
    if args.schema:
        import jsonschema
        try:
            jsonschema.validate(doc, json.loads(pathlib.Path(args.schema).read_text()))
            ok(True, 'the workflow matches the schema')
            print('   the workflow matches the schema', pathlib.Path(args.schema).name)
        except jsonschema.ValidationError as e:
            ok(False, 'the workflow does not match the schema: ' + e.message[:300])
except ImportError:
    print('   (PyYAML is not installed: the workflow structure was not checked)')

# ---- 3. every program that ends in "tests passed" runs again ---------------------------------------------------------------------------------------
print('3. coding rounds and tests: run again, compare with the recording')
EXTRA = {'m8/fetch_all.py': ['support/brewline_api.py']}
rounds = sorted(k for k, t in REAL['text'].items() if t.rstrip().endswith('tests passed') and '#' not in k and '@' not in k)
ok(len(rounds) >= 20, f'{len(rounds)} programs end in "tests passed"')
VOLATILE = {'m8/fetch_all.py', 'm10/threaded_fetch.py'}   # these use a local server or real waiting, so only the last line must match


def run_program(key, source, d):
    d.mkdir(parents=True, exist_ok=True)
    name = pathlib.Path(key).name
    (d / name).write_text(source)
    for extra in EXTRA.get(key, []):
        shutil.copy(HERE / extra, d / pathlib.Path(extra).name)
    t0 = time.time()
    p = subprocess.run([sys.executable, name], cwd=d, env=env(), capture_output=True, text=True, timeout=180)
    return p.returncode, norm(p.stdout + p.stderr), time.time() - t0


for key in rounds:
    src = (LESSONS / key).read_text()
    rc, out, dur = run_program(key, src, WORK / ('r_' + key.replace('/', '_').replace('.py', '')))
    ok(rc == 0 and out.endswith('tests passed'), f'{key} exit {rc}: {out[-200:]}')
    if key not in VOLATILE:
        ok(out == norm(REAL['text'][key]), f'{key} prints what was recorded:\n--- now\n{out[-400:]}\n--- recorded\n{norm(REAL["text"][key])[-400:]}')

# ---- 4. controls: a broken program must fail ---------------------------------------------------------------------------------------------------
print('4. controls')
CONTROLS = [
    ('m12/parse_amount.py', 'len(decimals) > 2', 'len(decimals) > 5', 'accepts three decimals'),
    ('m11/split_valid.py', 'start=2', 'start=1', 'counts lines from 1'),
    ('m7/call_with_retry.py', 'except retry_on:', 'except Exception:', 'retries every exception'),
    ('m7/idempotent_load.py', 'db.execute("ROLLBACK")', 'pass', 'never rolls back'),
    ('m15/pipeline_round.py', 'if read and len(bad) / read > max_bad_share:', 'if False:', 'writes before it checks the limit'),
    ('m14/steps.py', 'return 1', 'continue', 'goes on after a failed step'),
    ('m11/contract_check.py', '[("new", c) for c in columns if c not in contract]', '[]', 'does not report a new column'),
    ('m8/fetch_all.py', '        r.raise_for_status()\n', '', 'does not raise on a 404'),
    ('m10/threaded_fetch.py', 'return list(pool.map(one, urls))', 'return [one(u) for u in urls]', 'is not concurrent'),
    ('m14/pull_logic_out.py', 'parts[1] == "ERROR"', 'parts[1] != "INFO"', 'counts warnings as errors'),
    ('m6/normalize_timestamps.py', 'astimezone(timezone.utc)', 'replace(tzinfo=timezone.utc)', 'does not convert to UTC'),
]
for key, old, new, what in CONTROLS:
    src = (LESSONS / key).read_text()
    if old not in src:
        ok(False, f'control {key}: the text to change is not in the program: {old!r}')
        continue
    rc, out, dur = run_program(key, src.replace(old, new, 1), WORK / ('c_' + key.replace('/', '_').replace('.py', '')))
    ok(rc != 0 or not out.endswith('tests passed'), f'control {key} ({what}) must fail, and it passed')

# a recording that was changed on purpose must fail the widget checker
real_text = (ROOT / 'js' / 'real.js').read_text(encoding='utf-8')
changes = [('m6.dst', lambda d: d['cases'][2].__setitem__('kind', 'exists once')), ('m7.idem', lambda d: d['cells']['append']['run twice'].__setitem__('right', True)),
           ('m8.paging', lambda d: d['cases'][1].__setitem__('rows', 25)), ('m13.config', lambda d: d['cells']['1|1|1']['batch_size'].__setitem__('source', 'environment')),
           ('m6.money', lambda d: d['sums'][4].__setitem__('float', '100000.0')), ('m12.mutants', lambda d: d['suites']['test_weak.py']['survived'].pop()),
           ('m11.validate', lambda d: d['models']['lax']['quarantine'].pop()), ('m9.fanout', lambda d: d['cases'][3].__setitem__('cents', 8836))]
for key, change in changes:
    data = json.loads(re.search(r'LAB\.real\s*=\s*(\{.*\})\s*;?\s*$', real_text, re.S).group(1))
    change(data['counts'][key])
    bad = WORK / ('bad_' + key + '.js')
    bad.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(data) + ';\n')
    r = subprocess.run(['node', str(HERE / 'check_widgets.js')], capture_output=True, text=True, env=dict(os.environ, REAL_JS=str(bad)))
    ok(r.returncode == 1, f'the widget checker must fail when {key} is changed on purpose')

# ---- 5. the independent widget checker ------------------------------------------------------------------------------------------------------------
print('5. widget checker')
r = subprocess.run(['node', str(HERE / 'check_widgets.js')], capture_output=True, text=True)
ok(r.returncode == 0, 'check_widgets.js: ' + r.stdout[-400:])
print('  ', r.stdout.strip().split('\n')[-1])

# ---- 6. record everything again and compare ----------------------------------------------------------------------------------------------------------
TIMING_TEXT = re.compile(r'(?<![\w.])(\d+(?:\.\d+)?)(?= ?(?:ms|s|us|seconds)\b)|\bin [\d.]+s\b|\b\d+\.\d{2,}\b|^\s+\d+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s+[\d.]+\s', re.M)
TIMING_COLUMNS = ('m10/vectorize', 'm8/batch_insert')   # tables whose numbers are all timings or rates: every number after two spaces is masked
TIMING_KEYS = ('m2/', 'm8/batch_insert', 'm10/profile_first', 'm10/vectorize', 'm10/concurrency', 'm12/pytest', 'm12/coverage', 'm12/hypothesis', 'm12/run_mutants', 'm13/checks', 'm14/pytest', 'm8/rate_limit', 'm9/', 'm4/')
LOOSE = {'m3.lookup': 5.0, 'm5.formats': 5.0, 'm8.batch': 5.0, 'm9.engines': 5.0, 'm10.profile': 5.0, 'm10.vector': 5.0, 'm10.concurrency': 3.0, 'm10.memory': 1.2, 'm3.idset': 1.2, 'm4.genmem': 1.1}


def compare(a, b, path, tol, bad):
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a or k not in b:
                bad.append(f'{path}/{k}: only in the {"recording" if k in a else "recapture"}')
            else:
                compare(a[k], b[k], f'{path}/{k}', tol, bad)
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            bad.append(f'{path}: {len(a)} items against {len(b)}')
        else:
            for i, (x, y) in enumerate(zip(a, b)):
                compare(x, y, f'{path}[{i}]', tol, bad)
    elif isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool):
        if a != b and not (tol and a and b and max(a, b) / max(min(a, b), 1e-9) <= tol) and not (abs(a - b) <= 0.02 * max(abs(a), abs(b))):
            bad.append(f'{path}: {a} against {b}')
    elif a != b:
        bad.append(f'{path}: {str(a)[:60]!r} against {str(b)[:60]!r}')


if args.recapture:
    print('6. recapture and compare')
    out = pathlib.Path(tempfile.gettempdir()) / 'py-course-cache' / 'recapture.js'
    out.parent.mkdir(exist_ok=True)
    if not (args.reuse and out.exists()):
        t0 = time.time()
        r = subprocess.run([sys.executable, str(HERE / 'capture_py.py'), '--out', str(out)], capture_output=True, text=True)
        ok(r.returncode == 0, 'capture_py.py failed: ' + (r.stdout + r.stderr)[-500:])
        print(f'   recorded again in {time.time() - t0:.0f} s')
    NEW = load_real(out)
    for k in sorted(set(REAL['files']) | set(NEW['files'])):
        ok(REAL['files'].get(k) == NEW['files'].get(k), f'file {k} differs from its recapture')
    for k in sorted(set(REAL['text']) | set(NEW['text'])):
        a, b = norm(REAL['text'].get(k, '<missing>')), norm(NEW['text'].get(k, '<missing>'))
        if k.startswith(TIMING_KEYS):
            a, b = TIMING_TEXT.sub('#', a), TIMING_TEXT.sub('#', b)
        if k.startswith(TIMING_COLUMNS):
            a, b = (re.sub(r'(?<=  )\d[\d,]*(?:\.\d+)?', '#', t) for t in (a, b))
        ok(a == b, f'text {k} differs from its recapture:\n--- recording\n{a[:300]}\n--- recapture\n{b[:300]}')
    bad = []
    for k in sorted(set(REAL['counts']) | set(NEW['counts'])):
        if k == 'exit':
            compare(REAL['counts'].get(k, {}), NEW['counts'].get(k, {}), 'counts/exit', 0, bad)
        else:
            compare(REAL['counts'].get(k), NEW['counts'].get(k), 'counts/' + k, LOOSE.get(k, 0), bad)
    for k in sorted(set(REAL['tables']) | set(NEW['tables'])):
        compare(REAL['tables'].get(k), NEW['tables'].get(k), 'tables/' + k, 1.02, bad)
    for line in bad:
        ok(False, 'recapture: ' + line)
    ok(not [k for k in ('python', 'pandas', 'polars', 'duckdb', 'pydantic', 'tenacity', 'typer', 'pytest', 'mypy', 'ruff') if REAL['meta'].get(k) != NEW['meta'].get(k)], 'the library versions of the recording and of the recapture are the same')
    print(f'   texts {len(REAL["text"])}, files {len(REAL["files"])}, counts {len(REAL["counts"])} compared')
else:
    print('6. recapture: skipped (use --recapture)')

if not args.keep:
    shutil.rmtree(WORK, ignore_errors=True)
print(f'\n{passed} checks passed, {failed} failed' + ('' if failed else '. All good.'))
sys.exit(1 if failed else 0)
