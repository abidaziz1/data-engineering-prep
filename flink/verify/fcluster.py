"""A real Apache Flink cluster on one machine, for the recorder and for the checks.

Everything that the Flink course records ran on the processes that this file starts: the unmodified Apache Flink 2.2.1 binary distribution (the Scala 2.12 tarball from
downloads.apache.org), a standalone session cluster (one JobManager and two TaskManagers on localhost), the SQL client and the `flink` command line tool of that distribution. The
distribution is never changed: the configuration, the log folders and the process ids live in a temporary folder of their own, and the folders of the distribution are named to the
scripts through the environment variables that the scripts read (FLINK_CONF_DIR, FLINK_LOG_DIR, FLINK_PID_DIR, FLINK_LIB_DIR).

There is no network between the processes, so timings and throughput say nothing about a real cluster. Counts, plans, states, file names and the behaviour of the runtime are real.

The distribution is found through the environment variable FLINK_HOME (the folder that holds bin/ and lib/). The Kafka connector jar is found through FLINK_KAFKA_JAR.
Java 17 or later must be installed.
"""
import json
import os
import pathlib
import re
import shutil
import signal
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

FLINK_HOME = pathlib.Path(os.environ.get('FLINK_HOME', '')).expanduser()
KAFKA_JAR = pathlib.Path(os.environ.get('FLINK_KAFKA_JAR', '')).expanduser() if os.environ.get('FLINK_KAFKA_JAR') else None
NOISE = re.compile(r'^(Picked up JAVA_TOOL_OPTIONS|WARNING: |OpenJDK 64-Bit Server VM warning|SLF4J: )')
REST_PORT = int(os.environ.get('FLINK_REST_PORT', 8081))


def clean(text):
    """Drop the lines that the Java launcher and the sandbox add to the output of every tool."""
    return '\n'.join(l for l in text.splitlines() if not NOISE.match(l)).strip('\n')


ANSI = re.compile(r'\x1b\[[0-9;]*[A-Za-z]')


def strip_ansi(text):
    return ANSI.sub('', text)


def check_home():
    if not (FLINK_HOME / 'bin' / 'flink').exists():
        raise SystemExit('Set FLINK_HOME to the folder of an unpacked Apache Flink binary distribution (the one with bin/ and lib/).')
    return FLINK_HOME


def version():
    jars = sorted((check_home() / 'lib').glob('flink-dist-*.jar'))
    return re.search(r'flink-dist-(.+)\.jar', jars[0].name).group(1)


