/* Diagram specs for the Snowflake and dbt tutorial. Plain data: nodes, edges, groups, tags. shared/js/graph.js draws them.
   The names of the dag nodes are the names of the Brewline models, shortened to fit the page. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var H = LAB.Graph.h, V = LAB.Graph.v;
  var S = (LAB.graphs = {});

  /* ------------------------------------------------------------------ */
  /* 1. The whole platform on one page                                   */
  /* ------------------------------------------------------------------ */
  S.master = {
    w: 1100, h: 640, label: 'Brewline on Snowflake with dbt: loaders fill RAW, dbt sends SQL to a virtual warehouse that builds staging, intermediate and marts, consumers read the marts, and roles, cost control, security, recovery and environments surround it',
    groups: [
      { id: 'g_ld', x: 10, y: 52, w: 250, h: 270, t: 'LOADERS', c: 'src' },
      { id: 'g_sf', x: 290, y: 52, w: 800, h: 290, t: 'SNOWFLAKE ACCOUNT', c: 'sf' },
      { id: 'g_wh', x: 490, y: 100, w: 585, h: 228, t: 'WAREHOUSE', c: 'air' }
    ],
    nodes: [
      { id: 'ld_db', x: 22, y: 100, w: 226, h: 58, t: 'Orders database', s: 'Postgres', c: 'src', k: 'chip' },
      { id: 'ld_web', x: 22, y: 178, w: 226, h: 58, t: 'Web events', s: 'JSON from the site', c: 'src', k: 'chip' },
      { id: 'ld_csv', x: 22, y: 256, w: 226, h: 58, t: 'Supplier files', s: 'CSV', c: 'src', k: 'chip' },
      { id: 'raw', x: 310, y: 140, w: 150, h: 172, t: 'RAW', s: 'BREWLINE.RAW', c: 'raw', k: 'layer' },
      { id: 'stg', x: 510, y: 140, w: 150, h: 172, t: 'STAGING', s: 'views', c: 'stg', k: 'layer' },
      { id: 'int', x: 700, y: 140, w: 150, h: 172, t: 'INTERMEDIATE', s: 'views', c: 'int', k: 'layer' },
      { id: 'mart', x: 890, y: 140, w: 150, h: 172, t: 'MARTS', s: 'tables', c: 'mart', k: 'layer' },
      { id: 'dbt', x: 310, y: 392, w: 250, h: 58, t: 'dbt', s: 'writes the SQL, holds no data', c: 'dbt', k: 'chip' },
      { id: 'bi', x: 640, y: 392, w: 200, h: 58, t: 'BI dashboards', s: 'read the marts', c: 'con', k: 'chip' },
      { id: 'sh', x: 870, y: 392, w: 200, h: 58, t: 'Secure shares', s: 'partners, other accounts', c: 'con', k: 'chip' },
      { id: 'c_roles', x: 0, y: 520, w: 208, h: 52, t: 'ROLES + GRANTS', s: 'who may do what', c: 'sf', k: 'pill' },
      { id: 'c_cost', x: 223, y: 520, w: 208, h: 52, t: 'COST', s: 'warehouse size, credits', c: 'air', k: 'pill' },
      { id: 'c_sec', x: 446, y: 520, w: 208, h: 52, t: 'SECURITY', s: 'keys, masking', c: 'qual', k: 'pill' },
      { id: 'c_rec', x: 669, y: 520, w: 208, h: 52, t: 'RECOVERY', s: 'time travel, clones', c: 'snap', k: 'pill' },
      { id: 'c_ci', x: 892, y: 520, w: 208, h: 52, t: 'ENVIRONMENTS', s: 'dev, CI, prod', c: 'ci', k: 'pill' }
    ],
    edges: [
      { id: 'e1a', a: 'ld_db', b: 'raw', d: H(248, 129, 310, 200), n: 1, nb: true },
      { id: 'e1b', a: 'ld_web', b: 'raw', d: H(248, 207, 310, 226), n: 1, bx: 280, by: 216 },
      { id: 'e1c', a: 'ld_csv', b: 'raw', d: H(248, 285, 310, 252), n: 1, nb: true },
      { id: 'e2', a: 'raw', b: 'stg', d: 'M460 226 H510', n: 3, bx: 485, by: 198 },
      { id: 'e3', a: 'stg', b: 'int', d: 'M660 226 H700', n: 4, bx: 680, by: 198 },
      { id: 'e4', a: 'int', b: 'mart', d: 'M850 226 H890', n: 5, bx: 870, by: 198 },
      { id: 'e5a', a: 'mart', b: 'bi', d: V(950, 312, 800, 392), n: 6, nb: true },
      { id: 'e5b', a: 'mart', b: 'sh', d: V(980, 312, 1000, 392), n: 6, bx: 990, by: 356 },
      { id: 'e6', a: 'dbt', b: 'g_wh', d: V(435, 392, 560, 328), n: 2, bx: 480, by: 362 }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 2. What dbt does when you run it                                    */
  /* ------------------------------------------------------------------ */
  S.session = {
    w: 1100, h: 450, label: 'A dbt run against Snowflake: read the profile, sign in, look at what exists, generate the SQL, run the statements in the warehouse, leave a trail in the query history',
    nodes: [
      { id: 'prof', x: 0, y: 20, w: 300, h: 120, t: 'Profile', ss: ['profiles.yml', 'target: dev, ci or prod'], c: 'src' },
      { id: 'conn', x: 400, y: 20, w: 300, h: 120, t: 'Sign in', ss: ['key pair, one user', 'one session per thread'], c: 'sf' },
      { id: 'look', x: 800, y: 20, w: 300, h: 120, t: 'Look around', ss: ['show schemas, show objects', 'what exists already'], c: 'mon' },
      { id: 'gen', x: 800, y: 290, w: 300, h: 120, t: 'Generate the SQL', ss: ['compile the Jinja', 'wrap it in create or merge'], c: 'dbt' },
      { id: 'exec', x: 400, y: 290, w: 300, h: 120, t: 'Run in the warehouse', ss: ['statements in graph order', 'up to the thread count at once'], c: 'air' },
      { id: 'trail', x: 0, y: 290, w: 300, h: 120, t: 'Leave a trail', ss: ['query comment on each statement', 'run_results.json'], c: 'qual' }
    ],
    edges: [
      { id: 's1', a: 'prof', b: 'conn', d: 'M300 80 H400', n: 1, bx: 350, by: 52, pk: 1 },
      { id: 's2', a: 'conn', b: 'look', d: 'M700 80 H800', n: 2, bx: 750, by: 52, pk: 1 },
      { id: 's3', a: 'look', b: 'gen', d: 'M950 140 V290', n: 3, bx: 978, by: 215, pk: 1 },
      { id: 's4', a: 'gen', b: 'exec', d: 'M800 350 H700', n: 4, bx: 750, by: 322, pk: 1 },
      { id: 's5', a: 'exec', b: 'trail', d: 'M400 350 H300', n: 5, bx: 350, by: 322, pk: 1 }
    ],
    tags: [
      { id: 'tg_meta', x: 800, y: 160, t: 'metadata calls need no running warehouse', c: 'mon' },
      { id: 'tg_bill', x: 400, y: 430 - 12, t: 'credits are used here, while a statement runs', c: 'air' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 3. The Brewline project as a graph (the same project as the dbt course) */
  /* ------------------------------------------------------------------ */
  S.dag = {
    w: 1100, h: 520, label: 'The Brewline project as a graph: four sources, four staging views, an intermediate view, a seed, a snapshot, three marts, a daily revenue table and the finance dashboard',
    nodes: [
      { id: 's_products', k: 'dag', x: 0, y: 10, w: 130, h: 66, t: 'products', s: 'source', c: 'src' },
      { id: 's_items', k: 'dag', x: 0, y: 105, w: 130, h: 66, t: 'order_items', s: 'source', c: 'src' },
      { id: 's_orders', k: 'dag', x: 0, y: 200, w: 130, h: 66, t: 'orders', s: 'source', c: 'src' },
      { id: 's_customers', k: 'dag', x: 0, y: 295, w: 130, h: 66, t: 'customers', s: 'source', c: 'src' },
      { id: 'stg_products', k: 'dag', x: 170, y: 10, w: 190, h: 66, t: 'stg_products', s: 'view', c: 'stg' },
      { id: 'stg_items', k: 'dag', x: 170, y: 105, w: 190, h: 66, t: 'stg_order_items', s: 'view', c: 'stg' },
      { id: 'stg_orders', k: 'dag', x: 170, y: 200, w: 190, h: 66, t: 'stg_orders', s: 'view', c: 'stg' },
      { id: 'stg_customers', k: 'dag', x: 170, y: 295, w: 190, h: 66, t: 'stg_customers', s: 'view', c: 'stg' },
      { id: 'int_orders', k: 'dag', x: 410, y: 150, w: 190, h: 66, t: 'int_orders', s: 'view', c: 'int' },
      { id: 'seed_country', k: 'dag', x: 410, y: 340, w: 190, h: 66, t: 'country_names', s: 'seed', c: 'seed' },
      { id: 'snap_customers', k: 'dag', x: 410, y: 440, w: 190, h: 66, t: 'snap_customers', s: 'snapshot', c: 'snap' },
      { id: 'dim_products', k: 'dag', x: 640, y: 10, w: 190, h: 66, t: 'dim_products', s: 'table, 2 versions', c: 'mart' },
      { id: 'fct_orders', k: 'dag', x: 640, y: 150, w: 190, h: 66, t: 'fct_orders', s: 'incremental', c: 'mart' },
      { id: 'dim_customers', k: 'dag', x: 640, y: 265, w: 190, h: 66, t: 'dim_customers', s: 'table', c: 'mart' },
      { id: 'fct_revenue', k: 'dag', x: 870, y: 150, w: 230, h: 66, t: 'fct_daily_revenue', s: 'table, public', c: 'mart' },
      { id: 'dash', k: 'dag', x: 870, y: 250, w: 230, h: 66, t: 'finance_dashboard', s: 'exposure', c: 'con' }
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
  /* 4. An incremental run on Snowflake                                  */
  /* ------------------------------------------------------------------ */
  S.incr = {
    w: 1100, h: 430, label: 'An incremental merge on Snowflake: read only rows newer than the table, put them in a temporary view, merge them into the table on the key, drop the temporary view',
    nodes: [
      { id: 'up', x: 0, y: 20, w: 300, h: 120, t: 'int_orders', ss: ['all versions of all orders', 'a view over RAW'], c: 'int' },
      { id: 'filt', x: 400, y: 20, w: 300, h: 120, t: 'Filter', ss: ['loaded_at is newer than', 'max(loaded_at) in the table'], c: 'dbt' },
      { id: 'tmp', x: 800, y: 20, w: 300, h: 120, t: 'Temporary view', ss: ['fct_orders__dbt_tmp', 'only the new versions'], c: 'stg' },
      { id: 'mrg', x: 800, y: 290, w: 300, h: 120, t: 'MERGE', ss: ['on order_id', 'update the match, insert the rest'], c: 'air' },
      { id: 'drp', x: 400, y: 290, w: 300, h: 120, t: 'Drop the temporary view', ss: ['drop view if exists', 'fct_orders__dbt_tmp'], c: 'qual' },
      { id: 'tgt', x: 0, y: 290, w: 300, h: 120, t: 'fct_orders', ss: ['a transient table', 'one row per order'], c: 'mart' }
    ],
    edges: [
      { id: 'i1', a: 'up', b: 'filt', d: 'M300 80 H400', n: 1, bx: 350, by: 52, pk: 1 },
      { id: 'i2', a: 'filt', b: 'tmp', d: 'M700 80 H800', n: 2, bx: 750, by: 52, pk: 1 },
      { id: 'i3', a: 'tmp', b: 'mrg', d: 'M950 140 V290', n: 3, bx: 978, by: 215, pk: 1 },
      { id: 'i4', a: 'mrg', b: 'drp', d: 'M800 350 H700', n: 4, bx: 750, by: 322, pk: 1 },
      { id: 'i5', a: 'drp', b: 'tgt', d: 'M400 350 H300', n: 5, bx: 350, by: 322, pk: 1 }
    ],
    tags: [
      { id: 'tg_first', x: 0, y: 160, t: 'first run: no filter, create or replace transient table', c: 'dbt' },
      { id: 'tg_skip', x: 400, y: 160, t: 'unchanged orders are never read', c: 'mart' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 5. Three environments in one account                                */
  /* ------------------------------------------------------------------ */
  S.envs = {
    w: 1100, h: 470, label: 'Three environments in one Snowflake account: a developer schema, a schema per pull request, and production. All three read the same RAW tables. CI gets copies of production tables by zero-copy clone',
    nodes: [
      { id: 'dev', x: 0, y: 20, w: 330, h: 150, t: 'DEV', ss: ['BREWLINE_DEV.DEV_ALICE', 'role TRANSFORMER', 'warehouse WH_TRANSFORM_DEV'], c: 'stg' },
      { id: 'ci', x: 385, y: 20, w: 330, h: 150, t: 'CI', ss: ['BREWLINE_CI.PR_123', 'role CI_DEPLOYER', 'warehouse WH_CI'], c: 'ci' },
      { id: 'prod', x: 770, y: 20, w: 330, h: 150, t: 'PROD', ss: ['BREWLINE.STAGING, MARTS', 'role TRANSFORMER', 'warehouse WH_TRANSFORM'], c: 'mart' },
      { id: 'raw', x: 0, y: 330, w: 1100, h: 90, t: 'BREWLINE.RAW', s: 'loaded by the pipeline. Every environment reads it. No environment writes to it.', c: 'raw', k: 'bar' }
    ],
    edges: [
      { id: 'v1', a: 'raw', b: 'dev', d: 'M165 330 V170', n: 1, bx: 195, by: 250, pk: 1 },
      { id: 'v2', a: 'raw', b: 'ci', d: 'M550 330 V170', n: 1, bx: 580, by: 250, pk: 1 },
      { id: 'v3', a: 'raw', b: 'prod', d: 'M935 330 V170', n: 1, bx: 965, by: 250, pk: 1 },
      { id: 'v4', a: 'prod', b: 'ci', d: 'M770 95 H715', n: 2, bx: 742, by: 67, pk: 1 }
    ],
    tags: [
      { id: 'tg_clone', x: 560, y: 190, t: 'dbt clone: no data is copied', c: 'snap' },
      { id: 'tg_own', x: 0, y: 190, t: 'a developer owns a schema, not production', c: 'stg' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 6. Roles                                                            */
  /* ------------------------------------------------------------------ */
  S.roles = {
    w: 1100, h: 470, label: 'Roles for the Brewline pipeline: the service user for dbt holds the TRANSFORMER role, which owns the schemas dbt builds in. REPORTER and ANALYST roles read the marts. A masking policy hides the email column from roles that should not see it',
    nodes: [
      { id: 'u_dbt', x: 0, y: 0, w: 250, h: 120, t: 'DBT_SERVICE', ss: ['a service user', 'signs in with a key pair'], c: 'dbt' },
      { id: 'u_bi', x: 0, y: 175, w: 250, h: 120, t: 'BI_SERVICE', ss: ['the dashboard tool', 'signs in with a key pair'], c: 'con' },
      { id: 'u_ana', x: 0, y: 350, w: 250, h: 120, t: 'Alice, an analyst', ss: ['a person', 'single sign-on'], c: 'src' },
      { id: 'r_tr', x: 400, y: 0, w: 250, h: 120, t: 'TRANSFORMER', ss: ['owns STAGING, MARTS', 'reads RAW'], c: 'sf' },
      { id: 'r_rep', x: 400, y: 175, w: 250, h: 120, t: 'REPORTER', ss: ['select on MARTS', 'no access to RAW'], c: 'sf' },
      { id: 'r_ana', x: 400, y: 350, w: 250, h: 120, t: 'ANALYST', ss: ['select on MARTS', 'sees masked email'], c: 'sf' },
      { id: 'o_raw', x: 800, y: 0, w: 300, h: 120, t: 'BREWLINE.RAW', ss: ['select only', 'the pipeline owns it'], c: 'raw' },
      { id: 'o_mart', x: 800, y: 175, w: 300, h: 120, t: 'BREWLINE.MARTS', ss: ['dbt builds here', 'others select'], c: 'mart' },
      { id: 'o_pii', x: 800, y: 350, w: 300, h: 120, t: 'email column', ss: ['masking policy', 'full value for PII_READER only'], c: 'qual' }
    ],
    edges: [
      { id: 'q1', a: 'u_dbt', b: 'r_tr', d: 'M250 60 H400', n: 1, bx: 325, by: 32, pk: 1 },
      { id: 'q2', a: 'u_bi', b: 'r_rep', d: 'M250 235 H400', n: 1, bx: 325, by: 207, pk: 1 },
      { id: 'q3', a: 'u_ana', b: 'r_ana', d: 'M250 410 H400', n: 1, bx: 325, by: 382, pk: 1 },
      { id: 'q4', a: 'r_tr', b: 'o_raw', d: 'M650 60 H800', n: 2, bx: 725, by: 32, pk: 1 },
      { id: 'q5', a: 'r_tr', b: 'o_mart', d: H(650, 90, 800, 215), n: 3, bx: 725, by: 152, pk: 1 },
      { id: 'q6', a: 'r_rep', b: 'o_mart', d: 'M650 235 H800', n: 4, bx: 725, by: 207, pk: 1 },
      { id: 'q7', a: 'r_ana', b: 'o_mart', d: H(650, 380, 800, 255), n: 4, bx: 725, by: 318, pk: 1 },
      { id: 'q8', a: 'r_ana', b: 'o_pii', d: 'M650 410 H800', n: 5, bx: 725, by: 440, pk: 1 }
    ]
  };
})();
