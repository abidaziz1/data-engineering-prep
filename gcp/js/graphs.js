/* Diagram specs for the Google Cloud for data engineers tutorial. Plain data: nodes, edges, groups, tags. shared/js/graph.js draws them.
   The small builder below turns a grid position (column, row) into pixels and draws a straight or curved arrow between two nodes, so a diagram is a list
   of nodes and a list of arrows. Titles stay under about 20 characters and subtitles under about 28, so that the text fits in a chip. */
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
    return spec;
  }

  /* ------------------------------------------------------------------ */
  /* 1. The Brewline platform on one page                                */
  /* ------------------------------------------------------------------ */
  S.master = build({
    h: 400, cw: 190, dx: 216,
    label: 'The Brewline platform on Google Cloud. Sources send data. Pub/Sub, Datastream and Cloud Storage land it. Dataflow, Dataproc and Dataform shape it. BigQuery holds it in layers. Dashboards and models use it. Along the bottom: access, orchestration, governance, monitoring, code and cost.',
    nodes: [
      ['s_src', 0, 0, 'SOURCES', ['Store POS apps', 'ERP database', 'Partner files'], 'src', 'layer', { h: 170 }],
      ['s_land', 1, 0, 'LAND', ['Pub/Sub', 'Datastream', 'Cloud Storage'], 'raw', 'layer', { h: 170 }],
      ['s_proc', 2, 0, 'PROCESS', ['Dataflow (Beam)', 'Dataproc (Spark)', 'Dataform (SQL)'], 'stg', 'layer', { h: 170 }],
      ['s_wh', 3, 0, 'WAREHOUSE', ['BigQuery raw', 'BigQuery staging', 'BigQuery curated'], 'mart', 'layer', { h: 170 }],
      ['s_use', 4, 0, 'USE', ['Dashboards', 'BigQuery ML', 'Vertex AI'], 'con', 'layer', { h: 170 }],
      ['x_iam', 0, 1.8, 'IAM and keys', 'who may do what', 'sf', 'pill', { w: 165, h: 56 }],
      ['x_orch', 0.84, 1.8, 'Composer', 'order and retries', 'air', 'pill', { w: 165, h: 56 }],
      ['x_gov', 1.68, 1.8, 'Dataplex', 'catalog and quality', 'qual', 'pill', { w: 165, h: 56 }],
      ['x_mon', 2.52, 1.8, 'Monitoring', 'logs and alerts', 'mon', 'pill', { w: 165, h: 56 }],
      ['x_iac', 3.36, 1.8, 'Terraform', 'code for the cloud', 'ci', 'pill', { w: 165, h: 56 }],
      ['x_cost', 4.2, 1.8, 'Cost', 'bytes and hours', 'snap', 'pill', { w: 165, h: 56 }]
    ],
    edges: [
      ['m1', 's_src', 's_land', 1, { bx: 218, by: 96 }],
      ['m2', 's_land', 's_proc', 2, { bx: 434, by: 96 }],
      ['m3', 's_proc', 's_wh', 3, { bx: 650, by: 96 }],
      ['m4', 's_wh', 's_use', 4, { bx: 866, by: 96 }]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 2. Organization, folders, projects, resources                       */
  /* ------------------------------------------------------------------ */
  S.project = build({
    h: 590,
    label: 'The resource hierarchy. An organization holds folders, folders hold projects, and projects hold the resources: a bucket, a dataset, a topic, a service account. A policy set on a level is inherited by everything below it.',
    nodes: [
      ['o_org', 1.5, 0, 'Organization', 'brewline.example', 'sf'],
      ['o_fold', 1.5, 1, 'Folder', 'data-platform', 'sf'],
      ['o_dev', 0.5, 2, 'Project', 'brewline-dev', 'raw'],
      ['o_prod', 2.5, 2, 'Project', 'brewline-prod', 'mart'],
      ['o_bkt', 0, 3, 'Bucket', 'landing files', 'raw'],
      ['o_ds', 1, 3, 'BigQuery dataset', 'raw, staging, curated', 'raw'],
      ['o_topic', 2, 3, 'Pub/Sub topic', 'pos-orders', 'mart'],
      ['o_sa', 3, 3, 'Service account', 'sa-pipeline', 'mart']
    ],
    edges: [
      ['h1', 'o_org', 'o_fold', 1],
      ['h2', 'o_fold', 'o_dev', 2],
      ['h3', 'o_fold', 'o_prod', 2, { nb: true }],
      ['h4', 'o_dev', 'o_bkt', 3],
      ['h5', 'o_dev', 'o_ds', 3, { nb: true }],
      ['h6', 'o_prod', 'o_topic', 4],
      ['h7', 'o_prod', 'o_sa', 4, { nb: true }]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 3. One request, from a GitHub job to a table                        */
  /* ------------------------------------------------------------------ */
  S.iam = build({
    h: 360,
    label: 'One request with no key file. A deploy job on GitHub shows a short-lived token from GitHub. Workload identity federation trusts it and lets the job act as a service account. The request carries a token of that service account. IAM checks the roles, the perimeter checks where the call comes from, and the audit log records it.',
    nodes: [
      ['u_gh', 0, 0, 'GitHub job', 'proves itself with OIDC', 'src'],
      ['u_wif', 1, 0, 'Workload identity', 'pool and provider', 'raw'],
      ['u_sa', 2, 0, 'Service account', 'sa-deploy', 'stg'],
      ['u_tok', 3, 0, 'Access token', 'short-lived', 'int'],
      ['u_iam', 3, 1, 'IAM check', 'roles, conditions, denies', 'sf'],
      ['u_perim', 2, 1, 'Perimeter', 'VPC Service Controls', 'qual'],
      ['u_res', 1, 1, 'BigQuery table', 'the data', 'mart'],
      ['u_log', 0, 1, 'Audit log', 'who did what', 'mon']
    ],
    edges: [
      ['a1', 'u_gh', 'u_wif', 1],
      ['a2', 'u_wif', 'u_sa', 2],
      ['a3', 'u_sa', 'u_tok', 3],
      ['a4', 'u_tok', 'u_iam', 4],
      ['a5', 'u_iam', 'u_perim', 5],
      ['a6', 'u_perim', 'u_res', 6],
      ['a7', 'u_res', 'u_log', 7]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 4. A bucket: how a file arrives, what moves it, what it costs       */
  /* ------------------------------------------------------------------ */
  S.storage = build({
    h: 590,
    label: 'A bucket. A partner uploads a file with a signed URL. The bucket announces the new object. A function checks the name and starts a load into BigQuery. A lifecycle rule moves old objects to cheaper classes and deletes them after a year.',
    nodes: [
      ['b_partner', 0, 0, 'Partner upload', 'signed URL, 15 minutes', 'src'],
      ['b_bkt', 1, 0, 'Bucket', 'asia-southeast1', 'raw'],
      ['b_notif', 2, 0, 'Notification', 'object finalized', 'air'],
      ['b_fn', 3, 0, 'Cloud Run function', 'checks name, starts load', 'int'],
      ['b_load', 3, 1, 'BigQuery load job', 'Parquet, append', 'mart'],
      ['b_std', 1, 2, 'Standard', 'days 0 to 30', 'raw'],
      ['b_near', 2, 2, 'Nearline', 'days 30 to 90', 'stg'],
      ['b_cold', 3, 2, 'Coldline', 'days 90 to 365', 'int'],
      ['b_del', 3, 3, 'Delete', 'after a year', 'qual']
    ],
    edges: [
      ['s1', 'b_partner', 'b_bkt', 1],
      ['s2', 'b_bkt', 'b_notif', 2],
      ['s3', 'b_notif', 'b_fn', 3],
      ['s4', 'b_fn', 'b_load', 4],
      ['s5', 'b_bkt', 'b_std', 5],
      ['s6', 'b_std', 'b_near', 6],
      ['s7', 'b_near', 'b_cold', 7],
      ['s8', 'b_cold', 'b_del', 8]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 5. Inside BigQuery: one query                                       */
  /* ------------------------------------------------------------------ */
  S.bq_arch = build({
    h: 340,
    label: 'One query inside BigQuery. The SQL becomes a job. The planner reads the metadata and rules out partitions. Slots, the units of compute, run the stages. They read only the columns the query names from columnar storage. A shuffle moves rows between stages, and the result goes to a table or the cache.',
    nodes: [
      ['q_sql', 0, 0, 'Your SQL', 'one job', 'src'],
      ['q_plan', 1, 0, 'Planner', 'stages, partition pruning', 'raw'],
      ['q_slots', 2, 0, 'Slots', 'compute, in parallel', 'stg'],
      ['q_res', 3, 0, 'Result', 'table or cache', 'mart'],
      ['q_meta', 1, 1, 'Metadata', 'partitions and clusters', 'int'],
      ['q_stor', 2, 1, 'Columnar storage', 'only the named columns', 'sf'],
      ['q_shuf', 3, 1, 'Shuffle', 'rows between stages', 'air']
    ],
    edges: [
      ['p1', 'q_sql', 'q_plan', 1],
      ['p2', 'q_plan', 'q_meta', 2],
      ['p3', 'q_plan', 'q_slots', 3],
      ['p4', 'q_slots', 'q_stor', 4],
      ['p5', 'q_slots', 'q_shuf', 5],
      ['p6', 'q_slots', 'q_res', 6, { bx: 826, by: 66 }]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 6. Ways into a BigQuery table                                       */
  /* ------------------------------------------------------------------ */
  S.bq_load = build({
    h: 600,
    label: 'Four ways into a BigQuery table. A load job reads files from Cloud Storage. A BigQuery subscription writes Pub/Sub messages without code. Dataflow transforms first and writes through the Storage Write API. Datastream writes database changes.',
    nodes: [
      ['i_gcs', 0, 0, 'Files in a bucket', 'Parquet, Avro, CSV', 'src'],
      ['i_load', 1, 0, 'Load job', 'batch, no query cost', 'raw'],
      ['i_ps', 0, 1, 'Pub/Sub', 'events', 'src'],
      ['i_sub', 1, 1, 'BigQuery subscription', 'rows, no code', 'stg'],
      ['i_df', 0, 2, 'Dataflow', 'transform first', 'src'],
      ['i_wapi', 1, 2, 'Storage Write API', 'streaming rows', 'int'],
      ['i_ds', 0, 3, 'Datastream', 'database changes', 'src'],
      ['i_cdc', 1, 3, 'Change rows', 'insert, update, delete', 'air'],
      ['i_tbl', 3, 0, 'BigQuery table', null, 'mart', 'layer', { h: 480 }]
    ],
    edges: [
      ['l1', 'i_gcs', 'i_load', 1],
      ['l2', 'i_load', 'i_tbl', 1, { d: 'M530 93 H845', nb: true }],
      ['l3', 'i_ps', 'i_sub', 2],
      ['l4', 'i_sub', 'i_tbl', 2, { d: 'M530 233 H845', nb: true }],
      ['l5', 'i_df', 'i_wapi', 3],
      ['l6', 'i_wapi', 'i_tbl', 3, { d: 'M530 373 H845', nb: true }],
      ['l7', 'i_ds', 'i_cdc', 4],
      ['l8', 'i_cdc', 'i_tbl', 4, { d: 'M530 513 H845', nb: true }]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 7. Pub/Sub                                                          */
  /* ------------------------------------------------------------------ */
  S.pubsub = build({
    h: 450,
    label: 'Pub/Sub. A publisher sends a message to a topic. Each subscription gets its own copy. A pull subscription waits for a worker to ask, a push subscription calls a web address, and a BigQuery subscription writes rows. A message that fails too many times goes to a dead letter topic.',
    nodes: [
      ['ps_pub', 0, 0, 'Publisher', 'POS app, ordering key', 'src'],
      ['ps_topic', 1, 0, 'Topic', 'pos-orders', 'raw'],
      ['ps_pull', 2, 0, 'Pull subscription', 'a worker asks', 'stg'],
      ['ps_work', 3, 0, 'Worker', 'acks after the work', 'int'],
      ['ps_dlt', 1, 1, 'Dead letter topic', 'after N deliveries', 'qual'],
      ['ps_push', 2, 1, 'Push subscription', 'HTTPS to Cloud Run', 'stg'],
      ['ps_run', 3, 1, 'Cloud Run', 'answers 200 to ack', 'int'],
      ['ps_bqs', 2, 2, 'BigQuery subscription', 'rows, no code', 'stg'],
      ['ps_tbl', 3, 2, 'BigQuery table', 'orders_raw', 'mart']
    ],
    edges: [
      ['q1', 'ps_pub', 'ps_topic', 1],
      ['q2', 'ps_topic', 'ps_pull', 2],
      ['q3', 'ps_pull', 'ps_work', 3],
      ['q4', 'ps_topic', 'ps_push', 2, { nb: true }],
      ['q5', 'ps_push', 'ps_run', 3, { nb: true }],
      ['q6', 'ps_topic', 'ps_bqs', 2, { nb: true }],
      ['q7', 'ps_bqs', 'ps_tbl', 3, { nb: true }],
      ['q8', 'ps_pull', 'ps_dlt', 4]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 8. A Dataflow pipeline                                              */
  /* ------------------------------------------------------------------ */
  S.dataflow = build({
    h: 340,
    label: 'A streaming Dataflow pipeline. It reads Pub/Sub, parses each message, puts it in a one-minute window by event time, sums per store and writes to BigQuery. A message that cannot be parsed goes to a dead letter output. Dataflow runs the workers and moves the watermark.',
    groups: [{ id: 'g_df', x: 283, y: 30, w: 810, h: 288, t: 'ONE JOB ON DATAFLOW WORKERS: autoscaling, and a watermark that moves with the event time', c: 'sf' }],
    nodes: [
      ['d_src', 0, 0, 'Pub/Sub', 'read', 'src'],
      ['d_parse', 1, 0, 'Parse', 'one DoFn per message', 'raw'],
      ['d_win', 2, 0, 'Window', 'one minute, event time', 'stg'],
      ['d_agg', 3, 0, 'Sum per store', 'when the watermark passes', 'int'],
      ['d_dead', 1, 1, 'Dead letter', 'bad lines kept', 'qual'],
      ['d_late', 2, 1, 'Late data', 'allowed lateness', 'air'],
      ['d_sink', 3, 1, 'BigQuery', 'Storage Write API', 'mart']
    ],
    edges: [
      ['f1', 'd_src', 'd_parse', 1],
      ['f2', 'd_parse', 'd_win', 2],
      ['f3', 'd_win', 'd_agg', 3],
      ['f4', 'd_agg', 'd_sink', 4],
      ['f5', 'd_parse', 'd_dead', 2, { nb: true }],
      ['f6', 'd_win', 'd_late', 3, { nb: true }]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 9. Spark on Google Cloud                                            */
  /* ------------------------------------------------------------------ */
  S.dataproc = build({
    h: 340,
    label: 'Spark on Google Cloud. Composer creates a cluster for one job, the job reads files from Cloud Storage and writes to BigQuery through a connector, then Composer deletes the cluster. Serverless Spark skips the cluster.',
    nodes: [
      ['sp_dag', 0, 0, 'Composer DAG', 'the schedule', 'air'],
      ['sp_create', 1, 0, 'Create cluster', 'ephemeral', 'raw'],
      ['sp_job', 2, 0, 'Spark job', 'PySpark', 'stg'],
      ['sp_del', 3, 0, 'Delete cluster', 'pay for the run', 'qual'],
      ['sp_srv', 0, 1, 'Serverless Spark', 'no cluster to run', 'con'],
      ['sp_meta', 1, 1, 'Metastore', 'table definitions', 'int'],
      ['sp_gcs', 2, 1, 'Cloud Storage', 'the data, not HDFS', 'mart'],
      ['sp_bq', 3, 1, 'BigQuery', 'through a connector', 'mart']
    ],
    edges: [
      ['k1', 'sp_dag', 'sp_create', 1],
      ['k2', 'sp_create', 'sp_job', 2],
      ['k3', 'sp_job', 'sp_del', 4],
      ['k4', 'sp_job', 'sp_gcs', 3],
      ['k5', 'sp_job', 'sp_bq', 3, { nb: true }],
      ['k6', 'sp_meta', 'sp_job', 2, { nb: true, k: 'ref' }],
      ['k7', 'sp_dag', 'sp_srv', 1, { nb: true, k: 'ref' }]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 10. Composer                                                        */
  /* ------------------------------------------------------------------ */
  S.composer = build({
    h: 470,
    label: 'Cloud Composer. Code goes from Git through Cloud Build to the DAGs bucket. The scheduler reads the files and decides what is due. Workers run the tasks, which start BigQuery and Dataflow jobs. The state of every run is kept in the metadata database, and the web interface reads it.',
    nodes: [
      ['c_git', 0, 0, 'Git', 'DAG code', 'src'],
      ['c_cb', 1, 0, 'Cloud Build', 'tests, then copy', 'ci'],
      ['c_bucket', 2, 0, 'DAGs bucket', 'Cloud Storage', 'raw'],
      ['c_sched', 3, 0, 'Scheduler', 'reads the DAG files', 'air'],
      ['c_ui', 1, 1, 'Airflow UI', 'see runs, clear tasks', 'mon'],
      ['c_meta', 2, 1, 'Metadata database', 'runs and task states', 'sf'],
      ['c_work', 3, 1, 'Workers', 'run the tasks', 'stg'],
      ['c_bq', 2, 2, 'BigQuery jobs', 'MERGE, load', 'mart'],
      ['c_df', 3, 2, 'Dataflow jobs', 'streaming and batch', 'mart']
    ],
    edges: [
      ['r1', 'c_git', 'c_cb', 1],
      ['r2', 'c_cb', 'c_bucket', 2],
      ['r3', 'c_bucket', 'c_sched', 3],
      ['r4', 'c_sched', 'c_work', 4],
      ['r5', 'c_work', 'c_bq', 5, { d: V(930, 266, 760, 340), bx: 850, by: 303 }],
      ['r6', 'c_work', 'c_df', 5, { nb: true }],
      ['r7', 'c_work', 'c_meta', 4, { nb: true }],
      ['r8', 'c_ui', 'c_meta', 6, { nb: true }]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 11. Change data capture                                             */
  /* ------------------------------------------------------------------ */
  S.cdc = build({
    h: 330,
    label: 'Change data capture. Datastream reads the change log of the source database, first copies the existing rows (the backfill), then follows the changes. BigQuery applies inserts, updates and deletes in order, so the table keeps one current row for each key. A reconcile step compares counts and sums with the source.',
    nodes: [
      ['t_src', 0, 0, 'Source database', 'Cloud SQL or Oracle', 'src'],
      ['t_log', 1, 0, 'Change log', 'binlog, WAL, redo', 'raw'],
      ['t_ds', 2, 0, 'Datastream', 'backfill, then changes', 'stg'],
      ['t_raw', 3, 0, 'BigQuery', 'change rows arrive', 'mart'],
      ['t_seq', 3, 1, 'Apply in order', 'by sequence number', 'air'],
      ['t_cur', 2, 1, 'Current table', 'one row per key', 'mart'],
      ['t_qa', 1, 1, 'Reconcile', 'counts and sums', 'qual'],
      ['t_bi', 0, 1, 'Reports', 'trusted numbers', 'con']
    ],
    edges: [
      ['c1', 't_src', 't_log', 1],
      ['c2', 't_log', 't_ds', 2],
      ['c3', 't_ds', 't_raw', 3],
      ['c4', 't_raw', 't_seq', 4],
      ['c5', 't_seq', 't_cur', 5],
      ['c6', 't_cur', 't_qa', 6],
      ['c7', 't_qa', 't_bi', 7]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 12. Governance                                                      */
  /* ------------------------------------------------------------------ */
  S.governance = build({
    h: 430,
    label: 'Governance. Tables are registered in the catalog, with lineage and quality scans. Policy tags mark sensitive columns. Masking rules and row access policies decide what each reader sees. A scan for sensitive data finds columns that nobody tagged.',
    nodes: [
      ['g_tbl', 0, 0, 'BigQuery tables', 'raw to curated', 'mart'],
      ['g_cat', 1, 0, 'Catalog', 'entries and aspects', 'raw'],
      ['g_lin', 2, 0, 'Lineage', 'who feeds whom', 'stg'],
      ['g_dq', 3, 0, 'Quality scans', 'rules and scores', 'qual'],
      ['g_tag', 0, 1, 'Policy tags', 'PII, finance', 'sf'],
      ['g_mask', 1, 1, 'Masking rules', 'hash, null, partial', 'int'],
      ['g_row', 2, 1, 'Row access policy', 'own store only', 'air'],
      ['g_users', 3, 1, 'Readers', 'see, see masked, or none', 'con'],
      ['g_dlp', 0, 2, 'Sensitive data scan', 'finds what is untagged', 'mon']
    ],
    edges: [
      ['g1', 'g_tbl', 'g_cat', 1],
      ['g2', 'g_cat', 'g_lin', 2],
      ['g3', 'g_lin', 'g_dq', 3],
      ['g4', 'g_tbl', 'g_tag', 4],
      ['g5', 'g_tag', 'g_mask', 5],
      ['g6', 'g_mask', 'g_row', 6],
      ['g7', 'g_row', 'g_users', 7],
      ['g8', 'g_dlp', 'g_tag', 4, { nb: true, k: 'ref' }]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 13. From a table to a model                                         */
  /* ------------------------------------------------------------------ */
  S.ml = build({
    h: 440,
    label: 'From a table to a model. A curated table becomes features with one row per customer. A stable split by customer keeps one person on one side. A model is trained in BigQuery ML or Vertex AI, registered, and used for batch scores or an online endpoint. Embeddings feed vector search.',
    nodes: [
      ['m_tbl', 0, 0, 'Curated table', 'orders and customers', 'mart'],
      ['m_feat', 1, 0, 'Features', 'one row per customer', 'raw'],
      ['m_split', 2, 0, 'Split by customer', 'a stable hash', 'stg'],
      ['m_train', 3, 0, 'Train', 'CREATE MODEL or Vertex', 'int'],
      ['m_reg', 3, 1, 'Model registry', 'versions, labels', 'sf'],
      ['m_batch', 2, 1, 'Batch scores', 'written to a table', 'mart'],
      ['m_ep', 1, 1, 'Online endpoint', 'low latency', 'con'],
      ['m_mon', 0, 1, 'Monitoring', 'drift, data quality', 'mon'],
      ['m_emb', 1, 2, 'Embeddings', 'text to vectors', 'air'],
      ['m_vec', 2, 2, 'Vector search', 'nearest rows', 'air']
    ],
    edges: [
      ['e1', 'm_tbl', 'm_feat', 1],
      ['e2', 'm_feat', 'm_split', 2],
      ['e3', 'm_split', 'm_train', 3],
      ['e4', 'm_train', 'm_reg', 4],
      ['e5', 'm_reg', 'm_batch', 5],
      ['e6', 'm_batch', 'm_ep', 5, { nb: true }],
      ['e7', 'm_ep', 'm_mon', 6],
      ['e8', 'm_emb', 'm_vec', 7]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 14. Delivery                                                        */
  /* ------------------------------------------------------------------ */
  S.cicd = build({
    h: 440,
    label: 'Delivery. A pull request starts checks: unit tests, a Dataform compile, a Terraform scan. The job gets a short-lived identity with no key file. A plan is shown for review. After approval the change is applied to dev, then prod, and the DAGs are copied to the Composer bucket.',
    nodes: [
      ['ci_pr', 0, 0, 'Pull request', 'code and Terraform', 'src'],
      ['ci_chk', 1, 0, 'Checks', 'pytest, compile, scan', 'qual'],
      ['ci_wif', 2, 0, 'Federated identity', 'no key file', 'sf'],
      ['ci_plan', 3, 0, 'Terraform plan', 'what would change', 'int'],
      ['ci_rev', 3, 1, 'Review', 'a person reads the plan', 'air'],
      ['ci_apply', 2, 1, 'Apply', 'dev, then prod', 'ci'],
      ['ci_dags', 1, 1, 'Copy the DAGs', 'to the Composer bucket', 'raw'],
      ['ci_df', 0, 1, 'Dataform release', 'compile and run', 'stg'],
      ['ci_mon', 0, 2, 'Watch', 'alerts, data freshness', 'mon']
    ],
    edges: [
      ['d1', 'ci_pr', 'ci_chk', 1],
      ['d2', 'ci_chk', 'ci_wif', 2],
      ['d3', 'ci_wif', 'ci_plan', 3],
      ['d4', 'ci_plan', 'ci_rev', 4],
      ['d5', 'ci_rev', 'ci_apply', 5],
      ['d6', 'ci_apply', 'ci_dags', 6],
      ['d7', 'ci_dags', 'ci_df', 7],
      ['d8', 'ci_df', 'ci_mon', 8]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 15. Watching it run                                                 */
  /* ------------------------------------------------------------------ */
  S.ops = build({
    h: 440,
    label: 'Watching it run. Pipelines write logs. Logs and system metrics feed alert policies. An alert reaches a person with a runbook. The job history in BigQuery and the billing export show who spent what, and a budget warns before the month ends.',
    nodes: [
      ['o_job', 0, 0, 'Pipelines', 'Dataflow, Composer, SQL', 'src'],
      ['o_log', 1, 0, 'Cloud Logging', 'every job writes here', 'raw'],
      ['o_met', 2, 0, 'Metrics', 'logs-based and system', 'stg'],
      ['o_alert', 3, 0, 'Alert policy', 'lag over 5 minutes', 'qual'],
      ['o_chan', 3, 1, 'Notification', 'chat or page', 'air'],
      ['o_run', 2, 1, 'Runbook', 'the first step to take', 'sf'],
      ['o_jobs', 0, 1, 'Job history', 'the JOBS view', 'int'],
      ['o_bill', 1, 1, 'Billing export', 'to BigQuery', 'mart'],
      ['o_dash', 0, 2, 'Cost and health view', 'one query per team', 'con'],
      ['o_budget', 1, 2, 'Budget alert', 'before the month ends', 'snap']
    ],
    edges: [
      ['n1', 'o_job', 'o_log', 1],
      ['n2', 'o_log', 'o_met', 2],
      ['n3', 'o_met', 'o_alert', 3],
      ['n4', 'o_alert', 'o_chan', 4],
      ['n5', 'o_chan', 'o_run', 5],
      ['n6', 'o_job', 'o_jobs', 6, { nb: true }],
      ['n7', 'o_jobs', 'o_dash', 7],
      ['n8', 'o_bill', 'o_dash', 7, { nb: true }],
      ['n9', 'o_bill', 'o_budget', 8]
    ]
  });
})();
