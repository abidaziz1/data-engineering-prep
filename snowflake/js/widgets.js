/* Snowflake lab widgets. Each one registers LAB.W.<kind> with steps, say, render.
   The numbers inside are illustrative on purpose: they teach the shape of the trade-off, not a benchmark. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var W = (LAB.W = LAB.W || {});
  var esc = LAB.esc, md = LAB.md;

  function bar(pct, cls) { return '<span class="wbar' + (cls ? ' ' + cls : '') + '"><i style="width:' + Math.max(3, Math.min(100, Math.round(pct))) + '%"></i></span>'; }
  function dur(s) { if (s >= 120) return (Math.round(s / 6) / 10) + ' min'; return (s % 1 === 0 ? s : s.toFixed(1)) + ' s'; }
  function cr(x) { return x >= 10 ? x.toFixed(1) : (x >= 0.1 ? x.toFixed(2) : x.toFixed(4)); }
  function sqlBox(code) { return '<div class="prune-sql">' + LAB.hl(code, 'sql').join('\n') + '</div>'; }

  /* ====================== Warehouse sizing lab ====================== */
  (function () {
    var SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL'], RATE = [1, 2, 4, 8, 16, 32];
    var RUN = { big: [960, 490, 250, 130, 75, 50], small: [4.0, 3.9, 3.8, 3.8, 3.7, 3.7] };
    var SQLX = {
      big: 'SELECT country, SUM(total_usd)\nFROM brewline.core.orders   -- about 2 TB, six years of orders\nGROUP BY country;',
      small: "SELECT * FROM brewline.core.dim_product\nWHERE product_id = 'P-10';   -- one 30 MB table"
    };
    W.wh = {
      steps: function () { return 3; },
      hint: 'Click Run on each size, then press Next.',
      say: function (s, i) {
        return [
          'Same query, six warehouse sizes. Pick a query, then click Run on each size. Watch two numbers: how long it takes and how many credits it uses. Start with the big scan.',
          'Look at the big scan. Runtime falls from 16 minutes to 50 seconds, yet credits barely move. Each size doubles the hourly rate and halves the runtime, so the bill stays almost flat until scaling stops. Now switch to the small lookup and compare.',
          'This is the rule to remember. A bigger warehouse is nearly free while the runtime keeps halving, and pure waste once it stops. Test it by doubling the size once and measuring.'
        ][i];
      },
      mood: function (s, i) { return i === 1 ? 'wow' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.wh || (A.local.wh = { q: 'big', done: {} });
        var run = RUN[st.q];
        var costs = run.map(function (t, k) { return RATE[k] * t / 3600; });
        var maxT = run[0], maxC = Math.max.apply(null, costs);
        var shown = SIZES.map(function (_, k) { return i >= 1 || !!st.done[st.q + k]; });
        var minC = Infinity, minT = Infinity;
        costs.forEach(function (c, k) { if (shown[k]) { minC = Math.min(minC, c); minT = Math.min(minT, run[k]); } });
        var h = '<div class="lab"><div class="seg2"><button type="button" class="tg' + (st.q === 'big' ? ' on' : '') + '" data-act="wh-q" data-v="big">Big scan, 2 TB</button><button type="button" class="tg' + (st.q === 'small' ? ' on' : '') + '" data-act="wh-q" data-v="small">Small lookup, 30 MB</button></div>' +
          sqlBox(SQLX[st.q]) +
          '<div class="tbl-wrap"><table class="tbl wtbl"><thead><tr><th>Size</th><th>Credits per hour</th><th>Runtime</th><th>Credits used</th></tr></thead><tbody>';
        SIZES.forEach(function (sz, k) {
          if (shown[k]) {
            var tag = (costs[k] === minC ? '<span class="wtag cheap">cheapest</span>' : '') + (run[k] === minT ? '<span class="wtag fast">fastest</span>' : '');
            h += '<tr><td><b>' + sz + '</b></td><td>' + RATE[k] + '</td><td>' + bar(run[k] / maxT * 100, 'time') + dur(run[k]) + '</td><td>' + bar(costs[k] / maxC * 100, 'cost') + cr(costs[k]) + tag + '</td></tr>';
          } else {
            h += '<tr><td><b>' + sz + '</b></td><td>' + RATE[k] + '</td><td colspan="2"><button type="button" class="btn-run lab-run" data-act="wh-run" data-v="' + k + '">Run on ' + sz + '</button></td></tr>';
          }
        });
        h += '</tbody></table></div>';
        if (i === 0) h += '<p class="lab-note">Illustrative numbers. Real scaling depends on the query, the data and the join shape.</p>';
        if (i === 1) {
          h += st.q === 'big'
            ? '<div class="callout good"><b>Big scan.</b> Credits stay between 0.27 and 0.44 while the runtime falls about 19 times. The query is compute-bound, so a bigger warehouse pays for itself in your time.</div>'
            : '<div class="callout bad"><b>Small lookup.</b> The runtime barely changes, but credits grow about 30 times. The query was never limited by compute, so a bigger warehouse only costs more.</div>';
        }
        if (i === 2) {
          h += '<div class="callout tip"><b>How to decide.</b> Scale up when one query is slow and the profile shows a large scan or spilling. Do not scale up for small queries, for queueing, or for poor pruning. Double the size once: if the runtime does not drop by about half, stop and look at the query.</div>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) {
          if (act === 'wh-q') { st.q = el.getAttribute('data-v'); A.render(true); }
          if (act === 'wh-run') { st.done[st.q + el.getAttribute('data-v')] = 1; A.render(true); }
        };
      }
    };
  })();

  /* ====================== Auto-suspend and idle cost ====================== */
  (function () {
    var SUS = [[60, '60 seconds'], [300, '5 minutes'], [600, '10 minutes'], [0, 'Never']];
    var GAP = [[120, 'every 2 minutes'], [480, 'every 8 minutes'], [1800, 'every 30 minutes']];
    function calc(sus, gap) {
      var work = 36000, q = 20, n = Math.floor(work / gap), busy = n * q, billed;
      if (sus === 0) billed = 86400;
      else if (gap <= q + sus) billed = work;
      else billed = n * Math.max(60, q + sus);
      return { busy: busy, billed: billed, credits: 4 * billed / 3600, idle: 1 - busy / billed };
    }
    function hrs(s) { return (Math.round(s / 360) / 10) + ' h'; }
    W.idle = {
      steps: function () { return 2; },
      hint: 'Pick an auto-suspend time and how often someone queries.',
      say: function (s, i) {
        return [
          'A Medium warehouse (4 credits per hour) serves a dashboard for 10 hours a day. Each query takes 20 seconds. Pick how long the warehouse waits before it suspends and how often someone runs a query. Watch how much of the bill is idle time.',
          'The cheapest setting is not always the best one. A suspended warehouse loses its local cache, so the next query reads from storage again. For a dashboard used every few minutes, a longer auto-suspend keeps it warm. For a job that runs once an hour, 60 seconds is right.'
        ][i];
      },
      mood: function (s, i) { return i === 0 ? 'think' : 'happy'; },
      render: function (box, s, i, A) {
        var st = A.local.idle || (A.local.idle = { sus: 60, gap: 480 });
        var h = '<div class="lab"><div class="lab-row"><span class="lab-l">Auto-suspend</span><span class="seg2">' +
          SUS.map(function (o) { return '<button type="button" class="tg' + (st.sus === o[0] ? ' on' : '') + '" data-act="id-sus" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</span></div>' +
          '<div class="lab-row"><span class="lab-l">A query runs</span><span class="seg2">' +
          GAP.map(function (o) { return '<button type="button" class="tg' + (st.gap === o[0] ? ' on' : '') + '" data-act="id-gap" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</span></div>';
        var r = calc(st.sus, st.gap);
        h += '<div class="lab-out"><div class="big"><b>' + cr(r.credits) + '</b><span>credits per day</span></div>' +
          '<div class="big"><b>' + hrs(r.billed) + '</b><span>billed</span></div>' +
          '<div class="big"><b>' + Math.round(r.busy / 60) + ' min</b><span>running queries</span></div>' +
          '<div class="big warn"><b>' + Math.round(r.idle * 100) + '%</b><span>idle time you pay for</span></div></div>';
        if (i === 1) {
          h += '<div class="tbl-wrap"><table class="tbl wtbl"><thead><tr><th>Auto-suspend</th><th>Billed</th><th>Credits per day</th><th>Idle share</th></tr></thead><tbody>' +
            SUS.map(function (o) {
              var c = calc(o[0], st.gap);
              return '<tr class="' + (o[0] === st.sus ? 'trk' : '') + '"><td><b>' + o[1] + '</b></td><td>' + hrs(c.billed) + '</td><td>' + bar(c.credits / 96 * 100, 'cost') + cr(c.credits) + '</td><td>' + Math.round(c.idle * 100) + '%</td></tr>';
            }).join('') + '</tbody></table></div>' +
            '<div class="callout warn"><b>Not modeled here.</b> Each suspend clears the warehouse cache, so the first query after a resume is slower. With a query every 2 minutes, 60 seconds saves credits but makes users wait for cold reads. Measure both before you choose.</div>';
        } else {
          h += '<p class="lab-note">One resume bills at least 60 seconds. A warehouse that never suspends bills all 24 hours.</p>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) {
          if (act === 'id-sus') { st.sus = +el.getAttribute('data-v'); A.render(true); }
          if (act === 'id-gap') { st.gap = +el.getAttribute('data-v'); A.render(true); }
        };
      }
    };
  })();

  /* ====================== Multi-cluster queue ====================== */
  (function () {
    var MODES = [['one', 'One cluster', 1], ['m3', 'Multi-cluster, max 3', 3], ['m8', 'Multi-cluster, max 8', 8]];
    var LOADS = [5, 24, 60];
    function sim(max, n) {
      var clusters = Math.min(max, Math.max(1, Math.ceil(n / 8))), cap = clusters * 8, run = Math.min(n, cap);
      return { clusters: clusters, run: run, queued: n - run, wait: (Math.ceil(n / cap) - 1) * 20 };
    }
    W.queue = {
      steps: function () { return 2; },
      hint: 'Pick a setup and a load.',
      say: function (s, i) {
        return [
          'It is 9 AM and everyone opens the same dashboard at once. One cluster runs up to 8 queries at the same time, and each query here takes 20 seconds. Pick a setup and a load. Filled squares are running. The rest wait in the queue.',
          'The table shows the longest wait for every combination. A bigger warehouse would not fix any of these waits, because every query is already fast. More clusters add more places to run at once.'
        ][i];
      },
      mood: function (s, i) { return i === 0 ? 'think' : 'happy'; },
      render: function (box, s, i, A) {
        var st = A.local.queue || (A.local.queue = { mode: 'one', n: 24 });
        var max = MODES.filter(function (m) { return m[0] === st.mode; })[0][2];
        var h = '<div class="lab"><div class="lab-row"><span class="lab-l">Warehouse</span><span class="seg2">' +
          MODES.map(function (m) { return '<button type="button" class="tg' + (st.mode === m[0] ? ' on' : '') + '" data-act="qu-mode" data-v="' + m[0] + '">' + m[1] + '</button>'; }).join('') + '</span></div>' +
          '<div class="lab-row"><span class="lab-l">Queries at once</span><span class="seg2">' +
          LOADS.map(function (n) { return '<button type="button" class="tg' + (st.n === n ? ' on' : '') + '" data-act="qu-n" data-v="' + n + '">' + n + ' users</button>'; }).join('') + '</span></div>';
        var r = sim(max, st.n);
        h += '<div class="clusters">';
        for (var c = 0; c < r.clusters; c++) {
          var inC = Math.max(0, Math.min(8, r.run - c * 8));
          h += '<div class="cl"><b>Cluster ' + (c + 1) + '</b><div class="slots">';
          for (var k = 0; k < 8; k++) h += '<i class="' + (k < inC ? 'run' : '') + '"></i>';
          h += '</div></div>';
        }
        h += '</div><div class="lab-out"><div class="big"><b>' + r.run + '</b><span>running now</span></div><div class="big' + (r.queued ? ' warn' : '') + '"><b>' + r.queued + '</b><span>waiting in the queue</span></div><div class="big' + (r.wait ? ' warn' : '') + '"><b>' + (r.wait ? r.wait + ' s' : 'none') + '</b><span>longest wait</span></div></div>';
        if (i === 1) {
          h += '<div class="tbl-wrap"><table class="tbl wtbl"><thead><tr><th>Longest wait</th>' + LOADS.map(function (n) { return '<th>' + n + ' users</th>'; }).join('') + '</tr></thead><tbody>' +
            MODES.map(function (m) { return '<tr><td><b>' + m[1] + '</b></td>' + LOADS.map(function (n) { var x = sim(m[2], n); return '<td class="' + (x.wait ? 'wbad' : 'wgood') + '">' + (x.wait ? x.wait + ' s' : 'none') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' +
            '<div class="callout tip"><b>Scaling policy.</b> STANDARD starts another cluster as soon as queries queue. ECONOMY waits until it can keep a new cluster busy for about 6 minutes, which saves credits and lets the queue grow. Each running cluster bills at the full hourly rate.</div>' +
            '<p class="lab-note">Eight queries per cluster is the default MAX_CONCURRENCY_LEVEL. Heavy queries use more of a cluster, so fewer fit.</p>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) {
          if (act === 'qu-mode') { st.mode = el.getAttribute('data-v'); A.render(true); }
          if (act === 'qu-n') { st.n = +el.getAttribute('data-v'); A.render(true); }
        };
      }
    };
  })();
})();
