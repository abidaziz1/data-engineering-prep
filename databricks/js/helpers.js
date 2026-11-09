/* Look-ups into js/real.js, the file that databricks/verify/capture_db.py writes after running open-source Apache Spark
   and Delta Lake on the Brewline data. Each look-up throws when a key is missing, so a typo in a lesson fails the lint
   instead of showing "undefined". */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var R = LAB.real;
  if (!R) throw new Error('js/real.js is missing. Run: python3 databricks/verify/capture_db.py');

  function need(bag, key, what) {
    var v = bag && bag[key];
    if (v === undefined || v === null) throw new Error('real.js has no ' + what + ' "' + key + '". Re-run capture_db.py or fix the key.');
    return v;
  }

  var G = (LAB.get = {
    meta: function (k) { return need(R.meta, k, 'meta value'); },
    /* a code file that was run or shown */
    file: function (k) { return need(R.files, k, 'file').replace(/\n+$/, ''); },
    /* recorded text: a plan, an error message, program output */
    text: function (k) { return need(R.text, k, 'text'); },
    /* a recorded result table: {cols, rows} */
    table: function (k) { return need(R.tables, k, 'table'); },
    /* some columns of a table */
    cols: function (k, names) {
      var t = G.table(k), ix = names.map(function (n) { var i = t.cols.indexOf(n); if (i < 0) throw new Error('table "' + k + '" has no column ' + n); return i; });
      return { cols: names, rows: t.rows.map(function (r) { return ix.map(function (i) { return r[i]; }); }) };
    },
    /* the rows of a table where a column has one of the values */
    where: function (k, col, vals) {
      var t = G.table(k), i = t.cols.indexOf(col);
      if (i < 0) throw new Error('table "' + k + '" has no column ' + col);
      return { cols: t.cols, rows: t.rows.filter(function (r) { return vals.indexOf(r[i]) >= 0; }) };
    },
    /* a recorded set of numbers and small facts */
    counts: function (k) { return need(R.counts, k, 'counts'); },
    /* the folder listing of a table or checkpoint */
    listing: function (k) { return need(R.listing, k, 'listing'); },
    /* DESCRIBE HISTORY rows */
    history: function (k) { return need(R.history, k, 'history'); },
    /* the commits of a Delta log: [{version, actions:[{kind, body}]}] */
    log: function (k) { return need(R.logs, k, 'Delta log'); },
    commit: function (k, version) {
      var c = G.log(k).filter(function (x) { return x.version === version; })[0];
      if (!c) throw new Error('log "' + k + '" has no version ' + version);
      return c;
    },
    /* one commit as the text of its JSON lines, with the stats string shown as an object so it can be read */
    commitText: function (k, version, o) {
      o = o || {};
      return G.commit(k, version).actions.filter(function (a) { return !o.kinds || o.kinds.indexOf(a.kind) >= 0; }).map(function (a) {
        var body = JSON.parse(JSON.stringify(a.body));
        if (body.stats && typeof body.stats === 'string') body.stats = JSON.parse(body.stats);
        if (body.schemaString && o.shortSchema !== false) body.schemaString = '<the table schema as JSON>';
        var o2 = {}; o2[a.kind] = body;
        return JSON.stringify(o2, null, 2);
      }).join('\n');
    },
    /* the actions of one kind in a commit */
    actions: function (k, version, kind) { return G.commit(k, version).actions.filter(function (a) { return a.kind === kind; }).map(function (a) { return a.body; }); },
    /* the metrics of a history row as one object */
    metrics: function (k, version) {
      var r = G.history(k).filter(function (x) { return x.version === version; })[0];
      if (!r) throw new Error('history "' + k + '" has no version ' + version);
      return r.operationMetrics;
    },
    /* a table of DESCRIBE HISTORY: version, operation and the chosen metrics */
    historyTable: function (k, metricKeys) {
      var rows = G.history(k);
      return { cols: ['version', 'operation'].concat(metricKeys), rows: rows.map(function (r) { return [String(r.version), r.operation].concat(metricKeys.map(function (m) { return r.operationMetrics[m] === undefined ? '' : r.operationMetrics[m]; })); }) };
    },
    /* the 1-based number of the first line that matches a pattern, so lessons never count lines by hand */
    at: function (code, re) {
      var l = code.split('\n');
      for (var i = 0; i < l.length; i++) if (re.test(l[i])) return i + 1;
      throw new Error('no line matches ' + re + ' in ' + code.slice(0, 60));
    },
    /* [first, last] line numbers: from the first line that matches `a` to the first line at or after it that matches `b` */
    span: function (code, a, b) {
      var s = G.at(code, a);
      if (!b) return [s, s];
      var l = code.split('\n');
      for (var i = s - 1; i < l.length; i++) if (b.test(l[i])) return [s, i + 1];
      throw new Error('no line matches ' + b + ' after line ' + s);
    },
    lines: function (text, a, b) { return text.split('\n').slice(a - 1, b).join('\n'); },
    grep: function (text, re) { return text.split('\n').filter(function (l) { return re.test(l); }).join('\n'); },
    /* a lesson relies on a fact in the recording: fail the lint when a new recording says otherwise */
    expect: function (cond, msg) { if (!cond) throw new Error('lesson no longer matches the recording: ' + msg); return true; },
    /* terminal lines from recorded plain text. o.cmd is printed first. */
    plain: function (text, o) {
      o = o || {};
      var out = [];
      if (o.cmd) out.push({ c: 'cmd', t: '$ ' + o.cmd, d: 350 });
      text.split('\n').forEach(function (ln) {
        var c = /passed|PASS/.test(ln) ? 'ok' : /FAILED|Error|failed/.test(ln) ? 'err' : /^E /.test(ln) ? 'err' : 'out';
        out.push({ c: c, t: ln, d: o.d || 40 });
      });
      return out;
    }
  });
})();
