"""Missions 1 and 2: what a Kafka cluster is made of, and what a partition looks like on disk.

Every output here is read from the real brokers: the command line tools of the distribution, the files in the data folder of a broker, and the client.
"""
import json
import os
import re
import time

import cluster as C
import kx

TOOL_GROUPS = [
    ('Run and format', ['kafka-server-start', 'kafka-server-stop', 'kafka-storage', 'kafka-features']),
    ('Topics and data', ['kafka-topics', 'kafka-configs', 'kafka-console-producer', 'kafka-console-consumer', 'kafka-get-offsets', 'kafka-delete-records']),
    ('Groups', ['kafka-consumer-groups', 'kafka-groups', 'kafka-share-groups', 'kafka-streams-groups', 'kafka-console-share-consumer']),
    ('Cluster and disks', ['kafka-metadata-quorum', 'kafka-metadata-shell', 'kafka-log-dirs', 'kafka-dump-log', 'kafka-broker-api-versions', 'kafka-cluster']),
    ('Moving data', ['kafka-reassign-partitions', 'kafka-leader-election', 'kafka-replica-verification']),
    ('Safety', ['kafka-acls', 'kafka-delegation-tokens', 'kafka-transactions', 'kafka-client-metrics']),
    ('Connect and mirroring', ['connect-distributed', 'connect-standalone', 'connect-mirror-maker', 'connect-plugin-path', 'connect-internal-topics']),
    ('Measuring', ['kafka-producer-perf-test', 'kafka-consumer-perf-test', 'kafka-e2e-latency', 'kafka-jmx']),
]


def norm(text, c):
    """Take out what changes from run to run: the temporary folder, cluster, directory and topic ids."""
    t = text.replace(str(c.work), '<work>')
    t = re.sub(r'(ClusterId:\s+|cluster\.id=)[A-Za-z0-9_-]{22}', r'\1<cluster id>', t)
    t = re.sub(r'(directory\.id=|"directoryId": ")[A-Za-z0-9_-]{22}', r'\1<directory id>', t)
    t = re.sub(r'(DirectoryId\s*\n?\s*)?\b[A-Za-z0-9_-]{22}\b(?=\s+\d+\s+\d+\s+\d{13})', '<directory id>', t)
    t = re.sub(r'(topic_id: |TopicId: )[A-Za-z0-9_-]{22}', r'\1<topic id>', t)
    return t


# ---- parsing the tools --------------------------------------------------------------------------------------------------------------------------------------
def parse_features(out):
    rows = []
    for line in out.splitlines():
        m = re.match(r'Feature: (\S+)\s+SupportedMinVersion: (\S+)\s+SupportedMaxVersion: (\S+)\s+FinalizedVersionLevel: (\S+)', line)
        if m:
            rows.append(list(m.groups()))
    return rows


def parse_dump(out):
    """The batches of a kafka-dump-log of a .log file: a list of dicts with the numbers of every batch header."""
    batches = []
    for line in out.splitlines():
        if line.startswith('baseOffset:'):
            d = {}
            for k, v in re.findall(r'(\w+): (\S+)', line):
                d[k] = int(v) if re.fullmatch(r'-?\d+', v) else v
            batches.append(d)
    return batches


def parse_broker_configs(out, keys):
    """name -> (value, where it comes from) for the settings that the course names. kafka-configs prints name=value sensitive=... synonyms={SOURCE:name=value, ...}."""
    found = {}
    for line in out.splitlines():
        m = re.match(r'\s*(\S+?)=(.*?) sensitive=\w+ synonyms=\{(.*)\}', line)
        if m and m.group(1) in keys:
            syn = m.group(3).split(', ')[0].split(':')[0] if m.group(3) else 'not set'
            found[m.group(1)] = (m.group(2), syn)
    return found


SETTINGS = ['auto.create.topics.enable', 'num.partitions', 'default.replication.factor', 'min.insync.replicas', 'unclean.leader.election.enable', 'log.retention.hours',
            'log.segment.bytes', 'log.roll.hours', 'message.max.bytes', 'log.index.interval.bytes', 'log.message.timestamp.type', 'compression.type',
            'offsets.topic.num.partitions', 'offsets.retention.minutes', 'transaction.state.log.num.partitions', 'transactional.id.expiration.ms',
            'replica.lag.time.max.ms', 'broker.session.timeout.ms', 'group.consumer.session.timeout.ms', 'group.coordinator.rebalance.protocols', 'delete.topic.enable']


