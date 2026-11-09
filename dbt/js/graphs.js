/* Diagram specs for the dbt tutorial. Plain data: nodes, edges, groups. graph.js draws them.
   The DAG node names are shortened to fit the page. Each DAG node carries `real`, the model name in the project,
   and the lint checks the edges against the manifest that dbt wrote (see js/real.js). */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var H = LAB.Graph.h, V = LAB.Graph.v;
  var S = (LAB.graphs = {});

  /* ------------------------------------------------------------------ */
  /* 1. The whole platform on one page                                   */
  /* ------------------------------------------------------------------ */
  S.master = {
    w: 1100, h: 640, label: 'Brewline with dbt: loaders fill RAW, dbt builds staging, intermediate and marts inside the warehouse, consumers read the marts, and tests, docs, orchestration and environments surround it',
    groups: [
      { id: 'g_ld', x: 10, y: 52, w: 250, h: 270, t: 'LOADERS', c: 'src' },
      { id: 'g_wh', x: 290, y: 52, w: 800, h: 290, t: 'WAREHOUSE', c: 'sf' },
      { id: 'g_dbt', x: 490, y: 100, w: 585, h: 228, t: 'DBT PROJECT', c: 'dbt' }
    ],
    nodes: [
      { id: 'ld_db', x: 22, y: 100, w: 226, h: 58, t: 'Orders database', s: 'Postgres', c: 'src', k: 'chip' },
      { id: 'ld_web', x: 22, y: 178, w: 226, h: 58, t: 'Web events', s: 'JSON from the site', c: 'src', k: 'chip' },
      { id: 'ld_csv', x: 22, y: 256, w: 226, h: 58, t: 'Supplier files', s: 'CSV', c: 'src', k: 'chip' },
      { id: 'raw', x: 310, y: 140, w: 150, h: 172, t: 'RAW', s: 'as loaded', c: 'raw', k: 'layer' },
      { id: 'stg', x: 510, y: 140, w: 150, h: 172, t: 'STAGING', s: 'clean, 1:1', c: 'stg', k: 'layer' },
      { id: 'int', x: 700, y: 140, w: 150, h: 172, t: 'INTERMEDIATE', s: 'join, reshape', c: 'int', k: 'layer' },
      { id: 'mart', x: 890, y: 140, w: 150, h: 172, t: 'MARTS', s: 'facts, dims', c: 'mart', k: 'layer' },
      { id: 'bi', x: 640, y: 392, w: 200, h: 58, t: 'BI dashboards', s: 'exposures', c: 'con', k: 'chip' },
      { id: 'ml', x: 870, y: 392, w: 200, h: 58, t: 'Notebooks + apps', s: 'read the marts', c: 'con', k: 'chip' },
      { id: 'c_test', x: 0, y: 520, w: 263, h: 52, t: 'TESTS', s: 'data and unit tests', c: 'qual', k: 'pill' },
      { id: 'c_docs', x: 279, y: 520, w: 263, h: 52, t: 'DOCS', s: 'lineage, contracts', c: 'mon', k: 'pill' },
      { id: 'c_orch', x: 558, y: 520, w: 263, h: 52, t: 'SCHEDULER', s: 'jobs, retries', c: 'air', k: 'pill' },
      { id: 'c_ci', x: 837, y: 520, w: 263, h: 52, t: 'ENVIRONMENTS', s: 'dev, CI, prod', c: 'ci', k: 'pill' }
    ],
    edges: [
      { id: 'e1a', a: 'ld_db', b: 'raw', d: H(248, 129, 310, 200), n: 1, nb: true },
      { id: 'e1b', a: 'ld_web', b: 'raw', d: H(248, 207, 310, 226), n: 1, bx: 280, by: 216 },
      { id: 'e1c', a: 'ld_csv', b: 'raw', d: H(248, 285, 310, 252), n: 1, nb: true },
      { id: 'e2', a: 'raw', b: 'stg', d: 'M460 226 H510', n: 2, bx: 485, by: 198 },
      { id: 'e3', a: 'stg', b: 'int', d: 'M660 226 H700', n: 3, bx: 680, by: 198 },
      { id: 'e4', a: 'int', b: 'mart', d: 'M850 226 H890', n: 4, bx: 870, by: 198 },
      { id: 'e5a', a: 'mart', b: 'bi', d: V(950, 312, 800, 392), n: 5, nb: true },
      { id: 'e5b', a: 'mart', b: 'ml', d: V(980, 312, 1000, 392), n: 5, bx: 990, by: 356 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 2. What happens when you run dbt build                              */
  /* ------------------------------------------------------------------ */
  S.lifecycle = {
    w: 1100, h: 450, label: 'The life of a dbt command: read the project, parse it into a manifest, build the DAG, compile Jinja to SQL, run the SQL in the warehouse, write artifacts',
    nodes: [
      { id: 'files', x: 0, y: 20, w: 300, h: 120, t: 'Your project', ss: ['models, YAML, macros', 'tests, seeds, snapshots'], c: 'src' },
      { id: 'parse', x: 400, y: 20, w: 300, h: 120, t: 'Parse', ss: ['read every file', 'find ref() and source()'], c: 'dbt' },
      { id: 'graph', x: 800, y: 20, w: 300, h: 120, t: 'Build the DAG', ss: ['who depends on whom', 'apply --select'], c: 'int' },
      { id: 'compile', x: 800, y: 290, w: 300, h: 120, t: 'Compile', ss: ['Jinja becomes SQL', 'ref() becomes a table'], c: 'stg' },
      { id: 'run', x: 400, y: 290, w: 300, h: 120, t: 'Run in the warehouse', ss: ['CREATE, INSERT, MERGE', 'in dependency order'], c: 'sf' },
      { id: 'art', x: 0, y: 290, w: 300, h: 120, t: 'Write artifacts', ss: ['manifest.json', 'run_results.json'], c: 'mon' }
    ],
    edges: [
      { id: 'l1', a: 'files', b: 'parse', d: 'M300 80 H400', n: 1, bx: 350, by: 52, pk: 1 },
      { id: 'l2', a: 'parse', b: 'graph', d: 'M700 80 H800', n: 2, bx: 750, by: 52, pk: 1 },
      { id: 'l3', a: 'graph', b: 'compile', d: 'M950 140 V290', n: 3, bx: 978, by: 215, pk: 1 },
      { id: 'l4', a: 'compile', b: 'run', d: 'M800 350 H700', n: 4, bx: 750, by: 322, pk: 1 },
      { id: 'l5', a: 'run', b: 'art', d: 'M400 350 H300', n: 5, bx: 350, by: 322, pk: 1 }
    ],
    tags: [
      { id: 'tg_cheap', x: 400, y: 160, t: 'no warehouse needed yet', c: 'dbt' },
      { id: 'tg_wh', x: 400, y: 430 - 12, t: 'the data never leaves the warehouse', c: 'sf' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 3. The Brewline DAG                                                 */
  /* ------------------------------------------------------------------ */
  S.dag = {
    w: 1100, h: 520, label: 'The Brewline project as a graph: four sources, four staging views, an intermediate view, a seed, a snapshot, three marts, a daily revenue table and the finance dashboard',
    nodes: [
      { id: 's_products', real: 'source:products', k: 'dag', x: 0, y: 10, w: 130, h: 66, t: 'products', s: 'source', c: 'src' },
      { id: 's_items', real: 'source:order_items', k: 'dag', x: 0, y: 105, w: 130, h: 66, t: 'order_items', s: 'source', c: 'src' },
      { id: 's_orders', real: 'source:orders', k: 'dag', x: 0, y: 200, w: 130, h: 66, t: 'orders', s: 'source', c: 'src' },
      { id: 's_customers', real: 'source:customers', k: 'dag', x: 0, y: 295, w: 130, h: 66, t: 'customers', s: 'source', c: 'src' },
      { id: 'stg_products', real: 'stg_brewline__products', k: 'dag', x: 170, y: 10, w: 190, h: 66, t: 'stg_products', s: 'view', c: 'stg' },
      { id: 'stg_items', real: 'stg_brewline__order_items', k: 'dag', x: 170, y: 105, w: 190, h: 66, t: 'stg_order_items', s: 'view', c: 'stg' },
      { id: 'stg_orders', real: 'stg_brewline__orders', k: 'dag', x: 170, y: 200, w: 190, h: 66, t: 'stg_orders', s: 'view', c: 'stg' },
      { id: 'stg_customers', real: 'stg_brewline__customers', k: 'dag', x: 170, y: 295, w: 190, h: 66, t: 'stg_customers', s: 'view', c: 'stg' },
      { id: 'int_orders', real: 'int_orders__with_items', k: 'dag', x: 410, y: 150, w: 190, h: 66, t: 'int_orders', s: 'view', c: 'int' },
      { id: 'seed_country', real: 'country_names', k: 'dag', x: 410, y: 340, w: 190, h: 66, t: 'country_names', s: 'seed', c: 'seed' },
      { id: 'snap_customers', real: 'snap_customers', k: 'dag', x: 410, y: 440, w: 190, h: 66, t: 'snap_customers', s: 'snapshot', c: 'snap' },
      { id: 'dim_products', real: 'dim_products', k: 'dag', x: 640, y: 10, w: 190, h: 66, t: 'dim_products', s: 'table, 2 versions', c: 'mart' },
      { id: 'fct_orders', real: 'fct_orders', k: 'dag', x: 640, y: 150, w: 190, h: 66, t: 'fct_orders', s: 'incremental', c: 'mart' },
      { id: 'dim_customers', real: 'dim_customers', k: 'dag', x: 640, y: 265, w: 190, h: 66, t: 'dim_customers', s: 'table', c: 'mart' },
      { id: 'fct_revenue', real: 'fct_daily_revenue', k: 'dag', x: 870, y: 150, w: 230, h: 66, t: 'fct_daily_revenue', s: 'table, public', c: 'mart' },
      { id: 'dash', real: 'finance_dashboard', k: 'dag', x: 870, y: 250, w: 230, h: 66, t: 'finance_dashboard', s: 'exposure', c: 'con' }
    ],
    edges: [
      { id: 'a1', a: 's_products', b: 'stg_products', d: 'M130 43 H170' },
      { id: 'a2', a: 's_items', b: 'stg_items', d: 'M130 138 H170' },
      { id: 'a3', a: 's_orders', b: 'stg_orders', d: 'M130 233 H170' },
      { id: 'a4', a: 's_customers', b: 'stg_customers', d: 'M130 328 H170' },
      { id: 'a5', a: 's_customers', b: 'snap_customers', d: 'M65 361 V473 H410' },
      { id: 'b1', a: 'stg_products', b: 'dim_products', d: 'M360 43 H640' },
      { id: 'b2', a: 'stg_items', b: 'int_orders', d: H(360, 138, 410, 183) },
      { id: 'b3', a: 'stg_orders', b: 'int_orders', d: H(360, 233, 410, 183) },
      { id: 'b4', a: 'stg_orders', b: 'dim_customers', d: H(360, 233, 640, 298) },
      { id: 'b5', a: 'stg_customers', b: 'dim_customers', d: H(360, 328, 640, 298) },
      { id: 'b6', a: 'seed_country', b: 'dim_customers', d: H(600, 373, 640, 298) },
      { id: 'c1', a: 'int_orders', b: 'fct_orders', d: 'M600 183 H640' },
      { id: 'c2', a: 'fct_orders', b: 'fct_revenue', d: 'M830 183 H870' },
      { id: 'c3', a: 'fct_revenue', b: 'dash', d: 'M985 216 V250' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 4. An incremental run                                               */
  /* ------------------------------------------------------------------ */
  S.incr = {
    w: 1100, h: 430, label: 'An incremental run: read only rows newer than the table, put them in a temporary table, delete the matching keys from the target, insert the new versions',
    nodes: [
      { id: 'up', x: 0, y: 20, w: 300, h: 120, t: 'int_orders', ss: ['all versions of all orders', 'a view over RAW'], c: 'int' },
      { id: 'filt', x: 400, y: 20, w: 300, h: 120, t: 'Filter', ss: ['loaded_at is newer than', 'max(loaded_at) in the table'], c: 'dbt' },
      { id: 'tmp', x: 800, y: 20, w: 300, h: 120, t: 'Temp table', ss: ['fct_orders__dbt_tmp', 'only the new versions'], c: 'stg' },
      { id: 'del', x: 800, y: 290, w: 300, h: 120, t: 'Delete', ss: ['rows whose order_id', 'is in the temp table'], c: 'qual' },
      { id: 'ins', x: 400, y: 290, w: 300, h: 120, t: 'Insert', ss: ['the rows from', 'the temp table'], c: 'ing' },
      { id: 'tgt', x: 0, y: 290, w: 300, h: 120, t: 'fct_orders', ss: ['one row per order', 'latest version'], c: 'mart' }
    ],
    edges: [
      { id: 'i1', a: 'up', b: 'filt', d: 'M300 80 H400', n: 1, bx: 350, by: 52, pk: 1 },
      { id: 'i2', a: 'filt', b: 'tmp', d: 'M700 80 H800', n: 2, bx: 750, by: 52, pk: 1 },
      { id: 'i3', a: 'tmp', b: 'del', d: 'M950 140 V290', n: 3, bx: 978, by: 215, pk: 1 },
      { id: 'i4', a: 'del', b: 'ins', d: 'M800 350 H700', n: 4, bx: 750, by: 322, pk: 1 },
      { id: 'i5', a: 'ins', b: 'tgt', d: 'M400 350 H300', n: 5, bx: 350, by: 322, pk: 1 }
    ],
    tags: [
      { id: 'tg_first', x: 0, y: 160, t: 'first run: no filter, CREATE TABLE AS', c: 'dbt' },
      { id: 'tg_skip', x: 400, y: 160, t: 'unchanged orders are never read', c: 'mart' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 5. A snapshot (SCD type 2)                                          */
  /* ------------------------------------------------------------------ */
  S.scd2 = {
    w: 1100, h: 430, label: 'A snapshot: dbt compares the source rows with the current snapshot rows, closes the old version of a changed customer and inserts a new version',
    nodes: [
      { id: 'src', x: 0, y: 20, w: 300, h: 120, t: 'raw.customers', ss: ['the source overwrites', 'a row when it changes'], c: 'src' },
      { id: 'cmp', x: 400, y: 20, w: 300, h: 120, t: 'dbt snapshot', ss: ['compare tier and country', 'with the open rows'], c: 'dbt' },
      { id: 'same', x: 800, y: 20, w: 300, h: 120, t: 'No change', ss: ['nothing is written', 'for that customer'], c: 'seed' },
      { id: 'close', x: 400, y: 290, w: 300, h: 120, t: 'Close the old row', ss: ['set dbt_valid_to to', 'the time of this run'], c: 'qual' },
      { id: 'open', x: 800, y: 290, w: 300, h: 120, t: 'Insert the new row', ss: ['dbt_valid_from is now', 'dbt_valid_to is empty'], c: 'ing' },
      { id: 'snap', x: 0, y: 290, w: 300, h: 120, t: 'snap_customers', ss: ['one row per version', 'history is kept'], c: 'snap' }
    ],
    edges: [
      { id: 'd1', a: 'src', b: 'cmp', d: 'M300 80 H400', n: 1, bx: 350, by: 52, pk: 1 },
      { id: 'd2', a: 'cmp', b: 'same', d: 'M700 80 H800', n: 2, bx: 750, by: 52, pk: 1 },
      { id: 'd3', a: 'cmp', b: 'close', d: 'M550 140 V290', n: 3, bx: 578, by: 215, pk: 1 },
      { id: 'd4', a: 'cmp', b: 'open', d: 'M650 140 V200 Q650 212 662 212 H938 Q950 212 950 224 V290', n: 3, bx: 800, by: 212, pk: 1 },
      { id: 'd5', a: 'close', b: 'snap', d: 'M400 350 H300', n: 4, bx: 350, by: 322, pk: 1 }
    ],
    tags: [
      { id: 'tg_run', x: 400, y: 160, t: 'only changed customers move on', c: 'dbt' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 6. Slim CI                                                          */
  /* ------------------------------------------------------------------ */
  S.ci = {
    w: 1100, h: 470, label: 'Slim CI: a pull request builds only the changed models and their children in its own schema, reads everything else from production, then the merge triggers the production job',
    nodes: [
      { id: 'pr', x: 0, y: 20, w: 240, h: 110, t: 'Pull request', ss: ['one model changed', 'Jira ticket linked'], c: 'src' },
      { id: 'state', x: 290, y: 20, w: 240, h: 110, t: 'Prod manifest', ss: ['saved by the last', 'production run'], c: 'mon' },
      { id: 'sel', x: 580, y: 10, w: 270, h: 130, t: 'Select', ss: ['state:modified+', 'changed models', 'and their children'], c: 'dbt' },
      { id: 'bld', x: 900, y: 20, w: 200, h: 110, t: 'Build', ss: ['into pr_123', 'with --defer'], c: 'stg' },
      { id: 'prod', x: 580, y: 300, w: 270, h: 110, t: 'Production', ss: ['analytics schemas', 'read, never written'], c: 'mart' },
      { id: 'chk', x: 290, y: 300, w: 240, h: 110, t: 'Status check', ss: ['tests pass or fail', 'the pull request'], c: 'qual' },
      { id: 'mrg', x: 0, y: 300, w: 240, h: 110, t: 'Merge + deploy', ss: ['production job runs', 'PR schema dropped'], c: 'ci' }
    ],
    edges: [
      { id: 'k1', a: 'pr', b: 'state', d: 'M240 75 H290', n: 1, bx: 265, by: 47, pk: 1 },
      { id: 'k2', a: 'state', b: 'sel', d: 'M530 75 H580', n: 2, bx: 555, by: 47, pk: 1 },
      { id: 'k3', a: 'sel', b: 'bld', d: 'M850 75 H900', n: 3, bx: 875, by: 47, pk: 1 },
      { id: 'k4', a: 'prod', b: 'bld', d: 'M850 355 H1000 V130', n: 4, bx: 1000, by: 250, pk: 1 },
      { id: 'k5', a: 'bld', b: 'chk', d: 'M940 130 V215 Q940 227 928 227 H402 Q390 227 390 239 V300', n: 5, bx: 660, by: 227 },
      { id: 'k6', a: 'chk', b: 'mrg', d: 'M290 355 H240', n: 6, bx: 265, by: 327, pk: 1 }
    ],
    tags: [
      { id: 'tg_defer', x: 590, y: 425, t: 'deferred refs point at production', c: 'mart' }
    ]
  };
})();
