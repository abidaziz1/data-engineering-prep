#!/usr/bin/env python3
"""Check the code and the recorded output of the Git course.

 1. The files of the recording are the files of git/verify/project, and every code screen that names such a file shows it.
 2. The code of the lessons is run, not only read. The ignore file, the check script, the hook, the attributes file and the three SQL files are used in a
    throwaway repository, and each broken example (the .gitignore with the wrong order, the check that always passes, the three force pushes, the
    `git add -A`) is run next to its fix and must do what the lesson says it does.
 3. Every `git` command of the terminal replays and of the code screens is checked against the git that is installed: the command exists, so does
    its subcommand, and so does every flag. A flag that the short help does not list (`--oneline`, `--graph`) is tried in a scratch repository.
 4. Every commit id that a lesson prints is one that the recording printed.
 5. The lab data: check_widgets.js recomputes the rules from the recording, and ten changes to the recording must make it fail.
 6. The lint of the course (dev/lint-content.js).
 7. With --recapture the whole recording is made again on this machine (about 15 seconds) and compared with js/real.js. Commit ids repeat, because the
    author and every date are fixed, so the only allowance is the date of the recording.
 8. With --browser the six labs are driven in Chromium (e2e_labs.js), and six changes to the widget code must make that test fail.

What this cannot show: how GitHub, GitLab or Azure DevOps behave (pull requests, branch protection, required reviews, merge queues, signed commits). Those screens
carry the "From documentation" tag, and the README lists what to check again.

Run:   python3 git/verify/verify_git.py [--recapture] [--browser] [--verbose]
Needs: git 2.43 or later with git-lfs, Python 3.11 or later, Node 20 or later. PyYAML, sqlglot and duckdb are used when installed (see requirements.txt); a check whose
       tool is missing says so and is skipped.
"""
import argparse
import json
import os
import pathlib
import re
import shlex
import shutil
import subprocess
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
PROJECT = HERE / 'project'
sys.path.insert(0, str(HERE))
import gitlib                                          # noqa: E402
from gitlib import git, sh, mkrepo, write, commit      # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--recapture', action='store_true', help='record everything again on this machine and compare with js/real.js (about 15 seconds)')
ap.add_argument('--browser', action='store_true', help='also drive the six labs in Chromium (git/verify/e2e_labs.js) and its controls')
ap.add_argument('--verbose', '-v', action='store_true')
args = ap.parse_args()

problems, counts, skips = [], {}, []


def bad(msg):
    problems.append(msg)
    print('PROBLEM:', msg)


def tick(group, n=1):
    counts[group] = counts.get(group, 0) + n


def skipped(what, why):
    skips.append('%s: %s' % (what, why))
    print('skipped:', what, '(' + why + ')')


def expect(cond, msg, group='checks'):
    tick(group)
    if not cond:
        bad(msg)
    elif args.verbose:
        print('ok:', msg)


def control(label, refused):
    """A control feeds a broken input to a checker. refused() returns True (or raises) when the checker caught it."""
    tick('controls')
    try:
        if refused():
            return
    except Exception:      # noqa: BLE001
        return
    bad('control "%s": the checker accepted a broken input' % label)


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def load_real(path):
    txt = pathlib.Path(path).read_text()
    return json.loads(txt[txt.index('LAB.real = ') + len('LAB.real = '):].rstrip().rstrip(';'))


REAL = load_real(ROOT / 'git' / 'js' / 'real.js')
r = run(['node', str(HERE / 'dump_git.js')], cwd=str(ROOT))
if r.returncode:
    print('PROBLEM: the course does not load: ' + (r.stderr or r.stdout)[-600:])
    sys.exit(1)
DUMP = json.loads(r.stdout)
CODE = {c['id']: c for c in DUMP['code']}
F, X = REAL['files'], REAL['text']

try:
    import yaml
except ImportError:
    yaml = None
    skipped('YAML', 'PyYAML is not installed')
try:
    import sqlglot
except ImportError:
    sqlglot = None
    skipped('SQL parsing', 'sqlglot is not installed')
try:
    import duckdb
except ImportError:
    duckdb = None
    skipped('SQL runs', 'duckdb is not installed')

_n = [0]


def scratch(name):
    _n[0] += 1
    return mkrepo('%s-%d' % (name, _n[0]))


def clone(origin, name):
    _n[0] += 1
    dest = 'c%d-%s' % (_n[0], name)
    git(gitlib.BASE, 'clone', '-q', str(origin), dest)
    return pathlib.Path(gitlib.BASE) / dest


# ----------------------------------------------------------------------------------------------------------------------
# 1. The files of the recording and the code screens
# ----------------------------------------------------------------------------------------------------------------------
for key, text in F.items():
    p = PROJECT / key if not key.startswith('.github/') else PROJECT / 'ci.yml'
    if key in ('conflict/resolved.sql', 'notebooks/explore_cell.json'):
        continue          # made by the recorder (a resolved file, the first cell of a notebook): the code screens are compared with them below
    expect(p.exists() and p.read_text() == text, 'the recording holds %s as it is on disk' % key, 'recorded files')
