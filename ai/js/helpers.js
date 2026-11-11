/* Look-ups into js/real.js, the file that ai/verify/capture_ai.py writes after running real open-source tools on the Brewline documents: parsers,
   MinHash, a TF-IDF and SVD stand-in for an embedding model, FAISS and hnswlib, PostgreSQL with pgvector, the Anthropic and OpenAI SDKs against a
   local stand-in server, LangGraph with a scripted model, an MCP server and client, a SQL guard, and OpenTelemetry. Each look-up throws when a key is
   missing, so a typo in a lesson fails the lint instead of showing "undefined". No language model and no embedding model was used. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var R = LAB.real;
  if (!R) throw new Error('js/real.js is missing. Run: python3 ai/verify/capture_ai.py');

  function need(bag, key, what) {
    var v = bag && bag[key];
    if (v === undefined || v === null) throw new Error('real.js has no ' + what + ' "' + key + '". Re-run capture_ai.py or fix the key.');
    return v;
  }

  var G = (LAB.get = {
    meta: function (k) { return need(R.meta, k, 'meta value'); },
    /* a code or data file that was run, checked or shown */
    file: function (k) { return need(R.files, k, 'file').replace(/\n+$/, ''); },
    /* recorded text: tool output, an error message, a request */
    text: function (k) { return need(R.text, k, 'text'); },
    /* a recorded result table: {cols, rows} */
    table: function (k) { return need(R.tables, k, 'table'); },
    /* some columns of a table */
    cols: function (k, names) {
      var t = G.table(k), ix = names.map(function (n) { var i = t.cols.indexOf(n); if (i < 0) throw new Error('table "' + k + '" has no column ' + n); return i; });
      return { cols: names, rows: t.rows.map(function (r) { return ix.map(function (i) { return r[i]; }); }) };
    },
    /* a recorded set of numbers, lists and small facts */
    counts: function (k) { return need(R.counts, k, 'counts'); },
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
        var c = /passed|PASS|^PASSED/.test(ln) ? 'ok' : /FAILED|Error|failed|^E /.test(ln) ? 'err' : 'out';
        out.push({ c: c, t: ln, d: o.d || 40 });
      });
      return out;
    }
  });
})();
