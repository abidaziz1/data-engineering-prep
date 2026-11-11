/* Mission 5: replication and failure. Three copies of a partition on three brokers, the in-sync replicas, the high watermark, a leader that is killed, a producer that is refused, and an acknowledged
   record that is lost on purpose. One controller of its own and three brokers, stopped with kill -9. Real Apache Kafka 4.4.0. */
(function () {
  var B = LAB.b, G = LAB.get;
  var LY = G.table('replication.layout'), CP = G.table('replication.copies'), CE = G.counts('replication.copies_equal'), AK = G.table('replication.after_kill'), WD = G.counts('replication.while_one_is_down');
  var AR = G.table('replication.after_restart'), CU = G.table('replication.caught_up'), CQ = G.counts('replication.caught_up_equal'), EP = G.text('replication.epochs'), PE = G.text('replication.preferred_election');
  var PR = G.counts('replication.preferred_election_result'), TD = G.table('replication.two_down'), UM = G.text('replication.under_min_isr'), UC = G.counts('replication.under_replicated_count');
  var AS = G.table('replication.acks_when_short'), UE = G.table('replication.unclean_election'), DO = G.text('replication.describe_offline'), UR = G.table('replication.unclean_result');
  var UL = G.counts('replication.unclean_lost'), TL = G.text('replication.truncation_log'), DS = G.text('replication.describe');
  var PY = G.file('code/replication.py');
  var KILL = G.lines(PY, G.at(PY, /^    # ---- R3: the leader of partition 0 is killed ----/), G.at(PY, /during = try_send/));
  var UNC = G.lines(PY, G.at(PY, /^    # ---- R5: the leader dies with records/), G.at(PY, /extra = \{name: try_send/) + 1);
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  G.expect(CE.same_bytes_on_all_three === true && CE.same_crc_of_every_batch === true, 'three identical copies');
  G.expect(AK.rows[0][1] === 2 && AK.rows[0][3] === '2,3', 'broker 2 leads partition 0 and the in-sync set is 2,3 after broker 1 is killed');
  G.expect(WD.outcomes.delivered === 500 && WD.in_sync_replicas === 2, 'writes continue with two in-sync replicas');
  G.expect(CQ.same_bytes_on_all_three === true && PR.leader_of_partition_0 === 1, 'the restarted broker catches up and the preferred leader returns');
  G.expect(AS.rows[0][3].indexOf('NOT_ENOUGH_REPLICAS') === 0 && AS.rows[1][3].indexOf('delivered') === 0 && AS.rows[2][3].indexOf('delivered') === 0, 'acks=all is refused when too few replicas are in sync');
  var safe = UR.rows.filter(function (r) { return r[0] === 'safe'; })[0], lossy = UR.rows.filter(function (r) { return r[0] === 'lossy'; })[0];
  G.expect(Number(safe[5]) === 0 && Number(lossy[5]) === 50 && UL.lost_count === 50 && UL.safe_lost_count === 0, 'the lossy topic lost 50 acknowledged records and the safe one lost none');
  var lay0 = LY.rows[0], k0 = AK.rows[0];

  LAB.addChapter({
    id: 'm5', n: 5, title: 'Replication and failure', short: 'Replicas', blurb: 'In-sync replicas, failover, min.insync.replicas, and a record that is really lost', minutes: 55,
    focus: ['ing', 'qual', 'ci'],
    goals: [
      'Explain **leader, followers, the in-sync set** and the **high watermark**.',
      'Say what happens, step by step, when a **broker dies**.',
      'Use **min.insync.replicas** with **acks=all** to choose durability.',
      'Explain **unclean leader election**, and when an acknowledged record is lost.',
      'Read **under-replicated** and **under-min-ISR** partitions.',
      'Set up a topic that survives one broker, and say what it costs.'
    ],
    say: 'Mission 5 kills brokers. A Kafka topic with three copies is only safe if you understand what the copies are, which ones count, and what a producer is promised when one dies. I stopped brokers with kill -9 in the middle of writes, watched the leaders move, saw a producer refused on purpose, and lost fifty records that the cluster had acknowledged. Press Next.',
    scenes: [
      B.flow({
        id: 'm5-flow', t: 1, src: 'docs', title: 'Replication for one partition', g: 'replication', legend: true,
        steps: [
          { say: 'One partition with three copies on three brokers. Press Next to follow a write, and then a failure.', cap: 'One partition, three copies.' },
          { say: 'Step 1. The producer sends a batch to the **leader**. Only the leader takes writes for this partition.', on: ['k1'], focus: ['r_p', 'r_lead'], cap: 'Writes go to the leader.' },
          { say: 'Step 2. A **follower** fetches the new records from the leader, as a consumer would, and appends them to its own copy of the log.', on: ['k2'], focus: ['r_lead', 'r_f1'], cap: 'Followers fetch.' },
          { say: 'Step 3. The second follower does the same. Each follower reports how far it has got.', on: ['k3'], focus: ['r_f1', 'r_f2'], cap: 'The other follower copies too.' },
          { say: 'Step 4. The leader keeps the **in-sync replicas**, the ISR: the replicas that have kept up. A replica that falls behind for longer than `replica.lag.time.max.ms` is removed from the set.', on: ['k4'], focus: ['r_lead', 'r_isr'], tags: ['tg_min'], cap: 'The ISR is the set that has kept up.' },
          { say: 'Step 5. The **high watermark** is the highest offset that every replica in the ISR has. Records above it may exist on the leader, but they are not yet safe.', on: ['k5'], focus: ['r_isr', 'r_hw'], cap: 'The high watermark is what all of the ISR has.' },
          { say: 'Step 6. Consumers can read only **up to the high watermark**. A record that could still be lost is never shown to a reader.', on: ['k6'], focus: ['r_hw', 'r_c'], cap: 'Readers see only safe records.' },
          { say: 'Step 7. If the leader dies, the **controller** picks a new leader from the ISR. Records that the new leader has are safe. Records that only the dead leader had, and that were acknowledged with acks=1, are gone.', on: ['k7'], focus: ['r_ctl', 'r_lead'], tags: ['tg_lost'], cap: 'A new leader comes from the ISR.' }
        ]
      }),

      B.rows({
        id: 'm5-layout', t: 1, src: 'rec', title: 'A topic with three copies',
        steps: [
          {
            say: 'I made a topic `repl` with three partitions, three copies of each, and placed them by hand, so that every run is the same. Each partition has a **preferred leader**, the first broker in its list. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Where the copies are', c: 'raw', cols: LY.cols, rows: LY.rows, trk: 0 }],
            notes: ['Recorded. Broker 1 leads partition 0, broker 2 leads partition 1, broker 3 leads partition 2: leadership is spread, so that no broker takes all the writes.']
          },
          {
            say: 'This is the same answer from `kafka-topics.sh --describe`. `Replicas` is where the copies live. `Isr` is the set that is in sync. `Elr` is new in Kafka 4: the **eligible leader replicas**, empty now. The topic has `min.insync.replicas=2`.',
            tabs: [{ layer: 'RECORDED', name: 'kafka-topics.sh --describe --topic repl', c: 'raw', cols: ['Output'], rows: DS.split('\n').map(function (l) { return [l]; }), trk: 1 }],
            notes: ['Recorded. The topic id is replaced by a marker.']
          }
        ]
      }),

      B.talk({
        id: 'm5-terms', t: 1, src: 'docs', title: 'The words of replication',
        say: 'Seven words carry the whole subject. Press Next.',
        items: [
          ['Leader and follower', 'Each partition has one **leader**, which takes the reads and the writes, and followers, which copy it. The leader of one partition can be a follower of another.', 'One leader, the rest follow.'],
          ['Replication factor', 'The number of copies, leader included. Three is the usual choice: it survives the loss of one broker with a safety margin, and of two if you accept stopping writes.', 'How many copies.'],
          ['In-sync replicas (ISR)', 'The replicas that are caught up with the leader. The leader is always in it. A follower that falls behind for `replica.lag.time.max.ms` (30 seconds by default) drops out, and comes back when it has caught up.', 'The copies you can count on.'],
          ['High watermark', 'The offset up to which **all** in-sync replicas have the data. Consumers read up to it, and not beyond.', 'What is safe to read.'],
          ['min.insync.replicas', 'With **acks=all**, a write succeeds only if at least this many replicas, leader included, are in the ISR. With three copies and a value of 2, one broker can be down and writes still work, and a second makes them fail.', 'How few copies you accept.'],
          ['Leader epoch', 'A number that increases each time a partition gets a new leader. Every batch is stamped with it, so that a replica that was ahead of the new leader can see where it must cut its log back.', 'The generation of the leader.'],
          ['Eligible leader replicas (ELR)', 'New in Kafka 4. When the ISR falls below min.insync.replicas, the controller remembers the replicas that were in it. They are safe to elect, even though they have left the ISR, because the high watermark did not advance without them.', 'A safe list for elections.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The interview sentence:', t: 'A partition has a leader and followers; the ISR is the set that has kept up; the high watermark is what all of it has; and with acks=all and min.insync.replicas, I choose how many copies a write needs before it counts.' }
      }),

      B.rows({
        id: 'm5-copies', t: 1, src: 'rec', title: 'Three copies are the same bytes',
        steps: [
          {
            say: 'I sent a thousand orders to partition 0 with `acks=all`. Then I looked at the **file** on each of the three brokers. The same bytes, the same checksum, the same last offset. The followers are not approximations: they are copies.',
            tabs: [{ layer: 'RECORDED', name: 'Partition 0 on each broker', c: 'raw', cols: CP.cols, rows: CP.rows, trk: 0 }],
            notes: ['Recorded: SHA-256 of the .log file, and the checksum of every batch from kafka-dump-log, were equal on all three. ' + (CE.same_bytes_on_all_three ? 'They were.' : 'They were not.') + ' The high watermark of 1,000 is written to a checkpoint file every five seconds.']
          }
        ]
      }),

      B.code({
        id: 'm5-code', t: 1, src: 'rec', title: 'Kill the leader, and keep writing', file: 'replication.py', lang: 'python', code: KILL,
        steps: [
          { say: 'This is the first failure of the recording. Press Next.', lines: null },
          { say: '`stop_node(1, kill=True)` sends **SIGKILL** to the Java process of broker 1, the leader of partition 0. It cannot clean up, and it cannot say goodbye. This is what a crash looks like.', lines: G.span(KILL, /stop_node\(1, kill=True\)/) },
          { say: 'Then the code **waits** until the partition has a new leader and broker 1 is out of the in-sync set. It reads the layout through the admin client until the condition is true. I do not record how long it takes, because times are not recorded.', lines: G.span(KILL, /wait_layout/) },
          { say: 'And the producer keeps going: five hundred more orders to partition 0 with `acks=all`, while one broker is down.', lines: G.span(KILL, /during = try_send/) }
        ],
        note: 'Recorded: kill -9 on a real broker of the cluster, three brokers and one controller of its own, so that the controller quorum is not touched.'
      }),

      B.rows({
        id: 'm5-failover', t: 1, src: 'rec', title: 'The leader dies',
        steps: [
          {
            say: 'This is the layout after broker 1 was killed. Partition 0, which broker 1 led, now has **broker ' + k0[1] + '** as leader, and the in-sync set is **' + k0[3] + '**. The other two partitions lost broker 1 from their in-sync sets too, because it was a follower there.',
            tabs: [{ layer: 'RECORDED', name: 'The layout after kill -9 of broker 1', c: 'raw', cols: AK.cols, rows: AK.rows, trk: 0 }],
            notes: ['Recorded. The new leader came from the in-sync set. The controller noticed that broker 1 was gone when its registration expired: a few seconds, not instantly.']
          },
          {
            say: 'Writes did not stop. I sent **' + WD.sent_to_partition_0 + '** more orders to partition 0 while broker 1 was down: **' + n0(WD.outcomes.delivered) + ' delivered**. The topic needs 2 in-sync replicas, and there were **' + WD.in_sync_replicas + '**, so `acks=all` still worked. One broker down is survived without a single failed write.',
            tabs: [{ layer: 'RECORDED', name: 'Writing with one broker down', c: 'raw', cols: ['Measure', 'Value'],
              rows: [['Orders sent to partition 0', WD.sent_to_partition_0], ['Delivered', WD.outcomes.delivered], ['In-sync replicas', WD.in_sync_replicas], ['min.insync.replicas', WD.min_insync_replicas]], trk: 1 }],
            notes: ['Recorded.']
          }
        ]
      }),

      B.rows({
        id: 'm5-restart', t: 1, src: 'rec', title: 'The broker comes back',
        steps: [
          {
            say: 'I started broker 1 again. It had missed ' + WD.sent_to_partition_0 + ' records. It **fetched** them from the new leader, caught up, and rejoined the in-sync set. The leader of partition 0 did **not** change back: it stayed on broker 2.',
            tabs: [{ layer: 'RECORDED', name: 'After the restart', c: 'raw', cols: AR.cols, rows: AR.rows, trk: 0 }, { layer: 'RECORDED', name: 'The copies, again', c: 'raw', cols: CU.cols, rows: CU.rows, trk: 0 }],
            notes: ['Recorded. The three files are the same bytes again: ' + (CQ.same_bytes_on_all_three ? 'yes' : 'no') + '. A follower that returns first cuts its log back to what the leader says, then fetches the rest.']
          },
          {
            say: 'The **leader epoch** file shows the failover. It has two lines now: epoch 0 began at offset 0, and **epoch 1 began at offset 1,000**, where broker 2 took over. Every batch since carries epoch 1. This is how a replica that was ahead of the new leader knows where to cut its log back.',
            tabs: [{ layer: 'RECORDED', name: 'leader-epoch-checkpoint on the old and the new leader', c: 'raw', cols: ['Line'], rows: EP.split('\n').map(function (l) { return [l]; }), trk: 1 }],
            notes: ['Recorded. The format is: version, number of entries, and one line for each epoch with its first offset.']
          },
          {
            say: 'Leadership is now uneven: broker 2 leads two partitions and broker 1 none. Kafka moves leadership back to the **preferred** leaders by itself, after a while, when `auto.leader.rebalance.enable` is true. I asked for it at once with `kafka-leader-election.sh`.',
            tabs: [{ layer: 'RECORDED', name: 'kafka-leader-election.sh --election-type PREFERRED', c: 'raw', cols: ['Output'], rows: PE.split('\n').map(function (l) { return [l]; }), trk: 2 }],
            notes: ['Recorded. The leader of partition 0 is broker ' + PR.leader_of_partition_0 + ' again, which is its preferred leader.']
          }
        ]
      }),

      B.widget({ id: 'm5-lab', kind: 'isrlab', t: 1, src: 'rec', title: 'Lab: which writes survive' }),

      B.rows({
        id: 'm5-short', t: 1, src: 'rec', title: 'Too few copies: the producer is refused',
        steps: [
          {
            say: 'Now two brokers die: 2 and 3. The topic needs two in-sync replicas, and only broker 1 is left. The in-sync set shrinks to **1** after `replica.lag.time.max.ms`. Every partition is now led by broker 1.',
            tabs: [{ layer: 'RECORDED', name: 'Two brokers down', c: 'raw', cols: TD.cols, rows: TD.rows, trk: 0 }],
            notes: ['Recorded. The recorder shortens replica.lag.time.max.ms to six seconds, so that a laptop shows in seconds what takes half a minute.']
          },
          {
            say: 'A producer with `acks=all` is **refused**: `NOT_ENOUGH_REPLICAS`. All five records failed. The same producer with `acks=1` **succeeded**: the leader is alive and writes. That is the trade. With acks=1 the cluster stays available, and the records exist on one machine only.',
            tabs: [{ layer: 'RECORDED', name: 'Five records, three situations', c: 'raw', cols: AS.cols, rows: AS.rows, trk: 1 }],
            notes: ['Recorded. The producer was set to not retry, so that the first answer is the one reported. With retries it would keep trying until `message.timeout.ms`, and then say `_MSG_TIMED_OUT`.']
          },
          {
            say: 'The cluster can tell you which partitions are in trouble. `kafka-topics.sh --describe --under-min-isr-partitions` lists those below `min.insync.replicas`. Look at the new field. `Isr: 1` and **`Elr: 2,3`**: the controller remembers that brokers 2 and 3 were in sync when the set shrank, so they are the only safe candidates for the next election.',
            tabs: [{ layer: 'RECORDED', name: 'kafka-topics.sh --describe --under-min-isr-partitions', c: 'raw', cols: ['Output'], rows: UM.split('\n').map(function (l) { return [l]; }), trk: 2 }],
            notes: ['Recorded. ' + UC.under_min_isr_partitions + ' partitions were below the minimum, and ' + UC.under_replicated_partitions + ' were under-replicated.']
          }
        ]
      }),

      B.code({
        id: 'm5-unclean-code', t: 2, src: 'rec', title: 'Lose an acknowledged record, on purpose', file: 'replication.py', lang: 'python', code: UNC,
        steps: [
          { say: 'This is the second failure. I want to show a record that was acknowledged and is lost anyway. Press Next.', lines: null },
          { say: 'Two topics, identical except one setting: `unclean.leader.election.enable` is **false** for `safe` and **true** for `lossy`. Both have three copies and `min.insync.replicas=1`. A hundred records are sent with `acks=all`, so every replica has them.', lines: G.span(UNC, /for name, unclean in/, /assert set\(outcome\)/) },
          { say: 'Brokers 2 and 3 are killed. The in-sync set of both topics shrinks to broker 1 alone.', lines: G.span(UNC, /c\.stop_node\(2, kill=True\)/, /wait_layout/) },
          { say: 'Fifty more records are written with `acks=1`. They are **acknowledged**, and they live only on broker 1. Then broker 1 is killed too.', lines: G.span(UNC, /extra = /, /c\.stop_node\(1, kill=True\)/) }
        ],
        note: 'Recorded: this ran on the real brokers. The recording then started broker 2, which has only the first hundred records, and looked at what each topic did.'
      }),

      B.rows({
        id: 'm5-unclean', t: 2, src: 'rec', title: 'A partition with no good leader',
        steps: [
          {
            say: 'Broker 1, which had all 150 records, is dead. Broker 2, which has only the first 100, is alive and was in the topic\'s replica list. Look at what each topic did. `safe` has **no leader**: it will not elect a replica that is not in the in-sync set. `lossy` made broker 2 the **leader**: that is an **unclean** election.',
            tabs: [{ layer: 'RECORDED', name: 'Two topics, the same failure', c: 'raw', cols: UE.cols, rows: UE.rows, trk: 0 }],
            notes: ['Recorded. The partition of `safe` is offline: it cannot be read or written until broker 1 comes back.']
          },
          {
            say: 'The description of the topics shows the same thing. `safe`: `Leader: none`, and the `Elr` and `LastKnownElr` fields name broker 1, the only replica known to be safe. `lossy`: `Leader: 2`.',
            tabs: [{ layer: 'RECORDED', name: 'kafka-topics.sh --describe, both topics', c: 'raw', cols: ['Output'], rows: DO.split('\n').map(function (l) { return [l]; }), trk: 1 }],
            notes: ['Recorded.']
          },
          {
            say: 'Then I started brokers 1 and 3 and wrote twenty more records. **`safe`** has all of its records: nothing was lost, and it was down for a while. **`lossy`** was available at once, and when broker 1 came back it found a new leader with a shorter log, and **cut its own log back to match**. Fifty acknowledged records, order ids ' + UL.lost_order_ids_first_last[0] + ' to ' + UL.lost_order_ids_first_last[1] + ', are **gone**.',
            tabs: [{ layer: 'RECORDED', name: 'What each topic kept', c: 'raw', cols: UR.cols, rows: UR.rows, trk: 2 }],
            notes: ['Recorded. The acknowledged records that were lost: ' + UL.lost_count + ' in `lossy`, ' + UL.safe_lost_count + ' in `safe`.']
          },
          {
            say: 'The broker log has the line where it happened. Broker 1 became a follower of broker 2, and it **truncated** the partition to offset 100, because epoch 0 ended there on the new leader.',
            tabs: [{ layer: 'RECORDED', name: 'From the log of broker 1', c: 'raw', cols: ['Line'], rows: [[TL]], trk: 3 }],
            notes: ['Recorded: the line of server.log, with the time stamp removed.']
          }
        ]
      }),

      B.cmp({
        id: 'm5-trade', t: 1, src: 'docs', title: 'Availability or durability: the settings',
        say: 'Three settings decide what happens when brokers fail. Press Next to read the combinations.',
        cols: ['Setting', 'Safe choice', 'What it costs', 'The other choice'],
        hl: 1,
        rows: [
          ['Replication factor', '3', 'Three times the disk and the replication traffic', '1 or 2: a broker loss can lose data or stop writes'],
          ['min.insync.replicas', '2, with RF 3', 'Writes fail when two brokers are down', '1: writes continue on one copy, and a crash can lose them'],
          ['acks', 'all', 'A little more latency', '1 or 0: the producer is not told about a lost replica'],
          ['unclean.leader.election.enable', 'false (the default)', 'A partition can be offline until a good replica returns', 'true: always available, and may lose acknowledged records'],
          ['Rack or zone spread', 'Copies in different racks or zones', 'Planning, and more traffic between zones', 'All copies in one rack: one failure takes them all']
        ],
        pick: 'For data that matters: replication factor 3, min.insync.replicas 2, acks=all, unclean election off. You choose consistency over availability, and say so.'
      }),

      B.quiz({
        id: 'm5-q1', t: 1,
        q: 'A topic has replication factor 3 and min.insync.replicas 2. Two brokers are down. What happens to a producer with acks=all?',
        opts: [
          { t: 'Its writes succeed, using the one broker that is left', fb: 'The in-sync set has one member, which is below the minimum of two.' },
          { t: 'Its writes fail with NOT_ENOUGH_REPLICAS', fb: '' },
          { t: 'Kafka lowers min.insync.replicas by itself', fb: 'Kafka never changes it.' },
          { t: 'The writes wait forever, with no error', fb: 'The broker answers with an error, and the producer retries until its timeout.' }
        ],
        ok: 1,
        why: 'With acks=all the leader needs at least min.insync.replicas replicas in the ISR. With one left it refuses the write, and the producer reports NOT_ENOUGH_REPLICAS, as in the recording.'
      }),

      B.quiz({
        id: 'm5-q2', t: 1,
        q: 'What is the high watermark?',
        opts: [
          { t: 'The newest offset on the leader', fb: 'That is the log end offset.' },
          { t: 'The highest offset that every replica in the in-sync set has, and the highest that consumers can read', fb: '' },
          { t: 'The offset of the oldest record', fb: 'That is the log start offset.' },
          { t: 'The offset that a consumer committed', fb: 'That is the committed offset.' }
        ],
        ok: 1,
        why: 'Consumers read only below the high watermark, so they never see a record that could be lost if the leader failed. Records between it and the log end offset are on the leader but not yet safe.'
      }),

      B.quiz({
        id: 'm5-q3', t: 1,
        q: 'A broker is killed. A producer with acks=all and min.insync.replicas 2 on a topic with three copies keeps writing. Why does it not fail?',
        opts: [
          { t: 'Two replicas are still in sync, which is the minimum', fb: '' },
          { t: 'acks=all ignores dead brokers', fb: 'It counts the in-sync replicas.' },
          { t: 'The controller creates a replacement at once', fb: 'It does not. The cluster runs with two copies.' },
          { t: 'The dead broker still acknowledges', fb: 'A dead broker cannot acknowledge.' }
        ],
        ok: 0,
        why: 'The leader and one follower are in sync: two, as the topic requires. The recording sent ' + WD.sent_to_partition_0 + ' records with broker 1 dead, and all were delivered.'
      }),

      B.quiz({
        id: 'm5-q4', t: 2,
        q: 'What does unclean.leader.election.enable=true allow?',
        opts: [
          { t: 'A replica that is not in the in-sync set can become the leader, and acknowledged records can be lost', fb: '' },
          { t: 'A faster election, with no other change', fb: 'It changes which replicas can win.' },
          { t: 'Two leaders at the same time', fb: 'A partition always has at most one leader.' },
          { t: 'The producer to skip acks', fb: 'It does not change acknowledgements.' }
        ],
        ok: 0,
        why: 'It trades durability for availability. If every in-sync replica is gone, a stale replica leads, and when the old leader returns it cuts its log back and the records only it had are gone, as the lossy topic showed.'
      }),

      B.bug({
        id: 'm5-bug', t: 1, q: 'The platform team wants a topic that survives one broker failure without stopping writes. Click the line that makes the topic stop accepting writes as soon as one broker is down.',
        file: 'create.sh', lang: 'bash',
        code: ['bin/kafka-topics.sh --bootstrap-server broker1:9092 --create --topic payments \\', '  --partitions 6 --replication-factor 2 \\', '  --config min.insync.replicas=2'].join('\n'),
        bad: [2],
        hint: 'How many copies are there, and how many must be in sync?',
        why: 'With **two** copies and **min.insync.replicas=2**, both must be in sync for a write with acks=all. When one broker is down, only one is left, and every write fails. For "survive one failure and keep writing", use three copies and a minimum of 2.',
        fix: ['bin/kafka-topics.sh --bootstrap-server broker1:9092 --create --topic payments \\', '  --partitions 6 --replication-factor 3 \\', '  --config min.insync.replicas=2'].join('\n'),
        cheer: 'Three copies, two in sync: one can fail.'
      }),

      B.order({
        id: 'm5-ord', t: 1, q: 'Put what happens when the leader of a partition is killed in order.',
        items: [
          'The leader process dies with no goodbye',
          'The controller sees that the broker has stopped heartbeating, and fences it',
          'The controller removes the dead broker from the in-sync sets',
          'The controller picks a new leader from the in-sync set and raises the leader epoch',
          'Producers and consumers learn the new leader from the metadata, and carry on',
          'When the old broker returns, it cuts its log back to the new leader\'s and catches up'
        ],
        why: 'The controller does the electing, from the in-sync set, and the epoch marks the change of generation. Clients refresh their metadata when a request fails. The returning broker truncates, then fetches.'
      }),

      B.decide({
        id: 'm5-dec', t: 2, src: 'docs', title: 'Decision: the settings for the payments topic',
        scenario: 'Brewline has three brokers in three zones. The `payments` topic must not lose a record, and the business can accept a short stop in writes during a bad failure, but not a lost payment. You choose the topic and producer settings.',
        opts: [
          { t: 'Replication factor 3, min.insync.replicas 2, producers with acks=all, unclean election off', d: 'One broker can fail with no stop, and nothing is lost.', lose: '' },
          { t: 'Replication factor 3, min.insync.replicas 1, acks=1, unclean election on', d: 'Always available, and the fastest.', lose: 'A leader failure can lose acknowledged payments, and an unclean election can lose more.' },
          { t: 'Replication factor 2, min.insync.replicas 2, acks=all', d: 'Cheaper, with two copies.', lose: 'When one broker is down, writes stop. It does not survive a single failure.' }
        ],
        pick: 0,
        why: 'Three copies and a minimum of two let one broker fail with writes still working, and acks=all with a clean election means no acknowledged record is lost. If two brokers fail, writes stop, and that is the cost that the business accepted.',
        when: 'For a topic of low value, such as clicks, replication factor 3 with acks=1 trades a little safety for speed. Say what each topic is worth.'
      }),

      B.incident({
        id: 'm5-inc', t: 1, src: 'rec', title: 'Incident: the tills cannot write during a rolling restart', time: '02:10',
        alert: '**While the platform team restarts brokers one at a time, the tills report `NOT_ENOUGH_REPLICAS` for a few seconds on every restart.** Replication factor 3, min.insync.replicas 2. Last month nothing like this happened.',
        clues: ['One broker is restarted, and the next restart starts one minute later', 'Under-replicated partitions show 6 each time, and fall back to 0', 'Yesterday a second broker lost a disk and is still being rebuilt'],
        opts: [
          { t: 'Do not restart the next broker until every partition is back in sync, and finish the rebuild of the broken broker first', fb: '' },
          { t: 'Set min.insync.replicas to 1 for the restart window', fb: 'It hides the problem and exposes the writes to loss.' },
          { t: 'Restart two brokers at once, to finish sooner', fb: 'With one broker already rebuilding, that leaves one copy.' },
          { t: 'Switch the tills to acks=0', fb: 'It silences the error and loses the information.' }
        ],
        best: 0,
        why: 'With three copies and a minimum of two, you can only afford one copy out at a time. If a second broker is still catching up, a restart takes a third copy out of the in-sync set, and writes stop. A rolling restart must wait for the in-sync sets to be full again between brokers.',
        checks: [
          ['Look at under-replicated partitions', 'Zero means every partition is fully in sync and the next broker can go.'],
          ['Check the ISR of an affected partition', 'It shows which brokers are in sync.'],
          ['Check the rebuilding broker', 'It has to be finished before the rolling restart starts.']
        ],
        tell: 'A second broker was still catching up, so each restart left only one copy in sync for a moment and writes were refused, as designed. We pause the rolling restart until under-replicated partitions are zero, and we will make the script wait for that.',
        prevent: ['Make the restart script wait for zero under-replicated partitions between brokers', 'Alert when a broker has been out of the in-sync sets for a long time', 'Never restart a broker while another is recovering']
      }),

      B.incident({
        id: 'm5-inc2', t: 2, src: 'rec', title: 'Incident: acknowledged payments are missing after an outage', time: '06:55',
        alert: '**Fifty payments that the tills were told were accepted are not in the topic or in the warehouse.** Two brokers died together in one zone, and the third came up as leader. The topic has three copies and `unclean.leader.election.enable=true`.',
        clues: ['The payments were written with acks=1 and min.insync.replicas 1', 'The leader that wrote them was the first broker to die', 'A stale replica became the leader'],
        opts: [
          { t: 'Recover the payments from the tills and the source systems, then change the topic: acks=all, min.insync.replicas 2, unclean election off', fb: '' },
          { t: 'Restart the brokers, and the records will come back', fb: 'A truncated log cannot be recovered by a restart.' },
          { t: 'Add a fourth replica', fb: 'It copies what the leader has. It cannot restore what was cut.' },
          { t: 'Read the consumer offsets', fb: 'Offsets only say where a reader was.' }
        ],
        best: 0,
        why: 'The recording shows exactly this. With acks=1 the leader answered before a follower had the records. Then it died, an unclean election chose a replica that lacked them, and when the old leader returned it truncated its log. The records are gone from Kafka. They have to come from the sources, and the settings must change.',
        checks: [
          ['Compare the topic settings with the standard', 'Look at min.insync.replicas, acks of the producers and unclean election.'],
          ['Read the broker log of the old leader', 'A line about truncating the partition says what was cut and where.'],
          ['Ask the sources', 'The tills and the databases still have the payments.']
        ],
        tell: 'Payments were acknowledged by a leader that then died, and a replica that did not have them became leader because unclean election was on. The records were cut from the old leader\'s log when it returned. We restored them from the tills and set acks=all, min.insync.replicas 2 and unclean election off.',
        prevent: ['acks=all and min.insync.replicas 2 for data that matters', 'Keep unclean election off', 'Alert on topics whose settings differ from the standard']
      }),

      B.qa({
        id: 'qa-repl', t: 1, tag: 'Replication', secs: 75,
        q: 'How does Kafka replicate a partition, and what is the ISR?',
        pts: ['A leader and followers', 'Followers fetch from the leader', 'ISR: replicas that have kept up', 'High watermark: what all of the ISR has', 'Consumers read up to the high watermark'],
        short: 'Each partition has one **leader** and followers on other brokers. Producers write to the leader, and the followers **fetch** from it, like consumers, and append the same records. The leader keeps the **in-sync replicas**: the replicas that are caught up, within `replica.lag.time.max.ms`. The **high watermark** is the highest offset that every replica in the ISR has, and consumers can read only up to it, so they never see a record that could be lost in a failover. A producer with acks=all is answered when the whole ISR has the batch, and `min.insync.replicas` sets the smallest ISR for which a write is accepted.',
        fu: [['What if a follower is slow?', 'It drops out of the ISR after replica.lag.time.max.ms, and the writes continue without it. It rejoins when it has caught up.'], ['Is replication synchronous?', 'It is synchronous for the in-sync replicas when acks=all. The followers copy by fetching, so it is pull based.']],
        trap: 'Saying that all replicas must acknowledge. Only the in-sync ones do.',
        real: 'A follower keeps falling out of the ISR. What do you check?'
      }),

      B.qa({
        id: 'qa-fail', t: 1, tag: 'Replication', secs: 75,
        q: 'What happens when a broker dies?',
        pts: ['The controller notices the missed heartbeats', 'It removes the broker from the ISRs', 'It elects new leaders from the ISR', 'Clients refresh their metadata', 'The broker catches up when it returns'],
        short: 'The active **controller** notices that the broker has stopped heartbeating, and fences it. For every partition that the broker led, it picks a **new leader from the in-sync set** and increases the leader epoch. It removes the broker from the in-sync sets of the partitions where it was a follower. Producers and consumers get errors such as not-leader on their next request, refresh the metadata, and continue with the new leaders. With acks=all and enough in-sync replicas, no write fails and no acknowledged record is lost. When the broker returns, it cuts its log back to where the new leader says, fetches what it missed, and rejoins the in-sync set.',
        fu: [['How long does a failover take?', 'Seconds. It is bounded by the broker session timeout, 9 seconds by default, for a crash.'], ['What if the controller dies?', 'The controllers form a quorum, so another one takes over. With a majority gone, the cluster cannot change metadata.']],
        trap: 'Saying that brokers elect leaders among themselves. The controller does.',
        real: 'Walk me through what the tills see when a broker is killed at noon.'
      }),

      B.qa({
        id: 'qa-minisr', t: 2, tag: 'Replication', secs: 75,
        q: 'Explain min.insync.replicas, acks=all and unclean leader election together.',
        pts: ['acks=all waits for the ISR', 'min.insync.replicas: the smallest ISR that is allowed to accept', 'RF 3 and 2: survives one failure', 'Unclean election: availability over durability', 'Default off'],
        short: 'They are the three settings that decide durability against availability. **acks=all** means the leader answers only when every in-sync replica has the write. **min.insync.replicas** is the smallest in-sync set for which the leader accepts a write at all: below it, the producer gets `NOT_ENOUGH_REPLICAS`. With replication factor 3 and a minimum of 2, one broker can fail with no effect, and two failures stop the writes, which protects the data. **Unclean leader election** decides what happens when no in-sync replica is left: false, the default, keeps the partition offline until a good replica returns, so nothing acknowledged is lost. True makes a stale replica the leader, which is available at once and can lose acknowledged records, as I measured: fifty records.',
        fu: [['And ELR?', 'In Kafka 4 the controller keeps the replicas that were in the ISR when it fell below the minimum, so that it can still choose a safe leader, even when the ISR is empty.'], ['What would you set for a click stream?', 'Perhaps acks=1 with a replication factor of 3. A few lost clicks are acceptable, and the cluster stays available.']],
        trap: 'Believing that acks=all alone is enough. Without min.insync.replicas of 2 or more, a single replica in the ISR satisfies it.',
        real: 'We had a loss with acks=all. How is that possible?'
      }),

      B.recap({
        id: 'm5-recap', n: 5, badge: 'Replica Keeper', color: '#FED7AA',
        pts: [
          'A partition has a **leader** and **followers** that fetch. The **ISR** is the set that has kept up. The **high watermark** is what all of it has, and consumers read only below it.',
          'When a broker dies, the **controller** elects a new leader **from the ISR** and raises the **leader epoch**. With acks=all and a big enough ISR, no write fails.',
          '**acks=all** with **min.insync.replicas 2** on three copies survives one broker. With two down, writes are refused with `NOT_ENOUGH_REPLICAS`.',
          '**acks=1** answers before the followers copy: it stayed available with one broker, and it can lose the record.',
          '**Unclean election** trades durability for availability: in the recording it lost 50 acknowledged records. Keep it off.',
          'Look at **under-replicated** and **under-min-ISR** partitions. In Kafka 4 the **ELR** field names the safe replicas.'
        ]
      })
    ]
  });
})();
