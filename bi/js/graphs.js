/* Diagram specs for the BI course. Plain data: nodes, edges, groups, tags. shared/js/graph.js draws them. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var S = (LAB.graphs = {});

  /* ------------------------------------------------------------------ */
  /* 1. From a click on a dashboard to a query on your tables             */
  /* ------------------------------------------------------------------ */
  S.master = {
    w: 1000, h: 400,
    label: 'A viewer clicks on a dashboard. Every tile asks the engine of the BI tool a question. The model says how the tables join and what a measure means. The engine answers from its own copy of the data, or sends SQL to the warehouse. A refresh fills the copy.',
    nodes: [
      { id: 'wh', x: 0, y: 150, w: 190, h: 80, t: 'Warehouse', s: 'facts and dimensions', c: 'sf' },
      { id: 'copy', x: 270, y: 40, w: 190, h: 80, t: 'Copy in the tool', s: 'import or extract', c: 'raw' },
      { id: 'model', x: 270, y: 270, w: 190, h: 80, t: 'Model', s: 'joins and measures', c: 'stg' },
      { id: 'engine', x: 540, y: 150, w: 190, h: 80, t: 'Engine', s: 'a query for each tile', c: 'ing' },
      { id: 'dash', x: 810, y: 150, w: 190, h: 80, t: 'Dashboard', s: 'tiles and filters', c: 'mart' },
      { id: 'user', x: 810, y: 10, w: 190, h: 66, t: 'Viewer', s: 'with a role', c: 'con' }
    ],
    edges: [
      { id: 'e1', a: 'user', b: 'dash', d: 'M905 76 V150', n: 1, bx: 905, by: 113 },
      { id: 'e2', a: 'dash', b: 'engine', d: 'M810 190 H730', n: 2 },
      { id: 'e3', a: 'model', b: 'engine', d: 'M460 310 C520 310 520 215 540 215', n: 3, bx: 505, by: 268, k: 'ctl' },
      { id: 'e4', a: 'engine', b: 'copy', d: 'M540 170 C500 170 500 80 460 80', n: 4, bx: 500, by: 122 },
      { id: 'e5', a: 'engine', b: 'wh', d: 'M540 195 H190', n: 5, bx: 365, by: 195 },
      { id: 'e6', a: 'wh', b: 'copy', d: 'M95 150 C95 80 200 80 270 80', n: 6, bx: 140, by: 92 }
    ],
    tags: [
      { id: 'tg_import', x: 380, y: 14, t: 'answers from memory', c: 'raw' },
      { id: 'tg_live', x: 300, y: 222, t: 'live: SQL to the warehouse', c: 'sf' },
      { id: 'tg_refresh', x: 20, y: 60, t: 'refresh copies rows', c: 'air' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 2. Three tools, the same four parts                                  */
  /* ------------------------------------------------------------------ */
  S.tools = {
    w: 1000, h: 400,
    label: 'Power BI, Tableau and Looker each have a way to connect, a model, a language for measures and a place for reports. The names differ and the parts are the same.',
    nodes: [
      { id: 'p1', x: 0, y: 30, w: 220, h: 78, t: 'Power Query', s: 'connect and shape', c: 'src' },
      { id: 'p2', x: 260, y: 30, w: 220, h: 78, t: 'Semantic model', s: 'tables, relationships', c: 'stg' },
      { id: 'p3', x: 520, y: 30, w: 220, h: 78, t: 'DAX measures', s: 'the business numbers', c: 'mart' },
      { id: 'p4', x: 780, y: 30, w: 220, h: 78, t: 'Report', s: 'Power BI service', c: 'con' },
      { id: 't1', x: 0, y: 160, w: 220, h: 78, t: 'Connection', s: 'live or extract', c: 'src' },
      { id: 't2', x: 260, y: 160, w: 220, h: 78, t: 'Data source', s: 'tables, relationships', c: 'stg' },
      { id: 't3', x: 520, y: 160, w: 220, h: 78, t: 'Calculated fields', s: 'and LOD expressions', c: 'mart' },
      { id: 't4', x: 780, y: 160, w: 220, h: 78, t: 'Workbook', s: 'Tableau Server or Cloud', c: 'con' },
      { id: 'l1', x: 0, y: 290, w: 220, h: 78, t: 'Connection', s: 'SQL to the warehouse', c: 'src' },
      { id: 'l2', x: 260, y: 290, w: 220, h: 78, t: 'LookML views', s: 'explores and joins', c: 'stg' },
      { id: 'l3', x: 520, y: 290, w: 220, h: 78, t: 'LookML measures', s: 'in the same files', c: 'mart' },
      { id: 'l4', x: 780, y: 290, w: 220, h: 78, t: 'Explore, dashboard', s: 'Looker', c: 'con' }
    ],
    edges: [
      { id: 'p12', a: 'p1', b: 'p2', d: 'M220 69 H260', n: 1, nb: true }, { id: 'p23', a: 'p2', b: 'p3', d: 'M480 69 H520', n: 2, nb: true }, { id: 'p34', a: 'p3', b: 'p4', d: 'M740 69 H780', n: 3, nb: true },
      { id: 't12', a: 't1', b: 't2', d: 'M220 199 H260', n: 1, nb: true }, { id: 't23', a: 't2', b: 't3', d: 'M480 199 H520', n: 2, nb: true }, { id: 't34', a: 't3', b: 't4', d: 'M740 199 H780', n: 3, nb: true },
      { id: 'l12', a: 'l1', b: 'l2', d: 'M220 329 H260', n: 1, nb: true }, { id: 'l23', a: 'l2', b: 'l3', d: 'M480 329 H520', n: 2, nb: true }, { id: 'l34', a: 'l3', b: 'l4', d: 'M740 329 H780', n: 3, nb: true }
    ],
    tags: [
      { id: 'tg_pbi', x: 0, y: 4, t: 'Power BI', c: 'mart' },
      { id: 'tg_tab', x: 0, y: 134, t: 'Tableau', c: 'ing' },
      { id: 'tg_look', x: 0, y: 264, t: 'Looker', c: 'stg' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 3. The Brewline star schema                                          */
  /* ------------------------------------------------------------------ */
  S.star = {
    w: 1000, h: 420,
    label: 'The Brewline model. The order lines are the fact in the middle. Each line points to one order, one product and one day. An order points to one store. A bridge table holds the promotion codes of an order, and an order can have two.',
    nodes: [
      { id: 'lines', x: 395, y: 165, w: 210, h: 90, t: 'fact_order_lines', s: 'a product on an order', c: 'mart' },
      { id: 'orders', x: 395, y: 10, w: 210, h: 80, t: 'fact_orders', s: 'an order', c: 'mart' },
      { id: 'store', x: 730, y: 10, w: 200, h: 80, t: 'dim_store', s: 'store, city, region', c: 'stg' },
      { id: 'product', x: 760, y: 170, w: 200, h: 80, t: 'dim_product', s: 'product, category', c: 'stg' },
      { id: 'date', x: 40, y: 170, w: 200, h: 80, t: 'dim_date', s: 'day, month, quarter', c: 'stg' },
      { id: 'promo', x: 30, y: 10, w: 250, h: 80, t: 'bridge_order_promos', s: 'a code on an order', c: 'qual' }
    ],
    edges: [
      { id: 'r1', a: 'lines', b: 'orders', d: 'M500 165 V90', n: 1, bx: 500, by: 128 },
      { id: 'r2', a: 'orders', b: 'store', d: 'M605 50 H730', n: 2 },
      { id: 'r3', a: 'lines', b: 'product', d: 'M605 210 H760', n: 3 },
      { id: 'r4', a: 'lines', b: 'date', d: 'M395 210 H240', n: 4 },
      { id: 'r5', a: 'promo', b: 'orders', d: 'M280 50 H395', n: 5 }
    ],
    tags: [
      { id: 'tg_many', x: 420, y: 290, t: 'many lines to one order', c: 'mart' },
      { id: 'tg_m2m', x: 60, y: 110, t: 'many codes to many lines', c: 'qual' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 4. Import or live                                                    */
  /* ------------------------------------------------------------------ */
  S.modes = {
    w: 1000, h: 380,
    label: 'Two ways to answer a tile. With a copy, a refresh loads the rows into the tool and the tile is answered from memory. With a live connection, every tile sends SQL to the warehouse.',
    nodes: [
      { id: 'dash', x: 0, y: 150, w: 180, h: 80, t: 'Dashboard', s: 'six tiles', c: 'mart' },
      { id: 'copy', x: 330, y: 30, w: 220, h: 84, t: 'Copy in the tool', s: 'import, extract', c: 'raw' },
      { id: 'sql', x: 330, y: 266, w: 220, h: 84, t: 'Generated SQL', s: 'DirectQuery, live, Looker', c: 'ing' },
      { id: 'wh', x: 780, y: 150, w: 220, h: 80, t: 'Warehouse', s: 'compute you pay for', c: 'sf' },
      { id: 'sched', x: 780, y: 20, w: 220, h: 66, t: 'Refresh', s: 'schedule or trigger', c: 'air' }
    ],
    edges: [
      { id: 'a1', a: 'dash', b: 'copy', d: 'M180 172 C260 172 250 72 330 72', n: 1, bx: 250, by: 110 },
      { id: 'a2', a: 'wh', b: 'copy', d: 'M780 172 C680 172 660 72 550 72', n: 2, bx: 660, by: 110 },
      { id: 'a3', a: 'sched', b: 'wh', d: 'M890 86 V150', n: 3, bx: 890, by: 118, k: 'ctl' },
      { id: 'b1', a: 'dash', b: 'sql', d: 'M180 208 C260 208 250 308 330 308', n: 4, bx: 250, by: 270 },
      { id: 'b2', a: 'sql', b: 'wh', d: 'M550 308 C660 308 680 208 780 208', n: 5, bx: 660, by: 270 }
    ],
    tags: [
      { id: 'tg_stale', x: 330, y: 126, t: 'as fresh as the last refresh', c: 'raw' },
      { id: 'tg_fresh', x: 330, y: 230, t: 'as fresh as the warehouse', c: 'ing' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 5. Refresh after the load, not by the clock                          */
  /* ------------------------------------------------------------------ */
  S.refresh = {
    w: 1000, h: 380,
    label: 'The nightly load finishes, its checks pass, and only then the orchestrator asks the BI tool to refresh. A refresh by the clock starts whether the load is done or not.',
    nodes: [
      { id: 'load', k: 'dag', x: 0, y: 60, w: 180, h: 70, t: 'load_orders', s: 'warehouse tables', c: 'ing' },
      { id: 'test', k: 'dag', x: 215, y: 60, w: 180, h: 70, t: 'quality_checks', s: 'counts and keys', c: 'qual' },
      { id: 'call', k: 'dag', x: 430, y: 60, w: 180, h: 70, t: 'refresh_bi', s: 'call the API', c: 'air' },
      { id: 'wait', k: 'dag', x: 645, y: 60, w: 180, h: 70, t: 'wait_refresh', s: 'poll the status', c: 'mon' },
      { id: 'tool', x: 430, y: 250, w: 180, h: 80, t: 'BI tool', s: 'partitions, extract', c: 'raw' },
      { id: 'dash', x: 820, y: 250, w: 180, h: 80, t: 'Dashboard', s: 'new numbers', c: 'mart' },
      { id: 'clock', x: 0, y: 250, w: 180, h: 80, t: 'Clock: 06:00', s: 'set in the tool', c: 'src' }
    ],
    edges: [
      { id: 'e1', a: 'load', b: 'test', d: 'M180 95 H215', n: 1, nb: true },
      { id: 'e2', a: 'test', b: 'call', d: 'M395 95 H430', n: 2, nb: true },
      { id: 'e3', a: 'call', b: 'tool', d: 'M520 130 V250', n: 3, bx: 520, by: 190, k: 'ctl' },
      { id: 'e4', a: 'call', b: 'wait', d: 'M610 95 H645', n: 4, nb: true },
      { id: 'e5', a: 'tool', b: 'dash', d: 'M610 290 H820', n: 5 },
      { id: 'e6', a: 'clock', b: 'tool', d: 'M180 290 H430', n: 6, k: 'ctl' }
    ],
    tags: [
      { id: 'tg_clock', x: 200, y: 330, t: 'starts even when the load is late', c: 'src' },
      { id: 'tg_event', x: 560, y: 182, t: 'starts when the data is ready', c: 'air' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 6. A small table answers most tiles                                  */
  /* ------------------------------------------------------------------ */
  S.agg = {
    w: 1000, h: 360,
    label: 'A tile asks for revenue by region and month. If an aggregate table holds that grain, the tool or the warehouse reads the small table. A question the small table cannot answer goes to the fact table.',
    nodes: [
      { id: 'tile', x: 0, y: 140, w: 190, h: 80, t: 'Tile', s: 'a question, a grain', c: 'mart' },
      { id: 'route', x: 270, y: 140, w: 240, h: 80, t: 'Which table?', s: 'columns, additive measures', c: 'ing' },
      { id: 'agg', x: 620, y: 30, w: 230, h: 84, t: 'Aggregate table', s: 'day, store, category', c: 'stg' },
      { id: 'fact', x: 620, y: 246, w: 230, h: 84, t: 'fact_order_lines', s: 'every line', c: 'sf' }
    ],
    edges: [
      { id: 'g1', a: 'tile', b: 'route', d: 'M190 180 H270', n: 1 },
      { id: 'g2', a: 'route', b: 'agg', d: 'M510 165 C570 165 560 72 620 72', n: 2, bx: 556, by: 112 },
      { id: 'g3', a: 'route', b: 'fact', d: 'M510 195 C570 195 560 288 620 288', n: 3, bx: 556, by: 248 }
    ],
    tags: [
      { id: 'tg_yes', x: 640, y: 126, t: 'yes: region, month, revenue', c: 'stg' },
      { id: 'tg_no', x: 640, y: 214, t: 'no: product, distinct customers', c: 'sf' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 7. Who sees which rows                                               */
  /* ------------------------------------------------------------------ */
  S.rls = {
    w: 1000, h: 360,
    label: 'A viewer signs in. The tool looks up what the viewer may see and adds a filter on the store dimension. The filter travels along the relationship to the fact, so every tile shows only those rows.',
    nodes: [
      { id: 'user', x: 0, y: 140, w: 170, h: 80, t: 'Viewer', s: 'ana signs in', c: 'con' },
      { id: 'map', x: 240, y: 140, w: 200, h: 80, t: 'Who sees what', s: 'ana: North', c: 'qual' },
      { id: 'dim', x: 510, y: 140, w: 200, h: 80, t: 'dim_store', s: 'region = North', c: 'stg' },
      { id: 'fact', x: 780, y: 140, w: 220, h: 80, t: 'fact_order_lines', s: 'lines of North stores', c: 'mart' },
      { id: 'svc', x: 510, y: 280, w: 200, h: 66, t: 'Service account', s: 'reads every row', c: 'sf' }
    ],
    edges: [
      { id: 's1', a: 'user', b: 'map', d: 'M170 180 H240', n: 1 },
      { id: 's2', a: 'map', b: 'dim', d: 'M440 180 H510', n: 2 },
      { id: 's3', a: 'dim', b: 'fact', d: 'M710 180 H780', n: 3 },
      { id: 's4', a: 'svc', b: 'fact', d: 'M710 313 C860 313 890 280 890 220', n: 4, bx: 850, by: 300, k: 'ctl' }
    ],
    tags: [
      { id: 'tg_tool', x: 250, y: 96, t: 'the tool applies the filter', c: 'qual' },
      { id: 'tg_db', x: 720, y: 246, t: 'the warehouse sees one login', c: 'sf' }
    ]
  };

  /* ------------------------------------------------------------------ */
  /* 8. The model as files                                                */
  /* ------------------------------------------------------------------ */
  S.files = {
    w: 1000, h: 320,
    label: 'A model that is stored as text files can be reviewed, tested and deployed like code: a branch, a pull request, a check in CI, a deployment to a test workspace, and then production.',
    nodes: [
      { id: 'edit', x: 0, y: 120, w: 170, h: 80, t: 'Model files', s: 'TMDL, .tds, LookML', c: 'src' },
      { id: 'pr', x: 205, y: 120, w: 170, h: 80, t: 'Pull request', s: 'a readable diff', c: 'ci' },
      { id: 'ci', x: 410, y: 120, w: 170, h: 80, t: 'Checks', s: 'parse, names, keys', c: 'qual' },
      { id: 'test', x: 615, y: 120, w: 170, h: 80, t: 'Test', s: 'dev connection', c: 'stg' },
      { id: 'prod', x: 820, y: 120, w: 180, h: 80, t: 'Production', s: 'prod connection', c: 'mart' }
    ],
    edges: [
      { id: 'f1', a: 'edit', b: 'pr', d: 'M170 160 H205', n: 1, nb: true },
      { id: 'f2', a: 'pr', b: 'ci', d: 'M375 160 H410', n: 2, nb: true },
      { id: 'f3', a: 'ci', b: 'test', d: 'M580 160 H615', n: 3, nb: true },
      { id: 'f4', a: 'test', b: 'prod', d: 'M785 160 H820', n: 4, nb: true }
    ],
    tags: [
      { id: 'tg_conn', x: 640, y: 224, t: 'only the connection changes', c: 'stg' }
    ]
  };
})();
