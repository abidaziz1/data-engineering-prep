#!/usr/bin/env python3
"""Record what the real CDC project does, for the walkthrough.

The project projects/brewline-cdc is copied to a temporary folder and run against real services on this machine: PostgreSQL 16 with logical decoding, Apache Kafka 4.4.0 (KRaft), a Kafka
Connect worker with the Debezium PostgreSQL connector 3.7.1.Final, and Spark 4.0.1 with Delta Lake 4.0.1: pytest (8 tests), a snapshot, a day of changes, a replay of the last silver batch, a
stopped connector with a backlog, and a change of the replica identity. Nothing is timed.

Not recorded: a cluster of brokers, a schema registry, a managed connector service, cloud storage, a Docker build, a CI run.

Usage:   CDC_PY=.. KAFKA_HOME=.. DEBEZIUM_PLUGINS=.. python3 project-cdc/verify/capture_cdc.py [--out project-cdc/js/real.js]
"""
import argparse
import datetime
import json
import os
import pathlib
import re
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.dont_write_bytecode = True
import cdclib                                           # noqa: E402
from cdclib import R, T, REPO, tool, parse_run          # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--out', default=str(HERE.parent / 'js' / 'real.js'))
args = ap.parse_args()

for f in sorted(REPO.rglob('*')):
    rel = str(f.relative_to(REPO))
    if f.is_file() and (f.suffix in ('.py', '.md', '.txt', '.yml', '.sql', '.json') or f.name in ('Makefile', '.gitignore')) and not any(j in rel for j in cdclib.JUNK):
        R['files'][rel] = f.read_text()

versions = cdclib.sh([tool(), '-c', 'import pyspark, platform; print(pyspark.__version__, platform.python_version())']).stdout.split()
delta_v = cdclib.sh([tool(), '-m', 'pip', 'show', 'delta-spark']).stdout
R['meta'].update({'pyspark': versions[0], 'delta': re.search(r'Version: (\S+)', delta_v).group(1), 'python': versions[-1],
                  'java': re.search(r'version "([^"]+)"', cdclib.sh(['java', '-version']).stderr).group(1), 'recorded_on': datetime.date.today().isoformat(),
                  'note': 'Recorded by project-cdc/verify/capture_cdc.py: the real project in a temporary copy, against PostgreSQL, Kafka, Kafka Connect with Debezium, and Spark with Delta Lake on one machine.'})

# ---- the tests (no services needed) ---------------------------------------------------------------------------------------------------------------------------
L = cdclib.Cdc(stack=False)
rc, out, err = L.module(['pytest', '-q', 'tests'])
assert rc == 0, out[-800:] + err[-800:]
T('tests.run', 'pytest -q tests\n' + re.sub(r' in [\d.]+s( \(.*\))?', '', out.strip().split('\n')[-1]))
R['counts']['tests'] = {'passed': int(re.search(r'(\d+) passed', out).group(1))}

