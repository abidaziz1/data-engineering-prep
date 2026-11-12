/* Diagram specs for the SQL for data engineers tutorial. Plain data: nodes, edges, tags. shared/js/graph.js draws them.
   The small builder below turns a grid position (column, row) into pixels and draws a straight or curved arrow between two nodes, so a diagram is a list
   of nodes and a list of arrows. Titles stay under about 20 characters and subtitles under about 28, so that the text fits in a chip.
   The diagrams show how SQL and the engines work. The numbers that belong to the Brewline runs are not in the diagrams; the lessons read them from js/real.js. */
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
    if (o.pk) spec.pk = o.pk;
    return spec;
  }

  /* ------------------------------------------------------------------ */
  /* 1. Where SQL runs in the Brewline platform                          */
  /* ------------------------------------------------------------------ */
  S.master = build({
    h: 400, cw: 190, dx: 216,
    label: 'Where SQL runs in the Brewline data platform. Sources are the orders database, web events and supplier files. SQL loads them into raw tables, cleans them into staging tables, builds business tables, and dashboards and analysts read those. Checks, plans, transactions and dialects sit around the flow.',
    nodes: [
      ['s_src', 0, 0, 'SOURCES', ['Orders database', 'Web events', 'Supplier files'], 'src', 'layer', { h: 170 }],
      ['s_load', 1, 0, 'LOAD', ['INSERT and COPY', 'MERGE and upsert', 'safe to run twice'], 'ing', 'layer', { h: 170 }],
      ['s_raw', 2, 0, 'RAW AND STAGING', ['raw tables', 'cleaned views', 'types and NULLs'], 'stg', 'layer', { h: 170 }],
      ['s_mart', 3, 0, 'BUSINESS TABLES', ['joins and groups', 'windows and patterns', 'one grain each'], 'mart', 'layer', { h: 170 }],
      ['s_use', 4, 0, 'USE', ['Dashboards', 'Analysts', 'Other jobs'], 'con', 'layer', { h: 170 }],
      ['x_chk', 0, 1.8, 'Checks', 'counts, keys, NULL rates', 'qual', 'pill', { w: 165, h: 56 }],
      ['x_plan', 0.84, 1.8, 'Plans', 'indexes and statistics', 'sf', 'pill', { w: 165, h: 56 }],
      ['x_tx', 1.68, 1.8, 'Transactions', 'locks and isolation', 'air', 'pill', { w: 165, h: 56 }],
      ['x_dia', 2.52, 1.8, 'Dialects', 'what changes by engine', 'mon', 'pill', { w: 165, h: 56 }],
      ['x_mod', 3.36, 1.8, 'Modelling', 'grain, keys, stars', 'snap', 'pill', { w: 165, h: 56 }]
    ],
    edges: [
      ['m1', 's_src', 's_load', 1, { bx: 218, by: 96 }],
      ['m2', 's_load', 's_raw', 2, { bx: 434, by: 96 }],
      ['m3', 's_raw', 's_mart', 3, { bx: 650, by: 96 }],
      ['m4', 's_mart', 's_use', 4, { bx: 866, by: 96 }]
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 2. The life of one query                                            */
  /* ------------------------------------------------------------------ */
  S.engine = build({
    h: 330, cw: 190, dx: 216,
    label: 'The life of one query. The client sends text. The parser turns it into a tree. The planner chooses a plan using the catalog and the statistics. The executor runs the plan against storage. The rows travel back to the client.',
    nodes: [
      ['q_cli', 0, 0, 'Client', 'psql, notebook, job', 'src'],
      ['q_par', 1, 0, 'Parser', 'text to a syntax tree', 'raw'],
      ['q_pla', 2, 0, 'Planner', 'chooses a plan', 'stg'],
      ['q_exe', 3, 0, 'Executor', 'runs the plan', 'int'],
      ['q_sto', 4, 0, 'Storage', 'pages, files, indexes', 'mart'],
      ['q_cat', 1, 1, 'Catalog', 'tables, columns, types', 'qual'],
      ['q_sta', 2, 1, 'Statistics', 'row counts, spread', 'sf'],
      ['q_res', 3, 1, 'Result rows', 'back to the client', 'con']
    ],
    edges: [
      ['a1', 'q_cli', 'q_par', 1],
      ['a2', 'q_par', 'q_pla', 2],
      ['a3', 'q_pla', 'q_exe', 3],
      ['a4', 'q_exe', 'q_sto', 4],
      ['a5', 'q_cat', 'q_par', 5, { k: 'ctl' }],
      ['a6', 'q_sta', 'q_pla', 6, { k: 'ctl' }],
      ['a7', 'q_exe', 'q_res', 7]
    ],
    tags: [
      { id: 'tg_decl', x: 20, y: 148, t: 'you say what, not how', c: 'qual' },
      { id: 'tg_est', x: 390, y: 148, t: 'estimates, not facts', c: 'sf' }
    ]
  });

  /* ------------------------------------------------------------------ */
  /* 3. The logical order of a SELECT                                    */
  /* ------------------------------------------------------------------ */
  S.order = build({
    h: 330, dy: 150, cw: 190, dx: 216,
    label: 'The logical order in which the clauses of a SELECT are evaluated: FROM and JOIN, WHERE, GROUP BY, HAVING, window functions, SELECT, DISTINCT, ORDER BY, LIMIT. The engine may run the work in another order, but the result must be as if it ran in this one.',
    nodes: [
      ['o_from', 0, 0, 'FROM and JOIN', 'which rows exist', 'src'],
      ['o_where', 1, 0, 'WHERE', 'drop rows', 'raw'],
      ['o_group', 2, 0, 'GROUP BY', 'collapse to groups', 'stg'],
      ['o_having', 3, 0, 'HAVING', 'drop groups', 'int'],
      ['o_win', 4, 0, 'WINDOW', 'rank, lag, sums', 'mart'],
      ['o_sel', 4, 1, 'SELECT', 'compute the columns', 'air'],
      ['o_dis', 3, 1, 'DISTINCT', 'drop repeated rows', 'qual'],
      ['o_ord', 2, 1, 'ORDER BY', 'sort the result', 'sf'],
      ['o_lim', 1, 1, 'LIMIT', 'keep the first rows', 'mon'],
      ['o_res', 0, 1, 'Result', 'what you see', 'con']
    ],
    edges: [
      ['c1', 'o_from', 'o_where', 1],
      ['c2', 'o_where', 'o_group', 2],
      ['c3', 'o_group', 'o_having', 3],
      ['c4', 'o_having', 'o_win', 4],
      ['c5', 'o_win', 'o_sel', 5],
      ['c6', 'o_sel', 'o_dis', 6],
      ['c7', 'o_dis', 'o_ord', 7],
      ['c8', 'o_ord', 'o_lim', 8],
      ['c9', 'o_lim', 'o_res', 9]
    ],
    tags: [
      { id: 'tg_alias', x: 20, y: 148, t: 'aliases are born at SELECT', c: 'qual' },
      { id: 'tg_win', x: 520, y: 148, t: 'windows see grouped rows', c: 'mart' }
    ]
  });
})();
