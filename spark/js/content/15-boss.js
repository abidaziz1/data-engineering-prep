/* Mission 15: drills that mix missions, a design decision, a coding round in SQL on the recorded store numbers, the boss round of interview questions, and a one-page review.
   Every number on the cheat sheet comes from a recording in an earlier mission: a real Apache Spark 4.0.1 in local mode on four cores, with Delta Lake 4.0.1 and pytest, on made-up
   Brewline data, read back from its event log. Nothing ran on a cluster. YARN, Kubernetes, the managed services, Kafka, Iceberg and Hudi are from documentation. */
(function () {
  var B = LAB.b, G = LAB.get;

  /* Boss round: every interview question of missions 1 to 14, in mission order. Tier 1 is the junior path, tier 2 adds the senior questions, tier 3 the extra ones. */
  var BOSS = [];
  LAB.chapters.forEach(function (ch) { ch.scenes.forEach(function (s) { if (s.type === 'qa') BOSS.push([s.id, s.t]); }); });

  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  var mib = function (b) { return (Number(b) / 1048576).toFixed(1) + ' MiB'; };
  var W0 = G.counts('world.summary'), ST = G.table('world.stores'), RD = G.table('parts.read'), SH = G.table('parts.shuffle'), JS = G.table('joins.strategies'), JC = G.counts('joins.counts');
  var AG = G.table('skew.aggregations'), JN = G.table('skew.joins'), FM = G.table('mem.formula'), MC = G.counts('mem.cache'), CR = G.table('mem.cache_reads'), SP = G.counts('mem.spill');
  var VA = G.table('files.variants'), TO = G.table('files.touched'), RG = G.table('files.rowgroups'), CO = G.table('files.codecs'), OW = G.counts('files.overwrite'), BK = G.counts('files.bucketing');
  var AN = G.table('sql.ansi'), TI = G.table('sql.ties'), TZ = G.table('sql.timezone'), UC = G.counts('udf.calls'), UB = G.counts('udf.batches');
  var PR = G.table('stream.progress'), RS = G.counts('stream.restart'), NW = G.counts('stream.no_watermark'), GR = G.table('stream.state_growth');
  var DM = G.counts('delta.merge'), DS = G.counts('delta.small_files'), TS = G.counts('test.summary'), PRE = G.table('submit.precedence'), ET = G.table('eventlog.types'), RT = G.counts('errors.retry');
  var DEF = G.table('conf.defaults'), PL = G.text('plans.physical');
  var def = function (k) { return DEF.rows.filter(function (r) { return r[0] === k; })[0][1]; };
  var pre = function (start) { return PRE.rows.filter(function (r) { return r[0].indexOf(start) === 0; })[0][1]; };
  var variant = function (start) { return VA.rows.filter(function (x) { return x[0].indexOf(start) === 0; })[0]; };
  var rg = function (file, push) { return RG.rows.filter(function (x) { return x[0] === file && x[1] === push; })[0]; };
  var strat = function (label) { return JS.rows.filter(function (x) { return x[0] === label; })[0]; };
  var codec = function (c) { return Number(CO.rows.filter(function (x) { return x[0] === c; })[0][1]); };
  var lvl = function (n) { return G.table('mem.levels').rows.filter(function (x) { return x[0] === n; })[0]; };
  var ansi = function (start) { return AN.rows.filter(function (x) { return x[0].indexOf(start) === 0; })[0]; };
  var tie2 = TI.rows.filter(function (r) { return Number(r[1]) === 150; });
  var late = PR.rows.filter(function (r) { return Number(r[5]) > 0; })[0];
  var cnt = AG.rows[0], win = AG.rows[1], plain = JN.rows[0], adap = JN.rows[1], salt = JN.rows[2];
  var heap1g = FM.rows.filter(function (r) { return r[0] === '1g'; })[0];
  var perDay200 = variant('folder for each day, 200 tasks'), perDayRep = variant('folder for each day, repartition');
  var sortedOn = rg('sorted by order_id', 'on'), shufOn = rg('shuffled by order_id', 'on');
  var pctS = function (x) { return Math.round(Number(x) * 1000) / 10; };
  var s01 = ST.rows[0];
  G.expect(BOSS.length >= 40 && BOSS[0][0] !== undefined, 'the boss round has the questions of the earlier missions');
  G.expect(def('spark.sql.shuffle.partitions') === '200' && pre('nothing set') === '200' && RD.rows[0][1] === 4 && SH.rows[2][1] === 1, 'defaults and partition counts');
  G.expect(strat('stores is small: the default')[1] === 'BroadcastHashJoin' && strat('broadcast turned off')[2] === 2 && JC.inner_to_stores_listed_twice === 2 * JC.orders && JC.not_in_customers_without_orders === 0, 'the join numbers');
  G.expect(Number(win[4]) > 5 * Number(win[3]) && Number(adap[4]) < Number(plain[4]) / 2 && Number(salt[4]) < Number(plain[4]) / 2, 'the skew numbers');
  G.expect(Number(heap1g[2]) === Number(heap1g[3]) && MC.disk_bytes === 0 && SP.memory_bytes_spilled > SP.disk_bytes_spilled, 'the memory numbers');
  G.expect(Number(perDay200[1]) === 2800 && Number(perDayRep[1]) === 14 && OW.static.rows_after < OW.dynamic.rows_after && BK.shuffles_when_bucketed === 0, 'the file numbers');
  G.expect(late && NW.rows_dropped_as_late_without_watermark === 0 && RS.batch_written_twice[0] === 4, 'the streaming numbers');
  G.expect(DM.numOutputRows > 0 && DS.files_on_disk_after_vacuum === 1 && TS.clean.passed === 4 && TS.bug.failed === 1, 'the table and test numbers');

  /* The coding round: the stores that are needed to reach 80 percent of all orders, from the recorded store numbers of mission 0. */
  var STORES = ST.rows.map(function (r) { return [r[0], Number(r[1])]; });
  var TOTAL = STORES.reduce(function (a, r) { return a + r[1]; }, 0);
  var SORTED = STORES.slice().sort(function (a, b) { return b[1] - a[1] || (a[0] < b[0] ? -1 : 1); });
  var CHROWS = [], run = 0;
  SORTED.forEach(function (r) {
    var before = run; run += r[1];
    if (100 * before / TOTAL < 80) CHROWS.push([r[0], n0(r[1]), (Math.round(1000 * r[1] / TOTAL) / 10).toFixed(1), (Math.round(1000 * run / TOTAL) / 10).toFixed(1)]);
  });
  var CH_SQL = [
    'SELECT store_id, orders, share_pct, running_pct',
    'FROM (',
    '  SELECT store_id, orders,',
    '         ROUND(100.0 * orders / SUM(orders) OVER (), 1) AS share_pct,',
    '         ROUND(100.0 * SUM(orders) OVER (ORDER BY orders DESC, store_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) / SUM(orders) OVER (), 1) AS running_pct,',
    '         100.0 * (SUM(orders) OVER (ORDER BY orders DESC, store_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) - orders) / SUM(orders) OVER () AS before_pct',
    '  FROM store_orders',
    ')',
    'WHERE before_pct < 80',
    'ORDER BY orders DESC, store_id'
  ].join('\n');
  G.expect(TOTAL === W0.orders && CHROWS.length === 8 && CHROWS[0][0] === 's01' && CHROWS[0][2] === '33.8', 'the coding round result');

  LAB.addChapter({
    id: 'm15', n: 15, title: 'Boss round', short: 'Boss round', blurb: 'Drills that mix the missions, a design decision, a coding round, and a mock interview', minutes: 80,
    focus: ['src', 'air', 'ci'],
    goals: [
      'Handle **two incidents** that cross missions: a slow night with tiny files, and a report that is wrong in two ways.',
      'Decide **what to build first** on a new Spark platform, and defend it.',
      'Write **one SQL query** with windows and a subquery on the recorded store numbers.',
      'Answer **the interview questions** of every mission in the time of a real interview.',
      'Take away **one page** of numbers and rules.'
    ],
    say: 'Mission 15 is the boss round. First two drills that mix what you learned, because nobody has an incident in only one mission. Then a design decision, a coding round in SQL on the store numbers that I recorded, and the mock interview with the questions of every mission. At the end there is one page to review. Everything here ran on a real Spark in local mode, on one machine. Nothing ran on a cluster, and I say it once more.',
    scenes: [
      B.incident({
        id: 'm15-inc1', t: 2, src: 'rec', title: 'Drill: a slow night, and a folder of tiny files', time: '05:10',
        alert: '**The nightly orders job took 3 hours instead of 20 minutes after the busiest sales weekend.** The longest stage shows 12 tasks: the median read ' + n0(Math.round(Number(win[3]))) + ' records and the maximum ' + n0(win[4]) + '. The job writes the result partitioned by day, and the output folder now holds thousands of files.',
        clues: ['The maximum task is ' + Math.round(Number(win[4]) / Number(win[3])) + ' times the median in the stage that does a window by store', 'Store ' + s01[0] + ' holds ' + pctS(s01[2]) + ' percent of the orders', 'The write follows a `repartition(200)`, and the recording shows what 200 tasks do to 14 folders: ' + n0(perDay200[1]) + ' files', 'Nobody has run OPTIMIZE on the table'],
        opts: [
          { t: 'Read the stage table, find the hot key, and fix it with the cheapest thing that works (adaptive skew join if it is a join, a salt or a separate path if it is a window). Repartition by the day before the write, compact the table, and add alerts on max against median and on file size', fb: '' },
          { t: 'Double the executor memory and the shuffle partitions', fb: 'The hot key still goes to one task, and the files stay tiny.' },
          { t: 'Turn off adaptive execution and restart', fb: 'It is not the cause, and you would lose the protection it gives.' },
          { t: 'Delete the output folder and rerun until it works', fb: 'The rerun has the same hot task and writes the same files.' }
        ],
        best: 0,
        why: 'Two faults, two sets of numbers. The window by store feels skew: the busiest task read ' + n0(win[4]) + ' records against a median of ' + n0(Math.round(Number(win[3]))) + ', while a plain count by store looked healthy (' + n0(cnt[4]) + ' against ' + n0(cnt[3]) + '). And `repartition(200)` before `partitionBy` made ' + n0(perDay200[1]) + ' files where `repartition("dt")` made ' + perDayRep[1] + '.',
        checks: [
          ['Measure', 'The stage table: the maximum against the median, the spill, and the number of tasks. `DESCRIBE DETAIL` for the files.'],
          ['Fix the skew', 'The adaptive skew join cut the busiest task of a join from ' + n0(plain[4]) + ' to ' + n0(adap[4]) + ' records. A window needs a salt or a separate path.'],
          ['Fix the files', 'Repartition by the folder column before the write, then OPTIMIZE the busy partitions.'],
          ['Guard', 'An alert on max task against median, and on the average file size of the busiest tables.']
        ],
        tell: 'The night was slow because one task of the window stage held a third of the orders, and the output was thousands of tiny files because of a repartition into 200 before the partitioned write. I found the hot store in the stage table, handled it, repartitioned by the day before the write, compacted the table, and added alerts on max against median and on the file size.',
        prevent: ['Alert on max task against median', 'Repartition by the folder column before partitionBy', 'Schedule compaction on busy tables']
      }),

      B.incident({
        id: 'm15-inc2', t: 2, src: 'rec', title: 'Drill: a report that is wrong in two ways', time: '09:20',
        alert: '**The weekly customer report says that no customer has ever failed to order, and the revenue of one store is exactly twice the ledger.** Both numbers come from SQL that ran without errors after the move to Spark 4. A stream that feeds the same dashboard restarted last night.',
        clues: ['The report uses `NOT IN (SELECT customer_id FROM orders)`, and about a quarter of the orders have no customer', 'The stores table was reloaded and each store may be listed twice', 'The stream restarted after a crash, and its sink is a plain append', 'The tests passed on ten rows with no NULLs'],
        opts: [
          { t: 'Replace NOT IN with NOT EXISTS, test the key of the stores table for uniqueness and fix the reload, make the sink idempotent with a MERGE, and add NULLs, a duplicate key and a repeated batch to the test data', fb: '' },
          { t: 'Turn off ANSI mode, because Spark 4 changed something', fb: 'ANSI mode affects casts and arithmetic, not these results. And it would hide bad data.' },
          { t: 'Multiply the report by one half', fb: 'You would hide the duplicate and break the report on the day it is fixed.' },
          { t: 'Rerun the report with more executors', fb: 'The numbers are wrong because of the logic, not the cluster.' }
        ],
        best: 0,
        why: 'Three separate faults, all recorded. `NOT IN` returned **' + n0(JC.not_in_customers_without_orders) + '** where `NOT EXISTS` returned **' + n0(JC.not_exists_customers_without_orders) + '**. A store listed twice took the join from ' + n0(JC.inner_to_stores) + ' to ' + n0(JC.inner_to_stores_listed_twice) + ' rows. And the restart sent batch ' + RS.batch_written_twice.join(', ') + ' to the sink twice.',
        checks: [
          ['Reproduce each one', 'Count with NOT IN and with NOT EXISTS. Count the rows of the stores by key. Compare the sink with the batch ids.'],
          ['Fix the query', 'NOT EXISTS or a left anti join. A uniqueness test on the dimension key.'],
          ['Fix the sink', 'MERGE on the key inside foreachBatch, so that a replayed batch changes nothing.'],
          ['Guard', 'Tests with a NULL key, a repeated dimension row and a batch run twice. A reconciliation against the source.']
        ],
        tell: 'The report was wrong in three ways: NOT IN against a column with NULLs returned nothing, a reloaded dimension table doubled a join, and a restart wrote one batch twice to a plain append. I used NOT EXISTS, tested the dimension key, switched the sink to a MERGE, and put NULLs, a duplicate key and a repeated batch into the test data.',
        prevent: ['NOT EXISTS, never NOT IN, on a nullable column', 'A uniqueness test on every dimension key', 'An idempotent sink for every stream']
      }),

      B.decide({
        id: 'm15-dec', t: 2, src: 'docs', title: 'Decision: what do four engineers build first on Spark?',
        scenario: 'Brewline Asia-Pacific has four engineers, eight weeks, and a Spark cluster that has just been approved. The business wants a daily orders table that people trust, then a live view for store managers. Managers like demos, and a live view would impress them.',
        opts: [
          { t: 'The live streaming view first, because it impresses, and tests and layout after the demo', d: 'The best demo, early.', lose: 'A stream hides its mistakes: a window that is dropped, a sink that is written twice, a state that grows. Without tests, an event log and an idempotent sink, nobody can tell whether the live numbers are right.' },
          { t: 'Foundations first: the transformations as tested functions, the event log on, a table format for the curated tables, a sensible file layout. Then the daily batch job, tuned by its stage table. Then the stream, on an idempotent sink', d: 'Each step is what the next one needs, and each can be shown to the business when it is done.', lose: '' },
          { t: 'Write everything as notebooks and fix problems as they appear', d: 'The fastest way to a first number.', lose: 'There are no tests, no review, no repeatable run, and the first person to leave takes the knowledge. The second environment will differ.' }
        ],
        pick: 1,
        why: 'Order the work by what the next step needs. The recordings show how small gaps grow: one test with a refunded order caught a bug that three other tests missed, a repeated batch wrote ' + n0(RS.batch_written_twice.length) + ' batch twice, and 200 tasks made ' + n0(perDay200[1]) + ' files. Tests and layout are cheap in week one.',
        when: 'If the business has a hard date for a live view, build a thin version early on the same foundations: a replayable source, a watermark, a MERGE sink, and the checks from the first day.'
      }),

      B.challenge({
        id: 'm15-ch', t: 2, title: 'Coding round: the stores that make up 80 percent of the orders', file: 'pareto.sql', lang: 'sql',
        q: 'The table `store_orders` holds the orders of each of the 12 Brewline stores, recorded in mission 0. **Write one Spark SQL query that sorts the stores by orders, biggest first, and returns the stores needed to reach 80 percent of all orders: for each, its orders, its share of all orders in percent and the running share, both with one decimal.** A store is needed if the running share *before* it is under 80 percent. Spark has no QUALIFY.',
        data: [{ name: 'store_orders (recorded in mission 0)', cols: ['store_id', 'orders'], rows: STORES.map(function (r) { return [r[0], n0(r[1])]; }) }],
        starter: '-- the stores that make up 80 percent of the orders\nSELECT store_id, orders, ...\nFROM store_orders',
        hints: ['`SUM(orders) OVER ()` is the total on every row. A share is 100 times the orders divided by it.', 'A running total needs `ORDER BY orders DESC` and a frame: `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. Add the store id to the order to make it deterministic.', 'The running share before a store is the running total minus its own orders. There is no QUALIFY, so compute it in a subquery and filter outside.'],
        sol: CH_SQL,
        res: { msg: CHROWS.length + ' rows', cols: ['store_id', 'orders', 'share_pct', 'running_pct'], rows: CHROWS },
        expl: ['`SUM(orders) OVER ()` is a window with no partition and no order: it sees all twelve rows and gives the total to every row, without collapsing them. The share is `100.0 * orders / total`. The `100.0` makes it decimal.', 'The running share uses `ORDER BY orders DESC, store_id` and `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`. **ROWS** and not the default RANGE: with ties in the orders, RANGE would give tied stores the same total, as mission 8 recorded. The store id breaks the tie.', 'The condition is on the share **before** the store: running total minus its own orders. Spark has no QUALIFY, so the window columns are made in an inner query and `WHERE before_pct < 80` is applied outside. The result is ' + CHROWS.length + ' stores. Look at the first line: store ' + CHROWS[0][0] + ' alone is ' + CHROWS[0][2] + ' percent.'],
        cx: 'One pass over twelve rows, plus a sort for the window. On a big table the window by no partition moves every row to one task, so on real data you would aggregate to the store first, as this table already is.'
      }),

      B.mockRound(BOSS.map(function (b) { return b[0]; }), BOSS.map(function (b) { return b[1]; })),

      B.cheat({
        id: 'm15-cheat', t: 1, src: 'rec', title: 'One page to review',
        say: 'This is your last-minute review. Every number comes from a recording in an earlier mission, made with a real Spark ' + G.meta('pyspark') + ' in local mode and made-up data. Take a screenshot or print the page.',
        sections: [
          { h: 'The architecture and the plan', items: ['A driver plans and sends tasks. Executors run them, one partition on one core. The cluster manager only shares out machines. The recording ran in local mode on 4 cores, so there was no network between executors', 'Transformations are lazy. `read.parquet` started 1 job for the schema, `filter` and `select` none, and `count` started 3 because adaptive execution runs a job for each shuffle stage', 'Four plans: parsed, analyzed, optimized, physical. SQL and DataFrame gave the same plan. Read it from the bottom: scan, filter, partial aggregate, `Exchange`, final aggregate'] },
          { h: 'Partitions and shuffles', items: ['Reading ' + W0.orders_files + ' small files made ' + RD.rows[0][1] + ' partitions at 128 MiB, ' + RD.rows[1][1] + ' at 1 MiB and ' + RD.rows[2][1] + ' at 256 KiB', 'The default is ' + def('spark.sql.shuffle.partitions') + ' shuffle partitions: ' + SH.rows[0][1] + ' tasks for ' + SH.rows[0][5] + ' records. With adaptive execution: ' + SH.rows[2][1] + ' task', '`repartition` shuffles to even sizes. `coalesce` merges with no shuffle, and `coalesce(1)` shrinks the whole stage. Aim for 100 to 200 MB per partition'] },
          { h: 'Joins', items: ['A small table is broadcast below ' + n0(10485760) + ' bytes (10 MiB). With broadcasting off the same join was a ' + strat('broadcast turned off')[1] + ' with ' + strat('broadcast turned off')[2] + ' exchanges. A range condition gave ' + strat('a range condition, not equality')[1], 'A store listed twice took the join from ' + n0(JC.inner_to_stores) + ' to ' + n0(JC.inner_to_stores_listed_twice) + ' rows. An inner join to the customers dropped ' + n0(JC.orders_without_customer_id) + ' guest orders', '`NOT IN` returned ' + n0(JC.not_in_customers_without_orders) + ', `NOT EXISTS` returned ' + n0(JC.not_exists_customers_without_orders)] },
          { h: 'Skew and adaptive execution', items: ['Store ' + s01[0] + ' holds ' + pctS(s01[2]) + ' percent of the orders. A count by store stayed even (' + n0(cnt[4]) + ' against ' + n0(cnt[3]) + '), a window did not (' + n0(win[4]) + ' against ' + n0(Math.round(Number(win[3]))) + ')', 'The adaptive skew join cut the busiest task from ' + n0(plain[4]) + ' to ' + n0(adap[4]) + ' records, and a salt of 4 to ' + n0(salt[4]) + '. The recording lowered the skew limits, because the real defaults are 5 times the median and 256 MiB', 'Try in order: broadcast, adaptive skew join, salt, a separate path, change the key'] },
          { h: 'Memory and caching', items: ['Usable memory is (heap - 300 MiB) x 0.6: a 1 GiB heap reported ' + n0(heap1g[2]) + ' bytes, equal to the formula', '`cache()` is lazy. The second count read ' + n0(CR.rows[1][1]) + ' bytes, exactly the size of the cache, and the level was ' + MC.storage_level, 'A forced spill: ' + mib(SP.memory_bytes_spilled) + ' in memory became ' + mib(SP.disk_bytes_spilled) + ' on disk. A spill is slow, not an error. Container killed means the overhead'] },
          { h: 'Files and layout', items: ['Files = tasks that write times folders each writes to: 200 tasks into 14 folders made ' + n0(perDay200[1]) + ' files of ' + perDay200[3] + ' KB, `repartition("dt")` made ' + perDayRep[1], 'A filter on the partition column opened ' + TO.rows[0][1] + ' of ' + TO.rows[0][2] + ' files. Pushdown on a sorted file read ' + n0(sortedOn[2]) + ' bytes, on a shuffled file ' + n0(shufOn[2]), 'Codecs: none ' + n0(codec('none')) + ' KB, snappy ' + n0(codec('snappy')) + ', gzip ' + n0(codec('gzip')) + ', zstd ' + n0(codec('zstd')) + '. The default overwrite mode is ' + OW.default_mode + ': a one-day fix left ' + OW.static.rows_after + ' of 30 rows, dynamic left ' + OW.dynamic.rows_after] },
          { h: 'Spark SQL', items: ['Spark 4 has ANSI mode on: `CAST(\'abc\' AS INT)` was an error, with it off it was ' + ansi("CAST('abc'")[2] + '; `2147483647 + 1` wrapped to ' + ansi('2147483647')[2], 'No QUALIFY in Spark 4.0.1: filter a window in a subquery. With an ORDER BY and no frame the default is RANGE: tied rows both showed ' + tie2[0][3] + ', ROWS gave ' + tie2[0][2] + ' and ' + tie2[1][2], '`explode` drops empty arrays. The session time zone moved ' + n0(TZ.rows[0][1]) + ' orders on the first day to ' + n0(TZ.rows[0][2])] },
          { h: 'Python and UDFs', items: ['Built-in functions have no Python operator. A Python UDF is `BatchEvalPython`, an Arrow or pandas UDF is `ArrowEvalPython`. All versions gave the same counts', 'A deterministic UDF after a filter was called ' + n0(UC['deterministic, result filtered, then used twice']) + ' times for ' + n0(UC.rows) + ' rows. A pandas UDF was called ' + UB.calls + ' times for ' + n0(UB.rows) + ' rows', 'A wrong return type gave NULL with no error. A None input failed the job'] },
          { h: 'Structured Streaming', items: ['A watermark of 10 minutes was ' + late[2] + ' when the event at ' + late[3] + ' arrived, so it was dropped as late. Without a watermark the state went ' + GR.rows.map(function (r) { return r[2]; }).join(', ') + ' and append was refused', 'Update wrote changed windows, append wrote final windows, complete wrote everything every time', 'The checkpoint has offsets, commits and state. The restart wrote batch ' + RS.batch_written_twice.join(', ') + ' twice: exactly-once for state, at-least-once for the sink'] },
          { h: 'Delta Lake and tests', items: ['One MERGE updated ' + n0(DM.numTargetRowsUpdated) + ', deleted ' + n0(DM.numTargetRowsDeleted) + ' and inserted ' + n0(DM.numTargetRowsInserted) + ' rows in one commit. Twenty appends gave ' + DS.files_in_the_version_before + ' files, OPTIMIZE ' + DS.files_in_the_version_after_optimize + ' (' + DS.files_on_disk_after_optimize + ' on disk), VACUUM ' + DS.files_on_disk_after_vacuum + ', and the old version could not be read', 'Four tests passed on the clean code. With one word changed, ' + TS.bug.failed + ' failed and ' + TS.bug.passed + ' passed: only the test with a refunded order caught it'] },
          { h: 'Running it and debugging', items: ['Settings win in this order: the program (' + pre('--conf (50) and the program') + '), the flag (' + pre('--conf spark.sql.shuffle.partitions=50') + '), the file (' + pre('a properties file') + '), the default (' + pre('nothing set') + '). A container is heap plus overhead', 'The event log is JSON lines: one small query wrote ' + ET.rows.filter(function (r) { return r[0] === 'SparkListenerTaskEnd'; })[0][1] + ' task-end lines. Read the maximum against the median, the spill and the files', 'A task that fails once is retried: ' + RT.maxFailures_default_on_a_cluster + ' failures allowed on a cluster, ' + RT.maxFailures_default_in_local_mode + ' in local mode. `ignoreCorruptFiles` skips a bad file without a word'] },
          { h: 'Say it in one line', items: ['Read the plan before you run, and the stage table after.', 'Make every load, every sink and every run safe to repeat.', 'Filter on the partition column, and write files of a sensible size.', 'Test the rule with the awkward row: a NULL, a tie, a refund.', 'Change one thing, and measure the same numbers again.', 'Say what you ran, say what was a stand-in, and say when you would check the documentation.'] }
        ]
      }),

      B.recap({
        id: 'm15-recap', n: 15, badge: 'Spark Architect', color: '#99F6E4',
        pts: [
          'You can follow Brewline from a **file** through the **plan**, **partitions and shuffles**, **joins**, **skew**, **memory**, **files**, **SQL**, **Python**, **streaming** and **Delta**, to **tests**, **spark-submit** and **debugging**.',
          'You **read the plan** before a job and the **stage table** after it, and you name the cause from the **numbers**.',
          'You make **loads, sinks and runs safe to repeat**, and you write files of a **sensible size** in a **sensible layout**.',
          'You **test the rule** with the awkward row, and you **change one thing** at a time.',
          'You say what you **ran** (a real Spark in local mode), what was **from documentation** (clusters, YARN, Kubernetes, Kafka, Iceberg, Hudi), and when you would **check the documentation**, because Spark changes its defaults between versions.'
        ],
        lines: [
          'I read the plan, and I read the stage table.',
          'I make everything safe to run twice.',
          'I say what I ran, and what I did not.'
        ]
      })
    ].reduce(function (all, x) { return all.concat(x); }, [])
  });
})();
