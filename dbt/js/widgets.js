/* dbt lab widgets. Each one registers LAB.W.<kind> with steps, say, render.
   Everything a lab shows as a result comes from js/real.js (recorded from a real dbt run), except the two labs that
   say so: the snapshot lab replays the snapshot rule in the browser, and the thread lab uses made-up durations. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var W = (LAB.W = LAB.W || {});
  var esc = LAB.esc, md = LAB.md, H = LAB.H, G = LAB.get;

  function chips(list, cur, act, fmt) {
    return list.map(function (k) { return '<button type="button" class="sel-chip' + (k === cur ? ' on' : '') + '" data-act="' + act + '" data-v="' + esc(k) + '">' + esc(fmt ? fmt(k) : k) + '</button>'; }).join('');
  }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function table(cols, rows, rowCls) {
    return '<div class="tbl-wrap"><table class="tbl mono"><thead><tr>' + cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r, ri) { return '<tr class="' + (rowCls ? rowCls(r, ri) || '' : '') + '">' + r.map(function (c) { return '<td class="' + (String(c) === 'NULL' ? 'nul' : '') + '">' + md(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }

  /* ====================== Selectors lab ====================== */
  (function () {
    var GROUPS = [
      ['model', 'up', 'down', 'both', 'one_up', 'down_two', 'plus_at'],
      ['tag_pii', 'tag_daily', 'path_staging', 'path_core', 'seed', 'incremental', 'table', 'group_finance', 'access_public'],
      ['union', 'intersection', 'exposure_up', 'source_orders_down', 'source_down']
    ];
    var NOTE = {
      model: 'A model name alone selects only that model.',
      up: 'A plus sign in front adds every parent, grandparent and source that the model needs.',
      down: 'A plus sign after the name adds every child, grandchild and the exposure that depends on it.',
      both: 'Plus on the left: everything this model needs to build.',
      one_up: 'A number limits the walk. 1+ means the model and its direct parents only.',
      down_two: 'stg_brewline__orders+2 means two steps downstream, no further.',
      plus_at: 'The at sign adds the children of the model and then all the parents of those children. It is what CI wants: everything needed to build the changed model and its descendants.',
      tag_pii: 'tag: matches the tags set in config. Tags are a good fit for "everything that holds personal data".',
      tag_daily: 'Tags can also say how often a model should run.',
      path_staging: 'path: selects a folder. This also returns the sources declared in that folder.',
      path_core: 'A bare path works as well.',
      seed: 'resource_type: picks seeds, snapshots, sources, exposures and so on.',
      incremental: 'config.materialized: selects by any config value.',
      table: 'Each version of dim_products is a table, so it appears twice in the raw list and once here.',
      group_finance: 'group: and access: select by governance settings.',
      access_public: 'Only the models other teams may build on.',
      union: 'A space is a union: either selector may match.',
      intersection: 'A comma is an intersection: a node must match both selectors.',
      exposure_up: 'Start from the dashboard and walk upstream: everything the finance dashboard depends on.',
      source_orders_down: 'Start from one source: everything a late or broken load of raw.orders can touch.',
      source_down: 'All sources and everything built from them.'
    };
    W.sel = {
      steps: function () { return 3; },
      hint: 'Click a selector. The matching nodes light up.',
      say: function (s, i) {
        return [
          'A selector tells dbt which nodes to work on. These answers are not guessed. Each one is what dbt ls printed for this project. Click a selector and watch the graph. The plus sign walks along the arrows.',
          'You can also select by what a node is: a tag, a folder, a materialization or a group. Click each one and compare it with the graph.',
          'Selectors combine, and they can start from a source or an exposure. A space means union and a comma means intersection. Click through these, then press Next.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var SEL = JSON.parse(G.text('selectors'));
        var st = A.local.sel || (A.local.sel = {});
        var keys = GROUPS[i];
        var pick = keys.indexOf(st['p' + i]) >= 0 ? st['p' + i] : keys[0];
        var names = uniq(G.ls(pick));
        var byReal = {};
        LAB.graphs.dag.nodes.forEach(function (n) { byReal[n.real] = n.id; });
        var ids = uniq(names.map(function (n) { return byReal[n]; }).filter(Boolean));
        var cmd = 'dbt ls --select "' + SEL[pick] + '"';
        box.innerHTML = '<div class="lab"><div class="graph-wrap"></div><div class="sel-chips">' + chips(keys, pick, 'sel-pick', function (k) { return SEL[k]; }) + '</div>' +
          '<div class="sel-out"><b>$ ' + esc(cmd) + '</b> <span>' + names.length + (names.length === 1 ? ' node' : ' nodes') + '</span><div class="names">' +
          names.map(function (n) { return '<span class="' + (n.indexOf('source:') === 0 ? 's' : 'm') + '">' + esc(n) + '</span>'; }).join('') + '</div></div>' +
          '<div class="callout tip">' + md(NOTE[pick]) + '</div></div>';
        var gc = LAB.Graph.mount(box.querySelector('.graph-wrap'), LAB.graphs.dag);
        gc.set({ focus: ids, still: true });
        A.bindWidget = function (act, el) { if (act === 'sel-pick') { st['p' + i] = el.getAttribute('data-v'); A.render(true); } };
      }
    };
  })();

  /* ====================== Compile lab ====================== */
  (function () {
    var OPT = [
      { id: 'macro', name: 'A macro and ref(), in dev and prod', file: 'models/scratch/customers_sample.sql', src: 'scenario/customers_sample.sql',
        variants: [
          ['dev', 'compiled/jinja/customers_sample_dev', 'jinja_sample_dev', 'In dev, limit_in_dev adds a LIMIT, and ref() points at the developer schema, dev_alice_staging.'],
          ['prod', 'compiled/jinja/customers_sample_prod', 'jinja_sample_prod', 'In prod, the same file compiles without the LIMIT, and ref() points at analytics_staging.']
        ] },
      { id: 'inc', name: 'is_incremental(), first run and next run', file: 'models/marts/core/fct_orders.sql', src: 'models/marts/core/fct_orders.sql',
        variants: [
          ['first run: table does not exist', 'compiled/day1/fct_orders', null, 'The table does not exist, so is_incremental() is false and the WHERE block disappears. dbt reads every row.'],
          ['next run: table exists', 'compiled/second/fct_orders', null, 'The table exists, so is_incremental() is true. The WHERE block stays and {{ this }} became the table itself.']
        ] },
      { id: 'loop', name: 'A for loop', file: 'models/scratch/orders_by_status.sql', src: 'scenario/orders_by_status.sql',
        variants: [['any target', 'compiled/jinja/orders_by_status', null, 'The loop ran while dbt compiled. The warehouse never sees Jinja, only three ordinary columns and no trailing comma.']] },
      { id: 'var', name: 'var() with and without --vars', file: 'models/scratch/min_total.sql', src: 'scenario/min_total.sql',
        variants: [
          ['default value', 'compiled/jinja/min_total', null, 'No --vars flag, so var() returned its default, 0.'],
          ['--vars \'{min_total: 25}\'', 'compiled/jinja/min_total_25', null, 'The flag replaced the default before compiling. Variables are text substitution, so quote and validate them.']
        ] }
    ];
    W.compile = {
      steps: function () { return 3; },
      hint: 'Pick a file, then switch between the cases.',
      say: function (s, i) {
        return [
          'dbt turns every model into plain SQL before the warehouse sees it. Pick an example on the left and look at the two panels: what you write on the left, what the warehouse receives on the right. Both panels are real files from a dbt compile.',
          'Switch the case and watch what changes. Only the parts that depend on the target, on the table state or on a variable change. Everything else stays put.',
          'This is the habit to build. When a model misbehaves, read the compiled SQL in target/compiled. It is the query that really ran.'
        ][i];
      },
      mood: function (s, i) { return i === 0 ? 'think' : 'happy'; },
      render: function (box, s, i, A) {
        var st = A.local.compile || (A.local.compile = { o: 'macro', v: 0 });
        var o = OPT.filter(function (x) { return x.id === st.o; })[0];
        var v = o.variants[Math.min(st.v, o.variants.length - 1)];
        var src = G.file(o.src), sql = G.sql(v[1]);
        var h = '<div class="lab"><div class="sel-chips">' + chips(OPT.map(function (x) { return x.id; }), st.o, 'cp-file', function (k) { return OPT.filter(function (x) { return x.id === k; })[0].name; }) + '</div>' +
          '<div class="sel-chips">' + o.variants.map(function (x, k) { return '<button type="button" class="sel-chip' + (k === st.v ? ' on' : '') + '" data-act="cp-var" data-v="' + k + '">' + esc(x[0]) + '</button>'; }).join('') + '</div>' +
          '<div class="pair"><div class="cp-l"></div><div class="cp-r"></div></div>';
        if (i >= 1) h += '<div class="callout tip">' + md(v[3]) + '</div>';
        box.innerHTML = h + '</div>';
        box.querySelector('.cp-l').innerHTML = H.code({ file: o.file, lang: 'jinja', code: src });
        box.querySelector('.cp-r').innerHTML = H.code({ file: 'target/compiled/.../' + o.file.split('/').pop(), lang: 'sql', code: sql });
        H.bindCode(box.querySelector('.cp-l'), src);
        H.bindCode(box.querySelector('.cp-r'), sql);
        A.bindWidget = function (act, el) {
          if (act === 'cp-file') { st.o = el.getAttribute('data-v'); st.v = 0; A.render(true); }
          if (act === 'cp-var') { st.v = +el.getAttribute('data-v'); A.render(true); }
        };
      }
    };
  })();

  /* ====================== Incremental strategies lab ====================== */
  (function () {
    var STR = [
      { k: 'append', name: 'append', rows: 'strategy_append_rows', counts: 'strategy_append_counts', sql: 'run/strategy_append', test: 'strategy_append_test', note: 'append inserts every selected row and never deletes. The new version of O-5010 sits next to the old one, so one order now has two rows and the unique test fails.' },
      { k: 'di', name: 'delete+insert', rows: 'strategy_delete_insert_rows', counts: 'strategy_delete_insert_counts', sql: 'run/strategy_delete_insert', test: 'strategy_delete_insert_test', note: 'delete+insert removes the rows whose unique_key arrives again, then inserts the new versions. Two statements, so it is not one atomic step on every warehouse.' },
      { k: 'merge', name: 'merge', rows: 'strategy_merge_rows', counts: 'strategy_merge_counts', sql: 'run/strategy_merge', test: 'strategy_merge_test', note: 'merge updates matching keys and inserts new ones in one statement. It needs a unique_key and a warehouse that supports MERGE.' },
      { k: 'mb', name: 'microbatch', rows: 'strategy_microbatch_rows', counts: 'strategy_microbatch_counts', sql: 'run/strategy_microbatch', test: null, note: 'microbatch rebuilds whole time windows, one batch per day here. It needs an event_time column, and it replaces everything inside each window, so late changes inside a window are safe.' },
      { k: 'bug', name: 'delete+insert, filter on ordered_at', rows: 'inc_bug_all', counts: null, sql: null, test: null, note: 'The strategy is fine. The filter is not. The new version of O-5010 has the same ordered_at as the old one, so the filter never selects it and the table keeps the stale status.' }
    ];
    W.inc = {
      steps: function () { return 3; },
      hint: 'Pick a strategy. The table is what dbt really produced after the second load.',
      say: function (s, i) {
        return [
          'Day two arrives. Order O-5010 changed from PLACED to SHIPPED, and order O-5011 is new. The same fct_orders model ran with each strategy, starting from the same day-one table. Pick a strategy and read the table dbt produced. The green rows are the day-two changes.',
          'Now look at the SQL dbt sent. Nothing about the strategy is magic. It is a few statements that you can read.',
          'Here are all five side by side. Count the rows, look for duplicates, and check the status of O-5010.'
        ][i];
      },
      mood: function (s, i) { return i === 2 ? 'happy' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.inc || (A.local.inc = { k: 'append' });
        var cur = STR.filter(function (x) { return x.k === st.k; })[0];
        function stats(x) {
          var t = G.table(x.rows), ids = t.rows.map(function (r) { return r[0]; });
          var o5010 = t.rows.filter(function (r) { return r[0] === 'O-5010'; });
          return { n: t.rows.length, d: uniq(ids).length, o5010: o5010.map(function (r) { return r[1]; }) };
        }
        var h = '<div class="lab"><div class="sel-chips">' + chips(STR.map(function (x) { return x.k; }), st.k, 'inc-pick', function (k) { return STR.filter(function (x) { return x.k === k; })[0].name; }) + '</div>';
        if (i < 2) {
          var t = G.table(cur.rows), me = stats(cur);
          var dup = {};
          t.rows.forEach(function (r) { dup[r[0]] = (dup[r[0]] || 0) + 1; });
          h += '<div class="lab-out"><div class="big ' + (me.n === me.d ? 'good' : 'bad') + '"><b>' + me.n + ' rows</b><span>' + me.d + ' distinct orders</span></div>' +
            '<div class="big ' + (me.o5010.length === 1 && me.o5010[0] === 'SHIPPED' ? 'good' : 'bad') + '"><b>O-5010: ' + esc(me.o5010.join(' and ')) + '</b><span>the source says SHIPPED</span></div></div>';
          h += table(t.cols, t.rows, function (r) {
            if (dup[r[0]] > 1) return 'dup';
            if (r[3].indexOf('2026-03-18') === 0) return 'new';
            if (cur.k === 'bug' && r[0] === 'O-5010') return 'dup';
            return '';
          });
          h += '<div class="callout ' + (cur.k === 'merge' || cur.k === 'di' || cur.k === 'mb' ? 'good' : 'bad') + '">' + md(cur.note) + '</div>';
        } else {
          if (cur.sql) h += H.code({ file: 'target/run/.../fct_orders.sql', lang: 'sql', code: G.sql(cur.sql) });
          else h += '<div class="callout warn">The SQL is the same as delete+insert. Only the WHERE filter in the model differs.' +
            '<br><br><code>where ordered_at &gt; (select coalesce(max(ordered_at), ...) from {{ this }})</code></div>';
          if (cur.test) {
            var l = G.grep(G.log(cur.test), /unique_fct_orders_order_id \.+/);
            h += '<div class="callout ' + (/FAIL/.test(l) ? 'bad' : 'good') + '"><b>$ ' + esc(G.cmd(cur.test)) + '</b><br><code>' + esc(l.replace(/^\d\d:\d\d:\d\d\s+/, '')) + '</code></div>';
          }
        }
        if (i === 2) {
          h = '<div class="lab"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Strategy</th><th>Rows</th><th>Distinct orders</th><th>O-5010 status</th><th>Verdict</th></tr></thead><tbody>' +
            STR.map(function (x) {
              var m = stats(x), ok = m.n === m.d && m.o5010.length === 1 && m.o5010[0] === 'SHIPPED';
              return '<tr class="' + (ok ? 'new' : 'dup') + '"><td><b>' + esc(x.name) + '</b></td><td>' + m.n + '</td><td>' + m.d + '</td><td>' + esc(m.o5010.join(', ')) + '</td><td>' + (ok ? 'correct' : (m.n !== m.d ? 'duplicates' : 'stale')) + '</td></tr>';
            }).join('') + '</tbody></table></div>' +
            '<div class="callout tip"><b>How to choose.</b> Use <b>merge</b> or <b>delete+insert</b> when rows change and you have a unique key. Use <b>append</b> only for facts that never change, such as events. Use <b>microbatch</b> for large time-series tables where you want to re-run a day. The filter matters more than the strategy: filter on the column that moves when a row changes, which is the load time, not the business date.</div></div>';
        } else h += '</div>';
        box.innerHTML = h;
        if (i === 1 && cur.sql) H.bindCode(box, G.sql(cur.sql));
        A.bindWidget = function (act, el) { if (act === 'inc-pick') { st.k = el.getAttribute('data-v'); A.render(true); } };
      }
    };
  })();

  /* ====================== Snapshot lab ====================== */
  (function () {
    var KEY = 'snap';
    function initial() {
      var t = G.table('raw_customers');
      return {
        run: 0, msg: '',
        src: t.rows.map(function (r) { return { id: r[0], name: r[1], country: r[3], tier: r[4], at: '2026-03-14 06:00:00' }; }),
        snap: []
      };
    }
    /* The rule of the timestamp strategy, the one dbt applies to this project. */
    W.snapRule = function (src, snap) {
      var wrote = 0;
      src.forEach(function (r) {
        var open = snap.filter(function (x) { return x.id === r.id && x.to === 'NULL'; })[0];
        if (!open) { snap.push({ id: r.id, tier: r.tier, country: r.country, from: r.at, to: 'NULL', fresh: true }); wrote++; }
        else if (r.at > open.from) {
          open.to = r.at; open.closed = true;
          snap.push({ id: r.id, tier: r.tier, country: r.country, from: r.at, to: 'NULL', fresh: true }); wrote += 2;
        }
      });
      return wrote;
    };
    W.snap = {
      steps: function () { return 3; },
      hint: 'Run the snapshot, change a customer, run it again.',
      say: function (s, i) {
        return [
          'The customers table in the source only ever shows the present. A snapshot remembers the past. Press Run dbt snapshot once to take the first picture.',
          'Now change a customer in the source. Make Ava (C-42) gold and move Noah (C-77) to Germany, then run the snapshot again. Watch which rows close and which rows open.',
          'Read the result. Each change closed one row and opened another. Customers that did not change were left alone. The final table equals what dbt wrote in the real run.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local[KEY] || (A.local[KEY] = initial());
        var sorted = st.snap.slice().sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : a.from < b.from ? -1 : 1; });
        var h = '<div class="lab"><div class="lab-row"><button type="button" class="btn-run lab-run" data-act="sn-run">Run dbt snapshot</button>' +
          '<button type="button" class="btn-sm" data-act="sn-gold">C-42 becomes gold</button><button type="button" class="btn-sm" data-act="sn-de">C-77 moves to Germany</button>' +
          '<button type="button" class="btn-sm" data-act="sn-reset">Reset</button></div>';
        h += '<div class="scd-cols"><div><div class="layer-h"><span class="lchip c-src">SOURCE</span><span class="lname">raw.customers</span></div>' +
          table(['customer_id', 'tier', 'country', '_loaded_at'], st.src.map(function (r) { return [r.id, r.tier, r.country, r.at]; })) + '</div>' +
          '<div><div class="layer-h"><span class="lchip c-snap">SNAPSHOT</span><span class="lname">snap_customers, run ' + st.run + '</span></div>' +
          (st.snap.length ? table(['customer_id', 'tier', 'country', 'dbt_valid_from', 'dbt_valid_to'], sorted.map(function (r) { return [r.id, r.tier, r.country, r.from, r.to]; }), function (r, k) {
            return sorted[k].closed ? 'old' : (sorted[k].fresh && st.run > 1 ? 'new' : '');
          }) : '<p class="lab-note">Empty. Run the snapshot.</p>') + '</div></div>';
        if (st.msg) h += '<div class="callout tip">' + md(st.msg) + '</div>';
        if (i === 2) h += '<div class="callout good"><b>Compare.</b> After the second run the real table had ' + G.table('snap_day2').rows.length + ' rows: one open row for C-12 and C-91, and a closed row plus an open row for C-42 and C-77. This lab ends with ' + st.snap.length + '. Valid-from times come from the <code>_loaded_at</code> column because the project uses <code>strategy: timestamp</code>.</div>';
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act) {
          if (act === 'sn-run') {
            st.run++;
            for (var k = 0; k < st.snap.length; k++) { delete st.snap[k].fresh; delete st.snap[k].closed; }
            var wrote = W.snapRule(st.src, st.snap);
            st.msg = wrote ? 'Run ' + st.run + ' wrote **' + wrote + '** rows.' : 'Run ' + st.run + ' wrote **0** rows. Nothing changed, so nothing was added.';
          }
          if (act === 'sn-gold') { st.src.forEach(function (r) { if (r.id === 'C-42') { r.tier = 'gold'; r.at = '2026-03-18 06:00:00'; } }); st.msg = 'C-42 is now **gold** in the source. The snapshot has not seen it yet.'; }
          if (act === 'sn-de') { st.src.forEach(function (r) { if (r.id === 'C-77') { r.country = 'de'; r.at = '2026-03-18 06:00:00'; } }); st.msg = 'C-77 is now in **de** in the source. The snapshot has not seen it yet.'; }
          if (act === 'sn-reset') { A.local[KEY] = initial(); }
          A.render(true);
        };
      }
    };
  })();

  /* ====================== Which test catches it? ====================== */
  (function () {
    var KINDS = ['unique', 'not_null', 'accepted_values', 'relationships', 'custom generic test', 'source freshness', 'singular test', 'unit test', 'contract'];
    var DEF = [
      { id: 'dupe', t: 'Two rows for the same order_id reach fct_orders', a: 'unique', log: 'strategy_append_test', re: /FAIL \d+ unique_fct_orders_order_id/, why: 'unique returns every value that appears more than once. It is the first test to put on any key.', yaml: 'columns:\n  - name: order_id\n    data_tests: [unique, not_null]' },
      { id: 'null', t: 'An order arrives with no customer_id', a: 'not_null', log: 'test_fail_many', re: /FAIL \d+ not_null_stg_brewline__orders_customer_id/, why: 'not_null counts rows where the column is empty.', yaml: 'columns:\n  - name: customer_id\n    data_tests: [not_null]' },
      { id: 'status', t: 'A new status, REFUNDED, shows up in the source', a: 'accepted_values', log: 'test_fail_many', re: /FAIL \d+ accepted_values/, why: 'accepted_values lists the values you know about. A new one is a signal, not noise: somebody changed the source.', yaml: 'columns:\n  - name: order_status\n    data_tests:\n      - accepted_values:\n          arguments:\n            values: [PLACED, SHIPPED, CANCELLED]' },
      { id: 'orphan', t: 'An order points at customer C-99, who does not exist', a: 'relationships', log: 'test_fail_many', re: /FAIL \d+ relationships_stg_brewline__orders/, why: 'relationships checks that every child key has a parent. It catches late or missing dimension rows.', yaml: 'columns:\n  - name: customer_id\n    data_tests:\n      - relationships:\n          arguments:\n            to: ref(\'stg_brewline__customers\')\n            field: customer_id' },
      { id: 'neg', t: 'An order total of -5.00', a: 'custom generic test', log: 'test_fail_many', re: /FAIL \d+ positive_value_stg_brewline__orders/, why: 'No built-in test says "greater than zero", so the project wrote positive_value once and reuses it on any column.', yaml: '{% test positive_value(model, column_name) %}\nselect * from {{ model }}\nwhere {{ column_name }} <= 0\n{% endtest %}' },
      { id: 'stale', t: 'The orders loader stopped 30 hours ago', a: 'source freshness', log: 'freshness_error', re: /ERROR STALE freshness of brewline\.orders/, why: 'Every other test passes on old data. Only freshness looks at the clock.', yaml: 'sources:\n  - name: brewline\n    config:\n      loaded_at_field: _loaded_at\n      freshness:\n        warn_after: {count: 12, period: hour}\n        error_after: {count: 24, period: hour}' },
      { id: 'sum', t: 'An order total does not equal the sum of its lines', a: 'singular test', log: 'build_day1', re: /WARN 2 assert_order_total_matches_lines/, why: 'A rule that involves two models is easiest as a plain SQL file in tests/. It passes when it returns no rows.', yaml: 'select order_id, order_total_usd, items_total_usd\nfrom {{ ref(\'int_orders__with_items\') }}\nwhere order_total_usd <> items_total_usd' },
      { id: 'logic', t: 'A refactor makes staging keep the oldest version of an order', a: 'unit test', log: 'unit_fail', re: /FAIL \d+ stg_brewline__orders::/, why: 'The data may still look fine. Only a test with fixed input and expected output proves that the logic is right.', yaml: 'unit_tests:\n  - name: test_stg_orders_keeps_the_latest_version\n    model: stg_brewline__orders\n    given: [...]\n    expect: [...]' },
      { id: 'rename', t: 'Someone renames revenue_usd in a public model', a: 'contract', log: 'contract_fail', re: /ERROR creating sql table model/, why: 'A contract fails the build before the table is replaced, so the dashboard never sees the broken shape.', yaml: 'config:\n  contract:\n    enforced: true\ncolumns:\n  - name: revenue_usd\n    data_type: decimal(38, 2)' }
    ];
    W.testlab = {
      steps: function () { return 2; },
      hint: 'Pick a problem, then pick the test that catches it.',
      say: function (s, i) {
        return i === 0
          ? 'Nine things can go wrong in the Brewline data. Pick one, then choose the check that catches it. Right answers show the real dbt output from a run where I made that exact mistake.'
          : 'Here is the whole map. Each check guards something different, and a good project uses several of them, not just one.';
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.tl || (A.local.tl = { cur: 'dupe', done: {}, wrong: '' });
        if (i === 1) {
          box.innerHTML = '<div class="lab">' + table(['What went wrong', 'The check', 'It runs with'], DEF.map(function (d) {
            return [d.t, '**' + d.a + '**', d.a === 'source freshness' ? 'dbt source freshness' : (d.a === 'unit test' ? 'dbt build or dbt test' : 'dbt build or dbt test')];
          })) + '</div>';
          return;
        }
        var cur = DEF.filter(function (d) { return d.id === st.cur; })[0];
        var solved = Object.keys(st.done).length;
        var h = '<div class="lab"><div class="defect-list">' + DEF.map(function (d) {
          return '<button type="button" class="defect' + (d.id === st.cur ? ' on' : '') + (st.done[d.id] ? ' done' : '') + '" data-act="tl-def" data-v="' + d.id + '">' + esc(d.t) + '</button>';
        }).join('') + '</div><p class="lab-note">Solved ' + solved + ' of ' + DEF.length + '.</p>';
        h += '<h3 class="qh">Which check catches: ' + md(cur.t) + '?</h3><div class="sel-chips">' + KINDS.map(function (k) {
          return '<button type="button" class="sel-chip' + (st.done[cur.id] && k === cur.a ? ' on' : '') + '" data-act="tl-pick" data-v="' + esc(k) + '"' + (st.done[cur.id] ? ' disabled' : '') + '>' + esc(k) + '</button>';
        }).join('') + '</div>';
        if (st.wrong && !st.done[cur.id]) h += '<div class="callout bad">Not ' + esc(st.wrong) + '. Think about what it looks at: one column, two tables, the clock, or the logic itself.</div>';
        if (st.done[cur.id]) {
          var ev = G.grep(G.log(cur.log), cur.re).replace(/^\d\d:\d\d:\d\d\s+/gm, '');
          h += '<div class="callout good"><b>' + esc(cur.a) + '.</b> ' + md(cur.why) + '</div>' +
            '<div class="layer-h"><span class="lname">What dbt printed</span></div><div class="ev"></div><div class="layer-h"><span class="lname">How it is written</span></div><div class="ev2"></div>';
          box.innerHTML = h + '</div>';
          box.querySelector('.ev').innerHTML = H.code({ file: '$ ' + G.cmd(cur.log), lang: 'text', code: ev || '(no matching line)' });
          box.querySelector('.ev2').innerHTML = H.code({ file: cur.a === 'singular test' ? 'tests/assert_order_total_matches_lines.sql' : (cur.a === 'custom generic test' ? 'tests/generic/positive_value.sql' : 'YAML'), lang: /^(select|\{%)/.test(cur.yaml) ? 'jinja' : 'yaml', code: cur.yaml });
        } else box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) {
          if (act === 'tl-def') { st.cur = el.getAttribute('data-v'); st.wrong = ''; A.render(true); }
          if (act === 'tl-pick') {
            var k = el.getAttribute('data-v');
            if (k === cur.a) { st.done[cur.id] = 1; st.wrong = ''; A.award('tl:' + cur.id, 4); A.say('Yes, ' + cur.a + '. ' + cur.why, 'cheer'); }
            else { st.wrong = k; A.say('Not ' + k + '. What does that check actually look at?', 'oops'); }
            A.save(); A.render(true);
          }
        };
      }
    };
    W.testlab.DEF = DEF;
  })();

  /* ====================== Schema names ====================== */
  (function () {
    var LAYERS = [['staging', 'stg_brewline__customers'], ['intermediate', 'int_orders__with_items'], ['marts', 'dim_customers'], ['reference', 'country_names (seed)'], ['snapshots', 'snap_customers']];
    /* the rule of dbt's built-in macro, and of the override shown in the lesson */
    function schemaOf(custom, target, macro) {
      var base = target === 'dev' ? 'dev_alice' : 'analytics';
      if (macro === 'default') return base + '_' + custom;
      return target === 'prod' ? custom : base;
    }
    W.schemaOf = schemaOf;
    W.schema = {
      steps: function () { return 3; },
      hint: 'Switch the target and the macro.',
      say: function (s, i) {
        return [
          'Where does dbt put a model? The answer is a macro called generate_schema_name. Pick a target and see the schema names. Dev is the target for Alice. Prod is the target for the scheduler.',
          'Now switch to the override. In prod the custom schema names are used as they are. Everywhere else, every model goes to the developer schema, so Alice has one schema to clean up, not five.',
          'Both cases below were really run. The line shows the staging view that dbt created.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.sch || (A.local.sch = { t: 'dev', m: 'default' });
        var key = 'schema_' + (st.m === 'default' ? 'default' : 'custom') + '_' + st.t;
        var line = G.grep(G.log(key), /OK created sql view model/).replace(/^\d\d:\d\d:\d\d\s+/, '');
        var h = '<div class="lab"><div class="lab-row"><span class="lab-l">Target</span><span class="sel-chips">' + chips(['dev', 'prod'], st.t, 'sc-t') + '</span></div>' +
          '<div class="lab-row"><span class="lab-l">Macro</span><span class="sel-chips">' + chips(['default', 'override'], st.m, 'sc-m', function (k) { return k === 'default' ? 'built-in generate_schema_name' : 'override in macros/'; }) + '</span></div>' +
          table(['Folder setting', 'Model', 'Schema dbt uses'], LAYERS.map(function (l) { return ['+schema: ' + l[0], l[1], '**' + schemaOf(l[0], st.t, st.m) + '**']; })) +
          '<div class="layer-h"><span class="lname">$ ' + esc(G.cmd(key)) + '</span></div><div class="ev"></div>';
        if (i >= 1) h += '<div class="layer-h"><span class="lname">The override, in macros/generate_schema_name.sql</span></div><div class="ev2"></div>';
        box.innerHTML = h + '</div>';
        box.querySelector('.ev').innerHTML = H.code({ file: 'log', lang: 'text', code: line });
        if (i >= 1) box.querySelector('.ev2').innerHTML = H.code({ file: 'macros/generate_schema_name.sql', lang: 'jinja', code: G.file('scenario/generate_schema_name.sql') });
        A.bindWidget = function (act, el) {
          if (act === 'sc-t') { st.t = el.getAttribute('data-v'); A.render(true); }
          if (act === 'sc-m') { st.m = el.getAttribute('data-v'); A.render(true); }
        };
      }
    };
  })();

  /* ====================== Join fan-out ====================== */
  W.fanout = {
    steps: function () { return 3; },
    hint: 'Look at the repeated order total, then switch the query.',
    say: function (s, i) {
      return [
        'Order O-5001 has two lines. Join orders to order_items and the order appears twice, and each copy carries the full order total of 67.00. Nothing is wrong yet. It becomes wrong when you add the totals up.',
        'Switch between the two queries. Summing the order total after the join counts every order once per line. The right answer sums the orders table alone, or collapses the lines first.',
        'The fix is a habit, not a trick. Know the grain of each table, and make both sides one row per key before you join.'
      ][i];
    },
    mood: function (s, i) { return i === 1 ? 'oops' : 'think'; },
    render: function (box, s, i, A) {
      var st = A.local.fo || (A.local.fo = { q: 'naive' });
      var rows = G.table('fanout_rows');
      var h = '<div class="lab">';
      if (i === 0) {
        h += '<div class="layer-h"><span class="lchip c-stg">JOIN</span><span class="lname">orders join order_items, order O-5001</span></div>' + table(rows.cols, rows.rows, function () { return 'dup'; });
        h += '<div class="callout warn">Two rows, and <code>order_total_usd</code> is <b>67.00</b> on both. Sum it and you get 134.00.</div>';
      } else {
        var t = G.table(st.q === 'naive' ? 'fanout_naive' : 'fanout_right'), good = G.table('fanout_right');
        h += '<div class="lab-row"><span class="lab-l">Query</span><span class="sel-chips">' + chips(['naive', 'right'], st.q, 'fo-q', function (k) { return k === 'naive' ? 'sum after joining the lines' : 'sum the orders table'; }) + '</span></div>';
        h += H.code({ file: 'query.sql', lang: 'sql', code: st.q === 'naive'
          ? 'select cast(o.ordered_at as date) as order_date, sum(o.order_total_usd) as revenue_usd\nfrom stg_brewline__orders o\njoin stg_brewline__order_items i on i.order_id = o.order_id\nwhere o.order_status <> \'CANCELLED\'\ngroup by 1 order by 1'
          : 'select cast(ordered_at as date) as order_date, sum(order_total_usd) as revenue_usd\nfrom stg_brewline__orders\nwhere order_status <> \'CANCELLED\'\ngroup by 1 order by 1' });
        h += table(['order_date', 'revenue_usd', 'compared with the right answer'], t.rows.map(function (r, k) {
          var diff = (parseFloat(r[1]) - parseFloat(good.rows[k][1])).toFixed(2);
          return [r[0], r[1], diff === '0.00' ? 'same' : '+' + diff + ' too high'];
        }), function (r) { return /too high/.test(r[2]) ? 'dup' : 'new'; });
      }
      box.innerHTML = h + '</div>';
      A.bindWidget = function (act, el) { if (act === 'fo-q') { st.q = el.getAttribute('data-v'); A.render(true); } };
    }
  };

  /* ====================== Threads ====================== */
  (function () {
    var DUR = { stg_products: 20, stg_items: 30, stg_orders: 25, stg_customers: 20, int_orders: 30, seed_country: 5, snap_customers: 40, dim_products: 25, fct_orders: 60, dim_customers: 50, fct_revenue: 20 };
    /* the longest chain of dependent nodes and its length: no number of threads can beat it */
    function chain() {
      var ids = Object.keys(DUR), succ = {}, memo = {};
      ids.forEach(function (n) { succ[n] = []; });
      LAB.graphs.dag.edges.forEach(function (e) { if (DUR[e.a] && DUR[e.b]) succ[e.a].push(e.b); });
      function best(n) {
        if (memo[n]) return memo[n];
        var tail = [], len = 0;
        succ[n].forEach(function (c) { var b = best(c); if (b.len > len) { len = b.len; tail = b.path; } });
        return (memo[n] = { len: DUR[n] + len, path: [n].concat(tail) });
      }
      var top = null;
      ids.forEach(function (n) { var b = best(n); if (!top || b.len > top.len) top = b; });
      return top;
    }
    W.chain = chain;
    function schedule(threads) {
      var ids = Object.keys(DUR), preds = {}, succ = {};
      ids.forEach(function (n) { preds[n] = []; succ[n] = []; });
      LAB.graphs.dag.edges.forEach(function (e) { if (DUR[e.a] && DUR[e.b]) { preds[e.b].push(e.a); succ[e.a].push(e.b); } });
      var memo = {};
      function tail(n) { if (memo[n] == null) memo[n] = DUR[n] + Math.max.apply(null, [0].concat(succ[n].map(tail))); return memo[n]; }
      var t = 0, done = {}, started = {}, running = [], out = [], lanes = [];
      for (var i = 0; i < threads; i++) lanes.push(0);
      while (Object.keys(done).length < ids.length) {
        var ready = ids.filter(function (n) { return !started[n] && preds[n].every(function (p) { return done[p]; }); }).sort(function (a, b) { return tail(b) - tail(a); });
        while (ready.length && running.length < threads) {
          var n = ready.shift(), lane = lanes.findIndex(function (e) { return e <= t; });
          started[n] = 1; lanes[lane] = t + DUR[n];
          running.push({ n: n, end: t + DUR[n] }); out.push({ n: n, start: t, end: t + DUR[n], lane: lane });
        }
        var next = Math.min.apply(null, running.map(function (r) { return r.end; }));
        t = next;
        running = running.filter(function (r) { if (r.end <= t) { done[r.n] = 1; return false; } return true; });
      }
      return { total: t, items: out };
    }
    W.schedule = schedule;
    W.threads = {
      steps: function () { return 2; },
      hint: 'Change the thread count and watch the total time.',
      say: function (s, i) {
        var c = chain();
        return i === 0
          ? 'dbt runs every model that is ready, up to the number of threads you give it. These durations are made up, but the dependencies are the real Brewline graph. Change the threads and watch the total time.'
          : 'More threads help only until the longest chain is the limit. Here the chain is ' + c.path.join(', then ') + ': ' + c.len + ' seconds. Each step waits for the one before, so no thread count can beat it. Past that point the fix is a faster model on the chain, not more threads.';
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.th || (A.local.th = { n: 1 });
        var sc = schedule(st.n), one = schedule(1).total, h = '<div class="lab"><div class="lab-row"><span class="lab-l">Threads</span><span class="sel-chips">' + chips(['1', '2', '4', '8'], String(st.n), 'th-n') + '</span></div>';
        h += '<div class="lab-out"><div class="big"><b>' + sc.total + ' s</b><span>total time (made-up durations)</span></div><div class="big ' + (sc.total < one ? 'good' : '') + '"><b>' + Math.round(one / sc.total * 10) / 10 + 'x</b><span>faster than one thread</span></div></div>';
        h += '<div class="gantt">';
        for (var l = 0; l < st.n; l++) {
          h += '<div class="lane"><span class="lane-n">thread ' + (l + 1) + '</span><div class="lane-track">' + sc.items.filter(function (x) { return x.lane === l; }).map(function (x) {
            return '<span class="gbar" title="' + x.n + ': ' + x.start + ' to ' + x.end + ' s" style="left:' + (x.start / one * 100) + '%;width:' + ((x.end - x.start) / one * 100) + '%">' + (x.end - x.start >= 14 ? esc(x.n.replace('stg_', 's_')) : '') + '</span>';
          }).join('') + '</div></div>';
        }
        var ch = chain();
        h += '</div><p class="lab-note">Bars are drawn to the same scale. The longest chain is ' + ch.path.join(', ') + ': ' + ch.len + ' s.</p>';
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'th-n') { st.n = +el.getAttribute('data-v'); A.render(true); } };
      }
    };
  })();
})();
