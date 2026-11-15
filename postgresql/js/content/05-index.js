/* Mission 5: indexes, statistics and plans for big tables. A table of a million events and one of 200,000 orders, on real servers. The plans are EXPLAIN ANALYZE without times. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var BR = C('idx.brin'), PA = C('idx.partial'), IO = C('idx.index_only'), JS = C('idx.jsonb'), ST = C('idx.stats'), WC = C('idx.write_cost'), US = C('idx.usage'), TB = C('idx.table');
  var WR = G.table('idx.write_cost').rows, UR = G.table('idx.usage').rows;
  var IDX = G.file('indexes.sql');
  G.expect(BR.brin_kb < 100 && BR.btree_mb > 10 && BR.btree_over_brin > 100 && BR.correlation_in_order === 1 && BR.shuffled_plan_uses_brin === false && BR.brin_plan_has_bitmap === true, 'a BRIN index is tiny on ordered data and ignored on shuffled data');
  G.expect(PA.times_smaller > 100 && PA.plan_uses_partial === true, 'a partial index is tiny and used');
  G.expect(IO.index_only_scan_before === false && IO.heap_fetches_after === 0 && IO.all_visible_pages_before === 0 && IO.all_visible_pages_after === IO.pages, 'index-only scans need a vacuum');
  G.expect(JS.contain_uses_gin === true && JS.arrow_uses_gin === false && JS.arrow_plan_is_seq_scan === true && JS.expr_uses_index === true, 'GIN answers containment and not ->>');
  G.expect(ST.estimate_before < ST.actual / 3 && ST.estimate_after > ST.estimate_before * 2, 'statistics on two columns move the estimate');
  G.expect(WC.five_over_none > 3 && WC.two > WC.none, 'every index adds to the log of an insert');
  G.expect(US.never_used >= 5, 'indexes that nobody reads exist');
  var BUGJ = 'CREATE INDEX events_payload_gin ON events USING gin (payload jsonb_path_ops);\n\nSELECT count(*) FROM events WHERE payload->>\'n\' = \'42\';\n';
  var BUGB = 'CREATE INDEX events_user_brin ON events USING brin (user_id);\n\nSELECT count(*) FROM events WHERE user_id = 12345;\n';
  var rowsOf = function (t) { return t.split('\n'); };
  var sp = function (a, b) { return G.span(IDX, a, b); };

  LAB.addChapter({
    id: 'm5', n: 5, title: 'Indexes, statistics and plans', short: 'Indexes', blurb: 'BRIN, partial, covering and GIN indexes, what they cost, and why a plan is wrong', minutes: 21,
    focus: ['air', 'mon'],
    goals: [
      'Choose between **btree, BRIN, partial, covering and GIN** indexes for a question.',
      'Say what **every extra index** costs on a write.',
      'Say why an **index-only scan** needs a vacuum.',
      'Read an **estimate against an actual row count** and fix a wrong plan with statistics.'
    ],
    say: 'You know from the SQL course that an index can turn a scan into a lookup. This mission is about the choices that come up on tables with millions of rows: an index of 24 kilobytes instead of 21 megabytes, an index for a rare kind of row, an index on a key inside JSON, and the numbers that tell you that a plan is wrong. Every plan here was printed by a real server.',
    scenes: [
      B.term({
        id: 'm5-brin', t: 1, src: 'rec', title: 'An index of 24 kilobytes',
        say: 'A table of one million events, loaded in time order. I asked for one day out of 35 and compared a btree index with a BRIN index on the timestamp.',
        lines: function () {
          return G.term([
            ['SELECT pg_size_pretty(pg_relation_size(\'events_ts_btree\')), pg_size_pretty(pg_relation_size(\'events_ts_brin\'));', BR.btree_mb + ' MB | ' + BR.brin_kb + ' kB'],
            ['SELECT correlation FROM pg_stats WHERE attname = \'event_ts\';', String(BR.correlation_in_order)],
            ['EXPLAIN (ANALYZE) ' + rowsOf(X('idx.plan_brin'))[0], rowsOf(X('idx.plan_brin')).slice(1).join('\n')]
          ]);
        },
        after: 'The btree on `event_ts` is **' + BR.btree_mb + ' MB**, the BRIN index is **' + BR.brin_kb + ' kB**: about **' + n(BR.btree_over_brin) + ' times smaller**, for a table of ' + BR.table_mb + ' MB. A BRIN index stores the **lowest and highest value of each range of pages**, so it can say "this range cannot contain that day". The plan used it: a **bitmap scan** that read the ranges that might match and **rechecked** the rows (**' + n(BR.recheck_removed) + '** were removed at the recheck), and it found the **' + n(BR.rows_matching) + '** rows of the day. It works because the **correlation** of `event_ts` with the position in the file is **' + BR.correlation_in_order + '**: the rows came in time order. Logs, events and any append-only table are like that.',
        afterKind: 'tip',
        doneSay: 'BRIN: a few kilobytes for a column that follows the order of the file.'
      }),

      B.term({
        id: 'm5-shuffled', t: 2, src: 'rec', title: 'The same index on rows in a random order',
        say: 'I made a copy of the table with the rows in a random order, built the same BRIN index, and asked for the same day.',
        lines: function () {
          return G.term([
            ['SELECT correlation FROM pg_stats WHERE tablename = \'events_shuffled\' AND attname = \'event_ts\';', String(BR.correlation_shuffled)],
            ['EXPLAIN (ANALYZE) ' + rowsOf(X('idx.plan_brin_shuffled'))[0].replace('events_shuffled', 'events_shuffled'), rowsOf(X('idx.plan_brin_shuffled')).slice(1).join('\n')]
          ]);
        },
        after: 'The correlation fell to **' + BR.correlation_shuffled + '**. Now every range of pages holds early and late values, so the index cannot exclude any range, and the planner **did not use it**: it read the whole table (a sequential scan, and ' + n(971200) + ' rows removed by the filter). BRIN is for columns whose **order follows the order of the file**. A table that is updated a lot, or loaded in a different order from the column you filter on, loses that. `CLUSTER` or a sorted load can restore it, and for such a table a btree is the right choice.',
        afterKind: 'warn',
        doneSay: 'BRIN needs correlation near 1. Check pg_stats first.'
      }),

      B.term({
        id: 'm5-partial', t: 1, src: 'rec', title: 'An index for the rare rows',
        say: 'One event in a thousand is a purchase, and a report looks up the purchases of one user. I built a full index on `user_id` and a partial one for purchases only.',
        lines: function () {
          return G.term([
            ['CREATE INDEX events_user_all ON events (user_id);   -- every row', PA.full_mb + ' MB'],
            ['CREATE INDEX events_user_purchase ON events (user_id) WHERE kind = \'purchase\';', PA.partial_kb + ' kB'],
            ['EXPLAIN (ANALYZE) ' + rowsOf(X('idx.plan_partial'))[0], rowsOf(X('idx.plan_partial')).slice(1).join('\n')]
          ]);
        },
        after: 'The partial index holds only the **' + n(PA.purchases) + '** purchases and is **' + PA.partial_kb + ' kB**, against **' + PA.full_mb + ' MB** for the full one: **' + PA.times_smaller + ' times smaller**, and cheaper to keep up to date, because an insert of a non-purchase does not touch it. The plan used it. One rule: the query must **contain the condition** `kind = \'purchase\'`, or the planner cannot prove that the index covers the rows it needs. Partial indexes are good for **status columns** (open orders, unprocessed events) and for **soft-deleted rows**.',
        afterKind: 'tip',
        doneSay: 'A partial index holds only the rows you look for.'
      }),

      B.term({
        id: 'm5-ios', t: 2, src: 'rec', title: 'An index-only scan needs a vacuum',
        say: 'A covering index holds `user_id` and, through `INCLUDE`, `event_ts`, so the query can be answered from the index alone. I asked for the plan right after the load, and again after `VACUUM`.',
        lines: function () {
          return G.term([
            ['CREATE INDEX events_user_inc ON events (user_id) INCLUDE (event_ts);', ''],
            ['EXPLAIN (ANALYZE) ' + rowsOf(X('idx.plan_ios_before'))[0], rowsOf(X('idx.plan_ios_before')).slice(1).join('\n')],
            ['VACUUM events;   -- pages marked all-visible: ' + IO.all_visible_pages_before + ' before, ' + n(IO.all_visible_pages_after) + ' of ' + n(IO.pages) + ' after', ''],
            ['EXPLAIN (ANALYZE) ' + rowsOf(X('idx.plan_ios_after'))[1], rowsOf(X('idx.plan_ios_after')).slice(2).join('\n')]
          ]);
        },
        after: 'The index could answer the query, and the planner **did not choose an index-only scan** at first: it fetched the rows from the table (a bitmap heap scan). The reason is the **visibility map**. An index does not know whether a row version is visible to your snapshot, so it must look at the table, unless the table page is marked **all-visible**, and only `VACUUM` marks pages. Right after the load **' + IO.all_visible_pages_before + '** pages were marked. After `VACUUM` all **' + n(IO.all_visible_pages_after) + '** were, and the plan became an **Index Only Scan with ' + IO.heap_fetches_after + ' heap fetches**. A table that is bulk loaded needs a `VACUUM`, or autovacuum\'s insert threshold, before covering indexes pay off.',
        afterKind: 'tip',
        doneSay: 'Index-only scans need all-visible pages, and vacuum sets them.'
      }),

      B.term({
        id: 'm5-jsonb', t: 1, src: 'rec', title: 'A key inside JSONB',
        say: 'Each event has a `payload` column of type JSONB. I built a GIN index and asked two questions that look the same: one with containment, one with the `->>` operator.',
        lines: function () {
          return G.term([
            ['CREATE INDEX events_payload_gin ON events USING gin (payload jsonb_path_ops);', JS.gin_mb + ' MB'],
            ['EXPLAIN (ANALYZE) ' + rowsOf(X('idx.plan_gin'))[0], rowsOf(X('idx.plan_gin')).slice(1).join('\n')],
            ['EXPLAIN (ANALYZE) ' + rowsOf(X('idx.plan_jsonb_arrow'))[0], rowsOf(X('idx.plan_jsonb_arrow')).slice(1).join('\n')],
            [rowsOf(X('idx.plan_jsonb_expr'))[0], ''],
            ['EXPLAIN (ANALYZE) ' + rowsOf(X('idx.plan_jsonb_expr'))[1], rowsOf(X('idx.plan_jsonb_expr')).slice(2).join('\n')]
          ]);
        },
        after: 'The containment query `payload @> \'...\'` used the **GIN** index (' + JS.gin_mb + ' MB) and found **' + n(JS.contain_rows) + '** rows. The `payload ->> \'n\' = \'42\'` query **did not use it**: a sequential scan of the whole table for ' + n(JS.arrow_rows) + ' rows. GIN with `jsonb_path_ops` answers `@>` and nothing else. For `->>` you need a **btree on the same expression**, written exactly as in the query, and after `CREATE INDEX ... ((payload->>\'n\'))` the plan used it. The lesson: an index is used when the query is in a form that the index supports, and the plan is the only way to know.',
        afterKind: 'warn',
        doneSay: 'GIN answers containment. ->> needs a btree on the expression.'
      }),

      B.term({
        id: 'm5-stats', t: 2, src: 'rec', title: 'Two columns that depend on each other',
        say: 'In the orders table, open orders only come from three of the twelve stores. I asked for the open orders of store 5 and read the estimate. Then I created statistics on the two columns together.',
        lines: function () {
          return G.term([
            ['EXPLAIN (ANALYZE) ' + rowsOf(X('idx.plan_stats_before'))[0], rowsOf(X('idx.plan_stats_before')).slice(1).join('\n')],
            ['CREATE STATISTICS orders_open_store (mcv) ON status, store_id FROM orders;  ANALYZE orders;', ''],
            ['EXPLAIN (ANALYZE) ' + rowsOf(X('idx.plan_stats_after'))[2], rowsOf(X('idx.plan_stats_after')).slice(3).join('\n')]
          ]);
        },
        after: 'The planner estimated **' + ST.estimate_before + '** rows and found **' + ST.actual + '**: off by a factor of **' + ST.off_by_before + '**. It multiplied the frequency of `status = open` by the frequency of `store_id = 5`, which is right only when the columns are **independent**. With statistics on **both** columns (`mcv` stores the most common combinations) the estimate became **' + ST.estimate_after + '**. For a filter on one table this changes nothing visible, but in a **join** an estimate that is wrong by a factor of 4 can pick the wrong join order and make a query run for minutes. Check estimated against actual rows first, in every slow plan.',
        afterKind: 'tip',
        doneSay: 'Compare estimated and actual rows. Dependent columns need extended statistics.'
      }),

      B.widget({ id: 'm5-lab', kind: 'indexlab', t: 1, src: 'rec', title: 'Lab: which index for which question' }),

      B.cmp({
        id: 'm5-write', t: 1, src: 'rec', title: 'What every index costs on a write',
        say: 'I inserted the same 50,000 orders into three tables that differ only in the number of extra indexes, and measured the log that was written.',
        cols: ['Indexes besides the primary key', 'WAL bytes for 50,000 inserted rows', 'Times the log of none'],
        hl: 2,
        rows: WR.map(function (r) { return [String(r[0]), n(r[1]), r[2] + ' x']; }),
        steps: [
          { upto: 1, say: 'With only the primary key, **' + (WC.none / 1048576).toFixed(1) + ' MB** of log.' },
          { upto: 2, say: 'Two more indexes: **' + (WC.two / WC.none).toFixed(1) + ' times** the log. Every insert has to write an entry in every index, and a page image the first time it touches an index page after a checkpoint.' },
          { upto: 3, say: 'Five more: **' + WC.five_over_none + ' times**. The same applies to updates of an indexed column (never HOT) and to deletes. **Every index is paid for on every write, and read by only some queries.**' }
        ]
      }),

      B.term({
        id: 'm5-unused', t: 1, src: 'rec', title: 'Indexes that nobody reads',
        say: '`pg_stat_user_indexes` counts how often each index was used. I read it for three tables.',
        lines: function () {
          return G.term([['SELECT relname, indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid)) FROM pg_stat_user_indexes ORDER BY 1, 2;', UR.map(function (r) { return r[0] + ' | ' + r[1] + ' | ' + r[2] + ' | ' + (r[3] >= 1048576 ? (r[3] / 1048576).toFixed(1) + ' MB' : Math.round(r[3] / 1024) + ' kB'); }).join('\n')]]);
        },
        after: 'Six of the twelve indexes have **`idx_scan = 0`**: the five extra indexes and the primary key of `ix5`, the table of the write test, which nobody queried. They still cost log on every write and disk. In a real system the first thing to do with a table that is slow to write is to list its indexes that were **never scanned since the statistics were reset**, drop the ones that no query and no constraint needs, and check that the counters have run for **long enough** to include the month-end report. A primary key or unique index also enforces a rule, so it is not dropped for being unused.',
        afterKind: 'tip',
        doneSay: 'Unused indexes cost on every write. Check idx_scan before you drop.'
      }),

      B.code({
        id: 'm5-code', t: 1, src: 'rec', title: 'The indexes of the events table', file: 'indexes.sql', lang: 'sql', code: IDX,
        steps: [
          { say: 'This is the file of the project that created these indexes on the table of a million events, and it ran as it is. Press Next.', lines: null },
          { say: 'A **BRIN** index on a timestamp that grows with the file. Tiny, and only useful while the correlation stays near 1.', lines: sp(/USING brin/) },
          { say: 'A **partial** index for the rare rows that are looked up. The queries must repeat `kind = \'purchase\'`.', lines: sp(/WHERE kind/) },
          { say: 'A **covering** index with `INCLUDE`: `event_ts` rides along in the leaf pages, but is not part of the key. Index-only scans need `VACUUM`.', lines: sp(/INCLUDE/) },
          { say: '**GIN** for containment on JSONB, and an **expression** index for one key that is read with `->>`. Write the expression the same way in the query.', lines: sp(/USING gin/, /\(payload->>/) }
        ],
        note: 'Five indexes on one table is a lot. This file is a list of examples, not a recommendation to create them all.'
      }),

      B.cmp({
        id: 'm5-choose', t: 1, src: 'rec', title: 'Which index for which question',
        say: 'A summary of the mission. The sizes are from the recording.',
        cols: ['The question', 'The index', 'Size in the recording', 'Watch out for'],
        hl: 1,
        rows: [
          ['A range of a column that follows the file order (time)', 'BRIN', BR.brin_kb + ' kB for a table of ' + BR.table_mb + ' MB', 'It needs correlation near 1. A random order makes it useless.'],
          ['A rare kind of row (status, type)', 'Partial btree', PA.partial_kb + ' kB, against ' + PA.full_mb + ' MB for every row', 'The query must contain the same condition.'],
          ['A query answered from the index alone', 'Btree with `INCLUDE`', 'larger than a plain btree', 'Needs `VACUUM` to mark pages all-visible.'],
          ['Contains a key or a value inside JSONB', 'GIN', JS.gin_mb + ' MB', '`->>` does not use it. `@>` does.'],
          ['One key read with `->>`', 'Btree on the expression', '6.7 MB', 'Write the expression exactly as the query does.'],
          ['Everything else: equality, ranges, sorting', 'Btree', BR.btree_mb + ' MB for a timestamp', 'Every one costs on every write.']
        ],
        steps: [
          { upto: 3, say: 'Time, rare rows and covering lookups: BRIN, partial and `INCLUDE`.' },
          { upto: 6, say: 'JSON, expressions and the default btree. Start with the default and a plan, and add the special ones where a plan shows a need.' }
        ]
      }),

      B.bug({
        id: 'm5-bug', t: 1, src: 'docs', q: 'A GIN index exists on `payload`. This query scans the whole table. Click the line that does not use the index.',
        file: 'events.sql', lang: 'sql', code: BUGJ, bad: [3],
        hint: 'Which operator does a GIN index with jsonb_path_ops support?',
        why: 'GIN with `jsonb_path_ops` answers **containment** (`@>`). The `->>` operator extracts text, and the planner cannot use the GIN index for it. The recording: `' + X('idx.plan_jsonb_arrow').split('\n')[0] + '` was a **sequential scan** of a million rows. Either ask by containment (`payload @> \'{"n": 42}\'`), or build a btree on `(payload->>\'n\')`, and read the plan to see that it is used.',
        fix: 'CREATE INDEX events_payload_gin ON events USING gin (payload jsonb_path_ops);\n\nSELECT count(*) FROM events WHERE payload @> \'{"n": 42}\';\n',
        cheer: 'Ask in a form that the index supports.'
      }),

      B.bug({
        id: 'm5-bug2', t: 2, src: 'docs', q: 'The `user_id` of the events is in a random order in the file. A BRIN index was added to speed up lookups, and the plan ignores it. Click the line that explains why.',
        file: 'events.sql', lang: 'sql', code: BUGB, bad: [1],
        hint: 'What does a BRIN index store for each range of pages?',
        why: 'A BRIN index stores a **minimum and a maximum for each range of pages**. With `user_id` in a random order every range holds almost every value, so no range can be excluded. The recording of the shuffled table: correlation **' + BR.correlation_shuffled + '**, and the planner chose a **sequential scan**. For an equality lookup on such a column a **btree** is the right index.',
        fix: 'CREATE INDEX events_user_idx ON events (user_id);\n\nSELECT count(*) FROM events WHERE user_id = 12345;\n',
        cheer: 'BRIN for order, btree for the rest.'
      }),

      B.quiz({
        id: 'm5-q1', t: 1,
        q: 'An append-only table of a billion rows is filtered by day. Which index is the most space efficient?',
        opts: [
          { t: 'BRIN on the timestamp', fb: '' },
          { t: 'A btree on the timestamp', fb: 'It works, and it is hundreds of times bigger: ' + BR.btree_mb + ' MB against ' + BR.brin_kb + ' kB in the recording.' },
          { t: 'GIN on the timestamp', fb: 'GIN is for values that contain many items, such as JSON and arrays.' },
          { t: 'A hash index on the timestamp', fb: 'It cannot answer a range.' }
        ],
        ok: 0, why: 'The recording: ' + BR.brin_kb + ' kB against ' + BR.btree_mb + ' MB, **' + n(BR.btree_over_brin) + ' times** smaller, with a correlation of ' + BR.correlation_in_order + '.'
      }),

      B.quiz({
        id: 'm5-q2', t: 1,
        q: 'A partial index was created `WHERE kind = \'purchase\'`. Which query can use it?',
        opts: [
          { t: '`WHERE kind = \'purchase\' AND user_id = 7`', fb: '' },
          { t: '`WHERE user_id = 7`', fb: 'The condition is missing, so the index does not cover every row that the query needs.' },
          { t: '`WHERE kind = \'click\' AND user_id = 7`', fb: 'The index does not hold clicks.' },
          { t: 'Any query on the table', fb: 'Only a query that implies the condition of the index.' }
        ],
        ok: 0, why: 'The partial index held only ' + n(PA.purchases) + ' rows and was ' + PA.partial_kb + ' kB. The query that repeated the condition used it.'
      }),

      B.quiz({
        id: 'm5-q3', t: 2,
        q: 'A covering index exists, and right after a bulk load the planner does not choose an index-only scan. What is missing?',
        opts: [
          { t: 'A `VACUUM`, to mark the pages as all-visible', fb: '' },
          { t: 'A bigger `work_mem`', fb: 'Memory is not the reason.' },
          { t: 'An `ANALYZE`', fb: 'Statistics are fine. The planner knows that it would have to visit every row in the table.' },
          { t: 'A second copy of the index', fb: 'One index is enough.' }
        ],
        ok: 0, why: 'The recording: **' + IO.all_visible_pages_before + '** pages marked before the vacuum and **' + n(IO.all_visible_pages_after) + '** of ' + n(IO.pages) + ' after, and the plan changed to an Index Only Scan with ' + IO.heap_fetches_after + ' heap fetches.'
      }),

      B.quiz({
        id: 'm5-q4', t: 2,
        q: 'A plan expects 76 rows and finds 333. What is the first thing to try?',
        opts: [
          { t: 'Check whether two filtered columns depend on each other, and create extended statistics', fb: '' },
          { t: 'Add an index on every column of the filter', fb: 'The estimate is wrong because of the statistics, and an index does not change the estimate.' },
          { t: 'Raise `max_connections`', fb: 'It has nothing to do with the plan.' },
          { t: 'Run `VACUUM FULL`', fb: 'It rewrites the table and does not change the estimate.' }
        ],
        ok: 0, why: 'The recording: the estimate was ' + ST.estimate_before + ' for ' + ST.actual + ' rows, and after `CREATE STATISTICS ... (mcv)` it was ' + ST.estimate_after + '.'
      }),

      B.order({
        id: 'm5-ord', t: 1, q: 'A query on a big table is slow. Put the steps in order.',
        items: [
          'Run `EXPLAIN (ANALYZE)` and read the plan from the inside out',
          'Compare **estimated rows** with **actual rows** at each step',
          'If they differ a lot, `ANALYZE` or add statistics, and run the plan again',
          'If the plan scans a big table for a few rows, check that the filter is in a form an index supports',
          'Create the index, check the plan, and check what it costs on writes'
        ],
        why: 'A wrong estimate makes every later choice wrong, so check it before you add an index. An index that the plan does not use only costs on writes.'
      }),

      B.decide({
        id: 'm5-dec', t: 2, src: 'docs', title: 'Decision: dashboards are slow, and the idea is to index every filter column',
        scenario: 'Five dashboards are slow on the events table. An engineer proposes one index for each column that appears in a filter, twelve in all. The table receives 50,000 inserts a minute.',
        opts: [
          { t: 'Read `pg_stat_statements` and the plans of the slow queries, and add the few indexes that the plans need', d: 'Each index has a reason and a measured gain. The write cost stays small.', lose: 'It takes an afternoon of reading plans, and each index needs a check after a few weeks.' },
          { t: 'Create the twelve indexes now', d: 'Quick, and it will probably help the dashboards.', lose: 'The recording: five extra indexes made an insert write **' + WC.five_over_none + ' times** the log. On a table with 50,000 inserts a minute that slows the load and fills the disk, and half of them will never be scanned.' },
          { t: 'One composite index that holds all twelve columns', d: 'A single index.', lose: 'A composite index serves queries that filter on its leading columns in order, and the others get little from it. It is wide, and it costs on every write.' }
        ],
        pick: 0,
        why: 'Indexes are bought with writes. The recording shows the price and the waste (' + US.never_used + ' of ' + US.listed + ' indexes never scanned). Start from the slow queries, and measure.',
        when: 'On a table that is read much more than it is written, a few extra indexes are cheap.'
      }),

      B.incident({
        id: 'm5-inc', t: 2, src: 'rec', title: 'Incident: loads got three times slower', time: '10:30',
        alert: '**The nightly load into the events table takes three times as long since last week**, and the log grows much faster. Nothing else changed except that a team added five indexes "to help the dashboards".',
        clues: ['`pg_stat_user_indexes` shows `idx_scan = 0` for four of the five new indexes', 'The log volume per night tripled', 'The dashboards that they were meant to help use the primary key'],
        opts: [
          { t: 'Drop the indexes that nobody scans, keep the one that a plan uses, and add an index only after a plan shows the need', fb: '' },
          { t: 'Add more memory to the server', fb: 'The writes would still be three times as large.' },
          { t: 'Add more indexes to speed up the load', fb: 'Indexes never speed up a load.' },
          { t: 'Switch off fsync during the load', fb: 'It risks corrupting the whole database to hide a problem that has a cheap fix.' }
        ],
        best: 0,
        why: 'The recording: an insert into a table with five extra indexes wrote **' + WC.five_over_none + ' times** the log of one with none, and **' + US.never_used + '** of the ' + US.listed + ' indexes that I listed had never been scanned.',
        checks: [
          ['Count the scans', '`idx_scan` in `pg_stat_user_indexes`, over a long enough period.'],
          ['Look at the plans', '`EXPLAIN` for each dashboard query, to see which index it needs.'],
          ['Drop what is unused', '`DROP INDEX CONCURRENTLY`, so that queries are not blocked.'],
          ['Measure the load again', 'The log per night should fall back.']
        ],
        tell: 'The team added indexes without checking the plans, and each insert paid for all of them. Most of them were never read. I dropped those with `DROP INDEX CONCURRENTLY` and kept the one that a plan uses. The load is back to its old time. Indexes now need a plan that shows the need.',
        prevent: ['Add an index only with a **plan** that shows the need', 'Review **`idx_scan = 0`** every month', 'Create and drop with **`CONCURRENTLY`**']
      }),

      B.qa({
        id: 'qa-explain', t: 1, tag: 'PostgreSQL', secs: 75,
        q: 'A query is slow. How do you find out why?',
        pts: ['EXPLAIN (ANALYZE) and read the plan inside out', 'Compare estimated and actual rows', 'Look for scans of big tables and for spills', 'Statistics first, then indexes'],
        short: 'I run `EXPLAIN (ANALYZE, BUFFERS)` and read the plan from the inside out, looking at where the rows and the time go. The most useful check is **estimated rows against actual rows** at each node: when the planner is wrong by a factor of 4 or more, every decision after that is suspect. In my recording a filter on two dependent columns was estimated at 76 rows and returned 333, and creating extended statistics moved the estimate to 293. If the estimates are fine, I look for a big table that is scanned for a few rows, and ask if the filter is in a form that an index supports: a function on the column, or `->>` on JSONB with only a GIN index, would not use it. Then I check for a sort that spills to disk. I add an index last, and check what it costs on writes.',
        fu: [['What does ANALYZE do in EXPLAIN?', 'It runs the query and shows real rows and times. It really executes it, so use a transaction and a rollback for writes.'], ['What are buffers?', 'The pages that were found in memory and the ones that were read.']],
        trap: 'Adding an index before reading the plan.',
        real: 'Describe the slowest query you tuned, and what the plan showed.'
      }),

      B.qa({
        id: 'qa-brin', t: 2, tag: 'PostgreSQL', secs: 60,
        q: 'What is a BRIN index, and when do you use it?',
        pts: ['Stores the min and max of each range of pages', 'Tiny compared with a btree', 'Needs data in the order of the column', 'Check correlation in pg_stats'],
        short: 'A block range index stores the **minimum and maximum value for each range of pages** instead of an entry for each row. So it is tiny, and it can exclude the ranges that cannot hold the values you want. It works only if the column follows the **physical order** of the table, which is true for a timestamp in an append-only table of events or logs. In my recording on a million events the BRIN index was 24 kB and the btree 21.4 MB, about 900 times smaller, and the plan read the ranges that might match and rechecked the rows. On a copy of the table with the rows in a random order the correlation was about 0 and the planner ignored the index. So I check `correlation` in `pg_stats`, and use a btree for columns that are not in the file order.',
        fu: [['What is the cost?', 'Rows that the index lets through are rechecked. Lossy results mean some extra reads.'], ['Can it be rebuilt?', '`CLUSTER` restores order on a table, and a sorted load keeps it.']],
        trap: 'Using BRIN on a column in a random order.',
        real: 'Name a table where BRIN would save space.'
      }),

      B.qa({
        id: 'qa-partial', t: 2, tag: 'PostgreSQL', secs: 60,
        q: 'What is a partial index and when is it worth it?',
        pts: ['An index with a WHERE clause: only some rows are indexed', 'Much smaller and cheaper to maintain', 'The query must include the condition', 'Good for rare statuses'],
        short: 'It is an index with a `WHERE` clause, so only the rows that match are indexed. It is worth it when queries look for a **small, well-defined part** of a big table: open orders, unprocessed events, rows that are not soft-deleted. In my recording an index on `user_id` for the 1,000 purchases among a million events was 16 kB, against 7.4 MB for an index on every row, about 475 times smaller, and inserts of other rows did not touch it. The planner uses it only if the query **implies the condition**, so the query has to repeat it. A partial unique index can also enforce a rule on part of the table, such as one active subscription for each customer.',
        fu: [['Can it be unique?', 'Yes. A partial unique index is a common way to enforce a rule on a subset.'], ['Does it need a vacuum?', 'Like any index, it is cleaned by vacuum.']],
        trap: 'Writing the query without the condition.',
        real: 'Describe a status column that you indexed this way.'
      }),

      B.qa({
        id: 'qa-ios', t: 2, tag: 'PostgreSQL', secs: 60,
        q: 'Why does an index-only scan still read the table sometimes?',
        pts: ['The index does not know about visibility', 'The visibility map marks all-visible pages', 'Only vacuum sets it', 'Heap Fetches in EXPLAIN shows how often'],
        short: 'Because an index entry does not say whether the row version is **visible to the current snapshot**, so PostgreSQL has to check the table, unless the table page is marked **all-visible** in the **visibility map**. Only `VACUUM` sets those marks, and an update or a delete clears them for that page. `EXPLAIN (ANALYZE)` shows `Heap Fetches`: how many times the scan went to the table. In my recording, right after a bulk load no page was marked, and the planner did not even choose the index-only scan. After `VACUUM` all 14,286 pages were marked, the scan was chosen, and it had 0 heap fetches. So for covering indexes on a table that is loaded in bulk, I make sure that vacuum runs soon after the load, and I keep autovacuum healthy on tables that are updated.',
        fu: [['What is INCLUDE for?', 'It adds columns to the leaf pages without making them part of the key.'], ['Does it help writes?', 'No. A covering index is bigger and costs more on writes.']],
        trap: 'Expecting an index-only scan right after a load.',
        real: 'Say where Heap Fetches told you something.'
      }),

      B.qa({
        id: 'qa-jsonb', t: 2, tag: 'PostgreSQL', secs: 60,
        q: 'How do you index a JSONB column?',
        pts: ['GIN for containment and key tests', 'jsonb_path_ops is smaller and supports @>', '->> needs a btree on the expression', 'Check the plan'],
        short: 'It depends on the query. For **containment**, `payload @> \'{"country": "DE"}\'`, and for key existence tests, I use a **GIN** index, and `jsonb_path_ops` makes it smaller and faster for containment only. For a query that reads one key with `->>`, such as `payload->>\'n\' = \'42\'`, GIN does not help, and I build a **btree on the expression** `((payload->>\'n\'))`, written the same way as in the query. In my recording the containment query used the GIN index of 5.4 MB, the `->>` query did a sequential scan of a million rows, and after the expression index it used that. If a few keys are queried all the time, I often move them to real columns, with a generated column or in the loader, because typed columns have statistics and constraints.',
        fu: [['What is the default GIN operator class?', '`jsonb_ops`, which also supports key existence. It is bigger.'], ['Why a real column?', 'The planner has statistics on columns, and almost none on a key inside JSON.']],
        trap: 'Creating a GIN index and using ->> in the query.',
        real: 'Name a JSON key that you moved to a column.'
      }),

      B.qa({
        id: 'qa-stats', t: 2, tag: 'PostgreSQL', secs: 60,
        q: 'The planner estimates 76 rows and gets 333. What do you do?',
        pts: ['The statistics do not match the data', 'ANALYZE and a higher statistics target', 'Extended statistics for dependent columns', 'Check again in the plan'],
        short: 'I first run `ANALYZE`, in case the statistics are stale, for example right after a big load. If the estimate is still wrong, the planner is probably missing something about the data. For one column with a skewed distribution I raise the statistics target of that column. For **two columns that depend on each other** I create **extended statistics**, such as `CREATE STATISTICS ... (mcv) ON status, store_id`, because by default the planner multiplies the selectivities as if the columns were independent. In my recording open orders came from three of twelve stores, the estimate was 76 against 333 real rows, and after the statistics and an ANALYZE it was 293. In a single-table filter that changes little, but in a join a wrong estimate picks the wrong join order and can turn seconds into minutes, so it is the first thing I check in a slow plan.',
        fu: [['What kinds exist?', '`dependencies`, `ndistinct` and `mcv`. From documentation, I ran mcv.'], ['Is it automatic?', 'No. You create the statistics object, and ANALYZE fills it.']],
        trap: 'Adding indexes to fix a wrong estimate.',
        real: 'Describe a query that was fixed by statistics.'
      }),

      B.qa({
        id: 'qa-indexcost', t: 1, tag: 'PostgreSQL', secs: 60,
        q: 'What does an index cost, and how many is too many?',
        pts: ['Every index is updated on every insert, update of its columns and delete', 'More log, more disk, slower vacuum', 'Unused indexes are pure cost', 'Check pg_stat_user_indexes'],
        short: 'An index is a second copy of some columns that must be kept in step with the table. Every insert writes an entry in every index, an update of an indexed column cannot be HOT, and the log, the disk and vacuum all grow with the number of indexes. In my recording the same 50,000 inserts wrote 8.5 MB of log with only the primary key, 15.1 MB with two more indexes and 26.7 MB with five more, three times as much. And six of twelve indexes that I listed had never been scanned. So there is no fixed number: an index is justified by a plan that uses it. I review `idx_scan = 0` in `pg_stat_user_indexes` over a period that includes the month-end, and drop what nobody reads, with `DROP INDEX CONCURRENTLY`.',
        fu: [['Do unique indexes count?', 'Yes, but they also enforce a rule, so do not drop them for being unused.'], ['How do you add one safely?', '`CREATE INDEX CONCURRENTLY`, which does not block writes.']],
        trap: 'Believing that more indexes are always better.',
        real: 'Say how many indexes your largest table has, and why.'
      }),

      B.recap({
        id: 'm5-recap', n: 5, badge: 'Index Chooser', color: '#DDD6FE',
        pts: [
          '**BRIN** was ' + BR.brin_kb + ' kB against ' + BR.btree_mb + ' MB for a btree, with correlation ' + BR.correlation_in_order + '. On shuffled rows (' + BR.correlation_shuffled + ') the planner ignored it.',
          'A **partial** index was ' + PA.partial_kb + ' kB against ' + PA.full_mb + ' MB, and the query must repeat its condition.',
          'An **index-only scan** needed `VACUUM`: ' + IO.all_visible_pages_before + ' pages marked before, ' + n(IO.all_visible_pages_after) + ' after.',
          '**GIN** answers `@>`. `->>` needs a btree on the expression.',
          'Estimate ' + ST.estimate_before + ' against ' + ST.actual + ' rows: fix it with **extended statistics**. Five indexes wrote **' + WC.five_over_none + ' times** the log.'
        ],
        lines: [
          'I read estimated against actual rows first.',
          'I choose an index from a plan.',
          'I drop the indexes that nobody reads.'
        ]
      })
    ]
  });
})();
