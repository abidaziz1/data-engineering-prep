/* Diagram specs for the Azure tutorial. Plain data: nodes, edges, groups, tags. shared/js/graph.js draws them. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var H = LAB.Graph.h, V = LAB.Graph.v;
  var S = (LAB.graphs = {});

  /* ------------------------------------------------------------------ */
  /* 1. The Brewline platform on one page                                */
  /* ------------------------------------------------------------------ */
  S.master = {
    w: 1100, h: 640, label: 'The Brewline data platform on Azure: sources send data to an ADLS Gen2 lake with raw, clean and curated zones, Data Factory moves data between the zones, Synapse and Power BI read the curated tables, and Entra ID, Key Vault and private networking, monitoring and cost, events and functions, and Bicep surround it',
    groups: [
      { id: 'g_src', x: 10, y: 52, w: 250, h: 270, t: 'SOURCES', c: 'src' },
      { id: 'g_lake', x: 290, y: 52, w: 800, h: 290, t: 'YOUR ADLS GEN2 LAKE', c: 'sf' }
    ],
    nodes: [
      { id: 'ld_db', x: 22, y: 100, w: 226, h: 58, t: 'Orders database', s: 'Azure SQL', c: 'src', k: 'chip' },
      { id: 'ld_web', x: 22, y: 178, w: 226, h: 58, t: 'Website events', s: 'Event Hubs', c: 'src', k: 'chip' },
      { id: 'ld_csv', x: 22, y: 256, w: 226, h: 58, t: 'Supplier files', s: 'CSV over SFTP', c: 'src', k: 'chip' },
      { id: 'raw', x: 310, y: 140, w: 210, h: 172, t: 'RAW', s: 'files as received', c: 'raw', k: 'layer' },
      { id: 'clean', x: 570, y: 140, w: 210, h: 172, t: 'CLEAN', s: 'Parquet, typed', c: 'stg', k: 'layer' },
      { id: 'cur', x: 830, y: 140, w: 230, h: 172, t: 'CURATED', s: 'business tables', c: 'mart', k: 'layer' },
      { id: 'adf', x: 310, y: 392, w: 250, h: 58, t: 'Data Factory', s: 'copies and orders', c: 'dbt', k: 'chip' },
      { id: 'syn', x: 590, y: 392, w: 220, h: 58, t: 'Synapse', s: 'SQL and Spark', c: 'con', k: 'chip' },
      { id: 'pbi', x: 840, y: 392, w: 220, h: 58, t: 'Power BI', s: 'dashboards', c: 'con', k: 'chip' },
      { id: 'c_iam', x: 0, y: 520, w: 208, h: 52, t: 'Entra ID', s: 'who may do what', c: 'qual', k: 'pill' },
      { id: 'c_sec', x: 223, y: 520, w: 208, h: 52, t: 'Key Vault', s: 'keys, private paths', c: 'sf', k: 'pill' },
      { id: 'c_ops', x: 446, y: 520, w: 208, h: 52, t: 'Monitor', s: 'alerts, budgets', c: 'mon', k: 'pill' },
      { id: 'c_flow', x: 669, y: 520, w: 208, h: 52, t: 'Event Grid', s: 'reacts to files', c: 'snap', k: 'pill' },
      { id: 'c_iac', x: 892, y: 520, w: 208, h: 52, t: 'Bicep', s: 'builds all of it', c: 'ci', k: 'pill' }
    ],
    edges: [
      { id: 'e1a', a: 'ld_db', b: 'raw', d: H(248, 129, 310, 200), n: 1, nb: true },
      { id: 'e1b', a: 'ld_web', b: 'raw', d: H(248, 207, 310, 226), n: 1, bx: 280, by: 216 },
      { id: 'e1c', a: 'ld_csv', b: 'raw', d: H(248, 285, 310, 252), n: 1, nb: true },
      { id: 'e2', a: 'raw', b: 'clean', d: 'M520 226 H570', n: 3, bx: 545, by: 198 },
      { id: 'e3', a: 'clean', b: 'cur', d: 'M780 226 H830', n: 4, bx: 805, by: 198 },
      { id: 'e5a', a: 'cur', b: 'syn', d: V(900, 312, 700, 392), n: 5, nb: true },
      { id: 'e5b', a: 'cur', b: 'pbi', d: V(980, 312, 950, 392), n: 5, bx: 965, by: 356 },
      { id: 'e6', a: 'adf', b: 'clean', d: V(435, 392, 675, 312), n: 2, bx: 520, by: 362 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 2. Tenant, management groups, subscriptions, resource groups        */
  /* ------------------------------------------------------------------ */
  S.tenant = {
    w: 1100, h: 580, label: 'The Azure hierarchy: one Entra tenant, a root management group with child management groups, subscriptions below them, resource groups in a subscription, and resources in a resource group. Role assignments and Azure Policy set at one level apply to everything below it',
    nodes: [
      { id: 'tn', x: 380, y: 10, w: 340, h: 62, t: 'Entra tenant', ss: ['brewline.onmicrosoft.com'], c: 'qual' },
      { id: 'mg', x: 380, y: 108, w: 340, h: 62, t: 'Root management group', ss: ['mg-brewline'], c: 'sf' },
      { id: 'mgp', x: 90, y: 206, w: 310, h: 62, t: 'mg-platform', ss: ['shared services'], c: 'sf' },
      { id: 'mgl', x: 600, y: 206, w: 310, h: 62, t: 'mg-landingzones', ss: ['the workloads'], c: 'sf' },
      { id: 'sl', x: 90, y: 304, w: 310, h: 62, t: 'sub-brewline-platform', ss: ['logs and monitoring'], c: 'mon' },
      { id: 'sp', x: 480, y: 304, w: 270, h: 62, t: 'sub-brewline-prod', ss: ['production data'], c: 'mart' },
      { id: 'sd', x: 790, y: 304, w: 290, h: 62, t: 'sub-brewline-dev', ss: ['development'], c: 'stg' },
      { id: 'rg', x: 440, y: 402, w: 350, h: 62, t: 'rg-brewline-data-prod', ss: ['a resource group'], c: 'raw' },
      { id: 'rs', x: 440, y: 500, w: 350, h: 62, t: 'stbrewlinelakeprod', ss: ['a storage account'], c: 'ing' }
    ],
    edges: [
      { id: 't1', a: 'tn', b: 'mg', d: 'M550 72 V108', n: 1, bx: 578, by: 90, pk: 1 },
      { id: 't2a', a: 'mg', b: 'mgp', d: V(480, 170, 245, 206), n: 2, nb: true, pk: 1 },
      { id: 't2b', a: 'mg', b: 'mgl', d: V(620, 170, 755, 206), n: 2, bx: 700, by: 188, pk: 1 },
      { id: 't3a', a: 'mgp', b: 'sl', d: 'M245 268 V304', n: 3, nb: true, pk: 1 },
      { id: 't3b', a: 'mgl', b: 'sp', d: V(700, 268, 615, 304), n: 3, nb: true, pk: 1 },
      { id: 't3c', a: 'mgl', b: 'sd', d: V(810, 268, 935, 304), n: 3, bx: 880, by: 286, pk: 1 },
      { id: 't4', a: 'sp', b: 'rg', d: V(615, 366, 615, 402), n: 4, bx: 645, by: 384, pk: 1 },
      { id: 't5', a: 'rg', b: 'rs', d: 'M615 464 V500', n: 5, bx: 645, by: 482, pk: 1 }
    ],
    tags: [
      { id: 'tg_down', x: 12, y: 440, t: 'roles and policy flow downward', c: 'qual' },
      { id: 'tg_bill', x: 12, y: 484, t: 'the bill belongs to a subscription', c: 'mon' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 3. A storage account: writers, containers, events and lifecycle     */
  /* ------------------------------------------------------------------ */
  S.storage = {
    w: 1100, h: 580, label: 'One storage account: loaders write blobs into containers, a BlobCreated event goes through Event Grid to a function, a queue or a pipeline, and a lifecycle rule moves old blobs from Hot to Cool, Cold and Archive and finally deletes them',
    groups: [
      { id: 'g_sa', x: 330, y: 40, w: 400, h: 270, t: 'STORAGE ACCOUNT stbrewlinelakeprod', c: 'raw' }
    ],
    nodes: [
      { id: 'w1', x: 0, y: 60, w: 250, h: 70, t: 'Data Factory', s: 'copy writes raw', c: 'dbt', k: 'chip' },
      { id: 'w2', x: 0, y: 160, w: 250, h: 70, t: 'Event Hubs Capture', s: 'writes Avro files', c: 'ing', k: 'chip' },
      { id: 'w3', x: 0, y: 260, w: 250, h: 60, t: 'AzCopy', s: 'a person or a script', c: 'src', k: 'chip' },
      { id: 'pr', x: 350, y: 100, w: 360, h: 80, t: 'container raw', ss: ['orders/dt=2026-03-14/ and more'], c: 'stg' },
      { id: 'pc', x: 350, y: 205, w: 360, h: 80, t: 'container curated', ss: ['Parquet tables'], c: 'mart' },
      { id: 'nt', x: 800, y: 60, w: 290, h: 90, t: 'Event Grid', ss: ['BlobCreated, BlobDeleted'], c: 'snap' },
      { id: 'sb', x: 800, y: 175, w: 290, h: 70, t: 'Event subscription', s: 'a filter on the path', c: 'qual', k: 'chip' },
      { id: 'tg', x: 800, y: 265, w: 290, h: 70, t: 'Function, queue, pipeline', s: 'the handlers', c: 'con', k: 'chip' },
      { id: 'cl1', x: 10, y: 450, w: 190, h: 90, t: 'Hot', ss: ['first 30 days'], c: 'mart' },
      { id: 'cl2', x: 230, y: 450, w: 190, h: 90, t: 'Cool', ss: ['after 30 days'], c: 'stg' },
      { id: 'cl3', x: 450, y: 450, w: 190, h: 90, t: 'Cold', ss: ['after 90 days'], c: 'ing' },
      { id: 'cl4', x: 670, y: 450, w: 190, h: 90, t: 'Archive', ss: ['after 180 days'], c: 'int' },
      { id: 'cl5', x: 890, y: 450, w: 200, h: 90, t: 'Deleted', ss: ['after 365 days'], c: 'src' }
    ],
    edges: [
      { id: 's1', a: 'w1', b: 'pr', d: H(250, 95, 350, 140), n: 1, bx: 300, by: 112, pk: 1 },
      { id: 's1b', a: 'w2', b: 'pr', d: H(250, 195, 350, 160), n: 1, nb: true, pk: 1 },
      { id: 's1c', a: 'w3', b: 'pc', d: H(250, 290, 350, 245), n: 1, nb: true, pk: 1 },
      { id: 's2', a: 'pr', b: 'nt', d: H(710, 130, 800, 105), n: 2, bx: 755, by: 102, pk: 1 },
      { id: 's3', a: 'nt', b: 'sb', d: 'M945 150 V175', n: 3, bx: 975, by: 162, pk: 1 },
      { id: 's4', a: 'sb', b: 'tg', d: 'M945 245 V265', n: 3, nb: true, pk: 1 },
      { id: 'l1', a: 'cl1', b: 'cl2', d: 'M200 495 H230', n: 4, bx: 215, by: 467, pk: 1 },
      { id: 'l2', a: 'cl2', b: 'cl3', d: 'M420 495 H450', n: 4, bx: 435, by: 467, pk: 1 },
      { id: 'l3', a: 'cl3', b: 'cl4', d: 'M640 495 H670', n: 4, bx: 655, by: 467, pk: 1 },
      { id: 'l4', a: 'cl4', b: 'cl5', d: 'M860 495 H890', n: 4, bx: 875, by: 467, pk: 1 }
    ],
    tags: [
      { id: 'tg_life', x: 330, y: 385, t: 'a lifecycle rule moves blobs by age', c: 'mon' },
      { id: 'tg_rep', x: 330, y: 335, t: 'LRS, ZRS, GRS: copies kept for you', c: 'sf' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 4. How a data request to storage is decided                         */
  /* ------------------------------------------------------------------ */
  S.access = {
    w: 1100, h: 470, label: 'How Azure decides a data request to storage: the network rules first, then who is calling. A SAS or an account key is allowed by the token itself. An Entra token goes to the role assignments: a role that grants the data action allows the call, and only when no role grants does the ACL check run. With no allow the answer is deny',
    nodes: [
      { id: 'rq', x: 0, y: 30, w: 240, h: 120, t: 'The request', ss: ['a signed-in app reads', 'one blob from a network'], c: 'src' },
      { id: 'nw', x: 285, y: 30, w: 240, h: 120, t: 'Network rules', ss: ['firewall, private link', 'blocked: stop, deny'], c: 'sf' },
      { id: 'au', x: 570, y: 30, w: 240, h: 120, t: 'Who is calling?', ss: ['Entra token, SAS or key', 'a bad token: deny'], c: 'qual' },
      { id: 'rb', x: 855, y: 30, w: 240, h: 120, t: 'Role assignment', ss: ['a data role at any scope', 'a grant allows at once'], c: 'mon' },
      { id: 'ab', x: 855, y: 260, w: 240, h: 120, t: 'Role condition', ss: ['optional ABAC rule', 'on tags or path'], c: 'snap' },
      { id: 'ac', x: 570, y: 260, w: 240, h: 120, t: 'ACL check', ss: ['execute on each folder', 'read or write on target'], c: 'stg' },
      { id: 'ok', x: 285, y: 260, w: 240, h: 120, t: 'Allow', ss: ['the call runs'], c: 'mart' },
      { id: 'no', x: 0, y: 260, w: 240, h: 120, t: 'Deny', ss: ['403, and a code that', 'names the reason'], c: 'int' }
    ],
    edges: [
      { id: 'i1', a: 'rq', b: 'nw', d: 'M240 90 H285', n: 1, bx: 262, by: 62, pk: 1 },
      { id: 'i2', a: 'nw', b: 'au', d: 'M525 90 H570', n: 2, bx: 547, by: 62, pk: 1 },
      { id: 'i3', a: 'au', b: 'rb', d: 'M810 90 H855', n: 3, bx: 832, by: 62, pk: 1 },
      { id: 'i4', a: 'rb', b: 'ab', d: 'M975 150 V260', n: 4, bx: 1003, by: 205, pk: 1 },
      { id: 'i5', a: 'ab', b: 'ac', d: 'M855 320 H810', n: 5, bx: 832, by: 292, pk: 1 },
      { id: 'i6', a: 'ac', b: 'ok', d: 'M570 320 H525', n: 6, bx: 547, by: 292, pk: 1 },
      { id: 'i7', a: 'ac', b: 'no', d: 'M690 380 V430 H120 V380', n: 7, bx: 405, by: 430, pk: 1 }
    ],
    tags: [
      { id: 'tg_sas', x: 450, y: 172, t: 'a SAS or a key skips roles and ACLs', c: 'qual' },
      { id: 'tg_acl', x: 720, y: 396, t: 'ACLs run only if no role grants', c: 'mon' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 5. A managed identity asks for a token                              */
  /* ------------------------------------------------------------------ */
  S.identity = {
    w: 1100, h: 480, label: 'A managed identity at work: the code calls DefaultAzureCredential, the SDK asks the identity endpoint of the host, the endpoint asks Microsoft Entra ID, a signed token comes back, the code sends it to the storage account, and the account checks the role assignments',
    nodes: [
      { id: 'app', x: 0, y: 70, w: 270, h: 150, t: 'Your code', ss: ['DefaultAzureCredential', 'no password in code'], c: 'dbt' },
      { id: 'ep', x: 370, y: 30, w: 270, h: 110, t: 'Identity endpoint', ss: ['local to the host', 'a Metadata header'], c: 'sf' },
      { id: 'aad', x: 780, y: 30, w: 310, h: 110, t: 'Microsoft Entra ID', ss: ['knows the identity', 'signs the token'], c: 'qual' },
      { id: 'st', x: 0, y: 320, w: 270, h: 120, t: 'Storage account', ss: ['checks the token', 'then the role'], c: 'raw' },
      { id: 'rb', x: 370, y: 320, w: 270, h: 120, t: 'Role assignment', ss: ['Storage Blob Data', 'Reader on a container'], c: 'mon' },
      { id: 'ok', x: 780, y: 320, w: 310, h: 120, t: 'Allow', ss: ['the blob is returned'], c: 'mart' }
    ],
    edges: [
      { id: 'm1', a: 'app', b: 'ep', d: H(270, 110, 370, 70), n: 1, bx: 322, by: 76, pk: 1 },
      { id: 'm2', a: 'ep', b: 'aad', d: 'M640 70 H780', n: 2, bx: 710, by: 42, pk: 1 },
      { id: 'm3', a: 'aad', b: 'ep', d: 'M780 112 H640', n: 3, bx: 710, by: 140, pk: 1 },
      { id: 'm4', a: 'ep', b: 'app', d: H(370, 112, 270, 170), n: 4, bx: 322, by: 156, pk: 1 },
      { id: 'm5', a: 'app', b: 'st', d: 'M135 220 V320', n: 5, bx: 163, by: 270, pk: 1 },
      { id: 'm6', a: 'st', b: 'rb', d: 'M270 380 H370', n: 6, bx: 320, by: 352, pk: 1 },
      { id: 'm7', a: 'rb', b: 'ok', d: 'M640 380 H780', n: 7, bx: 710, by: 352, pk: 1 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 6. Data Factory: trigger, pipeline, activities, runtime, services   */
  /* ------------------------------------------------------------------ */
  S.adf = {
    w: 1100, h: 560, label: 'Data Factory: a trigger starts a pipeline run, the pipeline runs its activities in order, and the copy activity uses an integration runtime to read from the source linked service and write to the sink linked service',
    groups: [
      { id: 'g_pl', x: 280, y: 30, w: 580, h: 170, t: 'PIPELINE pl_orders_daily', c: 'dbt' }
    ],
    nodes: [
      { id: 'tr', x: 0, y: 60, w: 230, h: 100, t: 'Trigger', ss: ['schedule, event', 'or tumbling window'], c: 'snap' },
      { id: 'a1', x: 300, y: 90, w: 160, h: 80, t: 'Lookup', s: 'old watermark', c: 'dbt', k: 'chip' },
      { id: 'a2', x: 490, y: 90, w: 160, h: 80, t: 'Copy', s: 'SQL to Parquet', c: 'dbt', k: 'chip' },
      { id: 'a3', x: 680, y: 90, w: 160, h: 80, t: 'Procedure', s: 'new watermark', c: 'dbt', k: 'chip' },
      { id: 'mn', x: 890, y: 60, w: 200, h: 100, t: 'Monitor', ss: ['each run and activity', 'is logged'], c: 'mon' },
      { id: 'sr', x: 0, y: 400, w: 280, h: 110, t: 'Azure SQL', ss: ['linked service ls_sql', 'the source'], c: 'src' },
      { id: 'ir', x: 410, y: 280, w: 280, h: 110, t: 'Integration runtime', ss: ['the compute that copies', 'Azure or self-hosted'], c: 'air' },
      { id: 'dk', x: 810, y: 400, w: 280, h: 110, t: 'ADLS Gen2 raw', ss: ['linked service ls_lake', 'the sink'], c: 'raw' }
    ],
    edges: [
      { id: 'd1', a: 'tr', b: 'a1', d: H(230, 110, 300, 130), n: 1, bx: 265, by: 112, pk: 1 },
      { id: 'd2', a: 'a1', b: 'a2', d: 'M460 130 H490', n: 2, bx: 475, by: 102, pk: 1 },
      { id: 'd3', a: 'a2', b: 'ir', d: V(570, 170, 550, 280), n: 3, bx: 520, by: 228, pk: 1 },
      { id: 'd4', a: 'sr', b: 'ir', d: H(280, 455, 410, 360), n: 4, bx: 345, by: 400, pk: 1 },
      { id: 'd5', a: 'ir', b: 'dk', d: H(690, 360, 810, 455), n: 5, bx: 755, by: 400, pk: 1 },
      { id: 'd6', a: 'a2', b: 'a3', d: 'M650 130 H680', n: 6, bx: 665, by: 102, pk: 1 },
      { id: 'd7', a: 'a3', b: 'mn', d: 'M840 130 H890', n: 7, bx: 865, by: 102, pk: 1 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 7. A metadata-driven pipeline, as a graph of activities             */
  /* ------------------------------------------------------------------ */
  S.adfdag = {
    w: 1100, h: 400, label: 'A metadata-driven pipeline: look up the list of tables, run a ForEach that copies each table and moves its watermark, and send any failure to a notification and a Fail activity',
    nodes: [
      { id: 'lk', k: 'dag', x: 0, y: 110, w: 230, h: 70, t: 'LookupTables', s: 'config table', c: 'dbt' },
      { id: 'fe', k: 'dag', x: 300, y: 110, w: 250, h: 70, t: 'ForEachTable', s: '4 at a time', c: 'air' },
      { id: 'cp', k: 'dag', x: 620, y: 110, w: 210, h: 70, t: 'CopyTable', s: 'source to raw', c: 'ing' },
      { id: 'wm', k: 'dag', x: 880, y: 110, w: 210, h: 70, t: 'SetWatermark', s: 'procedure', c: 'mart' },
      { id: 'nt', k: 'dag', x: 300, y: 250, w: 250, h: 70, t: 'NotifyFailure', s: 'web activity', c: 'snap' },
      { id: 'fl', k: 'dag', x: 620, y: 250, w: 210, h: 70, t: 'FailRun', s: 'Fail activity', c: 'int' }
    ],
    edges: [
      { id: 'f1', a: 'lk', b: 'fe', d: 'M230 145 H300' },
      { id: 'f2', a: 'fe', b: 'cp', d: 'M550 145 H620' },
      { id: 'f3', a: 'cp', b: 'wm', d: 'M830 145 H880' },
      { id: 'f4', a: 'cp', b: 'nt', d: H(725, 180, 550, 285) },
      { id: 'f5', a: 'nt', b: 'fl', d: 'M550 285 H620' }
    ],
    tags: [
      { id: 'tg_retry', x: 620, y: 345, t: 'retry 2 times, 60 s apart', c: 'mon' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 8. A Synapse workspace                                              */
  /* ------------------------------------------------------------------ */
  S.synapse = {
    w: 1100, h: 520, label: 'A Synapse workspace: clients query the serverless SQL pool, which reads files in the lake and bills for data processed, or the dedicated SQL pool, which holds data in 60 distributions and bills for DWUs while it runs. A Spark pool reads and writes the same lake. COPY INTO loads files into the dedicated pool',
    groups: [
      { id: 'g_ws', x: 330, y: 30, w: 460, h: 440, t: 'SYNAPSE WORKSPACE syn-brewline-prod', c: 'con' }
    ],
    nodes: [
      { id: 'cl', x: 0, y: 150, w: 270, h: 120, t: 'Power BI, SSMS, apps', ss: ['connect with T-SQL', 'as an Entra identity'], c: 'src' },
      { id: 'sv', x: 350, y: 80, w: 420, h: 100, t: 'Serverless SQL pool', ss: ['T-SQL on files, no cluster', 'pay for data processed'], c: 'mart' },
      { id: 'dd', x: 350, y: 205, w: 420, h: 100, t: 'Dedicated SQL pool', ss: ['60 distributions, sized in DWUs', 'pay while it runs'], c: 'dbt' },
      { id: 'sp', x: 350, y: 330, w: 420, h: 100, t: 'Spark pool', ss: ['notebooks and jobs', 'pay while the nodes run'], c: 'air' },
      { id: 'lk', x: 850, y: 150, w: 240, h: 150, t: 'ADLS Gen2 lake', ss: ['raw, clean, curated', 'the data lives here'], c: 'raw' }
    ],
    edges: [
      { id: 'y1', a: 'cl', b: 'sv', d: H(270, 190, 350, 130), n: 1, bx: 310, by: 148, pk: 1 },
      { id: 'y1b', a: 'cl', b: 'dd', d: H(270, 230, 350, 255), n: 1, nb: true, pk: 1 },
      { id: 'y2', a: 'lk', b: 'sv', d: H(850, 190, 770, 130), n: 2, bx: 810, by: 148, pk: 1 },
      { id: 'y3', a: 'lk', b: 'dd', d: H(850, 235, 770, 255), n: 3, bx: 810, by: 222, pk: 1 },
      { id: 'y4', a: 'sp', b: 'lk', d: H(770, 380, 850, 270), n: 4, bx: 810, by: 340, pk: 1 }
    ],
    tags: [
      { id: 'tg_fab', x: 12, y: 330, t: 'investment moves to Fabric', c: 'ci' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 9. A dedicated SQL pool: control node, compute nodes, distributions */
  /* ------------------------------------------------------------------ */
  S.dedicated = {
    w: 1100, h: 560, label: 'A dedicated SQL pool: the control node parses and plans a query, the compute nodes run the steps on the 60 distributions of storage, and data movement shuffles rows between nodes when the join keys do not line up',
    groups: [
      { id: 'g_cn', x: 360, y: 150, w: 400, h: 250, t: 'COMPUTE NODES', c: 'air' }
    ],
    nodes: [
      { id: 'cli', x: 0, y: 60, w: 270, h: 100, t: 'Your SQL', ss: ['one T-SQL query'], c: 'src' },
      { id: 'ct', x: 380, y: 40, w: 360, h: 80, t: 'Control node', ss: ['parses, plans, coordinates'], c: 'dbt' },
      { id: 'n1', x: 380, y: 190, w: 110, h: 180, t: 'Node 1', ss: ['a share'], c: 'air' },
      { id: 'n2', x: 505, y: 190, w: 110, h: 180, t: 'Node 2', ss: ['a share'], c: 'air' },
      { id: 'n3', x: 630, y: 190, w: 110, h: 180, t: 'Node 3', ss: ['a share'], c: 'air' },
      { id: 'st', x: 380, y: 440, w: 360, h: 90, t: '60 distributions', ss: ['stored in Azure Storage'], c: 'raw' },
      { id: 'dm', x: 820, y: 180, w: 270, h: 110, t: 'Data movement', ss: ['shuffle or broadcast', 'rows between nodes'], c: 'mon' },
      { id: 'cp', x: 820, y: 340, w: 270, h: 90, t: 'COPY INTO', ss: ['loads files in parallel'], c: 'ing' }
    ],
    edges: [
      { id: 'z1', a: 'cli', b: 'ct', d: H(270, 110, 380, 80), n: 1, bx: 325, by: 78, pk: 1 },
      { id: 'z2', a: 'ct', b: 'n2', d: 'M560 120 V190', n: 2, bx: 588, by: 156, pk: 1 },
      { id: 'z3', a: 'n2', b: 'st', d: 'M560 370 V440', n: 3, bx: 588, by: 405, pk: 1 },
      { id: 'z4', a: 'n3', b: 'dm', d: H(740, 235, 820, 235), n: 4, bx: 780, by: 205, pk: 1 },
      { id: 'z5', a: 'cp', b: 'n3', d: H(820, 385, 740, 330), n: 5, bx: 780, by: 350, pk: 1 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 10. Event Hubs: partitions, consumer groups, capture, checkpoints   */
  /* ------------------------------------------------------------------ */
  S.eventhubs = {
    w: 1100, h: 560, label: 'An event hub with 4 partitions: producers send events with a partition key, the key picks the partition, each consumer group reads every partition in order, Capture writes Avro files to the lake, and each reader saves a checkpoint in a storage account',
    groups: [
      { id: 'g_eh', x: 330, y: 30, w: 360, h: 420, t: 'EVENT HUB orders, 4 PARTITIONS', c: 'ing' }
    ],
    nodes: [
      { id: 'p1', x: 0, y: 60, w: 250, h: 80, t: 'Website', s: 'click events', c: 'src', k: 'chip' },
      { id: 'p2', x: 0, y: 175, w: 250, h: 80, t: 'Mobile app', s: 'orders', c: 'src', k: 'chip' },
      { id: 'p3', x: 0, y: 290, w: 250, h: 80, t: 'Orders database', s: 'change events', c: 'src', k: 'chip' },
      { id: 'sh0', x: 350, y: 75, w: 320, h: 80, t: 'Partition 0', ss: ['events in order'], c: 'ing' },
      { id: 'sh1', x: 350, y: 170, w: 320, h: 80, t: 'Partition 1', ss: ['events in order'], c: 'ing' },
      { id: 'sh2', x: 350, y: 265, w: 320, h: 80, t: 'Partition 2', ss: ['events in order'], c: 'ing' },
      { id: 'sh3', x: 350, y: 360, w: 320, h: 80, t: 'Partition 3', ss: ['events in order'], c: 'ing' },
      { id: 'c1', x: 770, y: 60, w: 280, h: 80, t: 'Function', s: 'reacts to batches', c: 'con', k: 'chip' },
      { id: 'c2', x: 770, y: 175, w: 280, h: 80, t: 'Stream Analytics', s: 'windows and joins', c: 'dbt', k: 'chip' },
      { id: 'c3', x: 770, y: 290, w: 280, h: 80, t: 'Capture', s: 'Avro files in the lake', c: 'mart', k: 'chip' },
      { id: 'ck', x: 770, y: 400, w: 280, h: 80, t: 'Checkpoint store', s: 'blobs in a storage account', c: 'raw', k: 'chip' },
      { id: 'key', x: 0, y: 474, w: 560, h: 56, t: 'the partition key keeps related events together', c: 'mon', k: 'chip' }
    ],
    edges: [
      { id: 'k1', a: 'p1', b: 'sh0', d: H(250, 100, 350, 115), n: 1, bx: 300, by: 88, pk: 1 },
      { id: 'k1b', a: 'p2', b: 'sh1', d: H(250, 215, 350, 210), n: 1, nb: true, pk: 1 },
      { id: 'k1c', a: 'p3', b: 'sh3', d: H(250, 330, 350, 400), n: 1, nb: true, pk: 1 },
      { id: 'k2', a: 'sh0', b: 'c1', d: 'M690 100 H770', n: 2, bx: 730, by: 78, pk: 1 },
      { id: 'k2b', a: 'sh1', b: 'c2', d: 'M690 215 H770', n: 2, nb: true, pk: 1 },
      { id: 'k2c', a: 'sh2', b: 'c3', d: 'M690 330 H770', n: 2, nb: true, pk: 1 },
      { id: 'k3', a: 'c1', b: 'ck', d: 'M1050 100 C1098 100 1098 440 1050 440', n: 3, bx: 1081, by: 270, pk: 1 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 11. Events and queues                                               */
  /* ------------------------------------------------------------------ */
  S.events = {
    w: 1100, h: 520, label: 'An event-driven load: a new blob raises an Event Grid event, a subscription sends matching events to a storage queue, a function reads the queue and starts a Data Factory pipeline, and messages that keep failing move to a poison queue that raises an alert',
    nodes: [
      { id: 'sa', x: 0, y: 40, w: 230, h: 100, t: 'Storage account', ss: ['blob created'], c: 'raw' },
      { id: 'eg', x: 290, y: 40, w: 230, h: 100, t: 'Event Grid', ss: ['filter: raw/orders/'], c: 'qual' },
      { id: 'q', x: 580, y: 40, w: 230, h: 100, t: 'Storage queue', ss: ['buffers the events'], c: 'ing' },
      { id: 'fn', x: 870, y: 40, w: 220, h: 100, t: 'Function', ss: ['reads a batch'], c: 'con' },
      { id: 'pl', x: 870, y: 230, w: 220, h: 100, t: 'Data Factory', ss: ['starts a pipeline'], c: 'dbt' },
      { id: 'pq', x: 580, y: 230, w: 230, h: 100, t: 'Poison queue', ss: ['after 5 failed tries'], c: 'int' },
      { id: 'al', x: 290, y: 230, w: 230, h: 100, t: 'Monitor alert', ss: ['messages > 0'], c: 'mon' },
      { id: 'ag', x: 0, y: 230, w: 230, h: 100, t: 'Action group', ss: ['email or Teams'], c: 'snap' },
      { id: 'idem', x: 160, y: 400, w: 800, h: 70, t: 'The same event can arrive twice, so the load must be safe to repeat', c: 'mon', k: 'chip' }
    ],
    edges: [
      { id: 'v1', a: 'sa', b: 'eg', d: 'M230 90 H290', n: 1, bx: 260, by: 62, pk: 1 },
      { id: 'v2', a: 'eg', b: 'q', d: 'M520 90 H580', n: 2, bx: 550, by: 62, pk: 1 },
      { id: 'v3', a: 'q', b: 'fn', d: 'M810 90 H870', n: 3, bx: 840, by: 62, pk: 1 },
      { id: 'v4', a: 'fn', b: 'pl', d: 'M980 140 V230', n: 4, bx: 1008, by: 185, pk: 1 },
      { id: 'v5', a: 'q', b: 'pq', d: 'M695 140 V230', n: 5, bx: 723, by: 185, pk: 1 },
      { id: 'v6', a: 'pq', b: 'al', d: 'M580 280 H520', n: 6, bx: 550, by: 252, pk: 1 },
      { id: 'v7', a: 'al', b: 'ag', d: 'M290 280 H230', n: 7, bx: 260, by: 252, pk: 1 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 12. Private networking                                              */
  /* ------------------------------------------------------------------ */
  S.net = {
    w: 1100, h: 560, label: 'Private networking for data jobs: workers in a subnet reach the lake and the Key Vault through private endpoints with private DNS names, public access on both is switched off, and the internet is reached only through a firewall',
    groups: [
      { id: 'g_vn', x: 0, y: 30, w: 700, h: 500, t: 'YOUR VIRTUAL NETWORK', c: 'sf' }
    ],
    nodes: [
      { id: 'wk', x: 30, y: 100, w: 300, h: 150, t: 'Compute subnet', ss: ['Functions, Spark, ADF runtime', 'no public IP address'], c: 'air' },
      { id: 'p1', x: 380, y: 90, w: 290, h: 70, t: 'Private endpoint: dfs', s: 'a private IP for the lake', c: 'raw', k: 'chip' },
      { id: 'p2', x: 380, y: 185, w: 290, h: 70, t: 'Private endpoint: vault', s: 'a private IP for secrets', c: 'ing', k: 'chip' },
      { id: 'dn', x: 380, y: 280, w: 290, h: 70, t: 'Private DNS zone', s: 'privatelink names', c: 'snap', k: 'chip' },
      { id: 'fw', x: 380, y: 405, w: 290, h: 110, t: 'Azure Firewall', ss: ['allows named hosts', 'logs the rest'], c: 'mon' },
      { id: 'sa', x: 790, y: 90, w: 300, h: 70, t: 'Storage account', s: 'public access off', c: 'raw', k: 'chip' },
      { id: 'kv', x: 790, y: 185, w: 300, h: 70, t: 'Key Vault', s: 'public access off', c: 'ing', k: 'chip' },
      { id: 'in', x: 790, y: 405, w: 300, h: 110, t: 'The internet', ss: ['package indexes', 'partner APIs'], c: 'src' }
    ],
    edges: [
      { id: 'n1', a: 'wk', b: 'p1', d: H(330, 140, 380, 125), n: 1, bx: 355, by: 118, pk: 1 },
      { id: 'n2', a: 'p1', b: 'sa', d: 'M670 125 H790', n: 1, nb: true, pk: 1 },
      { id: 'n3', a: 'wk', b: 'p2', d: H(330, 200, 380, 220), n: 2, bx: 355, by: 195, pk: 1 },
      { id: 'n4', a: 'p2', b: 'kv', d: 'M670 220 H790', n: 2, nb: true, pk: 1 },
      { id: 'n5', a: 'wk', b: 'dn', d: H(330, 235, 380, 315), n: 3, bx: 352, by: 265, pk: 1 },
      { id: 'n6', a: 'wk', b: 'fw', d: H(180, 250, 380, 460), n: 4, bx: 270, by: 380, pk: 1 },
      { id: 'n7', a: 'fw', b: 'in', d: 'M670 460 H790', n: 4, nb: true, pk: 1 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 13. Delivery: from a pull request to two subscriptions              */
  /* ------------------------------------------------------------------ */
  S.cicd = {
    w: 1100, h: 320, label: 'Delivery to Azure: a pull request runs lint, what-if and tests, a merge signs in to Entra with a federated credential and no stored secret, deploys to the development subscription, and after approval does the same in production',
    nodes: [
      { id: 'git', k: 'dag', x: 0, y: 40, w: 190, h: 70, t: 'Pull request', s: 'in GitHub', c: 'src' },
      { id: 'ci', k: 'dag', x: 250, y: 40, w: 250, h: 70, t: 'Lint, scan, what-if', s: 'bicep, checkov', c: 'qual' },
      { id: 'oidc', k: 'dag', x: 560, y: 40, w: 250, h: 70, t: 'Sign in to Entra', s: 'federated, no secret', c: 'sf' },
      { id: 'dev', k: 'dag', x: 870, y: 40, w: 220, h: 70, t: 'Dev subscription', s: 'deploy', c: 'stg' },
      { id: 'tst', k: 'dag', x: 870, y: 200, w: 220, h: 70, t: 'Smoke test', s: 'one small run', c: 'snap' },
      { id: 'apr', k: 'dag', x: 560, y: 200, w: 250, h: 70, t: 'Approval', s: 'a person says go', c: 'mon' },
      { id: 'prd', k: 'dag', x: 250, y: 200, w: 250, h: 70, t: 'Prod subscription', s: 'deploy', c: 'mart' },
      { id: 'drf', k: 'dag', x: 0, y: 200, w: 190, h: 70, t: 'Drift check', s: 'nightly what-if', c: 'con' }
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

  /* ------------------------------------------------------------------ */
  /* 14. A lakehouse: bronze, silver and gold, Spark, and a catalog       */
  /* ------------------------------------------------------------------ */
  S.lakehouse = {
    w: 1100, h: 560, label: 'A lakehouse on Azure: sources land files in the bronze zone of the lake, Spark reads one zone and writes the next as Delta tables, first silver and then gold, SQL and Power BI read the gold tables, and a catalog names every table and controls who may read it',
    groups: [
      { id: 'g_lake', x: 195, y: 15, w: 680, h: 235, t: 'ADLS GEN2 LAKE  stbrewlinelakeprod', c: 'raw' }
    ],
    nodes: [
      { id: 'src', x: 0, y: 90, w: 150, h: 110, t: 'Sources', ss: ['Data Factory', 'Event Hubs'], c: 'src' },
      { id: 'br', x: 215, y: 70, w: 190, h: 150, t: 'Bronze', ss: ['files as they arrived', 'CSV, JSON, Avro'], c: 'raw' },
      { id: 'sv', x: 435, y: 70, w: 190, h: 150, t: 'Silver', ss: ['clean and typed', 'Delta tables'], c: 'int' },
      { id: 'gd', x: 655, y: 70, w: 190, h: 150, t: 'Gold', ss: ['tables for questions', 'Delta tables'], c: 'mart' },
      { id: 'bi', x: 915, y: 90, w: 175, h: 110, t: 'SQL, Power BI', ss: ['read the gold tables'], c: 'con' },
      { id: 'sp', x: 215, y: 320, w: 630, h: 110, t: 'Spark', ss: ['Databricks, Synapse Spark or Fabric', 'reads one zone, writes the next'], c: 'air' },
      { id: 'ct', x: 215, y: 480, w: 875, h: 64, t: 'Catalog', s: 'names, owners, access and lineage for every table', c: 'qual', k: 'chip' }
    ],
    edges: [
      { id: 'l1', a: 'src', b: 'br', d: 'M150 145 H215', n: 1, bx: 183, by: 117, pk: 1 },
      { id: 'l2', a: 'br', b: 'sp', d: 'M300 220 V320', n: 2, bx: 330, by: 270, pk: 1 },
      { id: 'l3', a: 'sp', b: 'sv', d: 'M500 320 V220', n: 3, bx: 530, by: 270, pk: 1 },
      { id: 'l4', a: 'sv', b: 'sp', d: 'M565 220 V320', n: 4, bx: 595, by: 270, pk: 1 },
      { id: 'l4b', a: 'sp', b: 'gd', d: 'M760 320 V220', n: 4, nb: true, pk: 1 },
      { id: 'l5', a: 'gd', b: 'bi', d: 'M845 145 H915', n: 5, bx: 880, by: 117, pk: 1 },
      { id: 'l6', a: 'sp', b: 'ct', d: 'M530 430 V480', n: 6, bx: 560, by: 455, pk: 1 }
    ],
    tags: [
      { id: 'tg_run', x: 872, y: 336, t: 'paid while it runs', c: 'mon' },
      { id: 'tg_log', x: 872, y: 380, t: 'a log in each table', c: 'snap' }
    ]
  };
})();
