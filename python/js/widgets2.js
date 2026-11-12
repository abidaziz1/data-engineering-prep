/* Python lab widgets, part 2 (missions 6 and later). The helpers come from widgets.js (LAB.WU).
   The results of the time zone and money labs come from zoneinfo and decimal, recorded by python/verify/capture_py.py. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var W = (LAB.W = LAB.W || {});
  var esc = LAB.esc, md = LAB.md, H = LAB.H, G = LAB.get, WU = LAB.WU;
  var chips = WU.chips, table = WU.table, fmtN = WU.fmtN, bytes = WU.bytes, secs = WU.secs, code = WU.code, bindCodes = WU.bindCodes;

  /* ====================== Mission 6: local times around a clock change ====================== */
  (function () {
    function data() { return G.counts('m6.dst'); }
    function zones() { var z = []; data().cases.forEach(function (c) { if (z.indexOf(c.zone) < 0) z.push(c.zone); }); return z; }
    function dtArgs(local) { var m = /^(\d+)-(\d+)-(\d+) (\d+):(\d+)$/.exec(local); if (!m) throw new Error('bad local time ' + local); return [+m[1], +m[2], +m[3], +m[4], +m[5]].join(', '); }
    function casesOf(zone) { return data().cases.filter(function (c) { return c.zone === zone; }); }
    var MEANING = {
      'exists once': 'An ordinary time. Both readings of `fold` agree, and there is exactly one moment.',
      'does not exist': 'The clocks jumped over this time, so no moment ever had it. Python still accepts the value, and picks one of two readings with `fold`: they are an hour apart (half an hour on Lord Howe Island). A job that stores a wall-clock time like this has stored a guess.',
      'ambiguous': 'The clocks went back, so this wall-clock time happened twice. `fold=0` is the first time it happened and `fold=1` the second. The two moments are an hour apart (half an hour on Lord Howe Island). Without an offset or a `fold`, nobody can tell which one you mean.'
    };
    W.dst = {
      steps: function () { return 1; },
      hint: 'Pick a zone, then a local time. Compare fold 0 and fold 1.',
      say: function () {
        return 'Pick a time zone and a local time. Two of the cases are around a clock change: one local time that does not exist, and one that happens twice. These are the real answers from zoneinfo, with the release of the time zone database printed below. Look at the two UTC moments in each case.';
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var d = data(), st = A.local.dz || (A.local.dz = { zone: 'Europe/London', i: 1 }), list = casesOf(st.zone), c = list[Math.min(st.i, list.length - 1)];
        var ok = c.kind === 'exists once';
        var h = '<div class="lab"><div class="lab-row"><span class="lab-l">Zone</span><div class="sel-chips">' + chips(zones(), st.zone, 'dz-z') + '</div></div>' +
          '<div class="lab-row"><span class="lab-l">Local time</span><div class="sel-chips">' + list.map(function (x, k) { return '<button type="button" class="sel-chip' + (k === st.i ? ' on' : '') + '" data-act="dz-i" data-v="' + k + '">' + esc(x.local) + '</button>'; }).join('') + '</div></div>' +
          code('python', 'python', 'from datetime import datetime, timezone\nfrom zoneinfo import ZoneInfo\n\nlocal = datetime(' + dtArgs(c.local) + ', tzinfo=ZoneInfo("' + c.zone + '"))\nlocal.astimezone(timezone.utc)   # for fold=0 and for fold=1') +
          '<div class="lab-out"><div class="big ' + (ok ? 'good' : c.kind === 'ambiguous' ? 'warn' : 'bad') + '"><b>' + esc(c.kind) + '</b><span>' + esc(c.local) + ' in ' + esc(c.zone) + ' (' + esc(c.label) + ')</span></div></div>' +
          table(['', 'UTC offset', 'The moment in UTC', 'Back to local time'], [['fold = 0', c.fold0.offset, c.fold0.utc, c.fold0.back], ['fold = 1', c.fold1.offset, c.fold1.utc, c.fold1.back]], null, function (r, ri, ci) { return ci === 3 && r[3] !== c.local ? 'wbad' : ''; }) +
          '<div class="callout ' + (ok ? 'good' : 'warn') + '">' + md(MEANING[c.kind]) + '</div>' +
          '<p class="lab-note">Rules from the operating system\'s time zone database, release ' + esc(String(d.database.version)) + '. A local time that does not come back to itself after a trip through UTC (a red cell) does not exist.</p></div>';
        box.innerHTML = h;
        bindCodes(box);
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'dz-z') { st.zone = v; st.i = Math.min(1, casesOf(v).length - 1); } if (act === 'dz-i') st.i = +v; A.render(true); };
      }
    };
    W.dstInfo = { data: data, zones: zones, casesOf: casesOf };
  })();

  /* ====================== Mission 6: money in a float, a Decimal and cents ====================== */
  (function () {
    function data() { return G.counts('m6.money'); }
    W.money = {
      steps: function () { return 2; },
      hint: function (s, i) { return i === 0 ? 'Pick how many times to add 0.10.' : 'Pick a value and read the four ways to round it.'; },
      say: function (s, i) {
        return [
          'Add the price 0.10 many times, with a float, with math.fsum, with a Decimal and with whole cents. The correct total is exactly n divided by 10. These are the real results from Python. Notice when the float stops being right.',
          'Rounding a half is a rule, and the rule differs. Python\'s `round` goes to the even number, on the exact binary value of the float. Decimal lets you choose the rule. These are real results too.'
        ][i];
      },
      mood: function (s, i) { return i === 0 ? 'oops' : 'think'; },
      render: function (box, s, i, A) {
        var d = data(), st = A.local.mn || (A.local.mn = { n: 10, v: '2.675' }), h = '<div class="lab">';
        if (i === 0) {
          var r = d.sums.filter(function (x) { return x.n === st.n; })[0], exact = r.float === (r.n / 10).toString() || +r.float === r.n / 10;
          h += '<div class="lab-row"><span class="lab-l">Additions</span><div class="sel-chips">' + chips(d.sums.map(function (x) { return x.n; }), st.n, 'mn-n', function (k) { return fmtN(+k); }) + '</div></div>' +
            code('python', 'python', 'total = 0.0\nfor _ in range(' + r.n + '):\n    total += 0.10') +
            table(['Method', 'Result', 'Right answer: ' + fmtN(r.n / 10, 1)], [['float, a loop', r.float, +r.float === r.n / 10 ? 'right' : 'off by ' + r.float_error], ['math.fsum', r.fsum, +r.fsum === r.n / 10 ? 'right' : 'off'], ['Decimal("0.10") added', r.decimal, 'right'], ['whole cents, as an integer', r.cents + ' cents', 'right']], function (x, k) { return k === 0 && +r.float !== r.n / 10 ? 'dup' : 'new'; }) +
            '<div class="callout ' + (+r.float === r.n / 10 ? 'tip' : 'warn') + '">' + md(+r.float === r.n / 10 ? 'At this size the float happens to land on the right answer. That is luck: the next size shows the error.' : 'The float loop is off by **' + r.float_error + '**. It is tiny, and it is not zero, so a comparison with `==` fails and a total of a million prices does not match the ledger to the cent.') + '</div></div>';
        } else {
          var vals = d.rounding.map(function (x) { return x.value; }), row = d.rounding.filter(function (x) { return x.value === st.v; })[0];
          h += '<div class="lab-row"><span class="lab-l">Value</span><div class="sel-chips">' + chips(vals, st.v, 'mn-v') + '</div></div>' +
            code('python', 'python', 'round(float("' + row.value + '"), ' + row.places + ')\nDecimal("' + row.value + '").quantize(Decimal(' + (row.places ? '"0.' + '0'.repeat(row.places - 1) + '1"' : '"1"') + '), rounding=...)') +
            table(['Rule', 'Result'], [['Python round() on the float', row.round], ['Decimal, ROUND_HALF_EVEN (to the even digit)', row.half_even], ['Decimal, ROUND_HALF_UP (away from zero)', row.half_up], ['Decimal, ROUND_DOWN (towards zero)', row.down]]) +
            '<div class="callout tip">' + md(row.value === '2.675' || row.value === '1.005' ? 'The float for ' + row.value + ' is a little below it, so `round` gives ' + row.round + ' while the Decimal, which holds the text exactly, gives ' + row.half_up + ' under half-up. Money belongs in `Decimal` or in cents.' : 'Half-even rounds a tie to the even digit, which avoids a bias that half-up adds when you round many values. A finance team will tell you which rule the books use. Write it in the code.') + '</div></div>';
        }
        box.innerHTML = h;
        bindCodes(box);
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'mn-n') st.n = +v; if (act === 'mn-v') st.v = v; A.render(true); };
      }
    };
    W.moneyInfo = { data: data };
  })();

  /* ====================== Mission 7: waiting between retries ====================== */
  (function () {
    function data() { return G.counts('m7.retry'); }
    var CODE = {
      'at once': 'wait = 0',
      'fixed 1 s': 'wait = 1.0',
      'exponential': 'wait = min(8.0, 0.5 * 2 ** (attempt - 1))',
      'exponential with full jitter': 'wait = random.uniform(0, min(8.0, 0.5 * 2 ** (attempt - 1)))'
    };
    function stat(label, value, cls) { return '<div class="big ' + (cls || '') + '"><b>' + esc(String(value)) + '</b><span>' + esc(label) + '</span></div>'; }
    function chart(p) {
      var d = data(), s = d.storm[p], n = Math.max.apply(null, d.policies.map(function (q) { return d.storm[q].per_tenth.length; }));
      var top = Math.max.apply(null, s.per_tenth.map(function (b) { return b[0] + b[1]; })), bars = '';
      for (var k = 0; k < n; k++) {
        var b = s.per_tenth[k] || [0, 0];
        bars += '<span class="rb">' + (b[0] + b[1] ? '<i class="rj" style="height:' + (b[1] / top * 100).toFixed(2) + '%"></i><i class="ok" style="height:' + (b[0] / top * 100).toFixed(2) + '%"></i>' : '') + '</span>';
      }
      return '<div class="rchart" role="img" aria-label="Requests to the service in each 100 ms, for the policy ' + esc(p) + '">' + bars + '</div>' +
        '<div class="raxis"><span>0 s</span><span>each bar is 100 ms, the tallest holds ' + top + ' requests</span><span>' + (n / 10).toFixed(1) + ' s</span></div>' +
        '<div class="rkey"><i class="ok"></i> accepted <i class="rj"></i> answered 429</div>';
    }
    function words(p) {
      var d = data(), s = d.storm[p], f = d.storm['fixed 1 s'];
      if (p === 'at once') return 'Retrying at once sent **' + s.requests + '** requests for **' + s.succeeded + '** successes, and **' + s.gave_up + '** clients gave up after ' + d.setup.attempts + ' tries. All of it happened inside one second, so the service never had a quiet moment.';
      if (p === 'fixed 1 s') return 'Every client waits the same second, so the herd comes back together: up to **' + s.retry_burst + '** retries arrive in the same 100 ms. Everyone is served after **' + s.finished_at + ' s**, with **' + s.requests + '** requests in total.';
      if (p === 'exponential') return 'The waits grow, so the herd comes back less often, but still in lockstep: up to **' + s.retry_burst + '** retries in 100 ms. The last client got through after **' + s.finished_at + ' s**, and the service handled **' + s.requests + '** requests.';
      return 'The retries are spread out: at most **' + s.retry_burst + '** retries in any 100 ms, against **' + f.retry_burst + '** for a fixed wait. The price is **' + s.requests + '** requests in total (a fixed wait needed ' + f.requests + ') and **' + s.finished_at + ' s** to finish.';
    }
    W.retry = {
      steps: function () { return 2; },
      hint: function (s, i) { return i === 0 ? 'Pick a wait policy and how many times the API fails before it works.' : 'Pick a policy. The same fifty clients, the same service.'; },
      say: function (s, i) {
        return [
          'Pick how a client waits between tries, and how many times the API fails before it works. These waits are real results from the retry function of the lesson, run with a fake clock, so nothing really slept.',
          'Now fifty clients start together against a service that accepts ten requests in each second and answers 429 to the rest. This is a simulation: the delay function is the one from the lesson, time is a number and there is no network. Pick a policy and read the bars.'
        ][i];
      },
      mood: function (s, i, A) { var st = A && A.local.rt; return i === 1 && st && st.sp === 'at once' ? 'oops' : 'think'; },
      render: function (box, s, i, A) {
        var d = data(), st = A.local.rt || (A.local.rt = { p: 'exponential with full jitter', k: 3, sp: 'at once' }), h = '<div class="lab">';
        if (i === 0) {
          var r = d.one[st.p][String(st.k)], rows = [], run = 0;
          r.waits.forEach(function (w, n) { run += w; rows.push(['try ' + (n + 1), 'fails with a 503', secs(w), secs(run)]); });
          rows.push(['try ' + (r.waits.length + 1), 'works', '', secs(run)]);
          h += '<div class="lab-row"><span class="lab-l">Policy</span><div class="sel-chips">' + chips(d.policies, st.p, 'rt-p') + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">API fails</span><div class="sel-chips">' + chips([1, 2, 3, 4], st.k, 'rt-k', function (k) { return k + (k === 1 ? ' time' : ' times'); }) + '</div></div>' +
            code('python', 'python', CODE[st.p]) +
            table(['Try', 'Result', 'Wait before the next try', 'Waited in total'], rows, function (x) { return x[1] === 'works' ? 'new' : ''; }) +
            '<div class="lab-out">' + stat('waited in total', secs(r.total), st.p === 'at once' ? 'bad' : 'good') + stat('calls made', r.waits.length + 1, '') + '</div>' +
            '<div class="callout tip">' + md(st.p === 'at once' ? 'No wait at all: the client asks again before the service had any time to recover. Four failures cost four more requests in the same instant.' : st.p === 'exponential with full jitter' ? 'The wait is a random number between 0 and a limit that doubles each time: 0.5, 1, 2, 4 and so on, up to 8 seconds. It is random, so it can be short. Run it with another failure count: the first waits do not change, because the same random numbers are drawn in the same order.' : st.p === 'exponential' ? 'The limit is the wait: 0.5, 1, 2, 4 seconds, up to a cap of 8. Every client that failed at the same moment waits the same time, which is the problem the next step shows.' : 'The same wait every time. Simple, and every client that failed together comes back together.') + '</div>';
        } else {
          var m = d.storm[st.sp];
          h += '<div class="lab-row"><span class="lab-l">Policy</span><div class="sel-chips">' + chips(d.policies, st.sp, 'rt-sp') + '</div></div>' +
            '<div class="lab-out">' + stat('requests sent', m.requests, '') + stat('served', m.succeeded + ' of ' + d.setup.clients, m.succeeded === d.setup.clients ? 'good' : 'bad') + stat('gave up', m.gave_up, m.gave_up ? 'bad' : 'good') + stat('last one served at', m.finished_at + ' s', '') + stat('biggest burst of retries, in 100 ms', m.retry_burst, m.retry_burst > 20 ? 'warn' : 'good') + '</div>' +
            chart(st.sp) +
            '<div class="callout ' + (st.sp === 'at once' ? 'warn' : 'tip') + '">' + md(words(st.sp)) + '</div>' +
            '<p class="lab-note">Simulation: ' + d.setup.clients + ' clients, a service that accepts ' + d.setup.capacity + ' requests in each whole second, ' + d.setup.attempts + ' tries at most. Run once, with a fixed random seed. Backoff and jitter protect a service that is down or recovering. A client that knows the limit does better with a rate limiter than with guesses.</p>';
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'rt-p') st.p = v; if (act === 'rt-k') st.k = +v; if (act === 'rt-sp') st.sp = v; A.render(true); };
      }
    };
    W.retryInfo = { data: data };
  })();

  /* ====================== Mission 7: loading the same day twice ====================== */
  (function () {
    function data() { return G.counts('m7.idem'); }
    function fnSrc(file, name) {
      var L = file.split('\n'), a = -1;
      for (var k = 0; k < L.length; k++) if (L[k].indexOf('def ' + name + '(') === 0) { a = k; break; }
      if (a < 0) throw new Error('no function ' + name + ' in load_strategies.py');
      var b = a + 1; while (b < L.length && L[b] !== '') b++;
      return L.slice(a, b).join('\n').replace(/ {2,}#/, '  #');
    }
    function constLines(file, re) { return file.split('\n').filter(function (l) { return re.test(l); }); }
    var FN = { 'append': 'append', 'insert with a key': 'insert_key', 'delete, then insert': 'delete_insert', 'delete, then insert, in a transaction': 'delete_insert_tx', 'upsert': 'upsert' };
    var WHY = {
      'append': 'A table with no key cannot tell a second copy of an order from the first, so every rerun adds the rows again.',
      'insert with a key': 'The primary key blocks duplicates, and it blocks the rerun too: the job fails on the first row that is already there. Safe from doubling, and unable to repair or correct a day.',
      'delete, then insert': 'The rerun repairs the day, because it deletes the day first. Every statement commits on its own, so a crash in the middle leaves a partial day that a reader can see.',
      'delete, then insert, in a transaction': 'All of it happens, or none of it. A crash rolls back, so a reader never sees a partial day, and a rerun leaves the same table.',
      'upsert': 'Rows are matched by key, so reruns and corrections work. A row that disappeared from the source stays in the target, because nothing deletes it.'
    };
    var SCEN = {
      'run once': 'The job runs once, as planned.',
      'run twice': 'The scheduler retried the job after a timeout, although the first run had finished.',
      'crash, then run again': 'The job dies after it has written 3 rows, and then runs again from the start.',
      'the source corrects O-3': 'A later file has a corrected total for O-3 (8.20 becomes 9.20), and the same day is loaded again.',
      'the source drops O-6': 'A later file no longer has O-6, which was cancelled, and the same day is loaded again.'
    };
    function money(c) { return fmtN(c / 100, 2); }
    W.idem = {
      steps: function () { return 2; },
      hint: function (s, i) { return i === 0 ? 'Pick a way to load and a thing that goes wrong. Read the table at the end.' : 'The whole grid: five ways to load, five things that go wrong.'; },
      say: function (s, i) {
        return [
          'Pick one way to load the day and one thing that goes wrong. Each result is a real run of the functions from the lesson against SQLite. Compare the final table with what the file says.',
          'The whole grid at once. Each cell is the final state of the table. Look for the rows that stay right in every column.'
        ][i];
      },
      mood: function (s, i, A) { var st = A && A.local.id, d = data(); return i === 0 && st && !d.cells[st.s][st.c].right ? 'oops' : 'think'; },
      render: function (box, s, i, A) {
        var d = data(), st = A.local.id || (A.local.id = { s: d.strategies[3], c: d.scenarios[2] }), file = G.file('m7/load_strategies.py'), h = '<div class="lab">';
        if (i === 0) {
          var c = d.cells[st.s][st.c], dupes = {};
          c.final.forEach(function (r) { dupes[r[0]] = (dupes[r[0]] || 0) + 1; });
          var consts = constLines(file, st.s === 'upsert' ? /^(INSERT|UPSERT) = / : /^INSERT = /).join('\n'), src = consts + '\n\n' + fnSrc(file, 'write') + '\n\n' + fnSrc(file, FN[st.s]);
          var runs = c.runs.map(function (r, n) { return ['run ' + (n + 1), r.outcome, r.rows, money(r.cents)]; });
          var crash0 = c.runs[0];
          h += '<div class="lab-row"><span class="lab-l">Load by</span><div class="sel-chips">' + chips(d.strategies, st.s, 'id-s') + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">What happens</span><div class="sel-chips">' + chips(d.scenarios, st.c, 'id-c') + '</div></div>' +
            '<p class="lab-note">' + esc(SCEN[st.c]) + '</p>' +
            code('load_strategies.py', 'python', src) +
            table(['Run', 'What happened', 'Rows after it', 'Total after it'], runs, null, function (r, ri, ci) { return ci === 1 && /^(crashed|failed)/.test(String(r[1])) ? 'wbad' : ''; }) +
            '<div class="lab-out"><div class="big ' + (c.right ? 'good' : 'bad') + '"><b>' + (c.right ? 'right' : 'wrong') + '</b><span>' + c.final.length + ' rows, ' + money(c.final.reduce(function (a, r) { return a + r[1]; }, 0)) + '. The file says ' + c.want_rows + ' rows, ' + money(c.want_cents) + '.</span></div></div>' +
            table(['order_id', 'total'], c.final.map(function (r) { return [r[0], money(r[1])]; }), null, function (r, ri, ci) { return dupes[r[0]] > 1 ? 'wbad' : ''; }) +
            '<div class="callout ' + (c.right ? 'tip' : 'warn') + '">' + md(WHY[st.s] + (st.c === 'crash, then run again' && crash0.rows !== 0 && crash0.rows !== c.want_rows ? ' Right after the crash the table held **' + crash0.rows + '** rows.' : st.c === 'crash, then run again' && st.s === 'delete, then insert, in a transaction' ? ' Right after the crash the table held **' + crash0.rows + '** rows, as it did before the run.' : '')) + '</div>';
        } else {
          var SHORT = { 'run once': 'run once', 'run twice': 'run twice', 'crash, then run again': 'crash, rerun', 'the source corrects O-3': 'O-3 corrected', 'the source drops O-6': 'O-6 dropped' };
          var cols = ['Load by'].concat(d.scenarios.map(function (sc) { return SHORT[sc] || sc; }));
          h += table(cols, d.strategies.map(function (sn) {
            return [sn].concat(d.scenarios.map(function (sc) { var c2 = d.cells[sn][sc]; return (c2.right ? 'right' : 'wrong') + ' (' + c2.final.length + ')'; }));
          }), null, function (r, ri, ci) { return ci === 0 ? '' : /^right/.test(String(r[ci])) ? 'wgood' : 'wbad'; }) +
            '<p class="lab-note">The number in brackets is the number of rows in the final table. The file has 6 rows, and 5 when O-6 is dropped.</p><div class="callout tip">' + md('Read down a column and across a row. **Delete then insert** and **delete then insert in a transaction** end right in every column, **upsert** misses a row that the source dropped, a plain **append** is wrong in four columns, and a **primary key** with a plain INSERT cannot rerun at all. The two delete variants differ in the crash column: after the crash the first left **' + d.cells['delete, then insert']['crash, then run again'].runs[0].rows + '** rows in the table, the second left **' + d.cells['delete, then insert, in a transaction']['crash, then run again'].runs[0].rows + '**, the table as it was.') + '</div>';
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'id-s') st.s = v; if (act === 'id-c') st.c = v; A.render(true); };
      }
    };
    W.idemInfo = { data: data, fnSrc: fnSrc };
  })();

  /* ====================== Mission 8: paging through an API that changes ====================== */
  (function () {
    function data() { return G.counts('m8.paging'); }
    function find(st, sc) { return data().cases.filter(function (c) { return c.style === st && c.scenario === sc; })[0]; }
    var STYLE = { offset: 'offset pages: page=2&per_page=5', cursor: 'cursor pages: after=O-104&limit=5' };
    var HAPPENS = { none: 'Nothing changes while the extract runs.', insert: 'After the first page, 3 new orders arrive.', 'delete': 'After the first page, the 3 newest orders are cancelled and disappear from the listing.' };
    W.paging = {
      steps: function () { return 1; },
      hint: 'Pick a paging style and a change. Look for red and dashed ids.',
      say: function () { return 'Pick how the extract pages, and what happens to the data while it runs. Each result is a real run against the fake API: the first page is read, the data changes, and the rest is read. Red ids were read twice. Dashed ids existed the whole time and were never read.'; },
      mood: function (s, i, A) { var st = A && A.local.pg, c = st && find(st.s, st.c); return c && (c.repeated.length || c.missed.length) ? 'oops' : 'think'; },
      render: function (box, s, i, A) {
        var d = data(), st = A.local.pg || (A.local.pg = { s: 'offset', c: 'insert' }), c = find(st.s, st.c), seen = {}, h = '<div class="lab">';
        h += '<div class="lab-row"><span class="lab-l">Paging</span><div class="sel-chips">' + chips(['offset', 'cursor'], st.s, 'pg-s') + '</div></div>' +
          '<div class="lab-row"><span class="lab-l">While it runs</span><div class="sel-chips">' + chips(['none', 'insert', 'delete'], st.c, 'pg-c', function (k) { return { none: 'nothing changes', insert: '3 orders arrive', 'delete': '3 are cancelled' }[k]; }) + '</div></div>' +
          '<p class="lab-note">' + esc(HAPPENS[st.c]) + ' Request shape: ' + esc(STYLE[st.s]) + '.</p><div class="pgs">';
        c.pages.forEach(function (p, k) {
          h += '<div class="pg"><b>page ' + (k + 1) + '</b>' + p.map(function (id) { var cls = seen[id] ? 'dupe' : c['new'].indexOf(id) >= 0 ? 'new' : ''; seen[id] = true; return '<span class="idc ' + cls + '">' + esc(id) + '</span>'; }).join('') + '</div>';
        });
        h += '</div>' + (c.missed.length ? '<div class="pg"><b>never read</b>' + c.missed.map(function (id) { return '<span class="idc miss">' + esc(id) + '</span>'; }).join('') + '</div>' : '') +
          '<div class="lab-out"><div class="big">' + '<b>' + c.rows + '</b><span>rows read</span></div><div class="big ' + (c.rows === c.unique ? 'good' : 'bad') + '"><b>' + c.repeated.length + '</b><span>read twice</span></div><div class="big ' + (c.missed.length ? 'bad' : 'good') + '"><b>' + c.missed.length + '</b><span>missed</span></div></div>' +
          '<div class="callout ' + (c.repeated.length || c.missed.length ? 'warn' : 'tip') + '">' + md(
            st.s === 'offset' && c.repeated.length ? 'Three new orders went to the top of a newest-first list, so every order moved down by three places. The last three orders of page 1 came back as the first three of page 2: **' + c.repeated.join(', ') + '** were read twice.' :
            st.s === 'offset' && c.missed.length ? 'Three orders disappeared from the top, so every order moved up by three places. Page 2 started three places too late and skipped **' + c.missed.join(', ') + '**. Nobody got an error.' :
            st.s === 'cursor' && c['new'].length ? 'The cursor is the id of the last order that was read, so new orders, which have higher ids, simply come at the end: **' + c['new'].join(', ') + '** are in the result once each.' :
            st.s === 'cursor' ? 'The cursor is where the extract stopped, not a position in a list that can shift. A cancelled order that was already read changes nothing.' : 'With no changes both styles read every order once.') + '</div></div>';
        box.innerHTML = h;
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'pg-s') st.s = v; if (act === 'pg-c') st.c = v; A.render(true); };
      }
    };
    W.pagingInfo = { data: data, find: find };
  })();

  /* ====================== Mission 9: a join that multiplies rows ====================== */
  (function () {
    function data() { return G.counts('m9.fanout'); }
    function find(how, dup) { return data().cases.filter(function (c) { return c.how === how && c.dup === dup; })[0]; }
    var ORDERS = [['O-1', 1, 1250], ['O-2', 2, 475], ['O-3', 2, 820], ['O-4', 3, 1990], ['O-5', 1, 3100], ['O-6', 3, 640], ['O-7', 4, 560]];
    function money(c) { return fmtN(c / 100, 2); }
    W.fanout = {
      steps: function () { return 1; },
      hint: 'Pick the join and the number of extra rows for customer 3. Watch the revenue.',
      say: function () { return 'Seven orders and a customer table with one row for each of customers 1, 2 and 3. Customer 4 has no row. Pick the kind of join, and how many extra rows customer 3 has in the customer table, like a history table with old addresses. These are real results from pandas, Polars and DuckDB, and the three agreed in every case.'; },
      mood: function (s, i, A) { var st = A && A.local.fo, c = st && find(st.h, st.d); return c && c.cents > data().orders.cents ? 'oops' : 'think'; },
      render: function (box, s, i, A) {
        var d = data(), st = A.local.fo || (A.local.fo = { h: 'left', d: 1 }), c = find(st.h, st.d), rows = 0, cents = 0, h = '<div class="lab">';
        h += '<div class="lab-row"><span class="lab-l">Join</span><div class="sel-chips">' + chips(['inner', 'left'], st.h, 'fo-h') + '</div></div>' +
          '<div class="lab-row"><span class="lab-l">Extra rows for customer 3</span><div class="sel-chips">' + chips([0, 1, 2], st.d, 'fo-d') + '</div></div>' +
          code('python', 'python', '# the customer table has ' + (1 + st.d) + ' row' + (st.d ? 's' : '') + ' for customer 3\norders.merge(customers, on="customer_id", how="' + st.h + '")') + '<div class="pgs">';
        ORDERS.forEach(function (o) {
          var times = o[1] === 3 ? 1 + st.d : o[1] === 4 ? (st.h === 'left' ? 1 : 0) : 1;
          rows += times; cents += times * o[2];
          h += '<div class="pg"><b>' + o[0] + '</b><span class="idc">customer ' + o[1] + '</span><span class="idc">' + money(o[2]) + '</span>';
          for (var k = 0; k < times; k++) h += '<span class="idc ' + (k ? 'dupe' : '') + '">' + (k ? 'extra copy' : 'in the result') + '</span>';
          if (!times) h += '<span class="idc miss">dropped: no customer 4</span>';
          h += '</div>';
        });
        if (rows !== c.rows || cents !== c.cents) throw new Error('the per-order view does not match the recording: ' + rows + ' rows and ' + cents + ' against ' + c.rows + ' and ' + c.cents);
        var diff = c.cents - d.orders.cents;
        h += '</div><div class="lab-out"><div class="big"><b>' + d.orders.rows + ' to ' + c.rows + '</b><span>rows</span></div><div class="big ' + (diff ? 'bad' : 'good') + '"><b>' + money(d.orders.cents) + ' to ' + money(c.cents) + '</b><span>revenue' + (diff > 0 ? ', ' + fmtN(diff / d.orders.cents * 100, 1) + ' percent too high' : diff < 0 ? ', ' + money(-diff) + ' lost' : ', unchanged') + '</span></div></div>' +
          '<div class="callout ' + (st.d ? 'warn' : 'tip') + '">' + md(st.d ? 'Customer 3 has ' + (1 + st.d) + ' rows in the customer table, so each of their two orders, O-4 and O-6, appears ' + (1 + st.d) + ' times. Nothing failed, and the revenue is wrong. **validate="m:1"** stops it: pandas raised `' + esc(c.pandas_validate) + '`, and Polars raised `' + esc(c.polars_validate) + '`.' : st.h === 'inner' ? 'The key is unique, so no order is repeated. But an **inner** join dropped O-7, because customer 4 is not in the customer table: the revenue lost ' + money(d.orders.cents - c.cents) + '. A left join keeps it, with an empty city. `validate="m:1"` passes here, since the keys are unique.' : 'The key is unique, so every order appears once and the total is unchanged. A left join keeps O-7 with an empty city. `validate="m:1"` passes without an error.') + '</div></div>';
        box.innerHTML = h;
        bindCodes(box);
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'fo-h') st.h = v; if (act === 'fo-d') st.d = +v; A.render(true); };
      }
    };
    W.fanoutInfo = { data: data, find: find };
  })();

  /* @@END */
})();
