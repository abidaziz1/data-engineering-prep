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
})();
