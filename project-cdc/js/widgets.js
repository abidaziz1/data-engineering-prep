/* CDC project lab. It registers LAB.W.runlab with steps, say, render.
   What the lab shows comes from js/real.js: the real project, run against PostgreSQL, Kafka, Debezium, Spark and Delta Lake.
   Text in notes and callouts goes through the formatter: use `code` and **bold**, never HTML tags. A cluster and a schema registry did not run. */
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
    var KEYS = ['snapshot', 'changes', 'replay', 'backlog', 'identity'];
    var NAMES = ['Snapshot', 'Changes', 'Replay of a batch', 'Backlog', 'Identity'];
    return {
      steps: function () { return 1; },
      hint: 'Pick a run and read what each step did.',
      say: function () { return 'Five runs of the same pipeline. Pick one, read what bronze and silver did with the messages of the run, and compare silver with the rows of Postgres.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var RUNS = G.counts('runs');
        var R1 = RUNS.snapshot, R2 = RUNS.changes, R3 = RUNS.replay, R4 = RUNS.backlog, R5 = RUNS.identity;
        var why = {
          snapshot: 'Before the first change, the connector **read the whole table**: **' + R1.new_messages + '** messages with the operation `r`. Silver **inserted ' + R1.inserted + '** orders, and the gate found the same orders in Postgres.',
          changes: 'A day of work in the shop became **' + R2.new_messages + '** messages. The merge **inserted ' + R2.inserted + '** and **updated ' + R2.updated + '**: 30 shipments, 5 deletes that only **mark** the rows, and one order that changed twice and counted once.',
          replay: 'The commit of the last batch was removed, as a crash would leave it, so the **same ' + R3.events + ' events ran again**. The merge **inserted ' + R3.inserted + '**, **updated ' + R3.updated + '** and **left ' + R3.left + ' alone**: nothing changed.',
          backlog: 'The connector was **stopped** and the shop went on: the slot was **released**, and Postgres kept the log. After the restart **' + R4.new_messages + '** events came, and the merge **updated ' + R4.updated + '** orders. Nothing was lost.',
          identity: 'Two updates, one before and one after `REPLICA IDENTITY FULL`. The merge **updated ' + R5.updated + '** orders. The messages differ in what they say about the **row before** the change.'
        };
        var kinds = { snapshot: 'good', changes: 'good', replay: 'good', backlog: 'warn', identity: 'good' };
        var st = A.local.cd || (A.local.cd = { k: 1 }), key = KEYS[st.k], run = RUNS[key], a = G.counts('after_' + key);
        var out = '<div class="lab">' + row('Run', chips(KEYS.map(function (x, k) { return k; }), st.k, 'cd-k', function (k) { return NAMES[k]; }));
        out += big([[n(run.new_messages), 'new messages in bronze'], [n(run.events), 'events applied'], [run.batches, 'micro-batch' + (run.batches === 1 ? '' : 'es')], [run.inserted + ' / ' + run.updated + ' / ' + run.left, 'merge: inserted / updated / left alone']]);
        out += big([[n(a.bronze), 'messages in bronze'], [n(a.silver), 'rows in silver', a.silver === a.silver_distinct ? 'good' : 'bad'], [a.live + ' / ' + a.deleted, 'live / deleted rows'], [n(a.source), 'orders in Postgres', a.live === a.source ? 'good' : 'bad']]);
        out += pre(G.text('run.' + key).split('\n').slice(1).join('\n'), '');
        out += callout(kinds[key], why[key]);
        out += note(' Real output of `' + G.text('run.' + key).split('\n')[0] + '`: Spark ' + G.meta('pyspark') + ' with Delta Lake ' + G.meta('delta') + ', PostgreSQL ' + G.meta('postgres') + ', Kafka ' + G.meta('kafka') + ' and Debezium ' + G.meta('debezium') + '.');
        box.innerHTML = out + '</div>';
        A.bindWidget = function (act, el) { if (act === 'cd-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();
})();
