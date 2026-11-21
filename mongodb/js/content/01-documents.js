/* Mission 1: documents and collections. load.py and shapes.py ran against a real mongod 8.0 with pymongo. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n, M = function (k) { return G.meta(k); };
  var S = C('shapes'), LD = C('load'), SH = G.file('shapes.py'), SL = X('shapes.run').split('\n').slice(1), LL = X('load.run').split('\n');
  G.expect(S.null_matches === "['O-1', 'O-2', 'O-4']" && S.missing_matches === "['O-2', 'O-4']" && S.number_matches === '[]' && S.string_matches === "['O-4']", 'a query for null matches the missing field too, and a number does not match a string');
  G.expect(S.duplicate_code === 11000 && S.max_bson === 16777216 && S.too_large_bytes > S.server_limit_bytes, 'a second _id is code 11000 and a 17 MB document is refused');

  LAB.addChapter({
    id: 'm1', n: 1, title: 'Documents and collections', short: 'Documents', blurb: 'One order is one document, and the shapes that surprise a data engineer', minutes: 20,
    focus: ['src'],
    goals: [
      'Read an **order as one document** with an embedded object and an embedded array.',
      'Say that a query for **`null`** also matches a **missing** field.',
      'Say that **`4`** and **`"4"`** are different values to the server.',
      'Name the **16 MB** limit of a document and the **`_id`** rule.'
    ],
    say: 'A collection has no table definition, so two documents of one collection can have different fields. That is flexible, and it is where bad data hides. I loaded 20,000 orders into a real server and ran the queries that surprise people.',
    scenes: [
      B.term({
        id: 'm1-load', t: 1, src: 'rec', title: 'Brewline orders as documents',
        say: 'I loaded 20,000 orders and 12 stores, and asked for one order. The replay calls the language Python: the program is `load.py`.',
        lines: function () { return G.plain(X('load.run')); },
        after: 'The server holds **' + n(LD.orders) + '** orders and **' + n(LD.stores) + '** stores. The one order is **one document**: its `customer` is an **object inside it**, and its `lines` are an **array inside it**. Everything that a reader needs for an order is in one place, and one read gets it.',
        afterKind: 'tip',
        doneSay: 'One order, one document.'
      }),

      B.flow({
        id: 'm1-flow', t: 1, src: 'rec', title: 'What goes inside a document, and what does not', g: 'model', legend: true,
        steps: [
          { say: 'An order, a customer, some lines and a store. Where does each one live? Press Next.', focus: ['app', 'ord', 'cus', 'lin', 'sto'], cap: 'Four things, two collections.' },
          { say: 'Step 1. The app writes **one document** for an order, into the `orders` collection.', on: ['e1'], focus: ['app', 'ord'], tags: ['tg_limit'], cap: 'One write, one document.' },
          { say: 'Step 2. The **customer** is embedded: a small object with an id and a tier. It is read and written with the order.', on: ['e2'], focus: ['ord', 'cus'], tags: ['tg_embed'], cap: 'Embedded: read together.' },
          { say: 'Step 3. The **lines** are an embedded array. An order has a few lines, and they belong to it. The order in the recording had **two**.', on: ['e3'], focus: ['ord', 'lin'], cap: 'Lines belong to the order.' },
          { say: 'Step 4. The **store** is **not** embedded. Many orders share a store, and a store changes on its own, so it is a collection of its own and an order refers to it by `store_id`. A `$lookup` joins them when you ask.', on: ['e4'], focus: ['ord', 'sto'], tags: ['tg_ref'], cap: 'Shared: refer to it.' }
        ]
      }),

      B.code({
        id: 'm1-code', t: 1, src: 'rec', title: 'shapes.py: four documents that do not match', file: 'shapes.py', lang: 'python', code: SH,
        steps: [
          { say: 'Four small documents in one collection, and the questions that a loader asks of them. Press Next.', lines: null },
          { say: 'Four documents with **different shapes**: `O-1` has a coupon that is `None`, `O-2` has **no coupon at all**, `O-3` has a real coupon, and in `O-4` the number `n` is the **text** `"4"`.', lines: G.span(SH, /shapes\.insert_many/, /^\]\)$/) },
          { say: 'A query for `coupon: None` and a query for **a coupon that does not exist**.', lines: G.span(SH, /coupon is null/, /coupon does not exist/) },
          { say: 'A query for the number `4`, a query for the text `"4"`, and a **sort** across the two types.', lines: G.span(SH, /n = 4 \(a number\)/, /sorted by n/) },
          { say: 'A second document with the same `_id` is **refused**. A document of **17 MB** is refused too: the driver stops it before it is sent.', lines: G.span(SH, /shapes\.insert_one\(\{'_id': 'O-1'\}\)/, /print\('a 17 MB document/) }
        ],
        note: 'The documents are written as Python dictionaries, and the server stores them as BSON. A pipeline later in the course is also a list of dictionaries.'
      }),

      B.term({
        id: 'm1-shapes', t: 1, src: 'rec', title: 'What shapes.py printed',
        say: 'The output, line by line. Read the first two lines twice.',
        lines: function () { return G.plain(X('shapes.run')); },
        after: 'A query for **`coupon: None`** matched **' + S.null_matches + '**: the document that has `null` **and** the ones that have **no coupon at all**. Only `$exists: False` found the **missing** ones: ' + S.missing_matches + '. The number `4` matched **nothing** and the text `"4"` matched `O-4`: **a type is part of the value**. The sort did not fail: it put the numbers before the text. A second `_id` gave code **' + S.duplicate_code + '**, and a 17 MB document was refused because the server accepts at most **' + n(S.max_bson) + '** bytes (16 MB).',
        afterKind: 'warn',
        doneSay: 'null also matches missing.'
      }),

      B.bug({
        id: 'm1-bug', t: 1, q: 'A job counts the orders that have no coupon: `coupon` is null or absent. The store says 1 order has a null coupon and 1 has none. Click the line that cannot tell them apart.',
        file: 'coupon.py', lang: 'python',
        code: 'no_coupon = shapes.count_documents({"coupon": None})\nnever_set = shapes.count_documents({"coupon": {"$exists": False}})\nprint(no_coupon, never_set)\n',
        bad: [1],
        hint: 'What does a query for None match?',
        why: 'A query for **`None`** matches a field that is `null` **and** a field that is **missing**. In the recording it matched `' + S.null_matches + '`, and only `$exists: False` found the missing ones, `' + S.missing_matches + '`. To find the explicit nulls alone, combine them: `{"coupon": {"$type": "null"}}`.',
        fix: 'explicit_null = shapes.count_documents({"coupon": {"$type": "null"}})\nnever_set = shapes.count_documents({"coupon": {"$exists": False}})\nprint(explicit_null, never_set)\n',
        cheer: 'Say which one you mean.'
      }),

      B.bug({
        id: 'm1-bug2', t: 1, q: 'A feed sometimes sends the quantity as the text "4". A query for quantity 4 misses those documents. Click the line that misses them.',
        file: 'quantity.py', lang: 'python',
        code: 'fours = shapes.find({"n": 4})\nprint([d["_id"] for d in fours])\n',
        bad: [1],
        hint: 'Is the number 4 equal to the text "4" for the server?',
        why: 'A query for the number `4` found `' + S.number_matches + '` and the text `"4"` found `' + S.string_matches + '`. The server **does not convert** types. Fix the data at the loader, or validate the type (mission 4), and do not write a query that accepts both.',
        fix: 'fours = shapes.find({"n": {"$in": [4, "4"]}})\nprint([d["_id"] for d in fours])\n',
        cheer: 'Types are values too.'
      }),

      B.quiz({
        id: 'm1-q1', t: 1,
        q: 'A collection holds a document with `"coupon": null` and a document with no `coupon` field. What does `find({"coupon": None})` return?',
        opts: [
          { t: 'Both of them', fb: '' },
          { t: 'Only the one with null', fb: 'A missing field also matches a query for null.' },
          { t: 'Only the one with no field', fb: 'The explicit null matches too.' },
          { t: 'An error', fb: 'Both queries are valid.' }
        ],
        ok: 0, why: 'The recording printed `' + S.null_matches + '` for the query, and only `' + S.missing_matches + '` for `$exists: False`.'
      }),

      B.quiz({
        id: 'm1-q2', t: 1,
        q: 'What happens when you insert a second document with `_id` `"O-1"`?',
        opts: [
          { t: 'The server refuses it with duplicate key error, code ' + S.duplicate_code, fb: '' },
          { t: 'It replaces the first one', fb: 'An insert never replaces.' },
          { t: 'Both are kept', fb: '`_id` is unique in a collection.' },
          { t: 'The server renames it', fb: 'It never changes your `_id`.' }
        ],
        ok: 0, why: 'The recording printed code `' + S.duplicate_code + '`. To replace a document you use a replace or an upsert, which mission 4 shows.'
      }),

      B.quiz({
        id: 'm1-q3', t: 1,
        q: 'Where do the customer and the lines of an order belong, and where does the store belong?',
        opts: [
          { t: 'The customer and the lines inside the order, the store in a collection of its own', fb: '' },
          { t: 'All four inside the order', fb: 'The store is shared by many orders, and it changes on its own.' },
          { t: 'All four in separate collections', fb: 'Then every read of an order needs three joins.' },
          { t: 'It makes no difference', fb: 'It decides how many reads and writes a change needs.' }
        ],
        ok: 0, why: 'Embed what is read and written **with** the parent and is small. Refer to what is **shared** or changes alone. This is the rule of the diagram.'
      }),

      B.quiz({
        id: 'm1-q4', t: 2, src: 'docs',
        q: 'A product keeps every event of a customer in an array inside the customer document. Months later some documents are huge. What is the risk?',
        opts: [
          { t: 'A document can reach the 16 MB limit, and every update rewrites a big document', fb: '' },
          { t: 'Arrays are slower than objects', fb: 'The problem is the size that grows without a bound.' },
          { t: 'MongoDB does not allow arrays of objects', fb: 'It does: the lines of an order are one.' },
          { t: 'The _id of the document changes', fb: 'It never changes.' }
        ],
        ok: 0, why: 'In the recording a document of 17 MB was refused, with the limit at ' + n(S.max_bson) + ' bytes. An array that **grows without a bound** is the usual way to meet it. Put the events in a collection of their own. This is from documentation.'
      }),

      B.order({
        id: 'm1-ord', t: 1, q: 'Put the steps in order to find out why the count of orders without a coupon is wrong.',
        items: ['Look at a few documents with `find_one`', 'List the shapes: which documents have the field, and which have null', 'Run `$exists` and `$type` queries for each shape', 'Decide what null and missing each mean for the report', 'Fix the loader or the query, and add a check'],
        why: 'A query cannot tell you what a missing field means. Look at the data first, then count each shape, then decide.'
      }),

      B.decide({
        id: 'm1-dec', t: 2, src: 'docs', title: 'Decision: embed the store in each order, or refer to it?',
        scenario: 'Every order needs the name and the region of its store in the daily report. A store changes its name a few times a year. There are 12 stores and millions of orders.',
        opts: [
          { t: 'Keep the stores in their own collection, and refer by `store_id`', d: 'A rename is one update. The report joins 12 documents once, with `$lookup` after grouping.', lose: 'A join in every report, and a reader must know that it exists.' },
          { t: 'Embed the name and region in every order', d: 'One read has everything, and no join.', lose: 'A rename means millions of updates, and old orders keep the old name unless you update them.' },
          { t: 'Embed a copy and refer too', d: 'Fast reads, and the id is there for a join.', lose: 'Two places to keep right, and the copy drifts from the truth.' }
        ],
        pick: 0,
        why: 'The deciding fact is how often the store **changes** against how often an order is **read**. The region is needed per order, but a join after grouping runs on 12 documents (mission 2). This is a design judgement from documentation.',
        when: 'If the report must show the name **as it was at the time of the order**, embed a copy on purpose, and call it a snapshot.'
      }),

      B.incident({
        id: 'm1-inc', t: 2, src: 'rec', title: 'Incident: the report counts orders without a coupon, and the number is wrong', time: '10:05',
        alert: '**The marketing report says 3 orders had no coupon, and the store system says 2.** The report counts `find({"coupon": None})`. Nothing failed. One order has the field set to null, and one was written by an old version of the loader that never sets it.',
        clues: ['The query is for None', 'Some documents have the field set to null and some do not have it', 'Both kinds were written by different versions of the loader'],
        opts: [
          { t: 'Decide what null and missing each mean, and query for each with `$type` and `$exists`', fb: '' },
          { t: 'Delete the documents with no coupon field', fb: 'It destroys data to fix a query.' },
          { t: 'Change the report to count null only', fb: 'The query for None does not count null only.' },
          { t: 'Add a coupon field to every document', fb: 'It hides the difference that the report needed to know.' }
        ],
        best: 0,
        why: 'The recording shows it: a query for `None` matched `' + S.null_matches + '`, and `$exists: False` matched `' + S.missing_matches + '`. A missing field and an explicit null are two different states, and a query for null mixes them.',
        checks: [
          ['Compare the counts', 'The report and the source system differ by one.'],
          ['List the shapes', 'One document with null, one without the field.'],
          ['Read the query', 'find({"coupon": None}) matches both.'],
          ['Fix and prevent', 'Query each state on purpose, and validate the shape of new documents.']
        ],
        tell: 'The report counted orders with a null coupon, and in MongoDB a query for null also matches documents that have no such field, so it counted both kinds. I changed the report to query each state with its own condition, and I will add schema validation so that new documents have one shape.',
        prevent: ['Know the **shapes** of every field that you report on', 'Query **`$type`** and **`$exists`** on purpose', 'Add a **validation rule** so that new documents have one shape']
      }),

      B.qa({
        id: 'qa-model', t: 1, tag: 'MongoDB', secs: 60,
        q: 'How do you decide what to embed in a document and what to refer to?',
        pts: ['Embed what is read and written together', 'Embed small and bounded data', 'Refer to what is shared or changes alone', 'A document is at most 16 MB'],
        short: 'I **embed** what is read and written **with** the parent, and is small and bounded: the customer and the **lines** of my order sit inside it, so one read gets the whole order. I **refer** to what is **shared** by many documents or changes on its own: the **store** is a collection of its own, because it is shared and it is renamed on its own, and `$lookup` joins it when I ask. Two limits guide me: a document is at most **' + n(S.max_bson) + ' bytes (16 MB)**, so an array that grows without a bound does not belong inside, and an embedded copy has to be updated in every document that holds it.',
        fu: [['What is a `$lookup`?', 'A join of one collection to another inside a pipeline. It is cheaper after a `$group` than before.'], ['One-to-many with many "many"?', 'Put the many in their own collection with a reference to the parent.']],
        trap: 'An array that grows without a bound.',
        real: 'Describe a model that you changed.'
      }),

      B.qa({
        id: 'qa-nullmissing', t: 1, tag: 'MongoDB', secs: 60,
        q: 'What surprises a data engineer about the shape of MongoDB data?',
        pts: ['null matches a missing field', 'Types are part of the value', 'No schema by default', 'Validate at the edge'],
        short: 'A collection has **no schema by default**, so documents of one collection can differ. Three things bit me in my run. A query for **`null` also matches a document with no such field**: it returned `' + S.null_matches + '`, and only `$exists: False` found the missing ones. A **type is part of the value**: a query for the number `4` found nothing and the text `"4"` found `O-4`. And a sort across types does not fail, it orders them by type. So I list the shapes of every field that I read, I query each state on purpose, and I put a **validation rule** on the collection, so that bad shapes are refused at the write.',
        fu: [['How do you find the shapes?', 'An aggregation that groups by `$type` of the field.'], ['Is a missing field the same as null in the lake?', 'No. Decide what each one means, and map them on purpose.']],
        trap: 'Trusting a query for null.',
        real: 'Describe a field that had more than one type.'
      }),

      B.qa({
        id: 'qa-whymongo', t: 1, tag: 'MongoDB', secs: 60,
        q: 'When would a team choose MongoDB, and what does that mean for you as a data engineer?',
        pts: ['Nested, varying documents', 'The application owns the shape', 'A source system for you', 'Plan for shapes and changes'],
        short: 'A team picks MongoDB when its data is naturally **a nested document** that varies, such as an order with its lines, and the application reads and writes a whole document at once. For me it is mostly a **source**: I read the data out with a pipeline, a periodic export or a **change stream**, and I flatten the nested parts into tables. So I plan for what a flexible schema brings: **shapes that vary**, types that change over time, and a document that grows. I would not pick it for heavy joins between many collections, or for the analytics itself: that belongs in a warehouse. This is from documentation and experience, and no comparison was run here.',
        fu: [['MongoDB or PostgreSQL?', 'PostgreSQL for relational data and joins. MongoDB when the document is the unit. PostgreSQL also stores JSON.'], ['Where do the analytics go?', 'Into the lake or the warehouse, fed by an export or a change stream.']],
        trap: 'Joining many collections for analytics.',
        real: 'Describe a MongoDB source that you ingested.'
      }),

      B.qa({
        id: 'qa-16mb', t: 2, tag: 'MongoDB', secs: 45,
        q: 'What is the size limit of a document, and how do you hit it by accident?',
        pts: ['16 MB', 'Arrays that grow', 'Every update rewrites', 'Move the many to a collection'],
        short: 'A document is at most **16 MB**: the server reported `' + n(S.max_bson) + '` bytes, and a document of 17 MB was refused with `BSON document too large`. The usual accident is an **array that grows without a bound**: the events, comments or readings of one parent, put inside it. Long before the limit, every update of a big document is expensive. The fix is to move the many to a **collection of their own** with a reference to the parent. For big files MongoDB has GridFS, from documentation, and I did not run it.',
        fu: [['Is the limit per field?', 'No. It is per document, with nesting included.'], ['How do you find big documents?', 'An aggregation with `$bsonSize`.']],
        trap: 'An unbounded array in a hot document.',
        real: 'Describe a document that grew too large.'
      }),

      B.recap({
        id: 'm1-recap', n: 1, badge: 'Document Writer', color: '#A7F3D0',
        pts: [
          'An order is **one document** with an embedded `customer` and an embedded array of `lines`. The store is a collection of its own.',
          'A query for **null** matched **' + S.null_matches + '**: it also matches a **missing** field. `$exists: False` found **' + S.missing_matches + '**.',
          'The number `4` found **' + S.number_matches + '** and the text `"4"` found **' + S.string_matches + '**: the type is part of the value.',
          'A second `_id` gave code **' + S.duplicate_code + '**, and a 17 MB document was refused: the limit is **' + n(S.max_bson) + '** bytes.',
          'List the **shapes** of a field before you report on it, and validate at the write.'
        ],
        lines: [
          'I query null and missing on purpose.',
          'I embed what is read together and bounded.',
          'I never let an array grow without a bound.'
        ]
      })
    ]
  });
})();
