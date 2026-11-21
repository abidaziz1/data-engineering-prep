// Checks the recorded numbers that the ingestion labs and lessons read, with rules written in model.js, in code that shares nothing with the widgets or with the programs that ran:
// the orders of the shop rebuilt from the rule that made them, what a load with append, replace, merge and a cursor must write and hold, what a lookback does to a silent update, what day 3 does under each
// schema contract, the state that a cursor leaves, a window of old data loaded twice, the sync modes of a connector, and the active rows of the recorded loads.
// The widgets themselves are driven in a browser by ingestion/verify/e2e_labs.js.
// Run: node ingestion/verify/check_widgets.js        INGESTION_REAL_JS=<file> lets verify_ingestion.py feed it a changed copy of the recording
const fs = require('fs'), path = require('path');
global.window = global; global.LAB = {};
const root = path.join(__dirname, '..', '..');
(0, eval)(fs.readFileSync(process.env.INGESTION_REAL_JS || path.join(root, 'ingestion', 'js', 'real.js'), 'utf8'));
const M = require('./model.js');
const R = LAB.real, C = k => R.counts[k], T = k => R.tables[k], X = k => R.text[k];
let checks = 0, fails = 0;
const eq = (got, want, what) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) { fails++; console.log('FAIL:', what, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };
const yes = (cond, what) => { checks++; if (!cond) { fails++; console.log('FAIL:', what); } };

// ---- the shop ------------------------------------------------------------------------------------------------------------------------------------------------------------
const d1 = M.sorted(1), d2 = M.sorted(2), d3 = M.sorted(3);
eq([d1.length, d2.length, d3.length], [100, 109, 116], 'the shop holds 100, 109 and 116 orders at the end of days 1, 2 and 3 (order 11 is deleted on day 2, and day 3 brings seven new orders)');
eq(d1.reduce((a, o) => a + o.lines, 0), C('first').orders === 100 ? C('first').lines : -1, 'the 100 orders of day 1 have the number of lines that the first load wrote into the child table');
eq(C('first').lines, 200, 'the lines of the first load');
eq(C('first').tables, ['_dlt_loads', '_dlt_pipeline_state', '_dlt_version', 'orders', 'orders__lines'], 'the tables of a first load: three of dlt, the orders and their lines');
eq(C('first').columns, ['id', 'status', 'total_cents', 'updated_at', 'customer__id', 'customer__tier', '_dlt_load_id', '_dlt_id'], 'the object customer became two columns, and dlt added two ids');
eq(X('first.run').split('\n')[0], 'python first_load.py', 'the replay of the first load starts with its command');
eq(X('first.run').split('\n').filter(l => /^order 5:/.test(l)).length, 1, 'the first load shows order 5');
eq(M.ordersOn(1).get(5).lines, 3, 'order 5 has three lines, and the replay shows three');
eq((X('first.run').match(/\(\d, '[A-Z0-9-]+', \d\)/g) || []).length, 3, 'the replay shows the three lines of order 5');

// ---- seven ways to load ------------------------------------------------------------------------------------------------------------------------------------------------------
const cases = [
  ['append, the same day twice', { strategy: 'append' }, [1, 1]], ['replace, the same day twice', { strategy: 'replace' }, [1, 1]], ['merge on id, the same day twice', { strategy: 'merge' }, [1, 1]],
  ['merge on id, day 1 then day 2, the whole list', { strategy: 'merge' }, [1, 2]], ['append with a cursor, day 1 then day 2', { strategy: 'append', cursor: true }, [1, 2]],
  ['merge with a cursor, day 1 then day 2', { strategy: 'merge', cursor: true }, [1, 2]], ['merge with a cursor, day 1, day 2, day 2 again', { strategy: 'merge', cursor: true }, [1, 2, 2]]
];
eq(T('strategies.cases').rows, cases.map(([label, o, days]) => { const r = M.load(days, o); return [label, r.wrote.join(', '), r.rows, r.distinct, r.shop]; }), 'seven ways to load: rows written by each run, rows in the end, distinct orders and what the shop holds');
const S = C('strategies');
const mc = M.load([1, 2], { strategy: 'merge', cursor: true });
eq([S.order11_in_destination, S.order12_destination], [mc.table.some(r => r.id === 11), mc.table.filter(r => r.id === 12).map(r => r.status)[0]], 'order 11 stays after it is deleted, and order 12 keeps the status of day 1');
eq([S.shipped_destination, S.shipped_shop], [mc.table.filter(r => r.status === 'SHIPPED').length, M.sorted(2).filter(r => r.status === 'SHIPPED').length], 'the orders shipped in the destination and in the shop');
eq([S.shipped_destination, S.shipped_shop], [10, 11], 'ten shipped in the destination, eleven in the shop');

// ---- the order that was shipped without a new updated_at ---------------------------------------------------------------------------------------------------------------------
const bcases = [['append, no key', { strategy: 'append', cursor: true }], ['append, key id', { strategy: 'append', key: true, cursor: true }], ['merge, key id', { strategy: 'merge', cursor: true }], ['merge, key id, lag of one day', { strategy: 'merge', cursor: true, lag: 86400 }]];
eq(T('boundary.cases').rows, bcases.map(([label, o]) => { const r = M.load([1, 2], o); return [label, r.wrote.join(', '), r.rows, r.table.filter(t => t.id === 12).map(t => t.status).sort().join(', ')]; }), 'the cursor cases: rows written, rows in the end, and the status of order 12');
yes(T('boundary.cases').rows[0][1].split(', ')[1] - T('boundary.cases').rows[1][1].split(', ')[1] === 1, 'without a key, one more row is read at the cursor: order 12');

// ---- schema drift ----------------------------------------------------------------------------------------------------------------------------------------------------------------
const modes = ['evolve (the default)', 'columns: freeze', 'columns: discard_row', 'columns: discard_value', 'data_type: freeze'];
const DM = T('drift.modes').rows;
eq(DM.map(r => r[0]), modes, 'the five contracts');
eq(DM.map(r => [r[1], r[2], r[3] === 'none' ? [] : r[3].split(', ')]), modes.map(m => { const d = M.drift(m); return [d.error ? 'failed' : 'loaded ' + d.wrote, d.error ? M.load([1, 2], { strategy: 'merge', cursor: true }).rows : d.inDestination, d.error ? [] : d.newColumns]; }), 'what day 3 does under each contract: the run, the orders in the destination, the new columns');
yes(DM[1][4].includes('`coupon`') && DM[1][4].includes('columns') && DM[4][4].includes('total_cents__v_text') && DM[4][4].includes('data_types'), 'the errors name the column and the rule');
yes(DM[0][4] === '' && DM[2][4] === '' && DM[3][4] === '', 'a load that did not fail has no error');
const D = C('drift');
eq(D.order116, "(116, None, None, None, 1116, None)", 'order 116, with the text "1116", has the number in total_cents');
eq(D.order117, "(117, None, None, None, None, '11.17')", 'order 117, with the text "11.17", has its amount in the variant column');
eq(D.order111, "(111, 'SPRING', 'web', '4.1', 1111, None)", 'order 111 has a coupon and a channel');
eq(D.order112, "(112, None, 'web', '4.1', 1112, None)", 'order 112 has a null coupon and a channel');
eq(D.versions, 2, 'dlt kept two schema versions');
const sumMissing = d3.filter(o => o.id === 116 || o.id === 117);
eq(sumMissing.map(o => (/^\d+$/.test(o.text) ? 1000 + o.id : null)), [1116, null], 'a sum over total_cents counts order 116 and skips order 117');
eq(Math.round(11.17 * 100), 1117, 'the amount of order 117 in cents');

// ---- state and a window of old data ------------------------------------------------------------------------------------------------------------------------------------------
const S2 = C('state'), st = M.load([1, 2], { strategy: 'merge', cursor: true });
eq([S2.fresh_wrote, S2.remembered, S2.loads], [M.load([1, 2, 2], { strategy: 'merge', cursor: true }).wrote[2], st.remembered, 2], 'a fresh folder on the same destination writes nothing, and ten rows at the cursor are remembered');
eq(S2.last_value, '2026-03-02T09:30:00+00:00', 'the cursor after day 2');
eq(new Date(st.last).toISOString(), '2026-03-02T09:30:00.000Z', 'the cursor is the newest updated_at of day 2');
const winRuns = s => { const base = M.load([1], { strategy: s, cursor: true }); const w = M.load([2, 2], { strategy: s, window: [Date.parse('2026-03-02T00:00:00+00:00'), Date.parse('2026-03-03T00:00:00+00:00')] }); return { wrote: w.wrote, rows: s === 'append' ? base.rows + w.rows : new Set([...base.table.map(r => r.id), ...w.table.map(r => r.id)]).size, distinct: new Set([...base.table.map(r => r.id), ...w.table.map(r => r.id)]).size }; };
const wa = winRuns('append'), wm = winRuns('merge');
eq(S2.window.append, [wa.wrote, wa.rows, wa.distinct], 'a window of day 2 loaded twice with append: rows written, rows and distinct orders');
eq(S2.window.merge, [wm.wrote, wm.rows, wm.distinct], 'a window of day 2 loaded twice with merge');

// ---- the coding round and the active rows --------------------------------------------------------------------------------------------------------------------------------------
const ch = M.load([1, 2, 3, 3], { strategy: 'merge', cursor: true });
const days = [1, 2, 3, 3].map((d, k) => { const r = M.load([1, 2, 3, 3].slice(0, k + 1), { strategy: 'merge', cursor: true }); return [d, r.wrote[k], r.rows, r.distinct]; });
eq(T('challenge.days').rows, days, 'the coding round: day, rows written, rows in the table, distinct orders');
eq([ch.wrote.reduce((a, b) => a + b, 0), ch.distinct], [127, 117], 'the four loads wrote 127 rows for 117 distinct orders');

// ---- the Airbyte connector ---------------------------------------------------------------------------------------------------------------------------------------------------------
const P = C('protocol');
eq(P.streams.map(s => s[0]), ['products', 'purchases', 'users'], 'the three streams, sorted by name');
eq(P.streams.map(s => [s[1], s[2], s[3], s[4]]), [[7, 'full_refresh and incremental', 'updated_at', 'id'], [8, 'full_refresh and incremental', 'updated_at', 'id'], [17, 'full_refresh and incremental', 'updated_at', 'id']], 'fields, sync modes, cursor and key of each stream');
eq([P.full, P.inc, P.again], [[20, Math.ceil(20 / 10)], [20, 2], 0], 'a read of 20 users in slices of 10 gives 20 RECORD and 2 STATE messages, and a read with the state gives 0');
eq(P.check_ok, 'SUCCEEDED', 'a good config passes check');
eq(P.check_bad, 'FAILED, Config validation error: -5 is less than the minimum of 1', 'a count of -5 fails check');
eq(P.record_keys, 'stream, data, emitted_at', 'a RECORD has three keys');
eq(P.fields, 17, 'a user has 17 fields');
yes(/"loop_offset": 20/.test(P.state) && /<time of the run>/.test(P.state), 'the last STATE message holds the offset and a masked time');
eq(P.spec.split(', ').length, 5, 'the connector asks for five settings');
const sy = [['full refresh, replace', 'replace', true, true], ['full refresh, append', 'append', true, true], ['full refresh, merge', 'merge', true, true], ['incremental, a cursor that always moves', 'append', false, true], ['incremental, a cursor that tells the truth', 'append', false, false]];
eq(T('sync.cases').rows, sy.map(([label, s, full, moves]) => { const r = M.sync(s, full, moves); return [label, r.read.join(', '), r.rows.join(', '), r.distinct]; }), 'five sync modes: records read by two syncs, rows after them, and distinct ids');
eq(C('sync').added, ['_airbyte_raw_id', '_airbyte_extracted_at', '_airbyte_meta'], 'PyAirbyte adds three columns');
eq(C('sync').source_columns, 17, 'the source columns of a user');

// ---- the versions --------------------------------------------------------------------------------------------------------------------------------------------------------------------------
yes(/^1\.\d+\.\d+/.test(R.meta.dlt) && /^1\.\d+/.test(R.meta.duckdb) && /^0\.\d+\.\d+/.test(R.meta.airbyte) && R.meta.connector === 'airbyte-source-faker', 'the versions of the tools');
eq(X('strategies.run').split('\n')[0], 'python strategies.py', 'the replay of the strategies starts with its command');

console.log(fails ? fails + ' of ' + checks + ' checks FAILED' : checks + ' checks passed');
process.exit(fails ? 1 : 0);
