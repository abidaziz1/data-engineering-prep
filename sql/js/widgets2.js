/* SQL lab widgets, part 2 (missions 8 to 13). See widgets.js. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var W = (LAB.W = LAB.W || {});
  var SQ = (LAB.sq = LAB.sq || {});
  SQ.info = SQ.info || {};
  var G = LAB.get, esc = LAB.esc, md = LAB.md;
  var U = function () { return SQ.u; };

  /* ====================== mission 8: the sessions lab ====================== */
  (function () {
    function C() { return G.counts('m8.sessions_lab'); }
    function mins(ts) { return +ts.slice(11, 13) * 60 + +ts.slice(14, 16); }
    function between(a, b) { return mins(b) - mins(a); }
    function pct(m) { return Math.max(0, Math.min(100, (m - 480) / 960 * 100)); }
    W.sessions = {
      steps: function () { return 1; },
      hint: 'Pick a gap limit and watch the sessions change.',
      say: function () { return 'The same 24 events, cut into sessions. A new session starts when the gap to the previous event of the customer is longer than the limit. Pick a limit. Each coloured bar is one session. DuckDB, PostgreSQL and SQLite returned identical sessions for every limit.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var u = U(), c = C(), st = A.local.ss || (A.local.ss = { n: 30 }), cur = c.combos[String(st.n)];
        var custs = ['1', '2', '3', 'NULL'];
        var h = '<div class="lab"><div class="lab-h">A new session starts after a gap longer than</div><div class="sel-chips">' + u.chips(c.limits, st.n, 'ss-n', function (k) { return k + ' minutes'; }) + '</div>' +
          '<div class="sx-rows">' + custs.map(function (cu) {
            var bands = cur.sessions.filter(function (r) { return r[0] === cu; }).map(function (r) {
              var a = pct(mins(r[2].slice(0, 19))), b = pct(mins(r[3].slice(0, 19)));
              return '<div class="sx-band c' + ((+r[1] - 1) % 4) + '" style="left:' + a + '%;width:' + Math.max(b - a, 0.9) + '%" title="session ' + r[1] + ': ' + esc(r[2].slice(11, 16)) + ' to ' + esc(r[3].slice(11, 16)) + '"></div>';
            }).join('');
            var dots = c.events.filter(function (e) { return e[1] === cu; }).map(function (e) { return '<div class="sx-dot" style="left:' + pct(mins(e[2])) + '%" title="' + esc(e[3]) + ' at ' + esc(e[2].slice(11, 16)) + '"></div>'; }).join('');
            return '<div class="sx-row"><div class="sx-l">' + (cu === 'NULL' ? 'guest (no id)' : 'customer ' + cu) + '</div><div class="sx-track">' + bands + dots + '</div></div>';
          }).join('') + '</div><div class="sx-axis"><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span><span>24:00</span></div>' +
          u.code('the query that ran', 'sql', c.query.replace(/INTERVAL '30 minutes'/, "INTERVAL '" + st.n + " minutes'"), null) +
          u.table(['customer', 'session', 'started', 'ended', 'events', 'minutes'], cur.sessions.map(function (r) { return [r[0], r[1], r[2].slice(11, 16), r[3].slice(11, 16), r[4], between(r[2], r[3])]; })) +
          '<div class="lab-out"><div class="big"><b>' + cur.sessions.length + '</b><span>sessions</span></div>' +
          c.steps.map(function (name, k) { return '<div class="big"><b>' + cur.funnel[k] + '</b><span>sessions with ' + esc(name) + (k ? ', ' + (cur.funnel[k] / cur.funnel[k - 1] * 100).toFixed(0) + ' percent of the step before' : '') + '</span></div>'; }).join('') + '</div></div>';
        box.innerHTML = h;
        u.bindCodes(box);
        A.bindWidget = function (act, el) { if (act === 'ss-n') st.n = +el.getAttribute('data-v'); A.render(true); };
      }
    };
    SQ.info.sessions = { counts: C, mins: mins };
  })();

  /* ====================== mission 9: the slowly changing dimension lab ====================== */
  (function () {
    var STAGES = [
      { label: 'Before', key: 'm9.scd2_before' },
      { label: '1 Close the old row', key: 'm9.scd2_closed' },
      { label: '2 Insert the new rows', key: 'm9.scd2_final' },
      { label: '3 Run it again', key: 'm9.scd2' },
      { label: 'Orders by tier', key: 'm9.scd_compare' }
    ];
    var NOTES = [
      'The dimension before the change feed. Customer 2 is silver and current. Customer 9 does not exist yet.',
      'Step 1 closes the current row of every customer whose tier changed. Only customer 2 changed, from silver to gold, so one row gets valid_to 2026-03-09 and is_current false. Customers 1 and 4 are in the feed with the tier they already have, so they stay as they are.',
      'Step 2 inserts a current row for every customer in the feed that has no current row with that tier: customer 2 (gold, valid from 2026-03-10) and the new customer 9. The keys continue after the highest key, 5.',
      'Both steps ran again. The dimension has the same 7 rows, because the first step finds nothing to close and the second finds nothing to insert. That is what makes the job safe to retry.',
      'The orders joined to the dimension by date. Orders 1003 and 1012 of customer 2 were placed before 10 March, so with history they are silver. If the tier had been overwritten (type 1) they would be gold, and the history of what was true when the order was placed would be lost.'
    ];
    function tab(i) { return G.on(STAGES[i].key, 'duckdb'); }
    function stmt(code, startRe, nth) {
      var l = code.split('\n'), c = 0, a = -1, b = -1, i;
      for (i = 0; i < l.length; i++) if (startRe.test(l[i]) && ++c === nth) { a = i + 1; break; }
      if (a < 0) throw new Error('no statement ' + startRe + ' number ' + nth);
      for (i = a - 1; i < l.length; i++) if (/;\s*$/.test(l[i])) { b = i + 1; break; }
      return [a, b];
    }
    function ranges(code) { return [[1, 1], stmt(code, /^UPDATE dim/, 1), stmt(code, /^INSERT INTO dim/, 1), [stmt(code, /^UPDATE dim/, 2)[0], stmt(code, /^INSERT INTO dim/, 2)[1]], null]; }
    W.scd2 = {
      steps: function () { return 1; },
      hint: 'Press the stages in order.',
      say: function () { return 'A customer dimension that keeps history. Press the stages to see each statement run on the change feed: one row is closed, two rows are inserted, and a second run changes nothing. DuckDB, PostgreSQL and SQLite returned the same rows at every stage.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var u = SQ.u, st = A.local.sc || (A.local.sc = { n: 0 }), t = tab(st.n), prev = st.n > 0 && st.n < 4 ? tab(st.n - 1) : null, code = G.file('m9.scd2'), rg = ranges(code)[st.n];
        var keyOf = function (r) { return r[0]; }, prevKeys = prev ? prev.rows.map(keyOf) : [];
        var rowCls = function (r, k) {
          if (st.n === 4) return r[2] !== r[3] ? 'cur' : '';
          if (!prev) return '';
          if (prevKeys.indexOf(r[0]) < 0) return 'new';
          return JSON.stringify(prev.rows[prevKeys.indexOf(r[0])]) !== JSON.stringify(r) ? 'cur' : '';
        };
        var h = '<div class="lab"><div class="sel-chips">' + u.chips(STAGES.map(function (x, k) { return k; }), st.n, 'sc-n', function (k) { return STAGES[k].label; }) + '</div>' +
          (rg ? u.code('the statements, with the stage lit', 'sql', code, rg) : u.code('the join of the orders to the dimension', 'sql', G.file('m9.scd_compare'), null)) +
          '<p class="lab-note">' + md(NOTES[st.n]) + '</p>' + u.table(t.cols, t.rows, rowCls) +
          '<div class="lab-out"><div class="big"><b>' + t.rows.length + '</b><span>rows in the table</span></div>' +
          (st.n < 4 ? '<div class="big ' + (st.n === 3 ? 'good' : '') + '"><b>' + t.rows.filter(function (r) { return r[5] === 'true'; }).length + '</b><span>current rows (one for each customer)</span></div>' : '<div class="big warn"><b>' + t.rows.filter(function (r) { return r[2] !== r[3]; }).length + '</b><span>orders that overwriting would relabel</span></div>') + '</div></div>';
        box.innerHTML = h;
        u.bindCodes(box);
        A.bindWidget = function (act, el) { if (act === 'sc-n') st.n = +el.getAttribute('data-v'); A.render(true); };
      }
    };
    SQ.info.scd2 = { stages: STAGES, tab: tab };
  })();

  /* ====================== mission 10: two sessions, one table (isolation) ====================== */
  (function () {
    var LEVEL_NOTE = {
      'read committed': 'Each statement sees the rows that were committed when it started. This is the default of PostgreSQL.',
      'repeatable read': 'The transaction sees one snapshot, taken at its first statement. Later commits of other sessions stay invisible to it.',
      'serializable': 'Like repeatable read, and the engine also watches for patterns that no one-at-a-time order could produce. It stops one transaction with a serialization failure, and the application retries it.'
    };
    function C() { return G.counts('m10.lab'); }
    W.isolation = {
      steps: function () { return 1; },
      hint: 'Pick a problem and an isolation level.',
      say: function () { return 'Two real PostgreSQL sessions, A and B, ran each script in the order shown. Pick a problem and an isolation level. A red result is an error that the engine raised. The verdict says whether the problem happened.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var c = C(), st = A.local.iso || (A.local.iso = { sc: 'nonrep', lv: 'read committed' }), run = c.runs[st.sc + '|' + st.lv];
        var meta = c.scenarios.filter(function (m) { return m.id === st.sc; })[0];
        var u = SQ.u;
        var rows = run.steps.map(function (x, k) {
          var bad = /^ERROR/.test(x.out), cell = '<code>' + esc(x.sql) + '</code><div class="tx-out' + (bad ? ' bad' : '') + '">' + esc(x.out) + '</div>';
          return '<tr><td>' + (k + 1) + '</td><td>' + (x.who === 'A' ? cell : '') + '</td><td>' + (x.who === 'B' ? cell : '') + '</td></tr>';
        }).join('');
        var h = '<div class="lab"><div class="lab-h">Problem</div><div class="sel-chips">' + u.chips(c.scenarios.map(function (m) { return m.id; }), st.sc, 'is-sc', function (k) { return c.scenarios.filter(function (m) { return m.id === k; })[0].title; }) + '</div>' +
          '<div class="lab-h">Isolation level</div><div class="sel-chips">' + u.chips(c.levels, st.lv, 'is-lv') + '</div>' +
          '<p class="lab-note"><b>' + esc(meta.question) + '</b> ' + md(LEVEL_NOTE[st.lv]) + '</p>' +
          '<div class="tbl-wrap"><table class="tbl tx"><thead><tr><th>#</th><th>Session A</th><th>Session B</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
          '<div class="lab-out"><div class="big ' + (run.anomaly ? 'bad' : 'good') + '"><b>' + (run.anomaly ? 'it happened' : 'prevented') + '</b><span>' + esc(meta.title) + ' at ' + esc(st.lv) + '</span></div>' +
          '<div class="big"><b>' + esc(run.final) + '</b><span>' + esc(meta.final_sql) + '</span></div></div></div>';
        box.innerHTML = h;
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'is-sc') st.sc = v; else if (act === 'is-lv') st.lv = v; A.render(true); };
      }
    };
    SQ.info.isolation = { counts: C };
  })();

  /* ====================== mission 10: a recorded transcript of two sessions ====================== */
  (function () {
    W.txlog = {
      steps: function () { return 1; },
      hint: 'Read the two columns from top to bottom. The numbers give the order in time.',
      say: function (s) { return s.text; },
      mood: function (s) { return s.mood || 'think'; },
      render: function (box, s, i, A) {
        var o = G.counts(s.key);
        if (s.variant) o = o[s.variant];
        var two = o.steps.some(function (x) { return x.who === 'B'; });
        var rows = o.steps.map(function (x, k) {
          var bad = /ERROR/.test(x.out), cell = '<code>' + esc(x.sql) + '</code><div class="tx-out' + (bad ? ' bad' : '') + '">' + esc(x.out) + '</div>';
          return '<tr><td>' + (k + 1) + '</td><td>' + (x.who === 'A' ? cell : '') + '</td>' + (two ? '<td>' + (x.who === 'B' ? cell : '') + '</td>' : '') + '</tr>';
        }).join('');
        var h = '<div class="lab"><div class="tbl-wrap"><table class="tbl tx"><thead><tr><th>#</th><th>Session A</th>' + (two ? '<th>Session B</th>' : '') + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
          ((s.tiles || []).length ? '<div class="lab-out">' + s.tiles.map(function (t) { return '<div class="big ' + (t[2] || '') + '"><b>' + esc(t[0]) + '</b><span>' + esc(t[1]) + '</span></div>'; }).join('') + '</div>' : '') +
          (s.note ? '<p class="lab-note">' + md(s.note) + '</p>' : '') + '</div>';
        box.innerHTML = h;
      }
    };
    SQ.info.txlog = {};
  })();

  /* ====================== mission 11: the plan lab ====================== */
  (function () {
    function C() { return G.counts('m11.lab'); }
    function pct(a, b) { return (a / b * 100).toFixed(1).replace(/\.0$/, ''); }
    W.plan = {
      steps: function () { return 1; },
      hint: 'Pick a query, then a design, and compare the rows read.',
      say: function () { return 'Six queries on 30,000 orders, each with and without an index. These are real EXPLAIN ANALYZE plans from PostgreSQL. Compare the rows that the scan read with the rows that matched. A good index makes those two numbers close. A bad one is not used at all.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var u = SQ.u, c = C(), st = A.local.pl || (A.local.pl = { sc: 'point', d: 'order_id' });
        var sc = c.lab[st.sc];
        if (sc.designs.indexOf(st.d) < 0) st.d = sc.designs[sc.designs.length - 1];
        var r = sc.runs[st.d];
        var h = '<div class="lab"><div class="lab-h">Query</div><div class="sel-chips">' + u.chips(c.scenarios, st.sc, 'pl-sc', function (k) { return c.lab[k].title; }) + '</div>' +
          u.code('the query', 'sql', sc.sql, null) +
          '<div class="lab-h">Index design</div><div class="sel-chips">' + u.chips(sc.designs, st.d, 'pl-d', function (k) { return sc.runs[k].label; }) + '</div>' +
          (r.ddl ? u.code('the index', 'sql', r.ddl, null) : '') +
          '<h3 class="lab-h">PostgreSQL plan (EXPLAIN ANALYZE, rows only)</h3>' + u.pre(r.plan) +
          '<div class="lab-out"><div class="big"><b>' + esc(r.scan) + '</b><span>how the table was read</span></div>' +
          '<div class="big"><b>' + r.rows_matched.toLocaleString('en-US') + '</b><span>rows that matched</span></div>' +
          '<div class="big ' + (r.rows_read > 3 * Math.max(r.rows_matched, 1) ? 'warn' : 'good') + '"><b>' + r.rows_read.toLocaleString('en-US') + '</b><span>rows read from the table (' + pct(r.rows_read, c.table_rows) + ' percent of ' + c.table_rows.toLocaleString('en-US') + ')</span></div></div>' +
          (r.buffers ? '<h3 class="lab-h">The same plan with BUFFERS: pages touched</h3>' + u.pre(r.buffers) : '') + '</div>';
        box.innerHTML = h;
        u.bindCodes(box);
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'pl-sc') { st.sc = v; st.d = c.lab[v].designs[c.lab[v].designs.length - 1]; } else if (act === 'pl-d') st.d = v; A.render(true); };
      }
    };
    SQ.info.plan = { counts: C };
  })();

  /* ====================== mission 12: the grain lab ====================== */
  (function () {
    var GRAINS = [
      { id: 'order', key: 'm12.grain_order', title: 'One row for each order', measure: 'total', can: ['Number of orders (count)', 'Average order value', 'Revenue by store, day or customer'], cannot: ['Revenue by product or category', 'Quantity sold'] },
      { id: 'line', key: 'm12.grain_line', title: 'One row for each order line', measure: 'line_amount', can: ['Revenue by product and category', 'Quantity sold', 'Revenue by store, day or customer'], cannot: ['A plain count(*) as the number of orders: it counts lines', 'Average per row as the average order value'] },
      { id: 'store', key: 'm12.grain_store', title: 'One row for each store (a summary)', measure: 'revenue', can: ['Revenue by store'], cannot: ['Orders, products, days or customers: the detail is gone', 'Anything that needs another grouping'] },
      { id: 'customer', key: 'm12.grain_customer', title: 'One row for each customer (a summary)', measure: 'revenue', can: ['Revenue by customer'], cannot: ['Orders, products, days or stores: the detail is gone'] }
    ];
    function t(g) { return G.on(g.key, 'duckdb'); }
    W.grain = {
      steps: function () { return 1; },
      hint: 'Pick a grain and read what it can answer.',
      say: function () { return 'The grain is what one row of a table stands for. The same 156.00 of orders is stored at four grains. Pick one and see how many rows it needs, what you can still ask, and which familiar numbers turn into wrong answers.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var u = SQ.u, st = A.local.gr || (A.local.gr = { g: 'line' }), g = GRAINS.filter(function (x) { return x.id === st.g; })[0], r = t(g).rows[0], cols = t(g).cols;
        var v = function (c) { return r[cols.indexOf(c)]; };
        var h = '<div class="lab"><div class="lab-h">Grain of the table</div><div class="sel-chips">' + u.chips(GRAINS.map(function (x) { return x.id; }), st.g, 'gr-g', function (k) { return GRAINS.filter(function (x) { return x.id === k; })[0].title; }) + '</div>' +
          '<div class="lab-out"><div class="big"><b>' + v('rows_in_table') + '</b><span>rows in the table</span></div><div class="big good"><b>' + v('total') + '</b><span>sum of ' + esc(g.measure) + ': the money always adds up</span></div>' +
          '<div class="big ' + (g.id === 'order' ? 'good' : 'bad') + '"><b>' + v('rows_in_table') + '</b><span>what count(*) returns, against ' + G.on('m12.grain_order', 'duckdb').rows[0][0] + ' real orders</span></div>' +
          '<div class="big ' + (g.id === 'order' ? 'good' : 'bad') + '"><b>' + v('avg_per_row') + '</b><span>average of ' + esc(g.measure) + ' per row, against ' + G.on('m12.grain_order', 'duckdb').rows[0][3] + ' for an order</span></div></div>' +
          '<div class="pair"><div><h3 class="lab-h">You can still answer</h3><ul class="notes">' + g.can.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
          '<div><h3 class="lab-h">You cannot, or the answer is wrong</h3><ul class="notes">' + g.cannot.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div></div>' +
          '<p class="lab-note">The row counts and sums were returned by DuckDB and PostgreSQL, which agreed. The lists of questions are design reasoning from the columns that each table keeps.</p></div>';
        box.innerHTML = h;
        A.bindWidget = function (act, el) { if (act === 'gr-g') st.g = el.getAttribute('data-v'); A.render(true); };
      }
    };
    SQ.info.grain = { grains: GRAINS, tab: t };
  })();
})();
