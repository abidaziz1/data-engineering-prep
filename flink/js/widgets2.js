/* Lab widgets for the second half of the Apache Flink course: a checkpoint, a crash and a replay, the state of three kinds of join, parallelism and slots, the key groups that decide which task holds
   a key, and backpressure. Each one registers LAB.W.<kind>. Every number that a lab shows comes from js/real.js, which flink/verify/capture_flink.py wrote after running the real Apache Flink 2.2.1.
   A lab that applies a rule or does arithmetic says so on screen, and flink/verify/check_widgets.js checks the rule against what Flink printed. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var W = (LAB.W = LAB.W || {});
  var esc = LAB.esc, md = LAB.md, G = LAB.get, X = W._h;
  var chips = X.chips, row = X.row, table = X.table, fmtN = X.fmtN, mb = X.mb, big = X.big, bar = X.bar, callout = X.callout, pill = X.pill, rec = X.rec, fixNotes = X.fixNotes, STORES = X.STORES;

  /* ====================== A checkpoint, a crash and a replay ====================== */
  (function () {
    var N = 12;
    function fresh(mode) { return { mode: mode, offset: 0, count: 0, ck: { id: 0, offset: 0, count: 0 }, visible: [], open: [], aborted: [], log: [] }; }
    function act(s, a) {
      if (a === 'process' && s.offset < N) {
        s.offset += 1; s.count += 1;
        if (s.mode === 'alo') s.visible.push(s.offset); else s.open.push(s.offset);
      } else if (a === 'checkpoint') {
        s.ck = { id: s.ck.id + 1, offset: s.offset, count: s.count };
        s.visible = s.visible.concat(s.open); s.open = [];
      } else if (a === 'crash') {
        s.aborted = s.aborted.concat(s.open); s.open = [];
        s.offset = s.ck.offset; s.count = s.ck.count;
      }
      return s;
    }
    function script(mode) {
      var s = fresh(mode), steps = ['process', 'process', 'process', 'process', 'process', 'checkpoint', 'process', 'process', 'process', 'crash'];
      steps.forEach(function (a) { act(s, a); });
      while (s.offset < N) act(s, 'process');
      act(s, 'checkpoint');
      return s;
    }
    function dups(s) { var seen = {}, d = 0; s.visible.forEach(function (x) { if (seen[x]) d++; seen[x] = 1; }); return d; }
    W.checkpointlab = {
      _script: script, _fresh: fresh, _act: act, _dups: dups,
      steps: function () { return 2; },
      hint: 'Press Process a few times, then Checkpoint, then Crash, and watch the sink.',
      say: function (s, i) {
        return [
          'A tiny job: a source with twelve records, a counter, and a sink. **Process** moves one record through. **Checkpoint** saves the source position and the counter, and, for a sink that uses transactions, **commits**. **Crash** throws away the running job and restores the last checkpoint. Try: process 5, checkpoint, process 3, crash, then process to the end. Do it once for each kind of sink.',
          'This is the same experiment on the real thing. A job that copies orders from Kafka to Kafka, one task, a checkpoint every six seconds. I killed the TaskManager that ran it three seconds after a checkpoint, and then counted what a reader sees.'
        ][i];
      },
      mood: function (s, i) { return i ? 'happy' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.cp || (A.local.cp = fresh('alo')), h = '<div class="lab">';
        if (i === 0) {
          h += row('Sink', chips(['alo', 'eo'], st.mode, 'cp-mode', function (m) { return m === 'alo' ? 'at least once (writes at once)' : 'exactly once (transaction)'; }));
          h += '<div class="lab-row"><span class="lab-l">Do</span><button type="button" class="sel-chip" data-act="cp-do" data-v="process"' + (st.offset >= N ? ' disabled' : '') + '>Process a record</button>' +
            '<button type="button" class="sel-chip" data-act="cp-do" data-v="checkpoint">Checkpoint</button><button type="button" class="sel-chip" data-act="cp-do" data-v="crash">Crash</button>' +
            '<button type="button" class="sel-chip" data-act="cp-do" data-v="script">Run the example</button><button type="button" class="sel-chip" data-act="cp-do" data-v="reset">Start again</button></div>';
          h += '<p class="lab-l">Source (Kafka): the arrow is the position</p><div class="strip">' + Array.apply(null, Array(N)).map(function (_, n) { return rec('#' + (n + 1), n < st.offset ? 'right' : 'gap'); }).join('') + '</div>';
          h += '<div class="lab-out">' + big(st.count, 'the counter (state)', 'warn') + big(st.ck.id ? 'record ' + st.ck.offset + ', counter ' + st.ck.count : 'none yet', 'last checkpoint ' + (st.ck.id ? '#' + st.ck.id : ''), 'good') + '</div>';
          h += '<p class="lab-l">What a reader of the sink sees' + (st.mode === 'eo' ? ' (read committed)' : '') + '</p><div class="strip">' + (st.visible.length ? st.visible.map(function (x, n) { return rec('#' + x, st.visible.indexOf(x) < n ? 'wrong' : 'right'); }).join('') : '<span class="lab-note">nothing</span>') + '</div>';
          if (st.mode === 'eo') h += '<p class="lab-l">Waiting in the open transaction</p><div class="strip">' + (st.open.length ? st.open.map(function (x) { return rec('#' + x, 'pick'); }).join('') : '<span class="lab-note">nothing</span>') + '</div>' +
            (st.aborted.length ? '<p class="lab-l">Aborted: written, never visible</p><div class="strip">' + st.aborted.map(function (x) { return rec('#' + x, 'dead'); }).join('') + '</div>' : '');
          var d = dups(st);
          h += '<div class="lab-out">' + big(st.visible.length, 'records the reader sees') + big(d, 'duplicates the reader sees', d ? 'bad' : 'good') + big(st.aborted.length, 'records aborted', st.aborted.length ? 'warn' : '') + '</div>';
          if (st.offset >= N && !st.open.length) h += callout(d ? 'warn' : 'tip', d ? 'The job finished, and the reader sees **' + d + '** record' + (d > 1 ? 's' : '') + ' **twice**: they were written after the checkpoint, then written again by the replay. The counter is right (' + st.count + '), the sink is not.' : 'The job finished, and every record is in the sink **once**. ' + (st.aborted.length ? 'The ' + st.aborted.length + ' records that were written after the checkpoint were in an open transaction, which was aborted, and the replay wrote them again inside a new one.' : 'No crash happened here, so nothing had to be replayed.'));
          else if (st.offset >= N && st.open.length) h += callout('info', 'All records are processed, but they wait in an open transaction. Press **Checkpoint**: only a completed checkpoint commits it.');
          h += '<p class="lab-note">' + pill('Computed') + ' The lab applies the rules of checkpointing: a checkpoint saves the position and the counter, a crash restores them, and an exactly-once sink commits when a checkpoint completes. The next screen shows the real run.</p>';
        } else {
          var eo = G.counts('state.copy_eo'), alo = G.counts('state.copy_alo');
          h += table(['What a reader sees after the kill', 'At least once', 'Exactly once'], [
            ['Orders sent to the source', alo.orders_sent, eo.orders_sent], ['Records a read-committed reader sees', fmtN(alo.records_a_read_committed_reader_sees), fmtN(eo.records_a_read_committed_reader_sees)],
            ['Distinct orders', fmtN(alo.distinct_orders), fmtN(eo.distinct_orders)], ['Duplicates', alo.duplicates, eo.duplicates], ['Missing', alo.missing, eo.missing],
            ['Records of aborted transactions in the log', alo.records_of_aborted_transactions, eo.records_of_aborted_transactions]], function (r, n) { return n === 3 ? 'hit' : ''; });
          h += callout('tip', 'Both jobs restored from checkpoint **' + alo.checkpoint_before_the_kill + '** and lost nothing. The at-least-once sink shows **' + alo.duplicates + '** duplicates: the orders written in the seconds between the checkpoint and the kill. The exactly-once sink shows **none**, and its log holds **' + eo.records_of_aborted_transactions + '** records of an aborted transaction that no read-committed reader sees.');
          h += '<p class="lab-note">' + pill('Recorded', 'real') + ' Two runs of the Flink SQL Kafka connector with <code>sink.delivery-guarantee</code> set to <code>at-least-once</code> and <code>exactly-once</code>, one TaskManager killed with signal 9 in each. The exact counts change from run to run; the pattern does not.</p>';
        }
        box.innerHTML = fixNotes(h + '</div>');
        A.bindWidget = function (a, el) {
          var v = el.getAttribute('data-v');
          if (a === 'cp-mode') A.local.cp = fresh(v);
          else if (a === 'cp-do') {
            if (v === 'reset') A.local.cp = fresh(st.mode);
            else if (v === 'script') { A.local.cp = script(st.mode); }
            else act(st, v);
          }
          A.render(true);
        };
      }
    };
  })();

  /* ====================== The state of three kinds of join ====================== */
  (function () {
    var KINDS = [['regular', 'no time bound'], ['interval', 'interval join, 5 s each way'], ['ttl', 'no bound, time to live 10 s']];
    function series() {
      var t = G.table('joins.state_size').rows;
      return { regular: t.map(function (r) { return r[1]; }), interval: t.map(function (r) { return r[2]; }), ttl: t.map(function (r) { return r[3]; }) };
    }
    W.statelab = {
      _series: series,
      steps: function () { return 1; },
      hint: 'Pick a kind of join and press Next checkpoint to watch its state grow, or not.',
      say: function () { return 'Two streams of 200 orders and payments a second, joined on the order id. This is the **size of the join\'s state** in the first nine checkpoints, one every two seconds, for three versions of the join. Pick one. Then look at what it would be after a day.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.sl || (A.local.sl = { k: 'regular', c: 9, rate: 200 }), ser = series(), cur = ser[st.k], max = Math.max.apply(null, ser.regular), h = '<div class="lab">';
        h += row('Join', chips(KINDS.map(function (x) { return x[0]; }), st.k, 'sl-k', function (k) { return KINDS.filter(function (x) { return x[0] === k; })[0][1]; }));
        h += '<div class="lab-row"><span class="lab-l">Checkpoint</span><button type="button" class="sel-chip" data-act="sl-c" data-v="next"' + (st.c >= cur.length ? ' disabled' : '') + '>Next checkpoint</button><button type="button" class="sel-chip" data-act="sl-c" data-v="all">Show all nine</button><button type="button" class="sel-chip" data-act="sl-c" data-v="reset">Start again</button></div>';
        h += cur.map(function (v, n) { return bar('Checkpoint ' + (n + 1) + ' (' + (2 * (n + 1)) + ' s)', n < st.c ? v : 0, max, n < st.c ? mb(v) : '', st.k === 'regular' ? 'bad' : st.k === 'interval' ? 'good' : 'win'); }).join('');
        var shown = cur.slice(0, st.c), grow = (ser.regular[8] - ser.regular[0]) / 16;
        h += '<div class="lab-out">' + big(shown.length ? mb(shown[shown.length - 1]) : 'none', 'state now', 'warn') + big(st.k === 'regular' ? mb(grow) + ' a second' : 'flat', 'growth of the join state', st.k === 'regular' ? 'bad' : 'good') + '</div>';
        h += row('Rows a second on each side', chips([100, 200, 400], st.rate, 'sl-r', function (v) { return String(v) + (v === 200 ? ' (recorded)' : ''); }));
        var perSec = grow * st.rate / 200, plateau = Math.max.apply(null, ser[st.k]) * st.rate / 200;
        h += table(['After', 'No time bound', 'Interval join', 'Time to live 10 s'], [['1 hour', mb(perSec * 3600), mb(Math.max.apply(null, ser.interval) * st.rate / 200), mb(Math.max.apply(null, ser.ttl) * st.rate / 200)],
          ['1 day', mb(perSec * 86400), mb(Math.max.apply(null, ser.interval) * st.rate / 200), mb(Math.max.apply(null, ser.ttl) * st.rate / 200)]], function (r, n) { return ''; }, function (r, n, c) { return c === 1 ? 'wbad' : c ? 'wgood' : ''; });
        h += callout(st.k === 'regular' ? 'warn' : 'tip', st.k === 'regular' ? 'A join with no time bound must keep **every row it has seen**, because a match could still arrive. At ' + st.rate + ' rows a second on each side, the state grows by about **' + mb(perSec) + ' a second**, and every checkpoint and every recovery has to carry it.' :
          st.k === 'interval' ? 'An interval join knows that a row can only match another row within five seconds, so it can **forget** older rows. The state grows for about six seconds and then stays flat.' :
          'A time to live (<code>table.exec.state.ttl</code>) forgets a row that has not been touched for ten seconds. The state stops growing. The price: a match that arrives after the time to live is **missed**, silently.');
        h += '<p class="lab-note">' + pill('Recorded', 'real') + ' The nine bars are the size of the state of the join, as the REST interface of the JobManager reported it for each checkpoint. ' + pill('Computed') + ' The table scales the recorded rate by the number of rows and extrapolates in a straight line: a real job would change.</p>';
        box.innerHTML = fixNotes(h + '</div>');
        A.bindWidget = function (a, el) {
          var v = el.getAttribute('data-v');
          if (a === 'sl-k') { st.k = v; st.c = 1; }
          else if (a === 'sl-c') st.c = v === 'next' ? Math.min(9, st.c + 1) : v === 'all' ? 9 : 1;
          else if (a === 'sl-r') st.rate = Number(v);
          A.render(true);
        };
      }
    };
  })();

  /* ====================== Parallelism, chaining and slots ====================== */
  (function () {
    function plan(p, chain, tms, slotsPer) {
      var verts = chain ? 2 : 6, tasks = verts * p, total = tms * slotsPer;
      return { verts: verts, tasks: tasks, slotsNeeded: p, total: total, ok: p <= total };
    }
    W.parallelismlab = {
      _plan: plan,
      steps: function () { return 1; },
      hint: 'Change the parallelism, the chaining or the cluster, and see whether the job starts.',
      say: function () { return 'The Brewline query has a source with a filter, and an aggregation with a sink. **Parallelism** says how many copies of each vertex run. **Chaining** glues neighbouring operators into one vertex. A **slot** can hold one task of every vertex, so a job needs as many slots as its highest parallelism. Change the numbers.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.pl || (A.local.pl = { p: 2, chain: 1, tms: 2 }), pl = plan(st.p, st.chain, st.tms, 2), h = '<div class="lab">';
        h += row('Parallelism', chips([1, 2, 3, 4, 5, 6], st.p, 'pl-p'));
        h += row('Operator chaining', chips([1, 0], st.chain, 'pl-c', function (v) { return v ? 'on (the default)' : 'off'; }));
        h += row('TaskManagers, 2 slots each', chips([1, 2, 3], st.tms, 'pl-t', function (v) { return v + (v === 2 ? ' (recorded)' : ''); }));
        h += '<div class="lab-out">' + big(pl.verts, 'vertices in the job graph') + big(pl.tasks, 'tasks (vertices times parallelism)') + big(pl.slotsNeeded + ' of ' + pl.total, 'slots needed of slots in the cluster', pl.ok ? 'good' : 'bad') + '</div>';
        var cols = [];
        for (var t = 0; t < st.tms; t++) {
          var slots = '';
          for (var sl = 0; sl < 2; sl++) {
            var idx = t * 2 + sl, inner;
            if (!pl.ok) inner = '<div class="slot free">no job</div>';
            else if (idx < st.p) inner = '<div class="slot">' + Array.apply(null, Array(pl.verts)).map(function (_, v) { return '<span class="task t' + (v % 4 + 1) + '">v' + (v + 1) + ' ' + (idx + 1) + '/' + st.p + '</span>'; }).join('') + '</div>';
            else inner = '<div class="slot free">free</div>';
            slots += inner;
          }
          cols.push('<div class="slotbox"><b>TaskManager ' + (t + 1) + '</b>' + slots + '</div>');
        }
        h += '<div class="slotgrid">' + cols.join('') + '</div>';
        h += pl.ok ? callout('tip', 'The job starts. It has **' + pl.tasks + '** tasks and uses **' + pl.slotsNeeded + '** slot' + (pl.slotsNeeded > 1 ? 's' : '') + ': in each slot sits one task of every vertex, because tasks of one job share slots. ' + (st.chain ? 'With chaining on, the filter runs in the same thread as the source, with no copy of the records.' : 'With chaining off, every operator is its own vertex: more threads and more hand-overs for the same work.')) :
          callout('warn', 'The job asks for **' + st.p + '** slots and the cluster has **' + pl.total + '**. Flink fails it at once with <code>NoResourceAvailableException: Could not acquire the minimum required resources</code>. Lower the parallelism or add a TaskManager.');
        var R = G.table('world.slots').rows, C = G.table('world.chaining').rows;
        h += '<p class="lab-note">' + pill('Recorded', 'real') + ' Flink ran this job with parallelism ' + R.map(function (r) { return r[0]; }).join(', ') + ' on two TaskManagers: ' + R.map(function (r) { return r[1] + ' tasks used ' + r[2] + ' slot' + (r[2] === 1 ? '' : 's'); }).slice(0, 3).join('; ') + '; and parallelism ' + R[3][0] + ' failed. With chaining off it had ' + C[1][1] + ' vertices instead of ' + C[0][1] + '. ' + pill('Computed') + ' The rest is the rule of slot sharing.</p>';
        box.innerHTML = fixNotes(h + '</div>');
        A.bindWidget = function (a, el) {
          var v = Number(el.getAttribute('data-v'));
          if (a === 'pl-p') st.p = v; else if (a === 'pl-c') st.chain = v; else if (a === 'pl-t') st.tms = v;
          A.render(true);
        };
      }
    };
  })();

  /* ====================== Which task holds a key ====================== */
  (function () {
    var imul = Math.imul;
    function rotl(x, r) { return ((x << r) | (x >>> (32 - r))) | 0; }
    function bitMix(x) { x ^= x >>> 16; x = imul(x, 0x85ebca6b); x ^= x >>> 13; x = imul(x, 0xc2b2ae35); x ^= x >>> 16; return x | 0; }
    /* Flink's MathUtils.murmurHash: the hash of the hash code of a key */
    function murmur(code) {
      code = imul(code, 0xcc9e2d51); code = rotl(code, 15); code = imul(code, 0x1b873593);
      code = rotl(code, 13); code = (imul(code, 5) + 0xe6546b64) | 0;
      code ^= 4; code = bitMix(code);
      if (code >= 0) return code;
      if (code !== -2147483648) return -code;
      return 0;
    }
    /* Java's String.hashCode */
    function javaHash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (imul(h, 31) + s.charCodeAt(i)) | 0; return h; }
    function keyGroup(key, max) { return murmur(javaHash(key)) % max; }
    function task(kg, max, p) { return Math.floor(kg * p / max); }
    W.keygrouplab = {
      _keyGroup: keyGroup, _task: task, _murmur: murmur, _javaHash: javaHash,
      steps: function () { return 1; },
      hint: 'Pick a parallelism and see which task holds each store.',
      say: function () { return 'When a job is keyed by store, Flink must always send the orders of one store to the same task, and be able to move them when you change the parallelism. It does this in two steps. Hash the key into one of **128 key groups**. Then give each task a **range** of key groups. Changing the parallelism only changes the ranges. Pick a parallelism.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.kg || (A.local.kg = { p: 2, key: 's01' }), max = 128, KG = G.table('datastream.key_groups'), OPS = G.table('datastream.orders_per_store').rows, h = '<div class="lab">';
        var perTask = Array.apply(null, Array(st.p)).map(function () { return { stores: [], orders: 0 }; });
        STORES.forEach(function (k) { var t = task(keyGroup(k, max), max, st.p), n = OPS.filter(function (r) { return r[0] === k; })[0][1]; perTask[t].stores.push(k); perTask[t].orders += n; });
        var total = perTask.reduce(function (a, x) { return a + x.orders; }, 0), k = st.key, kg = keyGroup(k, max);
        h += row('Parallelism of the keyed operator', chips([2, 3, 4], st.p, 'kg-p'));
        h += row('Key', chips(STORES, k, 'kg-k'));
        h += table(['Step', 'Value for ' + k], [['1. Java hash code of the string', javaHash(k)], ['2. Flink\'s murmur hash of it', murmur(javaHash(k))], ['3. Key group: the hash modulo 128', kg], ['4. Task: key group times ' + st.p + ' divided by 128, rounded down', task(kg, max, st.p)]]);
        h += '<div class="slotgrid">' + perTask.map(function (x, n) {
          return '<div class="slotbox"><b>Task ' + n + '</b><div class="slot">' + x.stores.map(function (q) { return '<span class="task t' + (n % 4 + 1) + '">' + q + '</span>'; }).join('') + '</div>' + bar('orders', x.orders, total, fmtN(x.orders) + ' of ' + fmtN(total), 'win') + '</div>';
        }).join('') + '</div>';
        var big1 = Math.max.apply(null, perTask.map(function (x) { return x.orders; })), avg = total / st.p;
        h += callout(big1 > avg * 1.25 ? 'warn' : 'tip', 'The busiest task gets **' + fmtN(big1) + '** of the ' + fmtN(total) + ' orders; an even split would be **' + fmtN(Math.round(avg)) + '**. Store s01 sells a third of the orders, so the task that holds it is always the busiest, and a bigger parallelism cannot split one key.');
        var ok = KG.rows.every(function (r) { return keyGroup(r[0], max) === r[1] && task(r[1], max, 2) === r[2] && task(r[1], max, 3) === r[3] && task(r[1], max, 4) === r[4]; });
        h += '<p class="lab-note">' + pill('Recorded', 'real') + ' The key groups and tasks of all twelve stores were read from <code>KeyGroupRangeAssignment</code>, the class of Flink itself, and a running job put each store on the same task. ' + pill('Computed') + ' This lab re-implements the two hashes and ' + (ok ? 'gets the same answer for all twelve stores at 2, 3 and 4.' : 'differs from the recording.') + '</p>';
        box.innerHTML = fixNotes(h + '</div>');
        A.bindWidget = function (a, el) { var v = el.getAttribute('data-v'); if (a === 'kg-p') st.p = Number(v); else if (a === 'kg-k') st.key = v; A.render(true); };
      }
    };
  })();

  /* ====================== Backpressure ====================== */
  (function () {
    var RATES = [['500', 500], ['5000', 5000], ['max', 100000]];
    function model(rate, ms, p) {
      var cap = p * 1000 / ms, thr = Math.min(rate, cap);
      return { cap: cap, thr: thr, srcBlocked: rate > cap ? Math.round((1 - thr / rate) * 1000) : 0, busy: Math.round(thr / cap * 1000), lagPerSec: Math.max(0, rate - thr) };
    }
    W.backpressurelab = {
      _model: model,
      steps: function () { return 1; },
      hint: 'Slow the step down, add tasks, and see where the waiting moves.',
      say: function () { return 'A source reads records, a slow step takes a few milliseconds for each (it calls a service), and a sink takes them. Records can only move as fast as the **slowest** step. The steps in front of it wait, and Flink calls that **backpressure**. Change the speed of the source, the time of the slow step, and the number of tasks it runs on.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.bp || (A.local.bp = { r: 'max', ms: 10, p: 1 }), rate = RATES.filter(function (x) { return x[0] === st.r; })[0][1], m = model(rate, st.ms, st.p), h = '<div class="lab">';
        h += row('Source could read', chips(RATES.map(function (x) { return x[0]; }), st.r, 'bp-r', function (v) { return v === 'max' ? 'as fast as it can' : v + ' records a second'; }));
        h += row('Slow step takes', chips([1, 10, 20], st.ms, 'bp-ms', function (v) { return v + ' ms for each record' + (v === 10 ? ' (recorded)' : ''); }));
        h += row('Tasks for the slow step', chips([1, 2, 4, 8], st.p, 'bp-p', function (v) { return v + (v === 1 || v === 4 ? ' (recorded)' : ''); }));
        h += '<div class="pipe-row"><div class="pipe-box ' + (m.srcBlocked > 500 ? 'hot' : 'idle') + '">Source<small>blocked ' + Math.round(m.srcBlocked / 10) + ' percent</small></div><span class="pipe-arrow">&rarr;</span>' +
          '<div class="pipe-box ' + (m.busy > 900 ? 'busy' : 'idle') + '">Slow step x' + st.p + '<small>busy ' + Math.round(m.busy / 10) + ' percent</small></div><span class="pipe-arrow">&rarr;</span><div class="pipe-box idle">Sink<small>idle</small></div></div>';
        h += bar('Source: blocked by a full output', m.srcBlocked, 1000, Math.round(m.srcBlocked / 10) + ' percent', m.srcBlocked > 500 ? 'bad' : 'good') + bar('Slow step: busy', m.busy, 1000, Math.round(m.busy / 10) + ' percent', m.busy > 900 ? 'warn' : 'good');
        h += '<div class="lab-out">' + big(fmtN(Math.round(m.thr)) + ' a second', 'what the job gets through', 'good') + big(fmtN(Math.round(m.cap)) + ' a second', 'what the slow step can do', 'warn') + big(m.lagPerSec ? fmtN(Math.round(m.lagPerSec)) + ' a second' : 'none', 'lag that the topic gains', m.lagPerSec ? 'bad' : 'good') + '</div>';
        h += callout(m.srcBlocked > 500 ? 'warn' : 'tip', m.srcBlocked > 500 ? 'The slow step can do **' + fmtN(Math.round(m.cap)) + '** records a second and the source offers more, so the buffers in between are full and the source is **blocked** most of the time. Nothing is lost. The topic simply grows a **lag**. The fix is at the slow step, not at the source.' :
          'The slow step can keep up. The source is not blocked and the lag does not grow.');
        var a = G.counts('running.rate_p1'), b = G.counts('running.rate_p4');
        h += '<p class="lab-note">' + pill('Recorded', 'real') + ' With one task Flink got ' + a.records_per_second + ' records a second through a step of 10 ms, and with four tasks ' + b.records_per_second + '. The source was blocked the whole time in both runs. ' + pill('Computed') + ' The other combinations are arithmetic on those; "as fast as it can" is taken as 100,000 a second.</p>';
        box.innerHTML = fixNotes(h + '</div>');
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'bp-r') st.r = v; else if (act === 'bp-ms') st.ms = Number(v); else if (act === 'bp-p') st.p = Number(v); A.render(true); };
      }
    };
  })();

})();
