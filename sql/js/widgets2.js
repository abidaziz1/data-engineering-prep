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
})();
