/* Mission 2: S3. Keys and prefixes, listing, layout and file sizes, versioning, storage classes and lifecycle, multipart uploads,
   presigned URLs, events, security and errors. The listings, versions, lifecycle round trip, multipart ETag, presigned URLs, conditional
   write and CLI output were recorded with boto3 and the AWS CLI against moto, an AWS emulator. Limits, classes and prices come from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var KEYS = G.counts('s3.keys').keys, LST = G.counts('s3.listing'), VS = G.counts('s3.versioning').steps, MP = G.counts('s3.multipart'), ER = G.counts('s3.errors'), CW = G.counts('s3.conditional_write');
  var CLI = G.counts('cli.runs').commands, PG = G.counts('s3.pages'), LIFE = G.file('s3/lifecycle.json'), V4 = G.text('s3.presign_v4'), V2 = G.text('s3.presign_v2');
  function L(p, d) { var r = LST.filter(function (x) { return x.prefix === p && x.delimiter === d; })[0]; if (!r) throw new Error('no recorded listing for ' + p + ' / ' + d); return r; }
  function cli(label) { var c = CLI.filter(function (x) { return x.label === label; })[0]; if (!c) throw new Error('no recorded command: ' + label); return c; }
  G.expect(KEYS.length === 10, 'the lake bucket holds ten objects');
  G.expect(L('raw/ord', '/').common_prefixes.join() === 'raw/orders/' && L('raw/ord', '').keys.length === 3, 'raw/ord with and without a delimiter');
  G.expect(L('', '/').common_prefixes.length === 3 && L('', '/').keys.join() === 'README.txt', 'the top level of the bucket: three prefixes and one object');
  G.expect(VS.length === 6 && VS[2].state.delete_markers.length === 1 && !VS[2].read.ok && VS[4].read.ok, 'the versioning timeline');
  G.expect(MP.matches_the_documented_rule && MP.too_small_error.code === 'EntityTooSmall', 'the multipart ETag rule and the too-small error');
  G.expect(CW.first_status === 200 && CW.second.code === 'PreconditionFailed' && CW.second.status === 412, 'a conditional write succeeds once and then fails with 412');
  G.expect(ER.get_missing_key.code === 'NoSuchKey' && ER.head_missing_key.code === '404' && ER.get_missing_bucket.code === 'NoSuchBucket', 'the three not-found errors');
  G.expect(PG.pages.length === 3 && PG.max_keys === 4, 'ten keys in pages of four');

  var PAGINATE_BUG = [
    'def count_objects(s3, bucket, prefix):',
    '    response = s3.list_objects_v2(Bucket=bucket, Prefix=prefix)',
    "    return len(response['Contents'])"
  ].join('\n');
  var PAGINATE_FIX = [
    'def count_objects(s3, bucket, prefix):',
    "    pages = s3.get_paginator('list_objects_v2').paginate(Bucket=bucket, Prefix=prefix)",
    "    return sum(len(page.get('Contents', [])) for page in pages)"
  ].join('\n');
  var LIFE_BUG = [
    's3.put_bucket_lifecycle_configuration(',
    "    Bucket='brewline-lake',",
    "    LifecycleConfiguration={'Rules': [{",
    "        'ID': 'raw-to-cheaper-storage', 'Status': 'Enabled', 'Filter': {'Prefix': 'raw/'},",
    "        'Transitions': [{'Days': 10, 'StorageClass': 'STANDARD_IA'}],",
    '    }]},',
    ')'
  ].join('\n');
  var LIFE_FIX = LIFE_BUG.replace("'Days': 10", "'Days': 30");

  function cliLines(labels) {
    var out = [];
    labels.forEach(function (l, n) {
      var c = cli(l);
      out.push({ c: 'cmd', t: '$ ' + c.command, d: n ? 700 : 350 });
      c.output.split('\n').forEach(function (ln) { out.push({ c: /^An error occurred|^fatal error/.test(ln) ? 'err' : /^upload:|^\(dryrun\)/.test(ln) ? 'ok' : 'out', t: ln, d: 45 }); });
    });
    return out;
  }

  LAB.addChapter({
    id: 'm2', n: 2, title: 'S3: the storage of the lake', short: 'S3', blurb: 'Keys, listing, file layout, versions, storage classes, multipart uploads, events and errors', minutes: 40,
    focus: ['stg', 'int'],
    goals: [
      'Explain a **bucket**, a **key** and a **prefix**, and why S3 has no folders.',
      'List objects with a **prefix and a delimiter**, and loop over pages.',
      'Lay out a lake: **zones, partition folders, file formats and file sizes**.',
      'Say what **versioning**, a **delete marker** and a **lifecycle rule** do.',
      'Choose a **storage class**, and read the main S3 errors.'
    ],
    say: 'Mission 2 is S3, the storage under the whole lake. It looks simple: put an object, get an object. The skill is in the details: how listing really works, how big the files should be, what a delete does in a versioned bucket, and what the bill counts. The listings, versions, uploads and CLI output you see here are recorded. The limits and prices come from documentation.',
    scenes: [
      B.talk({
        id: 'm2-talk', t: 1, src: 'docs', title: 'What S3 is',
        say: 'S3 is an object store. Press Next for the six ideas that everything else builds on.',
        items: [
          ['Buckets, keys and objects', 'A **bucket** is a container with a globally unique name. An **object** is a blob of bytes with a **key**, its name inside the bucket, plus metadata. You write and read whole objects over HTTP. You cannot append to an object or edit part of it.', 'Whole objects, addressed by key.'],
          ['No folders', 'A key such as `raw/orders/dt=2026-03-14/orders-0001.json` is one string. The slashes are just characters. The console shows folders because it groups keys by a delimiter. The lab in this mission shows how.', 'A key is a string, not a path.'],
          ['Strong consistency', 'After a successful write, every later read and list sees it. Since December 2020, S3 gives this for new objects, overwrites, deletes and lists, at no extra cost. Old advice about waiting for a listing to catch up is out of date.', 'Read what you wrote, at once.'],
          ['Durability and availability', 'S3 Standard is designed for 99.999999999 percent durability, called eleven nines, by storing data across at least three Availability Zones. Durability is not backup: a delete or an overwrite is durable too.', 'Safe from hardware loss, not from mistakes.'],
          ['Size and speed', 'A single object can be very large. Uploads of big files go in parts, in parallel. S3 supports at least 3,500 writes and 5,500 reads a second for each partitioned prefix, and it scales further by spreading keys over prefixes.', 'Many prefixes, many requests.'],
          ['What you pay for', 'Storage in GB-months, requests, data retrieval for the cooler classes, and data leaving AWS or crossing Regions. Mission 1 called these meters.', 'Storage, requests, retrieval, transfer.']
        ],
        cols: 1
      }),

      B.widget({ id: 'm2-list-lab', kind: 'listing', t: 1, src: 'rec', title: 'Lab: prefixes and delimiters' }),

      B.term({
        id: 'm2-cli', t: 1, src: 'rec', title: 'The AWS CLI against S3',
        say: 'These are real commands and real output of the AWS CLI, run against the emulator on a bucket with a few order files. Watch the dry run, then the sync, then two ways to look at the result.',
        lines: function () { return cliLines(['sync, dry run', 'sync', 'list a prefix', 'list as a table', 'sum the sizes', 'a bucket that does not exist']); },
        after: '`s3 sync` copies only what is missing or different. `--dryrun` shows what it would do first. `--query` is a JMESPath filter that the CLI applies after the call, so `sum(Contents[].Size)` costs one list call. The last command shows how a failure looks: the service error code in words, and exit code 255.',
        afterKind: 'tip',
        doneSay: 'Use `--dryrun` before every sync that deletes or overwrites, and `--query` instead of piping output to other tools.'
      }),

      B.cmp({
        id: 'm2-layout', t: 1, src: 'docs', title: 'Laying out the lake',
        say: 'A lake needs a layout that people and jobs can predict. Press Next to read the choices. These are common practice and AWS guidance, not rules of S3 itself.',
        cols: ['Decision', 'A good default', 'Why'],
        hl: 1,
        rows: [
          ['Zones', 'A prefix for each zone: `raw/`, `clean/`, `curated/`', 'Each zone has different writers, readers and retention.'],
          ['Datasets', 'One prefix for each table: `raw/orders/`', 'A table is a prefix. The catalog points at it.'],
          ['Partitions', 'Hive-style folders: `dt=2026-03-14/`', 'Athena, Glue and Spark read the folder names as columns, and skip the folders a query does not need.'],
          ['Format', 'Parquet with Snappy or Zstandard compression in clean and curated', 'Columnar files let a query read only the columns it names, and they are small.'],
          ['File size', 'About 128 MB to 1 GB for each file', 'Fewer, larger files mean fewer requests and less overhead. Thousands of tiny files slow every query.'],
          ['Partition column', 'Low cardinality, such as the date, that queries filter on', 'A column with millions of values creates millions of tiny folders.'],
          ['Names', 'Lower case, no spaces, no special characters', 'Spaces and symbols are URL-encoded in events and trip up tools.']
        ],
        steps: [
          { upto: 3, say: 'Zones, datasets and partitions give every file a predictable address.' },
          { upto: 5, say: 'Format and size decide how fast and how cheap each query is.' },
          { upto: 7, say: 'Partition on what queries filter on, and keep names boring.' }
        ],
        pick: 'Partition by **date**, write **Parquet files of 128 MB or more**, and keep **one prefix for each table**. Change one of those only with a measured reason.'
      }),

      B.talk({
        id: 'm2-files', t: 1, src: 'docs', title: 'File formats and sizes',
        say: 'The file format sets the size of the files and the bytes a query reads. Press Next for each format.',
        items: [
          ['CSV and JSON lines', 'Text, one row at a time, easy to produce and to read. A query must read every column of every row it touches, and every value is parsed from text. Good for landing data. Poor for repeated queries.', 'Easy in, expensive to scan.'],
          ['Parquet and ORC', 'Columnar: each column is stored apart, compressed and with min and max statistics for each block. A query reads only the columns it names and can skip blocks. The format of choice for clean and curated data.', 'Cheap to scan.'],
          ['Avro', 'Row-based with the schema stored in the file and good support for schema changes. Common on streams and for landing data that must keep its schema. Convert to Parquet for analytics.', 'The schema travels with the data.'],
          ['Compression', 'Snappy is fast and fairly small. Zstandard is smaller at a similar speed. Gzip is small but a single gzip file cannot be split across workers, so one worker reads the whole file.', 'Prefer Snappy or Zstandard.'],
          ['Many small files', 'Every file costs a request and a footer read, and each worker task has a fixed start-up cost. A million 50 KB files are far slower and dearer than a hundred 500 MB files holding the same data. Compact small files into big ones.', 'The small-file problem.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'Mission 5 measures it.', t: 'The Athena lab writes the same 2 million orders in five layouts and shows the bytes a query reads from each.' }
      }),

      B.widget({ id: 'm2-version-lab', kind: 'versions', t: 1, src: 'rec', title: 'Lab: versions and delete markers' }),

      B.cmp({
        id: 'm2-class', t: 1, src: 'docs', title: 'Storage classes',
        say: 'A storage class trades the price of storage against the price and speed of getting the data back. Press Next to read them. The prices are example US rates for each GB-month, and AWS changes them.',
        cols: ['Class', 'Use it for', 'Minimum time', 'Example storage price', 'Catch'],
        hl: 1,
        rows: [
          ['Standard', 'Data you read often', 'none', '$0.023', 'The reference price.'],
          ['Intelligent-Tiering', 'Data with unknown or changing access', 'none', 'Standard price, plus a small fee for each object', 'S3 moves objects between tiers by access. A monitoring fee applies to each object, and very small objects are not tiered.'],
          ['Standard-IA', 'Rarely read, needs quick access', '30 days', '$0.0125', 'A retrieval fee for each GB read, and a minimum billable object size.'],
          ['One Zone-IA', 'Rarely read, easy to re-create', '30 days', 'Lower than Standard-IA', 'One Availability Zone only. A zone loss loses the data.'],
          ['Glacier Instant Retrieval', 'Archive that you still read in milliseconds', '90 days', '$0.004', 'A higher retrieval fee.'],
          ['Glacier Flexible Retrieval', 'Archive read in minutes to hours', '90 days', 'Lower than Instant Retrieval', 'You request a restore and wait.'],
          ['Glacier Deep Archive', 'Long-term archive', '180 days', 'About $0.001', 'Restores take hours. The cheapest storage, the slowest return.'],
          ['Express One Zone', 'Very low latency, read very often by many jobs', 'none', 'Higher than Standard', 'One zone, directory buckets, and cheaper requests than Standard.']
        ],
        steps: [
          { upto: 3, say: 'Standard for hot data. Intelligent-Tiering when you cannot predict access. Standard-IA when you can.' },
          { upto: 6, say: 'The Glacier classes are for archives. Pay attention to the minimum time. Delete early and you still pay for the whole minimum.' },
          { upto: 8, say: 'Deep Archive is the cheapest and slowest. Express One Zone goes the other way: more for storage, less for requests and latency.' }
        ],
        pick: 'Keep **recent raw and curated data in Standard**, move **raw data older than 30 days** to Standard-IA or Intelligent-Tiering by lifecycle rule, and **archive** what the law makes you keep. Check the **minimum time and retrieval fee** before each move.'
      }),

      B.code({
        id: 'm2-life', t: 1, src: 'rec', title: 'A lifecycle rule, as stored by S3', file: 'lifecycle.json', lang: 'json', code: LIFE,
        steps: [
          { say: 'A lifecycle configuration is a list of rules. This one has two. S3 evaluates them once a day, so a transition happens within a day or so of the date, not at an exact second.', lines: null },
          { say: 'The first rule applies to objects under `raw/`. `Filter` chooses which objects. An empty prefix would mean the whole bucket.', lines: G.span(LIFE, /"ID": "raw-to-cheaper-storage"/, /"Prefix": "raw\/"/) },
          { say: 'Transitions move objects to a cooler class by age. At 30 days to Standard-IA, at 90 days to Glacier. The age counts from the creation of the object.', lines: G.span(LIFE, /"Transitions"/, /"StorageClass": "GLACIER"/) },
          { say: '`Expiration` deletes the object after 365 days. In a versioned bucket it adds a delete marker instead, which is why you also need a rule for noncurrent versions.', lines: G.span(LIFE, /"Expiration"/, /"Days": 365/) },
          { say: 'The second rule is housekeeping that every bucket should have. It aborts multipart uploads that were never completed. Their parts stay in the bucket and are billed until somebody aborts them.', lines: G.span(LIFE, /clean-up-failed-uploads/, /DaysAfterInitiation/) }
        ],
        note: 'I sent this configuration with boto3 and read it back, and S3 returned the same two rules. A misspelled field never reaches S3: the SDK checks the request against the service model first. `Expiration: {"Day": 365}` raised `ParamValidationError: ' + G.counts('s3.param_validation').message + '`.'
      }),

      B.talk({
        id: 'm2-multi', t: 1, src: 'rec', title: 'Multipart uploads',
        say: 'Large files go to S3 in parts. I uploaded one file in three parts and measured what S3 returned. Press Next for each point.',
        items: [
          ['Why parts', 'You split a large file into parts. The documentation allows parts of 5 MiB to 5 GiB and up to 10,000 parts. The parts upload in parallel, a failed part is retried alone, and nothing is visible until you complete the upload. The AWS SDKs and the CLI do this for you above a size threshold.', 'Parallel, resumable, atomic at the end.'],
          ['The ETag is not an MD5 of the file', 'For a multipart object, the ETag is the MD5 of the concatenated MD5 digests of the parts, followed by a dash and the number of parts. For these three parts it was `' + MP.final_etag + '`, and my own calculation gave the same value. Do not compare it with the MD5 of the whole file. Use a checksum algorithm such as SHA-256 when you need to verify.', 'Do not trust the ETag as a file hash.'],
          ['Every part but the last must be large enough', 'I tried to complete an upload whose parts were 1 KB. S3 answered `' + MP.too_small_error.code + '` with HTTP ' + MP.too_small_error.status + '. Only the last part may be smaller than 5 MiB.', 'Parts below 5 MiB fail, except the last.'],
          ['Unfinished uploads cost money', 'The parts of an upload that was never completed stay in the bucket and are billed. A lifecycle rule with `AbortIncompleteMultipartUpload` removes them. The rule on the previous screen does that after 7 days.', 'Clean up with a lifecycle rule.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm2-presign', t: 1, src: 'rec', title: 'A presigned URL', file: 'presigned_url.txt', lang: 'text', code: V4,
        steps: [
          { say: 'A presigned URL gives temporary access to one object without giving away credentials. boto3 built this one offline, with the dummy keys of the documentation and a frozen clock. The URL is the object address plus a signed query string.', lines: null },
          { say: 'The algorithm and the credential scope. The scope names the access key, the date, the Region and the service. The secret key itself is not in the URL.', lines: G.span(V4, /X-Amz-Algorithm/, /X-Amz-Credential/) },
          { say: 'The date of signing and the lifetime. `X-Amz-Expires=900` means the URL stops working 900 seconds after it was signed. The documentation gives a maximum of 7 days for long-term keys. With temporary keys from a role the URL also ends when the session ends, which can be much sooner.', lines: G.span(V4, /X-Amz-Date/, /X-Amz-Expires/) },
          { say: 'The signed headers and the signature. Anyone who holds this URL can fetch the object until it expires, so treat it like a password and keep the lifetime short.', lines: G.span(V4, /X-Amz-SignedHeaders/, /X-Amz-Signature/) }
        ],
        note: 'For us-east-1, botocore signs with the older signature version 2 when you do not ask for version 4. That form has only three query parameters: `' + G.counts('s3.presign').v2_params.join('`, `') + '`. Ask for `signature_version="s3v4"` in the client configuration to get the form above.'
      }),

      B.code({
        id: 'm2-cond', t: 2, src: 'rec', title: 'A write that cannot happen twice', file: 'conditional_write.py', lang: 'python',
        code: ["first = s3.put_object(Bucket='brewline-lake', Key='curated/orders/dt=2026-03-14/_SUCCESS', Body=b'', IfNoneMatch='*')", '', 'try:', "    s3.put_object(Bucket='brewline-lake', Key='curated/orders/dt=2026-03-14/_SUCCESS', Body=b'', IfNoneMatch='*')", 'except ClientError as err:', "    print(err.response['Error']['Code'], err.response['ResponseMetadata']['HTTPStatusCode'])"].join('\n'),
        steps: [
          { say: 'S3 supports conditional writes. `IfNoneMatch="*"` means: write this object only if no object has this key. It is a lock-free way to make one writer win.', lines: [1, 1] },
          { say: 'The first call succeeded with HTTP ' + CW.first_status + '.', lines: [1, 1] },
          { say: 'The second call asked for the same key. S3 answered `' + CW.second.code + '` with HTTP ' + CW.second.status + ': the condition did not hold. A retry of a job, or two jobs racing to publish the same marker, cannot overwrite each other.', lines: [3, 6] }
        ],
        note: 'Use it for marker files, for idempotent outputs with a deterministic key, and for leader election. A conditional write is documented for S3. The emulator reproduced the documented outcome, and mission 8 uses it inside a Lambda handler.'
      }),

      B.flow({
        id: 'm2-events', t: 1, src: 'docs', title: 'Events, writers and lifecycle around a bucket', g: 's3', legend: true,
        steps: [
          { say: 'One bucket, three things around it. Writers put objects in. S3 raises events when objects appear. A lifecycle rule moves old objects to cheaper classes and finally deletes them.', cap: 'A bucket with writers, events and lifecycle.' },
          { say: 'Step 1. Writers put objects under prefixes. A stream delivery service writes raw files, a Glue job writes curated files, and people or scripts upload with the CLI.', on: ['s1', 's1b', 's1c'], focus: ['w1', 'w2', 'w3', 'pr', 'pc'], cap: 'Every write is a whole object.' },
          { say: 'Step 2. When an object is created or deleted, S3 can raise an event. The event carries the bucket and the object key, URL-encoded.', on: ['s2'], focus: ['pr', 'nt'], cap: 'An event for each new object.' },
          { say: 'Step 3. Send events to Amazon EventBridge, where rules choose which events reach which target, or send them straight to a queue, a topic or a function. EventBridge can filter on prefix, suffix and size.', on: ['s3', 's4'], focus: ['nt', 'eb', 'tg'], cap: 'Rules decide who hears about an object.' },
          { say: 'Step 4. Lifecycle rules run on their own. After 30 days, objects move to Standard-IA, after 90 to Glacier, after 365 they are deleted. Each hop changes the price of storage.', on: ['l1', 'l2', 'l3'], focus: ['cl1', 'cl2', 'cl3', 'cl4'], tags: ['tg_life'], cap: 'Age decides the class.' }
        ]
      }),

      B.cmp({
        id: 'm2-secure', t: 2, src: 'docs', title: 'Locking a bucket down',
        say: 'Six settings protect a bucket that holds personal data. Press Next to read them. Recent buckets have some of them by default, so check what your account has.',
        cols: ['Setting', 'What it does', 'Notes'],
        hl: 1,
        rows: [
          ['Block Public Access', 'Refuses any policy or ACL that makes objects public.', 'Turn it on for the account and for every bucket. New buckets have it on by default.'],
          ['Object Ownership: bucket owner enforced', 'Disables ACLs, so only policies grant access.', 'The default for new buckets. Fewer ways to grant access means fewer mistakes.'],
          ['Default encryption', 'Encrypts every new object at rest.', 'S3 applies SSE-S3 to all new objects. Choose SSE-KMS when you need your own key, an audit trail of key use or the power to revoke. S3 Bucket Keys cut the KMS request cost.'],
          ['A deny for plain HTTP', 'A bucket policy denies any request where `aws:SecureTransport` is false.', 'Keeps all traffic on TLS.'],
          ['Versioning, with a lifecycle rule', 'Keeps old versions and delete markers, so a mistake can be undone.', 'Add `NoncurrentVersionExpiration` or the old versions pile up. MFA delete adds a second factor for permanent deletes.'],
          ['Logging', 'CloudTrail data events record who read or wrote which object. Server access logs are a cheaper, coarser option.', 'Send them to the log account.']
        ],
        steps: [
          { upto: 3, say: 'Access first: no public access, no ACLs, and encryption at rest.' },
          { upto: 6, say: 'Then transport, recovery and the audit trail. The last two answer what an auditor asks.' }
        ],
        pick: 'Turn on **Block Public Access**, **owner enforced**, **KMS encryption** for sensitive data, a **TLS-only** policy and **versioning with a lifecycle rule**, and send the trail to the **log account**.'
      }),

      B.cmp({
        id: 'm2-errors', t: 1, src: 'rec', title: 'What S3 says when it says no',
        say: 'Six calls that failed on purpose, and what S3 answered. Press Next to read them. The first four are recorded. The last two come from documentation.',
        cols: ['The call', 'Code', 'HTTP', 'What it means'],
        hl: 1,
        rows: [
          ['`get_object` of a key that does not exist', ER.get_missing_key.code, String(ER.get_missing_key.status), 'The bucket is there and the key is not. In a versioned bucket, a delete marker gives the same answer.'],
          ['`head_object` of a key that does not exist', ER.head_missing_key.code, String(ER.head_missing_key.status), 'A HEAD answer has no body, so the SDK shows the status as the code. Handle `"404"` as well as `NoSuchKey`.'],
          ['`get_object` on a bucket that does not exist', ER.get_missing_bucket.code, String(ER.get_missing_bucket.status), 'A wrong name, a wrong Region or a deleted bucket.'],
          ['`put_object` with `IfNoneMatch="*"` on an existing key', CW.second.code, String(CW.second.status), 'The condition failed. The existing object is untouched.'],
          ['A call without permission (mission 3)', 'AccessDenied', '403', 'No statement allows it, or a statement denies it. S3 does not say which, so you read the policies.'],
          ['Too many requests to one prefix (docs)', 'SlowDown', '503', 'Retry with exponential backoff and spread the keys over more prefixes.']
        ],
        steps: [
          { upto: 3, say: 'Not found, three ways. The bucket, the key and the HEAD request each look a little different.' },
          { upto: 4, say: 'A failed condition is an error you expect, and you handle it as a normal outcome.' },
          { upto: 6, say: 'Access and throttling. Read mission 3 for the first, and the incident later in this mission for the second.' }
        ],
        pick: 'Catch the **error code**, not the message. Handle **`404` and `NoSuchKey`** for missing keys, treat **`PreconditionFailed`** as an outcome, and **retry `SlowDown`** with backoff.'
      }),

      B.quiz({
        id: 'm2-q1', t: 1,
        q: 'You list the lake with `Prefix="raw/ord"` and `Delimiter="/"`. What do you get back?',
        opts: [
          { t: 'The three keys that start with `raw/ord`', fb: 'That is what you get with no delimiter. With `/` the keys are rolled up.' },
          { t: 'One common prefix: `' + L('raw/ord', '/').common_prefixes[0] + '`', fb: '' },
          { t: 'An error, because `raw/ord` is not a folder', fb: 'S3 has no folders, so there is nothing to be invalid. The prefix is just a string.' },
          { t: 'An empty list, because no key is exactly `raw/ord`', fb: 'A prefix matches the start of a key, not the whole key.' }
        ],
        ok: 1, why: 'Every key under `raw/ord` goes through the delimiter rule: S3 cuts each key at the next `/` after the prefix and returns the distinct cuts as common prefixes. All three keys lead to `raw/orders/`. The recorded call returned exactly that.'
      }),

      B.quiz({
        id: 'm2-q2', t: 1,
        q: 'In a bucket with versioning on, a job calls `delete_object` on `report.csv` without a version id. What happens?',
        opts: [
          { t: 'The object and all its versions are deleted for good', fb: 'Only a delete with a version id removes a version for good.' },
          { t: 'S3 adds a delete marker. The versions stay, and a plain GET answers ' + VS[2].read.code, fb: '' },
          { t: 'S3 returns an error, because versioned objects cannot be deleted', fb: 'The call succeeds. It just does not remove data.' },
          { t: 'S3 deletes only the newest version', fb: 'That needs the version id of the newest version.' }
        ],
        ok: 1, why: 'The recorded run shows it: after the delete, the stack held the delete marker on top of two versions, and a plain GET returned ' + VS[2].read.code + '. Deleting the marker by its version id made the object readable again. This is also why a "deleted" object still costs money.'
      }),

      B.quiz({
        id: 'm2-q3', t: 1,
        q: 'A script calls `list_objects_v2` once on a prefix with 3,500 objects and counts the keys. What does it count?',
        opts: [
          { t: 'All 3,500 keys', fb: 'One call returns at most 1,000 keys.' },
          { t: 'At most 1,000 keys, and `IsTruncated` is true', fb: '' },
          { t: 'Zero keys, because the prefix is too big', fb: 'The call works. It just returns a page.' },
          { t: '5,500 keys, which is the request limit', fb: 'That number is a request rate, not a page size.' }
        ],
        ok: 1, why: 'A list call returns up to 1,000 keys and a continuation token. The recorded run used a page size of ' + PG.max_keys + ' and needed ' + PG.pages.length + ' calls for ten keys. Use the paginator, or loop on the token.'
      }),

      B.quiz({
        id: 'm2-q4', t: 1,
        q: 'Which statement about S3 consistency is correct today?',
        opts: [
          { t: 'A new object may take minutes to appear in a listing', fb: 'That was true before December 2020.' },
          { t: 'After a successful write, reads and lists see the new data at once', fb: '' },
          { t: 'Overwrites are eventually consistent, new objects are strongly consistent', fb: 'That was the old rule. Overwrites and deletes are strongly consistent now.' },
          { t: 'Consistency depends on the storage class', fb: 'It does not.' }
        ],
        ok: 1, why: 'S3 has given strong read-after-write consistency for all requests since December 2020. Code that waits or retries a listing for consistency is out of date. Mind that a pipeline can still read a file before the job that writes it has finished.'
      }),

      B.order({
        id: 'm2-ord', t: 1, q: 'Put the upload of a 20 GB file with the multipart API in order.',
        items: [
          'Start the upload and keep the upload id',
          'Upload each part with its number, in parallel, and keep each ETag',
          'Retry any part that failed, alone',
          'Complete the upload with the list of part numbers and ETags',
          'Verify the result with a checksum, not with the ETag',
          'Abort the upload if you give up, so the parts are not billed'
        ],
        why: 'Start, upload in parallel, retry single parts, complete, verify, clean up. Nothing is visible as an object until you complete. A lifecycle rule for incomplete uploads catches the cases where nobody aborts.'
      }),

      B.bug({
        id: 'm2-bug', t: 1, q: 'This function should count the objects under a prefix. It returns the wrong number for big prefixes and crashes on empty ones. Click a line that is wrong.',
        file: 'count_objects.py', lang: 'python', code: PAGINATE_BUG, bad: [2, 3],
        hint: 'One list call returns a page, and a page of nothing has no `Contents` key.',
        why: 'Line 2 reads one page, so a prefix with more than 1,000 objects is undercounted. Line 3 indexes `Contents`, which S3 leaves out of the response when nothing matches, so an empty prefix raises `KeyError`. The paginator loops over pages for you, and `get("Contents", [])` handles the empty page.',
        fix: PAGINATE_FIX,
        cheer: 'Every list call in production code needs a paginator.'
      }),

      B.bug({
        id: 'm2-bug2', t: 2, src: 'docs', q: 'A lifecycle rule should move old raw data to a cheaper class. S3 rejects it. Click the line that causes it.',
        file: 'lifecycle.py', lang: 'python', code: LIFE_BUG, bad: [5],
        hint: 'The cheaper class has a minimum age for a transition.',
        why: 'A transition to Standard-IA or One Zone-IA is allowed only for objects that are at least 30 days old, so `Days` must be 30 or more. The documentation gives this rule, and I did not see it enforced by the emulator, so it is not recorded here. A smaller age also makes no money sense: the class bills a minimum of 30 days anyway.',
        fix: LIFE_FIX,
        cheer: 'Reading the minimum age before you write the rule saves a failed deployment.'
      }),

      B.decide({
        id: 'm2-dec', t: 2, src: 'docs', title: 'Decision: how do you store the 40 TB raw zone?',
        scenario: 'The raw zone holds **40 TB** of order and event files. The newest week is read daily. Older data is read rarely, in bursts, when someone re-runs a month. Nobody can predict which month. The team wants **low cost and no manual work**.',
        opts: [
          { t: 'Keep everything in Standard', d: 'Simple. No retrieval fees.', lose: 'About $920 a month for 40 TB at $0.023, when most of the data is rarely read. Over a year this is the most expensive choice.' },
          { t: 'A lifecycle rule moves objects to Standard-IA after 30 days', d: 'About $500 a month for the old data. Cheap and predictable.', lose: 'Each re-run of an old month pays a retrieval fee for each GB read, and objects under the minimum billable size cost more than they should. If re-runs are common, the fees can cancel the saving.' },
          { t: 'Intelligent-Tiering for the raw zone', d: 'S3 watches access and moves each object. No retrieval fees between its tiers, and no planning.' }
        ],
        pick: 2,
        why: 'Access is bursty and unpredictable, which is the case Intelligent-Tiering is built for. It charges a small monitoring fee for each object and does not tier objects below 128 KB, so it suits large files, which the lake should have anyway. Add a lifecycle rule for the oldest data that the law makes you keep.',
        when: 'If access is predictable, for example data is never read after 30 days, a plain lifecycle rule to Standard-IA or Glacier is cheaper. Do the arithmetic with your own object count and retrieval pattern before you choose.'
      }),

      B.incident({
        id: 'm2-inc', t: 2, src: 'docs', title: 'Incident: ingestion fails with SlowDown', time: '14:05',
        alert: '**The clickstream loader logs `SlowDown` (HTTP 503) on thousands of writes a minute.** The loader receives about 20,000 events a second and writes each event as its own object under the single prefix `raw/events/`. Retries pile up and the backlog grows.',
        clues: ['One object for each event', 'All keys share the prefix `raw/events/`', 'S3 supports at least 3,500 writes a second for each partitioned prefix'],
        opts: [
          { t: 'Batch events into larger objects, and spread the keys over several prefixes', fb: '' },
          { t: 'Retry faster, with no delay, until the writes get through', fb: 'Faster retries add load to a throttled prefix and make the backlog worse. Retries need exponential backoff.' },
          { t: 'Ask AWS to raise the S3 request limit for the bucket', fb: 'The rate limit is a property of a prefix, and the fix is a better key design, not a quota.' },
          { t: 'Switch to the Glacier storage class for the raw zone', fb: 'The storage class does not change the request rate limit.' }
        ],
        best: 0,
        why: 'At 20,000 writes a second on one prefix, the loader is above 3,500 by almost a factor of six. One object for each event also creates millions of tiny files that every later query must open. Batch 100 or more events for each object, which cuts the write rate to about 200 a second and gives files that are cheap to read, and spread the keys over prefixes by date and hour.',
        checks: [
          ['Read the error', '`SlowDown` with HTTP 503 means the request rate to a prefix is too high. It is a signal to slow down and spread out.'],
          ['Count the rate', '20,000 writes a second divided by 3,500 is at least 6 prefixes, and that ignores the tiny-file problem.'],
          ['Check the key design', 'One prefix, one object for each event. Both are the problem.'],
          ['Fix the writer', 'Put events through Firehose or batch in the loader. Write objects of 64 MB or more, under date and hour prefixes.'],
          ['Protect the writer', 'Use exponential backoff with jitter for every retry, and alarm on 503 responses.']
        ],
        tell: 'Our loader wrote one S3 object for each click event, about 20,000 a second, all under one prefix, and S3 answered SlowDown because a prefix supports at least 3,500 writes a second. I stopped the immediate retries, which made it worse, and changed the loader to batch events into objects of about 64 MB under date and hour prefixes through Firehose. The write rate fell to a few a second and the later queries got faster, because they now open far fewer files. I added exponential backoff with jitter and an alarm on 503 responses.',
        prevent: ['Never write **one object for each event**', 'Put **Firehose or a batching step** in front of S3', 'Use **date and hour prefixes** and keep objects large', 'Retry with **backoff and jitter**, and alarm on throttling']
      }),

      B.incident({
        id: 'm2-inc2', t: 2, src: 'docs', title: 'Incident: the storage bill doubled', time: '09:40',
        alert: '**S3 storage cost for one bucket doubled in six weeks, and the amount of live data did not change.** The bucket holds about 82 TB and has versioning on. A nightly job overwrites the same 2 TB curated table in place every night. Nobody set a lifecycle rule for old versions.',
        clues: ['Versioning keeps every overwritten object as a noncurrent version', 'The job overwrites the same keys every night', 'The live data is still about 82 TB'],
        opts: [
          { t: 'Add a lifecycle rule that expires noncurrent versions after a few days, and write new partitions instead of overwriting', fb: '' },
          { t: 'Turn off versioning on the bucket', fb: 'You cannot turn versioning off once it is on, only suspend it. Suspending keeps the existing versions and costs, and it removes the protection you wanted.' },
          { t: 'Delete the bucket and restore from backup', fb: 'That is a drastic way to remove old versions, and it risks the live data.' },
          { t: 'Move all objects to Glacier', fb: 'The noncurrent versions would still exist and still be billed, in a slower class.' }
        ],
        best: 0,
        why: 'Every nightly overwrite keeps the old copy as a noncurrent version, so 42 nights of 2 TB is about 84 TB of old versions on top of 82 TB of live data, which is why the bill doubled. A `NoncurrentVersionExpiration` rule removes them after a set age. Better still, write each night to a new date partition and never overwrite, so there are no versions to pile up.',
        checks: [
          ['Compare live and total', 'S3 Storage Lens or S3 Inventory shows current and noncurrent bytes. Noncurrent is far larger.'],
          ['Find the writer', 'The nightly job overwrites the same keys.'],
          ['Add the rule', '`NoncurrentVersionExpiration` after 7 days, and keep a few newer noncurrent versions if you want a short undo window.'],
          ['Change the job', 'Write to a new partition, such as `dt=2026-03-14/`, instead of overwriting.'],
          ['Watch it fall', 'The noncurrent bytes fall as the rule removes the old versions.']
        ],
        tell: 'The S3 cost of one bucket doubled in six weeks with no growth in live data. The bucket had versioning on, and a nightly job overwrote the same 2 TB table, so every night added 2 TB of noncurrent versions. I added a lifecycle rule that expires noncurrent versions after 7 days, and I changed the job to write a new date partition and not overwrite. Storage Lens showed the noncurrent bytes dropping within days. Versioning stays on for the safety, and the rule keeps its cost bounded.',
        prevent: ['Pair **versioning** with a **noncurrent version rule**', '**Write new partitions** instead of overwriting in place', 'Watch **noncurrent bytes** in Storage Lens', 'Add **AbortIncompleteMultipartUpload** to every bucket']
      }),

      B.qa({
        id: 'qa-s3', t: 1, tag: 'S3', secs: 60,
        q: 'Explain S3: buckets, keys and objects. Why does S3 have no real folders?',
        pts: ['A bucket is a named container, unique across all accounts', 'An object is bytes plus metadata, addressed by a key', 'A key is one string, the slashes are characters', 'The console and the API group keys with a prefix and a delimiter', 'You write and read whole objects, no appending or partial edits', 'Strongly consistent since 2020, designed for eleven nines of durability'],
        short: 'A bucket is a container with a globally unique name. An object is bytes with metadata, stored under a key, which is just a string. `raw/orders/a.json` is one key, and the slashes are ordinary characters. S3 has no folders. When a list call gives a delimiter, S3 groups keys by the text up to the next slash and returns them as common prefixes, which the console draws as folders.\n\nYou write and read whole objects. You cannot append or edit part of one, so changing an object means writing a new one. S3 is strongly consistent: after a successful write, reads and lists see it. S3 Standard is designed for eleven nines of durability across several zones, but a delete is durable too, so versioning and lifecycle rules matter.\n\nThe cost meters are storage, requests, retrieval for cool classes, and data transfer.',
        fu: [
          ['How do you list a million objects?', 'With a paginator. One call returns up to 1,000 keys and a continuation token, and the paginator loops until there are no more.'],
          ['What is a prefix?', 'The start of a key. It is how you group objects, how you apply lifecycle rules and permissions, and how request limits are counted.']
        ],
        trap: 'Saying that S3 has folders that you create. Creating a folder in the console writes a zero-byte object whose key ends in a slash.',
        real: 'Describe a listing or layout bug that you hit, and the fix.'
      }),

      B.qa({
        id: 'qa-lake', t: 2, tag: 'S3', secs: 90,
        q: 'How would you lay out a data lake on S3? Talk about zones, formats, partitions and file sizes.',
        pts: ['Zones: raw, clean, curated, each with its own writers and retention', 'One prefix for each table, partitioned by date with Hive-style folders', 'Parquet with Snappy or Zstandard in clean and curated', 'Files of about 128 MB to 1 GB, compacted regularly', 'Partition on low-cardinality columns that queries filter on', 'Catalog, encryption and lifecycle rules from the start'],
        short: 'I use three zones. Raw keeps files exactly as received, which lets me rebuild everything. Clean has typed Parquet with duplicates removed. Curated has the small business tables. Each zone has its own writers, permissions and retention.\n\nInside a zone, each table has one prefix and is partitioned by date in Hive-style folders such as `dt=2026-03-14/`, so Athena and Spark skip the days a query does not need. I partition on a low-cardinality column that queries filter on. A column with millions of values creates millions of tiny folders.\n\nIn clean and curated I use Parquet with Snappy or Zstandard, in files of 128 MB to 1 GB. Many small files cost requests and slow every query, so I compact them. The tables are in the Glue Data Catalog. I turn on encryption and lifecycle rules from the start, with a rule for incomplete multipart uploads and for noncurrent versions.',
        fu: [
          ['Why not partition by customer?', 'There are too many customers, so each folder would hold tiny files. Partition by date, and let Parquet statistics help with the customer filter.'],
          ['What do you do about small files?', 'Batch before writing with Firehose or the loader, and compact with a scheduled job. Table formats such as Iceberg can compact for you.']
        ],
        trap: 'Choosing a partition column because it is available, not because queries filter on it.',
        real: 'Describe a table whose layout you changed and the scan size before and after.'
      }),

      B.qa({
        id: 'qa-s3cost', t: 2, tag: 'S3', secs: 90,
        q: 'How do you reduce the cost of S3 for a data platform?',
        pts: ['Lifecycle rules and the right storage classes', 'Expire noncurrent versions and abort incomplete uploads', 'Fewer, larger objects to cut request cost', 'Parquet and compression to shrink storage', 'Keep traffic in the Region, and use a gateway endpoint', 'Measure first with Storage Lens and the cost report'],
        short: 'I measure first. S3 Storage Lens and the cost report show where the bytes and the requests are. Then I go through the meters.\n\nStorage: lifecycle rules move cold data to Standard-IA, Intelligent-Tiering or Glacier, after I check the minimum time and the retrieval fees. I expire noncurrent versions and abort incomplete multipart uploads. Parquet with compression shrinks the data itself.\n\nRequests: many tiny objects mean many PUT and GET requests, so I batch writes into big files and compact old ones.\n\nTransfer: I keep consumers in the same Region, use an S3 gateway endpoint so S3 traffic does not pass through a NAT gateway, and avoid sending data out to the internet.\n\nI also delete what nobody needs: old test data, temporary Athena results and abandoned buckets.',
        fu: [
          ['When is Standard-IA the wrong choice?', 'When data is read often, because the retrieval fee cancels the saving, or when objects are small, because of the minimum billable size.'],
          ['What is S3 Storage Lens?', 'A view of usage and activity across buckets and accounts, including the bytes in noncurrent versions and incomplete uploads.']
        ],
        trap: 'Moving everything to the cheapest class without checking how often it is read.',
        real: 'Describe the largest S3 saving you made and how you found it.'
      }),

      B.qa({
        id: 'qa-s3ver', t: 2, tag: 'S3', secs: 60,
        q: 'What does S3 versioning do, and what are the risks?',
        pts: ['Keeps every version of a key, with a version id', 'A delete adds a delete marker, nothing is removed', 'A permanent delete needs the version id', 'Undelete by removing the delete marker', 'Old versions are billed, so add a noncurrent version rule', 'Cannot be turned off, only suspended'],
        short: 'With versioning on, every write to a key creates a new version with its own id, and the older versions stay. A delete without a version id does not remove anything. It adds a delete marker, and a plain GET then answers not found. To undelete, I delete the marker by its version id. To remove data for good, I delete a specific version.\n\nThis protects against mistakes and bad overwrites. The risk is cost: the old versions are billed, so a job that overwrites the same keys every night piles them up. I pair versioning with a lifecycle rule that expires noncurrent versions, and I prefer writing new partitions over overwriting.\n\nVersioning cannot be turned off once it is on. You can only suspend it, and the existing versions remain.',
        fu: [
          ['How do you restore an older version?', 'Copy that version over the key, which makes it the newest version, or delete the newer versions by id.'],
          ['What is MFA delete?', 'A setting that requires a second factor to delete versions permanently or to change the versioning state.']
        ],
        trap: 'Believing that a delete removes the data. In a versioned bucket it hides it, and the bytes still cost money.',
        real: 'Describe a time versioning saved data, or cost money, and what you changed.'
      }),

      B.qa({
        id: 'qa-s3events', t: 2, tag: 'S3', secs: 90,
        q: 'How do you start processing when a file lands in S3, and what can go wrong?',
        pts: ['S3 event notifications or EventBridge, to a function, a queue or a workflow', 'EventBridge filters on prefix, suffix and size', 'Keys arrive URL-encoded, so decode them', 'Events can arrive more than once, so make the work idempotent', 'A file can still be incomplete, so wait for a marker', 'A queue and a dead-letter queue absorb spikes and failures'],
        short: 'I send S3 object-created events to EventBridge or to an SQS queue, and a consumer such as a Lambda function or a Step Functions workflow does the work. EventBridge lets me filter by prefix, suffix and size, so only the files I want start a run.\n\nThen I handle what goes wrong. The key in the event is URL-encoded, so `dt=2026-03-14` arrives as `dt%3D2026-03-14`, and I must decode it before I read the object. An event can be delivered more than once, so the work must be idempotent, for example by writing to a deterministic key with a conditional write. A file can appear before the writer is done, so for multi-file loads I wait for a marker object.\n\nI put a queue between S3 and the consumer, to absorb bursts, with a dead-letter queue and an alarm for messages that keep failing.',
        fu: [
          ['Is the order of events guaranteed?', 'No. Do not rely on order. Use the content, such as the partition and the time in the key, to decide what to do.'],
          ['Why a queue in the middle?', 'It buffers a burst, retries a failed message, and lets the consumer scale at its own pace.']
        ],
        trap: 'Assuming that one event means exactly one run. Duplicates happen, so idempotency is part of the design.',
        real: 'Describe an event-driven load you built and how it handled duplicates.'
      }),

      B.qa({
        id: 'qa-s3sec', t: 2, tag: 'S3', secs: 60,
        q: 'How do you secure a bucket that holds personal data?',
        pts: ['Block Public Access, ACLs disabled', 'Least-privilege roles and a bucket policy', 'Encryption with KMS and a policy that requires TLS', 'Versioning and a lifecycle rule', 'CloudTrail data events and access logs to the log account', 'Access Analyzer and Macie to find mistakes and personal data'],
        short: 'I start by blocking public access for the account and the bucket, and by disabling ACLs so that only policies grant access. Roles get least privilege: a job writes only to its zone, and analysts read only curated data. The bucket policy denies requests that do not use TLS.\n\nI encrypt with a KMS key when the data needs an audit trail of key use or the ability to revoke access, and I turn on S3 Bucket Keys to control the KMS request cost. Versioning with a noncurrent version rule protects against mistakes, and MFA delete protects against permanent deletes.\n\nFor the audit, CloudTrail data events and server access logs go to a log account that engineers cannot edit. IAM Access Analyzer shows access I did not intend, and Macie can find personal data in places it should not be.',
        fu: [
          ['SSE-S3 or SSE-KMS?', 'SSE-S3 is the default and needs no setup. SSE-KMS gives a key policy, an audit trail of key use and the ability to disable the key, at the price of KMS requests.'],
          ['How do you share the data with another account?', 'A bucket policy that names the other account or its role, plus a policy in that account that allows its role to call S3. Both sides must allow it.']
        ],
        trap: 'Relying on "the bucket is private" without checking policies, ACLs and every role that can reach it.',
        real: 'Describe a finding from Access Analyzer or a review, and what you changed.'
      }),

      B.recap({
        id: 'm2-recap', n: 2, badge: 'Bucket Keeper', color: '#FDE68A',
        pts: [
          'S3 stores **whole objects** under **keys**. A prefix is a string, and the delimiter makes folders in listings.',
          'A list call returns **up to 1,000 keys**. Use a **paginator**.',
          'Lay out the lake in **zones and date partitions**, with **Parquet files of 128 MB or more**.',
          'Versioning keeps data and bills for it. A delete adds a **delete marker**. Add a rule for **noncurrent versions** and for **incomplete uploads**.',
          'Pick the **storage class** by access pattern, and read the **minimum time**. **Conditional writes** make a write safe to repeat.',
          'Read **`NoSuchKey`, `404`, `PreconditionFailed`, `AccessDenied` and `SlowDown`** correctly.'
        ],
        lines: [
          'A key is a string, and I paginate every listing.',
          'I make every write safe to run twice.',
          'I put lifecycle rules on a bucket on the day I create it.'
        ]
      })
    ]
  });
})();
