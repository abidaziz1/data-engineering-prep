#!/usr/bin/env python3
"""Record what Docker really does, for the Docker course. Writes docker/js/real.js.

It runs on a real Docker Engine on this machine (images come from Docker Hub), with made-up Brewline data and a small loader job
(verify/project). Nothing is timed except to say that a stop waited for its grace period. IDs, addresses, digests and dates differ
between runs; verify_dk.py --recapture compares everything else and names those allowances.

Usage:  python3 docker/verify/capture_dk.py [--out path] [--only basics,build,...]
Set DK_BUILD_NETWORK=host when a build cannot reach PyPI over the default bridge (this was needed in the sandbox that built the course).
"""
import argparse
import datetime
import json
import os
import pathlib
import re
import shutil
import sys
import tempfile
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from dklib import *  # noqa: E401,F401,F403
import dklib

SECTIONS = []


def section(fn):
    SECTIONS.append(fn)
    return fn


WORK = None


def workdir():
    """A fresh copy of the project, so that edits never touch the files in the repository."""
    global WORK
    if WORK is None:
        WORK = pathlib.Path(tempfile.mkdtemp(prefix='dkc-work-'))
    p = WORK / 'project'
    if p.exists():
        shutil.rmtree(p)
    shutil.copytree(PROJECT, p)
    (p / 'data').mkdir()
    make_orders_csv(p / 'data' / 'orders.csv')
    return p


def table(cols, rows):
    return {'cols': cols, 'rows': rows}


# ------------------------------------------------------------------ 0. the machine and the files
@section
def meta():
    v = json.loads(dk('version', '--format', '{{json .}}').out)
    info = json.loads(dk('info', '--format', '{{json .}}').out)
    M = R['meta']
    M['docker_engine'] = v['Server']['Version']
    M['docker_api'] = v['Server']['ApiVersion']
    M['docker_client'] = v['Client']['Version']
    M['buildx'] = dk('buildx', 'version').out.split()[1]
    M['compose'] = dk('compose', 'version', '--short').out.strip().lstrip('v')
    M['storage_driver'] = info.get('Driver', '')
    M['snapshotter'] = 'containerd' if any('containerd.snapshotter' in str(x) for x in info.get('DriverStatus', [])) else 'classic'
    M['cgroup_version'] = info.get('CgroupVersion', '')
    M['kernel'] = info['KernelVersion']
    M['host_os'] = info['OperatingSystem']
    M['arch'] = sh(['uname', '-m']).out.strip()
    M['cpus'] = info['NCPU']
    M['python_image'] = 'python:3.13-slim'
    M['python_version'] = run('python:3.13-slim', 'python', '--version').out.strip().split()[1]
    M['postgres_image'] = 'postgres:16-alpine'
    M['postgres_version'] = run('postgres:16-alpine', 'postgres', '--version').out.strip().split()[-1]
    M['alpine_image'] = 'alpine:3.22'
    M['psycopg'] = '3.3.8'
    M['pandas'] = '3.1.1'
    M['recorded_on'] = datetime.date.today().isoformat()
    for p in sorted(PROJECT.rglob('*')):
        if p.is_file() and p.suffix != '.pyc':
            R['files'][p.relative_to(PROJECT).as_posix()] = p.read_text()
    R['files']['data/orders.csv (first rows)'] = ''.join(open(workdir() / 'data' / 'orders.csv').readlines()[:6])


# ------------------------------------------------------------------ 1. images and containers
@section
def basics():
    C, T, X = R['counts'], R['tables'], R['text']
    X['basics.hello'] = run('alpine:3.22', 'echo', 'hello from a container').out.strip()
    host_k = sh(['uname', '-r']).out.strip()
    cont_k = run('alpine:3.22', 'uname', '-r').out.strip()
    host_os = [l for l in open('/etc/os-release') if l.startswith('PRETTY_NAME')][0].split('=')[1].strip().strip('"')
    cont_os = run('alpine:3.22', 'sh', '-c', '. /etc/os-release; echo $PRETTY_NAME').out.strip()
    C['basics.kernel'] = {'host': host_k, 'container': cont_k, 'same': host_k == cont_k, 'host_os': host_os, 'container_os': cont_os}
    ps = run('alpine:3.22', 'ps', '-o', 'pid,args').out
    X['basics.ps'] = ps.strip()
    host_n = len(sh(['ps', '-e', '--no-headers']).out.splitlines())
    C['basics.processes'] = {'in_container': len(ps.strip().splitlines()) - 1, 'on_host': host_n}

    # the states of one container
    rows = []
    dk('create', '--label', LABEL, '--name', 'dkc-life', 'alpine:3.22', 'sh', '-c', 'echo done; sleep 2')
    rows.append(['docker create', 'created', dk('inspect', 'dkc-life', '--format', '{{.State.Status}}').out.strip()])
    dk('start', 'dkc-life')
    rows.append(['docker start', 'running', dk('inspect', 'dkc-life', '--format', '{{.State.Status}}').out.strip()])
    dk('wait', 'dkc-life')
    st = dk('inspect', 'dkc-life', '--format', '{{.State.Status}} {{.State.ExitCode}}').out.split()
    rows.append(['the command ends', 'exited', st[0]])
    C['basics.life'] = {'exit_code': int(st[1]), 'logs_after_exit': dk('logs', 'dkc-life').out.strip()}
    dk('rm', 'dkc-life')
    gone = dk('inspect', 'dkc-life', check=False).rc != 0
    rows.append(['docker rm', 'gone', 'gone' if gone else 'still there'])
    T['basics.states'] = table(['What you do', 'State you expect', 'State recorded'], rows)

    # -it needs a terminal; a scheduler or cron has none
    t = dk('run', '--rm', '-it', 'alpine:3.22', 'echo', 'hi', check=False)
    X['basics.tty'] = (t.all.strip().splitlines() or [''])[-1]
    C['basics.tty'] = {'rc': t.rc}
    # a long running container: exec, logs, stop
    dk('run', '-d', '--label', LABEL, '--name', 'dkc-web', 'alpine:3.22', 'sh', '-c', 'while true; do echo tick; sleep 1; done')
    time.sleep(2.5)
    X['basics.exec'] = dk('exec', 'dkc-web', 'ps', '-o', 'pid,args').out.strip()
    X['basics.logs'] = '\n'.join(dk('logs', '--tail', '2', 'dkc-web').out.split('\n')[-3:]).strip()
    s = dk('stop', '-t', '1', 'dkc-web')
    C['basics.stop'] = {'exit_code': int(dk('inspect', 'dkc-web', '--format', '{{.State.ExitCode}}').out), 'status': dk('inspect', 'dkc-web', '--format', '{{.State.Status}}').out.strip()}
    dk('rm', 'dkc-web')

    # what a container writes lands in its own layer
    dk('run', '--label', LABEL, '--name', 'dkc-diff', 'alpine:3.22', 'sh', '-c', 'echo x > /tmp/a.txt; rm /etc/motd; echo y >> /etc/hostname')
    X['basics.diff'] = '\n'.join(sorted(dk('diff', 'dkc-diff').out.strip().splitlines(), key=lambda l: l[2:]))  # the engine does not promise an order
    dk('rm', 'dkc-diff')

    # one image, three containers: the image is stored once
    for i in range(3):
        dk('run', '-d', '--label', LABEL, '--name', 'dkc-share%d' % i, 'alpine:3.22', 'sleep', '30')
    X['basics.ps_size'] = dk('ps', '-s', '--filter', 'name=dkc-share', '--format', 'table {{.Image}}\t{{.Size}}').out.strip()
    for i in range(3):
        dk('rm', '-f', 'dkc-share%d' % i)

    # the layers of an image
    for ref in ('alpine:3.22', 'python:3.13-slim', 'postgres:16-alpine'):
        lay = int(dk('image', 'inspect', ref, '--format', '{{len .RootFS.Layers}}').out)
        C['basics.layers.' + ref] = {'layers': lay, 'size': image_size(ref)}
    hist = dk('history', '--no-trunc', '--format', '{{.Size}}\t{{.CreatedBy}}', 'python:3.13-slim').out.strip().splitlines()
    rows = []
    for l in hist:
        size, cmd = l.split('\t', 1)
        rows.append([size, short(re.sub(r'^/bin/sh -c (#\(nop\) )?', '', cmd), 70)])
    T['basics.history'] = table(['Size', 'Instruction that made the layer'], rows[:12])
    C['basics.history_count'] = {'rows': len(rows), 'with_size': len([r for r in rows if r[0] != '0B'])}


