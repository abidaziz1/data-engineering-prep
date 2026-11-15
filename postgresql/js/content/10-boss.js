/* Mission 10: boss round. Two drills that mix the missions, a design decision, a coding round, a mock interview and a one-page review. */
(function () {
  var B = LAB.b, G = LAB.get;
  var C = G.counts, X = G.text, n = G.n;
  var PR = C('srv.processes'), TB = C('srv.table'), SL0 = C('srv.slots');
  var BL = C('mvcc.bloat'), HD = C('mvcc.held'), HT = C('mvcc.hot'), AV = C('mvcc.autovacuum'), VE = C('mvcc.versions');
  var FP = C('wal.fpi'), CM = C('wal.commits'), CR = C('crash');
  var LM = G.table('load.methods').rows, US = C('load.upsert'), AN = C('load.analyze'), LW = G.table('load.wal').rows;
  var BR = C('idx.brin'), PA = C('idx.partial'), IO = C('idx.index_only'), JS = C('idx.jsonb'), ST = C('idx.stats'), WC = C('idx.write_cost');
  var PS = C('part.pruning'), RT = C('part.retention');
  var LG = C('repl.lag'), CF = C('repl.conflict'), DD = C('repl.ddl'), SQ = C('repl.sequence'), SL = C('repl.slots');
  var DU = C('bk.dump'), PI = C('bk.pitr'), CK = C('bk.checksums');
  var RL = C('ops.rls'), SO = C('ops.sort'), QU = C('ops.queue'), MT = C('ops.migration_timeout'), RW = C('ops.rewrites'), PG = C('ops.pgss');
  var UPS = G.file('upsert.sql');
  var mbOf = function (b) { return (b / 1048576).toFixed(1) + ' MB'; };
  var UP = G.table('load.upsert').rows, BR_ROWS = G.table('mvcc.bloat').rows;
  var QA = [['qa-processes', 1], ['qa-pages', 1], ['qa-toast', 2], ['qa-connections', 1], ['qa-settings', 2],
    ['qa-mvcc', 1], ['qa-vacuum', 1], ['qa-bloat', 1], ['qa-autovacuum', 2], ['qa-hot', 2], ['qa-horizon', 2], ['qa-wrap', 3],
    ['qa-wal', 1], ['qa-checkpoint', 1], ['qa-crash', 1], ['qa-synccommit', 2], ['qa-fpi', 3], ['qa-unlogged', 2],
    ['qa-copy', 1], ['qa-upsert', 1], ['qa-idempotent', 1], ['qa-batch', 1], ['qa-merge', 2], ['qa-analyze', 2],
    ['qa-explain', 1], ['qa-brin', 2], ['qa-partial', 2], ['qa-ios', 2], ['qa-jsonb', 2], ['qa-stats', 2], ['qa-indexcost', 1],
    ['qa-partition', 1], ['qa-pruning', 1], ['qa-retention', 1], ['qa-partkey', 2], ['qa-default', 2],
    ['qa-standby', 1], ['qa-conflict', 2], ['qa-logical', 1], ['qa-slot', 1], ['qa-ddl', 2], ['qa-cdc', 2], ['qa-lag', 1],
    ['qa-dump', 1], ['qa-pitr', 1], ['qa-backuptypes', 1], ['qa-verify', 2], ['qa-checksums', 3], ['qa-timeline', 3],
    ['qa-roles', 1], ['qa-hba', 2], ['qa-workmem', 2], ['qa-locks', 1], ['qa-ddlsafe', 2], ['qa-pgss', 1], ['qa-pooler', 2]];

  LAB.addChapter({
    id: 'm10', n: 10, title: 'Boss round', short: 'Boss round', blurb: 'Two drills, a design decision, a coding round, a mock interview and a one-page review', minutes: 40,
    focus: ['src', 'stg', 'ing', 'mart', 'air', 'mon', 'qual', 'ci'],
    goals: [
      'Solve **drills** that combine several missions.',
      'Write the **idempotent upsert** of a nightly load from a list of requirements.',
      'Answer a **mock interview round** with a timer, and grade yourself honestly.',
      'Keep a **one-page review** of the rules and the recorded numbers.'
    ],
    say: 'This is the last mission. Two drills in which more than one thing goes wrong, one design decision, one coding round, and then the interview questions with no notes. Grade yourself honestly. An honest grade is the only one worth reading.',
    scenes: [
      B.incident({
        id: 'm10-drill1', t: 1, src: 'rec', title: 'Drill 1: the dashboards are slow and the disk is at 85 %', time: '06:50',
        alert: '**Every dashboard is slow, and the disk alarm is at 85 %.** The orders table was 8 MB two days ago and is 17 MB. The nightly load reported `INSERT 0 100000` two nights in a row for files that had no new orders. A loader session has been `idle in transaction` since 01:10.',
        clues: ['The loader uses `ON CONFLICT ... DO UPDATE` with no `WHERE`', '`pg_stat_user_tables` shows 100,000 updates last night and a large number of dead rows', '`VACUUM` ran, and still reports many dead rows that are not yet removable'],
        opts: [
          { t: 'End the old session, add the `WHERE ... IS DISTINCT FROM` to the upsert, and run a plain `VACUUM`', fb: '' },
          { t: 'Run `VACUUM FULL orders`', fb: 'It takes an exclusive lock on a table that every dashboard reads, and while the old session is open it would not clear the dead rows either.' },
          { t: 'Add disk and index more columns', fb: 'The table is bloated by the load and held by an old transaction. More disk and more indexes make it worse.' },
          { t: 'Raise `autovacuum_vacuum_scale_factor`', fb: 'It makes vacuum start later. The rows are not removable until the old session ends.' }
        ],
        best: 0,
        why: 'Two missions at once. **Mission 4**: a plain `DO UPDATE` rewrote ' + n(US.plain_second_updated) + ' rows and doubled the table (' + mbOf(UP[0][4]) + ' to ' + mbOf(UP[1][4]) + '). **Mission 2**: one open snapshot kept ' + n(HD.not_yet_removable_while_held) + ' dead rows from being removed, and they went when it ended. Fix both: the old session first, then the statement, then a vacuum.',
        checks: [
          ['Find the holder', '`pg_stat_activity` ordered by `xact_start`. End the old session.'],
          ['Read the tag', '`INSERT 0 100000` for a file with no new orders is the sign of an unconditional update.'],
          ['Fix the statement', '`WHERE (old values) IS DISTINCT FROM (new values)`, and log the rows written.'],
          ['Vacuum, do not shrink', 'A plain `VACUUM` lets the space be reused. The table will not grow again.']
        ],
        tell: 'The load rewrote every row each night, and an old session held the vacuum horizon back, so the dead rows could not be removed. I ended the old session, changed the upsert so that it only updates rows that differ, and ran a plain vacuum. The table keeps its size and will not grow. The load now logs how many rows it writes.',
        prevent: ['Write **only what changed**, and log the count', 'Set **`idle_in_transaction_session_timeout`**', 'Alert on **dead rows** and on the **age of the oldest transaction**']
      }),

      B.incident({
        id: 'm10-drill2', t: 2, src: 'rec', title: 'Drill 2: reports are cancelled, then the primary runs out of disk', time: '04:40',
        alert: '**Last month the reports on the standby kept failing with *conflict with recovery*, so someone switched `hot_standby_feedback` on. Now the primary\'s tables are bloated and `pg_wal` has 90 GB.** A CDC connector was removed two weeks ago. One report on the standby has been running since yesterday.',
        clues: ['`pg_replication_slots` has an inactive slot with `wal_status = reserved`', '`pg_stat_replication` shows a `backend_xmin` that is a day old', 'There is no `max_slot_wal_keep_size` on the primary'],
        opts: [
          { t: 'Drop the abandoned slot, end or move the day-old report, switch feedback off, and set `max_slot_wal_keep_size`', fb: '' },
          { t: 'Delete the oldest files in `pg_wal`', fb: 'It corrupts the server.' },
          { t: 'Restart the primary', fb: 'The slot and the standby\'s snapshot are still there afterwards.' },
          { t: 'Resize the disk and leave everything', fb: 'The log and the dead rows will fill the new space too.' }
        ],
        best: 0,
        why: 'Two causes from **mission 7**. A slot that nobody reads kept **' + SL.forgotten_retained_mb + ' MB** in the recording and stayed `' + SL.forgotten_status + '`, and only a limit turned it to `' + SL.status_after_limit + '`. And with feedback **on**, a long query on the standby kept **' + n(CF.on_not_yet_removable) + '** dead rows alive on the primary, while with feedback off it was cancelled and **' + n(CF.off_removed) + '** were removed. Fix the slot, the report and the setting.',
        checks: [
          ['List the slots', '`pg_replication_slots`: inactive, and how far behind `restart_lsn` is.'],
          ['Find the old snapshot', '`pg_stat_replication.backend_xmin`, and the report on the standby.'],
          ['Choose for the reports', 'A dedicated standby for long reports, with feedback off and a longer delay.'],
          ['Limit and alert', '`max_slot_wal_keep_size`, and alerts on inactive slots and on old snapshots.']
        ],
        tell: 'Two things held the primary back: a slot of a removed connector, and a day-old report on the standby with feedback on. I dropped the slot after confirming with the team, ended the report, and moved long reports to a standby of their own with feedback off. We set a limit on slot log and alerts on inactive slots and on the age of the oldest snapshot.',
        prevent: ['Drop a **slot** in the same change that removes its reader', 'Give long reports **their own standby**', 'Alert on **inactive slots** and **old snapshots**']
      }),

      B.decide({
        id: 'm10-dec', t: 2, src: 'docs', title: 'Decision: one PostgreSQL for loads, reports and CDC',
        scenario: 'Brewline wants one PostgreSQL deployment for the nightly load, dashboards, long ad hoc reports, a CDC feed to the warehouse, and a recovery plan with an hour of acceptable loss. Fifty services connect for short queries.',
        opts: [
          { t: 'A primary for loads and the services behind a pooler, a standby for the dashboards, a second standby for long reports, a logical slot for CDC with a size limit and an alert, and base backups with an archive that are restored on a schedule', d: 'Each job has a place where it cannot hurt the others. The slot and the standby conflicts are bounded. Recovery is tested.', lose: 'Several servers and components to run, and a runbook for each of them.' },
          { t: 'One server for everything, with `max_connections` raised', d: 'The simplest to run.', lose: 'A long report holds the vacuum horizon back on the server that loads. A migration queues the services. One slot of a removed connector fills the disk.' },
          { t: 'One server and nightly dumps only', d: 'Cheap.', lose: 'A day of loss, not an hour, and a restore that rebuilds every index.' }
        ],
        pick: 0,
        why: 'Every row of the answer is a failure of this course: the **horizon** held by a report (mission 2), a **conflict** and a **slot** (mission 7), the **queue** behind a migration (mission 9) and the **recovery point** (mission 8). Separating the jobs costs servers and saves incidents. A managed service and a real pooler were not run: those parts are from documentation.',
        when: 'A small team with a small database can start with one server, the backup and the alerts, and split when the first report hurts.'
      }),

      B.challenge({
        id: 'm10-ch', t: 1, title: 'Coding round: the idempotent upsert', file: 'upsert.sql', lang: 'sql',
        q: 'The staging table `stg` has the same columns as `orders` (`order_id`, `store_id`, `customer_id`, `order_ts`, `amount`, `status`, `note`) and may hold the **same `order_id` twice**. Write **one statement** that loads it into `orders` so that: an order that does not exist is **inserted**; an order that exists is **updated only if some column differs**; if an `order_id` appears twice in `stg`, the row with the **newest `order_ts`** is used; and running it a second time with the same data writes **nothing**.',
        starter: 'INSERT INTO orders (order_id, store_id, customer_id, order_ts, amount, status, note)\n-- ...',
        hints: ['`SELECT DISTINCT ON (order_id) ... ORDER BY order_id, order_ts DESC` keeps one row for each order, the newest.', '`ON CONFLICT (order_id) DO UPDATE SET col = EXCLUDED.col, ...` needs the unique key `order_id`.', 'Compare the whole old row with the whole new row: `WHERE (orders.a, orders.b, ...) IS DISTINCT FROM (EXCLUDED.a, EXCLUDED.b, ...)`.'],
        sol: UPS,
        res: { cols: ['run of the loader of the project', 'rows written'], rows: [['the first file of 5,000 orders', String(C('project.load').first_run)], ['the same file again', String(C('project.load').second_run_same_file)], ['one amount changed', String(C('project.load').third_run_one_row_changed)], ['a file with one order twice', String(C('project.load').fourth_run_file_with_a_duplicate_row)]], msg: 'from the recording' },
        expl: ['`DISTINCT ON (order_id)` with `ORDER BY order_id, order_ts DESC` removes the duplicates **inside the file** and keeps the newest. Without it the statement stops with *cannot affect row a second time*.', '`ON CONFLICT (order_id) DO UPDATE` inserts new orders and updates existing ones. `EXCLUDED` holds the proposed row.', 'The `WHERE ... IS DISTINCT FROM` compares the old row with the new one, so an unchanged row is **not written**: the second run of the recording wrote **' + C('project.load').second_run_same_file + '** rows, and a plain `DO UPDATE` wrote ' + n(US.plain_second_updated) + ' and doubled the table.'],
        cx: 'Run it in one transaction after a `COPY` into a temporary staging table, log the number of rows written, and `ANALYZE` after a large change.'
      })
    ].concat(B.mockRound(QA.map(function (x) { return x[0]; }), QA.map(function (x) { return x[1]; }))).concat([
      B.cheat({
        id: 'm10-cheat', t: 1, src: 'rec', title: 'One page to review',
        say: 'This is your last-minute review. Every number comes from the recording on real PostgreSQL ' + G.meta('postgres') + '. Items marked (docs) come from documentation and were not run. Take a screenshot or print the page.',
        sections: [
          { h: 'The server and its files', items: ['One backend process for each connection (' + PR.clients_opened + ' clients, ' + PR.client_processes + ' processes) and ' + PR.background_processes + ' background ones. Ten slots with three reserved: ' + SL0.etl_connections_accepted + ' for a normal role', 'A table is a file of 8,192-byte pages: ' + n(TB.pages) + ' pages, ' + TB.rows_per_page + ' rows on each. Big values go to TOAST', 'Context decides: user = SET, sighup = reload, postmaster = restart (`shared_buffers`, `max_connections`, `wal_level`)'] },
          { h: 'Row versions and vacuum', items: ['An update writes a new version: ' + VE.versions_on_page_after_update + ' versions for 3 rows. `VACUUM` frees space inside the file (' + mbOf(BL.size_after_3) + ' stayed ' + mbOf(BL.size_after_vacuum) + '). `VACUUM FULL` gave ' + mbOf(BL.size_after_vacuum_full) + ' and locks', 'An open snapshot kept ' + n(HD.not_yet_removable_while_held) + ' dead rows. HOT needs room: ' + HT.quarter_fillfactor_pct + ' % with fillfactor 70, ' + HT.full_page_pct + ' % with full pages', 'Autovacuum waits for 50 + 20 % of the rows: ' + n(AV.threshold) + ' for 10,000'] },
          { h: 'The log and recovery', items: ['The log reaches the disk first. ' + n(CM.on.wal_syncs) + ' flushes for 1,000 commits, ' + CM.one_transaction.wal_syncs + ' in one transaction. First change after a checkpoint: ' + n(FP.first_update_record_bytes) + ' bytes for a page image', 'A killed server kept ' + n(CR.paid_after_crash) + ' committed rows and lost ' + CR.uncommitted_before_crash + ' uncommitted ones. Unlogged tables are emptied. CDC needs `wal_level = logical`'] },
          { h: 'Loading', items: ['`COPY` is ' + LM[3][1] + ' statement. Row by row with commits: ' + n(LM[0][1]) + ' statements and flushes. A bad row stops the whole `COPY`', 'Idempotent: `DISTINCT ON`, `ON CONFLICT ... WHERE the row differs`. Same file twice: `' + US.distinct_status + '` against `' + US.plain_second_status + '` and a table of twice the size', 'Unlogged load: ' + LW[2][1] + ' bytes of log. `ANALYZE` after a big load: estimate ' + AN.estimate_before + ' for ' + AN.actual + ' rows before it'] },
          { h: 'Indexes and plans', items: ['BRIN ' + BR.brin_kb + ' kB against btree ' + BR.btree_mb + ' MB (correlation ' + BR.correlation_in_order + '). Partial ' + PA.partial_kb + ' kB against ' + PA.full_mb + ' MB', 'Index-only scans need `VACUUM`: ' + IO.all_visible_pages_before + ' pages marked, then ' + n(IO.all_visible_pages_after) + '. GIN for `@>`, a btree on the expression for `->>`', 'Estimate ' + ST.estimate_before + ' for ' + ST.actual + ' rows: extended statistics. Five indexes wrote ' + WC.five_over_none + ' times the log'] },
          { h: 'Partitions', items: ['A range on the key read ' + PS.partitions_scanned_with_range + ' partition, a function read ' + PS.partitions_scanned_with_function + '. Prepared: Subplans Removed ' + PS.prepared_subplans_removed, 'Retention: `DELETE` ' + RT.delete_wal_mb + ' MB of log and ' + n(RT.dead_rows_after_delete) + ' dead rows. Detach and drop: ' + (RT.drop_wal_bytes / 1024).toFixed(1) + ' kB', 'The key must include the partition key. Create partitions ahead. A default partition blocks new ones'] },
          { h: 'Replication', items: ['A standby is read-only and can be behind (' + n(LG.standby_rows_while_paused) + ' of ' + n(LG.primary_rows) + ' rows). A vacuum cancels its long query, or feedback keeps ' + n(CF.on_not_yet_removable) + ' dead rows on the primary', 'Logical: no DDL (' + n(DD.stalled_subscriber_rows) + ' of ' + n(DD.stalled_primary_rows) + ' rows until the column was added), no sequences (' + SQ.subscriber_last_value + ' of ' + SQ.publisher_last_value + '), a key on every table', 'A slot that nobody reads held ' + SL.forgotten_retained_mb + ' MB and turned `' + SL.status_after_limit + '` at the limit'] },
          { h: 'Backups', items: ['Dump: plain 6.1 MB, custom 2.3 MB, and ' + n(DU.rows_restored) + ' equal rows after a restore. Roles come from `pg_dumpall --globals-only`', 'Base backup plus the archive: recovery to a restore point brought back ' + PI.rows_back + ' rows on timeline ' + PI.timeline_after + ', and not the later work. Only a restore proves a backup', 'Checksums (off by default) found ' + (CK.damaged_check_found_one ? 'one' : 'no') + ' damaged block and the query failed with *invalid page*'] },
          { h: 'Running it', items: ['A grant covers existing tables, so set default privileges. Row level security: ' + RL.no_policy_rows + ' rows without a policy, ' + n(RL.policy_rows) + ' with one, ' + n(RL.superuser_rows) + ' for a superuser', '`work_mem` spill at 4 MB: ' + n(SO.disk_kb) + ' kB on disk. `pending_restart` for a postmaster setting. `pg_stat_statements` needs a restart', 'A waiting `ALTER TABLE` queues every new query: C blocked by B, B by A. `lock_timeout` refused B and C was not blocked. A volatile default and a type change rewrite the table'] }
        ]
      }),

      B.recap({
        id: 'm10-recap', n: 10, badge: 'PostgreSQL Partner', color: '#BAE6FD',
        pts: [
          'You can explain the **processes, the pages and the log**, and what a commit waits for.',
          'You can read **dead rows and bloat**, find what holds vacuum back, and write a load that is **idempotent**.',
          'You can choose an **index** from a plan, **partition** by time and drop a month without a dead row.',
          'You can run a **standby, a subscriber and a slot** without filling the disk, and **recover to a point in time**.',
          'You can give a role **the right access**, run a **migration** without queueing the application, and know which setting needs a **restart**.'
        ],
        lines: [
          'I can explain what the server did, and why.',
          'I can recover from my own mistakes.',
          'I can talk to the people who run the platform.'
        ]
      })
    ])
  });
})();
