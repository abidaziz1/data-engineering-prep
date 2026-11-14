/* Mission 1: the map of Kafka. What Kafka is and is not, the parts of a cluster, KRaft, the tools in the distribution, the defaults that matter, and what job descriptions ask for.
   The cluster is a real Apache Kafka in KRaft mode: three brokers on one machine, read with its own command line tools. */
(function () {
  var B = LAB.b, G = LAB.get;
  var CL = G.counts('world.cluster'), FE = G.table('world.features'), DEF = G.table('world.defaults'), TG = G.table('world.tool_groups'), TL = G.counts('world.tools');
  var IT = G.table('world.internal_topics'), MR = G.counts('world.metadata_records');
  var PY = G.file('code/cluster.py');
  var FMT = G.lines(PY, G.at(PY, /^    def format\(self\)/), G.at(PY, /^        return n$/));
  var def = function (k) { var r = DEF.rows.filter(function (x) { return x[0] === k; })[0]; G.expect(!!r, 'default ' + k); return r; };
  var feat = function (k) { var r = FE.rows.filter(function (x) { return x[0] === k; })[0]; G.expect(!!r, 'feature ' + k); return r; };
  G.expect(CL.version === G.meta('kafka') && CL.voters.length === 3, 'a three node cluster of the recorded version');
  G.expect(def('auto.create.topics.enable')[1] === 'true' && def('default.replication.factor')[1] === '1' && def('unclean.leader.election.enable')[1] === 'false', 'the defaults that the lessons name');
  G.expect(IT.rows.length >= 2 && IT.rows[0][0] === '__consumer_offsets' && Number(IT.rows[0][1]) === 50, 'the internal topics');
  var cons = IT.rows.filter(function (r) { return r[0] === '__consumer_offsets'; })[0], tx = IT.rows.filter(function (r) { return r[0] === '__transaction_state'; })[0];

  LAB.addChapter({
    id: 'm1', n: 1, title: 'The map of Kafka', short: 'Map', blurb: 'What Kafka is, the parts of a cluster, KRaft, the tools and the defaults', minutes: 40,
    focus: ['src', 'stg', 'ing'],
    goals: [
      'Say what a **topic**, a **partition**, a **record** and an **offset** are.',
      'Name the parts of a cluster: **brokers**, **controllers**, **clients**.',
      'Explain **KRaft**, and why Kafka 4 has no ZooKeeper.',
      'Find your way around the **command line tools** that ship with Kafka.',
      'Know the **defaults** that bite: automatic topic creation, one partition, one copy.',
      'Say when Kafka is the right tool, and when it is not.'
    ],
    say: 'Mission 1 is the map. Kafka looks big from outside: brokers, topics, partitions, groups, Connect, Streams. Underneath it is one idea, a log that many programs write to and read from, each at its own pace. Everything in this mission is something I ran: a real three broker cluster in KRaft mode, read with the tools that come in the download. Press Next.',
    scenes: [
      B.talk({
        id: 'm1-what', t: 1, src: 'docs', title: 'What Kafka is',
        say: 'Kafka is a **distributed log** that stores events and lets many programs read them. Press Next for the five words you need.',
        items: [
          ['Record', 'One event: a **key** (optional), a **value**, some headers and a timestamp. The value is bytes. Kafka does not look inside it. An order, a sensor reading and a click are all records.', 'One event, as bytes.'],
          ['Topic', 'A named stream of records, such as `orders`. Producers write to a topic. Consumers read from it. You choose how long the topic keeps its records.', 'A named stream.'],
          ['Partition', 'A topic is cut into **partitions**. A partition is an ordered log of records. Order is kept **inside a partition**, not across the topic. Partitions are how a topic spreads over machines and over consumers.', 'An ordered log. A topic has several.'],
          ['Offset', 'The number of a record inside its partition: 0, 1, 2 and so on. A consumer remembers an offset, and so knows where it stopped.', 'A record\'s number in its partition.'],
          ['Broker', 'A server that stores partitions on disk and answers producers and consumers. A cluster has several, and each partition has copies on more than one.', 'A server that holds logs.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The interview sentence:', t: 'Kafka is a distributed, replicated log: producers append records to partitions, brokers store them for as long as you set, and each consumer keeps its own offset.' }
      }),

      B.flow({
        id: 'm1-cluster', t: 1, src: 'rec', title: 'The cluster that I ran', g: 'cluster', legend: true,
        steps: [
          { say: 'This is the cluster behind every recording in this course: three brokers on one machine, in KRaft mode. Each one is also a controller. Press Next to follow a record.', cap: 'Three brokers, one machine.' },
          { say: 'Step 1. A producer sends a batch of records to the **leader** of a partition. Here the leader of one partition is broker 1.', on: ['k1'], focus: ['c_p', 'c_b1'], cap: 'Writes go to the leader.' },
          { say: 'Step 2. A follower on broker 2 **fetches** the same records from the leader. Followers are ordinary clients of the leader. There is no push.', on: ['k2'], focus: ['c_b1', 'c_b2'], cap: 'Followers fetch.' },
          { say: 'Step 3. The third copy does the same. With three copies, the log survives the loss of two machines, if you wait for them.', on: ['k3'], focus: ['c_b2', 'c_b3'], cap: 'A third copy.' },
          { say: 'Step 4. Each broker stores its partitions as **files** in a data folder: a folder for each partition, with segment files inside. Mission 2 opens one.', on: ['k4'], focus: ['c_b1', 'c_disk'], cap: 'A partition is a folder of files.' },
          { say: 'Step 5. Consumers **fetch** from the leader too. They read records that are safely replicated, and keep their position themselves.', on: ['k5'], focus: ['c_b1', 'c_c'], cap: 'Consumers fetch, and keep their position.' },
          { say: 'Step 6. The **controllers** keep the cluster\'s metadata in a log of their own: which topics exist, which broker leads which partition, which brokers are alive. Three controllers form a quorum, and one of them is the active controller.', on: ['k6'], focus: ['c_ctl', 'c_md'], cap: 'The cluster\'s own state is a log.' },
          { say: 'Step 7. The active controller tells the brokers what changed. When a broker dies, the controller notices and picks new leaders. Mission 5 kills a broker to show it.', on: ['k7'], focus: ['c_ctl', 'c_b2'], cap: 'The controller reacts to failures.' }
        ]
      }),

      B.rows({
        id: 'm1-real', t: 1, src: 'rec', title: 'What the cluster says about itself',
        steps: [
          {
            say: 'I asked the cluster with `kafka-features.sh describe`. These are the **feature levels** that it runs: the version of the metadata format, of the group protocol, of transactions and of the newest features. A rolling upgrade moves them one at a time. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'kafka-features.sh describe', c: 'raw', cols: FE.cols, rows: FE.rows, trk: 0 }],
            notes: ['Recorded: Apache Kafka ' + CL.version + ', three nodes. A feature has a lowest and a highest level that the software supports, and the level that the cluster uses now.']
          },
          {
            say: 'Then I asked for the **quorum** of controllers. Three voters, ports ' + CL.voter_ports.join(', ') + '. One is the leader of the quorum. The numbers that change from second to second are left out.',
            tabs: [{ layer: 'RECORDED', name: 'kafka-metadata-quorum.sh describe --status', c: 'raw', cols: ['Output'], rows: G.text('world.quorum').split('\n').map(function (l) { return [l]; }), trk: 0 }],
            notes: ['Recorded. The broker ports are ' + CL.broker_ports.join(', ') + ' and the controller ports ' + CL.voter_ports.join(', ') + '.']
          },
          {
            say: 'On disk, a node has a small data folder. `meta.properties` holds the cluster id and the node id. The `__cluster_metadata-0` folder is the log of the controllers. The checkpoint files remember how far each log has been flushed. Your topics get a folder each, such as `orders-0`.',
            tabs: [{ layer: 'RECORDED', name: 'The data folder of broker 1 (topic folders left out)', c: 'raw', cols: ['File or folder'], rows: G.text('world.node_dir').split('\n').map(function (l) { return [l]; }), trk: 0 },
                   { layer: 'RECORDED', name: 'meta.properties', c: 'raw', cols: ['Line'], rows: G.text('world.meta_properties').split('\n').map(function (l) { return [l]; }), trk: 0 }],
            notes: ['Recorded. The cluster id and the directory id are random, and shown as markers.']
          }
        ]
      }),

      B.talk({
        id: 'm1-kraft', t: 1, src: 'docs', title: 'KRaft: no ZooKeeper',
        say: 'Older Kafka needed a separate ZooKeeper cluster to hold its metadata. That is gone. Press Next for what replaced it.',
        items: [
          ['Kafka 4 is KRaft only', 'The documentation says that **Apache Kafka 4.0 only supports KRaft mode**, and that ZooKeeper mode has been removed. The cluster I ran is Kafka ' + CL.version + ' and has no ZooKeeper at all.', 'No ZooKeeper in Kafka 4.'],
          ['Controllers keep the metadata', 'A set of nodes, the **controllers**, run a Raft quorum. They keep the metadata (topics, partitions, leaders, configs) in a replicated log named `__cluster_metadata`. Brokers read that log to learn what changed.', 'The metadata is a log.'],
          ['Process roles', 'A node is a **broker**, a **controller**, or **both**. `process.roles=broker,controller` is a combined node, as in my recording. A production cluster usually runs three or five dedicated controllers, so that a busy broker cannot slow the quorum.', 'Combined for small clusters, dedicated for big ones.'],
          ['The quorum needs a majority', 'Three controllers survive the loss of one. Five survive two. If the majority is gone, the cluster cannot create topics or elect leaders, but brokers that still lead partitions keep serving them for a while. Mission 5 shows what a missing controller majority does in a combined cluster.', 'A majority must be alive.'],
          ['Formatting', 'A node must be **formatted** before it starts: `kafka-storage.sh format` writes the cluster id and the node\'s identity into its data folder. Kafka no longer formats by itself, because that hid mistakes.', 'format first, then start.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm1-start', t: 1, src: 'rec', title: 'Start a real cluster', file: 'cluster.py', lang: 'python', code: FMT,
        steps: [
          { say: 'This is the code that made every cluster in this course. It formats three data folders and starts three brokers. The same two commands start one broker by hand. Press Next.', lines: null },
          { say: 'First a **cluster id**, a random identifier that every node of the cluster must share. `kafka-storage.sh random-uuid` makes one.', lines: G.span(FMT, /random-uuid/) },
          { say: 'Each controller also gets a **directory id**. The list of `id@host:port:directory-id` goes to every node as the **initial controllers**: this is how the quorum is bootstrapped with three voters at once.', lines: G.span(FMT, /directory_id = /, /ids\.append/) },
          { say: '`kafka-storage.sh format` runs once for each node, with the cluster id, its properties file, and the list of initial controllers. With a single node, `--standalone` is used instead.', lines: G.span(FMT, /args = \['format'/, /run_tool\('kafka-storage', \*args\)/) },
          { say: 'Then `kafka-server-start.sh` runs with the properties file. The Java process is the broker. A small heap and a folder of its own are enough for a recording.', lines: G.span(FMT, /kafka-server-start\.sh/) }
        ],
        note: 'Recorded: this is the code of kafka/verify/cluster.py that ran. The distribution is the unmodified Apache Kafka ' + G.meta('kafka') + ' binary download, with its own tools.'
      }),

      B.rows({
        id: 'm1-tools', t: 1, src: 'rec', title: 'The tools in the download',
        steps: [
          {
            say: 'The download has ' + TL.scripts_in_bin + ' scripts in `bin`. I used most of them in this course. They are grouped by what they do. Learn the groups, not the list. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'The scripts that this course uses, by purpose', c: 'raw', cols: TG.cols, rows: TG.rows, trk: 0 }],
            notes: ['Recorded: the list of scripts was read from the bin folder of the distribution, and every tool named here exists in it. Not named: ' + TL.not_named.join(', ') + '.']
          }
        ]
      }),

      B.rows({
        id: 'm1-defaults', t: 1, src: 'rec', title: 'The defaults that bite',
        steps: [
          {
            say: 'I asked a broker for its settings with `kafka-configs.sh --describe --all`. These are the ones that surprise people. The last column says where each value comes from: `DEFAULT_CONFIG` is the built-in default. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Settings that matter, as a broker reports them', c: 'raw', cols: DEF.cols, rows: DEF.rows, trk: 0 }],
            notes: ['Recorded. My recorder changed only the timers that make a laptop show in seconds what takes days: the check interval of the retention thread and the delay of the first rebalance. They are named when they matter.']
          },
          {
            say: 'Read four of them aloud. **auto.create.topics.enable is ' + def('auto.create.topics.enable')[1] + '**: a typo in a topic name creates a new topic. **default.replication.factor is ' + def('default.replication.factor')[1] + '** and **num.partitions is ' + def('num.partitions')[1] + '**: a topic created by accident has one copy and one partition. **unclean.leader.election.enable is ' + def('unclean.leader.election.enable')[1] + '**: the safe default. Retention is **' + def('log.retention.hours')[1] + ' hours**, seven days.',
            tabs: [{ layer: 'RECORDED', name: 'Four settings to say aloud', c: 'raw', cols: ['Setting', 'Value', 'The surprise'],
              rows: [['auto.create.topics.enable', def('auto.create.topics.enable')[1], 'a producer that mistypes a topic name creates it'], ['default.replication.factor', def('default.replication.factor')[1], 'an automatic topic has one copy and dies with its broker'],
                     ['num.partitions', def('num.partitions')[1], 'an automatic topic cannot spread over consumers'], ['log.retention.hours', def('log.retention.hours')[1], 'records older than seven days are deleted, judged by their timestamps']], trk: 1 }],
            notes: ['Mission 3 shows a topic that was created by a typo. Mission 8 shows why "judged by their timestamps" matters.']
          }
        ]
      }),

      B.rows({
        id: 'm1-internal', t: 1, src: 'rec', title: 'Topics that Kafka makes for itself',
        steps: [
          {
            say: 'I created one topic, produced two records in a transaction, and read them with a consumer group. Then I listed the topics. Kafka had made two more, with names that start with two underscores. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'The internal topics after a group and a transaction were used', c: 'raw', cols: IT.cols, rows: IT.rows, trk: 0 }],
            notes: ['Recorded. They are created the first time that someone uses a consumer group or a transaction.']
          },
          {
            say: '`__consumer_offsets` stores the position of every consumer group: ' + cons[1] + ' partitions, ' + cons[2] + ' copies of each. `__transaction_state` stores the state of every transaction: ' + tx[1] + ' partitions, ' + tx[2] + ' copies. Kafka stores its own state in Kafka. The cluster\'s metadata is a third log, outside the topics.',
            tabs: [{ layer: 'RECORDED', name: 'What the controllers wrote for one topic', c: 'raw', cols: ['A record of the metadata log, decoded'], rows: G.text('world.metadata_sample').split('\n').map(function (l) { return [l]; }), trk: 1 }],
            notes: ['Recorded with `kafka-dump-log.sh --cluster-metadata-decoder`. These records say that a topic exists and where its partition lives. The kinds of record seen in the log: ' + MR.kinds_seen.join(', ') + '.']
          }
        ]
      }),

      B.cmp({
        id: 'm1-vs', t: 1, src: 'docs', title: 'Kafka, a queue and a database',
        say: 'People ask when to use Kafka. Compare it with a message queue and a database on the questions that decide it. Press Next.',
        cols: ['Question', 'A message queue', 'Kafka', 'A database'],
        hl: 2,
        rows: [
          ['What is stored?', 'Messages until they are taken', 'A log of records for a time you set', 'Current state, with history only if you add it'],
          ['Is a record deleted when it is read?', 'Usually yes, after an acknowledgement', 'No. Retention deletes it, by time or size', 'No'],
          ['Can a new reader start from the past?', 'Usually not', 'Yes, from any retained offset', 'Yes, by querying'],
          ['How many readers?', 'Several share the messages', 'Any number of groups, each with its own position', 'Any number of queries'],
          ['Order', 'Often per queue', 'Per partition, by key', 'By the query'],
          ['Good at', 'Handing work to workers', 'Moving and keeping streams of events', 'Answering questions about state'],
          ['Poor at', 'Replaying history', 'Ad hoc queries, small one-off messages', 'High write rates of immutable events']
        ],
        pick: 'Choose Kafka when many systems need the same stream, when you want to replay it, and when order by key matters. Choose a queue for simple work hand-off, and a database to ask questions of state. They are often used together. Kafka also adds an extension to behave like a queue in newer releases, which mission 6 mentions.'
      }),

      B.cmp({
        id: 'm1-eco', t: 2, src: 'docs', title: 'The tools around Kafka, and what is Apache and what is not',
        say: 'Job descriptions mix names from the Apache project and from companies around it. Press Next to sort them.',
        cols: ['Name', 'What it is', 'In the Apache Kafka download?', 'Where in this course'],
        hl: 3,
        rows: [
          ['Kafka Connect', 'A framework to move data in and out of Kafka with connectors', 'Yes, with file and MirrorMaker connectors', 'Mission 9'],
          ['Kafka Streams', 'A Java library for stream processing on Kafka', 'Yes', 'Mission 12'],
          ['Debezium', 'Connectors that read database change logs', 'No. A separate project, run as a Connect plugin', 'Mission 10'],
          ['Schema Registry', 'A service that stores and checks schemas', 'No. Several implementations exist', 'Mission 11, a stand-in'],
          ['ksqlDB', 'SQL over Kafka streams', 'No. A Confluent project', 'Named only'],
          ['MirrorMaker 2', 'Copies topics between clusters', 'Yes, as Connect connectors', 'Mission 14, from documentation'],
          ['Confluent Cloud, Amazon MSK, Azure Event Hubs', 'Managed services and a Kafka-compatible service', 'No. Not Apache Kafka itself', 'Named only']
        ],
        pick: 'Learn the Apache parts well: the log, Connect, Streams and the tools. Learn the others by what they add, and by whether they are open source in the posting you are reading.'
      }),

      B.cmp({
        id: 'm1-jd', t: 1, src: 'docs', title: 'What job descriptions ask about Kafka',
        say: 'I read a small sample of data engineer and Kafka job descriptions and the writing about them, through search. I read the summaries and not every posting, so this is the direction and not a count. Press Next to read the pattern.',
        cols: ['What the postings name', 'How often', 'Where in this course'],
        hl: 2,
        rows: [
          ['Kafka internals: partitions, offsets, consumer groups, replication, in-sync replicas', 'In nearly every Kafka posting', 'Missions 2 to 6'],
          ['Exactly-once semantics, idempotent producers, transactions', 'Often, mostly senior roles', 'Missions 4 and 7'],
          ['Kafka Connect, and Debezium for change data capture', 'Often. Debezium is the CDC tool named most', 'Missions 9 and 10'],
          ['Schema Registry, Avro, Protobuf, compatibility rules', 'Often. A main duty in some postings', 'Mission 11 (the registry is a stand-in)'],
          ['Kafka Streams or ksqlDB, or Flink or Spark Structured Streaming', 'Often. Flink was named more often than Spark', 'Mission 12. Spark has its own course. Flink is planned'],
          ['Security: SASL, mTLS, ACLs, RBAC', 'Common', 'Mission 13. RBAC is not part of Apache Kafka'],
          ['Monitoring consumer lag, high availability and disaster recovery, Kubernetes, Terraform', 'Common in platform roles', 'Mission 14. Kubernetes and Terraform from documentation'],
          ['Python and SQL, Airflow or dbt, observability tools', 'Often, as adjacent skills', 'Planned as courses of their own']
        ],
        steps: [
          { upto: 2, say: 'The core is the most asked. Partitions, offsets, groups and replicas appear in almost every posting, and exactly-once appears as a senior expectation.' },
          { upto: 5, say: 'The tools around Kafka come next: Connect and Debezium, schemas, and stream processing. Many postings accept Flink or Spark in place of Kafka Streams.' },
          { upto: 8, say: 'Security and operations are common in platform roles. Python, SQL and an orchestrator are named as the skills around Kafka.' }
        ],
        pick: 'Read these as examples from a sample, not as a survey. The README of this course lists the search questions and says that.'
      }),

      B.quiz({
        id: 'm1-q1', t: 1,
        q: 'Where is the order of records guaranteed?',
        opts: [
          { t: 'Across the whole topic', fb: 'A topic has several partitions, and there is no order between them.' },
          { t: 'Inside one partition', fb: '' },
          { t: 'Across all topics of a cluster', fb: 'Topics are independent.' },
          { t: 'Only for records without a key', fb: 'Keys are what keep related records in one partition.' }
        ],
        ok: 1,
        why: 'A partition is an ordered log. Records of one partition are read in the order that they were written. For order across related records, give them the same key.'
      }),

      B.quiz({
        id: 'm1-q2', t: 1,
        q: 'What is an offset?',
        opts: [
          { t: 'The number of a record inside its partition', fb: '' },
          { t: 'The time that the record was written', fb: 'That is the timestamp.' },
          { t: 'The number of a record across the topic', fb: 'Offsets are per partition.' },
          { t: 'The size of the record in bytes', fb: 'That is the size.' }
        ],
        ok: 0,
        why: 'An offset names a record inside one partition: 0 for the first one, 1 for the next. Two partitions both have an offset 0.'
      }),

      B.quiz({
        id: 'm1-q3', t: 1,
        q: 'Kafka 4 starts a cluster. What does it NOT need any more?',
        opts: [
          { t: 'Brokers', fb: 'Brokers are still the servers that store the logs.' },
          { t: 'A format step for each data folder', fb: 'The format step is required in KRaft mode.' },
          { t: 'A separate ZooKeeper cluster', fb: '' },
          { t: 'A cluster id', fb: 'Every node must share one.' }
        ],
        ok: 2,
        why: 'Kafka 4.0 removed ZooKeeper mode. The controllers keep the metadata themselves, in a Raft quorum and a log of their own.'
      }),

      B.quiz({
        id: 'm1-q4', t: 1,
        q: 'A producer mistypes a topic name and sends. With the defaults, what happens?',
        opts: [
          { t: 'The send fails at once', fb: 'Only if automatic creation is switched off.' },
          { t: 'The broker creates the topic, with one partition and one copy', fb: '' },
          { t: 'The record goes to the closest topic', fb: 'Kafka does not guess.' },
          { t: 'The record is queued until the topic exists', fb: 'It would wait for an administrator in a cluster that forbids creation. Here it creates it.' }
        ],
        ok: 1,
        why: 'auto.create.topics.enable is true by default, and an automatic topic uses the default partition count and replication factor: one and one. Production clusters turn it off and create topics on purpose.'
      }),

      B.bug({
        id: 'm1-bug', t: 1, q: 'This script is meant to create the topic that the tills use, with three copies. Click the line that makes a topic with a single copy.',
        file: 'create_topics.sh', lang: 'bash',
        code: ['# create the topic for the tills', 'bin/kafka-topics.sh --bootstrap-server broker1:9092 --create --topic tills', '# check the result', 'bin/kafka-topics.sh --bootstrap-server broker1:9092 --describe --topic tills'].join('\n'),
        bad: [2],
        hint: 'What does the create command say about partitions and copies?',
        why: 'The command names no partition count and no replication factor, so the topic gets the defaults: **one partition and one copy**. If broker 1 dies, the topic is gone. Say what you want: `--partitions 6 --replication-factor 3`, and check the result with `--describe`.',
        fix: ['# create the topic for the tills', 'bin/kafka-topics.sh --bootstrap-server broker1:9092 --create --topic tills --partitions 6 --replication-factor 3', '# check the result', 'bin/kafka-topics.sh --bootstrap-server broker1:9092 --describe --topic tills'].join('\n'),
        cheer: 'Say how many partitions and copies you want.'
      }),

      B.order({
        id: 'm1-ord', t: 1, q: 'Put what happens when a producer sends one record in order.',
        items: [
          'The producer finds out which broker leads the partition',
          'The producer sends a batch of records to that leader',
          'The leader appends the batch to the end of its log, on disk',
          'The followers fetch the new records from the leader',
          'The leader tells the producer that the write succeeded',
          'A consumer fetches the record and moves its own offset'
        ],
        why: 'The leader takes the write, the followers copy it, and the answer to the producer depends on the acks setting. The consumer reads later and keeps its own position, which the broker does not need to know.'
      }),

      B.decide({
        id: 'm1-dec', t: 2, src: 'docs', title: 'Decision: how should Brewline move its till events',
        scenario: 'Brewline wants every order to reach the warehouse, the fraud checker and a dashboard, within a minute. Today three nightly file jobs do it. About 200 orders a second at peak, and the team wants to add a fourth reader next year without touching the tills. You choose.',
        opts: [
          { t: 'Keep the files, run them every minute', d: 'No new platform.', lose: 'Three jobs read and write the same files, and a fourth means a fourth job. Files every minute are many small files and late data.' },
          { t: 'Put each order on a Kafka topic, keyed by store, and let each reader have its own consumer group', d: 'One write, any number of readers, and replay.', lose: '' },
          { t: 'One queue per reader, and the tills send the same order three times', d: 'Each reader is independent.', lose: 'The tills must know every reader, and a fourth reader means changing the tills. The copies can disagree.' }
        ],
        pick: 1,
        why: 'A log with one write and many independent readers is what Kafka is for. A new reader starts from the beginning without the tills changing, and a slow reader does not slow the others.',
        when: 'If only one reader will ever exist and the volume is small, a queue or a database table is simpler. Say that you would count the readers first.'
      }),

      B.incident({
        id: 'm1-inc', t: 1, src: 'docs', title: 'Incident: a topic with one copy lost its data', time: '03:20',
        alert: '**Broker 2 is down after a disk failure, and the topic `refunds` is offline.** The topic was created by a script that ran on a new laptop. Other topics are fine.',
        clues: ['`kafka-topics.sh --describe --topic refunds` shows one partition, with one replica, and it is on broker 2', 'The topics that the platform team created have three replicas', 'The script that made `refunds` had no replication flags'],
        opts: [
          { t: 'Recreate the topic with three copies, restore the records from the source system, and turn automatic topic creation off', fb: '' },
          { t: 'Restart broker 1 and 3, to elect a new leader', fb: 'There is no other copy to elect. The only replica is on broker 2.' },
          { t: 'Raise min.insync.replicas to 3', fb: 'The topic has one replica, so it cannot ever have three in sync.' },
          { t: 'Add more consumers', fb: 'Consumers cannot read a partition that has no leader.' }
        ],
        best: 0,
        why: 'A topic with one replica lives and dies with its broker. When the disk is lost, the records are lost. Recover what you can from the source, recreate the topic with a replication factor of three, and stop mistakes at the source: automatic creation off, and topics created by code that is reviewed.',
        checks: [
          ['Describe the topic', 'Look at `Replicas` and `Isr`. One replica is the whole story.'],
          ['Find who created it', 'The producer or a script that made it by accident: automatic creation.'],
          ['List all topics with one replica', 'Find the others before they fail too.']
        ],
        tell: 'A topic had one replica because it was created with the defaults. Its broker lost its disk, so the topic and its records are gone. We recreated it with three copies, refilled it from the source, and switched off automatic creation.',
        prevent: ['Set auto.create.topics.enable to false in production', 'Set default.replication.factor to 3 and min.insync.replicas to 2', 'Create topics with code that names the partitions and replicas', 'Alert on topics with a replication factor of 1']
      }),

      B.qa({
        id: 'qa-what', t: 1, tag: 'Kafka basics', secs: 75,
        q: 'What is Kafka, and when would you use it?',
        pts: ['A distributed, replicated log of records', 'Topics, partitions, offsets', 'Producers append, consumers read at their own offset', 'Many independent readers, replay, order by key', 'Not a queue, not a database'],
        short: 'Kafka is a distributed log. Producers append **records** to **topics**. A topic is split into **partitions**, and each partition is an ordered log on a broker, with copies on other brokers. Consumers read from a partition at their own **offset**, so many readers can read the same stream and each can replay it from any retained point. Records are not removed when they are read. They are removed by retention. I would use Kafka when several systems need the same event stream, when I need to replay it, and when the order of events for a key matters. I would not use it to answer ad hoc questions about state, or for a small amount of simple work hand-off.',
        fu: [['How is it different from a queue?', 'A queue usually deletes a message once it is taken. Kafka keeps the log for a set time, so many groups can read it and replay it.'], ['Is it a database?', 'It stores data durably and can keep it forever, but it has no queries by value. Compacted topics keep the latest value per key, which works like a table of state, read by key.']],
        trap: 'Calling Kafka a queue, or saying that records are deleted when they are consumed.',
        real: 'Describe your pipeline and tell me where Kafka sits.'
      }),

      B.qa({
        id: 'qa-parts', t: 1, tag: 'Kafka basics', secs: 75,
        q: 'Explain topic, partition and offset.',
        pts: ['A topic is a named stream', 'A partition is an ordered log, the unit of parallelism', 'An offset numbers a record inside a partition', 'Order is per partition', 'The key picks the partition'],
        short: 'A **topic** is a named stream of records. It is split into **partitions**. A partition is an ordered, append-only log stored in files on a broker, and it is the unit of parallelism: one partition is read by one consumer of a group. An **offset** is the number of a record inside its partition, starting at zero. So a record is identified by topic, partition and offset. Order is guaranteed inside a partition and not across a topic, so I give related records the same **key**: the producer hashes the key to pick the partition, and the records of one key stay in order.',
        fu: [['Can two records have the same offset?', 'Yes, in different partitions. An offset is only unique inside one partition.'], ['What is the unit of replication?', 'The partition. Each partition has a leader and followers on other brokers.']],
        trap: 'Saying that offsets are unique across a topic.',
        real: 'Draw a topic with three partitions and say where a record with key s01 goes.'
      }),

      B.qa({
        id: 'qa-kraft', t: 2, tag: 'Kafka basics', secs: 75,
        q: 'What is KRaft, and what changed from ZooKeeper?',
        pts: ['Kafka\'s own Raft quorum for metadata', 'Controllers keep a metadata log', 'Kafka 4 has no ZooKeeper', 'Process roles: broker, controller, both', 'Majority needed'],
        short: 'KRaft is Kafka\'s own consensus layer. Older Kafka kept its metadata, such as topics and partition leaders, in a separate ZooKeeper cluster. In KRaft a set of **controller** nodes runs a Raft quorum and keeps the metadata in a replicated log, `__cluster_metadata`, that the brokers read. Kafka 4.0 only supports KRaft mode, and ZooKeeper is removed. A node has a role: broker, controller, or both. Small clusters can combine the roles, and bigger ones use three or five dedicated controllers. The quorum needs a majority alive to make changes. Fewer moving parts to run is the main gain, and metadata changes become faster.',
        fu: [['How many controllers?', 'Three or five. Three survive one loss, and five survive two. More controllers do not make it faster.'], ['What must you do before the first start?', 'Format each data folder with kafka-storage, giving the cluster id and the initial controllers.']],
        trap: 'Saying that brokers elect partition leaders among themselves. The active controller does it.',
        real: 'We are on ZooKeeper today. How would you plan the move?'
      }),

      B.recap({
        id: 'm1-recap', n: 1, badge: 'Log Reader', color: '#C7D2FE',
        pts: [
          'Kafka is a **distributed log**. A record has a key, a value and a timestamp. It lives at an **offset** in a **partition** of a **topic**.',
          'Order is kept **inside a partition**. The **key** picks the partition.',
          'A **broker** stores partitions as files and keeps copies. **Controllers** keep the cluster\'s metadata in a log of their own: **KRaft**, with no ZooKeeper in Kafka 4.',
          'Readers keep their own offset, so many groups read one stream and any of them can replay it.',
          'The defaults to change: **automatic topic creation** is on, a topic gets **one partition and one copy**, retention is **seven days**.',
          'Kafka is for shared, replayable event streams. It is the wrong tool for ad hoc queries and for small one-off messages.'
        ]
      })
    ]
  });
})();
