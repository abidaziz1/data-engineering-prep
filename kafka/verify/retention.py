"""Mission 8: how long records stay. Deletion by time and by size, the records that are deleted at once because their timestamp is old, log compaction, tombstones.

The brokers of the recorder check the logs every second (log.retention.check.interval.ms=1000, the default is five minutes), and the topics below use short times, so that a laptop shows in
seconds what takes days. The rules are the real rules.
"""
import json
import re
import time

import cluster as C
import kx
from world import norm, parse_dump

ON_NODE_1 = [[1]]


def wait_for(cond, timeout=90, interval=0.5):
    t0 = time.time()
    while time.time() - t0 < timeout:
        v = cond()
        if v:
            return v
        time.sleep(interval)
    raise TimeoutError('condition never became true')


def bounds(c, topic):
    lo, hi = kx.offsets(c.bootstrap, topic)[0]
    return lo, hi


def log_lines(c, file, needle, node=1):
    path = c.node(node).dir / 'logs' / file
    if not path.exists():
        return []
    return [re.sub(r'^\[[^\]]+\] ', '', l) for l in path.read_text(errors='ignore').splitlines() if needle in l]


def short(line, c):
    line = norm(line, c)
    line = re.sub(r'\b(in|took|time) \d+ ms', r'\1 N ms', line)
    return re.sub(r'\d+\.\d+ (KiB|MiB|B)/s|\d+\.\d+ seconds|\b\d+\.\d+ (KiB|MiB)\b', '<size or time>', line)


def segment_names(c, topic):
    return sorted(f.name for f in (c.data_dir(1) / (topic + '-0')).iterdir() if f.name.endswith('.log') or f.name.endswith('.deleted'))


# ---- old timestamps -------------------------------------------------------------------------------------------------------------------------------------------
def backfill(c, rec):
    """Records whose timestamp is older than the retention time are deleted at once. Retention looks at the time in the record, not at the time of the write."""
    kx.create_topic(c.bootstrap, 'backfill', assignment=ON_NODE_1)                     # the default retention: seven days
    cfg = c.tool('kafka-configs', '--describe', '--entity-type', 'topics', '--entity-name', 'backfill')[1]
    kx.send(kx.producer(c.bootstrap), 'backfill', 100)                               # orders of 2026-01-01, written months later
    before = bounds(c, 'backfill')
    wait_for(lambda: bounds(c, 'backfill')[0] == 100)
    after = bounds(c, 'backfill')
    lines = log_lines(c, 'server.log', 'backfill-0')
    rec.counts('retention.backfill', {'retention_of_the_topic': 'the default, seven days', 'written': 100, 'age_of_the_records_days': round((time.time() * 1000 - kx.T0) / 86400000),
                                      'earliest_offset_before': before[0], 'next_offset_before': before[1], 'earliest_offset_after': after[0], 'next_offset_after': after[1],
                                      'records_left': after[1] - after[0], 'topic_config_lines': [l.strip() for l in cfg.splitlines()][:3]})
    interesting = [short(l, c) for l in lines if 'Rolled new log segment' in l or 'Deleting segment' in l or 'Deleted log' in l][:4]
    rec.text('retention.backfill_log', '\n'.join(interesting))


# ---- deletion by time, in whole segments ----------------------------------------------------------------------------------------------------------------------
def by_time(c, rec):
    kx.create_topic(c.bootstrap, 'ttl', assignment=ON_NODE_1, config={'retention.ms': '5000', 'segment.ms': '1000', 'segment.bytes': '1048576'})
    p = kx.producer(c.bootstrap)

    def burst(start):
        out = []
        for i in range(start, start + 50):
            o = kx.order(i)
            p.produce('ttl', key=o['store_id'], value=kx.value(i), timestamp=int(time.time() * 1000))     # a record made now, with the time of now
        p.flush(30)
    burst(0)
    time.sleep(2.5)
    burst(50)               # the first write after segment.ms has passed: the log rolls, so the first 50 are in a closed segment
    time.sleep(0.5)
    states = [('both bursts written', bounds(c, 'ttl'), segment_names(c, 'ttl'))]
    wait_for(lambda: bounds(c, 'ttl')[0] >= 50)
    states.append(('the first burst is older than retention.ms', bounds(c, 'ttl'), segment_names(c, 'ttl')))
    time.sleep(2.5)
    burst(100)
    wait_for(lambda: bounds(c, 'ttl')[0] >= 100)
    states.append(('the second burst is older too', bounds(c, 'ttl'), segment_names(c, 'ttl')))
    rec.table('retention.by_time', ['moment', 'earliest offset', 'next offset', 'segment files'],
              [[m, b[0], b[1], ' '.join(n for n in names if n.endswith('.log'))] for m, b, names in states])
    rec.counts('retention.by_time_rule', {'retention_ms': 5000, 'segment_ms': 1000, 'deleted_whole_segments_only': True,
                                          'first_state_earliest': states[0][1][0], 'second_state_earliest': states[1][1][0]})