by_name = {}
for k, v in F.items():
    by_name[k] = v
    by_name.setdefault(k.split('/')[-1], v)
# code screens that show a file in another state than the project holds
SHOWS = {'m3-markers': X['cf.markers'], 'm3-resolved': F['conflict/resolved.sql'], 'm10-ch:sol': F['hooks/pre-commit']}
for c in DUMP['code']:
    want = SHOWS.get(c['id'])
    if want is None and c['type'] == 'code' and c['file'] in by_name:
        want = by_name[c['file']]
    if want is not None:
        expect(c['code'].rstrip('\n') == want.rstrip('\n'), 'the code screen %s shows %s exactly' % (c['id'], c['file']), 'code screens that show a recorded file')
expect(len([c for c in DUMP['code'] if c['type'] == 'code']) >= 8, 'the lessons hold at least eight code screens', 'code screens that show a recorded file')

# ----------------------------------------------------------------------------------------------------------------------
# 2. The code of the lessons, used in throwaway repositories
# ----------------------------------------------------------------------------------------------------------------------
def ignored(repo, path):
    return git(repo, 'check-ignore', '-q', path, check=False).rc == 0


# 2a. .gitignore: the lesson file ignores what it says, and the bug (the negation first) ignores the sample too
r1 = scratch('ign')
write(r1, '.gitignore', CODE['m1-ignorefile']['code'])
for path, want in (('data/orders.csv', True), ('run.log', True), ('.env', True), ('loader/__pycache__/x.pyc', True), ('models/orders_daily.sql', False), ('loader/load_orders.py', False)):
    expect(ignored(r1, path) == want, 'the .gitignore of the lesson %s %s' % ('ignores' if want else 'keeps', path), 'ignore file')
for label, key, want in (('the bug hunt (the negation comes first)', 'm1-bug', True), ('its fix (the negation comes last)', 'm1-bug:fix', False)):
    r2 = scratch('ign')
    write(r2, '.gitignore', CODE[key]['code'])
    expect(ignored(r2, 'data/sample.csv') == want, '%s: data/sample.csv is %s' % (label, 'ignored' if want else 'kept'), 'ignore file')
    expect(ignored(r2, 'data/other.csv') is True, '%s: data/other.csv is ignored' % label, 'ignore file')
expect(F['.gitignore'].rstrip('\n') == CODE['m1-ignorefile']['code'].rstrip('\n'), 'the lesson shows the .gitignore of the project', 'ignore file')
r_empty = scratch('ign')
write(r_empty, '.gitignore', '# nothing\n')
control('an ignore file with no rule, asked about data/orders.csv', lambda: not ignored(r_empty, 'data/orders.csv'))

# 2b. conflict markers: git diff --check finds them, the resolved model and the model run in DuckDB
r3 = scratch('markers')
commit(r3, 'model', {'models/orders_daily.sql': (PROJECT / 'models/orders_daily.sql').read_text()})
write(r3, 'models/orders_daily.sql', CODE['m3-markers']['code'] + '\n')
chk = git(r3, 'diff', '--check', check=False)
expect(chk.rc != 0 and chk.all.count('leftover conflict marker') == 3, 'git diff --check names the three marker lines of the lesson file: ' + chk.all.strip()[:120], 'conflict markers')
write(r3, 'models/orders_daily.sql', CODE['m3-resolved']['code'] + '\n')
expect(git(r3, 'diff', '--check', check=False).rc == 0, 'git diff --check passes on the resolved model', 'conflict markers')
expect(CODE['m3-bug']['code'] == CODE['m3-markers']['code'] and CODE['m3-bug:fix']['code'] == CODE['m3-resolved']['code'], 'the bug hunt starts from the file with markers and its fix is the resolved model', 'conflict markers')

ROWS = [('2026-03-02', 1, 4.0), ('2026-03-02', 1, 6.0), ('2026-03-02', 2, 5.0), ('2026-03-03', 1, 9.0)]


def run_model(sql):
    con = duckdb.connect()
    con.execute('create table raw_orders(order_date date, store_id int, amount double)')
    con.executemany('insert into raw_orders values (?, ?, ?)', ROWS)
    cur = con.execute('select * from (%s) order by 1, 2' % sql.strip().rstrip(';'))
    return [d[0] for d in cur.description], cur.fetchall()


if duckdb:
    cols, rows = run_model(CODE['m3-resolved']['code'])
    expect(cols == ['order_date', 'store_id', 'orders', 'revenue', 'avg_amount', 'max_amount'], 'the resolved model has the columns of both branches: %s' % cols, 'SQL runs')
    expect([tuple(x[1:]) for x in rows] == [(1, 2, 10.0, 5.0, 6.0), (2, 1, 5.0, 5.0, 5.0), (1, 1, 9.0, 9.0, 9.0)], 'the resolved model gives orders, revenue, average and maximum that match the rows: %s' % rows, 'SQL runs')
    cols, rows = run_model((PROJECT / 'models/orders_daily.sql').read_text())
    expect(cols == ['order_date', 'store_id', 'orders', 'revenue'] and [x[2:] for x in rows] == [(2, 10.0), (1, 5.0), (1, 9.0)], 'the model of the project counts and adds the rows', 'SQL runs')
    control('the file with markers, given to DuckDB', lambda: run_model(CODE['m3-markers']['code']) is None)
