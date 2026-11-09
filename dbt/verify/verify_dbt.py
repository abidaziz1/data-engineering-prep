#!/usr/bin/env python3
"""Check the code and the recorded output of the dbt tutorial.

1. Every code snippet in the lessons is sorted into one of two groups:
   - copied from the real project or from real dbt output (js/real.js). These ran under dbt, so there is nothing to parse.
   - written by hand for the lesson (bug hunts, fixes, workflow files). Their syntax is checked here:
     SQL and Jinja SQL are rendered with stand-in functions and parsed with sqlglot in the DuckDB dialect,
     YAML is parsed with PyYAML, Python is compiled, JSON is parsed.
2. The logic of the lab widgets is checked against the recorded dbt output (node dbt/verify/check_widgets.js).
3. With --recapture, the whole project is run again and the new recording is compared with js/real.js.
   Differences in timings, clock stamps, run-time dates and hashes are ignored. Anything else is reported.
   With --fresh FILE, an earlier fresh recording is compared instead, which is quicker when you tune the comparison.

Run:  python3 dbt/verify/verify_dbt.py [--recapture] [--dbt PATH]
Needs: pip install sqlglot pyyaml jinja2 (and dbt-core, dbt-duckdb for --recapture), Node 20 or later.
"""
import argparse, json, logging, pathlib, re, shutil, subprocess, sys, tempfile, types

import jinja2, sqlglot, yaml
from sqlglot import errors

logging.getLogger('sqlglot').setLevel(logging.ERROR)

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
ap = argparse.ArgumentParser()
ap.add_argument('--recapture', action='store_true')
ap.add_argument('--fresh', help='compare with an existing fresh recording instead of running capture.py')
ap.add_argument('--verbose', action='store_true', help='show the first differing lines of each difference')
ap.add_argument('--dbt', default=shutil.which('dbt') or str(pathlib.Path(sys.executable).with_name('dbt')))
args = ap.parse_args()

problems = 0


def bad(msg):
    global problems
    problems += 1
    print('PROBLEM:', msg)


def load_real(path):
    text = pathlib.Path(path).read_text()
    return json.loads(text[text.index('LAB.real = ') + len('LAB.real = '):].rstrip().rstrip(';'))


real = load_real(ROOT / 'dbt' / 'js' / 'real.js')
data = json.loads(subprocess.check_output(['node', str(ROOT / 'dev' / 'dump-scenes.js'), 'dbt']))

# ---- 1. snippets ------------------------------------------------------------------------------
known = set()
for bag in (real['files'], real['sql']):
    for v in bag.values():
        known.add(v.strip())
known.update(v.strip() for v in real['text'].values() if isinstance(v, str))

env = jinja2.Environment(undefined=jinja2.ChainableUndefined)
stubs = dict(
    ref=lambda *a, **k: 'ref_' + '_'.join(map(str, a)),
    source=lambda a, b: 'src_%s_%s' % (a, b),
    config=lambda **k: '', var=lambda a, d=None: d, this='this_table', is_incremental=lambda: True,
    target=types.SimpleNamespace(name='prod', schema='analytics'), execute=True,
    cents_to_dollars=lambda c, s=2: 'round(%s / 100.0, %s)' % (c, s), limit_in_dev=lambda n=1000: '',
)


def check_sql(code):
    out = env.from_string(code).render(**stubs)
    for part in [p for p in re.split(r';\s*(?:\n|$)', out) if p.strip()]:
        body = re.sub(r'--[^\n]*', '', part).strip()
        if body:
            sqlglot.parse_one(body, read='duckdb', error_level=errors.ErrorLevel.RAISE)


copied = hand = 0
by_lang = {}
for sn in data['snippets']:
    code, lang = sn['code'], (sn['lang'] or '').lower()
    if sn['kind'] == 'starter':
        continue                                   # starters are deliberately incomplete
    if code.strip() in known or code.strip() in {k.strip() for k in real['logs'].values()}:
        copied += 1
        continue
    hand += 1
    by_lang[lang] = by_lang.get(lang, 0) + 1
    try:
        if lang in ('yaml', 'yml'):
            yaml.safe_load(code)
        elif lang in ('python', 'py'):
            compile(code, sn['id'], 'exec')
        elif lang == 'json':
            json.loads(code)
        elif lang in ('sql', 'jinja'):
            check_sql(code)
    except Exception as e:                         # noqa: BLE001
        bad('%s (%s, %s): %s' % (sn['id'], sn['kind'], lang, str(e).splitlines()[0][:160]))
print('snippets: %d copied from real dbt files or output, %d written by hand and syntax-checked %s' % (copied, hand, json.dumps(by_lang)))

