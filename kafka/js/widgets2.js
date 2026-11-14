/* Lab widgets for the second half of the Apache Kafka course: Kafka Connect, change data capture, schemas, Kafka Streams, security, and running a cluster.
   Every number comes from js/real.js, written by kafka/verify/capture_kafka.py after running the real Apache Kafka 4.4.0 (three brokers on one machine), Kafka Connect, Kafka Streams, PostgreSQL with
   Debezium and Avro. A lab that applies a rule to recorded data, or only does arithmetic, says so on screen. Nothing here ran on a managed service, on Kubernetes or under real load. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var W = (LAB.W = LAB.W || {});
  var esc = LAB.esc, G = LAB.get, h$ = W._h;
  var chips = h$.chips, row = h$.row, table = h$.table, fmtN = h$.fmtN, mb = h$.mb, big = h$.big, bar = h$.bar, callout = h$.callout, pill = h$.pill, rec = h$.rec;

  /* ====================== Build a pipeline ====================== */
  (function () {
    W.connectlab = {
      steps: function () { return 2; },
      hint: 'Pick a converter, then pick how the sink treats a bad record.',
      say: function (s, i) {
        return [
          'A source connector reads twenty order lines from a file. The **converter** turns what Connect holds into bytes for the topic. Pick one, and see the first value exactly as Kafka stored it, and its size. All three ran on the same twenty lines.',
          'A sink reads a topic of eleven records: ten JSON orders and one line that is not JSON. Pick how the sink treats an error. Both ran for real. See where the records end up.'
        ][i];
      },
      mood: function (s, i) { return i ? 'oops' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.cn || (A.local.cn = { c: 0, e: 'none' }), h = '<div class="lab">';
        if (i === 0) {
          var T = G.table('connect.converters'), r = T.rows[st.c];
          h += row('Value converter', chips(T.rows.map(function (x, n) { return n; }), st.c, 'cn-c', function (n) { return T.rows[n][0]; }));
          h += '<div class="lab-out">' + big(fmtN(r[3]) + ' bytes', 'size of the first value', st.c === 0 ? 'good' : 'warn') + big(r[1], 'records in the topic') + '</div>';
          h += '<div class="lab-h">The first value, as Kafka stores it</div><div class="expr">' + esc(r[2]) + '</div>';
          h += callout(st.c === 0 ? 'tip' : 'warn', st.c === 0 ? 'The **StringConverter** stores the line exactly as it was in the file. A reader that expects JSON text gets JSON text.' : st.c === 1 ? 'The **JsonConverter** with schemas off wrote the line as a **JSON string**: wrapped in quotes, with every quote inside escaped. It is valid JSON, and it is not the order. A reader has to parse twice. **' + (r[3] - T.rows[0][3]) + ' bytes more** for the same line.' :
            'With **schemas on**, every record carries a schema **envelope** next to its payload: **' + (r[3] - T.rows[0][3]) + ' bytes more** for this line. A reader that expects the plain order sees a wrapper. This is one of the most common reasons that two Connect pipelines do not fit together.');
          h += '<p class="lab-note">' + pill('recorded', 'real') + ' Three source connectors on the real Connect worker read the same file. The first value of each topic is shown as it was stored, read back with a console consumer.</p>';
        } else {
          var strict = st.e === 'none', FT = G.counts('connect.failed_task'), DL = G.counts('connect.dead_letter');
          h += row('Error handling of the sink', chips(['none', 'all'], st.e, 'cn-e', function (x) { return x === 'none' ? 'errors.tolerance=none (the default)' : 'errors.tolerance=all, with a dead letter topic'; }));
          h += '<div class="qrow"><div class="qbox"><b>bad-lines</b><span>' + (strict ? FT.records_in_the_topic : DL.records_read_by_the_sink) + ' records: 10 JSON orders, and "' + esc(DL.dead_letter_value) + '"</span></div>' +
            '<div class="qbox ' + (strict ? 'here' : 'ready') + '"><b>sink task: ' + (strict ? FT.task_state : DL.task_state) + '</b><span>connector: ' + (strict ? FT.connector_state : 'RUNNING') + '</span></div>' +
            '<div class="qbox ' + (strict ? '' : 'ready') + '"><b>output file: ' + (strict ? FT.lines_written_before_it_failed : DL.lines_written) + ' lines</b><span>' + (strict ? 'nothing was written' : 'the ten good orders') + '</span></div>' +
            (strict ? '' : '<div class="qbox here"><b>bad-lines-dlq: ' + DL.records_in_the_dead_letter_topic + ' record</b><span>' + esc(DL.dead_letter_value) + '</span></div>') + '</div>';
          if (strict) h += callout('bad', 'The default is to **stop**. The task is **' + FT.task_state + '** while the connector still says **' + FT.connector_state + '**: a dashboard that shows only the connector sees nothing wrong. The first line of the trace: `' + esc(FT.first_line_of_the_trace) + '`.');
          else {
            h += callout('tip', 'With tolerance on, the sink wrote **' + DL.lines_written + '** lines and **kept running**. The bad record is in the dead letter topic, and its **headers** say where it came from: topic `' + DL.source_topic + '`, offset ' + DL.source_offset + ', stage `' + DL.stage + '`, and the exception.');
            h += '<div class="lab-h">Headers that the framework added</div>' + table(['Header'], DL.header_names.map(function (n) { return [n]; }));
          }
          h += '<p class="lab-note">' + pill('recorded', 'real') + ' Two sinks on the real Connect worker read the same topic of eleven records, with the two settings. Tolerating errors is a choice: somebody has to read the dead letter topic.</p>';
        }
        box.innerHTML = h$.fixNotes(h + '</div>');
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'cn-c') st.c = Number(v); else if (act === 'cn-e') st.e = v;
          A.render(true);
        };
      }
    };
  })();

  /* ====================== What an event says ====================== */
  (function () {
    function parse(t) { try { return JSON.parse(t); } catch (e) { return null; } }
    var STMTS = ['snapshot', 'INSERT', 'UPDATE', 'DELETE'];
    function event(stmt, ident) {
      var CH = G.table('cdc.changes').rows, RF = G.counts('cdc.replica_identity_full'), SN = parse(G.text('cdc.event_snapshot'));
      var j = function (x) { return x === 'null' ? null : parse(x); };
      if (stmt === 'snapshot') return { run: true, op: SN.op, before: SN.before, after: SN.after, note: 'A snapshot event is a **read**, `r`: the row as it is now, with no earlier version.' };
      if (stmt === 'INSERT') return { run: true, op: CH[0][2], before: j(CH[0][3]), after: j(CH[0][4]), note: 'A new row has **no old version**, so `before` is null, with either replica identity.' + (ident === 'full' ? ' (This recording ran with the default identity at that point. With FULL nothing changes for an insert.)' : '') };
      if (stmt === 'UPDATE' && ident === 'default') return { run: true, op: CH[1][2], before: j(CH[1][3]), after: j(CH[1][4]), note: 'With the default replica identity the log carries only the **key** of the old row. Debezium has nothing to put in `before`, so it is **null**.' };
      if (stmt === 'UPDATE') return { run: true, op: RF.op, before: RF.before, after: RF.after, note: 'With `REPLICA IDENTITY FULL` the whole old row is logged. `before` holds it: `total_cents` was **' + RF.before.total_cents + '** and is **' + RF.after.total_cents + '**.' };
      if (stmt === 'DELETE' && ident === 'default') return { run: true, op: CH[2][2], before: j(CH[2][3]), after: j(CH[2][4]), note: 'Only `order_id` is real. `store_id` is an empty string and `total_cents` is 0: the log carried only the key, and the connector filled in **empty values**. Do not trust them. A **tombstone** (same key, no value) follows.' };
      return { run: false, note: 'This case was **not run** with FULL in the recording. By the documentation, a delete would carry the **whole old row** in `before`, as the update does.' };
    }
    W.cdclab = {
      steps: function () { return 2; },
      hint: 'Pick a statement and the replica identity of the table, and read the event.',
      say: function (s, i) {
        return [
          'A row changes in PostgreSQL, and Debezium writes an event. Pick the statement, and the **replica identity** of the table, which decides how much of the old row the log carries. Read **op**, **before** and **after**. The cases that I ran show the real event. The others say that they were not run.',
          'A stopped connector makes the database keep its log. The recording measured how many bytes of log one row change needs. Pick a change rate and a time, and see how much log piles up. It is a multiplication from the recorded number.'
        ][i];
      },
      mood: function (s, i) { return i ? 'oops' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.cd || (A.local.cd = { s: 'UPDATE', id: 'default', r: 1000000, hr: 24 }), h = '<div class="lab">';
        if (i === 0) {
          var e = event(st.s, st.id), fmt = function (x) { return x === null ? 'null' : JSON.stringify(x, null, 1).replace(/\n\s*/g, ' '); };
          h += row('Statement', chips(STMTS, st.s, 'cd-s', function (x) { return x === 'snapshot' ? 'first start: snapshot' : x; }));
          h += row('Replica identity of the table', chips(['default', 'full'], st.id, 'cd-i', function (x) { return x === 'default' ? 'DEFAULT (the primary key)' : 'FULL'; }));
          if (e.run) {
            h += '<div class="lab-out">' + big(e.op, 'op: ' + { r: 'read (snapshot)', c: 'create', u: 'update', d: 'delete' }[e.op]) + big(e.before === null ? 'null' : 'a row', 'before: the old row', e.before === null && st.s !== 'INSERT' && st.s !== 'snapshot' ? 'warn' : '') + big(e.after === null ? 'null' : 'a row', 'after: the new row') + '</div>';
            h += '<div class="lab-h">before</div><div class="expr">' + esc(fmt(e.before)) + '</div><div class="lab-h">after</div><div class="expr">' + esc(fmt(e.after)) + '</div>';
            h += callout(e.before === null && st.s === 'UPDATE' ? 'warn' : 'tip', e.note);
            h += '<p class="lab-note">' + pill('recorded', 'real') + ' The real event from Debezium on PostgreSQL. The log position, the transaction id and the times are replaced by markers.</p>';
          } else {
            h += callout('warn', e.note);
            h += '<p class="lab-note">' + pill('not run', 'warn') + ' Nothing is shown for this case, because I did not run it.</p>';
          }
        } else {
          var WH = G.counts('cdc.wal_held_back'), per = WH.backlog_bytes_while_stopped / WH.rows_changed_while_stopped, held = st.r * st.hr * per, disk = 100 * 1073741824, fullHours = disk / (st.r * per);
          h += row('Row changes per hour', chips([100000, 1000000, 10000000], st.r, 'cd-r', function (x) { return fmtN(x); }));
          h += row('Hours that the connector is stopped', chips([1, 8, 24, 72], st.hr, 'cd-h'));
          h += '<div class="lab-out">' + big(fmtN(per) + ' bytes', 'of log for each row change (recorded)') + big(mb(held), 'log that the database must keep', held > 50 * 1073741824 ? 'bad' : held > 5 * 1073741824 ? 'warn' : 'good') + big(fmtN(fullHours, 1) + ' h', 'until a 100 GiB log disk is full', fullHours < st.hr ? 'bad' : '') + '</div>';
          h += bar('Log kept', Math.min(held, disk), disk, mb(held) + ' of 100 GiB', held > disk * 0.5 ? 'bad' : '');
          h += callout(fullHours < st.hr ? 'warn' : 'tip', fullHours < st.hr ? 'The disk fills **before** the connector is back. The database stops accepting writes. A cap such as `max_slot_wal_keep_size` makes the database drop the slot instead, and the connector then has to take a new snapshot.' : 'The log fits on the disk this time, and every row change that the connector missed is **kept**, so it can catch up without losing anything. Watch the size of the backlog and cap it.');
          h += '<p class="lab-note">' + pill('arithmetic', 'warn') + ' The recording stopped the connector and changed ' + fmtN(WH.rows_changed_while_stopped) + ' rows: the log held ' + fmtN(WH.backlog_bytes_while_stopped) + ' bytes, ' + fmtN(per) + ' for each change. The rest is a multiplication. Real rows differ in size.</p>';
        }
        box.innerHTML = h$.fixNotes(h + '</div>');
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'cd-s') st.s = v; else if (act === 'cd-i') st.id = v; else if (act === 'cd-r') st.r = Number(v); else if (act === 'cd-h') st.hr = Number(v);
          A.render(true);
        };
      }
    };
  })();

  /* ====================== Will the registry accept it? ====================== */
  (function () {
    var LABELS = ['add the field channel, with a default', 'add the field channel, no default', 'remove the field status', 'remove the field customer_id', 'rename total_cents to amount_cents', 'rename total_cents to amount_cents, with an alias',
      'widen total_cents', 'narrow order_id', 'make customer_id required'];
    var SHORT = ['add a field, with a default', 'add a field, no default', 'remove a field, no default', 'remove a field that has a default', 'rename a field', 'rename with an alias', 'widen int to long', 'narrow long to int', 'make a nullable field required'];
    function find(i) { return G.table('schemas.changes').rows.filter(function (r) { return r[0].indexOf(LABELS[i]) === 0 && (i !== 4 || !/alias/.test(r[0])); })[0]; }
    function accepts(r, mode) { var b = r[1] === 'yes', f = r[2] === 'yes'; return mode === 'NONE' ? true : mode === 'BACKWARD' ? b : mode === 'FORWARD' ? f : (b && f); }
    function recordedFlow(i, mode) {
      var F = G.table('schemas.registry_flow').rows, m = mode === 'BACKWARD' ? 1 : mode === 'FULL' ? 2 : 0;
      if (!m) return null;
      var at = { 0: 1, 1: 2, 2: 3 }[i];
      return at === undefined ? null : { offer: F[at][0], result: F[at][m] === 'refused' ? 'refused' : 'accepted, with id ' + F[at][m] };
    }
    W.schemalab = {
      steps: function () { return 2; },
      hint: 'Pick a change and a mode. Then pick who is upgraded first.',
      say: function (s, i) {
        return [
          'You change the schema of the orders and offer it to the registry. Pick the **change** and the **compatibility mode** of the subject. The results of the check come from real Avro: bytes written with one schema and read with the other, in both directions. The registry that decides is a short stand-in.',
          'The mode is really a policy about **who is upgraded first**. Pick a change and an order, and see which readers meet data that they cannot read.'
        ][i];
      },
      mood: function (s, i) { return i ? 'happy' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.sc || (A.local.sc = { c: 0, m: 'BACKWARD', u: 'producers' }), r = find(st.c), h = '<div class="lab">';
        h += row('Change', chips(SHORT.map(function (x, n) { return n; }), st.c, 'sc-c', function (n) { return SHORT[n]; }));
        if (i === 0) {
          var ok = accepts(r, st.m), rf = recordedFlow(st.c, st.m);
          h += row('Mode of the subject', chips(['BACKWARD', 'FORWARD', 'FULL', 'NONE'], st.m, 'sc-m'));
          h += '<div class="lab-out">' + big(ok ? 'accepted' : 'refused', 'the registry says', ok ? 'good' : 'bad') + big(r[1] === 'yes' ? 'works' : 'FAILS', 'new schema reads old data (backward)', r[1] === 'yes' ? 'good' : 'bad') + big(r[2] === 'yes' ? 'works' : 'FAILS', 'old schema reads new data (forward)', r[2] === 'yes' ? 'good' : 'bad') + big(r[3], 'compatible as') + '</div>';
          if (r[4]) h += '<div class="lab-h">The first failure, as the Avro library reported it</div><div class="expr err">' + esc(r[4]) + '</div>';
          h += callout(ok ? 'tip' : 'warn', st.m === 'NONE' ? 'With **NONE** the registry stores anything. A breaking change gets an id, and the readers find out in production.' : ok ? 'The mode **' + st.m + '** only asks for ' + (st.m === 'BACKWARD' ? 'backward' : st.m === 'FORWARD' ? 'forward' : 'both') + ' compatibility, and this change has it.' + (r[3] !== 'full' ? ' Be careful: it is **' + r[3] + '**, so one direction still breaks.' : '') : 'The mode **' + st.m + '** needs ' + (st.m === 'BACKWARD' ? 'backward' : st.m === 'FORWARD' ? 'forward' : 'both') + ' compatibility, and this change does not have it. The producer gets the error **in its own build**, and no bad record is written.');
          h += '<p class="lab-note">' + (rf ? pill('recorded', 'real') + ' The stand-in registry was offered "' + esc(rf.offer) + '" on a subject set to ' + st.m + ': **' + rf.result + '**. ' : '') + 'The two directions are the recorded results of real Avro bytes. The decision of each mode applies them: BACKWARD needs the first, FORWARD the second, FULL both, NONE neither.</p>';
        } else {
          var prodFirst = st.u === 'producers', bad = prodFirst ? r[2] !== 'yes' : r[1] !== 'yes';
          h += row('Upgraded first', chips(['producers', 'consumers'], st.u, 'sc-u'));
          h += '<div class="qrow"><div class="qbox ' + (prodFirst ? 'here' : 'ready') + '"><b>' + (prodFirst ? 'New producers, old consumers' : 'New consumers, old producers') + '</b><span>' + (prodFirst ? 'the old consumers read **new** data: the forward check' : 'the new consumers read **old** data: the backward check').replace(/\*\*/g, '') + '</span></div>' +
            '<div class="qbox ' + (bad ? 'here' : 'ready') + '"><b>' + (bad ? 'Readers fail' : 'Everything reads') + '</b><span>' + (bad ? esc(r[4] || 'a record cannot be decoded') : 'no reader meets data that it cannot read') + '</span></div></div>';
          h += callout(bad ? 'warn' : 'tip', bad ? 'For this change, upgrading **' + st.u + '** first breaks the readers that are still on the other version. The change is **' + r[3] + '**: ' + (r[3] === 'none' ? 'neither order works, so it needs a plan in several steps' : 'upgrade the **' + (prodFirst ? 'consumers' : 'producers') + '** first instead') + '.' : (r[3] === 'full' ? 'The change is **full**: either order works.' : 'This order works for this change, because the change is **' + r[3] + '**.'));
          h += '<p class="lab-note">' + pill('recorded', 'real') + ' The two checks are the recorded results of real Avro. Which one applies to you depends only on who is upgraded first.</p>';
        }
        box.innerHTML = h$.fixNotes(h + '</div>');
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'sc-c') st.c = Number(v); else if (act === 'sc-m') st.m = v; else if (act === 'sc-u') st.u = v;
          A.render(true);
        };
      }
    };
  })();

  /* ====================== Windows, grace and late records ====================== */
  (function () {
    var T = 599;                                 /* the newest record of the recording: 599 seconds after the first, which is in the tenth minute */
    function verdict(late, grace) {
      var t = T - late, ws = Math.floor(t / 60) * 60, we = ws + 60;
      return { t: t, ws: ws, we: we, counted: we + grace > T };
    }
    function mmss(x) { return Math.floor(x / 60) + ':' + ('0' + (x % 60)).slice(-2); }
    W.streamlab = {
      steps: function () { return 2; },
      hint: 'Pick the grace period and how late a record is.',
      say: function (s, i) {
        return [
          'Windows are one minute of **event time**. The newest record seen so far is at ' + mmss(T) + '. A record arrives that is some seconds older than that. Pick the **grace period** of the window, and how late the record is. Is it counted, or dropped? The two cases of the recording are marked.',
          'A Kafka Streams application is split into **tasks**, and a task never runs in two places. The recorded application had six. Pick how many copies you start, and see who gets what.'
        ][i];
      },
      mood: function (s, i) { return i ? 'happy' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.sl || (A.local.sl = { g: 30, l: 20, n: 3 }), h = '<div class="lab">';
        if (i === 0) {
          var v = verdict(st.l, st.g), LT = G.counts('streams.late'), r20 = st.g === LT.grace_seconds && st.l === 20, r600 = st.g === LT.grace_seconds && st.l === 594;
          h += row('Grace period (seconds)', chips([0, 30, 120], st.g, 'sl-g', function (x) { return x === 30 ? '30 (recorded)' : x; }));
          h += row('The record is older than the newest by (seconds)', chips([10, 20, 45, 90, 200, 594], st.l, 'sl-l', function (x) { return x === 20 ? '20 (recorded)' : x === 594 ? '594: about 10 minutes (recorded)' : x; }));
          var wins = [];
          for (var w = 0; w <= 9; w++) { var ws = w * 60, we = ws + 60, state = we > T ? 'open' : (we + st.g > T ? 'in grace' : 'closed'); wins.push([w, ws, we, state]); }
          h += '<div class="strip">' + wins.map(function (x) { var mine = x[1] === v.ws; return '<i class="rec ' + (x[3] === 'open' ? 'k4' : x[3] === 'in grace' ? 'k2' : 'k11') + (mine ? ' hit' : '') + '" title="window ' + mmss(x[1]) + ' to ' + mmss(x[2]) + ': ' + x[3] + '">' + x[0] + '</i>'; }).join('') + '</div>';
          h += '<p class="lab-note">Minutes 0 to 9 of event time. Green: **open**. Yellow: closed, but still **in its grace**. Grey: **closed**. The blue ring is the window of the record: **' + mmss(v.ws) + ' to ' + mmss(v.we) + '**, which closes for good at ' + mmss(v.we + st.g) + '.</p>';
          h += '<div class="lab-out">' + big(v.counted ? 'counted' : 'dropped', 'what happens to the record', v.counted ? 'good' : 'bad') + big(mmss(T), 'stream time: the newest event time') + big(mmss(v.we + st.g), 'window end + grace: the window closes here') + big(v.counted ? '+0' : '+1', 'dropped-records-total') + '</div>';
          h += callout(v.counted ? 'tip' : 'warn', v.counted ? 'The record belongs to a window that is still open, or still in its grace, so it is **added to the count**.' : 'The window of the record closed at **' + mmss(v.we + st.g) + '**, and stream time is already ' + mmss(T) + '. The record is **dropped**: no error, no log line at the default level. The only trace is the metric `dropped-records-total`.');
          h += '<p class="lab-note">' + ((r20 || r600) ? pill('recorded', 'real') + ' This case ran on the real application: ' + (r20 ? 'the record was **counted**, the count of its window went from ' + LT.count_of_that_window[0] + ' to ' + LT.count_of_that_window[1] + '.' : 'the record was **dropped**, the count stayed at ' + LT.count_of_the_closed_window[0] + ', and the metric read ' + LT.dropped_records_metric + '.') : 'Computed with the rule of Kafka Streams: a record is dropped when its window end plus the grace is not after stream time. The recorded cases follow it.') + '</p>';
        } else {
          var tasks = G.counts('streams.state_on_disk').task_folders, n = st.n, idle = 0, k;
          var by = []; for (k = 0; k < n; k++) by.push([]);
          tasks.forEach(function (t, ix) { by[ix % n].push(t); });
          idle = by.filter(function (x) { return !x.length; }).length;
          h += row('Copies of the application', chips([1, 2, 3, 6, 8], st.n, 'sl-n'));
          h += '<div class="pboxes">' + by.map(function (list, m) { return '<div class="pbox' + (list.length ? '' : ' idle') + '"><b>copy ' + (m + 1) + '</b><span>' + (list.length ? 'tasks ' + list.join(', ') : 'idle: no task left') + '</span></div>'; }).join('') + '</div>';
          h += '<div class="lab-out">' + big(tasks.length, 'tasks in the application (2 sub-topologies x 3 partitions)') + big(Math.max.apply(null, by.map(function (l) { return l.length; })), 'most tasks in one copy') + big(idle, 'idle copies', idle ? 'warn' : 'good') + '</div>';
          h += callout(idle ? 'warn' : 'tip', idle ? 'There are **more copies than tasks**: **' + idle + '** of them do nothing. The number of tasks is set by the **partitions of the input topics**, and that is the limit of the parallelism.' : 'The tasks are shared out like the partitions of a consumer group. When a copy dies, its tasks move, and the new owner **rebuilds their state** from the changelog topics unless a standby replica keeps it warm.');
          h += '<p class="lab-note">' + pill('recorded', 'real') + ' The six task folders on the disk of the real application: ' + tasks.join(', ') + '. The sharing out of tasks is a rule from the documentation, shown here round robin.</p>';
        }
        box.innerHTML = h$.fixNotes(h + '</div>');
        A.bindWidget = function (act, el) {
          var v = Number(el.getAttribute('data-v'));
          if (act === 'sl-g') st.g = v; else if (act === 'sl-l') st.l = v; else if (act === 'sl-n') st.n = v;
          A.render(true);
        };
      }
    };
  })();

  /* ====================== Will the request be allowed? ====================== */
  (function () {
    var PRINCIPAL = function () { return G.counts('security.listeners').principal_of_a_certificate; }, SUBJECT = function () { return G.counts('security.listeners').subject_of_the_certificate; };
    var RULES = [
      { id: 'r1', t: 'allow', who: 'User:alice', ops: ['Write', 'Describe'], res: 'Topic', name: 'orders', pre: false },
      { id: 'r2', t: 'allow', who: 'User:bob', ops: ['Read', 'Describe'], res: 'Topic', name: 'orders', pre: false },
      { id: 'r3', t: 'allow', who: 'User:bob', ops: ['Read'], res: 'Group', name: 'bob-group', pre: false },
      { id: 'r4', t: 'deny', who: 'User:bob', ops: ['Read'], res: 'Topic', name: 'orders', pre: false },
      { id: 'r5', t: 'allow', who: 'User:alice', ops: ['Write', 'Describe'], res: 'Topic', name: 'brewline.', pre: true }
    ];
    var REQS = [
      { id: 'q1', t: 'alice writes to orders', who: 'User:alice', steps: [['Describe', 'Topic', 'orders'], ['Write', 'Topic', 'orders']] },
      { id: 'q2', t: 'bob reads orders, in the group bob-group', who: 'User:bob', steps: [['Read', 'Group', 'bob-group'], ['Describe', 'Topic', 'orders'], ['Read', 'Topic', 'orders']] },
      { id: 'q3', t: 'alice writes to brewline.orders', who: 'User:alice', steps: [['Describe', 'Topic', 'brewline.orders'], ['Write', 'Topic', 'brewline.orders']] },
      { id: 'q4', t: 'alice writes to other.topic', who: 'User:alice', steps: [['Describe', 'Topic', 'other.topic'], ['Write', 'Topic', 'other.topic']] }
    ];
    function matches(r, who, op, res, name) { return r.who === who && r.ops.indexOf(op) >= 0 && r.res === res && (r.pre ? name.indexOf(r.name) === 0 : name === r.name); }
    /* the authorizer: a deny that matches wins, then an allow that matches, and with neither the answer is no (DefaultDeny) */
    function check(on, req) {
      var rules = RULES.filter(function (r) { return on[r.id]; });
      for (var i = 0; i < req.steps.length; i++) {
        var s = req.steps[i], deny = rules.filter(function (r) { return r.t === 'deny' && matches(r, req.who, s[0], s[1], s[2]); })[0], allow = rules.filter(function (r) { return r.t === 'allow' && matches(r, req.who, s[0], s[1], s[2]); })[0];
        if (deny || !allow) return { ok: false, at: s, rule: deny || null, err: s[1].toUpperCase() + '_AUTHORIZATION_FAILED' };
      }
      return { ok: true };
    }
    /* the cases that ran for real, by the set of rules in force and the request */
    var CASES = [['', 'q1', 'alice, right password, no ACL yet'], ['r1', 'q1', 'alice, after Write and Describe'], ['r1 r2', 'q2', 'bob reads with a group, Read on the topic only'], ['r1 r2 r3', 'q2', 'bob reads with a group, after Read on the group'],
      ['r1 r2 r3 r4', 'q2', 'bob reads, after a deny rule'], ['r1 r2 r3 r5', 'q3', 'alice writes to brewline.orders'], ['r1 r2 r3 r5', 'q4', 'alice writes to other.topic']];
    function recordedRow(on, qid) {
      var key = RULES.filter(function (r) { return on[r.id]; }).map(function (r) { return r.id; }).join(' ');
      var c = CASES.filter(function (x) { return x[0] === key && x[1] === qid; })[0];
      return c ? G.table('security.sasl').rows.filter(function (r) { return r[0].indexOf(c[2]) === 0; })[0] : null;
    }
    var TLS = [['no trusted authority given', 'the client does not trust the authority'], ['a different authority is trusted', 'the client trusts another authority'], ['trusted authority given, no client certificate', 'no client certificate'], ['connecting to 127.0.0.1', 'the address is not in the certificate'], ['trusted authority and a client certificate (carol)', 'a good certificate, no ACL'], ['an ACL for the principal written as the subject', 'a good certificate, ACL written CN first'], ['an ACL for the principal exactly as the broker names it', 'a good certificate, ACL as the broker names it']];
    function tls(k) { return G.table('security.tls').rows.filter(function (r) { return r[0].indexOf(k) === 0; })[0]; }
    W.aclslab = {
      steps: function () { return 2; },
      hint: 'Switch the rules on and off, then pick a request.',
      say: function (s, i) {
        return [
          'Five ACLs, and four requests. Switch rules on and off and pick a request. The broker checks each step of the request in order. **A deny wins, and no rule means no.** Several combinations were run on the real broker, and they are marked. The rest follow the same rule.',
          'A client certificate has to pass two doors. The **handshake** checks the certificates. Then the **authorizer** checks the principal that the broker made of the certificate. Pick a case from the recording and see which door stopped it.'
        ][i];
      },
      mood: function (s, i) { return i ? 'oops' : 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.ac || (A.local.ac = { on: { r1: true }, q: 'q1', t: 4 }), h = '<div class="lab">';
        if (i === 0) {
          var req = REQS.filter(function (x) { return x.id === st.q; })[0], res = check(st.on, req), rr = recordedRow(st.on, st.q);
          h += '<div class="lab-h">ACLs in force</div><div class="sel-chips">' + RULES.map(function (r) {
            return '<button type="button" class="sel-chip' + (st.on[r.id] ? ' on' : '') + '" data-act="ac-r" data-v="' + r.id + '">' + (st.on[r.id] ? 'on: ' : 'off: ') + r.t + ' ' + r.who.replace('User:', '') + ' ' + r.ops.join(' and ') + ' on ' + r.res.toLowerCase() + ' ' + esc(r.name) + (r.pre ? ' (prefix)' : '') + '</button>';
          }).join('') + '</div>';
          h += row('Request', chips(REQS.map(function (x) { return x.id; }), st.q, 'ac-q', function (id) { return REQS.filter(function (x) { return x.id === id; })[0].t; }));
          h += '<div class="lab-h">What the broker checks, in order</div>' + table(['Step', 'Operation', 'Resource', 'Answer'], req.steps.map(function (s2, n) {
            var failed = !res.ok && res.at === s2, after = !res.ok && req.steps.indexOf(res.at) < n;
            return [n + 1, s2[0], s2[1] + ' ' + s2[2], after ? 'not reached' : failed ? 'denied' + (res.rule ? ' by a deny rule' : ' (DefaultDeny: no rule allows it)') : 'allowed'];
          }), null, function (r, ri, ci) { return ci === 3 ? (/^denied/.test(r[3]) ? 'wbad' : r[3] === 'allowed' ? 'wgood' : '') : ''; });
          h += '<div class="lab-out">' + big(res.ok ? 'delivered' : res.err, 'what the client gets', res.ok ? 'good' : 'bad') + '</div>';
          h += callout(res.ok ? 'tip' : 'warn', res.ok ? 'Every step has an allow rule and no deny rule. The request goes through.' : res.rule ? 'A **deny** rule matches this step, and a deny beats any allow.' : (res.at[1] === 'Group' ? 'A consumer that uses a group needs **Read on the group** as well as on the topic. The group is checked first.' : 'No rule allows **' + res.at[0] + '** on **' + res.at[1].toLowerCase() + ' ' + esc(res.at[2]) + '** for this principal. With no rule the answer is no.'));
          h += '<p class="lab-note">' + (rr ? pill('recorded', 'real') + ' This exact combination ran on the real broker: the producer or consumer got **' + esc(String(rr[1])) + '**' + (rr[2] ? ' (' + esc(String(rr[2])) + ')' : '') + '.' : 'Not run in this form. The answer follows the rule that the recorded cases show.') + '</p>';
        } else {
          var r = tls(TLS[st.t][0]), door = /^(_SSL|_TRANSPORT)/.test(r[3]) ? 'the handshake' : (r[1] === 'delivered' ? 'none' : 'the authorizer');
          h += row('Case', chips(TLS.map(function (x, n) { return n; }), st.t, 'ac-t', function (n) { return TLS[n][1]; }));
          h += '<div class="lab-out">' + big(r[1] === 'delivered' ? 'delivered' : r[1], 'the delivery report', r[1] === 'delivered' ? 'good' : 'bad') + big(door === 'none' ? 'both doors open' : 'stopped at ' + door, 'which door', door === 'none' ? 'good' : 'warn') + '</div>';
          if (r[3]) h += '<div class="lab-h">What only the error callback said</div><div class="expr err">' + esc(r[3]) + '</div>';
          h += callout(door === 'the handshake' ? 'warn' : (door === 'none' ? 'tip' : 'warn'), door === 'the handshake' ? 'The failure is in the **handshake**, before any ACL. The producer was told only that the message **timed out**: the real reason is in the **error callback** of the client.' :
            door === 'none' ? 'The handshake worked, and the ACL names the principal **as the broker names it**: `' + esc(PRINCIPAL()) + '`. The subject of the certificate reads `' + esc(SUBJECT()) + '`.' :
            'The handshake worked: the broker knows that this is **carol**. The authorizer then found no rule for her principal `' + esc(PRINCIPAL()) + '`. ' + (st.t === 5 ? 'The rule that I wrote used the subject **as the certificate reads it**, `' + esc(SUBJECT()) + '`: valid, and it matches nobody.' : 'There is no ACL yet.'));
          h += '<p class="lab-note">' + pill('recorded', 'real') + ' The case ran on the real broker with a certificate authority made for the recording. The delivery report is what the producer got, and the box shows what its error callback said.</p>';
        }
        box.innerHTML = h$.fixNotes(h + '</div>');
        A.bindWidget = function (act, el) {
          var v = el.getAttribute('data-v');
          if (act === 'ac-r') st.on[v] = !st.on[v]; else if (act === 'ac-q') st.q = v; else if (act === 'ac-t') st.t = Number(v);
          A.render(true);
        };
      }
    };
  })();

  /* ====================== Read the dashboard, then size the cluster ====================== */
  (function () {
    var ASSUME_DISK = 8 * 1099511627776;           /* an assumed usable disk of 8 TiB for each broker: not recorded */
    W.opslab = {
      steps: function () { return 2; },
      hint: 'Pick a situation and read the five numbers. Then size a cluster.',
      say: function (s, i) {
        return [
          'Five numbers on a dashboard. Pick a situation. The values were read over JMX from the real brokers, once with all three up, and once after broker 1 was killed. Which numbers are alarms, and which are only warnings?',
          'How big must a cluster be? **Disk** is the write rate, times the days that you keep, times the copies, times what compression leaves. The compression shares are the ones that were recorded. Everything else here is arithmetic, with an **assumed** disk size, and no cluster was run.'
        ][i];
      },
      mood: function (s, i) { return i ? 'think' : 'happy'; },
      render: function (box, s, i, A) {
        var st = A.local.op || (A.local.op = { sit: 0, mbps: 20, days: 7, rf: 3, codec: 4, groups: 3 }), h = '<div class="lab">';
        if (i === 0) {
          var M = G.table('ops.metrics'), col = st.sit === 0 ? 2 : 3, bad = [];
          h += row('Situation', chips([0, 1], st.sit, 'op-s', function (n) { return n ? 'broker 1 is dead' : 'all three brokers up'; }));
          var rows = M.rows.map(function (r) { var v = String(r[col]), alarm = (/under-replicated|below the minimum|offline/.test(r[0]) && /[1-9]/.test(v)) || (/active controllers/.test(r[0]) && v.split(' / ').some(function (x) { return x !== '1'; })); if (alarm) bad.push(r[0]); return [r[0], r[1], v, alarm ? 'ALARM' : 'ok']; });
          h += table(['What is counted', 'Read from', st.sit === 0 ? 'Value (brokers 1 / 2 / 3)' : 'Value (brokers 2 / 3)', ''], rows, null, function (r, ri, ci) { return ci === 3 ? (r[3] === 'ALARM' ? 'wbad' : 'wgood') : ''; });
          h += callout(bad.length ? 'warn' : 'tip', bad.length ? 'The first alarm of a sick cluster: **' + bad.join(', ') + '**. A copy is missing, so writes with `acks=all` are one more failure from being refused. The cluster still serves **every** partition: **offline partitions** and the **active controller** are healthy.' : 'Everything is zero, and there is exactly one active controller. The numbers that matter are quiet. A healthy cluster is boring.');
          h += '<p class="lab-note">' + pill('recorded', 'real') + ' Read with `kafka-jmx.sh` from the brokers and the controller. Which numbers raise an alarm is a rule of thumb from the lesson, applied to the recorded values.</p>';
        } else {
          var codec = G.table('producers.compression').rows[st.codec], share = Number(codec[4]), rate = st.mbps * 1048576, day = rate * 86400, raw = day * st.days * st.rf, disk = raw * share, need = disk * 1.35, brokers = Math.max(3, Math.ceil(need / ASSUME_DISK));
          var net = rate * share;
          h += row('Writes (MiB per second)', chips([5, 20, 50, 100], st.mbps, 'op-m'));
          h += row('Days kept', chips([1, 7, 14, 30], st.days, 'op-d'));
          h += row('Copies', chips([1, 2, 3], st.rf, 'op-f'));
          h += row('Compression', chips([0, 1, 2, 3, 4], st.codec, 'op-c', function (n) { var c = G.table('producers.compression').rows[n]; return c[0] + ' (' + c[4] + ')'; }));
          h += row('Consumer groups reading everything', chips([1, 3, 6], st.groups, 'op-g'));
          h += '<div class="lab-out">' + big(mb(disk), 'disk for the data, with ' + st.rf + ' copies', 'good') + big(mb(need), 'with 35 percent headroom', 'warn') + big(brokers, 'brokers of ' + mb(ASSUME_DISK) + ' (assumed)', brokers > 6 ? 'warn' : '') + '</div>';
          h += '<div class="lab-out">' + big(mb(net) + '/s', 'into the leaders') + big(mb(net * (st.rf - 1)) + '/s', 'replication between brokers') + big(mb(net * st.groups) + '/s', 'out to ' + st.groups + ' consumer group' + (st.groups > 1 ? 's' : '')) + '</div>';
          h += callout('tip', 'Disk = ' + st.mbps + ' MiB/s × 86,400 s × ' + st.days + ' days × ' + st.rf + ' copies × ' + share + ' (' + codec[0] + ') = **' + mb(disk) + '**. The network counts the writes once, the **followers** ' + (st.rf - 1) + ' more times, and every **consumer group** once more. Real clusters add headroom for recovery and spikes.');
          h += '<p class="lab-note">' + pill('arithmetic', 'warn') + ' The compression shares are recorded: five thousand JSON orders written with each codec. The disk of a broker, the headroom and the traffic are **assumptions**, not measurements. Test with a copy of real traffic.</p>';
        }
        box.innerHTML = h$.fixNotes(h + '</div>');
        A.bindWidget = function (act, el) {
          var v = Number(el.getAttribute('data-v'));
          if (act === 'op-s') st.sit = v; else if (act === 'op-m') st.mbps = v; else if (act === 'op-d') st.days = v; else if (act === 'op-f') st.rf = v; else if (act === 'op-c') st.codec = v; else if (act === 'op-g') st.groups = v;
          A.render(true);
        };
      }
    };
  })();
})();