if sqlglot:
    for sid in ('m3-resolved', 'm3-bug:fix'):
        try:
            sqlglot.parse_one(CODE[sid]['code'], read='duckdb')
            tick('SQL parsed')
        except Exception as e:     # noqa: BLE001
            bad('sqlglot cannot parse %s: %s' % (sid, str(e)[:100]))
    control('the file with markers, given to sqlglot', lambda: sqlglot.parse_one(CODE['m3-markers']['code'], read='duckdb') is None)

# 2c. the check script: the nightly check passes at 0.09 and fails at 0.8, and the script without set -e hides a failed loader
chk_sh = F['checks/check.sh']
rc_ = scratch('check')
write(rc_, 'checks/check.sh', chk_sh)
for rate, want_rc, word in (('0.09', 0, 'check passed'), ('0.25', 0, 'check passed'), ('0.26', 1, 'check failed'), ('0.8', 1, 'check failed')):
    write(rc_, 'loader/tax_rate.txt', rate + '\n')
    o = sh(rc_, 'sh checks/check.sh', check=False)
    expect(o.rc == want_rc and word in o.all, 'checks/check.sh at a rate of %s exits with %d and says "%s": %s' % (rate, want_rc, word, o.all.strip()), 'check script')
shutil.copytree(PROJECT / 'loader', rc_ / 'loader', dirs_exist_ok=True)
for key, want in (('m6-bug', 0), ('m6-bug:fix', 1)):
    write(rc_, 'checks/loader_check.sh', CODE[key]['code'])
    o = sh(rc_, 'sh checks/loader_check.sh', check=False)
    expect((o.rc == 0) == (want == 0) and ('load finished' in o.all) == (want == 0), '%s: with a loader that fails, the script exits with %s: %s' % (key, 'status 0 and says it finished' if want == 0 else 'a failure', o.all.strip()[-120:]), 'check script')
expect(sh(rc_, 'python3 loader/load_orders.py data/orders.csv', check=False).rc != 0, 'the loader fails when there is no orders file, so the failing loader of the bug hunt is real', 'check script')
for rel in ('checks/check.sh', 'hooks/pre-commit'):
    o = sh(rc_, 'sh -n ' + shlex.quote(str(PROJECT / rel)), check=False)
    expect(o.rc == 0, 'the shell syntax of %s is valid' % rel, 'shell syntax')
control('a script with a syntax error, given to sh -n', lambda: sh(rc_, "printf 'if true; then\\n' | sh -n", check=False).rc != 0)
for c in DUMP['code']:
    if c['lang'] == 'bash':
        o = sh(rc_, 'bash -n -c ' + shlex.quote(c['code']), check=False)
        expect(o.rc == 0, 'the shell syntax of the code screen %s is valid: %s' % (c['id'], o.all.strip()[:100]), 'shell syntax')

# 2d. the pre-commit hook: it refuses a key and a token, accepts a normal commit, and --no-verify skips it
for key in ('m8-hook', 'm10-ch:sol'):
    hook_text = CODE[key]['code']
    rh = scratch('hook')
    commit(rh, 'start', {'README.md': 'hello\n'})
    write(rh, '.git/hooks/pre-commit', hook_text + '\n')
    os.chmod(str(rh / '.git/hooks/pre-commit'), 0o755)
    for text, want_rc, what in (('aws_key = AKIAIOSFODNN7EXAMPLE\n', 1, 'an access key'), ('token = abcdefghijklmnop1234\n', 1, 'a token'), ('rate = 0.09\n', 0, 'a plain line')):
        write(rh, 'settings.txt', text)
        git(rh, 'add', 'settings.txt')
        o = git(rh, 'commit', '-q', '-m', 'settings', check=False)
        expect(o.rc == want_rc and (want_rc == 0 or 'looks like a secret' in o.all), '%s: a commit that adds %s exits with %d: %s' % (key, what, want_rc, o.all.strip()[:90]), 'hook')
        if want_rc:
            o2 = git(rh, 'commit', '-q', '--no-verify', '-m', 'settings', check=False)
            expect(o2.rc == 0, '%s: --no-verify lets the same commit through' % key, 'hook')
expect(CODE['m8-hook']['code'].rstrip('\n') == CODE['m10-ch:sol']['code'].rstrip('\n') == F['hooks/pre-commit'].rstrip('\n'), 'the hook of mission 8 and the solution of the boss challenge are the hook of the project', 'hook')

