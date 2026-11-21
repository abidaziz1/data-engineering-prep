/* Mission 2: the aggregation pipeline. pipelines.py ran against a real mongod 8.0 with 20,000 orders. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var P = C('pipeline'), PIPE = G.file('pipelines.py'), SK = G.table('pipeline.sku').rows, ST = G.table('pipeline.store').rows, RG = G.table('pipeline.region').rows;
  G.expect(P.stage_counts.join() === '19200,38400,4,4' && P.stage_names.join() === '$match,$unwind,$group,$sort', 'the stages leave 19,200, 38,400, 4 and 4 documents');
  G.expect(SK.length === 4 && SK.every(function (r) { return r[1] === 19200; }) && RG.length === 3 && ST.length === 3, 'four SKUs, three regions and three stores are shown');

  LAB.addChapter({
    id: 'm2', n: 2, title: 'Queries and the aggregation pipeline', short: 'Pipeline', blurb: 'Filter, unwind, group and join, and what each stage does to the number of documents', minutes: 22,
    focus: ['stg'],
    goals: [
      'Write a **pipeline** of `$match`, `$unwind`, `$group` and `$sort`.',
      'Say what **`$unwind`** does to the number of documents.',
      'Join with **`$lookup`**, and say why to group first.',
      'Spot two pipelines that **run and give the wrong answer**.'
    ],
    say: 'Most of what a data engineer asks of MongoDB is an aggregation: group the orders, add them up. A pipeline is a list of stages, and each stage changes the documents. I ran three pipelines on 20,000 orders and counted the documents after every stage.',
    scenes: [
      B.code({
        id: 'm2-code', t: 1, src: 'rec', title: 'pipelines.py: revenue by SKU, by store and by region', file: 'pipelines.py', lang: 'python', code: PIPE,
        steps: [
          { say: 'Three pipelines on the orders of Brewline. Press Next.', lines: null },
          { say: '`$match` keeps the orders that are **not refunded**. Put it **first**: every later stage then has fewer documents to work on.', lines: G.span(PIPE, /'\$match': \{'status'/) },
          { say: '`$unwind` makes **one document for each line** of the `lines` array. An order with three lines becomes three documents.', lines: G.span(PIPE, /'\$unwind': '\$lines'/) },
          { say: '`$group` adds up the quantity and the revenue of each SKU. `lines.qty` times `lines.cents` is the **revenue of a line**.', lines: G.span(PIPE, /'\$group': \{'_id': '\$lines\.sku'/) },
          { say: 'A loop runs the pipeline **one stage longer each time** and counts the documents that come out. This is how to see what each stage does.', lines: G.span(PIPE, /for k in range/, /print\('after stage'/) },
          { say: 'The second pipeline groups the orders **by store** and adds `total_cents`, which the order already carries.', lines: G.span(PIPE, /by_store = \[/, /^\]$/) },
          { say: 'The third pipeline starts with the first two stages of the second. **`$lookup`** joins each store group to the `stores` collection, and a second `$group` adds the stores of a **region**.', lines: G.span(PIPE, /by_region = by_store/, /^\]$/) }
        ]
      }),

      B.term({
        id: 'm2-out', t: 1, src: 'rec', title: 'What pipelines.py printed',
        say: 'The output of the program. The first four lines are the number of documents after each stage.',
        lines: function () { return G.plain(X('pipelines.run')); },
        after: 'The orders went through the stages as **' + n(P.stage_counts[0]) + '** documents after `$match`, **' + n(P.stage_counts[1]) + '** after `$unwind` (one for each line), **' + n(P.stage_counts[2]) + '** after `$group` (one for each SKU), and **' + n(P.stage_counts[3]) + '** after `$sort`. Every SKU sold **' + n(SK[0][1]) + '** units, because the data was built from a fixed rule. The regions came out of a **join** of 12 store groups to 12 stores.',
        afterKind: 'tip',
        doneSay: 'Count the documents after each stage.'
      }),

      B.flow({
        id: 'm2-flow', t: 1, src: 'rec', title: 'A pipeline changes the number of documents', g: 'pipeline', legend: true,
        steps: [
          { say: 'The orders go through four stages. Press Next to count the documents.', focus: ['src', 'mat', 'unw', 'grp', 'srt'], cap: 'Four stages.' },
          { say: 'Step 1. `$match` keeps the orders that are not refunded: **' + n(P.stage_counts[0]) + '** of **' + n(G.counts('load').orders) + '**.', on: ['e1'], focus: ['src', 'mat'], tags: ['tg_early'], cap: 'Filter first.' },
          { say: 'Step 2. `$unwind` makes **one document for each line**: **' + n(P.stage_counts[1]) + '** documents. The number went **up**.', on: ['e2'], focus: ['mat', 'unw'], tags: ['tg_grow'], cap: 'Unwind makes more documents.' },
          { say: 'Step 3. `$group` adds them up by SKU: **' + n(P.stage_counts[2]) + '** documents, one for each SKU.', on: ['e3'], focus: ['unw', 'grp'], tags: ['tg_small'], cap: 'Group makes few.' },
          { say: 'Step 4. `$sort` puts the **' + n(P.stage_counts[3]) + '** groups in order. Sorting a few documents is cheap, and it is the last thing to do.', on: ['e4'], focus: ['grp', 'srt'], cap: 'Sort the few.' }
        ]
      }),

      B.widget({ id: 'm2-lab', kind: 'pipelab', t: 1, src: 'rec', title: 'Lab: three ways to group the orders' }),

      B.cmp({
        id: 'm2-sql', t: 1, src: 'docs', title: 'A pipeline against SQL',
        say: 'If you know SQL, this table maps it. Press Next to read it.',
        cols: ['SQL', 'Pipeline stage', 'What it does to the documents'],
        hl: 1,
        rows: [
          ['`WHERE`', '`$match`', 'Keeps some of them'],
          ['`GROUP BY` and `SUM`', '`$group` with `$sum`', 'Collapses them to one for each key'],
          ['`ORDER BY`', '`$sort`', 'Puts them in order'],
          ['`LIMIT`', '`$limit`', 'Keeps the first few'],
          ['`JOIN`', '`$lookup`', 'Adds the matching documents of another collection'],
          ['Exploding an array column', '`$unwind`', 'Makes one document for each element']
        ],
        steps: [
          { upto: 4, say: 'The first four map directly. The order of the stages is the order of the steps that you would write in SQL.' },
          { upto: 6, say: '`$lookup` and `$unwind` have no one-word SQL twin. `$unwind` is the one that changes how many documents you have, and it is the source of the double count in the next bug hunt.' }
        ]
      }),

      B.bug({
        id: 'm2-bug', t: 1, q: 'A report adds the revenue of each store after unwinding the lines. Some stores show two or three times their real revenue, and some are right. Click the line that counts too much.',
        file: 'revenue.py', lang: 'python',
        code: '[{"$unwind": "$lines"},\n {"$group": {"_id": "$store_id", "revenue": {"$sum": "$total_cents"}}},\n {"$sort": {"_id": 1}}]\n',
        bad: [2],
        hint: 'After $unwind, how many documents carry the same total_cents?',
        why: '`$unwind` made **one document for each line**, and each of them still carries the `total_cents` of the **whole order**. So an order with three lines was added **three times**. Add the revenue of the **line**: `qty` times `cents`, as the recording did. Or leave the array alone and sum the order total without an `$unwind`.',
        fix: '[{"$unwind": "$lines"},\n {"$group": {"_id": "$store_id", "revenue": {"$sum": {"$multiply": ["$lines.qty", "$lines.cents"]}}}},\n {"$sort": {"_id": 1}}]\n',
        cheer: 'Sum the line, not the order.'
      }),

      B.bug({
        id: 'm2-bug2', t: 1, q: 'A pipeline groups the orders by store and then keeps only the placed ones. It returns no documents. Click the line that cannot work.',
        file: 'placed.py', lang: 'python',
        code: '[{"$group": {"_id": "$store_id", "revenue": {"$sum": "$total_cents"}}},\n {"$match": {"status": "PLACED"}}]\n',
        bad: [2],
        hint: 'What fields do the documents have after $group?',
        why: 'After `$group` each document has only `_id` and `revenue`. The `status` field **is gone**, so `$match` finds nothing and the pipeline runs **without an error**. Filter **before** you group, as `pipelines.py` did.',
        fix: '[{"$match": {"status": "PLACED"}},\n {"$group": {"_id": "$store_id", "revenue": {"$sum": "$total_cents"}}}]\n',
        cheer: 'Filter before you group.'
      }),

      B.quiz({
        id: 'm2-q1', t: 1,
        q: 'The pipeline of the recording started with ' + n(G.counts('load').orders) + ' orders. How many documents were there after `$match` and after `$unwind`?',
        opts: [
          { t: n(P.stage_counts[0]) + ' after `$match` and ' + n(P.stage_counts[1]) + ' after `$unwind`', fb: '' },
          { t: n(P.stage_counts[0]) + ' after both', fb: '`$unwind` makes one document for each line.' },
          { t: n(P.stage_counts[1]) + ' after `$match`', fb: '`$match` can only keep the same number or fewer.' },
          { t: '4 after both', fb: 'Four is the number of groups, after `$group`.' }
        ],
        ok: 0, why: 'The program printed `after stage 1 $match -> ' + n(P.stage_counts[0]) + ' documents` and `after stage 2 $unwind -> ' + n(P.stage_counts[1]) + ' documents`.'
      }),

      B.quiz({
        id: 'm2-q2', t: 1,
        q: 'Why does the third pipeline group by store **before** `$lookup`?',
        opts: [
          { t: 'The join then runs on 12 documents and not on 19,200', fb: '' },
          { t: '`$lookup` needs a `$group` before it', fb: 'It does not.' },
          { t: 'The stores have no `_id`', fb: 'They do: it is the store number.' },
          { t: 'To avoid an error', fb: 'Either order runs. One is much more work.' }
        ],
        ok: 0, why: 'A join of every order to its store does the work **once for each order**. Grouping first leaves one document for each store.'
      }),

      B.quiz({
        id: 'm2-q3', t: 1,
        q: 'A pipeline runs without an error and returns nothing. What do you check first?',
        opts: [
          { t: 'The fields that each stage keeps, and the order of the stages', fb: '' },
          { t: 'The version of the server', fb: 'An empty result is rarely a version problem.' },
          { t: 'The size of the collection', fb: 'The result is empty, not slow.' },
          { t: 'The name of the database', fb: 'A wrong database would also fail the other pipelines.' }
        ],
        ok: 0, why: 'A `$match` on a field that an earlier `$group` removed returns nothing and raises no error. Add a `$limit` and look at the documents after each stage, as the recording did.'
      }),

      B.order({
        id: 'm2-ord', t: 1, q: 'Put the stages in order to find the revenue of each SKU for orders that were not refunded.',
        items: ['`$match` the orders that are not refunded', '`$unwind` the lines', '`$group` by SKU and add up the revenue of the lines', '`$sort` the groups'],
        why: 'Filter first, expand the array only for the orders that are left, add up, and sort the few groups that remain.'
      }),

      B.decide({
        id: 'm2-dec', t: 2, src: 'docs', title: 'Decision: aggregate in MongoDB, or export the data and aggregate elsewhere?',
        scenario: 'A daily report needs revenue by store and by SKU over a year of orders. The orders live in MongoDB, which also serves the application at peak hours.',
        opts: [
          { t: 'Export the orders to the warehouse or the lake, and aggregate there', d: 'The analytics run on a system made for them, and the application is not slowed down.', lose: 'A copy to keep in step, and a delay.' },
          { t: 'Run the pipeline on MongoDB at night', d: 'No copy, and fresh data.', lose: 'It competes with the application, and every new question needs another pipeline.' },
          { t: 'Run it on a secondary of the replica set', d: 'Away from the primary that serves the application.', lose: 'A secondary can lag, and a heavy pipeline still takes its resources.' }
        ],
        pick: 0,
        why: 'MongoDB is the **source**; the analytics belong in the system that is built for them, fed by a change stream (mission 4) or an export. A pipeline on the source is fine for **small, regular** questions. This is a judgement from documentation, and no load test ran here.',
        when: 'For a few small numbers that the application itself shows, a pipeline on MongoDB is simpler than a pipeline of data.'
      }),

      B.incident({
        id: 'm2-inc', t: 2, src: 'rec', title: 'Incident: the revenue of some stores is two or three times too high', time: '09:40',
        alert: '**Some stores in the new dashboard show two or three times the revenue of the finance system, and some are exactly right.** The pipeline unwinds the `lines` of each order and sums `total_cents`. Orders have one, two or three lines, so the error is not the same for every store.',
        clues: ['The pipeline has an `$unwind` on `lines`', '`$sum` adds `total_cents`, the total of the order', 'Orders with three lines are counted three times'],
        opts: [
          { t: 'Sum the revenue of each line (`qty` times `cents`), or sum `total_cents` without the unwind', fb: '' },
          { t: 'Divide the result by two', fb: 'The error is not the same for every store.' },
          { t: 'Remove the orders with more than one line', fb: 'It drops real sales.' },
          { t: 'Use `$avg` instead of `$sum`', fb: 'It answers a different question.' }
        ],
        best: 0,
        why: 'The recording of this case: `$unwind` made **' + n(P.stage_counts[1]) + '** documents from **' + n(P.stage_counts[0]) + '** orders, and each of them carried the whole order total. The pipeline of the recording summed `lines.qty * lines.cents` instead.',
        checks: [
          ['Compare a store with the source', 'The dashboard is higher by a factor of one, two or three.'],
          ['Read the pipeline', 'An $unwind, then a $sum of an order-level field.'],
          ['Count the documents', 'After the unwind there are more documents than orders.'],
          ['Fix and test', 'Sum a line-level value, and compare with the source.']
        ],
        tell: 'The pipeline unwound the lines of each order and then summed the total of the order, so every order was added once for each of its lines. I changed it to add up the revenue of each line, and I compared the result with the finance figure for every store.',
        prevent: ['After an **`$unwind`**, only sum **line-level** values', 'Count the **documents after each stage**', 'Compare totals with the **source system**']
      }),

      B.qa({
        id: 'qa-pipeline', t: 1, tag: 'MongoDB', secs: 60,
        q: 'What is an aggregation pipeline, and how do you keep one fast and correct?',
        pts: ['A list of stages', 'Each stage changes the documents', 'Filter early', 'Count documents after each stage'],
        short: 'A pipeline is a **list of stages**, and each stage takes the documents of the one before and hands on new ones: `$match` keeps some, `$unwind` makes one document for each array element, `$group` adds up, `$sort` orders, `$lookup` joins. To keep it **fast** I filter first with `$match`, so that later stages have fewer documents, and I sort the few groups at the end. To keep it **correct** I count the documents after each stage: in my run **19,200** orders became **38,400** after `$unwind` and **4** after `$group`. A stage that removes a field makes a later `$match` on it return nothing without an error.',
        fu: [['`find` or a pipeline?', '`find` for a filter and a projection. A pipeline when you group, join or reshape.'], ['`$project` or `$addFields`?', '`$project` keeps only the fields that you name. `$addFields` keeps all and adds.']],
        trap: '`$match` after `$group` on a field that is gone.',
        real: 'Describe a pipeline that you wrote.'
      }),

      B.qa({
        id: 'qa-unwind', t: 1, tag: 'MongoDB', secs: 45,
        q: 'What does $unwind do, and what is the trap?',
        pts: ['One document for each array element', 'The count goes up', 'The parent fields are repeated', 'Do not sum a parent field'],
        short: '`$unwind` takes an array field and makes **one document for each element**, and **repeats the other fields** of the parent in each one. In my run **19,200** orders became **38,400** documents. The trap is that a field of the parent, such as the order total, is now in every copy: if I sum it after the unwind, each order is counted **once for each line**. So after an `$unwind` I sum only values of the **element** (`qty` times `cents`), and I check my totals against the source. An empty array drops the parent, unless I ask `$unwind` to keep it.',
        fu: [['How do you keep orders with no lines?', '`preserveNullAndEmptyArrays: true`.'], ['Is there a way without `$unwind`?', '`$sum` over an array expression, or `$reduce`.']],
        trap: 'Summing an order-level field after the unwind.',
        real: 'Describe a total that was counted twice.'
      }),

      B.qa({
        id: 'qa-lookup', t: 1, tag: 'MongoDB', secs: 45,
        q: 'How do you join in MongoDB, and when is that a bad idea?',
        pts: ['$lookup in a pipeline', 'localField and foreignField', 'Group first', 'Many joins mean a model problem'],
        short: 'I join with **`$lookup`** in a pipeline: it takes a collection, a local field and a foreign field, and adds the matching documents as an array. In my run I **grouped by store first**, so the join ran on 12 documents, and then added up the stores of each region. I would not build analytics on many joins: a model that needs a join for every read should embed more, and heavy analytics belong in a warehouse. A `$lookup` is fast when the field of the other collection has an **index**. That last point is from documentation, and I did not time it here.',
        fu: [['Left or inner join?', '`$lookup` is a left join. A `$unwind` after it makes it an inner join.'], ['Sharded collections?', 'A `$lookup` needs care on a sharded collection, from documentation.']],
        trap: 'Joining before grouping.',
        real: 'Describe a join that you changed.'
      }),

      B.recap({
        id: 'm2-recap', n: 2, badge: 'Pipeline Builder', color: '#6EE7B7',
        pts: [
          'A pipeline is a **list of stages**. The recording went **' + n(P.stage_counts[0]) + '** documents after `$match`, **' + n(P.stage_counts[1]) + '** after `$unwind`, **' + n(P.stage_counts[2]) + '** after `$group`.',
          '**Filter first**, group, then sort the few groups.',
          'After **`$unwind`** the order total is in every copy: summing it counts each order once for each line.',
          'A `$match` on a field that `$group` removed returns **nothing**, with no error.',
          'Group **before** `$lookup`: the join then runs on 12 documents.'
        ],
        lines: [
          'I count the documents after each stage.',
          'I filter before I group.',
          'I check totals against the source.'
        ]
      })
    ]
  });
})();
