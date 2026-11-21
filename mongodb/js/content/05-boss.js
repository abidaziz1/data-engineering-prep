/* Mission 5: boss round. Two drills that mix the missions, a design decision, a coding round that ran on a real mongod 8.0, a mock interview and a one-page review. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n, M = function (k) { return G.meta(k); };
  var S = C('shapes'), P = C('pipeline'), D = C('design'), ST = C('streams'), TOP = G.table('challenge.top').rows, IX = G.table('index.cases').rows, LD = C('load');
  var CHF = G.file('challenge.py'), SOL = G.lines(CHF, G.at(CHF, /^top_stores = \[/), G.span(CHF, /^top_stores = \[/, /^\]$/)[1]);
  G.expect(TOP.length === 3 && TOP[0][2] >= TOP[1][2] && TOP[1][2] >= TOP[2][2] && TOP.every(function (r) { return r[3] === Math.floor(r[2] / r[1]); }), 'the coding round returns three stores, highest revenue first, with the average rounded down');

  var QA = [['qa-model', 1], ['qa-nullmissing', 1], ['qa-whymongo', 1], ['qa-16mb', 2],
    ['qa-pipeline', 1], ['qa-unwind', 1], ['qa-lookup', 1],
    ['qa-explain', 1], ['qa-esr', 2], ['qa-covered', 1],
    ['qa-validation', 1], ['qa-idempotent', 1], ['qa-changestream', 1], ['qa-transactions', 2]];

  LAB.addChapter({
    id: 'm5', n: 5, title: 'Boss round', short: 'Boss round', blurb: 'Two drills, a decision, a coding round, a mock interview and a one-page review', minutes: 28,
    focus: ['src', 'stg', 'ing', 'mart', 'mon'],
    goals: [
      'Solve **drills** that combine several missions.',
      'Write a **pipeline** for the top stores by revenue, with an average.',
      'Answer a **mock interview round** with a timer, and grade yourself honestly.',
      'Keep a **one-page review** of the rules and the recorded numbers.'
    ],
    say: 'This is the last mission. Two drills in which more than one thing goes wrong, one design decision, one coding round, and then the interview questions with no notes. Grade yourself honestly. An honest grade is the only one worth reading.',
    scenes: [
      B.incident({
        id: 'm5-drill1', t: 1, src: 'rec', title: 'Drill 1: the numbers do not match the source, in two ways', time: '09:10',
        alert: '**The dashboard counts 3 orders without a coupon where the store says 2, and its revenue is far above finance for some stores.** The coupon count uses `find({"coupon": None})`. The revenue pipeline unwinds the `lines` and sums `total_cents`.',
        clues: ['The query is for None', 'The pipeline has an `$unwind` followed by `$sum` of an order-level field', 'Nothing failed: the numbers are just wrong'],
        opts: [
          { t: 'Query null and missing on purpose with `$type` and `$exists`, and sum the revenue of the line (`qty` times `cents`) after the unwind', fb: '' },
          { t: 'Divide the revenue by the average number of lines', fb: 'The error differs for each store.' },
          { t: 'Delete the orders without a coupon field', fb: 'It destroys data to fix a query.' },
          { t: 'Report the numbers with a warning', fb: 'They would still be wrong.' }
        ],
        best: 0,
        why: 'Two missions at once. **Mission 1**: a query for `None` matched `' + S.null_matches + '`, and `$exists: False` matched `' + S.missing_matches + '`. **Mission 2**: `$unwind` made **' + n(P.stage_counts[1]) + '** documents from **' + n(P.stage_counts[0]) + '** orders, and each carried the whole order total.',
        checks: [
          ['Compare with the source', 'Both numbers disagree with a trusted system.'],
          ['Read the coupon query', 'None matches null and missing.'],
          ['Read the pipeline', 'A parent total is summed after an unwind.'],
          ['Fix both', 'Query each state, sum a line-level value, and compare with the source.']
        ],
        tell: 'A query for null also matches a missing field, so the coupon count mixed two kinds of order, and the revenue pipeline added each order once for every line. I changed the query to ask for each state on purpose and the pipeline to add up the revenue of each line, and I compared both with the source.',
        prevent: ['Know the **shapes** of what you report on', 'After **`$unwind`** sum only line-level values', 'Compare with the **source** before you publish']
      }),

      B.incident({
        id: 'm5-drill2', t: 2, src: 'rec', title: 'Drill 2: the dashboard is slow, and the nightly reload fails', time: '14:20',
        alert: '**The store dashboard takes a minute, and the nightly reload of daily totals stopped with a duplicate key error after a retry.** The dashboard filters on `store_id` and `status`, and the collection has no index on them. The reload uses `insert_many`.',
        clues: ['`explain` would show a `COLLSCAN`', 'The collection grew ten times in a year', 'The retry inserted documents that already existed'],
        opts: [
          { t: 'Create an index on `(store_id, status)` and check `explain`, and change the reload to an upsert on `_id`', fb: '' },
          { t: 'Add memory, and delete the old totals before each reload', fb: 'The scan stays, and a delete leaves a gap if the reload fails.' },
          { t: 'Cache the dashboard, and ignore the duplicate key error', fb: 'Both problems come back.' },
          { t: 'Move the totals to another database', fb: 'A large change for two small fixes.' }
        ],
        best: 0,
        why: 'Two missions at once. **Mission 3**: with no index the server examined **' + n(IX[0][4]) + '** documents to return **' + IX[0][5] + '**, and with an index **' + IX[1][4] + '**. **Mission 4**: a plain `insert_many` failed with code **' + D.plain_insert_error_code + '**, and an upsert run twice changed nothing the second time.',
        checks: [
          ['Run explain on the dashboard query', 'A COLLSCAN with a huge gap.'],
          ['Read the failed reload', 'insert_many of documents that exist.'],
          ['Fix the query', 'An index on the filter fields.'],
          ['Fix the reload', 'ReplaceOne with upsert on the key.']
        ],
        tell: 'The dashboard query had no index and read every document, and the reload used a plain insert, which cannot be repeated. I created an index on the two filter fields and checked the plan, and I changed the reload to an upsert on the key so that a retry changes nothing.',
        prevent: ['Run **`explain`** on a dashboard query', 'Make every reload an **upsert** on a key', 'Review plans when a collection **grows**']
      }),

      B.decide({
        id: 'm5-dec', t: 2, src: 'docs', title: 'Decision: what do you build around a MongoDB source?',
        scenario: 'Brewline wants the orders of its MongoDB in the warehouse within five minutes, with the nested `lines` flattened, and with bad documents caught. The source serves the application, and several teams will later want the same changes.',
        opts: [
          { t: 'A change stream (or a Kafka connector on it), a validated and flattened write to the warehouse that is safe to repeat, and a saved token', d: 'Fresh, complete, safe after a restart, and a path to share the changes.', lose: 'A job to run and monitor, and the oplog window to watch.' },
          { t: 'A full export every hour into the warehouse', d: 'Simple, and no stream to keep alive.', lose: 'A heavy read of the source every hour, and deletes are not seen without a comparison.' },
          { t: 'Let the analysts query MongoDB directly', d: 'No pipeline of data.', lose: 'They compete with the application, and every question needs a MongoDB pipeline.' }
        ],
        pick: 0,
        why: 'Every piece has a recorded reason: a stream with a **token** loses nothing, an **upsert** makes the write safe to repeat, and a **validator** (or a check in the job) catches bad shapes. The options are from documentation, and no warehouse ran in this course.',
        when: 'When a one-hour delay is fine and deletes are rare, an hourly export is much less to operate.'
      }),

      B.challenge({
        id: 'm5-ch', t: 1, title: 'Coding round: the three best stores', file: 'challenge.py', lang: 'python',
        q: 'The `orders` collection holds one document for each order, with `store_id`, `status` and `total_cents`. Write an **aggregation pipeline** that returns the **three stores with the highest revenue**, counting **only orders that are not `REFUNDED`**. Each result has the store (`_id`), `orders`, `revenue`, and `average`, the **average order value in cents rounded down**. Order by revenue, highest first, and by store id when two are equal.',
        starter: 'top_stores = [\n    # your stages here\n]\nfor row in db.orders.aggregate(top_stores):\n    print(row)\n',
        hints: ['Start with `$match` on `status` with `$ne`, so that every later stage has fewer documents.', '`$group` by `$store_id` with `$sum: 1` for the orders and `$sum: "$total_cents"` for the revenue.', '`$sort` on `revenue: -1`, then on `_id: 1` for ties, and `$limit: 3`.', '`$project` can keep `orders` and `revenue` and add `average` with `$floor` of `$divide`.'],
        sol: SOL,
        res: { cols: ['store', 'orders', 'revenue', 'average'], rows: TOP.map(function (r) { return [String(r[0]), n(r[1]), n(r[2]), n(r[3])]; }) },
        expl: ['`$match` first keeps **' + n(P.stage_counts[0]) + '** of **' + n(LD.orders) + '** orders, so the rest of the pipeline works on fewer.', '`$group` collapses them to one document for each store, with the count and the sum. `$sort` and `$limit` keep the best three: sort **before** the limit, and add `_id` to break ties.', '`$project` computes `average` with `$floor` of `$divide` (and `$toInt`, so that it is a whole number): it never rounds up. The first store was **' + TOP[0][0] + '** with **' + n(TOP[0][2]) + '** cents, an average of **' + n(TOP[0][3]) + '**.'],
        cx: 'Add an index on `(status, store_id)` and read `explain` if this runs often on a large collection, and move the pipeline to the warehouse if it runs for every dashboard. With `$setWindowFields` the same pipeline can rank all the stores and keep the ties.'
      })
    ].concat(B.mockRound(QA.map(function (x) { return x[0]; }), QA.map(function (x) { return x[1]; }))).concat([
      B.cheat({
        id: 'm5-cheat', t: 1, src: 'rec', title: 'One page to review',
        say: 'This is your last-minute review. The numbers come from the recording on a real mongod ' + M('mongod') + ' with pymongo ' + M('pymongo') + '. Sections marked (docs) come from documentation and did not run. Take a screenshot or print the page.',
        sections: [
          { h: 'Documents', items: ['An order is **one document** with an embedded object and array. A store is a collection of its own, joined with `$lookup`', 'A query for **null** matched `' + S.null_matches + '`: it also matches a missing field. `$exists: False` found `' + S.missing_matches + '`', 'The number `4` found `' + S.number_matches + '`, the text `"4"` found `' + S.string_matches + '`. A second `_id` is code **' + S.duplicate_code + '**. A document is at most **' + n(S.max_bson) + '** bytes'] },
          { h: 'Pipeline', items: ['`$match` **' + n(P.stage_counts[0]) + '**, `$unwind` **' + n(P.stage_counts[1]) + '**, `$group` **' + P.stage_counts[2] + '**, `$sort` **' + P.stage_counts[3] + '** documents', 'After `$unwind` the order total is in every copy: sum a **line-level** value', 'A `$match` after a `$group` on a removed field returns nothing. Group before `$lookup`'] },
          { h: 'Indexes', items: ['No index: **' + n(IX[0][4]) + '** documents examined for **' + IX[0][5] + '**. Index `(store_id, status)`: **' + IX[1][4] + '**', '`SORT > FETCH > IXSCAN` over **' + n(IX[2][4]) + '**: put the sort field after the equality fields to remove the `SORT`', 'Covered: **' + IX[4][4] + '** documents read. Every write updates every index (docs)'] },
          { h: 'Writes and streams', items: ['A validator: code **121**. A unique index: code **11000**. Validation checks the type and does not convert', 'An upsert twice: matched **' + D.upsert_second[1] + '**, modified **' + D.upsert_second[2] + '**. A plain `insert_many` of the same documents failed', 'A transaction: **' + D.inside + '** inside, **' + D.outside + '** outside, **' + D.after_abort + '** after an abort. It needs a replica set', 'A change stream resumed from a **token** lost none of the **' + ST.resumed.length + '** writes made while nobody watched. `updateLookup` was `None` after a delete'] }
        ]
      }),

      B.recap({
        id: 'm5-recap', n: 5, badge: 'MongoDB Partner', color: '#047857',
        pts: [
          'You read a **document** and its shapes: **null matches missing**, and the type is part of the value.',
          'You write a **pipeline** that filters first, counts documents after each stage, and sums line-level values after an unwind.',
          'You read **`explain`**: documents examined against returned, `COLLSCAN`, `SORT`, and a covered query.',
          'You make a load **safe to repeat** with an upsert, and keep bad shapes out with a **validator**.',
          'You capture changes with a **change stream** and a saved **resume token**, and you know what `updateLookup` holds.'
        ],
        lines: [
          'I can explain what the server did, and why.',
          'I can recover from my own mistakes.',
          'I can talk to the people who run the platform.'
        ]
      })
    ])
  });
})();
