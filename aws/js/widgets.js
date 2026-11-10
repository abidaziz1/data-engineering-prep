/* AWS lab widgets. Each one registers LAB.W.<kind> with steps, say, render.
   What a lab shows as a listing, a signature, a count or a file size comes from js/real.js, recorded with boto3 against moto
   (an AWS emulator), botocore, DuckDB and pyarrow. Nothing in the recording ran on AWS.
   The evaluator, retry and bill labs are arithmetic and rules from the AWS documentation, and they say so. */
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
  function mb(n, d) { return n >= 1e9 ? fmtN(n / 1e9, 2) + ' GB' : n >= 1e6 ? fmtN(n / 1e6, d === undefined ? 1 : d) + ' MB' : n >= 1e3 ? fmtN(n / 1e3, 1) + ' KB' : fmtN(n) + ' B'; }
  function usd(x) { return '$' + (x >= 100 ? fmtN(x, 0) : x >= 1 ? fmtN(x, 2) : x >= 0.01 ? fmtN(x, 3) : x === 0 ? '0' : x.toPrecision(2)); }
  function code(file, lang, text, hl) { return H.code({ file: file, lang: lang, code: text, hl: hl || null }); }
  function bindCodes(box) { box.querySelectorAll('.code').forEach(function (c) { H.bindCode(c, c.textContent); }); }

  /* ====================== S3 listing lab ====================== */
  (function () {
    var PREFIXES = ['', 'raw/', 'raw/orders/', 'raw/orders/dt=2026-03-14/', 'raw/ord', 'curated/', 'raw/orders/dt=2026-03-1'];
    function find(p, d) { return G.counts('s3.listing').filter(function (x) { return x.prefix === p && x.delimiter === d; })[0]; }
    function call(p, d) { return "s3.list_objects_v2(Bucket='brewline-lake'" + (p ? ", Prefix='" + p + "'" : '') + (d ? ", Delimiter='" + d + "'" : '') + ')'; }
    W.listing = {
      steps: function () { return 2; },
      hint: 'Pick a prefix and a delimiter. Read what comes back.',
      say: function (s, i) {
        return [
          'This is a bucket with ten objects, listed with list_objects_v2. S3 has no folders. A key is one long string, and Prefix and Delimiter are rules about strings. Pick a prefix and a delimiter, and read the keys and the common prefixes.',
          'One call returns at most 1,000 keys. Here the page size is 4, so you can see the pages. A real client loops on the continuation token, and the boto3 paginator does that for you.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.ls || (A.local.ls = { p: 'raw/', d: '/' }), h = '<div class="lab">';
        if (i === 0) {
          var r = find(st.p, st.d), note;
          if (st.p === 'raw/ord') note = st.d ? '`raw/ord` is not a folder. It is the start of a string. With `/` as the delimiter, S3 rolls every key that starts with it up to the next `/` into one common prefix: **raw/orders/**.' : 'Without a delimiter S3 returns every key that starts with the string `raw/ord`, however deep.';
          else if (!st.d) note = 'No delimiter, so S3 returns **every key** under the prefix, at any depth. That is a full listing. It is the right call when you want all of them, and the wrong one to find the folders.';
          else if (r.common_prefixes.length) note = 'With `/` as the delimiter, S3 groups deeper keys into **common prefixes**. The console draws these as folders. They are not objects, and they cost nothing to keep.';
          else note = 'Nothing deeper than the next `/` here, so every match is a key.';
          h += '<div class="lab-row"><span class="lab-l">Prefix</span><div class="sel-chips">' + chips(PREFIXES, st.p, 'ls-p', function (k) { return k || '(none)'; }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">Delimiter</span><div class="sel-chips">' + chips(['', '/'], st.d, 'ls-d', function (k) { return k || 'none'; }) + '</div></div>' +
            code('boto3', 'python', call(st.p, st.d)) +
            '<div class="lab-out"><div class="big"><b>' + r.keys.length + '</b><span>keys in Contents</span></div><div class="big"><b>' + r.common_prefixes.length + '</b><span>common prefixes</span></div><div class="big"><b>' + r.key_count + '</b><span>KeyCount</span></div></div>' +
            '<div class="pair"><div><div class="compiled-h">CommonPrefixes</div>' + (r.common_prefixes.length ? '<ul class="keylist">' + r.common_prefixes.map(function (k) { return '<li class="cp">' + esc(k) + '</li>'; }).join('') + '</ul>' : '<p class="lab-note">none</p>') + '</div>' +
            '<div><div class="compiled-h">Contents</div>' + (r.keys.length ? '<ul class="keylist">' + r.keys.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul>' : '<p class="lab-note">none</p>') + '</div></div>' +
            '<div class="callout tip">' + md(note) + '</div>';
        } else {
          var pg = G.counts('s3.pages');
          h += table(['Call', 'Keys in the page', 'IsTruncated', 'Has a next token'], pg.pages.map(function (p, n) { return ['page ' + (n + 1), p.keys.length + ': `' + p.keys[0] + '` ...', String(p.is_truncated), p.has_next_token ? 'yes' : 'no']; }), function (r, n) { return pg.pages[n].is_truncated ? '' : 'new'; }) +
            code('boto3', 'python', "pages = s3.get_paginator('list_objects_v2').paginate(Bucket='brewline-lake', PaginationConfig={'PageSize': 4})\nfor page in pages:\n    print(len(page['Contents']))") +
            '<div class="callout tip">The paginator printed <b>' + pg.paginator_page_sizes.join(', ') + '</b>. The last page has no continuation token and <code>IsTruncated</code> is false. A loop that stops after the first call silently drops the rest of the keys.</div>';
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'ls-p') st.p = v; if (act === 'ls-d') st.d = v; A.render(true); };
      }
    };
    W.listingInfo = { find: find, prefixes: PREFIXES };
  })();

  /* ====================== S3 versioning lab ====================== */
  (function () {
    function steps() { return G.counts('s3.versioning').steps; }
    /* "put_object report.csv "total=100"" and friends, shown as the boto3 call */
    function pyCall(c) {
      var m = /^(\w+) (\S+)(?: "(.*)"| VersionId=(\w+))?$/.exec(c);
      if (!m) throw new Error('unexpected recorded call: ' + c);
      return 's3.' + m[1] + "(Bucket='brewline-lake', Key='" + m[2] + "'" + (m[3] ? ", Body=b'" + m[3] + "'" : '') + (m[4] ? ", VersionId='" + m[4] + "'" : '') + ')';
    }
    W.versions = {
      steps: function () { return 2; },
      hint: 'Step through the calls. Watch the versions and the delete marker.',
      say: function (s, i) {
        return [
          'This bucket has versioning turned on. Step through six calls on one key. After each call, read the stack of versions and what a plain GET returns.',
          'Here is the whole history. Notice that a delete without a version id removed nothing. Only a delete with a version id removes data for good.'
        ][i];
      },
      mood: function (s, i) { return i === 0 ? 'think' : 'happy'; },
      render: function (box, s, i, A) {
        var st = A.local.vr || (A.local.vr = { n: 0 }), list = steps(), h = '<div class="lab">';
        if (i === 0) {
          var cur = list[st.n], stack = [];
          cur.state.delete_markers.forEach(function (d) { stack.push({ id: d.id, kind: 'marker', latest: d.latest }); });
          cur.state.versions.forEach(function (v) { stack.push({ id: v.id, kind: 'version', latest: v.latest }); });
          stack.sort(function (a, b) { return (b.latest ? 1 : 0) - (a.latest ? 1 : 0); });
          h += '<div class="sel-chips">' + chips(list.map(function (x, k) { return k; }), st.n, 'vr-n', function (k) { return 'call ' + (k + 1); }) + '</div>' +
            code('boto3', 'python', pyCall(cur.call)) +
            '<div class="callout tip"><b>What S3 did.</b> ' + esc(cur.result) + '</div>' +
            '<h3 class="lab-h">The stack for report.csv</h3><div class="vstack">' + (stack.length ? stack.map(function (x) { return '<div class="vbox ' + x.kind + (x.latest ? ' cur' : '') + '"><b>' + esc(x.id) + '</b><span>' + (x.kind === 'marker' ? 'delete marker' : 'version') + (x.latest ? ', current' : '') + '</span></div>'; }).join('') : '<p class="lab-note">Nothing is left under this key.</p>') + '</div>' +
            '<div class="lab-out"><div class="big ' + (cur.read.ok ? 'good' : 'bad') + '"><b>' + (cur.read.ok ? esc(cur.read.body) : esc(cur.read.code)) + '</b><span>a plain get_object ' + (cur.read.ok ? 'returns version ' + esc(cur.read.version) : 'answers HTTP ' + cur.read.status) + '</span></div></div>';
        } else {
          h += table(['Call', 'What S3 did', 'A plain GET returns'], list.map(function (x) { return ['`' + x.call + '`', x.result, x.read.ok ? '`' + x.read.body + '`' : '**' + x.read.code + '**']; }), function (r, n) { return list[n].read.ok ? '' : 'dup'; }) +
            '<div class="callout tip">Versions v1 and v2 stayed in the bucket, and were billed, until a call named their version id. Removing the delete marker is how you undelete.</div>';
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) { if (act === 'vr-n') { st.n = +el.getAttribute('data-v'); A.render(true); } };
      }
    };
    W.versionsInfo = { steps: steps };
  })();

  /* ====================== SigV4 signing lab ====================== */
  (function () {
    var PARTS = [
      { k: 'method', name: 'HTTP method', find: function () { return [1, 1]; }, say: 'The first line is the HTTP method.' },
      { k: 'path', name: 'Path', find: function () { return [2, 2]; }, say: 'The second line is the URI path of the object.' },
      { k: 'query', name: 'Query string', find: function () { return [3, 3]; }, say: 'The third line is the query string. It is empty here, so the line is blank.' },
      { k: 'headers', name: 'Signed headers and values', find: function (l) { var a = G.at(l.join('\n'), /^host:/), b = G.at(l.join('\n'), /^x-amz-date:/); return [a, b]; }, say: 'Then one line for each signed header, in order, with lower-case names.' },
      { k: 'signed', name: 'List of signed header names', find: function (l) { var a = G.at(l.join('\n'), /^host;range/); return [a, a]; }, say: 'The list of header names that were signed. A header that is not in this list can change on the way without breaking the signature.' },
      { k: 'payload', name: 'Hash of the body', find: function (l) { return [l.length, l.length]; }, say: 'The last line is the SHA-256 hash of the body. A GET has no body, so it is the hash of nothing.' }
    ];
    function lines() { return G.text('sigv4.canonical_request').split('\n'); }
    W.sigv4 = {
      steps: function () { return 3; },
      hint: 'Pick a part, then follow the chain to the signature.',
      say: function (s, i) {
        return [
          'This is the example from the AWS documentation for a signed GET Object request. botocore built the canonical request below. Pick a part to see which line it is. The signature covers these exact lines.',
          'Now the signature. AWS hashes the canonical request, builds a string to sign, and signs it with a key made from your secret key in four steps. The key never travels. The signature that botocore produced equals the one printed in the documentation.',
          'Change one thing and the whole signature changes. This is why a wrong secret, a clock that is a day off or a different region gives SignatureDoesNotMatch and not a partial match.'
        ][i];
      },
      mood: function (s, i) { return i === 2 ? 'oops' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.sg || (A.local.sg = { part: 'headers', v: 0 }), h = '<div class="lab">', ks = G.counts('sigv4.keys');
        if (i === 0) {
          var l = lines(), cur = PARTS.filter(function (p) { return p.k === st.part; })[0], hl = cur.find(l);
          h += '<div class="sel-chips">' + chips(PARTS.map(function (p) { return p.k; }), st.part, 'sg-p', function (k) { return PARTS.filter(function (p) { return p.k === k; })[0].name; }) + '</div>' +
            code('canonical request', 'text', G.text('sigv4.canonical_request'), hl) +
            '<div class="callout tip">' + md(cur.say) + '</div>' +
            '<p class="lab-note">Request: <code>GET https://examplebucket.s3.amazonaws.com/test.txt</code> with <code>Range: bytes=0-9</code>, region us-east-1, 2013-05-24. The keys are the dummy keys of the documentation.</p>';
        } else if (i === 1) {
          h += '<h3 class="lab-h">String to sign</h3>' + code('string to sign', 'text', G.text('sigv4.string_to_sign')) +
            '<p class="lab-note">The last line is the SHA-256 of the canonical request.</p>' +
            '<h3 class="lab-h">The signing key, from your secret key in four steps</h3>' +
            table(['Step', 'Computed as', 'Result (hex)'], [
              ['kDate', 'HMAC-SHA256("AWS4" + secret key, "20130524")', '`' + ks.kDate.slice(0, 32) + '...`'],
              ['kRegion', 'HMAC-SHA256(kDate, "us-east-1")', '`' + ks.kRegion.slice(0, 32) + '...`'],
              ['kService', 'HMAC-SHA256(kRegion, "s3")', '`' + ks.kService.slice(0, 32) + '...`'],
              ['kSigning', 'HMAC-SHA256(kService, "aws4_request")', '`' + ks.kSigning.slice(0, 32) + '...`']
            ]) +
            '<div class="lab-out"><div class="big good"><b>' + ks.signature.slice(0, 16) + '...</b><span>HMAC-SHA256(kSigning, string to sign)</span></div><div class="big ' + (ks.matches_the_documentation ? 'good' : 'bad') + '"><b>' + (ks.matches_the_documentation ? 'yes' : 'no') + '</b><span>equals the signature in the AWS documentation</span></div><div class="big ' + (ks.recomputed_matches ? 'good' : 'bad') + '"><b>' + (ks.recomputed_matches ? 'yes' : 'no') + '</b><span>equals my own HMAC chain in Python</span></div></div>' +
            code('Authorization header', 'text', G.text('sigv4.authorization'));
        } else {
          var vt = G.table('sigv4.variants'), rows = vt.rows, base = rows[0][2], cur2 = rows[st.v];
          var diff = 0; for (var k = 0; k < base.length; k++) if (base[k] !== cur2[2][k]) diff++;
          h += '<div class="sel-chips">' + chips(rows.map(function (r, n) { return n; }), st.v, 'sg-v', function (n) { return rows[n][0]; }) + '</div>' +
            '<div class="callout tip"><b>What changed.</b> ' + esc(cur2[1]) + '</div>' +
            '<div class="lab-out"><div class="big ' + (cur2[3] === 'yes' ? 'good' : 'bad') + '"><b>' + cur2[2].slice(0, 20) + '...</b><span>signature</span></div><div class="big"><b>' + diff + ' of ' + base.length + '</b><span>characters differ from the documentation signature</span></div></div>' +
            table(['Case', 'Signature', 'Same'], rows.map(function (r) { return [r[0], '`' + r[2].slice(0, 24) + '...`', r[3]]; }), function (r, n) { return n === st.v ? 'trk' : ''; });
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'sg-p') st.part = v; if (act === 'sg-v') st.v = +v; A.render(true); };
      }
    };
    W.sigInfo = { lines: lines, parts: PARTS };
  })();

  /* ====================== IAM evaluator lab ====================== */
  (function () {
    /* The documented rule, for one request. Explicit deny wins, then an organization limit, then a grant.
       A boundary caps what an identity policy can grant. Inside one account an identity policy OR a resource policy can grant.
       Across accounts both must grant. */
    function decide(x) {
      var s = [];
      if (x.idDeny || x.resDeny) { s.push('An explicit deny in the ' + (x.idDeny ? 'identity policy' : 'resource policy') + ' matches. A deny always wins, whatever else allows it.'); return { allowed: false, by: 'explicit deny', steps: s }; }
      s.push('No explicit deny matches.');
      if (x.scp === 'blocks') { s.push('The service control policy of the organization does not allow the action. An SCP never grants anything. It only limits.'); return { allowed: false, by: 'service control policy', steps: s }; }
      if (x.scp === 'allows') s.push('The service control policy allows the action.');
      var idGrant = x.idAllow && x.bnd !== 'blocks';
      if (x.idAllow && x.bnd === 'blocks') s.push('The identity policy allows it, but the permission boundary does not, so that grant does not count.');
      else if (x.bnd === 'allows') s.push('The permission boundary allows the action.');
      var ok;
      if (x.same) {
        ok = idGrant || x.resAllow;
        s.push(ok ? 'Same account: ' + (idGrant && x.resAllow ? 'the identity policy and the resource policy both allow it' : idGrant ? 'the identity policy allows it' : 'the resource policy allows it') + '. One allow is enough.' : 'Same account: no identity policy and no resource policy allows it.');
      } else {
        ok = idGrant && x.resAllow;
        s.push(ok ? 'Different accounts: the identity policy in the caller\'s account and the resource policy in the bucket\'s account both allow it. Both are needed.' : 'Different accounts: both sides must allow it, and ' + (!idGrant ? 'the caller\'s identity policy does not' : 'the resource policy does not') + '.');
      }
      return { allowed: ok, by: ok ? 'an allow' : 'implicit deny', steps: s };
    }
    var CARDS = [
      { k: 'a', name: 'Identity policy allows, same account', x: { idAllow: true, idDeny: false, resAllow: false, resDeny: false, scp: 'none', bnd: 'none', same: true }, want: true },
      { k: 'b', name: 'Only the bucket policy allows, same account', x: { idAllow: false, idDeny: false, resAllow: true, resDeny: false, scp: 'none', bnd: 'none', same: true }, want: true },
      { k: 'c', name: 'Identity policy allows, other account, no bucket policy', x: { idAllow: true, idDeny: false, resAllow: false, resDeny: false, scp: 'none', bnd: 'none', same: false }, want: false },
      { k: 'd', name: 'Both sides allow, other account', x: { idAllow: true, idDeny: false, resAllow: true, resDeny: false, scp: 'none', bnd: 'none', same: false }, want: true },
      { k: 'e', name: 'Identity policy allows, an SCP blocks', x: { idAllow: true, idDeny: false, resAllow: false, resDeny: false, scp: 'blocks', bnd: 'none', same: true }, want: false },
      { k: 'f', name: 'Identity policy allows, the boundary does not', x: { idAllow: true, idDeny: false, resAllow: false, resDeny: false, scp: 'none', bnd: 'blocks', same: true }, want: false },
      { k: 'g', name: 'Identity policy allows, the bucket policy denies', x: { idAllow: true, idDeny: false, resAllow: false, resDeny: true, scp: 'none', bnd: 'none', same: true }, want: false }
    ];
    /* the ten requests that the emulator answered, as layers: the only layers in play were identity allows and denies */
    var TRUTH_LAYERS = [
      { idAllow: true, idDeny: false }, { idAllow: false, idDeny: false }, { idAllow: false, idDeny: false }, { idAllow: true, idDeny: true }, { idAllow: true, idDeny: false },
      { idAllow: false, idDeny: false }, { idAllow: false, idDeny: false }, { idAllow: false, idDeny: false }, { idAllow: true, idDeny: false }, { idAllow: false, idDeny: false }
    ];
    function truthLayers(n) { var t = TRUTH_LAYERS[n]; return { idAllow: t.idAllow, idDeny: t.idDeny, resAllow: false, resDeny: false, scp: 'none', bnd: 'none', same: true }; }
    W.evaluator = {
      steps: function () { return 3; },
      hint: 'Predict the answer, then read the reason.',
      say: function (s, i) {
        return [
          'Ten real requests, answered with IAM policies by the emulator. Look at the request, predict allow or deny, then click the answer. The reasons are the rules you will be asked about.',
          'Now the layers that the emulator cannot show. Switch the policies on and off, and watch which rule decides. This follows the evaluation logic in the AWS documentation. The first match on the list wins: explicit deny, then limits, then grants.',
          'Do the same ten requests through the rule. It gives the same answer as the emulator every time, because these ten use only identity policies. The lab then shows the verdict for the layered cases.'
        ][i];
      },
      mood: function (s, i) { return i === 0 ? 'think' : 'happy'; },
      render: function (box, s, i, A) {
        var st = A.local.ev || (A.local.ev = { n: 0, guess: {}, x: { idAllow: true, idDeny: false, resAllow: false, resDeny: false, scp: 'none', bnd: 'none', same: true }, card: '' }), h = '<div class="lab">';
        var rows = G.counts('iam.truth').rows;
        if (i === 0) {
          var r = rows[st.n], g = st.guess[st.n], pol = {
            'analyst': 'Policies: ReadCurated (allow s3:GetObject on curated/*, allow s3:ListBucket on the bucket) and NoSecrets (deny s3:GetObject on curated/orders/secret/*).',
            'analyst-wrong-arns': 'Policy: allow s3:GetObject on the bucket ARN `arn:aws:s3:::brewline-lake`, and allow s3:ListBucket on the object ARN `arn:aws:s3:::brewline-lake/*`.',
            'role raw-reader': 'The role permission policy allows s3:GetObject on raw/*. The caller uses the temporary keys from AssumeRole.'
          }[r.who];
          h += '<div class="sel-chips">' + chips(rows.map(function (x, k) { return k; }), st.n, 'ev-n', function (k) { return 'request ' + (k + 1) + (st.guess[k] ? (st.guess[k] === rows[k].result ? ' (right)' : ' (wrong)') : ''); }) + '</div>' +
            '<div class="callout tip"><b>Caller:</b> ' + esc(r.who) + '<br><b>Action:</b> <code>' + esc(r.action) + '</code> on ' + esc(r.resource) + '<br>' + md(pol) + '</div>' +
            '<div class="sel-chips"><button type="button" class="sel-chip' + (g === 'allow' ? ' on' : '') + '" data-act="ev-g" data-v="allow">Allow</button><button type="button" class="sel-chip' + (g === 'deny' ? ' on' : '') + '" data-act="ev-g" data-v="deny">Deny</button></div>';
          if (g) h += '<div class="callout ' + (g === r.result ? 'good' : 'warn') + '"><b>' + (g === r.result ? 'Right.' : 'The answer was ' + esc(r.result) + '.') + '</b> The call returned ' + (r.result === 'allow' ? 'HTTP 200' : '<code>' + esc(r.code) + '</code>, HTTP ' + r.status) + '. ' + esc(r.why) + '.</div>';
          var done = Object.keys(st.guess).length, right = Object.keys(st.guess).filter(function (k) { return st.guess[k] === rows[k].result; }).length;
          h += '<p class="lab-note">Answered ' + done + ' of ' + rows.length + ', right ' + right + '.</p>';
        } else if (i === 1) {
          var x = st.x, d = decide(x);
          function tog(k, label) { return '<button type="button" class="sel-chip' + (x[k] ? ' on' : '') + '" data-act="ev-t" data-v="' + k + '">' + esc(label) + ': ' + (x[k] ? 'yes' : 'no') + '</button>'; }
          function tri(k, label) { return '<div class="lab-row"><span class="lab-l">' + esc(label) + '</span><div class="sel-chips">' + chips(['none', 'allows', 'blocks'], x[k], 'ev-' + k, function (v) { return v === 'none' ? 'not in play' : v; }) + '</div></div>'; }
          h += '<div class="sel-chips">' + CARDS.map(function (c) { return '<button type="button" class="sel-chip' + (st.card === c.k ? ' on' : '') + '" data-act="ev-card" data-v="' + c.k + '">' + esc(c.name) + '</button>'; }).join('') + '</div>' +
            '<div class="lab-row"><span class="lab-l">Where</span><div class="sel-chips">' + chips([1, 0], x.same ? 1 : 0, 'ev-same', function (v) { return +v ? 'caller and bucket in the same account' : 'caller in another account'; }) + '</div></div>' +
            '<div class="sel-chips">' + tog('idAllow', 'Identity policy allows') + tog('idDeny', 'Identity policy denies') + tog('resAllow', 'Bucket policy allows') + tog('resDeny', 'Bucket policy denies') + '</div>' +
            tri('scp', 'Service control policy') + tri('bnd', 'Permission boundary') +
            '<div class="lab-out"><div class="big ' + (d.allowed ? 'good' : 'bad') + '"><b>' + (d.allowed ? 'Allow' : 'Deny') + '</b><span>decided by: ' + esc(d.by) + '</span></div></div>' +
            '<ol class="why">' + d.steps.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol>' +
            '<p class="lab-note">Worked out from the AWS evaluation logic. Corner cases, such as a resource policy that names a user ARN next to a boundary, are in the documentation.</p>';
        } else {
          h += table(['Caller', 'Action', 'Emulator', 'The rule says'], rows.map(function (r, n) { var d2 = decide(truthLayers(n)); return [r.who, '`' + r.action + '` on ' + r.resource, r.result, d2.allowed ? 'allow' : 'deny']; }), function (r) { return r[2] === r[3] ? 'new' : 'dup'; }) +
            '<div class="callout tip">All ten agree. Across accounts, with a service control policy or with a boundary in play, the rule is the one in the documentation, and the emulator cannot confirm it.</div>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'ev-n') st.n = +v;
          if (act === 'ev-g') st.guess[st.n] = v;
          if (act === 'ev-t') st.x[v] = !st.x[v];
          if (act === 'ev-scp') st.x.scp = v;
          if (act === 'ev-bnd') st.x.bnd = v;
          if (act === 'ev-same') st.x.same = !!+v;
          if (act === 'ev-card') { st.card = v; st.x = JSON.parse(JSON.stringify(CARDS.filter(function (c) { return c.k === v; })[0].x)); }
          A.render(true);
        };
      }
    };
    W.evaluatorInfo = { decide: decide, cards: CARDS, truthLayers: truthLayers };
  })();

  /* ====================== Kinesis: which shard ====================== */
  (function () {
    var COLORS = ['#BFDBFE', '#FDE68A', '#BBF7D0', '#FBCFE8', '#DDD6FE', '#FED7AA'];
    function skewBars(per, mean, maxv) {
      return Object.keys(per).sort().map(function (id, k) {
        var n = per[id];
        return '<div class="lane"><span class="lane-n">shard ' + k + '</span><div class="lane-track"><div class="gbar ' + (n === maxv ? 'bad' : '') + '" style="left:0;width:' + Math.max(1, Math.round(n / maxv * 100)) + '%"></div></div><span class="lane-v">' + fmtN(n) + '</span></div>';
      }).join('');
    }
    W.kinesis = {
      steps: function () { return 3; },
      hint: 'Pick a key and see the shard. Then see what a popular key does.',
      say: function (s, i) {
        return [
          'Kinesis takes the MD5 hash of the partition key, reads it as one big number, and sends the record to the shard whose hash range holds it. This stream has 4 shards that split the number line into four equal parts. Pick a key and see where it lands. The emulator and the documented rule gave the same shard for every key.',
          'The hash spreads keys, not records. If one customer sends a large share of the events, its shard takes that share. Here are 20,000 events from 500 customers, where a few customers send most of them. Compare the key as it is with a salted key.',
          'When one shard is too busy you split it. The parent closes and two children take its range. Old records stay in the parent until retention ends, so a consumer must read the parent first to keep the order.'
        ][i];
      },
      mood: function (s, i) { return i === 1 ? 'oops' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.kn || (A.local.kn = { key: 'C-0001', salt: false }), h = '<div class="lab">';
        var sh = G.counts('kinesis.shards'), map = G.counts('kinesis.mapping').rows, sk = G.counts('kinesis.skew');
        if (i === 0) {
          var r = map.filter(function (x) { return x.key === st.key; })[0], idx = sh.shards.map(function (x) { return x.id; }).indexOf(r.shard);
          h += '<div class="sel-chips">' + chips(map.map(function (x) { return x.key; }), st.key, 'kn-k') + '</div>' +
            '<div class="ring">' + sh.shards.map(function (x, k) { return '<div class="rseg" style="width:' + (x.share_of_the_ring * 100) + '%;background:' + COLORS[k] + '"><b>shard ' + k + '</b></div>'; }).join('') + '<div class="rmark" style="left:' + (r.ring_position * 100) + '%"></div></div>' +
            '<div class="lab-out"><div class="big"><b>' + esc(r.key) + '</b><span>partition key</span></div><div class="big"><b>' + r.md5.slice(0, 12) + '...</b><span>MD5 of the key</span></div><div class="big"><b>' + fmtN(r.ring_position * 100, 1) + ' %</b><span>of the way along the hash range</span></div><div class="big good"><b>shard ' + idx + '</b><span>' + esc(r.shard) + '</span></div></div>' +
            code('boto3', 'python', "k.put_record(StreamName='orders', Data=data, PartitionKey='" + r.key + "')  # -> ShardId '" + r.shard + "'") +
            '<p class="lab-note">Each shard owns a quarter of the range 0 to 2^128 - 1. The first five customers all land in shard 2. That is what MD5 gives for these ids, and it is why the next step is lopsided.</p>';
        } else if (i === 1) {
          var per = st.salt ? sk.salted_8 : sk.by_key, mx = Math.max.apply(null, Object.keys(per).map(function (k) { return per[k]; })), ratio = st.salt ? sk.salted_ratio : sk.by_key_ratio;
          h += '<div class="sel-chips">' + chips([0, 1], st.salt ? 1 : 0, 'kn-s', function (v) { return +v ? 'salted: customer id + a number from 0 to 7' : 'the customer id as it is'; }) + '</div>' +
            '<div class="lab-out"><div class="big ' + (ratio > 1.5 ? 'bad' : 'good') + '"><b>' + ratio.toFixed(2) + 'x</b><span>the busiest shard against the average of ' + fmtN(sk.mean_per_shard) + '</span></div><div class="big"><b>' + esc(sk.busiest_customer) + '</b><span>sent ' + fmtN(sk.busiest_customer_events) + ' of ' + fmtN(sk.events) + ' events (' + fmtN(sk.busiest_customer_events / sk.events * 100, 1) + ' %)</span></div></div>' +
            '<h3 class="lab-h">Events in each shard</h3><div class="gantt">' + skewBars(per, sk.mean_per_shard, mx) + '</div>' +
            '<div class="callout ' + (st.salt ? 'tip' : 'warn') + '">' + (st.salt ? 'A salt spreads one customer over 8 keys, so the shards share the load. The price: events of one customer no longer sit in one shard, so their order is no longer guaranteed across the 8 keys.' : 'The busiest shard takes almost half of the events. It reaches its 1 MB per second write limit first, and producers see throttling while the other shards sit idle.') + '</div>';
        } else {
          var sp = G.counts('kinesis.split');
          h += '<p class="lab-note">Split <b>' + esc(sp.split) + '</b>, the busiest shard, in the middle of its hash range.</p>' +
            '<div class="pair"><div><div class="compiled-h">Before</div>' + table(['Shard', 'Parent', 'State', 'Share of the range'], sp.before.map(function (x) { return [x.id.replace('shardId-', ''), x.parent ? x.parent.replace('shardId-', '') : '', x.state, fmtN(x.share_of_the_ring * 100, 1) + ' %']; }), function (r) { return r[2] === 'closed' ? 'old' : ''; }) + '</div>' +
            '<div><div class="compiled-h">After</div>' + table(['Shard', 'Parent', 'State', 'Share of the range'], sp.after.map(function (x) { return [x.id.replace('shardId-', ''), x.parent ? x.parent.replace('shardId-', '') : '', x.state, fmtN(x.share_of_the_ring * 100, 1) + ' %']; }), function (r) { return r[2] === 'closed' ? 'old' : r[1] ? 'new' : ''; }) + '</div></div>' +
            '<div class="callout tip">The parent is <b>closed</b>, not deleted. Two children, each with half of the parent\'s range, take the new records. A split fixes a shard that is too busy. It does not fix one customer that sends more than a shard can take, which is what a salt is for.</div>';
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'kn-k') st.key = v; if (act === 'kn-s') st.salt = !!+v; A.render(true); };
      }
    };
  })();

  /* ====================== Athena: what a query reads ====================== */
  (function () {
    var MIN = 10e6, RATE = 5.0, TB = 1e12;      /* decimal units: 1 MB = 1,000,000 bytes, 1 TB = 10^12 bytes. Athena's own units may differ by a few percent */
    function billed(bytes) { return Math.max(MIN, Math.ceil(bytes / 1e6) * 1e6); }
    function cost(bytes, scale) { return billed(bytes * scale) / TB * RATE; }
    W.scan = {
      steps: function () { return 3; },
      hint: 'Pick a query and a layout. Read the bytes and the price.',
      say: function (s, i) {
        return [
          'The same 2 million orders, written five ways with DuckDB. For each query I worked out which bytes Athena has to read, from the real file sizes and the Parquet footers. Pick a query and a layout. The price is the documented example: $5 per terabyte, with a 10 MB minimum for each query.',
          'Here are all five queries on all five layouts. The best layout depends on the question. Change the scale to pretend the table is bigger. The ratios hold, and the 10 MB minimum stops mattering.',
          'Why does SELECT * hurt so much on Parquet? Each column is stored on its own. Athena reads only the columns your query names. Pick columns and watch the bytes.'
        ][i];
      },
      mood: function (s, i) { return i === 2 ? 'think' : 'happy'; },
      render: function (box, s, i, A) {
        var st = A.local.sc || (A.local.sc = { q: 'q2', l: 'parquet_by_day', scale: 1, cols: ['total_usd', 'order_date'] }), h = '<div class="lab">';
        var sc = G.counts('athena.scan'), sizes = G.counts('athena.sizes'), pc = G.counts('athena.parquet_columns');
        function q(id) { return sc.queries.filter(function (x) { return x.id === id; })[0]; }
        function lay(k) { return sc.layouts.filter(function (x) { return x.k === k; })[0]; }
        if (i === 0) {
          var cq = q(st.q), b = cq.bytes[st.l] * st.scale, bb = billed(b), best = Math.min.apply(null, sc.layouts.map(function (x) { return cq.bytes[x.k]; })), worst = Math.max.apply(null, sc.layouts.map(function (x) { return cq.bytes[x.k]; }));
          h += '<div class="lab-row"><span class="lab-l">Query</span><div class="sel-chips">' + chips(sc.queries.map(function (x) { return x.id; }), st.q, 'sc-q', function (k) { return k + ': ' + q(k).title; }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">Layout</span><div class="sel-chips">' + chips(sc.layouts.map(function (x) { return x.k; }), st.l, 'sc-l', function (k) { return lay(k).name; }) + '</div></div>' +
            code('Athena SQL', 'sql', cq.sql) +
            '<p class="lab-note">The query needs ' + esc(cq.needs) + '.</p>' +
            '<div class="lab-out"><div class="big"><b>' + mb(b) + '</b><span>bytes to read</span></div><div class="big ' + (bb > b ? 'warn' : '') + '"><b>' + mb(bb, 0) + '</b><span>billed' + (bb > b ? ' (the 10 MB minimum)' : '') + '</span></div><div class="big ' + (cost(cq.bytes[st.l], st.scale) <= cost(best, st.scale) * 1.0001 ? 'good' : cost(cq.bytes[st.l], st.scale) > cost(best, st.scale) * 20 ? 'bad' : 'warn') + '"><b>' + usd(cost(cq.bytes[st.l], st.scale)) + '</b><span>for one run</span></div><div class="big"><b>' + fmtN(cq.bytes[st.l] / best, 0) + 'x</b><span>the cheapest layout for this query</span></div></div>' +
            '<div class="gantt">' + sc.layouts.map(function (x) { var v = cq.bytes[x.k]; return '<div class="lane"><span class="lane-n lane-wide">' + esc(x.name) + '</span><div class="lane-track"><div class="gbar ' + (x.k === st.l ? 'sel' : '') + '" style="left:0;width:' + Math.max(0.6, Math.round(Math.log10(Math.max(v, 1e4) / 1e4) / Math.log10(worst / 1e4) * 100)) + '%"></div></div><span class="lane-v">' + mb(v) + '</span></div>'; }).join('') + '</div>' +
            '<p class="lab-note">The bars use a log scale, because the layouts differ by more than a hundred times.</p>';
        } else if (i === 1) {
          h += '<div class="lab-row"><span class="lab-l">Scale</span><div class="sel-chips">' + chips([1, 1000, 100000], st.scale, 'sc-x', function (k) { return +k === 1 ? 'this table (2 million rows)' : 'a table ' + fmtN(+k) + ' times bigger'; }) + '</div></div>' +
            table(['Query'].concat(sc.layouts.map(function (x) { return x.name; })), sc.queries.map(function (x) { return [x.id + ': ' + x.title].concat(sc.layouts.map(function (l) { return mb(x.bytes[l.k] * st.scale) + ' (' + usd(cost(x.bytes[l.k], st.scale)) + ')'; })); }),
              null, function (r, ri, ci) { if (ci === 0) return ''; var qq = sc.queries[ri], mn = Math.min.apply(null, sc.layouts.map(function (l) { return qq.bytes[l.k]; })); return qq.bytes[sc.layouts[ci - 1].k] === mn ? 'wgood' : ''; }) +
            '<div class="callout tip">Green is the cheapest layout for each question. Compare the two Parquet layouts: <b>q2</b> (one day) is cheapest with a folder for each day, while <b>q3</b> (31 days) is cheaper in one sorted file, because the daily files are small and each one repeats a footer and a dictionary. At this size each daily Parquet file is only <b>' + mb(sizes.avg_day_parquet_bytes) + '</b>. At a scale of 1,000 it is <b>' + mb(sizes.avg_day_parquet_bytes * 1000, 0) + '</b>, which is a good size.</div>';
        } else {
          var all = Object.keys(pc.bytes_by_column), sel = st.cols, foot = sizes.parquet_footer_bytes;
          var tot = sel.reduce(function (a, c) { return a + pc.bytes_by_column[c]; }, 0), full = all.reduce(function (a, c) { return a + pc.bytes_by_column[c]; }, 0), mxc = Math.max.apply(null, all.map(function (c) { return pc.bytes_by_column[c]; }));
          h += '<div class="sel-chips">' + all.map(function (c) { return '<button type="button" class="sel-chip' + (sel.indexOf(c) >= 0 ? ' on' : '') + '" data-act="sc-c" data-v="' + c + '">' + esc(c) + '</button>'; }).join('') + '<button type="button" class="sel-chip" data-act="sc-all" data-v="all">SELECT *</button></div>' +
            '<div class="lab-out"><div class="big"><b>' + sel.length + ' of ' + all.length + '</b><span>columns read</span></div><div class="big good"><b>' + mb(tot + foot) + '</b><span>bytes read from the one Parquet file (all ' + sizes.parquet_row_groups + ' row groups)</span></div><div class="big"><b>' + fmtN((tot + foot) / (full + foot) * 100, 1) + ' %</b><span>of what SELECT * reads</span></div></div>' +
            '<div class="gantt">' + all.map(function (c) { return '<div class="lane"><span class="lane-n lane-wide">' + esc(c) + '</span><div class="lane-track"><div class="gbar ' + (sel.indexOf(c) >= 0 ? 'sel' : 'off') + '" style="left:0;width:' + Math.max(0.6, Math.round(pc.bytes_by_column[c] / mxc * 100)) + '%"></div></div><span class="lane-v">' + mb(pc.bytes_by_column[c], 2) + '</span></div>'; }).join('') + '</div>' +
            '<p class="lab-note">Sizes are the compressed column chunks in the Parquet file. A text column with many different values, such as order_id, costs far more than one with few, such as status. A CSV file has no such choice: it always reads all ' + sizes.csv_columns + ' columns.</p>';
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'sc-q') st.q = v; if (act === 'sc-l') st.l = v; if (act === 'sc-x') st.scale = +v;
          if (act === 'sc-c') { var k = st.cols.indexOf(v); if (k >= 0) st.cols.splice(k, 1); else st.cols.push(v); if (!st.cols.length) st.cols = [v]; }
          if (act === 'sc-all') st.cols = Object.keys(G.counts('athena.parquet_columns').bytes_by_column);
          A.render(true);
        };
      }
    };
    W.scanInfo = { billed: billed, cost: cost, min: MIN, rate: RATE, tb: TB };
  })();

  /* ====================== SQS: visibility timeout and the dead-letter queue ====================== */
  (function () {
    var WHERE = ['flight', 'flight', 'flight', 'dlq'];
    W.sqs = {
      steps: function () { return 2; },
      hint: 'Step through the timeline. Find the message.',
      say: function (s, i) {
        return [
          'One message, a visibility timeout of 2 seconds and a dead-letter rule of 2 receives. A worker takes the message and crashes without deleting it. Step through what the queue does. This is a real run against the emulator, and it follows the documented behaviour.',
          'Two more things you will meet. A FIFO queue drops a message that repeats a deduplication id, and an SNS topic copies one message to every subscriber, unless a filter policy says otherwise.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.sq || (A.local.sq = { n: 0 }), h = '<div class="lab">', rd = G.counts('sqs.redrive');
        if (i === 0) {
          var tl = rd.timeline, e = tl[st.n], where = WHERE[st.n];
          h += '<div class="sel-chips">' + chips(tl.map(function (x, k) { return k; }), st.n, 'sq-n', function (k) { return 'at ' + tl[k].t.toFixed(1) + ' s'; }) + '</div>' +
            '<div class="callout tip"><b>' + esc(e.step) + '.</b> The call ' + (e.received ? 'returned the message, and its receive count is <b>' + e.receive_count + '</b>.' : 'returned nothing.') + '</div>' +
            '<div class="qrow"><div class="qbox ' + (where === 'flight' ? 'here' : '') + '"><b>In flight</b><span>' + (where === 'flight' ? 'the message is hidden from other workers' : '') + '</span></div>' +
            '<div class="qbox ' + (st.n === 2 ? 'ready' : '') + '"><b>Visible in the queue</b><span>' + (st.n === 2 ? 'it came back after 2 seconds' : 'empty') + '</span></div>' +
            '<div class="qbox dl ' + (where === 'dlq' ? 'here' : '') + '"><b>Dead-letter queue</b><span>' + (where === 'dlq' ? 'receive count 3 would pass the limit of 2, so SQS moved it here' : 'empty') + '</span></div></div>' +
            '<div class="lab-out"><div class="big"><b>' + rd.visibility_timeout_seconds + ' s</b><span>visibility timeout</span></div><div class="big"><b>' + rd.max_receive_count + '</b><span>maxReceiveCount</span></div><div class="big ' + (st.n === 3 ? 'good' : '') + '"><b>' + (st.n === 3 ? 'in the DLQ' : 'in the main queue') + '</b><span>where the message is now</span></div></div>' +
            '<p class="lab-note">At the end the main queue holds ' + rd.main_queue_depth_at_end + ' messages and the dead-letter queue holds the message <code>' + esc(rd.dlq_message_body) + '</code>. A worker that deletes the message after the work stops this chain: in a second run the deleted message was ' + (G.counts('sqs.delete').received_again_after_timeout ? '' : 'not ') + 'received again.</p>';
        } else {
          var ff = G.counts('sqs.fifo'), sn = G.counts('sns.fanout');
          h += table(['Queue', 'What happened', 'Result'], [
            ['FIFO queue', 'Three sends: order 1, order 1 again with the same deduplication id, and order 2', 'Delivered ' + ff.received_in_order.length + ' messages in order: ' + ff.received_in_order.map(function (b) { return '`' + b + '`'; }).join(', ')],
            ['SNS to analytics queue', 'Subscribed with no filter', 'Received ' + sn.analytics_count + ' messages (an SNS envelope around each)'],
            ['SNS to billing queue', 'Filter policy `{"status": ["COMPLETED"]}` and raw delivery', 'Received ' + sn.billing_count + ' message, and the body is the raw JSON']
          ]) +
            '<h3 class="lab-h">An SNS envelope has these fields</h3><div class="sel-out"><div class="names">' + sn.envelope_fields.map(function (f) { return '<span>' + esc(f) + '</span>'; }).join('') + '</div></div>' +
            '<div class="callout tip">With raw message delivery switched on, the queue gets the message body and nothing else. Without it, your code must parse the envelope and then parse the <code>Message</code> field inside it.</div>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'sq-n') { st.n = +el.getAttribute('data-v'); A.render(true); } };
      }
    };
    W.sqsInfo = { where: WHERE };
  })();

  /* ====================== Step Functions: the retry schedule ====================== */
  (function () {
    /* the documented rule: the wait before attempt n is IntervalSeconds x BackoffRate^(n-1), capped at MaxDelaySeconds when set.
       FULL jitter picks a random wait between 0 and that value. */
    function schedule(o) {
      var rows = [], total = 0;
      for (var n = 1; n <= o.attempts; n++) {
        var raw = o.interval * Math.pow(o.rate, n - 1), w = o.maxDelay ? Math.min(raw, o.maxDelay) : raw;
        total += w;
        rows.push({ n: n, wait: w, capped: o.maxDelay && raw > o.maxDelay, total: total });
      }
      return { rows: rows, total: total };
    }
    function snippet(o) {
      var r = { ErrorEquals: ['Glue.ConcurrentRunsExceededException'], IntervalSeconds: o.interval, MaxAttempts: o.attempts, BackoffRate: o.rate };
      if (o.maxDelay) r.MaxDelaySeconds = o.maxDelay;
      if (o.jitter === 'FULL') r.JitterStrategy = 'FULL';
      return JSON.stringify({ Retry: [r] }, null, 2);
    }
    function dur(sec) { return sec >= 120 ? fmtN(sec / 60, 1) + ' min' : fmtN(sec, 0) + ' s'; }
    W.retry = {
      steps: function () { return 2; },
      hint: 'Change the numbers. Read the schedule.',
      say: function (s, i) {
        return [
          'A Retry block waits longer after each failure. The wait before try n is IntervalSeconds times BackoffRate to the power n minus 1. MaxDelaySeconds caps it, and FULL jitter picks a random wait from zero up to that value, so many failing executions do not retry in the same second. This is arithmetic from the AWS documentation. Change the numbers.',
          'Check your retries against the problem. A Glue job that is already running at its concurrency limit may take 10 minutes to free a slot. Does your schedule cover that, or give up too soon?'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.rt || (A.local.rt = { interval: 30, rate: 2, attempts: 5, maxDelay: 0, jitter: 'NONE' }), h = '<div class="lab">', sch = schedule(st);
        if (i === 0) {
          h += '<div class="lab-row"><span class="lab-l">IntervalSeconds</span><div class="sel-chips">' + chips([5, 30, 60], st.interval, 'rt-i') + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">BackoffRate</span><div class="sel-chips">' + chips([1, 1.5, 2, 3], st.rate, 'rt-r', function (k) { return Number(k).toFixed(1); }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">MaxAttempts</span><div class="sel-chips">' + chips([3, 5, 8], st.attempts, 'rt-a') + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">MaxDelaySeconds</span><div class="sel-chips">' + chips([0, 120, 300], st.maxDelay, 'rt-m', function (k) { return +k ? k : 'not set'; }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">JitterStrategy</span><div class="sel-chips">' + chips(['NONE', 'FULL'], st.jitter, 'rt-j') + '</div></div>' +
            code('Retry block', 'json', snippet(st)) +
            table(['Retry', 'Wait before it', 'Time since the first failure'], sch.rows.map(function (r) { return [String(r.n), (st.jitter === 'FULL' ? 'a random time from 0 to ' : '') + dur(r.wait) + (r.capped ? ' (capped)' : ''), (st.jitter === 'FULL' ? 'up to ' : '') + dur(r.total)]; }), function (r, n) { return sch.rows[n].capped ? 'dup' : ''; }) +
            '<div class="lab-out"><div class="big"><b>' + dur(sch.total) + '</b><span>' + (st.jitter === 'FULL' ? 'longest total wait' : 'total wait before it gives up') + '</span></div><div class="big"><b>' + (st.attempts + 1) + '</b><span>runs of the state in all, with the first one</span></div></div>';
        } else {
          var need = 600, cover = sch.total >= need;
          h += '<div class="callout ' + (cover ? 'good' : 'warn') + '">A slot in the Glue job may take <b>10 minutes</b> to free. With these numbers the state keeps trying for at most <b>' + dur(sch.total) + '</b>. ' + (cover ? 'That covers it.' : 'That gives up before the slot is free, and the Catch sends the run to the failure path.') + '</div>' +
            table(['Setting', 'Total wait', 'Covers 10 minutes'], [
              [(30) + ' s, rate 2, 5 attempts', dur(schedule({ interval: 30, rate: 2, attempts: 5, maxDelay: 0 }).total), schedule({ interval: 30, rate: 2, attempts: 5, maxDelay: 0 }).total >= need ? 'yes' : 'no'],
              [(5) + ' s, rate 2, 3 attempts (a common default)', dur(schedule({ interval: 5, rate: 2, attempts: 3, maxDelay: 0 }).total), schedule({ interval: 5, rate: 2, attempts: 3, maxDelay: 0 }).total >= need ? 'yes' : 'no'],
              [(60) + ' s, rate 1, 8 attempts, no growth', dur(schedule({ interval: 60, rate: 1, attempts: 8, maxDelay: 0 }).total), schedule({ interval: 60, rate: 1, attempts: 8, maxDelay: 0 }).total >= need ? 'yes' : 'no'],
              [(30) + ' s, rate 3, 8 attempts, capped at 300 s', dur(schedule({ interval: 30, rate: 3, attempts: 8, maxDelay: 300 }).total), schedule({ interval: 30, rate: 3, attempts: 8, maxDelay: 300 }).total >= need ? 'yes' : 'no']
            ]) +
            '<p class="lab-note">Retry only errors that can pass by themselves, such as a concurrency limit or a throttle. A bad parameter fails the same way every time, so send it straight to a Catch.</p>';
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'rt-i') st.interval = +v; if (act === 'rt-r') st.rate = +v; if (act === 'rt-a') st.attempts = +v; if (act === 'rt-m') st.maxDelay = +v; if (act === 'rt-j') st.jitter = v;
          A.render(true);
        };
      }
    };
    W.retryInfo = { schedule: schedule };
  })();

  /* ====================== The monthly bill (example rates) ====================== */
  (function () {
    /* Example rates in dollars, loosely after public US East prices, and flagged as examples in the lab. Prices change. */
    var RATES = { s3gb: 0.023, s3ia: 0.0125, put1k: 0.005, get1k: 0.0004, athenaTb: 5.0, dpuh: 0.44, flexdpuh: 0.29, ksh: 0.04, kin: 0.08, kout: 0.04, lgbs: 0.0000166667, lreq: 0.20, nath: 0.045, natg: 0.045, rpuh: 0.375, logs: 0.50 };
    var PRESETS = {
      today: { name: 'Brewline today', v: { stor: 2000, put: 5000, get: 50000, tb: 20, dpu: 600, ksh: 730, kin: 300, kout: 600, gbs: 300000, lreq: 3, nat: 730, natgb: 500, rpu: 1000, logs: 100 } },
      grown: { name: 'Brewline, 10 times the data', v: { stor: 20000, put: 50000, get: 500000, tb: 200, dpu: 6000, ksh: 730, kin: 3000, kout: 6000, gbs: 3000000, lreq: 30, nat: 730, natgb: 5000, rpu: 6000, logs: 1000 } }
    };
    function lines(v, lv) {
      lv = lv || {};
      var athena = v.tb * RATES.athenaTb * (lv.parquet ? 0.1 : 1), stor = v.stor * (lv.life ? (0.3 * RATES.s3gb + 0.7 * RATES.s3ia) : RATES.s3gb);
      var glue = v.dpu * (lv.flex ? (0.5 * RATES.dpuh + 0.5 * RATES.flexdpuh) : RATES.dpuh), lam = (v.gbs * RATES.lgbs * (lv.arm ? 0.8 : 1)) + v.lreq * RATES.lreq;
      var nat = v.nat * RATES.nath + v.natgb * (lv.gateway ? 0.2 : 1) * RATES.natg;
      return [
        { k: 'storage', name: 'S3 storage', cost: stor, meter: 'storage' },
        { k: 'requests', name: 'S3 requests', cost: v.put * RATES.put1k + v.get * RATES.get1k, meter: 'requests' },
        { k: 'athena', name: 'Athena', cost: athena, meter: 'data scanned' },
        { k: 'glue', name: 'Glue jobs', cost: glue, meter: 'compute time' },
        { k: 'kinesis', name: 'Kinesis on-demand', cost: v.ksh * RATES.ksh + v.kin * RATES.kin + v.kout * RATES.kout, meter: 'data moved' },
        { k: 'lambda', name: 'Lambda', cost: lam, meter: 'compute time' },
        { k: 'nat', name: 'NAT gateway', cost: nat, meter: 'data transfer' },
        { k: 'redshift', name: 'Redshift Serverless', cost: v.rpu * RATES.rpuh, meter: 'compute time' },
        { k: 'logs', name: 'CloudWatch Logs', cost: v.logs * RATES.logs, meter: 'data moved' }
      ];
    }
    function total(ls) { return ls.reduce(function (a, l) { return a + l.cost; }, 0); }
    var LEVERS = [
      { k: 'parquet', name: 'Parquet and daily folders for the Athena tables', note: 'Assume 90 percent fewer bytes read. The recording above showed far more for these five queries, so this is cautious.' },
      { k: 'life', name: 'Lifecycle rule: Standard-IA after 30 days', note: 'Assume 70 percent of the stored bytes are older than 30 days. Standard-IA has a retrieval fee and a 30 day minimum, which this ignores.' },
      { k: 'gateway', name: 'S3 gateway endpoint instead of the NAT gateway', note: 'Assume 80 percent of the NAT traffic was S3 traffic. The gateway endpoint is free.' },
      { k: 'flex', name: 'Glue Flex for half of the job hours', note: 'Flex runs on spare capacity and starts later. Fine for a nightly job, wrong for one that people wait for.' },
      { k: 'arm', name: 'Lambda on Graviton (arm64)', note: 'Assume 20 percent lower duration cost.' }
    ];
    W.bill = {
      steps: function () { return 2; },
      hint: 'Pick a size. Then switch on the savings.',
      say: function (s, i) {
        return [
          'This is arithmetic on example rates, not a price list. The bill of a data platform is a sum of meters: storage, requests, compute time, data scanned and data moved. Pick a size and find which meter dominates.',
          'Now switch on the savings, one at a time. Each one rests on an assumption that you can read under it. The point is the order of magnitude. Measure your own numbers before you promise anything.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.bl || (A.local.bl = { p: 'today', lv: {} }), h = '<div class="lab">', v = PRESETS[st.p].v;
        if (i === 0) {
          var ls = lines(v), t = total(ls), mx = Math.max.apply(null, ls.map(function (l) { return l.cost; }));
          h += '<div class="sel-chips">' + chips(Object.keys(PRESETS), st.p, 'bl-p', function (k) { return PRESETS[k].name; }) + '</div>' +
            '<div class="lab-out"><div class="big ' + (t > 5000 ? 'bad' : t > 1000 ? 'warn' : 'good') + '"><b>' + usd(t) + '</b><span>a month, at the example rates</span></div><div class="big"><b>' + esc(ls.slice().sort(function (a, b) { return b.cost - a.cost; })[0].name) + '</b><span>the biggest line, ' + fmtN(ls.slice().sort(function (a, b) { return b.cost - a.cost; })[0].cost / t * 100, 0) + ' percent</span></div></div>' +
            '<div class="gantt">' + ls.map(function (l) { return '<div class="lane"><span class="lane-n lane-wide">' + esc(l.name) + '</span><div class="lane-track"><div class="gbar" style="left:0;width:' + Math.max(1, Math.round(l.cost / mx * 100)) + '%"></div></div><span class="lane-v">' + usd(l.cost) + '</span></div>'; }).join('') + '</div>' +
            table(['Line', 'Meter', 'A month'], ls.map(function (l) { return [l.name, l.meter, usd(l.cost)]; }));
        } else {
          var base = lines(v), now = lines(v, st.lv), t0 = total(base), t1 = total(now);
          h += '<div class="sel-chips">' + chips([0, 1], st.p === 'today' ? 0 : 1, 'bl-p2', function (k) { return +k ? PRESETS.grown.name : PRESETS.today.name; }) + '</div>' +
            '<div class="sel-chips">' + LEVERS.map(function (l) { return '<button type="button" class="sel-chip' + (st.lv[l.k] ? ' on' : '') + '" data-act="bl-l" data-v="' + l.k + '">' + esc(l.name) + '</button>'; }).join('') + '</div>' +
            '<div class="lab-out"><div class="big"><b>' + usd(t0) + '</b><span>before</span></div><div class="big ' + (t1 < t0 ? 'good' : '') + '"><b>' + usd(t1) + '</b><span>after the savings you switched on</span></div><div class="big ' + (t1 < t0 ? 'good' : '') + '"><b>' + fmtN((1 - t1 / t0) * 100, 0) + ' %</b><span>saved</span></div></div>' +
            table(['Line', 'Before', 'After'], base.map(function (l, n) { return [l.name, usd(l.cost), usd(now[n].cost)]; }), function (r, n) { return now[n].cost < base[n].cost ? 'new' : ''; }) +
            '<ul class="why">' + LEVERS.filter(function (l) { return st.lv[l.k]; }).map(function (l) { return '<li><b>' + esc(l.name) + '.</b> ' + esc(l.note) + '</li>'; }).join('') + '</ul>' +
            '<p class="lab-note">Rates used: S3 Standard $0.023 and Standard-IA $0.0125 for each GB-month, Athena $5 for each TB scanned, Glue $0.44 and Flex $0.29 for each DPU-hour, NAT gateway $0.045 for each hour and each GB, Redshift Serverless $0.375 for each RPU-hour. They are examples. AWS prices change.</p>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) {
          var v2 = el.getAttribute('data-v');
          if (act === 'bl-p') st.p = v2;
          if (act === 'bl-p2') st.p = +v2 ? 'grown' : 'today';
          if (act === 'bl-l') st.lv[v2] = !st.lv[v2];
          A.render(true);
        };
      }
    };
    W.billInfo = { lines: lines, total: total, presets: PRESETS, rates: RATES, levers: LEVERS };
  })();

  /* ====================== Redshift: distribution and sort keys ======================
     A model with made-up numbers: a small cluster of 4 nodes with 2 slices each, orders from 400 customers where a few big accounts place most of them.
     Redshift's own hash function is not public, so a simple hash stands in for it. The join labels and the rules for choosing a move come from the
     Redshift documentation. Nothing here ran on Redshift. */
  (function () {
    var NODES = 4, SPN = 2, SLICES = NODES * SPN, CUSTOMERS = 400, TARGET = 8000, BLOCKS = 100;
    function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
    function fnv(str) { var h = 0x811c9dc5; for (var i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193) >>> 0; return h; }
    var harm = 0, cust = [], TOTAL = 0, c;
    for (c = 1; c <= CUSTOMERS; c++) harm += 1 / c;
    for (c = 1; c <= CUSTOMERS; c++) { var n = Math.max(1, Math.round(TARGET / (c * harm))); cust.push({ id: 'C-' + pad(c, 4), n: n }); TOTAL += n; }
    var STYLES = { even: 'EVEN', key_customer: 'KEY (customer_id)', key_order: 'KEY (order_id)', all: 'ALL' };
    var LABELS = {
      DS_DIST_NONE: 'No rows move. Both tables are spread by the join column with the same rule, so matching rows sit on the same slice.',
      DS_DIST_ALL_NONE: 'No rows move. The inner table has a full copy on every node.',
      DS_DIST_INNER: 'The inner (smaller) table is sent to the slices that hold the matching orders.',
      DS_DIST_OUTER: 'The outer (bigger) table is sent to the slices that hold the matching customers.',
      DS_BCAST_INNER: 'A copy of the whole inner table is sent to every node.',
      DS_DIST_BOTH: 'Both tables are re-spread by the join column.'
    };
    function place(style) {
      var rows = [], i;
      for (i = 0; i < SLICES; i++) rows.push(0);
      if (style === 'even') { for (i = 0; i < TOTAL; i++) rows[i % SLICES]++; }
      else if (style === 'key_customer') cust.forEach(function (x) { rows[fnv(x.id) % SLICES] += x.n; });
      else if (style === 'key_order') { for (i = 1; i <= TOTAL; i++) rows[fnv('O-' + pad(i, 5)) % SLICES]++; }
      return rows;
    }
    /* the possible moves for the join orders x customers on customer_id, and the cheapest one, counted in rows sent over the network */
    function plan(o, cs, cn) {
      if (cs === 'all') return { label: 'DS_DIST_ALL_NONE', moved: 0, other: null };
      if (o === 'key_customer' && cs === 'key_customer') return { label: 'DS_DIST_NONE', moved: 0, other: null };
      var bcast = { label: 'DS_BCAST_INNER', moved: cn * NODES }, own;
      if (o === 'key_customer') own = { label: 'DS_DIST_INNER', moved: cn };
      else if (cs === 'key_customer') own = { label: 'DS_DIST_OUTER', moved: TOTAL };
      else own = { label: 'DS_DIST_BOTH', moved: TOTAL + cn };
      return bcast.moved < own.moved ? { label: bcast.label, moved: bcast.moved, other: own } : { label: own.label, moved: own.moved, other: bcast };
    }
    var QUERIES = [
      { k: 'day', name: 'one day of orders', col: 'order_date', frac: 1 / 90 },
      { k: 'month', name: 'the 31 days of March', col: 'order_date', frac: 31 / 90 },
      { k: 'customer', name: 'all orders of one small customer', col: 'customer_id', frac: 1 / CUSTOMERS }
    ];
    function blocks(sort, q) { return sort === q.col ? Math.max(1, Math.ceil(BLOCKS * q.frac)) : BLOCKS; }
    function sliceBars(rows, mx, bad) {
      return rows.map(function (v, k) {
        return '<div class="lane"><span class="lane-n lane-wide">node ' + (Math.floor(k / SPN) + 1) + ', slice ' + (k % SPN + 1) + '</span><div class="lane-track"><div class="gbar ' + (bad && v === mx ? 'bad' : '') + '" style="left:0;width:' + Math.max(1, Math.round(v / mx * 100)) + '%"></div></div><span class="lane-v">' + fmtN(v) + '</span></div>';
      }).join('');
    }
    W.distkey = {
      steps: function () { return 3; },
      hint: 'Pick a style, then a join, then a sort key.',
      say: function (s, i) {
        return [
          'A Redshift cluster stores each table across its slices, and the distribution style decides which rows go to which slice. This is a model, not a measurement: a made-up cluster of ' + NODES + ' nodes with ' + SPN + ' slices each, and ' + fmtN(TOTAL) + ' orders from ' + CUSTOMERS + ' customers, where a few big accounts place most of the orders. Pick a style and watch the slices.',
          'A join needs matching rows on the same slice. When they are not, Redshift moves rows over the network, and EXPLAIN names the move. Pick the style of each table. The model counts rows sent and chooses the cheaper of the moves that are possible, the way the planner weighs cost.',
          'The sort key decides the order in which a table is stored. Redshift keeps the smallest and the largest value of every block, so a filter on the sort key skips blocks. Pick a sort key and a question, and see how many of the ' + BLOCKS + ' blocks are read.'
        ][i];
      },
      mood: function (s, i) { return i === 2 ? 'happy' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.dk || (A.local.dk = { style: 'key_customer', o: 'even', cs: 'even', cn: 400, sort: 'none', q: 'day' }), h = '<div class="lab">';
        if (i === 0) {
          var rows, mx, avg = TOTAL / SLICES, ratio;
          h += '<div class="sel-chips">' + chips(Object.keys(STYLES), st.style, 'dk-s', function (k) { return STYLES[k]; }) + '</div>';
          if (st.style === 'all') {
            rows = []; for (var n2 = 0; n2 < NODES; n2++) rows.push(TOTAL);
            h += '<div class="lab-out"><div class="big good"><b>' + NODES + 'x</b><span>storage: a full copy on each of the ' + NODES + ' nodes</span></div><div class="big good"><b>none</b><span>skew: every node has all ' + fmtN(TOTAL) + ' rows</span></div></div>' +
              '<div class="gantt">' + rows.map(function (v, k) { return '<div class="lane"><span class="lane-n lane-wide">node ' + (k + 1) + '</span><div class="lane-track"><div class="gbar" style="left:0;width:100%"></div></div><span class="lane-v">' + fmtN(v) + '</span></div>'; }).join('') + '</div>' +
              '<div class="callout tip">Every join with this table is local, because each node already holds all of it. The price is storage and writes: every insert or update goes to ' + NODES + ' copies. Use it for small tables that many queries join to.</div>';
          } else {
            rows = place(st.style); mx = Math.max.apply(null, rows); ratio = mx / avg;
            h += '<div class="lab-out"><div class="big ' + (ratio > 1.5 ? 'bad' : 'good') + '"><b>' + fmtN(ratio, 2) + 'x</b><span>the busiest slice against the average of ' + fmtN(avg) + ' rows</span></div><div class="big"><b>' + fmtN(mx / TOTAL * 100, 1) + ' %</b><span>of the table on the busiest slice</span></div></div>' +
              '<div class="gantt">' + sliceBars(rows, mx, ratio > 1.5) + '</div>' +
              '<div class="callout ' + (ratio > 1.5 ? 'warn' : 'tip') + '">' + (st.style === 'even' ? 'Round robin gives every slice the same number of rows, so the data cannot skew a query. The price: the rows of one customer sit on different slices, so a join on the customer has to move rows.'
                : st.style === 'key_order' ? 'Order ids are all different, so the hash spreads the rows almost evenly. It spreads well, and no join on the customer id benefits from it.'
                : 'The biggest customer places ' + fmtN(cust[0].n / TOTAL * 100, 1) + ' % of the orders, and all of them go to one slice. That slice works the longest, and the query finishes only when it does. A distribution key needs many different values and no value that dominates.') + '</div>';
          }
        } else if (i === 1) {
          var pl = plan(st.o, st.cs, st.cn);
          h += '<div class="lab-row"><span class="lab-l">orders</span><div class="sel-chips">' + chips(['even', 'key_customer', 'key_order'], st.o, 'dk-o', function (k) { return STYLES[k]; }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">customers</span><div class="sel-chips">' + chips(['even', 'key_customer', 'all'], st.cs, 'dk-c', function (k) { return STYLES[k]; }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">size</span><div class="sel-chips">' + chips([400, 40000], st.cn, 'dk-n', function (k) { return fmtN(+k) + ' customers'; }) + '</div></div>' +
            code('EXPLAIN', 'text', 'XN Hash Join ' + pl.label + '\n  Hash Cond: ("outer".customer_id = "inner".customer_id)') +
            '<div class="lab-out"><div class="big ' + (pl.moved === 0 ? 'good' : 'warn') + '"><b>' + pl.label + '</b><span>the join step</span></div><div class="big ' + (pl.moved === 0 ? 'good' : 'warn') + '"><b>' + fmtN(pl.moved) + '</b><span>rows sent over the network</span></div></div>' +
            '<div class="callout tip">' + esc(LABELS[pl.label]) + (pl.other ? ' The other option was <b>' + pl.other.label + '</b> with ' + fmtN(pl.other.moved) + ' rows, so this one is cheaper.' : '') + (st.cs === 'all' && st.cn > 1000 ? ' With ' + fmtN(st.cn) + ' customers the full copies take ' + fmtN(st.cn * NODES) + ' stored rows, and every change to the table is written ' + NODES + ' times.' : '') + '</div>';
        } else {
          var q = QUERIES.filter(function (x) { return x.k === st.q; })[0], nb = blocks(st.sort, q), off = Math.floor((BLOCKS - nb) * 0.4), cells = '';
          for (var b = 0; b < BLOCKS; b++) cells += '<i class="' + (b >= off && b < off + nb ? 'on' : '') + '"></i>';
          h += '<div class="lab-row"><span class="lab-l">Sort key</span><div class="sel-chips">' + chips(['none', 'order_date', 'customer_id'], st.sort, 'dk-k', function (k) { return k === 'none' ? 'none (arrival order)' : k; }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">Question</span><div class="sel-chips">' + chips(QUERIES.map(function (x) { return x.k; }), st.q, 'dk-q', function (k) { return QUERIES.filter(function (x) { return x.k === k; })[0].name; }) + '</div></div>' +
            '<div class="lab-out"><div class="big ' + (nb < BLOCKS / 2 ? 'good' : 'warn') + '"><b>' + nb + ' of ' + BLOCKS + '</b><span>blocks read</span></div><div class="big"><b>' + q.col + '</b><span>the column this question filters on</span></div></div>' +
            '<div class="zmap">' + cells + '</div>' +
            '<div class="callout tip">' + (st.sort === q.col ? 'The table is stored in ' + st.sort + ' order, so the rows of this question sit side by side in a few blocks. The smallest and largest value of every other block say that it cannot match, and it is skipped.' : 'The sort key is ' + (st.sort === 'none' ? 'not set' : st.sort) + ', and this question filters on ' + q.col + '. Every block holds some matching values, so none can be skipped.') + '</div>';
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'dk-s') st.style = v;
          if (act === 'dk-o') st.o = v;
          if (act === 'dk-c') st.cs = v;
          if (act === 'dk-n') st.cn = +v;
          if (act === 'dk-k') st.sort = v;
          if (act === 'dk-q') st.q = v;
          A.render(true);
        };
      }
    };
    W.distkeyInfo = { place: place, plan: plan, blocks: blocks, queries: QUERIES, total: TOTAL, customers: cust, slices: SLICES, nodes: NODES, blockCount: BLOCKS, fnv: fnv };
  })();
})();
