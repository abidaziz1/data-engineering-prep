/* Diagram specs for the AWS tutorial. Plain data: nodes, edges, groups, tags. shared/js/graph.js draws them. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var H = LAB.Graph.h, V = LAB.Graph.v;
  var S = (LAB.graphs = {});

  /* ------------------------------------------------------------------ */
  /* 1. The Brewline platform on one page                                */
  /* ------------------------------------------------------------------ */
  S.master = {
    w: 1100, h: 640, label: 'The Brewline data platform on AWS: sources send data to an S3 lake with raw, clean and curated zones, Glue jobs move data between the zones, Athena and Redshift read the curated tables, and IAM, encryption and networking, monitoring and cost, orchestration and infrastructure as code surround it',
    groups: [
      { id: 'g_src', x: 10, y: 52, w: 250, h: 270, t: 'SOURCES', c: 'src' },
      { id: 'g_lake', x: 290, y: 52, w: 800, h: 290, t: 'YOUR S3 DATA LAKE', c: 'sf' }
    ],
    nodes: [
      { id: 'ld_db', x: 22, y: 100, w: 226, h: 58, t: 'Orders database', s: 'Aurora or RDS', c: 'src', k: 'chip' },
      { id: 'ld_web', x: 22, y: 178, w: 226, h: 58, t: 'Website events', s: 'clickstream JSON', c: 'src', k: 'chip' },
      { id: 'ld_csv', x: 22, y: 256, w: 226, h: 58, t: 'Supplier files', s: 'CSV over SFTP', c: 'src', k: 'chip' },
      { id: 'raw', x: 310, y: 140, w: 210, h: 172, t: 'RAW', s: 'files as received', c: 'raw', k: 'layer' },
      { id: 'clean', x: 570, y: 140, w: 210, h: 172, t: 'CLEAN', s: 'Parquet, typed', c: 'stg', k: 'layer' },
      { id: 'cur', x: 830, y: 140, w: 230, h: 172, t: 'CURATED', s: 'business tables', c: 'mart', k: 'layer' },
      { id: 'glue', x: 310, y: 392, w: 250, h: 58, t: 'Glue', s: 'jobs and the catalog', c: 'dbt', k: 'chip' },
      { id: 'ath', x: 590, y: 392, w: 220, h: 58, t: 'Athena', s: 'SQL on S3', c: 'con', k: 'chip' },
      { id: 'rs', x: 840, y: 392, w: 220, h: 58, t: 'Redshift + BI', s: 'dashboards', c: 'con', k: 'chip' },
      { id: 'c_iam', x: 0, y: 520, w: 208, h: 52, t: 'IAM', s: 'who may do what', c: 'qual', k: 'pill' },
      { id: 'c_sec', x: 223, y: 520, w: 208, h: 52, t: 'KMS + VPC', s: 'keys, private paths', c: 'sf', k: 'pill' },
      { id: 'c_ops', x: 446, y: 520, w: 208, h: 52, t: 'CloudWatch', s: 'alarms, budgets', c: 'mon', k: 'pill' },
      { id: 'c_flow', x: 669, y: 520, w: 208, h: 52, t: 'Step Functions', s: 'runs the order', c: 'snap', k: 'pill' },
      { id: 'c_iac', x: 892, y: 520, w: 208, h: 52, t: 'CloudFormation', s: 'builds all of it', c: 'ci', k: 'pill' }
    ],
    edges: [
      { id: 'e1a', a: 'ld_db', b: 'raw', d: H(248, 129, 310, 200), n: 1, nb: true },
      { id: 'e1b', a: 'ld_web', b: 'raw', d: H(248, 207, 310, 226), n: 1, bx: 280, by: 216 },
      { id: 'e1c', a: 'ld_csv', b: 'raw', d: H(248, 285, 310, 252), n: 1, nb: true },
      { id: 'e2', a: 'raw', b: 'clean', d: 'M520 226 H570', n: 3, bx: 545, by: 198 },
      { id: 'e3', a: 'clean', b: 'cur', d: 'M780 226 H830', n: 4, bx: 805, by: 198 },
      { id: 'e5a', a: 'cur', b: 'ath', d: V(900, 312, 700, 392), n: 5, nb: true },
      { id: 'e5b', a: 'cur', b: 'rs', d: V(980, 312, 950, 392), n: 5, bx: 965, by: 356 },
      { id: 'e6', a: 'glue', b: 'clean', d: V(435, 392, 675, 312), n: 2, bx: 520, by: 362 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 2. S3: writers, one bucket, events and lifecycle                    */
  /* ------------------------------------------------------------------ */
  S.s3 = {
    w: 1100, h: 560, label: 'One S3 bucket: loaders write objects under prefixes, an object-created event goes to EventBridge, a queue or a function, and a lifecycle rule moves old objects to cheaper storage classes and finally deletes them',
    groups: [
      { id: 'g_b', x: 330, y: 40, w: 400, h: 250, t: 'BUCKET brewline-lake', c: 'raw' }
    ],
    nodes: [
      { id: 'w1', x: 0, y: 60, w: 250, h: 70, t: 'Firehose', s: 'streams into raw/', c: 'ing', k: 'chip' },
      { id: 'w2', x: 0, y: 160, w: 250, h: 70, t: 'Glue job', s: 'writes curated/', c: 'dbt', k: 'chip' },
      { id: 'w3', x: 0, y: 260, w: 250, h: 60, t: 'aws s3 sync', s: 'a person or a script', c: 'src', k: 'chip' },
      { id: 'pr', x: 350, y: 90, w: 360, h: 80, t: 'raw/orders/dt=2026-03-14/', ss: ['many objects under one prefix'], c: 'stg' },
      { id: 'pc', x: 350, y: 195, w: 360, h: 80, t: 'curated/orders/dt=2026-03-14/', ss: ['Parquet files'], c: 'mart' },
      { id: 'nt', x: 800, y: 60, w: 290, h: 90, t: 'Event notification', ss: ['object created, deleted'], c: 'snap' },
      { id: 'eb', x: 800, y: 175, w: 290, h: 70, t: 'EventBridge', s: 'rules decide who hears', c: 'qual', k: 'chip' },
      { id: 'tg', x: 800, y: 265, w: 290, h: 70, t: 'SQS, Lambda, SNS', s: 'the targets', c: 'con', k: 'chip' },
      { id: 'cl1', x: 20, y: 430, w: 200, h: 90, t: 'Standard', ss: ['hot data'], c: 'mart' },
      { id: 'cl2', x: 290, y: 430, w: 200, h: 90, t: 'Standard-IA', ss: ['after 30 days'], c: 'stg' },
      { id: 'cl3', x: 560, y: 430, w: 200, h: 90, t: 'Glacier', ss: ['after 90 days'], c: 'int' },
      { id: 'cl4', x: 830, y: 430, w: 230, h: 90, t: 'Deleted', ss: ['after 365 days'], c: 'src' }
    ],
    edges: [
      { id: 's1', a: 'w1', b: 'pr', d: H(250, 95, 350, 130), n: 1, bx: 300, by: 102, pk: 1 },
      { id: 's1b', a: 'w2', b: 'pc', d: H(250, 195, 350, 235), n: 1, nb: true, pk: 1 },
      { id: 's1c', a: 'w3', b: 'pr', d: H(250, 290, 350, 160), n: 1, nb: true, pk: 1 },
      { id: 's2', a: 'pr', b: 'nt', d: H(710, 130, 800, 105), n: 2, bx: 755, by: 102, pk: 1 },
      { id: 's3', a: 'nt', b: 'eb', d: 'M945 150 V175', n: 3, bx: 975, by: 162, pk: 1 },
      { id: 's4', a: 'eb', b: 'tg', d: 'M945 245 V265', n: 3, nb: true, pk: 1 },
      { id: 'l1', a: 'cl1', b: 'cl2', d: 'M220 475 H290', n: 4, bx: 255, by: 447, pk: 1 },
      { id: 'l2', a: 'cl2', b: 'cl3', d: 'M490 475 H560', n: 4, bx: 525, by: 447, pk: 1 },
      { id: 'l3', a: 'cl3', b: 'cl4', d: 'M760 475 H830', n: 4, bx: 795, by: 447, pk: 1 }
    ],
    tags: [
      { id: 'tg_life', x: 330, y: 372, t: 'a lifecycle rule moves objects by age', c: 'mon' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 3. IAM: how a request is decided                                    */
  /* ------------------------------------------------------------------ */
  S.iam = {
    w: 1100, h: 470, label: 'How AWS decides a request: it signs in the caller, stops at any explicit deny, applies organization limits and permission boundaries, then looks for an allow in the identity policy or the resource policy. With no allow, the answer is deny',
    nodes: [
      { id: 'rq', x: 0, y: 30, w: 240, h: 120, t: 'The request', ss: ['who: a role session', 'what: s3:GetObject', 'on: one object ARN'], c: 'src' },
      { id: 'au', x: 285, y: 30, w: 240, h: 120, t: 'Sign-in check', ss: ['SigV4 signature', 'or a session token'], c: 'sf' },
      { id: 'dn', x: 570, y: 30, w: 240, h: 120, t: 'Explicit deny?', ss: ['in any policy', 'yes: stop, deny'], c: 'qual' },
      { id: 'sc', x: 855, y: 30, w: 240, h: 120, t: 'Organization limit', ss: ['service control policy', 'must allow it too'], c: 'mon' },
      { id: 'bd', x: 855, y: 260, w: 240, h: 120, t: 'Boundary, session', ss: ['permission boundary', 'session policy'], c: 'snap' },
      { id: 'al', x: 570, y: 260, w: 240, h: 120, t: 'An allow?', ss: ['identity policy', 'or resource policy'], c: 'stg' },
      { id: 'ok', x: 285, y: 260, w: 240, h: 120, t: 'Allow', ss: ['the call runs'], c: 'mart' },
      { id: 'no', x: 0, y: 260, w: 240, h: 120, t: 'Deny', ss: ['the default', 'when nothing allows'], c: 'int' }
    ],
    edges: [
      { id: 'i1', a: 'rq', b: 'au', d: 'M240 90 H285', n: 1, bx: 262, by: 62, pk: 1 },
      { id: 'i2', a: 'au', b: 'dn', d: 'M525 90 H570', n: 2, bx: 547, by: 62, pk: 1 },
      { id: 'i3', a: 'dn', b: 'sc', d: 'M810 90 H855', n: 3, bx: 832, by: 62, pk: 1 },
      { id: 'i4', a: 'sc', b: 'bd', d: 'M975 150 V260', n: 4, bx: 1003, by: 205, pk: 1 },
      { id: 'i5', a: 'bd', b: 'al', d: 'M855 320 H810', n: 5, bx: 832, by: 292, pk: 1 },
      { id: 'i6', a: 'al', b: 'ok', d: 'M570 320 H525', n: 6, bx: 547, by: 292, pk: 1 },
      { id: 'i7', a: 'al', b: 'no', d: 'M690 380 V430 H120 V380', n: 7, bx: 405, by: 430, pk: 1 }
    ],
    tags: [
      { id: 'tg_deny', x: 570, y: 170, t: 'deny always wins', c: 'qual' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 4. The Glue Data Catalog as the hub                                 */
  /* ------------------------------------------------------------------ */
  S.catalog = {
    w: 1100, h: 520, label: 'The Glue Data Catalog stores table definitions: a crawler or a DDL statement writes them, the S3 files hold the data they point to, and Athena, Redshift Spectrum, Glue jobs and EMR read them. Lake Formation decides who may read which table',
    groups: [
      { id: 'g_cons', x: 740, y: 40, w: 350, h: 440, t: 'THEY READ THE CATALOG', c: 'con' }
    ],
    nodes: [
      { id: 'files', x: 0, y: 40, w: 300, h: 120, t: 'Files in S3', ss: ['Parquet under dt= folders', 'the data itself'], c: 'raw' },
      { id: 'crawl', x: 0, y: 220, w: 300, h: 100, t: 'Crawler or DDL', ss: ['finds columns and folders', 'writes the table'], c: 'snap' },
      { id: 'cat', x: 370, y: 130, w: 310, h: 200, t: 'Data Catalog', ss: ['database brewline_lake', 'table orders', 'partitions dt=2026-03-14 ...'], c: 'dbt' },
      { id: 'lf', x: 370, y: 380, w: 310, h: 90, t: 'Lake Formation', ss: ['grants on databases and tables'], c: 'qual' },
      { id: 'ath', x: 760, y: 90, w: 310, h: 70, t: 'Athena', s: 'SQL, no servers', c: 'con', k: 'chip' },
      { id: 'rss', x: 760, y: 185, w: 310, h: 70, t: 'Redshift Spectrum', s: 'external tables', c: 'con', k: 'chip' },
      { id: 'gj', x: 760, y: 280, w: 310, h: 70, t: 'Glue jobs', s: 'read and write tables', c: 'con', k: 'chip' },
      { id: 'emr', x: 760, y: 375, w: 310, h: 70, t: 'EMR and others', s: 'Hive metastore API', c: 'con', k: 'chip' }
    ],
    edges: [
      { id: 'c1', a: 'files', b: 'crawl', d: 'M150 160 V220', n: 1, bx: 178, by: 190, pk: 1 },
      { id: 'c2', a: 'crawl', b: 'cat', d: H(300, 270, 370, 230), n: 2, bx: 335, by: 240, pk: 1 },
      { id: 'c3', a: 'cat', b: 'files', d: 'M370 150 H320 V100 H300', n: 3, bx: 345, by: 124, pk: 1 },
      { id: 'c4', a: 'cat', b: 'ath', d: H(680, 180, 760, 125), n: 4, bx: 720, by: 140, pk: 1 },
      { id: 'c4b', a: 'cat', b: 'rss', d: H(680, 210, 760, 220), n: 4, nb: true, pk: 1 },
      { id: 'c4c', a: 'cat', b: 'gj', d: H(680, 250, 760, 315), n: 4, nb: true, pk: 1 },
      { id: 'c5', a: 'lf', b: 'cat', d: 'M525 380 V330', n: 5, bx: 553, by: 355, pk: 1 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 5. Athena: the path of a query                                      */
  /* ------------------------------------------------------------------ */
  S.athena = {
    w: 1100, h: 420, label: 'An Athena query: the SQL goes to a workgroup, the engine reads the table definition from the Glue Data Catalog, reads only the needed bytes of the files in S3, and writes the result to an S3 location. You pay for the bytes it read',
    groups: [
      { id: 'g_wg', x: 300, y: 20, w: 420, h: 380, t: 'WORKGROUP brewline', c: 'qual' }
    ],
    nodes: [
      { id: 'sql', x: 0, y: 60, w: 250, h: 110, t: 'Your SQL', ss: ['console, API or BI tool', 'StartQueryExecution'], c: 'src' },
      { id: 'eng', x: 330, y: 80, w: 360, h: 110, t: 'Athena engine', ss: ['Trino, no servers to run', 'splits the work over many workers'], c: 'con' },
      { id: 'cat', x: 330, y: 230, w: 360, h: 80, t: 'Glue Data Catalog', ss: ['columns, partitions, location'], c: 'dbt' },
      { id: 'lim', x: 330, y: 325, w: 360, h: 60, t: 'Limits and result location', c: 'qual', k: 'chip' },
      { id: 'dat', x: 780, y: 60, w: 310, h: 110, t: 'Data files in S3', ss: ['reads only the columns', 'and folders it needs'], c: 'raw' },
      { id: 'res', x: 780, y: 230, w: 310, h: 110, t: 'Results in S3', ss: ['a CSV file per query', 'and metadata'], c: 'mart' },
      { id: 'bill', x: 0, y: 250, w: 250, h: 110, t: 'The bill', ss: ['bytes read from S3', 'per terabyte'], c: 'mon' }
    ],
    edges: [
      { id: 'a1', a: 'sql', b: 'eng', d: 'M250 115 H330', n: 1, bx: 290, by: 87, pk: 1 },
      { id: 'a2', a: 'eng', b: 'cat', d: 'M510 190 V230', n: 2, bx: 538, by: 210, pk: 1 },
      { id: 'a3', a: 'eng', b: 'dat', d: 'M690 125 H780', n: 3, bx: 735, by: 97, pk: 1 },
      { id: 'a4', a: 'eng', b: 'res', d: 'M690 170 C730 170 730 285 780 285', n: 4, bx: 735, by: 240, pk: 1 },
      { id: 'a5', a: 'dat', b: 'bill', d: 'M780 150 C600 215 400 215 250 290', n: 5, bx: 560, by: 214, pk: 1 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 6. Redshift                                                         */
  /* ------------------------------------------------------------------ */
  S.redshift = {
    w: 1100, h: 560, label: 'Redshift: a leader node plans each query and compute nodes run it in parallel on slices. RA3 nodes keep data in managed storage backed by S3. COPY loads files from S3, Spectrum reads S3 in place, and data sharing lets another cluster read live data',
    groups: [
      { id: 'g_cn', x: 360, y: 150, w: 400, h: 250, t: 'COMPUTE NODES', c: 'air' }
    ],
    nodes: [
      { id: 'cli', x: 0, y: 60, w: 270, h: 100, t: 'BI tool or SQL client', ss: ['JDBC, ODBC or Data API'], c: 'src' },
      { id: 'ldr', x: 380, y: 40, w: 360, h: 80, t: 'Leader node', ss: ['parses, plans, coordinates'], c: 'dbt' },
      { id: 'n1', x: 380, y: 190, w: 110, h: 180, t: 'Node 1', ss: ['slices'], c: 'air' },
      { id: 'n2', x: 505, y: 190, w: 110, h: 180, t: 'Node 2', ss: ['slices'], c: 'air' },
      { id: 'n3', x: 630, y: 190, w: 110, h: 180, t: 'Node 3', ss: ['slices'], c: 'air' },
      { id: 'ms', x: 380, y: 440, w: 360, h: 90, t: 'Managed storage', ss: ['RA3 keeps data here, backed by S3'], c: 'raw' },
      { id: 'cp', x: 820, y: 60, w: 270, h: 90, t: 'COPY from S3', ss: ['load files in parallel'], c: 'ing' },
      { id: 'sp', x: 820, y: 200, w: 270, h: 90, t: 'Spectrum', ss: ['query S3 in place'], c: 'mart' },
      { id: 'sh', x: 820, y: 340, w: 270, h: 90, t: 'Data sharing', ss: ['another cluster reads live'], c: 'qual' },
      { id: 's3', x: 820, y: 460, w: 270, h: 70, t: 'S3 lake', s: 'Parquet files', c: 'raw', k: 'chip' }
    ],
    edges: [
      { id: 'r1', a: 'cli', b: 'ldr', d: H(270, 110, 380, 80), n: 1, bx: 325, by: 78, pk: 1 },
      { id: 'r2', a: 'ldr', b: 'n2', d: 'M560 120 V190', n: 2, bx: 588, by: 156, pk: 1 },
      { id: 'r3', a: 'n2', b: 'ms', d: 'M560 370 V440', n: 3, bx: 588, by: 405, pk: 1 },
      { id: 'r4', a: 's3', b: 'cp', d: 'M955 460 V150', n: 4, nb: true },
      { id: 'r5', a: 'cp', b: 'n3', d: H(820, 105, 740, 250), n: 4, bx: 785, by: 170, pk: 1 },
      { id: 'r6', a: 'sp', b: 's3', d: 'M955 290 V460', n: 5, nb: true },
      { id: 'r7', a: 'n3', b: 'sp', d: H(740, 290, 820, 245), n: 5, bx: 780, by: 262, pk: 1 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 7. Streaming: Kinesis shards and consumers                          */
  /* ------------------------------------------------------------------ */
  S.stream = {
    w: 1100, h: 520, label: 'A Kinesis data stream: producers send records with a partition key, the key picks a shard, and consumers read each shard in order: a Lambda function, Firehose delivering to S3, and a Flink application',
    groups: [
      { id: 'g_ks', x: 330, y: 40, w: 360, h: 380, t: 'STREAM orders, 3 SHARDS', c: 'ing' }
    ],
    nodes: [
      { id: 'p1', x: 0, y: 40, w: 250, h: 80, t: 'Website', s: 'click events', c: 'src', k: 'chip' },
      { id: 'p2', x: 0, y: 160, w: 250, h: 80, t: 'Mobile app', s: 'orders', c: 'src', k: 'chip' },
      { id: 'p3', x: 0, y: 280, w: 250, h: 80, t: 'DMS', s: 'database changes', c: 'src', k: 'chip' },
      { id: 'sh0', x: 350, y: 90, w: 320, h: 80, t: 'Shard 0', ss: ['hash keys 0 to a third'], c: 'ing' },
      { id: 'sh1', x: 350, y: 205, w: 320, h: 80, t: 'Shard 1', ss: ['the middle third'], c: 'ing' },
      { id: 'sh2', x: 350, y: 320, w: 320, h: 80, t: 'Shard 2', ss: ['the last third'], c: 'ing' },
      { id: 'lam', x: 770, y: 60, w: 320, h: 80, t: 'Lambda', s: 'small, fast reactions', c: 'con', k: 'chip' },
      { id: 'fh', x: 770, y: 175, w: 320, h: 80, t: 'Firehose', s: 'batches into S3', c: 'mart', k: 'chip' },
      { id: 'fl', x: 770, y: 290, w: 320, h: 80, t: 'Managed Flink', s: 'windows and joins', c: 'dbt', k: 'chip' },
      { id: 'key', x: 0, y: 440, w: 520, h: 56, t: 'MD5 of the partition key picks the shard', c: 'mon', k: 'chip' }
    ],
    edges: [
      { id: 'k1', a: 'p1', b: 'sh0', d: H(250, 80, 350, 130), n: 1, bx: 300, by: 88, pk: 1 },
      { id: 'k1b', a: 'p2', b: 'sh1', d: H(250, 200, 350, 245), n: 1, nb: true, pk: 1 },
      { id: 'k1c', a: 'p3', b: 'sh2', d: H(250, 320, 350, 360), n: 1, nb: true, pk: 1 },
      { id: 'k2', a: 'sh0', b: 'lam', d: H(670, 130, 770, 100), n: 2, bx: 720, by: 100, pk: 1 },
      { id: 'k2b', a: 'sh1', b: 'fh', d: H(670, 245, 770, 215), n: 2, nb: true, pk: 1 },
      { id: 'k2c', a: 'sh2', b: 'fl', d: H(670, 360, 770, 330), n: 2, nb: true, pk: 1 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 8. Events and queues                                                */
  /* ------------------------------------------------------------------ */
  S.events = {
    w: 1100, h: 520, label: 'An event-driven load: a new object in S3 raises an event, an EventBridge rule sends matching events to an SQS queue, a Lambda function reads the queue and starts a Glue job, and messages that keep failing move to a dead-letter queue that raises an alarm',
    nodes: [
      { id: 's3', x: 0, y: 40, w: 230, h: 100, t: 'S3 bucket', ss: ['object created'], c: 'raw' },
      { id: 'eb', x: 290, y: 40, w: 230, h: 100, t: 'EventBridge', ss: ['rule: prefix raw/orders/'], c: 'qual' },
      { id: 'q', x: 580, y: 40, w: 230, h: 100, t: 'SQS queue', ss: ['buffers the events'], c: 'ing' },
      { id: 'lam', x: 870, y: 40, w: 220, h: 100, t: 'Lambda', ss: ['reads a batch'], c: 'con' },
      { id: 'gj', x: 870, y: 230, w: 220, h: 100, t: 'Glue job', ss: ['loads the file'], c: 'dbt' },
      { id: 'dlq', x: 580, y: 230, w: 230, h: 100, t: 'Dead-letter queue', ss: ['after 5 failed tries'], c: 'int' },
      { id: 'al', x: 290, y: 230, w: 230, h: 100, t: 'CloudWatch alarm', ss: ['messages visible > 0'], c: 'mon' },
      { id: 'sn', x: 0, y: 230, w: 230, h: 100, t: 'SNS topic', ss: ['email or chat'], c: 'snap' },
      { id: 'idem', x: 290, y: 400, w: 520, h: 70, t: 'The same event can arrive twice, so the load must be safe to repeat', c: 'mon', k: 'chip' }
    ],
    edges: [
      { id: 'v1', a: 's3', b: 'eb', d: 'M230 90 H290', n: 1, bx: 260, by: 62, pk: 1 },
      { id: 'v2', a: 'eb', b: 'q', d: 'M520 90 H580', n: 2, bx: 550, by: 62, pk: 1 },
      { id: 'v3', a: 'q', b: 'lam', d: 'M810 90 H870', n: 3, bx: 840, by: 62, pk: 1 },
      { id: 'v4', a: 'lam', b: 'gj', d: 'M980 140 V230', n: 4, bx: 1008, by: 185, pk: 1 },
      { id: 'v5', a: 'q', b: 'dlq', d: 'M695 140 V230', n: 5, bx: 723, by: 185, pk: 1 },
      { id: 'v6', a: 'dlq', b: 'al', d: 'M580 280 H520', n: 6, bx: 550, by: 252, pk: 1 },
      { id: 'v7', a: 'al', b: 'sn', d: 'M290 280 H230', n: 7, bx: 260, by: 252, pk: 1 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 9. A Step Functions state machine as a graph of tasks               */
  /* ------------------------------------------------------------------ */
  S.sfn = {
    w: 1100, h: 360, label: 'The nightly pipeline as a state machine: run the Glue job and wait, check the row count with an Athena query, finish; any failure goes to a notification state and then to a failed end state',
    nodes: [
      { id: 'glue', k: 'dag', x: 0, y: 110, w: 230, h: 70, t: 'RunGlueJob', s: 'startJobRun.sync', c: 'dbt' },
      { id: 'chk', k: 'dag', x: 300, y: 110, w: 250, h: 70, t: 'CheckRowCount', s: 'Athena query', c: 'con' },
      { id: 'ok', k: 'dag', x: 620, y: 110, w: 190, h: 70, t: 'Succeed', s: 'end', c: 'mart' },
      { id: 'nt', k: 'dag', x: 150, y: 250, w: 250, h: 70, t: 'NotifyFailure', s: 'sns:publish', c: 'snap' },
      { id: 'fl', k: 'dag', x: 470, y: 250, w: 190, h: 70, t: 'Failed', s: 'Fail state', c: 'int' }
    ],
    edges: [
      { id: 'f1', a: 'glue', b: 'chk', d: 'M230 145 H300' },
      { id: 'f2', a: 'chk', b: 'ok', d: 'M550 145 H620' },
      { id: 'f3', a: 'glue', b: 'nt', d: H(115, 180, 220, 250) },
      { id: 'f4', a: 'chk', b: 'nt', d: H(425, 180, 330, 250) },
      { id: 'f5', a: 'nt', b: 'fl', d: 'M400 285 H470' }
    ],
    tags: [
      { id: 'tg_retry', x: 700, y: 250, t: 'Retry: 30 s, 60 s, 120 s, 240 s, 480 s', c: 'mon' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 10. A VPC and the paths to S3 and the internet                      */
  /* ------------------------------------------------------------------ */
  S.net = {
    w: 1100, h: 560, label: 'A VPC for data jobs: workers in a private subnet reach S3 through a free gateway endpoint, reach other AWS services through interface endpoints, and reach the internet only through a NAT gateway in a public subnet',
    groups: [
      { id: 'g_vpc', x: 0, y: 30, w: 700, h: 500, t: 'YOUR VPC', c: 'sf' }
    ],
    nodes: [
      { id: 'wk', x: 30, y: 100, w: 300, h: 150, t: 'Private subnet', ss: ['Glue, Lambda, EMR workers', 'no public IP address'], c: 'air' },
      { id: 'gw', x: 380, y: 90, w: 290, h: 70, t: 'S3 gateway endpoint', s: 'free, a route table entry', c: 'raw', k: 'chip' },
      { id: 'ie', x: 380, y: 185, w: 290, h: 70, t: 'Interface endpoints', s: 'Kinesis, STS, Secrets Manager', c: 'ing', k: 'chip' },
      { id: 'nat', x: 380, y: 340, w: 290, h: 90, t: 'NAT gateway', ss: ['in a public subnet', 'an hourly fee and a data fee'], c: 'mon' },
      { id: 'igw', x: 30, y: 400, w: 300, h: 70, t: 'Internet gateway', s: 'the VPC door', c: 'src', k: 'chip' },
      { id: 's3', x: 790, y: 90, w: 300, h: 70, t: 'Amazon S3', s: 'the lake', c: 'raw', k: 'chip' },
      { id: 'svc', x: 790, y: 185, w: 300, h: 70, t: 'AWS services', s: 'over PrivateLink', c: 'ing', k: 'chip' },
      { id: 'net', x: 790, y: 380, w: 300, h: 90, t: 'The internet', ss: ['package indexes', 'partner APIs'], c: 'src' }
    ],
    edges: [
      { id: 'n1', a: 'wk', b: 'gw', d: H(330, 140, 380, 125), n: 1, bx: 355, by: 118, pk: 1 },
      { id: 'n2', a: 'gw', b: 's3', d: 'M670 125 H790', n: 1, nb: true, pk: 1 },
      { id: 'n3', a: 'wk', b: 'ie', d: H(330, 200, 380, 220), n: 2, bx: 355, by: 195, pk: 1 },
      { id: 'n4', a: 'ie', b: 'svc', d: 'M670 220 H790', n: 2, nb: true, pk: 1 },
      { id: 'n5', a: 'wk', b: 'nat', d: H(330, 235, 380, 385), n: 3, bx: 352, by: 300, pk: 1 },
      { id: 'n6', a: 'nat', b: 'igw', d: 'M380 405 C280 410 280 430 330 435', n: 3, nb: true, pk: 1 },
      { id: 'n7', a: 'igw', b: 'net', d: 'M180 470 V520 H940 V470', n: 3, bx: 560, by: 520, pk: 1 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 11. Delivery: from a pull request to two accounts                   */
  /* ------------------------------------------------------------------ */
  S.cicd = {
    w: 1100, h: 420, label: 'Delivery to AWS: a pull request runs lint and tests, a merge assumes a deploy role in the dev account through a web identity token, creates a change set, and after approval does the same in the production account',
    nodes: [
      { id: 'git', k: 'dag', x: 0, y: 40, w: 190, h: 70, t: 'Pull request', s: 'in Git', c: 'src' },
      { id: 'ci', k: 'dag', x: 250, y: 40, w: 250, h: 70, t: 'Lint and tests', s: 'cfn-lint, pytest', c: 'qual' },
      { id: 'oidc', k: 'dag', x: 560, y: 40, w: 250, h: 70, t: 'Assume deploy role', s: 'web identity token', c: 'sf' },
      { id: 'dev', k: 'dag', x: 870, y: 40, w: 220, h: 70, t: 'Dev account', s: 'change set, deploy', c: 'stg' },
      { id: 'tst', k: 'dag', x: 870, y: 200, w: 220, h: 70, t: 'Smoke test', s: 'one small run', c: 'snap' },
      { id: 'apr', k: 'dag', x: 560, y: 200, w: 250, h: 70, t: 'Approval', s: 'a person says go', c: 'mon' },
      { id: 'prd', k: 'dag', x: 250, y: 200, w: 250, h: 70, t: 'Prod account', s: 'change set, deploy', c: 'mart' },
      { id: 'drf', k: 'dag', x: 0, y: 200, w: 190, h: 70, t: 'Drift check', s: 'nightly', c: 'con' }
    ],
    edges: [
      { id: 'd1', a: 'git', b: 'ci', d: 'M190 75 H250' },
      { id: 'd2', a: 'ci', b: 'oidc', d: 'M500 75 H560' },
      { id: 'd3', a: 'oidc', b: 'dev', d: 'M810 75 H870' },
      { id: 'd4', a: 'dev', b: 'tst', d: 'M980 110 V200' },
      { id: 'd5', a: 'tst', b: 'apr', d: 'M870 235 H810' },
      { id: 'd6', a: 'apr', b: 'prd', d: 'M560 235 H500' },
      { id: 'd7', a: 'prd', b: 'drf', d: 'M250 235 H190' }
    ]
  };
})();