# ---- deletion by size -----------------------------------------------------------------------------------------------------------------------------------------
def by_size(c, rec):
    kx.create_topic(c.bootstrap, 'cap', assignment=ON_NODE_1, config={'retention.ms': '-1', 'retention.bytes': '3000000', 'segment.bytes': '1048576'})
    p = kx.producer(c.bootstrap)
    kx.send(p, 'cap', 40000)                                  # about 4.7 MB: more than the cap
    log = c.data_dir(1) / 'cap-0'
    wait_for(lambda: sum(f.stat().st_size for f in log.glob('*.log')) <= 3000000 + 1048576)
    time.sleep(2)
    files = sorted((f.name, f.stat().st_size) for f in log.glob('*.log'))
    lo, hi = bounds(c, 'cap')
    total = sum(s for _, s in files)
    rec.table('retention.by_size', ['segment file', 'bytes'], [list(f) for f in files])
    rec.counts('retention.by_size_summary', {'retention_bytes': 3000000, 'segment_bytes': 1048576, 'written_records': 40000, 'earliest_offset': lo, 'next_offset': hi,
                                             'records_left': hi - lo, 'bytes_left_in_the_log_files': total, 'segments_left': len(files),
                                             'the_active_segment_is_never_deleted': True})
    # kafka-delete-records: cut the front of a log on purpose
    import os
    import tempfile
    f = tempfile.NamedTemporaryFile('w', suffix='.json', delete=False)
    f.write(json.dumps({'partitions': [{'topic': 'cap', 'partition': 0, 'offset': hi - 100}], 'version': 1}))
    f.close()
    rc, out, err = c.tool('kafka-delete-records', '--offset-json-file', f.name)
    os.unlink(f.name)
    rec.text('retention.delete_records', out.strip())
    rec.counts('retention.delete_records_result', {'asked_to_keep_from_offset': hi - 100, 'earliest_offset_now': bounds(c, 'cap')[0], 'next_offset_now': bounds(c, 'cap')[1]})


# ---- compaction -----------------------------------------------------------------------------------------------------------------------------------------------
def compaction(c, rec):
    kx.delete_topics(c.bootstrap, ['latest'])
    kx.create_topic(c.bootstrap, 'latest', assignment=ON_NODE_1,
                    config={'cleanup.policy': 'compact', 'segment.ms': '1000', 'min.cleanable.dirty.ratio': '0.01', 'delete.retention.ms': '3000', 'max.compaction.lag.ms': '2000',
                            'retention.ms': '-1'})
    cfg = c.tool('kafka-configs', '--describe', '--entity-type', 'topics', '--entity-name', 'latest')[1]
    p = kx.producer(c.bootstrap, **{'batch.num.messages': 1, 'linger.ms': 0})
    updates = []
    # five rounds of "the status of each store" and, in a sixth round, two stores that close
    for rnd in range(1, 6):
        for s in kx.STORES:
            updates.append((s, json.dumps({'store_id': s, 'status': 'open', 'round': rnd})))
    for s in ('s11', 's12'):
        updates.append((s, None))                          # a tombstone: a record with a key and no value
    for k, v in updates:
        p.produce('latest', key=k, value=v)
    p.flush(30)
    before = kx.read_all(c.bootstrap, 'latest')
    time.sleep(1.5)
    p.produce('latest', key='s01', value=json.dumps({'store_id': 's01', 'status': 'open', 'round': 6}))        # the first write after segment.ms: the log rolls
    p.flush(30)
    rec.counts('retention.compaction_before', {'records': len(before), 'keys': len({m[2] for m in before}), 'tombstones': sum(1 for m in before if m[3] is None),
                                               'topic_config_lines': [l.strip() for l in cfg.splitlines()][:2]})
    wait_for(lambda: len(kx.read_all(c.bootstrap, 'latest')) <= 13)
    mid = kx.read_all(c.bootstrap, 'latest')
    rows = [[m[1], m[2], json.loads(m[3])['round'] if m[3] else 'tombstone (no value)'] for m in mid]
    rec.table('retention.compacted', ['offset', 'key', 'round of the value that survived'], rows)
    rec.counts('retention.compaction_after', {'records': len(mid), 'offsets_are_unchanged': True, 'first_offset': mid[0][1], 'last_offset': mid[-1][1],
                                              'highest_offset_before': before[-1][1], 'gaps_in_the_offsets': (mid[-1][1] - mid[0][1] + 1) - len(mid),
                                              'every_surviving_value_is_the_last_one': all(r[2] in (5, 6, 'tombstone (no value)') for r in rows),
                                              'tombstones_still_there': sum(1 for m in mid if m[3] is None)})
    # the tombstones go in a later pass of the cleaner, once they are older than delete.retention.ms. The cleaner only comes back when there is new data, so write a little more
    pokes = []

    def poke():
        n = len(pokes) + 7
        p.produce('latest', key='s02', value=json.dumps({'store_id': 's02', 'status': 'open', 'round': n}))
        p.flush(30)
        pokes.append(n)
        return sum(1 for m in kx.read_all(c.bootstrap, 'latest') if m[3] is None) == 0
    wait_for(poke, timeout=150, interval=1.6)
    gone = kx.read_all(c.bootstrap, 'latest')
    rec.counts('retention.compaction_tombstones_gone', {'records': len(gone), 'keys': sorted({m[2] for m in gone}), 'keys_that_were_deleted': ['s11', 's12'],
                                                         'deleted_keys_are_gone': not ({'s11', 's12'} & {m[2] for m in gone})})
    lines = log_lines(c, 'log-cleaner.log', 'latest-0')
    keep = [short(l, c) for l in lines if 'Cleaning log latest-0' in l or 'Log cleaner thread' in l and 'cleaned log latest-0' in l]
    rec.text('retention.cleaner_log', '\n'.join(keep[:2]))
    rec.text('retention.offsets_topic_config', '\n'.join(l.strip() for l in c.tool('kafka-configs', '--describe', '--entity-type', 'topics', '--entity-name', '__consumer_offsets')[1].splitlines()[:2]))


def record_retention(c, rec):
    kx.delete_topics(c.bootstrap, ['backfill', 'ttl', 'cap', 'latest'])
    backfill(c, rec)
    by_time(c, rec)
    by_size(c, rec)
    compaction(c, rec)