# 2e. the attributes file of LFS
ra = scratch('attr')
write(ra, '.gitattributes', CODE['m7-lfs']['code'] + '\n')
expect('filter: lfs' in git(ra, 'check-attr', 'filter', '--', 'data/orders.parquet').out and 'filter: unspecified' in git(ra, 'check-attr', 'filter', '--', 'data/orders.csv').out, 'the attributes line sends parquet files, and only those, to the LFS filter', 'attributes')
nb = json.loads(CODE['m7-notebook']['code'])
expect(nb['cell_type'] == 'code' and nb['source'] == ['print(0)'] and nb['outputs'][0]['text'] == ['0\n'], 'the notebook cell of the lesson is valid JSON with one line of code and one output', 'notebook')

# 2f. the workflow file
if yaml:
    def steps(text):
        d = yaml.safe_load(text)
        return d['jobs']['check']['steps'] if 'jobs' in d else d['steps']
    ci = yaml.safe_load(CODE['m8-ci']['code'])
    expect(ci['jobs']['check']['steps'][0]['with']['fetch-depth'] == 0 and ci['jobs']['check']['steps'][1]['run'] == 'sh checks/check.sh' and True in ci, 'the workflow of the lesson fetches the whole history and runs checks/check.sh (key "on" is read by YAML 1.1 as True: ok)', 'workflow')
    expect(CODE['m8-ci']['code'].rstrip('\n') == F['.github/workflows/check.yml'].rstrip('\n'), 'the workflow of the lesson is the recorded file', 'workflow')
    expect('with' not in steps(CODE['m8-bug']['code'])[0] and steps(CODE['m8-bug:fix']['code'])[0]['with']['fetch-depth'] == 0, 'the workflow bug lacks fetch-depth and its fix sets it to 0', 'workflow')
    expect(X['tag.describe_shallow'].startswith('fatal: No names found'), 'the recording shows what the bug does: describe finds no tag in a shallow clone', 'workflow')
    control('a workflow with a tab, given to YAML', lambda: yaml.safe_load('steps:\n\t- run: x\n') is None)

# 2g. the three force pushes, the `git add -A` and the reset, each run next to its fix
def make_remote(extra_branch=False):
    origin = mkrepo('origin-%d' % (_n[0] + 1), bare=True)
    _n[0] += 1
    a = clone(origin, 'maya')
    commit(a, 'one', {'models/m.sql': 'select 1\n', 'loader/l.py': 'print(1)\n'})
    commit(a, 'two', {'models/m.sql': 'select 2\n'})
    commit(a, 'three', {'models/m.sql': 'select 3\n'})
    git(a, 'push', '-q', '-u', 'origin', 'main')
    if extra_branch:
        git(a, 'switch', '-q', '-c', 'feature')
        commit(a, 'feature one', {'f.txt': 'f1\n'})
        git(a, 'push', '-q', '-u', 'origin', 'feature')
        git(a, 'switch', '-q', 'main')
    return origin, a


def count(repo, ref):
    return int(git(repo, 'rev-list', '--count', ref).out.strip())


def script(repo, key):
    return sh(repo, CODE[key]['code'], check=False)


# m4: reset and force push against revert
for key, bad_ in (('m4-bug', True), ('m4-bug:fix', False)):
    origin, a = make_remote()
    b = clone(origin, 'omar')
    o = script(a, key)
    git(b, 'fetch', '-q')
    remote_commits = count(b, 'origin/main')
    if bad_:
        expect(o.rc == 0 and remote_commits == 2, 'm4-bug: after reset --hard and --force the remote has 2 commits, and the colleague\'s clone still holds the third (%d)' % remote_commits, 'force pushes')
        expect(count(b, 'main') == 3 and git(b, 'log', '--oneline', 'main').out.count('three') == 1, 'm4-bug: the colleague still has the removed commit', 'force pushes')
    else:
        expect(o.rc == 0 and remote_commits == 4 and git(b, 'merge', '--ff-only', 'origin/main', check=False).rc == 0, 'm4-bug fix: revert adds a fourth commit, the push needs no force, and the colleague can fast-forward', 'force pushes')
        expect(git(a, 'show', 'HEAD:models/m.sql').out == 'select 2\n', 'm4-bug fix: the revert put the file back to the state before the last commit', 'force pushes')

# m5: --force against pull --rebase
for key, bad_ in (('m5-bug', True), ('m5-bug:fix', False)):
    origin, a = make_remote()
    b = clone(origin, 'omar')
    commit(b, 'omar pushes', {'extra.txt': 'o\n'}, who='omar')
    git(b, 'push', '-q', 'origin', 'main')
    write(a, 'models/m.sql', 'select 4\n')
    o = script(a, key)
    git(b, 'fetch', '-q')
    log = git(b, 'log', '--format=%s', 'origin/main').out
    if bad_:
        expect(o.rc == 0 and 'omar pushes' not in log, 'm5-bug: --force replaced the remote, and the colleague\'s commit is gone from main', 'force pushes')
    else:
        expect(o.rc == 0 and 'omar pushes' in log and 'Update the model' in log and int(git(b, 'rev-list', '--merges', '--count', 'origin/main').out) == 0, 'm5-bug fix: pull --rebase keeps the colleague\'s commit and adds ours, without a merge commit', 'force pushes')

