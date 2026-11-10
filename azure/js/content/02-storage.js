/* Mission 2: storage accounts and ADLS Gen2. Names and endpoints, the hierarchical namespace, listing, layout, blob types, blocks, ETags,
   leases, redundancy, tiers, lifecycle, protection, SAS, events, hardening and errors. The listings, pages, conditions, blocks, leases, tiers,
   tags, snapshots, SAS answers and error codes were recorded with the Azure SDK for Python against Azurite, a storage emulator. Redundancy,
   the hierarchical namespace, lifecycle rules, protection and prices come from documentation, and Azurite cannot show them. */
(function () {
  var B = LAB.b, G = LAB.get;
  var KEYS = G.counts('blob.keys').keys, LST = G.counts('blob.listing'), PG = G.counts('blob.pages'), ER = G.counts('blob.errors'), CD = G.counts('blob.conditional');
  var BL = G.counts('blob.blocks'), LS = G.counts('blob.lease'), TR = G.counts('blob.tier'), TS = G.counts('blob.tags_snapshots'), TY = G.counts('blob.types'), GAP = G.counts('emulator.gaps');
  var SF = G.counts('sas.fields'), AF = G.counts('sas.account_fields');
  function L(p, d) { var r = LST.filter(function (x) { return x.prefix === p && x.delimiter === d; })[0]; if (!r) throw new Error('no recorded listing for ' + p + ' / ' + d); return r; }
  G.expect(KEYS.length === 10, 'the raw container holds ten blobs');
  G.expect(L('ord', '/').common_prefixes.join() === 'orders/' && L('ord', '').keys.length === 6, 'ord with and without a delimiter');
  G.expect(L('', '/').common_prefixes.length === 3 && L('', '/').keys.join() === 'README.txt', 'the top level of the container: three prefixes and one blob');
  G.expect(PG.pages.length === 3 && PG.results_per_page === 4 && !PG.pages[2].has_continuation_token, 'ten blobs in pages of four');
  G.expect(ER.get_missing_blob.code === 'BlobNotFound' && ER.get_missing_blob.status === 404 && ER.get_missing_container.code === 'ContainerNotFound' && ER.create_existing_container.status === 409, 'the not-found and exists errors');
  G.expect(CD.overwrite_false.code === 'BlobAlreadyExists' && CD.overwrite_false.status === 409 && CD.stale_etag.code === 'ConditionNotMet' && CD.stale_etag.status === 412 && CD.header_sent_by_overwrite_false['If-None-Match'] === '*' && CD.same_bytes_twice_same_etag === false, 'the condition answers and the header');
  G.expect(BL.blocks.length === 3 && BL.smallest_block_bytes === 3 && BL.size_after === 13 && BL.uncommitted_before.length === 3 && BL.committed_before.length === 0 && BL.get_before_commit.status === 404, 'blocks stay invisible until the block list is committed');
  G.expect(LS.write_without_id.code === 'LeaseIdMissing' && LS.write_without_id.status === 412 && LS.second_acquire.code === 'LeaseAlreadyPresent' && LS.steps[1].state === 'leased', 'the lease answers');
  G.expect(TR.default.tier === 'Hot' && TR.default.inferred === true && TR.cool.tier === 'Cool' && TR.archive.tier === 'Archive' && TR.read_archived.code === 'BlobArchived' && TR.read_archived.status === 409, 'the tier answers');
  G.expect(TS.find_blobs_by_tags.length === 1 && TS.delete_with_snapshot.code === 'SnapshotsPresent' && TS.snapshot_taken, 'tags and snapshots');
  G.expect(TY.append_blocks === 3 && TY.append_blob_size === 29 && TY.copy_status === 'success', 'append and copy');
  G.expect(GAP.probes[0].undelete.code === 'APINotImplemented', 'the emulator has no soft delete');

  var COND = [
    'def code_of(err):',
    '    return getattr(err.error_code, "value", err.error_code)',
    '',
    "marker = container.get_blob_client('orders/dt=2026-03-14/_SUCCESS')",
    "marker.upload_blob(b'', overwrite=False)",
    '',
    'try:',
    "    marker.upload_blob(b'', overwrite=False)",
    'except ResourceExistsError as err:',
    '    print(code_of(err), err.status_code)',
    '',
    'etag = marker.get_blob_properties().etag',
    "marker.set_blob_metadata({'run': '2'})",
    'try:',
    "    marker.set_blob_metadata({'run': '3'}, etag=etag, match_condition=MatchConditions.IfNotModified)",
    'except HttpResponseError as err:',
    '    print(code_of(err), err.status_code)'
  ].join('\n');

  var LIFE = [
    '{',
    '  "rules": [',
    '    {',
    '      "enabled": true,',
    '      "name": "raw-ages-out",',
    '      "type": "Lifecycle",',
    '      "definition": {',
    '        "filters": { "blobTypes": ["blockBlob"], "prefixMatch": ["raw/orders/"] },',
    '        "actions": {',
    '          "baseBlob": {',
    '            "tierToCool": { "daysAfterModificationGreaterThan": 30 },',
    '            "tierToCold": { "daysAfterModificationGreaterThan": 90 },',
    '            "tierToArchive": { "daysAfterModificationGreaterThan": 180 },',
    '            "delete": { "daysAfterModificationGreaterThan": 365 }',
    '          },',
    '          "snapshot": { "delete": { "daysAfterCreationGreaterThan": 30 } }',
    '        }',
    '      }',
    '    }',
    '  ]',
    '}'
  ].join('\n');

  var DEL_BUG = [
    'def delete_day(container, day):',
    "    prefix = 'orders/dt=' + day",
    '    for blob in container.list_blobs(name_starts_with=prefix):',
    '        container.delete_blob(blob.name)'
  ].join('\n');
  var DEL_FIX = DEL_BUG.replace("'orders/dt=' + day", "'orders/dt=' + day + '/'");

  var LIFE_BUG = [
    '{',
    '  "rules": [',
    '    {',
    '      "enabled": true,',
    '      "name": "raw-ages-out",',
    '      "type": "Lifecycle",',
    '      "definition": {',
    '        "filters": { "blobTypes": ["blockBlob"], "prefixMatch": ["orders/"] },',
    '        "actions": {',
    '          "baseBlob": {',
    '            "tierToCool": { "daysAfterModificationGreaterThan": 30 }',
    '          }',
    '        }',
    '      }',
    '    }',
    '  ]',
    '}'
  ].join('\n');
  var LIFE_FIX = LIFE_BUG.replace('"orders/"', '"raw/orders/"');

  LAB.addChapter({
    id: 'm2', n: 2, title: 'Storage accounts and ADLS Gen2', short: 'Storage', blurb: 'Names, the hierarchical namespace, listing, blocks, leases, redundancy, tiers, SAS, events and errors', minutes: 42,
    focus: ['stg', 'int'],
    goals: [
      'Explain a **storage account**, a **container**, a **blob** and a **prefix**, and why a flat namespace has no real folders.',
      'Say what the **hierarchical namespace** of ADLS Gen2 adds, and when to switch it on.',
      'List blobs with **a prefix and a delimiter**, and loop over pages.',
      'Use **blocks, ETags and leases** to write safely, and read the main storage errors.',
      'Choose **redundancy and an access tier**, and write a **lifecycle rule**.',
      'Say what a **SAS** is made of and what it cannot be edited into.'
    ],
    say: 'Mission 2 is the storage under the whole lake. It looks simple: put a blob, get a blob. The skill is in the details: how listing really works, what a folder is, how a write stays safe when two jobs race, which redundancy and tier to pay for, and what a SAS token can and cannot do. The listings, blocks, leases, tokens and error codes you see here are recorded. Redundancy, the hierarchical namespace and prices come from documentation.',
    scenes: [
      B.talk({
        id: 'm2-talk', t: 1, src: 'docs', title: 'What a storage account is',
        say: 'A storage account is the top of everything in this mission. Press Next for the six ideas that the rest builds on.',
        items: [
          ['One account, four services', 'A storage account gives you Blob Storage, Azure Files, Queue Storage and Table Storage under one name. A data lake uses blobs. Queues show up again in mission 10. The account is the unit of billing, of redundancy, of network rules and of the keys.', 'One name, four services.'],
          ['A name that becomes a host', 'The name is 3 to 24 lower-case letters and digits, unique across Azure, and it is the first part of every endpoint: `stbrewlinelakeprod.blob.core.windows.net` for blobs and `.dfs.core.windows.net` for the Data Lake API. You cannot rename an account.', 'Pick the name once.'],
          ['Containers hold blobs', 'A container is the first level inside an account. A blob is a named block of bytes in a container, plus metadata. You write and read whole blobs, or you add blocks to one. A lake usually gets one container for each zone: `raw`, `clean`, `curated`.', 'Whole blobs in containers.'],
          ['Strong consistency', 'After a successful write, every later read and list sees it. Azure Storage gives this for new blobs, overwrites, deletes and lists. Code that waits for a listing to catch up is out of date.', 'Read what you wrote, at once.'],
          ['Redundancy is a setting', 'The account keeps copies of your data in one data center, across zones, or in a second region, depending on a setting you choose. A copy protects against hardware loss. It does not protect against a delete, because the delete is copied too.', 'Safe from hardware loss, not from mistakes.'],
          ['What you pay for', 'Storage in GB-months, set by tier and redundancy, operations in blocks of ten thousand, data retrieval for the cooler tiers, and data leaving Azure or crossing regions. Mission 1 called these meters.', 'Storage, operations, retrieval, transfer.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm2-hns', t: 1, src: 'docs', title: 'Flat namespace or hierarchical namespace',
        say: 'One switch at creation decides whether folders are real. Press Next to compare a plain blob account with an ADLS Gen2 account, which is a storage account with the hierarchical namespace turned on.',
        cols: ['Question', 'Flat namespace (plain Blob)', 'Hierarchical namespace (ADLS Gen2)'],
        hl: 2,
        rows: [
          ['What is a folder?', 'Nothing. A name such as `orders/dt=2026-03-14/a.json` is one string, and the slashes are characters.', 'A real directory object, with its own metadata and permissions.'],
          ['Rename a folder', 'Copy every blob under it to a new name, then delete the old ones, one by one. Nothing is atomic.', 'One atomic metadata operation, however many files are inside.'],
          ['Delete a folder', 'Delete every blob under the prefix.', 'One operation on the directory.'],
          ['Permissions', 'Azure roles at the account or the container, and SAS tokens.', 'Azure roles, and POSIX-style ACLs on every directory and file.'],
          ['Endpoints', 'The blob endpoint.', 'The blob endpoint and the dfs endpoint, and the abfss driver for Spark.'],
          ['Features', 'The full set of blob features.', 'A few blob features are missing or behave differently. Check the feature support table before you rely on one.']
        ],
        steps: [
          { upto: 3, say: 'Folders and renames. Analytics engines commit their work by renaming a temporary folder, so an atomic rename makes them faster and safer.' },
          { upto: 5, say: 'Permissions and endpoints. ACLs give you control below the container, which a flat account cannot.' },
          { upto: 6, say: 'The catch is features. The switch is made when you create the account, and an upgrade path exists with limits, so decide early.' }
        ],
        pick: 'Use **ADLS Gen2** for a data lake that Spark, Synapse, Data Factory or Databricks read and write. Use a **plain Blob account** for application files that need a feature that the hierarchical namespace does not support.'
      }),

      B.widget({ id: 'm2-list-lab', kind: 'listing', t: 1, src: 'rec', title: 'Lab: prefixes and delimiters' }),

      B.cmp({
        id: 'm2-layout', t: 1, src: 'docs', title: 'Laying out the lake',
        say: 'A lake needs a layout that people and jobs can predict. Press Next to read the choices. These are common practice and Microsoft guidance, not rules of storage itself.',
        cols: ['Decision', 'A good default', 'Why'],
        hl: 1,
        rows: [
          ['Zones', 'A container for each zone: `raw`, `clean`, `curated`', 'A container is a unit for roles, lifecycle filters and metrics. Each zone has different writers, readers and retention.'],
          ['Datasets', 'One directory for each table: `raw/orders/`', 'A table is a directory. A catalog or an external table points at it.'],
          ['Partitions', 'Hive-style folders: `dt=2026-03-14/`', 'Spark and Synapse read the folder names as columns and skip the folders a query does not need.'],
          ['Format', 'Parquet with Snappy compression in clean and curated, Delta where you need updates', 'Columnar files let a query read only the columns it names, and they are small.'],
          ['File size', 'Aim for 100 MB to 1 GB', 'Fewer, larger files mean fewer operations and less overhead. Microsoft advises 100 MB to 10 GB for serverless SQL. Thousands of tiny files slow every query.'],
          ['Partition column', 'Low cardinality, such as the date, that queries filter on', 'A column with millions of values creates millions of tiny folders.'],
          ['Names', 'Lower case, no spaces, no special characters', 'Spaces and symbols are encoded in URLs and events, and they trip up tools.']
        ],
        steps: [
          { upto: 3, say: 'Zones, datasets and partitions give every file a predictable address.' },
          { upto: 5, say: 'Format and size decide how fast and how cheap each query is.' },
          { upto: 7, say: 'Partition on what queries filter on, and keep names boring.' }
        ],
        pick: 'Partition by **date**, write **Parquet files of 100 MB or more**, and keep **one directory for each table**. Change one of those only with a measured reason.'
      }),

      B.talk({
        id: 'm2-types', t: 1, src: 'rec', title: 'Blob types, copies, tags and snapshots',
        say: 'A blob has a type, and it also has a few extras. I used each of them with the real SDK against the emulator. Press Next for each.',
        items: [
          ['Block blobs, the default', 'A block blob is built from blocks and is what a lake holds. You write the whole blob in one call, or you stage blocks and commit them. The next screen shows blocks. The type was `' + TY.block_blob_type.replace('BlobType.', '') + '` for the file I copied.', 'Whole blobs, in blocks.'],
          ['Append blobs, for logs', 'An append blob accepts only new blocks at the end. I appended three lines to one, and the blob held ' + TY.append_blocks + ' blocks and ' + TY.append_blob_size + ' bytes. Use it for a log that many writers extend. You cannot edit the middle.', 'Add at the end, never edit.'],
          ['Page blobs, for disks', 'A page blob is built for random reads and writes in 512-byte pages. Virtual machine disks use it. A data lake does not.', 'Not for lakes.'],
          ['Server-side copy', 'A copy between blobs in Azure needs no download. I started a copy and the status came back as `' + TY.copy_status + '`. Large or cross-account copies run in the background, so a real job polls the status.', 'The service copies, not your machine.'],
          ['Blob index tags', 'Tags are key and value pairs that the service indexes, so you can search a whole account with a query. I tagged a blob with zone and pii, and `find_blobs_by_tags` returned ' + TS.find_blobs_by_tags.length + ' blob for a query on both. Metadata cannot be searched like this.', 'Tags can be searched. Metadata cannot.'],
          ['Snapshots', 'A snapshot is a read-only copy of a blob at one moment. I took one, and listing with snapshots showed the blob twice. Deleting the base blob while a snapshot exists failed with `' + TS.delete_with_snapshot.code + '` and HTTP ' + TS.delete_with_snapshot.status + '. You delete both, or you ask for snapshots to go too.', 'A snapshot blocks a plain delete.']
        ],
        cols: 1
      }),

      B.talk({
        id: 'm2-blocks', t: 1, src: 'rec', title: 'Blocks and ETags',
        say: 'Large files go to storage in blocks. I staged three blocks and measured what the service said. Press Next for each point.',
        items: [
          ['Stage, then commit', 'You stage each block with an id, then commit the list of ids. After I staged ' + BL.blocks.length + ' blocks, the blob did not exist: `get_blob_properties` answered `' + BL.get_before_commit.code + '` with HTTP ' + BL.get_before_commit.status + ', and the uncommitted list held ' + BL.uncommitted_before.length + ' ids. After the commit the blob was there with ' + BL.size_after + ' bytes and the uncommitted list was empty.', 'Nothing is visible until the commit.'],
          ['No minimum block size', 'My blocks held ' + BL.blocks.map(function (b) { return b.size; }).join(', ') + ' bytes, and the commit worked. There is no 5 MiB minimum as there is for some other stores. The documentation allows up to 50,000 blocks of up to 4,000 MiB each, which is about 190 TiB. The SDK picks block sizes for you above a size threshold.', 'Any size, up to a very large blob.'],
          ['The ETag is a version token', 'I wrote the same bytes twice, and the ETag changed (' + (CD.same_bytes_twice_same_etag ? 'it did not' : 'it did') + '). In Azure the ETag is a token for the version of the blob, and it changes on every write. It is not a hash of the content. Do not compare it with an MD5 of the file.', 'A version token, not a checksum.'],
          ['Check integrity yourself', 'To verify content, send a checksum with the upload, the Content-MD5 or a CRC64 header, and the service checks it on arrival. The SDKs can compute one for you. For the whole blob, store your own hash in the metadata.', 'Send a checksum with the data.'],
          ['Unfinished blocks expire', 'Staged blocks that are never committed are garbage collected after about a week. Until then they exist, so a crashed upload leaves no visible blob, and a retry can stage the same block ids again.', 'A crashed upload cleans itself up.']
        ],
        cols: 1
      }),

      B.code({
        id: 'm2-cond', t: 1, src: 'rec', title: 'A write that cannot happen twice', file: 'conditions.py', lang: 'python', code: COND,
        steps: [
          { say: 'Storage supports conditional writes. Two calls on one marker blob show the two conditions that matter: the blob must not exist yet, and the blob must not have changed since you read it.', lines: null },
          { say: '`overwrite=False` means: write this blob only if no blob has this name. The SDK sends the header `' + Object.keys(CD.header_sent_by_overwrite_false)[0] + ': ' + CD.header_sent_by_overwrite_false['If-None-Match'] + '`. It is a lock-free way to make one writer win.', lines: G.span(COND, /^marker = /, /overwrite=False\)$/) },
          { say: 'The second call asked for the same name. Storage answered `' + CD.overwrite_false.code + '` with HTTP ' + CD.overwrite_false.status + '. A retry of a job, or two jobs racing to publish the same marker, cannot overwrite each other.', lines: G.span(COND, /^try:/, /print\(code_of\(err\), err.status_code\)/) },
          { say: 'The second condition is the ETag. I read the ETag, then changed the blob, which gave it a new ETag.', lines: G.span(COND, /^etag = /, /set_blob_metadata\(\{.run.: .2.\}\)/) },
          { say: 'The last call said: change the blob only if it is still the one I read. It was not, so storage answered `' + CD.stale_etag.code + '` with HTTP ' + CD.stale_etag.status + '. This is how two writers update one blob without losing each other\'s work.', lines: [14, 17] }
        ],
        note: 'Use the first form for marker files and for outputs with a deterministic name. Use the second for read, change, write cycles. Both are documented for Blob Storage, and the emulator reproduced the documented outcome. Mission 10 uses the first inside a function handler.'
      }),

      B.talk({
        id: 'm2-lease', t: 2, src: 'rec', title: 'Leases: a lock with a clock',
        say: 'A lease locks one blob for one writer. I took one on a blob and tried to break it three ways. Press Next for each.',
        items: [
          ['Acquire', 'A lease lasts from 15 to 60 seconds, or until you release it. After I took a 15 second lease, the properties said state `' + LS.steps[1].state + '`, status `' + LS.steps[1].status + '` and duration `' + LS.steps[1].duration + '`. The call returns a lease id.', 'The id is the key.'],
          ['Writers without the id fail', 'A write without the lease id answered `' + LS.write_without_id.code + '` with HTTP ' + LS.write_without_id.status + ', and so did a delete. With the id, the write worked.', 'No id, no write.'],
          ['A second lease fails', 'Another client that asked for a lease while mine was active got `' + LS.second_acquire.code + '` with HTTP ' + LS.second_acquire.status + '. After I released mine, the state went back to `' + LS.steps[2].state + '`.', 'One holder at a time.'],
          ['When to use one', 'Use a lease for single-writer coordination: one instance of a job that must run alone, or a leader among several workers. A short lease that you renew is safer than a long one, because a crashed holder blocks everyone until it expires.', 'Short, and renewed.']
        ],
        cols: 1
      }),

      B.cmp({
        id: 'm2-redundancy', t: 1, src: 'docs', title: 'Redundancy: where the copies live',
        say: 'Redundancy is a setting of the account. Press Next to read the options. The durability figures are the documented targets over a year.',
        cols: ['Option', 'Where the copies live', 'Survives', 'Does not survive', 'Typical use'],
        hl: 1,
        rows: [
          ['LRS', 'Three copies in one data center', 'a disk or a rack failing. At least 11 nines of durability', 'a fire or flood of the data center, a zone outage', 'data you can rebuild, development'],
          ['ZRS', 'Three copies in three availability zones of one region', 'the loss of a zone. At least 12 nines', 'the loss of the whole region', 'production in a region with zones'],
          ['GRS', 'LRS in the home region, and an asynchronous copy in the paired region', 'a regional disaster, after a failover. At least 16 nines', 'a delete or a bad overwrite, because it is copied too', 'a lake that must survive a region loss'],
          ['GZRS', 'ZRS in the home region, and an asynchronous copy in the paired region', 'a zone loss and a regional disaster', 'a delete or a bad overwrite', 'the strongest option, and the most expensive'],
          ['RA-GRS, RA-GZRS', 'The same, with a read-only endpoint on the copy in the second region', 'the same, and reads can continue from the copy', 'writes stay down until failover', 'reporting that must keep reading']
        ],
        steps: [
          { upto: 2, say: 'Inside one region. LRS is the cheapest and sits in one data center. ZRS spreads over zones and is the usual production choice.' },
          { upto: 4, say: 'Across regions. The second region gets its copy a little later, usually within minutes, with no guarantee. A failover can lose the last writes.' },
          { upto: 5, say: 'The read-access options let reports read the copy. None of this is backup. A delete reaches every copy.' }
        ],
        pick: 'Use **ZRS** for production in a region that has zones, **GZRS or GRS** when the law or the business needs a copy in another region, and **LRS** only for data you can rebuild. Pair any of them with **soft delete**, because redundancy does not undo a mistake.'
      }),

      B.cmp({
        id: 'm2-tiers', t: 1, src: 'docs', title: 'Access tiers',
        say: 'A tier trades the price of keeping data against the price and speed of reading it. Press Next to read them. I set tiers on the emulator and read an archived blob. The prices are in mission 12.',
        cols: ['Tier', 'Use it for', 'Minimum time', 'Reading it', 'The catch'],
        hl: 1,
        rows: [
          ['Hot', 'Data you read often. The default (' + TR.default.tier + ', inferred from the account in the recording)', 'none', 'cheapest operations', 'the highest price to keep'],
          ['Cool', 'Data read now and then, kept at least a month', '30 days', 'online, slightly dearer reads', 'deleting or moving it early still bills the 30 days'],
          ['Cold', 'Data read rarely, kept at least three months', '90 days', 'online, dearer reads again', 'the same early-delete rule'],
          ['Archive', 'Data you must keep and almost never read', '180 days', 'offline. A read fails with `' + TR.read_archived.code + '` (HTTP ' + TR.read_archived.status + ') until you rehydrate it', 'rehydration takes hours, and it bills retrieval']
        ],
        steps: [
          { upto: 2, say: 'Hot for the new data. Cool and Cold for data that you still read, but rarely. They stay online.' },
          { upto: 4, say: 'Archive is the cheapest place to keep data, and the slowest to get it back. I tried to read an archived blob: it answered ' + TR.read_archived.code + '. Rehydration to an online tier takes up to many hours.' }
        ],
        pick: 'Keep **recent raw and curated data in Hot**, move **raw data older than 30 days** to Cool or Cold by lifecycle rule, and **archive** what the law makes you keep. Check the **minimum time and the retrieval fee** before each move.'
      }),

      B.code({
        id: 'm2-life', t: 1, src: 'docs', title: 'A lifecycle rule, as stored by the account', file: 'lifecycle.json', lang: 'json', code: LIFE,
        steps: [
          { say: 'A lifecycle policy is a list of rules. This one has a single rule. Azure evaluates the rules once a day, so a move happens within a day or so of the date, not at an exact second.', lines: null },
          { say: 'The filter chooses which blobs. `blobTypes` limits the rule to block blobs. `prefixMatch` must begin with the container name, so `raw/orders/` means the directory `orders/` in the container `raw`.', lines: G.span(LIFE, /"filters"/) },
          { say: 'Actions on the base blob move it to a cooler tier by days since the last change: to Cool at 30 days, to Cold at 90, to Archive at 180, and delete at 365. The ages count from the last modification, unless you turn on last access tracking.', lines: G.span(LIFE, /"baseBlob"/, /"delete"/) },
          { say: 'Snapshots and versions have their own actions. Without a rule for them, they pile up and bill for ever.', lines: G.span(LIFE, /"snapshot"/) }
        ],
        note: 'A rule that never matches is silent. The most common cause is a `prefixMatch` that leaves out the container name, which the bug hunt in this mission shows. The format is from the documentation, and the emulator has no lifecycle engine, so nothing here ran.'
      }),

      B.cmp({
        id: 'm2-protect', t: 2, src: 'docs', title: 'Protecting data from mistakes',
        say: 'Redundancy copies a mistake. Six features undo one. Press Next to read them. The emulator has no soft delete: its undelete answered ' + GAP.probes[0].undelete.code + '. So these come from documentation.',
        cols: ['Feature', 'What it does', 'Recovers from', 'The catch'],
        hl: 1,
        rows: [
          ['Blob soft delete', 'Keeps a deleted or overwritten blob for a number of days', 'a delete or an overwrite', 'The days are billed. A template starts with the service default, so set it on purpose.'],
          ['Container soft delete', 'Keeps a deleted container', 'a deleted container', 'Same cost rule.'],
          ['Versioning', 'Keeps every earlier version of a blob automatically', 'a bad overwrite', 'Versions pile up, so add a lifecycle rule for old versions.'],
          ['Point-in-time restore', 'Restores block blobs in a container range to an earlier time', 'a bad batch job', 'Needs soft delete, versioning and the change feed all on.'],
          ['Immutability policy', 'Makes blobs write-once for a period, or under a legal hold', 'deletion and change, even by an owner', 'You cannot shorten it. Use it where the law asks.'],
          ['Resource lock', 'Stops the deletion of the account or its resource group in Azure Resource Manager', 'deleting the account', 'It does not stop deleting the blobs inside.']
        ],
        steps: [
          { upto: 3, say: 'Soft delete and versioning are the everyday undo. Turn them on for every lake.' },
          { upto: 5, say: 'Point-in-time restore and immutability are for bigger recoveries and for rules of law.' },
          { upto: 6, say: 'A lock protects the account, not the data in it. People forget that.' }
        ],
        pick: 'Turn on **blob and container soft delete** for every lake, add **versioning** with a lifecycle rule for old versions on tables you overwrite, and put a **lock** on the account. Use **immutability** only where the law asks for it.'
      }),

      B.widget({ id: 'm2-sas-lab', kind: 'sas', t: 1, src: 'rec', title: 'Lab: read a SAS and predict the answer' }),

      B.cmp({
        id: 'm2-sas-kinds', t: 2, src: 'docs', title: 'Three kinds of SAS',
        say: 'A SAS is a signed URL with limited rights. Press Next to read the three kinds. The recorded token fields came from the SDK: a service SAS with the fields ' + SF.order.join(', ') + ', and an account SAS with ' + Object.keys(AF.fields).join(', ') + '.',
        cols: ['Kind', 'Signed with', 'Covers', 'How you cancel it'],
        hl: 1,
        rows: [
          ['Account SAS', 'the account key', 'one or more services of the account, with the resource types `' + AF.fields.srt + '`', 'rotate the key, which kills every token made with it'],
          ['Service SAS', 'the account key', 'one blob, one container or one directory', 'a stored access policy, if you used one, or rotate the key'],
          ['User delegation SAS', 'a key that Entra ID hands out, for a limited time', 'blobs and directories, with the rights of the signer', 'revoke the delegation key, or wait. It lives at most 7 days'],
          ['Stored access policy', 'not a token by itself. A named set of permissions and times on a container', 'the tokens that refer to it', 'edit or delete the policy, and every token that uses it changes at once']
        ],
        steps: [
          { upto: 2, say: 'The two kinds that need the account key. Anyone who can list the keys can make tokens for ever, so these are the ones to avoid when you can.' },
          { upto: 4, say: 'The user delegation SAS needs no account key and is tied to an Entra identity. A stored access policy lets you cancel tokens one group at a time.' }
        ],
        pick: 'Hand out a **user delegation SAS**, with the shortest life that works, and keep the **account key switched off**. Use a **stored access policy** when you need to cancel a group of tokens.'
      }),

      B.flow({
        id: 'm2-events', t: 1, src: 'docs', title: 'Writers, events and lifecycle around a storage account', g: 'storage', legend: true,
        steps: [
          { say: 'One storage account, three things around it. Writers put blobs in. Event Grid hears about new blobs. A lifecycle rule moves old blobs to cheaper tiers and finally deletes them.', cap: 'A storage account with writers, events and lifecycle.' },
          { say: 'Step 1. Writers put blobs into containers. A pipeline writes raw files, Event Hubs Capture writes Avro files, and people or scripts upload with AzCopy. Every write is a whole blob or a committed block list.', on: ['s1', 's1b', 's1c'], focus: ['w1', 'w2', 'w3', 'pr', 'pc'], tags: ['tg_rep'], cap: 'The account keeps the copies that its redundancy says.' },
          { say: 'Step 2. When a blob is created or deleted, the account can raise an event to Event Grid. On an ADLS Gen2 account a single upload can raise two BlobCreated events: one for CreateFile with no data, and one for FlushWithClose when the write is complete.', on: ['s2'], focus: ['pr', 'nt'], cap: 'An event for each new blob, and watch for the empty one.' },
          { say: 'Step 3. An event subscription filters the events by path and type and sends them to a handler: a function, a queue or a pipeline trigger. Filter on the completed write, or the handler will start on an empty file.', on: ['s3', 's4'], focus: ['nt', 'sb', 'tg'], cap: 'A filter decides who hears about a blob.' },
          { say: 'Step 4. Lifecycle rules run on their own. After 30 days blobs move to Cool, after 90 to Cold, after 180 to Archive, and after 365 they are deleted. Each hop changes the price of keeping them.', on: ['l1', 'l2', 'l3', 'l4'], focus: ['cl1', 'cl2', 'cl3', 'cl4', 'cl5'], tags: ['tg_life'], cap: 'Age decides the tier.' }
        ]
      }),

      B.cmp({
        id: 'm2-secure', t: 2, src: 'docs', title: 'Locking a storage account down',
        say: 'Eight settings protect an account that holds personal data. Press Next to read them. Check what your account has, because the defaults differ between the portal and a template.',
        cols: ['Setting', 'What it does', 'Notes'],
        hl: 1,
        rows: [
          ['Blob anonymous access: off', 'No container can be made readable without a token.', 'Switch it off at the account. Then no one can open a container to the public by mistake.'],
          ['Secure transfer and TLS 1.2', 'Refuses plain HTTP and old TLS versions.', 'Set the minimum TLS version on the account.'],
          ['Storage account key access: off', 'Only Entra tokens and user delegation SAS are accepted.', 'A key is full access and cannot be limited. Switch it off once your tools use identities.'],
          ['Default to Entra authorization', 'The portal browses data with your identity, not with the key.', 'Pairs with the setting above.'],
          ['Firewall or private endpoint', 'Only named networks, or only a private IP, can reach the account.', 'Mission 11 builds it, with the DNS that it needs.'],
          ['Encryption with your own key', 'Data is encrypted at rest by default. A key in Key Vault gives you control and an audit trail.', 'Only when you need it. The account then needs an identity that can use the key.'],
          ['Diagnostic logs', 'Records who read, wrote or deleted which blob.', 'Send them to the platform subscription, and keep the volume sane.'],
          ['Microsoft Defender for Storage', 'Flags unusual access and malware uploads.', 'Priced for each account, so decide by the data it holds.']
        ],
        steps: [
          { upto: 4, say: 'Access first: no anonymous reads, encrypted transport, no account key, and an identity for the portal.' },
          { upto: 8, say: 'Then the network, the key, the logs and the threat detection. The last two answer what an auditor asks.' }
        ],
        pick: 'Turn on **no anonymous access**, **TLS 1.2**, **no account key**, a **private endpoint** for sensitive data, **soft delete**, and send the **logs** to the platform subscription.'
      }),

      B.cmp({
        id: 'm2-errors', t: 1, src: 'rec', title: 'What storage says when it says no',
        say: 'Eight calls that failed on purpose, and what the emulator answered. Press Next to read them. The first eight are recorded. The last four come from documentation.',
        cols: ['The call', 'Code', 'HTTP', 'What it means'],
        hl: 1,
        rows: [
          ['read a blob that does not exist', ER.get_missing_blob.code, String(ER.get_missing_blob.status), 'The container is there and the blob is not.'],
          ['read from a container that does not exist', ER.get_missing_container.code, String(ER.get_missing_container.status), 'A wrong name, a wrong account or a deleted container.'],
          ['create a container that exists', ER.create_existing_container.code, String(ER.create_existing_container.status), 'Handle it as a normal outcome in setup code.'],
          ['`upload_blob` with `overwrite=False` on an existing name', CD.overwrite_false.code, String(CD.overwrite_false.status), 'The condition on the name failed. The blob is untouched.'],
          ['change a blob with an old ETag', CD.stale_etag.code, String(CD.stale_etag.status), 'Someone changed the blob since you read it.'],
          ['write to a leased blob without the lease id', LS.write_without_id.code, String(LS.write_without_id.status), 'Another client holds the lock.'],
          ['read an archived blob', TR.read_archived.code, String(TR.read_archived.status), 'The blob is offline. Rehydrate it first.'],
          ['delete a blob that has snapshots', TS.delete_with_snapshot.code, String(TS.delete_with_snapshot.status), 'Delete the snapshots too, or ask for them to go with it.'],
          ['a token with no permission for the call (mission 3)', 'AuthorizationPermissionMismatch', '403', 'The caller is known, and no role or SAS allows this. Read the roles and the SAS.'],
          ['a bad or expired signature (docs)', 'AuthenticationFailed', '403', 'The emulator answers `' + ER.wrong_account_key.code + '`. The status is the same. The service names the code differently.'],
          ['account key access switched off (docs)', 'KeyBasedAuthenticationNotPermitted', '403', 'A tool still signs with the key. Move it to an identity.'],
          ['too many requests to the account or a partition range (docs)', 'ServerBusy', '503', 'Retry with exponential backoff, and write bigger blobs.']
        ],
        steps: [
          { upto: 3, say: 'Not found and already exists. The two that every setup script meets.' },
          { upto: 6, say: 'Conditions and locks. These are answers you expect, and you handle them as normal outcomes.' },
          { upto: 8, say: 'Tiers and snapshots. Archive and a stale snapshot each block an obvious action.' },
          { upto: 12, say: 'Access and throttling. Read mission 3 for the first, and the incident later in this mission for the last.' }
        ],
        pick: 'Catch the **error code and the status**, not the message. Treat **`ConditionNotMet`, `BlobAlreadyExists` and `LeaseIdMissing`** as outcomes, and **retry `ServerBusy`** with backoff. The SDK already retries some failures for you.'
      }),

      B.quiz({
        id: 'm2-q1', t: 1,
        q: 'You list the container with `name_starts_with="ord"` and `delimiter="/"`. What do you get back?',
        opts: [
          { t: 'The six blobs whose names start with `ord`', fb: 'That is what you get with no delimiter. With `/` the names are rolled up.' },
          { t: 'One blob prefix: `' + L('ord', '/').common_prefixes[0] + '`', fb: '' },
          { t: 'An error, because `ord` is not a folder', fb: 'A flat namespace has no folders, so there is nothing to be invalid. The prefix is just a string.' },
          { t: 'An empty list, because no blob is named exactly `ord`', fb: 'A prefix matches the start of a name, not the whole name.' }
        ],
        ok: 1, why: 'Every name under `ord` goes through the delimiter rule: the service cuts each name at the next `/` after the prefix and returns the distinct cuts as blob prefixes. All six names lead to `orders/`. The recorded call returned exactly that.'
      }),

      B.quiz({
        id: 'm2-q2', t: 1,
        q: 'A job calls `upload_blob(name, data, overwrite=False)` and the blob already exists. What happens?',
        opts: [
          { t: 'The blob is replaced, and `overwrite=False` only changes a log line', fb: 'It changes the request: the SDK sends a condition.' },
          { t: 'The call fails with `' + CD.overwrite_false.code + '` and HTTP ' + CD.overwrite_false.status + ', and the blob is unchanged', fb: '' },
          { t: 'The service creates a second blob with a number added to the name', fb: 'Storage never renames your blob for you.' },
          { t: 'The call waits until the other writer finishes', fb: 'It does not wait. A conditional write answers at once.' }
        ],
        ok: 1, why: 'The SDK sent `If-None-Match: *`, which means "only if no blob has this name". The recorded call answered ' + CD.overwrite_false.code + ' with HTTP ' + CD.overwrite_false.status + '. This is the simplest way to make a write safe to repeat.'
      }),

      B.quiz({
        id: 'm2-q3', t: 1,
        q: 'You upload the same bytes to the same name twice and read the ETag each time. What do you see?',
        opts: [
          { t: 'The same ETag, because the content is the same', fb: 'The ETag is not a hash of the content.' },
          { t: 'A different ETag, because the ETag changes on every write', fb: '' },
          { t: 'The MD5 of the content, always', fb: 'Azure does not define the ETag as an MD5. In S3 a single upload happens to give one, and Azure does not.' },
          { t: 'No ETag, because only versioned blobs have one', fb: 'Every blob has an ETag.' }
        ],
        ok: 1, why: 'The recording shows it: two uploads of the same bytes gave two ETags. The ETag is a version token that changes on each write, so use it for conditions, and use a checksum for content.'
      }),

      B.quiz({
        id: 'm2-q4', t: 1,
        q: 'A report job reads a blob and gets `' + TR.read_archived.code + '` with HTTP ' + TR.read_archived.status + '. What is the situation?',
        opts: [
          { t: 'The blob is in the Archive tier and is offline, so it must be rehydrated first', fb: '' },
          { t: 'The blob was deleted and soft delete is off', fb: 'A deleted blob answers `BlobNotFound`, with 404.' },
          { t: 'The caller has no role on the container', fb: 'That gives a 403.' },
          { t: 'The account is out of space', fb: 'Reads do not depend on free space.' }
        ],
        ok: 0, why: 'Archive is offline storage. A read fails until the blob is moved to Hot, Cool or Cold, which takes hours, or is copied to an online blob. Plan restores before you need them, and keep data you read at all out of Archive.'
      }),

      B.order({
        id: 'm2-ord', t: 1, q: 'Put the upload of a 20 GB file with blocks in order.',
        items: [
          'Split the file into blocks and give each one an id of the same length',
          'Stage each block with its id, in parallel',
          'Retry any block that failed, alone',
          'Commit the block list, in order',
          'Verify the result with a checksum, not with the ETag',
          'If you give up, do nothing: uncommitted blocks expire by themselves'
        ],
        why: 'Split, stage in parallel, retry single blocks, commit, verify, and let the leftovers expire. Nothing is visible as a blob until you commit. The SDK and AzCopy do all of this for you above a size threshold.'
      }),

      B.bug({
        id: 'm2-bug', t: 1, q: 'This function should delete one day of orders. It also deletes another day that someone renamed. Click the line that is wrong.',
        file: 'delete_day.py', lang: 'python', code: DEL_BUG, bad: [2],
        hint: 'A prefix is a string match, and a folder name is only part of a string.',
        why: 'Line 2 builds `orders/dt=2026-03-14` with no closing slash. A prefix matches the start of a name, so it also matches `orders/dt=2026-03-14_late/` and every other name that begins the same way. A trailing `/` ends the day and nothing more. Test a delete with a listing first.',
        fix: DEL_FIX,
        cheer: 'List before you delete, and close every prefix with a slash.'
      }),

      B.bug({
        id: 'm2-bug2', t: 2, src: 'docs', q: 'A lifecycle rule should move old raw orders to Cool. Thirty days pass and nothing moves. Click the line that causes it.',
        file: 'lifecycle.json', lang: 'json', code: LIFE_BUG, bad: [8],
        hint: 'A prefix in a lifecycle rule starts with the container.',
        why: 'The `prefixMatch` of a lifecycle rule must begin with the container name. `orders/` means a container named `orders`, which does not exist, so the rule matches nothing and fails without a word. `raw/orders/` is the directory `orders` in the container `raw`. This rule comes from the documentation, and the emulator has no lifecycle engine to show it.',
        fix: LIFE_FIX,
        cheer: 'After you save a rule, check a few blobs a day later.'
      }),

      B.decide({
        id: 'm2-dec', t: 2, src: 'docs', title: 'Decision: how do you store the 40 TB raw zone?',
        scenario: 'The raw zone holds **40 TB** of order and event files. The newest week is read daily. Older data is read rarely, in bursts, when someone re-runs a month. Nobody can predict which month. The team wants **low cost and little manual work**. The rates below are examples.',
        opts: [
          { t: 'Keep everything in Hot', d: 'Simple. No retrieval fees. About $800 a month at $0.02 for each GB-month.', lose: 'The most expensive choice over a year, when most of the data is rarely read.' },
          { t: 'A lifecycle rule moves blobs to Cool after 30 days and to Cold after 90', d: 'About $450 a month if most data is old. Predictable.', lose: 'Each re-run of an old month pays a higher read price, and a blob moved or deleted early still bills its minimum days. If re-runs are common, the extra reads can cancel the saving.' },
          { t: 'A lifecycle rule driven by last access time, which moves a blob back to Hot when it is read', d: 'Cool blobs return to Hot by themselves after a read. A small cost for tracking access.' }
        ],
        pick: 2,
        why: 'Access is bursty and unpredictable. Last access tracking moves what is not used to a cheaper tier and, with auto-tier from Cool to Hot, brings a blob back when a re-run reads it. There is a small charge for tracking, and the automatic return works from Cool, so plan the Cold and Archive steps by age.',
        when: 'If access is predictable, for example data is never read after 30 days, a plain age rule to Cool, Cold and Archive is cheaper and needs no tracking. Do the arithmetic with your own object count and read pattern before you choose.'
      }),

      B.incident({
        id: 'm2-inc', t: 2, src: 'docs', title: 'Incident: ingestion fails with ServerBusy', time: '14:05',
        alert: '**The clickstream loader logs `ServerBusy` (HTTP 503) on thousands of writes a minute.** The loader receives about 20,000 events a second and writes each event as its own blob under the single directory `raw/events/`, named by timestamp. Retries pile up and the backlog grows.',
        clues: ['One blob for each event', 'All names share the prefix `raw/events/` and grow in time order', 'The account answers 503 when it or a range of names is throttled'],
        opts: [
          { t: 'Batch events into larger blobs, for example with Event Hubs Capture, and keep the retries on exponential backoff', fb: '' },
          { t: 'Retry faster, with no delay, until the writes get through', fb: 'Faster retries add load to a throttled range and make the backlog worse. Retries need exponential backoff.' },
          { t: 'Switch the account to the Archive tier', fb: 'The tier does not change how many requests the account accepts.' },
          { t: 'Create a second storage account and send half the events to it', fb: 'It spreads the load, but it keeps one blob for each event, so every later query still opens millions of tiny files.' }
        ],
        best: 0,
        why: 'At 20,000 writes a second, the loader makes one request for each event, and the names grow in time order, so the writes crowd into one range of names. One blob for each event also leaves millions of tiny files that every later query must open. Batching 100 or more events into one blob cuts the request rate to about 200 a second, and Event Hubs Capture does that batching for you.',
        checks: [
          ['Read the error', '`ServerBusy` with HTTP 503 means the account or a range of names is throttled. It is a signal to slow down and spread out.'],
          ['Count the requests', '20,000 events a second as 20,000 requests a second is far above what to ask of one name range.'],
          ['Check the layout', 'One blob for each event, names in time order. Both are the problem.'],
          ['Fix the writer', 'Put events through Event Hubs Capture, or batch in the loader, and write blobs of 64 MB or more in date and hour folders.'],
          ['Protect the writer', 'Retry with backoff and jitter, and alarm on 503 answers.']
        ],
        tell: 'Our clickstream loader wrote one blob for each event, about 20,000 a second, all in one directory with names in time order, and storage answered ServerBusy. I stopped the immediate retries, which made it worse, and moved the writes to Event Hubs Capture, which batches events into Avro files by time and size. The request rate fell to a few a second and the later queries got faster, because they now open far fewer files. I added exponential backoff with jitter and an alert on 503 answers.',
        prevent: ['Never write **one blob for each event**', 'Put **Event Hubs Capture or a batching step** in front of storage', 'Use **date and hour folders** and keep blobs large', 'Retry with **backoff and jitter**, and alert on throttling']
      }),

      B.incident({
        id: 'm2-inc2', t: 2, src: 'docs', title: 'Incident: the wrong days were deleted', time: '09:40',
        alert: '**A cleanup script deleted four days of `raw/orders/` that were still needed.** The account uses GRS. It was created from a template, and nobody set soft delete or versioning. The raw files are the only copy of those days, because the source database keeps only 30 days of changes.',
        clues: ['GRS copies a delete to the second region', 'The account came from a template with no data protection settings', 'The source keeps 30 days of changes'],
        opts: [
          { t: 'Check whether soft delete or versioning was on. If not, rebuild the four days from the source and the Capture files that still exist, and then turn on protection', fb: '' },
          { t: 'Fail over to the second region to get the old copy back', fb: 'GRS copied the delete too, so the second region has the same gap. A failover also moves every writer.' },
          { t: 'Tell the team the data is gone and carry on', fb: 'Some of it can be rebuilt from the source, and the gap should be closed while the source still has the changes.' },
          { t: 'Switch the account to Archive so nothing else can be read or deleted', fb: 'That does not protect anything, and it makes the data slow to read.' }
        ],
        best: 0,
        why: 'Redundancy copies deletes, so the second region cannot help. Soft delete would have kept the files, and it was never turned on. With the source database holding only 30 days, the quick job is to rebuild the missing days from it before they age out, then fix the template so that soft delete, versioning and a lock exist from the first deployment.',
        checks: [
          ['Stop the damage', 'Remove the delete role from the script identity until you know what it did.'],
          ['Look for an undo', 'List deleted blobs. If soft delete was on, undelete them.'],
          ['Look for another source', 'Capture files, the source database and the clean zone can rebuild raw.'],
          ['Rebuild what you can', 'Re-run the pipeline for the four days while the source still holds them.'],
          ['Close the gap', 'Put soft delete, versioning, a lock and a restricted delete role into the template.']
        ],
        tell: 'A cleanup script deleted four days of raw orders. The account was geo-redundant, but that copies deletes, and the template had no soft delete or versioning. Since the source only keeps 30 days of changes, I rebuilt the four days from the source and from the Capture files that still existed, and I checked the row counts against the clean zone. Then I changed the template so that every lake gets soft delete, versioning and a lock, and I took the delete role away from the cleanup identity.',
        prevent: ['Turn on **soft delete and versioning** in the template', 'Put a **lock** on the account', 'Give cleanup scripts **narrow roles**, and a dry run that lists first', 'Remember that **redundancy is not backup**']
      }),

      B.qa({
        id: 'qa-storage', t: 1, tag: 'Storage', secs: 60,
        q: 'Explain Azure Storage: accounts, containers and blobs. Why does a plain account have no real folders?',
        pts: ['A storage account is the top-level unit: name, redundancy, network, keys', 'A container holds blobs, and a blob is bytes plus metadata under a name', 'A name is one string, and the slashes are characters', 'The portal and the API group names with a prefix and a delimiter', 'You write and read whole blobs or committed blocks, with no edit in place', 'Strongly consistent, and the account keeps copies as its redundancy says'],
        short: 'A storage account is the top-level unit. Its name becomes the host of the endpoints, and it carries the redundancy, the network rules and the keys. Inside it, a container holds blobs, and a blob is bytes with metadata under a name. The name is just a string. `raw/orders/a.json` is one name, and the slashes are ordinary characters, so a plain account has no folders. When a list call gives a delimiter, the service groups names by the text up to the next slash and returns blob prefixes, which the portal draws as folders.\n\nYou write and read whole blobs, or you stage blocks and commit them. You cannot edit the middle of a block blob. Storage is strongly consistent, so a read after a successful write sees it. The account keeps copies as its redundancy setting says, but a delete is copied too, so I turn on soft delete.\n\nThe meters are storage by tier, operations, retrieval for cool tiers, and data transfer.',
        fu: [
          ['How do you list a million blobs?', 'With the SDK pager. One call returns a page and a marker, and the pager loops until there is no marker.'],
          ['What is a prefix?', 'The start of a name. It is how you group blobs, how lifecycle rules choose blobs, and how request ranges are formed.']
        ],
        trap: 'Saying that a plain account has folders that you create. Making a folder in the portal writes a zero-byte blob or just a prefix, depending on the account.',
        real: 'Describe a listing or layout bug that you hit, and the fix.'
      }),

      B.qa({
        id: 'qa-adls', t: 1, tag: 'Storage', secs: 60,
        q: 'What is ADLS Gen2, and when would you switch on the hierarchical namespace?',
        pts: ['ADLS Gen2 is Blob Storage with a hierarchical namespace', 'Real directories, and an atomic rename and delete of a directory', 'POSIX-style ACLs on directories and files, as well as roles', 'The dfs endpoint and the abfss driver for analytics engines', 'Some blob features are missing or differ, so check the support table', 'Decide at creation for lakes read by Spark, Synapse and Data Factory'],
        short: 'ADLS Gen2 is not a separate service. It is a storage account with the hierarchical namespace turned on. Directories become real objects, so renaming or deleting a directory is one atomic operation instead of a copy and delete of every blob, and I can put POSIX-style ACLs on directories and files as well as using Azure roles.\n\nAnalytics engines such as Spark, Synapse and Data Factory commit their output by renaming a temporary folder, so the atomic rename makes them faster and safer, and I use the dfs endpoint and the `abfss` driver. The cost is features: a few blob features are not available or behave differently on such an account, so I check the feature support table before I rely on one.\n\nI switch it on for any lake that engines read and write, and I decide when I create the account, because an upgrade of an existing account has limits and downtime.',
        fu: [
          ['What does an ACL give that a role does not?', 'Control below the container, per directory and per file, for named users and groups. A role grants at the account or container, and a grant ends the check.'],
          ['Which events does an upload raise?', 'BlobCreated for CreateFile with no data and again for FlushWithClose when the write is complete. Filter on the completed one.']
        ],
        trap: 'Describing ADLS Gen2 as a different product. It is a switch on a storage account.',
        real: 'Describe a lake where the atomic rename mattered, or a feature that you lost.'
      }),

      B.qa({
        id: 'qa-lake', t: 2, tag: 'Storage', secs: 90,
        q: 'How would you lay out a data lake on ADLS Gen2? Talk about containers, formats, partitions and file sizes.',
        pts: ['A container for each zone: raw, clean, curated, each with its own roles and lifecycle', 'One directory for each table, partitioned by date with Hive-style folders', 'Parquet with Snappy in clean and curated, Delta where updates are needed', 'Files of 100 MB to 1 GB, compacted regularly', 'Partition on low-cardinality columns that queries filter on', 'Catalog, protection and lifecycle rules from the start'],
        short: 'I use three containers, one for each zone. Raw keeps files exactly as received, which lets me rebuild everything. Clean has typed Parquet with duplicates removed. Curated has the small business tables. A container is a unit for roles, lifecycle filters and metrics, so each zone gets its own writers, permissions and retention.\n\nInside a zone, each table has one directory and is partitioned by date in Hive-style folders such as `dt=2026-03-14/`, so Synapse and Spark skip the days a query does not need. I partition on a low-cardinality column that queries filter on. A column with millions of values creates millions of tiny folders.\n\nIn clean and curated I use Parquet with Snappy, in files of 100 MB to 1 GB, and Delta where I need updates. Many small files cost operations and slow every query, so I compact them. The tables are in a catalog. I turn on soft delete and lifecycle rules from the start, with a rule for old snapshots and versions.',
        fu: [
          ['Why not partition by customer?', 'There are too many customers, so each folder would hold tiny files. Partition by date and let Parquet statistics help with the customer filter.'],
          ['What do you do about small files?', 'Batch before writing, with Event Hubs Capture or the loader, and compact with a scheduled job. Delta tables can compact for you.']
        ],
        trap: 'Choosing a partition column because it is available, not because queries filter on it.',
        real: 'Describe a table whose layout you changed and the data processed before and after.'
      }),

      B.qa({
        id: 'qa-sas', t: 1, tag: 'Storage', secs: 60,
        q: 'What is a SAS token, and how do you hand out access to a blob safely?',
        pts: ['A signed URL with permissions, a resource and a time window', 'Signed with the account key or, better, a user delegation key', 'The signature covers the fields, so editing a field breaks it', 'A short life, the fewest permissions, and https only', 'Cancel with a stored access policy, a key rotation, or by waiting', 'Prefer identities and roles for jobs, and a SAS for outside parties'],
        short: 'A SAS is a signed URL. The query string holds the permissions, the resource, the start and expiry times, the protocol and the service version, and a signature over all of them made with a key. Anyone who holds the URL has those rights until it expires, so I treat it like a password.\n\nI sign with a user delegation key from Entra ID where I can, because it needs no account key and lives at most seven days. An account key signs a SAS that I can only cancel by rotating the key. The signature covers every field, so editing `sp=r` to `sp=rw` in the URL makes every call fail, as I saw on the emulator.\n\nI give the shortest life that works, only the permissions needed, https only, and a stored access policy when I need to cancel a group of tokens. For my own jobs I do not use a SAS at all: a managed identity with a role is better. A SAS is for people and systems outside my tenant.',
        fu: [
          ['What happens to every SAS when you rotate the account key?', 'Every token signed with that key stops working. That is the blunt way to cancel them.'],
          ['Which fields would you check in a token that was shared by mistake?', 'sp for the permissions, se for the expiry, sr for the resource, and spr for https only.']
        ],
        trap: 'Putting a long-lived account SAS in a repository or a pipeline parameter.',
        real: 'Describe a SAS you issued and how you limited it.'
      }),

      B.qa({
        id: 'qa-tiercost', t: 2, tag: 'Storage', secs: 90,
        q: 'How do you reduce the cost of Azure Storage for a data platform?',
        pts: ['Lifecycle rules and the right tiers, with the minimum days in mind', 'Rules for old versions and snapshots', 'Fewer, larger blobs to cut operations cost', 'Parquet and compression to shrink the data itself', 'Redundancy that matches the data: ZRS or LRS where you can rebuild', 'Measure first with cost analysis and storage metrics'],
        short: 'I measure first. Cost analysis and the storage metrics show where the bytes and the operations are. Then I go through the meters.\n\nStorage: lifecycle rules move cold data to Cool, Cold or Archive, after I check the minimum days and the retrieval fees. I add rules for old versions and snapshots. Parquet with compression shrinks the data itself, and the redundancy should match the data, so rebuildable data does not need GRS.\n\nOperations: many tiny blobs mean many write and read operations, so I batch writes into big files and compact old ones.\n\nTransfer: I keep consumers in the same region, avoid sending data out to the internet, and watch the replication traffic of geo-redundant accounts.\n\nI also delete what nobody needs: old test data, temporary outputs and abandoned accounts.',
        fu: [
          ['When is Cool the wrong choice?', 'When data is read often, because the read price cancels the saving, or when it is deleted within 30 days, because the minimum still bills.'],
          ['What is last access tracking?', 'A setting that records the last read of each blob, so a lifecycle rule can move blobs by use and bring a cool blob back to Hot when it is read.']
        ],
        trap: 'Moving everything to the cheapest tier without checking how often it is read.',
        real: 'Describe the largest storage saving you made and how you found it.'
      }),

      B.qa({
        id: 'qa-protect', t: 2, tag: 'Storage', secs: 60,
        q: 'What protects a data lake from a deleted or overwritten file, and what does not?',
        pts: ['Soft delete for blobs and containers keeps deleted data for a number of days', 'Versioning keeps earlier versions of overwritten blobs', 'Point-in-time restore needs soft delete, versioning and the change feed', 'Immutability makes blobs write-once where the law asks', 'A resource lock stops deleting the account, not the blobs', 'Redundancy copies deletes, so it is not backup'],
        short: 'Redundancy does not protect against a mistake, because a delete or a bad overwrite is copied to every copy. What protects the lake is soft delete for blobs and containers, which keeps deleted data for a number of days, and versioning, which keeps earlier versions of overwritten blobs. Point-in-time restore builds on both plus the change feed, and restores block blobs to an earlier time.\n\nFor data that must not change, an immutability policy makes blobs write-once for a period or under a legal hold, even against an owner. A resource lock stops the account being deleted in Resource Manager, but it does not stop blobs inside it being deleted.\n\nI turn these on in the template, because a template starts with the service defaults, and I pair versioning with a lifecycle rule so the old versions do not pile up. I also give cleanup jobs narrow roles and a dry run that lists first.',
        fu: [
          ['What does it cost to keep soft-deleted data?', 'The same as any data in that tier, for the days of the retention period.'],
          ['Why is a lock not enough?', 'It guards the account in Azure Resource Manager. Data calls go to the storage service, which the lock does not see.']
        ],
        trap: 'Believing that geo-redundant storage is a backup.',
        real: 'Describe a time soft delete or versioning saved data, or would have.'
      }),

      B.recap({
        id: 'm2-recap', n: 2, badge: 'Lake Keeper', color: '#FDE68A',
        pts: [
          'A **storage account** holds containers of blobs. A name is a string, and a delimiter makes folders in a listing. **ADLS Gen2** makes folders real.',
          'A list call returns a **page and a marker**. Use the pager, and close every prefix with a slash.',
          'Lay out the lake in **containers for zones and date partitions**, with **Parquet files of 100 MB or more**.',
          'Write safely with **`overwrite=False`, ETags and leases**. The **ETag is a version token**, not a hash.',
          'Pick **redundancy** and a **tier** by what you can rebuild and how often you read, and read the **minimum days**.',
          'Turn on **soft delete and versioning**. A **SAS** is a signed URL, and editing it breaks the signature.'
        ],
        lines: [
          'A name is a string, and I page every listing.',
          'I make every write safe to run twice.',
          'I put protection and lifecycle rules in the template, on the day I create the account.'
        ]
      })
    ]
  });
})();
