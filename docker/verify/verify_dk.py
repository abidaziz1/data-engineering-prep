#!/usr/bin/env python3
"""Check the code and the recorded output of the Docker course.

 1. The files of the recording are the files of docker/verify/project, and every code screen that names such a file shows it.
 2. Every Dockerfile of the project goes through `docker build --check`: the good ones without a warning, the lint example with exactly the five
    warnings that the lesson names, and the file with a typo must fail to parse.
 3. Every Dockerfile, Compose file, shell script and Python file that a lesson shows (including the fixes of the bug hunts and the coding round) is
    read by the real tool: the Dockerfile by `docker build --check`, the Compose file by `docker compose config`, the shell by `sh -n`, Python by compile.
 4. Every `docker` command of the terminal replays is checked against the help of the installed Docker: the subcommand exists, and so does every flag.
 5. The labs' data: check_widgets.js recomputes the rules from the recording, and six changes to the recording must make it fail.
 6. The lint of the course (dev/lint-content.js).
 7. With --recapture the whole recording is made again on this machine (about 6 minutes) and compared with js/real.js. The allowances are listed below.
 8. With --browser the seven labs are driven in Chromium (e2e_labs.js), and three changes to the widget code must make that test fail.

What this cannot show: how Docker Desktop, rootless mode, Podman, Swarm, cloud registries or image scanners behave. Those screens carry the
"From documentation" tag, and the README lists what to check again.

Run:   python3 docker/verify/verify_dk.py [--recapture] [--browser] [--verbose]
Needs: a Docker Engine that runs (see requirements.txt), Python 3.11 or later and Node 20 or later. A check whose tool is missing says so and is skipped.
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
import time

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
PROJECT = HERE / 'project'
sys.path.insert(0, str(HERE))

ap = argparse.ArgumentParser()
ap.add_argument('--recapture', action='store_true', help='record everything again on this machine and compare with js/real.js (about 6 minutes)')
ap.add_argument('--browser', action='store_true', help='also drive the seven labs in Chromium (docker/verify/e2e_labs.js) and its controls')
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
    for attempt in range(80):
        r_ = subprocess.run(cmd, capture_output=True, text=True, **kw)
        # Docker Hub limits the pulls of anonymous users by the address. Wait for the window and try again.
        if r_.returncode and cmd and cmd[0] == 'docker' and re.search(r'429 Too Many Requests|toomanyrequests', r_.stdout + r_.stderr, re.I):
            print('Docker Hub answered 429 Too Many Requests; waiting 60 seconds (attempt %d)' % (attempt + 1), flush=True)
            time.sleep(60)
            continue
        return r_
    return r_


def load_real(path):
    txt = pathlib.Path(path).read_text()
    return json.loads(txt[txt.index('LAB.real = ') + len('LAB.real = '):].rstrip().rstrip(';'))


REAL = load_real(ROOT / 'docker' / 'js' / 'real.js')
r = run(['node', str(HERE / 'dump_dk.js')], cwd=str(ROOT))
if r.returncode:
    print('PROBLEM: the course does not load: ' + (r.stderr or r.stdout)[-600:])
    sys.exit(1)
DUMP = json.loads(r.stdout)

DOCKER = shutil.which('docker') is not None and run(['docker', 'info', '--format', '{{.ServerVersion}}']).returncode == 0
if not DOCKER:
    skipped('everything that needs a Docker Engine', 'no docker command, or no daemon that answers')

# ----------------------------------------------------------------------------------------------------------------------
# 1. The files of the recording and the code screens
# ----------------------------------------------------------------------------------------------------------------------
for key, text in REAL['files'].items():
    p = PROJECT / key
    if key.startswith('data/'):
        continue
    expect(p.exists() and p.read_text() == text, 'the recording holds %s as it is on disk' % key, 'recorded files')
by_name = {}
for k, v in REAL['files'].items():
    by_name[k] = v
    by_name.setdefault(k.split('/')[-1], v)
for c in DUMP['code']:
    f = c['file']
    if c['type'] in ('code',) and f in by_name:
        expect(c['code'].rstrip('\n') == by_name[f].rstrip('\n'), 'the code screen %s shows %s exactly' % (c['id'], f), 'code screens that show a recorded file')

# ----------------------------------------------------------------------------------------------------------------------
# 2. The Dockerfiles of the project
# ----------------------------------------------------------------------------------------------------------------------
PARSE_ERR = re.compile(r'dockerfile parse error|unknown instruction|failed to read dockerfile')


def check_dockerfile(path=None, text=None, ctx=None):
    cmd = ['docker', 'build', '--check', '--progress=plain']
    if text is not None:
        cmd += ['-f', '-']
    else:
        cmd += ['-f', str(path)]
    cmd.append(str(ctx or PROJECT / 'app'))
    r_ = run(cmd, input=text)
    out = re.sub(r'\x1b\[[0-9;]*m', '', r_.stdout + r_.stderr)
    return r_.returncode, len(re.findall(r'^WARNING: ', out, flags=re.M)), bool(PARSE_ERR.search(out)), out


if DOCKER:
    # warnings that a file is expected to have. Anything else is a problem.
    EXPECT = {'Dockerfile.lint': 5, 'Dockerfile.leaky': 2, 'Dockerfile.bad': 'parse error'}
    for p in sorted((PROJECT / 'app').glob('Dockerfile*')):
        rc, warns, perr, out = check_dockerfile(p)
        want = EXPECT.get(p.name, 0)
        if want == 'parse error':
            expect(perr and rc != 0, '%s is refused as a Dockerfile' % p.name, 'dockerfiles checked')
        else:
            expect(not perr and warns == want, '%s has %d build-check warnings (found %d)%s' % (p.name, want, warns, '' if warns == want else ': ' + out[-300:]), 'dockerfiles checked')
    rc, warns, perr, out = check_dockerfile(PROJECT / 'app' / 'Dockerfile.lint')
    expect(warns == REAL['counts']['build.check']['warnings'] and rc == REAL['counts']['build.check']['rc'], 'the lint example gives the warnings and the exit code that the recording holds', 'dockerfiles checked')
    rules = set(re.findall(r'^WARNING: (\w+)', out, flags=re.M))
    expect(rules == {'MaintainerDeprecated', 'ConsistentInstructionCasing', 'WorkdirRelativePath', 'LegacyKeyValueFormat', 'JSONArgsRecommended'}, 'the five rules of the lint example are the five that the lesson names: %s' % sorted(rules), 'dockerfiles checked')
    leaky = check_dockerfile(PROJECT / 'app' / 'Dockerfile.leaky')[3]
    expect(set(re.findall(r'^WARNING: (\w+)', leaky, flags=re.M)) == {'SecretsUsedInArgOrEnv'}, 'the engine itself warns about the secret in ARG and ENV of Dockerfile.leaky', 'dockerfiles checked')

# ----------------------------------------------------------------------------------------------------------------------
# 3. Every snippet of the lessons, read by the tool that it is for
# ----------------------------------------------------------------------------------------------------------------------
COMPOSE_OK = re.compile(r'^services:', re.M)
if DOCKER:
    for c in DUMP['code']:
        lang, code = c['lang'], c['code']
        if lang == 'dockerfile':
            rc, warns, perr, out = check_dockerfile(text=code.rstrip('\n') + '\n', ctx=PROJECT / 'app')
            expect(not perr, 'the Dockerfile of %s parses%s' % (c['id'], '' if not perr else ': ' + out[-200:]), 'dockerfile snippets')
            if c['type'] in ('fix', 'sol'):
                expect(rc == 0, 'the fixed Dockerfile of %s has no warning%s' % (c['id'], '' if rc == 0 else ': ' + out[-300:]), 'fixed dockerfiles')
        elif lang == 'yaml' and COMPOSE_OK.search(code):
            tmp = pathlib.Path(tempfile.mkdtemp(prefix='dk-compose-'))
            (tmp / 'compose.yaml').write_text(code)
            (tmp / 'app').mkdir()
            (tmp / 'data').mkdir()
            r_ = run(['docker', 'compose', '-f', str(tmp / 'compose.yaml'), 'config', '-q'], cwd=str(tmp), env=dict(os.environ, COMPOSE_BAKE='false'))
            expect(r_.returncode == 0, 'the Compose file of %s is accepted by docker compose config%s' % (c['id'], '' if r_.returncode == 0 else ': ' + r_.stderr[-300:]), 'compose snippets')
            shutil.rmtree(tmp, ignore_errors=True)
for c in DUMP['code']:
    if c['lang'] == 'bash':
        r_ = run(['sh', '-n'], input=c['code'])
        expect(r_.returncode == 0, 'the shell of %s parses: %s' % (c['id'], r_.stderr.strip()), 'shell snippets')
    if c['lang'] == 'python':
        try:
            compile(c['code'], c['id'], 'exec')
            tick('python snippets')
        except SyntaxError as e:
            bad('the Python of %s does not compile: %s' % (c['id'], e))
for p in sorted(PROJECT.rglob('*.py')):
    try:
        compile(p.read_text(), str(p), 'exec')
        tick('python files')
    except SyntaxError as e:
        bad('%s does not compile: %s' % (p, e))
if DOCKER:
    for f in ('compose.yaml', 'compose.nohealth.yaml', 'compose.profiles.yaml'):
        r_ = run(['docker', 'compose', '-p', 'dkc-verify', '-f', f, 'config', '-q'], cwd=str(PROJECT), env=dict(os.environ, COMPOSE_BAKE='false'))
        expect(r_.returncode == 0, '%s is accepted by docker compose config%s' % (f, '' if r_.returncode == 0 else ': ' + r_.stderr[-300:]), 'compose files')
    r_ = run(['docker', 'compose', '-p', 'dkc-verify', '-f', 'compose.profiles.yaml', '--profile', 'jobs', 'config', '--services'], cwd=str(PROJECT), env=dict(os.environ, COMPOSE_BAKE='false'))
    expect(sorted(r_.stdout.split()) == ['db', 'loader'], 'the profile file lists db and loader when the profile jobs is on', 'compose files')
    r_ = run(['docker', 'compose', '-p', 'dkc-verify', '-f', 'compose.profiles.yaml', 'config', '--services'], cwd=str(PROJECT), env=dict(os.environ, COMPOSE_BAKE='false'))
    expect(r_.stdout.split() == ['db'], 'the profile file lists only db when no profile is on', 'compose files')

# controls for the tools above
if DOCKER:
    control('a Dockerfile with a typo in the first instruction', lambda: check_dockerfile(text='FORM python:3.13-slim\n')[2])
    control('a Dockerfile that breaks five rules', lambda: check_dockerfile(PROJECT / 'app' / 'Dockerfile.lint')[0] != 0)
    control('a Compose file with an unknown top-level key', lambda: run(['docker', 'compose', '-f', '-', 'config', '-q'], input='services:\n  a:\n    image: alpine\nbogus: true\n', env=dict(os.environ, COMPOSE_BAKE='false')).returncode != 0)
    control('a Compose file with a service that has no image and no build', lambda: run(['docker', 'compose', '-f', '-', 'config', '-q'], input='services:\n  a:\n    environment:\n      A: b\n', env=dict(os.environ, COMPOSE_BAKE='false')).returncode != 0)
control('a shell script with an unclosed quote', lambda: run(['sh', '-n'], input='docker run --rm "alpine\n').returncode != 0)
control('Python with a syntax error', lambda: compile('def f(:\n    pass', 'x', 'exec') is None)

# ----------------------------------------------------------------------------------------------------------------------
# 4. The commands of the terminal replays against the installed Docker
# ----------------------------------------------------------------------------------------------------------------------
HELP = {}


def help_of(words):
    key = ' '.join(words)
    if key not in HELP:
        r_ = run(['docker'] + words + ['--help'])
        # an unknown word prints the help of `docker` itself, so the usage line must name the command
        HELP[key] = r_.stdout + r_.stderr if r_.returncode == 0 and re.search(r'Usage:\s+docker (?:buildx )?' + re.escape(key) + r'\b', r_.stdout) else None
    return HELP[key]


def parse_flags(help_text):
    """name -> takes a value. Reads the lines of the Options section of a help text."""
    flags = {}
    for ln in help_text.splitlines():
        m = re.match(r'^\s+(?:(-\w), )?(--[\w-]+)(?:\[=[^\]]*\])?(?: ([A-Za-z]+))?(?:\s{2,}|$)', ln)
        if m:
            takes = m.group(3) is not None
            if m.group(1):
                flags[m.group(1)] = takes
            flags[m.group(2)] = takes
    return flags


def tokens(cmd):
    lex = shlex.shlex(cmd, posix=True, punctuation_chars=True)
    lex.whitespace_split = True
    lex.commenters = '#'
    return list(lex)


def check_command(cmd):
    """Returns a list of problems for one command line of a replay."""
    try:
        toks = tokens(cmd)
    except ValueError as e:
        return ['cannot read the command: %s' % e]
    out, seg = [], []
    for t in toks + [';']:
        if t in ('&&', '||', '|', ';', '>', '>>'):
            if seg:
                out += check_segment(seg)
            seg = []
            if t in ('>', '>>'):
                seg = None
            continue
        if seg is None:
            continue
        seg.append(t)
    return out


def check_segment(seg):
    if not seg or seg[0] != 'docker':
        return []
    words, rest = [], seg[1:]
    # global flags of docker compose, before its subcommand
    path = []
    i = 0
    sub = None
    if rest and rest[0] == 'compose':
        path = ['compose']
        gl = parse_flags(help_of(['compose']) or '')
        i = 1
        while i < len(rest) and rest[i].startswith('-'):
            name = rest[i].split('=')[0]
            if name not in gl:
                return ['docker compose has no global flag %s' % name]
            i += 1 if ('=' in rest[i] or not gl[name]) else 2
    else:
        gl = {}
    # the subcommand: the longest run of words that has its own help
    j = i
    cand = []
    while j < len(rest) and not rest[j].startswith('-') and len(cand) < 2:
        cand.append(rest[j])
        j += 1
    sub = None
    for n in range(len(cand), 0, -1):
        if help_of(path + cand[:n]):
            sub = cand[:n]
            break
    if not sub:
        return ['docker %s is not a command' % ' '.join(path + cand[:1])]
    h = help_of(path + sub)
    flags = parse_flags(h)
    k = i + len(sub)
    stop_at_positional = sub[0] in ('run', 'exec', 'create') or (path and sub[0] == 'run')
    problems_ = []
    while k < len(rest):
        t = rest[k]
        if t == '--':
            break
        if t.startswith('--'):
            name = t.split('=')[0]
            if name not in flags and name not in gl:
                problems_.append('docker %s has no flag %s' % (' '.join(path + sub), name))
                k += 1
                continue
            takes = flags.get(name, gl.get(name))
            k += 1 if ('=' in t or not takes) else 2
        elif t.startswith('-') and len(t) > 1:
            letters = t[1:]
            consumed = False
            for n, ch in enumerate(letters):
                if '-' + ch not in flags:
                    problems_.append('docker %s has no flag -%s' % (' '.join(path + sub), ch))
                elif flags['-' + ch] and n == len(letters) - 1:
                    consumed = True
            k += 2 if consumed else 1
        else:
            if stop_at_positional:
                break
            k += 1
    return problems_


if DOCKER:
    n_cmd = 0
    for c in DUMP['commands']:
        cmd = c['cmd']
        if not re.search(r'\bdocker\b', cmd):
            continue
        n_cmd += 1
        for p in check_command(cmd):
            bad('%s: %s (in "%s")' % (c['id'], p, cmd[:90]))
    tick('docker commands checked against the help of the installed Docker', n_cmd)
    control('a command with a flag that does not exist', lambda: check_command('docker run --not-a-flag alpine') != [])
    control('a subcommand that does not exist', lambda: check_command('docker frobnicate alpine') != [])
    control('a Compose command with an unknown global flag', lambda: check_command('docker compose --nope up -d') != [])
    expect(check_command('docker run --rm -it -m 64m -e A=b alpine sh -c "echo hi"') == [], 'the command checker accepts a valid command', 'docker commands checked against the help of the installed Docker')

# ----------------------------------------------------------------------------------------------------------------------
# 5. The recording made again, and compared
# ----------------------------------------------------------------------------------------------------------------------
def flatten(real):
    out = {}
    for kind in ('meta', 'counts', 'tables', 'text', 'files'):
        for k, v in real[kind].items():
            out[kind + ':' + k] = v
    return out


IPV4 = re.compile(r'\b\d{1,3}(?:\.\d{1,3}){3}\b')
DIGEST = re.compile(r'sha256:[0-9a-f]{12,64}')
# What may differ between two recordings, and why. Everything else must be equal.
TOLERANCE = {          # key prefix of a number -> relative difference that is allowed (layers carry the time that they were made)
    'counts:build.image': 0.002, 'counts:small.heavy': 0.002, 'counts:small.rm': 0.002, 'counts:small.stages': 0.002, 'counts:registry.save': 0.02,
    'counts:jobs.logs': 0.15,     # how many log lines the rotation keeps depends on how fast the lines were written
}
SKIP = {
    'meta:recorded_on': 'the date',
    'counts:sec.pin': 'the digest of the python tag moves when the image is rebuilt upstream',
    'counts:build.context': 'the context of the ignore case holds the Dockerfile variants of the day, a few kilobytes',
    'text:build.context': 'the same numbers as text',
    'counts:basics.processes': 'the number of processes on the host',
}


def norm_text(key, s):
    s = IPV4.sub('x.x.x.x', s)
    s = DIGEST.sub('sha256:<digest>', s)
    if key == 'text:basics.exec':
        # the loop sleeps between lines, so `ps` may or may not catch a `sleep`, and the ids of the other processes differ
        s = '\n'.join(l for l in s.splitlines() if not re.match(r'^\s*\d+ sleep ', l))
        s = re.sub(r'^(\s*)(?!1 )\d+ ', r'\1N ', s, flags=re.M)
    if key == 'text:registry.push':
        s = s.replace('Layer already exists', 'Already exists')       # the registry says either, depending on how it learned about a layer
    if key == 'text:small.pytest':
        s = re.sub(r' in [0-9.]+s', ' in Ns', s)
    return s


def same(key, a, b, path=''):
    """Compare two values. Returns a list of differing paths."""
    if any(key.startswith(k) for k in SKIP):
        return []
    if key.startswith('tables:registry.steps') or key.startswith('tables:registry.tags'):
        # the digest columns differ between builds. The checks of check_widgets.js hold their relationships.
        if isinstance(a, dict):
            ca, cb = a['cols'], b['cols']
            if ca != cb or len(a['rows']) != len(b['rows']):
                return [key]
            keep = [i for i, c in enumerate(ca) if 'digest' not in c and 'latest in the registry' not in c and 'latest on this machine' not in c]
            return [] if [[r[i] for i in keep] for r in a['rows']] == [[r[i] for i in keep] for r in b['rows']] else [key]
    if key == 'tables:jobs.signals':
        # the process id of a job that is not process 1 depends on how many processes the container had started before: 7 on one run, 8 on another
        fold = lambda t: {'cols': t['cols'], 'rows': [[r[0], r[1] if r[1] == 1 else '>1'] + r[2:] for r in t['rows']]}
        a, b = fold(a), fold(b)
    tol = max([v for k, v in TOLERANCE.items() if key.startswith(k)] or [0])
    def walk(x, y, p):
        if isinstance(x, dict) and isinstance(y, dict):
            if set(x) != set(y):
                return [key + p]
            return sum((walk(x[k], y[k], p + '.' + k) for k in x), [])
        if isinstance(x, list) and isinstance(y, list):
            if len(x) != len(y):
                return [key + p]
            return sum((walk(u, v, p + '[%d]' % i) for i, (u, v) in enumerate(zip(x, y))), [])
        if isinstance(x, (int, float)) and isinstance(y, (int, float)) and not isinstance(x, bool) and not isinstance(y, bool):
            return [] if x == y or (tol and abs(x - y) <= tol * max(abs(x), abs(y))) else [key + p]
        if isinstance(x, str) and isinstance(y, str):
            return [] if norm_text(key, x) == norm_text(key, y) else [key + p]
        return [] if x == y else [key + p]
    return walk(a, b, path)


def differing(a, b):
    fa, fb = flatten(a), flatten(b)
    out = []
    for k in sorted(set(fa) | set(fb)):
        if k not in fa or k not in fb:
            out.append(k)
        else:
            out += same(k, fa[k], fb[k])
    return out


if not args.recapture:
    skipped('recapture', 'run with --recapture (about 6 minutes, needs Docker Hub and PyPI)')
elif not DOCKER:
    skipped('recapture', 'no Docker Engine')
else:
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='dk-recapture-')) / 'real.js'
    r = run([sys.executable, str(HERE / 'capture_dk.py'), '--out', str(tmp)])
    if r.returncode or not tmp.exists():
        bad('capture_dk.py failed: ' + (r.stdout + r.stderr)[-800:])
    else:
        again = load_real(tmp)
        diff = differing(REAL, again)
        tick('recaptured items', len(flatten(again)))
        for k in diff:
            bad('the recapture differs from js/real.js in %s' % k)
        print('recapture: %d items, %d differ' % (len(flatten(again)), len(diff)))
        changed = json.loads(json.dumps(REAL))
        changed['counts']['basics.stop']['exit_code'] = 0
        control('a recording with one number changed, given to the comparison', lambda: differing(REAL, changed) == ['counts:basics.stop.exit_code'])
        skewed = json.loads(json.dumps(REAL))
        skewed['counts']['small.rm']['later_layer'] = int(skewed['counts']['small.rm']['later_layer'] * 1.05)
        control('a size that moved by five percent is more than the allowance', lambda: differing(REAL, skewed) == ['counts:small.rm.later_layer'])
        within = json.loads(json.dumps(REAL))
        within['counts']['small.rm']['later_layer'] = int(within['counts']['small.rm']['later_layer'] * 1.001)
        expect(differing(REAL, within) == [], 'a size that moved by a tenth of a percent is inside the allowance', 'recapture allowances')
    shutil.rmtree(tmp.parent, ignore_errors=True)

# ----------------------------------------------------------------------------------------------------------------------
# 6. The lab data, and controls for its checker
# ----------------------------------------------------------------------------------------------------------------------
def widget_checker(real=None):
    env = None
    if real is not None:
        p = pathlib.Path(tempfile.mkdtemp(prefix='dk-control-')) / 'real.js'
        p.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(real) + ';\n')
        env = dict(os.environ, DK_REAL_JS=str(p))
    return run(['node', str(HERE / 'check_widgets.js')], cwd=str(ROOT), env=env)


r = widget_checker()
m = re.search(r'(\d+) checks passed', r.stdout)
expect(r.returncode == 0 and m, 'check_widgets.js passes: ' + r.stdout.strip()[-200:], 'lab checks')
tick('lab data checks', int(m.group(1)) if m else 0)
for label, mutate in (
    ('the exit code of a job that was stopped with a handler is changed', lambda d: d['tables']['jobs.signals']['rows'][1].__setitem__(3, 137)),
    ('what survives after rm in a named volume is changed', lambda d: d['tables']['volumes.matrix']['rows'][1].__setitem__(2, 'no table')),
    ('a cached step of the cache matrix is changed', lambda d: d['tables']['cache.steps']['rows'][4].__setitem__(4, True)),
    ('the digest of latest on the machine is made equal to the registry before the pull', lambda d: d['tables']['registry.steps']['rows'][1].__setitem__(2, d['tables']['registry.steps']['rows'][1][1])),
    ('the number of default capabilities is changed', lambda d: d['counts']['sec.caps'].__setitem__('default_count', 20)),
    ('the volume that survives down is removed from the record', lambda d: d['counts']['compose.down'].__setitem__('volumes_after_down', [])),
):
    data = json.loads(json.dumps(REAL))
    mutate(data)
    control(label + ': the widget checker fails', lambda data=data: widget_checker(data).returncode != 0)

# ----------------------------------------------------------------------------------------------------------------------
# 7. The lint
# ----------------------------------------------------------------------------------------------------------------------
r = run(['node', str(ROOT / 'dev' / 'lint-content.js'), 'docker'], cwd=str(ROOT))
expect(r.returncode == 0 and 'lint clean' in r.stdout, 'the lint of the course is clean: ' + r.stdout.strip()[-200:], 'lint runs')

# ----------------------------------------------------------------------------------------------------------------------
# 8. The labs in a browser, and controls for that test
# ----------------------------------------------------------------------------------------------------------------------
def labs_e2e(script):
    r_ = run(['node', str(script)], cwd=str(script.parent.parent.parent))
    return r_, re.search(r'(\d+) lab checks passed', r_.stdout)


if not args.browser:
    skipped('the labs in a browser', 'run with --browser (needs Playwright and Chromium)')
else:
    r, m = labs_e2e(HERE / 'e2e_labs.js')
    expect(r.returncode == 0 and m, 'e2e_labs.js passes: ' + (r.stdout + r.stderr).strip()[-300:], 'browser lab tests')
    tick('browser lab checks', int(m.group(1)) if m else 0)
    MUTATIONS = [
        ('the cache lab marks a changed step as cached', 'docker/js/widgets.js', "[x.n, x.cmd, x.cached ? 'taken from the cache' : 'ran again']", "[x.n, x.cmd, x.cached ? 'ran again' : 'taken from the cache']"),
        ('the stop lab says that a job with a handler waited for the grace period', 'docker/js/widgets.js', "c.waited ? 'waited 3 s, then killed' : 'stopped at once'", "c.waited ? 'stopped at once' : 'waited 3 s, then killed'"),
        ('the volume lab says that the rows of tmpfs survived', 'docker/js/widgets.js', "kept = v !== 'no table'", "kept = true"),
    ]
    for label, rel, old, new in MUTATIONS:
        copy = pathlib.Path(tempfile.mkdtemp(prefix='dk-mutation-'))
        for part in ('shared', 'docker'):
            shutil.copytree(ROOT / part, copy / part, ignore=shutil.ignore_patterns('__pycache__', '.cache', 'node_modules', '.git'))
        target = copy / rel
        src = target.read_text()
        if src.count(old) != 1:
            bad('control cannot be set up: "%s" is not in %s exactly once' % (old, rel))
            continue
        target.write_text(src.replace(old, new))
        r2, _ = labs_e2e(copy / 'docker' / 'verify' / 'e2e_labs.js')
        control('the lab test fails when ' + label, lambda r2=r2: r2.returncode != 0)
        shutil.rmtree(copy, ignore_errors=True)

print()
print('checked: ' + ', '.join('%d %s' % (v, k) for k, v in sorted(counts.items())))
for s in skips:
    print('skipped: ' + s)
if problems:
    print('%d PROBLEM(S)' % len(problems))
    sys.exit(1)
print('verify_dk: all checks passed')