# m2: --force against --force-with-lease, after a rebase of a branch that the colleague also pushed to
for key, bad_ in (('m2-bug', True), ('m2-bug:fix', False)):
    origin, a = make_remote(extra_branch=True)
    b = clone(origin, 'omar')
    git(b, 'switch', '-q', 'feature')
    commit(b, 'omar on feature', {'g.txt': 'g\n'}, who='omar')
    git(b, 'push', '-q', 'origin', 'feature')
    commit(a, 'main moves', {'models/m.sql': 'select 5\n'})
    git(a, 'push', '-q', 'origin', 'main')
    o = script(a, key)
    git(b, 'fetch', '-q')
    log = git(b, 'log', '--format=%s', 'origin/feature').out
    if bad_:
        expect(o.rc == 0 and 'omar on feature' not in log, 'm2-bug: --force after the rebase replaced the branch, and the colleague\'s commit is gone from it', 'force pushes')
    else:
        expect(o.rc != 0 and 'stale info' in o.all and 'omar on feature' in log, 'm2-bug fix: --force-with-lease refused ("stale info") and the colleague\'s commit is still on the remote branch', 'force pushes')

# m7: git add -A takes an .env that is not ignored; the fix adds only the folders that were meant
for key, bad_ in (('m7-bug', True), ('m7-bug:fix', False)):
    origin, a = make_remote()
    write(a, '.env', 'AWS_SECRET=AKIAIOSFODNN7EXAMPLE\n')
    write(a, 'models/m.sql', 'select 9\n')
    o = script(a, key)
    tree = git(origin, 'ls-tree', '-r', '--name-only', 'main').out.split()
    expect(o.rc == 0 and ('.env' in tree) == bad_, 'm7-bug%s: the key file %s on the remote' % ('' if bad_ else ' fix', 'is' if bad_ else 'is not'), 'secrets')
    if bad_:
        git(a, 'rm', '-q', '--cached', '.env')
        git(a, 'commit', '-q', '-m', 'Remove the file')
        git(a, 'push', '-q', 'origin', 'main')
        expect('AKIAIOSFODNN7EXAMPLE' in git(origin, 'log', '-p', '-S' + 'AKIAIOSFODNN7EXAMPLE', '--format=%s').out, 'm7-bug: after a commit that deletes the file, the key is still in the history on the remote', 'secrets')

# ----------------------------------------------------------------------------------------------------------------------
# 3. The commands of the replays and of the code screens against the installed git
# ----------------------------------------------------------------------------------------------------------------------
probe = scratch('probe')
commit(probe, 'one', {'a.txt': 'a\n'})
commit(probe, 'two', {'a.txt': 'b\n'})
_help = {}


def help_of(words):
    k = tuple(words)
    if k not in _help:
        o = git(probe, *words, '-h', check=False)
        _help[k] = o.all
    return _help[k]


SUBSUB = {'bisect': True, 'worktree': True, 'sparse-checkout': True, 'lfs': True, 'stash': False, 'remote': False, 'reflog': False}
PROBE = {'log': ['log', '{f}', '-1'], 'diff': ['diff', '{f}', 'HEAD~1', 'HEAD'], 'show': ['show', '{f}', 'HEAD'], 'rev-list': ['rev-list', '{f}', 'HEAD'], 'shortlog': ['shortlog', '{f}', 'HEAD'], 'blame': ['blame', '{f}', 'a.txt']}
BAD_WORDS = re.compile(r'unknown (option|switch)|unrecognized argument|ambiguous argument .-|invalid option|unknown option|is not a git command', re.I)


def flag_listed(flag, usage):
    if flag.startswith('--'):
        base = flag[2:].split('=')[0]
        names = {'--' + base, '--[no-]' + base}
        if base.startswith('no-'):
            names |= {'--' + base[3:], '--[no-]' + base[3:]}
        return any(re.search(r'(?<![\w\[-])' + re.escape(n) + r'(?![\w-])', usage) for n in names) or any(n in usage for n in ('--[no-]' + base, '--' + base))
    letters = flag[1:]
    chars = letters[:1] if len(letters) > 1 and re.search(r'[0-9A-Z=]', letters[1:]) else letters
    return all(re.search(r'(?<![\w-])-' + re.escape(c) + r'(?![\w-])', usage) for c in chars)


def probe_flag(sub, flag):
    argv = [a.replace('{f}', flag) for a in PROBE.get(sub, [sub, '{f}'])]
    o = git(probe, *argv, check=False)
    return not BAD_WORDS.search(o.all)


def tokens_of(cmd):
    lex = shlex.shlex(cmd, posix=True, punctuation_chars=True)
    lex.whitespace_split = True
    try:
        return list(lex)
    except ValueError:
        return cmd.split()


