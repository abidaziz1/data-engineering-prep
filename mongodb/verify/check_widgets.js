// Checks the recorded numbers that the MongoDB labs and lessons read, with rules written here, in code that shares nothing with the widgets: the 20,000 orders rebuilt from the rule that made
// them (stores, statuses, lines), the documents that every stage of a pipeline must leave, the revenue of each SKU, store and region, how many documents each index query must examine, the
// result of each write against the rules of the validator, and the three best stores.
// The widgets themselves are driven in a browser by mongodb/verify/e2e_labs.js.
// Run: node mongodb/verify/check_widgets.js        MONGODB_REAL_JS=<file> lets verify_mongodb.py feed it a changed copy of the recording
const fs = require('fs'), path = require('path');
global.window = global; global.LAB = {};
const root = path.join(__dirname, '..', '..');
(0, eval)(fs.readFileSync(process.env.MONGODB_REAL_JS || path.join(root, 'mongodb', 'js', 'real.js'), 'utf8'));
const R = LAB.real, C = k => R.counts[k], T = k => R.tables[k], X = k => R.text[k];
let checks = 0, fails = 0;
const eq = (got, want, what) => { checks++; if (JSON.stringify(got) !== JSON.stringify(want)) { fails++; console.log('FAIL:', what, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };
const yes = (cond, what) => { checks++; if (!cond) { fails++; console.log('FAIL:', what); } };

// ---- the orders, rebuilt from the rule ---------------------------------------------------------------------------------------------------------------------------------
const SKUS = [['MUG', 900], ['BEANS-250', 1800], ['FILTER', 350], ['GRINDER', 4900]], REGIONS = ['north', 'south', 'east'], N = 20000;
const orders = [];
for (let i = 1; i <= N; i++) {
  const lines = []; for (let k = 0; k < 1 + i % 3; k++) lines.push({ sku: SKUS[(i + k) % 4][0], qty: 1 + (i + k) % 3, cents: SKUS[(i + k) % 4][1] });
  orders.push({ i, store: 1 + (i * 7) % 12, status: i % 25 === 0 ? 'REFUNDED' : i % 7 === 0 ? 'SHIPPED' : 'PLACED', lines, total: lines.reduce((a, l) => a + l.qty * l.cents, 0) });
}
eq([C('load').orders, C('load').stores], [N, 12], 'the program loaded 20,000 orders and 12 stores');
const live = orders.filter(o => o.status !== 'REFUNDED');
const P = C('pipeline');
eq(P.stage_counts, [live.length, live.reduce((a, o) => a + o.lines.length, 0), 4, 4], 'the stages leave the orders that are not refunded, one document for each of their lines, and four groups');
eq(P.stage_names, ['$match', '$unwind', '$group', '$sort'], 'the four stages of the pipeline');
const bySku = {}; live.forEach(o => o.lines.forEach(l => { const r = bySku[l.sku] || (bySku[l.sku] = [0, 0]); r[0] += l.qty; r[1] += l.qty * l.cents; }));
eq(T('pipeline.sku').rows, Object.keys(bySku).sort().map(k => [k, bySku[k][0], bySku[k][1]]), 'units and revenue of each SKU, summed from the lines');
const byStore = {}; live.forEach(o => { const r = byStore[o.store] || (byStore[o.store] = [0, 0]); r[0]++; r[1] += o.total; });
eq(T('pipeline.store').rows, [1, 2, 3].map(s => [s, byStore[s][0], byStore[s][1]]), 'orders and revenue of stores 1, 2 and 3');
const byRegion = {}; Object.keys(byStore).forEach(s => { const g = REGIONS[s % 3], r = byRegion[g] || (byRegion[g] = [0, 0]); r[0] += byStore[s][0]; r[1] += byStore[s][1]; });
eq(T('pipeline.region').rows, Object.keys(byRegion).sort().map(g => [g, byRegion[g][0], byRegion[g][1]]), 'orders and revenue of each region, joined through the store');
const wrong = {}; orders.forEach(o => o.lines.forEach(() => { wrong[o.store] = (wrong[o.store] || 0) + o.total; }));
const real = s => orders.filter(o => o.store === +s).reduce((a, o) => a + o.total, 0);
yes(Object.keys(wrong).every(s => wrong[s] >= real(s)) && Object.keys(wrong).some(s => wrong[s] === 2 * real(s)) && Object.keys(wrong).some(s => wrong[s] === 3 * real(s)) && Object.keys(wrong).some(s => wrong[s] === real(s)), 'summing the order total after an unwind gives the real revenue for stores whose orders have one line, and two or three times as much for the others');

// ---- the index queries ------------------------------------------------------------------------------------------------------------------------------------------------------
const q1 = orders.filter(o => o.store === 3 && o.status === 'REFUNDED').length, q3 = orders.filter(o => o.store === 3 && o.status === 'PLACED').length;
const IX = T('index.cases').rows;
eq(IX.map(r => r[2]), ['COLLSCAN', 'FETCH > IXSCAN', 'SORT > FETCH > IXSCAN', 'FETCH > IXSCAN', 'PROJECTION_COVERED > IXSCAN'], 'the plan of each of the five queries');
eq(IX.map(r => [r[3], r[4], r[5]]), [[0, N, q1], [q1, q1, q1], [q3, q3, q3], [q3, q3, q3], [q1, 0, q1]], 'keys, documents and results of each query, counted from the rule');
eq(IX.map(r => r[0]), ['1', '2', '3', '4', '5'], 'the cases are numbered 1 to 5');
yes(IX[2][2].startsWith('SORT') && !IX[3][2].includes('SORT'), 'the sort stage is there without the sort field in the index and gone with it');
yes(/indexes: \['_id_', 'store_status', 'store_status_placed'\]/.test(X('indexes.run')), 'the two indexes that the program made');

// ---- shapes, the validator, upserts and the transaction ---------------------------------------------------------------------------------------------------------------
const S = C('shapes');
eq([S.null_matches, S.missing_matches, S.number_matches, S.string_matches, S.sorted], ["['O-1', 'O-2', 'O-4']", "['O-2', 'O-4']", '[]', "['O-4']", "['O-1', 'O-2', 'O-3', 'O-4']"], 'the four documents of the shapes program: null matches missing, and 4 is not "4"');
eq([S.duplicate_code, S.max_bson], [11000, 16 * 1024 * 1024], 'the duplicate key code and the limit of a document');
yes(S.server_limit_bytes > S.max_bson && S.server_limit_bytes < S.max_bson + 16384, 'the limit of a command is a little above the limit of a document');
yes(S.too_large_bytes > 17 * 1024 * 1024 && S.too_large_bytes > S.server_limit_bytes, 'the document that was refused is bigger than 17 MB and than the limit');
const valid = d => Number.isInteger(d.amount) && d.amount >= 0 && ['USD', 'EUR', 'GBP'].includes(d.currency) && typeof d.order === 'string';
const tests = [['a valid payment', { order: 'O-1', amount: 1250, currency: 'USD' }], ['amount as text', { order: 'O-2', amount: '12.50', currency: 'USD' }], ['amount with decimals', { order: 'O-3', amount: 12.5, currency: 'USD' }],
  ['negative amount', { order: 'O-4', amount: -5, currency: 'USD' }], ['unknown currency', { order: 'O-5', amount: 100, currency: 'XXX' }], ['missing currency', { order: 'O-6', amount: 100 }], ['same order again', { order: 'O-1', amount: 1250, currency: 'USD' }]];
const held = new Set(), expected = tests.map(([label, d]) => { if (!valid(d)) return [label, 'code 121']; if (held.has(d.order)) return [label, 'code 11000']; held.add(d.order); return [label, 'inserted']; });
eq(T('design.validation').rows.map(r => [r[0], r[1]]), expected, 'each payment against the rules of the validator and the unique index');
eq(T('design.validation').rows.filter(r => r[1] === 'code 121').every(r => r[2] === 'Document failed validation'), true, 'every refused payment says that the document failed validation');
const D = C('design');
eq([D.payments_held, D.upsert_first, D.upsert_second, D.plain_insert_error_code, D.daily], [held.size, [3, 0, 0], [0, 3, 0], 11000, 3], 'one payment held, an upsert that inserts 3 and then changes nothing, and a plain insert that fails');
eq([D.inside, D.outside, D.after_abort, D.after_commit], [1, 0, 0, 1], 'a transaction is seen inside and not outside, and an abort leaves nothing');

// ---- the change stream ------------------------------------------------------------------------------------------------------------------------------------------------------
const ST = C('streams');
eq(ST.events, ['insert O-1 full status=PLACED', "update O-1 changed {'status': 'SHIPPED'} full=None", 'delete O-1 full=None'], 'the three events of the first stream: the update has no full document because the order was deleted');
eq(ST.resumed, ["update O-2 changed {'status': 'REFUNDED'} full=None", 'delete O-2 full=None'], 'the resumed stream gives the two writes that were made while nobody watched');
eq(ST.first_stream, 'insert O-2 full status=PLACED', 'the first stream of the resume experiment saw the insert');
eq(ST.fields, "['_id', 'clusterTime', 'documentKey', 'fullDocument', 'ns', 'operationType', 'wallTime']", 'the fields of an event');

// ---- the coding round ---------------------------------------------------------------------------------------------------------------------------------------------------------------
const top = Object.keys(byStore).map(s => ({ s: +s, n: byStore[s][0], r: byStore[s][1] })).sort((a, b) => b.r - a.r || a.s - b.s).slice(0, 3);
eq(T('challenge.top').rows, top.map(t => [t.s, t.n, t.r, Math.floor(t.r / t.n)]), 'the three stores with the highest revenue, with the average rounded down');
yes(/^8\.\d+\.\d+$/.test(R.meta.mongod) && /^4\.\d+/.test(R.meta.pymongo), 'the versions of the server and the driver');
eq(X('indexes.run').split('\n')[0], 'python indexes.py', 'the replay of the indexes starts with its command');

console.log(fails ? fails + ' of ' + checks + ' checks FAILED' : checks + ' checks passed');
process.exit(fails ? 1 : 0);
