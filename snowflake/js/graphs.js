/* Diagram specs for the Snowflake tutorial. Plain data: nodes, edges, groups. graph.js draws them. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var H = LAB.Graph.h, V = LAB.Graph.v;
  var S = (LAB.graphs = {});

  /* ------------------------------------------------------------------ */
  /* 1. The whole platform on one page                                   */
  /* ------------------------------------------------------------------ */
  S.master = {
    w: 1100, h: 650, label: 'Brewline on Snowflake: sources, cloud storage, loading, the RAW, CORE and MARTS layers, consumers, and the controls around them',
    groups: [
      { id: 'g_src', x: 10, y: 52, w: 250, h: 260, t: 'SOURCES', c: 'src' },
      { id: 'g_sf', x: 10, y: 372, w: 870, h: 190, t: 'SNOWFLAKE', c: 'sf', tx: 300 }
    ],
    nodes: [
      { id: 's_db', x: 22, y: 90, w: 226, h: 58, t: 'Orders database', s: 'Postgres, row by row', c: 'src', k: 'chip' },
      { id: 's_web', x: 22, y: 160, w: 226, h: 58, t: 'Web events', s: 'JSON from the site', c: 'src', k: 'chip' },
      { id: 's_csv', x: 22, y: 230, w: 226, h: 58, t: 'Product feed', s: 'CSV from suppliers', c: 'src', k: 'chip' },
      { id: 's3', x: 330, y: 130, w: 200, h: 110, t: 'Cloud storage', s: 'S3, files by date', c: 'ing' },
      { id: 'load', x: 600, y: 130, w: 210, h: 110, t: 'Load', s: 'COPY or Snowpipe', c: 'ing' },
      { id: 'raw', x: 30, y: 414, w: 190, h: 120, t: 'RAW', s: 'as loaded', c: 'raw', k: 'layer' },
      { id: 'core', x: 265, y: 414, w: 190, h: 120, t: 'CORE', s: 'clean, joined', c: 'stg', k: 'layer' },
      { id: 'mart', x: 500, y: 414, w: 190, h: 120, t: 'MARTS', s: 'ready to query', c: 'mart', k: 'layer' },
      { id: 'bi', x: 912, y: 372, w: 180, h: 62, t: 'BI tools', s: 'dashboards', c: 'con', k: 'chip' },
      { id: 'app', x: 912, y: 452, w: 180, h: 62, t: 'Apps + APIs', s: 'the website', c: 'con', k: 'chip' },
      { id: 'shr', x: 912, y: 532, w: 180, h: 62, t: 'Partners', s: 'secure sharing', c: 'con', k: 'chip' },
      { id: 'c_wh', x: 0, y: 598, w: 263, h: 52, t: 'WAREHOUSES', s: 'compute per workload', c: 'air', k: 'pill' },
      { id: 'c_sec', x: 279, y: 598, w: 263, h: 52, t: 'SECURITY', s: 'roles, masking, audit', c: 'qual', k: 'pill' },
      { id: 'c_cost', x: 558, y: 598, w: 263, h: 52, t: 'COST', s: 'monitors, budgets', c: 'mon', k: 'pill' },
      { id: 'c_ops', x: 837, y: 598, w: 263, h: 52, t: 'DELIVERY', s: 'Git, CI/CD', c: 'ci', k: 'pill' }
    ],
    edges: [
      { id: 'e1a', a: 's_db', b: 's3', d: H(248, 119, 330, 165), n: 1, nb: true },
      { id: 'e1b', a: 's_web', b: 's3', d: H(248, 189, 330, 185), n: 1, bx: 289, by: 187 },
      { id: 'e1c', a: 's_csv', b: 's3', d: H(248, 259, 330, 205), n: 1, nb: true },
      { id: 'e2', a: 's3', b: 'load', d: 'M530 185 H600', n: 2, bx: 565, by: 157 },
      { id: 'e3', a: 'load', b: 'raw', d: 'M705 240 V338 Q705 350 693 350 H137 Q125 350 125 362 V414', n: 3, bx: 560, by: 350 },
      { id: 'e4', a: 'raw', b: 'core', d: 'M220 474 H265', n: 4, bx: 242, by: 446 },
      { id: 'e5', a: 'core', b: 'mart', d: 'M455 474 H500', n: 5, bx: 477, by: 446 },
      { id: 'e6a', a: 'mart', b: 'bi', d: H(690, 474, 912, 403), n: 6, nb: true },
      { id: 'e6b', a: 'mart', b: 'app', d: H(690, 474, 912, 483), n: 6, bx: 800, by: 478 },
      { id: 'e6c', a: 'mart', b: 'shr', d: H(690, 474, 912, 563), n: 6, nb: true }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 2. The three layers                                                 */
  /* ------------------------------------------------------------------ */
  S.arch = {
    w: 1000, h: 580, label: 'Snowflake architecture: cloud services, virtual warehouses, storage',
    groups: [
      { id: 'a_cs', x: 0, y: 112, w: 1000, h: 118, t: 'CLOUD SERVICES', c: 'int', tx: 14 },
      { id: 'a_cp', x: 0, y: 280, w: 1000, h: 140, t: 'COMPUTE: VIRTUAL WAREHOUSES', c: 'stg', tx: 14 },
      { id: 'a_st', x: 0, y: 470, w: 1000, h: 100, t: 'STORAGE', c: 'mart', tx: 14 }
    ],
    nodes: [
      { id: 'cl1', x: 0, y: 0, w: 220, h: 56, t: 'Worksheets', c: 'src', k: 'chip' },
      { id: 'cl2', x: 260, y: 0, w: 220, h: 56, t: 'Loading jobs', c: 'src', k: 'chip' },
      { id: 'cl3', x: 520, y: 0, w: 220, h: 56, t: 'BI tools', c: 'src', k: 'chip' },
      { id: 'cl4', x: 780, y: 0, w: 220, h: 56, t: 'The website', c: 'src', k: 'chip' },
      { id: 'cs1', x: 14, y: 140, w: 220, h: 72, t: 'Login + roles', s: 'authentication, RBAC', c: 'int', k: 'chip' },
      { id: 'cs2', x: 256, y: 140, w: 220, h: 72, t: 'Metadata', s: 'min/max per partition', c: 'int', k: 'chip' },
      { id: 'cs3', x: 498, y: 140, w: 220, h: 72, t: 'Optimizer', s: 'query plans, pruning', c: 'int', k: 'chip' },
      { id: 'cs4', x: 740, y: 140, w: 246, h: 72, t: 'Transactions', s: 'ACID, Time Travel', c: 'int', k: 'chip' },
      { id: 'w1', x: 14, y: 312, w: 220, h: 92, t: 'WH_LOAD', s: 'X-Small', c: 'stg', k: 'chip' },
      { id: 'w2', x: 256, y: 312, w: 220, h: 92, t: 'WH_TRANSFORM', s: 'Medium', c: 'stg', k: 'chip' },
      { id: 'w3', x: 498, y: 312, w: 220, h: 92, t: 'WH_BI', s: 'Large, multi-cluster', c: 'stg', k: 'chip' },
      { id: 'w4', x: 740, y: 312, w: 246, h: 92, t: 'WH_APP', s: 'Small, multi-cluster', c: 'stg', k: 'chip' },
      { id: 'st', x: 14, y: 498, w: 972, h: 62, t: 'Micro-partitions in object storage', s: 'columnar, compressed, immutable, one shared copy', c: 'mart', k: 'bar', inline: true }
    ],
    edges: [
      { id: 'q1', a: 'cl1', b: 'a_cs', d: 'M110 56 V112', pk: 1 },
      { id: 'q2', a: 'cl2', b: 'a_cs', d: 'M370 56 V112', pk: 1 },
      { id: 'q3', a: 'cl3', b: 'a_cs', d: 'M630 56 V112', pk: 1 },
      { id: 'q4', a: 'cl4', b: 'a_cs', d: 'M890 56 V112', pk: 1 },
      { id: 'q5', a: 'a_cs', b: 'a_cp', d: 'M500 230 V280', pk: 1 },
      { id: 'q6', a: 'a_cp', b: 'a_st', d: 'M500 420 V470', pk: 1 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 3. The life of a query                                              */
  /* ------------------------------------------------------------------ */
  S.qlife = {
    w: 1100, h: 480, label: 'What happens when you press Run: cloud services, result cache, warehouse, local cache, storage',
    groups: [
      { id: 'g_cs', x: 230, y: 40, w: 330, h: 420, t: 'CLOUD SERVICES', c: 'int' },
      { id: 'g_wh', x: 640, y: 40, w: 450, h: 270, t: 'VIRTUAL WAREHOUSE', c: 'stg' },
      { id: 'g_st', x: 640, y: 350, w: 450, h: 120, t: 'STORAGE', c: 'mart' }
    ],
    nodes: [
      { id: 'u', x: 0, y: 190, w: 170, h: 110, t: 'You', s: 'worksheet or BI', c: 'src' },
      { id: 'auth', x: 250, y: 92, w: 290, h: 84, t: 'Login + role check', s: 'who you are, what you may read', c: 'int', k: 'chip' },
      { id: 'plan', x: 250, y: 216, w: 290, h: 84, t: 'Parse + optimize', s: 'choose partitions to read', c: 'int', k: 'chip' },
      { id: 'rc', x: 250, y: 340, w: 290, h: 84, t: 'Result cache', s: 'same query, same data?', c: 'int', k: 'chip' },
      { id: 'wh', x: 660, y: 92, w: 410, h: 76, t: 'Run the plan', s: 'scan, join, aggregate', c: 'stg', k: 'chip' },
      { id: 'lc', x: 660, y: 212, w: 410, h: 76, t: 'Local disk cache', s: 'recent partitions on SSD', c: 'stg', k: 'chip' },
      { id: 'st', x: 660, y: 392, w: 410, h: 70, t: 'Micro-partitions', s: 'one shared copy in object storage', c: 'mart', k: 'chip' }
    ],
    edges: [
      { id: 'q1', a: 'u', b: 'auth', d: H(170, 230, 250, 134), n: 1 },
      { id: 'q2', a: 'auth', b: 'plan', d: 'M395 176 V216', n: 2, pk: 1 },
      { id: 'q3', a: 'plan', b: 'rc', d: 'M395 300 V340', n: 3, pk: 1 },
      { id: 'q4', a: 'rc', b: 'u', d: 'M250 382 H85 V300', label: 'hit', lx: 168, ly: 372 },
      { id: 'q5', a: 'plan', b: 'wh', d: H(540, 258, 660, 130), n: 4 },
      { id: 'q6', a: 'wh', b: 'lc', d: 'M865 168 V212', n: 5, bx: 893, by: 190, pk: 1 },
      { id: 'q7', a: 'lc', b: 'st', d: 'M865 288 V392', n: 5, nb: true },
      { id: 'q8', a: 'wh', b: 'u', d: 'M1000 92 V14 H85 V190', n: 6 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 4. Three ways to load                                               */
  /* ------------------------------------------------------------------ */
  S.load = {
    w: 1100, h: 560, label: 'Three ways to load data: batch COPY INTO, Snowpipe for files, Snowpipe Streaming for rows. All end in RAW tables',
    groups: [
      { id: 'g_b', x: 0, y: 34, w: 880, h: 140, t: 'BATCH: YOU RUN COPY', c: 'ing' },
      { id: 'g_p', x: 0, y: 214, w: 880, h: 140, t: 'CONTINUOUS FILES: SNOWPIPE', c: 'ing' },
      { id: 'g_s', x: 0, y: 394, w: 880, h: 140, t: 'CONTINUOUS ROWS: SNOWPIPE STREAMING', c: 'ing' }
    ],
    nodes: [
      { id: 'b1', x: 14, y: 62, w: 200, h: 84, t: 'Files in S3', s: 'CSV, a folder per day', c: 'src', k: 'chip' },
      { id: 'b2', x: 262, y: 62, w: 220, h: 84, t: 'External stage', s: 'points at the bucket', c: 'ing', k: 'chip' },
      { id: 'b3', x: 530, y: 62, w: 300, h: 84, t: 'COPY INTO', s: 'you run it, on your warehouse', c: 'stg', k: 'chip' },
      { id: 'p1', x: 14, y: 242, w: 200, h: 84, t: 'Files in S3', s: 'arrive all day', c: 'src', k: 'chip' },
      { id: 'p2', x: 262, y: 242, w: 220, h: 84, t: 'Event notification', s: 'S3 tells Snowflake', c: 'ing', k: 'chip' },
      { id: 'p3', x: 530, y: 242, w: 300, h: 84, t: 'Snowpipe', s: 'serverless COPY, about a minute', c: 'stg', k: 'chip' },
      { id: 's1', x: 14, y: 422, w: 200, h: 84, t: 'App or Kafka', s: 'rows, not files', c: 'src', k: 'chip' },
      { id: 's2', x: 262, y: 422, w: 568, h: 84, t: 'Snowpipe Streaming', s: 'rows written through an SDK, ready in seconds', c: 'stg', k: 'chip' },
      { id: 'raw', x: 930, y: 62, w: 160, h: 444, t: 'RAW', s: 'as loaded', c: 'raw', k: 'layer' }
    ],
    edges: [
      { id: 'lb1', a: 'b1', b: 'b2', d: 'M214 104 H262', n: 1, bx: 238, by: 76, pk: 1 },
      { id: 'lb2', a: 'b2', b: 'b3', d: 'M482 104 H530', n: 2, bx: 506, by: 76, pk: 1 },
      { id: 'lb3', a: 'b3', b: 'raw', d: 'M830 104 H930', n: 3, bx: 880, by: 76, pk: 1 },
      { id: 'lp1', a: 'p1', b: 'p2', d: 'M214 284 H262', n: 1, bx: 238, by: 256, pk: 1 },
      { id: 'lp2', a: 'p2', b: 'p3', d: 'M482 284 H530', n: 2, bx: 506, by: 256, pk: 1 },
      { id: 'lp3', a: 'p3', b: 'raw', d: 'M830 284 H930', n: 3, bx: 880, by: 256, pk: 1 },
      { id: 'ls1', a: 's1', b: 's2', d: 'M214 464 H262', n: 1, bx: 238, by: 436, pk: 1 },
      { id: 'ls2', a: 's2', b: 'raw', d: 'M830 464 H930', n: 2, bx: 880, by: 436, pk: 1 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 5. Layers of data protection                                        */
  /* ------------------------------------------------------------------ */
  S.protect = {
    w: 1100, h: 430, label: 'Layers of data protection: current data, Time Travel, Fail-safe, plus zero-copy clones and replication',
    nodes: [
      { id: 'cur', x: 0, y: 60, w: 220, h: 120, t: 'Current data', s: 'what queries see', c: 'mart' },
      { id: 'tt', x: 300, y: 60, w: 250, h: 120, t: 'Time Travel', s: '1 to 90 days', c: 'stg' },
      { id: 'fs', x: 630, y: 60, w: 220, h: 120, t: 'Fail-safe', s: '7 days, last resort', c: 'qual' },
      { id: 'gone', x: 930, y: 60, w: 170, h: 120, t: 'Purged', s: 'gone for good', c: 'src' },
      { id: 'clone', x: 0, y: 290, w: 520, h: 130, t: 'Zero-copy clone', s: 'a new table that shares the partitions', c: 'int' },
      { id: 'repl', x: 580, y: 290, w: 520, h: 130, t: 'Replication and failover', s: 'a copy in another region or account', c: 'ci' }
    ],
    edges: [
      { id: 'p1', a: 'cur', b: 'tt', d: 'M220 120 H300', n: 1, bx: 260, by: 92, pk: 1 },
      { id: 'p2', a: 'tt', b: 'fs', d: 'M550 120 H630', n: 2, bx: 590, by: 92, pk: 1 },
      { id: 'p3', a: 'fs', b: 'gone', d: 'M850 120 H930', n: 3, bx: 890, by: 92, pk: 1 },
      { id: 'p4', a: 'cur', b: 'clone', d: 'M70 180 V290', n: 4, pk: 2 },
      { id: 'p5', a: 'cur', b: 'repl', d: 'M180 180 V235 Q180 247 192 247 H828 Q840 247 840 259 V290', n: 5, bx: 510, by: 247 }
    ],
    tags: [
      { id: 'tg_tt', x: 300, y: 8, t: 'you query and restore', c: 'mart' },
      { id: 'tg_fs', x: 630, y: 8, t: 'Snowflake Support only', c: 'qual' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 6. The pipeline inside Snowflake                                    */
  /* ------------------------------------------------------------------ */
  S.pipe = {
    w: 1100, h: 410, label: 'A pipeline inside Snowflake: Snowpipe, RAW table, stream, task, CORE table, dynamic table, dashboards',
    nodes: [
      { id: 'pipe', x: 0, y: 50, w: 210, h: 100, t: 'Snowpipe', s: 'loads new files', c: 'ing' },
      { id: 'raw', x: 270, y: 50, w: 210, h: 100, t: 'RAW.ORDERS', s: 'append-only', c: 'raw' },
      { id: 'strm', x: 540, y: 50, w: 210, h: 100, t: 'Stream', s: 'tracks changes', c: 'int' },
      { id: 'task', x: 810, y: 50, w: 250, h: 100, t: 'Task', s: 'MERGE every 5 min', c: 'air' },
      { id: 'core', x: 0, y: 290, w: 230, h: 100, t: 'CORE.ORDERS', s: 'latest per order', c: 'stg' },
      { id: 'dt', x: 300, y: 290, w: 330, h: 100, t: 'Dynamic table', s: 'MARTS.DAILY_REVENUE', c: 'mart' },
      { id: 'bi', x: 700, y: 290, w: 240, h: 100, t: 'Dashboards', s: 'BI tools', c: 'con' }
    ],
    edges: [
      { id: 'e1', a: 'pipe', b: 'raw', d: 'M210 100 H270', n: 1, bx: 240, by: 72, pk: 1 },
      { id: 'e2', a: 'raw', b: 'strm', d: 'M480 100 H540', n: 2, bx: 510, by: 72, pk: 1 },
      { id: 'e3', a: 'strm', b: 'task', d: 'M750 100 H810', n: 3, bx: 780, by: 72, pk: 1 },
      { id: 'e4', a: 'task', b: 'core', d: 'M935 150 V215 Q935 227 923 227 H127 Q115 227 115 239 V290', n: 4, bx: 520, by: 227 },
      { id: 'e5', a: 'core', b: 'dt', d: 'M230 340 H300', n: 5, bx: 265, by: 312, pk: 1 },
      { id: 'e6', a: 'dt', b: 'bi', d: 'M630 340 H700', n: 6, bx: 665, by: 312, pk: 1 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 7. A task graph                                                     */
  /* ------------------------------------------------------------------ */
  S.tgraph = {
    w: 1100, h: 210, label: 'A task graph: load check, merge, row count check, mart refresh, and a finalizer that always runs',
    nodes: [
      { id: 'tsk_load', k: 'dag', x: 0, y: 112, w: 160, h: 66, t: 'tsk_load', s: 'root, every 5 min', c: 'ing' },
      { id: 'tsk_merge', k: 'dag', x: 235, y: 112, w: 160, h: 66, t: 'tsk_merge', s: 'MERGE into CORE', c: 'stg' },
      { id: 'tsk_check', k: 'dag', x: 470, y: 112, w: 160, h: 66, t: 'tsk_check', s: 'row count test', c: 'qual' },
      { id: 'tsk_mart', k: 'dag', x: 705, y: 112, w: 160, h: 66, t: 'tsk_mart', s: 'refresh mart', c: 'mart' },
      { id: 'tsk_final', k: 'dag', x: 940, y: 112, w: 160, h: 66, t: 'tsk_final', s: 'finalizer', c: 'air' }
    ],
    edges: [
      { id: 'tsk_load>tsk_merge', a: 'tsk_load', b: 'tsk_merge', d: 'M160 145 H235' },
      { id: 'tsk_merge>tsk_check', a: 'tsk_merge', b: 'tsk_check', d: 'M395 145 H470' },
      { id: 'tsk_check>tsk_mart', a: 'tsk_check', b: 'tsk_mart', d: 'M630 145 H705' },
      { id: 'tsk_mart>tsk_final', a: 'tsk_mart', b: 'tsk_final', d: 'M865 145 H940', k: 'ctl' },
      { id: 'tsk_load>tsk_final', a: 'tsk_load', b: 'tsk_final', d: 'M80 112 V50 H1020 V112', k: 'ctl', label: 'the finalizer is attached to the root and always runs', lx: 550, ly: 50 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 8. A query profile                                                  */
  /* ------------------------------------------------------------------ */
  S.profile = {
    w: 1100, h: 270, label: 'Query profile: the operators of one slow query',
    nodes: [
      { id: 'p1', x: 0, y: 30, w: 190, h: 130, t: 'TableScan', ss: ['core.orders', '11 of 12 partitions'], c: 'raw' },
      { id: 'p2', x: 227, y: 30, w: 190, h: 130, t: 'Filter', ss: ['month = March', '41M rows pass'], c: 'stg' },
      { id: 'p3', x: 454, y: 30, w: 190, h: 130, t: 'Join', ss: ['with customers', '3.2B rows out'], c: 'int' },
      { id: 'p4', x: 681, y: 30, w: 190, h: 130, t: 'Aggregate', ss: ['SUM(total_usd)', '38 GB spilled'], c: 'mart' },
      { id: 'p5', x: 908, y: 30, w: 190, h: 130, t: 'Result', ss: ['4 rows'], c: 'con' }
    ],
    edges: [
      { id: 'pe1', a: 'p1', b: 'p2', d: 'M190 95 H227', pk: 1 },
      { id: 'pe2', a: 'p2', b: 'p3', d: 'M417 95 H454', pk: 1 },
      { id: 'pe3', a: 'p3', b: 'p4', d: 'M644 95 H681', pk: 1 },
      { id: 'pe4', a: 'p4', b: 'p5', d: 'M871 95 H908', pk: 1 }
    ],
    tags: [
      { id: 'tg1', x: 0, y: 185, t: 'Almost no pruning', c: 'qual' },
      { id: 'tg2', x: 400, y: 185, t: 'Row explosion: 41M in, 3.2B out', c: 'qual' },
      { id: 'tg3', x: 681, y: 185, t: 'Spilling to remote storage', c: 'qual' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 9. Role hierarchy                                                   */
  /* ------------------------------------------------------------------ */
  var V2 = LAB.Graph.v;
  S.rbac = {
    w: 1100, h: 470, label: 'Role hierarchy: ACCOUNTADMIN above SECURITYADMIN and SYSADMIN, custom roles below SYSADMIN, and PII_READER inheriting ANALYST',
    nodes: [
      { id: 'acct', x: 440, y: 6, w: 220, h: 64, t: 'ACCOUNTADMIN', s: 'use rarely', c: 'qual', k: 'chip' },
      { id: 'sec', x: 170, y: 120, w: 240, h: 64, t: 'SECURITYADMIN', s: 'manages grants', c: 'int', k: 'chip' },
      { id: 'sys', x: 640, y: 120, w: 240, h: 64, t: 'SYSADMIN', s: 'owns databases', c: 'int', k: 'chip' },
      { id: 'usr', x: 170, y: 240, w: 240, h: 64, t: 'USERADMIN', s: 'creates users + roles', c: 'int', k: 'chip' },
      { id: 'loader', x: 440, y: 250, w: 200, h: 64, t: 'LOADER', s: 'writes RAW', c: 'ing', k: 'chip' },
      { id: 'transformer', x: 660, y: 250, w: 200, h: 64, t: 'TRANSFORMER', s: 'builds CORE + MARTS', c: 'stg', k: 'chip' },
      { id: 'analyst', x: 880, y: 250, w: 200, h: 64, t: 'ANALYST', s: 'reads MARTS', c: 'mart', k: 'chip' },
      { id: 'pii', x: 880, y: 380, w: 200, h: 64, t: 'PII_READER', s: 'inherits ANALYST', c: 'con', k: 'chip' }
    ],
    edges: [
      { id: 'r1', a: 'acct', b: 'sec', d: V2(520, 70, 290, 120), pk: 1 },
      { id: 'r2', a: 'acct', b: 'sys', d: V2(580, 70, 760, 120), pk: 1 },
      { id: 'r3', a: 'sec', b: 'usr', d: 'M290 184 V240', pk: 1 },
      { id: 'r4', a: 'sys', b: 'loader', d: V2(700, 184, 540, 250), pk: 1 },
      { id: 'r5', a: 'sys', b: 'transformer', d: V2(760, 184, 760, 250), pk: 1 },
      { id: 'r6', a: 'sys', b: 'analyst', d: V2(820, 184, 980, 250), pk: 1 },
      { id: 'r7', a: 'pii', b: 'analyst', d: 'M980 380 V314', pk: 1 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 10. Secure data sharing                                             */
  /* ------------------------------------------------------------------ */
  S.sharing = {
    w: 1100, h: 420, label: 'Secure data sharing: the provider adds objects to a share, no data is copied, the consumer creates a read-only database and queries it with its own warehouse',
    groups: [
      { id: 'g_prov', x: 0, y: 40, w: 360, h: 360, t: 'PROVIDER ACCOUNT', c: 'mart' },
      { id: 'g_cons', x: 740, y: 40, w: 360, h: 360, t: 'CONSUMER ACCOUNT', c: 'con' }
    ],
    nodes: [
      { id: 'pdb', x: 20, y: 92, w: 320, h: 100, t: 'Secure view', s: 'marts.v_partner_sales', c: 'mart' },
      { id: 'shr', x: 20, y: 262, w: 320, h: 100, t: 'SHARE', s: 'brewline_partner_share', c: 'int' },
      { id: 'store', x: 450, y: 150, w: 200, h: 120, t: 'One copy', s: 'no data copied', c: 'raw' },
      { id: 'cdb', x: 760, y: 92, w: 320, h: 100, t: 'Shared database', s: 'read-only, live data', c: 'con' },
      { id: 'cwh', x: 760, y: 262, w: 320, h: 100, t: 'Consumer warehouse', s: 'the consumer pays compute', c: 'air' }
    ],
    edges: [
      { id: 'sh1', a: 'pdb', b: 'shr', d: 'M180 192 V262', n: 1, pk: 1 },
      { id: 'sh2', a: 'shr', b: 'store', d: 'M340 312 C395 312 395 210 450 210', n: 2, pk: 1 },
      { id: 'sh3', a: 'store', b: 'cdb', d: 'M650 210 C705 210 705 142 760 142', n: 3, pk: 1 },
      { id: 'sh4', a: 'cdb', b: 'cwh', d: 'M920 192 V262', n: 4, pk: 1 }
    ]
  };
})();