def segments(toks):
    seg, out = [], []
    for t in toks:
        if t in ('|', '&&', ';', '||', '&') or set(t) <= set('|&;()'):
            if seg:
                out.append(seg)
            seg = []
        else:
            seg.append(t)
    if seg:
        out.append(seg)
    return out


def check_git(seg):
    """seg starts with git. Returns a list of problems."""
    out, i = [], 1
    while i < len(seg) and seg[i].startswith('-'):
        i += 2 if seg[i] in ('-C', '-c') else 1
    if i >= len(seg):
        return out
    sub = seg[i]
    rest = seg[i + 1:]
    usage = help_of([sub])
    if re.search(r'is not a git command', usage) or not re.search(r'usage', usage, re.I):
        return ['"git %s" is not a command of this git' % sub]
    words = [sub]
    if sub in SUBSUB:
        nxt = next((t for t in rest if not t.startswith('-')), None)
        if nxt is not None and re.fullmatch(r'[a-z][a-z-]*', nxt):
            if not re.search(r'(?<![\w-])' + re.escape(nxt) + r'(?![\w-])', usage):
                sub_help = help_of([sub, nxt]) if sub == 'lfs' else ''
                if sub == 'lfs' and nxt in sub_help and 'unknown command' not in sub_help:
                    words = [sub, nxt]
                elif SUBSUB[sub]:
                    out.append('"git %s %s" is not a subcommand: the usage lists none like it' % (sub, nxt))
            else:
                words = [sub, nxt]
                if sub != 'bisect' and sub != 'lfs':
                    usage = usage + help_of(words)
    for t in rest:
        if t == '--':
            break
        if not t.startswith('-') or t == '-':
            continue
        if re.fullmatch(r'-\d+', t):
            continue
        if flag_listed(t, usage):
            continue
        if sub in ('stash',) and flag_listed(t, help_of(['stash', 'push'])):
            continue
        if probe_flag(sub, t):
            continue
        out.append('"git %s" has no flag %s' % (sub, t))
    return out


NONGIT = {'cat', 'du', 'grep', 'ls', 'cp', 'echo', 'wc', 'sed', 'python3', 'rm', 'find', 'awk', 'head', 'tail', 'sort', 'mkdir', 'cd', 'sh', 'printf'}


def check_command(cmd):
    out = []
    for seg in segments(tokens_of(cmd)):
        while seg and re.fullmatch(r'[A-Z_]+=.*', seg[0]):
            seg = seg[1:]
        if not seg:
            continue
        if seg[0] == 'git':
            out += check_git(seg)
        elif seg[0] not in NONGIT and not shutil.which(seg[0]) and not seg[0].startswith(('$', '<', '>', '.', '/')):
            out.append('"%s" is not a command here' % seg[0])
    return out


n_cmd = 0
for c in DUMP['commands']:
    n_cmd += 1
    for p in check_command(c['cmd']):
        bad('%s: %s (in "%s")' % (c['id'], p, c['cmd'][:100]))
tick('commands of the replays checked against the installed git', n_cmd)
for c in DUMP['code']:
    if c['lang'] == 'bash' and c['id'].split(':')[0] not in ('m6-check', 'm6-bug'):
        for line in c['code'].split('\n'):
            if line.strip().startswith('git '):
                tick('git commands of the code screens checked against the installed git')
                for p in check_command(line.strip()):
                    bad('%s: %s (in "%s")' % (c['id'], p, line[:100]))
expect(n_cmd >= 150, 'the replays hold at least 150 commands (found %d)' % n_cmd, 'git help')
control('a flag that does not exist', lambda: check_command('git commit --not-a-flag') != [])
control('a subcommand that does not exist', lambda: check_command('git frobnicate') != [])
control('a bisect subcommand that does not exist', lambda: check_command('git bisect frobnicate') != [])
control('a log flag that does not exist (found by trying it)', lambda: check_command('git log --onelinee') != [])
control('a short flag that does not exist', lambda: check_command('git push -Z origin main') != [])
control('a command that does not exist', lambda: check_command('git log | frobnicator') != [])
expect(check_command('git log --oneline --graph --decorate -S0 --max-parents=0 --date=short') == [], 'the command checker accepts valid log flags, including ones that git log -h does not list', 'git help')
expect(check_command('git push --force-with-lease origin feature && git push --follow-tags') == [], 'the command checker splits at && and accepts the flags of both', 'git help')
expect(check_command('git bisect run sh checks/check.sh') == [] and check_command('git lfs track "*.parquet"') == [], 'the command checker accepts bisect run and lfs track', 'git help')

