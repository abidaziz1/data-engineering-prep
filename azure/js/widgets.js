/* Azure lab widgets. Each one registers LAB.W.<kind> with steps, say, render.
   What a lab shows as a listing, a token, a queue timeline or a file size comes from js/real.js, recorded with the Azure SDK against Azurite
   (a storage emulator), azure-identity, azure-eventhub, DuckDB and pyarrow. Nothing in the recording ran on Azure.
   The access, role scope, expression, distribution-move and bill labs apply rules from the Azure documentation, and they say so. */
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

  /* ====================== Blob listing lab ====================== */
  (function () {
    var PREFIXES = ['', 'orders/', 'orders/dt=2026-03-14/', 'ord', 'events/', 'orders/dt=2026-03-1'];
    function find(p, d) { return G.counts('blob.listing').filter(function (x) { return x.prefix === p && x.delimiter === d; })[0]; }
    function call(p, d) {
      var a = p ? "name_starts_with='" + p + "'" : '';
      return d ? "container.walk_blobs(" + a + (a ? ', ' : '') + "delimiter='" + d + "')" : 'container.list_blobs(' + a + ')';
    }
    W.listing = {
      steps: function () { return 2; },
      hint: 'Pick a prefix and a delimiter. Read what comes back.',
      say: function (s, i) {
        return [
          'This is the container raw, with ten blobs, listed with the Azure SDK. In a plain storage account there are no folders. A blob name is one long string, and the prefix and the delimiter are rules about strings. Pick a prefix and a delimiter, and read the blobs and the blob prefixes.',
          'One list call returns a page, and the service hands back a marker for the next page. Here the page size is 4, so you can see the pages. The SDK pager keeps the marker for you. A loop that stops after the first page drops the rest.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.ls || (A.local.ls = { p: 'orders/', d: '/' }), h = '<div class="lab">';
        if (i === 0) {
          var r = find(st.p, st.d), note;
          if (st.p === 'ord') note = st.d ? '`ord` is not a folder. It is the start of a string. With `/` as the delimiter, the service rolls every blob that starts with it up to the next `/` into one blob prefix: **orders/**.' : 'Without a delimiter the service returns every blob whose name starts with the string `ord`, however deep.';
          else if (!st.d) note = 'No delimiter, so you get **every blob** under the prefix at any depth. That is a full listing. It is the right call when you want all of them, and the wrong one to find the folders.';
          else if (r.common_prefixes.length) note = 'With `/` as the delimiter the service groups deeper names into **blob prefixes**. The portal draws them as folders. They are not blobs and cost nothing to keep. In an ADLS Gen2 account with a hierarchical namespace a directory is a real object, and you list it with the file system API.';
          else note = 'Nothing deeper than the next `/` here, so every match is a blob.';
          h += '<div class="lab-row"><span class="lab-l">Prefix</span><div class="sel-chips">' + chips(PREFIXES, st.p, 'ls-p', function (k) { return k || '(none)'; }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">Delimiter</span><div class="sel-chips">' + chips(['', '/'], st.d, 'ls-d', function (k) { return k || 'none'; }) + '</div></div>' +
            code('azure-storage-blob', 'python', call(st.p, st.d)) +
            '<div class="lab-out"><div class="big"><b>' + r.keys.length + '</b><span>blobs</span></div><div class="big"><b>' + r.common_prefixes.length + '</b><span>blob prefixes</span></div><div class="big"><b>' + r.key_count + '</b><span>items returned</span></div></div>' +
            '<div class="pair"><div><div class="compiled-h">Blob prefixes</div>' + (r.common_prefixes.length ? '<ul class="keylist">' + r.common_prefixes.map(function (k) { return '<li class="cp">' + esc(k) + '</li>'; }).join('') + '</ul>' : '<p class="lab-note">none</p>') + '</div>' +
            '<div><div class="compiled-h">Blobs</div>' + (r.keys.length ? '<ul class="keylist">' + r.keys.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('') + '</ul>' : '<p class="lab-note">none</p>') + '</div></div>' +
            '<div class="callout tip">' + md(note) + '</div>';
        } else {
          var pg = G.counts('blob.pages');
          h += table(['Call', 'Blobs in the page', 'More pages'], pg.pages.map(function (p, n) { return ['page ' + (n + 1), p.keys.length + ': `' + p.keys[0] + '` ...', p.has_continuation_token ? 'yes, a marker' : 'no']; }), function (r, n) { return pg.pages[n].has_continuation_token ? '' : 'new'; }) +
            code('azure-storage-blob', 'python', "pager = container.list_blobs(results_per_page=4).by_page()\nfor page in pager:\n    print(len(list(page)))") +
            '<div class="callout tip">The pager printed <b>' + pg.pages.map(function (p) { return p.keys.length; }).join(', ') + '</b>. The last page has no marker. Iterating over <code>list_blobs()</code> directly does this loop for you. Calling the service by hand and reading only the first response drops everything after the first page.</div>';
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'ls-p') st.p = v; if (act === 'ls-d') st.d = v; A.render(true); };
      }
    };
    W.listingInfo = { find: find, prefixes: PREFIXES };
  })();

  /* ====================== SAS lab ====================== */
  (function () {
    var FIELD = {
      st: ['Start time', 'The token is not valid before this moment. Optional.'],
      se: ['Expiry time', 'After this moment the token stops working. A stored access policy can hold it instead of the URL.'],
      sp: ['Permissions', 'One letter for each right: r read, a add, c create, w write, d delete, l list. Here r means read only.'],
      spr: ['Protocol', 'https only. Without it the token also works over plain http.'],
      sv: ['Service version', 'The storage service version the token was made for. The SDK puts in its own current version.'],
      sr: ['Resource', 'b is one blob, c is a container, d is a directory (ADLS Gen2), bs is a snapshot.'],
      sig: ['Signature', 'HMAC-SHA256 with the account key over the other fields. Change a field and it no longer matches. Rotate the key and every token made with it dies.']
    };
    function reason(c, op, r) {
      if (r.status === 200 || r.status === 201) return 'The token grants this operation on this resource.';
      if (c.sas === 'read, but expired') return 'The expiry time is in the past, so the service refuses every call with this token.';
      if (c.sas === 'read, edited to write') return 'The URL was edited after signing. The service signs the same fields itself and gets another signature, so every call fails, even a read.';
      if (r.code === 'AuthorizationPermissionMismatch') return 'The token is valid, but its permissions (sp=' + c.fields.sp + ') do not include this operation.';
      if (op === 'GET the other blob') return 'The token was signed for one blob. The name of another blob changes the signed text.';
      if (op === 'LIST the container') return 'A token for one blob does not cover the container.';
      return 'The service refused the signature.';
    }
    W.sas = {
      steps: function () { return 3; },
      hint: 'Read the token, then predict allow or deny.',
      say: function (s, i) {
        return [
          'This is a service SAS for one blob, made offline with the SDK and the published development key. It is a URL plus a query string. Pick a field to read what it says. Nothing in the token is secret except that you cannot forge the last field.',
          'Now the emulator. I made five tokens and sent five requests with each one, and wrote down the answers. Pick a token and a request, say allow or deny, then read the recorded answer. The code names are the emulator, and Azure names a few of them differently.',
          'All twenty-five answers on one page. Look at the last row: someone changed sp=r to sp=rw in the URL. The signature covers the permissions, so even the read fails.'
        ][i];
      },
      mood: function (s, i) { return i === 2 ? 'oops' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.sa || (A.local.sa = { f: 'sp', c: 0, o: 0, guess: {} }), h = '<div class="lab">', M = G.counts('sas.matrix'), SF = G.counts('sas.fields');
        if (i === 0) {
          var f = FIELD[st.f];
          h += '<div class="sel-chips">' + chips(SF.order, st.f, 'sa-f') + '</div>' +
            code('a service SAS URL', 'text', G.text('sas.url').replace('?', '\n?').replace(/&/g, '\n&')) +
            '<div class="callout tip"><b>' + esc(st.f) + ' = ' + esc(SF.fields[st.f].length > 28 ? SF.fields[st.f].slice(0, 28) + '...' : SF.fields[st.f]) + ', ' + esc(f[0]) + '.</b> ' + esc(f[1]) + '</div>' +
            '<p class="lab-note">The service version is <code>' + esc(SF.fields.sv) + '</code>, the version of the SDK used for the recording. The key is the published development key of the emulator, so this signature protects nothing.</p>';
        } else if (i === 1) {
          var c = M.cases[st.c], r = c.results[st.o], key = st.c + ':' + st.o, g = st.guess[key], ok = r.status < 300;
          h += '<div class="lab-row"><span class="lab-l">Token</span><div class="sel-chips">' + chips(M.cases.map(function (x, n) { return n; }), st.c, 'sa-c', function (n) { return M.cases[n].sas; }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">Request</span><div class="sel-chips">' + chips(M.ops.map(function (x, n) { return n; }), st.o, 'sa-o', function (n) { return M.ops[n]; }) + '</div></div>' +
            '<div class="callout tip"><b>Token:</b> sp=' + esc(c.fields.sp) + ', sr=' + esc(c.fields.sr) + ', se=' + esc(c.fields.se) + (c.sas === 'read, edited to write' ? ' (edited after signing)' : '') + '<br><b>Request:</b> ' + esc(M.ops[st.o]) + '</div>' +
            '<div class="sel-chips"><button type="button" class="sel-chip' + (g === 'allow' ? ' on' : '') + '" data-act="sa-g" data-v="allow">Allow</button><button type="button" class="sel-chip' + (g === 'deny' ? ' on' : '') + '" data-act="sa-g" data-v="deny">Deny</button></div>';
          if (g) h += '<div class="callout ' + ((g === 'allow') === ok ? 'good' : 'warn') + '"><b>' + ((g === 'allow') === ok ? 'Right.' : 'The answer was ' + (ok ? 'allow' : 'deny') + '.') + '</b> The call returned HTTP ' + r.status + (r.code ? ', <code>' + esc(r.code) + '</code>' : '') + '. ' + esc(reason(c, M.ops[st.o], r)) + '</div>';
          var done = Object.keys(st.guess).length, right = Object.keys(st.guess).filter(function (k) { var a = k.split(':'); return (st.guess[k] === 'allow') === (M.cases[+a[0]].results[+a[1]].status < 300); }).length;
          h += '<p class="lab-note">Answered ' + done + ' of ' + (M.cases.length * M.ops.length) + ', right ' + right + '.</p>';
        } else {
          h += table(['Token'].concat(M.ops), M.cases.map(function (c) { return [c.sas].concat(c.results.map(function (r) { return r.status + (r.code ? ' ' + r.code.replace('Authorization', 'Auth...') : ''); })); }), null,
            function (r, ri, ci) { if (ci === 0) return ''; var res = M.cases[ri].results[ci - 1]; return res.status < 300 ? 'wgood' : 'wbad'; }) +
            '<div class="callout warn"><b>Names differ from the service.</b> Azurite answers <code>AuthorizationFailure</code> where Azure answers <code>AuthenticationFailed</code> for a bad or expired signature. The status, 403, is the same. Read the status first and the code second.</div>';
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'sa-f') st.f = v;
          if (act === 'sa-c') st.c = +v;
          if (act === 'sa-o') st.o = +v;
          if (act === 'sa-g') st.guess[st.c + ':' + st.o] = v;
          A.render(true);
        };
      }
    };
    W.sasInfo = { reason: reason, field: FIELD };
  })();

  /* ====================== Storage access evaluator ====================== */
  (function () {
    /* The documented order for one data request to a storage account. Network rules come first. Then the kind of credential:
       an account key or a SAS is allowed by the token itself. An Entra token goes to the role assignments, and only when no role
       grants the data action does the ACL check run (ADLS Gen2). A grant ends the check. */
    var ROLES = {
      none: 'no role', reader: 'Reader', contributor: 'Contributor', owner: 'Owner', blobreader: 'Storage Blob Data Reader', blobcontrib: 'Storage Blob Data Contributor'
    };
    function grants(x) {
      if (x.scope === 'other') return false;
      if (x.role === 'blobreader') return x.op === 'read';
      if (x.role === 'blobcontrib') return true;
      return false;
    }
    function decide(x) {
      var s = [];
      if (x.net === 'blocked') { s.push('The storage firewall refuses the network of the caller. The request ends here, before any identity check.'); return { allowed: false, by: 'network rules', steps: s }; }
      s.push('The network rules allow the caller.');
      if (x.auth === 'key') {
        if (!x.keyAllowed) { s.push('The request is signed with the account key, but Shared Key access is switched off on the account.'); return { allowed: false, by: 'Shared Key switched off', steps: s }; }
        s.push('The account key is full access to the account. No role and no ACL is checked.');
        return { allowed: true, by: 'the account key', steps: s };
      }
      if (x.auth === 'sas') {
        if (x.sasPerm) { s.push('The SAS holds this permission and its signature and times are valid. The token is the permission. No role and no ACL is checked.'); return { allowed: true, by: 'the SAS', steps: s }; }
        s.push('The SAS is valid, but its permissions do not include this operation.');
        return { allowed: false, by: 'the SAS permissions', steps: s };
      }
      s.push('The caller presents an Entra token, so Azure RBAC is checked first.');
      if (grants(x)) {
        s.push(ROLES[x.role] + ' ' + (x.scope === 'account' ? 'on the account' : 'on this container') + ' holds the data action for this ' + x.op + '. A grant ends the check, and the ACL is not looked at.');
        return { allowed: true, by: 'a role assignment', steps: s };
      }
      if (x.role === 'reader' || x.role === 'contributor' || x.role === 'owner') s.push(ROLES[x.role] + ' manages the resource, but it holds no data action. It grants nothing here.');
      else if (x.role !== 'none' && x.scope === 'other') s.push('The role is assigned on another container, so it does not cover this one.');
      else if (x.role === 'blobreader') s.push('Storage Blob Data Reader holds no write action.');
      else s.push('No role assignment covers this request.');
      s.push('No role grants it, so the ACL check runs. It needs execute (x) on every folder above the file, and ' + (x.op === 'read' ? 'read (r)' : 'write (w)') + ' on the file.');
      var need = x.op === 'read' ? (x.acl === 'r' || x.acl === 'rw') : x.acl === 'rw';
      if (!x.parentsX) { s.push('At least one folder above the file has no execute for this caller.'); return { allowed: false, by: 'the ACL', steps: s }; }
      if (!need) { s.push('The ACL of the file does not give this caller ' + (x.op === 'read' ? 'read' : 'write') + '.'); return { allowed: false, by: 'the ACL', steps: s }; }
      s.push('Every folder has execute and the file has the needed bit.');
      return { allowed: true, by: 'the ACL', steps: s };
    }
    function X(o) { return Object.assign({ net: 'allowed', auth: 'entra', keyAllowed: true, sasPerm: true, role: 'none', scope: 'account', op: 'read', acl: 'none', parentsX: false }, o); }
    var CARDS = [
      { k: 1, name: 'A user with Reader on the subscription reads a blob', x: X({ role: 'reader' }), want: false },
      { k: 2, name: 'A user with Owner on the subscription reads a blob, using an Entra token', x: X({ role: 'owner' }), want: false },
      { k: 3, name: 'Storage Blob Data Reader on the container reads a blob in it', x: X({ role: 'blobreader', scope: 'right' }), want: true },
      { k: 4, name: 'Storage Blob Data Reader on one container reads a blob in another', x: X({ role: 'blobreader', scope: 'other' }), want: false },
      { k: 5, name: 'No role. The file ACL gives r-- and every folder above it has x', x: X({ acl: 'r', parentsX: true }), want: true },
      { k: 6, name: 'No role. The file ACL gives r-- but one folder above it has no x', x: X({ acl: 'r', parentsX: false }), want: false },
      { k: 7, name: 'Storage Blob Data Contributor, but the firewall refuses the network', x: X({ role: 'blobcontrib', net: 'blocked' }), want: false },
      { k: 8, name: 'A read SAS is used for a read, from an allowed network', x: X({ auth: 'sas', sasPerm: true }), want: true },
      { k: 9, name: 'The request is signed with the account key, and Shared Key access is switched off', x: X({ auth: 'key', keyAllowed: false }), want: false },
      { k: 10, name: 'Storage Blob Data Reader on the account reads a file whose ACL is empty', x: X({ role: 'blobreader', scope: 'account', acl: 'none', parentsX: false }), want: true }
    ];
    W.access = {
      steps: function () { return 3; },
      hint: 'Predict allow or deny, then read the rule that decided.',
      say: function (s, i) {
        return [
          'Ten requests to a storage account. Read the facts, predict allow or deny, then press the answer. The reasons are the rules you will be asked about. They come from the Azure documentation, because the emulator cannot check roles or ACLs.',
          'Now change the facts yourself. Start with the network, then the kind of credential, then the roles, then the ACL. Watch which rule decides and which rules never run. A role grant ends the check, and a SAS skips roles altogether.',
          'The ten requests through the rule. This is the order to say out loud: network, credential, role, role condition, ACL. If a role grants, the ACL never runs.'
        ][i];
      },
      mood: function (s, i) { return i === 0 ? 'think' : 'happy'; },
      render: function (box, s, i, A) {
        var st = A.local.ac || (A.local.ac = { n: 0, guess: {}, x: X({ role: 'blobreader', scope: 'right' }), card: '' }), h = '<div class="lab">';
        if (i === 0) {
          var c = CARDS[st.n], g = st.guess[st.n], d = decide(c.x);
          h += '<div class="sel-chips">' + chips(CARDS.map(function (x) { return x.k - 1; }), st.n, 'ac-n', function (k) { return 'request ' + (+k + 1) + (st.guess[k] ? ((st.guess[k] === 'allow') === CARDS[k].want ? ' (right)' : ' (wrong)') : ''); }) + '</div>' +
            '<div class="callout tip"><b>Request ' + c.k + ':</b> ' + esc(c.name) + '.</div>' +
            '<div class="sel-chips"><button type="button" class="sel-chip' + (g === 'allow' ? ' on' : '') + '" data-act="ac-g" data-v="allow">Allow</button><button type="button" class="sel-chip' + (g === 'deny' ? ' on' : '') + '" data-act="ac-g" data-v="deny">Deny</button></div>';
          if (g) h += '<div class="callout ' + ((g === 'allow') === d.allowed ? 'good' : 'warn') + '"><b>' + ((g === 'allow') === d.allowed ? 'Right.' : 'The answer was ' + (d.allowed ? 'allow' : 'deny') + '.') + '</b> Decided by ' + esc(d.by) + '.<ol class="why">' + d.steps.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol></div>';
          var done = Object.keys(st.guess).length, right = Object.keys(st.guess).filter(function (k) { return (st.guess[k] === 'allow') === CARDS[k].want; }).length;
          h += '<p class="lab-note">Answered ' + done + ' of ' + CARDS.length + ', right ' + right + '.</p>';
        } else if (i === 1) {
          var x = st.x, d2 = decide(x);
          h += '<div class="sel-chips">' + CARDS.map(function (cd) { return '<button type="button" class="sel-chip' + (st.card === String(cd.k) ? ' on' : '') + '" data-act="ac-card" data-v="' + cd.k + '">request ' + cd.k + '</button>'; }).join('') + '</div>' +
            '<div class="lab-row"><span class="lab-l">Network</span><div class="sel-chips">' + chips(['allowed', 'blocked'], x.net, 'ac-net', function (v) { return v === 'allowed' ? 'the firewall allows the caller' : 'the firewall refuses the caller'; }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">Credential</span><div class="sel-chips">' + chips(['entra', 'sas', 'key'], x.auth, 'ac-auth', function (v) { return { entra: 'an Entra token', sas: 'a SAS', key: 'the account key' }[v]; }) + '</div></div>';
          if (x.auth === 'key') h += '<div class="lab-row"><span class="lab-l">Shared Key</span><div class="sel-chips">' + chips([1, 0], x.keyAllowed ? 1 : 0, 'ac-key', function (v) { return +v ? 'allowed on the account' : 'switched off'; }) + '</div></div>';
          if (x.auth === 'sas') h += '<div class="lab-row"><span class="lab-l">SAS permission</span><div class="sel-chips">' + chips([1, 0], x.sasPerm ? 1 : 0, 'ac-sas', function (v) { return +v ? 'holds this permission' : 'does not hold it'; }) + '</div></div>';
          if (x.auth === 'entra') {
            h += '<div class="lab-row"><span class="lab-l">Role</span><div class="sel-chips">' + chips(Object.keys(ROLES), x.role, 'ac-role', function (v) { return ROLES[v]; }) + '</div></div>' +
              '<div class="lab-row"><span class="lab-l">Assigned on</span><div class="sel-chips">' + chips(['account', 'right', 'other'], x.scope, 'ac-scope', function (v) { return { account: 'the account', right: 'this container', other: 'another container' }[v]; }) + '</div></div>';
          }
          h += '<div class="lab-row"><span class="lab-l">Operation</span><div class="sel-chips">' + chips(['read', 'write'], x.op, 'ac-op', function (v) { return v + ' the file'; }) + '</div></div>';
          if (x.auth === 'entra') h += '<div class="lab-row"><span class="lab-l">ACL of the file</span><div class="sel-chips">' + chips(['none', 'r', 'rw'], x.acl, 'ac-acl', function (v) { return { none: 'no entry for the caller', r: 'r--', rw: 'rw-' }[v]; }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">Folders above</span><div class="sel-chips">' + chips([1, 0], x.parentsX ? 1 : 0, 'ac-px', function (v) { return +v ? 'all have execute' : 'one has no execute'; }) + '</div></div>';
          h += '<div class="lab-out"><div class="big ' + (d2.allowed ? 'good' : 'bad') + '"><b>' + (d2.allowed ? 'Allow' : 'Deny') + '</b><span>decided by: ' + esc(d2.by) + '</span></div></div>' +
            '<ol class="why">' + d2.steps.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol>' +
            '<p class="lab-note">Worked out from the documented order. Roles with conditions (ABAC), deny assignments and the default ACL of a new file add more cases. They are in the documentation.</p>';
        } else {
          h += table(['#', 'Request', 'The rule says', 'Decided by'], CARDS.map(function (cd) { var dd = decide(cd.x); return [String(cd.k), cd.name, dd.allowed ? 'allow' : 'deny', dd.by]; }), function (r) { return r[2] === 'allow' ? 'new' : 'dup'; }) +
            '<div class="callout tip">Two of these surprise people. Owner and Reader hold no data action, so an Entra token with only those roles reads nothing (request 1 and 2). And a role that grants ends the check, so an empty ACL does not matter (request 10).</div>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'ac-n') st.n = +v;
          if (act === 'ac-g') st.guess[st.n] = v;
          if (act === 'ac-net') st.x.net = v;
          if (act === 'ac-auth') st.x.auth = v;
          if (act === 'ac-key') st.x.keyAllowed = !!+v;
          if (act === 'ac-sas') st.x.sasPerm = !!+v;
          if (act === 'ac-role') st.x.role = v;
          if (act === 'ac-scope') st.x.scope = v;
          if (act === 'ac-op') st.x.op = v;
          if (act === 'ac-acl') st.x.acl = v;
          if (act === 'ac-px') st.x.parentsX = !!+v;
          if (act === 'ac-card') { st.card = v; st.x = JSON.parse(JSON.stringify(CARDS.filter(function (c) { return String(c.k) === v; })[0].x)); }
          A.render(true);
        };
      }
    };
    W.accessInfo = { decide: decide, cards: CARDS, X: X };
  })();

  /* ====================== Role scope lab ====================== */
  (function () {
    var TREE = [
      { id: 'mg', l: 'mg-brewline', ty: 'MG', d: 0, p: null },
      { id: 'sp', l: 'sub-brewline-prod', ty: 'SUB', d: 1, p: 'mg' },
      { id: 'rgd', l: 'rg-brewline-data-prod', ty: 'RG', d: 2, p: 'sp' },
      { id: 'sa', l: 'stbrewlinelakeprod', ty: 'STORAGE', d: 3, p: 'rgd' },
      { id: 'craw', l: 'raw', ty: 'CONTAINER', d: 4, p: 'sa' },
      { id: 'ccur', l: 'curated', ty: 'CONTAINER', d: 4, p: 'sa' },
      { id: 'adf', l: 'adf-brewline-prod', ty: 'ADF', d: 3, p: 'rgd' },
      { id: 'kv', l: 'kv-brewline-prod', ty: 'VAULT', d: 3, p: 'rgd' },
      { id: 'rgn', l: 'rg-brewline-network-prod', ty: 'RG', d: 2, p: 'sp' },
      { id: 'vn', l: 'vnet-brewline-prod', ty: 'VNET', d: 3, p: 'rgn' },
      { id: 'sd', l: 'sub-brewline-dev', ty: 'SUB', d: 1, p: 'mg' },
      { id: 'rgdd', l: 'rg-brewline-data-dev', ty: 'RG', d: 2, p: 'sd' },
      { id: 'sad', l: 'stbrewlinelakedev', ty: 'STORAGE', d: 3, p: 'rgdd' },
      { id: 'cdraw', l: 'raw', ty: 'CONTAINER', d: 4, p: 'sad' }
    ];
    var ROLES = {
      reader: { n: 'Reader' }, contributor: { n: 'Contributor' }, owner: { n: 'Owner' },
      blobreader: { n: 'Storage Blob Data Reader' }, blobcontrib: { n: 'Storage Blob Data Contributor' }, kvsecrets: { n: 'Key Vault Secrets User' }, adfcontrib: { n: 'Data Factory Contributor' }
    };
    var RESOURCE = { STORAGE: 1, CONTAINER: 1, ADF: 1, VAULT: 1, VNET: 1 };
    function byId(id) { return TREE.filter(function (t) { return t.id === id; })[0]; }
    function inScope(scope, node) { for (var n = node; n; n = n.p ? byId(n.p) : null) if (n.id === scope) return true; return false; }
    function effect(role, node) {
      var manage = 'no', data = 'no';
      if (role === 'reader') manage = 'view';
      if (role === 'contributor') manage = 'edit';
      if (role === 'owner') manage = 'edit + roles';
      if (role === 'adfcontrib' && node.ty === 'ADF') manage = 'edit';
      if (role === 'blobreader' && (node.ty === 'STORAGE' || node.ty === 'CONTAINER')) data = 'read';
      if (role === 'blobcontrib' && (node.ty === 'STORAGE' || node.ty === 'CONTAINER')) data = 'read + write';
      if (role === 'kvsecrets' && node.ty === 'VAULT') data = 'read secrets';
      return { manage: manage, data: data };
    }
    W.scopes = {
      steps: function () { return 2; },
      hint: 'Pick a scope in the tree and a role. See who inherits what.',
      say: function (s, i) {
        return [
          'A role assignment has three parts: who, which role, and which scope. Click a scope in the tree and pick a role. Everything at that scope and below inherits it. Watch the two columns: what you can manage in Azure Resource Manager, and what data you can touch.',
          'The same facts as a table. The last two columns are the ones that trip people. Owner and Contributor manage the account, and they hold no data action. They can still list the account keys, which is a way around the roles, and one more reason to switch Shared Key off.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.sp || (A.local.sp = { scope: 'rgd', role: 'blobreader' }), h = '<div class="lab">';
        if (i === 0) {
          var scopeNode = byId(st.scope);
          h += '<div class="lab-row"><span class="lab-l">Role</span><div class="sel-chips">' + chips(Object.keys(ROLES), st.role, 'sc-r', function (k) { return ROLES[k].n; }) + '</div></div>' +
            '<div class="tree">' + TREE.map(function (n) {
              var inn = inScope(st.scope, n), tags = '';
              if (inn && RESOURCE[n.ty]) { var e = effect(st.role, n); tags = '<span class="ok"><span class="tag ' + (e.manage === 'no' ? 'n' : 'y') + '">manage: ' + esc(e.manage) + '</span><span class="tag ' + (e.data === 'no' ? 'n' : 'y') + '">data: ' + esc(e.data) + '</span></span>'; }
              return '<div class="tn' + (n.id === st.scope ? ' pick' : inn ? ' in' : '') + '" style="--d:' + n.d + '"><span class="ty">' + n.ty + '</span><button type="button" data-act="sc-n" data-v="' + n.id + '">' + esc(n.l) + '</button>' + tags + '</div>';
            }).join('') + '</div>' +
            '<div class="callout tip"><b>' + esc(ROLES[st.role].n) + ' assigned at ' + esc(scopeNode.l) + '.</b> It reaches the ' + (TREE.filter(function (n) { return inScope(st.scope, n) && n.id !== st.scope; }).length) + ' items below it, and nothing above or beside it. Blue rows inherit it. A role that fits only one resource type, such as Key Vault Secrets User, shows <b>no</b> on the others.</div>';
        } else {
          h += table(['Role', 'Manage the resources (Resource Manager)', 'Touch the data with an Entra token', 'Also'], [
            ['Reader', 'view only', 'none', 'sees that the account exists, reads no blob'],
            ['Contributor', 'create, change, delete', 'none', 'can list the account keys, which open the data'],
            ['Owner', 'everything, and assign roles', 'none', 'can give itself a data role, and can list the keys'],
            ['Storage Blob Data Reader', 'none', 'read and list blobs', 'a data role, no management'],
            ['Storage Blob Data Contributor', 'none', 'read, write and delete blobs', 'a data role, no management'],
            ['Key Vault Secrets User', 'none', 'read secret values', 'with the vault in the role-based permission model'],
            ['Data Factory Contributor', 'create and change Data Factory resources', 'none', 'only for Data Factory']
          ], null, function (r, ri, ci) { return ci === 2 ? (r[2] === 'none' ? 'wbad' : 'wgood') : ''; }) +
            '<div class="callout warn"><b>The classic mistake.</b> A person with Owner on the subscription gets 403 in the portal when it signs in with Entra to browse blobs, and the fix is a data role, not more of Owner. The role lists are from the Azure built-in roles documentation.</div>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'sc-r') st.role = v; if (act === 'sc-n') st.scope = v; A.render(true); };
      }
    };
    W.scopesInfo = { tree: TREE, roles: ROLES, effect: effect, inScope: inScope };
  })();

  /* ====================== DefaultAzureCredential lab ====================== */
  (function () {
    var COND = [
      ['EnvironmentCredential', 'env', 'the variables AZURE_CLIENT_ID, AZURE_TENANT_ID and a secret or certificate are set'],
      ['WorkloadIdentityCredential', 'wi', 'a federated token file is mounted, as in Kubernetes or a GitHub Actions job with the right setup'],
      ['ManagedIdentityCredential', 'mi', 'the code runs on Azure with a managed identity on the host'],
      ['SharedTokenCacheCredential', 'cache', 'a sign-in is in the shared token cache of the machine'],
      ['VisualStudioCodeCredential', 'vsc', 'Visual Studio Code is signed in and the broker package is installed'],
      ['AzureCliCredential', 'cli', 'az login was run on this machine'],
      ['AzurePowerShellCredential', 'ps', 'Connect-AzAccount was run in PowerShell'],
      ['AzureDeveloperCliCredential', 'azd', 'azd auth login was run']
    ];
    var PRESETS = {
      'my laptop, after az login': { cli: 1 },
      'a function app with a managed identity': { mi: 1 },
      'a CI job with a client secret in its variables': { env: 1 },
      'a Kubernetes pod with workload identity': { wi: 1 },
      'a container with no identity at all': {}
    };
    function pick(on) { for (var k = 0; k < COND.length; k++) if (on[COND[k][1]]) return k; return -1; }
    W.credchain = {
      steps: function () { return 2; },
      hint: 'Read the order, then switch the environment on and off.',
      say: function (s, i) {
        return [
          'This is the real error of DefaultAzureCredential, recorded in a clean process with no variables and no sign-in. It lists every credential it tried, in order. The order is the lesson: the first one that works wins, and the others are never asked.',
          'Now play with the environment. Pick a place your code might run, or switch the conditions yourself. The first condition that holds is the credential that signs in. A credential before it that you did not intend is how a laptop ends up using the wrong identity.'
        ][i];
      },
      mood: function (s, i) { return i === 0 ? 'wow' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.cc || (A.local.cc = { on: { cli: 1 }, preset: 'my laptop, after az login' }), h = '<div class="lab">', CH = G.counts('identity.chain');
        if (i === 0) {
          h += '<ol class="chain">' + CH.order.map(function (n) { return '<li><div><b>' + esc(n) + '</b><br><span>' + esc(CH.each_failure_first_words[n] || 'interactive sign-in through the operating system, off unless asked for') + '</span></div></li>'; }).join('') + '</ol>' +
            '<p class="lab-note">Recorded with azure-identity ' + esc(G.meta('azure-identity')) + '. The credential list changes between versions, so read the error of your own version.</p>';
        } else {
          var used = pick(st.on);
          h += '<div class="lab-row"><span class="lab-l">Place</span><div class="sel-chips">' + chips(Object.keys(PRESETS), st.preset, 'cc-p') + '</div></div>' +
            '<div class="sel-chips">' + COND.map(function (c) { return '<button type="button" class="sel-chip' + (st.on[c[1]] ? ' yes' : '') + '" data-act="cc-t" data-v="' + c[1] + '">' + esc(c[0].replace('Credential', '')) + ': ' + (st.on[c[1]] ? 'ready' : 'not set') + '</button>'; }).join('') + '</div>' +
            '<ol class="chain">' + COND.map(function (c, k) {
              var cls = used === k ? 'used' : (used >= 0 && k > used ? 'skip' : '');
              return '<li class="' + cls + '"><div><b>' + esc(c[0]) + '</b><br><span>' + esc(used === k ? 'ready, so it signs in and the chain stops' : used >= 0 && k > used ? 'never asked' : c[1] && st.on[c[1]] ? 'ready' : 'unavailable: ' + c[2] + ' is not true') + '</span></div></li>';
            }).join('') + '</ol>' +
            '<div class="callout ' + (used >= 0 ? 'good' : 'bad') + '">' + (used >= 0 ? '<b>' + esc(COND[used][0]) + '</b> signs in.' + (used === 0 ? ' A secret sits in the environment. It works anywhere and it is a secret to rotate.' : used === 2 ? ' No secret in the code or the settings. This is the one to want in Azure.' : used >= 5 ? ' This is a developer sign-in. It is right on a laptop and wrong on a server.' : '') : '<b>No credential is ready.</b> The call fails with the message of the first screen.') + '</div>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'cc-p') { st.preset = v; st.on = JSON.parse(JSON.stringify(PRESETS[v])); }
          if (act === 'cc-t') { st.on[v] = st.on[v] ? 0 : 1; st.preset = ''; }
          A.render(true);
        };
      }
    };
    W.credInfo = { cond: COND, pick: pick, presets: PRESETS };
  })();

  /* ====================== Data Factory expression lab ====================== */
  (function () {
    /* A small evaluator for the most used functions of the Data Factory expression language, written from the documented
       definitions. It is a model, not Data Factory. A debug run in the service is the final word. */
    var PARAMS = { run_date: '2026-03-14', store: 'S-07', tables: 'orders,customers,stores', n: '3' };
    var TIMES = ['2026-03-14T06:00:00Z', '2026-03-31T23:30:00Z', '2026-01-01T00:15:00Z'];
    var ITEM = { schema: 'dbo', table: 'orders', kind: 'incremental' };
    var ACT = { GetWatermark: { output: { firstRow: { last_value: '2026-03-13T06:00:00Z' } } } };

    function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
    function parseTs(v) {
      var m = /^(\d{4})-(\d\d)-(\d\d)(?:T(\d\d):(\d\d):(\d\d)(?:\.\d+)?Z)?$/.exec(String(v));
      if (!m) throw new Error("The string '" + v + "' is not a valid timestamp");
      return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)));
    }
    function iso(d) { return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1, 2) + '-' + pad(d.getUTCDate(), 2) + 'T' + pad(d.getUTCHours(), 2) + ':' + pad(d.getUTCMinutes(), 2) + ':' + pad(d.getUTCSeconds(), 2) + '.0000000Z'; }
    function fmt(d, f) {
      return f.replace(/yyyy|yy|MM|dd|HH|mm|ss/g, function (t) {
        return { yyyy: pad(d.getUTCFullYear(), 4), yy: pad(d.getUTCFullYear() % 100, 2), MM: pad(d.getUTCMonth() + 1, 2), dd: pad(d.getUTCDate(), 2), HH: pad(d.getUTCHours(), 2), mm: pad(d.getUTCMinutes(), 2), ss: pad(d.getUTCSeconds(), 2) }[t];
      });
    }
    function tokenize(src) {
      var t = [], i = 0;
      while (i < src.length) {
        var c = src[i];
        if (/\s/.test(c)) { i++; continue; }
        if (c === "'") {
          var j = i + 1, str = '';
          for (;;) {
            if (j >= src.length) throw new Error('A string is not closed: it starts at character ' + (i + 1));
            if (src[j] === "'") { if (src[j + 1] === "'") { str += "'"; j += 2; continue; } break; }
            str += src[j++];
          }
          t.push({ k: 's', v: str }); i = j + 1; continue;
        }
        var prev = t[t.length - 1];
        if (/[0-9]/.test(c) || (c === '-' && /[0-9]/.test(src[i + 1] || '') && (!prev || (prev.k === 'p' && (prev.v === '(' || prev.v === ','))))) {
          var m = /^-?\d+(\.\d+)?/.exec(src.slice(i)); t.push({ k: 'n', v: parseFloat(m[0]) }); i += m[0].length; continue;
        }
        if (/[A-Za-z_]/.test(c)) { var m2 = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i)); t.push({ k: 'i', v: m2[0] }); i += m2[0].length; continue; }
        if ('(),.[]'.indexOf(c) >= 0) { t.push({ k: 'p', v: c }); i++; continue; }
        throw new Error("Unexpected character '" + c + "' at position " + (i + 1));
      }
      return t;
    }
    function parse(tokens) {
      var p = 0;
      function isP(t, v) { return t && t.k === 'p' && t.v === v; }
      function expr() {
        var t = tokens[p++];
        if (!t) throw new Error('The expression ends too early');
        var node;
        if (t.k === 's' || t.k === 'n') node = { t: 'lit', v: t.v };
        else if (t.k === 'i') {
          if (t.v === 'true') node = { t: 'lit', v: true };
          else if (t.v === 'false') node = { t: 'lit', v: false };
          else if (t.v === 'null') node = { t: 'lit', v: null };
          else {
            if (!isP(tokens[p], '(')) throw new Error("Expected '(' after the function name '" + t.v + "'");
            p++;
            var args = [];
            if (isP(tokens[p], ')')) p++;
            else {
              for (;;) {
                args.push(expr());
                var n = tokens[p++];
                if (!n) throw new Error("Expected ')' before the end of the expression");
                if (isP(n, ')')) break;
                if (!isP(n, ',')) throw new Error("Expected ',' or ')' but found '" + n.v + "'");
              }
            }
            node = { t: 'call', name: t.v, args: args };
          }
        } else throw new Error("Unexpected '" + t.v + "'");
        for (;;) {
          var nx = tokens[p];
          if (isP(nx, '.')) { p++; var id = tokens[p++]; if (!id || id.k !== 'i') throw new Error("Expected a property name after '.'"); node = { t: 'prop', o: node, name: id.v }; }
          else if (isP(nx, '[')) { p++; var ix = expr(); if (!isP(tokens[p], ']')) throw new Error("Expected ']'"); p++; node = { t: 'idx', o: node, i: ix }; }
          else break;
        }
        return node;
      }
      var e = expr();
      if (p < tokens.length) throw new Error("Unexpected '" + tokens[p].v + "' after the end of the expression");
      return e;
    }
    function toStr(v) { return typeof v === 'string' ? v : JSON.stringify(v); }
    function ev(node, ctx) {
      if (node.t === 'lit') return node.v;
      if (node.t === 'prop') {
        var o = ev(node.o, ctx);
        if (o === null || typeof o !== 'object' || !(node.name in o)) throw new Error("The property '" + node.name + "' does not exist");
        return o[node.name];
      }
      if (node.t === 'idx') {
        var a = ev(node.o, ctx), k = ev(node.i, ctx);
        if (!Array.isArray(a)) throw new Error('Only an array can be indexed');
        if (k < 0 || k >= a.length) throw new Error('The index ' + k + ' is out of range');
        return a[k];
      }
      return call(node.name, node.args, ctx);
    }
    function call(name, args, ctx) {
      var n = name.toLowerCase();
      function A(i) { if (i >= args.length) throw new Error("The function '" + name + "' needs more arguments"); return ev(args[i], ctx); }
      function S(i) { var v = A(i); if (typeof v !== 'string') throw new Error("The function '" + name + "' expects a string"); return v; }
      function N(i) { var v = A(i); if (typeof v !== 'number') throw new Error("The function '" + name + "' expects a number"); return v; }
      switch (n) {
        case 'pipeline': return { parameters: ctx.params, TriggerTime: ctx.time, Pipeline: 'pl_orders_daily', DataFactory: 'adf-brewline-prod' };
        case 'item': return ctx.item;
        case 'activity': { var an = S(0); if (!(an in ctx.act)) throw new Error("The activity '" + an + "' has not run"); return ctx.act[an]; }
        case 'concat': return args.map(function (x) { return toStr(ev(x, ctx)); }).join('');
        case 'formatdatetime': { var d = parseTs(S(0)); return args.length > 1 ? fmt(d, S(1)) : iso(d); }
        case 'adddays': case 'addhours': case 'addminutes': case 'addseconds': {
          var base = parseTs(S(0)), amt = N(1), mult = { adddays: 86400000, addhours: 3600000, addminutes: 60000, addseconds: 1000 }[n], r = new Date(base.getTime() + amt * mult);
          return args.length > 2 ? fmt(r, S(2)) : iso(r);
        }
        case 'startofday': { var d3 = parseTs(S(0)), r3 = new Date(Date.UTC(d3.getUTCFullYear(), d3.getUTCMonth(), d3.getUTCDate())); return args.length > 1 ? fmt(r3, S(1)) : iso(r3); }
        case 'substring': { var s = S(0), st = N(1), ln = N(2); if (st < 0 || ln < 0 || st + ln > s.length) throw new Error("The function 'substring' has a start or a length that is out of range"); return s.substr(st, ln); }
        case 'replace': return S(0).split(S(1)).join(S(2));
        case 'tolower': return S(0).toLowerCase();
        case 'toupper': return S(0).toUpperCase();
        case 'trim': return S(0).trim();
        case 'length': { var v = A(0); if (typeof v === 'string' || Array.isArray(v)) return v.length; throw new Error("The function 'length' expects a string or an array"); }
        case 'split': return S(0).split(S(1));
        case 'first': { var f = A(0); return Array.isArray(f) ? f[0] : f[0]; }
        case 'last': { var l = A(0); return l[l.length - 1]; }
        case 'string': { var x = A(0); return typeof x === 'string' ? x : JSON.stringify(x); }
        case 'int': { var y = A(0); if (typeof y === 'number') return Math.trunc(y); if (typeof y === 'string' && /^-?\d+$/.test(y)) return parseInt(y, 10); throw new Error("The function 'int' cannot convert '" + toStr(y) + "'"); }
        case 'if': return A(0) === true ? A(1) : A(2);
        case 'equals': return A(0) === A(1);
        case 'greater': return A(0) > A(1);
        case 'less': return A(0) < A(1);
        case 'and': return A(0) === true && A(1) === true;
        case 'or': return A(0) === true || A(1) === true;
        case 'not': return A(0) !== true;
        case 'coalesce': { for (var i = 0; i < args.length; i++) { var c = A(i); if (c !== null && c !== undefined) return c; } return null; }
        case 'add': return N(0) + N(1);
        case 'sub': return N(0) - N(1);
        case 'mul': return N(0) * N(1);
        case 'div': { var q = N(0) / N(1); return (Math.floor(N(0)) === N(0) && Math.floor(N(1)) === N(1)) ? Math.trunc(q) : q; }
        case 'mod': return N(0) % N(1);
        default: throw new Error("The function '" + name + "' does not exist in this lab");
      }
    }
    function evaluate(text, time) {
      var ctx = { params: PARAMS, time: time, item: ITEM, act: ACT };
      try {
        if (text.indexOf('@@') === 0) return { ok: true, v: text.slice(1) };
        if (text.charAt(0) === '@' && text.charAt(1) !== '{') return { ok: true, v: ev(parse(tokenize(text.slice(1))), ctx) };
        var out = '', i = 0;
        for (;;) {
          var j = text.indexOf('@{', i);
          if (j < 0) { out += text.slice(i); break; }
          out += text.slice(i, j);
          var k = j + 2, depth = 1, inq = false;
          for (; k < text.length; k++) {
            var ch = text.charAt(k);
            if (inq) { if (ch === "'") { if (text.charAt(k + 1) === "'") k++; else inq = false; } }
            else if (ch === "'") inq = true;
            else if (ch === '{') depth++;
            else if (ch === '}') { depth--; if (!depth) break; }
          }
          if (depth) throw new Error("The '@{' that starts at character " + (j + 1) + ' is never closed with }');
          out += toStr(ev(parse(tokenize(text.slice(j + 2, k))), ctx));
          i = k + 1;
        }
        return { ok: true, v: out };
      } catch (e) { return { ok: false, error: e.message }; }
    }
    function show(r) { return r.ok ? (typeof r.v === 'string' ? r.v : JSON.stringify(r.v)) : r.error; }

    var EX = [
      { l: 'a folder for the run date', e: "@concat('raw/orders/dt=', formatDateTime(pipeline().parameters.run_date, 'yyyy-MM-dd'))", n: 'The parameter is a plain string. formatDateTime reads it as a date and writes it again with a pattern. concat joins the pieces.' },
      { l: 'year, month and day folders', e: "@formatDateTime(pipeline().TriggerTime, 'yyyy/MM/dd')", n: 'TriggerTime is the time the trigger fired. A schedule trigger gives the planned time, not the time the run began.' },
      { l: 'yesterday', e: "@formatDateTime(addDays(pipeline().TriggerTime, -1), 'yyyy-MM-dd')", n: 'addDays moves across month and year ends for you. Try the second and third trigger time.' },
      { l: 'the minutes mistake', e: "@formatDateTime(pipeline().TriggerTime, 'yyyy-mm-dd')", n: 'MM is the month and mm is the minute. The lower-case pattern does not fail. It writes the minutes into the month.' },
      { l: 'the default format', e: '@formatDateTime(pipeline().TriggerTime)', n: 'With no pattern you get the round-trip format with seven decimals, which is not what most folder names want.' },
      { l: 'full or incremental', e: "@if(equals(item().kind, 'full'), 'TRUNCATE', 'MERGE')", n: 'item() is the current element of a ForEach. The function if takes a test and two results.' },
      { l: 'a query with a quote inside', e: "@concat('SELECT * FROM ', item().schema, '.', item().table, ' WHERE modified_at > ''', activity('GetWatermark').output.firstRow.last_value, '''')", n: 'Inside a string, two single quotes make one. The result holds one quote before and one after the watermark.' },
      { l: 'the same query with holes', e: "SELECT * FROM @{item().schema}.@{item().table} WHERE modified_at > '@{activity('GetWatermark').output.firstRow.last_value}'", n: 'Text with @{ } holes is easier to read. The text outside the holes stays as it is, and there is no @ at the start.' },
      { l: 'a month from a date', e: '@substring(pipeline().parameters.run_date, 0, 7)', n: 'substring counts from zero and takes a length. A length that runs past the end fails.' },
      { l: 'a lower-case name', e: "@toLower(replace(pipeline().parameters.store, '-', '_'))", n: 'Functions nest from the inside out.' },
      { l: 'how many tables', e: "@length(split(pipeline().parameters.tables, ','))", n: 'split makes an array from a string. length counts it.' },
      { l: 'the first table', e: "@first(split(pipeline().parameters.tables, ','))", n: 'first takes the first element. You can also write [0] after split(...).' },
      { l: 'count with a number', e: '@string(add(int(pipeline().parameters.n), 1))', n: 'Parameters of type String stay strings. int turns the text into a number, and string turns the sum back into text.' },
      { l: 'a parameter that is not there', e: "@coalesce(pipeline().parameters.region, 'ALL')", n: 'coalesce picks the first value that is not null, but it cannot rescue a property that does not exist. The expression fails before coalesce runs.' },
      { l: 'a literal at sign', e: '@@{pipeline().Pipeline}', n: 'Start with two at signs to get one at sign in plain text. Nothing is evaluated.' },
      { l: 'a forgotten at sign', e: 'pipeline().parameters.run_date', n: 'Without the leading @ the whole value is plain text. The pipeline would write these characters, not the date.' },
      { l: 'a missing bracket', e: "@concat('a', 'b'", n: 'The parser reports the missing bracket. The Data Factory editor shows the same kind of message when you publish.' }
    ];
    W.adfexpr = {
      steps: function () { return 2; },
      hint: 'Pick an expression and a trigger time. Read the result.',
      say: function (s, i) {
        return [
          'Dynamic content is the most used skill in Data Factory, and it is where most small mistakes hide. This is a small model of the expression language, written from the documented functions. Pick an expression and a trigger time. The trigger time matters at the end of a month and a year.',
          'These are the ones that cost people an afternoon. Each row was evaluated by the model just now. The editor in Data Factory is the final word, so test with a debug run.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.ex || (A.local.ex = { e: 0, t: 0 }), h = '<div class="lab">';
        if (i === 0) {
          var x = EX[st.e], r = evaluate(x.e, TIMES[st.t]);
          h += '<div class="lab-row"><span class="lab-l">Expression</span><div class="sel-chips">' + chips(EX.map(function (q, k) { return k; }), st.e, 'ex-e', function (k) { return EX[k].l; }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">Trigger time</span><div class="sel-chips">' + chips(TIMES.map(function (q, k) { return k; }), st.t, 'ex-t', function (k) { return TIMES[k]; }) + '</div></div>' +
            '<div class="compiled-h">In the pipeline JSON</div><div class="expr">' + esc('"value": "' + x.e.replace(/"/g, '\\"') + '"') + '</div>' +
            '<div class="compiled-h">The result</div><div class="expr ' + (r.ok ? 'res' : 'err') + '">' + esc(show(r)) + '</div>' +
            '<div class="callout tip">' + md(x.n) + '</div>' +
            '<p class="lab-note">Parameters in this lab: run_date = ' + esc(PARAMS.run_date) + ', store = ' + esc(PARAMS.store) + ', tables = ' + esc(PARAMS.tables) + ', n = ' + esc(PARAMS.n) + '. The ForEach item is ' + esc(JSON.stringify(ITEM)) + '. The Lookup GetWatermark returned ' + esc(ACT.GetWatermark.output.firstRow.last_value) + '.</p>';
        } else {
          var pick = [3, 14, 15, 13, 16, 12];
          h += table(['Expression', 'Result in the model', 'The lesson'], pick.map(function (k) { var rr = evaluate(EX[k].e, TIMES[0]); return ['`' + EX[k].e + '`', (rr.ok ? '' : 'error: ') + show(rr), EX[k].n]; }), function (r) { return /^error/.test(r[1]) || r[1].indexOf('-00-') >= 0 ? 'dup' : ''; }) +
            '<div class="callout warn"><b>Quote it, test it.</b> Put the same expression in a debug run with a small input before you trust it, and keep the pattern of a date in one place, a pipeline parameter or a variable, so that it is wrong in one place and not twenty.</div>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { var v = +el.getAttribute('data-v'); if (act === 'ex-e') st.e = v; if (act === 'ex-t') st.t = v; A.render(true); };
      }
    };
    W.exprInfo = { evaluate: evaluate, examples: EX, times: TIMES, params: PARAMS, item: ITEM, show: show };
  })();

  /* ====================== Incremental load: three watermark strategies ====================== */
  (function () {
    function t(s) { return s.replace('2026-03-14 ', ''); }
    W.watermark = {
      steps: function () { return 2; },
      hint: 'Pick a strategy and step through the runs.',
      say: function (s, i) {
        return [
          'Six orders in a source table. One of them, O3, was stamped at 08:58 but committed at 09:03, after the first run had started. Two others, O4 and O5, share one timestamp and were committed a fraction of a second apart. Pick a strategy and a run, and watch which rows get loaded. I ran all three in DuckDB.',
          'The three strategies side by side. The first pipeline most teams write is B. It loses a row for good, and nothing fails, so nobody notices until a number is wrong.'
        ][i];
      },
      mood: function (s, i) { return i === 1 ? 'oops' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.wm || (A.local.wm = { s: 'B', r: 3 }), h = '<div class="lab">', WM = G.counts('adf.watermark'), S = WM.strategies;
        if (i === 0) {
          var cur = S[st.s], readBy = {};
          cur.runs.slice(0, st.r).forEach(function (run, n) { run.reads.forEach(function (id) { (readBy[id] = readBy[id] || []).push(n + 1); }); });
          var rows = WM.source.map(function (r) {
            var got = readBy[r.order_id], status = got ? 'read in run ' + got.join(' and ') : (st.r === 3 ? '**never read**' : 'not read yet');
            return [r.order_id, t(r.modified_at), t(r.committed_at), status];
          });
          var run = cur.runs[st.r - 1];
          h += '<div class="lab-row"><span class="lab-l">Strategy</span><div class="sel-chips">' + chips(['A', 'B', 'C'], st.s, 'wm-s', function (k) { return 'strategy ' + k; }) + '</div></div>' +
            '<div class="callout tip">' + esc(cur.rule) + '</div>' +
            '<div class="lab-row"><span class="lab-l">Run</span><div class="sel-chips">' + chips([1, 2, 3], st.r, 'wm-r', function (k) { return 'run ' + k + ' at ' + t(WM.runs[k - 1]); }) + '</div></div>' +
            table(['Order', 'Modified at', 'Committed at', 'Status after this run'], rows, function (r) { return /never/.test(r[3]) ? 'dup' : /read in/.test(r[3]) ? 'new' : ''; }) +
            '<div class="lab-out"><div class="big"><b>' + run.reads.join(', ') + '</b><span>read by run ' + st.r + '</span></div><div class="big"><b>' + t(run.watermark_after.replace(/\.000000$/, '')) + '</b><span>watermark after the run</span></div>' +
            '<div class="big ' + (st.r === 3 ? (cur.missing.length ? 'bad' : 'good') : '') + '"><b>' + (st.r === 3 ? (cur.missing.length ? cur.missing.join(', ') : 'none') : 'run 3 shows it') + '</b><span>rows missing from the target at the end</span></div></div>';
        } else {
          h += table(['Strategy', 'Rule', 'Rows read in three runs', 'Missing at the end'], ['A', 'B', 'C'].map(function (k) { return [k, S[k].rule, String(S[k].rows_read_in_total), S[k].missing.length ? S[k].missing.join(', ') : 'none']; }),
            function (r, n) { return S[['A', 'B', 'C'][n]].missing.length ? 'dup' : 'new'; }) +
            '<div class="callout tip">Strategy C reads three rows twice, nine reads for six rows. That is the price of an overlap, and an upsert by key (a merge, or <code>writeBehavior: upsert</code> in the copy sink) makes the repeats harmless. Strategy B reads fewest rows and loses O3 and O5.</div>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'wm-s') st.s = v; if (act === 'wm-r') st.r = +v; A.render(true); };
      }
    };
  })();

  /* ====================== Synapse serverless: which files does a wildcard read ====================== */
  (function () {
    var SCALES = [1, 1000];
    var MIN = 10e6, RATE = 5.0, TB = 1e12;      /* example rate: $5 for each TB processed, rounded up to the next MB, 10 MB minimum for each query. Decimal units. */
    function billed(bytes) { return Math.max(MIN, Math.ceil(bytes / 1e6) * 1e6); }
    function cost(bytes) { return billed(bytes) / TB * RATE; }
    function files(layout) {
      var out = [], first = new Date(Date.UTC(2026, 0, 14));
      if (layout === 'one') return ['orders_one/orders.parquet'];
      for (var d = 0; d < 60; d++) {
        var t = new Date(first.getTime() + d * 86400000), y = t.getUTCFullYear(), m = ('0' + (t.getUTCMonth() + 1)).slice(-2), dd = ('0' + t.getUTCDate()).slice(-2);
        out.push(layout === 'hive' ? 'orders_hive/year=' + y + '/month=' + m + '/day=' + dd + '/part-0.parquet' : 'orders_flat/orders_' + y + '-' + m + '-' + dd + '.parquet');
      }
      return out;
    }
    function rx(pattern) { return new RegExp('^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '([^/]*)') + '$'); }
    function layoutOf(pattern) { return pattern.indexOf('orders_hive') === 0 ? 'hive' : pattern.indexOf('orders_flat') === 0 ? 'flat' : 'one'; }
    function match(c) {
      var r = rx(c.pattern), hit = [];
      files(layoutOf(c.pattern)).forEach(function (f, n) {
        var m = r.exec(f);
        if (!m) return;
        if (c.filter && c.filter.function === 'filepath' && m[c.filter.n] !== c.filter.value) return;
        if (c.filter && c.filter.function === 'filename' && f.split('/').pop().indexOf(c.filter.value) !== 0) return;
        hit.push(n);
      });
      return hit;
    }
    function sql(c) {
      var where = c.filter ? '\nWHERE ' + (c.filter.function === 'filepath' ? "r.filepath(" + c.filter.n + ") = '" + c.filter.value + "'" : "r.filename() LIKE '" + c.filter.value + "%'") : '';
      return "SELECT COUNT(*) AS orders, SUM(total_eur) AS revenue_eur\nFROM OPENROWSET(\n  BULK 'https://stbrewlinelakeprod.dfs.core.windows.net/curated/" + c.pattern + "',\n  FORMAT = 'PARQUET') AS r" + where;
    }
    W.prune = {
      steps: function () { return 2; },
      hint: 'Pick a query. See which files are opened.',
      say: function (s, i) {
        return [
          'The same sixty days of orders, as Parquet files, in three layouts. A serverless SQL pool opens the files that its wildcard names. Pick a query and look at the tiles: orange tiles are opened and grey tiles are skipped. The counts and sizes are recorded from real files. Which files match a wildcard is the documented rule, applied to the real file names.',
          'Now the price. A serverless pool bills for data processed, and a query that reads two columns of a Parquet file only processes those columns. At this size every query costs the minimum. Make the table a thousand times bigger and the layout starts to matter.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.pr || (A.local.pr = { c: 'p2', scale: 1 }), h = '<div class="lab">', P = G.counts('synapse.prune').cases, L = G.counts('synapse.layouts');
        function get(id) { return P.filter(function (x) { return x.id === id; })[0]; }
        if (i === 0) {
          var c = get(st.c), hit = match(c), lay = layoutOf(c.pattern), all = files(lay), set = {};
          hit.forEach(function (n) { set[n] = 1; });
          var wc = c.filter && c.filter.function === 'filepath' ? 'The wildcard names all 60 files. The filter on <code>filepath(' + c.filter.n + ')</code> lets the pool skip the folders that do not match, so it opens only ' + c.files + '.' : c.filter ? 'The wildcard names all 60 files. The filter on <code>filename()</code> lets the pool skip the files that do not match, so it opens only ' + c.files + '.' : (c.files === 60 ? 'Every file matches, so every file is opened.' : c.files === 1 && lay === 'one' ? 'One file holds all sixty days. The pool opens it whatever the dates in the query. Parquet statistics can help inside the file, but the file is opened.' : 'The wildcard itself names the ' + c.files + ' files. The pool never lists the others.');
          h += '<div class="lab-row"><span class="lab-l">Query</span><div class="sel-chips">' + chips(P.map(function (x) { return x.id; }), st.c, 'pr-c', function (k) { return k + ': ' + get(k).label; }) + '</div></div>' +
            code('T-SQL on Synapse serverless', 'tsql', sql(c)) +
            '<div class="lab-out"><div class="big ' + (c.files <= 14 ? 'good' : c.files >= 60 ? 'bad' : '') + '"><b>' + c.files + ' of ' + (lay === 'one' ? 1 : 60) + '</b><span>files opened</span></div><div class="big"><b>' + mb(c.bytes_of_files) + '</b><span>in the opened files</span></div><div class="big"><b>' + mb(c.bytes_of_two_columns) + '</b><span>in the two columns the query needs</span></div><div class="big"><b>' + fmtN(c.rows) + '</b><span>rows in the opened files</span></div></div>' +
            '<div class="skipgrid">' + (lay === 'one' ? '<div class="skf ' + (set[0] ? 'read' : 'skipped') + '"><b>orders.parquet</b><span>' + mb(L.one.bytes) + ', ' + L.one.row_groups + ' row groups</span></div>' : all.map(function (f, n) { var d = f.match(/(\d\d)[-/.]?(?:day=)?(\d\d)?/); var parts = lay === 'hive' ? f.match(/month=(\d\d)\/day=(\d\d)/) : f.match(/-(\d\d)-(\d\d)\.parquet/); return '<div class="skf ' + (set[n] ? 'read' : 'skipped') + '"><b>' + parts[2] + '</b><span>' + parts[1] + '</span></div>'; }).join('')) + '</div>' +
            '<div class="callout tip">' + wc + '</div>' +
            '<p class="lab-note">Tiles show day and month. The recorded layouts: ' + L.hive.files + ' daily files in year, month and day folders (' + mb(L.hive.bytes) + '), the same ' + L.flat.files + ' files in one folder (' + mb(L.flat.bytes) + '), and one sorted file (' + mb(L.one.bytes) + ', ' + fmtN(L.rows) + ' rows). The pattern rule: a * matches any text inside one path segment, and filepath(n) returns what the nth * matched.</p>';
        } else {
          h += '<div class="lab-row"><span class="lab-l">Scale</span><div class="sel-chips">' + chips(SCALES, st.scale, 'pr-x', function (k) { return +k === 1 ? 'this table (600,000 rows)' : 'a table ' + fmtN(+k) + ' times bigger'; }) + '</div></div>' +
            table(['Query', 'Files opened', 'Processed (two columns)', 'Billed', 'Cost for one run'], P.map(function (x) { var b = x.bytes_of_two_columns * st.scale; return [x.id + ': ' + x.label, String(x.files), mb(b), mb(billed(b), 0), usd(cost(b))]; }), null,
              function (r, ri, ci) { if (ci !== 4) return ''; var mn = Math.min.apply(null, P.map(function (x) { return cost(x.bytes_of_two_columns * st.scale); })); return cost(P[ri].bytes_of_two_columns * st.scale) <= mn * 1.0001 ? 'wgood' : ''; }) +
            '<div class="callout tip">The example rate is $5 for each TB processed, rounded up to the next MB, with a 10 MB minimum for each query. At this size every query pays the minimum, so the layouts look the same. At a thousand times the size, a month of folders reads about one fortieth of the data of a full scan. A daily file is <b>' + mb(L.avg_day_file_bytes) + '</b> here and <b>' + mb(L.avg_day_file_bytes * 1000, 0) + '</b> at that scale, which is a better size. The rate is an example, and Microsoft changes prices.</div>';
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'pr-c') st.c = v; if (act === 'pr-x') st.scale = +v; A.render(true); };
      }
    };
    W.pruneInfo = { match: match, files: files, billed: billed, cost: cost, min: MIN, rate: RATE, tb: TB };
  })();

  /* ====================== Dedicated SQL pool: 60 distributions ====================== */
  (function () {
    var COLS = ['order_id', 'customer_id', 'order_date', 'store_id', 'status', 'channel', 'product_id'];
    function bars(list, mx, maxIdx) {
      return '<div class="dist">' + list.map(function (n, k) { return '<i title="distribution ' + (k + 1) + ': ' + fmtN(n) + ' rows" class="' + (n === 0 ? 'empty' : k === maxIdx ? 'max' : '') + '" style="height:' + Math.max(2, Math.round(n / mx * 100)) + '%"></i>'; }).join('') + '</div>';
    }
    /* what moves for a join on customer_id between a big fact table and a customer table, from the documented rules */
    function move(fact, dim) {
      if (dim === 'REPLICATED') return { move: 'none', big: false, why: 'Every compute node already holds a full copy of the customer table, so each node joins its own part of the fact table. Nothing moves.' };
      if (fact === 'HASH(customer_id)' && dim === 'HASH(customer_id)') return { move: 'none', big: false, why: 'Both tables are hashed on the join column, so rows with the same customer sit on the same distribution. The join is local.' };
      if (fact === 'HASH(customer_id)' && dim !== 'HASH(customer_id)') return { move: 'the small table moves', big: false, why: 'The fact table is already placed by customer. The optimizer moves the customer table (a shuffle on customer_id or a broadcast), and it is the smaller side.' };
      if (dim === 'HASH(customer_id)') return { move: 'the big table may move', big: true, why: 'The customer table is placed by customer, but the fact table is not. The pool must line the two up. It can broadcast the small table, or shuffle the fact table on customer_id, and it picks by its estimate of the cost. With missing or old statistics it may shuffle the big side, and that is the expensive case. Check the plan.' };
      return { move: 'rows of one or both tables move', big: true, why: 'Neither side is placed by the join column, so the pool shuffles rows to line up the keys before it can join.' };
    }
    W.distribution = {
      steps: function () { return 3; },
      hint: 'Pick how the table is spread. Read the bars.',
      say: function (s, i) {
        return [
          'A dedicated SQL pool always stores a table in 60 distributions. HASH picks the distribution from one column, so the choice of column is the choice of how even the 60 are. I took the 600,000 Brewline orders and spread them with a stand-in hash, because Synapse does not publish its own. Pick a column and read the 60 bars.',
          'Now a join. The orders table joins to customers on customer_id. Pick how each table is spread, and see whether the pool must move rows before it can join. Movement is the thing that makes a warehouse query slow.',
          'Why did customer_id come out lopsided? A few customers order far more than the rest, and every order of one customer lands on one distribution. This table ranks the columns from the real data.'
        ][i];
      },
      mood: function (s, i) { return i === 2 ? 'oops' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.ds || (A.local.ds = { how: 'HASH(customer_id)', fact: 'HASH(order_id)', dim: 'HASH(customer_id)' }), h = '<div class="lab">', D = G.counts('dedicated.distribution');
        if (i === 0) {
          var how = st.how, col = how.indexOf('HASH(') === 0 ? how.slice(5, -1) : null, rec = col ? D.by_column[col] : null;
          h += '<div class="sel-chips">' + chips(COLS.map(function (c) { return 'HASH(' + c + ')'; }).concat(['ROUND_ROBIN', 'REPLICATED']), how, 'ds-h') + '</div>';
          if (rec) {
            var mx = Math.max(rec.max, 1), maxIdx = rec.buckets.indexOf(rec.max);
            h += '<div class="dist-wrap">' + bars(rec.buckets.slice(0, 30), mx, maxIdx < 30 ? maxIdx : -1) + bars(rec.buckets.slice(30), mx, maxIdx >= 30 ? maxIdx - 30 : -1) + '</div>' +
              '<div class="lab-out"><div class="big ' + (rec.skew <= 2 && !rec.empty ? 'good' : rec.skew > 4 || rec.empty > 20 ? 'bad' : 'warn') + '"><b>' + rec.skew.toFixed(2) + 'x</b><span>the busiest distribution against the average of ' + fmtN(rec.avg) + ' rows</span></div><div class="big ' + (rec.empty ? 'bad' : 'good') + '"><b>' + rec.empty + ' of 60</b><span>distributions with no rows</span></div><div class="big"><b>' + fmtN(rec.max) + '</b><span>rows in the busiest one</span></div><div class="big"><b>' + fmtN(rec.distinct) + '</b><span>different values in the column</span></div></div>' +
              '<div class="callout ' + (rec.skew <= 2 && !rec.empty ? 'good' : 'warn') + '">' + (col === 'order_id' ? 'Every value is different, so the rows spread almost perfectly. But order_id is rarely the join column, which is the next screen.' : rec.empty ? 'Only ' + rec.distinct + ' different values, so at most ' + rec.distinct + ' of the 60 distributions can hold rows. The rest stay empty, and the same few compute slices do all the work. A low-cardinality column is the wrong hash column.' : col === 'customer_id' ? 'Twelve thousand customers fill every distribution, but a few customers order a lot, and each customer sits on one distribution. The busiest one holds ' + rec.skew.toFixed(2) + ' times the average.' : 'Check both numbers. Skew shows the heaviest distribution, and empty ones show wasted slices.') + '</div>';
          } else if (how === 'ROUND_ROBIN') {
            h += '<div class="dist-wrap">' + bars(Array(30).fill(D.rows / 60), D.rows / 60, -1) + bars(Array(30).fill(D.rows / 60), D.rows / 60, -1) + '</div>' +
              '<div class="lab-out"><div class="big good"><b>1.00x</b><span>rows are dealt out one after another</span></div><div class="big good"><b>0 of 60</b><span>distributions with no rows</span></div><div class="big warn"><b>moves</b><span>a join on any column has to shuffle</span></div></div>' +
              '<div class="callout tip">Round robin spreads evenly by design and loads fast, so it suits a staging table. It knows nothing about the key, so almost every join moves rows. This bar chart is by definition, not measured.</div>';
          } else {
            h += '<div class="lab-out"><div class="big good"><b>1 copy</b><span>on every compute node</span></div><div class="big good"><b>none</b><span>a join to it needs no movement</span></div><div class="big warn"><b>small only</b><span>the documentation says tables under 2 GB</span></div></div>' +
              '<div class="callout tip">A replicated table keeps a full copy on each compute node. Joins to it move nothing, so small dimension tables are replicated. A change to it rebuilds the copies, so it suits tables that rarely change. The size guidance comes from the documentation.</div>';
          }
        } else if (i === 1) {
          var mv = move(st.fact, st.dim);
          h += '<div class="lab-row"><span class="lab-l">Orders (big)</span><div class="sel-chips">' + chips(['HASH(customer_id)', 'HASH(order_id)', 'ROUND_ROBIN'], st.fact, 'ds-f') + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">Customers (small)</span><div class="sel-chips">' + chips(['HASH(customer_id)', 'REPLICATED', 'ROUND_ROBIN'], st.dim, 'ds-d') + '</div></div>' +
            code('T-SQL on a dedicated pool', 'tsql', 'SELECT c.region, SUM(o.total_eur) AS revenue_eur\nFROM dbo.fct_orders AS o\nJOIN dbo.dim_customers AS c ON c.customer_id = o.customer_id\nGROUP BY c.region') +
            '<div class="lab-out"><div class="big ' + (mv.move === 'none' ? 'good' : mv.big ? 'bad' : 'warn') + '"><b>' + esc(mv.move) + '</b><span>before the join can run</span></div></div>' +
            '<div class="callout tip">' + esc(mv.why) + '</div>' +
            '<p class="lab-note">Rules from the documentation. EXPLAIN on a pool shows the movement steps as ShuffleMoveOperation or BroadcastMoveOperation. The pool decides which side to move, so read the plan.</p>';
        } else {
          var ranks = COLS.map(function (c) { return [c, D.by_column[c]]; }).sort(function (a, b) { return a[1].skew - b[1].skew; });
          h += table(['Column', 'Different values', 'Skew', 'Empty of 60', 'Verdict'], ranks.map(function (r) { var v = r[1]; return [r[0], fmtN(v.distinct), v.skew.toFixed(2) + 'x', String(v.empty), v.skew <= 2 && !v.empty ? 'spreads well' : v.empty > 20 ? 'too few values' : 'skewed']; }), function (r) { return r[4] === 'spreads well' ? 'new' : 'dup'; }) +
            '<p class="lab-note">Top customers by orders: ' + D.top_customers.map(function (c) { return c.id + ' (' + fmtN(c.orders) + ')'; }).join(', ') + ', out of ' + fmtN(D.customers) + ' customers and ' + fmtN(D.rows) + ' orders. ' + esc(D.stand_in_hash) + '</p>' +
            '<div class="callout tip">The usual advice: hash on a column that is used in joins and in GROUP BY, has many values, has no value that dominates, and is not used in equality filters. If no column passes, round robin plus a replicated dimension is a safe start. Test with the real data, and use the distribution views to check.</div>';
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'ds-h') st.how = v; if (act === 'ds-f') st.fact = v; if (act === 'ds-d') st.dim = v; A.render(true); };
      }
    };
    W.distInfo = { move: move, cols: COLS };
  })();

  /* ====================== Event Hubs: batches, owners, checkpoints ====================== */
  (function () {
    var BLOBS = function () { return G.counts('eventhubs.checkpoints').blobs; };
    function replayed(k, crash) { return crash - Math.floor(crash / k) * k; }
    W.ehub = {
      steps: function () { return 3; },
      hint: 'Step through the three screens.',
      say: function (s, i) {
        return [
          'An Event Hubs client sends events in batches, and a batch has a size limit. I filled batches with the real client class, with no connection, and counted what fits. The fixed cost of each event is small, but with a partition key it grows. Pick a limit, a payload and a key.',
          'Several readers share one event hub, and each one needs to know which partitions are its own and where it stopped. The checkpoint store keeps that in blobs. Step through four calls I made to the real store, on the emulator. The ETag is what stops two readers from taking one partition.',
          'A checkpoint says where to restart. If a reader crashes between two checkpoints, the new reader repeats the events since the last one, so every event is processed at least once. Pick how often to checkpoint and read the trade.'
        ][i];
      },
      mood: function (s, i) { return i === 2 ? 'oops' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.eh || (A.local.eh = { limit: 1048576, payload: 1000, key: false, step: 0, k: 100 }), h = '<div class="lab">', B = G.counts('eventhubs.batch'), C = G.counts('eventhubs.checkpoints');
        if (i === 0) {
          var row = B.rows.filter(function (r) { return r.limit_bytes === st.limit && r.payload_bytes === st.payload; })[0], n = st.key ? row.events_with_key : row.events_in_batch;
          h += '<div class="lab-row"><span class="lab-l">Batch limit</span><div class="sel-chips">' + chips(B.limits, st.limit, 'eh-l', function (k) { return +k === 262144 ? '256 KB (Basic)' : '1 MB (Standard and above)'; }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">Event body</span><div class="sel-chips">' + chips([100, 1000, 10000, 100000, 240000, 300000], st.payload, 'eh-p', function (k) { return mb(+k, 0); }) + '</div></div>' +
            '<div class="lab-row"><span class="lab-l">Partition key</span><div class="sel-chips">' + chips([0, 1], st.key ? 1 : 0, 'eh-k', function (k) { return +k ? 'set (C-0001)' : 'not set'; }) + '</div></div>' +
            code('azure-eventhub', 'python', "batch = EventDataBatch(max_size_in_bytes=" + st.limit + (st.key ? ", partition_key='C-0001'" : '') + ")\nbatch.add(EventData(b'x' * " + st.payload + "))   # until ValueError") +
            '<div class="lab-out"><div class="big ' + (n === 0 ? 'bad' : '') + '"><b>' + fmtN(n) + '</b><span>events fit in one batch</span></div><div class="big"><b>' + (n ? fmtN(Math.ceil(1e6 / n)) : 'never') + '</b><span>batches to send a million events</span></div><div class="big"><b>' + (row.overhead_each_later_event_bytes === null ? (row.overhead_first_event_bytes === null ? 'none' : row.overhead_first_event_bytes + ' B') : row.overhead_each_later_event_bytes + ' B') + '</b><span>of framing for each event</span></div></div>' +
            '<div class="callout ' + (n === 0 ? 'warn' : 'tip') + '">' + (n === 0 ? 'One event of ' + mb(st.payload, 0) + ' does not fit a batch of ' + mb(st.limit, 0) + '. The client raises <code>ValueError</code> on the first add. Split the event, or store the body in a blob and send its path.' : st.key ? 'The partition key travels with every event as the annotation <code>' + Object.keys(B.partition_key_travels_as)[0] + '</code>. For 100-byte events that costs about ' + Math.round((1 - B.with_partition_key_events / B.without_partition_key_events) * 100) + ' events in every hundred: ' + fmtN(B.without_partition_key_events) + ' fit without a key and ' + fmtN(B.with_partition_key_events) + ' with it.' : 'Each event carries a few bytes of framing, so small events pay the most. Batch many small events into one call, as a single call for each event is slow and costs more.') + '</div>' +
            '<p class="lab-note">The limits of the tiers come from the documentation. The service reports its limit to the client when you ask the client for a batch. Here the limit is given by hand so that no connection is needed.</p>';
        } else if (i === 1) {
          var stages = [
            { t: 'Worker A claims all four partitions', owners: ['worker-A', 'worker-A', 'worker-A', 'worker-A'], cp: null, msg: 'Each claim writes the blob <code>ownership/N</code> with the owner id in its metadata. The store returned all four claims, with an ETag for each.' },
            { t: 'Worker B tries to take partition 1 with a stale ETag', owners: ['worker-A', 'worker-A', 'worker-A', 'worker-A'], cp: null, msg: 'The claim used an ETag that is not the current one of the blob, so the store refused it and returned an empty list: <b>' + JSON.stringify(C.stale_etag_claim_returned) + '</b>. Worker A keeps partition 1.' },
            { t: 'Worker B claims partition 1 with the current ETag', owners: ['worker-A', 'worker-B', 'worker-A', 'worker-A'], cp: null, msg: 'The right ETag matches, so the claim is accepted: <b>' + esc(JSON.stringify(C.right_etag_claim_returned)) + '</b>. This is how the readers balance the load: the new reader takes partitions one at a time, by a conditional write.' },
            { t: 'Worker A saves a checkpoint for partition 0', owners: ['worker-A', 'worker-B', 'worker-A', 'worker-A'], cp: C.checkpoints[0], msg: 'The checkpoint is one more blob, <code>checkpoint/0</code>, with the offset and the sequence number in its metadata. The recording saved offset 4096, then offset 8192, and the second one replaced the first.' }
          ];
          var cur = stages[st.step];
          h += '<div class="sel-chips">' + chips(stages.map(function (x, k) { return k; }), st.step, 'eh-s', function (k) { return 'call ' + (+k + 1); }) + '</div>' +
            '<div class="callout tip"><b>' + esc(cur.t) + '.</b> ' + cur.msg + '</div>' +
            table(['Blob in the container', 'Metadata'], cur.owners.map(function (o, k) { return ['`<namespace>/orders/$default/ownership/' + k + '`', 'ownerid = ' + o]; }).concat(cur.cp ? [['`<namespace>/orders/$default/checkpoint/0`', 'offset = ' + cur.cp.offset + ', sequencenumber = ' + cur.cp.sequence_number]] : []), function (r, k) { return (st.step >= 2 && k === 1) ? 'new' : ''; }) +
            '<p class="lab-note">Recorded with azure-eventhub-checkpointstoreblob ' + esc(G.meta('azure-eventhub-checkpointstoreblob')) + ' against Azurite. The names under the namespace are the real blob names.</p>';
        } else {
          var crash = 2547, rep = replayed(st.k, crash), writes = Math.ceil(1000000 / st.k);
          h += '<div class="lab-row"><span class="lab-l">Checkpoint after every</span><div class="sel-chips">' + chips([1, 10, 100, 1000], st.k, 'eh-c', function (k) { return k + ' event' + (+k === 1 ? '' : 's'); }) + '</div></div>' +
            '<div class="lab-out"><div class="big"><b>' + fmtN(crash - rep) + '</b><span>last checkpoint before the crash at event ' + fmtN(crash) + '</span></div><div class="big ' + (rep === 0 ? 'good' : rep > 100 ? 'bad' : 'warn') + '"><b>' + fmtN(rep) + '</b><span>events the next reader processes a second time</span></div><div class="big ' + (writes > 100000 ? 'bad' : 'good') + '"><b>' + fmtN(writes) + '</b><span>checkpoint writes for a million events</span></div></div>' +
            '<div class="callout tip">With a checkpoint after every event nothing repeats, but the reader writes a blob for each event, and that is a request to storage each time. With one after every thousand, the cost is small and up to 999 events can come twice. Pick the interval from how cheap a repeat is, and make the handler safe to repeat either way.</div>';
        }
        box.innerHTML = h + '</div>';
        bindCodes(box);
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'eh-l') st.limit = +v;
          if (act === 'eh-p') st.payload = +v;
          if (act === 'eh-k') st.key = !!+v;
          if (act === 'eh-s') st.step = +v;
          if (act === 'eh-c') st.k = +v;
          A.render(true);
        };
      }
    };
    W.ehInfo = { replayed: replayed, blobs: BLOBS };
  })();

  /* ====================== Storage queue: visibility timeout and a poison queue ====================== */
  (function () {
    W.queue = {
      steps: function () { return 2; },
      hint: 'Step through the timeline. Find the message.',
      say: function (s, i) {
        return [
          'One message, a visibility timeout of one second and a limit of three tries that the client enforces. A worker takes the message and crashes without deleting it. Step through what the queue does. This is a real run against the emulator. A storage queue has no built-in dead-letter queue, so the client moves the message.',
          'Two more things you will meet: the pop receipt that proves you hold the latest copy of a message, and the size limit of 64 KB.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.qu || (A.local.qu = { n: 0 }), h = '<div class="lab">', R = G.counts('queue.redrive');
        if (i === 0) {
          var tl = R.timeline, e = tl[st.n], moved = /poison/.test(e.action || '');
          h += '<div class="sel-chips">' + chips(tl.map(function (x, k) { return k; }), st.n, 'qu-n', function (k) { return 'about ' + tl[k].t + ' s'; }) + '</div>' +
            '<div class="callout tip"><b>Receive number ' + (st.n + 1) + '.</b> The call returned the message, and its dequeue count is <b>' + e.dequeue_count + '</b>. ' + esc(e.action) + '. A second reader asking at the same moment got ' + (e.second_reader_got_it ? 'the message too' : 'nothing, because the message is hidden') + '.</div>' +
            '<div class="qrow"><div class="qbox ' + (!moved ? 'here' : '') + '"><b>Hidden for ' + R.visibility_timeout_seconds + ' s</b><span>' + (!moved ? 'the worker holds it, and nobody else can see it' : 'deleted from this queue') + '</span></div>' +
            '<div class="qbox ' + (st.n > 0 && !moved ? 'ready' : '') + '"><b>Visible again</b><span>' + (st.n > 0 && !moved ? 'it came back, with the count raised' : 'not yet') + '</span></div>' +
            '<div class="qbox dl ' + (moved ? 'here' : '') + '"><b>Poison queue</b><span>' + (moved ? 'dequeue count ' + e.dequeue_count + ' is above the limit of ' + R.max_dequeue_count + ', so the client copied the message here' : 'empty') + '</span></div></div>' +
            '<div class="lab-out"><div class="big"><b>' + R.visibility_timeout_seconds + ' s</b><span>visibility timeout</span></div><div class="big"><b>' + R.max_dequeue_count + '</b><span>tries the client allows</span></div><div class="big ' + (moved ? 'good' : '') + '"><b>' + (moved ? 'in the poison queue' : 'in the main queue') + '</b><span>where the message is now</span></div></div>' +
            '<p class="lab-note">At the end the main queue holds ' + R.main_queue_after + ' messages and the poison queue holds <code>' + esc(R.poison_body) + '</code>. A worker that deletes the message after the work stops this chain: in a second run the deleted message was ' + (G.counts('queue.delete').received_again_after_timeout ? '' : 'not ') + 'received again. Azure Functions does the poison step for you, with a limit of 5 by default and a queue named with <code>-poison</code>.</p>';
        } else {
          var E = G.counts('queue.errors');
          h += table(['What I did', 'Answer', 'HTTP'], [
            ['Deleted a message with an old pop receipt', '`' + E.stale_pop_receipt.code + '`', String(E.stale_pop_receipt.status)],
            ['Sent a message of ' + fmtN(E.message_limit_chars_sent) + ' characters', '`' + E.too_large.code + '`', String(E.too_large.status)],
            ['Sent to a queue that does not exist', '`' + E.missing_queue.code + '`', String(E.missing_queue.status)]
          ]) +
            '<div class="callout tip">The message kept the same id on every delivery (' + (E.same_id_on_redelivery ? 'recorded' : 'not recorded') + '), and the dequeue count rose: ' + E.dequeue_counts_seen.join(', ') + '. Each receive hands back a new pop receipt, and only the newest one can delete or update the message. The limit of 64 KB is documented, and the emulator enforced it.</div>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'qu-n') st.n = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== A month of Brewline on Azure: where the money goes ====================== */
  (function () {
    /* Example rates, rounded, for one region. They come from public price pages and third-party guides as found while this was written, and Microsoft changes them. */
    var RATE = { hotGB: 0.02, coolGB: 0.01, write10k: 0.06, read10k: 0.005, adfRun1k: 1.0, diu: 0.25, vcore: 0.274, tb: 5, dwu100: 1.2, tuHour: 0.03, evMillion: 0.028, laGB: 2.3, egressGB: 0.087, freeGB: 100, kv10k: 0.03, peHour: 0.01, peGB: 0.01 };
    var USE = { gb: 40000, writes: 30e6, reads: 200e6, runs: 40000, diuHours: 600, vcoreHours: 160, tb: 25, dwu: 500, hours: 720, tus: 4, evM: 1000, laGB: 600, egressGB: 1500, kvOps: 2e6, pes: 8, peGB: 5000 };
    var SAVE = [
      { k: 'life', n: 'Move 70 percent of the old lake data to Cool with a lifecycle rule' },
      { k: 'pause', n: 'Pause the dedicated pool for 12 hours each day' },
      { k: 'logs', n: 'Send only the useful diagnostic logs, 40 percent of today\'s volume' },
      { k: 'parquet', n: 'Query Parquet instead of CSV in serverless, one fifth of the data' },
      { k: 'batch', n: 'Write files in batches of ten times as many events, one tenth of the write operations' }
    ];
    function lines(sv) {
      sv = sv || {};
      var gb = USE.gb, storage = sv.life ? gb * 0.3 * RATE.hotGB + gb * 0.7 * RATE.coolGB : gb * RATE.hotGB;
      var writes = sv.batch ? USE.writes / 10 : USE.writes;
      var hours = sv.pause ? USE.hours / 2 : USE.hours;
      return [
        ['Lake storage, 40 TB', storage],
        ['Storage operations', writes / 1e4 * RATE.write10k + USE.reads / 1e4 * RATE.read10k],
        ['Data Factory', USE.runs / 1000 * RATE.adfRun1k + USE.diuHours * RATE.diu + USE.vcoreHours * RATE.vcore],
        ['Synapse serverless, 25 TB processed', (sv.parquet ? USE.tb / 5 : USE.tb) * RATE.tb],
        ['Synapse dedicated pool, 500 DWU', USE.dwu / 100 * RATE.dwu100 * hours],
        ['Event Hubs, 4 throughput units', USE.tus * USE.hours * RATE.tuHour + USE.evM * RATE.evMillion],
        ['Log Analytics, 600 GB ingested', (sv.logs ? USE.laGB * 0.4 : USE.laGB) * RATE.laGB],
        ['Data out to the internet, 1.5 TB', (USE.egressGB - RATE.freeGB) * RATE.egressGB],
        ['Key Vault operations', USE.kvOps / 1e4 * RATE.kv10k],
        ['Private endpoints, 8', USE.pes * USE.hours * RATE.peHour + USE.peGB * RATE.peGB]
      ];
    }
    function total(l) { return l.reduce(function (a, r) { return a + r[1]; }, 0); }
    W.bill = {
      steps: function () { return 2; },
      hint: 'Find the biggest line. Then switch the savings on.',
      say: function (s, i) {
        return [
          'A made-up month for Brewline Europe, at example rates. This is arithmetic on rules from the documentation, not a quote. Look for the biggest line before you read anything else. Two lines are usually most of it: a compute resource that runs all day, and a log workspace that takes everything.',
          'Five savings, each one a real lever. Switch them on one by one. They do not overlap here, so the total falls by the sum. In your own bill, change one thing at a time and measure.'
        ][i];
      },
      mood: function (s, i) { return i === 0 ? 'wow' : 'cheer'; },
      render: function (box, s, i, A) {
        var st = A.local.bl || (A.local.bl = { sv: {} }), h = '<div class="lab">';
        var base = lines({}), now = lines(st.sv), t0 = total(base), t1 = total(now), mx = Math.max.apply(null, base.map(function (r) { return r[1]; }));
        if (i === 0) {
          h += '<div class="gantt">' + base.map(function (r) { return '<div class="lane"><span class="lane-n lane-wide">' + esc(r[0]) + '</span><div class="lane-track"><div class="gbar ' + (r[1] === mx ? 'bad' : '') + '" style="left:0;width:' + Math.max(1, Math.round(r[1] / mx * 100)) + '%"></div></div><span class="lane-v">' + usd(r[1]) + '</span></div>'; }).join('') + '</div>' +
            '<div class="lab-out"><div class="big"><b>' + usd(t0) + '</b><span>the month</span></div><div class="big bad"><b>' + fmtN(base.filter(function (r) { return r[1] === mx; }).length ? mx / t0 * 100 : 0, 0) + ' %</b><span>of it is the biggest line</span></div></div>' +
            '<div class="callout warn">The biggest line is a pool that bills for every hour it exists, whether or not a query runs. Pausing stops the compute charge and leaves the data in place. A log workspace is the other usual surprise, because diagnostic settings send everything unless you choose.</div>';
        } else {
          h += '<div class="sel-chips">' + SAVE.map(function (x) { return '<button type="button" class="sel-chip' + (st.sv[x.k] ? ' yes' : '') + '" data-act="bl-s" data-v="' + x.k + '">' + (st.sv[x.k] ? 'on: ' : 'off: ') + esc(x.n) + '</button>'; }).join('') + '</div>' +
            table(['Line', 'Today', 'With the savings', 'Saved'], base.map(function (r, k) { return [r[0], usd(r[1]), usd(now[k][1]), usd(r[1] - now[k][1])]; }), null, function (r, ri, ci) { return ci === 3 && base[ri][1] - now[ri][1] > 0.005 ? 'wgood' : ''; }) +
            '<div class="lab-out"><div class="big"><b>' + usd(t0) + '</b><span>today</span></div><div class="big good"><b>' + usd(t1) + '</b><span>with the savings you switched on</span></div><div class="big good"><b>' + usd(t0 - t1) + '</b><span>saved each month</span></div></div>' +
            '<p class="lab-note">Cool storage charges more for reads and has a minimum time. A paused pool still costs its storage. Check the minimum time, the retrieval fee and what you lose before you switch a real saving on. The rates are examples, and Microsoft changes them.</p>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'bl-s') st.sv[v] = st.sv[v] ? 0 : 1; A.render(true); };
      }
    };
    W.billInfo = { lines: lines, total: total, rate: RATE, use: USE, save: SAVE };
  })();
})();