# ---- mission 1 ------------------------------------------------------------------------------------------------------------------------------------------------
def record_world(c, rec):
    """The map: versions, the three nodes, the features, the tools, the defaults, the internal topics and the folder of a broker."""
    kx.delete_topics(c.bootstrap, ['brewline.orders'])
    names = sorted(f[:-3] for f in os.listdir(C.check_home() / 'bin') if f.endswith('.sh'))
    listed = [t for _, ts in TOOL_GROUPS for t in ts]
    missing = [t for t in listed if t not in names]
    assert not missing, missing
    rec.counts('world.tools', {'scripts_in_bin': len(names), 'named_in_the_course': len(listed), 'not_named': [n for n in names if n not in listed]})
    rec.table('world.tool_groups', ['purpose', 'tools'], [[g, ', '.join(ts)] for g, ts in TOOL_GROUPS])

    out = c.tool('kafka-features', 'describe')[1]
    feats = parse_features(out)
    rec.table('world.features', ['feature', 'lowest level it supports', 'highest level it supports', 'level in use'], feats)

    q = c.tool('kafka-metadata-quorum', 'describe', '--status')[1]
    voters = json.loads(re.search(r'CurrentVoters:\s+(\[.*\])', q).group(1))
    rec.counts('world.cluster', {'version': C.version(), 'nodes': c.n, 'roles': 'broker,controller', 'voters': sorted(v['id'] for v in voters),
                                 'voter_ports': sorted(int(re.search(r':(\d+)', v['endpoints'][0]).group(1)) for v in voters),
                                 'broker_ports': [n.broker_port for n in c.nodes]})
    rec.text('world.quorum', norm(re.sub(r'LeaderId:\s+\d+', 'LeaderId:               <one of the three>', re.sub(r'(HighWatermark:|MaxFollowerLagTimeMs:)\s+\d+', lambda m: m.group(1).ljust(24) + '<varies>', q)), c))

    out = c.tool('kafka-configs', '--describe', '--all', '--entity-type', 'brokers', '--entity-name', '1')[1]
    cfg = parse_broker_configs(out, set(SETTINGS))
    assert set(cfg) == set(SETTINGS), set(SETTINGS) - set(cfg)
    rec.table('world.defaults', ['setting', 'value', 'where it comes from'], [[k, cfg[k][0], cfg[k][1]] for k in SETTINGS])

    # a topic, a producer, a consumer group and a transaction make the internal topics appear
    kx.create_topic(c.bootstrap, 'brewline.orders', assignment=[[1, 2, 3]])
    p = kx.producer(c.bootstrap, **{'transactional.id': 'world-tx'})
    p.init_transactions()
    p.begin_transaction()
    kx.send(p, 'brewline.orders', 2)
    p.commit_transaction()
    cons = kx.consumer(c.bootstrap, 'world-group')
    cons.subscribe(['brewline.orders'])
    t0 = time.time()
    while time.time() - t0 < 20:
        m = cons.poll(0.5)
        if m is not None and not m.error():
            break
    cons.commit(asynchronous=False)
    cons.close()
    md = kx.admin(c.bootstrap).list_topics(timeout=10).topics
    internal = sorted(t for t in md if t.startswith('__'))
    rec.table('world.internal_topics', ['topic', 'partitions', 'copies of each partition'],
              [[t, len(md[t].partitions), len(md[t].partitions[0].replicas)] for t in internal])

    top = sorted(x.name for x in c.data_dir(1).iterdir() if not re.match(r'.+-\d+$', x.name) or x.name == '__cluster_metadata-0')
    rec.text('world.node_dir', '\n'.join(top))
    meta = sorted(x.name for x in (c.data_dir(1) / '__cluster_metadata-0').iterdir())
    rec.text('world.metadata_dir', '\n'.join(re.sub(r'\d{20}', '<offset>', m) if m.endswith('.checkpoint') else m for m in meta))
    rec.text('world.meta_properties', norm((c.data_dir(1) / 'meta.properties').read_text().split('\n', 2)[2].strip(), c))

    # the metadata log is a log like any other: decode a few records
    log = sorted((c.data_dir(1) / '__cluster_metadata-0').glob('*.log'))[0]
    rc, out, err = C.run_tool('kafka-dump-log', '--cluster-metadata-decoder', '--files', str(log), timeout=60)
    kinds = sorted({m.group(1) for m in re.finditer(r'"type":"(\w+)"', out)} - {'NO_OP_RECORD'})
    rec.counts('world.metadata_records', {'kinds_seen': kinds})
    pick = [l for l in out.splitlines() if '"type":"TOPIC_RECORD"' in l and 'brewline.orders' in l][:1] + [l for l in out.splitlines() if '"type":"PARTITION_RECORD"' in l][:0]
    topic_id = re.search(r'"topicId":"([^"]+)"', pick[0]).group(1)
    part = [l for l in out.splitlines() if '"type":"PARTITION_RECORD"' in l and topic_id in l][:1]
    rec.text('world.metadata_sample', norm(re.sub(r'^.*?(\{"type")', r'\1', '\n'.join(pick + part), flags=re.M).replace(topic_id, '<topic id>'), c))


