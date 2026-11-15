/* PostgreSQL course labs. Each one registers LAB.W.<kind> with steps, say, render.
   What a lab shows as a result comes from js/real.js: real PostgreSQL 16 on throwaway servers.
   Text in notes and callouts goes through the formatter: use `code` and **bold**, never HTML tags. Managed services did not run. */
(function () {
  var LAB = (window.LAB = window.LAB || {});
  var W = (LAB.W = LAB.W || {});
  var esc = LAB.esc, md = LAB.md, G = LAB.get;

  function chips(list, cur, act, fmt) {
    return '<div class="sel-chips">' + list.map(function (k) { return '<button type="button" class="sel-chip' + (String(k) === String(cur) ? ' on' : '') + '" data-act="' + act + '" data-v="' + esc(String(k)) + '">' + esc(fmt ? fmt(k) : String(k)) + '</button>'; }).join('') + '</div>';
  }
  function row(label, inner) { return '<div class="lab-row"><span class="lab-l">' + esc(label) + '</span>' + inner + '</div>'; }
  function table(cols, rows, rowCls, numFrom) {
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr>' + cols.map(function (c, ci) { return '<th' + (numFrom != null && ci >= numFrom ? ' class="rnum"' : '') + '>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r, ri) { return '<tr class="' + (rowCls ? rowCls(r, ri) || '' : '') + '">' + r.map(function (c, ci) { return '<td' + (numFrom != null && ci >= numFrom ? ' class="rnum"' : '') + '>' + esc(String(c)) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  function big(items) { return '<div class="lab-out">' + items.map(function (x) { return '<div class="big' + (x[2] ? ' ' + x[2] : '') + '"><b>' + esc(String(x[0])) + '</b><span>' + esc(x[1]) + '</span></div>'; }).join('') + '</div>'; }
  function callout(kind, text) { return '<div class="callout ' + kind + '">' + md(text) + '</div>'; }
  function note(recorded, computed) {
    return '<p class="lab-note"><span class="pill real">Recorded</span>' + md(recorded) + (computed ? ' <span class="pill">Computed</span>' + md(computed) : '') + '</p>';
  }
  function bar(label, v, max, text, cls) {
    var pc = max > 0 ? Math.max(1, Math.min(100, v / max * 100)) : 0;
    return '<div class="lane"><span class="lane-n">' + esc(label) + '</span><div class="lane-track"><i class="' + (cls || '') + '" style="width:' + pc + '%"></i></div><span class="lane-v">' + esc(text) + '</span></div>';
  }
  var n = G.n;
  function pre(text, cls) { return '<pre class="lab-pre' + (cls ? ' ' + cls : '') + '">' + esc(text) + '</pre>'; }




  function mbs(x) { return (x / 1048576).toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' MB'; }

  /* ====================== 1. A table that is updated: size, dead rows, free space ====================== */
  W.bloat = (function () {
    var WHY = [
      ['good', 'The table holds 100,000 rows and no dead rows. The file is the size of the data, and the primary key index is **2.2 MB**.'],
      ['warn', 'Every row has **two versions** now: the new one, and the old one that nobody can see. The file is **twice** the size, and half of its rows are dead.'],
      ['warn', 'Three versions of every row exist or have existed. The file keeps growing, and the dead rows are still counted.'],
      ['bad', 'The file is **four times** the size of the data. Rows of the earlier updates were recycled inside pages, but the file never got smaller.'],
      ['tip', '`VACUUM` removed every dead row, and the file did **not** get smaller. The space is now **free inside the file**, and new row versions will use it.'],
      ['tip', 'Another update of every row, and the file did **not** grow: the new versions went into the space that `VACUUM` had freed.'],
      ['good', '`VACUUM FULL` **rewrote** the table into a new file: the original size again. It holds an exclusive lock for the whole time, so it is an outage and not a routine.']
    ];
    return {
      steps: function () { return 1; },
      hint: 'Pick a step of the series and read the size.',
      say: function () { return 'One table of 100,000 rows. I updated every row, three times, then ran VACUUM, updated once more, and finally ran VACUUM FULL. After each step I asked the pgstattuple extension how big the file was and how many rows in it were dead. Pick a step and say whether the file can shrink.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var t = G.table('mvcc.bloat'), st = A.local.bl || (A.local.bl = { k: 3 }), r = t.rows[st.k], max = Math.max.apply(null, t.rows.map(function (x) { return x[1]; }));
        var h = '<div class="lab">' + row('Step', chips(t.rows.map(function (x, k) { return k; }), st.k, 'bl-k', function (k) { return (k + 1) + '. ' + t.rows[k][0]; }));
        h += bar('the file', r[1], max, mbs(r[1]), r[1] > t.rows[0][1] * 1.5 ? 'bad' : 'good');
        h += bar('dead rows', r[4], 100000, n(r[4]), r[4] ? 'bad' : 'good');
        h += bar('free space in the file', r[6], 100, r[6] + ' %', r[6] > 20 ? 'warn' : 'good');
        h += big([[r[3] ? n(r[3]) : '0', 'live rows'], [n(r[4]), 'dead rows', r[4] ? 'warn' : 'good'], [r[6] + ' %', 'free space', r[6] > 20 ? 'warn' : ''], [mbs(r[7]), 'primary key index']]);
        h += callout(WHY[st.k][0], WHY[st.k][1]);
        h += note(' The numbers come from `pgstattuple` on a real table. The pages that earlier updates freed by themselves (page pruning) are the reason that the dead count is not exactly 100,000 at every step.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'bl-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 2. Four ways to load 20,000 rows ====================== */
  W.loadlab = (function () {
    var WHY = [
      'Every INSERT is its own transaction, so every one **waits for the log to reach the disk**: one flush for each row. Nothing is wrong with the data. The cost is the round trips and the flushes.',
      'One transaction, 20,000 statements. The log was flushed a handful of times and not 20,000, but the client still sent **20,000 statements** and waited for each answer.',
      'Twenty statements of 1,000 rows each, in one transaction. A fraction of the round trips, one commit, and the same rows.',
      '`COPY` reads the whole file in **one statement**. It wrote the **least log** (no per-statement overhead) and it is the way to load a file. A single bad row stops the whole `COPY`.'
    ];
    return {
      steps: function () { return 1; },
      hint: 'Pick a method and compare the five numbers.',
      say: function () { return 'The same 20,000 orders, loaded four ways into an empty table. I counted what the client sent, how many commits there were, how many times the log was flushed to disk, how many bytes of log were written, and the seconds on this machine. Pick a method and say what the server had to do for each row.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var t = G.table('load.methods'), st = A.local.lm || (A.local.lm = { k: 0 }), r = t.rows[st.k], maxS = Math.max.apply(null, t.rows.map(function (x) { return x[5]; }));
        var h = '<div class="lab">' + row('Method', chips(t.rows.map(function (x, k) { return k; }), st.k, 'lm-k', function (k) { return t.rows[k][0]; }));
        h += big([[n(r[1]), 'statements sent', r[1] > 1000 ? 'warn' : 'good'], [n(r[2]), 'commits', r[2] > 1000 ? 'warn' : 'good'], [n(r[4]), 'log flushes to disk', r[4] > 1000 ? 'bad' : 'good'], [mbs(r[3]), 'log written'], [n(r[6]), 'rows loaded']]);
        h += bar('seconds on this machine', r[5], maxS, r[5].toLocaleString('en-US', { minimumFractionDigits: 2 }) + ' s', r[5] > 1 ? 'bad' : 'good');
        h += callout(st.k === 3 ? 'good' : st.k === 0 ? 'bad' : 'tip', WHY[st.k]);
        h += note(' Seconds depend on the machine and its disk. The counts of statements, commits and flushes do not.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'lm-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 3. Six runs of an upsert ====================== */
  W.upsert = (function () {
    var WHY = [
      ['good', 'The first night: 100,000 rows inserted into an empty table.'],
      ['bad', 'The **same file** again, with a plain `DO UPDATE`: every row was **updated to the values it already had**. That wrote 100,000 new row versions, and the table is **twice** the size.'],
      ['good', 'The same file with `DO UPDATE ... WHERE the row differs`: **0 rows** written, and the file did not grow. This is what makes a load safe to run twice.'],
      ['good', 'A file with 1,000 changed rows: exactly 1,000 rows were updated, and the file grew by about 90 KB.'],
      ['good', 'The same file once more, with `MERGE`: 0 rows. `MERGE` with a condition on `WHEN MATCHED` does the same job.'],
      ['good', '500 other rows changed: `MERGE` reported 500, and the table did not grow because the space of earlier versions was reused.']
    ];
    return {
      steps: function () { return 1; },
      hint: 'Pick a run and read what it wrote.',
      say: function () { return 'The orders file of every night loaded into one table. Pick a run and say how many rows it wrote, and why a load that writes nothing is good news.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var t = G.table('load.upsert'), st = A.local.up || (A.local.up = { k: 1 }), r = t.rows[st.k], maxB = Math.max.apply(null, t.rows.map(function (x) { return x[4]; }));
        var h = '<div class="lab">' + row('Run', chips(t.rows.map(function (x, k) { return k; }), st.k, 'up-k', function (k) { return (k + 1) + '. ' + t.rows[k][0]; }));
        h += pre('-- ' + r[0] + '\n' + r[1], 'cmd');
        h += big([[n(r[2]), 'rows inserted'], [n(r[3]), 'rows updated', r[3] > 5000 ? 'bad' : r[3] ? 'warn' : 'good'], [mbs(r[4]), 'table size', r[4] > t.rows[0][4] * 1.5 ? 'bad' : 'good']]);
        h += bar('table size', r[4], maxB, mbs(r[4]), r[4] > t.rows[0][4] * 1.5 ? 'bad' : 'good');
        h += callout(WHY[st.k][0], WHY[st.k][1]);
        h += note(' The tag is the one the server returned. `INSERT 0 N` counts the rows that were inserted **or updated**. Rows updated and inserted come from `pg_stat_user_tables`.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'up-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 4. Which index for which question ====================== */
  W.indexlab = (function () {
    function cases() {
      var C = G.counts, X = G.text, br = C('idx.brin'), pa = C('idx.partial'), io = C('idx.index_only'), js = C('idx.jsonb'), stt = C('idx.stats');
      return [
        { k: 'brin', label: 'A day of a time-ordered table', question: 'One day out of 35 in a table of a million events.', plan: X('idx.plan_brin'), good: true,
          nums: [[br.btree_mb + ' MB', 'a btree on event_ts'], [br.brin_kb + ' KB', 'a BRIN on event_ts', 'good'], [String(br.btree_over_brin) + ' x', 'smaller']],
          why: 'The rows arrived in time order, so the **correlation** of `event_ts` with the position in the file is **' + br.correlation_in_order + '**. A BRIN index stores the lowest and the highest value of each block range, and that is enough. The plan rechecks **' + n(br.recheck_removed) + '** rows that the index let through and still wins on size.' },
        { k: 'shuffled', label: 'The same table, in random order', question: 'The same rows, stored in a random order.', plan: X('idx.plan_brin_shuffled'), good: false,
          nums: [[String(br.correlation_shuffled), 'correlation of event_ts', 'bad'], [br.shuffled_plan_uses_brin ? 'BRIN' : 'sequential scan', 'what the planner chose', 'warn']],
          why: 'With the rows in a random order every block range holds early and late values, so a BRIN index excludes nothing. The planner **ignored** the index and read the whole table. BRIN is for columns whose order follows the order of the file.' },
        { k: 'partial', label: 'A rare kind of row', question: 'The purchases of one user (1,000 of a million rows).', plan: X('idx.plan_partial'), good: true,
          nums: [[pa.full_mb + ' MB', 'an index on every row'], [pa.partial_kb + ' KB', 'a partial index', 'good'], [String(pa.times_smaller) + ' x', 'smaller']],
          why: 'The partial index holds only rows where `kind = \'purchase\'`, so it is **' + pa.times_smaller + ' times smaller** and cheaper to keep up to date. The query must contain the same condition, or the planner cannot use the index.' },
        { k: 'covering', label: 'Answer from the index alone', question: 'The user and the time of every event of one user.', plan: X('idx.plan_ios_before') + '\n\n' + X('idx.plan_ios_after'), good: true,
          nums: [['0 of ' + n(io.pages), 'pages marked all-visible, before', 'bad'], [n(io.all_visible_pages_after), 'pages all-visible, after VACUUM', 'good'], [String(io.heap_fetches_after), 'heap fetches after', 'good']],
          why: 'An **index-only scan** needs the **visibility map**: a page is skipped only when `VACUUM` has marked it all-visible. Right after the load no page was marked, so the planner did not choose the scan. After `VACUUM` it did, with **0 heap fetches**.' },
        { k: 'jsonb', label: 'A key inside JSONB', question: 'Events where payload contains a country, a device and n = 42, or where payload ->> n is 42.', plan: X('idx.plan_gin') + '\n\n' + X('idx.plan_jsonb_arrow') + '\n\n' + X('idx.plan_jsonb_expr'), good: true,
          nums: [[js.gin_mb + ' MB', 'the GIN index'], [js.contain_uses_gin ? 'used' : 'not used', '@> with GIN', 'good'], [js.arrow_uses_gin ? 'used' : 'not used', '->> with GIN', 'bad'], [js.expr_uses_index ? 'used' : 'not used', '->> with an expression index', 'good']],
          why: 'A GIN index answers **containment** (`@>`) and key tests. It does **not** answer `payload ->> \'n\' = \'42\'`: that needs a **btree on the expression** with exactly the same text. The planner matched the expression and used it.' },
        { k: 'stats', label: 'Two columns that go together', question: 'Open orders of store 5: the planner multiplies two selectivities.', plan: X('idx.plan_stats_before') + '\n\n' + X('idx.plan_stats_after'), good: true,
          nums: [[String(stt.estimate_before), 'estimated rows, before', 'bad'], [String(stt.estimate_after), 'estimated rows, with statistics on both columns', 'good'], [String(stt.actual), 'rows found']],
          why: 'The planner assumes that `status` and `store_id` are **independent**, so it multiplies their frequencies and expects **' + stt.estimate_before + '** rows. Open orders only come from three of the twelve stores, and the real number is **' + stt.actual + '**. `CREATE STATISTICS ... (mcv)` stores the combinations, and the estimate moved to **' + stt.estimate_after + '**.' }
      ];
    }
    W.indexInfo = { cases: cases };
    return {
      steps: function () { return 1; },
      hint: 'Pick a question and read the plan.',
      say: function () { return 'Six questions about a table of a million events or 200,000 orders, each with the plans that PostgreSQL printed. Pick one, read the numbers, and say which index fits and which does not.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var cs = cases(), st = A.local.ix || (A.local.ix = { k: 'brin' }), c = cs.filter(function (x) { return x.k === st.k; })[0];
        var h = '<div class="lab">' + row('Question', chips(cs.map(function (x) { return x.k; }), st.k, 'ix-k', function (k) { return cs.filter(function (x) { return x.k === k; })[0].label; }));
        h += '<p class="lab-q">' + esc(c.question) + '</p>';
        h += big(c.nums);
        h += pre(c.plan, 'cmd');
        h += callout(c.good ? 'good' : 'bad', c.why);
        h += note(' The plans are `EXPLAIN (ANALYZE, TIMING OFF)` output. Times were left out, because they change from run to run.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'ix-k') st.k = el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 5. The queue behind a migration ====================== */
  W.queuelab = (function () {
    var KINDS = [['ab', 'A reads, B migrates'], ['abc', 'C arrives'], ['timeout', 'B has a lock timeout']];
    function view(k) {
      var T = G.table('ops.queue'), C = G.counts, rows = T.rows, mt = C('ops.migration_timeout');
      if (k === 'ab') return { rows: rows.filter(function (r) { return r[0] !== 'C'; }), kind: 'warn', big: [['waits', 'session B'], ['A', 'is what B waits for']], why: 'Session A read the table and has not committed, so it holds a share lock until it does. Session B needs an **exclusive** lock to change the table, so it **waits for A**. A migration that waits is already a problem, because of what happens next.' };
      if (k === 'abc') return { rows: rows, kind: 'bad', big: [['waits', 'session C'], ['B', 'is what C waits for']], why: 'Session C only wants to **read**, and a read does not conflict with A. It waits anyway, **behind B**: the lock queue is first come, first served, and B is ahead of C with a request that conflicts with everybody. Every new query on the table now stops, until A commits and B finishes.' };
      return { rows: null, kind: 'good', big: [[mt.refused ? 'refused' : 'ran', 'B with lock_timeout = 300 ms'], [mt.reader_not_blocked ? 'at once' : 'late', 'a new reader']], why: 'With `SET lock_timeout`, B gives up after the time it was given and reports an error. The error is a nuisance and an outage is not: nobody queued behind B, and the migration can run again when A has finished.' };
    }
    W.queueInfo = { kinds: KINDS, view: view };
    return {
      steps: function () { return 1; },
      hint: 'Pick a moment and read who waits for whom.',
      say: function () { return 'Three sessions on one table. I opened them in this order and read pg_stat_activity and pg_blocking_pids after each step. Pick a moment and say who is blocked, and by whom.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var T = G.table('ops.queue'), st = A.local.qu || (A.local.qu = { k: 'abc' }), v = view(st.k);
        var h = '<div class="lab">' + row('Moment', chips(KINDS.map(function (x) { return x[0]; }), st.k, 'qu-k', function (k) { return KINDS.filter(function (x) { return x[0] === k; })[0][1]; }));
        if (v.rows) h += table(T.cols, v.rows, function (r) { return r[4] !== '-' ? 'dup' : ''; });
        else h += pre('SET lock_timeout = \'300ms\';\nALTER TABLE orders ADD COLUMN migrated2 int;\n' + G.text('ops.migration_timeout').split('\n').slice(1).join('\n'), 'cmd');
        h += big(v.big.map(function (b, k) { return [b[0], b[1], k === 0 ? v.kind : '']; }));
        h += callout(v.kind, v.why);
        h += note(' The sessions are A, B and C of one recording. `blocked by` is the answer of `pg_blocking_pids`.');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'qu-k') st.k = el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();

  /* ====================== 6. A replication slot that nobody reads ====================== */
  W.slotlab = (function () {
    var WHY = [
      ['bad', 'A slot created for a reader that never came. It is **not active**, and the server keeps **every log segment since the slot was created**, so the disk fills while the table is healthy. Check `pg_replication_slots` for slots that are not active.'],
      ['good', 'The slot of the running subscription is active and its reader is close behind, so it holds back far less log.'],
      ['bad', 'After `max_slot_wal_keep_size` was set to 16 MB and a checkpoint ran, the slot went to **lost**: the server removed the log that it needed. The reader can never catch up. The disk is safe, and the slot has to be dropped and the subscriber or the CDC connector set up again.']
    ];
    return {
      steps: function () { return 1; },
      hint: 'Pick a slot and read how much log it holds.',
      say: function () { return 'A primary with two replication slots: the slot of a running subscription, and a slot that I created and never read. After 450,000 rows of changes I read pg_replication_slots. Pick a state and say what it costs.'; },
      mood: function () { return 'think'; },
      render: function (box, s, i, A) {
        var t = G.table('repl.slots'), st = A.local.sl || (A.local.sl = { k: 0 }), r = t.rows[st.k], mb_ = typeof r[3] === 'number' ? r[3] : null;
        var order = [0, 1, 2];
        var h = '<div class="lab">' + row('Slot', chips(order, st.k, 'sl-k', function (k) { return t.rows[k][0]; }));
        h += big([[r[1] ? 'yes' : 'no', 'a reader is connected', r[1] ? 'good' : 'bad'], [r[2], 'wal_status', r[2] === 'reserved' ? 'good' : 'bad'], [mb_ === null ? 'none' : mb_ + ' MB', 'log kept for this slot', mb_ && mb_ > 50 ? 'bad' : '']]);
        if (mb_ !== null) h += bar('log kept', mb_, 80, mb_ + ' MB', mb_ > 50 ? 'bad' : 'good');
        h += callout(WHY[st.k][0], WHY[st.k][1]);
        h += note(' The statuses are those of `pg_replication_slots`: `reserved` means the log is kept, `lost` means that it was removed. A reader of the lost slot got: `' + G.text('repl.slot_lost').split('\n')[1] + '`');
        box.innerHTML = h + '</div>';
        A.bindWidget = function (act, el) { if (act === 'sl-k') st.k = +el.getAttribute('data-v'); A.render(true); };
      }
    };
  })();
})();
