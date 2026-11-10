/* Mission 13: drills that mix missions, a coding round, the boss round of interview questions, and a one-page review.
   The numbers in the review come from the recordings of the earlier missions (guarded below, so a new recording that changes them fails the lint)
   or from documentation, and the review says which. Nothing here ran on AWS. */
(function () {
  var B = LAB.b, G = LAB.get;

  /* Boss round: questions come from the earlier missions, in mission order. Tier 1 is the junior path,
     tier 2 adds the senior questions, tier 3 adds the rest. */
  var BOSS = [
    ['qa-map', 1], ['qa-accounts', 2], ['qa-s3', 1], ['qa-lake', 2], ['qa-iam', 1], ['qa-eval', 2], ['qa-xacct', 2],
    ['qa-glue', 1], ['qa-catalog', 1], ['qa-bookmark', 2],
    ['qa-athena', 1], ['qa-athena-cost', 1], ['qa-partition', 1], ['qa-ctas', 2], ['qa-athena-redshift', 2], ['qa-iceberg', 3],
    ['qa-redshift', 1], ['qa-diststyle', 1], ['qa-copy', 1], ['qa-slow', 2],
    ['qa-kinesis', 1], ['qa-partitionkey', 1], ['qa-cdc', 2], ['qa-delivery', 2],
    ['qa-events', 1], ['qa-sqs', 1], ['qa-idem', 2],
    ['qa-sfn', 1], ['qa-retry', 1], ['qa-design', 2], ['qa-dmap', 3],
    ['qa-kms', 1], ['qa-secrets', 1], ['qa-vpc', 2], ['qa-lakesec', 2],
    ['qa-costfind', 1], ['qa-monitor', 1], ['qa-finops', 2],
    ['qa-iac', 1], ['qa-cicd', 2]
  ];

  var SZ = G.counts('athena.sizes'), SC = G.counts('athena.scan'), SK = G.counts('kinesis.skew'), RD = G.counts('sqs.redrive'), ENV = G.counts('kms.envelope'), SEC = G.counts('secrets.versions');
  var SCH = G.counts('glue.schema_change'), ASS = G.counts('iam.assume'), AV = G.counts('asl.validate'), LINT = G.counts('cfn.lint'), RUN = G.counts('lambda.run'), EP = G.counts('events.patterns'), SHARDS = G.counts('kinesis.shards');
  var Q = {}; SC.queries.forEach(function (q) { Q[q.id] = q; });
  function num(n, d) { return n.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function mb(n, d) { return num(n / 1e6, d === undefined ? 1 : d) + ' MB'; }
  function kb(n) { return num(n / 1e3) + ' KB'; }
  G.expect(SZ.csv === 166660475 && SZ.parquet === 31811874 && SZ.days === 90 && Q.q5.bytes.parquet === 322658 && Q.q2.bytes.parquet_by_day === 21434, 'the Athena numbers in the review');
  G.expect(SK.by_key_ratio === 1.88 && SK.salted_ratio === 1.09 && SHARDS.shards.length === 4, 'the Kinesis numbers in the review');
  G.expect(RD.visibility_timeout_seconds === 2 && RD.max_receive_count === 2 && ENV.data_key_bytes === 32 && SEC.current_password === 'v2-password', 'the queue and key numbers in the review');
  G.expect(SCH.versions_before === 1 && SCH.versions_after === 2 && SCH.columns_now.length === 5 && SCH.partition_still_has_old_columns.length === 4, 'the catalog numbers in the review');
  G.expect(ASS.requested_duration_seconds === 900 && ASS.access_key_prefix === 'ASIA' && LINT.findings.length === 5 && LINT.bug_rc === 2 && RUN.second.results[0].status === 'already done', 'the credential, lint and handler facts in the review');
  G.expect(AV['pipeline_good.json'].valid === true && AV['pipeline_next_to_a_missing_state.json'].valid === false && EP.patterns.length === 6, 'the validator and pattern facts in the review');
  var BI = LAB.W.billInfo, T0 = BI.total(BI.lines(BI.presets.today.v)), ALLSAVE = T0 - BI.total(BI.lines(BI.presets.today.v, { parquet: true, life: true, gateway: true, flex: true, arm: true }));
  G.expect(Math.round(T0 * 100) === 101815 && Math.round(ALLSAVE * 100) === 16870, 'the bill numbers in the review');

  var MISSING = [
    'import boto3',
    '',
    's3 = boto3.client("s3")',
    'glue = boto3.client("glue")',
    '',
    '',
    'def missing_partitions(bucket, prefix, database, table):',
    '    found = set()',
    '    pages = s3.get_paginator("list_objects_v2").paginate(Bucket=bucket, Prefix=prefix, Delimiter="/")',
    '    for page in pages:',
    '        for cp in page.get("CommonPrefixes", []):',
    '            found.add(cp["Prefix"].rstrip("/").split("=")[-1])',
    '',
    '    registered = set()',
    '    for page in glue.get_paginator("get_partitions").paginate(DatabaseName=database, TableName=table):',
    '        for part in page["Partitions"]:',
    '            registered.add(part["Values"][0])',
    '',
    '    return sorted(found - registered)'
  ].join('\n');

  LAB.addChapter({
    id: 'm13', n: 13, title: 'Boss round and cheat sheet', short: 'Boss round', blurb: 'Drills that mix topics, a coding round, a mock interview and a one-page review', minutes: 55,
    focus: ['src', 'stg', 'int', 'mart', 'con', 'sf', 'air', 'mon', 'qual', 'snap', 'ci'],
    goals: [
      'Solve **drills** that combine several missions, with the first move and the reasoning.',
      'Write the **missing partitions** check with boto3, using paginators and sets.',
      'Answer a **mock interview round** against a timer, and grade yourself honestly.',
      'Keep a **one-page review** of the numbers, settings and decision rules.'
    ],
    say: 'This is the last mission. First two drills that mix topics, then a design decision and a coding round, then the boss round: real interview questions with no notes. Be honest when you grade yourself. Honest grades make the scorecard worth reading.',
    scenes: [
      B.incident({
        id: 'm13-inc1', t: 1, src: 'rec', title: 'Drill: the partner file arrived and nothing started', time: '07:05',
        alert: '**A partner uploaded `Raw/orders/dt=2026-03-14/orders-0001.json` at 06:02. By 07:00 no load has started.** The queue `raw-orders` is empty and its dead-letter queue is empty. Other files that arrived earlier this week started their loads. The EventBridge rule uses the prefix `raw/orders/`.',
        clues: ['The rule shows no matched events for this morning', 'The object exists in the bucket, and the key starts with a capital R', 'No function ran, and no message was sent to the queue'],
        opts: [
          { t: 'Test the real event against the rule pattern: the key differs in case, so the prefix never matched. Fix the path with the partner, move the object to the right key, and alarm on objects outside the expected prefixes', fb: '' },
          { t: 'Add retries to the rule', fb: 'A retry policy applies when delivery to a target fails. This event never matched, so there was nothing to retry.' },
          { t: 'Look into the dead-letter queue', fb: 'It is empty, as the alert says. The event never reached the target, so nothing could fail there.' },
          { t: 'Raise the concurrency of the Lambda function', fb: 'No function ran. The problem is before the function.' }
        ],
        best: 0,
        why: 'S3 keys are case sensitive and a prefix pattern is an exact string match. In the pattern lab, the prefix `raw/orders/` matched the order file and a temporary file, and nothing else. `Raw/orders/` is another prefix. The event reached EventBridge and no rule took it. A test of the real event against the pattern shows this in a minute.',
        checks: [
          ['Follow the path', 'Object, event, rule, queue, function. The queue is empty, so look at the rule.'],
          ['Check the rule metrics', 'MatchedEvents is zero for the morning.'],
          ['Test the pattern', 'TestEventPattern with the real event says no match. The key has a capital R.'],
          ['Repair', 'Ask the partner to fix the path, and copy the object to `raw/orders/dt=2026-03-14/` so that the load starts.'],
          ['Prevent it', 'An alarm or a scheduled check for objects that land outside the expected prefixes, and a note in the data contract about the exact path.']
        ],
        tell: 'A partner file did not start its load because the key began with a capital R, and the EventBridge rule matches the prefix raw/orders/, which is case sensitive. The queue and the dead-letter queue were empty because the event never matched. I tested the real event against the rule pattern to confirm it, copied the object to the right key so the load ran, and asked the partner to correct their path. We added a check for objects outside the expected prefixes and put the exact path in the data contract.',
        prevent: ['Test rule patterns with **real events**, including ones that must not match', 'Alarm on **objects outside the expected prefixes**', 'Put the **exact path** in the data contract', 'Remember that **S3 keys are case sensitive**']
      }),

      B.incident({
        id: 'm13-inc2', t: 2, src: 'docs', title: 'Drill: the Redshift table has orders twice after a retry', time: '09:20',
        alert: '**Revenue in the Redshift mart is 6 % higher than in the source system.** The nightly pipeline failed at 02:40 and retried at 02:55, and the second run finished. The pipeline copies the day of Parquet files into `mart.fct_orders`, which has a primary key on `order_id`. A Step Functions run shows success.',
        clues: ['A count by `order_id` shows 8,400 ids with two rows each', 'The first run had loaded part of the day before it failed', 'The load appends with COPY directly into the target table'],
        opts: [
          { t: 'Make the load safe to repeat: copy into a staging table, delete the matching ids in the target and insert, in one transaction, and add a row-count gate. Then remove the duplicates', fb: '' },
          { t: 'Rely on the primary key to reject duplicates', fb: 'Redshift does not enforce primary keys. It accepted both rows.' },
          { t: 'Disable the retry', fb: 'It hides the symptom and leaves a half-loaded day after every failure.' },
          { t: 'Resize the cluster', fb: 'Capacity has nothing to do with duplicate rows.' }
        ],
        best: 0,
        why: 'The first run loaded part of the day and failed. The retry loaded the whole day again into the same table, and Redshift keeps duplicate keys because primary keys are only information for the planner. A staging table with delete-then-insert in one transaction gives the same result for one run or two. A gate that compares the row count with the source would have failed the run.',
        checks: [
          ['Measure the damage', 'A count by order id shows which rows exist twice, and how many.'],
          ['Find the cause', 'Two runs on one day, and a load that appends.'],
          ['Check the constraint', 'The primary key is not enforced in Redshift.'],
          ['Repair the table', 'Delete the duplicates, keeping one row for each order id, then check the count against the source.'],
          ['Prevent it', 'Stage, delete matching ids, insert, commit. Add a row-count gate to the state machine, and name runs by date.']
        ],
        tell: 'Revenue in the mart was 6 percent too high because the nightly load ran twice. The first run failed after loading part of the day, and the retry loaded the whole day again, and our COPY went straight into the target table. Redshift does not enforce primary keys, so both copies stayed. I removed the duplicates, then changed the load to copy into a staging table, delete the matching order ids in the target and insert, all in one transaction. I added a row-count gate to the state machine, so a mismatch with the source fails the run.',
        prevent: ['Load through a **staging table** in one transaction', 'Do not rely on **primary keys** in Redshift', 'Add a **row-count gate** to the pipeline', 'Name runs by **date**, so a duplicate start is refused']
      }),

      B.decide({
        id: 'm13-dec', t: 2, src: 'docs', title: 'Decision: what do you build first in week one?',
        scenario: 'Brewline starts a data platform on AWS. You are the first data engineer. The analysts want a revenue dashboard in **three weeks**. There is **one empty account**, a partner that sends CSV files, and no structure yet.',
        opts: [
          { t: 'Point the dashboard at the raw CSV files with Athena and fix the structure later', d: 'The fastest first demo.', lose: 'Every query scans whole CSV files, nothing is governed or tested, and one dashboard on a 166 GB CSV table can cost thousands of dollars a month. Fixing it later means rewriting the dashboard and the access rules.' },
          { t: 'Set up accounts and guardrails, the lake zones, the catalog, a Parquet curated table made with CTAS, an Athena workgroup with a scan limit, a state machine for the nightly run, and everything as templates in Git', d: 'Structure first, one thin slice of data end to end.' },
          { t: 'Create the biggest Redshift cluster and load everything into it', d: 'Power first.', lose: 'A cluster to size and pay for around the clock before anyone knows the workload, with no zones, no catalog and nothing in code. Cost and operation grow before value does.' }
        ],
        pick: 1,
        why: 'A thin slice of the real structure gives the dashboard governed, cheap, fast tables from the first day: Parquet and partitions, a scan limit, a pipeline that orders itself and alerts, and templates that a pull request can lint. It is slower for the first demo and faster for every change after it.',
        when: 'If the first deadline is a demo that will be thrown away, a quick look at the raw files is a fair start, as long as there is a scan limit and nobody mistakes it for the platform.'
      }),

      B.challenge({
        id: 'm13-ch', t: 2, title: 'Coding round: which partitions are missing from the catalog?', file: 'missing_partitions.py', lang: 'python',
        q: 'A table `orders` in the Glue Data Catalog has one partition key, `dt`. The data lives in S3 under `curated/orders/dt=YYYY-MM-DD/`. **Write a function that returns the dates that have a folder in S3 and no partition in the catalog.** Use paginators, because both lists can be long.',
        data: [
          { name: 'folders under curated/orders/', cols: ['prefix'], rows: [['curated/orders/dt=2026-03-14/'], ['curated/orders/dt=2026-03-15/'], ['curated/orders/dt=2026-03-16/'], ['curated/orders/dt=2026-03-17/'], ['curated/orders/dt=2026-03-18/']] },
          { name: 'partitions in the catalog', cols: ['dt'], rows: [['2026-03-14'], ['2026-03-15'], ['2026-03-17']] }
        ],
        starter: '# list the folders with a delimiter, list the partitions, and compare\ndef missing_partitions(bucket, prefix, database, table):\n    ...',
        hints: ['List the "folders" of S3 with `Delimiter="/"`. They arrive as `CommonPrefixes`, in a paginator.', 'The catalog has its own paginator: `get_partitions`. Each partition has `Values`, a list with one value for each partition key.', 'Turn both sides into sets of date strings, and subtract. Sort the result.'],
        sol: MISSING,
        res: { msg: '2 dates are missing', cols: ['missing dt'], rows: [['2026-03-16'], ['2026-03-18']] },
        expl: ['`Delimiter="/"` makes S3 roll the keys up into `CommonPrefixes`. That is the folder list from mission 2, and a paginator reads every page of it.', '`get_partitions` returns the registered partitions. `Values[0]` is the value of the first key, here the date.', 'A set difference finds what is in S3 and not in the catalog. Sorting makes the output stable for a test or an alert.', 'The next step is to register the missing dates with `batch_create_partition`, or to switch the table to partition projection so that nothing needs registering (mission 4).'],
        cx: 'One pass over the S3 folders and one over the catalog partitions, so the time is linear in their number. Each page is one API call, so a table with 100,000 partitions makes about 100 calls to the catalog (a page holds up to 1,000 partitions).'
      }),

      B.mockRound(BOSS.map(function (b) { return b[0]; }), BOSS.map(function (b) { return b[1]; })),

      B.cheat({
        id: 'm13-cheat', t: 1, src: 'rec', title: 'One page to review',
        say: 'This is your last-minute review. Items marked (docs) come from documentation and were not run. Everything else comes from a recording or a check that the README describes. Take a screenshot or print the page.',
        sections: [
          { h: 'Account and S3', items: ['Account = security and billing boundary. Several accounts: development, production, logs (docs)', 'S3 has no folders. A key is a string. Prefix and delimiter group keys. A list returns at most 1,000 keys, so use a paginator', 'Versioning: a delete adds a marker, the old versions stay. Lifecycle: Standard-IA needs 30 days or more (docs)', 'Block Public Access, ACLs disabled, TLS-only deny, default encryption SSE-S3 (docs)', 'S3 events are at least once, and the key is URL-encoded. A conditional write (`IfNoneMatch="*"`) makes a handler safe to repeat'] },
          { h: 'IAM', items: ['Default deny. An explicit deny always wins. An allow in the identity policy or the resource policy lets the call through', 'Bucket ARN for `s3:ListBucket`, object ARN with `/*` for `GetObject` and `PutObject`. The wrong ARN fails quietly', 'AssumeRole returns temporary keys: access key starting with ' + ASS.access_key_prefix + ', a session token, ' + ASS.requested_duration_seconds + ' seconds in the recording', 'Cross-account: both sides allow, and the KMS key policy too. Pipelines use OIDC: a token, no stored keys (docs)'] },
          { h: 'Glue and the catalog', items: ['The catalog stores definitions and locations, not data. A folder is not a partition until it is registered, or the table uses partition projection (Athena only)', 'A schema change added a table version (' + SCH.versions_before + ' to ' + SCH.versions_after + ') and the old partitions kept ' + SCH.partition_still_has_old_columns.length + ' columns while the table had ' + SCH.columns_now.length, 'Glue job: workers times hours = DPU-hours. A DPU is 4 vCPUs and 16 GB. Example $0.44 for each DPU-hour (docs)', 'Bookmarks need `transformation_ctx` on every read, `job.commit()` and the option enabled. Not exactly once'] },
          { h: 'Athena', items: ['$5 per TB scanned, 10 MB minimum for each query (docs). Cost follows the bytes read', 'The same ' + num(SZ.rows) + ' orders: CSV ' + mb(SZ.csv) + ', Parquet ' + mb(SZ.parquet) + ', in ' + SZ.days + ' day files ' + mb(SZ.parquet_by_day), 'A status count read ' + kb(Q.q5.bytes.parquet) + ' of Parquet and ' + mb(Q.q5.bytes.csv) + ' of CSV. A day filter on day folders read ' + kb(Q.q2.bytes.parquet_by_day), 'CTAS: empty location, partition columns last, at most 100 partitions for each statement (docs). Workgroups: scan limit, result location, result reuse (docs)'] },
          { h: 'Redshift', items: ['Leader node plans, compute nodes work on slices. Serverless bills RPU-hours, provisioned bills node-hours (docs)', 'KEY on the join column, ALL for small dimensions, EVEN or AUTO otherwise. A key needs many values and none that dominates (docs)', 'EXPLAIN labels: DS_DIST_NONE and DS_DIST_ALL_NONE are good. DS_BCAST_INNER and DS_DIST_BOTH on big tables are not (docs)', 'COPY: many files of equal size, a multiple of the slices. Primary keys are not enforced: stage, delete, insert, commit (docs)'] },
          { h: 'Streaming', items: ['MD5 of the partition key picks the shard. ' + SHARDS.shards.length + ' shards, a quarter of the range each. A popular key made the busiest shard ' + num(SK.by_key_ratio, 2) + ' times the average, and a salt of 8 made it ' + num(SK.salted_ratio, 2), 'A shard takes about 1,000 records or 1 MB a second. Retention 24 hours up to 365 days. `put_records` can fail in part (docs)', 'Lambda on Kinesis retries without limit by default. Bisect, limit retries and age, report item failures, add a failure destination (docs)', 'Firehose writes when the size or the time buffer fills first. DMS writes I, U, D. Apply the newest change of each key'] },
          { h: 'Events and queues', items: ['A received SQS message is hidden for the visibility timeout (' + RD.visibility_timeout_seconds + ' seconds in the recording), then returns. After maxReceiveCount (' + RD.max_receive_count + ') it moves to the dead-letter queue', 'Visibility timeout at least six times the function timeout. DLQ retention longer than the source queue (docs)', 'EventBridge pattern: a list in a field is OR, fields are AND. Prefix matches are case sensitive. Retry up to 185 times or 24 hours (docs)', 'SNS fans out with filter policies and raw delivery. FIFO: group id for order, deduplication id within the window'] },
          { h: 'Orchestration', items: ['`.sync` waits for the job. Without it the state ends at once. Retry for errors that pass, Catch for the rest', 'Recorded retry: 30 s, rate 2, 5 attempts waits 930 seconds. A validator found a typo in `Next` before the deploy', 'Standard runs up to a year. Express runs at most 5 minutes (docs). Name a Standard run by date: a duplicate start is refused', 'Step Functions costs cents for a nightly pipeline. MWAA is about $0.49 an hour for the small class, always on (docs)'] },
          { h: 'Security', items: ['Envelope encryption: a data key (' + ENV.data_key_bytes + ' bytes) encrypts the data, KMS encrypts the data key. A different encryption context failed with ' + ENV.wrong_encryption_context.code, 'Secrets Manager labels: AWSCURRENT is ' + SEC.current_password + ', AWSPREVIOUS is ' + SEC.previous_password + '. Never log a secret value', 'S3 gateway endpoint: free. Interface endpoints: about $0.01 an hour and GB. NAT: about $0.045 an hour and GB (docs)', 'Column grants and masked views protect PII. A deletion reaches every copy, snapshot and version (docs)'] },
          { h: 'Cost and operations', items: ['A made-up month of Brewline cost $' + num(T0, 2) + '. Five savings together saved $' + num(ALLSAVE, 2) + ' (example rates)', 'Tags start their history on the day you activate them. Budget with a forecast alert, plus anomaly detection (docs)', 'A log group with no retention keeps its logs for ever. Alarm on queue depth, iterator age, failed runs and freshness', 'Remove waste before you commit to savings plans. Delete idle sandbox resources'] },
          { h: 'Infrastructure as code', items: ['Retain on every resource that holds data. Read the change set: Replacement of a bucket, database or stream is the danger', 'cfn-lint found ' + LINT.findings.length + ' mistakes in a second (' + LINT.findings.map(function (f) { return f.rule; }).join(', ') + ') and exits with code ' + LINT.bug_rc + '', 'pytest with moto tests your code with no account. It does not prove IAM or service behaviour', 'Pipeline: lint, test, assume a role with a token, change set, development, approval, production, nightly drift check (docs)'] },
          { h: 'Say it in one line', items: ['Follow the meter before you guess.', 'Read less data before you buy more compute.', 'Make every handler and every load safe to run twice.', 'Grant to roles, encrypt with keys you control, keep secrets in a store.', 'Say what you know from practice, and say when you would check the documentation.'] }
        ]
      }),

      B.recap({
        id: 'm13-recap', n: 13, badge: 'AWS Architect', color: '#FDE68A',
        pts: [
          'You can follow data from **files in S3 to a dashboard**, and say what each step costs, who can read it, and what happens when it fails.',
          'You choose by **evidence**: the bytes scanned before the SQL, the meter before the guess, the change set before the deploy.',
          'You make handlers and loads **safe to repeat**, protect data with **roles, keys, endpoints and column grants**, and keep structure in **templates**.',
          'You know which facts came from **recordings** and which from **documentation**, and you say so.',
          'Next: practise the answers out loud, then try the Brewline examples in a free-tier account with a budget alert set first.'
        ],
        lines: [
          'I read the meter and the first error before I change anything.',
          'I protect every key, every role and every stateful resource.',
          'I say what I know, and I say when I would check the documentation.'
        ]
      })
    ].reduce(function (all, x) { return all.concat(x); }, [])
  });
})();
