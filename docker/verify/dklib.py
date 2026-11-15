"""Helpers for the recorder: run docker, parse build output, clean up, write js/real.js.
Everything the recorder starts carries the label dk-course and a name that starts with dkc-, so a clean-up never touches anything else."""
import json
import os
import pathlib
import re
import shutil
import subprocess
import time

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
PROJECT = HERE / 'project'
LABEL = 'dk-course'

R = {'meta': {}, 'files': {}, 'text': {}, 'tables': {}, 'counts': {}}

# In the sandbox that built this course a build can only reach PyPI over the host network. Set DK_BUILD_NETWORK=host there; elsewhere leave it unset.
BUILD_NET = ['--network', os.environ['DK_BUILD_NETWORK']] if os.environ.get('DK_BUILD_NETWORK') else []
if os.environ.get('DK_BUILD_PROXY') and os.environ.get('HTTPS_PROXY'):
    # the sandbox reaches PyPI only through its proxy. BuildKit does not write these predefined arguments into docker history.
    BUILD_NET += ['--build-arg', 'HTTPS_PROXY=' + os.environ['HTTPS_PROXY'], '--build-arg', 'HTTP_PROXY=' + os.environ['HTTPS_PROXY']]


class Out:
    def __init__(self, p, secs):
        self.rc, self.out, self.err, self.secs = p.returncode, p.stdout, p.stderr, secs

    @property
    def all(self):
        return (self.out or '') + (self.err or '')


RATE = re.compile(r'429 Too Many Requests|toomanyrequests', re.I)


def sh(args, check=True, timeout=600, cwd=None, input=None, env=None):
    t = time.time()
    for attempt in range(80):
        p = subprocess.run(args, capture_output=True, text=True, timeout=timeout, cwd=cwd, input=input, env=env)
        o = Out(p, time.time() - t)
        # Docker Hub limits the pulls of anonymous users by the address, and a shared address uses the limit up. Wait for the window and try again.
        if o.rc and args and args[0] == 'docker' and RATE.search(o.all):
            print('Docker Hub answered 429 Too Many Requests; waiting 60 seconds (attempt %d)' % (attempt + 1), flush=True)
            time.sleep(60)
            continue
        break
    if check and o.rc:
        raise RuntimeError('command failed (%d): %s\n%s' % (o.rc, ' '.join(map(str, args)), o.all[-1500:]))
    return o


def dk(*a, **kw):
    return sh(['docker'] + [str(x) for x in a], **kw)


def clean_all():
    """Remove what an earlier or a failed run left behind."""
    ids = dk('ps', '-aq', '--filter', 'label=' + LABEL, check=False).out.split()
    if ids:
        dk('rm', '-f', '-v', *ids, check=False)
    ids = dk('ps', '-aq', '--filter', 'name=dkc-', check=False).out.split()
    if ids:
        dk('rm', '-f', '-v', *ids, check=False)
    for kind in ('network', 'volume'):
        ids = dk(kind, 'ls', '-q', '--filter', 'label=' + LABEL, check=False).out.split()
        if ids:
            dk(kind, 'rm', '-f', *ids, check=False)
    # compose projects are named dkc-*; their networks and volumes carry the project label instead
    ids = dk('network', 'ls', '-q', '--filter', 'name=dkc', check=False).out.split()
    if ids:
        dk('network', 'rm', *ids, check=False)
    ids = dk('volume', 'ls', '-q', '--filter', 'name=dkc', check=False).out.split()
    if ids:
        dk('volume', 'rm', '-f', *ids, check=False)
    imgs = dk('images', '--format', '{{.Repository}}:{{.Tag}}', '--filter', 'reference=dkc/*', check=False).out.split()
    imgs += dk('images', '--format', '{{.Repository}}:{{.Tag}}', '--filter', 'reference=localhost:5000/*', check=False).out.split()
    if imgs:
        dk('rmi', '-f', *imgs, check=False)


def run(*a, name=None, rm=True, **kw):
    """docker run with the course label; returns Out."""
    args = ['run']
    if rm:
        args.append('--rm')
    args += ['--label', LABEL]
    if name:
        args += ['--name', name]
    return dk(*(args + [str(x) for x in a]), **kw)


STEP = re.compile(r'^#(\d+) \[(?:(\S+) )?(\d+)/(\d+)\] (.*)$')


def parse_build(text):
    """Parse the output of `docker build --progress=plain`: the numbered steps of the Dockerfile and whether each one was taken from the cache."""
    steps, byid = [], {}
    for ln in text.splitlines():
        m = STEP.match(ln)
        if m:
            sid = m.group(1)
            if sid not in byid:
                s = {'id': sid, 'stage': m.group(2) or '', 'n': int(m.group(3)), 'of': int(m.group(4)), 'cmd': m.group(5).strip(), 'cached': False}
                byid[sid] = s
                steps.append(s)
            continue
        m = re.match(r'^#(\d+) CACHED', ln)
        if m and m.group(1) in byid:
            byid[m.group(1)]['cached'] = True
    return steps


def build(tag, ctx, dockerfile=None, extra=(), cache=True, check=True):
    args = ['build', '--progress=plain'] + BUILD_NET + ['--label', LABEL, '-t', tag]
    if not cache:
        args.append('--no-cache')
    if dockerfile:
        args += ['-f', str(dockerfile) if os.path.isabs(str(dockerfile)) else str(pathlib.Path(ctx) / dockerfile)]
    args += list(extra) + [str(ctx)]
    o = dk(*args, check=check)
    o.steps = parse_build(o.all)
    return o


def pull(ref):
    """Pull an image only when it is not on this machine. Docker Hub limits the pulls of anonymous users, and a recording that is made again should not
    use them up. To record against newer bases, pull them first with docker pull."""
    if dk('image', 'inspect', ref, check=False).rc != 0:
        dk('pull', '-q', ref)


def image_size(ref):
    return int(dk('image', 'inspect', ref, '--format', '{{.Size}}').out.strip())


def put_file(key, path):
    R['files'][key] = pathlib.Path(path).read_text()


def write_real(path):
    path = pathlib.Path(path)
    txt = 'window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(R, indent=1, sort_keys=True, ensure_ascii=False) + ';\n'
    path.write_text(txt)
    return path


def short(s, n=60):
    s = re.sub(r'\s+', ' ', s).strip()
    return s if len(s) <= n else s[:n - 1] + '…'


class Lcg:
    """A fixed rule for made-up numbers, so that every run writes the same rows."""
    def __init__(self, seed):
        self.s = seed

    def next(self):
        self.s = (self.s * 6364136223846793005 + 1442695040888963407) % (1 << 64)
        return self.s >> 33

    def below(self, n):
        return self.next() % n


def make_orders_csv(path, n=5000):
    g = Lcg(20260331)
    stores = ['s%02d' % i for i in range(1, 13)]
    rows = []
    for i in range(1, n + 1):
        store = stores[min(g.below(12), g.below(12))]
        day = 1 + g.below(31)
        amount = 300 + g.below(3700)
        rows.append((i, store, '2026-03-%02d' % day, '%d.%02d' % (amount // 100, amount % 100)))
    with open(path, 'w', newline='') as f:
        f.write('order_id,store_id,order_date,amount\n')
        for r in rows:
            f.write('%d,%s,%s,%s\n' % r)
    return rows
