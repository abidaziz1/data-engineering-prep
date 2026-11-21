/* Lakehouse project lab. It registers LAB.W.runlab with steps, say, render.
   What the lab shows comes from js/real.js: the real project, run on Spark and Delta Lake.
   Text in notes and callouts goes through the formatter: use `code` and **bold**, never HTML tags. Cloud storage and a cluster did not run. */
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

  /* ====================== The runs of the pipeline ====================== */
  W.runlab = (function () {
    var KEYS = ['day1', 'day2', 'day3', 'day3_again'];
    return {
      steps: function () { return 1; },
      hint: 'Pick a run and read what each layer did.',
      say: function () { return 'Four runs of the same pipeline. Pick one, read what each layer did with the lines of the run, and compare the totals of the tables.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var RUNS = G.counts('runs');
        var R1 = RUNS.day1, R2 = RUNS.day2, R3 = RUNS.day3;
        var why = {
          day1: 'The first file had **' + R1.bronze_rows + '** lines: 300 orders, a duplicate of order 7, and four dirty ones. **' + R1.valid + '** were valid and **' + R1.quarantined + '** were quarantined. The merge **inserted ' + R1.inserted + '** orders (the duplicate collapsed to one), and the gate passed.',
          day2: 'Two files came: the new orders with the status changes (a refund is one of them), and **a replay of the file of day 1**. The merge **inserted ' + R2.inserted + '**, **updated ' + R2.updated + '**, and **left ' + R2.left + ' alone**: the replayed events were not newer. The replay **quarantined the same ' + R2.quarantined + ' dirty lines again**.',
          day3: 'The file had a field that nobody announced (`coupon`): **a warning**, and no loss, because bronze keeps the text. Two amounts were text, so **' + R3.quarantined + ' rows** were quarantined as `bad_type`. An **old event of order 5** arrived late, and the merge **left it alone**.',
          day3_again: 'The same day again: every file is **in the ledger**, so the run did **nothing**. The totals did not move.'
        };
        var kinds = { day1: 'good', day2: 'good', day3: 'warn', day3_again: 'good' };
        var st = A.local.lk || (A.local.lk = { k: 1 }), key = KEYS[st.k], run = RUNS[key], a = G.counts('after_' + key);
        var chip = function (k) { return ['Day 1', 'Day 2', 'Day 3', 'Day 3 again'][k]; };
        var out = '<div class="lab">' + row('Run', chips(KEYS.map(function (x, k) { return k; }), st.k, 'lk-k', chip));
        if (run.nothing_to_do) out += big([['0', 'new files', 'good'], ['0', 'bronze rows of the run', ''], ['nothing to do', 'every file is in the ledger', 'good']]);
        else out += big([[run.files, 'new files'], [n(run.bronze_rows), 'bronze rows of the run'], [run.quarantined, 'quarantined', run.quarantined ? 'warn' : ''], [run.inserted + ' / ' + run.updated + ' / ' + run.left, 'merge: inserted / updated / left alone']]);
        out += big([[n(a.bronze), 'bronze rows in all'], [n(a.silver), 'orders in silver', a.silver === a.silver_distinct ? 'good' : 'bad'], [n(a.quarantine), 'rows in the quarantine'], [n(a.gold), 'rows in gold']]);
        out += pre(G.text('run.' + key).split('\n').slice(1).join('\n'), '');
        out += callout(kinds[key], why[key]);
        out += note(' Real output of `python -m lakehouse.run --day ' + (run.day || 3) + '`: Spark ' + G.meta('pyspark') + ' with Delta Lake ' + G.meta('delta') + '.');
        box.innerHTML = out + '</div>';
        A.bindWidget = function (act, el) { if (act === 'lk-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();
})();
