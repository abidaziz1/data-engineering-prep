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

  /* ====================== Time Travel rescue ====================== */
  (function () {
    var OPTS = [
      { k: 'o5', sql: 'AT(OFFSET => -300)', when: '5 minutes ago, 14:15', pos: 91.7 },
      { k: 'o10', sql: 'AT(OFFSET => -600)', when: '10 minutes ago, 14:10', pos: 83.3 },
      { k: 'o20', sql: 'AT(OFFSET => -1200)', when: '20 minutes ago, 14:00', pos: 66.7 },
      { k: 'o60', sql: 'AT(OFFSET => -3600)', when: '1 hour ago, 13:20', pos: 0 },
      { k: 'bs', sql: "BEFORE(STATEMENT => '01b2c3d4-0000-1234-0000-000000000001')", when: 'just before the DELETE statement ran', pos: 74.5 }
    ];
    var TYPES = [['tr', 'Transient table', 1, false], ['st', 'Permanent, Standard edition', 1, true], ['en', 'Permanent, Enterprise, 90 days', 90, true]];
    var AGES = [['h1', '1 hour ago', 0.04], ['d2', '2 days ago', 2], ['d10', '10 days ago', 10], ['d100', '100 days ago', 100]];
    function outcome(t, age) {
      if (age <= t[2]) return ['good', 'Time Travel', 'You can query the old state and restore it yourself, with plain SQL.'];
      if (t[3] && age <= t[2] + 7) return ['warn', 'Fail-safe', 'Only Snowflake Support can attempt a recovery. There is no promise and no timeline.'];
      return ['bad', 'Gone', t[3] ? 'Both the retention period and the 7 day Fail-safe window have ended.' : 'Transient tables have no Fail-safe, so nothing is left.'];
    }
    W.tt = {
      steps: function () { return 2; },
      hint: function (s, i) { return i === 0 ? 'Try each point in time.' : 'Pick a table type and an accident age.'; },
      say: function (s, i) {
        return [
          'It is 14:20. At 14:05 someone ran DELETE on core.orders by mistake, and the table is empty. Time Travel can read the table as it was earlier. Pick a point in time and see whether the rows are there.',
          'How far back you can go depends on the table type, the edition and the retention setting. Pick a table and an accident age. Green means you fix it yourself. Amber means only Snowflake Support can try. Red means it is gone.'
        ][i];
      },
      mood: function (s, i) { return i === 0 ? 'oops' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.tt || (A.local.tt = { o: null, type: 'en', age: 'd10' });
        var h = '<div class="lab">';
        if (i === 0) {
          var o = OPTS.filter(function (x) { return x.k === st.o; })[0];
          h += '<div class="tt-wrap"><div class="tt-bar"><i class="ok" style="width:75%"></i><i class="gone" style="width:25%"></i>' + (o ? '<b class="mk" style="left:' + o.pos + '%"></b>' : '') + '</div>' +
            '<div class="tt-ticks"><span style="left:0">13:20</span><span style="left:75%">14:05 DELETE</span><span style="right:0">14:20 now</span></div></div>' +
            '<div class="seg2">' + OPTS.map(function (x) { return '<button type="button" class="tg' + (st.o === x.k ? ' on' : '') + '" data-act="tt-o" data-v="' + x.k + '">' + (x.k === 'bs' ? 'BEFORE(STATEMENT)' : x.sql) + '</button>'; }).join('') + '</div>';
          if (o) {
            var rows = o.pos < 75 ? '10,000' : '0';
            h += sqlBox('SELECT COUNT(*) FROM core.orders\n  ' + o.sql + ';') +
              '<div class="lab-out"><div class="big' + (o.pos < 75 ? '' : ' warn') + '"><b>' + rows + '</b><span>rows ' + esc(o.when) + '</span></div></div>' +
              (o.pos < 75 ? '<div class="callout good"><b>The rows are still there.</b> Clone or copy from this point in time to restore them.</div>' : '<div class="callout bad"><b>Too late.</b> That moment is after the DELETE, so the table was already empty. Go further back.</div>');
          } else h += '<p class="lab-note">Choose a point in time to query.</p>';
        } else {
          var t = TYPES.filter(function (x) { return x[0] === st.type; })[0], a = AGES.filter(function (x) { return x[0] === st.age; })[0];
          var r = outcome(t, a[2]);
          h += '<div class="lab-row"><span class="lab-l">The table is</span><span class="seg2">' + TYPES.map(function (x) { return '<button type="button" class="tg' + (st.type === x[0] ? ' on' : '') + '" data-act="tt-t" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</span></div>' +
            '<div class="lab-row"><span class="lab-l">The mistake was</span><span class="seg2">' + AGES.map(function (x) { return '<button type="button" class="tg' + (st.age === x[0] ? ' on' : '') + '" data-act="tt-a" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</span></div>' +
            '<div class="callout ' + r[0] + '"><b>' + r[1] + '.</b> ' + esc(r[2]) + '</div>' +
            '<div class="tbl-wrap"><table class="tbl wtbl"><thead><tr><th>Table</th><th>Time Travel</th><th>Fail-safe</th></tr></thead><tbody>' +
            TYPES.map(function (x) { return '<tr class="' + (x[0] === st.type ? 'trk' : '') + '"><td><b>' + x[1] + '</b></td><td>up to ' + x[2] + (x[2] === 1 ? ' day' : ' days') + '</td><td>' + (x[3] ? '7 days after' : 'none') + '</td></tr>'; }).join('') + '</tbody></table></div>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'tt-o') st.o = v; if (act === 'tt-t') st.type = v; if (act === 'tt-a') st.age = v;
          A.render(true);
        };
      }
    };
  })();

  /* ====================== Zero-copy clone ====================== */
  (function () {
    var CU = [1, 2, 0, 4, 5, 3], PU = [3, 4, 5, 0, 1, 2];
    function fresh() { return { prod: [1, 2, 3, 4, 5, 6], clone: null, next: 7, cu: 0, pu: 0, dropped: false }; }
    function tiles(list, other, who) {
      return list.map(function (n) { var shared = other && other.indexOf(n) >= 0; return '<span class="tile ' + (shared ? 'shared' : who) + '">P' + n + '</span>'; }).join('') || '<span class="lab-note">none</span>';
    }
    W.clone = {
      steps: function () { return 2; },
      hint: function (s, i) { return i === 0 ? 'Press the buttons in any order.' : 'Press Next.'; },
      say: function (s, i) {
        return [
          'Here is a table made of six micro-partitions. Press Clone and watch how much storage the clone needs. Then change data on either side and watch what happens.',
          'A clone is metadata. It points at the same partitions until one side changes, and only the changed partitions cost extra storage. That is why a clone is instant and why it makes a safe dev copy or a snapshot before a risky change.'
        ][i];
      },
      mood: function (s, i) { return i === 0 ? 'think' : 'cheer'; },
      render: function (box, s, i, A) {
        var st = A.local.clone || (A.local.clone = fresh());
        var all = {};
        st.prod.concat(st.clone || []).forEach(function (n) { all[n] = 1; });
        var stored = Object.keys(all).length;
        var base = 6;
        var h = '<div class="lab"><div class="seg2">' +
          '<button type="button" class="btn-run lab-run" data-act="cl-clone"' + (st.clone ? ' disabled' : '') + '>CREATE TABLE ... CLONE</button>' +
          '<button type="button" class="tg" data-act="cl-upc"' + (st.clone && st.cu < 6 ? '' : ' disabled') + '>Update rows in the clone</button>' +
          '<button type="button" class="tg" data-act="cl-upp"' + (!st.dropped && st.pu < 6 ? '' : ' disabled') + '>Update rows in the original</button>' +
          '<button type="button" class="tg" data-act="cl-drop"' + (!st.dropped ? '' : ' disabled') + '>Drop the original</button>' +
          '<button type="button" class="tg" data-act="cl-reset">Reset</button></div>' +
          '<div class="clrow"><span class="lab-l">Original</span><span class="tiles">' + (st.dropped ? '<span class="lab-note">dropped</span>' : tiles(st.prod, st.clone, 'prodonly')) + '</span></div>' +
          '<div class="clrow"><span class="lab-l">Clone</span><span class="tiles">' + (st.clone ? tiles(st.clone, st.dropped ? null : st.prod, 'cloneonly') : '<span class="lab-note">not created yet</span>') + '</span></div>' +
          '<div class="lab-out"><div class="big"><b>' + stored + '</b><span>partitions stored in total (' + base + ' before the clone)</span></div>' +
          '<div class="big"><b>' + (st.clone ? st.clone.filter(function (n) { return n > 6; }).length : 0) + '</b><span>new partitions only the clone owns</span></div></div>' +
          '<p class="lab-note">Blue tiles are shared by both tables. Green belongs only to the original, orange only to the clone.</p>';
        if (i === 1) h += '<div class="callout tip"><b>Remember.</b> Cloning copies no data, so a 20 TB database clones in seconds. You pay only for partitions that change after the clone. A clone does not copy the privileges granted on the source object itself, so grant access again.</div>';
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act) {
          if (act === 'cl-clone' && !st.clone) st.clone = st.prod.slice();
          if (act === 'cl-upc' && st.clone && st.cu < 6) { st.clone[CU[st.cu++]] = st.next++; }
          if (act === 'cl-upp' && !st.dropped && st.pu < 6) { st.prod[PU[st.pu++]] = st.next++; }
          if (act === 'cl-drop') { st.dropped = true; st.prod = []; }
          if (act === 'cl-reset') { A.local.clone = fresh(); }
          A.render(true);
        };
      }
    };
  })();

  /* ====================== Micro-partition pruning ====================== */
  (function () {
    var RAWP = [[1, 28], [2, 30], [1, 31], [3, 29], [1, 26], [5, 31], [2, 27], [4, 30], [1, 31], [6, 29], [10, 18], [20, 31]];
    var CLUP = [[1, 3], [3, 5], [5, 8], [8, 10], [10, 13], [13, 15], [15, 18], [18, 20], [20, 23], [23, 25], [25, 28], [28, 31]];
    function d2(n) { return (n < 10 ? '0' : '') + n; }
    W.prune = {
      steps: function () { return 3; },
      hint: 'Press Run query for each layout, then Next.',
      say: function (s, i) {
        return [
          'Snowflake stores a table as micro-partitions and remembers the minimum and maximum of every column for each one. Run the query on the table as loaded and count how many partitions it has to read.',
          'Now switch to the clustered layout and run the same query. The data is the same. Only the physical order changed. Fewer partitions overlap the date, so the rest are skipped.',
          'That skipping is called pruning. Clustering helps only when the table is big and queries filter on the clustering column. On small tables you pay for reclustering and gain nothing.'
        ][i];
      },
      mood: function (s, i) { return i === 1 ? 'wow' : 'happy'; },
      render: function (box, s, i, A) {
        var st = A.local.prune || (A.local.prune = { clustered: false, ran: false });
        var ranks = st.clustered ? CLUP : RAWP;
        var scanned = ranks.filter(function (r) { return r[0] <= 14 && 14 <= r[1]; }).length;
        var h = '<div class="prune-q">' + sqlBox("SELECT SUM(total_usd) FROM core.orders\nWHERE order_date = '2026-03-14';") +
          '<div class="seg2"><button type="button" class="tg' + (!st.clustered ? ' on' : '') + '" data-act="pr-mode" data-v="raw">Table as loaded</button><button type="button" class="tg' + (st.clustered ? ' on' : '') + '" data-act="pr-mode" data-v="clu">Clustered by order_date</button>' +
          '<button type="button" class="btn-run" data-act="pr-run">Run query</button></div></div>';
        h += '<div class="parts">' + ranks.map(function (r, k) {
          var hit = r[0] <= 14 && 14 <= r[1];
          return '<div class="part' + (st.ran ? (hit ? ' scan' : ' skip') : '') + '" style="--d:' + (k * 70) + 'ms"><b>P' + (k + 1) + '</b><span>Mar ' + d2(r[0]) + ' to ' + d2(r[1]) + '</span><em>' + (st.ran ? (hit ? 'READ' : 'skipped') : '&nbsp;') + '</em></div>';
        }).join('') + '</div>';
        h += '<div class="prune-res' + (st.ran ? ' on' : '') + '">' + (st.ran ? 'Partitions scanned: <b>' + scanned + ' of 12</b> (' + Math.round(scanned / 12 * 100) + '%)' + (st.clustered ? '. Pruning works.' : '. Almost everything is read.') : 'Press Run query.') + '</div>';
        if (i === 2) h += '<div class="callout tip"><b>Rule of thumb.</b> Cluster big tables (many TB, thousands of partitions) on the column most queries filter by, usually a date. Check <code>SYSTEM$CLUSTERING_INFORMATION</code> first. Automatic clustering uses credits in the background.</div>';
        box.innerHTML = h;
        A.bindWidget = function (act, el) {
          if (act === 'pr-mode') { st.clustered = el.getAttribute('data-v') === 'clu'; st.ran = false; A.render(true); }
          if (act === 'pr-run') { st.ran = true; A.render(true); }
        };
      }
    };
  })();

  /* ====================== Can this role do that? ====================== */
  (function () {
    var ROLES = ['LOADER', 'TRANSFORMER', 'ANALYST', 'PII_READER'];
    var NO_RAW = 'has no privileges on the RAW schema.';
    var ACTS = [
      { k: 'a1', sql: "INSERT INTO raw.orders VALUES ('O-9','C-1',...)", r: { LOADER: ['ok', 'LOADER has INSERT on the RAW tables.'], TRANSFORMER: ['no', 'TRANSFORMER reads RAW to build CORE. It cannot write to RAW.'], ANALYST: ['no', 'ANALYST ' + NO_RAW], PII_READER: ['no', 'PII_READER inherits ANALYST, which ' + NO_RAW.replace('has no', 'has no')] } },
      { k: 'a2', sql: 'SELECT * FROM raw.orders', r: { LOADER: ['ok', 'LOADER can read what it loads.'], TRANSFORMER: ['ok', 'TRANSFORMER has SELECT on RAW to build CORE.'], ANALYST: ['no', 'ANALYST ' + NO_RAW], PII_READER: ['no', 'PII_READER inherits ANALYST, which has nothing on RAW.'] } },
      { k: 'a3', sql: 'CREATE TABLE core.dim_region (...)', r: { LOADER: ['no', 'LOADER has no CREATE TABLE privilege on CORE.'], TRANSFORMER: ['ok', 'TRANSFORMER has CREATE TABLE on CORE and MARTS.'], ANALYST: ['no', 'ANALYST can only read MARTS.'], PII_READER: ['no', 'PII_READER only adds clear-text access to PII columns.'] } },
      { k: 'a4', sql: 'SELECT revenue_usd FROM marts.daily_revenue', r: { LOADER: ['no', 'LOADER has no privileges on MARTS.'], TRANSFORMER: ['ok', 'TRANSFORMER owns the MARTS tables it builds.'], ANALYST: ['ok', 'ANALYST has USAGE on MARTS and SELECT on its tables.'], PII_READER: ['ok', 'PII_READER inherits everything ANALYST can do.'] } },
      { k: 'a5', sql: 'SELECT email FROM marts.dim_customer', r: { LOADER: ['no', 'LOADER has no privileges on MARTS.'], TRANSFORMER: ['mask', 'TRANSFORMER can read the table, but the masking policy hides the email unless the role is PII_READER.'], ANALYST: ['mask', 'ANALYST can read the table. The masking policy returns ***@mail.test.'], PII_READER: ['ok', 'The masking policy shows clear text to PII_READER.'] } },
      { k: 'a6', sql: 'CREATE WAREHOUSE wh_scratch', r: { LOADER: ['no', 'Creating warehouses needs CREATE WAREHOUSE, which only SYSADMIN holds here.'], TRANSFORMER: ['no', 'Creating warehouses needs CREATE WAREHOUSE, which only SYSADMIN holds here.'], ANALYST: ['no', 'Creating warehouses needs CREATE WAREHOUSE, which only SYSADMIN holds here.'], PII_READER: ['no', 'Creating warehouses needs CREATE WAREHOUSE, which only SYSADMIN holds here.'] } }
    ];
    var GRANTS = { LOADER: ['USAGE on database BREWLINE and schema RAW', 'INSERT and SELECT on RAW tables', 'USAGE on WH_LOAD'], TRANSFORMER: ['SELECT on RAW tables', 'CREATE TABLE and ownership in CORE and MARTS', 'USAGE on WH_TRANSFORM'], ANALYST: ['USAGE on database BREWLINE and schema MARTS', 'SELECT on MARTS tables, present and future', 'USAGE on WH_BI'], PII_READER: ['Inherits ANALYST', 'Seen as PII_READER by the masking policy: clear text for email and phone'] };
    W.perm = {
      steps: function () { return 2; },
      hint: function (s, i) { return i === 0 ? 'Pick a role, then try each action.' : 'Read the grants behind each role.'; },
      say: function (s, i) {
        return [
          'Pick a role, then try the actions one at a time. Allowed, denied and masked all teach something. Notice how the masked case still returns rows.',
          'Behind every answer is a short list of grants. A good role design fits on one screen like this. If a role needs a page of grants, it is probably doing two jobs.'
        ][i];
      },
      mood: function (s, i) { return i === 0 ? 'think' : 'happy'; },
      render: function (box, s, i, A) {
        var st = A.local.perm || (A.local.perm = { role: 'ANALYST', act: null });
        var h = '<div class="lab">';
        if (i === 0) {
          var act = ACTS.filter(function (x) { return x.k === st.act; })[0];
          h += '<div class="lab-row"><span class="lab-l">Active role</span><span class="seg2">' + ROLES.map(function (r) { return '<button type="button" class="tg' + (st.role === r ? ' on' : '') + '" data-act="pm-role" data-v="' + r + '">' + r + '</button>'; }).join('') + '</span></div>' +
            '<div class="pm-acts">' + ACTS.map(function (x) { return '<button type="button" class="pm-act' + (st.act === x.k ? ' on' : '') + '" data-act="pm-act" data-v="' + x.k + '">' + LAB.hl(x.sql, 'sql').join('') + '</button>'; }).join('') + '</div>';
          if (act) {
            var r = act.r[st.role];
            h += '<div class="callout ' + (r[0] === 'ok' ? 'good' : (r[0] === 'mask' ? 'warn' : 'bad')) + '"><b>' + (r[0] === 'ok' ? 'Allowed.' : (r[0] === 'mask' ? 'Allowed, but masked.' : 'Denied.')) + '</b> ' + esc(r[1]) + '</div>';
          } else h += '<p class="lab-note">Pick an action to run as ' + esc(st.role) + '.</p>';
        } else {
          h += '<div class="tbl-wrap"><table class="tbl wtbl"><thead><tr><th>Role</th><th>What it is granted</th></tr></thead><tbody>' + ROLES.map(function (r) { return '<tr class="' + (r === st.role ? 'trk' : '') + '"><td><b>' + r + '</b></td><td>' + GRANTS[r].map(esc).join('<br>') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
            '<div class="callout tip"><b>Least privilege.</b> Grant each role only what its job needs, build bigger roles by inheriting smaller ones, and give roles to people, never privileges directly to users.</div>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) {
          if (act === 'pm-role') st.role = el.getAttribute('data-v');
          if (act === 'pm-act') st.act = el.getAttribute('data-v');
          A.render(true);
        };
      }
    };
  })();

  /* ====================== Masking by role ====================== */
  (function () {
    var MASK_SQL = "CREATE OR REPLACE MASKING POLICY governance.mask_email AS (val STRING)\n  RETURNS STRING ->\n  CASE\n    WHEN IS_ROLE_IN_SESSION('PII_READER') THEN val\n    ELSE '***@' || SPLIT_PART(val, '@', 2)\n  END;\n\nALTER TABLE marts.dim_customer\n  MODIFY COLUMN email SET MASKING POLICY governance.mask_email;";
    var REBUILD_SQL = "-- A table rebuilt with CREATE OR REPLACE is a new table\nCREATE OR REPLACE TABLE marts.dim_customer AS\n  SELECT customer_id, full_name, email FROM core.customers;\n\n-- So apply the policy again in the same deployment step\nALTER TABLE marts.dim_customer\n  MODIFY COLUMN email SET MASKING POLICY governance.mask_email;";
    W.mask = {
      steps: function () { return 3; },
      hint: function (s, i) { return i === 0 ? 'Switch the role and watch the same query change.' : 'Press Next.'; },
      say: function (s, i) {
        return [
          'Same table, same query, two roles. Switch the role and compare the email column. The data in storage never changes. Snowflake applies the policy when the query runs.',
          'Here is the policy. It lives on the column, not in the query, so every tool that reads the table (BI, API, notebooks) gets the same protection. Use IS_ROLE_IN_SESSION, so inherited roles are handled.',
          'The catch seniors know. A table rebuilt with CREATE OR REPLACE is a new table, and the policy on the old one is gone. Re-apply the policy in the same deployment step, or manage policies as code that runs after every build.'
        ][i];
      },
      mood: function (s, i) { return i === 2 ? 'oops' : 'happy'; },
      render: function (box, s, i, A) {
        var role = A.local.maskRole || 'ANALYST', clear = role === 'PII_READER', h = '';
        if (i === 0) {
          var rows = [['C-42', 'Ava Martin', clear ? 'ava.martin@mail.test' : '***@mail.test'], ['C-77', 'Noah Singh', clear ? 'noah.singh@mail.test' : '***@mail.test']];
          h += '<div class="wsbar"><span><b>Role</b> <span class="rolebtns"><button type="button" class="tg' + (role === 'ANALYST' ? ' on' : '') + '" data-act="mk-role" data-v="ANALYST">ANALYST</button><button type="button" class="tg' + (role === 'PII_READER' ? ' on' : '') + '" data-act="mk-role" data-v="PII_READER">PII_READER</button></span></span></div>' +
            sqlBox('SELECT customer_id, full_name, email FROM marts.dim_customer;') +
            '<div class="result"><div class="result-h">Results as ' + esc(role) + '</div>' + LAB.H.table(['customer_id', 'full_name', 'email'], rows, { chg: clear ? [[0, 2], [1, 2]] : [] }) + '</div>';
        } else if (i === 1) {
          h += LAB.H.code({ file: 'governance/masking_policies.sql', lang: 'sql', code: MASK_SQL, hl: [3, 6] });
        } else {
          h += LAB.H.code({ file: 'deploy/dim_customer.sql', lang: 'sql', code: REBUILD_SQL, hl: [6, 7] }) +
            '<div class="callout warn"><b>Why:</b> table models in dbt are rebuilt with CREATE OR REPLACE, so a policy set by hand is gone after the next run. Re-attach it in a post-hook, or use tag-based masking that a deployment step re-applies.</div>';
        }
        box.innerHTML = h;
        if (i === 1) LAB.H.bindCode(box, MASK_SQL);
        if (i === 2) LAB.H.bindCode(box, REBUILD_SQL);
        A.bindWidget = function (act, el) { if (act === 'mk-role') { A.local.maskRole = el.getAttribute('data-v'); A.render(true); } };
      }
    };
  })();
})();