# ---- 1b. results shown in lessons are the recorded ones -----------------------------------------
tables = {json.dumps([t['cols'], t['rows']]) for t in real['tables'].values()}
n_res = 0
for r in data['results']:
    n_res += 1
    if json.dumps([r['cols'], r['rows']]) not in tables:
        bad('result table of %s does not equal any table recorded from dbt' % r['id'])
print('results: %d result tables shown in the lessons, all equal to a table recorded from a dbt run' % n_res if not problems else 'results: %d checked' % n_res)

# ---- 2. widgets ---------------------------------------------------------------------------------
w = subprocess.run(['node', str(ROOT / 'dbt' / 'verify' / 'check_widgets.js')], capture_output=True, text=True)
print('widgets:', (w.stdout.strip().splitlines() or ['no output'])[-1])
if w.returncode:
    print(w.stdout)
    bad('check_widgets.js failed')

# ---- 3. recapture and compare -------------------------------------------------------------------
def norm(v):
    """Make two recordings comparable: drop timings, clock stamps, run-time dates and hashes."""
    if isinstance(v, str):
        v = re.sub(r'(?m)^\d\d:\d\d:\d\d', 'HH:MM:SS', v)
        v = re.sub(r'(?m)^(HH:MM:SS  |Batch )\d+ of \d+ ', r'\1N of M ', v)   # which node gets which number depends on thread timing
        v = re.sub(r'[ ]*\.{2,}[ ]*', ' ... ', v)                                  # dbt pads log lines with dots to a fixed width
        v = re.sub(r'\b\d+\.\d+s\b', 'Ns', v)
        v = re.sub(r'in 0 hours 0 minutes and [\d.]+ seconds', 'in N seconds', v)
        v = re.sub(r'20\d\d-\d\d-\d\d \d\d:\d\d:\d\d(\.\d+)?', lambda m: m.group(0) if m.group(0).startswith('2026-03') else 'RUNTIME', v)
        v = re.sub(r'\b[0-9a-f]{32}\b', 'HASH', v)
        v = re.sub(r'"execution_time": [\d.]+', '"execution_time": N', v)
        v = re.sub(r'"checksum": "[0-9a-f.]+', '"checksum": "H', v)
        v = re.sub(r'revision [0-9a-f]{40}', 'revision H', v)
        return v
    if isinstance(v, list):
        return [norm(x) for x in v]
    if isinstance(v, dict):
        return {k: norm(x) for k, x in v.items()}
    return v


def settle(section, d):
    """Parallel threads print their lines in a different order on every run, so logs are compared as sets of lines.
    Timings of single nodes depend on the machine, so the ranking of the slowest nodes is not compared."""
    d = dict(d)
    if section == 'logs':
        d = {k: '\n'.join(sorted(str(v).splitlines())) for k, v in d.items()}
    if section == 'text':
        d.pop('slowest_out', None)
    return d


def compare(old, new):
    diffs = 0
    for section in sorted(set(old) | set(new)):
        a, b = norm(old.get(section, {})), norm(new.get(section, {}))
        if isinstance(a, dict) and isinstance(b, dict):
            a, b = settle(section, a), settle(section, b)
        if isinstance(a, dict) and isinstance(b, dict):
            for key in sorted(set(a) | set(b)):
                if a.get(key) != b.get(key):
                    diffs += 1
                    print('DIFF: %s / %s' % (section, key))
                    if args.verbose:
                        import difflib
                        x, y = str(a.get(key)).splitlines(), str(b.get(key)).splitlines()
                        for ln in list(difflib.unified_diff(x, y, 'recorded', 'fresh', lineterm='', n=0))[:8]:
                            print('     ', ln[:160])
        elif a != b:
            diffs += 1
            print('DIFF:', section)
    return diffs


if args.recapture or args.fresh:
    if args.fresh:
        fresh_path = pathlib.Path(args.fresh)
    else:
        fresh_path = pathlib.Path(tempfile.mkdtemp()) / 'real.js'
        r = subprocess.run([sys.executable, str(ROOT / 'dbt' / 'verify' / 'capture.py'), '--dbt', args.dbt, '--out', str(fresh_path)], capture_output=True, text=True)
        if r.returncode:
            print(r.stdout[-2000:], r.stderr[-2000:])
            bad('capture.py failed')
    if fresh_path.exists():
        diffs = compare(real, load_real(fresh_path))
        print('recapture: %d recorded items differ from a fresh run' % diffs)
        if diffs:
            bad('js/real.js is out of date: run python3 dbt/verify/capture.py and review the lessons that use the changed items')

print('verify_dbt: ' + ('clean' if not problems else '%d problem(s)' % problems))
sys.exit(1 if problems else 0)
