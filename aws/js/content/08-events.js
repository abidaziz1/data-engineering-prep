/* Mission 8: events, queues and Lambda. The S3 notification, the Lambda handler and its three pytest tests (and the failing run of a handler that
   forgets to decode the key) were run with boto3 and moto, an AWS emulator. The visibility timeout and dead-letter timeline, FIFO deduplication,
   SNS filtering and the 36 EventBridge pattern answers were recorded the same way, and the pattern answers were checked against the documented rules.
   Limits, retry defaults and prices come from documentation and the AWS SDK service models. Nothing here ran on AWS. */
(function () {
  var B = LAB.b, G = LAB.get;
  var H = G.file('lambda/handler.py'), HB = G.file('lambda/handler_bug.py'), EV = G.file('lambda/event.json'), TEST = G.file('lambda/test_handler.py');
  var RUN = G.counts('lambda.run'), TS = G.counts('test.summary'), RD = G.counts('sqs.redrive'), DEL = G.counts('sqs.delete'), FF = G.counts('sqs.fifo'), SN = G.counts('sns.fanout'), SE = G.counts('sqs.errors');
  var EP = G.counts('events.patterns');
  G.expect(RUN.first.results[0].status === 'written' && RUN.second.results[0].status === 'already done' && RUN.first.results[0].orders === 3 && RUN.first.results[0].revenue_usd === 19.5, 'the handler writes once and answers already done the second time');
  G.expect(RUN.event_key === 'raw/orders/dt%3D2026-03-14/orders-0001.json', 'the key arrives URL-encoded');
  G.expect(TS.passed === 3 && TS.pass_rc === 0 && TS.fail_rc === 1 && TS.failed_with_bug === true, 'three tests pass, and the handler that forgets to decode fails');
  G.expect(RD.visibility_timeout_seconds === 2 && RD.max_receive_count === 2 && RD.timeline.length === 4 && RD.main_queue_depth_at_end === 0 && DEL.received_again_after_timeout === false, 'the redrive timeline');
  G.expect(FF.sent === 3 && FF.received_in_order.join() === 'order 1,order 2' && SE.fifo_without_group_id.code === 'MissingParameter', 'FIFO drops the repeated deduplication id');
  G.expect(SN.analytics_count === 2 && SN.billing_count === 1 && SN.envelope_type === 'Notification', 'SNS fan-out with a filter');
  G.expect(EP.patterns.length === 6 && EP.events.length === 6 && EP.patterns[0].matched.join() === 'e1,e6', 'the pattern p1 matches the order file and the temporary file');
  function lineOf(code, re) { return G.at(code, re); }
  var HANDLER_BODY_A = G.at(H, /^def lambda_handler/), HANDLER_BODY_B = G.at(H, /return \{"results": results\}/);
  var HB_A = G.at(HB, /^def lambda_handler/), HB_B = G.at(HB, /return \{"results": results\}/);
  var BUG_CODE = G.lines(HB, HB_A, HB_B), FIX_CODE = G.lines(H, HANDLER_BODY_A, HANDLER_BODY_B);
  G.expect(HB_B - HB_A === HANDLER_BODY_B - HANDLER_BODY_A && BUG_CODE.split('\n').filter(function (l, k) { return l !== FIX_CODE.split('\n')[k]; }).length === 1, 'the buggy handler differs from the good one in one line');
  var BUG_LINE = G.at(BUG_CODE, /key = record\["s3"\]/);

  var EB = [
    'import json',
    'import boto3',
    '',
    'eb = boto3.client("events", region_name="us-east-1")',
    '',
    'pattern = {',
    '    "source": ["aws.s3"],',
    '    "detail-type": ["Object Created"],',
    '    "detail": {',
    '        "bucket": {"name": ["brewline-lake"]},',
    '        "object": {"key": [{"prefix": "raw/orders/"}]},',
    '    },',
    '}',
    '',
    'eb.put_rule(Name="raw-orders-created", EventPattern=json.dumps(pattern), State="ENABLED")',
    '',
    'eb.put_targets(',
    '    Rule="raw-orders-created",',
    '    Targets=[{',
    '        "Id": "orders-queue",',
    '        "Arn": "arn:aws:sqs:us-east-1:123456789012:raw-orders",',
    '        "DeadLetterConfig": {"Arn": "arn:aws:sqs:us-east-1:123456789012:raw-orders-events-dlq"},',
    '        "RetryPolicy": {"MaximumRetryAttempts": 20, "MaximumEventAgeInSeconds": 3600},',
    '    }],',
    ')'
  ].join('\n');

  var REDRIVE = [
    'import json',
    'import boto3',
    '',
    'sqs = boto3.client("sqs", region_name="us-east-1")',
    '',
    'dlq_url = sqs.create_queue(',
    '    QueueName="raw-orders-dlq",',
    '    Attributes={"MessageRetentionPeriod": "1209600"},',
    ')["QueueUrl"]',
    'dlq_arn = sqs.get_queue_attributes(QueueUrl=dlq_url, AttributeNames=["QueueArn"])["Attributes"]["QueueArn"]',
    '',
    'sqs.create_queue(',
    '    QueueName="raw-orders",',
    '    Attributes={',
    '        "VisibilityTimeout": "360",',
    '        "ReceiveMessageWaitTimeSeconds": "20",',
    '        "RedrivePolicy": json.dumps({"deadLetterTargetArn": dlq_arn, "maxReceiveCount": 5}),',
    '    },',
    ')',
    '',
    '# later, after the cause is fixed: move the parked messages back to the queue they came from',
    'sqs.start_message_move_task(SourceArn=dlq_arn)'
  ].join('\n');

  var ESM_SQS = [
    'import boto3',
    '',
    'lam = boto3.client("lambda", region_name="us-east-1")',
    '',
    'lam.create_event_source_mapping(',
    '    EventSourceArn="arn:aws:sqs:us-east-1:123456789012:raw-orders",',
    '    FunctionName="load-raw-orders",',
    '    BatchSize=10,',
    '    MaximumBatchingWindowInSeconds=5,',
    '    ScalingConfig={"MaximumConcurrency": 5},',
    '    FunctionResponseTypes=["ReportBatchItemFailures"],',
    ')'
  ].join('\n');

  var SQS_HANDLER = [
    'import json',
    '',
    '',
    'def handler(event, context):',
    '    failures = []',
    '    for rec in event["Records"]:',
    '        try:',
    '            body = json.loads(rec["body"])',
    '            load_file(body["detail"]["object"]["key"])',
    '        except Exception:',
    '            failures.append({"itemIdentifier": rec["messageId"]})',
    '    return {"batchItemFailures": failures}'
  ].join('\n');

  LAB.addChapter({
    id: 'm8', n: 8, title: 'Events, queues and Lambda', short: 'Events', blurb: 'S3 events, EventBridge patterns, SQS and dead-letter queues, SNS fan-out, and Lambda handlers that are safe to repeat', minutes: 50,
    focus: ['snap', 'air'],
    goals: [
      'Follow an **S3 event** to a **Lambda function**, and decode the key.',
      'Write an **EventBridge pattern**, and predict which events it matches.',
      'Explain the **visibility timeout**, **maxReceiveCount** and the **dead-letter queue**.',
      'Choose between **SQS, SNS, EventBridge and Kinesis**.',
      'Make a handler **safe to repeat**, and test it without AWS.'
    ],
    say: 'Mission 8 is how things react to other things. A file lands in S3 and a load starts. A message waits in a queue until a worker is ready, and goes to a dead-letter queue when it keeps failing. The handler, its tests and the queue behaviour were run against an emulator, and the numbers on these screens are what it returned. Retry defaults and limits come from the AWS SDK models and documentation. Nothing ran on AWS.',
    scenes: [
      B.talk({
        id: 'm8-talk', t: 1, src: 'docs', title: 'Why events and queues',
        say: 'A pipeline that calls the next step directly breaks when the next step is slow or down. Press Next for the four tools that decouple steps.',
        items: [
          ['Events say what happened', 'S3 reports that an object was created. EventBridge matches events to rules and sends them on. An event is a fact. It does not ask anyone to do anything.', 'A fact, not a command.'],
          ['A queue holds work', 'SQS keeps messages until a worker takes one. If workers are slow or down, the messages wait. If a spike of 5,000 files arrives, the workers take them at their own speed.', 'A buffer between fast and slow.'],
          ['A topic copies a message to many', 'SNS sends one message to every subscriber: queues, functions, email. A filter policy lets a subscriber take only some messages.', 'Fan-out.'],
          ['A function reacts', 'Lambda runs your code for each event or batch of messages, with no servers. It scales with the load and has a time limit of 15 minutes.', 'Small code, on demand.'],
          ['The rule that ties them together', 'Every one of these delivers a message at least once. A message can arrive twice, so the code that reacts must give the same result when it runs twice.', 'Make it safe to repeat.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm8-flow', t: 1, src: 'docs', title: 'An event-driven load', g: 'events', legend: true,
        steps: [
          { say: 'A file lands in S3 and a load starts, with a queue in between. Press Next to follow one file.', cap: 'File in, load out.' },
          { say: 'Step 1. A partner uploads a file. S3 sends an "Object Created" event to EventBridge. You switch this on for the bucket.', on: ['v1'], focus: ['s3', 'eb'], cap: 'S3 emits an event.' },
          { say: 'Step 2. A rule compares the event with its pattern, here the key prefix `raw/orders/`, and sends matching events to an SQS queue.', on: ['v2'], focus: ['eb', 'q'], cap: 'A rule filters and routes.' },
          { say: 'Step 3. Lambda polls the queue and receives a batch of messages. While it works, they are hidden from other readers.', on: ['v3'], focus: ['q', 'lam'], cap: 'Lambda reads a batch.' },
          { say: 'Step 4. The function starts the load, here a Glue job (mission 4). When the function returns without an error, Lambda deletes the messages.', on: ['v4'], focus: ['lam', 'gj'], cap: 'The load starts.' },
          { say: 'Step 5. A message that fails again and again is moved to a dead-letter queue after a set number of receives, so it stops blocking the others.', on: ['v5'], focus: ['q', 'dlq'], cap: 'A bad message is parked.' },
          { say: 'Step 6. An alarm watches the dead-letter queue and tells people through SNS.', on: ['v6', 'v7'], focus: ['dlq', 'al', 'sn'], cap: 'People are told.' },
          { say: 'The same event can arrive twice, so the load must be safe to repeat. Every design in this mission comes back to this.', focus: ['idem'], cap: 'At least once.' }
        ]
      }),

      B.cmp({
        id: 'm8-dest', t: 1, src: 'docs', title: 'Where S3 can send an event',
        say: 'S3 can send an event to four places. Press Next to compare them.',
        cols: ['Destination', 'What it is good for', 'Watch for'],
        hl: 1,
        rows: [
          ['Lambda, directly', 'A small reaction to every object, with the least parts.', 'A spike of files means a spike of invocations. If the function fails, S3 retries a few times and then drops the event unless you set a destination.'],
          ['SQS, directly', 'A buffer between S3 and a slow consumer.', 'The queue needs a policy that lets S3 send. Filtering is limited to a prefix and a suffix.'],
          ['SNS, directly', 'Copying the event to several subscribers.', 'Same limited filtering. Subscribers see the S3 message as text inside an envelope.'],
          ['EventBridge', 'Rich filtering on any field, several targets, retry, archive and replay.', 'You enable it per bucket. Events are matched by a rule, so a wrong pattern means silence.']
        ],
        steps: [
          { upto: 2, say: 'Direct to Lambda or to SQS. Few parts, and little filtering.' },
          { upto: 4, say: 'SNS for copies, EventBridge for patterns and routing.' }
        ],
        pick: 'Use **EventBridge** when you need real filtering or more than one target. For one consumer with a prefix filter, **S3 to SQS** is the plainest design.'
      }),

      B.code({
        id: 'm8-event', t: 1, src: 'rec', title: 'What an S3 event looks like', file: 'event.json', lang: 'json', code: EV,
        steps: [
          { say: 'This is the notification that S3 sends to Lambda. A check with the Powertools S3Event class accepted its shape. The function gets a list of records, usually one.', lines: null },
          { say: 'The event name says what happened: `ObjectCreated:Put`. There are also names for deletes, copies and restores.', lines: G.span(EV, /"eventName"/) },
          { say: 'The bucket name, and its ARN.', lines: G.span(EV, /"bucket": \{/, /"arn"/) },
          { say: 'The object key. It is URL-encoded: `dt=2026-03-14` arrives as `dt%3D2026-03-14`. A space arrives as a plus sign. Decode it before you use it.', lines: G.span(EV, /"key"/) },
          { say: 'The size and the ETag. The `sequencer` is a hexadecimal value that you can compare to order events for the same key, because events can arrive out of order.', lines: G.span(EV, /"size"/, /"sequencer"/) }
        ],
        note: 'The event follows the S3 documentation. S3 notifications are delivered at least once, so the same record can arrive twice.'
      }),

      B.code({
        id: 'm8-handler', t: 1, src: 'rec', title: 'A handler that is safe to repeat', file: 'handler.py', lang: 'python', code: H,
        steps: [
          { say: 'This function writes a small summary of every order file that lands in the raw zone. It ran against the emulator, with a real boto3 client. The first lines say what matters: the key is URL-encoded, and S3 can deliver the same event twice.', lines: G.span(H, /^"""Brewline/, /^"""$/) },
          { say: 'Settings come from environment variables, so the same code runs in every environment.', lines: G.span(H, /^SUMMARY_PREFIX/) },
          { say: 'The logic is a plain function with no AWS calls: count the orders, and add up the revenue of the orders that are not cancelled. A function like this is easy to test.', lines: G.span(H, /^def summarize/, /return \{"orders"/) },
          { say: 'Decode the key with `unquote_plus`. This is the line that production code forgets. The next screens show what happens without it.', lines: G.span(H, /key = urllib/) },
          { say: 'Read the object and summarize it.', lines: G.span(H, /body = s3\.get_object/, /summary = summarize/) },
          { say: 'Write the summary with `IfNoneMatch="*"`. S3 stores the object only if no object with that key exists. If it does, S3 answers `PreconditionFailed` and the handler reports "already done". A repeated event changes nothing.', lines: G.span(H, /out_key = /, /already done/) }
        ],
        note: 'In the recording the first call returned "' + RUN.first.results[0].status + '" with ' + RUN.first.results[0].orders + ' orders and $' + RUN.first.results[0].revenue_usd.toFixed(1) + ' of revenue, and the second call with the same event returned "' + RUN.second.results[0].status + '" and wrote nothing.'
      }),

      B.term({
        id: 'm8-test', t: 1, src: 'rec', title: 'Testing the handler without AWS',
        say: 'Three tests ran against moto, an emulator, so no AWS account is needed. Watch them pass, and then watch the same tests catch a handler that forgets to decode the key.',
        lines: function () { return G.plain(G.text('test.pass'), { cmd: 'pytest -q' }).concat(G.plain(G.text('test.fail'), { cmd: 'pytest -q -x   # with the handler that does not decode the key' })); },
        after: 'The tests are short. One sends an event with an encoded key, one sends the same event twice, and one sends a key with a space, which arrives as a plus sign. The failing run shows the real symptom of the missing decode: the handler asks S3 for a key that does not exist, and boto3 raises `NoSuchKey`.',
        afterKind: 'tip',
        doneSay: 'A handler is a plain function. Call it with a hand-made event and an emulated bucket, and you can test the failures before they reach production.'
      }),

      B.bug({
        id: 'm8-bug', t: 1, src: 'rec', q: 'This handler works with a test key, and in production it fails with NoSuchKey for keys with dt=2026-03-14. Click the line that causes it.',
        file: 'handler_bug.py', lang: 'python', code: BUG_CODE, bad: [BUG_LINE],
        hint: 'How does S3 write an equals sign into an event?',
        why: 'S3 URL-encodes the key in the event, so `dt=2026-03-14` arrives as `dt%3D2026-03-14`, and a space arrives as a plus sign. The handler asked for the encoded key, which does not exist. In the recording this exact handler failed with `NoSuchKey`. `urllib.parse.unquote_plus` decodes both.',
        fix: FIX_CODE,
        cheer: 'Decode the key before you use it.'
      }),

      B.quiz({
        id: 'm8-q1', t: 1, src: 'rec',
        q: 'An S3 event carries the key `raw/orders/dt%3D2026-03-14/orders-0001.json`. What must the handler do before it calls get_object?',
        opts: [
          { t: 'Use the key as it is', fb: 'S3 has no object with that name. The recorded handler that did this failed with NoSuchKey.' },
          { t: 'Decode it with urllib.parse.unquote_plus', fb: '' },
          { t: 'Replace every slash with an underscore', fb: 'The slashes are part of the real key.' },
          { t: 'Look the key up by its ETag', fb: 'There is no lookup by ETag in the S3 API.' }
        ],
        ok: 1, why: 'The key in an event is URL-encoded. `unquote_plus` turns `%3D` into `=` and `+` into a space. A test with a key that has a space and an equals sign catches the mistake.'
      }),

      B.quiz({
        id: 'm8-q2', t: 1, src: 'rec',
        q: 'The same S3 event reaches the handler twice, and the handler appends rows to a table each time. What goes wrong?',
        opts: [
          { t: 'Nothing. S3 never sends an event twice', fb: 'S3 notifications are delivered at least once, so repeats happen.' },
          { t: 'The rows of that file are in the table twice, and the totals are too high', fb: '' },
          { t: 'The second call fails with PreconditionFailed', fb: 'Only the handler that writes with IfNoneMatch gets that answer. This one has no such guard.' },
          { t: 'Lambda drops the second event', fb: 'Lambda runs your code for every event it receives. It does not know your logic.' }
        ],
        ok: 1, why: 'At-least-once delivery means a repeat is normal. A handler must give the same result for the same event, for example by writing with a key made from the object, as the recorded handler does with `IfNoneMatch="*"`, or by merging on the object key.'
      }),

      B.widget({ id: 'm8-lab-pat', kind: 'patterns', t: 1, src: 'rec', title: 'Lab: which events match a pattern' }),

      B.talk({
        id: 'm8-eb', t: 1, src: 'docs', title: 'EventBridge',
        say: 'EventBridge is the router for events. Press Next for the parts.',
        items: [
          ['Buses, rules and targets', 'Events arrive on an event bus. A rule holds a pattern. When an event matches, the rule sends it to up to five targets, for example SQS, Lambda, Step Functions, SNS, Kinesis or an API endpoint.', 'Match, then route.'],
          ['Patterns', 'A pattern is JSON that mirrors the event. A value is a list, and an event matches when its value is in the list. Operators include prefix, suffix, anything-but, numeric ranges and exists. A list inside a field is an OR. Separate fields are an AND.', 'Write the shape you want to see.'],
          ['Retry and dead letters', 'When delivery to a target fails, EventBridge retries. A retry policy sets 0 to 185 attempts and a maximum event age of 60 seconds up to 24 hours. A dead-letter queue on the target keeps the events that could not be delivered.', 'Set a DLQ on every important target.'],
          ['Schedules', 'A rule can run on a schedule, with a cron or rate expression. EventBridge Scheduler is a separate service for large numbers of one-off and recurring schedules.', 'Cron without a server.'],
          ['Archive and replay', 'A bus can archive the events it receives, and you can replay a time range into the bus. It is the way to reprocess after a bug in a consumer.', 'Replay the past.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm8-ebcode', t: 2, src: 'docs', title: 'A rule and a target with a dead-letter queue', file: 'rule.py', lang: 'python', code: EB,
        steps: [
          { say: 'The pattern mirrors the event: the source, the detail type and the fields of the detail. It matches objects created under `raw/orders/` in one bucket.', lines: G.span(EB, /^pattern = \{/, /^\}$/) },
          { say: 'The rule stores the pattern as a JSON string. A rule with no pattern and no schedule does nothing.', lines: G.span(EB, /eb\.put_rule/) },
          { say: 'The target is an SQS queue. The queue needs a policy that lets EventBridge send messages to it.', lines: G.span(EB, /eb\.put_targets/, /"Arn": "arn:aws:sqs:us-east-1:123456789012:raw-orders"/) },
          { say: 'If EventBridge cannot deliver, it retries up to 20 times within an hour, and then puts the event in the dead-letter queue. Without this, an event that fails is lost.', lines: G.span(EB, /DeadLetterConfig/, /RetryPolicy/) }
        ],
        note: 'For S3 events, the bucket must send its events to EventBridge: the bucket notification configuration needs an empty `EventBridgeConfiguration`. I checked the parameter names against the AWS SDK service model. The calls did not run on AWS.'
      }),

      B.cmp({
        id: 'm8-sqs', t: 1, src: 'docs', title: 'SQS in one table',
        say: 'SQS has two queue types and a handful of settings. Press Next to read them. The numbers come from the AWS SDK model for SQS.',
        cols: ['Setting', 'What it does', 'Value'],
        hl: 2,
        rows: [
          ['Standard queue', 'Almost unlimited throughput, at-least-once delivery, order not guaranteed.', 'The default type.'],
          ['FIFO queue', 'Order within a message group, and no duplicates within the deduplication window. Lower throughput. The name ends in `.fifo`.', 'A send without a MessageGroupId is rejected.'],
          ['Visibility timeout', 'How long a received message stays hidden from other readers.', '30 seconds by default, 0 to 12 hours.'],
          ['Message retention', 'How long an unprocessed message is kept.', '4 days by default, 60 seconds to 14 days.'],
          ['Long polling', 'A receive call waits for a message instead of returning at once.', '0 to 20 seconds. Use 20.'],
          ['Message size', 'The largest message the queue accepts.', 'Up to 1 MiB.'],
          ['Dead-letter queue', 'Where a message goes after it was received maxReceiveCount times.', 'maxReceiveCount is 10 by default.']
        ],
        steps: [
          { upto: 2, say: 'The two types. FIFO costs throughput and gives order and deduplication.' },
          { upto: 5, say: 'Timeouts and polling. Long polling cuts empty receives and the cost.' },
          { upto: 7, say: 'Size, and the dead-letter queue, where a message that keeps failing is parked.' }
        ],
        pick: 'Use a **standard queue** and make the consumer safe to repeat. Choose **FIFO** only when order within a group is a business rule, for example the updates of one order.'
      }),

      B.widget({ id: 'm8-lab-sqs', kind: 'sqs', t: 1, src: 'rec', title: 'Lab: the visibility timeout and the dead-letter queue' }),

      B.quiz({
        id: 'm8-q3', t: 1, src: 'rec',
        q: 'In the recorded run a worker received a message and crashed without deleting it. The visibility timeout was 2 seconds. When could another worker receive the message?',
        opts: [
          { t: 'At once, because the first worker is gone', fb: 'In the recording a second worker asked 0.1 seconds later and got nothing. The message was still hidden.' },
          { t: 'After the visibility timeout, with a receive count of 2', fb: '' },
          { t: 'Never. A message that was received once is gone', fb: 'It is gone only when a worker deletes it.' },
          { t: 'After the message retention period of 4 days', fb: 'The retention period is how long an unprocessed message lives. It has no part in redelivery here.' }
        ],
        ok: 1, why: 'A received message is hidden until the visibility timeout ends. If it was not deleted, it becomes visible again, and the receive count goes up. In the recording that happened at 2.5 seconds with a receive count of 2.'
      }),

      B.quiz({
        id: 'm8-q4', t: 2, src: 'rec',
        q: 'maxReceiveCount is 2 and a message was received twice without being deleted. What happened on the third attempt?',
        opts: [
          { t: 'The queue delivered it a third time', fb: 'Not with maxReceiveCount 2. In the recording the third attempt returned nothing.' },
          { t: 'SQS moved the message to the dead-letter queue, and the main queue stayed empty', fb: '' },
          { t: 'SQS deleted the message', fb: 'It moved the message. The recording found it in the dead-letter queue.' },
          { t: 'The queue stopped accepting messages', fb: 'The queue is not affected. Only that message was moved.' }
        ],
        ok: 1, why: 'When the receive count would pass maxReceiveCount, SQS moves the message to the dead-letter queue. At the end of the recording the main queue held ' + RD.main_queue_depth_at_end + ' messages and the dead-letter queue held `' + RD.dlq_message_body + '`.'
      }),

      B.code({
        id: 'm8-redrive', t: 2, src: 'docs', title: 'A queue, its dead-letter queue and a redrive', file: 'queues.py', lang: 'python', code: REDRIVE,
        steps: [
          { say: 'Create the dead-letter queue first, with the longest retention, 14 days. A message keeps the time it first entered the source queue, so a dead-letter queue with the same retention could expire a message at once.', lines: G.span(REDRIVE, /dlq_url = sqs\.create_queue/, /\)\["QueueUrl"\]/) },
          { say: 'The source queue needs the ARN of the dead-letter queue.', lines: G.span(REDRIVE, /dlq_arn = /) },
          { say: 'A visibility timeout of 360 seconds is six times a function timeout of 60 seconds, the rule of thumb for Lambda. Long polling waits up to 20 seconds for a message.', lines: G.span(REDRIVE, /"VisibilityTimeout"/, /"ReceiveMessageWaitTimeSeconds"/) },
          { say: 'The redrive policy sends a message to the dead-letter queue after 5 receives.', lines: G.span(REDRIVE, /"RedrivePolicy"/) },
          { say: 'After you fix the cause, `start_message_move_task` moves the parked messages back to the queue they came from. A dead-letter queue is a place to wait, and somebody has to read it.', lines: G.span(REDRIVE, /start_message_move_task/) }
        ],
        note: 'The dead-letter queue of a standard queue must be a standard queue, and the dead-letter queue of a FIFO queue must be a FIFO queue. I checked the attribute names and the operations against the AWS SDK service model. The code did not run on AWS.'
      }),

      B.code({
        id: 'm8-esmsqs', t: 2, src: 'docs', title: 'Lambda reading from SQS', file: 'sqs_mapping.py', lang: 'python', code: ESM_SQS,
        steps: [
          { say: 'The event source mapping makes Lambda poll the queue for you.', lines: G.span(ESM_SQS, /lam\.create_event_source_mapping/, /FunctionName/) },
          { say: 'A batch is up to 10 messages, or whatever arrives within 5 seconds. For a standard queue the batch size can go up to 10,000 when a batching window is set.', lines: G.span(ESM_SQS, /BatchSize/, /MaximumBatchingWindowInSeconds/) },
          { say: '`MaximumConcurrency` limits how many function instances read the queue at the same time. It protects what the function calls, for example a database or a Glue job with a limit on concurrent runs. The smallest value is 2.', lines: G.span(ESM_SQS, /ScalingConfig/) },
          { say: '`ReportBatchItemFailures` lets the function say which messages failed, so only those go back to the queue.', lines: G.span(ESM_SQS, /FunctionResponseTypes/) }
        ],
        note: 'I checked the parameter names and the limits against the AWS SDK service model. The call did not run on AWS.'
      }),

      B.code({
        id: 'm8-sqshandler', t: 2, src: 'docs', title: 'A handler for a batch of messages', file: 'sqs_handler.py', lang: 'python', code: SQS_HANDLER,
        steps: [
          { say: 'Each record is one SQS message. The body is the text that EventBridge sent, which is the event as JSON.', lines: G.span(SQS_HANDLER, /for rec in event/, /body = json\.loads/) },
          { say: 'Load the file named in the event. `load_file` must be safe to repeat.', lines: G.span(SQS_HANDLER, /load_file/) },
          { say: 'Report the `messageId` of every message that failed. Lambda deletes the others and leaves the failed ones to return after the visibility timeout.', lines: G.span(SQS_HANDLER, /failures\.append/, /batchItemFailures/) }
        ],
        note: 'The response format follows the Lambda documentation for SQS. The verifier runs this handler with a sample event and a stub for `load_file`.'
      }),

      B.talk({
        id: 'm8-vis', t: 2, src: 'docs', title: 'Timeouts that go wrong together',
        say: 'Three timeouts must fit together. Press Next to read the rules.',
        items: [
          ['Visibility timeout against the function timeout', 'The Lambda documentation says to set the queue visibility timeout to at least six times the function timeout. If the timeout is shorter than the processing, the message becomes visible while a function still works on it, a second function takes it, and the work is done twice.', 'At least 6 times.'],
          ['Retention of the dead-letter queue', 'A moved message keeps the time it first entered the source queue. Give the dead-letter queue a longer retention than the source queue, up to 14 days, or messages can expire before anyone looks.', 'The DLQ outlives the queue.'],
          ['maxReceiveCount and a slow dependency', 'If a database is down for ten minutes and maxReceiveCount is 3, every message is moved to the dead-letter queue within minutes, although nothing is wrong with the messages. Choose a count and a visibility timeout that survive a short outage, and redrive after a longer one.', 'Outages create dead letters.'],
          ['Alarm on the dead-letter queue', 'A dead-letter queue that nobody watches is a silent loss. Alarm when the number of visible messages is above zero, and give the alarm an owner.', 'Depth above zero means look now.']
        ],
        cols: 1
      }),

      B.quiz({
        id: 'm8-q5', t: 2, src: 'docs',
        q: 'A function takes up to 60 seconds for a batch. The queue has the default visibility timeout. What do you expect?',
        opts: [
          { t: 'Nothing. The default is long enough', fb: 'The default is 30 seconds, shorter than the 60 seconds of work.' },
          { t: 'Messages become visible again while the function still works on them, so they are processed twice', fb: '' },
          { t: 'The function times out at 30 seconds', fb: 'The function has its own timeout. The queue setting does not limit it.' },
          { t: 'Messages are deleted when the visibility timeout ends', fb: 'They return to the queue. Only a delete, or the retention period, removes them.' }
        ],
        ok: 1, why: 'The default visibility timeout is 30 seconds. After that, the messages return to the queue while the first function still works, and a second function takes them. Set the visibility timeout to at least six times the function timeout: 360 seconds here.'
      }),

      B.talk({
        id: 'm8-sns', t: 1, src: 'rec', title: 'SNS: one message, many subscribers',
        say: 'SNS copies a message to every subscriber. The lab above showed a real run. Press Next for the parts.',
        items: [
          ['Topics and subscriptions', 'A publisher sends a message to a topic. Every subscription gets a copy: an SQS queue, a Lambda function, an HTTP endpoint, email or SMS. The publisher does not know who listens.', 'Publish once.'],
          ['Filter policies', 'A subscription can carry a filter policy. By default it looks at the message attributes. The scope can be set to the message body. In the recording, the billing queue had the policy `{"status": ["COMPLETED"]}` and received ' + SN.billing_count + ' of 2 messages, and the unfiltered analytics queue received ' + SN.analytics_count + '.', 'Each subscriber takes what it needs.'],
          ['The envelope and raw delivery', 'SNS wraps a message in JSON with fields such as ' + SN.envelope_fields.slice(0, 4).join(', ') + ' and more. With raw message delivery on, a queue gets only the message body. Without it, your code parses the envelope and then the `Message` field inside it.', 'Switch raw delivery on for queues.'],
          ['Failures', 'A subscription can have its own dead-letter queue for messages that cannot be delivered.', 'Set one for every important subscription.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm8-which', t: 1, src: 'docs', title: 'SQS, SNS, EventBridge or Kinesis',
        say: 'Four services move messages. Press Next to match the job to the service.',
        cols: ['You need', 'Use', 'Because'],
        hl: 1,
        rows: [
          ['One consumer pool that works through a backlog at its own speed', 'SQS', 'A buffer with retries and a dead-letter queue.'],
          ['One message copied to several subscribers, each with its own filter', 'SNS, usually in front of SQS queues', 'Fan-out with filter policies. Each subscriber keeps its own queue.'],
          ['Route events from AWS services or your apps by content, with archive and replay', 'EventBridge', 'Pattern rules on any field, many targets, retry and replay.'],
          ['An ordered log that several consumers read, and replay of days of data', 'Kinesis Data Streams (mission 7)', 'Retention and several readers. A queue deletes a message when it is processed.']
        ],
        steps: [
          { upto: 2, say: 'Buffer a backlog, or copy one message to many.' },
          { upto: 4, say: 'Route by content, or keep an ordered log.' }
        ],
        pick: 'A common design is **EventBridge or SNS in front, SQS behind each consumer, Lambda or Glue behind the queue**. Each part does one job, and each can fail without losing the message.'
      }),

      B.talk({
        id: 'm8-lambda', t: 1, src: 'docs', title: 'Lambda for data engineers',
        say: 'Lambda is the glue between events and the heavy jobs. Press Next for what it is good at and where it stops.',
        items: [
          ['Good at', 'Reacting to an event with a small piece of work: validate a file, move it, write a summary, start a Glue job, call an API. It starts in milliseconds and bills per invocation and per GB-second of use.', 'Small, fast, event-driven.'],
          ['Limits', 'A function can run for at most 15 minutes. It has limited memory and local disk, so it is the wrong place for a large join or a long transformation. Use Glue or EMR for those, and let Lambda start them.', 'Not for the heavy work.'],
          ['Concurrency', 'Lambda runs as many copies as events arrive, up to the account limit. Reserved concurrency caps one function. For an SQS source, `MaximumConcurrency` caps the readers.', 'Protect what you call.'],
          ['Packaging', 'Code goes up as a zip or a container image. Libraries come as layers. Use the same boto3 and library versions in your tests as in the function.', 'Keep the test and the function alike.'],
          ['Cost', 'Billing is per request and per GB-second. The arm64 architecture bills about 20 % less for the duration. Keep an eye on functions that run in a retry loop.', 'Retries cost money, too.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm8-async', t: 2, src: 'docs', title: 'How Lambda is called, and what a failure does',
        say: 'The three ways to call Lambda handle failure differently. Press Next to compare them.',
        cols: ['Invocation', 'Used by', 'When the function fails'],
        hl: 2,
        rows: [
          ['Synchronous', 'API Gateway, a direct call, Step Functions', 'The caller gets the error and decides what to do.'],
          ['Asynchronous', 'S3, SNS, EventBridge', 'Lambda retries. The default is 2 retries, and you can set 0 to 2, and a maximum event age from 60 seconds to 6 hours. After that you can send the event to a destination: a queue, a topic, a function, a bus or a bucket.'],
          ['Polling', 'SQS, Kinesis, DynamoDB streams', 'The source decides. SQS returns the message after the visibility timeout. Kinesis retries the batch and blocks the shard, unless you set limits (mission 7).']
        ],
        steps: [
          { upto: 1, say: 'The caller owns the failure.' },
          { upto: 2, say: 'Lambda retries twice, and then the event is gone unless you set a destination or a dead-letter queue.' },
          { upto: 3, say: 'Lambda polls and the source decides what a retry means.' }
        ],
        pick: 'Put a **queue between S3 and Lambda** when no file may be lost. An S3 event that fails in an asynchronous call can be dropped after the retries.'
      }),

      B.talk({
        id: 'm8-idem', t: 2, src: 'rec', title: 'Safe to repeat',
        say: 'At-least-once delivery makes duplicates normal. Press Next for three ways to make a load safe to repeat.',
        items: [
          ['Write with a name made from the input', 'The recorded handler writes its summary to a key built from the input key. With a conditional write (`IfNoneMatch="*"`), the second event found the object and answered "' + RUN.second.results[0].status + '". Nothing was written twice.', 'Same input, same name.'],
          ['Overwrite a whole partition from a known range', 'A job that rewrites the partition for one date from the raw files gives the same result when it runs twice. Append loads do not.', 'Replace, do not append.'],
          ['Merge on a key', 'MERGE or delete-then-insert on a natural key, such as the order id or the file key, makes a table load safe to repeat (missions 5 and 6).', 'The key makes the repeat harmless.'],
          ['Remember what was done', 'A small table or item per processed file, written with a condition, records that a file was loaded. It costs a write for each file, and it works for any kind of side effect.', 'A ledger of work done.']
        ],
        cols: 1
      }),

      B.order({
        id: 'm8-ord', t: 1, q: 'Put the steps of an S3-triggered load with a queue in order.',
        items: [
          'A partner uploads a file to the raw prefix',
          'S3 sends an Object Created event to EventBridge',
          'A rule matches the prefix and puts a message in an SQS queue',
          'Lambda reads a batch of messages and decodes each key',
          'The function loads each file with a write that is safe to repeat',
          'A message that keeps failing moves to the dead-letter queue, and an alarm fires'
        ],
        why: 'The event is a fact, the rule routes it, the queue buffers it, and the function acts on it. Decoding the key and writing safely to repeat come before the load. The dead-letter queue and the alarm catch what the retries could not fix.'
      }),

      B.decide({
        id: 'm8-dec', t: 2, src: 'docs', title: 'Decision: how do 5,000 partner files start their loads?',
        scenario: 'Partners upload up to **5,000 files in ten minutes** each morning. The load for each file calls an API that accepts **5 calls at a time**. **No file may be lost**, each file must be loaded **once**, and failures must be **inspectable** by the team.',
        opts: [
          { t: 'S3 sends events directly to Lambda', d: 'The fewest parts.', lose: '5,000 invocations start at about the same moment, the API refuses most of them, and Lambda retries an asynchronous event only twice before it drops it. Files are lost.' },
          { t: 'S3 to EventBridge to SQS, and Lambda reads the queue with a maximum concurrency of 5, a dead-letter queue and an alarm', d: 'The queue holds the spike. Only 5 readers call the API. Failures wait in the dead-letter queue.' },
          { t: 'A Lambda on a schedule that lists the bucket every minute and loads what it has not seen', d: 'Simple, and it works with any bucket.', lose: 'Up to a minute of delay, repeated list calls on a large prefix, and you must keep a record of which files were loaded. It is a fine fallback and it is more work to get right.' }
        ],
        pick: 1,
        why: 'The queue absorbs the spike, the concurrency limit protects the API, the dead-letter queue keeps failed files, and the alarm tells the team. Each load is made safe to repeat, because every part of the chain delivers at least once.',
        when: 'Direct S3 to Lambda is fine when files are few, the work is quick and a lost event can be recovered by a nightly listing. The scheduled listing is a good second line even with the queue, to find files that no event reached.'
      }),

      B.incident({
        id: 'm8-inc', t: 2, src: 'rec', title: 'Incident: the revenue is 2 % too high', time: '08:50',
        alert: '**Yesterday revenue in the dashboard is about 2 % above the source system.** The load runs from S3 events. Nothing changed in the code. The pipeline appends the rows of each file to a table. The totals are right on days with few files.',
        clues: ['A count by `source_file` shows a few files with exactly double the expected rows', 'The logs show two invocations for the same S3 key a few seconds apart', 'The loader has no check on whether a file was loaded already'],
        opts: [
          { t: 'Make the load safe to repeat: merge on the file and the order id, or write with a condition, and remove the duplicate rows', fb: '' },
          { t: 'Ask S3 to deliver events exactly once', fb: 'S3 notifications are delivered at least once. There is no setting that changes it.' },
          { t: 'Delay the function by 10 seconds', fb: 'A delay does not remove the second event. It only moves it.' },
          { t: 'Run the load once a day instead', fb: 'It hides the duplicates only if the nightly job is itself safe to repeat. The fix is in the loader.' }
        ],
        best: 0,
        why: 'S3 delivered some events twice, as it is documented to do, and the loader appended the rows each time. In the recording the handler that wrote with `IfNoneMatch="*"` answered "already done" on the second call and wrote nothing. Give the loader the same guarantee, and clean the duplicates by deleting the rows of each file and loading it once.',
        checks: [
          ['Find the extra rows', 'Count rows by source file. A file with double the rows was loaded twice.'],
          ['Find the cause', 'Two invocations for one key a few seconds apart match a repeated event.'],
          ['Check the loader', 'It appends and keeps no record of loaded files.'],
          ['Repair the table', 'Delete the rows of the affected files and load each file once.'],
          ['Prevent it', 'Merge on a key or write with a condition, and add a test that sends the same event twice.']
        ],
        tell: 'Revenue was about 2 % too high because some S3 events were delivered twice, which S3 allows, and our loader appended the rows of a file each time it got an event. I deleted the rows of the affected files, reloaded each once, and changed the loader to write through a merge on the file and the order id, so a repeat changes nothing. We added a test that sends the same event twice, and a daily check that compares the row count per file with the source.',
        prevent: ['Make every loader **safe to repeat**', 'Add a test that sends **the same event twice**', 'Compare **row counts per file** with the source every day', 'Do not rely on **exactly-once** delivery from S3, SNS or SQS']
      }),

      B.incident({
        id: 'm8-inc2', t: 2, src: 'docs', title: 'Incident: every message is processed twice', time: '15:30',
        alert: '**The queue never reaches zero, and the loader runs twice for many files.** Each batch takes about 60 seconds. The dead-letter queue is empty. The queue settings were created with the defaults, and the function timeout is 90 seconds.',
        clues: ['The queue visibility timeout is 30 seconds', 'Receive counts of 2 appear in the messages', 'The function does not fail, it only takes a minute for a batch'],
        opts: [
          { t: 'Raise the visibility timeout of the queue to at least six times the function timeout, 540 seconds, and keep the loader safe to repeat', fb: '' },
          { t: 'Lower the function timeout to 30 seconds', fb: 'The batch needs 60 seconds. The function would fail every time and the messages would go to the dead-letter queue.' },
          { t: 'Add a dead-letter queue', fb: 'Nothing fails. The messages return to the queue because the timeout is too short.' },
          { t: 'Switch to a FIFO queue', fb: 'A FIFO queue has the same visibility rule. It does not fix a timeout that is too short.' }
        ],
        best: 0,
        why: 'After 30 seconds the messages become visible again while the first function still works on them, and a second function takes them. The Lambda documentation advises a visibility timeout of at least six times the function timeout, here 540 seconds. In the recording, a message returned as soon as its 2 second timeout ended, with a receive count of 2.',
        checks: [
          ['Read the receive counts', 'Counts of 2 on messages that did not fail point at a returning message.'],
          ['Compare the timeouts', 'Visibility 30 seconds, function timeout 90 seconds, batch time 60 seconds.'],
          ['Check the DLQ', 'It is empty, so nothing failed.'],
          ['Change the queue', 'Set the visibility timeout to 540 seconds.'],
          ['Protect against repeats', 'The loader stays safe to repeat, because a timeout can still be crossed.']
        ],
        tell: 'Every message was processed twice because the queue used the default visibility timeout of 30 seconds, while a batch took about 60 seconds. The messages became visible again and a second function picked them up. I raised the visibility timeout to 540 seconds, which is six times the function timeout, as the Lambda documentation advises, and confirmed that receive counts dropped to 1. The loader is also safe to repeat, so an overrun cannot create duplicates. We now create queues from a template with the timeout tied to the function timeout.',
        prevent: ['Set the visibility timeout to **six times the function timeout**', 'Create queues and functions from **one template** so the settings move together', 'Alarm on **receive counts above 1** and on the oldest message age', 'Keep handlers **safe to repeat**']
      }),

      B.qa({
        id: 'qa-events', t: 1, tag: 'Events', secs: 60,
        q: 'How would you start a load when a file lands in S3?',
        pts: ['S3 sends an event to EventBridge, SQS or Lambda', 'A queue between S3 and the consumer holds spikes', 'The handler decodes the key', 'Events are delivered at least once, so the load is safe to repeat', 'A dead-letter queue and an alarm catch failures', 'Concurrency limits protect downstream systems'],
        short: 'I send the S3 event to EventBridge, and a rule with a prefix pattern puts matching events into an SQS queue. A Lambda function reads batches from the queue and starts the load, or calls Glue.\n\nThe queue is the important part. It holds a spike of thousands of files, the function reads at the speed I set with a maximum concurrency, and a dead-letter queue keeps messages that keep failing. An alarm on the dead-letter queue tells the team.\n\nThe handler decodes the key, because S3 URL-encodes it, and it must be safe to repeat, because S3 and SQS deliver at least once. I write with a name made from the input and a condition, or I merge on a key. I test the handler with moto and send the same event twice.\n\nFor a few files and quick work, S3 directly to Lambda is enough. A scheduled listing is a good second check for files that no event reached.',
        fu: [
          ['Why not S3 directly to Lambda?', 'It works for small loads. A spike creates as many invocations, an asynchronous event is retried only twice and can then be dropped, and you cannot limit concurrency easily.'],
          ['How do you find files that no event reached?', 'A scheduled job that lists the prefix and compares it with a record of loaded files.']
        ],
        trap: 'Describing the happy path only. The answer needs the queue, the repeat and the failure path.',
        real: 'Describe an event-driven load you built, and one failure it survived.'
      }),

      B.qa({
        id: 'qa-sqs', t: 1, tag: 'Events', secs: 90,
        q: 'How does SQS handle failures: visibility timeout, retries and dead-letter queues?',
        pts: ['A received message is hidden for the visibility timeout', 'If not deleted, it returns with a higher receive count', 'After maxReceiveCount it moves to the dead-letter queue', 'Visibility timeout at least six times the function timeout', 'The DLQ needs a longer retention and an alarm', 'Redrive after the cause is fixed'],
        short: 'When a worker receives a message, SQS hides it for the visibility timeout. If the worker deletes it, it is done. If the worker crashes or is too slow, the message becomes visible again and the receive count goes up. In my test, with a 2 second timeout, a message came back after 2.5 seconds with a receive count of 2.\n\nA redrive policy sets maxReceiveCount. When a message would pass it, SQS moves the message to the dead-letter queue. With a count of 2, the third attempt got nothing, and the message was in the dead-letter queue.\n\nI set the visibility timeout to at least six times the function timeout, so messages do not return while the function works. The dead-letter queue gets the longest retention and an alarm for depth above zero. When the cause is fixed, I move the messages back with a message move task.\n\nBecause a message can be received more than once, the consumer must be safe to repeat.',
        fu: [
          ['What does long polling do?', 'A receive call waits up to 20 seconds for a message. It cuts empty responses, and the cost, and lowers latency.'],
          ['When do you use FIFO?', 'When order within a group matters, for example the updates of one order. It deduplicates by a deduplication id within a window, and it has lower throughput than a standard queue.']
        ],
        trap: 'Saying that SQS delivers exactly once. Standard queues deliver at least once.',
        real: 'Describe a dead-letter queue you read, and what you did with its messages.'
      }),

      B.qa({
        id: 'qa-sqsvs', t: 2, tag: 'Events', secs: 90,
        q: 'SQS, SNS, EventBridge or Kinesis: how do you choose?',
        pts: ['SQS: a buffer with retries for one consumer pool', 'SNS: copy one message to several subscribers with filters', 'EventBridge: route by content, many targets, archive and replay', 'Kinesis: an ordered log with several readers and replay', 'Common design: SNS or EventBridge in front, SQS behind each consumer', 'Decide by consumers, replay and order'],
        short: 'I choose by what the consumers need.\n\nSQS is a buffer. One pool of workers takes messages at its own speed, with retries and a dead-letter queue. A message is gone when it is processed.\n\nSNS copies one message to every subscriber, each with its own filter policy. I usually give each subscriber its own SQS queue, so that a slow one does not hold back the others.\n\nEventBridge routes events by their content. Rules match patterns on any field and send events to many kinds of targets. It has retry, dead-letter queues on targets, and archive and replay, which helps when a consumer had a bug.\n\nKinesis is a log. Several consumers read the same ordered records, and records stay for days, so I can replay. I use it for high-volume streams.\n\nA common design is EventBridge or SNS in front, an SQS queue behind each consumer, and Lambda or Glue behind the queue.',
        fu: [
          ['Can SQS replay old messages?', 'No. A processed message is deleted. For replay use Kinesis, or an EventBridge archive for events.'],
          ['Why a queue for each subscriber?', 'Each consumer works at its own speed, has its own retries and dead-letter queue, and a failure in one does not affect the others.']
        ],
        trap: 'Naming a favourite. The answer is a choice for a stated need.',
        real: 'Describe a design where you combined two of these, and why.'
      }),

      B.qa({
        id: 'qa-lambdade', t: 2, tag: 'Events', secs: 60,
        q: 'Where does Lambda fit in a data platform, and where does it not?',
        pts: ['Event glue: validate, move, start jobs, call APIs', 'A time limit of 15 minutes', 'Concurrency scales with events, so protect downstream systems', 'Not for large joins or long transformations: use Glue or EMR', 'Test handlers locally with moto', 'Watch retries and cost'],
        short: 'Lambda is event glue. I use it to validate and move a file, write a summary, start a Glue job or a Step Functions execution, call an API, or react to a stream record. It starts quickly, scales with the events and bills per request and per GB-second.\n\nIt stops at 15 minutes and at its memory and disk limits, so it is the wrong tool for a large join or a long transformation. Glue or EMR do that, and Lambda only starts them.\n\nConcurrency needs care. Lambda scales with the events, so a spike can overload an API or a database. A queue in front, with a maximum concurrency on the event source, protects them.\n\nI write handlers as plain functions, so I can test them with a hand-made event and moto, with no AWS account. I make them safe to repeat, because events are delivered at least once, and I watch for retry loops, which cost money and hide errors.',
        fu: [
          ['What is a cold start?', 'The first call of a new function instance loads the runtime and your code, which adds latency. It matters for interactive APIs and rarely for batch loads.'],
          ['How do you cut the cost?', 'Right-size the memory, use arm64, avoid retry loops, and move steady heavy work to a service that bills by the hour.']
        ],
        trap: 'Using Lambda for a long ETL because it is serverless. Run the heavy work on Glue.',
        real: 'Describe a Lambda function you ran in production and a limit that you hit.'
      }),

      B.qa({
        id: 'qa-idem', t: 2, tag: 'Events', secs: 90,
        q: 'Events can be delivered twice. How do you make a pipeline correct anyway?',
        pts: ['Assume at-least-once delivery everywhere', 'Write with a name or key made from the input', 'Conditional writes, merges, overwrite a partition', 'A record of what was done for side effects', 'Test by sending the same event twice', 'Reconcile counts with the source'],
        short: 'I assume every delivery can repeat: S3 notifications, SNS, SQS, Lambda retries and Kinesis batches. So the code must give the same result when it runs twice.\n\nFor files, I write to a name made from the input key, with a condition that stops an overwrite. In my test, a second event for the same file got PreconditionFailed, and the handler reported "already done". For tables, I merge on a natural key, or I replace a whole partition from a known range. For side effects such as an API call, I keep a record of what was done, written with a condition.\n\nI test it directly: the same event twice must not change the result. I also reconcile the row count per file or per day with the source, so a silent duplicate shows up as a difference.\n\nI do not build a pipeline on exactly-once delivery, because no AWS messaging service promises it across services.',
        fu: [
          ['What is the difference between idempotent and exactly once?', 'Exactly once is a delivery guarantee. Idempotent is a property of the consumer: repeats change nothing. The second one is what I can build.'],
          ['What if two copies of an event run at the same time?', 'A conditional write or a unique key lets only one succeed. The other sees that the work is done or fails safely.']
        ],
        trap: 'Saying you will deduplicate later. Duplicates in a table are harder to remove than to prevent.',
        real: 'Describe a duplicate you found in a table, and how you stopped the cause.'
      }),

      B.qa({
        id: 'qa-eb', t: 3, tag: 'Events', secs: 90,
        q: 'How do EventBridge patterns work, and what can go wrong?',
        pts: ['A pattern is JSON that mirrors the event', 'Values are lists: an OR inside a field, an AND across fields', 'Operators: prefix, suffix, anything-but, numeric, exists', 'A wrong pattern means silence: test patterns', 'Retry policy and a dead-letter queue on the target', 'Archive and replay for reprocessing'],
        short: 'A pattern is JSON that has the shape of the event. Each field holds a list of allowed values, and an event matches when every named field matches one of its values. A list inside a field is an OR, and separate fields are an AND. There are operators for prefix, suffix, anything-but, numeric ranges and exists.\n\nThe common mistake is a pattern that matches too much or too little, and a rule that does not match is silent. I test patterns with the TestEventPattern API on sample events. In my test, a prefix pattern on raw/orders/ also matched a temporary file under that prefix, which I would filter out with a suffix or a different temporary location.\n\nFor delivery I set a retry policy and a dead-letter queue on every important target, because without them a failed delivery is lost after the retries. I archive the bus, so I can replay a time range after a consumer bug.\n\nFor S3, I switch on EventBridge notifications for the bucket.',
        fu: [
          ['How do you test a pattern?', 'With the TestEventPattern API or the console, on real sample events, including events that should not match.'],
          ['What does the retry policy do?', 'It sets up to 185 attempts and a maximum event age of up to 24 hours. After that the event goes to the dead-letter queue, if one is set.']
        ],
        trap: 'Writing a pattern and trusting it. A pattern needs tests, including events that must not match.',
        real: 'Describe a rule that matched the wrong events, and how you found out.'
      }),

      B.recap({
        id: 'm8-recap', n: 8, badge: 'Event Wrangler', color: '#FDBA74',
        pts: [
          'S3, SNS, SQS and Lambda deliver **at least once**. The handler must give the same result when it runs twice, for example with `IfNoneMatch="*"` or a merge on a key.',
          'The key in an S3 event is **URL-encoded**. Decode it with `unquote_plus`. The recorded handler that did not failed with `NoSuchKey`.',
          'An **EventBridge pattern** is JSON: a list in a field is an OR, fields are an AND. A prefix pattern on `raw/orders/` also matched a temporary file.',
          'A received SQS message is hidden for the **visibility timeout**. After **maxReceiveCount** receives it moves to the **dead-letter queue**. Set the timeout to **six times the function timeout**.',
          '**SNS** copies a message to every subscriber, with a **filter policy** for each. Use **raw delivery** for queues.',
          'Put a **queue between S3 and Lambda**, limit its **concurrency**, and **alarm on the dead-letter queue**.'
        ],
        lines: [
          'I decode the key and make the load safe to repeat.',
          'I put a queue between the event and the work.',
          'I alarm on the dead-letter queue.'
        ]
      })
    ]
  });
})();
