/* Mission 4: producers. What acks mean, what batching and compression do to the bytes on disk, the errors that a producer reports, what idempotence adds to a batch, timestamps and headers.
   Real Apache Kafka 4.4.0 brokers and the confluent-kafka client (librdkafka). */
(function () {
  var B = LAB.b, G = LAB.get;
  var AK = G.table('producers.acks'), BA = G.table('producers.batching'), CO = G.table('producers.compression'), ER = G.table('producers.errors'), ID = G.table('producers.idempotence');
  var TS = G.counts('producers.timestamps'), HD = G.text('producers.headers_dump');
  var PY = G.file('code/producers.py');
  var ACKS = G.lines(PY, G.at(PY, /^def acks_experiment/), G.at(PY, /'what the report means'\], rows\)/));
  var BAT = G.lines(PY, G.at(PY, /^def batching_experiment/), G.at(PY, /rec\.table\('producers\.batching'/));
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  var ack = function (a) { return AK.rows.filter(function (r) { return String(r[0]) === a; })[0]; };
  var bat = function (n) { return BA.rows.filter(function (r) { return Number(r[0]) === n; })[0]; };
  var cod = function (n) { return CO.rows.filter(function (r) { return r[0] === n; })[0]; };
  G.expect(ack('0')[3] === 'unknown' && ack('1')[3] === 0 && ack('all')[4] === 999, 'what the delivery reports say for each acks setting');
  G.expect(Number(bat(1)[1]) === 1000 && Number(bat(1000)[1]) === 1 && Number(bat(1)[2]) > Number(bat(100)[2]), 'smaller batches cost more bytes');
  G.expect(Number(cod('zstd')[3]) < Number(cod('none')[3]) / 3, 'compression shrinks the log');
  var errOf = function (frag) { var r = ER.rows.filter(function (x) { return x[0].indexOf(frag) >= 0; })[0]; G.expect(!!r, 'error row ' + frag); return r; };
  var idOn = ID.rows.filter(function (r) { return /true/.test(r[0]); }), idOff = ID.rows.filter(function (r) { return /Python client/.test(r[0]) && /false/.test(r[0]); }), idJava = ID.rows.filter(function (r) { return /console-producer/.test(r[0]); });
  G.expect(idOn.length === 3 && idOn[1][5] === 100 && idOff[0][3] === -1 && idJava.length === 1 && idJava[0][3] !== -1, 'idempotent batches carry an id and a sequence');
  G.expect(TS.create_time_topic_keeps_the_producers_time === true && TS.append_time_topic_replaced_it === true, 'two kinds of timestamp');
  var saved = Math.round((1 - Number(bat(100)[2]) / Number(bat(1)[2])) * 100);

  LAB.addChapter({
    id: 'm4', n: 4, title: 'Producers', short: 'Producers', blurb: 'acks, batching, compression, errors and idempotence', minutes: 50,
    focus: ['src', 'stg', 'snap'],
    goals: [
      'Follow a record **through a producer**: serialize, partition, batch, send.',
      'Say what **acks 0, 1 and all** promise, and what each costs.',
      'Explain **batching and compression**, with the bytes on disk that they save.',
      'Read the **errors** that a producer reports, and where they arrive.',
      'Say what an **idempotent producer** adds to every batch.',
      'Avoid the classic bugs: **no flush**, **ignored delivery reports**, and a **wrong timestamp**.'
    ],
    say: 'Mission 4 is the producer. It looks like one call, send, and it hides a small engine: a buffer, batches, a sender thread, retries and acknowledgements. Most data loss in Kafka is decided here, by a setting or by code that does not look at the answer. I ran the same orders with every acks setting, in different batch sizes and with every compression codec, and counted the bytes on the broker\'s disk. Press Next.',
    scenes: [
      B.flow({
        id: 'm4-flow', t: 1, src: 'docs', title: 'Inside a producer', g: 'produce', legend: true,
        steps: [
          { say: 'A producer is a library in your program. It is not a connection to one broker. Press Next to follow a record.', cap: 'A producer is an engine in your program.' },
          { say: 'Step 1. Your code calls `produce`. It returns at once: the record is only **queued**. The answer comes later, to a callback.', on: ['k1'], focus: ['w_app', 'w_ser'], cap: 'produce() queues. It does not send.' },
          { say: 'Step 2. The key and the value are **serialized** to bytes. Kafka does not know what they mean. Strings, JSON and Avro are all bytes here.', on: ['k2'], focus: ['w_ser', 'w_part'], cap: 'Everything becomes bytes.' },
          { say: 'Step 3. The **partitioner** picks the partition from the key, as in mission 3. A record without a key is spread over partitions by batch.', on: ['k3'], focus: ['w_part', 'w_acc'], cap: 'The key picks the partition.' },
          { say: 'Step 4. The record waits in a **batch** for its partition. A batch is sent when it is full, or when it is old: `linger.ms` is the longest it waits. Bigger batches mean fewer requests and smaller logs.', on: ['k4'], focus: ['w_acc', 'w_net'], tags: ['tg_batch'], cap: 'Records wait in a batch.' },
          { say: 'Step 5. A **sender thread** sends the batches to the **leader** of each partition, one request per broker, with several batches in it.', on: ['k5'], focus: ['w_net', 'w_lead'], cap: 'One request for each broker.' },
          { say: 'Step 6. The leader appends the batch to its log. The followers fetch it, as mission 5 shows.', on: ['k6'], focus: ['w_lead', 'w_fol'], cap: 'The leader appends, and the followers copy.' },
          { say: 'Step 7. The answer comes back, and what it means depends on **acks**: nothing, the leader wrote it, or every in-sync replica wrote it. Your callback runs. A producer that ignores the callback does not know what happened.', on: ['k7'], focus: ['w_fol', 'w_ack'], cap: 'The callback is the answer.' }
        ]
      }),

      B.code({
        id: 'm4-acks-code', t: 1, src: 'rec', title: 'Send a thousand orders with three settings', file: 'producers.py', lang: 'python', code: ACKS,
        steps: [
          { say: 'This is the experiment. The same thousand orders, sent with acks 0, 1 and all. Press Next.', lines: null },
          { say: 'The topic has three copies, placed by hand, so that every run is the same. The retention is switched off because the orders carry old timestamps.', lines: G.span(ACKS, /create_topic/) },
          { say: 'This is the **delivery callback**. It runs once for each record, and gets an error or a message with its offset. I collect them all.', lines: G.span(ACKS, /def cb/, /reports\.append/) },
          { say: 'The producer is created with the `acks` setting. Then every order is sent with `produce`, and `flush` waits until every callback has run.', lines: G.span(ACKS, /p = kx\.producer/, /p\.flush/) },
          { say: 'After two seconds I count the records in the topic, and compare it with what the reports said.', lines: G.span(ACKS, /time\.sleep\(2\)/, /hi = kx\.offsets/) }
        ],
        note: 'Recorded: this ran against the real three broker cluster, with the confluent-kafka client.'
      }),

      B.rows({
        id: 'm4-acks', t: 1, src: 'rec', title: 'What each acks setting tells the producer',
        steps: [
          {
            say: 'All three runs delivered a thousand records and none failed, because the cluster was healthy. The difference is in the **reports**. With `acks=0` the producer does not wait: its reports have **no offset**. With `acks=1` and `acks=all` they carry the offset where the record landed, 0 to 999.',
            tabs: [{ layer: 'RECORDED', name: 'The delivery reports, by acks setting', c: 'raw', cols: AK.cols, rows: AK.rows, trk: 0 }],
            notes: ['Recorded. Two seconds after the send, all three topics held ' + n0(ack('all')[5]) + ' records. A healthy cluster loses nothing with any setting. The settings differ when something fails, which mission 5 breaks on purpose.']
          },
          {
            say: 'Read the last column. **acks=0**: the producer has no idea. A record can be lost on the wire and the report still says it went well. **acks=1**: the **leader** wrote it, but the followers may not have copied it yet. If the leader dies right now, the record can be lost. **acks=all**: every **in-sync replica** has it. With `min.insync.replicas` of 2 or more, it survives a broker failure.',
            tabs: [{ layer: 'RECORDED', name: 'What an acknowledgement means', c: 'raw', cols: ['acks', 'The producer learns', 'The record can be lost when'],
              rows: [['0', 'nothing: no offset in the report', 'a broker or a network fails at any moment'], ['1', 'the leader wrote it', 'the leader fails before a follower has copied it'], ['all', 'all in-sync replicas wrote it', 'every in-sync replica fails at once, and min.insync.replicas is 1']], trk: 1 }],
            notes: ['The first column of the table is the recording. The last column is the explanation, and mission 5 proves the middle row with a lost record.']
          }
        ]
      }),

      B.cmp({
        id: 'm4-settings', t: 1, src: 'docs', title: 'The settings, in two clients',
        say: 'The same ideas have two sets of names. The Java client and the librdkafka clients, which sit under Python, Go and C, are configured a little differently. Press Next.',
        cols: ['Idea', 'Java client', 'librdkafka (Python, Go, C)', 'What it does'],
        hl: 3,
        rows: [
          ['Acknowledgements', 'acks', 'acks', '0, 1 or all'],
          ['How long a batch may wait', 'linger.ms', 'linger.ms', 'Waits to fill the batch before sending'],
          ['The size of a batch', 'batch.size (bytes)', 'batch.size (bytes) and batch.num.messages', 'The limit that sends a batch at once'],
          ['Compression', 'compression.type', 'compression.type', 'none, gzip, snappy, lz4 or zstd'],
          ['Retries and the time limit', 'retries and delivery.timeout.ms', 'retries and message.timeout.ms', 'How long a record is tried before it fails'],
          ['Idempotence', 'enable.idempotence (on by default)', 'enable.idempotence (off by default)', 'Producer id and sequence numbers'],
          ['The partitioner for keys', 'murmur2 (default)', 'consistent_random (default). murmur2_random is the Java one', 'See mission 3']
        ],
        pick: 'Do not assume that two clients share a default. Write down the settings that you rely on, and set them explicitly in every language that writes to the topic.'
      }),

      B.rows({
        id: 'm4-batching', t: 1, src: 'rec', title: 'Batches: fewer, bigger, smaller log',
        steps: [
          {
            say: 'I sent the same thousand orders four times, in batches of 1, 10, 100 and 1,000 records, and measured the log on the broker. One order per batch makes **' + n0(bat(1)[1]) + '** batches and **' + n0(bat(1)[2]) + ' bytes**. A hundred per batch makes **' + bat(100)[1] + '** batches and **' + n0(bat(100)[2]) + ' bytes**. That is **' + saved + ' percent smaller** for the same data.',
            tabs: [{ layer: 'RECORDED', name: 'The same 1,000 orders in four batch sizes', c: 'raw', cols: BA.cols, rows: BA.rows, trk: 0 }],
            notes: ['Recorded. The last column is 61 bytes for every batch, the fixed header from mission 2. With one record per batch, that is more than a third of the log.']
          },
          {
            say: 'Batches also mean fewer requests, fewer network round trips, and fewer small writes on the disk. The price is **latency**: a record waits in the batch until it is full or until `linger.ms` has passed. Zero means "send now". A few milliseconds is cheap, and fills batches when the traffic is steady.',
            tabs: [{ layer: 'RECORDED', name: 'The trade-off', c: 'raw', cols: ['Setting', 'Effect', 'Cost'],
              rows: [['linger.ms = 0', 'a record is sent as soon as it is queued', 'many small batches, a bigger log, more requests'], ['linger.ms = a few ms', 'batches fill while the producer waits', 'a few milliseconds of delay'], ['a large batch size', 'fewer requests', 'more memory in the producer']], trk: 1 }],
            notes: ['The bytes are recorded. The advice follows from them and from the documentation of the producer.']
          }
        ]
      }),

      B.code({
        id: 'm4-bat-code', t: 2, src: 'rec', title: 'How the batch experiment counted', file: 'producers.py', lang: 'python', code: BAT,
        steps: [
          { say: 'One topic for each batch size, with a single partition on broker 1, so that the files are in one place. Press Next.', lines: null },
          { say: '`batch.num.messages` is the number of records in a batch. `linger.ms` is ten seconds, so that the producer waits to fill every batch instead of sending a half-full one. Every run makes the same batches.', lines: G.span(BAT, /p = kx\.producer/) },
          { say: 'After the send, I count the batches in the files, and add up the bytes. The helper reads the files with `kafka-dump-log` and the sizes with the file system.', lines: G.span(BAT, /b = batches/, /rows\.append/) }
        ],
        note: 'Recorded: the numbers on the previous screen came from this code.'
      }),

      B.rows({
        id: 'm4-compression', t: 1, src: 'rec', title: 'Compression',
        steps: [
          {
            say: 'Then I sent five thousand orders with each compression codec. The broker keeps a batch as the producer compressed it, so the log shows the saving directly. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'The same 5,000 orders, five codecs', c: 'raw', cols: CO.cols, rows: CO.rows, trk: 0 }],
            notes: ['Recorded: batches of 500 records. The orders are JSON text, which compresses well because the field names repeat.']
          },
          {
            say: 'JSON shrank to **' + cod('zstd')[4] + '** of its size with zstd and **' + cod('gzip')[4] + '** with gzip. Snappy and lz4 are faster and compress less: ' + cod('snappy')[4] + ' and ' + cod('lz4')[4] + '. The compression is done in the **producer**, and the data stays compressed on the broker, in the network between brokers and to the consumer, until the consumer decompresses it.',
            tabs: [{ layer: 'RECORDED', name: 'Choosing a codec', c: 'raw', cols: ['Codec', 'Share of the size', 'In short'],
              rows: [['none', cod('none')[4], 'no CPU, the biggest log'], ['snappy', cod('snappy')[4], 'fast, modest'], ['lz4', cod('lz4')[4], 'fast, modest'], ['gzip', cod('gzip')[4], 'slow, good'], ['zstd', cod('zstd')[4], 'good ratio, reasonable speed']], trk: 1 }],
            notes: ['The shares are recorded. The words in the last column are the usual advice. Speed was not measured, because times are not recorded.']
          }
        ]
      }),

      B.rows({
        id: 'm4-errors', t: 1, src: 'rec', title: 'The errors, and where they arrive',
        steps: [
          {
            say: 'I made four things go wrong, and wrote down what the producer said. Two of them are raised by `produce()` itself. The others arrive in the **delivery callback**, later, or never, if you do not look. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Four failures', c: 'raw', cols: ER.cols, rows: ER.rows, trk: 0 }],
            notes: ['Recorded. The last one waits for `message.timeout.ms` before it reports. The producer tries until then.']
          },
          {
            say: 'A record that is **too big** is refused by the client before anything is sent. A record that is within the client\'s limit but over the **topic\'s limit** is refused by the broker. A topic that does not exist, with automatic creation off in the client, **times out** and does not say "unknown topic" in the callback. A broker that cannot be reached also **times out**. Two different mistakes, one error: `_MSG_TIMED_OUT`.',
            tabs: [{ layer: 'RECORDED', name: 'What to check for each', c: 'raw', cols: ['You see', 'Look at'],
              rows: [[errOf('1.1 MB')[1], 'the message size: message.max.bytes of the client and max.message.bytes of the topic'], [errOf('topic limit')[1], 'max.message.bytes of the topic'], [errOf('does not exist')[1], 'does the topic exist, and may the client create it?'], [errOf('not there')[1], 'is the broker address right and reachable?']], trk: 1 }],
            notes: ['Recorded. The first two lines have the same error name from different places.']
          }
        ]
      }),

      B.rows({
        id: 'm4-idem', t: 2, src: 'rec', title: 'Idempotence leaves marks in every batch',
        steps: [
          {
            say: 'An **idempotent** producer asks the broker for a **producer id** when it starts. Every batch it sends carries that id, an **epoch**, and a **sequence number** for the first record. I sent three hundred orders in three batches, with idempotence on and off, and read the batches from the log.',
            tabs: [{ layer: 'RECORDED', name: 'Batches with and without idempotence', c: 'raw', cols: ID.cols, rows: ID.rows, trk: 0 }],
            notes: ['Recorded. The producer ids are named A and B because the broker hands them out from a block, and the numbers differ between runs.']
          },
          {
            say: 'With idempotence **on**, the three batches have the same id, epoch 0, and sequences 0, 100 and 200: each batch begins where the last ended. If a batch is sent twice, the broker sees the sequence number again and drops the copy. With idempotence **off** (the default of this Python client), the fields are -1: no protection. The Java console producer, with **no settings at all**, is idempotent: its batch has an id too.',
            tabs: [{ layer: 'RECORDED', name: 'What the broker can check', c: 'raw', cols: ['Producer', 'Producer id', 'Sequence'],
              rows: [['Python, enable.idempotence=true', idOn[0][3], idOn.map(function (r) { return r[5]; }).join(', ')], ['Python, default (off)', idOff[0][3], idOff[0][5]], ['Java console producer, default', idJava[0][3], idJava[0][5] + ' to ' + idJava[0][6]]], trk: 1 }],
            notes: ['Recorded. Mission 7 sends a batch twice on purpose, and shows the difference in the log.']
          }
        ]
      }),

      B.talk({
        id: 'm4-idem-doc', t: 2, src: 'docs', title: 'What idempotence promises, and what it does not',
        say: 'Idempotence is often said to give exactly-once. It is less than that. Press Next.',
        items: [
          ['What it does', 'Within one producer session and one partition, a retried batch does not create a duplicate, and batches stay in order even with several requests in flight.', 'No duplicates from retries, in order.'],
          ['What it does not do', 'It does not cover **two producers** sending the same event, an application that **sends the event twice** by itself, or a producer that **restarts** and gets a new id. It does not make a consume-and-produce loop exactly-once. Transactions do that, in mission 7.', 'It covers retries inside one producer, nothing more.'],
          ['What it costs', 'Almost nothing, and it forces `acks=all`. That is why the Java client turned it on by default.', 'Cheap, and safe by default.'],
          ['What it needs', 'Idempotent writes need permission on the cluster in a secured setup, and up to five requests in flight for one connection.', 'Check the ACLs of a secured cluster.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The interview sentence:', t: 'An idempotent producer attaches a producer id and a sequence number to every batch, so that a retry does not duplicate within one session. Exactly-once across a whole pipeline needs transactions.' }
      }),

      B.rows({
        id: 'm4-time', t: 2, src: 'rec', title: 'Timestamps and headers',
        steps: [
          {
            say: 'A record carries a time and some headers. I made two topics. One keeps the **producer\'s time** (CreateTime, the default). The other replaces it with the **broker\'s time** (LogAppendTime). The orders were stamped January 2026, and I ran this in November.',
            tabs: [{ layer: 'RECORDED', name: 'The two timestamp types', c: 'raw', cols: ['Check', 'Result'],
              rows: [['CreateTime topic keeps the time of the producer', TS.create_time_topic_keeps_the_producers_time ? 'yes' : 'no'], ['LogAppendTime topic replaced it with the broker\'s time', TS.append_time_topic_replaced_it ? 'yes' : 'no'], ['Days between the two kinds of time on the same orders', TS.days_between_the_two]], trk: 0 }],
            notes: ['Recorded. CreateTime is the event time you chose, so retention and time windows use it. LogAppendTime is when Kafka wrote it.']
          },
          {
            say: '**Headers** are small key and value pairs next to the record, for things that are about the message and not part of the data: a trace id, the source application, a schema id. They do not take part in the partition choice. `kafka-dump-log` shows the names: `headerKeys: [trace-id,source]`.',
            tabs: [{ layer: 'RECORDED', name: 'Two records with headers', c: 'raw', cols: ['kafka-dump-log line'], rows: HD.split('\n').map(function (l) { return [l]; }), trk: 1 }],
            notes: ['Recorded.']
          }
        ]
      }),

      B.quiz({
        id: 'm4-q1', t: 1,
        q: 'What does the delivery report of a record sent with acks=0 tell you?',
        opts: [
          { t: 'That the leader wrote it', fb: 'That is acks=1.' },
          { t: 'That all in-sync replicas wrote it', fb: 'That is acks=all.' },
          { t: 'Nothing about the broker: no offset, and the send is only queued', fb: '' },
          { t: 'The offset where it landed', fb: 'The offset in the recording was unknown.' }
        ],
        ok: 2,
        why: 'With acks=0 the producer does not wait for an answer. The report has no offset. The record may have been written or lost, and the producer cannot tell.'
      }),

      B.quiz({
        id: 'm4-q2', t: 1,
        q: 'What does linger.ms do?',
        opts: [
          { t: 'It limits how long a record may live in Kafka', fb: 'That is retention.' },
          { t: 'It is the longest that a batch waits to fill up before it is sent', fb: '' },
          { t: 'It sets how long the producer waits for an answer', fb: 'That is a request timeout.' },
          { t: 'It delays every record by the same time', fb: 'A full batch is sent at once.' }
        ],
        ok: 1,
        why: 'A batch is sent when it is full, or when it has waited linger.ms. A few milliseconds make batches fuller and the log smaller, at the cost of that much latency.'
      }),

      B.quiz({
        id: 'm4-q3', t: 1,
        q: 'A script sends 100,000 records with produce() and exits right after the loop. Some records never arrive. Why?',
        opts: [
          { t: 'Kafka drops records when the producer exits', fb: 'Kafka only gets what the producer sends.' },
          { t: 'produce() only queues the records. Without flush(), the ones in the buffer are lost when the process ends', fb: '' },
          { t: 'The partitions were full', fb: 'Partitions have no capacity limit like that.' },
          { t: 'The topic was in the wrong format', fb: 'A bad topic gives an error, not silence.' }
        ],
        ok: 1,
        why: 'The producer is asynchronous. produce() puts the record in a buffer and returns. A flush at the end waits until every record has been delivered or has failed. Without it, whatever is still in the buffer disappears with the process.'
      }),

      B.quiz({
        id: 'm4-q4', t: 2,
        q: 'The same orders are sent with 1 record to a batch and with 100. Which is true of the log on disk?',
        opts: [
          { t: 'They are the same size', fb: 'Each batch has a 61 byte header.' },
          { t: 'The one with 100 per batch is smaller, because there are fewer headers', fb: '' },
          { t: 'The one with 1 per batch is smaller, because it is simpler', fb: 'It has the most headers.' },
          { t: 'The one with 100 per batch is larger, because it holds more per record', fb: 'The records are the same.' }
        ],
        ok: 1,
        why: 'In the recording the same thousand orders took ' + n0(bat(1)[2]) + ' bytes in single-record batches and ' + n0(bat(100)[2]) + ' bytes in batches of a hundred, because a thousand 61-byte headers became ten.'
      }),

      B.bug({
        id: 'm4-bug', t: 1, q: 'This producer is meant to report every order that fails. Click the line that hides the failures.',
        file: 'till.py', lang: 'python',
        code: ['p = Producer({"bootstrap.servers": "localhost:9092", "acks": "all"})', 'for order in orders:', '    p.produce("orders", key=order["store_id"], value=json.dumps(order))', 'p.flush()', 'print("sent", len(orders))'].join('\n'),
        bad: [3],
        hint: 'Where would a delivery failure show up?',
        why: 'The call has **no callback**, so the answer for each record is thrown away. `flush()` waits, and the program prints "sent" even if every record failed. Pass `callback=on_delivery` and count the errors, or check the result of `flush()`.',
        fix: ['p = Producer({"bootstrap.servers": "localhost:9092", "acks": "all"})', 'failed = []', 'for order in orders:', '    p.produce("orders", key=order["store_id"], value=json.dumps(order), callback=lambda err, msg: failed.append(err) if err else None)', 'p.flush()', 'print("failed", len(failed))'].join('\n'),
        cheer: 'The delivery report is the answer. Read it.'
      }),

      B.order({
        id: 'm4-ord', t: 1, q: 'Put what happens to a record sent with acks=all in order.',
        items: [
          'The application calls produce(), and the record is queued',
          'The partitioner chooses the partition, and the record joins a batch',
          'The sender thread sends the batch to the leader of the partition',
          'The leader appends the batch to its log',
          'The in-sync followers fetch the batch and append it',
          'The leader answers, and the delivery callback runs'
        ],
        why: 'With acks=all the leader answers only after every in-sync replica has the batch. With acks=1 it answers after step 4. With acks=0 the producer does not wait at all.'
      }),

      B.decide({
        id: 'm4-dec', t: 2, src: 'docs', title: 'Decision: producer settings for two topics',
        scenario: 'Brewline has two topics. `payments` has about 50 records a second, and losing one means a customer is not charged. `clicks` has 20,000 a second from the web shop, and a few lost clicks do not matter. You choose the producer settings for each.',
        opts: [
          { t: 'The same for both: acks=all, idempotence, linger 5 ms, zstd', d: 'Safe, simple, one setting to explain.', lose: 'It works, but clicks pay the cost of the safest setting for no benefit. Latency and cluster load are higher than needed.' },
          { t: 'payments: acks=all and idempotence. clicks: acks=1, bigger batches, linger 50 ms, lz4', d: 'Safety where it matters, throughput where it counts.', lose: '' },
          { t: 'Both with acks=0 and large batches, to be as fast as possible', d: 'The fastest.', lose: 'Payments could be lost without anyone knowing. Never use acks=0 for data that matters.' }
        ],
        pick: 1,
        why: 'Match the setting to the value of the data. Payments need acks=all with min.insync.replicas of 2, and idempotence. A click stream can trade a little safety for fewer, bigger requests.',
        when: 'If the cluster is small and clicks are modest, the same safe settings for both is simpler. Say that you would measure the load before choosing differently.'
      }),

      B.incident({
        id: 'm4-inc', t: 1, src: 'docs', title: 'Incident: orders are missing after a network blip', time: '08:45',
        alert: '**About 4,000 orders from the tills between 08:10 and 08:25 are not in the warehouse.** The producers logged "Message timed out" at 08:25. Nobody noticed, and the tills keep running.',
        clues: ['The error is _MSG_TIMED_OUT, from the delivery callback', 'The brokers were healthy the whole time', 'The code logs the error and carries on'],
        opts: [
          { t: 'Treat a timed-out record as a failure: keep it, retry it or send it to an error store, and alert on the number of failed deliveries', fb: '' },
          { t: 'Raise message.timeout.ms to one day', fb: 'It hides the problem for longer, and memory fills up.' },
          { t: 'Switch to acks=0 to avoid the errors', fb: 'It does not remove failures, it removes the reports of them.' },
          { t: 'Restart the tills each morning', fb: 'It does not recover lost records.' }
        ],
        best: 0,
        why: 'The producer tried for the whole `message.timeout.ms`, the network was down, and then the records were given up. The callback said so, and the code only logged it. A producer that cannot deliver must not silently drop data: it has to buffer, retry or alert.',
        checks: [
          ['Read the delivery errors in the logs', 'The error name and the time window say what happened.'],
          ['Check message.timeout.ms', 'The default is five minutes in librdkafka. After that, the record is dropped.'],
          ['Check the callback', 'Does the code count failures, or only print them?']
        ],
        tell: 'For fifteen minutes the producers could not reach the brokers, their records timed out, and the code only logged the error. We will retry or store failed records and alert when the failure count rises.',
        prevent: ['Count failed deliveries and alert on them', 'Store records that failed to send, in a local queue or a file, and replay them', 'Test the producer with the broker stopped']
      }),

      B.qa({
        id: 'qa-acks', t: 1, tag: 'Producers', secs: 75,
        q: 'What do acks 0, 1 and all mean?',
        pts: ['0: no answer, no guarantee', '1: the leader wrote it', 'all: every in-sync replica wrote it', 'min.insync.replicas sets how many that is', 'Cost: latency and availability'],
        short: 'With **acks=0** the producer does not wait for any answer, so a record can be lost without a trace. With **acks=1** the leader answers after it has appended the record to its own log. If it dies before a follower copies the record, the record is lost. With **acks=all** the leader answers after every replica in the in-sync set has the record, and with `min.insync.replicas` set to 2 or more, the write fails if too few replicas are in sync. That is the safe choice for data that matters. The cost is a little more latency, and the writes are refused when too many replicas are down, which is a choice of consistency over availability.',
        fu: [['What is min.insync.replicas?', 'The smallest number of replicas, leader included, that must be in sync for a write with acks=all to succeed. With replication factor 3 and 2, you survive one broker down.'], ['Which does the Java client use by default?', 'acks=all since Kafka 3.0, with idempotence on.']],
        trap: 'Saying that acks=all means all replicas. It means all in-sync replicas.',
        real: 'Payments must not be lost. Which settings, and what happens when a broker is down?'
      }),

      B.qa({
        id: 'qa-idem', t: 2, tag: 'Producers', secs: 75,
        q: 'What is an idempotent producer, and what is it not?',
        pts: ['Producer id, epoch and sequence per batch', 'The broker drops a duplicate by sequence', 'Within one session and one partition', 'Not across producers or restarts', 'Transactions for exactly-once pipelines'],
        short: 'An idempotent producer asks the broker for a **producer id**, and every batch it sends carries that id, an **epoch** and a **sequence number**. If the producer retries a batch, because an acknowledgement was lost, the broker sees the same sequence, recognises the duplicate and does not write it again, and the batches stay in order. It works **within one producer session, for each partition**. It does not help if two producers send the same event, if the application sends an event twice, or if the producer restarts and gets a new id. For a consume-process-produce pipeline that must be exactly-once, you need **transactions**.',
        fu: [['What does it cost?', 'Almost nothing. It needs acks=all.'], ['Is it on by default?', 'In the Java client yes, since 3.0. In librdkafka it is off by default, which I saw in the recording: the Python producer wrote -1 for the id.']],
        trap: 'Saying that an idempotent producer gives exactly-once for the whole pipeline.',
        real: 'We see duplicates in the topic after a network problem. What do you check first?'
      }),

      B.qa({
        id: 'qa-batch', t: 2, tag: 'Producers', secs: 75,
        q: 'How do you tune a producer for throughput?',
        pts: ['Bigger batches and a little linger', 'Compression: lz4 or zstd', 'acks and idempotence cost little', 'More partitions for parallelism', 'Measure'],
        short: 'The biggest win is **batching**. A producer that sends many small batches wastes bytes on headers, requests and disk writes, so I set `linger.ms` to a few milliseconds and a larger `batch.size`, which makes the batches fill. In my measurement the same thousand orders took a third fewer bytes when the batch held a hundred records instead of one. Then **compression**: lz4 or snappy for speed, zstd for ratio, which also saves network and disk on the broker. I keep acks=all and idempotence for data that matters, because they cost little, and I add partitions if one producer thread or partition is the limit. And I measure each change, because the best values depend on the size of the records and the traffic.',
        fu: [['What is the cost of a bigger linger?', 'Latency of that many milliseconds for the first record of every batch.'], ['Does compression hurt the broker?', 'The broker usually keeps batches as they are, so it does not need the CPU. The consumer decompresses.']],
        trap: 'Raising linger.ms without looking at latency needs.',
        real: 'The tills send 20,000 orders a second and the brokers are busy. What do you change?'
      }),

      B.recap({
        id: 'm4-recap', n: 4, badge: 'Producer Pro', color: '#FBCFE8',
        pts: [
          '`produce()` only **queues**. A sender thread sends batches. A **callback** reports the result. **flush()** waits for all of them.',
          '**acks=0** learns nothing, **acks=1** means the leader wrote it, **acks=all** means every in-sync replica did.',
          '**Batching** cuts the log: a thousand orders took a third fewer bytes in batches of 100 than in batches of 1. **Compression** cut JSON to about a sixth of its size with gzip and zstd.',
          'Errors arrive in two places: raised by `produce()`, or in the **callback**. Two mistakes can both end as `_MSG_TIMED_OUT`.',
          'An **idempotent** producer adds an id and sequence to each batch, so retries do not duplicate. It is on by default in Java and off in librdkafka.',
          'CreateTime is the producer\'s time, LogAppendTime the broker\'s. Both feed retention and windows.'
        ]
      })
    ]
  });
})();
