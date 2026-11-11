/* Diagram specs for the Apache Spark for data engineers tutorial. Plain data: nodes, edges, tags. shared/js/graph.js draws them.
   The small builder below turns a grid position (column, row) into pixels and draws a straight or curved arrow between two nodes, so a diagram is a list
   of nodes and a list of arrows. Titles stay under about 20 characters and subtitles under about 28, so that the text fits in a chip.
   The diagrams show how Spark works. The numbers that belong to the Brewline runs are not in the diagrams; the lessons read them from js/real.js. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var H = LAB.Graph.h, V = LAB.Graph.v;
  var S = (LAB.graphs = {});

  function build(o) {
    var cw = o.cw || 235, ch = o.ch || 66, dx = o.dx || 275, dy = o.dy || 140, x0 = o.x0 || 20, y0 = o.y0 || 60;
    var byId = {}, nodes = [], edges = [];
    o.nodes.forEach(function (t) {
      var opt = t[7] || {};
      var n = { id: t[0], x: Math.round(x0 + t[1] * dx), y: Math.round(y0 + t[2] * dy), w: opt.w || cw, h: opt.h || ch, t: t[3], c: t[5] || 'raw', k: t[6] || 'chip' };
      if (t[4] !== null && t[4] !== undefined) { if (Array.isArray(t[4])) n.ss = t[4]; else n.s = t[4]; }
      byId[n.id] = n;
      nodes.push(n);
    });
    o.edges.forEach(function (t) {
      var a = byId[t[1]], b = byId[t[2]], opt = t[4] || {}, ax = a.x + a.w / 2, ay = a.y + a.h / 2, bx = b.x + b.w / 2, by = b.y + b.h / 2, d, mx, my;
      if (opt.d) { d = opt.d; mx = opt.bx; my = opt.by; }
      else if (Math.abs(ay - by) < 3) {                          /* same row: a straight arrow */
        if (b.x > a.x) { d = 'M' + (a.x + a.w) + ' ' + ay + ' H' + b.x; mx = (a.x + a.w + b.x) / 2; }
        else { d = 'M' + a.x + ' ' + ay + ' H' + (b.x + b.w); mx = (a.x + b.x + b.w) / 2; }
        my = ay - 27;
      } else if (Math.abs(ax - bx) < 3) {                        /* same column: a straight arrow */
        if (b.y > a.y) { d = 'M' + ax + ' ' + (a.y + a.h) + ' V' + b.y; my = (a.y + a.h + b.y) / 2; }
        else { d = 'M' + ax + ' ' + a.y + ' V' + (b.y + b.h); my = (a.y + b.y + b.h) / 2; }
        mx = ax + 28;
      } else if (b.x >= a.x + a.w - 3 || b.x + b.w <= a.x + 3) { /* another column and another row: a horizontal S curve */
        var x1 = b.x > a.x ? a.x + a.w : a.x, x2 = b.x > a.x ? b.x : b.x + b.w;
        d = H(x1, ay, x2, by); mx = (x1 + x2) / 2; my = (ay + by) / 2 - 2;
      } else {                                                   /* overlapping columns: a vertical S curve */
        var y1 = b.y > a.y ? a.y + a.h : a.y, y2 = b.y > a.y ? b.y : b.y + b.h;
        d = V(ax, y1, bx, y2); mx = (ax + bx) / 2 + 28; my = (y1 + y2) / 2;
      }
      var e = { id: t[0], a: t[1], b: t[2], d: d, n: t[3] };
      if (opt.nb) e.nb = true; else { e.bx = Math.round(opt.bx !== undefined ? opt.bx : mx); e.by = Math.round(opt.by !== undefined ? opt.by : my); }
      if (opt.k) e.k = opt.k;
      if (opt.label) e.label = opt.label;
      edges.push(e);
    });
    var spec = { w: o.w || 1100, h: o.h, label: o.label, nodes: nodes, edges: edges };
    if (o.groups) spec.groups = o.groups;
    if (o.tags) spec.tags = o.tags;
    if (o.pk) spec.pk = o.pk;
    return spec;
  }

  /* ------------------------------------------------------------------ */
  /* 1. The Brewline Spark platform on one page                          */
  /* ------------------------------------------------------------------ */
  S.master = build({
    h: 400, cw: 190, dx: 216,
    label: 'The Brewline Spark platform on one page. Sources are files, Delta tables and streams. The driver builds the plan and the task scheduler. Executors run the tasks, keep the cache and write shuffle files. The output is Delta tables, Parquet files or a stream sink, and other jobs and dashboards use it. Along the bottom: the cluster manager, the event log, tests, spark-submit and cost.',
    nodes: [
      ['s_src', 0, 0, 'SOURCES', ['Parquet files', 'Delta tables', 'Streams'], 'src', 'layer', { h: 170 }],
      ['s_drv', 1, 0, 'DRIVER', ['SparkSession', 'Query plan', 'Task scheduler'], 'stg', 'layer', { h: 170 }],
      ['s_exe', 2, 0, 'EXECUTORS', ['Tasks on cores', 'Cache in memory', 'Shuffle files'], 'int', 'layer', { h: 170 }],
      ['s_out', 3, 0, 'OUTPUT', ['Delta tables', 'Parquet files', 'Stream sinks'], 'mart', 'layer', { h: 170 }],
      ['s_use', 4, 0, 'USE', ['SQL and BI', 'Models', 'Other jobs'], 'con', 'layer', { h: 170 }],
      ['x_cm', 0, 1.8, 'Cluster', 'local, YARN, K8s', 'air', 'pill', { w: 165, h: 56 }],
      ['x_log', 0.84, 1.8, 'Event log', 'what the UI draws', 'mon', 'pill', { w: 165, h: 56 }],
      ['x_test', 1.68, 1.8, 'Tests', 'pytest, local mode', 'qual', 'pill', { w: 165, h: 56 }],
      ['x_sub', 2.52, 1.8, 'spark-submit', 'flags and config', 'ci', 'pill', { w: 165, h: 56 }],
      ['x_cost', 3.36, 1.8, 'Cost', 'cores times hours', 'snap', 'pill', { w: 165, h: 56 }]
    ],
    edges: [
      ['m1', 's_src', 's_drv', 1, { bx: 218, by: 96 }],
      ['m2', 's_drv', 's_exe', 2, { bx: 434, by: 96 }],
      ['m3', 's_exe', 's_out', 3, { bx: 650, by: 96 }],
      ['m4', 's_out', 's_use', 4, { bx: 866, by: 96 }]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 2. Driver, cluster manager, executors                               */
  /* ------------------------------------------------------------------ */
  S.cluster = build({
    h: 590, dy: 125,
    label: 'A Spark application. Your code starts a driver. The driver asks the cluster manager for executors. The cluster manager starts them on worker machines. The driver sends tasks to the executors, and the executors read and write the storage.',
    nodes: [
      ['k_app', 0, 0, 'Your code', 'spark-submit or notebook', 'src'],
      ['k_drv', 1.5, 0, 'Driver', 'plan, stages, scheduler', 'stg'],
      ['k_cm', 3, 0, 'Cluster manager', 'local, YARN, Kubernetes', 'air'],
      ['k_exe', 0.5, 2, 'EXECUTORS', ['Executor 1     Executor 2     Executor 3', 'each: cores, memory, cache'], 'int', 'layer', { w: 785, h: 110 }],
      ['k_store', 1.5, 3.3, 'Storage', 'object store or HDFS', 'raw']
    ],
    edges: [
      ['k1', 'k_app', 'k_drv', 1],
      ['k2', 'k_drv', 'k_cm', 2],
      ['k3', 'k_cm', 'k_exe', 3],
      ['k4', 'k_drv', 'k_exe', 4],
      ['k5', 'k_exe', 'k_store', 5, { k: 'data' }]
    ],
    tags: [
      { id: 'tg_one', x: 20, y: 190, t: 'the driver is one machine', c: 'qual' },
      { id: 'tg_task', x: 20, y: 480, t: 'one task = one partition on one core', c: 'int' }
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 3. From code to a plan                                              */
  /* ------------------------------------------------------------------ */
  S.plan = build({
    h: 330,
    label: 'From your code to tasks. Your DataFrame or SQL becomes a parsed plan, then an analyzed plan once names and types are checked against the catalog, then an optimized plan after the Catalyst rules, then a physical plan with real scans, joins and exchanges. Adaptive execution can change it at run time. The scheduler cuts it into stages and tasks, and the SQL tab shows the plan.',
    nodes: [
      ['p_code', 0, 0, 'Your code', 'filter, join, groupBy', 'src'],
      ['p_parsed', 1, 0, 'Parsed plan', 'names not checked yet', 'raw'],
      ['p_analyzed', 2, 0, 'Analyzed plan', 'names and types resolved', 'stg'],
      ['p_opt', 3, 0, 'Optimized plan', 'Catalyst rules applied', 'int'],
      ['p_phys', 3, 1, 'Physical plan', 'scans, joins, exchanges', 'mart'],
      ['p_aqe', 2, 1, 'Adaptive plan', 're-planned at run time', 'sf'],
      ['p_dag', 1, 1, 'Stages and tasks', 'cut at each shuffle', 'air'],
      ['p_ui', 0, 1, 'The SQL tab', 'the plan you can read', 'mon']
    ],
    edges: [
      ['q1', 'p_code', 'p_parsed', 1],
      ['q2', 'p_parsed', 'p_analyzed', 2],
      ['q3', 'p_analyzed', 'p_opt', 3],
      ['q4', 'p_opt', 'p_phys', 4],
      ['q5', 'p_phys', 'p_aqe', 5],
      ['q6', 'p_aqe', 'p_dag', 6],
      ['q7', 'p_dag', 'p_ui', 7]
    ],
    tags: [
      { id: 'tg_lazy', x: 20, y: 148, t: 'nothing has run yet', c: 'qual' },
      { id: 'tg_same', x: 295, y: 148, t: 'SQL gives the same plan', c: 'ci' },
      { id: 'tg_cat', x: 570, y: 148, t: 'asks the catalog', c: 'mon' }
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 4. Job, stages, tasks                                               */
  /* ------------------------------------------------------------------ */
  S.dag = build({
    h: 440, dy: 125,
    label: 'Job, stages and tasks. An action starts a job. The job is cut into stages at each shuffle. Each stage is cut into tasks, one per partition. The last stage returns the result to the driver or writes files.',
    nodes: [
      ['d_act', 0, 0, 'Action', 'count, write, collect', 'src'],
      ['d_job', 1, 0, 'Job', 'one for every action', 'raw'],
      ['d_st1', 2, 0, 'Stage 1', 'read, filter, partial sum', 'stg'],
      ['d_st2', 3, 0, 'Stage 2', 'final sum for each key', 'stg'],
      ['d_t1', 2, 1, 'Stage 1 tasks', 'one per input partition', 'int'],
      ['d_t2', 3, 1, 'Stage 2 tasks', 'one per shuffle partition', 'int'],
      ['d_res', 3, 2, 'Result', 'to the driver or to files', 'mart']
    ],
    edges: [
      ['g1', 'd_act', 'd_job', 1],
      ['g2', 'd_job', 'd_st1', 2],
      ['g3', 'd_st1', 'd_st2', 3, { label: 'shuffle' }],
      ['g4', 'd_st1', 'd_t1', 4],
      ['g5', 'd_st2', 'd_t2', 5],
      ['g6', 'd_t2', 'd_res', 6]
    ],
    tags: [
      { id: 'tg_job', x: 20, y: 200, t: 'a job for every action', c: 'raw' },
      { id: 'tg_stage', x: 20, y: 245, t: 'a new stage at each shuffle', c: 'stg' },
      { id: 'tg_tsk', x: 20, y: 290, t: 'a task for every partition', c: 'int' }
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 5. A shuffle                                                        */
  /* ------------------------------------------------------------------ */
  S.shuffle = build({
    h: 500, dy: 125, cw: 205, pk: 1,
    label: 'A shuffle. Three map tasks each write their rows into shuffle files on the local disk, one slice for every reduce task. Then each reduce task fetches its slice from the files of all the map tasks. Adaptive execution can merge small slices into fewer reduce tasks.',
    nodes: [
      ['m1', 0, 0, 'Map task 1', 'reads one partition', 'stg'],
      ['m2', 0, 1, 'Map task 2', 'reads one partition', 'stg'],
      ['m3', 0, 2, 'Map task 3', 'reads one partition', 'stg'],
      ['f1', 1.5, 0, 'Shuffle file 1', 'on a local disk', 'air'],
      ['f2', 1.5, 1, 'Shuffle file 2', 'on a local disk', 'air'],
      ['f3', 1.5, 2, 'Shuffle file 3', 'on a local disk', 'air'],
      ['r1', 3, 0, 'Reduce task 1', 'fetches its slice', 'int'],
      ['r2', 3, 1, 'Reduce task 2', 'fetches its slice', 'int'],
      ['r3', 3, 2, 'Reduce task 3', 'fetches its slice', 'int']
    ],
    edges: [
      ['w1', 'm1', 'f1', 1], ['w2', 'm2', 'f2', 1, { nb: true }], ['w3', 'm3', 'f3', 1, { nb: true }],
      ['f11', 'f1', 'r1', 2, { bx: 748, by: 66 }], ['f12', 'f1', 'r2', 2, { nb: true }], ['f13', 'f1', 'r3', 2, { nb: true }],
      ['f21', 'f2', 'r1', 2, { nb: true }], ['f22', 'f2', 'r2', 2, { nb: true }], ['f23', 'f2', 'r3', 2, { nb: true }],
      ['f31', 'f3', 'r1', 2, { nb: true }], ['f32', 'f3', 'r2', 2, { nb: true }], ['f33', 'f3', 'r3', 2, { nb: true }]
    ],
    tags: [
      { id: 'tg_w', x: 20, y: 440, t: 'write: one slice per reducer', c: 'stg' },
      { id: 'tg_f', x: 385, y: 440, t: 'fetch: every reducer asks all', c: 'int' },
      { id: 'tg_aqe', x: 770, y: 440, t: 'AQE merges small slices', c: 'sf' }
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 6. Three ways to join                                               */
  /* ------------------------------------------------------------------ */
  S.joins = build({
    h: 590, dy: 125,
    label: 'Three ways to join. A broadcast hash join copies the small table to every executor and joins inside each task without shuffling the big table. A sort-merge join shuffles both tables by the join key, sorts each side and merges them. Tables bucketed on the same key with the same bucket count can join without a shuffle.',
    nodes: [
      ['ja_in', 0, 0, 'Orders and stores', 'one big, one small', 'src'],
      ['ja_bc', 1, 0, 'Broadcast', 'small side to every executor', 'air'],
      ['ja_hj', 2, 0, 'Hash join', 'inside each task', 'int'],
      ['ja_out', 3, 0, 'Joined rows', 'big side never moves', 'mart'],
      ['jb_in', 0, 1.5, 'Orders and customers', 'both large', 'src'],
      ['jb_sh', 1, 1.5, 'Shuffle both', 'same key, same task', 'air'],
      ['jb_sort', 2, 1.5, 'Sort and merge', 'sort each side, then zip', 'int'],
      ['jb_out', 3, 1.5, 'Joined rows', 'after two shuffles', 'mart'],
      ['jc_in', 0, 3, 'Bucketed tables', 'same key, same bucket count', 'src'],
      ['jc_no', 1, 3, 'No exchange', 'the buckets already line up', 'air'],
      ['jc_sort', 2, 3, 'Merge', 'each bucket is sorted', 'int'],
      ['jc_out', 3, 3, 'Joined rows', 'zero shuffles', 'mart']
    ],
    edges: [
      ['ja1', 'ja_in', 'ja_bc', 1], ['ja2', 'ja_bc', 'ja_hj', 2], ['ja3', 'ja_hj', 'ja_out', 3],
      ['jb1', 'jb_in', 'jb_sh', 1], ['jb2', 'jb_sh', 'jb_sort', 2], ['jb3', 'jb_sort', 'jb_out', 3],
      ['jc1', 'jc_in', 'jc_no', 1], ['jc2', 'jc_no', 'jc_sort', 2], ['jc3', 'jc_sort', 'jc_out', 3]
    ],
    tags: [
      { id: 'tg_thr', x: 295, y: 150, t: 'small side under 10 MiB', c: 'air' },
      { id: 'tg_big', x: 295, y: 337, t: 'both sides cross the network', c: 'qual' },
      { id: 'tg_buck', x: 295, y: 520, t: 'paid once, when the tables are written', c: 'ci' }
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 7. A skewed key                                                     */
  /* ------------------------------------------------------------------ */
  S.skew = build({
    h: 545, cw: 200,
    label: 'A skewed key. Orders are grouped by store. Three tasks each get a slice. Two tasks get a small slice and finish early. The task that gets the hot store, about a third of all rows, runs long, and the stage waits for it. Fixes: adaptive execution splits the big partition, salting spreads the key wider, or a broadcast avoids the shuffle.',
    nodes: [
      ['sk_in', 0, 1, 'Orders', 'grouped by store', 'src'],
      ['sk_t1', 1, 0, 'Task 1', 'a small slice', 'stg'],
      ['sk_t2', 1, 1, 'Task 2', 'a small slice', 'stg'],
      ['sk_t3', 1, 2, 'Task 3', ['store s01', 'a third of the rows'], 'qual', 'chip', { h: 128 }],
      ['sk_wait', 2, 1, 'Stage waits', 'for the slowest task', 'mon'],
      ['sk_f1', 3, 0, 'AQE skew join', 'splits the big piece', 'sf'],
      ['sk_f2', 3, 1, 'Salting', 'spread one key wider', 'int'],
      ['sk_f3', 3, 2, 'Broadcast', 'no shuffle at all', 'air']
    ],
    edges: [
      ['k1', 'sk_in', 'sk_t1', 1], ['k2', 'sk_in', 'sk_t2', 1, { nb: true }], ['k3', 'sk_in', 'sk_t3', 1, { nb: true }],
      ['k4', 'sk_t1', 'sk_wait', 2], ['k5', 'sk_t2', 'sk_wait', 2, { nb: true }], ['k6', 'sk_t3', 'sk_wait', 2, { nb: true }],
      ['k7', 'sk_wait', 'sk_f1', 3], ['k8', 'sk_wait', 'sk_f2', 3, { nb: true }], ['k9', 'sk_wait', 'sk_f3', 3, { nb: true }]
    ],
    tags: [
      { id: 'tg_hot', x: 20, y: 490, t: 'one task does a third of the work', c: 'qual' },
      { id: 'tg_time', x: 420, y: 490, t: 'the stage is as slow as that task', c: 'mon' }
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 8. Adaptive query execution                                         */
  /* ------------------------------------------------------------------ */
  S.aqe = build({
    h: 330,
    label: 'Adaptive query execution. Spark starts with an initial plan built from estimates. It runs the map side, reads the real size of every shuffle partition, and plans again with the real numbers. Three changes can happen: small partitions are merged, a sort-merge join becomes a broadcast join, and a skewed partition is split. The final plan is what the SQL tab shows.',
    nodes: [
      ['a_plan', 0, 0, 'Initial plan', 'sizes are only guesses', 'raw'],
      ['a_run', 1, 0, 'Run the map side', 'shuffle files get written', 'stg'],
      ['a_stats', 2, 0, 'Real sizes', 'bytes in every partition', 'mon'],
      ['a_re', 3, 0, 'Plan again', 'with the real numbers', 'sf'],
      ['a_coal', 3, 1, 'Merge small parts', 'fewer, fuller reduce tasks', 'mart'],
      ['a_join', 2, 1, 'Change the join', 'sort-merge to broadcast', 'mart'],
      ['a_skew', 1, 1, 'Split skewed parts', 'one big part in pieces', 'mart'],
      ['a_final', 0, 1, 'Final plan', 'what the SQL tab shows', 'int']
    ],
    edges: [
      ['e1', 'a_plan', 'a_run', 1],
      ['e2', 'a_run', 'a_stats', 2],
      ['e3', 'a_stats', 'a_re', 3],
      ['e4', 'a_re', 'a_coal', 4],
      ['e5', 'a_coal', 'a_join', 4, { nb: true }],
      ['e6', 'a_join', 'a_skew', 4, { nb: true }],
      ['e7', 'a_skew', 'a_final', 5]
    ],
    tags: [
      { id: 'tg_on', x: 20, y: 148, t: 'on by default in Spark 4', c: 'air' },
      { id: 'tg_stage', x: 330, y: 148, t: 'it needs a shuffle to look at', c: 'qual' }
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 9. Executor memory                                                  */
  /* ------------------------------------------------------------------ */
  S.memory = build({
    h: 535, cw: 205,
    label: 'Executor memory. The heap is split into 300 MiB reserved for Spark, a unified region of 60 percent of the rest, and user memory for the remaining 40 percent. Inside the unified region, execution memory serves shuffles, joins and sorts, and storage memory holds the cache and broadcasts. They can borrow from each other. When execution is full it spills to disk. Python workers live outside the heap, in the overhead.',
    nodes: [
      ['m_heap', 0, 1, 'Executor heap', 'spark.executor.memory', 'src'],
      ['m_res', 1, 0, 'Reserved', '300 MiB for Spark', 'seed'],
      ['m_unif', 1, 1, 'Unified region', '60% of the rest', 'int'],
      ['m_user', 1, 2, 'User memory', '40%: your own objects', 'raw'],
      ['m_exec', 2, 0.5, 'Execution', 'shuffles, joins, sorts', 'stg'],
      ['m_stor', 2, 1.5, 'Storage', 'cache and broadcasts', 'mart'],
      ['m_spill', 3, 0.5, 'Spill to disk', 'when execution is full', 'qual'],
      ['m_evict', 3, 1.5, 'Evict a block', 'storage gives way', 'mon'],
      ['x_over', 0, 2.7, 'Overhead', 'Python workers live here', 'ci', 'pill', { w: 235, h: 56 }]
    ],
    edges: [
      ['h1', 'm_heap', 'm_res', 1],
      ['h2', 'm_heap', 'm_unif', 2],
      ['h3', 'm_heap', 'm_user', 3],
      ['h4', 'm_unif', 'm_exec', 4],
      ['h5', 'm_unif', 'm_stor', 4, { nb: true }],
      ['h6', 'm_exec', 'm_spill', 5],
      ['h7', 'm_stor', 'm_evict', 5, { nb: true }],
      ['h8', 'm_exec', 'm_stor', 6, { label: 'borrow' }]
    ],
    tags: [
      { id: 'tg_form', x: 20, y: 290, t: '(heap - 300 MiB) x 0.6', c: 'sf' },
      { id: 'tg_off', x: 20, y: 490, t: 'outside the heap', c: 'ci' }
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 10. Files on disk                                                   */
  /* ------------------------------------------------------------------ */
  S.files = build({
    h: 400,
    label: 'A table on disk. A table folder holds partition folders, one for each value of the partition column. A folder holds Parquet files. A file holds row groups, and a row group holds one compressed chunk for every column. The file footer keeps the minimum and maximum of each chunk, so a filter can skip row groups that cannot match, and only the rows you need are read.',
    nodes: [
      ['f_tbl', 0, 0, 'Table folder', 'one folder per table', 'raw'],
      ['f_part', 1, 0, 'Partition folders', 'order_date=2026-11-01', 'stg'],
      ['f_file', 2, 0, 'Parquet files', 'one per task that wrote', 'int'],
      ['f_rg', 3, 0, 'Row groups', 'a block of rows each', 'ing'],
      ['f_col', 3, 1, 'Column chunks', 'one column, compressed', 'mart'],
      ['f_stat', 2, 1, 'Min and max', 'kept in the file footer', 'mon'],
      ['f_skip', 1, 1, 'Skip the rest', 'filter checks the footer', 'sf'],
      ['f_read', 0, 1, 'Rows you need', 'only these are read', 'con']
    ],
    edges: [
      ['l1', 'f_tbl', 'f_part', 1],
      ['l2', 'f_part', 'f_file', 2],
      ['l3', 'f_file', 'f_rg', 3],
      ['l4', 'f_rg', 'f_col', 4],
      ['l5', 'f_col', 'f_stat', 5],
      ['l6', 'f_stat', 'f_skip', 6],
      ['l7', 'f_skip', 'f_read', 7]
    ],
    tags: [
      { id: 'tg_prune', x: 20, y: 300, t: 'folders: partition pruning', c: 'stg' },
      { id: 'tg_push', x: 350, y: 300, t: 'footers: predicate pushdown', c: 'mon' },
      { id: 'tg_small', x: 700, y: 300, t: 'thousands of tiny files hurt', c: 'qual' }
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 11. Structured Streaming                                            */
  /* ------------------------------------------------------------------ */
  S.stream = build({
    h: 400,
    label: 'A Structured Streaming query. A source folder is being filled. The query records which files are new, runs a micro-batch, which is an ordinary query on the new data, and keeps partial counts per window in the state store. The watermark closes windows that are old enough. Results go to a sink. The checkpoint stores offsets, commits and state, so a restart resumes where it stopped.',
    nodes: [
      ['t_src', 0, 0, 'New files', 'a folder being filled', 'src'],
      ['t_off', 1, 0, 'Source offsets', 'which files are new', 'mon'],
      ['t_batch', 2, 0, 'Micro-batch', 'a normal query on new data', 'stg'],
      ['t_state', 3, 0, 'State store', 'partial counts per window', 'int'],
      ['t_wm', 3, 1, 'Watermark', 'closes windows that are old', 'qual'],
      ['t_sink', 2, 1, 'Sink', 'files, tables, foreachBatch', 'mart'],
      ['t_chk', 1, 1, 'Checkpoint', 'offsets, commits, state', 'ci'],
      ['t_rs', 0, 1, 'Restart', 'resumes from the checkpoint', 'air']
    ],
    edges: [
      ['s1', 't_src', 't_off', 1],
      ['s2', 't_off', 't_batch', 2],
      ['s3', 't_batch', 't_state', 3],
      ['s4', 't_state', 't_wm', 4],
      ['s5', 't_wm', 't_sink', 5],
      ['s6', 't_sink', 't_chk', 6],
      ['s7', 't_chk', 't_rs', 7]
    ],
    tags: [
      { id: 'tg_twice', x: 20, y: 300, t: 'a batch may run twice', c: 'qual' },
      { id: 'tg_idem', x: 350, y: 300, t: 'make the sink idempotent', c: 'mart' }
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 12. A Delta table                                                   */
  /* ------------------------------------------------------------------ */
  S.delta = build({
    h: 440, dy: 125,
    label: 'A Delta table is Parquet files plus a transaction log. A writer first writes new Parquet files, then adds one commit file to the _delta_log folder. Readers see the new version only when the commit exists. A reader reads the log from the last checkpoint, opens only the files that the log lists, and gets one snapshot. Time travel reads an older version, OPTIMIZE rewrites small files, VACUUM deletes old unused files, and a schema check rejects a wrong type.',
    nodes: [
      ['d_w', 0, 0, 'Writer', 'append, merge, delete', 'src'],
      ['d_files', 1, 0, 'New Parquet files', 'written first', 'raw'],
      ['d_log', 2, 0, 'Commit', 'one JSON file in _delta_log', 'ci'],
      ['d_ver', 3, 0, 'New version', 'readers see it only now', 'mart'],
      ['d_r', 3, 1, 'Reader', 'any engine that knows Delta', 'con'],
      ['d_rl', 2, 1, 'Read the log', 'from the last checkpoint', 'mon'],
      ['d_rf', 1, 1, 'Open listed files', 'skip files not listed', 'raw'],
      ['d_rows', 0, 1, 'One snapshot', 'rows of that version', 'mart'],
      ['d_tt', 0, 2, 'Time travel', 'read version N', 'sf', 'pill', { h: 56 }],
      ['d_opt', 1, 2, 'OPTIMIZE', 'rewrite small files', 'ci', 'pill', { h: 56 }],
      ['d_vac', 2, 2, 'VACUUM', 'delete old unused files', 'qual', 'pill', { h: 56 }],
      ['d_enf', 3, 2, 'Schema check', 'rejects a wrong type', 'snap', 'pill', { h: 56 }]
    ],
    edges: [
      ['dw1', 'd_w', 'd_files', 1],
      ['dw2', 'd_files', 'd_log', 2],
      ['dw3', 'd_log', 'd_ver', 3],
      ['dw4', 'd_ver', 'd_r', 4],
      ['dw5', 'd_r', 'd_rl', 5],
      ['dw6', 'd_rl', 'd_rf', 6],
      ['dw7', 'd_rf', 'd_rows', 7]
    ],
    tags: [
      { id: 'tg_atomic', x: 20, y: 140, t: 'the commit file is the switch', c: 'ci' }
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 13. From a laptop to a cluster                                      */
  /* ------------------------------------------------------------------ */
  S.submit = build({
    h: 440, dy: 125,
    label: 'From your code to a running application. The code is tested and packaged. spark-submit takes flags and configuration and asks the cluster manager for room. The cluster manager starts the driver, and the driver starts the executors. While it runs, the application writes an event log, and the history server shows the log after the application has ended.',
    nodes: [
      ['u_code', 0, 0, 'Your code', 'script, zip or wheel', 'src'],
      ['u_test', 1, 0, 'Tests and build', 'pytest, then package', 'qual'],
      ['u_sub', 2, 0, 'spark-submit', 'flags and --conf', 'ci'],
      ['u_cm', 3, 0, 'Cluster manager', 'finds room to run', 'air'],
      ['u_drv', 3, 1, 'Driver', 'client or cluster mode', 'stg'],
      ['u_exe', 2, 1, 'Executors', 'run the tasks', 'int'],
      ['u_log', 3, 2, 'Event log', 'one folder for each app', 'mon'],
      ['u_hist', 2, 2, 'History server', 'the UI after the end', 'con']
    ],
    edges: [
      ['u1', 'u_code', 'u_test', 1],
      ['u2', 'u_test', 'u_sub', 2],
      ['u3', 'u_sub', 'u_cm', 3],
      ['u4', 'u_cm', 'u_drv', 4],
      ['u5', 'u_drv', 'u_exe', 5],
      ['u6', 'u_drv', 'u_log', 6],
      ['u7', 'u_log', 'u_hist', 7]
    ],
    tags: [
      { id: 'tg_prec', x: 20, y: 215, t: 'code beats flags beats file', c: 'ci' },
      { id: 'tg_mode', x: 20, y: 260, t: 'cluster mode: driver on a worker', c: 'stg' }
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 14. Where to look when a job is slow or fails                       */
  /* ------------------------------------------------------------------ */
  S.debug = build({
    h: 330,
    label: 'Where to look. Start from the symptom: slow, failed or wrong. The Jobs and Stages tabs show which stage is long. The task table shows the maximum against the median. The SQL tab shows which operator and how many rows. That points to a cause such as skew, spill or small files. Make one change, run again and compare the same numbers, then write it down.',
    nodes: [
      ['g_sym', 0, 0, 'Symptom', 'slow, failed or wrong', 'qual'],
      ['g_jobs', 1, 0, 'Jobs and Stages', 'which stage is long', 'mon'],
      ['g_task', 2, 0, 'Task table', 'max against median', 'stg'],
      ['g_sql', 3, 0, 'SQL tab', 'operator and row counts', 'int'],
      ['g_cause', 3, 1, 'Cause', 'skew, spill, small files', 'raw'],
      ['g_fix', 2, 1, 'One change', 'config, code or layout', 'ci'],
      ['g_again', 1, 1, 'Run it again', 'compare the same numbers', 'air'],
      ['g_note', 0, 1, 'Write it down', 'a runbook for next time', 'con']
    ],
    edges: [
      ['b1', 'g_sym', 'g_jobs', 1],
      ['b2', 'g_jobs', 'g_task', 2],
      ['b3', 'g_task', 'g_sql', 3],
      ['b4', 'g_sql', 'g_cause', 4],
      ['b5', 'g_cause', 'g_fix', 5],
      ['b6', 'g_fix', 'g_again', 6],
      ['b7', 'g_again', 'g_note', 7]
    ],
    tags: [
      { id: 'tg_evlog', x: 20, y: 148, t: 'the event log has all of it', c: 'mon' }
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 15. Testing Spark code                                              */
  /* ------------------------------------------------------------------ */
  S.test = build({
    h: 330,
    label: 'Testing Spark code. Write small functions that take a DataFrame and return a DataFrame. Unit-test them with a local session and tiny data. Add data checks on counts, nulls and keys. Run a small end-to-end job with spark-submit on a sample. CI runs all of it on every change, and a red test blocks the merge. Production runs the same code on more data, with monitoring of row counts each run.',
    nodes: [
      ['e_fn', 0, 0, 'Small functions', 'DataFrame in, DataFrame out', 'src'],
      ['e_unit', 1, 0, 'Unit tests', 'local session, tiny data', 'stg'],
      ['e_data', 2, 0, 'Data checks', 'counts, nulls, unique keys', 'qual'],
      ['e_smoke', 3, 0, 'Small run', 'spark-submit on a sample', 'ci'],
      ['e_ci', 3, 1, 'CI', 'runs on every change', 'mon'],
      ['e_gate', 2, 1, 'Gate', 'red blocks the merge', 'sf'],
      ['e_prod', 1, 1, 'Production', 'same code, more data', 'mart'],
      ['e_watch', 0, 1, 'Monitoring', 'row counts each run', 'con']
    ],
    edges: [
      ['t1', 'e_fn', 'e_unit', 1],
      ['t2', 'e_unit', 'e_data', 2],
      ['t3', 'e_data', 'e_smoke', 3],
      ['t4', 'e_smoke', 'e_ci', 4],
      ['t5', 'e_ci', 'e_gate', 5],
      ['t6', 'e_gate', 'e_prod', 6],
      ['t7', 'e_prod', 'e_watch', 7]
    ],
    tags: [
      { id: 'tg_fast', x: 20, y: 148, t: 'the base is fast and many', c: 'stg' }
    ]
  });
})();
