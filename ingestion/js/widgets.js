/* Ingestion course labs. Each one registers LAB.W.<kind> with steps, say, render.
   What a lab shows as a result comes from js/real.js: dlt on DuckDB, and the Airbyte Faker connector through PyAirbyte.
   Text in notes and callouts goes through the formatter: use `code` and **bold**, never HTML tags. Fivetran and the Airbyte platform did not run. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var W = (LAB.W = LAB.W || {});
  var esc = LAB.esc, md = LAB.md, G = LAB.get;

  function chips(list, cur, act, fmt) {
    return '<div class="sel-chips">' + list.map(function (k) { return '<button type="button" class="sel-chip' + (String(k) === String(cur) ? ' on' : '') + '" data-act="' + act + '" data-v="' + esc(String(k)) + '">' + esc(fmt ? fmt(k) : String(k)) + '</button>'; }).join('') + '</div>';
  }
  function row(label, inner) { return '<div class="lab-row"><span class="lab-l">' + esc(label) + '</span>' + inner + '</div>'; }
  function big(items) { return '<div class="lab-out">' + items.map(function (x) { return '<div class="big' + (String(x[0]).length > 12 ? ' long' : '') + (x[2] ? ' ' + x[2] : '') + '"><b>' + esc(String(x[0])) + '</b><span>' + esc(x[1]) + '</span></div>'; }).join('') + '</div>'; }
  function callout(kind, text) { return '<div class="callout ' + kind + '">' + md(text) + '</div>'; }
  function note(recorded) { return '<p class="lab-note"><span class="pill real">Recorded</span>' + md(recorded) + '</p>'; }
  function bar(label, v, max, text, cls) {
    var pc = max > 0 ? Math.max(1, Math.min(100, v / max * 100)) : 0;
    return '<div class="lane"><span class="lane-n">' + esc(label) + '</span><div class="lane-track"><i class="' + (cls || '') + '" style="width:' + pc + '%"></i></div><span class="lane-v">' + esc(text) + '</span></div>';
  }
  var n = G.n;
  function pre(text, cls) { return '<pre class="lab-pre' + (cls ? ' ' + cls : '') + '">' + esc(text) + '</pre>'; }

  /* ====================== 1. Seven ways to load ====================== */
  W.loadlab = (function () {
    return {
      steps: function () { return 1; },
      hint: 'Pick a way to load and read what the destination holds.',
      say: function () { return 'The same shop, loaded seven ways with dlt. Pick a case, read what each run wrote, and compare what the destination holds with what the shop holds.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var T = G.table('strategies.cases').rows, X = G.counts('strategies');
        var why = [
          '**Append** adds the rows of every run. The same day loaded twice gave **' + T[0][2] + '** rows for **' + T[0][3] + '** orders. Append is right for events that never change, and wrong for orders that do.',
          '**Replace** rewrites the whole table in every run, so the table is right after each one. The price is that every run reads and writes everything.',
          '**Merge** on `id` updates the row that exists and inserts the one that does not. The same day loaded twice left **' + T[2][2] + '** rows.',
          'The whole list was read again on day 2 (**109** rows), and **merge** kept one row for each id. The table still holds **' + T[3][2] + '**, one more than the shop: order 11 was **deleted in the shop**, and a merge never deletes.',
          'The cursor read only the changes, but **append** added the changed orders as **new rows**: **' + T[4][2] + '** rows for **' + T[4][3] + '** orders. A cursor and append do not go together for rows that change.',
          'The cursor read the **20** orders that changed (10 new and 10 shipped), and **merge** put them in place: **' + T[5][2] + '** rows. Two gaps remain, and they are shown below: a deleted order, and a change that did not move `updated_at`.',
          'The second read of day 2 wrote **0** rows. dlt kept the cursor and the rows at the cursor, so the same load is **safe to run twice**.'
        ];
        var kinds = ['bad', 'good', 'good', 'warn', 'bad', 'warn', 'good'];
        var st = A.local.ll || (A.local.ll = { k: 2 }), r = T[st.k];
        var out = '<div class="lab">' + row('Case', chips(T.map(function (x, k) { return k; }), st.k, 'll-k', function (k) { return (k + 1) + '. ' + T[k][0]; }));
        out += big([[r[1], 'rows that each run wrote', ''], [n(r[2]), 'rows in the destination', r[2] === r[4] ? 'good' : r[2] === r[3] ? 'warn' : 'bad'], [n(r[3]), 'distinct orders'], [n(r[4]), 'orders the shop holds']]);
        out += bar('rows in the destination', r[2], Math.max(r[2], r[4]), n(r[2]) + ' for ' + n(r[4]) + ' orders in the shop', r[2] === r[4] ? 'good' : r[2] === r[3] ? 'warn' : 'bad');
        if (st.k === 5) out += pre('order 11, deleted in the shop: ' + (X.order11_in_destination ? 'still in the destination' : 'gone') + '\norder 12, shipped in the shop: the destination says ' + X.order12_destination + '\norders shipped: ' + X.shipped_destination + ' in the destination, ' + X.shipped_shop + ' in the shop', 'err');
        out += callout(kinds[st.k], why[st.k]);
        out += note(' Real output of `strategies.py`: dlt ' + G.meta('dlt') + ' loading a pretend shop API into DuckDB ' + G.meta('duckdb') + '.');
        box.innerHTML = out + '</div>';
        A.bindWidget = function (act, el) { if (act === 'll-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 2. Day 3 under five contracts ====================== */
  W.driftlab = (function () {
    return {
      steps: function () { return 1; },
      hint: 'Pick a contract and read what day 3 did.',
      say: function () { return 'On day 3 the shop sends new fields and an amount as text. Same data, five rules. Pick a contract and see what the destination holds afterwards.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var T = G.table('drift.modes').rows, total = 117;
        var why = [
          'The default is **evolve**: the table grew **four columns** (`coupon`, `channel__name`, `channel__app__version` and a variant column for the amount) and all **7** new orders loaded. Nobody was told. That is convenient and silent.',
          'With the columns **frozen**, the new field `coupon` stopped the **whole load**: day 3 wrote nothing, and the table kept its **110** orders. The error names the column and the row. The contract did its job: a person must look.',
          'With **discard_row**, every order that brought a new column was **dropped without an error**: only **2** of the 7 loaded. This is the most dangerous rule: the loss is silent, and the count is simply short.',
          'With **discard_value**, all **7** orders loaded and the **new values were dropped**: no `coupon` column, no channel. The load is complete and the data is thinner.',
          'With the **data type** frozen, order 117 (an amount sent as the text `"11.17"`) stopped the whole load, although the other 6 orders were fine. One bad row can fail a load, which is why a contract needs an alert.'
        ];
        var kinds = ['warn', 'tip', 'bad', 'warn', 'tip'];
        var st = A.local.dl || (A.local.dl = { k: 0 }), r = T[st.k], failed = r[1] === 'failed', ncols = r[3] === 'none' ? 0 : r[3].split(', ').length;
        var out = '<div class="lab">' + row('Contract', chips(T.map(function (x, k) { return k; }), st.k, 'dl-k', function (k) { return T[k][0]; }));
        out += big([[r[1], 'the run of day 3', failed ? 'bad' : 'good'], [n(r[2]), 'orders in the destination (a complete load gives ' + total + ')', r[2] === total ? 'good' : 'bad'], [ncols, 'new columns', '']]);
        out += pre(failed ? r[4] : 'new columns: ' + r[3], failed ? 'err' : '');
        out += callout(kinds[st.k], why[st.k]);
        out += note(' Real output of `drift.py`: day 3 of the pretend shop, loaded under each schema contract.');
        box.innerHTML = out + '</div>';
        A.bindWidget = function (act, el) { if (act === 'dl-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 3. Four sync modes of an Airbyte connector ====================== */
  W.synclab = (function () {
    return {
      steps: function () { return 1; },
      hint: 'Pick a sync mode and read two syncs.',
      say: function () { return 'The same 20 users, synced twice with PyAirbyte in five ways. Pick a case and compare what each sync read with what the destination holds.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var T = G.table('sync.cases').rows;
        var why = [
          '**Full refresh, replace**: every sync reads all **20** users and rewrites the table. Always right, and every sync pays for the whole table.',
          '**Full refresh, append**: every sync adds all the users again, so the table holds **40** rows for **20** users. Append keeps history, and it needs a way to take the latest row.',
          '**Full refresh, merge**: every sync reads all **20** and updates the rows by key. The table stays at **20**.',
          '**Incremental, append, with a cursor that always moves**: this connector can set `updated_at` to the time of the sync for every row, so the second sync read **20** rows again and the table grew to **40**. Incremental only saves work when the cursor tells the truth.',
          '**Incremental, append, with a cursor that tells the truth**: the second sync read **0** rows, and the table kept its **20**. This is the case that incremental sync was made for.'
        ];
        var kinds = ['good', 'bad', 'good', 'bad', 'good'];
        var st = A.local.sl || (A.local.sl = { k: 4 }), r = T[st.k], read = r[1].split(', '), rows = r[2].split(', ');
        var out = '<div class="lab">' + row('Case', chips(T.map(function (x, k) { return k; }), st.k, 'sl-k', function (k) { return (k + 1) + '. ' + T[k][0]; }));
        out += big([[read[0], 'records read, sync 1'], [read[1], 'records read, sync 2', read[1] === '0' ? 'good' : ''], [rows[1], 'rows after sync 2', +rows[1] === r[3] ? 'good' : 'bad'], [r[3], 'distinct ids']]);
        out += bar('rows after sync 2', +rows[1], 40, rows[1] + ' rows for ' + r[3] + ' users', +rows[1] === r[3] ? 'good' : 'bad');
        out += callout(kinds[st.k], why[st.k]);
        out += note(' Real output of `sync_modes.py`: PyAirbyte ' + G.meta('airbyte') + ' with the connector `' + G.meta('connector') + '`, into a local cache.');
        box.innerHTML = out + '</div>';
        A.bindWidget = function (act, el) { if (act === 'sl-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();
})();
