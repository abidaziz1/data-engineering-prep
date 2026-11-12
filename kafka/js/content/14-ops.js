/* Mission 14: running Kafka, and testing code that uses it. Real: metrics read over JMX from three brokers and from the controller (healthy, and with a broker dead), a rolling restart under a producer
   that never stops, a partition moved to a new broker, a quota, and real pytest runs. Not run, and said so on the screens: MirrorMaker 2 between two clusters, Kubernetes, managed services, tiered storage,
   real load and a real network (everything ran on one machine, so counts are recorded and rates are not). The sizing lab is arithmetic. */
(function () {
  var B = LAB.b, G = LAB.get;
  var MT = G.table('ops.metrics'), MR = G.counts('ops.metrics_reading'), RS = G.table('ops.rolling_steps'), RR = G.counts('ops.rolling_restart');
  var RG = G.text('ops.reassign_generate'), RE = G.text('ops.reassign_execute'), RV = G.text('ops.reassign_verify'), RL = G.table('ops.reassign_layout'), RX = G.counts('ops.reassign_result');
  var QS = G.text('ops.quota_set'), QD = G.text('ops.quota_described'), QA = G.counts('ops.quota');
  var PC = G.text('tests.pytest_clean'), PB = G.text('tests.pytest_bug'), PU = G.text('tests.pytest_unit_only'), TS = G.counts('tests.summary');
  var OT = G.file('code/app/order_totals.py'), TT = G.file('code/app/test_order_totals.py');
  var FUNC = G.lines(OT, G.at(OT, /^def total_by_store/), G.at(OT, /^    return dict\(totals\), bad/));
  var TESTS = G.lines(TT, G.at(TT, /^class Msg:/), G.at(TT, /^    assert len\(bad\) == 1$/));
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  var mt = function (k) { var r = MT.rows.filter(function (x) { return x[0].indexOf(k) === 0; })[0]; G.expect(!!r, 'metric "' + k + '"'); return r; };
  var urp = mt('under-replicated partitions');
  G.expect(MR.under_replicated_when_healthy === 0 && MR.under_replicated_when_broker_1_is_dead > 0, 'a dead broker makes partitions under-replicated, and a healthy cluster has none');
  G.expect(mt('active controllers')[2] === '1' && mt('active controllers')[3] === '1', 'one active controller before and after');
  G.expect(RR.brokers_restarted === 3 && RR.orders_sent > 100 && RR.lost === 0 && RR.errors === 0, 'a rolling restart under acks=all loses nothing');
  G.expect(RX.replicas_after.join() === '2,3,4' && RX.log_bytes_on_the_new_broker_equals_the_others === true && RX.folder_exists_on_broker['1'] === false, 'the partition moved to the new broker and left broker 1');
  G.expect(QA.sent_more_than_the_burst === true && QA.the_broker_asked_the_client_to_wait === true && QA.the_client_with_the_quota_took_longer === true, 'the quota slows the client down, and the broker tells it to wait');
  G.expect(TS.clean.failed === undefined && TS.clean.passed === TS.tests && TS.with_a_bug.failed >= 1 && TS.unit_tests_only.passed === TS.tests - TS.tests_that_need_a_broker, 'the tests pass, fail with the bug, and the unit tests need no broker');
  var COMP = G.table('producers.compression');

  LAB.addChapter({
    id: 'm14', n: 14, title: 'Running Kafka, and testing what uses it', short: 'Operations', blurb: 'Metrics that matter, a rolling restart, moving a partition, quotas, capacity, and pytest for Kafka code', minutes: 60,
    focus: ['mon', 'qual', 'ci'],
    goals: [
      'Name the **metrics** that say a cluster is in trouble, and read them over **JMX**.',
      'Do a **rolling restart** with no loss, and say what makes it safe.',
      'Move a partition to a **new broker** with the reassignment tool, and say why you throttle it.',
      'Use a **quota** to protect the cluster from a noisy client.',
      'Estimate the **size of a cluster** from throughput, retention and replication.',
      'Test code that reads from Kafka: a **plain function**, a **fake message**, and a **real topic**.'
    ],
    say: 'Mission 14 is the work after the launch: knowing that a cluster is sick, restarting it without losing a message, moving data to a new machine, and testing the code that reads from it. I read the real metrics of a healthy cluster and of one with a dead broker, restarted all three brokers one after another under a producer that never stopped, moved a partition to a fourth broker, set a quota, and ran pytest on a function with and without a bug. Everything ran on one machine, so I record counts, not speeds. Press Next.',
    scenes: [
      B.talk({
        id: 'm14-what', t: 1, src: 'docs', title: 'What running a cluster means',
        say: 'A cluster that works on the day of the launch needs five kinds of care after it. Press Next.',
        items: [
          ['Watching', 'A few **metrics** tell you that something is wrong before the users do: partitions with too few copies, partitions with no leader, the lag of consumers, the disks.', 'Know the five numbers.'],
          ['Changing', 'Upgrades, new settings, new certificates: all need a **rolling restart**, one broker at a time, with the cluster serving all the time.', 'Never all at once.'],
          ['Growing', 'Add a broker, and **move partitions** to it. The tool copies the data, and you limit its speed so that the users do not feel it.', 'Add, then rebalance.'],
          ['Protecting', '**Quotas** stop one client from using all the bandwidth. A noisy batch job should not slow down a payments service.', 'Fairness.'],
          ['Planning', 'Disk, network and brokers come from three numbers: how much you write, how long you keep it, how many copies. It is arithmetic, and you do it before you buy.', 'Capacity is a sum.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The interview sentence:', t: 'I watch under-replicated partitions, offline partitions and consumer lag. I restart one broker at a time and wait for the in-sync replicas to come back before the next one.' }
      }),

      B.flow({
        id: 'm14-flow', t: 1, src: 'docs', title: 'The loop of running a cluster', g: 'ops', legend: true,
        steps: [
          { say: 'This is the cycle of work. Press Next.', cap: 'Watch, change, grow, protect.' },
          { say: 'Step 1. Every broker publishes its **metrics** over JMX: counts of partitions, requests, bytes. A collector reads them every few seconds.', on: ['k1'], focus: ['o_met', 'o_alert'], cap: 'Metrics from every broker.' },
          { say: 'Step 2. A few of them have **alerts**: under-replicated partitions, offline partitions, no active controller, lag. These are the ones that wake someone.', on: ['k1'], focus: ['o_alert'], cap: 'A short list of alerts.' },
          { say: 'Step 3. A change, such as an upgrade, is a **rolling restart**: one broker at a time, and you wait for it to rejoin before the next.', on: ['k2'], focus: ['o_alert', 'o_roll'], cap: 'One broker at a time.' },
          { say: 'Step 4. When the cluster grows, you **move partitions** to the new broker with the reassignment tool, at a limited speed.', on: ['k3'], focus: ['o_roll', 'o_move'], cap: 'Move partitions to the new broker.' },
          { say: 'Step 5. **Quotas** limit how many bytes a client may send or fetch each second, so that no client can starve the others.', on: ['k4'], focus: ['o_move', 'o_quota'], cap: 'A fair share for each client.' },
          { say: 'Step 6. An **upgrade** raises the version of the software, and later the **feature levels**, which you saw in mission 1.', on: ['k5'], focus: ['o_quota', 'o_up'], cap: 'Software first, features after.' },
          { say: 'Step 7. For a disaster, a **second cluster** holds a copy of the data. A tool such as MirrorMaker 2 keeps it current. It was not run in this course.', on: ['k6'], focus: ['o_up', 'o_dr'], cap: 'A copy in another place.' },
          { say: 'Step 8. And the number that users feel is **consumer lag**. It is a metric too, and it closes the loop.', on: ['k7'], focus: ['o_lag', 'o_met'], cap: 'Lag is what the users feel.' }
        ]
      }),

      B.rows({
        id: 'm14-jmx', t: 1, src: 'rec', title: 'The numbers of a healthy cluster, and of a sick one',
        steps: [
          {
            say: 'Every broker has **MBeans**: named counters that you read over **JMX**. I started the brokers with a JMX port each, and read five of them with the `kafka-jmx` tool that comes with Kafka. The first column of the table is a healthy cluster, with three brokers up. The second is the same cluster after I **killed broker 1**.',
            tabs: [{ layer: 'RECORDED', name: 'Five metrics, before and after the loss of a broker', c: 'raw', cols: MT.cols, rows: MT.rows, trk: 0 }],
            notes: ['Recorded: read with `kafka-jmx.sh` from the brokers and from the controller. The controller metrics are on the **controller node only**: a broker does not have them. The values are counts, so they are the same on every machine.']
          },
          {
            say: 'Read the table like an on-call engineer. **Under-replicated partitions**: ' + MR.under_replicated_when_healthy + ' when healthy, and **' + MR.under_replicated_when_broker_1_is_dead + '** after the loss, because the dead broker held a copy of ' + MR.partitions_with_a_replica_on_broker_1 + ' partitions, and the leaders that remained now had one copy too few. This is the **first alarm of a sick cluster**.',
            tabs: [{ layer: 'RECORDED', name: 'Under-replicated partitions', c: 'raw', cols: ['Measure', 'Value'], rows: [['Under-replicated partitions, all brokers up', MR.under_replicated_when_healthy], ['Under-replicated partitions, broker 1 dead', MR.under_replicated_when_broker_1_is_dead], ['Partitions with a copy on broker 1', MR.partitions_with_a_replica_on_broker_1], ['Bean', MR.bean_of_under_replicated]], trk: 1 }],
            notes: ['Recorded. The cluster still served every partition: three copies became two, and `min.insync.replicas` was 2. If a second broker fell, the partitions would stop accepting writes with `acks=all`.']
          },
          {
            say: 'Two other numbers say what did **not** happen. **Offline partitions: ' + MR.offline_when_broker_1_is_dead + '.** Every partition still had a leader, because another broker took over. And the **active controller count** stayed at 1: exactly one controller leads the cluster, before and after. Anything other than 1 is an emergency.',
            tabs: [{ layer: 'RECORDED', name: 'What stayed healthy', c: 'raw', cols: ['Measure', 'Value'], rows: [['Offline partitions, broker 1 dead', MR.offline_when_broker_1_is_dead], ['Active controllers, all brokers up', mt('active controllers')[2]], ['Active controllers, broker 1 dead', mt('active controllers')[3]], ['Partitions led by brokers 2 and 3, together', MR.leaders_on_brokers_2_and_3_when_broker_1_is_dead]], trk: 0 }],
            notes: ['Recorded. The leaders of the partitions of broker 1 moved to brokers 2 and 3, so together they lead all three.']
          }
        ]
      }),

      B.cmp({
        id: 'm14-alerts', t: 1, src: 'docs', title: 'What to alert on',
        say: 'You cannot watch hundreds of metrics. Press Next for the short list, and what each one means.',
        cols: ['Metric', 'Alert when', 'What it means', 'Seen in this course'],
        hl: 1,
        rows: [
          ['Under-replicated partitions', 'above 0 for more than a few minutes', 'a copy is missing or slow: a broker is down or struggling', 'Yes: ' + MR.under_replicated_when_broker_1_is_dead + ' with a dead broker'],
          ['Offline partitions', 'above 0, at once', 'a partition has no leader: it cannot be read or written', 'Yes: ' + MR.offline_when_broker_1_is_dead + ' here'],
          ['Active controller count', 'not exactly 1', 'no controller, or two', 'Yes: 1'],
          ['Partitions under the minimum ISR', 'above 0', 'writes with acks=all are being refused', 'Yes: mission 5'],
          ['Consumer lag', 'grows for some time', 'a consumer cannot keep up, or is stuck', 'Yes: mission 6'],
          ['Disk use of each broker', 'above about 70 or 80 percent', 'retention or traffic grew, and a full disk stops a broker', 'From documentation'],
          ['Request latency (p99)', 'above your target', 'overload, a slow disk, or a noisy client', 'From documentation']
        ],
        pick: 'Page on the first four. They are about whether the data is safe and available. Lag, disk and latency are warnings that give you time.'
      }),

      B.rows({
        id: 'm14-rolling', t: 1, src: 'rec', title: 'A rolling restart under load',
        steps: [
          {
            say: 'An upgrade or a new setting means restarting every broker. Done carelessly, it loses data or stops the writers. I tested the careful way. A producer kept sending, one order every ten milliseconds, with `acks=all` and `min.insync.replicas=2`. Then I restarted **broker 1, then 2, then 3**. Each stop was a **clean shutdown**, so the broker handed its partitions to the others first. I waited until all three copies were in sync before the next one.',
            tabs: [{ layer: 'RECORDED', name: 'The three restarts', c: 'raw', cols: RS.cols, rows: RS.rows }],
            notes: ['Recorded. The third column is the **sum of under-replicated partitions** on the other brokers while one was down: ' + RS.rows[0][2] + ' each time, because three partitions of `rolling` and the three of `gauge`, the topic of the experiment before, each lost a copy. The cluster was one copy short, as expected, and always healed.']
          },
          {
            say: 'Now the count. The producer sent **' + n0(RR.orders_sent) + '** orders during the restarts. A consumer then read the topic. **' + n0(RR.records_in_the_topic) + '** records were in it, **' + RR.distinct_orders + ' distinct** orders. **Lost: ' + RR.lost + '. Duplicates: ' + RR.duplicates + '. Errors reported to the producer: ' + RR.errors + '.**',
            tabs: [{ layer: 'RECORDED', name: 'What the producer sent and what the topic holds', c: 'raw', cols: ['Measure', 'Value'], rows: [['Orders sent', n0(RR.orders_sent)], ['Delivery reports that said OK', n0(RR.delivery_reports_ok)], ['Errors reported', RR.errors], ['Records in the topic', n0(RR.records_in_the_topic)], ['Distinct orders in the topic', n0(RR.distinct_orders)], ['Lost', RR.lost], ['Duplicates', RR.duplicates]], trk: 5 }],
            notes: ['Recorded. The producer used `acks=' + RR.acks + '`, `min.insync.replicas=' + RR.min_insync_replicas + '`, and ' + (RR.idempotent_producer ? 'idempotence on' : 'idempotence off') + '. All of the settings of mission 4 to 7 were needed, together.']
          },
          {
            say: 'What made it safe? Four things. **Clean shutdown**, so leaders move before the broker stops. **`acks=all` with `min.insync.replicas=2`**, so a write is only acknowledged when two copies have it. **Idempotence**, so a retry cannot duplicate a record. And **waiting for the in-sync replicas** before the next broker. Skip the last one and the second restart removes the only other copy.',
            tabs: [{ layer: 'RECORDED', name: 'The recipe', c: 'raw', cols: ['Step', 'Why'], rows: [['Stop one broker with a clean shutdown', 'its leaders move to other brokers first, without an election after a crash'], ['Wait until it is back and in sync', 'the next stop must not remove the last good copy'], ['Check under-replicated partitions is 0', 'it is the signal that the cluster is whole again'], ['Then the next broker', 'one at a time, the controller last'], ['Producers: acks=all, idempotence, retries', 'so that a leader change is invisible']] }],
            notes: ['The first rows are what the recording did. The advice to restart the controller last is from documentation.']
          }
        ]
      }),

      B.rows({
        id: 'm14-reassign', t: 1, src: 'rec', title: 'Adding a broker: move a partition to it',
        steps: [
          {
            say: 'A new broker is empty. **Kafka does not move partitions to it by itself.** I added a **fourth broker** to the cluster, and a topic `moving` with one partition on brokers 1, 2 and 3 and 3,000 records. The reassignment tool can propose a layout: you give it the topics and the brokers to use.',
            tabs: [{ layer: 'RECORDED', name: 'kafka-reassign-partitions --generate', c: 'raw', cols: ['Output'], rows: RG.split('\n').filter(function (l) { return l.trim(); }).map(function (l) { return [l]; }) }],
            notes: ['Recorded. The tool prints the **current** layout, which is a good backup to keep, and a **proposed** one.']
          },
          {
            say: 'I wrote my own plan: the replicas of the partition on brokers **2, 3 and 4**. Broker 1 is no longer to hold it. The `--execute` option starts the move, and I set a **throttle** of ' + n0(RX.throttle_bytes_per_second) + ' bytes per second. A throttle keeps the copying from using the bandwidth that your users need.',
            tabs: [{ layer: 'RECORDED', name: 'kafka-reassign-partitions --execute --throttle', c: 'raw', cols: ['Output'], rows: RE.split('\n').filter(function (l) { return l.trim(); }).map(function (l) { return [l]; }) }],
            notes: ['Recorded. The throttle stays in force until you **verify** the move: the next step removes it.']
          },
          {
            say: 'Then `--verify` says whether the move has finished, and **removes the throttle**.',
            tabs: [{ layer: 'RECORDED', name: 'kafka-reassign-partitions --verify', c: 'raw', cols: ['Output'], rows: RV.split('\n').filter(function (l) { return l.trim(); }).map(function (l) { return [l]; }) }],
            notes: ['Recorded. Forgetting `--verify` leaves the throttle on, and every later move or recovery runs slowly. That is a classic mistake.']
          },
          {
            say: 'Before and after. The partition had replicas on **1, 2, 3**, and now it has them on **2, 3, 4**. The data folder is **gone from broker 1**, and the log on broker 4 has the **same number of bytes** as on the others.',
            tabs: [{ layer: 'RECORDED', name: 'The layout before and after', c: 'raw', cols: RL.cols, rows: RL.rows }, { layer: 'RECORDED', name: 'What is on disk', c: 'raw', cols: ['Broker', 'Has the folder moving-0'], rows: Object.keys(RX.folder_exists_on_broker).map(function (k) { return [k, RX.folder_exists_on_broker[k] ? 'yes' : 'no']; }) }],
            notes: ['Recorded. The sizes of the logs on brokers 2, 3 and 4 are equal: ' + (RX.log_bytes_on_the_new_broker_equals_the_others ? 'yes' : 'no') + '. The number of records was ' + n0(RX.records) + '.']
          }
        ]
      }),

      B.rows({
        id: 'm14-quota', t: 2, src: 'rec', title: 'A quota for a noisy client',
        steps: [
          {
            say: 'One client should not be able to use every byte of bandwidth. A **quota** limits the bytes per second for a client id, a user, or both. I set a producer quota of **' + n0(QA.quota_bytes_per_second) + ' bytes per second** for the client `quota-client`, with the configuration tool, and asked the broker to describe it.',
            tabs: [{ layer: 'RECORDED', name: 'kafka-configs --alter, then --describe', c: 'raw', cols: ['Output'], rows: [[QS], [QD]] }],
            notes: ['Recorded. A quota is stored in the cluster metadata, and takes effect without a restart.']
          },
          {
            say: 'Here is a detail that fooled me. The broker does not measure the rate in one second. It measures it over a **window of ' + QA.window_samples + ' samples of ' + QA.window_seconds_each + ' second**. So a client may **burst** up to the quota times the window before anything happens: ' + n0(QA.quota_bytes_per_second) + ' × ' + QA.window_samples + ' = **' + n0(QA.burst_the_window_allows_bytes) + ' bytes**.',
            tabs: [{ layer: 'RECORDED', name: 'The window of the quota', c: 'raw', cols: ['Measure', 'Value'], rows: [['Quota, bytes per second', n0(QA.quota_bytes_per_second)], ['Samples in the window (quota.window.num)', QA.window_samples], ['Seconds in each sample (quota.window.size.seconds)', QA.window_seconds_each], ['Burst that is allowed before the throttle (arithmetic)', n0(QA.burst_the_window_allows_bytes) + ' bytes']], trk: 3 }],
            notes: ['Recorded: the two window settings read from the broker with `kafka-configs --describe --all`. The multiplication is arithmetic. In my first try I set a quota of 1,000,000 bytes per second and sent 6.4 MB: **nothing was throttled**, because the window allowed 11 MB. A test that sends less than the burst proves nothing. This first try is from my work on the recording, and is not in the shipped recording.']
          },
          {
            say: 'So I sent more than the burst: **' + n0(QA.bytes_sent) + ' bytes** from two clients, one with the quota and one without. The broker does not drop or refuse the records: it tells the client to **wait**. The client with the quota was told to wait up to **' + n0(QA.client_with_the_quota_waited_ms_at_most) + ' ms**. The one without was told **' + n0(QA.client_without_a_quota_waited_ms) + ' ms**. After the burst, the quota forces at least **' + QA.seconds_the_quota_forces_at_least + ' seconds** for this much data.',
            tabs: [{ layer: 'RECORDED', name: 'The throttle time that the brokers reported to each client', c: 'raw', cols: ['Client', 'Longest wait asked by the broker (ms)'], rows: [['quota-client (with the quota)', n0(QA.client_with_the_quota_waited_ms_at_most)], ['no-quota-client', n0(QA.client_without_a_quota_waited_ms)]], trk: 0 }],
            notes: ['Recorded: the producer\'s own statistics, `throttle.max`. The client with the quota took longer to send the same data: ' + (QA.the_client_with_the_quota_took_longer ? 'yes' : 'no') + '. The minimum is arithmetic: (bytes sent − burst) / quota. Rates are not recorded, because everything ran on one machine.']
          }
        ]
      }),

      B.widget({ id: 'm14-lab', kind: 'opslab', t: 1, src: 'rec', title: 'Lab: read the dashboard, then size the cluster' }),

      B.talk({
        id: 'm14-dr', t: 2, src: 'docs', title: 'A second cluster, and managed Kafka',
        say: 'Two more topics that job descriptions mention. Neither was run in this course. Press Next.',
        items: [
          ['MirrorMaker 2', 'A set of three Connect connectors, which you saw in the plugin list of mission 9: **source**, **checkpoint** and **heartbeat**. It copies topics to a second cluster, and translates the consumer group offsets, so that consumers can switch over.', 'Copy to another cluster.'],
          ['Active and passive', 'In **active/passive**, one cluster serves and the other waits. In **active/active**, both serve, and topics are prefixed with the name of the cluster they came from. Failover is not instant: there is lag, and you decide the point to resume from.', 'You choose the loss.'],
          ['Kubernetes', 'Kafka runs on Kubernetes with an operator such as **Strimzi**, which manages brokers as stateful sets with persistent volumes. The hard parts are storage, network names that clients can reach, and rolling restarts that wait for the in-sync replicas.', 'The operator does the rolling restart.'],
          ['Managed services', '**Amazon MSK**, **Confluent Cloud**, **Aiven**, and Azure Event Hubs with its Kafka endpoint run the brokers for you. You stop doing the machines and the upgrades. You still own the **topics, the keys, the schemas, the ACLs, the consumers and the cost**.', 'They run the machines, not your design.'],
          ['Tiered storage', 'Newer Kafka versions can keep old segments in object storage and only recent ones on local disks. It changes the sizing arithmetic a lot.', 'Cheaper long retention.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm14-func', t: 1, src: 'rec', title: 'Code to test: what does a message mean?', file: 'order_totals.py', lang: 'python', code: FUNC,
        steps: [
          { say: 'This function adds up the paid orders of each store, from the messages of a topic. The part that **decides** what a message means is a plain function, with no broker in it. That is the whole trick for testing. Press Next.', lines: null },
          { say: 'It walks the messages. It only calls `value()` on each, so **anything with a `value()` method works** in a test.', lines: G.span(FUNC, /for m in messages/, /json\.loads/) },
          { say: 'A message that is not JSON is **set aside** in a list, and the loop goes on. One bad message does not stop the job.', lines: G.span(FUNC, /except \(ValueError/, /continue/) },
          { say: 'A refunded order is **not a sale**: it is skipped. This is the check that the bug will remove.', lines: G.span(FUNC, /status/, /refunded order/) },
          { say: 'Everything else is added to the total of its store.', lines: G.span(FUNC, /totals\[order/) }
        ],
        note: 'Recorded: the real file. The code that talks to the broker, `read_topic`, is in the same module and is tested separately.'
      }),

      B.code({
        id: 'm14-tests', t: 1, src: 'rec', title: 'Tests: a fake message', file: 'test_order_totals.py', lang: 'python', code: TESTS,
        steps: [
          { say: 'Three tests need **no broker**. Press Next.', lines: null },
          { say: 'A stand-in for a message: a class with one method, `value()`. That is all the function uses.', lines: G.span(TESTS, /^class Msg/, /return self\._value/) },
          { say: 'Test 1: orders of two stores are added up, and no message is set aside.', lines: G.span(TESTS, /def test_paid_orders/, /bad == \[\]/) },
          { say: 'Test 2: a refunded order is **not** counted. This test is the one that catches the bug.', lines: G.span(TESTS, /def test_a_refunded/, /== \{'s01': 300\}/) },
          { say: 'Test 3: a message that is not JSON is set aside, and the rest is still counted.', lines: G.span(TESTS, /def test_a_message_that_is_not_json/, /len\(bad\) == 1/) }
        ],
        note: 'Recorded: the real tests. A fourth test uses a real topic: it is in the file, and needs a broker. It sends sixty orders to a topic of its own, reads them back, and compares the totals.'
      }),

      B.term({
        id: 'm14-pytest-bug', t: 1, src: 'rec', title: 'The same tests, with one check deleted',
        say: 'I made a copy of the function **without the check for refunded orders**, and ran the same four tests against it, with a broker. This is the real pytest output. Press Next.',
        lines: G.plain(PB, { cmd: 'pytest -q  # against order_totals_bug.py' }),
        after: 'Two tests failed, and pytest shows the line and the difference. The unit test says that the total is too high by the refunded order. The test with a real topic fails for the same reason. The bug is a **deleted check**, and a test of that check is what catches it.',
        afterKind: 'tip',
        doneSay: 'A deleted check, found by a test.'
      }),

      B.rows({
        id: 'm14-pytest-all', t: 1, src: 'rec', title: 'Three runs of the same tests',
        steps: [
          {
            say: 'I ran the tests three times. With the **correct** code and a broker, all **' + TS.clean.passed + '** pass. With the **bug**, ' + TS.with_a_bug.failed + ' fail. And with the correct code and **no broker**, the three tests that need none pass, and the test that needs a broker is left out: **the unit tests run anywhere, in a moment**.',
            tabs: [{ layer: 'RECORDED', name: 'pytest -q, three runs', c: 'raw', cols: ['Run', 'Passed', 'Failed', 'Left out', 'Exit code'], rows: [['correct code, with a broker', TS.clean.passed, TS.clean.failed || 0, TS.clean.deselected || 0, TS.clean.exit_code], ['code with the check deleted, with a broker', TS.with_a_bug.passed || 0, TS.with_a_bug.failed, TS.with_a_bug.deselected || 0, TS.with_a_bug.exit_code], ['correct code, unit tests only (-k "not real_topic")', TS.unit_tests_only.passed, TS.unit_tests_only.failed || 0, TS.unit_tests_only.deselected || 0, TS.unit_tests_only.exit_code]] }],
            notes: ['Recorded: counts from the real pytest output. The exit code is what a CI job looks at: 0 passes, anything else fails the build.']
          },
          {
            say: 'This is the output of the run that needed no broker. The test with a real topic was **deselected**, so it did not run.',
            tabs: [{ layer: 'RECORDED', name: 'pytest -q -k "not real_topic"', c: 'raw', cols: ['Output'], rows: PU.split('\n').map(function (l) { return [l]; }) }],
            notes: ['Recorded. The fixture in `conftest.py` skips a test that needs a broker when `KAFKA_BOOTSTRAP` is not set, so the same file works on a laptop and in CI.']
          }
        ]
      }),

      B.talk({
        id: 'm14-testing', t: 2, src: 'docs', title: 'How to test code that uses Kafka',
        say: 'Four layers, from cheap to expensive. Press Next.',
        items: [
          ['Plain functions', 'Put the **decisions** in functions that take a message and return a result. Test them with a fake that has a `value()` method. No broker, milliseconds.', 'Most of your tests.'],
          ['A real topic', 'A few tests that send records to a topic of their own and read them back, as the fourth test does. A topic for each test keeps tests from seeing each other\'s records.', 'A few, against a real broker.'],
          ['In CI', 'Start a broker in the job (a container, or the single-node mode of Kafka), set `KAFKA_BOOTSTRAP`, and run the whole file. The recording used a real three-broker cluster.', 'The same tests, with a broker.'],
          ['Contracts', 'Test that your messages match the schema, and that a new version of the schema is compatible (mission 11).', 'Check the interface.'],
          ['What to avoid', 'Sleeping and hoping that a consumer has caught up. Wait for a condition, with a timeout. And a mock of the whole client: it tests the mock.', 'Wait for conditions.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm14-q1', t: 1,
        q: 'Which metric first tells you that a broker is down or too slow to keep up?',
        opts: [
          { t: 'Under-replicated partitions above zero', fb: '' },
          { t: 'The number of topics', fb: 'It does not change when a broker fails.' },
          { t: 'The size of the log of one partition', fb: 'That is not an alarm.' },
          { t: 'The number of consumer groups', fb: 'It does not show a failure.' }
        ],
        ok: 0,
        why: 'In the recording it was ' + MR.under_replicated_when_healthy + ' on a healthy cluster and ' + MR.under_replicated_when_broker_1_is_dead + ' after broker 1 was killed. A copy is missing, and writes with acks=all are one failure from stopping.'
      }),

      B.quiz({
        id: 'm14-q2', t: 1,
        q: 'You restart brokers one at a time. What must you do before you stop the next one?',
        opts: [
          { t: 'Nothing: Kafka handles it', fb: 'Stopping the next one early can remove the last good copy.' },
          { t: 'Wait until the broker has rejoined and the partitions are in sync, so that under-replicated partitions is 0', fb: '' },
          { t: 'Delete the topics that it held', fb: 'That destroys data.' },
          { t: 'Turn off idempotence', fb: 'It has nothing to do with the order.' }
        ],
        ok: 1,
        why: 'The recording waited for all three copies of each partition before the next restart: ' + n0(RR.orders_sent) + ' orders sent, ' + RR.lost + ' lost. Without the wait, two brokers would be missing at once, and with min.insync.replicas of 2 the writers would stop.'
      }),

      B.quiz({
        id: 'm14-q3', t: 1,
        q: 'You added a fourth broker, and a week later it holds no data. Why?',
        opts: [
          { t: 'Kafka is still copying', fb: 'Kafka never moves existing partitions by itself.' },
          { t: 'Kafka does not move existing partitions to a new broker by itself: you run a reassignment', fb: '' },
          { t: 'New brokers need a restart', fb: 'They do not.' },
          { t: 'The new broker has a different version', fb: 'That would show up in an error.' }
        ],
        ok: 1,
        why: 'Only new topics may be placed on the new broker. For old ones you generate and execute a reassignment, with a throttle, and verify it. The recording did exactly that for the topic `moving`.'
      }),

      B.quiz({
        id: 'm14-q4', t: 2,
        q: 'You finish a reassignment and forget `--verify`. What happens?',
        opts: [
          { t: 'Nothing, the move is already done', fb: 'The move is done, but the throttle is still on.' },
          { t: 'The throttle stays on, and later recoveries and moves run slowly', fb: '' },
          { t: 'The data is deleted from the new broker', fb: 'It is not.' },
          { t: 'The old broker is removed from the cluster', fb: 'It is not.' }
        ],
        ok: 1,
        why: 'The throttle is a setting on the brokers, and `--verify` removes it once the move has finished. Left in place, it limits every replica that has to catch up, which is exactly when you need speed.'
      }),

      B.bug({
        id: 'm14-bug', t: 1, q: 'A script restarts the brokers for an upgrade. A producer with acks=all and min.insync.replicas=2 stops for minutes. Click the line that is wrong.',
        file: 'upgrade.sh', lang: 'bash',
        code: ['for b in broker1 broker2 broker3; do', '  ssh $b "systemctl restart kafka" &', 'done', 'wait', 'echo "upgrade done"'].join('\n'),
        bad: [2],
        hint: 'How many brokers are down at the same moment?',
        why: 'The `&` starts all the restarts **at the same time**. For a while no broker is up, and then each partition has fewer than two in-sync replicas, so writes with `acks=all` are refused. Restart one at a time, and wait until the cluster has no under-replicated partitions before the next.',
        fix: ['for b in broker1 broker2 broker3; do', '  ssh $b "systemctl restart kafka"', '  until [ "$(urp_count)" = "0" ]; do sleep 5; done    # wait for the in-sync replicas', 'done', 'echo "upgrade done"'].join('\n'),
        cheer: 'One at a time, and wait for the in-sync replicas.'
      }),

      B.order({
        id: 'm14-ord', t: 1, q: 'Put a safe rolling restart in order.',
        items: [
          'Check that under-replicated partitions is 0 before you start',
          'Stop one broker with a clean shutdown',
          'Make the change, and start it again',
          'Wait until it has rejoined and every partition is in sync again',
          'Check under-replicated partitions is 0 again',
          'Move on to the next broker'
        ],
        why: 'The checks at the start and in between guarantee that you never remove the last good copy of a partition. The clean shutdown moves leaders first, so producers see only a short pause.'
      }),

      B.decide({
        id: 'm14-dec', t: 2, src: 'docs', title: 'Decision: the cluster is out of disk. What do you do',
        scenario: 'Three brokers are at 85% of their disks, and traffic grows 10% a month. Retention is 14 days on every topic. Two topics hold 70% of the data, and one of them is needed for only two days. You choose.',
        opts: [
          { t: 'Cut the retention of the topic that is needed for two days, then add a broker and move partitions to it, with a throttle', d: 'Frees space now, and adds capacity for the growth.', lose: '' },
          { t: 'Delete the oldest log files from the disks', d: 'Frees space at once.', lose: 'It corrupts the log and the broker may not start. Never touch the files.' },
          { t: 'Do nothing until the disks fill', d: 'No work today.', lose: 'A full disk takes the broker down, and the other brokers fill up as the partitions move.' }
        ],
        pick: 0,
        why: 'Retention is the cheapest lever, and it matches what the data is for. Growth of 10% a month means that you must also add a broker, and a reassignment moves partitions to it. The throttle keeps users safe while it copies.',
        when: 'If every topic really needs 14 days, then add brokers first. Tiered storage can also help (from documentation).'
      }),

      B.incident({
        id: 'm14-inc', t: 1, src: 'rec', title: 'Incident: under-replicated partitions will not go to zero', time: '04:10',
        alert: '**Under-replicated partitions has been 12 for forty minutes, after a rolling restart.** The cluster works, and no client reports errors. The restart script finished. One broker shows the same number of partitions as before.',
        clues: ['The numbers drop slowly when you look at them', 'One broker has a disk that is much slower than the others', 'The throttle of an earlier reassignment was never removed'],
        opts: [
          { t: 'Check the throttle settings and remove them with `--verify`, and look at the slow disk: the followers are catching up slowly', fb: '' },
          { t: 'Restart all the brokers again', fb: 'It makes the cluster less safe, and the followers still have to catch up.' },
          { t: 'Increase min.insync.replicas', fb: 'It makes writes stricter and does not help the followers.' },
          { t: 'Ignore it, since clients are fine', fb: 'You are one failure away from losing availability.' }
        ],
        best: 0,
        why: 'Under-replicated means that followers are behind. After a restart they have to catch up, and a throttle left over from an earlier move limits their speed, as the recording of the reassignment warned. A slow disk does the same.',
        checks: [
          ['Look at which partitions and which followers', 'One broker in all of them points to that broker.'],
          ['List the throttle configs on the brokers and topics', 'A leftover throttle is easy to see.'],
          ['Check the disk and network of the slow broker', 'A slow disk makes followers fall behind.']
        ],
        tell: 'The followers were catching up slowly because an old reassignment throttle was still set. We removed it with the verify step, and the partitions came back in sync.',
        prevent: ['Always run --verify after a reassignment', 'An alert on a throttle that is still set after a day', 'Wait for the in-sync replicas in the restart script']
      }),

      B.incident({
        id: 'm14-inc2', t: 2, src: 'rec', title: 'Incident: a batch job slows down the payments service', time: '14:25',
        alert: '**The payments service has high latency every afternoon at 14:00, when a batch job that used to run at night starts.** Both talk to the same brokers. The brokers are not out of CPU.',
        clues: ['The batch job reads and writes as fast as it can', 'The network of the brokers is near its limit', 'There are no quotas set'],
        opts: [
          { t: 'Set producer and consumer quotas for the batch job\'s client id, so that it is slowed down and the others keep their share', fb: '' },
          { t: 'Add partitions to the topic', fb: 'It does not limit a client.' },
          { t: 'Give the payments service a super user', fb: 'It does not change bandwidth.' },
          { t: 'Turn off compression', fb: 'It would use more bandwidth.' }
        ],
        best: 0,
        why: 'A quota makes the broker tell a client to wait, as in the recording: the client with the quota was asked to wait, and took longer for the same data. The others keep their bandwidth.',
        checks: [
          ['Look at bytes in and out by client id', 'The batch job stands out.'],
          ['Check whether any quota exists', 'None was set.'],
          ['Set a quota and watch the latency of the payments service', 'It should drop.']
        ],
        tell: 'One batch job used most of the bandwidth. We set quotas for its client id, so that the broker slows it down, and the payments service latency went back to normal.',
        prevent: ['A default quota for every client id, with exceptions for the important ones', 'A different client id for each application', 'A dashboard of bytes by client']
      }),

      B.qa({
        id: 'qa-ops', t: 1, tag: 'Operations', secs: 75,
        q: 'How do you monitor a Kafka cluster?',
        pts: ['Under-replicated partitions', 'Offline partitions, active controller', 'Consumer lag', 'Disk and latency', 'JMX into a metrics system'],
        short: 'Every broker publishes **metrics over JMX**, and a collector sends them to a system such as Prometheus. I page on the ones about the safety and availability of data: **under-replicated partitions** above zero for some minutes, **offline partitions** above zero, and an **active controller count** that is not exactly one. In my recording a dead broker took under-replicated partitions from zero to ' + MR.under_replicated_when_broker_1_is_dead + ' while offline partitions stayed at ' + MR.offline_when_broker_1_is_dead + '. Then I have warnings that give me time: **consumer lag** for every important group, **disk use** of each broker, and **request latency**. And I watch the partitions below the minimum in-sync replicas, because those refuse writes with acks=all.',
        fu: [['Which metric do users feel?', 'Consumer lag, and the latency of produce and fetch requests.'], ['Where are controller metrics?', 'On the controller node only.']],
        trap: 'Watching CPU only.',
        real: 'What would you put on the first dashboard of a new cluster?'
      }),

      B.qa({
        id: 'qa-rolling', t: 2, tag: 'Operations', secs: 75,
        q: 'How do you upgrade or restart a Kafka cluster without downtime?',
        pts: ['One broker at a time, clean shutdown', 'Wait for in-sync replicas', 'acks=all, min.insync.replicas 2, idempotence', 'Check under-replicated partitions', 'Software first, features later'],
        short: 'With a **rolling restart**: stop one broker with a **clean shutdown**, so that it hands its leaders to others, make the change, start it, and **wait until every partition is in sync again**, which means under-replicated partitions is zero, before the next broker. The producers must have `acks=all`, `min.insync.replicas` of 2 with three copies, and idempotence, so that a leader change is invisible. I tested it: three brokers restarted under a producer that never stopped, ' + n0(RR.orders_sent) + ' orders sent, **' + RR.lost + ' lost and ' + RR.duplicates + ' duplicated**. For an upgrade I put in the new software first, and raise the **feature levels**, such as the metadata version, later, when every broker runs the new code.',
        fu: [['What if you restart two at once?', 'With min.insync.replicas of 2 and three copies, writes stop, and you risk the last copy.'], ['How do you roll back?', 'Before you raise the feature levels you can go back. After that it is harder, so raise them last.']],
        trap: 'Restarting brokers in parallel to save time.',
        real: 'Your script restarts all brokers at once. What goes wrong?'
      }),

      B.qa({
        id: 'qa-size', t: 2, tag: 'Operations', secs: 75,
        q: 'How do you size a Kafka cluster?',
        pts: ['Write rate times retention times copies', 'Compression', 'Network: in, replication, out for consumers', 'Headroom, and partitions per broker', 'Test with real traffic'],
        short: 'It starts with arithmetic. **Disk** = write rate × retention × replication factor, divided by the compression that you get, with headroom of 30 to 40 percent. For example 20 MB/s for seven days with three copies is 20 × 86,400 × 7 × 3, about 36 TB before compression. In my recording zstd made JSON about **' + COMP.rows[4][4] + '** of its size and gzip **' + COMP.rows[1][4] + '**, so the real number is a fraction of that. **Network** is the write rate into the leaders, **twice that again** for the two followers, and the write rate times the number of consumer groups going out. Then I check the number of partitions for each broker, and the settings of retention, and I **test with a copy of real traffic**, because the arithmetic gives a starting point. Tiered storage changes the disk figure.',
        fu: [['What does adding consumers change?', 'The network out of the brokers grows with the number of groups, and the disk does not change.'], ['What if the estimate is wrong?', 'Add brokers and reassign partitions, as in the recording.']],
        trap: 'Forgetting the replication factor in the disk figure.',
        real: 'We will write 50 MB/s and keep a week. How many brokers?'
      }),

      B.qa({
        id: 'qa-test', t: 2, tag: 'Testing', secs: 60,
        q: 'How do you test code that reads from Kafka?',
        pts: ['Put the logic in plain functions', 'Fake messages with value()', 'A few tests with a real topic', 'A topic per test, wait for conditions', 'The same tests in CI'],
        short: 'I put the **decisions** in plain functions that take a message and return a result, and test those with a **fake message** that has the one method that the function calls. They need no broker and run in milliseconds. In my example, three such tests ran with no broker at all. Then I keep **a few tests with a real topic**: a topic of its own for each test, send known records, read them back, and compare. I **wait for a condition with a timeout** instead of sleeping. In CI I start a broker and run the same file, and a fixture skips the broker tests when none is set. Then a deleted check gets caught: I removed the refund check, and two tests failed with a clear difference.',
        fu: [['What about the schema?', 'Test that messages match it, and that a new version is compatible with the registry.'], ['Should you mock the client?', 'Not the whole client. Mock only the message, and use a real broker for the rest.']],
        trap: 'Sleeping for five seconds and hoping.',
        real: 'How would you test a consumer that updates a database?'
      }),

      B.recap({
        id: 'm14-recap', n: 14, badge: 'Operator', color: '#BBF7D0',
        pts: [
          'Page on **under-replicated partitions**, **offline partitions** and the **active controller count**: ' + MR.under_replicated_when_healthy + ' to ' + MR.under_replicated_when_broker_1_is_dead + ' under-replicated when a broker was killed, and offline stayed at ' + MR.offline_when_broker_1_is_dead + '.',
          'A **rolling restart** is one broker at a time, a clean shutdown, then a wait for the in-sync replicas. The recording: **' + n0(RR.orders_sent) + ' sent, ' + RR.lost + ' lost, ' + RR.duplicates + ' duplicated**.',
          'A new broker is **empty**. A **reassignment** moves partitions to it, with a **throttle**, and **`--verify`** removes the throttle.',
          'A **quota** makes the broker tell a client to wait. The client with it took longer, and the others kept their share.',
          'Disk is **write rate × retention × copies**, divided by compression, plus headroom. Network counts the followers and the consumers. This is arithmetic: test with real traffic.',
          'Test the **plain function** with a fake message, add **a few real-topic tests**, and run them in CI: two tests caught the deleted check.'
        ]
      })
    ]
  });
})();
