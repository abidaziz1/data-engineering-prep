#!/usr/bin/env python3
"""Record what Apache Kafka really does, for the Kafka course. Everything here runs the real thing: the unmodified Apache Kafka 4.4.0 binary distribution in KRaft mode (three brokers on this
machine), its command line tools, its Kafka Connect worker, Kafka Streams, PostgreSQL 16 with Debezium 3.7.1, and the confluent-kafka client. Writes kafka/js/real.js. Nothing is timed.

What is real:     the log on disk, partitions and keys, producers, replication and the loss of a broker, consumer groups, rebalances, transactions, retention and compaction, Connect,
                  change data capture, Streams, ACLs and TLS, JMX metrics, a rolling restart, a partition move, a quota, pytest runs.
What is not:      a network (the brokers share one machine), a real load, Kerberos, OAuth, the Confluent Schema Registry (a stand-in of forty lines is used and labelled), ksqlDB, tiered storage,
                  MirrorMaker 2, Kubernetes, Confluent Cloud, Amazon MSK and every other managed service. Those parts of the course are from documentation, and the screens say so.

Usage:   KAFKA_HOME=<unpacked kafka_2.13-4.4.0> DEBEZIUM_PLUGINS=<folder with debezium-connector-postgres/> python3 kafka/verify/capture_kafka.py [--out kafka/js/real.js] [--only world,log,...] [--parts DIR]
         The whole recording takes about forty minutes. With --parts DIR the result of every section is kept in DIR, and a section that is already there is not run again, so that a run that was
         interrupted can be finished.
Needs:   Java 17 or 21, pip install -r kafka/verify/requirements.txt, PostgreSQL 16 server binaries (for the cdc section), openssl and keytool (for the security section).
"""
import argparse
import importlib
import importlib.metadata as md
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
sys.path.insert(0, str(HERE))

SECTIONS = [
    # name, where it runs ('shared': a three node cluster of its own for this section; 'own': the section starts what it needs), module, function
    ('world', 'shared', 'world', 'record_world'),
    ('log', 'shared', 'world', 'record_log'),
    ('keys', 'shared', 'keys', 'record_keys'),
    ('producers', 'shared', 'producers', 'record_producers'),
    ('replication', 'own', 'replication', 'record_replication'),
    ('consumers', 'shared', 'consumers', 'record_consumers'),
    ('delivery', 'shared', 'delivery', 'record_delivery'),
    ('lostack', 'own', 'delivery', 'record_lost_ack'),
    ('retention', 'shared', 'retention', 'record_retention'),
    ('connect', 'shared', 'connect', 'record_connect'),
    ('cdc', 'shared', 'cdc', 'record_cdc'),
    ('schemas', 'shared', 'schemas', 'record_schemas'),
    ('streams', 'shared', 'streams', 'record_streams'),
    ('security', 'own', 'security', 'record_security'),
    ('ops', 'own', 'ops', 'record_ops'),
    ('quota', 'shared', 'ops', 'record_quota'),
    ('tests', 'shared', 'tests', 'record_tests'),
]
# the source of what ran, for the code screens of the course
CODE_FILES = ['cluster.py', 'kx.py', 'world.py', 'keys.py', 'producers.py', 'replication.py', 'consumers.py', 'delivery.py', 'lossy_proxy.py', 'retention.py', 'connect.py', 'cdc.py', 'schemas.py',
              'streams.py', 'security.py', 'ops.py', 'tests.py', 'postgres.py', 'app/pipeline.py', 'app/StoreCounts.java', 'app/order_totals.py', 'app/order_totals_bug.py',
              'app/test_order_totals.py', 'app/conftest.py', 'app/idempotent.py', 'app/test_idempotent.py']


def version(pkg):
    try:
        return md.version(pkg)
    except md.PackageNotFoundError:
        return None


def java_version():
    r = subprocess.run(['java', '-version'], capture_output=True, text=True)
    m = re.search(r'version "([^"]+)"', r.stderr)
    return m.group(1) if m else None


