#!/usr/bin/env python3
"""Check the code and the recorded statements of the Snowflake and dbt tutorial.

Nothing in this tutorial ran on a Snowflake account. The statements that dbt sends were recorded from dbt-snowflake
against a stand-in connection (capture_sf.py). This script checks what can be checked without an account:

1. Every code snippet in the lessons is sorted into one of two groups:
   - taken from the recording: a statement or a script made of recorded statements, a recorded file, or recorded text.
     Nothing to parse, because dbt generated it.
   - written by hand for the lesson (setup scripts, restore SQL, workflow and job files, bug hunts and their fixes).
     Their syntax is checked: SQL with sqlglot in the Snowflake dialect, YAML with PyYAML, shell with `bash -n`,
     JSON with json. Every dbt command and flag in them is checked against `dbt <command> --help` of the installed dbt.
   A few Snowflake statements are newer than sqlglot's grammar. They are matched against the documented form by a
   pattern and counted separately, so the report says which statements only got a pattern check.
2. The logic of the lab widgets is checked against the recording and against arithmetic done by hand
   (node snowflake-dbt/verify/check_widgets.js).
3. Facts that the lessons quote from the adapter source are checked against the lines that capture_sf.py recorded.
4. With --recapture, the whole recording is made again and compared with js/real.js. Timings, clock stamps, key sizes,
   temporary names and the order of statements from parallel threads are ignored. Anything else is reported.

What this cannot show: that Snowflake accepts a statement, what it returns, what it costs, or how long it takes.
Run the hand-written SQL in a scratch schema of a trial account before you rely on it.

Run:  python3 snowflake-dbt/verify/verify_sf.py [--recapture] [--dbt PATH]
Needs: pip install sqlglot pyyaml (and dbt-core, dbt-snowflake for --recapture and the flag check), Node 20 or later, bash.
"""
import argparse, json, logging, pathlib, re, shutil, subprocess, sys, tempfile

import sqlglot, yaml
from sqlglot import errors, exp

logging.getLogger('sqlglot').setLevel(logging.ERROR)

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
ap = argparse.ArgumentParser()
ap.add_argument('--recapture', action='store_true')
ap.add_argument('--fresh', help='compare with an existing fresh recording instead of running capture_sf.py')
ap.add_argument('--verbose', action='store_true')
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


real = load_real(ROOT / 'snowflake-dbt' / 'js' / 'real.js')
data = json.loads(subprocess.check_output(['node', str(ROOT / 'dev' / 'dump-scenes.js'), 'snowflake-dbt']))


def squeeze(s):
    return re.sub(r'\s+', ' ', s).strip().rstrip(';').strip()


# ---- 1. snippets ------------------------------------------------------------------------------
recorded = set()
for stmts in real['stmts'].values():
    for s in stmts:
        recorded.add(squeeze(s['sql']))
files_and_text = {v.strip() for v in real['files'].values()} | {v.strip() for v in real['text'].values() if isinstance(v, str)}
comments = set()
for stmts in real['stmts'].values():
    for s in stmts:
        if s['comment']:
            comments.add(json.dumps(json.loads(s['comment']), sort_keys=True))


def from_recording(code):
    c = code.strip()
    if c in files_and_text:
        return True
    pieces = [p for p in re.split(r';\s*\n\s*\n', c) if p.strip()]
    if pieces and all(squeeze(p) in recorded for p in pieces):
        return True
    try:                                            # the query comment, shown as formatted JSON
        return json.dumps(json.loads(c), sort_keys=True) in comments
    except ValueError:
        return False


# Statements that Snowflake documents and sqlglot does not parse. Each pattern is the documented form.
DOCUMENTED = [
    (re.compile(r'^undrop (table|schema|database) [\w.]+$', re.I), 'undrop'),
    (re.compile(r'^alter (table|schema) [\w.]+ swap with [\w.]+$', re.I), 'swap with'),
    (re.compile(r'^create resource monitor \w+ with credit_quota = \d+ frequency = (monthly|daily|weekly|yearly|never) start_timestamp = immediately triggers( on \d+ percent do (notify|suspend|suspend_immediate))+$', re.I), 'resource monitor'),
    (re.compile(r'^alter warehouse \w+ set resource_monitor = \w+$', re.I), 'resource monitor'),
    (re.compile(r'^alter table [\w.]+ modify column \w+ set masking policy [\w.]+$', re.I), 'masking policy'),
    (re.compile(r'^create masking policy if not exists [\w.]+ as \(val string\) returns string -> case when .+ end$', re.I), 'masking policy'),
    (re.compile(r'^create schema [\w.]+ clone [\w.]+$', re.I), 'schema clone'),
    (re.compile(r"^create warehouse if not exists \w+ warehouse_size = '\w+' auto_suspend = \d+ auto_resume = true initially_suspended = true comment = '[^']*'$", re.I), 'create warehouse'),
    (re.compile(r'^alter warehouse \w+ set statement_timeout_in_seconds = \d+ statement_queued_timeout_in_seconds = \d+$', re.I), 'warehouse limits'),
    (re.compile(r'^(use role \w+|create role if not exists \w+|grant role \w+ to (user|role) \w+)$', re.I), 'roles'),
    (re.compile(r'^grant (usage|select|create schema) on (all tables in |future tables in )?(database|schema|warehouse)? ?[\w.]+ to role \w+$', re.I), 'grants'),
    (re.compile(r"^create table [\w.]+ clone [\w.]+ at\(timestamp => '[^']+'::timestamp_ltz\)$", re.I), 'clone at a time'),
]
parsed = pattern = 0
pattern_kinds = {}


