/* MongoDB course labs. Each one registers LAB.W.<kind> with steps, say, render.
   What a lab shows as a result comes from js/real.js: a real mongod 8.0.
   Text in notes and callouts goes through the formatter: use `code` and **bold**, never HTML tags. a sharded cluster and Atlas did not run. */
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
  function big(items) { return '<div class="lab-out">' + items.map(function (x) { return '<div class="big' + (String(x[0]).length > 12 ? ' long' : '') + (x[2] ? ' ' + x[2] : '') + '"><b>' + esc(String(x[0])) + '</b><span>' + esc(x[1]) + '</span></div>'; }).join('') + '</div>'; }
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


  /* ====================== 1. Three pipelines ====================== */
  W.pipelab = (function () {
    return {
      steps: function () { return 1; },
      hint: 'Pick a pipeline and read its result.',
      say: function () { return 'The same 20,000 orders, grouped three ways. Pick a pipeline, read what each stage did to the number of documents, and read the result.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var P = G.counts('pipeline'), sk = G.table('pipeline.sku'), st = G.table('pipeline.store'), rg = G.table('pipeline.region');
        var cases = [
          { name: 'revenue by SKU', kind: 'tip', nums: [[n(P.stage_counts[0]), 'documents after $match'], [n(P.stage_counts[1]), 'after $unwind'], [n(P.stage_counts[2]), 'after $group']], cols: sk.cols, rows: sk.rows,
            why: '`$unwind` made **one document for each line** of the array, so **' + n(P.stage_counts[0]) + '** orders became **' + n(P.stage_counts[1]) + '** documents, and `$group` collapsed them to one row for each SKU. Filter **before** `$unwind`, so that fewer documents are unwound.' },
          { name: 'revenue by store', kind: 'tip', nums: [[n(st.rows[0][1]), 'orders of store 1'], [n(st.rows.length), 'stores shown (the first three)']], cols: st.cols, rows: st.rows,
            why: 'One `$group` on `store_id` adds up `total_cents`. The refunded orders were left out by `$match`, so each store counts the orders that were not refunded.' },
          { name: 'revenue by region, with $lookup', kind: 'warn', nums: [[n(rg.rows.length), 'regions'], [n(rg.rows[0][1]), 'orders in a region']], cols: rg.cols, rows: rg.rows,
            why: 'The **region** is in the `stores` collection, not in the order. `$lookup` joins each store group to its store, and a second `$group` adds the stores of a region. Group by store **first**, so that the join runs on 12 documents and not on 19,200.' }
        ];
        var st_ = A.local.pl || (A.local.pl = { k: 0 }), c = cases[st_.k];
        var out = '<div class="lab">' + row('Pipeline', chips(cases.map(function (x, k) { return k; }), st_.k, 'pl-k', function (k) { return cases[k].name; }));
        out += big(c.nums.map(function (x) { return [x[0], x[1], '']; }));
        out += table(c.cols, c.rows.map(function (r) { return r.map(function (v) { return typeof v === 'number' ? n(v) : v; }); }), null, 1);
        out += callout(c.kind, c.why);
        out += note(' Real output of `pipelines.py` on a mongod 8.0 with 20,000 orders.');
        box.innerHTML = out + '</div>';
        A.bindWidget = function (act, el) { if (act === 'pl-k') st_.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 2. Indexes and explain ====================== */
  W.indexlab = (function () {
    return {
      steps: function () { return 1; },
      hint: 'Pick a case and read what the server examined.',
      say: function () { return 'The same 20,000 orders and five queries, with and without an index. I asked the server to explain each one and wrote down what it examined. Pick a case.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var T = G.table('index.cases').rows, total = G.counts('load').orders;
        var why = [
          'With **no index** the server read **every document** (a `COLLSCAN`) to return a few. The work grows with the collection.',
          'With an index on `(store_id, status)` the server read **only the matching keys** and fetched those documents: examined and returned are the same number.',
          'The query sorts by `placed_at`, which is **not in the index**, so the server fetched the documents and **sorted them in memory** (a `SORT` stage).',
          'With `placed_at` as the **third** key, the index already holds the matches in order, so the `SORT` stage is **gone**. Equality fields first, then the sort field.',
          'Asking only for fields that are **in the index** makes the query **covered**: the server answered from the index and read **0 documents**.'
        ];
        var kinds = ['bad', 'good', 'warn', 'good', 'good'];
        var st = A.local.il || (A.local.il = { k: 0 }), r = T[st.k];
        var out = '<div class="lab">' + row('Case', chips(T.map(function (x, k) { return k; }), st.k, 'il-k', function (k) { return T[k][0] + '. ' + T[k][1]; }));
        out += big([[r[2], 'the plan', kinds[st.k]], [n(r[4]), 'documents examined', r[4] > 1000 ? 'bad' : 'good'], [n(r[5]), 'documents returned']]);
        out += bar('documents examined', r[4], total, n(r[4]) + ' of ' + n(total), r[4] > 1000 ? 'bad' : 'good');
        out += callout(kinds[st.k] === 'bad' ? 'bad' : kinds[st.k] === 'warn' ? 'warn' : 'good', why[st.k]);
        out += note(' Real `explain` output of `indexes.py`: the plan, and the documents that the server examined.');
        box.innerHTML = out + '</div>';
        A.bindWidget = function (act, el) { if (act === 'il-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 3. Writes: validation, upserts and a transaction ====================== */
  W.writelab = (function () {
    return {
      steps: function () { return 1; },
      hint: 'Pick a write and read what the server did.',
      say: function () { return 'Writes that a loader sends: payments that break a schema rule, the same upsert twice, and a transaction that is aborted. I ran each against a real server. Pick one.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var V = G.table('design.validation').rows, D = G.counts('design');
        var by = function (name) { return V.filter(function (r) { return r[0] === name; })[0]; };
        var cases = [
          { name: 'a valid payment', kind: 'good', nums: [['inserted', 'the result']], text: by('a valid payment')[1], why: 'The payment has a string `order_id`, an integer `amount_cents` of at least 0 and a currency from the list, so the validator **accepted** it.' },
          { name: 'amount as text', kind: 'bad', nums: [[by('amount as text')[1], 'the error code']], text: by('amount as text')[2], why: 'The amount was `"12.50"`, a string, and the schema says `int`. The server **refused** it with code **121**. Validation checks the **type**, and it does not convert.' },
          { name: 'unknown currency', kind: 'bad', nums: [[by('unknown currency')[1], 'the error code']], text: by('unknown currency')[2], why: 'The currency is not in the `enum`. A rule in the collection protects every writer, not only the loader that you wrote.' },
          { name: 'same order again', kind: 'warn', nums: [[by('same order again')[1], 'the error code']], text: by('same order again')[2], why: 'A **unique index** on `order_id` refused a second payment for the same order, with code **11000**. Validation and unique indexes are two different checks.' },
          { name: 'upsert, run twice', kind: 'good', nums: [[D.upsert_first.join(' / '), 'upserted / matched / modified, run 1'], [D.upsert_second.join(' / '), 'run 2']], text: 'first run: upserted ' + D.upsert_first[0] + ', matched ' + D.upsert_first[1] + ', modified ' + D.upsert_first[2] + '\nsecond run: upserted ' + D.upsert_second[0] + ', matched ' + D.upsert_second[1] + ', modified ' + D.upsert_second[2], why: 'A `ReplaceOne` with `upsert=True` inserted three documents the first time and **changed nothing** the second time: the load is **safe to repeat**. A plain `insert_many` of the same documents failed with code ' + D.plain_insert_error_code + '.' },
          { name: 'transaction, aborted', kind: 'tip', nums: [[D.inside + ' / ' + D.outside, 'inside / outside the transaction'], [D.after_abort + ' / ' + D.after_commit, 'after abort / after commit']], text: 'inside the transaction: ' + D.inside + ', seen from outside: ' + D.outside + '\nafter abort: ' + D.after_abort + ' documents\nafter commit: ' + D.after_commit + ' document', why: 'The write was visible **inside** the transaction and **not outside** it. An abort left nothing, and a commit made it visible. Transactions need a **replica set**, and this one was a replica set of one member.' }
        ];
        var st = A.local.wl || (A.local.wl = { k: 1 }), c = cases[st.k];
        var out = '<div class="lab">' + row('Write', chips(cases.map(function (x, k) { return k; }), st.k, 'wl-k', function (k) { return cases[k].name; }));
        out += big(c.nums.map(function (x, q) { return [x[0], x[1], q === 0 && c.kind === 'bad' ? 'bad' : q === 0 && c.kind === 'good' ? 'good' : '']; }));
        out += pre(c.text, c.kind === 'bad' || c.kind === 'warn' ? 'err' : '');
        out += callout(c.kind, c.why);
        out += note(' Real output of `design.py` on a mongod 8.0.');
        box.innerHTML = out + '</div>';
        A.bindWidget = function (act, el) { if (act === 'wl-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();
})();
