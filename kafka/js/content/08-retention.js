/* Mission 8: how long records stay. Records with old timestamps deleted at once, deletion by time and by size in whole segments, log compaction with tombstones, and what a compacted topic is for.
   The brokers of the recorder check the logs every second, so that a laptop shows in seconds what takes days. Real Apache Kafka 4.4.0. */
(function () {
  var B = LAB.b, G = LAB.get;
  var BF = G.counts('retention.backfill'), BL = G.text('retention.backfill_log'), BT = G.table('retention.by_time'), BR = G.counts('retention.by_time_rule');
  var BS = G.table('retention.by_size'), BZ = G.counts('retention.by_size_summary'), DR = G.text('retention.delete_records'), DRR = G.counts('retention.delete_records_result');
  var CB = G.counts('retention.compaction_before'), CT = G.table('retention.compacted'), CA = G.counts('retention.compaction_after'), CG = G.counts('retention.compaction_tombstones_gone');
  var CL = G.text('retention.cleaner_log'), OC = G.text('retention.offsets_topic_config');
  var PY = G.file('code/retention.py');
  var BACKFILL = G.lines(PY, G.at(PY, /^def backfill/), G.at(PY, /rec\.counts\('retention\.backfill'/) - 1);
  var COMPACT = G.lines(PY, G.at(PY, /^def compaction/), G.at(PY, /rec\.counts\('retention\.compaction_before'/) - 1);
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  G.expect(BF.earliest_offset_before === 0 && BF.earliest_offset_after === BF.next_offset_after && BF.records_left === 0 && BF.age_of_the_records_days > 7, 'records older than the retention time are deleted at once');
  G.expect(BR.first_state_earliest === 0 && BR.second_state_earliest === 50, 'time-based deletion removes whole segments');
  G.expect(BZ.bytes_left_in_the_log_files > BZ.retention_bytes && BZ.segments_left >= 2 && BZ.earliest_offset > 0, 'size-based deletion keeps up to one segment more than the cap');
  G.expect(DRR.earliest_offset_now === DRR.asked_to_keep_from_offset, 'kafka-delete-records moves the start of the log');
  G.expect(CB.records === 62 && CB.tombstones === 2 && CA.records < CB.records && CA.offsets_are_unchanged === true && CA.tombstones_still_there === 2, 'compaction keeps the last record per key, and the offsets');
  G.expect(CG.deleted_keys_are_gone === true, 'the tombstoned keys are gone');
  var lastStates = BT.rows;

  LAB.addChapter({
    id: 'm8', n: 8, title: 'Retention and compaction', short: 'Retention', blurb: 'How long records stay: deletion by time and size, old timestamps, compaction and tombstones', minutes: 45,
    focus: ['snap', 'qual', 'ing'],
    goals: [
      'Explain **retention by time and by size**, and that Kafka deletes **whole segments**.',
      'Predict what happens to a **backfill** of old events.',
      'Explain **log compaction**: the last value per key, the gaps in the offsets, and **tombstones**.',
      'Choose between **delete** and **compact** for a topic.',
      'Know what **tiered storage** is, from documentation.',
      'Use `kafka-delete-records` and know its effect.'
    ],
    say: 'Mission 8 is about forgetting. A Kafka topic does not keep everything forever by accident. It keeps what you tell it to, by time, by size, or by key, and it forgets in a way that surprises people: whole files at a time, judged by the timestamps in the records. I loaded old orders and watched them vanish, deleted by time and by size, and compacted a topic down to the last value of each key. Press Next.',
    scenes: [
      B.talk({
        id: 'm8-policies', t: 1, src: 'docs', title: 'Two ways to forget',
        say: 'A topic has a **cleanup policy**. There are two, and you can combine them. Press Next.',
        items: [
          ['delete', 'The default. The broker deletes **old segments**: those whose newest record is older than `retention.ms`, and, if set, the oldest segments when the partition is bigger than `retention.bytes`. The default is **seven days** and **no size limit**.', 'Forget by age or by size.'],
          ['compact', 'The broker keeps the **last record for each key** and removes the older ones. A topic becomes like a table of the latest state, readable by key. Nothing is deleted by age.', 'Forget old values of a key.'],
          ['delete,compact', 'Both: compaction keeps the latest per key, and the delete policy still removes anything older than the retention time.', 'Latest per key, but not forever.'],
          ['Whole segments only', 'In both cases the broker works on **closed segments**. It never changes the active segment, and never deletes part of a file. So records can live a little longer than their retention time.', 'The active segment is never touched.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The interview sentence:', t: 'Retention deletes whole closed segments by the age of their newest record, or by size. Compaction keeps the last value per key. Both leave the active segment alone.' }
      }),

      B.flow({
        id: 'm8-flow', t: 1, src: 'docs', title: 'How a log gets smaller', g: 'retention', legend: true,
        steps: [
          { say: 'A log has an active segment at the end, and closed segments before it. Press Next.', cap: 'Closed segments, and the active one.' },
          { say: 'Step 1. Records go to the **active segment**. It is never deleted and never compacted, whatever its age. Once it rolls, it becomes a closed segment.', on: ['k1'], focus: ['x_act', 'x_old'], cap: 'The active segment is protected.' },
          { say: 'Step 2. With the **delete** policy, a background thread looks at the closed segments, and checks the **largest timestamp** in each against `retention.ms`, and the total size against `retention.bytes`.', on: ['k2'], focus: ['x_old', 'x_del'], cap: 'Delete: look at age and size.' },
          { say: 'Step 3. A segment that is too old, or beyond the size limit, is **deleted as a whole**. The first offset of the log, the **log start offset**, moves up.', on: ['k3'], focus: ['x_del', 'x_gone'], cap: 'The log start offset moves up.' },
          { say: 'Step 4. With the **compact** policy, a cleaner works on the closed segments instead. It reads them and writes a smaller copy with only the **last record of each key**.', on: ['k4'], focus: ['x_old', 'x_cmp'], cap: 'Compact: keep the last of each key.' },
          { say: 'Step 5. The records that survive **keep their offsets**. The numbers in between are missing: there are gaps. A reader that asks for offset 5 and finds none gets the next one.', on: ['k5'], focus: ['x_cmp', 'x_last'], cap: 'Offsets keep their gaps.' },
          { say: 'Step 6. A record with a key and **no value**, a **tombstone**, says "delete this key". It is kept for `delete.retention.ms`, so that slow readers see the delete, and then it is removed too.', on: ['k6'], focus: ['x_last', 'x_tomb'], cap: 'A tombstone deletes a key.' },
          { say: 'Step 7. A new consumer that reads a compacted topic from the start gets the **latest value of every key**, and nothing more. That is how a cache or a table is rebuilt.', on: ['k7'], focus: ['x_last', 'x_read'], cap: 'A reader rebuilds the latest state.' }
        ]
      }),

      B.code({
        id: 'm8-backfill-code', t: 1, src: 'rec', title: 'Load old orders into a normal topic', file: 'retention.py', lang: 'python', code: BACKFILL,
        steps: [
          { say: 'This is the experiment that happened to me by accident, and then on purpose. Press Next.', lines: null },
          { say: 'The topic has the **default retention**, seven days. Nothing special.', lines: G.span(BACKFILL, /create_topic/) },
          { say: 'A hundred orders are sent. Their timestamps are from **1 January 2026**, a long time before I ran the code.', lines: G.span(BACKFILL, /kx\.send/) },
          { say: 'Then the code waits for the **log start offset** to reach the end: when the earliest offset equals the next offset, there is nothing left to read.', lines: G.span(BACKFILL, /before = bounds/, /wait_for/) }
        ],
        note: 'Recorded: this ran on the real cluster, with the retention check every second instead of every five minutes.'
      }),

      B.rows({
        id: 'm8-backfill', t: 1, src: 'rec', title: 'Old orders are deleted at once',
        steps: [
          {
            say: 'I wrote ' + BF.written + ' orders into a topic with the default retention of seven days. The orders were **' + BF.age_of_the_records_days + ' days old** by their timestamps. A moment later, the topic was **empty**: the earliest offset had moved from ' + BF.earliest_offset_before + ' to ' + BF.earliest_offset_after + ', the same as the next offset.',
            tabs: [{ layer: 'RECORDED', name: 'The topic before and after', c: 'raw', cols: ['Measure', 'Before', 'After'],
              rows: [['Earliest offset', BF.earliest_offset_before, BF.earliest_offset_after], ['Next offset', BF.next_offset_before, BF.next_offset_after], ['Records left', BF.next_offset_before - BF.earliest_offset_before, BF.records_left]], trk: 0 }],
            notes: ['Recorded. Nobody deleted anything. Retention compares the **timestamp inside the records** with the clock, and these records were already older than seven days when they were written.']
          },
          {
            say: 'The broker says so in its log. It rolled the segment, because the newest record in the active segment was too old, and deleted it with the reason **log retention time 604800000 ms breach, based on the largest record timestamp in the segment**. This is a real backfill incident: someone loads last year\'s events into Kafka, and they are gone before anyone reads them.',
            tabs: [{ layer: 'RECORDED', name: 'From the log of the broker', c: 'raw', cols: ['Line'], rows: BL.split('\n').map(function (l) { return [l]; }), trk: 1 }],
            notes: ['Recorded. The size and the time stamps in the segment line are real. The path is replaced by a marker.']
          },
          {
            say: 'What to do when you must load old data: give the topic a longer `retention.ms` **first** (or -1), set the producer to **LogAppendTime**, or load into a topic of its own with the retention that it needs.',
            tabs: [{ layer: 'RECORDED', name: 'Three ways to load old events safely', c: 'raw', cols: ['Option', 'What it does'],
              rows: [['retention.ms=-1 on the topic', 'nothing is deleted by age'], ['message.timestamp.type=LogAppendTime', 'the timestamp is the time of the write, so the records look new'], ['A topic made for the backfill', 'with the retention that the job needs, and removed afterwards']], trk: 2 }],
            notes: ['The settings are from the documentation. Mission 4 recorded the two timestamp types.']
          }
        ]
      }),

      B.rows({
        id: 'm8-time', t: 1, src: 'rec', title: 'Deletion by time: whole segments',
        steps: [
          {
            say: 'A topic with `retention.ms` of **' + n0(BR.retention_ms) + '** milliseconds and `segment.ms` of **' + n0(BR.segment_ms) + '**: a new segment every second. I wrote fifty orders with the time of now, waited, wrote fifty more in a new segment, waited for the retention, and watched the files and the earliest offset.',
            tabs: [{ layer: 'RECORDED', name: 'Two bursts of fifty, a third later', c: 'raw', cols: BT.cols, rows: BT.rows, trk: 0 }],
            notes: ['Recorded. The first burst was deleted as one file when its newest record was older than the retention. The files are named by their first offset.']
          },
          {
            say: 'The earliest offset went from **' + BT.rows[0][1] + '** to **' + BT.rows[1][1] + '**, then **' + BT.rows[2][1] + '**. It did not move one record at a time. It moved by a whole segment of fifty. That is the rule: **a record can live longer than its retention time**, until the whole segment that contains it is old enough.',
            tabs: [{ layer: 'RECORDED', name: 'What the log start offset did', c: 'raw', cols: ['Moment', 'Earliest offset'], rows: BT.rows.map(function (r) { return [r[0], r[1]]; }), trk: 1 }],
            notes: ['Recorded.']
          }
        ]
      }),

      B.rows({
        id: 'm8-size', t: 1, src: 'rec', title: 'Deletion by size',
        steps: [
          {
            say: 'A topic with `retention.bytes` of **' + n0(BZ.retention_bytes) + '** and one-mebibyte segments. I wrote forty thousand orders, about **4.7 MB**. The broker deleted the oldest segments. The earliest offset is now **' + n0(BZ.earliest_offset) + '**, and the log holds **' + n0(BZ.bytes_left_in_the_log_files) + ' bytes** in **' + BZ.segments_left + '** segments.',
            tabs: [{ layer: 'RECORDED', name: 'The segments that are left', c: 'raw', cols: BS.cols, rows: BS.rows, trk: 0 }],
            notes: ['Recorded. The size limit is applied to **whole segments**: the log is cut while it would still be above the limit afterwards. The result is above the cap, by less than one segment.']
          },
          {
            say: 'You can also cut the front of a log yourself. `kafka-delete-records.sh` takes a file that says "keep from this offset". I asked for the last hundred records. The tool said the **low watermark** was now ' + DRR.earliest_offset_now + ', and the next offset stayed at ' + n0(DRR.next_offset_now) + '. The log start moved up, immediately.',
            tabs: [{ layer: 'RECORDED', name: 'kafka-delete-records.sh', c: 'raw', cols: ['Output'], rows: DR.split('\n').map(function (l) { return [l]; }), trk: 1 }],
            notes: ['Recorded. Use it to remove a bad record or to free space. Consumers positioned before the new start get an out-of-range error and follow `auto.offset.reset`.']
          }
        ]
      }),

      B.code({
        id: 'm8-compact-code', t: 2, src: 'rec', title: 'Compact a topic of store statuses', file: 'retention.py', lang: 'python', code: COMPACT,
        steps: [
          { say: 'The experiment sends the status of each store five times, and then closes two stores. Press Next.', lines: null },
          { say: 'The topic has `cleanup.policy=compact`. The other settings only make a laptop quick: a segment rolls after a second, the cleaner starts at a 1 percent dirty ratio, a tombstone lives three seconds.', lines: G.span(COMPACT, /create_topic/, /'retention\.ms': '-1'\}\)/) },
          { say: 'Five rounds of "the status of every store": **sixty records**, every key five times.', lines: G.span(COMPACT, /for rnd in range/, /updates\.append\(\(s, json/) },
          { say: 'Then a **tombstone** for two stores: a record with the key and **no value**.', lines: G.span(COMPACT, /for s in \('s11', 's12'\)/, /updates\.append\(\(s, None\)\)/) }
        ],
        note: 'Recorded: the tombstone is sent with `value=None`. The recorder checked that the topic really had 62 records before the cleaner ran.'
      }),

      B.rows({
        id: 'm8-compact', t: 1, src: 'rec', title: 'Compaction keeps the last value of each key',
        steps: [
          {
            say: 'Before the cleaner ran, the topic held **' + CB.records + '** records: five values for each of the twelve stores, and two tombstones. After it ran, there were **' + CA.records + '**. For every store, the value that survived is the **last** one, from round 5. The offsets are **unchanged**: the first survivor is at offset **' + CA.first_offset + '**.',
            tabs: [{ layer: 'RECORDED', name: 'What is in the topic after compaction', c: 'raw', cols: CT.cols, rows: CT.rows, trk: 0 }],
            notes: ['Recorded. The last row is a record of round 6, which arrived after the cleaner had started and sits in the active segment: it is **not compacted yet**. Store s01 is in the topic twice, round 5 and round 6.']
          },
          {
            say: 'Look at the offsets. They run from ' + CA.first_offset + ' to ' + CA.last_offset + ', and **' + CA.gaps_in_the_offsets + '** numbers in between are missing: the last real values of the two stores that were closed, which the tombstones replaced. The tombstones themselves are still there. Compaction never renumbers records.',
            tabs: [{ layer: 'RECORDED', name: 'What changed, and what did not', c: 'raw', cols: ['Measure', 'Value'],
              rows: [['Records before', CB.records], ['Records after', CA.records], ['Highest offset before', CA.highest_offset_before], ['Offsets renumbered', 'no'], ['Gaps in the offsets', CA.gaps_in_the_offsets], ['Tombstones still in the log', CA.tombstones_still_there]], trk: 1 }],
            notes: ['Recorded. The active segment, with the newest records, is never compacted. That is why a compacted topic can show duplicates of a key at its end.']
          }
        ]
      }),

      B.rows({
        id: 'm8-tomb', t: 2, src: 'rec', title: 'Tombstones are removed too',
        steps: [
          {
            say: 'A tombstone does not stay forever. It must live long enough for slow readers to see that a key was deleted, so it is kept for `delete.retention.ms`, **three seconds** here, a day by default. After that a later cleaning removes it. I wrote a little more data to wake the cleaner, and read the topic again: no tombstones, and the stores **s11** and **s12** are **gone**.',
            tabs: [{ layer: 'RECORDED', name: 'The topic at the end', c: 'raw', cols: ['Measure', 'Value'],
              rows: [['Records', CG.records], ['Keys left', CG.keys.join(', ')], ['Deleted keys', CG.keys_that_were_deleted.join(', ')], ['Deleted keys are gone', CG.deleted_keys_are_gone ? 'yes' : 'no']], trk: 0 }],
            notes: ['Recorded. The cleaner only returns when there is new data to clean, so an idle compacted topic can keep its tombstones for longer than delete.retention.ms.']
          },
          {
            say: 'The cleaner leaves a trail in its own log file, `log-cleaner.log`. This is how you find out what it did, and how often.',
            tabs: [{ layer: 'RECORDED', name: 'From log-cleaner.log', c: 'raw', cols: ['Line'], rows: CL.split('\n').map(function (l) { return [l]; }), trk: 1 }],
            notes: ['Recorded. The dirty section is the part of the log that has not been cleaned yet.']
          },
          {
            say: 'Compaction is not only for your topics. **Kafka\'s own `__consumer_offsets` is a compacted topic**: the last commit of each group, topic and partition is the one that matters.',
            tabs: [{ layer: 'RECORDED', name: 'kafka-configs.sh --describe on __consumer_offsets', c: 'raw', cols: ['Line'], rows: OC.split('\n').map(function (l) { return [l]; }), trk: 2 }],
            notes: ['Recorded.']
          }
        ]
      }),

      B.widget({ id: 'm8-lab', kind: 'compactlab', t: 1, src: 'rec', title: 'Lab: compact a topic' }),

      B.cmp({
        id: 'm8-config', t: 1, src: 'docs', title: 'The retention settings',
        say: 'Nine settings control it all. Press Next.',
        cols: ['Setting', 'What it does', 'Default'],
        hl: 1,
        rows: [
          ['cleanup.policy', 'delete, compact, or both', 'delete'],
          ['retention.ms', 'How old the newest record of a segment may be before the segment is deleted', 'Seven days, from log.retention.hours=168'],
          ['retention.bytes', 'The size of a partition above which old segments are deleted', 'No limit (-1)'],
          ['segment.bytes', 'The size at which a segment rolls', '1 GiB. At least 1 MiB in this release'],
          ['segment.ms', 'The age at which a segment rolls, even if it is small', 'Seven days'],
          ['min.cleanable.dirty.ratio', 'How dirty a log must be before compaction starts', '0.5'],
          ['delete.retention.ms', 'How long a tombstone is kept', 'One day'],
          ['min.compaction.lag.ms and max.compaction.lag.ms', 'A record must be this old before it can be compacted, and the longest it can wait', 'No minimum, no maximum'],
          ['message.timestamp.type', 'Whose clock goes in the record: CreateTime or LogAppendTime', 'CreateTime']
        ],
        pick: 'The first five decide deletion. The next three decide compaction. The last decides which clock all of them use.'
      }),

      B.cmp({
        id: 'm8-usecase', t: 1, src: 'docs', title: 'Delete or compact: which topic needs what',
        say: 'Pick a policy by the question that the topic answers. Press Next.',
        cols: ['Topic', 'Policy', 'Why'],
        hl: 1,
        rows: [
          ['orders, the events of what happened', 'delete', 'Each event matters in its own right. Keep them for the time that readers might replay.'],
          ['store-status, the latest status of each store', 'compact', 'Only the last value of each key matters. The topic is a table.'],
          ['customer-profiles, to rebuild a cache', 'compact', 'A new service reads the whole topic and gets the current profile of every customer.'],
          ['clicks, with a high volume', 'delete, with a short time and a size cap', 'The volume is the problem, and old clicks have little value.'],
          ['changelog topics of Kafka Streams', 'compact', 'A state store is a table. Mission 12.'],
          ['__consumer_offsets, Kafka\'s own', 'compact', 'The last commit of each group matters.']
        ],
        pick: 'Events are deleted by age. State is compacted by key. When a topic has both kinds of records, split it into two topics.'
      }),

      B.talk({
        id: 'm8-tiered', t: 3, src: 'docs', title: 'Extra: tiered storage',
        say: 'Disks are the cost of long retention. Tiered storage moves old segments off the brokers. It is from the documentation, and I did not run it. Press Next.',
        items: [
          ['Two tiers', 'The **local** tier is the broker\'s disk, as before. The **remote** tier is an external system such as HDFS or S3, for completed log segments. Reads of old data come from there.', 'Local for the tail, remote for the history.'],
          ['A plug-in, not a feature you switch on', 'The documentation says that Kafka does not provide a `RemoteStorageManager` implementation out of the box. You configure one with `remote.log.storage.manager.class.name`, and turn the feature on with `remote.log.storage.system.enable`.', 'You need an implementation.'],
          ['Per topic', 'A topic opts in with `remote.storage.enable`. Then `local.retention.ms` and `local.retention.bytes` say how long data stays on the broker, and `retention.ms` and `retention.bytes` say how long it lives in total.', 'Local retention is shorter than total retention.'],
          ['What it changes', 'Brokers need less disk and recover faster, because they hold less. Old reads are slower, and the remote store becomes part of your availability.', 'Cheaper disks, one more dependency.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm8-q1', t: 1,
        q: 'A job loads last year\'s orders into a topic that has the default retention of seven days. What happens?',
        opts: [
          { t: 'The records are kept for seven days from the time that they are written', fb: 'Retention uses the timestamp in the record, not the time of the write.' },
          { t: 'The records are deleted at once, because their timestamps are older than the retention time', fb: '' },
          { t: 'The producer gets an error', fb: 'Kafka accepts the records.' },
          { t: 'The records are compacted', fb: 'The policy is delete.' }
        ],
        ok: 1,
        why: 'The broker judges age by the record\'s timestamp. Records that are already older than the retention time are removed at the next check, as the recording showed: the topic was empty after a moment.'
      }),

      B.quiz({
        id: 'm8-q2', t: 1,
        q: 'Retention is 10 minutes and a segment holds records from the last 25 minutes. When is it deleted?',
        opts: [
          { t: 'As soon as its oldest record is 10 minutes old', fb: 'It is judged by its newest record.' },
          { t: 'When its newest record is older than 10 minutes, and the segment is closed', fb: '' },
          { t: 'When the broker is restarted', fb: 'A restart does not delete data.' },
          { t: 'Never, it is the active segment', fb: 'If it were the active segment that would be true, but this one is old, so it was closed.' }
        ],
        ok: 1,
        why: 'The whole segment is deleted at once, when the largest timestamp in it is older than the retention time. The active segment is never deleted, which is why the broker rolls an old active segment first.'
      }),

      B.quiz({
        id: 'm8-q3', t: 1,
        q: 'What does a compacted topic keep?',
        opts: [
          { t: 'Every record for the retention time', fb: 'That is the delete policy.' },
          { t: 'The last record for each key, plus anything in the active segment', fb: '' },
          { t: 'The first record for each key', fb: 'It keeps the newest, not the oldest.' },
          { t: 'Only records with no key', fb: 'Records need a key to be compacted.' }
        ],
        ok: 1,
        why: 'The cleaner keeps the last value of each key in the closed segments. The active segment is not cleaned, so the newest records can include earlier values of a key, as store s01 did in the recording.'
      }),

      B.quiz({
        id: 'm8-q4', t: 2,
        q: 'After compaction, the offsets of a partition go 48, 49, 50, 60, 61. What is true?',
        opts: [
          { t: 'The records were renumbered', fb: 'Compaction never renumbers.' },
          { t: 'The missing offsets belonged to records that were removed, and the others kept theirs', fb: '' },
          { t: 'Data was lost by a bug', fb: 'Gaps are normal in a compacted topic.' },
          { t: 'The consumer must skip them with a special setting', fb: 'A fetch simply returns the next record.' }
        ],
        ok: 1,
        why: 'Offsets are permanent names. A removed record leaves a gap, and consumers read the next existing offset without any setting. The recording had gaps for the old values of the two closed stores.'
      }),

      B.bug({
        id: 'm8-bug', t: 1, q: 'The `store-status` topic must hold the latest status of every store, so that a new service can rebuild its table. Click the line that stops that from working.',
        file: 'create.sh', lang: 'bash',
        code: ['bin/kafka-topics.sh --bootstrap-server localhost:9092 --create --topic store-status \\', '  --partitions 3 --replication-factor 3 \\', '  --config cleanup.policy=delete --config retention.ms=604800000'].join('\n'),
        bad: [3],
        hint: 'After seven days, what is left of a store that has not changed its status?',
        why: 'With the **delete** policy and seven days, a store that did not change for a week **disappears** from the topic, and a new service would not know it exists. For "the latest value of each key", use `cleanup.policy=compact`.',
        fix: ['bin/kafka-topics.sh --bootstrap-server localhost:9092 --create --topic store-status \\', '  --partitions 3 --replication-factor 3 \\', '  --config cleanup.policy=compact'].join('\n'),
        cheer: 'State topics are compacted, event topics are deleted.'
      }),

      B.order({
        id: 'm8-ord', t: 1, q: 'Put what happens when you delete a key from a compacted topic in order.',
        items: [
          'A producer sends a record with the key and no value: a tombstone',
          'The tombstone is appended like any record, and readers see the key deleted',
          'The cleaner runs, keeps the tombstone and removes the older values of the key',
          'After delete.retention.ms, a later cleaning removes the tombstone as well',
          'A new consumer reading from the start never sees the key'
        ],
        why: 'The tombstone first deletes the values of the key, then is deleted itself, after slow readers have had time to see it.'
      }),

      B.decide({
        id: 'm8-dec', t: 2, src: 'docs', title: 'Decision: how long should the orders topic keep records',
        scenario: 'The `orders` topic gets 30 GB a day in all. The warehouse loads it every hour. A new fraud service may need to replay the last month when it is first deployed, and an incident last year took three days to notice. Disk is limited to 1.5 TB on the cluster. You choose.',
        opts: [
          { t: 'Seven days, the default', d: 'Easy, and the warehouse is safe.', lose: 'A three-day incident is covered, but the fraud service cannot replay a month.' },
          { t: 'Thirty days, with a size cap that fits the disks, and alerts on disk use', d: '900 GB in total, a month of replay.', lose: '' },
          { t: 'Keep forever (-1)', d: 'Nothing is ever lost.', lose: '30 GB a day for a year is 11 TB, far beyond the disks, and the cluster would fill.' }
        ],
        pick: 1,
        why: 'Thirty days covers the replay and the incident, and 30 GB a day times 30 is 900 GB before replication. Multiply by the replication factor of 3 for the real disk, and keep a size cap and an alert as a safety net.',
        when: 'If long history is valuable, a remote tier or a copy in object storage with Kafka Connect is cheaper than broker disks. Say what the disks cost.'
      }),

      B.incident({
        id: 'm8-inc', t: 1, src: 'rec', title: 'Incident: the replayed orders are gone', time: '13:50',
        alert: '**The data science team loaded last year\'s orders into `orders-history` to train a model. Ten minutes later the topic is empty.** The producer reported success for every record.',
        clues: ['The topic has the default seven days of retention', 'The orders carry their original timestamps, from last year', 'The earliest offset of the topic equals its end offset'],
        opts: [
          { t: 'Create the topic with a long or infinite retention, or with LogAppendTime, and load again', fb: '' },
          { t: 'Restart the brokers to bring the data back', fb: 'The segments were deleted.' },
          { t: 'Read the topic with a new consumer group from the beginning', fb: 'There is nothing to read.' },
          { t: 'Increase the replication factor', fb: 'Replicas copy what is there. They do not bring deleted data back.' }
        ],
        best: 0,
        why: 'Retention looks at the timestamp in the record, and a record from last year is older than seven days the moment it is written. The retention thread deleted it. The recording reproduced this: a hundred old orders, and an empty topic.',
        checks: [
          ['Compare the earliest and the end offsets', 'Equal means everything was deleted.'],
          ['Look at the timestamps of what was sent', 'They are older than the retention time.'],
          ['Read the broker log', 'It says that segments were deleted due to the retention time.']
        ],
        tell: 'The records had last year\'s timestamps, so Kafka\'s retention treated them as expired at once. We reload into a topic with a long retention, or with LogAppendTime.',
        prevent: ['Set retention.ms on a topic before a backfill', 'Prefer a separate topic for historical loads', 'Document that retention uses the record timestamp']
      }),

      B.incident({
        id: 'm8-inc2', t: 2, src: 'docs', title: 'Incident: the broker disks are 95 percent full', time: '04:05',
        alert: '**Disks on all brokers are at 95 percent and growing.** The `clicks` topic has retention.ms of 7 days and no retention.bytes. A marketing campaign tripled the traffic yesterday.',
        clues: ['The volume of `clicks` rose from 100 GB to 300 GB a day', 'Retention by time keeps seven days, whatever the volume', 'There is no size cap'],
        opts: [
          { t: 'Lower retention.ms or set retention.bytes on `clicks`, which takes effect at the next check, and plan the capacity', fb: '' },
          { t: 'Delete the topic', fb: 'You would lose the data and break the readers.' },
          { t: 'Add a broker and move nothing', fb: 'The new broker is empty and the old ones stay full until partitions are moved.' },
          { t: 'Raise the retention to free space', fb: 'A longer retention keeps more.' }
        ],
        best: 0,
        why: 'Retention by time grows with the volume. Lowering retention.ms, or adding retention.bytes as a cap, makes the broker delete whole segments at the next check, and the disk drops. Capacity planning is volume times retention times the replication factor.',
        checks: [
          ['Find the biggest topics', '`kafka-log-dirs.sh` lists the size of each partition.'],
          ['Check the retention settings', 'A time with no size cap means that spikes are kept.'],
          ['Look at the growth', 'A sudden change in volume is the cause.']
        ],
        tell: 'A campaign tripled the clicks, and seven days of three times the data filled the disks. We lower the retention and add a size cap, and then we plan capacity from volume times retention times replicas.',
        prevent: ['Set both retention.ms and retention.bytes on high-volume topics', 'Alert on disk use at 70 percent, not 95', 'Plan capacity from the volume, the retention and the replication factor']
      }),

      B.qa({
        id: 'qa-retention', t: 1, tag: 'Retention', secs: 75,
        q: 'How does retention work in Kafka?',
        pts: ['By time and by size, per topic', 'Whole closed segments', 'The record timestamp', 'The active segment is never deleted', 'Defaults: seven days, no size cap'],
        short: 'A topic keeps records for `retention.ms`, seven days by default, and optionally up to `retention.bytes` per partition. A background thread deletes **whole closed segments**: a segment goes when the largest **timestamp** in it is older than the retention time, or when the partition is above the size limit. It never changes the active segment, and never deletes part of a file, so a record can live a little longer than the retention time. Because the **timestamp in the record** decides, a backfill of old events into a normal topic is deleted almost at once: I loaded a hundred orders from January into a topic with seven days, and it was empty a moment later. Consumers do not affect retention at all.',
        fu: [['Does reading a record delete it?', 'No. Retention does not look at consumers.'], ['What happens to a consumer whose offset was deleted?', 'It gets an out-of-range error and follows auto.offset.reset: earliest or latest.']],
        trap: 'Saying that records are deleted after they are consumed.',
        real: 'Disks are filling up. What do you check first?'
      }),

      B.qa({
        id: 'qa-compaction', t: 2, tag: 'Retention', secs: 75,
        q: 'What is log compaction, and when do you use it?',
        pts: ['Keep the last record for each key', 'Offsets are kept, with gaps', 'Tombstones delete keys', 'The active segment is not compacted', 'Use for state: tables, caches, changelogs'],
        short: 'With `cleanup.policy=compact`, the cleaner rewrites old segments so that only the **last record for each key** remains. The offsets of the survivors do not change, so there are gaps. A record with a key and no value, a **tombstone**, deletes the key, and it is removed itself after `delete.retention.ms`. The newest records, in the active segment, are not compacted, so a key can appear twice at the end. A new consumer that reads the whole topic gets the latest state of every key. So I use compaction for **state**, not events: the latest status of each store, the profile of each customer, the changelog of a Kafka Streams store. In my recording, sixty-two records became thirteen, with the same offsets and the stores that were deleted gone.',
        fu: [['Can you combine compaction with a time limit?', 'Yes: cleanup.policy=compact,delete keeps the latest per key, but still removes anything older than the retention time.'], ['Which of Kafka\'s own topics are compacted?', '__consumer_offsets, __transaction_state, and the Connect internal topics.']],
        trap: 'Saying that compaction removes duplicates in the usual sense, or that it renumbers records.',
        real: 'We want a topic that always holds the current price of every item. How?'
      }),

      B.qa({
        id: 'qa-capacity', t: 2, tag: 'Retention', secs: 75,
        q: 'How do you plan the disk for a topic?',
        pts: ['Volume per day times retention days', 'Times the replication factor', 'Headroom: 30 to 40 percent', 'Compression changes the volume', 'Alert before it is full'],
        short: 'I start from the **volume per day** after compression, multiply by the **retention in days**, and by the **replication factor**: a topic of 30 GB a day, kept for 30 days, with three copies, is 2.7 TB. Then I add headroom, because brokers must not run full, and because partitions are not perfectly even: I plan for about 60 to 70 percent use. I set both a time and a size limit on topics where a spike is possible, and I alert on disk use well before it is full. If long history is valuable, I look at tiered storage or at a copy in object storage rather than broker disks. And I measure the real volume per partition, because skew and message size change the plan.',
        fu: [['What if traffic doubles?', 'The disk use doubles with the same retention time. A size cap protects the disk and shortens the history instead.'], ['Does compression help?', 'Yes. The log holds the compressed batches, so zstd on JSON can cut the disk to a sixth.']],
        trap: 'Forgetting the replication factor.',
        real: 'We want to keep a year of orders. What does it cost in disk?'
      }),

      B.recap({
        id: 'm8-recap', n: 8, badge: 'Retention Keeper', color: '#FEF3C7',
        pts: [
          'Retention deletes **whole closed segments**, judged by the **largest timestamp** in the segment, or by size. The active segment is never touched.',
          'Because the **record\'s timestamp** decides, a **backfill of old events is deleted at once**: a hundred orders from January were gone in a moment.',
          'Time-based deletion moves the log start by a whole segment (50 records in the recording). Size-based deletion leaves up to one segment above the cap.',
          '**Compaction** keeps the **last value per key**, keeps the **offsets** (with gaps), and a **tombstone** deletes a key and then disappears itself.',
          'Use **delete** for events and **compact** for state. Kafka\'s own offsets topic is compacted.',
          'Plan the disk: **volume times days times replicas**, with headroom, and a size cap on topics that can spike.'
        ]
      })
    ]
  });
})();
