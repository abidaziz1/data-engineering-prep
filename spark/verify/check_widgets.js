// Checks the recorded tables that the Apache Spark labs and lessons read, with arithmetic and rules written here, in code that shares nothing with the widgets:
// the stores and the guests, the defaults, the jobs of each line, partitions and shuffles, the join counts, skew, the memory formula, the file counts, the ANSI results, the window sums,
// the watermark and the state of the stream (simulated here from the six files), the Delta merge, the small files, the tests and the order of settings.
// The widgets themselves are driven in the browser by dev/e2e.js, which compares what they show with values worked out the same way.
// Run: node spark/verify/check_widgets.js
const fs = require('fs'), path = require('path');
global.window = global; global.LAB = {};
const root = path.join(__dirname, '..', '..');
(0, eval)(fs.readFileSync(path.join(root, 'spark', 'js', 'real.js'), 'utf8'));
const R = LAB.real, C = k => R.counts[k], T = k => R.tables[k], X = k => R.text[k];
let checks = 0, fails = 0;
const eq = (got, want, what) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) { fails++; console.log('FAIL:', what, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };
const near = (got, want, what, tol) => { checks++; if (!(Math.abs(got - want) <= (tol === undefined ? 1e-9 : tol))) { fails++; console.log('FAIL:', what, 'got', got, 'want', want); } };
const yes = (cond, what) => { checks++; if (!cond) { fails++; console.log('FAIL:', what); } };
const sum = a => a.reduce((x, y) => x + y, 0);
const conf = k => { const r = T('conf.defaults').rows.find(x => x[0] === k); return r && r[1]; };

const MIB = 1024 ** 2;

// ---- The world of made-up orders ---------------------------------------------------------------------------------------------------------------------------
const W0 = C('world.summary'), ST = T('world.stores'), JC = C('joins.counts'), AN = T('world.anatomy');
eq(W0.orders, 400000, 'four hundred thousand orders'); eq(ST.rows.length, W0.stores, 'a row for each store'); eq(sum(ST.rows.map(r => r[1])), W0.orders, 'the stores add up to all orders');
ST.rows.forEach(r => near(r[2], Math.round(r[1] / W0.orders * 1000) / 1000, 'share of ' + r[0], 1e-9));
const hot = ST.rows.reduce((a, r) => r[1] > a[1] ? r : a);
eq(hot[0], W0.busiest_store, 'the busiest store'); near(hot[2], W0.busiest_store_share, 'the busiest share', 1e-9); yes(hot[1] > 3 * Math.max(...ST.rows.filter(r => r !== hot).map(r => r[1])), 'the hot store is over three times the next');
eq(W0.customers, 5000 + W0.new_customers_without_orders, 'customers: 5,000 who ordered and the new ones'); eq(W0.orders_files, W0.days, 'one file for each day');
near(W0.guest_share, Math.round(JC.orders_without_customer_id / W0.orders * 1000) / 1000, 'the guest share is the orders without a customer over all orders', 1e-9);
eq(AN.rows.map(r => r[1]), [4, 1], 'a group by makes two stages of 4 and 1 tasks');

// ---- The defaults of Spark 4.0.1 -----------------------------------------------------------------------------------------------------------------------------
eq(conf('spark.sql.shuffle.partitions'), '200', 'the default number of shuffle partitions'); eq(conf('spark.sql.adaptive.enabled'), 'true', 'adaptive execution is on');
eq(conf('spark.sql.autoBroadcastJoinThreshold'), (10 * MIB) + 'b', 'the broadcast threshold is 10 MiB'); eq(conf('spark.sql.files.maxPartitionBytes'), (128 * MIB) + 'b', '128 MiB per input partition');
eq(conf('spark.sql.files.openCostInBytes'), (4 * MIB) + 'b', 'the open cost of a file is 4 MiB'); eq(conf('spark.sql.adaptive.advisoryPartitionSizeInBytes'), (64 * MIB) + 'b', 'the advisory size is 64 MiB');
eq(conf('spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes'), (256 * MIB) + 'b', 'a skewed partition is over 256 MiB'); eq(conf('spark.sql.adaptive.skewJoin.skewedPartitionFactor'), '5.0', 'and over 5 times the median');
eq(conf('spark.sql.ansi.enabled'), 'true', 'ANSI mode is on'); eq(conf('spark.sql.parquet.compression.codec'), 'snappy', 'snappy is the default codec'); eq(conf('spark.sql.sources.partitionOverwriteMode'), 'STATIC', 'static overwrite');
eq(conf('spark.sql.execution.arrow.maxRecordsPerBatch'), '10000', 'Arrow batches of 10,000 rows');
const CS = C('conf.session'); eq(CS.unified_memory_fraction, 0.6, 'unified memory fraction'); eq(CS.reserved_memory_mib, 300, 'reserved memory'); eq(CS.master, 'local[4]', 'local mode on four cores');

// ---- Laziness: the jobs of each line -----------------------------------------------------------------------------------------------------------------------
const LZ = T('lazy.steps').rows;
eq(LZ.length, 10, 'ten lines'); eq(LZ[0][1], 1, 'reading the schema starts one job'); eq(LZ.slice(1, 6).map(r => r[1]), [0, 0, 0, 0, 0], 'filter, select, groupBy, explain and columns start no job');
yes(LZ.slice(6).every(r => r[1] >= 1), 'every action starts at least one job'); yes(LZ[6][1] > 1, 'count starts more than one job with adaptive execution');
eq(C('plans.same').sql_and_dataframe_have_the_same_plan, true, 'SQL and DataFrame give the same plan');
['parsed', 'analyzed', 'optimized', 'physical'].forEach(k => yes(X('plans.' + k).length > 50, 'the ' + k + ' plan is recorded'));
yes(/^'?Aggregate/.test(X('plans.parsed')) && /PartitionFilters: \[isnotnull\(dt/.test(X('plans.physical')) && /PushedFilters/.test(X('plans.formatted')), 'the plans have the lines that the lesson reads');
yes((X('plans.optimized').match(/Filter/g) || []).length === 1 && (X('plans.analyzed').match(/Filter/g) || []).length === 2, 'two filters became one');
yes(/\(2 \+ 3\)/.test(X('plans.fold_before')) && /\* 5\)/.test(X('plans.fold_after')), 'the constant was folded');

// ---- Partitions and shuffles ---------------------------------------------------------------------------------------------------------------------------------
const RD = T('parts.read').rows, SZ = C('parts.sizes'), SH = T('parts.shuffle').rows, OP = T('parts.operations').rows;
yes(RD[0][1] < RD[1][1] && RD[1][1] < RD[2][1], 'a smaller maxPartitionBytes gives more partitions'); eq(RD[1][1], W0.orders_files, 'at 1 MiB each file is a partition');
const hashed = SZ[Object.keys(SZ).find(k => /after_repartition_14/.test(k))];
eq(sum(hashed), W0.orders, 'the hashed partitions hold every order'); yes(hashed.length < 14 && hashed.every(x => x > 0), 'hash partitioning leaves some of 14 buckets empty');
eq(sum(SZ.coalesce_3), W0.orders, 'coalesce keeps every order'); eq(sum(SZ.repartition_3), W0.orders, 'repartition keeps every order');
yes(Math.max(...SZ.repartition_3) - Math.min(...SZ.repartition_3) <= 3, 'round robin makes even partitions'); yes(Math.max(...SZ.coalesce_3) - Math.min(...SZ.coalesce_3) > 1000, 'coalesce leaves the sizes uneven');
eq(SH.map(r => r[1]), [200, 8, 1], 'the tasks after the shuffle'); eq(new Set(SH.map(r => r[5])).size, 1, 'the same records are shuffled in all three runs');
SH.forEach(r => yes(r[2] <= r[3] && r[3] <= r[4] && r[4] <= r[5], r[0] + ': fewest, median, most and all are in order'));
yes(SH[0][3] === 0 && SH[2][2] === SH[2][4], 'most of 200 tasks are empty, and the merged task has everything');
eq(SH[0][5], 4 * ST.rows.length, 'the shuffle moves 4 map tasks times 12 stores of partial counts');
eq(OP.map(r => [r[1], r[2]]), [[0, 0], [1, 0], [1, 0], [1, 1], [2, 2], [1, 1]], 'exchanges and sorts of the six operations');

// ---- Joins ---------------------------------------------------------------------------------------------------------------------------------------------------------------
const JS = T('joins.strategies').rows, js = n => JS.find(r => r[0].indexOf(n) === 0);
eq([js('stores is small')[1], js('stores is small')[2], js('stores is small')[3]], ['BroadcastHashJoin', 0, 1], 'a small table is broadcast');
eq([js('broadcast turned off')[1], js('broadcast turned off')[2]], ['SortMergeJoin', 2], 'without broadcasting both sides are shuffled'); eq(js('hint: broadcast')[1], 'BroadcastHashJoin', 'the hint gives a broadcast');
eq([js('hint: shuffle_hash')[1], js('hint: shuffle_hash')[2]], ['ShuffledHashJoin', 2], 'the shuffle hash hint'); eq(js('a range condition, not equality')[1], 'BroadcastNestedLoopJoin', 'a range condition is a nested loop');
eq(JC.inner_to_stores, JC.orders, 'every order has one store'); eq(JC.inner_to_stores_listed_twice, 2 * JC.orders, 'a store listed twice doubles the join');
eq(JC.inner_to_customers + JC.orders_without_customer_id, JC.orders, 'an inner join keeps the orders that have a customer'); eq(JC.left_to_customers, JC.orders, 'a left join keeps every order');
eq(JC.null_safe_to_a_null_row, JC.orders, 'a null-safe join to a NULL row keeps every order'); eq(JC.customers_with_orders_semi + JC.customers_without_orders_anti, JC.customers, 'semi and anti add up to the customers');
eq(JC.customers_without_orders_anti, W0.new_customers_without_orders, 'the anti join finds the new customers'); eq(JC.not_in_customers_without_orders, 0, 'NOT IN with a NULL returns nothing'); eq(JC.not_exists_customers_without_orders, JC.customers_without_orders_anti, 'NOT EXISTS agrees with the anti join');
yes(/BroadcastHashJoin/.test(X('joins.aqe_after')) && /SortMergeJoin/.test(X('joins.aqe_before')) && /isFinalPlan=true/.test(X('joins.aqe_after')), 'adaptive execution changed the join');
yes(/country#\d+ = SG/.test(X('joins.pushdown')), 'the filter on the country moved below the join');

// ---- Skew ---------------------------------------------------------------------------------------------------------------------------------------------------------------
const AG = T('skew.aggregations').rows, JN = T('skew.joins').rows;
const s01 = hot[1], other = ST.rows.filter(r => r !== hot).map(r => r[1]);
eq([AG[0][1], AG[1][1]], [12, 12], 'twelve tasks after the shuffle'); yes(AG[0][4] < 5 * Math.max(1, AG[0][3]), 'a count looks even'); yes(AG[1][4] > 5 * AG[1][3], 'a window shows the skew');
yes(AG[1][4] > s01 && other.includes(AG[1][4] - s01), 'the busiest task holds the hot store and exactly one other store');
eq(JN.map(r => r[1]), [12, 18, 12], 'tasks of the three joins'); yes(JN[0][4] > 2 * JN[1][4] && JN[0][4] > 2 * JN[2][4], 'both fixes cut the busiest task to under half'); yes(JN[1][1] > JN[0][1], 'the adaptive skew join splits into more tasks');
JN.forEach(r => yes(r[2] <= r[3] && r[3] <= r[4], r[0] + ': fewest, median, most in order'));
eq([C('skew.rows_plain').plan_says_skew, C('skew.rows_adaptive').plan_says_skew, C('skew.rows_salted').plan_says_skew], [false, true, false], 'only the adaptive plan says skew');
eq([C('skew.rows_plain').rows, C('skew.rows_adaptive').rows, C('skew.rows_salted').rows], [W0.orders, W0.orders, W0.orders], 'all three joins return every order');
yes(/skew=true/.test(X('skew.plan_adaptive')) && /salt/.test(X('skew.plan_salted')), 'the plans show the skew join and the salt');

// ---- Memory, cache and spill --------------------------------------------------------------------------------------------------------------------------------
const FM = T('mem.formula').rows, MC = C('mem.cache'), LV = T('mem.levels').rows, CR = T('mem.cache_reads').rows, SP = C('mem.spill');
FM.forEach(r => { const want = Math.floor((r[1] - 300 * MIB) * 0.6); near(r[2], want, r[0] + ': reported storage memory', 1); near(r[3], want, r[0] + ': the formula column', 1); eq(r[4], true, r[0] + ': equal'); });
eq(FM.map(r => r[1]), [512 * MIB, 1024 * MIB, 2048 * MIB], 'three heap sizes');
eq(LV.find(r => r[0] === 'MEMORY_ONLY')[1], LV.find(r => r[0] === 'MEMORY_AND_DISK')[1], 'both memory levels hold the same bytes'); eq(LV.find(r => r[0] === 'DISK_ONLY')[2], LV.find(r => r[0] === 'MEMORY_ONLY')[1], 'disk only holds the same bytes on disk');
eq(LV.find(r => r[0] === 'DISK_ONLY')[1], 0, 'disk only holds nothing in memory'); eq(CR[1][1], MC.memory_bytes, 'the second count reads exactly the cache'); eq([MC.disk_bytes, MC.cached_partitions, MC.entries_after_unpersist], [0, 4, 0], 'the cache: all in memory, 4 partitions, none after unpersist');
yes(CR[1][1] < CR[0][1], 'the cache is read with fewer bytes than the files'); yes(SP.memory_bytes_spilled > 2 * SP.disk_bytes_spilled && SP.disk_bytes_spilled > 0, 'a spill is smaller on disk'); eq(SP.rows_sorted, W0.orders, 'the sort has every order');

// ---- Files and layout ---------------------------------------------------------------------------------------------------------------------------------------------
const VA = T('files.variants').rows, v = s => VA.find(r => r[0].indexOf(s) === 0), TO = T('files.touched').rows, RG = T('files.rowgroups').rows, CO = T('files.codecs').rows;
VA.forEach(r => near(r[3], Math.round(r[2] / r[1] * 10) / 10, r[0] + ': KB for each file (half-way cases round either way)', 0.1 + 1e-9));
eq(v('one task')[1], 1, 'coalesce(1) writes one file'); eq(v('200 tasks')[1], 200, '200 tasks write 200 files'); eq(v('folder for each day, 200 tasks')[1], 200 * W0.days, 'files are tasks times folders');
eq(v('folder for each day, no shuffle')[1], W0.days, 'no shuffle: one file for each day'); eq(v('folder for each day, repartition')[1], W0.days, 'repartition by day: one file for each day'); eq(v('folder for each store')[1], W0.days * W0.stores, 'a folder for each store and day');
eq(v('at most')[1], W0.orders / 50000, 'a cap of 50,000 rows makes 8 files'); yes(v('folder for each day, 200 tasks')[2] > v('200 tasks')[2], 'tiny files add up to more bytes');
eq(TO.map(r => r[1]), [1, 1, W0.orders_files], 'files opened by three filters'); eq(new Set(TO.map(r => r[2])).size, 1, 'the dataset has the same files in each row');
const rg = (f, p) => RG.find(r => r[0] === f && r[1] === p);
yes(rg('sorted by order_id', 'on')[2] < rg('sorted by order_id', 'off')[2] / 10, 'pushdown on a sorted file reads a tenth'); yes(rg('sorted by order_id', 'on')[3] < 10000, 'few records are read from a sorted file');
eq([rg('sorted by order_id', 'off')[3], rg('shuffled by order_id', 'on')[3], rg('shuffled by order_id', 'off')[3]], [W0.orders, W0.orders, W0.orders], 'every other case reads every record');
const cod = n => CO.find(r => r[0] === n)[1]; yes(cod('none') > cod('snappy') && cod('snappy') > cod('gzip') && cod('gzip') > cod('zstd'), 'the codecs in order of size');
const EV = C('files.evolution'); yes(!EV.columns_by_default.includes('channel') && EV.columns_with_mergeSchema.includes('channel'), 'mergeSchema finds the new column'); eq(EV.rows_with_merge.map(r => r[2]), ['None', 'None', 'app', 'pos'], 'the older rows have no channel');
const BK = C('files.bucketing'); eq([BK.shuffles_without_buckets, BK.shuffles_when_bucketed], [2, 0], 'bucketing removes both exchanges'); yes(/Bucketed: true/.test(X('files.bucketing_plan')) && !/Exchange/.test(X('files.bucketing_plan')), 'the bucketed plan has no exchange');
const OW = C('files.overwrite'); eq(OW.default_mode, 'STATIC', 'the default mode'); eq(OW.static.folders_before, ['day=0', 'day=1', 'day=2'], 'three days before'); eq(OW.static.folders_after, ['day=1'], 'static overwrite leaves one day');
eq(OW.static.rows_after, 5, 'five rows after the static overwrite'); eq(OW.dynamic.rows_after, 30 - 10 + 5, 'dynamic: 30 rows, minus the 10 of day 1, plus 5'); eq(OW.dynamic.folders_after, ['day=0', 'day=1', 'day=2'], 'dynamic keeps every folder');

// ---- Spark SQL: ANSI, windows, rollups, arrays, time zones -----------------------------------------------------------------------------------------------
const AS = T('sql.ansi').rows, an = s => AS.find(r => r[0].indexOf(s) === 0);
[["CAST('abc'", 'CAST_INVALID_INPUT'], ['1 / 0', 'DIVIDE_BY_ZERO'], ['2147483647', 'ARITHMETIC_OVERFLOW'], ['CAST(300', 'CAST_OVERFLOW'], ["to_date(", 'CAST_INVALID_INPUT'], ['element_at', 'INVALID_ARRAY_INDEX_IN_ELEMENT_AT']].forEach(p => {
  yes(an(p[0])[1].startsWith('error: [' + p[1] + ']'), p[0] + ': an error of class ' + p[1] + ' with ANSI on');
});
eq(an('2147483647')[2], String(2147483647 + 1 - 2 ** 32), 'the overflow wraps around with ANSI off'); eq(an('CAST(300')[2], String(300 % 256), '300 as a tinyint wraps to 44');
eq([an("CAST('abc'")[2], an('1 / 0')[2], an("to_date(")[2], an('element_at')[2]], ['NULL', 'NULL', 'NULL', 'NULL'], 'NULL with ANSI off'); eq([an('try_cast')[1], an('try_cast')[2], an('try_divide')[1], an('try_divide')[2]], ['NULL', 'NULL', 'NULL', 'NULL'], 'try_ functions give NULL in both modes');
yes(/PARSE_SYNTAX_ERROR/.test(X('sql.qualify')), 'QUALIFY does not parse');
const DAILY = [['s01', 1, 100], ['s01', 2, 150], ['s01', 3, 150], ['s01', 4, 90], ['s02', 1, 70], ['s02', 2, 80]];
const WI = T('sql.windows').rows;
eq(WI.length, DAILY.length, 'six rows in the window table');
DAILY.forEach((d, i) => {
  const same = DAILY.filter(x => x[0] === d[0]), running = sum(same.filter(x => x[1] <= d[1]).map(x => x[2])), rank = 1 + same.filter(x => x[2] > d[2]).length, prev = same.find(x => x[1] === d[1] - 1);
  eq([Number(WI[i][3]), Number(WI[i][4]), WI[i][5] === '' || WI[i][5] === null ? null : Number(WI[i][5])], [running, rank, prev ? prev[2] : null], 'window row ' + d.join(' '));
});
const TI = T('sql.ties').rows, s01rows = DAILY.filter(d => d[0] === 's01').sort((a, b) => a[2] - b[2] || a[1] - b[1]);
s01rows.forEach((d, i) => { eq(Number(TI[i][2]), sum(s01rows.slice(0, i + 1).map(x => x[2])), 'ROWS frame at day ' + d[1]); eq(Number(TI[i][3]), sum(s01rows.filter(x => x[2] <= d[2]).map(x => x[2])), 'RANGE frame at day ' + d[1]); });
const RO = T('sql.rollup').rows, detail = RO.filter(r => r[3] === 0 && r[4] === 0), sub = RO.filter(r => r[3] === 0 && r[4] === 1), grand = RO.find(r => r[3] === 1 && r[4] === 1);
sub.forEach(s => eq(Number(s[2]), sum(detail.filter(d => d[0] === s[0]).map(d => Number(d[2]))), 'subtotal of ' + s[0])); eq(Number(grand[2]), sum(detail.map(d => Number(d[2]))), 'the grand total is the sum of the details');
yes(sub.every(r => r[1] === 'NULL' || r[1] === null) && grand[0] === 'NULL', 'rolled-up columns are NULL');
const PI = T('sql.pivot').rows; PI.forEach(p => { const ds = detail.filter(d => d[0] === p[0]); eq([Number(p[1]), Number(p[2])], [Number(ds.find(d => d[1] === 'app')[2]), Number(ds.find(d => d[1] === 'pos')[2])], 'pivot of ' + p[0]); });
const AR = T('sql.arrays').rows; AR.forEach(r => { const xs = JSON.parse(r[1]); eq(JSON.parse(r[2]), xs.map(x => x * 10), 'transform ' + r[1]); eq(JSON.parse(r[3]), xs.filter(x => x > 1), 'filter ' + r[1]); eq(Number(r[4]), sum(xs), 'aggregate ' + r[1]); eq(JSON.parse(r[5]), xs.slice().sort((a, b) => a - b), 'sort_array ' + r[1]); });
const EXP = C('sql.explode'), elems = sum(AR.map(r => JSON.parse(r[1]).length)); eq(EXP.explode.length, elems, 'explode makes one row for each element'); eq(EXP.explode_outer.length, elems + AR.filter(r => JSON.parse(r[1]).length === 0).length, 'explode_outer keeps the empty arrays');
const TZ = T('sql.timezone').rows; eq(sum(TZ.map(r => r[1])), W0.orders, 'UTC days add up to all orders'); eq(sum(TZ.map(r => r[2])), W0.orders, 'Singapore days add up to all orders'); yes(TZ[0][1] > TZ[0][2] && TZ[TZ.length - 1][1] < TZ[TZ.length - 1][2], 'orders move from the first day to the day after');

// ---- Python and UDFs ----------------------------------------------------------------------------------------------------------------------------------------------
const US = C('udf.same'), UC = C('udf.calls'), UB = C('udf.batches'), WT = T('udf.wrong_type').rows;
eq(sum(US.labels.map(l => l[1])), W0.orders, 'the three labels cover every order'); eq(US.all_three_agree, true, 'all versions agree'); eq(US.labels.map(l => l[0]), ['check', 'ok', 'other'], 'the labels');
near(US.labels.find(l => l[0] === 'ok')[1] / W0.orders, W0.paid_share, 'the share of ok orders is the paid share', 0.001);
const ops = k => (X('udf.plan.' + k).match(/BatchEvalPython|ArrowEvalPython/) || ['none'])[0];
eq([ops('built-in functions'), ops('Python UDF'), ops('Python UDF with Arrow'), ops('pandas UDF')], ['none', 'BatchEvalPython', 'ArrowEvalPython', 'ArrowEvalPython'], 'the Python operator of each version');
eq([UC['deterministic, result used once'], UC['deterministic, result used twice'], UC['non-deterministic, result used once'], UC['non-deterministic, result filtered, then used twice']], [UC.rows, UC.rows, UC.rows, UC.rows], 'one call for each row in the ordinary shapes');
eq(UC['deterministic, result filtered, then used twice'], 4 * UC.rows, 'a deterministic function after a filter was called four times for each row');
yes(UB.calls >= Math.ceil(UB.rows / UB.maxRecordsPerBatch) && UB.calls < 2 * UB.rows / UB.maxRecordsPerBatch, 'a pandas UDF runs about once for each batch of 10,000 rows');
yes(WT.every(r => r[1] === '' || r[1] === null || r[1] === 'NULL'), 'a wrong return type gives NULL'); yes(/NoneType/.test(X('udf.null')), 'a NULL input fails a UDF with a NoneType error');

// ---- Structured Streaming: the watermark, the state and the modes, simulated from the six files ------------------------------------------------------
const FI = T('stream.files').rows, PR = T('stream.progress').rows, UP = T('stream.update').rows, AP = T('stream.append').rows, CM = T('stream.complete').rows, GR = T('stream.state_growth').rows, RS = C('stream.restart'), NW = C('stream.no_watermark');
const mins = t => { const p = t.split(':'); return +p[0] * 60 + +p[1]; }, hm = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const events = FI.rows ? [] : FI.map(r => r[2].split('; ').map(e => { const p = e.split(' '); return { store: p[0], t: mins(p[1]), amount: +p[2] }; }));
eq(events.length, 6, 'six files'); const winStart = t => Math.floor(t / 10) * 10;
let maxSeen = -1, state = new Set(), stateNoWm = new Set();
events.concat([[]]).forEach((file, k) => {
  const wm = maxSeen < 0 ? null : maxSeen - 10;
  let dropped = 0;
  file.forEach(e => { const end = winStart(e.t) + 10; if (wm !== null && end <= wm) dropped++; else state.add(winStart(e.t) + '|' + e.store); stateNoWm.add(winStart(e.t) + '|' + e.store); });
  if (wm !== null) state.forEach(s => { if (+s.split('|')[0] + 10 <= wm) state.delete(s); });
  const p = PR[k];
  eq(p[2], wm === null ? '(none yet)' : hm(wm), 'batch ' + k + ': the watermark is the newest event time so far minus 10 minutes'); eq(p[1], file.length, 'batch ' + k + ': rows read'); eq(p[5], dropped, 'batch ' + k + ': rows dropped as late');
  eq(p[4], state.size, 'batch ' + k + ': rows in state, simulated'); if (k < GR.length) { eq(GR[k][1], p[4], 'batch ' + k + ': the growth table matches the progress'); eq(GR[k][2], stateNoWm.size, 'batch ' + k + ': state without a watermark is every key seen'); }
  if (file.length) maxSeen = Math.max(maxSeen, ...file.map(e => e.t));
});
eq(PR.length, 7, 'seven batches: six files and one to move the watermark'); eq(NW.rows_dropped_as_late_without_watermark, 0, 'nothing is late without a watermark'); yes(/append/.test(NW.append_mode_error) && /watermark/.test(NW.append_mode_error), 'append mode without a watermark is refused');
const winKey = (e) => hm(winStart(e.t)) + ' ' + e.store;
const totalsAfter = (n) => { const m = {}; events.slice(0, n + 1).flat().forEach(e => { const k = winKey(e); m[k] = m[k] || [0, 0]; m[k][0]++; m[k][1] += e.amount; }); return Object.keys(m).sort().map(k => k + ' ' + m[k][0] + ' ' + m[k][1]).join('; '); };
eq(CM[5][1], totalsAfter(5), 'complete mode: the last batch holds the totals of every event, the late one too'); eq(CM[0][1], totalsAfter(0), 'complete mode: the first batch');
eq(CM[4][1].split('; ').find(s => s.startsWith('10:00 s01')), '10:00 s01 3 17', 'the late row is counted in complete mode');
eq(UP.map(r => r[1]).filter(s => s !== '(nothing)').join('; ').split('; ').length, 7, 'update mode wrote seven window rows in all: one for each window, none for the late row');
eq(AP.filter(r => r[1] !== '(nothing)').map(r => r[0]), [3, 6], 'append mode writes in two batches'); eq(AP[3][1], '10:00 s01 2 8; 10:00 s02 1 2', 'append: the 10:00 windows once they are final, without the late row'); eq(AP[6][1].split('; ').length, 4, 'append: four windows in the last batch');
eq(RS.first_run_batches, [0, 1, 2, 3], 'run 1: three files and a batch for the watermark'); eq(RS.restart_batches[0], 4, 'the restart begins at the batch that was not committed'); eq(RS.batch_written_twice, [4], 'batch 4 was written twice');
eq(RS.rows_the_sink_got_for_each_batch['4'], 2 * UP[3][1].split('; ').length, 'the sink got the rows of that batch twice'); eq(RS.second_run_failed, true, 'the second run failed after the sink wrote');
const CKT = C('stream.checkpoint').tree; eq(Object.keys(CKT).filter(k => CKT[k] !== null).sort(), ['commits', 'offsets', 'sources', 'state'], 'the folders of a checkpoint'); eq(CKT.offsets.length, CKT.commits.length, 'a commit for each batch plan');

// ---- Delta Lake -----------------------------------------------------------------------------------------------------------------------------------------------------
const DB = C('delta.build'), DM = C('delta.merge'), DT = C('delta.time_travel'), DH = T('delta.history').rows, DS = C('delta.small_files'), DL = C('delta.log_after');
eq(DB.first_commit_actions.add, DB.parquet_files, 'one add action for each Parquet file'); eq(DB.log_files.length, 1, 'one commit after the first write'); eq(DL.log_files.length, 2, 'two commits after the merge');
eq(DM.numTargetRowsUpdated + DM.numTargetRowsDeleted + DM.numTargetRowsInserted, DM.numSourceRows, 'every change did one thing'); eq(DB.rows - DM.numTargetRowsDeleted + DM.numTargetRowsInserted, DM.numOutputRows, 'rows after the merge');
eq(DT['version 0'], DB.rows, 'time travel: version 0 is the first write'); eq(DT.latest, DM.numOutputRows, 'time travel: the latest is the merge result'); eq(DH.map(r => r[1]), ['WRITE', 'MERGE'], 'the history');
eq(DS.files_in_the_version_before, DS.appends, 'one file for each append'); eq(DS.files_on_disk_after_optimize, DS.files_on_disk_before + DS.files_in_the_version_after_optimize, 'OPTIMIZE adds a file and removes none from disk'); eq(DS.files_on_disk_after_vacuum, DS.files_in_the_version_after_vacuum, 'VACUUM leaves only the files of the version');
eq(DS.rows_now, DS.appends * 500, 'twenty appends of 500 rows'); eq(DS.version_before_optimize, DS.appends - 1, 'twenty versions, numbered from 0'); yes(/FILE_NOT_EXIST/.test(DS.old_version_after_vacuum) && /retention/.test(DS.vacuum_zero_hours), 'the old version is gone, and a zero retention is refused');
yes(/mergeSchema/.test(X('delta.schema_enforcement')) && /channel/.test(X('delta.schema_enforcement')), 'schema enforcement names the fix and shows the extra column');

// ---- Tests, spark-submit and the event log ------------------------------------------------------------------------------------------------------------------
const TS = C('test.summary'); eq([TS.clean.passed, TS.clean.failed, TS.bug.passed, TS.bug.failed], [4, 0, 3, 1], 'the tests: four pass, the buggy copy fails one');
yes(/4 passed/.test(X('test.pytest_clean')) && /1 failed, 3 passed/.test(X('test.pytest_bug')) && /test_paid_and_refunded_orders_count/.test(X('test.pytest_bug')), 'the pytest output has the lines that the lesson reads');
const PRE = T('submit.precedence').rows; eq(PRE.map(r => r[1]), ['200', '50', '100', '50', '20'], 'the order of settings: the program, the flag, the file, the default');
const FL = T('submit.flags').rows; eq(FL.filter(r => r[1] !== 'yes').length, 0, 'every flag exists'); eq(C('submit.version').spark, '4.0.1', 'Spark 4.0.1');
const ET = T('eventlog.types').rows, et = k => ET.find(r => r[0] === k)[1];
eq(et('SparkListenerTaskStart'), et('SparkListenerTaskEnd'), 'every task that started ended'); eq(et('SparkListenerJobStart'), et('SparkListenerJobEnd'), 'every job that started ended'); eq(et('SparkListenerStageSubmitted'), et('SparkListenerStageCompleted'), 'every stage that was submitted completed');
const TE = JSON.parse(X('eventlog.task_end')); eq(TE['Task Type'], 'ShuffleMapTask', 'the sampled task'); eq(TE['Task Metrics']['Shuffle Write Metrics']['Shuffle Records Written'], W0.stores, 'a map task wrote one record for each store');
const ER = T('errors.messages').rows; eq(ER.length, 4, 'four failures'); yes(/UNRESOLVED_COLUMN/.test(ER[0][1]) && /maxResultSize/.test(ER[1][1]) && /ZeroDivisionError/.test(ER[2][1]) && /FAILED_READ_FILE/.test(ER[3][1]), 'the four messages');
const CO2 = C('errors.corrupt'); eq(CO2['ignoreCorruptFiles=true'], 1000, 'a corrupt file is skipped with the setting'); yes(/FAILED_READ_FILE/.test(CO2.default), 'and fails the read without it');
const RT = C('errors.retry'); eq([RT.maxFailures_default_in_local_mode, RT.maxFailures_default_on_a_cluster, RT.master_local_2_4_error], [1, 4, null], 'retries'); eq(RT.task_attempts_with_local_2_4.map(a => [a.attempt, a.failed]), [[0, true], [1, false]], 'attempt 0 failed and attempt 1 succeeded');

console.log(checks + ' checks, ' + (fails ? fails + ' failed' : 'all passed'));
process.exit(fails ? 1 : 0);
