/* Mission 3: Cloud Storage. Buckets, objects and the folders that are not there; generations and hashes; the emulator that says yes to everything; storage classes and
   lifecycle; signed URLs; file formats; events and transfers. The listing, the hashes, the generations, the signed URL and the file sizes were recorded with the real client
   libraries (the Storage client on an emulator, offline signing, pyarrow and fastavro). The service itself (classes, prices, soft delete, retention) is from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;
  var CODE = G.file('code/gcs_demo.py'), LC = G.text('gcs.lifecycle'), PC = G.counts('gcs.precondition'), GN = G.counts('gcs.generations'), HS = G.counts('gcs.hashes'), OP = G.counts('gcs.operations');
  var SG = G.counts('gcs.signed'), FS = G.table('formats.sizes'), FC = G.counts('formats.column_read'), LS = G.table('gcs.listing'), FL = G.table('cli.flags');
  G.expect(PC.sent_parameter === 'ifGenerationMatch=0' && PC.emulator_refused === false && PC.emulator_location_answered !== PC.emulator_location_asked, 'the emulator accepted a create-only write and ignored the location');
  G.expect(GN.overwrite_makes_a_new_generation === true && HS.crc32c_matches_own === true && HS.md5_matches_own === true && OP.compose_size_equals_sum === true && OP.deleted_then_missing === true, 'the recorded object facts');
  G.expect(SG.verified_with_public_key === true && SG.other_object_name_verifies === false && SG.longer_expiry_verifies === false && SG.network_used === false && SG.expires_seconds === 900, 'the signed URL checks');
  G.expect(LS.rows.length === 4 && FS.rows.length === 10 && FC.columns === 7, 'the listing and the formats');
  var csv = FS.rows[0], pq = FS.rows.filter(function (r) { return r[0] === 'Parquet (snappy)'; })[0], zs = FS.rows.filter(function (r) { return r[0] === 'Parquet (zstd)'; })[0], orc = FS.rows.filter(function (r) { return r[0] === 'ORC (zstd)'; })[0], js = FS.rows.filter(function (r) { return r[0] === 'JSON lines'; })[0];
  var pc = function (x) { return Math.round(x * 100) + '%'; };
  var HOW = [
    'gcloud storage buckets create gs://brewline-landing-dev \\',
    '  --location=asia-southeast1 \\',
    '  --default-storage-class=STANDARD \\',
    '  --uniform-bucket-level-access \\',
    '  --public-access-prevention \\',
    '  --soft-delete-duration=7d'
  ].join('\n');
  var BUG1 = [
    'def new_files(client, bucket_name, seen):',
    '    out = []',
    '    for blob in client.list_blobs(bucket_name):',
    '        if blob.name not in seen:',
    '            out.append(blob.name)',
    '    return out'
  ].join('\n');
  var FIX1 = [
    'def new_files(client, bucket_name, day, seen):',
    '    prefix = "orders/dt=%s/" % day',
    '    out = []',
    '    for blob in client.list_blobs(bucket_name, prefix=prefix):',
    '        if blob.name not in seen:',
    '            out.append(blob.name)',
    '    return out'
  ].join('\n');

  LAB.addChapter({
    id: 'm3', n: 3, title: 'Cloud Storage', short: 'Storage', blurb: 'Buckets without folders, generations, classes and lifecycle, signed URLs, file formats and events', minutes: 48,
    focus: ['src', 'ing'],
    goals: [
      'Say why a bucket has **no folders**, and what a prefix and a delimiter do.',
      'Explain a **generation**, and use a precondition to make a write safe.',
      'Know what an **emulator** gets wrong, and what to test on the real service.',
      'Pick a **storage class** and write a **lifecycle** rule.',
      'Make and read a **signed URL**, and say what it protects.',
      'Choose a **file format**, and say why a column format saves bytes.'
    ],
    say: 'Mission 3 is where data lands. A bucket looks like a disk with folders, and it is neither. It is a flat store of objects with names, and almost every surprise in Cloud Storage comes from that. I ran the real Storage client on an emulator on this machine, made a signed URL without any network, and wrote the same orders in six file formats. The emulator is not Cloud Storage, and I show you where it differs. Classes, prices and retention come from documentation.',
    scenes: [
      B.flow({
        id: 'm3-flow', t: 1, src: 'docs', title: 'A partner file, from upload to the warehouse', g: 'storage', legend: true,
        steps: [
          { say: 'A marketing agency sends Brewline a file of campaign results every day. The file lands in a bucket, a small function notices it, BigQuery loads it, and old files move to cheaper storage. Press Next to follow it.', cap: 'A file in, a table out, a lifecycle behind.' },
          { say: 'Step 1. The partner has no account with Brewline, so it gets a **signed URL**: a link that lets one upload happen to one object, for fifteen minutes. Nobody shares a password or a key.', on: ['s1'], focus: ['b_partner', 'b_bkt'], cap: 'A signed URL for one upload.' },
          { say: 'Step 2. The bucket lives in Singapore with uniform access, so IAM alone decides who may read it. When an object is finalized, the bucket can announce it.', on: ['s2'], focus: ['b_bkt', 'b_notif'], cap: 'The bucket announces a new object.' },
          { say: 'Step 3. A small function receives the announcement. It checks that the name matches the pattern and that the day folder is the right one. A file that does not match is moved aside, not loaded.', on: ['s3'], focus: ['b_notif', 'b_fn'], cap: 'A function checks the name.' },
          { say: 'Step 4. The function starts a BigQuery load job that appends the Parquet file. A load job is free of query cost, and it is atomic: it either adds all the rows or none.', on: ['s4'], focus: ['b_fn', 'b_load'], cap: 'A load job adds the rows.' },
          { say: 'Step 5 to 8. A lifecycle rule moves the object to Nearline after 30 days, to Coldline after 90, and deletes it after a year. The rule is on the bucket, so nobody has to remember.', on: ['s5', 's6', 's7', 's8'], focus: ['b_std', 'b_near', 'b_cold', 'b_del'], cap: 'The lifecycle saves money without a job.' }
        ]
      }),

      B.talk({
        id: 'm3-basics', t: 1, src: 'docs', title: 'Buckets and objects',
        say: 'Four facts carry most of Cloud Storage. Press Next for each.',
        items: [
          ['A bucket holds objects', 'A **bucket** is a container with a globally unique name and a location. An **object** is a blob of bytes with a name, a size, a content type and metadata. An object can be very large, up to terabytes, but it is a whole: you can replace it, and you cannot edit a part in place.', 'Objects are replaced, never edited.'],
          ['There are no folders', 'An object name is **one string**, and the slashes in it are just characters. The console draws folders by splitting names. A listing with a **prefix** and a **delimiter** does the same. A "folder" with nothing in it does not exist, unless somebody made an empty marker.', 'A prefix is not a folder.'],
          ['Strong consistency', 'After a write succeeds, a read or a list sees it. You do not need to wait or to retry a list, which keeps pipelines simple. An object appears **whole or not at all**: a half-uploaded object is not visible.', 'A finished upload is visible at once, and whole.'],
          ['Access', 'Turn on **uniform bucket-level access** so that IAM is the only way in, and ACLs on single objects are ignored. Turn on **public access prevention** so a bucket cannot be made public by mistake. Mission 2 showed the organization policies that enforce both.', 'One access model, and no public buckets.']
        ],
        cols: 1
      }),

      B.widget({ id: 'm3-listing', kind: 'listing', t: 1, src: 'rec', title: 'Lab: prefixes and delimiters' }),

      B.rows({
        id: 'm3-facts', t: 1, src: 'rec', title: 'Generations, hashes and compose, on the real client',
        steps: [
          {
            say: 'Every time you write an object, Cloud Storage gives it a new **generation**, a number that names that version. I overwrote an object and read the generation again: ' + (GN.overwrite_makes_a_new_generation ? 'it changed.' : 'it did not change.') + ' The generation is what a precondition checks, and what makes "replace" safe to reason about.',
            tabs: [{
              layer: 'RECORDED', name: 'What the client reported', c: 'raw',
              cols: ['Fact', 'Result'],
              rows: [
                ['An overwrite gets a new generation', GN.overwrite_makes_a_new_generation ? 'yes' : 'no'],
                ['The CRC32C that the library reports equals one computed independently', HS.crc32c_matches_own ? 'yes' : 'no'],
                ['The MD5 equals one computed independently', HS.md5_matches_own ? 'yes' : 'no'],
                ['A composed object has the size of its two parts added up', OP.compose_size_equals_sum ? 'yes' : 'no'],
                ['A deleted object is gone', OP.deleted_then_missing ? 'yes' : 'no']
              ],
              trk: 0
            }],
            notes: ['Recorded with google-cloud-storage ' + G.meta('google-cloud-storage') + ' on an emulator. The hashes are computed by the client and checked with Python\'s own tools, so they do not depend on the emulator.']
          },
          {
            say: 'The two hashes are how you prove that a file arrived intact. CRC32C is cheap and is what the client checks on download. MD5 is the older one. A pipeline that copies files between clouds compares them, and a mismatch means a corrupt copy.',
            tabs: [{
              layer: 'RECORDED', name: 'The hashes of a 33-byte file', c: 'raw',
              cols: ['Hash', 'Value (base64)'],
              rows: [['CRC32C', HS.crc32c], ['MD5', HS.md5]],
              trk: 0
            }],
            notes: ['Cloud Storage reports both hashes in the object metadata. They are base64 text of the raw bytes, which is why they look short.']
          }
        ]
      }),

      B.code({
        id: 'm3-client', t: 1, src: 'rec', title: 'The client code that ran', file: 'gcs_demo.py', lang: 'python', code: CODE,
        steps: [
          { say: 'This is the code that produced the recordings of this mission. It uses the real client library. A client with no credentials talks to the emulator on this machine. Press Next for the parts.', lines: null },
          { say: '`land_files` creates a bucket in Singapore and writes five objects whose names look like `orders/dt=2026-11-10/part-0000.json`. The `dt=` part is the Hive style that many tools understand as a partition.', lines: G.span(CODE, /^def land_files/, /return bucket/) },
          { say: '`list_like_folders` is the call behind the lab. A prefix and a delimiter together give the names that look like one folder level, and the common prefixes that look like sub-folders.', lines: G.span(CODE, /^def list_like_folders/, /return \{/) },
          { say: '`lifecycle_rules` builds three rules on a bucket in memory and returns the JSON that the API takes. Nothing is sent.', lines: G.span(CODE, /^def lifecycle_rules/, /return list/) }
        ],
        note: 'The emulator is gcp-storage-emulator ' + G.meta('gcp-storage-emulator') + '. It is a small Python program, not Cloud Storage.'
      }),

      B.rows({
        id: 'm3-emu', t: 1, src: 'rec', title: 'An emulator that says yes to everything',
        steps: [
          {
            say: 'I tried the most useful safety feature of Cloud Storage on the emulator: a **create-only** write. The client sends `ifGenerationMatch=0`, which means "write this only if the object does not exist". The object already existed.',
            tabs: [{
              layer: 'RECORDED', name: 'What happened', c: 'raw',
              cols: ['Step', 'Result', 'Source'],
              rows: [
                ['What the client sent with the upload', PC.sent_parameter, 'recorded'],
                ['Did the emulator refuse the write?', PC.emulator_refused ? 'yes' : 'no, it accepted it', 'recorded'],
                ['The location I asked for', PC.emulator_location_asked, 'recorded'],
                ['The location the emulator reported', PC.emulator_location_answered, 'recorded'],
                ['What a real bucket answers to a create-only write on an existing object', 'HTTP 412 Precondition Failed', 'documentation']
              ],
              trk: 0
            }],
            notes: ['The client did its job and sent the precondition. The emulator ignored it, and it also ignored the location. A test that passes here proves nothing about either.']
          },
          {
            say: 'This is the lesson of every emulator. It is good for the shape of the calls and for fast tests. It is **not** a way to learn the rules of the service. Test preconditions, locations, quotas and permissions against a real bucket in a dev project, and write that down in your test plan.',
            tabs: [{
              layer: 'RULE', name: 'What to test where', c: 'raw',
              cols: ['Question', 'Emulator', 'Real dev project'],
              rows: [
                ['Does my code build the right request?', 'yes', 'yes'],
                ['Does a create-only write fail the second time?', 'no, it did not', 'yes'],
                ['Is the bucket in the right location?', 'no, it ignored it', 'yes'],
                ['Does the service account have the right role?', 'no', 'yes']
              ],
              trk: 0
            }],
            notes: ['I found these two gaps by writing the test, not by reading a list of limits. That is the habit worth keeping.']
          }
        ]
      }),

      B.talk({
        id: 'm3-safe', t: 2, src: 'docs', title: 'Make a write safe: preconditions and markers',
        say: 'Two patterns turn a bucket into a reliable landing zone. Press Next for each.',
        items: [
          ['Create only, or replace what you read', 'A **precondition** on the generation turns a write into a conditional write. `ifGenerationMatch=0` means create only. `ifGenerationMatch=N` means replace only if the object is still the version I read. It is how you claim a file once, or update a small state file without losing a change.', 'The first writer wins, and the second one is told.'],
          ['A marker for a batch', 'An object is whole when it appears, but a **batch of files** is not. A job that writes ten parts can be read after the fifth. The producer writes the parts, then a small marker or manifest (`_SUCCESS`, or a list of names with sizes and hashes). The consumer waits for the marker, and checks the list.', 'Files are atomic. Batches are not, so mark the end.'],
          ['Idempotent loads', 'A load triggered by a notification may run twice, because notifications are delivered at least once. Name the load job by the object and its generation, or keep a table of loaded generations. A second delivery then finds the work done.', 'Load by name and generation, so a repeat is harmless.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'A habit for landing zones:', t: 'write to a temporary prefix, check the hashes, then copy to the final prefix. Readers only ever look at the final prefix.' }
      }),

      B.cmp({
        id: 'm3-class', t: 1, src: 'docs', title: 'Storage classes',
        say: 'A class is a price trade: the colder the class, the cheaper it is to keep and the more it costs to read, and each has a minimum time. Press Next to read the pattern. The numbers are rules from the documentation. Prices change, so I give none.',
        cols: ['Class', 'For data read', 'Minimum storage time', 'Keep in mind'],
        hl: 1,
        rows: [
          ['Standard', 'often', 'none', 'The right place for landing and for anything that pipelines read.'],
          ['Nearline', 'about once a month', '30 days', 'Reading costs a fee, and deleting early still bills the minimum.'],
          ['Coldline', 'about once a quarter', '90 days', 'For backups that you hope never to read.'],
          ['Archive', 'about once a year', '365 days', 'The cheapest to keep and the most to read. For records you must hold.']
        ],
        steps: [
          { upto: 2, say: 'Standard for what is read often. Nearline for what you read about monthly, with a 30 day minimum.' },
          { upto: 4, say: 'Coldline and Archive for rare reads, with 90 and 365 day minimums. Deleting before the minimum still bills the rest.' }
        ],
        pick: '**Autoclass** moves objects between classes by their access, so you do not need to guess. It is a good default for a bucket whose pattern you do not know. For a landing bucket with a known pattern, a lifecycle rule is simpler and cheaper.'
      }),

      B.code({
        id: 'm3-life', t: 1, src: 'rec', title: 'A lifecycle rule, as the API takes it', file: 'lifecycle.json', lang: 'json', code: LC,
        steps: [
          { say: 'A lifecycle is a list of rules on the bucket. Each has an **action** and a **condition**. I built these three with the real client library, which only formats the JSON. Press Next for each.', lines: null },
          { say: 'After **30 days**, objects that are still Standard move to Nearline. The `matchesStorageClass` condition stops the rule from touching objects that are already colder.', lines: G.span(LC, /SetStorageClass/, /matchesStorageClass/) },
          { say: 'After **365 days**, delete. This is the rule that bounds the cost of the raw layer. Whether a year is right is a retention decision for the company, not for the engineer.', lines: G.span(LC, /"age": 365/) },
          { say: 'Delete **old versions**: a version that is no longer live is deleted once **three newer versions** exist. It only matters when versioning is on, and it stops the history from growing for ever.', lines: G.span(LC, /isLive/, /numNewerVersions/) }
        ],
        note: 'A lifecycle rule can delete data. Test it on a bucket that has the same prefixes, and check the condition twice before you apply it to raw data that cannot be recreated.'
      }),

      B.talk({
        id: 'm3-protect', t: 2, src: 'docs', title: 'Protect the data from your own mistakes',
        say: 'Deletes happen by mistake, by script and by lifecycle rule. Cloud Storage has four layers of protection. Press Next for each, from the lightest to the strongest.',
        items: [
          ['Soft delete', 'A deleted object is kept for a retention period (new buckets are set to seven days by default, and you can change it) and can be restored. It costs storage for that time. It covers the "I deleted the wrong prefix" mistake.', 'A short undo.'],
          ['Object versioning', 'With versioning, an overwrite or a delete keeps the older version as a **noncurrent** version. You restore by copying an old version back. A lifecycle rule must prune the old ones.', 'An undo for overwrites, with a bill.'],
          ['Retention policy and lock', 'A **retention policy** forbids deleting or replacing an object until it is old enough. **Locking** the policy makes it permanent. It is for records that a rule says you must keep.', 'A rule that nobody can switch off.'],
          ['A copy somewhere else', 'None of the above protects against a deleted project, a lost key or a bad policy. A copy in another bucket, another project or another location does. Cross-bucket copies are cheap next to the loss.', 'The only protection against the account itself.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'Check the default before you rely on it:', t: 'the soft delete period of a new bucket, and the rules of retention locks, are set by Google and have changed. Read the current documentation, and set the values you want explicitly.' }
      }),

      B.widget({ id: 'm3-signed', kind: 'signed', t: 1, src: 'rec', title: 'Lab: a signed URL' }),

      B.code({
        id: 'm3-sign-code', t: 2, src: 'rec', title: 'How the URL was made and checked', file: 'gcs_demo.py', lang: 'python', code: CODE,
        steps: [
          { say: 'The signing code is short. Nothing here touches the network. A throwaway key makes a service account, and the library signs with it. The key belongs to no project and works nowhere. Press Next.', lines: null },
          { say: 'A key is made on the spot, and wrapped as the credentials of a service account. In real life this is the key behind a service account, or better, a signing service that holds the key for you.', lines: G.span(CODE, /^def throwaway_credentials/, /return service_account/) },
          { say: '`generate_signed_url` signs the request. The version is `v4`, the expiry is fifteen minutes (version 4 allows up to seven days), and the method is GET. The result is the link.', lines: G.span(CODE, /^def signed_url/, /generate_signed_url/) },
          { say: '`check_signature` rebuilds the text that was signed from the URL alone, and verifies the signature with the public key. It is what Cloud Storage does when somebody opens the link. Change the object name or the expiry and it returns False.', lines: G.span(CODE, /^def check_signature/, /return False/) }
        ],
        note: 'The signature needs a private key. On Google Cloud, prefer signing through the IAM service (no key file) or a short-lived credential, in line with mission 2.'
      }),

      B.widget({ id: 'm3-format', kind: 'format', t: 1, src: 'rec', title: 'Lab: file formats and the bytes a reader fetches' }),

      B.cmp({
        id: 'm3-fmt', t: 1, src: 'docs', title: 'Which format to land and which to load',
        say: 'The sizes above are for one dataset, so read the direction. The choice also depends on what loads and what splits. Press Next to read the rules of thumb for BigQuery.',
        cols: ['Format', 'Schema inside', 'Nested data', 'Reads in parallel', 'Use it for'],
        hl: 4,
        rows: [
          ['CSV', 'no', 'no', 'when not compressed and no quoted newlines', 'Partner files that you cannot change'],
          ['JSON lines', 'no', 'yes', 'when not compressed', 'Events and logs, with nested fields'],
          ['Avro', 'yes', 'yes', 'yes, in blocks', 'Streams, and loads that need the schema carried'],
          ['Parquet', 'yes', 'yes', 'yes, by row group', 'The default for the lake and for loads'],
          ['ORC', 'yes', 'yes', 'yes, by stripe', 'Data that comes from the Hive world']
        ],
        steps: [
          { upto: 2, say: 'CSV and JSON carry no schema, and a compressed file cannot be split, so one reader gets all of it. They are what partners send.' },
          { upto: 5, say: 'Avro, Parquet and ORC carry their schema and split cleanly. In the recording Parquet with snappy took ' + pc(pq[2]) + ' of the CSV, with zstd ' + pc(zs[2]) + ', and ORC ' + pc(orc[2]) + '. The JSON lines were ' + (js[2]).toFixed(1) + ' times the CSV.' }
        ],
        pick: 'Land what the source sends, unchanged. Convert to **Parquet** in the first step that you own, because every later step reads fewer bytes and gets types for free.'
      }),

      B.talk({
        id: 'm3-events', t: 1, src: 'docs', title: 'Reacting to a file, and moving files in',
        say: 'Files arrive on their own schedule, and there are three ways to react or to fetch. Press Next for each.',
        items: [
          ['A notification', 'A bucket can publish a message to Pub/Sub when an object is **finalized** or deleted. A subscriber, such as a function or a Dataflow job, reacts. Delivery is at least once, so the reaction must be safe to repeat.', 'Push, at least once.'],
          ['Eventarc and functions', '**Eventarc** routes events from Cloud Storage and other sources to a **Cloud Run function** or a service. A few lines of code check the name, start a load and write a log. Mission 7 tests such a function with real CloudEvents.', 'A few lines of code for a file.'],
          ['Polling', 'A scheduled job lists the bucket and finds new names. It is easy and robust, but it needs a **prefix** (by day) so that the listing stays short, and a record of what it has seen. Listing the whole bucket every minute is slow and costs operations.', 'Simple, if the prefix is narrow.'],
          ['Moving files in', '**Storage Transfer Service** copies in bulk from S3, Azure, another bucket or an on-premises agent, with scheduling, filters and checks. `gcloud storage rsync` is a good fit for scripts and small jobs. For very large offline moves there are appliances.', 'A managed copier for big moves.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm3-create', t: 1, src: 'docs', title: 'Creating the landing bucket', file: 'create_bucket.sh', lang: 'bash', code: HOW,
        steps: [
          { say: 'This is how I would create the landing bucket from the command line, with the choices that this mission argued for. I checked that every flag exists in the help page of the installed `gcloud`, and I did not run the command.', lines: null },
          { say: 'A name that is unique in the world, and **a location chosen once**: Singapore.', lines: G.span(HOW, /buckets create/, /location/) },
          { say: 'Standard for landing, because pipelines read it at once. A lifecycle rule moves it down later.', lines: G.span(HOW, /default-storage-class/) },
          { say: '**Uniform access** so that IAM is the only way in, and **public access prevention** so that nobody can open the bucket to the world by mistake.', lines: G.span(HOW, /uniform-bucket-level-access/, /public-access-prevention/) },
          { say: 'A soft delete period, so that a deleted prefix can be restored for a week. The value format is the one to check: read the help page of your version.', lines: G.span(HOW, /soft-delete-duration/) }
        ],
        note: 'In a team, the bucket belongs in Terraform (mission 14), not in a shell history. The command is here to read the choices.'
      }),

      B.decide({
        id: 'm3-dec', t: 1, src: 'docs', title: 'Decision: the class of the raw landing bucket',
        scenario: 'Raw partner files are read once by a load job on the day they arrive, sometimes again when a bug is fixed in the first month, and almost never after a quarter. Compliance wants them kept for a year. A colleague proposes Archive "because it is cheapest".',
        opts: [
          { t: 'Archive from day one', d: 'The lowest price per gigabyte kept.', lose: 'The load job reads the file the same day, and reloads happen in the first month. Reads from Archive cost more, and the minimum storage time is a year. The cheap price is not cheap here.' },
          { t: 'Standard, with a lifecycle that moves to Nearline at 30 days and Coldline at 90, and deletes at 365', d: 'Reads are cheap when they happen, and the cost falls as the data gets old.', lose: '' },
          { t: 'Nearline from day one', d: 'A bit cheaper than Standard.', lose: 'Every read in the first month pays a retrieval fee, and the 30 day minimum is billed even if you delete sooner.' }
        ],
        pick: 1,
        why: 'Pick the class by when the data is read, and let a lifecycle follow the age. Hot at first, then colder. Autoclass is a good alternative if the pattern is hard to predict.',
        when: 'For a bucket of backups that are only read in a disaster, Coldline or Archive from the start is right.'
      }),

      B.bug({
        id: 'm3-bug', t: 1, q: 'A script finds new files every minute. After a few months it takes 40 seconds and the operations bill has grown. Click the line that causes it.',
        file: 'poll.py', lang: 'python', code: BUG1, bad: [3],
        hint: 'How many objects does this list?',
        why: 'The call lists **every object in the bucket**, on every run, and then compares names in Python. A bucket with millions of objects makes each run slow and bills operations each time. List only the day prefix, or react to notifications and never list at all.',
        fix: FIX1,
        cheer: 'List a narrow prefix, or do not list.'
      }),

      B.incident({
        id: 'm3-inc', t: 2, src: 'docs', title: 'Incident: half a batch was loaded', time: '03:15',
        alert: '**Yesterday\'s campaign table has 8 of 10 partner files.** The load job ran when the 8th file landed, and the last two arrived four minutes later. The next day\'s run loaded them again, and some rows are now there twice.',
        clues: ['The load is triggered by each file', 'The partner sends no marker', 'Notifications are delivered at least once'],
        opts: [
          { t: 'Wait for a manifest or a marker object, load the batch once by the names in it, and track loaded object generations so that a repeat does nothing', fb: '' },
          { t: 'Delay every load by ten minutes', fb: 'A guess. It still fails the day the partner is slow, and it does not stop repeats.' },
          { t: 'Delete the duplicate rows by hand every morning', fb: 'It treats the symptom. The cause comes back each day.' },
          { t: 'Ask the partner to send fewer files', fb: 'It may help, but you cannot depend on another company to fix your pipeline.' }
        ],
        best: 0,
        why: 'A file is whole when it appears, but a batch is not. The consumer needs a signal that the batch is complete, and a record of what it has loaded. Then late, repeated or reordered notifications cannot hurt.',
        checks: [
          ['Find the gap', 'Compare the list of files in the bucket with the files loaded, by name and generation.'],
          ['Agree a marker', 'Ask the partner for a manifest (names, sizes, hashes) written last. If they cannot, derive a rule: 10 files for the day.'],
          ['Make the load repeatable', 'Load by object and generation, or merge by a key. A repeat then adds nothing.'],
          ['Repair', 'Remove the duplicate rows with a key, then reload the missing files.']
        ],
        tell: 'The load started on the first file that landed, so the batch was incomplete, and a repeated notification then loaded some files twice. I made the load wait for a manifest, key it by object and generation, and repaired the table with a merge on the key.',
        prevent: ['A manifest or a marker for every batch', 'Loads keyed by object and generation', 'A daily check of expected against loaded file counts']
      }),

      B.quiz({
        id: 'm3-q1', t: 1,
        q: 'You list a bucket with prefix `orders/` and delimiter `/`. What comes back?',
        opts: [
          { t: 'Every object under orders/, however deep', fb: 'That is the listing with no delimiter.' },
          { t: 'Objects directly under orders/, and the common prefixes such as orders/dt=2026-11-10/', fb: '' },
          { t: 'Only the folders, created earlier', fb: 'There are no folders. The prefixes are computed from the object names.' },
          { t: 'An error, because slashes are not allowed', fb: 'Slashes are ordinary characters in a name.' }
        ],
        ok: 1,
        why: 'The delimiter makes the listing stop at the next slash, and report what lies below as prefixes. It is how a console draws folders.'
      }),

      B.quiz({
        id: 'm3-q2', t: 1,
        q: 'The same file is uploaded again with the same name. What is true?',
        opts: [
          { t: 'The old object is edited in place', fb: 'Objects are never edited.' },
          { t: 'The object is replaced, and it gets a new generation', fb: '' },
          { t: 'Both versions stay and have the same generation', fb: 'Each version has its own generation.' },
          { t: 'The upload is refused', fb: 'A plain upload replaces. Only a precondition can refuse it.' }
        ],
        ok: 1,
        why: 'A write replaces the object and makes a new generation. A precondition on the generation turns the write into "create only" or "replace only if unchanged".'
      }),

      B.quiz({
        id: 'm3-q3', t: 1,
        q: 'The create-only test passes on the emulator. What does that tell you about the real service?',
        opts: [
          { t: 'The code is safe on Cloud Storage', fb: 'In the recording, the emulator accepted a write that a real bucket would refuse.' },
          { t: 'Nothing about the precondition: the emulator did not enforce it', fb: '' },
          { t: 'The emulator is always more strict than the service', fb: 'In this case it was less strict.' },
          { t: 'That the location was right', fb: 'It also ignored the location.' }
        ],
        ok: 1,
        why: 'Use an emulator for the shape of calls. Test preconditions, locations and permissions on a real bucket in a dev project.'
      }),

      B.quiz({
        id: 'm3-q4', t: 2,
        q: 'You need to read the first 2 of 7 columns of a large file, many times a day. Which format helps?',
        opts: [
          { t: 'Gzip CSV', fb: 'A reader must decompress and read every row, and gzip cannot be split.' },
          { t: 'Parquet: the reader fetches only the chunks of those columns', fb: '' },
          { t: 'JSON lines', fb: 'The largest here, and every row repeats every name.' },
          { t: 'A zip of the CSV', fb: 'No better than gzip for this purpose.' }
        ],
        ok: 1,
        why: 'In the recording, two columns were ' + pc(FC.two_columns_share) + ' of the column data of a Parquet file. A row format has to read all of it.'
      }),

      B.order({
        id: 'm3-ord', t: 1, q: 'Put the safe handling of a partner batch in order.',
        items: [
          'The partner writes the part files under a temporary prefix',
          'The partner writes a manifest last, with names, sizes and hashes',
          'The consumer waits for the manifest',
          'The consumer checks the files against the manifest',
          'The load is keyed by object and generation',
          'The files are copied to the final prefix and the batch is marked as loaded'
        ],
        why: 'An object is whole when it appears, but a batch is not, so the manifest says when it is complete. The checks make the load trustworthy, and the key makes a repeat harmless.'
      }),

      B.qa({
        id: 'qa-gcs', t: 1, tag: 'Storage', secs: 75,
        q: 'Cloud Storage has folders. True or false?',
        pts: ['False: a flat namespace of objects', 'A name is one string with slashes', 'Prefix and delimiter give the folder view', 'Empty folders do not exist', 'Renames are copy and delete, unless hierarchical namespace', 'List with a narrow prefix'],
        short: 'False. A bucket is a flat namespace of objects, and an object name is a single string. The slashes are ordinary characters. The console and the listing call make folders by splitting names with a prefix and a delimiter, so a folder with nothing in it does not exist.\n\nThis matters in practice. Renaming a "folder" is a copy and a delete of every object, not a cheap move, unless the bucket uses the hierarchical namespace feature. And a listing with no prefix reads the whole bucket, so I always list a narrow prefix such as the day, or I use notifications.',
        fu: [['Why use dt= in names?', 'Many tools, BigQuery external tables and Spark among them, read that Hive style as a partition column, so it gives pruning for free.'], ['What is hierarchical namespace?', 'A bucket option that gives real folders and fast, atomic renames, aimed at lake workloads. Check the current limits before you rely on it.']],
        trap: 'Saying that you "create a folder" in a bucket, without knowing that nothing is created.',
        real: 'Describe a pipeline that listed too much, and how you fixed it.'
      }),

      B.qa({
        id: 'qa-signed', t: 2, tag: 'Storage', secs: 75,
        q: 'How do you let a partner upload one file to a private bucket?',
        pts: ['A signed URL for one object and one method', 'Short expiry', 'Signed by a service account, no key file ideally', 'The signature covers the path and the expiry', 'No account or password for the partner', 'Check the object after upload'],
        short: 'I give them a **signed URL** for exactly one object and one method (PUT), with a short expiry such as fifteen minutes. The library signs the request with the private key of a service account, and Cloud Storage verifies the signature when the partner uses the link. The signature covers the path, the method, the date and the expiry, so the URL cannot be pointed at another object or made longer. In my recording both attempts failed verification.\n\nThe partner needs no account. On my side I prefer to sign through the IAM signing service or a short-lived credential, not with a key file, and I check the uploaded object by its size and hash before I load it.',
        fu: [['How long can the expiry be?', 'For version 4 URLs up to seven days. Shorter is better.'], ['What if the link leaks?', 'Anyone who has it can use it until it expires, so keep it short and one-use in practice, and check the object after.']],
        trap: 'Making the bucket public, or sharing a service account key with the partner.',
        real: 'Describe how you shared data with a partner without giving an account.'
      }),

      B.qa({
        id: 'qa-class', t: 1, tag: 'Storage', secs: 60,
        q: 'How do you choose a storage class and keep the cost down?',
        pts: ['By how often the data is read', 'Standard for hot, Nearline, Coldline and Archive for colder', 'Minimum storage durations and retrieval fees', 'Lifecycle rules by age', 'Autoclass if the pattern is unknown', 'Delete what the rules allow'],
        short: 'By how often the data is read. Standard for data that pipelines read, then Nearline, Coldline and Archive for data read monthly, quarterly or yearly. The colder classes are cheaper to keep but charge to read and have a minimum storage time of 30, 90 and 365 days, so deleting early or reading often can cost more than Standard.\n\nFor a landing bucket I use Standard and a lifecycle rule that moves objects down by age and deletes them when retention allows. If the access pattern is unknown, Autoclass moves objects automatically. And I look at the real bill by operation and class, because many small files and many listings cost money in a different line.',
        fu: [['When is Archive wrong?', 'When the data is read soon after it lands. Retrieval and the one year minimum make it expensive.'], ['What else is on the bill?', 'Operations (writes, reads and lists), network egress and early deletion, as well as the gigabytes kept.']],
        trap: 'Saying that the cheapest class is always best.',
        real: 'Tell me about a time you cut a storage bill, and how you checked that nothing broke.'
      }),

      B.qa({
        id: 'qa-fmt', t: 2, tag: 'Storage', secs: 75,
        q: 'CSV, Avro or Parquet for the raw layer?',
        pts: ['Land what the source sends, unchanged', 'Convert to Parquet in the first step you own', 'Parquet: columns, schema, statistics, splits', 'Avro for streams and carried schemas', 'CSV and JSON: no schema, gzip cannot be split', 'Measure on your data'],
        short: 'I land exactly what the source sends, so that I can always replay it. In the first step that I own I convert to **Parquet**. It stores columns with the schema and statistics inside, so a reader fetches only the columns it needs and can skip row groups, and it splits for parallel reads. In my recording, two of seven columns were about a tenth of a Parquet file, and the Parquet with zstd was about a fifth of the CSV.\n\nAvro is better for streams and for messages that must carry a schema. CSV and JSON have no schema, JSON repeats every name on every row, and a gzip file cannot be split. I measure on my own data, because the sizes depend on what is in it.',
        fu: [['What about small files?', 'Many tiny files are slow to list and to open. Compact them into files of tens to hundreds of megabytes.'], ['Why not convert at the source?', 'You do not own the source, and a replay needs the original bytes.']],
        trap: 'Choosing a format by habit, with no numbers.',
        real: 'Tell me about a pipeline where a file format change made it faster or cheaper.'
      }),

      B.recap({
        id: 'm3-recap', n: 3, badge: 'Bucket Boss', color: '#BBF7D0',
        pts: [
          'A bucket is a **flat namespace**. A prefix and a delimiter draw the folders. List a **narrow prefix**.',
          'A write **replaces** the object and makes a new **generation**. A precondition makes a write **safe**.',
          'An **emulator** gave yes to a create-only write and ignored the location. Test the rules on a **real** bucket.',
          '**Standard** for hot data, colder classes by age with **lifecycle**, and watch **minimum durations**.',
          'A **signed URL** covers the path and the expiry. Change either and the signature fails.',
          '**Parquet** gives schema, columns and splits. A batch needs a **marker**, and a load needs a **key**.'
        ],
        lines: [
          'I do not trust an emulator for the rules of a service.',
          'I land the original bytes and convert in the first step I own.',
          'I mark the end of a batch, and I key every load, so a repeat is harmless.'
        ]
      })
    ]
  });
})();
