/* Lab widgets for the IAM, Cloud Storage and BigQuery missions. Each one registers LAB.W.<kind>.
   Every number a lab shows comes from js/real.js, which gcp/verify/capture_gcp.py wrote after running real open-source tools on one machine: the Cloud Storage
   client on an emulator, a signed URL made offline, BigQuery SQL run in DuckDB, and more. Nothing here ran on Google Cloud. A lab that only does arithmetic,
   or applies rules from the documentation, says so on screen. Prices are examples. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var W = (LAB.W = LAB.W || {});
  var esc = LAB.esc, md = LAB.md, H = LAB.H, G = LAB.get;

  function chips(list, cur, act, fmt) {
    return list.map(function (k) {
      return '<button type="button" class="sel-chip' + (String(k) === String(cur) ? ' on' : '') + '" data-act="' + act + '" data-v="' + esc(String(k)) + '">' + esc(fmt ? fmt(k) : String(k)) + '</button>';
    }).join('');
  }
  function toggles(list, set, act, fmt) {
    return list.map(function (k) {
      return '<button type="button" class="sel-chip' + (set[k] ? ' on yes' : '') + '" data-act="' + act + '" data-v="' + esc(String(k)) + '">' + (set[k] ? 'on: ' : 'off: ') + esc(fmt ? fmt(k) : String(k)) + '</button>';
    }).join('');
  }
  function row(label, inner) { return '<div class="lab-row"><span class="lab-l">' + esc(label) + '</span><div class="sel-chips">' + inner + '</div></div>'; }
  function table(cols, rows, rowCls, cellCls) {
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r, ri) { return '<tr class="' + (rowCls ? rowCls(r, ri) || '' : '') + '">' + r.map(function (c, ci) { return '<td class="' + (cellCls ? cellCls(r, ri, ci) || '' : '') + '">' + md(String(c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function fmtN(x, d) { return (Math.round(x * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function usd(x) { return '$' + (x >= 100 ? fmtN(x, 0) : x >= 1 ? fmtN(x, 2) : x >= 0.01 ? fmtN(x, 3) : x === 0 ? '0' : x.toPrecision(2)); }
  function gib(n) { return n >= 1024 ? fmtN(n / 1024, 2) + ' TiB' : n >= 1 ? fmtN(n, 2) + ' GiB' : fmtN(n * 1024, 1) + ' MiB'; }
  function big(b, span, cls) { return '<div class="big' + (cls ? ' ' + cls : '') + '"><b>' + b + '</b><span>' + span + '</span></div>'; }
  function bar(label, v, max, text, cls) {
    var pc = max > 0 ? Math.max(0, Math.min(100, v / max * 100)) : 0;
    return '<div class="lane"><span class="lane-n lane-wide">' + esc(label) + '</span><div class="lane-track"><div class="gbar' + (cls ? ' ' + cls : '') + '" style="left:0;width:' + pc + '%">&nbsp;</div></div><span class="lane-v">' + esc(text) + '</span></div>';
  }
  function callout(k, t) { return '<div class="callout ' + k + '">' + md(t) + '</div>'; }
  W._h = { chips: chips, toggles: toggles, row: row, table: table, fmtN: fmtN, usd: usd, gib: gib, big: big, bar: bar, callout: callout };

  /* ====================== IAM: who can read this table ====================== */
  (function () {
    var LEVELS = ['organization', 'folder', 'project', 'dataset', 'table'];
    var ROLES = { none: 'no role', viewer: 'bigquery.dataViewer', editor: 'bigquery.dataEditor', jobuser: 'bigquery.jobUser', admin: 'bigquery.admin' };
    /* a small subset of what each role holds: from the documentation of the predefined roles, shortened for the lesson */
    var HOLDS = {
      viewer: ['bigquery.tables.get', 'bigquery.tables.getData', 'bigquery.tables.list'],
      editor: ['bigquery.tables.get', 'bigquery.tables.getData', 'bigquery.tables.list', 'bigquery.tables.create', 'bigquery.tables.updateData', 'bigquery.tables.delete'],
      jobuser: ['bigquery.jobs.create'],
      admin: ['bigquery.tables.get', 'bigquery.tables.getData', 'bigquery.tables.list', 'bigquery.tables.create', 'bigquery.tables.updateData', 'bigquery.tables.delete', 'bigquery.jobs.create']
    };
    function state(A) { return A.local.iam || (A.local.iam = { b: { organization: 'none', folder: 'none', project: 'none', dataset: 'none', table: 'none' }, deny: false }); }
    function perms(st, level) {
      /* permissions that reach a resource: the roles granted on the resource and on every level above it */
      var out = {}, upto = LEVELS.indexOf(level);
      LEVELS.slice(0, upto + 1).forEach(function (l) { (HOLDS[st.b[l]] || []).forEach(function (p) { out[p] = l; }); });
      return out;
    }
    W.iam = {
      steps: function () { return 2; },
      hint: 'Grant a role at a level. Watch where it reaches, and what is still missing.',
      say: function (s, i) {
        return [
          'A role granted on a level reaches everything below it. Grant the analysts a role on the table, on the dataset, on the project, even on the folder, and read what they can do. The table says where each permission comes from. These roles and permissions are a shortened list from the documentation.',
          'Reading data is one thing and running a query is another. A query is a job, and a job needs its own permission in the project that runs it. Try the viewer role alone, then add the job user role. Then switch on a deny policy and see that it wins.'
        ][i];
      },
      mood: function (s, i) { return i ? 'think' : 'happy'; },
      render: function (box, s, i, A) {
        var st = state(A), h = '<div class="lab">';
        var tp = perms(st, 'table'), pp = perms(st, 'project');
        var canRead = !!tp['bigquery.tables.getData'], canRun = !!pp['bigquery.jobs.create'];
        if (i === 0) {
          h += LEVELS.map(function (l) { return row(l, chips(['none', 'viewer', 'editor', 'admin'], st.b[l], 'iam-' + l, function (k) { return ROLES[k]; })); }).join('');
        } else {
          h += row('on the table', chips(['none', 'viewer'], st.b.table, 'iam-table', function (k) { return ROLES[k]; })) +
            row('on the project', chips(['none', 'jobuser'], st.b.project, 'iam-project', function (k) { return ROLES[k]; })) +
            row('deny policy on the dataset', chips(['off', 'on'], st.deny ? 'on' : 'off', 'iam-deny'));
        }
        var rows = ['bigquery.tables.getData', 'bigquery.tables.updateData', 'bigquery.jobs.create'].map(function (p) {
          var from = (p === 'bigquery.jobs.create' ? pp : tp)[p];
          return [p, from ? 'allowed, from the ' + from : 'not granted'];
        });
        h += table(['Permission', 'Result for the analysts'], rows, function (r) { return /^allowed/.test(r[1]) ? 'new' : ''; });
        var verdict = st.deny ? 'refused by the deny policy' : canRead && canRun ? 'the query runs' : canRead ? 'refused: no permission to create a job' : canRun ? 'refused: no permission to read the table' : 'refused';
        h += '<div class="lab-out">' + big(verdict, 'SELECT * FROM curated.orders', st.deny || !(canRead && canRun) ? 'bad' : 'good') + '</div>';
        h += callout(st.deny ? 'warn' : canRead && !canRun ? 'warn' : 'tip', st.deny ? 'A **deny policy** is checked first and wins over every allow. Use it for a rule that must hold whatever somebody grants later.' :
          canRead && !canRun ? 'The viewer role lets them read the table, but a query is a **job**, and creating a job needs `bigquery.jobs.create` in the project that runs it. Grant the job user role on the project, and read access on the dataset or table.' :
            canRead && canRun ? 'Both halves are there: read on the data, and a job permission on the project. Notice that the **widest** grant wins in reach. A role on the folder reaches every project in it.' :
              'Nothing reaches the table yet. Grant a role on the table, the dataset, the project or higher.');
        h += '<p class="lab-note">Rules from the documentation: allow roles are added up along the hierarchy, deny policies win, and the roles shown hold only a shortened list of permissions. Nothing here called Google Cloud.</p>';
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'iam-deny') st.deny = v === 'on';
          else if (act.indexOf('iam-') === 0) st.b[act.slice(4)] = v;
          A.render(true);
        };
      }
    };
  })();

  /* ====================== A bucket has no folders ====================== */
  (function () {
    W.listing = {
      steps: function () { return 1; },
      hint: 'Pick a prefix and a delimiter. The names in the bucket do not change.',
      say: function () { return 'A bucket holds objects, and an object name is one string with slashes in it. A prefix and a delimiter in the listing call make those names look like folders. Pick a call and read what comes back. This ran on an emulator with the real client library.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var T = G.table('gcs.listing'), st = A.local.ls || (A.local.ls = { c: 1 }), r = T.rows[st.c];
        var h = '<div class="lab">' + row('Listing call', chips(T.rows.map(function (x, n) { return n; }), st.c, 'ls-c', function (n) { return 'prefix ' + T.rows[n][0] + ', delimiter ' + T.rows[n][1]; })) +
          '<div class="lab-out">' + big(r[2], 'objects returned') + big(r[4] === '-' ? 'none' : r[4].split(', ').length, '"folders" returned (prefixes)') + '</div>' +
          table(['Objects returned', 'Prefixes returned'], [[r[3].split(', ').join('<br>'), r[4].split(', ').join('<br>')]]) +
          callout('tip', r[1] === '(none)' ? 'With **no delimiter** the listing is flat: every object under the prefix, however deep. On a bucket with millions of objects this is the expensive call.' :
            r[2] > 0 ? 'The names under this prefix have no further slash, so they come back as **objects**. Nothing is a folder: the console draws them as one.' : 'Names that go on after the next slash are not listed one by one. Their common start is returned once, as a **prefix**, and that is what the console shows as a folder.') +
          '<p class="lab-note">Recorded with google-cloud-storage ' + esc(G.meta('google-cloud-storage')) + ' on the emulator gcp-storage-emulator ' + esc(G.meta('gcp-storage-emulator')) + '. The emulator is not Cloud Storage.</p></div>';
        box.innerHTML = h;
        A.bindWidget = function (act, el) { if (act === 'ls-c') st.c = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== A signed URL ====================== */
  (function () {
    var CASES = [
      ['nothing', 'Use the URL as it is'],
      ['name', 'Change the object name'],
      ['expiry', 'Ask for a longer expiry'],
      ['late', 'Use it after the 15 minutes']
    ];
    W.signed = {
      steps: function () { return 2; },
      hint: 'Read the parts of the URL, then try to bend it.',
      say: function (s, i) {
        return [
          'A signed URL is an ordinary link with six extra parts. Nothing is sent to Google to make it: the library signs a text with the private key of a service account, and Cloud Storage checks the signature when somebody uses the link. This one was made offline with a throwaway key.',
          'The signature covers the method, the path, the date, the expiry and the signed headers. Change any of them and the signature no longer fits. Try each change, then read the text that was signed.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var C = G.counts('gcs.signed'), P = G.table('gcs.signed_params'), st = A.local.sg || (A.local.sg = { c: 'nothing' }), h = '<div class="lab">';
        if (i === 0) {
          h += '<p class="lab-note"><code>' + esc(G.text('gcs.signed_host_path')) + '</code></p>' + table(P.cols, P.rows) +
            '<div class="lab-out">' + big(C.expires_seconds + ' s', 'how long it works') + big(C.signature_hex_chars, 'hex characters of signature') + big(C.network_used ? 'yes' : 'no', 'network used to make it', 'good') + '</div>';
        } else {
          var ok = st.c === 'nothing' ? C.verified_with_public_key : st.c === 'name' ? C.other_object_name_verifies : st.c === 'expiry' ? C.longer_expiry_verifies : false;
          h += row('What you do', chips(CASES.map(function (c) { return c[0]; }), st.c, 'sg-c', function (k) { return CASES.filter(function (c) { return c[0] === k; })[0][1]; })) +
            '<div class="lab-out">' + big(ok ? 'valid' : 'refused', 'the signature check', ok ? 'good' : 'bad') + '</div>' +
            callout(st.c === 'late' ? 'warn' : ok ? 'good' : 'tip', st.c === 'nothing' ? 'The text rebuilt from the URL matches what was signed, and the public key of the service account confirms it. **Recorded.**' :
              st.c === 'name' ? 'The path is part of the signed text, so the new object name gives another text and the signature fails. **Recorded.** A URL cannot be pointed at another file.' :
                st.c === 'expiry' ? 'The expiry is a parameter, and the parameters are signed too. Make it longer and the signature fails. **Recorded.** Only the holder of the key can issue a longer one.' :
                  'Cloud Storage adds the expiry to the date in the URL and refuses a request after that moment. This check is **from documentation**: the recording has no clock to wait on.') +
            '<details class="more"><summary>The text that was signed</summary><pre class="code-plain">' + esc(G.text('gcs.signed_to_sign')) + '</pre></details>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'sg-c') st.c = el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== File formats ====================== */
  (function () {
    var PROPS = {
      'CSV': 'No types and no schema. Quoted line breaks make a file hard to split. Every reader parses the whole row.',
      'CSV, gzip': 'Smaller, but gzip cannot be split, so one reader gets the whole file.',
      'JSON lines': 'Handles nested data. Every row repeats every name, which is why it is the largest here.',
      'JSON lines, gzip': 'Smaller on disk. Gzip cannot be split.',
      'Avro (no compression)': 'Rows with the schema inside the file, so a load needs no schema from you. Good for streams and for nested data.',
      'Avro (deflate)': 'The same, with blocks compressed. Blocks can still be read in parallel.',
      'Parquet (no compression)': 'Columns with the schema and statistics inside. A reader can skip columns and row groups.',
      'Parquet (snappy)': 'The common default: fast to read and about 3 to 4 times smaller than CSV here.',
      'Parquet (zstd)': 'Smaller than snappy, a little more CPU. A good choice for data that is read often.',
      'ORC (zstd)': 'Columns, like Parquet, from the Hive world. BigQuery loads it too.'
    };
    W.format = {
      steps: function () { return 2; },
      hint: 'Compare the sizes, then choose which columns to read.',
      say: function (s, i) {
        return [
          'The same 100,000 orders written six ways. Row formats keep each order together. Column formats keep each column together. Pick a format and read how big it is next to the CSV. These are real files, written on this machine. The sizes depend on the data, so read the direction and not the digits.',
          'A column format lets a reader take only the columns it needs. Parquet keeps a size for each column chunk. Choose the columns of a query and read the share of the file that has to be fetched. A CSV or a JSON file gives no such choice.'
        ][i];
      },
      mood: function () { return 'happy'; },
      render: function (box, s, i, A) {
        var T = G.table('formats.sizes'), K = G.counts('formats.column_read'), st = A.local.fm || (A.local.fm = { f: 'Parquet (snappy)', cols: { store_id: true, total_cents: true } }), h = '<div class="lab">';
        if (i === 0) {
          var max = Math.max.apply(null, T.rows.map(function (r) { return r[1]; })), r = T.rows.filter(function (x) { return x[0] === st.f; })[0];
          h += row('Format', chips(T.rows.map(function (x) { return x[0]; }), st.f, 'fm-f')) + T.rows.map(function (x) { return bar(x[0], x[1], max, fmtN(x[1] / 1e6, 2) + ' MB, ' + fmtN(x[2] * 100, 0) + '% of CSV', x[0] === st.f ? 'warn' : ''); }).join('') +
            callout('tip', '**' + esc(r[0]) + '**: ' + PROPS[r[0]]) + '<p class="lab-note">Recorded with pyarrow ' + esc(G.meta('pyarrow')) + ' and fastavro ' + esc(G.meta('fastavro')) + ' on ' + fmtN(K.rows) + ' made-up orders. Gzip level 6.</p>';
        } else {
          var names = Object.keys(K.column_chunk_bytes), total = names.reduce(function (a, c) { return a + K.column_chunk_bytes[c]; }, 0), pick = names.filter(function (c) { return st.cols[c]; }), got = pick.reduce(function (a, c) { return a + K.column_chunk_bytes[c]; }, 0);
          h += row('Columns the query reads', toggles(names, st.cols, 'fm-c')) + names.map(function (c) { return bar(c, K.column_chunk_bytes[c], Math.max.apply(null, names.map(function (n) { return K.column_chunk_bytes[n]; })), fmtN(K.column_chunk_bytes[c] / 1000, 0) + ' KB', st.cols[c] ? 'warn' : ''); }).join('') +
            '<div class="lab-out">' + big(fmtN(got / 1000, 0) + ' KB', 'fetched from a Parquet file of ' + fmtN(K.file_bytes / 1000, 0) + ' KB') + big(fmtN(total ? got / total * 100 : 0, 1) + '%', 'of the column data', got / total < 0.5 ? 'good' : 'warn') + '</div>' +
            callout('tip', pick.length ? 'The sizes are the **compressed bytes of each column** in the file. A CSV or JSON reader must read every byte of every row, so it would fetch **100%**. The timestamp column is the heaviest here, because every value is different.' : 'Choose at least one column.');
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'fm-f') st.f = v; if (act === 'fm-c') st.cols[v] = !st.cols[v]; A.render(true); };
      }
    };
  })();

  /* ====================== The bytes a query reads ====================== */
  (function () {
    W.bytes = {
      steps: function () { return 2; },
      hint: 'Pick a query. Read the columns, the partitions and the bytes.',
      say: function (s, i) {
        return [
          'BigQuery bills an on-demand query for the bytes it reads, not for the rows it returns. These are eleven queries on the same orders table, pictured at 20,000 times the size of the sample. The bytes are our estimate from the documented size of each data type, and only a dry run in BigQuery gives your real number.',
          'One query is a few cents. A schedule multiplies it. Pick how often the query runs and compare the month with the narrowest version of the same question. The rate is an example. Check the price page of your region before you promise a number.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var T = G.table('sql.estimates'), D = G.counts('sql.estimate_detail'), R = G.counts('sql.estimate_rules'), st = A.local.by || (A.local.by = { q: 0, f: 24 }), h = '<div class="lab">';
        var r = T.rows[st.q], d = D[r[0]], max = Math.max.apply(null, T.rows.map(function (x) { return x[4]; })), TIB = Math.pow(1024, 4);
        if (i === 0) {
          h += row('Query', chips(T.rows.map(function (x, n) { return n; }), st.q, 'by-q', function (n) { return T.rows[n][0]; })) + '<div class="code-box">' + H.code({ file: 'query.sql', lang: 'sql', code: d.sql }) + '</div>' +
            '<div class="lab-out">' + big(r[2], 'partitions read') + big(d.columns.length + ' of 10', 'columns read') + big(gib(r[4] / Math.pow(1024, 3)), 'billed, at 20,000 times the sample', r[4] === max ? 'bad' : 'good') + big(usd(r[5]), 'one run, at an example rate') + '</div>' +
            T.rows.map(function (x, n) { return bar(x[0], x[4], max, gib(x[4] / Math.pow(1024, 3)), n === st.q ? 'warn' : ''); }).join('') +
            '<p class="lab-note">Columns read: ' + esc(d.columns.join(', ')) + '. Rule used: ' + esc(R.billing_rounding) + '. Clustering is not modelled: on a clustered table a dry run gives an upper bound.</p>';
        } else {
          var narrow = T.rows[5], cost = r[5] * st.f * 30, costN = narrow[5] * st.f * 30;
          h += row('Runs per day', chips([1, 24, 288], st.f, 'by-f', function (k) { return k + (k === 288 ? ' (every 5 minutes)' : k === 24 ? ' (hourly)' : ''); })) +
            '<div class="lab-out">' + big(usd(cost), 'a month of "' + esc(r[0]) + '"', cost > 100 ? 'bad' : cost > 10 ? 'warn' : 'good') + big(usd(costN), 'a month of "' + esc(narrow[0]) + '"', 'good') + big(fmtN(costN > 0 ? cost / costN : 0, 1) + ' times', 'the difference') + '</div>' +
            callout('tip', 'The query is the same question. The narrow version names three columns and asks for **one Singapore day** with two bounds on the partition column. The wide one reads everything. At **' + st.f + '** runs a day, the gap is a line on the invoice.') +
            '<p class="lab-note">Example rate: ' + usd(R.example_price_per_tib_usd) + ' per TiB scanned. Sizes at ' + fmtN(R.scale) + ' times the sample (' + fmtN(G.counts('sql.world').scaled_orders / 1e6) + ' million orders). Arithmetic on an estimate, not a quote.</p>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { var v = +el.getAttribute('data-v'); if (act === 'by-q') st.q = v; if (act === 'by-f') st.f = v; A.render(true); };
      }
    };
  })();

  /* ====================== On demand or capacity ====================== */
  (function () {
    var RATE_TIB = 6.25, RATE_SLOT_HOUR = 0.06;                       /* examples, not quotes */
    W.slots = {
      steps: function () { return 1; },
      hint: 'Change the scan and the busy hours. The cheaper side flips.',
      say: function () { return 'On demand you pay for bytes scanned. With capacity you pay for slots by the hour, whatever they scan. Choose how much your month scans, how many slots you need at the peak, and for how many hours a day. The two rates are examples for practice. This lab is arithmetic only.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.sl || (A.local.sl = { t: 100, p: 500, h: 8 }), od = st.t * RATE_TIB, cap = st.p * st.h * 30 * RATE_SLOT_HOUR, breakEven = cap / RATE_TIB;
        var h = '<div class="lab">' + row('TiB scanned in a month', chips([20, 100, 400, 1500], st.t, 'sl-t')) + row('Slots needed while busy', chips([100, 500, 2000], st.p, 'sl-p')) + row('Busy hours a day', chips([2, 8, 24], st.h, 'sl-h')) +
          '<div class="lab-out">' + big(usd(od), 'on demand, a month', od < cap ? 'good' : 'warn') + big(usd(cap), 'capacity, a month', cap < od ? 'good' : 'warn') + big(fmtN(breakEven, 0) + ' TiB', 'scanned a month where they cost the same') + '</div>' +
          callout('tip', od < cap ? 'At this volume **on demand is cheaper**: you scan too little to fill the slots you would buy. It also needs no planning.' : 'At this volume **capacity is cheaper**, and the cost no longer moves with a careless query. The price is that somebody must plan the slots, and a busy hour can queue.') +
          '<p class="lab-note">Example rates: ' + usd(RATE_TIB) + ' per TiB scanned and ' + usd(RATE_SLOT_HOUR) + ' per slot-hour, billed only for the hours used (autoscaling). Real editions, commitments and baselines change the sum. Read the price page. Arithmetic only.</p></div>';
        box.innerHTML = h;
        A.bindWidget = function (act, el) { var v = +el.getAttribute('data-v'); if (act === 'sl-t') st.t = v; if (act === 'sl-p') st.p = v; if (act === 'sl-h') st.h = v; A.render(true); };
      }
    };
  })();

  /* ====================== Five ways to load a batch ====================== */
  (function () {
    var NAMES = { append: 'INSERT (append)', merge: 'MERGE', merge_and_delete: 'MERGE with delete by source', overwrite_partition: 'Overwrite the partition', reload_all: 'Reload the whole table' };
    var NOTE = {
      append: 'The retry **doubles** the day. Append is safe only when something else removes repeats, and nothing here does.',
      merge: 'Safe to run twice, and it applies the corrected statuses and the new orders. It leaves the **8 orders that vanished at the source**, because nothing tells MERGE to delete them.',
      merge_and_delete: 'Correct in all three steps. The delete clause is **limited to the day**: without that condition, a partial batch would delete everything else.',
      overwrite_partition: 'Correct, and simple to reason about: delete the day, insert the day, in one transaction. It rewrites the whole day each time, which is fine for a day and wasteful for a year.',
      reload_all: 'Correct, and the most expensive: every run rewrites the whole table and reads the whole source. Fine for a small dimension, wrong for a fact table.'
    };
    W.idem = {
      steps: function () { return 1; },
      hint: 'Pick a method. Read each step and the number of wrong rows.',
      say: function () { return 'A pipeline will run twice some day: a timeout, a retry, a person pressing the button. Pick a load method and read three steps. The first run, the same batch again, and a corrected batch for the same day. The wrong rows are counted against what the table should hold. These ran in DuckDB, with the SQL translated from BigQuery.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var T = G.table('idem.runs'), world = G.counts('idem.world'), st = A.local.im || (A.local.im = { m: 'merge' });
        var rows = T.rows.filter(function (r) { return r[0] === st.m; }), wrong = rows[rows.length - 1][4], again = rows[1][4];
        var h = '<div class="lab">' + row('Method', chips(Object.keys(NAMES), st.m, 'im-m', function (k) { return NAMES[k]; })) +
          table(['Step', 'Rows in the table', 'Rows it should have', 'Rows wrong'], rows.map(function (r) { return [r[1], fmtN(r[2]), fmtN(r[3]), r[4]]; }), null, function (r, ri, ci) { return ci === 3 ? (r[3] === 0 ? 'wgood' : 'wbad') : ''; }) +
          '<div class="lab-out">' + big(again === 0 ? 'safe' : 'not safe', 'run twice', again === 0 ? 'good' : 'bad') + big(wrong === 0 ? 'right' : wrong, 'wrong rows after the correction', wrong === 0 ? 'good' : 'bad') + '</div>' +
          callout(wrong === 0 && again === 0 ? 'good' : 'warn', NOTE[st.m]) + '<div class="code-box">' + H.code({ file: 'load.sql', lang: 'sql', code: G.text('idem.sql.' + st.m) }) + '</div>' +
          '<p class="lab-note">The correction: ' + world.changed + ' orders changed status, ' + world.vanished + ' disappeared at the source and ' + world.new + ' are new, in a day of ' + fmtN(world.batch_rows) + ' orders. BigQuery SQL translated by sqlglot, run in DuckDB.</p></div>';
        box.innerHTML = h;
        A.bindWidget = function (act, el) { if (act === 'im-m') st.m = el.getAttribute('data-v'); A.render(true); };
        box.querySelectorAll('.code').forEach(function (c) { H.bindCode(c, c.textContent); });
      }
    };
  })();

  /* A scene can show only some steps of a lab: {kind: 'iam', parts: [0]}. The lab then sees its own step numbers. */
  LAB.partsWrap = function () {
    Object.keys(W).forEach(function (kind) {
      var w = W[kind];
      if (!w || typeof w.steps !== 'function' || w._parts) return;
      var steps = w.steps, say = w.say, mood = w.mood, render = w.render;
      function p(s, i) { return s && s.parts ? s.parts[i] : i; }
      w.steps = function (s) { return s && s.parts ? s.parts.length : steps(s); };
      w.say = function (s, i) { return say(s, p(s, i)); };
      w.mood = function (s, i) { return mood ? mood(s, p(s, i)) : 'happy'; };
      w.render = function (box, s, i, A, o) { return render(box, s, p(s, i), A, o); };
      w._parts = true;
    });
  };
  LAB.partsWrap();
})();
