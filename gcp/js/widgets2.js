/* Lab widgets for the Pub/Sub, Dataflow, Dataproc, Composer, change data capture, governance, machine learning and Terraform missions.
   The numbers come from js/real.js (gcp/verify/capture_gcp.py): Beam on its local runners, a model of the Pub/Sub delivery rules, PySpark in local mode, Airflow,
   BigQuery SQL in DuckDB and Checkov. Nothing here ran on Google Cloud. A lab that applies rules from the documentation says so on screen. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var W = (LAB.W = LAB.W || {});
  var esc = LAB.esc, md = LAB.md, G = LAB.get, X = W._h;
  var chips = X.chips, toggles = X.toggles, row = X.row, table = X.table, fmtN = X.fmtN, big = X.big, callout = X.callout;

  /* ====================== Pub/Sub: what happens to a message ====================== */
  (function () {
    var NOTE = {
      'healthy': 'One delivery and one run for each message. This is the case you build for, and the only one that needs no thought.',
      'slow handler': 'The handler needs 35 seconds and the deadline is 10, and nothing extends it. Pub/Sub delivers the message again while the first handler still works, so the work runs more than once. A client library that extends the deadline for you avoids this. A push endpoint, which has only the deadline, does not.',
      'deadline long enough': 'A deadline of 60 is longer than the work of 35, so there is one delivery and one run.',
      'poison, no dead letter': 'The message fails every time and is delivered again at once, again and again. Nothing limits it, so it burns work for as long as it lives. (Real Pub/Sub waits between deliveries by its retry policy. This model has no wait.)',
      'poison, dead letter after 5': 'After 5 deliveries the message is moved to the dead letter topic, where a person can read it. The other message is not held up.',
      'ordering key blocks': 'Messages with the same ordering key are delivered one at a time, in order. The first one fails forever, so the two behind it are **never delivered**. The other key flows.',
      'ordering key, dead letter after 5': 'After 5 deliveries the first message moves aside, and the two behind it follow. A dead letter policy is how an ordered stream gets unstuck.'
    };
    W.pubsub = {
      steps: function () { return 1; },
      hint: 'Pick a situation. Read the deliveries and how often the handler ran.',
      say: function () { return 'Pub/Sub delivers a message at least once, until it is acknowledged. Pick a situation and read how many times each message was delivered, and how many times its handler ran to the end. This is a model that I wrote from the documentation, not Google\'s service, so read it for the rules and not for the timings.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var T = G.table('pubsub.model'), S = G.counts('pubsub.model_settings'), names = [];
        T.rows.forEach(function (r) { if (names.indexOf(r[0]) < 0) names.push(r[0]); });
        var st = A.local.ps || (A.local.ps = { s: names[1] }), rows = T.rows.filter(function (r) { return r[0] === st.s; }), set = S[st.s];
        var h = '<div class="lab">' + row('Situation', chips(names, st.s, 'ps-s')) + '<p class="lab-note">' + esc(set.story) + ' Settings: ' + esc(Object.keys(set).filter(function (k) { return k !== 'story'; }).map(function (k) { return k.replace(/_/g, ' ') + ' ' + set[k]; }).join(', ')) + '.</p>' +
          table(['Message', 'Ordering key', 'Deliveries', 'Handler ran to the end', 'Final state'], rows.map(function (r) { return [r[1], r[2], r[3], r[4], r[5]]; }), null,
            function (r, ri, ci) { return ci === 2 && r[2] > 1 ? 'wbad' : ci === 3 && r[3] > 1 ? 'wbad' : ci === 4 ? (r[4] === 'acked' ? 'wgood' : 'wbad') : ''; }) +
          callout(/healthy|long enough|dead letter after 5/.test(st.s) ? 'good' : 'warn', NOTE[st.s]) +
          '<p class="lab-note">A model: ack deadline, redelivery, a dead letter after N deliveries and order by key. It has no backoff, no batching and no flow control. Library defaults that are real: the Python client keeps a lease for up to ' + G.counts('pubsub.defaults').subscriber_flow_control.max_lease_duration_seconds + ' seconds.</p></div>';
        box.innerHTML = h;
        A.bindWidget = function (act, el) { if (act === 'ps-s') st.s = el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== Beam: windows, late data, sessions ====================== */
  (function () {
    var CFG = ['no_lateness', 'late_discarding', 'late_accumulating', 'early_late_accumulating'];
    var NOTE = {
      no_lateness: 'The window [0, 60) fires once, when the watermark passes 60, with 3 and 1. Then the event stamped second 40 arrives and is **dropped**, and so is the one at second 10: with no allowed lateness a late event is gone.',
      late_discarding: 'The on-time pane has 3. The late event at second 40 arrives while the window is still allowed to accept late data, and fires a **late pane with 1**: only what is new. A consumer must add the panes. The event at second 10 came after the allowed lateness and is dropped.',
      late_accumulating: 'Same events, but each pane holds **everything so far**. The late pane says 4, and it replaces the on-time pane of 3. A consumer must take the latest pane and not add them, or it counts twice.',
      early_late_accumulating: 'An early pane fires before the watermark with what has arrived (2), then the on-time pane (3), then the late pane (4). Early panes give a fast, rough number; accumulating makes each pane a better version of the last.'
    };
    W.windows = {
      steps: function () { return 2; },
      hint: 'Pick a trigger setup. Read the panes, then the sessions.',
      say: function (s, i) {
        return [
          'Six events, one minute windows, and a watermark that I move by hand. Four are on time, one comes late and one comes very late. Pick a setup and read the panes: the firings of a window. The pipeline ran on the local runner of Beam, which uses the same model as Dataflow.',
          'A session window has no fixed size. It closes when the gap between events is longer than the gap you set. One customer opens the app five times. Pick a gap and read how many sessions that makes.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.wn || (A.local.wn = { c: 'late_discarding', g: 60 }), h = '<div class="lab">';
        if (i === 0) {
          var P = G.table('beam.panes.' + st.c), L = G.counts('beam.late')[st.c];
          h += row('Setup', chips(CFG, st.c, 'wn-c', function (k) { return G.counts('beam.late')[k].label; })) +
            table(P.cols, P.rows, null, function (r, ri, ci) { return ci === 3 && r[3] !== 'ON_TIME' ? 'wbad' : ''; }) +
            '<div class="lab-out">' + big(L.events_sent, 'events sent') + big(L.events_in_the_output, 'counted in the output', 'good') + big(L.dropped, 'dropped as too late', L.dropped > 1 ? 'bad' : 'warn') + '</div>' + callout('tip', NOTE[st.c]) +
            '<p class="lab-note">Events: store s01 at seconds 5, 20 and 55, store s02 at 30; the watermark moves to 70; s01 at 40 arrives; the watermark moves to 200; s01 at 10 arrives. Apache Beam ' + esc(G.meta('apache-beam')) + ', a test stream, local runner.</p>';
        } else {
          var S = G.table('beam.sessions_' + st.g);
          h += row('Session gap (seconds)', chips([60, 10], st.g, 'wn-g')) + table(S.cols, S.rows) + '<div class="lab-out">' + big(S.rows.length, 'sessions', 'good') + '</div>' +
            callout('tip', st.g === 60 ? 'Events at 0, 20 and 45 are less than 60 seconds apart, so they form one session that ends at 45 + 60 = **105**. The two at 200 and 215 form another.' : 'With a gap of 10 seconds every event is alone: 20 seconds between them is more than the gap. Five sessions. The gap is a business decision, and it changes the count.') +
            '<p class="lab-note">Customer c0007 opens the app at seconds 0, 20, 45, 200 and 215.</p>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'wn-c') st.c = v; if (act === 'wn-g') st.g = +v; A.render(true); };
      }
    };
  })();

  /* ====================== Spark: what the plan reads, shuffles, files, skew ====================== */
  (function () {
    W.spark = {
      steps: function () { return 3; },
      hint: 'Switch the setting. Read what changes in the plan and in the files.',
      say: function (s, i) {
        return [
          'Spark reads only the folders and the columns the plan needs. The orders are in one folder per day. Ask for all days or for one day, and read the lines of the physical plan. This ran in local mode: Dataproc runs the same Spark.',
          'A shuffle makes as many tasks as the setting says, whether the data needs them or not. Adaptive execution can merge them. Then the write: one task makes one file, so the number of tasks decides the number and size of the files.',
          'Skew means one key holds far more rows than the others. Split by store and one partition is far bigger than the median. A salt spreads the big key. Then a join: a small table is sent to every worker, unless you turn that off.'
        ][i];
      },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.sp || (A.local.sp = { d: 'one_day', a: 'off', k: 'by_store' }), h = '<div class="lab">';
        if (i === 0) {
          var P = G.counts('spark.pruning'), p = P[st.d], WR = G.counts('spark.written');
          h += row('Ask for', chips(['all_days', 'one_day'], st.d, 'sp-d', function (k) { return k === 'one_day' ? "one day: WHERE dt = '2026-11-03'" : 'all days'; })) +
            '<div class="lab-out">' + big(p.PartitionFilters === 'none' ? WR.partitions : 1, 'day folders read', p.PartitionFilters === 'none' ? 'warn' : 'good') + big(p.ReadSchema.replace('struct<', '').replace('>', '').split(',').length + ' of 4', 'columns read') + '</div>' +
            '<p class="lab-note"><b>PartitionFilters:</b> <code>' + esc(p.PartitionFilters) + '</code><br><b>ReadSchema:</b> <code>' + esc(p.ReadSchema) + '</code></p>' +
            callout('tip', p.PartitionFilters === 'none' ? 'No filter on the folder name, so **all ' + WR.partitions + ' day folders** are read. Only the two columns the query names are read from each file, which is the other half of the saving.' : 'The filter on `dt` is a **partition filter**: Spark opens one folder out of ' + WR.partitions + '. Layout decides what a query can skip. It is the same idea as a BigQuery partition.');
        } else if (i === 1) {
          var SH = G.counts('spark.shuffle'), SF = G.table('spark.small_files'), tasks = st.a === 'on' ? SH.tasks_per_stage_with_aqe : SH.tasks_per_stage_without_aqe;
          h += row('Adaptive execution', chips(['off', 'on'], st.a, 'sp-a')) + '<div class="lab-out">' + big(tasks.join(', '), 'tasks in each stage', st.a === 'on' ? 'good' : 'warn') + big(SH.shuffle_partitions_setting, 'shuffle partitions setting') + '</div>' +
            callout('tip', st.a === 'off' ? 'The setting says **200** partitions, so the shuffle stage ran 200 tasks to add up twelve stores. Most of them had nothing to do.' : 'With adaptive execution Spark looked at the real size after the shuffle and **merged** the small partitions: the last stage ran far fewer tasks. Leave it on.') +
            table(SF.cols, SF.rows, null, function (r, ri, ci) { return ci === 1 && r[1] > 50 ? 'wbad' : ''; }) + '<p class="lab-note">The same 60,000 rows written three ways. Many tiny files are slow to list and to open. A few huge files cannot be read in parallel. Aim for files of tens to hundreds of megabytes on real data.</p>';
        } else {
          var K = G.counts('spark.skew'), J = G.counts('spark.join'), sk = K[st.k === 'salt' ? 'by_store_and_salt' : 'by_store'];
          h += row('Split the rows', chips(['by_store', 'salt'], st.k, 'sp-k', function (k) { return k === 'salt' ? 'by store and a salt of 4' : 'by store'; })) + '<div class="lab-out">' + big(fmtN(sk.largest), 'rows in the biggest partition', sk.largest_over_median > 2 ? 'bad' : 'good') + big(fmtN(sk.median), 'rows in the median partition') + big(sk.largest_over_median + ' times', 'biggest over median', sk.largest_over_median > 2 ? 'bad' : 'good') + '</div>' +
            callout('tip', st.k === 'by_store' ? 'Store s01 holds **' + fmtN(K.share_of_s01 * 100, 0) + '%** of the rows, so the partition that gets it has more than three times the median. One slow task keeps the whole stage waiting.' : 'A salt adds a small random part to the key, so the big key is spread over four partitions. It costs a second step to add the parts together.') +
            '<p class="lab-note">Join with a 12-row table: <b>' + esc(J.small_table_join) + '</b> under the default threshold of ' + fmtN(J.default_threshold_bytes / 1048576) + ' MiB, <b>' + esc(J.threshold_off_join) + '</b> with the threshold turned off. A broadcast sends the small table to every worker and shuffles nothing.</p>';
        }
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'sp-d') st.d = v; if (act === 'sp-a') st.a = v; if (act === 'sp-k') st.k = v; A.render(true); };
      }
    };
  })();

  /* ====================== Airflow: retries ====================== */
  (function () {
    W.dag = {
      steps: function () { return 1; },
      hint: 'Set the retries, and how many times the source fails first.',
      say: function () { return 'A task fails because a source is not ready, and Airflow tries again. Set how many retries the task has and how many times the source fails first, and read how it ends. The recorded run is the case of 2 retries and 2 failures: it worked on the third try. The other cells follow from counting.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var F = G.counts('af.flaky'), ex = F.tasks.filter(function (t) { return t.task === 'extract'; })[0], st = A.local.dg || (A.local.dg = { r: 2, f: 2 });
        var attempts = Math.min(st.f, st.r) + 1, ok = st.f <= st.r, list = [];
        for (var n = 1; n <= attempts; n++) list.push(['try ' + n, n <= st.f ? 'failed: source not ready' : 'success']);
        var recorded = st.r === 2 && st.f === 2;
        var h = '<div class="lab">' + row('retries on the task', chips([0, 1, 2, 3], st.r, 'dg-r')) + row('source fails first', chips([0, 1, 2, 3], st.f, 'dg-f', function (k) { return k + ' times'; })) +
          table(['Attempt', 'Result'], list, null, function (r, ri, ci) { return ci === 1 ? (/success/.test(r[1]) ? 'wgood' : 'wbad') : ''; }) +
          '<div class="lab-out">' + big(attempts, 'attempts', ok ? 'good' : 'bad') + big(ok ? 'success' : 'failed', 'the task', ok ? 'good' : 'bad') + big(ok ? 'runs' : 'upstream_failed', 'the task after it (load)', ok ? 'good' : 'bad') + '</div>' +
          callout(recorded ? 'good' : ok ? 'tip' : 'warn', recorded ? '**Recorded:** the real Airflow ' + esc(G.meta('apache-airflow')) + ' ran this: extract finished in state `' + ex.state + '` after **' + ex.tries + ' tries**, and the task after it ran once. The DAG run ended in `' + F.state + '`.' :
            ok ? 'The task has enough retries for this source, so the run ends well. Each try waits for the retry delay first.' : 'The retries run out before the source is ready. The task fails, and the task after it never starts. A retry is for a **temporary** problem. A source that is down for an hour needs a sensor, or a longer wait, and an alert.') +
          '<p class="lab-note">Retries and the retry delay are task settings. A task must also be safe to run again, or a retry does the work twice (see the load methods).</p></div>';
        box.innerHTML = h;
        A.bindWidget = function (act, el) { var v = +el.getAttribute('data-v'); if (act === 'dg-r') st.r = v; if (act === 'dg-f') st.f = v; A.render(true); };
      }
    };
  })();

  /* ====================== Change data capture: apply the changes in order ====================== */
  (function () {
    /* events in the order in which they ARRIVE. seq is the order in which they happened in the source. */
    var EV = [
      { seq: 1, key: 'o1', op: 'INSERT', status: 'NEW' }, { seq: 2, key: 'o2', op: 'INSERT', status: 'NEW' }, { seq: 4, key: 'o1', op: 'UPDATE', status: 'PAID' },
      { seq: 3, key: 'o1', op: 'UPDATE', status: 'PACKED' }, { seq: 5, key: 'o2', op: 'DELETE', status: '-' }, { seq: 6, key: 'o3', op: 'INSERT', status: 'NEW' }
    ];
    var METHODS = { arrival: 'in the order they arrive', sequence: 'by sequence number', nodelete: 'by sequence number, ignoring deletes' };
    function apply(events, ignoreDeletes) {
      var t = {};
      events.forEach(function (e) { if (e.op === 'DELETE') { if (!ignoreDeletes) delete t[e.key]; } else t[e.key] = e.status; });
      return Object.keys(t).sort().map(function (k) { return [k, t[k]]; });
    }
    function result(m) {
      if (m === 'arrival') return apply(EV, false);
      var sorted = EV.slice().sort(function (a, b) { return a.seq - b.seq; });
      return apply(sorted, m === 'nodelete');
    }
    W.cdc = {
      steps: function () { return 1; },
      hint: 'Pick how the changes are applied. Compare with the truth.',
      say: function () { return 'A change stream is a list of inserts, updates and deletes. They can arrive out of order: here the update of second 4 arrives before the update of second 3. Pick a way to apply them and compare the result with what the source holds. The rule that each change carries a sequence number comes from the documentation. The lab applies it.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.cd || (A.local.cd = { m: 'arrival' }), got = result(st.m), truth = result('sequence'), ok = JSON.stringify(got) === JSON.stringify(truth);
        var h = '<div class="lab">' + table(['Arrives as number', 'Sequence in the source', 'Key', 'Change', 'Status'], EV.map(function (e, n) { return [n + 1, e.seq, e.key, e.op, e.status]; }), function (r) { return r[1] !== r[0] ? 'dup' : ''; }) +
          row('Apply the changes', chips(Object.keys(METHODS), st.m, 'cd-m', function (k) { return METHODS[k]; })) +
          table(['Key', 'Status in the table'], got.length ? got : [['-', 'empty']], null, function (r) { return truth.some(function (t) { return t[0] === r[0] && t[1] === r[1]; }) ? '' : 'wbad'; }) +
          '<div class="lab-out">' + big(ok ? 'matches the source' : 'wrong', 'the table', ok ? 'good' : 'bad') + '</div>' +
          callout(ok ? 'good' : 'warn', st.m === 'arrival' ? 'Applied as they arrive, the late update of sequence 3 overwrites the newer one of sequence 4: order **o1 ends as PACKED** while the source says PAID. Network order is not source order.' :
            st.m === 'nodelete' ? 'Sorted correctly, but the delete of **o2 was skipped**, so a row that no longer exists in the source stays in the table forever.' : 'Sorted by the sequence number, the changes give the same table as the source: o1 PAID, o2 gone, o3 NEW. This is what a CDC apply must do, and why every change carries a sequence.') +
          '<p class="lab-note">The rows that differ from the source are marked. Rules from the documentation of BigQuery change data capture (a change type and a sequence number on every change row). Re-check the current column names in the documentation.</p></div>';
        box.innerHTML = h;
        A.bindWidget = function (act, el) { if (act === 'cd-m') st.m = el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== Governance: what each reader sees ====================== */
  (function () {
    var COLS = [
      ['order_id', 'none', '7001', '7001'],
      ['customer_id', 'none', 'c0042', 'c0042'],
      ['email', 'PII, hash', 'user0042@example.com', '(a 64-character hash)'],
      ['phone', 'PII, nullify', '+65 5550 0042', 'NULL'],
      ['birth_year', 'Sensitive, default value', '1984', '0']
    ];
    var READERS = { fine: 'Fine-grained reader', masked: 'Masked reader', none: 'No access to the tags' };
    W.mask = {
      steps: function () { return 1; },
      hint: 'Pick a reader. Then add a row access policy.',
      say: function () { return 'A policy tag marks a column. What a reader gets depends on a role on the tag. A fine-grained reader sees the value. A masked reader sees a masked value. A reader with neither gets an error if the query touches the column. A row access policy works on rows, not columns. The rules are from the documentation and the values are made up.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var st = A.local.mk || (A.local.mk = { r: 'masked', p: 'off' }), RP = G.counts('sql.row_policy');
        var rows = COLS.map(function (c) {
          var v = c[1] === 'none' ? c[2] : st.r === 'fine' ? c[2] : st.r === 'masked' ? c[3] : 'access denied';
          return [c[0], c[1] === 'none' ? 'no tag' : c[1], v];
        });
        var denied = st.r === 'none';
        var n = st.p === 'on' ? RP.orders_visible_to_a_manager_of_s01 : RP.orders;
        var h = '<div class="lab">' + row('Reader', chips(Object.keys(READERS), st.r, 'mk-r', function (k) { return READERS[k]; })) + row('Row access policy "own store only" (store s01)', chips(['off', 'on'], st.p, 'mk-p')) +
          table(['Column', 'Policy tag and masking rule', 'What this reader gets'], rows, null, function (r, ri, ci) { return ci === 2 ? (r[2] === 'access denied' ? 'wbad' : r[2] === COLS[ri][2] || COLS[ri][1] === 'none' ? '' : 'wgood') : ''; }) +
          '<div class="lab-out">' + big(denied ? 'SELECT * fails' : 'SELECT * works', 'a query that names the tagged columns', denied ? 'bad' : 'good') + big(fmtN(n) + ' rows', st.p === 'on' ? 'rows visible with the row policy' : 'rows visible', st.p === 'on' ? 'warn' : '') + '</div>' +
          callout('tip', st.r === 'none' ? 'The query is refused as soon as it names a tagged column. The reader can still run `SELECT order_id, customer_id`. Fix it by giving a role on the tag, not by copying the data into an untagged table.' :
            st.r === 'masked' ? 'The masking rule runs **inside the query**: the table keeps the real value, and the reader gets the masked one. A hash still lets them join and count distinct customers without seeing an address.' : 'This reader holds the fine-grained role on every tag. Keep that group small, and review it.') +
          '<p class="lab-note">From the documentation: columns are tagged through a taxonomy, masking is attached to a tag, and a row policy filters rows by who is asking. Values are made up. The exact masked output of each rule is in the documentation. Not run on Google Cloud.</p></div>';
        box.innerHTML = h;
        A.bindWidget = function (act, el) { var v = el.getAttribute('data-v'); if (act === 'mk-r') st.r = v; if (act === 'mk-p') st.p = v; A.render(true); };
      }
    };
  })();

  /* ====================== A split that does not leak ====================== */
  (function () {
    W.split = {
      steps: function () { return 1; },
      hint: 'Split by order, then by customer. Read how many customers sit on both sides.',
      say: function () { return 'You train a model on customers that buy often, and test it on orders. If one customer has orders in both sets, the model has met them already. Pick the key of the split with a stable hash and read how many customers sit on both sides. The hash is a stand-in for FARM_FINGERPRINT, so the numbers are not BigQuery\'s, but the effect is the same.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var S = G.counts('sql.split'), st = A.local.sp2 || (A.local.sp2 = { k: 'order' }), d = st.k === 'order' ? S.by_order : S.by_customer, both = st.k === 'order' ? S.customers_in_both_when_split_by_order : S.customers_in_both_when_split_by_customer;
        var h = '<div class="lab">' + row('Split by', chips(['order', 'customer'], st.k, 'sp2-k', function (k) { return k === 'order' ? 'order id' : 'customer id'; })) +
          table(['Part', 'Orders', 'Customers'], ['train', 'test'].map(function (p) { return [p, fmtN(d[p].orders), fmtN(d[p].customers)]; })) +
          '<div class="lab-out">' + big(fmtN(both), 'customers on both sides', both ? 'bad' : 'good') + '</div>' +
          callout(both ? 'warn' : 'good', both ? 'Every customer with several orders has orders on **both sides**, so the test set is not new to the model. The score will look better than it will be in production.' : 'Each customer is on **one side only**, because the hash is taken of the customer id. The same customer always lands on the same side, today and next month. That is a split that does not leak.') +
          '<p class="lab-note">Made-up orders. The split is MOD(ABS(hash(key)), 10) below 8 for train. ' + esc(S.note) + '.</p></div>';
        box.innerHTML = h;
        A.bindWidget = function (act, el) { if (act === 'sp2-k') st.k = el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== Terraform: close the gaps that Checkov finds ====================== */
  (function () {
    var FIXES = ['bucket', 'dataset', 'table', 'iam', 'topic'];
    var LABEL = { bucket: 'the bucket: uniform access, no public access, versioning, logging', dataset: 'the dataset: no public readers, a customer key', table: 'the table: deletion protection, a customer key', iam: 'the role: a narrow one instead of owner', topic: 'the topic: a customer key' };
    W.iac = {
      steps: function () { return 1; },
      hint: 'Switch fixes on. Read which checks are left.',
      say: function () { return 'Checkov scanned the Terraform for Google Cloud and found eleven gaps. Each fix below is a change to one resource. Switch fixes on and read which checks are left. The recorded scans were done one fix at a time and all together, and the lab adds up the single ones. Nothing was applied: Terraform itself was not run.'; },
      mood: function () { return 'happy'; },
      render: function (box, s, i, A) {
        var C = G.counts('tf.checkov'), N = G.table('tf.checks'), st = A.local.ic || (A.local.ic = { on: {} }), names = {};
        N.rows.forEach(function (r) { names[r[0]] = r[1]; });
        var base = C.baseline.failed, cleared = {};
        FIXES.forEach(function (f) { if (st.on[f]) base.forEach(function (x) { if (C['fix_' + f].failed.indexOf(x) < 0) cleared[x] = f; }); });
        var left = base.filter(function (x) { return !cleared[x]; }), all = FIXES.every(function (f) { return st.on[f]; });
        var rows = base.map(function (x) { var id = x.split(' ')[0]; return [id, x.split(' ')[1], names[id], cleared[x] ? 'fixed by the ' + cleared[x] + ' change' : 'failing']; });
        var h = '<div class="lab">' + row('Changes to make', toggles(FIXES, st.on, 'ic-f', function (k) { return LABEL[k]; })) +
          table(['Check', 'Resource', 'What it asks', 'State'], rows, null, function (r, ri, ci) { return ci === 3 ? (r[3] === 'failing' ? 'wbad' : 'wgood') : ''; }) +
          '<div class="lab-out">' + big(left.length, 'checks failing', left.length ? 'bad' : 'good') + big(C.baseline.passed + (base.length - left.length), 'checks passing', 'good') + '</div>' +
          callout(all ? (left.length === 0 && C.all_fixed.failed_count === 0 ? 'good' : 'warn') : 'tip', all ? 'All five changes: **' + left.length + ' failing**, which is also what the scan of the fully fixed file said (' + C.all_fixed.failed_count + ' failing, ' + C.all_fixed.passed + ' passing). The sum of the single fixes equals the combined scan, because these checks look at one resource each.' : 'Each change touches one resource and clears the checks of that resource. A scan in the pipeline turns this list into a gate: the pull request fails until the list is short, or each exception is written down.') +
          '<p class="lab-note">Checkov ' + esc(G.meta('checkov')) + ' on a small Terraform file. Terraform was not run, and no resource exists. A passing scan is not a secure system: it is a list of rules that somebody wrote.</p></div>';
        box.innerHTML = h;
        A.bindWidget = function (act, el) { if (act === 'ic-f') { var v = el.getAttribute('data-v'); st.on[v] = !st.on[v]; } A.render(true); };
      }
    };
  })();

  LAB.partsWrap();
})();