# ----------------------------------------------------------------------------------------------------------------------
# 4. The commit ids that a lesson prints are ids of the recording
# ----------------------------------------------------------------------------------------------------------------------
recorded = json.dumps(REAL, ensure_ascii=False)
rec_ids = set(re.findall(r'(?:\b|(?<=-g))[0-9a-f]{7,64}\b', recorded))      # the second form reads the id in the output of git describe: v1.1.0-2-ga591c12
HEX = re.compile(r'(?<![\w/.-])(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{7,40}(?![\w-])')
# strings that name a made-up id on purpose (an example of what an id looks like) are listed here, with the reason
EXAMPLES = set()
seen_ids = 0
for path, s in DUMP['strings']:
    for m in HEX.finditer(s):
        h = m.group(0)
        seen_ids += 1
        expect(h in EXAMPLES or any(x.startswith(h) or h.startswith(x) for x in rec_ids), 'the id %s in %s is one that the recording printed' % (h, path), 'ids in the lessons')
tick('ids in the lessons looked up', seen_ids)
control('an id that the recording never printed', lambda: 'abc1234' not in rec_ids)

# ----------------------------------------------------------------------------------------------------------------------
# 5. The recording made again, and compared
# ----------------------------------------------------------------------------------------------------------------------
def flatten(real):
    out = {}
    for kind in ('meta', 'counts', 'tables', 'text', 'files'):
        for k, v in real[kind].items():
            out[kind + ':' + k] = v
    return out


SKIP = {'meta:recorded_on': 'the date'}


def differing(a, b):
    fa, fb = flatten(a), flatten(b)
    out = []

    def walk(x, y, p, key):
        if isinstance(x, dict) and isinstance(y, dict):
            if set(x) != set(y):
                return [key + p]
            return sum((walk(x[k], y[k], p + '.' + k, key) for k in x), [])
        if isinstance(x, list) and isinstance(y, list):
            if len(x) != len(y):
                return [key + p]
            return sum((walk(u, v, p + '[%d]' % i, key) for i, (u, v) in enumerate(zip(x, y))), [])
        return [] if x == y else [key + p]

    for k in sorted(set(fa) | set(fb)):
        if k in SKIP:
            continue
        if k not in fa or k not in fb:
            out.append(k)
        else:
            out += walk(fa[k], fb[k], '', k)
    return out


if not args.recapture:
    skipped('recapture', 'run with --recapture (about 15 seconds)')
else:
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='git-recapture-')) / 'real.js'
    r = run([sys.executable, str(HERE / 'capture_git.py'), '--out', str(tmp)])
    if r.returncode or not tmp.exists():
        bad('capture_git.py failed: ' + (r.stdout + r.stderr)[-800:])
    else:
        again = load_real(tmp)
        diff = differing(REAL, again)
        tick('recaptured items', len(flatten(again)))
        for k in diff:
            bad('the recapture differs from js/real.js in %s' % k)
        print('recapture: %d items, %d differ' % (len(flatten(again)), len(diff)))
        changed = json.loads(json.dumps(REAL))
        changed['counts']['mg']['commits'] = 5
        control('a recording with one number changed, given to the comparison', lambda: differing(REAL, changed) == ['counts:mg.commits'])
        changed = json.loads(json.dumps(REAL))
        changed['text']['rm.push_rejected'] = changed['text']['rm.push_rejected'].replace('fetch first', 'fetched first')
        control('a recording with one word changed in a printed text, given to the comparison', lambda: differing(REAL, changed) == ['text:rm.push_rejected'])
        changed = json.loads(json.dumps(REAL))
        changed['tables']['un.reset']['rows'][1][3] = '0.08'
        control('a recording with one cell of a table changed, given to the comparison', lambda: differing(REAL, changed) == ['tables:un.reset.rows[1][3]'])
        dated = json.loads(json.dumps(REAL))
        dated['meta']['recorded_on'] = '2030-01-01'
        expect(differing(REAL, dated) == [], 'another recording date is inside the allowance', 'recapture allowances')
    shutil.rmtree(tmp.parent, ignore_errors=True)

# ----------------------------------------------------------------------------------------------------------------------
# 6. The lab data, and controls for its checker
# ----------------------------------------------------------------------------------------------------------------------
def widget_checker(real=None):
    env = None
    if real is not None:
        p = pathlib.Path(tempfile.mkdtemp(prefix='git-control-')) / 'real.js'
        p.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(real) + ';\n')
        env = dict(os.environ, GIT_REAL_JS=str(p))
    return run(['node', str(HERE / 'check_widgets.js')], cwd=str(ROOT), env=env)


r = widget_checker()
m = re.search(r'(\d+) checks passed', r.stdout)
expect(r.returncode == 0 and m, 'check_widgets.js passes: ' + r.stdout.strip()[-200:], 'lab checks')
tick('lab data checks', int(m.group(1)) if m else 0)


def set_cell(d, table, row, col, v):
    d['tables'][table]['rows'][row][col] = v


