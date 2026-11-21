/* Mission 3: indexes and explain. indexes.py ran against a real mongod 8.0 with 20,000 orders. */
(function () {
  var B = LAB.b, G = LAB.get;
  var X = G.text, n = G.n;
  var IX = G.table('index.cases').rows, IXF = G.file('indexes.py'), TOTAL = G.counts('load').orders;
  var c1 = IX[0], c2 = IX[1], c3 = IX[2], c4 = IX[3], c5 = IX[4];
  G.expect(c1[2] === 'COLLSCAN' && c1[4] === TOTAL && c2[2] === 'FETCH > IXSCAN' && c2[4] === c2[5] && c3[2] === 'SORT > FETCH > IXSCAN' && c4[2] === 'FETCH > IXSCAN' && c5[2] === 'PROJECTION_COVERED > IXSCAN' && c5[4] === 0, 'no index reads every document, an index reads only the matches, a sort outside the index adds a SORT stage, and a covered query reads none');

  LAB.addChapter({
    id: 'm3', n: 3, title: 'Indexes and explain', short: 'Indexes', blurb: 'Read what the server examined, and order the fields of a compound index', minutes: 20,
    focus: ['ing'],
    goals: [
      'Read an **`explain`**: the plan, the keys and documents examined, and the documents returned.',
      'Tell a **`COLLSCAN`** from an **`IXSCAN`**.',
      'Order a **compound index**: equality fields first, then the sort field.',
      'Say what a **covered** query is.'
    ],
    say: 'A query that was fast on 1,000 documents is slow on 20 million, and `explain` says why. I ran five queries on 20,000 orders, with and without indexes, and wrote down what the server examined for each one.',
    scenes: [
      B.code({
        id: 'm3-code', t: 1, src: 'rec', title: 'indexes.py: five queries, and what the server examined', file: 'indexes.py', lang: 'python', code: IXF,
        steps: [
          { say: 'One helper that asks the server to **explain** a query, and five queries. Press Next.', lines: null },
          { say: '`show` runs the `explain` command with the verbosity **`executionStats`**, so that the server runs the query and reports the **keys and documents that it examined**.', lines: G.span(IXF, /def show/, /^    print/) },
          { say: 'Query 1 runs with **no index** except `_id`. A filter on a store and a status.', lines: G.span(IXF, /^query = /, /show\('1 no index'/) },
          { say: 'Index `(store_id, status)`, and the same query again. This is the index that **matches the filter**.', lines: G.span(IXF, /create_index\(\[\('store_id', 1\), \('status', 1\)\]/, /show\('2 index/) },
          { say: 'A query for placed orders of a store, **sorted by `placed_at`**. The index does not hold `placed_at`.', lines: G.span(IXF, /^newest = /, /show\('3 same index/) },
          { say: 'A new index `(store_id, status, placed_at)`: **the equality fields first, then the sort field**.', lines: G.span(IXF, /create_index\(\[\('store_id', 1\), \('status', 1\), \('placed_at', 1\)\]/, /show\('4 index/) },
          { say: 'A query that asks only for fields that **are in the index**.', lines: G.span(IXF, /show\('5 only the fields/) }
        ]
      }),

      B.term({
        id: 'm3-out', t: 1, src: 'rec', title: 'What indexes.py printed',
        say: 'Five queries, five plans. Read the plan, then the number of documents examined.',
        lines: function () { return G.plain(X('indexes.run')); },
        after: 'With **no index** the server read **' + n(c1[4]) + '** documents (`COLLSCAN`) to return **' + c1[5] + '**. With an index it read **' + c2[4] + '**, the matches only. Sorting by `placed_at` outside the index added a **`SORT`** stage over **' + n(c3[4]) + '** documents, and putting `placed_at` in the index **removed** it. Asking for only the fields of the index read **' + c5[4] + '** documents: the query was **covered**.',
        afterKind: 'tip',
        doneSay: 'Documents examined is the number to read.'
      }),

      B.widget({ id: 'm3-lab', kind: 'indexlab', t: 1, src: 'rec', title: 'Lab: five queries and what the server examined' }),

      B.cmp({
        id: 'm3-plan', t: 1, src: 'rec', title: 'The stages of a plan',
        say: 'Four plan stages appear in this course. Press Next to read what each one means.',
        cols: ['Stage', 'What the server did', 'In the recording'],
        hl: 1,
        rows: [
          ['`COLLSCAN`', 'Read every document of the collection', 'Query 1: ' + n(c1[4]) + ' documents'],
          ['`IXSCAN`', 'Walked the index and kept the matching keys', 'Query 2: ' + c2[3] + ' keys'],
          ['`FETCH`', 'Read the documents that the keys point to', 'Query 2: ' + c2[4] + ' documents'],
          ['`SORT`', 'Sorted the documents in memory because no index gave the order', 'Query 3: ' + n(c3[4]) + ' documents sorted'],
          ['`PROJECTION_COVERED`', 'Answered from the index alone', 'Query 5: ' + c5[4] + ' documents read']
        ],
        steps: [
          { upto: 3, say: 'The first three are the basic path: scan, then fetch. The index decides how many documents the fetch must read.' },
          { upto: 5, say: '`SORT` is the one to remove with a better index, and a **covered** query is the best case: the documents are never read.' }
        ]
      }),

      B.bug({
        id: 'm3-bug', t: 1, q: 'A query filters on store and status and sorts by placed_at. The index is on (placed_at, store_id, status) and the query is still slow. Click the line with the index that does not fit.',
        file: 'index.py', lang: 'python',
        code: 'orders.create_index([("placed_at", 1), ("store_id", 1), ("status", 1)])\nlist(orders.find({"store_id": 3, "status": "PLACED"}).sort("placed_at", 1))\n',
        bad: [1],
        hint: 'Which fields of the filter does the index start with?',
        why: 'The index **starts with the sort field**, so the server cannot jump to the documents of store 3: it walks the index in time order and checks each entry. Put the **equality fields first** and the sort field last, as query 4 did with `(store_id, status, placed_at)`: it examined **' + n(c4[4]) + '** documents for **' + n(c4[5]) + '** returned and had no `SORT` stage.',
        fix: 'orders.create_index([("store_id", 1), ("status", 1), ("placed_at", 1)])\nlist(orders.find({"store_id": 3, "status": "PLACED"}).sort("placed_at", 1))\n',
        cheer: 'Equality first, then the sort.'
      }),

      B.bug({
        id: 'm3-bug2', t: 1, q: 'A query lists the orders of one store that are not refunded. The only index is on status, and the query still examines almost every document. Click the line with the index that does not fit.',
        file: 'notrefunded.py', lang: 'python',
        code: 'orders.create_index("status")\nlist(orders.find({"store_id": 3, "status": {"$ne": "REFUNDED"}}))\n',
        bad: [1],
        hint: 'How many orders have a status other than REFUNDED?',
        why: 'Almost every order is **not** refunded (19,200 of 20,000 in the recording), so an index on `status` alone **cannot narrow** the search: the server walks nearly every key and fetches each document to check the store. Put the **selective** field first: an index on `(store_id, status)` goes straight to the orders of store 3. An index helps a query that picks a **small share** of the collection, as the 67 orders of one store with one status did. The check script of the course ran this hunt on the server, and it is not in the recording.',
        fix: 'orders.create_index([("store_id", 1), ("status", 1)])\nlist(orders.find({"store_id": 3, "status": {"$ne": "REFUNDED"}}))\n',
        cheer: 'Put the selective field first.'
      }),

      B.quiz({
        id: 'm3-q1', t: 1,
        q: 'In the recording, how many documents did the server examine for query 1 (no index) and for query 2 (the index on store and status)?',
        opts: [
          { t: n(c1[4]) + ' and ' + c2[4], fb: '' },
          { t: c2[4] + ' and ' + n(c1[4]), fb: 'It is the other way round.' },
          { t: n(c1[4]) + ' for both', fb: 'The index limits the documents to read.' },
          { t: '0 and 0', fb: 'Only the covered query read none.' }
        ],
        ok: 0, why: 'The program printed `documents ' + c1[4] + '` for query 1 and `documents ' + c2[4] + '` for query 2, and both returned ' + c1[5] + '.'
      }),

      B.quiz({
        id: 'm3-q2', t: 1,
        q: 'A plan shows `SORT > FETCH > IXSCAN`. What does the `SORT` mean, and how do you remove it?',
        opts: [
          { t: 'The server sorts in memory because the index does not give the order: put the sort field in the index after the equality fields', fb: '' },
          { t: 'The query is covered', fb: 'A covered query has no `FETCH`.' },
          { t: 'The index is broken', fb: 'The index works. It is missing a field.' },
          { t: 'The sort is free', fb: 'It is done in memory on every document that matched.' }
        ],
        ok: 0, why: 'Query 3 had `' + c3[2] + '` and query 4, with `placed_at` in the index, had `' + c4[2] + '`.'
      }),

      B.quiz({
        id: 'm3-q3', t: 1,
        q: 'What makes a query **covered**?',
        opts: [
          { t: 'Every field that it filters on and returns is in the index, so no document is read', fb: '' },
          { t: 'It has a `$match` stage', fb: 'That is a pipeline stage, not a plan.' },
          { t: 'It uses `_id`', fb: 'A query on `_id` still reads the document, unless it asks for `_id` only.' },
          { t: 'The collection is small', fb: 'Size has nothing to do with it.' }
        ],
        ok: 0, why: 'Query 5 asked only for `store_id` and `status`, which are in the index: `' + c5[2] + '`, **' + c5[4] + '** documents examined.'
      }),

      B.quiz({
        id: 'm3-q4', t: 2, src: 'docs',
        q: 'A collection has ten indexes, and the loader that inserts a million documents a day has become slow. Why?',
        opts: [
          { t: 'Every insert must update every index', fb: '' },
          { t: 'Indexes slow reads only', fb: 'They help reads and cost writes.' },
          { t: 'MongoDB limits the number of inserts per index', fb: 'There is no such limit.' },
          { t: 'The indexes are stored on another server', fb: 'They are stored with the collection.' }
        ],
        ok: 0, why: 'Each index is a structure that an insert, an update and a delete must also change. Keep the indexes that queries use, and drop the rest. This is from documentation, and the cost was not timed here.'
      }),

      B.order({
        id: 'm3-ord', t: 1, q: 'Put the steps in order to fix a slow query.',
        items: ['Run `explain` with `executionStats` and read the plan', 'Compare documents examined with documents returned', 'Design an index: equality fields first, then the sort field', 'Create it and run `explain` again', 'Check that the other queries still use their indexes'],
        why: 'Read first, change second, and read again. A large gap between examined and returned is the sign of a missing or wrong index.'
      }),

      B.decide({
        id: 'm3-dec', t: 2, src: 'docs', title: 'Decision: how many indexes does the orders collection get?',
        scenario: 'The orders collection takes a million inserts a day. Four queries run on it all the time: by store and status, by customer, by day, and a sorted list for one store.',
        opts: [
          { t: 'One compound index for each frequent query, and drop the ones that explain does not use', d: 'Each query is fast, and the write cost is bounded.', lose: 'Work to find the frequent queries, and an index per query still costs on every write.' },
          { t: 'An index on every field', d: 'Every query has an index.', lose: 'Writes slow down, memory fills with indexes, and most of them are never used.' },
          { t: 'No index but `_id`, and add one when it hurts', d: 'The cheapest writes.', lose: 'Queries scan the whole collection, which grows every day.' }
        ],
        pick: 0,
        why: 'The recording showed the benefit (' + n(c1[4]) + ' documents examined against ' + c2[4] + '), and the cost of an index is paid on **every write**. Keep an index for each query that matters and measure. The cost side is from documentation.',
        when: 'On a small collection that does not grow, an extra index is cheap and it can wait for the first slow query.'
      }),

      B.incident({
        id: 'm3-inc', t: 2, src: 'rec', title: 'Incident: the store dashboard takes a minute, and it did not last month', time: '08:15',
        alert: '**The dashboard of a store, which lists its refunded orders, now takes about a minute.** It filters on `store_id` and `status`. The collection has grown from 2 million to 20 million documents in a year, and there is no index on those fields.',
        clues: ['The query filters on store_id and status', 'There is no index except _id', 'The collection is ten times bigger than a year ago'],
        opts: [
          { t: 'Run `explain`, then create an index on `(store_id, status)` and run `explain` again', fb: '' },
          { t: 'Add memory to the server', fb: 'The server reads every document: it would still read ten times more.' },
          { t: 'Cache the page for an hour', fb: 'It hides the slow query and the next filter is slow too.' },
          { t: 'Move the data to another database', fb: 'A large change for a problem that one index may fix.' }
        ],
        best: 0,
        why: 'The recording of this case: with no index the server read **' + n(c1[4]) + '** documents to return **' + c1[5] + '**, and with an index on `(store_id, status)` it read **' + c2[4] + '**. The work of a scan grows with the collection, and the work of the index grows with the result.',
        checks: [
          ['Run explain', 'A COLLSCAN that examines every document.'],
          ['Compare examined with returned', 'A huge gap.'],
          ['Create the index', 'Equality fields first.'],
          ['Run explain again', 'An IXSCAN that examines about as many as it returns.']
        ],
        tell: 'The dashboard query had no index, so the server read every document of a collection that is ten times bigger than a year ago. I looked at the plan, created an index on the two fields of the filter, and checked that the plan now examines only the matching documents. I will review the plans of the other dashboard queries.',
        prevent: ['Run **`explain`** on every query of a dashboard', 'Watch **documents examined against returned**', 'Review plans when a collection **grows**']
      }),

      B.qa({
        id: 'qa-explain', t: 1, tag: 'MongoDB', secs: 60,
        q: 'How do you find out why a MongoDB query is slow?',
        pts: ['explain with executionStats', 'COLLSCAN or IXSCAN', 'Examined against returned', 'SORT in memory'],
        short: 'I run **`explain` with `executionStats`** and read three things. The **plan**: `COLLSCAN` reads every document, `IXSCAN` walks an index, and a `SORT` stage means an in-memory sort. The **documents examined against the documents returned**: in my run the query with no index examined **20,000** documents to return **67**, and with an index it examined **67**. And the **keys examined**, which tells me how much of the index was walked. A large gap between examined and returned is the sign of a missing or wrong index. Then I change the index and run `explain` again, and I check that other queries still have theirs.',
        fu: [['What is a covered query?', 'One that is answered from the index alone: documents examined is 0.'], ['Does `explain` run the query?', 'With `executionStats` it does. Plain `queryPlanner` does not.']],
        trap: 'Adding an index without reading the plan.',
        real: 'Describe a query that you made fast.'
      }),

      B.qa({
        id: 'qa-esr', t: 2, tag: 'MongoDB', secs: 60,
        q: 'How do you order the fields of a compound index?',
        pts: ['Equality fields first', 'Then the sort field', 'Then the range fields', 'Check with explain'],
        short: 'Equality fields first, then the **sort** field, then the range fields: the **ESR** rule of thumb. In my run the query filtered on `store_id` and `status` and sorted by `placed_at`. With an index on `(store_id, status)` the plan was `SORT > FETCH > IXSCAN` and the server sorted **1,372** documents in memory. With `(store_id, status, placed_at)` the plan was `FETCH > IXSCAN`: the `SORT` stage was **gone**. An index that starts with the sort field cannot jump to the matches. The range part of the rule is from documentation, and I did not run it here. I always confirm with `explain`.',
        fu: [['Does the order of the filter matter?', 'No. The order of the index fields does.'], ['A prefix of an index?', 'A query can use the first fields of a compound index alone.']],
        trap: 'An index that starts with the sort field.',
        real: 'Describe an index that you reordered.'
      }),

      B.qa({
        id: 'qa-covered', t: 1, tag: 'MongoDB', secs: 45,
        q: 'What is a covered query, and what does an index cost?',
        pts: ['Answered from the index alone', 'No documents read', 'Every write updates every index', 'Keep the ones that are used'],
        short: 'A **covered query** is answered from the **index alone**: every field that it filters on and returns is in the index, so the server reads **no documents**. In my run `PROJECTION_COVERED > IXSCAN` examined **67** keys and **0** documents. An index is not free: every insert, update and delete must also change **each index**, and the indexes take memory. So I keep an index for each query that matters, I drop the ones that `explain` never uses, and I do not index every field. The cost side is from documentation, and I did not time it here.',
        fu: [['How do you find unused indexes?', 'The `$indexStats` stage counts how often each index was used.'], ['Is `_id` indexed?', 'Always: it is the only index that a collection has by default.']],
        trap: 'An index on every field.',
        real: 'Describe an index that you removed.'
      }),

      B.recap({
        id: 'm3-recap', n: 3, badge: 'Index Reader', color: '#34D399',
        pts: [
          'With **no index** the server examined **' + n(c1[4]) + '** documents (`COLLSCAN`) to return **' + c1[5] + '**. With an index it examined **' + c2[4] + '**.',
          'A sort outside the index adds a **`SORT`** over **' + n(c3[4]) + '** documents. **Equality fields first, then the sort field** removed it.',
          'A **covered** query read **' + c5[4] + '** documents: `' + c5[2] + '`.',
          'An index helps a query that picks a **small share**. An index on a field that almost every document shares does not.',
          'Every write updates **every index**. Keep the ones that queries use.'
        ],
        lines: [
          'I read explain before I add an index.',
          'I put equality fields first.',
          'I drop indexes that nobody uses.'
        ]
      })
    ]
  });
})();
