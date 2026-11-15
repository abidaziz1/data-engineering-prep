#!/usr/bin/env python3
"""Check the code and the recorded output of the Kubernetes course.

 1. The files of the recording are the files of kubernetes/verify/project, and every code screen that names such a file shows it.
 2. Every manifest of the project, and every YAML snippet of the lessons (the bug hunts, their fixes and the coding round included), is sent to the API
    server of a real cluster with `kubectl apply --dry-run=server --validate=strict`. A manifest that is meant to be refused must be refused.
 3. The Kustomize overlay is built by `kubectl kustomize` and compared with the recording. Shell, Python and the files of the project are parsed.
 4. Every `kubectl` command of the terminal replays is checked against the help of the installed kubectl: the command exists, and so does every flag.
 5. The lab data: check_widgets.js recomputes the rules from the recording, and seven changes to the recording must make it fail.
 6. The lint of the course (dev/lint-content.js).
 7. With --recapture the whole recording is made again on this machine (about 10 minutes) and compared with js/real.js. The allowances are listed below.
 8. With --browser the six labs are driven in Chromium (e2e_labs.js), and four changes to the widget code must make that test fail.

What this cannot show: how a managed cluster (EKS, GKE, AKS), Helm, an operator, an ingress controller, a network policy, autoscaling or a service mesh
behaves. Those screens carry the "From documentation" tag, and the README lists what to check again.

Run:   python3 kubernetes/verify/verify_k8s.py [--recapture] [--browser] [--verbose]
Needs: Docker (the cluster is k3s in a container, see requirements.txt), Python 3.11 or later and Node 20 or later. A check whose tool is missing says so and is skipped.
       In the sandbox that built the course set K8S_SANDBOX=1 DK_BUILD_NETWORK=host DK_BUILD_PROXY=1 before the cluster is started.
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
import k8slib      # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--recapture', action='store_true', help='record everything again on this machine and compare with js/real.js (about 10 minutes)')
ap.add_argument('--browser', action='store_true', help='also drive the six labs in Chromium (kubernetes/verify/e2e_labs.js) and its controls')
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


REAL = load_real(ROOT / 'kubernetes' / 'js' / 'real.js')
r = run(['node', str(HERE / 'dump_k8s.js')], cwd=str(ROOT))
if r.returncode:
    print('PROBLEM: the course does not load: ' + (r.stderr or r.stdout)[-600:])
    sys.exit(1)
DUMP = json.loads(r.stdout)

DOCKER = shutil.which('docker') is not None and run(['docker', 'info', '--format', '{{.ServerVersion}}']).returncode == 0
if not DOCKER:
    skipped('everything that needs a cluster', 'no docker command, or no daemon that answers (the cluster is k3s in a container)')

# ----------------------------------------------------------------------------------------------------------------------
# 1. The files of the recording and the code screens
# ----------------------------------------------------------------------------------------------------------------------
for key, text in REAL['files'].items():
    p = PROJECT / key
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
# 2. Every manifest, read by the API server of a real cluster
# ----------------------------------------------------------------------------------------------------------------------
STARTED = False


def ensure_cluster():
    global STARTED
    running = run(['docker', 'ps', '-q', '--filter', 'name=^%s$' % k8slib.NAME]).stdout.strip()
    if not running:
        k8slib.clean_cluster()
        print('starting a k3s cluster for the checks (about 30 seconds) ...', flush=True)
        k8slib.start_cluster()
        STARTED = True
    k8slib.kc('create', 'namespace', 'brewline', check=False)


def dry_run(text, strict=True):
    a = ['apply', '--dry-run=server', '-n', 'brewline', '-f', '-']
    if strict:
        a.insert(2, '--validate=strict')
    o = k8slib.kc(*a, input=text, check=False, timeout=120)
    return o.rc, o.all


def is_manifest(code):
    return bool(re.search(r'^apiVersion:', code, re.M))


if DOCKER:
    ensure_cluster()
    # the manifests of the project
    files = sorted(PROJECT.glob('*.yaml')) + [PROJECT / 'kustomize' / 'base' / 'deployment.yaml']
    for p in files:
        rc, out = dry_run(p.read_text())
        expect(rc == 0, '%s is accepted by the API server (strict, server-side dry run)%s' % (p.name, '' if rc == 0 else ': ' + out[-300:]), 'manifests of the project')
    # the manifests that the lessons show, including the bug hunts and their fixes
    n_snip = 0
    REFUSED = {'m1-bug': 'unknown field "spec.containers[0].imagee"'}       # the bug hunt whose manifest is broken on purpose: the cluster must refuse it, with these words
    for c in DUMP['code']:
        if c['lang'] == 'yaml' and is_manifest(c['code']):
            n_snip += 1
            rc, out = dry_run(c['code'])
            if c['id'] in REFUSED:
                expect(rc != 0 and REFUSED[c['id']] in out, 'the broken manifest of %s is refused with the words that the lesson names' % c['id'], 'manifests of the lessons')
            else:
                expect(rc == 0, 'the manifest of %s is accepted by the API server%s' % (c['id'], '' if rc == 0 else ': ' + out[-300:]), 'manifests of the lessons')
    expect(n_snip >= 25, 'the lessons show at least 25 manifests (found %d)' % n_snip, 'manifests of the lessons')
    # the object that the recording tried and the cluster refused, with the words of the recording
    rc, out = dry_run('apiVersion: v1\nkind: Pod\nmetadata:\n  name: typo\nspec:\n  containers:\n    - name: a\n      image: alpine\n      imagee: x\n')
    expect(rc != 0 and 'unknown field "spec.containers[0].imagee"' in out, 'strict validation refuses the field that the lesson names', 'manifests of the lessons')
    expect(REAL['text']['val.strict'].split('error when creating')[-1].split(':')[-1].strip() in out, 'the refusal on this cluster ends like the recorded one', 'manifests of the lessons')
    # controls
    control('a pod with a field that does not exist', lambda: dry_run('apiVersion: v1\nkind: Pod\nmetadata:\n  name: x\nspec:\n  containers:\n    - name: a\n      image: alpine\n      imagee: x\n')[0] != 0)
    control('a Deployment whose selector does not match its template', lambda: dry_run('apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: x\nspec:\n  selector:\n    matchLabels:\n      app: a\n  template:\n    metadata:\n      labels:\n        app: b\n    spec:\n      containers:\n        - name: c\n          image: alpine\n')[0] != 0)
    control('an object of a kind that does not exist', lambda: dry_run('apiVersion: v1\nkind: Podd\nmetadata:\n  name: x\n')[0] != 0)
    control('a Job with restartPolicy Always', lambda: dry_run('apiVersion: batch/v1\nkind: Job\nmetadata:\n  name: x\nspec:\n  template:\n    spec:\n      restartPolicy: Always\n      containers:\n        - name: c\n          image: alpine\n')[0] != 0)
    control('a Service with a port that is not a number', lambda: dry_run('apiVersion: v1\nkind: Service\nmetadata:\n  name: x\nspec:\n  selector:\n    app: a\n  ports:\n    - port: eighty\n')[0] != 0)

    # ------------------------------------------------------------------------------------------------------------------
    # 3. Kustomize, shell and Python
    # ------------------------------------------------------------------------------------------------------------------
    def kustomize(path):
        tmp = pathlib.Path(tempfile.mkdtemp(prefix='k8s-kz-'))
        shutil.copytree(path, tmp / 'kz')
        subprocess.run(['docker', 'cp', str(tmp / 'kz'), k8slib.NAME + ':/tmp/kz-check'], capture_output=True)
        o = k8slib.kc('kustomize', '/tmp/kz-check/overlays/prod' if (tmp / 'kz' / 'overlays').exists() else '/tmp/kz-check', check=False)
        subprocess.run(['docker', 'exec', k8slib.NAME, 'rm', '-rf', '/tmp/kz-check'], capture_output=True)
        shutil.rmtree(tmp, ignore_errors=True)
        return o
    o = kustomize(PROJECT / 'kustomize')
    expect(o.rc == 0 and o.out.strip() == REAL['text']['kz.out'].strip(), 'kubectl kustomize builds the overlay that the recording holds', 'kustomize')
    broken = pathlib.Path(tempfile.mkdtemp(prefix='k8s-kzbad-'))
    (broken / 'overlays' / 'prod').mkdir(parents=True)
    (broken / 'overlays' / 'prod' / 'kustomization.yaml').write_text('resources:\n  - ../../base\n')
    control('an overlay whose base does not exist', lambda: kustomize(broken).rc != 0)
    shutil.rmtree(broken, ignore_errors=True)

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
control('a shell script with an unclosed quote', lambda: run(['sh', '-n'], input='kubectl get pods -o "json\n').returncode != 0)
control('Python with a syntax error', lambda: compile('def f(:\n    pass', 'x', 'exec') is None)

# ----------------------------------------------------------------------------------------------------------------------
# 4. The commands of the terminal replays against the installed kubectl
# ----------------------------------------------------------------------------------------------------------------------
HELP = {}


def help_of(words):
    key = ' '.join(words)
    if key not in HELP:
        o = k8slib.kc(*(words + ['--help']), check=False)
        # an unknown word prints an error, or the help of the parent: the usage line must name the whole command
        HELP[key] = o.out if o.rc == 0 and re.search(r'^\s*kubectl ' + re.escape(key) + r'(?:\s|$)', o.out, re.M) else None
    return HELP[key]


def parse_flags(text):
    """name -> takes a value. The Options of kubectl help look like '    -o, --output='':' and '    --all=false:'."""
    flags = {}
    for ln in (text or '').splitlines():
        m = re.match(r'^\s{2,}(?:(-\w), )?(--[\w-]+)(?:=(.*?))?:?\s*$', ln)
        if m:
            default = m.group(3)
            takes = default is not None and default not in ('false', 'true')
            if m.group(1):
                flags[m.group(1)] = takes
            flags[m.group(2)] = takes
    return flags


GLOBAL = {}
if DOCKER:
    GLOBAL = parse_flags(k8slib.kc('options', check=False).out)
    expect('--namespace' in GLOBAL and '-n' in GLOBAL and '--as' in GLOBAL, 'the global flags of kubectl were read: %d' % len(GLOBAL), 'kubectl help')


def tokens(cmd):
    cmd = re.sub(r'<[^<>]*>', 'X', cmd)
    lex = shlex.shlex(cmd, posix=True, punctuation_chars=True)
    lex.whitespace_split = True
    lex.commenters = '#'
    return list(lex)


def check_command(cmd):
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
    if not seg or seg[0] != 'kubectl':
        return []
    rest = seg[1:]
    i = 0
    while i < len(rest) and rest[i].startswith('-'):                  # global flags before the command
        name = rest[i].split('=')[0]
        if name not in GLOBAL:
            return ['kubectl has no global flag %s' % name]
        i += 1 if ('=' in rest[i] or not GLOBAL[name]) else 2
    cand = []
    j = i
    while j < len(rest) and not rest[j].startswith('-') and len(cand) < 2:
        cand.append(rest[j])
        j += 1
    sub = None
    for n in range(len(cand), 0, -1):
        if help_of(cand[:n]):
            sub = cand[:n]
            break
    if not sub:
        return ['kubectl %s is not a command' % ' '.join(cand[:1])]
    h = help_of(sub)
    if len(sub) == 1 and len(cand) > 1 and 'Available Commands' in h:      # a command that has subcommands: the next word must be one of them
        return ['kubectl %s has no command %s' % (sub[0], cand[1])]
    flags = parse_flags(h)
    k = i + len(sub)
    found = []
    while k < len(rest):
        t = rest[k]
        if t == '--':
            break
        if t.startswith('--'):
            name = t.split('=')[0]
            if name not in flags and name not in GLOBAL:
                found.append('kubectl %s has no flag %s' % (' '.join(sub), name))
                k += 1
                continue
            takes = flags.get(name, GLOBAL.get(name))
            k += 1 if ('=' in t or not takes) else 2
        elif t.startswith('-') and len(t) > 1:
            consumed = False
            for n, ch in enumerate(t[1:]):
                known = flags.get('-' + ch, GLOBAL.get('-' + ch))
                if known is None:
                    found.append('kubectl %s has no flag -%s' % (' '.join(sub), ch))
                elif known and n == len(t) - 2:
                    consumed = True
            k += 2 if consumed else 1
        else:
            k += 1
    return found


if DOCKER:
    n_cmd = 0
    for c in DUMP['commands']:
        cmd = c['cmd']
        if not re.search(r'\bkubectl\b', cmd):
            continue
        n_cmd += 1
        for p in check_command(cmd):
            bad('%s: %s (in "%s")' % (c['id'], p, cmd[:100]))
    tick('kubectl commands checked against the help of the installed kubectl', n_cmd)
    expect(n_cmd >= 80, 'the replays hold at least 80 kubectl commands (found %d)' % n_cmd, 'kubectl help')
    control('a command with a flag that does not exist', lambda: check_command('kubectl get pods --not-a-flag') != [])
    control('a subcommand that does not exist', lambda: check_command('kubectl frobnicate pods') != [])
    control('a rollout subcommand that does not exist', lambda: check_command('kubectl rollout frobnicate deploy/web') != [])
    control('a short flag that does not exist', lambda: check_command('kubectl logs -Z pod') != [])
    expect(check_command('kubectl get pods -l app=web -o jsonpath="{.items[0].metadata.name}" --no-headers') == [], 'the command checker accepts a valid command', 'kubectl help')
    expect(check_command('kubectl exec client -- wget -qO- -T 3 http://web:8080') == [], 'the command checker stops at -- and accepts the rest', 'kubectl help')

# the cluster that this script started is removed here: the recapture starts its own
if STARTED:
    k8slib.clean_cluster()

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
UUID = re.compile(r'\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b')
# What may differ between two recordings, and why. Everything else must be equal.
SKIP = {'meta:recorded_on': 'the date'}


def fold(key, v):
    """Reduce a value to what must be equal between two recordings."""
    if key == 'counts:fail.crash':
        t = v['restart_times_s']
        gaps = [b - a for a, b in zip(t, t[1:])]
        return {'restarts_at_least_3': v['restarts_at_least_3'], 'backoff_event': v['backoff_event'], 'last_exit_code': v['last_exit_code'], 'last_reason': v['last_reason'],
                'waits_grow': len(gaps) >= 2 and all(b > a for a, b in zip(gaps, gaps[1:])), 'first_wait_about_10s': 8 <= gaps[0] <= 16,
                'error_seen': v['status_samples'].get('Error', 0) > 0, 'steps': [s for s in v['seen'] if s not in ('Running', 'CrashLoopBackOff')]}
    if key == 'counts:job.onfailure':
        return dict(v, max_restarts_seen=v['max_restarts_seen'] >= 1)
    if key == 'counts:job.cron':
        return dict(v, jobs_created=v['jobs_created'] >= 1)
    if isinstance(v, str):
        v = IPV4.sub('x.x.x.x', UUID.sub('<uuid>', v))
        if key == 'text:fail.crash_get':
            v = re.sub(r'\d+ \(\d+s ago\)', 'N (Ns ago)', v)
        if key == 'text:fail.crash_describe':
            v = re.sub(r'Restart Count:\s+\d+', 'Restart Count: N', v)
        if key == 'text:deploy.stuck_pods':
            v = re.sub(r'ErrImagePull|ImagePullBackOff', 'a failed pull', v)
        if key in ('text:job.parallel_get', 'text:sto.job_get'):
            v = re.sub(r'\b\d+s\b', 'Ns', v)
        if re.match(r'text:sto\.pvc', key):
            v = re.sub(r'pvc-[0-9a-f-]{36}', 'pvc-<uuid>', v)
    return v


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
            out += walk(fold(k, fa[k]), fold(k, fb[k]), '', k)
    return out


if not args.recapture:
    skipped('recapture', 'run with --recapture (about 10 minutes, needs Docker Hub for six images and PyPI for the loader image)')
elif not DOCKER:
    skipped('recapture', 'no Docker')
else:
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='k8s-recapture-')) / 'real.js'
    r = run([sys.executable, str(HERE / 'capture_k8s.py'), '--out', str(tmp)])
    if r.returncode or not tmp.exists():
        bad('capture_k8s.py failed: ' + (r.stdout + r.stderr)[-800:])
    else:
        again = load_real(tmp)
        diff = differing(REAL, again)
        tick('recaptured items', len(flatten(again)))
        for k in diff:
            bad('the recapture differs from js/real.js in %s' % k)
        print('recapture: %d items, %d differ' % (len(flatten(again)), len(diff)))
        changed = json.loads(json.dumps(REAL))
        changed['counts']['deploy.rolling']['max_pods_seen'] = 5
        control('a recording with one number changed, given to the comparison', lambda: differing(REAL, changed) == ['counts:deploy.rolling.max_pods_seen'])
        slow = json.loads(json.dumps(REAL))
        slow['counts']['fail.crash']['restart_times_s'] = [1, 13, 25, 37]
        control('a crash loop whose waits do not grow, given to the comparison', lambda: differing(REAL, slow) == ['counts:fail.crash.waits_grow'])
        shifted = json.loads(json.dumps(REAL))
        shifted['counts']['fail.crash']['restart_times_s'] = [t + 1 for t in shifted['counts']['fail.crash']['restart_times_s']]
        expect(differing(REAL, shifted) == [], 'restart times that all moved by a second are inside the allowance', 'recapture allowances')
    shutil.rmtree(tmp.parent, ignore_errors=True)

# ----------------------------------------------------------------------------------------------------------------------
# 6. The lab data, and controls for its checker
# ----------------------------------------------------------------------------------------------------------------------
def widget_checker(real=None):
    env = None
    if real is not None:
        p = pathlib.Path(tempfile.mkdtemp(prefix='k8s-control-')) / 'real.js'
        p.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(real) + ';\n')
        env = dict(os.environ, K8S_REAL_JS=str(p))
    return run(['node', str(HERE / 'check_widgets.js')], cwd=str(ROOT), env=env)


r = widget_checker()
m = re.search(r'(\d+) checks passed', r.stdout)
expect(r.returncode == 0 and m, 'check_widgets.js passes: ' + r.stdout.strip()[-200:], 'lab checks')
tick('lab data checks', int(m.group(1)) if m else 0)
for label, mutate in (
    ('a rolling update that went to five pods with a surge of one', lambda d: d['counts']['deploy.rolling'].__setitem__('max_pods_seen', 5)),
    ('a failing Job that made two pods with a backoff limit of two', lambda d: d['counts']['job.never'].__setitem__('pods', 2)),
    ('the QoS class of the guaranteed pod is changed', lambda d: d['counts']['res.qos'].__setitem__('guaranteed', 'Burstable')),
    ('the reader may delete pods', lambda d: [r_.__setitem__(1, 'yes') for r_ in d['tables']['rbac.reader']['rows'] if r_[0] == 'delete pods in brewline']),
    ('a deleted claim leaves a volume although the policy is Delete', lambda d: d['counts']['sto.after_pvc_delete'].__setitem__('pv_count', 1)),
    ('the worker without a handler did not wait', lambda d: [r_.__setitem__(1, 'no') for r_ in d['tables']['probe.shutdown']['rows'] if r_[0] == 'worker-nohandler']),
    ('the call to the Service without pods is answered by a server', lambda d: d['text'].__setitem__('svc.wrong_wget', 'wget: server returned error: HTTP/1.1 403 Forbidden')),
):
    data = json.loads(json.dumps(REAL))
    mutate(data)
    control(label + ': the widget checker fails', lambda data=data: widget_checker(data).returncode != 0)

# ----------------------------------------------------------------------------------------------------------------------
# 7. The lint
# ----------------------------------------------------------------------------------------------------------------------
r = run(['node', str(ROOT / 'dev' / 'lint-content.js'), 'kubernetes'], cwd=str(ROOT))
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
        ('the shutdown lab says that a pod with a handler waited for the grace period', 'kubernetes/js/widgets.js', "c.waited ? 'waited ' + c.grace + ' s, then killed' : 'went at once'", "c.waited ? 'went at once' : 'waited ' + c.grace + ' s, then killed'"),
        ('the storage lab says that deleting the pod lost the data', 'kubernetes/js/widgets.js', "ok: R.after_pod_deleted === R.after_load", "ok: false"),
        ('the rolling update lab ignores maxUnavailable', 'kubernetes/js/widgets.js', "while (old > 0 && old + ready - 1 >= n - unavail) old--;", "while (old > 0 && old + ready - 1 >= n - unavail - 1) old--;"),
        ('the service lab reverses the verdict', 'kubernetes/js/widgets.js', "[d.ok ? 'it works' : 'it fails', 'wget from the client pod'", "[d.ok ? 'it fails' : 'it works', 'wget from the client pod'"),
    ]
    for label, rel, old, new in MUTATIONS:
        copy = pathlib.Path(tempfile.mkdtemp(prefix='k8s-mutation-'))
        for part in ('shared', 'kubernetes'):
            shutil.copytree(ROOT / part, copy / part, ignore=shutil.ignore_patterns('__pycache__', '.cache', 'node_modules', '.git'))
        target = copy / rel
        src = target.read_text()
        if src.count(old) != 1:
            bad('control cannot be set up: "%s" is not in %s exactly once' % (old, rel))
            continue
        target.write_text(src.replace(old, new))
        r2, _ = labs_e2e(copy / 'kubernetes' / 'verify' / 'e2e_labs.js')
        control('the lab test fails when ' + label, lambda r2=r2: r2.returncode != 0)
        shutil.rmtree(copy, ignore_errors=True)

print()
print('checked: ' + ', '.join('%d %s' % (v, k) for k, v in sorted(counts.items())))
for s in skips:
    print('skipped: ' + s)
if problems:
    print('%d PROBLEM(S)' % len(problems))
    sys.exit(1)
print('verify_k8s: all checks passed')
