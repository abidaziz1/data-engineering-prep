/* Python lab widgets. Each one registers LAB.W.<kind> with steps, say, render.
   What a lab shows as a size, a count, a timing or an output comes from js/real.js, recorded by python/verify/capture_py.py
   with Python 3.14 and its libraries on one machine. Timings are medians from that machine and are labelled so.
   Labs that only do arithmetic or apply rules say so on screen. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var W = (LAB.W = LAB.W || {});
  var esc = LAB.esc, md = LAB.md, H = LAB.H, G = LAB.get;

  function chips(list, cur, act, fmt) {
    return list.map(function (k) { return '<button type="button" class="sel-chip' + (String(k) === String(cur) ? ' on' : '') + '" data-act="' + act + '" data-v="' + esc(String(k)) + '">' + esc(fmt ? fmt(k) : String(k)) + '</button>'; }).join('');
  }
  function table(cols, rows, rowCls, cellCls) {
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r, ri) { return '<tr class="' + (rowCls ? rowCls(r, ri) || '' : '') + '">' + r.map(function (c, ci) { return '<td class="' + (cellCls ? cellCls(r, ri, ci) || '' : '') + '">' + md(String(c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function fmtN(x, d) { return (Math.round(x * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function bytes(n) { return n >= 1e9 ? fmtN(n / 1e9, 2) + ' GB' : n >= 1e6 ? fmtN(n / 1e6, 1) + ' MB' : n >= 1e3 ? fmtN(n / 1e3, 1) + ' KB' : fmtN(n) + ' B'; }
  function secs(x) { return x >= 10 ? fmtN(x, 1) + ' s' : x >= 1 ? fmtN(x, 2) + ' s' : x >= 0.001 ? fmtN(x * 1000, 1) + ' ms' : fmtN(x * 1e6, 0) + ' us'; }
  function code(file, lang, text, hl) { return H.code({ file: file, lang: lang, code: text, hl: hl || null }); }
  function bindCodes(box) { box.querySelectorAll('.code').forEach(function (c) { H.bindCode(c, c.textContent); }); }
  LAB.WU = { chips: chips, table: table, fmtN: fmtN, bytes: bytes, secs: secs, code: code, bindCodes: bindCodes };

  /* ====================== Mission 2: version specifiers ====================== */
  (function () {
    var PKGS = ['pandas', 'requests'];
    function data(pkg) { return G.counts('m2.specifiers.' + pkg); }
    var PLAIN = {
      '==': function (v) { return 'exactly ' + v; },
      '!=': function (v) { return 'any version except ' + v; },
      '>=': function (v) { return v + ' or newer, with no upper limit'; },
      '>': function (v) { return 'newer than ' + v; },
      '<=': function (v) { return v + ' or older'; },
      '<': function (v) { return 'older than ' + v; }
    };
    /* the words for one comparison, and for a comma-separated set (a comma means AND) */
    function explain(spec) {
      return spec.split(',').map(function (part) {
        var m = /^(~=|==|!=|>=|<=|>|<)(.+)$/.exec(part);
        if (!m) return part;
        var op = m[1], v = m[2];
        if (op === '~=') {
          var bits = v.split('.'), upper = bits.slice(0, bits.length - 1).join('.');
          return v + ' or newer, but still ' + upper + '.x (the same as >=' + v + ', ==' + upper + '.*)';
        }
        if (op === '==' && /\.\*$/.test(v)) return 'any ' + v.replace(/\.\*$/, '') + '.x release';
        return PLAIN[op](v);
      }).join(', and ');
    }
    W.spec = {
      steps: function () { return 1; },
      hint: 'Pick a package and a specifier. Read which real releases it allows.',
      say: function () {
        return 'These are real releases of two packages, and the specifiers are the kinds that appear in pyproject files. Pick one and read which versions the installer may choose. The matches were computed by the packaging library, which pip and uv use. The release lists are a sample of what PyPI holds.';
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.sp || (A.local.sp = { pkg: 'pandas', i: 4 }), d = data(st.pkg), cur = d.specs[Math.min(st.i, d.specs.length - 1)];
        var n = cur.matches.length, newest = cur.matches.length ? cur.matches[cur.matches.length - 1] : 'none';
        var h = '<div class="lab"><div class="lab-row"><span class="lab-l">Package</span><div class="sel-chips">' + chips(PKGS, st.pkg, 'sp-p') + '</div></div>' +
          '<div class="lab-row"><span class="lab-l">Specifier</span><div class="sel-chips">' + d.specs.map(function (x, k) { return '<button type="button" class="sel-chip' + (k === st.i ? ' on' : '') + '" data-act="sp-s" data-v="' + k + '">' + esc(x.spec) + '</button>'; }).join('') + '</div></div>' +
          code('pyproject.toml', 'text', 'dependencies = [\n    "' + st.pkg + cur.spec + '",\n]') +
          '<div class="lab-out"><div class="big ' + (n ? 'good' : 'bad') + '"><b>' + n + ' of ' + d.versions.length + '</b><span>releases allowed</span></div><div class="big"><b>' + esc(newest) + '</b><span>the version uv or pip would pick</span></div></div>' +
          table(['Release', 'Allowed?'], d.versions.map(function (v) { return [v, cur.matches.indexOf(v) >= 0 ? 'allowed' : 'no']; }), function (r) { return r[1] === 'allowed' ? 'new' : 'old'; }) +
          '<div class="callout tip"><b>In words.</b> ' + esc(explain(cur.spec)) + '.</div></div>';
        box.innerHTML = h;
        bindCodes(box);
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'sp-p') { st.pkg = v; st.i = 0; } if (act === 'sp-s') st.i = +v; A.render(true); };
      }
    };
    W.specInfo = { data: data, pkgs: PKGS, explain: explain };
  })();

  /* ====================== Mission 3: what a membership test costs ====================== */
  (function () {
    var KINDS = ['list', 'set', 'dict'];
    function timing() { return G.counts('m3.lookup'); }
    /* the comparison counts that membership_counts.py printed: "  10000 ids  list:   10000 comparisons   set: 1 comparison, 1 hash call" */
    function counted() {
      return G.text('m3/membership_counts.py').split('\n').map(function (l) {
        var m = /^\s*(\d+) ids\s+list:\s+(\d+) comparisons\s+set: (\d+) comparison, (\d+) hash call/.exec(l);
        if (!m) throw new Error('unexpected line in membership_counts.py output: ' + l);
        return { n: +m[1], list: +m[2], set: +m[3], hash: +m[4] };
      });
    }
    function logw(x, lo, hi) { return Math.max(1, Math.round((Math.log10(x) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)) * 99)); }
    function perLookup(x) { return x >= 1000 ? fmtN(x / 1000, 2) + ' ms' : x >= 1 ? fmtN(x, 1) + ' us' : fmtN(x * 1000, 0) + ' ns'; }
    W.lookup = {
      steps: function () { return 2; },
      hint: function (s, i) { return i === 0 ? 'Count the work first. No clock is involved.' : 'Pick a size. The bars are on a log scale.'; },
      say: function (s, i) {
        return [
          'First the work, counted. A list looks at its items one by one until it finds the one. A set computes a hash and goes straight to the place. These counts come from a class that counts its own comparisons, so they are the same on every machine.',
          'Now the clock. These are microseconds for one membership test, the median of five runs on one machine. The bars use a log scale, because the list and the set differ by five orders of magnitude at a million items.'
        ][i];
      },
      mood: function (s, i) { return i === 0 ? 'think' : 'wow'; },
      render: function (box, s, i, A) {
        var st = A.local.lk || (A.local.lk = { n: 1000000 }), h = '<div class="lab">';
        if (i === 0) {
          var c = counted();
          h += table(['Ids in the container', 'List: comparisons to find the last id', 'Set: comparisons', 'Set: hash calls'], c.map(function (r) { return [fmtN(r.n), fmtN(r.list), r.set, r.hash]; }), function (r, k) { return k === c.length - 1 ? 'trk' : ''; }) +
            '<div class="callout tip">The list needs <b>one comparison for every item</b>, so ten times more ids means ten times more work. The set always needs one hash call and one comparison. In big-O words: list <b>O(n)</b>, set <b>O(1)</b> on average.</div>';
        } else {
          var t = timing(), ix = t.sizes.indexOf(st.n), vals = KINDS.map(function (k) { return t[k][ix]; });
          h += '<div class="lab-row"><span class="lab-l">Ids</span><div class="sel-chips">' + chips(t.sizes, st.n, 'lk-n', function (k) { return fmtN(+k); }) + '</div></div><div class="gantt">' +
            KINDS.map(function (k, j) {
              return '<div class="lane"><span class="lane-n">' + k + '</span><div class="lane-track"><div class="gbar' + (k === 'list' ? ' bad' : '') + '" style="width:' + logw(vals[j], 0.01, 20000) + '%"></div></div><span class="lane-v">' + perLookup(vals[j]) + '</span></div>';
            }).join('') + '</div>' +
            '<div class="lab-out"><div class="big warn"><b>' + fmtN(vals[0] / vals[1], 0) + 'x</b><span>list against set, at ' + fmtN(st.n) + ' ids</span></div><div class="big"><b>' + fmtN(1e6 / vals[1], 0) + '</b><span>set lookups in one second</span></div><div class="big"><b>' + fmtN(1e6 / vals[0], 0) + '</b><span>list lookups in one second</span></div></div>' +
            '<p class="lab-note">Medians of ' + t.runs + ' runs on this machine, ' + t.lookups[String(st.n)].set_dict + ' lookups of random ids for the set and the dict, and ' + t.lookups[String(st.n)].list + ' lookups of the last ids for the list (its slowest case). Your numbers will differ. The ratio is what matters.</p>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'lk-n') { st.n = +el.getAttribute('data-v'); A.render(true); } };
      }
    };
    W.lookupInfo = { counted: counted, timing: timing };
  })();

  /* ====================== Mission 3: memory of 200,000 records ====================== */
  (function () {
    var SIZES = [200000, 1000000, 10000000, 100000000];
    function rows() { return G.table('m3.structs').rows.map(function (r) { return { label: r[0], bytes: r[1], per: r[2], method: r[3] }; }); }
    function scaled(per, n) { return per * n; }
    function gb(x) { return x >= 1e9 ? fmtN(x / 1e9, 1) + ' GB' : fmtN(x / 1e6, 0) + ' MB'; }
    W.structs = {
      steps: function () { return 1; },
      hint: 'Pick a number of records. The first size was recorded. The larger ones multiply it.',
      say: function () {
        return 'The same 200,000 order records, six fields each, held in ten different ways. The sizes at 200,000 records were recorded. The larger sizes just multiply the bytes per record, so read them as an estimate and not as a promise.';
      },
      mood: function () { return 'wow'; },
      render: function (box, s, i, A) {
        var st = A.local.sm || (A.local.sm = { n: 200000 }), data = rows(), maxPer = Math.max.apply(null, data.map(function (r) { return r.per; })), tup = data.filter(function (r) { return /list of tuples/.test(r.label); })[0].per;
        var h = '<div class="lab"><div class="lab-row"><span class="lab-l">Records</span><div class="sel-chips">' + chips(SIZES, st.n, 'sm-n', function (k) { return fmtN(+k) + (+k === 200000 ? ' (recorded)' : ' (estimate)'); }) + '</div></div><div class="gantt">' +
          data.map(function (r) {
            var tot = scaled(r.per, st.n), bad = tot > 16e9;
            return '<div class="lane"><span class="lane-n lane-wide">' + esc(r.label) + '</span><div class="lane-track"><div class="gbar' + (bad ? ' bad' : '') + '" style="width:' + Math.max(1, Math.round(r.per / maxPer * 100)) + '%"></div></div><span class="lane-v">' + gb(tot) + '</span></div>';
          }).join('') + '</div>' +
          table(['Structure', 'Bytes per record', 'Against a tuple', 'Measured with'], data.map(function (r) { return [r.label, fmtN(r.per, 1), fmtN(r.per / tup, 2) + 'x', r.method]; })) +
          '<p class="lab-note">Red bars are over 16 GB, the memory of the machine that recorded them. Python structures were measured with <code>tracemalloc</code>, the libraries with their own size calls, so compare the order of magnitude and not the last digit. The strings were made fresh for every record, like text parsed from a file.</p></div>';
        box.innerHTML = h;
        A.bindWidget = function (act, el) { if (act === 'sm-n') { st.n = +el.getAttribute('data-v'); A.render(true); } };
      }
    };
    W.structsInfo = { rows: rows, sizes: SIZES, scaled: scaled };
  })();

  /* @@END */
})();
