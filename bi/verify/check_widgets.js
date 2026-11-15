// Checks the recorded tables that the BI labs and lessons read, with arithmetic and rules written here, in code that shares nothing with the widgets:
// the fan-out of a join, the many-to-many total, a tile from three sources, measures under filters, a ratio two ways, distinct counts, a running
// total, an extract and its append, a refresh policy and a late change, an aggregate table, column sizes, row-level security and the model files.
// The widgets themselves are driven in the browser by bi/verify/e2e_labs.js.
// Run: node bi/verify/check_widgets.js        BI_REAL_JS=<file> lets verify_bi.py feed it a changed copy of the recording
const fs = require('fs'), path = require('path');
global.window = global; global.LAB = {};
const root = path.join(__dirname, '..', '..');
(0, eval)(fs.readFileSync(process.env.BI_REAL_JS || path.join(root, 'bi', 'js', 'real.js'), 'utf8'));
const R = LAB.real, C = k => R.counts[k], T = k => R.tables[k], X = k => R.text[k];
let checks = 0, fails = 0;
const eq = (got, want, what) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) { fails++; console.log('FAIL:', what, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };
const near = (got, want, what, tol) => { checks++; if (!(Math.abs(got - want) <= (tol === undefined ? 0.005 : tol))) { fails++; console.log('FAIL:', what, 'got', got, 'want', want); } };
const yes = (cond, what) => { checks++; if (!cond) { fails++; console.log('FAIL:', what); } };
const sum = a => a.reduce((x, y) => x + y, 0);
const r2 = x => Math.round(x * 100) / 100;
const col = (t, name) => { const i = t.cols.indexOf(name); if (i < 0) throw new Error('no column ' + name); return t.rows.map(r => r[i]); };

// ---- the model -------------------------------------------------------------------------------------------------------------------------------
const MT = {}; T('model.tables').rows.forEach(r => { MT[r[0]] = r[2]; });
const F = C('model.fanout');
eq([MT.fact_orders, MT.fact_order_lines], [F.orders, F.lines], 'the table sizes are the counts of the fan-out queries');
eq([MT.dim_store, MT.dim_product], [12, 20], 'twelve stores and twenty products');
eq(F.shipping_fixed, F.shipping_right, 'lines summed to the order first give the shipping total of the orders table');
yes(F.shipping_wrong > F.shipping_right, 'the join to the lines inflates the shipping total');
eq(F.times_too_high, r2(F.shipping_wrong / F.shipping_right), 'the factor is the wrong total divided by the right one');
eq(F.lines_per_order, r2(F.lines / F.orders), 'lines for each order');
const FT = T('model.fanout').rows;
eq(FT.map(r => r[1]), [F.orders, F.lines, F.orders], 'rows read by the three queries');
eq(FT.map(r => r[2]), [F.shipping_right, F.shipping_wrong, F.shipping_fixed], 'totals of the three queries');
// the four small orders of the lab, by hand: fees 2.50, 4.00, 0.00, 2.50 and lines 2, 1, 2, 2
const LO = T('model.lab_orders').rows, LL = T('model.lab_lines').rows;
eq(LO, [[1, 2.5], [2, 4], [3, 0], [4, 2.5]], 'the four orders of the lab');
eq(LL.map(r => r[0]), [1, 1, 2, 3, 3, 4, 4], 'the seven lines of the lab');
const feeOf = id => LO.find(o => o[0] === id)[1];
eq(sum(LO.map(o => o[1])), 9, 'right answer of the lab: 9.00');
eq(sum(LL.map(l => feeOf(l[0]))), 14, 'the joined sum of the lab: 14.00');
T('model.lines_sample').rows.forEach(r => near(r[3] * r[4], r[5], 'line amount = quantity x unit price for line ' + r[0] + '-' + r[1]));
eq(T('model.lines_sample').rows.map(r => [r[0], r[1], r[5]]), LL, 'the lab lines are the sample lines');
yes(LL.every(l => l[1] >= 1 && l[1] <= F.max_lines_on_an_order), 'no order has more lines than the recorded maximum');
T('model.relationships').rows.forEach(r => eq([r[3], r[4]], [0, 0], 'relationship ' + r[0] + ' has a unique key and no orphans'));
eq(T('model.relationships').rows.length, 4, 'four relationships');
const M = C('model.m2m'), MM = T('model.m2m').rows;
near(sum(MM.map(r => r[2])), M.revenue_summed_over_codes, 'the five codes add up to the recorded sum');
eq(sum(MM.map(r => r[1])), M.orders_summed_over_codes, 'orders summed over codes');
eq(M.orders_summed_over_codes, M.orders_with_a_code + M.orders_with_two_codes, 'an order with two codes is counted twice, and nothing else is');
eq(MT.bridge_order_promos, M.orders_summed_over_codes, 'the bridge has one row for each code on an order');
yes(M.revenue_summed_over_codes > M.revenue_of_orders_with_a_code, 'revenue over codes counts some orders twice');
eq(MM.length, 5, 'five promotion codes');
const stores = T('model.stores').rows;
['North', 'South', 'East', 'West'].forEach(reg => eq(stores.filter(s => s[2] === reg).length, 3, 'three stores in ' + reg));

// ---- one tile from three sources ---------------------------------------------------------------------------------------------------------------
const TILE = T('tile.region_month').rows;
eq(TILE.length, 12, 'the tile has four regions and three months');
eq(T('hyper.tile').rows, TILE, 'the extract gives the same twelve numbers as the warehouse');
eq(C('perf.agg').tile_same_numbers, true, 'the aggregate gives the same twelve numbers');
eq([C('hyper.build').tile_matches_duckdb_before_the_last_day, C('hyper.append').tile_matches_duckdb_after_append], [true, true], 'the extract matched before and after the append');
const march = {}; TILE.filter(r => r[1] === '2026-03').forEach(r => { march[r[0]] = r[2]; });
const CTX = T('measures.context').rows, LAB_ = T('measures.lab').rows, cell = (a, b) => LAB_.find(r => r[0] === a && r[1] === b);
near(sum(Object.values(march)), CTX[0][1], 'the four regions of March add up to the revenue of March');
T('rls.by_region').rows.forEach(r => eq(r[1], march[r[0]], 'revenue of ' + r[0] + ' in March is the same in the tile and in the security table'));

// ---- measures ------------------------------------------------------------------------------------------------------------------------------------
eq(LAB_.length, 25, 'five regions (with All) times five categories (with All)');
eq(cell('All', 'All').slice(2), [CTX[0][1], CTX[0][2], CTX[0][4]], 'the unfiltered cell of the lab is the first row of the context table');
eq(cell('North', 'All').slice(2), [CTX[1][1], CTX[1][2], CTX[1][4]], 'North in the lab and in the context table');
eq(cell('North', 'Coffee').slice(2), [CTX[2][1], CTX[2][2], CTX[2][4]], 'North and Coffee in the lab and in the context table');
eq(cell('All', 'Equipment').slice(2), [CTX[3][1], CTX[3][2], CTX[3][4]], 'Equipment in the lab and in the context table');
const REG = ['North', 'South', 'East', 'West'], CAT = ['Coffee', 'Tea', 'Equipment', 'Merch'];
['All'].concat(CAT).forEach(c => near(sum(REG.map(g => cell(g, c)[2])), cell('All', c)[2], 'revenue adds up over regions for ' + c));
['All'].concat(REG).forEach(g => near(sum(CAT.map(c => cell(g, c)[2])), cell(g, 'All')[2], 'revenue adds up over categories for ' + g));
yes(sum(REG.map(g => cell(g, 'All')[4])) > cell('All', 'All')[4], 'customers do not add up over regions');
yes(sum(CAT.map(c => cell('All', c)[3])) > cell('All', 'All')[3], 'orders do not add up over categories: one order can hold two categories');
eq(sum(REG.map(g => cell(g, 'All')[3])), cell('All', 'All')[3], 'orders do add up over regions: an order belongs to one store');
CTX.forEach(r => eq(r[3], r2(r[1] / r[2]), 'average order value = revenue / orders for "' + r[0] + '"'));
const SH = T('measures.share').rows;
SH.forEach(r => { eq(r[1], march[r[0]], 'share: revenue of ' + r[0]); eq(r[2], CTX[0][1], 'share: the denominator is all regions'); eq(r[3], Math.round(r[1] / r[2] * 1000) / 10, 'share of ' + r[0] + ' in percent'); });
near(sum(SH.map(r => r[3])), 100, 'the four shares add up to 100', 0.11);
const AS = T('measures.aov_by_store').rows, AOV = C('measures.aov');
eq(AS.length, 12, 'twelve stores');
eq(AOV.ratio_of_sums, r2(sum(AS.map(r => r[1])) / sum(AS.map(r => r[2]))), 'ratio of sums, from the stores');
eq(AOV.average_of_ratios, r2(sum(AS.map(r => r[1] / r[2])) / 12), 'average of the twelve store ratios');
eq(AOV.ratio_of_sums, CTX[0][3], 'the ratio of sums is the average order value of March');
AS.forEach(r => eq(r[3], r2(r[1] / r[2]), 'average order value of ' + r[0]));
near(sum(AS.map(r => r[1])), CTX[0][1], 'the stores add up to the revenue of March');
eq(sum(AS.map(r => r[2])), CTX[0][2], 'the stores add up to the orders of March');
const D = T('measures.distinct').rows, DC = C('measures.distinct');
eq(sum(D.map(r => r[1])), DC.sum_of_the_months, 'the three months of customers, added');
yes(DC.quarter < DC.sum_of_the_months && DC.quarter >= Math.max(...D.map(r => r[1])), 'the quarter is below the sum of the months and not below the largest month');
eq(D[2][1], CTX[0][4], 'customers of March in both tables');
const Y = T('measures.ytd').rows; let run = 0;
Y.forEach(r => { run = r2(run + r[1]); eq(r[2], run, 'running total up to ' + r[0]); });
eq(Y.map(r => r[1]), ['2026-01', '2026-02', '2026-03'].map(m => r2(sum(TILE.filter(t => t[1] === m).map(t => t[2])))), 'the months of the running total are the months of the tile');
eq(sum(T('measures.cohort').rows.map(r => r[1])), C('measures.cohort').customers_who_ordered, 'every customer has exactly one first quarter');

// ---- the extract -----------------------------------------------------------------------------------------------------------------------------------
const SZ = T('hyper.sizes').rows, HB = C('hyper.build'), HA = C('hyper.append');
eq(SZ.map(r => r[2]), [HB.rows_in_extract, HB.rows_in_extract, HB.rows_in_extract], 'the three files hold the same rows');
yes(SZ[0][3] > 5 * SZ[1][3] && SZ[0][3] > 5 * SZ[2][3], 'the CSV is more than five times the size of the Parquet file and of the extract');
eq(HB.rows_loaded, HB.rows_in_extract, 'every loaded row is in the extract');
eq(HA.rows_before + HA.rows_appended, HA.rows_after, 'the append added its rows');
eq([HA.rows_after, HA.rows_in_source], [F.lines, F.lines], 'after the append the extract has the rows of the warehouse');
eq([HA.late_order_status_in_source, HA.late_order_status_in_extract], ['refunded', 'completed'], 'the refunded order is still completed in the extract');
eq(HA.difference, HA.late_order_amount, 'the extract is too high by the amount of the refunded order');
near(HA.completed_revenue_in_extract - HA.completed_revenue_in_source, HA.late_order_amount, 'completed revenue differs by that amount');
yes(HA.bytes_after >= HA.bytes_before, 'the file did not shrink');

// ---- refresh ---------------------------------------------------------------------------------------------------------------------------------------
const P = T('refresh.partitions').rows, RP = C('refresh.policy');
eq(P.length, RP.months_in_source, 'one partition for each month');
eq(sum(P.map(r => r[1])), F.lines, 'the partitions add up to the fact table');
eq(RP.rows_full_refresh, F.lines, 'a full refresh reads every line');
const newest = P.slice(-RP.refresh_months);
eq(newest.map(r => r[0]), RP.months_refreshed, 'the policy reloads the newest months');
eq(sum(newest.map(r => r[1])), RP.rows_incremental_refresh, 'rows of an incremental refresh');
eq(RP.percent_of_full, Math.round(RP.rows_incremental_refresh / RP.rows_full_refresh * 1000) / 10, 'percent of a full refresh');
eq(P.map(r => r[2]), P.map((r, i) => i >= P.length - RP.keep_months ? 'kept' : 'dropped'), 'the policy keeps the last twelve months');
eq(P.map(r => r[3]), P.map((r, i) => i >= P.length - RP.refresh_months ? 'refreshed' : 'not touched'), 'the policy touches the last two months');
eq(P.filter(r => r[4] > 0).map(r => r[0]), RP.months_with_changes_today, 'the months with a change');
eq(sum(P.filter(r => r[4] > 0).map(r => r[1])), RP.rows_refreshing_changed_months, 'rows of the months with a change');
eq(RP.difference_after_incremental, RP.late_order_amount, 'the two-month window leaves the model too high by the late refund');
eq(RP.difference_after_refreshing_changed_months, 0, 'reloading the changed months repairs it');
eq([RP.late_order_month, RP.late_order_amount], [HA.late_order_date.slice(0, 7), HA.late_order_amount], 'the late refund is the same order in both experiments');
near(RP.completed_revenue_model_after_incremental - RP.completed_revenue_source, RP.late_order_amount, 'model minus warehouse');
eq(RP.completed_revenue_source, HA.completed_revenue_in_source, 'the warehouse total is the same in both experiments');
// the rule of the lab, written again: a kept month with a change is out of date unless the window or the second rule reaches it
const late = P.findIndex(r => r[0] === RP.late_order_month);
[[1, false, true], [2, false, true], [6, false, false], [1, true, false], [2, true, false], [6, true, false]].forEach(([win, also, stale]) => {
  const reached = late >= P.length - win || also;
  eq(!reached, stale, 'a window of ' + win + ' month(s)' + (also ? ' with the second rule' : '') + (stale ? ' misses' : ' reaches') + ' the refund of ' + RP.late_order_month);
});

// ---- performance -----------------------------------------------------------------------------------------------------------------------------------
const A = C('perf.agg'), PG = T('perf.page').rows, PC = C('perf.page');
eq(A.fact_rows, F.lines, 'the fact rows of the performance section');
yes(A.agg_rows <= A.most_rows_possible, 'the aggregate cannot have more rows than days x stores x categories');
eq(A.most_rows_possible, A.days * A.stores * A.categories, 'days x stores x categories');
eq(A.days, MT.dim_date, 'the days are the rows of the date dimension');
eq(A.times_fewer_rows, Math.round(A.fact_rows / A.agg_rows * 10) / 10, 'how many times fewer rows');
eq(A.customers_march_true, CTX[0][4], 'true customers of March');
yes(A.customers_march_summed_from_agg > A.customers_march_true, 'summing daily customers overstates the month');
eq(PG.length, PC.tiles, 'six tiles');
eq(PG.map(r => r[2]), PG.map(r => r[1] === 'fact_order_lines' ? A.fact_rows : A.agg_rows), 'rows behind each tile');
eq(PC.rows_read_all_from_fact, PC.tiles * A.fact_rows, 'six tiles on the fact table');
eq(PC.rows_read_with_aggregate, sum(PG.map(r => r[2])), 'rows behind the page with the aggregate');
eq(PG.filter(r => r[1] === 'fact_order_lines').map(r => r[0]), ['Top 10 products', 'Customers this month'], 'the two tiles that need the fact');
eq(PC.queries_live, PC.tiles, 'one query for each tile');
const COLS = T('perf.columns').rows, CC = C('perf.columns');
eq(sum(COLS.map(r => r[2])), CC.total_bytes, 'the columns add up to the total');
eq(COLS.map(r => r[2]), COLS.map(r => r[2]).slice().sort((a, b) => b - a), 'largest column first');
eq(COLS.slice(0, 2).map(r => r[0]), CC.top_two, 'the two largest columns');
eq(CC.top_two_share_pct, Math.round((COLS[0][2] + COLS[1][2]) / CC.total_bytes * 1000) / 10, 'share of the two largest columns');
COLS.forEach(r => eq(r[3], (100 * r[2] / CC.total_bytes).toFixed(1) + ' %', 'share of ' + r[0]));
eq(COLS.find(r => r[0] === 'order_id')[1], F.orders, 'order_id has one value for each order');
eq(COLS.find(r => r[0] === 'region')[1], 4, 'four regions');
eq(T('perf.can_answer').rows.map(r => r[1]), ['yes', 'yes', 'no', 'no', 'yes'], 'which questions the aggregate can answer');

// ---- row-level security ----------------------------------------------------------------------------------------------------------------------------
const U = {}; T('rls.users').rows.forEach(r => { U[r[0]] = r; });
const S = C('rls.summary');
eq(U.ana[4], march.North, 'ana sees the revenue of North');
eq(U.ben[4], march.South, 'ben sees the revenue of South');
near(U.cho[4], march.East + march.West, 'cho sees East and West');
eq([U.dee[3], U.dee[4]], [S.march_lines_all, S.march_revenue_all], 'dee sees everything');
eq([U.eli[3], U.eli[4], S.unknown_user_lines], [0, 0, 0], 'a person with no entry sees nothing');
eq(U.ana[3] + U.ben[3] + U.cho[3], S.march_lines_all, 'the three regional views are the whole company, in rows');
near(U.ana[4] + U.ben[4] + U.cho[4], S.march_revenue_all, 'and in revenue');
eq(S.march_lines_all, P[P.length - 1][1], 'the lines of March are the newest partition');
eq(S.march_revenue_all, CTX[0][1], 'the revenue of March');

// ---- the model files -------------------------------------------------------------------------------------------------------------------------------
const LF = T('lookml.fields').rows, LK = C('lookml.summary');
eq([LF.filter(r => r[1] === 'dimension').length, LF.filter(r => r[1] === 'dimension group').length, LF.filter(r => r[1] === 'measure').length], [LK.dimensions, LK.dimension_groups, LK.measures], 'fields by kind');
eq(new Set(LF.map(r => r[0])).size, LK.views, 'four views');
eq(LF.filter(r => r[4] === 'yes').length, LK.primary_keys, 'one primary key for each view');
eq(LK.primary_keys, LK.views, 'every view has a primary key');
eq(LK.columns_not_in_the_warehouse, [], 'every column that the model names exists');
eq(T('lookml.joins').rows.map(r => [r[2], r[4]]), [['many_to_one', 'yes'], ['many_to_one', 'yes'], ['many_to_one', 'yes']], 'three joins, each many to one, each true in the data');
yes(/SyntaxError/.test(X('lookml.broken_error')), 'the broken file gives a syntax error');
yes(/^POST https:\/\/api\.powerbi\.com\/v1\.0\/myorg\/groups\/\{workspaceId\}\/datasets\/\{datasetId\}\/refreshes\n/.test(X('powerbi.refresh_request')), 'the refresh request is a POST to the refreshes of a dataset');
eq(JSON.parse(X('powerbi.refresh_request').split('\n\n')[1]).objects, [{ table: 'fact_order_lines', partition: RP.late_order_month }], 'the request names the partition of the late refund');
eq(C('powerbi.refresh_request').sent, false, 'the request was not sent');
const TC = T('tableau.connections').rows, CH = C('tableau.change');
eq([TC[0][1], TC[0][4]], [TC[1][1], TC[1][4]], 'the class and the user of the connection did not change');
yes(TC[0][2] !== TC[1][2] && TC[0][3] !== TC[1][3], 'the server and the database changed');
eq(CH.attributes_changed, ['connection@dbname', 'connection@server'], 'exactly two attributes changed');
eq(CH.caption_of_the_connection_after, TC[0][2], 'the caption still names the old server');
eq([CH.fields, CH.calculated_fields, CH.has_password], [T('tableau.fields').rows.length, T('tableau.fields').rows.filter(r => r[3]).length, false], 'fields of the data source, and no password in the file');
yes(Object.keys(R.files).filter(f => f.startsWith('sql/')).length === 13, 'thirteen SQL scripts are recorded');

console.log(checks + ' checks, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
