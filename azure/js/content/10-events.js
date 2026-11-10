/* Mission 10: events, queues and Functions. A new file starts work by itself.
   Recorded: the real Event Grid event parser of Azure (azure-eventgrid) on a BlobCreated event, a storage queue on Azurite (a storage emulator) with a
   visibility timeout, a dequeue count and a poison queue, and an Azure Functions handler with its pytest tests running against the emulator, once with
   a bug and once fixed. Event Grid delivery, the Functions hosting plans and the alerts come from the Azure documentation, and nothing here ran on
   Azure. */
(function () {
  var B = LAB.b, G = LAB.get;
  var EV = G.counts('eventgrid.parse'), FR = G.counts('functions.run'), TS = G.counts('test.summary'), QR = G.counts('queue.redrive'), QE = G.counts('queue.errors'), QD = G.counts('queue.delete');
  var HANDLER = G.file('func/handler.py'), EVENT = G.file('func/event.json');
  var PASS = G.text('test.pass'), FAIL = G.text('test.fail');
  function n0(n) { return Number(n).toLocaleString('en-US'); }
  function pickLines(text, re, max) { var l = text.split('\n').filter(function (x) { return re.test(x); }); return max ? l.slice(0, max) : l; }

  G.expect(EV.event_type === 'Microsoft.Storage.BlobCreated' && EV.subject_has_container_and_blob === true && EV.storage_event_types.length === 14 && EV.cloud_event.type === 'Microsoft.Storage.BlobCreated', 'the parser reads a BlobCreated event, and the SDK lists 14 storage event types');
  G.expect(FR.first.status === 'written' && FR.second.status === 'already done' && FR.first.orders === 3 && FR.first.revenue_eur === 19.5 && FR.split_subject.container === 'rawrun' && FR.split_subject.blob === 'orders/dt=2026-03-14/orders-0001.json', 'the handler writes once, and a repeated event finds the work already done');
  G.expect(TS.good.passed === 3 && TS.good.failed === 0 && TS.bug.passed === 2 && TS.bug.failed === 1 && TS.failing[0] === 'test_the_blob_name_keeps_its_folders', 'three tests pass, and the buggy handler fails the folder test');
  G.expect(QR.max_dequeue_count === 3 && QR.visibility_timeout_seconds === 1 && QR.timeline.length === 4 && QR.timeline[3].dequeue_count === 4 && QR.poison_body === 'order-7001' && QR.main_queue_after === 0 && QR.poison_queue_after === 1, 'a message is received four times and then moved to the poison queue');
  G.expect(QD.received_again_after_timeout === false && QE.stale_pop_receipt.code === 'PopReceiptMismatch' && QE.too_large.code === 'RequestBodyTooLarge' && QE.same_id_on_redelivery === true, 'a deleted message stays deleted, a stale pop receipt is refused, and the id is stable');
  G.expect(/orders\/dt=2026-03-14\/orders-0001.json/.test(EVENT) && /BlobCreated/.test(EVENT), 'the event file names the blob');
  G.expect(/failed/.test(FAIL) && /BlobNotFound/.test(FAIL) && /passed/.test(PASS), 'the failing run ends in BlobNotFound');

  var SUBJECTS = ['/blobServices/default/containers/raw/blobs/orders/dt=2026-03-14/orders-0001.json', '/blobServices/default/containers/raw/blobs/orders-0001.json', '/blobServices/default/containers/rawrun/blobs/orders/dt=2026-03-14/orders-0001.json'];
  function splitSubject(s) { var i = s.indexOf('/blobs/'), head = s.slice(0, i), name = s.slice(i + 7); return [head.slice(head.lastIndexOf('/') + 1), name]; }
  G.expect(splitSubject(SUBJECTS[2]).join('|') === FR.split_subject.container + '|' + FR.split_subject.blob, 'the split of the subject matches the recorded one');

  var WORKER = [
    'from azure.storage.queue import QueueServiceClient',
    '',
    'service = QueueServiceClient(account_url=QUEUE_URL, credential=DefaultAzureCredential())',
    'queue = service.get_queue_client("orders")',
    'poison = service.get_queue_client("orders-poison")',
    'MAX_TRIES = 3',
    '',
    'for message in queue.receive_messages(visibility_timeout=300):',
    '    if message.dequeue_count > MAX_TRIES:',
    '        poison.send_message(message.content)       # a client does the dead-letter step',
    '        queue.delete_message(message)',
    '        continue',
    '    handle(message.content)                        # must be safe to repeat',
    '    queue.delete_message(message)                  # only after the work succeeded'
  ].join('\n');

  var BUG_SPLIT = [
    'def split_subject(subject):',
    '    parts = subject.split("/")',
    '    return parts[4], parts[-1]'
  ].join('\n');
  var FIX_SPLIT = [
    'def split_subject(subject):',
    '    head, _, name = subject.partition("/blobs/")',
    '    return head.rsplit("/", 1)[-1], name'
  ].join('\n');

  var BUG_DELETE = [
    'for message in queue.receive_messages(visibility_timeout=300):',
    '    queue.delete_message(message)',
    '    handle(message.content)'
  ].join('\n');
  var FIX_DELETE = [
    'for message in queue.receive_messages(visibility_timeout=300):',
    '    handle(message.content)',
    '    queue.delete_message(message)'
  ].join('\n');

  var TYPE_GROUPS = [
    [/BlobCreated|BlobDeleted|BlobRenamed/, 'file changes'],
    [/DirectoryCreated|DirectoryDeleted|DirectoryRenamed/, 'folder changes (hierarchical namespace)'],
    [/BlobTierChanged|LifecyclePolicyCompleted|BlobInventoryPolicyCompleted|AsyncOperationInitiated/, 'tiers and housekeeping'],
    [/StorageTask/, 'storage tasks']
  ];
  function groupOf(t) { for (var i = 0; i < TYPE_GROUPS.length; i++) if (TYPE_GROUPS[i][0].test(t)) return TYPE_GROUPS[i][1]; return 'other'; }
  var TYPE_ROWS = EV.storage_event_types.map(function (t) { return [t.replace('Microsoft.Storage.', ''), groupOf(t)]; }).sort(function (a, b) { return a[1] === b[1] ? (a[0] < b[0] ? -1 : 1) : (a[1] < b[1] ? -1 : 1); });

  function testLines() {
    return [{ c: 'dim', t: '# the handler with a bug in split_subject, and three tests against the storage emulator', d: 350 }, { c: 'cmd', t: '$ pytest -q', d: 500 }]
      .concat(pickLines(FAIL, /^\.\.F/, 1).map(function (l) { return { c: 'out', t: l, d: 150 }; }))
      .concat(pickLines(FAIL, /^_{5,} test_/, 1).map(function (l) { return { c: 'err', t: l, d: 100 }; }))
      .concat(pickLines(FAIL, /^>       out = lake\.process/, 1).map(function (l) { return { c: 'err', t: l, d: 100 }; }))
      .concat(pickLines(FAIL, /^E +azure\.core\.exceptions\.ResourceNotFoundError|^E +ErrorCode:BlobNotFound/).map(function (l) { return { c: 'err', t: l, d: 100 }; }))
      .concat(pickLines(FAIL, /^(PASSED|FAILED) /).map(function (l) { return { c: /^FAILED/.test(l) ? 'err' : 'out', t: l, d: 110 }; }))
      .concat([{ c: 'err', t: TS.bug.failed + ' failed, ' + TS.bug.passed + ' passed', d: 200 },
        { c: 'dim', t: '# the same tests after the fix', d: 500 }, { c: 'cmd', t: '$ pytest -q', d: 500 }])
      .concat(pickLines(PASS, /^\.\.\./, 1).map(function (l) { return { c: 'out', t: l, d: 150 }; }))
      .concat(pickLines(PASS, /^PASSED /).map(function (l) { return { c: 'ok', t: l, d: 110 }; }))
      .concat([{ c: 'ok', t: TS.good.passed + ' passed', d: 200 }]);
  }

  LAB.addChapter({
    id: 'm10', n: 10, title: 'Events, queues and Functions', short: 'Events and Functions', blurb: 'Event Grid, storage queues, poison messages, and an Azure Function that is tested before it ships', minutes: 48,
    focus: ['snap', 'air', 'ci'],
    goals: [
      'Choose between **Event Grid, Event Hubs, Service Bus and storage queues**.',
      'Read a **BlobCreated event**, and know why Data Lake accounts raise two.',
      'Explain **visibility timeout, dequeue count, pop receipt and poison queue**.',
      'Write a **Function handler** that is safe to repeat, and **test it** against an emulator.',
      'Say what happens when **delivery fails**, and where the failed message goes.',
      'Design a load that starts **by itself** when a file lands.'
    ],
    say: 'Mission 10 is how a new file starts work by itself. I recorded the parts that run on a laptop: the real Azure parser reading a BlobCreated event, a queue where a message hides, comes back and is moved aside after three tries, and an Azure Functions handler with its tests, once with a bug and once fixed. Event Grid delivery, Functions hosting and alerts come from the documentation, and the screens say so.',
    scenes: [
      B.flow({
        id: 'm10-flow', t: 1, src: 'docs', title: 'A file lands and work starts by itself', g: 'events', legend: true,
        steps: [
          { say: 'A producer drops a file in the raw container, and nobody presses a button. Press Next to follow the event through Azure, and watch for where a message can be lost.', cap: 'No clock, no person.' },
          { say: 'Step 1. Storage raises a BlobCreated event and hands it to Event Grid. An event is a small fact: which blob, in which container, and what happened.', on: ['v1'], focus: ['sa', 'eg'], cap: 'Storage announces the file.' },
          { say: 'Step 2. An Event Grid subscription filters the events, here to the folder `raw/orders/`, and delivers the matching ones to a storage queue. The queue holds them until a reader is ready.', on: ['v2'], focus: ['eg', 'q'], cap: 'A filter and a buffer.' },
          { say: 'Step 3. A Function reads a batch of messages from the queue. It runs only when there is something to do, and you pay for the run.', on: ['v3'], focus: ['q', 'fn'], cap: 'A Function does the work.' },
          { say: 'Step 4. The Function starts a Data Factory pipeline for the new file, and does not wait for it. Mission 5 explained why a script must not report success when it only started a run.', on: ['v4'], focus: ['fn', 'pl'], cap: 'The pipeline does the heavy part.' },
          { say: 'Step 5. A message that fails again and again is not tried for ever. After a number of tries it moves to a poison queue, where it waits for a person.', on: ['v5'], focus: ['q', 'pq'], cap: 'Failed messages move aside.' },
          { say: 'Step 6. An alert watches the poison queue, and an action group sends an email or a chat message when it is not empty. Silence would hide the failure.', on: ['v6', 'v7'], focus: ['pq', 'al', 'ag'], cap: 'A person hears about it.' },
          { say: 'The same event can arrive twice, and a message can be read twice. So every step that does work must be safe to repeat. That is the rule behind the whole picture.', focus: ['idem'], cap: 'Safe to repeat, at every step.' }
        ]
      }),

      B.cmp({
        id: 'm10-compare', t: 1, src: 'docs', title: 'Event Grid, Event Hubs, Service Bus or a queue?',
        say: 'Azure has four services that carry messages, and they are easy to mix up. Press Next to compare them. The question to ask is what the message is: a fact, a stream, a command or a job.',
        cols: ['Service', 'Model', 'Good for', 'Watch for'],
        hl: 1,
        rows: [
          ['Event Grid', 'Pushes small events to handlers: something happened', 'react to a blob created, a resource changed, a custom event', 'At least once, no order, and it is not for high-volume telemetry.'],
          ['Event Hubs', 'A partitioned log that readers read at their own pace', 'a stream of clicks, telemetry or change events, with replay', 'No per-message acknowledgement. Order only inside a partition.'],
          ['Service Bus', 'Queues and topics with sessions, dead-letter queues and transactions', 'business messages and commands that must be handled once, in order if needed', 'More features and a lower ceiling on volume than Event Hubs.'],
          ['Storage queue', 'A simple, cheap queue of small messages', 'a basic work list, or a buffer in front of a Function', 'No built-in dead-letter queue, no topics, and messages are limited to 64 KB.']
        ],
        steps: [
          { upto: 2, say: 'Facts and streams. Event Grid tells you that something happened. Event Hubs keeps a flow of events that you read when you are ready.' },
          { upto: 4, say: 'Commands and jobs. Service Bus is the full-featured broker, and a storage queue is the plain list that is often enough.' }
        ],
        pick: 'Use **Event Grid** to react to a file, **Event Hubs** for a stream, **Service Bus** for business messages that need dead-lettering or order, and a **storage queue** when a plain buffer is enough.'
      }),

      B.code({
        id: 'm10-event', t: 1, src: 'rec', title: 'A BlobCreated event', file: 'blob_created.json', lang: 'json', code: EVENT,
        steps: [
          { say: 'This is a BlobCreated event as the Event Grid schema defines it. Event Grid sends events in an array. I put it through the real parser of Azure, and it read the type, the subject and the data without complaint.', lines: null },
          { say: 'The topic names the source: the storage account that raised the event.', lines: G.span(EVENT, /"topic"/) },
          { say: 'The subject names the blob. The container is the part before `/blobs/`, and the blob name is everything after it. A blob name can contain slashes, so a handler must not split the subject on every slash.', lines: G.span(EVENT, /"subject"/) },
          { say: 'The event type says what happened. A subscription can filter on it, so that a pipeline hears only about created blobs.', lines: G.span(EVENT, /"eventType"/) },
          { say: 'The data carries the details: the operation that made the blob, its size, its type, its URL and an ETag. Note `api`: it tells a finished upload from the start of one, as the next screens explain.', lines: G.span(EVENT, /"data": \{/, /^    \},?$/) },
          { say: 'Each event has its own id and a time. The id is how a handler can tell that it has seen an event before, since delivery is at least once.', lines: G.span(EVENT, /"id"/) }
        ],
        note: 'The file is the event of the azure-eventgrid test: its parser read the type `' + EV.event_type + '`, and found a container and a blob in the subject. The shape follows the documented schema of Blob Storage events. The sample says `PutBlob`, as an account without a hierarchical namespace would.'
      }),

      B.rows({
        id: 'm10-types', t: 1, src: 'rec', title: 'The events that storage can raise',
        steps: [
          {
            say: 'The Azure SDK lists ' + EV.storage_event_types.length + ' event types for Blob Storage. Pipelines mostly use the first two groups: a file that is created, deleted or renamed, and the same for folders in a Data Lake account. The rest report housekeeping.',
            tabs: [{ layer: 'EVENT TYPES', name: 'Microsoft.Storage.* events in the Azure SDK', c: 'snap', cols: ['event type', 'group'], rows: TYPE_ROWS, trk: 0 }],
            notes: ['The names come from the list of storage events in the azure-eventgrid library ' + G.meta('azure-eventgrid') + '. The groups are mine. Check the current page for the list, since new types are added.']
          }
        ]
      }),

      B.talk({
        id: 'm10-hns', t: 1, src: 'docs', title: 'Data Lake accounts raise two events for one file',
        say: 'On an account with a hierarchical namespace, a file is written in steps. Press Next for what that does to your trigger.',
        items: [
          ['Two operations', 'A client that writes through the Data Lake API creates the file first, with `CreateFile`, and then commits the data with `FlushWithClose`. Both raise a BlobCreated event. The first one is for a file with no data in it yet.', 'The file exists before it has data.'],
          ['The filter', 'To react only to finished files, filter on `data.api` and keep `FlushWithClose`. A storage event trigger in Data Factory has an option to ignore empty blobs for the same reason.', 'Keep the commit, skip the start.'],
          ['A flat account is different', 'On an account without a hierarchical namespace the finished upload raises one event, and its `api` is `PutBlob` or `PutBlockList`. A filter that lists only `FlushWithClose` would miss every event.', 'Match the filter to the account.'],
          ['An interrupted upload', 'If a transfer is cut off, there may be a `CreateFile` event and never a `FlushWithClose`. A load that waits for the commit never starts, which is right. A load that starts on the first event reads an empty file.', 'A missing second event is a safe failure.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm10-delivery', t: 1, src: 'docs', title: 'How Event Grid delivers, and when it gives up',
        say: 'Event Grid tries hard, and not for ever. Press Next for the rules that decide whether you can lose an event.',
        items: [
          ['At least once', 'An event is delivered at least once. A handler can get the same event twice, and events can arrive out of order. Your code must cope with both.', 'Duplicates are normal.'],
          ['Retries', 'When a handler fails or is slow, Event Grid retries with an exponential backoff, starting at about ten seconds, with a little randomness. A retry policy sets how many attempts, and for how long; the defaults are up to 30 attempts over 24 hours, and you can change both.', 'It retries on a schedule, then stops.'],
          ['Dead-letter storage', 'You can name a blob container as the dead-letter location. An event that cannot be delivered, within the limits, is written there. Without it the event is dropped, so set it for anything that matters.', 'Say where failed events go.'],
          ['Filters', 'A subscription can filter on the event type, on the start and end of the subject, and on fields of the data. A filter on the subject such as `/blobServices/default/containers/raw/blobs/orders/` keeps the traffic to one folder.', 'Filter early, and cheaply.'],
          ['A queue in front', 'Delivering to a storage queue means the handler can be down for a while and nothing is lost: the queue keeps the message until a reader comes. The reader then controls its own pace.', 'A buffer decouples the speed of the two sides.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'Check the defaults.', t: 'The numbers of the retry policy can change, and they can be set for each subscription. Read the delivery and retry page of Event Grid before you rely on a number.' }
      }),

      B.widget({ id: 'm10-queue-lab', kind: 'queue', t: 1, src: 'rec', title: 'Lab: a message that keeps failing' }),

      B.code({
        id: 'm10-worker', t: 1, src: 'rec', title: 'A queue worker with a poison queue', file: 'worker.py', lang: 'python', code: WORKER,
        steps: [
          { say: 'This is the loop that the lab recorded, written as a worker. A storage queue has no dead-letter queue of its own, so the worker moves a failing message aside itself. Press Next.', lines: null },
          { say: 'Two clients: the work queue and a poison queue, named after it. `MAX_TRIES` is the limit of tries. The lab used 3.', lines: G.span(WORKER, /^queue = /, /^MAX_TRIES/) },
          { say: '`receive_messages` hands out messages, and each one is hidden from other readers for the visibility timeout. If this worker does nothing more, the message comes back after the timeout, with its dequeue count raised by one.', lines: G.span(WORKER, /^for message in/) },
          { say: 'The dequeue count says how many times the message was handed out. Over the limit, the worker copies it to the poison queue, deletes it from the work queue, and moves on. In the lab that happened on the ' + QR.timeline[3].dequeue_count + 'th receive.', lines: G.span(WORKER, /^    if message.dequeue_count/, /continue/) },
          { say: 'The work comes first, and the delete comes after it. A worker that crashes in `handle` never reaches the delete, so the message returns and is tried again. That is the whole retry mechanism.', lines: G.span(WORKER, /^    handle/, /^    queue.delete_message\(message\)  /) }
        ],
        note: 'The calls are those of the recorded run, with azure-storage-queue ' + G.meta('azure-storage-queue') + ' against Azurite. This loop is an arrangement of them, and was not run against a real account. The recorded visibility timeout was one second, so that the run was short, and a worker would use minutes.'
      }),

      B.talk({
        id: 'm10-poison', t: 1, src: 'docs', title: 'Poison messages in Azure Functions',
        say: 'You do not have to write the loop yourself when a Function reads the queue. Press Next for what the runtime does.',
        items: [
          ['The trigger', 'A queue trigger reads messages in batches and calls your function for each. When the function succeeds, the runtime deletes the message. When it throws an error, the message returns to the queue after a delay.', 'Success deletes. An error retries.'],
          ['The limit', 'After `maxDequeueCount` tries, which is 5 by default, the runtime moves the message to a queue named like the original with `-poison` added. The setting is in `host.json` and applies to every queue function of the app.', 'Five tries, then the poison queue.'],
          ['What to do with poison', 'Alert when the poison queue is not empty. Find the cause, fix it, and then move the messages back to the work queue, so the load runs again. Deleting them silently loses files.', 'Fix first, then replay.'],
          ['Other triggers', 'An Event Grid trigger relies on the retries and the dead-letter location of Event Grid. An Event Hubs trigger relies on checkpoints, as in mission 9. Each trigger has its own way to fail, so read the page of the one that you use.', 'Each trigger has its own rules.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm10-func', t: 1, src: 'docs', title: 'Azure Functions for data engineers',
        say: 'A Function is a small piece of code that runs when something happens. Press Next for what you need to know before you write one.',
        items: [
          ['Triggers and bindings', 'A trigger starts the function: an Event Grid event, a queue message, a timer, an HTTP call, or events from an event hub. A binding connects it to data without client code. In Python the decorators of the v2 model, such as `@app.event_grid_trigger`, declare both.', 'What starts it, and what it touches.'],
          ['Identity', 'A function app has a managed identity. The code signs in with `DefaultAzureCredential`, and you give that identity roles on the lake and the queues, as in mission 3. No connection string, no key.', 'Sign in as the app.'],
          ['Hosting plans', 'The Consumption plan scales to zero and bills per run. Microsoft has announced a retirement date for the Linux Consumption plan, and points new serverless apps to Flex Consumption. A Premium plan keeps instances warm and supports containers. Read the current page before you choose.', 'Pick the plan on purpose.'],
          ['Short and light', 'A function should be short. A long job belongs in Data Factory or Spark, and the function should start it and return. Mission 5 showed the trap of a script that waits for a long run.', 'Start the work, never wait for it.'],
          ['Test it', 'A handler is plain Python. You can call it from pytest with a made-up event and a storage emulator, and know that it works before it ships. The next screens do exactly that.', 'Test the logic away from Azure.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm10-handler', t: 1, src: 'rec', title: 'A handler for a new order file', file: 'handler.py', lang: 'python', code: HANDLER,
        steps: [
          { say: 'This is the Function that the tests ran. When a raw order file lands, it writes a small summary next to the curated data. Two details make it safe in production. Press Next.', lines: null },
          { say: 'The lake client. In Azure it signs in as the managed identity of the function app. The tests set a connection and talk to the storage emulator, so the same code runs in both places.', lines: G.span(HANDLER, /^def lake/, /DefaultAzureCredential\(\)\)$/) },
          { say: 'Detail one: the subject. The blob name is everything after `/blobs/`, and it can contain slashes. The function splits at that marker, and takes the container from the part before it.', lines: G.span(HANDLER, /^def split_subject/, /return head/) },
          { say: 'The summary skips cancelled orders. In the recording, three orders gave a revenue of ' + FR.first.revenue_eur.toFixed(2) + ' euro.', lines: G.span(HANDLER, /^def summarize/, /return \{"orders"/) },
          { say: 'Detail two: the write is safe to repeat. `overwrite=False` makes the upload fail if the summary exists, and the code catches that failure and calls it "already done". The first run said "' + FR.first.status + '", and the second said "' + FR.second.status + '".', lines: G.span(HANDLER, /^    try:/, /status = "already done"/) },
          { say: 'The last lines register the function. The decorator says that an Event Grid event starts it, and the handler calls `process`.', lines: G.span(HANDLER, /^app = func.FunctionApp/, /process\(event\)/) }
        ],
        note: 'The file is `azure/verify/funcproj/handler.py`. It uses the azure-functions library ' + G.meta('azure-functions') + ', and was run only through its tests: the Functions runtime itself was not started.'
      }),

      B.term({
        id: 'm10-tests', t: 1, src: 'rec', title: 'Test the handler before it ships',
        say: 'Here are the three tests of the handler. First they run against a version with a bug in the subject split, and then against the fixed one. Watch the failure: it names the exact problem.',
        lines: testLines(),
        after: 'The tests call `process` with a made-up Event Grid event and a real storage client that talks to **Azurite**. The first test checks the summary, the second sends the same event twice and expects "written" and then "already done", and the third uses a blob with folders in its name. The bug kept only the last part of the path, so the function looked for a blob that did not exist and got **BlobNotFound**.',
        afterKind: 'tip',
        doneSay: 'A failing test in your terminal costs a minute. The same bug in production costs a night of missing summaries.'
      }),

      B.talk({
        id: 'm10-idem', t: 1, src: 'rec', title: 'A handler that is safe to repeat',
        say: 'Events and messages arrive at least once, so a handler must tolerate a repeat. Press Next for three ways that the recording shows or supports.',
        items: [
          ['Refuse to overwrite', 'The handler writes its summary with `overwrite=False`. The first event wrote it, and the second found it: **"' + FR.first.status + '"** and then **"' + FR.second.status + '"**, with the same ' + FR.first.orders + ' orders and ' + FR.first.revenue_eur.toFixed(2) + ' euro. This is the conditional write of mission 2 used as a lock.', 'The second run does nothing.'],
          ['A name from the event', 'The summary is named after the blob: `' + FR.summary_blob + '`. The same file always gives the same name, so a repeat finds the same target. A random name would make every repeat a new file.', 'The name carries the identity.'],
          ['Merge by key', 'When the target is a table, use a merge by the key, as in mission 5. A repeat updates a row with the values that it already has.', 'Upsert, not insert.']
        ],
        cols: 1
      }),

      B.challenge({
        id: 'm10-ch', t: 2, title: 'Coding round: split an event subject', file: 'split_subject.py', lang: 'python',
        q: 'The Function receives the subject of an Event Grid event. **Write `split_subject(subject)`, which returns the container and the blob name.** The blob name keeps its folders, and a subject can name a blob in a folder or at the top of the container.',
        data: [{ name: 'subjects that the function receives', cols: ['subject'], rows: SUBJECTS.map(function (s) { return [s]; }) }],
        starter: 'def split_subject(subject):\n    ...\n    return container, name',
        hints: ['The blob name is everything after the text `/blobs/`.', 'The container is the last part of what comes before it.', '`str.partition` splits at the first match, and `rsplit("/", 1)` takes the last part of a path.'],
        sol: FIX_SPLIT,
        res: { msg: 'the three subjects, split', cols: ['container', 'name'], rows: SUBJECTS.map(splitSubject) },
        expl: ['`subject.partition("/blobs/")` splits the text in three: what comes before the marker, the marker, and what comes after. The part after is the whole blob name, slashes included.', '`head.rsplit("/", 1)[-1]` takes the last part of the path before the marker, which is the container.', 'A handler that splits on every slash and takes the last piece gets `orders-0001.json` for a blob in a folder, and asks for a blob that does not exist. The recorded test fails with **BlobNotFound** for that reason.', 'The third subject is the one the recording used, with the container `' + FR.split_subject.container + '` and the same blob name.'],
        cx: 'One scan of a short string. The cost is nothing. The risk is a wrong assumption about the shape of the subject, which a test catches.'
      }),

      B.decide({
        id: 'm10-dec', t: 2, src: 'docs', title: 'Decision: how should a burst of files start the load?',
        scenario: 'A partner uploads **up to 5,000 small files** in ten minutes, several times a day. Each file must be processed **once**, in the same way. A Data Factory pipeline run for each file would flood the factory, and every run bills its activities.',
        opts: [
          { t: 'A storage event trigger on the container, so that every file starts a pipeline run', d: 'The simplest setup, with nothing to run yourself.', lose: 'A burst of 5,000 files means 5,000 pipeline runs at once. The factory queues and throttles them, and every run is billed.' },
          { t: 'Event Grid to a storage queue, and a Function that reads batches of messages and starts one run for each date folder, with a poison queue and an alert', d: 'The queue absorbs the burst. The Function groups the files, so there is one run for each folder, and every step is safe to repeat.' },
          { t: 'A schedule trigger every minute that lists the container', d: 'No Event Grid, no queue.', lose: 'It lists the container again and again, runs late, and has no record of which files it has already handled.' }
        ],
        pick: 1,
        why: 'The queue decouples the speed of the partner from the speed of the factory, and a Function can look at a batch of messages and decide what to start. One run for each date folder replaces thousands of runs. Duplicates are harmless because the run and the handler are safe to repeat, and the poison queue with an alert shows the files that could not be handled.',
        when: 'If files arrive one at a time and rarely, a storage event trigger in Data Factory is simpler and enough. Add the queue and the Function when bursts, grouping or special rules appear.'
      }),

      B.quiz({
        id: 'm10-q1', t: 1,
        q: 'Which service pushes a small event, such as a blob was created, to a handler?',
        opts: [
          { t: 'Event Hubs', fb: 'It keeps a stream that readers pull, with replay.' },
          { t: 'Event Grid', fb: '' },
          { t: 'A storage queue', fb: 'A queue holds messages for a reader to pull.' },
          { t: 'Service Bus topics only', fb: 'Service Bus brokers business messages. It is not the source of storage events.' }
        ],
        ok: 1, why: 'Event Grid pushes discrete events to handlers such as a Function, a webhook or a queue. Event Hubs is for streams that are read at the pace of the reader.'
      }),

      B.quiz({
        id: 'm10-q2', t: 1,
        q: 'A worker receives a message and crashes before it deletes it. What does the queue do?',
        opts: [
          { t: 'The message is lost', fb: 'It was only hidden, not deleted.' },
          { t: 'The message becomes visible again after the visibility timeout, with a higher dequeue count', fb: '' },
          { t: 'The message moves to a poison queue at once', fb: 'A storage queue has no automatic poison queue. A client or the Functions runtime does that.' },
          { t: 'The message is deleted by the service', fb: 'Only a delete call removes it.' }
        ],
        ok: 1, why: 'The lab shows it: the message came back after the timeout with the count raised, ' + QR.timeline.slice(0, 3).map(function (e) { return e.dequeue_count; }).join(', ') + ', and was moved aside by the client on receive number ' + QR.timeline[3].dequeue_count + '.'
      }),

      B.quiz({
        id: 'm10-q3', t: 1,
        q: 'What does a pop receipt do?',
        opts: [
          { t: 'It proves that you hold the latest copy of a message, so only you can delete or update it', fb: '' },
          { t: 'It stores the body of the message', fb: 'The body is separate.' },
          { t: 'It counts the tries', fb: 'The dequeue count does that.' },
          { t: 'It sets the visibility timeout', fb: 'You pass the timeout to the receive call.' }
        ],
        ok: 0, why: 'Each receive hands back a new pop receipt. In the recording, deleting with an old one was refused with `' + QE.stale_pop_receipt.code + '` (HTTP ' + QE.stale_pop_receipt.status + '), because the message had been received again since.'
      }),

      B.quiz({
        id: 'm10-q4', t: 1,
        q: 'Why must the delete come after the work in a queue worker?',
        opts: [
          { t: 'A worker that deletes first and then crashes loses the message', fb: '' },
          { t: 'The queue refuses a delete before the work is done', fb: 'The queue does not know about your work.' },
          { t: 'Deleting first makes the message invisible for longer', fb: 'Visibility is set by the timeout.' },
          { t: 'It makes no difference', fb: 'It decides whether a crash loses data.' }
        ],
        ok: 0, why: 'If the delete comes first, a crash leaves nothing to retry, and the file is never handled. With the delete last, a crash returns the message to the queue and another try follows. A deleted message stays deleted: in the recording it was not received again.'
      }),

      B.quiz({
        id: 'm10-q5', t: 2,
        q: 'A Data Lake account raises two BlobCreated events for each upload. Which filter reacts only to the finished file?',
        opts: [
          { t: '`data.api` equals `FlushWithClose`', fb: '' },
          { t: '`data.api` equals `CreateFile`', fb: 'That event is raised when the file is created, before it has data.' },
          { t: 'The event type equals BlobDeleted', fb: 'That is the delete event.' },
          { t: 'The subject ends with a slash', fb: 'A subject names a blob. A slash at the end names a folder.' }
        ],
        ok: 0, why: '`CreateFile` makes the file with no data, and `FlushWithClose` commits the data. Filter on the second one. On an account with a flat namespace, the finished upload has a different `api`, such as `PutBlob`, so match the filter to the account.'
      }),

      B.quiz({
        id: 'm10-q6', t: 1,
        q: 'The first run of the handler wrote the summary. The same event arrives again. What does the recorded handler return?',
        opts: [
          { t: 'An error, because the summary exists', fb: 'It catches that error on purpose.' },
          { t: '"' + FR.second.status + '", and it writes nothing', fb: '' },
          { t: '"written", with a second copy of the summary', fb: '`overwrite=False` prevents a second copy.' },
          { t: 'It deletes the first summary and writes a new one', fb: 'It never deletes.' }
        ],
        ok: 1, why: 'The upload with `overwrite=False` fails when the blob exists, and the handler turns that failure into "' + FR.second.status + '". The first call said "' + FR.first.status + '". That is what safe to repeat looks like in code.'
      }),

      B.order({
        id: 'm10-ord', t: 1, q: 'Put the life of one file in order.',
        items: [
          'A producer writes the blob to the raw container',
          'Storage raises a BlobCreated event',
          'Event Grid filters it and delivers it to a storage queue',
          'A Function reads the message, and the queue hides it',
          'The handler checks whether the work was already done',
          'The handler writes its result and starts the pipeline',
          'The Function deletes the message from the queue'
        ],
        why: 'The event follows the file, and the filter keeps only what matters before it reaches the queue. The reader hides the message while it works, checks first, because the event may be a repeat, then does the work. The delete is last, so a crash anywhere before it leads to a retry.'
      }),

      B.bug({
        id: 'm10-bug', t: 1, src: 'rec', q: 'For a blob in a folder, the function fails with BlobNotFound. Click the line that causes it.',
        file: 'handler.py', lang: 'python', code: BUG_SPLIT, bad: [3],
        hint: 'What does `parts[-1]` return for a blob with folders in its name?',
        why: '`parts[-1]` is the last piece after the last slash, so `orders/dt=2026-03-14/orders-0002.json` becomes `orders-0002.json`. The function then asks for a blob that is not there. The recorded test fails with exactly that: **BlobNotFound**. Split at `/blobs/` and keep everything after it.',
        fix: FIX_SPLIT,
        cheer: 'A blob name can contain slashes.'
      }),

      B.bug({
        id: 'm10-bug2', t: 1, src: 'docs', q: 'Some files are never handled after a crash, and nobody knows. Click the line that loses them.',
        file: 'worker.py', lang: 'python', code: BUG_DELETE, bad: [2],
        hint: 'What is left in the queue if the worker dies on the next line?',
        why: 'The message is deleted before the work. If the worker crashes in `handle`, the message is gone and nothing will try again. Do the work first and delete after it, and a crash returns the message to the queue after the visibility timeout.',
        fix: FIX_DELETE,
        cheer: 'Work first, delete after.'
      }),

      B.incident({
        id: 'm10-inc', t: 2, src: 'rec', title: 'Incident: the load started twice for one file', time: '09:05',
        alert: '**Finance sees every order of the 14 March file counted twice in the daily summary.** The file `orders-0001.json` landed once. The log of the Function shows two executions for the same blob, a few seconds apart. The function appends its result to a table with a plain insert.',
        clues: ['The two executions have the same event id', 'Event Grid delivers at least once', 'The function inserts without checking'],
        opts: [
          { t: 'Make the handler safe to repeat: refuse to overwrite, or merge by the blob name or the event id, and clean up the duplicate rows', fb: '' },
          { t: 'Ask Event Grid to deliver exactly once', fb: 'There is no such setting. Delivery is at least once.' },
          { t: 'Turn off retries on the subscription', fb: 'It removes the duplicates sometimes and loses events whenever a handler is slow.' },
          { t: 'Run the function on a single instance so that it cannot overlap', fb: 'Duplicates also come from retries after a timeout, and a single instance does not prevent those.' }
        ],
        best: 0,
        why: 'Delivery is at least once, so a repeat is normal, and the handler must tolerate it. The recorded handler writes with `overwrite=False` and answers "' + FR.second.status + '" the second time, so the repeat changes nothing. Merging by a key does the same for a table.',
        checks: [
          ['Compare the event ids', 'Two executions with one id is a repeat of delivery, and not two files.'],
          ['Read the write', 'Does it insert, or does it merge by a key?'],
          ['Make it safe to repeat', 'Refuse to overwrite, or merge by the blob name.'],
          ['Clean up', 'Keep one row for each file, as in mission 5.'],
          ['Test it', 'Send the same event twice in a test, as the recorded test does.']
        ],
        tell: 'The file was counted twice because Event Grid delivers at least once and the function inserted a row for every execution. I changed the handler to write with overwrite turned off and to merge by the blob name, so a repeat answers "already done" and changes nothing, removed the duplicate rows, and added the test that sends the same event twice and expects written and then already done.',
        prevent: ['Make handlers **safe to repeat**', 'Name results after the **blob**', 'Test a **repeated event**', 'Do not rely on **exactly once**']
      }),

      B.incident({
        id: 'm10-inc2', t: 2, src: 'docs', title: 'Incident: 40,000 messages in the poison queue', time: '06:30',
        alert: '**The poison queue holds 40,000 messages this morning, and the alert fired at 02:10.** The Function that reads the work queue started failing at 02:00 with an authorization error when it called the Data Factory API. A deployment at 01:50 replaced the role assignment of the function identity.',
        clues: ['Every message failed the same way', 'The cause is one missing role, not 40,000 bad files', 'The messages are in the poison queue, not lost'],
        opts: [
          { t: 'Restore the role of the identity, check with one message, and move the poison messages back to the work queue', fb: '' },
          { t: 'Delete the poison queue to clear the alert', fb: 'It deletes 40,000 files that were never handled.' },
          { t: 'Raise maxDequeueCount to 50 and wait', fb: 'It would not fix the missing role. Each message would only fail more times.' },
          { t: 'Give the identity the Owner role so that it cannot fail again', fb: 'It hides the cause and gives the function more power than any job needs.' }
        ],
        best: 0,
        why: 'The poison queue did its job: it kept every message that failed, so nothing was lost. The cause is one missing role, so the fix is to restore it. Replay one message first to prove the fix, and then move the rest back, in a controlled way, since each is safe to repeat.',
        checks: [
          ['Read a poison message and the error', 'Is the failure the same for all of them?'],
          ['Find the change', 'The deployment log shows the role assignment that was replaced.'],
          ['Restore the role', 'Least privilege: the role that the function needs, on the scope it needs.'],
          ['Replay', 'One message first, then the rest, and compare the counts.'],
          ['Prevent it', 'Role assignments in the same template, with a what-if check before the release.']
        ],
        tell: 'Forty thousand messages reached the poison queue because a deployment replaced the role assignment of the function identity, so every call to Data Factory failed with an authorization error. I restored the role from the template, proved the fix with one message, moved the rest back to the work queue in batches, and compared the counts with the files in the container. I added the role assignment to the same template as the function and a what-if check before each release.',
        prevent: ['Keep **role assignments** in the same template', 'Run a **what-if** before a release', '**Replay** poison messages, never delete them', 'Alert on the **first** poison message']
      }),

      B.qa({
        id: 'qa-event-driven', t: 1, tag: 'Events', secs: 75,
        q: 'Event Grid, Event Hubs, Service Bus or a storage queue: how do you choose?',
        pts: ['Event Grid: push a small fact, such as a blob was created', 'Event Hubs: a partitioned stream with replay, for high volumes', 'Service Bus: business messages with dead-letter queues, sessions and transactions', 'Storage queue: a simple, cheap work list or buffer', 'Ask what the message is: a fact, a stream, a command or a job', 'Whatever the choice, delivery is at least once'],
        short: 'I ask what the message is. A fact that something happened, such as a blob was created, goes through Event Grid, which pushes it to a handler. A stream of clicks or telemetry that readers pull at their own pace, with replay, goes through Event Hubs. A business message or a command that needs a dead-letter queue, sessions or transactions goes through Service Bus. A plain list of jobs, or a buffer in front of a Function, can be a storage queue, which is simple and cheap.\n\nIn a data platform I often chain them: Event Grid tells me a file landed and delivers to a storage queue, and a Function reads the queue and starts a pipeline.\n\nWhichever I choose, delivery is at least once, so every handler must be safe to repeat.',
        fu: [
          ['Why a queue behind Event Grid?', 'It buffers a burst and lets the reader set its own pace, so a slow or failed handler loses nothing.'],
          ['Does a storage queue have a dead-letter queue?', 'No. The client, or the Functions runtime, moves a failing message to a poison queue.']
        ],
        trap: 'Using Event Hubs as a queue, or a queue as a stream.',
        real: 'Describe how a message reached a handler in a system you built.'
      }),

      B.qa({
        id: 'qa-eventgrid', t: 1, tag: 'Events', secs: 75,
        q: 'How does Event Grid deliver events, and what happens when a handler fails?',
        pts: ['At least once, with no guarantee of order', 'Retries with exponential backoff, within a number of attempts and a time to live', 'A dead-letter location in a blob container keeps events that cannot be delivered', 'Filters on type, subject and data keep the traffic small', 'On a Data Lake account filter data.api on FlushWithClose', 'A queue in front of the handler absorbs bursts'],
        short: 'Event Grid delivers each event at least once and does not promise an order, so a handler can see duplicates. When a handler fails or is slow, Event Grid retries with an exponential backoff, starting at about ten seconds, within a policy of a number of attempts and a time to live, which I check on the delivery page because the defaults can change. I set a dead-letter location, a blob container, so that an event that cannot be delivered is kept and not dropped.\n\nI filter early, on the type, the start of the subject, and fields of the data. On a Data Lake account a file raises two BlobCreated events, one for the creation and one for the commit, so I filter on the api being FlushWithClose to react only to finished files.\n\nAnd I put a queue in front of the handler when bursts or slow handlers are likely.',
        fu: [
          ['Where do failed events go?', 'To the dead-letter blob container, if you set one. Without it, they are dropped after the retries.'],
          ['What about order?', 'There is none. Design the handler so that order does not matter, or use a stream for ordered data.']
        ],
        trap: 'Assuming that an event arrives exactly once, in order.',
        real: 'Describe an event that was delivered twice, and what the handler did.'
      }),

      B.qa({
        id: 'qa-queue', t: 1, tag: 'Events', secs: 75,
        q: 'How does a storage queue handle a message that a worker fails to process?',
        pts: ['A received message is hidden for the visibility timeout', 'If it is not deleted, it returns with its dequeue count raised', 'The delete needs the latest pop receipt', 'There is no built-in dead-letter queue: a client or Functions moves it after a limit', 'Functions: maxDequeueCount 5 by default, then a queue named with -poison', 'Alert on the poison queue, fix the cause, replay'],
        short: 'When a worker receives a message, the queue hides it for the visibility timeout. If the worker deletes it, the work is done. If the worker crashes, the message returns after the timeout with its dequeue count raised by one, so another try follows. The delete needs the pop receipt from the latest receive, and an old one is refused.\n\nA storage queue has no built-in dead-letter queue. A client checks the dequeue count and moves a message that is over the limit to a poison queue, which my recording did after three tries. In Azure Functions the runtime does it: after maxDequeueCount tries, five by default, the message goes to a queue with the name of the original plus poison.\n\nI alert when the poison queue is not empty, find the cause, fix it, and then replay the messages. I never delete them, and I do the delete after the work, never before.',
        fu: [
          ['What is the size limit?', 'A message is limited to 64 KB, and the emulator refused 70,000 characters in my recording. Put the data in a blob and send its path.'],
          ['Does the message id change?', 'No. It stays the same on every delivery, which helps to spot repeats.']
        ],
        trap: 'Deleting the message before the work is done.',
        real: 'Describe a poison message that you found and how you handled it.'
      }),

      B.qa({
        id: 'qa-functions', t: 2, tag: 'Functions', secs: 75,
        q: 'What do you need to know to run Azure Functions in a data platform?',
        pts: ['A trigger starts it, and bindings connect it to data', 'It signs in with the managed identity of the app, with least-privilege roles', 'Plans: Consumption scales to zero, Flex Consumption is the direction, Premium keeps instances warm', 'Keep functions short: start long work, do not wait for it', 'Retries and poison handling depend on the trigger', 'Test the handler with pytest and an emulator'],
        short: 'A trigger starts a function, such as an Event Grid event, a queue message, a timer or an event hub, and bindings connect it to data. The function app has a managed identity, so the code signs in with DefaultAzureCredential and I give it least-privilege roles, with no connection string.\n\nI choose the hosting plan on purpose: Consumption scales to zero and bills per run, Microsoft has announced a retirement date for the Linux Consumption plan and points new serverless apps to Flex Consumption, and Premium keeps instances warm. I read the current page before I pick.\n\nI keep functions short: they start a pipeline and return, since a long job belongs in Data Factory or Spark. Retries and poison handling depend on the trigger, so I read the page for the trigger I use. And I test the handler as plain Python with pytest, using a made-up event and a storage emulator, as I did in this mission.',
        fu: [
          ['Why test with an emulator?', 'It runs on a laptop and in CI, costs nothing, and finds mistakes such as a wrong subject split before release.'],
          ['What would you not do in a function?', 'Wait for a long pipeline, or hold state in memory between calls.']
        ],
        trap: 'Putting long work inside a function and hitting its time limit.',
        real: 'Describe a Function that you wrote and how you tested it.'
      }),

      B.qa({
        id: 'qa-idempotent-handler', t: 1, tag: 'Events', secs: 60,
        q: 'How do you make an event handler safe to repeat?',
        pts: ['Events and messages arrive at least once, so repeats are normal', 'Refuse to overwrite: a conditional write that finds the work done', 'Name the result after the input so the same event gives the same target', 'Merge by a key when the target is a table', 'Test by sending the same event twice', 'Never rely on exactly once'],
        short: 'Event Grid, queues and Event Hubs all deliver at least once, so a repeat is normal and the handler must tolerate it. I use three habits. First, a conditional write: my handler uploads its result with overwrite turned off, and when the blob exists it answers already done and changes nothing. Second, I name the result after the input, the blob name, so the same event always has the same target. Third, when the target is a table, I merge by a key and never insert.\n\nThen I test it: a test sends the same event twice and expects written and then already done, which is the test in my recording.\n\nI do not rely on exactly once, because no service of the three promises it.',
        fu: [
          ['What about the event id?', 'It is a good key for a table of handled events, which a handler checks before it works.'],
          ['What is the cost of checking?', 'One read or one failed write for each event, which is small next to a duplicated load.']
        ],
        trap: 'Assuming that a retry is rare. At scale it happens every day.',
        real: 'Describe how you found out that a handler was not safe to repeat.'
      }),

      B.qa({
        id: 'qa-test-function', t: 2, tag: 'Functions', secs: 60,
        q: 'How do you test an Azure Function that reads and writes blobs?',
        pts: ['Keep the logic in plain functions that take an event and a client', 'Call them from pytest with a made-up Event Grid event', 'Use Azurite, the storage emulator, instead of a real account', 'One test for the result, one for a repeated event, one for an awkward name', 'The emulator proves the code, not the service: check names and errors against the documentation', 'Run the tests in CI'],
        short: 'I keep the logic in plain Python functions that take an event and a storage client, so I can call them from pytest without the Functions runtime. The test builds an Event Grid event with the right subject and talks to Azurite, the storage emulator, so it runs on a laptop and in CI, and costs nothing.\n\nI write at least three tests: one for the result, one that sends the same event twice and expects written and then already done, and one with an awkward name, such as a blob in a folder. That last test caught a real bug in my recording: the handler split the subject on every slash, and the test failed with BlobNotFound.\n\nThe emulator proves the code and not the service, so I check error names and limits against the documentation, and I run the tests in the pipeline of every pull request.',
        fu: [
          ['What does Azurite not cover?', 'Some features are missing, such as soft delete, versioning and the Data Lake endpoint. Test those against a real account.'],
          ['Where does the client come from in the test?', 'A fixture creates containers in the emulator and points the handler at them.']
        ],
        trap: 'Testing only the happy path with one simple blob name.',
        real: 'Describe a bug that a test caught before release.'
      }),

      B.recap({
        id: 'm10-recap', n: 10, badge: 'Event Wrangler', color: '#FBCFE8',
        pts: [
          '**Event Grid** pushes facts, **Event Hubs** carries streams, **Service Bus** carries business messages, a **storage queue** is a plain buffer.',
          'A Data Lake file raises **two** BlobCreated events. Filter on **FlushWithClose** for the finished one.',
          'A queue **hides** a message while it is read. No delete means it **returns** with a higher count. After the limit, it moves to a **poison queue**.',
          '**Delete after the work.** A handler must be **safe to repeat**: refuse to overwrite, name by the input, merge by a key.',
          '**Test** the handler with pytest and an emulator: three tests caught a subject split that dropped the folders.'
        ],
        lines: [
          'I assume every event arrives twice.',
          'I delete the message only after the work is done.',
          'I test the awkward blob name as well as the simple one.'
        ]
      })
    ]
  });
})();
