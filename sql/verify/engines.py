"""Engine adapters for the SQL tutorial: DuckDB, PostgreSQL and SQLite behind one small interface, a statement splitter, a
formatter that turns a result into the text of a table cell, and a PostgreSQL server that starts for the run and stops after it.

Nothing here talks to a service on a network. PostgreSQL runs on 127.0.0.1 in a temporary directory.
"""
import datetime
import decimal
import glob
import os
import pathlib
import re
import shutil
import socket
import sqlite3
import subprocess
import tempfile
import time

import duckdb
import psycopg

ENGINES = ('duckdb', 'postgres', 'sqlite')


# ---------------------------------------------------------------------------------------------------------------- formatting
def fmt(v):
    """The text of one cell. NULL is the string NULL, which the page draws in grey."""
    if v is None:
        return 'NULL'
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, datetime.datetime):
        s = v.strftime('%Y-%m-%d %H:%M:%S')
        if v.microsecond:
            s += ('.%06d' % v.microsecond).rstrip('0')
        if v.tzinfo is not None:
            off = v.utcoffset()
            mins = int(off.total_seconds() // 60)
            s += '%+03d' % (mins // 60) + (':%02d' % abs(mins % 60) if mins % 60 else '')
        return s
    if isinstance(v, datetime.date):
        return v.isoformat()
    if isinstance(v, datetime.timedelta):
        days, secs = v.days, v.seconds
        hms = '%02d:%02d:%02d' % (secs // 3600, secs % 3600 // 60, secs % 60)
        return ('%d day%s %s' % (days, '' if abs(days) == 1 else 's', hms)) if days else hms
    if isinstance(v, decimal.Decimal):
        return format(v, 'f')
    if isinstance(v, float):
        return repr(v)
    if isinstance(v, (list, tuple)):
        return '[' + ', '.join(fmt(x) for x in v) + ']'
    if isinstance(v, dict):
        return '{' + ', '.join('%s: %s' % (k, fmt(x)) for k, x in v.items()) + '}'
    if isinstance(v, (bytes, memoryview)):
        return '\\x' + bytes(v).hex()
    return str(v)


# ---------------------------------------------------------------------------------------------------------------- splitting
def split_statements(sql):
    """Split a script at semicolons that are outside quotes and comments. Dollar quoting is understood."""
    out, buf, i, n = [], [], 0, len(sql)
    while i < n:
        c = sql[i]
        if c == "'" or c == '"':
            j = i + 1
            while j < n:
                if sql[j] == c:
                    if j + 1 < n and sql[j + 1] == c:
                        j += 2
                        continue
                    break
                j += 1
            buf.append(sql[i:j + 1]); i = j + 1
        elif c == '-' and sql.startswith('--', i):
            j = sql.find('\n', i)
            j = n if j < 0 else j
            buf.append(sql[i:j]); i = j
        elif c == '/' and sql.startswith('/*', i):
            j = sql.find('*/', i + 2)
            j = n if j < 0 else j + 2
            buf.append(sql[i:j]); i = j
        elif c == '$' and re.match(r'\$[A-Za-z_]*\$', sql[i:]):
            tag = re.match(r'\$[A-Za-z_]*\$', sql[i:]).group(0)
            j = sql.find(tag, i + len(tag))
            j = n if j < 0 else j + len(tag)
            buf.append(sql[i:j]); i = j
        elif c == ';':
            s = ''.join(buf).strip()
            if s and not all(l.strip().startswith('--') or not l.strip() for l in s.split('\n')):
                out.append(s)
            buf = []; i += 1
        else:
            buf.append(c); i += 1
    s = ''.join(buf).strip()
    if s and not all(l.strip().startswith('--') or not l.strip() for l in s.split('\n')):
        out.append(s)
    return out


# ---------------------------------------------------------------------------------------------------------------- adapters
class Result:
    def __init__(self, cols, rows, status=''):
        self.cols, self.rows, self.status = cols, rows, status


class DuckEngine:
    name = 'duckdb'

    def __init__(self, path=':memory:'):
        self.con = duckdb.connect(path)
        self.con.execute("SET TimeZone = 'UTC'")
        self.con.execute('SET threads = 1')
        self.version = duckdb.__version__

    def run(self, sql):
        cur = self.con.execute(sql)
        if cur.description:
            return Result([d[0] for d in cur.description], cur.fetchall())
        return Result(None, None)

    def begin(self): self.con.execute('BEGIN TRANSACTION')
    def rollback(self): self.con.execute('ROLLBACK')
    def close(self): self.con.close()


class SqliteEngine:
    name = 'sqlite'

    def __init__(self, path=':memory:'):
        self.con = sqlite3.connect(path, isolation_level=None)
        self.version = sqlite3.sqlite_version

    def run(self, sql):
        cur = self.con.execute(sql)
        if cur.description:
            return Result([d[0] for d in cur.description], cur.fetchall())
        return Result(None, None)

    def begin(self): self.con.execute('BEGIN')
    def rollback(self): self.con.execute('ROLLBACK')
    def close(self): self.con.close()


class PgEngine:
    name = 'postgres'

    def __init__(self, dsn):
        self.con = psycopg.connect(dsn, autocommit=True)
        self.con.execute("SET TIME ZONE 'UTC'")
        self.con.execute('SET max_parallel_workers_per_gather = 0')
        self.con.execute('SET jit = off')
        self.version = self.con.execute("SELECT current_setting('server_version')").fetchone()[0].split(' ')[0]

    def run(self, sql):
        cur = self.con.execute(sql)
        if cur.description:
            return Result([d.name for d in cur.description], cur.fetchall())
        return Result(None, None, cur.statusmessage or '')

    def begin(self): self.con.execute('BEGIN')
    def rollback(self): self.con.execute('ROLLBACK')
    def close(self): self.con.close()


def error_text(e):
    """The first line of an engine error, the part that a person reads."""
    s = str(e).strip().split('\n')[0]
    return s


# ---------------------------------------------------------------------------------------------------------------- PostgreSQL server
class PgServer:
    """A throw-away PostgreSQL server on 127.0.0.1. PostgreSQL refuses to run as root, so when this script runs as root the
    server runs as the postgres user in a directory that user can reach. SQ_PG_DSN points at an existing server instead."""

    def __init__(self):
        self.dir = None
        self.port = None
        self.root = os.geteuid() == 0
        self.external = os.environ.get('SQ_PG_DSN')
        self.bindir = None

    def find_bindir(self):
        cands = sorted(glob.glob('/usr/lib/postgresql/*/bin'), key=lambda p: int(p.split('/')[-2]) if p.split('/')[-2].isdigit() else 0, reverse=True)
        for c in cands:
            if os.path.exists(c + '/initdb'):
                return c
        w = shutil.which('initdb')
        if w:
            return os.path.dirname(w)
        raise RuntimeError('PostgreSQL server programs (initdb, pg_ctl) were not found. Install postgresql, or set SQ_PG_DSN to a running server.')

    def _cmd(self, args):
        if self.root:
            return ['runuser', '-u', 'postgres', '--'] + args
        return args

    def start(self):
        if self.external:
            return self.external
        self.bindir = self.find_bindir()
        base = '/var/tmp' if self.root else None
        self.dir = tempfile.mkdtemp(prefix='sq-pg-', dir=base)
        if self.root:
            subprocess.check_call(['chown', 'postgres:postgres', self.dir])
            os.chmod(self.dir, 0o755)
        s = socket.socket(); s.bind(('127.0.0.1', 0)); self.port = s.getsockname()[1]; s.close()
        data = self.dir + '/data'
        subprocess.check_call(self._cmd([self.bindir + '/initdb', '-D', data, '-A', 'trust', '-E', 'UTF8', '--locale=C.UTF-8']), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        opts = '-p %d -k %s -c listen_addresses=127.0.0.1 -c fsync=off -c synchronous_commit=off -c max_connections=60' % (self.port, self.dir)
        subprocess.check_call(self._cmd([self.bindir + '/pg_ctl', '-D', data, '-o', opts, '-l', self.dir + '/log', '-w', 'start']), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return 'host=127.0.0.1 port=%d user=postgres dbname=postgres' % self.port

    def stop(self):
        if self.external or not self.dir:
            return
        try:
            subprocess.call(self._cmd([self.bindir + '/pg_ctl', '-D', self.dir + '/data', '-m', 'immediate', 'stop']), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        finally:
            shutil.rmtree(self.dir, ignore_errors=True)