def meta():
    import cluster as C
    import confluent_kafka
    pg = None
    if os.path.exists('/usr/lib/postgresql/16/bin/postgres'):
        m = re.search(r'(\d+\.\d+)', subprocess.run(['/usr/lib/postgresql/16/bin/postgres', '--version'], capture_output=True, text=True).stdout)
        pg = m.group(1) if m else None
    dbz = None
    plugins = os.environ.get('DEBEZIUM_PLUGINS')
    if plugins:
        jars = sorted(pathlib.Path(plugins).glob('debezium-connector-postgres/debezium-connector-postgres-*.jar'))
        dbz = re.search(r'postgres-(.+)\.jar', jars[0].name).group(1) if jars else None
    return {'kafka': C.version(), 'java': java_version(), 'python': sys.version.split()[0], 'confluent-kafka': version('confluent-kafka'), 'librdkafka': confluent_kafka.libversion()[0],
            'fastavro': version('fastavro'), 'pytest': version('pytest'), 'postgresql': pg, 'debezium': dbz, 'company': 'Brewline',
            'note': 'Recorded by kafka/verify/capture_kafka.py: the real Apache Kafka in KRaft mode on this machine, three brokers, made-up data. No network between the brokers, no cloud.'}


def run_child(name, json_path):
    """One section in a process of its own, so that a broker that was killed or a client that hangs cannot touch the next section."""
    import cluster as C
    from recorder import Rec
    _, kind, module, func = next(s for s in SECTIONS if s[0] == name)
    fn = getattr(importlib.import_module(module), func)
    rec = Rec()
    if kind == 'shared':
        with C.Cluster() as c:
            fn(c, rec)
    else:
        fn(rec)
    pathlib.Path(json_path).write_text(json.dumps(rec.out))
    sys.stdout.flush()
    os._exit(0)                  # the Kafka clients have threads that can keep a finished program alive


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=str(HERE.parent / 'js' / 'real.js'))
    ap.add_argument('--only', default=','.join(s[0] for s in SECTIONS))
    ap.add_argument('--json', help='also write the recording as plain JSON')
    ap.add_argument('--parts', help='keep the result of each section in this folder, and reuse the sections that are already there')
    ap.add_argument('--child')
    ap.add_argument('--part')
    args = ap.parse_args()
    if args.child:
        run_child(args.child, args.part)
    only = set(args.only.split(','))
    work = args.parts or tempfile.mkdtemp(prefix='kafka-record-')
    os.makedirs(work, exist_ok=True)
    out = {'meta': meta(), 'files': {}, 'text': {}, 'tables': {}, 'counts': {}}
    try:
        for name, kind, module, func in SECTIONS:
            if name not in only:
                continue
            t0 = time.time()
            part = os.path.join(work, 'part-%s.json' % name)
            reused = bool(args.parts and os.path.exists(part))
            if not reused:
                r = subprocess.run([sys.executable, str(pathlib.Path(__file__).resolve()), '--child', name, '--part', part], capture_output=True, text=True)
                if r.returncode or not os.path.exists(part):
                    print(r.stdout[-1500:], r.stderr[-3000:])
                    raise SystemExit('section %s failed' % name)
            for k, v in json.loads(pathlib.Path(part).read_text()).items():
                out[k].update(v)
            print('  %-12s %s' % (name, 'kept from an earlier run' if reused else '%.0fs' % (time.time() - t0)), flush=True)
    finally:
        if not args.parts:
            shutil.rmtree(work, ignore_errors=True)
    for f in CODE_FILES:
        out['files']['code/' + f] = (HERE / f).read_text().rstrip('\n')
    dest = pathlib.Path(args.out)
    dest.parent.mkdir(parents=True, exist_ok=True)
    body = json.dumps(out, indent=1, sort_keys=True, ensure_ascii=False)
    dest.write_text('window.LAB = window.LAB || {};\nLAB.real = ' + body + ';\n')
    if args.json:
        pathlib.Path(args.json).write_text(body)
    print('wrote', dest, len(body), 'bytes:', {k: len(v) for k, v in out.items()})


if __name__ == '__main__':
    main()
