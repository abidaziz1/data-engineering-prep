/* Look-ups into js/real.js, the file that dbt/verify/capture.py writes after running the project for real.
   Each look-up throws when a key is missing, so a typo in a lesson fails the lint instead of showing "undefined". */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var R = LAB.real;
  if (!R) throw new Error('js/real.js is missing. Run: python3 dbt/verify/capture.py');

  function need(bag, key, what) {
    var v = bag && bag[key];
    if (v === undefined || v === null) throw new Error('real.js has no ' + what + ' "' + key + '". Re-run dbt/verify/capture.py or fix the key.');
    return v;
  }

  var G = (LAB.get = {
    file: function (p) { return need(R.files, p, 'file'); },
    sql: function (k) { return need(R.sql, k, 'compiled or run SQL'); },
    log: function (k) { return need(R.logs, k, 'log'); },
    cmd: function (k) { return need(R.cmds, k, 'command'); },
    table: function (k) { return need(R.tables, k, 'table'); },
    text: function (k) { return need(R.text, k, 'text'); },
    ls: function (k) { return need(R.ls, k, 'selector result'); },
    /* lines a to b (1-based, inclusive) of a text */
    lines: function (text, a, b) { return text.split('\n').slice(a - 1, b).join('\n'); },
    /* the lines of a text that match a pattern */
    grep: function (text, re) { return text.split('\n').filter(function (l) { return re.test(l); }).join('\n'); },
    /* a result for an sql scene: { cols, rows, msg } */
    result: function (k, msg) { var t = G.table(k); return { cols: t.cols, rows: t.rows, msg: msg || (t.rows.length + (t.rows.length === 1 ? ' row' : ' rows')) }; },
    /* rows of a table where a column has one of the given values */
    where: function (k, col, vals) {
      var t = G.table(k), i = t.cols.indexOf(col);
      if (i < 0) throw new Error('table ' + k + ' has no column ' + col);
      return { cols: t.cols, rows: t.rows.filter(function (r) { return [].concat(vals).indexOf(r[i]) >= 0; }) };
    },
    /* some columns of a table */
    cols: function (k, names) {
      var t = G.table(k), idx = names.map(function (n) { var i = t.cols.indexOf(n); if (i < 0) throw new Error('table ' + k + ' has no column ' + n); return i; });
      return { cols: names.slice(), rows: t.rows.map(function (r) { return idx.map(function (i) { return r[i]; }); }) };
    },
    /* graph node id -> status 'wait' for every DAG node of a diagram */
    wait: function (graph) {
      var o = {};
      (LAB.graphs[graph].nodes || []).forEach(function (n) { if (n.k === 'dag') o[n.id] = 'wait'; });
      return o;
    },
    /* map of project name -> diagram node id for a diagram whose nodes carry `real` */
    nodeMap: function (graph) {
      var o = {};
      (LAB.graphs[graph].nodes || []).forEach(function (n) { if (n.real) o[n.real.replace(/^source:/, '')] = n.id; });
      return o;
    },
    /* a terminal built from a recorded log */
    term: function (key, opts) {
      opts = opts || {};
      return LAB.Term.fromLog(G.log(key), {
        cmd: opts.cmd || G.cmd(key),
        nodes: opts.nodes || G.nodeMap(opts.g || 'dag'),
        extra: opts.extra || { assert_order_total_matches_lines: 'int_orders' },
        hide: opts.hide || /Unable to do partial parsing/,
        keep: opts.keep,
        pace: opts.pace
      });
    }
  };
})();