# ---- mission 2 ------------------------------------------------------------------------------------------------------------------------------------------------
def listing(d):
    return sorted((x.name, x.stat().st_size) for x in d.iterdir())


def record_log(c, rec):
    """The log on disk: five records, then enough records for the log to roll, then offsets and times."""
    kx.delete_topics(c.bootstrap, ['orders-demo', 'one-record', 'orders-big'])
    # ---- five records in one partition on node 1 ----
    kx.create_topic(c.bootstrap, 'orders-demo', assignment=[[1]], config={'retention.ms': '-1'})
    p = kx.producer(c.bootstrap)
    sent, got = kx.send(p, 'orders-demo', 5)
    d = c.data_dir(1) / 'orders-demo-0'
    rec.table('log.files_small', ['file', 'bytes'], [list(x) for x in listing(d)])
    dump = C.run_tool('kafka-dump-log', '--files', str(d / '00000000000000000000.log'), '--print-data-log')[1]
    rec.text('log.dump_small', norm(dump, c))
    b = parse_dump(dump)
    rec.counts('log.batch_small', {'batches': len(b), 'records': b[0]['count'], 'bytes': b[0]['size'], 'magic': b[0]['magic'], 'compresscodec': b[0]['compresscodec'],
                                   'producerId': b[0]['producerId'], 'baseSequence': b[0]['baseSequence']})
    # what is in the bytes of one batch: the header is a fixed size, and what remains are the records
    one = kx.producer(c.bootstrap, **{'batch.num.messages': 1})
    kx.create_topic(c.bootstrap, 'one-record', assignment=[[1]], config={'retention.ms': '-1'})
    kx.send(one, 'one-record', 1)
    b1 = parse_dump(C.run_tool('kafka-dump-log', '--files', str(c.data_dir(1) / 'one-record-0' / '00000000000000000000.log'))[1])[0]
    o = sent[0]
    payload = len(kx.value(0)) + len(o['store_id'])
    rec.counts('log.overhead', {'batch_bytes': b1['size'], 'key_and_value_bytes': payload, 'bytes_that_are_not_data': b1['size'] - payload, 'batch_header_bytes': 61,
                                'record_overhead_bytes': b1['size'] - payload - 61})
    rec.text('log.leader_epoch', (d / 'leader-epoch-checkpoint').read_text().strip())
    rec.text('log.partition_metadata', norm((d / 'partition.metadata').read_text().strip(), c))
    cp = (c.data_dir(1) / 'replication-offset-checkpoint').read_text().strip().splitlines()
    rec.text('log.checkpoint_hw', '\n'.join(cp[:1] + ['<number of partitions on this broker>'] + [l for l in cp if l.startswith('orders-demo ')]))

    # ---- 12,000 records: the log rolls ----
    kx.create_topic(c.bootstrap, 'orders-big', assignment=[[1]], config={'retention.ms': '-1', 'segment.bytes': '1048576'})
    p = kx.producer(c.bootstrap)
    kx.send(p, 'orders-big', 12000)
    d = c.data_dir(1) / 'orders-big-0'
    files = listing(d)
    rec.table('log.files_big', ['file', 'bytes'], [list(x) for x in files])
    seg0 = d / '00000000000000000000.log'
    batches = parse_dump(C.run_tool('kafka-dump-log', '--files', str(seg0))[1])
    second = sorted(d.glob('*.log'))[1]
    base2 = int(second.name.split('.')[0])
    rec.counts('log.roll', {'first_segment_bytes': seg0.stat().st_size, 'segment_limit_bytes': 1048576, 'batches_in_first_segment': len(batches),
                            'next_batch_bytes': batches[-1]['size'], 'second_segment_first_offset': base2, 'records': 12000,
                            'would_not_fit': seg0.stat().st_size + batches[-1]['size'] > 1048576,
                            'index_bytes_closed': (d / '00000000000000000000.index').stat().st_size, 'index_bytes_active': (d / (second.name[:-4] + '.index')).stat().st_size,
                            'timeindex_bytes_closed': (d / '00000000000000000000.timeindex').stat().st_size,
                            'timeindex_bytes_active': (d / (second.name[:-4] + '.timeindex')).stat().st_size})
    idx = C.run_tool('kafka-dump-log', '--files', str(d / '00000000000000000000.index'))[1].splitlines()
    ent = [tuple(int(x) for x in re.findall(r'\d+', l)) for l in idx if l.startswith('offset:')]
    rec.counts('log.index', {'entries': len(ent), 'bytes_per_entry': 8, 'first_entries': ent[:6], 'last_entry': ent[-1], 'index_interval_bytes': 4096,
                             'batches': len(batches), 'first_batch_has_an_entry': ent[0][0] < batches[0]['lastOffset'] + 1 and ent[0][0] == batches[0]['lastOffset'],
                             'all_entries': ent, 'batch_sizes': [b['size'] for b in batches], 'batch_last_offsets': [b['lastOffset'] for b in batches]})
    tix = C.run_tool('kafka-dump-log', '--files', str(d / '00000000000000000000.timeindex'))[1].splitlines()
    tent = [tuple(int(x) for x in re.findall(r'\d+', l)) for l in tix if l.startswith('timestamp:')]
    rec.counts('log.timeindex', {'entries': len(tent), 'first_entries': tent[:3], 'bytes_per_entry': 12})
    # a fetch at offset N: the index gives the last entry at or below N, then the broker reads batches from that position (from the start of the file if there is none)
    def lookup(n):
        cands = [e for e in ent if e[0] <= n]
        entry = max(cands, key=lambda e: e[0]) if cands else None
        pos = entry[1] if entry else 0
        start = next(i for i, b2 in enumerate(batches) if b2['position'] == pos)
        read = next(k for k, b2 in enumerate(batches[start:], 1) if b2['lastOffset'] >= n)
        return [n, entry[0] if entry else 'none, so from the start of the file', pos, read]
    rec.table('log.lookups', ['offset to read', 'index entry used (offset)', 'file position', 'batches read to find it'], [lookup(n) for n in (0, 250, 5000, 8699)])
    # first batches of the big topic: position grows by the size of each batch
    rec.table('log.batches', ['first offset', 'last offset', 'records', 'position in the file', 'batch bytes'],
              [[b2['baseOffset'], b2['lastOffset'], b2['count'], b2['position'], b2['size']] for b2 in batches[:6]])

    # ---- earliest, latest, and the offset of a time ----
    def o(t):
        r = C.run_tool('kafka-get-offsets', '--bootstrap-server', c.bootstrap, '--topic', 'orders-big', '--time', str(t))[1].strip()
        return int(r.split(':')[2]) if r else None      # the tool prints nothing when no record is at or after that time
    rec.counts('log.offsets_by_time', {'earliest': o(-2), 'latest': o(-1), 'first_event_time_ms': kx.T0, 'offset_at_event_6000s': o(kx.T0 + 6000 * 1000),
                                       'offset_before_everything': o(kx.T0 - 1000), 'offset_after_everything': o(kx.T0 + 99999 * 1000)})
    rec.text('log.get_offsets_command', 'kafka-get-offsets.sh --bootstrap-server localhost:9092 --topic orders-big --time -1\n'
             + C.run_tool('kafka-get-offsets', '--bootstrap-server', c.bootstrap, '--topic', 'orders-big', '--time', '-1')[1].strip())
    dirs = json.loads(C.run_tool('kafka-log-dirs', '--bootstrap-server', c.bootstrap, '--describe', '--topic-list', 'orders-big')[1].splitlines()[-1])
    holders = [(b['broker'], p2['size']) for b in dirs['brokers'] for ld in b['logDirs'] for p2 in ld['partitions']]
    rec.counts('log.dirs', {'brokers_holding_it': [h[0] for h in holders], 'partition_bytes': holders[0][1], 'sum_of_files_bytes': sum(s2 for _, s2 in files)})
