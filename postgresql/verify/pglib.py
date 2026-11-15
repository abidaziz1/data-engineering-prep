"""Helpers for the recorder of the PostgreSQL course: throwaway PostgreSQL 16 servers on 127.0.0.1, run as the postgres user, with every path, port,
process id, time, transaction id and log position replaced before it is written, and js/real.js written at the end.
Everything the recorder makes lives in one temporary folder that is removed at the end. No setting of the machine is read or changed."""
import glob
import json
import os
import pathlib
import re
import shutil
import socket
import subprocess
import tempfile
import time

import psycopg

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
R = {'meta': {}, 'files': {}, 'text': {}, 'tables': {}, 'counts': {}}
BASE = tempfile.mkdtemp(prefix='pg-course-', dir='/var/tmp')
ROOT_USER = os.geteuid() == 0
if ROOT_USER:
    subprocess.check_call(['chown', 'postgres:postgres', BASE])
    os.chmod(BASE, 0o755)
BIN = sorted(glob.glob('/usr/lib/postgresql/*/bin'), key=lambda p: int(p.split('/')[-2]) if p.split('/')[-2].isdigit() else 0)[-1]
SERVERS = []


def as_pg(args):
    return (['runuser', '-u', 'postgres', '--'] if ROOT_USER else []) + [str(a) for a in args]


def run(args, check=True, input=None, timeout=300):
    p = subprocess.run(as_pg(args), capture_output=True, text=True, input=input, timeout=timeout)
    if check and p.returncode:
        raise RuntimeError('%s failed (%d): %s' % (' '.join(map(str, args)), p.returncode, (p.stdout + p.stderr)[-800:]))
    return p


def free_port():
    s = socket.socket()
    s.bind(('127.0.0.1', 0))
    p = s.getsockname()[1]
    s.close()
    return p


def newdir(name):
    d = pathlib.Path(BASE) / name
    d.mkdir(parents=True, exist_ok=True)
    if ROOT_USER:
        subprocess.check_call(['chown', 'postgres:postgres', str(d)])
    return d


class Srv:
    """One server. conf is a dict of settings that are written to postgresql.conf before the first start."""

    def __init__(self, name, conf=None, checksums=False, initdb=True):
        self.name = name
        self.dir = newdir(name)
        self.data = self.dir / 'data'
        self.port = free_port()
        self.conf = dict(conf or {})
        self.checksums = checksums
        SERVERS.append(self)
        if initdb:
            self.initdb()

    @classmethod
    def basebackup(cls, name, primary, conf=None):
        """A standby made with pg_basebackup -R from a running primary."""
        s = cls(name, conf=conf, initdb=False)
        run([BIN + '/pg_basebackup', '-h', '127.0.0.1', '-p', primary.port, '-U', 'postgres', '-D', s.data, '-R', '-X', 'stream', '-c', 'fast'])
        base = {'listen_addresses': "'127.0.0.1'", 'port': s.port, 'unix_socket_directories': "'%s'" % s.dir}
        base.update(s.conf)
        with open(s.data / 'postgresql.auto.conf', 'a') as f:
            f.write('\n# course settings\n' + ''.join('%s = %s\n' % (k, v) for k, v in base.items()))
        return s

    def initdb(self):
        a = [BIN + '/initdb', '-D', self.data, '-A', 'trust', '-E', 'UTF8', '--locale=C.UTF-8']
        if self.checksums:
            a.append('--data-checksums')
        run(a)
        self.configure(self.conf)

    def configure(self, conf):
        self.conf.update(conf)
        lines = ['\n# course settings\n']
        base = {'listen_addresses': "'127.0.0.1'", 'port': self.port, 'unix_socket_directories': "'%s'" % self.dir, 'max_connections': 100, 'jit': 'off', 'max_parallel_workers_per_gather': 0, 'default_statistics_target': 10000, 'log_line_prefix': "'%m [%p] '"}
        base.update({k: v for k, v in self.conf.items()})
        text = ''.join('%s = %s\n' % (k, v) for k, v in base.items())
        # write as the postgres user: the folder belongs to it
        tmp = self.dir / 'course.conf'
        tmp.write_text(text)
        if ROOT_USER:
            subprocess.check_call(['chown', 'postgres:postgres', str(tmp)])
        run(['sh', '-c', 'cp %s %s/postgresql.auto.conf' % (tmp, self.data)])

    def start(self, wait=True):
        run([BIN + '/pg_ctl', '-D', self.data, '-l', self.dir / 'log', '-w' if wait else '-W', 'start'])
        return self

    def stop(self, mode='fast'):
        run([BIN + '/pg_ctl', '-D', self.data, '-m', mode, '-w', 'stop'], check=False)

    def restart(self, mode='fast'):
        self.stop(mode)
        return self.start()

    def reload(self):
        run([BIN + '/pg_ctl', '-D', self.data, 'reload'])

    def pid(self):
        return int((self.data / 'postmaster.pid').read_text().split('\n')[0])

    def kill9(self):
        """Kill the postmaster and every process under it with signal 9, as if the machine had stopped."""
        pm = self.pid()
        kids = [int(x) for x in subprocess.run(['pgrep', '-P', str(pm)], capture_output=True, text=True).stdout.split()]
        for k in kids + [pm]:
            try:
                os.kill(k, 9)
            except ProcessLookupError:
                pass
        wait_for(lambda: not any(os.path.exists('/proc/%d' % k) for k in kids + [pm]), timeout=10, step=0.1)
        time.sleep(0.3)

    def dsn(self, db='postgres', user='postgres'):
        return 'host=127.0.0.1 port=%d dbname=%s user=%s' % (self.port, db, user)

    def conn(self, db='postgres', user='postgres', autocommit=True, **kw):
        return psycopg.connect(self.dsn(db, user), autocommit=autocommit, **kw)

    def sql(self, q, params=None, db='postgres', user='postgres'):
        with self.conn(db, user) as c:
            cur = c.execute(q, params)
            return cur.fetchall() if cur.description else cur.statusmessage

    def one(self, q, params=None, db='postgres', user='postgres'):
        r = self.sql(q, params, db, user)
        return r[0][0]

    def log(self):
        p = self.dir / 'log'
        return p.read_text() if p.exists() else ''

    def log_since(self, pos):
        return self.log()[pos:]

    def cmd(self, *args, check=True, input=None):
        return run([BIN + '/' + args[0]] + list(args[1:]), check=check, input=input)

    def psql_bin(self, sql, db='postgres', user='postgres', check=False):
        return run([BIN + '/psql', '-h', '127.0.0.1', '-p', self.port, '-U', user, '-d', db, '-X', '-v', 'ON_ERROR_STOP=0', '-c', sql], check=check)


