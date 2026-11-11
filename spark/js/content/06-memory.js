/* Mission 6: memory, caching and spill. How an executor splits its memory, the formula checked against a real session, what cache() really holds, the storage levels, and a forced
   spill. Sizes come from the running JVM, the storage data of the session and the event log of a real Spark 4.0.1. */
(function () {
  var B = LAB.b, G = LAB.get;
  var FM = G.table('mem.formula'), CA = G.counts('mem.cache'), LV = G.table('mem.levels'), CR = G.table('mem.cache_reads'), SP = G.counts('mem.spill');
  var PLB = G.text('mem.plan_before_action'), PLC = G.text('mem.plan_cached');
  var PY = G.file('code/memory.py');
  var DEMO = G.lines(PY, G.at(PY, /^def cache_demo/), G.at(PY, /return plan_before, plan_after/));
  var SPILL = G.lines(PY, G.at(PY, /^def forced_spill/), G.at(PY, /spark\.conf\.set\('spark\.sql\.shuffle\.partitions', '8'\)/));
  var FORM = G.lines(PY, G.at(PY, /^def formula/), G.at(PY, /return int/));
  var n0 = function (x) { return Number(x).toLocaleString('en-US'); };
  var mib = function (b) { return (Number(b) / 1048576).toFixed(1) + ' MiB'; };
  G.expect(FM.rows.every(function (r) { return r[4] === true || r[4] === 'true'; }), 'the memory formula matches what Spark reports');
  G.expect(CA.cached_partitions === 4 && CA.disk_bytes === 0 && CA.entries_after_unpersist === 0, 'the cache of the recording');
  G.expect(Number(CR.rows[1][1]) === CA.memory_bytes, 'the second count read exactly the size of the cache');
  G.expect(SP.memory_bytes_spilled > SP.disk_bytes_spilled && SP.disk_bytes_spilled > 0, 'the forced spill is smaller on disk');
  var lvl = function (name) { var r = LV.rows.filter(function (x) { return x[0] === name; })[0]; if (!r) throw new Error('no level ' + name); return r; };
  var heap1g = FM.rows.filter(function (r) { return r[0] === '1g'; })[0];

  LAB.addChapter({
    id: 'm6', n: 6, title: 'Memory, caching and spill', short: 'Memory', blurb: 'How an executor splits its memory, what cache really holds, and what happens when it runs out', minutes: 50,
    focus: ['sf', 'int'],
    goals: [
      'Draw the **executor memory**: reserved, unified (execution and storage), user memory, and overhead.',
      'Calculate the **unified memory** from the heap with the formula, and check it.',
      'Say what **cache()** does, when it pays, when it does not, and why it does nothing until an action.',
      'Choose a **storage level**: memory, memory and disk, disk only.',
      'Tell a **spill** from an **out-of-memory** error, and say what each one means.',
      'Name the three kinds of **memory failure** (driver, executor, container) and the first fix for each.'
    ],
    say: 'Mission 6 is about memory, the second half of most tuning stories. A Spark executor does not give all its memory to your data. It keeps some for itself, shares most of the rest between running tasks and the cache, and spills to disk when it runs short. I asked a real session how much memory it reports and checked the formula. I cached the orders and read what the cache holds. And I forced a spill on a sort of the 400,000 orders, to read the bytes that went to disk.',
    scenes: [
      B.talk({
        id: 'm6-layout', t: 1, src: 'docs', title: 'Where an executor\'s memory goes',
        say: 'An executor is a JVM with a heap, plus some memory outside the heap. Press Next for the pieces.',
        items: [
          ['The heap', 'Set by `spark.executor.memory`. It is the memory of the JVM, the place where Spark holds rows, hash tables, sort buffers and the cache. When this is full, you get a spill, or an `OutOfMemoryError`.', 'spark.executor.memory.'],
          ['Reserved', 'Spark keeps **300 MiB** of the heap for itself, for its own objects. You cannot use it. It is why a tiny heap, like 512 MB, gives a surprisingly small working space.', '300 MiB, fixed.'],
          ['Unified: execution and storage', '`spark.memory.fraction`, **0.6** by default, of what is left after the reserve, is one shared region. **Execution** memory holds shuffles, joins, sorts and aggregations while a task runs. **Storage** memory holds the cache and broadcast variables. Either side can borrow from the other when it is idle. Execution can push a cached block out. Storage cannot push execution out.', '60 percent, shared by two uses.'],
          ['User memory', 'The remaining **40 percent** is for your own data structures: the objects of your code, the metadata that Spark keeps for UDFs and user-defined classes. In PySpark it is rarely the limit.', '40 percent, yours.'],
          ['Overhead, outside the heap', '`spark.executor.memoryOverhead` is extra memory for the container: thread stacks, native buffers, and, in **PySpark**, the Python worker processes. The default is 10 percent of the executor memory, with a minimum of 384 MiB. A PySpark job that uses pandas can need much more.', 'Python lives here.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'The sentence to say:', t: 'usable memory is (heap minus 300 MiB) times 0.6, shared by all the cores of the executor, and the Python workers are extra.' }
      }),

      B.flow({
        id: 'm6-flow', t: 1, src: 'docs', title: 'The unified memory region', g: 'memory', legend: true,
        steps: [
          { say: 'This is one executor. Press Next to take its memory apart.', cap: 'One executor heap.' },
          { say: 'Step 1. The **heap** is whatever you gave the executor. Three things are cut from it.', on: ['h1', 'h2', 'h3'], focus: ['m_heap', 'm_res', 'm_unif', 'm_user'], tags: ['tg_form'], cap: 'The heap is cut in three.' },
          { say: 'Step 2. The **reserved** piece is 300 MiB, always. The **unified** region is 60 percent of what is left. The rest is **user memory**.', on: ['h1', 'h2', 'h3'], focus: ['m_res', 'm_unif', 'm_user'], cap: '300 MiB, then 60 and 40 percent.' },
          { say: 'Step 3. Inside the unified region, two kinds of memory share the space: **execution** for the shuffles, joins and sorts that tasks are running now, and **storage** for the cache and the broadcast copies.', on: ['h4', 'h5'], focus: ['m_unif', 'm_exec', 'm_stor'], cap: 'Execution and storage share the region.' },
          { say: 'Step 4. They can **borrow** from each other. If nothing is cached, execution can use the whole region. If execution needs more, it can push cached blocks out, down to the protected half of the region. Storage cannot push running tasks out.', on: ['h8'], focus: ['m_exec', 'm_stor'], cap: 'Execution wins when they fight.' },
          { say: 'Step 5. When execution memory runs out, a task writes data to disk. That is a **spill**. When a cached block is pushed out and it is allowed to use disk, it goes there. If it was memory-only, it is dropped and recomputed when needed.', on: ['h6', 'h7'], focus: ['m_spill', 'm_evict'], cap: 'Spill, or evict.' },
          { say: 'Step 6. One piece is **outside** the heap: the overhead. Python workers, native libraries and buffers live there. A container can be killed for using too much of it, even when the heap is fine.', focus: ['x_over'], tags: ['tg_off'], cap: 'The overhead is outside the heap.' }
        ]
      }),

      B.rows({
        id: 'm6-formula', t: 1, src: 'rec', title: 'The formula, checked on a real session',
        steps: [
          {
            say: 'The rule is **(heap - 300 MiB) x 0.6**. I did not want you to take it on trust. I started real Spark sessions with three heap sizes, and asked each how much storage memory it reports. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Heap and the memory that Spark reports', c: 'raw', cols: FM.cols, rows: FM.rows.map(function (r) { return [r[0], n0(r[1]), n0(r[2]), n0(r[3]), String(r[4])]; }), trk: 1 }],
            notes: ['Recorded: `Runtime.maxMemory()` for the heap, and the memory manager\'s maximum for the report. Each size ran in its own JVM, because the driver memory is read when the JVM starts.']
          },
          {
            say: 'Take the 1 GiB row. The heap is **' + n0(heap1g[1]) + '** bytes. Take away 300 MiB (314,572,800) and multiply by 0.6: **' + n0(heap1g[3]) + '**. Spark reported **' + n0(heap1g[2]) + '**. They are equal, to the byte, for all three sizes.',
            tabs: [{ layer: 'RECORDED', name: 'Heap and the memory that Spark reports', c: 'raw', cols: FM.cols, rows: FM.rows.map(function (r) { return [r[0], n0(r[1]), n0(r[2]), n0(r[3]), String(r[4])]; }), trk: 1, chg: [[1, 2], [1, 3]] }],
            notes: ['The code of the formula is on the next screen. It is one line.']
          },
          {
            say: 'Notice what a small heap leaves. With 512 MiB, only **' + mib(FM.rows[0][2]) + '** can be shared by every task and the cache. On a real executor with 16 GiB the reserve is nothing, but the 60 percent rule is still there, and **four or five cores share it**.',
            tabs: [{ layer: 'RECORDED', name: 'Heap and the memory that Spark reports', c: 'raw', cols: FM.cols, rows: FM.rows.map(function (r) { return [r[0], n0(r[1]), n0(r[2]), n0(r[3]), String(r[4])]; }), trk: 0, chg: [[0, 2]] }],
            notes: ['Each running task gets between 1/(2N) and 1/N of the execution memory, where N is the number of tasks running at once on that executor.']
          }
        ]
      }),

      B.code({
        id: 'm6-formula-code', t: 2, src: 'rec', title: 'The formula in code', file: 'memory.py', lang: 'python', code: FORM,
        steps: [
          { say: 'The formula, as the check used it. Press Next.', lines: null },
          { say: 'The docstring is the rule: 300 MiB for Spark itself, and a fraction, 0.6 by default, of the rest shared by execution and storage.', lines: G.span(FORM, /"""The documented rule/) },
          { say: 'And the line: `(heap - RESERVED) * fraction`. `RESERVED` is 300 times 1,024 times 1,024.', lines: G.span(FORM, /return int/) }
        ],
        note: 'Recorded: this function produced the fourth column of the table, and the check compared it with what the running session reported.'
      }),

      B.widget({ id: 'm6-lab', kind: 'memlab', t: 1, src: 'rec', title: 'Lab: memory, cache and spill' }),

      B.talk({
        id: 'm6-cache', t: 1, src: 'docs', title: 'cache(): what it is, when it pays',
        say: 'Caching is the tuning step that everyone knows, and many use too much. Press Next for the rules.',
        items: [
          ['What it does', '`df.cache()` marks a DataFrame to be kept after the **first action** that computes it. The next actions read the kept copy instead of the files and the plan. It is **lazy**: `cache()` itself computes nothing.', 'Keep it after the first action.'],
          ['When it pays', 'When an expensive DataFrame is used by **two or more actions** in the same job, or by an iterative algorithm, and it **fits** in memory (or in memory and disk). A cleaned table that three reports read is the typical case.', 'Reused, expensive and not too big.'],
          ['When it does not', 'When the DataFrame is used **once**. When it is cheap to recompute: a read of columnar files with a filter is often as fast as the cache. When it is **bigger than the memory**, so it is evicted and recomputed anyway. Or when you cache the raw table instead of the small result you need.', 'Used once, cheap, or too big.'],
          ['What it holds', 'A cached DataFrame is kept in a **columnar, compressed** form. It is not the size of the Parquet files, and not the size of Java objects. Look at the **Storage** tab for the real size.', 'A columnar copy.'],
          ['Let it go', '`df.unpersist()` frees the cache. Spark also evicts the least recently used blocks when it needs the space. In a long job, unpersist what you are done with.', 'Unpersist when done.']
        ],
        cols: 1,
        call: { k: 'warn', h: 'The cache is not durable:', t: 'if an executor is lost, its cached blocks go with it, and Spark recomputes them. For a result that must survive, write it to a table.' }
      }),

      B.code({
        id: 'm6-demo', t: 1, src: 'rec', title: 'A cache, step by step', file: 'memory.py', lang: 'python', code: DEMO,
        steps: [
          { say: 'This is the function that cached the paid orders. Press Next.', lines: null },
          { say: '`cache()` is called. It returns at once. Nothing has been read or kept. The plan is printed **before** any action, and it already contains the cache: an `InMemoryTableScan`. The cache is a promise, not data.', lines: G.span(DEMO, /df\.cache\(\)/, /plan_before = /) },
          { say: 'The **first** `count()` runs the whole plan: it reads the files, filters, and keeps the result in memory.', lines: G.span(DEMO, /first-count/, /df\.count\(\)/) },
          { say: 'The **second** `count()` finds the kept copy and reads it. Look at the numbers on the next screen.', lines: G.span(DEMO, /second-count/) },
          { say: 'Then I asked the session what it holds: the storage level, the number of cached partitions, and the bytes in memory and on disk. Then a different query, a group by, to see which source it reads.', lines: G.span(DEMO, /info = /, /plan_after = /) },
          { say: '`unpersist(True)` frees the cache, waiting until it is gone, and the session reports no entries left.', lines: G.span(DEMO, /unpersist/, /left = /) }
        ],
        note: 'Recorded: the plans, the storage information from the session, and the bytes from the event log.'
      }),

      B.rows({
        id: 'm6-cache-facts', t: 1, src: 'rec', title: 'What the cache holds',
        steps: [
          {
            say: 'Here is what the session reported after the two counts. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'The cached paid orders', c: 'raw', cols: ['what', 'value'], rows: [['storage level', CA.storage_level], ['cached partitions', CA.cached_partitions], ['bytes in memory', n0(CA.memory_bytes)], ['bytes on disk', n0(CA.disk_bytes)], ['entries after unpersist', CA.entries_after_unpersist]], trk: 0 }],
            notes: ['Recorded: the storage information of the Spark context, after the second count.']
          },
          {
            say: 'The level is "' + CA.storage_level + '". That is `MEMORY_AND_DISK`, the default of `cache()` on a DataFrame: keep it in memory, and if there is no room, put the block on disk. All **' + CA.cached_partitions + '** partitions fit in memory: **' + n0(CA.memory_bytes) + '** bytes, **' + n0(CA.disk_bytes) + '** on disk.',
            tabs: [{ layer: 'RECORDED', name: 'The cached paid orders', c: 'raw', cols: ['what', 'value'], rows: [['storage level', CA.storage_level], ['cached partitions', CA.cached_partitions], ['bytes in memory', n0(CA.memory_bytes)], ['bytes on disk', n0(CA.disk_bytes)], ['entries after unpersist', CA.entries_after_unpersist]], trk: 2, chg: [[0, 1], [2, 1]] }],
            notes: ['The cache has one entry for the DataFrame. It is the number of partitions that it holds in memory, one block for each.']
          },
          {
            say: 'Now the two counts. The first had to read the files to fill the cache. The second read **' + n0(CR.rows[1][1]) + '** bytes, which is **exactly the size of the cache**. It did not touch the files at all.',
            tabs: [{ layer: 'RECORDED', name: 'Bytes that each count read', c: 'raw', cols: ['action', 'bytes read as input'], rows: CR.rows.map(function (r) { return [r[0], n0(r[1])]; }), trk: 1, chg: [[1, 1]] }],
            notes: ['Recorded: the input metrics of the tasks of each count, from the event log.']
          },
          {
            say: 'After `unpersist`, the session lists **' + CA.entries_after_unpersist + '** cached entries. The memory is free again. A job that forgets to unpersist keeps this memory until the application ends or Spark evicts it.',
            tabs: [{ layer: 'RECORDED', name: 'The cached paid orders', c: 'raw', cols: ['what', 'value'], rows: [['storage level', CA.storage_level], ['cached partitions', CA.cached_partitions], ['bytes in memory', n0(CA.memory_bytes)], ['bytes on disk', n0(CA.disk_bytes)], ['entries after unpersist', CA.entries_after_unpersist]], trk: 4, chg: [[4, 1]] }],
            notes: ['In a streaming or a notebook session that runs for days, a forgotten cache is a slow leak of executor memory.']
          }
        ]
      }),

      B.code({
        id: 'm6-plans', t: 2, src: 'rec', title: 'Other queries use the cache without being told', file: 'plans', lang: 'text', code: '-- the cached DataFrame, before any action\n' + PLB.replace(/\n{2,}/g, '\n').trim() + '\n\n-- a different query on the same DataFrame\n' + PLC.replace(/\n{2,}/g, '\n').trim(),
        steps: [
          { say: 'Two plans. The first is the cached DataFrame itself, printed before any action. The second is a **different** query on it, a count by store. Press Next.', lines: null },
          { say: '`InMemoryRelation` is the cache. The `StorageLevel(disk, memory, deserialized, 1 replicas)` is its level. Under it, the real plan that fills it: a `FileScan` with the filter. This part runs once, on the first action.', lines: G.span('-- the cached DataFrame, before any action\n' + PLB.replace(/\n{2,}/g, '\n').trim(), /InMemoryRelation/, /FileScan/) },
          { say: 'In the second plan, the group by reads an **`InMemoryTableScan`** of one column, `store_id`, and not the files. Spark matched the plan of the new query with the plan that was cached, and used the kept copy. You do not name the cache. You do not pass it around.', lines: G.span('-- a different query on the same DataFrame\n' + PLC.replace(/\n{2,}/g, '\n').trim(), /InMemoryTableScan/) }
        ],
        note: 'Spark matches the **plan**, not the variable. A DataFrame built the same way on another line will use the same cache. And one built slightly differently will not.'
      }),

      B.cmp({
        id: 'm6-levels', t: 1, src: 'docs', title: 'Storage levels',
        say: 'Spark lets you choose where a cached block lives. Press Next to read the table.',
        cols: ['Level', 'Where', 'Speed', 'Use it when'],
        hl: 3,
        rows: [
          ['`MEMORY_ONLY`', 'Memory. A block that does not fit is not kept, and is recomputed when needed', 'Fastest to read', 'It all fits and recomputing is cheap'],
          ['`MEMORY_AND_DISK`', 'Memory first, then the local disk for what does not fit', 'Fast, with a slow tail', 'The default for a DataFrame. Recomputing is costly'],
          ['`DISK_ONLY`', 'Local disk only', 'Slower than memory, faster than a long recompute', 'Memory is tight and the chain to recompute is long'],
          ['`MEMORY_ONLY_SER` and the `_SER` levels', 'Serialised bytes in memory (Scala and Java)', 'Smaller, a little slower', 'Memory is tight and you use the JVM APIs'],
          ['`_2` levels (like `MEMORY_AND_DISK_2`)', 'Two copies on two executors', 'Same as the base', 'You cannot afford to recompute after an executor is lost'],
          ['`OFF_HEAP`', 'Memory outside the JVM heap', 'Fast, no garbage collection', 'Off-heap memory is enabled and you want to avoid GC pauses']
        ],
        steps: [
          { upto: 3, say: 'The first three are the ones you will use. Memory only, memory and disk, and disk only.' },
          { upto: 6, say: 'The others are special cases. Serialised levels are for the JVM APIs, two copies is for expensive recomputation, and off-heap needs a setting.' }
        ],
        pick: 'In the recording, the same four columns held in the three first levels took **' + mib(lvl('MEMORY_ONLY')[1]) + '** in memory for `MEMORY_ONLY` and `MEMORY_AND_DISK`, and **' + mib(lvl('DISK_ONLY')[2]) + '** on disk for `DISK_ONLY`: the same bytes in a different place.'
      }),

      B.code({
        id: 'm6-spill', t: 1, src: 'rec', title: 'Forcing a spill', file: 'memory.py', lang: 'python', code: SPILL,
        steps: [
          { say: 'On a laptop with 15 GB nothing runs out of memory by accident. So I forced it. This is the function. Press Next.', lines: null },
          { say: 'The docstring says what the trick is: the session was **started** with `spark.shuffle.spill.numElementsForceSpillThreshold` set to 20,000. A sort spills to disk after 20,000 rows are held in memory. It is read when the session starts, which is why the recorder starts a separate session for it.', lines: G.span(SPILL, /"""A sort in a session/, /numbers come from the task metrics/) },
          { say: 'The query sorts all 400,000 orders by two columns, which needs a lot of execution memory, and writes to the `noop` format. That sink does nothing with the rows, so no output slows the measurement.', lines: G.span(SPILL, /orderBy/) },
          { say: 'Adaptive execution is off and there are 4 shuffle partitions, so that the sort has few, big tasks. Then both settings are put back.', lines: G.span(SPILL, /adaptive\.enabled', 'false'/, /shuffle\.partitions', '4'/) }
        ],
        note: 'Recorded and labelled as forced: in production a spill is caused by too little memory for a task, not by a setting.'
      }),

      B.rows({
        id: 'm6-spill-facts', t: 1, src: 'rec', title: 'What the spill wrote',
        steps: [
          {
            say: 'The task metrics of the sort, read from the event log. Press Next.',
            tabs: [{ layer: 'RECORDED', name: 'Spill metrics of the sort', c: 'raw', cols: ['metric', 'value'], rows: [['rows sorted', n0(SP.rows_sorted)], ['spill forced after rows in memory', n0(SP.forced_after_rows)], ['memory bytes spilled', n0(SP.memory_bytes_spilled)], ['disk bytes spilled', n0(SP.disk_bytes_spilled)]], trk: 2 }],
            notes: ['Recorded: `Memory Bytes Spilled` and `Disk Bytes Spilled` summed over the tasks.']
          },
          {
            say: 'Two numbers, and they mean different things. **Memory bytes spilled** is the size of the data in memory **before** it was written: **' + mib(SP.memory_bytes_spilled) + '**. **Disk bytes spilled** is the size of what went to disk after serialising and compressing: **' + mib(SP.disk_bytes_spilled) + '**. The disk number is about ' + (SP.memory_bytes_spilled / SP.disk_bytes_spilled).toFixed(0) + ' times smaller.',
            tabs: [{ layer: 'RECORDED', name: 'Spill metrics of the sort', c: 'raw', cols: ['metric', 'value'], rows: [['rows sorted', n0(SP.rows_sorted)], ['spill forced after rows in memory', n0(SP.forced_after_rows)], ['memory bytes spilled', n0(SP.memory_bytes_spilled)], ['disk bytes spilled', n0(SP.disk_bytes_spilled)]], trk: 3, chg: [[2, 1], [3, 1]] }],
            notes: ['The Stages tab of the UI shows both as columns, "Spill (Memory)" and "Spill (Disk)". The first is the size of the problem and the second is the size of the disk write.']
          },
          {
            say: 'A spill is **not an error**. The query finished and the rows are correct. It is slow: the data is written, and later read back and merged. Read it as a sign that tasks are too big for the memory they have. The fixes are in the next screen.',
            tabs: [{ layer: 'RECORDED', name: 'Spill metrics of the sort', c: 'raw', cols: ['metric', 'value'], rows: [['rows sorted', n0(SP.rows_sorted)], ['spill forced after rows in memory', n0(SP.forced_after_rows)], ['memory bytes spilled', n0(SP.memory_bytes_spilled)], ['disk bytes spilled', n0(SP.disk_bytes_spilled)]], trk: 1 }],
            notes: ['If the spill ever stops being enough, the task fails with an out-of-memory error.']
          }
        ]
      }),

      B.cmp({
        id: 'm6-fail', t: 1, src: 'docs', title: 'Three memory failures and their first fix',
        say: 'Memory problems have three different faces. Learn to tell them apart, because the fixes are different. Press Next.',
        cols: ['Failure', 'The message', 'Usual cause', 'First fix'],
        hl: 3,
        rows: [
          ['Spill', 'No error. "Spill (Disk)" in the stage table', 'Tasks hold more than their share of execution memory', 'More partitions, a better key, less data per task'],
          ['Driver out of memory', '`java.lang.OutOfMemoryError: Java heap space` in the driver log', '`collect()` or `toPandas()` of a big result, a huge broadcast, too many partitions or files to list', 'Do not bring big data to the driver; raise `spark.driver.memory` only if the result must come back'],
          ['Executor out of memory', '`OutOfMemoryError` in an executor, or `ExecutorLostFailure`', 'One huge task (skew), huge rows, too many cores sharing the heap', 'Fix the skew, more partitions, fewer cores for each executor, more executor memory'],
          ['Container killed', '"Container killed by YARN for exceeding memory limits ... consider boosting `spark.executor.memoryOverhead`" (or an `OOMKilled` pod)', 'Memory outside the heap: Python workers, pandas UDFs, native buffers', 'Raise `spark.executor.memoryOverhead`, lower the Arrow batch size, fewer cores']
        ],
        steps: [
          { upto: 2, say: 'A spill is a slowdown. A driver out of memory is almost always a `collect`. Start with those two.' },
          { upto: 4, say: 'An executor out of memory is a heap problem. A killed container is a problem outside the heap, and no change of the heap size fixes it.' }
        ],
        pick: 'Read the **message**, not just "out of memory". `Java heap space` is the heap. "Container killed" is the overhead. They need opposite fixes.'
      }),

      B.talk({
        id: 'm6-offheap', t: 3, src: 'docs', title: 'Extra: off-heap memory and Tungsten',
        say: 'Spark manages a lot of its own memory, to avoid the cost of Java objects and garbage collection. Press Next for the two ideas.',
        items: [
          ['Tungsten', 'Spark stores rows in a compact **binary format** and generates code that works on it directly, instead of on Java objects. That is why a DataFrame is much smaller and faster than the same data as a list of objects, and why an RDD of Python objects is slow.', 'A binary row format and generated code.'],
          ['Off-heap memory', 'With `spark.memory.offHeap.enabled` and a size in `spark.memory.offHeap.size`, execution and storage can use memory **outside the JVM heap**, which the garbage collector does not scan. It lowers GC pauses on big heaps. The off-heap size is extra, on top of the heap and the overhead.', 'Memory the GC does not see.']
        ],
        cols: 1,
        call: { k: 'tip', h: 'In practice:', t: 'most jobs run well without it. If the Executors tab shows a lot of GC time, try smaller executors before off-heap.' }
      }),

      B.decide({
        id: 'm6-dec', t: 2, src: 'docs', title: 'Decision: cache the cleaned orders or not',
        scenario: 'A Brewline job cleans the orders (about 10 GB after the cleaning) and then runs three different reports on the result in the same job. Each report is an action. The executors have about 100 GB of storage memory in all. The cleaning takes twenty minutes. You choose.',
        opts: [
          { t: 'Cache the cleaned DataFrame, run the three reports, then unpersist', d: 'The cleaning runs once, and the reports read from memory.', lose: '' },
          { t: 'Do not cache: Spark is fast enough', d: 'Less code.', lose: 'Each of the three actions would run the twenty-minute cleaning again: an hour instead of twenty minutes and three reads.' },
          { t: 'Cache the raw input before the cleaning', d: 'The earliest point is the safest.', lose: 'It keeps the big raw table in memory, and the cleaning still runs three times.' }
        ],
        pick: 0,
        why: 'Cache the result that is **expensive, reused and small enough**. Here it is reused three times, it costs twenty minutes, and 10 GB fits easily in 100 GB. Cache after the cleaning, run the actions, and unpersist.',
        when: 'If the cleaned data were 300 GB, or the reports ran in separate jobs, write the result to a table and read it back. A table is durable and shared. A cache is neither.'
      }),

      B.bug({
        id: 'm6-bug', t: 1, q: 'This job caches a table to speed itself up, but it only runs one report on it, and it ran slower and used much more memory than before. Click the line that causes it.',
        file: 'report.py', lang: 'python',
        code: ['raw = spark.read.parquet("/lake/orders").cache()', 'paid = raw.filter(F.col("status") == "PAID")', 'paid.groupBy("store_id").count().show()'].join('\n'),
        bad: [1],
        hint: 'How many actions use the cached table, and what is kept?',
        why: 'The **whole raw table** is kept in memory, to serve one query that needs paid orders and one column. A cache pays only when a result is used by two or more actions. Here it is used once, so it costs memory and the extra step of filling it, and saves nothing. If you do cache, cache the small result after the filter and the column list.',
        fix: ['raw = spark.read.parquet("/lake/orders")', 'paid = raw.filter(F.col("status") == "PAID")', 'paid.groupBy("store_id").count().show()'].join('\n'),
        cheer: 'Cache what is reused, after you shrink it.'
      }),

      B.incident({
        id: 'm6-inc', t: 2, src: 'docs', title: 'Incident: containers killed, but the heap is fine', time: '02:15',
        alert: '**A PySpark job fails every night with "Container killed by YARN for exceeding memory limits. 10.4 GB of 10 GB physical memory used. Consider boosting spark.executor.memoryOverhead".** The executor heap in the UI never goes above 6 GB. The job got a pandas UDF last week.',
        clues: ['The heap is not full', 'The job started using pandas UDFs last week', 'The executors have 4 cores and 8 GB of heap, with the default overhead'],
        opts: [
          { t: 'Raise `spark.executor.memoryOverhead` (the Python workers live outside the heap), and consider smaller Arrow batches or fewer cores for each executor', fb: '' },
          { t: 'Raise `spark.executor.memory` only', fb: 'The heap is not the problem. The container limit is heap plus overhead, and the Python workers are in the overhead.' },
          { t: 'Add `.cache()` to the DataFrame', fb: 'That would use more memory.' },
          { t: 'Turn off adaptive execution', fb: 'It does not change the Python workers.' }
        ],
        best: 0,
        why: 'The container limit is the **heap plus the overhead**. Python worker processes, and the Arrow buffers of a pandas UDF, are outside the heap, in the overhead. The default overhead is 10 percent, about 800 MB, shared by 4 workers. Raise it, and lower `spark.sql.execution.arrow.maxRecordsPerBatch` (' + G.table('conf.defaults').rows.filter(function (r) { return /maxRecordsPerBatch/.test(r[0]); })[0][1] + ' rows by default) to make each batch smaller.',
        checks: [
          ['Read the message', '"Container killed" and "memoryOverhead" point outside the heap.'],
          ['Look at the heap', 'If the heap in the UI is not full, the heap is not the cause.'],
          ['Fix it', 'Raise the overhead to give each Python worker a gigabyte or more, and test a smaller batch size.'],
          ['Guard', 'Size the overhead whenever a PySpark job gets a pandas UDF, and alert on container kills.']
        ],
        tell: 'The container was killed although the heap was fine, because the pandas UDF added Python worker memory, which is outside the heap. I raised the memory overhead and lowered the Arrow batch size, and the job has not been killed since.',
        prevent: ['Size the overhead for PySpark and pandas UDFs', 'Test a new UDF on a full-size day before release', 'Alert on killed containers']
      }),

      B.quiz({
        id: 'm6-q1', t: 1,
        q: 'An executor has a 1 GiB heap. About how much memory is shared by execution and storage?',
        opts: [{ t: '1 GiB', fb: 'Spark keeps a reserve and a share for you.' }, { t: 'About 455 MB, from (heap - 300 MiB) x 0.6', fb: '' }, { t: '300 MiB', fb: 'That is the reserve.' }, { t: '60 percent of 1 GiB', fb: 'The reserve is taken away first.' }],
        ok: 1,
        why: 'The session reported ' + n0(heap1g[2]) + ' bytes for the 1 GiB heap, and the formula gave ' + n0(heap1g[3]) + '.'
      }),

      B.quiz({
        id: 'm6-q2', t: 1,
        q: 'You call `df.cache()` and nothing is kept yet. Why?',
        opts: [{ t: 'cache() is lazy: the data is kept after the first action', fb: '' }, { t: 'The cache is full', fb: 'Nothing was computed yet.' }, { t: 'It failed silently', fb: 'It did what it should.' }, { t: 'cache() only works on RDDs', fb: 'It works on DataFrames.' }],
        ok: 0,
        why: 'The plan printed before any action already showed `InMemoryRelation`, and the data arrived only on the first count.'
      }),

      B.quiz({
        id: 'm6-q3', t: 1,
        q: 'A report is the only user of a 200 GB table. Someone adds `.cache()` on the table. What is the result?',
        opts: [{ t: 'It is faster', fb: 'It is read once anyway.' }, { t: 'It costs memory and time and saves nothing', fb: '' }, { t: 'The job fails at once', fb: 'It may spill, but it does not fail by itself.' }, { t: 'Spark ignores it', fb: 'It does the work.' }],
        ok: 1,
        why: 'A cache pays when a result is used by two or more actions. Here it is used once.'
      }),

      B.quiz({
        id: 'm6-q4', t: 1,
        q: 'The stage table shows "Spill (Memory) 20 GB" and "Spill (Disk) 3 GB". What do the two numbers mean?',
        opts: [{ t: 'Memory: the size of the data in memory before the spill. Disk: what was written, serialised and compressed', fb: '' }, { t: 'Memory: what was lost. Disk: what was saved', fb: 'Nothing is lost in a spill.' }, { t: 'Two different tasks', fb: 'Both are sums over the tasks.' }, { t: 'An error and a warning', fb: 'A spill is neither.' }],
        ok: 0,
        why: 'In the recording, ' + mib(SP.memory_bytes_spilled) + ' of data in memory became ' + mib(SP.disk_bytes_spilled) + ' on disk.'
      }),

      B.quiz({
        id: 'm6-q5', t: 2,
        q: 'The message says "Container killed by YARN for exceeding memory limits ... boosting spark.executor.memoryOverhead". What do you change?',
        opts: [{ t: '`spark.driver.memory`', fb: 'It is an executor container.' }, { t: '`spark.executor.memoryOverhead`', fb: '' }, { t: '`spark.sql.shuffle.partitions` only', fb: 'It may help, but the message names the overhead.' }, { t: 'Nothing, it is transient', fb: 'It will come back.' }],
        ok: 1,
        why: 'Memory outside the heap, such as Python workers, is what the overhead covers. Raising the heap does not move the container limit enough.'
      }),

      B.order({
        id: 'm6-ord', t: 2, q: 'Put what happens when a sort runs short of execution memory in order.',
        items: [
          'A task sorts rows in memory',
          'The memory it may use is full',
          'The task writes the sorted data so far to a spill file on disk',
          'The task goes on with the next rows and spills again when needed',
          'At the end the task merges the spill files with what is in memory',
          'The task returns its sorted output'
        ],
        why: 'A spill makes the sort external: sorted runs go to disk and are merged at the end. The cost is the writes and the reads. The result is the same.'
      }),

      B.qa({
        id: 'qa-memory', t: 1, tag: 'Memory', secs: 90,
        q: 'How does Spark manage executor memory?',
        pts: ['Heap, 300 MiB reserved', 'Unified region: 60 percent of the rest', 'Execution (shuffles, joins, sorts) and storage (cache, broadcasts)', 'They borrow; execution can evict storage', 'User memory: 40 percent', 'Overhead outside the heap: Python, native, buffers'],
        short: 'An executor is a JVM with a heap set by `spark.executor.memory`. Spark takes **300 MiB** of it as a reserve. Of the rest, **60 percent**, `spark.memory.fraction`, is the **unified region**, shared by **execution** memory, for shuffles, joins and sorts, and **storage** memory, for the cache and broadcasts. They can borrow from each other, and execution can push cached blocks out, but not the other way round. The remaining 40 percent is user memory. Outside the heap there is the **overhead**, 10 percent or at least 384 MiB by default, which holds Python workers and native buffers. I checked it on a real session: for a 1 GiB heap, Spark reported 455,501,414 bytes, which is exactly the formula.',
        fu: [['How is memory divided among tasks?', 'Each running task gets between 1/(2N) and 1/N of the execution memory, with N the number of active tasks in the executor, so more cores per executor means less memory per task.'], ['What changes for PySpark?', 'The Python workers are outside the heap, so the overhead needs more room, especially with pandas UDFs.']],
        trap: 'Saying that all of the executor memory is available to the data.',
        real: 'An executor has 16 GB and 5 cores. How much memory does a task have?'
      }),

      B.qa({
        id: 'qa-cache', t: 1, tag: 'Memory', secs: 75,
        q: 'When should you cache a DataFrame, and when not?',
        pts: ['cache is lazy: kept after the first action', 'Cache when it is expensive, reused by 2 or more actions, and fits', 'Not when used once, or cheap to recompute, or bigger than memory', 'Cache after filtering and trimming', 'MEMORY_AND_DISK is the default', 'unpersist when done; not durable'],
        short: '`cache()` is lazy: the data is kept in memory after the first action that computes it, and the next actions read the kept copy. It pays when the DataFrame is **expensive to compute, used by two or more actions, and small enough to fit**. It does not pay when the result is used once, or is as cheap to recompute as to read, or is bigger than the available memory. I cache after the filter and the column list, so that I keep the small result and not the raw table. The default level for a DataFrame is `MEMORY_AND_DISK`. I call `unpersist` when I am done, and I do not treat a cache as durable: if the data must survive an executor loss or be shared between jobs, I write a table.',
        fu: [['How do you know that the cache is used?', 'The plan has an `InMemoryTableScan`, and the Storage tab lists the cached blocks. The recording showed a second action that read exactly the bytes of the cache.'], ['cache or persist?', 'cache() is persist() with the default level. persist lets you choose the level.']],
        trap: 'Saying that cache() makes everything faster.',
        real: 'Tell me about a time a cache made your job worse.'
      }),

      B.qa({
        id: 'qa-oom', t: 2, tag: 'Memory', secs: 90,
        q: 'A Spark job runs out of memory. How do you debug it?',
        pts: ['Which process: driver, executor, or container?', 'Read the exact message', 'Driver: collect, toPandas, broadcast, file listing', 'Executor: skew, big partitions, too many cores for the heap', 'Container: overhead, Python, pandas UDF', 'Stage table: spill, max against median'],
        short: 'First I find **which process** ran out and read the exact message. A driver error means something big came back to it: a `collect`, a `toPandas`, a huge broadcast, or too many files to list. An error in an executor usually means one task is too big: skew, partitions that are too large, or too many cores sharing the heap, and the stage table shows it as a maximum far above the median, or heavy spill. "Container killed ... memoryOverhead" means memory outside the heap, usually Python workers or a pandas UDF, and I raise the overhead. I fix the cause first, with more partitions, a salt, or a smaller result, and only then add memory.',
        fu: [['What is the first thing to try for a spill?', 'More partitions, so that each task holds less. Then fewer cores per executor, or more memory.'], ['Why not just add memory?', 'It hides skew, raises the bill, and a hot key will outgrow any size.']],
        trap: 'Doubling the memory before reading the message.',
        real: 'Describe the last out-of-memory error you fixed, and how you knew where to look.'
      }),

      B.recap({
        id: 'm6-recap', n: 6, badge: 'Cache Keeper', color: '#E9D5FF',
        pts: [
          'An executor heap has **300 MiB reserved**, a **unified region** of 60 percent of the rest for execution and storage, and 40 percent user memory. **Overhead** is outside the heap.',
          'Checked on a real session: a 1 GiB heap reported **' + n0(heap1g[2]) + '** bytes, equal to the formula.',
          '`cache()` is **lazy**. The second count read **' + n0(CR.rows[1][1]) + '** bytes, exactly the size of the cache.',
          'Cache what is **expensive, reused and small enough**. Not what is used once. `unpersist` when done.',
          'A **spill** is a slowdown, not an error: ' + mib(SP.memory_bytes_spilled) + ' in memory became ' + mib(SP.disk_bytes_spilled) + ' on disk in the forced sort.',
          'Three failures: **driver** (collect, broadcast), **executor** (skew, big tasks), **container** (overhead, Python workers).'
        ],
        lines: [
          'I cache what is reused, after I shrink it.',
          'I read the message to know which memory ran out.',
          'I fix the skew before I add memory.'
        ]
      })
    ]
  });
})();
