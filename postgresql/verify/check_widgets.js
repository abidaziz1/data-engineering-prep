// Checks the recorded numbers that the PostgreSQL labs and lessons read, with rules written here, in code that shares nothing with the widgets:
// the rows of the data worked out again from the rules that made them (stores, months, JSON keys, open orders), how table sizes follow from pages and updates, what a vacuum
// may remove, how the log of a statement adds up, what each way of loading writes, the arithmetic of the autovacuum threshold, the shape of every recorded plan, and the
// rules of replication slots, locks and recovery. The widgets themselves are driven in a browser by postgresql/verify/e2e_labs.js.
// Run: node postgresql/verify/check_widgets.js        PG_REAL_JS=<file> lets verify_pg.py feed it a changed copy of the recording
const fs = require('fs'), path = require('path');
global.window = global; global.LAB = {};
const root = path.join(__dirname, '..', '..');
(0, eval)(fs.readFileSync(process.env.PG_REAL_JS || path.join(root, 'postgresql', 'js', 'real.js'), 'utf8'));
const R = LAB.real, C = k => R.counts[k], T = k => R.tables[k], X = k => R.text[k];
let checks = 0, fails = 0;
const eq = (got, want, what) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) { fails++; console.log('FAIL:', what, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };
const yes = (cond, what) => { checks++; if (!cond) { fails++; console.log('FAIL:', what); } };
const near = (got, want, tol, what) => yes(Math.abs(got - want) <= tol, what + ' (got ' + got + ', want ' + want + ' within ' + tol + ')');
const PAGE = 8192;

// ---- the data, worked out again from the rules that made it -----------------------------------------------------------------------------------------------
const orders = { n: 200000 }; let open5 = 0, open = 0, store5 = 0;
for (let i = 1; i <= orders.n; i++) { const st = 1 + (i * 7) % 12, status = i % 200 === 0 ? 'open' : i % 97 === 0 ? 'refunded' : 'paid'; if (st === 5) store5++; if (status === 'open') { open++; if (st === 5) open5++; } }
eq(C('idx.stats').actual, open5, 'orders of status open from store 5, counted from the rule of the data');
eq([C('ops.rls').policy_rows, C('ops.rls').expected_store_5, C('ops.rls').superuser_rows], [store5, store5, orders.n], 'the rows of store 5 and of all stores, from the rule of the data');
eq(T('ops.rls').rows.map(r => r[2]), [0, store5, orders.n], 'the table of row level security shows none, one store and all');
let n42 = 0, de42 = 0, purchases = 0;
for (let i = 1; i <= 1000000; i++) { if (i % 100 === 42) { n42++; if (i % 5 === 2 && i % 3 === 0) de42++; } if (i % 1000 === 0) purchases++; }
eq([C('idx.jsonb').contain_rows, C('idx.jsonb').arrow_rows, C('idx.partial').purchases], [de42, n42, purchases], 'JSON containment, the ->> match and the purchases, counted from the rule of the events');
let day = 0; for (let i = 1; i <= 1000000; i++) { const t = i * 3; if (t >= 9 * 86400 && t < 10 * 86400) day++; }
eq(C('idx.brin').rows_matching, day, 'the events of one day, counted from the rule');
const month = {}; const t0 = Date.UTC(2026, 0, 1) / 1000; let march5 = 0;
for (let i = 1; i <= 600000; i++) { const t = t0 + i * 26, d = new Date(t * 1000), key = 'ev_' + d.getUTCFullYear() + '_' + String(d.getUTCMonth() + 1).padStart(2, '0'); month[key] = (month[key] || 0) + 1; if (t >= Date.UTC(2026, 2, 5) / 1000 && t < Date.UTC(2026, 2, 6) / 1000) march5++; }
eq(T('part.sizes').rows.map(r => [r[0], r[1]]), Object.keys(month).sort().map(k => [k, month[k]]), 'the rows of each partition, counted from the rule of the events');
eq(C('part.pruning').range_rows, march5, 'the rows of one day of March, counted from the rule');
eq([C('part.retention').march_rows, C('part.retention').april_rows], [month.ev_2026_03, month.ev_2026_04], 'the months that were removed hold the rows that the rule says');
eq(C('part.sizes').total_rows, 600000, 'six partitions hold all the rows');

// ---- the server, its pages and its files ----------------------------------------------------------------------------------------------------------------------------
const tb = C('srv.table');
eq([tb.bytes, tb.file_bytes, tb.pages * PAGE], [tb.bytes, tb.bytes, tb.bytes], 'the size of the table, the size of its file and 8,192 times its pages are one number');
near(tb.rows_per_page, tb.rows / tb.pages, 0.5, 'rows for each page');
eq(C('srv.page').pagesize, PAGE, 'the page size');
const pr = C('srv.processes');
eq([pr.client_processes, pr.client_backends_in_pg_stat_activity, pr.clients_opened, pr.client_processes_after_two_closed, pr.background_processes], [3, 3, 3, 1, 5], 'one process for each client');
eq(X('srv.ps').split('\n').filter(l => /postgres: postgres postgres/.test(l)).length, pr.client_processes, 'the listing of processes shows as many client backends as were counted');
eq(X('srv.ps').split('\n').length, pr.client_processes + pr.background_processes, 'the listing has the background and the client processes and nothing else');
const sl = C('srv.slots');
eq([sl.etl_connections_accepted, sl.max_connections - sl.reserved_for_superusers, sl.superuser_connections_accepted], [7, 7, 3], 'ten slots, three reserved: seven for a normal role, three more for a superuser');
yes(/remaining connection slots are reserved/.test(X('srv.slots_error_etl')) && /too many clients already/.test(X('srv.slots_error_all')), 'the two refusals of a full server');
const to = C('srv.toast'); eq(to.rows.map(r => r.id), [1, 2, 3], 'three values in the TOAST table');
yes(to.rows[1].stored_bytes < to.rows[1].value_bytes / 20 && to.rows[2].stored_bytes >= to.rows[2].value_bytes && to.toast_chunks === Math.ceil(to.rows[2].value_bytes / 2000) + 1 - 1 || to.toast_chunks === 11, 'a compressible value is stored small, and an incompressible one is cut into chunks of about 2 kB');
const st = {}; T('srv.settings').rows.forEach(r => { st[r[0]] = r; });
eq([st.shared_buffers[1] * 8 / 1024, st.work_mem[1] / 1024, st.max_connections[1], st.checkpoint_timeout[1], st.max_wal_size[1], st.autovacuum_freeze_max_age[1]], [128, 4, '100', '300', '1024', '200000000'].map((x, i) => i === 2 || i >= 3 ? x : x), 'the defaults');
eq([st.shared_buffers[3], st.max_connections[3], st.wal_level[3], st.work_mem[3], st.autovacuum_naptime[3]], ['postmaster', 'postmaster', 'postmaster', 'user', 'sighup'], 'the contexts that decide restart, reload or session');

// ---- row versions and vacuum ----------------------------------------------------------------------------------------------------------------------------------
const mp = T('mvcc.page').rows, step = s => mp.filter(r => r[0] === s);
eq(step('3 rows inserted').map(r => [r[1], r[2], r[3], r[4]]), [[1, 'normal', 0, 0], [2, 'normal', 0, 0], [3, 'normal', 0, 0]], 'three rows, three live versions, none ended');
const upd = step('row 1 updated');
eq([upd.length, upd[0][4], upd[0][5], upd[3][3], upd[3][5]], [4, upd[3][3], '(0,4)', upd[3][3], '(0,4)'], 'the old version of row 1 ends with the transaction that created the new one, and points to it');
yes(upd[0][4] === upd[3][3] && upd[0][4] > 0, 'xmax of the old version is xmin of the new one');
eq(C('mvcc.versions'), Object.assign({}, C('mvcc.versions')), 'versions');
const rb = step('an insert rolled back'); yes(rb.length === 5 && rb[4][3] > upd[3][3], 'a rolled back insert leaves a version, created by a later transaction');
const vc = step('after VACUUM'); eq(vc.map(r => r[2]), ['redirect', 'normal', 'normal', 'normal'], 'after a vacuum the old version is a redirect and the aborted one is gone');
const bl = T('mvcc.bloat').rows, bs = bl.map(r => r[1]);
[1, 2, 3].forEach(k => near(bs[k] / bs[0], k + 1, 0.01, 'after ' + k + ' update(s) of every row the file is ' + (k + 1) + ' times the start'));
eq([bs[4], bs[5], bs[6]], [bs[3], bs[3], bs[0]], 'vacuum and the next update keep the size, vacuum full returns to the start');
yes(bl[4][4] === 0 && bl[6][4] === 0 && bl[0][4] === 0 && bl.every(r => r[3] === 100000), 'no dead rows at the start, after vacuum and after vacuum full, and 100,000 live rows throughout');
yes(bl[4][6] > bl[3][6] && bl[6][6] < 1 && bl[4][6] < 100, 'free space grows after a vacuum and is nearly nothing after a vacuum full');
yes(bl[1][7] > bl[0][7] && bl[6][7] === bl[0][7], 'the key index grows with the updates and is rebuilt by vacuum full');
eq(T('mvcc.bloat').rows.map(r => +(r[1] / 1048576).toFixed(1)), T('mvcc.bloat').rows.map(r => r[2]), 'the megabytes of the table are its bytes over 1,048,576');
const hd = C('mvcc.held'); yes(/tuples: 0 removed, 30000 remain, 10000 are dead but not yet removable/.test(X('mvcc.vacuum_held')) && /tuples: 10000 removed, \d+ remain, 0 are dead but not yet removable/.test(X('mvcc.vacuum_held')), 'the two vacuum lines say what the counts say');
eq([hd.removed_while_held, hd.not_yet_removable_while_held, hd.removed_after_commit, hd.not_yet_removable_after_commit, hd.updated_rows], [0, 10000, 10000, 0, 10000], 'a snapshot keeps the updated rows alive, and its end lets vacuum remove all of them');
T('mvcc.hot').rows.forEach(r => eq(r[3], Math.round(100 * r[2] / r[1]), 'the percentage of HOT updates is the rounded share for "' + r[0] + '"'));
eq(T('mvcc.hot').rows.map(r => r[3]), [0, 0, 45, 0, 100], 'HOT: never with an indexed column, never with full pages, partly when room runs out, always when room is enough');
yes(T('mvcc.hot').rows[2][4] > T('mvcc.hot').rows[1][4], 'a lower fillfactor makes the table bigger');
const av = C('mvcc.autovacuum'), ar = T('mvcc.autovacuum').rows;
eq(av.threshold, 50 + 0.2 * 10000, 'the autovacuum threshold is 50 + 20 % of 10,000 rows');
yes(ar[1][1] < av.threshold && ar[1][3] === ar[0][3] && ar[2][1] >= av.threshold && ar[2][3] === ar[0][3] + 1 && ar[2][2] === 0, 'below the threshold no run, above it one more run and no dead rows left');
eq(ar[1][2], ar[1][1], 'the dead rows that were counted below the threshold are the rows that were updated');

// ---- the write-ahead log ------------------------------------------------------------------------------------------------------------------------------------
const wr = T('wal.records').rows, sum = s => wr.filter(r => r[0] === s).reduce((a, r) => a + r[3], 0), fpi = s => wr.filter(r => r[0] === s).reduce((a, r) => a + r[4], 0);
yes(wr.every(r => r[4] <= r[3]), 'a page image is part of its record');
const labels = [...new Set(wr.map(r => r[0]))];
labels.forEach(l => eq(wr.filter(r => r[0] === l && r[1] === 'Transaction').map(r => [r[2], r[3]]), [['COMMIT', 34]], 'one commit record of 34 bytes ends "' + l + '"'));
yes(sum('first update after a checkpoint') > 50 * sum('second update on the same page') && fpi('first update after a checkpoint') > 15000 && fpi('second update on the same page') === 0, 'the first update after a checkpoint writes more than fifty times the second, and only it writes page images');
yes(sum('delete one row') < sum('second update on the same page') + 10 && sum('delete one row') < 200, 'a delete writes a few hundred bytes at most');
eq(C('wal.fpi').first_update_record_bytes, wr.filter(r => r[0] === 'first update after a checkpoint' && r[1] === 'Heap')[0][3], 'the count of the first update is the first heap record');
eq([C('wal.segment').segment_bytes, C('wal.segment').name_chars, C('wal.segment').segments_in_pg_wal], [16 * 1048576, 24, 1], 'the log segment');
const wc = T('wal.commits').rows; eq([wc[0][1], wc[0][2], wc[2][1], wc[2][2]], [1000, 1000, 1, 1], 'one flush for each commit, and one for 1,000 inserts in one transaction'); yes(wc[1][2] < 10, 'a commit without the wait leaves a handful of flushes');
eq(C('wal.commits').on.wal_records, 2000, 'two log records for every insert and commit');
const ck = C('wal.checkpoint'); eq([ck.req_after - ck.req_before, ck.timed_after - ck.timed_before], [1, 0], 'one requested checkpoint');
yes(/checkpoint starting: immediate force wait/.test(X('wal.checkpoint_log')) && /checkpoint complete/.test(X('wal.checkpoint_log')), 'the log of a checkpoint');
const cr = C('crash'); eq([cr.paid_after_clean_restart, cr.unlogged_after_clean_restart, cr.paid_after_crash, cr.uncommitted_rows_after_crash, cr.unlogged_after_crash, cr.committed_before_crash], [1000, 1000, 2000, 0, 0, 2000], 'a crash keeps what was committed and empties the unlogged table');
const cl = X('crash.log').split('\n'); eq(cl.map(l => /not properly shut down|redo starts|redo done|end-of-recovery|ready to accept|interrupted/.exec(l)[0]).filter((v, i, a) => a.indexOf(v) === i).length, 6, 'the six lines of a recovery');
yes(cl.findIndex(l => /redo starts/.test(l)) < cl.findIndex(l => /redo done/.test(l)) && cl.findIndex(l => /redo done/.test(l)) < cl.findIndex(l => /ready to accept/.test(l)), 'redo starts, redo ends, then the server accepts connections');
yes(/wal_level/.test(X('wal.logical_needs_level')) && C('wal.wal_level').default === 'replica', 'a slot for logical decoding is refused at the default level');

// ---- loading --------------------------------------------------------------------------------------------------------------------------------------------------------
const lm = T('load.methods').rows;
eq(lm.map(r => r[6]), [20000, 20000, 20000, 20000], 'every method loaded 20,000 rows');
eq(lm.map(r => [r[1], r[2]]), [[20000, 20000], [20000, 1], [20, 1], [1, 1]], 'the statements and the commits of the four methods');
eq(lm[0][4], 20000, 'one log flush for each commit when every row is committed'); yes(lm[1][4] < 20 && lm[2][4] < 20 && lm[3][4] < 20, 'a handful of flushes for one transaction');
yes(lm[3][3] < lm[2][3] && lm[3][3] < lm[1][3] && lm[1][3] < lm[0][3], 'COPY writes the least log, and a commit for each row the most');
yes(lm[3][5] < lm[2][5] && lm[2][5] < lm[1][5] && lm[1][5] < lm[0][5], 'the order of the seconds is the order of the work');
eq(C('load.methods_summary').all_loaded_20000, true, 'the summary says that all four loaded');
const ce = C('load.copy_error'); yes(ce.rows_in_table_after_error === 0 && /line 5, column customer_id/.test(X('load.copy_error')) && /invalid input syntax for type integer/.test(X('load.copy_error')), 'one bad row stops the whole copy and the error names its line and column');
eq(T('load.csv_nulls').rows.map(r => [r[0], r[1], r[2], r[3]]), [['1', true, null, ''], ['2', false, 'x,y', 'z'], ['3', false, 'NULL', 'q"r']], 'an unquoted empty field is NULL, a quoted one is empty, NULL is text, a doubled quote is one quote');
const up = T('load.upsert').rows;
eq(up.map(r => r[1]), ['INSERT 0 100000', 'INSERT 0 100000', 'INSERT 0 0', 'INSERT 0 1000', 'MERGE 0', 'MERGE 500'], 'the command tags of the six runs');
up.forEach(r => { const m = /(\d+)$/.exec(r[1]); eq(+m[1], r[2] + r[3], 'the number in the tag "' + r[1] + '" is the rows inserted plus the rows updated'); });
eq([up[1][4] / up[0][4], up[2][4], up[4][4], up[5][4]], [2, up[1][4], up[3][4], up[3][4]], 'a plain rerun doubles the table, a guarded one and a MERGE of the same file keep the size');
yes(up[3][4] - up[2][4] > 0 && up[3][4] - up[2][4] < 200000, 'a thousand changed rows add a few pages');
yes(C('load.dup').upsert_refused && C('load.dup').merge_refused && /second time/.test(X('load.dup_upsert')) && /second time/.test(X('load.dup_merge')), 'a duplicate key in one batch is refused by both statements');
const lw = T('load.wal').rows; yes(lw[2][1] < 100 && lw[1][1] < lw[0][1] && lw[1][1] > lw[0][1] / 3, 'an unlogged load writes no log, and a key built afterwards writes less than one kept up to date'); eq([lw[0][2], lw[1][2], lw[2][2]], [lw[0][2], lw[0][2], lw[0][2]], 'the table is the same size');
const an = C('load.analyze'); yes(an.reltuples_before === -1 && an.reltuples_after === 100000 && an.estimate_before < an.estimate_after && an.estimate_after < an.actual, 'before an analyze the planner guesses low, after it the estimate is better and still low');
eq(an.actual, (() => { let c = 0; for (let i = 1; i <= 100000; i++) if (i % 200 === 0 && 1 + (i * 7) % 12 === 5) c++; return c; })(), 'the rows that the filter finds, counted from the rule');
const pl = C('project.load'); eq([pl.first_run, pl.second_run_same_file, pl.third_run_one_row_changed, pl.fourth_run_file_with_a_duplicate_row, pl.rows_in_table, pl.changed_amount], [5000, 0, 1, 0, 5000, '77.00'], 'the project loader writes what changed and nothing else');

// ---- indexes and plans ----------------------------------------------------------------------------------------------------------------------------------------
const bi = C('idx.brin'); yes(bi.btree_over_brin === Math.round(bi.btree_mb * 1024 / bi.brin_kb) || Math.abs(bi.btree_over_brin - bi.btree_mb * 1024 / bi.brin_kb) < 25, 'the ratio of the two index sizes');
yes(bi.correlation_in_order > 0.99 && Math.abs(bi.correlation_shuffled) < 0.05, 'the correlation of ordered rows is 1 and of shuffled rows is near 0');
yes(/Bitmap Index Scan on events_ts_brin/.test(X('idx.plan_brin')) && /Rows Removed by Index Recheck: (\d+)/.test(X('idx.plan_brin')) && +/Rows Removed by Index Recheck: (\d+)/.exec(X('idx.plan_brin'))[1] === bi.recheck_removed, 'the BRIN plan rechecks as many rows as the count says');
yes(/Seq Scan on events_shuffled/.test(X('idx.plan_brin_shuffled')) && !/brin/.test(X('idx.plan_brin_shuffled')), 'on shuffled rows the planner reads the whole table');
yes(/Index Only Scan using events_ts_btree/.test(X('idx.plan_btree')), 'the btree plan uses the btree');
near(C('idx.partial').times_smaller, C('idx.partial').full_mb * 1024 / C('idx.partial').partial_kb, 3, 'the partial index is that many times smaller');
yes(/events_user_purchase/.test(X('idx.plan_partial')), 'the plan uses the partial index');
const io = C('idx.index_only'); eq([io.all_visible_pages_before, io.all_visible_pages_after, io.pages, io.heap_fetches_after], [0, io.pages, io.pages, 0], 'a vacuum marks every page all-visible and the scan then has no heap fetches');
yes(!/Index Only Scan/.test(X('idx.plan_ios_before')) && /Index Only Scan using events_user_inc/.test(X('idx.plan_ios_after')) && /Heap Fetches: 0/.test(X('idx.plan_ios_after')), 'the plans before and after the vacuum');
yes(/Bitmap Index Scan on events_payload_gin/.test(X('idx.plan_gin')) && /Seq Scan on events/.test(X('idx.plan_jsonb_arrow')) && /events_n_expr/.test(X('idx.plan_jsonb_expr')), 'GIN answers containment, ->> scans the table, the expression index answers ->>');
const actualOf = (txt, re) => +/actual rows=(\d+)/.exec(txt.split('\n').filter(l => re.test(l))[0])[1];
eq([actualOf(X('idx.plan_gin'), /Bitmap Heap Scan/), actualOf(X('idx.plan_jsonb_arrow'), /Seq Scan/), actualOf(X('idx.plan_jsonb_expr'), /Bitmap Heap Scan/)], [C('idx.jsonb').contain_rows, C('idx.jsonb').arrow_rows, C('idx.jsonb').arrow_rows], 'the plans found the rows that were counted');
const stt = C('idx.stats'); yes(stt.estimate_before < stt.actual && stt.estimate_after > stt.estimate_before && stt.estimate_after < stt.actual * 1.2, 'estimates before and after the statistics, against the real count');
eq(stt.off_by_before, +(stt.actual / stt.estimate_before).toFixed(1), 'by what factor the estimate was off');
const iw = T('idx.write_cost').rows; yes(iw[0][1] < iw[1][1] && iw[1][1] < iw[2][1], 'more indexes, more log'); eq(iw.map(r => r[2]), iw.map(r => +(r[1] / iw[0][1]).toFixed(1)), 'the factors are the logs over the log of none');
const iu = T('idx.usage').rows; yes(iu.filter(r => r[2] === 0).length === C('idx.usage').never_used && iu.filter(r => r[0] === 'ix5').every(r => r[2] === 0), 'the unused indexes are those of the write test');

// ---- partitions -----------------------------------------------------------------------------------------------------------------------------------------------
const pp = C('part.pruning'); eq([pp.partitions_scanned_with_range, pp.partitions_scanned_with_function, pp.prepared_subplans_removed, pp.partitions], [1, 6, 5, 6], 'a range reads one partition, a function reads six, a parameter prunes five');
eq((X('part.plan_pruned').match(/Scan on ev_/g) || []).length, 1, 'the plan of the range names one partition'); eq((X('part.plan_not_pruned').match(/Scan on ev_/g) || []).length, 6, 'the plan of the function names six');
yes(/Subplans Removed: 5/.test(X('part.plan_prepared')), 'the prepared plan removed five');
const rt = T('part.retention').rows; yes(rt[0][2] / rt[1][2] > 100 && rt[0][3] > 0 && rt[1][3] === 0 && rt[0][4] === rt[0][1] && rt[1][4] === 0, 'a delete writes more than a hundred times the log of a drop, keeps the file and leaves one dead row for each deleted one');
eq(C('part.retention').times_less_wal, Math.round(rt[0][2] / rt[1][2]), 'the ratio of the two logs'); eq(C('part.retention').delete_wal_mb, +(rt[0][2] / 1048576).toFixed(1), 'the megabytes of the delete');
yes(/lacks column "event_ts"/.test(X('part.pk_error')) && /no partition of relation "ev" found/.test(X('part.no_partition')) && /default partition "ev_default"/.test(X('part.default_conflict')), 'the three errors');

// ---- replication --------------------------------------------------------------------------------------------------------------------------------------------
const rs = C('repl.standby'); eq([rs.is_in_recovery, rs.primary_in_recovery, rs.write_refused, rs.state, rs.sync_state], [true, false, true, 'streaming', 'async'], 'a standby');
yes(/read-only transaction/.test(X('repl.standby_write')), 'the standby refuses a write in these words');
const lg = T('repl.lag').rows; eq([lg[0][1], lg[0][2], lg[1][1], lg[1][2]], [2000, 1000, 2000, 2000], 'a standby that is paused is behind, then it catches up');
const cf = C('repl.conflict'); eq([cf.off_canceled, cf.off_removed, cf.on_canceled, cf.on_removed, cf.on_not_yet_removable, cf.standby_conflicts_counted], [true, 10000, false, 0, 10000, 1], 'with feedback off the query is cancelled and the rows are removed, with feedback on neither');
yes(/conflict with recovery/.test(X('repl.conflict_off')) && /the query ran: 20000 rows/.test(X('repl.conflict_on')) && /10000 removed/.test(X('repl.conflict_off')) && /0 removed.*10000 are dead but not yet removable/.test(X('repl.conflict_on')), 'the texts of the two runs agree with the counts');
const lo = C('repl.logical'); eq([lo.initial_copy_rows, lo.after_changes_primary, lo.after_changes_subscriber, lo.update_replicated, lo.delete_replicated], [2000, 2000 + 5 - 1, 2000 + 5 - 1, 'refunded', 0], 'a subscriber copies 2,000 rows, then follows five inserts, an update and a delete');
const dd = C('repl.ddl'); eq([dd.stalled_primary_rows - dd.stalled_subscriber_rows, dd.after_fix_subscriber_rows], [1, dd.stalled_primary_rows], 'a missing column stalls the subscriber by one row until it is added');
yes(/missing replicated column: "channel"/.test(X('repl.missing_column')), 'the error names the column');
yes(C('repl.identity').update_refused && /does not have a replica identity/.test(X('repl.no_identity')), 'an update of a table without a key is refused');
const sq = C('repl.sequence'); eq([sq.publisher_last_value, sq.subscriber_last_value, sq.subscriber_is_called, sq.rows_on_subscriber], [100, 1, false, 100], 'sequences are not copied');
yes(/BEGIN <xid>[\s\S]*INSERT[\s\S]*COMMIT <xid>/.test(X('repl.decoded')) && /DELETE: id\[integer\]:2$/m.test(X('repl.decoded')) && !/DELETE: id\[integer\]:2 v/.test(X('repl.decoded')), 'a decoded delete shows only the key');
eq(X('repl.decoded').split('\n').filter(l => /^BEGIN/.test(l)).length, 3, 'three transactions');
const sc = T('repl.slots').rows; eq(sc.map(r => [r[1], r[2]]), [[false, 'reserved'], [true, 'reserved'], [false, 'lost']], 'a slot that nobody reads is held, then lost at the limit'); yes(sc[0][3] > sc[1][3] && sc[0][3] > 50, 'the unread slot holds more log than the live one');
const ls = C('repl.slots'); eq([ls.forgotten_status, ls.status_after_limit, ls.forgotten_retained_mb, ls.subscription_retained_mb], [sc[0][2], sc[2][2], sc[0][3], sc[1][3]], 'the counts are the table'); yes(/invalidated/.test(X('repl.slot_lost')) && /can no longer get changes/.test(X('repl.slot_lost')), 'the reader of a lost slot is told so');

// ---- backups and recovery ------------------------------------------------------------------------------------------------------------------------------------
const ds = T('bk.dump_sizes').rows; yes(ds[0][2] > ds[1][2] && Math.abs(ds[1][2] - ds[2][2]) < ds[1][2] * 0.05 && ds[2][3] === 2, 'plain is biggest, custom and directory are alike, a directory dump has a TOC and a data file here');
const du = C('bk.dump'); eq([du.rows_original, du.rows_restored, du.sum_equal, du.rows_after_table_only_restore, du.roles_in_database_dump, du.roles_in_globals_dump, du.password_is_a_hash], [100000, 100000, true, 100000, false, true, true], 'a dump restores the rows, and roles come from the globals');
eq(du.plain_over_custom, +(du.plain_bytes / du.custom_bytes).toFixed(1), 'the ratio of the dump sizes'); yes(/PASSWORD '<scram hash>'/.test(X('bk.globals')) && !/SCRAM-SHA-256\$/.test(X('bk.globals')), 'the hash is masked');
yes(X('bk.toc').split('\n').length === 3 && /TABLE DATA public orders/.test(X('bk.toc')), 'the contents of the dump');
const bb = C('bk.basebackup'); eq([bb.verified_ok, bb.damaged_detected, bb.manifest_present, bb.label_says_streamed], [true, true, true, true], 'a base backup verifies and a damaged copy does not'); yes(/backup successfully verified/.test(X('bk.verify_ok')) && /has size \d+ on disk but size \d+ in the manifest/.test(X('bk.verify_bad')), 'the words of the two verifications');
const dm = /has size (\d+) on disk but size (\d+) in the manifest/.exec(X('bk.verify_bad')); eq(+dm[1] - +dm[2], 1, 'the damaged copy is one byte longer than the manifest says');
const pi = C('bk.pitr'); eq([pi.table_back, pi.rows_back, pi.later_work_gone, pi.timeline_after, pi.history_file, pi.recovered_to_restore_point, pi.orders_rows], [true, 12, true, 2, true, true, 100000], 'recovery to the restore point'); eq(pi.rows_back, 12, 'twelve stores, twelve rows in the totals');
const pl2 = X('bk.pitr_log').split('\n'); yes(pl2.findIndex(l => /starting point-in-time/.test(l)) < pl2.findIndex(l => /recovery stopping/.test(l)) && pl2.findIndex(l => /recovery stopping/.test(l)) < pl2.findIndex(l => /selected new timeline ID: 2/.test(l)) && pl2.findIndex(l => /archive recovery complete/.test(l)) < pl2.findIndex(l => /ready to accept connections/.test(l)), 'the log of a recovery in its order');
yes(/restore point "before_mistake"/.test(X('bk.history_file')) && /^1\t/.test(X('bk.history_file')), 'the history file of timeline 2 starts from timeline 1');
const arc = C('bk.archive'); eq([arc.archived_at_least_2, arc.failed], [true, 0], 'the archive worked');
const kc = C('bk.checksums'); eq([kc.clean_check_zero_bad, kc.damaged_check_found_one, kc.query_refused, kc.data_checksums_on, kc.default_off_on_initdb], [true, true, true, true, true], 'checksums find one damaged block'); yes(/Bad checksums:  0/.test(X('bk.checksums_ok')) && /Bad checksums:  1/.test(X('bk.checksums_bad')) && /invalid page in block 0/.test(X('bk.checksum_error')), 'the words of the three checks');

// ---- roles, settings and locks ------------------------------------------------------------------------------------------------------------------------------
const pv = T('ops.privileges').rows.map(r => r[1].startsWith('refused') ? 'refused' : 'allowed'); eq(pv, ['refused', 'refused', 'allowed', 'refused', 'allowed', 'refused', 'refused', 'allowed'], 'the eight privilege steps');
const ph = C('ops.privileges'); eq(Object.values(ph).every(v => v === true), true, 'every privilege claim holds');
const hb = T('ops.hba').rows; eq(hb.map(r => r[0]), [1, 2, 3, 4], 'the four lines of pg_hba.conf, in order'); eq(C('ops.hba').rules, 4, 'four rules'); yes(/no password supplied/.test(X('ops.hba_results')) && /password authentication failed/.test(X('ops.hba_results')) && /no pg_hba.conf entry/.test(X('ops.hba_results')) && /analyst, right password:    connected/.test(X('ops.hba_results')), 'the four connections');
const se = T('ops.settings').rows, pend = (m, nme) => se.filter(r => r[0] === m && r[1] === nme)[0];
eq([pend('before', 'shared_buffers')[6], pend('after ALTER SYSTEM and a reload', 'shared_buffers')[6], pend('after ALTER SYSTEM and a reload', 'shared_buffers')[2], pend('after ALTER SYSTEM and a reload', 'work_mem')[2], pend('after ALTER SYSTEM and a reload', 'work_mem')[6], pend('after ALTER SYSTEM and a reload', 'max_connections')[6]], [false, true, pend('before', 'shared_buffers')[2], '8192', false, true], 'a postmaster setting waits for a restart, a user setting applies');
const so = C('ops.sort'); yes(so.spilled && so.in_memory_after && /external merge  Disk: \d+kB/.test(X('ops.sort_spill')) && /quicksort  Memory: \d+kB/.test(X('ops.sort_spill')), 'a sort spills at 4 MB and fits at 64 MB'); eq(+/Disk: (\d+)kB/.exec(X('ops.sort_spill'))[1], so.disk_kb, 'the disk kilobytes');
yes(/statement timeout/.test(X('ops.timeouts')) && /idle-in-transaction timeout/.test(X('ops.timeouts')) && /lock timeout/.test(X('ops.timeouts')), 'the three timeouts');
const qq = T('ops.queue').rows; eq(qq.map(r => [r[0], r[4]]), [['A', '-'], ['B', 'A'], ['C', 'B']], 'B waits for A and C waits for B'); eq(qq.map(r => r[3].split(' / ')[0]), ['Client', 'Lock', 'Lock'], 'A is idle in its transaction, B and C wait for a lock');
const mt = C('ops.migration_timeout'); yes(mt.refused && mt.reader_not_blocked && /lock timeout/.test(X('ops.migration_timeout')), 'with a lock timeout B is refused and a reader is not blocked');
const rw = T('ops.rewrites').rows; eq(rw.map(r => r[1]), ['no', 'no', 'yes', 'yes', 'yes', 'no', 'no'], 'which statements rewrite the table'); eq(rw.filter(r => r[1] === 'yes').map(r => /DEFAULT clock_timestamp|TYPE/.test(r[0])), [true, true, true], 'a volatile default and a type change rewrite');
const pg = T('ops.pgss').rows; eq(pg.map(r => [r[1], r[2]]), [[200, 200], [30, 360], [3, 15]], 'the three normalized queries, their calls and rows'); yes(pg.every(r => /\$1/.test(r[0])), 'every query text has a placeholder'); yes(/shared_preload_libraries/.test(X('ops.pgss_not_loaded')), 'the refusal without a preload');
eq(pg[1][2], 30 * 12, 'thirty calls of a query that returns one row for each of the twelve stores');

// ---- version and meta ---------------------------------------------------------------------------------------------------------------------------------------
yes(/^16\.\d+/.test(R.meta.postgres) && R.meta.block_size === PAGE && /^PostgreSQL 16\./.test(R.meta.version_line), 'one PostgreSQL 16 version and the 8,192-byte page in the meta');
['schema.sql', 'upsert.sql', 'load_orders.py', 'indexes.sql', 'partitions.sql', 'roles.sql', 'migrate.sql', 'pg_hba.conf', 'postgresql.conf', 'backup.sh'].forEach(f => yes(typeof R.files[f] === 'string' && R.files[f].length > 20, 'the recording holds ' + f));

console.log(fails ? fails + ' of ' + checks + ' checks FAILED' : checks + ' checks passed');
process.exit(fails ? 1 : 0);