def stop_all():
    for s in SERVERS:
        try:
            s.stop('immediate')
        except Exception:      # noqa: BLE001
            pass
    for s in SERVERS:
        for p in ('postmaster.pid',):
            pass


def cleanup():
    stop_all()
    shutil.rmtree(BASE, ignore_errors=True)


# ------------------------------------------------------------------ masks
def mask(s):
    s = s.replace(BASE, '~')
    s = re.sub(r'/var/tmp/pg-course-\w+', '~', s)
    s = re.sub(r'\b20\d\d-\d\d-\d\d \d\d:\d\d:\d\d\.\d+ [A-Z]{3,4}\b', '<time>', s)
    s = re.sub(r'(?<=up at )20\d\d-\d\d-\d\d \d\d:\d\d:\d\d( [A-Z]{3,4})?', '<time>', s)
    s = re.sub(r'\[\d+\]', '[pid]', s)
    s = re.sub(r'\b0/[0-9A-F]{6,8}\b', '0/<lsn>', s)
    s = re.sub(r'port=\d{4,5}', 'port=<port>', s)
    s = re.sub(r'127\.0\.0\.1\(\d+\)', '127.0.0.1(<port>)', s)
    s = re.sub(r'\bport \d{4,5}\b', 'port <port>', s)
    return '\n'.join(l.rstrip() for l in s.split('\n'))


def T(key, s):
    R['text'][key] = mask(s).strip('\n')
    return R['text'][key]


def table(cols, rows):
    return {'cols': cols, 'rows': rows}


def write_real(path):
    path = pathlib.Path(path)
    path.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(R, indent=1, sort_keys=True, ensure_ascii=False, default=str) + ';\n')
    return path


def plan_text(srv, sql, opts='ANALYZE, TIMING OFF, SUMMARY OFF', db='postgres'):
    rows = srv.sql('EXPLAIN (%s) %s' % (opts, sql), db=db)
    return '\n'.join(r[0] for r in rows)


def mb(x):
    return round(x / 1048576.0, 1)


def wait_for(fn, timeout=30, step=0.2):
    t0 = time.time()
    while time.time() - t0 < timeout:
        v = fn()
        if v:
            return v
        time.sleep(step)
    return None
