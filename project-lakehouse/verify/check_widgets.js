// Checks the recorded numbers that the lakehouse walkthrough and its lab read, with rules written in model.js, in code that shares nothing with the widget or with the project: the three days of the pretend
// source rebuilt from their rules, what each layer must hold after each run, the merge counts, the lines of the quality gate, the history of silver, and the printed text of each run.
// The lab itself is driven in a browser by project-lakehouse/verify/e2e_labs.js.
// Run: node project-lakehouse/verify/check_widgets.js        LAKE_REAL_JS=<file> lets verify_lakehouse.py feed it a changed copy of the recording
const fs = require('fs'), path = require('path');
global.window = global; global.LAB = {};
const root = path.join(__dirname, '..', '..');
(0, eval)(fs.readFileSync(process.env.LAKE_REAL_JS || path.join(root, 'project-lakehouse', 'js', 'real.js'), 'utf8'));
const M = require('./model.js');
const R = LAB.real, C = k => R.counts[k], T = k => R.tables[k], X = k => R.text[k];
let checks = 0, fails = 0;
const canon = v => (Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v);
const eq = (got, want, what) => { checks++; if (JSON.stringify(canon(got)) !== JSON.stringify(canon(want))) { fails++; console.log('FAIL:', what, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };
const yes = (cond, what) => { checks++; if (!cond) { fails++; console.log('FAIL:', what); } };

const S = M.simulate([1, 2, 3, 3]), KEYS = ['day1', 'day2', 'day3', 'day3_again'], RUNS = C('runs');
// ---- the source ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
eq([1, 2, 3].map(d => Object.values(M.files(d)).map(l => l.length)), [[305], [157, 305], [83]], 'the pretend source drops 305 lines on day 1, two files of 157 and 305 lines on day 2, and 83 lines on day 3');
eq(Object.keys(M.files(2)).sort(), ['date=2026-03-02/part-0002.json', 'date=2026-03-02/replay-part-0001.json'], 'day 2 has a new file and a replay file with another name');
eq(M.files(2)['date=2026-03-02/replay-part-0001.json'], M.files(1)['date=2026-03-01/part-0001.json'], 'the replay file holds the lines of the file of day 1');
// ---- each run ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
KEYS.forEach((k, i) => {
  const want = S.runs[i], got = RUNS[k];
  eq([got.day, got.files, got.bronze_rows, got.valid, got.quarantined, got.inserted, got.updated, got.left, got.gold_rows, got.gold_days, got.warning, got.nothing_to_do],
    [want.day, want.files, want.bronze_rows, want.valid, want.quarantined, want.inserted, want.updated, want.left, want.gold_rows, want.gold_days, want.warning, want.nothing_to_do], 'the numbers of run ' + k);
  eq(got.gate, want.gate, 'the lines of the gate in run ' + k);
  eq(X('run.' + k), M.runText(want), 'the printed text of run ' + k);
  eq(C('after_' + k), S.after[i], 'what each layer holds after run ' + k);
});
yes(RUNS.day1.inserted + RUNS.day2.inserted + RUNS.day3.inserted === C('after_day3').silver, 'the inserted orders of the three days add up to the orders of silver');
yes(RUNS.day2.inserted + RUNS.day2.updated + RUNS.day2.left === 116 + 300, 'the merge of day 2 accounts for the 116 new orders and the 300 orders of the replay');
yes(RUNS.day2.left === 259 && RUNS.day2.updated === 41, 'the replay leaves 259 events alone, and 41 orders change on day 2');
yes(RUNS.day3.left === 1 && RUNS.day3.updated === 0, 'the late event of day 3 is left alone');
eq(C('after_day3_again'), C('after_day3'), 'day 3 again changes nothing');
yes(KEYS.every(k => RUNS[k].gate.every(l => /^PASS /.test(l))), 'every gate line of every run passes');
// ---- the history, the versions and the quarantine -------------------------------------------------------------------------------------------------------------------------------------
eq(T('history'), { cols: ['version', 'operation', 'inserted', 'updated'], rows: S.versions.map(v => [v.version, v.op, v.ins, v.upd]) }, 'the history of silver: one empty write and three merges');
eq(T('versions'), { cols: ['version', 'orders', 'order 5'], rows: S.versions.map(v => [v.version, v.orders, v.order5]) }, 'silver as it was at each version, and order 5');
eq(T('quarantine'), { cols: ['reason', 'rows'], rows: Object.keys(S.reasons).sort().map(r => [r, S.reasons[r]]) }, 'the quarantine by reason: five reasons, two rows each');
eq(X('tour.run'), M.tourText(S), 'the printed text of the tour');
eq(C('tour'), { gold: [String(S.gold.rows), String(S.gold.days), String(S.gold.stores)] }, 'the tour counts gold: 36 rows, 3 days, 12 stores');
// ---- the rest ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
eq(C('tests'), { passed: 7 }, 'seven pytest tests');
eq(X('tests.run'), 'pytest -q tests\n7 passed', 'the printed text of the tests');
yes(/^4\.\d+\.\d+/.test(R.meta.pyspark) && R.meta.pyspark === R.meta.delta && /^3\.1\d/.test(R.meta.python) && /^2\d\./.test(R.meta.java), 'the versions of Spark, Delta Lake, Python and Java');
eq(X('tool.versions'), 'Spark ' + R.meta.pyspark + ' with Delta Lake ' + R.meta.delta + ' on Java ' + R.meta.java + ' and Python ' + R.meta.python, 'the versions as printed');
yes(['lakehouse/landing.py', 'lakehouse/bronze.py', 'lakehouse/rules.py', 'lakehouse/silver.py', 'lakehouse/gold.py', 'lakehouse/quality.py', 'lakehouse/run.py', 'lakehouse/tour.py', 'tests/test_pipeline.py'].every(f => R.files[f]), 'the recording holds the main files of the project');

console.log(fails ? fails + ' of ' + checks + ' checks FAILED' : checks + ' checks passed');
process.exit(fails ? 1 : 0);
