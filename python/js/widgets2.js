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
        return 'Pick a time zone and a local time. Two of the cases are around a clock change: one local time that does not exist, and one that happens twice. These are the real answers from zoneinfo, with the time zone database version that is printed below. Look at the two UTC moments in each case.';
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
          '<p class="lab-note">Time zone database version ' + esc(String(d.tzdata)) + '. A local time that does not come back to itself after a trip through UTC (a red cell) does not exist.</p></div>';
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

  /* @@END */
})();
