/* Mission 5: skew and adaptive execution. A hot key makes one task do a third of the work. A count hides it and a window shows it. Three fixes on one join: plain, the adaptive skew
   join, and a salt. The numbers are the records that each task read, from the event log of a real Spark 4.0.1. The skew limits were lowered for the recording, and the screens say so. */
(function () {
  var B = LAB.b, G = LAB.get;
  var AG = G.table('skew.aggregations'), JN = G.table('skew.joins'), W0 = G.counts('world.summary'), ST = G.table('world.stores'), C = G.counts('joins.counts');
  var PLAD = G.text('skew.plan_adaptive'), PLSA = G.text('skew.plan_salted');
  var RAD = G.counts('skew.rows_adaptive'), RPL = G.counts('skew.rows_plain'), RSA = G.counts('skew.rows_salted');
  var DEF = G.table('conf.defaults');
  var PY = G.file('code/skew.py');
  var JOIN3 = G.lines(PY, G.at(PY, /^def join_three_ways/), G.at(PY, /return plans/));
  var LOW = G.lines(PY, G.at(PY, /^def lowered_settings/), G.at(PY, /advisoryPartitionSizeInBytes', '300k'/));
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  var def = function (k) { var r = DEF.rows.filter(function (x) { return x[0] === k; })[0]; if (!r) throw new Error('no setting ' + k); return r[1]; };
  var cnt = AG.rows[0], win = AG.rows[1], plain = JN.rows[0], adap = JN.rows[1], salt = JN.rows[2];
  G.expect(Number(win[4]) > 5 * Number(win[3]) && Number(cnt[4]) < 5 * Math.max(1, Number(cnt[3])), 'a window shows skew and a count does not');
  G.expect(Number(adap[4]) < Number(plain[4]) / 2 && Number(salt[4]) < Number(plain[4]) / 2 && RAD.plan_says_skew === true && RPL.plan_says_skew === false, 'both fixes cut the busiest task');
  G.expect(RAD.rows === RPL.rows && RSA.rows === RPL.rows, 'the three joins return the same number of rows');
  var s01 = ST.rows[0];
  var pctS = function (x) { return Math.round(Number(x) * 1000) / 10; };

  LAB.addChapter({
    id: 'm5', n: 5, title: 'Skew and adaptive execution', short: 'Skew', blurb: 'One hot key, one slow task, and three ways to fix it', minutes: 52,
    focus: ['ing', 'air'],
    goals: [
      'Say what **skew** is, where it comes from, and how it looks in the **stage table**.',
      'Explain why a **count** hides skew and a **window** or a **join** shows it.',
      'Read the **maximum against the median** of the tasks of a stage, and decide that it is skew.',
      'Say how the **adaptive skew join** works, what it needs, and where it does not apply.',
      'Write a **salted join**, and name the way it goes wrong.',
      'Choose a fix: broadcast, adaptive skew join, salting, or a separate path for the hot key.'
    ],
    say: 'Mission 5 is about the problem that takes down more Spark jobs than any other: one task that is far bigger than the rest. Brewline has it built in, because store ' + s01[0] + ' sells ' + pctS(s01[2]) + ' percent of all orders. I ran a count, a window and a join on that data, and read the records that each task of the stage received. The same story repeats with a customer, a country, or a NULL.',
    scenes: [
      B.talk({
        id: 'm5-what', t: 1, src: 'docs', title: 'What skew is',
        say: 'A stage is finished when its **slowest** task is finished. If one task has far more data than the others, the whole stage waits for it. Press Next for the four things to know.',
        items: [
          ['The definition', 'Data is **skewed** when a few keys hold far more rows than the others. After a shuffle, every row of a key goes to **one** task, so a hot key makes a hot task. Adding cores does not help, because the hot task is still one task.', 'One key, one task.'],
          ['Where it comes from', 'A big customer or a big store. A **NULL** or a default value such as `unknown` or `0`. A date that holds a bulk load. A popular product. It is a property of the data, so it grows with the business and appears one day on a job that always worked.', 'Hot keys, NULLs and defaults.'],
          ['How it looks', 'In the **Stages** tab: most tasks finish fast and a few run for a long time, and the **maximum** records or bytes are many times the **median**. One executor is busy while the others sit idle. One task spills, or runs out of memory, while the rest are fine.', 'Max far above the median.'],
          ['Why it is sneaky', 'A job can run well for months and fail on a day when one key grows. And the same key may be harmless in one query and fatal in the next. The recording shows it: a count of the hot store is harmless, and a window over it is not.', 'It hides until the key is big enough.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The number to look for:', t: 'the busiest task divided by the median task. A ratio near 1 is even. A ratio of 5 or more deserves a look. A ratio of 50 is an incident.' }
      }),

      B.rows({
        id: 'm5-hot', t: 1, src: 'rec', title: 'The hot store in the data',
        steps: [
          {
            say: 'Before the tasks, the keys. These are the twelve stores of Brewline and the orders that each one sold. Store **' + s01[0] + '** has **' + n0(s01[1]) + '** of ' + n0(W0.orders) + ': **' + pctS(s01[2]) + ' percent**. The next biggest has ' + pctS(ST.rows[1][2]) + '. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Orders for each store', c: 'raw', cols: ST.cols, rows: ST.rows.map(function (r) { return [r[0], n0(r[1]), pctS(r[2]) + ' %']; }), trk: 0 }],
            notes: ['Recorded: `groupBy("store_id").count()` on the Brewline orders. The data is made up, with this shape on purpose.']
          },
          {
            say: 'If Spark sends each store to one task, one task gets about **a third of the rows**. With 12 tasks and an even spread, each would get one twelfth, which is 8 percent. The hot task gets four times more than it should, and every other task finishes long before it.',
            tabs: [{ layer: 'RECORDED', name: 'Orders for each store', c: 'raw', cols: ST.cols, rows: ST.rows.map(function (r) { return [r[0], n0(r[1]), pctS(r[2]) + ' %']; }), trk: 0, chg: [[0, 2]] }],
            notes: ['A hash does not know that a key is big. It only sends the key to a bucket.']
          }
        ]
      }),

      B.widget({ id: 'm5-lab', kind: 'skewlab', t: 1, src: 'rec', title: 'Lab: the hot store' }),

      B.rows({
        id: 'm5-count', t: 1, src: 'rec', title: 'A count hides skew, a window shows it',
        steps: [
          {
            say: 'Two queries on the same orders, grouped by store. A **count**, and a **window sum**, where every order gets the total of its store. I read the tasks of the stage after the shuffle, with 12 partitions. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'The stage after the shuffle', c: 'raw', cols: AG.cols, rows: AG.rows.map(function (r) { return [r[0], r[1], n0(r[2]), n0(r[3]), n0(r[4])]; }), trk: 0 }],
            notes: ['Recorded: adaptive execution off, 12 shuffle partitions, tasks and records from the event log.']
          },
          {
            say: 'The **count** looks healthy: the busiest task read **' + n0(cnt[4]) + '** records and the median **' + n0(cnt[3]) + '**. Why? Each map task added up its own rows first. What crosses the network is one small row for each store from each task, not the orders. The hot store does no harm here.',
            tabs: [{ layer: 'RECORDED', name: 'The stage after the shuffle', c: 'raw', cols: AG.cols, rows: AG.rows.map(function (r) { return [r[0], r[1], n0(r[2]), n0(r[3]), n0(r[4])]; }), trk: 0, chg: [[0, 4]] }],
            notes: ['That is the partial aggregation of mission 2. It protects any operation that can be added up in pieces: count, sum, min, max.']
          },
          {
            say: 'The **window** cannot add up in pieces, because every order must receive the store total, so **every order moves**. The busiest task read **' + n0(win[4]) + '** records against a median of **' + n0(win[3]) + '**. That is **' + Math.round(Number(win[4]) / Number(win[3])) + ' times** the median. One task of twelve did more than a third of the work.',
            tabs: [{ layer: 'RECORDED', name: 'The stage after the shuffle', c: 'raw', cols: AG.cols, rows: AG.rows.map(function (r) { return [r[0], r[1], n0(r[2]), n0(r[3]), n0(r[4])]; }), trk: 1, chg: [[1, 3], [1, 4]] }],
            notes: ['The busiest task has more than the 135,135 orders of the hot store, because its bucket also holds another store. A hash puts two stores in one bucket sometimes.']
          },
          {
            say: 'So skew is a property of a **query on a key**, and not of a table. The rule: an operation that must move every row of a key (a window, a join, `collect_list`, a sort by key) feels skew. An operation that can be added up first (`count`, `sum`) mostly does not.',
            tabs: [{ layer: 'RULE', name: 'Which operations feel skew', c: 'raw', cols: ['operation', 'moves every row?', 'feels skew?'], rows: [['count, sum, min, max by key', 'no, adds up first', 'rarely'], ['join on the key', 'yes', 'yes'], ['window by the key', 'yes', 'yes'], ['collect_list, collect_set by the key', 'yes', 'yes'], ['distinct count by the key', 'partly', 'sometimes']], trk: 1 }],
            notes: ['From the documentation and the recording above. Test your own query: it is quick.']
          }
        ]
      }),

      B.flow({
        id: 'm5-flow', t: 1, src: 'docs', title: 'One hot task holds the stage', g: 'skew', legend: true,
        steps: [
          { say: 'Here is the shape of the problem and of the fixes. Press Next to walk through it.', cap: 'A hot key and what to do about it.' },
          { say: 'Step 1. The orders are grouped by store. Every row of a store goes to one task.', on: ['k1', 'k2', 'k3'], focus: ['sk_in', 'sk_t1', 'sk_t2', 'sk_t3'], cap: 'Each store goes to one task.' },
          { say: 'Task 1 and task 2 got small slices. Task 3 got the hot store, about a third of all rows. See how much taller its box is.', focus: ['sk_t1', 'sk_t2', 'sk_t3'], tags: ['tg_hot'], cap: 'Task 3 holds a third of the work.' },
          { say: 'Step 2. The small tasks finish first. The big one is still running. The next stage cannot start until **every** task of this stage is done, so everything waits.', on: ['k4', 'k5', 'k6'], status: { sk_t1: 'ok', sk_t2: 'ok', sk_t3: 'run' }, focus: ['sk_t1', 'sk_t2', 'sk_t3', 'sk_wait'], tags: ['tg_time'], cap: 'The stage is as slow as its slowest task.' },
          { say: 'Step 3. Three ways out. Let **adaptive execution** split the big partition, if the operation is a join. **Salt** the key by hand, to spread it wider. Or **broadcast** the small side, and skip the shuffle altogether. The rest of this mission records the first two.', on: ['k7', 'k8', 'k9'], focus: ['sk_wait', 'sk_f1', 'sk_f2', 'sk_f3'], cap: 'Split it, salt it, or avoid the shuffle.' }
        ]
      }),

      B.flow({
        id: 'm5-aqeflow', t: 1, src: 'docs', title: 'Adaptive execution: plan, run, look, plan again', g: 'aqe', legend: true,
        steps: [
          { say: 'Two of the three fixes in this mission, and the merge of mission 3, come from the same feature: **adaptive query execution**. Press Next to see how it works.', cap: 'One feature, three fixes.' },
          { say: 'Step 1. Spark starts with the plan that it can make **before** it has read any data. Sizes are estimates, taken from file listings and before filters. The setting `spark.sql.adaptive.enabled` is **' + def('spark.sql.adaptive.enabled') + '** by default in the recording.', on: ['e1'], focus: ['a_plan', 'a_run'], tags: ['tg_on'], cap: 'The first plan is a guess.' },
          { say: 'Step 2. Spark runs the **map side** of the first shuffle and stops there. Every map task has written its shuffle files, so the work is real and the output exists.', on: ['e2'], focus: ['a_run', 'a_stats'], tags: ['tg_stage'], cap: 'Run up to a shuffle.' },
          { say: 'Step 3. Now Spark has the **real size of every shuffle partition**, in bytes and in rows. This is what no estimate could give it.', on: ['e3'], focus: ['a_stats', 'a_re'], cap: 'Read the real sizes.' },
          { say: 'Step 4. It plans the rest of the query again, with these numbers, and three things can change. **Small partitions are merged** (mission 3: 200 tasks became 1). A **sort-merge join becomes a broadcast join** if one side turned out small (mission 4). A **skewed partition is split** into pieces (this mission).', on: ['e4', 'e5', 'e6'], focus: ['a_re', 'a_coal', 'a_join', 'a_skew'], cap: 'Merge, switch, or split.' },
          { say: 'Step 5. The result is the **final plan**, marked `isFinalPlan=true`. It is what the SQL tab shows after the query has run. The plan that `explain()` printed before the action was the first guess, `isFinalPlan=false`.', on: ['e7'], focus: ['a_skew', 'a_final'], cap: 'Read the final plan.' }
        ]
      }),

      B.talk({
        id: 'm5-fixes', t: 1, src: 'docs', title: 'Five fixes, in the order to try them',
        say: 'Try the cheapest fix first. Press Next for each.',
        items: [
          ['1. Avoid the shuffle', 'If one side of the join is small, **broadcast** it. There is no shuffle of the big side, so there is no hot partition. Filter and trim the small side first.', 'No shuffle, no skew.'],
          ['2. Let Spark split it', '**Adaptive skew join** (on by default) finds a partition much bigger than the median, splits it into pieces and joins each piece with the matching rows of the other side. No code. It works for joins, not for aggregations or windows.', 'Free, for joins.'],
          ['3. Salt the key', 'Add a small random or hashed number to the key on the big side, and **repeat** each row of the small side for every salt value. The hot key becomes several keys. It works for any operation, and costs code that you must get right.', 'Make one key into several.'],
          ['4. Treat the hot key separately', 'Split the data into the hot keys and the rest. Process the rest normally. Process the hot keys with a broadcast or a special path. Union the results. Good when one key is the problem and everything else is fine.', 'A special path for the giant.'],
          ['5. Change the key or the query', 'Aggregate in two steps (a partial one on a finer key, then the final one). Filter out NULLs before the join. Pick a key with more values. Often the best fix is one line in the business logic.', 'Is the key the right one?']
        ],
        cols: 1
      }),

      B.code({
        id: 'm5-low', t: 2, src: 'rec', title: 'The limits that I lowered for the recording', file: 'skew.py', lang: 'python', code: LOW,
        steps: [
          { say: 'The real defaults of Spark 4.0.1 are made for big data. A partition is skewed when it is **' + def('spark.sql.adaptive.skewJoin.skewedPartitionFactor') + ' times** the median and bigger than **256 MiB**. My whole orders table is 6 MB, so nothing could ever be skewed by that rule. Press Next.', lines: null },
          { say: 'So I lowered the limits, to behave the way that 400 million rows would: skewed means **3 times the median and over 200 KB**, and the target size of a piece is 300 KB. The mechanism is the same. Only the thresholds are smaller.', lines: G.span(LOW, /skewedPartitionFactor/, /advisoryPartitionSizeInBytes/) },
          { say: 'Broadcasting is switched off (`-1`), so that both sides of the join are shuffled by the store. Otherwise Spark would broadcast the stores and there would be nothing to see. Partition coalescing is off too, so that the number of tasks is easy to compare.', lines: G.span(LOW, /autoBroadcastJoinThreshold', '-1'/, /coalescePartitions/) },
          { say: 'The first setting of the function decides which run this is: the adaptive skew join is on only for the second run. The two others run with it off.', lines: G.span(LOW, /skewJoin\.enabled/) }
        ],
        note: 'Recorded and stated plainly: the numbers in the next screens are from lowered limits. The defaults are ' + def('spark.sql.adaptive.skewJoin.skewedPartitionFactor') + ' times the median and 256 MiB (' + def('spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes') + '), with a 64 MiB advisory size.'
      }),

      B.code({
        id: 'm5-join', t: 1, src: 'rec', title: 'The same join three ways', file: 'skew.py', lang: 'python', code: JOIN3,
        steps: [
          { say: 'One function, three runs of the orders joined to the stores. Press Next.', lines: null },
          { say: 'The loop runs the modes `plain`, `adaptive` and `salted`. Before each, the limits are lowered, with the skew join on only for `adaptive`.', lines: G.span(JOIN3, /for mode in/, /lowered_settings/) },
          { say: 'The **salt**. On the orders (the big side) every row gets a number from 0 to 3, computed from a hash of the order id. On the stores (the small side) every row is **repeated four times**, once for each salt, by exploding an array of 0 to 3.', lines: G.span(JOIN3, /if mode == 'salted'/, /right = /) },
          { say: 'The join key is now `store_id` **and** `salt`. The hot store is spread over four keys, so four tasks share its rows. Every order still finds its store, because the store exists with all four salts.', lines: G.span(JOIN3, /q = left\.join/) },
          { say: 'The plain and adaptive runs use the plain join. All three are collected, so the rows can be counted and compared.', lines: G.span(JOIN3, /q = o\.join/, /plans\[mode\]/) }
        ],
        note: 'Recorded. The salt comes from a hash of `order_id`, and not from `rand()`: a random salt can change when a task is retried, and then rows go missing or are repeated.'
      }),

      B.rows({
        id: 'm5-three', t: 1, src: 'rec', title: 'Three joins, three busiest tasks',
        steps: [
          {
            say: 'Here are the tasks of the join stage in each run: how many, and how many records the median and the busiest one read. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'The join stage', c: 'raw', cols: JN.cols, rows: JN.rows.map(function (r) { return [r[0], r[1], n0(r[2]), n0(r[3]), n0(r[4])]; }), trk: 0 }],
            notes: ['Recorded: tasks and records of the stage from the event log. Every run returned the same ' + n0(RPL.rows) + ' rows.']
          },
          {
            say: 'The **plain** join: ' + plain[1] + ' tasks, a median of ' + n0(plain[3]) + ' and a busiest of **' + n0(plain[4]) + '**. That is the hot store plus whatever else shared its bucket. The other eleven tasks finish and wait.',
            tabs: [{ layer: 'RECORDED', name: 'The join stage', c: 'raw', cols: JN.cols, rows: JN.rows.map(function (r) { return [r[0], r[1], n0(r[2]), n0(r[3]), n0(r[4])]; }), trk: 0, chg: [[0, 4]] }],
            notes: ['The plan of this run has no mention of skew: `SortMergeJoin`.']
          },
          {
            say: 'The **adaptive skew join**: **' + adap[1] + '** tasks instead of ' + plain[1] + ', and the busiest read **' + n0(adap[4]) + '**. Spark found the big partition, cut it into pieces, and joined each piece with a copy of the stores. The plan says `skew=true`.',
            tabs: [{ layer: 'RECORDED', name: 'The join stage', c: 'raw', cols: JN.cols, rows: JN.rows.map(function (r) { return [r[0], r[1], n0(r[2]), n0(r[3]), n0(r[4])]; }), trk: 1, chg: [[1, 1], [1, 4]] }],
            notes: ['No code changed. Only the settings, which are on by default. The ' + (Number(adap[1]) - Number(plain[1])) + ' extra tasks are the pieces of the big partition.']
          },
          {
            say: 'The **salted** join: the same ' + salt[1] + ' tasks, but the busiest read **' + n0(salt[4]) + '**. The hot store was spread over four keys. It is better than the plain join, and not as even as the adaptive one: four salts cut the hot store into pieces of about 8 percent of the data each, but the pieces are still hashed into only 12 buckets, and a bucket can hold more than one of them.',
            tabs: [{ layer: 'RECORDED', name: 'The join stage', c: 'raw', cols: JN.cols, rows: JN.rows.map(function (r) { return [r[0], r[1], n0(r[2]), n0(r[3]), n0(r[4])]; }), trk: 2, chg: [[2, 4]] }],
            notes: ['More salts spread it further, and also repeat the small side more times. Choose the number from the size of the hot key.']
          }
        ]
      }),

      B.code({
        id: 'm5-plans', t: 2, src: 'rec', title: 'How the plans say it', file: 'plans', lang: 'text', code: '-- adaptive skew join\n' + PLAD + '\n\n-- salted join\n' + PLSA,
        steps: [
          { say: 'The final plans of the adaptive run and the salted run. Press Next.', lines: null },
          { say: 'In the adaptive plan the join is `SortMergeJoin(skew=true)`. That `skew=true` is the proof that Spark split a partition. It is the first thing to look for in the SQL tab of a job that used to be slow.', lines: G.span('-- adaptive skew join\n' + PLAD + '\n\n-- salted join\n' + PLSA, /skew=true/) },
          { say: 'In the salted plan the join keys are `store_id` and `salt`, and the exchanges hash by both. There is nothing special in the plan. The fix is in the data, and you see it as the second key.', lines: G.span('-- adaptive skew join\n' + PLAD + '\n\n-- salted join\n' + PLSA, /SortMergeJoin \[store_id#1, salt#2\]/, /hashpartitioning\(store_id#1, salt#2/) },
          { say: 'The lower part of each plan is the initial plan that Spark started with, kept for comparison. The upper part is the final plan that ran.', lines: null }
        ],
        note: 'Recorded: `explain()` after the query ran, with adaptive execution on, so that the final plan is shown.'
      }),

      B.cmp({
        id: 'm5-detect', t: 1, src: 'docs', title: 'Where to see skew',
        say: 'Skew leaves marks in four places. Press Next to read them.',
        cols: ['Where', 'What to read', 'What it tells you'],
        hl: 2,
        rows: [
          ['Stages tab, task summary', 'Min, 25th, median, 75th percentile and max of duration, input size and shuffle read', 'A max many times the median is skew'],
          ['Stages tab, task list', 'Sort the tasks by duration or by shuffle read', 'The slowest tasks show the key size and the executor'],
          ['SQL tab', '`SortMergeJoin(skew=true)` or rows output of each operator', 'Adaptive execution split a partition, or the operator that explodes the rows'],
          ['Executors tab', 'Task time and shuffle read for each executor', 'One executor much busier than the others']
        ],
        steps: [
          { upto: 2, say: 'The stage table is the first place. Compare the maximum with the median, for time and for bytes.' },
          { upto: 4, say: 'The SQL tab and the Executors tab confirm it and show which operator and which machine.' }
        ],
        pick: 'In an interview, say **"the maximum against the median in the stage table"**. It is the one measure that works the same in every Spark version and on every platform.'
      }),

      B.talk({
        id: 'm5-aqe', t: 2, src: 'docs', title: 'The adaptive skew join: how it decides',
        say: 'The adaptive skew join is on by default in Spark 4.0.1, so most joins are protected without anyone asking. Press Next for the rules.',
        items: [
          ['When it looks', 'After the map side of a sort-merge join has written its shuffle files, Spark knows the **size of every partition**. It compares each partition with the median.', 'It needs the shuffle first.'],
          ['What counts as skewed', 'A partition is skewed when it is larger than **' + def('spark.sql.adaptive.skewJoin.skewedPartitionFactor') + ' times the median** and larger than **256 MiB** (`skewedPartitionThresholdInBytes`). Both conditions. A big median makes the first one hard to meet. A small table never reaches the second.', 'Both limits must be passed.'],
          ['What it does', 'It splits the skewed partition into pieces of about the advisory size, 64 MiB, using the map outputs. Each piece is joined with a **copy of the matching partition** of the other side. The pieces run in parallel, in separate tasks.', 'Split one side, replicate the other.'],
          ['What it cannot do', 'It applies to **sort-merge and shuffled hash joins**. It does not apply to a group by, a window, a distinct or a sort. And for some outer joins only one side may be split. A skewed aggregation needs a salt or a rewrite.', 'Joins only.'],
          ['When to tune it', 'If a partition is 100 MiB and the median is 5 MiB, it is skewed to you and not to Spark. Lower the threshold, with care: the limits that I lowered for the recording are an example of it.', 'Defaults are for big partitions.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'Do not assume it saved you:', t: 'look for `skew=true` in the final plan, and check that the busiest task really fell. An aggregation or a window is not helped at all.' }
      }),

      B.decide({
        id: 'm5-dec', t: 2, src: 'docs', title: 'Decision: a hot key in a join of two big tables',
        scenario: 'Brewline joins 2 billion orders to a campaign table of 50 million rows on `store_id`. Store s01 holds a third of the orders. The campaign table is 4 GB, too big to broadcast. The job runs on Spark 4 with the defaults, and one task of the join stage runs for an hour while the others take five minutes. You choose.',
        opts: [
          { t: 'Check that the adaptive skew join is on, read the final plan for `skew=true`, and lower the skew thresholds if the partition is big but under 256 MiB', d: 'No code to maintain.', lose: '' },
          { t: 'Write a salt right away, with 100 salt values', d: 'It always works.', lose: 'It repeats the 4 GB campaign table 100 times, and adds code to keep right. Try the setting that already exists first.' },
          { t: 'Add 100 more executors', d: 'More power.', lose: 'The hot partition is one task. More executors only add idle machines.' }
        ],
        pick: 0,
        why: 'Use what Spark provides before you write code. If the final plan has no `skew=true`, the partition is below the thresholds: lower them to the size of your partitions. Salt only when the operation is not a join, or the setting is not enough.',
        when: 'If the hot operation is a window or an aggregation that cannot be added up, the adaptive join does nothing, and a salt, or a separate path for the hot key, is the right fix.'
      }),

      B.bug({
        id: 'm5-bug', t: 2, q: 'This salted join loses a quarter of the orders. Click the line that causes it.',
        file: 'salted_join.py', lang: 'python',
        code: ['k = 4', 'left = orders.withColumn("salt", (F.abs(F.xxhash64("order_id")) % k).cast("int"))', 'right = stores.withColumn("salt", F.explode(F.array(*[F.lit(i) for i in range(k - 1)])))', 'joined = left.join(right, ["store_id", "salt"])'].join('\n'),
        bad: [3],
        hint: 'Which salt values does the big side use, and which does the small side have?',
        why: 'The orders get a salt from 0 to 3, which is **four** values. The stores are repeated for `range(k - 1)`, which is only 0, 1 and 2. An order with salt 3 finds no store in an inner join, so about a quarter of the orders vanish. Both sides must use the **same** set of salt values.',
        fix: ['k = 4', 'left = orders.withColumn("salt", (F.abs(F.xxhash64("order_id")) % k).cast("int"))', 'right = stores.withColumn("salt", F.explode(F.array(*[F.lit(i) for i in range(k)])))', 'joined = left.join(right, ["store_id", "salt"])'].join('\n'),
        cheer: 'Same salts on both sides. Then count the rows against the unsalted join.'
      }),

      B.incident({
        id: 'm5-inc', t: 2, src: 'docs', title: 'Incident: one task runs for three hours', time: '04:50',
        alert: '**The customer lifetime value job is stuck.** 399 of 400 tasks of the last stage finished in minutes. One has run for three hours and its executor is at 100 percent memory. The job groups orders by `customer_id` and collects the order ids into a list.',
        clues: ['About ' + pctS(W0.guest_share) + ' percent of the orders have a NULL customer_id', 'collect_list cannot add up in pieces: every order of a key moves to one task', 'The same job was fine last quarter, before guest checkout launched'],
        opts: [
          { t: 'Find the key with the most rows (NULL), take it out of the grouped path, handle guests separately, and keep the rest', fb: '' },
          { t: 'Give every executor more memory', fb: 'The hot task still holds a quarter of the data on one executor.' },
          { t: 'Switch off adaptive execution', fb: 'It does not help a group by with collect_list. It is not the cause.' },
          { t: 'Retry the job until it passes', fb: 'It will be stuck at the same task every time.' }
        ],
        best: 0,
        why: 'Every guest order has a NULL `customer_id`, and all NULLs are one group, so one task collects a quarter of all orders into one list. In the recorded data that is ' + n0(C.orders_without_customer_id) + ' of ' + n0(C.orders) + ' orders. The fix is in the query: guests are not customers, so they do not belong in a per-customer list.',
        checks: [
          ['Find the hot key', '`GROUP BY customer_id ORDER BY COUNT(*) DESC LIMIT 10` on the input. A NULL on top is the answer.'],
          ['Decide what NULL means', 'Guest orders. A per-customer measure does not apply to them.'],
          ['Fix it', 'Filter out the NULL key before the grouping, and compute guest totals on their own with a count and a sum, which add up in pieces.'],
          ['Guard', 'A check that no key holds more than a set share of the rows, and an alert when the maximum task is 20 times the median.']
        ],
        tell: 'One task of the last stage ran for hours. The job collected the orders of each customer, and all guest orders have a NULL customer id, so a quarter of the data went to one task. I took the NULL key out of the grouping, summed the guests separately, and added a check on the share of the biggest key.',
        prevent: ['Count rows for each key before a grouping that cannot add up in pieces', 'Treat NULL and default keys as their own case', 'Alert on max task against median task']
      }),

      B.quiz({
        id: 'm5-q1', t: 1,
        q: 'What does a stage wait for before the next stage can start?',
        opts: [{ t: 'The average task', fb: 'It waits for all of them.' }, { t: 'The slowest task', fb: '' }, { t: 'The first task', fb: 'Then it would start too early.' }, { t: 'The driver', fb: 'The driver waits as well, but the barrier is the last task.' }],
        ok: 1,
        why: 'All tasks of a stage must finish before the next stage reads their shuffle files. So one hot task decides the time of the stage.'
      }),

      B.quiz({
        id: 'm5-q2', t: 1,
        q: 'In the recording, a count by store showed no skew and a window sum by store did. Why?',
        opts: [{ t: 'The count ran on fewer rows', fb: 'Both read 400,000.' }, { t: 'The count adds up inside each map task first, so little moves; the window moves every row', fb: '' }, { t: 'The window used more memory', fb: 'That is a consequence, not the cause.' }, { t: 'The count ignored the hot store', fb: 'It counted it correctly.' }],
        ok: 1,
        why: 'The count shuffled partial counts. The busiest task read ' + n0(cnt[4]) + ' records. The window shuffled the orders, and the busiest read ' + n0(win[4]) + ', against a median of ' + n0(win[3]) + '.'
      }),

      B.quiz({
        id: 'm5-q3', t: 1,
        q: 'The stage table shows a median task of 20 MB shuffle read and a maximum of 4 GB. What is it?',
        opts: [{ t: 'Healthy', fb: 'The maximum is 200 times the median.' }, { t: 'Skew', fb: '' }, { t: 'Too many partitions', fb: 'That shows as many tiny tasks.' }, { t: 'A slow disk', fb: 'It shows as slow tasks of the same size.' }],
        ok: 1,
        why: 'A maximum 200 times the median is skew. Find the key that holds the 4 GB.'
      }),

      B.quiz({
        id: 'm5-q4', t: 2,
        q: 'Which operation does the adaptive skew join help with?',
        opts: [{ t: 'A window by a hot key', fb: 'It only handles joins.' }, { t: 'A sort-merge join with a hot key', fb: '' }, { t: '`groupBy` with `collect_list`', fb: 'Not a join.' }, { t: '`orderBy` on a skewed column', fb: 'Not a join.' }],
        ok: 1,
        why: 'The plan said `SortMergeJoin(skew=true)` and the busiest task fell from ' + n0(plain[4]) + ' to ' + n0(adap[4]) + ' records.'
      }),

      B.quiz({
        id: 'm5-q5', t: 2,
        q: 'You salt the big side of a join with 8 values. What must you do to the small side?',
        opts: [{ t: 'Nothing', fb: 'The keys would not match.' }, { t: 'Repeat each row once for every salt value, 0 to 7', fb: '' }, { t: 'Give it a random salt', fb: 'A random salt would match by luck.' }, { t: 'Broadcast it', fb: 'It might be a good idea, but it does not make the keys match.' }],
        ok: 1,
        why: 'Every salted order key must find its store, so the store must exist with all 8 salts. The price is eight times the rows on the small side.'
      }),

      B.order({
        id: 'm5-ord', t: 1, q: 'Put the steps of fixing a skewed job in order.',
        items: [
          'Open the stage table and compare the maximum task with the median',
          'Find the key that holds the most rows',
          'Check the cheap fixes: a broadcast, or the adaptive skew join in the final plan',
          'Change the query or salt the key if those do not apply',
          'Run again and compare the maximum with the median',
          'Add an alert on the ratio'
        ],
        why: 'Measure, find the key, try what costs nothing, change the data path last, prove it with the same measure, and keep watching it.'
      }),

      B.qa({
        id: 'qa-skew', t: 1, tag: 'Skew', secs: 90,
        q: 'What is data skew and how do you detect it?',
        pts: ['A few keys hold most rows; one key goes to one task', 'Stage waits for the slowest task', 'Stages tab: max against median of duration, input, shuffle read', 'One executor busy, others idle; one task spills or OOMs', 'Operations that move every row feel it: join, window, collect_list', 'Count and sum add up first, so they mostly do not'],
        short: 'Skew is when a few keys hold far more rows than the rest. After a shuffle every row of a key goes to **one task**, so a hot key makes a hot task, and the stage waits for it, because a stage ends when its slowest task ends. I detect it in the **Stages tab**: the maximum duration, input or shuffle read of a task against the median. A ratio of five or more is suspicious. I also see one executor busy while the others are idle, or one task spilling or running out of memory. It hits operations that must move every row of a key, like joins, windows and `collect_list`. A count or a sum adds up inside each map task first, so it mostly hides it. On the Brewline data, a window over the stores had a busiest task of 163,183 records against a median of about 17,950.',
        fu: [['Where does skew come from?', 'A big customer or store, a NULL or default value, a bulk-load date, or a popular product. It usually appears when the business grows.'], ['Can you have skew without a shuffle?', 'In the input too: a file that is much bigger than the others, or a gzip file. That shows in the first stage.']],
        trap: 'Saying that skew is fixed by more executors.',
        real: 'Tell me about a task that ran forever and how you found the key.'
      }),

      B.qa({
        id: 'qa-fixskew', t: 1, tag: 'Skew', secs: 90,
        q: 'How do you fix skew?',
        pts: ['Avoid the shuffle: broadcast the small side', 'Adaptive skew join: on by default, joins only', 'Salting: spread the key, repeat the small side', 'Separate path for the hot key', 'Change the key or the query: NULLs, two-step aggregation', 'Check with the same measure after the fix'],
        short: 'I try the cheapest fix first. If one side of the join is small, I **broadcast** it, and there is no shuffle at all. Otherwise I rely on the **adaptive skew join**, which is on by default: it splits an oversized partition into pieces and joins each with a copy of the other side, and I check the final plan for `skew=true`. It only works for joins, and only above its thresholds. If that is not enough, or the operation is a window or an aggregation, I **salt** the key: add a number to the key on the big side, and repeat the small side for every number. Or I handle the hot key on a separate path. Often the real fix is in the query, for example taking NULL keys out. Then I check the maximum against the median again.',
        fu: [['What are the risks of salting?', 'The small side is repeated by the number of salts, a random salt can change on a retry, and the salt values must match on both sides or rows are lost.'], ['What do you do with a NULL key?', 'Decide what it means. Often it is a case of its own: filter it out of the grouping and handle it on its own.']],
        trap: 'Jumping to salting without checking what Spark already does.',
        real: 'You have a join with a hot key and Spark 3.5. Walk me through the fix.'
      }),

      B.qa({
        id: 'qa-aqeskew', t: 2, tag: 'Skew', secs: 75,
        q: 'How does the adaptive skew join work, and what are its limits?',
        pts: ['After the map side, Spark knows partition sizes', 'Skewed: factor 5 times the median and over 256 MiB, both', 'Splits the big partition into pieces near 64 MiB', 'Each piece joins a copy of the other side partition', 'Only sort-merge and shuffled hash joins', 'Not for group by, window, sort; check skew=true in the final plan'],
        short: 'After the map side of a sort-merge join has run, adaptive execution knows the size of every shuffle partition. A partition is treated as skewed if it is larger than **5 times the median** and also larger than **256 MiB**, which are the defaults. Spark then splits that partition into pieces of about the advisory size, 64 MiB, using the outputs of the map tasks, and joins each piece with a **copy** of the matching partition of the other side, in separate tasks. The plan then shows `SortMergeJoin(skew=true)`. It only handles joins, so a skewed aggregation or window needs a salt or a rewrite. And with the defaults it ignores partitions under 256 MiB, so on smaller data I may lower the limits. I verify it by reading the final plan and the busiest task.',
        fu: [['What if the other side of the join is also huge for that key?', 'Then copying it for every piece is costly. That is a many-to-many hot key, and it needs a different fix.'], ['How would you test the lowered limits?', 'On the stage table: the busiest task should fall and the number of tasks should grow. The row count must be the same.']],
        trap: 'Saying that adaptive execution fixes all skew.',
        real: 'The adaptive skew join did nothing on my job. What do you check?'
      }),

      B.recap({
        id: 'm5-recap', n: 5, badge: 'Skew Tamer', color: '#FECACA',
        pts: [
          '**Skew** is a hot key. One key goes to one task, and a stage is as slow as its slowest task.',
          'Store **' + s01[0] + '** holds **' + pctS(s01[2]) + ' percent** of the orders. A **count** stayed even (busiest ' + n0(cnt[4]) + ', median ' + n0(cnt[3]) + '). A **window** did not (' + n0(win[4]) + ' against ' + n0(win[3]) + ').',
          'Read the **maximum against the median** in the stage table.',
          'The **adaptive skew join** cut the busiest task from **' + n0(plain[4]) + '** to **' + n0(adap[4]) + '** and ran ' + adap[1] + ' tasks. Look for `skew=true`.',
          'A **salt** cut it to **' + n0(salt[4]) + '**. Both sides must use the same salt values.',
          'Try in order: **broadcast, adaptive skew join, salt, separate path, change the key**.'
        ],
        lines: [
          'I compare the maximum task with the median.',
          'I find the key before I choose the fix.',
          'I check for skew=true, and I count the rows after a salt.'
        ]
      })
    ]
  });
})();