def check_sql(code):
    global parsed, pattern
    for part in [p for p in re.split(r';\s*(?:\n|$)', code) if p.strip()]:
        body = re.sub(r'--[^\n]*', '', part).strip()
        if not body:
            continue
        tree = None
        try:
            tree = sqlglot.parse_one(body, read='snowflake', error_level=errors.ErrorLevel.RAISE)
            if tree is None:
                raise errors.ParseError('empty')
        except errors.SqlglotError:
            tree = None
        if tree is not None and not isinstance(tree, exp.Command):
            parsed += 1                     # a real syntax tree: sqlglot knows this statement
            continue
        # sqlglot either failed or fell back to a bare Command, which proves nothing. Match the documented form instead.
        flat = squeeze(body)
        for rx, kind in DOCUMENTED:
            if rx.match(flat):
                pattern += 1
                pattern_kinds[kind] = pattern_kinds.get(kind, 0) + 1
                break
        else:
            raise ValueError('no syntax tree and no documented pattern for: ' + flat[:90])


flags_checked = {}


def dbt_help(cmd):
    if cmd not in flags_checked:
        r = subprocess.run([args.dbt] + cmd.split() + ['--help'], capture_output=True, text=True)
        flags_checked[cmd] = r.stdout + r.stderr if r.returncode == 0 else None
    return flags_checked[cmd]


def check_dbt_commands(code, where):
    n = 0
    for m in re.finditer(r'(?:^|\s)dbt\s+(source freshness|docs generate|run-operation|[a-z-]+)((?:\s+(?:--?[\w-]+|[\w:+@./=\'"-]+))*)', code):
        cmd, rest = m.group(1), m.group(2)
        if cmd not in ('deps', 'parse', 'build', 'run', 'test', 'seed', 'snapshot', 'compile', 'clone', 'retry', 'debug', 'run-operation', 'source freshness', 'docs generate', 'ls'):
            continue
        helptext = dbt_help(cmd)
        if helptext is None:
            bad('%s: dbt %s is not a command of the installed dbt' % (where, cmd))
            continue
        for flag in re.findall(r'(?:^|\s)(--[\w-]+)', rest):
            n += 1
            if flag not in helptext:
                bad('%s: dbt %s has no flag %s' % (where, cmd, flag))
    return n


copied = hand = flags = 0
by_lang = {}
for sn in data['snippets']:
    code, lang = sn['code'], (sn['lang'] or '').lower()
    if sn['kind'] == 'starter':
        continue
    if from_recording(code):
        copied += 1
        continue
    hand += 1
    by_lang[lang] = by_lang.get(lang, 0) + 1
    where = '%s (%s, %s)' % (sn['id'], sn['kind'], lang)
    try:
        if lang in ('yaml', 'yml'):
            doc = yaml.safe_load(code)
            if isinstance(doc, dict) and 'jobs' in doc:          # a workflow file
                steps = doc['jobs']['check']['steps']
                assert all('uses' in s or 'run' in s for s in steps), 'every step needs uses or run'
            for step in (doc.get('jobs', {}).get('check', {}).get('steps', []) if isinstance(doc, dict) else []):
                flags += check_dbt_commands(step.get('run', ''), where)
        elif lang in ('bash', 'sh'):
            r = subprocess.run(['bash', '-n'], input=code, capture_output=True, text=True)
            assert r.returncode == 0, r.stderr.strip()
            flags += check_dbt_commands(code, where)
        elif lang == 'json':
            json.loads(code)
        elif lang in ('sql',):
            check_sql(code)
        elif lang == 'jinja':
            pass                                                  # model and macro files are taken from the recording
    except Exception as e:                                        # noqa: BLE001
        bad('%s: %s' % (where, str(e).splitlines()[0][:200]))
print('snippets: %d taken from the recording, %d written by hand and checked %s' % (copied, hand, json.dumps(by_lang)))
print('  hand-written SQL: %d statements parsed by sqlglot (Snowflake dialect), %d matched a documented pattern %s' % (parsed, pattern, json.dumps(pattern_kinds)))
print('  dbt flags in hand-written commands checked against `dbt <command> --help`: %d' % flags)

# ---- 2. the lessons rely on a few facts about the recording ---------------------------------------
facts = 0


def need(cond, msg):
    global facts
    facts += 1
    if not cond:
        bad(msg)


