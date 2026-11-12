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
})();
