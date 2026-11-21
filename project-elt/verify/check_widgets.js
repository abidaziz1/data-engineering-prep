// Checks the recorded numbers that the ELT walkthrough and its lab read, with rules written in model.js, in code that shares nothing with the widget or with the project: the shop rebuilt from its rules,
// what each load must write (a cursor with a lookback and a merge), what each layer holds after each run, the lines of the quality gate, the daily mart, and the structure of the dbt run.
// The lab itself is driven in a browser by project-elt/verify/e2e_labs.js.
// Run: node project-elt/verify/check_widgets.js        ELT_REAL_JS=<file> lets verify_elt.py feed it a changed copy of the recording
const fs = require('fs'), path = require('path');
global.window = global; global.LAB = {};
const root = path.join(__dirname, '..', '..');
(0, eval)(fs.readFileSync(process.env.ELT_REAL_JS || path.join(root, 'project-elt', 'js', 'real.js'), 'utf8'));
const M = require('./model.js');
const R = LAB.real, C = k => R.counts[k], T = k => R.tables[k], X = k => R.text[k];
let checks = 0, fails = 0;
const canon = v => (Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v);
const eq = (got, want, what) => { checks++; if (JSON.stringify(canon(got)) !== JSON.stringify(canon(want))) { fails++; console.log('FAIL:', what, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };
const yes = (cond, what) => { checks++; if (!cond) { fails++; console.log('FAIL:', what); } };

// ---- the shop and the loads --------------------------------------------------------------------------------------------------------------------------------------------------------------
eq([1, 2, 3].map(d => M.sorted(d).length), [200, 230, 255], 'the shop holds 200, 230 and 255 orders at the end of days 1, 2 and 3');
const keys = ['day1', 'day2', 'day3_fail', 'day3_fix', 'backfill2'], days = [1, 2, 3, 3, 2];
const RUNS = C('runs'), detail = M.runDetail(days).out;
keys.forEach((k, i) => eq(RUNS[k].load, 'loaded day ' + days[i] + ': orders ' + detail[i].orders + ', order lines ' + detail[i].lines + ', stores 12', 'the load of run ' + k + ' wrote the orders and the lines that the cursor and the lookback give'));
eq(detail.map(d => d.orders), [200, 60, 35, 9, 0], 'the five loads wrote 200, 60, 35, 9 and 0 orders');
// ---- states of the runs and of their tasks ---------------------------------------------------------------------------------------------------------------------------------------------------
eq(keys.map(k => RUNS[k].state), ['success', 'success', 'failed', 'success', 'success'], 'the states of the five runs');
const ok = { extract_load: 'success', dbt_build: 'success', quality_gate: 'success', publish: 'success' };
eq(keys.map(k => RUNS[k].tasks), [ok, ok, { extract_load: 'success', dbt_build: 'failed', quality_gate: 'not run', publish: 'not run' }, ok, ok], 'the tasks of each run: the failure stops the gate and the publish step');
eq(T('runs').rows.map(r => [r[0], r[1], r[2]]), [['Day 1', '2026-03-01', 'success'], ['Day 2', '2026-03-02', 'success'], ['Day 3', '2026-03-03', 'failed'], ['Day 3 again', '2026-03-03', 'success'], ['Backfill of day 2', '2026-03-02', 'success']], 'the table of runs');
// ---- dbt --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const TOTAL = 1 + 3 + 2 + 1 + 1 + 14;         // a seed, three views, two tables, an incremental model, a snapshot and fourteen tests
eq(TOTAL, 22, 'dbt has 22 nodes to build or test');
['day1', 'day2', 'day3_fix', 'backfill2'].forEach(k => eq(RUNS[k].dbt, { ERROR: 0, PASS: 22, SKIP: 0, TOTAL: 22, WARN: 0 }, 'dbt passes all 22 in ' + k));
const dependents = ['main.fct_orders', 'assert_order_totals_match_lines', 'not_null_fct_orders_order_id', 'not_null_fct_orders_total_cents', 'unique_fct_orders_order_id', 'main.orders_daily', 'not_null_orders_daily_orders'];
eq(RUNS.day3_fail.dbt, { ERROR: 1, PASS: TOTAL - 1 - dependents.length, SKIP: dependents.length, TOTAL: 22, WARN: 0 }, 'the failed run: one error, seven skipped, and the rest passed');
eq(RUNS.day3_fail.dbt_skip, dependents.slice().sort(), 'the skipped nodes are the dependents of the failed test: the order mart, its tests, and the daily mart with its test');
eq(RUNS.day3_fail.dbt_fail, ['relationships_stg_order_lines_sku__sku__ref_product_prices_'], 'the failed test is the one on the prices');
eq(RUNS.day1.dbt_skip, [], 'nothing is skipped in a good run');
// ---- the layers ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
eq(C('after_day1'), { raw_orders: 200, fct_orders: 200 }, 'after day 1 the raw table and the marts hold 200 orders');
eq(C('after_day2'), { raw_orders: 230, fct_orders: 230, orders_daily: 6 }, 'after day 2 both hold 230 orders, and the daily mart has two days of three regions');
const AF = C('after_failed_day3');
eq([AF.raw_orders, AF.fct_orders, AF.orders_daily, AF.unpriced_lines, AF.unpriced_sku], [255, 230, 6, 1, 'CAPSULE-10'], 'after the failed run the raw table is ahead of the marts, and one line has an unpriced product');
const finalTable = M.runDetail(days.slice(0, 3)).table;
eq(C('after_day3'), { raw_orders: 255, fct_orders: 255, orders_daily: 9, revenue_cents: M.revenue(M.sorted(3)), lines: M.lineCount(M.sorted(3)) }, 'after the fix the marts hold 255 orders, the revenue of the shop, and 511 lines');
eq(C('after_backfill'), { raw_orders: 255, distinct: 255, fct_orders: 255, orders_daily: 9 }, 'the backfill changed nothing');
eq(T('orders_daily').rows, M.daily(finalTable), 'the daily mart: orders and revenue of each date and region, from the final state of the orders');
eq(T('snapshot.store4').rows, [[4, 'Store 4', false], [4, 'Store 4 (Riverside)', true]], 'store 4 has two versions, and the new one is current');
// ---- the quality gate ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const gate = (n, rev, nonRefunded) => ['PASS raw.orders: rows equal distinct ids: ' + n, 'PASS raw.orders: orders equal the orders of the shop: ' + n, 'PASS raw.orders: revenue equals the revenue of the shop: ' + rev, 'PASS fct_orders: one row for each order: ' + n,
  'PASS fct_orders: revenue equals raw.orders: ' + rev, 'PASS orders_daily: revenue equals the orders that were not refunded: ' + nonRefunded];
const nonRef = d => M.revenue(M.sorted(d).filter(o => o.status !== 'REFUNDED'));
eq(RUNS.day1.gate, gate(200, M.revenue(M.sorted(1)), nonRef(1)), 'the gate of day 1');
eq(RUNS.day2.gate, gate(230, M.revenue(M.sorted(2)), nonRef(2)), 'the gate of day 2');
eq(RUNS.day3_fix.gate, gate(255, M.revenue(M.sorted(3)), nonRef(3)), 'the gate of day 3 after the fix');
eq(RUNS.backfill2.gate, gate(255, M.revenue(M.sorted(3)), nonRef(3)), 'the gate of the backfill compares with day 3, the newest day in the warehouse');
eq(RUNS.day3_fail.gate, [], 'the gate did not run on the failed day');
eq(C('first_gate').lines, ['PASS raw.orders: rows equal distinct ids: 255', 'FAIL raw.orders: orders equal the orders of the shop: 255 (expected 230)', 'FAIL raw.orders: revenue equals the revenue of the shop: ' + M.revenue(M.sorted(3)) + ' (expected ' + M.revenue(M.sorted(2)) + ')',
  'FAIL fct_orders: one row for each order: 255 (expected 230)', 'PASS fct_orders: revenue equals raw.orders: ' + M.revenue(M.sorted(3)), 'FAIL orders_daily: revenue equals the orders that were not refunded: ' + nonRef(3) + ' (expected ' + nonRef(2) + ')'], 'the first version of the gate compares day 3 with day 2');
eq(C('first_gate').exit, 1, 'the first version of the gate exits with 1');
// ---- the rest -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
eq(RUNS.day1.publish, ['published orders_daily: 3 rows', 'published fct_orders: 200 rows', 'published dim_store: 12 rows'], 'what the first run published');
eq(RUNS.day3_fail.publish, [], 'nothing was published on the failed day');
eq(C('tests'), { passed: 5 }, 'five pytest tests');
eq(X('run.day3_fail').split('\n')[0], 'airflow dags test brewline_daily 2026-03-03', 'the replay of the failed run starts with its command');
eq(X('run.day3_fail').split('\n').filter(l => /^  (extract_load|dbt_build|quality_gate|publish)/.test(l)).map(l => l.trim().split(/\s+/)).map(a => [a[0], a.slice(1).join(' ')]), [['extract_load', 'success'], ['dbt_build', 'failed'], ['quality_gate', 'not run'], ['publish', 'not run']], 'the replay of the failed run shows the four tasks');
yes(/^1\.\d+\.\d+/.test(R.meta.dlt) && /^1\.\d+\.\d+/.test(R.meta.dbt) && /^3\./.test(R.meta.airflow), 'the versions of the tools');
yes(['ingestion/shop_api.py', 'ingestion/load_orders.py', 'dbt/models/marts/fct_orders.sql', 'dbt/models/marts/orders_daily.sql', 'orchestration/dags/brewline_daily.py', 'quality/source_vs_warehouse.py'].every(f => R.files[f]), 'the recording holds the main files of the project');

console.log(fails ? fails + ' of ' + checks + ' checks FAILED' : checks + ' checks passed');
process.exit(fails ? 1 : 0);
