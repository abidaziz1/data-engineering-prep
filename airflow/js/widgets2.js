/* Airflow lab widgets, part 2: retries and backoff, sensor modes, capacity, why a task does not run, assets, parse cost, time zones.
   Timelines, states and messages come from js/real.js, recorded from Apache Airflow 3.4.0 (scheduler, DAG processor, API server, triggerer,
   LocalExecutor, SQLite) on one machine. Where a lab computes something for settings that were not run, it says so, and
   verify/check_widgets.js compares the arithmetic with Airflow's own functions and with the recorded runs. Nothing here ran on a managed service. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var W = (LAB.W = LAB.W || {});
  var esc = LAB.esc, md = LAB.md, H = LAB.H, G = LAB.get;

  function chips(list, cur, act, fmt) {
    return list.map(function (k) { return '<button type="button" class="sel-chip' + (String(k) === String(cur) ? ' on' : '') + '" data-act="' + act + '" data-v="' + esc(String(k)) + '">' + esc(fmt ? fmt(k) : String(k)) + '</button>'; }).join('');
  }
  function table(cols, rows, rowCls, cellCls) {
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r, ri) { return '<tr class="' + (rowCls ? rowCls(r, ri) || '' : '') + '">' + r.map(function (c, ci) { return '<td class="' + (cellCls ? cellCls(r, ri, ci) || '' : '') + '">' + md(String(c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function code(file, lang, text, hl) { return H.code({ file: file, lang: lang, code: text, hl: hl || null }); }
  function bindCodes(box) { box.querySelectorAll('.code').forEach(function (c) { H.bindCode(c, c.textContent); }); }
  function big(items) { return '<div class="lab-out">' + items.map(function (x) { return '<div class="big' + (x[2] ? ' ' + x[2] : '') + '"><b>' + esc(String(x[0])) + '</b><span>' + esc(x[1]) + '</span></div>'; }).join('') + '</div>'; }
  function num(x, d) { var p = Math.pow(10, d || 0); return (Math.round(x * p) / p).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: d || 0 }); }
  function pad(x) { return (x < 10 ? '0' : '') + x; }

  /* ====================== SHA-1, for the retry jitter ====================== */
  function sha1hex(str) {
    var bytes = unescape(encodeURIComponent(str)).split('').map(function (c) { return c.charCodeAt(0); }), n = bytes.length;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    var hi = Math.floor(n * 8 / 4294967296), lo = (n * 8) >>> 0;
    bytes.push((hi >>> 24) & 255, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255, (lo >>> 24) & 255, (lo >>> 16) & 255, (lo >>> 8) & 255, lo & 255);
    var h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
    for (var i = 0; i < bytes.length; i += 64) {
      var w = [], j;
      for (j = 0; j < 16; j++) w[j] = (bytes[i + 4 * j] << 24) | (bytes[i + 4 * j + 1] << 16) | (bytes[i + 4 * j + 2] << 8) | bytes[i + 4 * j + 3];
      for (j = 16; j < 80; j++) { var x = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16]; w[j] = (x << 1) | (x >>> 31); }
      var a = h0, b = h1, c = h2, d = h3, e = h4;
      for (j = 0; j < 80; j++) {
        var f, k;
        if (j < 20) { f = (b & c) | (~b & d); k = 0x5A827999; } else if (j < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1; } else if (j < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; } else { f = b ^ c ^ d; k = 0xCA62C1D6; }
        var t = (((a << 5) | (a >>> 27)) + f + e + k + w[j]) | 0;
        e = d; d = c; c = (b << 30) | (b >>> 2); b = a; a = t;
      }
      h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
    }
    return [h0, h1, h2, h3, h4].map(function (v) { return ('00000000' + (v >>> 0).toString(16)).slice(-8); }).join('');
  }

  /* ====================== retries and backoff ====================== */
  W.retry = (function () {
    var DELAYS = [1, 5, 30], MULTS = [0, 2, 3], CAPS = [0, 10, 60], MAXDELAY = 86400;
    var DAG = 'brewline_backoff', TASK = 'call_partner', LOGICAL = '2026-03-14 00:00:00+00:00';
    /* the rule of TaskInstance._compute_retry_deadline in Airflow 3.4.0: the wait after failed try k */
    function wait(delay, mult, cap, k) {
      if (!mult || mult === 1) return { base: delay, jitter: 0, wait: delay };
      var minB = Math.max(Math.ceil(delay * Math.pow(mult, k - 1)), 1);
      var jitter = Number(BigInt('0x' + sha1hex(DAG + '#' + TASK + '#' + LOGICAL + '#' + k)) % BigInt(minB));
      var w = Math.min(minB + jitter, MAXDELAY);
      if (cap) w = Math.min(cap, w);
      return { base: minB, jitter: jitter, wait: w };
    }
    W.retryInfo = { wait: wait, sha1: sha1hex, delays: DELAYS, mults: MULTS, caps: CAPS };
    return {
      steps: function () { return 2; },
      hint: 'Change the retries, the delay and the multiplier. Read the waits.',
      say: function (s, i) {
        return [
          'A task with `retries=3` runs up to four times. After each failure it waits `retry_delay` and goes to `up_for_retry`. With a multiplier the wait grows: the base is `retry_delay` times the multiplier to the power of (failed try minus 1), and Airflow adds a jitter between zero and the base, taken from a hash of the DAG id, the task id, the logical date and the try number. `max_retry_delay` cuts the result, but only when a multiplier is set.',
          'The recorded run: `brewline_backoff` with a one second delay, a multiplier of 2 and a cap of 10 seconds failed on every try. The metadata database holds the time at which each retry was due, and the model in this lab gives the same four numbers.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var q = A.local.rt || (A.local.rt = { retries: 3, delay: 5, mult: 2, cap: 0 }), h = '<div class="lab">';
        if (i === 0) {
          var rows = [], clock = 0, maxw = 1, ws = [];
          for (var k = 1; k <= q.retries; k++) { var r = wait(q.delay, q.mult, q.cap, k); ws.push(r); maxw = Math.max(maxw, r.wait); }
          ws.forEach(function (r, ix) { clock += r.wait; rows.push([String(ix + 1), num(r.base) + ' s', '+' + num(r.jitter) + ' s', num(r.wait) + ' s', num(clock) + ' s']); });
          var args = 'retries=' + q.retries + ', retry_delay=timedelta(seconds=' + q.delay + ')' + (q.mult ? ', retry_exponential_backoff=' + q.mult : '') + (q.cap ? ', max_retry_delay=timedelta(seconds=' + q.cap + ')' : '');
          h += '<div class="lab-row"><span class="lab-l">retries</span><div class="sel-chips">' + chips([0, 1, 2, 3, 4, 5], q.retries, 'rt-r') + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">retry_delay (s)</span><div class="sel-chips">' + chips(DELAYS, q.delay, 'rt-d') + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">retry_exponential_backoff</span><div class="sel-chips">' + chips(MULTS, q.mult, 'rt-m', function (x) { return x ? String(x) : 'off'; }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">max_retry_delay (s)</span><div class="sel-chips">' + chips(CAPS, q.cap, 'rt-c', function (x) { return x ? String(x) : 'not set'; }) + '</div></div>' +
            code('DAG file', 'python', '@task(' + args + ')\ndef call_partner(): ...');
          if (!q.retries) h += '<div class="callout tip">With `retries=0` the first failure is the last. The task goes to `failed` and nothing waits.</div>';
          else {
            h += big([[q.retries + 1, 'tries at most'], [num(clock) + ' s', 'waiting in total, with every try failing at once'], [ws.map(function (r) { return r.wait; }).join(', '), 'seconds waited before each retry']]) +
              ws.map(function (r, ix) { return '<div class="lane"><span class="lane-n">after try ' + (ix + 1) + '</span><span class="lane-track"><span class="gbar wait" style="left:0;width:' + Math.max(2, Math.round(r.wait / maxw * 100)) + '%"></span></span><span class="lane-v">' + num(r.wait) + ' s</span></div>'; }).join('') +
              table(['Failed try', 'Backoff (before jitter)', 'Jitter', 'Wait before the next try', 'Seconds since the first failure'], rows);
          }
          if (q.cap && !q.mult) h += '<div class="callout warn">`max_retry_delay` does nothing here: without a multiplier the delay is constant and the cap is not applied. Airflow\'s own function returned ' + num(q.delay) + ' seconds for every try with the cap set.</div>';
          h += '<p class="lab-note">The wait is computed with the rule in the Airflow 3.4.0 source and checked against Airflow\'s own function for every setting on this page. The jitter comes from a hash of the DAG id, the task id, the logical date and the try number, so another task gets other jitter. Here the task is <code>' + DAG + '.' + TASK + '</code> on ' + LOGICAL.slice(0, 10) + '.</p>';
        } else {
          var b = G.counts('af.backoff'), mine = [1, 2, 3, 4].map(function (k) { return wait(b.retry_delay_seconds, b.multiplier, b.max_retry_delay_seconds, k).wait; });
          h += table(['Failed try', 'Backoff before jitter', 'Due after (recorded in the database)', 'This lab'], [1, 2, 3, 4].map(function (k, ix) { return [String(k), num(wait(b.retry_delay_seconds, b.multiplier, b.max_retry_delay_seconds, k).base) + ' s', num(b.delays_in_database[ix]) + ' s', num(mine[ix]) + ' s']; })) +
            '<div class="callout tip">The documentation for the multiplier gives an example of retries after 4, 20 and 100 minutes. Those are the bases. The real wait is the base plus a jitter of up to the same amount, so the third wait here is 6 seconds on a base of 4.</div>' +
            '<p class="lab-note">Recorded with `retry_delay` of ' + b.retry_delay_seconds + ' second, a multiplier of ' + b.multiplier + ' and `max_retry_delay` of ' + b.max_retry_delay_seconds + ' seconds. The scheduler and the executor add about a second between the due time and the start of the try, which this lab does not model.</p>';
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) { var v = +el.getAttribute('data-v'); if (act === 'rt-r') q.retries = v; if (act === 'rt-d') q.delay = v; if (act === 'rt-m') q.mult = v; if (act === 'rt-c') q.cap = v; A.render(true); };
      }
    };
  })();

  /* ====================== sensors: poke, reschedule, deferrable ====================== */
  W.waiting = (function () {
    var MODES = ['poke', 'reschedule', 'deferrable'];
    var LABEL = { poke: 'poke (holds a slot)', reschedule: 'reschedule (gives the slot back between checks)', deferrable: 'deferrable (waits in the triggerer)' };
    var CLS = { running: 's-running', queued: 's-queued', scheduled: 's-scheduled', deferred: 's-deferred', up_for_reschedule: 's-up_for_reschedule', success: 's-success' };
    function data(mode) { return G.counts('af.waiting')[mode]; }
    W.waitInfo = { modes: MODES, data: data };
    return {
      steps: function () { return 2; },
      hint: 'Pick a mode. Watch the four sensors and the two slots.',
      say: function (s, i) {
        return [
          'Four sensors wait for a partner file in a pool with two slots. The file appears 14 seconds after the start. Pick a mode and read the four lanes. In `poke` mode two sensors hold both slots, and the other two cannot even start. In the other two modes the slots stay free.',
          'The same three runs as numbers. A slot second is one second of one pool slot in use. The deferrable sensors held a slot only while they started and finished, and they still saw the file when it appeared.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var q = A.local.wt || (A.local.wt = { mode: 'poke' }), d = data(q.mode), h = '<div class="lab">';
        if (i === 0) {
          var T = 0, names = Object.keys(d.segments);
          MODES.forEach(function (m) { var sg = data(m).segments; Object.keys(sg).forEach(function (n) { sg[n].forEach(function (g) { T = Math.max(T, g[2] + 1); }); }); });
          var lanes = names.map(function (n) {
            var bars = d.segments[n].filter(function (g) { return g[0] !== 'none'; }).map(function (g) {
              return '<span class="gbar ' + (CLS[g[0]] || '') + '" title="' + esc(g[0] + ' from second ' + g[1] + ' to ' + g[2]) + '" style="left:' + (g[1] / T * 100) + '%;width:' + ((g[2] - g[1] + 1) / T * 100) + '%"></span>';
            }).join('');
            return '<div class="lane"><span class="lane-n">' + esc(n) + '</span><span class="lane-track">' + bars + '</span></div>';
          }).join('');
          var legend = ['scheduled', 'queued', 'running', 'up_for_reschedule', 'deferred', 'success'].filter(function (st) { return d.states_seen.indexOf(st) >= 0 || st === 'success'; }).map(function (st) { return '<span class="st ' + st + '">' + st + '</span>'; }).join(' ');
          h += '<div class="lab-row"><span class="lab-l">Sensor mode</span><div class="sel-chips">' + chips(MODES, q.mode, 'wt-m', function (k) { return LABEL[k]; }) + '</div></div>' +
            '<div class="lanes">' + lanes + '<div class="fmark" style="left:calc(7.5rem + .6rem + (100% - 7.5rem - .6rem) * ' + (d.files_created_at / T) + ')"></div></div>' +
            '<div class="lab-row"><span class="lab-l">Seconds, 0 to ' + T + '</span><span>' + legend + '</span></div>' +
            '<p class="lab-note">The dashed line is the moment the files appeared, ' + d.files_created_at + ' seconds in. Each box is one second of one task state, read from the metadata database every second. Pool size ' + d.pool_slots + ', poke interval ' + d.poke_interval_seconds + ' seconds.</p>';
        } else {
          var cmp = MODES.map(function (m) { var f = data(m).facts; return [m, num(f.slot_seconds, 1), String(f.max_holding_a_slot), String(f.max_running), String(f.max_deferred), num(f.seconds_until_all_done, 1) + ' s']; });
          h += table(['Mode', 'Slot seconds', 'Most slots held', 'Most tasks running', 'Most tasks deferred', 'Until all four are done'], cmp, function (r) { return r[0] === q.mode ? 'new' : ''; }) +
            '<div class="callout tip">The wait itself was the same in all three runs, about 14 seconds, because the file appeared then. What changed is how much of the pool the waiting cost: ' + num(data('poke').facts.slot_seconds) + ' slot seconds for poke against ' + num(data('deferrable').facts.slot_seconds, 1) + ' for deferrable.</div>' +
            '<div class="lab-row"><span class="lab-l">Mode</span><div class="sel-chips">' + chips(MODES, q.mode, 'wt-m') + '</div></div>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'wt-m') q.mode = el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== capacity: pools, DAG limits, priority ====================== */
  W.capacity = (function () {
    var POOLS = [1, 2, 3, 6, 128], LIMITS = [2, 4, 16], PAR = 32;
    function plan(n, pool, limit, parallelism) {
      var eff = Math.min(pool, limit, parallelism || PAR, n), waves = Math.ceil(n / eff);
      return { eff: eff, waves: waves, peak: eff, wave: function (k) { return Math.floor(k / eff); } };
    }
    /* the order a one-slot pool starts tasks: the highest priority_weight first */
    function order(tasks) { return tasks.slice().sort(function (a, b) { return b.priority_weight - a.priority_weight; }).map(function (t) { return t.task; }); }
    W.capInfo = { plan: plan, order: order, pools: POOLS, limits: LIMITS };
    return {
      steps: function () { return 2; },
      hint: 'Change the pool and the DAG limit. Count the waves.',
      say: function (s, i) {
        return [
          'Six tasks take three seconds each. A task starts only when it has a free slot in its pool, the DAG is under `max_active_tasks`, and the executor is under `parallelism`. The lowest of the three decides how many run at once. This is a model of that rule. Two of these settings were run for real, and the lab marks them.',
          'When more tasks wait than there are slots, the pool picks by `priority_weight`, highest first. Five tasks with weights 1 to 5 shared one slot. The start order below is the recorded one.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var q = A.local.cp || (A.local.cp = { pool: 2, limit: 16 }), h = '<div class="lab">';
        if (i === 0) {
          var P = G.counts('af.pools'), p = plan(6, q.pool, q.limit, PAR), rec = (q.pool === 2 && q.limit === 16) ? P.brewline_pool_two_slots : (q.pool === 128 && q.limit === 2) ? P.brewline_dag_limit : null;
          var lanes = '';
          for (var k = 0; k < 6; k++) lanes += '<div class="lane"><span class="lane-n">load_' + (k + 1) + '</span><span class="lane-track"><span class="gbar run" style="left:' + (p.wave(k) / p.waves * 100) + '%;width:' + (100 / p.waves) + '%"></span></span><span class="lane-v">wave ' + (p.wave(k) + 1) + '</span></div>';
          h += '<div class="lab-row"><span class="lab-l">Pool slots</span><div class="sel-chips">' + chips(POOLS, q.pool, 'cp-p', function (x) { return x === 128 ? '128 (the default pool)' : String(x); }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">DAG max_active_tasks</span><div class="sel-chips">' + chips(LIMITS, q.limit, 'cp-l', function (x) { return x === 16 ? '16 (the default)' : String(x); }) + '</div></div>' +
            big([[p.peak, 'tasks at the same time at most'], [p.waves, 'waves of three seconds'], [p.waves * 3 + ' s', 'about, without scheduling time']]) + lanes +
            (rec ? '<div class="callout tip">Recorded for these settings: at most <b>' + rec.peak_running + '</b> tasks ran at once and the start times were ' + rec.tasks.map(function (t) { return t.start; }).join(', ') + ' seconds. The model gives the same grouping.</div>' : '<p class="lab-note">This combination was not run. The pool of 2 slots and the DAG limit of 2 were.</p>') +
            '<p class="lab-note">Parallelism of the executor is ' + PAR + ' here, so it never decides. In your setup it can.</p>';
        } else {
          var pr = G.counts('af.pools').brewline_pool_priority;
          h += table(['Task', 'priority_weight', 'Started at (s)'], pr.tasks.map(function (t) { return [t.task, String(t.priority_weight), num(t.start, 1)]; })) +
            '<div class="callout tip">Start order, recorded: ' + pr.start_order.join(', ') + '. The pool had one slot and each task took two seconds.</div>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { var v = +el.getAttribute('data-v'); if (act === 'cp-p') q.pool = v; if (act === 'cp-l') q.limit = v; A.render(true); };
      }
    };
  })();

  /* ====================== why does this task not run? ====================== */
  W.whyidle = (function () {
    var CAUSES = [
      { id: 'pool_full', t: 'The task waits in scheduled', fix: 'Free a slot in the pool, add slots, or lower the priority of other tasks. `airflow pools list` shows the slots.' },
      { id: 'dag_limit', t: 'Only a few tasks of the DAG run at once', fix: 'Raise `max_active_tasks` on the DAG, or accept the limit. The default comes from `max_active_tasks_per_dag`.' },
      { id: 'upstream_running', t: 'The task has no state yet', fix: 'Nothing is wrong. Its upstream task has not finished, so the scheduler has not scheduled it.' },
      { id: 'depends_on_past', t: 'The task waits for the run before it', fix: 'Fix or clear the failed task of the earlier run, or set `depends_on_past=False` if you do not need the order.' }
    ];
    W.whyInfo = { causes: CAUSES };
    return {
      steps: function () { return 1; },
      hint: 'Pick the symptom. Read what Airflow says.',
      say: function () { return 'A task that does not run is rarely stuck. Something in its list of dependencies is not met, and `airflow tasks failed-deps` prints which one. I made each of these four happen on purpose and kept what the command printed. Pick the symptom.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var q = A.local.wi || (A.local.wi = { c: 'pool_full' }), c = CAUSES.filter(function (x) { return x.id === q.c; })[0], rec = G.counts('af.failed_deps')[q.c];
        var h = '<div class="lab"><div class="lab-row"><span class="lab-l">What you see</span><div class="sel-chips">' + chips(CAUSES.map(function (x) { return x.id; }), q.c, 'wi-c', function (k) { return CAUSES.filter(function (x) { return x.id === k; })[0].t; }) + '</div></div>' +
          '<div class="lab-row"><span class="lab-l">State of the task</span>' + (rec.state ? '<span class="st ' + rec.state + '">' + rec.state + '</span>' : '<span class="st none">no state</span>') + '</div>' +
          '<div class="lab-h">What the command printed</div>' + code('airflow tasks failed-deps ' + rec.dag_id + ' ' + rec.task_id, 'text', rec.failed_deps) +
          '<div class="callout tip">' + md(c.fix) + '</div></div>';
        box.innerHTML = h;
        bindCodes(box);
        A.bindWidget = function (act, el) { if (act === 'wi-c') q.c = el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== assets: what starts a consumer ====================== */
  W.assets = (function () {
    /* Airflow 3.4.0: a consumer that schedules on one asset runs once per event. A consumer that needs several assets (AND) waits until each has an event, then one run takes all queued events. */
    function simulate(events) {
      var single = [], and = [], qa = { orders: 0, customers: 0 };
      events.forEach(function (e) {
        if (e === 'orders') single.push({ orders: 1 });
        qa[e]++;
        if (qa.orders > 0 && qa.customers > 0) { and.push({ orders: qa.orders, customers: qa.customers }); qa = { orders: 0, customers: 0 }; }
      });
      return { single: single, and: and, queued: qa };
    }
    W.assetInfo = { simulate: simulate };
    return {
      steps: function () { return 1; },
      hint: 'Press the buttons to land files. Watch the two consumers.',
      say: function () { return 'Two producer DAGs land a file and mark an asset as updated. One consumer schedules on `orders_raw`. The other needs `orders_raw` and `customers_raw`. Land files in any order. Airflow 3.4 starts the first consumer once per event. The second one waits until both assets have an event, then runs once and takes everything that was queued. The recorded runs behind this are listed under the lab.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var q = A.local.as || (A.local.as = { ev: [] }), sim = simulate(q.ev), h = '<div class="lab">';
        var rec = G.counts('af.assets');
        h += '<div class="lab-row"><button type="button" class="btn-sm" data-act="as-o">Land an orders file</button><button type="button" class="btn-sm" data-act="as-c">Land a customers file</button><button type="button" class="btn-sm" data-act="as-r">Start again</button></div>' +
          '<div class="lab-row"><span class="lab-l">Events so far</span><div class="chips">' + (q.ev.length ? q.ev.map(function (e, k) { return '<span class="chip-d on">' + (k + 1) + ' ' + e + '_raw</span>'; }).join('') : '<span class="chip-d">none yet</span>') + '</div></div>' +
          big([[sim.single.length, 'runs of the consumer of orders_raw'], [sim.and.length, 'runs of the consumer of both assets'], [sim.queued.orders + sim.queued.customers, 'events waiting for the second consumer', (sim.queued.orders + sim.queued.customers) ? 'warn' : '']]) +
          table(['Consumer', 'Run', 'Events the run took'], sim.single.map(function (r, k) { return ['orders_daily (schedule=[orders_raw])', String(k + 1), '1 orders_raw']; }).concat(sim.and.map(function (r, k) { return ['customer_orders (schedule=[orders_raw, customers_raw])', String(k + 1), r.orders + ' orders_raw, ' + r.customers + ' customers_raw']; }))) +
          '<div class="callout tip">Recorded: ' + rec.producer_runs + ' orders files made ' + rec.consumer_runs_after_3_events + ' runs of the first consumer, one event each. The second consumer had ' + rec.and_consumer_runs_before + ' runs until a customers file landed, then ' + rec.and_consumer_runs_after + '. A later customers file alone made no run (' + rec.and_runs_after_extra_customers_event + ' in total) and an orders file after it made the next one (' + rec.and_runs_after_extra_orders_event + ').</div>';
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act) { if (act === 'as-o') q.ev.push('orders'); if (act === 'as-c') q.ev.push('customers'); if (act === 'as-r') q.ev = []; if (q.ev.length > 12) q.ev.shift(); A.render(true); };
      }
    };
  })();

  /* ====================== parse cost ====================== */
  W.parse = (function () {
    var FILES = [10, 100, 1000], SECS = [0.002, 0.5, 2], PROCS = [1, 2, 4];
    function pass(files, secs, procs) { return files * secs / procs; }
    W.parseInfo = { pass: pass };
    return {
      steps: function () { return 1; },
      hint: 'Pick the number of files and the time one file takes to import.',
      say: function () { return 'The DAG processor imports every DAG file again and again. Code at the top of a file runs on every import, so a call to an API or a database there is paid for each time. One pass over all files takes about files times seconds per file, divided by the parse processes. I timed a light file and a file that sleeps for two seconds at the top level.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var q = A.local.pc || (A.local.pc = { files: 100, secs: 2, procs: 2 }), t = pass(q.files, q.secs, q.procs), pc = G.counts('af.parse_cost');
        var h = '<div class="lab"><div class="lab-row"><span class="lab-l">DAG files</span><div class="sel-chips">' + chips(FILES, q.files, 'pc-f') + '</div></div>' +
          '<div class="lab-row"><span class="lab-l">Seconds to import one</span><div class="sel-chips">' + chips(SECS, q.secs, 'pc-s', function (x) { return x === 0.002 ? '0.002 (a light file)' : x === 2 ? '2 (a sleep or a call at the top)' : String(x); }) + '</div></div>' +
          '<div class="lab-row"><span class="lab-l">parsing_processes</span><div class="sel-chips">' + chips(PROCS, q.procs, 'pc-p') + '</div></div>' +
          big([[t < 1 ? num(t * 1000) + ' ms' : t < 120 ? num(t, 1) + ' s' : num(t / 60, 1) + ' min', 'one pass over all files', t > 300 ? 'bad' : t > 30 ? 'warn' : 'good']]) +
          '<div class="callout tip">Recorded on this machine: a light file imported in about ' + num(pc.median_seconds['light.py'] * 1000, 1) + ' ms, and the file with <code>time.sleep(' + pc.sleep_at_top_level_seconds + ')</code> at the top level took ' + num(pc.median_seconds['toplevel_slow.py'], 2) + ' seconds every time. Hundred light files took ' + num(pc.hundred_files_seconds[0], 2) + ' seconds in one process once the imports were warm. The timings are the ' + esc(pc.note) + '.</div>' +
          '<p class="lab-note">The pass time is arithmetic, not a measurement of your setup. In Airflow 3 the DAG processor is its own process, so slow files delay new DAG versions and do not block the scheduler.</p></div>';
        box.innerHTML = h;
        A.bindWidget = function (act, el) { var v = +el.getAttribute('data-v'); if (act === 'pc-f') q.files = v; if (act === 'pc-s') q.secs = v; if (act === 'pc-p') q.procs = v; A.render(true); };
      }
    };
  })();

  /* ====================== time zones and daylight saving ====================== */
  W.dst = (function () {
    var CASES = { 'America/New_York|spring': 'New York, clocks go forward on 8 March 2026', 'America/New_York|autumn': 'New York, clocks go back on 1 November 2026', 'Europe/London|london': 'London, clocks go forward on 29 March 2026' };
    function rowsOf(c) { var t = c.split('|'); return G.counts('af.dst').rows.filter(function (r) { return r.tz === t[0] && r.season === t[1]; }); }
    function hoursBetween(a, b) { return (Date.parse(b.replace(' ', 'T')) - Date.parse(a.replace(' ', 'T'))) / 3600000; }
    W.dstInfo = { cases: CASES, rowsOf: rowsOf, hoursBetween: hoursBetween };
    return {
      steps: function () { return 1; },
      hint: 'Pick a city and an expression. Find the day with a different gap.',
      say: function () { return 'A cron schedule in a time zone follows the wall clock. Twice a year the wall clock jumps. I asked Airflow\'s `CronTriggerTimetable` for five fire times around each jump. Pick a case and an expression and read the local time, the UTC time and the hours since the run before.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var q = A.local.dz || (A.local.dz = { c: 'America/New_York|spring', e: 0 }), rs = rowsOf(q.c), r = rs[Math.min(q.e, rs.length - 1)];
        var gaps = r.runs.map(function (x, k) { return k ? hoursBetween(r.runs[k - 1].utc, x.utc) : null; });
        var h = '<div class="lab"><div class="lab-row"><span class="lab-l">Case</span><div class="sel-chips">' + chips(Object.keys(CASES), q.c, 'dz-c', function (k) { return CASES[k]; }) + '</div></div>' +
          '<div class="lab-row"><span class="lab-l">Expression</span><div class="sel-chips">' + chips(rs.map(function (x, k) { return k; }), q.e, 'dz-e', function (k) { return rs[k].expr; }) + '</div></div>' +
          code('DAG file', 'python', 'schedule=CronTriggerTimetable("' + r.expr + '", timezone="' + r.tz + '")') +
          table(['Local time', 'UTC', 'Hours since the run before'], r.runs.map(function (x, k) { return [x.local, x.utc.slice(0, 16).replace('T', ' '), gaps[k] === null ? '' : String(gaps[k])]; }), null, function (row, ri, ci) { return ci === 2 && row[2] && +row[2] !== 24 ? 'wbad' : ''; }) +
          '<p class="lab-note">Recorded with Airflow 3.4.0. A gap other than 24 hours is marked. In the New York spring case a run set for 02:00 fired at 03:00, the first valid time after the jump, and a run set for 01:30 in the autumn case fired once.</p></div>';
        box.innerHTML = h;
        bindCodes(box);
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'dz-c') { q.c = v; q.e = 0; } if (act === 'dz-e') q.e = +v; A.render(true); };
      }
    };
  })();
})();

  /* A string that a lab builds by hand can carry `code` and **bold** marks that nobody turned into markup. After every render of a lab, turn them into <code> and <b> in the notes,
     the callouts and the table heads. The code blocks are left alone. */
  Object.keys(LAB.W).forEach(function (k) {
    var w = LAB.W[k];
    if (!w || typeof w.render !== 'function') return;
    var orig = w.render;
    w.render = function (box) {
      var r = orig.apply(this, arguments);
      Array.prototype.forEach.call(box.querySelectorAll('.callout, .lab-note, .tbl th'), function (el) {
        if (el.textContent.indexOf('`') >= 0 || el.textContent.indexOf('**') >= 0) el.innerHTML = el.innerHTML.replace(/`([^`<]+)`/g, '<code>$1</code>').replace(/\*\*([^*<]+)\*\*/g, '<b>$1</b>');
      });
      return r;
    };
  });
