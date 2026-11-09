/* Snowflake and dbt lab widgets. Each one registers LAB.W.<kind> with steps, say, render.
   What a lab shows as SQL comes from js/real.js, recorded from dbt-snowflake running on the Brewline project against a
   stand-in for the connection. Nothing ran on Snowflake. The credit calculator is arithmetic on example prices and says so. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var W = (LAB.W = LAB.W || {});
  var esc = LAB.esc, md = LAB.md, H = LAB.H, G = LAB.get;

  function chips(list, cur, act, fmt) {
    return list.map(function (k) { return '<button type="button" class="sel-chip' + (String(k) === String(cur) ? ' on' : '') + '" data-act="' + act + '" data-v="' + esc(String(k)) + '">' + esc(fmt ? fmt(k) : String(k)) + '</button>'; }).join('');
  }
  function table(cols, rows, rowCls, cellCls) {
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r, ri) { return '<tr class="' + (rowCls ? rowCls(r, ri) || '' : '') + '">' + r.map(function (c, ci) { return '<td class="' + (cellCls ? cellCls(c, ci, ri) || '' : '') + '">' + md(String(c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  /* the statements of a scenario without the SHOW, DESCRIBE, begin and commit calls */
  function work(k) { return G.stmts(k).filter(function (s) { return s.kind !== 'meta' && s.kind !== 'txn'; }); }
  function fmtN(x, d) { return (Math.round(x * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }

  /* ====================== Settings lab ====================== */
  (function () {
    var SET = [
      { k: 'baseline', name: 'no extra setting', cfg: "config(materialized='table')", risk: 'No Fail-safe. Time Travel of 1 day at most. Cheap to store, right for tables you can rebuild.',
        note: 'A table model with nothing extra. Look at the first word after `create or replace`: **transient**. The adapter adds it for you. A transient table has no Fail-safe period and at most 1 day of Time Travel, which makes it cheaper to store.' },
      { k: 'transient_false', name: 'transient=false', cfg: "config(materialized='table', transient=false)", risk: 'Pays for Fail-safe storage and longer Time Travel. Use it on tables you cannot rebuild.',
        note: 'One word disappeared from the create statement. The table is now permanent, so it gets Fail-safe and as many days of Time Travel as the account allows. Both cost storage. Use it for history you cannot recreate, for example snapshots.' },
      { k: 'copy_grants', name: 'copy_grants=true', cfg: "config(materialized='table', copy_grants=true)", risk: 'Privileges survive the replace. Without it, they are gone until dbt grants them again.',
        note: '`copy grants` sits between the table name and `as`. A `create or replace` makes a new object, and a new object has no privileges unless Snowflake is told to copy them from the old one.' },
      { k: 'cluster_by', name: 'cluster_by=[tier]', cfg: "config(materialized='table', cluster_by=['tier'])", risk: 'Automatic clustering runs in the background and uses credits. Worth it on large tables with selective filters.',
        note: 'dbt does two things: it sorts the rows inside the create statement, then it adds a clustering key with `alter table`. After that, Snowflake keeps the table clustered by itself, and that background work uses credits.' },
      { k: 'warehouse', name: 'snowflake_warehouse', cfg: "config(materialized='table', snowflake_warehouse='WH_TRANSFORM_XL')", risk: 'Only this model runs on the larger warehouse, and it bills there. Three extra statements.',
        note: 'dbt reads the current warehouse, switches with `use warehouse`, runs the model, and switches back to the warehouse from your profile. The create statement itself is identical to the baseline.' },
      { k: 'query_tag', name: 'query_tag', cfg: "config(materialized='table', query_tag='dbt_brewline_' ~ target.name)", risk: 'Free to set. It makes the cost of this model visible in the query history.',
        note: 'dbt sets a tag on the session before the model and removes it after. Every statement in between carries the tag in Snowflake\'s query history, so you can add up credits by tag.' },
      { k: 'secure_view', name: 'secure=true', cfg: "config(materialized='view', secure=true)", risk: 'Hides the view text from other roles. Required to share a view. Can run slower than a normal view.',
        note: 'A secure view hides its definition from roles that do not own it. Snowflake requires secure views when you share a view with another account. The price is that the optimizer skips some shortcuts, so a secure view can be slower.' },
      { k: 'grants', name: 'grants', cfg: "config(materialized='table', grants={'select': ['REPORTER', 'ANALYST']})", risk: 'One statement per role. Privileges live in code and show up in review.',
        note: 'After the create statement, dbt sends one `grant` per role. Because the table did not exist before, dbt did not need to look at existing grants. The grants mission shows the case where it does.' },
      { k: 'dynamic_table', name: 'dynamic_table', cfg: "config(materialized='dynamic_table', target_lag='1 hour', snowflake_warehouse='WH_TRANSFORM', refresh_mode='AUTO')", risk: 'Snowflake refreshes it on its own, with its own warehouse, even when dbt is not running.',
        note: 'dbt creates a **dynamic table** with a target lag and a warehouse. After that, Snowflake decides when to refresh it. A dbt run only creates or changes the definition.' },
      { k: 'post_hook', name: 'post_hook', cfg: "config(materialized='table', post_hook=\"alter table {{ this }} modify column email set masking policy BREWLINE.GOVERNANCE.EMAIL_MASK\")", risk: 'A policy set by hand is lost when the table is replaced. The hook sets it again on every build.',
        note: 'A post-hook is one more statement after the create. Here it attaches a masking policy to the `email` column. The replaced table is a new object, so the hook has to run on every build.' }
    ];
    function status(sql, base) {
      if (base.some(function (b) { return b.sql === sql; })) return 'same';
      var lead = sql.split(/\s+/).slice(0, 3).join(' ').toLowerCase();
      if (base.some(function (b) { return b.sql.split(/\s+/).slice(0, 3).join(' ').toLowerCase() === lead; })) return 'changed';
      return 'added';
    }
    function diff(k) {
      var base = work('cfg_baseline'), mine = work('cfg_' + k);
      return mine.map(function (s) { return { sql: s.sql, st: k === 'baseline' ? 'base' : status(s.sql, base) }; });
    }
    var LABEL = { base: 'the baseline', same: 'same as the baseline', changed: 'changed', added: 'added' };
    W.cfg = {
      steps: function () { return 2; },
      hint: 'Pick a setting. Compare the statements with the baseline.',
      say: function (s, i) {
        return [
          'One small model, ten ways to configure it. For each, I ran dbt-snowflake and wrote down every statement it sent. Pick a setting. The yellow label marks a statement that changed, and the green label marks one that dbt added.',
          'Here are all ten side by side. Read the right column as a checklist for a review: every setting buys something and costs something.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.cfg || (A.local.cfg = { k: 'baseline' });
        var cur = SET.filter(function (x) { return x.k === st.k; })[0];
        var h;
        if (i === 0) {
          var list = diff(cur.k);
          h = '<div class="lab"><div class="sel-chips">' + chips(SET.map(function (x) { return x.k; }), cur.k, 'cfg-pick', function (k) { return SET.filter(function (x) { return x.k === k; })[0].name; }) + '</div>' +
            '<div class="callout tip"><b>In the model:</b> <code>' + esc('{{ ' + cur.cfg + ' }}') + '</code></div>';
          list.forEach(function (x, n) {
            h += '<div><span class="stag ' + x.st + '">' + esc(LABEL[x.st]) + '</span> <span class="lab-note">statement ' + (n + 1) + ' of ' + list.length + '</span>' +
              H.code({ file: 'sent to Snowflake', lang: 'sql', code: x.sql }) + '</div>';
          });
          h += '<div class="callout ' + (cur.k === 'baseline' ? 'tip' : 'good') + '">' + md(cur.note) + '</div></div>';
        } else {
          h = '<div class="lab">' + table(['Setting', 'Statements sent', 'Changed or added', 'Cost or risk'], SET.map(function (x) {
            var d = diff(x.k), ch = d.filter(function (y) { return y.st === 'changed'; }).length, ad = d.filter(function (y) { return y.st === 'added'; }).length;
            return ['`' + x.name + '`', String(d.length), x.k === 'baseline' ? 'baseline' : (ch ? ch + ' changed' : '') + (ch && ad ? ', ' : '') + (ad ? ad + ' added' : '') || 'none', x.risk];
          }), function (r, k) { return k === 0 ? 'trk' : ''; }) + '</div>';
        }
        box.innerHTML = h;
        if (i === 0) box.querySelectorAll('.code').forEach(function (c, n) { var l = diff(cur.k)[n]; H.bindCode(c, l.sql); });
        A.bindWidget = function (act, el) { if (act === 'cfg-pick') { st.k = el.getAttribute('data-v'); A.render(true); } };
      }
    };
    W.cfgSet = SET;
    W.cfgDiff = diff;
  })();

  /* ====================== Incremental strategies lab ====================== */
  (function () {
    var STR = [
      { k: 'merge', name: 'merge', sc: 'incr_merge', cfg: "unique_key='order_id'", dupe: 'Matched rows update. If one target row matches several new rows, Snowflake raises an error by default. Unmatched rows are all inserted.', look: 'Looks up each incoming key in the target.' },
      { k: 'di', name: 'delete+insert', sc: 'incr_delete_insert', cfg: "incremental_strategy='delete+insert'", dupe: 'Both rows are inserted. The target holds duplicates, so remove them in the model.', look: 'Looks up each incoming key in the target to delete it.' },
      { k: 'append', name: 'append', sc: 'incr_append', cfg: "incremental_strategy='append'", dupe: 'Both rows are inserted. Every repeated key is a duplicate.', look: 'Does not read the target.' },
      { k: 'mb', name: 'microbatch', sc: 'incr_microbatch', cfg: "incremental_strategy='microbatch', event_time='ordered_at', batch_size='day'", dupe: 'The window is deleted, then every row of the window is inserted. Duplicates inside one window stay.', look: 'Deletes one time window per batch.' },
      { k: 'cols', name: 'merge, some columns', sc: 'incr_merge_columns', cfg: "unique_key='order_id', merge_update_columns=['order_status', 'order_total_usd', 'loaded_at']", dupe: 'Same as merge, but a match updates only the listed columns.', look: 'Looks up each incoming key in the target.' },
      { k: 'pred', name: 'merge, with predicate', sc: 'incr_predicates', cfg: "unique_key='order_id', incremental_predicates=[\"DBT_INTERNAL_DEST.ordered_at >= dateadd(day, -7, current_date)\"]", dupe: 'Same as merge, but only target rows from the last 7 days can match. An older version of a key is never updated; a new copy is inserted.', look: 'Limits the lookup to the last 7 days of the target.' }
    ];
    function tmpKind(sc) { var m = /temporary (view|table)/i.exec(G.stmts(sc).map(function (s) { return s.sql; }).join('\n')); return m ? m[1].toLowerCase() : '?'; }
    /* the statements of one batch: everything up to the first drop of a temporary object */
    function oneBatch(sc) {
      var w = work(sc), n = -1;
      w.forEach(function (s, i) { if (n < 0 && /^drop/i.test(s.sql)) n = i; });
      return n < 0 ? w : w.slice(0, n + 1);
    }
    function verbs(sc) { return oneBatch(sc).filter(function (s) { return /^(merge|delete|insert)/i.test(s.sql); }).map(function (s) { return s.sql.split(/\s+/)[0].toLowerCase(); }); }
    /* one transaction: a begin before the first DML, a commit after the last, and no DDL in between */
    function oneTxn(sc) {
      var all = G.stmts(sc), first = -1, last = -1, i;
      for (i = 0; i < all.length; i++) if (all[i].kind === 'dml' && /^(merge|delete|insert)/i.test(all[i].sql)) { if (first < 0) first = i; last = i; }
      if (first < 0) return false;
      var b = -1, c = -1;
      for (i = first; i >= 0; i--) if (all[i].kind === 'txn' && all[i].sql === 'begin') { b = i; break; }
      for (i = last; i < all.length; i++) if (all[i].kind === 'txn' && all[i].sql === 'commit') { c = i; break; }
      if (b < 0 || c < 0) return false;
      for (i = b; i <= c; i++) if (all[i].kind === 'ddl') return false;
      return true;
    }
    W.strat = {
      steps: function () { return 3; },
      hint: 'Pick a strategy. Read the statements dbt sent.',
      say: function (s, i) {
        return [
          'Day two on Snowflake. The same model ran with each strategy, starting from an existing table. Pick a strategy and read what dbt sent. The SHOW and DESCRIBE calls are left out so you see the work.',
          'Now compare them. Every column on this screen is read from the recordings: which temporary object dbt made, which statements touched the table, and whether they ran between begin and commit.',
          'These two columns come from how Snowflake treats the statements. I did not run them here, so check Snowflake\'s documentation for your version. Read them as the questions to ask about each strategy.'
        ][i];
      },
      mood: function (s, i) { return i === 1 ? 'happy' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.strat || (A.local.strat = { k: 'merge' });
        var cur = STR.filter(function (x) { return x.k === st.k; })[0];
        var h;
        if (i === 0) {
          var list = oneBatch(cur.sc);
          h = '<div class="lab"><div class="sel-chips">' + chips(STR.map(function (x) { return x.k; }), cur.k, 'st-pick', function (k) { return STR.filter(function (x) { return x.k === k; })[0].name; }) + '</div>' +
            '<div class="callout tip"><b>In the model:</b> <code>' + esc(cur.cfg) + '</code></div>';
          list.forEach(function (x, n) { h += '<div><span class="lab-note">statement ' + (n + 1) + ' of ' + list.length + (cur.k === 'mb' ? ', first batch (March 17). The second batch repeats these for March 18.' : '') + '</span>' + H.code({ file: 'sent to Snowflake', lang: 'sql', code: x.sql }) + '</div>'; });
          h += '</div>';
        } else if (i === 1) {
          h = '<div class="lab">' + table(['Strategy', 'Temporary object', 'Statements on the table', 'One transaction'], STR.map(function (x) {
            return ['**' + x.name + '**', tmpKind(x.sc), verbs(x.sc).join(', then '), oneTxn(x.sc) ? 'yes' : 'no'];
          }), function (r, k) { return STR[k].k === st.k ? 'trk' : ''; }) +
            '<div class="callout tip"><b>How to read it.</b> Merge and delete+insert both replace a changed row. Merge does it in one statement. Delete+insert needs two statements, and dbt put them in one transaction. Append never replaces anything. Microbatch replaces a whole time window and is the one you can re-run for a single day, and in the recording it ran without a transaction.</div></div>';
        } else {
          h = '<div class="lab">' + table(['Strategy', 'Reads the target', 'Two new rows share a key'], STR.map(function (x) {
            return ['**' + x.name + '**', x.look, x.dupe];
          }), function (r, k) { return STR[k].k === st.k ? 'trk' : ''; }) +
            '<div class="callout warn"><b>From the documentation, not from a run.</b> The duplicate-key behavior of a merge is Snowflake\'s default. It can be changed, and you should not change it to make an error disappear. Keep one row per key in the model query.</div></div>';
        }
        box.innerHTML = h;
        if (i === 0) box.querySelectorAll('.code').forEach(function (c, n) { H.bindCode(c, oneBatch(cur.sc)[n].sql); });
        A.bindWidget = function (act, el) { if (act === 'st-pick') { st.k = el.getAttribute('data-v'); A.render(true); } };
      }
    };
    W.stratInfo = { oneTxn: oneTxn, verbs: verbs, tmpKind: tmpKind, oneBatch: oneBatch, list: STR };
  })();

  /* ====================== Credit calculator ====================== */
  (function () {
    var SIZES = [['XS', 1], ['S', 2], ['M', 4], ['L', 8], ['XL', 16], ['2XL', 32], ['3XL', 64], ['4XL', 128]];
    var RATE = {}; SIZES.forEach(function (x) { RATE[x[0]] = x[1]; });
    var DAY = 86400;
    /* seconds billed in one day for runs that start every `gap` seconds, last `run` seconds, with an auto-suspend of `sus` seconds.
       A warehouse that resumes is billed at least 60 seconds. */
    function billedSeconds(gap, run, sus) {
      var billed = 0, start = null, end = null;
      for (var t = 0; t < DAY; t += gap) {
        var done = t + run;
        if (start !== null && t <= end) end = done + sus;
        else { if (start !== null) billed += Math.max(60, end - start); start = t; end = done + sus; }
      }
      return billed + Math.max(60, end - start);
    }
    function perRunCredits(size, run) { return RATE[size] * Math.max(60, run) / 3600; }
    function scale(eff, n, baseMin) { var t = baseMin / Math.pow(1 + eff, n); return { min: t, credits: Math.pow(2, n) * t / 60 }; }
    W.costCalc = { rate: RATE, sizes: SIZES, billedSeconds: billedSeconds, perRunCredits: perRunCredits, scale: scale };
    W.cost = {
      steps: function () { return 3; },
      hint: 'Click the choices. The numbers update.',
      say: function (s, i) {
        return [
          'This is arithmetic, not a measurement. Pick a warehouse size, how long a run takes and what a credit costs. The prices are examples. Your contract sets the real price per credit.',
          'Bigger is not always dearer. If a query gets twice as fast on a warehouse twice the size, you pay the same and wait half as long. If it does not, you pay more for nothing. The scaling factors here are made up to show the shape. Measure your own queries.',
          'Last lever: auto-suspend. The warehouse bills while it is on, and at least 60 seconds each time it resumes. A long auto-suspend between frequent runs keeps it on all day.'
        ][i];
      },
      mood: function (s, i) { return i === 2 ? 'think' : 'happy'; },
      render: function (box, s, i, A) {
        var st = A.local.cost || (A.local.cost = { size: 'S', run: 120, price: 3, perDay: 24, eff: 1, gap: 300, sus: 600, rl: 30 });
        var h = '<div class="lab">';
        if (i === 0) {
          var c1 = perRunCredits(st.size, st.run), cd = c1 * st.perDay, cm = cd * 30;
          h += '<div class="lab-row"><span class="lab-l">Size</span><div class="sel-chips">' + chips(SIZES.map(function (x) { return x[0]; }), st.size, 'c-size', function (k) { return k + ' (' + RATE[k] + ' credit' + (RATE[k] > 1 ? 's' : '') + ' an hour)'; }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">One run takes</span><div class="sel-chips">' + chips([20, 120, 600, 1800], st.run, 'c-run', function (k) { return k < 60 ? k + ' seconds' : (k / 60) + ' minutes'; }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">Runs a day</span><div class="sel-chips">' + chips([1, 24, 96], st.perDay, 'c-per', function (k) { return String(k); }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">Price of a credit</span><div class="sel-chips">' + chips([2, 3, 4], st.price, 'c-price', function (k) { return '$' + k; }) + '</div></div>' +
            '<div class="lab-out"><div class="big"><b>' + fmtN(c1, 3) + '</b><span>credits per run' + (st.run < 60 ? ' (billed as 60 seconds)' : '') + '</span></div>' +
            '<div class="big"><b>' + fmtN(cd, 2) + '</b><span>credits per day</span></div>' +
            '<div class="big ' + (cm * st.price > 1000 ? 'bad' : cm * st.price > 200 ? 'warn' : 'good') + '"><b>$' + fmtN(cm * st.price, 0) + '</b><span>per month of 30 days</span></div></div>' +
            table(['Size', 'Credits an hour', 'Credits per run', 'Dollars per month'], SIZES.map(function (x) { var c = perRunCredits(x[0], st.run); return [x[0], String(x[1]), fmtN(c, 3), '$' + fmtN(c * st.perDay * 30 * st.price, 0)]; }), function (r) { return r[0] === st.size ? 'trk' : ''; }) +
            '<p class="lab-note">Each step up in size doubles the credits an hour. The run is billed as at least 60 seconds because the warehouse starts from suspended.</p>';
        } else if (i === 1) {
          var sc5 = [0, 1, 2, 3, 4].map(function (n) { return scale(st.eff, n, 32); });
          var rows = sc5.map(function (r, n) { return [SIZES[n][0], fmtN(r.min, 1) + ' min', fmtN(r.credits, 2), '$' + fmtN(r.credits * st.price, 2)]; });
          var best = sc5.reduce(function (m, r, n) { return r.credits < sc5[m].credits - 1e-9 ? n : m; }, 0);
          h += '<div class="lab-row"><span class="lab-l">How the query scales</span><div class="sel-chips">' + chips([1, 0.5, 0.1], st.eff, 'c-eff', function (k) { return k === 1 ? 'doubles in speed per size' : k === 0.5 ? 'gains 50% per size' : 'gains 10% per size'; }) + '</div></div>' +
            table(['Size', 'Run time', 'Credits per run', 'Cost per run'], rows, function (r, n) { return n === best && st.eff < 1 ? 'new' : ''; }) +
            '<div class="callout ' + (st.eff === 1 ? 'good' : 'warn') + '">' + (st.eff === 1 ? 'Every size costs the same per run, and the run gets shorter. Go as big as the deadline needs.' : 'Each size up costs more per run and saves less time. The cheapest run is the smallest size. Pay for a larger one only when the deadline needs it.') + '</div>' +
            '<p class="lab-note">Model: a 32 minute run on XS, and a speed-up of ' + (1 + st.eff).toFixed(1) + ' times for each doubling. Made-up numbers. Real queries also hit limits such as a single large sort or a few big files.</p>';
        } else {
          var sizeRate = RATE[st.size];
          var opts = [60, 300, 600].map(function (sus) { var b = billedSeconds(st.gap, st.rl, sus); return [sus + ' seconds', fmtN(b / 3600, 1) + ' hours', fmtN(sizeRate * b / 3600, 1), '$' + fmtN(sizeRate * b / 3600 * 30 * st.price, 0)]; });
          h += '<div class="lab-row"><span class="lab-l">A run starts every</span><div class="sel-chips">' + chips([300, 900, 3600], st.gap, 'c-gap', function (k) { return (k / 60) + ' minutes'; }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">Each run takes</span><div class="sel-chips">' + chips([30, 120], st.rl, 'c-rl', function (k) { return k + ' seconds'; }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">Size</span><div class="sel-chips">' + chips(['XS', 'S', 'M', 'L'], st.size, 'c-size', function (k) { return k; }) + '</div></div>' +
            table(['Auto-suspend', 'Warehouse on, per day', 'Credits per day', 'Dollars per month'], opts, function (r, n) { return n === 0 ? 'new' : (parseFloat(opts[n][1].replace(/,/g, '')) > 23 ? 'dup' : ''); }) +
            '<div class="callout tip">For a transformation warehouse that sits idle between runs, <b>60 seconds</b> is the usual setting. A suspended warehouse loses its local cache, so the next query reads from storage. That is rarely a cost for a dbt run, and it can matter for dashboards that repeat the same reads.</div>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'c-size') st.size = v;
          if (act === 'c-run') st.run = +v;
          if (act === 'c-per') st.perDay = +v;
          if (act === 'c-price') st.price = +v;
          if (act === 'c-eff') st.eff = +v;
          if (act === 'c-gap') st.gap = +v;
          if (act === 'c-rl') st.rl = +v;
          A.render(true);
        };
      }
    };
  })();

  /* ====================== Where does it land? ====================== */
  (function () {
    var TARGETS = [
      { k: 'dev', name: 'dev', sc: 'run_all_dev', who: 'A developer, on a laptop' },
      { k: 'ci', name: 'ci', sc: 'run_two_ci', who: 'The pull request check' },
      { k: 'prod', name: 'prod', sc: 'run_two_prod', who: 'The scheduler' }
    ];
    var MODELS = ['stg_brewline__customers', 'dim_customers'];
    function conn(sc) { return JSON.parse(G.text('connect_' + sc)); }
    function made(sc, model) {
      var s = G.pick(sc, new RegExp('^create or replace (?:transient )?(?:view|table) \\S*' + model + '\\s'))[0].sql;
      var m = /^create or replace (transient )?(view|table) (\S+)/.exec(s);
      return { kind: (m[1] || '') + m[2], name: m[3], sql: s };
    }
    W.envInfo = { targets: TARGETS, conn: conn, made: made, models: MODELS };
    W.targets = {
      steps: function () { return 2; },
      hint: 'Pick a target. Then compare the two CI runs.',
      say: function (s, i) {
        return [
          'The same two models ran against three targets. Nothing in the model files changed. Only the profile did. Pick a target and read where dbt put the models, and which role and warehouse it used.',
          'In CI you have a choice. Build every parent in the pull request schema, or defer to production and read the parents from there. Compare the two real runs.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.targets || (A.local.targets = { k: 'dev', ci: 'build' });
        var h = '<div class="lab">', shownCode = '';
        if (i === 0) {
          var cur = TARGETS.filter(function (x) { return x.k === st.k; })[0], c = conn(cur.sc);
          h += '<div class="sel-chips">' + chips(TARGETS.map(function (x) { return x.k; }), cur.k, 'tg-pick', function (k) { return 'target: ' + k; }) + '</div>' +
            '<div class="lab-out"><div class="big"><b>' + esc(c.role) + '</b><span>role</span></div><div class="big"><b>' + esc(c.warehouse) + '</b><span>warehouse</span></div><div class="big"><b>' + esc(c.database) + '</b><span>database</span></div><div class="big"><b>' + esc(c.schema) + '</b><span>profile schema</span></div></div>' +
            table(['Model', 'Created as', 'Full name in Snowflake'], MODELS.map(function (m) { var r = made(cur.sc, m); return ['`' + m + '`', r.kind, '`' + r.name + '`']; })) +
            '<p class="lab-note">' + esc(cur.who) + '. Connection settings are the ones dbt passed to the Snowflake connector in this run.</p>';
        } else {
          var a = G.stmt('run_two_ci', /^create or replace transient table \S*dim_customers\s/), b = G.stmt('ci_defer', /^create or replace transient table \S*dim_customers\s/);
          var from = function (sql) { return G.grep(sql, /\b(from|join)\b\s+\S*BREWLINE/i).replace(/^\s+/gm, ''); };
          var curCi = st.ci;
          shownCode = from(curCi === 'build' ? a : b);
          h += '<div class="sel-chips">' + chips(['build', 'defer'], curCi, 'ci-pick', function (k) { return k === 'build' ? 'build the parents in the PR schema' : 'defer to production'; }) + '</div>' +
            '<div class="lab-out"><div class="big ' + (curCi === 'build' ? 'warn' : 'good') + '"><b>' + work(curCi === 'build' ? 'run_two_ci' : 'ci_defer').length + ' statements</b><span>' + (curCi === 'build' ? 'two models built' : 'one model built') + '</span></div></div>' +
            H.code({ file: 'where dim_customers reads its parents', lang: 'sql', code: shownCode }) +
            '<div class="callout ' + (curCi === 'build' ? 'warn' : 'good') + '">' + (curCi === 'build' ? 'Every parent was built again in the pull request schema, and the seed was loaded there too. It is simple, and it costs a rebuild for each parent.' : 'The parents were not built. `dim_customers` reads them from production, because they do not exist in the pull request schema. The pull request tests the one model that changed.') + '</div>';
        }
        box.innerHTML = h + '</div>';
        if (i === 1) { var code = box.querySelector('.code'); if (code) H.bindCode(code, shownCode); }
        A.bindWidget = function (act, el) { if (act === 'tg-pick') st.k = el.getAttribute('data-v'); if (act === 'ci-pick') st.ci = el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();
})();
