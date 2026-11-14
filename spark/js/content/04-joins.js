/* Mission 4: joins. The join strategies and which one Spark picks, hints and the broadcast threshold, adaptive execution changing a join at run time, a filter that moves below
   a join, and what a join does to the number of rows. Plans and counts are from a real Spark 4.0.1 in local mode. */
(function () {
  var B = LAB.b, G = LAB.get;
  var ST = G.table('joins.strategies'), C = G.counts('joins.counts'), PD = G.text('joins.pushdown');
  var DEF = G.table('conf.defaults');
  var PY = G.file('code/joins.py');
  var SCEN = G.lines(PY, G.at(PY, /^def scenarios/), G.at(PY, /return out/));
  var CNT = (function (r) { return G.lines(PY, r[0], r[1]); })(G.span(PY, /^def counts/, /^    \}$/));
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  var thr = DEF.rows.filter(function (r) { return r[0] === 'spark.sql.autoBroadcastJoinThreshold'; })[0][1];
  var strat = function (label) { var r = ST.rows.filter(function (x) { return x[0] === label; })[0]; if (!r) throw new Error('no join situation ' + label); return r; };
  var CROWS = [['orders, no join', n0(C.orders)], ['inner join to stores', n0(C.inner_to_stores)], ['inner join to stores, each store listed twice', n0(C.inner_to_stores_listed_twice)], ['inner join to customers', n0(C.inner_to_customers)], ['left join to customers', n0(C.left_to_customers)], ['null-safe join to customers plus one NULL row', n0(C.null_safe_to_a_null_row)]];
  var SROWS = [['customers', n0(C.customers)], ['left_semi join: have an order', n0(C.customers_with_orders_semi)], ['left_anti join: no order', n0(C.customers_without_orders_anti)], ['`NOT EXISTS` subquery: no order', n0(C.not_exists_customers_without_orders)], ['`NOT IN` subquery: no order', n0(C.not_in_customers_without_orders)]];
  G.expect(thr === '10485760b', 'the broadcast threshold of Spark 4.0.1 is 10 MiB');
  G.expect(strat('stores is small: the default')[1] === 'BroadcastHashJoin' && strat('broadcast turned off')[1] === 'SortMergeJoin' && strat('hint: shuffle_hash on stores')[1] === 'ShuffledHashJoin', 'the join strategies of the recording');
  G.expect(C.inner_to_stores === C.orders && C.inner_to_stores_listed_twice === 2 * C.orders && C.inner_to_customers + C.orders_without_customer_id === C.orders, 'the row counts of the join lessons');
  G.expect(C.not_in_customers_without_orders === 0 && C.not_exists_customers_without_orders === C.customers_without_orders_anti, 'NOT IN returns nothing when the other side has NULLs');

  LAB.addChapter({
    id: 'm4', n: 4, title: 'Joins', short: 'Joins', blurb: 'Broadcast, sort-merge and the rest, hints, the row-count traps, and NOT IN', minutes: 58,
    focus: ['air', 'stg'],
    goals: [
      'Name the join **strategies** (broadcast hash, sort-merge, shuffled hash, nested loop) and say when Spark picks each.',
      'Say what the **broadcast threshold** is, and what can go wrong when a table is not as small as you think.',
      'Use a **hint** to ask for a strategy, and know that it can be ignored.',
      'Explain how **adaptive execution** can turn a sort-merge join into a broadcast join at run time.',
      'Predict what a join does to the **number of rows**: repeated keys, missing keys, NULL keys.',
      'Choose between **NOT IN, NOT EXISTS and an anti join**, and say why `NOT IN` can return nothing.'
    ],
    say: 'Mission 4 is about joins, the other half of most tuning stories. A join has two questions in it: how does Spark bring matching rows together, and what does the join do to the number of rows. The first decides the cost. The second decides whether the answer is right. I planned the same join six ways and read what Spark chose. Then I ran the row-count traps on the Brewline data, where about one order in four has no customer.',
    scenes: [
      B.talk({
        id: 'm4-types', t: 1, src: 'docs', title: 'Join types and join strategies are two different things',
        say: 'There are two separate choices. The **type** is what you ask for, and it decides which rows come out. The **strategy** is how Spark does it, and it decides the cost. Press Next for each.',
        items: [
          ['Join types', '`inner` keeps rows that match on both sides. `left` keeps all rows of the left side, with NULLs where the right has no match. `right` and `full` are the mirror and the union of those. `left_semi` keeps the left rows that **have** a match, without adding columns. `left_anti` keeps the left rows that **have no** match. `cross` pairs every row with every row.', 'The type decides the rows.'],
          ['Broadcast hash join', 'Spark copies the **small** table to every executor, builds a hash table, and each task looks up its own rows of the big table. The big table is **not shuffled**. This is the cheapest join, if the small side really is small.', 'Copy the small side everywhere.'],
          ['Sort-merge join', 'Both sides are **shuffled** by the join key and **sorted** inside each partition, and then merged like two sorted lists. It works for any size, and it is the safe default for two large tables.', 'Shuffle and sort both sides.'],
          ['Shuffled hash join', 'Both sides are shuffled, but the smaller side of each partition is put in a hash table, so there is no sort. It is faster than sort-merge when one side is much smaller, but it needs that hash table to fit in memory.', 'Shuffle both, hash one.'],
          ['Nested loop and cartesian', 'When there is **no equality** in the condition (a range, an inequality), there is nothing to hash or sort by. Spark compares rows pairwise: a broadcast nested loop join if one side is small, a cartesian product if both are large. Both are slow.', 'No equality, no shortcut.']
        ],
        cols: 1
      }),

      B.flow({
        id: 'm4-flow', t: 1, src: 'docs', title: 'Three ways to join', g: 'joins', legend: true,
        steps: [
          { say: 'Here are three lanes of the same job: the orders joined to something. Press Next to walk down them.', cap: 'Three lanes.' },
          { say: 'Lane 1. The orders and the **stores**, twelve rows. Spark broadcasts the small table. A copy goes to every executor, and the orders never move. There is no shuffle of the big table at all.', on: ['ja1', 'ja2'], focus: ['ja_in', 'ja_bc', 'ja_hj'], tags: ['tg_thr'], cap: 'The small side travels.' },
          { say: 'Each task builds a hash table of the stores and looks up the store of every order in its own partition. The result is the joined rows, with the big side exactly where it was.', on: ['ja3'], focus: ['ja_hj', 'ja_out'], cap: 'A hash lookup inside each task.' },
          { say: 'Lane 2. The orders and the **customers**, five thousand rows here and many millions in a real company. Too big to copy. Both sides are shuffled by `customer_id`, so that matching rows land in the same partition.', on: ['jb1', 'jb2'], focus: ['jb_in', 'jb_sh', 'jb_sort'], tags: ['tg_big'], cap: 'Both sides cross the network.' },
          { say: 'Inside each partition both sides are sorted, and Spark walks down the two lists together. That is the sort-merge join. It never needs a whole table in memory, which is why it is the safe choice for big joins.', on: ['jb3'], focus: ['jb_sort', 'jb_out'], cap: 'Sort, then merge.' },
          { say: 'Lane 3. If the two tables were **written bucketed** by the same key into the same number of buckets, the matching rows are already in matching files. Spark can join them with no exchange. The price is paid once, when the tables are written. Mission 7 records it.', on: ['jc1', 'jc2', 'jc3'], focus: ['jc_in', 'jc_no', 'jc_sort', 'jc_out'], tags: ['tg_buck'], cap: 'Bucketing moves the shuffle to write time.' }
        ]
      }),

      B.widget({ id: 'm4-lab', kind: 'joinpick', t: 1, src: 'rec', title: 'Lab: which join did Spark pick?' }),

      B.rows({
        id: 'm4-strat', t: 1, src: 'rec', title: 'Six situations, one query shape',
        steps: [
          {
            say: 'The same orders joined to a small table, planned six ways. I read the join that Spark chose, and counted the exchanges and broadcasts in the plan. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'The join that Spark chose', c: 'raw', cols: ST.cols, rows: ST.rows, trk: 0 }],
            notes: ['Recorded: `explain()` of each join on Spark 4.0.1, with adaptive execution switched off so that the plan shows the first choice.']
          },
          {
            say: 'The default: the stores table is tiny, far below the threshold of **10 MiB**, so Spark chose **' + strat('stores is small: the default')[1] + '** with **' + strat('stores is small: the default')[2] + '** exchanges. Nobody asked for it.',
            tabs: [{ layer: 'RECORDED', name: 'The join that Spark chose', c: 'raw', cols: ST.cols, rows: ST.rows, trk: 0, chg: [[0, 1]] }],
            notes: ['The size comes from file statistics, so it needs no `ANALYZE TABLE` for a file source. For a table with no size information Spark assumes it is huge and does not broadcast.']
          },
          {
            say: 'With the threshold set to -1 (broadcasting off) the same query becomes a **' + strat('broadcast turned off')[1] + '** with **' + strat('broadcast turned off')[2] + '** exchanges and two sorts. Same query, same data, a far more expensive plan.',
            tabs: [{ layer: 'RECORDED', name: 'The join that Spark chose', c: 'raw', cols: ST.cols, rows: ST.rows, trk: 1, chg: [[1, 1], [1, 2]] }],
            notes: ['This is what you get when someone sets `spark.sql.autoBroadcastJoinThreshold` to -1 "to be safe" and forgets it.']
          },
          {
            say: 'A **hint** asks for a strategy. `broadcast(stores)` gives the broadcast join even with the threshold off. `shuffle_hash` gives a **' + strat('hint: shuffle_hash on stores')[1] + '**: two exchanges and no sort.',
            tabs: [{ layer: 'RECORDED', name: 'The join that Spark chose', c: 'raw', cols: ST.cols, rows: ST.rows, trk: 3, chg: [[2, 1], [3, 1]] }],
            notes: ['Hints are requests. Spark ignores one that cannot be done, for example a broadcast of a side that is on the wrong side of an outer join.']
          },
          {
            say: 'The last two rows have **no equality**: the join says `total_cents >= min_cents`. There is nothing to hash or sort by, so Spark picks a **' + strat('a range condition, not equality')[1] + '**: it compares every row with every row of the small tiers table. It works because the tiers table is tiny. Make it big and the query never finishes.',
            tabs: [{ layer: 'RECORDED', name: 'The join that Spark chose', c: 'raw', cols: ST.cols, rows: ST.rows, trk: 4, chg: [[4, 1], [5, 1]] }],
            notes: ['A range join between two big tables is one of the slowest things you can ask Spark to do. Bucket the range (an `hour` column, a `tier` column) and join on equality plus the range.']
          }
        ]
      }),

      B.code({
        id: 'm4-code', t: 2, src: 'rec', title: 'How the six plans were made', file: 'joins.py', lang: 'python', code: SCEN,
        steps: [
          { say: 'This is the function that made the six plans. Press Next.', lines: null },
          { say: 'Adaptive execution is off for the first choices, because with it on the plan is only a first guess. Then the default: a plain join on `store_id`, with no hint.', lines: G.span(SCEN, /adaptive\.enabled', 'false'/, /stores is small: the default/) },
          { say: 'The threshold is set to **-1**, which turns automatic broadcasting off. The same join is planned again: now a sort-merge join.', lines: G.span(SCEN, /autoBroadcastJoinThreshold', '-1'/, /broadcast turned off/) },
          { say: 'Two hints: `F.broadcast(s)` marks the stores to be broadcast, and `s.hint("shuffle_hash")` asks for a shuffled hash join. The SQL form is `/*+ BROADCAST(stores) */`.', lines: G.span(SCEN, /hint: broadcast/, /shuffle_hash on stores/) },
          { say: 'The last two joins use `>=` on two columns. There is no equality, so the strategy has to be a nested loop.', lines: G.span(SCEN, /a range condition, not equality/) }
        ],
        note: 'Recorded: the plan of each join, with `explain()` in simple mode. The settings are restored at the end of the function.'
      }),

      B.cmp({
        id: 'm4-hints', t: 2, src: 'docs', title: 'Join hints',
        say: 'Four hints, in the order of how much Spark trusts them. Press Next to read when to use each.',
        cols: ['Hint', 'Asks for', 'Use it when', 'The risk'],
        hl: 2,
        rows: [
          ['`BROADCAST` (also `BROADCASTJOIN`, `MAPJOIN`)', 'A broadcast hash join of the marked side', 'You know a table is small, and Spark cannot tell (no statistics, or a filter that cuts it a lot)', 'A table that is not small runs the driver or the executors out of memory'],
          ['`MERGE` (also `SHUFFLE_MERGE`)', 'A sort-merge join', 'Spark picks a shuffled hash join or a broadcast and it does not fit', 'Slower than a broadcast when a side is small'],
          ['`SHUFFLE_HASH`', 'A shuffled hash join, building the marked side', 'One side is much smaller than the other but too big to broadcast', 'The hash table of a partition must fit in memory'],
          ['`SHUFFLE_REPLICATE_NL`', 'A shuffle-and-replicate nested loop join', 'A non-equi join of two big tables, with no other way', 'It is a cartesian-like cost, so measure it']
        ],
        steps: [
          { upto: 2, say: 'The first two are the ones you will write. A broadcast to avoid a shuffle, a merge to avoid a hash table that does not fit.' },
          { upto: 4, say: 'The last two are for special cases. If you reach for them, say why in a comment.' }
        ],
        pick: 'When hints conflict, Spark uses the first it can: **broadcast, then merge, then shuffled hash, then nested loop**. Prefer fixing the statistics or the data over a hint that will be wrong in a year.'
      }),

      B.talk({
        id: 'm4-broadcast', t: 1, src: 'docs', title: 'The broadcast threshold, and how it fails',
        say: 'The broadcast join is the best join and the easiest to get wrong. Press Next for what to know.',
        items: [
          ['The number', 'A table is broadcast automatically when its size is below `spark.sql.autoBroadcastJoinThreshold`. The default in the recording is **' + n0(10485760) + ' bytes, 10 MiB**. Set it to -1 and nothing is broadcast without a hint.', '10 MiB by default.'],
          ['The size is an estimate', 'Spark uses the size from the file listing, or from the statistics of a table, **before** filters. A table of ten gigabytes filtered down to ten thousand rows is still "ten gigabytes" to the first plan. Adaptive execution can correct this at run time, because it has the real size after a stage.', 'The estimate is taken before the filter.'],
          ['What a broadcast does', 'The executors send the table to the **driver**, which holds it in memory and then sends a copy to every executor. A broadcast of a few hundred MB can run the driver out of memory, or hit `spark.sql.broadcastTimeout`, which is 300 seconds by default.', 'The driver holds the table first.'],
          ['Raising the threshold', 'A larger threshold, like 100 MB or 500 MB, is common on big clusters with big executors. It turns more joins into broadcasts, and each one costs memory on every executor. Raise it with a reason, and watch for out-of-memory errors.', 'Raise it with care.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'The symptom of a bad broadcast:', t: 'the driver is killed with an out-of-memory error, or the job fails with a broadcast timeout, in a stage that "used to work". The table grew past the point where a copy on every executor is cheap.' }
      }),

      B.rows({
        id: 'm4-aqe', t: 2, src: 'rec', title: 'Adaptive execution changes the join at run time',
        steps: [
          {
            say: 'I turned the planning-time threshold off, and set the **adaptive** threshold to 10 MiB. Then I joined the orders to the **gold** customers only, which is a filtered table. At planning time Spark could not know that the filter makes the table small. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'The join, planned and then executed', c: 'raw', cols: ['when', 'join in the plan'], rows: [['before the first stage ran', 'SortMergeJoin'], ['after the stage ran', 'BroadcastHashJoin']], trk: 0 }],
            notes: ['Recorded: `explain()` before and after `collect()`. The full plans are in the lab above.']
          },
          {
            say: 'The first plan was a **sort-merge join**, as the first lane of the picture. After the map side of the stage had run, Spark knew that the filtered customers were tiny, and **replaced the join with a broadcast join** for the rest of the query. The plan changed while the query was running.',
            tabs: [{ layer: 'RECORDED', name: 'The join, planned and then executed', c: 'raw', cols: ['when', 'join in the plan'], rows: [['before the first stage ran', 'SortMergeJoin'], ['after the stage ran', 'BroadcastHashJoin']], trk: 1, chg: [[1, 1]] }],
            notes: ['What it saves: the sort of both sides, and in some cases the second shuffle. What it cannot undo: the first shuffle, which already happened.']
          },
          {
            say: 'This is why a plan with `isFinalPlan=false` is only a guess. With adaptive execution, read the **final** plan in the SQL tab after the query has run, as well as the one that `explain()` printed before it.',
            tabs: [{ layer: 'RECORDED', name: 'What to read', c: 'raw', cols: ['plan', 'where', 'status'], rows: [['the first plan', '`df.explain()` before the action', 'a guess'], ['the final plan', 'the SQL tab, or `explain()` after the action', 'what ran']], trk: 1 }],
            notes: ['Settings: `spark.sql.adaptive.autoBroadcastJoinThreshold` is the threshold used by adaptive execution. It defaults to the value of the normal one.']
          }
        ]
      }),

      B.code({
        id: 'm4-push', t: 2, src: 'rec', title: 'A filter written after the join runs before it', file: 'optimized plan', lang: 'text', code: PD,
        steps: [
          { say: 'I joined the orders to the stores and then filtered on the **country**, a column of the stores table. Here is the optimized plan. Press Next.', lines: null },
          { say: 'The filter on `country = SG` is not above the join, where I wrote it. It sits **under the join, on the stores side**. Spark moved it down, so the join sees only the Singapore stores.', lines: G.span(PD, /country#\d+ = SG/) },
          { say: 'The orders side only has an `isnotnull(store_id)` filter. An inner join drops the rows with a NULL key anyway, so Spark added the check below the join, and the scan can skip those rows early.', lines: G.span(PD, /Filter isnotnull\(store_id#1\)/) },
          { say: 'The join itself says `Join Inner, (store_id = store_id)`. Everything the optimiser could do before the join was done before it.', lines: G.span(PD, /Join Inner/) }
        ],
        note: 'This works for an inner join. For an outer join a filter on the nullable side cannot always be moved, because it would change the result. That is a good reason to filter before joining and not rely on the optimiser.'
      }),

      B.rows({
        id: 'm4-counts', t: 1, src: 'rec', title: 'What a join does to the number of rows',
        steps: [
          {
            say: 'A join changes the number of rows, and that is where silent bugs live. I joined the 400,000 Brewline orders to three tables, and counted the rows that came out. Store s01 and the guests with no customer id are in this data on purpose. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Rows after each join', c: 'raw', cols: ['join', 'rows out'], rows: CROWS, trk: 0 }],
            notes: ['Recorded: `count()` of each join on Spark 4.0.1.']
          },
          {
            say: 'The inner join to the stores keeps **' + n0(C.inner_to_stores) + '** rows: every order has exactly one store. Now the stores table listed each store **twice**, which is what a duplicated row in a dimension looks like. The same join returns **' + n0(C.inner_to_stores_listed_twice) + '** rows. Every order is counted twice, and revenue doubles.',
            tabs: [{ layer: 'RECORDED', name: 'Rows after each join', c: 'raw', cols: ['join', 'rows out'], rows: CROWS, trk: 2, chg: [[2, 1]] }],
            notes: ['A join on a key that is not unique on the dimension side multiplies the fact rows. Count before and after, and test that the dimension key is unique.']
          },
          {
            say: 'The inner join to the customers keeps **' + n0(C.inner_to_customers) + '** orders: it **drops the ' + n0(C.orders_without_customer_id) + '** guest orders that have no customer id, because NULL never equals anything. The left join keeps all **' + n0(C.left_to_customers) + '**, with NULLs for the guests.',
            tabs: [{ layer: 'RECORDED', name: 'Rows after each join', c: 'raw', cols: ['join', 'rows out'], rows: CROWS, trk: 3, chg: [[3, 1], [4, 1]] }],
            notes: ['A report that inner joins orders to customers silently leaves out a quarter of the revenue. This is the most common wrong number in a Spark pipeline.']
          },
          {
            say: 'The last row uses a **null-safe** equality, `eqNullSafe` in Python or `<=>` in SQL. It says that NULL equals NULL. With a NULL row added to the customers, all **' + n0(C.null_safe_to_a_null_row) + '** orders match. Use it on purpose, for example when NULL means "unknown, same as unknown" in a key. Never by accident.',
            tabs: [{ layer: 'RECORDED', name: 'Rows after each join', c: 'raw', cols: ['join', 'rows out'], rows: CROWS, trk: 5, chg: [[5, 1]] }],
            notes: ['In a normal `=` join, NULL keys never match, even each other.']
          }
        ]
      }),

      B.code({
        id: 'm4-counts-code', t: 2, src: 'rec', title: 'The code of those counts', file: 'joins.py', lang: 'python', code: CNT,
        steps: [
          { say: 'The counts come from one function. Press Next to find the lines.', lines: null },
          { say: '`stores_twice = s.union(s)` is the duplicated dimension. `one_null` is a customer row with a NULL id, added to make the null-safe join visible.', lines: G.span(CNT, /stores_twice = /, /c_with_null = /) },
          { say: 'The inner and left joins, with the plain `customer_id` key. `eqNullSafe` is the null-safe version.', lines: G.span(CNT, /'inner_to_stores'/, /'null_safe_to_a_null_row'/) },
          { say: '`left_semi` keeps the customers that have an order, and `left_anti` keeps the ones that do not. Neither adds columns from the other table.', lines: G.span(CNT, /left_semi/, /left_anti/) },
          { say: 'The last two lines ask the same question in SQL, two ways. The next screens show what they answered.', lines: G.span(CNT, /not_in_customers/, /not_exists_customers/) }
        ],
        note: 'Recorded: all of these ran on the same session, on the Brewline orders, customers and stores.'
      }),

      B.rows({
        id: 'm4-semi', t: 1, src: 'rec', title: 'Semi, anti, NOT IN and NOT EXISTS',
        steps: [
          {
            say: 'Which customers have never ordered? There are ' + n0(C.customers) + ' customers. I asked four ways. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Customers with and without orders', c: 'raw', cols: ['question', 'rows'], rows: SROWS, trk: 0 }],
            notes: ['Recorded: the anti join and `NOT EXISTS` agree. `NOT IN` does not.']
          },
          {
            say: 'The semi join returns **' + n0(C.customers_with_orders_semi) + '** and the anti join **' + n0(C.customers_without_orders_anti) + '**: together, all ' + n0(C.customers) + '. `NOT EXISTS` agrees with the anti join: **' + n0(C.not_exists_customers_without_orders) + '**.',
            tabs: [{ layer: 'RECORDED', name: 'Customers with and without orders', c: 'raw', cols: ['question', 'rows'], rows: SROWS, trk: 2, chg: [[1, 1], [2, 1], [3, 1]] }],
            notes: ['A semi or anti join is the clean way to ask "has" or "has not". It never multiplies rows.']
          },
          {
            say: '`NOT IN` returned **' + n0(C.not_in_customers_without_orders) + '**. The orders table has ' + n0(C.orders_without_customer_id) + ' rows with a NULL `customer_id`. In SQL, `x NOT IN (1, 2, NULL)` is never true: it is unknown for any x not in (1, 2), because x might equal the NULL. So **one NULL in the list empties the whole result**.',
            tabs: [{ layer: 'RECORDED', name: 'Customers with and without orders', c: 'raw', cols: ['question', 'rows'], rows: SROWS, trk: 4, chg: [[4, 1]] }],
            notes: ['The query ran without an error and returned a wrong answer. This one has ended many interviews and a few dashboards.']
          }
        ]
      }),

      B.decide({
        id: 'm4-dec', t: 2, src: 'docs', title: 'Decision: the orders and a customer table of 300 MB',
        scenario: 'Brewline has 2 billion orders and a customers table of 5 million rows, about 300 MB in Parquet. A report joins them on `customer_id` and needs only the customers of the gold tier, which are 2 percent. The cluster has 200 cores and 16 GB executors. You choose the join.',
        opts: [
          { t: 'Raise the broadcast threshold to 500 MB so that the whole customer table is broadcast', d: 'A broadcast join, no shuffle of the orders.', lose: 'The 300 MB table is collected on the driver and copied to every executor, for all the customers when only 2 percent are needed.' },
          { t: 'Filter the customers to gold first, select only the columns you need, and let Spark broadcast the small result (adaptive execution can do it at run time)', d: 'The filtered table is a few MB.', lose: '' },
          { t: 'Leave it as a sort-merge join of the full tables', d: 'It always works.', lose: 'It works, and shuffles and sorts two billion orders for no reason when the filtered side is small.' }
        ],
        pick: 1,
        why: 'Shrink the small side before you join. A filter and a column list can turn a 300 MB table into a few MB, and then a broadcast is cheap. Adaptive execution can finish the job at run time if the first plan did not see it.',
        when: 'If the gold tier were half the customers, nothing would be small, and the sort-merge join with adaptive skew handling is the right plan.'
      }),

      B.bug({
        id: 'm4-bug', t: 1, q: 'This query should list the customers who never ordered. In the recording it returned nothing at all. Click the line that causes it.',
        file: 'never_ordered.sql', lang: 'sql',
        code: ['SELECT c.customer_id', 'FROM customers c', 'WHERE c.customer_id NOT IN (SELECT o.customer_id FROM orders o)'].join('\n'),
        bad: [3],
        hint: 'Does the orders table have NULL customer ids?',
        why: 'About a quarter of the orders are guests with a NULL `customer_id`. One NULL in the list makes `NOT IN` unknown for every customer, so no row passes. In the recording this form returned **' + n0(C.not_in_customers_without_orders) + '**, and `NOT EXISTS` returned **' + n0(C.not_exists_customers_without_orders) + '**.',
        fix: ['SELECT c.customer_id', 'FROM customers c', 'WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id)'].join('\n'),
        cheer: 'Use NOT EXISTS or a left anti join. Never NOT IN on a column that can be NULL.'
      }),

      B.incident({
        id: 'm4-inc', t: 1, src: 'rec', title: 'Incident: revenue doubled overnight', time: '08:05',
        alert: '**The finance dashboard shows revenue twice as high as yesterday for every store.** Nobody sold twice as much. The job that builds the table ran without errors.',
        clues: ['The order count in the report is exactly twice the order count of the source', 'The stores table was reloaded last night by another team', 'The job joins the orders to the stores on store_id'],
        opts: [
          { t: 'Count the rows of the stores table by store_id: a store listed twice multiplies its orders. Remove the duplicates, and add a uniqueness check on the dimension', fb: '' },
          { t: 'Divide the revenue by two in the report', fb: 'It hides the bug and breaks the day the duplicate is fixed.' },
          { t: 'Switch the join to a sort-merge join', fb: 'The strategy does not change the rows. The type and the keys do.' },
          { t: 'Add distinct to the final aggregate', fb: 'It would remove real repeated orders as well.' }
        ],
        best: 0,
        why: 'An exact factor of two is the signature of a key that is repeated once on the dimension side. In the recording, listing each store twice took the join from ' + n0(C.inner_to_stores) + ' to ' + n0(C.inner_to_stores_listed_twice) + ' rows.',
        checks: [
          ['Compare counts', 'Rows of the source against rows after the join. A factor is a clue.'],
          ['Look at the dimension', '`GROUP BY store_id HAVING COUNT(*) > 1` on the stores table.'],
          ['Fix it', 'Remove the duplicate, or take the latest row of each key with a window function before the join.'],
          ['Guard', 'A test that the dimension key is unique, and that the join keeps the row count of the fact table.']
        ],
        tell: 'Revenue doubled because the stores table had each store twice after a reload. The join multiplied every order by two. I removed the duplicates, and added a uniqueness test on the dimension and a row-count check after the join.',
        prevent: ['A uniqueness test on every dimension key', 'Compare the row count before and after each join', 'An alert when a metric changes by an exact factor']
      }),

      B.quiz({
        id: 'm4-q1', t: 1,
        q: 'The stores table is 12 rows and the orders table is large. With the defaults, which join does Spark use?',
        opts: [{ t: 'Sort-merge join', fb: 'That is the choice when the tables are both large, or when broadcasting is off.' }, { t: 'Broadcast hash join', fb: '' }, { t: 'Cartesian product', fb: 'There is an equality, so no.' }, { t: 'Nested loop', fb: 'That is for joins without equality.' }],
        ok: 1,
        why: 'The small table is far below the 10 MiB threshold, so Spark copies it to every executor. In the recording the plan had ' + strat('stores is small: the default')[2] + ' exchanges.'
      }),

      B.quiz({
        id: 'm4-q2', t: 1,
        q: 'A join returns exactly twice the rows of the fact table. What is the most likely cause?',
        opts: [{ t: 'The join strategy is wrong', fb: 'A strategy changes the cost, not the rows.' }, { t: 'The key is repeated once on the other side', fb: '' }, { t: 'NULL keys', fb: 'NULL keys drop rows in an inner join, they do not add them.' }, { t: 'Adaptive execution', fb: 'It never changes the answer.' }],
        ok: 1,
        why: 'Each fact row matched two dimension rows. In the recording, listing the stores twice took ' + n0(C.inner_to_stores) + ' rows to ' + n0(C.inner_to_stores_listed_twice) + '.'
      }),

      B.quiz({
        id: 'm4-q3', t: 1,
        q: 'You inner join orders to customers, and the total is a quarter lower than the sum of the orders. Why?',
        opts: [{ t: 'Spark rounds down', fb: 'No.' }, { t: 'Guest orders have a NULL customer id, and NULL never matches in an equality join', fb: '' }, { t: 'The join was a broadcast', fb: 'The strategy does not change the rows.' }, { t: 'The customers table is sorted', fb: 'Order does not matter to a join.' }],
        ok: 1,
        why: 'The inner join kept ' + n0(C.inner_to_customers) + ' of ' + n0(C.orders) + ' orders. A left join keeps all ' + n0(C.left_to_customers) + '.'
      }),

      B.quiz({
        id: 'm4-q4', t: 2,
        q: 'Which join type returns only the left rows that have no match, and adds no columns from the right?',
        opts: [{ t: '`left`', fb: 'It returns all left rows, with NULLs.' }, { t: '`left_anti`', fb: '' }, { t: '`left_semi`', fb: 'That returns the left rows that DO have a match.' }, { t: '`cross`', fb: 'It pairs every row with every row.' }],
        ok: 1,
        why: 'The anti join found ' + n0(C.customers_without_orders_anti) + ' customers with no order, and the semi join ' + n0(C.customers_with_orders_semi) + ' with orders.'
      }),

      B.quiz({
        id: 'm4-q5', t: 2,
        q: 'A join condition is `o.total_cents >= t.min_cents`, and both tables are huge. What will Spark do?',
        opts: [{ t: 'Use a broadcast hash join', fb: 'A hash join needs equality.' }, { t: 'Use a sort-merge join', fb: 'It also needs an equality on the key.' }, { t: 'Fall back to a nested loop or cartesian product, which is very slow', fb: '' }, { t: 'Refuse to run', fb: 'It runs, which is the problem.' }],
        ok: 2,
        why: 'Without an equality there is nothing to hash or sort by. In the recording, even with a tiny table the plan was a ' + strat('a range condition, not equality')[1] + '. Add an equality on a bucket column to make it tractable.'
      }),

      B.order({
        id: 'm4-ord', t: 2, q: 'Put the steps of a sort-merge join in order.',
        items: [
          'Both inputs are read',
          'Each row is sent to a partition by the hash of its join key',
          'Inside each partition, both sides are sorted by the key',
          'Spark walks down both sorted lists and pairs equal keys',
          'The joined rows leave the stage'
        ],
        why: 'Shuffle first, so that matching keys sit together. Sort second, so that a merge is possible. The merge needs only a small buffer, which is why this join works for any size.'
      }),

      B.qa({
        id: 'qa-joins', t: 1, tag: 'Joins', secs: 90,
        q: 'What join strategies does Spark have, and how does it choose?',
        pts: ['Broadcast hash: small side copied, no shuffle of the big side', 'Sort-merge: shuffle and sort both sides, any size', 'Shuffled hash: shuffle both, hash the smaller', 'Nested loop and cartesian: no equality', 'Chosen by size estimate vs threshold, then hints, then defaults', 'Adaptive execution can change it at run time'],
        short: 'Spark has four strategies. A **broadcast hash join** copies the small table to every executor, so the big table is never shuffled. A **sort-merge join** shuffles and sorts both sides by the key, and works for any size. A **shuffled hash join** shuffles both and builds a hash table of the smaller side, with no sort. With no equality in the condition, it falls back to a **nested loop** or a cartesian product, which is slow. Spark chooses by the estimated size of each side against `autoBroadcastJoinThreshold`, which is 10 MiB, and by hints. Adaptive execution can change the choice after a stage ran, when it knows the real size. I check the plan for the name of the join.',
        fu: [['How do you force a broadcast?', 'A `BROADCAST` hint or `F.broadcast(df)`. Remember that Spark may ignore it, and that the table must really be small.'], ['What if the estimate is wrong?', 'A table that is filtered a lot is estimated before the filter. Adaptive execution fixes some of these. Otherwise, filter first, or hint.']],
        trap: 'Saying that Spark always uses a sort-merge join, or that a broadcast is always safe.',
        real: 'You have a big table and a medium table. Walk me through your join.'
      }),

      B.qa({
        id: 'qa-notin', t: 1, tag: 'Joins', secs: 60,
        q: 'What is the difference between NOT IN and NOT EXISTS, and what is a null-safe join?',
        pts: ['NOT IN is unknown if the list contains a NULL', 'One NULL empties the result', 'NOT EXISTS and left_anti ignore NULL', 'Equality never matches NULL', 'Null-safe equality: eqNullSafe or <=>', 'Recorded: 0 against 250'],
        short: 'In SQL, `x NOT IN (list)` becomes unknown if the list contains a NULL, because x might be equal to it. So **one NULL in the subquery makes the whole result empty**. In my test on the Brewline data, `NOT IN` returned zero customers, and `NOT EXISTS` and a left anti join returned 250, because a quarter of the orders have a NULL customer id. So I use `NOT EXISTS` or a `left_anti` join. In a normal join, `=` never matches NULL, not even NULL with NULL. To match them on purpose I use null-safe equality, `eqNullSafe` in the DataFrame API or `<=>` in SQL.',
        fu: [['What about IN?', '`x IN (list with NULL)` is true when x is in the list and unknown otherwise, so rows are filtered out correctly. The problem is the negation.'], ['How would you find this bug?', 'Count the rows of the result against a left anti join, and check the columns of a subquery for NULLs.']],
        trap: 'Saying that NOT IN and NOT EXISTS are the same.',
        real: 'Tell me about a wrong number that came from a NULL.'
      }),

      B.qa({
        id: 'qa-bigsmall', t: 2, tag: 'Joins', secs: 90,
        q: 'You join a very large table to a medium one and it is slow. What do you do?',
        pts: ['Read the plan: join type, exchanges, scan sizes', 'Shrink the medium side first: filter, select columns', 'Broadcast if it then fits', 'Check for skew in the join key', 'Adaptive execution on; skew join on', 'Bucketing or pre-partitioning if it repeats'],
        short: 'I start with the plan and the stage table: which join, how many exchanges, and whether one task is much bigger than the rest. Then I try to **shrink the medium side**: filter its rows and keep only the columns I need, because that can turn it into a table I can broadcast. If it still is not small, I keep the sort-merge join, make sure adaptive execution and its skew-join handling are on, and check whether one key is hot. If the same join runs every day on the same keys, I look at writing both tables bucketed by the key, which moves the shuffle to write time. I check the row count after the join, to be sure that I did not multiply rows.',
        fu: [['What if one key is very hot?', 'Adaptive skew-join handling splits the big partition. Salting does it by hand. Mission 5 covers both.'], ['When is a hint right?', 'When you know the size and Spark cannot, for example a table made small by a filter that the first plan does not see.']],
        trap: 'Adding more executors before reading the plan.',
        real: 'Describe a join that you made ten times faster.'
      }),

      B.recap({
        id: 'm4-recap', n: 4, badge: 'Join Chooser', color: '#BFDBFE',
        pts: [
          'The join **type** decides the rows. The **strategy** decides the cost.',
          '**Broadcast** below ' + n0(10485760) + ' bytes (10 MiB) by default: no shuffle of the big side. **Sort-merge**: shuffle and sort both. **Nested loop**: no equality.',
          'Turning broadcasting off made the same join a **' + strat('broadcast turned off')[1] + '** with **' + strat('broadcast turned off')[2] + '** exchanges.',
          '**Adaptive execution** can turn a sort-merge join into a broadcast join, because it sees the real size after a stage.',
          'Rows: a repeated key **doubled** the join (' + n0(C.inner_to_stores) + ' to ' + n0(C.inner_to_stores_listed_twice) + '). An inner join dropped **' + n0(C.orders_without_customer_id) + '** guests.',
          '`NOT IN` returned **' + n0(C.not_in_customers_without_orders) + '**. `NOT EXISTS` returned **' + n0(C.not_exists_customers_without_orders) + '**. Never use `NOT IN` on a column that can be NULL.'
        ],
        lines: [
          'I read the join name in the plan.',
          'I count rows before and after every join.',
          'I use NOT EXISTS, never NOT IN, on a column that can be NULL.'
        ]
      })
    ]
  });
})();
