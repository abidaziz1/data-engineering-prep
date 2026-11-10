/* Mission 9: Event Hubs. Partitions, partition keys, consumer groups, checkpoints and Capture.
   Recorded with the real Python client library of Azure (azure-eventhub and its Blob checkpoint store, against Azurite, a storage emulator) and with DuckDB:
   how many events fit in a batch, how the checkpoint store claims partitions with an ETag, and how 600,000 order events would spread over 4 partitions
   for different keys. Event Hubs does not publish how it hashes a key, so that last spread uses MD5 modulo 4 as a stand-in. The service itself, its tiers,
   limits and prices come from the Azure documentation, and nothing here ran on Event Hubs. */
(function () {
  var B = LAB.b, G = LAB.get;
  var BK = G.counts('eventhubs.batch'), CK = G.counts('eventhubs.checkpoints'), KS = G.counts('eventhubs.keyspread'), BY = KS.by_key;
  function n0(n) { return Number(n).toLocaleString('en-US'); }
  function pctOf(x) { return (x * 100).toFixed(1) + '%'; }
  function brow(limit, payload) { return BK.rows.filter(function (r) { return r.limit_bytes === limit && r.payload_bytes === payload; })[0]; }
  var KB256 = 262144, MB1 = 1048576;
  var REPLAYED = LAB.W.ehInfo.replayed(100, 2547);

  G.expect(BK.limits.join() === KB256 + ',' + MB1 && brow(MB1, 100).events_in_batch === 9532 && brow(MB1, 100).events_with_key === 6678 && brow(MB1, 1000).events_in_batch === 1032, 'a 1 MB batch holds 9,532 events of 100 bytes, or 6,678 with a partition key');
  G.expect(brow(KB256, 300000).events_in_batch === 0 && brow(MB1, 300000).events_in_batch === 3 && brow(KB256, 100000).events_in_batch === 2, 'a 300,000 byte event does not fit a 256 KB batch and three fit a 1 MB batch');
  G.expect(BK.partition_key_travels_as['x-opt-partition-key'] === 'C-0001', 'the key travels as x-opt-partition-key');
  G.expect(CK.claimed_by_worker_a.length === 4 && CK.stale_etag_claim_returned.length === 0 && CK.right_etag_claim_returned[0][0] === '1' && CK.right_etag_claim_returned[0][1] === 'worker-B' && CK.checkpoints[0].offset === '8192', 'a stale ETag claims nothing, the current ETag claims partition 1, and the checkpoint is offset 8192');
  G.expect(KS.partitions === 4 && BY.order_id.skew <= 1.01 && BY.customer_id.skew < 1.1 && BY.status.skew > 3.5 && BY.status.empty === 2 && BY.channel.empty === 1 && BY.store_id.distinct === 12, 'order_id and customer_id spread evenly over 4 partitions, status puts 96 percent in one, channel leaves one empty');
  G.expect(REPLAYED === 47, 'a checkpoint every 100 events and a crash at event 2,547 repeats 47 events');

  var SEND = [
    'from azure.eventhub import EventData, EventHubProducerClient',
    'from azure.identity import DefaultAzureCredential',
    '',
    'producer = EventHubProducerClient(',
    '    fully_qualified_namespace="evhns-brewline-prod.servicebus.windows.net",',
    '    eventhub_name="orders",',
    '    credential=DefaultAzureCredential(),',
    ')',
    '',
    'with producer:',
    '    batch = producer.create_batch(partition_key="C-0001")',
    '    for body in bodies:',
    '        try:',
    '            batch.add(EventData(body))',
    '        except ValueError:                      # the batch is full',
    '            producer.send_batch(batch)',
    '            batch = producer.create_batch(partition_key="C-0001")',
    '            batch.add(EventData(body))',
    '    if len(batch):',
    '        producer.send_batch(batch)'
  ].join('\n');

  var CONSUME = [
    'from azure.eventhub import EventHubConsumerClient',
    'from azure.eventhub.extensions.checkpointstoreblob import BlobCheckpointStore',
    'from azure.identity import DefaultAzureCredential',
    '',
    'credential = DefaultAzureCredential()',
    'store = BlobCheckpointStore(',
    '    blob_account_url="https://stbrewlinelakeprod.blob.core.windows.net",',
    '    container_name="checkpoints",',
    '    credential=credential,',
    ')',
    'client = EventHubConsumerClient(',
    '    fully_qualified_namespace="evhns-brewline-prod.servicebus.windows.net",',
    '    eventhub_name="orders",',
    '    consumer_group="silver-loader",',
    '    credential=credential,',
    '    checkpoint_store=store,',
    ')',
    '',
    'def on_event(partition_context, event):',
    '    handle(event)                                 # must be safe to repeat',
    '    if event.sequence_number % 100 == 0:',
    '        partition_context.update_checkpoint(event)',
    '',
    'with client:',
    '    client.receive(on_event=on_event, starting_position="-1")'
  ].join('\n');

  var BUG_CP = [
    'def on_event(partition_context, event):',
    '    partition_context.update_checkpoint(event)',
    '    write_to_lake(event.body_as_str())'
  ].join('\n');
  var FIX_CP = [
    'def on_event(partition_context, event):',
    '    write_to_lake(event.body_as_str())',
    '    partition_context.update_checkpoint(event)'
  ].join('\n');

  var BUG_CLIENT = [
    'for body in bodies:',
    '    with EventHubProducerClient(fully_qualified_namespace=NS, eventhub_name="orders", credential=cred) as producer:',
    '        batch = producer.create_batch()',
    '        batch.add(EventData(body))',
    '        producer.send_batch(batch)'
  ].join('\n');
  var FIX_CLIENT = [
    'with EventHubProducerClient(fully_qualified_namespace=NS, eventhub_name="orders", credential=cred) as producer:',
    '    batch = producer.create_batch()',
    '    for body in bodies:',
    '        try:',
    '            batch.add(EventData(body))',
    '        except ValueError:',
    '            producer.send_batch(batch)',
    '            batch = producer.create_batch()',
    '            batch.add(EventData(body))',
    '    if len(batch):',
    '        producer.send_batch(batch)'
  ].join('\n');

  var BATCH_SQL = [
    'SELECT payload_bytes,',
    '       events_in_batch,',
    '       CEILING(1000000.0 / events_in_batch) AS batches_for_a_million',
    'FROM batch_sizes',
    'WHERE limit_bytes = 1048576',
    'ORDER BY payload_bytes;'
  ].join('\n');
  var BATCH_ROWS = BK.rows.filter(function (r) { return r.limit_bytes === MB1; });

  LAB.addChapter({
    id: 'm9', n: 9, title: 'Event Hubs', short: 'Event Hubs', blurb: 'Partitions and keys, consumer groups, checkpoints that survive a crash, Capture and sizing', minutes: 50,
    focus: ['snap', 'src'],
    goals: [
      'Say what an **event hub** is, and how it differs from a queue.',
      'Choose a **partition key**, and see how a bad one makes a hot partition.',
      'Explain **consumer groups**, and why parallel readers are limited by partitions.',
      'Use a **checkpoint** so that a crash repeats a few events and loses none.',
      'Write the **producer and consumer** code with batches and a checkpoint store.',
      'Use **Capture** to land the stream in the lake, and size the hub with **throughput units**.'
    ],
    say: 'Mission 9 is the stream. Brewline\'s website and app send thousands of events a second, and Event Hubs keeps them in order, per partition, until readers come for them. I used the real Python client of Azure to measure what fits in a batch and how readers claim partitions and save checkpoints, against an emulator. I measured how a partition key spreads 600,000 events over four partitions with a stand-in hash. The service itself, its tiers and limits come from the documentation.',
    scenes: [
      B.flow({
        id: 'm9-flow', t: 1, src: 'docs', title: 'An event hub, from producers to checkpoints', g: 'eventhubs', legend: true,
        steps: [
          { say: 'An event hub is a log that many producers write to and many readers read from, each at its own speed. Press Next to follow the events of the Brewline website, app and orders database.', cap: 'A shared log with partitions.' },
          { say: 'Step 1. Producers send events. An event with a partition key goes to the partition that the key hashes to, so the events of one customer stay together and in order. An event without a key goes to a partition that the service picks.', on: ['k1', 'k1b', 'k1c'], focus: ['p1', 'p2', 'p3', 'sh0', 'sh1', 'sh3'], cap: 'The key picks the partition.' },
          { say: 'Step 2. Readers read the partitions in order. A Function, Stream Analytics and Capture each read the same events, as different consumer groups. Capture writes the stream to the lake as Avro files.', on: ['k2', 'k2b', 'k2c'], focus: ['c1', 'c2', 'c3', 'sh0', 'sh1', 'sh2'], cap: 'Each consumer group reads everything.' },
          { say: 'Step 3. A reader saves a checkpoint: how far it has got in each partition. The store is a set of blobs in a storage account. After a restart or a crash, the reader continues from its checkpoint.', on: ['k3'], focus: ['c1', 'ck'], cap: 'A checkpoint is a bookmark.' },
          { say: 'The partition key is the choice that matters most. Order exists only inside a partition, and a key with few values makes one partition hot while the others sit idle. The next screens measure it.', focus: ['key', 'sh0', 'sh1', 'sh2', 'sh3'], cap: 'Choose the key with care.' }
        ]
      }),

      B.talk({
        id: 'm9-words', t: 1, src: 'docs', title: 'Six words to know',
        say: 'Event Hubs has its own vocabulary. Press Next for six words and one fact about each.',
        items: [
          ['Namespace', 'The container with an address, such as `evhns-brewline-prod.servicebus.windows.net`. It holds the event hubs, and it sets the tier and the throughput.', 'The address and the size.'],
          ['Event hub', 'One stream, like a topic. Brewline has one for orders and one for clicks. Producers write to it, and readers read from it.', 'One stream.'],
          ['Partition', 'An ordered log inside an event hub. Events are added at the end and never changed, and each gets an offset and a sequence number. On the Basic and Standard tiers the number of partitions is fixed when the event hub is created. Premium and Dedicated can add more.', 'Order lives here.'],
          ['Consumer group', 'A view of the whole stream with its own position. It is how two systems read the same events without disturbing each other.', 'A separate reader of everything.'],
          ['Retention', 'Events stay for a set time and then go, whether they were read or not. The quotas page gives up to 7 days on Standard and up to 90 days on Dedicated. Read the page for your tier.', 'A window, not an archive.'],
          ['Throughput', 'Basic and Standard are sized in throughput units. One unit allows 1 MB per second or 1,000 events per second in, and 2 MB per second or 4,096 events per second out. Premium uses processing units, and Dedicated uses capacity units.', 'Units of speed.']
        ],
        cols: 2
      }),

      B.widget({ id: 'm9-lab', kind: 'ehub', t: 1, src: 'rec', title: 'Lab: batches, ownership and checkpoints' }),

      B.code({
        id: 'm9-send', t: 1, src: 'docs', title: 'Send events in batches', file: 'send_orders.py', lang: 'python', code: SEND,
        steps: [
          { say: 'This is the producer in Python, with the client library of Azure. Press Next to go through it.', lines: null },
          { say: 'The client needs the namespace address, the name of the event hub and a credential. `DefaultAzureCredential` finds the identity of the machine, a managed identity in Azure and your login on a laptop, so there is no connection string with a key in the code.', lines: G.span(SEND, /^producer = /, /^\)/) },
          { say: 'A batch is the unit of sending. `create_batch` takes the partition key, and the key then travels with every event in the batch, so all of them go to the same partition.', lines: G.span(SEND, /create_batch\(partition_key="C-0001"\)/) },
          { say: '`add` raises `ValueError` when the next event does not fit. That is the signal to send the batch and start a new one. The lab measured it: with the key, a 1 MB batch holds ' + n0(brow(MB1, 100).events_with_key) + ' events of 100 bytes.', lines: G.span(SEND, /^        try:/, /batch.add\(EventData\(body\)\)$/) },
          { say: 'The last, partly filled batch must be sent as well. `len(batch)` is the number of events in it, so an empty batch is never sent.', lines: G.span(SEND, /^    if len\(batch\):/, /send_batch\(batch\)$/) }
        ],
        note: 'The call signatures are those of azure-eventhub ' + G.meta('azure-eventhub') + ', checked with Python. The code was not run against an event hub, since none was available. The batch behavior is the one that the lab recorded.'
      }),

      B.talk({
        id: 'm9-keyrules', t: 1, src: 'rec', title: 'What a partition key promises, and what it costs',
        say: 'The key is simple to use and easy to get wrong. Press Next for five rules.',
        items: [
          ['Same key, same partition', 'Events with the same key go to the same partition, and a reader sees them in the order they were sent. The service picks the partition from a hash of the key, and it does not publish the hash.', 'Order for one key.'],
          ['No order across partitions', 'Two customers\' events can be read in any order. If order across all events matters, you need one partition, and then you have no parallelism.', 'Order is local.'],
          ['The key costs bytes', 'The key travels with each event as the annotation `' + Object.keys(BK.partition_key_travels_as)[0] + '`. In the lab, a 1 MB batch of 100-byte events held ' + n0(BK.without_partition_key_events) + ' events without a key and ' + n0(BK.with_partition_key_events) + ' with one. For large events the cost is small.', 'Small events pay the most.'],
          ['No key', 'Without a key the service spreads events over the partitions. You get the best spread and no order between events.', 'Spread, with no order.'],
          ['Changing the count moves keys', 'If the number of partitions changes, keys map to different partitions, and the order of events across the change is not kept. Choose the count with growth in mind, and avoid changing it.', 'Plan the count at the start.']
        ],
        cols: 1
      }),

      B.rows({
        id: 'm9-keys', t: 1, src: 'rec', title: 'Four partitions, five possible keys',
        steps: [
          {
            say: 'I took 600,000 order events and sent them over 4 partitions with each possible key, using a stand-in hash. A good key spreads evenly: order_id and customer_id put about a quarter in each partition. Look at what the others do.',
            tabs: [{ layer: 'PARTITIONS', name: 'events in each of 4 partitions, by partition key', c: 'ing', cols: ['partition key', 'values', 'part. 0', 'part. 1', 'part. 2', 'part. 3', 'busiest'], rows: ['order_id', 'customer_id', 'store_id', 'channel', 'status'].map(function (k) { var v = BY[k]; return [k, n0(v.distinct)].concat(v.partitions.map(function (n) { return n0(n); })).concat([pctOf(v.busiest_share)]); }), chg: [[4, 4], [4, 6], [3, 3], [3, 6]], trk: 4 }],
            notes: ['The hash is MD5 of the key as text, modulo 4, because Event Hubs does not publish its own. The exact numbers would differ on the service, and the shape would not: **' + BY.status.distinct + ' values** can fill at most ' + BY.status.distinct + ' partitions, and one dominant value makes one hot partition.']
          },
          {
            say: 'The status key is the worst. ' + pctOf(BY.status.busiest_share) + ' of the events land in one partition, and two partitions get nothing. The reader of that partition has all the work, and the other readers idle. Adding readers cannot help, because a partition is read by one reader at a time.',
            tabs: [{ layer: 'HOT PARTITION', name: 'the same events keyed by status', c: 'mon', cols: ['partition', 'events', 'share of the events'], rows: BY.status.partitions.map(function (n, i) { return [String(i), n0(n), pctOf(n / KS.events)]; }), chg: [[2, 1], [2, 2]], trk: 2 }],
            notes: ['A key is a promise that events belong together. A status is a state, and most events share the common state, so it groups too much. A customer or a device id groups only what belongs together.']
          }
        ]
      }),

      B.talk({
        id: 'm9-groups', t: 1, src: 'docs', title: 'Consumer groups and parallel readers',
        say: 'Readers share the work inside a group, and groups never share. Press Next for five rules.',
        items: [
          ['One reader for each partition', 'Inside a consumer group, a partition is read by one reader at a time. A group can use at most as many readers as there are partitions. With 4 partitions, a fifth reader waits and does nothing.', 'Partitions cap the parallelism.'],
          ['Groups are independent', 'Each consumer group has its own position, so a Function, a Stream Analytics job and Capture read the same events without knowing about each other. A slow group does not slow a fast one.', 'Many readers of one stream.'],
          ['The default group', 'Every event hub has a group named `$Default`. Use a named group for each application, such as `silver-loader`, so that positions are not shared by mistake. The Basic tier allows only one group, and Standard allows more.', 'One group for each application.'],
          ['Balancing', 'Readers in a group split the partitions among themselves. When one joins, leaves or dies, the partitions are shared again. The readers coordinate through ownership records in the checkpoint store, as the lab showed.', 'Readers find each other in a blob container.'],
          ['Lag', 'Lag is the distance between the newest event in a partition and the checkpoint of a reader, in events or in time. It is the number to alert on, for each partition.', 'The metric that says a reader is behind.']
        ],
        cols: 1
      }),

      B.rows({
        id: 'm9-blobs', t: 1, src: 'rec', title: 'What the checkpoint store looks like in Blob Storage',
        steps: [
          {
            say: 'The store is only blobs. Ownership records say which reader owns which partition, and a checkpoint says where to restart. Here are the five blobs that my run left in the container, with their metadata.',
            tabs: [{ layer: 'CONTAINER', name: 'checkpoints, after the run of the lab', c: 'raw', cols: ['blob', 'metadata'], rows: CK.blobs.map(function (b) { return [b.name.replace('<namespace>/orders/$default/', ''), Object.keys(b.metadata).map(function (k) { return k + ' = ' + b.metadata[k]; }).join(', ')]; }), chg: [[2, 1]], trk: 2 }],
            notes: ['Under the namespace and the event hub, the group `$default` has an `ownership` folder and a `checkpoint` folder. Partition 1 is owned by worker-B, which took it from worker-A with the current ETag.']
          },
          {
            say: 'A reader that restarts reads these blobs. It claims its partitions with a conditional write, so two readers cannot take one partition. Then it reads the checkpoint of each partition and continues from the offset.',
            tabs: [{ layer: 'CHECKPOINT', name: 'checkpoint of partition 0', c: 'qual', cols: ['partition', 'offset', 'sequence number'], rows: CK.checkpoints.map(function (c) { return [c.partition_id, c.offset, String(c.sequence_number)]; }), trk: 0 }],
            notes: ['The recorded run saved offset 4096 and then offset 8192 for partition 0. The second write replaced the first, so there is one checkpoint for each partition and group.']
          }
        ]
      }),

      B.code({
        id: 'm9-consume', t: 1, src: 'docs', title: 'Read events and save a checkpoint', file: 'consume_orders.py', lang: 'python', code: CONSUME,
        steps: [
          { say: 'The reader needs one more piece than the producer: a place to keep its position. Press Next.', lines: null },
          { say: 'The checkpoint store is a blob container. It uses the same credential, so the reader needs a role that can read and write blobs there, and the container must exist. In my run the store did not create it, so create it in your template.', lines: G.span(CONSUME, /^store = /, /^\)/) },
          { say: 'The client names the consumer group and gets the store. With a store, several copies of this program share the partitions and balance themselves.', lines: G.span(CONSUME, /^client = /, /^\)/) },
          { say: 'The handler is called for each event. It does the work first, and then, every 100 events, it saves a checkpoint. The order matters: a checkpoint before the work would lose events after a crash.', lines: G.span(CONSUME, /^def on_event/, /update_checkpoint/) },
          { say: '`starting_position="-1"` means the start of the stream, and it applies only when a partition has no checkpoint yet. After that, the reader continues from the checkpoint.', lines: G.span(CONSUME, /client.receive/) }
        ],
        note: 'The call signatures are those of azure-eventhub ' + G.meta('azure-eventhub') + ' and its Blob checkpoint store ' + G.meta('azure-eventhub-checkpointstoreblob') + ', checked with Python. The code was not run against an event hub.'
      }),

      B.talk({
        id: 'm9-atleast', t: 1, src: 'rec', title: 'At least once: a crash repeats events',
        say: 'A checkpoint is a bookmark, not a guarantee of exactly once. Press Next for what that means in practice.',
        items: [
          ['What a crash does', 'A reader processes events and saves a checkpoint every now and then. If it crashes between two checkpoints, the next reader restarts at the last one, and processes the events after it a second time.', 'Events repeat, and none are lost.'],
          ['The numbers', 'With a checkpoint every 100 events and a crash after event 2,547, the next reader repeats **' + REPLAYED + '** events. With a checkpoint after every event, nothing repeats, and the reader writes a blob for every event.', 'Fewer checkpoints, more repeats.'],
          ['So make the handler safe to repeat', 'Write with a merge by event key, or to a dated folder, as in mission 5. A duplicate event then changes nothing. This is the rule for every at-least-once system.', 'Idempotent, as always.'],
          ['Checkpoint after the work', 'A checkpoint saved before the work turns a crash into data loss. Always do the work first and save the checkpoint after it.', 'Work, then bookmark.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm9-capture', t: 1, src: 'docs', title: 'Capture: land the stream in the lake',
        say: 'You do not have to write a reader to get events into the lake. Press Next for how Capture does it.',
        items: [
          ['What it does', 'Capture writes the events of an event hub to Blob Storage or ADLS Gen2 as Avro files, with no code and no reader to run. It is the easiest way to fill bronze.', 'Bronze with a setting.'],
          ['Two windows', 'Capture writes a file when a time window or a size window is reached, whichever comes first. The time window is 1 to 15 minutes and defaults to 5. The size window is 10 to 500 MB and defaults to 300 MB. You can choose whether empty files are written.', 'Files by time or by size.'],
          ['The path', 'A name template builds the folder from the namespace, the event hub, the partition and the date and time, for example down to the minute. Files land in folders that a lake query can skip, as in mission 7.', 'Folders by time.'],
          ['The file', 'Each file is Avro. A record holds the body as bytes, together with the offset, the sequence number and the time that the event was enqueued. A Spark job reads the files and parses the body.', 'Bytes plus a few fields.'],
          ['What it is not', 'Capture does not clean or filter anything, and it does not replace a reader that must react in seconds. It is also tied to the tier of the namespace, so check the tier comparison.', 'A copy of the stream, not a transformation.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm9-tiers', t: 2, src: 'docs', title: 'Tiers: what you buy',
        say: 'The tier sets what a namespace can do and how you pay. Press Next to compare. The exact limits change, so read the quotas page for your region.',
        cols: ['Tier', 'Sized in', 'Notable limits', 'Good for'],
        hl: 1,
        rows: [
          ['Basic', 'throughput units', 'one consumer group, events up to 256 KB, short retention', 'simple, low-volume streaming'],
          ['Standard', 'throughput units, up to 20 on self-serve', 'several consumer groups, events up to 1 MB, retention up to 7 days, Capture and a Kafka endpoint', 'most production streams'],
          ['Premium', 'processing units: 1, 2, 4, 6, 8, 10, 12 or 16', 'isolated resources, events up to 1 MB, longer retention than Standard, partitions can be added', 'steady, larger streams that need isolation'],
          ['Dedicated', 'capacity units in a single-tenant cluster', 'events up to 1 MB, retention up to 90 days', 'the largest streams, with their own cluster']
        ],
        steps: [
          { upto: 2, say: 'Basic and Standard are the shared tiers. Standard is the one with the features that a data platform needs.' },
          { upto: 4, say: 'Premium and Dedicated give isolation and room to grow, and they cost accordingly.' }
        ],
        pick: 'Start with **Standard**. Move to **Premium or Dedicated** when you need isolation, longer retention or more partitions, and check each number on the quotas page.'
      }),

      B.talk({
        id: 'm9-kafka', t: 3, src: 'docs', title: 'The Kafka endpoint',
        say: 'Many teams already have Kafka clients. Press Next for what Event Hubs offers them.',
        items: [
          ['A Kafka endpoint', 'The tiers above Basic expose an endpoint that speaks the Kafka protocol. A Kafka producer or consumer connects to the namespace with a configuration change, and no broker is run by you.', 'Kafka clients, no brokers.'],
          ['The mapping', 'An event hub is like a Kafka topic and a partition is a partition. A Kafka consumer group is an Event Hubs consumer group, and offsets are kept by the service.', 'Same ideas, different names.'],
          ['What to check', 'It is not every part of Kafka. Features outside the core protocol differ, so test the clients and the features that you use against the current documentation before you commit.', 'Compatible is not identical.'],
          ['When it helps', 'Moving an existing Kafka pipeline to Azure with little change, or letting a partner that uses Kafka send you events. A new pipeline written for Azure can use the native client library.', 'A way to migrate.']
        ],
        cols: 1
      }),

      B.decide({
        id: 'm9-dec', t: 2, src: 'rec', title: 'Decision: which partition key for the order events?',
        scenario: 'The order events go to an event hub with **4 partitions**. A reader builds the state of each customer\'s orders, so the **events of one customer must be read in order**. Peak load is 2,000 events a second, and you want all four readers busy.',
        opts: [
          { t: 'No key, so the service spreads the events', d: 'The best spread, and nothing to choose.', lose: 'One customer\'s events land in different partitions and are read in any order, so the reader cannot build the state of a customer.' },
          { t: 'The customer id', d: 'The events of one customer stay in one partition, in order. In the recording ' + n0(BY.customer_id.distinct) + ' customers spread evenly: ' + pctOf(BY.customer_id.busiest_share) + ' in the busiest partition.' },
          { t: 'The order status', d: 'Easy to explain: orders in the same state go together.', lose: 'There are only ' + BY.status.distinct + ' values, and one dominates. In the recording ' + pctOf(BY.status.busiest_share) + ' of the events went to one partition, and two got nothing.' }
        ],
        pick: 1,
        why: 'The customer id keeps together what must stay in order, and it has many values with no dominant one, so the four readers share the work. The recording shows it: the busiest partition holds ' + pctOf(BY.customer_id.busiest_share) + ' of the events, against ' + pctOf(BY.status.busiest_share) + ' for status. A very busy single customer is the one risk to watch.',
        when: 'If events need no order, drop the key for the best spread. If one customer can be huge, as a reseller can, consider a key that adds a small suffix, and accept order only within each suffix.'
      }),

      B.quiz({
        id: 'm9-q1', t: 1,
        q: 'Two events are sent with the same partition key. What does Event Hubs promise?',
        opts: [
          { t: 'They go to the same partition, and a reader sees them in the order sent', fb: '' },
          { t: 'They are delivered exactly once', fb: 'Readers get events at least once, so a crash can repeat them.' },
          { t: 'They go to different partitions, so they are read in parallel', fb: 'The key exists to keep related events together.' },
          { t: 'They are merged into one event', fb: 'Events are never merged by the service.' }
        ],
        ok: 0, why: 'The service hashes the key to a partition. Inside a partition, events keep their order. Across partitions there is no order at all.'
      }),

      B.quiz({
        id: 'm9-q2', t: 1,
        q: 'An event hub has 4 partitions and one consumer group. How many readers of that group can read in parallel?',
        opts: [
          { t: '1', fb: 'A group can use more than one reader.' },
          { t: '4, one for each partition. A fifth reader waits', fb: '' },
          { t: '8, two for each partition', fb: 'A partition is read by one reader at a time inside a group.' },
          { t: 'As many as you like', fb: 'Partitions cap the parallelism.' }
        ],
        ok: 1, why: 'Inside a consumer group each partition has one reader at a time. With 4 partitions the best case is 4 readers, so the number of partitions is the ceiling for reading in parallel.'
      }),

      B.quiz({
        id: 'm9-q3', t: 1,
        q: 'A reader saves a checkpoint every 100 events and crashes after event 2,547. How many events does the next reader process a second time?',
        opts: [
          { t: 'None, because the checkpoint says where to restart', fb: 'The checkpoint was saved at event 2,500, so the events after it are read again.' },
          { t: String(REPLAYED), fb: '' },
          { t: '100', fb: 'That is the interval. The number repeated is what came after the last checkpoint.' },
          { t: '2,547', fb: 'That would mean no checkpoint at all.' }
        ],
        ok: 1, why: 'The last checkpoint was after event 2,500, so the next reader restarts there and processes events 2,501 to 2,547 again: ' + REPLAYED + ' events. That is why the handler must be safe to repeat.'
      }),

      B.quiz({
        id: 'm9-q4', t: 1,
        q: 'On the Basic tier a batch can hold 256 KB. What does the client do when you add one event of 300,000 bytes?',
        opts: [
          { t: 'It splits the event across two batches', fb: 'The client never splits an event.' },
          { t: 'It raises ValueError, because even one event does not fit', fb: '' },
          { t: 'It compresses the event until it fits', fb: 'The client does not compress.' },
          { t: 'It sends the event in a batch of its own with a higher limit', fb: 'The limit comes from the tier.' }
        ],
        ok: 1, why: 'The recording shows ' + brow(KB256, 300000).events_in_batch + ' events fitting a 256 KB batch for a 300,000 byte body, with the error "EventDataBatch has reached its size limit: 262144". On a tier with a 1 MB limit, ' + brow(MB1, 300000).events_in_batch + ' of them fit. Split the event, or store the body in a blob and send its path.'
      }),

      B.quiz({
        id: 'm9-q5', t: 2,
        q: 'In the recording, which of these keys spread 600,000 events most evenly over 4 partitions?',
        opts: [
          { t: 'status', fb: 'It had ' + BY.status.distinct + ' values and put ' + pctOf(BY.status.busiest_share) + ' in one partition.' },
          { t: 'channel', fb: 'It had ' + BY.channel.distinct + ' values, and one partition was empty.' },
          { t: 'customer_id', fb: '' },
          { t: 'store_id', fb: 'It had 12 values, and the busiest partition held ' + pctOf(BY.store_id.busiest_share) + '.' }
        ],
        ok: 2, why: 'With ' + n0(BY.customer_id.distinct) + ' values and no dominant one, customer_id put about a quarter of the events in each partition, and it is also the key that keeps one customer\'s events in order. order_id spread as evenly, and it keeps nothing together.'
      }),

      B.quiz({
        id: 'm9-q6', t: 2,
        q: 'A new consumer group starts on an event hub that holds three days of events. Where does a reader start if you set no starting position?',
        opts: [
          { t: 'At the oldest event that is still retained', fb: 'That needs starting_position="-1".' },
          { t: 'At the newest events, because the default position is the end of the stream', fb: '' },
          { t: 'At the first event ever sent', fb: 'Events older than the retention are gone.' },
          { t: 'The reader refuses to start without a position', fb: 'It starts, at the default position.' }
        ],
        ok: 1, why: 'Without a checkpoint and without a starting position, the Python client starts at the end of the stream, which is `@latest`. To read what is still retained you pass `starting_position="-1"`. Once the reader has saved a checkpoint, that wins over the starting position.'
      }),

      B.order({
        id: 'm9-ord', t: 1, q: 'Put the life of one reader in order.',
        items: [
          'Start the consumer with a consumer group and a checkpoint store',
          'Claim partitions by writing ownership blobs with a conditional write',
          'Read the checkpoint of each owned partition, or use the starting position',
          'Receive events and process them in a way that is safe to repeat',
          'Save a checkpoint after the work',
          'Crash',
          'Another reader claims the partition and continues from the checkpoint, repeating a few events'
        ],
        why: 'Ownership comes before reading, because only the owner may read a partition. The checkpoint tells the reader where to start, and it is saved after the work, so a crash loses nothing. The next reader repeats what came after the last checkpoint, which the handler tolerates.'
      }),

      B.bug({
        id: 'm9-bug', t: 1, src: 'docs', q: 'After a crash, some orders never reach the lake. Click the line that loses them.',
        file: 'on_event.py', lang: 'python', code: BUG_CP, bad: [2],
        hint: 'What does the checkpoint say about this event, and has the work been done yet?',
        why: 'The checkpoint is saved before the event is written. If the reader crashes between the two lines, the checkpoint already says that the event is done, so the next reader skips it and it is never written. Do the work first and then save the checkpoint, and a crash then repeats an event and loses none.',
        fix: FIX_CP,
        cheer: 'Work first, bookmark after.'
      }),

      B.bug({
        id: 'm9-bug2', t: 2, src: 'docs', q: 'A script sends 100,000 events and takes an hour. Click the line that makes it slow.',
        file: 'send_slow.py', lang: 'python', code: BUG_CLIENT, bad: [2],
        hint: 'How many connections does this open?',
        why: 'A new client for every event means a new connection and a new sign-in for every event, which is far slower than the sending itself. Open one client, fill batches with many events, and send each batch when `add` raises `ValueError`. The lab showed that a 1 MB batch holds thousands of small events.',
        fix: FIX_CLIENT,
        cheer: 'One client, many events in each batch.'
      }),

      B.challenge({
        id: 'm9-ch', t: 2, title: 'Coding round: how many batches for a million events?', file: 'batches.sql', lang: 'sql',
        q: 'The table `batch_sizes` holds what the lab recorded: how many events of each size fit in a batch. **For the batch limit of 1 MB (1,048,576 bytes), write a query that returns, for each event size, how many batches it takes to send a million events.**',
        data: [{ name: 'batch_sizes (limit 1 MB)', cols: ['limit_bytes', 'payload_bytes', 'events_in_batch'], rows: BATCH_ROWS.map(function (r) { return [String(r.limit_bytes), n0(r.payload_bytes), n0(r.events_in_batch)]; }) }],
        starter: '-- batches needed for a million events, for each event size\nSELECT ...\nFROM batch_sizes',
        hints: ['Filter on the limit first, so that only the 1 MB rows remain.', 'A million divided by the events in a batch, rounded up, is the number of batches.', 'Divide by 1000000.0 and not 1000000, so that the division is not a whole-number division.'],
        sol: BATCH_SQL,
        res: { msg: BATCH_ROWS.length + ' rows', cols: ['payload_bytes', 'events_in_batch', 'batches_for_a_million'], rows: BATCH_ROWS.map(function (r) { return [n0(r.payload_bytes), n0(r.events_in_batch), n0(Math.ceil(1000000 / r.events_in_batch))]; }) },
        expl: ['`CEILING` rounds up, because a partly filled batch is still a request.', 'The `1000000.0` makes the division use decimals. With an integer, the result would round down and the count would be one short.', 'The small events need about a hundred batches, and the events of 240,000 bytes need 250,000. The size of the event decides how many requests you pay for.', 'In the recording, one event of 300,000 bytes does not fit a 256 KB batch at all, so the same query with that limit gives no batches for that size.'],
        cx: 'A scan of a handful of rows. The point is the arithmetic: requests, and not events, are what the client sends and the service counts.'
      }),

      B.incident({
        id: 'm9-inc', t: 2, src: 'rec', title: 'Incident: one partition is three hours behind', time: '10:20',
        alert: '**The order stream shows a lag of three hours on partition 2 of the event hub, and almost none on the others.** Four readers run, one for each partition, and three are nearly idle. Someone chose the **order status** as the partition key, because it seemed natural to group orders by state.',
        clues: ['One reader has all the work', 'There are only four statuses, and most orders are COMPLETED', 'A partition is read by one reader at a time'],
        opts: [
          { t: 'Choose a key with many evenly used values, such as the customer id, create a new event hub with it, and move the producers and the readers over', fb: '' },
          { t: 'Add more readers to the consumer group', fb: 'A partition is read by one reader at a time, so extra readers cannot share the hot partition.' },
          { t: 'Raise the throughput units', fb: 'More units do not change which partition a key goes to. The hot partition stays hot.' },
          { t: 'Remove the key so that events spread', fb: 'It spreads the load and breaks the order that the readers rely on.' }
        ],
        best: 0,
        why: 'The recording shows it with a stand-in hash: with the status as the key, ' + pctOf(BY.status.busiest_share) + ' of the events fell in one partition and two partitions got none, while the customer id gave ' + pctOf(BY.customer_id.busiest_share) + ' in the busiest. On the Basic and Standard tiers the number of partitions cannot be changed, and the key to partition mapping would change anyway, so the fix is a new event hub with a good key and a planned move.',
        checks: [
          ['Compare the lag of each partition', 'One partition far behind and the others at zero points to the key.'],
          ['Count the key values', 'How many different values has the key, and does one dominate?'],
          ['Pick a better key', 'Many values, none dominant, and it keeps related events together.'],
          ['Move over', 'A new event hub, producers first, then readers, with the old hub drained.'],
          ['Alert on it', 'Alert on the lag of each partition, and on the spread of events.']
        ],
        tell: 'One partition fell three hours behind because the producers keyed order events by status, and most orders share one status, so in my measurement about ninety-six percent of the events went to one partition and two partitions got nothing. Adding readers could not help since one reader owns a partition. I moved to a new event hub keyed by customer id, which spread evenly and keeps one customer in order, drained the old hub, and added alerts on lag per partition and on the spread of events.',
        prevent: ['Choose a key with **many values** and no dominant one', 'Alert on **lag for each partition**', 'Plan the **partition count** at the start', 'Do not **key by a state**']
      }),

      B.incident({
        id: 'm9-inc2', t: 2, src: 'docs', title: 'Incident: duplicate orders after a restart', time: '07:35',
        alert: '**Finance reports 312 duplicate orders in the silver table after a deployment restarted the readers.** The handler inserts each event as a new row. The reader saves a checkpoint every 100 events, after the work.',
        clues: ['The duplicates appeared right after the restart', 'The readers restarted from their last checkpoints', 'The handler appends a row for every event it sees'],
        opts: [
          { t: 'Make the handler safe to repeat, with a merge by the event or order key, and keep the checkpoint after the work', fb: '' },
          { t: 'Save the checkpoint before the work so that nothing repeats', fb: 'A crash would then lose events, which is worse than a duplicate.' },
          { t: 'Checkpoint after every single event', fb: 'It shrinks the repeats and writes a blob for every event. Some events can still repeat, so the handler must be safe anyway.' },
          { t: 'Switch on exactly-once delivery in Event Hubs', fb: 'There is no such setting. Readers get events at least once.' }
        ],
        best: 0,
        why: 'A restart restarts each reader at its last checkpoint, so up to a hundred events for each partition are processed again. This is how at-least-once works. The lab computed it: a checkpoint every 100 events and a crash at event 2,547 repeats ' + REPLAYED + ' events. A merge by key turns a repeat into a no-op, and that is the cure, as in mission 5.',
        checks: [
          ['Count the duplicates', 'Group by the key and count: are they all events from just before the restart?'],
          ['Read the handler', 'Does it append, or does it merge by a key?'],
          ['Make it safe to repeat', 'Merge into silver by the order key, or write to a dated folder.'],
          ['Remove the duplicates', 'Keep the newest row for each key, as in mission 5.'],
          ['Test the restart', 'Kill a reader on purpose in a test, and compare the tables.']
        ],
        tell: 'The duplicates came from the restart, because each reader began again at its last checkpoint and the handler appended a new row for every event it saw, so events after the checkpoint were written twice. I changed the handler to merge by the order key, which makes a repeat harmless, removed the duplicates that were already there, and added a test that kills a reader in the middle of a batch and compares the tables. The checkpoint stays after the work, because the other order would lose events.',
        prevent: ['Make handlers **safe to repeat**', 'Save the checkpoint **after** the work', 'Test a **restart** on purpose', 'Compare **counts** with the source']
      }),

      B.qa({
        id: 'qa-eventhubs', t: 1, tag: 'Event Hubs', secs: 60,
        q: 'What is Event Hubs, and how is it different from a queue?',
        pts: ['A log of events split into ordered partitions, kept for a retention period', 'Many readers, each with its own position, read the same events', 'Readers track their position, and events are not removed when read', 'Built for very high volumes: telemetry, clicks, change events', 'A queue hands each message to one worker and removes it', 'Delivery is at least once'],
        short: 'Event Hubs is a log of events, split into partitions. Each partition keeps its events in order, and the events stay for a retention period whether they are read or not. Many readers, in different consumer groups, can read the same events, and each keeps its own position, so a Function, a stream job and Capture can all read one stream.\n\nA queue is different: it hands each message to one worker and removes it when the work is done, with acknowledgements and often a dead-letter queue. Event Hubs is built for volume, such as clicks, telemetry and change events, and for replay: a new reader can start at the beginning of the retained window.\n\nDelivery to readers is at least once, so a crash can repeat events, and the handlers must be safe to repeat.',
        fu: [
          ['Can you replay?', 'Yes, within the retention period, by starting a reader at an earlier position.'],
          ['What about ordering?', 'Only inside a partition. Use a partition key to keep related events together.']
        ],
        trap: 'Treating an event hub as a queue with per-message acknowledgements.',
        real: 'Describe a stream that you built or used, and why a log fitted it.'
      }),

      B.qa({
        id: 'qa-partitionkey', t: 1, tag: 'Event Hubs', secs: 90,
        q: 'How do you choose a partition key and the number of partitions?',
        pts: ['The key keeps related events together and in order: same key, same partition', 'Many values and none dominant, or one partition gets hot', 'No key when order does not matter: best spread', 'Partitions cap the number of parallel readers in a group', 'The count is fixed on Basic and Standard, so plan for growth', 'Changing the count moves keys to other partitions'],
        short: 'The key keeps related events together: the same key always goes to the same partition, so a reader sees them in order. I pick a key with many values and none that dominates, such as a customer or a device id. I measured four candidate keys on 600,000 order events over four partitions, with a stand-in hash: customer_id put about a quarter in each, while the order status put ninety-six percent in one partition and left two empty.\n\nIf order does not matter, I send without a key, which gives the best spread.\n\nFor the number of partitions, I think about the most readers that I will want in parallel in one group, because a partition is read by one reader at a time. On Basic and Standard the count is fixed when the hub is created, so I plan for growth, and changing it moves keys to other partitions and breaks order across the change.',
        fu: [
          ['What if one customer is huge?', 'Add a small suffix to its key so that it spreads, and accept order only within each suffix.'],
          ['Does the key cost anything?', 'A few bytes for each event, which matters for tiny events: my 100-byte events fitted thirty percent fewer in a batch.']
        ],
        trap: 'Keying by a state, such as the status, because it looks natural.',
        real: 'Describe how you chose a key, and how you checked the spread.'
      }),

      B.qa({
        id: 'qa-consumergroup', t: 1, tag: 'Event Hubs', secs: 60,
        q: 'What is a consumer group, and how do readers share work?',
        pts: ['A consumer group is a view of the whole stream with its own position', 'Different applications use different groups', 'Inside a group, a partition has one reader at a time', 'Readers balance by claiming partitions in the checkpoint store', 'Maximum parallelism in a group is the number of partitions', 'Alert on lag for each partition'],
        short: 'A consumer group is a view of the whole stream with its own position, so different applications can read the same events without disturbing each other. I use a named group for each application and keep `$Default` unused.\n\nInside a group, each partition is read by one reader at a time, so the number of partitions is the ceiling on parallel readers. The readers balance themselves: each claims partitions by writing an ownership blob with a conditional write, using the ETag, so two readers cannot take the same partition. I saw it in a recording: a claim with a stale ETag was refused and a claim with the current one was accepted.\n\nI alert on lag for each partition, because one partition that falls behind while the others are idle points to a bad key.',
        fu: [
          ['What if there are more readers than partitions?', 'The extra readers wait with nothing to do, and they take over when a reader fails.'],
          ['Where is the state kept?', 'In a blob container that the readers share: ownership blobs and checkpoint blobs.']
        ],
        trap: 'Scaling readers beyond the number of partitions and expecting more speed.',
        real: 'Describe how several services read one stream in a place you worked.'
      }),

      B.qa({
        id: 'qa-checkpoint', t: 2, tag: 'Event Hubs', secs: 90,
        q: 'How do checkpoints work, and what delivery guarantee do you get?',
        pts: ['A checkpoint is the offset and sequence number saved for a partition and group', 'The store keeps them as blobs in a storage account', 'After a crash a new reader restarts at the last checkpoint', 'Events after it repeat: at-least-once delivery', 'Work first, checkpoint after, or a crash loses events', 'Make handlers safe to repeat, and choose the interval by cost'],
        short: 'A checkpoint says how far a reader has processed in one partition for one consumer group. The Python client saves it with the offset and the sequence number in the metadata of a blob, in a container that the readers share. When a reader crashes, the next reader of that partition restarts at the last checkpoint.\n\nSo the guarantee is at least once: events after the last checkpoint are processed again. With a checkpoint every hundred events and a crash at event 2,547, the next reader repeats 47. The order of the two steps matters: I do the work first and save the checkpoint after, because the other order turns a crash into lost data.\n\nI make the handlers safe to repeat, with a merge by key, as in a batch load. I choose the interval by balancing the cost of a blob write against the cost of a repeat.',
        fu: [
          ['Can you get exactly once?', 'Not from the service. You get it by making the processing idempotent, so a repeat changes nothing.'],
          ['What does the store need?', 'A blob container that exists, and a role that can read and write blobs for the reader identity.']
        ],
        trap: 'Saving the checkpoint before the work finishes.',
        real: 'Describe a duplicate or a loss that came from a checkpoint, and how you fixed it.'
      }),

      B.qa({
        id: 'qa-capture', t: 1, tag: 'Event Hubs', secs: 60,
        q: 'How do you get Event Hubs data into the lake?',
        pts: ['Capture writes Avro files to Blob or ADLS Gen2 with no code', 'Time window 1 to 15 minutes, size window 10 to 500 MB, whichever first', 'The path comes from a name template with partition and time', 'Each record holds the body as bytes plus offset, sequence number and time', 'Read the files with Spark and parse the body into bronze', 'Use a reader for logic that must react in seconds'],
        short: 'The simplest way is Capture. It writes the events of an event hub to Blob Storage or ADLS Gen2 as Avro files, with no code and no reader to run. A file is written when a time window or a size window is reached, whichever comes first: the time window is one to fifteen minutes, five by default, and the size window is ten to five hundred megabytes, three hundred by default.\n\nA name template builds the folder from the namespace, the event hub, the partition and the time, so the lake has folders that a query can skip. Each Avro record holds the body as bytes, with the offset, the sequence number and the enqueued time, and a Spark job reads the files and parses the body into bronze.\n\nCapture copies the stream and does not transform it. For logic that must react within seconds I use a reader, such as a Function or a stream job.',
        fu: [
          ['Why Avro?', 'It carries its schema, and it is compact and splittable, so the files are easy to read in Spark.'],
          ['What about small files?', 'A short time window and a quiet stream make many small files. Widen the window or compact them later.']
        ],
        trap: 'Treating Capture as a way to react quickly. Its files appear after a window.',
        real: 'Describe how a stream reached the lake in a place you worked.'
      }),

      B.qa({
        id: 'qa-throughput', t: 2, tag: 'Event Hubs', secs: 75,
        q: 'How do you size an event hub, and how does it scale?',
        pts: ['Basic and Standard: throughput units, 1 MB or 1,000 events a second in, per unit', 'Out: 2 MB or 4,096 events a second per unit', 'Up to 20 units on self-serve, more by request; auto-inflate can add units', 'Premium: processing units. Dedicated: capacity units', 'Partitions set the parallelism of readers and are planned early', 'Batch events to cut the number of requests'],
        short: 'On Basic and Standard I size in throughput units. One unit allows one megabyte or a thousand events a second in, and two megabytes or 4,096 events a second out. Self-serve goes to twenty units, and more by request, and auto-inflate can add units for me when traffic rises. Premium is sized in processing units, and Dedicated in capacity units for the largest streams.\n\nFor Brewline, 2,000 events a second of 800 bytes is 1.6 megabytes a second, so I need two units for the ingress, with room for peaks. I also size the partitions: the most readers I want in a group, with growth in mind, because the count is fixed on the lower tiers.\n\nOn the sending side I batch events, because the client sends requests, and a batch of a megabyte holds thousands of small events, which cuts the requests by orders of magnitude.',
        fu: [
          ['What do you alert on?', 'Throttled requests, lag for each partition, and incoming against the limit of the units.'],
          ['When do you move up a tier?', 'For isolation, longer retention, more partitions, or a volume that the units cannot reach.']
        ],
        trap: 'Sizing by average load and ignoring the peak.',
        real: 'Describe how you sized a stream, and what you watched after the launch.'
      }),

      B.recap({
        id: 'm9-recap', n: 9, badge: 'Stream Keeper', color: '#C7D2FE',
        pts: [
          'An **event hub** is a log in **partitions**, kept for a retention period. Many **consumer groups** read the same events at their own pace.',
          'A **partition key** keeps related events together and in order. A key with few values or one dominant value makes a **hot partition**: status put **96 percent** in one.',
          'Inside a group, a partition has **one reader**, so partitions cap the parallelism. Readers claim partitions with an **ETag** in a blob store.',
          'A **checkpoint** is a bookmark saved **after the work**. A crash repeats a few events: **at least once**, so handlers must be safe to repeat.',
          '**Capture** lands the stream in the lake as Avro. Size with **throughput units**, and **batch** events to cut requests.'
        ],
        lines: [
          'I key by what belongs together, and I check the spread.',
          'I save the checkpoint after the work, never before.',
          'I make every handler safe to repeat.'
        ]
      })
    ]
  });
})();
