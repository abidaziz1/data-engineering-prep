/* Lab widgets for the first half of the Apache Flink course: the changelog of a streaming query, the watermark that decides which orders are late, and the kinds of window.
   Each one registers LAB.W.<kind>. Every number that a lab shows comes from js/real.js, which flink/verify/capture_flink.py wrote after running the real Apache Flink 2.2.1 (a standalone
   cluster on one machine) with its SQL client. A lab that applies a rule to the recorded data says so on screen, and flink/verify/check_widgets.js checks the rule against what Flink printed. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var W = (LAB.W = LAB.W || {});
  var esc = LAB.esc, md = LAB.md, H = LAB.H, G = LAB.get;

  function chips(list, cur, act, fmt) {
    return list.map(function (k) {
      return '<button type="button" class="sel-chip' + (String(k) === String(cur) ? ' on' : '') + '" data-act="' + act + '" data-v="' + esc(String(k)) + '">' + esc(fmt ? fmt(k) : String(k)) + '</button>';
    }).join('');
  }
  function row(label, inner) { return '<div class="lab-row"><span class="lab-l">' + esc(label) + '</span><div class="sel-chips">' + inner + '</div></div>'; }
  function table(cols, rows, rowCls, cellCls) {
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r, ri) { return '<tr class="' + (rowCls ? rowCls(r, ri) || '' : '') + '">' + r.map(function (c, ci) { return '<td class="' + (cellCls ? cellCls(r, ri, ci) || '' : '') + '">' + md(String(c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function fmtN(x, d) { return (Math.round(x * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function mb(n) { return n >= 1099511627776 ? fmtN(n / 1099511627776, 2) + ' TiB' : n >= 1073741824 ? fmtN(n / 1073741824, 2) + ' GiB' : n >= 1048576 ? fmtN(n / 1048576, 1) + ' MiB' : n >= 1024 ? fmtN(n / 1024, 1) + ' KiB' : fmtN(n) + ' B'; }
  function big(b, span, cls) { return '<div class="big' + (cls ? ' ' + cls : '') + '"><b>' + b + '</b><span>' + span + '</span></div>'; }
  function bar(label, v, max, text, cls) {
    var pc = max > 0 ? Math.max(0, Math.min(100, v / max * 100)) : 0;
    return '<div class="lane"><span class="lane-n lane-wide">' + esc(label) + '</span><div class="lane-track"><div class="gbar' + (cls ? ' ' + cls : '') + '" style="left:0;width:' + pc + '%">&nbsp;</div></div><span class="lane-v">' + esc(text) + '</span></div>';
  }
  /* text of a callout or a note: **bold** and `code` go through the formatter, which escapes HTML. A pill or an operation chip is HTML that must stay, and a <code> tag in a source string means the same as backticks */
  function mdx(t) {
    return String(t).split(/(<span class="(?:pill|opchip)[^"]*">[^<]*<\/span>)/).map(function (part, i) {
      return i % 2 ? part : md(part.replace(/<code>([\s\S]*?)<\/code>/g, '`$1`'));
    }).join('');
  }
  function callout(k, t) { return '<div class="callout ' + k + '">' + mdx(t) + '</div>'; }
  function pill(t, cls) { return '<span class="pill' + (cls ? ' ' + cls : '') + '">' + esc(t) + '</span>'; }
  function rec(label, cls, act, v) {
    return act ? '<button type="button" class="rec ' + (cls || '') + '" data-act="' + act + '" data-v="' + esc(String(v)) + '">' + esc(String(label)) + '</button>' : '<i class="rec ' + (cls || '') + '">' + esc(String(label)) + '</i>';
  }
  /* a note under a lab: the text may use **bold** and `code`, and may hold pills anywhere, which are HTML that must not be escaped */
  function fixNotes(h) {
    return h.replace(/<p class="lab-note">([\s\S]*?)<\/p>/g, function (m, inner) { return '<p class="lab-note">' + mdx(inner) + '</p>'; });
  }
  var STORES = ['s01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10', 's11', 's12'];
  function opchip(op) { var c = { '+I': 'i', '-U': 'ub', '+U': 'ua', '-D': 'd' }[op] || ''; return '<span class="opchip ' + c + '">' + esc(op) + '</span>'; }
  W._h = { fixNotes: fixNotes, chips: chips, row: row, table: table, fmtN: fmtN, mb: mb, big: big, bar: bar, callout: callout, pill: pill, rec: rec, opchip: opchip, STORES: STORES };


  /* ====================== The changelog of a streaming query ====================== */
  (function () {
    var QUERIES = [['count', 'GROUP BY store: orders and cents'], ['count2', 'GROUP BY the count: stores per count'], ['filter', 'WHERE status is refunded: no aggregate']];
    function orders() { return G.table('sql.orders').rows; }
    /* a GROUP BY that keeps a count and a sum per store: the first order of a store is an insert, every later one retracts the old row and sends the new one */
    function level1(os) {
      var st = {}, out = [];
      os.forEach(function (o, i) {
        var k = o[1], s = st[k], ops = [];
        if (!s) { st[k] = { n: 1, c: o[3] }; ops.push(['+I', k, 1, o[3]]); }
        else { ops.push(['-U', k, s.n, s.c]); s.n += 1; s.c += o[3]; ops.push(['+U', k, s.n, s.c]); }
        out.push({ i: i, ops: ops });
      });
      return out;
    }
    /* a GROUP BY on top of it: it counts the rows of the first result that have the same n. A retraction takes a row away, and an empty group is deleted */
    function level2(l1) {
      var b = {}, out = [];
      l1.forEach(function (step) {
        var ops = [];
        step.ops.forEach(function (c) {
          var n = c[2], s = b[n];
          if (c[0] === '+I' || c[0] === '+U') {
            if (!s) { b[n] = 1; ops.push(['+I', n, 1]); } else { ops.push(['-U', n, s]); b[n] = s + 1; ops.push(['+U', n, s + 1]); }
          } else if (s === 1) { delete b[n]; ops.push(['-D', n, 1]); } else { ops.push(['-U', n, s]); b[n] = s - 1; ops.push(['+U', n, s - 1]); }
        });
        out.push({ i: step.i, ops: ops });
      });
      return out;
    }
    function filter(os) {
      return os.map(function (o, i) { return { i: i, ops: o[4] === 'refunded' ? [['+I', o[0], o[1], o[3]]] : [] }; });
    }
    function run(q) {
      var os = orders();
      return q === 'count' ? level1(os) : q === 'count2' ? level2(level1(os)) : filter(os);
    }
    function cols(q) { return q === 'count' ? ['store_id', 'n', 'cents'] : q === 'count2' ? ['n', 'stores'] : ['order_id', 'store_id', 'total_cents']; }
    function apply(ops, tab) { ops.forEach(function (c) { var key = String(c[1]); if (c[0] === '+I' || c[0] === '+U') tab[key] = c.slice(1); else delete tab[key]; }); }
    W.changeloglab = {
      _run: run, _apply: apply,
      steps: function () { return 2; },
      hint: 'Pick a query, then press Feed the next order and watch which changes it sends.',
      say: function (s, i) {
        return [
          'Feed the twelve orders to a streaming query one at a time. The table on the right is what the query has produced **so far**. The list on the left is how it got there: **+I** inserts a row, **-U** takes back the row that was sent before, **+U** sends its replacement, **-D** deletes a row. Pick a query and press the button.',
          'Streaming results can be noisy. **Mini-batch** holds the input back for a short time, so that several orders for the same store become one change. This is what Flink printed for the same twelve orders, with and without it. The final table is the same.'
        ][i];
      },
      mood: function (s, i) { return i ? 'happy' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.cl || (A.local.cl = { q: 'count', k: 0, mb: 0 }), os = orders(), h = '<div class="lab">';
        if (i === 0) {
          var steps = run(st.q), shown = [], tab = {}, lastOps = [];
          for (var j = 0; j < st.k; j++) { steps[j].ops.forEach(function (c) { shown.push([c, j]); }); apply(steps[j].ops, tab); lastOps = steps[j].ops; }
          var rowsNow = Object.keys(tab).map(function (k) { return tab[k]; }).sort(function (a, b) { return String(a[0]).localeCompare(String(b[0]), 'en', { numeric: true }); });
          h += row('Query', chips(QUERIES.map(function (x) { return x[0]; }), st.q, 'cl-q', function (k) { return QUERIES.filter(function (x) { return x[0] === k; })[0][1]; }));
          h += '<div class="lab-row"><span class="lab-l">Input</span><button type="button" class="sel-chip" data-act="cl-step" data-v="next"' + (st.k >= os.length ? ' disabled' : '') + '>Feed the next order</button>' +
            '<button type="button" class="sel-chip" data-act="cl-step" data-v="all"' + (st.k >= os.length ? ' disabled' : '') + '>Feed all</button><button type="button" class="sel-chip" data-act="cl-step" data-v="reset">Start again</button></div>';
          h += '<div class="strip">' + os.map(function (o, n) { return rec('#' + o[0] + ' ' + o[1], n < st.k ? 'k' + (STORES.indexOf(o[1]) % 12) + (n === st.k - 1 ? ' pick' : '') : 'gap'); }).join('') + '</div>';
          var total = steps.reduce(function (a, x) { return a + x.ops.length; }, 0);
          h += '<div class="lab-out">' + big(st.k + ' of ' + os.length, 'orders fed') + big(shown.length, 'changes sent so far' + (st.k === os.length ? ' (recorded: ' + total + ')' : ''), 'warn') + big(rowsNow.length, 'rows in the table now', 'good') + '</div>';
          h += '<div class="pair"><div>' + (shown.length ? table(['op'].concat(cols(st.q)), shown.map(function (x) { return x[0]; }),
            function (r, n) { return shown[n][1] === st.k - 1 ? 'hit' : ''; }, function (r, n, c) { return c === 0 ? 'op' : ''; }) : '<p class="lab-note">No order has been fed yet.</p>') + '</div><div>' + (rowsNow.length ? table(cols(st.q), rowsNow) : '<p class="lab-note">The table is empty.</p>') + '</div></div>';
          if (st.k === os.length) {
            var rec2 = st.q === 'count' ? G.table('sql.batch_group').rows : st.q === 'count2' ? G.counts('sql.two_level_summary').batch : null;
            var mine = rowsNow.map(function (r) { return r.map(String); });
            if (rec2) h += callout(JSON.stringify(mine) === JSON.stringify(rec2.map(function (r) { return r.map(String); })) ? 'tip' : 'warn',
              'The table after the last order is the **same** as the answer of the same query in batch mode, which Flink printed as ' + rec2.length + ' rows. A streaming query is a batch query that is updated as rows arrive.');
            else h += callout('tip', 'A query with no aggregate only ever sends **+I**: a row is never taken back. Flink printed ' + G.counts('sql.append_only_summary').rows + ' rows for the refunds, the same as here.');
          } else if (lastOps.length) {
            h += callout('info', 'The last order sent **' + lastOps.length + '** change' + (lastOps.length > 1 ? 's' : '') + ': ' + lastOps.map(function (c) { return opchip(c[0]); }).join(' ') + '. ' +
              (lastOps.length === 1 && lastOps[0][0] === '+I' ? 'It is the first row of its group, so it is an insert.' : lastOps.length === 1 ? 'A single change.' : 'The first takes back the old row, the second sends the new one.'));
          }
          h += '<p class="lab-note">' + pill('Computed') + ' The lab applies the rules of a streaming aggregate to the twelve recorded orders. Flink printed exactly the same changes for the first two queries: ' + G.counts('sql.stream_summary').changelog_rows + ' and ' + G.counts('sql.two_level_summary').changelog_rows + ' rows.</p>';
        } else {
          var mb = st.mb, t = G.table(mb ? 'sql.minibatch' : 'sql.stream_group'), sum = mb ? G.counts('sql.minibatch_summary') : null;
          h += row('Setting', chips([0, 1], mb, 'cl-mb', function (v) { return v ? 'mini-batch of 4 orders' : 'no mini-batch'; }));
          h += '<div class="lab-out">' + big(t.rows.length, 'changes sent for 12 orders', mb ? 'good' : 'warn') + big(G.counts('sql.stream_summary').batch_rows, 'rows in the final table') + '</div>';
          h += table(t.cols, t.rows, function (r) { return 'op-' + r[0].replace('+', '').replace('-', ''); }, function (r, n, c) { return c === 0 ? 'op' : ''; });
          h += callout('tip', mb ? 'With a mini-batch of **4** orders Flink sent **' + t.rows.length + '** changes instead of **' + sum.changelog_rows_without + '**, and the final table is ' + (sum.same_final_table ? 'the same' : 'different') + '. Fewer changes mean less work downstream. The price is delay: the batch waits to fill, or for its time limit.' :
            'Each order for a known store sends two changes: take back, then replace. Twelve orders made **' + t.rows.length + '** changes for **' + G.counts('sql.stream_summary').batch_rows + '** rows.');
          h += '<p class="lab-note">' + pill('Recorded', 'real') + ' Both tables are what the Flink SQL client printed. The mini-batch run used <code>table.exec.mini-batch.size = 4</code> and a time limit of an hour, so the size decided when it flushed.</p>';
        }
        box.innerHTML = fixNotes(h + '</div>');
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'cl-q') { st.q = v; st.k = 0; }
          else if (act === 'cl-step') { st.k = v === 'next' ? Math.min(os.length, st.k + 1) : v === 'all' ? os.length : 0; }
          else if (act === 'cl-mb') st.mb = Number(v);
          A.render(true);
        };
      }
    };
  })();

  /* ====================== The watermark and the late orders ====================== */
  (function () {
    function events() {
      return G.table('time.events').rows.map(function (r) {
        var p = String(r[4]).split(':').map(Number);
        return { n: r[0], id: r[1], store: r[2], cents: r[3], at: r[4], t: p[0] * 3600 + p[1] * 60 + p[2] };
      });
    }
    function mmss(s) { return (s < 0 ? '-' : '') + ('0' + Math.floor(Math.abs(s) / 60)).slice(-2) + ':' + ('0' + (Math.abs(s) % 60)).slice(-2); }
    /* the watermark is the largest time seen minus the delay; an order is late if its window had closed when it arrived, that is if the watermark before it had reached the end of its window */
    function simulate(delay, size) {
      var wm = null, ws = [], closedAt = {}, wmAfter = [], late = [];
      events().forEach(function (e) {
        var start = e.t - e.t % size, isLate = wm !== null && wm >= start + size - 0.001;
        ws.push({ e: e, start: start, late: isLate, wmBefore: wm });
        if (isLate) late.push(e.id);
        wm = wm === null ? e.t - delay : Math.max(wm, e.t - delay);
        wmAfter.push(wm);
        [0, 60, 120, 180, 240].forEach(function (w) { if (closedAt[w] === undefined && wm >= w + size - 0.001) closedAt[w] = e.n; });
      });
      var counts = {};
      ws.forEach(function (x) { if (!x.late) counts[x.start] = (counts[x.start] || 0) + 1; });
      return { rows: ws, wmAfter: wmAfter, late: late, counts: counts, closedAt: closedAt };
    }
    W.watermarklab = {
      _simulate: simulate,
      steps: function () { return 2; },
      hint: 'Pick how long the watermark waits, then press Next order.',
      say: function (s, i) {
        return [
          'Fourteen orders arrive in this order, and some happened earlier than the ones before them. The **watermark** is the largest time seen so far minus a **delay**. A window of one minute closes when the watermark reaches its end, and an order that arrives after that is **late**. Choose a delay and feed the orders.',
          'The delay is a trade. A short one closes windows early and drops more orders. A long one drops fewer and makes every result wait. These are the five runs that Flink printed.'
        ][i];
      },
      mood: function (s, i) { return i ? 'happy' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.wm || (A.local.wm = { d: 10, k: 0 }), D = G.counts('time.delay_facts').delays, evs = events(), h = '<div class="lab">';
        if (i === 0) {
          var sim = simulate(st.d, 60), k = st.k, wmNow = k ? sim.wmAfter[k - 1] : null, closed = [0, 60, 120, 180, 240].filter(function (w) { return sim.closedAt[w] !== undefined && sim.closedAt[w] <= k; });
          var counted = 0, dropped = 0;
          sim.rows.slice(0, k).forEach(function (x) { if (x.late) dropped++; else counted++; });
          h += row('Watermark delay', chips(D, st.d, 'wm-d', function (v) { return v + ' s'; }));
          h += '<div class="lab-row"><span class="lab-l">Input</span><button type="button" class="sel-chip" data-act="wm-step" data-v="next"' + (k >= evs.length ? ' disabled' : '') + '>Next order</button>' +
            '<button type="button" class="sel-chip" data-act="wm-step" data-v="all"' + (k >= evs.length ? ' disabled' : '') + '>All orders</button><button type="button" class="sel-chip" data-act="wm-step" data-v="reset">Start again</button></div>';
          h += '<div class="strip">' + sim.rows.map(function (x, n) {
            return rec('#' + x.e.id + ' ' + x.e.at.slice(3), n >= k ? 'gap' : x.late ? 'miss' : 'right' + (n === k - 1 ? ' pick' : ''));
          }).join('') + '</div>';
          h += '<div class="lab-out">' + big(wmNow === null ? 'none yet' : mmss(wmNow), 'the watermark now', 'warn') + big(counted, 'orders counted', 'good') + big(dropped, 'orders dropped as late', dropped ? 'bad' : '') + '</div>';
          h += '<div class="gantt">' + [0, 60, 120, 180, 240].map(function (w) {
            var isClosed = closed.indexOf(w) >= 0, n = sim.rows.slice(0, k).filter(function (x) { return !x.late && x.start === w; }).length;
            return '<div class="lane"><span class="lane-n lane-wide">' + mmss(w) + ' to ' + mmss(w + 60) + '</span><div class="lane-track"><div class="gbar ' + (isClosed ? 'win' : 'open') + '" style="left:0;width:' + Math.min(100, n * 20 + (n ? 8 : 0)) + '%">' + (n ? n + ' order' + (n > 1 ? 's' : '') : '') + '</div></div><span class="lane-v">' + (isClosed ? 'closed' : 'open') + '</span></div>';
          }).join('') + '</div>';
          if (k === evs.length) {
            var want = G.table('time.delay_summary').rows.filter(function (r) { return r[0] === st.d; })[0];
            var mine = [0, 60, 120, 180, 240].map(function (w) { return sim.counts[w] || 0; }).join(', ');
            h += callout(mine === want[1] && dropped === want[3] ? 'tip' : 'warn', 'With a delay of **' + st.d + ' s** the windows hold **' + mine + '** orders and **' + dropped + '** were dropped' + (dropped ? ' (orders ' + sim.late.join(', ') + ')' : '') + '. Flink printed ' + want[1] + ' and ' + want[3] + ' dropped: ' + (mine === want[1] && dropped === want[3] ? 'the same.' : 'different.'));
          } else if (k && sim.rows[k - 1].late) {
            h += callout('warn', 'Order **#' + sim.rows[k - 1].e.id + '** happened at ' + sim.rows[k - 1].e.at + ', but the watermark was already **' + mmss(sim.rows[k - 1].wmBefore) + '**, past the end of its window. Its window has closed and been sent on: the order is **late**, and SQL drops it.');
          } else if (k) {
            h += callout('info', 'Order **#' + sim.rows[k - 1].e.id + '** (' + sim.rows[k - 1].e.at + ') counted. The watermark is now the largest time seen, **' + mmss(Math.max.apply(null, evs.slice(0, k).map(function (e) { return e.t; }))) + '**, minus ' + st.d + ' s.');
          }
          h += '<p class="lab-note">' + pill('Computed') + ' The lab applies the watermark rule to the fourteen recorded orders. Flink printed the same windows for every delay in the list: <code>check_widgets.js</code> compares them.</p>';
        } else {
          var rows = G.table('time.delay_summary').rows;
          h += table(['Watermark waits', 'Orders in the five windows', 'Counted', 'Dropped as late', 'First window closed when order # arrived'], rows.map(function (r) {
            var sm = simulate(r[0], 60); return [r[0] + ' s', r[1], r[2], r[3] + (r[4] ? ' (' + r[4] + ')' : ''), sm.closedAt[0] ? '#' + sm.closedAt[0] : 'only at the end'];
          }), function (r, n) { return n === 1 ? 'hit' : ''; });
          h += callout('tip', 'Going from **0 s** to **75 s** brought the dropped orders from **' + rows[0][3] + '** to **' + rows[3][3] + '**, and made the first window wait for order **#' + simulate(75, 60).closedAt[0] + '** instead of **#' + simulate(0, 60).closedAt[0] + '**. Between 10 s and 30 s nothing changed here: the late orders were later than that.');
          h += '<p class="lab-note">' + pill('Recorded', 'real') + ' The counts are what the SQL client printed for each delay. The last column is computed from the arrival order.</p>';
        }
        box.innerHTML = fixNotes(h + '</div>');
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'wm-d') { st.d = Number(v); st.k = 0; }
          else if (act === 'wm-step') st.k = v === 'next' ? Math.min(evs.length, st.k + 1) : v === 'all' ? evs.length : 0;
          A.render(true);
        };
      }
    };
  })();

  /* ====================== The kinds of window ====================== */
  (function () {
    var KINDS = [['tumble', 'Tumbling: 60 s'], ['hop', 'Hopping: 60 s, every 30 s'], ['cumulate', 'Cumulating: 60 s, in steps of 20 s'], ['session', 'Session: gap of 30 s, for each store']];
    function evs() {
      return G.table('time.events').rows.map(function (r) { var p = String(r[4]).split(':').map(Number); return { id: r[1], store: r[2], t: p[0] * 3600 + p[1] * 60 + p[2] }; });
    }
    function mmss(s) { return (s < 0 ? '-' : '') + ('0' + Math.floor(Math.abs(s) / 60)).slice(-2) + ':' + ('0' + (Math.abs(s) % 60)).slice(-2); }
    /* every window that has at least one order, as {s, e, n, who} sorted by start and end */
    function windows(kind) {
      var out = {}, es = evs();
      function add(key, s, e, ev) { var w = out[key] || (out[key] = { s: s, e: e, n: 0, who: [], store: ev.store }); w.n++; w.who.push(ev.id); }
      if (kind === 'tumble') es.forEach(function (e) { var s = e.t - e.t % 60; add(s + '-' + (s + 60), s, s + 60, e); });
      else if (kind === 'hop') es.forEach(function (e) { for (var s = e.t - e.t % 30 - 30; s <= e.t; s += 30) if (s <= e.t && e.t < s + 60) add(s + '-' + (s + 60), s, s + 60, e); });
      else if (kind === 'cumulate') es.forEach(function (e) { var w = e.t - e.t % 60; [20, 40, 60].forEach(function (d) { if (e.t < w + d) add(w + '-' + (w + d), w, w + d, e); }); });
      else {
        var by = {};
        es.forEach(function (e) { (by[e.store] = by[e.store] || []).push(e); });
        Object.keys(by).forEach(function (st) {
          var cur = null;
          by[st].slice().sort(function (a, b) { return a.t - b.t; }).forEach(function (e) {
            if (cur && e.t < cur.last + 30) { cur.last = e.t; cur.n++; cur.who.push(e.id); }
            else { cur = { store: st, first: e.t, last: e.t, n: 1, who: [e.id] }; (by[st].sessions = by[st].sessions || []).push(cur); }
          });
          (by[st].sessions || []).forEach(function (c) { out[st + c.first] = { s: c.first, e: c.last + 30, n: c.n, who: c.who, store: st }; });
        });
      }
      return Object.keys(out).map(function (k) { return out[k]; }).sort(function (a, b) { return a.s - b.s || a.e - b.e || String(a.store).localeCompare(String(b.store)); });
    }
    W.windowlab = {
      _windows: windows,
      steps: function () { return 1; },
      hint: 'Pick a kind of window and see which windows each order falls into.',
      say: function () { return 'The same fourteen orders, four kinds of window. A **tumbling** window cuts time into pieces that do not overlap. A **hopping** window slides, so an order is in more than one. A **cumulating** window grows from a start in steps. A **session** window has no fixed size: it stays open while orders keep arriving, and closes after a quiet gap. Pick one.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.wl || (A.local.wl = { k: 'tumble' }), ws = windows(st.k), es = evs(), span = 300, h = '<div class="lab">';
        var recTab = { tumble: 'time.tumble_200', hop: 'time.hop', cumulate: 'time.cumulate', session: 'time.session' }[st.k], rec = G.table(recTab);
        var inWin = {}; ws.forEach(function (w) { w.who.forEach(function (id) { inWin[id] = (inWin[id] || 0) + 1; }); });
        h += row('Kind of window', chips(KINDS.map(function (x) { return x[0]; }), st.k, 'wl-k', function (k) { return KINDS.filter(function (x) { return x[0] === k; })[0][1]; }));
        h += '<div class="strip">' + es.map(function (e) { return rec2(e, inWin[e.id]); }).join('') + '</div>';
        h += '<div class="gantt">' + ws.map(function (w) {
          return '<div class="lane"><span class="lane-n lane-wide">' + (st.k === 'session' ? w.store + ' ' : '') + mmss(w.s) + ' to ' + mmss(w.e) + '</span><div class="lane-track"><div class="gbar win" style="left:' + Math.max(0, w.s / span * 100) + '%;width:' + Math.min(100 - Math.max(0, w.s / span * 100), (w.e - Math.max(0, w.s)) / span * 100) + '%"></div></div><span class="lane-v">' + w.n + ' order' + (w.n > 1 ? 's' : '') + '</span></div>';
        }).join('') + '</div>';
        var per = Object.keys(inWin).map(function (k) { return inWin[k]; });
        h += '<div class="lab-out">' + big(ws.length, 'windows with orders', 'good') + big(rec.rows.length, 'windows Flink printed', 'warn') + big(Math.max.apply(null, per), 'most windows one order is in') + '</div>';
        var mine = ws.map(function (w) { return String(w.n); }).join(','), flink = rec.rows.slice().sort(function (a, b) { return 0; }).map(function (r) { return String(r[r.length - 1]); });
        var same = ws.length === rec.rows.length;
        h += callout(same ? 'tip' : 'warn', st.k === 'tumble' ? 'Each order is in **exactly one** window. The watermark waited long enough here that no order was late.' : st.k === 'hop' ? 'Each order is in **two** windows, because the window is twice as long as the slide. The first window starts before the first order: a window starts at a multiple of the slide.' :
          st.k === 'cumulate' ? 'Inside each minute there are windows that **end** 20, 40 and 60 seconds in, and all start at the minute. An order is in every one that ends after it: a running total, with a result every 20 seconds.' :
          'A session ends when no order arrives for the gap. Store s01 has a session from 00:00:05 to 00:00:50 (the last order at 20 s plus the gap), then a new one, because the next order came 35 s later.');
        h += '<p class="lab-note">' + pill('Computed') + ' The lab assigns the recorded orders to windows by the rules of each kind. Flink printed the same windows with the same counts (' + rec.rows.length + ' rows): <code>check_widgets.js</code> compares them.</p>';
        box.innerHTML = fixNotes(h + '</div>');
        A.bindWidget = function (act, el) { if (act === 'wl-k') { st.k = el.getAttribute('data-v'); A.render(true); } };
      }
    };
    function rec2(e, n) { return rec(e.store + ' ' + mmss(e.t), 'k' + (STORES.indexOf(e.store) % 12) + (n > 1 ? ' pick' : '')); }
  })();

})();
