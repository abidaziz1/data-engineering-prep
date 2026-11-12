/* Mission 6: consumers and consumer groups. Offsets and lag, the internal topic that stores positions, resetting a group, and three kinds of rebalance (eager, cooperative, and the new server-side
   protocol), with the partitions that moved. A consumer that is too slow. Real Apache Kafka 4.4.0 and the confluent-kafka client. */
(function () {
  var B = LAB.b, G = LAB.get;
  var LG = G.table('consumers.lag'), LT = G.counts('consumers.lag_total'), DG = G.text('consumers.describe_group'), DS = G.text('consumers.describe_state'), KG = G.text('consumers.kafka_groups_list');
  var OT = G.counts('consumers.offsets_topic'), OD = G.text('consumers.offsets_dump'), RD = G.text('consumers.reset_dry_run'), RS = G.text('consumers.reset_shift'), RT = G.text('consumers.reset_datetime');
  var RW = G.text('consumers.reset_while_running');
  var RR = G.table('consumers.rebalance_range'), RC = G.table('consumers.rebalance_cooperative'), RN = G.table('consumers.rebalance_new_protocol'), RB = G.counts('consumers.rebalance_summary');
  var SL = G.counts('consumers.too_slow');
  var PY = G.file('code/consumers.py');
  var READN = G.lines(PY, G.at(PY, /^def read_n/), G.at(PY, /^    cons\.close\(\)/));
  var MEMBER = G.lines(PY, G.at(PY, /^        def on_assign/), G.at(PY, /cons\.subscribe\(\[self\.topic\]/));
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  G.expect(LT.lag_is_end_minus_committed === true && LT.records === 6000, 'lag is the end minus the committed offset');
  G.expect(OT.partition_computed >= 0 && OT.partition_computed < 50 && OT.offset_commit_records_for_the_group_found_there >= 6, 'the commits of a group are in one partition of __consumer_offsets');
  var eagerJoin = RB.range['B joins'], coopJoin = RB.cooperative['B joins'], newJoin = RB.new_protocol['B joins'];
  G.expect(eagerJoin.partitions_revoked_in_all === 6 && coopJoin.partitions_revoked_in_all === 3 && newJoin.partitions_revoked_in_all === 3, 'an eager rebalance revokes every partition, the others only those that move');
  G.expect(SL.poll_errors.length >= 1 && SL.poll_errors[0][0] === '_MAX_POLL_EXCEEDED' && SL.commit_error[0] === 'UNKNOWN_MEMBER_ID', 'a slow consumer is removed from the group');
  var lagMax = LG.rows.slice().sort(function (a, b) { return b[3] - a[3]; })[0];
  var coopC = RB.cooperative['C joins'], eagerC = RB.range['C joins'], newC = RB.new_protocol['C joins'];

  LAB.addChapter({
    id: 'm6', n: 6, title: 'Consumers and consumer groups', short: 'Groups', blurb: 'Offsets, lag, the offsets topic, three kinds of rebalance, and a consumer that is too slow', minutes: 55,
    focus: ['mart', 'ci', 'mon'],
    goals: [
      'Explain how a **consumer group** shares a topic, and what an **offset commit** is.',
      'Read **lag**, and say where a group\'s position is stored.',
      '**Reset** a group\'s position safely.',
      'Compare an **eager**, a **cooperative** and the **new protocol** rebalance, with numbers.',
      'Explain **session** and **poll** timeouts, and why a consumer is kicked out.',
      'Know what a **share group** is, and when it fits.'
    ],
    say: 'Mission 6 is the reader. The surprise of Kafka consumption is that the broker does not track who has read what. Each group keeps its own position, in a topic, and the group decides who reads which partition. That is why one stream can feed many groups, and why a rebalance can stop them all. I ran groups, added and removed members, and counted the partitions that moved. Press Next.',
    scenes: [
      B.talk({
        id: 'm6-model', t: 1, src: 'docs', title: 'How a consumer group works',
        say: 'Five ideas make up the model. Press Next.',
        items: [
          ['Consumers pull', 'A consumer asks the broker for records from an offset. The broker does not push, and does not remember what a consumer has read.', 'The reader pulls and keeps its place.'],
          ['A group shares a topic', 'Consumers with the same `group.id` form a **group**. The partitions of the topic are divided among them: **each partition goes to one consumer** of the group at a time.', 'One partition, one consumer, in a group.'],
          ['Different groups are independent', 'Each group has its own position in every partition. The warehouse loader and the fraud checker can read the same topic at different speeds, and one can be hours behind without hurting the other.', 'Many groups, one stream.'],
          ['Commit the position', 'A consumer **commits** its position, the offset of the next record to read, to Kafka. After a restart it resumes from the committed offset. Where there is none, `auto.offset.reset` decides: `earliest` or `latest`.', 'A commit is a bookmark.'],
          ['The coordinator', 'One broker is the **group coordinator** for each group. It keeps the membership, tells the group when to rebalance, and stores the commits.', 'A broker manages each group.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The interview sentence:', t: 'A consumer group shares a topic by dividing its partitions among its members, each group keeps its own committed offsets, and a rebalance reassigns the partitions when members come and go.' }
      }),

      B.flow({
        id: 'm6-flow', t: 1, src: 'docs', title: 'A group, its partitions and its offsets', g: 'groups', legend: true,
        steps: [
          { say: 'A topic with six partitions, and a group of two consumers. Press Next.', cap: 'Six partitions, two consumers.' },
          { say: 'Step 1. The group\'s coordinator, a broker, sees the topic and its six partitions.', on: ['k1'], focus: ['g_topic', 'g_coord'], cap: 'The coordinator knows the partitions.' },
          { say: 'Step 2. It hands **partitions 0, 1 and 2** to consumer 1. Each partition has exactly one reader.', on: ['k2'], focus: ['g_coord', 'g_c1'], cap: 'Consumer 1 gets three partitions.' },
          { say: 'Step 3. And **partitions 3, 4 and 5** to consumer 2. All six partitions are read, and none is read twice.', on: ['k3'], focus: ['g_c1', 'g_c2'], cap: 'Consumer 2 gets the other three.' },
          { say: 'Step 4. Each consumer **commits** its position to the internal topic `__consumer_offsets`. A key of group, topic and partition, and a value of the offset.', on: ['k4'], focus: ['g_c1', 'g_off'], cap: 'Positions are stored in a topic.' },
          { say: 'Step 5. **Lag** is the end of a partition minus the committed offset. It is the number that tells you whether a consumer keeps up.', on: ['k5'], focus: ['g_off', 'g_lag'], cap: 'Lag is the distance to the end.' },
          { say: 'Step 6. A third consumer has no partition left, and **sits idle**. More consumers than partitions is a waste, except as a spare.', on: ['k6'], focus: ['g_scale', 'g_idle'], cap: 'A seventh consumer would do nothing.' }
        ]
      }),

      B.code({
        id: 'm6-read', t: 1, src: 'rec', title: 'Read some records and commit the position', file: 'consumers.py', lang: 'python', code: READN,
        steps: [
          { say: 'This function is how the recording made a group with a known position. Press Next.', lines: null },
          { say: 'A consumer in the group `g-basic`, with `enable.auto.commit` off. I decide when to commit. It is told which partition to read with `assign`, from offset 0, and reads exactly `n` records.', lines: G.span(READN, /cons = kx\.consumer/, /got = 0/) },
          { say: 'Each record that arrives counts, and the offset of the last one is remembered.', lines: G.span(READN, /while got < n/, /last = m\.offset/) },
          { say: 'Then the **commit**: the offset of the **next** record to read, which is the last one plus 1. `asynchronous=False` waits for the broker to confirm. The consumer closes.', lines: G.span(READN, /cons\.commit/, /cons\.close/) }
        ],
        note: 'Recorded: this code made the position of the group in the next screens. The offset that is committed is the next offset to read, not the last one read.'
      }),

      B.rows({
        id: 'm6-lag', t: 1, src: 'rec', title: 'Lag, read from the tool',
        steps: [
          {
            say: 'Six partitions of a thousand records each. I committed a different position in each, as if six consumers had read different amounts. `kafka-consumer-groups.sh --describe` shows, for each partition, the **committed offset**, the **end** and the **lag**. The biggest lag is partition ' + lagMax[0] + ': ' + n0(lagMax[3]) + ' records.',
            tabs: [{ layer: 'RECORDED', name: 'The lag of the group g-basic', c: 'raw', cols: LG.cols, rows: LG.rows, trk: 0 }],
            notes: ['Recorded. Total: ' + n0(LT.records) + ' records, ' + n0(LT.committed) + ' committed, **' + n0(LT.lag) + ' lag**. Every row satisfies lag = end minus committed: ' + (LT.lag_is_end_minus_committed ? 'yes' : 'no') + '.']
          },
          {
            say: 'This is the tool\'s own output. The group has **no consumer** running, so the last three columns, which name the live member, are dashes. The positions are still there: they live in Kafka, not in the consumers.',
            tabs: [{ layer: 'RECORDED', name: 'kafka-consumer-groups.sh --describe --group g-basic', c: 'raw', cols: ['Output'], rows: DG.split('\n').map(function (l) { return [l.replace(/\s+/g, ' ')]; }), trk: 1 },
                   { layer: 'RECORDED', name: 'kafka-consumer-groups.sh --describe --group g-basic --state', c: 'raw', cols: ['Output'], rows: DS.split('\n').map(function (l) { return [l.replace(/\s+/g, ' ')]; }), trk: 1 }],
            notes: ['Recorded. The state is Empty: no members. The coordinator is the broker that leads the group\'s partition of __consumer_offsets.']
          },
          {
            say: 'Since Kafka 4 there is a newer tool, `kafka-groups.sh`, that lists every kind of group. Groups made with the old protocol are `Classic`. The group that I ran with the new protocol is `Consumer`.',
            tabs: [{ layer: 'RECORDED', name: 'kafka-groups.sh --list', c: 'raw', cols: ['Output'], rows: KG.split('\n').map(function (l) { return [l.replace(/\s+/g, ' ')]; }), trk: 2 }],
            notes: ['Recorded. The groups of the other experiments in this mission are in the list too.']
          }
        ]
      }),

      B.rows({
        id: 'm6-offsets', t: 2, src: 'rec', title: 'Where the positions are stored',
        steps: [
          {
            say: 'A group\'s positions live in `__consumer_offsets`, a topic of 50 partitions. The partition for a group is found with a hash of its name: the Java **hashCode** of `' + OT.group + '`, which is **' + OT.java_hash + '**, made positive, modulo **' + OT.partitions_of_the_topic + '**. That is partition **' + OT.partition_computed + '**. The leader of that partition is the group\'s coordinator.',
            tabs: [{ layer: 'RECORDED', name: 'How a group name picks a partition', c: 'raw', cols: ['Step', 'Value'], rows: [['Group name', OT.group], ['Java hashCode', OT.java_hash], ['Absolute value modulo 50', OT.partition_computed], ['Commit records for the group found in that partition', OT.offset_commit_records_for_the_group_found_there]], trk: 0 }],
            notes: ['Recorded: I computed the partition, then opened that partition\'s log with kafka-dump-log --offsets-decoder and found the commits of the group in it.']
          },
          {
            say: 'These are the records themselves. The **key** is the group, the topic and the partition. The **value** is the committed offset. A newer commit for the same key replaces the older one when the topic is compacted, so the topic does not grow without bound.',
            tabs: [{ layer: 'RECORDED', name: 'Commit records in __consumer_offsets, decoded', c: 'raw', cols: ['Record'], rows: OD.split('\n').map(function (l) { return [l]; }), trk: 1 }],
            notes: ['Recorded. The time stamp and the topic id are replaced by markers.']
          }
        ]
      }),

      B.rows({
        id: 'm6-reset', t: 1, src: 'rec', title: 'Reset a group: dry run first',
        steps: [
          {
            say: 'To replay, you move the group\'s position. `kafka-consumer-groups.sh --reset-offsets` does it. **Always start with `--dry-run`**: it shows the new offsets and changes nothing. This one asks for the earliest offset.',
            tabs: [{ layer: 'RECORDED', name: '--reset-offsets --to-earliest --dry-run', c: 'raw', cols: ['Output'], rows: RD.split('\n').map(function (l) { return [l.replace(/\s+/g, ' ')]; }), trk: 0 }],
            notes: ['Recorded.']
          },
          {
            say: 'You can also reset to a time. This asks for the offset at 00:30 on 1 January, half an hour into the data: **offset 300** in every partition. And `--shift-by -100` goes back a hundred records from the current position, but never below the start: the tool warns when it would.',
            tabs: [{ layer: 'RECORDED', name: '--to-datetime 2026-01-01T00:30:00.000 --dry-run', c: 'raw', cols: ['Output'], rows: RT.split('\n').map(function (l) { return [l.replace(/\s+/g, ' ')]; }), trk: 1 },
                   { layer: 'RECORDED', name: '--shift-by=-100 --execute', c: 'raw', cols: ['Output'], rows: RS.split('\n').map(function (l) { return [l.replace(/\s+/g, ' ')]; }), trk: 1 }],
            notes: ['Recorded. The last line of the second table is a real warning: a partition whose position was 1 cannot go back 100 and is set to 0.']
          },
          {
            say: 'And a rule: **a running group cannot be reset**. I started a consumer in the group and tried. The tool refuses and says why. Stop the consumers first.',
            tabs: [{ layer: 'RECORDED', name: 'A reset while the group is running', c: 'raw', cols: ['Output'], rows: RW.split('\n').filter(function (l) { return l.trim(); }).map(function (l) { return [l.replace(/\s+/g, ' ')]; }), trk: 2 }],
            notes: ['Recorded.']
          }
        ]
      }),

      B.flow({
        id: 'm6-rebalance', t: 1, src: 'docs', title: 'A rebalance', g: 'rebalance', legend: true,
        steps: [
          { say: 'A group is running. Consumer A holds all six partitions. A second consumer, B, starts. Press Next.', cap: 'A is running, and B arrives.' },
          { say: 'Step 1. Consumer B asks to join the group. The group has to be reshuffled, and the coordinator starts a **rebalance**.', on: ['k1'], focus: ['b_run', 'b_join'], cap: 'A new member triggers a rebalance.' },
          { say: 'Step 2. Partitions are **revoked**. In the old **eager** protocol every member gives up **all** of its partitions. In the **cooperative** and the **new** protocol, only the partitions that must move are taken away.', on: ['k2'], focus: ['b_join', 'b_rev'], cap: 'Some or all partitions are revoked.' },
          { say: 'Step 3. A new assignment is computed: who reads which partition.', on: ['k3'], focus: ['b_rev', 'b_asg'], cap: 'A new assignment.' },
          { say: 'Step 4. The members are told. Now A reads partitions 0, 1 and 2, and B reads 3, 4 and 5.', on: ['k4'], focus: ['b_asg', 'b_new'], cap: 'Partitions are handed out.' },
          { say: 'While this happens, an eager group **reads nothing**. The pause is the cost. A cooperative group keeps reading the partitions that do not move.', on: ['k5'], focus: ['b_rev', 'b_pause'], cap: 'The stop-the-world pause.' },
          { say: 'The incremental protocol keeps the rest reading.', on: ['k6'], focus: ['b_coop', 'b_pause'], cap: 'Incremental: the rest keeps reading.' },
          { say: 'In the new protocol from Kafka 4, the **broker** computes the assignment and the members only send heartbeats. There is no group-wide barrier at all.', on: ['k7'], focus: ['b_srv', 'b_coop'], cap: 'The new protocol: the broker assigns.' }
        ]
      }),

      B.code({
        id: 'm6-member', t: 2, src: 'rec', title: 'Log every assignment', file: 'consumers.py', lang: 'python', code: MEMBER,
        steps: [
          { say: 'To count the partitions that move, I gave each consumer three callbacks, and logged what they received. Press Next.', lines: null },
          { say: '`on_assign` runs when partitions are given to the consumer. It logs them, and then it must **tell the library** to start reading them: `incremental_assign` for the cooperative and the new protocol, `assign` for the eager one.', lines: G.span(MEMBER, /def on_assign/, /incremental_assign/) },
          { say: '`on_revoke` runs when partitions are taken away. It logs them, and stops reading them. In the eager protocol this is **all** of the partitions, every time.', lines: G.span(MEMBER, /def on_revoke/, /self\.current\.clear/) },
          { say: '`on_lost` is for partitions that were taken **without notice**, after the consumer was already removed from the group.', lines: G.span(MEMBER, /def on_lost/, /unassign/) }
        ],
        note: 'Recorded: this is the code of the experiment on the next screens. One thread per consumer, three consumers named A, B and C.'
      }),

      B.rows({
        id: 'm6-eager', t: 1, src: 'rec', title: 'The eager rebalance: everyone stops',
        steps: [
          {
            say: 'Three consumers join a topic of six partitions one by one, and then B leaves. This is the **range** assignor of the classic protocol, the eager one. Read the table from the top. When B joins, A **revokes all six** partitions, and only then are they handed out again.',
            tabs: [{ layer: 'RECORDED', name: 'Eager (range): every event of the run', c: 'raw', cols: RR.cols, rows: RR.rows, trk: 0 }],
            notes: ['Recorded. B joins: ' + eagerJoin.partitions_revoked_in_all + ' partitions revoked. C joins: ' + eagerC.partitions_revoked_in_all + ' revoked. B leaves: the other two give up all their partitions too.']
          },
          {
            say: 'Count it. When B joined a group of one, **' + eagerJoin.partitions_revoked_in_all + ' of 6** partitions stopped, although B needed only three. When C joined, **' + eagerC.partitions_revoked_in_all + ' of 6** stopped, although C needed two. Everything pauses on every change. In a group of fifty consumers, one restart stops all fifty.',
            tabs: [{ layer: 'RECORDED', name: 'Partitions revoked, eager', c: 'raw', cols: ['Event', 'Partitions revoked', 'Partitions that had to move'], rows: [['B joins a group of one', eagerJoin.partitions_revoked_in_all, 3], ['C joins a group of two', eagerC.partitions_revoked_in_all, 2]], trk: 1 }],
            notes: ['Recorded for the revoked column. The last column is the minimum: six partitions over three consumers is two each, so C needs two.']
          }
        ]
      }),

      B.rows({
        id: 'm6-coop', t: 1, src: 'rec', title: 'Cooperative and the new protocol: only what moves',
        steps: [
          {
            say: 'The same run with the **cooperative-sticky** assignor. When B joins, A gives up only **' + coopJoin.partitions_revoked_in_all + '** partitions, the ones that B takes, and keeps reading the other three. When C joins, only **' + coopC.partitions_revoked_in_all + '** move. There are extra empty "assigned" lines: the protocol takes **two rounds**, one to revoke and one to assign.',
            tabs: [{ layer: 'RECORDED', name: 'Cooperative-sticky: every event with partitions', c: 'raw', cols: RC.cols, rows: RC.rows, trk: 0 }],
            notes: ['Recorded. Callbacks with no partitions were not drawn: ' + coopJoin.callbacks_with_no_partitions + ' when B joined, and ' + coopC.callbacks_with_no_partitions + ' when C joined. They are the second round.']
          },
          {
            say: 'Then the **new protocol** of Kafka 4, `group.protocol=consumer`. The broker does the assignment. B joins: A gives up **' + newJoin.partitions_revoked_in_all + '**. C joins: **' + newC.partitions_revoked_in_all + '** move, and there are no empty rounds in the table. It is the same minimum as the cooperative one, with fewer messages and with the work done on the broker.',
            tabs: [{ layer: 'RECORDED', name: 'The new consumer protocol: every event', c: 'raw', cols: RN.cols, rows: RN.rows, trk: 1 }],
            notes: ['Recorded. The documentation says the new protocol is generally available since Kafka 4.0, with the assignment and the session timeout controlled by the server. Which partition each consumer gets can differ between runs: the numbers moved do not.']
          },
          {
            say: 'Put the three side by side. The count is the number of partitions that stopped being read, in the recording.',
            tabs: [{ layer: 'RECORDED', name: 'Partitions revoked, by protocol', c: 'raw', cols: ['Event', 'Eager (range)', 'Cooperative-sticky', 'New protocol'],
              rows: [['B joins a group of one', eagerJoin.partitions_revoked_in_all, coopJoin.partitions_revoked_in_all, newJoin.partitions_revoked_in_all], ['C joins a group of two', eagerC.partitions_revoked_in_all, coopC.partitions_revoked_in_all, newC.partitions_revoked_in_all]], trk: 2 }],
            notes: ['Recorded.']
          }
        ]
      }),

      B.widget({ id: 'm6-lab', kind: 'grouplab', t: 1, src: 'rec', title: 'Lab: share the partitions' }),

      B.rows({
        id: 'm6-slow', t: 1, src: 'rec', title: 'A consumer that is too slow',
        steps: [
          {
            say: 'A consumer must call `poll()` often. If it does not, the group assumes it is stuck and **removes it**. I set `max.poll.interval.ms` to six seconds and made the "processing" take eight and a half. Three things happened. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'What the consumer saw', c: 'raw', cols: ['Event', 'What it said'],
              rows: [['The next poll()', SL.poll_errors[0][0] + ': ' + SL.poll_errors[0][1]], ['The callbacks, in order', SL.events.join(', ')], ['An attempt to commit', SL.commit_error[0] + ': ' + SL.commit_error[1]]], trk: 0 }],
            notes: ['Recorded. The consumer lost its partitions, rejoined the group as a new member, and then was revoked again when it closed. The commit failed because the group no longer knew it.']
          },
          {
            say: 'The record that it was processing is **not committed**, and another consumer, or the same one after it rejoined, will read it again. That is the at-least-once behaviour of mission 7. If your processing is not safe to repeat, a slow batch causes duplicates.',
            tabs: [{ layer: 'RECORDED', name: 'The two timeouts', c: 'raw', cols: ['Setting', 'What it protects against', 'In this recording'],
              rows: [['max.poll.interval.ms', 'a consumer that is alive but stuck in processing', SL.max_poll_interval_ms + ' ms, exceeded by processing for ' + SL.processing_took_seconds + ' s'], ['session.timeout.ms', 'a consumer that is dead and sends no heartbeats', '45 seconds by default']], trk: 1 }],
            notes: ['The first row is recorded. The default of the session timeout is from the documentation and the broker defaults of mission 1.']
          }
        ]
      }),

      B.talk({
        id: 'm6-settings', t: 2, src: 'docs', title: 'The consumer settings that matter',
        say: 'Six settings explain most consumer incidents. Press Next.',
        items: [
          ['auto.offset.reset', '`earliest` or `latest`: where a group starts when it has no committed offset, or when the committed offset no longer exists. The default is `latest`: a new group sees only new records.', 'Where a new group starts.'],
          ['enable.auto.commit', 'If true, the client commits positions every few seconds by itself. It commits what was **returned by poll**, not what was **processed**, so a crash can lose records. Most pipelines turn it off and commit after the work.', 'Auto-commit can lose records.'],
          ['max.poll.interval.ms', 'The longest gap between two polls. Longer, and the consumer is removed. The default is five minutes. Slow processing needs a smaller batch or a higher limit.', 'The limit on slow processing.'],
          ['max.poll.records', 'The most records that one poll returns. A smaller number means a shorter time between polls.', 'The size of the batch that you must finish.'],
          ['session.timeout.ms and heartbeats', 'A consumer sends heartbeats in a background thread. If none arrive for the session timeout, it is removed. With the new protocol, the broker sets both the heartbeat and the session timeout.', 'The limit on a dead consumer.'],
          ['group.instance.id', 'A fixed identity for a consumer. A **static member** that restarts quickly gets its partitions back without a rebalance, if it returns within the session timeout.', 'Static members avoid a rebalance on restart.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm6-share', t: 3, src: 'docs', title: 'Extra: share groups, a queue on Kafka',
        say: 'Kafka 4 adds a second kind of group for work that looks like a queue. It is from the documentation, and I did not run it. Press Next.',
        items: [
          ['A different kind of group', 'A **share group** exists alongside consumer groups. Its members are share consumers, with a different programming interface.', 'Not a consumer group.'],
          ['Partitions can be shared', 'The documentation says that partitions may be assigned to **several** consumers, and that the number of consumers can exceed the number of partitions.', 'More consumers than partitions is fine.'],
          ['Records are acknowledged one by one', 'A record is acquired with a **lock** for a limited time. The consumer can acknowledge it, release it for another try, or reject it. The default lock is 30 seconds, `share.record.lock.duration.ms`.', 'Per-record acknowledgement.'],
          ['Delivery attempts are counted', 'Each delivery attempt of a record is counted, so a record that keeps failing can be dealt with automatically.', 'A built-in way to stop poison records.'],
          ['What it trades away', 'Order is not kept the way a partition keeps it. Use it when many workers share a pile of independent jobs, and use a consumer group when order by key matters.', 'Parallelism instead of order.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'Check the release:', t: 'The cluster that I ran reports the share group feature at level 2 in kafka-features. Read the documentation of your release for its status before you plan on it.' }
      }),

      B.quiz({
        id: 'm6-q1', t: 1,
        q: 'Six partitions, three consumers in one group. What is true?',
        opts: [
          { t: 'Each consumer reads two partitions, and no partition is read by two consumers', fb: '' },
          { t: 'Each consumer reads all six partitions', fb: 'That would duplicate work.' },
          { t: 'Each consumer reads the same two partitions', fb: 'Partitions are divided among the consumers.' },
          { t: 'The consumers share each partition record by record', fb: 'That is a share group, not a consumer group.' }
        ],
        ok: 0,
        why: 'A consumer group divides the partitions among its members. Each partition has one reader at a time, so the work is shared and the order inside a partition is kept.'
      }),

      B.quiz({
        id: 'm6-q2', t: 1,
        q: 'A consumer has read records 0 to 99 of a partition. Which offset does it commit?',
        opts: [
          { t: '99, the last record that it read', fb: 'That would re-read record 99 after a restart.' },
          { t: '100, the offset of the next record it will read', fb: '' },
          { t: '0, the first offset', fb: 'That would re-read everything.' },
          { t: 'The number of records, whatever the offset', fb: 'Offsets, not counts, are committed.' }
        ],
        ok: 1,
        why: 'The committed offset is the position of the next record to read. After a restart the consumer starts there. In the recording, the code committed the last offset plus one.'
      }),

      B.quiz({
        id: 'm6-q3', t: 1,
        q: 'You add a consumer to a group that uses the old eager protocol. What happens?',
        opts: [
          { t: 'Only the partitions that move are paused', fb: 'That is the cooperative protocol.' },
          { t: 'Every member gives up all of its partitions, and the group is reassigned', fb: '' },
          { t: 'Nothing, the new consumer waits for the next day', fb: 'A join triggers a rebalance at once.' },
          { t: 'The new consumer takes half of the records of each partition', fb: 'A partition goes to one consumer.' }
        ],
        ok: 1,
        why: 'Eager rebalancing revokes all partitions and then hands them out again. In the recording all six partitions stopped when a second consumer joined, although it needed only three.'
      }),

      B.quiz({
        id: 'm6-q4', t: 2,
        q: 'A consumer is busy for ten minutes in one batch and then fails to commit with UNKNOWN_MEMBER_ID. What is the most likely cause?',
        opts: [
          { t: 'The topic was deleted', fb: 'That gives a different error.' },
          { t: 'It did not poll for longer than max.poll.interval.ms, so it was removed from the group', fb: '' },
          { t: 'The commit was too big', fb: 'A commit is a few bytes.' },
          { t: 'A broker ran out of disk', fb: 'That is a broker problem and a different error.' }
        ],
        ok: 1,
        why: 'The default max.poll.interval.ms is five minutes. After that the consumer is removed, and its next commit is refused because the group no longer knows its member id, as in the recording.'
      }),

      B.bug({
        id: 'm6-bug', t: 1, q: 'This consumer must not lose a record if the program crashes while it is processing. Click the line that can lose records.',
        file: 'loader.py', lang: 'python',
        code: ['c = Consumer({"bootstrap.servers": "localhost:9092", "group.id": "loader", "enable.auto.commit": True})', 'c.subscribe(["orders"])', 'while True:', '    msg = c.poll(1.0)', '    if msg is not None:', '        load_into_warehouse(msg.value())'].join('\n'),
        bad: [1],
        hint: 'Who decides when the position is saved?',
        why: 'With `enable.auto.commit` the client commits the positions of records **returned by poll** every few seconds, whether or not `load_into_warehouse` has finished. A crash in between loses those records. Turn it off, and commit after the work is done.',
        fix: ['c = Consumer({"bootstrap.servers": "localhost:9092", "group.id": "loader", "enable.auto.commit": False})', 'c.subscribe(["orders"])', 'while True:', '    msg = c.poll(1.0)', '    if msg is not None:', '        load_into_warehouse(msg.value())', '        c.commit(msg)'].join('\n'),
        cheer: 'Commit after the work, not before it.'
      }),

      B.order({
        id: 'm6-ord', t: 1, q: 'Put what happens when a second consumer joins a group with the cooperative protocol in order.',
        items: [
          'The new consumer sends a join request to the coordinator',
          'The coordinator starts a rebalance, and computes which partitions must move',
          'The consumers that lose a partition are told to revoke just those partitions',
          'A second round hands the revoked partitions to the new consumer',
          'The old consumers never stopped reading the partitions that did not move'
        ],
        why: 'Cooperative rebalancing takes two rounds, first revoke the partitions that move, then assign them. The rest of the group keeps working, and that is the gain.'
      }),

      B.decide({
        id: 'm6-dec', t: 2, src: 'docs', title: 'Decision: how should the warehouse loader read',
        scenario: 'The loader has twenty consumers in a group on a topic of twenty partitions. Deployments restart a few consumers at a time, and each restart stops the whole group for ten to thirty seconds. The business wants the lag below a minute. You choose.',
        opts: [
          { t: 'Keep the classic eager protocol and deploy less often', d: 'No change to the code.', lose: 'The stops come back with every restart and every scale event, and they get longer with more consumers.' },
          { t: 'Move to the new consumer protocol (or cooperative-sticky), and give the consumers static identities', d: 'Only the partitions that move are paused, and a quick restart moves none.', lose: '' },
          { t: 'Run one consumer with twenty threads', d: 'One member, no rebalances.', lose: 'One failure stops everything, and you lose the isolation of separate processes.' }
        ],
        pick: 1,
        why: 'An incremental protocol removes the group-wide pause, and static members avoid a rebalance when a consumer restarts quickly. Together they turn a rolling deployment into a non-event.',
        when: 'A group of three consumers that restarts rarely does not care. Say that you would look at how often the group rebalances first.'
      }),

      B.incident({
        id: 'm6-inc', t: 1, src: 'rec', title: 'Incident: the loader keeps rejoining and the lag grows', time: '11:25',
        alert: '**The warehouse loader\'s lag has grown for an hour, and its logs show the group rebalancing every few minutes.** Each rebalance repeats some records. The loader\'s batches got bigger last week, with a new join to a slow service.',
        clues: ['The error in the logs is a maximum poll interval that was exceeded', 'A batch of 500 records now takes more than five minutes', 'The commit after the batch fails'],
        opts: [
          { t: 'Make a batch finish well inside the poll interval: a smaller max.poll.records, or a higher max.poll.interval.ms, and make the work safe to repeat', fb: '' },
          { t: 'Increase session.timeout.ms', fb: 'The session timeout is about heartbeats. The consumer is alive, but not polling.' },
          { t: 'Add more consumers', fb: 'The group is already rebalancing because members are removed. More members do not fix a slow batch.' },
          { t: 'Turn on auto commit', fb: 'It hides the failed commits and can lose records.' }
        ],
        best: 0,
        why: 'A consumer that does not poll for longer than max.poll.interval.ms is removed, so the group rebalances, its batch is read again, and the next slow batch repeats the cycle. In the recording a processing time of 8.5 seconds against a limit of 6 produced exactly this error and a failed commit.',
        checks: [
          ['Read the consumer log', 'Look for the maximum poll interval error.'],
          ['Measure the time of a batch', 'It must be well inside max.poll.interval.ms.'],
          ['Look at the lag of the group over time', 'It stalls on each rebalance.']
        ],
        tell: 'A batch now takes longer than the poll interval, so the consumer is removed and the group rebalances every time, repeating records. We reduce the batch size so that it finishes in time, and we make the loading idempotent.',
        prevent: ['Keep a batch well below max.poll.interval.ms', 'Alert on the rebalance rate of every group', 'Make processing safe to repeat']
      }),

      B.qa({
        id: 'qa-group', t: 1, tag: 'Consumers', secs: 75,
        q: 'How does a consumer group work?',
        pts: ['Same group.id, partitions divided among members', 'One partition, one consumer', 'Offsets committed to __consumer_offsets', 'Coordinator on a broker', 'Rebalance on joins and leaves'],
        short: 'Consumers with the same `group.id` form a group. The topic\'s partitions are **divided** among the members, and **each partition is read by one member at a time**, so the work is shared and the order inside a partition is kept. Each member **commits** the offset of the next record to read to an internal topic, `__consumer_offsets`, keyed by group, topic and partition. A broker, the **group coordinator**, manages the membership. When a member joins, leaves or is removed, the group **rebalances**: the partitions are handed out again. Other groups reading the same topic are independent, with their own offsets, so many groups can read one stream. A group is limited by the number of partitions.',
        fu: [['What is lag?', 'The end offset of a partition minus the group\'s committed offset. It is the first number to watch.'], ['What if there are more consumers than partitions?', 'The extra consumers are idle. They are spares that take over when a member fails.']],
        trap: 'Saying that consumers in a group each read every record. They share the partitions.',
        real: 'We have twenty partitions and want to double the throughput. What do you do?'
      }),

      B.qa({
        id: 'qa-rebalance', t: 2, tag: 'Consumers', secs: 75,
        q: 'What is a rebalance, and how do you reduce its cost?',
        pts: ['Partitions reassigned when the group changes', 'Eager: all stop. Cooperative: only the moved ones', 'New protocol in Kafka 4: server side, incremental', 'Static members', 'Timeouts: session and poll'],
        short: 'A rebalance is the reassignment of partitions among the members of a group, triggered by a member joining, leaving, being removed, or a change in the topic. With the old **eager** protocol every member gives up all of its partitions and the whole group pauses. In my recording, six of six partitions stopped when a second consumer joined. The **cooperative** assignors move only the partitions that change owner, three of six, in two rounds. The **new consumer protocol**, generally available since Kafka 4, makes the broker compute the assignment, and is fully incremental, with no group-wide barrier. I also use **static membership**, so that a quick restart does not move partitions, and I keep processing short enough for `max.poll.interval.ms`, so that members are not removed by mistake.',
        fu: [['What causes unwanted rebalances?', 'Slow processing that exceeds the poll interval, a missed heartbeat, frequent restarts, and consumers that scale up and down.'], ['What happens to uncommitted work?', 'It is read again by the next owner, so processing must be safe to repeat.']],
        trap: 'Believing that a rebalance is free. A group that rebalances often does little work.',
        real: 'Our group rebalances every few minutes. How do you investigate?'
      }),

      B.qa({
        id: 'qa-lag', t: 1, tag: 'Consumers', secs: 75,
        q: 'What is consumer lag, and what do you do when it grows?',
        pts: ['End offset minus committed offset', 'Per partition and per group', 'Grows: slow consumer, skew, rebalances, a stuck member', 'Check the partition, the processing time, rebalance rate', 'Scale up to the partition count, fix skew'],
        short: 'Lag is the **end offset of a partition minus the group\'s committed offset**: how many records the group has still to read. I look at it **per partition**, because a single hot or stuck partition hides in the total. When it grows, I ask five questions. Is one partition far behind? That is skew, or one stuck consumer. Is the processing slower, for instance a new call to a slow service? Is the group rebalancing often, because of the poll interval or restarts? Are there as many consumers as partitions, so that I can add more? And did the producer rate rise? The fixes follow: spread the key, make the work faster or batched, tune the timeouts, add consumers up to the partition count, or add partitions.',
        fu: [['Where do you get the numbers?', 'The consumer group tool, a lag exporter that reads the offsets topic, or the consumer\'s own metrics.'], ['Is zero lag the goal?', 'No. Steady small lag is normal. A growing lag, or a lag larger than the retention time, is the alarm.']],
        trap: 'Looking only at the total lag of the group.',
        real: 'The lag of one partition has grown for a day. What would you check?'
      }),

      B.recap({
        id: 'm6-recap', n: 6, badge: 'Group Member', color: '#BBF7D0',
        pts: [
          'A **group** divides the partitions among its members: **one partition, one consumer**. Other groups are independent, with their own offsets.',
          'Positions are **committed** to `__consumer_offsets`: the offset of the **next** record. **Lag** is the end minus the committed offset.',
          '**Reset** a group with `--reset-offsets`: dry run first, and the group must be stopped.',
          '**Eager** rebalancing stops every partition: 6 of 6 in the recording. **Cooperative** and the **new protocol** move only what changes: 3 of 6.',
          'A consumer that does not poll within **max.poll.interval.ms** is removed, and its commit fails.',
          'Turn **auto commit** off for pipelines that must not lose records, and make processing safe to repeat.'
        ]
      })
    ]
  });
})();
