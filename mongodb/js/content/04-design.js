/* Mission 4: validation, idempotent writes, transactions and change streams. design.py and streams.py ran against a real mongod 8.0 (a replica set of one member). */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var D = C('design'), ST = C('streams'), DES = G.file('design.py'), STR = G.file('streams.py'), V = G.table('design.validation').rows;
  G.expect(V[0][1] === 'inserted' && V.slice(1, 6).every(function (r) { return r[1] === 'code 121' && r[2] === 'Document failed validation'; }) && V[6][1] === 'code 11000' && D.payments_held === 1, 'five bad payments fail validation with code 121, a repeated order fails with 11000, and one payment is held');
  G.expect(D.upsert_first.join() === '3,0,0' && D.upsert_second.join() === '0,3,0' && D.plain_insert_error_code === 11000 && D.inside === 1 && D.outside === 0 && D.after_abort === 0 && D.after_commit === 1, 'an upsert run twice changes nothing the second time, and a transaction is invisible outside until it commits');
  G.expect(ST.events.length === 3 && /^insert O-1 full status=PLACED$/.test(ST.events[0]) && /^update O-1 changed \{'status': 'SHIPPED'\} full=None$/.test(ST.events[1]) && /^delete O-1/.test(ST.events[2]) && ST.resumed.length === 2, 'a change stream gives an insert, an update with its changed fields and a delete, and a resume gives the two events that were written while nobody watched');

  LAB.addChapter({
    id: 'm4', n: 4, title: 'Validation, writes and change streams', short: 'Streams', blurb: 'A schema rule, a load that is safe to repeat, a transaction, and a stream of changes', minutes: 24,
    focus: ['mart', 'mon'],
    goals: [
      'Add a **validation rule** to a collection and read the **code 121** error.',
      'Make a load **safe to repeat** with an **upsert**.',
      'Say what a **transaction** does here, and that it needs a **replica set**.',
      'Read a **change stream**, and **resume** it from a token.'
    ],
    say: 'This is how data gets in and out. A loader writes documents, and a rule on the collection decides what is accepted. A change stream carries every write out to the lake. I ran all of it on a real server, as a replica set of one member.',
    scenes: [
      B.code({
        id: 'm4-code', t: 1, src: 'rec', title: 'design.py: a rule, a repeat and a transaction', file: 'design.py', lang: 'python', code: DES,
        steps: [
          { say: 'One program with four parts. Press Next.', lines: null },
          { say: 'A collection with a **validation rule**, a JSON schema: three required fields, an **integer** amount of at least 0, and a currency from a list. A **unique index** on `order_id` comes next.', lines: G.span(DES, /db\.create_collection\('payments'/, /db\.payments\.create_index/) },
          { say: 'Seven payments, one good and six that each break a rule.', lines: G.span(DES, /^tests = \[/, /^\]$/) },
          { say: 'Each one is inserted, and the program prints whether the server **accepted or refused it**, with the error code.', lines: G.span(DES, /for label, doc in tests/, /print\('payments held/) },
          { say: 'An **upsert**: `ReplaceOne` with `upsert=True` replaces the document if it exists and inserts it if it does not. It runs **twice**.', lines: G.span(DES, /write = \[ReplaceOne/, /print\('%s run of the upsert/) },
          { say: 'The plain way: **`insert_many`** of the same documents a second time.', lines: G.span(DES, /db\.drop_collection\('daily_plain'\)/, /print\('daily holds/) },
          { say: 'A **transaction**: a write that other readers do not see until the commit, and that an abort throws away.', lines: G.span(DES, /db\.drop_collection\('transfers'\)/, /after commit/) }
        ]
      }),

      B.term({
        id: 'm4-out', t: 1, src: 'rec', title: 'What design.py printed',
        say: 'The output, line by line. The first block is the validation rule.',
        lines: function () { return G.plain(X('design.run')); },
        after: 'The good payment went in. The five that broke the schema were refused with code **121** and **"Document failed validation"**: a text amount, a decimal amount, a negative one, an unknown currency, a missing field. The repeated order was refused with code **11000**, a different check: the **unique index**. The upsert changed **' + D.upsert_first[0] + '** documents the first time and **nothing** the second time (matched **' + D.upsert_second[1] + '**, modified **' + D.upsert_second[2] + '**). The plain `insert_many` failed with code **' + D.plain_insert_error_code + '**. The transaction was seen **inside** (' + D.inside + ') and **not outside** (' + D.outside + ') until the commit.',
        afterKind: 'tip',
        doneSay: 'A load must be safe to repeat.'
      }),

      B.widget({ id: 'm4-lab', kind: 'writelab', t: 1, src: 'rec', title: 'Lab: rules, repeats and a transaction' }),

      B.flow({
        id: 'm4-flow', t: 1, src: 'rec', title: 'A change stream and a resume token', g: 'stream', legend: true,
        steps: [
          { say: 'Writes go in, and a job reads the changes out. Press Next.', focus: ['app', 'log', 'str', 'job', 'lake'], cap: 'Writes in, changes out.' },
          { say: 'Step 1. Three writes: an **insert**, an **update** and a **delete** of the order `O-1`.', on: ['e1', 'e2'], focus: ['app', 'log'], cap: 'Every write is logged.' },
          { say: 'Step 2. The stream gave **one event for each write**: `' + ST.events[0] + '`, then `' + ST.events[1] + '`, then `' + ST.events[2] + '`.', on: ['e3'], focus: ['str', 'job'], tags: ['tg_events'], cap: 'One event for each write.' },
          { say: 'Step 3. The job kept the **resume token** of the event that it had handled. A stream that is **closed** and reopened with that token **continues from there**.', on: ['e4'], focus: ['job', 'tok'], tags: ['tg_resume'], cap: 'A token marks the place.' },
          { say: 'Step 4. Two writes were made while **nobody was watching**. The resumed stream gave **' + ST.resumed.length + '** events: `' + ST.resumed[0] + '` and `' + ST.resumed[1] + '`. Nothing was lost.', on: ['e2', 'e3'], focus: ['log', 'str', 'job'], cap: 'Nothing lost.' }
        ]
      }),

      B.code({
        id: 'm4-codestr', t: 1, src: 'rec', title: 'streams.py: watch, then resume', file: 'streams.py', lang: 'python', code: STR,
        steps: [
          { say: 'Two experiments: a stream that sees three writes, and a stream that is resumed. Press Next.', lines: null },
          { say: '`watch` opens the stream. `updateLookup` asks the server to add the **current document** to an update event.', lines: G.span(STR, /^with coll\.watch\(full_document='updateLookup'\) as stream:/, /events = \[stream\.next/) },
          { say: 'The second experiment: the first stream reads **one** event and keeps the **resume token** of the stream.', lines: G.span(STR, /coll\.insert_one\(\{'_id': 'O-2'/, /token = stream\.resume_token/) },
          { say: 'Two writes happen while **no stream is open**.', lines: G.span(STR, /coll\.update_one\(\{'_id': 'O-2'\}/, /written while nobody/) },
          { say: 'A new stream opens with **`resume_after=token`** and reads the two events that it missed.', lines: G.span(STR, /resume_after=token/, /print\('resumed from the token/) }
        ]
      }),

      B.term({
        id: 'm4-streams', t: 1, src: 'rec', title: 'What streams.py printed',
        say: 'The events of both experiments.',
        lines: function () { return G.plain(X('streams.run')); },
        after: 'The first stream saw **' + ST.events.length + '** events, each with its fields: `' + ST.fields + '`. The resumed stream gave the update and the delete that were written **while nobody watched**: nothing was lost. Notice what an **update** event holds: `changed {\'status\': \'SHIPPED\'}`, the fields that changed, and **`full=None`**. That is the next screen.',
        afterKind: 'tip',
        doneSay: 'Resume from the token.'
      }),

      B.term({
        id: 'm4-fullnone', t: 3, src: 'rec', title: 'An update event with no document',
        say: 'Look at the second event again: `' + ST.events[1] + '`. I asked for `updateLookup`, and the full document is `None`.',
        lines: function () { return G.plain(X('streams.run')); },
        after: '`updateLookup` returns **the document as it is when the event is read**, and not as it was at the time of the update. The order was **deleted** before the event was read, so there was **no document** to look up. A job that reads `event["fullDocument"]` of an update can fail on `None`. Use the **`updateDescription`**, which holds the changed fields, or keep the full document yourself. The server can also store a pre- and post-image of each change, from documentation: I did not run it.',
        afterKind: 'warn',
        doneSay: 'updateLookup is the current document.'
      }),

      B.bug({
        id: 'm4-bug', t: 1, q: 'A nightly job loads the day of each store with insert_many, and the retry after a failure stops with a duplicate key error. Click the line that cannot be repeated.',
        file: 'load_day.py', lang: 'python',
        code: 'days = [{"_id": "S-1", "orders": 101}, {"_id": "S-2", "orders": 102}]\ndb.daily.insert_many(days)\nprint(db.daily.count_documents({}))\n',
        bad: [2],
        hint: 'What does an insert do when the _id already exists?',
        why: 'An `insert_many` of documents that already exist fails with code **' + D.plain_insert_error_code + '**, as it did in the recording. Use a `ReplaceOne` with `upsert=True` on `_id`: the first run inserted **' + D.upsert_first[0] + '**, and the second run changed **nothing** (matched ' + D.upsert_second[1] + ', modified ' + D.upsert_second[2] + ').',
        fix: 'from pymongo import ReplaceOne\ndays = [{"_id": "S-1", "orders": 101}, {"_id": "S-2", "orders": 102}]\ndb.daily.bulk_write([ReplaceOne({"_id": d["_id"]}, d, upsert=True) for d in days])\nprint(db.daily.count_documents({}))\n',
        cheer: 'Make the load safe to repeat.'
      }),

      B.bug({
        id: 'm4-bug2', t: 2, src: 'docs', q: 'A job that reads a change stream is restarted after a deploy, and the changes that were written during the restart never reach the lake. Click the line that starts from nowhere.',
        file: 'consumer.py', lang: 'python',
        code: 'with coll.watch() as stream:\n    for event in stream:\n        send_to_lake(event)\n',
        bad: [1],
        hint: 'Where does a new stream start, if it is given no token?',
        why: 'A stream opened **without a token** starts at the **present**, so every change from the time when the job was down is **lost**. The recording resumed a stream with `resume_after=token` and got the two events that were written while nobody watched. Save the token after each event (or each batch) **in a place that survives a restart**, and open the stream with it. The oplog keeps changes only for a limited time, from documentation.',
        fix: 'token = load_saved_token()\nwith coll.watch(resume_after=token) as stream:\n    for event in stream:\n        send_to_lake(event)\n        save_token(stream.resume_token)\n',
        cheer: 'Save the token.'
      }),

      B.bug({
        id: 'm4-bug3', t: 3, q: 'A job reads the new status from an update event with updateLookup, and stops with a TypeError for some events. Click the line that reads the document.',
        file: 'status.py', lang: 'python',
        code: 'for event in stream:\n    if event["operationType"] == "update":\n        status = event["fullDocument"]["status"]\n        print(status)\n',
        bad: [3],
        hint: 'What is fullDocument when the document was deleted afterwards?',
        why: 'With `updateLookup` the full document is **the current one**, and when the order was **deleted** afterwards it is `None`: the recording showed `' + ST.events[1] + '`. Read the changed fields from `updateDescription` instead, which is part of the event.',
        fix: 'for event in stream:\n    if event["operationType"] == "update":\n        status = event["updateDescription"]["updatedFields"]["status"]\n        print(status)\n',
        cheer: 'Read what changed.'
      }),

      B.quiz({
        id: 'm4-q1', t: 1,
        q: 'A payment with `"amount_cents": "12.50"` (text) is inserted into a collection whose schema says `int`. What happens?',
        opts: [
          { t: 'The server refuses it with code 121, Document failed validation', fb: '' },
          { t: 'The server converts it to 1250', fb: 'Validation checks the type. It does not convert.' },
          { t: 'It is stored as it is', fb: 'Not when a validator says `int`.' },
          { t: 'Code 11000', fb: 'That is the code of a duplicate key.' }
        ],
        ok: 0, why: 'The recording printed `' + V[1][0] + ': rejected, code ' + V[1][1].replace('code ', '') + ' (' + V[1][2] + ')`.'
      }),

      B.quiz({
        id: 'm4-q2', t: 1,
        q: 'An upsert of three documents ran twice. What did the second run report?',
        opts: [
          { t: 'Upserted 0, matched 3, modified 0: nothing changed', fb: '' },
          { t: 'Upserted 3, matched 0', fb: 'That was the first run.' },
          { t: 'An error for a duplicate key', fb: 'That is what a plain insert does.' },
          { t: 'Upserted 6', fb: 'Documents are identified by `_id`, so no duplicates are made.' }
        ],
        ok: 0, why: 'The program printed `second run of the upsert: upserted ' + D.upsert_second[0] + ', matched ' + D.upsert_second[1] + ', modified ' + D.upsert_second[2] + '`.'
      }),

      B.quiz({
        id: 'm4-q3', t: 1,
        q: 'A job reading a change stream is stopped for an hour and then started with the saved resume token. What does it get?',
        opts: [
          { t: 'The changes written while it was stopped, as long as the oplog still holds them', fb: '' },
          { t: 'Only changes from now on', fb: 'That is what a stream with no token does.' },
          { t: 'Nothing: a stopped stream cannot be resumed', fb: 'The token exists to resume it.' },
          { t: 'All the changes since the collection was created', fb: 'The oplog keeps a limited time.' }
        ],
        ok: 0, why: 'The resumed stream of the recording gave `' + ST.resumed[0] + '` and `' + ST.resumed[1] + '`, written while nobody watched.'
      }),

      B.quiz({
        id: 'm4-q4', t: 2, src: 'docs',
        q: 'A team starts a transaction on a MongoDB that runs as a standalone server and gets an error. Why?',
        opts: [
          { t: 'Multi-document transactions need a replica set (or a sharded cluster)', fb: '' },
          { t: 'Transactions are not part of MongoDB', fb: 'They are, since version 4.0.' },
          { t: 'The collection must be empty', fb: 'There is no such rule.' },
          { t: 'The driver is too old', fb: 'The server is the problem.' }
        ],
        ok: 0, why: 'The server of the recording was a replica set of one member, which is why a change stream and a transaction worked. This is from documentation for the standalone case, and I did not run one.'
      }),

      B.order({
        id: 'm4-ord', t: 1, q: 'Put the steps in order to move the changes of a collection into the lake without loss.',
        items: ['Open a change stream and write each event to the lake', 'Save the resume token after each batch that the lake has accepted', 'When the job restarts, open the stream with the saved token', 'Make the lake write safe to repeat, so that an event handled twice changes nothing', 'Alert when the job lags behind the oplog'],
        why: 'A token gives **at-least-once** delivery: after a restart an event may arrive twice, so the write to the lake must be safe to repeat.'
      }),

      B.decide({
        id: 'm4-dec', t: 2, src: 'docs', title: 'Decision: how do the orders of MongoDB reach the lake?',
        scenario: 'The orders live in MongoDB. The lake should be at most a few minutes behind, and the application must not be slowed down.',
        opts: [
          { t: 'A change stream, with a saved resume token and a write to the lake that is safe to repeat', d: 'Every change arrives in order, a few seconds late, and the source does no heavy query.', lose: 'A long-running job to operate, and the oplog must be large enough for the longest outage.' },
          { t: 'A full export every night', d: 'Simple, and no stream to keep alive.', lose: 'A day of delay, a heavy read of the source, and deletes are not seen unless you compare.' },
          { t: 'A Kafka connector (Debezium or the MongoDB connector)', d: 'The stream becomes a topic that many consumers can read, with the tools of the Kafka course.', lose: 'A cluster of connectors to run. This course did not run it.' }
        ],
        pick: 0,
        why: 'The recording showed the pieces: events with their fields, a resume that lost nothing, and an upsert that is safe to repeat. A nightly export is fine when a day of delay is fine. The Kafka option is from documentation, and the Kafka course of this library covers Connect.',
        when: 'When several systems need the same changes, put the stream on Kafka and let them all read it.'
      }),

      B.incident({
        id: 'm4-inc', t: 2, src: 'rec', title: 'Incident: the lake is missing the orders of the deploy hour', time: '07:30',
        alert: '**The lake has no order that was written between 02:00 and 03:00.** At 02:00 the job that copies changes from MongoDB was redeployed. It opens `coll.watch()` and sends each event to the lake. Nothing failed, and the totals of that hour are zero.',
        clues: ['The job opens the stream with no token', 'The restart took about an hour', 'The orders are in MongoDB'],
        opts: [
          { t: 'Save the resume token with each batch and resume from it, make the lake write safe to repeat, and backfill the missing hour', fb: '' },
          { t: 'Restart the job again', fb: 'A stream without a token starts at the present, so the hour is still missing.' },
          { t: 'Run `insert_many` into the lake for the hour', fb: 'A plain insert fails or duplicates when a row already exists.' },
          { t: 'Ignore the hour', fb: 'The totals are wrong.' }
        ],
        best: 0,
        why: 'The recording shows both: a stream resumed with `resume_after` gave the two events written while nobody watched, and a stream with no token would have started at the present. The fix has three parts: the token, an idempotent write, and a backfill for the hour that is already missing.',
        checks: [
          ['Compare the lake with the source', 'Orders of one hour are missing.'],
          ['Read the job', 'It opens watch() with no resume token.'],
          ['Find the cause', 'A restart loses the changes written while it was down.'],
          ['Fix and backfill', 'Save the token, upsert into the lake, and re-read the hour.']
        ],
        tell: 'The job that copies changes opened its stream with no resume token, so after the redeploy it started at the present and the changes of the hour in between were never read. I changed it to save a token after each batch and resume from it, made the write to the lake safe to repeat, and backfilled the hour from the source.',
        prevent: ['Save the **resume token** after each accepted batch', 'Make the lake write **safe to repeat**', 'Alert on **lag** against the oplog window']
      }),

      B.qa({
        id: 'qa-validation', t: 1, tag: 'MongoDB', secs: 60,
        q: 'How do you keep bad data out of a MongoDB collection?',
        pts: ['A JSON schema validator on the collection', 'It checks types, required fields and ranges', 'Code 121', 'A unique index is another check'],
        short: 'I put a **validator** on the collection: a `$jsonSchema` that says which fields are required, their types, a minimum and a list of allowed values. The server then refuses a bad write for **every** client, and the loader that I wrote is only one of them. In my run a payment with a text amount, a decimal amount, a negative amount, an unknown currency and a missing field were all refused with code **121**, "Document failed validation". Validation checks the **type**, and it does not convert. A **unique index** is a separate check: a repeated order failed with code **11000**. For an existing collection, I check what is already there first, because a validator applies to new writes.',
        fu: [['Can validation warn instead of refusing?', 'Yes: `validationAction: "warn"` logs the document and accepts it.'], ['What about old documents?', 'They stay. The validator applies when a document is inserted or updated.']],
        trap: 'Trusting that the application always sends the right type.',
        real: 'Describe a rule that you added.'
      }),

      B.qa({
        id: 'qa-idempotent', t: 1, tag: 'MongoDB', secs: 60,
        q: 'How do you make a load into MongoDB safe to repeat?',
        pts: ['Upsert on a key', 'ReplaceOne with upsert', 'Second run changes nothing', 'A plain insert fails on a repeat'],
        short: 'I **upsert on a key**: a `ReplaceOne` with `upsert=True` and the `_id` as the filter replaces the document if it exists and inserts it if it does not. In my run the first run **inserted 3** documents, and the second run **matched 3 and modified 0**: nothing changed. A plain `insert_many` of the same documents failed with code **11000**, and an ordered one stops at the first error. The key must identify the record in the **source**, so that a repeat hits the same document. For a large load I use `bulk_write`, and for a change that depends on the old value I use an update with operators like `$set`.',
        fu: [['What is `$setOnInsert`?', 'A field that is written only when the upsert inserts.'], ['Ordered or unordered?', 'An unordered bulk write continues after an error and reports them all.']],
        trap: 'insert_many on a retry.',
        real: 'Describe a load that you made idempotent.'
      }),

      B.qa({
        id: 'qa-changestream', t: 1, tag: 'MongoDB', secs: 60,
        q: 'How do you capture changes from MongoDB, and how do you not lose any?',
        pts: ['A change stream on a replica set', 'One event for each write', 'A resume token', 'Idempotent writes downstream'],
        short: 'I open a **change stream** on the collection. It needs a **replica set**, and it gives one event for each insert, update, replace or delete, with the key of the document and, for an update, the **changed fields**. To not lose any, I **save the resume token** after each batch that the lake accepted and open the stream with `resume_after` after a restart: in my run a resumed stream gave the update and the delete that were written while nobody watched. Delivery is **at least once**, so the write downstream must be **safe to repeat**. The oplog holds changes for a limited time, so I alert on lag. Note that `updateLookup` returns the document **as it is now**: after a delete it was `None`.',
        fu: [['Stream or periodic export?', 'A stream for freshness and deletes. An export when a day of delay is fine.'], ['Through Kafka?', 'A connector puts the stream on a topic for many consumers. It did not run here.']],
        trap: 'Opening a stream with no token after a restart.',
        real: 'Describe a change feed that you built.'
      }),

      B.qa({
        id: 'qa-transactions', t: 2, tag: 'MongoDB', secs: 60,
        q: 'Does MongoDB have transactions, and when do you need them?',
        pts: ['Yes, multi-document, on a replica set', 'Invisible until commit', 'A single document is already atomic', 'Design so that you rarely need one'],
        short: 'Yes: **multi-document transactions** work on a **replica set** or a sharded cluster, and not on a standalone server. In my run a write inside a transaction was seen **inside** (1) and **not outside** (0), an abort left **0** documents, and a commit left **1**. A write to a **single document** is already atomic, including its embedded objects and arrays, which is one reason to embed what changes together. I would use a transaction when two or more documents must change together, such as a transfer between two accounts, and I keep it short, because it holds resources. The cost of transactions is from documentation, and I did not time it here.',
        fu: [['What is the cost?', 'Longer locks and more work on the server. Keep them short.'], ['Why a replica set of one?', 'A replica set of one member is enough for transactions and change streams in a test.']],
        trap: 'A transaction where one document would do.',
        real: 'Describe a change that needed a transaction.'
      }),

      B.recap({
        id: 'm4-recap', n: 4, badge: 'Schema Keeper', color: '#10B981',
        pts: [
          'A **validator** refused five bad payments with code **121**, and a **unique index** refused a repeat with **11000**.',
          'An **upsert** made the load safe to repeat: the second run **matched ' + D.upsert_second[1] + ' and modified ' + D.upsert_second[2] + '**. A plain `insert_many` failed.',
          'A **transaction** was invisible outside until commit, and an abort left nothing. It needs a **replica set**.',
          'A **change stream** gave one event for each write, and a **resume token** lost none of the changes written while nobody watched.',
          '`updateLookup` returns the **current** document: after a delete it was `None`.'
        ],
        lines: [
          'I save the resume token.',
          'I upsert on a key.',
          'I validate at the collection.'
        ]
      })
    ]
  });
})();
