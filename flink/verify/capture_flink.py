#!/usr/bin/env python3
"""Record what Apache Flink really does, for the Flink course. Everything here runs the real thing: the unmodified Apache Flink 2.2.1 binary distribution (a standalone session cluster with one
JobManager and two TaskManagers on this machine), its SQL client and `flink` tool, the Kafka connector 5.0.0-2.2, a Java DataStream job that is compiled here, and the Apache Kafka 4.4.0 of
the Kafka course (one broker). Writes flink/js/real.js. Nothing is timed.

What is real:     the cluster and its REST interface, the job graph, slots and chaining, the changelog of a streaming query, watermarks and windows, checkpoints, the loss of a TaskManager,
                  savepoints, the Kafka source and sink with exactly-once, state that grows, backpressure, the compiled DataStream job.
What is not:      a network (all processes share one machine), a real load, Kubernetes and the Flink Kubernetes Operator, YARN, high availability with ZooKeeper, Amazon Managed Service for
                  Apache Flink and every other managed service, Flink CDC against a real database in the cloud, Iceberg and Paimon on object storage. Those parts of the course are from documentation,
                  and the screens say so.

Usage:   FLINK_HOME=<unpacked flink-2.2.1> FLINK_KAFKA_JAR=<flink-sql-connector-kafka-5.0.0-2.2.jar> KAFKA_HOME=<unpacked kafka_2.13-4.4.0> FLINK_DOCS=<flink-2.2.1/docs of the source release>
         python3 flink/verify/capture_flink.py [--out flink/js/real.js] [--only world,sql,...] [--parts DIR]
         With --parts DIR the result of every section is kept in DIR, and a section that is already there is not run again, so that an interrupted run can be finished.
Needs:   Java 17 or 21, pip install -r flink/verify/requirements.txt (the Kafka client of the Kafka course), a JDK (javac) for the DataStream job.
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
sys.path.insert(0, str(HERE.parent.parent / 'kafka' / 'verify'))

SECTIONS = [
    # name, needs a Kafka broker, module, function
    ('world', False, 's_world', 'record_world'),
    ('sql', False, 's_sql', 'record_sql'),
    ('time', True, 's_time', 'record_time'),
    ('state', True, 's_state', 'record_state'),
    ('connect', True, 's_connect', 'record_connect'),
    ('joins', False, 's_joins', 'record_joins'),
    ('datastream', True, 's_datastream', 'record_datastream'),
    ('running', True, 's_running', 'record_running'),
]
# the source of what ran, for the code screens of the course
CODE_FILES = []


def java_version():
    r = subprocess.run(['java', '-version'], capture_output=True, text=True)
    m = re.search(r'version "([^"]+)"', r.stderr)
    return m.group(1) if m else None


def meta():
    import fcluster as F
    import cluster as C
    try:
        import confluent_kafka
        lib = confluent_kafka.libversion()[0]
        ck = md.version('confluent-kafka')
    except Exception:
        lib = ck = None
    jar = F.KAFKA_JAR.name if F.KAFKA_JAR else None
    cdc = os.environ.get('FLINK_CDC_JAR')
    pg = None
    if os.path.exists('/usr/lib/postgresql/16/bin/postgres'):
        m = re.search(r'(\d+\.\d+)', subprocess.run(['/usr/lib/postgresql/16/bin/postgres', '--version'], capture_output=True, text=True).stdout)
        pg = m.group(1) if m else None
    return {'flink': F.version(), 'kafka': C.version() if os.environ.get('KAFKA_HOME') else None, 'kafka-connector': re.search(r'kafka-(\d[\w.\-]*)\.jar', jar).group(1) if jar else None,
            'flink-cdc': re.search(r'cdc-(\d[\w.\-]*)\.jar', cdc).group(1) if cdc else None, 'postgresql': pg, 'java': java_version(), 'python': sys.version.split()[0], 'confluent-kafka': ck, 'librdkafka': lib, 'company': 'Brewline',
            'note': 'Recorded by flink/verify/capture_flink.py: the real Apache Flink on this machine, a standalone cluster of one JobManager and two TaskManagers, made-up data. No network between the processes, no cloud.'}


def keep_scripts(f, rec):
    """The SQL scripts that the section ran, as they were, with the temporary folder and the port of the recording Kafka named the way the course names them."""
    for name, text in f.scripts.items():
        t = text.replace('file://' + str(f.work) + '/data/', 'file:///data/').replace(str(f.work), '<work>').replace('localhost:19092', 'localhost:9092')
        t = re.sub(r"'port' = '\d+'", "'port' = '5432'", t)
        rec.file('sql/%s.sql' % name, t)


def run_child(name, json_path):
    """One section in a process of its own, with a Flink cluster of its own (and a Kafka broker when it needs one), so that a process that was killed on purpose cannot touch the next section."""
    import fcluster as F
    from recorder import Rec
    _, kafka, module, func = next(s for s in SECTIONS if s[0] == name)
    fn = getattr(importlib.import_module(module), func)
    rec = Rec()
    jars = [F.KAFKA_JAR] if F.KAFKA_JAR else []
    if kafka:
        import cluster as C
        with C.Cluster(nodes=1, heap='512m', base_port=19092) as kc, F.Flink(jars=jars) as f:
            fn(f, kc, rec)
            keep_scripts(f, rec)
    else:
        with F.Flink(jars=jars) as f:
            fn(f, rec)
            keep_scripts(f, rec)
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
    work = args.parts or tempfile.mkdtemp(prefix='flink-record-')
    os.makedirs(work, exist_ok=True)
    out = {'meta': meta(), 'files': {}, 'text': {}, 'tables': {}, 'counts': {}}
    try:
        for name, kafka, module, func in SECTIONS:
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
