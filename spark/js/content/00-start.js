/* Mission 0: pick a path, see the whole platform, meet the Brewline data, and learn what the tags mean. */
(function () {
  var B = LAB.b, G = LAB.get;
  var D = G.counts('world.summary');
  G.expect(D.orders === 400000 && D.days === 14 && D.stores === 12 && D.orders_files === 14 && D.busiest_store === 's01', 'the size and shape of the Brewline data');
  var n0 = function (x) { return x.toLocaleString('en-US'); };
  var pct = function (x) { return Math.round(x * 1000) / 10 + ' percent'; };
  var TOOLS = 'Apache Spark ' + G.meta('pyspark') + ' (PySpark) in local mode on Java ' + G.meta('java') + ', Delta Lake ' + G.meta('delta-spark') + ', pandas ' + G.meta('pandas') + ', pyarrow ' + G.meta('pyarrow') + ' and pytest ' + G.meta('pytest');

  LAB.addChapter({
    id: 'm0', n: 0, noIntro: true, title: 'Start here', short: 'Start', blurb: 'Pick your path and see the whole platform', minutes: 9,
    scenes: [
      B.welcome({ id: 'welcome' }),

      B.flow({
        id: 'm0-map', t: 1, src: 'docs', title: 'Brewline and Spark: the whole picture', g: 'master', legend: true,
        steps: [
          { say: 'Brewline sells coffee in six countries. Its data team has a large pile of order files, a customer table and a list of stores, and it wants a daily report that gets slower every month. This course teaches Apache Spark by fixing that, one layer at a time. Press Next to walk through the whole platform.', cap: 'The whole platform on one page.' },
          { say: 'Step 1. The sources. Orders arrive as Parquet files, one folder for each day. Customers and stores are smaller tables. A stream of till events is coming. Spark reads all of them, but each in its own way.', on: ['m1'], focus: ['s_src', 's_drv'], cap: 'Files, tables and streams.' },
          { say: 'Step 2. The driver. This is one process, the one you start. It reads your code, builds a plan, cuts the plan into stages and tasks, and hands the tasks out. If the driver is slow or runs out of memory, the whole application stops.', on: ['m2'], focus: ['s_drv', 's_exe'], cap: 'The driver plans. It does not do the work.' },
          { say: 'Step 3. The executors. They are the workers. Each has a few cores, some memory and a local disk. A core runs one task at a time. Executors also keep the cache and the shuffle files. Most of your tuning is about what happens here.', on: ['m3'], focus: ['s_exe', 's_out'], cap: 'Executors run tasks and hold data.' },
          { say: 'Step 4. The output. Spark writes Delta tables, Parquet files or the sink of a stream. How you write decides how the next job reads: the number of files, their size and their order.', on: ['m3'], focus: ['s_out'], cap: 'How you write decides how the next job reads.' },
          { say: 'Step 5. Use. Dashboards, other jobs and models read what Spark wrote. A good data engineer thinks about the reader while writing.', on: ['m4'], focus: ['s_out', 's_use'], cap: 'The reader comes first.' },
          { say: 'Around the flow sit five controls. A cluster manager gives the application its machines. The event log records everything for the Spark UI. Tests keep the code honest. spark-submit starts the application with the right settings. And cost, which is cores times hours. Each one has a mission.', focus: ['x_cm', 'x_log', 'x_test', 'x_sub', 'x_cost'], keepGroups: true, cap: 'Five controls around the flow.' }
        ]
      }),

      B.cmp({
        id: 'm0-levels', t: 1, src: 'docs', title: 'Junior or senior: what changes',
        say: 'The same topics, different expectations. Press Next to read the gap area by area. A senior is judged on what happens when the data is large, skewed or wrong, not on knowing more function names.',
        cols: ['Area', 'A junior is expected to', 'A senior is expected to'],
        hl: 2,
        rows: [
          ['The plan and laziness', 'Say what a transformation and an action are, and read explain().', 'Read a physical plan: find the shuffles and the pushdown, and say what the optimiser did.'],
          ['Partitions and shuffles', 'Say what a partition and a task are.', 'Choose partition counts, avoid needless shuffles, and use repartition and coalesce correctly.'],
          ['Joins', 'Write inner and left joins without making duplicate rows.', 'Choose broadcast or sort-merge, set hints, and know the NOT IN and duplicate-key traps.'],
          ['Skew and adaptive execution', 'Know that one hot key slows a whole stage.', 'Find skew in the task table, and fix it with adaptive execution, salting or a broadcast.'],
          ['Memory and caching', 'Use cache() and unpersist() on purpose.', 'Explain unified memory, storage levels, spill against out-of-memory, and size an executor.'],
          ['Files and layout', 'Read and write Parquet, and use partitionBy.', 'Avoid small files, sort inside files, choose a codec, plan bucketing and schema evolution.'],
          ['Spark SQL', 'Write joins, windows and aggregates in SQL and in DataFrames.', 'Use ANSI mode and try_ functions, rollups, arrays, and time zones without surprises.'],
          ['Python and UDFs', 'Use built-in functions before a UDF.', 'Choose pandas UDFs, count the calls of a UDF, and handle nulls and wrong types.'],
          ['Structured Streaming', 'Read a stream and write a stream.', 'Design windows, a watermark, state and a checkpoint, and an idempotent sink.'],
          ['Table formats', 'Read and write a Delta table.', 'MERGE, time travel, OPTIMIZE and VACUUM, and compare Delta, Iceberg and Hudi.'],
          ['Testing', 'Write a unit test with a local session.', 'Test in CI, check the data, and run a small end-to-end job on a sample.'],
          ['Running it for real', 'Start a job with spark-submit.', 'Know the order of settings, size an application, and pick a cluster manager.'],
          ['Debugging', 'Read an error message.', 'Read the stage table and the event log, and name the cause: skew, spill, small files.']
        ],
        steps: [
          { upto: 5, say: 'The engine itself: plans, partitions, joins, skew and memory. A junior knows the words. A senior can look at a number and say what is wrong.' },
          { upto: 9, say: 'The layers around it: files, SQL, Python and streaming. This is where most of the daily bugs are.' },
          { upto: 13, say: 'Table formats, tests, running and debugging. They decide whether the job is still working in six months.' }
        ],
        pick: '**Junior path** if you are starting out or interviewing for a junior data engineer role. **Senior path** if you have run Spark jobs already: it includes every junior topic and adds the tuning, design and operations decisions. **Everything** adds the newest features and the deepest follow-up questions.'
      }),

      B.rows({
        id: 'm0-setup', t: 1, src: 'rec', title: 'Meet the Brewline data',
        steps: [
          {
            say: 'This is the data that the whole course uses. It is made up, and the same on every run. ' + n0(D.orders) + ' orders over ' + D.days + ' days in ' + D.stores + ' stores, in ' + D.orders_files + ' Parquet files. Store ' + D.busiest_store + ' sells ' + pct(D.busiest_store_share) + ' of them: that is the skew you will meet in mission 5. About a quarter of the orders are guests with no customer id.',
            tabs: [{
              layer: 'DATA', name: 'The Brewline tables', c: 'raw',
              cols: ['Table', 'What it holds', 'Rows'],
              rows: [
                ['orders', 'one row per order: store, customer, time, status, channel, total in cents, day', n0(D.orders)],
                ['customers', 'loyalty tier and birth year', n0(D.customers)],
                ['stores', 'city and country', D.stores],
                ['the till events', 'a few small JSON files for the streaming mission', '6 files']
              ],
              trk: 0
            }],
            notes: ['I generated the data from a fixed rule, so every number in the course can be checked. ' + D.new_customers_without_orders + ' customers have never ordered, on purpose: they matter for the join lessons.']
          },
          {
            say: 'Three facts about the data decide most of the lessons. One store is far bigger than the others. One order in four has no customer. And about four orders in five are paid, the rest are refunded, cancelled or new.',
            tabs: [{
              layer: 'FACTS', name: 'What is special about this data', c: 'raw',
              cols: ['Fact', 'Value', 'What it does to the lessons'],
              rows: [
                ['Busiest store', D.busiest_store + ': ' + pct(D.busiest_store_share), 'one hash bucket gets a third of the rows: skew'],
                ['Guest orders (no customer id)', pct(D.guest_share), 'NULL keys in a join, and the NOT IN trap'],
                ['Paid orders', pct(D.paid_share), 'a filter that keeps most rows'],
                ['Customers who never ordered', String(D.new_customers_without_orders), 'an anti join has something to find']
              ],
              trk: 0
            }],
            notes: ['The next mission has the stores table with the exact share of every store.']
          },
          {
            say: 'People matter as much as tools. Analysts read the tables that Spark writes. Data engineers write the jobs. An operator runs them at night and reads the alerts. Each one needs something different from the job: fast reads, correct numbers, a clear failure.',
            tabs: [{
              layer: 'PEOPLE', name: 'Who needs what', c: 'raw',
              cols: ['Who', 'Does', 'Needs from the Spark job'],
              rows: [
                ['Analysts', 'build reports on the curated tables', 'correct numbers and a few big files, sorted'],
                ['Data engineers', 'write and test the jobs', 'small functions, tests, clear plans'],
                ['The operator', 'runs the jobs at night', 'a failure that says what to do, and an event log'],
                ['Finance', 'pays for the cluster', 'cores times hours, and no idle machines']
              ],
              trk: 0
            }],
            notes: ['Mission 14 puts the operator to work on a slow night.']
          }
        ]
      }),

      B.talk({
        id: 'm0-how', t: 1, src: 'rec', title: 'How this course works',
        say: 'Six quick things before we start. Press Next for each.',
        items: [
          ['SEE, TRY, SAY', 'Every mission watches something work (**SEE**), makes you practise it (**TRY**), then asks the interview question out loud (**SAY**). Orange blocks in a diagram are data moving. Numbers show the order.', 'Watch first, practise second, speak third.'],
          ['Junior, Senior, Extra', 'A small tag on a screen tells you who it is for. No tag means everybody. **Senior** and **Extra** screens appear only on the wider paths.', 'The tag tells you whether a screen is on your path.'],
          ['Two kinds of screen', 'A **Recorded** tag means I ran something on one machine and wrote down what it did: ' + TOOLS + '. Plans, task counts and bytes were read back from the **event log**, the file that the Spark web UI is drawn from. A **From documentation** tag means the fact comes from the public documentation as I found it.', 'Recorded, or from documentation. Never both, never guessed.'],
          ['What local mode is', 'Everything ran in **local mode**: the driver and the executor are one program on one machine with four cores. The plans, the shuffles, the spill and the skew are real, and the numbers are the ones Spark counted. What local mode cannot show is the **network** between machines, a real cluster manager, and the Spark UI itself. I say so on each screen where it matters.', 'Real engine, one machine, no network.'],
          ['What was not run', 'No cluster, no YARN, no Kubernetes, no EMR, Dataproc or Databricks, no Kafka and no Iceberg or Hudi table. Those parts are described from documentation, and tagged that way. **Times are never shown**: a laptop run says little about a cluster. Counts and bytes are.', 'Counts and bytes are recorded. Times are not.'],
          ['Controls', 'Press the right and left arrow keys to move. **A-** and **A+** change the text size. **Map** jumps to any mission and switches path. Your progress saves in this browser.', 'Next, Back, arrow keys, Map.']
        ],
        cols: 1
      })
    ]
  });
})();
