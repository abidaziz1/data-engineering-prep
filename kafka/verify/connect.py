"""Mission 9: Kafka Connect. A worker of the distribution, the REST interface, converters, transforms, offsets, and what happens to a record that cannot be converted.

What is real: the Connect worker of Apache Kafka 4.4.0 and the connectors that ship with it (FileStream source and sink). What is not run: the connectors that are separate projects (JDBC,
S3, Elasticsearch, and so on). They are described from documentation. Change data capture with Debezium has a mission of its own.
"""
import json
import os
import pathlib
import re
import subprocess
import time
import urllib.error
import urllib.request

import cluster as C
import kx
from world import norm

CLS = 'org.apache.kafka.connect.file.FileStream'


class Worker:
    """One Connect worker in distributed mode: it keeps its state in three topics of the cluster."""

    def __init__(self, c, name='w1', port=8083, group='connect-demo', extra=None):
        self.c, self.name, self.port, self.group, self.extra = c, name, port, group, extra or {}
        self.dir = c.work / ('connect-' + name)
        self.proc = None

    def start(self, timeout=90):
        self.dir.mkdir(parents=True, exist_ok=True)
        props = {'bootstrap.servers': self.c.bootstrap, 'group.id': self.group, 'key.converter': 'org.apache.kafka.connect.storage.StringConverter',
                 'value.converter': 'org.apache.kafka.connect.json.JsonConverter', 'value.converter.schemas.enable': 'false',
                 'offset.storage.topic': 'connect-offsets', 'offset.storage.replication.factor': 3, 'offset.storage.partitions': 5,
                 'config.storage.topic': 'connect-configs', 'config.storage.replication.factor': 3,
                 'status.storage.topic': 'connect-status', 'status.storage.replication.factor': 3, 'status.storage.partitions': 3,
                 'offset.flush.interval.ms': 2000, 'listeners': 'http://localhost:%d' % self.port,
                 'plugin.path': str(C.check_home() / 'libs' / ('connect-file-%s.jar' % C.version()))}
        props.update(self.extra)
        pf = self.dir / 'worker.properties'
        pf.write_text('\n'.join('%s=%s' % kv for kv in props.items()) + '\n')
        e = dict(os.environ)
        e.update({'KAFKA_HEAP_OPTS': '-Xmx384m -Xms128m', 'LOG_DIR': str(self.dir / 'logs')})
        self.proc = subprocess.Popen([str(C.check_home() / 'bin' / 'connect-distributed.sh'), str(pf)], stdout=open(self.dir / 'worker.out', 'ab'), stderr=subprocess.STDOUT, env=e,
                                     start_new_session=True)
        t0 = time.time()
        while time.time() - t0 < timeout:
            try:
                if self.api('GET', '/connector-plugins')[0] == 200:       # the server answers before its resources are registered, so ask for something real
                    return self
            except Exception:
                pass
            time.sleep(0.5)
        raise TimeoutError('the Connect worker did not start')

    def api(self, method, path, body=None, timeout=30):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request('http://localhost:%d%s' % (self.port, path), data=data, method=method, headers={'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                txt = r.read().decode()
                return r.status, (json.loads(txt) if txt else None)
        except urllib.error.HTTPError as e:
            txt = e.read().decode()
            try:
                return e.code, json.loads(txt)
            except ValueError:
                return e.code, txt

    def stop(self):
        if self.proc and self.proc.poll() is None:
            import signal
            os.killpg(self.proc.pid, signal.SIGTERM)
            try:
                self.proc.wait(30)
            except subprocess.TimeoutExpired:
                os.killpg(self.proc.pid, signal.SIGKILL)

    def create(self, name, config):
        return self.api('POST', '/connectors', {'name': name, 'config': config})

    def status(self, name):
        return self.api('GET', '/connectors/%s/status' % name)[1]

    def wait_state(self, name, state='RUNNING', timeout=60):
        t0 = time.time()
        last = None
        while time.time() - t0 < timeout:
            code, st = self.api('GET', '/connectors/%s/status' % name)
            if code == 200 and st['connector']['state'] == state and st['tasks'] and all(t['state'] == state for t in st['tasks']):
                return st
            last = st
            time.sleep(0.5)
        raise TimeoutError('%s never became %s: %s' % (name, state, last))


def wait_count(c, topic, n, timeout=60, isolation='read_uncommitted'):
    t0 = time.time()
    while time.time() - t0 < timeout:
        msgs = kx.read_all(c.bootstrap, topic, timeout=10) if topic in kx.admin(c.bootstrap).list_topics(timeout=10).topics else []
        if len(msgs) >= n:
            return msgs
        time.sleep(0.7)
    raise TimeoutError('%s never had %d records (has %d)' % (topic, n, len(msgs)))


def write_lines(path, start, n):
    with open(path, 'a') as f:
        for i in range(start, start + n):
            f.write(kx.value(i) + '\n')


def record_connect(c, rec):
    kx.delete_topics(c.bootstrap, ['connect-offsets', 'connect-configs', 'connect-status', 'conv-string', 'conv-json', 'conv-envelope', 'orders-file', 'bad-lines', 'bad-lines-dlq'])
    files = c.work / 'files'
    files.mkdir(exist_ok=True)
    w = Worker(c).start()
    try:
        run(c, rec, w, files)
    finally:
        w.stop()


def run(c, rec, w, files):
    # ---- the plugins that the worker found ----
    code, plugins = w.api('GET', '/connector-plugins')
    rec.table('connect.plugins', ['connector class', 'type', 'version'], [[p['class'].replace('org.apache.kafka.connect.', ''), p['type'], p['version']] for p in plugins])
    code, root = w.api('GET', '/')
    rec.counts('connect.worker', {'version': root['version'], 'rest_port': w.port, 'status_code': code, 'plugins': len(plugins)})

    # ---- the same file through three converters ----
    src = files / 'orders.jsonl'
    src.write_text('')
    write_lines(src, 0, 20)
    for tag, conv in (('string', {'value.converter': 'org.apache.kafka.connect.storage.StringConverter'}),
                      ('json', {'value.converter': 'org.apache.kafka.connect.json.JsonConverter', 'value.converter.schemas.enable': 'false'}),
                      ('envelope', {'value.converter': 'org.apache.kafka.connect.json.JsonConverter', 'value.converter.schemas.enable': 'true'})):
        cfg = {'connector.class': CLS + 'SourceConnector', 'tasks.max': '1', 'file': str(src), 'topic': 'conv-' + tag}
        cfg.update(conv)
        w.create('src-conv-' + tag, cfg)
    rows = []
    for tag, label in (('string', 'StringConverter'), ('json', 'JsonConverter, schemas.enable=false'), ('envelope', 'JsonConverter, schemas.enable=true')):
        msgs = wait_count(c, 'conv-' + tag, 20)
        rows.append([label, len(msgs), msgs[0][3][:150], len(msgs[0][3])])
    rec.table('connect.converters', ['converter of the value', 'records', 'the first value, as Kafka stores it (first 150 characters)', 'bytes of that value'], rows)

    # ---- a source connector, its status and its offsets ----
    cfg = {'connector.class': CLS + 'SourceConnector', 'tasks.max': '1', 'file': str(src), 'topic': 'orders-file', 'value.converter': 'org.apache.kafka.connect.storage.StringConverter'}
    code, created = w.create('src-orders', cfg)
    rec.counts('connect.created', {'status_code': code, 'name': created['name'], 'type': created['type'], 'config_keys': sorted(created['config'])})
    st = w.wait_state('src-orders')
    wait_count(c, 'orders-file', 20)
    st = w.status('src-orders')
    rec.counts('connect.status', {'connector_state': st['connector']['state'], 'tasks': [{'id': t['id'], 'state': t['state']} for t in st['tasks']], 'type': st['type'],
                                  'worker_id_is_the_worker': st['connector']['worker_id'] == 'localhost:%d' % w.port})
    time.sleep(3)
    code, off = w.api('GET', '/connectors/src-orders/offsets')
    pos20 = off['offsets'][0]['offset']['position']
    rec.counts('connect.offsets_after_20', {'status_code': code, 'offsets': [{'partition': {'filename': '<file>'}, 'offset': off['offsets'][0]['offset']}], 'file_bytes': src.stat().st_size,
                                            'position_equals_file_size': pos20 == src.stat().st_size})
    write_lines(src, 20, 5)
    wait_count(c, 'orders-file', 25)
    time.sleep(3)
    w.api('POST', '/connectors/src-orders/restart')
    w.wait_state('src-orders')
    time.sleep(2)
    after_restart = len(kx.read_all(c.bootstrap, 'orders-file'))
    # delete the connector and create it again under the same name: the position was kept in the offsets topic
    w.api('DELETE', '/connectors/src-orders')
    time.sleep(2)
    w.create('src-orders', cfg)
    w.wait_state('src-orders')
    time.sleep(4)
    after_recreate = len(kx.read_all(c.bootstrap, 'orders-file'))
    # reset the offsets: the connector must be stopped first, and then it reads the file from the top
    w.api('PUT', '/connectors/src-orders/stop')
    time.sleep(2)
    code, resp = w.api('DELETE', '/connectors/src-orders/offsets')
    w.api('PUT', '/connectors/src-orders/resume')
    w.wait_state('src-orders')
    time.sleep(5)
    after_reset = len(kx.read_all(c.bootstrap, 'orders-file'))
    rec.counts('connect.restart_and_reset', {'lines_in_the_file': 25, 'records_after_20_lines': 20, 'records_after_5_more_lines': 25, 'records_after_a_restart': after_restart,
                                             'records_after_delete_and_create_with_the_same_name': after_recreate, 'reset_status_code': code, 'reset_message': resp['message'] if isinstance(resp, dict) else resp,
                                             'records_after_the_offsets_were_reset': after_reset})

    # ---- internal topics ----
    tm = kx.admin(c.bootstrap).list_topics(timeout=10).topics
    rows = []
    for t in ('connect-configs', 'connect-offsets', 'connect-status'):
        pol = [l for l in c.tool('kafka-configs', '--describe', '--entity-type', 'topics', '--entity-name', t)[1].splitlines() if 'cleanup.policy' in l]
        rows.append([t, len(tm[t].partitions), len(tm[t].partitions[0].replicas), 'compact' if pol and 'compact' in pol[0] else 'delete', {'connect-configs': 'the settings of each connector', 'connect-offsets': 'the positions of the source connectors', 'connect-status': 'the state of each connector and task'}[t]])
    rec.table('connect.internal_topics', ['topic', 'partitions', 'copies', 'cleanup policy', 'what it holds'], rows)
    off_msgs = kx.read_all(c.bootstrap, 'connect-offsets')
    rec.text('connect.offsets_record', '\n'.join('key: %s\nvalue: %s' % (m[2], m[3]) for m in off_msgs[-1:]).replace(str(files), '<files>'))

    # ---- transforms in a sink ----
    out = files / 'smt.out'
    sink = {'connector.class': CLS + 'SinkConnector', 'tasks.max': '1', 'topics': 'orders-file', 'file': str(out), 'value.converter': 'org.apache.kafka.connect.json.JsonConverter',
            'value.converter.schemas.enable': 'false'}
    w.create('sink-plain', dict(sink, file=str(files / 'plain.out')))
    smt = dict(sink, file=str(out), transforms='drop,tag,mask',
               **{'transforms.drop.type': 'org.apache.kafka.connect.transforms.ReplaceField$Value', 'transforms.drop.exclude': 'customer_id,channel',
                  'transforms.tag.type': 'org.apache.kafka.connect.transforms.InsertField$Value', 'transforms.tag.static.field': 'source', 'transforms.tag.static.value': 'pos',
                  'transforms.mask.type': 'org.apache.kafka.connect.transforms.MaskField$Value', 'transforms.mask.fields': 'status'})
    w.create('sink-smt', smt)
    t0 = time.time()
    while time.time() - t0 < 60 and not ((files / 'plain.out').exists() and (files / 'smt.out').exists() and len((files / 'smt.out').read_text().splitlines()) >= 50):
        time.sleep(1)
    plain = (files / 'plain.out').read_text().splitlines()
    smt_lines = (files / 'smt.out').read_text().splitlines()
    rec.text('connect.sink_plain', '\n'.join(plain[:2]))
    rec.text('connect.sink_smt', '\n'.join(smt_lines[:2]))
    rec.counts('connect.sink_counts', {'records_in_the_topic': 50, 'lines_written_without_transforms': len(plain), 'lines_written_with_transforms': len(smt_lines),
                                       'transforms': ['ReplaceField$Value (drop two fields)', 'InsertField$Value (add a field)', 'MaskField$Value (blank a field)']})
    w.api('DELETE', '/connectors/sink-plain')
    w.api('DELETE', '/connectors/sink-smt')

    # ---- a record that cannot be converted ----
    bad = files / 'bad.jsonl'
    bad.write_text('')
    write_lines(bad, 0, 5)
    with open(bad, 'a') as f:
        f.write('this line is not JSON\n')
    write_lines(bad, 5, 5)
    w.create('src-bad', {'connector.class': CLS + 'SourceConnector', 'tasks.max': '1', 'file': str(bad), 'topic': 'bad-lines', 'value.converter': 'org.apache.kafka.connect.storage.StringConverter'})
    wait_count(c, 'bad-lines', 11)
    base = {'connector.class': CLS + 'SinkConnector', 'tasks.max': '1', 'topics': 'bad-lines', 'value.converter': 'org.apache.kafka.connect.json.JsonConverter',
            'value.converter.schemas.enable': 'false'}
    w.create('sink-strict', dict(base, file=str(files / 'strict.out')))
    t0 = time.time()
    while time.time() - t0 < 60:
        s = w.status('sink-strict')
        if s and s.get('tasks') and s['tasks'][0]['state'] == 'FAILED':
            break
        time.sleep(0.5)
    strict = (files / 'strict.out').read_text().splitlines() if (files / 'strict.out').exists() else []
    trace = s['tasks'][0].get('trace', '')
    rec.counts('connect.failed_task', {'connector_state': s['connector']['state'], 'task_state': s['tasks'][0]['state'], 'first_line_of_the_trace': trace.splitlines()[0][:230],
                                       'lines_written_before_it_failed': len(strict), 'records_in_the_topic': 11})
    w.create('sink-tolerant', dict(base, file=str(files / 'tolerant.out'), **{'errors.tolerance': 'all', 'errors.deadletterqueue.topic.name': 'bad-lines-dlq',
                                                                                'errors.deadletterqueue.topic.replication.factor': '3',
                                                                                'errors.deadletterqueue.context.headers.enable': 'true', 'errors.log.enable': 'true'}))
    w.wait_state('sink-tolerant')
    t0 = time.time()
    while time.time() - t0 < 60 and not ((files / 'tolerant.out').exists() and len((files / 'tolerant.out').read_text().splitlines()) >= 10):
        time.sleep(1)
    tol = (files / 'tolerant.out').read_text().splitlines()
    dlq = wait_count(c, 'bad-lines-dlq', 1)
    # the headers of the dead letter record
    hdrs = {}
    from confluent_kafka import Consumer, TopicPartition
    cons = kx.consumer(c.bootstrap, 'dlq-reader-' + str(time.time()))
    cons.assign([TopicPartition('bad-lines-dlq', 0, 0)])
    m = None
    while m is None or m.error():
        m = cons.poll(5)
    for k, v in m.headers():
        hdrs[k] = (v.decode(errors='replace') if v else '')
    cons.close()
    rec.counts('connect.dead_letter', {'records_read_by_the_sink': 11, 'lines_written': len(tol), 'records_in_the_dead_letter_topic': len(dlq), 'dead_letter_value': dlq[0][3],
                                       'header_names': sorted(hdrs), 'task_state': w.status('sink-tolerant')['tasks'][0]['state'],
                                       'exception_message': re.sub(r'\s+', ' ', hdrs.get('__connect.errors.exception.message', ''))[:200], 'stage': hdrs.get('__connect.errors.stage'),
                                       'source_topic': hdrs.get('__connect.errors.topic'), 'source_offset': hdrs.get('__connect.errors.offset')})
    rc, st_all = w.api('GET', '/connectors?expand=status')
    rec.table('connect.all_status', ['connector', 'type', 'connector state', 'task states'],
              [[n, d['status']['type'], d['status']['connector']['state'], ','.join(t['state'] for t in d['status']['tasks'])] for n, d in sorted(st_all.items())])
    for n in list(st_all):
        w.api('DELETE', '/connectors/' + n)
