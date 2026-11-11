"""A PostgreSQL 16 server on this machine for the change data capture mission. Logical decoding needs wal_level=logical; everything else is the default."""
import os
import pathlib
import shutil
import subprocess
import tempfile
import time

BIN = pathlib.Path('/usr/lib/postgresql/16/bin')


class Pg:
    def __init__(self, port=15432):
        self.port = port
        self.dir = pathlib.Path(tempfile.mkdtemp(prefix='pg-capture-'))
        os.chmod(self.dir, 0o755)
        shutil.chown(self.dir, 'postgres', 'postgres')
        self.data = self.dir / 'data'

    def as_postgres(self, *cmd, **kw):
        return subprocess.run(['runuser', '-u', 'postgres', '--'] + [str(c) for c in cmd], capture_output=True, text=True, **kw)

    def start(self):
        r = self.as_postgres(BIN / 'initdb', '-D', self.data, '--auth=trust', '-U', 'postgres', '--encoding=UTF8', '--locale=C.UTF-8')
        if r.returncode:
            raise RuntimeError(r.stdout + r.stderr)
        opts = ('-p %d -c listen_addresses=localhost -c unix_socket_directories=%s -c wal_level=logical -c max_replication_slots=4 -c max_wal_senders=4 '
                '-c shared_buffers=64MB -c max_wal_size=256MB -c min_wal_size=80MB' % (self.port, self.dir))
        r = self.as_postgres(BIN / 'pg_ctl', '-D', self.data, '-o', opts, '-l', self.dir / 'pg.log', '-w', 'start')
        if r.returncode:
            raise RuntimeError(r.stdout + r.stderr + (self.dir / 'pg.log').read_text())
        self.psql('CREATE DATABASE brewline;', db='postgres')
        return self

    def psql(self, sql, db='brewline', tuples=True):
        args = [str(BIN / 'psql'), '-h', 'localhost', '-p', str(self.port), '-U', 'postgres', '-d', db, '-v', 'ON_ERROR_STOP=1']
        if tuples:
            args += ['-At', '-F', '|']
        r = subprocess.run(args + ['-c', sql], capture_output=True, text=True)
        if r.returncode:
            raise RuntimeError('psql failed: %s\n%s' % (sql, r.stderr))
        return r.stdout.strip()

    def stop(self):
        self.as_postgres(BIN / 'pg_ctl', '-D', self.data, '-m', 'fast', '-w', 'stop')
        shutil.rmtree(self.dir, ignore_errors=True)
