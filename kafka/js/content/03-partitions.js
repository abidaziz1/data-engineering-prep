/* Mission 3: topics, partitions and keys. Which partition a key goes to (checked against a real broker), what one hot store does to the partitions, the order that is and is not kept, what adding
   partitions does to the keys, and why two clients can disagree. Real Apache Kafka 4.4.0 and the confluent-kafka client. */
(function () {
  var B = LAB.b, G = LAB.get;
  var PL = G.table('keys.placement'), PO = G.table('keys.placement_other_client'), PC = G.counts('keys.placement_check'), SK = G.table('keys.skew'), SS = G.counts('keys.skew_summary');
  var OR = G.counts('keys.ordering'), AD = G.table('keys.adding'), AS = G.counts('keys.adding_summary'), KL = G.counts('keys.keyless');
  var KX = G.file('code/kx.py'), KY = G.file('code/keys.py');
  var HASH = G.lines(KX, G.at(KX, /^def murmur2/), G.at(KX, /^    return \(murmur2\(/));
  var PLACE = G.lines(KY, G.at(KY, /^def placement/), G.at(KY, /return \[placed\[s\] for s in kx\.STORES\]/));
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  var pct = function (x) { return Math.round(x * 1000) / 10; };
  G.expect(PC.my_murmur2_matches_the_broker_placement === true && PC.keys === 12, 'the hash matches the broker');
  G.expect(SS.busiest_store === 's01' && SK.rows.length === 6, 'six partitions for the skew experiment');
  var busiest = SK.rows.slice().sort(function (a, b) { return b[1] - a[1]; })[0], empty = SK.rows.filter(function (r) { return Number(r[1]) === 0; });
  G.expect(empty.length === 1 && busiest[1] === SS.busiest_partition_records, 'one partition is empty and one is far too busy');
  G.expect(AS.moved + AS.stayed === 12 && AS.moved > 0, 'adding partitions moves some keys');
  G.expect(OR.every_partition_is_in_order === true && OR.one_store_stays_in_one_partition === true, 'order inside a partition, a store in one partition');
  var disagree = PC.keys_where_the_two_partitioners_disagree_on_6;
  var s01row = PL.rows.filter(function (r) { return r[0] === 's01'; })[0], s01other = PO.rows.filter(function (r) { return r[0] === 's01'; })[0];

  LAB.addChapter({
    id: 'm3', n: 3, title: 'Topics, partitions and keys', short: 'Partitions', blurb: 'Which partition a key goes to, skew, order, and what adding partitions does', minutes: 50,
    focus: ['stg', 'int', 'mart'],
    goals: [
      'Explain how a **key** becomes a **partition**, and compute it.',
      'Say what **order** Kafka keeps, and what it does not.',
      'Predict **skew** from the keys and the partition count.',
      'Explain what happens to the keys when you **add partitions**.',
      'Know why two clients can send the **same key to different partitions**.',
      'Choose a **partition count** and defend it.'
    ],
    say: 'Mission 3 is about the choice that you cannot easily undo: how many partitions a topic has, and which key its records carry. I sent the Brewline orders to a real cluster with several partition counts and recorded where every store landed. One store is a third of the orders, and you will see what that does. Press Next.',
    scenes: [
      B.talk({
        id: 'm3-why', t: 1, src: 'docs', title: 'Why a topic has partitions',
        say: 'One log on one machine would be simple, and it would not scale. Partitions solve three problems at once. Press Next.',
        items: [
          ['Spread the data', 'Each partition lives on one broker (and its copies on others). A topic with twelve partitions can use twelve disks and several brokers.', 'More partitions, more machines.'],
          ['Spread the readers', 'In a consumer group, **one partition is read by one consumer at a time**. Six partitions allow six consumers working in parallel, and no more.', 'The partition count caps the parallelism of a group.'],
          ['Keep order where it matters', 'Order is kept inside a partition. Records with the **same key** go to the **same partition**, so everything about store s01 stays in order, and the stores are spread.', 'Order by key, parallelism across keys.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The interview sentence:', t: 'A partition is the unit of storage, of replication and of parallelism. Order is kept inside a partition, and the key decides which partition.' }
      }),

      B.flow({
        id: 'm3-flow', t: 1, src: 'docs', title: 'How a key becomes a partition', g: 'partitions', legend: true,
        steps: [
          { say: 'This is what the producer does for every record that has a key. Press Next to follow one.', cap: 'A key becomes a partition.' },
          { say: 'Step 1. The record has a key, here the store `s01`, and a value, an order.', on: ['k1'], focus: ['p_rec', 'p_hash'], cap: 'A record with a key.' },
          { say: 'Step 2. The producer runs the **hash function** `murmur2` on the bytes of the key. Same bytes, same number, every time, on every machine that uses this function.', on: ['k2'], focus: ['p_hash', 'p_mod'], cap: 'Hash the key.' },
          { say: 'Step 3. It makes the hash positive and takes the **remainder after dividing by the number of partitions**. With three partitions the answer is 0, 1 or 2.', on: ['k3', 'k4', 'k5'], focus: ['p_mod', 'p_p0', 'p_p1', 'p_p2'], cap: 'Hash modulo N.' },
          { say: 'Step 4. Everything with the same key goes to the same partition. A consumer group gives that partition to one consumer, so one consumer sees all the records of store s01, in order.', on: ['k6'], focus: ['p_p2', 'p_cons'], tags: ['tg_same'], cap: 'One key, one partition, one consumer.' },
          { say: 'Step 5. Now someone adds partitions. N changes, so the remainder changes, and **some keys move to a different partition**. Old records stay where they were. This is why the partition count is hard to change later.', on: ['k7'], focus: ['p_add', 'p_mod'], tags: ['tg_move'], cap: 'Change N and the keys move.' }
        ]
      }),

      B.code({
        id: 'm3-hash', t: 2, src: 'rec', title: 'The hash, in twenty lines', file: 'kx.py', lang: 'python', code: HASH,
        steps: [
          { say: 'The Java client and the console tools use a hash called murmur2. I wrote it in Python and checked it against a real broker for every store and three partition counts. Press Next.', lines: null },
          { say: 'The function takes the bytes of the key, and a fixed **seed**. It works on four bytes at a time. Each step multiplies, shifts and mixes the bits, so that similar keys give very different numbers.', lines: G.span(HASH, /^def murmur2/, /^    for _ in range/) },
          { say: 'The tail handles what is left when the length is not a multiple of four. A final mix makes the result well spread.', lines: G.span(HASH, /rest = length % 4/, /return h/) },
          { say: 'Then the partitioner masks the sign bit, so that the number is positive, and takes the remainder by the number of partitions. That is the whole rule.', lines: G.span(HASH, /^def partition_for/, /^    return/) }
        ],
        note: 'Recorded: this function gave the same partition as the real broker for all twelve stores on topics of three, six and twelve partitions (' + PC.keys + ' keys, 3 topics).'
      }),

      B.code({
        id: 'm3-place', t: 2, src: 'rec', title: 'Ask the broker where a key went', file: 'keys.py', lang: 'python', code: PLACE,
        steps: [
          { say: 'To check the hash, I let the broker tell me. Press Next.', lines: null },
          { say: 'A producer sends one record for each store, with the `murmur2_random` partitioner, which is the one that matches the Java client.', lines: G.span(PLACE, /p = kx\.producer/) },
          { say: 'The **delivery report** of each record says which partition it was written to. That is the broker\'s answer, not my calculation.', lines: G.span(PLACE, /def cb/, /placed\[msg\.key/) },
          { say: 'The function returns the partitions in the order of the stores. I compared them with my own hash.', lines: G.span(PLACE, /for s in kx\.STORES/, /return/) }
        ],
        note: 'Recorded: run against topics of 3, 6 and 12 partitions on the real cluster.'
      }),

      B.rows({
        id: 'm3-table', t: 1, src: 'rec', title: 'Where every store went',
        steps: [
          {
            say: 'This is the real answer for the twelve stores. Each row is a store, the key. The columns are three topics, with three, six and twelve partitions. The same key lands in a different place when the number changes.',
            tabs: [{ layer: 'RECORDED', name: 'The partition of each key, from the delivery reports', c: 'raw', cols: PL.cols, rows: PL.rows, trk: 0 }],
            notes: ['Recorded: the murmur2 partitioner, topics of 3, 6 and 12 partitions on three brokers. My own hash gave the same partition for all 36 cells.']
          },
          {
            say: 'Look at store s01 in the six-partition column: partition **' + s01row[2] + '**. And on three partitions: partition **' + s01row[1] + '**. Nothing about the key changed. Only N did. Several stores share a partition when there are fewer partitions than stores.',
            tabs: [{ layer: 'RECORDED', name: 'Store s01', c: 'raw', cols: ['Partitions', 'Partition of s01'], rows: [[3, s01row[1]], [6, s01row[2]], [12, s01row[3]]], trk: 1 }],
            notes: ['Recorded.']
          }
        ]
      }),

      B.widget({ id: 'm3-lab', kind: 'partitionlab', t: 1, src: 'rec', title: 'Lab: place the stores on partitions' }),

      B.rows({
        id: 'm3-skew', t: 1, src: 'rec', title: 'One store makes one partition busy',
        steps: [
          {
            say: 'Now the real volume. I sent ' + n0(SS.records) + ' orders to a topic of six partitions, keyed by store, the way the tills would. Then I counted the records in every partition. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Records in each of the six partitions', c: 'raw', cols: SK.cols, rows: SK.rows, trk: 0 }],
            notes: ['Recorded: end offsets of every partition after the send. The shares add up to 1.']
          },
          {
            say: 'An even spread would be **' + n0(SS.even_share_records) + '** records in each partition. The busiest partition has **' + n0(SS.busiest_partition_records) + '**, which is **' + SS.busiest_over_even + ' times** the even share, ' + pct(busiest[2]) + ' percent of everything. It holds store ' + SS.busiest_store + ', which sells ' + pct(SS.busiest_store_share) + ' percent by itself, and four more stores that happened to hash there. Partition ' + empty[0][0] + ' is **empty**.',
            tabs: [{ layer: 'RECORDED', name: 'What the skew looks like', c: 'raw', cols: ['Measure', 'Value'],
              rows: [['Records', n0(SS.records)], ['An even share for each partition', n0(SS.even_share_records)], ['The busiest partition', n0(SS.busiest_partition_records)], ['Busiest over even', SS.busiest_over_even + ' x'], ['The busiest store', SS.busiest_store + ', ' + n0(SS.busiest_store_records) + ' records (' + pct(SS.busiest_store_share) + ' percent)'], ['Empty partitions', empty.length]], trk: 1 }],
            notes: ['Recorded. A consumer group with six consumers would have one consumer doing more than half of the work, one with nothing to do, and the rest in between.']
          }
        ]
      }),

      B.cmp({
        id: 'm3-hot', t: 2, src: 'docs', title: 'What to do about a hot key',
        say: 'A key that is far bigger than the others gives you a hot partition, and more partitions do not help: one key still goes to one partition. Press Next for the options.',
        cols: ['Option', 'What it does', 'What it costs'],
        hl: 2,
        rows: [
          ['More partitions', 'Spreads the other stores more evenly', 'Does nothing for the hot key itself, and changes where every key goes'],
          ['A longer key: store and a bucket', 'Splits the hot store into several keys, such as s01-0, s01-1, s01-2', 'Order is kept only inside each bucket. A consumer that needs the whole store must merge the buckets'],
          ['A custom partitioner', 'Sends the hot key to several partitions on purpose', 'The same cost, in code that every producer must share'],
          ['A topic of its own for the hot store', 'The big store has partitions to itself', 'More topics, and two places to read'],
          ['Do nothing, and size the consumers', 'One strong consumer for the busy partition', 'Fine when the load is only 3 times the average']
        ],
        pick: 'Measure first. Then choose the cheapest option that keeps the order you need: if order across the whole store does not matter, add a bucket to the key.'
      }),

      B.rows({
        id: 'm3-order', t: 1, src: 'rec', title: 'The order that Kafka keeps',
        steps: [
          {
            say: 'I read the six partitions back and checked the order ids. **Inside every partition they only go up**: order id 5 comes before 10, before 18. A store stays in **one** partition: ' + (OR.one_store_stays_in_one_partition ? 'yes, for all twelve' : 'no') + '. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'The first order ids of two partitions', c: 'raw', cols: ['Partition', 'The first eight order ids, in the order they were read'],
              rows: [[0, OR.partition_0_first_order_ids.join(', ')], [1, OR.partition_1_first_order_ids.join(', ')]], trk: 0 }],
            notes: ['Recorded. Order 2 (partition 1) was sent before order 5 (partition 0), but nothing says that a consumer reads partition 1 first. Across partitions there is no order.']
          },
          {
            say: 'So the rule has two halves. **Inside a partition**, order is exact. **Across partitions**, there is none. If you need all the records of a store in order, they need the same key. If you need a total order of every order in the company, one partition is the only way, and it will not scale.',
            tabs: [{ layer: 'RECORDED', name: 'The order guarantee', c: 'raw', cols: ['Question', 'Answer'],
              rows: [['Is every partition in order?', OR.every_partition_is_in_order ? 'yes' : 'no'], ['Does a store stay in one partition?', OR.one_store_stays_in_one_partition ? 'yes' : 'no'], ['Is there an order between two partitions?', 'no']], trk: 1 }],
            notes: ['Recorded.']
          }
        ]
      }),

      B.rows({
        id: 'm3-add', t: 1, src: 'rec', title: 'Add partitions, and the keys move',
        steps: [
          {
            say: 'I made a topic of three partitions, sent one order for each store, then **added three partitions** and sent one order for each store again. Here is where each store went before and after. **' + AS.moved + ' of ' + AS.keys + '** stores moved.',
            tabs: [{ layer: 'RECORDED', name: 'The partition of each key before and after', c: 'raw', cols: AD.cols, rows: AD.rows, trk: 0 }],
            notes: ['Recorded. The new partitions are ' + AS.new_partitions.join(', ') + '. Records written before stay where they were: Kafka never moves records.']
          },
          {
            say: 'Take store s01. Its old records are in partition ' + AD.rows.filter(function (r) { return r[0] === 's01'; })[0][1] + '. Its new ones are in partition ' + AD.rows.filter(function (r) { return r[0] === 's01'; })[0][2] + '. A consumer that reads both partitions can see the **new** order of s01 before the **old** one. The order of that store is broken for as long as the old records exist.',
            tabs: [{ layer: 'RECORDED', name: 'What a moved key means', c: 'raw', cols: ['Fact', 'Value'],
              rows: [['Keys that moved', AS.moved + ' of ' + AS.keys], ['Keys that stayed', AS.stayed], ['Records that Kafka moved', 'none'], ['Order of a moved key across the change', 'not guaranteed']], trk: 1 }],
            notes: ['You can add partitions to a topic. You can never remove them. Kafka has no command to reduce a partition count.']
          }
        ]
      }),

      B.rows({
        id: 'm3-clients', t: 2, src: 'rec', title: 'Two clients, one key, two partitions',
        steps: [
          {
            say: 'The default partitioner of the Java client and the console tools is murmur2. The default of the librdkafka clients, which sit under the Python, Go and C clients, is **different**: a CRC32 hash. I sent the same twelve keys with both to the same six-partition topic. They disagree on **' + disagree + ' of 12** keys.',
            tabs: [{ layer: 'RECORDED', name: 'murmur2 (Java compatible)', c: 'raw', cols: PL.cols, rows: PL.rows, trk: 0 }, { layer: 'RECORDED', name: 'consistent_random (the librdkafka default)', c: 'raw', cols: PO.cols, rows: PO.rows, trk: 0 }],
            notes: ['Recorded. Store s01 on six partitions: ' + s01row[2] + ' with murmur2, ' + s01other[2] + ' with the librdkafka default. The same event, sent from two languages, lands in two partitions.']
          },
          {
            say: 'This causes a real bug. A Java application and a Python application both write orders keyed by store, and a consumer expects all of s01 in one partition. With different partitioners it gets **two partitions of s01** and the order breaks. The fix is to set the partitioner explicitly: in the librdkafka clients `partitioner=murmur2_random` gives the Java behaviour.',
            tabs: [{ layer: 'RECORDED', name: 'The setting', c: 'raw', cols: ['Client', 'Setting', 'Partitioner for keys'], rows: [['Java client', 'default', 'murmur2'], ['confluent-kafka (librdkafka)', 'default', 'consistent_random: CRC32'], ['confluent-kafka (librdkafka)', 'partitioner=murmur2_random', 'murmur2, like Java']], trk: 1 }],
            notes: ['The Java client default is from documentation. The librdkafka result is the recording above.']
          }
        ]
      }),

      B.rows({
        id: 'm3-keyless', t: 2, src: 'rec', title: 'Records without a key',
        steps: [
          {
            say: 'A record with **no key** goes to a partition that the producer picks, and it sticks to one partition for a whole batch before it moves on. I sent twelve thousand keyless records in two ways to a six-partition topic. First as a **steady stream**: a batch every twenty milliseconds. The six counts are close, and every one is a multiple of 100, because a batch went to one partition.',
            tabs: [{ layer: 'RECORDED', name: 'Records in each partition, a steady stream', c: 'raw', cols: ['Partition', 'Records'], rows: KL.steady_stream_records_per_partition_in_this_run.map(function (n, i) { return [i, n0(n)]; }), trk: 0 }],
            notes: ['Recorded. These numbers are different on every run, because the partition of each batch is chosen at random. The smallest share was ' + pct(KL.steady_stream_smallest_share) + ' percent and the largest ' + pct(KL.steady_stream_largest_share) + ' percent.']
          },
          {
            say: 'Then the same records as **one burst**, all queued in a few milliseconds. Now the producer keeps filling the same batch, and almost everything goes to **one partition**: the largest share was **' + pct(KL.one_burst_largest_share) + ' percent**. Keyless is even over time, and lumpy in bursts.',
            tabs: [{ layer: 'RECORDED', name: 'Records in each partition, one burst', c: 'raw', cols: ['Partition', 'Records'], rows: KL.one_burst_records_per_partition_in_this_run.map(function (n, i) { return [i, n0(n)]; }), trk: 1 }],
            notes: ['Recorded. Which partition gets the burst differs from run to run.']
          }
        ]
      }),

      B.talk({
        id: 'm3-count', t: 2, src: 'docs', title: 'How many partitions',
        say: 'There is no perfect number, and you can only go up. Press Next for the questions that decide it.',
        items: [
          ['Throughput', 'Measure what one partition can take on your hardware, for writes and for the consumer\'s work. Divide the target by the smaller number.', 'Target divided by what one partition can do.'],
          ['The consumers you want', 'A group has at most one consumer for each partition. If you want to run twenty consumers one day, you need at least twenty partitions.', 'Plan for the busiest the group will be.'],
          ['The brokers', 'A partition and its copies live on brokers. Too few partitions leave brokers idle. Thousands per broker make recovery, leader election and the metadata slow.', 'Spread, but not to the extreme.'],
          ['The keys', 'A key must keep its meaning. If order by key matters, changing the count later breaks it. Choose a number that you will not need to change, often a multiple of many numbers.', 'You cannot go down, and going up moves keys.'],
          ['The cost of too many', 'Each partition is files, memory and a replica to keep in sync. The overhead is per partition, so ten times as many partitions of the same data is slower to start and to fail over.', 'More is not free.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm3-q1', t: 1,
        q: 'A producer sends two orders with the key s01. What is true?',
        opts: [
          { t: 'They go to the same partition and are read in the order they were sent', fb: '' },
          { t: 'They go to the same partition, but may be read in any order', fb: 'Order inside a partition is exact.' },
          { t: 'They may go to different partitions to balance the load', fb: 'The hash of the key decides. It is the same.' },
          { t: 'They are always read at the same time', fb: 'Kafka makes no promise about time.' }
        ],
        ok: 0,
        why: 'The same key gives the same hash, so the same partition, as long as the number of partitions does not change. Inside a partition, records are read in the order that they were appended.'
      }),

      B.quiz({
        id: 'm3-q2', t: 1,
        q: 'A topic has 6 partitions and 12 keys. Which statement is true?',
        opts: [
          { t: 'Every partition gets exactly two keys', fb: 'A hash does not share evenly. Partition ' + empty[0][0] + ' got nothing in the recording.' },
          { t: 'Some partitions can get several keys and some none', fb: '' },
          { t: 'The keys are sorted into partitions by name', fb: 'The hash scrambles the names.' },
          { t: 'Kafka moves keys to keep the partitions even', fb: 'Kafka never rebalances records.' }
        ],
        ok: 1,
        why: 'A hash spreads keys randomly. With only twelve keys, the spread is uneven: in the recording one partition held five stores and one held none.'
      }),

      B.quiz({
        id: 'm3-q3', t: 1,
        q: 'You add three partitions to a topic of three. What happens to the records that are already in the topic?',
        opts: [
          { t: 'They stay where they are, and new records of some keys go to different partitions', fb: '' },
          { t: 'Kafka re-hashes them and moves them', fb: 'Kafka never moves written records.' },
          { t: 'They are deleted and written again', fb: 'No records are deleted.' },
          { t: 'The topic stops until the move is finished', fb: 'There is no move.' }
        ],
        ok: 0,
        why: 'Adding partitions only creates new empty ones. The hash divides by a new number, so about half of the keys now go to different partitions. Old records stay, and a key\'s history is split across two partitions.'
      }),

      B.quiz({
        id: 'm3-q4', t: 2,
        q: 'The orders topic has 12 partitions, and a consumer group runs 20 consumers. What do you see?',
        opts: [
          { t: 'Twenty consumers each get a part of a partition', fb: 'A partition is read by one consumer of a group.' },
          { t: 'Twelve consumers read, and eight sit idle', fb: '' },
          { t: 'Kafka adds eight partitions', fb: 'Kafka never changes the partition count by itself.' },
          { t: 'The group fails to start', fb: 'It starts, and the extra consumers wait.' }
        ],
        ok: 1,
        why: 'One partition is read by at most one consumer of a group, so twelve partitions can keep twelve consumers busy. The other eight are idle spares that take over when one of the twelve fails.'
      }),

      B.bug({
        id: 'm3-bug', t: 1, q: 'The tills must send each store\'s orders so that a consumer reads one store in order. Click the line that loses that guarantee.',
        file: 'till.py', lang: 'python',
        code: ['from confluent_kafka import Producer', 'p = Producer({"bootstrap.servers": "localhost:9092"})', 'for order in orders:', '    p.produce("orders", value=json.dumps(order))', 'p.flush()'].join('\n'),
        bad: [4],
        hint: 'What decides the partition of a record?',
        why: 'The record has a value and **no key**, so the producer spreads the records over the partitions batch by batch. Two orders of one store can go to different partitions and be read in any order. Add `key=order["store_id"]`.',
        fix: ['from confluent_kafka import Producer', 'p = Producer({"bootstrap.servers": "localhost:9092"})', 'for order in orders:', '    p.produce("orders", key=order["store_id"], value=json.dumps(order))', 'p.flush()'].join('\n'),
        cheer: 'Order by key needs a key.'
      }),

      B.order({
        id: 'm3-ord', t: 1, q: 'Put what the producer does with a keyed record in order.',
        items: [
          'Turn the key into bytes',
          'Run murmur2 on the bytes of the key',
          'Make the hash positive',
          'Divide by the number of partitions and take the remainder',
          'Put the record in the batch for that partition'
        ],
        why: 'Hash, make it positive, take the remainder, and then the record waits in the batch of that partition. The number of partitions is the only thing besides the key that matters.'
      }),

      B.decide({
        id: 'm3-dec', t: 2, src: 'docs', title: 'Decision: how many partitions for the orders topic',
        scenario: 'Brewline expects 5 MB/s of orders at peak, now, and maybe ten times that in two years. One partition handled 20 MB/s of writes in a test. The processing of one consumer thread is about 2 MB/s. The topic will have one consumer group for the warehouse. You choose.',
        opts: [
          { t: '3 partitions', d: 'Enough for the writes.', lose: 'The consumer work is 2 MB/s for each partition: at 5 MB/s you need three consumers, and in two years at 50 MB/s you would need twenty-five. You could not scale the group.' },
          { t: '24 partitions', d: 'Room for 48 MB/s of consumer work, and for twenty-four consumers.', lose: '' },
          { t: '2,000 partitions', d: 'Never worry again.', lose: 'Each partition costs files, memory and replication traffic. Thousands of partitions slow recovery and leader election for no gain.' }
        ],
        pick: 1,
        why: 'The consumer\'s work is the limit, not the write rate: target divided by 2 MB/s gives 25 at ten times the volume. Twenty-four partitions leave room to grow and are a multiple of many numbers, so the consumers can be split evenly.',
        when: 'If the consumer work were fast, the write rate would decide, and a handful of partitions would do. Say that you would measure both.'
      }),

      B.incident({
        id: 'm3-inc', t: 2, src: 'docs', title: 'Incident: the store totals are wrong after a weekend change', time: '09:15',
        alert: '**The dashboard shows some stores refunded before they were sold.** On Saturday the platform team went from 6 to 12 partitions on `orders`, "to give the consumers room". No code changed.',
        clues: ['The wrong totals are for stores that moved to a different partition', 'The consumer processes each partition on its own thread', 'It keeps one running total for each store in memory'],
        opts: [
          { t: 'Accept that old and new records of a moved key are in different partitions, drain the old records before the new ones count, and avoid partition changes on keyed topics in future', fb: '' },
          { t: 'Restart the consumers, to clear the totals', fb: 'The order problem is in the data layout, not in the memory of the consumers.' },
          { t: 'Add a third partitioner at the producers', fb: 'It would move more keys.' },
          { t: 'Lower the partition count back to 6', fb: 'Kafka cannot reduce a partition count.' }
        ],
        best: 0,
        why: 'When partitions were added, the hash divided by a new number, so some stores moved. The older orders of a store are in the old partition and the newer ones in the new one, and two threads read them with no order between them. The refund of a recent order can be processed before the sale in the old partition.',
        checks: [
          ['Compare partition counts', 'The change on Saturday is the clue.'],
          ['Find a moved key', 'Hash the key with the old and the new count and compare.'],
          ['Look at the offsets', 'The same store has records in two partitions.']
        ],
        tell: 'Adding partitions changed where some stores go, so their old and new orders are read in two partitions with no order between them. We reprocess the affected stores, and we will plan the partition count for the long term, or create a new topic and migrate, instead of changing a keyed topic.',
        prevent: ['Choose the partition count with room for the future', 'Do not add partitions to a topic where order by key matters, unless the consumers can cope', 'To change the count safely, create a new topic and migrate the readers']
      }),

      B.incident({
        id: 'm3-inc2', t: 2, src: 'rec', title: 'Incident: one consumer is always behind', time: '14:40',
        alert: '**The consumer lag of the warehouse loader is growing on one partition only.** Six consumers, six partitions. Five of them are idle most of the time. The sixth is at full speed and still falling behind.',
        clues: ['One partition holds more than half of the records of the topic', 'One store sells a third of the orders', 'The consumers do the same work for every record'],
        opts: [
          { t: 'Confirm the skew from the partition sizes, then split the hot key with a bucket, or give that partition a stronger consumer', fb: '' },
          { t: 'Add more consumers to the group', fb: 'A partition has one consumer at most, so extra consumers sit idle.' },
          { t: 'Add more partitions', fb: 'The hot key still goes to one partition, and the other keys move.' },
          { t: 'Lower the batch size of the producer', fb: 'It does not change the distribution.' }
        ],
        best: 0,
        why: 'The key decides the partition, so one very busy key makes one very busy partition. In the recording, one partition held ' + pct(busiest[2]) + ' percent of the records. More consumers or more partitions do not change that. Spread the key with a bucket, or make the single consumer faster.',
        checks: [
          ['Compare the end offsets of the partitions', '`kafka-get-offsets.sh` or the consumer group tool shows which partition is far ahead.'],
          ['Count the records by key', 'One key that is a third of the traffic is the skew.'],
          ['Look at how the consumers are spread', 'Idle consumers next to one busy one is the mark of a hot partition.']
        ],
        tell: 'One store makes more than half of the records in one partition, and a partition has one consumer at most, so that consumer is the limit. We split the hot store\'s key into buckets, which spreads it over partitions, and the loader merges the buckets.',
        prevent: ['Look at the partition sizes after every launch', 'Alert on lag per partition as well as on the group', 'Design keys with the biggest customer or store in mind']
      }),

      B.qa({
        id: 'qa-key', t: 1, tag: 'Partitions', secs: 75,
        q: 'How does the key decide the partition?',
        pts: ['Hash of the key bytes (murmur2 in Java)', 'Positive, modulo the number of partitions', 'Same key, same partition', 'Order inside a partition', 'Changes when the count changes'],
        short: 'The producer hashes the bytes of the key, in the Java client with **murmur2**, makes the result positive and takes the remainder after dividing by the number of partitions. The same key always gives the same partition, as long as the partition count is the same, and the partitioner is the same. Records of one partition are read in the order that they were appended, so records with the same key keep their order. If there is no key, the producer picks partitions batch by batch. Because the number of partitions is part of the formula, adding partitions moves some keys.',
        fu: [['What if two clients use different partitioners?', 'The same key can go to different partitions. The librdkafka default is a CRC32 hash, not murmur2, and I saw them disagree on ten of twelve keys.'], ['Can you pick the partition yourself?', 'Yes. A producer can name the partition of a record, and a custom partitioner can implement any rule.']],
        trap: 'Saying that Kafka assigns keys to partitions evenly. It hashes, so some partitions get more.',
        real: 'Two services write to one topic. How do you make sure a store stays in one partition?'
      }),

      B.qa({
        id: 'qa-count', t: 2, tag: 'Partitions', secs: 75,
        q: 'How many partitions should a topic have?',
        pts: ['Target throughput divided by one partition\'s throughput', 'Consumers: at most one per partition', 'Not too many: files, memory, recovery', 'You can add, never remove', 'Keys move when you add'],
        short: 'I start from the **throughput**: the target, divided by what one partition can do for the producers and for the consumers, whichever is smaller. Then I check the **parallelism** I want in the consumer group, because a group has at most one consumer per partition. Then the other side: every partition costs files, memory and replication, so thousands per broker make recovery and leader election slow. I choose a number with room for growth, because I can add partitions but never remove them, and **adding partitions moves keys**, which breaks order by key for a while. So I get the number right the first time, and I measure instead of guessing.',
        fu: [['Is more always better?', 'No. Each partition has a cost on the broker, in the metadata and during failover.'], ['How do you change it later?', 'Adding partitions moves keys. For a keyed topic, it is safer to create a new topic with the right count and migrate the readers.']],
        trap: 'Saying that more partitions are always faster.',
        real: 'We expect ten times the load. What do you do now?'
      }),

      B.qa({
        id: 'qa-addpart', t: 2, tag: 'Partitions', secs: 75,
        q: 'What happens when you add partitions to a topic?',
        pts: ['New empty partitions', 'Old records stay', 'The hash divides by a new N: keys move', 'Order by key breaks across the change', 'Cannot reduce'],
        short: 'Kafka creates the new partitions empty and leaves every old record where it is. The partitioner divides the hash by the new count, so about half of the keys, in my recording six of twelve, now go to a different partition. Order by key is **not kept across the change**: the old records of a key are in the old partition, and the new ones in another, and a consumer reads them with no order between them. Consumers in a group get a rebalance to share the new partitions. A partition count can never be lowered. So for a keyed topic I plan the count in advance, or I create a new topic and move the readers.',
        fu: [['How do you add them?', 'With kafka-topics --alter --partitions N. In the recording I used the admin client to go from 3 to 6.'], ['Does it matter for unkeyed topics?', 'Much less. There is no order by key to lose, only a new rebalance.']],
        trap: 'Saying that Kafka rebalances the existing data.',
        real: 'The business wants twice the consumers. What do you tell them?'
      }),

      B.recap({
        id: 'm3-recap', n: 3, badge: 'Partition Planner', color: '#FDE68A',
        pts: [
          'The key is hashed with **murmur2** (Java clients), made positive, and divided by the **number of partitions**. The remainder is the partition.',
          'Order is kept **inside a partition**. Records with the same key stay in order. Across partitions there is no order.',
          'A few keys give an uneven spread: in the recording one partition had **more than half** of the records and one had **none**.',
          'Adding partitions **moves keys**. Old records stay. You can never remove partitions.',
          'Two clients can have **different default partitioners**: the librdkafka clients use CRC32, Java uses murmur2.',
          'The partition count caps the **consumers** in a group. Choose it from the target throughput, the consumers and the cost of too many.'
        ]
      })
    ]
  });
})();
