// Checks the recorded numbers that the CDC walkthrough and its lab read, with rules written in model.js, in code that shares nothing with the widget or with the project: the changes of the shop
// rebuilt from their rules, the messages that each stage adds to the topic, what each layer must hold after each run, the merge counts, the lines of the gate, the history of silver, the printed
// text of each run, and the structure of the sample messages. The lab itself is driven in a browser by project-cdc/verify/e2e_labs.js.
// Run: node project-cdc/verify/check_widgets.js        CDC_REAL_JS=<file> lets verify_cdc.py feed it a changed copy of the recording
const fs = require('fs'), path = require('path');
global.window = global; global.LAB = {};
const root = path.join(__dirname, '..', '..');
(0, eval)(fs.readFileSync(process.env.CDC_REAL_JS || path.join(root, 'project-cdc', 'js', 'real.js'), 'utf8'));
const M = require('./model.js');
const R = LAB.real, C = k => R.counts[k], T = k => R.tables[k], X = k => R.text[k];
let checks = 0, fails = 0;
const canon = v => (Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v);
const eq = (got, want, what) => { checks++; if (JSON.stringify(canon(got)) !== JSON.stringify(canon(want))) { fails++; console.log('FAIL:', what, '\n   got ', JSON.stringify(got), '\n   want', JSON.stringify(want)); } };
const yes = (cond, what) => { checks++; if (!cond) { fails++; console.log('FAIL:', what); } };

const S = M.simulate(), KEYS = ['snapshot', 'changes', 'replay', 'backlog', 'identity'], RUNS = C('runs');
// ---- each run ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
KEYS.forEach(k => {
  eq(RUNS[k], S.runs[k], 'the numbers and the gate lines of run ' + k);
  eq(X('run.' + k), M.runText(k, S.runs[k]), 'the printed text of run ' + k);
  eq(C('after_' + k), S.after[k], 'what each layer holds after run ' + k + ', and what Postgres holds');
});
yes(RUNS.changes.events === 87 && RUNS.changes.inserted + RUNS.changes.updated === 86, 'the 87 events of the day of changes are 86 rows: 50 inserted and 36 updated');
yes(RUNS.replay.events === RUNS.changes.events && RUNS.replay.left === 86 && RUNS.replay.inserted === 0 && RUNS.replay.updated === 0, 'the replay applies the same 87 events and leaves 86 rows alone');
eq(C('after_replay'), C('after_changes'), 'the replay changes no total');
yes(KEYS.every(k => RUNS[k].gate.length === 5 && RUNS[k].gate.every(l => /^PASS /.test(l))), 'every gate line of every run passes');
// ---- the topic, the operations, the history ------------------------------------------------------------------------------------------------------------------------------------
eq(C('topic'), { snapshot: S.topic.snapshot, changes: S.topic.changes, backlog: S.topic.backlog, identity: S.topic.identity }, 'the messages that the topic holds after each stage: 200, 287, 387 and 389');
eq(C('ops'), S.ops, 'the operations of the messages: 200 reads, 50 creates, 134 updates and 5 deletes');
eq(C('offsets'), S.offsets, 'the offsets of the sample messages');
eq(T('history'), { cols: ['version', 'operation', 'inserted', 'updated'], rows: S.versions.map(v => [v.version, v.op, v.ins, v.upd]) }, 'the history of silver: an empty write and five merges, the replay changing nothing');
eq(C('slot'), { active_before: true, active_while_stopped: false, retained_grew: true, active_after_resume: true, retained_dropped: true }, 'what Postgres said about the slot');
// ---- the sample messages ------------------------------------------------------------------------------------------------------------------------------------------------------------------
const ev = k => JSON.parse(X('event.' + k));
const masked = e => ['ts_ms', 'ts_us', 'ts_ns', 'sequence', 'txId', 'lsn', 'xmin', 'origin_lsn'].every(f => e.source[f] === '<' + f + '>') && ['ts_ms', 'ts_us', 'ts_ns'].every(f => e[f] === '<' + f + '>');
const row = (i, status, minute, day) => ({ id: i, store_id: M.store(i), status, amount_cents: M.amount(i), updated_at: '2026-03-0' + day + 'T' + String(Math.floor(minute / 60)).padStart(2, '0') + ':' + String(minute % 60).padStart(2, '0') + ':00.000000Z' });
eq([ev('read').op, ev('read').before, ev('read').after, ev('read').source.snapshot], ['r', null, row(1, 'PLACED', 1, 1), 'first'], 'the snapshot message of order 1');
eq([ev('create').op, ev('create').before, ev('create').after, ev('create').source.snapshot], ['c', null, row(201, 'PLACED', 201, 2), 'false'], 'the create message of order 201');
eq([ev('update').op, ev('update').before, ev('update').after], ['u', null, row(201, 'SHIPPED', 201, 2)], 'the update message of order 201: before is null with the default identity');
eq([ev('delete').op, ev('delete').before, ev('delete').after], ['d', { id: 31, store_id: 0, status: '', amount_cents: 0, updated_at: '1970-01-01T00:00:00Z' }, null], 'the delete message of order 31: the key, and placeholders for the other columns');
eq([ev('update_full').op, ev('update_full').before, ev('update_full').after], ['u', row(202, 'PLACED', 202, 2), row(202, 'SHIPPED', 202, 2)], 'the update message of order 202 with REPLICA IDENTITY FULL: the whole old row');
yes(['read', 'create', 'update', 'delete', 'update_full'].every(k => masked(ev(k)) && ev(k).source.connector === 'postgresql' && ev(k).source.table === 'orders' && ev(k).source.version === R.meta.debezium), 'every sample message is from the orders table of the connector, with its changing numbers replaced by their names');
// ---- the rest ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
eq(C('tests'), { passed: 8 }, 'eight pytest tests');
eq(X('tests.run'), 'pytest -q tests\n8 passed', 'the printed text of the tests');
yes(/^4\.\d+\.\d+/.test(R.meta.pyspark) && R.meta.pyspark === R.meta.delta && /^3\.1\d/.test(R.meta.python) && /^2\d\./.test(R.meta.java) && /^16\./.test(R.meta.postgres) && /^4\./.test(R.meta.kafka) && /^3\./.test(R.meta.debezium), 'the versions of Spark, Delta Lake, Python, Java, PostgreSQL, Kafka and Debezium');
eq(X('tool.versions'), 'Spark ' + R.meta.pyspark + ' with Delta Lake ' + R.meta.delta + ' on Java ' + R.meta.java + ' and Python ' + R.meta.python + '; PostgreSQL ' + R.meta.postgres + ', Apache Kafka ' + R.meta.kafka + ', Debezium ' + R.meta.debezium, 'the versions as printed');
yes(['db/schema.sql', 'connect/orders-connector.json', 'cdc/envelope.py', 'cdc/bronze.py', 'cdc/silver.py', 'cdc/stream.py', 'cdc/quality.py', 'cdc/run.py', 'stack/local.py', 'tests/test_silver.py'].every(f => R.files[f]), 'the recording holds the main files of the project');

console.log(fails ? fails + ' of ' + checks + ' checks FAILED' : checks + ' checks passed');
process.exit(fails ? 1 : 0);