# ------------------------------------------------------------------ 2. the build and its cache
@section
def build_cache():
    C, T, X = R['counts'], R['tables'], R['text']
    p = workdir()
    app = p / 'app'
    # a Dockerfile that does not parse, and one that parses and still deserves a warning
    X['build.bad'] = re.sub(r'\n+', '\n', build('dkc/bad:1', app, 'Dockerfile.bad', check=False).all).strip().splitlines()
    X['build.bad'] = '\n'.join(l for l in X['build.bad'] if 'unknown instruction' in l or 'dockerfile parse error' in l or l.startswith('ERROR'))[:600]
    chk = dk('build', '--check', '-f', str(app / 'Dockerfile.lint'), str(app), check=False)
    txt = re.sub(r'\x1b\[[0-9;]*m', '', chk.all).replace(str(app) + '/', '')
    X['build.check'] = txt.split('#0 building')[0].strip()
    C['build.check'] = {'rc': chk.rc, 'warnings': len(re.findall(r'WARNING:', chk.all))}

    # the cache matrix: two orders of the same instructions, three changes each
    rows = []
    summary = []
    for order, dockerfile in (('copy first', 'Dockerfile.copy_first'), ('dependencies first', 'Dockerfile')):
        for change in ('nothing', 'one line of load_orders.py', 'requirements.txt'):
            p = workdir()
            app = p / 'app'
            tag = 'dkc/cache:1'
            dk('builder', 'prune', '-af', check=False)  # a case must not find layers that an earlier run built
            build(tag, app, dockerfile, cache=False)
            if change.startswith('one line'):
                with open(app / 'load_orders.py', 'a') as f:
                    f.write('# a comment\n')
            elif change == 'requirements.txt':
                with open(app / 'requirements.txt', 'a') as f:
                    f.write('# pinned on purpose\n')
            o = build(tag, app, dockerfile)
            steps = sorted([s for s in o.steps if not s['cmd'].startswith('FROM ')], key=lambda s: s['n'])
            ran = [s for s in steps if not s['cached']]
            for s in steps:
                rows.append([order, change, s['n'] - 1, short(s['cmd'], 64), s['cached']])
            summary.append([order, change, len(steps), len(ran), any(s['cmd'].startswith('RUN pip') for s in ran)])
    T['cache.steps'] = table(['order', 'change', 'step', 'instruction', 'cached'], rows)
    T['cache.summary'] = table(['order', 'change', 'steps', 'steps that ran again', 'pip ran again'], summary)

    # the build context
    p = workdir()
    app = p / 'app'
    big = app / 'data'
    big.mkdir()
    for i in range(20):
        (big / ('archive_%02d.csv' % i)).write_bytes(b'0' * (2 * 1024 * 1024))
    (app / '.dockerignore').rename(app / '.dockerignore.off')
    o1 = build('dkc/ctx:1', app, 'Dockerfile.copy_first', cache=False)
    shutil.copytree(app, p / 'app2')
    (p / 'app2' / '.dockerignore.off').rename(p / 'app2' / '.dockerignore')
    o2 = build('dkc/ctx:2', p / 'app2', 'Dockerfile.copy_first', cache=False)
    ctx = lambda o: [l for l in o.all.splitlines() if 'transferring context' in l and 'B' in l]
    C['build.context'] = {'without_ignore': ctx(o1)[-1].split('transferring context: ')[1].split()[0], 'with_ignore': ctx(o2)[-1].split('transferring context: ')[1].split()[0],
                          'junk_files': 20, 'junk_bytes': 20 * 2 * 1024 * 1024}
    X['build.context'] = '\n'.join(re.sub(r'^#\d+ ', '', l) for l in ctx(o1) + ctx(o2))

    # the image that was built, layer by layer
    hist = dk('history', '--no-trunc', '--format', '{{.Size}}\t{{.CreatedBy}}', 'dkc/ctx:2').out.strip().splitlines()
    rows = []
    for l in hist[:6]:
        size, cmd = l.split('\t', 1)
        rows.append([size, short(re.sub(r'^/bin/sh -c (#\(nop\) )?', '', cmd).replace('# buildkit', '').replace('|0 ', ''), 70)])
    T['build.history'] = table(['Size', 'Instruction'], rows)
    C['build.image'] = {'size': image_size('dkc/ctx:2'), 'base_size': image_size('python:3.13-slim')}
    out = run('dkc/ctx:2', 'python', '-c', 'import psycopg; print(psycopg.__version__)').out.strip()
    C['build.image']['psycopg_inside'] = out
    # the loader is not baked into the image as data: run with no database to see the error the lessons talk about
    e = run('dkc/ctx:2', 'python', 'load_orders.py', '/data/orders.csv', check=False)
    X['build.nodata'] = e.all.strip().splitlines()[-1]



# ------------------------------------------------------------------ helpers for the sections that follow
def pg_start(name, *extra):
    dk('run', '-d', '--label', LABEL, '--name', name, '-e', 'POSTGRES_PASSWORD=brewline-dev', '-e', 'POSTGRES_DB=brewline', *extra, 'postgres:16-alpine')
    pg_wait(name)