src = real['text']['auth_source']
for word in ('programmatic_access_token', 'workload_identity', '"jwt"', '"oauth"', 'Cannot specify both'):
    need(word in src, 'adapter source lines no longer mention %s, so the sign-in lesson must be rechecked' % word)
fields = set(json.loads(real['text']['credential_fields']))
for f in ('private_key_path', 'authenticator', 'query_tag', 'token', 'workload_identity_provider', 'reuse_connections'):
    need(f in fields, 'the adapter no longer accepts the profile field %s' % f)
st = real['stmts']
need(all(s['comment'] and '"node_id"' in s['comment'] for s in st['incr_merge'] if s['kind'] in ('ddl', 'dml')), 'every create and merge carries a query comment with a node id')
need(real['conns']['parse_only'] == 0, 'dbt parse opens no connection')
need(all(x['kind'] == 'meta' for x in st['compile_one']), 'dbt compile sends only metadata statements')
need(any(x['sql'].startswith('insert into') for x in st['incr_merge_nokey']) and not any(x['sql'].startswith('merge') for x in st['incr_merge_nokey']), 'a merge strategy without a key is sent as a plain insert')
need(any(x['sql'].startswith('create or replace transient table') for x in st['snapshot_first']), 'snapshots are transient by default')
need(any(x['sql'].startswith('create or replace table') for x in st['snapshot_permanent']), 'transient: false makes a snapshot permanent')
need(any(re.match(r'revoke\s+SELECT on \S+ from "OLD_ANALYST"', x['sql'], re.I) for x in st['grants_revoke']), 'dbt revokes a role that is not in the config')
need('drop_pr_schema runs only on the ci target' in real['text']['ci_cleanup_guard'], 'the cleanup macro stops on the prod target')
need(not st['ci_cleanup_guard'], 'nothing reaches Snowflake when the guard stops the macro')
need(all('<hidden>' != json.loads(real['text']['connect_debug_sso'])[k] for k in ('client_store_temporary_credential',)), 'boolean connect arguments are shown')
secret_hits = [k for k, v in real['text'].items() if k.startswith('connect_') and ('BEGIN' in v or 'password": "not-a' in v)]
need(not secret_hits, 'a recorded connection shows a secret: %s' % secret_hits)
print('facts: %d statements about the recording checked' % facts)

# ---- 3. widgets ---------------------------------------------------------------------------------
w = subprocess.run(['node', str(ROOT / 'snowflake-dbt' / 'verify' / 'check_widgets.js')], capture_output=True, text=True)
print('widgets:', (w.stdout.strip().splitlines() or ['no output'])[-1])
if w.returncode:
    print(w.stdout)
    bad('check_widgets.js failed')


# ---- 4. recapture and compare ---------------------------------------------------------------------
def norm(v):
    if isinstance(v, str):
        v = re.sub(r'(?m)^\d\d:\d\d:\d\d', 'HH:MM:SS', v)
        v = re.sub(r'<private key, \d+ bytes>', '<private key>', v)
        v = re.sub(r'\b\d+\.\d+s\b', 'Ns', v)
        v = re.sub(r'in [\d.]+ seconds', 'in N seconds', v)
        v = re.sub(r'(python version: ).*', r'\1X', v)
        return v
    if isinstance(v, list):
        return [norm(x) for x in v]
    if isinstance(v, dict):
        return {k: norm(x) for k, x in v.items()}
    return v


def settle(section, d):
    """Parallel threads send their statements in a different order on every run, so statements are compared as sorted lists.
    The number of connections depends on how the threads share the work, so it is only checked to stay within bounds."""
    d = dict(d)
    if section == 'stmts':
        # dbt builds the catalog query of `docs generate` from a set, so the order of its OR branches changes from run to run
        d = {k: sorted(json.dumps(dict(x, sql='\n'.join(sorted(x['sql'].splitlines()))) if k == 'docs_generate' else x, sort_keys=True) for x in v) for k, v in d.items()}
    if section == 'conns':
        d = {k: min(v, 1) for k, v in d.items()}
    return d


def compare(old, new):
    diffs = 0
    for section in sorted(set(old) | set(new)):
        a, b = settle(section, norm(old.get(section, {}))), settle(section, norm(new.get(section, {})))
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
        r = subprocess.run([sys.executable, str(ROOT / 'snowflake-dbt' / 'verify' / 'capture_sf.py'), '--dbt', args.dbt, '--out', str(fresh_path)], capture_output=True, text=True)
        if r.returncode:
            print(r.stdout[-2000:], r.stderr[-2000:])
            bad('capture_sf.py failed')
    if fresh_path.exists():
        diffs = compare(real, load_real(fresh_path))
        print('recapture: %d recorded items differ from a fresh run' % diffs)
        if diffs:
            bad('js/real.js is out of date: run python3 snowflake-dbt/verify/capture_sf.py and review the lessons that use the changed items')

print('verify_sf: ' + ('clean' if not problems else '%d problem(s)' % problems))
sys.exit(1 if problems else 0)
