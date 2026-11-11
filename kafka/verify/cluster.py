"""A real Apache Kafka cluster on one machine, for the recorder and for the checks.

Everything that the Kafka tutorial records ran on the brokers that this file starts: the unmodified Apache Kafka distribution (the binary tarball from
downloads.apache.org, 2.13 build), in KRaft mode, three combined nodes (each is a broker and a controller) on localhost. There is no network between the nodes, so
latency and throughput say nothing about a real cluster. Counts, offsets, file names, sizes of records and the behaviour of the protocol are real.

The distribution is found through the environment variable KAFKA_HOME (the folder that holds bin/ and libs/). Java 17 or later must be installed.
"""
import os
import pathlib
import re
import shutil
import signal
import subprocess
import tempfile
import time

KAFKA_HOME = pathlib.Path(os.environ.get('KAFKA_HOME', '')).expanduser()
NOISE = re.compile(r'^(Picked up JAVA_TOOL_OPTIONS|WARNING: Using incubator|OpenJDK 64-Bit Server VM warning)')


def clean(text):
    """Drop the lines that the Java launcher and the sandbox add to every tool's output."""
    return '\n'.join(l for l in text.splitlines() if not NOISE.match(l)).strip('\n')


def check_home():
    if not (KAFKA_HOME / 'bin' / 'kafka-server-start.sh').exists():
        raise SystemExit('Set KAFKA_HOME to the folder of an unpacked Apache Kafka binary distribution (the one with bin/ and libs/).')
    return KAFKA_HOME


def version():
    jars = sorted((check_home() / 'libs').glob('kafka-clients-*.jar'))
    return re.search(r'kafka-clients-(.+)\.jar', jars[0].name).group(1)


def run_tool(name, *args, input=None, timeout=120, env=None, cwd=None):
    """Run one of the distribution's command line tools. Returns (exit code, stdout, stderr) with the launcher noise removed."""
    e = dict(os.environ)
    e.update({'KAFKA_HEAP_OPTS': '-Xmx256m -Xms64m', 'KAFKA_LOG4J_OPTS': '-Dlog4j2.configurationFile=' + str(check_home() / 'config' / 'tools-log4j2.yaml')})
    e.update(env or {})
    p = subprocess.run([str(check_home() / 'bin' / (name if name.endswith('.sh') else name + '.sh'))] + [str(a) for a in args], input=input, capture_output=True, text=True,
                       timeout=timeout, env=e, cwd=cwd)
    return p.returncode, clean(p.stdout), clean(p.stderr)


class Node:
    def __init__(self, cluster, nid, broker_port, controller_port, role='both'):
        self.cluster, self.id, self.broker_port, self.controller_port, self.role = cluster, nid, broker_port, controller_port, role
        self.dir = cluster.work / ('node%d' % nid)
        self.props = self.dir / 'server.properties'
        self.log = self.dir / 'server.out'
        self.proc = None
        self.directory_id = None

    @property
    def addr(self):
        return 'localhost:%d' % (self.broker_port or self.controller_port)

    def running(self):
        if self.proc is not None:
            return self.proc.poll() is None
        try:
            os.kill(int((self.dir / 'pid').read_text()), 0)
            return True
        except (OSError, ValueError):
            return False

    def pid(self):
        return self.proc.pid if self.proc is not None else int((self.dir / 'pid').read_text())