def pg_wait(name, tries=90):
    """Wait until the server accepts TCP connections. The temporary server of the first start listens on a socket only."""
    for _ in range(tries):
        if dk('exec', name, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres', '-d', 'brewline', check=False).rc == 0:
            return
        time.sleep(0.5)
    raise RuntimeError('postgres did not start in %s' % name)


def psql(name, sql):
    o = dk('exec', name, 'psql', '-U', 'postgres', '-d', 'brewline', '-tAc', sql, check=False)
    if o.rc == 0:
        return o.out.strip()
    errs = [l for l in o.err.splitlines() if l.startswith('ERROR') or l.startswith('FATAL')]
    return 'error: ' + (errs[0] if errs else (o.err.strip().splitlines() or ['?'])[-1])


def loader_image(tag='dkc/loader:1'):
    p = workdir()
    build(tag, p / 'app', 'Dockerfile')
    return p


def dangling_volumes():
    return set(dk('volume', 'ls', '-q', '-f', 'dangling=true').out.split())


# ------------------------------------------------------------------ 3. small images
@section
def small_images():
    C, T, X = R['counts'], R['tables'], R['text']
    p = workdir()
    app = p / 'app'
    for ref in ('python:3.13', 'python:3.13-slim', 'python:3.13-alpine'):
        pull(ref)
    rows = [[ref, image_size(ref), int(dk('image', 'inspect', ref, '--format', '{{len .RootFS.Layers}}').out)] for ref in ('python:3.13', 'python:3.13-slim', 'python:3.13-alpine')]
    T['small.bases'] = table(['image', 'size in bytes', 'layers'], rows)
    # the same packages on two bases
    heavy = {}
    for name, base in (('slim', 'python:3.13-slim'), ('alpine', 'python:3.13-alpine')):
        o = build('dkc/heavy:' + name, app, 'Dockerfile.heavy', extra=['--build-arg', 'BASE=' + base], check=False)
        if o.rc == 0:
            heavy[name] = {'ok': True, 'size': image_size('dkc/heavy:' + name)}
            heavy[name]['pandas'] = run('dkc/heavy:' + name, 'python', '-c', 'import pandas, pyarrow; print(pandas.__version__, pyarrow.__version__)').out.strip()
        else:
            heavy[name] = {'ok': False, 'error': short((o.all.strip().splitlines() or ['?'])[-1], 160)}
    C['small.heavy'] = heavy
    # a file that is deleted in a later layer is still in the image
    build('dkc/rm_later:1', app, 'Dockerfile.rm_later', cache=False)
    build('dkc/rm_same:1', app, 'Dockerfile.rm_same', cache=False)
    C['small.rm'] = {'base': image_size('alpine:3.22'), 'later_layer': image_size('dkc/rm_later:1'), 'same_layer': image_size('dkc/rm_same:1'), 'file_bytes': 50 * 1024 * 1024}
    h = dk('history', '--format', '{{.Size}}\t{{.CreatedBy}}', 'dkc/rm_later:1').out.strip().splitlines()
    T['small.rm_history'] = table(['Size', 'Instruction'], [[l.split('\t')[0], short(re.sub(r'^/bin/sh -c ', 'RUN ', l.split('\t', 1)[1]).replace('# buildkit', ''), 64)] for l in h[:3]])
    # stages: the tests run only when a stage needs them
    o = build('dkc/stage_test:1', app, 'Dockerfile.multistage', extra=['--target', 'test'], cache=False)
    lines = [re.sub(r'^#\d+ [0-9.]+ ', '', l) for l in o.all.splitlines()]
    X['small.pytest'] = re.sub(r' in [0-9.]+s', ' in 0.0s', '\n'.join(l for l in lines if re.match(r'^\.+\s+\[\s*\d+%\]', l) or re.search(r'\d+ passed', l)))
    o2 = build('dkc/stage_runtime:1', app, 'Dockerfile.multistage', cache=False)
    ran_tests = 'pytest' in o2.all.replace('requirements', '')
    has = lambda img: run(img, 'python', '-c', 'import importlib.util as u; print(u.find_spec("pytest") is not None)', check=False).out.strip()
    C['small.stages'] = {'test_image_size': image_size('dkc/stage_test:1'), 'runtime_image_size': image_size('dkc/stage_runtime:1'), 'pytest_in_test': has('dkc/stage_test:1'),
                         'pytest_in_runtime': has('dkc/stage_runtime:1'), 'default_build_ran_pytest': ran_tests, 'default_build_steps': len([x for x in o2.steps if not x['cmd'].startswith('FROM ')])}


# ------------------------------------------------------------------ 4. data and volumes
@section
def volumes():
    C, T, X = R['counts'], R['tables'], R['text']
    N = 5000
    seed = "CREATE TABLE orders AS SELECT g AS order_id FROM generate_series(1, %d) g" % N
    count = lambda n: psql(n, 'SELECT count(*) FROM orders')
    before = dangling_volumes()
    rows = []
    # 1. no flag at all: the postgres image declares a volume for its data directory
    pg_start('dkc-v1')
    psql('dkc-v1', seed)
    dk('stop', 'dkc-v1')
    dk('start', 'dkc-v1')
    pg_wait('dkc-v1')
    a = count('dkc-v1')
    mounts = dk('inspect', 'dkc-v1', '--format', '{{range .Mounts}}{{.Type}} {{.Destination}}{{end}}').out.strip()
    dk('rm', '-f', 'dkc-v1')
    after_rm = dangling_volumes() - before
    pg_start('dkc-v1b')
    b = count('dkc-v1b')
    dk('rm', '-f', '-v', 'dkc-v1b')
    C['volumes.anonymous'] = {'mounts': mounts, 'dangling_volumes_left_by_rm': len(after_rm)}
    rows.append(['no volume flag', a, b])
    dk('volume', 'rm', '-f', *list(after_rm), check=False)
    # 2. a named volume
    dk('volume', 'create', '--label', LABEL, 'dkc-pgdata')
    pg_start('dkc-v2', '-v', 'dkc-pgdata:/var/lib/postgresql/data')
    psql('dkc-v2', seed)
    dk('stop', 'dkc-v2')
    dk('start', 'dkc-v2')
    pg_wait('dkc-v2')
    a = count('dkc-v2')
    dk('rm', '-f', 'dkc-v2')
    pg_start('dkc-v2b', '-v', 'dkc-pgdata:/var/lib/postgresql/data')
    b = count('dkc-v2b')
    dk('rm', '-f', 'dkc-v2b')
    rows.append(['named volume', a, b])
    # 3. a bind mount of a host directory
    host = pathlib.Path(tempfile.mkdtemp(prefix='dkc-bind-'))
    pg_start('dkc-v3', '-v', '%s:/var/lib/postgresql/data' % host)
    psql('dkc-v3', seed)
    dk('stop', 'dkc-v3')
    dk('start', 'dkc-v3')
    pg_wait('dkc-v3')
    a = count('dkc-v3')
    dk('rm', '-f', 'dkc-v3')
    owner = sh(['stat', '-c', '%u:%g %a', str(host / 'PG_VERSION')]).out.strip()
    pg_start('dkc-v3b', '-v', '%s:/var/lib/postgresql/data' % host)
    b = count('dkc-v3b')
    dk('rm', '-f', 'dkc-v3b')
    C['volumes.bind'] = {'owner_of_pg_version_on_host': owner, 'files_in_host_dir': len(list(host.iterdir()))}
    sh(['rm', '-rf', str(host)])
    rows.append(['bind mount of a host folder', a, b])
    # 4. tmpfs
    dk('run', '-d', '--label', LABEL, '--name', 'dkc-v4', '-e', 'POSTGRES_PASSWORD=brewline-dev', '-e', 'POSTGRES_DB=brewline', '--tmpfs', '/var/lib/postgresql/data', 'postgres:16-alpine')
    pg_wait('dkc-v4')
    psql('dkc-v4', seed)
    dk('stop', 'dkc-v4')
    dk('start', 'dkc-v4')
    pg_wait('dkc-v4')
    a = count('dkc-v4')
    dk('rm', '-f', 'dkc-v4')
    rows.append(['tmpfs (memory)', a, a])
    for r in rows:
        r[1] = 'no table' if 'does not exist' in str(r[1]) else str(r[1])
        r[2] = 'no table' if 'does not exist' in str(r[2]) else str(r[2])
    T['volumes.matrix'] = table(['how the data directory is stored', 'after stop and start', 'after rm and a new container'], rows)
    C['volumes.rows_before'] = {'rows': N}

    # a file written by a root process into a bind mount belongs to root on the host
    d = pathlib.Path(tempfile.mkdtemp(prefix='dkc-perm-'))
    os.chmod(d, 0o755)
    dk('run', '--rm', '--label', LABEL, '-v', '%s:/out' % d, 'alpine:3.22', 'sh', '-c', 'echo hello > /out/report.txt')
    root_owned = sh(['stat', '-c', '%u:%g', str(d / 'report.txt')]).out.strip()
    denied = dk('run', '--rm', '--label', LABEL, '--user', '1000:1000', '-v', '%s:/out' % d, 'alpine:3.22', 'sh', '-c', 'echo again > /out/second.txt', check=False)
    mine = dk('run', '--rm', '--label', LABEL, '--user', '%d:%d' % (os.getuid() or 1000, os.getgid() or 1000), '-v', '%s:/out' % d, 'alpine:3.22', 'sh', '-c', 'echo again > /out/second.txt', check=False)
    C['volumes.perms'] = {'file_owner_written_by_root_in_container': root_owned, 'non_root_write_rc': denied.rc, 'non_root_write_error': (denied.err.strip().splitlines() or [''])[-1]}
    sh(['rm', '-rf', str(d)])
    # a volume can be copied out with a throwaway container
    dk('run', '--rm', '--label', LABEL, '-v', 'dkc-pgdata:/data', 'alpine:3.22', 'sh', '-c', 'ls /data | wc -l')
    bk = pathlib.Path(tempfile.mkdtemp(prefix='dkc-bk-'))
    dk('run', '--rm', '--label', LABEL, '-v', 'dkc-pgdata:/data:ro', '-v', '%s:/backup' % bk, 'alpine:3.22', 'tar', 'czf', '/backup/pgdata.tgz', '-C', '/data', '.')
    C['volumes.backup'] = {'tar_bytes': (bk / 'pgdata.tgz').stat().st_size > 1000, 'files_in_volume': int(dk('run', '--rm', '--label', LABEL, '-v', 'dkc-pgdata:/data', 'alpine:3.22', 'sh', '-c', 'ls /data | wc -l').out.strip())}
    sh(['rm', '-rf', str(bk)])
    dk('volume', 'rm', '-f', 'dkc-pgdata')


# ------------------------------------------------------------------ 5. networks
@section
def networks():
    C, T, X = R['counts'], R['tables'], R['text']
    p = loader_image()
    data = str(p / 'data')
    # the default bridge: no names
    dk('run', '-d', '--label', LABEL, '--name', 'dkc-a', 'alpine:3.22', 'sleep', '300')
    ip_a = dk('inspect', 'dkc-a', '--format', '{{(index .NetworkSettings.Networks "bridge").IPAddress}}').out.strip()
    by_name = dk('run', '--rm', '--label', LABEL, 'alpine:3.22', 'getent', 'hosts', 'dkc-a', check=False)
    by_ip = dk('run', '--rm', '--label', LABEL, 'alpine:3.22', 'ping', '-c', '1', '-W', '2', ip_a, check=False)
    C['net.default'] = {'resolve_by_name_rc': by_name.rc, 'ping_by_ip_rc': by_ip.rc, 'network': 'bridge'}
    dk('rm', '-f', 'dkc-a')
    # a network that you create: names
    dk('network', 'create', '--label', LABEL, 'dkc-net')
    dk('run', '-d', '--label', LABEL, '--name', 'dkc-db', '--network', 'dkc-net', '-e', 'POSTGRES_PASSWORD=brewline-dev', '-e', 'POSTGRES_DB=brewline', 'postgres:16-alpine')
    pg_wait('dkc-db')
    r = dk('run', '--rm', '--label', LABEL, '--network', 'dkc-net', 'alpine:3.22', 'sh', '-c', 'getent hosts dkc-db; grep nameserver /etc/resolv.conf', check=False)
    X['net.user'] = re.sub(r'\d+\.\d+\.\d+\.\d+(?= +dkc-db)', 'x.x.x.x', r.out.strip())
    C['net.user'] = {'resolve_by_name_rc': r.rc, 'dns_server': '127.0.0.11' in r.out}
    # localhost inside a container is the container
    env_local = 'DATABASE_URL=postgresql://postgres:brewline-dev@localhost:5432/brewline'
    bad = dk('run', '--rm', '--label', LABEL, '--network', 'dkc-net', '-e', env_local, '-v', data + ':/data:ro', 'dkc/loader:1', check=False)
    ln = bad.all.strip().splitlines()
    i = [k for k, l in enumerate(ln) if l.startswith('psycopg.OperationalError')]
    X['net.localhost'] = '\n'.join(l.strip() for l in ln[i[-1]:]) if i else (ln or [''])[-1]
    C['net.localhost'] = {'rc': bad.rc}
    good = dk('run', '--rm', '--label', LABEL, '--network', 'dkc-net', '-e', 'DATABASE_URL=postgresql://postgres:brewline-dev@dkc-db:5432/brewline', '-v', data + ':/data:ro', 'dkc/loader:1', check=False)
    X['net.byname'] = good.all.strip()
    C['net.byname'] = {'rc': good.rc}
    # a wrong host name
    wrong = dk('run', '--rm', '--label', LABEL, '--network', 'dkc-net', '-e', 'DATABASE_URL=postgresql://postgres:brewline-dev@database:5432/brewline', '-v', data + ':/data:ro', 'dkc/loader:1', check=False)
    X['net.wrongname'] = (wrong.all.strip().splitlines() or [''])[-1]
    dk('rm', '-f', 'dkc-db')
    # the address changes, the name does not
    dk('run', '-d', '--label', LABEL, '--name', 'dkc-x', '--network', 'dkc-net', 'alpine:3.22', 'sleep', '300')
    first = dk('inspect', 'dkc-x', '--format', '{{(index .NetworkSettings.Networks "dkc-net").IPAddress}}').out.strip()
    dk('rm', '-f', 'dkc-x')
    dk('run', '-d', '--label', LABEL, '--name', 'dkc-filler', '--network', 'dkc-net', 'alpine:3.22', 'sleep', '300')
    dk('run', '-d', '--label', LABEL, '--name', 'dkc-x', '--network', 'dkc-net', 'alpine:3.22', 'sleep', '300')
    second = dk('inspect', 'dkc-x', '--format', '{{(index .NetworkSettings.Networks "dkc-net").IPAddress}}').out.strip()
    C['net.recreate'] = {'address_changed': first != second, 'name_still_resolves': dk('run', '--rm', '--label', LABEL, '--network', 'dkc-net', 'alpine:3.22', 'getent', 'hosts', 'dkc-x', check=False).rc == 0}
    dk('rm', '-f', 'dkc-x', 'dkc-filler')
    # ports: publishing is what makes a container reachable from the host
    dk('run', '-d', '--label', LABEL, '--name', 'dkc-p1', '-p', '127.0.0.1:15432:5432', '-e', 'POSTGRES_PASSWORD=brewline-dev', 'postgres:16-alpine')
    dk('run', '-d', '--label', LABEL, '--name', 'dkc-p2', '-p', '15433:5432', '-e', 'POSTGRES_PASSWORD=brewline-dev', 'postgres:16-alpine')
    dk('run', '-d', '--label', LABEL, '--name', 'dkc-p3', '-e', 'POSTGRES_PASSWORD=brewline-dev', 'postgres:16-alpine')
    time.sleep(6)
    X['net.port1'] = dk('port', 'dkc-p1').out.strip()
    X['net.port2'] = dk('port', 'dkc-p2').out.strip()
    X['net.port3'] = dk('port', 'dkc-p3').out.strip() or '(nothing published)'
    listen = dk('run', '--rm', '--label', LABEL, '--network', 'host', 'alpine:3.22', 'netstat', '-ltn', check=False).out
    C['net.ports'] = {'p1_listens_on': '127.0.0.1:15432' if '127.0.0.1:15432' in listen else '?', 'p2_listens_on': '0.0.0.0:15433' if ('0.0.0.0:15433' in listen or ':::15433' in listen) else '?',
                      'host_reaches_p1': dk('run', '--rm', '--label', LABEL, '--network', 'host', 'postgres:16-alpine', 'pg_isready', '-h', '127.0.0.1', '-p', '15432', check=False).rc == 0,
                      'host_reaches_p3_from_localhost_15434': dk('run', '--rm', '--label', LABEL, '--network', 'host', 'postgres:16-alpine', 'pg_isready', '-h', '127.0.0.1', '-p', '15434', check=False).rc == 0}
    busy = dk('run', '-d', '--label', LABEL, '--name', 'dkc-p4', '-p', '127.0.0.1:15432:5432', 'postgres:16-alpine', check=False)
    msg = ' '.join(busy.err.split())
    m = re.search(r'(Bind for \S+ failed: port is already allocated|address already in use)', msg)
    X['net.busy'] = m.group(1) if m else msg[:240]
    dk('rm', '-f', 'dkc-p1', 'dkc-p2', 'dkc-p3', 'dkc-p4', check=False)
    # none and host
    none = dk('run', '--rm', '--label', LABEL, '--network', 'none', 'alpine:3.22', 'sh', '-c', 'ip -o link | wc -l; wget -q -T 2 -O- http://127.0.0.1 2>&1 | head -1', check=False)
    host_ifaces = dk('run', '--rm', '--label', LABEL, '--network', 'host', 'alpine:3.22', 'sh', '-c', 'ip -o link | wc -l').out.strip()
    C['net.modes'] = {'interfaces_none': int(none.out.split()[0]), 'interfaces_host': int(host_ifaces), 'interfaces_bridge': int(dk('run', '--rm', '--label', LABEL, 'alpine:3.22', 'sh', '-c', 'ip -o link | wc -l').out.strip())}
    dk('network', 'rm', 'dkc-net')


# ------------------------------------------------------------------ 6. compose
@section
def compose():
    C, T, X = R['counts'], R['tables'], R['text']
    p = workdir()
    ov = p / 'compose.sandbox.yaml'
    SANDBOX = bool(os.environ.get('DK_BUILD_NETWORK'))
    if SANDBOX:
        # Compose builds through bake, which refuses a build on the host network. In the sandbox the recorder builds the image itself
        # and Compose runs it. Everything Compose does with containers, networks and volumes is unchanged. Elsewhere Compose builds.
        build('dkc/loader:1', p / 'app', 'Dockerfile')
        ov.write_text('services:\n  loader:\n    build: !reset null\n    image: dkc/loader:1\n')
    else:
        ov.write_text('services: {}\n')
    B = [] if SANDBOX else ['--build']

    def cc(*a, check=True, f='compose.yaml', proj='dkc-stack'):
        return sh(['docker', 'compose', '-p', proj, '-f', f, '-f', 'compose.sandbox.yaml'] + list(a), cwd=str(p), check=check, timeout=600, env=dict(os.environ, COMPOSE_BAKE='false'))

    clean = lambda t: '\n'.join(re.sub(r'^\S+\s+\| ', lambda m: m.group(0), l) for l in t.splitlines())
    # what compose will do, written out
    cfg = sh(['docker', 'compose', '-p', 'dkc-stack', '-f', 'compose.yaml', 'config'], cwd=str(p)).out
    cfg = re.sub(r'context: .*', 'context: ./app', cfg)
    cfg = re.sub(r'source: /\S*/data\b', 'source: ./data', cfg)
    cfg = re.sub(r'^name: .*', 'name: dkc-stack', cfg, flags=re.M)
    X['compose.config'] = cfg.strip()

    # without a healthcheck: the loader starts when the container of the database has started, and the database is not ready
    rr = cc('up', *B, '--abort-on-container-exit', '--exit-code-from', 'loader', f='compose.nohealth.yaml', proj='dkc-race', check=False)
    lines = [re.sub(r'^\S+\s+\| ', '', l) for l in rr.all.splitlines() if l.startswith('loader') or 'loader-1' in l]
    err = [l for l in rr.all.splitlines() if 'psycopg.OperationalError' in l]
    X['compose.race'] = (re.sub(r'^\S+\s+\| ', '', err[-1]) if err else '').strip()[:260]
    C['compose.race'] = {'exit_code': rr.rc, 'loader_failed': rr.rc != 0}
    cc('down', '-v', f='compose.nohealth.yaml', proj='dkc-race', check=False)

    # why the healthcheck asks over TCP: the first start runs a temporary server that listens on a socket only
    X['compose.entrypoint'] = run('postgres:16-alpine', 'sh', '-c', "grep -n -E \"temporary|listen_addresses\" /usr/local/bin/docker-entrypoint.sh | head -6").out.strip()

    # the stack as written in the lessons
    cc('up', '-d', *B)
    dk('wait', 'dkc-stack-loader-1')
    X['compose.up'] = cc('logs', 'loader', '--no-log-prefix').out.strip()
    C['compose.up'] = {'loader_exit_code': int(dk('inspect', 'dkc-stack-loader-1', '--format', '{{.State.ExitCode}}').out)}
    ps = cc('ps', '-a', '--format', '{{.Service}}\t{{.State}}\t{{.Health}}').out.strip().splitlines()
    T['compose.ps'] = table(['service', 'state', 'health'], [(l.split('\t') + [''])[:3] for l in ps])
    vols = lambda: sorted(dk('volume', 'ls', '--format', '{{.Name}}', '--filter', 'name=dkc-stack').out.split())
    nets = lambda: sorted(dk('network', 'ls', '--format', '{{.Name}}', '--filter', 'name=dkc-stack').out.split())
    C['compose.objects'] = {'volumes_while_up': vols(), 'networks_while_up': nets()}
    cc('down')
    C['compose.down'] = {'volumes_after_down': vols(), 'networks_after_down': nets()}
    again = cc('up', '--abort-on-container-exit', '--exit-code-from', 'loader')
    X['compose.again'] = '\n'.join(re.sub(r'^\S+\s+\| ', '', l) for l in again.all.splitlines() if 'loader-1  |' in l).strip()
    cc('down', '-v')
    C['compose.down_v'] = {'volumes_after_down_v': vols()}
    # one-off jobs: a profile keeps the loader out of `up`
    cc('up', '-d', '--wait', f='compose.profiles.yaml', proj='dkc-prof')
    names = cc('ps', '--format', '{{.Service}}', f='compose.profiles.yaml', proj='dkc-prof').out.split()
    job = cc('--profile', 'jobs', 'run', '--rm', 'loader', f='compose.profiles.yaml', proj='dkc-prof')
    X['compose.job'] = (job.out.strip().splitlines() or [''])[-1]
    C['compose.profiles'] = {'services_after_up': names, 'job_rc': job.rc}
    cc('down', '-v', f='compose.profiles.yaml', proj='dkc-prof')


# ------------------------------------------------------------------ 7. jobs that run for a while
@section
def jobs():
    C, T, X = R['counts'], R['tables'], R['text']
    p = loader_image()
    exits = []
    for label, cmd in (('exit 0', 'exit 0'), ('exit 3', 'exit 3'), ('a command that does not exist', 'no-such-command'), ('a file that is not executable', '/etc/passwd')):
        o = dk('run', '--rm', '--label', LABEL, 'alpine:3.22', 'sh', '-c', cmd, check=False)
        exits.append([label, o.rc])
    dk('run', '-d', '--label', LABEL, '--name', 'dkc-kill', 'alpine:3.22', 'sleep', '60')
    dk('kill', 'dkc-kill')
    exits.append(['docker kill (SIGKILL)', int(dk('inspect', 'dkc-kill', '--format', '{{.State.ExitCode}}').out)])
    dk('rm', '-f', 'dkc-kill')
    T['jobs.exit'] = table(['what the command does', 'exit code of docker run'], exits)
    # memory
    rows = []
    for limit, mb in (('64m', 32), ('64m', 200), ('512m', 200)):
        name = 'dkc-mem'
        o = dk('run', '--name', name, '--label', LABEL, '-m', limit, 'python:3.13-slim', 'python', '-c', 'x = bytearray(%d * 1024 * 1024); print("allocated", len(x) // 1048576, "MB")' % mb, check=False)
        st = dk('inspect', name, '--format', '{{.State.ExitCode}} {{.State.OOMKilled}}').out.split()
        rows.append([limit, '%d MB' % mb, int(st[0]), st[1] == 'true', o.out.strip()])
        dk('rm', '-f', name)
    T['jobs.oom'] = table(['memory limit', 'job allocates', 'exit code', 'OOMKilled', 'what the job printed'], rows)
    lim = dk('run', '--rm', '--label', LABEL, '-m', '64m', 'alpine:3.22', 'sh', '-c', 'cat /sys/fs/cgroup/memory/memory.limit_in_bytes 2>/dev/null || cat /sys/fs/cgroup/memory.max').out.strip()
    C['jobs.limit_seen'] = {'inside': int(lim) if lim.isdigit() else lim}
    # cpus: the limit is not what the program sees
    cpus = lambda *a: dk('run', '--rm', '--label', LABEL, *a, 'python:3.13-slim', 'python', '-c', 'import os; print(os.cpu_count(), os.process_cpu_count())').out.split()
    c0, c1, c2 = cpus(), cpus('--cpus', '0.5'), cpus('--cpuset-cpus', '0')
    C['jobs.cpus'] = {'no_limit': {'cpu_count': int(c0[0]), 'process_cpu_count': int(c0[1])}, 'cpus_0_5': {'cpu_count': int(c1[0]), 'process_cpu_count': int(c1[1])}, 'cpuset_0': {'cpu_count': int(c2[0]), 'process_cpu_count': int(c2[1])}}
    # signals
    rows = []
    cases = [
        ('exec form, no handler', [], ['python', 'worker.py'], {}),
        ('exec form, handles SIGTERM', [], ['python', 'worker.py'], {'HANDLE_TERM': '1'}),
        ('shell form (sh -c), handles SIGTERM', [], ['sh', '-c', 'python worker.py'], {'HANDLE_TERM': '1'}),
        ('shell form with exec, handles SIGTERM', [], ['sh', '-c', 'exec python worker.py'], {'HANDLE_TERM': '1'}),
        ('exec form, no handler, docker run --init', ['--init'], ['python', 'worker.py'], {}),
    ]
    for label, flags, cmd, env in cases:
        name = 'dkc-sig'
        e = sum([['-e', '%s=%s' % kv] for kv in env.items()], [])
        dk('run', '-d', '--label', LABEL, '--name', name, *flags, *e, 'dkc/loader:1', *cmd)
        for _ in range(40):
            if 'worker started' in dk('logs', name).all:
                break
            time.sleep(0.25)
        t = time.time()
        dk('stop', '-t', '3', name)
        took = time.time() - t
        st = int(dk('inspect', name, '--format', '{{.State.ExitCode}}').out)
        lg = dk('logs', name).all
        pid = re.search(r'started as process (\d+)', lg)
        rows.append([label, int(pid.group(1)) if pid else -1, 'yes' if took >= 2.5 else 'no', st, 'yes' if 'got SIGTERM' in lg else 'no'])
        dk('rm', '-f', name)
    T['jobs.signals'] = table(['how the job starts', 'process id of the job', 'stop waited for the 3 second grace period', 'exit code', 'the handler ran'], rows)
    # restart policies
    rows = []
    for pol in ('no', 'on-failure:3'):
        name = 'dkc-rs'
        dk('run', '-d', '--label', LABEL, '--name', name, '--restart', pol, 'alpine:3.22', 'sh', '-c', 'echo run; exit 1')
        time.sleep(4)
        st = dk('inspect', name, '--format', '{{.RestartCount}} {{.State.Status}} {{.State.ExitCode}}').out.split()
        runs = dk('logs', name).out.count('run')
        rows.append([pol, int(st[0]), runs, st[1], int(st[2])])
        dk('rm', '-f', name)
    T['jobs.restart'] = table(['--restart', 'RestartCount', 'times the job ran', 'final state', 'exit code'], rows)
    # logs
    name = 'dkc-log'
    dk('run', '-d', '--label', LABEL, '--name', name, '--log-opt', 'max-size=20k', '--log-opt', 'max-file=2', 'alpine:3.22', 'sh', '-c', 'i=0; while [ $i -lt 3000 ]; do echo "line $i of the job log"; i=$((i+1)); done')
    dk('wait', name)
    kept = len(dk('logs', name).out.splitlines())
    drv = dk('inspect', name, '--format', '{{.HostConfig.LogConfig.Type}} {{json .HostConfig.LogConfig.Config}}').out.strip()
    dk('rm', '-f', name)
    dk('run', '--label', LABEL, '--name', name, 'alpine:3.22', 'sh', '-c', 'i=0; while [ $i -lt 3000 ]; do echo "line $i of the job log"; i=$((i+1)); done')
    all_lines = len(dk('logs', name).out.splitlines())
    dk('rm', '-f', name)
    C['jobs.logs'] = {'printed': 3000, 'kept_with_rotation': kept, 'kept_without_rotation': all_lines, 'driver_and_options': drv}
    # time zone
    tz = lambda *a: dk('run', '--rm', '--label', LABEL, *a, 'python:3.13-slim', 'date', '+%Z %z').out.strip()
    C['jobs.tz'] = {'default': tz(), 'with_TZ': tz('-e', 'TZ=Asia/Kolkata'), 'host': sh(['date', '+%Z %z']).out.strip()}
    # entrypoint and cmd
    build('dkc/entry:1', p / 'app', 'Dockerfile.entry')
    rows = []
    for label, args in (('docker run IMAGE', []), ('docker run IMAGE other words', ['other words']), ('docker run --entrypoint echo IMAGE', None)):
        if args is None:
            o = dk('run', '--rm', '--label', LABEL, '--entrypoint', 'echo', 'dkc/entry:1', 'replaced')
        else:
            o = dk('run', '--rm', '--label', LABEL, 'dkc/entry:1', *args)
        rows.append([label if args is not None else 'docker run --entrypoint echo IMAGE replaced', o.out.strip()])
    T['jobs.entry'] = table(['command', 'what it prints'], rows)


# ------------------------------------------------------------------ 8. registries
@section
def registry():
    C, T, X = R['counts'], R['tables'], R['text']
    p = workdir()
    app = p / 'app'
    dk('run', '-d', '--label', LABEL, '--name', 'dkc-registry', '-p', '127.0.0.1:5000:5000', 'registry:2')
    cu = lambda *a: sh(['curl', '-sS', '--noproxy', '*', '-m', '10'] + list(a), check=False).out.strip()
    for _ in range(40):
        if cu('http://127.0.0.1:5000/v2/') == '{}':
            break
        time.sleep(0.25)
    repo = 'localhost:5000/brewline/loader'
    digest = lambda ref: re.search(r'Digest:\s+(sha256:[0-9a-f]+)', dk('buildx', 'imagetools', 'inspect', ref).out).group(1)
    label = lambda ref: dk('image', 'inspect', ref, '--format', '{{index .Config.Labels "build"}}').out.strip()
    # build 1, pushed under two tags
    dk('build', '-q', '-t', repo + ':1.0', '--build-arg', 'BUILD=1', '-f', str(app / 'Dockerfile.registry'), str(app))
    dk('tag', repo + ':1.0', repo + ':latest')
    dk('push', '-q', repo + ':1.0')
    push = dk('push', repo + ':latest')
    X['registry.push'] = re.sub(r'^[0-9a-f]{12}:', '<layer>:', re.sub(r'sha256:[0-9a-f]{64}', 'sha256:<digest>', push.all.strip()), flags=re.M)
    X['registry.catalog'] = cu('http://127.0.0.1:5000/v2/_catalog')
    X['registry.tags_1'] = cu('http://127.0.0.1:5000/v2/brewline/loader/tags/list')
    d10, dl1 = digest(repo + ':1.0'), digest(repo + ':latest')
    # machine A pulls latest
    dk('rmi', '-f', repo + ':1.0', repo + ':latest')
    dk('pull', '-q', repo + ':latest')
    local = lambda ref: dk('image', 'inspect', ref, '--format', '{{index .RepoDigests 0}}').out.strip().split('@')[1]
    local1 = local(repo + ':latest')
    # build 2 is pushed as 1.1, and a release script then moves the tag latest to it in the registry. The local tag latest does not move.
    dk('build', '-q', '-t', repo + ':1.1', '--build-arg', 'BUILD=2', '-f', str(app / 'Dockerfile.registry'), str(app))
    dk('push', '-q', repo + ':1.1')
    dk('buildx', 'imagetools', 'create', '-t', repo + ':latest', repo + ':1.1')
    reg2 = digest(repo + ':latest')
    ran_before_pull = dk('run', '--rm', repo + ':latest').out.strip()
    dk('pull', '-q', repo + ':latest')
    ran_after_pull = dk('run', '--rm', repo + ':latest').out.strip()
    local2 = local(repo + ':latest')
    old = dk('run', '--rm', repo + '@' + d10).out.strip()
    def s(d):
        return d[7:19]
    T['registry.tags'] = table(['tag', 'digest (first 12)', 'what it runs'], [['1.0 (never moved)', s(digest(repo + ':1.0')), old], ['1.1', s(digest(repo + ':1.1')), 'this is build 2'], ['latest (moved by the second push)', s(reg2), 'this is build 2']])
    T['registry.steps'] = table(['step', 'latest in the registry', 'latest on this machine', 'what docker run prints'], [
        ['build 1 is pushed as 1.0 and latest, and pulled here', s(dl1), s(local1), 'this is build 1'],
        ['build 2 is pushed as latest and 1.1', s(reg2), s(local1), ran_before_pull],
        ['docker pull', s(reg2), s(local2), ran_after_pull]])
    C['registry.facts'] = {'same_digest_1_0_and_latest_before': d10 == dl1, 'latest_moved': reg2 != dl1, 'tag_1_0_unchanged': digest(repo + ':1.0') == d10, 'local_stale_until_pull': local1 == dl1 and ran_before_pull == 'this is build 1',
                           'run_by_digest': old, 'ran_after_pull': ran_after_pull}
    X['registry.tags_2'] = cu('http://127.0.0.1:5000/v2/brewline/loader/tags/list')
    # save and load, for a machine with no registry
    tar = pathlib.Path(tempfile.mkdtemp(prefix='dkc-save-')) / 'loader.tar'
    dk('save', '-o', str(tar), repo + ':1.1')
    members = sh(['tar', '-tf', str(tar)]).out.split()
    dk('rmi', '-f', repo + ':1.1', repo + ':latest', repo + ':1.0', check=False)
    dk('load', '-q', '-i', str(tar))
    C['registry.save'] = {'tar_bytes': tar.stat().st_size, 'members': len(members), 'has_index_json': 'index.json' in members, 'runs_after_load': dk('run', '--rm', repo + ':1.1').out.strip()}
    shutil.rmtree(tar.parent, ignore_errors=True)
    # platforms of an image on Docker Hub
    out = dk('buildx', 'imagetools', 'inspect', 'python:3.13-slim').out
    plats = sorted(set(re.findall(r'Platform:\s+(\S+)', out)) - {'unknown/unknown'})
    C['registry.platforms'] = {'image': 'python:3.13-slim', 'platforms': plats, 'attestations': 'unknown/unknown' in out.replace('Platform:    ', 'Platform:').split() or 'attestation-manifest' in out}
    dk('rm', '-f', 'dkc-registry')


# ------------------------------------------------------------------ 9. security
@section
def security():
    C, T, X = R['counts'], R['tables'], R['text']
    p = loader_image()
    app = p / 'app'
    build('dkc/nonroot:1', app, 'Dockerfile.nonroot')
    C['sec.user'] = {'default_image': dk('run', '--rm', '--label', LABEL, 'dkc/loader:1', 'id').out.strip(), 'nonroot_image': dk('run', '--rm', '--label', LABEL, 'dkc/nonroot:1', 'id').out.strip()}
    w = dk('run', '--rm', '--label', LABEL, 'dkc/nonroot:1', 'sh', '-c', 'touch /usr/local/x', check=False)
    X['sec.nonroot_write'] = (w.err.strip().splitlines() or [''])[-1]
    C['sec.root_write'] = {'rc': dk('run', '--rm', '--label', LABEL, 'dkc/loader:1', 'sh', '-c', 'touch /usr/local/x', check=False).rc}
    ro = dk('run', '--rm', '--label', LABEL, '--read-only', 'alpine:3.22', 'sh', '-c', 'echo x > /tmp/a', check=False)
    X['sec.readonly'] = (ro.err.strip().splitlines() or [''])[-1]
    rt = dk('run', '--rm', '--label', LABEL, '--read-only', '--tmpfs', '/tmp', 'alpine:3.22', 'sh', '-c', 'echo x > /tmp/a && echo written', check=False)
    C['sec.readonly'] = {'rc_without_tmpfs': ro.rc, 'rc_with_tmpfs': rt.rc, 'with_tmpfs_output': rt.out.strip()}
    cap = lambda *a: dk('run', '--rm', '--label', LABEL, *a, 'alpine:3.22', 'sh', '-c', "grep CapEff /proc/1/status | cut -f2").out.strip()
    bits = lambda h: bin(int(h, 16)).count('1')
    d, n = cap(), cap('--cap-drop', 'ALL')
    pv = cap('--privileged')
    C['sec.caps'] = {'default_hex': d, 'default_count': bits(d), 'dropped_hex': n, 'dropped_count': bits(n), 'privileged_hex': pv, 'privileged_count': bits(pv)}
    chown = lambda *a: dk('run', '--rm', '--label', LABEL, *a, 'alpine:3.22', 'sh', '-c', 'touch /f && chown 1234 /f && echo chown worked', check=False)
    c1, c2 = chown(), chown('--cap-drop', 'ALL')
    C['sec.chown'] = {'default_rc': c1.rc, 'cap_drop_all_rc': c2.rc, 'cap_drop_all_error': (c2.err.strip().splitlines() or [''])[-1]}
    # secrets that end up in an image
    tok = 'brewline-demo-token-4711'
    build('dkc/leaky:1', app, 'Dockerfile.leaky', extra=['--build-arg', 'API_TOKEN=' + tok], cache=False)
    h = dk('history', '--no-trunc', '--format', '{{.CreatedBy}}', 'dkc/leaky:1').out
    X['sec.history_leak'] = '\n'.join(re.sub(r'\s+', ' ', l).replace('# buildkit', '').strip() for l in h.splitlines() if 'TOKEN' in l or 'token' in l)
    inspect_env = dk('inspect', 'dkc/leaky:1', '--format', '{{json .Config.Env}}').out
    C['sec.leak'] = {'env_in_inspect': tok in inspect_env, 'arg_in_history': 'API_TOKEN=' + tok in h, 'env_in_history': 'PARTNER_TOKEN=' + tok in h}
    sec = pathlib.Path(tempfile.mkdtemp(prefix='dkc-sec-')) / 'partner_token'
    sec.write_text(tok)
    build('dkc/secret:1', app, 'Dockerfile.secretmount', extra=['--secret', 'id=partner_token,src=%s' % sec], cache=False)
    h2 = dk('history', '--no-trunc', '--format', '{{.CreatedBy}}', 'dkc/secret:1').out
    note = dk('run', '--rm', '--label', LABEL, 'dkc/secret:1', 'cat', '/tmp/note.txt').out.strip()
    fs = dk('run', '--rm', '--label', LABEL, 'dkc/secret:1', 'sh', '-c', 'grep -rl brewline-demo-token /bin /etc /home /lib /opt /root /sbin /srv /tmp /usr /var 2>/dev/null | head -3; echo end').out.strip()
    C['sec.secretmount'] = {'token_in_history': tok in h2, 'note': note, 'files_that_contain_the_token': fs.replace('\nend', '').replace('end', '').strip().splitlines()}
    shutil.rmtree(sec.parent, ignore_errors=True)
    # an environment variable given at run time is visible to whoever can inspect the container
    dk('run', '-d', '--label', LABEL, '--name', 'dkc-env', '-e', 'DB_PASSWORD=brewline-dev', 'alpine:3.22', 'sleep', '60')
    C['sec.run_env'] = {'visible_in_inspect': 'DB_PASSWORD=brewline-dev' in dk('inspect', 'dkc-env', '--format', '{{json .Config.Env}}').out}
    dk('rm', '-f', 'dkc-env')
    # .env and the build context
    p2 = workdir()
    a2 = p2 / 'app'
    (a2 / '.env').write_text('DATABASE_URL=postgresql://postgres:brewline-prod-secret@db/brewline\n')
    (a2 / '.dockerignore').rename(a2 / '.dockerignore.off')
    build('dkc/envleak:1', a2, 'Dockerfile.copy_first', cache=False)
    leaked = dk('run', '--rm', '--label', LABEL, 'dkc/envleak:1', 'cat', '/app/.env', check=False)
    (a2 / '.dockerignore.off').rename(a2 / '.dockerignore')
    build('dkc/envleak:2', a2, 'Dockerfile.copy_first', cache=False)
    kept = dk('run', '--rm', '--label', LABEL, 'dkc/envleak:2', 'cat', '/app/.env', check=False)
    C['sec.dotenv'] = {'without_ignore_rc': leaked.rc, 'without_ignore_content': leaked.out.strip(), 'with_ignore_rc': kept.rc, 'with_ignore_error': (kept.err.strip().splitlines() or [''])[-1]}
    # the Docker socket
    dk('run', '-d', '--label', LABEL, '--name', 'dkc-victim', 'alpine:3.22', 'sleep', '60')
    pull('docker:cli')
    ps = dk('run', '--rm', '--label', LABEL, '-v', '/var/run/docker.sock:/var/run/docker.sock', 'docker:cli', 'docker', 'ps', '--format', '{{.Names}}', '--filter', 'name=dkc-victim', check=False)
    host_name = open('/etc/hostname').read().strip()
    root_fs = dk('run', '--rm', '--label', LABEL, '-v', '/etc:/host-etc:ro', 'alpine:3.22', 'cat', '/host-etc/hostname').out.strip()
    C['sec.socket'] = {'container_sees_host_container': ps.out.strip() == 'dkc-victim', 'reads_host_file': root_fs == host_name, 'image': 'docker:cli'}
    dk('rm', '-f', 'dkc-victim')
    # pin by digest
    dig = dk('image', 'inspect', 'python:3.13-slim', '--format', '{{index .RepoDigests 0}}').out.strip()
    C['sec.pin'] = {'reference': dig.split('@')[0], 'digest_prefix': dig.split('@')[1][:19]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=str(ROOT / 'js' / 'real.js'))
    ap.add_argument('--only', default='')
    a = ap.parse_args()
    only = set(filter(None, a.only.split(',')))
    clean_all()
    try:
        for fn in SECTIONS:
            if only and fn.__name__ not in only:
                continue
            t = time.time()
            fn()
            print('%-12s %5.1fs' % (fn.__name__, time.time() - t), flush=True)
    finally:
        clean_all()
        if WORK and WORK.exists():
            shutil.rmtree(WORK, ignore_errors=True)
    p = write_real(a.out)
    print('wrote %s: %d files, %d texts, %d tables, %d sets of counts' % (p, len(R['files']), len(R['text']), len(R['tables']), len(R['counts'])))


if __name__ == '__main__':
    main()