class Flink:
    """One JobManager and some TaskManagers. Use as a context manager: the folders live in a temporary folder that is deleted at the end."""

    def __init__(self, taskmanagers=2, slots=2, conf=None, work=None, keep=False, jm_memory='1024m', tm_memory='1280m', jars=(), rest_port=REST_PORT):
        check_home()
        self.n_tm, self.slots, self.keep = taskmanagers, slots, keep
        self.work = pathlib.Path(work or tempfile.mkdtemp(prefix='flink-capture-'))
        self.work.mkdir(parents=True, exist_ok=True)
        self.rest_port = rest_port
        self.extra = dict(conf or {})
        self.jm_memory, self.tm_memory = jm_memory, tm_memory
        self.jars = [pathlib.Path(j) for j in jars]
        self.tm_procs = {}
        self.jm_proc = None
        self.scripts = {}                 # the SQL scripts that were run, by name, for the code screens of the course
        for d in ('conf', 'lib', 'log', 'pid', 'checkpoints', 'savepoints', 'data', 'tmp'):
            (self.work / d).mkdir(exist_ok=True)

    # ---- the folders ---------------------------------------------------------------------------------------------------------------------------------
    @property
    def conf_dir(self):
        return self.work / 'conf'

    def _write_conf(self):
        # the Java 17+ flags come from the configuration file that ships with the distribution, so that they are the ones the project wrote
        shipped = (check_home() / 'conf' / 'config.yaml').read_text()
        flags = re.search(r'env:\n  java:\n    opts:\n      all: (.+)', shipped).group(1)
        base = {
            'jobmanager.rpc.address': 'localhost', 'jobmanager.rpc.port': 6123, 'jobmanager.bind-host': 'localhost', 'jobmanager.memory.process.size': self.jm_memory,
            'taskmanager.bind-host': 'localhost', 'taskmanager.host': 'localhost', 'taskmanager.numberOfTaskSlots': self.slots, 'taskmanager.memory.process.size': self.tm_memory,
            'parallelism.default': 1, 'rest.address': 'localhost', 'rest.bind-address': 'localhost', 'rest.port': self.rest_port,
            'execution.target': 'remote', 'io.tmp.dirs': str(self.work / 'tmp'),
            'execution.checkpointing.dir': 'file://%s' % (self.work / 'checkpoints'), 'execution.checkpointing.savepoint-dir': 'file://%s' % (self.work / 'savepoints'),
            'heartbeat.interval': 2000, 'heartbeat.timeout': 10000, 'metrics.fetcher.update-interval': 1000, 'slot.request.timeout': 10000,
            'env.log.dir': str(self.work / 'log'), 'env.pid.dir': str(self.work / 'pid'),
        }
        base.update(self.extra)
        lines = ['env.java.opts.all: %s' % flags] + ['%s: %s' % (k, v) for k, v in base.items()]
        (self.conf_dir / 'config.yaml').write_text('\n'.join(lines) + '\n')
        for f in ('log4j.properties', 'log4j-cli.properties', 'log4j-console.properties', 'logback.xml'):
            shutil.copy(check_home() / 'conf' / f, self.conf_dir / f)
        (self.conf_dir / 'masters').write_text('localhost:%d\n' % self.rest_port)
        (self.conf_dir / 'workers').write_text('localhost\n' * self.n_tm)
        # lib/: the jars of the distribution, by link, and the connector jars that the course adds
        lib = self.work / 'lib'
        for j in (check_home() / 'lib').glob('*.jar'):
            if not (lib / j.name).exists():
                (lib / j.name).symlink_to(j)
        for j in self.jars:
            if not (lib / j.name).exists():
                (lib / j.name).symlink_to(j)

    def env(self, **extra):
        e = dict(os.environ)
        e.update({'FLINK_CONF_DIR': str(self.conf_dir), 'FLINK_LOG_DIR': str(self.work / 'log'), 'FLINK_PID_DIR': str(self.work / 'pid'), 'FLINK_LIB_DIR': str(self.work / 'lib'),
                  'FLINK_IDENT_STRING': 'flink', 'FLINK_PLUGINS_DIR': str(check_home() / 'plugins'), 'FLINK_OPT_DIR': str(check_home() / 'opt')})
        e.update(extra)
        return e

    # ---- processes ------------------------------------------------------------------------------------------------------------------------------------
    def _daemon(self, script, *args, pid_name=None, log_name=None):
        env = self.env()
        if pid_name:
            (self.work / 'pid' / pid_name).mkdir(exist_ok=True)
            env['FLINK_PID_DIR'] = str(self.work / 'pid' / pid_name)
        if log_name:
            (self.work / 'log' / log_name).mkdir(parents=True, exist_ok=True)
            env['FLINK_LOG_DIR'] = str(self.work / 'log' / log_name)
        p = subprocess.run([str(check_home() / 'bin' / script), 'start'] + list(args), env=env, capture_output=True, text=True, timeout=120)
        if p.returncode:
            raise RuntimeError('%s failed: %s %s' % (script, p.stdout, p.stderr))
        return clean(p.stdout)

    def start(self):
        self._write_conf()
        self._daemon('jobmanager.sh', 'localhost')            # the script's own argument is the host the JobManager binds to
        self.wait_rest()
        for i in range(self.n_tm):
            self.start_tm(i)
        self.wait_slots(self.n_tm * self.slots)
        return self

    def start_tm(self, i):
        self._daemon('taskmanager.sh', pid_name='tm%d' % i, log_name='tm%d' % i)

    def tm_pid(self, i):
        p = self.work / 'pid' / ('tm%d' % i) / 'flink-flink-taskexecutor.pid'
        lines = [l for l in p.read_text().split() if l.strip()] if p.exists() else []
        return int(lines[-1]) if lines else None

    def jm_pid(self):
        p = self.work / 'pid' / 'flink-flink-standalonesession.pid'
        lines = [l for l in p.read_text().split() if l.strip()] if p.exists() else []
        return int(lines[-1]) if lines else None

    @staticmethod
    def alive(pid):
        try:
            os.kill(pid, 0)
            return True
        except (OSError, TypeError):
            return False

    def tm_resource_id(self, i):
        """The id that the JobManager uses for TaskManager i, read from the first lines of its log."""
        for lf in sorted((self.work / 'log' / ('tm%d' % i)).glob('flink-flink-taskexecutor-*.log'), reverse=True):      # the newest log: a TaskManager that was restarted has a new id
            m = re.search(r'Starting TaskManager with ResourceID: (\S+)', lf.read_text())
            if m:
                return m.group(1)
        return None

    def tm_of_job(self, jid):
        """Which TaskManagers (by index) run the tasks of a job: a set of numbers."""
        ids = {self.tm_resource_id(i): i for i in range(self.n_tm)}
        out = set()
        for v in self.job(jid)['vertices']:
            for st in self.rest('/jobs/%s/vertices/%s' % (jid, v['id']))['subtasks']:
                out.add(ids.get(st['taskmanager-id']))
        return out

    def kill_tm(self, i, sig=signal.SIGKILL):
        pid = self.tm_pid(i)
        os.kill(pid, sig)
        t0 = time.time()
        while self.alive(pid) and time.time() - t0 < 30:
            time.sleep(0.2)
        return pid

    def stop(self):
        for i in range(self.n_tm):
            pid = self.tm_pid(i)
            if pid and self.alive(pid):
                try:
                    os.kill(pid, signal.SIGKILL)
                except OSError:
                    pass
        pid = self.jm_pid()
        if pid and self.alive(pid):
            try:
                os.kill(pid, signal.SIGKILL)
            except OSError:
                pass
        t0 = time.time()
        while time.time() - t0 < 20 and any(self.alive(p) for p in [self.jm_pid()] + [self.tm_pid(i) for i in range(self.n_tm)] if p):
            time.sleep(0.2)

    def close(self):
        self.stop()
        if not self.keep:
            shutil.rmtree(self.work, ignore_errors=True)

    def __enter__(self):
        return self.start()

    def __exit__(self, *exc):
        self.close()

    # ---- the REST interface -------------------------------------------------------------------------------------------------------------------------
    def rest(self, path, method='GET', body=None, timeout=30):
        req = urllib.request.Request('http://localhost:%d%s' % (self.rest_port, path), method=method,
                                     data=json.dumps(body).encode() if body is not None else None, headers={'Content-Type': 'application/json'})
        # the sandbox sends everything through a proxy; localhost must not go through it
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        try:
            with opener.open(req, timeout=timeout) as r:
                data = r.read().decode()
        except urllib.error.HTTPError as e:
            data = e.read().decode()
            raise RuntimeError('%s %s -> %s %s' % (method, path, e.code, data[:500]))
        return json.loads(data) if data.strip() else {}

    def wait_rest(self, timeout=90):
        t0 = time.time()
        while True:
            try:
                self.rest('/overview', timeout=3)
                return
            except Exception:
                if time.time() - t0 > timeout:
                    raise TimeoutError('the JobManager did not answer:\n' + self.jm_log()[-3000:])
                time.sleep(0.5)

    def wait_slots(self, n, timeout=90):
        t0 = time.time()
        while True:
            o = self.rest('/overview')
            if o['slots-total'] >= n:
                return o
            if time.time() - t0 > timeout:
                raise TimeoutError('only %d of %d slots registered' % (o['slots-total'], n))
            time.sleep(0.5)

    def jm_log_lines(self, pattern, job=None):
        """The messages of the JobManager log that match a pattern (about one job, when it is named), with the logger, the clock time and the ids taken out."""
        out = []
        for l in self.jm_log().splitlines():
            if job and job not in l:
                continue
            if re.search(pattern, l):
                l = re.sub(r'^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d,\d{3} \w+\s+\S+\s+\[\] - ', '', l)
                l = re.sub(r'\b[0-9a-f]{32}\b', '<job id>', l)
                l = re.sub(r'localhost:\d+-[0-9a-f]+', '<taskmanager>', l)
                l = l.replace(str(self.work), '<work>')
                l = re.sub(r' @ \d{13}', '', l)
                out.append(l)
        return out

    def jm_log(self):
        fs = sorted((self.work / 'log').glob('flink-flink-standalonesession-*.log'))
        return fs[-1].read_text() if fs else ''

    # ---- jobs -----------------------------------------------------------------------------------------------------------------------------------------------
    def jobs(self):
        return self.rest('/jobs/overview')['jobs']

    def job(self, jid):
        return self.rest('/jobs/%s' % jid)

    def wait_state(self, jid, states, timeout=120):
        t0 = time.time()
        states = set(states.split(',') if isinstance(states, str) else states)
        while True:
            st = self.job(jid)['state']
            if st in states:
                return st
            if st in ('FAILED', 'CANCELED') and st not in states:
                raise RuntimeError('job %s is %s:\n%s' % (jid, st, json.dumps(self.rest('/jobs/%s/exceptions' % jid))[:2000]))
            if time.time() - t0 > timeout:
                raise TimeoutError('job %s is %s, wanted %s' % (jid, st, states))
            time.sleep(0.5)

    def cancel(self, jid):
        try:
            self.rest('/jobs/%s' % jid, method='PATCH')
        except RuntimeError:
            pass
        t0 = time.time()
        while time.time() - t0 < 30:
            if self.job(jid)['state'] in ('CANCELED', 'FINISHED', 'FAILED'):
                return
            time.sleep(0.3)

    def cancel_all(self):
        for j in self.jobs():
            if j['state'] in ('RUNNING', 'RESTARTING', 'CREATED'):
                self.cancel(j['jid'])

    def wait_idle(self, timeout=60):
        """Wait until every slot is free again (a cancelled job gives its slots back a moment later)."""
        t0 = time.time()
        while True:
            o = self.rest('/overview')
            if o['slots-available'] == o['slots-total']:
                return
            if time.time() - t0 > timeout:
                raise TimeoutError('slots are still in use: %s' % o)
            time.sleep(0.3)

    def checkpoints(self, jid):
        return self.rest('/jobs/%s/checkpoints' % jid)

    def wait_checkpoints(self, jid, n, timeout=120):
        t0 = time.time()
        while True:
            c = self.checkpoints(jid)
            done = c['counts']['completed']
            if done >= n:
                return c
            if time.time() - t0 > timeout:
                raise TimeoutError('only %d checkpoints completed' % done)
            time.sleep(0.5)

    def metric(self, jid, vertex, name):
        r = self.rest('/jobs/%s/vertices/%s/metrics?get=%s' % (jid, vertex, name))
        return r[0]['value'] if r else None

    # ---- tools ---------------------------------------------------------------------------------------------------------------------------------------------
    def cli(self, *args, input=None, timeout=300, cwd=None):
        """The `flink` command line tool. Returns (exit code, stdout, stderr) with the launcher noise removed."""
        p = subprocess.run([str(check_home() / 'bin' / 'flink')] + [str(a) for a in args], input=input, capture_output=True, text=True, timeout=timeout, env=self.env(), cwd=cwd)
        return p.returncode, clean(p.stdout), clean(p.stderr)

    def sql(self, script, jars=(), timeout=300, name='script', init=None):
        """Run a SQL script with the SQL client of the distribution, against this cluster. Returns (exit code, stdout, stderr)."""
        f = self.work / ('%s.sql' % name)
        f.write_text(script if script.endswith('\n') else script + '\n')
        self.scripts[name] = script.rstrip('\n')
        args = [str(check_home() / 'bin' / 'sql-client.sh'), '-f', str(f)]
        for j in list(self.jars_for_sql()) + list(jars):
            args += ['-j', str(j)]
        if init:
            args += ['-i', str(init)]
        p = subprocess.run(args, capture_output=True, text=True, timeout=timeout, env=self.env(), cwd=str(self.work))
        return p.returncode, clean(p.stdout), clean(p.stderr)

    def jars_for_sql(self):
        return []

    def out_mark(self):
        """Remember how much every .out file holds now, so that out_since can give what a later job printed."""
        return {str(f): f.stat().st_size for f in (self.work / 'log').glob('tm*/flink-flink-taskexecutor-*.out')}

    def out_since(self, mark):
        """What the print sinks wrote after out_mark, with the launcher noise removed."""
        text = ''
        for f in sorted((self.work / 'log').glob('tm*/flink-flink-taskexecutor-*.out')):
            data = f.read_bytes()[mark.get(str(f), 0):].decode(errors='replace')
            text += data
        return clean(text)

    def tm_out(self, i=None):
        """What the print sinks wrote: the .out files of the TaskManagers."""
        res = {}
        for d in sorted((self.work / 'log').glob('tm*')):
            for f in sorted(d.glob('flink-flink-taskexecutor-*.out')):
                res[d.name] = res.get(d.name, '') + f.read_text()
        return res if i is None else res.get('tm%d' % i, '')
