/* Mission 2: Spark. Lazy plans, shuffles, joins, adaptive execution, skew. Plans, counts and tables are recorded from open-source Apache Spark. */
(function () {
  var B = LAB.b, G = LAB.get;

  var NARROW = G.text('plan.narrow'), WIDE = G.text('plan.groupby');
  var AQE_BEFORE = G.text('plan.aqe_before'), AQE_AFTER = G.text('plan.aqe_after');
  var UDF = G.text('plan.udf'), BUILTIN = G.text('plan.builtin'), CACHED = G.text('plan.cached');
  var LAZY = G.counts('spark.lazy'), PART = G.counts('spark.partitions'), DEF = G.counts('spark.defaults');
  var SH200 = G.counts('spark.shuffle_200').files, SH8 = G.counts('spark.shuffle_8').files, SHAQE = G.counts('spark.shuffle_200_aqe').files;
  var SZ = G.counts('spark.skew_partition_sizes'), TOP = G.table('spark.skew_top_keys');
  G.expect(LAZY.jobs_before === 0 && LAZY.jobs_after_transformations === 0 && LAZY.jobs_after_action === 1, 'a lazy plan starts no job and the action starts one');
  G.expect(PART.range_8 === 8 && PART.repartition_3 === 3 && PART.coalesce_2 === 2, 'partition counts after repartition and coalesce');
  G.expect(/BroadcastHashJoin/.test(G.text('plan.join_default')) && /SortMergeJoin/.test(G.text('plan.join_no_broadcast')) && /BroadcastHashJoin/.test(G.text('plan.join_hint_broadcast')), 'the join strategies');
  var SKEW_MAX = Math.max.apply(null, SZ.by_key), SKEW_AVG = SZ.by_key.reduce(function (a, b) { return a + b; }, 0) / SZ.by_key.length;
  var MB = function (b) { return Math.round(parseInt(b, 10) / 1048576); };
  G.expect(SH200 === 200 && SH8 === 8 && SHAQE === 1, 'a shuffle writes 200, 8 and 1 files');
  G.expect((SKEW_MAX / SKEW_AVG).toFixed(1) === '6.6', 'the biggest partition is 6.6 times the average');
  G.expect(MB(DEF['spark.sql.autoBroadcastJoinThreshold']) === 10 && DEF['spark.sql.adaptive.skewJoin.skewedPartitionFactor'] === '5.0' && MB(DEF['spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes']) === 256, 'the default broadcast and skew thresholds');
  G.expect(/SortMergeJoin\(skew=true\)/.test(G.text('plan.skew_on')) && /AQEShuffleRead coalesced/.test(AQE_AFTER), 'the adaptive plans show the skew split and the coalesce');

  var LAZYCODE = [
    'q = (orders',
    '     .filter("status <> \'CANCELLED\'")',
    '     .groupBy("customer_id")',
    '     .agg(F.sum("total_usd").alias("revenue")))',
    '',
    'q.collect()'
  ].join('\n');
  var NARROWCODE = [
    'shipped = (orders',
    '           .filter("status = \'SHIPPED\'")',
    '           .select("order_id", "total_usd"))',
    '',
    'shipped.explain()'
  ].join('\n');
  var WIDECODE = [
    'by_status = (orders',
    '             .groupBy("status")',
    '             .agg(F.count("*").alias("orders"),',
    '                  F.sum("total_usd").alias("revenue")))',
    '',
    'by_status.explain()'
  ].join('\n');
  var AQECODE = [
    'spark.conf.set("spark.sql.adaptive.enabled", "true")',
    '',
    'g = orders_big.groupBy("customer_id").agg(F.sum("qty").alias("units"))',
    'g.explain()        # before the query runs',
    'g.collect()',
    'g.explain()        # after it ran'
  ].join('\n');
  var SALTCODE = [
    '# 80 percent of the rows have the key K-0',
    'skew.repartition(8, "k")',
    '',
    'salted = skew.withColumn("salt", F.pmod(F.col("v"), F.lit(32)))',
    'salted.repartition(8, "k", "salt")'
  ].join('\n');
  var UDFCODE = [
    'py_lower = F.udf(lambda s: s.lower() if s else s, "string")',
    'orders.select(py_lower("status").alias("s")).explain()',
    '',
    'orders.select(F.lower("status").alias("s")).explain()'
  ].join('\n');
  var BOTHPLANS = '-- with a Python function --\n' + UDF + '\n\n-- with a built-in function --\n' + BUILTIN;
  var CACHECODE = [
    'cached = orders_big.filter("qty > 50").cache()',
    'cached.count()',
    'cached.groupBy("product_id").count().explain()',
    'cached.unpersist()'
  ].join('\n');

  var BUG = [
    'rows = orders_big.collect()',
    'total = 0',
    'for r in rows:',
    '    total += r["qty"]',
    'print(total)'
  ].join('\n');
  var BUGFIX = [
    'total = orders_big.agg(F.sum("qty")).first()[0]',
    'print(total)'
  ].join('\n');
  var BUG2 = [
    '@F.udf("string")',
    'def clean_status(s):',
    '    return s.strip().upper() if s else s',
    '',
    'clean = orders.withColumn("status", clean_status("status"))'
  ].join('\n');
  var BUG2FIX = 'clean = orders.withColumn("status", F.upper(F.trim("status")))';
  var CHSOL = [
    'from pyspark.sql import Window, functions as F',
    '',
    'w = Window.partitionBy("order_id").orderBy(F.col("_loaded_at").desc())',
    '',
    'latest = (orders',
    '          .withColumn("rn", F.row_number().over(w))',
    '          .filter("rn = 1")',
    '          .drop("rn"))'
  ].join('\n');

  LAB.addChapter({
    id: 'm2', n: 2, title: 'Spark: how a query runs', short: 'Spark', blurb: 'Lazy plans, shuffles, joins, adaptive execution and skew', minutes: 38,
    focus: ['air'],
    goals: [
      'Tell a **transformation** from an **action**, and say why nothing runs until an action.',
      'Read a **physical plan** from the bottom up and find the **shuffle**.',
      'Say what a **partition** and a **task** are, and what `repartition` and `coalesce` change.',
      'Read which **join** Spark chose and say how to change it.',
      'Explain **adaptive query execution** and recognise **skew**.',
      'Say why a Python function is slower than a built-in function.'
    ],
    say: 'Mission 2 is Spark itself. Databricks Runtime is built on Apache Spark, so everything here behaves the same on the platform. I ran the open-source Spark ' + G.meta('spark') + ' on one machine with the Brewline data and kept the plans, the counts and the tables. The plans are real output. The data is small, so I use a few settings to make the effects visible, and I say when I do.',
    scenes: [
      B.talk({
        id: 'm2-talk', t: 1, src: 'rec', title: 'Spark in six ideas',
        say: 'Six ideas explain most of what Spark does. Press Next for each.',
        items: [
          ['Driver and executors', 'Your program runs on the **driver**. The driver turns your code into a plan and sends tasks to **executors**, which are processes on the worker machines. Executors read the data, compute, and write the results.', 'One planner, many workers.'],
          ['Partitions and tasks', 'Spark splits data into **partitions**. One **task** processes one partition. With 8 partitions and 8 free cores, 8 tasks run at the same moment.', 'A partition is the unit of parallel work.'],
          ['Transformations are lazy', '`filter`, `select`, `groupBy` and `join` describe a new DataFrame. They run nothing. Spark only records a plan. In the recording, the job counter stayed at **' + LAZY.jobs_after_transformations + '** after a filter, a grouping and a sum.', 'A transformation builds a plan.'],
          ['Actions start jobs', '`count`, `collect`, `show` and `write` need a result. An **action** makes Spark optimize the plan and run it as a **job**. The same counter showed **' + LAZY.jobs_after_action + '** job after `collect()`.', 'An action runs the plan.'],
          ['The shuffle', 'Some operations need all rows with the same key in one place: `groupBy`, `distinct`, `orderBy`, and a join of two large tables. Spark moves rows between executors over the network. This is a **shuffle**, and it usually costs the most.', 'Rows travel. That is the slow part.'],
          ['The plan', '`explain()` prints the physical plan, the list of operators Spark will run. Read it from the bottom up. The word `Exchange` marks a shuffle.', 'Read the plan before you tune.']
        ],
        cols: 2
      }),

      B.flow({
        id: 'm2-flow', t: 1, src: 'rec', title: 'One query, from code to result', g: 'spark', legend: true,
        steps: [
          { say: 'Here is the life of one aggregation query. Press Next to follow it.', cap: 'Five steps. Only the fourth moves data between machines.' },
          { say: 'Step 1. The driver reads your code and builds a plan. It runs no task yet. Spark is lazy: it waits for an action.', on: ['k1'], focus: ['drv', 'opt'], tags: ['tg_lazy'], cap: 'Nothing runs until an action.' },
          { say: 'Step 2. The optimizer rewrites the plan. It moves filters down to the file scan, reads only the columns you use, and picks a join strategy. You saw the effect of this step in the pushed filters of the plan.', on: ['k2'], focus: ['opt', 'st1'], cap: 'Same result, cheaper plan.' },
          { say: 'Step 3. Stage 1 runs one task for each input partition. Each task filters, selects, and computes a partial sum for its own rows.', on: ['k3'], focus: ['st1', 'shf'], cap: 'Narrow work: no rows move.' },
          { say: 'Step 4. The shuffle. To add up all rows of one customer, those rows must meet in one place. Spark writes the partial results to disk and every task of the next stage fetches its share over the network.', on: ['k4'], focus: ['shf', 'st2'], tags: ['tg_cost'], cap: 'The shuffle is the expensive step.' },
          { say: 'Step 5. Stage 2 runs one task for each shuffle partition and finishes the sums. The result goes to the driver, or to files in storage.', on: ['k5'], focus: ['st2', 'res'], cap: 'A stage ends at every shuffle.' }
        ]
      }),

      B.rows({
        id: 'm2-data', t: 1, src: 'rec', title: 'The orders this mission queries',
        steps: [
          {
            say: 'These are the Brewline orders that every Spark example in this mission reads. Twelve rows describe ten orders. The source sends one row for every change, so O-5001 and O-5003 appear twice: first PLACED, then SHIPPED.',
            tabs: [{ layer: 'CSV', name: 'orders.csv, as Spark read it', c: 'raw', cols: G.table('spark.orders_head').cols, rows: G.table('spark.orders_head').rows, trk: 1 }],
            notes: ['Mission 5 removes the older version of each order with a merge.']
          },
          {
            say: 'Spark reads the file with a schema that I gave it, so the types are exact: a decimal for money, a timestamp for times. This is `printSchema()`.',
            code: { file: 'orders.printSchema()', lang: 'text', code: G.text('spark.schema_orders') },
            notes: ['Always give a schema for CSV and JSON. If Spark has to infer one, it reads the file twice and may guess a wrong type.']
          }
        ]
      }),

      B.code({
        id: 'm2-lazy', t: 1, src: 'rec', title: 'Transformations plan, actions run', file: 'lazy.py', lang: 'python', code: LAZYCODE,
        steps: [
          { say: 'A query with a filter, a grouping and a sum. Read it as one sentence: take the orders that are not cancelled, group them by customer, add up the totals.', lines: [1, 4] },
          { say: 'Nothing has run. Spark has only recorded what you asked for. I counted the jobs that Spark had started: ' + LAZY.jobs_before + ' before the query and ' + LAZY.jobs_after_transformations + ' after these four lines.', lines: [1, 4] },
          { say: '`collect()` is an action. It needs the rows, so Spark now optimizes the plan and runs it. The counter went to ' + LAZY.jobs_after_action + '.', lines: [6, 6] }
        ],
        note: 'The consequence: a typo in a column name can survive many lines and fail only at the action. A slow line is the action, not the transformation above it.'
      }),

      B.code({
        id: 'm2-narrow', t: 1, src: 'rec', title: 'A plan without a shuffle', file: 'narrow.py', lang: 'python', code: NARROWCODE,
        compiled: { label: 'The physical plan that explain() printed', file: 'physical plan', lang: 'text', code: NARROW },
        steps: [
          { say: 'This query keeps the shipped orders and two columns. I switched adaptive query execution off for these first plans, so you see the plan as Spark first builds it. Spark turns it on by default, and the adaptive scenes later show the difference.', lines: [1, 3] },
          { say: 'Read a plan from the bottom. `FileScan csv` reads the file. Look at `PushedFilters`: the filter on status went down into the scan, so the reader can skip rows early.', lines: [5, 5], compiled: true, clines: [G.at(NARROW, /FileScan/), G.at(NARROW, /FileScan/)] },
          { say: '`Filter` keeps the shipped rows. The star and number, `*(1)`, mean that Spark fuses these operators into one generated function. The number counts code generation stages.', lines: [2, 2], compiled: true, clines: [G.at(NARROW, /Filter/), G.at(NARROW, /Filter/)] },
          { say: '`Project` keeps two columns. There is no `Exchange` anywhere, so no row moves between machines. Every task works on its own partition. This is a narrow plan.', lines: [3, 3], compiled: true, clines: [G.at(NARROW, /Project/), G.at(NARROW, /Project/)] }
        ]
      }),

      B.code({
        id: 'm2-wide', t: 1, src: 'rec', title: 'A plan with a shuffle', file: 'wide.py', lang: 'python', code: WIDECODE,
        compiled: { label: 'The physical plan that explain() printed', file: 'physical plan', lang: 'text', code: WIDE },
        steps: [
          { say: 'Now a grouping. Adding up the orders of one status needs all rows of that status together, so this query must shuffle.', lines: [1, 4] },
          { say: 'At the bottom, `FileScan` reads only the two columns the query needs. Spark pruned the rest.', lines: [6, 6], compiled: true, clines: [G.at(WIDE, /FileScan/), G.at(WIDE, /FileScan/)] },
          { say: 'The first `HashAggregate` is marked `partial_count` and `partial_sum`. Each task counts and sums its own rows first. That shrinks the data before it travels.', lines: [3, 4], compiled: true, clines: [G.at(WIDE, /partial_count/), G.at(WIDE, /partial_count/)] },
          { say: '`Exchange hashpartitioning(status, 8)` is the shuffle. Rows go to one of 8 partitions by the hash of status. The 8 is the setting `spark.sql.shuffle.partitions`. Spark\'s default is ' + DEF['spark.sql.shuffle.partitions'] + '. I set 8 so that the plan is easy to read.', lines: [2, 2], compiled: true, clines: [G.at(WIDE, /Exchange/), G.at(WIDE, /Exchange/)] },
          { say: 'The top `HashAggregate` adds the partial results. It runs after the shuffle, in the second stage.', lines: [1, 1], compiled: true, clines: [G.at(WIDE, /^\*\(2\) HashAggregate/), G.at(WIDE, /^\*\(2\) HashAggregate/)] }
        ],
        note: 'The result is three rows: ' + G.table('spark.status_counts').rows.map(function (r) { return r[0] + ' ' + r[1] + ' orders, $' + r[2]; }).join('; ') + '.'
      }),

      B.cmp({
        id: 'm2-nw', t: 1, src: 'rec', title: 'Narrow and wide: which calls shuffle',
        say: 'You can predict a shuffle from the call. Press Next to read the table. The last column holds what the recording measured.',
        cols: ['Call', 'Kind', 'Shuffle', 'What the recording showed'],
        hl: 2,
        rows: [
          ['`filter`, `select`, `withColumn`', 'Narrow', 'No', 'The narrow plan above has no Exchange.'],
          ['`groupBy(...).agg(...)`', 'Wide', 'Yes', 'The wide plan above has one Exchange.'],
          ['`repartition(3)` on 8 partitions', 'Wide', 'Yes', PART.range_8 + ' partitions became ' + PART.repartition_3 + ', after a full shuffle.'],
          ['`coalesce(2)` on 8 partitions', 'Narrow', 'No', PART.range_8 + ' partitions became ' + PART.coalesce_2 + ' by merging neighbours.'],
          ['`join` with a small table', 'Narrow for the big side', 'No', 'The next screens show a broadcast join without any Exchange on the big side.'],
          ['`join` of two large tables', 'Wide', 'Yes', 'Both sides get an Exchange and a Sort.']
        ],
        steps: [
          { upto: 2, say: 'Filters and projections never move rows. A grouping always does.' },
          { upto: 4, say: '`repartition` shuffles to give you exactly the number you ask for. `coalesce` only merges, so it can reduce the count but never raise it, and it avoids the shuffle.' },
          { upto: 6, say: 'A join depends on the sizes. Keep this table in mind for the join lab.' }
        ],
        pick: 'Use **coalesce** to cut the number of partitions before a write. Use **repartition** when you need an even spread or a specific key.'
      }),

      B.cmp({
        id: 'm2-parts', t: 1, src: 'rec', title: 'How many partitions after a shuffle',
        say: 'A shuffle writes as many partitions as the setting says, not as many as the data needs. Press Next to compare. All numbers come from the recording.',
        cols: ['Setting', 'Partitions after `groupBy`', 'Files written to storage'],
        hl: 2,
        rows: [
          ['`spark.sql.shuffle.partitions` = 200, adaptive execution off', String(PART.after_groupby_shuffle_partitions_200), String(SH200)],
          ['`spark.sql.shuffle.partitions` = 8, adaptive execution off', String(PART.after_groupby_shuffle_partitions_8), String(SH8)],
          ['`spark.sql.shuffle.partitions` = 200, adaptive execution on', 'merged after the shuffle', String(SHAQE)]
        ],
        steps: [
          { upto: 1, say: 'The default of ' + DEF['spark.sql.shuffle.partitions'] + ' partitions gave ' + SH200 + ' output files for a result of a few thousand rows. Most of them are tiny.' },
          { upto: 2, say: 'With 8 partitions the same result wrote ' + SH8 + ' files. Better, but the number is a guess made by a person.' },
          { upto: 3, say: 'With adaptive execution on, Spark looked at the real sizes after the shuffle and merged the small partitions. It wrote ' + SHAQE + ' file. Mission 4 explains why many small files hurt.' }
        ],
        pick: 'Leave **adaptive query execution** on. It is on by default in Spark ' + G.meta('spark') + ' (the setting is ' + DEF['spark.sql.adaptive.enabled'] + ') and it removes most manual tuning of the shuffle partition count.'
      }),

      B.quiz({
        id: 'm2-q1', t: 1,
        q: 'Which line of this code starts a Spark job?',
        file: 'quiz.py', lang: 'python', code: 'a = orders.filter("status = \'SHIPPED\'")\nb = a.select("order_id", "total_usd")\nc = b.groupBy("order_id").count()\nn = c.count()',
        opts: [
          { t: 'Line 1, the filter', fb: 'A filter is a transformation. It adds a step to the plan and runs nothing.' },
          { t: 'Line 2, the select', fb: 'A select is a transformation too.' },
          { t: 'Line 3, the groupBy with count', fb: 'This one looks like an action because of the word count. `groupBy(...).count()` returns a DataFrame, so it is a transformation.' },
          { t: 'Line 4, the count on the DataFrame', fb: '' }
        ],
        ok: 3, why: '`DataFrame.count()` returns a number to the driver, so Spark must run the plan. The first three lines only build it. Line 3 is the tricky one: the same word `count` is a transformation on grouped data and an action on a DataFrame.'
      }),

      B.quiz({
        id: 'm2-q2', t: 1,
        q: 'What does this line of a physical plan tell you?',
        file: 'physical plan', lang: 'text', code: '+- Exchange hashpartitioning(status#N, 8), ENSURE_REQUIREMENTS,',
        opts: [
          { t: 'Spark shuffles the rows into 8 partitions by the hash of status', fb: '' },
          { t: 'The result will be written as 8 files', fb: 'An Exchange moves rows between tasks. Writing files shows up as a write operator.' },
          { t: 'The cluster has 8 workers', fb: 'The number is a partition count. It has no link to the number of machines.' },
          { t: 'The query reads 8 tables', fb: 'Scans show up as FileScan or Scan lines, one for each source.' }
        ],
        ok: 0, why: '`Exchange` is the plan\'s word for a shuffle. `hashpartitioning(status, 8)` says rows are assigned to one of 8 partitions by the hash of the status value, so all rows of one status end up in the same partition.'
      }),

      B.bug({
        id: 'm2-bug', t: 1, q: 'This code runs on a laptop with the small test file. In production it fails with an out-of-memory error on the driver. Click the line that causes it.',
        file: 'total_qty.py', lang: 'python', code: BUG, bad: [G.at(BUG, /collect\(\)/)],
        hint: 'One line brings every row of a distributed table to a single machine.',
        why: '`collect()` returns all rows to the **driver**, which is one machine with limited memory. With 200,000 rows it is fine. With 2 billion it fails. Let the executors add the numbers up, and bring back only the one result.',
        fix: BUGFIX,
        cheer: 'Finding `collect()` in a review is one of the quickest senior catches.'
      }),

      B.widget({ id: 'm2-joins', kind: 'joins', t: 1, src: 'rec', title: 'Lab: five plans for one join' }),

      B.cmp({
        id: 'm2-jcmp', t: 2, src: 'rec', title: 'Join strategies in Spark',
        say: 'Spark has four join families. The first three were in the lab, from real plans. Press Next to read when each one fits.',
        cols: ['Strategy', 'Plan operator', 'How it works', 'Use it when'],
        hl: 3,
        rows: [
          ['Broadcast hash join', '`BroadcastHashJoin` with a `BroadcastExchange`', 'Spark copies the small side to every executor. The big side does not move.', 'One side is small. The default limit is ' + MB(DEF['spark.sql.autoBroadcastJoinThreshold']) + ' MB.'],
          ['Sort-merge join', '`SortMergeJoin` with an `Exchange` and a `Sort` on both sides', 'Both sides shuffle by the key, sort, and merge.', 'Both sides are large. It scales because it can spill to disk.'],
          ['Shuffled hash join', '`ShuffledHashJoin` with an `Exchange` on both sides', 'Both sides shuffle. Spark builds a hash table from the smaller side of each partition and skips the sort.', 'One side is much smaller than the other per partition. You ask for it with a hint.'],
          ['Nested loop or cartesian', '`BroadcastNestedLoopJoin`, `CartesianProduct`', 'Compares every pair of rows.', 'Joins with no equality condition. Avoid them on big tables. These two came from the Spark documentation, not from my recording.']
        ],
        steps: [
          { upto: 2, say: 'Broadcast and sort-merge are the two you will meet daily. Broadcast avoids the shuffle of the big side, which is why it is the fastest choice for dimension tables.' },
          { upto: 3, say: 'Shuffled hash join sits between them. Spark picks it rarely on its own, so you see it mostly when someone adds a hint.' },
          { upto: 4, say: 'A join with no equality condition falls back to a loop over pairs. When you see one in a plan on large tables, look for a condition like `a.x > b.y` and rethink the join.' }
        ],
        pick: 'Trust Spark\'s choice first. Read the plan. If a small table was not broadcast, check its statistics or add a **broadcast hint**. If two large tables are slow, look at the **key distribution** before you add machines.'
      }),

      B.rows({
        id: 'm2-aqe', t: 2, src: 'rec', title: 'Adaptive query execution: the plan changes while it runs',
        steps: [
          {
            say: 'With adaptive execution on, `explain()` before the query runs shows `isFinalPlan=false`. Spark has a plan, but it will change it after the first stage finishes and it knows the real sizes.',
            code: { file: 'g.explain(), before the query ran', lang: 'text', code: AQE_BEFORE },
            notes: ['The shuffle still says 8 partitions, because that is the setting I used.']
          },
          {
            say: 'After the query ran, the same DataFrame prints a different plan. It says `isFinalPlan=true`, and the read after the shuffle says `AQEShuffleRead coalesced`. Spark saw that the 8 partitions were small and merged them.',
            code: { file: 'g.explain(), after the query ran', lang: 'text', code: AQE_AFTER },
            notes: ['The same step reduced the output from ' + SH8 + ' files to ' + SHAQE + ' file in the previous comparison, and from ' + SH200 + ' files when the setting was ' + DEF['spark.sql.shuffle.partitions'] + '.']
          },
          {
            say: 'Adaptive execution does three things. It merges small shuffle partitions. It splits a skewed partition in a join. It can switch a sort-merge join to a broadcast join when one side turns out small after a filter.',
            code: { file: 'the code that made both plans', lang: 'python', code: AQECODE },
            notes: ['The three settings: `spark.sql.adaptive.coalescePartitions.enabled`, `spark.sql.adaptive.skewJoin.enabled`, and the join switch. All are on by default in Spark ' + G.meta('spark') + ' when adaptive execution is on.']
          }
        ]
      }),

      B.widget({ id: 'm2-skew', kind: 'skew', t: 2, src: 'rec', title: 'Lab: skew in the partitions' }),

      B.code({
        id: 'm2-salt', t: 2, src: 'rec', title: 'Salting a hot key', file: 'salt.py', lang: 'python', code: SALTCODE,
        steps: [
          { say: 'In this data set ' + TOP.rows[0][1] + ' of 300,000 rows share the key ' + TOP.rows[0][0] + '. The next two keys have ' + TOP.rows[1][1] + ' rows each. This is skew: one value is far more common than the rest.', lines: [1, 1] },
          { say: 'Spark hashes the key, so every row of K-0 lands in one of the 8 partitions. In the recording that partition held ' + SKEW_MAX.toLocaleString('en-US') + ' rows, and the average was ' + Math.round(SKEW_AVG).toLocaleString('en-US') + '. That is ' + (SKEW_MAX / SKEW_AVG).toFixed(1) + ' times the average.', lines: [2, 2] },
          { say: 'Salting adds a second column with a small random-looking number. Here I use the row id modulo 32. Now K-0 is really 32 different groups.', lines: [4, 4] },
          { say: 'Repartition by the key and the salt. The hot key now spreads over many partitions. The biggest partition dropped to ' + Math.max.apply(null, SZ.salted_32).toLocaleString('en-US') + ' rows, ' + (Math.max.apply(null, SZ.salted_32) / (SZ.salted_32.reduce(function (a, b) { return a + b; }, 0) / SZ.salted_32.length)).toFixed(1) + ' times the average.', lines: [5, 5] }
        ],
        note: 'For a join, the small side needs every salt value too: you repeat each row 32 times with a salt from 0 to 31 and join on the key and the salt. I recorded the repartition above and did not run that second half. Since Spark 3, adaptive execution splits skewed partitions for you in sort-merge joins, so try that first.'
      }),

      B.code({
        id: 'm2-udf', t: 2, src: 'rec', title: 'A Python function against a built-in function', file: 'udf.py', lang: 'python', code: UDFCODE,
        compiled: { label: 'The two plans', file: 'physical plans', lang: 'text', code: BOTHPLANS },
        steps: [
          { say: 'Two ways to lower-case the status column. One uses a Python function. The other uses the built-in `lower`.', lines: [1, 4] },
          { say: 'The Python version has an `ArrowEvalPython` operator. Spark sends batches of rows out of the JVM to a Python process, runs your function there, and receives the results. The optimizer cannot look inside the function.', lines: [1, 2], compiled: true, clines: [G.at(BOTHPLANS, /ArrowEvalPython/), G.at(BOTHPLANS, /ArrowEvalPython/)] },
          { say: 'The built-in version is a plain `Project` with `lower(status)`. It runs inside the JVM, can be fused into the generated code, and needs no round trip.', lines: [4, 4], compiled: true, clines: [G.at(BOTHPLANS, /lower\(status/), G.at(BOTHPLANS, /lower\(status/)] }
        ],
        note: 'Use a built-in function when one exists. When you need Python, a vectorized pandas function moves whole columns at a time and costs far less per row than a plain Python function. Neither can be optimized as much as a built-in.'
      }),

      B.bug({
        id: 'm2-bug2', t: 2, q: 'This function cleans the status column and works. A reviewer asks you to change it anyway. Click the line that the reviewer means.',
        file: 'clean_status.py', lang: 'python', code: BUG2, bad: [G.at(BUG2, /@F\.udf/)],
        hint: 'Spark already has built-in functions that trim and change case.',
        why: 'A Python UDF sends every row out of the JVM to a Python process, and the optimizer cannot see inside it. The plan in the previous scene showed the extra `ArrowEvalPython` step. `F.upper(F.trim("status"))` does the same job inside the JVM.',
        fix: BUG2FIX,
        cheer: 'A UDF in a code review is the first thing to question.'
      }),

      B.decide({
        id: 'm2-dec', t: 2, src: 'rec', title: 'Decision: a slow join with a small table',
        scenario: 'A nightly job joins **2 billion orders** with a **40 MB products table**. The plan shows a sort-merge join and the job runs 50 minutes. The products table comes from a view, so Spark has no size estimate for it. The cluster is already large.',
        opts: [
          { t: 'Double the number of workers', d: 'More machines, same plan.', lose: 'The plan still shuffles and sorts 2 billion rows to join 40 MB. More machines make that cheaper, but not cheap. You pay for the shuffle that you can remove.' },
          { t: 'Add a broadcast hint on the products table', d: '`products.hint("broadcast")` in the join.' },
          { t: 'Raise `spark.sql.shuffle.partitions` to 2000', d: 'Smaller partitions.', lose: 'It helps a sort-merge join a little. The join stays a sort-merge join, and 2000 tasks add scheduling cost.' }
        ],
        pick: 1,
        why: 'The recorded plan with the hint shows `BroadcastHashJoin` even when I had switched automatic broadcasting off. The 40 MB table is copied to each executor once, and the 2 billion rows are never shuffled. The cost drops from a shuffle of the whole fact table to a single copy of a small one.',
        when: 'Do not broadcast a table that does not fit comfortably in executor and driver memory. A few hundred MB is the practical limit, and the copy is built on the driver first. With adaptive execution on, Spark can also switch to a broadcast join at run time when a side turns out small after filtering.'
      }),

      B.incident({
        id: 'm2-inc', t: 2, src: 'rec', title: 'Incident: one task runs for three hours', time: '04:30',
        alert: '**The nightly aggregation takes 3 hours instead of 20 minutes.** The stage that groups orders by customer has 200 tasks. 199 of them finished in 4 minutes. One is still running.',
        clues: ['The data volume is normal', 'A new test integration started sending orders last week', 'The job ran fine for two months'],
        opts: [
          { t: 'Open the stage in the Spark UI and compare the task times and input sizes', fb: '' },
          { t: 'Double the cluster and rerun', fb: 'Extra machines cannot help one slow task. The other 199 tasks are already done.' },
          { t: 'Raise the shuffle partitions to 2000', fb: 'All rows of one key still go to one partition. The slow task stays slow.' },
          { t: 'Cache the input DataFrame', fb: 'Caching saves a second read. It does nothing about one oversized partition.' }
        ],
        best: 0,
        why: 'One task far slower than the median is the signature of skew. The stage page shows each task\'s run time and input size, so a quick look confirms it and names the heavy partition. In the lab, the biggest partition held ' + (SKEW_MAX / SKEW_AVG).toFixed(1) + ' times the average.',
        checks: [
          ['Read the Spark UI stage page', 'Compare the minimum, median and maximum task durations. A maximum ten times the median means skew.'],
          ['Find the hot key', 'Group the input by the key and sort by count. One key, often a test account or a null, holds most rows.'],
          ['Ask what changed', 'The new test integration sends all its orders under one customer id.'],
          ['Pick the fix', 'Filter out the test traffic. Or rely on adaptive skew handling. Or salt the key.'],
          ['Rerun and compare', 'The stage should end with all tasks within a small multiple of the median.']
        ],
        tell: 'The nightly aggregation took three hours because one task of the grouping stage was far slower than the others. The stage page showed that one task read most of the input, and a count by customer showed that a new test integration sent all its orders under one customer id. I filtered that traffic out at the source and confirmed that adaptive skew handling was on. The job went back to 20 minutes. To prevent a repeat, we alert when the slowest task takes more than ten times the median.',
        prevent: ['Alert on the **ratio** of the slowest task to the median task', 'Keep **adaptive query execution** and skew handling on', 'Keep test traffic **out of production tables** or give it its own key', 'Check the **key distribution** when you add a new source']
      }),

      B.challenge({
        id: 'm2-ch', t: 2, title: 'Coding round: the newest row for each order',
        q: 'The orders table holds every version of an order. **Write PySpark that returns one row for each `order_id`: the one with the latest `_loaded_at`.**\n\nSay what happens if two versions have the same `_loaded_at`.',
        data: [{ name: 'orders (first rows)', cols: G.table('spark.orders_head').cols, rows: G.table('spark.orders_head').rows.slice(0, 6) }],
        lang: 'python', file: 'latest.py',
        hints: ['You need to number the versions of each order from newest to oldest.', '`Window.partitionBy("order_id").orderBy(...)` and `row_number()`.', 'Keep the rows where the number is 1, then drop the helper column.'],
        sol: CHSOL,
        res: { msg: '10 rows, one for each order', cols: G.table('stream.silver_rows').cols, rows: G.table('stream.silver_rows').rows },
        expl: ['`row_number()` over a window gives 1 to the newest version of each order. The filter keeps those rows.', 'Do not use `orderBy().dropDuplicates(["order_id"])`. Spark does not promise which duplicate survives the shuffle, so the result can change between runs.', 'If two versions share a `_loaded_at`, `row_number` still picks one, but the choice is arbitrary. Add a second sort column, such as a sequence number, to make it repeatable.', 'This exact function is tested in mission 11, with a test for the newest-version rule.'],
        cx: 'One shuffle by `order_id`, then a sort inside each partition. That is about n log n for the rows in a partition, and the data moves once.'
      }),

      B.code({
        id: 'm2-cache', t: 3, src: 'rec', title: 'Caching a DataFrame', file: 'cache.py', lang: 'python', code: CACHECODE,
        compiled: { label: 'The plan that read from the cache', file: 'physical plan', lang: 'text', code: CACHED },
        steps: [
          { say: 'Caching keeps a DataFrame in memory, and on disk when memory is short, after the first time Spark computes it. Use it when you read the same intermediate result several times.', lines: [1, 2] },
          { say: 'The plan reads from an `InMemoryTableScan` instead of rebuilding the data. The `InMemoryRelation` underneath shows the storage level: disk and memory, deserialized, one replica.', lines: [3, 3], compiled: true, clines: [G.at(CACHED, /InMemoryTableScan/), G.at(CACHED, /InMemoryRelation/)] },
          { say: 'Release the memory when you are done. Cached data stays until you unpersist or the application ends.', lines: [4, 4] }
        ],
        note: 'Caching helps when a result is expensive and used more than once. It does not help a single pass, and it takes memory from the work that follows. Measure before you add it.'
      }),

      B.qa({
        id: 'qa-lazy', t: 1, tag: 'Spark', secs: 60,
        q: 'What is the difference between a transformation and an action in Spark, and why is Spark lazy?',
        pts: ['A transformation describes a new DataFrame and runs nothing', 'An action returns a result or writes data and starts a job', 'Spark records the plan until an action', 'Laziness lets the optimizer see the whole query', 'Examples: filter and groupBy against count, collect and write', 'A slow or failing line is usually the action'],
        short: 'A transformation, like `filter`, `select`, `groupBy` or `join`, describes a new DataFrame. It runs nothing. Spark only records the plan. An action, like `count`, `collect`, `show` or `write`, needs a result, so Spark optimizes the whole plan and runs it as a job.\n\nSpark is lazy so that the optimizer sees the entire query before anything runs. It can push a filter down to the file scan, read only the columns I use, and choose a join strategy. If every line ran at once, none of that would be possible.\n\nOne consequence: errors and slow steps show up at the action. If a job is slow, I look at the plan of the query that the action triggers, not at one line above it. In a test I counted jobs, and the counter stayed at zero after a filter, a grouping and a sum, then moved to one after `collect()`.',
        fu: [
          ['Is `groupBy(...).count()` an action?', 'No. It returns a DataFrame, so it is a transformation. `DataFrame.count()` is an action because it returns a number to the driver.'],
          ['What does `cache()` do?', 'It marks a DataFrame to be kept after the first time it is computed. It is itself lazy: the data is stored when the first action runs.']
        ],
        trap: 'Saying "actions are slow and transformations are fast". The transformations cost nothing only because they run nothing.',
        real: 'Describe a bug that appeared far from the line that caused it, because of lazy evaluation.'
      }),

      B.qa({
        id: 'qa-shuffle', t: 1, tag: 'Spark', secs: 60,
        q: 'What is a shuffle, why is it expensive, and how do you reduce it?',
        pts: ['Rows move between executors so that rows with the same key meet', 'Caused by groupBy, join, distinct, orderBy and repartition', 'Costs disk writes, network transfer and sorting', 'A shuffle ends a stage and starts another', 'Reduce it with broadcast joins, filters before the shuffle, and partial aggregation', 'Find it as Exchange in the plan'],
        short: 'A shuffle redistributes rows across the executors so that all rows with the same key end up in one partition. A grouping, a distinct, a sort and a join of two large tables need it. Each executor writes its output to local disk, and then every task of the next stage fetches its share over the network.\n\nThat makes it the expensive step: disk writes, network transfer and often a sort. It also ends a stage, so the next stage cannot start until the shuffle finishes.\n\nI reduce it by filtering and selecting columns before the shuffle, by broadcasting small tables so the big side does not move, and by letting Spark do partial aggregation before the exchange. I find shuffles as `Exchange` lines in the plan. In my test, a grouping on a small file with the default 200 partitions wrote 200 files, and adaptive execution merged them into 1.',
        fu: [
          ['How many partitions does a shuffle create?', 'The value of `spark.sql.shuffle.partitions`, which defaults to 200. With adaptive execution on, Spark merges small ones after the shuffle.'],
          ['What is the difference between repartition and coalesce?', '`repartition` does a full shuffle and can raise or lower the count. `coalesce` merges neighbours without a shuffle and can only lower it.']
        ],
        trap: 'Saying "avoid shuffles". Many queries need one. The skill is to remove the avoidable ones and keep the others cheap.',
        real: 'Describe a query where you removed a shuffle, and the time before and after.'
      }),

      B.qa({
        id: 'qa-join', t: 2, tag: 'Spark', secs: 90,
        q: 'How does Spark choose a join strategy, and how do you influence it?',
        pts: ['Broadcast hash join when one side is under the broadcast threshold', 'Sort-merge join for two large tables', 'Shuffled hash join, mostly by hint', 'Statistics and the broadcast threshold drive the choice', 'Hints: broadcast, merge, shuffle_hash', 'Adaptive execution can switch the strategy at run time'],
        short: 'Spark picks the strategy from the join condition and from the estimated size of each side. For an equality join, if one side is smaller than `spark.sql.autoBroadcastJoinThreshold`, which is 10 MB by default, Spark broadcasts it. The small table is copied to every executor, and the big side does not move. Otherwise it uses a sort-merge join: both sides shuffle by the key, sort, and merge.\n\nI influence the choice in three ways. I keep table statistics current, so the size estimates are right. I add a hint, such as `broadcast`, `merge` or `shuffle_hash`, when I know better than the estimate. In my test the broadcast hint produced a `BroadcastHashJoin` even with automatic broadcasting switched off. I also leave adaptive execution on, because it can turn a sort-merge join into a broadcast join once it sees that a side is small after filtering.\n\nI read the plan to confirm what Spark did.',
        fu: [
          ['When would a broadcast join hurt?', 'When the table is large. The driver builds it and every executor holds a copy, so memory runs out. Keep broadcast tables to a few hundred MB at most.'],
          ['What if you have a join with no equality condition?', 'Spark falls back to a nested loop or a cartesian product. Both compare many pairs. Rewrite the condition, or bucket the values, if you can.']
        ],
        trap: 'Naming the join types without saying how Spark picks one. Say the size estimate and the threshold.',
        real: 'Tell about a join you fixed with a hint or with statistics.'
      }),

      B.qa({
        id: 'qa-skew', t: 2, tag: 'Spark', secs: 90,
        q: 'One task in a stage runs far longer than the others. What do you check, and what do you do?',
        pts: ['Open the stage page and compare the task durations and input sizes', 'Skew: one key holds most of the rows', 'Find the hot key with a count by key', 'Check for nulls and test data', 'Fix: filter, adaptive skew handling, salting, or broadcast', 'Alert on the max to median ratio'],
        short: 'A single slow task usually means skew. I open the stage in the Spark UI and compare the minimum, median and maximum task time and the input size of each task. If the slowest one reads far more data, one partition holds too many rows.\n\nThen I find the hot key with a count by key. Often it is a null, a default value or a test account. If the rows are junk, I filter them out. If they are real, I check that adaptive skew handling is on, because it splits an oversized partition in a sort-merge join. In my lab, the biggest partition held 6.6 times the average, and with the setting on the plan showed `SortMergeJoin(skew=true)`.\n\nIf that is not enough, I salt the key: I add a small random column and group by both, so one hot key becomes many groups. For a small join side I broadcast it instead. Finally I add an alert on the ratio of the slowest task to the median.',
        fu: [
          ['Why does more hardware not help?', 'One partition is still processed by one task on one core. The other cores wait for it.'],
          ['What if the skew comes from nulls?', 'Nulls never match in an equality join, so filter them before the join and handle them separately.']
        ],
        trap: 'Answering "add more executors". It does not move work off the one overloaded task.',
        real: 'Describe a hot key you found, and where it came from.'
      }),

      B.qa({
        id: 'qa-aqe', t: 3, tag: 'Spark', secs: 90,
        q: 'What does adaptive query execution change, and when would you not rely on it?',
        pts: ['Re-plans at run time using real shuffle statistics', 'Coalesces small shuffle partitions', 'Splits skewed partitions in sort-merge joins', 'Switches join strategy, for example to broadcast', 'On by default in current Spark', 'It cannot fix a bad data model or a very large skew'],
        short: 'Adaptive query execution re-plans a query while it runs. After each shuffle stage finishes, Spark knows the real sizes of the partitions, and it uses them. It merges many small shuffle partitions into fewer. It splits an oversized partition in a sort-merge join, which handles moderate skew. It can switch a sort-merge join to a broadcast join when a side is small after a filter.\n\nIt is on by default in current Spark. The plan shows it as `AdaptiveSparkPlan`, with `isFinalPlan=false` before the query runs and `true` after. In my test it merged a shuffle that would have written 200 small files into one.\n\nI do not rely on it for everything. It works only after a shuffle, so it cannot fix a bad data model, and it cannot rescue extreme skew where one key holds almost all rows. Then I filter, salt or redesign.',
        fu: [
          ['Which settings control the skew handling?', '`spark.sql.adaptive.skewJoin.enabled`, and the two size thresholds. The defaults call a partition skewed when it is 5 times the median and larger than 256 MB.'],
          ['How do you see it working?', 'In the final plan: `AQEShuffleRead coalesced` for merged partitions, `AQEShuffleRead skewed` and `SortMergeJoin(skew=true)` for a split.']
        ],
        trap: 'Saying "AQE fixes everything". It reacts after a shuffle, with the information from that shuffle.',
        real: 'Describe a job whose run time or file count improved when adaptive execution was on.'
      }),

      B.recap({
        id: 'm2-recap', n: 2, badge: 'Spark Reader', color: '#FED7AA',
        pts: [
          '**Transformations** build a plan. **Actions** run it. The job counter stayed at 0 until `collect()`.',
          'Read a **plan from the bottom**. `Exchange` is a **shuffle**. A stage ends at every shuffle.',
          '**Filter early**, select few columns, and let the scan skip data.',
          'A small table is **broadcast**. Two large tables use a **sort-merge** join. Use a hint when Spark guesses wrong.',
          '**Adaptive execution** merged a shuffle of 200 files into 1 and splits skewed partitions. Keep it on.',
          '**Skew** shows as one slow task. Find the key, then filter, split or salt.',
          'Prefer **built-in functions** to Python UDFs. Never `collect()` a big table.'
        ],
        lines: [
          'I read the plan before I tune anything.',
          'I look at the slowest task, not the average.',
          'I broadcast small tables and leave adaptive execution on.'
        ]
      })
    ]
  });
})();
