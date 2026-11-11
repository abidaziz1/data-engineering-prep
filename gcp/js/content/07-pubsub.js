/* Mission 7: Pub/Sub. Topics, subscriptions, at-least-once delivery, acknowledgement, dead letters, ordering, replay, and a consumer that is safe to repeat. The settings and
   defaults of the client library are REAL, read offline from google-cloud-pubsub. The delivery rules are a small MODEL that I wrote from the documentation, run in Python: it is
   not Google's service and has no backoff, batching or flow control. The Cloud Run function was tested with real CloudEvents through the Functions Framework and pytest. */
(function () {
  var B = LAB.b, G = LAB.get;
  var SUB = G.counts('pubsub.subscription'), DEF = G.counts('pubsub.defaults'), MSG = G.counts('pubsub.message'), MS = G.counts('pubsub.model_settings'), PM = G.table('pubsub.model');
  var FN = G.counts('fn.summary'), FM = G.file('fn/main.py'), FT = G.file('fn/test_main.py'), PC = G.file('fn/pytest_clean.txt'), PB = G.file('fn/pytest_bug.txt'), CODE = G.file('code/pubsub_demo.py');
  var FL = G.table('cli.flags');
  G.expect(SUB.ack_deadline_seconds === 60 && SUB.dead_letter_policy.max_delivery_attempts === 5 && SUB.enable_message_ordering === true && SUB.enable_exactly_once_delivery === false && SUB.message_retention_duration === '604800s', 'the subscription settings');
  G.expect(DEF.publisher_batch.max_messages === 100 && DEF.publisher_batch.max_bytes === 1000000 && DEF.subscriber_flow_control.max_messages === 1000 && DEF.subscriber_flow_control.max_lease_duration_seconds === 3600, 'the library defaults');
  G.expect(MSG.enable_message_ordering === true && MSG.ordering_key === 's01', 'the message');
  G.expect(FN.clean.passed === 4 && FN.clean.failed === 0 && FN.bug.failed === 1 && FN.bug.passed === 3, 'the function tests');
  var sit = function (name) { return PM.rows.filter(function (r) { return r[0] === name; }); };
  var slow = sit('slow handler')[0], poison = sit('poison, no dead letter')[0], dead = sit('poison, dead letter after 5')[0], blocked = sit('ordering key blocks'), freed = sit('ordering key, dead letter after 5');
  G.expect(slow[3] === 4 && slow[4] === 4 && poison[3] > 30 && dead[3] === 5 && dead[5] === 'dead' && blocked[1][3] === 0 && blocked[2][3] === 0 && freed[1][5] === 'acked' && freed[2][5] === 'acked', 'the model results');
  var sub = FL.rows.filter(function (r) { return r[0] === 'gcloud pubsub subscriptions create'; })[0], top = FL.rows.filter(function (r) { return r[0] === 'gcloud pubsub topics create'; })[0];
  G.expect(sub[2] === '-' && top[2] === '-', 'the Pub/Sub flags exist');
  function wrap(t, n) {
    return t.split('\n').reduce(function (a, l) {
      while (l.length > n) { var cut = l.lastIndexOf(' ', n); if (cut < 40) cut = n; a.push(l.slice(0, cut)); l = '    ' + l.slice(cut).trim(); }
      a.push(l); return a;
    }, []).join('\n');
  }
  function term(txt, cmd) { return G.plain(wrap(txt, 92), { cmd: cmd, d: 90 }); }
  var GC = [
    'gcloud pubsub topics create pos-orders \\',
    '  --message-retention-duration=7d',
    '',
    'gcloud pubsub topics create pos-orders-dead',
    '',
    'gcloud pubsub subscriptions create orders-to-bq \\',
    '  --topic=pos-orders \\',
    '  --ack-deadline=60 \\',
    '  --enable-message-ordering \\',
    '  --dead-letter-topic=pos-orders-dead \\',
    '  --max-delivery-attempts=5 \\',
    '  --min-retry-delay=10s --max-retry-delay=600s'
  ].join('\n');
  var BUGACK = [
    'def callback(message):',
    '    message.ack()',
    '    order = json.loads(message.data)',
    '    write_order(order)'
  ].join('\n');
  var FIXACK = [
    'def callback(message):',
    '    order = json.loads(message.data)',
    '    write_order(order)          # idempotent: keyed on order_id',
    '    message.ack()               # only after the work is done'
  ].join('\n');
  var BUGORD = [
    'publisher = pubsub_v1.PublisherClient()',
    'future = publisher.publish(topic_path, data, ordering_key="s01")',
    'future.result()'
  ].join('\n');
  var FIXORD = [
    'options = pubsub_v1.types.PublisherOptions(enable_message_ordering=True)',
    'publisher = pubsub_v1.PublisherClient(publisher_options=options)',
    'future = publisher.publish(topic_path, data, ordering_key="s01")',
    'future.result()'
  ].join('\n');

  LAB.addChapter({
    id: 'm7', n: 7, title: 'Pub/Sub: messages that arrive more than once', short: 'Pub/Sub', blurb: 'Topics, subscriptions, acknowledgement, dead letters, ordering, replay, and consumers that are safe to repeat', minutes: 50,
    focus: ['ing', 'src'],
    goals: [
      'Say what **at least once** delivery means, and design a consumer for it.',
      'Choose between **pull**, **push**, a **BigQuery subscription** and a **Cloud Storage subscription**.',
      'Explain the **ack deadline**, and why you acknowledge **after** the work.',
      'Set up a **dead letter** topic and a retry policy, and say what an **ordering key** costs.',
      'Say when **exactly-once delivery** helps and why it is not the end of idempotency.',
      'Compare **Pub/Sub** with **Kafka**, because job descriptions name both.'
    ],
    say: 'Mission 7 is messaging. Pub/Sub carries the order events of Brewline from the tills to the warehouse, and its one promise is "at least once". Every design choice in this mission follows from that. I read the real settings and defaults of the Python client offline, and I wrote a small model of the delivery rules, so that you can see what happens to a slow handler, a poison message and an ordering key. The model is mine, from the documentation, and the labs say so. The Cloud Run function at the end was tested with real CloudEvents.',
    scenes: [
      B.flow({
        id: 'm7-flow', t: 1, src: 'docs', title: 'A message, from the till to the table', g: 'pubsub', legend: true,
        steps: [
          { say: 'A till sends an event for every order. Pub/Sub keeps it until every subscription has acknowledged it. Press Next to follow one message. The most important picture of the mission is the dead letter topic at the bottom.', cap: 'A topic and its subscriptions.' },
          { say: 'Step 1. The **publisher** sends the message to a **topic**. A message is bytes plus attributes (text pairs) and an optional **ordering key**. Pub/Sub gives it an id and a publish time.', on: ['q1'], focus: ['ps_pub', 'ps_topic'], cap: 'The publisher sends to a topic.' },
          { say: 'Step 2. Each **subscription** gets its **own copy**. Three consumers means three subscriptions on one topic, and each progresses independently. A slow one does not hold back the others.', on: ['q2'], focus: ['ps_topic', 'ps_pull'], cap: 'Each subscription has its own copy.' },
          { say: 'Step 3. With **pull**, a worker asks for messages, processes them, and **acknowledges** each one. A message that is not acknowledged within the **ack deadline** is delivered again.', on: ['q3'], focus: ['ps_pull', 'ps_work'], cap: 'Pull: ask, work, acknowledge.' },
          { say: 'A **push** subscription calls a web address instead, and a 200 answer is the acknowledgement. A **BigQuery subscription** writes each message as a row, with no code. Both are on the picture, and both rely on the same rules.', on: ['q4', 'q5', 'q6', 'q7'], focus: ['ps_push', 'ps_run', 'ps_bqs', 'ps_tbl'], cap: 'Push and BigQuery subscriptions.' },
          { say: 'Step 4. A message that fails over and over would be delivered for ever. A **dead letter policy** moves it to another topic after N deliveries, where a person can read it and decide. The rest of the stream keeps going.', on: ['q8'], focus: ['ps_pull', 'ps_dlt'], cap: 'After N tries, a message is set aside.' }
        ]
      }),

      B.talk({
        id: 'm7-basics', t: 1, src: 'docs', title: 'Four ideas that explain Pub/Sub',
        say: 'Four ideas carry the whole service. Press Next for each.',
        items: [
          ['Topic and subscription', 'A **topic** is where publishers send. A **subscription** is a named reader of one topic with its own position. Messages are kept until every subscription has acknowledged them, or until the retention time runs out (seven days by default for a subscription, and longer if you ask).', 'One topic, many independent readers.'],
          ['At least once', 'Pub/Sub delivers each message **at least once**. A message can arrive twice: after a timeout, a restart, or an acknowledgement that did not reach the service. The consumer must tolerate it. Exactly-once delivery exists as an option, and does not remove the need (see later).', 'Design for the second copy.'],
          ['Acknowledge after the work', 'A message is gone from the subscription **only when it is acknowledged**. Acknowledge after the work is finished and its result is safely stored. If the worker dies first, the message comes back, and the work is repeated, which is why the work must be safe to repeat.', 'The ack says "I am done", not "I got it".'],
          ['Size and order', 'A message can be up to 10 MB. Ordering is **not** promised unless you use an ordering key. Messages with the same key are delivered in the order they were published, in one region, and a failing message blocks the messages behind it.', 'No order by default. A key buys order, at a price.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The sentence to remember:', t: 'at least once plus an idempotent consumer gives the same result as exactly once, without waiting for the service to promise it.' }
      }),

      B.cmp({
        id: 'm7-types', t: 1, src: 'docs', title: 'Five ways to read a subscription',
        say: 'A subscription can be read in five ways. They differ in who controls the pace, and in how much code you write. Press Next to read the pattern.',
        cols: ['Type', 'How messages arrive', 'You write', 'Use it when'],
        hl: 3,
        rows: [
          ['Pull', 'A worker asks for messages, in small batches', 'a worker with flow control', 'You need control of the pace, and you run workers'],
          ['StreamingPull', 'A long-lived stream that the client library keeps open', 'a callback (the usual client library way)', 'Low latency and high throughput, from your own code or from Dataflow'],
          ['Push', 'Pub/Sub calls an HTTPS endpoint, and a 2xx answer acknowledges', 'a web service, such as Cloud Run', 'The consumer is a service that scales by requests'],
          ['BigQuery subscription', 'Each message is written as a row', 'nothing', 'Events land in a table as they are'],
          ['Cloud Storage subscription', 'Messages are batched into files in a bucket', 'nothing', 'A raw archive of the events, in files']
        ],
        steps: [
          { upto: 2, say: 'Pull and StreamingPull are for your own workers and for Dataflow. You control the pace with flow control.' },
          { upto: 3, say: 'Push suits Cloud Run: the platform scales instances with the requests, and a 2xx answer is the acknowledgement.' },
          { upto: 5, say: 'The last two need no code. Use them first, and add a pipeline only when the data needs work before it lands.' }
        ],
        pick: 'Start with a **BigQuery subscription** if the events can land as they are, and with a **push to Cloud Run** if a few lines of code must run. Use **Dataflow** when the events need real work.'
      }),

      B.code({
        id: 'm7-config', t: 1, src: 'rec', title: 'A subscription, as the client library holds it', file: 'pubsub_demo.py', lang: 'python', code: CODE,
        steps: [
          { say: 'This function builds a subscription object with the real client library, offline, and returns it as a dictionary. Nothing is sent to Google. Reading it shows what a subscription is made of. Press Next.', lines: null },
          { say: 'The **ack deadline** is 60 seconds. A handler has a minute before the message is delivered again. Message **ordering** is on, and **exactly-once** delivery is off.', lines: G.span(CODE, /ack_deadline_seconds=60/, /enable_exactly_once_delivery/) },
          { say: 'Messages are **retained** for seven days (604,800 seconds), which is also how long a replay can go back. Acknowledged messages are not retained.', lines: G.span(CODE, /message_retention_duration/, /retain_acked_messages/) },
          { say: 'The **dead letter policy** sends a message to another topic after 5 deliveries. The **retry policy** waits between deliveries: at least 10 seconds, at most 10 minutes.', lines: G.span(CODE, /dead_letter_policy/, /retry_policy/) },
          { say: 'The **expiration policy** with a time to live of zero means that the subscription never expires. By default an unused subscription is deleted after 31 days, which is a nasty surprise for a quiet consumer.', lines: G.span(CODE, /expiration_policy/) }
        ],
        note: 'Recorded with google-cloud-pubsub ' + G.meta('google-cloud-pubsub') + ', offline. The dictionary also shows `state`, `tags` and `message_transforms`, which the current library has and this lesson does not use.'
      }),

      B.rows({
        id: 'm7-defaults', t: 1, src: 'rec', title: 'The defaults of the client library',
        steps: [
          {
            say: 'The publisher **batches** messages before it sends them: up to **' + DEF.publisher_batch.max_messages + ' messages**, or **' + (DEF.publisher_batch.max_bytes / 1e6) + ' MB**, or **' + (DEF.publisher_batch.max_latency_seconds * 1000) + ' milliseconds**, whichever comes first. A short wait makes the sends bigger and cheaper. If you need every message sent at once, lower the numbers.',
            tabs: [{ layer: 'RECORDED', name: 'Publisher batching defaults', c: 'raw', cols: ['Setting', 'Default'], rows: [['max messages in a batch', DEF.publisher_batch.max_messages], ['max bytes in a batch', DEF.publisher_batch.max_bytes.toLocaleString('en-US')], ['max wait before sending', (DEF.publisher_batch.max_latency_seconds * 1000) + ' milliseconds']], trk: 0 }],
            notes: ['Read from the installed library, offline. A new version of the library can change a default, so read yours.']
          },
          {
            say: 'The subscriber has **flow control**: up to **' + DEF.subscriber_flow_control.max_messages + ' messages** or **100 MiB** outstanding at once, and the library keeps extending the deadline of a message it holds for up to **' + DEF.subscriber_flow_control.max_lease_duration_seconds + ' seconds**. This is why a slow handler in a client library does not trigger redelivery, and the same handler behind a push endpoint does.',
            tabs: [{ layer: 'RECORDED', name: 'Subscriber flow control defaults', c: 'raw', cols: ['Setting', 'Default'], rows: [['max outstanding messages', DEF.subscriber_flow_control.max_messages], ['max outstanding bytes', DEF.subscriber_flow_control.max_bytes.toLocaleString('en-US') + ' (100 MiB)'], ['max time the library extends a lease', DEF.subscriber_flow_control.max_lease_duration_seconds + ' seconds']], trk: 0 }],
            notes: ['Lower the outstanding messages when each message is heavy, so that a worker does not hold more than it can finish.']
          }
        ]
      }),

      B.widget({ id: 'm7-lab', kind: 'pubsub', t: 1, src: 'rec', title: 'Lab: what happens to a message' }),

      B.rows({
        id: 'm7-slow', t: 1, src: 'rec', title: 'The slow handler, in numbers',
        steps: [
          {
            say: 'In the model, a handler needs 35 seconds and the ack deadline is 10, with nothing extending it. The message is delivered **' + slow[3] + ' times**, and the handler runs to the end **' + slow[4] + ' times**, because each delivery starts another run while the first is still working. If the handler writes a row, you now have ' + slow[4] + ' rows.',
            tabs: [{ layer: 'MODEL', name: 'One slow message', c: 'raw', cols: ['Setting', 'Value'], rows: [['handler needs', '35 seconds'], ['ack deadline', '10 seconds, never extended'], ['deliveries', slow[3]], ['handler ran to the end', slow[4]], ['final state', slow[5]]], trk: 0 }],
            notes: ['A **model**, written from the documentation. It shows the rule, not the timings of the service.']
          },
          {
            say: 'Three remedies, from the best. Make the handler **idempotent**, so that ' + slow[4] + ' runs give one result. Let the client library **extend the deadline** while it works, which is the default. Or **raise the deadline** above the longest normal run. Do the first always, because the other two only make the repeat rarer.',
            tabs: [{ layer: 'RULE', name: 'Three remedies', c: 'raw', cols: ['Remedy', 'What it does', 'Is it enough?'], rows: [['An idempotent handler', 'Repeats change nothing', 'Yes'], ['Lease extension (client library)', 'Keeps the message while the work runs', 'Reduces repeats'], ['A longer ack deadline', 'Gives the handler more time', 'Reduces repeats']], trk: 0 }],
            notes: ['A push endpoint cannot extend the deadline: its time limit is the deadline, so its work must finish inside it.']
          }
        ]
      }),

      B.term({
        id: 'm7-fn-test', t: 1, src: 'rec', title: 'A function tested with real CloudEvents, and a copy with a bug',
        say: 'A Cloud Run function can be the consumer of a push subscription or an Eventarc trigger. I tested one with real CloudEvents through the Functions Framework, the same wrapper that Cloud Run runs. First the right code, then a copy that appends on every delivery.',
        lines: [].concat(
          term(PC, 'pytest -q test_main.py'),
          [{ c: 'dim', t: '# the same tests, against main_bug.py (it appends on every delivery)', d: 500 }],
          term(PB, 'FN_TARGET=main_bug pytest -q test_main.py')
        ),
        after: 'The right code passes all **' + FN.clean.passed + '** tests. The copy with the bug fails exactly **one**, the test that delivers the same message twice and counts the orders: it saw **2** instead of 1. The other three tests pass on the buggy copy, so a test that only sends one message would never have found it.',
        afterKind: 'tip',
        doneSay: 'The test that matters delivers the same message twice. Add it to every consumer you write.'
      }),

      B.code({
        id: 'm7-fn-code', t: 1, src: 'rec', title: 'The consumer: an idempotent write', file: 'main.py', lang: 'python', code: FM,
        steps: [
          { say: 'This is the function that passed the tests. It receives a CloudEvent that carries a Pub/Sub message. Press Next.', lines: null },
          { say: 'The decorator tells the Functions Framework that this is a **CloudEvent function**. The platform wraps the Pub/Sub message in the event, so the message is inside `cloud_event.data["message"]`.', lines: G.span(FM, /@functions_framework/, /def on_order/) },
          { say: 'The message data arrives **base64 encoded**. The function decodes it and reads the JSON of the order.', lines: G.span(FM, /message = /, /order = json/) },
          { say: 'A message with no order id is an **error**, and the function raises. The platform answers with a failure, and Pub/Sub delivers the message again, and with a dead letter policy, gives up after N tries. Swallowing the error would lose the order silently.', lines: G.span(FM, /if "order_id"/, /raise ValueError/) },
          { say: 'The write is keyed on the order id: the same order, the same row. Running this twice is the same as running it once. In BigQuery the same idea is a `MERGE` on the key.', lines: G.span(FM, /ORDERS\[order/) }
        ],
        note: 'Recorded: this file was tested with Functions Framework ' + G.meta('functions-framework') + ' and pytest ' + G.meta('pytest') + '. A dictionary stands in for the table.'
      }),

      B.code({
        id: 'm7-fn-test-code', t: 2, src: 'rec', title: 'The test that delivers the message twice', file: 'test_main.py', lang: 'python', code: FT,
        steps: [
          { say: 'Four tests, and one of them is the one to copy into every consumer. Press Next.', lines: null },
          { say: 'The helper builds a real CloudEvent in the shape that Pub/Sub sends: a type, a source, an id, and a `data` part with a base64 message and a message id.', lines: G.span(FT, /^def event_parts/, /return attrs, data/) },
          { say: 'This test **sends the same event twice** and checks that there is one order. It is the test that failed on the copy with the bug.', lines: G.span(FT, /^def test_the_same_message_twice/, /assert len/) },
          { say: 'A message with no order id must produce a **500**, so that Pub/Sub delivers it again. A plain JSON post, which is not a CloudEvent, must be refused with a 400.', lines: G.span(FT, /^def test_a_message_without/, /status_code == 500/) }
        ],
        note: 'A test client from the Functions Framework sends the events in-process. No network and no Google Cloud were involved.'
      }),

      B.talk({
        id: 'm7-ack', t: 1, src: 'docs', title: 'The acknowledgement deadline and how to live with it',
        say: 'Four rules about acknowledging, which are the difference between a pipeline that is quiet and one that is noisy. Press Next for each.',
        items: [
          ['Ack after the work', 'Never acknowledge on receipt. If you acknowledge first and the worker crashes, the message is gone and the work was never done. Do the work, store the result, then acknowledge.', 'First the work, then the ack.'],
          ['The deadline is a timer', 'The ack deadline starts when a message is delivered. The default is 10 seconds, and you can set it from 10 to 600 seconds. If it runs out, Pub/Sub delivers the message again. The client libraries **extend** it for you while your callback runs.', 'A timer, not a promise.'],
          ['A nack is a fast retry', 'A **nack** tells Pub/Sub to deliver the message again at once. It is right for a temporary failure of a dependency. For a message that can never succeed, a nack makes a hot loop, which is what a dead letter policy and a retry policy with a backoff are for.', 'Nack a temporary failure, dead-letter a permanent one.'],
          ['Flow control protects the worker', 'A worker that takes more messages than it can finish will let their deadlines run out. Limit the **outstanding messages** to what the worker can finish in the deadline.', 'Take what you can finish.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm7-dlq', t: 2, src: 'docs', title: 'Dead letters and the retry policy',
        say: 'Two settings make a bad message harmless. Press Next for each, and for the part that people forget.',
        items: [
          ['A dead letter topic', 'With a dead letter policy a message is moved to another topic after **N delivery attempts** (between 5 and 100). The rest of the subscription carries on. A person or a job reads the dead letter topic, fixes the cause, and publishes the message again.', 'A place for what cannot be processed.'],
          ['A retry policy', 'A **retry policy** makes Pub/Sub wait between deliveries, with an exponential backoff between a minimum and a maximum, for example 10 seconds to 10 minutes. Without it a failing message is delivered again at once.', 'Wait longer each time.'],
          ['Permissions', 'The Pub/Sub service agent of your project must be allowed to **publish** to the dead letter topic and to **acknowledge** on the subscription. Forgetting this means that dead lettering silently does not happen. Test it by sending a message that always fails.', 'Test the dead letter path before you need it.'],
          ['Watch it', 'Put an **alert** on the dead letter topic: any message there is a failure that a person must look at. A dead letter queue that nobody reads is a trash can.', 'An unread dead letter queue is a loss.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'In the model:', t: 'a message that always fails was delivered **' + poison[3] + ' times** in 60 simulated seconds with no limit, and exactly **' + dead[3] + '** times with a dead letter after 5. (The model has no backoff. The real service waits as the retry policy says.)' }
      }),

      B.talk({
        id: 'm7-order', t: 2, src: 'docs', title: 'Ordering keys, and what they cost',
        say: 'Some streams need order: an order that is created, paid and refunded must be read in that sequence. Pub/Sub offers it with a key, and a price. Press Next.',
        items: [
          ['How it works', 'You turn on **message ordering** on the subscription, **and** on the publisher, and you publish with an **ordering key**, for example the order id or the store id. Messages with the same key are delivered one at a time, in the order they were published. Different keys flow in parallel.', 'Order inside a key, not across keys.'],
          ['The cost: a failing message blocks its key', 'If the first message of a key keeps failing, the messages behind it **wait**. In the model, with a poison message at the head of the key s01, **' + blocked[1][3] + ' of the next messages were delivered** in 60 seconds, while the other key (s02) was not held up. A dead letter policy after 5 deliveries released the key.', 'One bad message can stop one key.'],
          ['Use it sparingly', 'Ordering limits throughput for each key and adds this blocking. Often a **version or a sequence number** in the message, with an idempotent consumer that keeps the highest version, gives the same correctness with no blocking.', 'A version in the data is often cheaper.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm7-eod', t: 2, src: 'docs', title: 'Exactly-once delivery: what it does and what it does not',
        say: 'Pub/Sub has an exactly-once delivery option, and it is easy to oversell. Press Next.',
        items: [
          ['What it promises', 'With **exactly-once delivery** on a subscription, a message that has been acknowledged is not delivered again, and the acknowledgement is **confirmed** to the client, so that you know whether it succeeded. It works inside one region, and the documentation limits it to some subscription types. Check which.', 'No redelivery after a confirmed ack.'],
          ['What it does not do', 'It does not make your **processing** exactly-once. If your worker stores the result and then fails before the ack is confirmed, the message comes back, and the work runs again. And the same business event can be **published** twice by the producer. Both need an idempotent consumer.', 'Delivery is not processing.'],
          ['When it is worth it', 'It helps when a repeat is expensive, and you want fewer of them: but you still design for one. Turn it on after the consumer is idempotent, not instead.', 'A reduction, not a replacement.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm7-replay', t: 2, src: 'docs', title: 'Replay: going back in time',
        say: 'A bug in a consumer is only half fixed until the messages it mishandled are processed again. Pub/Sub lets you go back. Press Next.',
        items: [
          ['Seek to a time', 'If a subscription **retains** messages (the retention period), you can **seek** it to a timestamp, and it delivers again everything from that moment. Fix the consumer, seek back to yesterday, and let it run.', 'Fix, seek back, rerun.'],
          ['Snapshots', 'A **snapshot** records the position of a subscription. Take one before a risky deploy, and seek to it if the deploy goes wrong.', 'A bookmark before a risky change.'],
          ['Why the raw layer still matters', 'Retention is days, not months. For a longer history, write every message to **Cloud Storage** (a Cloud Storage subscription does it) or to a raw table, and replay from there.', 'Pub/Sub is a buffer, not an archive.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'Replay needs idempotence:', t: 'a replay delivers messages that were already processed once. A consumer that is safe to repeat makes a replay a routine act.' }
      }),

      B.cmp({
        id: 'm7-kafka', t: 2, src: 'docs', title: 'Pub/Sub or Kafka',
        say: 'Job descriptions name Kafka as often as Pub/Sub, and some accept either. Here is the comparison that an interviewer expects. Press Next to read the pattern.',
        cols: ['Question', 'Pub/Sub', 'Apache Kafka'],
        hl: 1,
        rows: [
          ['Who runs it', 'Google, serverless', 'You, or a managed service (Google offers Managed Service for Apache Kafka, and other vendors offer their own)'],
          ['Scaling', 'Automatic', 'Partitions and brokers that you plan'],
          ['Order', 'Per ordering key, with a cost', 'Per partition, by design'],
          ['Replay', 'By retention time or snapshot, with limits', 'By offset, for as long as the topic retains it'],
          ['Consumers', 'Each subscription is independent, with acknowledgement per message', 'Consumer groups track offsets per partition'],
          ['Typical reasons to choose it', 'Fewest moving parts on Google Cloud, push and BigQuery subscriptions', 'You already run it, you need its connectors, or you need transactions and tight control of order and offsets']
        ],
        steps: [
          { upto: 3, say: 'Pub/Sub is serverless. Kafka gives you control and asks for operations, or a managed service.' },
          { upto: 6, say: 'The difference in consumers is the one that matters in design: acknowledgement for each message against an offset for each partition.' }
        ],
        pick: 'On Google Cloud with no Kafka history, **Pub/Sub** is the shorter road. If the company runs Kafka, the answer is usually to keep it and **bridge** it, with Dataflow or a connector, and not to rewrite the producers. I read that a Pub/Sub Lite shutdown was announced for 2026: check its status before you consider it.'
      }),

      B.code({
        id: 'm7-gcloud', t: 1, src: 'docs', title: 'Creating the topic and its subscription', file: 'create_pubsub.sh', lang: 'bash', code: GC,
        steps: [
          { say: 'This is how I would create the orders topic and its subscription from the command line. I checked that every flag exists in the help pages of the installed `gcloud`: ' + sub[1].split(' ').length + ' flags of the subscription command and ' + top[1].split(' ').length + ' of the topic command are found, none missing. I did not run it.', lines: null },
          { say: 'The topic keeps messages for seven days, which is what makes a replay of a week possible. A second topic is the dead letter topic.', lines: G.span(GC, /topics create pos-orders \\/, /topics create pos-orders-dead/) },
          { say: 'The subscription reads the orders topic. The ack deadline is 60 seconds, and message ordering is on.', lines: G.span(GC, /subscriptions create/, /enable-message-ordering/) },
          { say: 'After five deliveries a message goes to the dead letter topic. Between deliveries, Pub/Sub waits from 10 seconds up to 10 minutes.', lines: G.span(GC, /dead-letter-topic/, /max-retry-delay/) }
        ],
        note: 'The values match the subscription object of the earlier screen. In a team these resources belong in Terraform, with the dead letter permissions written next to them.'
      }),

      B.decide({
        id: 'm7-dec', t: 1, src: 'docs', title: 'Decision: how do the order events reach BigQuery?',
        scenario: 'The tills publish an order event to Pub/Sub. The warehouse needs each event as a row within a minute, as it is, with no transformation. The team has two engineers and runs nothing at night.',
        opts: [
          { t: 'A BigQuery subscription on the topic', d: 'Each message is written as a row. There is nothing to deploy or to run, and the dead letter and retry settings still apply.', lose: '' },
          { t: 'A Dataflow streaming job that reads the topic and writes to BigQuery', d: 'The most flexible: it can parse, clean and enrich.', lose: 'The events need no work, and a streaming job is something to deploy, monitor, update and pay for around the clock.' },
          { t: 'A Cloud Run function that inserts one row for each message', d: 'A few lines of code.', lose: 'One insert for each message is the slowest and costliest way to write to BigQuery, and the code must now be kept idempotent and scaled.' }
        ],
        pick: 0,
        why: 'The simplest way that meets the need wins. A BigQuery subscription writes the rows, and the raw layer can be cleaned by SQL afterwards, as mission 6 did. Add Dataflow only when the events need real work before they land.',
        when: 'If the events must be parsed, joined with reference data or filtered before landing, use Dataflow (mission 8).'
      }),

      B.bug({
        id: 'm7-bug', t: 1, q: 'A worker loses an order every time it crashes in the middle of a message. Click the line that causes it.',
        file: 'worker.py', lang: 'python', code: BUGACK, bad: [2],
        hint: 'When does the message leave the subscription?',
        why: 'The callback acknowledges the message **first**. Once acknowledged, the message is gone from the subscription. If the worker dies before `write_order` finishes, nobody will deliver the message again, and the order is lost. Do the work, store it safely, and acknowledge last.',
        fix: FIXACK,
        cheer: 'Ack after the work.'
      }),

      B.bug({
        id: 'm7-bug2', t: 2, q: 'The publisher fails as soon as it sends a message with an ordering key. The subscription has ordering turned on. Click the line to fix.',
        file: 'publish.py', lang: 'python', code: BUGORD, bad: [1],
        hint: 'Where is the ordering switched on for the publisher?',
        why: 'A publisher must be told that ordering is wanted, with a publisher option, or a message with an ordering key is refused. The subscription setting is the other half. The option exists in the library: in the recording `enable_message_ordering` was ' + MSG.enable_message_ordering + '.',
        fix: FIXORD,
        cheer: 'Turn ordering on for the publisher too.'
      }),

      B.incident({
        id: 'm7-inc', t: 1, src: 'rec', title: 'Incident: the backlog is growing', time: '14:10',
        alert: '**The orders subscription has 1.2 million unacknowledged messages and the oldest is 50 minutes old.** The warehouse is behind. The workers are running, with CPU almost idle. A deploy went out an hour ago.',
        clues: ['The oldest unacked message age is rising', 'The workers are idle but not acknowledging', 'Ordering is on, with the store as the key', 'The dead letter topic has no messages'],
        opts: [
          { t: 'Look at the subscription and the logs: a message at the head of an ordering key keeps failing and blocks its key. Fix or dead-letter it, and set a dead letter policy', fb: '' },
          { t: 'Add ten more workers', fb: 'The workers are idle. A blocked key does not move faster with more workers.' },
          { t: 'Delete the subscription and create it again', fb: 'You would lose the unacknowledged messages, which are the orders.' },
          { t: 'Raise the ack deadline to ten minutes', fb: 'It would make redelivery slower. It does not unblock a key.' }
        ],
        best: 0,
        why: 'Idle workers and a growing backlog point at messages that are not being delivered at all, which is what a blocked ordering key does. The model showed it: a poison message at the head of a key stops the messages behind it until it is acknowledged or dead-lettered.',
        checks: [
          ['Read the metrics', 'Oldest unacked message age, delivery attempts, and the number of messages per key.'],
          ['Find the head of the key', 'Check the logs for the message that fails on every delivery.'],
          ['Unblock', 'Fix the bug and let it succeed, or move that message to the dead letter topic.'],
          ['Prevent', 'A dead letter policy after N tries, an alert on the oldest unacked age, and a test with a message that always fails.']
        ],
        tell: 'The deploy changed the parser, and one order made it fail on every delivery. Because ordering is on, the messages behind it for that store waited, and the backlog grew while the workers were idle. I fixed the parser, added a dead letter policy after five tries, and an alert on the oldest unacked age.',
        prevent: ['A dead letter policy and a retry policy on every subscription', 'An alert on the age of the oldest unacknowledged message', 'A test that sends a message that always fails']
      }),

      B.quiz({
        id: 'm7-q1', t: 1,
        q: 'Pub/Sub delivers a message twice. Whose problem is it?',
        opts: [
          { t: 'The publisher\'s: it should not have sent it twice', fb: 'The delivery itself can repeat even when the publisher sent once.' },
          { t: 'The consumer\'s: it must give the same result for a repeat', fb: '' },
          { t: 'Nobody\'s: Pub/Sub deduplicates', fb: 'The service promises at least once. It does not promise once.' },
          { t: 'The network\'s', fb: 'A repeat can come from a timeout, a restart or a lost ack, and none of them is a fault that you can remove.' }
        ],
        ok: 1,
        why: 'At least once means a repeat is normal. An idempotent consumer, keyed on the business id, is the design that makes it harmless.'
      }),

      B.quiz({
        id: 'm7-q2', t: 1,
        q: 'When should a worker acknowledge a message?',
        opts: [
          { t: 'As soon as it receives it', fb: 'A crash after that loses the message.' },
          { t: 'After the work is done and the result is stored', fb: '' },
          { t: 'Never: the message expires by itself', fb: 'It would be delivered again until it expires.' },
          { t: 'Only when the publisher asks', fb: 'The publisher has no part in it.' }
        ],
        ok: 1,
        why: 'An ack means "I am done with this message". The work comes first.'
      }),

      B.quiz({
        id: 'm7-q3', t: 1,
        q: 'In the model, a handler needs 35 seconds with a 10 second deadline and no extension. How often does it run to the end?',
        opts: [
          { t: 'Once', fb: 'The message is delivered again while the first run works.' },
          { t: slow[4] + ' times', fb: '' },
          { t: 'Never', fb: 'It finishes each time. It simply starts too many times.' },
          { t: 'Twice', fb: 'The deliveries happen at 0, 10, 20 and 30 seconds, before the first run finishes at 35.' }
        ],
        ok: 1,
        why: 'Deliveries at 0, 10, 20 and 30 seconds start four runs, and the first acknowledgement comes at 35. A model, but the rule is from the documentation.'
      }),

      B.quiz({
        id: 'm7-q4', t: 2,
        q: 'A poison message sits at the head of an ordering key. What happens to the messages behind it?',
        opts: [
          { t: 'They are delivered in parallel', fb: 'Order forbids it.' },
          { t: 'They wait until the poison message is acknowledged or dead-lettered', fb: '' },
          { t: 'They are dropped', fb: 'They are held, not dropped.' },
          { t: 'They are delivered with a flag', fb: 'There is no such flag.' }
        ],
        ok: 1,
        why: 'In the model ' + blocked[1][3] + ' of them were delivered while the key was blocked. With a dead letter after 5, they flowed again.'
      }),

      B.quiz({
        id: 'm7-q5', t: 2,
        q: 'You turn on exactly-once delivery. Do you still need an idempotent consumer?',
        opts: [
          { t: 'No: that is what the option is for', fb: 'It covers delivery after a confirmed ack, not your processing.' },
          { t: 'Yes: a failure between your write and the confirmed ack still repeats the work, and the producer can publish twice', fb: '' },
          { t: 'Only for push subscriptions', fb: 'It is for every consumer.' },
          { t: 'Only in other regions', fb: 'Region does not remove the need.' }
        ],
        ok: 1,
        why: 'Exactly-once delivery reduces repeats. It does not make the business logic exactly-once.'
      }),

      B.order({
        id: 'm7-ord', t: 1, q: 'Put the handling of one message by a safe consumer in order.',
        items: [
          'Receive the message and read its id',
          'Decode and validate the payload',
          'Write the result keyed on the business id',
          'Acknowledge the message',
          'On a temporary failure, nack or let the deadline run out',
          'After N failures, the dead letter policy moves the message aside'
        ],
        why: 'Validate before you write. Keyed writes make a repeat harmless, and the ack comes only after the write. A temporary failure retries, and a permanent one ends up in the dead letter topic where a person can see it.'
      }),

      B.qa({
        id: 'qa-alo', t: 1, tag: 'Pub/Sub', secs: 75,
        q: 'Pub/Sub delivers at least once. How do you build a pipeline on it?',
        pts: ['A repeat is normal', 'Idempotent consumer keyed on the business id', 'Acknowledge after the work', 'Dead letter and retry policy', 'Test by delivering twice', 'Exactly-once delivery is an extra, not a replacement'],
        short: 'I treat a repeat as normal, and I make the consumer idempotent: it writes by the business key, for example with a `MERGE` on the order id, so that running twice gives the same result as running once. I acknowledge only after the work is done and stored, so a crash means a retry and not a loss.\n\nI add a dead letter policy and a retry policy with a backoff, so that a message that can never succeed is set aside and watched. And I test it: a test that delivers the same message twice, as my Cloud Run function test does. Exactly-once delivery is a reduction of repeats and is worth turning on later, but it never replaces an idempotent consumer.',
        fu: [['What if you cannot make it idempotent?', 'Keep a table of processed message ids and check it in the same transaction as the write.'], ['How do you handle a producer that publishes twice?', 'The business key makes the second one a no-op, which is why the key must come from the business and not from the message id.']],
        trap: 'Saying that Pub/Sub guarantees exactly once.',
        real: 'Describe how you found out that one of your consumers was not safe to repeat.'
      }),

      B.qa({
        id: 'qa-dlq', t: 2, tag: 'Pub/Sub', secs: 75,
        q: 'How do you handle messages that always fail?',
        pts: ['Dead letter topic after N attempts', 'Retry policy with backoff', 'Permissions of the Pub/Sub service agent', 'An alert on the dead letter topic', 'Find the cause, fix, and republish', 'Do not swallow errors'],
        short: 'I set a dead letter policy on the subscription so that after N delivery attempts, say five, the message moves to a dead letter topic and the rest of the stream continues. I add a retry policy with an exponential backoff, so a failing message does not spin. I make sure that the Pub/Sub service agent is allowed to publish to the dead letter topic and to acknowledge on the subscription, and I test the whole path with a message that always fails.\n\nThen I put an alert on the dead letter topic, because a queue that nobody reads is a loss. When a message lands there, a person finds the cause, fixes the code or the data, and republishes the message. And the consumer never swallows an error: it raises, so that the platform knows.',
        fu: [['What happens with ordering keys?', 'A failing message blocks its key until it is acknowledged or dead-lettered, so a dead letter policy is how an ordered stream gets unstuck.'], ['What goes into the dead letter message?', 'The original message and attributes, with the delivery attempt count. Include the error in your own logs.']],
        trap: 'Retrying for ever, or acknowledging a bad message to make the error disappear.',
        real: 'Tell me about a poison message that you met, and how it was found.'
      }),

      B.qa({
        id: 'qa-ord', t: 2, tag: 'Pub/Sub', secs: 75,
        q: 'You need the events of one order in order. How do you do it with Pub/Sub?',
        pts: ['Ordering key, on the publisher and the subscription', 'Order is per key and per region', 'A failing message blocks its key', 'Dead letter policy to unblock', 'Often a version number and an idempotent consumer is simpler', 'Order costs throughput'],
        short: 'I turn on message ordering on the subscription and on the publisher, and publish with an ordering key such as the order id. Messages with the same key are delivered one at a time in publish order, and different keys flow in parallel.\n\nThe cost is that a failing message blocks its key, so I add a dead letter policy, and ordering limits throughput for each key. Often I avoid it: I put a **version or a sequence number** in the message, and make the consumer keep the highest version for each order and ignore older ones. That gives the right final state without any blocking, and it also survives a replay.',
        fu: [['What breaks if the publisher forgets the option?', 'The publish call is refused for a message that has an ordering key.'], ['What is a good key?', 'The entity whose events must be ordered, such as the order id. A store id would put a lot of traffic on one key.']],
        trap: 'Using ordering by default, for every topic.',
        real: 'Describe a stream where order mattered and how you got it.'
      }),

      B.qa({
        id: 'qa-kafka', t: 2, tag: 'Pub/Sub', secs: 90,
        q: 'Pub/Sub or Kafka for a new streaming platform on Google Cloud?',
        pts: ['Serverless against operated', 'Order: key or partition', 'Replay: retention and snapshots or offsets', 'Consumers: acknowledgement or consumer groups', 'Existing skills and connectors', 'Bridge, do not rewrite'],
        short: 'On Google Cloud with no Kafka history I would choose Pub/Sub: it is serverless, scales without planning, and has push, BigQuery and Cloud Storage subscriptions that need no code. Kafka gives more control, with order by partition, replay by offset for as long as the topic retains it, consumer groups and transactions, and it costs operations, or a managed service such as Google\'s Managed Service for Apache Kafka.\n\nIf the company already runs Kafka, I keep it and bridge it into Google Cloud with Dataflow or a connector instead of rewriting producers. The consumers differ in design: acknowledgement for each message in Pub/Sub against an offset for each partition in Kafka, and I design the consumer for the one I use.',
        fu: [['When would you prefer Kafka?', 'When you need its connectors, strict control of partition order and offsets, transactions, or the company already runs it.'], ['What would you check about Pub/Sub Lite?', 'Its status: a shutdown was announced for 2026, so I would not start new work on it without checking.']],
        trap: 'Naming a winner without the context.',
        real: 'Tell me how you decided between two messaging systems.'
      }),

      B.recap({
        id: 'm7-recap', n: 7, badge: 'Stream Starter', color: '#FBCFE8',
        pts: [
          'Pub/Sub is **at least once**. A repeat is normal. An **idempotent consumer** keyed on the business id makes it harmless.',
          '**Acknowledge after the work.** The ack deadline is a timer. The client library extends it, and a push endpoint cannot.',
          'In the model a slow handler ran **' + slow[4] + ' times**, and a poison message was delivered **' + poison[3] + ' times** with no limit, **' + dead[3] + '** with a **dead letter after 5**.',
          'An **ordering key** gives order inside the key and **blocks** the key behind a failing message. A version number is often cheaper.',
          '**Exactly-once delivery** reduces repeats. It does not make your processing exactly-once.',
          'Use a **BigQuery subscription** first, **push to Cloud Run** for a little code, and **Dataflow** for real work. **Kafka** is the answer when the company already runs it.'
        ],
        lines: [
          'I deliver every message twice in my tests.',
          'I acknowledge last.',
          'I put a dead letter policy and an alert on every subscription.'
        ]
      })
    ]
  });
})();
