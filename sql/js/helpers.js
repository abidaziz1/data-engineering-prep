/* Look-ups into js/real.js, the file that sql/verify/capture_sq.py writes after running the Brewline queries on DuckDB, PostgreSQL and SQLite
   (and two-session transaction runs on PostgreSQL), translating a few queries with sqlglot, and recording plans and result tables.
   Each look-up throws when a key is missing, so a typo in a lesson fails the lint instead of showing "undefined".
   Only DuckDB, PostgreSQL and SQLite ran. Every other dialect on a screen is translated text, and the screen says so. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var R = LAB.real;
  if (!R) throw new Error('js/real.js is missing. Run: python3 sql/verify/capture_sq.py');

  function need(bag, key, what) {
    var v = bag && bag[key];
    if (v === undefined || v === null) throw new Error('real.js has no ' + what + ' "' + key + '". Re-run capture_sq.py or fix the key.');
    return v;
  }

  var ENGINE_NAME = { duckdb: 'DuckDB', postgres: 'PostgreSQL', sqlite: 'SQLite' };

  var G = (LAB.get = {
    meta: function (k) { return need(R.meta, k, 'meta value'); },
    /* a script or a data file that was run, checked or shown */
    file: function (k) { return need(R.files, k, 'file').replace(/\n+$/, ''); },
    /* recorded text: a plan, an error message, tool output */
    text: function (k) { return need(R.text, k, 'text'); },
    /* a recorded result table: {cols, rows}. NULL is the string NULL. */
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
    /* the first n rows of a table, with the real row count in the message */
    head: function (k, n) { var t = G.table(k); return { cols: t.cols, rows: t.rows.slice(0, n) }; },
    /* a recorded set of numbers, lists and small facts */
    counts: function (k) { return need(R.counts, k, 'counts'); },
    /* the same query on one engine: the recording keeps one table per engine as "key.engine" */
    on: function (k, engine) { return G.table(k + '.' + engine); },
    engine: function (e) { return need(ENGINE_NAME, e, 'engine') + ' ' + G.meta(e); },
    /* the SQL bar of a runnable scene: the engine and version that produced the result */
    ctx: function (e) { return { role: 'analyst', wh: G.engine(e), db: 'brewline' }; },
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
    /* a number as text with thousands separators */
    n: function (v) { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ','); },
    /* terminal lines from recorded plain text. o.cmd is printed first. */
    plain: function (text, o) {
      o = o || {};
      var out = [];
      if (o.cmd) out.push({ c: 'cmd', t: '$ ' + o.cmd, d: 350 });
      text.split('\n').forEach(function (ln) {
        var c = /^ERROR|^FATAL|error:|failed|deadlock detected/.test(ln) ? 'err' : /^COMMIT|^BEGIN|^ROLLBACK|^SET|^CREATE|^INSERT|^UPDATE|^DELETE|^MERGE/.test(ln) ? 'ok' : 'out';
        out.push({ c: c, t: ln, d: o.d || 40 });
      });
      return out;
    }
  });
})();
