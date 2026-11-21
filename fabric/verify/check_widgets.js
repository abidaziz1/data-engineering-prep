// Checks the recorded numbers that the Microsoft Fabric labs and lessons read, with rules written here, in code that shares nothing with the widgets:
// the data worked out again from the rules that made it (orders, stores, customers, cancelled orders, revenue in cents), how the Delta log, the versions and the files of a table
// must add up, what a merge may insert and update, what a retry does to a plain append, how many files a partition makes, and the arithmetic of the capacity lab.
// The widgets themselves are driven in a browser by fabric/verify/e2e_labs.js.
// Run: node fabric/verify/check_widgets.js        FABRIC_REAL_JS=<file> lets verify_fabric.py feed it a changed copy of the recording
const fs = require('fs'), path = require('path');
global.window = global; global.LAB = {};
const root = path.join(__dirname, '..', '..');
(0, eval)(fs.readFileSync(process.env.FABRIC_REAL_JS || path.join(root, 'fabric', 'js', 'real.js'), 'utf8'));
const R = LAB.real, C = k => R.counts[k], T = k => R.tables[k], X = k => R.text[k];
let checks = 0, fails = 0;
const eq = (got, want, what) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) { fails++; console.log('FAIL:', what, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };
const yes = (cond, what) => { checks++; if (!cond) { fails++; console.log('FAIL:', what); } };

// ---- the data, worked out again from the rules that made it ------------------------------------------------------------------------------------------------
const status = i => (i % 25 === 0 ? 'REFUNDED' : i % 7 === 0 ? 'SHIPPED' : 'PLACED');
const cents = i => (5 + (i * 17) % 80) * 100 + (i * 5) % 100;
const store = i => 1 + (i * 7) % 12;
const cust = (day, i) => 1 + (i * 13 + day * 5) % 400;
const FILE_ROWS = [2000, 2012, 2005, 2100, 2040];
eq(C('lake.landing').rows_in_files, FILE_ROWS, 'the lines of the five daily files: 2,000 each, 12 without an id, 5 with a bad amount, 100 sent again, 40 changed');
eq(T('lake.landing').rows.map(r => r[1]), FILE_ROWS, 'the table of landing files shows the same lines');
eq(C('lake.landing').total_rows, FILE_ROWS.reduce((a, b) => a + b, 0), 'the total of the lines');
eq(C('bronze.log').rows, FILE_ROWS.reduce((a, b) => a + b, 0), 'bronze holds every line of every file');
eq([C('silver.merge').rows, C('silver.merge').distinct_ids, C('silver.merge').rejects, C('silver.merge').rejects_no_id, C('silver.merge').rejects_amount], [10000, 10000, 12 + 5, 12, 5], 'silver holds 5 x 2,000 distinct orders and 17 rejected lines');

// the final status of every order after the day 5 file: the first 40 orders of day 4 are CANCELLED
let orders = 0, refunded = 0, gold = 0, goldCents = 0, day6 = 0, day6Cents = 0; const dates = new Set(), stores = new Set(), customers = new Set(); const perDayStore = {};
for (let day = 1; day <= 6; day++) for (let i = 0; i < 2000; i++) {
  const st = (day === 4 && i < 40) ? 'CANCELLED' : status(i);
  if (day <= 5) { orders++; if (st === 'REFUNDED') refunded++; dates.add(day); stores.add(store(i)); customers.add(cust(day, i)); }
  if (st !== 'REFUNDED') { if (day <= 5) { gold++; goldCents += cents(i); perDayStore[day + '/' + store(i)] = (perDayStore[day + '/' + store(i)] || 0) + 1; } else { day6++; day6Cents += cents(i); } }
}
const G_ = C('gold.table'), P_ = C('gold.pinned');
eq([orders, refunded], [10000, 398], 'orders and refunded orders, counted from the rules (400 refunded, 2 of them changed to CANCELLED)');
eq([G_.orders, G_.rows], [gold, 60], 'the gold table has the non-refunded orders and one row for each of 5 days and 12 stores');
eq(Math.round(G_.revenue * 100), goldCents, 'the revenue of gold, summed in cents from the rule of the amounts');
eq([G_.equal, Math.round(G_.silver_revenue * 100)], [true, goldCents], 'gold equals the same sum over silver');
eq([P_.rows_pinned, P_.rows_latest], [60, 72], 'a reader pinned to the first gold version sees 60 rows, the latest 72 (6 days x 12 stores)');
eq(Math.round((P_.revenue_latest - P_.revenue_pinned) * 100), day6Cents, 'the revenue that day 6 added, summed in cents from the rule');
eq([P_.dates_pinned, P_.dates_latest], ['2026-03-05', '2026-03-06'], 'the last day that each reader shows');
eq(T('gold.pinned').rows.map(r => [r[1], r[2], r[3], r[4]]), [[P_.pinned_version, '2026-03-05', 60, P_.revenue_pinned.toFixed(2)], [P_.latest_version, '2026-03-06', 72, P_.revenue_latest.toFixed(2)]], 'the table of the pinned lab');
eq(T('gold.sample').rows.slice(0, 6).map(r => r[1]), ['1', '2', '3', '4', '5', '6'], 'the first rows of gold are day 1, stores 1 to 6');
eq(T('gold.sample').rows.map(r => +r[2]), [1, 2, 3, 4, 5, 6].map(s => perDayStore['1/' + s]), 'the orders of day 1 in each store, counted from the rule');

// ---- the log and the versions of bronze ----------------------------------------------------------------------------------------------------------------------------------
const bh = T('bronze.history').rows, tt = T('bronze.timetravel').rows;
eq(bh.map(r => r[0]), [0, 1, 2, 3, 4], 'five commits: versions 0 to 4');
eq(bh.map(r => r[3]), FILE_ROWS, 'each commit wrote the lines of its file');
eq(bh.map(r => r[2]), [1, 1, 1, 1, 1], 'each commit added one file');
let run = 0; eq(tt.map(r => (run += FILE_ROWS[r[0]])), tt.map(r => r[1]), 'the rows at each version are the sum of the files so far');
eq([C('bronze.log').commits, C('bronze.log').parquet_files, C('bronze.log').all_strings], [5, 5, true], 'five commits, five files, every column a string');
eq(C('bronze.log').columns, ['order_id', 'store_id', 'customer_id', 'order_ts', 'status', 'amount', '_source_file'], 'the columns of bronze');
yes(C('bronze.detail').numFiles === 5 && C('bronze.detail').format === 'delta', 'DESCRIBE DETAIL lists five files of a delta table');
yes(/"numRecords": 2000/.test(X('bronze.commit0')) && /"minValues.order_id": "O-10000"/.test(X('bronze.commit0')) && /"maxValues.order_id": "O-11999"/.test(X('bronze.commit0')), 'the statistics of the first file: 2,000 records, order ids O-10000 to O-11999');
eq(C('bronze.infer').amount_type_day1 + '/' + C('bronze.infer').amount_type_day3, 'double/string', 'inference reads the amount as a number on day 1 and as text on day 3');
yes(C('bronze.infer').rows_after_failed_append === 2000, 'the failed append left the 2,000 rows of day 1');

// ---- the silver merges ----------------------------------------------------------------------------------------------------------------------------------------------------
const mr = T('silver.merge_runs').rows;
eq(mr.map(r => r[0]), ['day 1', 'day 2', 'day 3', 'day 4', 'day 5', 'day 5 again', 'day 4 replayed', 'day 5 replayed'], 'the eight runs, in order');
eq(mr.map(r => r[1]), [...FILE_ROWS, 2040, 2100, 2040], 'the lines in the file of each run');
eq(mr.slice(0, 5).map(r => r[2]), [2000, 2000, 2000, 2000, 2000], 'each new day inserted 2,000 orders (bad lines and orders that exist are not inserted)');
eq(mr.map(r => r[3]), [0, 0, 0, 0, 40, 0, 40, 40], 'updates: only day 5 changes orders, the same file again changes none, a replay of day 4 and then of day 5 change 40 each');
let rows = 0; eq(mr.map(r => (rows += r[2], rows)), mr.map(r => r[5]), 'the rows in the table are the sum of the rows inserted');
eq(mr.map(r => r[4]), [1, 2, 3, 4, 5, 6, 7, 8], 'every run made a version, also the run that changed nothing');
eq(mr.map(r => r[7]), [0, 0, 0, 0, 40, 40, 0, 40], 'cancelled orders: 40 after day 5, still 40 after the same file again, 0 after the replay of day 4, 40 after the replay of day 5');
yes(mr.every(r => r[6] === true), 'every run made a commit');
yes(mr[5][8] > 0 && mr[5][8] === mr[5][9], 'the repeat changed no row and still rewrote the files that hold matched rows: files written equal files removed');
yes(mr[0][9] === 0 && mr[1][9] === 0, 'the first runs removed no file');
eq(T('silver.rejects').rows.map(r => [r[0], +r[1]]).sort(), [['amount is not a number', 5], ['no order_id', 12]].sort(), 'the rejects table by reason');
const V = C('silver.variants'), vc = V['with the condition'], vn = V['with no condition'], vx = V['changed lines only'];
eq([vc.rerun_updated, vc.rerun_change_rows, vc.rerun_commit], [0, 0, true], 'with the condition a repeat updates no row and records no change, and still makes a commit');
eq([vn.rerun_updated, vn.rerun_change_rows, vn.rerun_commit], [2040, 4080, true], 'without a condition a repeat updates all 2,040 matched rows and records a before and an after for each');
eq([vx.rerun_updated, vx.rerun_files_written, vx.rerun_files_removed, vx.rerun_commit, vx.rerun_change_rows], [0, 0, 0, false, 0], 'a source filtered to new or different lines makes no commit and rewrites no file');
yes(vc.rerun_files_written === vn.rerun_files_written && vc.rerun_files_removed === vn.rerun_files_removed && vc.rerun_files_written > 0, 'with and without the condition a merge rewrites the same files: the files that hold matched rows');
eq([vc.day5_updated, vn.day5_updated, vx.day5_updated, vc.day5_inserted], [40, 40, 40, 2000], 'all three merges did the same on day 5');
eq([vc.rows, vn.rows, vx.rows], [10000, 10000, 10000], 'all three tables hold the same 10,000 orders');
eq(T('silver.variants').rows.map(r => r[0]), ['with the condition', 'with no condition', 'changed lines only'], 'the variants table lists the three merges');
const pa = C('silver.plain_append');
eq([pa.rows_in_file, pa.rows_after_two_appends, pa.distinct_ids], [2100, 4200, 2100], 'a plain append twice doubles the 2,100 lines of day 4');
yes(C('silver.dup_error').condition === 'DELTA_MULTIPLE_SOURCE_ROW_MATCHING_TARGET_ROW_IN_MERGE' && C('silver.dup_error').rows_unchanged === true, 'a source with a repeated key makes the merge fail and changes no row');
const cd = Object.fromEntries(T('cdf.changes').rows.map(r => [r[0], +r[1]]));
eq([cd.insert, cd.update_preimage, cd.update_postimage, cd.delete], [10000, 40, 40, 1], 'the change feed: 10,000 inserts, 40 updates as 40 pairs, one delete');
yes(T('cdf.update_sample').rows.length === 4 && T('cdf.update_sample').rows.filter(r => r[2] === 'update_postimage').every(r => r[1] === 'CANCELLED') && T('cdf.update_sample').rows.filter(r => r[2] === 'update_preimage').every(r => r[1] !== 'CANCELLED'), 'the update sample shows a before and an after for each order, and every after-image is CANCELLED');

// ---- schema, constraints and the files of a table ---------------------------------------------------------------------------------------------------------------------
const se = C('schema.evolve'), sm = C('schema.mismatch'), sk = C('schema.constraints');
eq([sm.rows_after_failed_append, C('schema.type_error').rows_after, sk.rows_after_failed_insert], [10000, 10000, 10000], 'a refused write or insert changes no row');
eq(se.columns_after, [...se.columns_before, 'channel'], 'mergeSchema added one column at the end');
eq([se.old_rows_have_null_channel, se.new_rows, se.rows_after], [10000, 3, 10003], 'the old rows read the new column as NULL');
eq([sk.protocol_before, sk.protocol_after_check, sk.not_null_refused], [2, 3, true], 'a CHECK constraint raised the writer version from 2 to 3');
const fs_ = C('files.small'), fo = C('files.optimize'), fv = C('files.vacuum'), lc = T('files.lifecycle').rows;
eq([fs_.files, fs_.commits, fs_.json_commits, fs_.rows], [40, 41, 41, 4000], 'forty inserts: forty files, 41 commits with the CREATE, 4,000 rows');
eq(fs_.checkpoints.filter(c => /checkpoint\.parquet$/.test(c)).map(c => +c.slice(0, 20)), [10, 20, 30, 40], 'a checkpoint at versions 10, 20, 30 and 40');
yes(fs_.has_last_checkpoint === true && fs_.avg_bytes_per_file === Math.floor(fs_.bytes / fs_.files), 'a pointer to the last checkpoint, and the average file size');
eq([fo.files_removed, fo.files_added, fo.files_after, fo.parquet_files_in_folder, fo.rows_after, fo.version, fo.operation, fo.data_change], [40, 1, 1, 41, 4000, 41, 'OPTIMIZE', false], 'OPTIMIZE: forty files into one, forty-one in the folder, a version that changes no data');
yes(fo.bytes_after < fs_.bytes, 'the compacted file is smaller than the forty');
eq([fv.parquet_files_after, fv.rows_after, C('files.vacuum_dry').rows, C('files.vacuum_check').files_after_refusal], [1, 4000, 0, 41], 'the default vacuum found nothing, zero hours was refused with all 41 files in place, and the forced one left one file');
eq(lc.map(r => [r[1], r[2]]), [[40, 40], [1, 41], [1, 1]], 'the lifecycle table: files in the table and in the folder');
yes(C('files.timetravel_error').latest_still_works && C('files.timetravel_error').optimize_version_reads && C('files.timetravel_error').condition === 'FAILED_READ_FILE.FILE_NOT_EXIST', 'after the vacuum the latest and the OPTIMIZE version read and version 5 does not');
const pl = T('partition.layout').rows;
eq([stores.size, customers.size, dates.size], [12, 400, 5], 'the partition columns have 12 stores, 400 customers and 5 dates, counted from the rules');
eq(pl.map(r => r[1]), [1, 5, 12, 400], 'the partitions of the four layouts');
eq(pl.map(r => r[2]), pl.map(r => r[1]), 'one file for each partition value (each table was written with one task)');
eq(pl.map(r => r[4]), pl.map(r => Math.floor(r[3] / r[2])), 'bytes for each file');
yes(pl[3][4] < pl[1][4] && pl[1][4] < pl[0][4], 'more partitions, smaller files');
eq([C('partition.pruning').rows_for_the_day, C('partition.pruning').files_total, C('partition.pruning').plan_has_partition_filter], [2000, 5, true], 'one day of the date partition: 2,000 rows from one of five files');
yes(/PartitionFilters: \[isnotnull\(order_date\), \(order_date = 2026-03-02\)\]/.test(X('partition.plan')), 'the recorded plan filters the partition');
eq(T('restore.history').rows.map(r => [r[0], r[2]]), [[0, 10000], [1, 500], [2, 10000]], 'restore: 10,000 rows, an overwrite left 500, the restore brought back 10,000');
eq([C('restore').restore_is_a_new_version, C('restore').operations[2]], [true, 'RESTORE'], 'a restore is a version of its own');
const mt = C('maint');
yes(['bronze_orders', 'silver_orders', 'gold_daily_revenue'].every(k => mt[k].files_after === 1 && mt[k].optimized && mt[k].files_before >= mt[k].files_after && mt[k].folder_after >= mt[k].folder_before), 'the maintenance notebook compacted every table to one file, and the folders kept the old files');
eq(T('maint').rows.map(r => r[0]), ['bronze_orders', 'silver_orders', 'gold_daily_revenue'], 'the maintenance table lists the three tables');
yes(mt.silver_orders.last_operations.join() === 'OPTIMIZE,VACUUM START,VACUUM END', 'the history of silver ends with OPTIMIZE and a vacuum');
const dr = C('drop'), rt = C('bronze.retry');
eq([dr.managed_folder_before, dr.managed_folder_after, dr.external_folder_after, dr.external_rows_still_readable], [true, false, true, 100], 'a managed drop removes the folder, an external drop keeps it');
eq([rt.rows_in_file, rt.plain_rows_after_two_runs, rt.once_rows_after_three_runs, rt.plain_distinct_lines], [2040, 4080, 2040, 2040], 'a retry of a plain append doubles the lines, replaceWhere keeps one copy');
yes(rt.once_operations.length === 3, 'three runs of the idempotent landing made three commits');

// ---- the capacity lab: arithmetic of the documented rules (the lab is from documentation) -----------------------------------------------------------------------------
const SKU = { F2: 2, F8: 8, F64: 64, F256: 256 };
eq(Object.entries(SKU).map(([k, cu]) => [k, cu * 2, cu * 6]), [['F2', 4, 12], ['F8', 16, 48], ['F64', 128, 384], ['F256', 512, 1536]], 'two Spark cores for each unit, and three times that with bursting');
const stage = m => (m <= 10 ? 'Overage protection' : m <= 60 ? 'Interactive delay' : m <= 1440 ? 'Interactive rejection' : 'Background rejection');
eq([5, 30, 180, 1800].map(stage), ['Overage protection', 'Interactive delay', 'Interactive rejection', 'Background rejection'], 'the throttling stage of 5 minutes, 30 minutes, 3 hours and 30 hours of future use');

console.log(fails ? fails + ' of ' + checks + ' checks FAILED' : checks + ' checks passed');
process.exit(fails ? 1 : 0);