class Cluster:
    """Three combined KRaft nodes by default. Use as a context manager: the data lives in a temporary folder that is deleted at the end."""

    def __init__(self, nodes=3, props=None, node_props=None, heap='512m', base_port=9092, step=100, work=None, keep=False, listener_extra=None, isolated=False):
        """nodes is the number of brokers. By default each one is also a controller ("combined" mode). With isolated=True there is one controller of its own (node 100)
        and the brokers are brokers only, so that a broker can be stopped without the cluster losing the quorum of its controllers."""
        self.n = nodes
        self.isolated = isolated
        base_port = int(os.environ.get('KAFKA_BASE_PORT', base_port))      # lets a second cluster run next to the development one
        self.props = dict(props or {})
        self.node_props = node_props or {}
        self.heap = heap
        self.keep = keep
        self.listener_extra = listener_extra or {}
        self.work = pathlib.Path(work or tempfile.mkdtemp(prefix='kafka-capture-'))
        self.work.mkdir(parents=True, exist_ok=True)
        if isolated:
            self.nodes = [Node(self, 100, None, base_port + 1, 'controller')] + [Node(self, i + 1, base_port + i * step, None, 'broker') for i in range(nodes)]
        else:
            self.nodes = [Node(self, i + 1, base_port + i * step, base_port + 1 + i * step) for i in range(nodes)]
        self.cluster_id = None

    @classmethod
    def attach(cls, work, nodes=3, **kw):
        """A handle on a cluster that was started earlier (by dev_up.py): the folders and ports are the same, nothing is formatted or started."""
        c = cls(nodes=nodes, work=work, keep=True, **kw)
        return c

    # ---- lifecycle ----------------------------------------------------------------------------------------------------------------------------------------
    @property
    def brokers(self):
        return [n for n in self.nodes if n.role != 'controller']

    @property
    def bootstrap(self):
        return ','.join(n.addr for n in self.brokers)

    def node(self, nid):
        return next(n for n in self.nodes if n.id == nid)

    def _write_props(self, n):
        voters = ','.join('localhost:%d' % x.controller_port for x in self.nodes if x.controller_port)
        k = min(3, self.n)
        base = {'node.id': n.id, 'controller.quorum.bootstrap.servers': voters, 'controller.listener.names': 'CONTROLLER',
                'listener.security.protocol.map': 'CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,SSL:SSL,SASL_PLAINTEXT:SASL_PLAINTEXT,SASL_SSL:SASL_SSL',
                'log.dirs': str(n.dir / 'data'), 'log.retention.check.interval.ms': 1000, 'group.initial.rebalance.delay.ms': 0,
                'offsets.topic.replication.factor': k, 'transaction.state.log.replication.factor': k, 'transaction.state.log.min.isr': min(2, self.n),
                'share.coordinator.state.topic.replication.factor': k, 'share.coordinator.state.topic.min.isr': min(2, self.n), 'num.network.threads': 2, 'num.io.threads': 4,
                'num.recovery.threads.per.data.dir': 1}
        if n.role == 'controller':
            base.update({'process.roles': 'controller', 'listeners': 'CONTROLLER://localhost:%d' % n.controller_port})
        elif n.role == 'broker':
            base.update({'process.roles': 'broker', 'listeners': 'PLAINTEXT://localhost:%d' % n.broker_port, 'advertised.listeners': 'PLAINTEXT://localhost:%d' % n.broker_port,
                         'inter.broker.listener.name': 'PLAINTEXT'})
        else:
            base.update({'process.roles': 'broker,controller', 'listeners': 'PLAINTEXT://localhost:%d,CONTROLLER://localhost:%d' % (n.broker_port, n.controller_port),
                         'advertised.listeners': 'PLAINTEXT://localhost:%d' % n.broker_port, 'inter.broker.listener.name': 'PLAINTEXT'})
        base.update(self.props)
        base.update(self.node_props.get(n.id, {}))
        if self.listener_extra:
            for k2, v in self.listener_extra.items():
                base[k2] = v(n) if callable(v) else v
        n.dir.mkdir(parents=True, exist_ok=True)
        n.props.write_text('\n'.join('%s=%s' % (k2, v) for k2, v in base.items()) + '\n')

    def format(self):
        check_home()
        self.cluster_id = run_tool('kafka-storage', 'random-uuid')[1].strip()
        voters = [x for x in self.nodes if x.controller_port]
        ids = []
        for n in voters:
            n.directory_id = run_tool('kafka-storage', 'random-uuid')[1].strip()
            ids.append('%d@localhost:%d:%s' % (n.id, n.controller_port, n.directory_id))
        for n in self.nodes:
            self._write_props(n)
            args = ['format', '--cluster-id', self.cluster_id, '--config', str(n.props)]
            if n.controller_port:
                args += ['--standalone'] if len(voters) == 1 else ['--initial-controllers', ','.join(ids)]
            rc, out, err = run_tool('kafka-storage', *args)
            if rc != 0:
                raise RuntimeError('format failed on node %d: %s %s' % (n.id, out, err))

    def start_node(self, nid):
        n = self.node(nid)
        e = dict(os.environ)
        e.update({'KAFKA_HEAP_OPTS': '-Xmx%s -Xms%s' % (self.heap, self.heap), 'LOG_DIR': str(n.dir / 'logs'),
                  'KAFKA_LOG4J_OPTS': '-Dlog4j2.configurationFile=' + str(check_home() / 'config' / 'log4j2.yaml')})
        n.proc = subprocess.Popen([str(check_home() / 'bin' / 'kafka-server-start.sh'), str(n.props)], stdout=open(n.log, 'ab'), stderr=subprocess.STDOUT, env=e,
                                  start_new_session=True)
        (n.dir / 'pid').write_text(str(n.proc.pid))
        return n

    def wait_ready(self, nodes=None, timeout=120):
        """Ready means that the broker answers an API versions request and the cluster has an active controller that knows it."""
        t0 = time.time()
        for n in (nodes or self.brokers):
            while True:
                if not n.running():
                    raise RuntimeError('node %d stopped while starting:\n%s' % (n.id, n.log.read_text()[-3000:]))
                rc, out, _ = run_tool('kafka-broker-api-versions', '--bootstrap-server', n.addr, timeout=60)
                if rc == 0 and 'id:' in out:
                    break
                if time.time() - t0 > timeout:
                    raise TimeoutError('node %d did not become ready:\n%s' % (n.id, n.log.read_text()[-3000:]))
                time.sleep(0.5)

    def start(self):
        self.format()
        for n in self.nodes:
            self.start_node(n.id)
        self.wait_ready()
        return self

    def stop_node(self, nid, kill=False, timeout=60):
        n = self.node(nid)
        if not n.running():
            return
        pid = n.pid()
        os.killpg(pid, signal.SIGKILL if kill else signal.SIGTERM)
        t0 = time.time()
        while n.running():
            if n.proc is not None:
                try:
                    n.proc.wait(timeout=0.2)
                except subprocess.TimeoutExpired:
                    pass
            else:
                time.sleep(0.2)
            if time.time() - t0 > timeout:
                os.killpg(pid, signal.SIGKILL)
                timeout = 10 ** 6

    def stop(self):
        for n in self.nodes:
            self.stop_node(n.id)

    def close(self):
        self.stop()
        if not self.keep:
            shutil.rmtree(self.work, ignore_errors=True)

    def __enter__(self):
        return self.start()

    def __exit__(self, *exc):
        self.close()

    # ---- tools ---------------------------------------------------------------------------------------------------------------------------------------------
    def tool(self, name, *args, bootstrap=None, **kw):
        """Run a tool against the cluster. The tools that take --bootstrap-server get it added, unless the arguments already name a server or a controller."""
        a = list(args)
        if not any(x.startswith('--bootstrap') for x in a) and name not in ('kafka-dump-log', 'kafka-storage'):
            a = ['--bootstrap-server', bootstrap or self.bootstrap] + a
        return run_tool(name, *a, **kw)

    def topics(self, *args):
        return self.tool('kafka-topics', *args)

    def data_dir(self, nid):
        return self.node(nid).dir / 'data'
