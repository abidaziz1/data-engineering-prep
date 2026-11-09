/* Diagram specs for the Databricks tutorial. Plain data: nodes, edges, groups, tags. shared/js/graph.js draws them. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var H = LAB.Graph.h, V = LAB.Graph.v;
  var S = (LAB.graphs = {});

  /* ------------------------------------------------------------------ */
  /* 1. The Brewline lakehouse on one page                               */
  /* ------------------------------------------------------------------ */
  S.master = {
    w: 1100, h: 640, label: 'The Brewline lakehouse on Databricks: loaders drop files in cloud storage, Spark compute builds bronze, silver and gold Delta tables, consumers read the gold tables, and governance, jobs, cost, security and releases surround it',
    groups: [
      { id: 'g_src', x: 10, y: 52, w: 250, h: 270, t: 'SOURCES', c: 'src' },
      { id: 'g_ws', x: 290, y: 52, w: 800, h: 290, t: 'YOUR CLOUD STORAGE', c: 'sf' },
      { id: 'g_sp', x: 490, y: 100, w: 585, h: 228, t: 'SPARK COMPUTE', c: 'air' }
    ],
    nodes: [
      { id: 'ld_db', x: 22, y: 100, w: 226, h: 58, t: 'Orders database', s: 'change files', c: 'src', k: 'chip' },
      { id: 'ld_web', x: 22, y: 178, w: 226, h: 58, t: 'Web events', s: 'JSON from the site', c: 'src', k: 'chip' },
      { id: 'ld_csv', x: 22, y: 256, w: 226, h: 58, t: 'Supplier files', s: 'CSV', c: 'src', k: 'chip' },
      { id: 'lz', x: 310, y: 140, w: 150, h: 172, t: 'LANDING', s: 'files as sent', c: 'raw', k: 'layer' },
      { id: 'bronze', x: 510, y: 140, w: 150, h: 172, t: 'BRONZE', s: 'raw Delta', c: 'stg', k: 'layer' },
      { id: 'silver', x: 700, y: 140, w: 150, h: 172, t: 'SILVER', s: 'clean, deduped', c: 'int', k: 'layer' },
      { id: 'gold', x: 890, y: 140, w: 150, h: 172, t: 'GOLD', s: 'business tables', c: 'mart', k: 'layer' },
      { id: 'spark', x: 310, y: 392, w: 250, h: 58, t: 'Spark', s: 'runs every step', c: 'dbt', k: 'chip' },
      { id: 'bi', x: 640, y: 392, w: 200, h: 58, t: 'SQL warehouse + BI', s: 'read gold', c: 'con', k: 'chip' },
      { id: 'ml', x: 870, y: 392, w: 200, h: 58, t: 'Notebooks + ML', s: 'read silver, gold', c: 'con', k: 'chip' },
      { id: 'c_uc', x: 0, y: 520, w: 208, h: 52, t: 'UNITY CATALOG', s: 'who may read what', c: 'qual', k: 'pill' },
      { id: 'c_jobs', x: 223, y: 520, w: 208, h: 52, t: 'JOBS', s: 'schedules, retries', c: 'snap', k: 'pill' },
      { id: 'c_cost', x: 446, y: 520, w: 208, h: 52, t: 'COST', s: 'DBUs and VMs', c: 'mon', k: 'pill' },
      { id: 'c_sec', x: 669, y: 520, w: 208, h: 52, t: 'SECURITY', s: 'Entra ID, secrets', c: 'sf', k: 'pill' },
      { id: 'c_ci', x: 892, y: 520, w: 208, h: 52, t: 'RELEASES', s: 'bundles, tests', c: 'ci', k: 'pill' }
    ],
    edges: [
      { id: 'e1a', a: 'ld_db', b: 'lz', d: H(248, 129, 310, 200), n: 1, nb: true },
      { id: 'e1b', a: 'ld_web', b: 'lz', d: H(248, 207, 310, 226), n: 1, bx: 280, by: 216 },
      { id: 'e1c', a: 'ld_csv', b: 'lz', d: H(248, 285, 310, 252), n: 1, nb: true },
      { id: 'e2', a: 'lz', b: 'bronze', d: 'M460 226 H510', n: 3, bx: 485, by: 198 },
      { id: 'e3', a: 'bronze', b: 'silver', d: 'M660 226 H700', n: 4, bx: 680, by: 198 },
      { id: 'e4', a: 'silver', b: 'gold', d: 'M850 226 H890', n: 5, bx: 870, by: 198 },
      { id: 'e5a', a: 'gold', b: 'bi', d: V(950, 312, 800, 392), n: 6, nb: true },
      { id: 'e5b', a: 'gold', b: 'ml', d: V(980, 312, 1000, 392), n: 6, bx: 990, by: 356 },
      { id: 'e6', a: 'spark', b: 'g_sp', d: V(435, 392, 560, 328), n: 2, bx: 480, by: 362 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 2. Control plane, compute plane and your storage                    */
  /* ------------------------------------------------------------------ */
  S.planes = {
    w: 1100, h: 500, label: 'Databricks planes: the control plane in the Databricks account runs the web app, jobs, cluster manager and catalog. Classic compute runs in your cloud subscription. Serverless compute runs in the Databricks account. Your data stays in your storage',
    groups: [
      { id: 'g_cp', x: 0, y: 30, w: 330, h: 440, t: 'CONTROL PLANE, DATABRICKS ACCOUNT', c: 'dbt' },
      { id: 'g_cc', x: 390, y: 30, w: 330, h: 205, t: 'CLASSIC COMPUTE, YOUR SUBSCRIPTION', c: 'air' },
      { id: 'g_sv', x: 390, y: 265, w: 330, h: 205, t: 'SERVERLESS COMPUTE, DATABRICKS ACCOUNT', c: 'ing' }
    ],
    nodes: [
      { id: 'ui', x: 20, y: 80, w: 290, h: 80, t: 'Web app and API', s: 'notebooks, jobs, SQL editor', c: 'src', k: 'chip' },
      { id: 'cm', x: 20, y: 180, w: 290, h: 80, t: 'Cluster manager', s: 'starts and stops compute', c: 'dbt', k: 'chip' },
      { id: 'jb', x: 20, y: 280, w: 290, h: 80, t: 'Jobs scheduler', s: 'runs tasks on a schedule', c: 'snap', k: 'chip' },
      { id: 'uc', x: 20, y: 380, w: 290, h: 70, t: 'Unity Catalog', s: 'grants, lineage, audit', c: 'qual', k: 'chip' },
      { id: 'vm', x: 410, y: 80, w: 290, h: 130, t: 'Cluster of VMs', ss: ['one driver, many workers', 'inside your virtual network'], c: 'air' },
      { id: 'sv', x: 410, y: 315, w: 290, h: 130, t: 'Serverless compute', ss: ['starts in seconds', 'managed by Databricks'], c: 'ing' },
      { id: 'lake', x: 780, y: 140, w: 310, h: 220, t: 'Your storage', ss: ['ADLS Gen2 or S3', 'Delta tables and files', 'you own the data'], c: 'raw' }
    ],
    edges: [
      { id: 'p1', a: 'ui', b: 'cm', d: 'M165 160 V180', n: 1, bx: 185, by: 170, pk: 1 },
      { id: 'p2', a: 'cm', b: 'vm', d: H(310, 220, 410, 145), n: 2, bx: 360, by: 170, pk: 1 },
      { id: 'p3', a: 'jb', b: 'sv', d: H(310, 320, 410, 380), n: 2, bx: 360, by: 332, pk: 1 },
      { id: 'p4', a: 'vm', b: 'lake', d: H(700, 150, 780, 200), n: 3, bx: 740, by: 160, pk: 1 },
      { id: 'p5', a: 'sv', b: 'lake', d: H(700, 380, 780, 300), n: 3, bx: 740, by: 330, pk: 1 },
      { id: 'p6', a: 'uc', b: 'lake', d: 'M310 415 H1030 V360', n: 4, bx: 700, by: 441, pk: 1 }
    ],
    tags: [
      { id: 'tg_data', x: 780, y: 385, t: 'data never leaves your storage', c: 'raw' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 3. Anatomy of a Spark job                                           */
  /* ------------------------------------------------------------------ */
  S.spark = {
    w: 1100, h: 450, label: 'A Spark query: the driver plans it, cuts the plan into stages at each shuffle, runs one task per partition on the executors, and returns or writes the result',
    nodes: [
      { id: 'drv', x: 0, y: 20, w: 300, h: 120, t: 'Driver', ss: ['reads your code', 'builds the plan'], c: 'dbt' },
      { id: 'opt', x: 400, y: 20, w: 300, h: 120, t: 'Optimizer', ss: ['picks the join strategy', 'prunes columns and files'], c: 'int' },
      { id: 'st1', x: 800, y: 20, w: 300, h: 120, t: 'Stage 1', ss: ['one task per partition', 'filter, project, partial sum'], c: 'stg' },
      { id: 'shf', x: 800, y: 290, w: 300, h: 120, t: 'Shuffle', ss: ['rows move between executors', 'by the grouping key'], c: 'qual' },
      { id: 'st2', x: 400, y: 290, w: 300, h: 120, t: 'Stage 2', ss: ['one task per shuffle partition', 'final sum'], c: 'air' },
      { id: 'res', x: 0, y: 290, w: 300, h: 120, t: 'Result', ss: ['rows to the driver', 'or files to storage'], c: 'mart' }
    ],
    edges: [
      { id: 'k1', a: 'drv', b: 'opt', d: 'M300 80 H400', n: 1, bx: 350, by: 52, pk: 1 },
      { id: 'k2', a: 'opt', b: 'st1', d: 'M700 80 H800', n: 2, bx: 750, by: 52, pk: 1 },
      { id: 'k3', a: 'st1', b: 'shf', d: 'M950 140 V290', n: 3, bx: 978, by: 215, pk: 1 },
      { id: 'k4', a: 'shf', b: 'st2', d: 'M800 350 H700', n: 4, bx: 750, by: 322, pk: 1 },
      { id: 'k5', a: 'st2', b: 'res', d: 'M400 350 H300', n: 5, bx: 350, by: 322, pk: 1 }
    ],
    tags: [
      { id: 'tg_lazy', x: 0, y: 160, t: 'nothing runs until an action', c: 'dbt' },
      { id: 'tg_cost', x: 800, y: 430 - 12, t: 'the shuffle is the expensive step', c: 'qual' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 4. The pipeline as a graph of job tasks                             */
  /* ------------------------------------------------------------------ */
  S.tasks = {
    w: 1100, h: 330, label: 'The Brewline pipeline as job tasks: files land, bronze ingests them, silver merges the newest version of each order, gold aggregates, a quality check runs, and a notification goes out',
    nodes: [
      { id: 'land', k: 'dag', x: 0, y: 130, w: 150, h: 66, t: 'landing', s: 'files', c: 'src' },
      { id: 'brz', k: 'dag', x: 190, y: 130, w: 170, h: 66, t: 'ingest_bronze', s: 'stream, once', c: 'stg' },
      { id: 'slv', k: 'dag', x: 400, y: 130, w: 170, h: 66, t: 'upsert_silver', s: 'merge', c: 'int' },
      { id: 'gld', k: 'dag', x: 610, y: 130, w: 170, h: 66, t: 'build_gold', s: 'aggregate', c: 'mart' },
      { id: 'dq', k: 'dag', x: 820, y: 40, w: 170, h: 66, t: 'check_quality', s: 'row counts', c: 'qual' },
      { id: 'dim', k: 'dag', x: 400, y: 240, w: 170, h: 66, t: 'update_dim', s: 'scd type 2', c: 'snap' },
      { id: 'ntf', k: 'dag', x: 930, y: 130, w: 160, h: 66, t: 'notify', s: 'on failure', c: 'con' }
    ],
    edges: [
      { id: 't1', a: 'land', b: 'brz', d: 'M150 163 H190' },
      { id: 't2', a: 'brz', b: 'slv', d: 'M360 163 H400' },
      { id: 't3', a: 'slv', b: 'gld', d: 'M570 163 H610' },
      { id: 't4', a: 'gld', b: 'dq', d: H(780, 150, 820, 73) },
      { id: 't5', a: 'dq', b: 'ntf', d: H(990, 73, 1010, 130) },
      { id: 't6', a: 'brz', b: 'dim', d: H(360, 183, 400, 273) },
      { id: 't7', a: 'dim', b: 'gld', d: H(570, 273, 610, 185) }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 5. Unity Catalog                                                    */
  /* ------------------------------------------------------------------ */
  S.uc = {
    w: 1100, h: 470, label: 'Unity Catalog: one metastore holds catalogs, catalogs hold schemas, schemas hold tables, views, volumes and functions. An external location joins a storage credential to a path in your storage',
    nodes: [
      { id: 'ms', x: 0, y: 20, w: 250, h: 110, t: 'Metastore', ss: ['one per region', 'attached to workspaces'], c: 'qual' },
      { id: 'cat', x: 300, y: 20, w: 250, h: 110, t: 'Catalog', ss: ['brewline_prod', 'brewline_dev'], c: 'sf' },
      { id: 'sch', x: 600, y: 20, w: 250, h: 110, t: 'Schema', ss: ['bronze, silver, gold', 'one per layer'], c: 'int' },
      { id: 'obj', x: 850, y: 20, w: 250, h: 110, t: 'Objects', ss: ['tables, views', 'volumes, functions'], c: 'mart' },
      { id: 'sc', x: 0, y: 260, w: 250, h: 110, t: 'Storage credential', ss: ['a managed identity', 'or an IAM role'], c: 'dbt' },
      { id: 'el', x: 300, y: 260, w: 250, h: 110, t: 'External location', ss: ['a path plus a credential', 'grants on the path'], c: 'snap' },
      { id: 'st', x: 600, y: 260, w: 250, h: 110, t: 'Your storage path', ss: ['abfss:// or s3://', 'the files themselves'], c: 'raw' },
      { id: 'lin', x: 850, y: 260, w: 250, h: 110, t: 'Lineage and audit', ss: ['system tables', 'who read what'], c: 'mon' }
    ],
    edges: [
      { id: 'u1', a: 'ms', b: 'cat', d: 'M250 75 H300', n: 1, bx: 275, by: 47, pk: 1 },
      { id: 'u2', a: 'cat', b: 'sch', d: 'M550 75 H600', n: 1, bx: 575, by: 47, pk: 1 },
      { id: 'u3', a: 'sch', b: 'obj', d: 'M850 75 H900', n: 1, bx: 875, by: 47, pk: 1 },
      { id: 'u4', a: 'sc', b: 'el', d: 'M250 315 H300', n: 2, bx: 275, by: 287, pk: 1 },
      { id: 'u5', a: 'el', b: 'st', d: 'M550 315 H600', n: 2, bx: 575, by: 287, pk: 1 },
      { id: 'u6', a: 'obj', b: 'lin', d: 'M975 130 V260', n: 3, bx: 1003, by: 195, pk: 1 },
      { id: 'u7', a: 'obj', b: 'st', d: 'M900 130 V200 H725 V260', n: 4, bx: 812, by: 200, pk: 1 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 6. Azure identity, secrets, storage and network                     */
  /* ------------------------------------------------------------------ */
  S.azure = {
    w: 1100, h: 520, label: 'Azure Databricks identity and network: Microsoft Entra ID signs people and service principals in, an access connector with a managed identity reaches storage, Key Vault holds secrets, and the cluster runs in your own virtual network',
    groups: [
      { id: 'g_vn', x: 380, y: 30, w: 340, h: 300, t: 'YOUR VIRTUAL NETWORK', c: 'air' }
    ],
    nodes: [
      { id: 'ent', x: 0, y: 30, w: 300, h: 110, t: 'Microsoft Entra ID', ss: ['people, groups', 'service principals'], c: 'sf' },
      { id: 'ws', x: 400, y: 80, w: 300, h: 110, t: 'Databricks workspace', ss: ['clusters in your network', 'no public IPs'], c: 'dbt' },
      { id: 'kv', x: 0, y: 200, w: 300, h: 110, t: 'Key Vault', ss: ['secrets for sources', 'read through a secret scope'], c: 'qual' },
      { id: 'ac', x: 400, y: 215, w: 300, h: 100, t: 'Access connector', ss: ['a managed identity', 'no stored password'], c: 'snap' },
      { id: 'adl', x: 780, y: 215, w: 310, h: 100, t: 'ADLS Gen2', ss: ['containers for each layer', 'role: Storage Blob Data Contributor'], c: 'raw' },
      { id: 'pl', x: 780, y: 60, w: 310, h: 100, t: 'Private endpoints', ss: ['storage and workspace', 'traffic stays on your network'], c: 'ci' },
      { id: 'ipa', x: 0, y: 380, w: 300, h: 100, t: 'IP access list', ss: ['who may reach the workspace', 'allow list of ranges'], c: 'mon' },
      { id: 'cmk', x: 400, y: 380, w: 300, h: 100, t: 'Customer-managed key', ss: ['you control the encryption key', 'optional'], c: 'ing' }
    ],
    edges: [
      { id: 'z1', a: 'ent', b: 'ws', d: H(300, 85, 400, 135), n: 1, bx: 350, by: 95, pk: 1 },
      { id: 'z2', a: 'kv', b: 'ws', d: H(300, 255, 400, 165), n: 2, bx: 350, by: 205, pk: 1 },
      { id: 'z3', a: 'ws', b: 'ac', d: 'M550 190 V215', n: 3, bx: 575, by: 202, pk: 1 },
      { id: 'z4', a: 'ac', b: 'adl', d: 'M700 265 H780', n: 4, bx: 740, by: 237, pk: 1 },
      { id: 'z5', a: 'ws', b: 'pl', d: H(700, 120, 780, 110), n: 5, bx: 740, by: 100, pk: 1 }
    ]
  };
})();
