// Checks the recorded tables that the Google Cloud labs read, with arithmetic and rules written here, in code that shares nothing with the widgets:
// the bytes and dollars of the query estimates, the sizes of the file formats, the listing of a bucket, the load methods, the Pub/Sub model, the panes and
// sessions of Beam, the Spark numbers, the split, the leak, the Terraform scans, the cost of the made-up job log, and the command checks.
// The widgets themselves are driven in the browser by dev/e2e.js, which compares what they show with values worked out the same way.
// Run: node gcp/verify/check_widgets.js
const fs = require('fs'), path = require('path');
global.window = global; global.LAB = {};
const root = path.join(__dirname, '..', '..');
(0, eval)(fs.readFileSync(path.join(root, 'gcp', 'js', 'real.js'), 'utf8'));
const R = LAB.real, C = k => R.counts[k], T = k => R.tables[k];
let checks = 0, fails = 0;
const eq = (got, want, what) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) { fails++; console.log('FAIL:', what, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };
const near = (got, want, what, tol) => { checks++; if (!(Math.abs(got - want) <= (tol === undefined ? 1e-9 : tol))) { fails++; console.log('FAIL:', what, 'got', got, 'want', want); } };
const yes = (cond, what) => { checks++; if (!cond) { fails++; console.log('FAIL:', what); } };

const MIB = 1024 ** 2, TIB = 1024 ** 4, SCALE = C('sql.world').scale;

// ---- The world of made-up orders ------------------------------------------------------------------------------------------------------------------------
const W0 = C('sql.world'), DD = C('sql.dedup');
eq(W0.orders, 20000, 'twenty thousand orders'); eq(W0.raw_deliveries - W0.orders, W0.duplicate_deliveries, 'raw rows minus orders is the number of repeats');
eq(DD.raw_rows, W0.raw_deliveries, 'the dedup counts start from the raw rows'); eq(DD.after_qualify, DD.distinct_ids, 'QUALIFY leaves one row for each order id');
eq(DD.after_qualify, W0.orders, 'one row for each order after QUALIFY'); eq(W0.scaled_orders, W0.orders * SCALE, 'the scaled order count is the sample times the scale');

// ---- The estimates of bytes: billed is the logical size rounded up, dollars are billed bytes at the example rate --------------------------------------------
const ES = T('sql.estimates'), ED = C('sql.estimate_detail'), ER = C('sql.estimate_rules'), CS = T('sql.column_sizes'), ST = C('sql.storage');
eq(ES.rows.length, 11, 'eleven estimates');
const byName = {}; ES.rows.forEach(r => { byName[r[0]] = r; });
ES.rows.forEach(r => {
  yes(r[4] >= r[3] && r[4] - r[3] < MIB, r[0] + ': billed bytes are the logical bytes rounded up, by less than a MiB');
  near(r[5], Math.round(r[4] / TIB * ER.example_price_per_tib_usd * 1e4) / 1e4, r[0] + ': dollars are billed bytes over a TiB times the example rate', 1e-9);
  eq(ED[r[0]].billed_bytes, r[4], r[0] + ': the detail and the table agree on the billed bytes');
  const parts = r[2].split(' of ').map(Number);
  yes(parts[1] === C('sql.world').days && parts[0] >= 1 && parts[0] <= parts[1], r[0] + ': partitions read are between 1 and the 14 days');
});
eq(ER.example_price_per_tib_usd, 6.25, 'the example price is 6.25 for each TiB'); eq(ER.scale, SCALE, 'the estimates use the scale of the world');
const colSum = CS.rows.reduce((a, r) => a + r[2], 0);
eq(colSum, ST.sample_logical_bytes, 'the column sizes add up to the logical bytes of the sample'); eq(ST.scaled_logical_bytes, colSum * SCALE, 'the scaled bytes are the sample times the scale');
eq(byName['SELECT *'][3], ST.scaled_logical_bytes, 'SELECT * reads every column of every partition: the scaled bytes of the table');
eq(byName['LIMIT 10'][4], byName['SELECT *'][4], 'LIMIT does not reduce the bytes billed');
eq(byName['filter on store only'][4], byName['three columns'][4], 'a filter on a column that is not the partition column reads the same bytes');
yes(byName['three columns'][4] < byName['SELECT *'][4] && byName['three columns and a filter, one UTC day'][4] < byName['three columns and a filter, seven UTC days'][4] && byName['three columns and a filter, seven UTC days'][4] < byName['three columns'][4], 'fewer columns and fewer partitions read fewer bytes');
eq(byName['three columns and a filter, one UTC day'][2], '1 of 14', 'one UTC day reads one partition'); eq(byName['one Singapore day, filtered with DATE(ts, zone)'][2], '14 of 14', 'a function of the partition column reads every partition');
eq(byName['one Singapore day, filtered with two bounds'][2], '2 of 14', 'a Singapore day with two bounds reads two UTC partitions');
yes(byName['one Singapore day, filtered with two bounds'][4] < byName['one Singapore day, filtered with DATE(ts, zone)'][4] / 6, 'two bounds read under a sixth of the bytes of the function filter');
yes(byName['SELECT * EXCEPT (items), one day'][4] < byName['item lines, one day'][4] + byName['three columns and a filter, one UTC day'][4], 'dropping the nested column lowers the bytes of a day');
eq(ST.scaled_gib, Math.round(ST.scaled_logical_bytes / 1024 ** 3 * 10) / 10, 'the scaled size in GiB');

// ---- Formats: the ratios, and the Parquet column chunks ----------------------------------------------------------------------------------------------------
const FS = T('formats.sizes'), FC = C('formats.column_read'), csv = FS.rows.find(r => r[0] === 'CSV')[1];
FS.rows.forEach(r => near(r[2], Math.round(r[1] / csv * 1000) / 1000, r[0] + ': the share of the CSV', 0.0006));
const size = n => FS.rows.find(r => r[0] === n)[1];
yes(size('CSV, gzip') < size('CSV') && size('JSON lines') > size('CSV') && size('JSON lines, gzip') < size('JSON lines'), 'gzip shrinks the text formats and JSON lines is the largest');
yes(size('Parquet (zstd)') < size('Parquet (snappy)') && size('Parquet (snappy)') < size('Parquet (no compression)') && size('ORC (zstd)') < size('Parquet (zstd)'), 'compression and format order of the sizes');
const chunks = Object.values(FC.column_chunk_bytes), chunkSum = chunks.reduce((a, b) => a + b, 0);
yes(chunkSum <= FC.file_bytes && FC.file_bytes - chunkSum < 5000, 'the column chunks fill the Parquet file, apart from the footer');
eq(FC.file_bytes, size('Parquet (snappy)'), 'the column read is of the snappy file in the size table');
near(FC.two_columns_share, Math.round(FC.two_columns_bytes / chunkSum * 1000) / 1000, 'two columns: the share of the column data', 1e-9);
eq(FC.two_columns_bytes, FC.column_chunk_bytes.store_id + FC.column_chunk_bytes.total_cents, 'two columns: the bytes are the two chunks');
eq(FC.columns, Object.keys(FC.column_chunk_bytes).length, 'the number of columns'); eq(FC.rows, 100000, 'a hundred thousand rows');

// ---- Listing a bucket --------------------------------------------------------------------------------------------------------------------------------------------
const LS = T('gcs.listing');
LS.rows.forEach(r => {
  const names = r[3] === '-' ? [] : r[3].split(', '), prefixes = r[4] === '-' ? [] : r[4].split(', ');
  eq(r[2], names.length, 'listing prefix "' + r[0] + '" delimiter "' + r[1] + '": the count is the number of names');
  if (r[1] !== '(none)' && r[1] !== '') yes(names.every(n => !n.slice(r[0] === '(empty)' ? 0 : r[0].length).includes(r[1])), 'listing "' + r[0] + '": names below the delimiter are not listed one by one');
  yes(prefixes.every(p => p.endsWith('/')), 'listing "' + r[0] + '": prefixes end with a slash');
});

// ---- Signed URL ---------------------------------------------------------------------------------------------------------------------------------------------------
const SG = C('gcs.signed'), SP = T('gcs.signed_params'), canonical = R.text['gcs.signed_canonical'];
eq(SG.algorithm, 'GOOG4-RSA-SHA256', 'the signing algorithm'); eq(SG.expires_seconds, 900, 'fifteen minutes'); eq(SG.signature_hex_chars, 512, 'a 2048 bit signature is 512 hex characters');
yes(SG.verified_with_public_key && !SG.other_object_name_verifies && !SG.longer_expiry_verifies && !SG.network_used, 'the recorded verification answers');
yes(canonical.startsWith('GET\n') && canonical.includes('X-Goog-Expires=900') && canonical.endsWith('UNSIGNED-PAYLOAD'), 'the canonical request holds the method, the expiry and the payload rule');
yes(SP.rows.some(r => r[0] === 'X-Goog-Signature'), 'the parameters table lists the signature');

// ---- Load methods ----------------------------------------------------------------------------------------------------------------------------------------------------
const IR = T('idem.runs'), IW = C('idem.world');
const wrong = m => IR.rows.filter(r => r[0] === m).map(r => r[4]);
eq(wrong('append'), [0, IW.batch_rows, IW.batch_rows], 'append: the repeat doubles the day'); eq(wrong('merge'), [0, 0, IW.vanished], 'merge leaves the orders that vanished at the source');
['merge_and_delete', 'overwrite_partition', 'reload_all'].forEach(m => eq(wrong(m), [0, 0, 0], m + ': right after the repeat and after the correction'));
eq(IR.rows.filter(r => r[1] === 'first run').map(r => r[2]), [20000, 20000, 20000, 20000, 20000], 'every method starts from the same 20,000 rows');
eq(IR.rows.filter(r => r[1] === 'corrected batch').filter(r => r[4] === 0).map(r => r[2]), [20004, 20004, 20004], 'the right methods end at 20,004 rows: 20,000 plus 12 new minus 8 vanished');
eq(20000 + IW.new - IW.vanished, 20004, 'the expected rows after the correction');

// ---- The Pub/Sub model ---------------------------------------------------------------------------------------------------------------------------------------------
const PM = T('pubsub.model'), MS = C('pubsub.model_settings'), pm = (s, m) => PM.rows.find(r => r[0] === s && r[1] === m);
const sits = [...new Set(PM.rows.map(r => r[0]))];
eq(sits.length, 7, 'seven situations'); eq(Object.keys(MS).sort(), sits.slice().sort(), 'each situation has its settings');
PM.rows.forEach(r => yes(r[4] <= r[3] || r[3] === 0, 'a handler cannot run to the end more often than the message was delivered (' + r[0] + ' ' + r[1] + ')'));
PM.rows.filter(r => r[5] === 'acked').forEach(r => yes(r[4] >= 1, 'an acked message had a handler that ran to the end (' + r[0] + ' ' + r[1] + ')'));
const work = +/takes (\d+) seconds/.exec(MS['slow handler'].story)[1];
eq(work, 35, 'the slow handler needs 35 seconds');
eq(pm('slow handler', 'm1')[3], Math.ceil(work / MS['slow handler'].ack_deadline), 'a handler that needs 35 s with a 10 s deadline is delivered 4 times');
eq(pm('deadline long enough', 'm1')[3], 1, 'a deadline longer than the work gives one delivery');
eq(pm('poison, dead letter after 5', 'm1')[3], MS['poison, dead letter after 5'].max_attempts, 'a dead letter policy stops a poison message at the maximum attempts');
eq(pm('poison, dead letter after 5', 'm1')[5], 'dead', 'the poison message ends in the dead letter topic');
yes(pm('poison, no dead letter', 'm1')[3] > 50 && pm('poison, no dead letter', 'm1')[5] === 'pending', 'with no dead letter a poison message is delivered again and again');
eq([pm('ordering key blocks', 'a2')[3], pm('ordering key blocks', 'a3')[3]], [0, 0], 'messages behind a poison message with the same key are never delivered');
eq(pm('ordering key blocks', 'b1')[5], 'acked', 'the other ordering key flows');
eq([pm('ordering key, dead letter after 5', 'a2')[5], pm('ordering key, dead letter after 5', 'a3')[5]], ['acked', 'acked'], 'after the dead letter the keys behind it follow');

// ---- Beam: panes and sessions -----------------------------------------------------------------------------------------------------------------------------------------
const BL = C('beam.late');
Object.keys(BL).forEach(k => {
  const P = T('beam.panes.' + k), acc = /accumulating/.test(k), last = {};
  P.rows.forEach(r => { last[r[0] + '|' + r[1]] = r[4]; });
  const counted = acc ? Object.values(last).reduce((a, b) => a + b, 0) : P.rows.reduce((a, r) => a + r[4], 0);
  eq(counted, BL[k].events_in_the_output, k + ': the panes add up to the events counted'); eq(BL[k].events_in_the_output + BL[k].dropped, BL[k].events_sent, k + ': counted plus dropped is sent');
  eq(P.rows.length, BL[k].panes, k + ': the number of panes');
});
eq(BL.no_lateness.dropped, 2, 'no allowed lateness drops both late events'); eq(BL.late_discarding.dropped, 1, 'allowed lateness keeps the first late event');
yes(BL.late_accumulating.events_in_the_output === BL.late_discarding.events_in_the_output, 'accumulating and discarding count the same events');
const mergeSessions = (times, gap) => { const out = []; times.slice().sort((a, b) => a - b).forEach(x => { const l = out[out.length - 1]; if (l && x < l.end) { l.end = x + gap; l.n++; } else out.push({ s: x, end: x + gap, n: 1 }); }); return out; };
[60, 10].forEach(g => {
  const want = mergeSessions([0, 20, 45, 200, 215], g), got = T('beam.sessions_' + g).rows;
  eq(got.map(r => [r[1], r[2]]), want.map(x => [x.s + ' to ' + x.end, x.n]), 'sessions with a gap of ' + g + ' seconds, merged again here');
});
const BD = C('beam.dedupe'), BDL = C('beam.dead_letter');
yes(BD.kept_with_300s_windows === BD.unique_events && BD.kept_with_60s_windows > BD.unique_events && BD.delivered - BD.unique_events === 2 && BD.second_duplicate_gap_seconds > 60 && BD.second_duplicate_gap_seconds < 300, 'a repeat that comes after the window is kept: 42 delivered, 40 unique, 41 kept with 60 s windows');
eq(BDL.ok + BDL.dead, BDL.lines_in, 'the good lines and the dead lines are all the lines'); eq(BDL.dead_records.length, BDL.dead, 'every dead line is kept with its error');

// ---- Spark ---------------------------------------------------------------------------------------------------------------------------------------------------------
const SH = C('spark.shuffle'), SF = T('spark.small_files'), SK = C('spark.skew'), SW = C('spark.written'), SJ = C('spark.join'), SPR = C('spark.pruning');
eq(SH.tasks_per_stage_without_aqe[0], SH.shuffle_partitions_setting, 'a shuffle makes as many tasks as the setting says');
yes(SH.tasks_per_stage_with_aqe[0] < SH.tasks_per_stage_without_aqe[0], 'adaptive execution merges small partitions');
SF.rows.forEach(r => near(r[1] * r[3], r[2], r[0] + ': files times the size of a file is the total', Math.max(2, r[2] * 0.02)));
eq(SF.rows.map(r => r[1]), [200, 4, 1], 'the files of the three writes');
near(SK.by_store.largest / SK.by_store.median, SK.by_store.largest_over_median, 'skew ratio by store', 0.006); near(SK.by_store_and_salt.largest / SK.by_store_and_salt.median, SK.by_store_and_salt.largest_over_median, 'skew ratio with a salt', 0.006);
yes(SK.by_store.largest_over_median > 3 && SK.by_store_and_salt.largest_over_median < 2, 'a salt brings the skew from over 3 to under 2');
eq(SK.share_of_s01, 0.342, 'store s01 holds a third of the rows'); eq(SW.files, 20, 'the dated write made 20 files in 10 folders'); eq(SW.partitions, 10, 'ten folders');
eq(SPR.all_days.PartitionFilters, 'none', 'no filter reads every folder'); yes(/dt = 2026-11-03/.test(SPR.one_day.PartitionFilters), 'a filter on dt is a partition filter');
eq([SJ.small_table_join, SJ.threshold_off_join], ['BroadcastHashJoin', 'SortMergeJoin'], 'a small table is broadcast, and with the threshold off the join is a sort merge');

// ---- SQL, governance and data for models ---------------------------------------------------------------------------------------------------------------------
const NT = C('sql.null_trap'), RP = C('sql.row_policy'), SPL = C('sql.split'), LK = C('sql.leak'), PII = T('sql.pii_scan');
eq(NT.not_in_rows, 0, 'NOT IN against a list with a NULL returns nothing'); yes(NT.not_exists_rows > 0 && NT.refunded_orders_without_customer > 0, 'NOT EXISTS returns the customers, and guest orders cause the NULL');
eq(RP.orders, W0.orders, 'the row policy count starts from all orders'); yes(RP.orders_visible_to_a_manager_of_s01 / RP.orders > 0.3 && RP.orders_visible_to_a_manager_of_s01 / RP.orders < 0.4, 'store s01 holds about a third of the orders');
near(Math.round(RP.orders_visible_to_a_manager_of_s01 / RP.orders * 1000) / 1000, W0.s01_share, 'the visible share is the s01 share', 1e-9);
eq(SPL.by_order.train.customers + SPL.by_order.test.customers - W0.customers, SPL.customers_in_both_when_split_by_order, 'customers on both sides, by order');
eq(SPL.by_customer.train.customers + SPL.by_customer.test.customers - W0.customers, SPL.customers_in_both_when_split_by_customer, 'customers on both sides, by customer');
eq(SPL.customers_in_both_when_split_by_customer, 0, 'a split by customer has nobody on both sides');
eq(SPL.by_order.train.orders + SPL.by_order.test.orders, SPL.by_customer.train.orders + SPL.by_customer.test.orders, 'both splits cover the same orders');
yes(LK.corr_leaky_feature > 0.25 && Math.abs(LK.corr_clean_feature) < 0.1, 'the leaky feature moves with the label and the clean one does not'); eq(LK.customers, W0.customers, 'the leak test uses every customer');
const pii = c => PII.rows.find(r => r[0] === c);
eq([pii('customers.email')[2], pii('customers.phone')[3]], [1, 1], 'the scan finds the e-mail and the phone columns'); PII.rows.filter(r => !/email|phone/.test(r[0])).forEach(r => eq([r[2], r[3]], [0, 0], 'the scan finds nothing in ' + r[0]));

// ---- Terraform scans ----------------------------------------------------------------------------------------------------------------------------------------------
const CK = C('tf.checkov'), FIX = ['bucket', 'dataset', 'table', 'iam', 'topic'];
const cleared = f => CK.baseline.failed.filter(x => !CK['fix_' + f].failed.includes(x));
eq(CK.baseline.failed.length, CK.baseline.failed_count, 'the baseline failed count'); eq(CK.baseline.failed_count, 11, 'eleven gaps');
FIX.forEach(f => { yes(CK['fix_' + f].failed.every(x => CK.baseline.failed.includes(x)), f + ': a fix does not add a failure'); yes(cleared(f).length > 0, f + ': a fix clears something'); });
eq(new Set(FIX.flatMap(cleared)).size, 11, 'the five fixes clear eleven different checks'); eq(FIX.reduce((a, f) => a + cleared(f).length, 0), 11, 'no check is cleared twice');
eq(CK.all_fixed.failed_count, 0, 'the fixed file passes'); eq(CK.all_fixed.passed, 15, 'fifteen checks pass on the fixed file');
eq(cleared('iam').map(x => x.split(' ')[0]).sort(), ['CKV_GCP_117', 'CKV_GCP_49'], 'the owner role is flagged by two checks');

// ---- The cost of the made-up job log --------------------------------------------------------------------------------------------------------------------------
const CW = C('sql.cost_world'), CBL = T('sql.cost_by_label');
const perLabel = { dashboard_refresh: CW.runs_per_day.dashboard_refresh * CW.days, '(no label)': CW.runs_per_day['analysts, SELECT *'] * CW.days, daily_orders: CW.runs_per_day.daily_orders * CW.days };
const bytesFor = { dashboard_refresh: CW.billed_bytes_per_job.dashboard_refresh, '(no label)': CW.billed_bytes_per_job['analysts, SELECT *'], daily_orders: CW.billed_bytes_per_job.daily_orders };
eq(Object.values(perLabel).reduce((a, b) => a + b, 0), CW.jobs, 'the three kinds of job make the 763 jobs');
CBL.rows.forEach(r => {
  const tib = perLabel[r[0]] * bytesFor[r[0]] / TIB;
  eq(r[1], perLabel[r[0]], r[0] + ': the number of jobs'); near(r[2], Math.round(tib * 100) / 100, r[0] + ': TiB billed', 1e-9); near(r[3], Math.round(tib * CW.example_price_per_tib_usd * 100) / 100, r[0] + ': example dollars', 1e-9);
});
eq(CBL.rows.map(r => r[0]), ['dashboard_refresh', '(no label)', 'daily_orders'], 'the dashboard costs the most and the nightly job the least');
eq(CW.billed_bytes_per_job.dashboard_refresh, byName['three columns'][4], 'a dashboard run is billed like the three columns query of mission 5');
eq(CW.billed_bytes_per_job['analysts, SELECT *'], byName['SELECT *'][4], 'an analyst run is billed like SELECT *'); eq(CW.billed_bytes_per_job.daily_orders, byName['three columns and a filter, one UTC day'][4], 'the nightly run is billed like one day');

// ---- Commands, builds and the rest ----------------------------------------------------------------------------------------------------------------------------
const FL = T('cli.flags'), CSUM = C('cli.summary'), CI = C('ci.summary');
eq(FL.rows.length, CSUM.commands_checked, 'the table has a row for each checked command'); eq(CSUM.flags_not_found, [], 'every flag that the course names exists');
FL.rows.forEach(r => eq(r[2], '-', r[0] + ': no flag is missing'));
eq([CI.cloudbuild_ok.exit_code, CI.cloudbuild_bad.exit_code, CI.deploy_ok.exit_code, CI.deploy_bad.exit_code], [0, 1, 0, 1], 'the build and workflow files pass the schema check, and the copies with a typo are refused');
eq(CI.cloudbuild.step_ids, ['unit-tests', 'sql-compile', 'terraform-checks', 'deploy-dags'], 'the four build steps'); eq(CI.deploy.uses_a_key_file, false, 'the deploy workflow has no key file');
const FN = C('fn.summary'), DF = C('df.compile'), AF = C('af.flaky'), AP = C('af.parse');
eq([FN.clean.failed, FN.clean.passed, FN.bug.failed, FN.bug.passed], [0, 4, 1, 3], 'the function tests: four pass, and the broken copy fails one');
eq([DF.tables, DF.assertions, DF.errors], [3, 2, 0], 'the Dataform project compiles to three tables and two assertions'); eq(AF.tasks.find(t => t.task === 'extract').tries, 3, 'the flaky extract succeeded on the third try');
yes(AP.slower_by_seconds >= 2 - 1e-9 || AP.slower_by_at_least_1_9, 'a sleep at the top of a DAG file makes the parse slower');

console.log(checks + ' checks, ' + (fails ? fails + ' failed' : 'all passed'));
process.exit(fails ? 1 : 0);
