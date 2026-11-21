/* Diagram specs for the ELT project walkthrough. Plain data: nodes, edges, tags. shared/js/graph.js draws them. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var S = (LAB.graphs = {});

  /* 1. The platform */
  S.platform = {
    w: 1000, h: 400,
    label: 'The shop API is read by dlt into the raw schema of DuckDB. dbt builds staging views and marts from it and runs its tests. A quality gate compares the warehouse with the shop, and only then are the marts published as Parquet. Airflow runs the four steps in order, once for each day.',
    nodes: [
      { id: 'shop', x: 0, y: 150, w: 150, h: 90, t: 'Shop API', s: 'orders, stores', c: 'src' },
      { id: 'dlt', x: 185, y: 150, w: 130, h: 90, t: 'dlt', s: 'incremental', c: 'stg' },
      { id: 'raw', x: 350, y: 150, w: 140, h: 90, t: 'raw', s: 'DuckDB tables', c: 'raw' },
      { id: 'dbt', x: 530, y: 150, w: 140, h: 90, t: 'dbt', s: 'models, tests', c: 'ing' },
      { id: 'gate', x: 710, y: 150, w: 120, h: 90, t: 'Gate', s: 'vs the shop', c: 'mon' },
      { id: 'pub', x: 870, y: 150, w: 130, h: 90, t: 'Parquet', s: 'published', c: 'mart' },
      { id: 'air', x: 185, y: 310, w: 530, h: 70, t: 'Airflow: brewline_daily', s: 'load, build, gate, publish, one run for each day', c: 'mon' }
    ],
    edges: [
      { id: 'e1', a: 'shop', b: 'dlt', d: 'M150 195 H185', n: 1, nb: true },
      { id: 'e2', a: 'dlt', b: 'raw', d: 'M315 195 H350', n: 2, nb: true },
      { id: 'e3', a: 'raw', b: 'dbt', d: 'M490 195 H530', n: 3, nb: true },
      { id: 'e4', a: 'dbt', b: 'gate', d: 'M670 195 H710', n: 4, nb: true },
      { id: 'e5', a: 'gate', b: 'pub', d: 'M830 195 H870', n: 5, nb: true }
    ],
    tags: [
      { id: 'tg_merge', x: 120, y: 70, t: 'merge on id, a lookback of one hour', c: 'stg' },
      { id: 'tg_tests', x: 520, y: 70, t: '14 tests stop what depends on them', c: 'ing' }
    ]
  };

  /* 2. A failing test fails closed */
  S.failclosed = {
    w: 1000, h: 400,
    label: 'On day 3 an order has a product that has no price. The load succeeds, so the raw table has the new orders. The dbt test on the prices fails, so dbt skips the models that depend on it. The gate and the publish step do not run, and the readers keep seeing day 2.',
    nodes: [
      { id: 'raw', x: 0, y: 150, w: 170, h: 90, t: 'raw.orders', s: 'day 3 is in', c: 'raw' },
      { id: 'test', x: 230, y: 150, w: 200, h: 90, t: 'dbt test', s: 'every SKU has a price', c: 'ing' },
      { id: 'marts', x: 490, y: 150, w: 190, h: 90, t: 'marts', s: 'skipped: 7 things', c: 'stg' },
      { id: 'pub', x: 740, y: 150, w: 170, h: 90, t: 'published', s: 'still day 2', c: 'mart' },
      { id: 'fix', x: 230, y: 300, w: 200, h: 80, t: 'The fix', s: 'one line in the seed', c: 'mon' }
    ],
    edges: [
      { id: 'e1', a: 'raw', b: 'test', d: 'M170 195 H230', n: 1, nb: true },
      { id: 'e2', a: 'test', b: 'marts', d: 'M430 195 H490', n: 2, nb: true },
      { id: 'e3', a: 'marts', b: 'pub', d: 'M680 195 H740', n: 3, nb: true },
      { id: 'e4', a: 'test', b: 'fix', d: 'M330 240 V300', n: 4, bx: 365, by: 270 }
    ],
    tags: [
      { id: 'tg_fail', x: 230, y: 70, t: 'the test fails: 1 line has no price', c: 'ing' },
      { id: 'tg_stale', x: 560, y: 320, t: 'a stale mart beats a wrong one', c: 'mart' }
    ]
  };
})();
