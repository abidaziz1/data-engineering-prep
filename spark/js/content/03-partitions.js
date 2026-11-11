/* Mission 3: partitions, tasks and shuffles. How many partitions a read makes, what a stage and a task are, what a shuffle moves, repartition against coalesce, and how
   many shuffle partitions to ask for. Counts are read from the event log of a real Spark 4.0.1 in local mode with four cores. */
(function () {
  var B = LAB.b, G = LAB.get;
  var RD = G.table('parts.read'), SH = G.table('parts.shuffle'), AN = G.table('world.anatomy'), SZ = G.counts('parts.sizes'), OPS = G.table('parts.operations');
  var DEF = G.table('conf.defaults'), W0 = G.counts('world.summary');
  var PY = G.file('code/partitions.py');
  var REP = G.lines(PY, G.at(PY, /^def repartition_demo/), G.at(PY, /'plan_repartition_by'/));
  var SHUF = G.lines(PY, G.at(PY, /^def shuffle_settings/), G.at(PY, /return results/));
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  var conf = function (k) { var r = DEF.rows.filter(function (x) { return x[0] === k; })[0]; if (!r) throw new Error('no setting ' + k); return r[1]; };
  var key14 = Object.keys(SZ).filter(function (k) { return /after_repartition_14/.test(k); })[0];
  var HASHED = SZ[key14];
  G.expect(conf('spark.sql.shuffle.partitions') === '200' && conf('spark.sql.adaptive.enabled') === 'true', 'the defaults of Spark 4.0.1');
  G.expect(RD.rows[0][1] === 4 && RD.rows[1][1] === 14 && SH.rows[0][1] === 200 && SH.rows[2][1] === 1, 'partition counts of the recording');
  G.expect(HASHED.length < 14 && SZ.repartition_3.length === 3, 'hash partitioning leaves some partitions empty');
  var spread = function (a) { return Math.max.apply(null, a) - Math.min.apply(null, a); };
  var biggest = HASHED.indexOf(Math.max.apply(null, HASHED));
  var top = function (key, a, b) { return G.text(key).split('\n').slice(a, b).join('\n'); };
  var PLANS3 = '-- coalesce(3)\n' + top('parts.plan_coalesce', 1, 4) + '\n\n-- repartition(3)\n' + top('parts.plan_repartition', 1, 3) + '\n\n-- repartition(6, "store_id")\n' + top('parts.plan_repartition_by', 1, 3);

  LAB.addChapter({
    id: 'm3', n: 3, title: 'Partitions, tasks and shuffles', short: 'Shuffle', blurb: 'How data is cut up, what a task is, what moves in a shuffle, and how many partitions to ask for', minutes: 55,
    focus: ['ing', 'stg'],
    goals: [
      'Say where **partitions** come from: files, a shuffle, or you.',
      'Explain how many **input partitions** a read makes, and what `maxPartitionBytes` does.',
      'Read a **stage** as a set of tasks, and say why a shuffle cuts a stage.',
      'Explain what happens in a **shuffle**: map side, shuffle files, reduce side.',
      'Choose between **repartition** and **coalesce**, and say what each costs.',
      'Say what `spark.sql.shuffle.partitions` is, why 200 is often wrong, and how adaptive execution helps.'
    ],
    say: 'Mission 3 is about the unit of work. Spark cuts data into partitions, runs one task for each, and moves data between partitions in a shuffle. Almost every performance problem is one of three things: too few partitions, too many partitions, or one partition that is much bigger than the rest. I ran the same query with different settings and read the number of tasks, and the records in each task, from the event log. Then you do the same arithmetic in a lab.',
    scenes: [
      B.talk({
        id: 'm3-where', t: 1, src: 'docs', title: 'Where partitions come from',
        say: 'A DataFrame is a set of partitions. The number is not fixed: it changes at every step that reads or moves data. Press Next for the four sources.',
        items: [
          ['A file read', 'Spark cuts the input files into pieces of up to `spark.sql.files.maxPartitionBytes` (128 MiB by default) and packs small files together. A splittable file, like Parquet, can be cut inside. A single gzip CSV cannot, and stays one partition.', 'Files and their size decide.'],
          ['A shuffle', 'After a `groupBy`, a `join` or a `distinct`, the number of partitions is `spark.sql.shuffle.partitions`, which is **200** by default. Adaptive execution can merge small ones.', 'A setting decides: 200 by default.'],
          ['You', '`repartition(n)` and `repartition(n, column)` shuffle into exactly `n` partitions. `coalesce(n)` merges neighbours into fewer, with no shuffle. `repartitionByRange` cuts by ranges of a column.', 'You decide, at a cost.'],
          ['Other sources', '`spark.range(n)` and `parallelize` use the default parallelism. A stream makes partitions from its source. A table in Delta or Iceberg is read like files.', 'Each source has its own rule.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'Remember:', t: 'one task works on one partition, and one core runs one task at a time. So partitions and cores together decide how fast a stage can be.' }
      }),

      B.rows({
        id: 'm3-read', t: 1, src: 'rec', title: 'How many partitions does a read make?',
        steps: [
          {
            say: 'The Brewline orders are ' + W0.orders_files + ' Parquet files of about ' + Math.round(W0.orders_kb / W0.orders_files) + ' KB each. I read them with three values of `maxPartitionBytes` and asked Spark how many partitions the DataFrame has. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Partitions of the orders for three settings', c: 'raw', cols: RD.cols, rows: RD.rows, trk: 0 }],
            notes: ['Recorded: `spark.read.parquet(path).rdd.getNumPartitions()` with the setting changed in the session. The machine has four cores.']
          },
          {
            say: 'At the default of 128 MiB you might expect **one** partition, since the whole table is 6 MB. Spark makes **' + RD.rows[0][1] + '**. It also looks at the number of cores: it avoids putting everything in one task, and cuts the data to give about one partition for each core.',
            tabs: [{ layer: 'RECORDED', name: 'Partitions of the orders for three settings', c: 'raw', cols: RD.cols, rows: RD.rows, trk: 0, chg: [[0, 1]] }],
            notes: ['From the Spark source code: the split size is the smaller of `maxPartitionBytes` and the larger of the file open cost and the data per core. Each file also counts for an "open cost" of 4 MiB.']
          },
          {
            say: 'With 1 MiB, each of the ' + W0.orders_files + ' files has its own partition: **' + RD.rows[1][1] + '**. With 256 KiB, files are cut **inside**, so you get **' + RD.rows[2][1] + '**. Parquet can be cut at row groups, so a file can be shared by several tasks.',
            tabs: [{ layer: 'RECORDED', name: 'Partitions of the orders for three settings', c: 'raw', cols: RD.cols, rows: RD.rows, trk: 2, chg: [[1, 1], [2, 1]] }],
            notes: ['On a real table the files are far bigger, so the 128 MiB default is the one that cuts them. That is why it is rarely changed.']
          }
        ]
      }),

      B.widget({ id: 'm3-lab', kind: 'tasks', t: 1, src: 'rec', title: 'Lab: tasks, cores and waves' }),

      B.rows({
        id: 'm3-anatomy', t: 1, src: 'rec', title: 'Anatomy of a count: two stages',
        steps: [
          {
            say: 'The smallest wide query: count the orders by a key. I ran it and read the stages from the event log. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'The stages of one group by', c: 'raw', cols: AN.cols, rows: AN.rows, trk: 0 }],
            notes: ['Recorded: stage and task counts from the event log of Spark ' + G.counts('submit.version').spark + '.']
          },
          {
            say: '**Stage 1** has **' + AN.rows[0][1] + '** tasks, one for each input partition. Each reads its files and counts **inside the task**. That is the partial aggregation: it keeps a small count for every store, not the orders.',
            tabs: [{ layer: 'RECORDED', name: 'The stages of one group by', c: 'raw', cols: AN.cols, rows: AN.rows, trk: 0, chg: [[0, 1]] }],
            notes: ['A task that reads 100,000 orders sends only twelve rows on, one for each store.']
          },
          {
            say: 'Between the stages is the shuffle. The partial counts are written to local files and fetched by **stage 2**, which has **' + AN.rows[1][1] + '** task here. It adds up what stage 1 sent. The cut between the two stages is exactly the Exchange of the plan.',
            tabs: [{ layer: 'RECORDED', name: 'The stages of one group by', c: 'raw', cols: AN.cols, rows: AN.rows, trk: 1, chg: [[1, 1]] }],
            notes: ['Why one task and not 8 or 200? Adaptive execution looked at the tiny size of the shuffle and merged the partitions. The next screens show it.']
          }
        ]
      }),

      B.flow({
        id: 'm3-dag', t: 1, src: 'docs', title: 'Job, stages and tasks', g: 'dag', legend: true,
        steps: [
          { say: 'Here is the same anatomy as a picture. Press Next to walk down it.', cap: 'Job, stages, tasks.' },
          { say: 'Step 1. You call an action, here a count. Spark starts a **job**.', on: ['g1'], focus: ['d_act', 'd_job'], tags: ['tg_job'], cap: 'An action starts a job.' },
          { say: 'Step 2. The scheduler looks at the plan and finds the first stage: everything that needs no data movement. Read, filter, add up inside each task.', on: ['g2'], focus: ['d_job', 'd_st1'], cap: 'The first stage is all the narrow steps.' },
          { say: 'Step 3. A shuffle comes, because rows of the same key must meet. The plan is **cut** here, and the second stage starts. A stage cannot begin until every task of the one before it has finished.', on: ['g3'], focus: ['d_st1', 'd_st2'], tags: ['tg_stage'], cap: 'A shuffle cuts a stage.' },
          { say: 'Step 4. Stage 1 is split into tasks, one for each input partition. The scheduler gives them to the executors as cores become free.', on: ['g4'], focus: ['d_st1', 'd_t1'], tags: ['tg_tsk'], cap: 'One task for each input partition.' },
          { say: 'Step 5. Stage 2 is split into tasks too, one for each partition **after the shuffle**. This number is not the number of input files. It comes from `spark.sql.shuffle.partitions`, unless adaptive execution changes it.', on: ['g5'], focus: ['d_st2', 'd_t2'], cap: 'One task for each shuffle partition.' },
          { say: 'Step 6. The last stage returns the result to the driver, or writes files. If it returns, a small result is fine and a large one will run the driver out of memory.', on: ['g6'], focus: ['d_t2', 'd_res'], cap: 'The result goes to the driver or to files.' }
        ]
      }),

      B.flow({
        id: 'm3-shuffle', t: 1, src: 'docs', title: 'Inside a shuffle', g: 'shuffle', legend: true,
        steps: [
          { say: 'A shuffle is the only step where every task talks to every other. Three map tasks and three reduce tasks make nine paths. Press Next to follow the rows.', cap: 'Three map tasks, three reduce tasks.' },
          { say: 'Step 1. The tasks of the first stage, the **map side**, read their partitions. For each row they compute which reduce partition it belongs to: the hash of the key, divided by the number of partitions.', on: ['w1', 'w2', 'w3'], focus: ['m1', 'm2', 'm3', 'f1', 'f2', 'f3'], tags: ['tg_w'], cap: 'The map side writes one slice for each reducer.' },
          { say: 'Each map task writes its rows into **shuffle files on its own local disk**, one slice for every reduce task. Nothing leaves the machine yet. This is why a shuffle needs fast local disks, and why it is a cost even if the data fits in memory.', on: ['w1', 'w2', 'w3'], focus: ['f1', 'f2', 'f3'], cap: 'Shuffle files sit on local disks.' },
          { say: 'Step 2. The **reduce side** starts after every map task has finished. Reduce task 1 asks all three map tasks for its slice, and reads them over the network. So do tasks 2 and 3. The orange blocks show the nine paths.', on: ['f11', 'f12', 'f13', 'f21', 'f22', 'f23', 'f31', 'f32', 'f33'], focus: ['f1', 'f2', 'f3', 'r1', 'r2', 'r3'], tags: ['tg_f'], cap: 'Every reducer reads from every map task.' },
          { say: 'Now every row of one key is in one reduce task. It can add them up, or join them, or sort them. The cost was the disk write, the network read, and the wait for the slowest map task.', on: ['f11', 'f21', 'f31'], focus: ['r1', 'f1', 'f2', 'f3'], cap: 'One reducer, three slices.' },
          { say: 'With adaptive execution Spark sees the size of every slice after the map side. If the slices are small it **merges** neighbouring reduce partitions into fewer, fuller tasks. That is what turned 200 into 1 in the recording you are about to see.', focus: ['r1', 'r2', 'r3'], tags: ['tg_aqe'], cap: 'Adaptive execution merges small slices.' }
        ]
      }),

      B.rows({
        id: 'm3-sh', t: 1, src: 'rec', title: 'The same group by with three settings',
        steps: [
          {
            say: 'I grouped the orders by store and summed the total, three times: with 200 shuffle partitions and adaptive execution off, with 8, and with 200 and adaptive on. I read the tasks of the stage **after** the shuffle. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'The stage after the shuffle', c: 'raw', cols: SH.cols, rows: SH.rows, trk: 0 }],
            notes: ['Recorded: the tasks of the second stage in the event log. "Records" are the shuffle records that a task read.']
          },
          {
            say: '**' + SH.rows[0][1] + ' tasks** read **' + SH.rows[0][5] + ' records** in all. The median task read ' + SH.rows[0][3] + '. Most of the tasks had nothing to do. Each task still costs time to schedule, to launch and to report back. This is the setting you get if you change nothing.',
            tabs: [{ layer: 'RECORDED', name: 'The stage after the shuffle', c: 'raw', cols: SH.cols, rows: SH.rows, trk: 0, chg: [[0, 1], [0, 3]] }],
            notes: ['The ' + SH.rows[0][5] + ' records are what is left after each of the map tasks added up its own rows: 4 tasks times 12 stores.']
          },
          {
            say: 'With **' + SH.rows[1][1] + '** partitions the work fits the data: ' + SH.rows[1][1] + ' tasks, a median of ' + SH.rows[1][3] + ' and a maximum of ' + SH.rows[1][4] + '. Twelve stores do not spread evenly into eight buckets, but the stage is short.',
            tabs: [{ layer: 'RECORDED', name: 'The stage after the shuffle', c: 'raw', cols: SH.cols, rows: SH.rows, trk: 1, chg: [[1, 1]] }],
            notes: ['A setting for tiny data. It would be wrong for a large job: each of 8 tasks would hold far too much.']
          },
          {
            say: 'With 200 partitions and **adaptive execution on**, Spark ran **' + SH.rows[2][1] + ' task**. It measured the shuffle, saw that every slice was tiny, and merged all 200 into one. The setting did not change. The plan did.',
            tabs: [{ layer: 'RECORDED', name: 'The stage after the shuffle', c: 'raw', cols: SH.cols, rows: SH.rows, trk: 2, chg: [[2, 1]] }],
            notes: ['Adaptive execution merges partitions up to `advisoryPartitionSizeInBytes`, which is ' + conf('spark.sql.adaptive.advisoryPartitionSizeInBytes').replace('b', ' bytes') + ' (64 MiB) by default.']
          }
        ]
      }),

      B.code({
        id: 'm3-code', t: 2, src: 'rec', title: 'How the three runs were made', file: 'partitions.py', lang: 'python', code: SHUF,
        steps: [
          { say: 'This is the function that made the three runs. Press Next.', lines: null },
          { say: 'It loops over three pairs of settings. `spark.sql.shuffle.partitions` is the number of partitions after a shuffle, and `spark.sql.adaptive.enabled` switches adaptive execution on and off. Both are **runtime** settings: they can change between two queries in the same session.', lines: G.span(SHUF, /for label, parts, aqe/, /spark\.conf\.set\('spark\.sql\.adaptive\.enabled', aqe\)/) },
          { say: '`setJobGroup` gives the job a name. That is how I tied each line of the event log back to the run that started it.', lines: G.span(SHUF, /setJobGroup/) },
          { say: 'The query is a group by with a sum, ended by `collect()`, an action. The result is twelve rows, so collecting is fine.', lines: G.span(SHUF, /groupBy\('store_id'\)/) }
        ],
        note: 'Recorded: this function ran against the real Spark. The settings are restored to 8 and true at the end, so that the next experiment starts clean.'
      }),

      B.rows({
        id: 'm3-rep', t: 1, src: 'rec', title: 'repartition and coalesce: what each does to the sizes',
        steps: [
          {
            say: 'Two ways to change the number of partitions. I repartitioned the orders into 14 by the day, and looked at the rows in each partition. Only **' + HASHED.length + '** of the 14 have rows. Hashing 14 different days into 14 buckets sends several days to the same bucket and leaves others empty. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Rows in the non-empty partitions after repartition(14, "dt")', c: 'raw', cols: ['partition', 'rows'], rows: HASHED.map(function (r, i) { return ['#' + (i + 1), n0(r)]; }), trk: biggest }],
            notes: ['Hash partitioning gives an even spread only when there are many more distinct keys than partitions. With 14 keys and 14 buckets it does not.']
          },
          {
            say: '`coalesce(3)` joins neighbours without a shuffle, so it is cheap, and the sizes stay uneven: **' + SZ.coalesce_3.map(n0).join(', ') + '**. `repartition(3)` shuffles every row to a new place with a round robin, and the sizes are almost **equal**: **' + SZ.repartition_3.map(n0).join(', ') + '**.',
            tabs: [{ layer: 'RECORDED', name: 'Rows in each of 3 partitions', c: 'raw', cols: ['how', 'partition 1', 'partition 2', 'partition 3', 'largest minus smallest'], rows: [['coalesce(3)'].concat(SZ.coalesce_3.map(n0), [n0(spread(SZ.coalesce_3))]), ['repartition(3)'].concat(SZ.repartition_3.map(n0), [n0(spread(SZ.repartition_3))])], trk: 1 }],
            notes: ['Recorded: `spark_partition_id()` counted for each partition.']
          },
          {
            say: 'The plans show why. `coalesce` is a `Coalesce` operator on top of the old shuffle, with no new exchange. `repartition(3)` is a new `Exchange RoundRobinPartitioning(3)`. `repartition(6, store_id)` is an `Exchange hashpartitioning`.',
            tabs: [{ layer: 'RECORDED', name: 'Operators in the plans', c: 'raw', cols: ['call', 'new operator', 'a shuffle?'], rows: [['coalesce(3)', 'Coalesce 3', 'no'], ['repartition(3)', 'Exchange RoundRobinPartitioning(3)', 'yes'], ['repartition(6, "store_id")', 'Exchange hashpartitioning(store_id, 6)', 'yes']], trk: 0 }],
            notes: ['Read the full plans in the next screen.']
          }
        ]
      }),

      B.code({
        id: 'm3-repcode', t: 2, src: 'rec', title: 'The three plans', file: 'explain', lang: 'text', code: PLANS3,
        steps: [
          { say: 'The top of each plan, with the file scan cut off. Press Next.', lines: null },
          { say: '`coalesce(3)`: a `Coalesce 3` on top of an `Exchange` that was already there, from the earlier `repartition(14, dt)`. No new exchange was added.', lines: G.span(PLANS3, /Coalesce 3/, /Exchange hashpartitioning\(dt/) },
          { say: '`repartition(3)`: a new `Exchange RoundRobinPartitioning(3)`. Every row is sent to a partition in turn, so the sizes are even.', lines: G.span(PLANS3, /RoundRobinPartitioning/) },
          { say: '`repartition(6, "store_id")`: an `Exchange hashpartitioning(store_id, 6)`. All rows of one store go to one partition, which is what you want before a write by store, and what you do not want if one store is huge.', lines: G.span(PLANS3, /hashpartitioning\(store_id/) }
        ],
        note: 'The `REPARTITION_BY_NUM` tag is the reason for the exchange: you asked for it, so the optimiser may not remove it.'
      }),

      B.cmp({
        id: 'm3-which', t: 1, src: 'docs', title: 'repartition, coalesce, repartitionByRange: which one',
        say: 'Three calls that change the partitions. Press Next to read when each one is the right tool.',
        cols: ['Call', 'What it does', 'Cost', 'Use it when'],
        hl: 3,
        rows: [
          ['`repartition(n)`', 'Shuffles into exactly `n` even partitions, round robin', 'A full shuffle', 'You need more partitions, or even ones, before a heavy step'],
          ['`repartition(n, col)`', 'Shuffles by the hash of a column', 'A full shuffle', 'Rows of one key must be together: before a write by folder, or a join'],
          ['`repartitionByRange(n, col)`', 'Shuffles by ranges of a column, sampled', 'A full shuffle and a sampling job', 'You want sorted ranges, for example to write sorted files'],
          ['`coalesce(n)`', 'Merges neighbours into fewer partitions', 'No shuffle. It can leave the sizes uneven', 'You only need fewer partitions, for example before a small write']
        ],
        steps: [
          { upto: 3, say: 'Three calls that shuffle. Pay for them when the shuffle buys you something: even sizes, or keys together.' },
          { upto: 4, say: '`coalesce` is cheap, and it has one trap. It also shrinks the parallelism of everything **before it in the same stage**.' }
        ],
        pick: '`coalesce(1)` at the end of a long query makes the **whole stage upstream run in one task**, because there is no shuffle to keep it parallel. If you need one file and a heavy query, use `repartition(1)`: the work stays parallel, and only the last step is single.'
      }),

      B.talk({
        id: 'm3-rules', t: 1, src: 'docs', title: 'How many partitions: rules of thumb',
        say: 'There is no magic number, but there are rules that work. Press Next for each.',
        items: [
          ['Size of a partition', 'Aim for partitions of about **100 to 200 MB** of data at each step. Smaller partitions spend their time on overhead. Bigger ones spill to disk or run out of memory. The 128 MiB default of `maxPartitionBytes` is in this range.', '100 to 200 MB each.'],
          ['More than the cores', 'Have **at least as many partitions as cores**, and usually 2 to 3 times as many, so that a slow task does not leave cores idle at the end of a stage. The Spark tuning guide gives 2 to 3 tasks for each core.', '2 to 3 tasks for each core.'],
          ['Shuffle partitions', 'Divide the size of the **shuffled data** by 128 MiB. A job that shuffles 500 GB needs thousands, not 200. A job that shuffles 50 MB needs one. With adaptive execution, set it **high** and let Spark merge down, to an advisory size of 64 MiB.', 'Size of the shuffle divided by 128 MiB.'],
          ['Do not chase an exact number', 'Look at the stage table: the median and maximum records and bytes of the tasks, and whether tasks spill. A change that makes the maximum close to the median is a good change.', 'Read the tasks, not the setting.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'The default of 200 is a compromise:', t: 'too many for small jobs, far too few for big ones. In both cases you see it in the stage table: empty tasks, or tasks that spill.' }
      }),

      B.decide({
        id: 'm3-dec', t: 2, src: 'docs', title: 'Decision: shuffle partitions for a 500 GB shuffle',
        scenario: 'A nightly Brewline job joins and aggregates a year of orders. The shuffle moves about 500 GB. It runs on 100 cores, with adaptive execution on. The default `spark.sql.shuffle.partitions` is 200, and the job spills heavily. You choose a setting.',
        opts: [
          { t: 'Keep 200 and give the executors twice the memory', d: 'Nothing else to change.', lose: 'Each of 200 tasks gets 2.5 GB of shuffle data. More memory only hides the problem and raises the bill.' },
          { t: 'Set it to about 4,000 and let adaptive execution merge the small ones', d: '500 GB divided by 128 MiB is about 4,000 tasks, 40 for each core.', lose: '' },
          { t: 'Set it to 20 to make the tasks bigger', d: 'Fewer tasks, less scheduling.', lose: 'Each task would hold 25 GB. That spills, or fails.' }
        ],
        pick: 1,
        why: 'Size the partitions, not the cluster: 500 GB at 128 MiB each is about 4,000 partitions. Adaptive execution merges partitions that turn out small, so a high value costs little. Check the stage table afterwards for spill and for the maximum against the median.',
        when: 'If the data is small, like in the lessons, the default plus adaptive execution is fine. If a few keys are huge, no partition count helps, and mission 5 is the answer.'
      }),

      B.bug({
        id: 'm3-bug', t: 1, q: 'A nightly export must write one CSV file of the paid orders. On a big day it ran for hours on a single core, although the cluster has 100. Click the line that causes it.',
        file: 'export.py', lang: 'python',
        code: ['orders = spark.read.parquet("/lake/orders")', 'paid = orders.filter(F.col("status") == "PAID").select("order_id", "store_id", "total_cents")', 'paid.coalesce(1).write.mode("overwrite").csv("/out/paid_orders")'].join('\n'),
        bad: [3],
        hint: 'What does coalesce(1) do to the stage before the write?',
        why: '`coalesce(1)` adds no shuffle, so nothing separates the write from the read and the filter before it. They are folded into **one task**, and one core reads every input partition. `repartition(1)` keeps the read and the filter in many tasks, and shuffles only the result into one partition for the write.',
        fix: ['orders = spark.read.parquet("/lake/orders")', 'paid = orders.filter(F.col("status") == "PAID").select("order_id", "store_id", "total_cents")', 'paid.repartition(1).write.mode("overwrite").csv("/out/paid_orders")'].join('\n'),
        cheer: 'Shuffle to one at the end. Do not shrink the work.'
      }),

      B.incident({
        id: 'm3-inc', t: 2, src: 'docs', title: 'Incident: 100 cores, one busy', time: '03:40',
        alert: '**The nightly job reads a partner file and has run for four hours.** The Spark UI shows the first stage with one task, and the other 99 cores are idle. Last year the file was small.',
        clues: ['The partner sends one file called orders.csv.gz', 'The first stage has exactly one task', 'The file is now 40 GB compressed'],
        opts: [
          { t: 'Ask the partner for several files or for Parquet, and until then read the file once and write it as Parquet', fb: '' },
          { t: 'Add 100 more executors', fb: 'There is one task. More cores change nothing.' },
          { t: 'Set `spark.sql.shuffle.partitions` to 2000', fb: 'The problem is before the first shuffle.' },
          { t: 'Cache the file', fb: 'Caching needs a read first, and the read is the problem.' }
        ],
        best: 0,
        why: 'A gzip file cannot be cut into pieces that are read independently: to read the middle, you have to decompress from the start. So Spark reads it with one task. It is a property of the compression, not of Spark. Splittable inputs (several files, or Parquet, or bzip2) give many tasks.',
        checks: [
          ['Look at the first stage', 'One task for 40 GB confirms a file that cannot be split.'],
          ['Check the extension', '`.gz` on a text format (CSV, JSON) is not splittable. Parquet with gzip inside is, because each row group is compressed on its own.'],
          ['Fix the input', 'Ask for several smaller files or Parquet. If you cannot, read it once, `repartition`, and write Parquet.'],
          ['Guard', 'Alert when the first stage has fewer tasks than cores.']
        ],
        tell: 'The first stage had one task for a 40 GB gzip CSV, so 99 cores were idle. A gzip text file cannot be split. I read it once, repartitioned it and wrote Parquet, and asked the partner for several files from now on.',
        prevent: ['Prefer Parquet or several files from partners', 'Alert on a first stage with fewer tasks than cores', 'Never leave a gzip text file as the long-term format']
      }),

      B.quiz({
        id: 'm3-q1', t: 1,
        q: 'What is the default value of `spark.sql.shuffle.partitions`?',
        opts: [{ t: '8', fb: 'That was the setting of the recording, to keep small runs small.' }, { t: '200', fb: '' }, { t: '2000', fb: 'That is a common value for big jobs, not the default.' }, { t: 'The number of cores', fb: 'That is the default parallelism of RDDs, not of shuffles.' }],
        ok: 1,
        why: 'The recorded session reported ' + conf('spark.sql.shuffle.partitions') + ' for a fresh session. It is too many for small data and too few for large data.'
      }),

      B.quiz({
        id: 'm3-q2', t: 1,
        q: 'The same group by ran with 200 shuffle partitions. Adaptive execution was on, and the stage after the shuffle had ' + SH.rows[2][1] + ' task. Why?',
        opts: [
          { t: 'Spark ignored the setting', fb: 'It used it as a starting point.' },
          { t: 'Adaptive execution measured the tiny shuffle and merged the partitions', fb: '' },
          { t: 'There was only one core', fb: 'The machine had four.' },
          { t: 'The query failed', fb: 'It succeeded.' }
        ],
        ok: 1,
        why: 'After the map side, Spark knew that the whole shuffle was ' + SH.rows[2][5] + ' records. It merged the 200 small partitions up to the advisory size of 64 MiB, and ran one task.'
      }),

      B.quiz({
        id: 'm3-q3', t: 1,
        q: 'You want fewer partitions before a small write, and you do not want a shuffle. Which call?',
        opts: [{ t: '`repartition(2)`', fb: 'It shuffles.' }, { t: '`coalesce(2)`', fb: '' }, { t: '`repartitionByRange(2, "dt")`', fb: 'It shuffles, and samples.' }, { t: '`cache()`', fb: 'Caching does not change partitions.' }],
        ok: 1,
        why: '`coalesce` merges neighbours without a shuffle. Its price: uneven sizes, and a smaller parallelism for the stage before it.'
      }),

      B.quiz({
        id: 'm3-q4', t: 1,
        q: 'Which of these operations adds an `Exchange` to the plan, in the recording?',
        opts: [{ t: '`filter` and `select`', fb: 'The recording shows ' + OPS.rows[0][1] + ' exchanges.' }, { t: '`groupBy` and `sum`', fb: '' }, { t: '`withColumn` with an arithmetic expression', fb: 'A narrow operation.' }, { t: '`union`', fb: 'It puts the partitions side by side, with no shuffle.' }],
        ok: 1,
        why: 'The group by had ' + OPS.rows[1][1] + ' exchange. A filter and select had ' + OPS.rows[0][1] + '. Any step that needs rows from other partitions shuffles.'
      }),

      B.quiz({
        id: 'm3-q5', t: 2,
        q: 'A stage has 5,000 tasks of one second each, on 100 cores. Roughly how many waves does it run?',
        opts: [{ t: '5', fb: 'That is 500 tasks.' }, { t: '50', fb: '' }, { t: '500', fb: 'That would be one core.' }, { t: '1', fb: 'There are 50 times more tasks than cores.' }],
        ok: 1,
        why: '5,000 tasks divided by 100 cores is 50 waves. That is fine if every task is short. The risk is not the number of waves, but one task that is much longer than the rest.'
      }),

      B.order({
        id: 'm3-ord', t: 1, q: 'Put what happens in a shuffle in order.',
        items: [
          'The map tasks of the first stage read their partitions',
          'Each row is given the number of its reduce partition, from the hash of its key',
          'Each map task writes its rows into shuffle files on its local disk',
          'The first stage finishes',
          'Each reduce task of the second stage fetches its slice from every map task',
          'The reduce tasks work on rows that now sit together'
        ],
        why: 'Write first, then wait for the whole stage, then read. That wait is why a skewed map side delays everything after it.'
      }),

      B.qa({
        id: 'qa-repart', t: 1, tag: 'Partitions', secs: 75,
        q: 'What is the difference between repartition and coalesce?',
        pts: ['repartition = full shuffle, even sizes, can go up or down', 'coalesce = merge neighbours, no shuffle, only down', 'coalesce can leave sizes uneven', 'coalesce(1) shrinks the whole stage upstream', 'repartition(n, col) puts a key together', 'Check the plan: Exchange or Coalesce'],
        short: '`repartition` does a **full shuffle** to exactly the number I ask for, with even sizes, and it can raise or lower the number. With a column it hashes by the column, so all rows of a key land together. `coalesce` only **merges** neighbouring partitions, with no shuffle, so it is cheap and can only lower the number, and the sizes can stay uneven. The trap is `coalesce` to a very small number: with no shuffle, the whole stage before it runs with that few tasks, so I use `repartition(1)` when I need a single file after heavy work. In the plan I see an `Exchange` for repartition and a `Coalesce` for coalesce.',
        fu: [['When would you raise the number of partitions?', 'When the stage table shows few tasks that are big, or tasks that spill. Or to use all the cores of a cluster.'], ['What does repartition by a column cost for a skewed key?', 'The partition with the hot key is huge. Mission 5 covers that.']],
        trap: 'Saying that coalesce is always better because it avoids a shuffle.',
        real: 'Tell me about a write that produced one file or many tiny files, and how you fixed it.'
      }),

      B.qa({
        id: 'qa-nparts', t: 1, tag: 'Partitions', secs: 90,
        q: 'How do you choose the number of partitions?',
        pts: ['Aim for 100 to 200 MB per partition', 'At least the cores, usually 2 to 3 times', 'Shuffle partitions: shuffle size / 128 MiB', 'With adaptive execution: set high, let it merge', 'Look at the stage table: median and max, spill', 'Skew is not fixed by a number'],
        short: 'I think in **size**, not in a magic number. I aim for partitions of 100 to 200 MB at each step, and at least as many as there are cores, usually two or three times more, so that a slow task does not leave cores idle. For a shuffle I take the size of the shuffled data divided by 128 MiB: a 500 GB shuffle wants thousands of partitions and the default 200 is far too few. With adaptive execution on, I set it high and let Spark merge the small ones, to its advisory size. Then I check the stage table. If the median and the maximum are close and nothing spills, it is right. If one task is much bigger, it is skew, and no number fixes that.',
        fu: [['What does `spark.default.parallelism` do?', 'It sets the default for RDD operations and for `parallelize`. DataFrame shuffles use `spark.sql.shuffle.partitions`.'], ['Why not one huge number always?', 'Tasks have a fixed cost. Millions of tiny tasks make the scheduler the bottleneck.']],
        trap: 'Giving a number without saying how big the data is.',
        real: 'You have 2 TB to shuffle on 200 cores. Walk me through your settings.'
      }),

      B.qa({
        id: 'qa-shuffle', t: 1, tag: 'Partitions', secs: 75,
        q: 'What is a shuffle and why is it expensive?',
        pts: ['Rows move between partitions so that keys meet', 'Wide operations: groupBy, join, distinct, orderBy, repartition', 'Map side writes shuffle files to local disk', 'Reduce side fetches over the network', 'Cuts a stage; waits for the slowest task', 'Reduce it: filter early, broadcast, partial aggregation'],
        short: 'A shuffle **moves rows between partitions** so that rows with the same key end up in the same place. `groupBy`, `distinct`, `orderBy`, a join without a broadcast and `repartition` all need one. The tasks of the first stage write their rows into **shuffle files on local disk**, one slice for each reduce task. When the stage is done, each reduce task fetches its slice from every map task over the network. It is expensive because of the disk writes, the network, the serialisation, and the wait for the slowest map task. It also cuts the plan into stages. I reduce it by filtering and selecting early, by broadcasting small tables, and by relying on partial aggregation.',
        fu: [['What is an external shuffle service?', 'A process that keeps the shuffle files after an executor leaves, so dynamic allocation can remove executors safely. Spark on Kubernetes can use shuffle tracking instead.'], ['How do you see a shuffle in the UI?', '"Shuffle write" and "shuffle read" columns in the Stages tab, and the Exchange nodes in the SQL tab.']],
        trap: 'Saying that a shuffle only happens in joins.',
        real: 'Show me a plan and tell me which shuffles you would remove.'
      }),

      B.recap({
        id: 'm3-recap', n: 3, badge: 'Partition Planner', color: '#FDE68A',
        pts: [
          'A **task** works on one **partition**. Partitions come from **files**, from a **shuffle**, or from **you**.',
          'The read made **' + RD.rows[0][1] + '** partitions at the default, **' + RD.rows[1][1] + '** at 1 MiB and **' + RD.rows[2][1] + '** at 256 KiB.',
          'A shuffle writes **shuffle files** on map-side disks, and every reduce task reads from every map task. It **cuts a stage**.',
          'The default is **' + conf('spark.sql.shuffle.partitions') + '** shuffle partitions: ' + SH.rows[0][1] + ' tasks for ' + SH.rows[0][5] + ' records. Adaptive execution ran **' + SH.rows[2][1] + '**.',
          '`repartition` **shuffles** to even sizes. `coalesce` **merges** with no shuffle, and `coalesce(1)` shrinks the whole stage.',
          'Aim for **100 to 200 MB** per partition and 2 to 3 tasks per core. Read the stage table.'
        ],
        lines: [
          'I size partitions by data, not by habit.',
          'I count Exchange lines before I run.',
          'I use repartition(1), never coalesce(1), after heavy work.'
        ]
      })
    ]
  });
})();
