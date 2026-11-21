/* ELT project lab. It registers LAB.W.runlab with steps, say, render.
   What the lab shows comes from js/real.js: the real project, run through Airflow with dlt and dbt.
   Text in notes and callouts goes through the formatter: use `code` and **bold**, never HTML tags. A cloud warehouse and a deployed Airflow did not run. */
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
  function pre(text, cls) { return '<pre class="lab-pre' + (cls ? ' ' + cls : '') + '">' + esc(text) + '</pre>'; }
  var n = G.n;

  /* ====================== The runs of the DAG ====================== */
  W.runlab = (function () {
    var KEYS = ['day1', 'day2', 'day3_fail', 'day3_fix', 'backfill2'];
    return {
      steps: function () { return 1; },
      hint: 'Pick a run and read what each step did.',
      say: function () { return 'Five runs of the same DAG. Pick one, read what each of the four steps did, and compare the raw table with the marts.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var RUNS = G.counts('runs'), T = G.table('runs').rows;
        var AFTER = { day1: 'after_day1', day2: 'after_day2', day3_fail: 'after_failed_day3', day3_fix: 'after_day3', backfill2: 'after_backfill' };
        var why = {
          day1: 'The first run loaded **200** orders and their lines, built the models, passed all **22** checks of dbt (14 tests and the rest of the build), passed the gate and published the marts.',
          day2: 'Day 2 wrote **60** rows: the 20 shipped orders, the refund, the 30 new orders and the orders of the last hour before the cursor (the lookback). The raw table holds **230** orders and so do the marts.',
          day3_fail: 'The load worked, so the raw table has **255** orders. A new product has no price, so one dbt test **failed** and dbt **skipped 7** things that depend on it. The marts still hold **230**. The gate and the publish step **did not run**.',
          day3_fix: 'One line in the seed (the price of the new product) and the same run succeeded. The load wrote only **9** rows: the cursor remembered day 3. The marts now hold **255** orders.',
          backfill2: 'Day 2 was run again after day 3. The load wrote **0** rows and the table stayed at **255** orders: the pipeline is **safe to repeat**. The gate compares with the shop as of the newest day in the warehouse, so it passed.'
        };
        var kinds = { day1: 'good', day2: 'good', day3_fail: 'bad', day3_fix: 'good', backfill2: 'good' };
        var st = A.local.rl || (A.local.rl = { k: 2 }), key = KEYS[st.k], run = RUNS[key], a = G.counts(AFTER[key]), r = T[st.k];
        var stage = function (name) { var v = run.tasks[name]; return v === 'success' ? 'good' : v === 'failed' ? 'bad' : ''; };
        var out = '<div class="lab">' + row('Run', chips(KEYS.map(function (x, k) { return k; }), st.k, 'rl-k', function (k) { return T[k][0] + ' (' + T[k][1] + ')'; }));
        out += big([[run.tasks.extract_load, 'load (dlt)', stage('extract_load')], [run.tasks.dbt_build, 'build and test (dbt)', stage('dbt_build')], [run.tasks.quality_gate, 'quality gate', stage('quality_gate')], [run.tasks.publish, 'publish', stage('publish')]]);
        out += big([[n(a.raw_orders), 'orders in raw'], [n(a.fct_orders), 'orders in the marts', a.fct_orders === a.raw_orders ? 'good' : 'bad'], [run.dbt.PASS + ' / ' + run.dbt.TOTAL, 'dbt checks passed', run.dbt.ERROR ? 'bad' : 'good']]);
        out += pre([run.load, 'dbt: PASS=' + run.dbt.PASS + ' ERROR=' + run.dbt.ERROR + ' SKIP=' + run.dbt.SKIP + ' of ' + run.dbt.TOTAL].concat(run.dbt_fail.map(function (f) { return 'failed test: ' + f; })).join('\n'), run.state === 'failed' ? 'err' : '');
        out += callout(kinds[key], why[key]);
        out += note(' Real output of `airflow dags test brewline_daily ' + r[1] + '`: dlt ' + G.meta('dlt') + ', dbt ' + G.meta('dbt') + ', Airflow ' + G.meta('airflow') + '.');
        box.innerHTML = out + '</div>';
        A.bindWidget = function (act, el) { if (act === 'rl-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();
})();
