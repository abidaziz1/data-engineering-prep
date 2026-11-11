/* Mission 8: Dataflow and Apache Beam. The Beam model of time (event time, windows, triggers, watermarks, allowed lateness, accumulation), sessions, a dead letter output,
   repeats, pipeline options, and what the Dataflow service adds. The pipelines were RUN for real on Beam's own local runners with a test stream whose watermark I move by hand,
   so every pane in this mission is a real result of Beam. The Dataflow service was not reachable: autoscaling, Streaming Engine, billing, drain and update are from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var L = G.counts('beam.late'), DL = G.counts('beam.dead_letter'), DD = G.counts('beam.dedupe'), OP = G.counts('beam.options'), TY = G.counts('beam.typo'), WM = G.counts('beam.bigquery_write_methods');
  var S60 = G.table('beam.sessions_60'), S10 = G.table('beam.sessions_10'), PL = G.table('beam.panes.late_discarding'), PA = G.table('beam.panes.late_accumulating'), PE = G.table('beam.panes.early_late_accumulating'), PN = G.table('beam.panes.no_lateness');
  var CODE = G.file('code/beam_jobs.py'), FL = G.table('cli.flags');
  G.expect(L.no_lateness.dropped === 2 && L.late_discarding.dropped === 1 && L.late_accumulating.events_in_the_output === 5 && L.early_late_accumulating.panes === 5 && L.no_lateness.events_in_the_output === 4, 'the late data counts');
  G.expect(S60.rows.length === 2 && S10.rows.length === 5 && S60.rows[0][2] === 3 && S60.rows[0][1] === '0 to 105', 'the sessions');
  G.expect(DL.lines_in === 6 && DL.ok === 3 && DL.dead === 3 && DD.unique_events === 40 && DD.delivered === 42 && DD.kept_with_60s_windows === 41 && DD.kept_with_300s_windows === 40, 'the dead letters and the repeats');
  G.expect(TY.worker_limit_kept === false && /Discarding unparseable args/.test(TY.warning) && OP.max_num_workers === 10 && OP.use_public_ips === false && WM.methods.indexOf('STORAGE_WRITE_API') >= 0, 'the options');
  var fx = FL.rows.filter(function (r) { return r[0] === 'gcloud dataflow flex-template run'; })[0];
  G.expect(fx[2] === '-', 'the Dataflow flags exist');
  var last = function (t, key) { var r = t.rows.filter(function (x) { return x[0] === key; }); return r[r.length - 1]; };
  var FLEX = [
    'gcloud dataflow flex-template run orders-stream-$(date +%Y%m%d-%H%M%S) \\',
    '  --template-file-gcs-location=gs://brewline-tmp-dev/templates/orders-stream.json \\',
    '  --region=asia-southeast1 \\',
    '  --service-account-email=sa-pipeline@brewline-dev.iam.gserviceaccount.com \\',
    '  --subnetwork=regions/asia-southeast1/subnetworks/data \\',
    '  --disable-public-ips \\',
    '  --max-workers=10 \\',
    '  --staging-location=gs://brewline-tmp-dev/staging \\',
    '  --parameters=input_subscription=projects/brewline-dev/subscriptions/orders-to-df'
  ].join('\n');
  var BUGP = [
    'class ParseLine(beam.DoFn):',
    '    def process(self, line):',
    '        ev = json.loads(line)',
    '        yield ev'
  ].join('\n');
  var FIXP = [
    'class ParseLine(beam.DoFn):',
    '    DEAD = "dead"',
    '    def process(self, line):',
    '        try:',
    '            ev = json.loads(line)',
    '            if not isinstance(ev, dict) or "order_id" not in ev:',
    '                raise ValueError("no order_id")',
    '            yield ev',
    '        except Exception as err:',
    '            yield beam.pvalue.TaggedOutput(self.DEAD, {"line": line, "error": str(err)})'
  ].join('\n');
  var TYPO = [
    'python orders_pipeline.py \\',
    '  --runner=DataflowRunner --project=brewline-dev --region=asia-southeast1 \\',
    '  --max_num_worker=10'
  ].join('\n');
  var TYPOFIX = [
    'python orders_pipeline.py \\',
    '  --runner=DataflowRunner --project=brewline-dev --region=asia-southeast1 \\',
    '  --max_num_workers=10'
  ].join('\n');
  var optRows = Object.keys(OP).sort().map(function (k) { return [k, Array.isArray(OP[k]) ? OP[k].join(', ') : String(OP[k])]; });
  function wrap(t, n) {
    return t.split('\n').reduce(function (a, l) {
      while (l.length > n) { var cut = l.lastIndexOf(' ', n); if (cut < 40) cut = n; a.push(l.slice(0, cut)); l = '    ' + l.slice(cut).trim(); }
      a.push(l); return a;
    }, []).join('\n');
  }

  LAB.addChapter({
    id: 'm8', n: 8, title: 'Dataflow and Apache Beam', short: 'Dataflow', blurb: 'Event time, windows, triggers, late data, sessions, dead letters, options, and what the service adds', minutes: 54,
    focus: ['stg', 'int'],
    goals: [
      'Explain **event time**, **processing time** and the **watermark**.',
      'Choose a **window**, a **trigger**, an **allowed lateness** and an **accumulation mode**, and read the **panes** that result.',
      'Build a **dead letter** output so that one bad record does not stop the pipeline.',
      'Say why removing **repeats** needs a window, and what it cannot see.',
      'Read **pipeline options**, and notice that a typo can be silently dropped.',
      'Say what **Dataflow** adds to Beam: autoscaling, Streaming Engine, update and drain.'
    ],
    say: 'Mission 8 is streaming done properly. Dataflow is the managed service that runs Apache Beam, and Beam is the model that decides what a window is, when a result is final, and what happens to an event that arrives late. I ran real Beam pipelines with a test stream and moved the watermark by hand, so a late event is late on purpose and the answer is the same on every run. Everything the Dataflow service itself does comes from documentation, and the screens say so.',
    scenes: [
      B.flow({
        id: 'm8-flow', t: 1, src: 'docs', title: 'A streaming pipeline, step by step', g: 'dataflow', legend: true,
        steps: [
          { say: 'This is the pipeline of the mission: read the order events from Pub/Sub, parse them, group them by store in one-minute windows, add them up and write to BigQuery. Everything inside the frame runs on Dataflow workers. Press Next to follow it.', cap: 'Read, parse, window, sum, write.' },
          { say: 'Step 1. **Read.** The source is a Pub/Sub subscription. Each message gets an **event time**: the time the thing happened. By default that is the publish time. If the event carries its own time, you tell the source which attribute holds it.', on: ['f1'], focus: ['d_src', 'd_parse'], cap: 'Every element has an event time.' },
          { say: 'Step 2. **Parse.** A function turns each message into an order. A message that cannot be parsed goes to a second output, the **dead letter**, instead of failing the pipeline.', on: ['f2', 'f5'], focus: ['d_parse', 'd_win', 'd_dead'], cap: 'A bad message is set aside.' },
          { say: 'Step 3. **Window.** The stream never ends, so you cut it into windows by event time: here, one minute. A window is a bucket that stays open until the **watermark** says that the events of that minute have probably all arrived.', on: ['f3'], focus: ['d_win', 'd_agg'], cap: 'A window is a bucket in event time.' },
          { say: 'Step 4. **Late data.** An event can arrive after its window closed. By default it is **dropped**. With an **allowed lateness**, the window keeps its state a while longer and fires again when a late event arrives.', on: ['f6'], focus: ['d_win', 'd_late'], cap: 'A late event is dropped, or triggers another firing.' },
          { say: 'Step 5. **Sum and write.** Each firing of a window is a **pane**. The sums go to BigQuery. Because a window can fire more than once, the table must be able to take a later answer for the same window.', on: ['f4'], focus: ['d_agg', 'd_sink'], cap: 'Each firing is a pane, written to BigQuery.' }
        ]
      }),

      B.talk({
        id: 'm8-model', t: 1, src: 'docs', title: 'The Beam model in four words',
        say: 'Beam is a programming model, and Dataflow is one place to run it. Four words are enough to read any pipeline. Press Next for each.',
        items: [
          ['PCollection', 'A **PCollection** is a set of elements. It can be **bounded** (a file, a table: it ends) or **unbounded** (a stream: it never ends). Each element has a value, an **event time** and a window.', 'A dataset, bounded or not.'],
          ['PTransform and DoFn', 'A **PTransform** takes PCollections and returns PCollections: read, map, group, combine, write. A **DoFn** is the function that runs on each element inside a `ParDo`. A pipeline is a graph of transforms.', 'A graph of steps.'],
          ['Runner', 'The **runner** executes the graph. The same pipeline can run locally, for tests, or on Dataflow, or on another runner. In this course the pipelines ran on Beam\'s local runners, and Dataflow is the runner for production.', 'The same code runs anywhere.'],
          ['One model for batch and stream', 'A batch is a stream that ends, and windows and triggers are the same. That is the promise of Beam: you write the logic once, and choose bounded or unbounded at the edges.', 'One model, two shapes.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'Dataflow is a service, Beam is the code.', t: 'You write Apache Beam in Java, Python or Go. Dataflow runs it for you: it creates workers, scales them, moves data between them and reports metrics. The windows are the same on your laptop and in the cloud.' }
      }),

      B.talk({
        id: 'm8-time', t: 1, src: 'docs', title: 'Time, windows and triggers',
        say: 'Streaming correctness is about time, and there are two clocks. Press Next for the ideas, in the order that they build on each other.',
        items: [
          ['Event time and processing time', '**Event time** is when the thing happened. **Processing time** is when your pipeline saw it. A till that was offline for ten minutes sends its orders late: their event time is old and their processing time is now. Windows use event time, because the report is about when orders were made, not when they were received.', 'Report by when it happened.'],
          ['The watermark', 'The **watermark** is the system\'s estimate that all events with an event time before it have arrived. When it passes the end of a window, the window can fire. It is an **estimate**: a late event can still come, which is why late data exists.', 'A guess about completeness.'],
          ['Windows', 'A **fixed** window cuts time into equal pieces (every minute). A **sliding** window overlaps (five minutes, every minute). A **session** window closes after a gap with no events for a key. The **global** window is one window for everything.', 'Fixed, sliding, session, or none.'],
          ['Triggers, lateness, accumulation', 'A **trigger** decides when a window fires: by default once, when the watermark passes. You can add an **early** trigger for rough results, and a **late** trigger for late events. **Allowed lateness** says how long the window keeps its state. **Accumulating** panes repeat everything so far, and **discarding** panes send only what is new.', 'When to fire, how long to wait, what to send.']
        ],
        cols: 1
      }),

      B.widget({ id: 'm8-lab', kind: 'windows', t: 1, src: 'rec', title: 'Lab: panes, late data and sessions' }),

      B.code({
        id: 'm8-late', t: 1, src: 'rec', title: 'The pipeline that made the panes', file: 'beam_jobs.py', lang: 'python', code: CODE,
        steps: [
          { say: 'This is the code behind the lab. It is a real Apache Beam pipeline, run on Beam\'s local runner with a **test stream**. The test stream lets me move the watermark myself, so a late event is late exactly when I say. Press Next.', lines: null },
          { say: 'The stream: the watermark starts at 0, three events arrive, the watermark moves to 50, one more arrives (second 55), the watermark moves to 70, an event stamped second 40 arrives **late**, the watermark moves to 200, and an event stamped second 10 arrives **very late**.', lines: G.span(CODE, /stream = TestStream/, /advance_watermark_to_infinity/) },
          { say: 'The trigger says: fire when the watermark passes, and fire again for each late element. With `early` set, it also fires every 20 seconds of processing time before the watermark.', lines: G.span(CODE, /trigger = AfterWatermark/) },
          { say: '`WindowInto` is where all the choices meet: **one-minute fixed windows**, the trigger, the **accumulation mode**, and the **allowed lateness**. Change these three and you get the four setups of the lab.', lines: G.span(CODE, /beam\.WindowInto/) },
          { say: 'Then an ordinary sum for each store, and a small function that writes one line for every pane: the window, the timing (early, on time or late), the index of the pane and the value.', lines: G.span(CODE, /beam\.CombinePerKey/, /beam\.ParDo\(LogPane/) }
        ],
        note: 'Recorded with apache-beam ' + G.meta('apache-beam') + '. The runners are named in the code: the default one may start a separate program for some batch pipelines, and these pipelines are Python only.'
      }),

      B.rows({
        id: 'm8-panes', t: 1, src: 'rec', title: 'The four setups, side by side',
        steps: [
          {
            say: 'Six events were sent. With **no allowed lateness**, **' + L.no_lateness.events_in_the_output + '** were counted and **' + L.no_lateness.dropped + '** were dropped as too late. With an allowed lateness of 120 seconds and a late trigger, **' + L.late_discarding.events_in_the_output + '** were counted and **' + L.late_discarding.dropped + '** was dropped: only the event that arrived after 200 seconds, beyond the lateness, is lost.',
            tabs: [{ layer: 'RECORDED', name: 'What each setup did with the six events', c: 'raw', cols: ['setup', 'panes', 'events sent', 'counted', 'dropped'], rows: ['no_lateness', 'late_discarding', 'late_accumulating', 'early_late_accumulating'].map(function (k) { return [L[k].label, L[k].panes, L[k].events_sent, L[k].events_in_the_output, L[k].dropped]; }), trk: 0 }],
            notes: ['Recorded: Beam ' + G.meta('apache-beam') + ', a test stream, the local runner. "Counted" is the sum of the last pane of each key for the accumulating setups, and the sum of all panes for the discarding ones.']
          },
          {
            say: 'Look at the panes for store s01 in the accumulating setup: **' + PA.rows.filter(function (r) { return r[0] === 's01'; }).map(function (r) { return r[3] + ' = ' + r[4]; }).join(', ') + '**. The late pane **replaces** the on-time pane. In the discarding setup the late pane says **' + PL.rows.filter(function (r) { return r[0] === 's01' && r[3] === 'LATE'; })[0][4] + '**: it **adds** to it. The consumer must know which one it receives.',
            tabs: [{ layer: 'RECORDED', name: 'Panes of store s01', c: 'raw', cols: ['mode', 'pane', 'timing', 'value'], rows: PL.rows.filter(function (r) { return r[0] === 's01'; }).map(function (r) { return ['discarding', r[2], r[3], r[4]]; }).concat(PA.rows.filter(function (r) { return r[0] === 's01'; }).map(function (r) { return ['accumulating', r[2], r[3], r[4]]; })), trk: 0 }],
            notes: ['A table that receives discarding panes must **add** them. A table that receives accumulating panes must **replace** the row for the window. A MERGE on the window key does the replace.']
          }
        ]
      }),

      B.rows({
        id: 'm8-sessions', t: 2, src: 'rec', title: 'Sessions: the gap decides the count',
        steps: [{
          say: 'One customer opens the app at seconds 0, 20, 45, 200 and 215. With a gap of **60 seconds** Beam found **' + S60.rows.length + ' sessions**: events at 0, 20 and 45 are less than 60 apart, so the session runs to 45 + 60 = 105. With a gap of **10 seconds** it found **' + S10.rows.length + '**, one for each event.',
          tabs: [{ layer: 'RECORDED', name: 'Session windows for customer c0007', c: 'raw', cols: ['gap', 'session window (s)', 'events'], rows: S60.rows.map(function (r) { return ['60 s', r[1], r[2]]; }).concat(S10.rows.map(function (r) { return ['10 s', r[1], r[2]]; })), trk: 0 }],
          notes: ['A session is defined per key, so each customer has their own. The gap is a business decision (how long is a visit?), and it changes the numbers, so write it down.']
        }]
      }),

      B.code({
        id: 'm8-dead', t: 1, src: 'rec', title: 'A dead letter output', file: 'beam_jobs.py', lang: 'python', code: CODE,
        steps: [
          { say: 'A stream cannot stop for one bad record. This function parses a line, and sends anything that fails to a **second output**. Press Next.', lines: null },
          { say: 'A line must be JSON, must be an object, and must have an `order_id`. If any of that is false, the function raises inside a `try`.', lines: G.span(CODE, /^class ParseLine/, /raise ValueError/) },
          { say: 'The `except` does not hide the problem. It emits the **original line and the error** as a tagged output called `dead`. The main output carries only good orders.', lines: G.span(CODE, /except Exception as err/, /TaggedOutput/) },
          { say: 'In the pipeline, `with_outputs` splits the two outputs. The good orders go on to the next step, and the dead letters go to their own sink: a bucket, a table, or a Pub/Sub topic.', lines: G.span(CODE, /with_outputs/, /WriteDead/) }
        ],
        note: 'Recorded with Beam ' + G.meta('apache-beam') + '. The sinks here are local files. In production the dead letter output usually goes to BigQuery or Cloud Storage, and an alert watches its size.'
      }),

      B.rows({
        id: 'm8-dead-rows', t: 1, src: 'rec', title: 'Six lines in: three orders, three dead letters',
        steps: [{
          say: 'I fed the pipeline six lines. **' + DL.ok + '** were good orders and **' + DL.dead + '** went to the dead letter output, each with its reason. Nothing stopped, and nothing was lost: the person who reads the dead letters sees the original text.',
          tabs: [{ layer: 'RECORDED', name: 'The dead letter records', c: 'raw', cols: ['original line', 'error'], rows: DL.dead_records.map(function (r) { return [r.line, r.error]; }), trk: 0 }],
          notes: ['Without this, a single bad line makes the DoFn raise. In a **batch** pipeline Dataflow retries the bundle four times and then fails the job. In a **streaming** pipeline it retries for ever, and the pipeline stalls on that one element.']
        }]
      }),

      B.rows({
        id: 'm8-dedupe', t: 1, src: 'rec', title: 'Removing repeats needs a window, and sees only its own',
        steps: [
          {
            say: 'The stream had **' + DD.unique_events + '** distinct events, and **' + DD.delivered + '** were delivered: two of them twice. One repeat came **5 seconds** later and one **' + DD.second_duplicate_gap_seconds + ' seconds** later. A pipeline can remove repeats by grouping by the event id within a window.',
            tabs: [{ layer: 'RECORDED', name: 'How many events survive', c: 'raw', cols: ['window size', 'events kept', 'repeats left'], rows: [['60 seconds', DD.kept_with_60s_windows, DD.kept_with_60s_windows - DD.unique_events], ['300 seconds', DD.kept_with_300s_windows, DD.kept_with_300s_windows - DD.unique_events]], trk: 0 }],
            notes: ['Recorded with Beam: group by the event id inside fixed windows, keep the first of each group.']
          },
          {
            say: 'With one-minute windows, **' + (DD.kept_with_60s_windows - DD.unique_events) + '** repeat survived: the one that arrived **' + DD.second_duplicate_gap_seconds + ' seconds** later was in another window, and the window cannot see outside itself. With five-minute windows both were removed. The size of the window is the **memory** of the deduplication.',
            tabs: [{ layer: 'RULE', name: 'What a deduplication remembers', c: 'raw', cols: ['What', 'Result'], rows: [['A repeat inside the window', 'removed'], ['A repeat in another window', 'kept'], ['A longer window', 'remembers longer, and costs more state']], trk: 0 }],
            notes: ['For a long memory, do not rely on a window. Make the **sink** idempotent: a MERGE on the event id removes a repeat that came a week later. The source of Dataflow for Pub/Sub can also drop repeats by an id attribute, within a limited period: read the documentation of the connector.']
          }
        ]
      }),

      B.rows({
        id: 'm8-options', t: 1, src: 'rec', title: 'The options of a Dataflow job, as Beam parses them',
        steps: [
          {
            say: 'These are the options that Beam found when I gave it the command line of a Dataflow job. I built them offline and did not launch anything. They are the options that matter in a review: **where** the job runs (region), **who** it runs as (service account), **how** it reaches the network (subnetwork, no public IPs), **how big** it may get (max workers, machine type), and **how it is tagged** (labels).',
            tabs: [{ layer: 'RECORDED', name: 'Options parsed by Beam ' + G.meta('apache-beam'), c: 'raw', cols: ['option', 'value'], rows: optRows, trk: 0 }],
            notes: ['Temp and staging locations are buckets in your project. Keep them in the same region as the job, and put a lifecycle rule on them: they fill up with files that nobody reads.']
          },
          {
            say: 'A **service account** for the workers is the most important line for security: the job runs with its roles, and nothing else. **No public IPs** and a **subnetwork** keep the workers off the internet. **Labels** show up in the billing export. A **maximum number of workers** is a ceiling on the bill.',
            tabs: [{ layer: 'RULE', name: 'Four lines that a reviewer looks for', c: 'raw', cols: ['Line', 'Why'], rows: [['a service account of its own', 'least privilege for the workers'], ['no public IPs, a subnetwork', 'workers are not reachable from the internet'], ['labels', 'cost attribution'], ['max workers', 'a ceiling on the cost of a runaway job']], trk: 0 }],
            notes: ['Mission 2 explained why the account matters. Mission 14 puts these options into a template that is reviewed like any other code.']
          }
        ]
      }),

      B.rows({
        id: 'm8-typo', t: 1, src: 'rec', title: 'A typo that does nothing',
        steps: [{
          say: 'I gave Beam `' + TY.flag_given + '`, with a typo: the option is `--max_num_workers`. Beam did **not** fail. It printed one warning, "' + TY.warning + '", and it **dropped** the option. The job would have run with no worker limit. The options that were kept: ' + TY.options_kept.join(', ') + '.',
          tabs: [{ layer: 'RECORDED', name: 'What Beam did with the typo', c: 'raw', cols: ['What', 'Result'], rows: [['option given', TY.flag_given], ['kept as the worker limit', TY.worker_limit_kept ? 'yes' : 'no'], ['warning', TY.warning], ['options that survived', TY.options_kept.join(', ')]], trk: 0 }],
          notes: ['Recorded with Beam ' + G.meta('apache-beam') + '. Parsing options is forgiving by design, so a misspelled option is a warning, and a warning is easy to miss in a log. Test the **final options** of a job, and fail on any discarded argument.']
        }]
      }),

      B.cmp({
        id: 'm8-templates', t: 2, src: 'docs', title: 'Three ways to launch a pipeline',
        say: 'A pipeline has to start somewhere, and in a team that must not be a laptop. Press Next to read the three ways.',
        cols: ['Way', 'What it is', 'Use it for'],
        hl: 2,
        rows: [
          ['Run the code directly', 'A person or a CI job runs the Python file with the Dataflow runner', 'Development, and quick experiments'],
          ['Classic template', 'The pipeline is staged to Cloud Storage as a template with fixed parameters', 'Older pipelines. New ones use Flex Templates'],
          ['Flex Template', 'The pipeline and its dependencies are packaged in a container image, with a spec file in Cloud Storage. A launch passes parameters', 'Production: reviewable, versioned, and started by Composer or by a person with a single command']
        ],
        steps: [
          { upto: 1, say: 'Running the file is fine for development. Its dependencies come from the machine that runs it.' },
          { upto: 3, say: 'Flex Templates package everything in an image. The same image runs the same way every night, and the launch is one command.' }
        ],
        pick: 'In production, build a **Flex Template** in CI, version the image, and launch it from Composer with parameters. Nobody should start a production job from a personal machine.'
      }),

      B.code({
        id: 'm8-flex', t: 2, src: 'docs', title: 'Launching a Flex Template', file: 'launch.sh', lang: 'bash', code: FLEX,
        steps: [
          { say: 'This launches the orders pipeline from a template. I checked that every flag exists in the help page of the installed `gcloud`: ' + fx[1].split(' ').length + ' flags found, none missing. I did not run it. Press Next.', lines: null },
          { say: 'The **template file** is the spec in Cloud Storage that names the container image. The job name carries a time stamp, because job names must be unique among active jobs.', lines: G.span(FLEX, /flex-template run/, /template-file-gcs-location/) },
          { say: 'The **region**, and the **service account** that the workers run as. Both are choices from the earlier screens.', lines: G.span(FLEX, /--region/, /service-account-email/) },
          { say: 'The **network**: a subnetwork and no public IPs. The workers can reach Google APIs through Private Google Access, and nothing outside.', lines: G.span(FLEX, /subnetwork/, /disable-public-ips/) },
          { say: 'A ceiling on **workers**, a place for **staging files**, and the **parameters** of the pipeline itself, such as the subscription to read.', lines: G.span(FLEX, /max-workers/, /parameters/) }
        ],
        note: 'A flag that exists in the help page can still need an API or a permission that the project does not have. Check by running it once in a dev project.'
      }),

      B.talk({
        id: 'm8-service', t: 1, src: 'docs', title: 'What the Dataflow service adds',
        say: 'Beam is the model. Dataflow is the service that runs it. Press Next for what the service does for you. This is from documentation: nothing here ran on Dataflow.',
        items: [
          ['Workers and autoscaling', 'Dataflow creates the workers (virtual machines), starts your code on them, and **scales** their number with the backlog and the load, between 1 and your maximum. You choose the machine type, and the number follows the work.', 'You set the ceiling. It moves the number.'],
          ['Streaming Engine and Shuffle', '**Streaming Engine** moves the state of windows and the shuffle of streaming jobs out of the worker VMs into a service, so workers are smaller and scaling is faster. **Dataflow Shuffle** does the same for batch. Both are usually on for new jobs.', 'State and shuffle live in the service.'],
          ['Update, drain and cancel', 'A running streaming job can be **updated** in place with new code if the change is compatible, so that its state is kept. **Drain** stops reading, finishes the data in flight and fires the open windows, then stops. **Cancel** stops at once and drops what is in flight.', 'Update to keep state, drain to stop clean, cancel to stop now.'],
          ['Exactly-once processing', 'Dataflow streaming processes each element **effectively once** by default: it removes the repeats that its own retries create. The effect on your sink depends on the sink: a Storage Write API stream with offsets can be exactly-once, and a sink that appends is not. There is also an **at-least-once** streaming mode that is cheaper and faster, for pipelines that tolerate repeats.', 'The pipeline is once. The sink decides the rest.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'Check the current behaviour:', t: 'update compatibility, the modes of streaming and the defaults of Streaming Engine have changed between releases. Read the current documentation before you design a deploy process on them.' }
      }),

      B.rows({
        id: 'm8-sinks', t: 2, src: 'rec', title: 'Writing to BigQuery: four methods in the Beam library',
        steps: [{
          say: 'The BigQuery sink of Beam has four write methods: **' + WM.methods.join(', ') + '**. They trade freshness against cost and guarantees. `FILE_LOADS` writes files and runs load jobs: it is batch, with no streaming cost. `STREAMING_INSERTS` is the old streaming API. `STORAGE_WRITE_API` is the recommended streaming path, and with its exactly-once mode it uses stream offsets. `DEFAULT` lets Beam choose.',
          tabs: [{ layer: 'RECORDED', name: 'Write methods read from the installed library', c: 'raw', cols: ['Method', 'Use it for'], rows: [['FILE_LOADS', 'Batch loads, or streaming with a triggering frequency of minutes: no streaming cost'], ['STREAMING_INSERTS', 'Older code. New work should not start here'], ['STORAGE_WRITE_API', 'Streaming at low latency, with exactly-once or at-least-once modes'], ['DEFAULT', 'Beam picks one, which can differ between versions: set it explicitly']], trk: 0 }],
          notes: ['The names were read from the installed Beam library. The "use it for" column is from documentation. Whatever the method, a MERGE on the key downstream is the cheapest safety net.']
        }]
      }),

      B.cmp({
        id: 'm8-choose', t: 1, src: 'docs', title: 'Dataflow, Dataproc, BigQuery SQL or a function?',
        say: 'A data engineer is asked every month: "which tool for this job". Press Next to read the pattern. The answer starts with the shape of the work.',
        cols: ['Shape of the work', 'First choice', 'Why', 'When to move'],
        hl: 1,
        rows: [
          ['The data is in BigQuery and the logic fits in SQL', 'BigQuery SQL, with Dataform', 'No servers, the cheapest to run and to read', 'The logic needs a library or a loop that SQL cannot express'],
          ['A stream that needs windows, late data, joins with state', 'Dataflow', 'Beam gives event time and state', 'The stream is simple and lands as it is: use a BigQuery subscription'],
          ['A large batch transformation in code, or Spark already exists', 'Dataproc or Serverless Spark', 'Spark has the libraries and the skills', 'The job is SQL in disguise: move it to BigQuery'],
          ['A few lines for each file or message', 'Cloud Run functions', 'Cheapest for small events', 'The volume grows: a function per message becomes slow and expensive'],
          ['Move files or tables without changing them', 'A transfer or a load job', 'Nothing to write', 'Any transformation is needed']
        ],
        steps: [
          { upto: 1, say: 'SQL first. Most transformations are SQL, and SQL in BigQuery is the cheapest thing to run and to read.' },
          { upto: 3, say: 'Dataflow when time and state are the problem. Spark when it is already Spark.' },
          { upto: 5, say: 'A function for small events, and no code at all when a transfer does the job.' }
        ],
        pick: 'Choose the **least** machinery that does the job, and write the reason in the design. "We use Dataflow because the stream needs event-time windows and late data" is a reason. "We use Dataflow" is not.'
      }),

      B.talk({
        id: 'm8-ops', t: 2, src: 'docs', title: 'Running a streaming job',
        say: 'A streaming job never finishes, so you watch it. Press Next for the four signals, and the four usual causes of trouble.',
        items: [
          ['System lag and data freshness', '**System lag** is how long the oldest element has waited in the pipeline. **Data freshness** is the age of the newest result the pipeline has produced, by event time. Alert on freshness, because it is what a user feels.', 'Alert on how old the answer is.'],
          ['Backlog and throughput', 'The backlog of the source (the oldest unacknowledged message of Pub/Sub) and the elements processed per second say whether you are keeping up. A rising backlog with idle workers points at a **blocked** key or a stuck element, not at too few workers.', 'A backlog with idle workers is a clue.'],
          ['Hot keys', 'A key with far more elements than the others makes one worker do the work of many, whatever the number of workers. Spread it, with a salt, or combine early, with a combiner that adds up before the shuffle.', 'More workers do not fix a hot key.'],
          ['Bad records and slow calls', 'An element that makes the code raise is retried: four times in batch, and for ever in streaming, so it stalls the pipeline. A slow call to an external service inside a `DoFn` makes every worker wait. Use a dead letter output, a timeout and batching of calls.', 'Catch it, send it aside, bound the wait.']
        ],
        cols: 1
      }),

      B.decide({
        id: 'm8-dec', t: 2, src: 'docs', title: 'Decision: how much lateness to allow',
        scenario: 'Tills in the stores sometimes lose their network for a few minutes, and a few stores in the region go offline for a whole day. The orders by minute feed a dashboard that people check during the day. Someone proposes an allowed lateness of two days "so that nothing is ever lost".',
        opts: [
          { t: 'Allowed lateness of two days', d: 'Nothing arrives too late to be counted.', lose: 'Every window keeps its state for two days, which means memory and storage for 2,880 windows for each store, and the dashboard can change values for two days after the fact.' },
          { t: 'Allowed lateness of a few minutes, a late trigger, and a nightly correction from the raw layer', d: 'The dashboard is nearly right and stable. The long tail is fixed by a batch job that recomputes from the files, which is cheap.', lose: '' },
          { t: 'No allowed lateness', d: 'The cheapest and the simplest.', lose: 'Any order from a till that was offline for two minutes is dropped from the dashboard, and the totals are always a little low.' }
        ],
        pick: 1,
        why: 'Streaming gives a fast, approximate answer. A batch job over the raw data gives the final one. Allow as much lateness as the **fast** answer needs, and let the nightly job fix the long tail. This is sometimes called the lambda or the reconciliation pattern.',
        when: 'If a decision is made automatically from the stream and must be right, accept the cost of a longer lateness, and measure the state size.'
      }),

      B.bug({
        id: 'm8-bug', t: 1, q: 'The streaming pipeline has stopped moving. The logs show the same error again and again for one message. Click the line that is the cause.',
        file: 'parse.py', lang: 'python', code: BUGP, bad: [3],
        hint: 'What happens to a message that is not valid JSON?',
        why: 'When `json.loads` raises, nothing catches it, so the bundle fails and is **retried** for ever in a streaming job. One bad message holds up the whole pipeline. Catch the error, and send the original line and the reason to a dead letter output. The recorded run did exactly that with three of six lines.',
        fix: FIXP,
        cheer: 'Catch it, and send it aside.'
      }),

      B.bug({
        id: 'm8-bug2', t: 1, q: 'The job was meant to be limited to 10 workers, and it scaled to 100 and cost a lot. Click the line to fix.',
        file: 'launch.sh', lang: 'bash', code: TYPO, bad: [3],
        hint: 'Is that the exact name of the option?',
        why: 'The option is `--max_num_workers`. `--max_num_worker` is not recognised, and Beam did not fail: it printed "' + TY.warning + '" and carried on without a limit. Check the final options of a job in CI, and fail the build on a discarded argument.',
        fix: TYPOFIX,
        cheer: 'Check the exact name, and fail on warnings.'
      }),

      B.incident({
        id: 'm8-inc', t: 2, src: 'docs', title: 'Incident: the freshness of the dashboard is 40 minutes', time: '11:20',
        alert: '**The orders dashboard is 40 minutes behind, and growing.** The streaming job is running and shows no errors. Workers have scaled up to the maximum, and CPU is low on most of them. A new version was updated in place yesterday.',
        clues: ['The oldest unacknowledged message of the subscription is getting older', 'A few workers are at 100 percent and the rest are idle', 'The new code added a call to a pricing service for each order', 'Store s01 sends about a third of the events'],
        opts: [
          { t: 'Find the slow stage and the hot key: batch or cache the pricing call, combine before the shuffle for the busiest store, then update or drain and relaunch', fb: '' },
          { t: 'Raise the maximum number of workers again', fb: 'The workers are already idle. A hot key and a slow call do not get faster with more of them.' },
          { t: 'Cancel the job and start it from the beginning of the topic', fb: 'Cancel drops the state and replay would redo everything, so the same code would be slow again.' },
          { t: 'Turn on the at-least-once mode to make it faster', fb: 'It may help the cost, but the cause is the call and the hot key, not the delivery mode.' }
        ],
        best: 0,
        why: 'Idle workers with a growing backlog mean that work is stuck behind a few elements. Find the stage with the most time, and look for a slow call or a hot key. Fix the cause, then update the job in place if the change is compatible, or drain and relaunch.',
        checks: [
          ['Read the metrics', 'System lag, data freshness, throughput per stage, and the autoscaling events.'],
          ['Find the stage', 'The step with the highest wall time. Check for an external call inside the DoFn.'],
          ['Find the hot key', 'Compare the elements per key. A store with a third of the data is a suspect.'],
          ['Fix and release', 'Batch or cache the call, combine early, then update in place or drain and relaunch.']
        ],
        tell: 'The update added a call to a pricing service for every order, and store s01 carries a third of the traffic, so a few workers were saturated while the rest idled. More workers could not help. I cached the prices, combined orders before the shuffle, updated the job, and watched the freshness fall back under a minute.',
        prevent: ['A load test with a hot key before a release', 'No external call per element: batch and cache', 'An alert on freshness, and a runbook for update, drain and cancel']
      }),

      B.quiz({
        id: 'm8-q1', t: 1,
        q: 'An order is made at 10:00 and reaches the pipeline at 10:07. In which one-minute window does Beam count it?',
        opts: [
          { t: 'The 10:07 window, the processing time', fb: 'Windows use event time, unless you choose otherwise.' },
          { t: 'The 10:00 window, the event time', fb: '' },
          { t: 'The global window', fb: 'Only if you chose it.' },
          { t: 'None: late events are never counted', fb: 'With allowed lateness it is counted.' }
        ],
        ok: 1,
        why: 'The report is about when the order was made. Event time puts it in the 10:00 window, and the watermark and allowed lateness decide whether the window still takes it.'
      }),

      B.quiz({
        id: 'm8-q2', t: 1,
        q: 'With no allowed lateness, what happens to an event that arrives after its window fired?',
        opts: [
          { t: 'It is counted in the next window', fb: 'It belongs to its event-time window, not to the next one.' },
          { t: 'It is dropped', fb: '' },
          { t: 'The window fires again', fb: 'Only with allowed lateness and a late trigger.' },
          { t: 'The pipeline fails', fb: 'It does not.' }
        ],
        ok: 1,
        why: 'In the recording the setup with no lateness dropped **' + L.no_lateness.dropped + '** of six events, and counted ' + L.no_lateness.events_in_the_output + '.'
      }),

      B.quiz({
        id: 'm8-q3', t: 2,
        q: 'A late pane says 4 for store s01. The on-time pane said 3. Which accumulation mode is that?',
        opts: [
          { t: 'Discarding: the late pane adds one event to the three', fb: 'A discarding pane would say 1.' },
          { t: 'Accumulating: the late pane holds everything so far, and replaces the earlier pane', fb: '' },
          { t: 'Neither: it is a bug', fb: 'It is the expected result of accumulating.' },
          { t: 'Session mode', fb: 'Sessions are a kind of window, not an accumulation mode.' }
        ],
        ok: 1,
        why: 'In the recording the accumulating setup gave panes 3 and 4. The discarding setup gave 3 and 1. The consumer must replace, or add, accordingly.'
      }),

      B.quiz({
        id: 'm8-q4', t: 1,
        q: 'One bad message makes a streaming DoFn raise. What happens if nothing catches it?',
        opts: [
          { t: 'Beam skips the message and goes on', fb: 'It does not skip on its own.' },
          { t: 'The element is retried for ever, and the pipeline stalls behind it', fb: '' },
          { t: 'The job ends with an error at once', fb: 'That is closer to what a batch job does, after four retries.' },
          { t: 'The message goes to a dead letter topic automatically', fb: 'Only if you build the dead letter output.' }
        ],
        ok: 1,
        why: 'Catch the error in the function, and emit the line and the reason to a dead letter output. Then alert on its size.'
      }),

      B.quiz({
        id: 'm8-q5', t: 2,
        q: 'You remove repeats by event id inside one-minute windows. A repeat arrives 100 seconds after the first copy. What happens?',
        opts: [
          { t: 'It is removed', fb: 'It is in another window, which cannot see the first copy.' },
          { t: 'It survives, and a MERGE on the id in the sink is the safety net', fb: '' },
          { t: 'The pipeline fails', fb: 'It does not fail.' },
          { t: 'It is counted as late', fb: 'It is simply a different element in another window.' }
        ],
        ok: 1,
        why: 'A window is the memory of the deduplication. In the recording one repeat survived with one-minute windows and none with five-minute windows.'
      }),

      B.order({
        id: 'm8-ord', t: 1, q: 'Put the design of a streaming pipeline in order.',
        items: [
          'Decide what the event time of an element is, and where it comes from',
          'Choose the window and the lateness that the question needs',
          'Parse, with a dead letter output for what fails',
          'Aggregate, and decide discarding or accumulating panes',
          'Write to a sink that can take a repeat or a replacement',
          'Set options: service account, network, max workers, labels',
          'Alert on freshness and on the size of the dead letter output'
        ],
        why: 'Time comes first, because every later choice depends on it. Parsing must never stop the stream. The sink decides what a repeat does. The options and the alerts make it safe to run.'
      }),

      B.qa({
        id: 'qa-window', t: 1, tag: 'Dataflow', secs: 90,
        q: 'Explain event time, the watermark, windows and late data.',
        pts: ['Event time against processing time', 'Windows by event time: fixed, sliding, session', 'The watermark estimates completeness', 'A late event: dropped, or a late firing with allowed lateness', 'Accumulating against discarding panes', 'The sink must take replacements or additions'],
        short: 'Event time is when something happened, and processing time is when the pipeline saw it. A till that was offline sends old events late, so I window by **event time**: fixed windows for per-minute counts, sliding ones for moving averages, and sessions for visits.\n\nThe **watermark** is the system\'s estimate that all events up to a time have arrived, and a window fires when it passes. An event that arrives after that is **late**. By default it is dropped. With an allowed lateness and a late trigger, the window fires again. Panes can **accumulate**, so the late pane replaces the earlier one, or **discard**, so it adds. The sink must match: replace or add. In my recording, with no lateness two of six events were lost, and with 120 seconds one was.',
        fu: [['How long should lateness be?', 'As long as the fast answer needs. A nightly batch job over the raw data fixes the long tail.'], ['What if the event has no time of its own?', 'Then the publish time is used, which is processing time in disguise.']],
        trap: 'Describing windows by processing time, or saying that the watermark is exact.',
        real: 'Tell me about a streaming result that was wrong because of late data.'
      }),

      B.qa({
        id: 'qa-df-dp', t: 2, tag: 'Dataflow', secs: 90,
        q: 'Dataflow, Dataproc or BigQuery: how do you choose?',
        pts: ['Start from the shape of the work', 'SQL in BigQuery first', 'Dataflow for streaming with time and state', 'Spark when the code or the skills exist', 'A function for small events, a transfer for plain moves', 'Write the reason down'],
        short: 'I start from the shape of the work. If the data is in BigQuery and the logic fits SQL, I use SQL, scheduled with Dataform: it is the cheapest to run and to read. If it is a stream that needs event-time windows, late data or state, I use Dataflow. If there is Spark code, or a library that only Spark has, I use Dataproc or Serverless Spark. For a few lines for each file or message I use a Cloud Run function, and if nothing needs to change a transfer does it.\n\nI choose the least machinery that does the job, and I write the reason in the design. "Because the stream needs windows and late data" is a reason. "Because we always use it" is not.',
        fu: [['When do you move away from SQL?', 'When the logic needs a loop, a library, or a model that SQL cannot express.'], ['And away from Dataflow?', 'When the stream is simple and lands as it is: a BigQuery subscription needs no job at all.']],
        trap: 'Choosing the tool you know best.',
        real: 'Describe a job that you moved from one of these to another, and why.'
      }),

      B.qa({
        id: 'qa-exactly', t: 2, tag: 'Dataflow', secs: 90,
        q: 'Is a Dataflow pipeline exactly-once?',
        pts: ['Processing is effectively once inside the pipeline', 'It removes repeats created by its own retries', 'The sink decides: Storage Write API with offsets can be exactly-once', 'A sink that appends is not', 'The source can repeat too: Pub/Sub is at least once', 'At-least-once mode is cheaper, with idempotent sinks'],
        short: 'Inside the pipeline, Dataflow streaming processes each element effectively once: it removes the repeats that its own retries would create. But exactly-once for the **result** depends on both ends. The source, Pub/Sub, is at least once, and the pipeline can drop repeats by an id attribute in a limited period. The sink decides the rest: the BigQuery Storage Write API with stream offsets can be exactly-once, and a sink that just appends is not.\n\nSo I design the end to be idempotent: a `MERGE` on the event id downstream. There is also an at-least-once streaming mode that is cheaper and faster, which suits pipelines whose sinks tolerate repeats. In my recording a window-based deduplication left one repeat that was outside its window, which is why the sink needs the key.',
        fu: [['What would you check in an incident about duplicates?', 'The source, the window of the deduplication, the write method of the sink, and whether the sink has a key.'], ['Does a bigger window help?', 'It remembers longer and costs more state. A key in the sink remembers for ever.']],
        trap: 'Saying yes without naming the sink.',
        real: 'Tell me about a duplicate that got through a pipeline, and where you fixed it.'
      }),

      B.qa({
        id: 'qa-update', t: 2, tag: 'Dataflow', secs: 75,
        q: 'How do you deploy a new version of a streaming job?',
        pts: ['Update in place if compatible, keeping state', 'Drain to stop cleanly and relaunch if not', 'Cancel only when state does not matter', 'Test in dev with replayed data', 'Version the template image', 'Watch freshness after the change'],
        short: 'I build the pipeline into a Flex Template image in CI, version it, and test it in dev with replayed data. For production I **update the running job in place** when the change is compatible, so that its windows and state are kept. If the change is not compatible, I **drain**: the job stops reading, finishes what is in flight and fires its open windows, and I launch the new version, usually reading from a snapshot or a timestamp so nothing is skipped. I use cancel only when the state does not matter.\n\nAfter a deploy I watch data freshness and the backlog for the first hour, and I have a rollback: the previous image and the same procedure.',
        fu: [['What makes an update incompatible?', 'Changing the shape of the state, for example renaming or restructuring a stateful step. Check the documentation for the rules of your version.'], ['How do you avoid a gap or a repeat?', 'Seek the subscription to a snapshot or a time before the stop, and rely on idempotent sinks for the overlap.']],
        trap: 'Cancelling and starting again without thinking of the state or the gap.',
        real: 'Describe a streaming deploy that went wrong, and how you would do it today.'
      }),

      B.recap({
        id: 'm8-recap', n: 8, badge: 'Beam Rider', color: '#DDD6FE',
        pts: [
          'Window by **event time**. The **watermark** is an estimate, and a late event is **dropped** unless you allow lateness.',
          'In the recording: no lateness **dropped ' + L.no_lateness.dropped + ' of 6** events, 120 seconds of lateness **dropped ' + L.late_discarding.dropped + '**. Accumulating panes **replace** (3 then 4), discarding panes **add** (3 then 1).',
          'A **session** closes after a gap: **' + S60.rows.length + '** sessions with 60 seconds, **' + S10.rows.length + '** with 10.',
          'A **dead letter** output keeps a bad record and its reason. Without it, a streaming job retries it **for ever**.',
          'A deduplication window is its own **memory**: it kept **' + DD.kept_with_60s_windows + '** of 40 distinct events with 60 seconds, **' + DD.kept_with_300s_windows + '** with 300. The sink needs a **key**.',
          'Options: a **service account**, **no public IPs**, **labels**, **max workers**. A **typo** in an option was silently **dropped**. Dataflow adds autoscaling, Streaming Engine, update and drain.'
        ],
        lines: [
          'I choose the window and the lateness from the question, and I say why.',
          'I send every bad record to a dead letter output and alert on it.',
          'I fail the build on a discarded option.'
        ]
      })
    ]
  });
})();