# ---- the services and the five stages -------------------------------------------------------------------------------------------------------------------------
C = cdclib.Cdc()
S = C.stack
try:
    R['meta']['postgres'] = S.psql('show server_version', db='postgres').split()[0]
    R['meta']['kafka'] = re.search(r'kafka-clients-(.+)\.jar', str(next((pathlib.Path(os.environ['KAFKA_HOME']) / 'libs').glob('kafka-clients-*.jar')))).group(1)
    R['meta']['debezium'] = '3.7.1.Final'
    S.psql_file(C.home / 'db' / 'schema.sql')
    S.psql_file(C.home / 'db' / 'seed.sql')


    def counts():
        rc_, out_, err_ = C.script(str(HERE / 'counts.py'))
        assert rc_ == 0, err_[-800:]
        d = json.loads(out_)
        src = S.psql('select count(*), coalesce(sum(amount_cents), 0) from orders').split('|')
        d['source'], d['source_revenue'] = int(src[0]), int(src[1])
        return d

    RUNS = {}

    def stage(key, args_=()):
        rc_, out_, err_ = C.module(['cdc.run', *args_])
        assert rc_ == 0, '%s: exit %d: %s %s' % (key, rc_, out_[-800:], err_[-3000:])
        T('run.' + key, 'python -m cdc.run%s\n%s' % (''.join(' ' + a for a in args_), out_))
        RUNS[key] = parse_run(out_)
        R['counts']['after_' + key] = counts()

    def slot():
        row = S.psql("select active, pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) from pg_replication_slots where slot_name = 'brewline_slot'").split('|')
        return {'active': row[0] == 't', 'retained': float(row[1])}

    # 1. the snapshot
    S.register_connector()
    S.wait_connector()
    R['counts']['topic'] = {'snapshot': C.wait_topic(200)}
    stage('snapshot')

    # 2. a day of changes
    S.psql_file(C.home / 'db' / 'changes.sql')
    R['counts']['topic']['changes'] = C.wait_topic(287)
    stage('changes')

    # 3. a crash before the commit of the last silver batch: the batch runs again
    stage('replay', ['--replay-last-batch'])

    # 4. the connector is stopped while the database keeps changing, and then it resumes
    before = slot()
    S.connect('PUT', '/connectors/brewline-orders/stop')
    S.wait_connector('STOPPED')
    S.wait(lambda: not slot()['active'], 'the slot to be released', 30)
    stopped = slot()
    S.psql_file(C.home / 'db' / 'backlog.sql')
    grown = slot()
    S.connect('PUT', '/connectors/brewline-orders/resume')
    S.wait_connector()
    R['counts']['topic']['backlog'] = C.wait_topic(387)
    S.wait(lambda: slot()['active'], 'the slot to be taken again', 30)
    # Postgres lets go of the log at its next record of running transactions, which can take some seconds: wait for it, and fail if it never comes
    S.wait(lambda: slot()['retained'] < grown['retained'], 'the slot to release the log', 120)
    resumed = slot()
    R['counts']['slot'] = {'active_before': before['active'], 'active_while_stopped': stopped['active'], 'retained_grew': grown['retained'] > stopped['retained'] and grown['retained'] > 0,
                           'active_after_resume': resumed['active'], 'retained_dropped': resumed['retained'] < grown['retained']}
    stage('backlog')

    # 5. what an update event holds before the change, with the default replica identity and with FULL
    S.psql("UPDATE orders SET status = 'SHIPPED' WHERE id = 201")
    S.psql('ALTER TABLE orders REPLICA IDENTITY FULL')
    S.psql("UPDATE orders SET status = 'SHIPPED' WHERE id = 202")
    R['counts']['topic']['identity'] = C.wait_topic(389)
    stage('identity')

    # the events, as the topic holds them
    msgs = C.topic_messages()
    assert len(msgs) == 389, len(msgs)

    def clean(raw):
        ev = json.loads(raw)
        for k in ('ts_ms', 'ts_us', 'ts_ns', 'sequence', 'txId', 'lsn', 'xmin', 'origin_lsn'):
            if k in ev.get('source', {}):
                ev['source'][k] = '<%s>' % k
        for k in ('ts_ms', 'ts_us', 'ts_ns'):
            if k in ev:
                ev[k] = '<%s>' % k
        return json.dumps(ev, indent=2)

    def pick(pred):
        for off, raw in msgs:
            if pred(json.loads(raw)):
                return off, raw
        raise AssertionError('no such event')

    got = {}
    got['read'] = pick(lambda e: e['op'] == 'r' and e['after']['id'] == 1)
    got['create'] = pick(lambda e: e['op'] == 'c' and e['after']['id'] == 201)
    got['update'] = pick(lambda e: e['op'] == 'u' and e['after']['id'] == 201)
    got['delete'] = pick(lambda e: e['op'] == 'd' and e['before']['id'] == 31)
    got['update_full'] = pick(lambda e: e['op'] == 'u' and e['after']['id'] == 202)
    for k, (off, raw) in got.items():
        T('event.' + k, clean(raw))
    R['counts']['offsets'] = {k: v[0] for k, v in got.items()}
    ops = {}
    for _, raw in msgs:
        ops[json.loads(raw)['op']] = ops.get(json.loads(raw)['op'], 0) + 1
    R['counts']['ops'] = ops

    # the history of silver
    rc_, out_, err_ = C.script(str(HERE / 'tour.py'))
    assert rc_ == 0, err_[-800:]
    hist = json.loads(out_)
    R['tables']['history'] = {'cols': ['version', 'operation', 'inserted', 'updated'], 'rows': hist}
    R['counts']['runs'] = RUNS
finally:
    C.close()
    L.close()

T('tool.versions', 'Spark %(pyspark)s with Delta Lake %(delta)s on Java %(java)s and Python %(python)s; PostgreSQL %(postgres)s, Apache Kafka %(kafka)s, Debezium %(debezium)s' % R['meta'])
cdclib.write_real(args.out)
print('wrote %s: %d files, %d texts, %d tables, %d sets of counts' % (args.out, len(R['files']), len(R['text']), len(R['tables']), len(R['counts'])))
