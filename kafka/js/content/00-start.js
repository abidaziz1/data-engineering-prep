/* Mission 0: pick a path, see the whole platform, meet the Brewline events, and learn what the tags mean. */
(function () {
  var B = LAB.b, G = LAB.get;
  var SK = G.counts('keys.skew_summary'), CL = G.counts('world.cluster');
  G.expect(SK.records === 12000 && SK.busiest_store === 's01' && SK.partitions === 6, 'the size and shape of the Brewline events');
  G.expect(CL.nodes === 3 && CL.roles === 'broker,controller', 'three combined nodes');
  var n0 = function (x) { return x.toLocaleString('en-US'); };
  var pct = function (x) { return Math.round(x * 1000) / 10 + ' percent'; };
  var TOOLS = 'Apache Kafka ' + G.meta('kafka') + ' in KRaft mode with three brokers on Java ' + G.meta('java') + ', its command line tools, Kafka Connect and Kafka Streams of the same release, the confluent-kafka client ' + G.meta('confluent-kafka') + ' (librdkafka ' + G.meta('librdkafka') + '), PostgreSQL ' + G.meta('postgresql') + ' with Debezium ' + G.meta('debezium') + ', fastavro ' + G.meta('fastavro') + ' and pytest ' + G.meta('pytest');

  LAB.addChapter({
    id: 'm0', n: 0, noIntro: true, title: 'Start here', short: 'Start', blurb: 'Pick your path and see the whole platform', minutes: 9,
    scenes: [
      B.welcome({ id: 'welcome' }),

      B.flow({
        id: 'm0-map', t: 1, src: 'docs', title: 'Brewline and Kafka: the whole picture', g: 'master', legend: true,
        steps: [
          { say: 'Brewline sells coffee in six countries. Every till, every app order and every refund is an event, and today they travel by nightly files that are hours late. This course teaches Apache Kafka by putting those events on a log, one layer at a time. Press Next to walk through the whole platform.', cap: 'The whole platform on one page.' },
          { say: 'Step 1. The sources. The tills, the mobile app and the web shop produce events all day: an order was paid, an order was refunded. Each event is small, and there are a lot of them.', on: ['m1'], focus: ['k_src', 'k_prod'], cap: 'Events from tills, app and web.' },
          { say: 'Step 2. The producers. A producer is a library inside your application. It batches events, picks a partition for each one with a hash of its key, and retries when a broker does not answer. How you configure it decides what you can lose, and what you can duplicate.', on: ['m2'], focus: ['k_prod', 'k_brk'], cap: 'Producers batch, partition and retry.' },
          { say: 'Step 3. The brokers. A topic is cut into partitions. Each partition is a log in files on a disk, with copies on other brokers. A broker does not know who reads, and does not delete a record when it is read. It keeps the log for as long as you say.', on: ['m3'], focus: ['k_brk', 'k_con'], cap: 'Brokers keep logs, and copies of the logs.' },
          { say: 'Step 4. The readers. Consumers in a group share the partitions of a topic. Kafka Connect moves data in and out of other systems. Kafka Streams turns a topic into counts and joins. Every reader keeps its own position, so a new reader can start from the beginning.', on: ['m4'], focus: ['k_con', 'k_use'], cap: 'Every reader has its own position.' },
          { say: 'Step 5. Use. The warehouse, the dashboards and other services read what Kafka carries. A good data engineer thinks about the slowest reader and the one that is added next year.', focus: ['k_use'], cap: 'The next reader comes first.' },
          { say: 'Around the flow sit five controls. Schemas say what a record means. Security says who may write and read. Monitoring watches lag and replicas. Tests keep the code honest. And retention, which is disks times days. Each one has a mission.', focus: ['x_sch', 'x_sec', 'x_mon', 'x_test', 'x_cost'], keepGroups: true, cap: 'Five controls around the flow.' }
        ]
      }),

      B.cmp({
        id: 'm0-levels', t: 1, src: 'docs', title: 'Junior or senior: what changes',
        say: 'The same topics, different expectations. Press Next to read the gap area by area. A senior is judged on what happens when a broker dies, a consumer is slow or a record is sent twice, not on knowing more setting names.',
        cols: ['Area', 'A junior is expected to', 'A senior is expected to'],
        hl: 2,
        rows: [
          ['The log and offsets', 'Say what a topic, a partition and an offset are.', 'Explain segments, indexes and timestamps, and what a fetch at an offset does on disk.'],
          ['Partitions and keys', 'Say that the key picks the partition and keeps order.', 'Size the partition count, predict skew, and explain what adding partitions does to keys.'],
          ['Producers', 'Send records and read the delivery report.', 'Choose acks, batching, compression and idempotence, and explain every error.'],
          ['Replication', 'Say what a leader, a follower and the ISR are.', 'Choose min.insync.replicas, explain unclean election, and survive a lost broker.'],
          ['Consumer groups', 'Read with a group and commit offsets.', 'Explain rebalances, lag, session and poll timeouts, and the new group protocol.'],
          ['Delivery guarantees', 'Say at most once, at least once, exactly once.', 'Make a pipeline exactly-once with transactions, and say where it stops being true.'],
          ['Retention and compaction', 'Set a retention time.', 'Explain why old timestamps are deleted, how compaction and tombstones work.'],
          ['Kafka Connect', 'Run a connector and read its status.', 'Choose converters and transforms, handle bad records, and run Connect safely.'],
          ['Change data capture', 'Say what Debezium does.', 'Handle snapshots, deletes, schema changes and the replication slot that fills a disk.'],
          ['Schemas', 'Use JSON and say its limits.', 'Choose Avro or Protobuf, a compatibility mode, and plan a safe change.'],
          ['Stream processing', 'Say what Kafka Streams is.', 'Design windows, state and changelogs, late data, and exactly-once processing.'],
          ['Security', 'Know that a login and an ACL are different.', 'Design SASL or mTLS, ACLs and principals, and read an authorization error.'],
          ['Operations', 'Read consumer lag.', 'Do a rolling restart, move partitions, set quotas and read the broker metrics.']
        ],
        steps: [
          { upto: 5, say: 'The core: the log, partitions, producers, replicas and groups. A junior knows the words. A senior can look at a number and say what is wrong.' },
          { upto: 9, say: 'The guarantees and the plumbing: delivery, retention, Connect and change data capture. This is where most of the incidents are.' },
          { upto: 13, say: 'Schemas, streams, security and operations. They decide whether the platform is still working, and safe, in a year.' }
        ],
        pick: '**Junior path** if you are starting out or interviewing for a junior data engineer role. **Senior path** if you have run Kafka already: it includes every junior topic and adds the durability, delivery, design and operations decisions. **Everything** adds the newest features and the deepest follow-up questions.'
      }),

      B.rows({
        id: 'm0-setup', t: 1, src: 'rec', title: 'Meet the Brewline events',
        steps: [
          {
            say: 'These are the events that the whole course uses. They are made up, and the same on every run. Each order is a small JSON record, and the key of the record is the store. Twelve stores, and I used ' + n0(SK.records) + ' orders for the experiments on partitions. Store ' + SK.busiest_store + ' sells ' + pct(SK.busiest_store_share) + ' of them: that is the skew you will meet in mission 3. Press Next.',
            tabs: [{
              layer: 'DATA', name: 'The Brewline events', c: 'raw',
              cols: ['Field', 'What it holds', 'Example'],
              rows: [
                ['key', 'the store that sold it, so that one store stays in one partition', 's01'],
                ['order_id', 'a number, increasing', '1'],
                ['customer_id', 'the loyalty customer, or null for a guest', '1000'],
                ['total_cents', 'the price of the order in cents', '300'],
                ['status', 'paid or refunded', 'refunded'],
                ['channel', 'app, counter or web', 'app']
              ],
              trk: 0
            }],
            notes: ['Made up from a fixed rule, so every number in the course can be checked. The timestamp of order n is one second after order n-1, starting on 2026-01-01.']
          },
          {
            say: 'Three facts about the events decide most of the lessons. One store is far bigger than the others. One order in four has no customer. And one order in five is a refund.',
            tabs: [{
              layer: 'FACTS', name: 'What is special about these events', c: 'raw',
              cols: ['Fact', 'Value', 'What it does to the lessons'],
              rows: [
                ['Busiest store', SK.busiest_store + ': ' + pct(SK.busiest_store_share), 'one key gets a third of the records: a hot partition'],
                ['Stores', '12, on ' + SK.partitions + ' partitions', 'some partitions get several stores, and one stays empty'],
                ['Guest orders (no customer id)', 'one in four', 'null values in a schema, and in a join'],
                ['Refunds', 'one in five', 'a status that the consumer must handle']
              ],
              trk: 0
            }],
            notes: ['Mission 3 shows exactly where each store lands.']
          },
          {
            say: 'People matter as much as tools. Producers are written by application teams. Consumers are written by data engineers. An operator runs the cluster and reads the alerts. Each one needs something different from Kafka: a fast write, a correct read, a clear failure.',
            tabs: [{
              layer: 'PEOPLE', name: 'Who needs what', c: 'raw',
              cols: ['Who', 'Does', 'Needs from Kafka'],
              rows: [
                ['Application teams', 'write the producers in the tills and the app', 'a send that is fast, and an answer when it fails'],
                ['Data engineers', 'write consumers, connectors and stream jobs', 'correct order, no loss, no surprise duplicates'],
                ['The operator', 'runs the brokers', 'a failure that says what to do, and numbers to watch'],
                ['Security', 'decides who may read what', 'logins, ACLs and an audit trail']
              ],
              trk: 0
            }],
            notes: ['Mission 14 puts the operator to work during a rolling restart.']
          }
        ]
      }),

      B.talk({
        id: 'm0-how', t: 1, src: 'rec', title: 'How this course works',
        say: 'Six quick things before we start. Press Next for each.',
        items: [
          ['SEE, TRY, SAY', 'Every mission watches something work (**SEE**), makes you practise it (**TRY**), then asks the interview question out loud (**SAY**). Orange blocks in a diagram are data moving. Numbers show the order.', 'Watch first, practise second, speak third.'],
          ['Junior, Senior, Extra', 'A small tag on a screen tells you who it is for. No tag means everybody. **Senior** and **Extra** screens appear only on the wider paths.', 'The tag tells you whether a screen is on your path.'],
          ['Two kinds of screen', 'A **Recorded** tag means I ran something on one machine and wrote down what it did: ' + TOOLS + '. The offsets, the files on disk, the errors and the change events are what those programs really printed or wrote. A **From documentation** tag means the fact comes from the public documentation as I could read it.', 'Recorded, or from documentation. Never mixed up.'],
          ['What one machine can show', 'Everything ran on **one machine**: three brokers in KRaft mode, each with its own folder and its own port. The logs, the replicas, the elections, the errors and the data that was lost are real. What one machine cannot show is the **network** between brokers: no slow link, no partition of the network, no cloud disk. I say so on each screen where it matters. Where I made a failure myself, for instance a lost acknowledgement, the screen says how.', 'Real brokers, no real network.'],
          ['What was not run', 'No managed service (Confluent Cloud, Amazon MSK, Azure Event Hubs), no Kubernetes, no Confluent Schema Registry, no ksqlDB, no tiered storage and no MirrorMaker 2. Those parts are described from documentation, and tagged that way. The Schema Registry screens use a **stand-in** of forty lines that I wrote, and say so. **Times are never shown**: a laptop run says little about a cluster. Counts, offsets and bytes are.', 'Counts and bytes are recorded. Times are not.'],
          ['Controls', 'Press the right and left arrow keys to move. **A-** and **A+** change the text size. **Map** jumps to any mission and switches path. Your progress saves in this browser.', 'Next, Back, arrow keys, Map.']
        ],
        cols: 1
      })
    ]
  });
})();
