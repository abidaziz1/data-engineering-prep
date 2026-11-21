"""Helpers of the recorder for the CDC walkthrough: run the real project (projects/brewline-cdc) in a temporary copy, with real PostgreSQL, Apache Kafka, Kafka Connect and
Debezium, and Spark with Delta Lake, and parse what it printed.

The project is copied to a temporary folder before anything runs, so the repository is never touched. What the machine needs:
  CDC_PY            Python with pyspark 4.0.1, delta-spark 4.0.1 and pytest, and a Java 17 or later on the path. The Kafka and PostgreSQL packages of Spark come from Maven Central the first time.
  KAFKA_HOME        an unpacked Apache Kafka binary distribution (kafka_2.13-4.4.0)
  DEBEZIUM_PLUGINS  the folder that holds debezium-connector-postgres/ (debezium-connector-postgres-3.7.1.Final-plugin.tar.gz from Maven Central, unpacked)
  PG_BIN            the folder of the PostgreSQL 16 server programs (default /usr/lib/postgresql/16/bin)
"""
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import time

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
REPO = ROOT / 'projects' / 'brewline-cdc'
R = {'meta': {}, 'files': {}, 'text': {}, 'tables': {}, 'counts': {}}
JUNK = ('cdc_data', '__pycache__', '.pytest_cache', 'spark-warehouse', 'metastore_db', 'derby.log', '.venv')


def tool(name='CDC_PY'):
    v = os.environ.get(name, '')
    if not v:
        raise SystemExit('Set %s (see project-cdc/verify/requirements.txt)' % name)
    return v


def sh(cmd, **kw):
    return subprocess.run([str(c) for c in cmd], capture_output=True, text=True, **kw)


class Cdc:
    """A temporary copy of the project, the services that it needs, and a pipeline folder of its own."""

    def __init__(self, stack=True):
        self.home = pathlib.Path(tempfile.mkdtemp(prefix='cdc-project-'))
        shutil.rmtree(self.home)
        shutil.copytree(REPO, self.home, ignore=shutil.ignore_patterns(*JUNK))
        self.data = pathlib.Path(tempfile.mkdtemp(prefix='cdc-data-'))
        self.stack = None
        if stack:
            sys.path.insert(0, str(self.home))
            from stack.local import Stack            # the stack of the copy: the code that is recorded
            self.stack = Stack().start()
        self.env = dict(os.environ, CDC_HOME=str(self.data), PYTHONDONTWRITEBYTECODE='1', PYTHONWARNINGS='ignore')
        if self.stack:
            self.env.update(self.stack.env)

    def close(self):
        if self.stack:
            self.stack.stop()

    def module(self, args, timeout=1800):
        """Runs `python -m ...` in the copy. Returns (exit code, stdout, stderr). Spark's logs are on stderr and are not part of the recording."""
        r = sh([tool(), '-B', '-m', *args], cwd=self.home, env=self.env, timeout=timeout)
        return r.returncode, r.stdout.rstrip('\n'), r.stderr

    def script(self, path, *args, timeout=1800):
        r = sh([tool(), '-B', path, *args], cwd=self.home, env=self.env, timeout=timeout)
        return r.returncode, r.stdout.rstrip('\n'), r.stderr

    def replace_in(self, rel, old, new):
        f = self.home / rel
        text = f.read_text()
        assert text.count(old) == 1, '%s: the text to replace is in the file %d times: %s' % (rel, text.count(old), old[:70])
        f.write_text(text.replace(old, new))

    def hunt(self, name, *extra, timeout=1800):
        """Runs one bug hunt (verify/hunts_cdc.py) on this copy, with a pipeline folder of its own. Returns the JSON that it printed."""
        r = sh([tool(), '-B', str(HERE / 'hunts_cdc.py'), name, str(self.home), str(self.data), *extra], env=self.env, timeout=timeout)
        assert r.returncode == 0, 'hunt %s failed: %s' % (name, r.stderr[-1000:])
        self.last_stderr = r.stderr                  # Spark's own log: it holds the cause of a failed stream
        return json.loads(r.stdout.strip().split('\n')[-1])

    # ---- the services -----------------------------------------------------------------------------------------------------------------------------------
    def topic_messages(self, timeout_ms=8000):
        """Every message of the topic, from the first offset: a list of (offset, text)."""
        s = self.stack
        r = s.kafka_tool('kafka-console-consumer', '--bootstrap-server', s.env['KAFKA_BOOTSTRAP'], '--topic', 'brewline.public.orders', '--from-beginning',
                         '--property', 'print.offset=true', '--timeout-ms', timeout_ms)
        out = []
        for line in r.stdout.splitlines():
            m = re.match(r'Offset:(\d+)\t(\{.*)$', line)
            if m:
                out.append((int(m.group(1)), m.group(2)))
        return out

    def wait_topic(self, n, timeout=90):
        end = time.time() + timeout
        last = 0
        while time.time() < end:
            last = len(self.topic_messages())
            if last >= n:
                return last
            time.sleep(1)
        raise TimeoutError('the topic has %d messages, wanted %d' % (last, n))


def parse_run(out):
    """What a run printed: the bronze rows, the silver merge, and the gate lines."""
    d = {'new_messages': 0, 'events': 0, 'batches': 0, 'inserted': 0, 'updated': 0, 'left': 0, 'nothing_new': False, 'gate': []}
    for line in out.split('\n'):
        m = re.match(r'bronze: (\d+) new messages', line)
        if m:
            d['new_messages'] = int(m.group(1))
        m = re.match(r'silver: (\d+) events in (\d+) batch\(es\); merge inserted (\d+), updated (\d+), left (\d+) alone', line)
        if m:
            d['events'], d['batches'], d['inserted'], d['updated'], d['left'] = [int(x) for x in m.groups()]
        if line.startswith('silver: nothing new'):
            d['nothing_new'] = True
        if line.startswith(('PASS', 'FAIL')):
            d['gate'].append(line)
    return d


def T(key, s):
    R['text'][key] = '\n'.join(l.rstrip() for l in s.split('\n')).strip('\n')
    return R['text'][key]


def write_real(path):
    pathlib.Path(path).write_text('window.LAB = window.LAB || {};\nLAB.real = ' + json.dumps(R, indent=1, sort_keys=True, ensure_ascii=False, default=str) + ';\n')
