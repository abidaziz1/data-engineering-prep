/* Diagram specs for the Apache Flink for data engineers tutorial. Plain data: nodes, edges, tags. shared/js/graph.js draws them.
   The small builder below turns a grid position (column, row) into pixels and draws a straight or curved arrow between two nodes, so a diagram is a list
   of nodes and a list of arrows. Titles stay under about 20 characters and subtitles under about 28, so that the text fits in a chip.
   The diagrams show how Flink works. The numbers that belong to the Brewline runs are not in the diagrams; the lessons read them from js/real.js. */
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
  /* 1. The Brewline Flink platform on one page                          */
  /* ------------------------------------------------------------------ */
  S.master = build({
    h: 400, cw: 235, dx: 275,
    label: 'The Brewline Flink platform on one page. Sources are Kafka topics, changes read from PostgreSQL and files. A Flink job, written in SQL or with the DataStream API, reads them, keeps state and works out results by event time. Sinks are Kafka topics, lake tables, files and databases. Dashboards, alerts and services use what the sinks hold. Around the flow sit the cluster, time, state, checkpoints and metrics.',
    nodes: [
      ['f_src', 0, 0, 'SOURCES', ['Kafka topics', 'Postgres changes', 'Files'], 'src', 'layer', { h: 170 }],
      ['f_job', 1, 0, 'FLINK JOB', ['SQL or DataStream', 'Event time', 'Keyed state'], 'stg', 'layer', { h: 170 }],
      ['f_snk', 2, 0, 'SINKS', ['Kafka topics', 'Lake tables', 'Files and databases'], 'mart', 'layer', { h: 170 }],
      ['f_use', 3, 0, 'USE', ['Dashboards', 'Alerts', 'Services'], 'con', 'layer', { h: 170 }],
      ['x_clu', 0, 1.8, 'Cluster', 'JobManager, TaskManagers', 'air', 'pill', { w: 200, h: 56 }],
      ['x_time', 0.78, 1.8, 'Time', 'watermarks, windows', 'ing', 'pill', { w: 200, h: 56 }],
      ['x_state', 1.56, 1.8, 'State', 'kept for each key', 'int', 'pill', { w: 200, h: 56 }],
      ['x_ckpt', 2.34, 1.8, 'Checkpoints', 'recovery, savepoints', 'qual', 'pill', { w: 200, h: 56 }],
      ['x_met', 3.12, 1.8, 'Metrics', 'backpressure, lag', 'mon', 'pill', { w: 200, h: 56 }]
    ],
    edges: [
      ['m1', 'f_src', 'f_job', 1, { bx: 263, by: 96 }],
      ['m2', 'f_job', 'f_snk', 2, { bx: 538, by: 96 }],
      ['m3', 'f_snk', 'f_use', 3, { bx: 813, by: 96 }]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 2. A Flink cluster                                                  */
  /* ------------------------------------------------------------------ */
  S.cluster = build({
    h: 310,
    label: 'A Flink standalone cluster. A client, the SQL client or the flink command, submits a job to the JobManager over its REST interface. The JobManager plans the job and sends its tasks to the TaskManagers, which run them in slots. Records pass directly between TaskManagers. Each TaskManager writes snapshots of its state to checkpoint storage, and reads from and writes to Kafka.',
    nodes: [
      ['c_cli', 0, 0, 'Client', 'SQL client, flink run', 'src'],
      ['c_jm', 1, 0, 'JobManager', 'plans and schedules', 'stg'],
      ['c_tm1', 2, 0, 'TaskManager 1', '2 slots, runs tasks', 'mart'],
      ['c_tm2', 3, 0, 'TaskManager 2', '2 slots, runs tasks', 'mart'],
      ['c_rest', 0, 1, 'REST and web UI', 'jobs, metrics, port 8081', 'air'],
      ['c_store', 1, 1, 'Checkpoint storage', 'files, S3, HDFS', 'snap'],
      ['c_kafka', 2, 1, 'Kafka', 'source and sink', 'ing'],
      ['c_pg', 3, 1, 'PostgreSQL', 'changes, by the log', 'raw']
    ],
    edges: [
      ['k1', 'c_cli', 'c_jm', 1],
      ['k2', 'c_jm', 'c_tm1', 2],
      ['k3', 'c_jm', 'c_tm2', 3, { d: 'M412 60 C412 4 962 4 962 60', bx: 687, by: 17 }],
      ['k4', 'c_tm1', 'c_tm2', 4],
      ['k5', 'c_tm1', 'c_store', 5],
      ['k6', 'c_kafka', 'c_tm1', 6],
      ['k7', 'c_rest', 'c_jm', 7]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 3. From a query to tasks in slots                                   */
  /* ------------------------------------------------------------------ */
  S.jobgraph = build({
    h: 310,
    label: 'A query becomes tasks in slots. The planner turns the SQL into a job graph. Operators that need no shuffle are chained into one vertex: here the source and the filter are vertex one, the aggregation and the sink are vertex two, and the records between them are partitioned by hash of the key. Each vertex runs as parallel tasks, one for every unit of parallelism, and the tasks of one position share a slot.',
    nodes: [
      ['g_sql', 0, 0, 'SQL query', 'GROUP BY store_id', 'src'],
      ['g_plan', 1, 0, 'Planner', 'optimizes the query', 'stg'],
      ['g_graph', 2, 0, 'Job graph', 'vertices and edges', 'int'],
      ['g_exec', 3, 0, 'Parallel tasks', 'one per vertex and slot', 'mart'],
      ['g_v1', 1, 1, 'Vertex 1', 'source + filter, chained', 'ing'],
      ['g_v2', 2, 1, 'Vertex 2', 'aggregate + sink, chained', 'air'],
      ['g_slots', 3, 1, 'Slots', 'tasks share a slot', 'snap']
    ],
    edges: [
      ['k1', 'g_sql', 'g_plan', 1],
      ['k2', 'g_plan', 'g_graph', 2],
      ['k3', 'g_graph', 'g_exec', 3],
      ['k4', 'g_graph', 'g_v1', 4],
      ['k5', 'g_v1', 'g_v2', 5, { label: 'HASH by key' }],
      ['k6', 'g_exec', 'g_slots', 6]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 4. A stream is a table that changes                                 */
  /* ------------------------------------------------------------------ */
  S.dynamic = build({
    h: 350,
    label: 'A stream and a table. A stream of orders feeds a continuous query. For every input row the query may produce changes: an insert, a retraction of an old result, an update that replaces it, or a delete. Together the changes are the changelog. Applying the changelog row by row gives a dynamic table, the result right now. The same query run as a batch over the same rows gives the same table as its final answer.',
    nodes: [
      ['d_str', 0, 0, 'Stream of orders', 'new rows, forever', 'src'],
      ['d_q', 1, 0, 'Continuous query', 'GROUP BY store_id', 'stg'],
      ['d_log', 2, 0, 'Changelog', '+I  -U  +U  -D', 'int'],
      ['d_tab', 3, 0, 'Dynamic table', 'the result right now', 'mart'],
      ['d_bat', 1, 1, 'Batch query', 'same SQL, one answer', 'ing'],
      ['d_snk', 3, 1, 'Sink', 'print, Kafka, a table', 'con']
    ],
    edges: [
      ['k1', 'd_str', 'd_q', 1],
      ['k2', 'd_q', 'd_log', 2],
      ['k3', 'd_log', 'd_tab', 3],
      ['k4', 'd_tab', 'd_snk', 4],
      ['k5', 'd_bat', 'd_tab', 5, { label: 'same final table' }]
    ],
    tags: [{ id: 'tg_chg', x: 20, y: 300, t: 'a streaming result is a stream of changes', c: 'con' }]
  });

  /* ------------------------------------------------------------------ */
  /* 5. Watermarks close windows                                         */
  /* ------------------------------------------------------------------ */
  S.watermark = build({
    h: 350,
    label: 'Event time and the watermark. Orders arrive out of order, each with the time at which it happened. The source keeps the largest time it has seen and subtracts a delay: that is the watermark, a promise that nothing older is expected. A window collects its orders and closes when the watermark passes its end, and then emits one row. An order that arrives after its window has closed is late: SQL window aggregates drop it, and the DataStream API can send it to a side output.',
    nodes: [
      ['w_ev', 0, 0, 'Orders arrive', 'out of order', 'src'],
      ['w_wm', 1, 0, 'Watermark', 'largest time minus delay', 'stg'],
      ['w_win', 2, 0, 'Window', 'collects, then closes', 'int'],
      ['w_out', 3, 0, 'Result row', 'one row per window', 'mart'],
      ['w_late', 2, 1, 'Late order', 'its window is closed', 'qual'],
      ['w_drop', 3, 1, 'Dropped', 'or a side output', 'mon']
    ],
    edges: [
      ['k1', 'w_ev', 'w_wm', 1],
      ['k2', 'w_wm', 'w_win', 2],
      ['k3', 'w_win', 'w_out', 3],
      ['k4', 'w_ev', 'w_late', 4, { d: 'M255 106 C255 180 400 240 565 236', bx: 400, by: 214 }],
      ['k5', 'w_late', 'w_drop', 5]
    ],
    tags: [{ id: 'tg_delay', x: 20, y: 300, t: 'a longer delay: fewer late orders, a later result', c: 'ing' }]
  });

  /* ------------------------------------------------------------------ */
  /* 6. A checkpoint is a barrier through the job                        */
  /* ------------------------------------------------------------------ */
  S.checkpoint = build({
    h: 500, dy: 130,
    label: 'A checkpoint. The JobManager asks the sources to insert a barrier into their streams. The barrier travels with the records through every operator. When an operator has received the barrier on all of its inputs, it snapshots its state and passes the barrier on. The source snapshots its position, the sink prepares its transaction. When every task has acknowledged, the checkpoint is complete, and the JobManager tells the tasks, so that the sink can commit.',
    nodes: [
      ['p_jm', 1.5, 0, 'JobManager', 'the checkpoint coordinator', 'stg'],
      ['p_src', 0, 1.3, 'Source', 'position in Kafka', 'src'],
      ['p_op', 1, 1.3, 'Count per store', 'keyed state', 'int'],
      ['p_snk', 2, 1.3, 'Sink', 'Kafka transaction', 'mart'],
      ['p_st', 1.5, 2.6, 'Checkpoint storage', 'state and positions', 'snap']
    ],
    edges: [
      ['k1', 'p_jm', 'p_src', 1],
      ['k2', 'p_src', 'p_op', 2],
      ['k3', 'p_op', 'p_snk', 3],
      ['k4', 'p_op', 'p_st', 4],
      ['k5', 'p_snk', 'p_jm', 5]
    ],
    tags: [{ id: 'tg_bar', x: 20, y: 440, t: 'barriers are part of the stream: no pause needed', c: 'con' }]
  });

  /* ------------------------------------------------------------------ */
  /* 7. Exactly once into Kafka: two phases                              */
  /* ------------------------------------------------------------------ */
  S.twophase = build({
    h: 350,
    label: 'Two-phase commit in a sink. The Kafka sink writes records inside an open transaction. When a checkpoint barrier arrives it flushes and prepares the transaction, and a new transaction starts. Only when the checkpoint is complete for the whole job is the old transaction committed and its records become visible to readers that read committed data. If the job fails before that, the transaction is aborted, and the job replays from the last complete checkpoint, so no reader sees a duplicate.',
    nodes: [
      ['t_open', 0, 0, 'Writes', 'inside an open transaction', 'src'],
      ['t_pre', 1, 0, 'Barrier arrives', 'flush and prepare', 'stg'],
      ['t_done', 2, 0, 'Checkpoint complete', 'every task acknowledged', 'int'],
      ['t_com', 3, 0, 'Commit', 'records become visible', 'mart'],
      ['t_fail', 2, 1, 'A failure', 'its transaction is aborted', 'qual'],
      ['t_rep', 3, 1, 'Replay', 'from the last checkpoint', 'ing']
    ],
    edges: [
      ['k1', 't_open', 't_pre', 1],
      ['k2', 't_pre', 't_done', 2],
      ['k3', 't_done', 't_com', 3],
      ['k4', 't_open', 't_fail', 4, { d: 'M255 106 C255 180 400 240 565 236', bx: 400, by: 214 }],
      ['k5', 't_fail', 't_rep', 5]
    ],
    tags: [{ id: 'tg_rc', x: 20, y: 300, t: 'readers must use isolation.level=read_committed', c: 'mon' }]
  });

  /* ------------------------------------------------------------------ */
  /* 8. Change data capture into Flink                                   */
  /* ------------------------------------------------------------------ */
  S.cdc = build({
    h: 350,
    label: 'Change data capture into Flink. PostgreSQL writes every change to its write-ahead log, and a replication slot keeps the log until a reader confirms it. The Flink CDC source reads a snapshot of the table, then the log, and turns them into a changelog for the job. The other way goes through Debezium on Kafka Connect: it writes change events to a Kafka topic, and Flink reads the topic with the debezium-json format.',
    nodes: [
      ['q_pg', 0, 0, 'PostgreSQL', 'tables and the log', 'raw'],
      ['q_slot', 1, 0, 'Replication slot', 'holds the log', 'qual'],
      ['q_cdc', 2, 0, 'Flink CDC source', 'snapshot, then the log', 'stg'],
      ['q_job', 3, 0, 'Flink job', 'reads a changelog', 'mart'],
      ['q_dbz', 1, 1, 'Debezium', 'on Kafka Connect', 'ci'],
      ['q_top', 2, 1, 'Kafka topic', 'change events', 'ing']
    ],
    edges: [
      ['k1', 'q_pg', 'q_slot', 1],
      ['k2', 'q_slot', 'q_cdc', 2],
      ['k3', 'q_cdc', 'q_job', 3],
      ['k4', 'q_slot', 'q_dbz', 4],
      ['k5', 'q_dbz', 'q_top', 5],
      ['k6', 'q_top', 'q_job', 6]
    ],
    tags: [{ id: 'tg_rid', x: 20, y: 300, t: 'REPLICA IDENTITY FULL for updates and deletes', c: 'mon' }]
  });

  /* ------------------------------------------------------------------ */
  /* 9. Backpressure                                                      */
  /* ------------------------------------------------------------------ */
  S.backpressure = build({
    h: 350,
    label: 'Backpressure. A source can read much faster than the step after it. The buffers between them fill up, so the source has to wait before it can hand over more records: it is backpressured, and the slow step is the busy one. Nothing is lost, the whole job simply runs at the speed of its slowest step. The metrics busy, idle and backpressured time show where the bottleneck is. More parallel tasks for the slow step raise the speed.',
    nodes: [
      ['b_src', 0, 0, 'Source', 'can read fast', 'src'],
      ['b_buf', 1, 0, 'Buffers', 'fill up between tasks', 'mon'],
      ['b_slow', 2, 0, 'Slow step', 'a call to a service', 'qual'],
      ['b_snk', 3, 0, 'Sink', 'waits for records', 'mart'],
      ['b_met', 1, 1, 'Metrics', 'busy, idle, backpressured', 'air'],
      ['b_fix', 2, 1, 'More parallel tasks', 'for the slow step', 'ing']
    ],
    edges: [
      ['k1', 'b_src', 'b_buf', 1],
      ['k2', 'b_buf', 'b_slow', 2],
      ['k3', 'b_slow', 'b_snk', 3],
      ['k4', 'b_buf', 'b_met', 4],
      ['k5', 'b_met', 'b_fix', 5]
    ],
    tags: [{ id: 'tg_bp', x: 20, y: 300, t: 'the source is blocked, the slow step is busy', c: 'qual' }]
  });

  /* ------------------------------------------------------------------ */
  /* 10. Ways to run Flink                                               */
  /* ------------------------------------------------------------------ */
  S.deploy = build({
    h: 430,
    label: 'Ways to run Flink. In a session cluster, one JobManager and a pool of TaskManagers run many jobs, and a job is submitted to the running cluster. In application mode, a cluster is started for one job and goes away with it, which isolates jobs from each other. On Kubernetes the Flink Kubernetes Operator manages such clusters from a FlinkDeployment resource and can take a savepoint to upgrade a job. Managed services run the cluster for you.',
    nodes: [
      ['r_cli', 0, 0, 'Client', 'submits a job', 'src'],
      ['r_sess', 1, 0, 'Session cluster', 'many jobs share it', 'stg'],
      ['r_a', 2, 0, 'Job A', 'a task slot or two', 'mart'],
      ['r_b', 3, 0, 'Job B', 'shares the cluster', 'mart'],
      ['r_app', 1, 1, 'Application cluster', 'started for one job', 'int'],
      ['r_c', 2, 1, 'Job C', 'its own cluster', 'mart'],
      ['r_k8s', 1, 1.9, 'Kubernetes operator', 'FlinkDeployment', 'ci']
    ],
    edges: [
      ['k1', 'r_cli', 'r_sess', 1],
      ['k2', 'r_sess', 'r_a', 2],
      ['k3', 'r_sess', 'r_b', 3, { d: 'M412 60 C412 4 962 4 962 60', bx: 687, by: 17 }],
      ['k4', 'r_cli', 'r_app', 4],
      ['k5', 'r_app', 'r_c', 5],
      ['k6', 'r_k8s', 'r_app', 6]
    ]
  });
})();
