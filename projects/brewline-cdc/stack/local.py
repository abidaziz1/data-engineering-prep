"""The services of the pipeline on one machine, without containers: PostgreSQL, Apache Kafka and
a Kafka Connect worker with the Debezium PostgreSQL connector.

Needs three things on the machine, found through environment variables:
  PG_BIN            the folder of the PostgreSQL 16 server programs (default /usr/lib/postgresql/16/bin)
  KAFKA_HOME        an unpacked Apache Kafka binary distribution (kafka_2.13-4.4.0)
  DEBEZIUM_PLUGINS  the folder that holds debezium-connector-postgres/ (the plugin archive of
                    Debezium 3.7.1.Final from Maven Central, unpacked)
Java 17 or later must be installed. Everything lives in a temporary folder.

Run:   python -m stack.local up      starts everything and prints the settings to export
"""

import json
import os
import pathlib
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import urllib.request

PG_BIN = pathlib.Path(os.environ.get('PG_BIN', '/usr/lib/postgresql/16/bin'))
KAFKA_HOME = pathlib.Path(os.environ.get('KAFKA_HOME', '.')).expanduser()
PLUGINS = os.environ.get('DEBEZIUM_PLUGINS', '')
PORTS = {'pg': 25432, 'kafka': 29092, 'controller': 29093, 'connect': 28083}
PROJECT = pathlib.Path(__file__).resolve().parent.parent


def run(cmd, **kw):
    return subprocess.run([str(c) for c in cmd], capture_output=True, text=True, **kw)


