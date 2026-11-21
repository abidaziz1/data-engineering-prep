/* Microsoft Fabric course labs. Each one registers LAB.W.<kind> with steps, say, render.
   What a lab shows as a result comes from js/real.js: real Apache Spark and Delta Lake in a lakehouse-shaped folder.
   Text in notes and callouts goes through the formatter: use `code` and **bold**, never HTML tags. Microsoft Fabric itself did not run. The capacity lab is from documentation and says so. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var W = (LAB.W = LAB.W || {});
  var esc = LAB.esc, md = LAB.md, G = LAB.get;

  function chips(list, cur, act, fmt) {
    return '<div class="sel-chips">' + list.map(function (k) { return '<button type="button" class="sel-chip' + (String(k) === String(cur) ? ' on' : '') + '" data-act="' + act + '" data-v="' + esc(String(k)) + '">' + esc(fmt ? fmt(k) : String(k)) + '</button>'; }).join('') + '</div>';
  }
  function row(label, inner) { return '<div class="lab-row"><span class="lab-l">' + esc(label) + '</span>' + inner + '</div>'; }
  function table(cols, rows, rowCls, numFrom) {
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + cols.map(function (c, ci) { return '<th' + (numFrom != null && ci >= numFrom ? ' class="rnum"' : '') + '>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r, ri) { return '<tr class="' + (rowCls ? rowCls(r, ri) || '' : '') + '">' + r.map(function (c, ci) { return '<td' + (numFrom != null && ci >= numFrom ? ' class="rnum"' : '') + '>' + esc(String(c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function big(items) { return '<div class="lab-out">' + items.map(function (x) { return '<div class="big' + (x[2] ? ' ' + x[2] : '') + '"><b>' + esc(String(x[0])) + '</b><span>' + esc(x[1]) + '</span></div>'; }).join('') + '</div>'; }
  function callout(kind, text) { return '<div class="callout ' + kind + '">' + md(text) + '</div>'; }
  function note(recorded, computed) {
    return '<p class="lab-note"><span class="pill real">Recorded</span>' + md(recorded) + (computed ? ' <span class="pill">Computed</span>' + md(computed) : '') + '</p>';
  }
  function bar(label, v, max, text, cls) {
    var pc = max > 0 ? Math.max(1, Math.min(100, v / max * 100)) : 0;
    return '<div class="lane"><span class="lane-n">' + esc(label) + '</span><div class="lane-track"><i class="' + (cls || '') + '" style="width:' + pc + '%"></i></div><span class="lane-v">' + esc(text) + '</span></div>';
  }
  var n = G.n;
  function pre(text, cls) { return '<pre class="lab-pre' + (cls ? ' ' + cls : '') + '">' + esc(text) + '</pre>'; }





  function kb(x) { return x >= 1048576 ? (x / 1048576).toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' MB' : x >= 1024 ? (x / 1024).toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' kB' : n(x) + ' bytes'; }
  function docsNote(text, computed) {
    return '<p class="lab-note"><span class="pill">From documentation</span>' + md(text) + (computed ? ' <span class="pill">Computed</span>' + md(computed) : '') + '</p>';
  }

  /* ====================== 1. The log of a table: five commits, five versions ====================== */
  W.loglab = (function () {
    var OP = [
      'The first write made the table: one Parquet file, one log file with the schema, the protocol and the first `add`.',
      'A second file of the same shape was **appended**. The log got a second JSON file, and the first file was not touched.',
      'A third append. Every version is a list of files, and each commit added one more name to the list.',
      'The fourth file had 100 orders that the third one also held, so the table now has duplicates. A plain append does not check.',
      'The fifth append. Reading `VERSION AS OF` any number from 0 to 4 gives the table as it was after that commit.'
    ];
    return {
      steps: function () { return 1; },
      hint: 'Pick a version and read what the log says.',
      say: function () { return 'Five daily files, appended one by one to the bronze table. Each append is a commit, and each commit is a version. Pick a version and say how many files the table has, and how many rows you get if you read it as of that version.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var h = G.table('bronze.history'), tt = G.table('bronze.timetravel'), st = A.local.ll || (A.local.ll = { k: 4 }), k = st.k;
        var files = 0, j; for (j = 0; j <= k; j++) files += h.rows[j][2];
        var rows = tt.rows[k][1], maxR = tt.rows[tt.rows.length - 1][1];
        var out = '<div class="lab">' + row('Version', chips(h.rows.map(function (x, q) { return q; }), k, 'll-k', function (q) { return 'version ' + q; }));
        out += big([[k, 'version'], [files, 'files in the table', files > 3 ? 'warn' : 'good'], [h.rows[k][3] ? n(h.rows[k][3]) : '0', 'rows written by this commit'], [n(rows), 'rows at this version']]);
        out += bar('rows at this version', rows, maxR, n(rows), 'good');
        out += table(['version', 'operation', 'files added', 'rows written', 'rows if read at this version'], h.rows.map(function (r, q) { return [r[0], r[1], r[2], n(r[3]), n(tt.rows[q][1])]; }), function (r, q) { return q === k ? 'new' : ''; }, 2);
        out += callout(k === 3 ? 'warn' : 'tip', OP[k]);
        out += note(' The versions, the files and the row counts come from `DESCRIBE HISTORY` and from `VERSION AS OF` reads of a real Delta table.');
        box.innerHTML = out + '</div>';
        A.bindWidget = function (act, el) { if (act === 'll-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 2. Eight runs of a merge ====================== */
  W.mergelab = (function () {
    return {
      steps: function () { return 1; },
      hint: 'Pick a run and read the four numbers.',
      say: function () { return 'The silver step of the Brewline notebook, run for each daily file, then again for the same file, then for two files in the wrong order. After each run I counted the rows that were inserted, the rows that were updated, the rows in the table and the orders marked cancelled. Pick a run and say whether it was safe.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var t = G.table('silver.merge_runs'), st = A.local.ml || (A.local.ml = { k: 4 }), r = t.rows[st.k];
        var replay = /replayed/.test(r[0]), again = /again/.test(r[0]);
        var kind = replay && r[3] > 0 ? 'bad' : again ? 'good' : 'tip';
        var why = replay && r[3] > 0
          ? 'The file is **older** than the table. Its rows matched, their values differ from the newer ones, and the condition `t.status <> s.status` says "update". The merge **repeats safely but is not safe to replay out of order**: ' + r[3] + ' rows went back to an older value, and the cancelled orders are now **' + r[7] + '**.'
          : again
            ? 'The same file again, straight away. **' + r[2] + ' rows inserted, ' + r[3] + ' updated.** No row changed. The merge still made version ' + r[4] + ' and rewrote **' + r[8] + '** files, because it rewrites every file that holds a row that matched, even when the row is the same.'
            : r[3] > 0
              ? 'The new file held **' + r[3] + ' orders of the day before with another status**. The condition found them and updated them: **' + r[3] + ' updated**, and ' + n(r[2]) + ' new orders inserted. Cancelled orders: **' + r[7] + '**.'
              : 'A new day. ' + (r[1] - r[2] > 0 ? 'Of the ' + n(r[1]) + ' lines, ' + n(r[1] - r[2]) + ' were not inserted: they were rejected as bad rows, or were orders that the table already held with the same values, and nothing was updated.' : 'Every line was a new order.');
        var out = '<div class="lab">' + row('Run', chips(t.rows.map(function (x, k) { return k; }), st.k, 'ml-k', function (k) { return t.rows[k][0]; }));
        out += big([[n(r[1]), 'lines in the file'], [n(r[2]), 'inserted', r[2] ? 'good' : ''], [n(r[3]), 'updated', r[3] ? (replay ? 'bad' : 'warn') : 'good'], [n(r[5]), 'rows in the table'], [n(r[7]), 'cancelled orders', replay ? 'bad' : ''], [n(r[8]), 'files written', r[8] ? '' : 'good']]);
        out += callout(kind, why);
        var keep = [0, 2, 3, 4, 5, 7, 8];      // the other columns are in the numbers above
        out += table(keep.map(function (q) { return t.cols[q]; }), t.rows.map(function (x) { return [x[0], n(x[2]), n(x[3]), x[4], n(x[5]), n(x[7]), x[8]]; }), function (x, q) { return q === st.k ? 'new' : ''; }, 1);
        out += note(' The counts are the `operationMetrics` of each `MERGE` in `DESCRIBE HISTORY`, from the notebook code of this course on real Delta Lake.');
        box.innerHTML = out + '</div>';
        A.bindWidget = function (act, el) { if (act === 'ml-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 3. Small files, OPTIMIZE and VACUUM ====================== */
  W.fileslab = (function () {
    return {
      steps: function () { return 1; },
      hint: 'Pick a step and read the two file counts.',
      say: function () { return 'A table that was written forty times, 100 rows each time. Then OPTIMIZE. Then VACUUM with a retention of zero hours. After each step I counted the files that the table lists and the files that are in the folder, and I tried to read the table as of version 5. Pick a step.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var t = G.table('files.lifecycle'), TE = G.counts('files.timetravel_error'), st = A.local.fl || (A.local.fl = { k: 1 }), r = t.rows[st.k];
        var can = st.k < 2;
        var why = [
          'Forty commits made forty small files. Every query has to open all of them, and the log has forty JSON files and four checkpoints.',
          '`OPTIMIZE` wrote **one** file with all 4,000 rows and listed the forty small files as removed. The folder still holds all forty-one files, because the old versions need them: **time travel to version 5 still works**.',
          '`VACUUM RETAIN 0 HOURS` deleted the forty files that no current version uses. The folder is down to **one** file, and reading version 5 fails with `' + TE.condition + '`. The log still lists version 5, and the data under it is gone.'
        ];
        var out = '<div class="lab">' + row('Step', chips(t.rows.map(function (x, k) { return k; }), st.k, 'fl-k', function (k) { return (k + 1) + '. ' + t.rows[k][0]; }));
        out += bar('files the table lists', r[1], 40, n(r[1]), r[1] > 10 ? 'bad' : 'good');
        out += bar('files in the folder', r[2], 41, n(r[2]), r[2] > 10 ? 'warn' : 'good');
        out += big([[n(r[1]), 'files in the table', r[1] > 10 ? 'bad' : 'good'], [n(r[2]), 'files in the folder', r[2] > 10 ? 'warn' : 'good'], [can ? 'works' : 'fails', 'read as of version 5', can ? 'good' : 'bad']]);
        out += callout(st.k === 2 ? 'bad' : st.k === 1 ? 'tip' : 'warn', why[st.k]);
        out += note(' The counts come from `DESCRIBE DETAIL`, the folder listing and a real read of version 5 on Delta Lake 4.0.1. The default retention of `VACUUM` is 7 days, and zero hours needs a setting that switches off a safety check.');
        box.innerHTML = out + '</div>';
        A.bindWidget = function (act, el) { if (act === 'fl-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 4. Partition by what? ====================== */
  W.partlab = (function () {
    return {
      steps: function () { return 1; },
      hint: 'Pick a column and compare the files.',
      say: function () { return 'The same 10,000 orders, written four times: with no partition, and partitioned by the order date, the store and the customer. I wrote each one with a single task, so every partition value got one file. Pick a column and say whether this table needs it.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var t = G.table('partition.layout'), PR = G.counts('partition.pruning'), st = A.local.pl || (A.local.pl = { k: 1 }), r = t.rows[st.k];
        var maxF = Math.max.apply(null, t.rows.map(function (x) { return x[2]; }));
        var per = Math.round(10000 / r[2]);
        var why = [
          'One file of 10,000 rows. A query reads it whole, but the table is small and there is nothing to maintain.',
          'Five dates, five files of about 2,000 rows. A filter on the date reads **one** file: the recorded plan has `PartitionFilters` on `order_date`, and ' + n(PR.rows_for_the_day) + ' rows came back from one of ' + PR.files_total + ' files.',
          'Twelve stores, twelve files. It helps only if queries filter on the store, and every new store adds a folder.',
          'Four hundred customers made **400 files of about ' + per + ' rows**. Each file is almost all overhead: the file footer, the log entry, the open call. This is the small files problem made by a partition column.'
        ];
        var out = '<div class="lab">' + row('Partitioned by', chips(t.rows.map(function (x, k) { return k; }), st.k, 'pl-k', function (k) { return t.rows[k][0]; }));
        out += bar('files', r[2], maxF, n(r[2]), r[2] > 100 ? 'bad' : r[2] > 5 ? 'warn' : 'good');
        out += bar('bytes in all', r[3], Math.max.apply(null, t.rows.map(function (x) { return x[3]; })), kb(r[3]), r[3] > 500000 ? 'warn' : 'good');
        out += big([[n(r[1]), 'partitions'], [n(r[2]), 'files', r[2] > 100 ? 'bad' : ''], [kb(r[4]), 'per file', r[4] < 5000 ? 'bad' : 'good'], [n(per), 'rows per file', per < 100 ? 'bad' : 'good']]);
        out += callout(st.k === 3 ? 'bad' : st.k === 1 ? 'good' : 'tip', why[st.k]);
        out += note(' The files and bytes come from `DESCRIBE DETAIL` of four real Delta tables. The sizes are those of this data and this Spark version, so read the ratios and not the bytes.');
        box.innerHTML = out + '</div>';
        A.bindWidget = function (act, el) { if (act === 'pl-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 6. Framing: a reader pinned to a version of a Delta table ====================== */
  W.framelab = (function () {
    return {
      steps: function () { return 1; },
      hint: 'Pick a reader and compare the two.',
      say: function () { return 'Direct Lake pins a Power BI model to a version of a Delta table, and a refresh pins it again. The model did not run, but the table did. I built the gold table, then loaded a sixth day and built it again, and then read the table at both versions. Pick a reader and say which day it shows.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var t = G.table('gold.pinned'), P = G.counts('gold.pinned'), st = A.local.fr || (A.local.fr = { k: 0 }), r = t.rows[st.k];
        var why = st.k === 0
          ? 'This reader is **pinned to version ' + r[1] + '**. Day 6 has been loaded and gold has been built again, and this reader still shows the data up to **' + r[2] + '**: ' + r[3] + ' rows and a revenue of **' + n(+r[4]) + '**. Nothing is wrong. It has not been framed again.'
          : 'This reader reads **version ' + r[1] + '**, the newest. It shows the data up to **' + r[2] + '**: ' + r[3] + ' rows and a revenue of **' + n(+r[4]) + '**, which is ' + n(P.revenue_latest - P.revenue_pinned) + ' more.';
        var out = '<div class="lab">' + row('Reader', chips(t.rows.map(function (x, k) { return k; }), st.k, 'fr-k', function (k) { return t.rows[k][0]; }));
        out += big([[r[1], 'delta version', st.k ? 'good' : 'warn'], [r[2], 'last day shown', st.k ? 'good' : 'warn'], [r[3], 'rows'], [n(+r[4]), 'revenue']]);
        out += bar('revenue', +r[4], P.revenue_latest, n(+r[4]), st.k ? 'good' : 'warn');
        out += callout(st.k ? 'good' : 'warn', why);
        out += note(' Both reads are of a real Delta table: `VERSION AS OF` ' + P.pinned_version + ' and the latest version.') + docsNote(' The Power BI model is not shown. Framing is from documentation.');
        box.innerHTML = out + '</div>';
        A.bindWidget = function (act, el) { if (act === 'fr-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 5. Capacity: size, Spark cores and throttling (from documentation) ====================== */
  W.capacitylab = (function () {
    var SKU = [['F2', 2], ['F8', 8], ['F64', 64], ['F256', 256]];
    var FUT = [['5 minutes', 5], ['30 minutes', 30], ['3 hours', 180], ['30 hours', 1800]];
    function stage(min) {
      if (min <= 10) return ['good', 'Overage protection', 'New work runs, and nothing is throttled. The capacity has used up to 10 minutes of its future capacity.'];
      if (min <= 60) return ['warn', 'Interactive delay', 'Interactive requests, such as a person running a query or opening a report, are **delayed by 20 seconds** when they are submitted. Background jobs still run.'];
      if (min <= 1440) return ['bad', 'Interactive rejection', 'Interactive requests are **rejected**. Background jobs such as scheduled pipelines and refreshes still start.'];
      return ['bad', 'Background rejection', 'The capacity has used more than **24 hours** of future capacity. New jobs of every kind are rejected until the debt is paid back.'];
    }
    return {
      steps: function () { return 1; },
      hint: 'Pick a size and an amount of future capacity used.',
      say: function () { return 'This lab is from documentation, and the arithmetic is mine. A capacity size gives capacity units, and a unit gives Spark cores. Throttling depends on how much future capacity the work has already used. Pick a size and an amount, and say what a person and a nightly job can still do.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.cl || (A.local.cl = { s: 2, f: 1 }), sk = SKU[st.s], fu = FUT[st.f], sg = stage(fu[1]);
        var cu = sk[1], cuSec = cu * 60 * fu[1];
        var out = '<div class="lab">' + row('Capacity', chips(SKU.map(function (x, k) { return k; }), st.s, 'cl-s', function (k) { return SKU[k][0]; }));
        out += row('Future capacity used', chips(FUT.map(function (x, k) { return k; }), st.f, 'cl-f', function (k) { return FUT[k][0]; }));
        out += big([[n(cu), 'capacity units'], [n(cu * 2), 'Spark cores', 'good'], [n(cu * 6), 'Spark cores with bursting'], [n(cuSec), 'capacity-unit seconds of debt', fu[1] > 60 ? 'bad' : fu[1] > 10 ? 'warn' : 'good']]);
        out += callout(sg[0], '**' + sg[1] + '.** ' + sg[2]);
        out += docsNote(' One capacity unit is two Spark cores, and bursting allows up to three times as many for a while. Up to 10 minutes of future use is free, 10 to 60 minutes delays interactive requests, up to 24 hours rejects them, and beyond that background jobs are rejected too. Background work is smoothed over 24 hours.', ' The debt is the capacity units, times 60 seconds, times the minutes. Check the thresholds on the current Microsoft page before you rely on them.');
        box.innerHTML = out + '</div>';
        A.bindWidget = function (act, el) { if (act === 'cl-s') st.s = +el.getAttribute('data-v'); if (act === 'cl-f') st.f = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();
})();
