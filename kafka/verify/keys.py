"""Mission 3: topics, partitions and keys. Which partition does a key go to, what skew does a hot key cause, and what happens when partitions are added."""
import collections
import json
import time

import cluster as C
import kx

SPREAD3 = [[1, 2, 3], [2, 3, 1], [3, 1, 2]]


def placement(bootstrap, topic, partitioner):
    """Send one record for each store with the given partitioner and return the partition that the broker reports for each."""
    p = kx.producer(bootstrap, partitioner=partitioner)
    placed = {}

    def cb(err, msg):
        placed[msg.key().decode()] = msg.partition()
    for s in kx.STORES:
        p.produce(topic, key=s, value='x', callback=cb)
    p.flush()
    return [placed[s] for s in kx.STORES]


def record_keys(c, rec):
    kx.delete_topics(c.bootstrap, ['keys-3', 'keys-6', 'keys-12', 'orders-6p', 'adding', 'keyless-steady', 'keyless-burst'])
    # ---- the same key on topics of different sizes, with two different default partitioners ----
    rows, rows_crc, ok = [], [], True
    real = {}
    for parts in (3, 6, 12):
        kx.create_topic(c.bootstrap, 'keys-%d' % parts, assignment=[[1 + i % 3] for i in range(parts)])
        real[parts] = placement(c.bootstrap, 'keys-%d' % parts, 'murmur2_random')
        ok = ok and real[parts] == [kx.partition_for(s, parts) for s in kx.STORES]
    crc = {parts: placement(c.bootstrap, 'keys-%d' % parts, 'consistent_random') for parts in (3, 6, 12)}
    rec.table('keys.placement', ['key', '3 partitions', '6 partitions', '12 partitions'], [[s, real[3][i], real[6][i], real[12][i]] for i, s in enumerate(kx.STORES)])
    rec.table('keys.placement_other_client', ['key', '3 partitions', '6 partitions', '12 partitions'], [[s, crc[3][i], crc[6][i], crc[12][i]] for i, s in enumerate(kx.STORES)])
    rec.counts('keys.placement_check', {'my_murmur2_matches_the_broker_placement': ok, 'keys': len(kx.STORES), 'partition_counts_tried': [3, 6, 12],
                                        'keys_where_the_two_partitioners_disagree_on_6': sum(1 for i in range(12) if real[6][i] != crc[6][i])})

    # ---- 12,000 orders on 6 partitions: one store is a third of them ----
    kx.create_topic(c.bootstrap, 'orders-6p', assignment=[[1 + i % 3] for i in range(6)], config={'retention.ms': '-1'})
    p = kx.producer(c.bootstrap)
    kx.send(p, 'orders-6p', 12000)
    off = kx.offsets(c.bootstrap, 'orders-6p')
    msgs = kx.read_all(c.bootstrap, 'orders-6p')
    stores_in = collections.defaultdict(set)
    for part, _, key, _, _ in msgs:
        stores_in[part].add(key)
    total = sum(hi - lo for lo, hi in off.values())
    rec.table('keys.skew', ['partition', 'records', 'share of all records', 'stores in it'],
              [[pn, off[pn][1], round(off[pn][1] / total, 3), ' '.join(sorted(stores_in[pn]))] for pn in sorted(off)])
    per_store = collections.Counter(k for _, _, k, _, _ in msgs)
    busiest = max(off.values(), key=lambda x: x[1])[1]
    rec.counts('keys.skew_summary', {'records': total, 'partitions': 6, 'busiest_partition_records': busiest, 'even_share_records': total // 6,
                                     'busiest_over_even': round(busiest / (total / 6), 2), 'busiest_store': 's01', 'busiest_store_records': per_store['s01'],
                                     'busiest_store_share': round(per_store['s01'] / total, 3)})
    rec.table('keys.store_records', ['key', 'records among the 12,000'], [[st, per_store[st]] for st in kx.STORES])
    # order inside a partition: the order ids of one partition always rise; across the topic they do not
    by_part = collections.defaultdict(list)
    for part, o, k, v, ts in msgs:
        by_part[part].append(json.loads(v)['order_id'])
    rec.counts('keys.ordering', {'every_partition_is_in_order': all(ids == sorted(ids) for ids in by_part.values()),
                                 'partition_0_first_order_ids': by_part[0][:8], 'partition_1_first_order_ids': by_part[1][:8],
                                 'one_store_stays_in_one_partition': all(len({pn for pn in stores_in if k in stores_in[pn]}) == 1 for k in kx.STORES)})

    # ---- adding partitions moves keys ----
    kx.create_topic(c.bootstrap, 'adding', assignment=SPREAD3, config={'retention.ms': '-1'})
    first = {}

    def cb1(err, msg):
        first[msg.key().decode()] = (msg.partition(), msg.offset())
    p = kx.producer(c.bootstrap)
    for s in kx.STORES:
        p.produce('adding', key=s, value=json.dumps({'store_id': s, 'seq': 1}), callback=cb1)
    p.flush()
    from confluent_kafka.admin import NewPartitions
    a = kx.admin(c.bootstrap)
    for f in a.create_partitions([NewPartitions('adding', 6, replica_assignment=SPREAD3)]).values():
        f.result(30)
    time.sleep(1)
    kx.wait_for_leaders(c.bootstrap, 'adding')
    second = {}

    def cb2(err, msg):
        second[msg.key().decode()] = (msg.partition(), msg.offset())
    p = kx.producer(c.bootstrap)
    for s in kx.STORES:
        p.produce('adding', key=s, value=json.dumps({'store_id': s, 'seq': 2}), callback=cb2)
    p.flush()
    moved = [s for s in kx.STORES if first[s][0] != second[s][0]]
    rec.table('keys.adding', ['key', 'partition before (3 partitions)', 'partition after (6 partitions)', 'moved'],
              [[s, first[s][0], second[s][0], 'moved' if s in moved else 'same'] for s in kx.STORES])
    rec.counts('keys.adding_summary', {'keys': 12, 'moved': len(moved), 'stayed': 12 - len(moved), 'new_partitions': [3, 4, 5]})

    # ---- records without a key: they go to a partition that is chosen for a whole batch ----
    def keyless(name, steady):
        kx.delete_topics(c.bootstrap, [name])
        kx.create_topic(c.bootstrap, name, assignment=[[1 + i % 3] for i in range(6)], config={'retention.ms': '-1'})
        p = kx.producer(c.bootstrap, **{'linger.ms': 5})
        for b in range(120):
            for j in range(100):
                p.produce(name, value=kx.value(b * 100 + j))
            if steady:
                p.poll(0)
                time.sleep(0.02)          # a steady stream: a batch every 20 ms
        p.flush()
        off = kx.offsets(c.bootstrap, name)
        return [off[pn][1] for pn in sorted(off)]
    steady, burst = keyless('keyless-steady', True), keyless('keyless-burst', False)
    rec.counts('keys.keyless', {'records': 12000, 'partitions': 6, 'batch_size': 100,
                                'steady_stream_records_per_partition_in_this_run': steady, 'steady_stream_smallest_share': round(min(steady) / 12000, 3),
                                'steady_stream_largest_share': round(max(steady) / 12000, 3), 'one_burst_records_per_partition_in_this_run': burst,
                                'one_burst_largest_share': round(max(burst) / 12000, 3), 'all_counts_are_multiples_of_the_batch_size': all(x % 100 == 0 for x in steady),
                                'note': 'the partition of a keyless batch is chosen at random, so the counts differ from run to run'})