for label, mutate in (
    ('the id of the first blob is another one', lambda d: d['counts']['obj.types'].__setitem__('blob_id', 'abcdef0')),
    ('a merge that leaves five commits', lambda d: d['counts']['mg'].__setitem__('commits', 5)),
    ('a pull with rebase that made a merge commit', lambda d: d['counts']['rm.pull_rebase'].__setitem__('merge_commits', 1)),
    ('a status of the file that does not follow from the ids', lambda d: set_cell(d, 'areas.steps', 1, 5, 'M  models/orders_daily.sql')),
    ('a soft reset that also changed the index', lambda d: set_cell(d, 'un.reset', 1, 3, '0.08')),
    ('a first bisect test that says bad', lambda d: d['counts']['hist.bisect_tests']['tests'].__setitem__(0, ['bad', 8])),
    ('appended rows that take more than one copy of the file', lambda d: d['counts']['data.sizes']['append'].__setitem__('after_gc_kib', 900)),
    ('an LFS pointer with another hash', lambda d: d['text'].__setitem__('lfs.pointer', d['text']['lfs.pointer'].replace('oid sha256:', 'oid sha256:0'))),
    ('a pack with one object too many', lambda d: d['counts']['int.pack'].__setitem__('objects', 29)),
    ('a conflict with two stages in the index', lambda d: d['counts']['cf.stages'].__setitem__('unmerged_entries', 2)),
):
    data = json.loads(json.dumps(REAL))
    mutate(data)
    control(label + ': the widget checker fails', lambda data=data: widget_checker(data).returncode != 0)

# ----------------------------------------------------------------------------------------------------------------------
# 7. The lint
# ----------------------------------------------------------------------------------------------------------------------
r = run(['node', str(ROOT / 'dev' / 'lint-content.js'), 'git'], cwd=str(ROOT))
expect(r.returncode == 0 and 'lint clean' in r.stdout, 'the lint of the course is clean: ' + r.stdout.strip()[-200:], 'lint runs')

# ----------------------------------------------------------------------------------------------------------------------
# 8. The labs in a browser, and controls for that test
# ----------------------------------------------------------------------------------------------------------------------
def labs_e2e(script_):
    r_ = run(['node', str(script_)], cwd=str(script_.parent.parent.parent))
    return r_, re.search(r'(\d+) lab checks passed', r_.stdout)


if not args.browser:
    skipped('the labs in a browser', 'run with --browser (needs Playwright and Chromium)')
else:
    r, m = labs_e2e(HERE / 'e2e_labs.js')
    expect(r.returncode == 0 and m, 'e2e_labs.js passes: ' + (r.stdout + r.stderr).strip()[-300:], 'browser lab tests')
    tick('browser lab checks', int(m.group(1)) if m else 0)
    W = 'git/js/widgets.js'
    MUTATIONS = [
        ('the merge case says that it makes no merge commit', W, "merges: C('mg').parents === 2 ? 1 : 0", "merges: C('mg').parents === 2 ? 0 : 1"),
        ('the undo lab shows a hard reset as harmless', W, "callout(/hard/.test(r[0]) ? 'bad' : 'good', d.why)", "callout(/hard/.test(r[0]) ? 'good' : 'bad', d.why)"),
        ('the push lab reverses whether the remote changed', W, "big([[d.ok ? 'yes' : 'no', 'the remote changed'", "big([[d.ok ? 'no' : 'yes', 'the remote changed'"),
        ('the bisect lab marks the commits that were ruled out as suspects', W, "(c <= r.lo ? 'good' : c >= r.hi ? 'bad' : 'suspect')", "(c <= r.lo ? 'suspect' : c >= r.hi ? 'bad' : 'suspect')"),
        ('the areas lab marks the index when it equals the last commit', W, "[r[3], 'index (staged)', r[3] !== r[4] ? 'warn' : '']", "[r[3], 'index (staged)', r[3] === r[4] ? 'warn' : '']"),
        ('the size lab colours the appended file as the bad case', W, "'size after gc, in versions of the file', st.k === 'append' ? 'good' : 'bad']", "'size after gc, in versions of the file', st.k === 'append' ? 'bad' : 'good']"),
    ]
    for label, rel, old, new in MUTATIONS:
        copy = pathlib.Path(tempfile.mkdtemp(prefix='git-mutation-'))
        for part in ('shared', 'git'):
            shutil.copytree(ROOT / part, copy / part, ignore=shutil.ignore_patterns('__pycache__', '.cache', 'node_modules', '.git'))
        target = copy / rel
        src = target.read_text()
        if src.count(old) != 1:
            bad('control cannot be set up: "%s" is not in %s exactly once' % (old, rel))
            shutil.rmtree(copy, ignore_errors=True)
            continue
        target.write_text(src.replace(old, new))
        r2, _ = labs_e2e(copy / 'git' / 'verify' / 'e2e_labs.js')
        control('the lab test fails when ' + label, lambda r2=r2: r2.returncode != 0)
        shutil.rmtree(copy, ignore_errors=True)

gitlib.cleanup()
print()
print('checked: ' + ', '.join('%d %s' % (v, k) for k, v in sorted(counts.items())))
for s in skips:
    print('skipped: ' + s)
if problems:
    print('%d PROBLEM(S)' % len(problems))
    sys.exit(1)
print('verify_git: all checks passed')