class Stack:
    def __init__(self, work=None):
        self.work = pathlib.Path(work or tempfile.mkdtemp(prefix='cdc-stack-'))
        self.work.mkdir(parents=True, exist_ok=True)
        os.chmod(self.work, 0o755)
        self.procs = {}
        self.pg_dir = self.work / 'pg'
        self.pg_dir.mkdir(exist_ok=True)
        if os.geteuid() == 0:
            shutil.chown(self.pg_dir, 'postgres', 'postgres')

    # ---- settings for the pipeline --------------------------------------------------------------
    @property
    def env(self):
        return {
            'PGHOST': 'localhost',
            'PGPORT': str(PORTS['pg']),
            'KAFKA_BOOTSTRAP': 'localhost:%d' % PORTS['kafka'],
            'CONNECT_URL': 'http://localhost:%d' % PORTS['connect'],
        }

    # ---- PostgreSQL -----------------------------------------------------------------------------
    def as_postgres(self, *cmd):
        prefix = ['runuser', '-u', 'postgres', '--'] if os.geteuid() == 0 else []
        return run(prefix + list(cmd))

    def start_postgres(self):
        data = self.pg_dir / 'data'
        r = self.as_postgres(
            PG_BIN / 'initdb',
            '-D',
            data,
            '--auth=trust',
            '-U',
            'postgres',
            '--encoding=UTF8',
            '--locale=C.UTF-8',
        )
        assert r.returncode == 0, r.stdout + r.stderr
        options = (
            '-p %d -c listen_addresses=localhost -c unix_socket_directories=%s -c wal_level=logical '
            '-c max_replication_slots=4 -c max_wal_senders=4 -c shared_buffers=64MB'
            % (PORTS['pg'], self.pg_dir)
        )
        r = self.as_postgres(
            PG_BIN / 'pg_ctl',
            '-D',
            data,
            '-o',
            options,
            '-l',
            self.pg_dir / 'pg.log',
            '-w',
            'start',
        )
        assert r.returncode == 0, r.stdout + r.stderr + (self.pg_dir / 'pg.log').read_text()
        self.psql('CREATE DATABASE brewline;', db='postgres')

    def psql(self, sql, db='brewline'):
        cmd = [PG_BIN / 'psql', '-h', 'localhost', '-p', PORTS['pg'], '-U', 'postgres', '-d', db]
        r = run(cmd + ['-v', 'ON_ERROR_STOP=1', '-At', '-F', '|', '-c', sql])
        assert r.returncode == 0, 'psql failed: %s\n%s' % (sql, r.stderr)
        return r.stdout.strip()

    def psql_file(self, path):
        cmd = [
            PG_BIN / 'psql',
            '-h',
            'localhost',
            '-p',
            PORTS['pg'],
            '-U',
            'postgres',
            '-d',
            'brewline',
        ]
        r = run(cmd + ['-v', 'ON_ERROR_STOP=1', '-q', '-f', path])
        assert r.returncode == 0, 'psql failed: %s\n%s' % (path, r.stderr)

    # ---- Kafka ----------------------------------------------------------------------------------
    def kafka_tool(self, name, *args, timeout=120):
        env = dict(os.environ, KAFKA_HEAP_OPTS='-Xmx256m -Xms64m')
        cmd = [KAFKA_HOME / 'bin' / (name + '.sh')] + [str(a) for a in args]
        return run(cmd, env=env, timeout=timeout)

    def start_kafka(self):
        node = self.work / 'kafka'
        node.mkdir(exist_ok=True)
        props = {
            'node.id': 1,
            'process.roles': 'broker,controller',
            'controller.quorum.bootstrap.servers': 'localhost:%d' % PORTS['controller'],
            'controller.listener.names': 'CONTROLLER',
            'listeners': 'PLAINTEXT://localhost:%d,CONTROLLER://localhost:%d'
            % (PORTS['kafka'], PORTS['controller']),
            'advertised.listeners': 'PLAINTEXT://localhost:%d' % PORTS['kafka'],
            'inter.broker.listener.name': 'PLAINTEXT',
            'listener.security.protocol.map': 'CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT',
            'log.dirs': str(node / 'data'),
            'offsets.topic.replication.factor': 1,
            'transaction.state.log.replication.factor': 1,
            'transaction.state.log.min.isr': 1,
            'share.coordinator.state.topic.replication.factor': 1,
            'share.coordinator.state.topic.min.isr': 1,
            'group.initial.rebalance.delay.ms': 0,
            'num.partitions': 1,
        }
        conf = node / 'server.properties'
        conf.write_text(''.join('%s=%s\n' % kv for kv in props.items()))
        cluster_id = self.kafka_tool('kafka-storage', 'random-uuid').stdout.strip().splitlines()[-1]
        r = self.kafka_tool(
            'kafka-storage', 'format', '--cluster-id', cluster_id, '--config', conf, '--standalone'
        )
        assert r.returncode == 0, r.stdout + r.stderr
        self.spawn('kafka', 'kafka-server-start', conf, node / 'server.out', heap='512m')
        self.wait(
            lambda: self.kafka_tool(
                'kafka-broker-api-versions', '--bootstrap-server', self.env['KAFKA_BOOTSTRAP']
            ).returncode
            == 0,
            'Kafka',
        )

    def spawn(self, name, tool, props, log, heap):
        env = dict(
            os.environ,
            KAFKA_HEAP_OPTS='-Xmx%s -Xms%s' % (heap, heap),
            LOG_DIR=str(self.work / (name + '-logs')),
        )
        cmd = [str(KAFKA_HOME / 'bin' / (tool + '.sh')), str(props)]
        self.procs[name] = subprocess.Popen(
            cmd, stdout=open(log, 'ab'), stderr=subprocess.STDOUT, env=env, start_new_session=True
        )

    # ---- Kafka Connect --------------------------------------------------------------------------
    def start_connect(self, flush_ms=2000):
        node = self.work / 'connect'
        node.mkdir(exist_ok=True)
        converter = 'org.apache.kafka.connect.json.JsonConverter'
        props = {
            'bootstrap.servers': self.env['KAFKA_BOOTSTRAP'],
            'group.id': 'connect-brewline',
            'key.converter': converter,
            'value.converter': converter,
            'key.converter.schemas.enable': 'false',
            'value.converter.schemas.enable': 'false',
            'offset.storage.topic': 'connect-offsets',
            'offset.storage.replication.factor': 1,
            'config.storage.topic': 'connect-configs',
            'config.storage.replication.factor': 1,
            'status.storage.topic': 'connect-status',
            'status.storage.replication.factor': 1,
            'offset.flush.interval.ms': flush_ms,
            'listeners': 'http://localhost:%d' % PORTS['connect'],
            'plugin.path': PLUGINS,
        }
        conf = node / 'worker.properties'
        conf.write_text(''.join('%s=%s\n' % kv for kv in props.items()))
        self.spawn('connect', 'connect-distributed', conf, node / 'worker.out', heap='512m')
        self.wait(lambda: self.connect('GET', '/connector-plugins')[0] == 200, 'Kafka Connect')

    def connect(self, method, path, body=None):
        data = json.dumps(body).encode() if body is not None else None
        headers = {'Content-Type': 'application/json'}
        req = urllib.request.Request(
            self.env['CONNECT_URL'] + path, data=data, method=method, headers=headers
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                text = response.read().decode()
                return response.status, json.loads(text) if text else None
        except Exception as error:  # noqa: BLE001
            return getattr(error, 'code', 0), str(error)

    def register_connector(self):
        env = dict(os.environ, **self.env)
        r = run([sys.executable, PROJECT / 'connect' / 'register.py'], env=env)
        assert r.returncode == 0, r.stdout + r.stderr
        return r.stdout.strip()

    def wait_connector(self, state='RUNNING', timeout=90):
        def ready():
            code, status = self.connect('GET', '/connectors/brewline-orders/status')
            if code != 200:
                return False
            states = [status['connector']['state']] + [t['state'] for t in status['tasks']]
            return (
                states[0] == state
                and all(s == state for s in states[1:])
                and (state != 'RUNNING' or len(states) > 1)
            )

        self.wait(ready, 'the connector', timeout)

    # ---- the whole stack ------------------------------------------------------------------------
    def wait(self, ready, what, timeout=120):
        end = time.time() + timeout
        while time.time() < end:
            try:
                if ready():
                    return
            except Exception:  # noqa: BLE001
                pass
            time.sleep(0.5)
        raise TimeoutError('%s did not become ready' % what)

    def start(self):
        self.start_postgres()
        self.start_kafka()
        self.start_connect()
        return self

    def kill(self, name, sig=signal.SIGKILL):
        proc = self.procs.get(name)
        if proc and proc.poll() is None:
            os.killpg(proc.pid, sig)
            proc.wait(30)

    def stop(self):
        for name in ('connect', 'kafka'):
            self.kill(name, signal.SIGTERM)
        self.as_postgres(PG_BIN / 'pg_ctl', '-D', self.pg_dir / 'data', '-m', 'fast', '-w', 'stop')
        shutil.rmtree(self.work, ignore_errors=True)

    def __enter__(self):
        return self.start()

    def __exit__(self, *exc):
        self.stop()


if __name__ == '__main__':
    stack = Stack().start()
    print('\n'.join('export %s=%s' % kv for kv in stack.env.items()))
    print('# stop everything with Ctrl-C')
    try:
        signal.pause()
    except KeyboardInterrupt:
        stack.stop()
