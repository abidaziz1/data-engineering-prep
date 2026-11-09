/* Databricks lab widgets. Each one registers LAB.W.<kind> with steps, say, render.
   What a lab shows as a plan, a log or a count comes from js/real.js, recorded from open-source Apache Spark and Delta Lake.
   The cost lab is arithmetic on example rates and says so. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var W = (LAB.W = LAB.W || {});
  var esc = LAB.esc, md = LAB.md, H = LAB.H, G = LAB.get;

  function chips(list, cur, act, fmt) {
    return list.map(function (k) { return '<button type="button" class="sel-chip' + (String(k) === String(cur) ? ' on' : '') + '" data-act="' + act + '" data-v="' + esc(String(k)) + '">' + esc(fmt ? fmt(k) : String(k)) + '</button>'; }).join('');
  }
  function table(cols, rows, rowCls) {
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r, ri) { return '<tr class="' + (rowCls ? rowCls(r, ri) || '' : '') + '">' + r.map(function (c) { return '<td>' + md(String(c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function fmtN(x, d) { return (Math.round(x * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function bytes(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n >= 1024 ? (n / 1024).toFixed(1) + ' KB' : n + ' B'; }

  /* ====================== Delta log lab ====================== */
  (function () {
    var KEY = 'delta.orders';
    /* replay the recorded commits up to a version and return the files that are live */
    function liveAt(v) {
      var live = {};
      G.log(KEY).forEach(function (c) {
        if (c.version > v) return;
        c.actions.forEach(function (a) {
          if (a.kind === 'add') live[a.body.path] = { path: a.body.path, size: a.body.size, rows: JSON.parse(a.body.stats).numRecords, since: c.version };
          if (a.kind === 'remove') delete live[a.body.path];
        });
      });
      return Object.keys(live).sort().map(function (p) { return live[p]; });
    }
    function rowsAt(v) { var t = G.table('delta.version_' + v); return t.rows; }
    function diff(a, b) {
      var A = {}, B = {};
      rowsAt(a).forEach(function (r) { A[r[0]] = r; });
      rowsAt(b).forEach(function (r) { B[r[0]] = r; });
      var out = [];
      Object.keys(B).sort().forEach(function (k) { if (!A[k]) out.push(['added', B[k]]); else if (A[k].join('|') !== B[k].join('|')) out.push(['changed', B[k], A[k]]); });
      Object.keys(A).sort().forEach(function (k) { if (!B[k]) out.push(['removed', A[k]]); });
      return out;
    }
    var VERSIONS = G.history(KEY).map(function (r) { return r.version; });
    W.deltalog = {
      steps: function () { return 3; },
      hint: 'Pick a version. Then read the files and the rows.',
      say: function (s, i) {
        return [
          'This is a real Delta table from the recording: six commits on the Brewline orders. Every operation wrote one JSON file to the log. Pick a version and read what that commit says.',
          'Now replay the log. A Delta table is the set of files that the log says are live. Add actions put a file in the set. Remove actions take it out. Nothing is ever edited in place.',
          'Time travel is the same replay, stopped earlier. Pick two versions and see which rows changed between them.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.dl || (A.local.dl = { v: 4, a: 1, b: 4 });
        var h = '<div class="lab">';
        if (i === 0) {
          var row = G.history(KEY).filter(function (r) { return r.version === st.v; })[0], m = row.operationMetrics;
          var keys = Object.keys(m).filter(function (k) { return /^(numOutputRows|numFiles|numAddedFiles|numRemovedFiles|numUpdatedRows|numDeletedRows|numCopiedRows|numTargetRowsInserted|numTargetRowsUpdated|numSourceRows|numOutputBytes)$/.test(k); });
          h += '<div class="sel-chips">' + chips(VERSIONS, st.v, 'dl-v', function (v) { return 'v' + v + ' ' + G.history(KEY).filter(function (r) { return r.version === v; })[0].operation.toLowerCase(); }) + '</div>' +
            '<div class="lab-out"><div class="big"><b>' + esc(row.operation) + '</b><span>version ' + row.version + '</span></div>' +
            '<div class="big ' + (row.isBlindAppend ? 'good' : 'warn') + '"><b>' + (row.isBlindAppend ? 'blind append' : 'reads then writes') + '</b><span>isBlindAppend is ' + row.isBlindAppend + '</span></div></div>' +
            table(['Metric', 'Value'], keys.map(function (k) { return ['`' + k + '`', m[k]]; })) +
            H.code({ file: '_delta_log/' + String(st.v).padStart(20, '0') + '.json', lang: 'json', code: G.commitText(KEY, st.v) }) + '</div>';
        } else if (i === 1) {
          var live = liveAt(st.v), total = live.reduce(function (a, f) { return a + f.rows; }, 0);
          h += '<div class="sel-chips">' + chips(VERSIONS, st.v, 'dl-v', function (v) { return 'v' + v; }) + '</div>' +
            '<div class="lab-out"><div class="big"><b>' + live.length + ' files</b><span>live at version ' + st.v + '</span></div><div class="big ' + (total === rowsAt(st.v).length ? 'good' : 'bad') + '"><b>' + total + ' rows</b><span>the log stats add up to the table</span></div></div>' +
            table(['File', 'Rows in the log stats', 'Size', 'Added in version'], live.map(function (f) { return ['`' + f.path + '`', String(f.rows), bytes(f.size), 'v' + f.since]; }), function (r, k) { return live[k].since === st.v ? 'new' : ''; }) +
            '<p class="lab-note">Green rows were added by this version. Rows in files are counted from the min and max statistics that Delta keeps in each add action.</p></div>';
        } else {
          var d = diff(st.a, st.b);
          h += '<div class="lab-row"><span class="lab-l">Older version</span><div class="sel-chips">' + chips(VERSIONS, st.a, 'dl-a', function (v) { return 'v' + v; }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">Newer version</span><div class="sel-chips">' + chips(VERSIONS, st.b, 'dl-b', function (v) { return 'v' + v; }) + '</div></div>' +
            (d.length ? table(['Change', 'order_id', 'status', 'total_usd', 'before'], d.map(function (x) { return [x[0], x[1][0], x[1][1], x[1][2], x[2] ? x[2][1] + ', ' + x[2][2] : '']; }), function (r) { return r[0] === 'added' ? 'new' : r[0] === 'removed' ? 'dup' : ''; }) : '<div class="callout tip">The two versions hold the same rows.</div>') +
            '<div class="callout tip">The query is <code>select * from orders version as of ' + st.b + '</code> against <code>version as of ' + st.a + '</code>. Delta reads the files that were live at each version, so both stay readable until VACUUM deletes the old files.</div></div>';
        }
        box.innerHTML = h;
        var code = box.querySelector('.code'); if (code) H.bindCode(code, G.commitText(KEY, st.v));
        A.bindWidget = function (act, el) {
          var v = +el.getAttribute('data-v');
          if (act === 'dl-v') st.v = v; if (act === 'dl-a') st.a = v; if (act === 'dl-b') st.b = v;
          A.render(true);
        };
      }
    };
    W.deltalogInfo = { liveAt: liveAt, rowsAt: rowsAt, diff: diff, versions: VERSIONS };
  })();

  /* ====================== Concurrent writers lab ====================== */
  (function () {
    var SC = [
      { k: 'append_append', name: 'append and append', a: 'append one order, slowed on purpose', b: 'append one order',
        why: 'Neither writer reads the table, so neither can invalidate the other. Delta puts one commit after the other.' },
      { k: 'update_append', name: 'update and append', a: "UPDATE orders SET status = 'SHIPPED' WHERE order_id = 'O-1', slowed on purpose; it scans the whole table", b: 'append one order',
        why: 'The update read every file to find its rows. The append added a file that the update should have seen. Delta cannot prove the update is still right, so it stops it.' },
      { k: 'update_append_partitioned', name: 'update in one partition, append in another', a: "UPDATE orders SET status = 'SHIPPED' WHERE region = 'a' AND order_id = 'O-1', slowed on purpose; the table is partitioned by region", b: "append one order to region 'b'",
        why: 'The partition filter limits what the update reads to region a. The append wrote region b, outside that set, so nothing the update read has changed.' },
      { k: 'update_update', name: 'two updates that touch one file', a: "UPDATE orders SET status = 'SHIPPED' WHERE order_id = 'O-1', slowed on purpose", b: "UPDATE orders SET status = 'CANCELLED' WHERE order_id = 'O-2'",
        why: 'Both orders sit in the same data file. B rewrote that file and committed first, and A had read the old copy. Delta reports it as a concurrent write of data that A should have read.' }
    ];
    function out(k) { return G.counts('delta.conflicts')[k]; }
    function failed(k) { return out(k).a !== 'committed'; }
    W.conflicts = {
      steps: function () { return 2; },
      hint: 'Pick a pair of writers. Read what happens at the commit.',
      say: function (s, i) {
        return [
          'Two writers work on the same table. Writer A starts first and is slow on purpose. Writer B commits while A is still working. These are real outcomes from Delta Lake. Pick a pair and read what happened when A tried to commit.',
          'Here are all four pairs. The pattern: a writer fails only when something it read was changed by a commit that landed first.'
        ][i];
      },
      mood: function (s, i) { return i === 0 ? 'think' : 'happy'; },
      render: function (box, s, i, A) {
        var st = A.local.cf || (A.local.cf = { k: SC[1].k });
        var cur = SC.filter(function (x) { return x.k === st.k; })[0], o = out(cur.k), bad = failed(cur.k), h = '<div class="lab">';
        if (i === 0) {
          h += '<div class="sel-chips">' + chips(SC.map(function (x) { return x.k; }), cur.k, 'cf-pick', function (k) { return SC.filter(function (x) { return x.k === k; })[0].name; }) + '</div>' +
            '<div class="pair"><div class="callout tip"><b>Writer A</b> ' + esc(cur.a) + '</div><div class="callout tip"><b>Writer B</b> ' + esc(cur.b) + '</div></div>' +
            table(['Step', 'What happens'], [
              ['1', 'A starts. It reads version 0 and keeps working.'],
              ['2', 'About 3 seconds later, B commits. Outcome for B: **' + o.b + '**.'],
              ['3', 'A tries to commit. Delta compares B\'s commit with what A read. Outcome for A: **' + (bad ? o.a : 'committed') + '**.']
            ], function (r, n) { return n === 2 ? (bad ? 'dup' : 'new') : ''; }) +
            '<div class="lab-out"><div class="big ' + (bad ? 'bad' : 'good') + '"><b>' + (bad ? 'A failed' : 'A committed') + '</b><span>' + esc(bad ? o.a : 'on top of version 1') + '</span></div><div class="big"><b>' + o.rows + ' rows</b><span>in the table at the end</span></div><div class="big"><b>' + o.history.length + ' versions</b><span>' + esc(o.history.join(', ')) + '</span></div></div>' +
            '<div class="callout ' + (bad ? 'warn' : 'good') + '">' + md(cur.why) + '</div>';
          if (bad) h += H.code({ file: 'the error A received', lang: 'text', code: G.text('delta.conflict_' + cur.k) }) +
            (o.retry ? '<div class="callout tip"><b>Retry.</b> I ran the same update again with no competitor. It committed, and ' + o.rows_after_retry + ' rows then had status SHIPPED.</div>' : '');
        } else {
          h += table(['Pair', 'A', 'B', 'Rows at the end', 'Why'], SC.map(function (x) {
            var y = out(x.k);
            return ['**' + x.name + '**', failed(x.k) ? y.a : 'committed', y.b, String(y.rows), x.why];
          }), function (r, n) { return SC[n].k === cur.k ? 'trk' : ''; }) +
            '<div class="callout tip"><b>How to avoid conflicts.</b> Add the partition column to the condition of every update and merge. Keep long backfills away from the nightly merge. Retry once with a short wait, and look at <code>DESCRIBE HISTORY</code> to see which commit won.</div>';
        }
        box.innerHTML = h + '</div>';
        box.querySelectorAll('.code').forEach(function (c) { H.bindCode(c, c.textContent); });
        A.bindWidget = function (act, el) { if (act === 'cf-pick') { st.k = el.getAttribute('data-v'); A.render(true); } };
      }
    };
    W.conflictInfo = { scenarios: SC, failed: failed };
  })();

  /* ====================== Watermark lab ====================== */
  (function () {
    var DELAY = 10;
    function parse(t) { var p = t.split(':'); return +p[0] * 60 + +p[1]; }
    function fmt(m) { return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2); }
    function win(m) { return Math.floor(m / 10) * 10; }
    function win2(w) { return fmt(w) + ' to ' + fmt(w + 10); }
    /* replay the recorded arrivals with the watermark rule: late if the window already ended before the watermark */
    function replay(upto) {
      var runs = G.counts('stream.watermark_runs'), wm = null, maxEt = null, state = {}, done = {}, out = [];
      for (var i = 0; i <= upto; i++) {
        var ev = runs[i].event_times.map(parse), rows = [], dropped = 0;
        ev.forEach(function (m) {
          var late = wm !== null && win(m) + 10 <= wm;
          if (late) dropped++; else state[win(m)] = (state[win(m)] || 0) + 1;
          rows.push({ t: m, w: win(m), late: late });
          maxEt = maxEt === null ? m : Math.max(maxEt, m);
        });
        var wmBefore = wm;
        wm = maxEt - DELAY;
        var emitted = [];
        Object.keys(state).map(Number).sort(function (a, b) { return a - b; }).forEach(function (w) { if (!done[w] && w + 10 <= wm) { done[w] = true; emitted.push({ start: w, orders: state[w] }); } });
        out.push({ label: runs[i].label, rows: rows, dropped: dropped, wmBefore: wmBefore, wm: wm, maxEt: maxEt, emitted: emitted, state: JSON.parse(JSON.stringify(state)), done: JSON.parse(JSON.stringify(done)) });
      }
      return out;
    }
    /* the replay must agree with what Spark recorded */
    (function check() {
      var runs = G.counts('stream.watermark_runs'), all = replay(runs.length - 1);
      all.forEach(function (st, i) {
        var r = runs[i];
        G.expect(fmt(st.wm) === r.watermark.slice(11, 16), 'the watermark after arrival ' + (i + 1) + ' is ' + r.watermark);
        G.expect(st.dropped === r.dropped_by_watermark, 'rows dropped by the watermark in arrival ' + (i + 1));
        G.expect(JSON.stringify(st.emitted.map(function (e) { return [fmt(e.start), e.orders]; })) === JSON.stringify(r.emitted.map(function (e) { return [e.window_start.slice(11, 16), e.orders]; })), 'windows emitted in arrival ' + (i + 1));
      });
    })();
    W.watermark = {
      steps: function () { return 2; },
      hint: 'Pick an arrival. Read the watermark and the verdict on each event.',
      say: function (s, i) {
        return [
          'These are the three files that fed the real stream. Each file is one run. Pick one and read three things: the largest event time so far, the watermark that follows from it (that time minus 10 minutes), and what Spark did with each event.',
          'Now compare the stream with a plain batch count over the same three files. They disagree in one window. That window lost an event, because the event arrived after Spark had closed the window.'
        ][i];
      },
      mood: function (s, i) { return i === 0 ? 'think' : 'oops'; },
      render: function (box, s, i, A) {
        var st = A.local.wm || (A.local.wm = { k: 0 }), runs = G.counts('stream.watermark_runs'), h = '<div class="lab">';
        if (i === 0) {
          var cur = replay(st.k)[st.k], r = runs[st.k];
          var winRows = Object.keys(cur.state).map(Number).sort(function (a, b) { return a - b; }).map(function (w) {
            var closed = cur.done[w], status = closed ? 'emitted with ' + cur.state[w] + ' orders' : 'open';
            return [win2(w), String(cur.state[w]), status];
          });
          h += '<div class="sel-chips">' + chips([0, 1, 2], st.k, 'wm-k', function (k) { return 'arrival ' + (k + 1) + ': ' + runs[k].event_times.join(', '); }) + '</div>' +
            '<div class="lab-out"><div class="big"><b>' + fmt(cur.maxEt) + '</b><span>largest event time so far</span></div><div class="big"><b>' + fmt(cur.wm) + '</b><span>watermark: largest minus ' + DELAY + ' minutes</span></div><div class="big ' + (cur.dropped ? 'bad' : 'good') + '"><b>' + cur.dropped + '</b><span>events dropped as late (Spark counted ' + r.dropped_by_watermark + ')</span></div></div>' +
            table(['Event time', 'Its window', 'Verdict'], cur.rows.map(function (e) {
              return [fmt(e.t), win2(e.w), e.late ? 'dropped: the window ended before the watermark ' + fmt(cur.wmBefore) : 'counted'];
            }), function (row, n) { return cur.rows[n].late ? 'dup' : ''; }) +
            table(['Window', 'Orders in state', 'Status after this arrival'], winRows, function (row, n) { return /emitted/.test(row[2]) ? 'new' : ''; });
          h += '<div class="callout ' + (cur.dropped ? 'warn' : 'tip') + '">' + md(
            st.k === 0 ? 'No window can close yet. The watermark ' + fmt(cur.wm) + ' is before the end of every window, so Spark emits nothing and keeps the three events in its state.' :
            st.k === 1 ? 'The watermark moved to ' + fmt(cur.wm) + '. The window ' + win2(cur.emitted[0].start) + ' ended at ' + fmt(cur.emitted[0].start + 10) + ', before the watermark. Spark emits it with **' + cur.emitted[0].orders + '** orders and drops its state.' :
            'The 09:04 event belongs to the window 09:00 to 09:10. Spark closed that window in the last run, so the event arrives too late and Spark **drops it**. Meanwhile the event at 09:31 moves the watermark to ' + fmt(cur.wm) + ', which closes the window ' + win2(cur.emitted[0].start) + '.') + '</div>';
        } else {
          var batch = G.table('stream.watermark_batch_counts'), last = replay(2)[2];
          var rows = batch.rows.map(function (b) {
            var w = parse(b[0].slice(11, 16)), done = last.done[w], got = done ? String(last.state[w]) : 'not emitted yet';
            return [win2(w), got, b[2], done ? String(parseInt(b[2], 10) - last.state[w]) : 'still open'];
          });
          h += table(['Window', 'Stream result', 'Batch recount', 'Events lost'], rows, function (row) { return row[3] !== '0' && row[3] !== 'still open' ? 'dup' : ''; }) +
            '<div class="callout warn">The stream said <b>3</b> for the first window. The batch recount says <b>4</b>. Spark reported <b>' + runs[2].dropped_by_watermark + '</b> row dropped by the watermark. The batch job has no watermark, so it counts every event.</div>' +
            '<div class="callout tip"><b>The trade.</b> A longer watermark would have kept the window open until 09:14 or later and counted the late event. It would also have delayed every result and kept more state. Pick the delay from how late your events really arrive.</div>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'wm-k') { st.k = +el.getAttribute('data-v'); A.render(true); } };
      }
    };
    W.watermarkInfo = { replay: replay };
  })();

  /* ====================== Join strategy lab ====================== */
  (function () {
    var PLANS = [
      { k: 'plan.join_default', name: 'Default settings', why: 'The product table is tiny, so Spark ships a copy of it to every executor and joins without moving the big table.' },
      { k: 'plan.join_no_broadcast', name: 'Broadcast switched off', why: 'With the threshold at -1, Spark sorts and shuffles both sides on the join key, then merges them.' },
      { k: 'plan.join_hint_shuffle_hash', name: 'Hint: shuffle_hash', why: 'Both sides are shuffled by the key. Spark builds a hash table from the small side and probes it, without a sort.' },
      { k: 'plan.join_hint_merge', name: 'Hint: merge', why: 'The hint forces a sort-merge join: shuffle both sides, sort both, merge.' },
      { k: 'plan.join_hint_broadcast', name: 'Hint: broadcast', why: 'Even with the threshold at -1, the hint tells Spark to broadcast the small side.' }
    ];
    function info(k) {
      var p = G.text(k), m = /(BroadcastHashJoin|SortMergeJoin|ShuffledHashJoin)/.exec(p);
      return { join: m ? m[1] : '?', shuffles: (p.match(/Exchange hashpartitioning/g) || []).length, broadcasts: (p.match(/BroadcastExchange/g) || []).length, sorts: (p.match(/\bSort \[/g) || []).length, line: m ? G.at(p, new RegExp(m[1])) : 1 };
    }
    W.joins = {
      steps: function () { return 2; },
      hint: 'Pick a setting. Find the join in the plan.',
      say: function (s, i) {
        return [
          'The same join, five ways. Spark printed each physical plan. Read it from the bottom up: scans first, then the exchanges that move data, then the join. Pick a setting and find the join operator.',
          'Now count what each plan does. A shuffle moves every row across the network. A broadcast copies one small table to every executor. The cheapest plan for a small dimension has no shuffle at all.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.jn || (A.local.jn = { k: PLANS[0].k });
        var cur = PLANS.filter(function (x) { return x.k === st.k; })[0], f = info(cur.k), h = '<div class="lab">';
        if (i === 0) {
          h += '<div class="sel-chips">' + chips(PLANS.map(function (x) { return x.k; }), cur.k, 'jn-pick', function (k) { return PLANS.filter(function (x) { return x.k === k; })[0].name; }) + '</div>' +
            '<div class="lab-out"><div class="big"><b>' + esc(f.join) + '</b><span>the join Spark chose</span></div><div class="big ' + (f.shuffles ? 'warn' : 'good') + '"><b>' + f.shuffles + '</b><span>shuffles (Exchange hashpartitioning)</span></div><div class="big"><b>' + f.broadcasts + '</b><span>broadcasts</span></div></div>' +
            H.code({ file: 'explain() output', lang: 'text', code: G.text(cur.k), hl: [f.line, f.line] }) +
            '<div class="callout tip">' + md(cur.why) + '</div>';
        } else {
          h += table(['Setting', 'Join', 'Shuffles', 'Broadcasts', 'Sorts'], PLANS.map(function (x) { var y = info(x.k); return ['**' + x.name + '**', y.join, String(y.shuffles), String(y.broadcasts), String(y.sorts)]; }), function (r, n) { return PLANS[n].k === cur.k ? 'trk' : ''; }) +
            '<div class="callout tip"><b>How to choose.</b> Let Spark broadcast a small dimension. Raise <code>spark.sql.autoBroadcastJoinThreshold</code> only when you know the table stays small. Use a hint when the statistics are wrong. Two large tables need a shuffle, and then the key distribution decides whether it is fast.</div>';
        }
        box.innerHTML = h + '</div>';
        var code = box.querySelector('.code'); if (code) H.bindCode(code, G.text(cur.k));
        A.bindWidget = function (act, el) { if (act === 'jn-pick') { st.k = el.getAttribute('data-v'); A.render(true); } };
      }
    };
    W.joinInfo = { info: info, plans: PLANS };
  })();

  /* ====================== Skew lab ====================== */
  (function () {
    function stats(a) { var mx = Math.max.apply(null, a), sum = a.reduce(function (x, y) { return x + y; }, 0), mean = sum / a.length; return { max: mx, mean: mean, ratio: mx / mean, sum: sum }; }
    function bar(label, n, max, cls) { return '<div class="lane"><span class="lane-n">' + esc(label) + '</span><div class="lane-track"><div class="gbar ' + (cls || '') + '" style="left:0;width:' + Math.max(1, Math.round(n / max * 100)) + '%"></div></div><span class="lane-v">' + fmtN(n) + '</span></div>'; }
    W.skew = {
      steps: function () { return 2; },
      hint: 'Compare the longest bar with the others.',
      say: function (s, i) {
        return [
          'Two ways to spread 300,000 rows over 8 partitions. In this data, 80 percent of the rows have the key K-0. Hash by the key alone and one partition gets almost everything. Add a salt column and the load spreads. A task is as slow as its biggest partition.',
          'Adaptive query execution can split a skewed partition for you at run time. Here are the real final plans of the same join, once with skew handling switched off and once with it on.'
        ][i];
      },
      mood: function (s, i) { return i === 0 ? 'oops' : 'think'; },
      render: function (box, s, i, A) {
        var sz = G.counts('spark.skew_partition_sizes'), a = stats(sz.by_key), b = stats(sz.salted_32), mx = Math.max(a.max, b.max), h = '<div class="lab">';
        if (i === 0) {
          h += '<div class="lab-out"><div class="big bad"><b>' + a.ratio.toFixed(1) + 'x</b><span>biggest partition against the average, by key</span></div><div class="big good"><b>' + b.ratio.toFixed(1) + 'x</b><span>with a salt of 32 values</span></div></div>' +
            '<h3 class="lab-h">Rows in each partition, repartition by key</h3><div class="gantt">' + sz.by_key.map(function (n, k) { return bar('partition ' + k, n, mx, n === a.max ? 'bad' : ''); }).join('') + '</div>' +
            '<h3 class="lab-h">Rows in each partition, repartition by key and salt</h3><div class="gantt">' + sz.salted_32.map(function (n, k) { return bar('partition ' + k, n, mx); }).join('') + '</div>' +
            '<p class="lab-note">Real counts from <code>spark_partition_id()</code> in the recording. The salt is <code>pmod(v, 32)</code>, so one key becomes 32 groups that hash to different partitions.</p>';
        } else {
          var off = G.text('plan.skew_off'), on = G.text('plan.skew_on');
          h += '<div class="pair"><div><div class="compiled-h">Skew handling off</div>' + H.code({ file: 'final plan', lang: 'text', code: G.grep(off, /SortMergeJoin|AQEShuffleRead/) }) + '</div>' +
            '<div><div class="compiled-h">Skew handling on</div>' + H.code({ file: 'final plan', lang: 'text', code: G.grep(on, /SortMergeJoin|AQEShuffleRead/) }) + '</div></div>' +
            '<div class="callout good">With the setting on, the join says <b>skew=true</b> and the read of the big side says <b>skewed</b>. Spark split the oversized partition into smaller ones and joined each with a copy of the matching rows. I lowered the size thresholds so this small data set would trigger it.</div>';
        }
        box.innerHTML = h + '</div>';
        box.querySelectorAll('.code').forEach(function (c) { H.bindCode(c, c.textContent); });
        A.bindWidget = function () {};
      }
    };
    W.skewInfo = { stats: stats };
  })();

  /* ====================== Data skipping lab ====================== */
  (function () {
    function inRange(v, f) { return f.min <= v && v <= f.max; }
    function count(files, v) { return files.filter(function (f) { return inRange(v, f); }).length; }
    var CUSTOMERS = ['C-0420', 'C-0000', 'C-0603', 'C-1000', 'C-1999'];
    function grid(files, v, big) {
      return '<div class="skipgrid' + (big ? ' big' : '') + '">' + files.map(function (f) {
        var on = inRange(v, f);
        return '<div class="skf ' + (on ? 'read' : 'skipped') + '" title="' + esc(f.file + ' ' + f.min + ' to ' + f.max) + '"><b>' + esc(f.file.replace('part-', '').replace('.snappy.parquet', '')) + '</b>' + (big ? '<span>' + esc(f.min + ' to ' + f.max) + '</span><span>' + fmtN(f.rows) + ' rows</span>' : '') + '</div>';
      }).join('') + '</div>';
    }
    W.skipping = {
      steps: function () { return 2; },
      hint: 'Pick a customer. Count the files that can hold it.',
      say: function (s, i) {
        return [
          'Delta stores the minimum and maximum of each column for every file in the log. A query with a filter skips the files whose range cannot contain the value. Before OPTIMIZE ZORDER, every file spans every customer. After it, the files hold separate ranges. Pick a customer.',
          'Liquid clustering reaches the same result without a ZORDER command: you declare the clustering columns on the table, and OPTIMIZE keeps the data grouped by them. This is the real result on the same data.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var z = G.counts('layout.zorder'), st = A.local.sk || (A.local.sk = { v: CUSTOMERS[0] }), h = '<div class="lab">';
        if (i === 0) {
          var b = count(z.files_before, st.v), a = count(z.files_after, st.v);
          h += '<div class="sel-chips">' + chips(CUSTOMERS, st.v, 'sk-v', function (k) { return "customer_id = '" + k + "'"; }) + '</div>' +
            '<div class="lab-out"><div class="big bad"><b>' + b + ' of ' + z.files_before.length + '</b><span>files can hold it before ZORDER</span></div><div class="big good"><b>' + a + ' of ' + z.files_after.length + '</b><span>files can hold it after ZORDER</span></div></div>' +
            '<h3 class="lab-h">Before: 16 files, each spans C-0000 to C-1999</h3>' + grid(z.files_before, st.v, false) +
            '<h3 class="lab-h">After OPTIMIZE ... ZORDER BY (customer_id): 3 files</h3>' + grid(z.files_after, st.v, true) +
            (st.v === z.predicate.match(/'([^']+)'/)[1] ? '<div class="callout good"><b>Recorded.</b> Spark reported that the scan read <b>' + z.scan_files_before + '</b> files before and <b>' + z.scan_files_after + '</b> after, for this filter. The counts above come from the min and max stats, and they agree.</div>' : '<div class="callout tip">Counted from the min and max in the log. Ranges of neighbouring files overlap at the edges, so a value on a boundary can need two files.</div>');
        } else {
          var lc = G.counts('layout.liquid_scan'), lo = G.counts('layout.liquid_optimize'), ld = G.counts('layout.liquid_after');
          h += '<div class="lab-out"><div class="big"><b>' + esc(ld.clusteringColumns.join(', ')) + '</b><span>clustering column of the table</span></div><div class="big good"><b>' + lc.scan_files + ' of ' + lc.total_files + '</b><span>files read for ' + esc(lc.predicate) + '</span></div><div class="big"><b>' + lo.numFilesRemoved + ' to ' + lo.numFilesAdded + '</b><span>files before and after OPTIMIZE</span></div></div>' +
            H.code({ file: 'declared once', lang: 'sql', code: 'CREATE TABLE lc_orders (order_id BIGINT, customer_id STRING, qty INT)\nUSING DELTA\nCLUSTER BY (customer_id);\n\nOPTIMIZE lc_orders;' }) +
            '<div class="callout tip">The table features recorded for this table include <b>' + esc(ld.tableFeatures.join(', ')) + '</b>. Clustering is a table property, so a change of mind is an <code>ALTER TABLE ... CLUSTER BY</code> and not a rewrite of the layout rules in every job.</div>';
        }
        box.innerHTML = h + '</div>';
        box.querySelectorAll('.code').forEach(function (c) { H.bindCode(c, c.textContent); });
        A.bindWidget = function (act, el) { if (act === 'sk-v') { st.v = el.getAttribute('data-v'); A.render(true); } };
      }
    };
    W.skipInfo = { inRange: inRange, count: count, customers: CUSTOMERS };
  })();

  /* ====================== Cost lab (example rates) ====================== */
  (function () {
    var TYPES = [
      { k: 'jobs', name: 'Jobs compute', rate: 0.30, note: 'Automated runs. The lowest price for each DBU.' },
      { k: 'allp', name: 'All-purpose compute', rate: 0.55, note: 'Interactive clusters shared by people. A higher price for each DBU.' },
      { k: 'sql', name: 'Serverless SQL', rate: 0.70, note: 'The rate includes the virtual machines.', serverless: true }
    ];
    function monthly(o) {
      var t = TYPES.filter(function (x) { return x.k === o.type; })[0];
      var nodes = o.workers + 1;
      var vm = t.serverless ? 0 : (1 + o.workers * (1 - o.spot)) * o.vm * o.hours * o.days;      /* spot prices apply to workers, the driver stays on demand */
      var dbu = t.serverless ? o.dbuh * o.hours * o.days : nodes * o.dbuh * o.hours * o.days;
      var dbuCost = dbu * t.rate;
      return { dbu: dbu, dbuCost: dbuCost, vmCost: vm, total: dbuCost + vm, nodes: nodes };
    }
    /* hours a cluster is billed in a day, when one job of `run` minutes runs each day and the cluster stops after `idle` minutes without work */
    function billedHours(run, idle) { return (run + idle) / 60; }
    W.dbu = {
      steps: function () { return 3; },
      hint: 'Click the choices. The numbers update.',
      say: function (s, i) {
        return [
          'This is arithmetic, not a price list. A classic cluster bills twice: Databricks charges DBUs, and your cloud charges for the virtual machines. Pick the workload, the size and the hours. The rates are examples. Your contract and cloud set the real ones.',
          'The same nightly job on two kinds of compute. The only difference is the price of each DBU. Jobs compute exists for automated runs, and the difference adds up over a month.',
          'A cluster bills while it is up, not while it works. A nightly job that runs 45 minutes on a cluster that stops after 2 hours of idle time pays for the idle time too.'
        ][i];
      },
      mood: function (s, i) { return i === 2 ? 'oops' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.dbu || (A.local.dbu = { type: 'jobs', workers: 4, vm: 0.5, dbuh: 1, hours: 2, days: 30, spot: 0, run: 45, idle: 120 });
        var h = '<div class="lab">';
        if (i === 0) {
          var r = monthly(st);
          h += '<div class="lab-row"><span class="lab-l">Compute type</span><div class="sel-chips">' + chips(TYPES.map(function (x) { return x.k; }), st.type, 'd-type', function (k) { var t = TYPES.filter(function (x) { return x.k === k; })[0]; return t.name + ' ($' + t.rate.toFixed(2) + ' a DBU)'; }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">Workers</span><div class="sel-chips">' + chips([2, 4, 8, 16], st.workers, 'd-w', function (k) { return k + ' workers + driver'; }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">VM price an hour</span><div class="sel-chips">' + chips([0.25, 0.5, 1, 2], st.vm, 'd-vm', function (k) { return '$' + k.toFixed(2); }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">DBUs a node uses an hour</span><div class="sel-chips">' + chips([0.5, 1, 2, 4], st.dbuh, 'd-dbu', function (k) { return String(k); }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">Hours a day</span><div class="sel-chips">' + chips([1, 2, 6, 24], st.hours, 'd-h', function (k) { return String(k); }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">Spot or low-priority VMs</span><div class="sel-chips">' + chips([0, 0.6], st.spot, 'd-spot', function (k) { return k ? 'workers 60 percent off' : 'none'; }) + '</div></div>' +
            '<div class="lab-out"><div class="big"><b>' + fmtN(r.dbu) + '</b><span>DBUs a month</span></div><div class="big"><b>$' + fmtN(r.dbuCost) + '</b><span>Databricks charge</span></div><div class="big"><b>$' + fmtN(r.vmCost) + '</b><span>cloud VM charge' + (TYPES.filter(function (x) { return x.k === st.type; })[0].serverless ? ' (included in the rate)' : '') + '</span></div><div class="big ' + (r.total > 3000 ? 'bad' : r.total > 800 ? 'warn' : 'good') + '"><b>$' + fmtN(r.total) + '</b><span>a month of 30 days</span></div></div>' +
            '<p class="lab-note">' + esc(TYPES.filter(function (x) { return x.k === st.type; })[0].note) + ' Spot discounts apply to the worker VMs only. The driver stays on demand.</p>';
        } else if (i === 1) {
          var rows = TYPES.slice(0, 2).map(function (t) { var r2 = monthly(Object.assign({}, st, { type: t.k })); return [t.name, '$' + t.rate.toFixed(2), fmtN(r2.dbu), '$' + fmtN(r2.dbuCost), '$' + fmtN(r2.vmCost), '$' + fmtN(r2.total)]; });
          h += table(['Compute type', 'Price a DBU', 'DBUs a month', 'Databricks charge', 'VM charge', 'Total'], rows, function (r, k) { return k === 0 ? 'new' : 'dup'; }) +
            '<div class="callout tip">Same cluster, same hours, same VMs. The all-purpose price for each DBU makes the Databricks part ' + (TYPES[1].rate / TYPES[0].rate).toFixed(1) + ' times higher. Run scheduled work on jobs compute, and keep all-purpose clusters for people who need to be interactive.</div>';
        } else {
          var hrs = billedHours(st.run, st.idle), hrsShort = billedHours(st.run, 10), a = monthly(Object.assign({}, st, { type: 'allp', hours: hrs, days: 30 })), b = monthly(Object.assign({}, st, { type: 'allp', hours: hrsShort, days: 30 }));
          h += '<div class="lab-row"><span class="lab-l">The job runs</span><div class="sel-chips">' + chips([15, 45, 90], st.run, 'd-run', function (k) { return k + ' minutes'; }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">Auto-terminate after idle</span><div class="sel-chips">' + chips([10, 30, 120], st.idle, 'd-idle', function (k) { return k + ' minutes'; }) + '</div></div>' +
            table(['Auto-termination', 'Billed hours a day', 'Cost a month'], [[st.idle + ' minutes', fmtN(hrs, 2), '$' + fmtN(a.total)], ['10 minutes', fmtN(hrsShort, 2), '$' + fmtN(b.total)]], function (r, k) { return k === 0 ? 'dup' : 'new'; }) +
            '<div class="callout ' + (st.idle > 10 ? 'warn' : 'good') + '">At ' + st.idle + ' minutes of idle time the cluster is billed ' + fmtN(hrs, 2) + ' hours for ' + fmtN(st.run / 60, 2) + ' hours of work. A job cluster that stops when the job ends removes the idle time.</div>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'd-type') st.type = v; if (act === 'd-w') st.workers = +v; if (act === 'd-vm') st.vm = +v; if (act === 'd-dbu') st.dbuh = +v; if (act === 'd-h') st.hours = +v;
          if (act === 'd-spot') st.spot = +v; if (act === 'd-run') st.run = +v; if (act === 'd-idle') st.idle = +v;
          A.render(true);
        };
      }
    };
    W.dbuCalc = { monthly: monthly, billedHours: billedHours, types: TYPES };
  })();
})();
