/* Mission 7: streaming and change data. The shard ranges, the key-to-shard mapping, the skew of 20,000 events over 500 customers (with and without a salt)
   and the shard split were recorded with boto3 against moto, an AWS emulator, and checked against the documented MD5 rule. Capacity limits, Firehose
   buffering, Lambda event source settings, DMS file layout and prices come from documentation and the AWS SDK service models.
   Nothing here ran on AWS. */
(function () {
  var B = LAB.b, G = LAB.get;
  var SH = G.counts('kinesis.shards'), MAP = G.counts('kinesis.mapping'), SK = G.counts('kinesis.skew'), SP = G.counts('kinesis.split'), KE = G.counts('kinesis.errors');
  function num(n, d) { return n.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  var BY = Object.keys(SK.by_key).map(function (k) { return SK.by_key[k]; });
  var BUSIEST = Math.max.apply(null, BY), QUIETEST = Math.min.apply(null, BY);
  var SALTED = Object.keys(SK.salted_8).map(function (k) { return SK.salted_8[k]; });
  G.expect(SH.shards.length === 4 && SH.shards.every(function (s) { return s.share_of_the_ring === 0.25; }), 'four shards with a quarter of the hash range each');
  G.expect(MAP.rows.slice(0, 5).every(function (r) { return /2$/.test(r.shard); }) && MAP.rows.length === 12, 'C-0001 to C-0005 all land on shard 2');
  G.expect(SK.events === 20000 && SK.customers === 500 && SK.by_key_ratio === 1.88 && SK.salted_ratio === 1.09 && SK.mean_per_shard === 5000, 'the skew numbers');
  G.expect(BUSIEST === 9390 && QUIETEST === 2743 && SK.busiest_customer === 'C-0001' && SK.busiest_customer_events === 2967, 'the busiest shard and customer');
  G.expect(SP.split === 'shardId-000000000002' && SP.after.length === 6 && SP.after.filter(function (s) { return s.state === 'closed'; }).length === 1 && SP.after.filter(function (s) { return s.parent; }).length === 2, 'a split closes the parent and opens two children');
  G.expect(KE.unknown_stream.code === 'ResourceNotFoundException', 'a missing stream gives ResourceNotFoundException');
  var SHARE_TOP = SK.busiest_customer_events / SK.events * 100, SHARE_BUSY = BUSIEST / SK.events * 100;

  var PUT = [
    'import json',
    'import random',
    'import time',
    'import boto3',
    '',
    'kinesis = boto3.client("kinesis", region_name="us-east-1")',
    '',
    '',
    'def send(events, stream="orders"):',
    '    records = [',
    '        {"Data": json.dumps(e).encode(), "PartitionKey": e["order_id"]}',
    '        for e in events',
    '    ]',
    '    for attempt in range(5):',
    '        out = kinesis.put_records(StreamName=stream, Records=records)',
    '        if out["FailedRecordCount"] == 0:',
    '            return',
    '        records = [r for r, res in zip(records, out["Records"]) if "ErrorCode" in res]',
    '        time.sleep(min(2 ** attempt, 10) * random.random())',
    '    raise RuntimeError("%d records were not sent" % len(records))'
  ].join('\n');

  var KEY_BUG = [
    'for e in events:',
    '    kinesis.put_record(',
    '        StreamName="orders",',
    '        Data=json.dumps(e).encode(),',
    '        PartitionKey="orders",',
    '    )'
  ].join('\n');
  var KEY_FIX = KEY_BUG.replace('PartitionKey="orders"', 'PartitionKey=e["order_id"]');

  var FAIL_BUG = [
    'records = [{"Data": json.dumps(e).encode(), "PartitionKey": e["order_id"]} for e in events]',
    'out = kinesis.put_records(StreamName="orders", Records=records)',
    'print("sent", len(records), "records")'
  ].join('\n');
  var FAIL_FIX = [
    'records = [{"Data": json.dumps(e).encode(), "PartitionKey": e["order_id"]} for e in events]',
    'out = kinesis.put_records(StreamName="orders", Records=records)',
    'print("sent", len(records) - out["FailedRecordCount"], "records,", out["FailedRecordCount"], "failed")'
  ].join('\n');

  var ESM = [
    'import boto3',
    '',
    'lam = boto3.client("lambda", region_name="us-east-1")',
    '',
    'lam.create_event_source_mapping(',
    '    EventSourceArn="arn:aws:kinesis:us-east-1:123456789012:stream/orders",',
    '    FunctionName="orders-to-lake",',
    '    StartingPosition="LATEST",',
    '    BatchSize=500,',
    '    MaximumBatchingWindowInSeconds=5,',
    '    ParallelizationFactor=2,',
    '    BisectBatchOnFunctionError=True,',
    '    MaximumRetryAttempts=3,',
    '    MaximumRecordAgeInSeconds=3600,',
    '    FunctionResponseTypes=["ReportBatchItemFailures"],',
    '    DestinationConfig={',
    '        "OnFailure": {"Destination": "arn:aws:sqs:us-east-1:123456789012:orders-failed"}',
    '    },',
    ')'
  ].join('\n');

  var HANDLER = [
    'import base64',
    'import json',
    '',
    '',
    'def handler(event, context):',
    '    failures = []',
    '    for rec in event["Records"]:',
    '        try:',
    '            order = json.loads(base64.b64decode(rec["kinesis"]["data"]))',
    '            write_order(order)',
    '        except Exception:',
    '            failures.append({"itemIdentifier": rec["kinesis"]["sequenceNumber"]})',
    '    return {"batchItemFailures": failures}'
  ].join('\n');

  var FIREHOSE = [
    'import boto3',
    '',
    'fh = boto3.client("firehose", region_name="us-east-1")',
    '',
    'fh.create_delivery_stream(',
    '    DeliveryStreamName="clicks-to-lake",',
    '    DeliveryStreamType="DirectPut",',
    '    ExtendedS3DestinationConfiguration={',
    '        "RoleARN": "arn:aws:iam::123456789012:role/brewline-firehose",',
    '        "BucketARN": "arn:aws:s3:::brewline-lake",',
    '        "Prefix": "raw/clicks/dt=!{timestamp:yyyy-MM-dd}/",',
    '        "ErrorOutputPrefix": "raw/clicks_errors/!{firehose:error-output-type}/dt=!{timestamp:yyyy-MM-dd}/",',
    '        "BufferingHints": {"SizeInMBs": 64, "IntervalInSeconds": 120},',
    '        "CompressionFormat": "GZIP",',
    '    },',
    ')'
  ].join('\n');

  var DMS = [
    'import json',
    'import boto3',
    '',
    'dms = boto3.client("dms", region_name="us-east-1")',
    '',
    'target = dms.create_endpoint(',
    '    EndpointIdentifier="lake-raw-s3",',
    '    EndpointType="target",',
    '    EngineName="s3",',
    '    S3Settings={',
    '        "ServiceAccessRoleArn": "arn:aws:iam::123456789012:role/brewline-dms-s3",',
    '        "BucketName": "brewline-lake",',
    '        "BucketFolder": "raw/shop",',
    '        "DataFormat": "parquet",',
    '        "TimestampColumnName": "cdc_ts",',
    '        "IncludeOpForFullLoad": True,',
    '        "CdcMaxBatchInterval": 60,',
    '    },',
    ')',
    '',
    'rules = {"rules": [{',
    '    "rule-type": "selection", "rule-id": "1", "rule-name": "orders",',
    '    "object-locator": {"schema-name": "public", "table-name": "orders"},',
    '    "rule-action": "include",',
    '}]}',
    '',
    'dms.create_replication_task(',
    '    ReplicationTaskIdentifier="shop-to-lake",',
    '    SourceEndpointArn="arn:aws:dms:us-east-1:123456789012:endpoint:SOURCE",',
    '    TargetEndpointArn=target["Endpoint"]["EndpointArn"],',
    '    ReplicationInstanceArn="arn:aws:dms:us-east-1:123456789012:rep:INSTANCE",',
    '    MigrationType="full-load-and-cdc",',
    '    TableMappings=json.dumps(rules),',
    ')'
  ].join('\n');

  var T_CHANGES = {
    name: 'orders_changes',
    cols: ['op', 'cdc_ts', 'order_id', 'customer_id', 'status', 'total_usd'],
    rows: [
      ['I', '2026-03-14 08:00:01', 'O-1', 'C-1', 'PLACED', '12.50'],
      ['U', '2026-03-14 09:30:12', 'O-1', 'C-1', 'COMPLETED', '12.50'],
      ['I', '2026-03-14 08:05:44', 'O-2', 'C-2', 'PLACED', '8.00'],
      ['D', '2026-03-14 10:00:03', 'O-2', 'C-2', 'PLACED', '8.00'],
      ['I', '2026-03-14 08:10:20', 'O-3', 'C-1', 'PLACED', '20.00'],
      ['U', '2026-03-14 09:00:00', 'O-3', 'C-1', 'PLACED', '21.00'],
      ['U', '2026-03-14 11:15:30', 'O-3', 'C-1', 'CANCELLED', '21.00']
    ]
  };

  LAB.addChapter({
    id: 'm7', n: 7, title: 'Streaming and change data: Kinesis, Firehose, MSK, DMS', short: 'Streaming', blurb: 'Shards and partition keys, consumers and poison records, Firehose buffering, MSK, and change data capture with DMS', minutes: 50,
    focus: ['src', 'stg', 'snap'],
    goals: [
      'Explain how a **partition key** picks a **shard**, and why a popular key makes a hot shard.',
      'Size a stream, and choose between **Data Streams, Firehose and MSK**.',
      'Configure a **Lambda consumer** that survives a bad record.',
      'Set **Firehose buffering** and read what it does to file size and delay.',
      'Capture database changes with **DMS** and apply them to a table.'
    ],
    say: 'Mission 7 is data that does not wait for the nightly job. A stream carries events from producers to consumers within seconds. The recording is the real hashing of partition keys onto four shards, and the skew that a popular customer causes. Capacity limits, Firehose buffering and DMS settings come from the documentation and the AWS SDK models, and no stream ran on AWS.',
    scenes: [
      B.talk({
        id: 'm7-talk', t: 1, src: 'docs', title: 'Batch, micro-batch or stream',
        say: 'How fast must the data arrive? The answer decides the service. Press Next for the options.',
        items: [
          ['Batch', 'Files land in S3 and a job processes them every hour or every night. It is the cheapest and simplest design, and most reports do not need anything faster.', 'Hours.'],
          ['Micro-batch', 'Firehose buffers events for 1 to 15 minutes and writes one file to S3. Athena and Glue then read the files as usual. You get data in the lake within minutes, with no consumer code.', 'Minutes.'],
          ['Stream', 'Kinesis Data Streams or MSK hold events for days. Consumers read them within a second or two: Lambda for a small reaction, Managed Service for Apache Flink for windows and joins, Firehose for delivery to S3.', 'Seconds.'],
          ['Change data capture', 'DMS reads the transaction log of a database and sends every insert, update and delete to S3, Kinesis or Kafka. The lake follows the source without queries on the production tables.', 'Changes, not snapshots.'],
          ['The price of speed', 'A stream costs money while it is open, and consumers must handle duplicates, retries and bad records. Choose the slowest option that meets the need.', 'Faster is not free.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm7-flow', t: 1, src: 'docs', title: 'A Kinesis stream', g: 'stream', legend: true,
        steps: [
          { say: 'A stream has producers, shards and consumers. Press Next to follow one record.', cap: 'Producers, shards, consumers.' },
          { say: 'Step 1. Producers write records. Every record has a data blob and a partition key. Here, a website, a mobile app and DMS write to the stream `orders`.', on: ['k1', 'k1b', 'k1c'], focus: ['p1', 'p2', 'p3'], cap: 'Producers send records.' },
          { say: 'The stream takes the MD5 hash of the partition key and sends the record to the shard whose hash range holds it. The producer does not choose the shard. The key does.', focus: ['key', 'sh0', 'sh1', 'sh2', 'sh3'], cap: 'The key picks the shard.' },
          { say: 'Step 2. Records in a shard keep their order. Records with the same key always go to the same shard, so they stay in order.', focus: ['sh0', 'sh1', 'sh2', 'sh3'], cap: 'Order is kept in a shard.' },
          { say: 'Step 3. Every consumer reads every shard, so the arrows start at the edge of the stream. Lambda reacts to small batches, Firehose delivers to S3, and Managed Flink computes windows and joins.', on: ['k2', 'k2b', 'k2c'], focus: ['lam', 'fh', 'fl'], cap: 'Consumers read all shards.' }
        ]
      }),

      B.cmp({
        id: 'm7-kds', t: 1, src: 'docs', title: 'Kinesis Data Streams in six facts',
        say: 'Six facts decide most Kinesis designs. Press Next to read them. Limits and prices are the documented examples, and AWS changes them.',
        cols: ['Question', 'Answer'],
        hl: 1,
        rows: [
          ['How much can a shard take?', 'In provisioned mode, the PutRecords documentation says 1,000 records a second and 1 MB a second for each shard. A request that goes over fails for those records with `ProvisionedThroughputExceededException`.'],
          ['How much can a shard give?', 'Shared readers get 2 MB a second for each shard between them. A consumer that uses enhanced fan-out is registered and gets its own 2 MB a second for each shard.'],
          ['How long are records kept?', '24 hours by default, and up to 365 days (8,760 hours) when you raise the retention. A consumer can read the stream again from any point in that window.'],
          ['What is in order?', 'Records of one shard, by sequence number. Records with the same partition key go to the same shard, so they are in order. There is no order between shards.'],
          ['Provisioned or on-demand?', 'Provisioned: you choose the number of shards and pay about $0.015 for each shard-hour. On-demand: the stream scales for you and bills about $0.04 per stream-hour plus about $0.08 per GB written and $0.04 per GB read.'],
          ['How do you change the size?', '`SplitShard` divides a busy shard, `MergeShards` joins two quiet ones, and `UpdateShardCount` resizes the stream. Old shards stay readable until retention ends.']
        ],
        steps: [
          { upto: 2, say: 'What a shard can take in and give out.' },
          { upto: 4, say: 'Retention and order. These make a stream a replayable log, and not a queue.' },
          { upto: 6, say: 'Capacity modes and resizing.' }
        ],
        pick: 'Start on-demand when the load is unknown. Move to provisioned when it is steady, because shard-hours are then cheaper. Either way, the **partition key** decides whether the shards share the load.'
      }),

      B.widget({ id: 'm7-lab', kind: 'kinesis', t: 1, src: 'rec', title: 'Lab: the key picks the shard' }),

      B.talk({
        id: 'm7-lessons', t: 1, src: 'rec', title: 'What the lab showed',
        say: 'Four lessons from the recorded numbers. Press Next to read them.',
        items: [
          ['The key is hashed, and the hash picks the shard', 'The stream has ' + SH.shards.length + ' shards and each owns a quarter of the range 0 to 2^128 - 1. The emulator and the documented MD5 rule gave the same shard for every one of the ' + MAP.rows.length + ' keys. C-0001 to C-0005 all landed on shard 2. That is what the hash gives for those ids, and nobody chose it.', 'A key lands where the hash says.'],
          ['One busy key makes a hot shard', 'In ' + num(SK.events) + ' events from ' + SK.customers + ' customers, ' + SK.busiest_customer + ' sent ' + num(SK.busiest_customer_events) + ' (' + num(SHARE_TOP, 1) + ' %). The busiest shard took ' + num(BUSIEST) + ' events (' + num(SHARE_BUSY, 0) + ' %) and the quietest ' + num(QUIETEST) + '. That is ' + num(SK.by_key_ratio, 2) + ' times the average of ' + num(SK.mean_per_shard) + '.', 'A popular key overloads one shard.'],
          ['A salt spreads one key over many', 'Adding a number from 0 to 7 to the customer id spread the same events over the shards: the busiest shard fell to ' + num(SK.salted_ratio, 2) + ' times the average. The price: the events of one customer are now in 8 keys, so their order is no longer guaranteed across them.', 'You trade order for balance.'],
          ['A split makes room, and keeps the past', 'Splitting shard 2 closed it and opened two children, each with half of its range. The parent stays readable until retention ends, so a consumer reads the parent first to keep the order.', 'Split a hot shard, read the parent first.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm7-put', t: 1, src: 'docs', title: 'A producer that handles partial failure', file: 'send.py', lang: 'python', code: PUT,
        steps: [
          { say: 'Each record needs a data blob and a partition key. Here the key is the order id, which is different for every order, so the load spreads evenly over the shards.', lines: G.span(PUT, /records = \[/, /^    \]$/) },
          { say: '`put_records` sends up to 500 records in one call. It returns success even when some records fail, so a loop must look at the result.', lines: G.span(PUT, /out = kinesis\.put_records/) },
          { say: '`FailedRecordCount` says how many records were not accepted, for example because a shard was over its limit. When it is zero, everything is in.', lines: G.span(PUT, /if out\["FailedRecordCount"\]/, /return/) },
          { say: 'Keep only the records that have an `ErrorCode` and send those again. Wait a random time that grows with every attempt, so many producers do not retry at the same moment.', lines: G.span(PUT, /records = \[r for r/, /time\.sleep/) },
          { say: 'After 5 attempts, fail loudly. A job that drops records silently is worse than a job that stops.', lines: G.span(PUT, /raise RuntimeError/) }
        ],
        note: 'The code follows the Kinesis API. I checked its parameter names against the AWS SDK service model, and the verifier runs it against the emulator. It was not run on AWS. Split a list of more than 500 events into chunks before you call it.'
      }),

      B.bug({
        id: 'm7-bug1', t: 1, src: 'docs', q: 'This producer sends 5,000 events a second to a stream with 4 shards. Writes are throttled while 3 shards sit idle. Click the line that causes it.',
        file: 'send_one_key.py', lang: 'python', code: KEY_BUG, bad: [5],
        hint: 'What decides the shard of a record?',
        why: 'Kinesis hashes the partition key, and every record with the same key goes to the same shard. A constant key such as "orders" puts all records on one shard, which takes about 1,000 records or 1 MB a second. Use a key with many values, such as the order id.',
        fix: KEY_FIX,
        cheer: 'The partition key spreads the load.'
      }),

      B.bug({
        id: 'm7-bug2', t: 2, src: 'docs', q: 'This script prints "sent 500 records", and some of the orders never reach the stream. Click the line that hides the loss.',
        file: 'send_batch.py', lang: 'python', code: FAIL_BUG, bad: [3],
        hint: 'What does put_records return when a shard is over its limit?',
        why: '`put_records` answers with success for the call, and lists failed records one by one in the response. The script never reads `FailedRecordCount`, so it counts all 500 as sent. Read the count, and send the failed records again, as the producer in the earlier screen does.',
        fix: FAIL_FIX,
        cheer: 'Always read FailedRecordCount.'
      }),

      B.cmp({
        id: 'm7-consumers', t: 1, src: 'docs', title: 'Who reads a stream',
        say: 'Five ways to read a Kinesis stream. Press Next to compare them.',
        cols: ['Consumer', 'Good for', 'Watch for'],
        hl: 1,
        rows: [
          ['Lambda event source mapping', 'Small reactions to each batch of records: write to a table, call an API, update a count.', 'A failing record can block a shard. Set retries, bisecting and a failure destination.'],
          ['Firehose', 'Delivering the stream to S3, Redshift or OpenSearch, in batches, with no code.', 'Delivery is delayed by the buffer. Data is at least once.'],
          ['Managed Service for Apache Flink', 'Windows, joins and aggregations over the stream, with state.', 'More to design and operate than Lambda. Checkpoints and parallelism need thought.'],
          ['A KCL application', 'Custom consumers that you run on ECS or EC2, with checkpoints in DynamoDB.', 'You run the fleet. Scaling workers with the number of shards is your job.'],
          ['Enhanced fan-out', 'Several consumers that must not slow each other down. Each gets its own 2 MB a second per shard.', 'Extra cost for each consumer and shard.']
        ],
        steps: [
          { upto: 3, say: 'Managed consumers: Lambda, Firehose and Flink.' },
          { upto: 5, say: 'Your own code, and the option that keeps consumers from competing.' }
        ],
        pick: 'Use **Firehose** to land the stream in S3, **Lambda** for small reactions, and **Flink** when you need windows or joins. Write your own KCL consumer only when none of them fits.'
      }),

      B.code({
        id: 'm7-esm', t: 2, src: 'docs', title: 'A Lambda consumer that survives a bad record', file: 'mapping.py', lang: 'python', code: ESM,
        steps: [
          { say: 'An event source mapping makes Lambda poll the stream for you. You choose where to start and how to batch.', lines: G.span(ESM, /lam\.create_event_source_mapping/, /StartingPosition/) },
          { say: '`BatchSize` and `MaximumBatchingWindowInSeconds` decide how many records one invocation gets. Larger batches mean fewer invocations and a higher delay. `ParallelizationFactor` runs up to 10 batches of one shard at the same time, and still keeps the order for each partition key.', lines: G.span(ESM, /BatchSize=500/, /ParallelizationFactor/) },
          { say: 'The settings that matter for failures. When the function raises an error, Lambda splits the batch in two and retries each half, so one bad record is found. After 3 retries, or when a record is older than an hour, Lambda gives up on it.', lines: G.span(ESM, /BisectBatchOnFunctionError/, /MaximumRecordAgeInSeconds/) },
          { say: '`ReportBatchItemFailures` lets the function say which records failed, so only those are retried.', lines: G.span(ESM, /FunctionResponseTypes/) },
          { say: 'The `OnFailure` destination receives the details of the records that Lambda gave up on, in a queue here. Nothing is lost, and the shard keeps moving.', lines: G.span(ESM, /DestinationConfig/, /^    \},$/) }
        ],
        note: 'The defaults are the danger. For Kinesis, `MaximumRetryAttempts` and `MaximumRecordAgeInSeconds` default to infinite, so one bad record is retried until it leaves the stream. The parameter names and defaults come from the AWS SDK service model. The call did not run on AWS.'
      }),

      B.code({
        id: 'm7-handler', t: 2, src: 'docs', title: 'The handler reports what failed', file: 'handler.py', lang: 'python', code: HANDLER,
        steps: [
          { say: 'Lambda passes a batch of Kinesis records. Each record is base64 text in `rec["kinesis"]["data"]`.', lines: G.span(HANDLER, /for rec in event/, /order = json\.loads/) },
          { say: 'Process the record, and catch the error for this one record only. One bad record must not fail the whole batch.', lines: G.span(HANDLER, /write_order/, /except Exception/) },
          { say: 'Report the sequence number of every failed record in `batchItemFailures`. Lambda then retries from the first failed record and leaves the records before it alone.', lines: G.span(HANDLER, /failures\.append/) },
          { say: 'An empty list tells Lambda that the batch succeeded.', lines: G.span(HANDLER, /return \{/) }
        ],
        note: 'The response format follows the Lambda documentation for Kinesis. The verifier runs this handler with a sample event and a stub for `write_order`.'
      }),

      B.talk({
        id: 'm7-poison', t: 2, src: 'docs', title: 'The poison record',
        say: 'One record that always fails can stop a whole shard. Press Next to see how, and how to prevent it.',
        items: [
          ['Why a shard stops', 'Lambda reads each shard in order. When a batch fails, it tries the same batch again before it moves on. With the defaults, which retry without limit, one record that always fails keeps the shard stuck until the record leaves the stream after retention.', 'One bad record blocks all records behind it.'],
          ['How you see it', 'The metric `GetRecords.IteratorAgeMilliseconds` rises. It shows how old the oldest unread record is. Errors of the function rise too, and the other shards keep working.', 'Iterator age is the alarm.'],
          ['The settings that fix it', 'Bisect the batch to find the record, limit the retries and the record age, report failures item by item, and send what Lambda gives up on to a queue. Then look at the queue and decide what to do with each record.', 'Isolate, limit, park.'],
          ['What to do with parked records', 'Fix the cause, then send the records to the stream again or process them by hand. A dead-letter queue that nobody reads is a silent loss, so alarm on its depth.', 'A parking place needs an owner.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm7-firehose', t: 1, src: 'docs', title: 'Firehose: delivery without code',
        say: 'Firehose takes records and delivers them in batches to a destination. Press Next for what to set.',
        items: [
          ['Sources and destinations', 'Records come from producers that call it directly, or from a Kinesis stream. It delivers to S3, Redshift (through S3), OpenSearch, Splunk and HTTP endpoints. For S3 it needs a role that may write to the bucket.', 'Records in, files out.'],
          ['The buffer: size or time, whichever comes first', 'Firehose collects records and writes a file when the buffer reaches a size or an age. The size can be 1 to 128 MiB with a default of 5, and the interval can be 0 to 900 seconds with a default of 300. The documentation advises a size above what you ingest in 10 seconds.', 'Small buffers mean many small files.'],
          ['Prefixes and partitions', 'The S3 prefix can hold the date of arrival, for example `dt=2026-03-14/`. Dynamic partitioning can also build the prefix from fields in the records. Failed records go to an error prefix.', 'The folder names come from the time or the data.'],
          ['Format conversion and compression', 'Firehose can convert JSON to Parquet or ORC with a schema from the Glue Data Catalog, and compress with GZIP or Snappy. Converting here saves a job later.', 'Parquet at the door.'],
          ['What it does not do', 'It delivers at least once, so duplicates are possible. It adds delay, from seconds to minutes. It does not let several consumers read the same data, which is what a stream is for.', 'Delivery only.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm7-fhcode', t: 2, src: 'docs', title: 'A delivery stream into the raw zone', file: 'firehose.py', lang: 'python', code: FIREHOSE,
        steps: [
          { say: 'A DirectPut stream receives records from producers that call Firehose. A stream that reads from Kinesis uses `KinesisStreamAsSource` instead.', lines: G.span(FIREHOSE, /DeliveryStreamName/, /DeliveryStreamType/) },
          { say: 'The role and the bucket. The role needs `s3:PutObject` and the other write actions on the bucket (mission 3).', lines: G.span(FIREHOSE, /RoleARN/, /BucketARN/) },
          { say: 'The prefix builds a folder for each day from the arrival time. A prefix with expressions needs an error prefix as well, where records that could not be delivered go.', lines: G.span(FIREHOSE, /Prefix/, /ErrorOutputPrefix/) },
          { say: 'A file is written when 64 MiB are buffered or after 120 seconds, whichever comes first, and it is compressed with GZIP.', lines: G.span(FIREHOSE, /BufferingHints/, /CompressionFormat/) }
        ],
        note: 'I checked the parameter names and the allowed values against the AWS SDK service model. The call did not run on AWS.'
      }),

      B.quiz({
        id: 'm7-q1', t: 1, src: 'rec',
        q: 'In the recorded stream of 20,000 events, customer C-0001 sent ' + num(SK.busiest_customer_events) + ' events. Using the customer id as the partition key, how loaded was the busiest of the 4 shards?',
        opts: [
          { t: 'About the same as the others, because the hash spreads keys', fb: 'The hash spreads keys, not events. One key with many events lands on one shard.' },
          { t: 'About ' + num(SK.by_key_ratio, 2) + ' times the average', fb: '' },
          { t: 'About 4 times the average', fb: 'That would mean all events on one shard. Here the busiest shard took ' + num(SHARE_BUSY, 0) + ' % of them.' },
          { t: 'Idle, because C-0001 is a guest', fb: 'C-0001 is the customer with the most events in this data.' }
        ],
        ok: 1, why: 'The busiest shard received ' + num(BUSIEST) + ' of ' + num(SK.events) + ' events, against an average of ' + num(SK.mean_per_shard) + ': ' + num(SK.by_key_ratio, 2) + ' times. With a salt of 8 values the busiest shard was ' + num(SK.salted_ratio, 2) + ' times the average.'
      }),

      B.quiz({
        id: 'm7-q2', t: 1, src: 'docs',
        q: 'A stream must take 3,200 records a second of 1.5 KB each. With the documented limit of 1,000 records and 1 MB a second for each shard, how many shards does it need at least?',
        opts: [
          { t: '3', fb: 'That only fits 3,000 records a second.' },
          { t: '4', fb: 'The record rate fits in 4 shards, but the data is 3,200 x 1.5 KB = 4.8 MB a second.' },
          { t: '5', fb: '' },
          { t: '6', fb: 'More than the minimum. It leaves headroom, but it is not the least you need.' }
        ],
        ok: 2, why: 'There are two limits. By records: 3,200 / 1,000 = 3.2, so 4 shards. By data: 3,200 x 1.5 KB = 4.8 MB a second, so 5 shards. The larger number wins. In practice add headroom for bursts and for hot keys.'
      }),

      B.quiz({
        id: 'm7-q3', t: 2, src: 'docs',
        q: 'A Lambda function reads one shard. One record always raises an error. The function keeps retrying the same batch, and the iterator age rises. Which setting stops the block?',
        opts: [
          { t: 'A larger BatchSize', fb: 'A bigger batch contains the bad record as well, and more good records are held back.' },
          { t: 'BisectBatchOnFunctionError with MaximumRetryAttempts and an OnFailure destination', fb: '' },
          { t: 'A higher ParallelizationFactor', fb: 'It adds parallel batches for the shard, but the batch with the bad record is still retried first.' },
          { t: 'On-demand capacity mode', fb: 'The capacity mode changes how shards are added. It does not change how failures are retried.' }
        ],
        ok: 1, why: 'The defaults retry without limit. Bisecting finds the bad record, a retry limit lets Lambda give up on it, and the OnFailure destination keeps its details for you. ReportBatchItemFailures makes the retries even more precise.'
      }),

      B.quiz({
        id: 'm7-q4', t: 2, src: 'docs',
        q: 'Data arrives at 2 MB a second. A Firehose stream has a buffer of 128 MB and 300 seconds. About how often is a file delivered?',
        opts: [
          { t: 'Every 300 seconds', fb: '300 seconds would hold 600 MB, which is over the buffer size.' },
          { t: 'Every 64 seconds', fb: '' },
          { t: 'Every 128 seconds', fb: 'That is 128 MB at 1 MB a second. The rate here is 2 MB a second.' },
          { t: 'Once the stream has 2 MB', fb: 'The size limit is 128 MB, not the data rate.' }
        ],
        ok: 1, why: 'The size limit is reached first: 128 MB / 2 MB a second = 64 seconds. Firehose writes a file when either limit is reached, so files of about 128 MB land every 64 seconds. If the rate fell to 0.1 MB a second, the 300 second limit would win, and the files would be 30 MB.'
      }),

      B.quiz({
        id: 'm7-q5', t: 2, src: 'docs',
        q: 'Events of one customer must be processed in order. Which partition key keeps that, and still spreads load across many customers?',
        opts: [
          { t: 'The order id', fb: 'It spreads well, and two orders of one customer then go to different shards with no order between them.' },
          { t: 'The customer id', fb: '' },
          { t: 'The event time', fb: 'Times are all different, so events of one customer spread over all shards.' },
          { t: 'A random number', fb: 'It balances the load and gives up all order.' }
        ],
        ok: 1, why: 'All records with the same key go to the same shard, and a shard keeps order. So the customer id keeps the order of one customer. The cost is the risk of a hot key, which a salt or a split can ease, and which you check against the real traffic.'
      }),

      B.cmp({
        id: 'm7-pick', t: 1, src: 'docs', title: 'Which AWS service for which stream',
        say: 'The same events can go through several services. Press Next to match the need to the service.',
        cols: ['You need', 'Use', 'Because'],
        hl: 1,
        rows: [
          ['Events in S3 within minutes, no consumer code', 'Firehose, direct put', 'It buffers and writes files. Nothing to run.'],
          ['Several consumers, replay of the last days, order by key', 'Kinesis Data Streams', 'A shared, ordered log with retention.'],
          ['The Kafka API, Kafka tools, or very large throughput', 'MSK', 'Brokers, partitions and consumer groups that your tools already know.'],
          ['One consumer per message, retries, no replay', 'SQS (mission 8)', 'A queue, not a log.'],
          ['Changes of a database in the lake', 'DMS', 'It reads the transaction log and writes change files.']
        ],
        steps: [
          { upto: 2, say: 'Delivery, and a shared log.' },
          { upto: 5, say: 'Kafka, queues and database changes.' }
        ],
        pick: 'Start with **Firehose** when you only need files in S3. Add **Data Streams** when more than one consumer or a replay is needed. Choose **MSK** for a reason: a Kafka skill, a Kafka tool, or a throughput that you measured.'
      }),

      B.talk({
        id: 'm7-msk', t: 2, src: 'docs', title: 'MSK: Kafka on AWS',
        say: 'Amazon MSK runs Apache Kafka for you. Press Next for how it differs from Kinesis.',
        items: [
          ['What it is', 'Managed Streaming for Apache Kafka runs brokers in your VPC. Producers and consumers use the Kafka API, so existing Kafka clients and tools work. MSK Serverless removes the broker sizing, and MSK Connect runs Kafka Connect connectors, for example to write topics to S3.', 'Kafka, managed.'],
          ['Topics and partitions', 'A topic is split into partitions, which play the part of shards. The key of a message decides its partition. Consumers in a consumer group share the partitions, and Kafka tracks each group offset.', 'Partitions and consumer groups.'],
          ['Where it differs from Kinesis', 'Brokers need sizing, storage and patch planning (less in Serverless). You can keep data for as long as you pay for storage. The partition count can grow but cannot shrink. Networking and access are Kafka-style: security groups, TLS, IAM or SASL.', 'More control, more operation.'],
          ['How to choose', 'Choose Kinesis when you want an AWS-native stream with little to operate. Choose MSK when the team knows Kafka, when you need its tools and connectors, or when you move an existing Kafka workload to AWS.', 'Pick for a reason.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm7-dms', t: 1, src: 'docs', title: 'DMS and change data capture',
        say: 'DMS copies a database into the lake and keeps following it. Press Next for the parts.',
        items: [
          ['Full load and CDC', 'A task can run a full load, change data capture (CDC) or both. A full load copies the tables as they are. CDC reads the transaction log of the source, such as the binary log of MySQL, and sends each change.', 'A snapshot first, then the changes.'],
          ['Endpoints and the replication task', 'A source endpoint, a target endpoint and a replication task, which runs on a replication instance or in DMS Serverless. A table mapping says which schemas and tables to include.', 'Source, target, task.'],
          ['What lands in S3', 'In CSV or Parquet files for each table. For CDC, the first field of every row is the operation: I for insert, U for update, D for delete. For an update the row holds the values after the change, and for a delete the values before it. A setting adds a column with the commit time.', 'A change log, not a copy of the table.'],
          ['How files are cut', 'DMS writes a CDC file when the file reaches a minimum size or when a maximum interval has passed, whichever comes first. The documented defaults are 32 MB and 60 seconds.', 'More delay than a database trigger.'],
          ['What can go wrong', 'The source log must be kept long enough, large objects need special settings, schema changes need care, and latency grows when the task or the target falls behind. CloudWatch shows the source and target latency of a task.', 'Watch the latency.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm7-dmscode', t: 2, src: 'docs', title: 'A DMS task from a database to the raw zone', file: 'dms_task.py', lang: 'python', code: DMS,
        steps: [
          { say: 'The target endpoint is S3. Its settings say where the files go and in which format.', lines: G.span(DMS, /target = dms\.create_endpoint/, /EngineName/) },
          { say: 'Parquet, with a column that carries the commit time. `IncludeOpForFullLoad` writes an I in front of full-load rows, so full-load files and change files have the same shape.', lines: G.span(DMS, /"DataFormat"/, /IncludeOpForFullLoad/) },
          { say: '`CdcMaxBatchInterval` is the longest time DMS holds changes before it writes a file. A smaller value means less delay and more small files.', lines: G.span(DMS, /CdcMaxBatchInterval/) },
          { say: 'The table mapping includes one table. Rules can also rename, filter and transform.', lines: G.span(DMS, /^rules = /, /^\}\]\}$/) },
          { say: '`full-load-and-cdc` copies the table once and then follows the log.', lines: G.span(DMS, /dms\.create_replication_task/, /\)$/) }
        ],
        note: 'I checked the parameter names and the allowed values against the AWS SDK service model. The calls did not run on AWS, and the endpoints in the code are placeholders.'
      }),

      B.challenge({
        id: 'm7-ch-cdc', t: 2, title: 'Coding round: apply a change log', file: 'apply_changes.sql', lang: 'sql',
        q: 'DMS wrote the changes of an `orders` table to S3. **`op` is I, U or D**, and `cdc_ts` is the commit time. The rows are not in order, because files arrive in any order. Return the **current state of the table**: one row for each order that still exists, with `order_id`, `customer_id`, `status` and `total_usd`.',
        data: [T_CHANGES],
        starter: '-- The newest change of each order decides its state.\n-- A delete is a change, too.\nSELECT ...',
        hints: ['Number the changes of each order from the newest, with `row_number() OVER (PARTITION BY order_id ORDER BY cdc_ts DESC)`.', 'Keep only the newest change of each order.', 'If the newest change is a D, the order no longer exists, so drop it.'],
        sol: 'SELECT order_id, customer_id, status, total_usd\nFROM (\n  SELECT order_id, customer_id, status, total_usd, op,\n         row_number() OVER (PARTITION BY order_id\n                            ORDER BY cdc_ts DESC) AS rn\n  FROM orders_changes\n) AS t\nWHERE rn = 1 AND op <> \'D\'\nORDER BY order_id;',
        res: { cols: ['order_id', 'customer_id', 'status', 'total_usd'], rows: [['O-1', 'C-1', 'COMPLETED', '12.50'], ['O-3', 'C-1', 'CANCELLED', '21.00']], msg: '2 rows' },
        expl: ['Rank by `cdc_ts`, the commit time, and not by the order in which files arrived. Files can arrive late or out of order.', 'The newest change wins. O-3 has three changes, and the last one makes it CANCELLED at 21.00.', 'O-2 was inserted and then deleted. Its newest change is a D, so it is gone from the current state.', 'Keep the change log itself in the raw zone and never edit it. The current table is a result you can always rebuild from it.', 'If two changes of one order can share a commit time, add a second sort column such as the transaction sequence number, or the winner is arbitrary.']
      }),

      B.order({
        id: 'm7-ord', t: 1, q: 'Put the steps of a change data capture pipeline from a database into the lake in order.',
        items: [
          'Keep the transaction log of the source long enough for DMS to read it',
          'Create the source and target endpoints, and a task with a full load and CDC',
          'DMS writes the full load files and then the change files to the raw zone in S3',
          'A job applies the newest change of each key to the clean table, and removes deleted keys',
          'Compare row counts of the clean table with the source',
          'Alarm on the DMS latency and on the age of the newest file'
        ],
        why: 'The log must exist before DMS can read it. DMS writes the changes as an append-only log. A job turns the log into the current state. Counts prove that the state is right, and latency alarms show when the pipeline falls behind.'
      }),

      B.decide({
        id: 'm7-dec', t: 2, src: 'docs', title: 'Decision: how do the web events reach the lake?',
        scenario: 'The website sends about **800 events a second** of 1 KB each. Analysts want them in the lake **within 5 minutes**. In three months the data science team wants to **react to events within seconds** and to **replay last week** when a model changes. Nobody on the team has run Kafka.',
        opts: [
          { t: 'Firehose direct put to S3, with a 60 second buffer', d: 'The cheapest and simplest. Files in S3 within minutes.', lose: 'It cannot serve a second consumer and it cannot replay. In three months you would add a stream and change every producer.' },
          { t: 'Kinesis Data Streams, with Firehose as one consumer for S3 and Lambda or Flink added later', d: 'Files in S3 within minutes now, a second consumer and replay later, and nothing to operate.' },
          { t: 'An MSK cluster with a connector to S3', d: 'All Kafka tools and connectors, and room for very high throughput.', lose: 'More to size, secure and patch for a load of 0.8 MB a second, and nobody on the team knows Kafka.' }
        ],
        pick: 1,
        why: 'A stream gives you the second consumer and the replay that the data science team will need, and Firehose gives analysts their files with no code. 800 events of 1 KB is 0.8 MB a second, which fits 1 shard, so cost stays low. MSK solves problems that this team does not have.',
        when: 'Choose Firehose alone when no one will ever need a second consumer or a replay. Choose MSK when the team knows Kafka, needs a connector or a tool that only exists for Kafka, or moves an existing Kafka workload.'
      }),

      B.incident({
        id: 'm7-inc', t: 2, src: 'rec', title: 'Incident: producers are throttled and 3 shards are quiet', time: '12:05',
        alert: '**Order events are delayed and the producers log ProvisionedThroughputExceededException.** The stream has 4 shards and the total traffic is below its capacity. The key is the customer id. A wholesale customer started to send orders in bulk last night.',
        clues: ['One shard has about 47 % of all records, the others between 14 % and 23 %', 'One customer id sends about 15 % of the events', 'CloudWatch shows write throttling on a single shard'],
        opts: [
          { t: 'Salt the key of the heavy customer so its events spread over several keys, and split the hot shard if needed', fb: '' },
          { t: 'Switch the stream to on-demand mode', fb: 'On-demand adds capacity for the stream, but one key still goes to one shard. A hot key stays hot.' },
          { t: 'Add retries with a longer wait in the producers', fb: 'It hides the symptom for a while. The hot shard stays over its limit.' },
          { t: 'Double the number of shards', fb: 'Each shard then owns a smaller part of the hash range, but the hot key still hashes to one shard.' }
        ],
        best: 0,
        why: 'The hash sends every event of one key to one shard. In the recorded data one customer sent ' + num(SHARE_TOP, 1) + ' % of all events, and the busiest shard took ' + num(SHARE_BUSY, 0) + ' %, which is ' + num(SK.by_key_ratio, 2) + ' times the average. A salt of 8 values brought the busiest shard to ' + num(SK.salted_ratio, 2) + ' times. Add shards or on-demand mode only when the keys are spread.',
        checks: [
          ['Find the hot shard', 'Shard-level metrics show writes throttled on one shard only.'],
          ['Find the hot key', 'Count the events by partition key for the last hour. One key has the largest share.'],
          ['Rule out capacity', 'The stream total is below the sum of the shard limits, so capacity is not the issue.'],
          ['Spread the key', 'Add a small random or hashed suffix to the key of the heavy customer, and accept that order within that customer is no longer guaranteed.'],
          ['Prevent it', 'Alarm on the ratio of the busiest shard to the average, and review keys when a new kind of customer arrives.']
        ],
        tell: 'Producers were throttled on a stream with four shards, although the stream was well below its total capacity. One wholesale customer sent about 15 % of all events, and since the partition key was the customer id, one shard took about half of the records. I added a salt of eight values to the key for that customer, which brought the busiest shard close to the average, and we accepted that the order of that one customer is no longer guaranteed across the eight keys. We now alarm when the busiest shard passes 1.5 times the average.',
        prevent: ['Alarm when the **busiest shard passes 1.5 times the average**', 'Review **partition keys** when traffic changes', 'Use a **salt** for known heavy keys, and document the loss of order', 'Do not treat **on-demand mode** as a cure for a hot key']
      }),

      B.incident({
        id: 'm7-inc2', t: 2, src: 'docs', title: 'Incident: the consumer is two hours behind', time: '09:40',
        alert: '**The dashboard fed by the order stream shows data from two hours ago, and the gap grows.** The Lambda consumer shows errors, but only for one shard. `GetRecords.IteratorAgeMilliseconds` of that shard rises by one minute for every minute. The mapping uses the default settings.',
        clues: ['The error is a JSON parse error for one record', 'The other three shards are current', 'The mapping has no failure destination and no retry limit'],
        opts: [
          { t: 'Turn on bisecting, limit the retries and the record age, report item failures, and add a failure destination', fb: '' },
          { t: 'Add more shards', fb: 'The bad record is in one shard. More shards do not move it.' },
          { t: 'Increase the memory of the function', fb: 'The function is not slow. It fails on one record, and each retry fails again.' },
          { t: 'Delete the stream and recreate it', fb: 'It loses every record that other consumers have not yet read, and the producers must be changed.' }
        ],
        best: 0,
        why: 'The default retry is unlimited, so the one record that cannot be parsed blocks its shard, and the iterator age grows by one minute every minute. Bisecting finds the record, the limits let Lambda give up on it, and the destination keeps its details. After the settings are changed, the shard catches up.',
        checks: [
          ['Read the metric', 'Iterator age grows on one shard only.'],
          ['Read the error', 'The logs show the same parse error for the same sequence number on every retry.'],
          ['Check the mapping', 'No retry limit, no age limit, no destination.'],
          ['Change the mapping', 'Bisect on error, a limit on retries, a limit on record age, ReportBatchItemFailures and an OnFailure destination.'],
          ['Handle the record', 'Read it from the failure queue, find which producer sent it, and fix the source.']
        ],
        tell: 'The consumer was two hours behind on one shard. A single record that cannot be parsed made the function fail, and with the default unlimited retries the same batch was retried over and over, so the iterator age grew by a minute every minute. I turned on bisecting, limited the retries and the record age, switched to item-level failure reports, and added a queue as the failure destination. The shard caught up within minutes, and the bad record sat in the queue, where we traced it to a producer that sent an empty body. We now alarm on iterator age and on the depth of the failure queue.',
        prevent: ['Never leave **retry and age limits** at the defaults for Kinesis', 'Alarm on **iterator age** and on the **failure queue depth**', 'Validate the **message** at the producer', 'Give the failure queue an **owner**']
      }),

      B.qa({
        id: 'qa-kinesis', t: 1, tag: 'Streaming', secs: 60,
        q: 'How does Kinesis Data Streams work, and how do you size it?',
        pts: ['A stream is split into shards', 'The partition key is hashed with MD5 and picks the shard', 'A shard keeps order, and takes 1 MB and 1,000 records a second', 'Retention is 24 hours up to 365 days, so consumers can replay', 'Provisioned or on-demand capacity', 'Size by records a second and by MB a second, and take the larger'],
        short: 'A stream is split into shards. A producer sends a record with a partition key. Kinesis takes the MD5 hash of the key and sends the record to the shard that owns that part of the hash range. Records of one shard are kept in order, so records with the same key stay in order.\n\nA shard takes about 1,000 records or 1 MB a second, according to the PutRecords documentation. I size by both limits and take the larger number: 3,200 records of 1.5 KB a second is 4.8 MB, so 5 shards, and I add headroom. Records stay in the stream for 24 hours by default and up to 365 days, so a consumer can read them again.\n\nI use on-demand mode when the load is unknown and provisioned when it is steady, because shard-hours are then cheaper. Consumers are Lambda for small reactions, Firehose for S3 and Flink for windows and joins.\n\nThe risk is a hot key. I check the key against real traffic.',
        fu: [
          ['What happens when a shard is over its limit?', 'The records that do not fit fail with ProvisionedThroughputExceededException. A put_records call can partly succeed, so the producer reads FailedRecordCount and retries those records.'],
          ['What is enhanced fan-out?', 'A registered consumer gets its own 2 MB a second for each shard, so several consumers do not compete for the shared 2 MB.']
        ],
        trap: 'Sizing only by MB a second. The records-a-second limit can be the one you hit with small records.',
        real: 'Describe a stream you sized, and the traffic numbers you used.'
      }),

      B.qa({
        id: 'qa-partitionkey', t: 1, tag: 'Streaming', secs: 90,
        q: 'How do you choose a partition key, and what is a hot shard?',
        pts: ['The key decides the shard, and records with one key stay in order', 'A key with many values and an even load spreads the shards', 'A popular key sends too much to one shard', 'Check the key against real traffic', 'A salt spreads one key and gives up order across the salted keys', 'On-demand mode and more shards do not fix a hot key'],
        short: 'Kinesis hashes the partition key, so all records with one key go to one shard and stay in order. I choose the key from the ordering I need and from the traffic I measured.\n\nIf I need the events of one customer in order, the customer id is the key. If I need no order, I use the order id or another value that is different for every record, which spreads the load almost evenly.\n\nA hot shard happens when one key carries too much of the traffic. In my test of 20,000 events over 500 customers, one customer sent about 15 % of the events, and the busiest shard took 47 %, which is 1.88 times the average. A salt of 8 values brought it to 1.09, at the price of order across the salted keys.\n\nMore shards and on-demand mode do not help, because the hot key still hashes to one shard. I alarm when the busiest shard passes 1.5 times the average.',
        fu: [
          ['What does a split do?', 'It closes the shard and opens two children with half of the range each. The parent stays readable until retention ends, so a consumer reads the parent first to keep the order.'],
          ['How do you find the hot key?', 'Count the records by key for a short window from the stream or the logs, and compare the shard metrics.']
        ],
        trap: 'Using a constant key or a key with only a few values. All the traffic goes to one shard.',
        real: 'Describe a hot shard you found, and how you fixed it.'
      }),

      B.qa({
        id: 'qa-firehose', t: 1, tag: 'Streaming', secs: 60,
        q: 'When do you use Firehose, and when Kinesis Data Streams?',
        pts: ['Firehose delivers to S3, Redshift or OpenSearch in batches, with no code', 'Buffer by size or time, whichever comes first', 'Data Streams is a replayable log for several consumers', 'Firehose adds delay and has no replay', 'Convert to Parquet and partition by date at delivery', 'Often used together'],
        short: 'Firehose is delivery. I point producers or a stream at it, and it writes files to S3, or loads Redshift, in batches. I set a buffer by size and time, and a file is written when the first limit is reached. The size can be 1 to 128 MiB and the interval 0 to 900 seconds. It can convert JSON to Parquet with a Glue schema and build date folders, so the lake gets good files with no code.\n\nKinesis Data Streams is a log. Records stay for days, several consumers read them, each at its own pace, and a consumer can read again from an earlier point. That is what I need for a second use of the same events.\n\nFirehose adds delay, from seconds to minutes, and it delivers at least once. So for events that only need to land in S3, I use Firehose. When a second consumer or a replay is likely, I put a stream in front and let Firehose read from it.',
        fu: [
          ['How do you avoid many tiny files?', 'A larger buffer size and interval, and the size above what you ingest in 10 seconds. Compact later with a Glue or Athena job if needed.'],
          ['Is Firehose exactly once?', 'No. It is at least once, so downstream jobs deduplicate by an id.']
        ],
        trap: 'Choosing Data Streams when the only need is files in S3. You pay and operate for a replay that nobody uses.',
        real: 'Describe a delivery you set up, and the buffer settings you chose.'
      }),

      B.qa({
        id: 'qa-cdc', t: 2, tag: 'Streaming', secs: 90,
        q: 'How do you capture changes from an operational database into the lake?',
        pts: ['DMS reads the transaction log: full load plus CDC', 'Files in S3 with an operation column I, U or D and a commit time', 'Keep the raw change log, append only', 'Apply the newest change of each key; a delete removes the key', 'Order by commit time or log sequence, not by file arrival', 'Check counts and watch latency'],
        short: 'I use DMS with a full load and change data capture. It reads the transaction log of the source, so the production tables are not queried, and it writes files to S3. For CDC the first field of each row is the operation, I, U or D, and I add a column with the commit time.\n\nI keep these files as an append-only change log in the raw zone. A job, in Athena, Glue or Iceberg MERGE, turns the log into the current table: for each key it takes the newest change, ordered by commit time and not by file arrival, and drops keys whose newest change is a delete. With a table format such as Iceberg I can apply the changes with MERGE.\n\nI check the row counts against the source, and I alarm on the DMS source and target latency and on the age of the newest file. I also plan for schema changes and for the log retention of the source.',
        fu: [
          ['Why order by commit time?', 'Files arrive late and out of order. The commit time says which change happened last. If two share a time, add the log sequence number as a tie-breaker.'],
          ['What happens when DMS falls behind?', 'Latency rises, and the source log must be kept long enough for DMS to catch up. If the log is purged first, you must reload the table.']
        ],
        trap: 'Treating the CDC files as the table. They are a log, and the table is a result that you build from them.',
        real: 'Describe a CDC pipeline you built, and how you proved the target matched the source.'
      }),

      B.qa({
        id: 'qa-delivery', t: 2, tag: 'Streaming', secs: 90,
        q: 'Streams deliver at least once. How do you make consumers correct?',
        pts: ['At-least-once means duplicates are possible', 'Make the processing idempotent', 'A natural key or an event id to deduplicate', 'Write with an overwrite or upsert by key', 'Commit progress after the write', 'Keep a dead-letter path for bad records'],
        short: 'Kinesis, Firehose and SQS deliver a record at least once, so a consumer can see the same record twice after a retry or a producer retry. I design for that and I make the processing idempotent: processing a record twice gives the same result as processing it once.\n\nFor tables, I write by a natural key, with an upsert or MERGE, or I overwrite a whole partition from a known input range. For aggregates, I key the result by the window and the key, so a repeat overwrites it. When there is no natural key, the producer adds an event id, and the consumer keeps recent ids.\n\nI commit progress only after the write succeeded, so a crash makes a repeat and not a gap. Records that cannot be processed go to a dead-letter path with an alarm, so one bad record does not block the stream.\n\nI test idempotency by running the same batch twice and comparing the results.',
        fu: [
          ['Can you get exactly once?', 'Only as an effect: at-least-once delivery plus idempotent writes. Some engines offer it inside their own boundary, for example Flink with checkpoints and a transactional sink.'],
          ['How does Lambda avoid duplicates?', 'It does not. Lambda retries, so the handler must be safe to repeat, for example by writing to a key made from the sequence number.']
        ],
        trap: 'Promising exactly once without saying what makes the write safe to repeat.',
        real: 'Describe a duplicate you found in a pipeline and how you removed the cause.'
      }),

      B.qa({
        id: 'qa-msk', t: 2, tag: 'Streaming', secs: 90,
        q: 'Kinesis or MSK: how do you choose?',
        pts: ['Kinesis: AWS-native, little to operate, shards, retention up to 365 days', 'MSK: the Kafka API and its tools, partitions, consumer groups', 'MSK needs broker sizing, networking and patching (less in Serverless)', 'A team that knows Kafka, or a Kafka workload to move, points to MSK', 'Compare cost and effort with real numbers', 'Both can feed S3, Flink and Lambda'],
        short: 'Both are durable, ordered logs. The question is what the team and the workload need.\n\nKinesis Data Streams is AWS-native. There are no brokers, access is IAM, retention goes up to 365 days, and consumers are Lambda, Firehose and Flink. It is the simpler choice when the team has no Kafka skills and the throughput is modest.\n\nMSK runs Apache Kafka. I choose it when the team knows Kafka, when we use tools that exist only for Kafka, such as particular connectors or stream processing libraries, when we move an existing Kafka workload, or when the throughput and the number of consumers are very high. The price is more operation: broker sizing, storage, networking and upgrades, although MSK Serverless reduces that. A partition count can grow and cannot shrink.\n\nI compare both with the real numbers, events a second, event size, consumers and retention, and I do not choose Kafka because it sounds more serious.',
        fu: [
          ['What is a consumer group?', 'A set of Kafka consumers that share the partitions of a topic. Each partition goes to one consumer of the group, and Kafka stores the offset for the group.'],
          ['What is MSK Connect?', 'A managed place to run Kafka Connect connectors, for example a sink that writes a topic to S3.']
        ],
        trap: 'Choosing MSK for a load that fits one shard. You buy operation that you do not need.',
        real: 'Describe a streaming platform decision you made, with the numbers.'
      }),

      B.qa({
        id: 'qa-lag', t: 2, tag: 'Streaming', secs: 60,
        q: 'How do you monitor a streaming pipeline?',
        pts: ['Iterator age: how old is the oldest unread record', 'Write throttling and the busiest shard against the average', 'Consumer errors and the failure queue depth', 'Firehose delivery success, and the age of the newest S3 file', 'DMS source and target latency', 'End-to-end freshness: now minus the newest event time'],
        short: 'I watch the stream, each consumer and the end result.\n\nOn the stream: the throttled writes and the busiest shard against the average, which finds hot keys. On each consumer: the iterator age, which says how old the oldest unread record is, plus its errors. A rising iterator age on one shard usually means a record that keeps failing.\n\nOn Firehose: delivery success and the age of the newest object in S3. On DMS: the source and target latency of the task.\n\nOn the failure paths: the depth of the failure queue or dead-letter queue, with an alarm, because a queue that nobody reads is a silent loss.\n\nThe most useful number is end-to-end freshness: the current time minus the newest event time in the lake table. It catches problems that no single metric shows, and it is the number that a user would feel.',
        fu: [
          ['What would you alarm on first?', 'Iterator age above the freshness the business accepts, and the failure queue depth above zero.'],
          ['How do you see a hot shard?', 'The shard-level write metrics, or a count of records by key for a short window.']
        ],
        trap: 'Watching only throughput. A pipeline can run at full speed and be an hour behind.',
        real: 'Describe an alarm that caught a streaming problem early.'
      }),

      B.recap({
        id: 'm7-recap', n: 7, badge: 'Stream Watcher', color: '#FBCFE8',
        pts: [
          'The **MD5 hash of the partition key** picks the shard. In the recorded stream, one customer sent ' + num(SHARE_TOP, 1) + ' % of the events and the busiest shard was **' + num(SK.by_key_ratio, 2) + ' times** the average. A salt of 8 brought it to **' + num(SK.salted_ratio, 2) + '**.',
          'A shard takes about **1,000 records or 1 MB a second**. Size by both and take the larger. Records stay for **24 hours up to 365 days**.',
          '`put_records` can **partly fail**. Read `FailedRecordCount` and retry those records.',
          'For Kinesis the Lambda retry defaults are **unlimited**. Use bisecting, retry and age limits, item failures and a failure destination.',
          '**Firehose** writes a file when the size **or** the time limit is reached first, and delivers at least once.',
          '**DMS** writes an I, U or D change log. Apply the **newest change of each key**, ordered by commit time, and drop deleted keys.'
        ],
        lines: [
          'I choose the partition key from the real traffic.',
          'I make every consumer safe to repeat.',
          'I alarm on iterator age and on the failure queue.'
        ]
      })
    ]
  });
})();
