/* Look-ups into js/real.js, the file that snowflake-dbt/verify/capture_sf.py writes after running dbt-snowflake on the
   Brewline project against a stand-in for the connection. Each look-up throws when a key is missing, so a typo in a
   lesson fails the lint instead of showing "undefined". */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var R = LAB.real;
  if (!R) throw new Error('js/real.js is missing. Run: python3 snowflake-dbt/verify/capture_sf.py --dbt <path to dbt>');

  function need(bag, key, what) {
    var v = bag && bag[key];
    if (v === undefined || v === null) throw new Error('real.js has no ' + what + ' "' + key + '". Re-run capture_sf.py or fix the key.');
    return v;
  }

  var G = (LAB.get = {
    file: function (p) { return need(R.files, p, 'file').replace(/\n+$/, ''); },
    text: function (k) { return need(R.text, k, 'text'); },
    meta: function (k) { return need(R.meta, k, 'meta value'); },
    /* every statement dbt sent in a scenario: [{kind, sql, comment}] */
    stmts: function (k) { return need(R.stmts, k, 'recorded statements'); },
    /* the statements of a scenario whose text matches a pattern, in the order dbt sent them */
    pick: function (k, re, kinds) {
      var out = G.stmts(k).filter(function (s) { return re.test(s.sql) && (!kinds || kinds.indexOf(s.kind) >= 0); });
      if (!out.length) throw new Error('no statement in "' + k + '" matches ' + re);
      return out;
    },
    /* the SQL of the first matching statement */
    stmt: function (k, re, kinds) { return G.pick(k, re, kinds)[0].sql; },
    /* the SQL of every matching statement, each ended with a semicolon, as one script */
    script: function (k, re, kinds) { return G.pick(k, re, kinds).map(function (s) { return s.sql + ';'; }).join('\n\n'); },
    /* the query comment that dbt added to the first matching statement, as readable JSON */
    comment: function (k, re) {
      var c = G.pick(k, re)[0].comment;
      if (!c) throw new Error('statement has no comment');
      return JSON.stringify(JSON.parse(c), null, 2);
    },
    /* how many statements of each kind a scenario sent */
    count: function (k) {
      var c = {};
      G.stmts(k).forEach(function (s) { c[s.kind] = (c[s.kind] || 0) + 1; });
      return c;
    },
    /* how many connections dbt opened during a scenario (one per thread that ran something, plus one for metadata) */
    conns: function (k) { return need(R.conns, k, 'connection count'); },
    /* terminal lines from recorded plain text, such as the output of dbt debug. o.cmd is printed first. */
    plain: function (text, o) {
      o = o || {};
      var out = [];
      if (o.cmd) out.push({ c: 'cmd', t: '$ ' + o.cmd, d: 350 });
      text.split('\n').forEach(function (ln) {
        if (o.hide && o.hide.test(ln)) return;
        var c = /\[OK|All checks passed/.test(ln) ? 'ok' : /ERROR/.test(ln) ? 'err' : /WARN/.test(ln) ? 'warn' : 'dim';
        out.push({ c: c, t: ln.replace(/^\d\d:\d\d:\d\d\s{2}/, ''), d: o.d || 45 });
      });
      return out;
    },
    /* a recorded JSON text, parsed */
    json: function (k) { return JSON.parse(G.text(k)); },
    /* true when the first statement that matches is sent right after a begin and right before a commit */
    wrapped: function (k, re) {
      var all = G.stmts(k);
      for (var i = 0; i < all.length; i++) {
        if (all[i].kind !== 'txn' && re.test(all[i].sql)) {
          return i > 0 && all[i - 1].kind === 'txn' && all[i - 1].sql === 'begin' && !!all[i + 1] && all[i + 1].kind === 'txn' && all[i + 1].sql === 'commit';
        }
      }
      throw new Error('no statement in "' + k + '" matches ' + re);
    },
    /* a fact a lesson relies on: stop loading, and fail the lint, when a new recording says otherwise */
    expect: function (cond, msg) { if (!cond) throw new Error('lesson no longer matches the recording: ' + msg); return true; },
    /* the first line of a statement, squeezed to one line */
    head: function (sql, max) {
      var l = sql.split('\n')[0].replace(/\s+/g, ' ').trim();
      return l.length > (max || 110) ? l.slice(0, (max || 110) - 3) + '...' : l;
    },
    /* the name of the table or view a statement works on, without database, schema or the dbt temp suffix */
    relOf: function (sql) {
      var flat = sql.replace(/\s+/g, ' ').trim();
      var m = /^(?:create(?: or replace)?(?: (?:transient|temporary|secure|dynamic))* (?:table|view)(?: if not exists)?|merge into|insert into|insert overwrite into|delete from|alter table|drop (?:table|view)(?: if exists)?|grant \w+ on|revoke \w+ on) ([\w."]+)/i.exec(flat);
      if (!m) return null;
      var last = m[1].replace(/"/g, '').split('.').pop().toLowerCase();
      return last.replace(/__dbt_tmp.*$/, '');
    },
    /* terminal lines for a recorded scenario: the command, then the first line of every statement dbt sent.
       o.cmd the command; o.meta true to include the SHOW and DESCRIBE calls; o.nodes { relationName: graphNodeId }; o.max line width; o.pace speed */
    stmtLines: function (k, o) {
      o = o || {};
      var pace = o.pace || 1, out = [];
      if (o.cmd) out.push({ c: 'cmd', t: '$ ' + o.cmd, d: 350 * pace });
      G.stmts(k).forEach(function (s) {
        if ((s.kind === 'meta' || s.kind === 'txn') && !o.meta) return;
        var l = { c: s.kind === 'meta' ? 'dim' : s.kind === 'dml' ? 'ok' : s.kind === 'ddl' ? 'hl' : 'out', t: G.head(s.sql, o.max || 96), d: (s.kind === 'meta' ? 70 : 170) * pace };
        var rel = G.relOf(s.sql);
        if (rel && o.nodes && o.nodes[rel] && /^(create|merge|insert)/i.test(s.sql.trim()) && !/temporary/i.test(s.sql.slice(0, 40))) { l.node = o.nodes[rel]; l.st = 'ok'; }
        out.push(l);
      });
      return out;
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
    grep: function (text, re) { return text.split('\n').filter(function (l) { return re.test(l); }).join('\n'); }
  });
})();
